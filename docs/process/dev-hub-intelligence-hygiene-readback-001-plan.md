# DEV-HUB-INTELLIGENCE-HYGIENE-READBACK-001 Plan

## What

Expose a read-only Dev Hub Intelligence Hygiene panel that rolls up the cleanup pressure in the Dev intelligence loop: atom-flow/source pipeline gaps, action-route stale/duplicate pressure, Scoper parked candidates, and source-family blockers.

## Why

Steve wants the Dev Hub to recommend next builds without overloading the pipe. The system should keep showing what is stale, duplicated, parked, or approval-bound as new data lands, instead of making builders guess whether to write atoms, approve routes, or promote recommendations.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `intelligenceHygieneReadback`.
- `/dev` renders an Intelligence Hygiene panel with cleanup pressure, atom-flow gaps, route noise, Scoper parked rows, and source-family blockers.
- The readback reuses existing Dev Hub truth: `foundationDoneBar`, `actionRouteReadback`, `scoperEvidenceTraceReadback`, and `sourceFamilyGodModeMaturity`.
- The readback recommends safe next review buckets only; it does not mutate atoms, routes, backlog, Scoper, Portfolio, Harlan, source rows, or external systems.
- The panel makes false-freshness risk explicit: stale atom flow should be repaired from fresh/source-backed evidence, not by writing new atoms from old facts just to turn a bar green.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, UI wiring, payload bounds, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-intelligence-hygiene-readback.js` as a compact projection over existing Dev Hub read models.
- Wire `buildDevTeamHubV0Snapshot` to build `intelligenceHygieneReadback` after Foundation Done, Action Route, Scoper Trace, and source-family maturity are available.
- Add `public/dev-intelligence-hygiene.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-intelligence-hygiene-readback-check.mjs` and `process:dev-hub-intelligence-hygiene-readback-check`.
- Register closeout and verifier coverage card ID.

## Risks

- False freshness risk: stale atom-flow sources could be “fixed” by writing fresh atoms from old facts. This card must remain read-only and call that out as a risky repair.
- Promotion risk: cleanup buckets could become live backlog/route/Scoper mutations. The proof must scan for mutation paths and dogfood unsafe fixtures.
- Duplication risk: this panel could restate existing panels. Keep it as the cross-panel cleanup queue and reuse existing read models instead of creating a new truth layer.
- Payload risk: Dev Hub is already large. Keep the readback bounded to compact summary and short top queues.

## Tests

```bash
node --check lib/dev-hub-intelligence-hygiene-readback.js scripts/process-dev-hub-intelligence-hygiene-readback-check.mjs public/dev-intelligence-hygiene.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-intelligence-hygiene-readback-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-INTELLIGENCE-HYGIENE-READBACK-001 --planApprovalRef=docs/process/approvals/DEV-HUB-INTELLIGENCE-HYGIENE-READBACK-001.json --closeoutKey=dev-hub-intelligence-hygiene-readback-v1 --commitRef=HEAD
```
