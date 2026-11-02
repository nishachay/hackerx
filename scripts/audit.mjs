import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:8123";
const OUT = "/tmp/opencode/shots";
fs.mkdirSync(OUT, { recursive: true });

const routes = [
  ["home", "/"],
  ["explore", "/explore"],
  ["year", "/year"],
  ["year-2011", "/year/2011"],
  ["accounts", "/accounts"],
  ["account", "/accounts/paulg"],
  ["tweet", "/tweet/1900000000000000001"],
  ["zen", "/zen"],
  ["on-this-day", "/on-this-day"],
  ["history", "/history"],
  ["how-we-pick", "/how-we-pick"],
  ["about", "/about"],
  ["search", "/search"],
  ["not-found", "/does-not-exist"],
];

const widths = [1440, 1024, 768, 390];
const themes = ["dark", "light"];

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const SHOT_TIMEOUT = 60000;
const problems = [];

for (const theme of themes) {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await context.addInitScript((value) => {
      try {
        localStorage.setItem("hackerx-theme", value);
      } catch {}
    }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

    for (const [name, route] of routes) {
      errors.length = 0;
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(120);

      const info = await page.evaluate(() => {
        const broken = [...document.images]
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.getAttribute("src"));
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const h1s = [...document.querySelectorAll("h1")].map((element) => element.textContent.trim());
        const themeMeta = document.querySelector('meta[name="theme-color"]')?.getAttribute("content");
        const manifest = document.querySelector('link[rel="manifest"]')?.getAttribute("href");
        const apple = document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href");
        return { broken, overflow, h1s, themeMeta, manifest, apple };
      });

      if (errors.length) problems.push({ theme, width, route, type: "console", detail: errors.slice(0, 3) });
      if (info.broken.length) problems.push({ theme, width, route, type: "broken-images", detail: info.broken });
      if (info.overflow > 1) problems.push({ theme, width, route, type: "overflow", detail: info.overflow });
      if (info.h1s.length !== 1 && name !== "not-found") problems.push({ theme, width, route, type: "h1", detail: info.h1s });
      if (!info.themeMeta) problems.push({ theme, width, route, type: "theme-color", detail: null });
      if (!info.manifest) problems.push({ theme, width, route, type: "manifest", detail: null });
      if (!info.apple) problems.push({ theme, width, route, type: "apple-icon", detail: null });

      await page.screenshot({ path: `${OUT}/${theme}-${width}-${name}.png`, fullPage: true, timeout: SHOT_TIMEOUT });
      await page.screenshot({ path: `${OUT}/${theme}-${width}-${name}-top.png`, fullPage: false, timeout: SHOT_TIMEOUT });
    }
    await context.close();
  }
}

// Functional checks at 390px.
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await context.newPage();
const functional = [];

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Newest" }).click();
await page.waitForTimeout(150);
functional.push({ check: "tab-url", value: new URL(page.url()).search, pass: new URL(page.url()).searchParams.get("tab") === "new" });
const feedTop = await page.evaluate(() => document.querySelector(".feed-tabs").getBoundingClientRect().top);
functional.push({ check: "tab-scroll-top", value: Math.round(feedTop), pass: feedTop >= 0 && feedTop < 200 });

await page.getByRole("button", { name: "Most discussed" }).click();
await page.waitForTimeout(100);
functional.push({ check: "tab-url-discussed", value: new URL(page.url()).search, pass: new URL(page.url()).searchParams.get("tab") === "discussed" });

await page.goto(`${BASE}/?tab=new&count=20`, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
const countState = await page.evaluate(() => ({
  active: document.querySelector(".feed-tab.is-active")?.textContent.trim(),
  cards: document.querySelectorAll(".feed .tweet-card").length,
}));
functional.push({ check: "url-state", value: countState, pass: countState.active === "Newest" && countState.cards === 20 });

// load more keeps count in URL
await page.getByRole("button", { name: /Show 10 more/ }).click();
await page.waitForTimeout(120);
functional.push({ check: "load-more-url", value: new URL(page.url()).search, pass: new URL(page.url()).searchParams.get("count") === "30" });

// back restores tab and scroll after visiting a tweet
await page.goto(`${BASE}/?tab=new&count=20`, { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(250);
await page.locator(".feed .tweet-card a.tweet-text").first().click();
await page.waitForURL(/\/tweet\//);
await page.waitForTimeout(200);
const tweetScroll = await page.evaluate(() => window.scrollY);
functional.push({ check: "new-page-top", value: tweetScroll, pass: tweetScroll === 0 });
await page.goBack();
await page.waitForTimeout(700);
const backState = await page.evaluate(() => ({
  y: Math.round(window.scrollY),
  tab: new URLSearchParams(location.search).get("tab"),
  cards: document.querySelectorAll(".feed .tweet-card").length,
}));
functional.push({ check: "back-restore", value: backState, pass: backState.tab === "new" && backState.cards === 20 && backState.y > 500 });

// mobile more sheet
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "More", exact: true }).click();
await page.waitForTimeout(250);
const sheetOpen = await page.evaluate(() => {
  const dialog = document.querySelector("dialog.more-sheet");
  return {
    open: dialog?.open,
    focused: document.activeElement?.getAttribute("aria-label"),
    hasHistory: !!dialog?.querySelector('a[href="/history"]'),
    hasTheme: !!dialog?.querySelector("button.theme-toggle"),
    hasRss: !!dialog?.querySelector('a[href="/rss.xml"]'),
  };
});
functional.push({ check: "more-sheet", value: sheetOpen, pass: sheetOpen.open && sheetOpen.hasHistory && sheetOpen.hasTheme && sheetOpen.hasRss });
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
functional.push({ check: "sheet-esc", value: await page.evaluate(() => document.querySelector("dialog.more-sheet")?.open), pass: !(await page.evaluate(() => document.querySelector("dialog.more-sheet")?.open)) });

// theme toggle persists and updates theme-color
await page.getByRole("button", { name: "Switch to light theme" }).first().click();
await page.waitForTimeout(150);
const light = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  meta: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
}));
await page.reload({ waitUntil: "networkidle" });
const persisted = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  meta: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
  flash: performance.getEntriesByType("navigation").length > 0,
}));
functional.push({ check: "theme", value: { light, persisted }, pass: light.theme === "light" && light.meta === "#ffffff" && persisted.theme === "light" && persisted.meta === "#ffffff" });

// search states
await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });
await page.getByLabel("Search the archive").fill("zzzznotfound");
await page.waitForTimeout(200);
const noResults = await page.locator(".empty-state").textContent();
functional.push({ check: "search-empty", value: noResults?.slice(0, 40), pass: noResults?.includes("No matches") });
await page.getByLabel("Search the archive").fill("databases");
await page.waitForTimeout(250);
const resultCount = await page.locator(".search-count").textContent();
functional.push({ check: "search-results", value: resultCount, pass: /match/.test(resultCount ?? "") });

// share feedback
await page.goto(`${BASE}/tweet/1900000000000000001`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Copy link" }).click();
await page.waitForTimeout(200);
const share = await page.locator(".detail").getByText("Link copied", { exact: false }).first().textContent();
functional.push({ check: "share-feedback", value: share, pass: !!share });

// external links
const external = await page.evaluate(() =>
  [...document.querySelectorAll("a[target=_blank]")].map((a) => ({ href: a.getAttribute("href"), rel: a.getAttribute("rel") })),
);
functional.push({ check: "external-links", value: external.slice(0, 4), pass: external.length > 0 && external.every((a) => (a.rel ?? "").includes("noopener")) });

await context.close();
await browser.close();

fs.writeFileSync("/tmp/opencode/audit.json", JSON.stringify({ problems, functional }, null, 2));
console.log(JSON.stringify({ problemCount: problems.length, problems, functional }, null, 2));
