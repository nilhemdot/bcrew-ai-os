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

### Why This Tab Is Foundational

This is not just a deal log. It is the operating source behind:
- deal lifecycle truth
- timing from signed client to firm deal to close to cash receipt
- lead-source attribution
- company-generated versus agent-generated attribution
- agent split / deal-credit math
- commission and profitability analysis
- Follow Up Boss reconciliation
- downstream cash modeling and finance roll-ups

If this tab is wrong, the system will misread:
- where money came from
- who should get credit
- whether the company generated the business
- how long cash takes to materialize
- how profitable deals and agents actually are

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

#### Column K — Client Name
- client name

#### Column L — Deal Address
- property address for the deal

#### Column M — Deal Type
- current known values:
  - `Sell`
    - listing sold
  - `Buy`
    - team helped a buyer
  - `Referral`
    - referred a buyer or seller to another agent and got paid a referral fee

Important nuance:
- older data does not reliably distinguish lease deals from true buy/sell deals
- Steve added a later field in Column `CB` (`Deal or Lease`) to improve this
- fallback heuristic mentioned by Steve:
  - if list price or sale price is under `200k`, it is likely a lease
- use that heuristic carefully and treat `CB` as the cleaner future field

#### Column N — Lead Source
- one of the most operationally important columns in the sheet
- must match a valid Follow Up Boss lead source exactly
- `Unspecified` and `Import` are not acceptable steady-state values
- mismatches between this column and Follow Up Boss should be treated as an operational failure

Important business rule:
- Steve actively trims and manages the Follow Up Boss lead-source list
- when lead sources are merged or cleaned up in Follow Up Boss, this workbook must be cleaned up too

This column is critical for:
- money-by-source analysis
- company vs agent attribution
- marketing ROI
- operational compliance
- future CRM reconciliation

#### Column O — Secondary Lead-Source Detail
Working understanding:
- this stores extra detail about the main lead source
- current usage quality is inconsistent and often wrong
- Steve's examples:
  - a social-media lead with `Branded Website` as extra source detail is not coherent
  - a referral fee with `NA` as extra source detail leaves the referring person undefined
  - `Import` with `Sphere` as secondary detail should likely have been normalized into the actual source

#### Column P — Ground-Zero Lead Source
Working understanding:
- this stores the original root source of the deal
- this is meant to trace the original root source of the deal
- example business meaning:
  - online lead
  - met in person
  - family
  - direct relationship
  - introduction / referral back to the original root source

This matters because:
- if the original root source is company-generated, the company should get credit
- if the ground-zero logic is not traced correctly, attribution breaks

Operational note from Steve:
- Ops is supposed to trace the deal back to the original source
- this is currently a major operating gap

#### Column Q — Ground-Zero Source Extra Detail
- extra detail about the ground-zero source
- currently used poorly in some rows
- example from Steve:
  - `ISA Appointment Set` does not belong here because it is not extra detail about the ground-zero source
- Steve added Column `CA` later to track ISA-set deals directly instead

#### Column R — Company Generated
- indicates whether the deal was company-generated
- current usage is inconsistent

Important rule from Steve:
- if the lead source is agent-sourced but the deal is tagged `ISA set`, it should still be treated as `company`

This column should eventually be rule-driven from:
- lead source taxonomy
- ground-zero source logic
- ISA-set flag

#### Column S — Realtor
- the agent / realtor who did the deal

#### Column T — Deal Share Percent
- how much of the deal that credited row gets
- examples:
  - `100%` = handled alone
  - `50/50`
  - `75/25`
  - `25/25/25/25`
- this later translates into:
  - Volume Credit (`AG`)
  - Commission Credit (`AH`)
  - Deal Credit (`AI`)

#### Column U
- old field
- not valid in the current workflow

#### Column V — Transaction Fee Collected?
- only really applies to listings / sales
- if Column `M` is `Buy` or `Referral`, this should be `NA`
- every listing is a chance to charge a transaction fee
- this is strategically important because it is a coaching and profitability lever

Business meaning:
- low transaction-fee capture means the agent is leaving profit on the table
- this should become a coaching signal, not just a spreadsheet value

#### Column W — Transaction Fee Amount
- amount of the transaction fee collected
- standard target noted by Steve:
  - `1495 + HST`

#### Column X — List Price
- the list price of the property whether deal type is buy or sell

#### Column Y — Sale Price
- the transacted / sale price

#### Column Z — List Price to Sale Price Ratio
- performance metric interpreted differently by side represented

Business meaning:
- for a seller/listing agent:
  - higher is better
  - `99%` would be ideal
- for a buyer agent:
  - lower is better
  - `95%` would be strong

This should become a real agent-performance stat later.

#### Column AA — Commission Charged
- commission rate charged on the deal
- target rate is `2.5%`
- current reality varies:
  - some deals at `1%`
  - some at `3%`
- the KPI dashboard currently tracks this average

#### Column AB — Gross Commission
- gross commission amount
- calculation described by Steve:
  - `sale price x commission rate = gross commission`

#### Columns AC and AD
- legacy cobroke-era fields
- `AC` may still track the cobroke brokerage name
- `AD` is the amount paid to the cobroke
- these were more relevant when Steve was the actual broker and paid cobrokes directly
- they are not strategically important for the last two years, but old rows still contain real history

#### Column AF — Gross to Team / Commission Paid to Team
- what the team actually got paid after any cobroke payout
- in the current world this is effectively the commission paid to the team
- Steve noted this is functionally the more important paid-to-team number now

#### Column AG — Volume Credit
- credited deal volume for that row

#### Column AH — Commission Credit
- credited commission for that row

#### Column AI — Deal Credit
- credited deal count/share for that row

Important split nuance:
- when a deal is split, only the top row may hold the paid-to-team cash number
- later split-credit rows can still carry their own volume, commission, and deal credits
- Steve example:
  - one row has the `AF` cash value
  - split rows still each hold their own `AG/AH/AI` credit values

This is why row grain cannot be finalized until the credit area is fully understood.

#### Column AE
- not yet clearly defined from the walkthrough
- likely adjacent to the old cobroke / paid-to-team transition area
- needs verification before we rely on it in any contract or derived metric

#### Columns AJ, AK, AL — Outbound Referral Fee
- `AJ`
  - total referral amount paid out
- `AK`
  - who received the referral
- `AL`
  - referral percentage
  - example: `25%`

#### Column AM — Net to Team
- what is left for the team after referrals
- this is the amount that gets split with the agent

#### Column AN — Agent Percent
- the percentage of the net-to-team amount that the agent receives

#### Column AO — Agent Portion
- calculation:
  - `Net to Team (AM) x Agent % (AN)`

#### Company Portion
- company portion is what remains after the agent portion is removed from net to team
- Steve described it conceptually as:
  - `Net to Team - Agent Portion = Company Portion`

#### Columns AQ to BE
- mostly not used in the current workflow
- `AQ` recruit bonus is effectively dead

#### Date Helper Columns — BF through BQ
- formula-driven date helper fields for dashboards and roll-ups
- examples described by Steve:
  - days from firmed deal to close
  - executed year-month
  - executed month
  - executed quarter
  - executed year
  - similar helper fields for deposit timing
  - similar helper fields for closing timing

These columns should be treated as dashboard helper dimensions derived from the core dates, not primary source inputs.

#### Column BR
- appears to support the agent split calculator
- Steve's current understanding:
  - shows how much that agent has paid to the team year-to-date
- this likely matters for split-threshold logic

#### Columns BS through BX — Expected Fees and Deductions
- added to help estimate what the team/company will owe from a given deal

Current meanings described by Steve:
- `BS`
  - expected split paid to Real Broker from that deal
- `BT`
  - company portion of the transaction fee expected to be paid to Real
- `BU`
  - expected broker compliance / CBR fee
- `BV`
  - expected annual fee
- `BW`
  - any other fees expected from that deal
- `BX`
  - owner stock purchase amount tied to that deal
  - if an owner buys stock under their own name, that amount needs to be deducted from their pay

#### Column BY
- intended as a new expected-cash-to-company field
- not actively used right now
- possible future cleanup target

#### Column BZ — Follow Up Boss ID
- intended CRM linkage field
- should connect the deal to the Follow Up Boss contact/user
- the last numbers view / `#` is the user ID that can be used with the FUB API

This is strategically important because it should let the system:
- validate lead-source accuracy
- trace deals back to CRM records
- run compliance checks between the sheet and FUB

#### Column CA — ISA Set Deal
- recently added by Steve
- created because ISA-set status was being shoved into the wrong place earlier
- should become part of the company-vs-agent attribution logic

#### Column CB — Deal or Lease
- recently added by Steve
- intended to separate true deals from lease deals cleanly
- should eventually replace rough heuristics where possible

### Critical Validation Rules

These should eventually become explicit data-quality checks, not tribal knowledge.

1. Trade number can repeat when credit is split.
   - duplicate trade numbers are not automatically duplicates/errors
2. Column `G` (`Date Firm (Executed)`) is the economic cash-created date.
   - treat this as the true executed-date anchor
3. Column `I` is hybrid.
   - starts as expected paid date
   - later gets overwritten with actual paid date
4. Lead source must match Follow Up Boss exactly.
   - `Import` and `Unspecified` are high-severity failures
5. Secondary source detail must logically match the lead source.
   - if not, the row should be flagged for cleanup
6. Ground-zero source must preserve the true original origin of the deal.
   - this is what determines company credit correctly
7. Company-generated status should be rule-driven.
   - lead-source taxonomy
   - ground-zero lineage
   - ISA-set override
8. If deal type is `Buy` or `Referral`, transaction-fee status should be `NA`.
9. If a deal is split, the cash-to-team value may exist only on the top row while credit values still appear on the split rows.
10. Follow Up Boss linkage in Column `BZ` should eventually allow source and attribution reconciliation.

### Signals Worth Systemizing Later

- signed -> firm cycle time
- firm -> close cycle time
- signed -> paid cycle time
- lead-source integrity and FUB parity
- ground-zero source tracing
- company-generated versus agent-generated compliance
- listing transaction-fee capture rate by agent
- list-price to sale-price performance by buy side versus listing side
- commission-rate discipline
- lease versus deal reporting

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
3. Confirm the exact header names for Columns O, P, and Q even though the business meaning is now documented.
4. What is Column AE used for today, if anything?
5. Which downstream tabs use Columns F through J directly versus through roll-ups?
