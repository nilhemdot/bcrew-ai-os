# Cashflow Dash Runway Block Map

Workbook: `Benson Crew - Owners Dashboard`  
Tab: `Cashflow Dash`  
Range: `A30:L62`  
Date mapped: `2026-04-19`

This is the durable cell-map for the cash runway block so the team does not need to reverse-engineer it again later.

## Clean Structure

- `B30`
  - title: `Cash Runway High Level Report (Expand to See)`
- `G31`, `I31`, `L31`
  - high-level runway callouts:
    - `1 Month Cash`
    - `3 Months Cash`
    - `6 Months Cash`
- `B33:L48`
  - main runway block
- `B50:L51`
  - future-only helper rows
- `B52:L60`
  - chart-feed block
- `E61:L62`
  - manual comparison checkpoint / sanity check layer

## Critical Spill Anchors

These are the two cells that matter most for understanding the block:

- `C34`
  - historical spill anchor
  - pulls the matched monthly column from `Monthly Actuals (Roll Up)`
  - because the `INDEX(...)` row is omitted, it spills downward through the historical finance rows
- `G35`
  - future spill anchor
  - pulls the matched monthly column from `Monthly Budget`
  - spills downward through the projected finance rows

So the block is not "one custom formula per cell."  
It is:

- historical spill block from `C34`
- future spill block from `G35`
- then explicit formula rows underneath for chart math

## Row-By-Row Map

### Row 30

- `B30`
  - section title only

### Row 31

- `G31`
  - `1 Month Cash`
- `I31`
  - `3 Months Cash`
- `L31`
  - `6 Months Cash`

These are presentation markers, not model logic.

### Row 33 — Month Spine

- `B33`
  - label: `Date`
- `C33`
  - `=TEXT(EOMONTH(TODAY(),-3),"yyyymm")`
- `D33`
  - `=TEXT(EOMONTH(TODAY(),-2),"yyyymm")`
- `E33`
  - `=TEXT(EOMONTH(TODAY(),-1),"yyyymm")`
- `F33`
  - `=TEXT(EOMONTH(TODAY(),),"yyyymm")`
- `G33:L33`
  - each month chains one month forward from the prior month key

Meaning:

- last `3` months
- current month
- next `6` months

This exists both for the graph and for the runway logic.

### Row 34 — Starting Cash

- `B34`
  - label: `Starting Cash`
- `C34`
  - historical spill anchor:
  - `=IFERROR(BYCOL(C$33:F$33, LAMBDA(k, INDEX('Monthly Actuals (Roll Up)'!$J$1:$ZZZ$15, , XMATCH(TO_TEXT(k), TO_TEXT('Monthly Actuals (Roll Up)'!$J$23:$ZZZ$23), 0)))), 0)`
- `D34:F34`
  - spill outputs from `C34`
- `G34`
  - `=F56`
- `H34`
  - `=G56`
- `I34`
  - `=H56`
- `J34`
  - `=I56`
- `K34`
  - `=J56`
- `L34`
  - `=K56`

Meaning:

- historical months start from actual monthly starting cash
- future months start from prior projected ending cash

### Rows 35:48 — Main Finance Block

Rows `35:48` are mostly spill outputs.

- `C35:F48`
  - historical actual monthly block from `C34`
- `G35:L48`
  - future projected monthly block from `G35`

#### Row 35 — Total Revenue

- `B35`
  - label: `Total Revenue`
- `C35:F35`
  - historical spill outputs from `Monthly Actuals (Roll Up)`
- `G35`
  - future spill anchor:
  - `=IFERROR(BYCOL(G$33:N$33, LAMBDA(k, INDEX('Monthly Budget'!I2:ZZZ15, , XMATCH(TO_TEXT(k), TO_TEXT('Monthly Budget'!I24:ZZZ24), 0)))), 0)`
- `H35:L35`
  - spill outputs from `G35`

Meaning:

- historical side = actual monthly revenue
- future side = gross budget revenue before later cash-in adjustment

#### Row 36 — Total Expenses

- `B36`
  - label: `Total Expenses`
- `C36:L36`
  - spill outputs

#### Row 37 — Profit/Loss

- `B37`
  - label: `Profit/Loss`
- `C37:L37`
  - spill outputs

#### Row 38 — Non P&L Cash In

- `B38`
  - label: `Non P&L Cash In`
- `C38:L38`
  - spill outputs

#### Row 39 — Non P&L Cash Out

- `B39`
  - label: `Non P&L Cash Out`
- `C39:L39`
  - spill outputs

#### Row 40 — Credit Card In/Out

- `B40`
  - label: `Credit Card In/Out`
  - note on cell:
    - `Neg on the card means we paid the card off more then we put on the card`
- `C40:L40`
  - spill outputs

#### Row 41 — Total Non PnL Cash

- `B41`
  - label: `Total Non PnL Cash`
- `C41:L41`
  - spill outputs

#### Row 42 — HST Collected On Sales

- `B42`
  - label: `HST Collected On Sales`
- `C42:L42`
  - spill outputs

#### Row 43 — HST Paid On Purchases

- `B43`
  - label: `HST Paid On Purchases`
- `C43:L43`
  - spill outputs

#### Row 44 — Total Owed To CRA

- `B44`
  - label: `Total Owed To CRA`
- `C44:L44`
  - spill outputs

#### Row 45 — Payments To CRA

- `B45`
  - label: `Payments To CRA`
- `C45:L45`
  - spill outputs

#### Row 46 — Total Owed To CRA

- `B46`
  - label: `Total Owed To CRA`
- `C46:L46`
  - spill outputs

This appears to be the post-payment CRA balance line.

#### Row 47 — Total Ending Cash

- `B47`
  - label: `Total Ending Cash`
- `C47:L47`
  - spill outputs

#### Row 48 — Total Cash In/Out

- `B48`
  - label: `Total Cash in/Out`
- `C48:L48`
  - spill outputs

## Helper Rows

### Row 50 — Expected Monthly Commission

- `B50`
  - label: `Expected Monthly Commission`
- `G50`
  - spill anchor:
  - `=IFERROR(BYCOL(G$33:N$33, LAMBDA(k, INDEX('Monthly Budget'!$I$17:$ZZZ$17, 1, XMATCH(TO_TEXT(k), TO_TEXT('Monthly Budget'!$I$24:$ZZZ$24), 0)))), 0)`
- `H50:L50`
  - spill outputs

Meaning:

- future expected commission that gets layered into cash-in math

### Row 51 — Budgeted Revenue to Remove

- `B51`
  - label: `Budgeted Revenue to Remove`
- `G51`
  - spill anchor:
  - `=IFERROR(BYCOL(G$33:N$33, LAMBDA(k, INDEX('Monthly Budget'!$I$26:$ZZZ$26, 1, XMATCH(TO_TEXT(k), TO_TEXT('Monthly Budget'!$I$24:$ZZZ$24), 0)))), 0)`
- `H51:L51`
  - spill outputs

Meaning:

- future revenue offset used so the cash-in line does not double count budget revenue

## Chart Feed Rows

### Row 52 — Month Labels

- `B52`
  - label: `Month`
- `C52:L52`
  - formatted month labels from the `yyyymm` row above

### Row 53 — Total Cash In

- `B53`
  - label: `Total Cash In`
- `C53`
  - `=C35+C38+C42`
- `D53`
  - `=D35+D38+D42`
- `E53`
  - `=E35+E38+E42`
- `F53`
  - `=F35+F38+F42+D7+D8`
- `G53`
  - `=G35+G38+G42-G51+G50`
- `H53`
  - `=H35+H38+H42-H51+H50`
- `I53`
  - `=I35+I38+I42-I51+I50`
- `J53`
  - `=J35+J38+J42-J51+J50`
- `K53`
  - `=K35+K38+K42-K51+K50`
- `L53`
  - `=L35+L38+L42-L51+L50`

Meaning:

- historical = revenue + non-P&L cash in + HST collected
- current month adds top-strip AR helpers
- future = gross revenue adjusted by helper rows

### Row 54 — Total Cash Out

- `B54`
  - label: `Total Cash Out`
- `C54`
  - `=C36+C39+C43+C45-C40`
- `D54`
  - `=D36+D39+D43+D45-D40`
- `E54`
  - `=E36+E39+E43+E45+C9+C10+C11+C17-E40`
- `F54`
  - `=F36+F39+F43+F45+D9+D10+D11+D17-F40`
- `G54`
  - `=G36+G39+G43+G45+E9+E10+E16+E27`
- `H54`
  - `=H36+H39+H43+H45+F9+F10+F16+F27`
- `I54`
  - `=I36+I39+I43+I45+G9+G10+G16+G27`
- `J54`
  - `=J36+J39+J43+J45+H9+H10+H16+H27`
- `K54`
  - `=K36+K39+K43+K45+I9+I10+I16+I27`
- `L54`
  - `=L36+L39+L43+L45+J9+J10+J16+J27`

Meaning:

- expenses + non-P&L cash out + HST / CRA + top-strip pressure items
- this row is one of the places where the top-strip logic is stitched into runway math

Validation notes:

- `C54` had a real bug and was fixed during validation:
  - it had been missing `-C40`
  - after fixing it, `C55` matched `C48` and `C56` matched `C47`
- `F54` is intentionally different from the raw April spill row:
  - it layers current-month top-strip pressure items into the projected month-end view
  - that is why `F55/F56` do not match `F48/F47`
- `J54` and `K54` had stale `15` references and were cleaned:
  - `J54` now uses `H16`
  - `K54` now uses `I16`
  - cleanup did not change live values

### Row 55 — Total Cash In/Out

- `B55`
  - label: `Total Cash In/Out`
- `C55:L55`
  - each cell is `cash in - cash out`

### Row 56 — Total Ending Cash

- `B56`
  - label: `Total Ending Cash`
- `C56:L56`
  - each cell is `starting cash + total cash in - total cash out`

This is the key line for the runway view.

### Row 57 — Baseline

- `B57`
  - label: `Baseline`
- `C57`
  - `=ARRAYFORMULA(IF(C52:N52<>"",0,))`
- `D57:L57`
  - spill outputs

Meaning:

- zero line for the chart

### Row 58 — Positive Cash

- `B58`
  - label: `Positive Cash`
- `C58`
  - `=ARRAYFORMULA(IF(N(C56:N56)>0,N(C56:N56),0))`
- `D58:L58`
  - spill outputs

Meaning:

- keeps only positive ending-cash values for chart display

### Row 59 — Neg Cash

- `B59`
  - label: `Neg Cash`
- `C59`
  - `=ARRAYFORMULA(IF(N(C56:N56)<0,N(C56:N56),0))`
- `D59:L59`
  - spill outputs

Meaning:

- keeps only negative ending-cash values for chart display

### Row 60 — Today Marker

- `B60`
  - label: `Today Marker`
- `C60`
  - `=ARRAYFORMULA(IF(C52:N52=TEXT(EOMONTH(TODAY(),0),"mmm yy"), MAX(C53:N56),""))`
- `F60`
  - current live spill output for the current month

Meaning:

- puts a single marker on the current month in the chart
- value used is the max value in the display block

## Manual Comparison Layer

### Row 61 — Last Check Snapshot

- `E61`
  - label: `Last Check April 9`
- `F61:L61`
  - manually entered comparison values

These are not source-fed formulas.

### Row 62 — Good Or Bad Delta

- `E62`
  - label: `Good or Bad`
- `F62`
  - `=F56-F61`
- `G62`
  - `=G56-G61`
- `H62`
  - `=H56-H61`
- `I62`
  - `=I56-I61`
- `J62`
  - `=J56-J61`
- `K62`
  - `=K56-K61`
- `L62`
  - `=L56-L61`

Meaning:

- compares current runway against the manually saved prior-check snapshot

## Practical Read

If you want the shortest true explanation of this whole block:

1. `row 33` builds the time spine
2. `C34` spills the historical monthly actual block
3. `G35` spills the future monthly budget block
4. `rows 50:51` adjust future revenue into expected cash-in
5. `rows 53:56` create the chart-ready cash runway math
6. `rows 57:60` create the chart helpers
7. `rows 61:62` are manual checkpoint comparison rows
