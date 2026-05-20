# CURRENT-SPRINT-ACTIVE-CARD-GATE-001 Plan

## What

Add a hard active-card gate and reset the approved overnight sprint into live Current Sprint truth.

Closeout key: `current-sprint-active-card-gate-v1`.

## Why

Steve approved unattended overnight work, but the system cannot rely on chat instructions as the execution surface. Durable work must start from live Current Sprint and repo truth, with the active blocker, definition of done, proof, not-next boundaries, owner, next action, and repo posture visible before the builder moves.

This closes the failure mode where work keeps moving while the Current Sprint says something stale or incomplete.

## Definition Of Done

- `CURRENT-SPRINT-ACTIVE-CARD-GATE-001` exists in live backlog and can close as a done P0 card.
- Missing overnight guardrail cards are created/scoped so the approved sprint order is not lost.
- Current Sprint is reset to `FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19`.
- The active card has owner, next action, definition of done, proof commands, not-next boundaries, and repo posture.
- The sprint metadata encodes the operating rule: blockers block unsafe actions, not the whole sprint.
- Dogfood proves missing active blocker, missing definition of done, missing repo posture, and stop-the-whole-sprint policy fail closed.
- On closeout, Current Sprint advances to `DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001`.

## Acceptance Criteria

- Focused proof passes with `npm run process:current-sprint-active-card-gate-check -- --close-card --json`.
- The focused proof uses explicit process-write flags before mutating backlog or Current Sprint.
- The focused proof creates/scopes these missing cards if needed:
  - `DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001`
  - `BUILD-CLOSEOUT-DATA-SOURCE-001`
  - `FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001`
  - `FOUNDATION-CSS-SURFACE-DECOUPLE-001`
  - `FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001`
- Current Sprint contains the approved overnight order:
  1. `CURRENT-SPRINT-ACTIVE-CARD-GATE-001`
  2. `DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001`
  3. `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`
  4. `BUILD-LOG-API-CACHE-AND-SLIM-001`
  5. `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
  6. `APPROVAL-THRESHOLD-REGISTRY-001`
  7. `BUILD-INTEL-SNAPSHOT-BASELINE-001`
  8. `BUILD-CLOSEOUT-DATA-SOURCE-001`
  9. `FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001`
  10. `FOUNDATION-CSS-SURFACE-DECOUPLE-001`
  11. `DECISION-008`
  12. `INTEL-SCOPER-001`
  13. `DATA-003`
  14. `FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001`
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and ship gate pass.

## Details

The card adds `lib/current-sprint-active-card-gate.js` as the behavior owner and `scripts/process-current-sprint-active-card-gate-check.mjs` as the focused proof.

Root invariant: if a builder is about to do durable work, the active Current Sprint card must be complete enough that another engineer can tell what is active, what done means, how to prove it, what is not next, who owns it, what happens next, and what repo/main posture must be true at closeout.

This is a gate over work selection, not a new backlog. It reuses the existing `foundation_sprints`, `foundation_sprint_items`, `backlog_items`, Plan Critic, approval integrity, and process write guard.

The park-and-continue rule is encoded directly:

- approval-bound/private/provider/paid/browser/auth/Drive-permission work is parked
- the unsafe action is not run
- the card is marked blocked or deferred with exact reason
- the builder continues to the next safe approved card

Only system-wide corruption, destructive data risk, unsafe main state, or no safe work left should stop the whole builder.

## Reuse Existing Work

Existing code to reuse:

- `lib/foundation-current-sprint.js`
- `lib/foundation-current-sprint-store.js`
- `scripts/process-current-sprint-dynamic-truth-check.mjs`
- `scripts/process-sprint-stage-gate-check.mjs`
- `lib/process-write-guard.js`
- `lib/process-plan-critic.js`
- `lib/approval-integrity.js`

Existing docs to reuse:

- `docs/process/current-sprint-dynamic-truth-001-plan.md`
- `docs/process/sprint-stage-gate-001-plan.md`
- `docs/audits/2026-05-19-foundation-deep-merge-audit.md`

Existing cards to reuse:

- `CURRENT-SPRINT-DYNAMIC-TRUTH-001`
- `SPRINT-STAGE-GATE-001`
- `FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001`
- `STRATEGIC-INTEL-001`

## Operator Value

Steve does not have to babysit whether the builder is working from the right card. The sprint itself becomes the command surface, and blocked actions no longer freeze the whole night.

This unlocks a real operator workflow: Steve can approve an overnight sprint, leave, and come back to a Current Sprint surface that shows exactly what card was active, what shipped, what parked, what is next, and whether the repo/main/health gates are still clean.

## Risks

- Sprint-engine sprawl risk: this could become a second workflow system.
  - Mitigation: reuse the current sprint overlay and only add an active-card/repo-posture gate.
- False confidence risk: Current Sprint could have fields but still point to stale repo state.
  - Mitigation: require repo posture metadata and full ship/main-sync proof at card closeout.
- Overblocking risk: approval-bound operations could stop the entire builder again.
  - Mitigation: encode park-and-continue as sprint policy and dogfood-reject stop-whole-sprint policy.
- Unsafe mutation risk: focused proof mutates backlog/current sprint.
  - Mitigation: writes require explicit `--apply` or `--close-card` through the process write guard.

## Tests

- Static gate: `node --check lib/current-sprint-active-card-gate.js scripts/process-current-sprint-active-card-gate-check.mjs`.
- Focused gate: `npm run process:current-sprint-active-card-gate-check -- --close-card --json`.
- Full gate: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship`.
- Dogfood tests reject missing active blocker, missing definition of done, missing repo posture, and stop-whole-sprint blocker policy.
- Repair path: if the focused proof fails, fix the gate or the Current Sprint metadata; do not bypass the card or continue from chat-only instructions.

## Gate Decision Tree

Blast radius is full because this card mutates live backlog and Current Sprint truth and changes the process contract for unattended work.

Use static syntax first, then focused behavior proof, then full Foundation gates:

- static: module/script syntax
- focused: active-card gate dogfood and live Current Sprint reset
- full: `foundation:verify` and `process:foundation-ship`

The focused gate is intentionally thin and fast enough to use by default; it should run under 2 minutes except for the normal full ship gates at closeout.

## Gate Decision

Full Foundation gate. This card mutates live backlog and Current Sprint truth and adds a process guard. Required closeout proof includes focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, `process:foundation-ship`, and clean pushed main.
