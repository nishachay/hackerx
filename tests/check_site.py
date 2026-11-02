"""Phase 11 checks: internal links in ``out/`` and RSS validity.

Usage: python3 tests/check_site.py [out_dir]

Exits non-zero on the first category with problems, after printing every one.
"""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
SKIP_SCHEMES = ("http://", "https://", "mailto:", "tel:", "data:", "javascript:", "//")


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        for key in ("href", "src"):
            value = values.get(key)
            if value and not value.startswith("#"):
                self.links.append(value)


def resolves(out_dir: Path, source: Path, link: str) -> bool:
    path = urlsplit(link).path
    if not path:
        return True
    path = unquote(path)
    if path.startswith("/"):
        target = out_dir / path.lstrip("/")
    else:
        target = source.parent / path
    candidates = [target]
    if path.endswith("/") or target.is_dir():
        candidates.append(target / "index.html")
    if not target.suffix:
        candidates.extend([target.with_suffix(".html"), target / "index.html"])
    return any(candidate.exists() for candidate in candidates)


def check_links(out_dir: Path) -> list[str]:
    problems: list[str] = []
    pages = sorted(out_dir.rglob("*.html"))
    if not pages:
        return [f"no HTML files under {out_dir}"]
    for page in pages:
        parser = LinkParser()
        parser.feed(page.read_text(encoding="utf-8", errors="ignore"))
        for link in parser.links:
            if link.startswith(SKIP_SCHEMES) or link.startswith("#"):
                continue
            if not resolves(out_dir, page, link):
                problems.append(f"{page.relative_to(out_dir)} -> {link}")
    return problems


def check_rss(out_dir: Path) -> list[str]:
    feed = out_dir / "rss.xml"
    if not feed.exists():
        return ["out/rss.xml is missing"]
    try:
        root = ET.parse(feed).getroot()
    except ET.ParseError as error:
        return [f"out/rss.xml is not valid XML: {error}"]
    problems: list[str] = []
    if root.tag != "rss":
        problems.append(f"root element is {root.tag}, expected rss")
    channel = root.find("channel")
    if channel is None:
        return problems + ["channel element is missing"]
    for tag in ("title", "link", "description"):
        element = channel.find(tag)
        if element is None or not (element.text or "").strip():
            problems.append(f"channel/{tag} is missing or empty")
    items = channel.findall("item")
    if not items:
        problems.append("feed has no items")
    if len(items) > 50:
        problems.append(f"feed has {len(items)} items, max is 50")
    for index, item in enumerate(items, start=1):
        for tag in ("title", "link", "guid", "pubDate"):
            element = item.find(tag)
            if element is None or not (element.text or "").strip():
                problems.append(f"item {index} is missing {tag}")
        link = item.findtext("link") or ""
        if not link.startswith("https://"):
            problems.append(f"item {index} link is not absolute: {link}")
        guid = item.find("guid")
        if guid is not None and (guid.get("isPermaLink") or "").lower() == "true" and (guid.text or "") != link:
            problems.append(f"item {index} guid claims to be a permalink but differs from link")
    return problems


def main() -> int:
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out"
    if not out_dir.exists():
        print(f"FAIL: {out_dir} does not exist; run npm run build first")
        return 1
    link_problems = check_links(out_dir)
    rss_problems = check_rss(out_dir)
    for problem in link_problems:
        print(f"LINK {problem}")
    for problem in rss_problems:
        print(f"RSS  {problem}")
    print(
        f"Checked {len(list(out_dir.rglob('*.html')))} pages: "
        f"{len(link_problems)} broken internal links, {len(rss_problems)} RSS problems."
    )
    return 1 if link_problems or rss_problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
