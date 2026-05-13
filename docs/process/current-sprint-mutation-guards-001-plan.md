# CURRENT-SPRINT-MUTATION-GUARDS-001 Plan

## What

Guard active sprint overlay writes so the current sprint cannot be accidentally closed, replaced, or item-reset by a broad helper call.

## Why

The deep audit found `upsertFoundationCurrentSprintOverlay()` defaults status to active, closes other active sprints, deletes target sprint items, and reinserts them. That is too much blast radius for an unguarded helper.

## Acceptance Criteria

- Active sprint writes require explicit apply posture.
- Opening or replacing an active sprint requires the expected previous active sprint id.
- Replacing sprint items creates a diff preview or change-event record for removed/replaced items.
- Helper defaults cannot close other active sprints by accident.
- A dogfood proof replays the old broad helper path and proves it is blocked without expected previous active sprint id plus explicit apply posture.
- `CURRENT-SPRINT-MUTATION-GUARDS-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- Current Sprint mutation helper has safe defaults.
- Callers that legitimately open or roll sprints pass explicit posture.
- Focused proof covers blocked unsafe call and allowed explicit call.
- Sprint item closes only after dogfood proof and ship gates pass.

## Details

Existing code to reuse: `upsertFoundationCurrentSprintOverlay()`, `getActiveFoundationCurrentSprint()`, foundation sprint tables, change events, sprint stage gate scripts, and current sprint API helpers. Existing docs to reuse: deep audit, runtime safety plan, AGENTS.md, current rebuild plan/state. Existing scripts to reuse: `process:runtime-safety-hardening-check`, `backlog:hygiene`, `foundation:verify`, and ship gates.

This card hardens the mutation path. It does not replace the sprint system or redesign the UI.

The dogfood proof must exercise black-box behavior through the actual current sprint mutation helper path and a synthetic active sprint state. No substring-only proof is acceptable.

Gate decision: focused proof for blocked unsafe helper calls and allowed explicit apply calls, then full `process:foundation-ship` because this touches active sprint truth. Operator value: Steve can trust sprint stage and active blocker state will not be overwritten by a casual proof/check command. Speed bound: the focused proof should target under 2 minutes by using synthetic transaction-scoped sprint rows.

## Risks

- Existing sprint-opening scripts may break if they do not pass explicit posture. Repair path: update only legitimate sprint open/close callers with expected active sprint id.
- Too much change here could block sprint operations. Repair path: add a clear manual repair command or documented override with expected id.
- Dogfood must use actual helper behavior against synthetic/transaction-scoped state where possible.

## Tests

- `npm run process:runtime-safety-hardening-check -- --card=CURRENT-SPRINT-MUTATION-GUARDS-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CURRENT-SPRINT-MUTATION-GUARDS-001 --planApprovalRef=docs/process/approvals/CURRENT-SPRINT-MUTATION-GUARDS-001.json --closeoutKey=foundation-runtime-safety-hardening-v1 --commitRef=HEAD`

## Not Next

- Do not rebuild Current Sprint UI.
- Do not silently auto-open follow-up sprints.
- Do not bypass the dogfood proof because a caller is inconvenient.
- Do not broaden into backlog concurrency.
