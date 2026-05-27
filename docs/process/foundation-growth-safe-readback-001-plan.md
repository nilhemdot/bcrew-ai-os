# FOUNDATION-GROWTH-SAFE-READBACK-001 Plan

Card: `FOUNDATION-GROWTH-SAFE-READBACK-001`

## Intent

Make Foundation growth safe before adding more extractors, hubs, and source lanes.

Plain English: if the system watches hundreds of videos, grades dozens of creators, and discovers hundreds of handoff links, the dashboard and proofs must not quietly show only a top slice and make Steve or a builder think that slice is the whole truth.

## Problem

The May 27 critical build review identified the next Foundation risk as readback truth, not more idea collection.

This card fixes the specific failure class:

- artificial ceilings that hide rows after the system grows
- hidden top-N assumptions in source/creator views
- source-truth readback caps that make live Postgres truth look smaller than it is
- post-run ledger status that can say failed even when a run wrote useful artifacts
- shared lane grading, so a creator can be weak for Dev and strong for Marketing/Ops without being globally paused

## Scope

- Promote the card into repo truth so the requirement does not live only in chat or a handoff.
- Add a reusable readback contract module for growth-safe surfaces.
- Make the YouTube Source Intelligence payload separate:
  - full creator leaderboard
  - preview rows
  - grade buckets
  - readback route/limit truth
  - post-run ledger repair signal
- Make the source grader declare lane totals, preview counts, has-more state, and grade buckets.
- Expand shared lane grading beyond Dev-only scoring:
  - Dev / AIOS build
  - Ops / process
  - Sales / conversion
  - Marketing / recruiting
  - Marketing / lead generation
  - Steve AI authority / realtor education
  - Realtor AI training / coaching
  - Leadership / strategy
  - Product/tool evaluation
- Update Dev UI copy/rendering so creator rankings disclose full counts and no longer hide behind a hard top-10 source leaderboard.
- Add a focused proof that dogfoods the exact failure mode: preview rows are not total truth, lane grading stays independent, and a failed job with a later artifact write becomes `post_run_review_needed`.

## Acceptance Criteria

- Full source grades remain available in the API, not only top Dev rows.
- YouTube source intelligence exposes `creatorLeaderboard` for all graded creators and `topCreators` only as an explicit preview.
- Lane rankings expose `totalSourceCount`, `showingCount`, `hasMore`, and `gradeBuckets`.
- Dev page creator ranking does not use a hidden `SOURCE_LEADERBOARD_LIMIT`.
- Existing source readback ceilings are explicit and protected:
  - YouTube daily-watch source-crawl readback uses `YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT`, not an old inline `200`.
  - full-watch report readback is documented as `getIntelligenceAtomSpineSnapshot({ limit: 500 })`
  - Gemini video-call economics readback is documented as `listLlmCalls(... limit: 5000)`
- Post-run ledger status flags `post_run_review_needed` when the scheduler/job status failed but a later batch artifact exists.
- Existing report artifacts are reclassified through the shared lane model before any rewatch spend is considered.
- The proof is read-only: no extraction, provider call, browser run, backlog mutation, source mutation, form submit, download, purchase, or external write.

## Proof

Focused proof:

```bash
npm run process:foundation-growth-safe-readback-check -- --json
```

Supporting proof:

```bash
node --check lib/foundation-growth-safe-readback.js scripts/process-foundation-growth-safe-readback-check.mjs lib/dev-team-hub.js lib/build-intel-source-value-grader.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-team-hub-v0-check -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- Do not build the downstream Scoper apply/promotion path in this card.
- Do not crawl Skool, MyICOR, newsletters, repos, or paid/auth sources from this card.
- Do not run more Gemini extraction from this card.
- Do not use a Dev-grade pause as a global source pause for Marketing, Ops, Sales, or future hubs.
