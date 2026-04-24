# 2026-04-21 Owners Dropdown Drift

## What Was Built

The first governed Owners dropdown drift layer is now live.

New endpoint:

- `/api/owners/lead-source-governance`

What it reads:

- Owners workbook:
  - `Lists!J3:J120`
- governed taxonomy baseline:
  - the governed Owners final deal-source list
  - not the full broader FUB-approved taxonomy

What it checks:

- unexpected values still present in the live Owners dropdown
- approved values missing from the live Owners dropdown
- duplicate values in the live Owners dropdown

## Visible UI

The Owners source page now shows this directly:

- `http://localhost:3000/foundation#source-sheets:SRC-OWNERS-001`

Panel title:

- `Owners lead-source list drift`

Purpose:

- protect Admin column `N` from silently drifting away from the approved taxonomy

## Change Feed

This drift now logs into the shared change feed using the same event types as FUB drift:

- `source_drift_detected`
- `source_drift_cleared`

Entity:

- `owners_sheet_lists`
- `SRC-OWNERS-001:lead-source-dropdown`

## Current Live Read

After fixing the baseline comparison bug, the endpoint now returns:

- `0` unexpected values
- `0` missing values
- `0` duplicates

Meaning:

- the live Owners dropdown currently matches the governed Owners list cleanly
- the watch now only flags real drift instead of over-reporting from the broader FUB taxonomy

## Files Touched

- `server.js`
- `public/foundation.js`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-state.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/owners-closeout.md`
- `docs/source-notes/owners-dashboard.md`

## Verification

- `npm run foundation:verify`
- result:
  - `14/14` checks passed

## Next Best Move

Use this slice to finish `DATA-019` cleanly:

1. identify which `8` approved values are missing from `Lists!J`
2. update the live Owners dropdown
3. confirm the drift panel clears
4. leave the watch in place so future list drift becomes visible instead of hidden
