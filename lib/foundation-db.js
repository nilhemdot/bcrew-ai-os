import { Pool } from 'pg'

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
    id: 'GOV-002',
    title: 'Build meeting effectiveness scoring',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 11,
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
    rank: 12,
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
    rank: 13,
    source: 'Foundation system design',
    summary: 'Show where the business is drifting from strategy by pillar, department, cadence, and source health.',
    whyItMatters: 'Leadership should be able to see where reality is diverging from the plan before that drift becomes damage.',
    nextAction: 'Define the drift categories and how they roll up into one executive view.',
    statusNote: 'Becomes much more powerful once governance and people intelligence exist.',
  },
  {
    id: 'GOV-003',
    title: 'Build strategy-to-calendar enforcement',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 14,
    source: 'Governance system design',
    summary: 'If the strategy defines a cadence, the system should verify it exists on the calendar and flag gaps before the cadence breaks.',
    whyItMatters: 'Strategy should show up in the calendar, not just in documents.',
    nextAction: 'Map required meetings and review cadences to calendar checks and missing-event alerts.',
    statusNote: 'Direct extension of the governance accountability layer.',
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

const docSourceSnapshotsSeed = [
  {
    id: 'DOCSNAP-001',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2026',
    value: '$310M',
    detail: 'Team sales-volume target from the Benson Crew Bhag Builder',
    asOf: '2026-04-12',
    sortOrder: 1,
  },
  {
    id: 'DOCSNAP-002',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2027',
    value: '$465M',
    detail: 'Team sales-volume target from the Benson Crew Bhag Builder',
    asOf: '2026-04-12',
    sortOrder: 2,
  },
  {
    id: 'DOCSNAP-003',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2028',
    value: '$698M',
    detail: 'Team sales-volume target from the Benson Crew Bhag Builder',
    asOf: '2026-04-12',
    sortOrder: 3,
  },
  {
    id: 'DOCSNAP-004',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2029',
    value: '$1.05B',
    detail: 'Team sales-volume target from the Benson Crew Bhag Builder',
    asOf: '2026-04-12',
    sortOrder: 4,
  },
  {
    id: 'DOCSNAP-005',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2030',
    value: '$1.57B',
    detail: 'Team sales-volume target from the Benson Crew Bhag Builder',
    asOf: '2026-04-12',
    sortOrder: 5,
  },
  {
    id: 'DOCSNAP-006',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2031',
    value: '$2B',
    detail: 'Team sales-volume target from the Benson Crew Bhag Builder',
    asOf: '2026-04-12',
    sortOrder: 6,
  },
  {
    id: 'DOCSNAP-007',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Combined downline',
    value: '675 agents',
    detail: 'Current combined ownership-group downline at Real Broker',
    asOf: '2026-04-12',
    sortOrder: 1,
  },
  {
    id: 'DOCSNAP-008',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Scott',
    value: '584',
    detail: 'Downline count',
    asOf: '2026-04-12',
    sortOrder: 2,
  },
  {
    id: 'DOCSNAP-009',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Steve',
    value: '50',
    detail: 'Downline count',
    asOf: '2026-04-12',
    sortOrder: 3,
  },
  {
    id: 'DOCSNAP-010',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Ryan',
    value: '31',
    detail: 'Downline count',
    asOf: '2026-04-12',
    sortOrder: 4,
  },
  {
    id: 'DOCSNAP-011',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Blake',
    value: '0',
    detail: 'Downline count',
    asOf: '2026-04-12',
    sortOrder: 5,
  },
  {
    id: 'DOCSNAP-012',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Nick',
    value: '10',
    detail: 'Downline count',
    asOf: '2026-04-12',
    sortOrder: 6,
  },
]

async function seedTable(client, tableName, rows, insertSql, valuesBuilder) {
  for (const row of rows) {
    const values = valuesBuilder(row)
    await client.query(insertSql, values)
  }
}

export async function initFoundationDb() {
  const client = await pool.connect()

  try {
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

    await seedTable(
      client,
      'doc_source_snapshots',
      docSourceSnapshotsSeed,
      `
        INSERT INTO doc_source_snapshots (
          id, doc_path, source_id, group_title, label, value, detail, as_of, sort_order
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING
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
