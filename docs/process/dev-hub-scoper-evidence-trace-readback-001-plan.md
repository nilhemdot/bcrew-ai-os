# DEV-HUB-SCOPER-EVIDENCE-TRACE-READBACK-001 Plan

## What

Expose a read-only Dev Hub Scoper evidence trace panel that shows whether current Dev Director build recommendations can be traced back to raw source atoms and hits before Scoper/Portfolio review.

## Why

Steve wants the Dev Hub loop to recommend next builds from real intelligence, then park anything that is not ready. The existing Scoper evidence trace already proves four current Director candidates are ready for Portfolio review and one is parked for missing raw atom evidence, but that truth is buried in a process check. Dev Hub should show it directly.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `scoperEvidenceTraceReadback`.
- `/dev` renders a visible Scoper Trace panel with reviewed, ready, parked, source-trace-ready, and proposal-only counts.
- Candidate rows show raw atom/hit readiness, source trace status, Scoper status, Portfolio decision, and promotion status.
- Candidates without raw atom/hit evidence stay parked and cannot appear as ready for Portfolio review.
- The readback reuses `buildDevBuildOpportunityEvidenceTrace`; it does not create a second Scoper truth layer.
- No Director candidate is promoted into backlog, Scoper, Portfolio, routes, Harlan, or any external system.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, UI wiring, payload bounds, closeout registry, verifier coverage, and no mutation path.
- `process:dev-build-scoper-evidence-trace-check` remains green.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-scoper-evidence-trace-readback.js` as a compact projection over existing Scoper trace output.
- Wire the Dev Hub API route to call `buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })` and pass the result into `buildDevTeamHubV0Snapshot`.
- Add `public/dev-scoper-evidence-trace.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add a small standalone CSS file to avoid growing the already-large `public/dev.css`.
- Add `scripts/process-dev-hub-scoper-evidence-trace-readback-check.mjs` and `process:dev-hub-scoper-evidence-trace-readback-check`.
- Register closeout and verifier coverage card ID.

## Risks

- False green risk: a Director summary could be treated as enough evidence. Dogfood must reject a ready candidate without both raw atom and raw hit.
- Promotion risk: a ready Scoper trace could be mistaken as approval to create a live build card. The panel must say proposal-only and the proof must scan for mutation paths.
- Performance/payload risk: Dev Hub is already large. Limit the readback to five compact candidate rows and keep the route under the existing payload budget.
- Architecture risk: `lib/dev-team-hub.js`, `public/dev.js`, and `public/dev.css` are above the caution threshold. Keep changes minimal and use standalone readback/renderer files.

## Tests

```bash
node --check lib/dev-hub-scoper-evidence-trace-readback.js scripts/process-dev-hub-scoper-evidence-trace-readback-check.mjs public/dev-scoper-evidence-trace.js lib/foundation-build-intel-routes.js lib/dev-team-hub.js
npm run process:dev-build-scoper-evidence-trace-check -- --json --limit=5
npm run process:dev-hub-scoper-evidence-trace-readback-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-SCOPER-EVIDENCE-TRACE-READBACK-001 --planApprovalRef=docs/process/approvals/DEV-HUB-SCOPER-EVIDENCE-TRACE-READBACK-001.json --closeoutKey=dev-hub-scoper-evidence-trace-readback-v1 --commitRef=HEAD
```
