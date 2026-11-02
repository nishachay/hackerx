# HackerX

HackerX is a read-only archive of posts that the Hacker News community kept recommending years after they were written. It collects public HN stories and comments that link to individual X posts, scores those posts for lasting value, and publishes the ones that are both timeless and independently recommended by HN readers.

Live site: **https://hackerx.nishachay.tech**

There are no accounts, submissions, replies, votes, or notifications. Posts are always shown with X's official embed (after the visitor allows it) or as plain links — **never copied**. Post text, media, engagement counts, author display names and avatars are never published in any file, page, feed or export; the archive keeps only our own metadata (handle, date, topic, rank) plus the verbatim Hacker News comments that recommend each post, linked back to their threads.

- Privacy: what the site stores in your browser (theme, saves, history, embed choice) and how X's embed works — see the [privacy page](https://hackerx.nishachay.tech/privacy/).
- Removal: something of yours in the archive? [Request removal](https://github.com/nishachay/hackerx/issues/new?template=removal.yml) — we aim to act within 24 hours.

The site is a static Next.js export hosted on Cloudflare Workers Static Assets. A Python pipeline refreshes the archive; the UI reads the generated files in `data/site/`.

## How a pick is made

1. **Pull HN.** `pipeline/pull_hn.py` walks 14-day Algolia slices for comments and stories that mention `twitter.com` or `x.com` links and caches every response.
2. **Extract and merge.** `pipeline/extract_tweets.py` pulls post IDs out of those links. `pipeline/merge_tweets.py` merges truncated IDs by handle and keeps only posts cited by at least `hn.minimum_distinct_citing_authors` distinct HN authors.
3. **Fetch posts.** `pipeline/fetch_tweets.py` archives text, author, date, media, and engagement counts for uncached posts. Failed posts are recorded and dropped.
4. **Filter with Amos.** `pipeline/filter_tweets.py` asks a decision model narrow questions about each post: is it evergreen, and do the HN commenters recommend it, cite it neutrally, or disagree? Evergreen posts need an average probability of at least `evergreen.minimum_average_probability` and a passing kind. A post is published only when at least `recommendation.minimum_distinct_authors` HN authors recommend it.
5. **Rank and publish.** `pipeline/build_site.py` ranks survivors by recommended authors, other citing authors, story points (log weight), a recency boost and a year-spread boost, detects self-reply threads (published as a single `thread` boolean), then writes `data/site/tweets.json`, `accounts.json`, `years.json`, `all.json`, `meta.json` and `rss.xml`. Every card is schema-checked against a public field whitelist and no file may exceed 20 MiB.

Thresholds and weights live in `config.json` and are read from it at build time — including by the How we pick page. Rejections, including posts that fail the fetch or the filters, are kept in the `data/` JSON files for auditability but are not published.

## Run the site locally

```sh
npm install
npm run dev
```

`npm run build` writes the static export to `out/`. If `data/site/` is missing, the UI falls back to the small fixture set in `data/fixture-tweets.json` and labels itself as a preview, so a fresh checkout still renders.

## Run the pipeline

Long pipeline jobs are copy-paste blocks in [`RUN.md`](./RUN.md). The two that matter after the first pull:

- **Step 4** runs Amos over every eligible post (resumable, about 2–2.5 hours at 60 requests/minute).
- **Step 5** builds `data/site/` and commits and pushes the generated data.

Run them on a machine that holds `data/cache/`. Both are resumable and both write a log under `logs/`.

## Deploy

Deployment is Cloudflare Workers Static Assets, configured in `wrangler.jsonc` (`assets.directory` is `./out`). Workers Builds deploys on every push to `main`:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Environment variable: `NEXT_PUBLIC_SITE_URL=https://hackerx.nishachay.tech`

The canonical URL comes from `NEXT_PUBLIC_SITE_URL` everywhere (canonical links, sitemap, RSS, robots, OG URLs, share links), with `https://hackerx.nishachay.tech` as the fallback. The build is a pure static export (`output: "export"`); there is no server adapter and no Pages project. To deploy by hand, run `npm run build` and then `npx wrangler deploy`.

## Tests

```sh
npm test
```

That runs the Python unit tests (ID extraction and merging, pre-filtering, the `data/site/` writer, thread detection, compliance and policy checks, config-driven page values), the built-site link and RSS checks, and the Playwright browser tests (consent-gated embeds, keyboard shortcuts, saved-list export/import, overflow at several widths). Browser tests stub every X request; nothing contacts X.

## Data and licence

Only public Hacker News text and our own metadata are stored. Quotes link back to their HN threads. The published archive is read-only; saved and liked ideas are stored in the visitor's browser, never on a server. No tracking scripts are loaded.
