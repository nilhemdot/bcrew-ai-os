# Recent Builds Billion-Dollar UI v1 Approved Plan

Plan score: 9.8/10. Green light from Steve on 2026-04-30.

Owned card:
- `RECENT-BUILDS-BILLION-DOLLAR-UI-001`

Closeout key:
- `recent-builds-billion-dollar-ui-v1`

## Goal

Redesign Foundation Recent Work / Recent Builds into an executive-grade operator surface. It should be collapsed by default, readable, scannable, and let Steve review each shipped build without digging through raw logs.

## Target Surface

Route:
- `/foundation#build-log`

Target files:
- `public/foundation.js`
- `public/styles.css`
- `lib/foundation-build-log.js`
- `lib/foundation-recent-builds-ui.js`
- `scripts/process-recent-builds-billion-dollar-ui-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Build Order

1. Snapshot current `/api/foundation/build-log?limit=60`, current UI behavior, same-commit groups, and owner/context card boundaries.
2. Add approved plan and approval artifacts.
3. Redesign only the `/foundation#build-log` UI: executive summary, review-next queue, collapsed closeout cards, proof visibility, known limits, where-it-lives, and owner/context card sections.
4. Preserve ownership semantics: `backlogIds = owning cards only`; mentioned/context cards stay context only.
5. Keep same-commit closeouts grouped but individually reviewable.
6. Add focused process check and verifier coverage.
7. Capture desktop `1440x900` and mobile `390x844` manual review proof.
8. Ship through the canonical Foundation ship gate.

## Acceptance

- Recent Work loads from the live `/api/foundation/build-log` API and stays aligned with API truth.
- Closeout cards are collapsed by default.
- The page shows what changed, why it matters, where it lives, proof status, proof commands, known limits, and review-next clearly.
- The review-next queue is visible without opening raw build details.
- Same-commit grouped closeouts remain visible, grouped, and individually reviewable.
- Owning backlog cards and context/mentioned cards are visually separate.
- Context/mentioned cards never render as owning cards.
- `BUILD-LOG-BACKLOG-ID-FIX-001` ownership semantics remain intact.
- `GATE-RELIABILITY-003` remains owned only by `GATE-RELIABILITY-003`; `RECENT-BUILDS-BILLION-DOLLAR-UI-001` may appear only as context before this new closeout exists.
- Desktop `1440x900` and mobile `390x844` manual review passes for collapsed default, expanded latest closeout, same-commit group, ownership/context separation, and review-next queue.
- No horizontal overflow, no overlapping text, and no unreadable proof or review-next text on required viewports.
- Closeout owns only `RECENT-BUILDS-BILLION-DOLLAR-UI-001`.

## API/Data Boundary

The build-log API contract remains v2. This slice should not require an API response shape change. If an API change becomes necessary, it must be additive, backward-compatible, and explicitly proved. No route names, table names, source IDs, card IDs, proof commands, or owner/context semantics may silently change.

## Named Artifacts

- `docs/process/approved-plans/recent-builds-billion-dollar-ui-v1.md`
- `docs/process/approvals/RECENT-BUILDS-BILLION-DOLLAR-UI-001.json`
- `docs/audits/2026-04-30-recent-builds-billion-dollar-ui-baseline.md`
- `docs/audits/2026-04-30-recent-builds-billion-dollar-ui-manual-review.md`
- `lib/foundation-recent-builds-ui.js`
- `scripts/process-recent-builds-billion-dollar-ui-check.mjs`

## Proof Commands

- `npm run process:recent-builds-billion-dollar-ui-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s "http://localhost:3000/api/foundation/build-log?limit=5"`
- `npm run process:foundation-ship -- --card=RECENT-BUILDS-BILLION-DOLLAR-UI-001 --planApprovalRef=docs/process/approvals/RECENT-BUILDS-BILLION-DOLLAR-UI-001.json --closeoutKey=recent-builds-billion-dollar-ui-v1 --commitRef=HEAD`

## Not In Scope

- No comprehensive changelog implementation.
- No daily executive summary.
- No source lifecycle expansion.
- No Strategy, Scoper, Agent Factory, corpus, research cleanup, or new feature lane.
- No broad menu/layout rework beyond keeping Recent Work reachable.

## Closeout Draft

`RECENT-BUILDS-BILLION-DOLLAR-UI-001` closes under `recent-builds-billion-dollar-ui-v1` after the Recent Work UI redesign, owner/context preservation, same-commit proof, focused process check, backlog hygiene, foundation verify, live API proof, manual visual review, and canonical ship wrapper pass. Stop for review after ship. Next expected card: `CHANGE-LOG-COMPREHENSIVE-001`.

## Risks And Limits

- Visual quality is still partly human-reviewed; the checker proves structure, ownership, and coverage, not taste.
- This improves the existing build-log UI. It does not create the comprehensive changelog, daily executive summary, source lifecycle, or a DB-backed build-record system.
- Older commits without v2 closeout records still depend on derived commit summaries.
