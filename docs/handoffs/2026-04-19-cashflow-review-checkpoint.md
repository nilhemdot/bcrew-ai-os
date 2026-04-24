# Cashflow Review Checkpoint

Date: `2026-04-19`
Tab: `Cashflow Dash`
Block: `108:205`

## What This Block Is

This is the review layer under the main cash graph.

It is not source truth.

It exists to answer:

- what happened in a selected month range versus budget
- what the full year is doing versus original plan
- how the live annual budget differs from the original annual budget
- whether partner extra pay is distorting management revenue / owner reads

## Source Chain

Selected-period block:

- budget side:
  - `Monthly Budget`
- actual side:
  - `Monthly Actuals (Roll Up)`

Annual block:

- original budget:
  - `Budget Original`
- actual:
  - `Annual Actuals (Roll Up)`
- live budget:
  - `Annual Budget (Roll Up)`

Side trackers:

- agent loans
- partner buy-ins
- both read from annual actuals category keys

## What Was Fixed

Budget-side selected-period cash / tax chain:

- `D139 = D141+D142-D143-D140-D144`
- `D143 = D150`
- `D145 = D147-D146`
- `D149 = D138-D139+D148-D145`
- `D150 = D151-D152-D153`
- `D155 = D149-D150-D154`

General Op period-budget line:

- `D118` now rolls:
  - base general-op categories
  - plus `D119`
  - plus `D120`
- it no longer points into unrelated chart-helper rows

Partner normalization:

- visible helper added:
  - `N160 = Period Partner Adj`
  - `O160 = Selected Period`
  - `N161 = Partner Extra Pay`
  - `O161` = selected-period partner extra pay
- rewired:
  - `E115` subtracts `$O$161`
  - `E125` subtracts `$O$161`
- result:
  - period block now uses period-scoped partner normalization
  - annual block still uses annual helper `M165`

Annual pace:

- removed the old `+5` day push from the year-passed logic

## Current Clean Read

- annual block is coherent
- selected-period block is coherent
- no `#ERROR!` cells found in `108:205`
- no suspicious hard refs back into unrelated upper helper rows found in `108:205`

## What We Learned About The Finance Stack

- `Cashflow Dash` is a management interpretation layer
- it is stitched from monthly and annual rollups, not from raw ledgers directly
- selected-period analysis lives on monthly rollups
- annual analysis lives on annual rollups
- partner-extra-pay normalization is a deliberate management adjustment, not an accidental artifact

## Backlog Check

No new backlog card was required from this cleanup pass.

Existing finance cards already cover the real unresolved work:

- finance source sign-off
- partner-commission normalization boundary
- weekly actuals / rollup truth
- conditional-deals scenario modeling

## What This Means For Rebuild

This block is now safe to use as a reference when rebuilding.

The important design lesson is:

- period review and annual review are different surfaces
- they should stay separate in a rebuild
- partner normalization must be explicit and scoped to the view being shown
