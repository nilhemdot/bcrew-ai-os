# Verifier Runtime Reliability Split Closeout

Date: 2026-05-15
Card: `VERIFIER-RUNTIME-RELIABILITY-SPLIT-001`
Closeout key: `verifier-runtime-reliability-split-v1`

## What Changed

Extracted runtime reliability verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-runtime-reliability-verifier.js`.

The final ship gate also exposed a build-log window bug: `FOUNDATION-SWEEP-001` fell out of the 240-commit Recent Builds window once this card was committed. The route/verifier window is now 500 so required historical closeout proof does not disappear after one more commit.

The moved proof domain covers source outage boundary, Foundation Operating Reliability, Plan Critic architectural rules, Foundation Hub performance, full diagnostics performance, ship-gate speed/preflight/payload cleanup, and ClickUp verifier health.

## What It Does

The canonical verifier still emits the same operator-facing PASS/FAIL rows, but the predicates now live in a focused module with synthetic dogfood proof. The root verifier delegates to `evaluateFoundationRuntimeReliabilityVerifier` and keeps the Plan Critic architectural proof artifact available for the later aggregate cleanup check.

## Why It Matters

Runtime reliability is the Foundation trust layer for slow routes, stale source health, ship-gate drag, and provider outages. Moving this domain out of a 15K-line verifier makes failures easier to inspect without weakening the gate.

## Proof

- `node --check lib/foundation-runtime-reliability-verifier.js scripts/process-verifier-runtime-reliability-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js`
- `npm run process:verifier-runtime-reliability-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-RUNTIME-RELIABILITY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-SPLIT-001.json --closeoutKey=verifier-runtime-reliability-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-RUNTIME-RELIABILITY-SPLIT-001 --closeoutKey=verifier-runtime-reliability-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-RUNTIME-RELIABILITY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-SPLIT-001.json --closeoutKey=verifier-runtime-reliability-split-v1 --commitRef=HEAD`

## Known Limits

- This does not rewrite the whole verifier.
- This does not change runtime, source-health, ClickUp, or ship-gate behavior.
- This does not split `lib/foundation-db.js`.
- This does not wire Marketing Video Lab live routes, create Canva assets, build hub features, add paid-source auth, or touch Drive permissions.

## Review Next

Continue verifier monolith cleanup or return to the next highest nightly-audit P0 once this ships cleanly.
