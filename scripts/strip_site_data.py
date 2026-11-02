#!/usr/bin/env python3
"""Strip the committed ``data/site/`` files to the public field whitelist.

The raw pipeline output is not in the repo, so this rewrites the committed
snapshot in place: every per-tweet object keeps only ``id``, ``url``,
``author.handle``, ``created_at``, ``topic``, ``kind``, ``recommenders``,
``citing_users``, ``rank_score``, ``years``, ``thread``, ``quotes`` and ``rank``. Post
text, media, link cards, quoted posts, engagement stats, author display
names and avatars are removed from ``tweets.json``, ``accounts.json``,
``years.json``, ``meta.json``, ``all.json`` and ``rss.xml``. HN quote text
is cleaned to plain text (entities unescaped, markup dropped).

Run once from the repo root:

    python3 scripts/strip_site_data.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pipeline.build_site import (  # noqa: E402
    SITE_DIR,
    clean_hn_text,
    recommendation_label,  # noqa: F401  (re-exported for tests)
    sort_and_rank,
    tweet_url,
    validate_card,
    write_site_files,
)

QUOTE_FIELDS = ("hn_id", "author", "text", "created_at", "year", "story_title", "story_url", "points", "stance")


def strip_quote(quote: dict) -> dict:
    cleaned = {key: quote.get(key) for key in QUOTE_FIELDS if key in quote}
    cleaned["text"] = clean_hn_text(str(quote.get("text") or ""))
    if "stance" not in cleaned:
        cleaned["stance"] = "neutral"
    return cleaned


def strip_card(card: dict) -> dict:
    author = card.get("author") if isinstance(card.get("author"), dict) else {}
    handle = str(author.get("handle") or card.get("author") or "")
    tweet_id = str(card.get("id") or "")
    return {
        "id": tweet_id,
        "url": str(card.get("url") or tweet_url(handle, tweet_id)),
        "author": {"handle": handle},
        "created_at": str(card.get("created_at") or ""),
        "topic": str(card.get("topic") or ""),
        "kind": str(card.get("kind") or ""),
        "recommenders": int(card.get("recommenders") or 0),
        "citing_users": int(card.get("citing_users") or 0),
        "rank_score": float(card.get("rank_score") or 0),
        "years": [int(year) for year in card.get("years") or []],
        # The raw pipeline data is not in the repo, so the flag is only
        # preserved here; detection happens in pipeline/build_site.py.
        "thread": bool(card.get("thread") is True),
        "quotes": [strip_quote(quote) for quote in card.get("quotes") or []],
    }


def main() -> None:
    tweets_path = SITE_DIR / "tweets.json"
    cards = [strip_card(card) for card in json.loads(tweets_path.read_text(encoding="utf-8"))]
    cards = sort_and_rank(cards)
    for card in cards:
        validate_card(card)
    meta_path = SITE_DIR / "meta.json"
    scored_total = len(cards)
    site_url = "https://hackerx.nishachay.tech"
    if meta_path.exists():
        old_meta = json.loads(meta_path.read_text(encoding="utf-8"))
        scored_total = int(old_meta.get("counts", {}).get("scored") or len(cards))
        site_url = str(old_meta.get("site_url") or site_url)
    stats = write_site_files(cards, SITE_DIR, scored_total=scored_total, site_url=site_url)
    print(f"Stripped data/site to the public whitelist: {stats['published']} tweets, "
          f"{stats['accounts']} accounts, {stats['years']} years.")


if __name__ == "__main__":
    main()
