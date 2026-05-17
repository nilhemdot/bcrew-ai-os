# Verifier Process Trust Orchestration Split Closeout

Date: 2026-05-17

Card: `VERIFIER-PROCESS-TRUST-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-process-trust-orchestration-split-v1`

## What Changed

Moved the process-trust orchestration layer from `scripts/foundation-verify.mjs` into `lib/foundation-process-trust-verifier.js`.

The root verifier still gathers the live Foundation payloads and source text. The process-trust module now owns backlog lookups, backlog text assembly, the existing process-trust evaluator call, and split self-checks for this domain.

## Proof

- `lib/foundation-process-trust-verifier.js` adds `evaluateFoundationProcessTrustVerifierOrchestration()`.
- `scripts/process-verifier-process-trust-orchestration-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects missing ship-check, fanout, worker-code, done-coverage, artifact-gate, and post-ship fanout fixtures.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationProcessTrustVerifierOrchestration({ ... })`.

## Expected Gates

```bash
node --check lib/foundation-process-trust-verifier.js
node --check scripts/process-verifier-process-trust-orchestration-split-check.mjs
node --check scripts/process-verifier-process-trust-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-process-trust-orchestration-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-PROCESS-TRUST-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-TRUST-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-trust-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-PROCESS-TRUST-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-TRUST-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-trust-orchestration-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of process hooks, process fanout, backlog hygiene, worker served-code trust, done-card coverage, artifact claims, post-ship fanout, cleanup/control, runtime reliability, structural assurance, or Plan Critic scoring.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
