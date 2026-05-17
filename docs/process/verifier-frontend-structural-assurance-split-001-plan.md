# VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001 Plan

Card: `VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001`

## What

Move only the frontend structural assurance verifier domain out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-frontend-structural-assurance.js`.

V1 is narrow: it includes the existing frontend split assurance evaluator and its shipped-closeout proof. It does not include nightly audit triage, historical split closeout checks, runtime reliability, process hardening, source-contract registry, connector auth, or hub work.

`scripts/foundation-verify.mjs` remains the orchestrator: it collects live data, imports the focused module, passes the existing verifier inputs through one evaluator call, and pushes returned checks into the canonical check list.

## Why

The root verifier is below the 10K emergency threshold, but the real clean target is under 5K. This sprint reduces the remaining monolith by a real domain boundary instead of moving an arbitrary tail for line count.

Operator value: Steve can keep trusting the real builder workflow because frontend split assurance still executes through its real function path, live backlog, DB, closeout, package script, route, and artifact checks. This unlocks better Foundation quality and speed by moving another frontend structural proof cluster out of the root verifier without weakening behavior.

## Acceptance Criteria

- `lib/foundation-verifier-frontend-structural-assurance.js` owns the frontend structural assurance evaluator and dogfood proof.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierFrontendStructuralAssurance({ ... })` and no longer contains the old inline frontend split assurance call/check block.
- The focused proof calls the real `buildFoundationVerifierFrontendStructuralAssuranceDogfoodProof()` function path.
- The focused proof must reject substring-only proof; marker checks can support artifact wiring, but they cannot be the behavior proof.
- Dogfood proof recreates the failure class and rejects hidden frontend split assurance and old-inline-predicate failures.
- `scripts/process-verifier-frontend-structural-assurance-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 8,772 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-frontend-structural-assurance-split-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing frontend split assurance evaluator in `lib/foundation-verifier-frontend-split-assurance.js`.
- Existing docs and process records for `VERIFIER-FRONTEND-SPLIT-ASSURANCE-001`.
- Existing root verifier data collection and live payload fetches in `scripts/foundation-verify.mjs`.
- Existing closeout validation and Recent Builds metadata pattern in `lib/foundation-build-closeout-tightening-records.js`.
- Existing scripts and focused verifier split proof pattern from the structural-assurance core and process/control split scripts.
- Existing live backlog and Current Sprint data for ownership checks; the proof can use historical closeout ownership after the active sprint moves on.
- Foundation main session owns this active sprint scope. Any hub, Harlan, Canva, Fal, voice, connector-auth, or side-lane work must stop-and-coordinate through main session approval before touching shared Foundation files, committing, pushing, or shipping.

Root invariant:

- The verifier must prove shipped frontend structural assurance behavior through actual artifact, closeout, live backlog, DB, route, package script, and function-path evidence.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.
- The module boundary must preserve behavior; it is not a place to loosen frontend split checks.

Not next:

- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of frontend split assurance or any existing frontend split evaluator.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No historical split closeout, nightly audit triage, Phase G, readiness blocker, sprint-gate, Source Once-Over, process/control, runtime reliability, source-contract, or health-surface extraction in this sprint.

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

- Moving the frontend structural assurance block can accidentally drop one input from the root-to-module handoff; `foundation:verify` and the focused proof catch that by executing the real evaluator.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-verifier-frontend-structural-assurance.js
node --check scripts/process-verifier-frontend-structural-assurance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-frontend-structural-assurance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-frontend-structural-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001 --closeoutKey=verifier-frontend-structural-assurance-split-v1
npm run process:foundation-ship -- --card=VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-frontend-structural-assurance-split-v1 --commitRef=HEAD
```
