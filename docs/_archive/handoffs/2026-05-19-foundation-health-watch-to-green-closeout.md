# Foundation Health Watch To Green Closeout - 2026-05-19

Closeout key: `foundation-health-watch-to-green-v1`

## Operator Closeout

`FOUNDATION-HEALTH-WATCH-TO-GREEN-001` moves the system-health surface from raw watch/risk noise to a green rollup that is only green when no red/yellow row is unclassified.

The remaining non-green rows are not hidden. They stay in the health payload with classification metadata:

- owner
- reason
- threshold
- next action
- repair card route
- sprint-blocking decision

## What Changed

- `lib/foundation-system-health.js` now separates raw red/yellow counts from unclassified red/yellow counts.
- System health can report `healthy` when every raw non-green row is classified and routed.
- `lib/foundation-health-watch-to-green.js` adds the focused dogfood proof for classification and false-green prevention.
- `scripts/process-foundation-health-watch-to-green-check.mjs` validates the live health surface, live Backlog, Current Sprint, closeout registry, verifier coverage, and unsafe-call boundary.
- The Current Sprint advances to `AUDIT-FINDING-TO-BACKLOG-ROUTER-001` after close.

## Current Classification Routes

- `scheduled_job_gmail-sync-current` -> `EXTRACT-CURRENT-001`
- `scheduled_job_meeting-notes-sync-current` -> `EXTRACT-CURRENT-001`, owner Steve, approval-bound
- `scheduled_job_meeting-transcripts-extract-backlog` -> `EXTRACT-BACKFILL-001`
- endpoint budget rows -> `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001`
- handoff hot-doc rows -> `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001`
- file-size watch rows -> `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001`
- `connector_degraded` -> connector watch threshold, visible under `CONNECTOR-UPTIME-MONITOR-001`
- `runtime_jobs_failed` -> governed extraction/backfill ledger route

## Proof Commands

```bash
node --check lib/foundation-system-health.js lib/foundation-health-watch-to-green.js scripts/process-foundation-health-watch-to-green-check.mjs lib/foundation-verifier-health-live-summary.js
npm run process:foundation-health-watch-to-green-check -- --apply --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HEALTH-WATCH-TO-GREEN-001.json --closeoutKey=foundation-health-watch-to-green-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --closeoutKey=foundation-health-watch-to-green-v1
npm run process:post-ship-fanout -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --closeoutKey=foundation-health-watch-to-green-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HEALTH-WATCH-TO-GREEN-001.json --closeoutKey=foundation-health-watch-to-green-v1 --commitRef=HEAD
```

## Boundaries

- No live meeting-notes rerun was approved or performed.
- No live Gmail current sync rerun was performed.
- No meeting transcript live/backfill extraction was performed.
- No provider/model probe, paid run, external write, Drive permission mutation, or Agent Feedback send was performed.
- No parallel builders were launched.

## Next

Run `AUDIT-FINDING-TO-BACKLOG-ROUTER-001`.

Health is green only because the system now has zero unclassified red/yellow rows. The raw classified rows still need their next sprint cards: endpoint metrics freshness, handoff hot-doc cleanup, file-size watch classifier, current extraction proof, and backfill contract.
