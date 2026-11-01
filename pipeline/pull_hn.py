"""Resumable HN Algolia puller for HackerX.

Each completed range is written atomically to data/cache/hn as soon as it
finishes. Ranges with a full page are recursively split to avoid truncation.
"""

from __future__ import annotations

import argparse
import concurrent.futures
from email.utils import parsedate_to_datetime
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, time as day_time, timedelta, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
API = "https://hn.algolia.com/api/v1/search_by_date"
REQUIRED_QUERIES = ("twitter.com status", "x.com status")
FALLBACK_QUERIES = ("twitter.com", "x.com")
QUERIES = REQUIRED_QUERIES + FALLBACK_QUERIES
START_DATE = date(2007, 1, 1)
RANGE_SECONDS = 14 * 24 * 60 * 60


def utc_midnight(value: date) -> int:
    return int(datetime.combine(value, day_time.min, timezone.utc).timestamp())


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def cache_path(query: str, start: int, end: int) -> Path:
    return ROOT / "data" / "cache" / "hn" / slug(query) / f"{start}-{end}.json"


def request_range(query: str, start: int, end: int, hits_per_page: int) -> dict[str, Any]:
    params = urllib.parse.urlencode({
        "query": query,
        "tags": "comment,story",
        "numericFilters": f"created_at_i>={start},created_at_i<{end}",
        "hitsPerPage": hits_per_page,
        "page": 0,
    })
    request = urllib.request.Request(f"{API}?{params}", headers={"User-Agent": "HackerX/1.0 (HN recommendation archive)"})
    delay = 2
    for attempt in range(8):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            if error.code not in (429, 503) or attempt == 7:
                raise
            retry_after = error.headers.get("Retry-After")
            try:
                wait = max(1, float(retry_after)) if retry_after else delay
            except ValueError:
                try:
                    wait = max(1, (parsedate_to_datetime(retry_after) - datetime.now(timezone.utc)).total_seconds())
                except (TypeError, ValueError, OverflowError):
                    wait = delay
            time.sleep(wait)
            delay = min(delay * 2, 60)
        except (urllib.error.URLError, TimeoutError):
            if attempt == 7:
                raise
            time.sleep(delay)
            delay = min(delay * 2, 60)
    raise RuntimeError("HN request retries exhausted")


def get_range(query: str, start: int, end: int, hits_per_page: int) -> list[dict[str, Any]]:
    path = cache_path(query, start, end)
    if path.exists():
        with path.open(encoding="utf-8") as cache_file:
            return json.load(cache_file)

    result = request_range(query, start, end, hits_per_page)
    total = int(result.get("nbHits", 0))
    hits = result.get("hits", [])
    if total >= hits_per_page and end - start > 1:
        midpoint = start + (end - start) // 2
        collected = get_range(query, start, midpoint, hits_per_page)
        collected.extend(get_range(query, midpoint, end, hits_per_page))
    else:
        # At one-second resolution there is no narrower interval to split.
        # Follow all pages that the endpoint reports in that edge case.
        collected = list(hits)
        for page in range(1, int(result.get("nbPages", 1))):
            params = urllib.parse.urlencode({
                "query": query,
                "tags": "comment,story",
                "numericFilters": f"created_at_i>={start},created_at_i<{end}",
                "hitsPerPage": hits_per_page,
                "page": page,
            })
            request = urllib.request.Request(f"{API}?{params}", headers={"User-Agent": "HackerX/1.0"})
            with urllib.request.urlopen(request, timeout=45) as response:
                collected.extend(json.loads(response.read().decode("utf-8")).get("hits", []))

    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(".json.tmp")
    with temp_path.open("w", encoding="utf-8") as cache_file:
        json.dump(collected, cache_file, ensure_ascii=False)
    temp_path.replace(path)
    return collected


def ranges(start: int, end: int) -> list[tuple[int, int]]:
    result: list[tuple[int, int]] = []
    # Keep a rolling recent window uncached by date boundary, so weekly runs
    # see late-indexed activity. Complete older spans are fixed/cacheable.
    recent_start = max(start, end - RANGE_SECONDS)
    cursor = start
    while cursor + RANGE_SECONDS <= recent_start:
        result.append((cursor, cursor + RANGE_SECONDS))
        cursor += RANGE_SECONDS
    if cursor < recent_start:
        result.append((cursor, recent_start))
    if recent_start < end:
        result.append((recent_start, end))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from", dest="from_date", default=START_DATE.isoformat(), help="First UTC date (inclusive)")
    parser.add_argument("--until", dest="until_date", default=date.today().isoformat(), help="Last UTC date (exclusive)")
    parser.add_argument("--query", action="append", choices=QUERIES, help="Limit to one search phrase; repeatable")
    args = parser.parse_args()
    config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    start = utc_midnight(date.fromisoformat(args.from_date))
    end = utc_midnight(date.fromisoformat(args.until_date))
    if end <= start:
        parser.error("--until must be later than --from")
    queries = args.query or list(config["hn"].get("queries", QUERIES))
    tasks = [(query, left, right) for query in queries for left, right in ranges(start, end)]
    print(f"Fetching {len(tasks)} base ranges across {len(queries)} queries with {config['hn']['threads']} workers")

    failures: list[tuple[str, int, int, str]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=config["hn"]["threads"]) as pool:
        futures = {pool.submit(get_range, q, left, right, config["hn"]["hits_per_page"]): (q, left, right) for q, left, right in tasks}
        for future in concurrent.futures.as_completed(futures):
            q, left, right = futures[future]
            try:
                hits = future.result()
                print(f"{q} {left}..{right}: {len(hits)} hits")
            except Exception as error:  # Keep independent ranges running to completion.
                failures.append((q, left, right, str(error)))
                print(f"ERROR {q} {left}..{right}: {error}")

    if failures:
        error_path = ROOT / "data" / "cache" / "hn" / "pull-errors.json"
        error_path.parent.mkdir(parents=True, exist_ok=True)
        error_path.write_text(json.dumps(failures, indent=2), encoding="utf-8")
        raise SystemExit(f"{len(failures)} range(s) failed; rerun to resume cached ranges")

    all_hits: dict[str, dict[str, Any]] = {}
    for query in queries:
        # Saturated parent intervals are intentionally not cached; recursively
        # completed child ranges are the durable source for those intervals.
        query_cache = ROOT / "data" / "cache" / "hn" / slug(query)
        for path in query_cache.glob("*.json"):
            if path.name == "pull-errors.json":
                continue
            hits = json.loads(path.read_text(encoding="utf-8"))
            for hit in hits:
                object_id = str(hit.get("objectID", ""))
                if not object_id:
                    continue
                all_hits[object_id] = hit
    out = ROOT / "data" / "hn-hits.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(list(all_hits.values()), ensure_ascii=False), encoding="utf-8")
    story_count = sum(1 for hit in all_hits.values() if "story" in hit.get("_tags", []))
    comment_count = sum(1 for hit in all_hits.values() if "comment" in hit.get("_tags", []))
    summary = {
        "pulled_at": datetime.now(timezone.utc).isoformat(),
        "from": args.from_date,
        "until_exclusive": args.until_date,
        "queries": queries,
        "unique_hits": len(all_hits),
        "stories": story_count,
        "comments": comment_count,
        "fields_retained": ["objectID", "author", "created_at", "created_at_i", "title", "points", "comment_text", "story_id", "parent_id", "story_title", "story_url", "url", "_tags"],
    }
    (ROOT / "data" / "hn-pull-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Wrote {len(all_hits)} unique HN hits ({story_count} stories, {comment_count} comments) to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
