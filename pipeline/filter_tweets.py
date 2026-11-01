"""Run the cached Amos evergreen and recommendation filters."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

from amos import AmosClient, evergreen_questions, recommendation_questions


ROOT = Path(__file__).resolve().parents[1]
GOOD_KINDS = {"insight", "advice", "technical", "story"}


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


def filter_records(records: list[dict[str, Any]], config: dict[str, Any], client: AmosClient) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    evergreen_config = config["evergreen"]
    recommendation_minimum = int(config["recommendation"]["minimum_distinct_authors"])
    questions = evergreen_questions(config["topics"])
    scored: list[dict[str, Any]] = []
    passed: list[dict[str, Any]] = []
    for record in records:
        state = {
            "tweet_text": tweet_text(record),
            "author": author_name(record),
            "hn_story_titles": sorted({str(c.get("hn_story_title", "")) for c in record.get("citations", []) if c.get("hn_story_title")}),
        }
        response = client.ask(state, questions)
        answers = response["answers"]
        probabilities = {key: float(answers[key]["noul"]) for key in ("evergreen_1", "evergreen_2", "evergreen_3")}
        average = sum(probabilities.values()) / 3
        kind = str(answers["kind"]["choice"]).lower()
        result = {
            **record,
            "amos": {
                "evergreen": probabilities,
                "average": average,
                "kind": kind,
                "topic": answers["topic"]["choice"],
                "raw": answers,
            },
            "evergreen_pass": average >= float(evergreen_config["minimum_average_probability"]) and kind in set(evergreen_config["passing_kinds"]),
            "recommendations": [],
        }
        scored.append(result)
        if result["evergreen_pass"]:
            recommendation_answers = recommendation_questions()
            recommendations = []
            for citation in record.get("citations", []):
                if citation.get("hn_kind") != "comment" or not citation.get("hn_comment_text"):
                    continue
                answer = client.ask(comment_state(record, citation), recommendation_answers)["answers"]["stance"]
                recommendations.append({
                    "hn_id": citation.get("hn_id"),
                    "hn_author": citation.get("hn_author"),
                    "stance": answer["choice"],
                    "probabilities": answer.get("probabilities", {}),
                })
            result["recommendations"] = recommendations
            result["recommending_authors"] = len({
                str(item.get("hn_author", "")).strip().lower()
                for item in recommendations
                if item["stance"] == "recommends" and str(item.get("hn_author", "")).strip()
            })
            result["recommendation_pass"] = result["recommending_authors"] >= recommendation_minimum
            if result["recommendation_pass"]:
                passed.append(result)
    return scored, passed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="data/fetched-tweets.json")
    parser.add_argument("--scored", default="data/scored-tweets.json")
    parser.add_argument("--passed", default="data/amos-passed.json")
    parser.add_argument("--fetch-rejections", default="data/rejected-fetch.json")
    parser.add_argument("--sample", type=int, default=0, help="Filter top N by distinct HN author count; 0 means all")
    args = parser.parse_args()
    input_path = ROOT / args.input
    if not input_path.exists():
        parser.error(f"Input file not found: {input_path.relative_to(ROOT)} (run pipeline/fetch_tweets.py first)")
    records = json.loads(input_path.read_text(encoding="utf-8"))
    rejected_fetch_path = ROOT / args.fetch_rejections
    fetch_failures = json.loads(rejected_fetch_path.read_text(encoding="utf-8")) if rejected_fetch_path.exists() else []
    eligible, rejected, prefilter_counts = prefilter_records(records, fetch_failures)
    total_comments = sum(1 for record in records for c in record.get("citations", []) if c.get("hn_kind") == "comment" and c.get("hn_comment_text"))
    ordered = sorted(eligible, key=lambda r: (-int(r.get("distinct_hn_authors", 0)), str(r.get("id", ""))))
    sample = args.sample > 0
    selected = ordered[:args.sample] if sample else ordered
    config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    client = AmosClient()
    scored, passed = filter_records(selected, config, client)
    scored_path, passed_path = ROOT / args.scored, ROOT / args.passed
    scored_path.parent.mkdir(parents=True, exist_ok=True)
    scored_path.write_text(json.dumps(scored, ensure_ascii=False), encoding="utf-8")
    passed_path.write_text(json.dumps(passed, ensure_ascii=False), encoding="utf-8")
    prefilter_path = ROOT / "data" / "rejected-prefilter.json"
    prefilter_path.write_text(json.dumps(rejected, ensure_ascii=False, indent=2), encoding="utf-8")
    for record in scored:
        score = record["amos"]
        if sample:
            print(f"{record['id']} evergreen={score['evergreen']} avg={score['average']:.3f} kind={score['kind']} evergreen_pass={record['evergreen_pass']} recommendation_pass={record.get('recommendation_pass', 'not checked')}")
    print(f"Processed {len(scored)} tweets; evergreen passed {sum(r['evergreen_pass'] for r in scored)}; recommendation passed {len(passed)}.")
    print(
        "Pre-filter removed: "
        f"{prefilter_counts['fetch_failed']} fetch failures, "
        f"{prefilter_counts['deleted']} deleted, "
        f"{prefilter_counts['fewer_than_two_comment_authors']} with fewer than 2 distinct commenting authors."
    )
    print(f"Amos requests used: {client.requests_made}; cached responses reused: {client.cache_hits}.")
    if sample:
        evergreen_rate = (sum(r["evergreen_pass"] for r in scored) / len(scored)) if scored else 0
        total_requests = len(records) + math.ceil(total_comments * evergreen_rate)
        estimated_minutes = total_requests / 60
        print(f"Full-run estimate: about {total_requests} Amos requests and {estimated_minutes:.1f} minutes at the 60/minute limit (assuming sample evergreen rate {evergreen_rate:.0%}).")


if __name__ == "__main__":
    main()
