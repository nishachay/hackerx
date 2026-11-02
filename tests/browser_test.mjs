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
import fs from "node:fs";

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
{
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
}

// Keyboard shortcuts on the home feed (desktop, links-only consent).
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route(/(^|\.)(x|twitter)\.com/, (route) => route.abort());
  await context.addInitScript(() => localStorage.setItem("hackerx-embed-consent", "links"));
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });

  await page.keyboard.press("j");
  record("keys: j highlights a card", (await page.locator("article.tweet-card.is-keyboard-focus").count()) === 1);
  const firstId = await page.locator("article.tweet-card.is-keyboard-focus").getAttribute("data-card-id");
  await page.keyboard.press("j");
  const secondId = await page.locator("article.tweet-card.is-keyboard-focus").getAttribute("data-card-id");
  record("keys: j moves to the next card", Boolean(firstId) && firstId !== secondId, [firstId, secondId]);
  await page.keyboard.press("k");
  record("keys: k moves back", (await page.locator("article.tweet-card.is-keyboard-focus").getAttribute("data-card-id")) === firstId);

  await page.keyboard.press("s");
  await page.waitForTimeout(250);
  record(
    "keys: s saves the card",
    await page.evaluate((id) => {
      const saved = JSON.parse(localStorage.getItem("hackerx-saved") || "[]");
      return saved.some((entry) => (typeof entry === "string" ? entry : entry.id) === id);
    }, firstId),
  );

  await page.keyboard.press("/");
  record("keys: / focuses search", await page.evaluate(() => document.activeElement && document.activeElement.id === "site-search"));
  await page.evaluate(() => document.activeElement.blur());

  await page.keyboard.press("?");
  await page.waitForTimeout(250);
  record("keys: ? opens the help panel", (await page.locator(".shortcut-help[open]").count()) === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  record("keys: Esc closes the help panel", (await page.locator(".shortcut-help[open]").count()) === 0);

  await page.keyboard.press("o");
  await page.waitForTimeout(800);
  record("keys: o opens the detail page", page.url().includes(`/tweet/${firstId}`), page.url());
  await context.close();
}

// Saved-list export and import round trip.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route(/(^|\.)(x|twitter)\.com/, (route) => route.abort());
  await context.addInitScript(() => localStorage.setItem("hackerx-embed-consent", "links"));
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });

  await page.locator("article.tweet-card .action[aria-pressed]").nth(0).click();
  await page.locator("article.tweet-card .action[aria-pressed]").nth(1).click();
  await page.goto(BASE + "/history", { waitUntil: "networkidle" });
  record("export: saved cards listed", (await page.locator("article.tweet-card").count()) === 2);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export JSON" }).click()]);
  const exported = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  record("export: two entries", exported.length === 2, exported.length);
  record(
    "export: only id, url, handle, topic, year, saved_at",
    exported.every((entry) => Object.keys(entry).sort().join(",") === "handle,id,saved_at,topic,url,year"),
    exported[0] ? Object.keys(exported[0]) : [],
  );
  record("export: saved_at present", exported.every((entry) => typeof entry.saved_at === "string" && entry.saved_at.length > 0));

  const [csvDownload] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  const csv = fs.readFileSync(await csvDownload.path(), "utf8");
  record("export: csv header and rows", csv.split("\n")[0] === "id,url,handle,topic,year,saved_at" && csv.trim().split("\n").length === 3, csv.split("\n")[0]);

  await page.evaluate(() => localStorage.setItem("hackerx-saved", "[]"));
  await page.reload({ waitUntil: "networkidle" });
  await page.setInputFiles('input[type="file"]', { name: "hackerx-saved.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(exported)) });
  await page.waitForTimeout(400);
  record("import: restores the saved list", (await page.locator("article.tweet-card").count()) === 2);

  // Unknown ids are ignored on import.
  await page.evaluate(() => localStorage.setItem("hackerx-saved", "[]"));
  await page.reload({ waitUntil: "networkidle" });
  await page.setInputFiles('input[type="file"]', {
    name: "hackerx-saved.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([{ id: "0000000000000000000" }, exported[0]])),
  });
  await page.waitForTimeout(400);
  record("import: unknown ids ignored", (await page.locator("article.tweet-card").count()) === 1);
  await context.close();
}

// Thread label renders when a card is marked thread: true (fixture injected
// into the served flight data; the committed data keeps real flags only).
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route(/(^|\.)(x|twitter)\.com/, (route) => route.abort());
  await context.addInitScript(() => localStorage.setItem("hackerx-embed-consent", "links"));
  let flagChecked = false;
  await context.route(`${BASE}/`, async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    // RSC flight data escapes quotes, so the flag serialises as \"thread\":false.
    if (!flagChecked) {
      record("thread: cards carry the boolean flag", body.includes('\\"thread\\":false'));
      flagChecked = true;
    }
    body = body.replace('\\"thread\\":false', '\\"thread\\":true');
    route.fulfill({ response, body });
  });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  record("thread: label and thread link render", (await page.getByText("Read the full thread on X").count()) >= 1);
  await context.close();
}

// Overflow spot-checks at the two mid breakpoints.
for (const width of [768, 1024]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.route(/(^|\.)(x|twitter)\.com/, (route) => route.abort());
  await context.addInitScript(() => localStorage.setItem("hackerx-embed-consent", "links"));
  const page = await context.newPage();
  for (const route of ["/", "/how-we-pick", "/year", "/history"]) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    record(`${width}px${route}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  await context.close();
}

await browser.close();
server.kill();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} ${r.check}${r.detail ? " " + JSON.stringify(r.detail) : ""}`);
console.log(failed.length ? `BROWSER TESTS FAILED (${failed.length}/${results.length})` : `BROWSER TESTS OK (${results.length} checks)`);
process.exit(failed.length ? 1 : 0);
