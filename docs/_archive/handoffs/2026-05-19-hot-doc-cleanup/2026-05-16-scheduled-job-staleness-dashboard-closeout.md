# Scheduled Job Staleness Dashboard Closeout

Date: 2026-05-16
Card: `SCHEDULED-JOB-STALENESS-DASHBOARD-001`
Closeout key: `scheduled-job-staleness-dashboard-v1`

## What Changed

- Added `foundationSystemHealth` to the full Foundation Hub payload from `lib/hub-read-routes.js`.
- Added Runtime Health attention and command items for system-health status in `public/foundation-runtime-renderers.js`.
- Added a `System Health Rollup` diagnostic panel in `public/foundation-operations-renderers.js`.
- The panel surfaces red/yellow scheduled jobs first, with latest status, last successful run, due/overdue state, age, and next action.

## Proof

- `node --check public/foundation-runtime-renderers.js public/foundation-operations-renderers.js lib/hub-read-routes.js`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:ship-check -- --card=SCHEDULED-JOB-STALENESS-DASHBOARD-001 --planApprovalRef=docs/process/approvals/SCHEDULED-JOB-STALENESS-DASHBOARD-001.json --closeoutKey=scheduled-job-staleness-dashboard-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SCHEDULED-JOB-STALENESS-DASHBOARD-001 --closeoutKey=scheduled-job-staleness-dashboard-v1`
- `npm run foundation:verify -- --json-summary` passed `411/411`.

## Dogfood

The focused proof uses real classification code and verifies:

- Overdue missed scheduled jobs render red.
- Failed latest scheduled jobs render red.
- Fresh scheduled successes render green.
- Manual jobs render neutral gray.
- The API payload and Runtime Health UI source both expose the system-health rollup.

## Operator Result

Steve should no longer need to ask an agent whether scheduled health jobs ran. The Foundation runtime surface now carries the staleness signal directly, and the nightly system-health report records the same evidence.

## Not Done Here

- No redesign of the Foundation UI information architecture.
- No repair of current failed sync/extraction jobs.
- No source auth or connector completion work.
