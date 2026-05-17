# VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001 Plan

Card: `VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001`

## What

Move only the follow-up backlog assurance verifier domain out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-followup-backlog-assurance.js`.

V1 is narrow: it includes the verifier checks that prove key follow-up cards stay visible and honest across runtime-health simplification, access-control admin work, dashboard deploy freshness, extraction retry/control/schedule/metrics closeouts, strategy input closeouts, strategic-intelligence next-leg cards, marketing source lifecycle capture, and Owners/FUB source closeout guardrails. It does not move process hardening, runtime reliability, connector auth, new extraction behavior, agent feedback, route budgets, Recent Builds, or UI feature work.

`scripts/foundation-verify.mjs` remains the orchestrator. It gathers the same live Foundation payloads and source text, calls `evaluateFoundationVerifierFollowupBacklogAssurance({ ... })`, and pushes returned checks into the canonical check list.

## Why

The verifier is below the 10K emergency threshold, but the real clean target is under 5K. This sprint reduces the remaining monolith by a real backlog-truth domain boundary instead of moving a tail block just for line count.

Operator value: Steve and the team can keep using the builder workflow at speed because the system still proves important follow-ups are not hidden, lost, or falsely marked healthy while the root verifier shrinks. That protects quality without slowing every Foundation build into manual archaeology.

## Acceptance Criteria

- `lib/foundation-verifier-followup-backlog-assurance.js` owns the follow-up backlog assurance evaluator and dogfood proof.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierFollowupBacklogAssurance({ ... })` and no longer contains the old inline runtime-health, access, deploy-freshness, extraction, strategic-intelligence, marketing lifecycle, or source closeout assertion block.
- The focused proof calls the real `buildFoundationVerifierFollowupBacklogAssuranceDogfoodProof()` function path.
- The focused proof must reject substring-only proof; marker checks can support artifact wiring, but they cannot be the behavior proof.
- Dogfood proof recreates the failure class and rejects hidden runtime-health follow-up, hidden access follow-up, hidden deploy-freshness follow-up, hidden extraction follow-ups, hidden strategic-intelligence follow-ups, hidden source closeouts, and old-inline-predicate failures.
- `scripts/process-verifier-followup-backlog-assurance-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 8,339 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-followup-backlog-assurance-split-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing root verifier backlog-truth checks in `scripts/foundation-verify.mjs`.
- Existing live backlog and Current Sprint data read paths from Foundation Hub and `getActiveFoundationCurrentSprint`.
- Existing plan approval integrity path in `lib/approval-integrity.js`.
- Existing closeout validation and Recent Builds metadata pattern in `lib/foundation-build-closeout-tightening-records.js`.
- Existing focused verifier split proof pattern from the build-log registry assurance and health/live-summary split scripts.
- Existing Plan Critic ledger in `plan_critic_runs`.
- Existing docs in `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and `docs/handoffs/`.
- Foundation main session owns this active sprint scope. Any hub, Harlan, Canva, Fal, voice, connector-auth, or side-lane work must stop-and-coordinate through main session approval before touching shared Foundation files, committing, pushing, or shipping.

Root invariant:

- The verifier must prove follow-up work stays visible through actual live backlog state, closeout records, current plan/state references, package script registration, source module behavior, dogfood, and function-path evidence.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.
- The module boundary must preserve behavior; it is not a place to loosen runtime-health, access, deploy-freshness, extraction, strategic-intelligence, marketing lifecycle, or source closeout checks.

Not next:

- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of runtime health, access control, deploy freshness, extraction jobs, strategic intelligence, source closeouts, process hardening, or runtime reliability.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No agent feedback, Strategy Hub feature work, route budget, Recent Builds, connector, source extraction, UI feature extraction, or arbitrary tail extraction in this sprint.

Rollback or repair path:

- If focused proof or `foundation:verify` fails, keep the module boundary but repair the exact failing assertion or input handoff.
- If the module boundary itself is wrong, revert only this sprint's root delegation/module/doc additions before commit.
- Do not weaken checks into substring-only proof to make the split pass.

Gate decision:

- Gate decision tree uses static, focused, and full based on blast radius.
- Full gate is required because `scripts/foundation-verify.mjs`, `package.json`, and protected Foundation process docs change.
- Focused proof runs first to catch the exact follow-up backlog assurance failure mode quickly.
- Static syntax checks cover the changed code files.
- Full `process:foundation-ship` remains the final gate and keeps runtime proof bounded to the standard ship path.

## Risks

- Moving the follow-up block can accidentally drop one live backlog card or source closeout guardrail from the root-to-module handoff; `foundation:verify` and the focused proof catch that by executing the real module path.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-verifier-followup-backlog-assurance.js
node --check scripts/process-verifier-followup-backlog-assurance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-followup-backlog-assurance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-followup-backlog-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001 --closeoutKey=verifier-followup-backlog-assurance-split-v1
npm run process:foundation-ship -- --card=VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-followup-backlog-assurance-split-v1 --commitRef=HEAD
```
