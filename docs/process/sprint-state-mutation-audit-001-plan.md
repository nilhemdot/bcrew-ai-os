# SPRINT-STATE-MUTATION-AUDIT-001 Plan

## What
Build the sprint/backlog mutation-risk lane for the read-only nightly audit. V1 detects scripts, jobs, routes, and helpers that can mutate `backlog_items`, `foundation_sprints`, `foundation_sprint_items`, `plan_critic_runs`, or `change_events`.

## Why
Live Backlog is task truth. Unexpected mutation from a check script or scheduled job would recreate autonomous-dev drift and could reopen old sprints, move cards, or advance blockers without Steve plus Codex approval.

## Acceptance Criteria
- `SPRINT-STATE-MUTATION-AUDIT-001` returns a pass/fail proof status from the focused command.
- The audit identifies scheduled jobs whose command target contains mutation patterns.
- The audit identifies check scripts with write side effects and direct sprint SQL.
- Findings classify expected mutators separately from unsafe defaults.
- The audit does not call mutating scripts and does not mutate DB state.
- The proof compares DB lane counts before and after the audit command.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, live backlog, Foundation job registry, and process gates are reused.
- `lib/code-quality-nightly-audit.js` contains mutation-surface detectors.
- The report includes `SPRINT-STATE-MUTATION-AUDIT-001` findings and proposed safe-mode follow-ups.
- The proof calls real detector functions and checks no backlog lane count changed.

## Details
V1 flags scheduled `verification-runs`, unsafe active defaults in `upsertFoundationCurrentSprintOverlay`, seed-mutating `initFoundationDb` use in report paths, raw sprint SQL without `change_events`, proof scripts that mutate live sprint state then restore, durable synthetic Plan Critic ledger rows, and Action Router apply defaults. The root invariant is that nightly audits can inspect mutators but must not execute them. Behavior proof calls the actual function path for mutation scanning, scheduled job inspection, API route report payload construction, a DB lane-count before/after comparison, a report write/read round-trip, and a synthetic weak mutator fixture. Gate decision tree: static mutation scan plus focused proof first, then full `process:foundation-ship` because process, package, verifier, and job registry surfaces are touched. The focused command stays fast, targeting under 2 minutes, so Steve and the operator team can trust that report generation did not become an actor.

## Risks
Risk is over-warning on legitimate closeout scripts. Repair path is to mark expected mutators and require explicit apply/confirm flags in future cards. Risk is missing a mutation path; repair path is to add static patterns to the audit after the first report review.

## Tests
- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CODEBASE-HARDCODE-AUDIT-001 --planApprovalRef=docs/process/approvals/CODEBASE-HARDCODE-AUDIT-001.json --closeoutKey=foundation-code-quality-nightly-audit-v1 --commitRef=HEAD`

## Not Next
Do not modify existing mutator scripts in this sprint. Do not auto-pause jobs. Do not apply Action Router routes. Do not auto-create safety follow-up cards.
