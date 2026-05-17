# VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001 Plan

Sprint: `verifier-runtime-reliability-orchestration-split-2026-05-17`
Closeout key: `verifier-runtime-reliability-orchestration-split-v1`

## Scope

Move runtime-reliability orchestration out of `scripts/foundation-verify.mjs` and into `lib/foundation-runtime-reliability-verifier.js`.

This card owns only the existing runtime-reliability verifier domain:

- source outage boundary, connector uptime, runtime activation, report-only morning health, Plan Critic architecture rules, Foundation Hub performance budgets, full diagnostics budgets, ship preflight, ClickUp verifier health, Runtime Supervisor, worker reliability, first jobs, and Runtime Health command-read proof;
- runtime-reliability evaluator call and check aggregation;
- runtime-reliability dogfood proof;
- historical `VERIFIER-RUNTIME-RELIABILITY-SPLIT-001` self-check;
- new `VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001` closeout self-check;
- returned Plan Critic architectural proof artifact for downstream process-hardening assurance.

## Why

`scripts/foundation-verify.mjs` remains above the 5K architecture-risk line. This split removes a real reliability orchestration responsibility without arbitrary tail extraction and keeps the root verifier moving toward orchestration only.

## Acceptance

- `lib/foundation-runtime-reliability-verifier.js` exports `evaluateFoundationRuntimeReliabilityVerifierOrchestration`.
- `scripts/foundation-verify.mjs` delegates runtime-reliability orchestration through the wrapper.
- The root verifier still receives `planCriticArchitecturalRulesProof` for downstream process-hardening checks.
- The historical runtime-reliability split proof accepts wrapper delegation while still proving the extracted evaluator fails closed.
- The focused proof script is read-only and recreates runtime-reliability failures through dogfood fixtures.
- `foundation:verify` keeps the same runtime-reliability PASS/FAIL rows.
- No active sprint overlay replacement.
- No arbitrary tail extraction.

## Dogfood

Dogfood proof recreates the failure class by feeding the runtime-reliability module broken fixtures that must fail:

- missing source outage boundary proof;
- missing operating reliability status;
- missing Runtime Supervisor service proof;
- missing Runtime Health command read;
- missing Plan Critic architecture dogfood;
- oversized Foundation Hub payload;
- missing ship preflight wiring;
- missing ClickUp slow-budget proof.

Compilation or substring presence alone is not accepted as proof.

## Out Of Scope

- runtime behavior changes;
- process supervisor, worker, source extraction, or scheduled job changes;
- connector auth, paid calls, Canva, Fal, ElevenLabs, voice, Harlan runtime, or hub feature work;
- changing active sprint truth;
- moving unrelated verifier domains such as agent feedback, process trust, recent builds, source contracts, current sprint, frontend structural assurance, or build-log registry assurance.

## Proof Commands

```bash
node --check lib/foundation-runtime-reliability-verifier.js
node --check scripts/process-verifier-runtime-reliability-orchestration-split-check.mjs
node --check scripts/process-verifier-runtime-reliability-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-runtime-reliability-orchestration-split-check -- --json
npm run process:verifier-runtime-reliability-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-runtime-reliability-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-runtime-reliability-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-runtime-reliability-orchestration-split-v1 --commitRef=HEAD
```
