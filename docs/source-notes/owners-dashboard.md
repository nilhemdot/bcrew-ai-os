# Owners Dashboard Source Notes

This note is the working source-map for the Owners Dashboard workbook.

Use it to capture how the sheet actually works:
- what each tab is for
- what one row means
- which columns are manual vs formula
- which tabs feed other tabs
- which adjustments are management interpretation versus raw operating truth

The goal is not to freeze the workbook in prose. The goal is to preserve the business logic so the system can read it correctly and later replace brittle spreadsheet logic with cleaner source contracts.

## Current Source Hierarchy

1. `ADMIN ONLY - Deal Data Entry`
   - upstream operating deal ledger
   - the holy grail tab for deal-level truth
2. `(Input) Weekly Actuals`
   - internal finance source of truth
   - week-by-week operating cash view
3. `Cashflow Dash`
   - management interpretation layer
   - internal P&L presentation for leadership
4. `QuickBooks`
   - compliance and tax ledger
   - not the internal operating truth

## ADMIN ONLY - Deal Data Entry

### Current Understanding

- This is the upstream deal ledger for the Owners Dashboard workbook.
- One trade can appear more than once when a deal is split across multiple agents.
- Trade number is the unique deal identifier, but not necessarily a unique row identifier.
- The tab is critical because it holds the timeline from signed client to firm deal to close to expected cash timing.

### Row Grain

Working assumption:
- one row represents one credited deal line, not always one unique transaction
- duplicated trade numbers can exist when agent credit is split across multiple people

This needs to stay explicit because downstream reporting may need:
- unique transaction counts
- unique trade counts
- credited production lines

### Column Notes

#### Column A
- Legacy / leftover field from an older workflow
- currently not considered strategically important

#### Column B — Trade Number
- Unique deal number used to represent the deal
- can repeat across rows when one deal is split between two agents
- example given by Steve: duplicate trade number across rows like 107 and 108

#### Column C — Deal Status
Important lifecycle field.

Current known states:
- `Pending`
  - waiting for the deal to close
- `Closed`
  - deal has officially closed and the team is waiting for cash
- `Closed Cash Collected`
  - deal closed and cash has been received

#### Columns D and E
- historical brokerage-era fields
- used for AR and, when applicable, AP entry into QuickBooks
- not strategically important in the current Real Broker setup
- still worth preserving until we confirm nothing downstream depends on them

#### Column F — Signed Client Date
- date the client was signed
- used to understand how long it takes from client signing to firm deal
- important for pipeline-flow and cycle-time analysis

#### Column G — Date Firm (Executed)
- one of the most important columns in the sheet
- date when deal conditions were removed and the deal became firm and binding
- Steve’s business meaning:
  - this is the day the company created cash
- should be treated as the economic creation date for deal-value truth

#### Column H — Closing Date
- date title should transfer from seller to buyer
- not the same thing as cash receipt

#### Column I — Expected Cash Deposit Date
- extremely important for financial modeling
- created because the team does not get paid on closing day
- current rule described by Steve:
  - add 10 days after closing for a sale because the company holds trust money and should get paid faster
  - add 14 days after closing for a buyer because the team must wait for lawyer -> listing brokerage trust clearing -> payment to the team
- this timing logic is foundational to the internal finance model

Important nuance:
- Steve also noted the team later updated Column I to reflect when the team actually got paid
- confirmed current meaning:
  - expected-until-overwritten-with-actual
- so Column I starts as the modeled expected cash date, then becomes the real paid date once cash is actually received

#### Column J — Days Firm to Close
- elapsed time from firm date to closing date
- useful for understanding deal timing
- together with Signed Client Date and Date Firm (Executed), this supports:
  - signed -> firm timing
  - firm -> close timing
  - eventually signed -> paid timing

### Why This Tab Matters

This tab appears to be the operating root for:
- deal lifecycle truth
- pipeline timing truth
- expected cash timing
- downstream financial modeling
- executed-date production truth

It should likely be treated as the upstream source behind:
- `SRC-OWNERS-001`
- parts of `SRC-FINANCE-001`

### Open Questions

1. What is the exact business meaning of one row:
   - one deal
   - one side
   - one credit line
   - one agent-comp line
2. What are the exact headers and current business roles of Columns D and E?
3. Which downstream tabs use Columns F through J directly versus through roll-ups?
