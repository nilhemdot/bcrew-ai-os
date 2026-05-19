# Verifier Intelligence Spine Orchestration Split Closeout

Date: 2026-05-17

Card: `VERIFIER-INTELLIGENCE-SPINE-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-intelligence-spine-orchestration-split-v1`

## What Changed

Moved the intelligence-spine orchestration layer from `scripts/foundation-verify.mjs` into `lib/foundation-intelligence-spine-verifier.js`.

The root verifier still gathers the live Foundation payloads, source text, and snapshots. The intelligence-spine module now owns the existing evaluator call, check aggregation, dogfood proof, and historical split self-check for this domain.

## Proof

- `lib/foundation-intelligence-spine-verifier.js` adds `evaluateFoundationIntelligenceSpineVerifierOrchestration()`.
- `scripts/process-verifier-intelligence-spine-orchestration-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects missing job ledger proof, missing retrieval tier guard, missing action-router approval gate, and synthesis evidence gaps.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationIntelligenceSpineVerifierOrchestration({ ... })`.
- `scripts/process-verifier-intelligence-spine-split-module-check.mjs` remains compatible with wrapper delegation.

## Expected Gates

```bash
node --check lib/foundation-intelligence-spine-verifier.js
node --check scripts/process-verifier-intelligence-spine-orchestration-split-check.mjs
node --check scripts/process-verifier-intelligence-spine-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-intelligence-spine-orchestration-split-check -- --json
npm run process:verifier-intelligence-spine-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-INTELLIGENCE-SPINE-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-INTELLIGENCE-SPINE-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-intelligence-spine-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-INTELLIGENCE-SPINE-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-INTELLIGENCE-SPINE-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-intelligence-spine-orchestration-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of intelligence jobs, atom spine, retrieval, synthesis facts, synthesis engine, action router, extraction runtime, surface trust, process hardening, process trust, runtime reliability, structural assurance, connector auth, route budgets, or Plan Critic scoring.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
