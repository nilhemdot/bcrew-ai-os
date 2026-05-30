# FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001 Closeout

Date: 2026-05-19

## Summary

`FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001` cleared active file-size health debt without a broad root-file rewrite.

The card delegated a coherent verifier progression helper out of `scripts/foundation-verify.mjs`, added reusable file-size watch escalation, and made managed non-blocking watch rows visible without counting them as raw health debt.

## What Changed

- Added `lib/foundation-verifier-progression-helpers.js` for verifier active-sprint/current-state progression helper logic.
- Reduced `scripts/foundation-verify.mjs` from 4,995 to below 5,000 lines.
- Upgraded `lib/foundation-file-size-standard.js` so:
  - unmanaged watch rows stay active yellow
  - stale managed rows escalate back to active yellow
  - 5,000-line split-now rows become risk
  - managed watch rows require owner, reason, threshold, next trigger, next action, and review date
- Updated System Health to expose managed file-size rows while reporting active `fileSizeRiskCount=0` and `fileSizeWatchCount=0`.
- Added focused proof and closeout wiring for the file-size classifier card.

## Proof Targets

- `fileSizeRiskCount=0`
- `fileSizeWatchCount=0`
- `rawRiskCount=0`
- `rawWatchCount=0`
- `fileSizeManagedWatchCount=4`
- repeated-failure gate healthy
- `foundation:verify` green
- `process:foundation-ship` passed

## Managed Rows

- `scripts/foundation-verify.mjs`: Foundation Verifier, blocks at or above 5,000 lines or direct verifier-domain growth.
- `public/foundation.js`: Foundation Frontend, blocks at 3,000 lines or new renderer/domain behavior in the root.
- `lib/foundation-db.js`: Foundation Data, blocks at 3,000 lines or new table/domain ownership in the root.
- `server.js`: Foundation Runtime, blocks at 3,000 lines or direct route/domain behavior in the root.

## Known Limits

- This does not split every watched file below 1,500 lines.
- This does not start source/value/agent work.
- This does not launch parallel builders.
- This does not replace `FOUNDATION-HEALTH-GREEN-LOCK-001`; green-lock is still next.

## Next

Pause for `FOUNDATION-HEALTH-GREEN-LOCK-001`.
