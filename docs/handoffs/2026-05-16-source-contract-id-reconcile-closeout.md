# Source Contract ID Reconcile Closeout

Date: 2026-05-16
Sprint: `source-contract-id-reconcile-2026-05-16`
Card: `SOURCE-CONTRACT-ID-RECONCILE-001`
Closeout key: `source-contract-id-reconcile-v1`

## What Changed

- Added first-class Google Workspace source-type contracts:
  - `SRC-GDOCS-001`
  - `SRC-GSHEETS-001`
  - `SRC-GSLIDES-001`
- Updated the Drive corpus grouped system so Docs, Sheets, and Slides type identities are visible beside `SRC-GDRIVE-001`.
- Updated `docs/source-registry.md` and `docs/rebuild/current-state.md` so operator docs no longer report the stale 36-source registry state.
- Apply-synced `source_contract_registry` from code to live DB: `39` expected / `39` active / `0` missing / `0` stale hashes.
- Added focused proof command:
  - `npm run process:source-contract-id-reconcile-check -- --json`
- Updated the connector-routing verifier expectation so reducing missing connector rows is treated as progress, not a failure.

## Boundaries Preserved

- No credentials changed.
- No OAuth scopes changed.
- No provider calls were made.
- No extraction jobs or schedules were added.
- No GA4/GSC/GBP/Web/Reddit/GitHub/Twitter/Telegram/WhatsApp/Zoom source IDs were promoted into fake source contracts.
- `SRC-GSLIDES-001` is explicitly `Scoped, not extracted`; this is source identity metadata, not a claim that Slides extraction is live.

## Dogfood Proof

The focused proof recreates the old failure by removing the three Google Workspace type contracts from a synthetic source-contract set. The credential registry then reports:

- `SRC-GDOCS-001` missing
- `SRC-GSLIDES-001` missing
- `SRC-GSHEETS-001` missing

With the real source contracts in place, the same Google Drive and Google Sheets credential rows report those IDs as present and no longer missing.

## Proof

- `npm run source-contract-registry:sync -- --apply --actor=codex-source-contract-id-reconcile --json`
  - expected: `39`
  - active: `39`
  - status: `healthy`
- `npm run process:source-contract-id-reconcile-check -- --json`
  - status: `healthy`
  - current missing Google Workspace type IDs: `[]`
  - old failure missing IDs: `SRC-GDOCS-001`, `SRC-GSLIDES-001`, `SRC-GSHEETS-001`
- `npm run foundation:verify -- --json-summary`
  - `411/411`

## Next

The no-auth source identity gap is closed. Next no-auth Foundation source-readiness candidate remains `GCAL-ATOM-SCHEDULE-001`, unless the next system-health report exposes a higher-risk red row.
