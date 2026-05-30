# Foundation Endpoint Metrics Freshness Closeout - 2026-05-19

Card: `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001`
Closeout key: `foundation-endpoint-metrics-freshness-v1`

## What Changed

- Refreshed the May 19 nightly deep audit artifact so it carries five current endpoint metrics.
- Removed the endpoint budget review rows from System Health by making the latest metric source current.
- Repaired the old endpoint-budget proof to accept the existing focused verifier-module delegation path.
- Added a focused proof and live closeout scaffold for endpoint metric freshness.

## Proof

```bash
node --check scripts/process-foundation-endpoint-metrics-freshness-check.mjs scripts/process-foundation-endpoint-budgets-check.mjs
npm run process:foundation-endpoint-metrics-freshness-check -- --apply --close-card --json
npm run process:foundation-endpoint-budgets-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001.json --closeoutKey=foundation-endpoint-metrics-freshness-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001 --closeoutKey=foundation-endpoint-metrics-freshness-v1
npm run process:foundation-ship -- --card=FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001.json --closeoutKey=foundation-endpoint-metrics-freshness-v1 --commitRef=HEAD
```

## Boundaries

- This card does not implement handoff cleanup, file-size splits, or final green-lock policy.
- This card does not rewrite endpoint budgets or route lazy-loading behavior.
- This card does not start source/value/agent feature work.
- This card does not mutate Drive permissions, send email, send Agent Feedback, or perform external writes.
- This card does not launch parallel builders.

## Next

Continue Foundation-only cleanup with `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001`.
