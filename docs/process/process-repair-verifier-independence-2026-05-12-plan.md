# Process Repair + Verifier Independence Sprint Plan

Sprint ID: `process-repair-verifier-independence-2026-05-12`

## What
Run a repair sprint that fixes the skipped Connector/Routing sprint process records and then removes the verifier shortcut that let old sprint checks pass from current sprint state.

## Why
Steve saw `Doctrine missing` on the dashboard for six cards that had already shipped. That warning was real. The repair sprint must model the process it repairs: scoped doctrine first, Plan Critic logging second, Sprint Ready third, Building Now fourth, then done proof.

## Acceptance Criteria
- The sprint opens as the active sprint with four cards: `SPRINT-PROCESS-REPAIR-001`, `VERIFIER-SPRINT-INDEPENDENCE-001`, `VERIFIER-MODULAR-SPLIT-001`, and `PROCESS-ROOT-VS-PATCH-001`.
- Each card has a plan document with What, Why, Acceptance Criteria, Definition Of Done, Details, Risks, Tests, and Not Next.
- Each card has a complete `existing_work_check` payload before code/data repair resumes.
- Each card has a durable `plan_critic_runs` pass row with score at least 9.8.
- The sprint records Scoping, Sprint Ready, and Building Now updates in live `foundation_sprints` change events without backdating.
- The repair does not fake skipped stage history; it records the skipped Connector/Routing progression as after-action repair.
- Future sprint openers must publish a visible Scoping-only state to the dashboard before Plan Critic scoring, Sprint Ready advancement, Building Now movement, or repair/build work.
- The Connector/Routing Truth sprint records are repaired as after-action truth, not fake pre-build history.
- Old sprint verifier checks stop passing because a later sprint is active.

## Definition Of Done
- `SPRINT-PROCESS-REPAIR-001` closes with six Connector/Routing sprint items repaired and no done card as active blocker.
- `VERIFIER-SPRINT-INDEPENDENCE-001` closes with the active-sprint escape hatch removed from `scripts/foundation-verify.mjs`.
- `VERIFIER-MODULAR-SPLIT-001` is scoped with an approved module boundary and not mixed into the first verifier-independence patch.
- `PROCESS-ROOT-VS-PATCH-001` is scoped for Plan Critic hardening and not used to silently excuse the current repair.

## Details
Reuse existing Current Sprint overlay tables, `plan_critic_runs`, Plan Critic scoring, backlog lanes, change events, and focused process proof scripts. This sprint is process integrity work only. It absorbs the partial in-progress repair honestly: earlier data/code edits happened before formal sprint opening, and this sprint records that as the defect being repaired.

## Risks
The main risk is repairing a skipped process by skipping the process again. The repair path is to leave the sprint open, record the skipped order honestly, and fail the check if Plan Critic rows or stage progression are missing.

## Tests
- `npm run process:repair-verifier-sprint-check -- --open --json`
- `npm run process:repair-verifier-sprint-check -- --close-process-repair --json`
- `npm run process:plan-critic-check -- --json=true`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next
Do not start Reply Parser, Watching Items, Strategy expansion, Marketing production, Telegram bots, Directors, new external connector builds, Drive permissions mutation, or `MEETING-VAULT-ACL-001` Phase B from this sprint.
