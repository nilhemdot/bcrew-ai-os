# FOUNDATION-UI-COMPLETE-001 Plan

## What

Finish the Foundation Source Once-Over UI pass by adding a live `Foundation 30-Second Read` to the existing Source Lifecycle page.

This is a bounded V1 card with tight scope: one aggregation library, one existing API payload extension, one existing UI page panel, one focused proof script, and one sprint closeout. It does not create a new hub.

The read must aggregate these ten existing Source Once-Over surfaces in one scan:

- source maturity grid;
- source extraction coverage;
- source coverage closeout;
- marketing source map;
- brand stack;
- tier behavior;
- verification runs;
- per-user changelog;
- restricted decision queue;
- current sprint.

## Why

Steve should not need another manual audit to know whether Foundation depth is built for v1. The UI should show the state of the Foundation source layer, including visible gaps, in about 30 seconds.

This is the final Foundation Source Once-Over card. It closes visibility and proof, not product behavior.

Useful operator behavior: Steve can open one Foundation page, see whether source depth is complete enough for sprint review, spot the real gaps, and decide the next sprint without asking another auditor to reconstruct the state. That unlocks speed and quality because the operator reads live source status instead of chat memory.

## Acceptance Criteria

- `lib/foundation-ui-complete.js` builds a real summary from live Source Lifecycle and Current Sprint payloads.
- `/api/foundation/source-lifecycle` exposes `foundationUiComplete`.
- `/api/foundation-hub` exposes `foundationUiComplete` at top level and inside `sourceLifecycle`.
- `public/foundation.js` renders `renderFoundationUiCompletePanel()` before the detailed Source Lifecycle panels.
- The panel shows section status, metric, detail, next action, and jump links for all ten Source Once-Over surfaces.
- Visible source/extraction/verification/audit/restricted-decision gaps remain visible as review/risk counts; they are not hidden to make the summary look green.
- Current Sprint shows all ten Source Once-Over cards done this sprint, with the active blocker pinned to `FOUNDATION-UI-COMPLETE-001` for sprint review/rollover.
- The focused proof fails if the API payload, UI renderer, current sprint closeout, plan approval, or canonical verifier coverage is missing.
- The proof rejects substring-only success: source markers are support checks only, while pass/fail depends on the real aggregation function, real API payload, real UI renderer, real Current Sprint overlay, and real backlog card state.

## Definition Of Done

- `FOUNDATION-UI-COMPLETE-001` is live-backlog done with closeout key `foundation-ui-complete-v1`.
- The focused behavior proof passes:
  - `npm run process:foundation-ui-complete-check -- --json=true`
- The standard support checks pass:
  - `npm run backlog:hygiene -- --json`
  - `npm run foundation:verify`
- The final ship gate passes:
  - `npm run process:foundation-ship -- --card=FOUNDATION-UI-COMPLETE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UI-COMPLETE-001.json --closeoutKey=foundation-ui-complete-v1 --commitRef=HEAD`

## Details

Use existing work rather than building a new hub:

- existing code: Source Lifecycle panels in `public/foundation.js`, API wiring in `server.js`, and sprint overlay logic in `lib/foundation-current-sprint.js`;
- existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the previous Source Once-Over plan files;
- existing scripts: focused Source Once-Over proof scripts, `scripts/foundation-verify.mjs`, and `scripts/process-foundation-ship.mjs`;
- live backlog and Current Sprint truth from the Foundation database;
- existing source lifecycle snapshots from `/api/foundation/source-lifecycle`;
- existing Foundation Hub payload from `/api/foundation-hub`.

Behavior proof path: call `buildFoundationUiCompleteSnapshot()` as the real function path, call `/api/foundation/source-lifecycle` as the real API route, check `renderFoundationUiCompletePanel()` as the real UI renderer, and check the live Current Sprint overlay after the focused script closes the card. No substring-only verifier proof is accepted as the deciding proof.

Implementation steps:

1. Add `lib/foundation-ui-complete.js` with `buildFoundationUiCompleteSnapshot()` and `buildSyntheticFoundationUiCompleteProof()`.
2. Wire `foundationUiComplete` into the Source Lifecycle API and Foundation Hub API.
3. Render the `Foundation 30-Second Read` panel at the top of Source Lifecycle.
4. Add focused proof in `scripts/process-foundation-ui-complete-check.mjs`.
5. Update Current Sprint so all ten Source Once-Over cards are done this sprint and the final active blocker stays pinned to `FOUNDATION-UI-COMPLETE-001`.
6. Update current plan/state, Recent Work, package scripts, and canonical verifier coverage.

## Risks

- Risk: making visible source gaps look like failure when they are the point of the UI.
  - Repair path: summary health is based on required section presence; gap counts stay visible as review/risk counts.
- Risk: accidentally starting product work after the final Source Once-Over card.
  - Repair path: keep the active blocker pinned to `FOUNDATION-UI-COMPLETE-001` and require sprint review/rollover before Reply/Watching Loop, Strategy expansion, Marketing production, Telegram bots, Directors, agents, or other product-layer work.
- Risk: another process-only closeout.
  - Repair path: focused proof calls the real aggregation function, real Source Lifecycle API payload, real UI source, and real Current Sprint overlay.
- Risk: slow verification on every small UI tweak.
  - Repair path: this is a P0/full gate because it closes the sprint and touches server/UI/verifier/current sprint docs; future copy-only tweaks can use static/focused gates from the decision tree. The focused proof should stay fast enough for default use, with the full ship gate kept for final closeout. Target focused proof runtime is under 2 minutes and ship gate target remains under 5 minutes.

## Tests

- `node --check lib/foundation-ui-complete.js`
- `node --check scripts/process-foundation-ui-complete-check.mjs`
- `node --check server.js`
- `node --check public/foundation.js`
- `node --check scripts/foundation-verify.mjs`
- `npm run process:foundation-ui-complete-check -- --json=true`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-UI-COMPLETE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UI-COMPLETE-001.json --closeoutKey=foundation-ui-complete-v1 --commitRef=HEAD`

Gate decision tree: this card is full-gate at final ship because the blast radius includes `server.js`, `public/foundation.js`, `lib/foundation-current-sprint.js`, `scripts/foundation-verify.mjs`, package scripts, current plan/current state, and the active sprint closeout. The focused proof is still required first so failures are cheap before the full verifier runs.

## Not Next

- Do not build a new product hub.
- Do not expand Strategy Hub.
- Do not build Reply Parser or Watching Items.
- Do not build marketing writer/editor/designer/video/repurposer production.
- Do not build Telegram bots, Directors, Master Director, scouts, or agents.
- Do not mutate Drive ACLs or send request-access email.
- Do not add new source ingestion or raise quotas.
