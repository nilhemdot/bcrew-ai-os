# Foundation Route Budget Cleanup Closeout

Date: 2026-05-14 local / 2026-05-15 UTC

Sprint: `foundation-route-budget-cleanup-2026-05-14`

Closeout key: `foundation-route-budget-cleanup-v1`

Cards:
- `SOURCE-OF-TRUTH-PERF-BUDGET-001`
- `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`

## What Changed
The first nightly deep audit flagged two route-budget problems:

- `/api/source-of-truth` was over the operator-route latency budget at roughly 2.1-2.5 seconds.
- Default `/api/foundation-hub` was above the warning payload budget at roughly 870KB.

This sprint fixed both without hub feature work:

- Extracted `/api/source-of-truth` payload construction into `lib/source-of-truth-payload.js`.
- Added a bounded KPI health route cache in `lib/kpi-health.js` so the hot route no longer probes live Supabase every request.
- Added compact Foundation Hub summary shaping in `lib/foundation-hub-summary-payload.js`.
- Compacted default `foundationJobs` runtime rows, default `foundation1100Review`, and default `researchCuration.cards` while keeping full/detail routes available.
- Added focused dogfood proof in `scripts/process-foundation-route-budget-cleanup-check.mjs`.

## Measured Results
Focused proof after dashboard restart:

- `/api/source-of-truth`: `10ms`, `134,031` bytes.
- `/api/foundation-hub`: `79ms`, `774,641` bytes.

Dogfood proof rejected the old failure shapes:

- Synthetic source-of-truth failure: `2,489ms` rejected against the `1,000ms` budget.
- Synthetic Foundation Hub failure: `872,726` bytes rejected against the `800,000` byte budget.

## Proof Commands
- `node --check lib/kpi-health.js lib/source-of-truth-payload.js lib/foundation-hub-summary-payload.js scripts/process-foundation-route-budget-cleanup-check.mjs server.js`
- `npm run process:foundation-route-budget-cleanup-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:ship-check -- --card=FOUNDATION-HUB-PAYLOAD-EXTRACT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-PAYLOAD-EXTRACT-001.json --closeoutKey=foundation-route-budget-cleanup-v1`
- `npm run process:fanout-check -- --card=FOUNDATION-HUB-PAYLOAD-EXTRACT-001 --closeoutKey=foundation-route-budget-cleanup-v1`
- `npm run process:foundation-ship -- --card=FOUNDATION-HUB-PAYLOAD-EXTRACT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-PAYLOAD-EXTRACT-001.json --closeoutKey=foundation-route-budget-cleanup-v1 --commitRef=HEAD`

## Known Limits
- This does not finish the `server.js`, `foundation-db.js`, `foundation-verify.mjs`, or `public/foundation.js` monolith splits.
- This does not build Marketing, Sales, Ops, Build Intel, Skool, myICOR, or paid-source auth.
- KPI health is cached for route speed, but the live `kpi:health` proof path remains separate and still needs to run for source-health truth.
- Foundation Hub default payload is now under the current warning budget, but `backlogItems` remains the largest payload section and should be revisited when the frontend can consume thinner row summaries.

## Next
Use the next nightly audit and current profiler to choose the next cleanup card. Likely candidates remain:

- continue verifier/module splits,
- split `server.js` route ownership further,
- reduce default `backlogItems` payload once the frontend contract is ready,
- continue hub parallel-work dogfooding without crossing Foundation ownership boundaries.
