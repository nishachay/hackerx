"""OG and Twitter card tags on every built page, and the images exist.

Run after `npm run build` so out/ is current.
"""

import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"


def og_target_exists(content: str) -> bool:
    path = urlsplit(content).path
    local = OUT / path.lstrip("/")
    if local.exists():
        return True
    # Static export may drop the extension; try common suffixes.
    for suffix in (".png", ".jpeg", ".jpg", ".webp", ".svg"):
        if local.with_suffix(suffix).exists():
            return True
    return False


class OpenGraphTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = sorted(OUT.rglob("*.html"))
        cls.bodies = {page: page.read_text(encoding="utf-8", errors="replace") for page in cls.pages}

    def test_pages_built(self):
        self.assertTrue(self.pages, "out/ is empty; run npm run build first")

    def test_every_page_has_full_og_tags(self):
        for page, body in self.bodies.items():
            with self.subTest(page=str(page.relative_to(OUT))):
                image = re.search(r'<meta property="og:image" content="([^"]+)"', body)
                self.assertIsNotNone(image, "og:image missing")
                self.assertIn('<meta property="og:image:width" content="1200"', body)
                self.assertIn('<meta property="og:image:height" content="630"', body)
                self.assertIsNotNone(re.search(r'<meta property="og:title" content="[^"]+"', body))
                self.assertIsNotNone(re.search(r'<meta property="og:description" content="[^"]*"', body))
                self.assertIn('<meta name="twitter:card" content="summary_large_image"', body)
                self.assertTrue(og_target_exists(image.group(1)), f"og:image target {image.group(1)} missing in out/")

    def test_no_workers_dev_in_metadata_or_feeds(self):
        extra = [OUT / "sitemap.xml", OUT / "rss.xml", OUT / "robots.txt"]
        for path in list(self.bodies) + [p for p in extra if p.exists()]:
            body = path.read_text(encoding="utf-8", errors="replace")
            self.assertNotIn("workers.dev", body, f"{path.relative_to(OUT)} mentions workers.dev")


if __name__ == "__main__":
    unittest.main()
