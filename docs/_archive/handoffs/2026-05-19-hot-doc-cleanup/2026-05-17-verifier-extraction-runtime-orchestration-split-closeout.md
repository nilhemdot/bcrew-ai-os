# Verifier Extraction Runtime Orchestration Split Closeout

Date: 2026-05-17

Card: `VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-extraction-runtime-orchestration-split-v1`

## What Changed

Moved the extraction-runtime orchestration layer from `scripts/foundation-verify.mjs` into `lib/foundation-extraction-runtime-verifier.js`.

The root verifier still gathers the live Foundation payloads, runtime gap data, and source text. The extraction-runtime module now owns the existing evaluator call, check aggregation, dogfood proof, and historical split self-check for this domain.

## Proof

- `lib/foundation-extraction-runtime-verifier.js` adds `evaluateFoundationExtractionRuntimeVerifierOrchestration()`.
- `scripts/process-verifier-extraction-runtime-orchestration-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects missing worker reapers, corpus quota controls, Drive extraction support, LLM provenance, extract-retire coverage, and extract-retry coverage.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationExtractionRuntimeVerifierOrchestration({ ... })`.
- `scripts/process-verifier-extraction-runtime-split-module-check.mjs` remains compatible with wrapper delegation.

## Expected Gates

```bash
node --check lib/foundation-extraction-runtime-verifier.js
node --check scripts/process-verifier-extraction-runtime-orchestration-split-check.mjs
node --check scripts/process-verifier-extraction-runtime-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-extraction-runtime-orchestration-split-check -- --json
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-extraction-runtime-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-extraction-runtime-orchestration-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of worker reaping, source crawl ledger proof, target runner controls, extraction quota missions, Drive/Gmail/video extraction support, shared-comms LLM provenance, stale LLM call handling, extraction retry, extraction retire, surface trust, process hardening, process trust, runtime reliability, structural assurance, connector auth, route budgets, or Plan Critic scoring.
- No connector auth, source extraction job implementation, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
