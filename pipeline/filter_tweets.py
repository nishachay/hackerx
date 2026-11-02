"""Run the cached Amos evergreen and recommendation filters.

v1 runs the full eligible set in single mode only. Phase 5's single-versus-batched
comparison was skipped (see PROGRESS.md), so batching is deliberately absent: one
Amos call per tweet for evergreen scoring and one per HN comment for stance.
Every call is content-addressed and cached under ``data/cache/amos`` and the
shared sliding-window limiter in ``amos.py`` caps the whole process at 60/min.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import math
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from amos import AmosClient, evergreen_questions, recommendation_questions


ROOT = Path(__file__).resolve().parents[1]
GOOD_KINDS = {"insight", "advice", "technical", "story"}
REQUESTS_PER_MINUTE = 60
DEFAULT_WORKERS = 12


def tweet_text(record: dict[str, Any]) -> str:
    tweet = record.get("tweet", {})
    return str(tweet.get("text") or "")


def author_name(record: dict[str, Any]) -> str:
    user = record.get("tweet", {}).get("user", {})
    return str(user.get("name") or user.get("screen_name") or "")


def comment_state(record: dict[str, Any], citation: dict[str, Any]) -> dict[str, str]:
    return {"tweet_text": tweet_text(record), "hn_comment": str(citation.get("hn_comment_text") or "")}


def unique_authors(citations: list[dict[str, Any]]) -> set[str]:
    return {str(c.get("hn_author", "")).strip().lower() for c in citations if str(c.get("hn_author", "")).strip()}


def citation_year(citation: dict[str, Any]) -> int | None:
    timestamp = citation.get("hn_created_at_i")
    if timestamp is not None:
        try:
            return datetime.fromtimestamp(int(timestamp), timezone.utc).year
        except (TypeError, ValueError, OverflowError, OSError):
            pass
    value = citation.get("hn_created_at")
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).year
        except ValueError:
            return None
    return None


def year_spread_boost(record: dict[str, Any], config: dict[str, Any]) -> float:
    years = {year for citation in record.get("citations", []) if (year := citation_year(citation)) is not None}
    return float(config.get("rank", {}).get("year_spread_weight", 2)) * max(0, len(years) - 1)


def prefilter_records(
    records: list[dict[str, Any]], fetch_failures: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, int]]:
    failed_ids = {str(item.get("id", "")) for item in fetch_failures}
    eligible: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    counts = {"fetch_failed": 0, "deleted": 0, "fewer_than_two_comment_authors": 0}
    for record in records:
        tweet_id = str(record.get("id", ""))
        reason = None
        if tweet_id in failed_ids or record.get("fetch_ok") is False:
            reason = "fetch failed"
            counts["fetch_failed"] += 1
        elif record.get("deleted_on_x") is True or record.get("tweet", {}).get("deleted_on_x") is True:
            reason = "tweet is deleted"
            counts["deleted"] += 1
        else:
            comment_authors = {
                str(c.get("hn_author", "")).strip().casefold()
                for c in record.get("citations", [])
                if c.get("hn_kind") == "comment"
                and str(c.get("hn_comment_text", "")).strip()
                and str(c.get("hn_author", "")).strip()
            }
            if len(comment_authors) < 2:
                reason = "fewer than 2 distinct HN authors left a comment with text"
                counts["fewer_than_two_comment_authors"] += 1
        if reason:
            rejected.append({"id": tweet_id, "reason": reason})
        else:
            eligible.append(record)
    return eligible, rejected, counts


def valid_answer(answer: Any, answer_type: str) -> bool:
    if not isinstance(answer, dict):
        return False
    if answer_type == "noul":
        try:
            value = float(answer["noul"])
            return math.isfinite(value) and 0 <= value <= 1
        except (KeyError, TypeError, ValueError):
            return False
    return isinstance(answer.get("choice"), str) and bool(answer["choice"])


class ProgressMeter:
    """Prints a heartbeat every 25 completed calls so RUN.md logs stay readable."""

    def __init__(self, label: str, total: int, client: AmosClient) -> None:
        self.label = label
        self.total = total
        self.client = client
        self.done = 0
        self.started = time.monotonic()
        self.lock = threading.Lock()

    def add_total(self, count: int) -> None:
        with self.lock:
            self.total += count

    def completed(self) -> None:
        with self.lock:
            self.done += 1
            if self.done % 25 == 0:
                elapsed = time.monotonic() - self.started
                print(
                    f"Amos progress ({self.label}): {self.done}/{self.total} calls; "
                    f"requests {self.client.requests_made}; cache hits {self.client.cache_hits}; "
                    f"elapsed {elapsed:.1f}s",
                    flush=True,
                )


def tracked_ask(client: AmosClient, meter: ProgressMeter, state: Any, questions: dict[str, Any]) -> dict[str, Any]:
    response = client.ask(state, questions)
    meter.completed()
    return response


def evergreen_state(record: dict[str, Any]) -> dict[str, Any]:
    return {"tweet_text": tweet_text(record), "author": author_name(record),
        "hn_story_titles": sorted({str(c.get("hn_story_title", "")) for c in record.get("citations", []) if c.get("hn_story_title")})}


def collect_recommendations(scored: list[dict[str, Any]], client: AmosClient,
                            executor: ThreadPoolExecutor, label: str) -> None:
    template = recommendation_questions()
    jobs: list[dict[str, Any]] = []
    citation_lists: list[list[dict[str, Any]]] = [[] for _ in scored]
    for record_index, record in enumerate(scored):
        if not record["evergreen_pass"]:
            continue
        citations = [c for c in record.get("citations", []) if c.get("hn_kind") == "comment" and str(c.get("hn_comment_text", "")).strip()]
        citation_lists[record_index] = citations
        for start, citation in enumerate(citations):
            jobs.append({"record_index": record_index, "start": start, "citation": citation,
                "state": comment_state(record, citation), "questions": template})

    meter = ProgressMeter(f"{label} recommendations", len(jobs), client)
    responses = list(executor.map(lambda job: tracked_ask(client, meter, job["state"], job["questions"]), jobs))
    answer_map: list[dict[int, dict[str, Any]]] = [{} for _ in scored]
    retries: list[tuple[int, int, dict[str, Any], dict[str, Any]]] = []
    for job, response in zip(jobs, responses):
        answers = response.get("answers", {}) if isinstance(response, dict) else {}
        answer = answers.get("stance") if isinstance(answers, dict) else None
        if valid_answer(answer, "choice") and answer["choice"] in {"recommends", "neutral", "critical"}:
            answer_map[job["record_index"]][job["start"]] = answer
        else:
            retries.append((job["record_index"], job["start"], comment_state(scored[job["record_index"]], job["citation"]), job["citation"]))
    meter.add_total(len(retries))
    retry_responses = list(executor.map(lambda item: tracked_ask(client, meter, item[2], template), retries))
    for retry, response in zip(retries, retry_responses):
        record_index, citation_index, _, citation = retry
        answers = response.get("answers", {}) if isinstance(response, dict) else {}
        answer = answers.get("stance") if isinstance(answers, dict) else None
        if not (valid_answer(answer, "choice") and answer["choice"] in {"recommends", "neutral", "critical"}):
            raise ValueError(f"Malformed recommendation response for HN comment {citation.get('hn_id')}, including single-item retry")
        answer_map[record_index][citation_index] = answer
    for record_index, record in enumerate(scored):
        if record["evergreen_pass"]:
            record["recommendations"] = [{
                "hn_id": citation.get("hn_id"),
                "hn_author": citation.get("hn_author"),
                "stance": answer_map[record_index][index]["choice"],
                "probabilities": answer_map[record_index][index].get("probabilities", {}),
            } for index, citation in enumerate(citation_lists[record_index])]


def filter_records(records: list[dict[str, Any]], config: dict[str, Any], client: AmosClient,
                   workers: int = DEFAULT_WORKERS, label: str = "filter") -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if workers < 1:
        raise ValueError("workers must be at least 1")
    evergreen_config = config["evergreen"]
    recommendation_minimum = int(config["recommendation"]["minimum_distinct_authors"])
    questions = evergreen_questions(config["topics"])
    with ThreadPoolExecutor(max_workers=workers) as executor:
        meter = ProgressMeter(f"{label} evergreen", len(records), client)
        responses = list(executor.map(lambda record: tracked_ask(client, meter, evergreen_state(record), questions), records))
        answer_rows = [response["answers"] for response in responses]

        scored: list[dict[str, Any]] = []
        for record, answers in zip(records, answer_rows):
            probabilities = {key: float(answers[key]["noul"]) for key in ("evergreen_1", "evergreen_2", "evergreen_3")}
            average = sum(probabilities.values()) / 3
            kind = str(answers["kind"]["choice"]).lower()
            year_boost = year_spread_boost(record, config)
            scored.append({
                **record,
                "amos": {"evergreen": probabilities, "average": average, "kind": kind,
                         "topic": answers["topic"]["choice"], "raw": answers},
                "evergreen_pass": average >= float(evergreen_config["minimum_average_probability"]) and kind in set(evergreen_config["passing_kinds"]),
                "recommendations": [],
                "year_spread_rank_boost": year_boost,
                "rank_score": float(record.get("rank_score", 0)) + year_boost,
            })
        collect_recommendations(scored, client, executor, label)

    for result in scored:
        if result["evergreen_pass"]:
            result["recommending_authors"] = len({str(item.get("hn_author", "")).strip().lower()
                for item in result["recommendations"] if item["stance"] == "recommends" and str(item.get("hn_author", "")).strip()})
            result["recommendation_pass"] = result["recommending_authors"] >= recommendation_minimum
    passed = [result for result in scored if result.get("recommendation_pass")]
    return scored, passed


def estimate_run(records: list[dict[str, Any]]) -> dict[str, float]:
    """Estimate single-mode Amos calls from comment volume and an assumed pass rate."""
    comments = [
        sum(1 for citation in record.get("citations", [])
            if citation.get("hn_kind") == "comment" and str(citation.get("hn_comment_text", "")).strip())
        for record in records
    ]
    total_comments = sum(comments)
    low_rate, high_rate = 0.4, 0.6
    low_calls = len(records) + total_comments * low_rate
    high_calls = len(records) + total_comments * high_rate
    return {
        "eligible": len(records),
        "comments": total_comments,
        "low_calls": low_calls,
        "high_calls": high_calls,
        "low_minutes": low_calls / REQUESTS_PER_MINUTE,
        "high_minutes": high_calls / REQUESTS_PER_MINUTE,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="data/fetched-tweets.json")
    parser.add_argument("--scored", default="data/scored-tweets.json")
    parser.add_argument("--passed", default="data/amos-passed.json")
    parser.add_argument("--fetch-rejections", default="data/rejected-fetch.json")
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS, help=f"Concurrent Amos workers (default: {DEFAULT_WORKERS})")
    parser.add_argument("--sample", type=int, default=0, help="Dev only: filter the top N by distinct HN author count; 0 means the full eligible set")
    parser.add_argument("--dry-run", action="store_true", help="Print eligible counts and the run estimate, then exit without calling Amos")
    args = parser.parse_args()
    input_path = ROOT / args.input
    if not input_path.exists():
        parser.error(f"Input file not found: {input_path.relative_to(ROOT)} (run pipeline/fetch_tweets.py first)")
    records = json.loads(input_path.read_text(encoding="utf-8"))
    rejected_fetch_path = ROOT / args.fetch_rejections
    fetch_failures = json.loads(rejected_fetch_path.read_text(encoding="utf-8")) if rejected_fetch_path.exists() else []
    eligible, rejected, prefilter_counts = prefilter_records(records, fetch_failures)
    ordered = sorted(eligible, key=lambda r: (-int(r.get("distinct_hn_authors", 0)), str(r.get("id", ""))))
    selected = ordered[:args.sample] if args.sample > 0 else ordered
    estimate = estimate_run(selected)
    print(
        "Pre-filter removed: "
        f"{prefilter_counts['fetch_failed']} fetch failures, "
        f"{prefilter_counts['deleted']} deleted, "
        f"{prefilter_counts['fewer_than_two_comment_authors']} with fewer than 2 distinct commenting authors.",
        flush=True,
    )
    print(
        f"Eligible tweets: {estimate['eligible']:,} (from {len(records):,} fetched)"
        + (f"; dev sample capped at {args.sample:,}" if args.sample > 0 else "; full set, no top-N cut")
        + f". HN comment quotes to classify: {estimate['comments']:,}.",
        flush=True,
    )
    print(
        f"Estimated run: {estimate['low_calls']:,.0f}–{estimate['high_calls']:,.0f} Amos calls, "
        f"about {estimate['low_minutes']:.0f}–{estimate['high_minutes']:.0f} minutes at {REQUESTS_PER_MINUTE}/minute "
        f"(assuming a 40–60% evergreen pass rate; cached calls are free).",
        flush=True,
    )
    print(f"Mode: single; workers: {args.workers}; shared limiter: {REQUESTS_PER_MINUTE}/minute; cache: data/cache/amos.", flush=True)
    if args.dry_run:
        return
    config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    client = AmosClient()
    scored, passed = filter_records(selected, config, client, args.workers)
    scored_path, passed_path = ROOT / args.scored, ROOT / args.passed
    scored_path.parent.mkdir(parents=True, exist_ok=True)
    scored_path.write_text(json.dumps(scored, ensure_ascii=False), encoding="utf-8")
    passed_path.write_text(json.dumps(passed, ensure_ascii=False), encoding="utf-8")
    prefilter_path = ROOT / "data" / "rejected-prefilter.json"
    prefilter_path.write_text(json.dumps(rejected, ensure_ascii=False, indent=2), encoding="utf-8")
    for record in scored:
        score = record["amos"]
        if args.sample > 0:
            print(f"{record['id']} evergreen={score['evergreen']} avg={score['average']:.3f} kind={score['kind']} evergreen_pass={record['evergreen_pass']} recommendation_pass={record.get('recommendation_pass', 'not checked')}")
    print(f"Processed {len(scored)} tweets; evergreen passed {sum(r['evergreen_pass'] for r in scored)}; recommendation passed {len(passed)}.")
    print(f"Amos requests used: {client.requests_made}; cached responses reused: {client.cache_hits}.")


if __name__ == "__main__":
    main()
