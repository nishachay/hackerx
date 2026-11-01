"""Python entry point for the react-tweet Node fetch adapter."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="data/tweet-candidates.json")
    parser.add_argument("--output", default="data/fetched-tweets.json")
    parser.add_argument("--limit", type=int, default=0, help="Optional sample size; 0 fetches all uncached IDs")
    parser.add_argument("--refresh-archives", action="store_true", help="Re-fetch saved tweets and mark unavailable copies deleted")
    args = parser.parse_args()
    command = ["node", str(ROOT / "pipeline" / "fetch_tweets.mjs"), "--input", args.input, "--output", args.output]
    if args.limit:
        command.extend(("--limit", str(args.limit)))
    if args.refresh_archives:
        command.append("--refresh-archives")
    subprocess.run(command, cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
