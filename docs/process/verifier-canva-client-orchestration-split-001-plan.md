# VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001 Plan

Sprint: `verifier-canva-client-orchestration-split-2026-05-17`
Closeout key: `verifier-canva-client-orchestration-split-v1`

## Scope

Move Canva client verifier orchestration out of `scripts/foundation-verify.mjs` and into `lib/foundation-canva-client-verifier.js`.

This card owns only the existing Canva client verifier domain:

- governed read-only Canva client access;
- refresh-token and OAuth bootstrap guardrails;
- official read-plan evidence for Canva Connect read endpoints;
- no-upload/no-export/no-design-creation proof;
- Canva client dogfood proof;
- historical `VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001` self-check;
- new `VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001` closeout self-check.

## Why

`scripts/foundation-verify.mjs` is below the 10K emergency line but still above the 5K architecture-risk line. Under 5K is the clean target. This split removes a real Canva client orchestration responsibility without arbitrary tail extraction and keeps the root verifier moving toward orchestration only.

## Acceptance

- `lib/foundation-canva-client-verifier.js` exports `evaluateFoundationCanvaClientVerifierOrchestration`.
- `scripts/foundation-verify.mjs` delegates Canva client orchestration through the wrapper.
- The root verifier no longer calls the Canva evaluator, dogfood proof, or split self-check directly.
- The historical Canva client split proof accepts wrapper delegation while still proving the extracted evaluator fails closed.
- The focused proof script is read-only and recreates the Canva client failure classes through dogfood fixtures.
- `foundation:verify` keeps the same Canva client PASS/FAIL rows.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- No Canva writes.

## Dogfood

Dogfood proof recreates the failure class by feeding the Canva client module broken fixtures that must fail:

- missing `CANVA_REFRESH_TOKEN`;
- missing rotation-safe OAuth bootstrap evidence;
- exposed Canva write/upload wrapper;
- missing official read-plan evidence for `/brand-templates`.

Compilation or substring presence alone is not accepted as proof.

## Out Of Scope

- Canva writes, uploads, exports, design creation, asset library sync, or folder cleanup;
- Canva live API calls or token rotation;
- Marketing Video Lab, Fal, ElevenLabs, voice, Harlan runtime, or hub feature work;
- connector auth, paid calls, source extraction jobs, or live writes;
- changing active sprint truth;
- moving unrelated verifier domains such as source trust, runtime reliability, agent feedback, process trust, recent builds, current sprint, source contracts, or frontend structural assurance.

## Proof Commands

```bash
node --check lib/foundation-canva-client-verifier.js
node --check scripts/process-verifier-canva-client-orchestration-split-check.mjs
node --check scripts/process-verifier-canva-client-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-canva-client-orchestration-split-check -- --json
npm run process:verifier-canva-client-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-canva-client-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-canva-client-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-canva-client-orchestration-split-v1 --commitRef=HEAD
```
