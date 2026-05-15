// Static Foundation bootstrap seed defaults.
// Live Postgres/API remains operational truth after bootstrap; these arrays are not a repair path.

export const foundationUserSeed = [
  {
    email: 'ai@bensoncrew.ca',
    name: 'AI',
    tier: null,
    userType: 'system',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'crewbert@bensoncrew.ca',
    name: 'Crewbert',
    tier: null,
    userType: 'system',
    active: true,
    meetingSyncEnabled: false,
  },
  {
    email: 'steve.zahnd@bensoncrew.ca',
    name: 'Steve',
    tier: 1,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'nick.bergmann@bensoncrew.ca',
    name: 'Nick',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'carsonc@bensoncrew.ca',
    name: 'Carson',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'ryanc@bensoncrew.ca',
    name: 'Ryan',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'blake.berfelz@bensoncrew.ca',
    name: 'Blake',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'scottb@bensoncrew.ca',
    name: 'Scott',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'clare.manalo@bensoncrew.ca',
    name: 'Clare',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'accounting@bensoncrew.ca',
    name: 'Ahsan',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'tanner.marsh@bensoncrew.ca',
    name: 'Tanner',
    tier: 3,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'georgia.huntley@bensoncrew.ca',
    name: 'Georgia',
    tier: 3,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
]

export const decisionsSeed = [
  {
    id: 'DEC-001',
    category: 'system',
    title: 'Canonical strategy stays in docs; volatile operating memory moves to the database',
    status: 'locked',
    summary: 'Business strategy and supporting strategy docs remain the human-readable source of truth. Daily-changing work such as backlog items, decisions, sessions, and parking-lot items belongs in the structured memory layer.',
    rationale: 'The old system already proved that markdown backlogs go stale. We want readable docs and durable operational memory, not one thing pretending to be both.',
    sourceRef: 'Old system backlog lessons + rebuild decisions',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Rebuild session decisions on 2026-04-11',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-002',
    category: 'strategy',
    title: 'North Star distinguishes the team goal from the downline goal',
    status: 'locked',
    summary: 'Benson Crew is building toward a $2B real estate team while growing the combined Benson Crew leadership downline at Real Broker toward 10,000 agents.',
    rationale: 'The $2B target is team production. The 10,000-agent target is the combined leadership downline at Real Broker, not Benson Crew headcount.',
    sourceRef: 'Business strategy lock pass',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Business strategy lock pass',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-003',
    category: 'system',
    title: 'Freedom Sheet sections are now treated as source contracts',
    status: 'locked',
    summary: 'A:E owns team/member data, G:O owns community/downline tracking, P:U owns community revenue, Agent Engine owns live operating assumptions, and BHAG Builder owns long-range targets.',
    rationale: 'The system must reference stable source IDs so the location can change later without breaking every consumer.',
    sourceRef: 'Freedom Sheet verification on 2026-04-12',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Freedom Sheet verification on 2026-04-12',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-004',
    category: 'system',
    title: 'Start with OpenClaw-native memory plus Postgres business memory',
    status: 'locked',
    summary: 'We are not building the full world-class memory layer from scratch first. We are starting with OpenClaw-native memory for agent recall and Postgres for business memory.',
    rationale: 'This gives us a strong baseline quickly, keeps data local, and leaves room to benchmark Honcho or Hindsight later if recall quality still falls short.',
    sourceRef: 'Memory architecture review',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Memory architecture review',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-005',
    category: 'system',
    title: 'Live values come from source contracts, not markdown snapshots',
    status: 'locked',
    summary: 'Strategy docs explain what the numbers mean and which source owns them. The system should render live values from source IDs so changes propagate across the full system.',
    rationale: 'Markdown is good for meaning and rules, but it is the wrong place to act as a live calculator. Source systems own mutable math.',
    sourceRef: 'Strategy lock pass on live source-of-truth rendering',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Strategy lock pass on live source-of-truth rendering',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-006',
    category: 'system',
    title: 'Source contracts must power source access in the UI',
    status: 'locked',
    summary: 'Every source-backed view should use structured source-contract metadata for source IDs, status, and open/edit access instead of hardcoded frontend links.',
    rationale: 'If source access lives in ad hoc UI code, users and agents lose trust quickly and the system drifts away from the real source of truth.',
    sourceRef: 'Foundation audit on 2026-04-13',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Foundation audit on 2026-04-13',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-007',
    category: 'system',
    title: 'The operating system should act as a live strategic operator, not just a passive recorder',
    status: 'locked',
    summary: 'The system should sit across leadership and department cadences, understand what teams are working on, compare activity against strategy and priorities, flag drift or low-value work, and help turn meeting decisions into structured follow-through in connected systems.',
    rationale: 'The point of the operating system is not just to store notes or summarize meetings. It should help keep the business on track in real time by connecting strategy, meetings, accountability, and execution.',
    sourceRef: 'Leadership meeting operator direction on 2026-04-14',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Leadership meeting operator direction on 2026-04-14',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact meeting/session link later if needed.',
  },
]

export const parkingLotSeed = [
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

export const openQuestionsSeed = [
  {
    id: 'Q-001',
    title: 'What is the final definition of the live attrition metric in the Agent Engine?',
    summary: 'Resolved for current Foundation purposes: planning attrition and live operating attrition are different metrics, and non-producing-agent departures should not count against production-roster attrition. Remaining hardening belongs in Agent Engine source docs and ENGINE-001, not this open-question queue.',
    owner: 'Strategy',
    status: 'resolved',
    resolvedAt: '2026-04-26T20:30:00.000Z',
    resolvedBy: 'codex',
    resolutionNote: 'Closed during Foundation Operations cleanup. The current operating rule is captured in Agent Engine docs and operating truths; ENGINE-001 owns later hardening of planning attrition as a first-class source-backed input.',
  },
  {
    id: 'Q-002',
    title: 'Which external sources should stay external versus be internalized over time?',
    summary: 'Resolved as a standing source-contract doctrine instead of a single open question. AIOS keeps external systems while they are source truth, maps them through source contracts, and internalizes only when a scoped backlog card proves the replacement boundary.',
    owner: 'Strategy',
    status: 'resolved',
    resolvedAt: '2026-04-26T20:30:00.000Z',
    resolvedBy: 'codex',
    resolutionNote: 'Closed during Foundation Operations cleanup. Data Sources, Systems, and the live Backlog now own source-by-source migration decisions; this broad question should not stay open forever.',
  },
  {
    id: 'Q-003',
    title: 'Where should partner commissions be normalized in the finance stack?',
    summary: 'Resolved out of the open-question queue and routed to FINANCE-001. Current reality is signed off: Weekly Actuals is source truth, and Cashflow Dash is the management interpretation layer that backs partner commissions out for current reporting. The deeper normalization policy is scoped finance work.',
    owner: 'Finance',
    status: 'resolved',
    resolvedAt: '2026-04-26T20:30:00.000Z',
    resolvedBy: 'codex',
    resolutionNote: 'Closed during Foundation Operations cleanup. Keep FINANCE-001 as the active work card; do not leave the same issue duplicated as an open question.',
  },
  {
    id: 'Q-004',
    title: 'What is the final row grain and unresolved field-definition boundary of the Owners Dashboard Admin tab?',
    summary: 'Resolved for Owners Admin v1. The signed-off rule is that a trade can have multiple credited rows; source fields and reporting fields must live on credited rows, while cash anchor fields stay on the anchor row. Remaining malformed trade and field cleanup belongs in data/backlog cards, not this open-question queue.',
    owner: 'Operations',
    status: 'resolved',
    resolvedAt: '2026-04-26T20:30:00.000Z',
    resolvedBy: 'codex',
    resolutionNote: 'Closed during Foundation Operations cleanup. Owners Admin v1 source-package closeout is done; remaining cleanup is routed through Ops findings and data/backlog cards such as DATA-010 rather than a stale open question.',
  },
  {
    id: 'Q-005',
    title: 'What are the remaining unresolved Admin-tab field definitions?',
    summary: 'Merged into Q-004 during the Foundation open-question cleanup. The remaining Admin-tab unknowns now live under the broader row-grain and field-definition question instead of existing as a duplicate.',
    owner: 'Operations',
    status: 'resolved',
    resolvedAt: '2026-04-15T23:39:57.225Z',
    resolvedBy: 'codex',
    resolutionNote: 'Merged into Q-004 during the Foundation open-question cleanup. The remaining Admin-tab unknowns are now tracked under the broader row-grain and field-definition question instead of living as a duplicate.',
  },
]

export const memoryStatusSeed = [
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

export const docSourceSnapshotsSeed = [
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

export const FOUNDATION_CORE_SEED_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-003'
export const FOUNDATION_CORE_SEED_SPLIT_SPRINT_ID = 'foundation-db-core-seed-split-2026-05-15'
export const FOUNDATION_CORE_SEED_SPLIT_CLOSEOUT_KEY = 'foundation-core-seed-split-v1'
export const FOUNDATION_CORE_SEED_SPLIT_PLAN_PATH = 'docs/process/foundation-db-core-seed-split-003-plan.md'
export const FOUNDATION_CORE_SEED_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-003.json'
export const FOUNDATION_CORE_SEED_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-core-seed-split-check.mjs'
export const FOUNDATION_CORE_SEED_SPLIT_BEFORE_LINES = 13200

const expectedCoreSeedInvariants = Object.freeze({
  foundationUserSeed: {
    count: 12,
    requiredIds: ['ai@bensoncrew.ca', 'steve.zahnd@bensoncrew.ca', 'georgia.huntley@bensoncrew.ca'],
  },
  decisionsSeed: {
    count: 7,
    requiredIds: ['DEC-001', 'DEC-007'],
  },
  parkingLotSeed: {
    count: 2,
    requiredIds: ['PARK-001', 'PARK-002'],
  },
  openQuestionsSeed: {
    count: 5,
    requiredIds: ['Q-001', 'Q-005'],
  },
  memoryStatusSeed: {
    count: 5,
    requiredIds: ['strategy-docs', 'source-health'],
  },
  docSourceSnapshotsSeed: {
    count: 25,
    requiredIds: ['DOCSNAP-001', 'DOCSNAP-033'],
  },
})

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function arrayIds(rows = [], key) {
  return rows.map(row => String(row?.[key] || '').trim()).filter(Boolean)
}

export function getFoundationCoreSeedSummary() {
  return {
    foundationUserSeed: {
      count: foundationUserSeed.length,
      ids: arrayIds(foundationUserSeed, 'email'),
    },
    decisionsSeed: {
      count: decisionsSeed.length,
      ids: arrayIds(decisionsSeed, 'id'),
    },
    parkingLotSeed: {
      count: parkingLotSeed.length,
      ids: arrayIds(parkingLotSeed, 'id'),
    },
    openQuestionsSeed: {
      count: openQuestionsSeed.length,
      ids: arrayIds(openQuestionsSeed, 'id'),
    },
    memoryStatusSeed: {
      count: memoryStatusSeed.length,
      ids: arrayIds(memoryStatusSeed, 'componentKey'),
    },
    docSourceSnapshotsSeed: {
      count: docSourceSnapshotsSeed.length,
      ids: arrayIds(docSourceSnapshotsSeed, 'id'),
    },
  }
}

function addEvaluationCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function summaryMatchesExpected(summary = getFoundationCoreSeedSummary()) {
  const failures = []
  for (const [key, expected] of Object.entries(expectedCoreSeedInvariants)) {
    const actual = summary[key] || { count: 0, ids: [] }
    if (actual.count !== expected.count) failures.push(`${key}:count:${actual.count}`)
    for (const id of expected.requiredIds) {
      if (!actual.ids.includes(id)) failures.push(`${key}:missing:${id}`)
    }
  }
  return { ok: failures.length === 0, failures }
}

export function evaluateFoundationCoreSeedSplit({
  foundationDbSource = '',
  coreSeedSource = '',
  foundationDbLineCount = countTextLines(foundationDbSource),
  preSplitFoundationDbLineCount = FOUNDATION_CORE_SEED_SPLIT_BEFORE_LINES,
  seedSummary = getFoundationCoreSeedSummary(),
} = {}) {
  const checks = []
  const seedNames = [
    'foundationUserSeed',
    'decisionsSeed',
    'parkingLotSeed',
    'openQuestionsSeed',
    'memoryStatusSeed',
    'docSourceSnapshotsSeed',
  ]
  const seedInvariant = summaryMatchesExpected(seedSummary)

  addEvaluationCheck(
    checks,
    seedNames.every(name => coreSeedSource.includes(`export const ${name}`)) &&
      coreSeedSource.includes('Live Postgres/API remains operational truth after bootstrap'),
    'core seed module owns exported static seed arrays and truth-boundary warning',
    'exports and warning present',
  )
  addEvaluationCheck(
    checks,
    foundationDbSource.includes('./foundation-core-seed.js') &&
      seedNames.every(name => foundationDbSource.includes(name)),
    'foundation-db imports static seed arrays from the core seed module',
    'import and seed names present',
  )
  addEvaluationCheck(
    checks,
    seedNames.every(name => !(new RegExp(`const\\s+${name}\\s*=\\s*\\[`).test(foundationDbSource))),
    'foundation-db no longer defines extracted static seed arrays inline',
    'old inline seed array definitions absent',
  )
  addEvaluationCheck(
    checks,
    seedInvariant.ok,
    'static seed IDs and counts match expected bootstrap invariants',
    seedInvariant.ok ? 'seed invariants match' : seedInvariant.failures.join(', '),
  )
  addEvaluationCheck(
    checks,
    foundationDbSource.includes('const includeBootstrapSeed = options?.includeBootstrapSeed === true') &&
      foundationDbSource.includes('if (includeBootstrapSeed) {'),
    'initFoundationDb keeps explicit bootstrap seed posture',
    'default schema-only posture remains visible',
  )
  addEvaluationCheck(
    checks,
    foundationDbLineCount > 0 && foundationDbLineCount < preSplitFoundationDbLineCount,
    'foundation-db line count decreases after the core seed split',
    `${foundationDbLineCount} < ${preSplitFoundationDbLineCount}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    seedSummary,
    seedInvariant,
    foundationDbLineCount,
    preSplitFoundationDbLineCount,
  }
}

export function buildFoundationCoreSeedSplitDogfoodProof() {
  const unsplit = evaluateFoundationCoreSeedSplit({
    foundationDbSource: `
      const foundationUserSeed = []
      const decisionsSeed = []
      const parkingLotSeed = []
      const openQuestionsSeed = []
      const memoryStatusSeed = []
      const docSourceSnapshotsSeed = []
      export async function initFoundationDb(options = {}) {
        const includeBootstrapSeed = options?.includeBootstrapSeed === true
        if (includeBootstrapSeed) {}
      }
    `,
    coreSeedSource: '',
    foundationDbLineCount: FOUNDATION_CORE_SEED_SPLIT_BEFORE_LINES,
    seedSummary: {
      foundationUserSeed: { count: 0, ids: [] },
      decisionsSeed: { count: 0, ids: [] },
      parkingLotSeed: { count: 0, ids: [] },
      openQuestionsSeed: { count: 0, ids: [] },
      memoryStatusSeed: { count: 0, ids: [] },
      docSourceSnapshotsSeed: { count: 0, ids: [] },
    },
  })

  const split = evaluateFoundationCoreSeedSplit({
    foundationDbSource: `
      import {
        decisionsSeed,
        docSourceSnapshotsSeed,
        foundationUserSeed,
        memoryStatusSeed,
        openQuestionsSeed,
        parkingLotSeed,
      } from './foundation-core-seed.js'
      export async function initFoundationDb(options = {}) {
        const includeBootstrapSeed = options?.includeBootstrapSeed === true
        if (includeBootstrapSeed) {}
      }
    `,
    coreSeedSource: `
      // Live Postgres/API remains operational truth after bootstrap.
      export const foundationUserSeed = []
      export const decisionsSeed = []
      export const parkingLotSeed = []
      export const openQuestionsSeed = []
      export const memoryStatusSeed = []
      export const docSourceSnapshotsSeed = []
    `,
    foundationDbLineCount: FOUNDATION_CORE_SEED_SPLIT_BEFORE_LINES - 500,
    seedSummary: getFoundationCoreSeedSummary(),
  })

  return {
    ok: unsplit.ok === false && split.ok === true,
    unsplit,
    split,
    invariant: 'The old inline seed ownership shape fails; the split shape only passes when the core seed module owns static arrays, foundation-db imports them, seed invariants match, and bootstrap posture remains explicit.',
  }
}
