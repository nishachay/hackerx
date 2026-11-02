"""Write ``data/threads.json``: the sorted list of post ids that start a thread.

Reads the private raw pipeline data (``data/scored-tweets.json``, gitignored
and only present on the machine that runs the pipeline) and applies the same
``is_thread_starter()`` detection used by ``build_site.py``. Only the outcome
crosses into the repo, as a list of ids: no text, no other fields.

    npm run threads        # then: git add data/threads.json && git commit

If the raw data is missing, the exact path looked for is printed and the
script exits with an error without writing anything.
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_site import is_thread_starter  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


def detect_ids(records: list) -> list[str]:
    """Sorted thread-starter ids from raw scored records. Ids only."""
    ids = set()
    for record in records:
        if not isinstance(record, dict):
            continue
        if not is_thread_starter(record):
            continue
        tweet = record.get("tweet") if isinstance(record.get("tweet"), dict) else {}
        tweet_id = str(record.get("id") or tweet.get("id_str") or "")
        if tweet_id:
            ids.add(tweet_id)
    return sorted(ids)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scored", default="data/scored-tweets.json")
    parser.add_argument("--out", default="data/threads.json")
    args = parser.parse_args()
    scored_path = ROOT / args.scored
    if not scored_path.exists():
        print(f"error: raw pipeline data not found: {scored_path}", file=sys.stderr)
        print("Run the fetch pipeline on the machine that holds the raw data first (see RUN.md).", file=sys.stderr)
        sys.exit(1)
    records = json.loads(scored_path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        print(f"error: expected a list of records in {scored_path}", file=sys.stderr)
        sys.exit(1)
    ids = detect_ids(records)
    out_path = ROOT / args.out
    out_path.write_text(json.dumps(ids, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    print(f"Wrote {len(ids)} thread id(s) to {args.out}. Next: git add {args.out} && git commit.")


if __name__ == "__main__":
    main()
