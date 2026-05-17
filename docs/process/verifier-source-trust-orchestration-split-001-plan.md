# VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001 Plan

Sprint: `verifier-source-trust-orchestration-split-2026-05-17`
Closeout key: `verifier-source-trust-orchestration-split-v1`

## Scope

Move source-trust orchestration out of `scripts/foundation-verify.mjs` and into `lib/foundation-source-trust-verifier.js`.

This card owns only the existing source-trust verifier domain:

- source contract, connector, grouped source system, KPI health, card/source reference trust, Phase C visibility, Data Sources UI, System Inventory, identity metadata, and source-registry proof rows;
- phase approval file lookup for the Phase C visibility card set;
- source-trust dogfood proof;
- historical `VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001` self-check;
- new `VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001` closeout self-check.

## Why

`scripts/foundation-verify.mjs` is below the 10K emergency line but still above the 5K architecture-risk line. Under 5K is the clean target. This split removes a real source-trust orchestration responsibility without using arbitrary tail extraction or weakening verifier semantics.

## Acceptance

- `lib/foundation-source-trust-verifier.js` exports `evaluateFoundationSourceTrustVerifierOrchestration`.
- `scripts/foundation-verify.mjs` delegates source-trust orchestration through the wrapper and keeps only the returned check push plus the returned `sourceTrustVerifier` value needed by downstream assurance.
- The root verifier no longer performs the Phase C approval lookup or calls `evaluateFoundationSourceTrustVerifier` directly.
- The historical source-trust split proof accepts wrapper delegation while still proving the extracted evaluator fails closed.
- The focused proof script is read-only and recreates the source-trust failure classes through dogfood fixtures.
- `foundation:verify` keeps the same source-trust PASS/FAIL rows.
- No active sprint overlay replacement.
- No arbitrary tail extraction.

## Dogfood

Dogfood proof recreates the failure class by feeding the source-trust module broken fixtures that must fail:

- missing working connector health;
- stale KPI health contract;
- missing card/source reference trust;
- substring-only Phase C coverage.

Compilation or substring presence alone is not accepted as proof.

## Out Of Scope

- source contract behavior changes;
- connector auth, paid calls, source extraction jobs, or live writes;
- Canva, Fal, ElevenLabs, voice, Harlan runtime, or hub feature work;
- changing active sprint truth;
- moving unrelated verifier domains such as runtime reliability, agent feedback, process trust, surface trust, operator budget, hub safety, or structural assurance.

## Proof Commands

```bash
node --check lib/foundation-source-trust-verifier.js
node --check scripts/process-verifier-source-trust-orchestration-split-check.mjs
node --check scripts/process-verifier-source-trust-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-source-trust-orchestration-split-check -- --json
npm run process:verifier-source-trust-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-trust-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-source-trust-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-trust-orchestration-split-v1 --commitRef=HEAD
```
