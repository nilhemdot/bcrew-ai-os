# DEV-HUB-AUDITOR-FLOW-READBACK-001 Plan

## What

Expose a read-only Dev Hub Auditor Flow panel that answers whether audit/health jobs are running, where their output lands, and whether findings move into backlog/routes/Scoper or sit behind an explicit review gate.

## Why

Steve asked whether the auditors are actually flowing down the pipeline or just producing reports that sit still. This card makes that boundary visible without running audits, writing reports, creating backlog cards, applying routes, promoting Scoper candidates, or sending external notifications.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `auditorFlowReadback`.
- `/dev` renders an Auditor Flow panel with auditor run status, report/read-only output posture, review buckets, and stuck signals.
- The readback reuses existing Dev Hub truth: `foundationJobs`, `actionRouteReadback`, and `intelligenceHygieneReadback`.
- The readback explains that audit output flows to reports/check status, while backlog/routes/Scoper require a separate approved action.
- The proof fails if the readback performs or represents automatic finding promotion, backlog mutation, route mutation, Scoper mutation, Harlan send, extraction, model calls, report writes, or external writes.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, UI wiring, bounded payloads, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-auditor-flow-readback.js` as a compact projection over existing Foundation job registry and Dev Hub read models.
- Wire `buildDevTeamHubV0Snapshot` to build `auditorFlowReadback` after Action Route and Intelligence Hygiene readbacks are available.
- Add `public/dev-auditor-flow.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-auditor-flow-readback-check.mjs` and `process:dev-hub-auditor-flow-readback-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Promotion risk: audit findings could look like they should auto-create backlog cards or route applies. The readback must say they require a separate approved action.
- Side-effect risk: proving auditor flow must not run audit jobs or write fresh reports. Use existing registry/read models only.
- Duplication risk: this panel could restate Health or Action Route panels. Keep it focused on run -> report/check -> review-gated promotion.
- Payload risk: Dev Hub is already large. Keep the readback bounded to compact summaries and top rows.

## Tests

```bash
node --check lib/dev-hub-auditor-flow-readback.js scripts/process-dev-hub-auditor-flow-readback-check.mjs public/dev-auditor-flow.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-auditor-flow-readback-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-AUDITOR-FLOW-READBACK-001 --planApprovalRef=docs/process/approvals/DEV-HUB-AUDITOR-FLOW-READBACK-001.json --closeoutKey=dev-hub-auditor-flow-readback-v1 --commitRef=HEAD
```
