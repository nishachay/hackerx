"""Merge truncated tweet IDs from the same handle and enforce HN author minimum."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def distinct_authors(citations: list[dict[str, Any]]) -> set[str]:
    return {
        str(item.get("hn_author", "")).strip().lower()
        for item in citations
        if str(item.get("hn_author", "")).strip()
    }


def merge(records: list[dict[str, Any]], minimum_authors: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    by_id = {str(record["id"]): record for record in records}
    ids = sorted(by_id, key=lambda value: (-len(value), value))
    canonical: dict[str, str] = {}
    handles_by_id: dict[str, set[str]] = {}
    for tweet_id in ids:
        handles = {handle.casefold() for handle in by_id[tweet_id].get("handles", []) if handle}
        handles_by_id[tweet_id] = handles

    # Index only prefixes that exist as candidate IDs. Candidate order ensures
    # the first value stored is the same shortest/lexical match as the old scan.
    prefix_targets: dict[str, dict[str, str]] = defaultdict(dict)
    id_set = set(ids)
    for candidate_id in sorted(ids, key=lambda value: (len(value), value)):
        for handle in handles_by_id[candidate_id]:
            targets = prefix_targets[handle]
            for prefix_length in range(1, len(candidate_id)):
                prefix = candidate_id[:prefix_length]
                if prefix in id_set:
                    targets.setdefault(prefix, candidate_id)

    for tweet_id in ids:
        handles = handles_by_id[tweet_id]
        target = tweet_id
        if handles:
            candidates = [prefix_targets[handle][tweet_id] for handle in handles
                if tweet_id in prefix_targets[handle]]
            if candidates:
                target = min(candidates, key=lambda value: (len(value), value))
                target = canonical.get(target, target)
        canonical[tweet_id] = target

    merged: dict[str, dict[str, Any]] = {}
    for tweet_id in ids:
        target = canonical[tweet_id]
        source = by_id[tweet_id]
        destination = merged.setdefault(target, {"id": target, "handles": [], "citations": [], "merged_ids": []})
        destination["merged_ids"].append(tweet_id)
        for handle in source.get("handles", []):
            if handle.casefold() not in {item.casefold() for item in destination["handles"]}:
                destination["handles"].append(handle)
        seen = {item.get("hn_id") for item in destination["citations"]}
        destination["citations"].extend(item for item in source.get("citations", []) if item.get("hn_id") not in seen)

    kept: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    for record in merged.values():
        record["merged_ids"] = sorted(set(record["merged_ids"]), key=lambda value: (len(value), value))
        record["distinct_hn_authors"] = len(distinct_authors(record["citations"]))
        if record["distinct_hn_authors"] >= minimum_authors:
            kept.append(record)
        else:
            rejected.append({"id": record["id"], "distinct_hn_authors": record["distinct_hn_authors"], "reason": "fewer than required distinct HN authors"})
    return kept, rejected


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="data/tweet-citations.json")
    parser.add_argument("--output", default="data/tweet-candidates.json")
    args = parser.parse_args()
    input_path = ROOT / args.input
    if not input_path.exists():
        parser.error(f"Input file not found: {input_path.relative_to(ROOT)} (run pipeline/extract_tweets.py first)")
    config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    records = json.loads(input_path.read_text(encoding="utf-8"))
    kept, rejected = merge(records, int(config["hn"]["minimum_distinct_citing_authors"]))
    output = ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(kept, ensure_ascii=False), encoding="utf-8")
    rejected_path = ROOT / "data" / "rejected-ids.json"
    rejected_path.write_text(json.dumps(rejected, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Kept {len(kept)} IDs; rejected {len(rejected)} below {config['hn']['minimum_distinct_citing_authors']} distinct HN authors")


if __name__ == "__main__":
    main()
