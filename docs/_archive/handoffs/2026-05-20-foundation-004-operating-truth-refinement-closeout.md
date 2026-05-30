# FOUNDATION-004 Operating Truth Refinement Closeout

Card: `FOUNDATION-004`
Closeout key: `foundation-004-operating-truth-refinement-v1`
Date: 2026-05-20

## What Changed

- Refined `docs/strategy/operating-truths.md` as the durable interpretation layer above Freedom, Owners, finance, ClickUp, FUB, and source notes.
- Added `docs/rebuild/freedom-rebuild-blueprint.md` so future builders can rebuild Freedom logic from source-owned layers without rereading validation chats.
- Added source-note cross references in Freedom, Owners, and ClickUp notes so evidence/current-process details stay there while durable meaning routes to operating truths.
- Added focused proof and Current Sprint closeout wiring for `FOUNDATION-004`.

## Durable Rules Promoted

- Freedom is current strategy process map and spreadsheet-era planning logic, not final system-owned truth.
- Owners is the deal / finance ledger for transaction economics and final source-row correction.
- `SRC-OWNERS-LISTS-001` owns dropdown/list data; Owners Dashboard Lists mirror is not a write surface.
- FUB is CRM evidence, not final deal ledger truth.
- ClickUp is workflow/accountability, not final finance or payout truth.
- Ops self-validation fields are claims, not verified truth.
- `<unspecified>` is quarantine, not final attribution truth.
- Strategy docs own meaning; source notes own evidence/current process; backlog owns unresolved gaps.

## Proof

- `node --check lib/foundation-004-operating-truth-refinement.js scripts/process-foundation-004-check.mjs`
- `npm run process:foundation-004-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-004 --planApprovalRef=docs/process/approvals/FOUNDATION-004.json --closeoutKey=foundation-004-operating-truth-refinement-v1 --commitRef=HEAD`

## Current Sprint

`FOUNDATION-004` closes and advances the active Foundation sprint to `DATA-001`.

## Not Done

- No spreadsheet mutation.
- No ClickUp writes.
- No FUB writes.
- No finance mutation.
- No Drive permission mutation.
- No live extraction or broad private source reads.

## Next

Continue `DATA-001`: Freedom Sheet source adapter and schema-drift monitor.
