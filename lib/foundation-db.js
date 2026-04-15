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
    nextAction: 'Finish the remaining Foundation review passes, then close any sections still waiting on source sign-off or source-backed cleanup after SRC-OWNERS-001 and SRC-FINANCE-001 are settled.',
    statusNote: 'In progress with Steve. The docs are largely shaped; the remaining work is trust-lock and cleanup, not wholesale rewriting.',
  },
  {
    id: 'FOUNDATION-002',
    title: 'Finish source sign-off for SRC-OWNERS-001',
    team: 'dev',
    lane: 'executing',
    priority: 'P0',
    rank: 2,
    source: 'Foundation reset audit + Owners Dashboard handoff',
    summary: 'Close the gap between "Verified Readable" and real trust for the Owners Dashboard deal ledger by finishing the final owner review, explicitly recording what is signed off, and naming what remains out of scope.',
    whyItMatters: 'SRC-OWNERS-001 is the upstream deal ledger for deal lifecycle, attribution, split credit, Follow Up Boss linkage, and downstream finance modeling. Until its signed-off boundary is explicit, the system is still reasoning on provisional truth.',
    nextAction: 'Do the final page review against the source notes, confirm exactly which Admin-tab meanings are signed off versus still pending, and record the resulting boundary in the source registry and Foundation backlog.',
    statusNote: 'Foundation-first blocker. Readable is not the same thing as signed off.',
  },
  {
    id: 'SECURITY-001',
    title: 'Rotate exposed MCP secrets and move local connector config to a safe pattern',
    team: 'dev',
    lane: 'executing',
    priority: 'P0',
    rank: 3,
    source: 'Foundation reset audit',
    summary: 'Treat the committed secrets in `.mcp.json` as a real security incident: rotate the exposed credentials, move the local MCP configuration to env-backed values, and stop storing live secrets in repo-tracked config.',
    whyItMatters: 'A trust-layer rebuild cannot ignore live keys committed in git history. Even if the rest of the architecture is sound, secret leakage is a direct foundation failure.',
    nextAction: 'Identify the exposed keys, rotate them, move the local MCP config to environment-backed values or local-only config, and add the minimum secret-scanning guardrail so this does not happen again.',
    statusNote: 'Parallel to foundation trust work, not after it.',
  },
  {
    id: 'FOUNDATION-003',
    title: 'Finish source sign-off for SRC-FINANCE-001',
    team: 'dev',
    lane: 'scoped',
    priority: 'P0',
    rank: 1,
    source: 'Foundation reset audit + Owners Dashboard finance walkthrough',
    summary: 'Turn the current high-level finance understanding into a signed-off source contract for Weekly Actuals, Cashflow Dash, and the partner-commission normalization boundary.',
    whyItMatters: 'The rebuild now understands the finance hierarchy, but not the fully signed-off workbook logic. Without that closure, finance views stay interpretive instead of trusted.',
    nextAction: 'Walk Weekly Actuals and Cashflow Dash line by line far enough to confirm what each layer owns, where the partner-commission adjustment lives canonically, and what remains validation-only versus source-of-truth.',
    statusNote: 'Partially signed off now. This needs either explicit closure or a deliberately narrowed boundary.',
  },
  {
    id: 'FOUNDATION-VERIFY-001',
    title: 'Add minimal foundation smoke checks and source-health verification',
    team: 'dev',
    lane: 'scoped',
    priority: 'P0',
    rank: 2,
    source: 'Foundation reset audit',
    summary: 'Add the smallest repeatable verification layer that proves the Foundation app, DB-backed trust layer, and critical source reads still work after changes.',
    whyItMatters: 'Right now trust depends too much on manual spot checks. The foundation needs a cheap repeatable proof path before more modules, connectors, or agents get added.',
    nextAction: 'Create a baseline verification pass covering `/api/foundation-hub`, a backlog/decision read-write smoke, the Google delegated health script, and one readable check for each currently signed-off critical source.',
    statusNote: 'Do the minimum that catches breakage early. This is not a full test suite yet.',
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
    summary: 'Enable OpenClaw `memory-core`, `active-memory`, and `dreaming` as the baseline recall layer before layering on heavier external memory systems.',
    whyItMatters: 'This gives Harlan real recall without prematurely adopting a more complex external stack.',
    nextAction: 'Update the OpenClaw config to enable the native memory plugins, restart the gateway cleanly, and run a real recall check using BCrew facts that should persist across sessions.',
    statusNote: 'Do the native baseline first and prove recall before benchmarking Honcho, Hindsight, or any heavier memory layer.',
  },
  {
    id: 'SCHEMA-001',
    title: 'Remove decision-category taxonomy drift',
    team: 'dev',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    source: 'Foundation reset audit',
    summary: 'Align the decision seed data, UI, and canonical validator around one category set so the live trust layer does not violate its own rules.',
    whyItMatters: 'The seed still uses legacy categories like foundation, data, and memory while the live app expects strategy, system, execution, and people. That drift quietly weakens trust.',
    nextAction: 'Map the existing seeded decisions into the canonical categories, update the seed, migrate the live rows, and verify the Foundation UI still renders and edits decisions cleanly.',
    statusNote: 'Small change, but it removes a real trust bug.',
  },
  {
    id: 'SOURCE-001',
    title: 'Revalidate Gmail as a rebuild source contract',
    team: 'dev',
    lane: 'ranked',
    priority: 'P1',
    rank: 3,
    source: 'Foundation reset audit',
    summary: 'Prove Gmail read access in the rebuild, define what business truth Gmail actually owns, and mark the signed-off boundary in the source registry instead of assuming the old-system connection still counts.',
    whyItMatters: 'Email is a likely input for decision capture, follow-through, and meeting prep. If Gmail is assumed instead of revalidated, the first assistant loop will reason over a connector that may not actually be ready.',
    nextAction: 'Run a fresh Gmail read check in the rebuild, define the exact inbox and scope the system can trust, and record whether Gmail is only readable, partially signed off, or ready for workflow use.',
    statusNote: 'Important for the first trusted assistant loop.',
  },
  {
    id: 'SOURCE-002',
    title: 'Revalidate Google Calendar as a rebuild source contract',
    team: 'dev',
    lane: 'ranked',
    priority: 'P1',
    rank: 4,
    source: 'Foundation reset audit',
    summary: 'Prove Calendar access in the rebuild, define which calendars and cadence truths it owns, and capture the exact signed-off boundary for meeting-prep and governance workflows.',
    whyItMatters: 'Calendar is the backbone for cadence enforcement, meeting prep, and operator workflows. The system cannot safely treat it as live operating truth until the rebuild-specific connection and scope are verified.',
    nextAction: 'Run a fresh calendar read in the rebuild, confirm the primary calendars and event types the system can trust, and write down what is readable versus workflow-ready.',
    statusNote: 'Important for the first trusted assistant loop.',
  },
  {
    id: 'SOURCE-003',
    title: 'Revalidate Google Drive as a rebuild source contract',
    team: 'dev',
    lane: 'ranked',
    priority: 'P1',
    rank: 5,
    source: 'Foundation reset audit',
    summary: 'Prove Drive access in the rebuild, define which docs and folders are canonical, and record the signed-off scope for strategy, meeting artifacts, and source-linked supporting material.',
    whyItMatters: 'The rebuild already depends on Google docs and sheets in practice. If Drive scope remains fuzzy, the assistant loop will mix canonical material with random readable files.',
    nextAction: 'Run a fresh Drive read path in the rebuild, identify the canonical folders and doc classes the system should trust, and mark what is only readable versus approved for workflow use.',
    statusNote: 'Important for the first trusted assistant loop.',
  },
  {
    id: 'SOURCE-004',
    title: 'Revalidate ClickUp as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 36,
    source: 'Foundation reset audit',
    summary: 'Verify the rebuild can read ClickUp, define what task-management truth it still owns, and decide what should remain external versus later move into the Foundation operating layer.',
    whyItMatters: 'ClickUp existed in the old stack, but the rebuild should not assume its role or quality without a fresh boundary check.',
    nextAction: 'Confirm ClickUp access on this machine, identify the lists or spaces that still matter, and record whether ClickUp is a dependency, a migration source, or an eventual side system.',
    statusNote: 'Not part of the first assistant loop, but it should not stay as an unexamined inherited source.',
  },
  {
    id: 'SOURCE-005',
    title: 'Revalidate Slack as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 37,
    source: 'Foundation reset audit',
    summary: 'Verify Slack connectivity in the rebuild, define what communication truth it owns, and decide whether it belongs in the trusted operating loop or only as a later notification surface.',
    whyItMatters: 'Slack was present in the old system, but the rebuild should not assume it is part of the trusted communication layer until the connector and scope are revalidated.',
    nextAction: 'Confirm Slack access on this machine, identify the channels or workflows that matter, and record whether Slack is workflow-critical, optional, or future-only.',
    statusNote: 'Likely later than Gmail and Calendar, but still needs an explicit source-contract decision.',
  },
  {
    id: 'SOURCE-006',
    title: 'Revalidate Missive as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 38,
    source: 'Foundation reset audit',
    summary: 'Verify Missive connectivity in the rebuild, define what inbox-routing truth it owns, and decide how it overlaps with Gmail and shared team communication workflows.',
    whyItMatters: 'Missive may matter for shared inbox and client-routing work, but its role in the rebuild is still inherited assumption rather than signed-off truth.',
    nextAction: 'Confirm Missive access, document what mailbox or routing functions it still owns, and decide whether it belongs in the trusted loop or a later operations layer.',
    statusNote: 'Do not leave it as a vague inherited connector.',
  },
  {
    id: 'SOURCE-007',
    title: 'Revalidate DataForSEO as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 39,
    source: 'Foundation reset audit',
    summary: 'Verify DataForSEO connectivity in the rebuild, define the SEO truths it can provide, and record whether it should remain part of the new operating surface or stay dormant until marketing expansion.',
    whyItMatters: 'SEO tooling existed in the old stack, but it is not foundation-safe to assume that connection or its business value without a rebuild-specific check.',
    nextAction: 'Confirm DataForSEO access, identify the exact ranking or keyword workflows still worth trusting, and decide whether it belongs in the foundation backlog now or only after marketing restarts.',
    statusNote: 'Useful later, not a blocker for the first trusted loop.',
  },
  {
    id: 'SOURCE-008',
    title: 'Revalidate Follow Up Boss as a rebuild source contract',
    team: 'dev',
    lane: 'ranked',
    priority: 'P0',
    rank: 6,
    source: 'Foundation reset audit + Owners Dashboard handoff',
    summary: 'Prove Follow Up Boss access in the rebuild, define the exact overlap boundary with the Owners Dashboard deal ledger, and capture what CRM truth is safe to trust for attribution, deal linkage, and homeowner follow-up.',
    whyItMatters: 'Follow Up Boss is central to attribution, lead lineage, and deal-to-client parity. The rebuild already names it repeatedly in the Owners Dashboard work, so leaving it unvalidated is a real trust gap.',
    nextAction: 'Confirm live FUB access in the rebuild, define the join path from Admin-tab rows to CRM records, and record what is readable, reconcilable, and still missing before parity checks are treated as trustworthy.',
    statusNote: 'High-value source boundary because it touches attribution, ops, and future coaching signals.',
  },
  {
    id: 'SOURCE-009',
    title: 'Revalidate GoHighLevel as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 40,
    source: 'Foundation reset audit',
    summary: 'Verify GoHighLevel connectivity in the rebuild, define what contact or automation truth it still owns, and decide whether it belongs in the trusted system or stays outside the current foundation scope.',
    whyItMatters: 'GoHighLevel was live in the old system, but the rebuild should not inherit that assumption until the connection and business role are explicitly revalidated.',
    nextAction: 'Confirm GHL access on this machine, identify the exact location and automation scopes that matter, and record whether it is active, legacy, or deferred.',
    statusNote: 'Not part of the first trusted loop, but it should not remain ambiguous.',
  },
  {
    id: 'SOURCE-010',
    title: 'Revalidate Supabase KPI surfaces as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 41,
    source: 'Foundation reset audit',
    summary: 'Verify whether the old KPI dashboard surfaces still deserve a live source contract in the rebuild, and if so define exactly what they own and how they overlap with the current Foundation and source-registry model.',
    whyItMatters: 'The old KPI app was referenced as real system surface area, but the rebuild cannot safely depend on it until the connector, data path, and business role are revalidated.',
    nextAction: 'Confirm Supabase connectivity, inspect what `kpi.bensoncrew.ca` still owns, and decide whether the surface stays, gets demoted to reference-only, or is retired.',
    statusNote: 'Do not keep a ghost KPI system alive by assumption.',
  },
  {
    id: 'SOURCE-011',
    title: 'Revalidate Google Ads as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 42,
    source: 'Foundation reset audit',
    summary: 'Verify Google Ads connectivity in the rebuild, define what paid-media truth it would own, and decide whether it belongs in the post-foundation marketing surface or remains out of scope for now.',
    whyItMatters: 'Paid media is meaningful later, but the rebuild should not carry it as an implied live source without a real connector and an explicit operating boundary.',
    nextAction: 'Confirm Google Ads access, identify the MCC or account surfaces that matter, and record whether this source is active, deferred, or waiting on a future marketing phase.',
    statusNote: 'Useful later than the first assistant loop, but still needs a real revalidation card.',
  },
  {
    id: 'SLICE-001',
    title: 'Define and prove the first trusted assistant loop',
    team: 'dev',
    lane: 'ranked',
    priority: 'P0',
    rank: 7,
    source: 'Foundation reset audit',
    summary: 'Narrow the rebuild to one assistant loop that is actually trustworthy: strategy docs, Foundation memory, Gmail, Google Calendar, and Google Drive, with explicit boundaries on what is not yet allowed into the loop.',
    whyItMatters: 'The rebuild will fail by widening too early, not by lacking ideas. One trusted loop becomes the proof point that every future connector, memory layer, or agent surface can build on.',
    nextAction: 'Define the allowed tools, source prerequisites, read-write boundaries, and success checks for the first loop, then use that loop as the gate before enabling broader connectors or additional agents.',
    statusNote: 'Proof before scale. No second loop until the first one is trustworthy.',
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
    nextAction: 'Define the adapter contract around the current Freedom source IDs, add structural header and range checks, and expose the results through the data-health surface instead of leaving drift detection implicit.',
    statusNote: 'Keep this lightweight until the broader source-health layer is in place, but do not leave the Freedom connection as a blind read.',
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
    lane: 'done',
    priority: 'P1',
    rank: 1,
    source: 'Foundation architecture',
    summary: 'Keep business strategy and system strategy separate so the AI operating model does not leak into company strategy.',
    whyItMatters: 'This keeps the foundation readable for humans and reliable for agents.',
    nextAction: 'Use `docs/system-strategy.md` as the architecture-boundary document and update it only when the real operating model changes.',
    statusNote: 'Base doc exists. This card now records the separation rule and prevents the old hybrid-doc mistake from coming back.',
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
    summary: 'Make the system hold leadership and departments accountable to the strategy, cadence, and execution rules by preparing the room, enforcing the sequence, capturing structured outputs, and surfacing drift instead of only documenting the process.',
    whyItMatters: 'The AI OS should not just help the team work. It should enforce the operating cadence, surface drift, and make follow-through visible.',
    nextAction: 'Define the first governance loop: cadence checks, pre-meeting briefing, agenda enforcement, decision capture, owner/deadline tracking, and escalation rules for misses or drift.',
    statusNote: 'This should behave like an operating partner for governance, not a passive logbook.',
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
    nextAction: 'Define a first scoring model using connection status, signed-off state, recency, completeness, and schema health, then surface that score beside each source contract in Foundation.',
    statusNote: 'This should explain why a source is In Review, Verified Readable, Partially Signed Off, or decision-safe instead of making those states feel arbitrary.',
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
    nextAction: 'Define how decisions, source contracts, sessions, pending doc updates, and change events link together so any strategy edit can answer what changed, why, from which source, and under whose approval.',
    statusNote: 'Use the existing pending-doc-update and change-event flow instead of inventing a second change pipeline.',
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
    summary: 'Continuously scan proposed and locked decisions for overlap, contradiction, supersession, or ambiguity, then flag those conflicts in the system before old and new agreements silently coexist.',
    whyItMatters: 'Running a team depends on clear agreements. If a new agreement changes an old one but the system does not flag it, people will keep citing different versions of the truth and accountability falls apart.',
    nextAction: 'Define the first contradiction engine: relationship types like supersedes, partially contradicts, overlaps, clarifies, duplicates, and expires; AI-assisted review prompts; confidence scores; UI flags; notification rules; and the cleanup path that retires or merges old agreements once leadership confirms the new one.',
    statusNote: 'This should create a visible review queue for contradictions and unresolved overlap, send high-signal alerts when a real conflict is found, and keep unresolved conflicts on the leadership/ownership agenda until the old agreement is explicitly cleaned up.',
  },
  {
    id: 'DECISION-004',
    title: 'Build a pending decision review and lock-in workflow',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 13,
    source: 'Governance operator design',
    summary: 'Capture statements from meetings, transcripts, chats, and operator workflows that sound like real decisions, then route them into a pending review state instead of pretending they are fully locked before a human confirms them.',
    whyItMatters: 'A lot of contradiction starts when the room thinks a decision was made but nobody later confirms whether it was final, provisional, or only exploratory. The system should help separate “sounds like a decision” from “this is now the live agreement.”',
    nextAction: 'Define the pending-decision pipeline: extraction from meetings and chats, confidence scoring, reviewer assignment by role, statuses like needs verification / ready to lock / rejected / merged into existing decision, contradiction checks against the existing decision log, and how unresolved pending decisions show up in governance cadences.',
    statusNote: 'The right pattern is: detect possible decisions early, keep them visibly reviewable, check them against existing agreements, and only lock them once the right human owner confirms they are real.',
  },
  {
    id: 'DECISION-005',
    title: 'Build a decision provenance and participant model',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 14,
    source: 'Decision accountability design',
    summary: 'Every real decision should capture who was involved, who actually confirmed it, what meeting or thread it came from, and what supporting notes, transcript, or evidence explain how the agreement was reached.',
    whyItMatters: 'A decision log is only trustworthy if the company can answer who decided, who was in the room, whether it was a group agreement or an owner confirmation, and what context justified the change. Without that provenance, people will dispute the agreement later or treat the log like a thin summary with no accountability weight.',
    nextAction: 'Define the first decision-provenance model: decision owner, confirming owner, participant list, meeting/session/thread links, supporting notes/transcript references, source evidence, and the UI rules for showing group decisions versus direct owner confirmations.',
    statusNote: 'This should make it easy to understand whether a decision came from Steve + Codex, Claude Code + Steve, or a real leadership meeting with named participants, plus what evidence or notes support the agreement.',
  },
  {
    id: 'DECISION-006',
    title: 'Turn locked decisions into visible policy and SOP artifacts',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    source: 'Decision-log model review + old strategy/policy history',
    summary: 'Use the canonical decision log to create a visible policy/SOP layer for real operating agreements like expense policy, ownership-pay rules, approval standards, and other recurring company rules so those agreements do not disappear into chats, meeting memory, or stale side docs.',
    whyItMatters: 'A company does not just need a decision log. It also needs the current operating rule people are supposed to follow. If a decision changes the expense policy, ownership-pay handling, or another standing rule, the system should be able to show the current policy artifact, what decision created it, what decision superseded it, and what history sits behind it. Otherwise people keep citing old agreements or asking “where does that actually live?”',
    nextAction: 'Define the first policy/SOP model: which decisions should emit a policy artifact, how policies trace back to locked decisions, how superseded decisions update the visible policy, where policies live in the UI, and how to distinguish durable policy from one-off execution decisions.',
    statusNote: 'Keep one canonical decision system. Policies and SOPs should be linked artifacts generated from that system, not a second disconnected truth layer.',
  },
  {
    id: 'GOV-002',
    title: 'Build meeting effectiveness scoring',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 15,
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
    rank: 16,
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
    rank: 17,
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
    rank: 18,
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
    rank: 19,
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
    rank: 20,
    source: 'Governance system design',
    summary: 'If the strategy defines a cadence, the system should verify it exists on the calendar and flag gaps before the cadence breaks.',
    whyItMatters: 'Strategy should show up in the calendar, not just in documents.',
    nextAction: 'Map required meetings and review cadences to calendar checks, missing-event alerts, preflight briefing requirements, and post-meeting closeout expectations.',
    statusNote: 'Direct extension of the governance accountability layer and the first preflight check for a live governance operator.',
  },
  {
    id: 'SYSTEM-002',
    title: 'Define modular product architecture around Foundation',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 21,
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
    rank: 22,
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
    rank: 23,
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
    id: 'DEV-002',
    title: 'Define the research-to-release pipeline and scoped-card standard',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 24,
    source: 'Old dev-team salvage',
    summary: 'Salvage the strongest pipeline pattern from the old system: research finds WHAT is changing, synthesis decides WHY it matters, scoping defines HOW it should be built, ranking decides WHEN it enters the queue, build-and-review proves quality, human review confirms risk, and only then does work push live. The future-state version should also define the trust ladder for when some of that human review can be relaxed.',
    whyItMatters: 'The old system was directionally right when it forced work through quality gates before build. The real value was never “lots of agents.” It was the pipeline discipline that prevented thin ideas from reaching implementation and created the long-term possibility of safe autonomy. If the new system wants to earn autopilot later, it needs a clear research -> synthesis -> scope -> rank -> build/review -> human review -> push-live model first, plus explicit trust thresholds for what can eventually bypass the human gate.',
    nextAction: 'Define the v2 pipeline in plain terms for the new system: stage names, entry/exit criteria, what data each stage must attach, the scoped-card standard (problem/context, why it matters, build shape, acceptance criteria, definition of done, risks, dependencies, blocked reason, verification/test plan, source links), the review-loop quality bar, the human-review checkpoint, and the trust-building path toward selective autonomous push-live later.',
    statusNote: 'Do not rebuild the old dev-team theater. Keep the good part: rich scoped cards, explicit gates, strong review loops, and a trust ladder that earns autonomy instead of assuming it. The website can stay simpler than the full pipeline, but the underlying card standard still needs real build context instead of thin notes.',
  },
  {
    id: 'UX-002',
    title: 'Wire Harlan to one continuous cross-channel assistant',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 25,
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
    rank: 26,
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
    rank: 27,
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
    id: 'UX-006',
    title: 'Build smart export packets for Strategy and Foundation',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 28,
    source: 'Foundation home review + strategy export pass',
    summary: 'Replace the current single-file strategy PDF with source-backed export packets that can assemble the business strategy, its supporting docs, and later the full Foundation surface into one polished branded artifact.',
    whyItMatters: 'Leadership will need artifacts that can be downloaded, shared, printed, and reviewed outside the app, but those exports cannot collapse back into stale ad hoc documents. The export system needs to respect the modular strategy architecture while still producing one clean packet when needed.',
    nextAction: 'Define export modes and inclusion rules: strategy packet only, strategy packet plus supporting docs, and eventual full Foundation export with system strategy, source trust, decisions, and closeout state. Decide ordering, branding, appendix behavior, timestamps, and how live source-backed sections should be consolidated without breaking trust or duplicating stale snapshots.',
    statusNote: 'Not a Foundation closeout blocker. Do this after Home, Strategy, and System Strategy are fully buttoned up.',
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
    summary: 'Create an agent that sits across leadership, strategy, and key department meetings, prepares the room, keeps the agenda on sequence, asks follow-up questions, captures decisions, turns them into structured work, and can push approved updates into connected systems like backlog, ClickUp, and operating trackers during or immediately after the meeting.',
    whyItMatters: 'Leadership should not have to both run the business and act as the full-time strategy PM layer. A strong strategic operator could protect cadence, improve accountability, spot drift across departments, and close the gap between meeting decisions and real system updates.',
    nextAction: 'Define the MVP: pre-meeting briefing, live presence across core cadences, agenda enforcement, question prompts, decision extraction, owner/deadline tracking, approval rules for in-meeting system updates, post-meeting closeout, and escalation rules when departments miss commitments or drift off strategy.',
    statusNote: 'Start as a disciplined strategic operator across the main business cadences, not a transcript bot, novelty demo, or fully autonomous meeting boss.',
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
    nextAction: 'Define the first live-meeting interaction model: wake phrase or push-to-talk trigger, meeting-room transport, interruption rules, participant awareness, approval gates for live system changes, and when Harlan should speak versus stay silent across the main cadences.',
    statusNote: 'This is a voice/runtime layer on top of AGENT-002, not a replacement for the live strategic operator core.',
  },
  {
    id: 'AGENT-004',
    title: 'Add mission-control and queue safety for the live operator',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 31,
    source: 'Strategic operator runtime design',
    summary: 'Create the runtime safety layer for the live operator: mission-control visibility, queued task routing, duplicate suppression, and approval boundaries so meeting, chat, and follow-up actions do not collide or fail silently.',
    whyItMatters: 'A live operator that can speak, write, delegate, and update systems across channels will lose trust fast if actions overlap, disappear, or fire twice.',
    nextAction: 'Define the first runtime contract: queue semantics, operator session state, channel allowlists, duplicate suppression, approval checkpoints, and the minimum mission-control view needed to supervise live operator actions.',
    statusNote: 'This is runtime trust and observability for AGENT-002/003, not a vanity dashboard project.',
  },
  {
    id: 'SYSTEM-004',
    title: 'Build a live System Capabilities surface',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 32,
    source: 'Old-system audit + Foundation visibility review',
    summary: 'Create one live place in Foundation that shows what the OS can actually use right now: models, tools, skills, connectors/plugins, and any system-level runtimes that future hubs and agents depend on.',
    whyItMatters: 'The old system had useful capability visibility, but it was trapped in generated docs and stale JSON. In the rebuild, hidden capability state creates the same confusion in a cleaner wrapper: people cannot tell what the system really has, what is connected, what is trusted, or what is still just an idea.',
    nextAction: 'Define the first capabilities schema and UI: model layer, tool layer, skill layer, connector/plugin layer, working status, proof of working state, and which agents or surfaces can access each capability. Drive it from real config and runtime state instead of a hand-maintained inventory doc.',
    statusNote: 'This should become a live operating surface, not another static markdown report.',
  },
  {
    id: 'SYSTEM-005',
    title: 'Build role-based human approval routing across the OS',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 33,
    source: 'Governance review + old write-safety gold',
    summary: 'Replace founder-centric approval assumptions with a role-based human approval model so strategy changes, outbound actions, content approvals, and future agent writes route to the right owner instead of collapsing back onto one person.',
    whyItMatters: 'The system cannot be sellable, scalable, or politically durable if every approval path implicitly routes to Steve. The old backlog had the right instinct here, and the current doctrine already points the same way: the right human owner confirms. That needs to become an explicit operating model, not just wording.',
    nextAction: 'Define approval routing by action type: strategy changes, source sign-off, content approval, outbound communication, department execution, and future agent configuration changes. Name owner roles, fallback rules, escalation rules, and what must be recorded in the audit trail every time an approval happens.',
    statusNote: 'Start with routing doctrine and visibility before automating actual approval flows.',
  },
  {
    id: 'SYSTEM-006',
    title: 'Define what Foundation Operations owns versus what future hubs own',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    source: 'Foundation Operations review',
    summary: 'Tighten the operating-record model so Foundation Operations clearly owns the root system records, while Strategic Execution, Marketing, departments, and future hubs own their own execution records instead of dumping everything back into Foundation forever.',
    whyItMatters: 'The current root queue is intentionally transitional, but that only works if the boundary is explicit. Without a clean ownership model, the team will keep asking whether a backlog item, decision, question, or policy belongs to Foundation, to a strategy layer, or to a future hub. That confusion turns the root system into a catch-all and eventually recreates the same clutter this rebuild is trying to avoid.',
    nextAction: 'Define the ownership rules for Foundation Operations: what belongs in the canonical decision log, what stays in the root Foundation backlog, what should become filtered views, what should move into Strategic Execution or later hubs, and how records graduate out of the root layer without losing traceability.',
    statusNote: 'The UI can stay simpler for now. The important thing is to lock the ownership model before more hubs and work queues arrive.',
  },
  {
    id: 'AGENT-005',
    title: 'Define the agent franchise model before building more agents',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 34,
    source: 'Old-system audit + agent-franchise discussion',
    summary: 'Define the contract every real agent must satisfy before it is built or activated: purpose, owner, model, tools, skills, permissions, memory, inputs, outputs, cadence, reports, escalation path, and approval boundary.',
    whyItMatters: 'The old system had good agent ideas but weak enforcement. Agents existed without one consistently enforced contract, which made them hard to trust, hard to compare, and easy to let drift. If we build more agents without a franchise model, we will repeat the same failure in a prettier interface.',
    nextAction: 'Write the first franchise schema and build gate for agents. Include the research-before-build rule: before creating a new role, first study what a world-class version of that role actually does, then encode that into the agent contract instead of guessing from scratch.',
    statusNote: 'This is the build gate for future agents, not just another planning note.',
  },
  {
    id: 'AGENT-006',
    title: 'Build a live Agent Registry from the franchise contract',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Old All Agents + Agent Detail audit',
    summary: 'Create a live registry page for every real and planned agent so the team can see what exists, what each agent is for, who owns it, what it can access, and what contract it is supposed to satisfy.',
    whyItMatters: 'The old All Agents and Agent Detail surfaces were conceptually right: people need a visible registry, not hidden agent definitions scattered across files. But the old implementation went stale because it depended on generated docs and startup JSON. The new system should keep the visibility and kill the staleness.',
    nextAction: 'Define the first registry views: all agents, per-agent detail, owner, status, model, tools, skills, permissions, memory layer, cadence, outputs, source dependencies, and last known operational state. Drive it from the live franchise model and runtime state, not a nightly generated document.',
    statusNote: 'Registry explains what the agent is. Operations will explain what it is doing right now.',
  },
  {
    id: 'AGENT-007',
    title: 'Build a live Agent Operations surface',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 36,
    source: 'Old agent-operations audit + Foundation supervision need',
    summary: 'Create the live operational view for agent runtime state: scheduled, running, degraded, paused, queued, awaiting approval, recently changed, and recently failed.',
    whyItMatters: 'An agent registry is not enough. Humans also need to know what is happening now. The old dashboard had the right instinct with activity, schedule, and status, but the new system should separate static contract from live operations so supervision stays clear instead of noisy.',
    nextAction: 'Define the smallest useful operations surface: status, schedule, last successful run, current queue, blocked approvals, degraded reasons, recent outputs, and recent change events. Keep it live and operational, not a vanity telemetry board.',
    statusNote: 'Start simple. This is supervision and trust, not a giant NOC dashboard.',
  },
  {
    id: 'SOURCE-012',
    title: 'Make source contracts and connectors visible as separate live layers',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Source-trust review + user confusion around connectors',
    summary: 'Build the next source layer so users can clearly see the difference between a source contract, a technical connector, and a signed-off trusted source instead of collapsing those ideas into one fuzzy label.',
    whyItMatters: 'Repeated confusion around “is that a source contract or a connector?” is a signal that the model is not visible enough. The old system had useful data-source maps, but they became stale because they were doc-driven. The rebuild should keep the clarity and make it live.',
    nextAction: 'Define the first source view for the Data Sources area: source ID, business owner, system owner, source type, connector status, trust status, signed-off boundary, dependent views, and a direct link to the real source. Make it explicit that connector does not equal trust.',
    statusNote: 'This should become the front door to the source layer, not a debugging-only page.',
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
    id: 'EXEC-002',
    title: 'Define the BCrew backlog ownership and sprint-cadence model',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Scrum principle review + execution-system design',
    summary: 'Adapt the strongest Scrum principles into a BCrew operating model: one accountable backlog owner per backlog, a visible ordered queue, quarterly focus selected from that queue, weekly sprint-style execution cadence, and regular inspect/adapt loops that keep work moving without turning the company into ceremony theater.',
    whyItMatters: 'The system needs a real execution model, not just a list of tasks. The useful part of Scrum here is clear ownership, transparent backlog management, sprint cadence, inspection, and adaptation. Without that model, the backlog becomes a pile, priorities drift, and AI cannot manage the queue intelligently. The goal is not to cosplay software Scrum across the whole company; it is to translate the best execution principles into a model the business can actually run.',
    nextAction: 'Define the first BCrew execution model in plain terms: annual strategic goals, quarterly focus selection, monthly review/re-order cadence, weekly sprint execution, one accountable backlog owner per surface, how AI supports backlog refinement without owning final order, and how items move from candidate work into committed sprint work and then into done.',
    statusNote: 'Use official Scrum principles as the base and adapt them for business execution. Keep the parts that drive clarity, ownership, and adaptation. Drop ceremony that does not fit the company.',
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
    category: 'system',
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
    category: 'system',
    title: 'Freedom Sheet sections are now treated as source contracts',
    status: 'locked',
    summary: 'A:E owns team/member data, G:O owns community/downline tracking, P:U owns community revenue, Agent Engine owns live operating assumptions, and BHAG Builder owns long-range targets.',
    rationale: 'The system must reference stable source IDs so the location can change later without breaking every consumer.',
    sourceRef: 'Freedom Sheet verification on 2026-04-12',
  },
  {
    id: 'DEC-004',
    category: 'system',
    title: 'Start with OpenClaw-native memory plus Postgres business memory',
    status: 'locked',
    summary: 'We are not building the full world-class memory layer from scratch first. We are starting with OpenClaw-native memory for agent recall and Postgres for business memory.',
    rationale: 'This gives us a strong baseline quickly, keeps data local, and leaves room to benchmark Honcho or Hindsight later if recall quality still falls short.',
    sourceRef: 'Memory architecture review',
  },
  {
    id: 'DEC-005',
    category: 'system',
    title: 'Live values come from source contracts, not markdown snapshots',
    status: 'locked',
    summary: 'Strategy docs explain what the numbers mean and which source owns them. The system should render live values from source IDs so changes propagate across the full system.',
    rationale: 'Markdown is good for meaning and rules, but it is the wrong place to act as a live calculator. Source systems own mutable math.',
    sourceRef: 'Strategy lock pass on live source-of-truth rendering',
  },
  {
    id: 'DEC-006',
    category: 'system',
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
        ORDER BY created_at DESC
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

function normalizeDecisionIdList(ids, currentId = null) {
  const seen = new Set()
  return (ids || [])
    .map(value => String(value || '').trim().toUpperCase())
    .filter(value => value && value !== currentId)
    .filter(value => {
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
}

async function markSupersededDecisions(client, supersedesIds, sourceDecisionId, actor) {
  const normalizedIds = normalizeDecisionIdList(supersedesIds, sourceDecisionId)
  if (!normalizedIds.length) return []

  const existingResult = await client.query(
    `
      SELECT id, status
      FROM decisions
      WHERE id = ANY($1::text[])
    `,
    [normalizedIds]
  )

  const foundIds = new Set(existingResult.rows.map(row => row.id))

  for (const row of existingResult.rows) {
    if (row.status === 'superseded') continue

    await client.query(
      `
        UPDATE decisions
        SET status = 'superseded',
            updated_at = NOW()
        WHERE id = $1
      `,
      [row.id]
    )

    await insertChangeEvent(client, {
      eventType: 'decision_superseded',
      entityTable: 'decisions',
      entityId: row.id,
      actor,
      summary: `Decision ${row.id} superseded by ${sourceDecisionId}`,
      metadata: {
        supersededBy: sourceDecisionId,
      },
    })
  }

  return normalizedIds.filter(id => foundIds.has(id))
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
    const supersedesIds = normalizeDecisionIdList(input.supersedesIds, id)
    const result = await client.query(
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref, classified_at, classified_by, supersedes_ids
        )
        VALUES ($1,$2,$3,'proposed',$4,$5,$6,NOW(),$7,$8)
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
        supersedesIds,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'decision_proposed',
      entityTable: 'decisions',
      entityId: id,
      actor,
      summary: `Proposed decision ${id}: ${input.title}`,
      metadata: {
        category: input.category,
        supersedesIds,
      },
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
    const nextSupersedesIds = normalizeDecisionIdList(input.supersedesIds ?? existing.supersedes_ids ?? [], id)

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

    const shouldApplySupersedes = (nextStatus === 'locked' || existing.status === 'locked') && nextSupersedesIds.length
    const appliedSupersedesIds = shouldApplySupersedes
      ? await markSupersededDecisions(client, nextSupersedesIds, id, actor)
      : []

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

    if (appliedSupersedesIds.length) {
      summary += ` · supersedes ${appliedSupersedesIds.join(', ')}`
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
