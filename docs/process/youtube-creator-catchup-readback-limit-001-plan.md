# YOUTUBE-CREATOR-CATCHUP-READBACK-LIMIT-001 Plan

Status: Closed under `youtube-creator-catchup-readback-limit-v1`

Last updated: 2026-05-26

## What

Repair the public YouTube creator catch-up readback so it can see the full daily-watch metadata baseline after the governed public metadata job saved more than 200 rows.

Plain English: the public YouTube metadata job wrote hundreds of approved no-auth rows, but the readback helper still capped source-crawl item reads at 200. That made Dev Hub and the catch-up proof undercount the public creator baseline even though the rows existed in Postgres.

## Why

Steve needs the system to know which creators still need public video/audio/visual watching before major Dev build promotion. A hidden 200-row read cap makes source coverage look worse or stranger than live truth and can send builders down the wrong path.

## Acceptance Criteria

- `listSourceCrawlItems` supports a 1000-row readback ceiling for source-crawl item consumers that need daily-watch baselines.
- The YouTube creator catch-up proof dogfoods the exact failure mode: target rows above 200 must produce tracked metadata above 200.
- The proof reports the live target row count and keeps comments operator-excluded.
- The fix does not start extraction, call Gemini, browse, follow links, mutate backlog from the proof, or write externally.
- Remaining baseline gaps stay visible; this does not claim creator catch-up is complete.

## Definition Of Done

- `lib/foundation-source-crawl-store.js` raises only the source-crawl item list cap needed by this readback.
- `scripts/process-youtube-creator-god-mode-catchup-check.mjs` counts the target rows and proves the readback is not stuck at the old 200-row limit.
- The live backlog, seed backlog, verifier coverage list, closeout registry, and current plan mention the repair.
- Focused YouTube catch-up and Dev Hub proofs pass.
- `backlog:hygiene`, `backlog:seed-drift`, `foundation:verify`, and `process:foundation-ship` pass before push.

## Not Next

- Do not run live Gemini or any provider route from this card.
- Do not process Skool, MyICOR, paid/private/member/course/community/comment sources.
- Do not mark parent `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001` complete.
- Do not broaden unrelated source-crawl limits without a separate proof.
