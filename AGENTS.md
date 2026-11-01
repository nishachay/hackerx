# HackerX agent instructions

Before doing anything, read PROGRESS.md and continue from the first unchecked step. Never redo checked steps. Update PROGRESS.md and commit and push after every step.

Keep each step small and leave the repository working after each commit. Push every step commit. Record files touched and anything the next session needs to know in one line under Notes / decisions. If blocked, record it under Blockers, commit, and continue with the next independent step.

Long pipeline runs must save incremental results to cache and skip results already cached after restart. Never start the full Amos run (Phase 6) until the user approves the sample. UI phases 9 and 10 may proceed meanwhile using fixture data.

This project is HackerX: a static Next.js export with TypeScript and Tailwind plus a Python data pipeline. Install downloads and packages only with the `direct` prefix. Host on Cloudflare Workers with Static Assets, deployed by Workers Builds on push to main (build: `npm run build`, deploy: `npx wrangler deploy`). Do not use Pages or a Cloudflare token in GitHub. Never add login, submission, posting, visitor replies, voting, notifications, or full thread unrolling.

## Token-saving mode

- Write code only. Never run long jobs yourself: HN pull, extract/merge/fetch, Amos, media, or full tests.
- Put every long job in `RUN.md` as its own copy-paste block. Each block must run `cd /data/home/hackerx && git pull`, then `mkdir -p logs`, then one command with output redirected to `logs/<step>.log 2>&1`, then `echo FINISHED; tail -n 20 logs/<step>.log`. Do not use `set -e`.
- When the user says a step is done, read only the last 30 lines of its log.
- Quick checks (syntax, a small unit test, `npm run build`) may be run directly.
- On this machine, run every local build as `env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy npm run build` to keep Turbopack's PostCSS worker from inheriting the proxy. Cloudflare Workers Builds has no proxy; keep its build command as `npm run build`.
- Keep chat replies to 3 lines.

Branding must use a simple orange H mark. Never use X's logo, the Grok icon, or the word Twitter in the UI. New entries come only from Hacker News and there is no submit feature.
