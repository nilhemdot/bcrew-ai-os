# VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001 Plan

Sprint: `verifier-process-control-orchestration-split-2026-05-17`
Closeout key: `verifier-process-control-orchestration-split-v1`

## What

Move Process Control verifier orchestration input wiring out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-process-control-governance.js`.

This card owns only the existing Process Control verifier domain:

- Connector Routing Truth sprint proof;
- process governance proof;
- readiness follow-up proof;
- guardrail closeout proof;
- control-loop proof;
- wrapper-compatible historical `VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001` proof;
- new `VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001` bundled-domain self-check.

`scripts/foundation-verify.mjs` is still above the 5K architecture-risk line. Process Control is a real verifier domain boundary, and its root call still carried hundreds of flat inputs that belong beside the Process Control governance evaluator. This split keeps the root as orchestration and moves the input normalization into the domain module.

Main-session approved coordination owns these shared Foundation files. If a hub or side lane needs any touched shared files, it must return to main session before commit or push. No active sprint overlay replacement.

## Why

Steve needs speed with quality. The useful operator value is that Steve and the team can trust Process Control proof still catches hidden connector routing, process governance, readiness, guardrail, and control-loop failures without asking him to inspect a 5K-plus root verifier call block, which unlocks safer real workflow momentum after the Foundation verifier shrinks.

Under 5K remains the clean target. This sprint is one coherent Process Control domain split on the way there, not a random tail extraction.

## Acceptance Criteria

- `lib/foundation-verifier-process-control-governance.js` exports `evaluateFoundationVerifierProcessControlGovernanceOrchestration`.
- `scripts/foundation-verify.mjs` delegates Process Control checks through the orchestration wrapper.
- The root verifier passes bundled domain inputs instead of carrying every Process Control input as a flat call.
- The historical Process Control governance split proof accepts wrapper delegation while still proving the extracted evaluator fails closed.
- The focused proof script is read-only and recreates Process Control governance and orchestration migration failure classes through dogfood fixtures.
- `foundation:verify` keeps the same Process Control PASS/FAIL rows and adds the new orchestration closeout proof.
- No active sprint overlay replacement.
- No arbitrary tail extraction.

## Definition Of Done

- Focused proof passes with `npm run process:verifier-process-control-orchestration-split-check -- --json`.
- Historical proof passes with `npm run process:verifier-process-control-governance-split-check -- --json`.
- Backlog hygiene passes.
- `foundation:verify` passes.
- `process:ship-check` passes before commit with live verify skipped only because `process:foundation-ship` runs final live verify.
- Commit includes only this Process Control split and ignores unrelated local files.
- `process:foundation-ship` passes on committed HEAD.
- Commit is pushed.

## Details

Reuse existing code/docs/scripts/backlog truth:

- existing `evaluateFoundationVerifierProcessControlGovernance`;
- existing `buildFoundationVerifierProcessControlGovernanceDogfoodProof`;
- existing nested process governance, readiness follow-up, guardrail closeout, and control-loop evaluators;
- existing historical Process Control governance proof script;
- existing plan approval integrity verifier;
- existing Foundation build closeout registry and live Backlog proof;
- existing live Plan Critic run table.

Split plan: the root verifier loses the long Process Control flat evaluator input block and becomes a thin wrapper call with bundled domain inputs plus returned check aggregation. No new verifier responsibility is added to the 5K-plus root file; responsibility moves out of that file.

Dogfood proof recreates the failure class by making the orchestration fixture reject missing wrapper delegation, unsupported bundle inputs, an old direct root evaluator call, missing closeout, missing focused proof registration, and no root line-count reduction.

Gate decision tree: static checks run first, focused proof runs second, and the full `process:foundation-ship` gate is required because the blast radius touches `scripts/foundation-verify.mjs`, package scripts, proof scripts, closeout records, and live backlog proof. The focused proof stays fast enough to run by default, and the full ship target remains under the existing five-minute Foundation ship budget.

## Risks

- A wrapper could hide a missing Process Control governance failure. Dogfood proof must still run the existing Process Control dogfood that rejects connector routing, process governance, readiness follow-up, guardrail closeout, control-loop, and old-inline failures.
- A root-only migration could keep the old direct Process Control evaluator call in `scripts/foundation-verify.mjs`. Orchestration dogfood must reject old direct root patterns.
- A line-count-only extraction could cut code without a domain boundary. This plan limits movement to Process Control orchestration only.
- A historical closeout could drift if the old module proof only accepts direct root delegation. The historical proof must accept wrapper delegation while still proving the Process Control evaluator fails closed.
- A process drift could replace the active sprint overlay. This plan explicitly rejects active sprint overlay replacement and proves historical ownership through live Backlog, Plan Critic, and closeout records.

Repair path: if any focused proof, backlog hygiene, foundation verify, ship check, or foundation ship gate fails, leave the card out of `done`, fix the Process Control split in place, and rerun the full gate before commit or push.

## Tests

Dogfood proof recreates the failure class by feeding the Process Control verifier broken fixtures that must fail:

- hidden Connector Routing Truth gap;
- hidden process governance gap;
- hidden readiness follow-up gap;
- hidden guardrail closeout gap;
- hidden control-loop gap;
- old inline predicate still present.

The orchestration dogfood also rejects migration-specific failures:

- missing wrapper;
- missing bundled domain inputs;
- old direct root call still present;
- missing closeout;
- missing focused proof registration;
- no line-count reduction.

Compilation or substring presence alone is not accepted as proof.

## Out Of Scope

- Process Control card status changes outside this split card;
- connector routing truth behavior changes;
- process governance, readiness follow-up, guardrail closeout, or control-loop behavior changes;
- app route, DB write behavior, connector auth, paid call, Canva, Fal, ElevenLabs, voice, Harlan runtime, or hub feature work;
- changing active sprint truth;
- moving unrelated verifier domains such as runtime reliability, structural assurance, source trust, source contracts, Agent Feedback, Recent Builds, or follow-up backlog assurance.

## Proof Commands

```bash
node --check lib/foundation-verifier-process-control-governance.js
node --check scripts/process-verifier-process-control-orchestration-split-check.mjs
node --check scripts/process-verifier-process-control-governance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-process-control-orchestration-split-check -- --json
npm run process:verifier-process-control-governance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-control-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-process-control-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-control-orchestration-split-v1 --commitRef=HEAD
```
