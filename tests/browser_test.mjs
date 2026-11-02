/**
 * Browser tests for the consent-gated X embed and core routes.
 *
 * Playwright drives the static build in out/. X's widgets.js is stubbed
 * and every other request to an X host is aborted, so these tests never
 * contact X. Run after `npm run build`:
 *
 *   node tests/browser_test.mjs
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const PORT = 8124;
const BASE = `http://localhost:${PORT}`;
const ROUTES = ["/", "/tweet/608682016205344768", "/privacy", "/about"];
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];
const STUB = `window.twttr = { ready(cb){ cb(); }, widgets: { createTweet: async (id, el) => { const d = document.createElement('div'); d.className = 'mock-x-embed'; d.textContent = 'mock embed ' + id; el.appendChild(d); return d; } } };`;

const results = [];
function record(check, pass, detail) {
  results.push({ check, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });
}

const server = spawn("python3", ["-m", "http.server", String(PORT), "-d", "out"], { stdio: "ignore" });
await delay(1200);

const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  for (const viewport of VIEWPORTS) {
    for (const mode of ["show", "links"]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
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
      page.on("pageerror", (error) => errors.push("pageerror: " + error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push("console: " + message.text());
      });

      for (const route of ROUTES) {
        const tag = `${viewport.name}/${mode}${route}`;
        errors.length = 0;
        xRequests.length = 0;
        await page.goto(BASE + route, { waitUntil: "networkidle" });
        await page.waitForTimeout(300);

        if (mode === "show") {
          const banner = page.locator(".embed-consent");
          if ((await banner.count()) === 1) {
            record(`${tag}: no widgets.js before consent`, xRequests.length === 0);
            await page.getByRole("button", { name: "Show posts" }).click();
            await page.waitForTimeout(700);
          }
          const hasCards = (await page.locator(".tweet-card, .detail").count()) > 0;
          if (hasCards) {
            record(`${tag}: widgets.js loaded once after consent`, xRequests.filter((r) => r === "widgets.js").length === 1, xRequests);
            record(`${tag}: embed created`, (await page.locator(".mock-x-embed").count()) > 0);
          }
          record(`${tag}: no other X hosts`, xRequests.every((r) => r === "widgets.js"), xRequests.slice(0, 3));
        } else {
          record(`${tag}: no X requests in links-only mode`, xRequests.length === 0, xRequests.slice(0, 3));
          record(`${tag}: fallback link visible`, (await page.locator(".tweet-embed-fallback a[href*='x.com']").count()) > 0 || route === "/privacy" || route === "/about");
        }
        record(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 3));
        record(`${tag}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} ${r.check}${r.detail ? " " + JSON.stringify(r.detail) : ""}`);
console.log(failed.length ? `BROWSER TESTS FAILED (${failed.length}/${results.length})` : `BROWSER TESTS OK (${results.length} checks)`);
process.exit(failed.length ? 1 : 0);
