# 2026-04-18 - Sales & Deposit Chain

## Scope

Lock the current dependency chain for the `Sales & Deposit` tab in the Owners workbook so this does not need to be rediscovered later.

## Top-Level Read

`Sales & Deposit` is not a source-of-truth tab.

It is a leadership scoreboard that compares:

- executed results
- deposited results
- goals
- seasonality
- historical best / worst ranges

Steve's live reading rule:

- blue means a record was set

## Current Dependency Chain

1. `Sales & Deposit`
2. `Goal & KPI Calculator` in `Benson Crew - Owners Dashboard`
3. `KPI Calculator` in `010 - Zahnd Team BIS (Business Information System)`

Important bridge:

- `Goal & KPI Calculator!O1`
  - `=IMPORTRANGE("https://docs.google.com/spreadsheets/d/1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE/edit#gid=1609537489","KPI Calculator!A1:DA")`

Meaning:

- the Owners workbook imports the full old KPI surface
- then Owners-side formulas reshape that imported data for the visible scoreboard

## Sales & Deposit Live Formula Map

Confirmed visible layout:

- `B7:J18`
  - historical best / worst strips
- `L7:V18`
  - month rows
- `L19:V22`
  - quarter rows
- `L23:V23`
  - total row

Confirmed live pull types:

- actuals:
  - `M:P`
  - `INDEX/MATCH` pulls from imported KPI ranges in `Goal & KPI Calculator`
- goals:
  - `Q` and `S`
  - local planning ranges in `Goal & KPI Calculator`
- completion:
  - `T:U`
  - actual divided by goal
- helper:
  - `V`
  - split average

Examples:

- `M7`
  - `=INDEX('Goal & KPI Calculator'!U5:AR16, ,MATCH(L4, 'Goal & KPI Calculator'!U4:AR4, 0))`
- `Q7`
  - `=INDEX('Goal & KPI Calculator'!$B$56:$J$72, ,MATCH(TO_TEXT($L$4), TO_TEXT('Goal & KPI Calculator'!$B$55:$J$55), 0))`
- `R7`
  - `=INDEX('Goal & KPI Calculator'!$CE$78:$DP$89, ,MATCH(L4, 'Goal & KPI Calculator'!$CE$77:$DP$77, 0))`

Important build note:

- the board uses spill formulas
- the top row of each block drives the rows below it
- do not mistake visible non-formula rows for manual values

## Confirmed Old KPI Block Map

Confirmed visible blocks in BIS `KPI Calculator`:

- `A1:V24`
  - `Total Deals Executed`
- `A26:V48`
  - `Total Volume Executed`
- `A50:V72`
  - `Total GCI Executed`
- `A75:V97`
  - `Commission Dollars to the Company Executed`
- `AQ1:DL24`
  - `Total Deals DEPOSITED`
- `AQ26:DL48`
  - `Total Volume DEPOSITED`
- `AQ50:DL72`
  - `Total GCI DEPOSITED`
- `AQ75:DL97`
  - `Deposit the Company DEPOSIT`

## Conditional Formatting

Confirmed live behavior:

- blue:
  - current actual meets or beats best ever
  - used for:
    - deals
    - volume
    - GCI
    - executed company dollars
- green:
  - goal achieved
  - used for:
    - executed goal cell
    - deposited goal cell

Exact live rule pattern:

- `M7:M23 >= B7:B23`
- `N7:N23 >= D7:D23`
- `O7:O23 >= F7:F23`
- `P7:P23 >= H7:H23`
- `Q7:Q24 <= P7:P24`
- `S7:S24 <= R7:R24`

## Small Caveats

- `L4` selector is currently limited to `2025` through `2030`
- there is a leftover helper-looking cell at `P24 = Q19-P19`
- later future-period rows can naturally show blanks / zeroes / `#DIV/0!` until the source periods exist

## Current Boundary

What is locked:

- `Sales & Deposit` is a scoreboard, not root truth
- `Goal & KPI Calculator` is a bridge / reshape layer
- the old BIS `KPI Calculator` is an older KPI engine with the exact boards the Owners workbook is reusing

What is still open:

- which parts of the old BIS KPI engine are durable business logic versus legacy reporting scaffolding
- whether future rebuilds should bypass the old KPI engine and read directly from cleaner source contracts
- exact raw source chain below each KPI block where needed
