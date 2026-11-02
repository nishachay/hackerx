import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

// PR screenshots: 375 and 1440 px, dark + light, home + one post page, at
// deviceScaleFactor 1 (100% zoom). X's widgets.js is stubbed, so the embed
// area shows a mock - live iframe rendering is not captured here.
const PORT = 8125;
const BASE = `http://localhost:${PORT}`;
const TWEET = "/tweet/608682016205344768";
const STUB = `window.twttr = { ready(cb){ cb(); }, widgets: { createTweet: async (id, el) => { const d = document.createElement('div'); d.className = 'mock-x-embed'; d.style.cssText = 'padding:24px;border:1px dashed #536471;border-radius:12px;color:#71767b;font-family:sans-serif;background:transparent'; d.textContent = 'Official X embed renders here (mocked for screenshots)'; el.appendChild(d); return d; } } };`;

const server = spawn("python3", ["-m", "http.server", String(PORT), "-d", "out"], { stdio: "ignore" });
await delay(1200);
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function shot(name, route, width, height, { theme = "dark", mode = "show", fullPage = false, before } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.route(/(^|\.)(x|twitter)\.com/, (r) => {
    if (r.request().url() === "https://platform.twitter.com/widgets.js") r.fulfill({ contentType: "application/javascript", body: STUB });
    else r.abort();
  });
  await context.addInitScript((opts) => {
    localStorage.setItem("hackerx-embed-consent", opts.mode === "links" ? "links" : "all");
    if (opts.theme === "light") localStorage.setItem("hackerx-theme", "light");
  }, { mode, theme });
  const page = await context.newPage();
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  if (before) await before(page);
  if (mode === "show") await page.waitForTimeout(600);
  await page.screenshot({ path: `.pr-shots/${name}.png`, fullPage });
  console.log("shot", name);
  await context.close();
}

// Required set: home + one post page, 375 and 1440, dark and light.
await shot("home-1440-dark", "/", 1440, 900);
await shot("home-1440-light", "/", 1440, 900, { theme: "light" });
await shot("home-375-dark", "/", 375, 812);
await shot("home-375-light", "/", 375, 812, { theme: "light" });
await shot("post-1440-dark", TWEET, 1440, 900);
await shot("post-1440-light", TWEET, 1440, 900, { theme: "light" });
await shot("post-375-dark", TWEET, 375, 812);
await shot("post-375-light", TWEET, 375, 812, { theme: "light" });

// Links-only consent state.
await shot("home-1440-dark-links", "/", 1440, 900, { mode: "links" });

// Item-1 audit pages and extras.
await shot("how-we-pick-1440-dark", "/how-we-pick", 1440, 900);
await shot("history-375-light", "/history", 375, 812, { theme: "light", mode: "links" });
await shot("shortcuts-help-1440-dark", "/", 1440, 900, {
  before: async (page) => { await page.keyboard.press("?"); await page.waitForTimeout(300); },
});

await browser.close();
server.kill();
