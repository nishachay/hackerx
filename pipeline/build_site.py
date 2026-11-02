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
from html import escape
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


def avatar_url(tweet: dict[str, Any], record: dict[str, Any]) -> str:
    user = tweet.get("user", {}) if isinstance(tweet.get("user"), dict) else {}
    for value in (record.get("avatar"), user.get("profile_image_url_https"), user.get("profile_image_url")):
        if isinstance(value, str) and value:
            return value.replace("_normal.", "_400x400.")
    return ""


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


def extract_media(tweet: dict[str, Any]) -> list[dict[str, Any]]:
    media: list[dict[str, Any]] = []
    for photo in tweet.get("photos") or []:
        if isinstance(photo, dict) and photo.get("url"):
            media.append({
                "type": "photo",
                "url": str(photo["url"]),
                "width": int(photo.get("width") or 0),
                "height": int(photo.get("height") or 0),
                "alt": str(photo.get("alt") or ""),
            })
    video = tweet.get("video")
    if isinstance(video, dict) and video.get("poster"):
        media.append({
            "type": "video",
            "url": str(video.get("poster")),
            "width": int((video.get("aspectRatio") or [16, 9])[0]) if video.get("aspectRatio") else 0,
            "height": int((video.get("aspectRatio") or [16, 9])[1]) if video.get("aspectRatio") else 0,
            "alt": "Video preview",
            "video_url": str(video.get("variants", [{}])[0].get("src", "")),
        })
    return media[:4]


def extract_link_card(tweet: dict[str, Any]) -> dict[str, str] | None:
    card = tweet.get("card")
    if not isinstance(card, dict):
        return None
    values = card.get("binding_values") if isinstance(card.get("binding_values"), dict) else {}

    def text_value(key: str, nested: str) -> str:
        entry = values.get(key)
        if isinstance(entry, dict):
            value = entry.get(nested)
            if isinstance(value, str):
                return value
        return ""

    title = text_value("title", "string_value")
    description = text_value("description", "string_value")
    domain = text_value("domain", "string_value")
    image = ""
    for key in ("thumbnail_image_original", "thumbnail_image_large", "thumbnail_image"):
        entry = values.get(key)
        if isinstance(entry, dict) and isinstance(entry.get("image_value"), dict):
            image = str(entry["image_value"].get("url") or "")
            if image:
                break
    url = str(card.get("url") or "")
    if not (title or description):
        return None
    return {"title": title, "description": description, "domain": domain, "image": image, "url": url}


def extract_tweet_edge(tweet: dict[str, Any]) -> dict[str, str] | None:
    quoted = tweet.get("quoted_tweet")
    if not isinstance(quoted, dict):
        return None
    user = quoted.get("user") if isinstance(quoted.get("user"), dict) else {}
    text = str(quoted.get("text") or "")
    if not text:
        return None
    return {
        "id": str(quoted.get("id_str") or quoted.get("id") or ""),
        "text": text,
        "name": str(user.get("name") or ""),
        "handle": str(user.get("screen_name") or ""),
    }


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
        text = str(citation.get("hn_comment_text") or "").strip()
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


def build_card(record: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    tweet = record.get("tweet") if isinstance(record.get("tweet"), dict) else {}
    user = tweet.get("user") if isinstance(tweet.get("user"), dict) else {}
    amos = record.get("amos") if isinstance(record.get("amos"), dict) else {}
    handle = str(user.get("screen_name") or record.get("author", {}).get("handle") or "")
    name = str(user.get("name") or record.get("author", {}).get("name") or handle)
    quotes = build_quotes(record)
    recommenders = len({quote["author"].strip().casefold() for quote in quotes if quote["stance"] == "recommends" and quote["author"].strip()})
    citing = int(record.get("distinct_hn_authors") or len({quote["author"].strip().casefold() for quote in quotes if quote["author"].strip()}))
    years = sorted({quote["year"] for quote in quotes if quote["year"]})
    newest_year = max(years) if years else 0
    points = max([quote["points"] for quote in quotes] or [0])
    created = parse_date(tweet.get("created_at"))
    tweet_id = str(record.get("id") or tweet.get("id_str") or "")
    return {
        "id": tweet_id,
        "url": tweet_url(handle, tweet_id),
        "text": str(tweet.get("text") or ""),
        "created_at": created.isoformat().replace("+00:00", "Z") if created else "",
        "author": {
            "name": name,
            "handle": handle,
            "avatar": avatar_url(tweet, record),
            "url": f"https://x.com/{handle}" if handle else "",
        },
        "topic": str(amos.get("topic") or ""),
        "kind": str(amos.get("kind") or ""),
        "evergreen": round(float(amos.get("average") or 0), 4),
        "recommenders": recommenders,
        "citing_users": citing,
        "rank_score": round(rank_score(recommenders, citing, points, len(years), newest_year, config), 3),
        "years": years,
        "quotes": quotes,
        "media": extract_media(tweet),
        "link_card": extract_link_card(tweet),
        "quoted_tweet": extract_tweet_edge(tweet),
        "stats": {
            "replies": int(tweet.get("conversation_count") or 0),
            "reposts": int(tweet.get("retweet_count") or 0),
            "likes": int(tweet.get("favorite_count") or 0),
            "views": int((tweet.get("video") or {}).get("viewCount") or 0),
            "bookmarks": 0,
        },
    }


def validate_card(card: dict[str, Any]) -> None:
    if not isinstance(card.get("id"), str) or not card["id"]:
        raise SchemaError("card is missing a string id")
    if not isinstance(card.get("text"), str) or not card["text"].strip():
        raise SchemaError(f"card {card.get('id')} has no text")
    author = card.get("author")
    if not isinstance(author, dict) or not isinstance(author.get("handle"), str):
        raise SchemaError(f"card {card['id']} has no author handle")
    for key in ("recommenders", "citing_users"):
        if not isinstance(card.get(key), int) or card[key] < 0:
            raise SchemaError(f"card {card['id']} has a bad {key}")
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


def rss_xml(cards: list[dict[str, Any]]) -> str:
    items = []
    for card in cards[:RSS_LIMIT]:
        link = f"{SITE_URL}/tweet/{card['id']}"
        created = parse_date(card.get("created_at")) or datetime.now(timezone.utc)
        title = f"{card['author']['name']}: {card['text'][:90]}"
        description = "Recommended by " + (f"{card['recommenders']} Hacker News readers" if card["recommenders"] != 1 else "1 Hacker News reader")
        items.append(
            "<item>"
            f"<title>{escape(title)}</title>"
            f"<description>{escape(card['text'])}</description>"
            f"<link>{escape(link)}</link>"
            f'<guid isPermaLink="false">{escape(card["id"])}</guid>'
            f"<pubDate>{format_datetime(created)}</pubDate>"
            f"<category>{escape(card.get('topic') or 'Ideas')}</category>"
            f"<comments>{escape(link)}</comments>"
            f"<source url=\"{escape(SITE_URL)}\">HackerX</source>"
            f"</item>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">'
        "<channel>"
        "<title>HackerX — ideas worth keeping</title>"
        f"<link>{SITE_URL}</link>"
        "<description>Timeless ideas recommended by Hacker News readers.</description>"
        "<language>en</language>"
        f'<atom:link href="{SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>'
        f"<lastBuildDate>{format_datetime(datetime.now(timezone.utc))}</lastBuildDate>"
        + "".join(items)
        + "</channel></rss>"
    )


def build(scored_path: Path, out_dir: Path, config: dict[str, Any], site_url: str) -> dict[str, int]:
    records = json.loads(scored_path.read_text(encoding="utf-8"))
    published: list[dict[str, Any]] = []
    rejected_rows: list[dict[str, Any]] = []
    for record in records:
        if record.get("recommendation_pass") is True:
            published.append(build_card(record, config))
        else:
            amos = record.get("amos") if isinstance(record.get("amos"), dict) else {}
            tweet = record.get("tweet") if isinstance(record.get("tweet"), dict) else {}
            user = tweet.get("user") if isinstance(tweet.get("user"), dict) else {}
            rejected_rows.append({
                "id": str(record.get("id") or ""),
                "status": "evergreen" if record.get("evergreen_pass") else "not_evergreen",
                "author": str(user.get("screen_name") or ""),
                "kind": str(amos.get("kind") or ""),
                "evergreen": round(float(amos.get("average") or 0), 4),
                "recommenders": int(record.get("recommending_authors") or 0),
            })
    for card in published:
        validate_card(card)
    published.sort(key=lambda card: (-card["recommenders"], -card["rank_score"], -card["citing_users"], card["id"]))
    for index, card in enumerate(published, start=1):
        card["rank"] = index

    accounts: dict[str, dict[str, Any]] = {}
    years: dict[int, dict[str, Any]] = {}
    topics: dict[str, int] = {}
    for card in published:
        author = card["author"]
        key = author["handle"].casefold() or "unknown"
        entry = accounts.setdefault(key, {
            "handle": author["handle"],
            "name": author["name"],
            "avatar": author["avatar"],
            "url": author["url"],
            "tweet_ids": [],
            "recommenders": 0,
            "citations": 0,
            "topics": {},
        })
        entry["tweet_ids"].append(card["id"])
        entry["recommenders"] += card["recommenders"]
        entry["citations"] += card["citing_users"]
        entry["topics"][card["topic"]] = entry["topics"].get(card["topic"], 0) + 1
        if not entry["avatar"] and author["avatar"]:
            entry["avatar"] = author["avatar"]
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
            "scored": len(records),
            "published": len(published),
            "accounts": len(account_list),
            "years": len(year_list),
            "topics": len(topics),
            "quotes": sum(len(card["quotes"]) for card in published),
            "recommenders": sum(card["recommenders"] for card in published),
        },
        "topics": sorted(topics.items(), key=lambda item: (-item[1], item[0])),
        "source": "data/scored-tweets.json",
    }
    all_rows = [
        {
            "id": card["id"],
            "rank": card["rank"],
            "status": "published",
            "author": card["author"]["handle"],
            "text": card["text"],
            "topic": card["topic"],
            "kind": card["kind"],
            "evergreen": card["evergreen"],
            "recommenders": card["recommenders"],
            "rank_score": card["rank_score"],
        }
        for card in published
    ] + rejected_rows
    all_rows.sort(key=lambda row: (row.get("rank") is None, row.get("rank") or 0, row["id"]))

    sizes = {
        "tweets.json": write_json(out_dir / "tweets.json", published),
        "accounts.json": write_json(out_dir / "accounts.json", account_list),
        "years.json": write_json(out_dir / "years.json", year_list),
        "meta.json": write_json(out_dir / "meta.json", meta, dict),
        "all.json": write_json(out_dir / "all.json", all_rows),
    }
    rss = rss_xml(published)
    if len(rss.encode("utf-8")) > MAX_BYTES:
        raise SchemaError("rss.xml is over the 20 MiB limit")
    (out_dir / "rss.xml").write_text(rss, encoding="utf-8")
    sizes["rss.xml"] = (out_dir / "rss.xml").stat().st_size
    return {"published": len(published), "accounts": len(account_list), "years": len(year_list), **sizes}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scored", default="data/scored-tweets.json")
    parser.add_argument("--out", default="data/site")
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--site-url", default="")
    args = parser.parse_args()
    scored_path = ROOT / args.scored
    if not scored_path.exists():
        parser.error(f"Scored file not found: {scored_path.relative_to(ROOT)} (run RUN.md Step 4 first)")
    config = json.loads((ROOT / args.config).read_text(encoding="utf-8"))
    site_url = (args.site_url or config.get("site_url") or SITE_URL).rstrip("/")
    stats = build(scored_path, ROOT / args.out, config, site_url)
    for key, value in stats.items():
        if key in {"published", "accounts", "years"}:
            print(f"{key}: {value:,}")
        else:
            print(f"{key}: {value / 1024:.0f} KiB")
    print(f"Wrote data/site for {stats['published']} ranked tweets. Next: git add data/site && git commit.")


if __name__ == "__main__":
    main()
