# Owners Tabs Closeout Checkpoint

Date: `2026-04-18`

Purpose:

- mark the current Owners tabs as closed for meaning before moving to the next tab
- prove the work is documented, backlogged, and safe to build on later

## Tabs Closed For Meaning

1. `Split Cal`
2. `Agent Splits`
3. `Listings and Conditional Deals`
4. `Sales & Deposit`
5. `CI Report`
6. `Cashflow Dash`

## What Is Locked

### Split Cal

- not a source-of-truth tab
- thin calculator on top of:
  - manual subject-deal inputs
  - `Agent Splits`
  - `ADMIN ONLY - Deal Data Entry`
- exists to calculate exact payout on one deal across thresholds
- apprentice is effectively Level `0`
- real ladder is only Levels `1` to `3`
- stale old Level `4` row is not live business logic

### Agent Splits

- annual contract / threshold setup tab
- row-by-row contract system
- not one universal split model

Confirmed live package patterns:

- flat split with no extra levels
  - example: `Matt Allman`
- apprentice to 3-level ladder
  - example: `Roland Ross`
- apprentice to flat split with mentor share
  - example: `Mustafa Sherzaee`

Rule for fuzzy rows:

- do not infer contract logic
- treat them as incomplete / under-maintained
- ops owns fixing them

### Listings and Conditional Deals

- manual forecast / visibility layer
- not firm cash truth
- when a deal goes firm:
  - team moves it to `ADMIN ONLY - Deal Data Entry`
  - then deletes it here
- split column is manual

### Sales & Deposit

- leadership scoreboard, not root truth
- current chain is locked:
  - `Sales & Deposit`
  - `Goal & KPI Calculator`
  - old BIS `KPI Calculator`
- actual / goal / seasonality structure is locked
- blue means best-ever hit
- green means goal achieved
- underlying source belief is locked:
  - old KPI engine was built mostly on top of `ADMIN ONLY - Deal Data Entry`

### CI Report

- AR reconciliation dashboard, not root truth
- current chain is locked:
  - `CI Report`
  - `(Input) Weekly Actuals`
  - `ADMIN ONLY - Deal Data Entry`
- period selector logic is locked
- hit-list query is locked
- red / green formatting rules are locked
- important live rule is locked:
  - Weekly Actuals lane and deal-status lane are supposed to match
- current live snapshot already shows a small mismatch, so this tab is doing useful reconciliation work rather than being decorative

### Cashflow Dash

- leadership cash-runway dashboard, not root truth
- current chain is locked:
  - `(Input) Weekly Actuals`
  - `Monthly Actuals (Roll Up)`
  - `Monthly Budget`
  - annual rollups / budget layers
  - helper AR / AP layer
- top summary strip is locked:
  - available cash
  - expected AR
  - uncollected AR
  - AP commitments
  - HST / card pressure
  - expected cash month end
- runway block is locked:
  - historical months come from actual rollups
  - future months switch to budget-driven projection
- chart logic is locked:
  - month domain
  - cash-in columns
  - cash-out columns
  - ending-cash area
  - baseline
  - today marker
- important live rule is locked:
  - conditional deals are **not** in the current model
  - the conditional toggle is future-state, not current-state
- verified live formula path:
  - `Cashflow Dash!D6`
  - `=INDEX('(Input) Weekly Actuals'!$J$20:$ZZZ$20, MATCH($C$2, '(Input) Weekly Actuals'!$J$27:$ZZZ$27, 1))`
  - row `20` = `Weekly Available Ending Cash`
  - row `27` = date spine used for week matching
  - for `C2 = 2026-04-19`, the tile matches `2026-04-13` and returns `19462.76`, rendered as `$19,463`
- meaning:
  - the tile is behaving correctly
  - it is only as fresh as the current week column inside `Weekly Actuals`
  - if accounting keeps the current week updated, this is effectively the real-time weekly-ending-cash view
- helper-tab meaning now locked:
  - `Unspent -L3M + Actual Helper` is a calculator / interpretation layer, not the root source
  - `G2` feeds AP commitments
  - `M2` feeds expected AR
  - `AZ2` feeds uncollected AR
- important nuance:
  - `Uncollected AR` is not a raw receivables-ledger read
  - it is a helper-model missing-income block built from budget-vs-actual shortfall logic
- HST block meaning now locked:
  - `D12` = HST collected on sales
  - `D13` = HST paid on purchases
  - `D14` = HST remitted to CRA
  - `D15 = D12 - D13 - D14`
  - `D16 = D15`
  - `D11 = D12 - D13 - D14 - D16`
  - practical meaning:
    - the dashboard currently treats all outstanding HST as moved to the loan layer
    - that is why `HST Payable` resolves to `0`
- runway block meaning now locked:
  - historical months are actual-rollup driven
  - future months are budget / projection driven
  - future starting cash chains from prior ending cash
  - rows cover:
    - revenue
    - expenses
    - non-P&L cash
    - HST
    - CRA payments
    - ending cash
  - rows `50:51` are projection helpers, not root truth
  - rows `52:60` are chart-facing display rows

## Durable Docs Updated

- [docs/source-notes/owners-dashboard.md](/Users/bensoncrew/bcrew-ai-os/docs/source-notes/owners-dashboard.md)
- [memory/2026-04-18.md](/Users/bensoncrew/bcrew-ai-os/memory/2026-04-18.md)

## Backlog Coverage

Filed from this walkthrough:

- `FINANCE-002`
  - governed split-contract layer
- `FINANCE-003`
  - conditional deals as optional cashflow scenario layer

Already covered by broader Owners closeout:

- `DATA-005`
- `DATA-006`
- `FOUNDATION-003`

## Clean Read

These tabs are closed for meaning.

What is still open is not understanding.

What remains later is:

- governed contract design
- ops accountability for fuzzy rows
- Weekly Actuals / finance source sign-off
- downstream rollup validation
- future cashflow scenario modeling
