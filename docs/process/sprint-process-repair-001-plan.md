# SPRINT-PROCESS-REPAIR-001 Plan

## What
Repair the six Connector/Routing Truth sprint card records as honest after-action doctrine and move the active blocker away from a done card.

## Why
Steve needs the dashboard to tell the truth. The useful operator behavior is that a shipped card cannot show `Doctrine missing`, and a done card cannot stay as the active blocker, without the repair pretending the skipped Scoping, Sprint Ready, and Building Now steps happened earlier.

## Acceptance Criteria
- The six shipped Connector/Routing cards keep their real done state.
- Each shipped card has a complete `existing_work_check` payload with existing code, docs, scripts, policy, reused surfaces, not-rebuilt boundaries, exact gap, over-broad risk, ready-by, and ready-at.
- The repaired records point to `docs/process/connector-routing-truth-process-repair.md`.
- The repair status explicitly says this was after-action repair and does not fake historical stage progression.
- The current active blocker is a not-done card in the Process Repair sprint.
- `SPRINT-PROCESS-REPAIR-001` has a durable Plan Critic pass row with score >= 9.8 before the repair closes.
- Proof command `npm run process:repair-verifier-sprint-check -- --close-process-repair --json` reads the live DB and returns zero missing doctrine fields.

## Definition Of Done
- Current Sprint no longer shows `Doctrine missing` for the active repair card.
- The closed Connector/Routing sprint records have non-empty doctrine fields for all six shipped cards.
- `SPRINT-PROCESS-REPAIR-001` moves to done only after DB proof confirms zero missing doctrine fields.
- The next active blocker is `VERIFIER-SPRINT-INDEPENDENCE-001`.

## Details
This is a tight V1 card: repair only the skipped sprint records and active-blocker integrity. Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth: `foundation_sprints`, `foundation_sprint_items`, `change_events`, `plan_critic_runs`, `lib/foundation-current-sprint.js`, `public/foundation.js`, and `scripts/process-sprint-db-reconcile-check.mjs`.

Behavior proof calls the actual function path and DB/API round-trip through the process repair checker, then reads the real sprint item records. Substring-only proof is rejected; the check must inspect actual `existing_work_check` fields and active sprint state.

Gate decision: full proof is required because the repair touches database-backed sprint state and canonical verifier/process behavior. Static and focused checks are still used for syntax and the narrow process script, but blast radius requires `foundation:verify` or `process:foundation-ship` before trusting closeout.

Operator value for Steve and the team: this unlocks quality and speed by making the dashboard warning actionable instead of noisy, while keeping the repair proportional and fast enough to run by default.

## Risks
Risk is hiding the warning instead of fixing the invariant. The repair path is fail closed: keep `SPRINT-PROCESS-REPAIR-001` building, keep the skipped-process note visible, and do not pull product work.

## Tests
- `npm run process:repair-verifier-sprint-check -- --open --json`
- `npm run process:repair-verifier-sprint-check -- --close-process-repair --json`
- `npm run backlog:hygiene -- --json`

## Not Next
Do not backdate fake stage history, do not start Reply/Watching Loop, do not build new connectors, do not mutate Drive permissions, do not run `MEETING-VAULT-ACL-001` Phase B, and do not patch the dashboard to suppress the warning.
