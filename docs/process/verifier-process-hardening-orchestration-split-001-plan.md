# VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001 Plan

Card: `VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001`

## What

Move only the process-hardening orchestration layer out of `scripts/foundation-verify.mjs` and into `lib/foundation-process-hardening-verifier.js`.

V1 covers the root verifier handoff that calls the existing process-hardening verifier, pushes its checks, and proves the historical process-hardening module split remains closed. It does not move runtime reliability, build-log assurance, health/live summary, follow-up backlog assurance, process-control governance, source once-over, structural assurance, connector auth, route budgets, or unrelated verifier domains.

`scripts/foundation-verify.mjs` remains the orchestrator. It gathers the same live payloads and source text, calls `evaluateFoundationProcessHardeningVerifierOrchestration({ ... })`, and pushes returned checks into the canonical check list.

## Why

The verifier is still above the under-5K clean target. This sprint removes a real process-hardening orchestration domain from the root verifier instead of moving arbitrary tail code.

Operator value: Steve keeps proof that read-only verification, scheduled mutation guards, explicit process-check apply posture, DB seed separation, current-sprint mutation guards, job mutation allowlists, and backlog lost-update prevention did not weaken while the root verifier gets smaller. The useful operator behavior is a real workflow where process-hardening failures fail closed before Steve returns to broader building; this unlocks speed with quality because safety regressions do not hide inside a monolith.

## Acceptance Criteria

- `lib/foundation-process-hardening-verifier.js` owns `evaluateFoundationProcessHardeningVerifierOrchestration()`.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationProcessHardeningVerifierOrchestration({ ... })` and no longer owns the process-hardening check loop or split self-check block inline.
- The focused proof calls the real `buildFoundationProcessHardeningVerifierDogfoodProof()` path.
- Dogfood proof recreates the failure class and rejects verifier repair, scheduled mutation, DB seed writeback, and backlog lost-update fixtures.
- `scripts/process-verifier-process-hardening-orchestration-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 6,651 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-process-hardening-orchestration-split-check -- --json`.
- The historical focused proof still passes with `npm run process:verifier-process-hardening-split-module-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing process-hardening evaluator and dogfood proof in `lib/foundation-process-hardening-verifier.js`.
- Existing process-hardening checks and historical self-check in `scripts/foundation-verify.mjs`.
- Existing Foundation Hub payloads, source reads, package script map, approval integrity, and build closeout registry.
- Existing focused verifier split proof pattern from the process-trust orchestration split and the original process-hardening split script.
- Existing docs in `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/`, and `docs/handoffs/`.
- Foundation main session owns this active sprint scope. Any connector-auth, source extraction, Harlan, Canva, Fal, voice, paid call, email send, or hub feature work must stop-and-coordinate through main session approval before touching shared Foundation files, committing, pushing, or shipping.

Root invariant:

- The verifier must prove process hardening through actual live backlog cards, current plan/state, approval files, package scripts, source text, build closeouts, and dogfood proof.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.
- The module boundary must preserve behavior; it is not a place to loosen read-only verification, scheduled mutation guard, process-check apply posture, DB seed, current-sprint mutation, job allowlist, KPI cache, or backlog concurrency checks.

Not next:

- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of process hardening, runtime reliability, build-log assurance, health/live summary, follow-up backlog assurance, process-control governance, structural assurance, or Plan Critic scoring.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No process-control dependency bundle, route split, connector split, source extraction, or arbitrary tail extraction in this sprint.

Rollback or repair path:

- If focused proof or `foundation:verify` fails, keep the module boundary but repair the exact failing assertion or input handoff.
- If the module boundary itself is wrong, revert only this sprint's root delegation/module/doc additions before commit.
- Do not weaken checks into substring-only proof to make the split pass.

Gate decision:

- Gate decision tree uses static, focused, and full based on blast radius.
- Full gate is required because `scripts/foundation-verify.mjs`, `package.json`, and protected Foundation process docs change.
- Focused proof runs first to catch the exact process-hardening orchestration failure mode quickly.
- Static syntax checks cover the changed code files.
- Full `process:foundation-ship` remains the final gate and keeps runtime proof bounded to the standard ship path.

## Risks

- Moving this orchestration can accidentally drop one process-hardening check, source text, or closeout proof; `foundation:verify` and the focused proof catch that by executing the real module path.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-process-hardening-verifier.js
node --check scripts/process-verifier-process-hardening-orchestration-split-check.mjs
node --check scripts/process-verifier-process-hardening-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-process-hardening-orchestration-split-check -- --json
npm run process:verifier-process-hardening-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-hardening-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-hardening-orchestration-split-v1 --commitRef=HEAD
```
