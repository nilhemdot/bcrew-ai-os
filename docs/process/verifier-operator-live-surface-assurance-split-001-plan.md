# VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001 Plan

Card: `VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001`

## What

Move only the operator/live-surface assurance verifier domain out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-operator-live-surface-assurance.js`.

V1 covers the inline checks that prove Foundation/Ops pages expose the right operator contracts, Strategy Hub v2 stays source-backed while the advisor remains offline, Runtime Health exposes extraction-control proof, Owners governance exposes drift and review queues, and Recent Builds/Recent Work discipline stays tracked. It does not move process hardening, cleanup/control, Phase G, readiness blockers, runtime reliability, structural assurance, connector auth, source extraction jobs, or UI feature work.

`scripts/foundation-verify.mjs` remains the orchestrator. It gathers the same live Foundation payloads and source text, calls `evaluateFoundationVerifierOperatorLiveSurfaceAssurance({ ... })`, and pushes returned checks into the canonical check list.

## Why

The verifier is still above the under-5K clean target. This sprint removes a real operator/live-surface assurance domain from the root verifier instead of moving an arbitrary tail block.

Operator value: Steve keeps proof that the CEO dashboard, Ops cockpit, Strategy Hub v2, Runtime Health extraction control, Owners governance, and Recent Builds discipline did not vanish while the root verifier gets smaller. The useful operator behavior is a real workflow where Steve and the team can inspect source-backed work, owner queues, extraction status, and recent build proof quickly; this unlocks speed with quality because regressions fail closed instead of hiding inside a monolith.

## Acceptance Criteria

- `lib/foundation-verifier-operator-live-surface-assurance.js` owns the operator/live-surface assurance evaluator and dogfood proof.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierOperatorLiveSurfaceAssurance({ ... })` and no longer contains the old inline Ops, Strategy Hub v2, extraction-control, Owners governance, or Recent Work assertion block.
- The focused proof calls the real `buildFoundationVerifierOperatorLiveSurfaceAssuranceDogfoodProof()` function path.
- The focused proof must reject substring-only proof; marker checks can support artifact wiring, but they cannot be the behavior proof.
- Dogfood proof recreates the failure class and rejects hidden Ops surface contract, Strategy Hub source-review, extraction-control proof, Owners governance, Recent Builds discipline, and old-inline-predicate failures.
- `scripts/process-verifier-operator-live-surface-assurance-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 7,388 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-operator-live-surface-assurance-split-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing operator/live-surface checks in `scripts/foundation-verify.mjs`.
- Existing Foundation Hub, Ops Hub, Strategy Hub v2, Owners, extraction-control, and Recent Builds live payloads.
- Existing source modules for Strategy goal/operating truth, source crawl ownership, Drive content extraction, shared-comms coverage, and backlog done-closeout enforcement.
- Existing plan approval integrity path in `lib/approval-integrity.js`.
- Existing closeout validation and Recent Builds metadata pattern in `lib/foundation-build-closeout-tightening-records.js`.
- Existing focused verifier split proof pattern from the cleanup/control and follow-up backlog assurance split scripts.
- Existing docs in `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/`, and `docs/handoffs/`.
- Foundation main session owns this active sprint scope. Any hub, Harlan, Canva, Fal, voice, connector-auth, or side-lane work must stop-and-coordinate through main session approval before touching shared Foundation files, committing, pushing, or shipping.

Root invariant:

- The verifier must prove operator surfaces through actual live payloads, source modules, UI source, backlog state, closeout records, package script registration, and dogfood proof.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.
- The module boundary must preserve behavior; it is not a place to loosen Strategy Hub source-proof, extraction-control, Owners governance, Recent Builds, or Ops/Foundation surface checks.

Not next:

- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of Strategy Hub, Runtime Health, Owners governance, Recent Builds, Ops Hub, Foundation Hub, cleanup/control, process hardening, runtime reliability, structural assurance, or Plan Critic scoring.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No UI feature extraction, route split, connector, source extraction, or arbitrary tail extraction in this sprint.

Rollback or repair path:

- If focused proof or `foundation:verify` fails, keep the module boundary but repair the exact failing assertion or input handoff.
- If the module boundary itself is wrong, revert only this sprint's root delegation/module/doc additions before commit.
- Do not weaken checks into substring-only proof to make the split pass.

Gate decision:

- Gate decision tree uses static, focused, and full based on blast radius.
- Full gate is required because `scripts/foundation-verify.mjs`, `package.json`, and protected Foundation process docs change.
- Focused proof runs first to catch the exact operator/live-surface assurance failure mode quickly.
- Static syntax checks cover the changed code files.
- Full `process:foundation-ship` remains the final gate and keeps runtime proof bounded to the standard ship path.

## Risks

- Moving this block can accidentally drop one live payload, source-text, or backlog proof from the root-to-module handoff; `foundation:verify` and the focused proof catch that by executing the real module path.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-verifier-operator-live-surface-assurance.js
node --check scripts/process-verifier-operator-live-surface-assurance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-operator-live-surface-assurance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-operator-live-surface-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001 --closeoutKey=verifier-operator-live-surface-assurance-split-v1
npm run process:foundation-ship -- --card=VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-operator-live-surface-assurance-split-v1 --commitRef=HEAD
```
