# HackerX build progress

## Phase 1 — Project setup and config
- [x] Create the resumable progress checklist and continuation instructions.
- [x] Inspect the repository, design references, and existing project constraints.
- [x] Set up the Next.js static export, TypeScript, Tailwind, and Python pipeline structure.
- [x] Add shared configuration for topics, thresholds, and ranking weights.

## Phase 2 — HN pull
- [x] Implement resumable 14-day Algolia slices with pagination and splitting at 1,000 hits.
- [x] Persist story and comment fields, with concurrency and backoff.
- [x] Add weekly incremental and manual GitHub Actions entry points.

## Phase 3 — Tweet ID extraction and merge
- [x] Extract IDs from supported links, including HTML-escaped URLs.
- [x] Merge truncated IDs by handle and enforce distinct HN author counts.

## Phase 4 — Tweet fetch
- [x] Fetch uncached tweet records four at a time and preserve response fields.
- [x] Record first-fetch failures and retain previously archived copies.

## Phase 5 — Amos test on 20 tweets (STOP for user OK)
- [x] Implement shared rate limiting, retries, and resumable Amos answer cache.
- [ ] Run evergreen and recommendation labels on a 20-tweet sample.
- [ ] Record scores, pass/fail, request/runtime estimates, then stop for user approval.

## Phase 6 — Full Amos run
- [ ] Run evergreen scoring on all eligible tweets.
- [ ] Run recommendation scoring only for evergreen passes.
- [ ] Apply configured thresholds and ranking formula.

## Phase 7 — Saving and media
- [ ] Archive passing tweets immutably and update only later comments/counts/rank.
- [ ] Self-host optimized media and blur placeholders; mark later fetch failures deleted.
- [ ] Add final overrides and rejection records.

## Phase 8 — Feeds and dataset
- [ ] Build 50-item feeds, calendar feeds, account/topic data, and all.json.
- [ ] Validate schemas and fail near Workers Static Assets size limits.
- [ ] Publish the open dataset and document its fields and license.

## Phase 9 — Site UI
- [ ] Inspect all supplied X layout references and record measurements/tokens.
- [ ] Build responsive three-column shell, navigation, sidebars, theme, and mobile nav.
- [ ] Build home feed and reusable tweet cards with interactions and pagination.
- [ ] Build tweet detail, HN replies, profiles, and search experience.

## Phase 10 — Extra pages
- [ ] Add Explore, By Year, Accounts, Zen, On this day, History, About, and How we pick.
- [ ] Add image export, PWA/offline support, keyboard navigation, and persistence.
- [ ] Add RSS, sitemap, robots, metadata, and dashboard-only Web Analytics guidance (no script).

## Phase 11 — Tests and CI
- [ ] Add requested Playwright smoke tests, screenshots, broken-link and RSS checks.
- [ ] Compare desktop screenshots against supplied references and record/fix differences.
- [ ] Ensure any failing check blocks deployment.

## Phase 12 — Deploy setup, README, and final report
- [ ] Configure Cloudflare Workers Static Assets deployment and validated weekly data workflow commits.
- [ ] Document setup, reruns, tuning, overrides, and dataset fields.
- [ ] Record final counts, media size, top 20, Amos usage, and failures.

## Current step

Phase 5, step 2: finish the cached HN pull using RUN.md, then run Amos filters on a 20-tweet sample.

## User-requested work sequence

- [x] Step 1 — Update agent instructions for Workers Builds and token-saving mode.
- [x] Step 2 — Lossless pre-filter before Amos.
- [x] Step 3 — Optional batched Amos mode.
- [ ] Step 4 — Sample A/B comparison instructions (do not run).
- [ ] Step 5 — Year-spread rank boost.
- [ ] Step 6 — Phase 9 and 10 fixture UI; stop before Phase 11 and Phase 6.

## Notes / decisions

- Initial checkpoint files were created before application code, as requested.
- The usable Git checkout is `/data/home/hackerx`; `/data/workspace` is empty and is not a repository.
- Design references are attached to the task; the checkout currently has no `/design` directory.
- The repository initially contained only a 9-byte README. All ten supplied screenshots were opened/studied; each is 1366×768. Main desktop columns are about 327px / 598px / 441px in the screenshot (left nav / center / right sidebar).
- Pillow is not installed, so image dimensions were inspected with the system `file` utility; no install was needed.
- Visual tokens from the brief and screenshots: black `#000`, primary `#E7E9EA`, secondary `#71767B`, borders `#2F3336`, 16px feed text, rounded 16px cards; use HN orange `#FF6600` instead of blue for HackerX accents.
- Initial static shell uses Next.js 16.4.3, React 19, TypeScript, Tailwind 4, static export, and a Python stdlib pipeline entry point. `npm run build` generated the static home page successfully.
- Dependency install initially flagged Next 15.5.6; upgraded to Next 16.4.3. `npm audit` reports zero vulnerabilities.
- Phase 1 setup files: `package.json`, `package-lock.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `.gitignore`, `app/`, `pipeline/`.
- Shared `config.json` defines 20 topic labels, evergreen pass threshold/kinds, citation minimums, worker/page settings, and rank weights. Next generated `next-env.d.ts` on the successful build.
- `pipeline/pull_hn.py` requests both search phrases in 14-day UTC slices, refreshes the recent two weeks, recursively splits any saturated interval, stores each leaf range atomically, and skips cached ranges after restart. CLI syntax and compilation were checked without contacting HN.
- HN responses are retained intact (including story points/titles and comment text/author/date/IDs) and summarized by story/comment counts. The collector runs up to eight workers and honors numeric or date-form `Retry-After` on 429/503.
- `.github/workflows/weekly.yml` schedules Monday refreshes, supports manual backfills, restores/saves HN request caches, and commits source JSON with the Actions bot. Workflow has not been triggered.
- `pipeline/extract_tweets.py` HTML-decodes HN text before recognizing x.com/twitter.com/mobile/Nitter status URLs, including generic `/i/web/status/` links, and preserves each citing HN item. Syntax compilation succeeded; the stage awaits the first HN pull.
- `pipeline/merge_tweets.py` canonicalizes numeric ID prefixes only when source links share a handle, then retains candidates with at least three distinct HN authors and writes below-threshold IDs with a rejection reason. Current hosting target is Workers Static Assets; Pages references in the earlier checklist have been corrected.
- Current npm versions were checked before installation: Next 16.4.3, React 19.3.1, Tailwind 4.3.3, Pagefind 1.6.0, Playwright 1.64.1, Wrangler 4.156.0, and react-tweet 3.3.1. React/Tailwind/react-tweet were updated; Pagefind, Playwright, Wrangler remain for their relevant phases.
- `pipeline/fetch_tweets.py` bridges to `pipeline/fetch_tweets.mjs`, which calls react-tweet `getTweet` with four workers, retries 429/503 with Retry-After, and writes each result/failure to a per-ID cache. Production build, Python/Node syntax checks, and production dependency audit succeeded. First failures are recorded in `data/rejected-fetch.json`.
- Fetch adapter supports `--refresh-archives`: archived payloads survive a later unavailable/error response, `deleted_on_x` is set on the archive and cleared if a later fetch succeeds. Syntax checks passed; this mode has not run because no curated archive exists yet.
- `pipeline/amos.py` caches each complete response by request content, shares an in-process sliding 60/minute request limit across filters, and honors `Retry-After`; `pipeline/filter_tweets.py` applies the configured evergreen/recommendation rules and supports a deterministic 20-tweet sample. Syntax compilation and static build succeeded.
- Corrected `pipeline/pull_hn.py` range planning so its fixed historical slices plus refreshed rolling window cover every second with no gap. Amos documentation states submitted requests are retained to improve models; this will be disclosed in project documentation.
- Recent Algolia diagnostics: exact phrase `twitter.com status` returned 0 hits for a recent 14-day range, while `twitter.com` returned hundreds. Also found `tags=comment,story` is an intersection and returns 0; collector now queries each tag separately. The two requested phrases and domain-only HN fallbacks are configured; status-link regex remains the eligibility boundary. Earlier pulls were stopped and their wrong-tag caches are unused.
- Per user request, the active HN pull was stopped with its resumable cache preserved. `RUN.md` contains the next long command; the corrected pull should be resumed before extraction/fetch/sample scoring.
- User-requested Step 1 updated `AGENTS.md` with Workers Builds hosting and token-saving rules and removed `set -e` from the existing resumable pull command; next apply Step 2 pre-filter before Amos.
- User-requested Step 2 adds fetch-failure, deleted-tweet, and fewer-than-two-distinct-comment-author exclusions before Amos; writes `data/rejected-prefilter.json` with reasons and prints each exclusion count. `python3 -m py_compile pipeline/filter_tweets.py` passed; no Amos request was made.
- User-requested Step 3 sets `amos.batch_size` to 6 (the API allows 32 questions per request; evergreen uses 5 per tweet, so six is the largest complete batch). `--mode single|batched` defaults to single; batched evergreen and per-tweet comment chunks use unique keys, retry malformed items singly, and use content-addressed request caches. Syntax and config JSON checks passed; no Amos call was made. API reference: https://docs.system-one.dev/en/docs/api

## Blockers

- None currently. The pipeline is intentionally stopped at Phase 5 after its 20-tweet report until the user approves continuing.
