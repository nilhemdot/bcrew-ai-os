# Conditional Review Runner

Date: `2026-04-22`

## What Is Live

The temporary governed conditional-review lane in:

- `Listings and Conditional Deals!Q:U`

now has a real row-scoped review runner behind it:

- `npm run deal-review:conditional -- --queued`

Direct targeted review also works:

- `npm run deal-review:conditional -- --rows=13`
- combined Owners inbox API:
  - `/api/owners/review-queue`

## Trigger Rule

Queued review currently accepts any of these values in column `T`:

- `Review This Conditional`
- `Review This Deal`
- `Review`
- `RERUN`

That compatibility is intentional so older founder wording does not silently stop the runner.

## What It Checks

For each selected row:

- sheet status should still be `CS`
- `Total Agent + Total Team` should reconcile to `Team $`
- direct identity should exist through:
  - `Client Name`
  - and/or `FUB Person URL / ID`
- linked FUB person should:
  - resolve cleanly
  - still be in `Conditional Deal`
  - align to the assigned agent
  - support seller-side address parity when address proof is usable

## Proven Clean Example

`--rows=13` now returns a clean pass for:

- `490 Saddler St`
- sheet agent: `Wes Cousineau`
- FUB person: `Karen Blake`
- FUB id: `48640`
- FUB stage: `Conditional Deal`

This is the first governed proof that the conditional lane can do row-scoped parity instead of rough count guessing.

The combined queue API currently reads:

- `26` open admin review items
- `13` open conditional review items
- `39` open Owners review items total

## What Is Still Open

- most live conditional rows still lack `Client Name` and/or `FUB Person URL / ID`
- buy-side rows still need stronger identity than subject-property address alone
- this still writes into the temporary sheet lane, not the future `Ops Hub -> Deal Review Inbox`
- drift-triggered routing is still later
