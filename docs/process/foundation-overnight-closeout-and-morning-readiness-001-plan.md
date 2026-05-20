# FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001 Plan

## What

Close `FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19` with proof, then open the next safe Foundation sprint if Steve is still asleep.

Closeout key: `foundation-overnight-closeout-morning-readiness-v1`.

## Why

Steve explicitly approved nonstop overnight work. A clean sprint cannot end with the builder waiting for chat permission. The system must prove raw health, repeated-failure gate, backlog hygiene, Current Sprint truth, `foundation:verify`, and main sync, then choose the next safe card from live backlog truth.

This card closes the failure mode where "hard stop" accidentally means "stop all work." The durable rule is: blockers block unsafe actions, not the whole sprint.

## Definition Of Done

- `DATA-003` and the prior audit-control/intelligence sprint cards are done in live backlog truth.
- System Health is healthy with raw risk count `0` and raw watch count `0`.
- Repeated-failure action gate is healthy.
- Current Sprint dynamic truth is healthy.
- Backlog hygiene is healthy.
- Main is clean and synced, or the closeout is inside the final in-flight ship gate.
- A safe next sprint is selected from live backlog truth.
- Approval-bound/private/provider/browser-auth/paid/external-write cards are skipped or parked instead of stopping the builder.
- Current Sprint moves to `FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20` with the first safe card active.

## Acceptance Criteria

- Focused proof passes with:
  - `npm run process:foundation-overnight-closeout-morning-readiness-check -- --close-card --json`
- The next sprint opens with `SLICE-001` if it remains the first eligible safe card.
- The proof dogfoods:
  - raw health risk fails closeout
  - raw watch debt fails closeout
  - repeated-failure risk fails closeout
  - backlog hygiene risk fails closeout
  - Current Sprint drift fails closeout
  - unfinished required sprint cards fail closeout
  - dirty/unsynced main fails closeout outside the in-flight ship posture
  - no safe continuation card fails closeout
  - stopping the whole sprint for approval-bound parked work fails closeout
- The closeout registry exposes `foundation-overnight-closeout-morning-readiness-v1`.

## Details

The card adds a reusable closeout model and focused process proof:

- `lib/foundation-overnight-closeout-morning-readiness.js`
- `scripts/process-foundation-overnight-closeout-morning-readiness-check.mjs`

The behavior proof path is function/process based:

- `buildFoundationOvernightCloseoutStatus()` evaluates raw health, repeated failures, backlog hygiene, Current Sprint truth, required done cards, git integration, and safe continuation.
- `buildSafeContinuationPlan()` chooses the first eligible non-done, non-approval-bound card from the safe continuation order.
- `buildFoundationOvernightCloseoutDogfoodProof()` rejects the exact failure modes above.
- `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `process:current-sprint-dynamic-truth-check`, and `backlog:hygiene` provide live proof.
- `upsertFoundationCurrentSprintOverlay()` moves Current Sprint to the next sprint only when closeout is green.
- API/process route proof comes from the existing System Health, repeated-failure, Current Sprint, and backlog process scripts that read the same DB/API-backed truth the operator sees.
- No substring-only proof is accepted. The focused script may check that wiring exists, but acceptance depends on real function outputs, live process results, live backlog rows, and Current Sprint mutation proof.

Root invariant: a clean closeout must create safe forward motion. If raw health, repeated failures, Current Sprint truth, backlog hygiene, required done cards, or main sync are not clean, the closeout fails closed. If those are clean and a safe continuation card exists, the builder opens the next sprint instead of stopping.

Safe continuation order:

1. `SLICE-001`
2. `MARKETING-VIDEO-LAB-LIVE-SAFETY-001`
3. `STRATEGY-004`
4. `STRATEGY-009`
5. `KPI-APPT-QUALITY-001`
6. `KPI-LEAD-VALIDATION-001`
7. `INTEL-THREAD-CONTEXT-001`
8. `SCOPER-UI-001`
9. `SOURCE-001`
10. `SOURCE-002`
11. `SOURCE-003`

The selected order intentionally skips live Loom, Skool, Mycro, meeting-video, paid/provider, browser-auth, broad private extraction, credential mutation, provider config, external writes, and Drive permission mutation. Those can be scoped or parked, but they do not stop safe Foundation work.

## Operator Value

Steve can go to sleep and the builder has a real decision mechanism:

- if the system is green, open the next safe sprint and keep going
- if a card hits approval-bound work, park the unsafe action and continue
- if raw health/repeated failures/main sync break, repair first
- if no safe work remains, stop with a precise reason

This turns overnight work from chat babysitting into a controlled queue.

## Reuse Existing Work

Reuse existing code, existing docs, existing scripts, live backlog truth, and Current Sprint truth:

- Existing code:
  - `upsertFoundationCurrentSprintOverlay()`
  - `getActiveFoundationCurrentSprint()`
  - `getBacklogItemsByIds()`
  - `getFoundationBuildCloseouts()`
  - Plan Critic
  - approval integrity
  - process write guard
- Existing docs:
  - `docs/process/current-sprint-active-card-gate-001-plan.md`
  - `docs/process/foundation-sprint-closeout-and-continuous-work-ready-001-plan.md`
  - `docs/audits/2026-05-19-foundation-deep-merge-audit.md`
- Existing scripts:
  - `process:system-health-nightly-audit-check`
  - `process:build-lane-repeated-failure-action-gate-check`
  - `process:current-sprint-dynamic-truth-check`
  - `backlog:hygiene`
  - `foundation:verify`
- Existing live truth:
  - live backlog rows
  - live Current Sprint overlay
  - git main/origin posture
  - closeout registry
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `process:current-sprint-dynamic-truth-check`
- `backlog:hygiene`
- `foundation:verify`
- `upsertFoundationCurrentSprintOverlay()`
- Plan Critic
- approval integrity
- process write guard
- closeout registry
- live backlog rows

## Tests

Focused proof:

- `node --check lib/foundation-overnight-closeout-morning-readiness.js scripts/process-foundation-overnight-closeout-morning-readiness-check.mjs`
- `npm run process:foundation-overnight-closeout-morning-readiness-check -- --close-card --json`

Full closeout proof:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run process:current-sprint-dynamic-truth-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001.json --closeoutKey=foundation-overnight-closeout-morning-readiness-v1 --commitRef=HEAD`

## Gate Decision

Full Foundation gate.

Gate decision tree:

- static: `node --check` on the module and process script
- focused: `process:foundation-overnight-closeout-morning-readiness-check` proves closeout behavior, dogfood failures, live gate results, and Current Sprint mutation
- full: `foundation:verify`, `process:ship-check`, `process:fanout-check`, and `process:foundation-ship`

Blast radius is full because this card mutates live backlog and Current Sprint truth and starts the next sprint. Focused proof must pass first; full gate and clean pushed main are required before continuing beyond closeout.

Speed boundary: the focused proof should stay under 2 minutes by reading live status outputs and DB rows only. Heavy verification is reserved for the full closeout gate.

## Risks

- The selected next sprint could accidentally include approval-bound work.
  - Mitigation: the safe continuation model rejects done/approval-bound parked cards and encodes parked boundaries in Current Sprint metadata.
- This could be misread as starting Value Builder.
  - Mitigation: the plan and Current Sprint metadata explicitly keep Value Builder split off.
- A clean closeout could hide later raw failures.
  - Mitigation: every following card still runs System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, ship gate, and main sync.
- A later card could require private/provider work.
  - Mitigation: park that action and continue the next safe card. Only corrupted main, destructive data risk, or no safe work left stops the builder.

Repair path: if the focused proof fails, do not force the closeout. Fix raw health or repeated failures first, repair Current Sprint truth if it drifted, or update the safe continuation order if the first card became blocked. Then rerun the focused proof and full gates. If a behavior regression appears after closeout, reopen this card or file a P0 follow-up tied to `foundation-overnight-closeout-morning-readiness-v1`.

## Not Next

- No Value Builder split.
- No live Loom, Skool, Mycro, meeting-video, paid/provider, browser-auth, or broad private extraction.
- No sends, external writes, Drive permission mutation, credential mutation, provider config change, or key rotation.
- No reopening done v1 cards unless a focused regression proves a gap.
