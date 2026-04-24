# Finance Spine Checkpoint

Date: 2026-04-19
Scope: Owners workbook finance base tabs and rollups
Status: finance spine meaning confirmed; current-state normalization doctrine locked

## Purpose

Lock the real structure of the finance system before deeper validation:

- `(Input) Weekly Actuals`
- `Monthly Budget`
- `Budget Original`
- `Monthly Actuals (Roll Up)`
- `Annual Actuals (Roll Up)`
- `Annual Budget (Roll Up)`

This is the finance spine the rest of the Owners / cashflow system depends on.

## Straight Read

The structure is cleaner than it looked.

`(Input) Weekly Actuals` is the base operating finance ledger.
`Monthly Budget` and `Budget Original` mirror that category spine.
`Monthly Actuals (Roll Up)` rolls weekly values into months.
`Annual Actuals (Roll Up)` rolls monthly actuals into years.
`Annual Budget (Roll Up)` rolls monthly budget into years.

## What Is Confirmed

### 1. Weekly Actuals is the base spine

Current confirmed structure:

- summary rows at top:
  - Starting Cash
  - Total Revenue
  - Total Expenses
  - Profit/Loss
  - Non P&L Cash In
  - Non P&L Cash Out
  - HST rows
  - Total Ending Cash
  - Total Cash in/Out
- week keys live on row `17`
- week-start dates live on row `27`
- category ledger starts on row `28`
- core category columns:
  - `C` Category ID
  - `D` Category
  - `E` Subcategory
  - `F` Detail
  - `G` Tags
  - `H` Catkey
  - `I` Type

Important formula truths:

- top summary rows are driven by `SUMIF` / `SUMIFS` against the category ledger
- `Weekly Expected Commissions (Deal Sheet)` reads directly from `ADMIN ONLY - Deal Data Entry`

### 2. Monthly Budget and Budget Original mirror the weekly spine

Both tabs currently mirror the Weekly Actuals category spine.

Current validation rule:

- if Weekly Actuals row structure changes and the budget tabs do not match, the check column flips from `✔️` to `❌`

Current live result:

- `Monthly Budget`: `0` bad checks
- `Budget Original`: `0` bad checks
- base category alignment is currently clean

Important Monthly Budget nuance now confirmed:

- `Monthly Budget` is not purely static budget math
- top strip:
  - row `17` = `Expected commission Income`
  - row `18` = `Expected Revenue`
- exact source chain:
  - `ADMIN ONLY - Deal Data Entry!AP` by expected-cash date `I`
  - into `Monthly Actuals (Roll Up)` row `20`
  - then into `Monthly Budget` row `17`
- row `18` logic:
  - total budget revenue
  - minus budgeted commission-income row
  - plus live expected commission-income row

Read:

- the budget layer keeps smaller revenue lanes budgeted
- but swaps commission planning toward the live Admin-sheet expectation
- this is intentional and makes business sense
- `Budget Original` is the static annual baseline, not the live expected layer
- placeholder rows at the bottom of `Budget Original` are expected, not a logic break

### 3. Monthly Actuals rolls Weekly Actuals into months

Current live formula pattern:

- row `23` carries month keys like `202501`
- row `25` carries month-start dates
- category rows are pulled from Weekly Actuals
- each monthly cell uses the row's Category ID and sums weekly columns whose week key matches the month key

Practical meaning:

- this is a monthly aggregation layer
- it is not the raw payment-entry source
- no duplicate keys surfaced in the live pass
- no blank-type active issues surfaced in the live pass
- row `20` is the live `Monthly Expected (Deal Sheet)` bridge from Admin

### 4. Annual Actuals rolls Monthly Actuals into years

Current live formula pattern:

- year headers live on row `22`
- category rows are inherited from the weekly spine through the monthly rollup
- each annual cell sums monthly actual values whose month key belongs to the selected year

Live read:

- structurally clean
- no duplicate keys surfaced
- no blank-type active issues surfaced
- partner-commission rows roll through cleanly
- annual `Other Income` negatives match the already-confirmed monthly normalization behavior

### 5. Annual Budget rolls Monthly Budget into years

Current live formula pattern:

- same high-level shape as Annual Actuals
- reads budget values from `Monthly Budget`
- sums by year from the monthly budget columns

Live read:

- structurally clean
- no bad check rows
- no duplicate keys surfaced
- only real issue still visible is the lower Category-ID date-format bug

## Important Nuances

### Trailing placeholder rows

Weekly Actuals contains placeholder rows:

- Category IDs `170:184`
- values are currently `- / -`
- type is blank

Current behavior:

- `Monthly Budget` and `Budget Original` still carry those rows
- `Monthly Actuals (Roll Up)`, `Annual Actuals (Roll Up)`, and `Annual Budget (Roll Up)` do not
- this appears intentional because the rollup tabs filter on nonblank `Type`

Read:

- not a live break right now
- but it is a real place where future row additions could confuse people if they do not understand the filter rule

### Annual Budget formatting drift

Observed issue:

- near the lower financing rows, `Annual Budget (Roll Up)` displays some Category IDs like dates:
  - `164` -> `6/12/1900`
  - `165` -> `6/13/1900`
  - etc.

Current read:

- this looks like cell-format drift
- underlying row logic still appears intact
- not a finance-logic break, but worth cleaning later

## What Is Not Signed Off Yet

- full finance source contract closure for `SRC-FINANCE-001`
- QuickBooks-side finance workflow details and payment reconciliation

## Backlog Read

No new backlog card was required from this architecture sweep.

Existing open finance closeout still covers the real work:

- keep Cashflow Dash aligned to Weekly Actuals
- keep finance truth separate from dashboard interpretation
- reconcile this internal finance truth with QuickBooks / payment reality later

## Locked Doctrine

- `Weekly Actuals` = bookkeeping / operating-ledger truth
- `Cashflow Dash` budget overview = management truth after normalization
- current partner workaround remains valid current-state behavior
- future rebuild target is still to separate partner distributions cleanly

## Next Best Step

Move forward into the remaining helper / KPI layers and later payment reconciliation work.
