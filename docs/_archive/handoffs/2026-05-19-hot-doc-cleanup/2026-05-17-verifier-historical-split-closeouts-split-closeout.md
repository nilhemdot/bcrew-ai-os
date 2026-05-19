# Verifier Historical Split Closeouts Split Closeout

Date: 2026-05-17

Card: `VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001`
Closeout key: `verifier-historical-split-closeouts-split-v1`

## What Changed

Extracted historical verifier split closeout assertions from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-historical-split-closeouts.js`.

The root verifier still orchestrates the underlying Phase G operator closeout, readiness blocker closeout, sprint gate progression, and Recent Builds verifier evaluators. The new module owns only the shipped split closeout assertions that prove those earlier verifier split cards remain closed, dogfooded, delegated, and artifact-backed.

## Proof

- `lib/foundation-verifier-historical-split-closeouts.js` adds the focused evaluator and dogfood proof.
- `scripts/process-verifier-historical-split-closeouts-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects hidden Phase G closeout, hidden readiness blocker closeout, hidden sprint gate progression, hidden Recent Builds closeout, and old-inline-predicate failures.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierHistoricalSplitCloseouts({ ... })`.

## Expected Gates

```bash
node --check lib/foundation-verifier-historical-split-closeouts.js
node --check scripts/process-verifier-historical-split-closeouts-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-historical-split-closeouts-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001.json --closeoutKey=verifier-historical-split-closeouts-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001.json --closeoutKey=verifier-historical-split-closeouts-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of the underlying Phase G, readiness blocker, sprint-gate, or Recent Builds evaluators.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
