# HackerX build progress

## Phase 1 — Project setup and config
- [x] Create the resumable progress checklist and continuation instructions.
- [x] Inspect the repository, design references, and existing project constraints.
- [x] Set up the Next.js static export, TypeScript, Tailwind, and Python pipeline structure.
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

Phase 1, step 4: finalize shared topics, thresholds, and ranking weights.

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

## Blockers

- None currently. The pipeline is intentionally stopped at Phase 5 after its 20-tweet report until the user approves continuing.
