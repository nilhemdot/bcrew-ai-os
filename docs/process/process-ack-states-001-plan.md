# PROCESS-ACK-STATES-001 Plan

## What

Create governed acknowledged states for accepted gaps, intentional pauses, and known risks.

## Why

Not every gap should block every sprint, but chat memory is not an exception system. Acknowledged states need owner, reason, review date, expiry, and related card/source refs so accepted gaps stay visible and do not become permanent silence.

## Acceptance Criteria

- A schema-backed acknowledged-state record exists with target type/id, owner, reason, status, review date, expiry, related cards/sources, and created by.
- Expired acknowledgements are surfaced for review.
- Acknowledgements can be read by verifier/audit code as advisory context.
- A black-box function path proves valid, expired, and invalid/no-owner cases.

## Definition Of Done

- Ack states are available through a reusable function and Foundation API snapshot.
- Focused proof verifies owner/reason/review-date requirements and expiry behavior.
- Ack states do not suppress critical verifier failures by default.

## Details

Reuse current readiness gates, backlog/source IDs, and verifier patterns. V1 creates a registry and status computation; specific verifier exception integration remains explicit and card-owned.

## Risks

- Ack states can hide work. Repair path: require expiry/review dates and keep critical failures unsuppressed unless a future card explicitly wires an exception.
- Ack states can become manual clutter. Repair path: monitor expired/open counts.

## Tests

- `npm run process:foundation-control-compression-check -- --card=PROCESS-ACK-STATES-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Plan Critic Reinforcement

Proof command for `PROCESS-ACK-STATES-001`: `npm run process:foundation-control-compression-check -- --card=PROCESS-ACK-STATES-001 --json`. Existing code to reuse includes readiness gates, source/backlog IDs, current sprint, and verifier/audit patterns. The check should prove behavior through an actual function path, API route snapshot, database round-trip fixture, and synthetic weak case; no substring-only proof is accepted. Gate decision: focused proof for the card, full `foundation:verify`, and full `process:foundation-ship` because the blast radius touches database, server, and verifier paths. Operator value for Steve: this unlocks better quality by keeping accepted gaps visible without re-burning time on the same known pause. Keep the focused proof fast, under 2 minutes, so it is used by default.

This is a narrow bounded V1 card with explicit not-next boundaries, no autonomous action, and no automatic verifier suppression. Reuse existing docs in the current plan/current state, existing scripts including `backlog:hygiene` and `foundation:verify`, live backlog, and current sprint state. Plan Critic score for `PROCESS-ACK-STATES-001` must pass or revise at the 9.8 threshold before build.

## Not Next

- Do not suppress critical verifier failures automatically.
- Do not mark existing gaps acknowledged without owner approval.
