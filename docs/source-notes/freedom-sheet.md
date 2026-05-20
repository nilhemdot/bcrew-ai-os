# Freedom Sheet

Purpose: this is the system note for the Freedom Sheet. It explains what each tracked section owns, how the main strategy math is built, and where the current spreadsheet is using workarounds that should become cleaner system logic later.

## Promoted Operating Truths

Durable interpretation from this validation now lives in [Operating Truths](../strategy/operating-truths.md), and the rebuild target lives in [Freedom Rebuild Blueprint](../rebuild/freedom-rebuild-blueprint.md).

Use this note for evidence, current spreadsheet behavior, tab-level validation, and historical/process context. Do not make this note the final business-meaning layer.

Key promoted rules:

- Freedom is current strategy process map and spreadsheet-era planning logic, not final system-owned truth.
- The hidden Owners mirror is dependency context; Owners remains the deal / finance ledger.
- Ops self-validation fields are claims, not verified truth.
- Post-`2026-04-01` deal follow-through uses ClickUp `Deal Data Entry` plus FUB call/transcript evidence, not the old Freedom per-row review model alone.
- The rebuild needs separate source-owned layers for team member source, production roster source, community source, deal-ledger economics source, BHAG assumptions source, engine calculation layer, and dashboard read layer.

## Master Validation Rule

This note is the **master Freedom Sheet tab-by-tab validation**.

Use it to replace scattered Freedom validation notes over time.

Current mode for this pass:

- this is a **current-reality capture**
- it is **not** a rebuild execution pass
- the goal is to lock:
  - what exists now
  - how it works now
  - what each area means now
  - where the current truth comes from now
  - what is broken, duplicated, workaround-driven, or weak now
- only after that do we decide what should be rebuilt, replaced, or left alone

Meaning:

- the smaller Freedom source IDs still exist
- the system still tracks those source IDs separately
- but this note is the one place where the full workbook gets validated tab by tab and rebuilt mentally as one system

This is the rule going forward:

- do not create a second shallow Freedom note for the same tabs
- do not rely on chat memory
- do not redo the same validation work in a new format later

## Freedom Validation Path

### Level 1 — Pull and understand

Goal:

- connect to the sheet
- read the tabs
- map formulas
- trace dependencies
- understand the business meaning

Done at this level:

- we can explain how the sheet works
- we know the source paths
- we know the spreadsheet workarounds

### Level 2 — Rebuild clean source-of-truth layers

Goal:

- split the spreadsheet into cleaner system-owned layers
- remove duplicate logic and hidden workarounds
- stop treating dashboard cells as the source of truth

Target layers:

1. team member source
2. production roster source
3. community source
4. deal-ledger economics source
5. BHAG assumptions source
6. engine calculation layer
7. dashboard read layer

Done at this level:

- the system owns the clean logic
- the spreadsheet is no longer the only place where truth can be understood

### Level 3 — Replace the spreadsheet layer

Goal:

- replace spreadsheet-driven calculation and dashboard logic where it makes sense
- keep only the parts that still deserve to stay manual

Done at this level:

- the system can reproduce the important outputs without depending on spreadsheet dashboard formulas
- spreadsheet dependency becomes optional or narrow

## Freedom Sheet Overview

- workbook: `📊 Benson Crew - Freedom Sheet`
- workbook id: `1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw`
- role in system:
  - live strategy-input workbook
  - roster and community tracker
  - BHAG planning model
  - Agent Engine calculator and dashboard

Important dependency:

- the hidden Freedom-sheet tab `ADMIN ONLY - Deal Data Entry` is an `IMPORTRANGE`
- it mirrors the separate Owners workbook:
  - workbook id: `18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk`
  - range: `'ADMIN ONLY - Deal Data Entry'!A1:BZ`
- this means the Freedom Sheet already depends on the Owners deal ledger for production and split math

## Tracked Sections

These source IDs roll up under the master Freedom validation:

- `SRC-FREEDOM-TEAM-001`
- `SRC-FREEDOM-COMMUNITY-001`
- `SRC-FREEDOM-COMMUNITY-REV-001`
- `SRC-FREEDOM-ENGINE-001`
- `SRC-FREEDOM-BHAG-001`

Global source-contract state: these five Freedom units are `Signed Off For Current Reality`. That means the cell/block/formula meaning is accepted for current strategy use. It does not mean the workbook has been rebuilt into the final freshness-managed source-of-truth layer.

## DATA-001 Source Adapter Boundary

`DATA-001` owns the current read-only Freedom Sheet source adapter and schema-drift monitor. The adapter maps the five Freedom source ID rows above to their live workbook tabs/ranges, then uses delegated Google Sheets structure checks to prove the expected headers and sheet IDs still match the current baseline.

This is a source ID and schema-drift monitor, not a rebuilt source system. It may read approved Freedom structure through the existing `/api/sheets/structure-status` data-health surface, but it must not mutate the spreadsheet, Drive permissions, ClickUp, FUB, finance ledgers, credentials, OAuth scopes, or provider config.

If a Freedom header/range/sheet ID drifts, the adapter must fail closed with the affected source ID, owner, and next action instead of silently accepting stale cell references or hardcoding live values.

## Current Tab-By-Tab State

| Tab / Surface | Current state | What is true right now | Next closeout step |
| --- | --- | --- | --- |
| `Data Entry - BCrew Team/Community` | Done for meaning | root roster, community, revenue blocks, and rebuild caveats are locked | use as the current process map until the roster/community rebuild separates membership, production roster, and cleaner source ownership |
| `Benson Crew Bhag Builder` | Done for meaning | live assumption blocks, target ladders, and rebuild caveats are locked | use as the current planning builder until the clean planning layer replaces it |
| `Agent Engine` | Done for meaning | top dashboard, calculator structure, helper layers, and rebuild caveats are locked | use as the current read layer until the clean engine calculation layer replaces it |
| `Data Entry - Agent Satisfaction` | Done | source meaning, ownership, cadence rules, and rebuild direction are locked | use as the temporary live source until the Culture Hub rebuild |
| `Agent Satisfaction` | Done | dashboard logic is understood, source linkage is clear, and the known gap bug was fixed | leave as-is until the Culture Hub replaces it |
| `Data Entry - Ops Cont Improvement` | Done for meaning | master monthly ops rollup structure, source map, formula intent, and repair caveats are locked | use as the current process map; remaining work is trust repair, not meaning discovery |
| `Ops Satisfaction` | Done for meaning | dashboard layout, source linkage, target blocks, and trust caveats are locked | use as the current read layer; remaining work is trust repair, not meaning discovery |
| `Data Entry - Client Onboarding` | Done | onboarding fields, bonus logic, and finance-reconciliation boundary are locked | use as the temporary live source until the ops rebuild replaces it |
| `Data Entry - Clients, Deals, NPS & GReviews` | Done for meaning | full column map, bonus structure, payout fields, and self-validation risk are locked | use this as the current process map, not the final trusted bonus system |
| `Data Entry - Agent Onboarding` | Done for meaning | intake, survey, local bonus logic, and payout fields are locked | use as the current process map, not a trusted scoring or bonus-control system |
| `Bonus System` | Done for meaning | lookup tables are mapped and live-vs-legacy patterns are understood | use as the current lookup reference, not the final governed bonus model |
| `BenCrew Marketing` | Mapped for architecture | current team-performance KPI layout and old-system parity are documented | use `docs/source-notes/freedom-marketing.md` to define future pillar-owned source contracts before any rebuild |
| `SZ Marketing` | Mapped for architecture | personal-brand, MarketMasters, recruiting, and remarketing intent are documented | use `docs/source-notes/freedom-marketing.md` to define the Steve / MarketMasters source map before any rebuild |
| hidden `ADMIN ONLY - Deal Data Entry` mirror | Dependency understood | Freedom uses an `IMPORTRANGE` mirror of the Owners ledger | keep this as dependency context, not a separate Freedom-owned truth layer |

### Freedom Closeout Read

Blunt read:

- the tracked Freedom workbook tabs are closed for meaning
- we do not need another discovery pass just to understand what those tabs do
- what remains is not workbook-meaning discovery
- what remains is:
  - future rebuild design
  - trust repair where operators are not maintaining a surface well
  - cleaner source-of-truth replacement later
  - connector and system implementation later

Important distinction:

- `done for meaning` does **not** mean:
  - final rebuilt source contract exists
  - the business process is healthy
  - the future system has replaced the spreadsheet
- it **does** mean:
  - the current business logic and spreadsheet role are documented deeply enough that we should not need to redo this walkthrough

## Marketing Tabs

The two remaining visible marketing tabs now have a dedicated companion note:

- [docs/source-notes/freedom-marketing.md](/Users/bensoncrew/bcrew-ai-os/docs/source-notes/freedom-marketing.md)

Use that note for:

- the old-system performance model
- the current `BenCrew Marketing` and `SZ Marketing` tab roles
- the future source map by brand and pillar

Important rule:

- do not rebuild those tabs by copying spreadsheet cells
- rebuild them from the brand boundary plus the pillar/source map

### Data Entry - Agent Satisfaction

Source role:

- this is the real source tab
- the `Agent Satisfaction` tab is a dashboard built on top of it

Row model:

- `A` = survey / culture cycle month
- rows should only be populated when something actually happened in that cycle:
  - a survey went out
  - a town hall happened
  - a relevant culture / engagement event happened
- this is not meant to fake perfect monthly data when nothing happened

Current intent:

- use the sheet as a usable starting point now
- let cadence change over time without breaking the system

Field truth locked so far:

- `B` = total active producing agents for that cycle
  - do not count non-producing or leadership / support people just because they exist in the org
- `C` = total survey responses from that producing-agent group
- `D` = survey engagement rate
- `E` = number of town halls held in that cycle
  - this was at one point running every two weeks, so it is a count, not just a yes/no
- `F` = total active producing agents eligible for those town halls
- `G` = total attended from that producing-agent group
- `H` = town-hall engagement rate
- `J:O` = scored monthly pillar outputs
  - overall score plus category scores
- `P:R` = qualitative summary layer
  - intended future-state meaning:
    - these should come from internal AI analysis of the survey answers / comments
    - they should not stay dependent on a human manually writing the summary forever

Future system rule:

- the retention / culture system should become event-driven
- when a new survey is sent, a town hall is held, or a culture event happens, the system should ingest that activity directly and update the dashboard layer from those events instead of relying on a founder to keep spreadsheet logic in sync
- survey schema drift is expected
  - surveys are not always the same
  - the rebuild must tolerate changing question sets and different survey shapes over time instead of assuming one permanent fixed form

Raw-source note locked:

- a real January culture survey source was checked
  - Google Drive folder: `1kHiNSqlvUoVhK8RpA4jH9XY_ToFo5a97`
  - current takeaway:
    - the Satisfaction layer is grounded in real survey exports, not invented dashboard math
    - survey schemas change over time, so the future Culture Hub must tolerate schema drift instead of assuming one fixed survey template forever

### Agent Satisfaction

Dashboard role:

- this is the read layer built on top of `Data Entry - Agent Satisfaction`
- it is not the source of truth

What is locked:

- `B2:E5`
  - hardcoded targets and latest actual / gap block
- `G2:L5`
  - latest pillar-score actual / target / gap block
- charts below
  - visual read layer only
- `Z:AO`
  - helper / chart-feed layer for rolling tables and dashboard context

Final validation result:

- source linkage is clear
- one real bug was fixed in the top town-hall gap calculation
- pillar logic is valid
- helper / chart-feed area is useful for charts but not a core truth layer
- good enough to leave in place until the Culture Hub rebuild replaces it

### Data Entry - Ops Cont Improvement

Source role:

- this is the master monthly rollup for the ops side of the Freedom workbook
- `Ops Satisfaction` reads from this tab
- it combines three pillars:
  - client onboarding
  - transaction management
  - agent onboarding

Current structure:

- `A:B`
  - month and overall ops score
- `D:I`
  - client-onboarding counts, capture rate, and average onboarding score
- `K:S`
  - transaction-management counts, capture rates, NPS score, and Google-review counts
- `U:X`
  - agent-onboarding counts, capture rate, and average onboarding score
- `Z:AB`
  - qualitative monthly notes

Locked formula meaning:

- `B` = overall score
  - current formula is `AVERAGE(I, N, X)`
- onboarding metrics aggregate from `Data Entry - Client Onboarding`
- transaction-management metrics aggregate from `Data Entry - Clients, Deals, NPS & GReviews`
- agent-onboarding metrics aggregate from `Data Entry - Agent Onboarding`

Locked source map:

- `D`
  - clients signed by reporting month
  - source: `Data Entry - Client Onboarding!A`
- `E`
  - buyers by reporting month
  - source: `Data Entry - Client Onboarding!G = Buyer`
- `F`
  - sellers by reporting month
  - source: `Data Entry - Client Onboarding!G = Seller`
- `G`
  - agent onboarding scores captured for client onboarding
  - source: `Data Entry - Client Onboarding!H = Yes`
- `H`
  - onboarding capture rate
  - formula: `G / D`
- `I`
  - average onboarding score from agents
  - source: `Data Entry - Client Onboarding!K`
- `K`
  - executed deal credit by reporting month
  - source: hidden `ADMIN ONLY - Deal Data Entry!G` + `AI`
- `L`
  - deals with ops survey captured
  - source: `Data Entry - Clients, Deals, NPS & GReviews!I = Yes`
- `M`
  - transaction capture rate
  - formula: `L / K`
- `N`
  - average closing score from agents
  - source: `Data Entry - Clients, Deals, NPS & GReviews!L`
- `O`
  - NPS captured count
  - source: `Data Entry - Clients, Deals, NPS & GReviews!N = Yes`
- `P`
  - NPS capture rate
  - formula: `O / K`
- `Q`
  - average score out of `10`
  - source: `Data Entry - Clients, Deals, NPS & GReviews!O` where `N = Yes`
- `R`
  - Google reviews captured
  - source: `Data Entry - Clients, Deals, NPS & GReviews!R`
- `S`
  - Google review capture rate
  - formula: `R / K`
- `U`
  - agents onboarded by reporting month
  - source: `Data Entry - Agent Onboarding!A` with nonblank agent rows
- `V`
  - agent onboarding surveys captured
  - source: `Data Entry - Agent Onboarding!E = Yes`
- `W`
  - agent onboarding capture rate
  - formula: `V / U`
- `X`
  - average agent-onboarding score
  - source: `Data Entry - Agent Onboarding!H`

Broken now:

- the transaction-management chain still contains a dead reference to a removed tab:
  - `NPS Scores & Reviews`
- that dead reference is causing live `#REF!` behavior in the monthly rollup
- the monthly rollup also contains future / scaffold rows with zeros, so the latest-row logic can quietly report fake current-state values if the source rows are not governed carefully

Live repair completed on `2026-04-18`:

- `K` (`Deals Executed`) was repaired
- the dead `NPS Scores & Reviews` spill at `K10` was replaced with an Owners-backed month rollup from:
  - hidden `ADMIN ONLY - Deal Data Entry`
  - executed-date column `G`
  - deal-credit column `AI`
- current practical meaning:
- `K` now rolls up monthly executed deal credit from the Admin ledger instead of depending on whether ops logged the deal in their own tracking tab
- `Q` (`Company NPS Score`) was repaired
  - old logic was not producing the intended monthly score result
  - current logic now calculates the monthly average score out of `10` from `Data Entry - Clients, Deals, NPS & GReviews` using:
    - `N` = NPS received must be `Yes`
    - `O` = numeric NPS score
  - blank months now stay blank instead of pretending to have a neutral or broken score

OPS-003 closeout boundary (`ops-003-ops-improvement-rollup-v1`):

- the governed proof now checks the live formulas for:
  - no remaining `NPS Scores & Reviews` formula references in the watched OPS rollup/read-layer ranges
  - `K10` using the Owners-backed Admin Deal Data Entry month rollup
  - `Q4` using `Data Entry - Clients, Deals, NPS & GReviews` NPS received / score rows
  - `Ops Satisfaction` latest actuals using nonblank latest-row queries instead of blindly trusting scaffold rows
  - `Ops Satisfaction!F5` subtracting the agent-onboarding capture target `F4`, not the signed-client target `D4`
- this is a bounded formula/source-path repair, not the final rebuilt Ops bonus or client-experience source system

Meaning closeout result:

- the source architecture is clear
- the row groups and feeder tabs are clear
- the tab meaning is locked deeply enough that this walkthrough does not need to be redone
- what remains open is operational trust:
  - rollup repair
  - month-row / latest-row governance
  - downstream dashboard trust

### Ops Satisfaction

Dashboard role:

- this is the read layer built on top of `Data Entry - Ops Cont Improvement`
- it is not the source of truth

What it is trying to show:

- last-month OSI
- last-month capture rates for:
  - signed clients
  - closed deals
  - agent onboarding
- last-month pillar scores for:
  - client onboarding
  - transaction management
  - agent onboarding

Current issues:

- latest actuals are pulled with `QUERY(... order by Col1 desc limit 1)`
- because the master rollup contains zero / scaffold rows, the top dashboard can show `0` or `#N/A` even when that is not the real operating answer
- one top-gap formula is wrong:
  - the agent-onboarding capture gap currently subtracts the signed-client target cell instead of its own target cell

Meaning closeout result:

- dashboard intent is clear
- source linkage is clear
- the dashboard meaning is locked deeply enough that this walkthrough does not need to be redone
- what remains open is operational trust:
  - latest-row trust
  - scaffold-row contamination risk
  - one wrong top-gap formula

### Data Entry - Client Onboarding

Source role:

- row-by-row intake log for client onboarding
- feeds the onboarding pillar inside `Data Entry - Ops Cont Improvement`

Current field groups:

- intake:
  - onboarding date
  - month
  - year
  - client name
  - agent name
  - address
  - buy / sell
- ops-survey block:
  - survey complete
  - survey notes
  - survey notes entered
  - ops score
- media block:
  - media shoot
  - survey complete
  - survey notes
  - survey notes entered
  - media score
- bonus block:
  - bonus total
  - running bonus total
  - bonus paid out
  - payout date
  - quality bonus total
  - shoots this year
  - quantity bonus total
  - media running bonus total
  - media bonus paid out
  - media payout date

Locked bonus logic:

- ops bonus currently pays only when:
  - agent survey is complete
  - survey notes are entered
  - ops score is present
- the lookup comes from the `Bonus System` ops-team table
- there is also still a media-bonus path in this tab
  - this looks obsolete given Steve's current operating model

Finance-reconciliation boundary:

- this tab tracks what the spreadsheet says was earned
- the local `Bonus Paid Out` and `Payout Date` columns are tracking fields, not finance truth
- actual paid-truth should reconcile against Owners finance:
  - `(Input) Weekly Actuals`
    - `Team | VA Team | Bonus Pool`
    - this is the best current finance check for ops bonus payout timing
  - `(Input) Weekly Actuals`
    - `Team | Canadian Team | Media Team Bonus`
    - this is the best current finance check for media bonus payout timing if that program is still live
  - `Monthly Actuals (Roll Up)`
    - monthly rollup layer only
    - useful for monthly aggregation checks, not exact payout timing

Validation result so far:

- onboarding source shape is clear
- ops bonus path is clear
- media logic is likely legacy and should not be treated as durable truth without explicit reconfirmation
- finance match path is now clear:
  - sheet-side earned bonus here
  - weekly actuals for paid truth
  - monthly actuals for rollup
- important tooling limitation:
  - the default Google Sheets read path used in the rebuild reads values and formulas
  - a richer reader path is now available in repo code for:
    - cell notes via Sheets grid metadata
    - spreadsheet comments via Drive comments
  - practical rule:
    - do not assume notes/comments are present in the default read
    - call the richer Google reader explicitly when a source relies on notes/comments for meaning

### Data Entry - Clients, Deals, NPS & GReviews

Source role:

- row-by-row deal and post-close accountability log
- feeds the transaction-management pillar inside `Data Entry - Ops Cont Improvement`

2026-04-25 policy update:

- Clare reported that deal survey / review follow-through moved away from this Freedom tab after Carson changed the survey process.
- The Q2 2026 `Quarterly Ops Excellence Bonus Program` PDF confirms the live bonus model is now quarterly:
  - Component 1: agent quality calls, recorded/transcribed in Follow Up Boss
  - Component 2: system-improvement projects documented in ClickUp
  - Component 3: deal data accuracy across Owners Dashboard, FUB lead source, and QuickBooks reconciliation
  - Component 4: client-experience capture rate for eligible transactions
- The old per-row Freedom NPS / Google-review bonus columns remain useful historical/process context.
- For deals executed on or after `2026-04-01`, do not treat a missing Freedom row as a deal-row failure by itself.
- New live tracking source: ClickUp `Deal Data Entry` list `901112153939` plus FUB call/transcript evidence.
- Admin review now enforces post-policy follow-through against ClickUp by Trade Number instead of the old Freedom review row. Missing ClickUp joins, incomplete internal survey statuses, incomplete NPS / Google review statuses, and missing FUB outreach evidence are allowed to create `Needs Fixing` findings after the firm + 10-day gate.

Current field groups:

- deal intake:
  - executed date
  - month
  - year
  - trade number
  - client name
  - agent name
  - address
  - buy / sell
- ops-survey block:
  - survey complete
  - survey notes
  - survey notes entered
  - ops score
- NPS block:
  - NPS score received
  - score
  - survey notes entered
- Google-review block:
  - reviews captured
  - review links
- Owners data-quality block:
  - 100 percent record completion
  - validated
  - deal data 100 percent
- bonus block:
  - firm to close
  - NPS
  - Google review
  - running bonus total
  - bonus paid out
  - payout date

Spacer columns:

- `M`
- `Q`
- `T`
- `W`
- `AB`
- `AD`

Locked bonus logic:

- firm-to-close bonus depends on:
  - buy / sell
  - ops score
  - survey completion
  - survey notes entered
- NPS bonus triggers when NPS is received
- Google-review bonus multiplies by review count
- deal-data bonus pays only when the Owners record is marked complete and validated
- current spreadsheet meaning by column:
  - `R` = Google reviews captured
  - `S` = review links
  - `U` = ops-entered claim that the Owners Admin row is 100 percent complete
  - `V` = ops-entered validation flag
  - `X` = deal-data bonus
  - `Y` = firm-to-close bonus
  - `Z` = NPS bonus
  - `AA` = Google-review bonus
  - `AC` = running bonus total
  - `AE` = bonus paid out
  - `AF` = payout date
- rebuild direction:
  - Steve explicitly wants the system to take validation power away from ops here
  - future-state deal-data bonus should be driven by a system-owned validation agent / rule set,
    not self-validated spreadsheet fields

Important caution:

- Steve explicitly does not trust the current `100% Record Completion` field as a durable truth signal
- treat that field as claimed accountability, not verified accountability, until the rebuild replaces it with stricter source checks
- broader trust issue:
  - this whole bonus structure is still spreadsheet self-validation
  - ops is entering the source events, the survey / review capture state, and the bonus-driving completion fields
  - that means the sheet is useful for current operating understanding, but not trustworthy enough to act as the final controlled bonus-validation system
- future-state rule:
  - use this tab to understand the current process
  - do not preserve the self-validation model in the rebuild
  - move final validation and payout-trigger logic into system-owned checks tied to real source events and finance reconciliation

Observed live profile during edge-to-edge pass:

- `117` active populated rows observed in the current live block
- `66` rows currently have a trade number
- `89` rows currently mark ops survey complete
- `81` rows currently have an ops score bonus value
- `108` rows currently carry an NPS received state
- `44` rows currently have a numeric NPS score
- `22` rows currently record at least one Google review captured
- `77` rows currently use the Owners completeness / validated pair
- `52` rows currently earn the deal-data bonus
- `43` rows currently earn the NPS bonus
- `22` rows currently earn the Google-review bonus
- `AC` running total is populated and active
- `AE` / `AF` payout fields currently appear unused in the live sampled rows

Meaning closeout result:

- edge-to-edge column structure is now locked
- the current process is understood end to end
- this tab is good enough as the current-process map
- it is not good enough to be the final trusted bonus-validation system without system-owned checks

### Data Entry - Agent Onboarding

Source role:

- row-by-row agent-onboarding survey log
- feeds the agent-onboarding pillar inside `Data Entry - Ops Cont Improvement`

Current field groups:

- onboarding date
- month
- year
- agent name
- survey complete
- survey notes
- survey notes entered
- onboarding score
- bonus
- running bonus total
- bonus paid out
- payout date

Locked bonus logic:

- this tab does not read from the central `Bonus System` sheet
- it uses a local lookup table at the top of the sheet
- bonus only pays when:
  - survey complete = yes
  - survey notes entered = yes
  - onboarding score is present

Validation result:

- this is the simplest ops feeder tab
- it is structurally clear
- it is live for intake tracking
- it is weak / mostly unused for scoring and bonus execution
- the local-only bonus lookup is another sign that the ops bonus model is duplicated instead of governed from one place

### Bonus System

Source role:

- static lookup sheet for multiple bonus programs used by the ops feeder tabs

Programs found:

- agent onboarding
- transaction management conditional-to-close
- NPS and Google review
- Owners deal-record completion
- media team
- ops team

Exact block map:

- `A1:B5` = `Bonus Program Agent Onboarding`
  - score ladder:
    - `8 -> 0`
    - `9 -> 15`
    - `10 -> 30`
- `D1:F5` = `Bonus Program Transaction Management - Conditional To Close`
  - buyer ladder:
    - `8 -> 10`
    - `9 -> 15`
    - `10 -> 30`
  - seller ladder:
    - `8 -> 10`
    - `9 -> 15`
    - `10 -> 30`
- `H1:I4` = `NPS and Google Review`
  - `NPS -> 10`
  - `Google Review -> 10`
- `K1:L3` = `Owner Dash Deal Record Complete`
  - `Deal 100% Complete -> 10`
- `A8:E12` = `Bonus Program Media Team`
  - quality-by-score ladder:
    - `8 -> 0`
    - `9 -> 10`
    - `10 -> 20`
  - quantity / volume ladder:
    - `500-1000 -> 30`
    - `1001-2000 -> 60`
    - `2001+ -> 90`
- `A14:C18` = `Bonus Program Ops Team`
  - buyer ladder:
    - `8 -> 0`
    - `9 -> 10`
    - `10 -> 20`
  - seller ladder:
    - `8 -> 10`
    - `9 -> 15`
    - `10 -> 30`

Exact feeder usage confirmed from formulas:

- `Data Entry - Client Onboarding!R`
  - uses `VLOOKUP(..., 'Bonus System'!$A$16:$C$18, ...)`
  - practical meaning:
    - client-onboarding ops bonus reads from the `Ops Team` block
    - buyer uses column `B`
    - seller uses column `C`
- `Data Entry - Client Onboarding!W`
  - uses `VLOOKUP(P, 'Bonus System'!$A$10:$B$12, 2, FALSE)`
  - practical meaning:
    - media quality bonus reads from the `Media Team` score ladder
- `Data Entry - Client Onboarding!Y`
  - uses `LOOKUP(X, 'Bonus System'!$C$10:$C$12, 'Bonus System'!$E$10:$E$12)`
  - practical meaning:
    - media quantity bonus reads from the `Media Team` volume ladder
- `Data Entry - Clients, Deals, NPS & GReviews!X`
  - uses `'Bonus System'!L3`
  - practical meaning:
    - Owners deal-record-complete bonus is a flat `10`
- `Data Entry - Clients, Deals, NPS & GReviews!Y`
  - uses `VLOOKUP(..., 'Bonus System'!$D$3:$F$5, ...)`
  - practical meaning:
    - firm-to-close / transaction-management bonus reads from the `Transaction Management` block
    - buyer uses column `E`
    - seller uses column `F`
- `Data Entry - Clients, Deals, NPS & GReviews!Z`
  - uses `VLOOKUP("NPS", 'Bonus System'!$H$2:$I$4, 2, FALSE)`
  - practical meaning:
    - NPS bonus is a flat `10`
- `Data Entry - Clients, Deals, NPS & GReviews!AA`
  - uses `R * 'Bonus System'!$I$4`
  - practical meaning:
    - Google-review bonus is `10` per captured review
- `Data Entry - Agent Onboarding`
  - does **not** currently read the central `Bonus System` tab
  - it uses a local lookup at `$E$2:$F$4`
  - practical meaning:
    - the central `Agent Onboarding` block appears to be the intended governed rule, but not the currently wired rule

What is true right now:

- the lookup tables are readable
- the transaction-management and ops-team lookups are still live in formulas
- the media-team block appears to be legacy
- the agent-onboarding bonus is duplicated because that feeder tab uses its own local lookup instead of this sheet
- practical usage read from the feeder tabs:
  - client onboarding currently has `52` rows with earned bonus values
  - deals / NPS / reviews currently have `81` firm-to-close bonus rows, `43` NPS bonus rows, and `22` Google-review bonus rows
  - payout tracking is effectively dead in those source tabs right now
  - agent-onboarding bonus usage is effectively zero in the current live rows

Meaning closeout result:

- the lookup layer is understood well enough for future rebuild work
- some blocks are clearly live
- some blocks are clearly duplicated
- some blocks are likely legacy or mislabeled
- this is good enough as the current lookup reference, but not as the final governed bonus model

Rebuild meaning:

- do not rebuild the bonus layer by copying this spreadsheet blindly
- first decide the real live incentives
- then move them into one governed bonus model tied to the source events that matter

## Checkpoint — 2026-04-18

This is the explicit checkpoint so this work does not need to be redone.

### Locked deeply now

- workbook structure and tracked tabs
- hidden Owners `IMPORTRANGE` dependency
- BHAG assumption blocks and year ladders
- Team / Community source structure
- agent-satisfaction source and dashboard
- ops-improvement source chain, formula meaning, and dashboard dependency
- ops-satisfaction source chain and dashboard intent
- Agent Engine top dashboard meaning for:
  - `B3:B7`
  - `E3:E6`
  - `H3:H6`
  - `K3:K6`
  - `N3:N6`
  - `R1:R4` intent
- Agent Engine calculator structure:
  - `A:E` roster mechanics
  - `F:N` economics and performance
  - `O:W` target ladder and required pace math
- context-helper role of `Z2:AD2`
- chart-feed role of `AG:AK`
- client-onboarding source shape, bonus path, and finance-reconciliation boundary
- deals / NPS / Google-review accountability tab edge-to-edge meaning
- agent-onboarding intake, scoring, and payout structure
- bonus-system lookup-sheet role, live blocks, duplicated logic, and legacy paths

### What "deeply locked" means here

For any tab listed above as done or done for meaning, this note now captures:

- the tab's source role versus dashboard role
- the block / column structure
- the important formula meaning
- the upstream feeder tabs or external source dependencies
- the operating meaning Steve clarified beyond the formulas
- the rebuild caveats so this does not need to be rediscovered later

### Important spreadsheet truths found

- active production roster is currently enforced by `end date`, not by the `Status` column
- team membership and counted production roster are not the same thing and must be separated in the rebuild
- the Freedom Sheet already depends on the Owners ledger for economics through a hidden spreadsheet mirror
- the chart layer is not the source of truth
- some helper metrics are rough and should not be mistaken for the core engine
- the ops rollup is real architecture, but not yet trustworthy because it still contains a dead sheet dependency and scaffold-row contamination risk
- the ops bonus model is duplicated across feeder tabs and a static lookup sheet
- some bonus logic is likely legacy, especially the media path

### Backlog captured from this validation

- `SOURCE-014`
  - close the strategy live-input boundary
- `DATA-001`
  - Freedom adapter and schema-drift monitoring
- `ENGINE-002`
  - separate team membership from counted production roster
- `DATA-021`
  - replace the hidden Owners mirror with direct ledger dependency
- `ENGINE-003`
  - align chart-feed windows and labels
- `ENGINE-004`
  - remove hardcoded split assumptions from annual-agent earnings helper metrics
- `OPS-003`
  - repair the ops-improvement rollup and remove the dead `NPS Scores & Reviews` dependency
- `OPS-004`
  - collapse duplicated ops bonus rules and retire dead media logic

### Still open in this validation

- `Ops Satisfaction`
  - re-check the dashboard only after the rollup is fully trustworthy
- ops rollup trust repair
  - remove remaining trust issues from the already-mapped `Data Entry - Ops Cont Improvement` chain
  - lock the month-row / latest-row governance so current-state reads cannot drift
- marketing tabs and any other untouched Freedom surfaces
  - not part of this closed set yet

### Data Entry - BCrew Team/Community

System source IDs:

- `SRC-FREEDOM-TEAM-001`
- `SRC-FREEDOM-COMMUNITY-001`
- `SRC-FREEDOM-COMMUNITY-REV-001`

Main blocks:

- `A:E`
  - team roster history
  - true manual input block
- `G:O`
  - community tracker
  - mixed block: month spine + manual counts + derived totals
- `P:U`
  - community revenue by leader
  - mixed block: manual owner revenue + derived Bcrew subtotal

Current live profile:

- `A:E`
  - `61` roster rows
  - status values now:
    - `37` active
    - `15` departed
    - `9` non producing
  - all `61` rows have a start date
  - `37` rows have blank end dates
  - `24` rows have an end date
- `G:U`
  - monthly spine runs from `August 2025` to `December 2028`
  - only the first `9` monthly rows currently carry live community counts and revenue
  - later rows are scaffold rows already present in the sheet with zero / blank future values

Column truth:

- `A:E`
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
- `G:O`
  - `G` = month
  - `H` = year
  - `I` = total income
    - formula: `SUM(P:T)`
    - this is total downline / community revenue generated together
    - it is an interesting gross number, not the true company-kept number
  - `J` = total community
    - formula: `SUM(K:O)`
    - this is the real progress number against the `10k` community target
  - `K:O` = leader-level community counts
- `P:U`
  - `P:T` = leader-level community revenue
  - `U` = `Bcrew In Before HST`
    - formula: `SUM(Q:T) / 1.13`
    - this is the finance-relevant company number before HST

Downstream use right now:

- `A:E` is the block the Agent Engine actually reads for:
  - active headcount
  - monthly joins
  - monthly attrition
- `G:O` is the community pace tracker
- `P:U` is the community revenue layer
- the community and revenue blocks are not the same thing as the core Agent Engine roster calculator

Important validation note:

- `E` is currently doing two jobs:
  - real end-date tracking
  - temporary production-roster filtering workaround
- rebuild target later:
  - separate true membership state from counted production-roster state
- `U` excludes column `P` by formula
- that may be intentional, but it should be treated as explicit meaning to confirm, not hidden spreadsheet magic
- current revenue-share meaning behind `P:T`:
  - `P` = Scott revenue share
    - Scott keeps the first `$256k` of his revenue share, then the rest goes `100%` to the company
  - `Q` = Steve revenue share
    - `80%` company / `20%` Steve
  - `R:S:T` = Ryan, Blake, Nick revenue share
    - `100%` to the company
- practical read:
  - `I` is a gross generated-community-revenue stat
  - `U` is the number that matters to company finance
- complementary source candidate later:
  - ClickUp `Agent Roster` list `901113292355`
  - old-system source map treated it as the roster-status / onboarding layer
  - current adjacent ClickUp ops surfaces Steve flagged:
    - `Agent Onboarding` list `901113487352`
    - `Culture` space / folder `90117028331`
  - old-system agents using it included `Agent Roster`, `Onboarding Monitor`, `Process Enforcer`, and `Carson Assist`
  - ClickUp carried statuses like `active`, `non-producing`, `recruiting`, and `onboarding`
  - Freedom carried recruiter/origin and date logic
  - result: ClickUp looks like the right future operational roster source, but not a full Agent Engine replacement by itself unless recruiter/date truth also becomes complete there
- tracked follow-through:
  - `SOURCE-004` should decide whether ClickUp becomes the primary roster system later or remains a complementary source
  - `SOURCE-015` should test whether the Real Broker API can become a stronger direct source for:
    - cap status
    - commission history
    - closed transactions
    - downline / network data
  - strategic use case:
    - identify the strongest builders across the combined ownership-group network instead of using the API only for simple reporting

Important current reality:

- the Agent Engine currently relies on `start date` and `end date` to determine active roster
- it does **not** currently use the `Status` column as the active/inactive filter
- that works today because end dates are being used as a workaround
- broader ops reality now visible:
  - ClickUp appears to be where the team is managing:
    - roster state
    - agent onboarding workflow
    - culture work
  - Owners appears to be where executed deal truth lives
  - Freedom is currently stitching those worlds together for dashboarding, not owning the clean operational truth itself

Rebuild rule later:

- team membership status and counted production-roster status should be separate

### Benson Crew Bhag Builder

System source ID:

- `SRC-FREEDOM-BHAG-001`

Role:

- holds the long-range target ladder
- holds the live planning assumptions used by the Agent Engine

Important blocks:

- `A1:C31`
  - high-level goal and assumption blocks
- `A22:B31`
  - agent assumption block
- `J:N`
  - year ladder for team targets and required agents
- `K20:M29`
  - community target ladder

Current shape:

- this tab is mostly a strategy builder, not an external source sync
- manual assumptions and target ladders sit in the sheet
- formulas then derive the planning path from those assumptions
- it is a builder that can later be replaced by a cleaner app-owned planning layer

Secondary helper blocks worth keeping:

- `D5:G8`
  - pace-breakdown helper block
  - converts total deals required and total five-star experiences into year / month / week / day pace
  - useful for understanding operating intensity
  - not a primary source-of-truth block
- `D23:G34`
  - secondary annualized helper stats
  - converts the full 10-year goal into average annual scale, split-adjusted team averages, and implied agent count
  - useful planning support, but still helper math built from the core assumptions in column `B`
- `I:U` first annual ladder block
  - primary annual BHAG output ladder for team sales targets
  - worth keeping as a real planning-output block
  - current column meanings:
    - `Year`
    - `Sales Target`
    - `Growth`
    - `Left to Accomplish Target`
    - `Agents Required Based on Assumptions`
    - `Transactions`
    - `80% 5 Star`
    - `GCI`
    - `Net to Team`
    - `Burn`
    - `Profit`
  - formula cleanup completed on `2026-04-18`:
    - transactions now points to `B17`
    - five-star now points to `B19`
    - GCI now points to `B10`
    - net-to-team now points to `B12`
    - duplicate split helper cells now stay aligned through `B25 = B12` and `E26 = B12`
  - interpretation:
    - this is a real yearly planning view
    - the only notable hardcoded planning block left here is burn

Manual vs derived:

- primary manual inputs:
  - `B3`
  - `B4`
  - `B10`
  - `B12`
  - `B17`
  - `B19`
  - `B23`
  - `B25`
  - `B31`
  - year-ladder growth assumptions in column `L`
  - community-ladder growth assumptions in column `L`
- primary derived outputs:
  - `B5:B13`
  - `B18:B20`
  - `B24`
  - `B26:B30`
  - sales target ladder in `K:M`
  - agent requirement ladder in `N`
  - community target ladder in `K:M`

Key live assumption cells used by the Agent Engine:

- `B3` = `Start Date`
- `B4` = `End Date`
- `B5:B8` = planning-breakdown helpers for the total goal period
  - years / months / weeks / days are used to break total goals down across those units, not just as cosmetic display fields
- `B9` = total accumulated sales target for the full 10-year path
  - this rolls up the yearly sales targets from `K4:K13`
  - it is the full-period sales target, not a one-year target
- `B10` = commission-average target
  - this is the commission-rate assumption applied to `B9`
- `B11` = total GCI goal
  - derived from total sales goal and commission-average target
- `B12` = split target
  - used to determine how much of the total GCI goes to the company side vs the agent side
- `B13` = total net-to-company goal
  - the company-money outcome produced by the sales, commission, and split assumptions above
- `B17` = average sale-price assumption
  - current planning assumption is `$750k`
- `B18` = total deals required
  - derived from the total sales target and average sale-price assumption
- `B19` = five-star-experience-rate assumption
  - current planning assumption is `80%`
  - this is the share of deals that should reach an `8+` NPS outcome
- `B20` = total five-star experiences required
  - derived from total deals required and the five-star-experience-rate assumption
  - practical meaning: how many `8+` NPS outcomes the business needs across the full goal period
- `A22` = start of the `Agent Stack` section
  - this block is the per-agent planning model
- `B23` = `GCI / Agent Average`
  - target annual GCI per agent
  - this is a planning number, not a live actual
- `B24` = `Split To Agent`
  - target split to the agent
- `B25` = `Split to Team`
  - target split to the team
- `B26` = `Total To Agent`
  - derived net amount to the agent from the target GCI and split assumptions
- `B27` = `Total Net to Team`
  - derived net amount to the team from the target GCI and split assumptions
- `B28` = `Agent Commission Average`
  - target commission average per agent
- `B29` = `Agent Annual Volume Average`
  - target annual volume per agent
  - current planning read is about `$6M`
- `B30` = `Agent Average Monthly GCI`
  - monthly GCI expectation per agent
  - current planning read is about `$10k` per month
- `B31` = `Planning Attrition Assumption`
  - current planning assumption is `15%`

Downstream use right now:

- `Agent Engine!A59`
  - reads `B3` and `B4` to define the planning month spine
- `Agent Engine!B3`
  - reads `B31` for planning attrition
- `Agent Engine!H4`
  - reads `B23`
- `Agent Engine!K4`
  - reads `B25`
- `Agent Engine!K59`, `L59`, `M59`
  - read `B23`, `B24`, `B25`
- `Agent Engine!O59`, `Q59`, `U59`
  - read the year ladder `J:N`

Review caveats to keep visible:

- `B12` / `B13`
  - label / formula pairing is slightly muddy today
  - `B13 = B11 * B12` only reads cleanly as company net if the split assumption is being treated as the company share or if the target remains `50/50`
- `B5:B8`
  - fixed-period helpers, not true dynamic date-difference math

### Agent Engine

System source ID:

- `SRC-FREEDOM-ENGINE-001`

Role:

- visible strategy dashboard for attraction, roster, production, split, and annual net-to-company projection

Important distinction:

- the top area is mostly a read layer
- the real logic lives in the calculator section lower in the tab

### Agent Engine Top Dashboard

Main reviewed output cells:

- `B3:B7`
- `E3:E6`
- `H3:H6`
- `K3:K6`
- `N3:N6`
- `R1:R4`

Locked meaning:

- `B3`
  - required monthly recruiting pace
  - includes planning attrition
- `B4`
  - rolling net-add pace
  - this is a net-growth metric, not pure attraction
- `B5`
  - live annualized attrition rate on the active roster
- `B6`
  - average gross additions per month
- `B7`
  - average attrition per month
- `E3`
  - active agents now
- `E4`
  - next-year start target
- `H3`
  - average production per agent
- `H4`
  - target production per agent
- `K3`
  - live actual split to team
- `K4`
  - target split to team
- `N3`
  - projected annual net to company at current actual run rate
- `N4`
  - target annual net to company for the next-year target model

Important fix already made:

- `K3` was corrected to use a true last-6-full-month window

### Agent Engine Calculator

Core engine starts at `A59:W`.

Block map:

- `A:E`
  - roster mechanics
- `F:H`
  - economics pulled from the hidden Owners mirror
- `I:J`
  - actual performance ratios
- `K:L`
  - variance to target
- `M:N`
  - modeled versus actual company net
- `O:W`
  - headcount target ladder and required pace math

#### A:E — roster mechanics

- `A`
  - month spine
- `B`
  - active agents
- `C`
  - joins in month
- `D`
  - attrition in month
- `E`
  - net adds

#### F:N — economics and performance

- `F`
  - gross to team
- `G`
  - agent cut
- `H`
  - team cut
- `I`
  - average GCI / agent actual
- `J`
  - team split actual
- `K`
  - variance to GCI target
- `L`
  - variance to split target
- `M`
  - modeled crew net from assumptions
- `N`
  - actual minus modeled crew net

#### O:W — target ladder and pace engine

- `O`
  - target headcount per BHAG year
- `P`
  - headcount variance
- `Q`
  - ramped target headcount
- `R`
  - target net adds / month
- `S`
  - actual net adds / month
- `U`
  - next-Jan start target
- `V`
  - months remaining to next Jan
- `W`
  - required net adds / month to hit next Jan target

### Context Helpers

Cells `Z2:AD2` are helper/context values, not core business outputs.

- `AA2` is the important one
  - it points the dashboard to the current row in the calculator
- `AB2`, `AC2`, `AD2`
  - are date/year/quarter helpers
- `Z2`
  - is just a row-count helper

## Chart Feed Layer

Range `AG:AK` is mostly a chart-feed layer, not core business logic.

It packages:

- joins / attrition / net adds
- production charts
- split charts
- ASI/OSI rolling tables

Important note:

- one production chart block currently says `rolling 6-month`
- but its formula is using a 12-row window
- that should be treated as a chart-layer inconsistency, not core engine truth

## Current Spreadsheet Workarounds

- active roster currently depends on end dates more than status
- some display values should show rounded whole-agent targets even when the raw math is fractional
- some chart logic is inconsistent with its label
- the workbook is acting like both:
  - source system
  - calculator engine
  - dashboard layer

That is why it works now, but is also a rebuild target later.

## Rebuild Direction Later

Do not rebuild from cell references.

Rebuild from these logical layers:

1. team member source
2. production-roster source
3. community tracker source
4. deal-ledger economics source
5. BHAG assumptions source
6. engine calculation layer
7. dashboard read layer

## Working Validation

The active detailed trace lives in:

- `docs/handoffs/2026-04-17-source-014-validation-packet.md`

That packet is the working validation log.
This source note is the durable system-facing summary.
