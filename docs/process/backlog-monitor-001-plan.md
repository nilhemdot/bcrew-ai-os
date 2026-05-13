# BACKLOG-MONITOR-001 Plan

## What

Generate deterministic backlog health reports for stale cards, duplicate-looking cards, proof-risk cards, research-lane survivors, ghost completions, and deferred/parked items ready for review.

## Why

Steve has a large Foundation backlog. The old backlog monitor should have been code, not an LLM agent. A report-only monitor compresses review without changing task truth.

## Acceptance Criteria

- Backlog monitor reads live `backlog_items` and current sprint/closeout state.
- Report counts total, Foundation scoped, Foundation research, P0/P1 active, stale candidates, duplicate candidates, proof-risk candidates, and research survivors.
- Report output is proposal-only and includes reasons.
- No card lanes, ranks, priorities, or statuses are changed.
- A black-box function path over live/synthetic rows proves behavior and rejects substring-only proof.

## Definition Of Done

- Backlog monitor output is available through a reusable function and Foundation API snapshot.
- Focused proof verifies row counts before/after monitor are unchanged.
- Research purge survivors are surfaced without automatic promotion.

## Details

Reuse `backlog_items`, research purge output, `backlog:hygiene`, Recent Builds closeout data, and existing Foundation API patterns. V1 is code-only report generation.

## Risks

- Duplicate detection can be noisy. Repair path: label as candidates, not findings.
- Ghost completion logic can overreach. Repair path: only report cards with strong closeout/status mismatch signals.

## Tests

- `npm run process:foundation-control-compression-check -- --card=BACKLOG-MONITOR-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Plan Critic Reinforcement

Proof command for `BACKLOG-MONITOR-001`: `npm run process:foundation-control-compression-check -- --card=BACKLOG-MONITOR-001 --json`. Existing code to reuse includes live backlog, current sprint, closeout/build-log, research purge, and backlog hygiene paths. The check should prove behavior through an actual function path, API route snapshot, database round-trip fixture, and synthetic weak case; no substring-only proof is accepted. Gate decision: focused proof for the card, full `foundation:verify`, and full `process:foundation-ship` because the blast radius touches database, server, and verifier paths. Operator value for Steve: this unlocks faster backlog review and better sprint quality without turning cleanup into an LLM agent. Keep the focused proof fast, under 2 minutes, so it is used by default.

This is a narrow bounded V1 card with explicit not-next boundaries, no autonomous action, and no backlog mutation. Reuse existing docs in the current plan/current state, existing scripts including `backlog:hygiene` and `foundation:verify`, live backlog, and current sprint state. Plan Critic score for `BACKLOG-MONITOR-001` must pass or revise at the 9.8 threshold before build.

## Not Next

- Do not move, delete, close, rank, or reprioritize backlog cards.
- Do not replace `backlog:hygiene`.
