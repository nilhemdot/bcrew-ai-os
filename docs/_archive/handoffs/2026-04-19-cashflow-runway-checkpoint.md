# Cashflow Dash Runway Checkpoint

Date: `2026-04-19`

## What Is Locked

- the purpose of the runway block is locked:
  - last `3` months of history
  - current month anchor
  - next `6` months of projected cash
- the block structure is locked:
  - `C34` = historical spill anchor from `Monthly Actuals (Roll Up)`
  - `G35` = future spill anchor from `Monthly Budget`
  - `50:51` = future helper rows
  - `52:60` = chart rows
  - `61:62` = manual sanity-check rows
- `D27` and `F56` are aligned in intent and effectively identical in value
- `F53:F56` are intentionally a projected month-end view, not a raw monthly spill mirror
- `G:L` future columns are conceptually correct:
  - strip out gross budget revenue
  - inject expected real commission cash
  - carry expected cash-out / pressure logic
- `57:62` chart / sanity rows are closed for meaning:
  - baseline
  - positive cash
  - negative cash
  - today marker
  - last check
  - good or bad delta

## Fixes Applied During Validation

1. `C54`
   - fixed from:
     - `=C36+C39+C43+C45`
   - to:
     - `=C36+C39+C43+C45-C40`
   - result:
     - `C55` now matches `C48`
     - `C56` now matches `C47`

2. `J54`
   - cleaned from:
     - `...+F15+H27`
   - to:
     - `...+H16+H27`

3. `K54`
   - cleaned from:
     - `...+G15+I27`
   - to:
     - `...+I16+I27`
   - result:
     - formulas now follow the correct pattern
     - no live values changed after cleanup

## Important Interpretive Rules

- `47/48` are the raw spill-block monthly lines
- `55/56` are the chart / projection lines
- `F` is supposed to differ because current-month top-strip pressure gets layered in
- `61/62` are a manual checkpoint:
  - `61` = last saved check
  - `62` = current runway minus that saved check

## Durable Files

- [docs/source-notes/owners-dashboard.md](/Users/bensoncrew/bcrew-ai-os/docs/source-notes/owners-dashboard.md)
- [docs/handoffs/2026-04-19-cashflow-runway-a30-l62-map.md](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-19-cashflow-runway-a30-l62-map.md)
- [memory/2026-04-19.md](/Users/bensoncrew/bcrew-ai-os/memory/2026-04-19.md)

## What Is Still Open

- upstream finance sign-off is still open:
  - `(Input) Weekly Actuals`
  - `Monthly Actuals (Roll Up)`
  - annual rollups
  - canonical partner-commission normalization

## Clean Read

This runway block is now closed for meaning.

What remains later is upstream finance-source sign-off, not re-learning how this runway block works.
