# Build Lane Failure Telemetry Closeout

Card: `BUILD-LANE-FAILURE-TELEMETRY-001`
Closeout key: `build-lane-failure-telemetry-v1`
Branch: `foundation/system-health-red-to-green-001`

## What Shipped

Added a local Foundation build-lane failure telemetry layer so repeated proof, verifier, ship, fanout, post-ship fanout, and backlog hygiene failures are fingerprinted and surfaced instead of being treated as isolated surprises.

The telemetry records command, card ID, sprint ID, closeout key, check name, failure class, file/module, short detail, timestamp, and fingerprint. It groups repeats over 24 hours and 7 days:

- 3 repeats in 24 hours: yellow/watch.
- 5 repeats in 24 hours: red/risk.
- same fingerprint blocking more than one card: red/risk.
- one-off failure: visible but not escalated.

## Where It Lives

- `lib/build-lane-failure-telemetry.js`
- `scripts/process-build-lane-failure-telemetry-check.mjs`
- `scripts/process-foundation-ship.mjs`
- `scripts/process-ship-check.mjs`
- `scripts/process-fanout-check.mjs`
- `scripts/process-post-ship-fanout.mjs`
- `scripts/backlog-hygiene.mjs`
- `lib/foundation-system-health.js`
- `public/foundation-runtime-renderers.js`
- `lib/foundation-verifier-health-live-summary.js`
- `lib/foundation-verify-coverage-card-ids.js`

## Proof

- `node --check lib/build-lane-failure-telemetry.js scripts/process-build-lane-failure-telemetry-check.mjs lib/foundation-system-health.js scripts/process-foundation-ship.mjs`
- `npm run process:build-lane-failure-telemetry-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BUILD-LANE-FAILURE-TELEMETRY-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-FAILURE-TELEMETRY-001.json --closeoutKey=build-lane-failure-telemetry-v1 --commitRef=HEAD`

## Dogfood

The focused proof simulates:

- repeated verifier snapshot wiring failure, which escalates to yellow;
- repeated thin-plan Plan Critic failure, which escalates to red;
- a one-off failure, which stays non-escalated;
- multi-card served-code/fanout drift, which escalates to red;
- System Health surfacing of repeated build-lane failures.

## Boundaries

This is observability/process work only. It does not weaken or bypass any verifier, create repair cards automatically, run live extraction, run auth-required or paid jobs, call models, write external systems, mutate Drive permissions, run Agent Feedback auto-send, or build Harlan/Fal/voice/Canva/OpenHuman feature work.

Explicitly: no live extraction was run.

## Next

Resume `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001` with `ACTION-ROUTE-PROMOTION-WORKFLOW-001`, then `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001`.
