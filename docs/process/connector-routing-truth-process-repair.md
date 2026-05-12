# Connector Routing Truth Process Repair

Card: SPRINT-PROCESS-REPAIR-001

## What
Repair the Connector + Routing Truth sprint record after the six shipped cards were recorded directly as done. This is an honest after-action repair, not a claim that the cards moved through Scoping, Sprint Ready, and Building Now in real time.

## Why
The work shipped real behavior, but the sprint system caught missing doctrine/existing-work checks and a done card left as the active blocker. Foundation has to expose that drift and repair the records instead of hiding the warning or pretending the skipped stages happened.

## Acceptance Criteria
- The six Connector + Routing Truth cards keep their real `done_this_sprint` state and closeout keys.
- Each of the six cards has a non-empty existing-work/doctrine check with code, docs, scripts, policy, reused surfaces, not-rebuilt boundaries, exact gap, over-broad risk, ready-by, and ready-at fields.
- The sprint active blocker is not a done card.
- The sprint record states that the doctrine was repaired after the fact.
- The verifier no longer passes old sprint checks only because `connector-routing-truth-2026-05-12` is active.

## Definition Of Done
- Current Sprint no longer renders `Doctrine missing` for the six shipped Connector + Routing Truth cards.
- Live `foundation_sprint_items` records contain the repaired doctrine payloads.
- Live `foundation_sprints.active_blocker_card_id` points to the next not-done repair card.
- `scripts/foundation-verify.mjs` uses shipped-card/closeout evidence for old sprint progression checks instead of the Connector/Routing active-sprint shortcut.

## Details
The repair preserves the true timeline:

- `ATOM-PROMOTION-DIAGNOSE-001`, `SPRINT-DB-RECONCILE-001`, `VERIFY-GATE-TIERING-FIX-001`, `PLAN-CRITIC-LOG-001`, `SOURCE-CONNECTOR-MATRIX-001`, and `SOURCE-HUB-ROUTING-MATRIX-001` shipped as one fast truth sprint.
- The sprint process did not record full doctrine/progression for each card before build.
- `PLAN-CRITIC-LOG-001` is the only card with durable `plan_critic_runs` entries from the sprint. Earlier cards predated the durable table; later cards should have had per-card runs and did not.
- Repairing doctrine now means recording what existing work and boundaries governed the shipped work. It does not backdate Plan Critic or fake stage history.

## Risks
The main risk is turning the warning off without fixing the underlying invariant. The repair must keep the skip visible in status text and follow-up cards. If proof fails, leave `SPRINT-PROCESS-REPAIR-001` active and do not pull Reply/Watching Loop.

## Tests
- Query `foundation_sprint_items` for empty `existing_work_check` on the six cards.
- Query `foundation_sprints` to ensure active blocker is not a done card.
- Search `scripts/foundation-verify.mjs` for Connector/Routing active-sprint shortcut use.
- Run focused sprint DB reconcile proof and backlog hygiene.

## Not Next
Do not start Reply Parser, Watching Items, Strategy expansion, Marketing production, Telegram bots, Directors, new external connector builds, Drive permission mutation, or Meeting Vault Phase B from this repair.
