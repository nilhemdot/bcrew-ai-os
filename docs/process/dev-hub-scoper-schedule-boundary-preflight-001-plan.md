# DEV-HUB-SCOPER-SCHEDULE-BOUNDARY-PREFLIGHT-001 Plan

## What

Expose a read-only Dev Hub Scoper Schedule Boundary Preflight that prepares the exact schedule contract for a read-only Scoper evidence-trace job without registering, scheduling, running, or promoting anything.

## Why

The Dev Hub already shows that Scoper has no scheduled runtime while several Director candidates are ready for Portfolio review. Steve asked Codex to keep going overnight but park approval-bound actions. This card turns the missing Scoper runtime seam into an exact approval packet instead of waking Scoper unsafely.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `scoperScheduleBoundaryPreflight`.
- `/dev` renders a Scoper Schedule Boundary panel with proposed job key, command, cadence, read-only mutation posture, approval text, ready/parked counts, and schedule mutation counters.
- The preflight reuses existing Dev Hub truth: `scoperRuntimeReadback` and `nextRepairQueue`.
- The only proposed job contract is `dev-build-scoper-evidence-trace-readonly` running `npm run process:dev-build-scoper-evidence-trace-check -- --json --limit=5`.
- Every proposed schedule row stays `status=approval_required`, `approvalRequired=true`, `mutationPosture=read_only`, `scheduledNow=false`, `jobRegisteredNow=false`, and `scoperRunStartedNow=false`.
- The readback creates zero job registry writes, schedule mutations, Scoper runs, Scoper/backlog/Portfolio records, route mutations, approval records, model calls, extraction runs, Harlan sends, or external writes.
- The proof fails if any row is marked scheduled, registered, run, promoted, mutated, not read-only, or no longer approval-required.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, bounded rows, UI wiring, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-scoper-schedule-boundary-preflight.js` as a compact projection over Scoper Runtime and Next Repair Queue.
- Wire `buildDevTeamHubV0Snapshot` to build `scoperScheduleBoundaryPreflight` after `nextRepairQueue` is available.
- Add `public/dev-scoper-schedule-boundary-preflight.js` and a `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-scoper-schedule-boundary-preflight-check.mjs` and `process:dev-hub-scoper-schedule-boundary-preflight-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Schedule drift: this card must not add a job definition, write runtime controls, or trigger a run.
- Promotion drift: ready candidates are still proposal-only and cannot become Scoper, Portfolio, backlog, or build records without separate approval.
- False authority risk: the preflight names exact approval text but is not the approval to schedule the job.
- Payload risk: keep schedule rows bounded to one proposed read-only contract.

## Tests

```bash
node --check lib/dev-hub-scoper-schedule-boundary-preflight.js scripts/process-dev-hub-scoper-schedule-boundary-preflight-check.mjs public/dev-scoper-schedule-boundary-preflight.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-scoper-schedule-boundary-preflight-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-SCOPER-SCHEDULE-BOUNDARY-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/DEV-HUB-SCOPER-SCHEDULE-BOUNDARY-PREFLIGHT-001.json --closeoutKey=dev-hub-scoper-schedule-boundary-preflight-v1 --commitRef=HEAD
```
