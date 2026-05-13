# VERIFIER-INCREMENTAL-COVERAGE-001 Plan

## What

Add an incremental verifier coverage map that selects focused proof for changed Foundation surfaces and falls back to full verification for protected paths.

## Why

Full `foundation:verify` is valuable but heavy. Foundation needs faster routine proof without weakening the final ship gate or protected substrate checks.

## Acceptance Criteria

- Changed files/card IDs map to focused checks when safe.
- Server, security, auth, tier, database/schema, runtime, extraction, intelligence, canonical verifier, package/dependency, and source-contract changes require full verification.
- No-op/static changes can return a static/focused recommendation with reason.
- Output names required commands and dependency reasons.
- A black-box function path proves safe focused and unsafe full fallback cases.

## Definition Of Done

- Incremental verifier planner is available through a reusable function and Foundation API snapshot.
- Focused proof covers static, focused, and full-risk cases.
- Full Foundation ship gate remains required for this sprint closeout.

## Details

Reuse `lib/process-verify-gate-tiering.js`, current Foundation gate decision tree, existing verifier behavior rules, and process hook proof patterns. V1 plans coverage; it does not replace `foundation:verify`.

## Risks

- Incremental proof could become a bypass. Repair path: full-risk paths always fall back to full verification and the final sprint ship still runs `foundation:verify`.
- Dependency mapping can be incomplete. Repair path: unknown surfaces default to full.

## Tests

- `npm run process:foundation-control-compression-check -- --card=VERIFIER-INCREMENTAL-COVERAGE-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Plan Critic Reinforcement

Proof command for `VERIFIER-INCREMENTAL-COVERAGE-001`: `npm run process:foundation-control-compression-check -- --card=VERIFIER-INCREMENTAL-COVERAGE-001 --json`. Existing code to reuse includes `lib/process-verify-gate-tiering.js`, gate hook proof patterns, current sprint, and foundation verifier paths. The check should prove behavior through an actual function path, API route snapshot, database round-trip fixture, and synthetic weak case; no substring-only proof is accepted. Gate decision: focused proof for the card, full `foundation:verify`, and full `process:foundation-ship` because the blast radius touches database, server, and verifier paths. Operator value for Steve: this unlocks speed without losing quality because small safe changes get proportional proof while protected paths still require full verification. Keep the focused proof fast, under 2 minutes, so it is used by default.

This is a narrow bounded V1 card with explicit not-next boundaries, no autonomous action, and no verifier bypass. Reuse existing docs in the current plan/current state, existing scripts including `backlog:hygiene` and `foundation:verify`, live backlog, and current sprint state. Plan Critic score for `VERIFIER-INCREMENTAL-COVERAGE-001` must pass or revise at the 9.8 threshold before build.

## Not Next

- Do not replace the canonical verifier.
- Do not weaken pre-push or ship gates.
- Do not bypass full verification for protected paths.
