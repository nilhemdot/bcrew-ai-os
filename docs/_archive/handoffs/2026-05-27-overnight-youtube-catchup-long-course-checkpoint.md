# 2026-05-27 Overnight YouTube Catch-Up And Long-Course Checkpoint

## Plain English

The public YouTube standard watcher is no longer stuck. It ran until the scheduler had no eligible standard Dev-lane videos left to send to Gemini. The remaining YouTube work is now honestly separated into long-course videos, source-packet/resource follow-up, paid/auth gates, and lane-specific relevance/noise rows.

## Final State

- Creators represented: 36/36.
- Tracked public YouTube rows: 765.
- Video/audio/visual watched count: 693 after three long-course runs.
- Full-watch report count: 119.
- Standard pending rows still visible: 58, but the scheduler now returns `no_eligible_videos_selected` for the Dev standard lane.
- Long-course pending rows: 11.
- Director report: `director:dev-team-intelligence-director-001:aios-mission-v0`.
- Director input reports: 125.
- Director ranked candidates: 1,974.
- Source grader report: `grader:build-intel-source-value-grader-001:v1`.

## What Changed

- Removed the old report-spine caps from Director/source grader reads so reranking uses the full current YouTube report spine.
- Removed the old LLM-call readback cap so Dev Hub economics/call counts see the full Gemini video call set.
- Hardened the standard scheduler so it can finish safe public backlog without forcing paid/private/long-course/comment work into the wrong lane.
- Fixed unresolved safe public links so they are queued for source-worker follow-up instead of blocking full-watch persistence.
- Added persisted watched-ID readback from reports/atoms/hits so the catch-up worker does not rely only on raw successful LLM calls.
- Added duration-aware long-course routing for visible durations like `4:48:11`, `3:18:23`, and `1:03:27`.

## Provider Blockers Parked

These exact videos were blocked by Gemini `INVALID_ARGUMENT` on standard watch and were parked rather than retried forever:

- `8ktcSaSTvxk` - Nate Herk, `How to Position Your AI Agency for a $100M Exit`.
- `pUykUYkFVTM` - Simon Scrapes, `Build Real AI Systems With Claude Code (Step-by-Step)`.
- `10-ezroDS-c` - `Build an AI Roadmap Using My Simple Transformation Formula`.

The JP Middleton `PfhikUzfjDg` failure was different: it was a 4:48:11 video exceeding Gemini image count in the standard lane. It was not parked as bad content; duration-aware routing moved that class into long-course.

## Long-Course Runs Completed

- `batch:youtube-long-course:api-full-watch-v1:20260527112808`
  - Video: `KTEe5705RHw`
  - Creator: Samin Yasar
  - Title: `INTERACTIVE CLAUDE FULL COURSE 4 HOURS: Build & Sell (2026)`
  - Output: 18 build candidates, 42 visual evidence items, 32 implementation steps.

- `batch:youtube-long-course:api-full-watch-v1:20260527113752`
  - Video: `Rc3_SwcNrqg`
  - Creator: Zane Thinks / Zane Cole
  - Title: `Claude Code FULL COURSE: Build & Sell Apps`
  - Output: 6 build candidates, 13 visual evidence items, 9 implementation steps.

- `batch:youtube-long-course:api-full-watch-v1:20260527114054`
  - Video: `UPtmKh1vMN8`
  - Creator: Nick Saraev
  - Title: `CLAUDE CODE ADVANCED FULL COURSE (3 HOURS)`
  - Output: 14 build candidates, 31 visual evidence items, 21 implementation steps.

## Final Proofs

- `npm run process:dev-team-intelligence-director-check -- --apply --json`
- `npm run process:build-intel-source-value-grader-check -- --apply --json`
- `npm run process:youtube-creator-god-mode-catchup-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- Restarted `ai.bcrew.dashboard`.
- Restarted `ai.bcrew.foundation-worker`.
- Served `dev.html` and `dev.js` returned HTTP 200.
- `npm run foundation:verify -- --json-summary` passed 519/519.

## Next Best Work

1. Continue `YOUTUBE-LONG-COURSE-FULL-WATCH-LANE-001` for the remaining 11 routed long-course rows if budget/time allow.
   - Next selected candidate at handoff: `rv6p9R_lNxc` Samin Yasar, `OPENCLAW FULL COURSE 3 HOURS: Build & Sell (2026)`, duration `2:47:03`.
2. Repair the handoff read model so public resources, repos, newsletters, and free communities show as captured/ready from the full evidence spine.
3. Build the downstream workers in this order: public resource/repo reader, newsletter intake, free-community SOP runner, then paid/auth source-session runner.
4. Wire Director-to-Scoper proposal handoff only after Steve is ready to review/promote the best ideas.
