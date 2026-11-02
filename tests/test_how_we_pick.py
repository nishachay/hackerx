"""The How we pick page must show the thresholds from config.json.

Run after `npm run build` so out/ is current.
"""

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class HowWePickConfigTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
        page = ROOT / "out" / "how-we-pick" / "index.html"
        cls.body = page.read_text(encoding="utf-8", errors="replace").replace("<!-- -->", "") if page.exists() else ""

    def test_page_exists(self):
        self.assertTrue(self.body, "out/how-we-pick/index.html missing; run npm run build first")

    def test_evergreen_threshold_matches_config(self):
        minimum = float(self.config["evergreen"]["minimum_average_probability"])
        percent = f"{round(minimum * 100)}%"
        self.assertIn(percent, self.body, "evergreen threshold from config.json is not on the page")
        # The stale hardcoded value must be gone when it differs.
        if percent != "60%":
            self.assertNotIn("60%", self.body)

    def test_recommender_threshold_matches_config(self):
        minimum = int(self.config["recommendation"]["minimum_distinct_authors"])
        self.assertIn(f"<dd>{minimum}+</dd>", self.body)
        if minimum != 2:
            self.assertNotIn("<dd>2+</dd>", self.body)

    def test_citing_authors_threshold_matches_config(self):
        minimum = int(self.config["hn"]["minimum_distinct_citing_authors"])
        self.assertIn(f"<dd>{minimum}+</dd>", self.body)

    def test_no_hardcoded_threshold_text(self):
        # Step copy must follow the config, not hardcoded numbers.
        body = re.sub(r"<dd>\d+\+</dd>", "", self.body)
        self.assertNotIn("at least three distinct HN authors", body)
        self.assertNotIn("at least two distinct commenters", body)


if __name__ == "__main__":
    unittest.main()
