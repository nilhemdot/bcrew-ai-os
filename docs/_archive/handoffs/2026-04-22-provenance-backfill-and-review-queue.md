# 2026-04-22 Provenance Backfill And Review Queue

## What shipped

- The first locked Foundation decisions are no longer blank on provenance.
- Seed decisions `DEC-001` through `DEC-007` are now backfilled with:
  - `decisionOwner`
  - `confirmedBy`
  - `participantNames`
  - `contextRef`
  - `evidenceNotes`
- The backfill is safe:
  - seed insert includes provenance for fresh DB setup
  - existing DB rows are only filled where provenance was still missing
  - existing future edits will not be overwritten

## Decision provenance state now

- The first model is live
- the locked seed decisions are populated
- the remaining provenance work is now narrower:
  - distinguish direct vs backfilled provenance
  - attach cleaner meeting / session / thread links
  - keep future decisions from landing with thin provenance in the first place

## Deal review queue improvement

- `scripts/review-admin-deals.mjs` no longer needs only `--deals=...`
- It now supports:
  - `--queued`
  - `--mature-days=N`
  - `--limit=N`
- Queue behavior:
  - reads the Admin tab
  - picks rows where `CD` contains a review trigger like:
    - `Review This Deal`
    - `RERUN`
    - `Review`
  - groups by `Deal #`
  - applies the mature-deal gate
  - runs the governed review only on that narrowed queue

## Default queue doctrine now

- queued mode defaults to:
  - `10` mature days
- reason:
  - matches Steve's rule that serious deal review should usually wait at least `10` days after `Date Firm (Executed)`

## Useful commands

Explicit deal:

```bash
npm run deal-review:admin -- --deals=T#26100
```

Queued dry run:

```bash
npm run deal-review:admin -- --queued
```

Queued write run:

```bash
npm run deal-review:admin -- --queued --write
```

Queued capped batch:

```bash
npm run deal-review:admin -- --queued --limit=10 --write
```

## Why this matters

- The decision system is less fake now because older locked decisions are not provenance-empty.
- The temporary in-sheet Owners review flow is less fake now because the sheet can actually drive review selection instead of relying on founder memory plus manual CLI inputs.

## Next best step

1. tighten provenance quality:
   - direct vs backfilled
   - richer exact context links
2. keep pushing the Owners governed review path:
   - `SOURCE-008`
   - `DATA-005`
   - `DATA-006`
