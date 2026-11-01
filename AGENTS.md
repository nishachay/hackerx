# HackerX agent instructions

Before doing anything, read PROGRESS.md and continue from the first unchecked step. Never redo checked steps. Update PROGRESS.md and commit after every step.

Keep each step small and leave the repository working after each commit. Push every step commit. Record files touched and anything the next session needs to know in one line under Notes / decisions. If blocked, record it under Blockers, commit, and continue with the next independent step.

Long pipeline runs must save incremental results to cache and skip results already cached after restart. Do not proceed beyond the 20-tweet Amos sample in Phase 5 until the user explicitly approves.

This project is HackerX: a static Next.js export with TypeScript and Tailwind plus a Python data pipeline. Install downloads and packages only with the `direct` prefix. Host on Cloudflare Pages through GitHub Actions. Never add login, submission, posting, visitor replies, voting, notifications, or full thread unrolling.

Branding must use a simple orange H mark. Never use X's logo, the Grok icon, or the word Twitter in the UI. New entries come only from Hacker News and there is no submit feature.
