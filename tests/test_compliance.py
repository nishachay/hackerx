"""X policy compliance and consistency checks over data/site and the build.

Run after `npm run build` so the built HTML in out/ is current.
"""

import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "data" / "site"
OUT = ROOT / "out"

CARD_FIELDS = {"id", "url", "author", "created_at", "topic", "kind", "recommenders", "citing_users", "rank_score", "years", "thread", "quotes", "rank"}
QUOTE_FIELDS = {"hn_id", "author", "text", "created_at", "year", "story_title", "story_url", "points", "stance"}
ACCOUNT_FIELDS = {"handle", "url", "tweet_ids", "tweet_count", "recommenders", "citations", "topics"}
ALL_FIELDS = {"id", "rank", "url", "author", "topic", "kind", "recommenders", "citing_users", "rank_score", "years", "thread"}
BANNED_SUBSTRINGS = ("twimg.com", "pbs.twimg", "video.twimg")
BANNED_QUOTE_MARKUP = ("&#x", "&quot;", "&amp;", "&lt;", "&gt;", "<p>", "<a ")
HTML_FILES = list(OUT.rglob("*.html")) + list(OUT.rglob("*.txt")) + list(OUT.rglob("*.xml"))


class DataShapeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cards = json.loads((SITE / "tweets.json").read_text(encoding="utf-8"))
        cls.accounts = json.loads((SITE / "accounts.json").read_text(encoding="utf-8"))
        cls.all_rows = json.loads((SITE / "all.json").read_text(encoding="utf-8"))

    def test_cards_carry_only_whitelisted_fields(self):
        for card in self.cards:
            self.assertEqual(set(card.keys()), CARD_FIELDS, f"card {card.get('id')}")
            self.assertEqual(set(card["author"].keys()), {"handle"}, f"card {card['id']} author")
            for quote in card["quotes"]:
                self.assertLessEqual(set(quote.keys()), QUOTE_FIELDS, f"quote {quote.get('hn_id')}")

    def test_accounts_and_all_carry_no_names_or_avatars(self):
        for account in self.accounts:
            self.assertEqual(set(account.keys()), ACCOUNT_FIELDS, f"account {account.get('handle')}")
        for row in self.all_rows:
            self.assertLessEqual(set(row.keys()), ALL_FIELDS, f"all.json row {row.get('id')}")

    def test_no_copied_content_or_x_media_urls_in_data(self):
        for path in SITE.iterdir():
            if path.suffix not in {".json", ".xml"}:
                continue
            body = path.read_text(encoding="utf-8")
            for banned in BANNED_SUBSTRINGS:
                self.assertNotIn(banned, body, f"{path.name} contains {banned}")
        for name in ("tweets.json", "all.json", "accounts.json", "years.json", "meta.json"):
            body = (SITE / name).read_text(encoding="utf-8")
            for field in ('"link_card"', '"quoted_tweet"', '"stats"', '"avatar"', '"media"'):
                self.assertNotIn(field, body, f"{name} still has {field}")

    def test_quotes_are_plain_text(self):
        for card in self.cards:
            for quote in card["quotes"]:
                for banned in BANNED_QUOTE_MARKUP:
                    self.assertNotIn(banned, quote["text"], f"quote {quote['hn_id']} contains {banned!r}")

    def test_thread_is_a_boolean_only_flag(self):
        for card in self.cards:
            self.assertIsInstance(card["thread"], bool, f"card {card['id']}")
        body = (SITE / "tweets.json").read_text(encoding="utf-8")
        for leaked in ('"thread_text"', '"replies"', '"thread_tweets"', '"self_replies"', '"in_reply_to'):
            self.assertNotIn(leaked, body, f"tweets.json leaks {leaked}")

    def test_badge_number_equals_distinct_recommending_readers(self):
        for card in self.cards:
            distinct = {q["author"].strip().casefold() for q in card["quotes"] if q["stance"] == "recommends" and q["author"].strip()}
            self.assertEqual(card["recommenders"], len(distinct), f"card {card['id']}")
            self.assertLessEqual(card["recommenders"], len(card["quotes"]), f"card {card['id']}")


class BuiltSiteTests(unittest.TestCase):
    def test_built_site_has_no_copied_content_or_x_media(self):
        self.assertTrue(HTML_FILES, "out/ is empty; run npm run build first")
        for path in HTML_FILES:
            body = path.read_text(encoding="utf-8", errors="replace")
            for banned in BANNED_SUBSTRINGS:
                self.assertNotIn(banned, body, f"{path.relative_to(OUT)} contains {banned}")
            for field in ('"link_card"', '"quoted_tweet"', '\\"stats\\"'):
                self.assertNotIn(field, body, f"{path.relative_to(OUT)} still has {field}")

    def test_badge_wording_everywhere(self):
        combined = "".join(path.read_text(encoding="utf-8", errors="replace") for path in HTML_FILES)
        self.assertNotIn("Recommended by 1 HN users", combined)
        self.assertNotIn("Recommended by 1 Hacker News", combined)
        self.assertIn("Shared by 1 HN user", combined)
        rss = (OUT / "rss.xml").read_text(encoding="utf-8") if (OUT / "rss.xml").exists() else ""
        if rss:
            self.assertNotIn("Recommended by 1 HN users", rss)

    def test_no_workers_dev_anywhere(self):
        for path in HTML_FILES:
            body = path.read_text(encoding="utf-8", errors="replace")
            self.assertNotIn("workers.dev", body, f"{path.relative_to(OUT)} mentions workers.dev")

    def test_no_word_twitter_in_visible_ui(self):
        # Scope: our own UI copy. Excluded: the OpenGraph "twitter:*"
        # protocol meta names, script/JSON payloads, URLs, and verbatim
        # HN quotes (third-party speech we must not edit).
        for path in OUT.rglob("*.html"):
            body = path.read_text(encoding="utf-8", errors="replace")
            body = re.sub(r"<script[\s\S]*?</script>", "", body)
            body = re.sub(r"<meta[^>]*>", "", body)
            # HN quote blocks and quote items are verbatim third-party
            # content (comment text, story titles, author handles).
            body = re.sub(r"<div class=\"hn-quote[\s\S]*?</div>", "", body)
            body = re.sub(r"<figure class=\"quote-item\"[\s\S]*?</figure>", "", body)
            body = re.sub(r"<q[ >][\s\S]*?</q>|<blockquote[ >][\s\S]*?</blockquote>", "", body)
            body = re.sub(r"https?://\S*", "", body)
            self.assertNotRegex(body, re.compile(r"twitter", re.I), f"{path.relative_to(OUT)} mentions Twitter")

if __name__ == "__main__":
    unittest.main()
