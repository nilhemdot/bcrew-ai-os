# DEV-HUB-SHEETS-ATOM-FLOW-REPAIR-BLUEPRINT-001 Plan

## What

Expose a read-only Dev Hub Sheets Atom Flow Repair Blueprint that turns the Business Atom Flow Preflight candidate rows into exact source-contract repair rows for the Sheets / Owners family.

## Why

The preflight shows which business sources need atom-flow repair, but the next real repair will eventually need approved source reads and atom/fact writes. This card makes the repair executable later by showing exact source IDs, source-contract boundaries, required phases, and no-write gates while Steve is asleep.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `sheetsAtomFlowRepairBlueprint`.
- `/dev` renders a Sheets Atom Flow Blueprint panel with source IDs, source contract summaries, repair phases, and approval boundaries.
- The blueprint reuses existing Dev Hub truth: `businessAtomFlowPreflight` and `sourceContracts`.
- Every blueprint row stays proposal-only with `autoCreated=false`, `autoPromoted=false`, and `appliedNow=false`.
- The readback starts zero Google Sheets reads, connector probes, source syncs, extraction runs, model calls, Harlan sends, or external writes.
- The readback writes zero backlog cards, Scoper records, Portfolio records, Current Sprint overlays, approval records, action routes, atoms, facts, synthesis rows, or route mutations.
- The proof fails if a row is marked created/promoted/applied, if source-contract proof is missing, if mutation counters are non-zero, or if the source runtime starts.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, bounded rows, UI wiring, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-sheets-atom-flow-repair-blueprint.js` as a compact projection over Business Atom Flow Preflight and source contracts.
- Wire `buildDevTeamHubV0Snapshot` to build `sheetsAtomFlowRepairBlueprint` after Business Atom Flow Preflight is available.
- Add `public/dev-sheets-atom-flow-repair-blueprint.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-sheets-atom-flow-repair-blueprint-check.mjs` and `process:dev-hub-sheets-atom-flow-repair-blueprint-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Mutation drift: a blueprint could accidentally become a source reader or atom writer. Every counter and source scan must prove zero reads, writes, runtime starts, and external work.
- False-green risk: a source could look repairable without a source contract. Every row must match an exact source contract by source ID.
- Duplication risk: this should deepen the Sheets / Owners candidate rows, not restate every business-source row. Keep rows bounded and operator-focused.
- Approval-bound work risk: actual Sheets reads, atom/fact writes, synthesis refresh, route proposal/apply, connector sync, source extraction, and Scoper promotion remain separate approved cards.

## Tests

```bash
node --check lib/dev-hub-sheets-atom-flow-repair-blueprint.js scripts/process-dev-hub-sheets-atom-flow-repair-blueprint-check.mjs public/dev-sheets-atom-flow-repair-blueprint.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-sheets-atom-flow-repair-blueprint-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-SHEETS-ATOM-FLOW-REPAIR-BLUEPRINT-001 --planApprovalRef=docs/process/approvals/DEV-HUB-SHEETS-ATOM-FLOW-REPAIR-BLUEPRINT-001.json --closeoutKey=dev-hub-sheets-atom-flow-repair-blueprint-v1 --commitRef=HEAD
```
