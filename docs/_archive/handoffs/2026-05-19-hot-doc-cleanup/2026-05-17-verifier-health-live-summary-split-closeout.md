# Verifier Health Live Summary Split Closeout

Date: 2026-05-17

Card: `VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001`
Closeout key: `verifier-health-live-summary-split-v1`

## What Changed

Extracted health/live-summary verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-health-live-summary.js`.

The root verifier still gathers the live Foundation payloads and sources. The new module owns KPI dynamic-year contract assurance, Foundation Current State live-summary source assurance, system-health/nightly-staleness assurance, and health-script verifier split assurance.

## Proof

- `lib/foundation-verifier-health-live-summary.js` adds the focused evaluator and dogfood proof.
- `scripts/process-verifier-health-live-summary-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects hidden KPI dynamic-year, hidden live-summary, hidden system-health, hidden health-script delegation, and old-inline-predicate failures.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierHealthLiveSummary({ ... })`.

## Expected Gates

```bash
node --check lib/foundation-verifier-health-live-summary.js
node --check scripts/process-verifier-health-live-summary-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-health-live-summary-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001.json --closeoutKey=verifier-health-live-summary-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001.json --closeoutKey=verifier-health-live-summary-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of KPI health, Current State summary, system-health, health scripts, process hardening, runtime reliability, or source extraction.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
