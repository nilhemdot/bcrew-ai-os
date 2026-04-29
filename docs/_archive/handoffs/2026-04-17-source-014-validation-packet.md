# SOURCE-014 Validation Packet

Purpose: lock the live strategy-input boundary for `SOURCE-014` at Level 2 by validating the exact strategy-used inputs, their meaning, and their current source path.

## Scope

- `SRC-FREEDOM-COMMUNITY-001`
- `SRC-FREEDOM-BHAG-001`
- `SRC-FREEDOM-ENGINE-001`
- strategy-used slice of `SRC-OWNERS-001`

## Additional workbook read confirmed on 2026-04-18

- `Data Entry - Agent Satisfaction` = source tab
- `Agent Satisfaction` = dashboard / read layer
- practical read:
  - the data-entry tab stores monthly survey, engagement, and category-score inputs
  - the dashboard pulls the latest non-null values from that tab and overlays a monthly operating model underneath
  - row rule confirmed by Steve:
    - populate rows only for real survey / town-hall / culture cycles
    - do not fake perfect monthly rows when nothing happened
  - producing-agent rule confirmed by Steve:
    - `Total Agents` should mean active producing agents only
    - do not count leadership / support people like Steve, Scott, Ryan, Blake, Nick, or Georgia just because they exist in the org
  - town-hall rule confirmed by Steve:
    - `Town Halls` is the count held in that cycle
    - not just a yes/no field
  - qualitative-summary rule confirmed by Steve:
    - `P:R` was intended to come from AI analysis of the survey responses
    - future-state should do that internally in the system instead of relying on manual summary writing
  - future-state rule:
    - this should become an event-driven retention / culture system that ingests surveys, town halls, and other engagement events directly, then reproduces the dashboard from that cleaner source layer
  - dashboard cleanup completed on `2026-04-18`:
    - top town-hall gap cell was corrected from the wrong target reference to `=E3-E4`
    - pillar block `G2:L5` sanity-checked:
      - actual pillar scores correctly pull the latest non-null scored row from `Data Entry - Agent Satisfaction`
      - gap formulas intentionally compare every pillar against the shared `4.5` target in `H4`
      - display is slightly sloppy because the target row only shows the first `4.5`, but the formula logic is valid
    - helper / chart-feed area `Z:AO` sanity-checked:
      - it is chart-support and context logic, not core business truth
      - good enough to keep as-is until the Culture Hub rebuild

Underlying survey evidence checked on `2026-04-18`:

- file: `2026 - January Culture Survey (Responses)`
- spreadsheet id: `1GW1o1kqv5aVU43NW3e7suM8FRTVvdYNnkLcr7M-8uXk`
- tab: `Form Responses 1`
- current shape checked:
  - `24` responses
  - `31` columns
  - numeric `1-5` score questions
  - free-text follow-up fields
  - town-hall expectation / experience questions
  - tool-usage questions
- practical read:
  - this confirms the source tab is summarizing a real survey dataset, not invented metrics
  - the scored columns can be averaged from the raw survey
  - the qualitative summary layer can be generated from the open-text answers internally later

Survey folder access confirmed on `2026-04-18`:

- folder: `Culture Surveys`
- folder id: `1kHiNSqlvUoVhK8RpA4jH9XY_ToFo5a97`
- subfolders seen:
  - `Raw Data - Survey Responses`
  - `Culture Survey Summary Reports`

Important rule from Steve:

- surveys are not always the same
- future retention / culture rebuild must expect schema drift across survey cycles

## Adjacent Freedom validation captured on 2026-04-18 outside strict SOURCE-014 scope

These tabs are not part of the strategy closeout boundary, but they were deeply mapped in the same workbook pass so the work does not need to be redone later.

### Ops architecture

- `Data Entry - Ops Cont Improvement`
  - master monthly ops rollup
  - combines:
    - client onboarding
    - transaction management
    - agent onboarding
  - overall score formula is `AVERAGE(I, N, X)`
- `Ops Satisfaction`
  - dashboard / read layer on top of that rollup
- feeder tabs:
  - `Data Entry - Client Onboarding`
  - `Data Entry - Clients, Deals, NPS & GReviews`
  - `Data Entry - Agent Onboarding`
- dependency tab:
  - `Bonus System`

### Current ops breakage

- `Data Entry - Ops Cont Improvement` still contains a dead reference to a removed tab:
  - `NPS Scores & Reviews`
- that dead reference produces live `#REF!` behavior inside the transaction-management rollup
- `Ops Satisfaction` top actuals are therefore not trustworthy yet
- the dashboard also has a gap-formula bug:
  - agent-onboarding capture gap is subtracting the wrong target cell

### Current ops bonus picture

- `Data Entry - Client Onboarding`
  - uses the `Bonus System` ops-team lookup for onboarding bonuses
  - still contains media-bonus logic that looks legacy
- `Data Entry - Clients, Deals, NPS & GReviews`
  - pays separate bonuses for:
    - firm to close
    - NPS capture
    - Google-review capture
    - Owners deal-data completion
- `Data Entry - Agent Onboarding`
  - uses a local lookup table instead of the central `Bonus System` sheet

### Meaning for rebuild planning

- the ops source chain is now understood
- it should not be treated as signed off yet
- the first cleanup is source repair, not dashboard polish:
  - remove the dead sheet dependency
  - lock the month-row rule
  - then re-check the dashboard
- the bonus model should be rebuilt later from one governed rule set instead of spreadsheet-era duplicated lookups

## Freedom Sheet Live Structure

Workbook:

- title: `📊 Benson Crew - Freedom Sheet`
- workbook id: `1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw`

Relevant tabs for the strategy package:

- `Agent Engine` (`gid 1416660204`)
- `Benson Crew Bhag Builder` (`gid 337425848`)
- `Data Entry - BCrew Team/Community` (`gid 1670417784`)
- hidden `ADMIN ONLY - Deal Data Entry` (`gid 1738912434`)

Important dependency note:

- the hidden Freedom-sheet `ADMIN ONLY - Deal Data Entry` tab is not hand-entered locally
- cell `A1` is an `IMPORTRANGE` from the separate Owners workbook:
  - owners workbook id: `18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk`
  - source range: `'ADMIN ONLY - Deal Data Entry'!A1:BZ`
- this means the Freedom Sheet is already depending on the Owners deal ledger for production and split math

## Strategy Package Dependency Map

### `SRC-FREEDOM-COMMUNITY-001`

- source tab: `Data Entry - BCrew Team/Community`
- tracked source range: `G:O`
- current job in the strategy package:
  - carries the community-count tracker used for BHAG community pace
- adjacent live blocks on the same tab:
  - `A:E` = team roster history
  - `P:U` = community revenue by leader

### `SRC-FREEDOM-BHAG-001`

- source tab: `Benson Crew Bhag Builder`
- current live blocks:
  - `A22:B31` = agent assumption block
  - `K4:N13` = team target ladder
  - `K20:M29` = community target ladder
- key live inputs used by Agent Engine:
  - `B23` = `GCI / Agent Average`
  - `B24` = `Split To Agent`
  - `B25` = `Split to Team`
  - `B29` = `Annual Volume Average`
  - `B31` = `Planning Attrition Assumption`

### `SRC-FREEDOM-ENGINE-001`

- source tab: `Agent Engine`
- visible top block:
  - `B3:K7`
- real calculator behind the top block:
  - `A59:W`
- current-row selector:
  - `AA2`

### Strategy-used slice of `SRC-OWNERS-001`

- the system BHAG pace cards read the Owners workbook directly for executed-date volume
- the Freedom-sheet Agent Engine reads a hidden `IMPORTRANGE` mirror of that same deal ledger
- current columns used by the Freedom-sheet engine helper math:
  - `G` = executed-date month bucket
  - `AM` = `Net To Team`
  - `AO` = `Agent Portion`
  - `AP` = `Company/Team Lead Portion`

## BHAG Builder Structure

The BHAG builder is doing two jobs at once:

- long-range target path
- live engine assumptions

Current shape:

- this tab is mostly a strategy builder, not an external source sync
- manual assumptions and growth inputs sit in the sheet
- formulas derive the planning path from those assumptions
- it is a builder that should eventually become a cleaner app-owned planning layer rather than permanent spreadsheet-only logic

Secondary helper blocks:

- `D5:G8`
  - `Deals Per Year / Month / Week / Day`
  - `5 Star Real Estate Experiences Per Year / Month / Week / Day`
  - formulas:
    - deals = `B18 / B5:B8`
    - five-star experiences = `B20 / B5:B8`
  - interpretation:
    - this is pace math derived from the core transaction block
    - useful for operator understanding, not a root source
- `D23:G34`
  - annualized helper stats and implied agent-count helper rows
  - notable formulas:
    - `E23 = B9 / B5` annual average volume needed
    - `E24 = B11 / B5` annual average GCI needed
    - `E26 = 0.5` current split helper
    - `E28 = E23 * E26` annual net-to-team volume helper
    - `E29 = E24 * E26` annual net-to-team GCI helper
    - `E33 = E23 / B29` implied agent count by volume assumptions
    - `E34 = E24 / B23` implied agent count by GCI assumptions
  - interpretation:
    - useful support block for reading the model
    - still helper math, not a primary manual-input block

### `I:U` first BHAG annual overview block

This is worth treating as a real annual planning-output block, not just fluff.

Locked meanings:

- `K4:K13` = annual team sales targets
- `L4:L13` = year-over-year growth path
- `M4:M13` = helper showing what is left to accomplish before the end target
- `N4:N13` = agents required from the annual volume assumption in `B29`
- `O4:O13` = transactions required
- `P4:P13` = five-star experiences required
- `Q4:Q13` = annual GCI target
- `R4:R13` = annual net-to-team target
- `S4:S13` = burn estimate
- `T4:T13` = rough annual profit estimate

Interpretation notes:

- `M` exists as a helper so Steve can see whether the path actually zeroes out by the target year
- `T` is rough planning profit, not true finance truth

Formula cleanup completed on `2026-04-18`:

- `O` now uses `B17`
- `P` now uses `B19`
- `Q` now uses `B10`
- `R` now uses `B12`
- duplicate split helpers now stay aligned:
  - `B25 = B12`
  - `E26 = B12`

Remaining notable hardcoded planning area:

- `S` burn estimates are still manual / hardcoded planning values

### Core goal block

- `B3` = start date
- `B4` = end date
- `B5:B8` = years, months, weeks, days
- `B9:B13` = total volume / commission / GCI / split / net goals

Locked meaning so far:

- `B3` = goal start date
- `B4` = goal end date
- `B5` = total years in the goal period
- `B6` = total months in the goal period
- `B7` = total weeks in the goal period
- `B8` = total days in the goal period
- `B9` = total accumulated sales target for the full `10`-year path
  - it rolls up the yearly sales targets in `K4:K13`
  - it is not a one-year sales goal
- `B10` = commission-average target used against the total sales goal
- `B11` = total GCI goal produced from sales volume and commission average
- `B12` = split target
- `B13` = total net-to-company goal produced from the full goal chain
- `B17` = average sale-price assumption
  - current assumption: `$750k`
- `B18` = total deals required to reach the full sales target
- `B19` = five-star-experience-rate assumption
  - current assumption: `80%`
  - Steve clarified this means an `8+` NPS score counts as one five-star experience
- `B20` = total five-star experiences required across the goal period
  - current operational gap: NPS capture and review conversion are not yet tracked tightly enough
  - future ops accountability needs to cover both `8+` NPS capture and review conversion rates

### Agent assumption block

- `A22` = `Agent Stack` section header
- `B23` = `GCI / Agent Average`
  - target annual GCI per agent
  - this is a planning target, not a live actual
- `B24` = `Split To Agent`
  - target split to the agent
- `B25` = `Split to Team`
  - target split to the team
- `B26` = `Total To Agent`
  - derived net amount to the agent
- `B27` = `Total Net to Team`
  - derived net amount to the team
- `B28` = `Commission Average`
  - target commission average per agent
- `B29` = `Annual Volume Average`
  - target annual volume per agent
  - current planning read is roughly `$6M`
- `B30` = `Average Monthly GCI`
  - current planning read is roughly `$10k` per month
- `B31` = `Planning Attrition Assumption`
  - current planning assumption is `15%`

### A:C33 review notes

This block is now mostly clear, but two formula / naming caveats are worth keeping visible:

- `B12` / `B13` semantic caveat
  - `B12` is labeled `Total Split to Agent Goal`
  - `B13` is labeled `Total Net to Company Goal`
  - formula in `B13` is `=B11*B12`
  - that only works cleanly if `B12` is really being treated as the company share or if the target happens to be `50/50`
  - if the business later changes the split assumption away from `50%`, this label / formula pairing could become misleading
- `B5:B8` rigidity caveat
  - `B5` is hardcoded as `=10`
  - `B6:B8` derive from `B5`, not directly from `B3:B4`
  - this is acceptable for the current fixed 10-year plan, but it is not a true date-difference model

### Long-range target ladders

- `K4:N13` = team sales target path, growth, target remaining, agents required
- `K20:M29` = community target path, growth, target remaining

### Primary manual inputs vs derived outputs

Primary manual inputs:

- `B3`
- `B4`
- `B10`
- `B12`
- `B17`
- `B19`
- `B23`
- `B25`
- `B31`
- sales-growth assumptions in column `L`
- community-growth assumptions in column `L`

Primary derived outputs:

- `B5:B13`
- `B18:B20`
- `B24`
- `B26:B30`
- sales target ladder `K:M`
- agent requirement ladder `N`
- community target ladder `K:M`

### Downstream consumers in Agent Engine

- `Agent Engine!A59`
  - reads `B3` and `B4`
- `Agent Engine!B3`
  - reads `B31`
- `Agent Engine!H4`
  - reads `B23`
- `Agent Engine!K4`
  - reads `B25`
- `Agent Engine!K59`, `L59`, `M59`
  - read `B23`, `B24`, `B25`
- `Agent Engine!O59`, `Q59`, `U59`
  - read the year ladder `J:N`

Meaning note:

- `B5:B8` are not just display values
- they help break the total goal period into usable planning units: years, months, weeks, and days

## Team / Community Tab Structure

The `Data Entry - BCrew Team/Community` tab is currently a mixed source, not a clean normalized model.

### `A:E` team roster history

- `A` = agent name
- `B` = recruited by
  - current intent is the person who brought the agent in so recruiting targets can be tracked by person
  - some older merged rows still reflect legacy team-origin history behind that field
- `C` = status
- `D` = start date
  - newer rows should be the real start date
  - some older merge-era rows may use approximated dates rather than the true original start date
- `E` = end date
  - true end date when someone actually leaves
  - also currently used as a workaround to remove non-producing rows from the Agent Engine active count

Current live profile:

- `61` roster rows
- statuses now:
  - `37` active
  - `15` departed
  - `9` non producing
- every row has a start date
- `37` rows have blank end dates
- `24` rows have an end date

This is what the Agent Engine uses for:

- active headcount
- monthly joins
- monthly attrition

Important meaning note:

- `E` is currently doing two jobs:
  - real end-date tracking
  - temporary production-roster filtering workaround
- this is acceptable for the current spreadsheet
- it should become separate logic in the rebuild
- complementary source candidate later:
  - ClickUp `Agent Roster` list `901113292355`
  - old-system split was:
    - ClickUp = statuses / onboarding / contract-tracking layer
    - Freedom = recruiter/origin + dates
  - old-system agents using the ClickUp list included `Agent Roster`, `Onboarding Monitor`, `Process Enforcer`, and `Carson Assist`
  - practical read:
    - ClickUp is a strong future operational roster source
    - Freedom still carries engine-critical recruiter/date context today
    - `SOURCE-004` should decide whether ClickUp becomes the primary roster layer later or stays complementary

### `G:O` community tracker

- `G` = month
- `H` = year
- `I` = total income
  - formula: `SUM(P:T)`
  - total downline / community revenue generated together
  - useful gross stat, not the true company-kept number
- `J` = total community
  - formula: `SUM(K:O)`
  - real progress number against the `10k` community target
- `K:O` = leader-level community counts

This is what the system BHAG community pace currently reads.

### `P:U` community revenue

- `P:T` = leader-level community revenue
- `U` = `Bcrew In Before HST`
  - formula: `SUM(Q:T) / 1.13`
  - finance-relevant company number before HST

Current share logic Steve confirmed:

- `P` = Scott revenue share
  - Scott keeps the first `$256k`
  - after that, it goes `100%` to the company
- `Q` = Steve revenue share
  - `80%` company / `20%` Steve
- `R:S:T` = Ryan / Blake / Nick revenue share
  - `100%` to the company

Practical interpretation:

- `I` is gross community revenue generated together
- `U` is the number that matters for company finance

Current monthly structure:

- monthly spine currently runs from `August 2025` to `December 2028`
- only the first `9` month rows currently contain live community counts and revenue
- later rows are scaffold rows already prebuilt in the sheet

Current note:

- this tab is row-oriented monthly history with formulas mixed into the same rows
- it is usable now, but it is a clear rebuild target later
- `A:E` is the only block the core Agent Engine roster math reads directly
- `G:O` and `P:U` are separate community layers, not the same thing as the Agent Engine roster block
- `U` excludes column `P` by formula, so that meaning should be validated explicitly later

## Agent Engine Current Row Selector

Cell: `Agent Engine!AA2`

Formula:

```gs
=MAX(1, MATCH(EOMONTH(TODAY(),0), $A$59:$A, 1))
```

Meaning:

- `AA2` is not business logic
- it points the dashboard to the latest month row in the helper calculator at or before the current month end

Current result on `2026-04-17`:

- `AA2 = 16`
- that points the top block at helper row `74`
- helper row `74` is the `2026-04-01` month row

## Agent Engine Context Helpers: `Z1:AD2`

These are helper/context cells, not primary business metrics.

### `Z2`

- formula: `=COUNTA($A$59:$A)`
- current value: `132`
- meaning:
  - count of populated month rows in the helper calculator
- current usage:
  - not referenced by the live top dashboard formulas

### `AA2`

- formula: `=MAX(1, MATCH(EOMONTH(TODAY(),0), $A$59:$A, 1))`
- current value: `16`
- meaning:
  - current helper-row pointer
- current usage:
  - feeds `B3`, `B4`, `E3`, `E4`, `H3`, and `AB2`

### `AB2`

- formula: `=INDEX($A$59:$A, $AA$2)`
- current display: `2026-04-01`
- meaning:
  - the current month date selected by `AA2`
- current usage:
  - feeds `AC2` and `AD2`

### `AC2`

- formula: `=YEAR($AB$2)`
- current value: `2026`
- meaning:
  - current selected year
- current usage:
  - not referenced by the live top dashboard formulas

### `AD2`

- formula: `=INT((MONTH($AB$2)-1)/3)+1`
- current value: `2`
- meaning:
  - current selected quarter from the current month date
- current usage:
  - not referenced by the live top dashboard formulas

### Why this block exists

- `AA2` is the real one that matters now
- `AB2`, `AC2`, and `AD2` are context helpers that make quarter- and date-based logic easier to build later
- `Z2` is a row-count helper
- for rebuild purposes:
  - keep `AA2` conceptually
  - `AB2` / `AC2` / `AD2` can become derived runtime values instead of stored cells

## Agent Engine Helper Calculator

The top dashboard is only a read surface. The real model lives in the helper table starting at `A59`.

| Col | Meaning | Main upstream source |
| --- | --- | --- |
| `A` | Month spine from earliest start to BHAG end | BHAG start + earliest team start |
| `B` | Active agents | `Data Entry - BCrew Team/Community!D:E` |
| `C` | Joins in month | `Data Entry - BCrew Team/Community!D:D` |
| `D` | Attrition in month | `Data Entry - BCrew Team/Community!E:E` |
| `E` | Net adds | `C - D` |
| `F` | Gross to team | hidden Freedom `ADMIN ONLY - Deal Data Entry!AM` |
| `G` | Agent cut | hidden Freedom `ADMIN ONLY - Deal Data Entry!AO` |
| `H` | Team cut | hidden Freedom `ADMIN ONLY - Deal Data Entry!AP` |
| `I` | Avg GCI / Agent actual | `F / B` |
| `J` | Team split actual | `H / F` |
| `K` | Variance to GCI target | `I - (BHAG B23 / 12)` |
| `L` | Variance to split target | `J - (1 - BHAG B24)` |
| `M` | Modeled crew net from assumptions | `B * (BHAG B23 / 12) * (1 - BHAG B24)` |
| `N` | Crew net gap | `H - M` |
| `O` | Target headcount per BHAG year | BHAG year ladder `N:N` |
| `P` | Headcount variance | `B - O` |
| `Q` | Ramped target headcount | interpolated between BHAG year targets |
| `R` | Target net adds / month | change in `Q` |
| `S` | Actual net adds / month | change in `B` |
| `U` | Next-Jan start target | next-year BHAG headcount target |
| `V` | Months remaining to next Jan | `13 - MONTH(A)` |
| `W` | Required net-adds / month to hit next Jan target | `(U - B) / V` |

### Root trace: roster block `A:E`

#### `A` Month

- builds the month spine for the whole model
- starts at the earlier of:
  - BHAG start date `Benson Crew Bhag Builder!B3`
  - earliest team start date in `Data Entry - BCrew Team/Community!D:D`
- ends at BHAG end date `Benson Crew Bhag Builder!B4`

#### `B` Active Agents

- counts agents active on each month row
- root source:
  - `Data Entry - BCrew Team/Community!D:D` start dates
  - `Data Entry - BCrew Team/Community!E:E` end dates
- active rule:
  - start date is on or before the month
  - end date is blank or on/after the month

#### `C` Joins

- counts team starts inside each month bucket
- root source:
  - `Data Entry - BCrew Team/Community!D:D`

#### `D` Attrition

- counts team end dates inside each month bucket
- root source:
  - `Data Entry - BCrew Team/Community!E:E`

#### `E` Net Adds

- formula: `C - D`
- this is why `B4` is a net-growth metric, not gross attraction

## Agent Engine Trace Notes

### Datapoint: `Agent Engine!B3`

- Label: `Required Monthly Recruiting Pace`
- Meaning: how many agents per month must be added from now to still start 2027 at the required agent count.
- Type: spreadsheet-derived planning metric.
- Current dependency target: `Agent Engine!E4`
- Planning attrition source: `Benson Crew Bhag Builder!B31`
- Current raw value on `2026-04-17`: `3.6048032407407407`
- Current display on sheet: `3.6`
- Confirmed by Steve: yes

#### Formula

```gs
=LET(
  reqNet, INDEX($W$59:$W,$AA$2),
  target, $E$4,
  attrRate, 'Benson Crew Bhag Builder'!B31,
  monthsLeft, MAX(1, 12 - MONTH(TODAY())),
  attrPerMonth, (target * attrRate) / monthsLeft,
  MAX(0, reqNet + attrPerMonth)
)
```

#### Traceability

- `target` -> `Agent Engine!E4`
- `attrRate` -> `Benson Crew Bhag Builder!B31`
- `monthsLeft` -> derived from current date
- `reqNet` -> hidden helper path: `INDEX(Agent Engine!W59:W, Agent Engine!AA2)`

#### What still needs to be unpacked

- Whether `monthsLeft = 12 - MONTH(TODAY())` is the intended remaining-month logic
- Whether `E4` should remain the intermediate dependency or be traced straight back to the BHAG builder target source

#### Rebuild intent later

- Keep the current spreadsheet formula as the validated operating truth for now.
- Once the true underlying source inputs are fully traced, this metric can become system-native and does not need to stay spreadsheet-dependent forever.

### Datapoint: `Agent Engine!B4`

- Label: `Attraction Avg (6 Month Rolling)`
- Meaning: recent rolling average of monthly agent additions from the helper table.
- Current raw value on `2026-04-17`: `1.1666666666666667`
- Current display on sheet: `1`

#### Formula

```gs
=LET(ptr,$AA$2, start,MAX(1,ptr-5),
     rng, INDEX($E$59:$E,start):INDEX($E$59:$E,ptr),
     IF(ROWS(rng)=0,0, AVERAGE(rng)))
```

#### Traceability

- reads helper net-add rows from `E59:E`
- uses `AA2` as the end of the rolling window
- current window is the six-row span ending at the active current row

### Datapoint: `Agent Engine!B5`

- Label: `Attrition Rate`
- Meaning: annualized attrition against the average active-agent base for the current year-to-date window.
- Current raw value on `2026-04-17`: `0.1791044776119403`
- Current display on sheet: `17.9%`
- Important note:
  - this is no longer the older `B7 / B6` pressure ratio
  - earlier handoff notes that described it that way are stale

#### Formula

```gs
=LET(
  months, COUNTIFS($A$59:$A,">="&DATE(YEAR(TODAY()),1,1), $A$59:$A,"<="&EOMONTH(TODAY(),0)),
  attr, SUMIFS($D$59:$D, $A$59:$A,">="&DATE(YEAR(TODAY()),1,1), $A$59:$A,"<="&EOMONTH(TODAY(),0)),
  avgActive, AVERAGEIFS($B$59:$B, $A$59:$A,">="&DATE(YEAR(TODAY()),1,1), $A$59:$A,"<="&EOMONTH(TODAY(),0)),
  IF(OR(months=0,avgActive=0),0,(attr/avgActive)*(12/months))
)
```

#### Traceability

- `months` -> helper month spine `A59:A`
- `attr` -> helper attrition counts `D59:D`
- `avgActive` -> helper active-agent counts `B59:B`
- this is the closest live operating metric to the planning attrition assumption in `BHAG Builder!B31`

### Datapoint: `Agent Engine!B6`

- Label: `Average Addition /month`
- Meaning: year-to-date average monthly joins.
- Current raw value on `2026-04-17`: `2`
- Current display on sheet: `2.0`

#### Formula

```gs
=LET(
  m, COUNTIFS($A$59:$A,">="&DATE(YEAR(TODAY()),1,1), $A$59:$A,"<="&EOMONTH(TODAY(),0)),
  adds, SUMIFS($C$59:$C, $A$59:$A,">="&DATE(YEAR(TODAY()),1,1), $A$59:$A,"<="&EOMONTH(TODAY(),0)),
  IF(m=0,0, adds/m)
)
```

#### Traceability

- `m` -> helper month spine `A59:A`
- `adds` -> helper joins `C59:C`

### Datapoint: `Agent Engine!B7`

- Label: `Average attrition/month`
- Meaning: year-to-date average monthly departures.
- Current raw value on `2026-04-17`: `0.5`
- Current display on sheet: `0.5`

#### Formula

```gs
=LET(
  m, COUNTIFS($A$59:$A,">="&DATE(YEAR(TODAY()),1,1), $A$59:$A,"<="&EOMONTH(TODAY(),0)),
  att, SUMIFS($D$59:$D, $A$59:$A,">="&DATE(YEAR(TODAY()),1,1), $A$59:$A,"<="&EOMONTH(TODAY(),0)),
  IF(m=0,0, att/m)
)
```

#### Traceability

- `m` -> helper month spine `A59:A`
- `att` -> helper attrition counts `D59:D`

## Agent Engine Companion Metrics

These are not in the B column, but they are part of the same top block and should be treated as one package.

### Roster

- `E3` = active agents = `INDEX(B59:B, AA2)` -> current raw value `37`
- `E4` = next-year start target = `INDEX(U59:U, AA2)` -> current raw value `59.416666666666664`
- `E5` = roster gap = `E3 - E4` -> current raw value `-22.416666666666664`
- `E6` = roster progress = `E3 / E4` -> current raw value `0.6227208976157083`

### Production

- `H3` = average production last 6 months -> current raw value `7700.119040899306`
- `H4` = target monthly GCI per agent = `BHAG Builder!B23 / 12` -> current raw value `10000`
- `H5` = production gap = `H3 - H4` -> current raw value `-2299.880959100694`
- `H6` = production progress = `H3 / H4` -> current raw value `0.7700119040899306`

### Split

- `K3` = live team split actual over the last 6 full months -> current display after formula fix on `2026-04-17`: `53.3%`
- `K4` = target split = `BHAG Builder!B25` -> current raw value `0.5`
- `K5` = split gap = `K3 - K4` -> current raw value `0.0332386201510213`
- `K6` = split progress = `K3 / K4` -> current raw value `1.0664772403020426`

## What This Reveals About The Freedom Sheet

- the sheet is already acting like a mini data warehouse plus dashboard layer
- it mixes:
  - raw team roster data
  - community tracker data
  - imported deal-ledger economics
  - BHAG assumptions
  - derived monthly engine math
  - dashboard presentation cells
- that is why it works for now but is also the right rebuild target later

## Rebuild Opportunity Later

Once `SOURCE-014` is closed, the clean system-native replacement path is:

1. roster source
   - one normalized table for team members, start dates, end dates, and recruiter lineage
2. community source
   - one normalized monthly community table
3. deal economics source
   - one direct ledger from the Owners source, not a hidden spreadsheet mirror
4. engine model
   - one derived monthly model that computes headcount, production, split, and recruiting pace
5. dashboard surface
   - one read layer that does not own the business logic

## Chart Feed Layer: `AG:AK`

This area is mostly presentation support, not core engine logic.

### What it does

- builds chart-ready rolling tables from the helper calculator
- avoids chart formulas reaching directly into scattered dashboard cells

### Current chart-feed blocks

1. joins / attrition / net adds / cumulative net adds
   - uses helper columns `A`, `C`, `D`, `E`
   - 6-row rolling window from the current pointer

2. production actual vs target vs gap
   - uses helper columns `A`, `I`, `K`
   - important note:
     - the title says `Rolling 6-month`
     - the current formula uses `ptr-11`, which is a 12-row window
     - this is a real inconsistency

3. split actual vs target vs gap
   - uses helper columns `A`, `J`, `L`
   - correctly uses a 6-row rolling window

4. ASI rolling table
   - reads directly from `Data Entry - Agent Satisfaction`
   - current target comes from `$B$16`

5. OSI rolling table
   - reads directly from `Data Entry - Ops Cont Improvement`
   - current target comes from `$H$16`

### Rebuild meaning

- `AG:AK` does not introduce major new business logic
- the core logic is still the calculator at `A59:W`
- this chart-feed layer can be rebuilt later after the core engine model is rebuilt

## Still Open In This Packet

- validate the exact strategy-used community fields in `G:O`
- validate the exact BHAG year ladder meaning and whether every exposed row belongs in strategy closeout
- validate the strategy-used Owners slice explicitly, even though the Freedom-sheet engine already depends on it transitively
- continue cell-level confirmation with Steve so the approved business meaning is captured alongside the live formulas
