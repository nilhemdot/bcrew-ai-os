# DEV-HUB-SCOPER-RUNTIME-READBACK-001 Plan

## What

Expose a read-only Dev Hub Scoper Runtime panel that shows whether Scoper has a live scheduled job, what its latest run state is, and how the current Director-to-Scoper evidence trace is flowing.

## Why

Steve asked whether the intelligence pipe actually moves downstream or just sits still. Scoper scheduling/promotion is the next unsafe seam after Director recommendations, so the Dev Hub needs to show the runtime gap before any live schedule or promotion work.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `scoperRuntimeReadback`.
- `/dev` renders a Scoper Runtime panel with schedule status, latest run state, ready/parked candidate counts, and bounded candidate queues.
- The readback reuses Foundation job registry truth plus the existing Scoper evidence trace readback.
- The readback never schedules a Scoper job, runs Scoper, promotes Director candidates, creates Scoper/backlog/Portfolio records, sends Harlan, calls a model, or writes externally.
- The proof fails if the readback starts a schedule/run, writes Scoper/backlog/Portfolio records, or auto-promotes a candidate.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, UI wiring, bounded payloads, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-scoper-runtime-readback.js` as a compact projection over `foundationJobs.jobs` and `scoperEvidenceTraceReadback`.
- Wire `buildDevTeamHubV0Snapshot` to build `scoperRuntimeReadback` from existing job registry and trace payloads.
- Add `public/dev-scoper-runtime-readback.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-scoper-runtime-readback-check.mjs` and `process:dev-hub-scoper-runtime-readback-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Schedule mutation risk: this panel must not wake Scoper or create a scheduled job while Steve is asleep.
- Promotion risk: ready-for-portfolio is not permission to create Scoper/backlog/Portfolio records.
- Payload risk: keep candidate rows bounded and leave full trace details in the existing evidence trace readback.

## Tests

```bash
node --check lib/dev-hub-scoper-runtime-readback.js scripts/process-dev-hub-scoper-runtime-readback-check.mjs public/dev-scoper-runtime-readback.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-scoper-runtime-readback-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-SCOPER-RUNTIME-READBACK-001 --planApprovalRef=docs/process/approvals/DEV-HUB-SCOPER-RUNTIME-READBACK-001.json --closeoutKey=dev-hub-scoper-runtime-readback-v1 --commitRef=HEAD
```
