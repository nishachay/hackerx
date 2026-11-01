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


def batched_evergreen(records: list[dict[str, Any]], topics: list[str], batch_size: int, client: AmosClient) -> dict[str, dict[str, Any]]:
    base_questions = evergreen_questions(topics)
    output: dict[str, dict[str, Any]] = {}
    for start in range(0, len(records), batch_size):
        batch = records[start : start + batch_size]
        state: dict[str, Any] = {}
        questions: dict[str, Any] = {}
        mapping: dict[str, tuple[str, str]] = {}
        for index, record in enumerate(batch, start=1):
            record_id = str(record.get("id", ""))
            state_key = f"tweet_{index}"
            state[state_key] = {"text": tweet_text(record), "author": author_name(record),
                "hn_story_titles": sorted({str(c.get("hn_story_title", "")) for c in record.get("citations", []) if c.get("hn_story_title")})}
            for field, definition in base_questions.items():
                question_key = f"{state_key}_{field}"
                questions[question_key] = {**definition, "instructions": f"Evaluate only {state_key} from state. {definition['instructions']}"}
                mapping[question_key] = (record_id, field)
        response = client.ask(state, questions)
        collected: dict[str, dict[str, Any]] = {str(r.get("id", "")): {} for r in batch}
        malformed: set[str] = set()
        answers = response.get("answers", {}) if isinstance(response, dict) else {}
        for question_key, (record_id, field) in mapping.items():
            answer = answers.get(question_key) if isinstance(answers, dict) else None
            if valid_answer(answer, base_questions[field]["type"]):
                collected[record_id][field] = answer
            else:
                malformed.add(record_id)
        for record_id in malformed:
            record = next(r for r in batch if str(r.get("id", "")) == record_id)
            state_one = {"tweet_text": tweet_text(record), "author": author_name(record),
                "hn_story_titles": sorted({str(c.get("hn_story_title", "")) for c in record.get("citations", []) if c.get("hn_story_title")})}
            single = client.ask(state_one, base_questions)
            single_answers = single.get("answers", {})
            if not isinstance(single_answers, dict) or not all(valid_answer(single_answers.get(k), q["type"]) for k, q in base_questions.items()):
                raise ValueError(f"Malformed evergreen response for tweet {record_id}, including single-item retry")
            collected[record_id] = {k: single_answers[k] for k in base_questions}
        output.update(collected)
    return output


def batched_recommendations(record: dict[str, Any], batch_size: int, client: AmosClient) -> list[dict[str, Any]]:
    citations = [c for c in record.get("citations", []) if c.get("hn_kind") == "comment" and str(c.get("hn_comment_text", "")).strip()]
    template = recommendation_questions()
    recommendations: list[dict[str, Any]] = []
    for start in range(0, len(citations), batch_size):
        chunk = citations[start : start + batch_size]
        state: dict[str, Any] = {}
        questions: dict[str, Any] = {}
        linked: dict[str, dict[str, Any]] = {}
        for index, citation in enumerate(chunk, start=1):
            state_key = f"comment_{index}"
            question_key = f"{state_key}_stance"
            state[state_key] = comment_state(record, citation)
            questions[question_key] = {**template["stance"], "instructions": f"Use only {state_key} from state. {template['stance']['instructions']}"}
            linked[question_key] = citation
        response = client.ask(state, questions)
        answers = response.get("answers", {}) if isinstance(response, dict) else {}
        parsed: dict[str, dict[str, Any]] = {}
        retries: list[tuple[str, dict[str, Any]]] = []
        for question_key, citation in linked.items():
            answer = answers.get(question_key) if isinstance(answers, dict) else None
            if valid_answer(answer, "choice") and answer["choice"] in {"recommends", "neutral", "critical"}:
                parsed[question_key] = answer
            else:
                retries.append((question_key, citation))
        for question_key, citation in retries:
            response_one = client.ask(comment_state(record, citation), template)
            one_answers = response_one.get("answers", {})
            answer = one_answers.get("stance") if isinstance(one_answers, dict) else None
            if not (valid_answer(answer, "choice") and answer["choice"] in {"recommends", "neutral", "critical"}):
                raise ValueError(f"Malformed recommendation response for HN comment {citation.get('hn_id')}, including single-item retry")
            parsed[question_key] = answer
        for question_key, citation in linked.items():
            answer = parsed[question_key]
            recommendations.append({"hn_id": citation.get("hn_id"), "hn_author": citation.get("hn_author"), "stance": answer["choice"], "probabilities": answer.get("probabilities", {})})
    return recommendations


def filter_records(records: list[dict[str, Any]], config: dict[str, Any], client: AmosClient, mode: str = "single") -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    evergreen_config = config["evergreen"]
    recommendation_minimum = int(config["recommendation"]["minimum_distinct_authors"])
    questions = evergreen_questions(config["topics"])
    batch_size = int(config.get("amos", {}).get("batch_size", 1))
    batch_answers = batched_evergreen(records, config["topics"], batch_size, client) if mode == "batched" else {}
    scored: list[dict[str, Any]] = []
    passed: list[dict[str, Any]] = []
    for record in records:
        state = {
            "tweet_text": tweet_text(record),
            "author": author_name(record),
            "hn_story_titles": sorted({str(c.get("hn_story_title", "")) for c in record.get("citations", []) if c.get("hn_story_title")}),
        }
        response = client.ask(state, questions) if mode == "single" else None
        answers = response["answers"] if response else batch_answers[str(record.get("id", ""))]
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
            if mode == "batched":
                recommendations = batched_recommendations(record, batch_size, client)
            else:
                for citation in record.get("citations", []):
                    if citation.get("hn_kind") != "comment" or not citation.get("hn_comment_text"):
                        continue
                    answer = client.ask(comment_state(record, citation), recommendation_answers)["answers"]["stance"]
                    recommendations.append({"hn_id": citation.get("hn_id"), "hn_author": citation.get("hn_author"), "stance": answer["choice"], "probabilities": answer.get("probabilities", {})})
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
    parser.add_argument("--mode", choices=("single", "batched"), default="single")
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
    scored, passed = filter_records(selected, config, client, args.mode)
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
    print(f"Amos mode: {args.mode}; configured batch size {config.get('amos', {}).get('batch_size', 1)}.")
    if sample:
        evergreen_rate = (sum(r["evergreen_pass"] for r in scored) / len(scored)) if scored else 0
        total_requests = len(records) + math.ceil(total_comments * evergreen_rate)
        estimated_minutes = total_requests / 60
        print(f"Full-run estimate: about {total_requests} Amos requests and {estimated_minutes:.1f} minutes at the 60/minute limit (assuming sample evergreen rate {evergreen_rate:.0%}).")


if __name__ == "__main__":
    main()
