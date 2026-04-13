import { Pool } from 'pg'
import { getSheetValues } from './google-delegated.js'

const pool = new Pool({
  host: process.env.BCREW_DB_HOST || '/tmp',
  database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
  user: process.env.BCREW_DB_USER || process.env.USER,
})

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
    id: 'CLEANUP-001',
    title: 'Remove dead or duplicate Foundation files after redesign',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 26,
    source: 'Frankenstein prevention audit',
    summary: 'Audit and remove files that no longer earn their place after the site redesign, especially duplicate renderers, redirect stubs, and build artifacts that could confuse future work.',
    whyItMatters: 'The fastest way to rebuild a Frankenstein is to keep superseded files and duplicate logic around after every redesign. Anything not in the active product path needs to be clearly archived, merged, or deleted.',
    nextAction: 'Review the current candidates: public/app.js, docs/strategy/vision-and-north-star.md, docs/superpowers/*, and any stale references that still point to superseded docs or UI flows.',
    statusNote: 'Do not delete blindly. First classify each file as canonical, supporting, internal build artifact, or dead weight.',
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

function buildBhagYearRows(groupTitle, values, sourceId, detail, startYear = 2026) {
  return values.map((value, index) => ({
    docPath: BHAG_DOC_PATH,
    sourceId,
    groupTitle,
    label: String(startYear + index),
    value,
    detail,
    asOf: getTodayTorontoIso(),
    sortOrder: index + 1,
  }))
}

async function getLiveBhagSourceSnapshot() {
  const currentYear = getTorontoDateParts().year
  const currentYearLabel = String(currentYear)
  const yearStart = 2026
  const [teamTargetsRes, communityTargetsRes, communityTrackerRes, ownersRes] = await Promise.all([
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K4:K13"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K20:K29"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Data Entry - BCrew Team/Community'!G1:O80"),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'ADMIN ONLY - Deal Data Entry'!G:AI"),
  ])

  const teamTargetValues = (teamTargetsRes.values || [])
    .map(row => parseNumber(row[0]))
    .filter(Number.isFinite)
  const communityTargetValues = (communityTargetsRes.values || [])
    .map(row => parseNumber(row[0]))
    .filter(Number.isFinite)

  const snapshot = []
  snapshot.push(
    ...buildBhagYearRows(
      'Team Goal: $2B',
      teamTargetValues.map(value => formatCompactCurrency(value)),
      'SRC-FREEDOM-BHAG-001',
      '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
      yearStart,
    ),
  )

  const teamCurrentTarget = teamTargetValues[currentYear - yearStart] || teamTargetValues[0] || 0
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
      label: 'Actual',
      value: `${formatCompactCurrency(actualVolumeYtd)} YTD`,
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 11,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Pace',
      value: formatPaceWithPercent(teamDiff, targetToDate, formatCompactCurrency),
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 12,
    },
  )

  snapshot.push(
    ...buildBhagYearRows(
      'Community Goal: 10,000 Agents',
      communityTargetValues.map(value => formatAgentCount(value)),
      'SRC-FREEDOM-BHAG-001',
      '10-year community target path from the Benson Crew BHAG Builder.',
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
  const communityCurrentTarget = communityTargetValues[currentYear - yearStart] || communityTargetValues[0] || 0
  const actualCommunity = latestRow?.totalCommunity || 0
  const communityDiff = actualCommunity - communityCurrentTarget

  if (startedRow) {
    snapshot.push({
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: `Started ${currentYearLabel}`,
      value: formatAgentCount(startedRow.totalCommunity),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: monthYearToIso(startedRow.month, startedRow.year),
      sortOrder: 11,
    })
  }

  snapshot.push(
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Actual',
      value: formatAgentCount(actualCommunity),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 12,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Pace',
      value: formatPaceWithPercent(communityDiff, communityCurrentTarget, formatAgentCount),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 13,
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
  const [backlogResult, decisionsResult, parkingResult, questionsResult, memoryStatusResult] =
    await Promise.all([
      pool.query(`
        SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters AS "whyItMatters",
               next_action AS "nextAction", status_note AS "statusNote", created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM backlog_items
        ORDER BY team ASC, rank NULLS LAST, created_at ASC
      `),
      pool.query(`
        SELECT id, category, title, status, summary, rationale, source_ref AS "sourceRef",
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM decisions
        ORDER BY created_at ASC
      `),
      pool.query(`
        SELECT id, title, summary, owner, created_at AS "createdAt", updated_at AS "updatedAt"
        FROM parking_lot_items
        ORDER BY created_at ASC
      `),
      pool.query(`
        SELECT id, title, summary, owner, created_at AS "createdAt", updated_at AS "updatedAt"
        FROM open_questions
        ORDER BY created_at ASC
      `),
      pool.query(`
        SELECT component_key AS "componentKey", label, status, detail, updated_at AS "updatedAt"
        FROM memory_system_status
        ORDER BY label ASC
      `),
    ])

  return {
    backlogItems: backlogResult.rows,
    decisions: decisionsResult.rows,
    parkingLot: parkingResult.rows,
    openQuestions: questionsResult.rows,
    memoryStatus: memoryStatusResult.rows,
  }
}

export async function getDocSourceSnapshot(docPath) {
  if (docPath === BHAG_DOC_PATH) {
    try {
      return await getLiveBhagSourceSnapshot()
    } catch (error) {
      console.warn(`Falling back to stored BHAG snapshot: ${error instanceof Error ? error.message : String(error)}`)
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
