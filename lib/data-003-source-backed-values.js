export const DATA_003_CARD_ID = 'DATA-003'
export const DATA_003_NEXT_CARD_ID = 'FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001'
export const DATA_003_SPRINT_ID = 'FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19'
export const DATA_003_CLOSEOUT_KEY = 'data-003-source-backed-values-v1'
export const DATA_003_PLAN_PATH = 'docs/process/data-003-plan.md'
export const DATA_003_APPROVAL_PATH = 'docs/process/approvals/DATA-003.json'
export const DATA_003_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-data-003-source-backed-values-closeout.md'
export const DATA_003_SCRIPT_PATH = 'scripts/process-data-003-check.mjs'

export const DATA_003_PROOF_COMMANDS = [
  'node --check lib/data-003-source-backed-values.js scripts/process-data-003-check.mjs public/foundation-strategy-renderers.js',
  'npm run process:data-003-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=DATA-003 --planApprovalRef=docs/process/approvals/DATA-003.json --closeoutKey=data-003-source-backed-values-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=DATA-003 --closeoutKey=data-003-source-backed-values-v1',
  'npm run process:foundation-ship -- --card=DATA-003 --planApprovalRef=docs/process/approvals/DATA-003.json --closeoutKey=data-003-source-backed-values-v1 --commitRef=HEAD',
]

export const DATA_003_CHANGED_FILES = [
  'lib/data-003-source-backed-values.js',
  'scripts/process-data-003-check.mjs',
  'public/foundation-strategy-renderers.js',
  'public/styles-strategy-docs.css',
  'package.json',
  DATA_003_PLAN_PATH,
  DATA_003_APPROVAL_PATH,
  DATA_003_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
]

export const DATA_003_NOT_NEXT_BOUNDARIES = [
  'No source sync, extraction, browser session, OCR, transcription, screenshot, model/provider call, or broad crawl.',
  'No source-data mutation, Drive permission mutation, credential mutation, external send, public exposure, or Value Builder split.',
  'No Strategy Hub redesign; this card only renders the first source-backed values from already governed Strategy doc snapshots.',
]

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value, fallback = '') {
  return String(value ?? fallback).trim()
}

function unique(values = []) {
  return Array.from(new Set(list(values).map(value => text(value)).filter(Boolean)))
}

function contractMap(sourceContracts = []) {
  const map = new Map()
  list(sourceContracts).forEach(contract => {
    const sourceId = text(contract.sourceId || contract.source_id || contract.id)
    if (sourceId && !map.has(sourceId)) map.set(sourceId, contract)
  })
  return map
}

function rowsForGroup(doc = {}, groupTitle = '') {
  return list(doc.sourceSnapshot)
    .filter(row => text(row.groupTitle || row.group_title) === groupTitle)
    .sort((left, right) => Number(left.sortOrder || left.sort_order || 0) - Number(right.sortOrder || right.sort_order || 0))
}

function rowByLabel(rows = [], label = '') {
  return list(rows).find(row => text(row.label) === label) || null
}

function sourceBadge(sourceId, contractsById) {
  const contract = contractsById.get(sourceId) || {}
  const trustScore = contract.trustScore || {}
  return {
    sourceId,
    title: text(contract.title || contract.unitName || sourceId, sourceId),
    status: text(contract.status || 'unknown'),
    validation: text(contract.validation || 'unknown'),
    decisionState: text(trustScore.decisionState || trustScore.state || ''),
    score: Number.isFinite(Number(trustScore.score)) ? Number(trustScore.score) : null,
  }
}

export function buildLiveSourceValueCardModel({
  cardId,
  title,
  kind,
  docPath,
  groupTitle,
  rows = [],
  labels = [],
  sourceIds = [],
  sourceContracts = [],
  summary = '',
} = {}) {
  const contractsById = contractMap(sourceContracts)
  const values = labels
    .map(label => rowByLabel(rows, label))
    .filter(Boolean)
    .map(row => ({
      label: text(row.label),
      value: text(row.value),
      sourceId: text(row.sourceId || row.source_id),
      detail: text(row.detail),
      asOf: text(row.asOf || row.as_of),
    }))
  const resolvedSourceIds = unique([
    ...sourceIds,
    ...values.map(row => row.sourceId),
  ])

  return {
    cardId: text(cardId),
    title: text(title),
    kind: text(kind),
    docPath: text(docPath),
    groupTitle: text(groupTitle),
    summary: text(summary),
    sourceIds: resolvedSourceIds,
    sourceBadges: resolvedSourceIds.map(sourceId => sourceBadge(sourceId, contractsById)),
    values,
  }
}

export function buildData003LiveSourceBackedValues({
  bhagDoc = {},
  engineDoc = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const sourceContracts = [
    ...list(bhagDoc.sourceContracts),
    ...list(engineDoc.sourceContracts),
  ]
  const teamRows = rowsForGroup(bhagDoc, 'Team Goal: $2B')
  const communityRows = rowsForGroup(bhagDoc, 'Community Goal: 10,000 Agents')
  const engineInputRows = rowsForGroup(engineDoc, 'Engine Inputs')
  const engineRequirementRows = rowsForGroup(engineDoc, 'Current Requirement')

  const cards = [
    buildLiveSourceValueCardModel({
      cardId: 'team-bhag-pace',
      title: 'Team BHAG Pace',
      kind: 'bhag_milestone',
      docPath: 'docs/strategy/bhag-model.md',
      groupTitle: 'Team Goal: $2B',
      rows: teamRows,
      labels: ['2026', 'Should Be', 'Actual', 'Pace'],
      sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-OWNERS-001'],
      sourceContracts,
      summary: 'Team volume target and current pace come from BHAG Builder and Owners Dashboard source rows.',
    }),
    buildLiveSourceValueCardModel({
      cardId: 'community-bhag-pace',
      title: 'Community BHAG Pace',
      kind: 'bhag_milestone',
      docPath: 'docs/strategy/bhag-model.md',
      groupTitle: 'Community Goal: 10,000 Agents',
      rows: communityRows,
      labels: ['2026', 'Should Be', 'Actual', 'Pace'],
      sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-COMMUNITY-001'],
      sourceContracts,
      summary: 'Community count target and pace stay separate from Benson Crew active productive team capacity.',
    }),
    buildLiveSourceValueCardModel({
      cardId: 'agent-engine-assumptions',
      title: 'Agent Engine Assumptions',
      kind: 'engine_assumption',
      docPath: 'docs/strategy/agent-engine.md',
      groupTitle: 'Engine Inputs',
      rows: [...engineInputRows, ...engineRequirementRows],
      labels: ['Average Monthly GCI', 'Split to Team', 'Planning Attrition Assumption', 'Required Recruiting Pace', 'Current Recruiting Pace'],
      sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001'],
      sourceContracts,
      summary: 'Capacity math uses source-owned assumptions instead of markdown-edited values.',
    }),
    buildLiveSourceValueCardModel({
      cardId: 'agent-engine-capacity',
      title: 'Agent Engine Capacity',
      kind: 'engine_capacity',
      docPath: 'docs/strategy/agent-engine.md',
      groupTitle: 'Current Requirement',
      rows: engineRequirementRows,
      labels: ['Required Agents This Year', 'Current Active Agents', 'Gap This Year', 'Production Gap'],
      sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001'],
      sourceContracts,
      summary: 'Active productive agent capacity and production gap are read from the live Agent Engine rows.',
    }),
  ]

  return {
    generatedAt,
    cardId: DATA_003_CARD_ID,
    closeoutKey: DATA_003_CLOSEOUT_KEY,
    sourceDocPaths: ['docs/strategy/bhag-model.md', 'docs/strategy/agent-engine.md'],
    cards,
    summary: {
      cardCount: cards.length,
      sourceIdCount: unique(cards.flatMap(card => card.sourceIds)).length,
      valueCount: cards.reduce((sum, card) => sum + card.values.length, 0),
    },
  }
}

export function evaluateData003SourceBackedValues({
  snapshot = {},
  rendererSource = '',
  docRendererSource = '',
  sourceOfTruthPayloadSource = '',
  planSource = '',
  closeoutRegistrySource = '',
} = {}) {
  const cards = list(snapshot.cards)
  const sourceIds = unique(cards.flatMap(card => card.sourceIds))
  const failed = []

  function check(ok, name, detail = '') {
    if (!ok) failed.push({ check: name, detail })
  }

  check(cards.length >= 4, 'at least four live source value cards are built', String(cards.length))
  check(['team-bhag-pace', 'community-bhag-pace', 'agent-engine-assumptions', 'agent-engine-capacity'].every(id => cards.some(card => card.cardId === id)), 'required value card ids exist', cards.map(card => card.cardId).join(', '))
  check(cards.every(card => list(card.values).length >= 3), 'every card has multiple live values', cards.map(card => `${card.cardId}:${list(card.values).length}`).join(', '))
  check(cards.every(card => list(card.sourceBadges).length >= 1), 'every card has source badges', cards.map(card => `${card.cardId}:${list(card.sourceBadges).length}`).join(', '))
  check(cards.every(card => list(card.values).every(value => value.sourceId && value.asOf && value.detail)), 'every displayed value keeps source/asOf/detail provenance', 'sourceId/asOf/detail')
  check(['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001', 'SRC-FREEDOM-COMMUNITY-001', 'SRC-OWNERS-001'].every(sourceId => sourceIds.includes(sourceId)), 'required strategy source ids are represented', sourceIds.join(', '))
  check(rendererSource.includes('renderLiveSourceBackedValuesPanel') && rendererSource.includes('buildLiveSourceValueCardModel'), 'Strategy Overview renderer owns the live values panel', 'public/foundation-strategy-renderers.js')
  check(rendererSource.includes("fetchDoc('docs/strategy/bhag-model.md')") && rendererSource.includes("fetchDoc('docs/strategy/agent-engine.md')"), 'Strategy Overview fetches live doc snapshots', 'BHAG + Agent Engine docs')
  check(rendererSource.includes('live-source-value-grid') && rendererSource.includes('doc-source-id'), 'renderer includes source badge/value UI hooks', 'live-source-value-grid/doc-source-id')
  check(docRendererSource.includes('renderBhagSummaryCard') && docRendererSource.includes('renderEngineRequirementCard'), 'supporting docs still render inline live source cards', 'BHAG/Agent Engine card renderers')
  check(!sourceOfTruthPayloadSource.includes('getLiveBhagSourceSnapshot') && !sourceOfTruthPayloadSource.includes('getLiveAgentEngineSourceSnapshot'), '/api/source-of-truth remains compact and does not add live Google sheet reads', 'route budget boundary')
  check(planSource.includes('first live-rendered source cards') && planSource.includes('BHAG milestones') && planSource.includes('Agent Engine assumptions'), 'plan names DATA-003 first slice', DATA_003_PLAN_PATH)
  check(closeoutRegistrySource.includes(DATA_003_CLOSEOUT_KEY), 'closeout registry includes DATA-003 closeout key', DATA_003_CLOSEOUT_KEY)

  return {
    ok: failed.length === 0,
    failed,
    summary: snapshot.summary || {},
  }
}

export function buildSyntheticData003DocPayloads() {
  const contracts = [
    { sourceId: 'SRC-FREEDOM-BHAG-001', title: 'BHAG Builder', status: 'Verified Readable', validation: 'Signed Off', actions: [{ label: 'Open source', href: '/foundation#source-registry' }], trustScore: { score: 91, decisionState: 'decision_safe' } },
    { sourceId: 'SRC-FREEDOM-ENGINE-001', title: 'Agent Engine', status: 'Verified Readable', validation: 'Signed Off', actions: [{ label: 'Open source', href: '/foundation#source-registry' }], trustScore: { score: 88, decisionState: 'decision_safe' } },
    { sourceId: 'SRC-FREEDOM-COMMUNITY-001', title: 'Community Tracker', status: 'Verified Readable', validation: 'Readable Only', actions: [{ label: 'Open source', href: '/foundation#source-registry' }], trustScore: { score: 78, decisionState: 'usable_with_review' } },
    { sourceId: 'SRC-OWNERS-001', title: 'Owners Dashboard', status: 'Verified Readable', validation: 'Signed Off', actions: [{ label: 'Open source', href: '/foundation#source-registry' }], trustScore: { score: 94, decisionState: 'decision_safe' } },
  ]

  function row(docPath, sourceId, groupTitle, label, value, detail, sortOrder) {
    return { docPath, sourceId, groupTitle, label, value, detail, asOf: '2026-05-20', sortOrder }
  }

  return {
    bhagDoc: {
      meta: { path: 'docs/strategy/bhag-model.md' },
      sourceContracts: contracts,
      sourceSnapshot: [
        row('docs/strategy/bhag-model.md', 'SRC-FREEDOM-BHAG-001', 'Team Goal: $2B', '2026', '$120M', 'Target from BHAG Builder.', 1),
        row('docs/strategy/bhag-model.md', 'SRC-OWNERS-001', 'Team Goal: $2B', 'Should Be', '$52M', 'Prorated target from Owners/BHAG proof.', 11),
        row('docs/strategy/bhag-model.md', 'SRC-OWNERS-001', 'Team Goal: $2B', 'Actual', '$54M YTD', 'Executed-date volume from Owners Dashboard.', 12),
        row('docs/strategy/bhag-model.md', 'SRC-OWNERS-001', 'Team Goal: $2B', 'Pace', 'Ahead by $2M', 'Executed-date pace proof.', 13),
        row('docs/strategy/bhag-model.md', 'SRC-FREEDOM-BHAG-001', 'Community Goal: 10,000 Agents', '2026', '420 agents', 'Target from BHAG Builder.', 1),
        row('docs/strategy/bhag-model.md', 'SRC-FREEDOM-COMMUNITY-001', 'Community Goal: 10,000 Agents', 'Should Be', '410 agents', 'Prorated community target.', 12),
        row('docs/strategy/bhag-model.md', 'SRC-FREEDOM-COMMUNITY-001', 'Community Goal: 10,000 Agents', 'Actual', '425 agents', 'Community tracker current count.', 13),
        row('docs/strategy/bhag-model.md', 'SRC-FREEDOM-COMMUNITY-001', 'Community Goal: 10,000 Agents', 'Pace', 'Ahead by 15 agents', 'Community tracker pace proof.', 14),
      ],
    },
    engineDoc: {
      meta: { path: 'docs/strategy/agent-engine.md' },
      sourceContracts: contracts,
      sourceSnapshot: [
        row('docs/strategy/agent-engine.md', 'SRC-FREEDOM-BHAG-001', 'Engine Inputs', 'Average Monthly GCI', '$50K / mo', 'BHAG Builder assumption.', 1),
        row('docs/strategy/agent-engine.md', 'SRC-FREEDOM-BHAG-001', 'Engine Inputs', 'Split to Team', '20%', 'BHAG Builder assumption.', 2),
        row('docs/strategy/agent-engine.md', 'SRC-FREEDOM-BHAG-001', 'Current Requirement', 'Required Agents This Year', '70 agents', 'Current-year requirement.', 2),
        row('docs/strategy/agent-engine.md', 'SRC-FREEDOM-ENGINE-001', 'Current Requirement', 'Current Active Agents', '55 agents', 'Agent Engine live count.', 5),
        row('docs/strategy/agent-engine.md', 'SRC-FREEDOM-ENGINE-001', 'Current Requirement', 'Gap This Year', 'Behind by 15 agents', 'Agent Engine live gap.', 6),
        row('docs/strategy/agent-engine.md', 'SRC-FREEDOM-ENGINE-001', 'Current Requirement', 'Required Recruiting Pace', '4 / mo', 'Agent Engine live requirement.', 8),
        row('docs/strategy/agent-engine.md', 'SRC-FREEDOM-ENGINE-001', 'Current Requirement', 'Current Recruiting Pace', '3 / mo', 'Agent Engine live pace.', 9),
        row('docs/strategy/agent-engine.md', 'SRC-FREEDOM-ENGINE-001', 'Current Requirement', 'Production Gap', 'Behind by $5K', 'Agent Engine production gap.', 12),
        row('docs/strategy/agent-engine.md', 'SRC-FREEDOM-BHAG-001', 'Current Requirement', 'Planning Attrition Assumption', '8%', 'BHAG Builder attrition assumption.', 13),
      ],
    },
  }
}

export function buildData003DogfoodProof() {
  const healthyPayloads = buildSyntheticData003DocPayloads()
  const healthy = buildData003LiveSourceBackedValues(healthyPayloads)
  const broken = buildData003LiveSourceBackedValues({
    bhagDoc: { ...healthyPayloads.bhagDoc, sourceSnapshot: healthyPayloads.bhagDoc.sourceSnapshot.map(row => ({ ...row, sourceId: '', asOf: '' })) },
    engineDoc: healthyPayloads.engineDoc,
    generatedAt: '2026-05-20T00:00:00.000Z',
  })
  const healthyEval = evaluateData003SourceBackedValues({
    snapshot: healthy,
    rendererSource: "function renderLiveSourceBackedValuesPanel(){} function buildLiveSourceValueCardModel(){} fetchDoc('docs/strategy/bhag-model.md') fetchDoc('docs/strategy/agent-engine.md') live-source-value-grid doc-source-id",
    docRendererSource: 'function renderBhagSummaryCard(){} function renderEngineRequirementCard(){}',
    sourceOfTruthPayloadSource: 'export async function buildSourceOfTruthPayload() {}',
    planSource: 'first live-rendered source cards BHAG milestones Agent Engine assumptions',
    closeoutRegistrySource: DATA_003_CLOSEOUT_KEY,
  })
  const brokenEval = evaluateData003SourceBackedValues({
    snapshot: broken,
    rendererSource: "function renderLiveSourceBackedValuesPanel(){} function buildLiveSourceValueCardModel(){} fetchDoc('docs/strategy/bhag-model.md') fetchDoc('docs/strategy/agent-engine.md') live-source-value-grid doc-source-id",
    docRendererSource: 'function renderBhagSummaryCard(){} function renderEngineRequirementCard(){}',
    sourceOfTruthPayloadSource: 'export async function buildSourceOfTruthPayload() {}',
    planSource: 'first live-rendered source cards BHAG milestones Agent Engine assumptions',
    closeoutRegistrySource: DATA_003_CLOSEOUT_KEY,
  })

  return {
    ok: healthyEval.ok === true && brokenEval.ok === false,
    healthy: healthyEval.summary,
    brokenFailed: brokenEval.failed.map(item => item.check),
    invariant: 'DATA-003 only passes when displayed values retain sourceId, asOf, detail, and Strategy Overview uses the live doc snapshot path.',
  }
}
