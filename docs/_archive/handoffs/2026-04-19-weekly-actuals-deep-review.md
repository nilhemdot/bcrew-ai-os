# Weekly Actuals Deep Review

Date: 2026-04-19
Tab: `(Input) Weekly Actuals`
Status: deep structure mapped, line-by-line sign-off still open

## Purpose

Lock the real structure of `Weekly Actuals` before Steve walks it line by line.

This tab is the root finance ledger for the Owners workbook.

## Straight Read

`Weekly Actuals` is not just a dumb cash-entry sheet.

It is:

- the base category spine for finance
- the source the monthly / annual actual rollups inherit from
- one of the sources the cashflow system interprets
- a mixed sheet that includes:
  - real weekly inputs
  - helper strips
  - embedded formulas in certain ledger rows

## Row Map

### Rows 1:14 — summary layer

These rows summarize the current week columns by type:

- Starting Cash
- Total Revenue
- Total Expenses
- Profit/Loss
- Non P&L Cash In
- Non P&L Cash Out
- Total Non PnL Cash
- HST rows
- Total Ending Cash
- Total Cash in/Out

These are formula rows, not manual truth rows.

They sum the ledger below using `SUMIF` / `SUMIFS`.

### Rows 16:18 — operator / planning helpers

Important lines:

- row `17`
  - month key per weekly column
- row `18`
  - `Weekly Expected Commissions (Deal Sheet)`
  - sourced directly from `ADMIN ONLY - Deal Data Entry`

Meaning:

- Weekly Actuals is already partially bridged to the Admin deal ledger

### Rows 19:25 — available cash helper strip

Purpose:

- convert the weekly ledger into a live available-cash view
- track:
  - available starting cash
  - available ending cash
  - starting bank balance
  - LOC
  - BMO / TD / CIBC card lanes

Important logic:

- row `20`
  - `Weekly Available Ending Cash`
  - built from starting cash plus:
    - revenue
    - expense
    - non-P&L in / out
    - HST in / out / remittance
- rows `23:25`
  - card running balances
  - directly tied to financing rows lower in the ledger

### Row 27 — week spine

This is the live weekly date spine.

Example:

- `J27 = Jan/1/2025`
- `K27 = Jan/6/2025`
- etc.

This row matters because:

- weekly logic keys off the actual week-start dates
- row `17` separately carries month keys for rollups

Both are important.

## Ledger Map

### Revenue block — rows 28:40

- `28:35`
  - core revenue
- `36:40`
  - partner-commission revenue rows:
    - Steve
    - Blake
    - Nick
    - Ryan
    - Scott

Important open issue:

- these partner rows live inside revenue truth here
- but management interpretation later backs them out
- canonical normalization rule is still open

Current operating reason:

- the deal ledger still tracks the economics of partner share
- but the cash is often intentionally left inside the company instead of being paid out personally
- to avoid understating company-held cash while still preserving the economics, the finance stack currently:
  - adds retained partner-share amounts into the partner-commission revenue rows
  - adds the matching cost / owner-pay effect on the budget side
  - backs those amounts out again in `Cashflow Dash` for management interpretation

This is a deliberate workaround, not random spreadsheet drift.

Exact current chain confirmed:

1. `Weekly Actuals`
   - Category IDs `9:13` hold the retained partner-share revenue by person
2. `Monthly Actuals (Roll Up)`
   - rolls those partner rows into monthly values by month key
3. `Annual Actuals (Roll Up)`
   - sums those monthly partner values by year
4. `Cashflow Dash`
   - helper `O161` now sums the selected-period partner rows directly from `Monthly Actuals (Roll Up)`
   - annual helper `M165` does the annual version

Matching budget-side path also confirmed:

- `Monthly Budget` owner expense rows `76:80` pull from `Monthly Actuals (Roll Up)` partner rows
- that is the matching cost-side part of the workaround

Owner-link bug found and fixed on 2026-04-19:

- the Monthly Budget owner rows had drifted off the correct partner rows
- corrected live mapping now is:
  - Steve -> row `34`
  - Scott -> row `38`
  - Ryan -> row `37`
  - Blake -> row `35`
  - Nick -> row `36`

Remaining caution:

- those formulas are still hand-built and row-sensitive
- so the pattern is now correct, but this is still a later rebuild simplification target

### P&L expense blocks — rows 41:147

Current grouped ranges:

- `41:44`
  - Real Broker Fees
- `45`
  - Auto
- `46:52`
  - Office Space
- `53:62`
  - General Operating Expenses
- `63:67`
  - Software & Technology Costs
- `68:71`
  - Banking and Interest
- `72:79`
  - Cost to Service Clients
- `80:102`
  - Team
- `103:107`
  - Owners
- `108:114`
  - Contractors
- `115:134`
  - Marketing
- `135:138`
  - Client Appreciation
- `139:142`
  - Agent Appreciation
- `143:147`
  - Other P&L Cash Out

### Sales-tax block — rows 148:150

- HST Collected on Sales
- HST Paid on Purchases
- HST Remittance to CRA

### Financing block — rows 151:196

This is where the balance-sheet movement lives.

Examples:

- credit-card charge / payment lanes
- payroll liabilities
- partner loans in / out
- unpaid commissions
- customer / agent loans
- pre-cap / post-cap investment
- SRED payable
- corporate tax owing
- old Zahnd Corp debt payback rows

### Placeholder block — rows 197:211

Current state:

- IDs `170:184`
- category / subcategory are `-`
- type is blank

Meaning:

- currently inactive
- rollups do not carry them forward because rollups filter on nonblank type

## Formula-Driven Ledger Rows

This is the most important deep-read finding.

Not every row in the ledger is a manual weekly-entry row.

Current confirmed formula-bearing ledger rows include:

- row `28`
  - `Commission Income`
  - at least some weekly columns are formula-driven
- row `35`
  - `Other Income`
  - contains manual balancing-style formulas
- row `148`
  - `HST Collected on Sales`
  - contains composed formula values in at least some weeks
- rows `151:158`
  - early financing rows for:
    - credit-card charges
    - credit-card payments
    - payroll-liability accrual / remittance

Meaning:

- this tab mixes manual entry with embedded finance logic

## Second Pass Findings

The second hard pass found more hidden logic than the first pass.

### 1. Cell notes are part of the operating system

`Weekly Actuals` does not store all business meaning in visible labels.

Important context also lives in cell notes.

Confirmed note-bearing cells include:

- `B16`
  - explains how to extend the week sequence
- `D16`
  - long `HOW TO USE - WEEKLY ACTUALS` note
  - confirms this is a cash-basis ledger
  - confirms no AR / AP should be entered here
  - explains credit-card and HST handling
- historical transaction / adjustment cells such as:
  - `AP28`
  - `BE28`
  - `BF28`
  - `BK28`
  - `BL28`
  - `BI51`
  - `BI105`
  - `BI154`
  - `BU176`

Meaning:

- future review agents cannot treat visible row labels as the whole truth
- cell notes must be treated as part of the operating context for this tab

### 2. Formula-bearing rows are broader than first pass suggested

The first pass correctly identified that `Weekly Actuals` is mixed input + helper logic.

The second pass confirmed that embedded formulas appear across many more ledger rows than first documented.

Confirmed formula-bearing rows now include:

- `28`
- `30`
- `33`
- `35`
- `37`
- `38`
- `39`
- `41`
- `43`
- `45`
- `46`
- `47`
- `51`
- `52`
- `53`
- `54`
- `56`
- `57`
- `58`
- `60`
- `62`
- `63`
- `64`
- `65`
- `67`
- `68`
- `69`
- `72`
- `73`
- `74`
- `75`
- `76`
- `78`
- `86`
- `88`
- `89`
- `90`
- `92`
- `93`
- `95`
- `96`
- `103`
- `104`
- `105`
- `106`
- `107`
- `108`
- `114`
- `115`
- `116`
- `119`
- `120`
- `121`
- `126`
- `129`
- `131`
- `132`
- `134`
- `135`
- `136`
- `137`
- `139`
- `147`
- `148`
- `149`
- `151`
- `152`
- `153`
- `155`
- `156`
- `157`
- `158`
- `160`
- `165`
- `176`
- `181`
- `186`
- `189`

Meaning:

- this is even less of a pure manual input ledger than it first appeared
- rebuild work must model embedded finance behaviors, not just copy the row list

### 3. Structural anomalies are light, but string hygiene drift is real

The active spine is not structurally broken, but there is cleanup debt.

Confirmed:

- no active rows with blank type
- type values in active use are:
  - `Revenue`
  - `Expense`
  - `Sales Tax`
  - `Financing`
- duplicate active `catkey` found:
  - `Marketing | Development Projects | SongBird Landing`
  - appears twice and looks intentional because it is split by different tags
- many categories / subcategories / catkeys contain trailing spaces

Examples:

- `General Operating Expenses `
- `Communications & Connectivity `
- `Front Desk Telecom Services `
- `Kylie `
- `Hanna Ricci `
- `ISA Bonus `
- `Outside Contractor `
- `Street Scene `
- `Google Ads `
- `Corporate Tax Owing `

Meaning:

- not a current blocker
- but if future logic ever relies on raw string equality without normalization, this will matter

## Straight Read After Second Pass

`Weekly Actuals` is now clearly understood as:

- the root finance ledger
- a mixed manual + formula sheet
- a sheet with hidden business context in notes
- a sheet whose row architecture is stable, but whose embedded logic is broader than it looks

That is the right starting point for the line-by-line validation pass.

## Third Pass Findings

The third hard pass moved from broad structure into live dependency and hotspot tracing.

### 1. The only external sheet dependency currently found is the Admin tab

Cross-sheet formula scan result:

- `ADMIN ONLY - Deal Data Entry`
  - `747` formula references
- no other external sheet reference was found inside `Weekly Actuals`

Meaning:

- this tab is more self-contained than it looks
- the main external dependency is the Admin deal ledger, not a wide mesh of hidden sheet links

### 2. Row 18 is a real bridge, not just a helper label

`Weekly Expected Commissions (Deal Sheet)` is not vague.

Current live pattern:

- row `18`
  - `SUMIFS`
  - source amount:
    - `ADMIN ONLY - Deal Data Entry!AP:AP`
  - source date:
    - `ADMIN ONLY - Deal Data Entry!I:I`
  - week window:
    - current week start on row `27`
    - next week start on the next column in row `27`

Meaning:

- row `18` is a full weekly projection bridge from the Admin deal ledger into finance
- if the Admin tab date / economics semantics change, this bridge changes with it

### 3. The top helper strip is now concretely understood

Important live mechanics:

- row `19`
  - `Weekly Available Starting Cash`
  - starts from a seeded opening formula in `J19`
  - then rolls forward by pointing each checkpoint month to the prior ending-cash cell
- row `20`
  - `Weekly Available Ending Cash`
  - this is the real weekly cash engine
  - pattern:
    - starting cash
    - plus revenue
    - minus expenses
    - plus non-P&L cash in
    - minus non-P&L cash out
    - plus HST collected
    - minus HST paid
    - minus HST remitted
- row `21`
  - `Starting Bank Balance`
  - current live pattern is:
    - available starting cash minus row `22`
- rows `23:25`
  - cumulative card-balance trackers
  - current live pattern:
    - `BMO` = row `151` minus row `152`
    - `TD` = row `153` minus row `154`
    - `CIBC` = row `155` minus row `156`
  - then each following week carries prior balance plus current-period net movement

Meaning:

- the helper strip is not decorative
- it is the readable cash-position layer built on top of the lower financing and ledger rows

### 4. Note hotspots are broader than first documented

Rows currently carrying at least one note include:

- `16`
- `28`
- `29`
- `41`
- `42`
- `43`
- `44`
- `46`
- `51`
- `65`
- `68`
- `71`
- `88`
- `92`
- `105`
- `110`
- `111`
- `112`
- `115`
- `128`
- `131`
- `134`
- `144`
- `145`
- `146`
- `149`
- `154`
- `176`

Meaning:

- notes are not just concentrated in one corner
- there is business context scattered through revenue, expense, marketing, owner-pay, HST, and financing rows

### 5. Whitespace drift is measurable, not anecdotal

Current live read:

- active rows with blank type:
  - `0`
- duplicate active `catkey`:
  - only `Marketing | Development Projects | SongBird Landing`
  - appears on rows `124` and `125`
- active rows with trailing-space drift in category / subcategory / detail / catkey:
  - `87`

Meaning:

- row structure is not broken
- but string hygiene is loose enough that future normalization work should be deliberate

### 6. There is now a repeatable inspection utility

Added:

- `scripts/inspect-weekly-actuals.mjs`

Purpose:

- re-run row summaries
- inspect one row or a row range
- list formula-bearing rows
- list note-bearing rows
- surface duplicate catkeys and whitespace drift

Meaning:

- future passes do not need to start from scratch
- this is now inspectable on demand instead of living only in chat memory

## Real Drift Risks

### 1. Partner-commission normalization boundary

Still open:

- should partner commissions stay as revenue in Weekly Actuals
- or be normalized lower in the stack
- or stay only as a dashboard interpretation adjustment

### 2. Embedded helper rows inside the ledger

Rows like `35`, `148`, and `151:158` mean:

- some business logic is hidden in weekly cells
- future agents or operators could mistake those for pure manual data rows

### 3. Placeholder rows

The `170:184` placeholders are not breaking anything now, but they are a future confusion point if someone inserts real rows without understanding how the rollups filter.

## What Is Clean

- Weekly Actuals is clearly the root finance sheet
- row architecture is stable
- the summary strip is behaving like a summary strip, not pretending to be source truth
- the monthly and annual stacks are really inheriting from this sheet
- the only confirmed external sheet dependency is the Admin deal ledger

## What Is Still Not Signed Off

- row-by-row business meaning
- which rows are operator input versus derived helper logic
- canonical treatment of partner commissions
- whether any legacy balancing formulas should survive a rebuild

## Best Validation Order

Walk the tab in this order:

1. rows `1:27`
   - summary + helper + week-key structure
2. rows `28:40`
   - revenue
3. rows `41:147`
   - expense blocks
4. rows `148:150`
   - HST
5. rows `151:196`
   - financing

That order follows the real dependency chain and makes the later cashflow work easier.

Operator walkthrough:

- see `docs/handoffs/2026-04-19-weekly-actuals-validation-sequence.md`
