# DEV-HUB-BUSINESS-ATOM-FLOW-PREFLIGHT-001 Plan

## What

Expose a read-only Dev Hub Business Atom Flow Preflight panel that turns the top business-source atom-flow repair proposal into exact candidate sources, repair gates, and operator boundaries.

## Why

The Next Repair Queue correctly points at stale business-source atom flow, but the actual repair is approval-bound because it would eventually write atoms/facts and possibly refresh synthesis. This card gives Codex and Steve the exact next repair packet without syncing sources, extracting data, creating backlog cards, or mutating intelligence rows while Steve is asleep.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `businessAtomFlowPreflight`.
- `/dev` renders a Business Atom Flow Preflight panel with target family, candidate source rows, source IDs, stage status, and required repair boundary.
- The preflight reuses existing Dev Hub truth: Business Source Pipeline Triage and Next Repair Queue.
- Every candidate stays proposal-only with `autoCreated=false`, `autoPromoted=false`, and `appliedNow=false`.
- The readback creates zero backlog cards, Scoper records, Portfolio records, Current Sprint overlays, action-route mutations, atom/fact/synthesis rows, Harlan sends, model calls, extraction runs, connector probes, source syncs, or external writes.
- The proof fails if a candidate is marked created/promoted/applied, if mutation counters are non-zero, or if the target repair no longer matches business atom-flow work.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, bounded candidate rows, UI wiring, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-business-atom-flow-preflight.js` as a compact projection over Business Source Pipeline Triage and Next Repair Queue.
- Wire `buildDevTeamHubV0Snapshot` to build `businessAtomFlowPreflight` after both contributing readbacks are available.
- Add `public/dev-business-atom-flow-preflight.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-business-atom-flow-preflight-check.mjs` and `process:dev-hub-business-atom-flow-preflight-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Mutation drift: a preflight could accidentally become an atom writer. Every counter and source scan must prove zero writes and zero runtime starts.
- False-green risk: a stale source family could look repair-ready without source IDs or stage proof. Candidates must carry source IDs, current status, and required gates.
- Duplication risk: this should deepen the top Next Repair Queue proposal, not restate every business-source row. Keep rows bounded and operator-focused.
- Approval-bound work risk: actual atom/fact writes, synthesis refresh, route proposal/apply, connector sync, source extraction, and Scoper promotion remain separate approved cards.

## Tests

```bash
node --check lib/dev-hub-business-atom-flow-preflight.js scripts/process-dev-hub-business-atom-flow-preflight-check.mjs public/dev-business-atom-flow-preflight.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-business-atom-flow-preflight-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-BUSINESS-ATOM-FLOW-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/DEV-HUB-BUSINESS-ATOM-FLOW-PREFLIGHT-001.json --closeoutKey=dev-hub-business-atom-flow-preflight-v1 --commitRef=HEAD
```
