import { chromium } from "playwright";

const BASE = "http://localhost:8123";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = [];
const STUB = `window.twttr = { ready(cb){ cb(); }, widgets: { createTweet: async (id, el) => { const d = document.createElement('div'); d.className = 'mock-x-embed'; d.textContent = 'mock embed ' + id; el.appendChild(d); return d; } } };`;

async function newPage(mode) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const xRequests = [];
  await context.route(/(^|\.)(x|twitter)\.com/, (route) => {
    const url = route.request().url();
    if (url === "https://platform.twitter.com/widgets.js") {
      xRequests.push("widgets.js");
      route.fulfill({ contentType: "application/javascript", body: STUB });
    } else {
      xRequests.push(url);
      route.abort();
    }
  });
  if (mode === "links") {
    await context.addInitScript(() => localStorage.setItem("hackerx-embed-consent", "links"));
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  return { context, page, errors, xRequests };
}

// 1. No consent: banner shows, no X requests, links-only fallback visible
{
  const { context, page, errors, xRequests } = await newPage("none");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const banner = await page.locator(".embed-consent").count();
  const fallbacks = await page.locator(".tweet-embed-fallback").count();
  results.push({ check: "banner-shown", pass: banner === 1 });
  results.push({ check: "no-x-requests-before-consent", pass: xRequests.length === 0, detail: xRequests.slice(0, 3) });
  results.push({ check: "fallback-visible", pass: fallbacks > 0 });
  // 2. Click Show posts: widgets.js loads (stubbed), embed appears
  await page.getByRole("button", { name: "Show posts" }).click();
  await page.waitForTimeout(600);
  const embeds = await page.locator(".mock-x-embed").count();
  results.push({ check: "widgets-loaded-after-consent", pass: xRequests.filter((r) => r === "widgets.js").length === 1 });
  results.push({ check: "embed-created", pass: embeds > 0, detail: embeds });
  const stored = await page.evaluate(() => localStorage.getItem("hackerx-embed-consent"));
  results.push({ check: "consent-saved", pass: stored === "all" });
  results.push({ check: "no-console-errors-show", pass: errors.length === 0, detail: errors.slice(0, 3) });
  await context.close();
}

// 3. Links only mode: no X requests at all
{
  const { context, page, errors, xRequests } = await newPage("links");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const banner = await page.locator(".embed-consent").count();
  results.push({ check: "links-mode-no-banner", pass: banner === 0 });
  results.push({ check: "links-mode-no-x-requests", pass: xRequests.length === 0, detail: xRequests.slice(0, 3) });
  results.push({ check: "links-mode-no-console-errors", pass: errors.length === 0, detail: errors.slice(0, 3) });
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify(results, null, 2));
console.log(failed.length ? `SMOKE FAILED (${failed.length})` : "SMOKE OK");
process.exit(failed.length ? 1 : 0);
