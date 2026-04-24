# Post-Merge Lead-Source Cleanup

Last updated: 2026-04-21
Scope: `ADMIN ONLY - Deal Data Entry` from `2025-06-01` forward

## Current State

- Admin column `N` is now strict against the governed list in `Lists!J3:J63`
- governed list size:
  - `61`
- approved unresolved placeholder:
  - `<unspecified>`
- invalid final values:
  - `Import`
  - `Sphere`
  - `SOI`
  - legacy lowercase `unspecified`

## Current Invalid Queue

Rows outside the governed list from `2025-06-01` forward:

- initial read:
  - `84`
- governed fixes already applied:
  - `58`
- current remaining queue:
  - `26`

Current buckets:

- `Import`
  - `20`
- `For Sale Sign Call`
  - `4`
- `Google Search Call`
  - `2`

## Governed Fixes Already Applied

- blank source
  - moved to `<unspecified>` until the real source is proven
- legacy lowercase `unspecified`
  - normalized to `<unspecified>`
- `ZahndTeam.ca Call`
  - normalized to `Zahndteam.ca Call`
- safe `Import` rows
  - normalized to a governed source when extra detail already proved the source
  - otherwise quarantined to `<unspecified>` when the row only exposed invalid placeholder lineage like `Sphere`
- legacy `HomeOptima` rows
  - normalized to governed Home Value Hub / Agent Flyer sources using the founder-approved rule
- one generic `Google Search Call`
  - normalized to the Brantford canonical source

## Source-Aware Cleanup Rules

### `Import`

Rule:

- never leave `Import` as final truth
- if `Extra Lead Source Data` already names a governed source, move the main source to that governed value
- if `Extra Lead Source Data` only says `Sphere` / `SOI`, quarantine to `<unspecified>` until the relationship path is actually traced

### `HomeOptima`

Founder rule now locked:

- legacy `HomeOptima` means Home Value Hub lineage
- if the row is really a flyer-drop / agent-flyer case and the economics line up with the agent-flyer split, normalize to:
  - `Agent Flyer - Home Value Hub`
- if it is the geo flyer variant, normalize to:
  - `Agent Flyer - Home Value Hub – Geo Flyer`
- otherwise normalize to:
  - `Company Website – Home Value Hub`

### Generic call labels

These should not stay generic if the city / campaign is known:

- `For Sale Sign Call`
  - map to the city-specific governed sign-call source
- `Google Search Call`
  - map to the city-specific governed BCrew Google Search Call source

## Why This Matters

This is not cosmetic.

If these rows stay dirty:

- attribution stays wrong
- company vs agent credit stays wrong
- AI review keeps finding the same preventable issues
- new source names can silently re-enter the sheet even after the dropdown fix

## Change Infrastructure Needed Next

These are the missing protection layers:

1. `DATA-018`
   - queue new raw FUB source names for review as soon as they appear
2. `DATA-019`
   - verify the governed Owners list still matches the approved taxonomy
3. `DATA-020`
   - show stale-state for source lists and review lanes so old rules cannot quietly rot

## Recommended Next Cleanup Order

1. normalize the easy rows first
   - done
2. review the remaining `Import` rows
3. review generic `For Sale Sign Call`
4. review generic `Google Search Call`
