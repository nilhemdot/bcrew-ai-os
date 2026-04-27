# Strategy Hub v2 Source-To-Gap Manifest

Status: Phase 0 artifact only; Strategy Hub remains paused after the Phase 1 safety stub
Date: 2026-04-27

This manifest is the trust gate for Strategy Execution OS v2.

No Strategy Hub v2 UI, synthesis rewrite, action router, or old-surface cleanup should start until Steve approves this source-to-gap map.

## Operating Rule

Strategy Hub v2 must not start from AI priorities. It must start from live goal math.

For every strategic metric the system must know:

- what the metric is
- where the target comes from
- where the actual comes from
- how the gap is calculated
- how freshness is judged
- who owns the metric
- what happens if the source read fails
- which evidence streams can explain the gap

The LLM may explain a gap. It may not decide whether a gap exists.

## Source Status Legend

| Status | Meaning |
| --- | --- |
| Live proven | A command or API read returned the current value during this pass. |
| Structurally verified | Sheet/table/source exists and is verified, but Strategy Hub v2 still needs a reader or normalized snapshot. |
| Source mapped | Source contract or source note identifies the correct owner/source, but the v2 live reader is missing. |
| Missing reader | The source exists, but v2 cannot yet compute the metric automatically. |
| Missing source | The source contract itself is not signed off or the connector is not live enough to trust. |

## Proof Registry

| Proof ID | Command / source | Current proof |
| --- | --- | --- |
| P1 | `curl -fsS http://localhost:3000/api/strategic-execution/goal-truth` | Team $2B pace is behind by `$40M (-39.9%)`; 10,000-agent community path is ahead by `25 agents (+3.7%)`; Agent Engine capacity is behind by `15 agents (-28.8%)`. |
| P2 | `curl -fsS http://localhost:3000/api/strategic-execution/operating-truth` | Finance, Owners, FUB, and Supabase operating truth cards render from live source contracts. |
| P3 | `npm run sheets:verify` | `211/211` sheet-structure checks passed, including Agent Engine, Agent Satisfaction, NPS/GReviews, Owners, Weekly Actuals, and Cashflow Dash ranges. |
| P4 | Direct Google Sheets read: `'Agent Engine'!B3:O7` | Required attraction `3.6048/mo`, net attraction `1.1667/mo`, active agents `37`, target `59.4167`, avg production `$7,698`, target `$10,000`, split `53.3%`, projected net `$1.823M`, target `$3.565M`. |
| P5 | Direct Google Sheets read: `'Agent Satisfaction'!B2:L5` and `'Agent Satisfaction'!Z1:AO20` | ASI actual `4.3`, target `4.5`, gap `-0.2`; survey engagement `45.7%`, target `75%`; town hall engagement `88.6%`, target `75%`; rolling ASI table exists. |
| P6 | Direct Google Sheets read: `'Data Entry - Ops Cont Improvement'!A3:S30` | April 2026 row shows deals executed `30`, NPS captured `0`, NPS capture rate `0%`, Google reviews captured `0`, Google review capture rate `0%`. This is current-process proof only; post-2026-04-01 final source must read ClickUp Deal Data Entry plus FUB evidence. |
| P7 | Direct KPI/Supabase appointments read | April 2026 appointments `183`, held/show outcomes `85`, signed outcome rows `29`, missing outcomes `93`, active appointments `3443`, latest appointment date in table `2026-05-09`. Because this is future-relative to today, 2026-04-27, it must be labeled scheduled/forecast and not used as current-actual freshness. |
| P8 | `npm run kpi:shopping-list` | Shopping List has `293` active rows, `137` active signed rows, `91` active high-score rows, `16` stale high-score rows, `36` expired score-window rows, `49` blank action plans, `17` high-score blank action plans. |
| P9 | Direct KPI/Supabase `deal_data` read | April 2026 executed deals `28`, volume credit `$20,727,550`, gross to team `$376,502`, commission credit `$356,502`, latest executed date `2026-04-22`. |
| P10 | `npm run kpi:data-quality` | Active appointments `3443`; missing appointment outcomes `951`; invalid lead-source rows `6728`; active lead-stage persons `16665`; pond/unclaimed rows `5088`. |
| P11 | `npm run connection:audit -- --limit=80` | Owners/FUB/KPI/ClickUp chain is live: Owners groups `1304`, FUB-linked groups `57`, KPI person matches `57/57`, KPI deal-data matches `53/57`, ClickUp address fallback `50/57`. |
| P12 | Direct Google Sheets read: `'BenCrew Marketing'!A1:Z20` plus `docs/source-notes/freedom-marketing.md` | Freedom marketing sheet has old four-pillar performance dashboard data, but publishing/performance sources remain source-map work, not signed-off Strategy Hub truth. |
| P13 | `rg -n "AI-Suggested 90-Day Priorities|recommended_90_day_priorities|renderRecommendedPriorities" public scripts lib server.js` | Phase 0 found the old active recommendation-feed path in `public/strategic-execution.js`, `server.js`, and `scripts/generate-strategy-evidence-packet.mjs`. Phase 1 safety stub now removes the active display path, disables priority action-item generation, and adds a verifier guard so the old surface cannot quietly return. |

## Sequencing Gate

This manifest does not approve full Strategy Hub v2 implementation.

The current rebuild doctrine still controls sequencing:

- `docs/rebuild/current-plan.md:58`: Strategy Hub is the first major consumer, not the next build surface.
- `docs/rebuild/current-plan.md:185`: the memory/retrieval spine is a prerequisite operating layer.
- `docs/rebuild/current-plan.md:198`: synthesis and fact grounding must close before trusted AI interpretation.
- `docs/rebuild/current-plan.md:638`: Strategy Hub depends on extraction, synthesis hardening, Action Router, and trust boundaries.

Phase 1 safety stub is complete. No further Strategy Hub surface work is approved right now.

The next build lane is the Foundation intelligence spine. Deterministic source snapshots and gap math stay future Strategy Hub v2 work; they should not jump ahead of the memory/retrieval/action spine unless Steve explicitly overrides the command order.

Blocked until the memory/retrieval/action spine is real:

- gap explanations
- doctrine/evidence retrieval
- AI analyst sidebar
- AI recommendations
- LLM-generated dashboard content
- doctrine/evidence drilldowns
- promoted routed actions
- full Strategy Hub v2 acceptance

The prerequisite spine is:

1. `INTEL-JOBS-001` - intelligence job ledger, done and hardened through governed extraction
2. `REPORT-MINING-001` - accepted old-system Director/Scoper/Gold Library/report-shape salvage gate
3. `INTEL-ATOM-001` - done v1: durable source-backed memory atoms plus governed report artifacts and direct Scoper query contract
4. `RETRIEVAL-001` - done v1: real shared-communications candidates promoted into atoms and candidate-backed lexical chunks with explicit `maxTier`
5. `RETRIEVAL-002` - done v1: pgvector semantic retrieval over candidate-backed chunks with explicit `maxTier`
6. `RETRIEVAL-003` - done v1: hybrid evidence API
7. `SYNTHESIS-FACTS-001` - done v1: persisted source-backed fact grounding for synthesis
8. `SYNTHESIS-ENGINE-001` - governed synthesis engine
9. `ACTION-ROUTER-001` - loop closure from insight to routed action to resolution

### Metric Build Classification

Class 1 only authorizes deterministic source-read and math work. It does not authorize synthesis, recommendations, AI commentary, or routed actions.

| Metric | Gate class | Reason / next allowed work |
| --- | --- | --- |
| M01 | 1. deterministic source-read ready now | Owners/BHAG pace is live proven; normalize into snapshot only. |
| M02 | 1. deterministic source-read ready now | Community count and target are live proven; keep separate from team capacity. |
| M03 | 1. deterministic source-read ready now | Agent Engine attraction values are directly readable. |
| M04 | 1. deterministic source-read ready now | Agent Engine active-roster values are directly readable. |
| M05 | 1. deterministic source-read ready now | Capacity gap is live proven; definition must stay explicit. |
| M06 | 1. deterministic source-read ready now | Agent Engine production values are directly readable. |
| M07 | 1. deterministic source-read ready now | Agent Engine split values are directly readable. |
| M08 | 1. deterministic source-read ready now | Agent Engine projected-net values are directly readable. |
| M09 | 2. needs reader/source contract | Cash value is readable, but cash-floor/runway target needs an approved target source. |
| M10 | 2. needs reader/source contract | AR values are readable, but aging/max threshold target needs an approved target source. |
| M11 | 2. needs reader/source contract | Appointments are readable, but appointment/app target reader and naming need confirmation. |
| M12 | 2. needs reader/source contract | Held rows are readable, but held-rate target and missing-outcome tolerance need approval. |
| M13 | 2. needs reader/source contract | Signed rows are readable, but signed-client target and Shopping List reconciliation need approval. |
| M14 | 2. needs reader/source contract | Deal values are readable, but deal-count target and Owners/KPI precedence must be locked. |
| M15 | 2. needs reader/source contract | Shopping List dollars are readable, but expected-dollar formula and target are not approved. |
| M16 | 1. deterministic source-read ready now | Shopping List discipline audit is directly readable; snapshot can be pure math. |
| M17 | 1. deterministic source-read ready now | Lead-source hygiene audit is directly readable; snapshot can be pure math. |
| M18 | 1. deterministic source-read ready now | Cross-system chain audit is directly readable; snapshot can be pure math. |
| M19 | 2. needs reader/source contract | ASI is readable, but source identity must be locked as `SRC-AGENT-SATISFACTION-001` or a named Freedom sub-source. |
| M20 | 2. needs reader/source contract | Culture engagement is readable, but cadence/source identity must be locked with ASI. |
| M21 | 2. needs reader/source contract | Historical/current-process NPS row is readable, but final post-policy ClickUp/FUB reader is missing. |
| M22 | 2. needs reader/source contract | Historical/current-process review row is readable, but `SRC-REVIEWS-001` and target are missing. |
| M23 | 2. needs reader/source contract | Marketing source is mapped, but publishing reliability source is not signed off. |
| M24 | 2. needs reader/source contract | Marketing performance source map is incomplete. |
| M25 | 1. deterministic source-read ready now | Source health can be computed from source contracts, proof commands, and verifier state. |
| M26 | 4. needs ACTION-ROUTER before dashboard acceptance | Routed action state is not real until `ACTION-ROUTER-001` exists. |
| M27 | 1. deterministic source-read ready now | Unsafe old surface can be detected by code scan and removed/stubbed before UX work. |

### Universal Synthesis Gate

Every metric that receives a "why," doctrine citation, evidence drilldown, AI recommendation, or recommended owner/action also requires class 3 work before it can ship:

- `REPORT-MINING-001` must preserve the useful old Director, Scoper, Gold Library, and report artifact shapes before atom implementation.
- `INTEL-ATOM-001` now stores source-backed atoms with source ID, artifact ID, entity, topic, claim, confidence, linked metric, governed report artifact links, lifecycle/review state, and direct Scoper query fields.
- `RETRIEVAL-001` now retrieves candidate-backed atom chunks by lexical filters with explicit `maxTier`; `RETRIEVAL-002` retrieves the same corpus semantically through pgvector; `RETRIEVAL-003` fuses lexical, semantic, and direct atom matches into the governed evidence API.
- `SYNTHESIS-FACTS-001` now persists source-backed strategy/source-contract, goal, operating, KPI, source-snapshot, source-health, and retrieved-evidence facts with explicit `maxTier`.
- `SYNTHESIS-ENGINE-001` must enforce structured output, doctrine priority, and contradiction handling.

Until those cards are real, Strategy Hub may display deterministic metric gaps only. It must not display AI explanations, AI priorities, AI analyst notes, or recommendations.

### Source Precedence Rules

When sources overlap, Strategy Hub must not blend them into false certainty.

- Owners is the primary financial/deal truth for executed production, volume credit, split math, close-side finance, and deal ledger correction.
- KPI/Supabase `deal_data` is supporting sales-system truth for funnel diagnostics, appointment linkage, sales activity, and reconciliation. If KPI and Owners disagree on production or finance, display Owners as primary and surface KPI as a reconciliation signal.
- FUB is the primary contact/pipeline and lead-source lineage source when connector freshness is valid.
- Freedom / Agent Engine is the primary planning model for targets, pace, capacity, and projection logic. It does not override Owners actuals.
- Finance / Weekly Actuals / Cashflow Dash is primary for cash, AR, runway, weekly actuals, and finance control metrics.

## Metric Manifest

### North Star And Agent Engine

| ID | Pillar / metric | Target source | Actual source and current value | Calculation / current gap | Thresholds, stale rule, fallback | Owner | UI card and evidence inputs | Phase 1 requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M01 | Sales / $2B team volume | `SRC-FREEDOM-BHAG-001`, BHAG Builder 2026 target path. Current target: `$310M` for 2026. | `SRC-OWNERS-001`, Owners executed-date Volume Credit. Current actual: `$60M YTD`; should-be pace `$99M`. Proof: P1. | `actual - prorated target`; current gap `-$40M (-39.9%)`. | Green `>= 0%` to pace; yellow `0% to -10%`; red `< -10%`; stale if goal-truth endpoint or Owners read fails for >24h. Fallback to stale card, not packet text. | Steve + Sales leadership | Top KPI band; Sales pillar; evidence from Owners, BHAG, pre-strat, meetings, decisions. | Keep existing live reader, normalize into `StrategyMetricSnapshot`. |
| M02 | Community / 10,000 Real Broker agents | `SRC-FREEDOM-BHAG-001`, 10,000-agent path. Current 2026 target: `700 agents`; should-be pace `661`. | `SRC-FREEDOM-COMMUNITY-001`. Current actual: `686 agents`. Proof: P1. | `actual - should-be`; current gap `+25 agents (+3.7%)`. | Green `>= 0%`; yellow `0% to -5%`; red `< -5%`; stale if community read fails for >24h. Fallback to stale card and suppress "behind" claims. | Steve | Top KPI band; Community context, not Benson Crew roster. | Keep separate from team productive-agent capacity in UI and synthesis. |
| M03 | Attraction / required recruiting pace | `SRC-FREEDOM-ENGINE-001`, Agent Engine `B3`. Target: `3.6048` required attracted/month. | `SRC-FREEDOM-ENGINE-001`, Agent Engine `B4`. Current net attraction avg: `1.1667/mo`. Proof: P4. | `actual - target`; current gap `-2.4381/mo` or about `-67.6%`. | Green `>= target`; yellow within `10%` below target; red more than `10%` below. Stale if Agent Engine direct range read fails for >24h. Fallback to stale Agent Engine card. | Scott + Steve | Top KPI band; Attraction card; evidence from recruiting pre-strat, marketing source status, agent engine trend chart. | Build first-class direct reader for Agent Engine top band and trend feed. |
| M04 | Roster / active agents | `SRC-FREEDOM-ENGINE-001`, Agent Engine `E4`. Target: `59.4167` next-year start target. | `SRC-FREEDOM-ENGINE-001`, Agent Engine `E3`. Current actual: `37 active agents`. Proof: P4. | `actual - target`; current gap `-22.4167 agents`; current target attainment `62.3%`. | Green `>= target`; yellow `90% to 99%` of target; red `< 90%`. Stale if Agent Engine direct range read fails for >24h. | Scott + Steve | Top KPI band; Roster card; evidence from Freedom team roster, Owners production roster, recruiting notes. | Normalize active roster and separate raw active from active productive agents. |
| M05 | Roster / active productive agents | `SRC-FREEDOM-BHAG-001` plus Agent Engine capacity rows. Required agents this year: `52`; required start-of-year agents: `60`. | `SRC-FREEDOM-ENGINE-001`, current active agents `37`. Proof: P1. | `current active - required`; current gap `-15 agents (-28.8%)` this year; `-23 agents (-38.3%)` to next year. | Green `>= required`; yellow within `10%`; red more than `10%` short. Fallback to stale capacity card if currentGoalTruth is unavailable. | Sales leadership + Retention | Agent Engine capacity card; evidence from production roster, agent engine, retention/ASI, pre-strat. | Add explicit active-productive definition in snapshot so synthesis does not confuse it with 10k community count. |
| M06 | Production / average production per agent | `SRC-FREEDOM-BHAG-001`, BHAG Builder `B30` and Agent Engine `H4`. Target: `$10,000/month GCI per agent`. | `SRC-FREEDOM-ENGINE-001`, Agent Engine `H3`. Current actual: `$7,698/month`. Proof: P4. | `actual - target`; current gap `-$2,302 (-23.0%)`. | Green `>= target`; yellow `0% to -10%`; red `< -10%`. Stale if Agent Engine read fails for >24h. | Nick + Ryan + Blake | Production card with rolling 6/12-month chart; evidence from KPI appointments, Shopping List, Owners, sales leadership pre-strat. | Use Agent Engine chart feed for trend and KPI/Owners for drilldown. |
| M07 | Split / company split | `SRC-FREEDOM-BHAG-001`, BHAG Builder target split to team / Agent Engine `K4`. Target: `50%`. | `SRC-FREEDOM-ENGINE-001`, Agent Engine `K3`. Current actual: `53.3%`. Proof: P4. | `actual - target`; current gap `+3.3 pts`; status on track. | Green `>= target`; yellow `-2 pts to 0`; red `< -2 pts`. Stale if Agent Engine read fails for >24h. | Steve + Finance | Split card; evidence from Owners split math, contract/package truth, finance. | Keep as company-split metric; do not confuse with agent split satisfaction. |
| M08 | Net / projected net to company | `SRC-FREEDOM-ENGINE-001`, Agent Engine `N4`. Target: `$3,565,000`. | `SRC-FREEDOM-ENGINE-001`, Agent Engine `N3`. Current projection: `$1,822,607`. Proof: P4. | `actual - target`; current gap `-$1,742,393 (-48.9%)`. | Green `>= target`; yellow `0% to -10%`; red `< -10%`. Stale if Agent Engine read fails for >24h. | Steve + Ahsan | Top KPI band; Net card; evidence from Agent Engine, finance, Owners, production. | Build direct snapshot row and chart; do not bury this in AI prose. |

### Finance And Cash

| ID | Pillar / metric | Target source | Actual source and current value | Calculation / current gap | Thresholds, stale rule, fallback | Owner | UI card and evidence inputs | Phase 1 requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M09 | Cash / available cash and runway | Target source is not yet explicit in source contracts. Candidate: finance policy or cash-floor decision in `SRC-FINANCE-001` / future decision ledger. | `SRC-FINANCE-001`, Cashflow Dash. Current available cash: `$47K`; latest weekly revenue `$30K`; latest weekly expense `$42K`. Proof: P2. | Gap cannot be finalized until cash floor/runway target is defined. Current directional risk: weekly expense exceeds latest weekly revenue by `$12K`. | Proposed v1: green if above approved cash floor and runway; yellow if within 20%; red if below. Stale if Owners workbook modified time older than 7 days or endpoint read fails for >24h. Fallback to stale finance card and suppress generic finance recommendations. | Ahsan + Steve | Cash card; evidence from Weekly Actuals, Cashflow Dash, finance pre-strat, decisions. | Add explicit cash floor/runway target source or decision before using red/yellow status. |
| M10 | Finance / AR and collections | Target source is not yet explicit. Candidate: `SRC-FINANCE-001` and finance operating decision. | `SRC-FINANCE-001`, Cashflow Dash. Current expected AR: `$55K`; uncollected AR: `$0`. Proof: P2. | For v1, `uncollected AR` compared to approved max. Current visible uncollected AR is `$0`; expected AR is future cash visibility. | Green if uncollected AR at/below approved max; yellow if aging threshold breached; red if overdue/unknown. Stale rules same as finance. | Ahsan + Steve | Finance card; evidence from Cashflow Dash, Weekly Actuals, CI Report, finance pre-strat. | Define aging/max threshold and whether expected AR should be shown as opportunity or risk. |

### Pipeline, KPI, Deals, And Execution

| ID | Pillar / metric | Target source | Actual source and current value | Calculation / current gap | Thresholds, stale rule, fallback | Owner | UI card and evidence inputs | Phase 1 requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M11 | Pipeline / appointments set (apps set) | Target source should be KPI goals/company goals plus maintain/grow/exponential goal math. Not yet surfaced as reusable Strategy Hub read. If "apps" is intended to mean something other than appointments set, this metric needs a different source before display. | `SRC-SUPABASE-001`, `appointments`. April 2026 appointment rows: `183`; active appointments total `3443`. Proof: P7. | Gap cannot be finalized until company/agent target reader is wired. | Green/yellow/red must compare current-month appointments to target pace once target source is proven. Actual freshness must use latest non-future appointment/outcome/update timestamp; future scheduled appointment dates are forecast/schedule signal only. Fallback to KPI-stale card if Supabase read fails. | Nick + Ryan + Blake | Pipeline card; evidence from KPI appointments, FUB, sales pre-strat, Sales Hub future pace read. | Build reusable target reader for company and agent appointment pace. |
| M12 | Pipeline / appointments held | Target source should be KPI goals/company goals and appointment conversion standards. | `SRC-SUPABASE-001`, `appointments.outcome`. April 2026 held/show rows: `85`; current-month missing outcomes: `93`. Proof: P7 and P10. | Current held rate from readable rows: `85 / 183 = 46.4%`, but missing outcomes corrupt final conversion. | Green requires target-rate definition and missing-outcome hygiene within allowed max; red if missing outcomes exceed threshold. Suggested hard fail if missing outcomes >10% of current-month rows. | Nick + Ryan + Blake | Pipeline conversion card; evidence from KPI appointment audit and sales leadership pre-strat. | Define held-rate target and make missing outcomes a visible trust penalty. |
| M13 | Pipeline / signed clients | Target source should be KPI goals/company goals plus maintain/grow target math. | `SRC-SUPABASE-001`, appointment outcomes. April 2026 signed outcome rows: `29`. Proof: P7. | Gap cannot be finalized until signed-client target source is wired. | Green/yellow/red compare signed outcomes to monthly target. Stale if Supabase read fails or appointment outcome data is too incomplete. | Nick + Ryan + Blake | Signed-client card; evidence from KPI appointments, Shopping List signed rows, Owners deal ledger. | Build signed-client target reader and reconcile appointment signed outcomes against Shopping List signed rows. |
| M14 | Deals / executed deals and volume | Target source should combine BHAG Builder annual target and Owners/Old BIS KPI Goal & KPI Calculator deal target. Deal-count target still needs direct reader. | `SRC-SUPABASE-001`, `deal_data`. April 2026 executed deals: `28`; volume credit `$20,727,550`; gross to team `$376,502`; commission credit `$356,502`. Proof: P9. | Volume gap can inherit M01 annual pace; deal-count gap missing target reader. | Green/yellow/red for volume follows M01. Deal-count status requires deal-count target. Stale if latest executed date is older than expected close cadence or Supabase read fails. | Sales leadership + Steve | Sales/deals card; evidence from Owners, KPI deal_data, Agent Engine. | Decide whether v2 uses Owners or KPI as primary executed-deal display when values differ; current doctrine prefers Owners for finance/source-row correction. |
| M15 | Pipeline value / expected dollars | Target source is not yet explicit. Candidate: KPI goals/company goals and Agent Engine net target. | `SRC-SUPABASE-001`, Shopping List `leads`. Active expected commission approximation: `$5,843,787`; high-score expected commission approximation: `$1,755,817`; active signed rows `137`. Proof: direct Supabase leads read and P8. | Gap cannot be finalized until expected-dollar target is defined. | Green/yellow/red compare weighted pipeline value to future 30/60/90-day dollar target; stale if latest `leads.updated_at` older than 7 days. | Nick + Ryan + Blake | Pipeline value card; evidence from Shopping List, KPI goals, Owners/Agent Engine. | Define formula for expected dollars: active all, high-score weighted, signed-only, or stage-weighted. |
| M16 | Shopping List / discipline | Target: zero stale high-score rows, zero high-score blank action plans, score-window compliance by score doctrine. Source: `SRC-SUPABASE-001`, `leads`; doctrine in KPI source note. | `SRC-SUPABASE-001`. Active rows `293`; high-score rows `91`; stale high-score rows `16`; expired score-window rows `36`; blank action plans `49`; high-score blank action plans `17`. Proof: P8. | Current status red because stale and blank high-score rows are nonzero. | Green: zero high-score blank action plans and no expired score-window rows. Yellow: low exceptions under approved tolerance. Red: any material stale/blank high-score issue until target tolerance is approved. | Nick + Ryan + Blake | Shopping List discipline card; evidence from KPI audit, sales pre-strat, meeting notes. | Convert read-only audit into dashboard snapshot. |
| M17 | Lead-source hygiene | Target: zero invalid/generic final lead-source rows on active lead-stage records. Source: FUB source rules plus KPI/FUB doctrine. | `SRC-SUPABASE-001` + FUB rules. Active lead-stage persons `16665`; invalid lead-source rows `6728`; invalid sources include Import, unspecified, Sphere, blank. Proof: P10. | `invalid rows / active lead-stage persons`; current visible defect rate about `40.4%`. | Green `<1%`; yellow `1% to 5%`; red `>5%` until a more precise accepted tolerance exists. Stale if KPI/FUB audit older than 7 days. | Nick + Ryan + Blake | Lead-source hygiene card; evidence from KPI/FUB audit and source rules. | Build source-hygiene snapshot and guided-correction action path later. |
| M18 | Cross-system deal chain health | Target: FUB-linked Owners deals should match KPI person, KPI deal_data, and ClickUp task by Deal # unless explicitly exempt. | `SRC-OWNERS-001`, `SRC-FUB-001`, `SRC-SUPABASE-001`, `SRC-CLICKUP-001`. Current proof: FUB-linked groups `57`; KPI person matches `57/57`; KPI deal-data matches `53/57`; ClickUp exact deal-number matches `0/57`; address fallback `50/57`. Proof: P11. | Red for ClickUp exact join; yellow for KPI deal_data shortfall; green for KPI person identity. | Green when exact critical joins meet approved thresholds. Red if exact task join is broken and address fallback is required for most records. Stale if connection audit older than 7 days. | Carson + Sales leadership | Source health / Ops follow-through card; evidence from connection audit and Ops Hub. | Decide which part appears in Strategy Hub versus Ops Hub; Strategy should show the risk, Ops owns cleanup. |

### Retention, Culture, Client Experience, And Marketing

| ID | Pillar / metric | Target source | Actual source and current value | Calculation / current gap | Thresholds, stale rule, fallback | Owner | UI card and evidence inputs | Phase 1 requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M19 | Retention / ASI | `SRC-FREEDOM-ENGINE-001` source family, Agent Satisfaction dashboard `B2:E5` and source tab. Target ASI: `4.5`. | Freedom Agent Satisfaction dashboard. Current ASI: `4.3`; rolling table exists. Proof: P5. | `actual - target`; current gap `-0.2`. | Green `>= 4.5`; yellow `4.25 to 4.49`; red `< 4.25`. Stale if no current survey/culture event row in the expected cadence or direct read fails. | Georgia + Steve | Retention/ASI card; evidence from Agent Satisfaction, town halls, retention meetings, pre-strat. | Add `SRC-AGENT-SATISFACTION-001` or explicitly map ASI under Freedom source family. |
| M20 | Retention / culture engagement | Agent Satisfaction dashboard targets: survey engagement `75%`, town hall engagement `75%`. | Freedom Agent Satisfaction dashboard. Current survey engagement `45.7%`; town hall engagement `88.6%`. Proof: P5. | Survey gap `-29.3 pts`; town hall gap `+13.6 pts`. | Green `>= target`; yellow within `10 pts`; red more than `10 pts` below. Stale if no survey/event row in expected cadence. | Georgia + Steve | Culture engagement card; evidence from Agent Satisfaction source tab, survey exports, meeting attendance. | Separate survey engagement and town hall engagement so a strong town hall does not hide weak survey capture. |
| M21 | Client experience / NPS capture | Interim target source: BHAG Builder five-star experience assumption `80%`; final target should be confirmed in Ops policy/decision. | Current-process Freedom ops rollup shows April 2026 deals executed `30`, NPS captured `0`, NPS capture rate `0%`. Proof: P6. Post-2026-04-01 final source should be ClickUp Deal Data Entry plus FUB evidence. | Current Freedom rollup gap vs 80% target: `-80 pts`, but final v2 claim must read ClickUp/FUB before acting. | Green `>= approved capture target`; yellow within `10 pts`; red more than `10 pts` below. Stale if post-policy ClickUp/FUB source is missing; fallback to "source incomplete" not stale spreadsheet accusation. | Carson | Client experience card; evidence from ClickUp Deal Data Entry, FUB call/transcript evidence, Freedom history, Ops policy. | Build post-policy reader before using the April value as final truth. |
| M22 | Client experience / Google Review capture | Target source not signed off. Candidate: Ops quarterly bonus policy or review-capture decision. | Current-process Freedom ops rollup shows April 2026 deals executed `30`, Google reviews captured `0`, capture rate `0%`. Proof: P6. `SRC-REVIEWS-001` is still a gap. | Gap cannot be trusted until final target and source are signed off. Directional current-process signal is red. | Green/yellow/red require approved eligible-transaction target. Stale if Google/ClickUp review source missing. | Carson + Tanner | Reviews card; evidence from ClickUp, FUB outreach proof, Google Business Profile once connected. | Define `SRC-REVIEWS-001` or split NPS vs Google Reviews source contracts. |
| M23 | Marketing / publishing reliability | Target source not signed off. Candidate: `SRC-PUBLISH-001` once SocialPilot auth context is validated. | `SRC-PUBLISH-001` is gap; Freedom `BenCrew Marketing` has historical high-level KPI dashboard data. Proof: P12. | Gap cannot be computed as a live operating metric yet. Current state: source mapped but not Strategy Hub ready. | Green when publishing calendar/status source is live and freshness passes; yellow if manual sheet only; red if no source proof. Stale threshold to be set after connector validation. | Tanner | Marketing reliability card; evidence from SocialPilot, content calendar, Freedom marketing, old-system performance layer. | Do not fake marketing reliability from spreadsheet totals; first prove publishing source. |
| M24 | Marketing / demand capture and performance | Target source not signed off. Future sources: Meta, Google Ads, GA4, Search Console, Google Business Profile, YouTube, FUB lead flow. | Freedom marketing tabs and old system define awareness, engagement, leads, remarketing, but current live connector contracts remain incomplete. Proof: P12 and `docs/source-notes/freedom-marketing.md`. | Gap cannot be computed until brand-lane source map closes. | Green only after source contracts/freshness are proven by lane. Yellow for partial connector proof. Red for missing core lanes. | Tanner + Steve | Marketing performance card or source-health card, not a fake KPI card. | Keep v2 marketing scope to source status and publishing reliability unless source map is closed. |

### System Health And Routing

| ID | Pillar / metric | Target source | Actual source and current value | Calculation / current gap | Thresholds, stale rule, fallback | Owner | UI card and evidence inputs | Phase 1 requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M25 | Source health / core strategy sources | Source contracts in `lib/source-contracts.js` and `docs/source-registry.md`. Target: every visible Strategy Hub metric has a signed/readable source, freshness status, and fallback state. | Current live proof exists for goal truth, operating truth, sheets, KPI, FUB/KPI/Owners/ClickUp chain. Missing/partial: ASI source contract naming, reviews source, marketing publishing/performance source, reusable target readers. Proof: P1-P12. | Count source-backed metrics vs total metrics; current manifest has mixed live, structurally verified, mapped, and missing-reader states. | Green: all visible metrics live proven. Yellow: structurally verified with explicit missing-reader badge. Red: metric shown as current without source proof. | Foundation/System | Source health strip; evidence from source contracts, verifier, direct proof commands. | Build dashboard source health model before showing broad strategy recommendations. |
| M26 | Action loop / unresolved decisions and routed actions | `SYS-ACTION-LOOP-001`, backlog `ACTION-ROUTER-001`. Target: every approved recommendation has owner, due date, evidence, doctrine, status, and resolution condition. | Current system status: Action Router v1 creates pending, human-approval-required routes from governed synthesized items into decisions, backlog, open questions, ignore/snooze, and owner-bound action lanes. Proof: `npm run intelligence:action-router-proof` and verifier behavior check. | Current gap: Strategy Hub v2 still lacks a local review/promote surface that consumes pending Action Router records and captures approval/resolution. | Green when Strategy Hub review/promote exists and verifier checks owner/due/resolution. Yellow while routes exist but review/apply UI is not built. | Foundation/System + Steve | Decision queue and active action lane. | Build Strategy Hub review/promote on top of Action Router records before external ClickUp handoff. |
| M27 | Unsafe old recommendation-feed surface | Target: no active Strategy Hub surface may display AI priorities without target/actual/gap/source proof/doctrine/owner. | Phase 0 code contained the old active recommendation path. Phase 1 safety stub has replaced the visible page, disabled the active advisor endpoint, and removed priority action-item generation from new strategy packets. Proof: P13. | Current gap: active surface is offline; remaining work is to keep the verifier guard permanent while v2 rebuilds. | Hard fail if the old active surface returns. Fallback: Strategy Hub v2 in-progress stub and old packets as debug/history only. | Foundation/System | Not a dashboard card; this is a release blocker guard. | Phase 1 safety stub shipped; keep guard through v2. |

## Required Snapshot Contract For Phase 1

Every metric above should become a normalized object:

```json
{
  "metricId": "M01",
  "pillar": "Sales",
  "metric": "Team volume pace",
  "target": {
    "value": 310000000,
    "label": "$310M",
    "sourceId": "SRC-FREEDOM-BHAG-001",
    "sourcePath": "Benson Crew Bhag Builder / 2026 target"
  },
  "actual": {
    "value": 60000000,
    "label": "$60M YTD",
    "sourceId": "SRC-OWNERS-001",
    "sourcePath": "Owners Dashboard / executed-date Volume Credit"
  },
  "gap": {
    "value": -40000000,
    "label": "Behind by $40M (-39.9%)",
    "status": "red"
  },
  "freshness": {
    "asOf": "2026-04-27",
    "staleAfter": "24h",
    "fallback": "show stale card; suppress AI priority"
  },
  "owner": "Steve + Sales leadership",
  "trendSource": "Owners/BHAG pace history",
  "evidenceInputs": [
    "SRC-OWNERS-001",
    "SRC-FREEDOM-BHAG-001",
    "SRC-MEETINGS-001",
    "SRC-GDRIVE-001"
  ],
  "actionState": "none"
}
```

## Missing Readers / Contracts Before Full v2

These are the concrete gaps exposed by Phase 0:

1. `SRC-FREEDOM-ENGINE-001` is live-proven but still needs a first-class Strategy Hub snapshot reader for top KPI band and chart feed.
2. ASI needs an explicit Strategy Hub source identity, either `SRC-AGENT-SATISFACTION-001` or a named sub-source under the Freedom source family.
3. KPI target readers are missing for appointments set / apps set, appointments held, signed clients, executed deals, and expected dollars.
4. NPS/Google Reviews must move from historical/current-process Freedom rows to post-2026-04-01 ClickUp Deal Data Entry plus FUB evidence before final claims.
5. `SRC-REVIEWS-001` is still not signed off.
6. Marketing publishing/performance cannot be treated as live strategy truth until `SRC-PUBLISH-001` and performance-source contracts are validated.
7. Action Router v1 exists as a pending approval route ledger; recommendations cannot be considered closed-loop until Strategy Hub review/promote and approved apply/resolution feedback exist.
8. The old AI priority surface existed during Phase 0; Phase 1 has now stubbed the visible page, disabled the active advisor endpoint, removed active priority action-item generation, and added verifier protection.
9. Future-dated source rows must be labeled scheduled/forecast and cannot be used as current-actual freshness.
10. Owners-vs-KPI precedence must be enforced before any display combines production, deal, or finance values.

## Future Verifier Requirements

`foundation:verify` should fail if any of these are true:

- Strategy Hub shows an AI priority without target, actual, and gap.
- A strategic gap lacks live source row or API proof.
- A metric has no owner.
- A recommendation has no doctrine reference.
- An active action has no owner, due date, or resolution condition.
- Source freshness is stale but the UI presents the metric as current.
- Old `AI-Suggested 90-Day Priorities` returns as an active surface.
- A recommendation suggests building something a signed-off source already provides.
- A synthesis claim cites only meeting chatter when a matching live source exists.
- Agent Engine, ASI, NPS/Reviews, FUB/KPI, marketing status, or action-routing snapshots fail.

## Phase 0 Acceptance Read

Phase 0 proves the data problem is not "we do not know where things are."

The real state is:

- core goal truth is live for $2B, 10k community, and Agent Engine capacity
- Agent Engine dashboard values are directly readable
- ASI is directly readable
- NPS/Reviews current-process data is readable, but the final live post-policy source needs a reader
- KPI/Supabase can read appointments, Shopping List, lead-source hygiene, and deal_data
- Owners/FUB/KPI/ClickUp cross-system proof exists, but ClickUp exact deal-number joins are weak
- marketing has a clear source map, but not enough signed-off live source proof for a full performance dashboard
- Action Router is still the closed-loop gap
- the old AI priority surface was present during Phase 0 and has now been killed as an active surface by the Phase 1 safety stub

Phase 1 safety stub is complete. Steve approval is required before the next build phase starts.
