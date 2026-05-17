# VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001 Plan

Card: `VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001`

## What

Move only the cleanup/control assurance verifier domain out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-cleanup-control-assurance.js`.

V1 is narrow: it covers cleanup wave closeouts, Phase E re-audit closeout, local-private doc boundary proof, document categorization cleanup, hard-checkpoint backlog promotion, phase-one enforcement proof, gate reliability proof, and the Foundation control-layer closeout checks. It does not move Phase G operator UI behavior, readiness blocker behavior, source extraction, connector auth, agent feedback, or runtime reliability behavior.

`scripts/foundation-verify.mjs` remains the orchestrator. It gathers the same live Foundation payloads and source text, calls `evaluateFoundationVerifierCleanupControlAssurance({ ... })`, and pushes returned checks into the canonical check list.

## Why

The verifier is still above the under-5K clean target. This sprint removes a real historical cleanup/control assurance domain from the root verifier instead of moving an arbitrary tail block.

Operator value: Steve and the team keep proof that cleanup work, closeout ownership, private-file boundaries, and control-layer guardrails did not vanish while the root verifier gets smaller. That preserves quality and trust in the builder workflow while reducing the chance that new work keeps piling behavior into one dangerous file.

## Acceptance Criteria

- `lib/foundation-verifier-cleanup-control-assurance.js` owns the cleanup/control assurance evaluator and dogfood proof.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierCleanupControlAssurance({ ... })` and no longer contains the old inline cleanup wave, re-audit, hard-checkpoint, phase-one, gate-reliability, or control-layer assertion block.
- The focused proof calls the real `buildFoundationVerifierCleanupControlAssuranceDogfoodProof()` function path.
- The focused proof must reject substring-only proof; marker checks can support artifact wiring, but they cannot be the behavior proof.
- Dogfood proof recreates the failure class and rejects hidden cleanup wave, private-doc boundary, hard-checkpoint backlog, phase-one enforcement, control-layer, gate-reliability, and old-inline-predicate failures.
- `scripts/process-verifier-cleanup-control-assurance-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 8,086 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-cleanup-control-assurance-split-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing root verifier cleanup/control checks in `scripts/foundation-verify.mjs`.
- Existing cleanup status builders and proof functions in the Foundation cleanup, doctrine, gate-reliability, personal-workspace, decision-auto-emit, and CEO-dashboard modules.
- Existing live backlog and Current Sprint data from Foundation Hub.
- Existing plan approval integrity path in `lib/approval-integrity.js`.
- Existing closeout validation and Recent Builds metadata pattern in `lib/foundation-build-closeout-tightening-records.js`.
- Existing focused verifier split proof pattern from the follow-up backlog assurance and health/live-summary split scripts.
- Existing docs in `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/`, and `docs/handoffs/`.
- Foundation main session owns this active sprint scope. Any hub, Harlan, Canva, Fal, voice, connector-auth, or side-lane work must stop-and-coordinate through main session approval before touching shared Foundation files, committing, pushing, or shipping.

Root invariant:

- The verifier must prove historical cleanup and control work through actual live backlog state, closeout records, source modules, docs, status builders, synthetic dogfood, package script registration, and function-path evidence.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.
- The module boundary must preserve behavior; it is not a place to loosen private-file, cleanup, gate-reliability, phase-one enforcement, or control-layer checks.

Not next:

- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of cleanup, document categorization, gate reliability, personal workspace boundary, decision auto-emit, CEO dashboard pattern, Phase G, readiness blockers, process hardening, or runtime reliability.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No agent feedback, Strategy Hub feature work, route budget, Recent Builds UI work, connector, source extraction, UI feature extraction, or arbitrary tail extraction in this sprint.

Rollback or repair path:

- If focused proof or `foundation:verify` fails, keep the module boundary but repair the exact failing assertion or input handoff.
- If the module boundary itself is wrong, revert only this sprint's root delegation/module/doc additions before commit.
- Do not weaken checks into substring-only proof to make the split pass.

Gate decision:

- Gate decision tree uses static, focused, and full based on blast radius.
- Full gate is required because `scripts/foundation-verify.mjs`, `package.json`, and protected Foundation process docs change.
- Focused proof runs first to catch the exact cleanup/control assurance failure mode quickly.
- Static syntax checks cover the changed code files.
- Full `process:foundation-ship` remains the final gate and keeps runtime proof bounded to the standard ship path.

## Risks

- Moving this block can accidentally drop one cleanup closeout, approval validation, or synthetic safety proof from the root-to-module handoff; `foundation:verify` and the focused proof catch that by executing the real module path.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-verifier-cleanup-control-assurance.js
node --check scripts/process-verifier-cleanup-control-assurance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-cleanup-control-assurance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-cleanup-control-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001 --closeoutKey=verifier-cleanup-control-assurance-split-v1
npm run process:foundation-ship -- --card=VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-cleanup-control-assurance-split-v1 --commitRef=HEAD
```
