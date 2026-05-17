# VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001 Plan

Sprint: `verifier-source-contract-orchestration-split-2026-05-17`
Closeout key: `verifier-source-contract-orchestration-split-v1`

## What

Move Source Contract verifier orchestration out of `scripts/foundation-verify.mjs` and into `lib/foundation-source-contract-verifier.js`.

This card owns only the existing Source Contract verifier domain:

- signed-off Owners, Finance, and Freedom source contract checks;
- `docs/source-registry.md` and `docs/rebuild/current-state.md` source-boundary checks;
- live source-contract registry snapshot lookup;
- source-contract registry dogfood proof;
- scalar source-ID FK migration snapshot and dogfood proof;
- array-backed source-ID provenance design snapshot and dogfood proof;
- wrapper-compatible historical `VERIFIER-MONOLITH-SPLIT-CONTINUE-002` proof;
- new `VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001` closeout self-check.

`scripts/foundation-verify.mjs` is still above the 5K architecture-risk line. Source Contract verification is a real domain boundary, and its registry/source-ID proof setup was still root-owned. This split keeps the root as orchestration and moves the source-contract proof setup next to the Source Contract verifier module.

Main-session approved coordination owns these shared Foundation files. If a hub or side lane needs any touched shared files, it must return to main session before commit or push. The active sprint overlay stays untouched.

## Why

Steve needs quality and speed in the real Foundation workflow: Source Contract proof should stay trustworthy without forcing the operator to audit a growing verifier monolith. This unlocks cleaner source governance and keeps Source Contract/source-ID proof close to the module that owns the behavior.

## Acceptance Criteria

- `lib/foundation-source-contract-verifier.js` exports `evaluateFoundationSourceContractVerifierOrchestration`.
- `scripts/foundation-verify.mjs` delegates Source Contract checks through the wrapper.
- The root verifier no longer owns source-contract registry snapshot setup, scalar source-ID snapshot setup, array provenance setup, direct evaluator call, registry/source-ID dogfood setup, or direct check aggregation.
- The historical Source Contract module split proof accepts wrapper delegation while still proving the extracted evaluator fails closed.
- The focused proof script is read-only and recreates Source Contract verifier failure classes through dogfood fixtures.
- `foundation:verify` keeps the same Source Contract PASS/FAIL rows and adds the new orchestration closeout proof.
- No active sprint overlay replacement.
- No arbitrary tail extraction.

## Definition Of Done

- Focused proof passes with `npm run process:verifier-source-contract-orchestration-split-check -- --json`.
- Historical proof passes with `npm run process:verifier-source-contracts-module-check -- --json`.
- Backlog hygiene passes.
- `foundation:verify` passes.
- `process:ship-check` passes before commit with live verify skipped only because `process:foundation-ship` runs final live verify.
- Commit includes only this Source Contract split and ignores unrelated local files.
- `process:foundation-ship` passes on committed HEAD.
- Commit is pushed.

## Details

Reuse existing code/docs/scripts/backlog truth:

- existing `evaluateFoundationSourceContractVerifier` and `buildFoundationSourceContractVerifierDogfoodProof`;
- existing DB reads from `getSourceContractRegistrySnapshot`, `getSourceIdScalarFkMigrationSnapshot`, and `evaluateSourceIdArrayProvenanceDesign`;
- existing source-contract registry, scalar FK, and array provenance dogfood helpers;
- existing historical Source Contract module proof script;
- existing plan approval integrity verifier;
- existing Foundation build closeout registry and live Backlog proof.

Split plan: the root verifier loses the Source Contract setup block and becomes a thin wrapper with only a wrapper call plus returned check aggregation. No new verifier responsibility is added to the 5K-plus root file; responsibility moves out of that file.

Operator value: Steve should be able to trust Source Contract/source-ID proof without the root verifier growing into a second source-registry implementation.

Gate decision tree: static checks run first, focused proof runs second, and the full `process:foundation-ship` gate is required because the blast radius touches `scripts/foundation-verify.mjs`, package scripts, proof scripts, closeout records, and live backlog proof. The focused proof stays fast enough to run by default, and the full ship target remains under the existing five-minute Foundation ship budget.

## Risks

- A wrapper could hide a missing registry/source-ID failure. Dogfood proof must run the same evaluator with missing registry, scalar FK, and array provenance fixtures that fail closed.
- A root-only migration could keep registry/source-ID dogfood setup in `scripts/foundation-verify.mjs`. Orchestration dogfood must reject old direct root patterns.
- A line-count-only extraction could cut code without a domain boundary. This plan limits movement to Source Contract orchestration only.
- A historical closeout could drift if the old module proof only accepts direct root delegation. The historical proof must accept wrapper delegation while still proving the Source Contract evaluator fails closed.
- A process drift could replace the active sprint overlay. This plan explicitly rejects active sprint overlay replacement and proves historical ownership through live Backlog, Plan Critic, and closeout records.

## Tests

Dogfood proof recreates the failure class by feeding the Source Contract verifier broken fixtures that must fail:

- missing Owners signoff;
- missing signed-off Owners tab coverage;
- stale source registry row;
- stale current-state mirror boundary;
- missing DB source-contract registry proof;
- missing scalar source-ID FK enforcement;
- missing array-backed source provenance design.

The orchestration dogfood also rejects migration-specific failures:

- missing wrapper;
- missing root delegation;
- old direct root call still present;
- registry/source-ID dogfood still root-owned;
- missing closeout;
- missing focused proof registration;
- no line-count reduction.

Compilation or substring presence alone is not accepted as proof.

## Out Of Scope

- source contract status changes;
- live source registry schema changes;
- scalar source-ID FK schema mutation;
- array-backed source-ID schema mutation;
- Data Sources UI changes;
- source extraction job implementation;
- app route, DB write behavior, connector auth, paid call, Canva, Fal, ElevenLabs, voice, Harlan runtime, or hub feature work;
- changing active sprint truth;
- moving unrelated verifier domains such as source trust, process trust, Agent Feedback, runtime reliability, Recent Builds, structural assurance, or follow-up backlog assurance.

## Proof Commands

```bash
node --check lib/foundation-source-contract-verifier.js
node --check scripts/process-verifier-source-contract-orchestration-split-check.mjs
node --check scripts/process-verifier-source-contracts-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-source-contract-orchestration-split-check -- --json
npm run process:verifier-source-contracts-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-contract-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-source-contract-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-contract-orchestration-split-v1 --commitRef=HEAD
```
