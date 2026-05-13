# Control Plane + Connector Readiness Sprint Handoff - 2026-05-12

## Status

Steve approved the next overnight sprint after the Process Repair + Verifier Independence sprint completed.

This handoff exists before implementation so the sprint context survives compaction or a fresh chat.

Live sprint ID: `control-plane-connector-readiness-2026-05-12`.

Update: `CURRENT-SPRINT-DYNAMIC-TRUTH-001` is closed under `current-sprint-dynamic-truth-v1`, `SPRINT-STAGE-GATE-001` is closed under `sprint-stage-gate-v1`, `FOUNDATION-PLAN-RECONCILE-001` is closed under `foundation-plan-reconcile-control-plane-v1`, `CONNECTOR-CREDENTIAL-001` is closed under `connector-credential-v1`, and `LLM-AUTH-AUDIT-001` is closed under `llm-auth-audit-v1`. Continue in order from `SOURCE-EXTRACTION-GAP-FOLLOWUP-001`; stop at sprint review when the six approved cards close.

## Sprint Goal

Make Foundation control-plane truth enforceable before product work resumes:

- active sprint command truth comes from live DB/backlog state, not stale hardcoded strings
- cards cannot skip Scoping -> Sprint Ready -> Building Now -> Done/Returned
- rebuild plan/state docs match shipped reality
- connector readiness is visible without storing secrets
- model route/auth truth is freshly probed
- source extraction gaps are triaged without broad ingestion

## Approved Sprint Order

1. `CURRENT-SPRINT-DYNAMIC-TRUTH-001`
2. `SPRINT-STAGE-GATE-001`
3. `FOUNDATION-PLAN-RECONCILE-001`
4. `CONNECTOR-CREDENTIAL-001`
5. `LLM-AUTH-AUDIT-001`
6. `SOURCE-EXTRACTION-GAP-FOLLOWUP-001`

## Required Process

- Open the sprint in live DB first so the dashboard shows all six cards in Scoping.
- Write full doctrine into `existing_work_check` for every card.
- Run Plan Critic and log one `plan_critic_runs` entry per card.
- Move each card through Scoping -> Sprint Ready -> Building Now -> Done This Sprint.
- Build one card at a time.
- Stop at sprint review. Do not silently roll into another sprint.

## Mandatory Dogfood Proof

`SPRINT-STAGE-GATE-001` must include the dogfood proof as acceptance criteria:

- the new gate rejects the original six-card Connector/Routing skipped state from 2026-05-12 because doctrine/stage progression was missing
- the new gate accepts the repaired after-action state
- if either assertion fails, `SPRINT-STAGE-GATE-001` is not done

This is proof for the stage gate, not a separate capability card.

## Queue For Sprint #2

Capture these as scoped follow-up cards, but do not pull them tonight:

- `ATOM-FLOW-AUTO-DEMOTION-001`
- `EXTRACT-RUN-HARDENING-EXECUTION-001`
- `RESEARCH-LANE-PURGE-001`

## Not Next

- Reply/Watching Loop
- Strategy Hub expansion
- Mycro, Skool, Loom, Zoom, Real, SocialPilot, or new external extraction implementation
- Telegram bots
- Marketing production or Brand Guardian enforcement
- Directors or Master Director rebuild
- Drive ACL Phase B mutation
- request-access emails
- broad UI polish

## Starting Point

Repo was clean and pushed at `61b4908` before this sprint started.

The active overlay before rollover is `process-repair-verifier-independence-2026-05-12`, complete with four done cards and no active blocker.
