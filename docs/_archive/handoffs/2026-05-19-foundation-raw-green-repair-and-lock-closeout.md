# Foundation Raw Green Repair and Lock Closeout - 2026-05-19

Card: `FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001`
Closeout key: `foundation-raw-green-repair-and-lock-v1`

## What Changed

- Repaired the repeated `connector-uptime-monitor` failure with a governed later-success job run.
- Repaired the `meeting-transcripts-extract-backlog` latest cancelled state with the existing bounded backfill bite.
- Tightened system-health proof so it cannot exit green while embedded workflow health is red/yellow.
- Tightened operating reliability proof so failed jobs or down connectors cannot be hidden behind a healthy exit.
- Expanded repeated-failure gate JSON so blocking repeated failures expose `unsatisfiedRedItems` and `blockingItems`.
- Repaired the historical Current Sprint dynamic-truth proof so a closed sprint uses verified closeout mode after the active blocker rolls forward.

## Proof

```bash
node --check lib/foundation-system-health.js lib/foundation-health-watch-to-green.js scripts/process-system-health-nightly-audit-check.mjs scripts/process-foundation-operating-reliability-check.mjs scripts/process-build-lane-repeated-failure-action-gate-check.mjs scripts/process-current-sprint-dynamic-truth-check.mjs scripts/process-foundation-raw-green-repair-and-lock-check.mjs
npm run process:foundation-operating-reliability-check -- --json --no-api
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:foundation-raw-green-repair-and-lock-check -- --apply --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001.json --closeoutKey=foundation-raw-green-repair-and-lock-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001 --closeoutKey=foundation-raw-green-repair-and-lock-v1
npm run process:foundation-ship -- --card=FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001.json --closeoutKey=foundation-raw-green-repair-and-lock-v1 --commitRef=HEAD
```

## Boundaries

- This card does not implement endpoint metrics, handoff cleanup, or file-size splits.
- This card does not approve broad live private/auth extraction.
- This card does not mutate Drive permissions, send email, send Agent Feedback, or start value/source feature work.
- This card does not launch parallel builders.

## Next

Resume `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001`, then handoff cleanup, file-size classifier, and final green lock.
