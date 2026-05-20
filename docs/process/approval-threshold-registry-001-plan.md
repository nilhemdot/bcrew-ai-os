# APPROVAL-THRESHOLD-REGISTRY-001 Plan

## What

Create a shared approval-threshold registry for the Plan Critic approval score and wire the load-bearing approval paths to it.

## Why

The deep audit found the `9.8` approval threshold spread across Plan Critic, approval integrity, Current Sprint, and nightly audit logic. That makes the approval rule drift-prone and forces Steve to catch process inconsistency manually. The useful behavior is one source of truth for the threshold plus an audit detector that catches future local threshold logic.

## Acceptance Criteria

- `lib/approval-threshold-registry.js` owns the canonical minimum approval score, label, helpers, proof commands, card ID, closeout key, and next card.
- `lib/process-plan-critic.js` re-exports the registry value for compatibility instead of declaring its own local threshold.
- `lib/approval-integrity.js`, `lib/foundation-current-sprint.js`, and `lib/foundation-current-sprint-store.js` use the registry helper for approval and pass-threshold checks.
- `lib/code-quality-nightly-audit.js` uses a registry evaluator, not a blanket raw `9.8` substring scan, so historical labels do not create noisy findings and load-bearing drift still fails.
- `lib/deep-audit-findings-closure-gate.js` routes the May 19 finding to this closeout after the focused proof passes.

## Definition Of Done

- Focused proof passes and dogfoods stale local threshold logic as rejected.
- Code-quality nightly audit no longer proposes `APPROVAL-THRESHOLD-REGISTRY-001` when the load-bearing sources use the registry.
- Backlog card closes and Current Sprint advances to `BUILD-INTEL-SNAPSHOT-BASELINE-001`.
- `foundation:verify`, repeated-failure gate, System Health, backlog hygiene, and `process:foundation-ship` pass.
- Main is clean, pushed, and synced after the card.

## Details

Existing work reused:

- Existing code: `lib/process-plan-critic.js`, `lib/approval-integrity.js`, `lib/foundation-current-sprint.js`, `lib/foundation-current-sprint-store.js`, `lib/code-quality-nightly-audit.js`, and `lib/deep-audit-findings-closure-gate.js`.
- Existing docs: the May 19 deep merge audit, the deep-audit findings closure plan, the live Current Sprint command truth, and this current plan.
- Existing scripts: `process:code-quality-nightly-audit-check`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `foundation:verify`, and `process:foundation-ship`.
- Live backlog truth: `APPROVAL-THRESHOLD-REGISTRY-001` is the active blocker and `BUILD-INTEL-SNAPSHOT-BASELINE-001` is the next safe card.
- `lib/process-plan-critic.js` remains the public Plan Critic API and keeps its existing `PLAN_CRITIC_MIN_PASS_SCORE` export.
- `lib/approval-integrity.js` remains the plan approval validator.
- `lib/foundation-current-sprint.js` and `lib/foundation-current-sprint-store.js` remain Current Sprint truth readers.
- `lib/code-quality-nightly-audit.js` remains the drift detector for approval-threshold assumptions.
- `lib/deep-audit-findings-closure-gate.js` remains the May 19 audit route truth.

Implementation:

- Add `normalizeApprovalThreshold()` and `meetsApprovalThreshold()` as reusable helpers.
- Keep the actual score value unchanged.
- Focus the detector on load-bearing threshold logic, not every historical approval JSON, closeout note, or operator-facing label that mentions `9.8`.
- Insert a Plan Critic run for this card using the registry threshold value.
- Use guarded backlog and Current Sprint writes only when `--close-card` is passed.
- Root invariant: approved Foundation work and Plan Critic pass/fail decisions must read one approval threshold contract. The card proves the underlying invariant through actual function path checks, code-quality audit behavior, live backlog/Current Sprint writeback, and a synthetic failing case.
- Behavior proof: the focused process check calls the real evaluator and dogfood fixtures. It rejects stale local threshold logic, rejects a below-threshold score, and proves the code-quality audit no longer routes this card when registry usage is healthy. No substring-only proof is accepted; substring-only proof is rejected.
- Gate decision: this is a full Foundation gate because it touches approval integrity, Plan Critic, Current Sprint, nightly audit detection, closeout registry, and package scripts. The blast radius is approval/process infrastructure, so static `node --check`, focused `process:approval-threshold-registry-check`, full `foundation:verify`, and `process:foundation-ship` all run at closeout.
- Repair path: if proof fails, leave the backlog card and Current Sprint active, fix the exact failing caller or detector, and rerun the focused proof before any closeout. If this regresses later, reopen this card or create a narrow repair card from the code-quality audit finding.
- Speed bound: the focused proof skips endpoint fetches in the code-quality audit and uses direct function/process checks, so it stays fast enough to run by default before the full ship gate.

Not next:

- Do not rewrite every legacy approval artifact or historical closeout that contains `9.8`.
- Do not change the approval score threshold.
- Do not weaken approval integrity, Plan Critic, or Current Sprint stage gates.
- Do not turn this into broad Plan Critic redesign or audit framework rebuild.
- Do not start value/source/extraction work from this card.

## Risks

- A blanket mechanical rewrite across hundreds of `9.8` mentions would create unnecessary churn and could corrupt historical proof.
- A detector that ignores too much would let a local threshold creep back in.
- A detector that flags every prose label would become noisy and get bypassed.
- Closing the card requires live backlog and Current Sprint mutation, so the process check must stay explicitly guarded.

## Tests

- `node --check lib/approval-threshold-registry.js scripts/process-approval-threshold-registry-check.mjs`
- `npm run process:approval-threshold-registry-check -- --close-card --json`
- `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=APPROVAL-THRESHOLD-REGISTRY-001 --planApprovalRef=docs/process/approvals/APPROVAL-THRESHOLD-REGISTRY-001.json --closeoutKey=approval-threshold-registry-v1 --commitRef=HEAD`
