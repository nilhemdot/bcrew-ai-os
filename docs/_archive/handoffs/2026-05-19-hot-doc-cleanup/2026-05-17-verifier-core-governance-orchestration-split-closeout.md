# Verifier Core Governance Orchestration Split Closeout

Date: 2026-05-17

Card: `VERIFIER-CORE-GOVERNANCE-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-core-governance-orchestration-split-v1`

## What Changed

Moved the core-governance orchestration layer from `scripts/foundation-verify.mjs` into `lib/foundation-core-governance-verifier.js`.

The root verifier still gathers the live Foundation payloads and source text. The core-governance module now owns the existing evaluator call, check aggregation, dogfood proof, historical split self-check, and the promoted shared-comms/LLM/source-crawl safety predicates for this domain.

## Proof

- `lib/foundation-core-governance-verifier.js` adds `evaluateFoundationCoreGovernanceVerifierOrchestration()`.
- `scripts/process-verifier-core-governance-orchestration-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects direct host calls, ungated routes, host-header bypass, FUB mutation opening, invalid DB source references, weak backlog closeout enforcement, unsafe source-ID contracts, unsafe shared-comms apply, runnable-route bypass, and unsafe source-crawl ledger fixtures.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationCoreGovernanceVerifierOrchestration({ ... })`.

## Expected Gates

```bash
node --check lib/foundation-core-governance-verifier.js
node --check scripts/process-verifier-core-governance-orchestration-split-check.mjs
node --check scripts/process-verifier-core-governance-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-core-governance-orchestration-split-check -- --json
npm run process:verifier-core-governance-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-CORE-GOVERNANCE-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CORE-GOVERNANCE-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-core-governance-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-CORE-GOVERNANCE-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CORE-GOVERNANCE-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-core-governance-orchestration-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of auth gates, source/DB constraints, direct host-call boundaries, shared-comms apply posture, LLM routing, source-crawl ledger behavior, done-card closeout enforcement, intelligence spine, extraction runtime, process hardening, process trust, runtime reliability, structural assurance, connector auth, route budgets, or Plan Critic scoring.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
