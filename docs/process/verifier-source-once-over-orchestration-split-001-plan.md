# VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001 Plan

Sprint: `verifier-source-once-over-orchestration-split-2026-05-17`
Closeout key: `verifier-source-once-over-orchestration-split-v1`

## What

Move Source Once-Over verifier orchestration out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-source-once-over-progression.js`.

This card owns only the existing Source Once-Over verifier domain:

- Source Once-Over progression checks for the already-closed source follow-up cards;
- source coverage, source extraction coverage, source maturity grid, source coverage closeout, and verification run completion proof;
- strategy hub meeting-ready, avatar import, brand stack, marketing source map, per-user changelog, tier behavioral completion, and auto-deploy rollback proof wiring;
- approval, plan-review, script, source, synthetic, build-log, and closeout evidence already used by the Source Once-Over progression evaluator;
- wrapper-compatible historical `VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001` proof;
- new `VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001` bundled-domain self-check.

`scripts/foundation-verify.mjs` is still above the 5K architecture-risk line. Source Once-Over progression is a real verifier domain boundary, and its flat root call still carried per-card inputs that belong beside the Source Once-Over progression evaluator. This split keeps the root as orchestration and moves the input normalization into the domain module.

Main-session approved coordination owns these shared Foundation files. If a hub or side lane needs any touched shared files, it must return to main session before commit or push. No active sprint overlay replacement.

## Why

Steve needs the Foundation verifier to keep getting smaller without trading real proof for line-count theater. Source Once-Over proof spans many already-shipped source follow-up cards; bundling that domain next to the Source Once-Over evaluator makes the verifier easier to audit while preserving the same fail-closed checks.

Under 5K remains the clean target. This sprint is one coherent Source Once-Over domain split on the way there, not a random tail extraction.

## Acceptance Criteria

- `lib/foundation-verifier-source-once-over-progression.js` exports `evaluateFoundationVerifierSourceOnceOverProgressionOrchestration`.
- `scripts/foundation-verify.mjs` delegates Source Once-Over checks through the orchestration wrapper.
- The root verifier passes bundled domain inputs instead of carrying every Source Once-Over per-card input as a flat call.
- The historical Source Once-Over progression split proof accepts wrapper delegation while still proving the extracted evaluator fails closed.
- The focused proof script is read-only and recreates Source Once-Over progression and orchestration migration failure classes through dogfood fixtures.
- `foundation:verify` keeps the same Source Once-Over PASS/FAIL rows and adds the new orchestration closeout proof.
- No active sprint overlay replacement.
- No arbitrary tail extraction.

## Definition Of Done

- Focused proof passes with `npm run process:verifier-source-once-over-orchestration-split-check -- --json`.
- Historical proof passes with `npm run process:verifier-source-once-over-progression-split-check -- --json`.
- Backlog hygiene passes.
- `foundation:verify` passes.
- `process:ship-check` passes before commit with live verify skipped only because `process:foundation-ship` runs final live verify.
- Commit includes only this Source Once-Over split and ignores unrelated local files.
- `process:foundation-ship` passes on committed HEAD.
- Commit is pushed.

## Details

Reuse existing code/docs/scripts/backlog truth:

- existing `evaluateFoundationVerifierSourceOnceOverProgression`;
- existing `buildFoundationVerifierSourceOnceOverProgressionDogfoodProof`;
- existing approval, plan-review, source, synthetic, and build-log objects already prepared by the root verifier;
- existing historical Source Once-Over progression proof script;
- existing plan approval integrity verifier;
- existing Foundation build closeout registry and live Backlog proof;
- existing live Plan Critic run table.

Split plan: the root verifier loses the long Source Once-Over flat evaluator input block and becomes a thin wrapper call with bundled domain inputs plus returned check aggregation. No new verifier responsibility is added to the 5K-plus root file; responsibility moves out of that file.

Dogfood proof recreates the failure class by making the orchestration fixture reject missing wrapper delegation, unsupported bundle inputs, an old direct root evaluator call, missing closeout, missing focused proof registration, and no root line-count reduction.

Steve needs speed with quality. The useful operator value is that Steve and the team can trust Source Once-Over follow-up proof still catches hidden source-coverage and progression failures without asking him to manually inspect a 5K-plus root verifier call block, which unlocks safer real workflow momentum after the Foundation verifier shrinks.

Gate decision tree: static checks run first, focused proof runs second, and the full `process:foundation-ship` gate is required because the blast radius touches `scripts/foundation-verify.mjs`, package scripts, proof scripts, closeout records, and live backlog proof. The focused proof stays fast enough to run by default, and the full ship target remains under the existing five-minute Foundation ship budget.

## Risks

- A wrapper could hide a missing Source Once-Over progression failure. Dogfood proof must still run the existing Source Once-Over progression dogfood that rejects hidden strategy meeting, avatar import, source coverage, marketing brand, verification decision, and Foundation UI completion gaps.
- A root-only migration could keep the old direct Source Once-Over evaluator call in `scripts/foundation-verify.mjs`. Orchestration dogfood must reject old direct root patterns.
- A line-count-only extraction could cut code without a domain boundary. This plan limits movement to Source Once-Over progression orchestration only.
- A historical closeout could drift if the old module proof only accepts direct root delegation. The historical proof must accept wrapper delegation while still proving the Source Once-Over evaluator fails closed.
- A process drift could replace the active sprint overlay. This plan explicitly rejects active sprint overlay replacement and proves historical ownership through live Backlog, Plan Critic, and closeout records.

Repair path: if any focused proof, backlog hygiene, foundation verify, ship check, or foundation ship gate fails, leave the card out of `done`, fix the Source Once-Over split in place, and rerun the full gate before commit or push.

## Tests

Dogfood proof recreates the failure class by feeding the Source Once-Over verifier broken fixtures that must fail:

- hidden Strategy Hub meeting-ready gap;
- hidden avatar import gap;
- hidden source coverage gap;
- hidden marketing and brand-source gap;
- hidden verification decision gap;
- hidden Foundation UI completion gap.

The orchestration dogfood also rejects migration-specific failures:

- missing wrapper;
- missing bundled domain inputs;
- old direct root call still present;
- missing closeout;
- missing focused proof registration;
- no line-count reduction.

Compilation or substring presence alone is not accepted as proof.

## Out Of Scope

- Source Once-Over card status changes outside this split card;
- source coverage, source extraction, source maturity, or verification run behavior changes;
- live source registry schema changes;
- source extraction job implementation;
- app route, DB write behavior, connector auth, paid call, Canva, Fal, ElevenLabs, voice, Harlan runtime, or hub feature work;
- changing active sprint truth;
- moving unrelated verifier domains such as source trust, source contracts, process trust, Agent Feedback, runtime reliability, Recent Builds, structural assurance, or follow-up backlog assurance.

## Proof Commands

```bash
node --check lib/foundation-verifier-source-once-over-progression.js
node --check scripts/process-verifier-source-once-over-orchestration-split-check.mjs
node --check scripts/process-verifier-source-once-over-progression-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-source-once-over-orchestration-split-check -- --json
npm run process:verifier-source-once-over-progression-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-once-over-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-source-once-over-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-once-over-orchestration-split-v1 --commitRef=HEAD
```
