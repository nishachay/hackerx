# HackerX build progress

## Phase 1 — Project setup and config
- [x] Create the resumable progress checklist and continuation instructions.
- [ ] Inspect the repository, design references, and existing project constraints.
- [ ] Set up the Next.js static export, TypeScript, Tailwind, and Python pipeline structure.
- [ ] Add shared configuration for topics, thresholds, and ranking weights.

## Phase 2 — HN pull
- [ ] Implement resumable 14-day Algolia slices with pagination and splitting at 1,000 hits.
- [ ] Persist story and comment fields, with concurrency and backoff.
- [ ] Add weekly incremental and manual GitHub Actions entry points.

## Phase 3 — Tweet ID extraction and merge
- [ ] Extract IDs from supported links, including HTML-escaped URLs.
- [ ] Merge truncated IDs by handle and enforce distinct HN author counts.

## Phase 4 — Tweet fetch
- [ ] Fetch uncached tweet records four at a time and preserve response fields.
- [ ] Record first-fetch failures and retain previously archived copies.

## Phase 5 — Amos test on 20 tweets (STOP for user OK)
- [ ] Implement shared rate limiting, retries, and resumable Amos answer cache.
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
- [ ] Validate schemas and emit Pages size warnings.
- [ ] Publish the open dataset and document its fields and license.

## Phase 9 — Site UI
- [ ] Inspect all supplied X layout references and record measurements/tokens.
- [ ] Build responsive three-column shell, navigation, sidebars, theme, and mobile nav.
- [ ] Build home feed and reusable tweet cards with interactions and pagination.
- [ ] Build tweet detail, HN replies, profiles, and search experience.

## Phase 10 — Extra pages
- [ ] Add Explore, By Year, Accounts, Zen, On this day, History, About, and How we pick.
- [ ] Add image export, PWA/offline support, keyboard navigation, and persistence.
- [ ] Add RSS, sitemap, robots, metadata, and analytics.

## Phase 11 — Tests and CI
- [ ] Add requested Playwright smoke tests, screenshots, broken-link and RSS checks.
- [ ] Compare desktop screenshots against supplied references and record/fix differences.
- [ ] Ensure any failing check blocks deployment.

## Phase 12 — Deploy setup, README, and final report
- [ ] Configure Cloudflare Pages static deployment and weekly data workflow commits.
- [ ] Document setup, reruns, tuning, overrides, and dataset fields.
- [ ] Record final counts, media size, top 20, Amos usage, and failures.

## Current step

Phase 1, step 2: inspect the repository and supplied design references.

## Notes / decisions

- Initial checkpoint files were created before application code, as requested.
- The usable Git checkout is `/data/home/hackerx`; `/data/workspace` is empty and is not a repository.
- Design references are attached to the task; the checkout currently has no `/design` directory.

## Blockers

- None currently. The pipeline is intentionally stopped at Phase 5 after its 20-tweet report until the user approves continuing.
