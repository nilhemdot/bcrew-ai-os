# FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001 Plan

## What

Close the approved May 19 Foundation-only sprint with a proof-backed readiness decision.

This card verifies that Foundation is raw-green, repeated-failure clean, backlog-clean, current-sprint clean, and main-synced after the guardrail/source/extract cards. It records whether continuous unattended Foundation Builder work can continue and whether the Value Builder split is safe.

## Why

Steve explicitly cannot babysit every card. The system needs a durable end-of-sprint decision that is based on live proof, not chat optimism. Continuous work is useful only if repeated failures trigger repair, blockers park unsafe actions instead of stopping the whole sprint, and green means actual green.

Senior call for this closeout: continuous Foundation Builder is allowed only if the proof is green. Full Value Builder split does not auto-start from this card; it needs the next clean overnight/morning cycle or explicit Steve approval.

## Acceptance Criteria

- System Health is healthy with raw risk count zero and raw watch count zero.
- Repeated-failure action gate is healthy.
- Backlog hygiene is healthy.
- Current Sprint dynamic truth is healthy.
- Required sprint cards are done:
  - `FOUNDATION-HEALTH-GREEN-LOCK-001`
  - `FOUNDATION-LESSONS-LEARNED-LOOP-001`
  - `FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001`
  - `SYSTEM-010`
  - `SOURCE-012`
  - `SOURCE-018`
  - `EXTRACT-CURRENT-001`
  - `EXTRACT-BACKFILL-001`
  - `DRIVE-CONTENT-001`
  - `EMAIL-ATTACHMENTS-001`
- Main is clean and synced.
- Current Sprint records this closeout as done and leaves no active blocker in the closed sprint.
- The recommendation is explicit:
  - continuous Foundation Builder: ready if all gates pass
  - full Value Builder split: deferred until the next clean overnight/morning cycle or explicit Steve approval

## Definition Of Done

- `process:foundation-sprint-closeout-continuous-work-ready-check` passes with `--apply --close-card --json`.
- System Health, repeated-failure gate, Current Sprint dynamic truth, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- The closeout registry exposes `foundation-sprint-closeout-continuous-work-ready-v1`.
- Main is clean and pushed.

## Details

The implementation reuses live Foundation truth instead of hand-maintained markdown:

- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `process:current-sprint-dynamic-truth-check`
- `backlog:hygiene`
- live backlog rows
- live Current Sprint overlay
- git main/origin/main state

This explicitly reuses existing code, existing docs, existing scripts, live backlog truth, and Current Sprint truth. The closeout does not invent a second readiness tracker or a markdown-only status. The behavior proof goes through a real function path, API route-backed process checks, and focused dogfood: `buildFoundationSprintCloseoutStatus()`, `buildFoundationSprintCloseoutDogfoodProof()`, `/api/foundation/current-sprint` through the current-sprint process check, the system-health process check, the repeated-failure process check, and live DB backlog/sprint reads.

The proof must reject weak behavior claims. Dogfood fixtures prove the gate rejects raw health risk, repeated-failure risk, backlog hygiene risk, Current Sprint drift, unfinished required cards, and dirty/unsynced main. No substring-only proof is accepted; substring-only proof is rejected. This card does not rely on source text claims as acceptance proof.

The card adds a focused proof helper and process script:

- `lib/foundation-sprint-closeout-continuous-work.js`
- `scripts/process-foundation-sprint-closeout-continuous-work-ready-check.mjs`

The proof closes the sprint by marking this card done, setting the active blocker to `null`, and saving the continuous-work recommendation in Current Sprint metadata. It does not start a Value Builder, create a parallel worktree, approve external writes, mutate credentials, or broaden private extraction.

## Operator Value

Steve gets a clean answer to the real operational question: can the system keep working without babysitting? The real workflow this unlocks is continuous Foundation Builder work that starts from morning audit truth, repairs raw failures first, parks approval-bound actions without stopping everything, and keeps main clean after every card.

The useful recommendation is deliberately conservative: Foundation Builder can keep going under repair-first rules when the gate is green. Value Builder split waits for the next clean overnight/morning cycle or explicit Steve approval, so the system does not turn one good sprint closeout into parallel chaos.

## Reuse Existing Work

Reuse existing code and live truth:

- `buildFoundationCurrentSprintStatus()`
- `validatePlanApprovalFile()`
- `evaluatePlanCriticPlan()`
- `getFoundationBuildCloseouts()`
- `getBacklogItemsByIds()`
- `upsertFoundationCurrentSprintOverlay()`
- `buildFoundationSprintCloseoutStatus()`
- `buildFoundationSprintCloseoutDogfoodProof()`

Reuse existing guardrails:

- health green lock
- lessons-learned loop
- repeated-failure action gate
- P0 reality cleanup
- process controls from `SYSTEM-010`
- source/extract target proof from the current sprint
- closeout registry
- Foundation ship gate

## Tests

Focused proof:

- `node --check lib/foundation-sprint-closeout-continuous-work.js scripts/process-foundation-sprint-closeout-continuous-work-ready-check.mjs`
- `npm run process:foundation-sprint-closeout-continuous-work-ready-check -- --apply --close-card --json`

Full closeout proof:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run process:current-sprint-dynamic-truth-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001.json --closeoutKey=foundation-sprint-closeout-continuous-work-ready-v1 --commitRef=HEAD`

## Gate Decision

Gate decision tree: static checks are not enough because this card changes sprint control-plane truth. Focused proof is required for live health, repeated-failure, backlog, Current Sprint, required-card, and main-integration state. Full gate is required because the blast radius includes Current Sprint completion, operator readiness posture, closeout registry, and Foundation ship proof. The focused check is fast because it reads status outputs, card lanes, git refs, and metadata only.

## Risks

- A single clean closeout could be misread as approval for broad Value Builder split. Containment: the recommendation explicitly defers full split until the next clean overnight/morning cycle or Steve approval.
- Historical failed job rows could be confused with active blockers. Containment: repeated-failure gate and System Health decide current blocking state; closeout names historical rows as history, not active green blockers.
- Closing the sprint could hide future work. Containment: next sprint must start from morning audit truth; this card does not delete backlog or doctrine.
- A blocked approval-bound operation could stop the next sprint again. Containment: durable operating rule remains: blockers block unsafe actions, not the whole sprint.

Repair path: if any gate is non-green, do not close the sprint. Keep the card executing, repair the failing Foundation lane or park the unsafe action with an explicit blocker, then rerun the closeout proof. If main is dirty or unsynced, reconcile main before closeout.

## Not Next

- No Value Builder split from this card alone.
- No broad private extraction.
- No sends or external writes.
- No Drive/Gmail/Missive permission mutation.
- No credential mutation, provider config change, or key rotation.
- No paid/provider/browser-auth work.
