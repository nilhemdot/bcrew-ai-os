# VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001 Plan

Card: `VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001`

## What

Move only the health/live-summary verifier domain out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-health-live-summary.js`.

V1 is narrow: it includes KPI dynamic-year contract assurance, Foundation Current State live-summary source assurance, system-health/nightly-staleness assurance, and the shipped health-script verifier split assurance. It does not move process hardening, runtime reliability, connector auth, source extraction, agent feedback, Strategy Hub, route budget, Recent Builds, or UI feature work.

`scripts/foundation-verify.mjs` remains the orchestrator: it gathers the existing sources and live Foundation payloads, calls `evaluateFoundationVerifierHealthLiveSummary({ ... })`, and pushes returned checks into the canonical check list.

## Why

The root verifier is below the 10K emergency threshold, but the real clean target is under 5K. This sprint reduces the remaining monolith by a real domain boundary instead of moving an arbitrary tail for line count.

Operator value: Steve and the team can keep trusting the real builder workflow because the health signals that say whether KPI truth, Current State summary truth, system-health visibility, and health scripts are reliable stay enforced while the verifier shrinks. This unlocks better Foundation speed and quality without weakening the checks that show whether the system is healthy enough to keep building.

## Acceptance Criteria

- `lib/foundation-verifier-health-live-summary.js` owns the health/live-summary evaluator and dogfood proof.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierHealthLiveSummary({ ... })` and no longer contains the old inline KPI dynamic-year, live-summary, system-health, or health-script split assertion block.
- The focused proof calls the real `buildFoundationVerifierHealthLiveSummaryDogfoodProof()` function path.
- The focused proof must reject substring-only proof; marker checks can support artifact wiring, but they cannot be the behavior proof.
- Dogfood proof recreates the failure class and rejects hidden KPI dynamic-year, hidden live-summary, hidden system-health, hidden health-script delegation, and old-inline-predicate failures.
- `scripts/process-verifier-health-live-summary-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 8,552 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-health-live-summary-split-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing KPI dynamic-year contract proof in `lib/kpi-health.js`.
- Existing Current State summary source contract in `lib/foundation-current-state-summary.js`.
- Existing system-health dogfood and job definitions in `lib/foundation-system-health.js` and `lib/foundation-jobs.js`.
- Existing health-script verifier in `lib/foundation-health-script-verifier.js`.
- Existing root verifier source loading and live Foundation Hub payloads in `scripts/foundation-verify.mjs`.
- Existing closeout validation and Recent Builds metadata pattern in `lib/foundation-build-closeout-tightening-records.js`.
- Existing focused verifier split proof pattern from the build-log registry assurance and historical split closeout scripts.
- Existing live backlog and Current Sprint data for ownership checks; the proof can use historical closeout ownership after the active sprint moves on.
- Foundation main session owns this active sprint scope. Any hub, Harlan, Canva, Fal, voice, connector-auth, or side-lane work must stop-and-coordinate through main session approval before touching shared Foundation files, committing, pushing, or shipping.

Root invariant:

- The verifier must prove health/live-summary behavior through actual artifact, closeout, live backlog, package script, source module, dogfood, and function-path evidence.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.
- The module boundary must preserve behavior; it is not a place to loosen KPI, Current State, system-health, or health-script checks.

Not next:

- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of KPI health, Current State summary, system-health, health scripts, process hardening, or runtime reliability.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No agent feedback, Strategy Hub, route budget, Recent Builds, connector, source extraction, or UI feature extraction in this sprint.

Rollback or repair path:

- If focused proof or `foundation:verify` fails, keep the module boundary but repair the exact failing assertion or input handoff.
- If the module boundary itself is wrong, revert only this sprint's root delegation/module/doc additions before commit.
- Do not weaken checks into substring-only proof to make the split pass.

Gate decision:

- Gate decision tree uses static, focused, and full based on blast radius.
- Full gate is required because `scripts/foundation-verify.mjs`, `package.json`, and protected Foundation process docs change.
- Focused proof runs first to catch the exact health/live-summary failure mode quickly.
- Static syntax checks cover the changed code files.
- Full `process:foundation-ship` remains the final gate and keeps runtime proof bounded to the standard ship path.

## Risks

- Moving the health/live-summary block can accidentally drop one source or returned health-script output from the root-to-module handoff; `foundation:verify` and the focused proof catch that by executing the real module path.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-verifier-health-live-summary.js
node --check scripts/process-verifier-health-live-summary-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-health-live-summary-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001.json --closeoutKey=verifier-health-live-summary-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001 --closeoutKey=verifier-health-live-summary-split-v1
npm run process:foundation-ship -- --card=VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001.json --closeoutKey=verifier-health-live-summary-split-v1 --commitRef=HEAD
```
