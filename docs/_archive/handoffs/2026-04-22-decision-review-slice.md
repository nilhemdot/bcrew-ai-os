# 2026-04-22 Decision Review Slice

## What Closed

- `DECISION-002` first live slice is now truly live:
  - strategy watch panels show a decision-linked newest-first ledger
  - doc-scoped annotations show linked decision context
  - live backlog row is now `done`
- `DECISION-003` first live slice is now truly live:
  - `foundation-hub` now exposes `decisionReview`
  - contradiction / cleanup queue is no longer UI-only
  - verifier now checks that snapshot exists
  - live backlog row is now `done`

## What The Decision Review Snapshot Flags

- proposed decisions that still need lock / merge / rejection
- locked decisions missing source refs
- locked decisions missing provenance:
  - owner
  - confirmer
  - participants
  - context ref
- broken supersedes links
- orphan pending doc proposals
- overlap candidates inside the same decision category

## Live Proof

- `/api/foundation-hub` now returns:
  - `decisionTraceability`
  - `decisionReview`
- current live `decisionReview` snapshot:
  - `total: 2`
  - `status: pending`
  - both current items are `possible_relationship`

## Verification

- `npm run foundation:verify`
  - passes `15/15`
  - now checks `foundationHub.decisionReview`

## UI / Copy Cleanup Done

- Current State no longer says contradiction cleanup is "not built"
- Current State change infrastructure panel now treats the first decision cleanup watch as live
- deeper work is now described as:
  - richer relationship cleanup
  - deeper provenance
  - temporal truth

## Remaining Decision-Layer Work

- `DECISION-005`
- `MEMORY-005`

These are now the main open decision hardening cards after the first trace / ledger / contradiction queue slices.
