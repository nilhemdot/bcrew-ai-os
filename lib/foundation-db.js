import { Pool } from 'pg'
import { getSheetValues } from './google-delegated.js'

const pool = new Pool({
  host: process.env.BCREW_DB_HOST || '/tmp',
  database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
  user: process.env.BCREW_DB_USER || process.env.USER,
})

const canonicalDecisionCategories = ['strategy', 'system', 'execution', 'people']

const backlogSeed = [
  {
    id: 'FOUNDATION-001',
    title: 'Lock the strategy packet section by section against live sources',
    team: 'dev',
    lane: 'executing',
    priority: 'P0',
    rank: 1,
    source: 'Foundation review',
    summary: 'Review the business strategy one section at a time and lock wording only after the live source and math are verified.',
    whyItMatters: 'The rest of the rebuild will inherit whatever truth we lock here.',
    nextAction: 'Finish Section 2 (The Engine), then validate assumptions and source references.',
    statusNote: 'In progress with Steve.',
  },
  {
    id: 'MEMORY-001',
    title: 'Stand up the business memory foundation in PostgreSQL',
    team: 'dev',
    lane: 'ranked',
    priority: 'P0',
    rank: 2,
    source: 'Rebuild foundation',
    summary: 'Create the structured store for sessions, decisions, backlog items, parking lot items, and open questions.',
    whyItMatters: 'Volatile work should not live in markdown; the old system already proved that.',
    nextAction: 'Create the first schema, seed the core records, and expose them in the dashboard.',
    statusNote: 'Database installed; schema in progress.',
  },
  {
    id: 'MEMORY-002',
    title: 'Enable the OpenClaw native memory baseline',
    team: 'dev',
    lane: 'scoped',
    priority: 'P0',
    rank: 3,
    source: 'Memory architecture call',
    summary: 'Configure OpenClaw native memory cleanly using the built-in stack before layering in heavier tools.',
    whyItMatters: 'This gives Harlan real recall without prematurely adopting a more complex external stack.',
    nextAction: 'Configure memory-core, active-memory, and dreaming, then restart the gateway and test recall.',
    statusNote: 'Not started yet.',
  },
  {
    id: 'MEMORY-003',
    title: 'Capture full conversations in a browsable archive',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 3,
    source: 'Memory and operating-system direction',
    summary: 'Store full assistant chats, meeting transcripts, and key operating conversations in a structured archive the team can browse later by date, source, participant, topic, and linked decisions.',
    whyItMatters: 'If the raw conversations disappear into chat tools or local logs, we lose lessons learned, implementation history, auditability, and a huge amount of reusable business IP.',
    nextAction: 'Define the archive model: source connector, thread/session ID, participants, timestamps, transcript body, linked decisions/backlog items, redaction rules, and the first ingest paths from Codex sessions, Google Meet transcripts, and core assistant channels.',
    statusNote: 'Archive first. Summaries and lessons can be built on top of it later.',
  },
  {
    id: 'MEMORY-004',
    title: 'Turn archived conversations into lessons learned and reusable IP',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 4,
    source: 'Founder IP capture direction',
    summary: 'Use the archived conversations to extract lessons learned, implementation timelines, case studies, ebook/source material, and reusable training or sales assets without having to reread everything manually.',
    whyItMatters: 'The work of building the system is itself valuable intellectual property. If we capture and organize it well, it becomes proof, training, marketing, and product insight instead of disappearing into old chats.',
    nextAction: 'Define the extraction workflow: lessons-learned records, timeline summaries, quote/clip capture, approval and redaction rules, and how archived conversations roll into content, training, and product packaging.',
    statusNote: 'Depends on MEMORY-003. Do not try to build polished outputs before the archive exists.',
  },
  {
    id: 'MEMORY-005',
    title: 'Implement a temporal truth model for strategy and decisions',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 5,
    source: 'Memory architecture and strategy-truth review',
    summary: 'Track when a strategic fact became true, when it stopped being true, and what superseded it so the system can answer “what is true now?” without losing historical context.',
    whyItMatters: 'A live operating system cannot just keep the latest wording. It needs time-aware truth so decisions, priorities, and strategy shifts do not collapse into one blurry present-tense record.',
    nextAction: 'Define the first temporal schema for decisions and strategy records using fields like valid_from, valid_until, superseded_by, and current_state query rules.',
    statusNote: 'This was part of the early memory architecture discussion and should not get lost just because Graphiti was deferred.',
  },
  {
    id: 'DATA-001',
    title: 'Build a Freedom Sheet source adapter and schema-drift monitor',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 4,
    source: 'Freedom Sheet foundation work',
    summary: 'Read the sheet through stable source IDs and detect structural changes instead of hardcoding cell references.',
    whyItMatters: 'If tabs or headers move, the system should notify us and recover instead of silently breaking.',
    nextAction: 'Define the adapter contract for the Freedom Sheet and add health checks.',
    statusNote: 'Ready to scope after the strategy freeze.',
  },
  {
    id: 'DATA-003',
    title: 'Render live source-backed values across the system',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 4,
    source: 'Strategy system principle',
    summary: 'Stop trusting markdown to hold live math. Render values from source IDs so updates in source systems flow across the dashboard and supporting docs automatically.',
    whyItMatters: 'If a KPI, milestone path, or assumption changes in the source of truth, the system should update everywhere without manual doc cleanup or stale snapshots.',
    nextAction: 'Define the first live-rendered source cards for BHAG milestones, Agent Engine assumptions, and source badges in supporting strategy views.',
    statusNote: 'This is now a core system principle, not a nice-to-have.',
  },
  {
    id: 'DATA-004',
    title: 'Turn source contracts into structured app metadata',
    team: 'dev',
    lane: 'executing',
    priority: 'P0',
    rank: 5,
    source: 'Foundation audit',
    summary: 'Promote source contracts from markdown-only documentation into structured app metadata that powers source IDs, open/edit actions, and source-aware UI behavior.',
    whyItMatters: 'If source links, statuses, and locations live only in prose or hardcoded frontend logic, the system will drift. Source contracts need to be executable, not just described.',
    nextAction: 'Wire Foundation and doc views to structured source contracts, then apply the same pattern to Agent Engine and Financial Model.',
    statusNote: 'Started during the Foundation source-first cleanup pass.',
  },
  {
    id: 'DATA-005',
    title: 'Normalize lead-source lineage between Owners Dashboard and Follow Up Boss',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 7,
    source: 'Owners Dashboard admin tab walkthrough',
    summary: 'Define one canonical lead-source taxonomy and lineage model across the Owners Dashboard and Follow Up Boss so deals can be traced back to a valid source, ground-zero attribution is preserved, and company-versus-agent credit is rule-driven instead of guessed.',
    whyItMatters: 'If lead source, secondary source, ground-zero source, ISA-set status, and FUB IDs are inconsistent, the business cannot trust attribution, company-generated credit, marketing ROI, or coaching signals. Steve called `Import` and `Unspecified` values high-severity operational failures.',
    nextAction: 'Map the current Admin-tab source columns to the FUB model, define valid source values and merge rules, identify which lead sources should force a ground-zero connection chain, add exception rules for bad values like `Import`/`Unspecified`, and design the compliance check that uses Column `BZ` plus ISA-set logic to flag mismatches and surface missing CRM-origin records as database-growth opportunities.',
    statusNote: 'This is one of the highest-value data cleanup layers in the Owners Dashboard because it affects attribution, operations, and future coaching.',
  },
  {
    id: 'DATA-006',
    title: 'Build Admin-tab data quality rules for the Owners Dashboard deal ledger',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 8,
    source: 'Owners Dashboard admin tab deep audit',
    summary: 'Turn the critical Admin-tab business rules into explicit validations so the system can flag bad rows automatically instead of relying on manual spot checks and founder memory.',
    whyItMatters: 'The deal ledger now carries source attribution, company-generated logic, split-credit math, transaction-fee coaching signals, expected-vs-actual cash timing, and CRM linkage. If those rules stay implicit, the rest of the system will inherit hidden errors.',
    nextAction: 'Define the first Admin-tab checks: lead source must map to FUB, `Import`/`Unspecified` values are invalid, transaction-fee rows must follow deal-type rules, company-generated status must follow source + ISA-set logic, split rows must keep credit math coherent, and hybrid expected/actual cash dates must stay interpretable.',
    statusNote: 'This should become a workbook compliance layer, not just a one-time cleanup pass.',
  },
  {
    id: 'DATA-007',
    title: 'Backfill invalid lead-source rows in the Owners Dashboard deal ledger',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 9,
    source: 'Full Admin-tab audit',
    summary: 'Clean the `Lead Source (Bonus System For Having This 100% Complete)` field for the rows currently using invalid values like `unspecified` and `Import`, then map those rows to valid Follow Up Boss-compatible source values.',
    whyItMatters: 'The full-tab audit found 984 invalid lead-source rows out of 1504 populated `Deal #` rows. That makes source attribution, marketing ROI, and company-versus-agent credit structurally unreliable.',
    nextAction: 'Pull the invalid-source rows, define the cleanup taxonomy and merge rules, then backfill the worst offenders first starting with `unspecified` and `Import`.',
    statusNote: 'This is a measurable data-quality crisis, not a cosmetic cleanup.',
  },
  {
    id: 'DATA-008',
    title: 'Backfill missing Follow Up Boss links in Column BZ',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 10,
    source: 'Full Admin-tab audit',
    summary: 'Populate `Client Follow UP Boss ID` for the historical deal rows that are currently missing CRM linkage so the sheet can be reconciled against Follow Up Boss and used for source-of-truth checks.',
    whyItMatters: 'Only 45 of 1504 rows currently have a populated FUB link. With 1459 rows missing linkage, the system cannot actually reconcile most historical deals to the CRM.',
    nextAction: 'Define the join path from deal rows to FUB people, then backfill the highest-value recent eras first and measure how much coverage improves.',
    statusNote: 'This is required before serious FUB parity checks become possible.',
  },
  {
    id: 'DATA-009',
    title: 'Resolve suspicious duplicate full-credit deal rows in the Admin tab',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 11,
    source: 'Full Admin-tab audit',
    summary: 'Review the known suspicious duplicate trades where the same realtor has multiple rows with `Total = 1` and decide whether they are true duplicates, bad data, or an edge-case workflow that needs explicit rules.',
    whyItMatters: 'The full-tab audit directly confirmed suspicious pairs like `T#25263` and `T#25226`. If those rows are duplicates, they can distort counts, credits, and downstream reporting.',
    nextAction: 'Audit the suspicious duplicate set starting with `T#25263` and `T#25226`, document the cause, and either merge/fix the rows or encode the exception rule.',
    statusNote: 'Do not collapse all duplicate `Deal #` rows blindly. Split-credit rows are legitimate in many cases.',
  },
  {
    id: 'DATA-010',
    title: 'Normalize malformed and non-operational trade identifiers in the Admin tab',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 12,
    source: 'Full Admin-tab audit',
    summary: 'Separate placeholder rows and malformed trade IDs from the operational deal ledger so rollups, seasonality views, and audit checks do not quietly mix forecast rows and naming anomalies into real historical production.',
    whyItMatters: 'The full-tab audit found goal-builder placeholder rows plus malformed or inconsistent trade identifiers like `T23051`, ` T#23012`, numeric-only IDs, `T#20125anotheronewrong`, older `GTA#` variants, and lower-case split suffixes. Without normalization, row counts and grouping logic drift.',
    nextAction: 'Tag the placeholder goal-builder rows explicitly, standardize or map malformed trade IDs, and define which historical naming variants are valid versus which should be normalized or excluded from operational reporting.',
    statusNote: 'This is especially important before we use 2023-to-today deal history for seasonality or KPI rollups.',
  },
  {
    id: 'DATA-011',
    title: 'Audit address parity between Owners Dashboard, Follow Up Boss, and Home Value Hub',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 13,
    source: 'Owners Dashboard column validation',
    summary: 'Define and measure the address-integrity rules across the deal ledger, Follow Up Boss, and Home Value Hub / Home Optima so bought-property records are complete and usable for homeowner follow-up.',
    whyItMatters: 'For buy-side deals, the bought-property address should exist and match across the sheet, Follow Up Boss, and Home Value Hub. If those systems drift, the business loses homeowner-marketing coverage, client-value workflows, and trustworthy address-based coaching or retention signals.',
    nextAction: 'Start with recent buy-side rows, compare `Deal Address` against the linked FUB contact and Home Value Hub record, define the mismatch cases, and quantify how many past clients and supporters are missing Home Value Hub coverage.',
    statusNote: 'Treat Home Value Hub as the internal name and Home Optima as the external/vendor name.',
  },
  {
    id: 'DATA-012',
    title: 'Audit QuickBooks AR completeness from Column D',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 14,
    source: 'Owners Dashboard column validation',
    summary: 'Treat `Commission/Fees Into Accounting Software?` as a live accounting-control field and define the check that proves deal-level AR / commission entries have been entered into QuickBooks.',
    whyItMatters: 'Column D is still relevant in the current system because it confirms whether the AR side of a deal has been entered into QuickBooks. If that stays informal, the finance layer can drift away from the operational ledger and cash-collection follow-up gets weaker.',
    nextAction: 'Define the exact allowed statuses in Column D, map them to the QuickBooks workflow, and decide how the system should flag deals that are closed or cash-collected without confirmed accounting entry.',
    statusNote: 'This is not legacy bookkeeping residue. It is a real finance-control signal.',
  },
  {
    id: 'DATA-013',
    title: 'Audit client identity parity between Owners Dashboard and Follow Up Boss',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 15,
    source: 'Owners Dashboard column validation',
    summary: 'Compare `Client Name` in the Admin tab against the linked Follow Up Boss contact and define the mismatch cases so the team can trust deal-to-person identity across systems.',
    whyItMatters: 'If the client name in the ledger does not line up with the linked FUB record, either FUB was not updated properly or the sheet entry is wrong. That breaks CRM reconciliation, downstream automations, and confidence in any coaching or attribution based on the linked person.',
    nextAction: 'Start with rows that already have a populated `Client Follow UP Boss ID`, compare names, classify mismatch patterns, and define the cleanup ownership between Ops and CRM hygiene.',
    statusNote: 'This pairs naturally with DATA-008, but it is a different integrity problem than missing FUB links.',
  },
  {
    id: 'DATA-014',
    title: 'Operationalize ISA Set Deal and company-versus-agent attribution rules',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 16,
    source: 'Owners Dashboard full-tab audit',
    summary: 'Turn `ISA Set Deal` from an empty placeholder column into a real attribution input and use it to tighten `Company or Agent` logic when source lineage alone is not enough.',
    whyItMatters: 'Steve called out examples where ISA-set business is being recorded in the wrong place and the final `Company or Agent` value is therefore wrong. If ISA-set logic stays informal, company-generated credit will keep drifting and Ops will keep guessing.',
    nextAction: 'Define the valid `ISA Set Deal` states, backfill recent qualifying rows, and encode the rule that agent-sourced leads with an ISA-set override still count as company-generated when appropriate.',
    statusNote: 'This is part of the broader attribution cleanup, but it deserves its own implementation path because the new column is currently unused.',
  },
  {
    id: 'DATA-015',
    title: 'Backfill and enforce Deal or Lease classification',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 17,
    source: 'Owners Dashboard full-tab audit',
    summary: 'Populate `Deal or Lease?` and define when it overrides the old price-threshold heuristic so lease activity stops leaking into buy/sell production analysis.',
    whyItMatters: 'The sheet now has a dedicated `Deal or Lease?` column, but it is currently empty across the audited tab. Until that field is used, the system has to rely on rough proxies like sub-200k pricing, which is good enough for hints but not for trustworthy reporting.',
    nextAction: 'Define the allowed values, backfill the recent periods first, and decide when historical rows should be inferred versus manually corrected.',
    statusNote: 'This will sharpen production counts, coaching metrics, and seasonality views.',
  },
  {
    id: 'DATA-016',
    title: 'Normalize legacy anonymized realtor aliases and departed-agent history',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 18,
    source: 'Owners Dashboard deep audit',
    summary: 'Decide how to handle old anonymized realtor values like `zz -bt` so historical attribution is either mapped cleanly or explicitly treated as irrecoverably anonymized.',
    whyItMatters: 'The Admin tab still contains historical placeholder realtor names from the old direct-from-sheet presentation workflow. If those aliases are left ambiguous, any historical per-agent analysis on departed agents becomes misleading and future migrations may silently preserve junk labels as if they were real people.',
    nextAction: 'Identify whether a reliable alias map exists, decide whether the goal is historical restoration or explicit archival, and then standardize how departed-agent history is represented going forward.',
    statusNote: 'The KPI dashboard removed the original reason for anonymizing names, but the old rows still need a deliberate policy.',
  },
  {
    id: 'DATA-017',
    title: 'Encode brokerage, Real Broker, and Benson Crew eras in deal-ledger reporting',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 19,
    source: 'Owners Dashboard full-tab audit',
    summary: 'Make the Admin-tab reporting and future source contracts explicitly era-aware so historical rows are interpreted using the business rules that were true at the time, not today’s assumptions.',
    whyItMatters: 'The sheet spans at least three real operating eras: brokerage before about 2023-04-01, Real Broker from about 2023-04-01 through 2025-06-30, and Benson Crew from about 2025-07-01 onward. Cobroke fields, lead-source expectations, attribution rules, and commission norms do not mean the same thing across those periods.',
    nextAction: 'Define the canonical era boundaries, tag or infer the era from `Date Firm (Executed)`, and document which columns and rollups should be included, ignored, or reinterpreted in each era before we do serious 2023-to-today seasonality or KPI analysis.',
    statusNote: 'This is a prerequisite for trustworthy historical comparisons.',
  },
  {
    id: 'FINANCE-001',
    title: 'Normalize partner commissions across the Owners Dashboard finance stack',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 6,
    source: 'Owners Dashboard finance walkthrough',
    summary: 'Lock the internal finance source contract around `(Input) Weekly Actuals`, then trace how partner commissions flow through weekly actuals, monthly roll-ups, annual roll-ups, and `Cashflow Dash` so top-line revenue and owners expense are not overstated.',
    whyItMatters: 'Weekly Actuals is the internal finance truth, but partner commissions are currently backed out at the dashboard layer. If the normalization logic stays implicit or only exists in one layer, monthly and annual reporting can drift away from the real company economics.',
    nextAction: 'Map the exact flow from `ADMIN ONLY - Deal Data Entry` to `(Input) Weekly Actuals`, `Monthly Actuals (Roll Up)`, annual roll-ups, and `Cashflow Dash`, then decide where the partner-commission adjustment should live canonically.',
    statusNote: 'Treat Weekly Actuals as the finance source of truth. Use Cashflow Dash as a validation and management-interpretation layer until the normalization path is cleaned up.',
  },
  {
    id: 'ENGINE-001',
    title: 'Make planning attrition a first-class engine input',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 5,
    source: 'Agent Engine rebuild',
    summary: 'Break the planning attrition assumption out of the buried recruiting formula and make it an explicit source-backed input in the BHAG builder or replacement source-of-truth system.',
    whyItMatters: 'Right now the system can show live attrition pressure, but not the planning attrition assumption that drives required recruiting pace. That keeps one of the most important engine assumptions hidden.',
    nextAction: 'Add a visible planning attrition field to the source of truth, then wire it into the Agent Engine and financial interpretation views.',
    statusNote: 'Needed before the engine math is fully explainable and editable in-system.',
  },
  {
    id: 'SYSTEM-001',
    title: 'Write a separate system-strategy doc for the AI OS',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 5,
    source: 'Foundation architecture',
    summary: 'Keep business strategy and system strategy separate so the AI operating model does not leak into company strategy.',
    whyItMatters: 'This keeps the foundation readable for humans and reliable for agents.',
    nextAction: 'Draft docs/system-strategy.md after the business strategy is locked.',
    statusNote: 'Not started yet.',
  },
  {
    id: 'STRATEGY-001',
    title: 'Business Atoms Framework',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 6,
    source: 'Atoms framework design',
    summary: 'Apply the marketing atoms pattern to the whole business so recurring wins, losses, bottlenecks, frustrations, decisions, and assumption risks can be captured as structured strategic signals.',
    whyItMatters: 'Quarterly planning should run on recurring evidence, not vibes. The old marketing system proved that atoms become powerful once they are searchable, tagged, and actually used downstream.',
    nextAction: 'Create business_atoms and atom_hits tables, define tagging and hit logic, and add a dashboard view with weekly, monthly, quarterly, and annual filters.',
    statusNote: 'Spec ready to capture in the repo.',
  },
  {
    id: 'GOV-001',
    title: 'Build governance accountability into the system',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 7,
    source: 'Governance design',
    summary: 'Make the system hold leadership and departments accountable to the strategy, cadence, and execution rules instead of only documenting them.',
    whyItMatters: 'The AI OS should not just help the team work. It should enforce the operating cadence, surface drift, and make follow-through visible.',
    nextAction: 'Define how the system checks calendar cadence, meeting prep, decision capture, follow-through, and department accountability against the strategy.',
    statusNote: 'Strongly aligned with the old coaching and onboarding plans.',
  },
  {
    id: 'PEOPLE-001',
    title: 'Build people accountability and performance intelligence layer',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 8,
    source: 'Leadership accountability design',
    summary: 'Use calendar attendance, meeting notes, expected outputs, compensation, role expectations, and operating signals to give leadership a grounded view of who is contributing, where accountability is slipping, and where coaching or intervention is needed.',
    whyItMatters: 'Quarterly and monthly reviews should be informed by a third-party system that sees real behavior and outcomes, not just whoever argues best in the room.',
    nextAction: 'Define the people-intelligence model: role expectations, meeting attendance, cadence compliance, output expectations, coaching signals, and guardrails for fair evaluation.',
    statusNote: 'Must be evidence-based and role-based, not vague vibe scoring.',
  },
  {
    id: 'DATA-002',
    title: 'Build source trust scoring layer',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 9,
    source: 'Foundation system design',
    summary: 'Score each source not just for connectivity, but for recency, completeness, health, and decision-worthiness.',
    whyItMatters: 'A connected source that is stale or broken should not carry the same weight as a healthy source of truth.',
    nextAction: 'Define trust dimensions, thresholds, and how the dashboard surfaces trust alongside connection status.',
    statusNote: 'Natural extension of source contracts and schema drift monitoring.',
  },
  {
    id: 'DECISION-001',
    title: 'Build decision-to-doc traceability',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 10,
    source: 'Foundation system design',
    summary: 'Every strategy-doc change should point back to the exact decision, session, source, or event that justified it.',
    whyItMatters: 'This makes the strategy layer auditable and keeps updates grounded in real evidence.',
    nextAction: 'Define linkages between decisions, sources, sessions, and proposed doc updates.',
    statusNote: 'Needed before strategy automation becomes trustworthy.',
  },
  {
    id: 'DECISION-002',
    title: 'Build a strategy change ledger and inline change annotations',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 11,
    source: 'Foundation change-tracking design',
    summary: 'Track every meaningful Foundation strategy change with before/after values, linked decisions, timestamps, participants, affected sections, and visible annotations that show readers what changed and why.',
    whyItMatters: 'Major strategy changes should never disappear into silent edits. Leadership and agents need to see what changed, why it changed, and where the supporting decision lives.',
    nextAction: 'Define strategy_change records, decision-linked inline annotations, newest-first change history, and when a changed line should be visibly highlighted in the Foundation UI.',
    statusNote: 'Use visible highlights for meaningful strategy changes, not every copy edit.',
  },
  {
    id: 'DECISION-003',
    title: 'Build decision conflict detection and cleanup workflow',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 12,
    source: 'Decision governance design',
    summary: 'Detect when a new decision fully or partially contradicts an older one, warn leadership, and create a cleanup path for docs, rules, and downstream systems that still reflect the old direction.',
    whyItMatters: 'Contradictions are where trust erodes. The system should flag them early and force cleanup instead of letting old and new direction silently coexist.',
    nextAction: 'Define decision relationship types like supersedes, partially contradicts, clarifies, and expires, plus required metadata such as date, time, participants, and affected areas.',
    statusNote: 'Queue unresolved contradictions for the next leadership or ownership meeting until cleanup is complete.',
  },
  {
    id: 'GOV-002',
    title: 'Build meeting effectiveness scoring',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 13,
    source: 'Governance system design',
    summary: 'Track whether meetings happened, produced decisions, created ownership, and actually moved the business forward.',
    whyItMatters: 'A meeting existing on the calendar is not the same as a meeting doing its job.',
    nextAction: 'Define a simple meeting-quality rubric tied to decisions, ownership clarity, and follow-through.',
    statusNote: 'Build after baseline governance accountability is in place.',
  },
  {
    id: 'PEOPLE-002',
    title: 'Define role expectation contracts',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 14,
    source: 'People intelligence design',
    summary: 'Create explicit expectation contracts by role so people accountability is grounded in agreed outputs and behaviors.',
    whyItMatters: 'Fair accountability requires explicit expectations before evaluation.',
    nextAction: 'Define the structure for role expectations, required cadences, output expectations, and quality standards.',
    statusNote: 'Dependency for serious people intelligence.',
  },
  {
    id: 'STRATEGY-002',
    title: 'Build company drift map',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 15,
    source: 'Foundation system design',
    summary: 'Show where the business is drifting from strategy by pillar, department, cadence, and source health.',
    whyItMatters: 'Leadership should be able to see where reality is diverging from the plan before that drift becomes damage.',
    nextAction: 'Define the drift categories and how they roll up into one executive view.',
    statusNote: 'Becomes much more powerful once governance and people intelligence exist.',
  },
  {
    id: 'STRATEGY-003',
    title: 'Build a live quarterly priorities workspace',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 16,
    source: 'Strategy module design',
    summary: 'Replace quarterly priorities as a mostly static markdown doc with a live strategy workspace that holds the current quarter, SMART priorities, milestones, owners, evidence, meeting notes, carry-forward decisions, and archived outcomes.',
    whyItMatters: 'Quarterly priorities are not just text. They are the live operating bridge between annual strategy and the next 90 days of execution, and they need to be collaborative, measurable, and easy for AI to reason over.',
    nextAction: 'Define the quarterly-priorities data model: quarter definition, SMART priority records, milestones, owners, status, carry-forward/archive rules, and how the supporting strategy view should render it.',
    statusNote: 'Keep the canonical overview short. Put the live operating layer in the strategy module.',
  },
  {
    id: 'STRATEGY-004',
    title: 'Build the AI-assisted strategy planning workflow',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 17,
    source: 'Strategy team system design',
    summary: 'Create the pre-strategy workflow for quarterly planning: ingest prior-quarter pre-work, meeting notes, strategic evidence, atoms, and performance data so AI can help identify the most urgent priorities, propose options, and support carry-forward or stop decisions.',
    whyItMatters: 'The strategy system should help leadership go from evidence to priorities, not just store the final answer. This is the real AI layer for the future strategy team.',
    nextAction: 'Define the quarterly planning pipeline: pre-work collection, evidence ingestion, synthesis prompts, recommendation outputs, review checkpoints, and how final priorities get approved and locked.',
    statusNote: 'This should come after the live quarterly workspace shape is clear.',
  },
  {
    id: 'GOV-003',
    title: 'Build strategy-to-calendar enforcement',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 18,
    source: 'Governance system design',
    summary: 'If the strategy defines a cadence, the system should verify it exists on the calendar and flag gaps before the cadence breaks.',
    whyItMatters: 'Strategy should show up in the calendar, not just in documents.',
    nextAction: 'Map required meetings and review cadences to calendar checks and missing-event alerts.',
    statusNote: 'Direct extension of the governance accountability layer.',
  },
  {
    id: 'SYSTEM-002',
    title: 'Define modular product architecture around Foundation',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 19,
    source: 'Product architecture insight',
    summary: 'Treat Foundation as the core product and design future team and pillar modules to plug into it instead of forking their own systems.',
    whyItMatters: 'This keeps the AI OS sellable and extensible. Strategy, memory, sources, governance, and accountability should be shared primitives that every future module reuses.',
    nextAction: 'Write the first modular architecture note: Foundation core, shared primitives, and how future modules like Marketing, Strategy Team, People, and Ops attach to it.',
    statusNote: 'Captures the idea that someone may eventually buy one pillar while still depending on the Foundation backbone.',
  },
  {
    id: 'AGENT-001',
    title: 'Define the core agent topology for the AI OS',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 20,
    source: 'Agent system design',
    summary: 'Design the real agent model: Crewbert as orchestrator, Harlan as Steve-facing assistant, department assistants, and how true agents differ from lightweight routed personas.',
    whyItMatters: 'The old system blurred true agents and wrapped personas. We need a clear architecture before building chat surfaces, role-based assistants, or per-user experiences.',
    nextAction: 'Map the minimum viable agent topology: orchestrator, personal assistant, department assistant pattern, and when to use routing versus a dedicated agent runtime.',
    statusNote: 'Important before we promise every leader or agent a full assistant.',
  },
  {
    id: 'UX-001',
    title: 'Add a home-screen chat surface for the main assistant',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 21,
    source: 'Foundation UX direction',
    summary: 'Put a real conversation box on the Foundation home screen so Steve can talk to the main assistant from inside the system instead of treating chat as separate from the OS.',
    whyItMatters: 'The operating system should feel alive and usable from the home screen. The chat surface becomes the front door into strategy, memory, backlog, and source-backed views.',
    nextAction: 'Define the first home chat experience: what assistant it talks to, what context it gets, and how it links into memory, backlog, and source-backed views.',
    statusNote: 'Scope this before building around a final agent identity decision.',
  },
  {
    id: 'PEOPLE-003',
    title: 'Design role-based workspace and assistant experiences',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 22,
    source: 'Product and people-system design',
    summary: 'Different users should see different workspaces, assistants, and accountability layers based on who they are: Steve, leadership, department owners, or agents on the team.',
    whyItMatters: 'If everyone sees the same system, the experience gets noisy and low-trust. Role-aware views are necessary for assistants like Harlan, Chief, or future team-facing copilots.',
    nextAction: 'Define the first role tiers, what each role can see, and what their assistant should help with.',
    statusNote: 'Connect this later to auth, permissions, and people accountability.',
  },
  {
    id: 'DEV-001',
    title: 'Rebuild a lightweight parallel dev loop with worktree isolation',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 23,
    source: 'Old dev-team salvage',
    summary: 'Reuse the strongest pattern from the old system: DB-backed tasks, isolated git worktrees, a scoped builder/reviewer loop, and safe parallel execution.',
    whyItMatters: 'This is how we eventually let 2–5 agents work in parallel without stepping on each other, while keeping the rebuild much lighter than the old Frankenstein.',
    nextAction: 'Document the v2 dev loop: task table, worktree-per-task, small role set (scoper, builder, QA, review loop), and branch ownership rules.',
    statusNote: 'Useful accelerator later, not a current blocker.',
  },
  {
    id: 'UX-002',
    title: 'Wire Harlan to one continuous cross-channel assistant',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 24,
    source: 'Foundation assistant product design',
    summary: 'Make Harlan one real assistant identity across web, Telegram, and future channels instead of separate mock chat surfaces. The website chat should continue the same conversation and memory thread no matter where Steve is talking to Harlan.',
    whyItMatters: 'If Harlan feels like separate fake copies in different channels, trust drops immediately. The Foundation viewer should reflect one assistant, one memory spine, and one session history across channels.',
    nextAction: 'Define the shared conversation model, channel identity rules, and memory/session contract for Harlan across web and Telegram.',
    statusNote: 'Current home chat is only a preview. This captures the real product requirement.',
  },
  {
    id: 'UX-003',
    title: 'Align Foundation nav order with strategy review order',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 25,
    source: 'Foundation viewer audit',
    summary: 'Keep the Foundation site in the same top-down order we use to review and lock strategy so the website stays a clean viewing layer instead of inventing a new mental model.',
    whyItMatters: 'The website exists to help Steve view the system. If the nav order drifts from the actual strategy packet, review gets harder and the UI starts creating confusion instead of reducing it.',
    nextAction: 'Define the canonical Foundation nav order from the strategy packet and make the site reflect it exactly.',
    statusNote: 'This is a viewer-alignment task, not a redesign task.',
  },
  {
    id: 'UX-004',
    title: 'Create a Foundation UI pattern checklist',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 26,
    source: 'Foundation build consistency',
    summary: 'Write down the small layout and component rules that keep Foundation pages consistent as we keep rebuilding them.',
    whyItMatters: 'Without a pattern checklist, small shifts in where intros, source lines, footers, tables, and live snapshot cards sit will keep making the system feel inconsistent even when the data is right.',
    nextAction: 'Document the current Foundation page pattern: strategy explanation above the card, source footer inside the card, long-range path before live snapshot, and strategy-first layout rules for source-backed docs.',
    statusNote: 'Internal build rule, not a user-facing strategy doc.',
  },
  {
    id: 'UX-005',
    title: 'Protect approved UI sections from drift during moves and refactors',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 27,
    source: 'Strategic Execution move failure',
    summary: 'When a section or card has already been approved, moving it to a new hub should preserve the exact content and layout unless a new explicit redesign is approved.',
    whyItMatters: 'We lost time and trust by reinterpreting an approved section instead of moving it literally. The system needs a guardrail for approved UI so moves do not become accidental rewrites.',
    nextAction: 'Define the first protection mechanism for approved sections: exact component reuse, approved-section registry, or snapshot-based checks for key Foundation and Strategic Execution views.',
    statusNote: 'This is a build-discipline rule derived directly from the Current Quarter move failure.',
  },
  {
    id: 'CLEANUP-001',
    title: 'Remove dead or duplicate Foundation files after redesign',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 27,
    source: 'Frankenstein prevention audit',
    summary: 'Audit and remove files that no longer earn their place after the site redesign, especially duplicate renderers, redirect stubs, and build artifacts that could confuse future work.',
    whyItMatters: 'The fastest way to rebuild a Frankenstein is to keep superseded files and duplicate logic around after every redesign. Anything not in the active product path needs to be clearly archived, merged, or deleted.',
    nextAction: 'Review the current candidates: public/app.js, docs/strategy/vision-and-north-star.md, docs/superpowers/*, and any stale references that still point to superseded docs or UI flows.',
    statusNote: 'Do not delete blindly. First classify each file as canonical, supporting, internal build artifact, or dead weight.',
  },
  {
    id: 'MANDATE-001',
    title: 'Define dual mandates for departments with dual pillar roles',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 28,
    source: 'Department mandates review',
    summary: 'Departments that support more than one pillar should not be flattened into one vague mandate. Define their overall mandate, then break out the specific mandate they carry inside each pillar they influence.',
    whyItMatters: 'If Marketing, Operations, or other cross-functional teams are described too loosely, ownership gets blurry. The system needs to show what each department is responsible for in Attract, Grow, and Retain when those roles split.',
    nextAction: 'When the mandates pass starts, identify departments with dual roles and define both the overall mandate and the pillar-specific mandates they carry.',
    statusNote: 'Captured during the Agent Engine and mandates review so it is handled intentionally, not as a wording patch.',
  },
  {
    id: 'AGENT-002',
    title: 'Build a live strategic operator across leadership and department cadences',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 29,
    source: 'Leadership meeting agent idea',
    summary: 'Create an agent that sits across leadership, strategy, and key department meetings, keeps the room on agenda, asks follow-up questions, captures decisions, turns them into structured work, and can push approved updates into connected systems like backlog, ClickUp, and operating trackers during the meeting.',
    whyItMatters: 'Steve should not have to both lead the business and act as the full-time strategy PM. A strong strategic operator could protect cadence, improve accountability, spot drift across departments, and close the gap between meeting decisions and real system updates.',
    nextAction: 'Define the MVP: live presence across core cadences, agenda enforcement, question prompts, decision extraction, owner/deadline tracking, approval rules for in-meeting system updates, and escalation rules when departments miss commitments or drift off strategy.',
    statusNote: 'Start as a strategic operator across the main business cadences, not a transcript bot and not a fully autonomous meeting boss.',
  },
  {
    id: 'AGENT-003',
    title: 'Add voice-triggered live meeting control for Harlan',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 30,
    source: 'Meeting copilot product idea',
    summary: 'Let Harlan join a Google Meet or business cadence as a live strategic operator that can be activated by voice cues such as “Hey Harlan, kick us off” or “Hey Harlan, what are we missing?”',
    whyItMatters: 'If Harlan can be activated naturally in the room, it becomes much easier to use across leadership and department meetings for kickoff, agenda discipline, question prompting, and approved in-meeting actions without turning the meeting into a manual operator workflow.',
    nextAction: 'Define the first live-meeting interaction model: wake phrase or push-to-talk trigger, Meet audio ingress, interruption rules, participant awareness, approval gates for live system changes, and when Harlan should speak versus stay silent across the main cadences.',
    statusNote: 'This is a voice-control layer on top of AGENT-002, not a replacement for the live strategic operator core.',
  },
  {
    id: 'STRATEGY-005',
    title: 'Define the boundary between Foundation and Strategic Execution',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 30,
    source: 'Foundation architecture review',
    summary: 'Define what stays in Foundation as durable direction and what moves into the next-layer planning module for annual priorities, quarterly sprints, monthly plans, and weekly execution.',
    whyItMatters: 'If Foundation keeps absorbing live strategy execution, it stops being a stable truth layer. If we separate it too early without clear rules, the system becomes confusing.',
    nextAction: 'Write the first boundary note: Foundation = durable vision, values, engine, brands, governance, and mandates. Strategic Execution = annual priorities, quarterly priorities, strategic issues, monthly plans, and weekly follow-through.',
    statusNote: 'This should settle where Quarterly Priorities and Strategic Issues live long term.',
  },
  {
    id: 'MANDATE-002',
    title: 'Separate durable mandates from quarterly execution asks',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 31,
    source: 'Foundation vs execution boundary review',
    summary: 'Keep department mandates durable in Foundation and move quarter-specific asks, focus shifts, and sprint expectations into the execution layer.',
    whyItMatters: 'If mandates change every quarter, they are not mandates. The system needs a clean distinction between a department’s enduring job and the current period’s strategic ask.',
    nextAction: 'Define the rule set for mandates versus quarterly execution expectations before we finalize Department Mandates and the future Strategic Execution module.',
    statusNote: 'Useful before we decide whether departments live partly in Foundation and partly in the next-layer strategy workspace.',
  },
  {
    id: 'SYSTEM-003',
    title: 'Move Foundation out of markdown and into a system-native strategy store',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 32,
    source: 'Foundation architecture review',
    summary: 'Stop treating docs/business-strategy.md as the long-term runtime source. Move durable Foundation strategy into a structured system store, keep live values in source-backed views, and use markdown only as export or backup if we still want it.',
    whyItMatters: 'If the runtime system and agents depend on markdown for canonical truth, we will keep fighting stale content and hybrid confusion. The rebuilt OS should read durable strategy from a structured store and live state from real sources.',
    nextAction: 'Define the first system-native Foundation schema: overview sections, supporting-doc records, source-linked strategy records, versioning rules, and what markdown still does after the migration.',
    statusNote: 'This is the long-term fix for the hybrid markdown bridge we used during the rebuild.',
  },
  {
    id: 'MANDATE-003',
    title: 'Add a How We Know measurement layer to department mandates',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 33,
    source: 'Department mandates research review',
    summary: 'Keep the Foundation mandate wording durable, but define the measurable proof layer that shows whether each department is actually executing its mandate in the live system.',
    whyItMatters: 'Without a measurement layer, mandates can stay accurate on paper while the real system fails underneath them.',
    nextAction: 'Define the first How We Know model: primary KPI proof, visibility rules, failure conditions, and where the measurement layer lives in Strategic Execution versus Foundation.',
    statusNote: 'The durable mandate should stay clean; the proof layer belongs in the next operational layer.',
  },
  {
    id: 'EXEC-001',
    title: 'Define a 48-hour blocker escalation rule',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 34,
    source: 'Department mandates research review',
    summary: 'If a P0 or P1 item is blocked by one person for too long, the system should escalate visibly instead of letting the company freeze around that bottleneck.',
    whyItMatters: 'Leadership rescue and silent blockers are recurring failure modes. The system needs a clear escalation rule, not just goodwill.',
    nextAction: 'Define what counts as a blocker, which items qualify, the escalation timeline, who gets notified, and where the escalation shows up in Strategic Execution and meeting prep.',
    statusNote: 'This came directly out of the old-system intelligence and the current leadership-rescue issue.',
  },
  {
    id: 'SALES-001',
    title: 'Protect the sales leadership lane from deal-production conflict',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Department mandates research review',
    summary: 'Clarify how much personal production can coexist with sales leadership before coaching cadence, standards, and accountability start to slip.',
    whyItMatters: 'The mandate is clear, but the lane can still fail if leadership work keeps getting crowded out by deals.',
    nextAction: 'Define the operating rule for protected sales leadership time, acceptable production overlap, and what evidence shows the lane is no longer protected.',
    statusNote: 'Useful before we lock the growth-side accountability model.',
  },
  {
    id: 'SALES-002',
    title: 'Turn deal-ledger profitability and negotiation fields into coaching signals',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Owners Dashboard deal-ledger walkthrough',
    summary: 'Use the Admin tab to produce real coaching signals around listing transaction-fee capture, LP/SP performance, commission-rate discipline, and signed-to-paid timing instead of leaving those insights trapped in spreadsheet columns.',
    whyItMatters: 'Steve explicitly called out that agents are giving up on transaction fees, that LP/SP should show whether sellers are getting more and buyers are paying less, and that commission-rate discipline matters. These are exactly the kinds of concrete production signals Sales Leadership should be able to coach against.',
    nextAction: 'Define the first coaching metrics from Columns V through AA plus the timing chain in F through I, then decide which ones belong in agent scorecards, manager coaching prompts, and profitability reporting.',
    statusNote: 'Build this on top of cleaned source data. Do not surface coaching metrics before the underlying attribution and integrity checks are good enough.',
  },
  {
    id: 'RETAIN-001',
    title: 'Define weekly retention actions and testimonial ownership',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 36,
    source: 'Department mandates research review',
    summary: 'Turn retention from a vague concept into a visible operating lane with weekly actions, early-risk signals, and a clear owner for testimonials and review capture.',
    whyItMatters: 'Retention is one of the least explicit parts of the current system, and testimonial ownership is falling through the cracks between teams.',
    nextAction: 'Define the weekly retention operating motions, risk signals, testimonial/review ownership, and which parts belong to Retention, Marketing, or Operations.',
    statusNote: 'This should sharpen the RETAIN lane without bloating the Foundation mandate itself.',
  },
  {
    id: 'OPS-001',
    title: 'Map cross-department handoffs in Strategic Execution',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Department mandates review',
    summary: 'Define the key handoff points between departments so the system can show where work, leads, risk, and accountability should pass cleanly from one function to another.',
    whyItMatters: 'Many strategic issues live at the handoff points, not inside one department. If the handoffs stay implicit, blame and drift stay fuzzy.',
    nextAction: 'Draft the first handoff map: Marketing -> Recruiting, Recruiting -> Operations, Sales -> Retention, and any other recurring cross-department transfer points that need clear ownership.',
    statusNote: 'This belongs in Strategic Execution and operating design, not in the durable mandates doc.',
  },
  {
    id: 'PEOPLE-004',
    title: 'Build an org capability and support-gap review layer',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 38,
    source: 'Founder org-design reflection',
    summary: 'Use strategy, meeting history, accountability signals, and real operating output to identify where the organization needs clearer leadership support, better management structure, stronger role fit, or future hiring help.',
    whyItMatters: 'The system should help reveal where the company is structurally weak, where the founder is over-carrying, and where accountable leadership or people support is missing.',
    nextAction: 'Define the first org-capability review: role fit, management load, blocked departments, support gaps, and what should be solved by coaching, redesign, or hiring.',
    statusNote: 'This is not vibe-based HR. It should be grounded in role expectations, evidence, and real operating behavior.',
  },
  {
    id: 'OPS-002',
    title: 'Define team enablement and tool-investment strategy',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 39,
    source: 'Department mandates review',
    summary: 'Define how tools, systems, subscriptions, and internal enablement assets support agent retention, operational leverage, and marketing/recruiting effectiveness without becoming a vague catch-all category.',
    whyItMatters: 'The company is already investing heavily in tools and leverage systems. If that investment stays conceptually fuzzy, ownership, ROI, and strategic fit will stay fuzzy too.',
    nextAction: 'Define the enablement model: which tool investments primarily support Retain, which support Attract, who owns the budget and outcomes, and how the system should measure time-back, leverage, and adoption.',
    statusNote: 'This should likely sit across Operations, Marketing, and Retention rather than becoming its own engine pillar.',
  },
  {
    id: 'PEOPLE-005',
    title: 'Define when shared departments should split as the company scales',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 40,
    source: 'Department mandates review',
    summary: 'Set the future-state criteria for when cross-functional departments should become more specialized teams, such as Attract Marketing vs Retain Marketing or Onboarding vs ongoing Operations.',
    whyItMatters: 'The current structure works only as long as the overlaps are manageable. The system should know what growth conditions trigger a cleaner org split instead of waiting for confusion and overload.',
    nextAction: 'Define the split triggers: workload, pipeline volume, management load, quality drift, backlog pressure, and accountability failure thresholds that justify creating more specialized teams.',
    statusNote: 'Useful for scaling the company without prematurely adding headcount or structure.',
  },
  {
    id: 'MKT-001',
    title: 'Hold major marketing execution until the foundation is locked',
    team: 'marketing',
    lane: 'parked',
    priority: 'P0',
    rank: 1,
    source: 'Leadership decision',
    summary: 'Do not restart the broader marketing machine until strategy, source contracts, and memory spine are trustworthy.',
    whyItMatters: 'The old system moved too fast and scattered attention before the foundation could hold.',
    nextAction: 'Resume after strategy lock and memory foundation checkpoint.',
    statusNote: 'Intentional pause, not abandonment.',
  },
  {
    id: 'MKT-002',
    title: 'Port the old marketing backlog into the new structured system',
    team: 'marketing',
    lane: 'research',
    priority: 'P1',
    rank: 2,
    source: 'Old system migration',
    summary: 'Review old marketing backlog cards, keep the strong work, and re-sequence it in the new system once the base is stable.',
    whyItMatters: 'There is real value in the old backlog, but it needs structure and truth underneath it.',
    nextAction: 'Pull the highest-value items only after the foundation checkpoint.',
    statusNote: 'Deferred until foundation work settles.',
  },
  {
    id: 'MKT-003',
    title: 'Define MarketMasters data sources and measurement model',
    team: 'marketing',
    lane: 'scoped',
    priority: 'P1',
    rank: 3,
    source: 'Strategy support',
    summary: 'Identify how MarketMasters performance will be measured and where those metrics will live.',
    whyItMatters: 'MarketMasters is a strategic vehicle and needs the same source-of-truth discipline as the team engine.',
    nextAction: 'Map current sheets, events, and outreach systems into source IDs.',
    statusNote: 'Scoped, waiting on foundation time.',
  },
]

const decisionsSeed = [
  {
    id: 'DEC-001',
    category: 'foundation',
    title: 'Canonical strategy stays in docs; volatile operating memory moves to the database',
    status: 'locked',
    summary: 'Business strategy and supporting strategy docs remain the human-readable source of truth. Daily-changing work such as backlog items, decisions, sessions, and parking-lot items belongs in the structured memory layer.',
    rationale: 'The old system already proved that markdown backlogs go stale. We want readable docs and durable operational memory, not one thing pretending to be both.',
    sourceRef: 'Old system backlog lessons + rebuild decisions',
  },
  {
    id: 'DEC-002',
    category: 'strategy',
    title: 'North Star distinguishes the team goal from the downline goal',
    status: 'locked',
    summary: 'Benson Crew is building toward a $2B real estate team while growing the combined Benson Crew leadership downline at Real Broker toward 10,000 agents.',
    rationale: 'The $2B target is team production. The 10,000-agent target is the combined leadership downline at Real Broker, not Benson Crew headcount.',
    sourceRef: 'Business strategy lock pass',
  },
  {
    id: 'DEC-003',
    category: 'data',
    title: 'Freedom Sheet sections are now treated as source contracts',
    status: 'locked',
    summary: 'A:E owns team/member data, G:O owns community/downline tracking, P:U owns community revenue, Agent Engine owns live operating assumptions, and BHAG Builder owns long-range targets.',
    rationale: 'The system must reference stable source IDs so the location can change later without breaking every consumer.',
    sourceRef: 'Freedom Sheet verification on 2026-04-12',
  },
  {
    id: 'DEC-004',
    category: 'memory',
    title: 'Start with OpenClaw-native memory plus Postgres business memory',
    status: 'locked',
    summary: 'We are not building the full world-class memory layer from scratch first. We are starting with OpenClaw-native memory for agent recall and Postgres for business memory.',
    rationale: 'This gives us a strong baseline quickly, keeps data local, and leaves room to benchmark Honcho or Hindsight later if recall quality still falls short.',
    sourceRef: 'Memory architecture review',
  },
  {
    id: 'DEC-005',
    category: 'data',
    title: 'Live values come from source contracts, not markdown snapshots',
    status: 'locked',
    summary: 'Strategy docs explain what the numbers mean and which source owns them. The system should render live values from source IDs so changes propagate across the full system.',
    rationale: 'Markdown is good for meaning and rules, but it is the wrong place to act as a live calculator. Source systems own mutable math.',
    sourceRef: 'Strategy lock pass on live source-of-truth rendering',
  },
  {
    id: 'DEC-006',
    category: 'data',
    title: 'Source contracts must power source access in the UI',
    status: 'locked',
    summary: 'Every source-backed view should use structured source-contract metadata for source IDs, status, and open/edit access instead of hardcoded frontend links.',
    rationale: 'If source access lives in ad hoc UI code, users and agents lose trust quickly and the system drifts away from the real source of truth.',
    sourceRef: 'Foundation audit on 2026-04-13',
  },
  {
    id: 'DEC-007',
    category: 'system',
    title: 'The operating system should act as a live strategic operator, not just a passive recorder',
    status: 'locked',
    summary: 'The system should sit across leadership and department cadences, understand what teams are working on, compare activity against strategy and priorities, flag drift or low-value work, and help turn meeting decisions into structured follow-through in connected systems.',
    rationale: 'The point of the operating system is not just to store notes or summarize meetings. It should help keep the business on track in real time by connecting strategy, meetings, accountability, and execution.',
    sourceRef: 'Leadership meeting operator direction on 2026-04-14',
  },
]

const parkingLotSeed = [
  {
    id: 'PARK-001',
    title: 'Benchmark Honcho, Hindsight, and MemClaw after the native baseline is live',
    summary: 'We still want a world-class memory system, but we are not blocking the rebuild on the perfect tool choice before the baseline is enabled.',
    owner: 'Dev',
  },
  {
    id: 'PARK-002',
    title: 'Plan how to internalize scattered spreadsheet logic over time',
    summary: 'Some sheet logic will stay external for now, but we want a path to pull fragile source-of-truth math into the system where it makes sense.',
    owner: 'Dev',
  },
]

const openQuestionsSeed = [
  {
    id: 'Q-001',
    title: 'What is the final definition of the live attrition metric in the Agent Engine?',
    summary: 'We improved the formula, but we still need to decide the official business definition we will carry into system logic and reporting.',
    owner: 'Strategy',
  },
  {
    id: 'Q-002',
    title: 'Which external sources should stay external versus be internalized over time?',
    summary: 'We want clear source-of-truth contracts now and a migration path later for sources that are too scattered or brittle.',
    owner: 'Strategy',
  },
  {
    id: 'Q-003',
    title: 'Where should partner commissions be normalized in the finance stack?',
    summary: 'We now know partner commissions are intentionally backed out of top-line revenue and owners expense in `Cashflow Dash`, but we still need the canonical rule for whether that normalization should live in Weekly Actuals, the roll-up layers, or stay only in the dashboard interpretation layer.',
    owner: 'Finance',
  },
  {
    id: 'Q-004',
    title: 'What is the final row grain of the Owners Dashboard Admin tab?',
    summary: 'Trade numbers can repeat when one deal is split across multiple agents, and paid-to-team cash can live on only one row while credits live on several rows. We need the canonical row definition before building serious validations or derived metrics on top of the tab.',
    owner: 'Operations',
  },
  {
    id: 'Q-005',
    title: 'What are the remaining unresolved Admin-tab field definitions?',
    summary: 'After the full-tab audit, the remaining Admin-tab unknowns are narrower: the final row-grain definition, which legacy-era fields still matter enough to preserve in reporting, and whether any old anonymized or malformed patterns need explicit mapping rules instead of simple cleanup.',
    owner: 'Operations',
  },
]

const memoryStatusSeed = [
  {
    componentKey: 'strategy-docs',
    label: 'Strategy Docs',
    status: 'live',
    detail: 'Canonical strategy and supporting docs live in the repo and are rendered in the dashboard.',
  },
  {
    componentKey: 'business-db',
    label: 'Business Memory DB',
    status: 'live',
    detail: 'PostgreSQL is running locally on the Mac mini and is now backing the first memory/backlog layer.',
  },
  {
    componentKey: 'openclaw-native-memory',
    label: 'OpenClaw Native Memory',
    status: 'pending',
    detail: 'The OpenClaw workspace is pointed at the repo, but native memory plugins still need to be configured and tested.',
  },
  {
    componentKey: 'shared-cross-tool-memory',
    label: 'Advanced Shared Memory',
    status: 'planned',
    detail: 'Honcho, Hindsight, and MemClaw stay on the evaluation path after the native baseline is working.',
  },
  {
    componentKey: 'source-health',
    label: 'Source Health Monitoring',
    status: 'planned',
    detail: 'Freedom Sheet adapters and schema-drift alerts are not wired yet. They are a near-term dev priority.',
  },
]

const BHAG_DOC_PATH = 'docs/strategy/bhag-model.md'
const AGENT_ENGINE_DOC_PATH = 'docs/strategy/agent-engine.md'
const FREEDOM_SHEET_ID = '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw'
const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const TORONTO_TIMEZONE = 'America/Toronto'
const MONTH_INDEX = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
}

const docSourceSnapshotsSeed = [
  {
    id: 'DOCSNAP-001',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2026',
    value: '$310M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 1,
  },
  {
    id: 'DOCSNAP-002',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2027',
    value: '$341M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 2,
  },
  {
    id: 'DOCSNAP-003',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2028',
    value: '$392M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 3,
  },
  {
    id: 'DOCSNAP-004',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2029',
    value: '$471M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 4,
  },
  {
    id: 'DOCSNAP-005',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2030',
    value: '$588M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 5,
  },
  {
    id: 'DOCSNAP-006',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2031',
    value: '$751M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 6,
  },
  {
    id: 'DOCSNAP-007',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2032',
    value: '$960M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 7,
  },
  {
    id: 'DOCSNAP-008',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2033',
    value: '$1.23B',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 8,
  },
  {
    id: 'DOCSNAP-009',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2034',
    value: '$1.57B',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 9,
  },
  {
    id: 'DOCSNAP-010',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2035',
    value: '$2.0B',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 10,
  },
  {
    id: 'DOCSNAP-011',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-OWNERS-001',
    groupTitle: 'Team Goal: $2B',
    label: 'Actual',
    value: '$43.95M YTD',
    detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in 2026).',
    asOf: '2026-04-12',
    sortOrder: 11,
  },
  {
    id: 'DOCSNAP-012',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-OWNERS-001',
    groupTitle: 'Team Goal: $2B',
    label: 'Pace',
    value: 'Behind by $41.79M (-48.7%)',
    detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in 2026).',
    asOf: '2026-04-12',
    sortOrder: 12,
  },
  {
    id: 'DOCSNAP-015',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2026',
    value: '700 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 1,
  },
  {
    id: 'DOCSNAP-016',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2027',
    value: '770 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 2,
  },
  {
    id: 'DOCSNAP-017',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2028',
    value: '886 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 3,
  },
  {
    id: 'DOCSNAP-018',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2029',
    value: '1,063 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 4,
  },
  {
    id: 'DOCSNAP-019',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2030',
    value: '1,329 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 5,
  },
  {
    id: 'DOCSNAP-020',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2031',
    value: '1,990 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 6,
  },
  {
    id: 'DOCSNAP-021',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2032',
    value: '2,980 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 7,
  },
  {
    id: 'DOCSNAP-022',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2033',
    value: '4,462 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 8,
  },
  {
    id: 'DOCSNAP-023',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2034',
    value: '6,681 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 9,
  },
  {
    id: 'DOCSNAP-024',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2035',
    value: '10,000 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 10,
  },
  {
    id: 'DOCSNAP-025',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Started 2026',
    value: '643 agents',
    detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
    asOf: '2026-01-01',
    sortOrder: 11,
  },
  {
    id: 'DOCSNAP-032',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Actual',
    value: '675 agents',
    detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
    asOf: '2026-04-01',
    sortOrder: 12,
  },
  {
    id: 'DOCSNAP-033',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Pace',
    value: 'Behind by 25 agents (-3.6%)',
    detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
    asOf: '2026-04-01',
    sortOrder: 13,
  },
]

function getTorontoDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })

  return formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      acc[part.type] = Number(part.value)
    }
    return acc
  }, {})
}

function getTodayTorontoIso() {
  const parts = getTorontoDateParts()
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function getDayOfYearToronto() {
  const parts = getTorontoDateParts()
  const start = Date.UTC(parts.year, 0, 1)
  const current = Date.UTC(parts.year, parts.month - 1, parts.day)
  return Math.floor((current - start) / 86400000) + 1
}

function daysInTorontoYear(year) {
  return new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29 ? 366 : 365
}

function parseNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const normalized = value.replace(/[$,%\s,]/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function sheetSerialToDate(serial) {
  const numeric = parseNumber(serial)
  if (!Number.isFinite(numeric)) return null
  return new Date(Math.round((numeric - 25569) * 86400 * 1000))
}

function formatCompactCurrency(value) {
  const numeric = parseNumber(value) || 0
  const abs = Math.abs(numeric)

  if (abs >= 1_000_000_000) return `$${(numeric / 1_000_000_000).toFixed(2).replace(/\.00$/, '')}B`
  if (abs >= 1_000_000) return `$${(numeric / 1_000_000).toFixed(0)}M`
  if (abs >= 1_000) return `$${(numeric / 1_000).toFixed(0)}K`
  return `$${Math.round(numeric)}`
}

function formatAgentCount(value) {
  const numeric = Math.round(parseNumber(value) || 0)
  return `${numeric.toLocaleString('en-CA')} agents`
}

function formatAgentCountPrecise(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const rounded = Math.round(numeric * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} agents`
}

function formatAgentCountCeil(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.ceil(numeric).toLocaleString('en-CA')} agents`
}

function formatMonthlyAgentRate(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const rounded = Math.round(numeric * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} / mo`
}

function formatPercent(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.round(numeric * 100)}%`
}

function formatCurrencyDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return formatCompactCurrency(Math.abs(numeric))
}

function formatAgentDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.round(Math.abs(numeric)).toLocaleString('en-CA')} agents`
}

function formatPointDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const points = Math.abs(numeric * 100)
  const rounded = Math.round(points * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} pts`
}

function formatPaceLabel(diff, unitFormatter) {
  const abs = Math.abs(diff)
  const direction = diff >= 0 ? 'Ahead' : 'Behind'
  return `${direction} by ${unitFormatter(abs)}`
}

function formatPaceWithPercent(diff, baseline, unitFormatter) {
  const pct = baseline ? Math.abs(diff) / baseline : 0
  const sign = diff >= 0 ? '+' : '-'
  return `${formatPaceLabel(diff, unitFormatter)} (${sign}${(pct * 100).toFixed(1)}%)`
}

function monthYearToIso(monthName, year) {
  const monthKey = String(monthName || '').trim().toLowerCase()
  const monthIndex = MONTH_INDEX[monthKey]
  const numericYear = parseNumber(year)
  if (monthIndex == null || !numericYear) return getTodayTorontoIso()
  return `${numericYear}-${String(monthIndex + 1).padStart(2, '0')}-01`
}

function buildBhagYearRows(groupTitle, rows, sourceId, detail, valueFormatter, startYear = 2026) {
  return rows.flatMap((row, index) => {
    const yearLabel = String(startYear + index)
    return [
      {
        docPath: BHAG_DOC_PATH,
        sourceId,
        groupTitle,
        label: yearLabel,
        value: valueFormatter(row[0]),
        detail,
        asOf: getTodayTorontoIso(),
        sortOrder: index + 1,
      },
      {
        docPath: BHAG_DOC_PATH,
        sourceId,
        groupTitle,
        label: `Growth ${yearLabel}`,
        value: formatPercent(row[1]),
        detail,
        asOf: getTodayTorontoIso(),
        sortOrder: 100 + index + 1,
      },
    ]
  })
}

function buildEngineMetricRow(groupTitle, label, value, detail, sortOrder, sourceId = 'SRC-FREEDOM-ENGINE-001') {
  return {
    docPath: AGENT_ENGINE_DOC_PATH,
    sourceId,
    groupTitle,
    label,
    value,
    detail,
    asOf: getTodayTorontoIso(),
    sortOrder,
  }
}

async function getLiveAgentEngineSourceSnapshot() {
  const currentYear = getTorontoDateParts().year
  const yearStart = 2026
  const [bhagCalcRes, bhagTargetsRes, engineRes] = await Promise.all([
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!A22:B31"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K4:L13"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Agent Engine'!A1:K10"),
  ])

  const calcRows = bhagCalcRes.values || []
  const calcMap = {}
  calcRows.forEach(row => {
    const key = String(row?.[0] || '').trim()
    if (!key || row?.[1] == null) return
    calcMap[key] = row[1]
  })

  const annualVolumeAverage = parseNumber(calcMap['Annual Volume Average'])
  const teamSplit = parseNumber(calcMap['Split to Team'])
  const monthlyGciAverage = parseNumber(calcMap['Average Monthly GCI'])
  const planningAttritionAssumption = parseNumber(calcMap['Planning Attrition Assumption'])

  const targetRows = (bhagTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))

  const values = engineRes.values || []
  const requiredRecruitingPace = parseNumber(values[2]?.[1])
  const recruitingSixMonth = parseNumber(values[3]?.[1])
  const attritionRate = parseNumber(values[4]?.[1])
  const avgAdditions = parseNumber(values[5]?.[1])
  const avgAttrition = parseNumber(values[6]?.[1])

  const activeAgents = parseNumber(values[2]?.[4])

  const avgProduction = parseNumber(values[2]?.[7])
  const productionTarget = Number.isFinite(monthlyGciAverage)
    ? monthlyGciAverage
    : parseNumber(values[3]?.[7])

  const actualSplit = parseNumber(values[2]?.[10])
  const targetSplit = parseNumber(values[3]?.[10])

  const currentYearIndex = Math.max(0, Math.min(currentYear - yearStart, targetRows.length - 1))
  const currentYearVolumeTarget = targetRows[currentYearIndex]?.[0]
  const requiredAgentsThisYear = Number.isFinite(currentYearVolumeTarget) && Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
    ? currentYearVolumeTarget / annualVolumeAverage
    : null
  const requiredAgentsThisYearDisplay = Number.isFinite(requiredAgentsThisYear)
    ? Math.ceil(requiredAgentsThisYear)
    : null

  const nextYear = Math.min(currentYear + 1, yearStart + targetRows.length - 1)
  const nextYearIndex = Math.max(0, nextYear - yearStart)
  const nextYearVolumeTarget = targetRows[nextYearIndex]?.[0]
  const requiredStartAgents = Number.isFinite(nextYearVolumeTarget) && Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
    ? nextYearVolumeTarget / annualVolumeAverage
    : parseNumber(values[3]?.[4])
  const requiredStartAgentsDisplay = Number.isFinite(requiredStartAgents)
    ? Math.ceil(requiredStartAgents)
    : null

  const recruitingGap = Number.isFinite(requiredRecruitingPace) && Number.isFinite(recruitingSixMonth)
    ? recruitingSixMonth - requiredRecruitingPace
    : null
  const capacityGap = Number.isFinite(activeAgents) && Number.isFinite(requiredStartAgentsDisplay)
    ? activeAgents - requiredStartAgentsDisplay
    : parseNumber(values[4]?.[4])
  const currentYearGap = Number.isFinite(activeAgents) && Number.isFinite(requiredAgentsThisYearDisplay)
    ? activeAgents - requiredAgentsThisYearDisplay
    : null
  const splitGap = Number.isFinite(actualSplit) && Number.isFinite(targetSplit)
    ? actualSplit - targetSplit
    : parseNumber(values[4]?.[10])
  const productionGap = Number.isFinite(avgProduction) && Number.isFinite(productionTarget)
    ? avgProduction - productionTarget
    : null

  const inputsDetail = 'Live productivity and unit-economics assumptions from the Benson Crew BHAG Builder.'
  const pathDetail = 'Required agent counts at the current annual volume average per agent.'
  const requirementBhagDetail = 'What the model needs next, using the BHAG builder and current productivity assumption.'
  const requirementEngineDetail = 'Current recruiting and capacity read from the Freedom KPI Sheet Agent Engine tab.'

  const snapshot = [
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Engine Inputs',
      label: 'Average Monthly GCI',
      value: `${formatCompactCurrency(monthlyGciAverage)} / mo`,
      detail: inputsDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 1,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Engine Inputs',
      label: 'Split to Team',
      value: formatPercent(teamSplit),
      detail: inputsDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 2,
    },
  ]

  targetRows.forEach((row, index) => {
    const yearLabel = String(yearStart + index)
    const requiredAgents = Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
      ? row[0] / annualVolumeAverage
      : null

    snapshot.push(
      {
        docPath: AGENT_ENGINE_DOC_PATH,
        sourceId: 'SRC-FREEDOM-BHAG-001',
        groupTitle: 'Required Agent Path',
        label: yearLabel,
        value: formatCompactCurrency(row[0]),
        detail: pathDetail,
        asOf: getTodayTorontoIso(),
        sortOrder: index + 1,
      },
      {
        docPath: AGENT_ENGINE_DOC_PATH,
        sourceId: 'SRC-FREEDOM-BHAG-001',
        groupTitle: 'Required Agent Path',
        label: `Required Agents ${yearLabel}`,
        value: formatAgentCountCeil(requiredAgents),
        detail: pathDetail,
        asOf: getTodayTorontoIso(),
        sortOrder: 100 + index + 1,
      },
    )
  })

  snapshot.push(
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Current-Year Volume Target',
      value: formatCompactCurrency(currentYearVolumeTarget),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 1,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Required Agents This Year',
      value: formatAgentCountCeil(requiredAgentsThisYearDisplay),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 2,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Next-Year Volume Target',
      value: formatCompactCurrency(nextYearVolumeTarget),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 3,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Required Start-of-Year Agents',
      value: formatAgentCountCeil(requiredStartAgentsDisplay),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 4,
    },
    buildEngineMetricRow('Current Requirement', 'Current Active Agents', formatAgentCountPrecise(activeAgents), requirementEngineDetail, 5),
    buildEngineMetricRow('Current Requirement', 'Gap This Year', formatPaceWithPercent(currentYearGap, requiredAgentsThisYearDisplay, formatAgentDelta), requirementEngineDetail, 6),
    buildEngineMetricRow('Current Requirement', 'Gap to Next Year', formatPaceWithPercent(capacityGap, requiredStartAgentsDisplay, formatAgentDelta), requirementEngineDetail, 7),
    buildEngineMetricRow('Current Requirement', 'Required Recruiting Pace', formatMonthlyAgentRate(requiredRecruitingPace), requirementEngineDetail, 8),
    buildEngineMetricRow('Current Requirement', 'Current Recruiting Pace', formatMonthlyAgentRate(recruitingSixMonth), requirementEngineDetail, 9),
    buildEngineMetricRow('Current Requirement', 'Current Avg Production / Agent', `${formatCompactCurrency(avgProduction)} / mo`, requirementEngineDetail, 10),
    buildEngineMetricRow('Current Requirement', 'Production Target / Agent', `${formatCompactCurrency(productionTarget)} / mo`, requirementBhagDetail, 11, 'SRC-FREEDOM-BHAG-001'),
    buildEngineMetricRow('Current Requirement', 'Production Gap', formatPaceWithPercent(productionGap, productionTarget, formatCurrencyDelta), requirementEngineDetail, 12),
    buildEngineMetricRow(
      'Current Requirement',
      'Planning Attrition Assumption',
      formatPercent(planningAttritionAssumption),
      'The planning attrition rate now comes from the BHAG builder assumptions and feeds the required recruiting formula.',
      13,
      'SRC-FREEDOM-BHAG-001'
    ),
    buildEngineMetricRow('Current Requirement', 'Live Attrition Pressure', formatPercent(attritionRate), requirementEngineDetail, 14),
    buildEngineMetricRow('Current Requirement', 'Avg Additions / Month', formatMonthlyAgentRate(avgAdditions), requirementEngineDetail, 15),
    buildEngineMetricRow('Current Requirement', 'Avg Attrition / Month', formatMonthlyAgentRate(avgAttrition), requirementEngineDetail, 16),
    buildEngineMetricRow('Current Requirement', 'Actual Split', formatPercent(actualSplit), requirementEngineDetail, 17),
    buildEngineMetricRow('Current Requirement', 'Target Split', formatPercent(targetSplit), requirementEngineDetail, 18),
    buildEngineMetricRow('Current Requirement', 'Split Gap', `${splitGap >= 0 ? 'Above target' : 'Below target'} by ${formatPointDelta(splitGap)}`, requirementEngineDetail, 19),
  )

  return snapshot
}

async function getLiveBhagSourceSnapshot() {
  const currentYear = getTorontoDateParts().year
  const yearStart = 2026
  const [teamTargetsRes, communityTargetsRes, communityTrackerRes, ownersRes] = await Promise.all([
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K4:L13"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K20:L29"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Data Entry - BCrew Team/Community'!G1:O80"),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'ADMIN ONLY - Deal Data Entry'!G:AI"),
  ])

  const teamTargetRows = (teamTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))
  const communityTargetRows = (communityTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))

  const snapshot = []
  snapshot.push(
    ...buildBhagYearRows(
      'Team Goal: $2B',
      teamTargetRows,
      'SRC-FREEDOM-BHAG-001',
      'Live 2026-2035 team target path from the Benson Crew BHAG Builder.',
      formatCompactCurrency,
      yearStart,
    ),
  )

  const teamCurrentTarget = teamTargetRows[currentYear - yearStart]?.[0] || teamTargetRows[0]?.[0] || 0
  const ownersRows = ownersRes.values || []
  const ownersHeader = ownersRows[0] || []
  const volumeIdx = ownersHeader.findIndex(value => String(value).trim() === 'Volume Credit')
  let actualVolumeYtd = 0

  ownersRows.slice(1).forEach(row => {
    const executedDate = sheetSerialToDate(row[0])
    const volumeCredit = parseNumber(row[volumeIdx])
    if (!executedDate || !Number.isFinite(volumeCredit)) return
    if (executedDate.getUTCFullYear() !== currentYear) return
    actualVolumeYtd += volumeCredit
  })

  const targetToDate = teamCurrentTarget * (getDayOfYearToronto() / daysInTorontoYear(currentYear))
  const teamDiff = actualVolumeYtd - targetToDate
  snapshot.push(
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Should Be',
      value: formatCompactCurrency(targetToDate),
      detail: 'Prorated team target-to-date for the current year, based on Eastern time.',
      asOf: getTodayTorontoIso(),
      sortOrder: 11,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Actual',
      value: `${formatCompactCurrency(actualVolumeYtd)} YTD`,
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 12,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Pace',
      value: formatPaceWithPercent(teamDiff, targetToDate, formatCompactCurrency),
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 13,
    },
  )

  snapshot.push(
    ...buildBhagYearRows(
      'Community Goal: 10,000 Agents',
      communityTargetRows,
      'SRC-FREEDOM-BHAG-001',
      'Live 2026-2035 community target path from the Benson Crew BHAG Builder.',
      formatAgentCount,
      yearStart,
    ),
  )

  const communityRows = (communityTrackerRes.values || []).slice(2).map(row => ({
    month: row[0],
    year: parseNumber(row[1]),
    totalCommunity: parseNumber(row[3]),
  }))
  const currentYearCommunityRows = communityRows.filter(row => row.year === currentYear && Number.isFinite(row.totalCommunity) && row.totalCommunity > 0)
  const startedRow = currentYearCommunityRows[0] || null
  const latestRow = currentYearCommunityRows[currentYearCommunityRows.length - 1] || null
  const communityCurrentTarget = communityTargetRows[currentYear - yearStart]?.[0] || communityTargetRows[0]?.[0] || 0
  const communityStarted = startedRow?.totalCommunity || 0
  const actualCommunity = latestRow?.totalCommunity || 0
  const communityTargetToDate = communityStarted + ((communityCurrentTarget - communityStarted) * (getDayOfYearToronto() / daysInTorontoYear(currentYear)))
  const communityDiff = actualCommunity - communityTargetToDate

  snapshot.push(
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Should Be',
      value: formatAgentCount(communityTargetToDate),
      detail: 'Prorated community target-to-date for the current year, based on Eastern time.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 12,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Actual',
      value: formatAgentCount(actualCommunity),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 13,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Pace',
      value: formatPaceWithPercent(communityDiff, communityTargetToDate, formatAgentCount),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 14,
    },
  )

  return snapshot
}

async function seedTable(client, tableName, rows, insertSql, valuesBuilder) {
  for (const row of rows) {
    const values = valuesBuilder(row)
    await client.query(insertSql, values)
  }
}

function getBacklogIdPrefixes() {
  return Array.from(new Set(backlogSeed.map(item => String(item.id || '').split('-')[0]).filter(Boolean))).sort()
}

function mapBacklogRow(row) {
  return {
    id: row.id,
    title: row.title,
    team: row.team,
    lane: row.lane,
    priority: row.priority,
    rank: row.rank,
    source: row.source,
    summary: row.summary,
    whyItMatters: row.why_it_matters ?? row.whyItMatters,
    nextAction: row.next_action ?? row.nextAction,
    statusNote: row.status_note ?? row.statusNote,
    owner: row.owner,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapDecisionRow(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    status: row.status,
    summary: row.summary,
    rationale: row.rationale,
    sourceRef: row.source_ref ?? row.sourceRef,
    classifiedAt: row.classified_at ?? row.classifiedAt,
    classifiedBy: row.classified_by ?? row.classifiedBy,
    supersedesIds: row.supersedes_ids ?? row.supersedesIds ?? [],
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapOpenQuestionRow(row) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    owner: row.owner,
    status: row.status || 'open',
    resolvedAt: row.resolved_at ?? row.resolvedAt,
    resolvedBy: row.resolved_by ?? row.resolvedBy,
    resolutionNote: row.resolution_note ?? row.resolutionNote,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapPendingDocUpdateRow(row) {
  return {
    id: row.id,
    decisionId: row.decision_id ?? row.decisionId,
    decisionTitle: row.decision_title ?? row.decisionTitle,
    targetDocPath: row.target_doc_path ?? row.targetDocPath,
    targetSection: row.target_section ?? row.targetSection,
    summary: row.summary,
    currentText: row.current_text ?? row.currentText,
    proposedText: row.proposed_text ?? row.proposedText,
    proposedDiff: row.proposed_diff ?? row.proposedDiff,
    status: row.status,
    proposedAt: row.proposed_at ?? row.proposedAt,
    proposedBy: row.proposed_by ?? row.proposedBy,
    reviewedAt: row.reviewed_at ?? row.reviewedAt,
    reviewedBy: row.reviewed_by ?? row.reviewedBy,
    appliedAt: row.applied_at ?? row.appliedAt,
    appliedCommit: row.applied_commit ?? row.appliedCommit,
    expiresAt: row.expires_at ?? row.expiresAt,
    metadata: row.metadata || {},
  }
}

function mapChangeEventRow(row) {
  return {
    id: row.id,
    eventType: row.event_type ?? row.eventType,
    entityTable: row.entity_table ?? row.entityTable,
    entityId: row.entity_id ?? row.entityId,
    actor: row.actor,
    summary: row.summary,
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt,
  }
}

async function withFoundationTransaction(work) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback failures and rethrow the original error.
    }
    throw error
  } finally {
    client.release()
  }
}

async function insertChangeEvent(client, event) {
  await client.query(
    `
      INSERT INTO change_events (
        event_type, entity_table, entity_id, actor, summary, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    `,
    [
      event.eventType,
      event.entityTable,
      event.entityId,
      event.actor,
      event.summary,
      JSON.stringify(event.metadata || {}),
    ]
  )
}

function getNumericSuffix(id, prefix) {
  const match = String(id || '').match(new RegExp(`^${prefix}-(\\d+)$`))
  return match ? Number(match[1]) : 0
}

async function getNextPrefixedId(client, tableName, prefix) {
  const normalizedPrefix = String(prefix || '').trim().toUpperCase()
  if (!normalizedPrefix) throw new Error('A valid ID prefix is required.')

  const result = await client.query(
    `
      SELECT id
      FROM ${tableName}
      WHERE id LIKE $1
      ORDER BY id DESC
    `,
    [`${normalizedPrefix}-%`]
  )

  const nextNumber = result.rows.reduce((max, row) => {
    return Math.max(max, getNumericSuffix(row.id, normalizedPrefix))
  }, 0) + 1

  return `${normalizedPrefix}-${String(nextNumber).padStart(3, '0')}`
}

export async function initFoundationDb() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS backlog_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        team TEXT NOT NULL CHECK (team IN ('dev', 'marketing')),
        lane TEXT NOT NULL CHECK (lane IN ('research', 'scoped', 'ranked', 'executing', 'parked', 'done')),
        priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
        rank INTEGER,
        source TEXT,
        summary TEXT,
        why_it_matters TEXT,
        next_action TEXT,
        status_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_backlog_team_lane_rank
      ON backlog_items(team, lane, rank, created_at);

      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('locked', 'proposed', 'superseded')),
        summary TEXT NOT NULL,
        rationale TEXT,
        source_ref TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_decisions_status_category
      ON decisions(status, category, created_at DESC);

      CREATE TABLE IF NOT EXISTS parking_lot_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS open_questions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS memory_system_status (
        component_key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('live', 'pending', 'planned', 'risk')),
        detail TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS doc_source_snapshots (
        id TEXT PRIMARY KEY,
        doc_path TEXT NOT NULL,
        source_id TEXT NOT NULL,
        group_title TEXT NOT NULL,
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        detail TEXT,
        as_of DATE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_doc_source_snapshots_doc_path
      ON doc_source_snapshots(doc_path, group_title, sort_order, created_at);
    `)

    await client.query(`
      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS classified_by TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS supersedes_ids TEXT[];

      UPDATE decisions
      SET classified_at = COALESCE(classified_at, created_at)
      WHERE classified_at IS NULL;

      ALTER TABLE backlog_items
      ADD COLUMN IF NOT EXISTS owner TEXT;

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

      ALTER TABLE open_questions
      DROP CONSTRAINT IF EXISTS open_questions_status_check;

      ALTER TABLE open_questions
      ADD CONSTRAINT open_questions_status_check
      CHECK (status IN ('open', 'resolved'));

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolved_by TEXT;

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolution_note TEXT;

      UPDATE open_questions
      SET status = COALESCE(status, 'open')
      WHERE status IS NULL;

      CREATE TABLE IF NOT EXISTS pending_doc_updates (
        id TEXT PRIMARY KEY,
        decision_id TEXT REFERENCES decisions(id),
        target_doc_path TEXT NOT NULL,
        target_section TEXT,
        summary TEXT NOT NULL,
        current_text TEXT,
        proposed_text TEXT NOT NULL,
        proposed_diff TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'expired', 'failed')),
        proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        proposed_by TEXT NOT NULL,
        reviewed_at TIMESTAMPTZ,
        reviewed_by TEXT,
        applied_at TIMESTAMPTZ,
        applied_commit TEXT,
        expires_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_status
      ON pending_doc_updates(status);

      CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_decision
      ON pending_doc_updates(decision_id);

      CREATE TABLE IF NOT EXISTS change_events (
        id BIGSERIAL PRIMARY KEY,
        event_type TEXT NOT NULL
          CHECK (event_type IN (
            'decision_proposed', 'decision_classified', 'decision_locked', 'decision_superseded',
            'backlog_created', 'backlog_status_changed', 'backlog_updated',
            'question_created', 'question_updated', 'question_resolved', 'question_reopened',
            'doc_update_proposed', 'doc_update_approved', 'doc_update_applied', 'doc_update_rejected', 'doc_update_failed'
          )),
        entity_table TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        summary TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_change_events_created_at
      ON change_events(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_change_events_entity
      ON change_events(entity_table, entity_id);
    `)

    await seedTable(
      client,
      'backlog_items',
      backlogSeed,
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [
        row.id,
        row.title,
        row.team,
        row.lane,
        row.priority,
        row.rank,
        row.source,
        row.summary,
        row.whyItMatters,
        row.nextAction,
        row.statusNote,
      ]
    )

    await seedTable(
      client,
      'decisions',
      decisionsSeed,
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [row.id, row.category, row.title, row.status, row.summary, row.rationale, row.sourceRef]
    )

    await seedTable(
      client,
      'parking_lot_items',
      parkingLotSeed,
      `
        INSERT INTO parking_lot_items (id, title, summary, owner)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [row.id, row.title, row.summary, row.owner]
    )

    await seedTable(
      client,
      'open_questions',
      openQuestionsSeed,
      `
        INSERT INTO open_questions (id, title, summary, owner)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [row.id, row.title, row.summary, row.owner]
    )

    await seedTable(
      client,
      'memory_system_status',
      memoryStatusSeed,
      `
        INSERT INTO memory_system_status (component_key, label, status, detail)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (component_key) DO NOTHING
      `,
      row => [row.componentKey, row.label, row.status, row.detail]
    )

    await client.query(
      `
        DELETE FROM doc_source_snapshots
        WHERE doc_path = $1
      `,
      ['docs/strategy/bhag-model.md']
    )

    await seedTable(
      client,
      'doc_source_snapshots',
      docSourceSnapshotsSeed,
      `
        INSERT INTO doc_source_snapshots (
          id, doc_path, source_id, group_title, label, value, detail, as_of, sort_order
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET
          doc_path = EXCLUDED.doc_path,
          source_id = EXCLUDED.source_id,
          group_title = EXCLUDED.group_title,
          label = EXCLUDED.label,
          value = EXCLUDED.value,
          detail = EXCLUDED.detail,
          as_of = EXCLUDED.as_of,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `,
      row => [
        row.id,
        row.docPath,
        row.sourceId,
        row.groupTitle,
        row.label,
        row.value,
        row.detail,
        row.asOf,
        row.sortOrder,
      ]
    )

    await client.query('COMMIT')
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback failures and rethrow the original startup error.
    }
    throw error
  } finally {
    client.release()
  }
}

export async function getFoundationSnapshot() {
  const [backlogResult, decisionsResult, parkingResult, questionsResult, memoryStatusResult, pendingDocUpdatesResult, recentChangesResult] =
    await Promise.all([
      pool.query(`
        SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters AS "whyItMatters",
               next_action AS "nextAction", status_note AS "statusNote", owner, created_at, updated_at
        FROM backlog_items
        ORDER BY team ASC, rank NULLS LAST, created_at ASC
      `),
      pool.query(`
        SELECT id, category, title, status, summary, rationale, source_ref,
               classified_at, classified_by, supersedes_ids, created_at, updated_at
        FROM decisions
        ORDER BY created_at ASC
      `),
      pool.query(`
        SELECT id, title, summary, owner, created_at, updated_at
        FROM parking_lot_items
        ORDER BY created_at ASC
      `),
      pool.query(`
        SELECT id, title, summary, owner, status, resolved_at, resolved_by, resolution_note, created_at, updated_at
        FROM open_questions
        ORDER BY status ASC, created_at ASC
      `),
      pool.query(`
        SELECT component_key AS "componentKey", label, status, detail, updated_at AS "updatedAt"
        FROM memory_system_status
        ORDER BY label ASC
      `),
      pool.query(`
        SELECT p.id, p.decision_id, d.title AS decision_title, p.target_doc_path, p.target_section, p.summary,
               p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
               p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
        FROM pending_doc_updates p
        LEFT JOIN decisions d ON d.id = p.decision_id
        ORDER BY p.proposed_at DESC
      `),
      pool.query(`
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        ORDER BY created_at DESC
        LIMIT 20
      `),
    ])

  return {
    backlogItems: backlogResult.rows.map(mapBacklogRow),
    decisions: decisionsResult.rows.map(mapDecisionRow),
    parkingLot: parkingResult.rows,
    openQuestions: questionsResult.rows.map(mapOpenQuestionRow),
    memoryStatus: memoryStatusResult.rows,
    pendingDocUpdates: pendingDocUpdatesResult.rows.map(mapPendingDocUpdateRow),
    recentChanges: recentChangesResult.rows.map(mapChangeEventRow),
    meta: {
      canonicalDecisionCategories,
      backlogIdPrefixes: getBacklogIdPrefixes(),
    },
  }
}

export function getCanonicalDecisionCategories() {
  return canonicalDecisionCategories.slice()
}

export function getFoundationBacklogIdPrefixes() {
  return getBacklogIdPrefixes()
}

export async function getRecentChangeEvents(limit = 20) {
  const result = await pool.query(
    `
      SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
      FROM change_events
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit]
  )

  return result.rows.map(mapChangeEventRow)
}

export async function createBacklogItem(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'backlog_items', input.idPrefix)
    const result = await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
      `,
      [
        id,
        input.title,
        input.team,
        input.lane,
        input.priority,
        input.rank ?? null,
        input.source ?? null,
        input.summary ?? null,
        input.whyItMatters ?? null,
        input.nextAction ?? null,
        input.statusNote ?? null,
        input.owner ?? null,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'backlog_created',
      entityTable: 'backlog_items',
      entityId: id,
      actor,
      summary: `Created backlog item ${id}: ${input.title}`,
      metadata: {
        lane: input.lane,
        priority: input.priority,
        team: input.team,
      },
    })

    return mapBacklogRow(result.rows[0])
  })
}

export async function updateBacklogItem(id, input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(`SELECT * FROM backlog_items WHERE id = $1`, [id])
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Backlog item not found: ${id}`)

    const nextRow = {
      title: input.title ?? existing.title,
      team: input.team ?? existing.team,
      lane: input.lane ?? existing.lane,
      priority: input.priority ?? existing.priority,
      rank: input.rank ?? existing.rank,
      source: input.source ?? existing.source,
      summary: input.summary ?? existing.summary,
      why_it_matters: input.whyItMatters ?? existing.why_it_matters,
      next_action: input.nextAction ?? existing.next_action,
      status_note: input.statusNote ?? existing.status_note,
      owner: input.owner ?? existing.owner,
    }

    const result = await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            team = $3,
            lane = $4,
            priority = $5,
            rank = $6,
            source = $7,
            summary = $8,
            why_it_matters = $9,
            next_action = $10,
            status_note = $11,
            owner = $12,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        nextRow.title,
        nextRow.team,
        nextRow.lane,
        nextRow.priority,
        nextRow.rank,
        nextRow.source,
        nextRow.summary,
        nextRow.why_it_matters,
        nextRow.next_action,
        nextRow.status_note,
        nextRow.owner,
      ]
    )

    const laneChanged = existing.lane !== nextRow.lane
    await insertChangeEvent(client, {
      eventType: laneChanged ? 'backlog_status_changed' : 'backlog_updated',
      entityTable: 'backlog_items',
      entityId: id,
      actor,
      summary: laneChanged
        ? `Moved backlog item ${id} to ${nextRow.lane}`
        : `Updated backlog item ${id}`,
      metadata: {
        before: { lane: existing.lane, priority: existing.priority, owner: existing.owner },
        after: { lane: nextRow.lane, priority: nextRow.priority, owner: nextRow.owner },
      },
    })

    return mapBacklogRow(result.rows[0])
  })
}

export async function createDecision(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'decisions', 'DEC')
    const result = await client.query(
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref, classified_at, classified_by
        )
        VALUES ($1,$2,$3,'proposed',$4,$5,$6,NOW(),$7)
        RETURNING *
      `,
      [
        id,
        input.category,
        input.title,
        input.summary,
        input.rationale ?? null,
        input.sourceRef ?? null,
        actor,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'decision_proposed',
      entityTable: 'decisions',
      entityId: id,
      actor,
      summary: `Proposed decision ${id}: ${input.title}`,
      metadata: { category: input.category },
    })

    return mapDecisionRow(result.rows[0])
  })
}

export async function updateDecision(id, input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(`SELECT * FROM decisions WHERE id = $1`, [id])
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Decision not found: ${id}`)

    const nextCategory = input.category ?? existing.category
    const nextStatus = input.status ?? existing.status
    const nextSupersedesIds = input.supersedesIds ?? existing.supersedes_ids ?? []

    const result = await client.query(
      `
        UPDATE decisions
        SET category = $2,
            status = $3,
            rationale = COALESCE($4, rationale),
            source_ref = COALESCE($5, source_ref),
            classified_at = CASE WHEN $2 IS DISTINCT FROM category THEN NOW() ELSE classified_at END,
            classified_by = CASE WHEN $2 IS DISTINCT FROM category THEN $6 ELSE classified_by END,
            supersedes_ids = $7,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        nextCategory,
        nextStatus,
        input.rationale ?? null,
        input.sourceRef ?? null,
        actor,
        nextSupersedesIds,
      ]
    )

    let eventType = 'decision_classified'
    let summary = `Updated decision ${id}`

    if (existing.status !== nextStatus && nextStatus === 'locked') {
      eventType = 'decision_locked'
      summary = `Locked decision ${id}`
    } else if (existing.status !== nextStatus && nextStatus === 'superseded') {
      eventType = 'decision_superseded'
      summary = `Superseded decision ${id}`
    } else if (existing.category !== nextCategory) {
      eventType = 'decision_classified'
      summary = `Reclassified decision ${id} as ${nextCategory}`
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable: 'decisions',
      entityId: id,
      actor,
      summary,
      metadata: {
        before: { category: existing.category, status: existing.status, supersedesIds: existing.supersedes_ids || [] },
        after: { category: nextCategory, status: nextStatus, supersedesIds: nextSupersedesIds },
      },
    })

    return mapDecisionRow(result.rows[0])
  })
}

export async function createOpenQuestion(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'open_questions', 'Q')
    const result = await client.query(
      `
        INSERT INTO open_questions (
          id, title, summary, owner, status
        )
        VALUES ($1,$2,$3,$4,'open')
        RETURNING *
      `,
      [id, input.title, input.summary, input.owner ?? null]
    )

    await insertChangeEvent(client, {
      eventType: 'question_created',
      entityTable: 'open_questions',
      entityId: id,
      actor,
      summary: `Opened question ${id}: ${input.title}`,
      metadata: {},
    })

    return mapOpenQuestionRow(result.rows[0])
  })
}

export async function updateOpenQuestion(id, input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(`SELECT * FROM open_questions WHERE id = $1`, [id])
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Open question not found: ${id}`)

    const nextStatus = input.status ?? existing.status ?? 'open'
    const resolving = existing.status !== 'resolved' && nextStatus === 'resolved'
    const reopening = existing.status === 'resolved' && nextStatus === 'open'

    const result = await client.query(
      `
        UPDATE open_questions
        SET title = COALESCE($2, title),
            summary = COALESCE($3, summary),
            owner = COALESCE($4, owner),
            status = $5,
            resolved_at = CASE
              WHEN $5 = 'resolved' AND resolved_at IS NULL THEN NOW()
              WHEN $5 = 'open' THEN NULL
              ELSE resolved_at
            END,
            resolved_by = CASE
              WHEN $5 = 'resolved' AND resolved_by IS NULL THEN $6
              WHEN $5 = 'open' THEN NULL
              ELSE resolved_by
            END,
            resolution_note = CASE
              WHEN $5 = 'resolved' THEN COALESCE($7, resolution_note)
              WHEN $5 = 'open' THEN NULL
              ELSE resolution_note
            END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id, input.title ?? null, input.summary ?? null, input.owner ?? null, nextStatus, actor, input.resolutionNote ?? null]
    )

    let eventType = 'question_updated'
    let summary = `Updated question ${id}`
    if (resolving) {
      eventType = 'question_resolved'
      summary = `Resolved question ${id}`
    } else if (reopening) {
      eventType = 'question_reopened'
      summary = `Reopened question ${id}`
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable: 'open_questions',
      entityId: id,
      actor,
      summary,
      metadata: {
        before: { status: existing.status || 'open', owner: existing.owner },
        after: { status: nextStatus, owner: input.owner ?? existing.owner },
      },
    })

    return mapOpenQuestionRow(result.rows[0])
  })
}

export async function listPendingDocUpdates() {
  const result = await pool.query(
    `
      SELECT p.id, p.decision_id, d.title AS decision_title, p.target_doc_path, p.target_section, p.summary,
             p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
             p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
      FROM pending_doc_updates p
      LEFT JOIN decisions d ON d.id = p.decision_id
      ORDER BY p.proposed_at DESC
    `
  )

  return result.rows.map(mapPendingDocUpdateRow)
}

export async function getPendingDocUpdate(id) {
  const result = await pool.query(
    `
      SELECT p.id, p.decision_id, d.title AS decision_title, p.target_doc_path, p.target_section, p.summary,
             p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
             p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
      FROM pending_doc_updates p
      LEFT JOIN decisions d ON d.id = p.decision_id
      WHERE p.id = $1
    `,
    [id]
  )

  return result.rows[0] ? mapPendingDocUpdateRow(result.rows[0]) : null
}

export async function createPendingDocUpdate(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'pending_doc_updates', 'DU')
    const result = await client.query(
      `
        INSERT INTO pending_doc_updates (
          id, decision_id, target_doc_path, target_section, summary,
          current_text, proposed_text, proposed_diff, proposed_by, expires_at, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW() + INTERVAL '72 hours',$10::jsonb)
        RETURNING *
      `,
      [
        id,
        input.decisionId ?? null,
        input.targetDocPath,
        input.targetSection ?? null,
        input.summary,
        input.currentText ?? null,
        input.proposedText,
        input.proposedDiff ?? null,
        actor,
        JSON.stringify(input.metadata || {}),
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'doc_update_proposed',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Proposed doc update ${id} for ${input.targetDocPath}`,
      metadata: {
        decisionId: input.decisionId ?? null,
        targetSection: input.targetSection ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...result.rows[0], decision_title: null })
  })
}

export async function approvePendingDocUpdate(id, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'approved',
            reviewed_at = NOW(),
            reviewed_by = $2,
            metadata = metadata - 'errorDetail' - 'partialWrite'
        WHERE id = $1
        RETURNING *
      `,
      [id, actor]
    )

    const row = result.rows[0]
    if (!row) throw new Error(`Pending doc update not found: ${id}`)

    await insertChangeEvent(client, {
      eventType: 'doc_update_approved',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Approved doc update ${id}`,
      metadata: {},
    })

    return mapPendingDocUpdateRow({ ...row, decision_title: null })
  })
}

export async function rejectPendingDocUpdate(id, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'rejected',
            reviewed_at = NOW(),
            reviewed_by = $2
        WHERE id = $1
        RETURNING *
      `,
      [id, actor]
    )

    const row = result.rows[0]
    if (!row) throw new Error(`Pending doc update not found: ${id}`)

    await insertChangeEvent(client, {
      eventType: 'doc_update_rejected',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Rejected doc update ${id}`,
      metadata: {},
    })

    return mapPendingDocUpdateRow({ ...row, decision_title: null })
  })
}

export async function markPendingDocUpdateFailed(id, metadata, actor = 'system') {
  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'failed',
            reviewed_at = NOW(),
            reviewed_by = $2,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE id = $1
        RETURNING *
      `,
      [id, actor, JSON.stringify(metadata || {})]
    )

    const row = result.rows[0]
    if (!row) throw new Error(`Pending doc update not found: ${id}`)

    await insertChangeEvent(client, {
      eventType: 'doc_update_failed',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Doc update ${id} failed during apply`,
      metadata: metadata || {},
    })

    return mapPendingDocUpdateRow({ ...row, decision_title: null })
  })
}

export async function markPendingDocUpdateApplied(id, appliedCommit, actor = 'system') {
  return withFoundationTransaction(async client => {
    const pendingResult = await client.query(`SELECT * FROM pending_doc_updates WHERE id = $1`, [id])
    const pending = pendingResult.rows[0]
    if (!pending) throw new Error(`Pending doc update not found: ${id}`)

    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'applied',
            reviewed_at = COALESCE(reviewed_at, NOW()),
            reviewed_by = COALESCE(reviewed_by, $2),
            applied_at = NOW(),
            applied_commit = $3,
            metadata = metadata - 'errorDetail' - 'partialWrite'
        WHERE id = $1
        RETURNING *
      `,
      [id, actor, appliedCommit]
    )

    if (pending.decision_id) {
      await client.query(
        `
          UPDATE decisions
          SET status = CASE WHEN status = 'proposed' THEN 'locked' ELSE status END,
              updated_at = NOW()
          WHERE id = $1
        `,
        [pending.decision_id]
      )

      await insertChangeEvent(client, {
        eventType: 'decision_locked',
        entityTable: 'decisions',
        entityId: pending.decision_id,
        actor,
        summary: `Locked decision ${pending.decision_id}`,
        metadata: { docUpdateId: id },
      })
    }

    await insertChangeEvent(client, {
      eventType: 'doc_update_applied',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Applied doc update ${id}`,
      metadata: { appliedCommit },
    })

    return mapPendingDocUpdateRow({ ...result.rows[0], decision_title: null })
  })
}

export async function getDocSourceSnapshot(docPath) {
  if (docPath === BHAG_DOC_PATH) {
    try {
      return await getLiveBhagSourceSnapshot()
    } catch (error) {
      console.warn(`Falling back to stored BHAG snapshot: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (docPath === AGENT_ENGINE_DOC_PATH) {
    try {
      return await getLiveAgentEngineSourceSnapshot()
    } catch (error) {
      console.warn(`Falling back to stored Agent Engine snapshot: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const result = await pool.query(
    `
      SELECT doc_path AS "docPath", source_id AS "sourceId", group_title AS "groupTitle",
             label, value, detail, as_of AS "asOf", sort_order AS "sortOrder"
      FROM doc_source_snapshots
      WHERE doc_path = $1
      ORDER BY group_title ASC, sort_order ASC, created_at ASC
    `,
    [docPath]
  )

  return result.rows
}

export async function closeFoundationDb() {
  await pool.end()
}
