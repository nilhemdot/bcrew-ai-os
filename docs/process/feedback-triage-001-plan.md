# FEEDBACK-TRIAGE-001 Plan

## What

Add deterministic, proposal-only triage over captured Foundation feedback.

## Why

The old feedback agents were useful because they surfaced what needed action, but dangerous when they acted like autonomous routing/build agents. V1 keeps the useful classification and removes auto-apply behavior.

## Acceptance Criteria

- Triage classifies captured feedback into bug, process, source, strategy, tooling, card-context, or operator-preference.
- Triage proposes a destination and reason without applying it.
- Stale unresolved feedback can be flagged for review.
- Ambiguous feedback stays `needs_review`; no LLM call is required in V1.
- A black-box function path proves proposal-only behavior and rejects substring-only proof.

## Definition Of Done

- Feedback triage output contains `proposalOnly: true`, destination, reason, confidence, and explicit write flags set false.
- Focused proof covers clear bug/process/card-context cases plus an ambiguous case.
- No backlog, sprint, decision, or doc rows are mutated by triage.

## Details

Reuse the new feedback queue, backlog card IDs, existing current sprint state, and backlog hygiene patterns. Keep routing rules as code. Add LLM classification only later if deterministic rules are not enough.

## Risks

- Rules can over-classify. Repair path: ambiguous items stay review-only.
- Proposal output can be mistaken for approval. Repair path: all outputs carry `requiresSteveCodexApproval: true`.

## Tests

- `npm run process:foundation-control-compression-check -- --card=FEEDBACK-TRIAGE-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Plan Critic Reinforcement

Proof command for `FEEDBACK-TRIAGE-001`: `npm run process:foundation-control-compression-check -- --card=FEEDBACK-TRIAGE-001 --json`. Existing code to reuse includes the feedback queue, live backlog, current sprint, and backlog hygiene paths. The check should prove behavior through an actual function path, API route snapshot, database round-trip fixture, and synthetic weak case; no substring-only proof is accepted. Gate decision: focused proof for the card, full `foundation:verify`, and full `process:foundation-ship` because the blast radius touches database, server, and verifier paths. Operator value for Steve: this unlocks higher quality routing without autonomous dev because triage proposes work instead of applying it. Keep the focused proof fast, under 2 minutes, so it is used by default.

This is a narrow bounded V1 card with explicit not-next boundaries, no autonomous action, and no writes outside proposed triage metadata. Reuse existing docs in the current plan/current state, existing scripts including `backlog:hygiene` and `foundation:verify`, live backlog, and current sprint state. Plan Critic score for `FEEDBACK-TRIAGE-001` must pass or revise at the 9.8 threshold before build.

## Not Next

- Do not auto-create backlog cards.
- Do not auto-route decisions or docs.
- Do not open or modify sprints.
