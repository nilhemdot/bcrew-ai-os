# VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001 Plan

Sprint: `verifier-recent-builds-orchestration-split-2026-05-17`
Closeout key: `verifier-recent-builds-orchestration-split-v1`

## Scope

Move Recent Builds closeout verifier orchestration out of `scripts/foundation-verify.mjs` and into `lib/foundation-recent-builds-verifier.js`.

This card owns only the existing Recent Builds closeout verifier domain:

- closeout schema validation;
- build-log grouping and operator-readable closeout exposure;
- proof-command and where-it-lives coverage for expected historical closeouts;
- Recent Builds closeout dogfood proof;
- wrapper-compatible historical `VERIFIER-RECENT-BUILDS-CLOSEOUT-SPLIT-001` proof;
- new `VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001` closeout self-check.

## Why

`scripts/foundation-verify.mjs` is still above the 5K architecture-risk line. This split removes a real Recent Builds orchestration responsibility without arbitrary tail extraction and keeps Recent Builds trust proof close to the Recent Builds verifier module.

## Acceptance

- `lib/foundation-recent-builds-verifier.js` exports `evaluateFoundationRecentBuildsVerifierOrchestration`.
- `scripts/foundation-verify.mjs` delegates Recent Builds closeout orchestration through the wrapper.
- The root verifier no longer calls `evaluateFoundationRecentBuildsVerifier` directly for this domain.
- The historical Recent Builds closeout split proof accepts wrapper delegation while still proving the extracted evaluator fails closed.
- The focused proof script is read-only and recreates Recent Builds closeout failure classes through dogfood fixtures.
- `foundation:verify` keeps the same Recent Builds PASS/FAIL rows and adds the new orchestration closeout proof.
- No active sprint overlay replacement.
- No arbitrary tail extraction.

## Dogfood

Dogfood proof recreates the failure class by feeding the Recent Builds verifier broken fixtures that must fail:

- missing proof commands on a required Recent Builds closeout;
- invalid closeout schema validation;
- missing `whereItLives` metadata on a closeout.

Compilation or substring presence alone is not accepted as proof.

## Out Of Scope

- Recent Builds UI changes;
- build-log route behavior changes;
- closeout schema changes;
- app route, DB, source extraction, connector auth, paid call, Canva, Fal, ElevenLabs, voice, Harlan runtime, or hub feature work;
- changing active sprint truth;
- moving unrelated verifier domains such as Agent Feedback, source contracts, process trust, runtime reliability, structural assurance, or follow-up backlog assurance.

## Proof Commands

```bash
node --check lib/foundation-recent-builds-verifier.js
node --check scripts/process-verifier-recent-builds-orchestration-split-check.mjs
node --check scripts/process-verifier-recent-builds-closeout-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-recent-builds-orchestration-split-check -- --json
npm run process:verifier-recent-builds-closeout-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-recent-builds-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-recent-builds-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-recent-builds-orchestration-split-v1 --commitRef=HEAD
```
