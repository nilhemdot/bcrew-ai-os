# SPRINT-MASTER-ADVISOR-001 Plan

## What

Create a Sprint Master Advisor that proposes next sprint options from live backlog, blockers, dependencies, and current sprint state without opening or mutating a sprint.

## Why

Steve wants to understand the plan and approve it with Codex. The useful part of the old sprint agent is recommendation quality, not automatic dev.

## Acceptance Criteria

- Advisor output includes sprint theme, candidate cards, why now, dependencies, blockers needing Steve, not-next boundaries, proof burden, and risk.
- Advisor never calls `upsertFoundationCurrentSprintOverlay` or writes sprint rows.
- Output is explicitly proposal-only and requires Steve+Codex approval.
- A black-box function path proves recommendations are generated from live backlog state.

## Definition Of Done

- Sprint advisor produces at least three proposal options from current Foundation backlog buckets.
- Focused proof verifies no new sprint is opened and active sprint ID is unchanged.
- The next extraction sprint remains named but not opened.

## Details

Reuse live `backlog_items`, current sprint helpers, research purge report, Build Intel intake closeout, and current plan/state doctrine. V1 uses deterministic scoring and dependency notes, not an LLM agent.

## Risks

- Advisor may look like autonomous dev. Repair path: write flags stay false and output names approval requirement.
- Recommendations can be too broad. Repair path: cap options and candidate count.

## Tests

- `npm run process:foundation-control-compression-check -- --card=SPRINT-MASTER-ADVISOR-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Plan Critic Reinforcement

Proof command for `SPRINT-MASTER-ADVISOR-001`: `npm run process:foundation-control-compression-check -- --card=SPRINT-MASTER-ADVISOR-001 --json`. Existing code to reuse includes live backlog, current sprint, research purge, Build Intel closeout, and current plan/state paths. The check should prove behavior through an actual function path, API route snapshot, database round-trip fixture, and synthetic weak case; no substring-only proof is accepted. Gate decision: focused proof for the card, full `foundation:verify`, and full `process:foundation-ship` because the blast radius touches database, server, and verifier paths. Operator value for Steve: this unlocks better sprint quality and speed because Codex can bring proposed options while Steve still approves the sprint. Keep the focused proof fast, under 2 minutes, so it is used by default.

This is a narrow bounded V1 card with explicit not-next boundaries, no autonomous action, and no sprint mutation. Reuse existing docs in the current plan/current state, existing scripts including `backlog:hygiene` and `foundation:verify`, live backlog, and current sprint state. Plan Critic score for `SPRINT-MASTER-ADVISOR-001` must pass or revise at the 9.8 threshold before build.

## Not Next

- Do not open the recommended sprint.
- Do not mutate card lanes or ranks.
- Do not build autonomous dev.
