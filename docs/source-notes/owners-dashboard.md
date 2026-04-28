# Benson Crew - Owners Dashboard Source Notes

This note is the working source map for the `Benson Crew - Owners Dashboard` workbook.

Use it to capture:
- what each tab is for
- what one row means
- which columns are manual vs formula
- which tabs feed other tabs
- which adjustments are management interpretation versus raw operating truth

The goal is not to freeze the workbook in prose. The goal is to preserve the business logic so the system can read it correctly and later replace brittle spreadsheet logic with cleaner source contracts.

Visible closeout sequence:

- [docs/rebuild/owners-closeout.md](/Users/bensoncrew/bcrew-ai-os/docs/rebuild/owners-closeout.md)

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
- QuickBooks AR verification only
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
  - the budget and rollup tabs are now validated for meaning
  - doctrine is now locked:
    - `Weekly Actuals` = bookkeeping truth
    - `Cashflow Dash` budget overview = management truth after normalization

### Done For Meaning

- `(Input) Weekly Actuals`
  - base-ledger role is locked
  - category spine is locked
  - weekly expected-commission bridge from the Admin tab is locked
  - normalization context is locked well enough for downstream reading
- `Split Cal`
  - dependency chain is locked
  - payout-band logic is locked
  - apprenticeship and threshold-crossing meaning is locked
- `Agent Splits`
  - row shape is locked
  - split-package patterns are locked
  - accountability rule for fuzzy rows is locked
- `Listings and Conditional Deals`
  - current role is locked
  - handoff rule into the Admin ledger is locked
  - manual split-field meaning is locked
- `Sales & Deposit`
  - scoreboard role is locked
  - dependency chain is locked
  - formula architecture is locked
  - conditional-format rules are locked
- `Goal & KPI Calculator`
  - bridge-layer role is locked
  - planning blocks are locked
  - seasonality blocks are locked
  - target-output blocks are locked
  - old-BIS import bridge is locked
- `CI Report`
  - AR dashboard role is locked
  - dual-source comparison logic is locked
  - period selector is locked
  - conditional-format rules are locked
- `Cashflow Dash`
  - dashboard role is locked
  - dependency chain is locked
  - runway math is locked
  - chart logic is locked
- `Monthly Budget`
  - category spine alignment is locked
  - live commission override is locked
  - top-strip source chain is locked
- `Budget Original`
  - baseline-planning role is locked
  - category spine alignment is locked
- `Monthly Actuals (Roll Up)`
  - monthly aggregation role is locked
  - month-key structure is locked
  - expected-deal-sheet bridge is locked
- `Annual Actuals (Roll Up)`
  - yearly actual rollup role is locked
  - partner-commission rows roll through cleanly
- `Annual Budget (Roll Up)`
  - yearly budget rollup role is locked
  - only the lower Category-ID formatting drift remains cosmetic

### Not Fully Signed Off Yet

- optional QuickBooks verification details
  - low priority
  - only matters if Steve later wants a light cross-check that Column `D` reflects accounting entry
  - QuickBooks is not a target operating source for the rebuild because it is compliance / tax reporting, not internal management truth

### Owners Workbook Closeout Read

Blunt read:

- the tracked Owners workbook tabs are closed for meaning
- we do not need another tab-discovery pass to understand how those tabs work
- the open item above is **adjacent system detail**, not a statement that the Owners workbook tabs are still unclear

Important distinction:

- `done for meaning` does **not** mean:
  - every external connector is validated
  - every downstream reconciliation is fully automated
  - every future rebuild decision is made
- it **does** mean:
  - the current workbook logic is mapped deeply enough that we should not need to redo the tab walkthrough

## First Governed Deal-Review Pattern

The first complete cross-system example is now proven:

- trade `T#26100`
- Owners row -> FUB person `116283` -> ClickUp roster task `868hre80z` -> Drive contract folder -> signed Matt Allman contract

What that proves:

- the live join path is real
- the `45 / 55` split on that row is contract-correct for Matt on ISA-set deals, including leases
- the row should still be treated as `Company`, not `Agent`
- the reviewed Freedom ops tabs did not show visible NPS / Google-review follow-through for that trade
- later Clare / policy evidence clarified that post-`2026-04-01` deal survey and review follow-through moved out of the old Freedom per-row bonus model, so missing Freedom follow-through is no longer a hard deal-row failure for post-policy deals

Operating rule now:

- new or exception rows should use the governed AI deal-review checklist
- review findings should live in `Ops Hub -> Deal Review Inbox`
- fixes happen in the real source systems:
  - Owners
  - FUB
  - Freedom
  - ClickUp
- then AI re-runs review

Contract rule now:

- do not re-read contracts on every deal
- lock a governed contract package once
- only re-open contract review when:
  - the contract link changes
  - contract metadata changes
  - a row exposes a mismatch
  - Steve says the package changed

Reference notes:

- [AI deal review checklist](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-21-ai-deal-review-checklist.md)
- [Deal review queue model](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-21-deal-review-queue-model.md)
- [Matt contract package](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-21-matt-allman-contract-package.md)

## Interim Admin-Tab Review Fields

Before a full `Ops Hub -> Deal Review Inbox` exists, the Admin tab can safely carry the first AI-review state directly on the sheet.

Best temporary shape:

- `CC`
  - recommended header:
    - `AI Review Status`
  - this is the AI-written result field
  - better than a hard binary `Pass / Fail`
  - current best values:
    - `Not Reviewed`
    - `Issues Found`
    - `Clean`
    - `Needs Re-review`
- `CD`
  - recommended header:
    - `THIS ROW ONLY: REVIEW ACTION`
  - this is the human / ops action field
  - current best values:
    - `No Action`
    - `Needs Fixing`
    - `Review This Deal`
- `CE`
  - recommended header:
    - `AI Findings By System / Suggestions`
  - wide wrapped text field
  - should hold the key issues plus the suggested fix
  - best when broken into:
    - `Owners Sheet`
    - `Ops Follow-through`
    - `FUB`
    - `ClickUp / Contract`
  - each section should show:
    - how many checks passed
    - how many checks failed
    - only the failed items that still need action
  - do **not** claim passes for checks AI did not actually run
  - counts should reflect:
    - applicable checks actually run on that row
    - not every future check we may add later

Example `CE` output:

- `Owners Sheet — 0/2 passed · 2 failed`
- `Owners Sheet — 8/10 passed · 2 failed`
- `- Company or Agent should be Company because validated source lineage points to a company lead and ISA evidence exists.`
- `- Move ISA Appointment Set out of Extra Orgin Lead Source Data and rely on ISA Set Deal.`
- `ClickUp Follow-through — 2/7 passed · 5 failed`
- `- Q2 2026 bonus policy moved post-close survey/review accountability out of the old Freedom per-row bonus model for deals executed on or after 2026-04-01.`
- `- No ClickUp Deal Data Entry task found for Trade Number T#26098.`
- `FUB — 6/6 passed · 0 failed`
- `ClickUp / Contract — 6/6 passed · 0 failed`

Why this is the right temporary step:

- keeps review state beside the deal row
- does not require ClickUp as an extra review layer yet
- does not require a full Ops Hub before the first validations start
- still leaves room to move the same logic into a governed review inbox later

Recommended rule:

- start with sheet-visible review state now
- move to `Ops Hub -> Deal Review Inbox` later when the governed review layer is ready

Timing rule:

- do not run the **full** post-execution review the same week a deal firms
- wait until the row is at least `10` days past `Date Firm (Executed)`
- before that, use lighter checks only
- reason:
  - give Ops time to move CRM stages
  - give post-close follow-through time to appear in the live workflow source
  - reduce false failure noise

Operating flow now:

1. AI reviews the row.
2. AI writes:
   - `CC = Issues Found` or `Clean`
   - `CD = Needs Fixing` if work remains
   - `CD = No Action` if the row is clean
   - `CE = findings and suggested fixes`
3. Ops fixes the real source systems:
   - Owners
   - FUB
   - ClickUp
4. Ops changes that same row's `CD` value to `Review This Deal`.
5. The queued re-review lane picks up rows where `CD = Review This Deal`.
   - preferred trigger: `CD = Review This Deal`
   - compatibility trigger: `CC = Needs Re-review` also works because that dropdown caused operator confusion
6. The first-pass Admin backlog lane separately inspects the `5` newest eligible June 2025+ deals per day, newest to older, using `Date Firm (Executed)` and a `10`-day maturity gate.
7. AI re-reviews or first-pass reviews the row, rewrites `CC` / `CE`, then sets:
   - `CD = No Action` if clean

### First Mature 10-Day Review Batch

The first older post-execution batch surfaced repeatable issue patterns:

- `T#26092`
  - `Open House` row still marked `Agent` even though the current source taxonomy treats open house as company-owned
  - FUB still in `Firm Deal` after the expected close date
  - ClickUp Deal Data Entry follow-through is now the post-policy review source; missing Trade Number joins or incomplete NPS / Google review status fail the follow-through block
- `T#26088`
  - website / company lineage looks right
  - FUB still in `Lead` after the expected close date
  - ClickUp Deal Data Entry follow-through is now the post-policy review source; missing Trade Number joins or incomplete NPS / Google review status fail the follow-through block
- `T#26091`
  - in-person / agent lineage looks broadly right
  - FUB still in `Active Client` after the expected close date
  - ClickUp Deal Data Entry follow-through is now the post-policy review source; missing Trade Number joins or incomplete NPS / Google review status fail the follow-through block
- `T#26089`
  - referral handoff row shows Zoe-origin logic, but the deal row agent is Albert
  - FUB is still assigned to Zoe and still in `Active Client` after the expected close date
  - ClickUp Deal Data Entry follow-through is now the post-policy review source; missing Trade Number joins or incomplete NPS / Google review status fail the follow-through block
- `T#26073`
  - HomeOptima / company lineage looks right
  - FUB still in `Lead` after the expected close date
  - FUB has `ISA Set - Alyssa` evidence while Owners still says `ISA Set Deal = No`
  - ClickUp Deal Data Entry follow-through is now the post-policy review source; missing Trade Number joins or incomplete NPS / Google review status fail the follow-through block

The main mature-batch rule now:

- after the `10`-day gate, the most common failures are:
  - stale FUB lifecycle stage
  - unsettled post-close follow-through source proof
  - lineage / ISA mismatch on a small subset of rows
- `CD = Needs Fixing` if issues remain

Temporary rule:

- `CD` is a row-specific queue field, not a button
- do not type freeform notes there
- use `CE` for explanation
- use this review flow only for the rolling last `12` months of deals
- older historical cleanup can stay separate
- exact operator action:
  - go to the deal row with issues
  - fix the real source systems
  - change that row’s `CD` dropdown to `Review This Deal`
  - leave `CC` and `CE` for AI to rewrite

Formatting rule:

- `CC` should use simple traffic-light formatting
  - `Clean` = green
  - `Needs Re-review` = yellow
  - `Issues Found` = red

ISA mismatch rule:

- if FUB shows real ISA evidence but `ISA Set Deal` is not marked correctly, flag it
- if `ISA Set Deal = Yes` but no supporting CRM evidence exists, flag it

Current review packs by system:

- `Owners Sheet`
  - row exists
  - key identity fields are populated
  - lead source is valid
  - extra lead source is coherent
  - ground-zero lineage is coherent
  - extra-origin field is coherent
  - `Company or Agent` matches the validated source rule
  - FUB URL exists
  - `ISA Set Deal` is coherent
  - `Deal or Lease?` is populated
  - split / company math is coherent
- `Ops Follow-through`
  - pre-`2026-04-01` deals: historical Freedom row exists where expected
  - pre-`2026-04-01` deals: NPS follow-through is visible in Freedom
  - pre-`2026-04-01` deals: Google-review follow-through is visible in Freedom
  - post-`2026-04-01` deals: ClickUp Deal Data Entry is the hard follow-through source
  - post-`2026-04-01` deals: Trade Number must join to ClickUp
  - post-`2026-04-01` deals: internal onboarding and deal-management statuses should be completed, or skipped with a reason
  - post-`2026-04-01` deals: NPS and Google review statuses should be requested/captured or marked not eligible
  - post-`2026-04-01` deals: outreach evidence should point back to FUB call / review evidence when the workflow is marked started
- `FUB`
  - linked person exists
  - address matches
  - source lineage supports attribution
  - owner / stage read is sane
  - ISA evidence is coherent
  - no blocking CRM issue is visible on the linked record
- `ClickUp / Contract`
  - roster task exists
  - contract link exists
  - signed contract package is reachable
  - normal split is proven
  - ISA override is proven when relevant
  - lease rule is proven when relevant

Admin review v1 implementation status:

- `scripts/review-admin-deals.mjs` now enforces the v1 checklist that belongs in `DATA-006`.
- It writes the governed review result back to:
  - `CC = AI Review Status`
  - `CD = THIS ROW ONLY: REVIEW ACTION`
  - `CE = AI Findings By System / Suggestions`
- The current executable checks cover:
  - split totals, deal credit, volume credit, commission credit, gross-to-team anchor, and row cash math
  - missing client / company-agent basics
  - governed lead-source classification from `fub_lead_source_rules`
  - expected `Company` / `Agent` from source ownership plus ISA evidence
  - FUB person join through Column `BZ`
  - FUB source classification and Owners/FUB source mismatch
  - stale mature-deal CRM stages
  - missing `Past Client` tag / post-close automation marker on linked FUB people
  - ISA mismatch in both directions
  - pre-`2026-04-01` Freedom deal record, NPS follow-through, and Google-review follow-through by trade number
  - post-`2026-04-01` ClickUp Deal Data Entry follow-through by Trade Number
- The script still does not auto-fix source fields. Ops fixes source systems, then marks the row for re-review.
- Clear review sections stay compact in `CE`: the script writes summary lines plus only failed findings, not extra "no issue found" lines.

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

## Split Cal

### What It Is

`Split Cal` is not its own source-of-truth layer.

It is a deal-level calculator that answers:

- where the selected agent sits in their split structure before the subject deal
- whether the subject deal changes that level
- how much of the subject deal goes to the agent
- the effective split percentage on that subject deal

### What It Reads

Current live dependency chain:

1. manual subject-deal inputs on `Split Cal`
2. split-plan lookup on `Agent Splits`
3. prior executed production pulled from `ADMIN ONLY - Deal Data Entry`

### Manual Inputs

Current live input cells:

- `B2`
  - `Agent`
- `B3`
  - `Deal Executed Date`
- `B4`
  - `Sale Price`
- `B5`
  - `Commission Rate`
- `B6`
  - `Deal Type`
- `B8`
  - final displayed split percent

Current live sample loaded during validation:

- `B2`
  - `Matt Allman`
- `B3`
  - `2026-04-07`
- `B4`
  - `$1,055,000`
- `B5`
  - `3.00%`
- `B6`
  - `Agent`

### Agent Splits Dependency

The lookup key is built in `D3`:

- formula:
  - `=MAXIFS('Agent Splits'!B:B,'Agent Splits'!C:C,B2,'Agent Splits'!B:B,"<="&YEAR(B3))&" "&B2`
- business meaning:
  - pick the latest year-row for that agent that is valid for the subject deal year

For the live Matt example:

- `D3`
  - `2026 Matt Allman`

The calculator then reads these fields from `Agent Splits`:

- `D`
  - apprentice contract yes/no
- `E`
  - apprentice contract amount
- `F`
  - apprentice contract rate
- `G`
  - apprentice GCI required
- `K:L`
  - base split to agent depending on deal type
- `M:T`
  - level thresholds and rates used by the level ladder in `J:K`

Current live `Agent Splits` row for Matt:

- row `41`
- `A41`
  - `2026 Matt Allman`
- `D41`
  - `No`
- `K41`
  - `50%`
- `L41`
  - `50%`
- `M41`
  - very large Level 1 max placeholder
- `N:T`
  - currently blank for Matt

### Admin Ledger Dependency

`Split Cal` does not calculate historical production itself.

It pulls historical executed `Net To Team` from `ADMIN ONLY - Deal Data Entry`:

- `S`
  - `Realtor`
- `G`
  - `Date Firm (Executed)`
- `BJ`
  - `Executed Year`
- `AM`
  - `Net To Team`
- `AO`
  - `Agent Portion`
- `AP`
  - `Company/Team Lead Portion`
- `BR`
  - `Net To Team Running Total`

Key formulas:

- `F5`
  - `=B4*B5`
  - gross to team for the subject deal
- `F6`
  - prior-year `Net To Team`
  - sums `ADMIN ONLY - Deal Data Entry!AM:AM`
  - filtered by agent in `S`
  - executed date before `B3`
  - executed year before `YEAR(B3)`
- `F7`
  - same-year prior `Net To Team`
  - same agent filter
  - same executed-date cut
  - executed year equals `YEAR(B3)`
- `F8`
  - total GCI included before the subject deal
  - if the apprentice contract is already satisfied, use current-year only
  - otherwise include past-years plus current-year

Current live Matt totals:

- `F6`
  - `$47,156.50`
- `F7`
  - `$42,273.00`
- `F8`
  - `$42,273.00`

Live supporting admin read used to verify those totals:

- `13` Matt rows before `2026-04-07`
- `9` rows in prior years
- `4` rows in `2026`
- prior-years total `Net To Team`
  - `$47,156.50`
- `2026` pre-deal total `Net To Team`
  - `$42,273.00`

### Level Logic

The level ladder lives in `H:K` on the calculator itself.

- `H`
  - level index
- `I`
  - level name
- `J`
  - max threshold for that level
- `K`
  - split percent for that level / deal type

Key result cells:

- `F9`
  - current level before the subject deal
- `F12`
  - new total after adding the subject deal
- `F13`
  - new level after the subject deal
- `F14`
  - whether the level changes
- `F17:F21`
  - payout allocation by level slice
- `F22`
  - total agent dollars for the subject deal
- `F23`
  - final effective split percent

Current live Matt result:

- `F9`
  - level `1`
- `F12`
  - `$73,923.00`
- `F13`
  - level `1`
- `F14`
  - `No`
- `F22`
  - `$15,825.00`
- `F23`
  - `50%`

### Level Count Clarification

Steve confirmed the intended structure is:

- apprentice
  - effective Level `0`
- Level `1`
- Level `2`
- Level `3`

There is no real Level `4` anymore.

Current implication:

- the `H10:K10` row is stale leftover template structure, not a real active payout level
- `J10` / `K10` showing `#N/A` is consistent with there being no active fourth level to read

Practical meaning:

- do not treat Level `4` as live business logic
- future cleanup should remove or clearly retire that stale row so the sheet structure matches the real split model

### Current Best Read

The calculator is useful, but it is not an authoritative ledger.

It is a thin interpretation layer that depends on:

- `Agent Splits` being loaded correctly for each agent / year
- the Admin ledger holding correct executed `Net To Team`
- the level ladder formulas staying intact

That makes it a valid current-process tool, but not an independent source of truth.

### Steve Meaning Locked

This tab exists because the real split problem is not a simple single-rate lookup.

The business requirement is:

- calculate the exact payout on the subject deal
- even when that single deal crosses one threshold
- or crosses multiple thresholds
- or finishes an apprenticeship contract and then continues into the next level

Practical meaning:

- one deal can be split across more than one rate band
- the effective split on the subject deal can be blended
- example:
  - an agent may land at something like `76.3%`
  - because part of the deal paid at `70/30`
  - and the rest paid at `80/20`

That is why the level table exists in the calculator and why the agent/year setup in `Agent Splits` has to be maintained carefully.

### Apprenticeship Logic

For apprentices, the real contract target is the amount paid to the company, not raw GCI.

So the calculator has to gross that target up into the GCI required to satisfy the contract.

Example confirmed by Steve:

- if an apprentice owes the company `$100,000`
- and the apprentice rate is `55%` to company on each deal
- the calculator must gross that up to the GCI required to hit that company target
- that is why the workbook shows a required GCI number like `181,818.18`

Practical meaning:

- the apprentice target is tracked as company-earned dollars
- the calculator converts that into the GCI threshold needed to clear the apprenticeship
- then the calculator tests whether the subject deal stays fully inside the apprenticeship band
- or crosses out of apprenticeship and into Level 1 or higher

### Subject-Deal Threshold Crossing

This is the core payout behavior Steve hired the original builder to solve.

If the subject deal does not cross the threshold:

- the whole deal pays at the current band

If the subject deal crosses the threshold:

- the first slice pays at the old band
- the remainder pays at the next band

If the subject deal crosses more than one threshold:

- each slice pays at its own band

This is why `F17:F21` exists:

- it is slicing the subject deal by level band
- then summing those slices into one final agent payout and effective split

### Annual Roster Dependency

The year-specific `Agent Splits` setup is not optional housekeeping.

It is required because:

- the lookup key uses `year + agent name`
- split structures can change by year
- apprenticeship terms can differ by agent
- threshold logic has to start from the correct annual setup row

So every year the full roster and their active split terms need to exist in `Agent Splits`, otherwise `Split Cal` can read the wrong contract or fail to model the deal correctly.

## Agent Splits

### What It Is

`Agent Splits` is the contract / threshold setup tab that feeds `Split Cal`.

It is the annual roster-level source for:

- apprentice yes / no
- apprentice company-dollar target
- apprentice company-rate
- grossed-up GCI required to clear apprenticeship
- current GCI paid so far
- outstanding GCI still owed
- post-apprenticeship split ladder

### Core Row Shape

Current live columns:

- `A`
  - lookup key
  - `year + agent name`
- `B`
  - year
- `C`
  - agent name
- `D`
  - apprentice contract yes / no
- `E`
  - apprentice contract amount
- `F`
  - apprentice contract rate paid to company
- `G`
  - GCI required
  - formula:
    - `=IFERROR(E/F,"")`
- `H`
  - GCI paid so far
  - formula:
    - `=MIN(SUMIFS('ADMIN ONLY - Deal Data Entry'!AM:AM,'ADMIN ONLY - Deal Data Entry'!S:S,C-row),G-row)`
  - practical meaning:
    - cumulative `Net To Team` from the Admin ledger, capped at the contract requirement
- `I`
  - outstanding GCI
  - formula:
    - `=G-H`
- `J`
  - contract status
  - formula:
    - `=IF(H=G,"Contract Paid","In Progress")`

### Level Ladder Shape

- `K`
  - Level 1 split to agent if agent deal
- `L`
  - Level 1 split to agent if company deal
- `M`
  - Level 1 max out
- `N`
  - Level 2 split to agent if agent deal
- `O`
  - Level 2 split to agent if company deal
- `P`
  - Level 2 cap
- `Q`
  - amount to reach Level 2 cap
  - formula:
    - `=P-M`
- `R`
  - Level 3 split to agent if agent deal
- `S`
  - Level 3 split to agent if company deal
- `T`
  - Level 3 cap

### Current Structural Read

Steve confirmed the intended live ladder is:

- apprentice
  - effective Level `0`
- Level `1`
- Level `2`
- Level `3`

There is no real Level `4`.

### Current Live Patterns Seen

#### Pattern 1 — Simple flat split, no active ladder

Example:

- `2026 Matt Allman`

Current row shape:

- apprentice = `No`
- `K/L = 50% / 50%`
- `M` = very large placeholder
- `N:T` blank

Meaning:

- this is effectively a flat split setup
- the giant `M` placeholder prevents the calculator from reaching a new threshold
- Steve confirmed this is intentional
  - these agents do not have extra levels beyond the flat split

#### Pattern 2 — full apprentice + 3-level ladder

Example:

- `2026 Roland Ross`

Current row shape:

- apprentice = `Yes`
- contract amount = `$100,000`
- company rate = `55%`
- grossed-up GCI required = `$181,818.18`
- Level 1 = `70/45`
- Level 2 = `80/45`
- Level 3 = `90/45`
- caps:
  - `M = 100,000`
  - `P = 250,000`
  - `T = huge open-ended placeholder`

Meaning:

- the row models both the apprenticeship band and the post-apprenticeship ladder
- Steve confirmed the company-deal side stays flat on rows like this
  - company deal split stays at `45%` to agent across Levels `1` to `3`
  - agent-deal side is the part that climbs through `70%`, `80%`, `90%`

#### Pattern 3 — special apprenticeship to flat-split package

Example:

- `2026 Mustafa Sherzaee`

Current meaning confirmed by Steve:

- agent is on apprenticeship first
- apprentice company rate is `40%`
- mentor gets `30%`
- agent gets `30%`
- after apprenticeship clears, the row moves to flat `50/50`
- there are no extra post-apprenticeship levels

Practical meaning:

- the workbook is not modeling one universal split package
- some rows represent custom contract structures
- future rebuild logic must support row-level package variation, including mentor-share cases, not just one standard ladder

#### Pattern 4 — rows that still need exact meaning confirmed

Examples still needing row-specific confirmation later:

- `2026 Jaskirat Singh`
- `2026 Katlyn Bell`
- `2026 Neil Maxwell`
- `2026 Suhreta Kovac`
- `2026 Nicole Werkman`
- `2026 Jordon Franco`

Current best read:

- the tab is doing the right job conceptually
- but some live rows still look partially maintained or not fully explained yet
- Steve's current read is that these are not clean intentional packages
- they more likely reflect team-maintenance gaps and missing understanding of the real split logic
- system rule for now:
  - do not infer a custom contract from a fuzzy row
  - treat unclear rows as incomplete / untrusted until Steve or a governed contract layer defines them explicitly

### Operating Lesson

- split logic is too nuanced to rely on tribal team understanding
- the business currently depends on Steve to interpret and repair that logic
- future-state system design should move split-package ownership into a governed contract layer so the team cannot silently drift the compensation rules
- present-state accountability:
  - ops still owns filling these rows out correctly and keeping contract logic current
  - if they leave rows fuzzy or half-maintained, that is an accountability failure, not an acceptable gray area
- future-state accountability:
  - the system should flag incomplete or contradictory contract rows
  - then reduce or remove manual team maintenance where the system can read and enforce the contract logic directly

### Dependency On Admin Ledger

This tab reads the Admin ledger directly for contract progress:

- `ADMIN ONLY - Deal Data Entry!AM`
  - `Net To Team`
- `ADMIN ONLY - Deal Data Entry!S`
  - `Realtor`

That means apprenticeship progress is not tracked manually here.

It is recalculated from the live ledger.

## Listings and Conditional Deals

### What It Is

This tab is a conditional-deals forecast layer.

It is not firm revenue.

It exists to show:

- deals that are conditionally sold
- how much team-side money could exist if those deals firm up
- when those conditions are due
- when those deals are expected to close if they go firm

Steve's rule:

- conditional deals are not cash created yet
- they are an indicator of possible future cash that could hit the bank

### Current Tab Shape

The tab is currently split into two manual sections:

1. `Conditional Deals Closing 2026`
2. `Conditional Deals Closing 2027`

Both sections now use the same base row structure:

- `A`
  - type
- `B`
  - status
- `C`
  - agent
- `D`
  - address
- `E`
  - city
- `F`
  - price
- `G`
  - deal split
- `H`
  - volume after deal split
  - formula:
    - `=F*G`
- `I`
  - commission rate
- `J`
  - team dollars
  - formula:
    - `=H*I`
- `K`
  - split with agent
- `L`
  - total agent
  - formula:
    - `=J*K`
- `M`
  - total team
  - formula:
    - `=J-L`
- `N`
  - conditional due date
- `O`
  - closing date
- `P`
  - conditions

### Current Meaning Locked

The old manual conditional layout above is historical context. For v1, this tab is now rebuilt from ClickUp Deal Data Entry through `npm run clickup:conditional-forecast`.

Current generated table:

- `A:O`
  - conditional deal, side, agent, accepted offer date, conditional deadline, closing date, Net To Team dollars, deposit status, deposit received date, Trade Number, FUB link, ClickUp URL, and missing/action-needed notes
  - `N` preserves the manual `THIS ROW ONLY: CONDITIONAL REVIEW ACTION` value
  - `O` records `AI Conditional Findings / Suggestions`
- summary rows now show conditional Net To Team buckets for the active collection months:
  - current month, e.g. `Collecting April`
  - next month, e.g. `Collecting May`
  - following month, e.g. `Collecting June`
  - `Collecting Future`
- `Net To Team missing closing date` shows conditional Net To Team that is visible in ClickUp but excluded from collection cash because no closing date exists yet
- when the calendar month flips, the labels roll forward automatically; for example May becomes the current collection month, June the next month, and July the following month
- cash bucket logic uses `Closing Date` only; `Conditional Deadline` is used for due/past-due follow-up, not cash timing
- buyer/seller conditional tags in ClickUp determine the conditional lane
- mutual-release tags are excluded because they are dead deals
- there is no separate legacy conditional review lane in v1; re-review is only the preserved action cell on this generated forecast

This is intentionally not the same as the Admin deal ledger:

- Admin is the firm economic truth and the full firm + 10 review lane
- Conditional is a live forecast/missing-data view for possible future cash
- if Ops fixes a conditional missing-data item, set column `N` to `Review This Conditional`; the next sync re-checks the generated row and keeps the action only if the row is still missing required data
- if a conditional deal goes firm, it should move into `ADMIN ONLY - Deal Data Entry` and be handled by the Admin full review

What this tab needs next if we want true governed conditional parity:

- maintained Trade Number
- maintained closing date
- maintained Net To Team dollars
- maintained FUB link
- then AI can check whether the ClickUp conditional task still belongs in the conditional lane, should already have moved into Admin, or needs FUB cleanup

### Current Live Read

Direct read during validation:

- `2026` section
  - `13` conditional deals counted
  - `$238,597.50` team dollars
  - `$151,270.00` total team
- `2027` section
  - `2` conditional deals counted
  - `$55,722.50` team dollars
  - `$17,173.75` total team

### Maintenance Pattern

Current process is manual:

- when a new conditional deal happens, the team inserts rows
- when old ones are no longer relevant, the team deletes them out

Current best read:

- useful visibility layer
- not a controlled ledger
- not durable enough to be the future source contract for projected cash timing

### Future-State Note

When the cashflow view is rebuilt, Steve wants this logic modeled more cleanly:

- conditional deals should be able to be toggled on / off in the cashflow view
- so leadership can see the difference between:
  - firm-only cashflow
  - firm-plus-conditional scenario cashflow
- future version should also add an expected cash date similar to the Admin deal tab instead of relying only on condition date + closing date

## Sales & Deposit

### What It Is

`Sales & Deposit` is a leadership scoreboard, not a root source.

It is built to answer:

- how the current selected year is pacing on:
  - executed deals
  - executed volume
  - executed GCI
  - company dollars executed
  - company dollars deposited
- how current performance compares against:
  - goal
  - seasonality
  - historical best / worst ranges

Steve's live reading rule:

- when a value turns blue in this dashboard, it means a record was set

### Current Dependency Chain

Current live chain:

1. `Sales & Deposit`
2. `Goal & KPI Calculator` in the Owners workbook
3. `KPI Calculator` in the older BIS workbook
   - workbook:
     - `010 - Zahnd Team BIS (Business Information System)`
   - workbook id:
     - `1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE`

Important current truth:

- `Sales & Deposit` is not computing the business from the raw ledger directly
- it is a presentation layer on top of an intermediate KPI-shaping layer
- the KPI-shaping layer is useful, but it is not yet signed off as the final canonical source for rebuild purposes

### Owners-Layer KPI Bridge

Inside `Goal & KPI Calculator`, the key bridge is:

- `O1`
  - `=IMPORTRANGE("https://docs.google.com/spreadsheets/d/1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE/edit#gid=1609537489","KPI Calculator!A1:DA")`

Meaning:

- the Owners workbook is importing the full old `KPI Calculator` surface into the local sheet
- then local Owners-side formulas reshape that imported block for the visible `Sales & Deposit` dashboard

### What Sales & Deposit Reads

Current visible live map:

- `B7:J18`
  - best / worst historical strips
  - fed from `Goal & KPI Calculator`
- `L7:V18`
  - month rows
- `L19:V22`
  - quarter rows
- `L23:V23`
  - total row

Current live pulls:

- `M:P`
  - actuals
  - pulled through `INDEX/MATCH` from imported KPI ranges in `Goal & KPI Calculator`
- `Q`
  - executed company-dollar goal
  - pulled from local planning ranges in `Goal & KPI Calculator`
- `R`
  - deposited company-dollar actual
  - pulled through `INDEX/MATCH` from imported KPI ranges in `Goal & KPI Calculator`
- `S`
  - deposited company-dollar goal
  - pulled from local planning ranges in `Goal & KPI Calculator`
- `T:U`
  - completion math on top of those actual / goal pairs
- `V`
  - split-average helper

### Formula Architecture

The visible month / quarter / total boards are built with spill formulas, not one formula copied into every row.

Current live pattern:

- month block
  - top formulas live in Row `7`
  - they spill down through the month rows
- quarter block
  - top formulas live in Row `19`
  - they spill through the quarter rows
- total row
  - mixed:
    - some cells are direct totals
    - some cells are direct formulas

Important practical meaning:

- when auditing this tab, do not expect every visible row to carry its own formula
- much of the board is being driven by one spill formula at the top of each block

### Goal Layers

The actuals are not the same as the goals.

Current goal structure in `Goal & KPI Calculator`:

- `B55:J72`
  - executed company-dollar goals by selected year
  - includes:
    - monthly targets
    - quarter targets
    - total target
- `B73:J90`
  - deposited company-dollar goals by selected year
  - includes:
    - monthly targets
    - quarter targets
    - total target

Meaning:

- `P` / `R`
  - actual achieved
- `Q` / `S`
  - planned target for the selected year

### Conditional Formatting Rules

Confirmed live rules on `Sales & Deposit`:

- blue = best-ever / record formatting
  - `M7:M23 >= B7:B23`
    - current deals meet or beat historical best deals
  - `N7:N23 >= D7:D23`
    - current volume meets or beats historical best volume
  - `O7:O23 >= F7:F23`
    - current GCI meets or beats historical best GCI
  - `P7:P23 >= H7:H23`
    - current executed company dollars meet or beat historical best company dollars
- green = goal achieved formatting
  - `Q7:Q24 <= P7:P24`
    - executed goal cell turns green when actual executed meets or beats it
  - `S7:S24 <= R7:R24`
    - deposited goal cell turns green when actual deposited meets or beats it

Steve's live business read:

- blue means the current period set or matched the best ever
- green means the goal was achieved

### Year Selector

Current live selector:

- `L4`
  - strict dropdown
  - allowed values currently:
    - `2025`
    - `2026`
    - `2027`
    - `2028`
    - `2029`
    - `2030`

Important note:

- the local planning ranges already extend farther than the current selector list
- so the selector is a governed visible subset, not the full extent of the underlying planning sheet

### Current Caveats

Two things to keep visible:

- there is a small helper / leftover formula at `P24`
  - current formula:
    - `=Q19-P19`
  - this does not appear to be the main board logic
  - treat it as a side helper until deliberately reviewed
- many current-year future rows are blank by design until that period has real data
  - this is why later rows can show:
    - blank actuals
    - zero completion
    - `#DIV/0!` in split-average helpers

## Goal & KPI Calculator

### What It Is

`Goal & KPI Calculator` is a bridge-and-planning tab, not a root source.

It exists to do three jobs:

- hold high-level annual planning assumptions tied to BHAG-style thinking
- turn seasonality assumptions into monthly and quarterly targets
- bridge older BIS KPI history into the Owners workbook so downstream dashboards can read it

Current best read:

- this is a useful shaping layer
- it is not the raw ledger
- it should be preserved deeply because it explains how later dashboards were built

### Current Structure

Current meaningful blocks:

- `B1:J10`
  - annual planning assumptions
  - volume, net commission, GCI, split, profit, spending-cap style planning values
- `B11:J23`
  - execution seasonality
  - historical pacing used to spread annual targets across months / quarters
- `B24:J36`
  - deposit seasonality
  - historical pacing used to spread deposit targets across months / quarters
- `B37:J54`
  - monthly execution targets
  - GCI-facing target output layer
- `B55:J72`
  - monthly execution targets
  - net-to-company target output layer
- `B73:J90`
  - monthly deposit targets
  - net-to-company target output layer

Steve's current meaning:

- top block = high-level planning
- middle blocks = seasonality based on actual historical behavior
- lower blocks = target outputs later read by dashboards

### BIS Bridge

Current critical bridge:

- `O1`
  - `=IMPORTRANGE("https://docs.google.com/spreadsheets/d/1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE/edit#gid=1609537489","KPI Calculator!A1:DA")`

Meaning:

- the full older BIS `KPI Calculator` surface is imported into this tab
- local formulas in the Owners workbook then reshape that imported data for downstream use

Practical meaning:

- this tab is partly local planning logic
- partly old-system bridge logic
- and partly target-generation logic

### Confirmed Downstream Use

Confirmed live downstream use:

- `Sales & Deposit`
  - reads actual-history strips from the imported KPI side
  - reads goal / target strips from the local target side

Likely but not fully confirmed yet:

- some planning targets may also influence other finance views
- do not overstate a direct budget-sheet dependency until separately confirmed

### Current Closeout Read

Locked now:

- purpose of the tab
- meaning of the planning blocks
- meaning of the seasonality blocks
- meaning of the target-output blocks
- old-BIS import bridge
- downstream relationship to `Sales & Deposit`

Still true:

- this is not the final future-state source contract
- future rebuild should replace this layered spreadsheet logic with cleaner system-native target logic
- but for current-reality reading, the meaning is now locked

## CI Report

### What It Is

`CI Report` means `Commission Income Report`.

It is an AR dashboard, not a root source.

Its job is to show:

- how much commission cash should exist in the selected period
- how much should already have been collected by now
- how much is still not due
- how much is past due
- whether the two tracking methods agree:
  - Weekly Actuals collection view
  - deal-status / expected-deposit view

### Current Source Chain

Current live chain:

1. `CI Report`
2. `(Input) Weekly Actuals`
   - collection / cash-received side
3. `ADMIN ONLY - Deal Data Entry`
   - expected-deposit / deal-status side

Important practical meaning:

- this tab is a reconciliation dashboard
- it is intentionally checking the same AR picture in two different ways
- Steve's live rule is that the two methods should match `100%`

### Period Selector

Current selector:

- `B6`

Current allowed values:

- `This Week`
- `This Month`
- `Last 7 Days`
- `Last 14 Days`
- `Last 30 Days`
- `Last 90 Days`
- `Last 3 Months`
- `Last 6 Months`
- `Last 9 Months`
- `Last 12 Months`
- `YTD`
- `Full Year`
- `AR Sweep`

Current date driver cells:

- `B2`
  - today
- `C2`
  - period start
- `D2`
  - period end

Important live rule:

- `This Week` anchors to the week spine in `(Input) Weekly Actuals`
- most other ranges are date windows relative to `today`
- `AR Sweep` is a wider aging window

### Summary Strip

Current top summary:

- `S5`
  - total outstanding
- `S6`
  - not due
- `S7`
  - due
- `S8`
  - percent not due
- `S9`
  - percent due

Current live formulas:

- `S5 = D14 - D16`
- `S6 = D17`
- `S7 = D18`
- `S8 = S6 / S5`
- `S9 = S7 / S5`

Meaning:

- this strip is driven off the Weekly-Actuals lane
- not-due and due are then visualized with the sparkline bar at `E9`

### Two Validation Lanes

#### Weekly Actuals lane

Current live cells:

- `D14`
  - total expected in period from Admin expected-cash dates
- `D15`
  - due by now
- `D16`
  - collected from `(Input) Weekly Actuals`
- `D17`
  - not yet due
- `D18`
  - AR gap due

Current live formulas:

- `D14`
  - `SUMIFS` on `ADMIN ONLY - Deal Data Entry!AP:AP` filtered by expected cash deposit date `I`
- `D16`
  - `SUMPRODUCT` across the weekly date spine `J27:ZZZ27` and collected row `J28:ZZZ28` in `(Input) Weekly Actuals`

Meaning:

- this lane uses Admin to say what should happen
- then Weekly Actuals to say what cash was actually collected in the selected period

#### Deal-status lane

Current live cells:

- `H14`
  - total expected from the listed deals
- `H15`
  - due by now
- `H16`
  - collected by deal status
- `H17`
  - not yet due
- `H18`
  - AR gap due by deal status

Meaning:

- this lane rolls directly off the visible hit-list block
- it classifies rows by:
  - expected cash date
  - whether the deal is marked `Closed - Cash Collected`

### Hit List

Current live hit list source:

- `B21`
  - `QUERY('ADMIN ONLY - Deal Data Entry'!B:AP, ...)`

Current output fields:

- `Deal #`
- `Deal Status`
- `Expected Cash Deposit`
- `Deal Address`
- `Buy / Sell / Referral`
- `Net To Team`
- `Company/Team Lead Portion`

Meaning:

- this is the period-filtered expected-deposit list
- the right-side "Not Collected - Hit List" area is the operator follow-up surface for anything that should already have been collected

### Conditional Formatting

Confirmed live rules:

- red rows in `B22:H`
  - `status <> Closed - Cash Collected`
  - and expected cash date is before today
- green rows in `B22:H`
  - `status = Closed - Cash Collected`
- green reconciliation cells:
  - Weekly lane goes green when it equals the deal-status lane
  - specifically:
    - `D14 = H14`
    - `D17 = H17`
    - `D18 = H18`
    - `H14 = D14`
    - `H17 = D17`
    - `H18 = D18`

Meaning:

- red = past-due not-collected follow-up
- green = collected
- green on the summary cells = the two validation methods agree

### Current Live Mismatch

Current snapshot for `This Month`:

- total expected
  - matches
  - `149123.965`
- due by now
  - matches
  - `93418.125`
- collected
  - does not fully match
  - Weekly Actuals lane:
    - `80321.38`
  - deal-status lane:
    - `79888.125`
- AR gap due
  - does not fully match
  - Weekly Actuals lane:
    - `13096.745`
  - deal-status lane:
    - `13530`

Practical meaning:

- the dashboard is doing the right job because it is surfacing a real reconciliation gap
- that remaining difference belongs inside the broader finance closeout, not as a separate mystery

### Current Read Of The Intermediate KPI Layer

The imported BIS `KPI Calculator` is not a raw-entry tab.

Best current read:

- it is an older KPI interpretation / shaping surface
- Steve confirmed on `2026-04-18` that this BIS workbook is the older original KPI / goal-tracker sheet that existed before `kpi.bensoncrew.ca`
- current best business read is that the stats engine was not rebuilt into the newer system, so the Owners workbook kept importing the older KPI layer forward
- it organizes the business into:
  - monthly
  - quarterly
  - yearly
  - executed
  - closed
  - deposited
  - company-dollar
  - volume
  - deal-count boards
- the local Owners workbook then reuses those blocks to build newer management views

Steve's current source-of-truth belief:

- the underlying root source for seasonality, annual deal records, and similar KPI history is still mostly `ADMIN ONLY - Deal Data Entry`
- the BIS `KPI Calculator` should be treated as an older stats-engine layer built on top of that Admin ledger, not as the final root source itself

### Confirmed Old KPI Block Map

Confirmed visible blocks in the BIS `KPI Calculator`:

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

Practical meaning:

- the old BIS workbook is already shaped into the exact leadership boards Steve wants
- the Owners workbook is selectively reusing those blocks instead of rebuilding the logic locally
- this is why `Sales & Deposit` feels deep: it is standing on top of an older stats engine, not directly on top of the raw ledger

What is still not fully signed off:

- which exact raw tabs in the BIS workbook should still be treated as meaningful upstream sources
- which parts of the KPI layer are durable business logic versus legacy display scaffolding
- whether the future rebuild should read this KPI layer at all, or bypass it and rebuild directly from:
  - `ADMIN ONLY - Deal Data Entry`
  - `(Input) Weekly Actuals`
  - the cleaner finance / KPI contracts that replace the old BIS stack

### Confirmed Pivot Engine Source

This is now confirmed, not guessed:

- the old BIS `KPI Calculator` is driven by pivot tables
- the pivot source is the old BIS `ADMIN ONLY - Deal Data Entry` tab
  - sheet id:
    - `533201019`

Meaning:

- the old KPI engine is not a random display sheet
- it is a structured stats layer built directly on the old deal ledger
- the visible boards sit on top of pivot outputs, then summary formulas sit on top of those pivot outputs

### Confirmed Time-Bucket Map

Exact old Admin time-bucket fields used by the KPI pivots:

- executed monthly blocks
  - row = `BH` `Executed Month`
  - column = `BJ` `Executed Year`
- executed quarterly blocks
  - row = `BI` `Executed Quarter`
  - column = `BJ` `Executed Year`
- closed monthly blocks
  - row = `BO` `Closing Month`
  - column = `BQ` `Closing Year`
- closed quarterly blocks
  - row = `BP` `Closing Quarter`
  - column = `BQ` `Closing Year`
- deposited monthly blocks
  - row = `BK` `Deposit Month`
  - column = `BM` `Deposit Year`
- deposited quarterly blocks
  - row = `BL` `Deposit Quarter`
  - column = `BM` `Deposit Year`

### Confirmed Metric Map

Exact old Admin value fields used by the KPI pivots:

- deal-count boards
  - value = `AI` `Deal Credit`
- volume boards
  - value = `AG` `Volume Credit`
- GCI boards
  - value = `AF` `Gross To Team`
- company-dollar boards
  - value = `AP` `Company/Team Lead Portion`

Practical meaning:

- the old KPI engine already expresses the four main scorecard measures Steve cares about
- all of them are grounded in the Admin deal ledger, not in separate manual math

### Formula Layer On Top Of Pivots

The visible old KPI board is two layers:

1. pivot tables from the old Admin ledger
2. summary formulas on top of those pivots

Confirmed pattern:

- executed boards:
  - averages use recent-year windows like `M:Q`
  - best / worst use the broader year strips
- closed boards:
  - averages use recent-year windows like `AW:BA`
- deposited boards:
  - averages use recent-year windows like `CG:CK`

Best current read:

- the old KPI engine is not raw-entry truth
- but it is a real reusable stats engine built on top of raw-entry truth
- that makes it valid rebuild context, not junk

## Cashflow Dash

### What It Is

`Cashflow Dash` is not the payment ledger.

It is the leadership cash-runway and finance-interpretation surface.

Detailed cell map:

- [docs/handoffs/2026-04-19-cashflow-runway-a30-l62-map.md](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-19-cashflow-runway-a30-l62-map.md)

It exists to answer:

- how much cash is available right now
- what AR / AP / HST / card pressure exists right now
- what the next monthly runway looks like under current assumptions
- how budget vs actual is drifting
- where cash goes negative if current assumptions hold

### Current Live Chain

Current live dependency chain:

1. `(Input) Weekly Actuals`
   - available-cash-today anchor
   - week-level cash-received truth
2. `Monthly Actuals (Roll Up)`
   - historical month-start cash
   - historical monthly category totals
3. `Monthly Budget`
   - future revenue and expense assumptions
   - expected monthly commission
   - budgeted revenue to remove
4. `Annual Actuals (Roll Up)` / `Annual Budget (Roll Up)` / `Budget Original`
   - HST
   - credit cards
   - owner / partner adjustments
   - tax / loan / balance review
5. `Unspent -L3M + Actual Helper`
   - expected cash still to come in this month
   - missing-income helper / historical shortfall view
   - AP commitments

Helper-tab structure now verified:

- `A:G`
  - current month plus last `3` months unspent budget
  - source mix:
    - `Monthly Budget`
    - `Monthly Actuals (Roll Up)`
  - exclusion logic:
    - excludes revenue
    - excludes HST
    - excludes credit-card cash-in / cash-out noise
  - output:
    - `G2` = current + last `3` months unspent budget
    - feeds `Cashflow Dash!D9`
- `I:M`
  - current-month expected cash still to come in
  - source mix:
    - `Monthly Budget`
    - `Monthly Actuals (Roll Up)`
  - logic:
    - current-month revenue-side budget by category
    - minus current-month actual by category
    - clipped at `0` so over-collected lines do not create negative expected-cash carry
  - output:
    - `M2` = expected cash still to come in this month
    - feeds `Cashflow Dash!D7`
- `AS:AZ` / far-right AR helper area
  - side helper block for recent actual-vs-budget revenue lookback
  - practical meaning:
    - this is a `missing income report`, not a raw AR ledger
    - it compares selected recent revenue budgets against actuals
    - shortfalls are clipped at `0`
    - Steve does not currently treat this as a primary operating read
  - current live path:
    - `AZ2 = SUM(AZ3:AZ11)`
    - `AZ3:AZ11` are helper shortfall rows
  - output:
    - `AZ2` rolls into `Cashflow Dash!D8`

Practical meaning:

- `Cashflow Dash` is standing on top of the finance stack
- it is not creating source truth itself
- it is reshaping weekly / monthly / annual layers into one management view

### Top Summary Block

Current live summary block:

- `D6`
  - available cash today
  - reads `(Input) Weekly Actuals!J20:ZZZ20`
  - keyed by the week spine in row `27`
- `D7`
  - expected cash still to come in this month
  - reads `Unspent -L3M + Actual Helper!M2`
- `D8`
  - missing-income helper / historical shortfall view
  - reads `Unspent -L3M + Actual Helper!AZ2`
- `D9`
  - AP commitments
  - reads `Unspent -L3M + Actual Helper!G2`
- `D11:D16`
  - HST payable / collected / paid / remitted / outstanding / moved-to-loan layer
  - current live formulas:
    - `D12`
      - total HST collected on sales
      - summed from `Annual Actuals (Roll Up)` where catkey = `HST | Collected on Sales |`
    - `D13`
      - total HST paid on purchases
      - summed from `Annual Actuals (Roll Up)` where catkey = `HST | Paid on Purchases |`
    - `D14`
      - total HST remitted to CRA
      - summed from `Annual Actuals (Roll Up)` where catkey = `HST | HST Remittance to CRA |`
    - `D15`
      - `HST Outstanding = D12 - D13 - D14`
    - `D16`
      - `HST Moved to Loan = D15`
    - `D11`
      - `HST Payable = D12 - D13 - D14 - D16`
  - practical meaning:
    - this block is not a live CRA-payable ledger
    - the current design assumes all outstanding HST has been moved to the loan layer
    - that is why `HST Payable` currently resolves to `0`
- `D17`
  - credit-card net balance
  - current live formulas:
    - `D18`
      - `BMO Corp – Outstanding`
      - summed from `Annual Actuals (Roll Up)` catkey:
        - `Non P&L Cash In | Credit Card - BMO Corp | Charge on Credit (Not Paid)`
    - `D19`
      - `BMO Corp – Paid`
      - summed from `Annual Actuals (Roll Up)` catkey:
        - `Non P&L Cash Out | Credit Card - BMO Corp | Payment to Card`
    - `F18`
      - `BMO Cards Bal = D18 - D19`
    - `D20`
      - `Steve Zahnd – Outstanding`
    - `D21`
      - `Steve Zahnd – Paid`
    - `F20`
      - `Steve TD Card Bal = D20 - D21`
    - `D22`
      - `Costco – Outstanding`
    - `D23`
      - `Costco – Paid`
    - `F22`
      - `Costco Card Bal = D22 - D23`
    - `D17`
      - `Credit Card Net Balance = D18-D19 + D20-D21 + D22-D23`
  - practical meaning:
    - this is a card-liability layer built from annual non-P&L credit-card cash-in and payment rows
    - the dashboard shows both lifetime-style totals and the current net card balance by card
- `D27`
  - expected cash month end
  - formula:
    - `=D6+D7+D8-D9-D10-D11-D17`

Practical meaning:

- the top block is the fast pressure read
- it mixes cash on hand with AR / AP / HST / card obligations
- this is why Steve uses it as the first finance glance

### Runway Block

Current live runway block:

- row `33`
  - rolling month-key spine
  - starts `3` months back
  - runs `6` months forward
  - purpose:
    - give the cashflow chart a clean historical lead-in, a current-month anchor, and a forward runway window
- row `34`
  - starting cash
  - historical months come from `Monthly Actuals (Roll Up)`
  - future months chain from prior ending cash
- important structure:
  - the historical block is anchored by one spill formula in `C34`
  - that single formula spills a full finance block downward through the historical months
  - so `C35:F48` are mostly spill outputs, not separate hand-written formulas cell by cell
- rows `35:45`
  - revenue
  - expenses
  - non-P&L cash
  - HST
  - CRA payments
  - ending-cash math
- rows `50:51`
  - future helper adjustments
  - expected monthly commission
  - budgeted revenue to remove
- row `56`
  - total ending cash

Important live formulas:

- `C34`
  - historical spill anchor from `Monthly Actuals (Roll Up)` by month key
  - pattern:
    - `INDEX('Monthly Actuals (Roll Up)'!$J$1:$ZZZ$15, , XMATCH(month_key, 'Monthly Actuals (Roll Up)'!$J$23:$ZZZ$23, 0))`
  - important:
    - row index is intentionally omitted
    - that means the matched monthly column spills a full vertical block, not just one cell
    - `row 34` is the first line of that spill (`Starting Cash`)
    - `row 35` and below are the next lines of that same historical spill block
- `G34:L34`
  - future starting cash chained from prior ending cash
  - pattern:
    - next month starting cash = prior month ending cash
- `G35`
  - future spill anchor from `Monthly Budget`
  - pattern:
    - pulls the top revenue total row from `Monthly Budget`
  - important:
    - this is also a spill anchor, not just one isolated future-revenue cell
    - `G35:N48` is a projected finance block that fills downward from this anchor
- `C35:F35`
  - historical revenue from the `C34` spill block
  - actual monthly revenue already realized
- `G50:L50`
  - expected monthly commission from `Monthly Budget`
- `G51:L51`
  - budgeted revenue to remove from `Monthly Budget`
- row `53`
  - total cash in
  - pattern:
    - revenue + non-P&L cash in + HST collected
    - actual current month also layers in top-strip AR helper values
    - projected months subtract budgeted revenue to remove and add expected monthly commission
- row `54`
  - total cash out
  - pattern:
    - expenses + non-P&L cash out + HST owed + CRA payments
    - also layers in top-strip AP / HST / card pressure values depending on month position
  - validation notes:
    - `C54` had been missing `-C40` and was fixed during validation
    - `F54` is intentionally a month-end pressure view, so it does not match the raw April spill line
    - `J54` / `K54` had stale `15` references and were cleaned to `16`-row references without changing live values
- row `55`
  - net cash in / out
- row `56`
  - total ending cash
  - pattern:
    - starting cash + total cash in - total cash out

Practical meaning:

- historical months are mostly actual rollup months
- future months flip into budget-driven projection mode
- this is a management forecast stitched from actuals plus assumptions
- the chart purpose is:
  - show how cash moved over the last `3` months
  - anchor the current month in the middle of that story
  - show the next `6` months of projected cash
- this block exists as much for the chart as for the helper math
- it gives Steve and future agents one clean visual runway instead of forcing them to reconstruct cash direction from raw ledgers
- current row meaning now locked:
  - row `33`
    - month-key spine
  - row `34`
    - starting cash
    - historical side is the first row of the `C34` spill block from `Monthly Actuals (Roll Up)`
    - future side chains from prior ending cash
  - row `35`
    - total revenue
    - historical side is the next row in the `C34` spill block from `Monthly Actuals (Roll Up)`
    - future side is the first row in the `G35` spill block from `Monthly Budget`
    - future total revenue is intentionally gross budget revenue before the cash-in helper row later swaps in expected monthly commission
  - row `36`
    - total expenses
  - row `37`
    - profit / loss
  - row `38`
    - non-P&L cash in
  - row `39`
    - non-P&L cash out
  - row `40`
    - credit-card in / out
  - row `41`
    - total non-P&L cash
  - row `42`
    - HST collected on sales
  - row `43`
    - HST paid on purchases
  - row `44`
    - total owed to CRA before payments
  - row `45`
    - payments to CRA
  - row `46`
    - total owed to CRA after payments
  - row `47`
    - total ending cash
  - row `48`
    - total cash in / out
  - rows `50:51`
    - future helper adjustments:
      - expected monthly commission
      - budgeted revenue to remove
  - rows `52:60`
    - chart-facing display block, not root math

### Graph Logic

Current live chart:

- type:
  - `COMBO`
- legend:
  - `NO_LEGEND`
- anchor:
  - `E3`
- size:
  - `962 x 431`
- left-axis window:
  - fixed at `-500000` to `500000`

Current domain:

- row `52`
  - visible month labels like `Jan 26`

Current series actually plotted:

- row `56`
  - `Total Ending Cash`
  - blue dotted area
- row `53`
  - `Total Cash In`
  - green columns
- row `54`
  - `Total Cash Out`
  - red columns
- row `57`
  - `Baseline`
  - dotted line
- row `60`
  - `Today Marker`
  - white marker column with label

Important helper rows that exist but are not plotted:

- row `58`
  - `Positive Cash`
- row `59`
  - `Neg Cash`
- row `61`
  - `Last Check April 9`
- row `62`
  - `Good or Bad`

Practical meaning:

- the graph is not generic spreadsheet fluff
- it is deliberately built from helper rows on the tab
- the positive / negative split rows are interpretation helpers, not the current live series

### Helper Review Blocks Under The Graph

Current live helper blocks under the main graph:

- `63:76`
  - last `3` months unspent-budget rollover report
  - practical meaning:
    - this is not just a “nice to know” list
    - it exists so prior-month budget items that were not spent can still be carried forward into current cash pressure
    - Steve uses this to avoid a false cash bump when the month flips but the team still intends to spend those items
  - live behavior:
    - ranks the biggest unspent categories across the recent lookback
    - those unspent amounts are part of the AP / commitment pressure logic
  - management rule:
    - if Steve decides a held-over budget item is no longer real, he can kill it and release that room back to cash
- `79:105` left block `B:E`
  - current-month unspent budget report
  - practical meaning:
    - show the biggest current-month budget buckets that still have room left
    - this is the maneuverability view
    - Steve uses it to see where there may be room to move without hurting the runway
  - current live structure:
    - `B80:E80`
      - `Category`
      - `Budget`
      - `Actual`
      - `Unspent`
    - `B81`
      - sorted helper spill from `Unspent -L3M + Actual Helper!P:S`
      - filtered to positive unspent values
      - limited to the top `25`
- `79:105` right block `G:K`
  - current-month overspent / unbudgeted report
  - practical meaning:
    - this shows where projected cash is disappearing to
    - if a line was budgeted and spend stayed inside budget, it should not surprise the runway
    - what hurts projected cash is:
      - truly unbudgeted spend
      - budget lines blown over their planned amount
  - current live structure:
    - `G80:K80`
      - `Category`
      - `Budget`
      - `Actual`
      - `Discrepancy`
      - `Total Unbudgeted`
    - `G81`
      - sorted helper spill from `Unspent -L3M + Actual Helper!BC:BG`
      - filtered to overspend / unbudgeted rows
      - limited to the top `25`
    - `K81`
      - total overspend / unbudgeted amount for the visible set

Practical meaning:

- these blocks are not separate finance truth layers
- they are management helper views built on the helper tab
- together they answer:
  - what budget room is still available
  - what old budget commitments are still hanging around
  - what overspend is actually shrinking cash outside the plan
- practical current-state read:
  - `A:G`, `P:S`, and `BC:BG` are the live useful operator blocks
  - `AS:AZ` is legacy helper logic that still works, but is not a high-signal operating surface right now

### Income And Expense Review

Current live review surface starts at `row 108`.

It is a finance review panel, not a source ledger.

It compares budget and actual across a selected period, then separately shows the annual “where should we be by now?” view.

#### Period Review Block

Current live structure:

- `109:110`
  - period selector
  - start month / year
  - end month / year
  - month keys in `E109:E110`
- `112:155`
  - selected-period budget vs actual review

Practical meaning:

- `D` = selected-period budget
- `E` = selected-period actual
- this block pulls:
  - budget from `Monthly Budget`
  - actual from `Monthly Actuals (Roll Up)`
- it is designed to answer:
  - what revenue we planned for this period
  - what we actually did
  - where expense drift sits by category
  - how non-P&L, tax, and card movements change the real cash read

Current live breakdown:

- `112:115`
  - revenue
  - commission income
  - revenue share
  - other revenue
- `116:137`
  - expense stack
  - grouped into:
    - Real Broker costs
    - general op expenses
    - team
    - marketing
    - client / agent appreciation
    - old Zahnd Corp P&L
    - other
- `138`
  - total profit
- `139:149`
  - non-P&L cash review
  - includes:
    - non-P&L cash in
    - non-P&L cash out
    - old Zahnd Corp non-P&L
    - sales taxes not paid
    - credit cards in / out
    - corporate tax paid / refund
    - payroll accrual vs remittance
    - total cash in / out
- `150:155`
  - sales tax and credit-card pressure
  - ends with:
    - `Cash After Taxes & Credit`

Important rule:

- this block is a selected-period management summary
- it is not replacing the weekly ledger
- it is helping Steve see whether the chosen window actually behaved the way the budget said it should

#### Annual Highlights Block

Current live structure:

- `157:205`
  - annual progress / pacing review

Practical meaning:

- `B159`
  - selected year
- `F159`
  - percent of year passed
- `D`
  - original starting annual budget
  - sourced from `Budget Original`
- `E`
  - actual annual result
  - with partner-extra-pay normalization applied where needed
- `F`
  - where the business should be by now based on year passed
- `G`
  - ahead / behind delta
- `H`
  - plain-English status flag
- `L`
  - live current annual budget
  - sourced from `Annual Budget (Roll Up)`

This annual block exists to answer:

- are we ahead or behind the annual revenue target right now
- are we over or under the annual spend pace right now
- are we ahead or behind the annual cash target right now
- how does the original annual plan compare with the current live budget

Current live annual sections:

- `161:165`
  - annual revenue view
- `166:188`
  - annual expense view
- `189:199`
  - annual non-P&L cash view
- `200:205`
  - annual tax / credit / cash-after-taxes view

#### Partner Extra Pay Normalization

One important off-screen helper sits to the right:

- `M161:M189`
  - raw annual actual view before the visible adjustments in column `E`
- `M165`
  - total annual partner extra pay sitting inside revenue
  - current live formula sums:
    - `partner commissions - steve`
    - `partner commissions - blake`
    - `partner commissions - nick`
    - `partner commissions - ryan`
    - `partner commissions - scott`

Practical meaning:

- some visible `E` formulas back this amount out so the dashboard does not overstate real operating revenue or owner economics
- this is the same partner-normalization idea Steve called out earlier on the cashflow surfaces
- it confirms again:
  - `Cashflow Dash` is a management interpretation layer, not just a dumb rollup

#### Side Trackers

Current live side trackers visible under the annual review:

- `207:213`
  - agent loans
  - current live example:
    - Wes C money lent
    - Wes C paid back
- `217:220`
  - partner buy-ins
  - current live example:
    - Steve in
    - Steve out

Practical meaning:

- these are side finance trackers attached to the dashboard
- they matter for leadership visibility
- they are not the primary finance truth layer

#### Gut Check On Formula Safety

Current audit read:

- the annual block is structurally much stronger than the period block
- the partner-extra-pay normalization logic is real and consistent in the annual view
- the selected-period block originally had one major scope issue and one major formula issue

Historical findings before cleanup:

1. The selected-period actual view is only fully safe when the selected period is effectively current YTD.
   - `E115` and `E125` subtract `M165`
   - `M165` is the annual partner-extra-pay bucket, not a period-scoped bucket
   - practical meaning:
     - if Steve uses a custom non-YTD period, the visible actuals can drift because annual normalization is being pushed into a custom window
2. The lower budget-side sub-block in the selected-period review has legacy broken references.
   - these are not just ugly formulas; they point to the wrong part of the sheet
   - confirmed broken references:
     - `D143 = D88`
     - `D145 = D85-D84`
     - `D149 = D76-D77-D83-D86`
     - `D150 = D89-D90-D91`
     - `D155 = D87-D88`
   - practical meaning:
     - those lines are reading from the current-month helper / unspent-budget table, not from the selected-period budget logic
     - so the lower budget-side tax / cash lines in the period review are not trustworthy right now
3. `F159` uses `TODAY()+5` when calculating year passed.
   - practical meaning:
     - the annual pacing view is giving itself about `5` extra days of progress
     - that moves the target pace by about `1.37` percentage points on `2026-04-19`
   - this may be intentional, but it should be treated as a business rule, not invisible spreadsheet magic

Current fix state after sweep:

- the lower selected-period budget-side cash / tax chain was repaired:
  - `D139`
  - `D143`
  - `D145`
  - `D149`
  - `D150`
  - `D155`
- `D118` was repaired:
  - it now rolls the budget-side general-op bucket plus:
    - `D119`
    - `D120`
  - it no longer points at the chart helper rows
- selected-period partner normalization was repaired:
  - visible helper added at:
    - `N160:O161`
  - `O161` now holds the selected-period partner extra-pay amount
  - `E115` and `E125` now subtract the selected-period helper instead of annual helper `M165`
- `F159` extra `+5` day push was removed during the live sheet cleanup

Current clean read after cleanup:

- annual block:
  - structurally good
- selected-period block:
  - now structurally good
- no remaining `#ERROR!` cells were found in `108:205`
- no remaining suspicious hard refs back into unrelated upper helper rows were found in `108:205`

Clean read:

- annual review:
  - trusted for meaning
  - now coherent
- selected-period upper income / expense block:
  - coherent
- selected-period lower budget-side cash / tax block:
  - now coherent

### Conditional Deals Boundary

Current live rule:

- `Cashflow Dash` does **not** currently read `Listings and Conditional Deals`
- conditional deals are not part of the live runway math

Practical meaning:

- firm cash and conditional pipeline are still separated
- the future-state toggle Steve wants is not already hidden here
- it belongs in later finance modeling, not in current-state truth

Backlog coverage:

- `FINANCE-003`
  - conditional deals as optional cashflow scenario layer

### What Is Locked Now

The meaning of `Cashflow Dash` is now locked:

- dashboard role
- dependency chain
- top summary strip
- runway block
- chart series and helper-row structure
- current firm-cash vs conditional boundary

What is still open is upstream finance sign-off:

- `(Input) Weekly Actuals`
- `Monthly Actuals (Roll Up)`
- annual rollups
- canonical partner-commission normalization

### Base Finance Spine Confirmed On 2026-04-19

The core finance-sheet architecture is now confirmed:

1. `(Input) Weekly Actuals`
   - base operating finance truth
   - week-by-week category ledger
2. `Monthly Budget`
   - live monthly plan on the same category spine
3. `Budget Original`
   - original annual budget on the same category spine
4. `Monthly Actuals (Roll Up)`
   - monthly aggregation of `Weekly Actuals`
5. `Annual Actuals (Roll Up)`
   - annual aggregation of `Monthly Actuals (Roll Up)`
6. `Annual Budget (Roll Up)`
   - annual aggregation of `Monthly Budget`

Current live structure check:

- `Weekly Actuals`, `Monthly Budget`, and `Budget Original` all align on the same base category spine
- the row-check system is currently clean in the two budget tabs
- no live `❌` rows were found in those base mirrors during the 2026-04-19 sweep

Important nuance:

- `Monthly Actuals (Roll Up)`, `Annual Actuals (Roll Up)`, and `Annual Budget (Roll Up)` intentionally stop before the trailing placeholder rows in `Weekly Actuals`
- those placeholder rows are Category IDs `170:184`
- they currently carry `-` markers with blank type
- the rollup tabs filter on nonblank type, so those rows do not currently roll forward

Small formatting issue noted:

- `Annual Budget (Roll Up)` shows Category IDs `164:169` as date-formatted values near the bottom of the tab
- the underlying row alignment still appears logically intact
- this currently reads as formatting drift, not category-logic drift

Durable checkpoint:

- see `docs/handoffs/2026-04-19-finance-spine-checkpoint.md`

### Weekly Actuals Deep Read On 2026-04-19

`(Input) Weekly Actuals` is now mapped far enough to validate intelligently instead of guessing.

Current row architecture:

- `1:14`
  - summary rows
  - driven by `SUMIF` / `SUMIFS` over the category ledger
- `16:18`
  - operator helper rows
  - includes week key and `Weekly Expected Commissions (Deal Sheet)`
- `19:25`
  - available-cash / bank / LOC / card helper strip
- `27`
  - live week-start date spine
- `28:211`
  - category ledger

Current category block map:

- `28:40`
  - Revenue
- `41:147`
  - P&L expense blocks
- `148:150`
  - HST / sales tax
- `151:196`
  - financing / balance-sheet movement
- `197:211`
  - placeholder rows, currently inactive

Important source dependencies confirmed:

- summary rows depend on the category ledger in `28:211`
- `Weekly Expected Commissions (Deal Sheet)` reads directly from `ADMIN ONLY - Deal Data Entry`
- bank / card helper strip reads financing rows in the lower ledger
- monthly and annual rollups inherit from this tab

Deeper dependency read from the latest hard pass:

- the only confirmed external sheet dependency currently inside `Weekly Actuals` is `ADMIN ONLY - Deal Data Entry`
- row `18` is a full week-window bridge into finance:
  - amount source:
    - `ADMIN ONLY - Deal Data Entry!AP:AP`
  - date source:
    - `ADMIN ONLY - Deal Data Entry!I:I`
  - windowing:
    - current week start in row `27`
    - next week start in the next column on row `27`
  - business meaning:
    - expected company cash for that week
    - if the expected-cash date on the Admin tab falls in that week, the money lands here
  - downstream use:
    - supports the weekly commission-income AR view in `CI Report`

Meaning:

- if Admin-tab executed-date or economics semantics change, row `18` changes with it

Top helper-strip mechanics now locked:

- row `19`
  - available starting cash
  - seeded in `J19`, then rolled forward from prior ending-cash checkpoints
- row `20`
  - weekly available ending cash
  - the real cash engine:
    - starting cash
    - plus revenue
    - minus expense
    - plus non-P&L cash in
    - minus non-P&L cash out
    - plus HST collected
    - minus HST paid
    - minus HST remitted
- row `21`
  - starting bank balance
  - currently modeled as available starting cash minus row `22`
- row `22`
  - `Starting LOC`
  - current operating meaning:
    - treated as the full `150k` LOC capacity
    - used so leadership can see total accessible capital, not just bank cash
    - this is a management convenience choice, not a pure current-drawn-balance read
- rows `23:25`
  - cumulative card-balance trackers
  - current live links:
    - `BMO` = `151:152`
    - `TD` = `153:154`
    - `CIBC` = `155:156`
  - business meaning:
    - these are weekly balance checks for the credit cards
    - after weekly actuals are entered properly, they should match the real card balances
    - purpose is to tie the sheet back to bank / card reality every week

Read:

- the top helper strip is a real operator layer, not decoration
- it turns the lower ledger into readable weekly cash and card position

Important nuance inside the ledger:

- not every weekly cell is pure manual entry
- some rows include embedded formulas / balancing logic
- currently confirmed formula-bearing ledger rows include:
  - `28`
    - `Commission Income`
  - `35`
    - `Other Income`
  - `148`
    - `HST Collected on Sales`
  - `151:158`
    - credit-card and payroll-liability financing rows

Revenue-block meaning now locked:

- `28`
  - `Commission Income`
  - this is real company commission cash that actually came in, was deposited, and is part of what the business truly made
  - it is not meant to represent raw gross deal economics
  - historical formulas and notes in this row are bank-reconciliation / adjustment logic used to make the weekly cash lane match reality
- `35`
  - `Other Income`
  - this is the catch-all revenue lane for money that is real income but does not fit cleanly into the main named revenue buckets
  - example Steve gave:
    - CDAP money / Georgia employer grant
- `36:40`
  - partner-commission workaround rows
  - these rows hold the extra retained partner-share amounts that would otherwise distort `Commission Income`
  - current operating reality:
    - partner economics still exist on the deal side
    - but the cash can stay inside the company instead of leaving as personal pay
    - Ahsan breaks that extra retained amount out here so Category ID `1` can still reflect what the company should get cleanly
    - later layers back these amounts out for management reporting

Real Broker fee block meaning now locked:

- `41:44`
  - these rows are self-explanatory and should be read literally
  - the category labels mean what they say
  - the values are the actual Real Broker charges that were paid
- `41`
  - Real Broker split
- `42`
  - Real Broker compliance fees
- `43`
  - Real Broker transaction fees
- `44`
  - other Real Broker fees / odd brokerage-charge bucket
- formulas and notes in this block are just weekly batching / deal-level support detail, not a different business meaning

Current risk read:

- this tab is the finance root, but it is not a pure dumb input table
- some finance meaning is baked directly into row formulas
- if we rebuild later, those formula-driven rows need explicit replacement logic, not just copied labels

Latest hard-pass additions:

- notes are distributed across the sheet, not just in one setup block
- current note-bearing rows include:
  - `16`, `28`, `29`, `41:44`, `46`, `51`, `65`, `68`, `71`, `88`, `92`, `105`, `110:112`, `115`, `128`, `131`, `134`, `144:146`, `149`, `154`, `176`
- active blank-type rows:
  - `0`
- important operating rule:
  - do not trust Weekly Actuals row numbers as durable references
  - Steve inserts rows when categories are added
  - this tab should be tracked by `Category / Subcategory / Detail / Cat Key`, not hardcoded row positions
- SongBird duplicate issue was real, then corrected live:
  - duplicate `catkey` no longer present
  - if this comes back later, treat the `catkey` as the source key to inspect, not the row number
- true text trailing-space drift should also be tracked by label, not row:
  - `Non P&L Cash In | Agent Loan In | Other `
  - `Non P&L Cash Out | Partner Loans Out  | Steve Zahnd`
  - `Non P&L Cash Out | Corporate Tax Owing  |`
- some other `catkey` values end with a trailing delimiter only because the detail field is blank
  - that is cosmetic, not a category-meaning bug

Read:

- structure is stable
- string hygiene is not
- later normalization work should treat whitespace cleanup as a real data-governance task

Locked doctrine:

- partner-commission rows live in the revenue block here
- `Cashflow Dash` backs them out for management interpretation
- `Weekly Actuals` is the bookkeeping / operating-ledger truth
- `Cashflow Dash` budget overview is the management-truth view after normalization
- future-state rebuild target is still to separate partner distributions cleanly so the dashboard no longer has to normalize them

Current operating reason for that workaround:

- in `ADMIN ONLY - Deal Data Entry`, partner economics are still tracked as if:
  - gross commission comes in
  - partner share exists economically
  - company share exists economically
- but in real operating practice, Steve, Blake, Nick, Ryan, and Scott can leave that partner-share money inside the company instead of taking it out personally
- the bookkeeping workaround is:
  - accountant records the company-side commission income
  - the extra retained partner-share amount is added back through the partner-commission revenue rows in `Weekly Actuals`
  - matching owner / partner pay is then added on the budget / cost side so cash is not distorted
  - `Cashflow Dash` then backs those partner rows out for cleaner management reporting

Important read:

- this is current operating reality
- not necessarily the ideal future-state design
- separate partner-distribution tracking exists outside this tab as well

Exact current formula path confirmed:

1. `Weekly Actuals`
   - Category IDs `9:13`
   - partner-commission revenue rows for:
     - Steve
     - Blake
     - Nick
     - Ryan
     - Scott
2. `Monthly Actuals (Roll Up)`
   - monthly partner rows inherit from Weekly Actuals by Category ID and month key
   - current monthly row positions:
     - row `34` = Steve
     - row `35` = Blake
     - row `36` = Nick
     - row `37` = Ryan
     - row `38` = Scott
3. `Annual Actuals (Roll Up)`
   - annual partner rows sum the monthly partner rows by year
4. `Cashflow Dash`
   - annual helper `M165` / selected-period helper `O161`
   - explicitly filters the five partner-commission revenue rows back out of management reporting

Budget-side matching cost path:

- `Monthly Budget` owner rows `76:80` are explicitly wired to partner-row values from `Monthly Actuals (Roll Up)`
- this proves the “add on revenue side / add on owner-pay side” workaround is real in the model

Owner-link bug found and fixed on 2026-04-19:

- the owner-budget formulas were hand-wired and had drifted to the wrong partner rows
- corrected mapping now is:
  - Steve owner row -> `Monthly Actuals (Roll Up)!34`
  - Scott owner row -> `Monthly Actuals (Roll Up)!38`
  - Ryan owner row -> `Monthly Actuals (Roll Up)!37`
  - Blake owner row -> `Monthly Actuals (Roll Up)!35`
  - Nick owner row -> `Monthly Actuals (Roll Up)!36`

Read:

- the workaround pattern is confirmed
- the person-to-person linkage is now corrected for the live Monthly Budget owner rows
- the formulas are still hand-built, not generic, so this remains a rebuild simplification target later

Additional business clarifications locked on `2026-04-19`:

- software block `63:67`
  - current reality is intentionally flexible
  - rows can act as remainder / catch-all buckets after cleaner software lanes are broken out
  - this is acceptable current-state finance behavior, not a hidden formula failure
- financing block `151:156`
  - the charge rows are meant to increase card balances because cash did not leave the bank yet
  - the payment rows are the real cash-out event when bank cash actually goes onto the card
  - purpose:
    - manage cashflow timing correctly
    - show the difference between expense incurred and cash actually leaving the bank
- owner rows `103:107`
  - these are owner-pay rows
  - they are dense and manually batched, but the block meaning itself is not in doubt

Durable checkpoint:

- see `docs/handoffs/2026-04-19-weekly-actuals-deep-review.md`
- repeatable inspection utility:
  - `scripts/inspect-weekly-actuals.mjs`
- operator walkthrough:
  - `docs/handoffs/2026-04-19-weekly-actuals-validation-sequence.md`

### Monthly Actuals (Roll Up) — monthly rollup, not the payment ledger

This tab is now locked for meaning:

- `Monthly Actuals (Roll Up)` is where monthly finance categories are rolled across time
- it appears to roll up the weekly-actuals layer
- it is useful for monthly rollup checks, but it is not the best source for exact payout timing

Current category-key structure confirmed:

- `C` = Category ID
- `D` = Category
- `E` = Subcategory
- `F` = Detail
- `G` = Tags
- `H` = `Catkey`
- `I` = Type

Current month spine confirmed:

- row `23`
  - month key like `202501`
- row `25`
  - actual month-start date serials starting at `J25`
- category rows below then roll values across those monthly columns

Important bonus-related finance categories confirmed:

- Category ID `61`
  - `Team | VA Team | Bonus Pool`
- Category ID `70`
  - `Team | Canadian Team | ISA Bonus`
- Category ID `71`
  - `Team | Canadian Team | Media Team Bonus`

Practical meaning:

- the ops-side bonus sheets show what people think was earned
- `(Input) Weekly Actuals` is the better finance source to verify when bonus payouts actually hit
- `Monthly Actuals (Roll Up)` is the monthly aggregation layer after that weekly paid truth

### Monthly Budget — planning layer with a live commission override

This tab is now locked for meaning:

Current layout:

- `1:15`
  - top monthly summary strip
- `17`
  - expected commission income
- `18`
  - expected revenue
- `24`
  - month keys
- `25`
  - real category headers
- `26+`
  - monthly budget category spine

Important structural read:

- `Monthly Budget` is not just a flat annual plan copied across months
- it uses the budget spine for most categories
- but it deliberately swaps commission planning toward a live expected-cash read

Top-strip source chain now confirmed:

1. `ADMIN ONLY - Deal Data Entry`
   - `AP`
     - expected company cash
   - `I`
     - expected cash date
2. `Monthly Actuals (Roll Up)` row `20`
   - `Monthly Expected (Deal Sheet)`
   - monthly `SUMIFS` from the Admin tab using the expected-cash date window
3. `Monthly Budget` row `17`
   - `Expected commission Income`
   - direct link to `Monthly Actuals (Roll Up)` row `20`
4. `Monthly Budget` row `18`
   - `Expected Revenue`
   - formula pattern:
     - top-line budget revenue
     - minus budgeted commission-income row
     - plus live expected commission-income row

Business meaning:

- budgeted commission revenue is useful for target-setting and planning
- but for expected monthly cash / revenue reading, Steve wants the live commission expectation from the Admin deal sheet instead of the static budget number
- other smaller revenue lanes can remain budgeted / planned
- practical read:
  - row `17` = live expected commissions
  - row `18` = live expected commissions plus the other budgeted revenue lanes

Current status:

- this top-strip logic makes sense
- this is a valid planning pattern, not a bug
- the body rows follow the same finance spine cleanly
- no live check-column break surfaced in the current pass

### Budget Original — static annual planning baseline

This tab is a simpler planning baseline than `Monthly Budget`.

Current read:

- top strip is the annual version of the finance summary
- row `23`
  - year keys
- row `24`
  - category headers
- row `25+`
  - category spine

Business meaning:

- this is the locked original annual plan
- it is not trying to become live expected reality
- it is the “what we thought we would do” layer
- later views compare against it so leadership can see:
  - original plan
  - adjusted / live budget
  - actuals

Current status:

- structurally clean
- no bad check rows
- same finance spine as the other budget / actual tabs
- placeholder rows still exist at the bottom with blank type, which is expected

One real note:

- some old text hygiene drift still lives here on labels like:
  - `General Operating Expenses `
  - `Communications & Connectivity `
  - `Front Desk Telecom Services `
  - `Outside Contractor `
- not a logic problem
- just older copied labels that were not cleaned the same way as `Monthly Budget`

### Annual Actuals (Roll Up) — yearly aggregation of actual finance

This tab reads cleanly as the annual rollup of `Monthly Actuals (Roll Up)`.

Current read:

- top strip is the annual summary layer
- row `19`
  - carries the yearly version of `Monthly Expected (Deal Sheet)` context
- row `22`
  - year keys
- row `24`
  - category headers
- row `25+`
  - category spine

Business meaning:

- this is the yearly actuals layer
- it is not the payment ledger itself
- it is the annual reporting view built from the monthly actual layer

Current status:

- structurally clean
- no duplicate keys
- no blank-type active issues
- partner-commission rows roll through here cleanly
- `Other Income` annual negatives match the already-confirmed normalization behavior from the monthly layer

### Annual Budget (Roll Up) — yearly aggregation of the live budget layer

This tab reads cleanly as the annual rollup of `Monthly Budget`.

Current read:

- top strip is the annual budget summary layer
- row `24`
  - category headers
- row `25+`
  - category spine

Business meaning:

- this is the annual budget / pacing layer
- it should be read as the annualized budget view, not actuals

Current status:

- structurally clean
- no duplicate keys
- no bad check rows
- no meaningful logic bug found in this pass

Known cosmetic issue still present:

- some lower Category IDs near the bottom are date-formatted instead of showing the raw numeric ID cleanly
- current examples in the lower financing block render like:
  - `6/12/1900`
  - `6/13/1900`
  - etc.
- this is formatting drift, not logic drift
- future-state bonus trust should reconcile:
  - source event / score logic
  - ops bonus tracker
  - weekly finance entry actually paid
  - monthly rollup that inherits that paid truth
- broader future-state finance rule:
  - `(Input) Weekly Actuals` must eventually reconcile to actual payments, not just trusted manual entries
  - monthly and annual rollups should inherit that payment-backed truth instead of compounding spreadsheet trust

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
- must match a valid governed Follow Up Boss-compatible lead source exactly
- legacy lowercase `unspecified` and `Import` are not acceptable steady-state values
- `<unspecified>` is allowed only as the governed quarantine value while a row is still unresolved
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

Current live dropdown rule:
- the Owners Dashboard `Lists` tab is an `IMPORTRANGE` mirror, not the owned write surface
- the upstream source is `SRC-OWNERS-LISTS-001` / workbook `1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE` / tab `Lists`
- governed lead-source writes belong in upstream source `Lists!J3:J`
- Admin column `N` `Lead Source` validates against `=Lists!$J$3:$J`
- Admin column `P` `Ground Zero` also validates against `=Lists!$J$3:$J`
- `No Extra Lead Source` is part of the same governed lead-source list so Ground Zero does not need a duplicate helper list
- Admin column `S` `Realtor` validates against `=Lists!$AA$2:$AA`, which flows from the upstream active-agent roster
- do not write helper lists into Owners Dashboard `Lists!AA:AB`; those columns are imported `User` and `Email`

Current implementation:
- source `Lists!J3:J` now holds the governed FUB-approved lead-source list
- `Lists!J3` is `<unspecified>` as the quarantine value
- `Lists!J4` is `No Extra Lead Source`
- Owners Dashboard `Lists!A1` keeps the `IMPORTRANGE` formula to the upstream source
- the Google delegated write helper blocks writes into Owners Dashboard `Lists!A:AI` unless a narrow repair override is passed
- `npm run owners:repair-lists -- --apply` repairs the upstream source list, Admin validations, and local mirror blockers if drift recurs

April 2026 failure mode:
- an inline service-account write put governed dropdown helper lists into the Owners Dashboard mirror:
  - `Lists!J3:J100`
  - `Lists!AA1:AA500`
  - `Lists!AB1:AB500`
- those writes overlapped the `IMPORTRANGE` spill range and blocked the imported roster/cap/list data
- downstream formulas in Admin `AU`, `AW`, and `AZ` were not the root problem; their lookup source was blocked
- the permanent fix is source-aware writes plus verifier coverage on the imported mirror

Current recent cleanup read:
- `45` rows in the rolling last `12` months currently fall outside the governed list
- biggest offenders now are:
  - blank source
  - `Import`
  - old `HomeOptima`
  - old plain `unspecified`
  - retired generic labels like `Google Search Call`

Post-merge cleanup read:
- initial read found `84` rows from `2025-06-01` forward outside the governed list
- `58` governed fixes have now been applied directly:
  - blank -> `<unspecified>`
  - legacy lowercase `unspecified` -> `<unspecified>`
  - `ZahndTeam.ca Call` -> `Zahndteam.ca Call`
  - safe `Import` rows normalized to governed sources or quarantined to `<unspecified>`
  - locked `HomeOptima` rows normalized to governed Home Value Hub / Agent Flyer sources
  - one generic Google Search Call row normalized to the Brantford canonical source
- current remaining post-merge queue:
  - `26` rows
- current top buckets are:
  - `Import`
  - generic `For Sale Sign Call`
  - generic `Google Search Call`
- founder rule now locked:
  - legacy `HomeOptima` rows are Home Value Hub lineage
  - flyer-drop rows with the agent-style split should normalize to `Agent Flyer - Home Value Hub`
  - otherwise they usually normalize to `Company Website – Home Value Hub`

Owners/FUB lineage model locked for v1:

- Column `N` is the Owners ledger source value and must stay inside the governed FUB-compatible list.
- FUB person `source` is CRM-side evidence, not an automatic overwrite of Column `N`.
- The governed `fub_lead_source_rules` table owns source classification:
  - `marketingType`
  - `ownershipType`
  - `flagState`
  - `sourceGroup`
- Company/Agent should be rule-driven:
  - `ownershipType = company` -> `Company`
  - `ownershipType = agent` -> `Agent`
  - FUB or Owners ISA evidence overrides to `Company`
  - unresolved / non-final sources stay open instead of guessed
- If Owners and FUB have different source names but the same governed ownership, the issue is lineage cleanup, not an automatic company/agent credit flip.
- If Owners and FUB have different governed ownership, the row needs source-truth review before attribution is trusted.
- `<unspecified>` is quarantine only. It can keep the row governable while unresolved, but it is not final attribution truth.

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
- signed-off v1 join rule:
  - use the trailing FUB person ID as the join key
  - use FUB for person identity, source, stage, assigned agent, tags, address, phone, and email parity
  - keep Owners as the deal ledger for trade number, firm/executed date, agent-on-deal, split math, and final source-row fixes
  - never auto-fix Owners or FUB from the other side without an approval-gated apply lane

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
   - for split deals, every credited row must carry required fields through column `T`
   - every credited row must also carry the core `AG+` reporting/calculation fields that drive volume, commission, deal credit, agent split, cap tracking, agent email, and ISA state
   - the top row is still the cash anchor for fields like `Gross To Team`, but it is not enough for attribution/reporting fields because partial source rows undercount source credit
   - still check split math across all split rows
2. `Date Firm (Executed)` is the economic cash-created date.
   - `Pending` in Owners means the deal is firm.
   - `Firm Deal` / `Pending` in FUB is valid until `Expected Closing` has passed.
   - do not flag `Firm Deal` as closed / past-client cleanup before the expected closing date.
   - after expected closing has passed, a remaining `Firm Deal` / `Pending` stage should be reviewed for post-close cleanup.
   - future AI automation should prefer adding a `Past Client` tag / post-close automation marker instead of forcing an early FUB stage move before the real close.
   - current review only flags a missing `Past Client` tag; it does not auto-write FUB tags until an approval-gated apply lane exists.
3. `Expected Cash Deposit` is hybrid.
   - starts as expected paid date
   - later gets overwritten with actual paid date
4. lead source must match the governed Follow Up Boss-compatible list exactly.
   - `Import` and legacy lowercase `unspecified` are high-severity failures
   - `<unspecified>` is allowed only as quarantine while the real source is still unresolved
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
