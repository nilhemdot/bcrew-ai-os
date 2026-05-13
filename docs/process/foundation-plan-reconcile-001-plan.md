# FOUNDATION-PLAN-RECONCILE-001 Plan

## What

Reconcile rebuild docs and handoff references so current plan/state reflect the actual shipped sequence: Source Once-Over closed, Connector/Routing Truth closed, Process Repair closed, and Control Plane + Connector Readiness is the active sprint.

## Why

Docs still describing older active sprint state create a second source of truth. The operator value is that Steve, tomorrow's chat, and verifier checks can read one coherent rebuild command story without relying on chat memory.

## Acceptance Criteria

- `FOUNDATION-PLAN-RECONCILE-001` gets a Plan Critic pass score at or above 9.8; revise blocks Sprint Ready.
- `docs/rebuild/current-plan.md` records the Process Repair closeout and active Control Plane sprint.
- `docs/rebuild/current-state.md` records the same sprint sequence and current open work.
- The control-plane handoff is referenced as the current overnight sprint handoff.
- The docs explicitly queue, but do not pull, atom-flow auto-demotion, extract retry execution, and research-lane purge.
- The proof command `npm run process:foundation-plan-reconcile-check -- --json` reads live Current Sprint API state and rejects stale markers that still claim Source Once-Over or Process Repair is the active sprint.

## Definition Of Done

- Plan/state docs agree with live Current Sprint API.
- The next-card narrative says stop at sprint review, not auto-roll into product work.
- The proof uses live API/doc comparison behavior, not source substring alone.

## Details

Reuse existing code in the Current Sprint API builder only as a read source. Reuse existing docs `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and handoffs from 2026-05-12. Reuse existing scripts where possible, live backlog truth, and Current Sprint overlay behavior. Reuse the live `/api/foundation/current-sprint` payload as operational truth and update docs to match it.

The behavior proof reads the live Current Sprint API route through the actual function path, reads the docs, compares named sprint IDs/cards/next action, performs a round-trip comparison against live API output, and rejects stale active-sprint claims. It also rejects weak marker-only proof. Gate decision tree: static, focused, or full is chosen by blast radius; this card is a bounded doc/process reconcile, so use a focused proof unless code/verifier substrate changes require full `process:foundation-ship`.

This gives Steve useful operator value: a real workflow where the rebuild docs, dashboard, and backlog tell the same story, improving speed and quality for tomorrow's review. The V1 is thin and proportional, with a fast focused doc/API comparison expected to run in under 2 minutes.

## Risks

- Risk: over-editing active doctrine. Mitigation: update only current state/order and sprint closeout sections.
- Risk: docs become another backlog. Mitigation: link back to live Backlog and Current Sprint as task truth.
- Risk: stale claims remain in long historical sections. Mitigation: active sections must be current; archives may remain historical when clearly labeled.
- Repair path: fail closed, revise docs, reopen the card, and do not advance if live API and docs disagree.

## Tests

- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run backlog:hygiene -- --json`
- Focused gate proof if only docs/process surfaces changed

## Not Next

Do not rewrite strategy doctrine, build UI, change source contracts, implement source ingestion, start Reply/Watching Loop, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions.
