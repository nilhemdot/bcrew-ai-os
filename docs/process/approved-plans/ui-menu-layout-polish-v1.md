# UI Menu Layout Polish v1 Approved Plan

Plan score: 9.8/10. Green light from Steve on 2026-04-30.

Owned card:
- `UI-MENU-LAYOUT-POLISH-001`

Closeout key:
- `ui-menu-layout-polish-v1`

## Goal

Make the Foundation operator surface easier to navigate and use after the plain-English copy sweep. This is a nav, grouping, hierarchy, and layout polish pass, not a new feature lane.

## Target Surfaces

Required routes:
- `/foundation#current-state`
- `/foundation#systems`
- `/foundation#backlog`
- `/foundation#build-log`
- `/foundation#system-health`
- `/foundation#source-overview`
- `/foundation#source-docs`
- `/foundation#source-sheets`
- `/foundation#source-apis`
- `/foundation#source-connectors`
- `/foundation#inventory-docs`
- `/foundation#inventory-archive-history`
- `/foundation#capabilities-skills`
- `/foundation#capabilities-plugins`
- `/foundation#capabilities-agents`

## Inventory Split Rules

Default current-doc view:
- `#inventory-docs` shows only current operator docs from categories `Active doctrine`, `Process & runbooks`, `Source notes`, `Specs`, `Strategy reference`, `Agent personas`, and `User profile`.
- `#inventory-docs` must exclude archive/history docs, plan history docs, recent audit history, recent handoff history, retired docs, superseded docs, and any path that clearly belongs to archive/history.
- Private/local docs stay metadata-only and may not expose content, quotes, summaries, or raw tokens.

Archive/history view:
- `/foundation#inventory-archive-history` exposes preserved evidence from `Archive`, `Plan history`, `Recent audits - active`, and `Recent handoffs - active`.
- Archive/history includes docs under `docs/_archive/**`, `docs/rebuild/plan-history/**`, and paths classified as retired, superseded, history, or archive.
- No docs are deleted or hidden from the API. This split is a UI classification and route split unless explicitly proven otherwise.

Proof must show before/after counts for current docs and archive/history docs.

## Build Order

1. Capture baseline counts and stale current-truth state.
2. Add the repo-owned plan and approval artifacts.
3. Add UI route/nav/layout changes for current docs and archive/history.
4. Update current-truth Phase G next-card logic so build/review points to `UI-MENU-LAYOUT-POLISH-001` and post-closeout points to `RECENT-BUILDS-BILLION-DOLLAR-UI-001`.
5. Add a focused process check and verifier coverage.
6. Update backlog status, build log closeout, current plan, and current state.
7. Run desktop and mobile/narrow manual review.
8. Run proof commands and ship.

## Acceptance

- Default System Inventory current-doc view excludes archive/history docs.
- Archive/history docs remain accessible at `/foundation#inventory-archive-history`.
- No docs are deleted.
- Private/local docs remain metadata-only.
- Desktop `1440x900` and mobile/narrow `390x844` manual review passes for every required route.
- Manual review checks no horizontal overflow, no overlapping text, mobile nav usable, active route visible, target routes reachable by hash, current truth / next card visible without digging, and no awkward nested cards/panels.
- Current-truth next card is corrected: during build/review `UI-MENU-LAYOUT-POLISH-001`; after closeout `RECENT-BUILDS-BILLION-DOLLAR-UI-001`.
- Old routes still work.
- New archive/history route exists.
- Current inventory default excludes archive/history docs.
- Archive/history view includes preserved history docs.
- No Phase G future card is implemented.
- Closeout owns only `UI-MENU-LAYOUT-POLISH-001`.

## API/Data Boundary

The archive/current split is UI-only. `/api/system-inventory` remains the source for tracked and private-local doc metadata. The build must not silently change API response shape, existing data contract keys, table names, route names, card IDs, source IDs, selectors, or proof commands.

## Named Artifacts

- `docs/process/approved-plans/ui-menu-layout-polish-v1.md`
- `docs/process/approvals/UI-MENU-LAYOUT-POLISH-001.json`
- `docs/_archive/audits/2026-04-30-ui-menu-layout-polish-baseline.md`
- `docs/_archive/audits/2026-04-30-ui-menu-layout-polish-manual-review.md`
- `lib/foundation-ui-menu-layout-polish.js`
- `scripts/process-ui-menu-layout-polish-check.mjs`

## Proof Commands

- `npm run process:ui-menu-layout-polish-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s http://localhost:3000/api/system-inventory`
- `curl -s 'http://localhost:3000/api/foundation/build-log?limit=5'`
- `npm run process:foundation-ship -- --card=UI-MENU-LAYOUT-POLISH-001 --planApprovalRef=docs/process/approvals/UI-MENU-LAYOUT-POLISH-001.json --closeoutKey=ui-menu-layout-polish-v1 --commitRef=HEAD`

## Not In Scope

- No Recent Work redesign.
- No comprehensive changelog.
- No daily executive summary.
- No source lifecycle expansion.
- No Strategy, Scoper, Agent Factory, corpus, research cleanup, action-review cleanup, or new feature lane.

## Closeout Draft

`UI-MENU-LAYOUT-POLISH-001` closes under `ui-menu-layout-polish-v1` after the nav/layout polish, current-doc/archive-history split, desktop/mobile manual review, process check, backlog hygiene, foundation verify, live API proof, and ship wrapper pass. Stop for review after ship. Next expected card: `RECENT-BUILDS-BILLION-DOLLAR-UI-001`.

## Risks And Limits

- This is not a Recent Work redesign; any executive-grade Recent Work changes belong to `RECENT-BUILDS-BILLION-DOLLAR-UI-001`.
- Manual visual proof is pass/fail route inspection, not a full pixel-regression suite.
- The split classifies existing system-inventory metadata; it does not move, delete, or rewrite docs.
