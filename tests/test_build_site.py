import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
from build_site import MAX_BYTES, SchemaError, build, build_card, validate_card  # noqa: E402


ROOT = Path(__file__).resolve().parents[1]


def scored_fixture():
    records = json.loads((ROOT / "data" / "fixture-tweets.json").read_text(encoding="utf-8"))
    out = []
    for index, record in enumerate(records):
        citations = record.get("citations", [])
        out.append({
            **record,
            "distinct_hn_authors": len({c["hn_author"] for c in citations}),
            "evergreen_pass": index % 4 != 0,
            "recommendation_pass": index % 4 != 0,
            "recommending_authors": 2,
            "recommendations": [
                {"hn_id": c["hn_id"], "hn_author": c["hn_author"], "stance": "recommends" if n < 2 else "neutral"}
                for n, c in enumerate(citations)
            ],
            "amos": {"average": 0.82, "kind": "insight", "topic": "Programming", "evergreen": {}},
        })
    return out


class BuildSiteTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_card_public_shape_has_no_copied_post_content(self):
        record = scored_fixture()[0]
        card = build_card(record, self.config)
        validate_card(card)
        self.assertEqual(
            sorted(card.keys()),
            ["author", "citing_users", "created_at", "id", "kind", "quotes", "rank_score", "recommenders", "topic", "url", "years"],
        )
        self.assertEqual(sorted(card["author"].keys()), ["handle"])
        self.assertEqual(card["author"]["handle"], record["author"]["handle"])
        for dropped in ("text", "media", "link_card", "quoted_tweet", "stats", "evergreen"):
            self.assertNotIn(dropped, card)
        self.assertEqual(len(card["quotes"]), len(record["citations"]))
        self.assertTrue(card["quotes"][0]["text"])
        self.assertNotIn("&#x", card["quotes"][0]["text"])
        self.assertEqual(card["quotes"][0]["stance"], "recommends")
        self.assertEqual(card["recommenders"], 2)

    def test_build_writes_ranked_site_data_and_rss(self):
        scored_path = self.dir / "scored.json"
        scored_path.write_text(json.dumps(scored_fixture()), encoding="utf-8")
        out = self.dir / "site"
        stats = build(scored_path, out, self.config, "https://example.com")
        self.assertGreater(stats["published"], 0)
        tweets = json.loads((out / "tweets.json").read_text(encoding="utf-8"))
        self.assertEqual([card["rank"] for card in tweets], list(range(1, len(tweets) + 1)))
        self.assertEqual(
            [card["recommenders"] for card in tweets],
            sorted((card["recommenders"] for card in tweets), reverse=True),
        )
        for name in ("all.json", "accounts.json", "years.json", "meta.json"):
            json.loads((out / name).read_text(encoding="utf-8"))
        rss = (out / "rss.xml").read_text(encoding="utf-8")
        self.assertTrue(rss.startswith("<?xml"))
        self.assertLessEqual(rss.count("<item>"), 50)
        self.assertLess((out / "tweets.json").stat().st_size, MAX_BYTES)

    def test_schema_rejects_invalid_card(self):
        record = scored_fixture()[0]
        card = build_card(record, self.config)
        card["author"] = {}
        with self.assertRaises(SchemaError):
            validate_card(card)


if __name__ == "__main__":
    unittest.main()
