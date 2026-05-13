# FEEDBACK-CAPTURE-001 Plan

## What

Create a durable Foundation feedback queue that can capture Steve feedback, corrections, and "remember this" system notes as reviewable records.

## Why

Important build direction currently depends on chat context and manual promotion. A code-first feedback queue keeps Foundation direction from disappearing without creating an autonomous agent.

## Acceptance Criteria

- A schema-backed feedback record exists with source, source ref, summary, raw text, category placeholder, routing tag placeholder, priority, evidence ref, created by, and review status.
- Capture returns a durable item and does not mutate backlog, decisions, docs, sprints, or code.
- Duplicate/same-source capture is visible by source ref or hash metadata instead of silently overwriting.
- A black-box function path and API-style snapshot prove capture behavior.
- Plan Critic has a 9.8+ pass row before build.

## Definition Of Done

- Feedback capture is reusable by future chat/archive surfaces.
- Focused proof inserts or exercises a synthetic capture and verifies review status is `captured`.
- The sprint closeout and verifier cover the no-auto-routing invariant.

## Details

Reuse existing code in `lib/foundation-db.js`, `change_events`, current sprint helpers, and Foundation API patterns. Reuse existing docs in `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and this plan. Reuse existing scripts through a new focused `process:foundation-control-compression-check`.

The root invariant is: capturing feedback is deterministic storage, not routing or building. The proof must call the function/DB path and reject substring-only proof.

## Risks

- Captured feedback could become another hidden queue. Repair path: expose counts and latest items in the Foundation control snapshot.
- Capture could accidentally route work. Repair path: fail closed if `writesBacklog`, `opensSprint`, or `appliesDecision` is true.

## Tests

- `npm run process:foundation-control-compression-check -- --card=FEEDBACK-CAPTURE-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Plan Critic Reinforcement

Proof command for `FEEDBACK-CAPTURE-001`: `npm run process:foundation-control-compression-check -- --card=FEEDBACK-CAPTURE-001 --json`. The check should prove behavior through an actual function path, API route snapshot, database round-trip fixture, and synthetic weak case; no substring-only proof is accepted. Gate decision: focused proof for the card, full `foundation:verify`, and full `process:foundation-ship` because the blast radius touches database, server, and verifier paths. Operator value for Steve: this unlocks higher quality Foundation work because feedback becomes durable and reviewable instead of depending on chat memory. Keep the focused proof fast, under 2 minutes, so it is used by default.

This is a narrow bounded V1 card with explicit not-next boundaries, no autonomous action, and no writes outside the feedback queue. Reuse existing docs in the current plan/current state, existing scripts including `backlog:hygiene` and `foundation:verify`, live backlog, and current sprint state. Plan Critic score for `FEEDBACK-CAPTURE-001` must pass or revise at the 9.8 threshold before build.

## Not Next

- Do not send messages.
- Do not mutate backlog, decisions, docs, sprints, or code from captured feedback.
- Do not add LLM classification in this card.
