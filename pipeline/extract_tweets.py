"""Extract tweet IDs and their citing HN records from the pulled Algolia data."""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TWEET_URL = re.compile(
    r"(?:https?://)?(?:www\.)?(?:mobile\.)?(?:twitter\.com|x\.com|"
    r"(?:[a-z0-9-]+\.)?nitter\.[a-z0-9.-]+)/(?:#!/)?"
    r"(?:(?:i/web|i)/)?(?P<handle>[A-Za-z0-9_]{1,15})/status/(?P<id>\d{1,25})",
    re.IGNORECASE,
)
GENERIC_STATUS_URL = re.compile(
    r"(?:https?://)?(?:www\.)?(?:mobile\.)?(?:twitter\.com|x\.com)/"
    r"(?:i/web|i)/status/(?P<id>\d{1,25})",
    re.IGNORECASE,
)


def links_in(value: str) -> list[tuple[str, str]]:
    decoded = html.unescape(value)
    found = [(match.group("id"), match.group("handle")) for match in TWEET_URL.finditer(decoded)]
    found.extend((match.group("id"), "") for match in GENERIC_STATUS_URL.finditer(decoded))
    return list(dict.fromkeys(found))


def citation_from(hit: dict[str, Any], kind: str) -> dict[str, Any]:
    return {
        "hn_id": str(hit.get("objectID", "")),
        "hn_kind": kind,
        "hn_author": hit.get("author") or "",
        "hn_created_at": hit.get("created_at"),
        "hn_created_at_i": hit.get("created_at_i"),
        "hn_comment_text": hit.get("comment_text") or "",
        "hn_story_id": hit.get("story_id") or (hit.get("objectID") if kind == "story" else None),
        "hn_story_title": hit.get("story_title") or hit.get("title") or "",
        "hn_story_url": hit.get("story_url") or hit.get("url") or "",
        "hn_story_points": hit.get("points"),
    }


def extract(hits: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    tweets: dict[str, dict[str, Any]] = {}
    for hit in hits:
        tags = hit.get("_tags", [])
        kind = "comment" if "comment" in tags or hit.get("comment_text") else "story"
        citation = citation_from(hit, kind)
        values = [hit.get("comment_text"), hit.get("url"), hit.get("story_url"), hit.get("title")]
        for value in values:
            if not isinstance(value, str):
                continue
            for tweet_id, handle in links_in(value):
                record = tweets.setdefault(tweet_id, {"id": tweet_id, "handles": [], "citations": []})
                if handle and handle.lower() not in {item.lower() for item in record["handles"]}:
                    record["handles"].append(handle)
                if not any(item["hn_id"] == citation["hn_id"] for item in record["citations"]):
                    record["citations"].append(citation)
    return tweets


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="data/hn-hits.json")
    parser.add_argument("--output", default="data/tweet-citations.json")
    args = parser.parse_args()
    input_path = ROOT / args.input
    if not input_path.exists():
        parser.error(f"Input file not found: {input_path.relative_to(ROOT)} (run pipeline/pull_hn.py first)")
    hits = json.loads(input_path.read_text(encoding="utf-8"))
    tweets = extract(hits)
    output_path = ROOT / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(list(tweets.values()), ensure_ascii=False), encoding="utf-8")
    print(f"Extracted {len(tweets)} distinct tweet IDs from {len(hits)} HN hits")


if __name__ == "__main__":
    main()
