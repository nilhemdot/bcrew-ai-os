# Verifier Process Hardening Orchestration Split Closeout

Date: 2026-05-17

Card: `VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-process-hardening-orchestration-split-v1`

## What Changed

Moved the process-hardening orchestration layer from `scripts/foundation-verify.mjs` into `lib/foundation-process-hardening-verifier.js`.

The root verifier still gathers the live Foundation payloads and source text. The process-hardening module now owns the existing process-hardening evaluator call, check aggregation, dogfood proof, and split self-checks for this domain.

## Proof

- `lib/foundation-process-hardening-verifier.js` adds `evaluateFoundationProcessHardeningVerifierOrchestration()`.
- `scripts/process-verifier-process-hardening-orchestration-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects verifier repair, scheduled mutation, DB seed writeback, and backlog lost-update fixtures.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationProcessHardeningVerifierOrchestration({ ... })`.

## Expected Gates

```bash
node --check lib/foundation-process-hardening-verifier.js
node --check scripts/process-verifier-process-hardening-orchestration-split-check.mjs
node --check scripts/process-verifier-process-hardening-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-process-hardening-orchestration-split-check -- --json
npm run process:verifier-process-hardening-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-hardening-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-hardening-orchestration-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of read-only verification, scheduled mutation guard, process-check apply posture, DB seed governance, current sprint mutation guards, job allowlists, KPI cache, backlog concurrency, runtime reliability, build-log assurance, health/live summary, follow-up backlog assurance, structural assurance, connector auth, route budgets, or Plan Critic scoring.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
