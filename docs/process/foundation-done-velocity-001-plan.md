# FOUNDATION-DONE-VELOCITY-001 Plan

## What

Build reliable Foundation done-velocity visibility from closeout-backed done cards and sprint completion dates.

## Why

Steve needs to see whether Foundation work is actually moving. Velocity is only useful if it is honest about source dates and does not guess from stale seed data.

## Acceptance Criteria

- Velocity output counts done Foundation cards by day and week.
- Date source is explicit: closeout/build-log/sprint item/backlog updated timestamp.
- Inferred or missing dates are labeled honestly.
- Output includes recent throughput, active scoped/research counts, and warning count.
- A black-box function path proves velocity calculation from live rows.

## Definition Of Done

- Done velocity is exposed through a reusable function and Foundation API snapshot.
- Focused proof covers at least one live done card and one missing/inferred date case.
- No cards are changed by the velocity report.

## Details

Reuse `backlog_items`, `foundation_sprint_items`, `foundation_sprints`, Recent Builds closeout data, and the current Foundation API. V1 is data/API-first and not a chart polish card.

## Risks

- Done dates can be unreliable. Repair path: include `dateConfidence` and do not pretend inferred dates are exact.
- Chart desire can turn into UI polish. Repair path: ship structured velocity data first.

## Tests

- `npm run process:foundation-control-compression-check -- --card=FOUNDATION-DONE-VELOCITY-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Plan Critic Reinforcement

Proof command for `FOUNDATION-DONE-VELOCITY-001`: `npm run process:foundation-control-compression-check -- --card=FOUNDATION-DONE-VELOCITY-001 --json`. Existing code to reuse includes backlog done rows, current sprint rows, Recent Builds closeouts, build log, and current Foundation API paths. The check should prove behavior through an actual function path, API route snapshot, database round-trip fixture, and synthetic weak case; no substring-only proof is accepted. Gate decision: focused proof for the card, full `foundation:verify`, and full `process:foundation-ship` because the blast radius touches database, server, and verifier paths. Operator value for Steve: this unlocks a real workflow signal, whether Foundation is moving fast enough and where throughput is slowing. Keep the focused proof fast, under 2 minutes, so it is used by default.

This is a narrow bounded V1 card with explicit not-next boundaries, no autonomous action, and no guessed authoritative dates. Reuse existing docs in the current plan/current state, existing scripts including `backlog:hygiene` and `foundation:verify`, live backlog, and current sprint state. Plan Critic score for `FOUNDATION-DONE-VELOCITY-001` must pass or revise at the 9.8 threshold before build.

## Not Next

- Do not build broad dashboard polish.
- Do not backfill guessed history as authoritative truth.
