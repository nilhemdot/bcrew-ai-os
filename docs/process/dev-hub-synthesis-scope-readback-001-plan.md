# DEV-HUB-SYNTHESIS-SCOPE-READBACK-001 Plan

## What

Expose a read-only Dev Hub Synthesis Scope panel that shows the proof-lane synthesis scope, scheduled real-corpus refresh scope, item limits, source-family inputs, and scheduled refresh job status.

## Why

Steve needs the Dev Hub to prove the intelligence pipe is pointed at real data, not the old 8-item proof/demo lane. The config repair exists, but without an operator readback the system can still hide behind chat claims. This card makes the proof-vs-refresh boundary visible without running synthesis.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `synthesisScopeReadback`.
- `/dev` renders a Synthesis Scope panel with proof scope, refresh scope, scheduled job status, review buckets, and no-run boundaries.
- The readback reuses existing truth from `buildSynthesisEngineRunConfig` and `foundationJobs`.
- The readback proves refresh scope is `foundation-real-corpus-refresh` with a larger bounded item limit than `foundation-spine-proof`.
- The proof fails if the refresh scope regresses to the proof scope, if the panel starts synthesis/model/embedding work, or if it proposes/applies routes.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, UI wiring, bounded payloads, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-synthesis-scope-readback.js` as a compact projection over existing synthesis config and Foundation job registry state.
- Wire `buildDevTeamHubV0Snapshot` to build `synthesisScopeReadback` from `foundationSnapshot.foundationJobs`.
- Add `public/dev-synthesis-scope.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-synthesis-scope-readback-check.mjs` and `process:dev-hub-synthesis-scope-readback-check`.
- Register closeout and verifier coverage card ID.

## Risks

- False-real-corpus risk: displaying a healthy proof lane could be mistaken for a real-corpus refresh. The panel must separate proof from refresh.
- Side-effect risk: proving synthesis scope must not run `intelligence:synthesis-refresh`, embeddings, model/provider calls, or action routing.
- Duplication risk: this panel could restate Foundation Done. Keep it focused on synthesis config and scheduled refresh status.
- Payload risk: Dev Hub is already large. Keep the readback bounded to compact summaries and short rows.

## Tests

```bash
node --check lib/dev-hub-synthesis-scope-readback.js scripts/process-dev-hub-synthesis-scope-readback-check.mjs public/dev-synthesis-scope.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-synthesis-scope-readback-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-SYNTHESIS-SCOPE-READBACK-001 --planApprovalRef=docs/process/approvals/DEV-HUB-SYNTHESIS-SCOPE-READBACK-001.json --closeoutKey=dev-hub-synthesis-scope-readback-v1 --commitRef=HEAD
```
