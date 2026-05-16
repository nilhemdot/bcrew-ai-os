# FOUNDATION-ENDPOINT-BUDGETS-001 Plan

## What

Turn the existing nightly endpoint timing and payload measurements into a recurring Foundation health surface for operator routes.

V1 covers:

- `/api/foundation-hub`
- `/api/source-of-truth`
- `/api/foundation/source-lifecycle`
- `/api/foundation/build-log`
- `/api/foundation/gstack-build-intel`

## Why

The 70-second Foundation Hub issue proved that route speed is not polish. Steve should see route budget regressions in morning health before a slow endpoint blocks hub work or makes the system feel broken again.

## Acceptance Criteria

- Add a focused `FOUNDATION-ENDPOINT-BUDGETS-001` module that classifies endpoint latency and payload budget status using the existing nightly audit endpoint classifier.
- Preserve report-only posture: no auto-fixes, no backlog mutation, no route behavior changes.
- Store endpoint metrics in future nightly deep audit JSON output so the morning health surface can compare real daily measurements.
- Surface endpoint budget state inside Foundation Operating Reliability / morning health with plain-English findings when measured endpoints are warning/risk/missing.
- Focused dogfood recreates the old endpoint failure class: a 70-second / 4.63 MB route must be risk, an over-800KB route must be warning, and a healthy current route set must pass.
- Live focused proof measures the five required local endpoints and records their current budget state.

## Definition Of Done

- `lib/foundation-endpoint-budgets.js` owns endpoint budget rows, summary, dogfood proof, latest-report loading, and live measurement.
- `scripts/process-foundation-endpoint-budgets-check.mjs` proves the card, approval, Plan Critic row, Current Sprint state, dogfood, live measurement, report-only posture, nightly JSON metric persistence, and Foundation Operating Reliability wiring.
- `lib/nightly-deep-audit-upgrade.js` writes `endpointMetrics` into the JSON artifact going forward.
- `lib/connector-uptime-monitor.js` includes endpoint budget findings in morning health without mutating anything.
- `/api/foundation-hub?view=full` exposes the endpoint budget snapshot under Foundation Operating Reliability.
- `scripts/foundation-verify.mjs` has ID-named verifier coverage for the card.

## Existing Work Reused

- `lib/code-quality-nightly-audit.js` already measures the five required endpoints and classifies latency/payload risk.
- `lib/foundation-route-budget-verifier.js`, `lib/source-of-truth-payload.js`, and `lib/foundation-hub-summary-payload.js` already prove earlier one-off route budget fixes.
- `lib/connector-uptime-monitor.js` already owns Foundation Operating Reliability, runtime activation, and morning health.
- `docs/process/foundation-api-perf-audit-001-plan.md` already defines the report-only API performance audit lane.

## Risks And Repair

Risk: route measurement during normal page loads would slow the product. Repair: do not measure live endpoints from the default hub route; use the nightly report for recurring health and live measurement only in focused proof/manual diagnostics.

Risk: missing prior endpoint metrics could look like a system outage. Repair: classify missing metrics as review/report-only with a clear next action to run the scheduled nightly audit, not as a product failure.

Risk: this becomes a broad performance rewrite. Repair: no route behavior changes in this card. Any slow endpoint found becomes a follow-up card.

## Proof Commands

- `npm run process:foundation-endpoint-budgets-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-ENDPOINT-BUDGETS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-ENDPOINT-BUDGETS-001.json --closeoutKey=foundation-endpoint-budgets-v1 --commitRef=HEAD`

## Not Next

- Do not rewrite or slim the five routes in this card.
- Do not build hub feature UI.
- Do not wire Marketing Video Lab live routes.
- Do not build Canva asset library features.
- Do not add paid-source auth, source extraction, or Build Intel extraction.
- Do not work `MEETING-VAULT-ACL-001` Phase B or mutate Drive permissions.
