# Owners Dashboard Source Notes

This note is the working source map for the Owners Dashboard workbook.

Use it to capture:
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

### Direct Audit Scope

Directly reviewed in the live sheet:
- `ADMIN ONLY - Deal Data Entry!A1:CB1514`

What is physically present in that range:
- Row `1`
  - header row
- Row `2`
  - warning row: `DO NOT EDIT OR DELETE THIS RED LINE! - CONTAINS IMPORTANT ARRAY FORMULAS  -->>`
- Rows `3:10`
  - template / formula rows
- Real populated data begins at Row `11`
- The tab currently ends at Column `CB`
  - there is no Column `CC`

### Full-Tab Audit Metrics

Directly measured from the live sheet:
- `80` columns total
  - `A:CB`
- `1504` rows with a non-empty `Deal #`
- `1502` operational / historical rows after excluding the two `Trade #### (For Goal Builder)` placeholder rows

Status distribution across rows with a populated `Deal #`:
- `Closed - Cash Collected`
  - `1451`
- `Pending`
  - `44`
- `Closed`
  - `9`

Lead-source quality:
- `unspecified`
  - `948`
- `Import`
  - `36`
- invalid lead-source count from those two values alone
  - `984 / 1504`
  - about `65.4%`

Follow Up Boss linkage:
- populated `Client Follow UP Boss ID`
  - `45 / 1504`
  - about `3.0%`
- missing FUB linkage
  - `1459 / 1504`
  - about `97.0%`

Recently added fields:
- `ISA Set Deal`
  - `0 / 1504` populated in the audited tab
- `Deal or Lease?`
  - `0 / 1504` populated in the audited tab

Known suspicious duplicate trade rows confirmed directly:
- `T#25263`
  - rows `136` and `137`
  - same realtor `Matt Allman`
  - both `Total = 1`
- `T#25226`
  - rows `245` and `246`
  - same realtor `Angelo Ricci`
  - both `Total = 1`

Known non-operational / malformed trade identifiers seen directly:
- goal-builder placeholders:
  - `Trade 2028 (For Goal Builder)`
  - `Trade 2027 (For Goal Builder)`
- naming-format anomalies:
  - `T23051`
  - ` T#23012`
  - `14002`
  - `14001`
  - `T#20125anotheronewrong`
- older naming variants:
  - `GTA#24091`
  - `GTA#24088`
  - `GTA#24076`
  - `GTA#24077`
  - `GTA#24075`
  - `GTA#24074`
- lower-case split suffix examples:
  - `T#22008a`
  - `T#22008b`
  - `T#22008c`

### Business Eras

The Admin tab spans multiple operating eras. Any serious KPI, attribution, or seasonality analysis needs to respect this.

#### Brokerage Era
- before about `2023-04-01`
- Zahnd Team Real Estate Advisors in brokerage
- cobroke fields matter here:
  - `Listing/Co-Broker`
  - `Commission to Co-Broke`
  - `Paid To Co-Broke`

#### Real Broker Era
- about `2023-04-01` through `2025-06-30`
- no longer operating as a brokerage
- old cobroke logic becomes less relevant
- the abandoned Real split-calculation attempt lives in the back half of the tab

#### Benson Crew Era
- about `2025-07-01` onward
- current operating era
- current lead-source taxonomy, FUB linkage expectations, and KPI-dashboard presentation logic belong here

Recommended analysis boundary:
- use executed deals from `2023-01-01` to today for seasonality and longer-term trend context
- but filter by era whenever column meaning, payout logic, or attribution rules changed

### Row Grain

Locked understanding:
- one row represents one credited deal line, not always one unique transaction
- duplicated trade numbers can exist when agent credit is split across multiple people

This needs to stay explicit because downstream reporting may need:
- unique transaction counts
- unique trade counts
- credited production lines

### Column Notes

#### Column A
- legacy / leftover field from an older workflow
- Steve explicitly does not want this treated as a source-of-truth field now, even though old values remain in the sheet

#### Column B — `Deal #`
- unique deal number used to represent the deal
- can repeat across rows when one deal is split between two agents
- split examples are real and should not be treated as duplicates automatically

#### Column C — `Deal Status`
Current known values:
- `Pending`
- `Closed`
- `Closed - Cash Collected`

Business meaning:
- `Pending`
  - waiting for the deal to close
- `Closed`
  - deal has officially closed and the team is waiting for cash
- `Closed - Cash Collected`
  - deal closed and cash has been received

#### Column D — `Commission/Fees Into Accounting Software?`
- still relevant in the current workflow
- confirms the AR / commission side of the deal has been entered into QuickBooks
- this should be treated as a live accounting-control field, not just historical bookkeeping residue

#### Column E — `Co-Broke and Agent Expense Status`
- legacy brokerage-era wording
- effectively useless right now in the current workflow
- may be repurposed later if the team wants a dedicated field for agent expenses accounted for / billed back

#### Column F — `Client Signed Date`
- date the client was signed
- used to understand how long it takes from client signing to firm deal
- important for pipeline-flow and cycle-time analysis
- caution:
  - on some old rows this can represent an old or restarted relationship, so extreme signed-to-firm gaps should be treated carefully

#### Column G — `Date Firm (Executed)`
- one of the most important columns in the sheet
- date when conditions were removed and the deal became firm and binding
- Steve’s business meaning:
  - this is the day the company created cash
- should be treated as the economic creation date for deal-value truth

#### Column H — `Expected Closing`
- expected day title should transfer from seller to buyer
- not the same thing as cash receipt

#### Column I — `Expected Cash Deposit`
- extremely important for financial modeling
- created because the team does not get paid on closing day

Current timing rules described by Steve and confirmed in template formulas:
- `Sell`
  - closing date + `10` days
- `Buy`
  - closing date + `14` days
- `Referral`
  - closing date + `0` days

Important nuance:
- Column `I` is hybrid
- it starts as expected paid date
- later it gets overwritten with the actual paid date once cash is received

#### Column J — `Days Between Executed and Closing`
- elapsed time from executed date to expected closing
- together with `Client Signed Date` and `Date Firm (Executed)`, this supports:
  - signed -> firm timing
  - firm -> close timing
  - eventually signed -> paid timing

#### Column K — `Client Name`
- client name
- integrity rule:
  - this should ideally match the linked Follow Up Boss contact
  - if the name in the sheet and the linked FUB person do not line up, treat that as a data-integrity issue
- likely failure modes:
  - Follow Up Boss was not updated properly
  - the sheet entry is wrong
- this should become a real reconciliation check, not a manual cleanup guess

#### Column L — `Deal Address`
- property address
- integrity rule:
  - if `Buy / Sell / Referral` is `Buy`, the address should be updated in Follow Up Boss and should match there
  - if `Buy / Sell / Referral` is `Sell`, an address mismatch matters less because the client sold that property
- future system check:
  - bought-property addresses should be cross-checked between:
    - Follow Up Boss
    - Home Value Hub internally / Home Optima externally
- this matters because missing or mismatched bought-property addresses break downstream homeowner-marketing and client-value workflows

#### Column M — `Buy / Sell / Referral`
Current known values:
- `Sell`
- `Buy`
- `Referral`

Important nuance:
- older data does not reliably distinguish lease deals from true buy/sell deals
- Steve added Column `CB` (`Deal or Lease?`) to improve this
- fallback heuristic mentioned by Steve:
  - if list price or sale price is under `200k`, it is likely a lease
- use that heuristic carefully and treat `CB` as the cleaner future field

#### Column N — `Lead Source (Bonus System For Having This 100% Complete)`
- one of the most operationally important columns in the sheet
- must match a valid Follow Up Boss lead source exactly
- `unspecified` and `Import` are not acceptable steady-state values
- mismatches between this column and Follow Up Boss should be treated as an operational failure

This column is critical for:
- money-by-source analysis
- company vs agent attribution
- marketing ROI
- operational compliance
- future CRM reconciliation

#### Column O — `Extra Lead Source Data`
- extra detail about the main lead source
- current usage quality is inconsistent and often wrong

Examples from live rows / Steve’s walkthrough:
- a social-media lead with `Branded Website` as extra source detail is not coherent
- a referral fee with `N/A` as extra source detail leaves the referring person undefined
- `Import` with `Sphere` as secondary detail should likely have been normalized into the actual source

#### Column P — `Ground Zero`
- intended to trace the original root source of the deal

Business meaning examples:
- online lead
- met in person
- family
- direct relationship
- introduction / referral back to the original root source

This matters because:
- if the original root source is company-generated, the company should get credit
- if the ground-zero logic is not traced correctly, attribution breaks
- sometimes `Lead Source (Bonus System For Having This 100% Complete)` is itself the ground zero
  - examples:
    - `Family`
    - `Met - In Person`
- but if the lead source clearly implies a chain, connection, introduction, or referral path, then `Ground Zero` must follow that chain back to the original source
- if a chained lead source shows `No Extra Lead Source` in `Ground Zero`, that is usually wrong
- if a referral leads to another referral, the team still needs to keep following the chain until it reaches a true ground-zero source
- if the original source or person does not exist in Follow Up Boss, that is not just a cleanup issue
  - it is also a database-growth opportunity because the original relationship should likely exist in the CRM

Operational note from Steve:
- Ops is supposed to trace the deal back to the original source
- this is currently a major operating gap

#### Column Q — `Extra Orgin Lead Source Data`
- extra detail about the ground-zero source
- currently used poorly in some rows
- example from Steve:
  - `ISA Appointment Set` does not belong here because it is not extra detail about the ground-zero source
- Steve added Column `CA` later to track ISA-set deals directly instead

#### Column R — `Company or Agent`
- indicates whether the deal is currently attributed to company or agent
- current usage is inconsistent

Important rule from Steve:
- if the lead source is agent-sourced but the deal is tagged `ISA set`, it should still be treated as company

This column should eventually be rule-driven from:
- lead-source taxonomy
- ground-zero lineage
- ISA-set override

#### Column S — `Realtor`
- the agent / realtor who did the deal
- old anonymized names like `zz -bt` represented departed agents in an earlier presentation workflow
- Steve no longer wants future presentation logic to rely on that convention because the KPI dashboard can handle presentation separately

#### Column T — `Total`
- despite the literal header, this holds the split share for that credited row

Examples:
- `1`
- `0.5`
- `0.75`
- `0.25`

This later translates into:
- `Volume Credit`
- `Commission Credit`
- `Deal Credit`

#### Column U — `Recruit Bonus/Expansion Partnership?`
- older workflow field
- Steve’s current read is that it is not part of the current operating logic

#### Column V — `Listing Transaction Fee?`
- only really applies to listing / sell deals
- if Column `M` is `Buy` or `Referral`, this should be `N/A`
- every listing is a chance to charge a transaction fee
- this is strategically important because it is a coaching and profitability lever

#### Column W — `Transaction Fee Amount`
- amount of the transaction fee collected
- target amount noted by Steve:
  - `1495 + HST`

#### Column X — `List Price`
- list price of the property

#### Column Y — `Sale Price`
- transacted / sale price

#### Column Z — `LP/SP Ratio`
- performance metric interpreted differently by side represented

Business meaning:
- if we represented the seller:
  - higher is better
  - `99%` would be ideal
  - this shows how much of the asking price we protected or beat
  - stronger results usually imply better pricing strategy, stronger positioning, and stronger negotiation
- if we represented the buyer:
  - lower is better
  - `95%` would be strong
  - this shows how much below asking price we negotiated
  - stronger results usually imply better negotiation leverage and better purchase discipline for the client

Important interpretation rule:
- this should never be treated as one flat team metric without side context
- seller-side LP/SP and buyer-side LP/SP mean different things and should be coached separately

#### Column AA — `Commission Charged`
- commission rate charged on the deal
- target rate is `2.5%`
- older brokerage-era rows can carry very different rates

#### Column AB — `Gross Commission`
- gross commission amount
- template formula confirms:
  - `Sale Price x Commission Charged`

#### Column AC — `Listing/Co-Broker`
- old brokerage-era cobroke field
- can still carry historical broker names on older rows

#### Column AD — `Commission to Co-Broke`
- old brokerage-era cobroke rate / amount driver

#### Column AE — `Paid To Co-Broke`
- cash paid to the cobroke
- template formula confirms:
  - `=Y * AD`

#### Column AF — `Gross To Team`
- what the team actually got paid after any cobroke payout
- template formula confirms:
  - `=AB - AE`
- in the current world this is effectively the commission paid to the team

#### Column AG — `Volume Credit`
- credited deal volume for that row

#### Column AH — `Commission Credit`
- credited commission for that row

#### Column AI — `Deal Credit`
- credited deal count/share for that row

Important split nuance:
- when a deal is split, only the top row may hold the paid-to-team cash number
- later split-credit rows can still carry their own `Volume Credit`, `Commission Credit`, and `Deal Credit`

#### Column AJ — `Paid to Outside Referral`
- total referral amount paid out

#### Column AK — `Referral Fee Person`
- who received the referral

#### Column AL — `Total Referral Fee`
- live header says `Total`
- Steve’s business meaning in practice:
  - percentage of referral fee paid
  - example: `25%`
- this is a real sheet inconsistency and should be treated as such

#### Column AM — `Net To Team`
- what is left for the team after referrals
- this is the amount that gets split with the agent

#### Column AN — `Split To Agent`
- the percentage of the net-to-team amount that the agent receives

#### Column AO — `Agent Portion`
- calculation:
  - `Net To Team x Split To Agent`

#### Column AP — `Company/Team Lead Portion`
- company portion after the agent portion is removed from net to team
- conceptually:
  - `Net To Team - Agent Portion`

#### Column AQ — `Recruit Bonus`
- effectively dead in the current workflow

#### Columns AR:BE — Abandoned Real Broker Cost / Split Calculation Block
- these columns were part of an abandoned attempt to calculate Real Broker costs and related split logic
- Steve’s current operating rule:
  - do not treat this block as live source-of-truth infrastructure
- reason:
  - chronological close-order skew makes the running cap math unreliable
- important distinction:
  - this block has nothing to do with `Column BR`
- the working replacement for expected company-side Real fees is the later `BS:BX` block

Exact live headers:
- `AR`
  - `Agent Portion of Split or Transaction Fee`
- `AS`
  - `Team Lead`
- `AT`
  - `Team Lead Portion of Split or Transaction Fee`
- `AU`
  - `Agent Cap Start Date`
- `AV`
  - `Agent A or B Split`
- `AW`
  - `Agent Cap`
- `AX`
  - `Agent Portion Of Split`
- `AY`
  - `Cap YTD Split Running Total`
- `AZ`
  - `Agent Email`
- `BA`
  - `Team Lead Cap Start Date`
- `BB`
  - `A or B Split`
- `BC`
  - `Team Lead Cap`
- `BD`
  - `Team Lead Portion Of Split`
- `BE`
  - `Team Lead Cap YTD Split Running Total`

#### Column BF — `Days from Firmed to Closed`
- helper duration field

#### Executed-Date Helper Block
- `BG`
  - `Executed Year Month`
- `BH`
  - `Executed Month`
- `BI`
  - `Executed Quarter`
- `BJ`
  - `Executed Year`

#### Deposit-Date Helper Block
- `BK`
  - `Deposit Month`
- `BL`
  - `Deposit Quarter`
- `BM`
  - `Deposit Year`

#### Closing-Date Helper Block
- `BN`
  - `Closing Year Month`
- `BO`
  - `Closing Month`
- `BP`
  - `Closing Quarter`
- `BQ`
  - `Closing Year`

#### Column BR — `Net To Team Running Total`
- running total helper used by the `Split Cal` flow
- business meaning:
  - tracks an individual agent’s executed `Net To Team` year to date
  - helps determine where that agent sits in an inclining split structure
  - helps determine how far along an agent is in apprenticeship based on dollars generated to the team
  - helps determine when the agent graduates out of apprenticeship and into the next split logic
- operational dependency:
  - the `Agent Splits` tab needs the full roster loaded for each calendar year so the split calculator resets and reads the right year correctly
- important distinction:
  - `BR` is tied to the `Split Cal` / `Agent Splits` logic
  - it is not part of the abandoned `AR:BE` Real Broker cost-calculation block

#### Columns BS:BX — Estimated Company Portion / Real Broker Fee Layer
- this is the working replacement block Steve actually uses for expected company-side deductions

Exact live headers:
- `BS`
  - `Estimated Company Portion Split`
- `BT`
  - `Estimated Company Portion Transaction Fee`
- `BU`
  - `Estimated Company Portion CBR Fee`
- `BV`
  - `Estimated Company Portion Annual Fee`
- `BW`
  - `Estimated Company Portion Other Fee`
- `BX`
  - `Estimated Company Poriton Stock Purchse Plan (Billed Back to Owner)`

#### Column BY — `Total Estimated Deposit To Company`
- intended as the new expected cash-to-company field
- not actively used right now

#### Column BZ — `Client Follow UP Boss ID`
- current live values in populated rows are full Follow Up Boss person URLs, not just a bare numeric ID
- the trailing ID in that URL can still be used with the FUB API
- this field is strategically important for CRM reconciliation

#### Column CA — `ISA Set Deal`
- recently added by Steve
- created because ISA-set status was being shoved into the wrong place earlier
- will now start getting used
- should become part of the company-vs-agent attribution logic
- direct audit note:
  - no populated values were present in the audited tab

#### Column CB — `Deal or Lease?`
- recently added by Steve
- intended to separate true deals from lease deals cleanly
- should replace rough heuristics where possible
- direct audit note:
  - no populated values were present in the audited tab

### Critical Validation Rules

These should eventually become explicit data-quality checks, not tribal knowledge.

1. `Deal #` can repeat when credit is split.
   - duplicate trade numbers are not automatically errors
2. `Date Firm (Executed)` is the economic cash-created date.
3. `Expected Cash Deposit` is hybrid.
   - starts as expected paid date
   - later gets overwritten with actual paid date
4. lead source must match Follow Up Boss exactly.
   - `Import` and `unspecified` are high-severity failures
5. `Extra Lead Source Data` must logically match the lead source.
6. `Ground Zero` must preserve the true original origin of the deal.
7. `Company or Agent` should eventually be rule-driven from source lineage + ISA-set logic.
8. If `Buy / Sell / Referral` is `Buy` or `Referral`, `Listing Transaction Fee?` should be `N/A`.
9. If a deal is split, `Gross To Team` may exist only on the top row while credits still appear on the split rows.
10. `Client Follow UP Boss ID` should eventually allow source and attribution reconciliation.

### Direct Audit Findings From Rows 11-13

These rows confirm the kinds of operational failures Steve called out.

#### Row 11
- lead source:
  - `Met - Social Media`
- extra lead-source detail:
  - `Branded Website`
- ground zero:
  - `No Extra Lead Source`
- extra origin detail:
  - `ISA Appointment Set`
- company or agent:
  - `Agent`

Why it is problematic:
- `Branded Website` does not logically fit `Met - Social Media`
- `ISA Appointment Set` appears in the wrong field
- `Company or Agent` is set to `Agent` even though ISA-set logic should likely push this toward company attribution

#### Row 12
- `Buy / Sell / Referral`
  - `Referral`
- lead source:
  - `Agent/Other Referral`
- extra lead-source detail:
  - `N/A`

Why it is problematic:
- a referral without the referring source/person being identified weakens attribution and traceability

#### Row 13
- `Buy / Sell / Referral`
  - `Buy`
- lead source:
  - `Import`
- extra lead-source detail:
  - `Sphere`

Why it is problematic:
- `Import` is not an acceptable operating source of truth
- `Sphere` should likely have been normalized into the real lead-source field or traced more cleanly

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
