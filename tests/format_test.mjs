/**
 * Unit checks for the shared formatting helpers (pluralize and friends)
 * and the quote URL shortener. Run: node tests/format_test.mjs
 */
import assert from "node:assert/strict";
import { pluralize, plural } from "../app/lib/format.ts";
import { shortenUrl, splitQuoteUrls } from "../app/lib/quote-url.ts";

// plural / pluralize
assert.equal(plural(1, "recommendation"), "recommendation");
assert.equal(plural(2, "recommendation"), "recommendations");
assert.equal(pluralize(1, "recommendation"), "1 recommendation");
assert.equal(pluralize(122, "citation"), "122 citations");
assert.equal(pluralize(1, "post cited", "posts cited"), "1 post cited");
assert.equal(pluralize(34, "post cited", "posts cited"), "34 posts cited");
assert.equal(pluralize(1285, "comment"), "1,285 comments");

// URL shortening: domain plus shortened path, about 40 chars
const long = "https://twitter.com/mxcl/status/608682016205344768?lang=en";
const short = shortenUrl(long);
assert.equal(short, "twitter.com/mxcl/status/608682016205344…");
assert.ok(short.length <= 40, `shortened URL is ${short.length} chars`);
assert.equal(shortenUrl("https://example.com/short"), "example.com/short");
assert.equal(shortenUrl("https://www.example.com/x"), "example.com/x");

// Splitting keeps words and URLs as separate segments, punctuation outside
const segments = splitQuoteUrls(`see https://example.com/a-very/long/path/that/keeps/going/and/going/file.html now.`);
assert.deepEqual(segments.map((s) => s.kind), ["text", "url", "text"]);
const wrapped = splitQuoteUrls(`words (https://example.com/path) more`);
assert.deepEqual(wrapped.map((s) => s.kind), ["text", "url", "text"]);
assert.equal(wrapped[2].value, ") more");

console.log("FORMAT TESTS OK");
