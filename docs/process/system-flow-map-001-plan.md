# SYSTEM-FLOW-MAP-001 Plan

## What

Render a live Foundation flow map showing source/signal -> crawl/item -> artifact/atom -> synthesis/action/proposal -> review -> backlog/build/ship.

## Why

Steve remembers the old visual control panel because it made the system understandable. The new Foundation has real substrate but needs one clear view of how changes flow upward.

## Acceptance Criteria

- Flow map is generated from live source contracts, extraction targets/jobs, atom/synthesis/action counts, Research Inbox/feedback proposal gates, backlog, current sprint, and build log state.
- Output includes Mermaid text plus structured nodes/edges for API consumers.
- Health/status colors are derived from live counts and known states.
- No static diagram becomes source truth.
- A black-box function/API path proves generation from live state.

## Definition Of Done

- System flow map is available through a reusable function and Foundation API snapshot.
- Focused proof verifies expected stages and edges exist from live data.
- The map is informational only; it does not mutate rows.

## Details

Reuse `getSourceContracts`, Foundation job/extraction state, intelligence atom/synthesis/action tables, current sprint helpers, backlog rows, and build log closeouts. V1 may be Mermaid/API-first rather than full UI polish.

## Risks

- A map can lie if it is static. Repair path: compute from live snapshots and expose generated timestamp/source counts.
- A map can become broad UI work. Repair path: API/Mermaid-first, no broad UI polish.

## Tests

- `npm run process:foundation-control-compression-check -- --card=SYSTEM-FLOW-MAP-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Plan Critic Reinforcement

Proof command for `SYSTEM-FLOW-MAP-001`: `npm run process:foundation-control-compression-check -- --card=SYSTEM-FLOW-MAP-001 --json`. Existing code to reuse includes source contracts, extraction targets, intelligence atom/synthesis/action rows, backlog, current sprint, and build-log paths. The check should prove behavior through an actual function path, API route snapshot, database round-trip fixture, and synthetic weak case; no substring-only proof is accepted. Gate decision: focused proof for the card, full `foundation:verify`, and full `process:foundation-ship` because the blast radius touches database, server, and verifier paths. Operator value for Steve: this unlocks a useful thing from the old control panel, a live view of how source truth flows upward. Keep the focused proof fast, under 2 minutes, so it is used by default.

This is a narrow bounded V1 card with explicit not-next boundaries, no autonomous action, and no static source-truth diagram. Reuse existing docs in the current plan/current state, existing scripts including `backlog:hygiene` and `foundation:verify`, live backlog, and current sprint state. Plan Critic score for `SYSTEM-FLOW-MAP-001` must pass or revise at the 9.8 threshold before build.

## Not Next

- Do not rebuild the old dashboard.
- Do not add broad UI polish.
- Do not make static diagrams source truth.
