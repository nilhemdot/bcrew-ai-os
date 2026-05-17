# VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001 Plan

Card: `VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001`

## What

Move only the process/control governance verifier domain out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-process-control-governance.js`.

V1 is narrow: it includes Connector Routing Truth, process governance, readiness follow-up, guardrail closeout, and Foundation control-loop verifier checks. It does not include runtime reliability, module assurance, frontend/backend split assurance, source-contract registry, or connector auth work.

`scripts/foundation-verify.mjs` remains the orchestrator: it collects live data, imports the focused module, passes the existing verifier inputs through one evaluator call, and pushes returned checks into the canonical check list.

## Why

The root verifier is below the 10K emergency threshold, but the real clean target is under 5K. This sprint reduces the remaining monolith by a real domain boundary instead of moving an arbitrary tail for line count.

Operator value: Steve can keep using the real builder workflow without accepting a weaker verifier. The split keeps actual process governance, live backlog, DB, route, closeout, package script, and function path evidence intact while making the root easier to review. This unlocks better Foundation quality and speed because future work can inspect one focused process/control module instead of another long inline section.

## Acceptance Criteria

- `lib/foundation-verifier-process-control-governance.js` owns the process/control governance evaluator and dogfood proof.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierProcessControlGovernance({ ... })` and no longer contains the old inline Connector Routing Truth, process governance, readiness follow-up, guardrail closeout, or control-loop blocks.
- The focused proof calls the real `buildFoundationVerifierProcessControlGovernanceDogfoodProof()` function path.
- The focused proof must reject substring-only proof; marker checks can support artifact wiring, but they cannot be the behavior proof.
- Dogfood proof recreates the failure class and rejects hidden Connector Routing Truth, hidden process governance, hidden readiness follow-up, hidden guardrail closeout, hidden control-loop, and old-inline-predicate failures.
- `scripts/process-verifier-process-control-governance-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 8,940 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-process-control-governance-split-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing process-control modules: `lib/foundation-verifier-process-governance.js`, `lib/foundation-verifier-readiness-followup.js`, `lib/foundation-verifier-guardrail-closeouts.js`, and `lib/foundation-verifier-control-loop.js`.
- Existing docs and process records for Connector Routing Truth and the already-split process governance, readiness follow-up, guardrail closeout, and control-loop cards.
- Existing root verifier data collection and live payload fetches in `scripts/foundation-verify.mjs`.
- Existing closeout validation and Recent Builds metadata pattern in `lib/foundation-build-closeout-tightening-records.js`.
- Existing scripts and focused verifier split proof pattern from the sprint-gate and Source Once-Over progression split scripts.
- Existing live backlog and Current Sprint data for ownership checks; the proof can use historical closeout ownership after the active sprint moves on.
- Foundation main session owns this active sprint scope. Any hub, Harlan, Canva, Fal, voice, connector-auth, or side-lane work must stop-and-coordinate through main session approval before touching shared Foundation files, committing, pushing, or shipping.

Root invariant:

- The verifier must prove shipped process/control behavior through actual artifact, closeout, live backlog, DB, route, package script, and function-path evidence.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.
- The module boundary must preserve behavior; it is not a place to loosen old process governance checks.

Not next:

- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of process governance, readiness follow-up, guardrail closeout, control-loop, or Connector Routing Truth checks.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No runtime reliability, module assurance, backend/frontend split, source-contract, or health-surface extraction in this sprint.

Rollback or repair path:

- If focused proof or `foundation:verify` fails, keep the module boundary but repair the exact failing assertion or input handoff.
- If the module boundary itself is wrong, revert only this sprint's root delegation/module/doc additions before commit.
- Do not weaken checks into substring-only proof to make the split pass.

Gate decision:

- Gate decision tree uses static, focused, and full based on blast radius.
- Full gate is required because `scripts/foundation-verify.mjs`, `package.json`, and protected Foundation process docs change.
- Focused proof runs first to catch the exact verifier split failure mode quickly.
- Static syntax checks cover the changed code files.
- Full `process:foundation-ship` remains the final gate and keeps runtime proof bounded to the standard ship path.

## Risks

- Moving a large block can accidentally drop one input from the root-to-module handoff; `foundation:verify` and the focused proof catch that by executing the real evaluator.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-verifier-process-control-governance.js
node --check scripts/process-verifier-process-control-governance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-process-control-governance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001.json --closeoutKey=verifier-process-control-governance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001 --closeoutKey=verifier-process-control-governance-split-v1
npm run process:foundation-ship -- --card=VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001.json --closeoutKey=verifier-process-control-governance-split-v1 --commitRef=HEAD
```
