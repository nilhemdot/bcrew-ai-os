# VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001 Plan

Card: `VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001`

## What

Move only the historical verifier split closeout assertion domain out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-historical-split-closeouts.js`.

V1 is narrow: it includes the shipped split closeout assertions for Phase G operator closeout, readiness blocker closeout, sprint gate progression, and Recent Builds closeout verifier splits. It does not move the underlying Phase G, readiness blocker, sprint-gate, or Recent Builds evaluators; those remain called by the root verifier as orchestration.

`scripts/foundation-verify.mjs` remains the orchestrator: it runs the existing evaluator modules, imports the focused historical closeouts module, passes the existing verifier results and source inputs through one evaluator call, and pushes returned checks into the canonical check list.

## Why

The root verifier is below the 10K emergency threshold, but the real clean target is under 5K. This sprint reduces the remaining monolith by a real domain boundary instead of moving an arbitrary tail for line count.

Operator value: Steve and the team can keep trusting the real builder workflow because previous verifier splits stay enforced through live backlog, closeout, package script, artifact, and dogfood proof. This unlocks better Foundation speed and quality by removing a dense historical closeout assertion cluster from the root verifier without weakening the shipped split checks.

## Acceptance Criteria

- `lib/foundation-verifier-historical-split-closeouts.js` owns the historical split closeout evaluator and dogfood proof.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierHistoricalSplitCloseouts({ ... })` and no longer contains the old inline Phase G, readiness blocker, sprint-gate, and Recent Builds split closeout assertion block.
- The underlying Phase G, readiness blocker, sprint-gate, and Recent Builds evaluators still run from root orchestration before the historical closeout module checks their summaries and artifacts.
- The focused proof calls the real `buildFoundationVerifierHistoricalSplitCloseoutsDogfoodProof()` function path.
- The focused proof must reject substring-only proof; marker checks can support artifact wiring, but they cannot be the behavior proof.
- Dogfood proof recreates the failure class and rejects hidden Phase G closeout, hidden readiness blocker closeout, hidden sprint gate progression, hidden Recent Builds closeout, and old-inline-predicate failures.
- `scripts/process-verifier-historical-split-closeouts-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, underlying evaluator calls, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 8,759 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-historical-split-closeouts-split-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing Phase G operator closeout evaluator and dogfood in `lib/foundation-verifier-phase-g-operator-closeout.js`.
- Existing readiness blocker closeout evaluator and dogfood in `lib/foundation-verifier-readiness-blocker-closeout.js`.
- Existing sprint gate progression evaluator and dogfood in `lib/foundation-verifier-sprint-gate-progression.js`.
- Existing Recent Builds verifier and dogfood in `lib/foundation-recent-builds-verifier.js`.
- Existing root verifier data collection and live payload fetches in `scripts/foundation-verify.mjs`.
- Existing closeout validation and Recent Builds metadata pattern in `lib/foundation-build-closeout-tightening-records.js`.
- Existing focused verifier split proof pattern from the frontend structural assurance and process/control split scripts.
- Existing live backlog and Current Sprint data for ownership checks; the proof can use historical closeout ownership after the active sprint moves on.
- Foundation main session owns this active sprint scope. Any hub, Harlan, Canva, Fal, voice, connector-auth, or side-lane work must stop-and-coordinate through main session approval before touching shared Foundation files, committing, pushing, or shipping.

Root invariant:

- The verifier must prove shipped historical split closeout behavior through actual artifact, closeout, live backlog, package script, source module, and function-path evidence.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.
- The module boundary must preserve behavior; it is not a place to loosen historical split closeout checks.

Not next:

- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of Phase G, readiness blocker, sprint gate, Recent Builds, or any existing evaluator.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No nightly audit triage, frontend split assurance, Source Once-Over, process/control, runtime reliability, source-contract, health-surface, connector, or UI extraction in this sprint.

Rollback or repair path:

- If focused proof or `foundation:verify` fails, keep the module boundary but repair the exact failing assertion or input handoff.
- If the module boundary itself is wrong, revert only this sprint's root delegation/module/doc additions before commit.
- Do not weaken checks into substring-only proof to make the split pass.

Gate decision:

- Gate decision tree uses static, focused, and full based on blast radius.
- Full gate is required because `scripts/foundation-verify.mjs`, `package.json`, and protected Foundation process docs change.
- Focused proof runs first to catch the exact historical split closeout failure mode quickly.
- Static syntax checks cover the changed code files.
- Full `process:foundation-ship` remains the final gate and keeps runtime proof bounded to the standard ship path.

## Risks

- Moving the historical split closeout block can accidentally drop one source or verifier summary from the root-to-module handoff; `foundation:verify` and the focused proof catch that by executing the real module path.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-verifier-historical-split-closeouts.js
node --check scripts/process-verifier-historical-split-closeouts-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-historical-split-closeouts-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001.json --closeoutKey=verifier-historical-split-closeouts-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001 --closeoutKey=verifier-historical-split-closeouts-split-v1
npm run process:foundation-ship -- --card=VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001.json --closeoutKey=verifier-historical-split-closeouts-split-v1 --commitRef=HEAD
```
