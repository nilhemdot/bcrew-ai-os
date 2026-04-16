# Benson Crew - Owners Dashboard Source Notes

This note is the working source map for the `Benson Crew - Owners Dashboard` workbook.

Use it to capture:
- what each tab is for
- what one row means
- which columns are manual vs formula
- which tabs feed other tabs
- which adjustments are management interpretation versus raw operating truth

The goal is not to freeze the workbook in prose. The goal is to preserve the business logic so the system can read it correctly and later replace brittle spreadsheet logic with cleaner source contracts.

## Quick Audit

You do not need to read this whole note to know whether the Admin tab is wrapped.

What is locked:
- the `ADMIN ONLY - Deal Data Entry` tab is the upstream deal ledger for deal lifecycle, attribution, split credit, and downstream finance logic
- the meaning of the tab is locked through Column `CB`
- the system is using the literal live headers from the sheet, not guessed names
- the key logic is locked for:
  - timing chain (`F:I`)
  - attribution chain (`N:R`)
  - economics and split credit (`V:AP`)
  - split / apprenticeship helper (`BR`)
  - estimated Real Broker fee layer (`BS:BX`)
  - FUB linkage and new rollout fields (`BZ:CB`)

What still needs implementation later:
- Follow Up Boss parity and backfill
- Home Value Hub / Home Optima parity
- QuickBooks AR checks
- ISA-set rollout
- deal-or-lease rollout
- era-aware reporting
- coaching metrics

What to skim if you are auditing:
1. `Quick Audit`
2. `Full-Tab Audit Metrics`
3. `Business Eras`
4. the specific column section you care about

This note is primarily for system grounding and future integration work, not for a human to read top to bottom every time.

## Validation Status

### System-Validated So Far

- `ADMIN ONLY - Deal Data Entry`
  - validated through Column `CB`
  - literal live headers confirmed
  - row structure confirmed
  - key business logic confirmed
  - owner sign-off completed on `2026-04-16`
- `Current Source Hierarchy`
  - high-level role of:
    - `ADMIN ONLY - Deal Data Entry`
    - `(Input) Weekly Actuals`
    - `Cashflow Dash`
    - `QuickBooks`
- era boundary for analysis:
  - use executed deals from `2023-01-01` to today for broader context
  - but respect brokerage / Real Broker / Benson Crew era changes when interpreting results
- partner-commission management nuance:
  - captured at the source-contract / backlog level
  - not fully tab-by-tab validated yet through every rollup

### Not Fully Signed Off Yet

- `Split Cal`
  - only partially understood through its relationship to `BR`
  - not yet validated tab-by-tab
- `Agent Splits`
  - referenced through split / apprenticeship logic
  - not yet validated tab-by-tab
- `(Input) Weekly Actuals`
  - high-level role is understood
  - not yet validated line by line
- `Cashflow Dash`
  - high-level role and partner-commission adjustment are understood
  - the dashboard formulas and rollup logic are not yet fully audited end to end
- downstream rollups:
  - `Monthly Actuals (Roll Up)`
  - annual rollups
  - other dependent tabs
  - not yet validated tab-by-tab
- QuickBooks integration details
  - role is understood at a high level
  - real workflow details and field-by-field checks are not yet fully validated

### How To Use This Note

- treat the workbook itself as the parent data source
- treat the important tabs as validation units underneath it
- if you want to audit what is already locked:
  - use the `Quick Audit` section
  - then go to the specific Admin-tab columns you care about
- if you want to know what still needs walkthrough:
  - use the `Not Fully Signed Off Yet` list above

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
- `ADMIN ONLY - Deal Data Entry!A1:CB2000`

What is physically present in that range:
- Row `1`
  - header row
- Row `2`
  - warning row: `DO NOT EDIT OR DELETE THIS RED LINE! - CONTAINS IMPORTANT ARRAY FORMULAS  -->>`
- Rows `3:10`
  - template / formula rows in the current snapshot
- First live data row
  - variable based on how many template rows sit above the live ledger
  - in the current snapshot, live data begins at Row `11`
  - do not hardcode `11` as a permanent rule
- The tab currently ends at Column `CB`
  - there is no Column `CC`

### Full-Tab Audit Metrics

Directly measured from the live sheet:
- `80` columns total
  - `A:CB`
- `1506` rows with a non-empty `Deal #`
- `1504` operational / historical rows after excluding the two `Trade #### (For Goal Builder)` placeholder rows

Status distribution across rows with a populated `Deal #`:
- `Closed - Cash Collected`
  - `1453`
- `Pending`
  - `43`
- `Closed`
  - `10`

Lead-source quality:
- `unspecified`
  - `945`
- `Import`
  - `36`
- invalid lead-source count from those two values alone
  - `981 / 1506`
  - about `65.1%`

Follow Up Boss linkage:
- populated `Client Follow UP Boss ID`
  - `55 / 1506`
  - about `3.7%`
- missing FUB linkage
  - `1451 / 1506`
  - about `96.3%`

Recently added fields:
- `ISA Set Deal`
  - `1 / 1506` marked `Yes`
  - remaining live deal rows currently show `No`
- `Deal or Lease?`
  - `7 / 1506` explicitly tagged
  - `4` marked `Deal`
  - `3` marked `Lease`
  - `1499` still blank

Known trade-number collisions confirmed in the current snapshot:
- `T#25263`
  - appears on more than one row in the current snapshot
  - same realtor `Matt Allman`
  - both rows show `Total = 1`
- `T#25226`
  - appears on more than one row in the current snapshot
  - same realtor `Angelo Ricci`
  - both rows show `Total = 1`

Important handling rule:
- do not rely on row numbers when flagging collisions because the rows can move as new deals are added
- any future duplicate-check report should key off the trade number first, then inspect address, client, timing, realtor, and status before deciding whether it is a true duplicate, a split-credit case, or two different deals sharing a bad identifier

Known intentional placeholder identifiers seen directly:
- goal-builder placeholders used to make the Goal & KPI Calculator populate future years:
  - `Trade 2028 (For Goal Builder)`
  - `Trade 2027 (For Goal Builder)`

Known malformed or inconsistent trade identifiers seen directly:
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

Current working timing assumptions described by Steve and confirmed in the template formulas:
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
- these timing assumptions are useful for planning, but they are not guaranteed exact cash timings in every deal

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

Future control target:
- maintain an approved lead-source taxonomy that matches Follow Up Boss
- use that approved list to drive dropdown choices in the sheet
- route mismatches and unknown values into an issue queue instead of letting them sit as loose cleanup debt

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
- this is an ops failure when the chain is not traced correctly because the agents are doing the work and the system loses attribution truth

Follow Up Boss support fields for maintaining this:
- `Name of Person Who Gave Referral/Introduction`
- `Lead Source Secondary Information`

These fields should help preserve the chain connector:
- who gave the referral / introduction
- which source person or record the chain points back to
- whether the originating relationship already exists in Follow Up Boss

If the original source person is missing from Follow Up Boss:
- that is a cleanup problem
- and a database-growth opportunity because the upstream relationship should likely be created in the CRM

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
- company-vs-agent classification rules tied to the approved lead-source taxonomy

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
- this should eventually support capture-rate reporting:
  - which listings were eligible
  - which listings actually charged the fee
  - where agent coaching is needed

#### Column W — `Transaction Fee Amount`
- amount of the transaction fee collected
- target amount noted by Steve:
  - `1495 + HST`
- together with Column `V`, this should later support agent scorecards and transaction-fee coaching opportunities

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
- in the current Benson Crew era, this should be read mainly as what the team gets paid
- in older brokerage-era rows, it can reflect a fuller side rate before cobroke deductions

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
- important apprenticeship nuance:
  - graduation thresholds can differ by agent
  - some agents graduate after `70k` to the company
  - some may use a different threshold such as `100k`
  - later system logic will need cumulative apprenticeship tracking across years and agent-specific rules, not just this single year-scoped helper
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
- intended operating default is `No` because most deals are not ISA-set
- should become part of the company-vs-agent attribution logic
- direct audit note:
  - current snapshot shows `1` row marked `Yes`
  - `283` rows currently show `No`
  - `1222` deal rows are still blank, which indicates the newer field has not been backfilled across older rows yet

#### Column CB — `Deal or Lease?`
- recently added by Steve
- intended to separate true deals from lease deals cleanly
- should replace rough heuristics where possible
- direct audit note:
  - current snapshot shows `7` explicitly tagged rows
  - most legacy rows are still blank

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
11. validation failures should become tracked issues or cards, not just email threads or implied cleanup work

### Example Integrity Failures Seen During Audit

These are real failure patterns seen in the live tab. They are written as durable examples, not pinned to specific row numbers.

#### Lead source left blank on a live deal row
- a real pending or active deal can still be missing lead-source and attribution fields entirely

Why it is problematic:
- attribution becomes unknowable
- company-vs-agent classification becomes unknowable
- downstream source reporting breaks immediately

#### `Import` used as the lead source while the real source is buried in extra detail
- example pattern:
  - lead source = `Import`
  - extra lead-source detail = a real source such as `Sphere`

Why it is problematic:
- `Import` is not acceptable operating truth
- the true source should be normalized into the main lead-source field

#### `No Extra Lead Source` used where a chain clearly exists
- example pattern:
  - lead source implies a chain, referral, or sourced path
  - `Ground Zero` is still `No Extra Lead Source`

Why it is problematic:
- the original root source is not actually being traced
- attribution and company-credit logic break

#### `ISA Appointment Set` placed in the wrong field
- example pattern:
  - `ISA Appointment Set` appears in `Extra Orgin Lead Source Data`
  - instead of being tracked by `ISA Set Deal`

Why it is problematic:
- the sheet mixes source-lineage detail with ISA override logic
- company-vs-agent attribution becomes inconsistent

#### `Company or Agent` left inconsistent with source logic
- example pattern:
  - source lineage suggests company credit or needs review
  - `Company or Agent` still reads `Agent`

Why it is problematic:
- this field is currently being used manually and inconsistently
- it should eventually be rule-driven from approved lead-source taxonomy, ground-zero lineage, and ISA-set override

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
