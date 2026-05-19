# Foundation DB Split Summary - 2026-05-15

## Status

The Foundation DB split work is partially closed through the first eight focused slices.

`lib/foundation-db.js` is reduced from roughly `19K` lines to about `11,187` lines, but it is still above the 5,000-line architecture-risk line. This summary records what has already been safely extracted before the next verifier cleanup sprint starts.

## Cards Closed

- `FOUNDATION-DB-STORE-SPLIT-001` under `foundation-db-store-split-v1`
- `FOUNDATION-DB-MONOLITH-SPLIT-001` under `foundation-backlog-store-split-v1`
- `FOUNDATION-DB-MONOLITH-SPLIT-002` under `foundation-decision-store-split-v1`
- `DB-SEED-001` under `db-seed-v1`
- `FOUNDATION-DB-MONOLITH-SPLIT-003` under `foundation-core-seed-split-v1`
- `FOUNDATION-DB-MONOLITH-SPLIT-004` under `foundation-strategy-source-snapshot-split-v1`
- `FOUNDATION-DB-MONOLITH-SPLIT-005` under `foundation-strategy-operating-truth-split-v1`
- `FOUNDATION-DB-MONOLITH-SPLIT-006` under `foundation-strategy-goal-truth-split-v1`
- `FOUNDATION-DB-MONOLITH-SPLIT-007` under `foundation-fub-lead-source-store-split-v1`
- `FOUNDATION-DB-MONOLITH-SPLIT-008` under `foundation-shared-comms-coverage-split-v1`

## What Changed

The following responsibilities now live in focused modules while `lib/foundation-db.js` keeps stable public exports and DB composition:

- Current Sprint store behavior
- backlog create/update write behavior
- decision, open-question, and pending-doc-update store behavior
- static backlog/bootstrap seed truth
- static Foundation core seed arrays
- Strategy source-backed doc snapshot builders
- Strategy operating truth source-card builders
- Strategy prework and goal truth builders
- FUB lead-source rules/snapshot storage
- shared-communications coverage aggregation

## Why It Matters

`lib/foundation-db.js` was carrying schema, seed, query, write, source snapshot, and reporting responsibilities in one file. The split work moves cohesive behavior out without changing live Postgres as operational truth or breaking public callers.

This is cleanup that protects future work. It makes Foundation easier to reason about before we return to source extraction, Build Intel, Canva asset-library work, or hub feature expansion.

## Proof Pattern

Each focused split preserved behavior with:

- wrapper-preserved public exports
- old-inline-ownership dogfood rejection
- split-module-shape dogfood acceptance
- synthetic behavior fixtures where live writes would be risky
- focused process check
- `node --check`
- backlog hygiene
- `foundation:verify`
- process ship/fanout proof where required

## Known Limits

- `lib/foundation-db.js` is still too large and needs more split passes.
- This summary does not mark the DB monolith fully closed.
- Remaining DB work should continue by natural ownership boundaries, not broad rewrites.
- This did not change schema, hub behavior, Canva behavior, source extraction, or paid-source auth.

## Next

Pause DB splitting and clean up the verifier monolith next. The verifier is the trust layer, so it should be smaller and easier to debug before the next DB split pass or Build Intel/source extraction sprint.
