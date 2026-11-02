import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const PORT = 8125;
const BASE = `http://localhost:${PORT}`;
const TWEET = "/tweet/608682016205344768";
const STUB = `window.twttr = { ready(cb){ cb(); }, widgets: { createTweet: async (id, el) => { const d = document.createElement('div'); d.className = 'mock-x-embed'; d.style.cssText = 'padding:24px;border:1px solid #2f3336;border-radius:16px;color:#e7e9ea;font-family:sans-serif'; d.textContent = 'Official X embed renders here (mocked in tests)'; el.appendChild(d); return d; } } };`;

const server = spawn("python3", ["-m", "http.server", String(PORT), "-d", "out"], { stdio: "ignore" });
await delay(1200);
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function shot(name, route, width, height, mode) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  await context.route(/(^|\.)(x|twitter)\.com/, (r) => {
    if (r.request().url() === "https://platform.twitter.com/widgets.js") r.fulfill({ contentType: "application/javascript", body: STUB });
    else r.abort();
  });
  if (mode === "links") await context.addInitScript(() => localStorage.setItem("hackerx-embed-consent", "links"));
  const page = await context.newPage();
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  if (mode === "show") {
    await page.getByRole("button", { name: "Show posts" }).click();
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: `.github/pr-assets/${name}.png`, fullPage: false });
  console.log("shot", name);
  await context.close();
}

await shot("home-desktop-links", "/", 1280, 900, "links");
await shot("home-mobile-links", "/", 375, 812, "links");
await shot("tweet-desktop-links", TWEET, 1280, 900, "links");
await shot("tweet-mobile-links", TWEET, 375, 812, "links");
await shot("home-desktop-embed-consent", "/", 1280, 900, "show");
await shot("tweet-desktop-embed-mock", TWEET, 1280, 900, "show");

await browser.close();
server.kill();
