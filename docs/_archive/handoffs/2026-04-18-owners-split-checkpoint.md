# Owners Split Checkpoint

Date: `2026-04-18`

Purpose:

- preserve the real outcome of the `Split Cal` + `Agent Splits` walkthrough
- make sure this work does not have to be redone before the next Owners tab

## What Is Locked

- `Split Cal` is not a source of truth
  - it is a thin deal-level calculator on top of:
    - manual subject-deal inputs
    - `Agent Splits`
    - `ADMIN ONLY - Deal Data Entry`
- `Split Cal` exists to split one deal correctly across threshold bands
  - including apprenticeship crossover
  - and multi-band blended payout on one deal
- apprentice is effectively Level `0`
- real post-apprentice ladder is only:
  - Level `1`
  - Level `2`
  - Level `3`
- old Level `4` row is stale template residue, not live business logic

## Agent Splits Rules Now Locked

- the tab is a row-by-row contract system
- it is not one universal split model

Confirmed patterns:

1. flat split rows
   - example: `2026 Matt Allman`
   - flat `50/50`
   - no extra levels

2. apprentice to 3-level ladder
   - example: `2026 Roland Ross`
   - company deal side stays flat at `45%`
   - agent deal side climbs `70% -> 80% -> 90%`

3. apprentice to flat split with mentor share
   - example: `2026 Mustafa Sherzaee`
   - apprentice:
     - company `40`
     - mentor `30`
     - agent `30`
   - after apprenticeship:
     - flat `50/50`

4. fuzzy rows
   - do not infer custom logic from them
   - treat as incomplete / under-maintained until Steve or a governed contract layer defines them

## Current Accountability Rule

- ops owns keeping these rows accurate today
- fuzzy rows are an accountability failure, not an acceptable gray area

## Durable Sources Updated

- [docs/source-notes/owners-dashboard.md](/Users/bensoncrew/bcrew-ai-os/docs/source-notes/owners-dashboard.md)
- [memory/2026-04-18.md](/Users/bensoncrew/bcrew-ai-os/memory/2026-04-18.md)

## Backlog Coverage

Already covered by current Owners package work:

- `DATA-005`
- `DATA-006`
- `FOUNDATION-003`

New future-state card filed from this walkthrough:

- `FINANCE-002`
  - build a governed agent split-contract layer

Why it exists:

- split logic is too nuanced to live in spreadsheet rows plus Steve memory forever

## Clean Read

This split cluster is documented enough to move on.

What remains is not missing understanding.

What remains is:

- future governed contract design
- ops accountability for incomplete rows
- downstream finance / payout validation in later Owners tabs
