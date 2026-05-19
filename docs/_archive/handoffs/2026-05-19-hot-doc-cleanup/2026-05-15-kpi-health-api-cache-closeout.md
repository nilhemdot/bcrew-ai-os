# KPI Health API Cache Closeout - 2026-05-15

Card: `KPI-HEALTH-API-CACHE-001`
Sprint: `kpi-health-api-cache-2026-05-15`
Closeout key: `kpi-health-api-cache-v1`
Status: review-ready after ship gate

## What Changed

- Added a bounded KPI Supabase fetch timeout in `lib/kpi-health.js`.
- Added dogfood proof that a slow KPI provider receives an `AbortSignal` and fails quickly instead of hanging request paths.
- Added a read-only focused proof script: `scripts/process-kpi-health-api-cache-check.mjs`.
- Added verifier coverage for the timeout, cache metadata, focused proof, package script, and closeout key.
- Kept `/api/source-of-truth` and Foundation Hub KPI health on `getCachedSafeKpiHealthSnapshot()`.

## Proof

- `node --check lib/kpi-health.js scripts/process-kpi-health-api-cache-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js`
- `npm run process:kpi-health-api-cache-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=KPI-HEALTH-API-CACHE-001 --planApprovalRef=docs/process/approvals/KPI-HEALTH-API-CACHE-001.json --closeoutKey=kpi-health-api-cache-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=KPI-HEALTH-API-CACHE-001 --closeoutKey=kpi-health-api-cache-v1`
- `npm run process:foundation-ship -- --card=KPI-HEALTH-API-CACHE-001 --planApprovalRef=docs/process/approvals/KPI-HEALTH-API-CACHE-001.json --closeoutKey=kpi-health-api-cache-v1 --commitRef=HEAD`

## Dogfood Result

The dogfood proof simulates a slow Supabase fetch that never resolves. The new timeout aborts the request and returns a timeout error within budget. This proves the original audit risk cannot hang Foundation or hub request paths.

## Known Limits

- No KPI writes.
- No Supabase schema changes.
- No hub feature work.
- No Marketing Video Lab live route wiring.
- No Build Intel extraction or paid-source auth.

## Next

Continue audit-derived Foundation cleanup: source-of-truth latency, verifier split, and remaining `lib/foundation-db.js` split work before broad hub expansion.
