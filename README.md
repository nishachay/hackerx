# HackerX

HackerX is a read-only archive of ideas that the Hacker News community keeps recommending. It collects public HN stories and comments that link to individual posts, reads those posts, and publishes the ones that are both timeless and independently recommended by several HN users. There are no accounts, submissions, replies, votes, or notifications, and nothing in the interface is a social network feed.

The site is a static Next.js export hosted on Cloudflare Workers Static Assets. A Python pipeline refreshes the archive; the UI reads the generated files in `data/site/`.

## How a pick is made

1. **Pull HN.** `pipeline/pull_hn.py` walks 14-day Algolia slices for comments and stories that mention `twitter.com` or `x.com` links and caches every response.
2. **Extract and merge.** `pipeline/extract_tweets.py` pulls post IDs out of those links. `pipeline/merge_tweets.py` merges truncated IDs by handle and keeps only posts cited by at least `hn.minimum_distinct_citing_authors` (3) distinct HN authors.
3. **Fetch posts.** `pipeline/fetch_tweets.py` archives text, author, date, media, and engagement counts for uncached posts. Failed posts are recorded and dropped.
4. **Filter with Amos.** `pipeline/filter_tweets.py` asks a decision model narrow questions about each post: is it evergreen, and do the HN commenters recommend it, cite it neutrally, or disagree? Evergreen posts need an average probability of at least `evergreen.minimum_average_probability` (0.6) and a passing kind. A post is published only when at least `recommendation.minimum_distinct_authors` (2) HN authors recommend it.
5. **Rank and publish.** `pipeline/build_site.py` ranks survivors by recommended authors (weight 10), other citing authors (weight 2), story points (log weight 3), a recency boost (1), and a year-spread boost (2), then writes `data/site/tweets.json`, `cards/`, `accounts/`, `years/`, `all.json`, `meta.json`, and `rss.xml`. Every card is schema-checked and no file may exceed 20 MiB.

Thresholds and weights live in `config.json`. Rejections, including posts that fail the fetch or the filters, are kept in the `data/` JSON files for auditability but are not published.

## Run the site locally

```sh
npm install
npm run dev
```

`npm run build` writes the static export to `out/`. If `data/site/` is missing, the UI falls back to the small fixture set in `data/fixture-tweets.json` and labels itself as a preview, so a fresh checkout still renders.

Long pipeline jobs are copy-paste blocks in [`RUN.md`](./RUN.md). The two that matter after the first pull:

- **Step 4** runs Amos over every eligible post (resumable, about 2–2.5 hours at 60 requests/minute).
- **Step 5** builds `data/site/` and commits and pushes the generated data.

Run them on a machine that holds `data/cache/`. Both are resumable and both write a log under `logs/`.

## Deploy

Deployment is Cloudflare Workers Static Assets, configured in `wrangler.jsonc` (`assets.directory` is `./out`). Workers Builds deploys on every push to `main`:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Environment variable: `NEXT_PUBLIC_SITE_URL=https://hackerx.nishachay.tech`

The build is a pure static export (`output: "export"`); there is no server adapter and no Pages project. To deploy by hand, run `npm run build` and then `npx wrangler deploy`.

## Tests

```sh
python3 -m unittest discover -s tests
python3 tests/check_site.py
```

`tests/check_site.py` checks internal links and the RSS feed in the built `out/` directory. The unit tests cover ID extraction and merging, pre-filtering, and the `data/site/` writer.

## Data and licence

Only public Hacker News text and public post metadata are stored. Quotes link back to their HN threads. The published archive is read-only; saved and liked ideas are stored in the visitor's browser, never on a server. No tracking scripts are loaded.
