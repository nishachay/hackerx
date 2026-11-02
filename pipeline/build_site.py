"""Turn Amos output into the committed site data under ``data/site/``.

Reads ``data/scored-tweets.json`` (written by ``filter_tweets.py``), keeps the
tweets that passed both filters, ranks them and writes commit-safe JSON plus an
RSS feed. The script is deterministic for a given input and refuses to write a
file larger than 20 MiB.

Run after the Amos step:

    python3 -u pipeline/build_site.py && git add data/site
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from email.utils import format_datetime
import re
from html import escape, unescape
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SITE_DIR = ROOT / "data" / "site"
MAX_BYTES = 20 * 1024 * 1024
SITE_URL = "https://hackerx.nishachay.tech"
RSS_LIMIT = 50
STANCES = {"recommends", "neutral", "critical"}


class SchemaError(ValueError):
    pass



def parse_date(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def tweet_url(handle: str, tweet_id: str) -> str:
    return f"https://x.com/{handle}/status/{tweet_id}" if handle else f"https://x.com/i/web/status/{tweet_id}"




def clean_hn_text(value: str) -> str:
    """Turn HN's HTML-ish comment text into clean plain text.

    Entities are unescaped (repeatedly, since HN text is often stored
    double-escaped), ``<p>`` becomes a paragraph break, ``<a href>`` becomes
    its plain URL (when the link text differs from the URL, both are kept
    as ``text (URL)`` so no reader wording is lost) and every other tag is
    dropped.
    """
    text = value
    for _ in range(3):
        unescaped = unescape(text)
        if unescaped == text:
            break
        text = unescaped
    text = re.sub(r"<p\s*>", "\n\n", text, flags=re.I)
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.I)
    text = re.sub(r"https?://(?:[a-z0-9-]+\.)?twimg\.com[^\s\"'<>]*", "[image on X]", text, flags=re.I)
    def _anchor(match: re.Match) -> str:
        href = match.group(1).strip()
        label = match.group(2).strip()
        if not href:
            return label
        if not label or label == href:
            return href
        return f"{label} ({href})"

    text = re.sub(r'<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)</a>', _anchor, text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


THREAD_EMOJI = "\U0001f9f5"  # 🧵
NUMBERED_THREAD = re.compile(r"(?:^|\s)1\s*/(?:\d+|\s|$)")


def is_thread_starter(record: dict[str, Any]) -> bool:
    """Mark a post as a thread starter from private pipeline data only.

    Two signals, both computed locally without contacting any endpoint:
    the same author replied to the post in a chain (a self-reply anywhere
    in the raw record), or the post text is clearly numbered (``1/`` …)
    or carries the thread emoji. Only the boolean is ever published.
    """
    tweet = record.get("tweet") if isinstance(record.get("tweet"), dict) else {}
    user = tweet.get("user") if isinstance(tweet.get("user"), dict) else {}
    handle = str(user.get("screen_name") or record.get("author", {}).get("handle") or "").casefold()
    text = str(tweet.get("text") or tweet.get("full_text") or "")
    if THREAD_EMOJI in text or NUMBERED_THREAD.search(text):
        return True
    tweet_id = str(record.get("id") or tweet.get("id_str") or "")

    def is_self_reply(candidate: Any) -> bool:
        if not isinstance(candidate, dict):
            return False
        author = candidate.get("user") if isinstance(candidate.get("user"), dict) else {}
        screen_name = str(author.get("screen_name") or candidate.get("screen_name") or "").casefold()
        if not handle or not screen_name or screen_name != handle:
            return False
        parent = str(
            candidate.get("in_reply_to_status_id_str")
            or candidate.get("in_reply_to_status_id")
            or ""
        )
        return bool(tweet_id) and parent == tweet_id

    for key in ("replies", "thread", "thread_tweets", "self_replies"):
        for container in (record, tweet):
            candidates = container.get(key)
            if isinstance(candidates, list) and any(is_self_reply(item) for item in candidates):
                return True
    return False


def citation_year(citation: dict[str, Any]) -> int:
    parsed = parse_date(citation.get("hn_created_at"))
    if parsed:
        return parsed.year
    try:
        return datetime.fromtimestamp(int(citation.get("hn_created_at_i")), timezone.utc).year
    except (TypeError, ValueError, OverflowError, OSError):
        return 0


def build_quotes(record: dict[str, Any]) -> list[dict[str, Any]]:
    stances = {str(item.get("hn_id")): str(item.get("stance")) for item in record.get("recommendations", []) if item.get("stance") in STANCES}
    quotes: list[dict[str, Any]] = []
    for citation in record.get("citations", []):
        if citation.get("hn_kind") != "comment":
            continue
        text = clean_hn_text(str(citation.get("hn_comment_text") or ""))
        if not text:
            continue
        quotes.append({
            "hn_id": str(citation.get("hn_id") or ""),
            "author": str(citation.get("hn_author") or ""),
            "text": text,
            "created_at": str(citation.get("hn_created_at") or ""),
            "year": citation_year(citation),
            "story_title": str(citation.get("hn_story_title") or ""),
            "story_url": str(citation.get("hn_story_url") or ""),
            "points": int(citation.get("hn_story_points") or 0),
            "stance": stances.get(str(citation.get("hn_id")), "neutral"),
        })
    quotes.sort(key=lambda quote: (quote["stance"] != "recommends", -int(quote["year"] or 0), quote["hn_id"]))
    return quotes


def rank_score(recommenders: int, citing: int, points: int, years: int, newest_year: int, config: dict[str, Any]) -> float:
    weights = config.get("rank", {})
    other = max(0, citing - recommenders)
    recent = 1 if newest_year >= datetime.now(timezone.utc).year - 1 else 0
    return (
        recommenders * float(weights.get("recommending_author_weight", 10))
        + other * float(weights.get("other_citing_author_weight", 2))
        + math.log1p(max(0, points)) * float(weights.get("story_points_log_weight", 3))
        + recent * float(weights.get("recent_citation_boost", 1))
        + max(0, years - 1) * float(weights.get("year_spread_weight", 2))
    )


def public_card(record: dict[str, Any], thread_ids: frozenset[str] = frozenset()) -> dict[str, Any]:
    """Build the public, X-content-free shape for one scored record.

    Only our own metadata may be published: never the post text, media,
    link cards, quoted posts, engagement stats, or the author's display
    name or avatar. The post itself is shown through X's official embed.
    Thread detection uses only the private raw record plus the optional
    committed ``data/threads.json`` id list; the public card carries a
    single boolean, never reply text.
    """
    tweet = record.get("tweet") if isinstance(record.get("tweet"), dict) else {}
    user = tweet.get("user") if isinstance(tweet.get("user"), dict) else {}
    amos = record.get("amos") if isinstance(record.get("amos"), dict) else {}
    handle = str(user.get("screen_name") or record.get("author", {}).get("handle") or "")
    quotes = build_quotes(record)
    recommenders = len({quote["author"].strip().casefold() for quote in quotes if quote["stance"] == "recommends" and quote["author"].strip()})
    citing = len({quote["author"].strip().casefold() for quote in quotes if quote["author"].strip()})
    years = sorted({quote["year"] for quote in quotes if quote["year"]})
    created = parse_date(tweet.get("created_at"))
    tweet_id = str(record.get("id") or tweet.get("id_str") or "")
    return {
        "id": tweet_id,
        "url": tweet_url(handle, tweet_id),
        "author": {"handle": handle},
        "created_at": created.isoformat().replace("+00:00", "Z") if created else "",
        "topic": str(amos.get("topic") or ""),
        "kind": str(amos.get("kind") or ""),
        "recommenders": recommenders,
        "citing_users": citing,
        "rank_score": 0.0,
        "years": years,
        "thread": is_thread_starter(record) or tweet_id in thread_ids,
        "quotes": quotes,
    }


def build_card(record: dict[str, Any], config: dict[str, Any], thread_ids: frozenset[str] = frozenset()) -> dict[str, Any]:
    card = public_card(record, thread_ids)
    quotes = card["quotes"]
    years = card["years"]
    points = max([quote["points"] for quote in quotes] or [0])
    newest_year = max(years) if years else 0
    card["rank_score"] = round(
        rank_score(card["recommenders"], card["citing_users"], points, len(years), newest_year, config), 3
    )
    return card


def validate_card(card: dict[str, Any]) -> None:
    if not isinstance(card.get("id"), str) or not card["id"]:
        raise SchemaError("card is missing a string id")
    author = card.get("author")
    if not isinstance(author, dict) or not isinstance(author.get("handle"), str) or not author["handle"]:
        raise SchemaError(f"card {card['id']} has no author handle")
    for key in ("recommenders", "citing_users"):
        if not isinstance(card.get(key), int) or card[key] < 0:
            raise SchemaError(f"card {card['id']} has a bad {key}")
    if not isinstance(card.get("thread"), bool):
        raise SchemaError(f"card {card['id']} has a bad thread flag")
    if not isinstance(card.get("rank_score"), (int, float)):
        raise SchemaError(f"card {card['id']} has a bad rank_score")
    if not isinstance(card.get("quotes"), list):
        raise SchemaError(f"card {card['id']} has no quote list")
    for quote in card["quotes"]:
        if not isinstance(quote.get("text"), str) or quote.get("stance") not in STANCES:
            raise SchemaError(f"card {card['id']} has an invalid quote")


def validate_output(path: Path, payload: Any, kind: type) -> None:
    if not isinstance(payload, kind):
        raise SchemaError(f"{path.name}: expected {kind.__name__}")
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(encoded) > MAX_BYTES:
        raise SchemaError(f"{path.name} is {len(encoded) / 1024 / 1024:.1f} MiB, over the 20 MiB limit")


def write_json(path: Path, payload: Any, kind: type = list) -> int:
    validate_output(path, payload, kind)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    size = path.stat().st_size
    if size > MAX_BYTES:
        raise SchemaError(f"{path.name} is {size / 1024 / 1024:.1f} MiB on disk, over the 20 MiB limit")
    return size


def recommendation_label(recommenders: int) -> str:
    if recommenders == 1:
        return "Shared by 1 HN user"
    return f"Recommended by {recommenders} HN users"


def rss_xml(cards: list[dict[str, Any]], site_url: str = SITE_URL) -> str:
    items = []
    for card in cards[:RSS_LIMIT]:
        link = f"{site_url}/tweet/{card['id']}"
        created = parse_date(card.get("created_at")) or datetime.now(timezone.utc)
        handle = card["author"]["handle"]
        title = f"@{handle}, {recommendation_label(card['recommenders'])[0].lower() + recommendation_label(card['recommenders'])[1:]}"
        top_quote = next((q for q in card["quotes"] if q.get("stance") == "recommends"), None) or (card["quotes"][0] if card["quotes"] else None)
        description = ""
        if top_quote:
            description = f"“{top_quote['text']}” — HN reader @{top_quote['author']}. "
        description += f"View on X: {card['url']}"
        items.append(
            "<item>"
            f"<title>{escape(title, quote=False)}</title>"
            f"<description>{escape(description, quote=False)}</description>"
            f"<link>{escape(link, quote=False)}</link>"
            f'<guid isPermaLink="false">{escape(card["id"], quote=False)}</guid>'
            f"<pubDate>{format_datetime(created)}</pubDate>"
            f"<category>{escape(card.get('topic') or 'Ideas', quote=False)}</category>"
            f"<comments>{escape(link, quote=False)}</comments>"
            f'<source url="{escape(site_url, quote=False)}">HackerX</source>'
            f"</item>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">'
        "<channel>"
        "<title>HackerX — ideas worth keeping</title>"
        f"<link>{site_url}</link>"
        "<description>Timeless ideas recommended by Hacker News readers.</description>"
        "<language>en</language>"
        f'<atom:link href="{site_url}/rss.xml" rel="self" type="application/rss+xml"/>'
        f"<lastBuildDate>{format_datetime(datetime.now(timezone.utc))}</lastBuildDate>"
        + "".join(items)
        + "</channel></rss>"
    )


def sort_and_rank(cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = sorted(cards, key=lambda card: (-card["recommenders"], -card["rank_score"], -card["citing_users"], card["id"]))
    for index, card in enumerate(ordered, start=1):
        card["rank"] = index
    return ordered


def write_site_files(cards: list[dict[str, Any]], out_dir: Path, scored_total: int, site_url: str) -> dict[str, int]:
    """Write every public file under ``data/site/`` from public-shape cards.

    Shared by ``build()`` (fresh pipeline output) and
    ``scripts/strip_site_data.py`` (re-shaping already committed data), so
    both paths always emit the exact same whitelisted shape.
    """
    for card in cards:
        validate_card(card)

    accounts: dict[str, dict[str, Any]] = {}
    years: dict[int, dict[str, Any]] = {}
    topics: dict[str, int] = {}
    for card in cards:
        handle = card["author"]["handle"]
        key = handle.casefold() or "unknown"
        entry = accounts.setdefault(key, {
            "handle": handle,
            "url": f"https://x.com/{handle}" if handle else "",
            "tweet_ids": [],
            "recommenders": 0,
            "citations": 0,
            "topics": {},
        })
        entry["tweet_ids"].append(card["id"])
        entry["recommenders"] += card["recommenders"]
        entry["citations"] += card["citing_users"]
        entry["topics"][card["topic"]] = entry["topics"].get(card["topic"], 0) + 1
        for year in card["years"]:
            bucket = years.setdefault(year, {"year": year, "tweet_ids": [], "recommenders": 0})
            bucket["tweet_ids"].append(card["id"])
            bucket["recommenders"] += card["recommenders"]
        topics[card["topic"] or "Other"] = topics.get(card["topic"] or "Other", 0) + 1

    account_list = sorted(accounts.values(), key=lambda item: (-len(item["tweet_ids"]), -item["recommenders"], item["handle"]))
    for entry in account_list:
        entry["tweet_count"] = len(entry["tweet_ids"])
    year_list = [years[year] for year in sorted(years, reverse=True)]
    for bucket in year_list:
        bucket["tweet_count"] = len(bucket["tweet_ids"])

    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "site_url": site_url,
        "counts": {
            "scored": scored_total,
            "published": len(cards),
            "accounts": len(account_list),
            "years": len(year_list),
            "topics": len(topics),
            "quotes": sum(len(card["quotes"]) for card in cards),
            "recommenders": sum(card["recommenders"] for card in cards),
        },
        "topics": sorted(topics.items(), key=lambda item: (-item[1], item[0])),
        "source": "data/scored-tweets.json",
    }
    all_rows = [
        {
            "id": card["id"],
            "rank": card["rank"],
            "url": card["url"],
            "author": card["author"]["handle"],
            "topic": card["topic"],
            "kind": card["kind"],
            "recommenders": card["recommenders"],
            "citing_users": card["citing_users"],
            "rank_score": card["rank_score"],
            "years": card["years"],
            "thread": card["thread"],
        }
        for card in cards
    ]

    sizes = {
        "tweets.json": write_json(out_dir / "tweets.json", cards),
        "accounts.json": write_json(out_dir / "accounts.json", account_list),
        "years.json": write_json(out_dir / "years.json", year_list),
        "meta.json": write_json(out_dir / "meta.json", meta, dict),
        "all.json": write_json(out_dir / "all.json", all_rows),
    }
    rss = rss_xml(cards, site_url)
    if len(rss.encode("utf-8")) > MAX_BYTES:
        raise SchemaError("rss.xml is over the 20 MiB limit")
    (out_dir / "rss.xml").write_text(rss, encoding="utf-8")
    sizes["rss.xml"] = (out_dir / "rss.xml").stat().st_size
    return {"published": len(cards), "accounts": len(account_list), "years": len(year_list), **sizes}


def load_thread_ids(path: Path) -> frozenset[str]:
    """Optional ``data/threads.json`` overlay written by ``npm run threads``.

    The file holds only a sorted list of post ids detected as thread
    starters from the private raw data. A missing file simply means no
    labels: the build still works.
    """
    if not path.exists():
        return frozenset()
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or not all(isinstance(item, str) for item in payload):
        raise SchemaError(f"{path} must be a JSON array of id strings only")
    return frozenset(payload)


def build(scored_path: Path, out_dir: Path, config: dict[str, Any], site_url: str, threads_path: Path | None = None) -> dict[str, int]:
    records = json.loads(scored_path.read_text(encoding="utf-8"))
    thread_ids = load_thread_ids(threads_path) if threads_path is not None else frozenset()
    published = [build_card(record, config, thread_ids) for record in records if record.get("recommendation_pass") is True]
    ranked = sort_and_rank(published)
    return write_site_files(ranked, out_dir, scored_total=len(records), site_url=site_url)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scored", default="data/scored-tweets.json")
    parser.add_argument("--out", default="data/site")
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--site-url", default="")
    parser.add_argument("--threads", default="data/threads.json")
    args = parser.parse_args()
    scored_path = ROOT / args.scored
    if not scored_path.exists():
        parser.error(f"Scored file not found: {scored_path.relative_to(ROOT)} (run RUN.md Step 4 first)")
    config = json.loads((ROOT / args.config).read_text(encoding="utf-8"))
    site_url = (args.site_url or config.get("site_url") or SITE_URL).rstrip("/")
    stats = build(scored_path, ROOT / args.out, config, site_url, ROOT / args.threads)
    for key, value in stats.items():
        if key in {"published", "accounts", "years"}:
            print(f"{key}: {value:,}")
        else:
            print(f"{key}: {value / 1024:.0f} KiB")
    print(f"Wrote data/site for {stats['published']} ranked tweets. Next: git add data/site && git commit.")


if __name__ == "__main__":
    main()
