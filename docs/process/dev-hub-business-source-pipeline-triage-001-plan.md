# DEV-HUB-BUSINESS-SOURCE-PIPELINE-TRIAGE-001 Plan

## What

Expose a read-only Dev Hub Business Source Pipeline panel that shows whether FUB, KPI/Supabase, Sheets, Owners/Freedom, Finance, ClickUp, and Drive are flowing through extraction → atoms → synthesis → routes → resolved action.

## Why

Steve wants one hub at a time, but the next hub work depends on knowing which business connectors actually feed the intelligence pipe and which are dashboard-only or stale. The Dev Hub needs a clear money/CRM/source triage before more build recommendations depend on those sources.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `businessSourcePipelineTriage`.
- `/dev` renders a Business Sources panel with summary counts, family buckets, and bounded source queues.
- The readback reuses the existing Foundation Done bar/source maturity truth instead of creating a second source pipeline model.
- The readback never syncs FUB/KPI/Sheets/ClickUp/Drive, writes atoms/facts/routes, creates backlog/Scoper/Portfolio records, sends Harlan, calls a model, or writes externally.
- The proof fails if the readback starts extraction/sync/model work, writes intelligence records, or marks a stale source as complete.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, UI wiring, bounded payloads, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-business-source-pipeline-triage.js` as a compact projection over `foundationDoneBar`.
- Wire `buildDevTeamHubV0Snapshot` to build `businessSourcePipelineTriage` from the existing Foundation Done payload.
- Add `public/dev-business-source-pipeline-triage.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-business-source-pipeline-triage-check.mjs` and `process:dev-hub-business-source-pipeline-triage-check`.
- Register closeout and verifier coverage card ID.

## Risks

- False green risk: signed-off or connected source contracts are not the same as fresh atoms/routes/resolved actions.
- External write risk: this panel must not run source sync, extraction, connector probes, or business-system writes.
- Payload risk: keep source rows bounded and leave full source maturity detail in the existing Foundation Done/source maturity views.

## Tests

```bash
node --check lib/dev-hub-business-source-pipeline-triage.js scripts/process-dev-hub-business-source-pipeline-triage-check.mjs public/dev-business-source-pipeline-triage.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-business-source-pipeline-triage-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-BUSINESS-SOURCE-PIPELINE-TRIAGE-001 --planApprovalRef=docs/process/approvals/DEV-HUB-BUSINESS-SOURCE-PIPELINE-TRIAGE-001.json --closeoutKey=dev-hub-business-source-pipeline-triage-v1 --commitRef=HEAD
```
