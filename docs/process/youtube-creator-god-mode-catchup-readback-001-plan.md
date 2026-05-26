# YOUTUBE-CREATOR-GOD-MODE-CATCHUP-READBACK-001 Plan

Status: Closed under `youtube-creator-god-mode-catchup-readback-v1`

Last updated: 2026-05-26

## What

Add the no-spend catch-up readback layer for `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001`.

Plain English: Steve needs the system to show which approved public YouTube creators are actually caught up, which are still missing video/audio/visual watches, which have long-course rows, and whether Scoper/build promotion is allowed. This slice makes that truth visible without calling Gemini, and it says plainly when the baseline is incomplete.

## Why

The YouTube catch-up mission is not done just because the scheduler exists. The system needs a durable baseline report so the Director and Scoper do not over-trust partial source coverage.

## Acceptance Criteria

- The readback covers every approved public YouTube creator from the Build Intel watchlist.
- Each creator row exposes channel URL, tracked metadata count, video/audio/visual watched count, comments status as `operator_excluded`, resource-follow status, source-packet worker status, browser Hands status, long-course pending count, source grade, and next watch action.
- The Dev Hub API and source card can read the catch-up baseline.
- Scoper/build promotion can see whether the source baseline is incomplete.
- The focused proof is no-spend: no live Gemini spend, no live Gemini call, no browser crawl, no backlog write, no external write.

## Definition Of Done

- `lib/youtube-creator-god-mode-catchup.js` builds the readback snapshot and dogfood proof.
- `scripts/process-youtube-creator-god-mode-catchup-check.mjs` proves the live readback.
- `/api/foundation/dev-team-hub` includes `youtubeCreatorGodModeCatchup`.
- `/dev` source card renders the baseline state instead of only source grades.
- `process:dev-team-hub-v0-check` proves the readback remains visible.

## Not Next

- Do not mark `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001` fully done.
- Do not spend live Gemini budget from this slice.
- Do not process Skool, MyICOR, paid/private/member/course/community/comment sources.
- Do not auto-promote Director recommendations into build cards while the baseline gate is blocked.
