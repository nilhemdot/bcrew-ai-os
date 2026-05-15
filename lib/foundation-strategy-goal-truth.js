import {
  AGENT_ENGINE_DOC_PATH,
  BHAG_DOC_PATH,
} from './foundation-strategy-source-snapshots.js'

export const FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-006'
export const FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SPRINT_ID = 'foundation-db-strategy-goal-truth-split-2026-05-15'
export const FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CLOSEOUT_KEY = 'foundation-strategy-goal-truth-split-v1'
export const FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_PLAN_PATH = 'docs/process/foundation-db-strategy-goal-truth-split-006-plan.md'
export const FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-006.json'
export const FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-strategy-goal-truth-split-check.mjs'
export const FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_BEFORE_LINES = 11925

export const strategyPreworkExpectedParticipants = [
  { key: 'steve', name: 'Steve Zahnd', aliases: ['steve zahnd', 'steve'] },
  { key: 'scott', name: 'Scott Benson', aliases: ['scott benson', 'scott'] },
  { key: 'ryan', name: 'Ryan Campbell', aliases: ['ryan campbell', 'ryan'] },
  { key: 'carson', name: 'Carson', aliases: ['carson'] },
  { key: 'georgia', name: 'Georgia Huntley', aliases: ['georgia huntley', 'georgia'] },
  { key: 'nick', name: 'Nick Bergmann', aliases: ['nick bergmann', 'nick'] },
  { key: 'clare', name: 'Clare', aliases: ['clare'] },
  { key: 'ahsan', name: 'Ahsan', aliases: ['ahsan abdul sattar', 'ahsan'] },
  { key: 'blake', name: 'Blake Berfelz', aliases: ['blake berfelz', 'blake'] },
]

export const strategyGoalGroupKeys = [
  'team_volume',
  'community_agents',
  'agent_engine_capacity',
]

function addEvaluationCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

export function inferStrategyPreworkParticipant(row) {
  const title = String(row.title || '').toLowerCase()
  if (title.includes('template')) return ''

  for (const participant of strategyPreworkExpectedParticipants) {
    if (participant.aliases.some(alias => title.includes(alias))) return participant.key
  }

  const contentLead = String(row.content_text || row.contentText || '').slice(0, 4000).toLowerCase()
  for (const participant of strategyPreworkExpectedParticipants) {
    const namePatterns = participant.aliases.flatMap(alias => [
      `name: ${alias}`,
      `name:${alias}`,
      `from: ${alias}`,
    ])
    if (namePatterns.some(pattern => contentLead.includes(pattern))) return participant.key
  }

  return ''
}

export function isStrategyPreworkCurrent(row) {
  const title = String(row.title || '').toLowerCase()
  const contentLead = String(row.content_text || row.contentText || '').slice(0, 5000).toLowerCase()
  const metadata = row.metadata || {}
  const parentPath = String(metadata.parentPath || metadata.parentFolderName || '').toLowerCase()
  return (
    title.includes('q2') ||
    title.includes('april 2026') ||
    title.includes('strategy bensoncrew april') ||
    title.includes('steve zahnd - q2') ||
    parentPath.includes('q2') ||
    parentPath.includes('may-july') ||
    contentLead.includes('quarter: q2') ||
    contentLead.includes('quarter:q2') ||
    contentLead.includes('q2 2026') ||
    contentLead.includes('april 24, 2026') ||
    contentLead.includes('apr 24 2026') ||
    contentLead.includes('april 24, 26') ||
    contentLead.includes('april 23')
  )
}

export function getStrategyPreworkReadMethod(row) {
  const metadata = row.metadata || {}
  const method = String(metadata.extractionMethod || '')
  if (method === 'manual_visual_review_v1') return 'manual_visual_review'
  if (metadata.pdfFormFieldsUsed === true || metadata.pdfFormFieldsUsed === 'true') return 'pdf_form_fields'
  if (method.includes('ocr')) return 'rough_ocr'
  if (method.includes('google_doc')) return 'google_doc_text'
  if (method.includes('blob_text')) return 'text_file'
  if (method.includes('pdftotext')) return 'pdf_text'
  return method || 'text_artifact'
}

export function getStrategyPreworkExcerpt(row) {
  const content = String(row.content_text || row.contentText || '')
  if (!content) return ''
  const lowerContent = content.toLowerCase()
  const focusTerms = [
    '--- pdf form fields ---',
    'what do you think our company should start',
    'activity 1',
    'i learned',
    'strengths',
    'weaknesses',
    'opportunities',
    'threats',
    'priority',
    'quarterly theme',
  ]
  const firstMatch = focusTerms
    .map(term => lowerContent.indexOf(term))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0]
  const start = firstMatch >= 0 ? Math.max(0, firstMatch - 80) : 0
  return `${start > 0 ? '...' : ''}${content.slice(start, start + 900).trim()}${start + 900 < content.length ? '...' : ''}`
}

export function mapStrategyPreworkArtifact(row) {
  const metadata = row.metadata || {}
  return {
    artifactId: row.artifact_id || row.artifactId,
    sourceId: row.source_id || row.sourceId,
    artifactType: row.artifact_type || row.artifactType,
    title: row.title || '',
    sourceUrl: row.source_url || row.sourceUrl || '',
    contentLength: Number(row.content_length || row.contentLength || 0),
    participantKey: inferStrategyPreworkParticipant(row),
    currentCycle: isStrategyPreworkCurrent(row),
    readMethod: getStrategyPreworkReadMethod(row),
    extractionMethod: metadata.extractionMethod || '',
    pdfFormFieldsUsed: metadata.pdfFormFieldsUsed === true || metadata.pdfFormFieldsUsed === 'true',
    artifactUpdatedAt: row.artifact_updated_at || row.artifactUpdatedAt || null,
    ingestedAt: row.ingested_at || row.ingestedAt || null,
    excerpt: getStrategyPreworkExcerpt(row),
    metadata: {
      parentPath: metadata.parentPath || '',
      driveFileId: metadata.driveFileId || '',
      valueRoute: metadata.valueRoute || '',
    },
  }
}

export function summarizeStrategyPreworkParticipant(participant, artifacts) {
  const participantArtifacts = artifacts
    .filter(artifact => artifact.participantKey === participant.key)
    .sort((left, right) => {
      const leftCurrent = left.currentCycle ? 1 : 0
      const rightCurrent = right.currentCycle ? 1 : 0
      if (rightCurrent !== leftCurrent) return rightCurrent - leftCurrent
      return String(right.ingestedAt || '').localeCompare(String(left.ingestedAt || ''))
    })

  const currentArtifacts = participantArtifacts.filter(artifact => artifact.currentCycle)
  const usableArtifacts = currentArtifacts.length ? currentArtifacts : participantArtifacts
  const hasManualVisualReview = usableArtifacts.some(artifact => artifact.readMethod === 'manual_visual_review')
  const hasFormFields = usableArtifacts.some(artifact => artifact.pdfFormFieldsUsed)
  const hasRoughOcrOnly = usableArtifacts.length > 0 && usableArtifacts.every(artifact => artifact.readMethod === 'rough_ocr')
  const contentLength = usableArtifacts.reduce((sum, artifact) => sum + Number(artifact.contentLength || 0), 0)
  const primaryArtifact = usableArtifacts[0] || null

  let status = 'missing'
  let statusLabel = 'Missing'
  let gap = 'No current pre-strat artifact found in extracted Drive strategy evidence.'

  if (usableArtifacts.length) {
    status = 'read'
    statusLabel = 'Read'
    gap = ''
    if (hasManualVisualReview) statusLabel = 'Read - visual review'
    else if (hasFormFields) statusLabel = 'Read - form fields'
    else if (hasRoughOcrOnly) {
      status = 'needs_visual_review'
      statusLabel = 'Rough OCR'
      gap = 'Readable enough for search, but handwritten/scanned evidence still needs vision-grade review before exact quotes are trusted.'
    }
  }

  return {
    key: participant.key,
    name: participant.name,
    status,
    statusLabel,
    gap,
    artifactCount: usableArtifacts.length,
    totalArtifactCount: participantArtifacts.length,
    contentLength,
    primaryArtifact,
    artifacts: usableArtifacts.slice(0, 4),
  }
}

export function buildStrategyPreworkCoverageSnapshotFromRows(rows = [], generatedAt = new Date().toISOString()) {
  const allArtifacts = rows.map(mapStrategyPreworkArtifact)
  const artifacts = allArtifacts.filter(artifact => artifact.currentCycle)
  const participants = strategyPreworkExpectedParticipants.map(participant =>
    summarizeStrategyPreworkParticipant(participant, artifacts)
  )
  const unread = participants.filter(participant => participant.status === 'missing')
  const needsVisualReview = participants.filter(participant => participant.status === 'needs_visual_review')
  const read = participants.filter(participant => participant.status !== 'missing')
  const unassignedArtifacts = artifacts
    .filter(artifact => !artifact.participantKey)
    .map(artifact => ({
      artifactId: artifact.artifactId,
      title: artifact.title,
      sourceUrl: artifact.sourceUrl,
      contentLength: artifact.contentLength,
      readMethod: artifact.readMethod,
      artifactUpdatedAt: artifact.artifactUpdatedAt,
      ingestedAt: artifact.ingestedAt,
    }))

  return {
    generatedAt,
    sourceId: 'SRC-GDRIVE-001',
    scope: 'Q2/current strategy pre-work artifacts extracted from the Drive strategy corpus',
    expectedParticipants: strategyPreworkExpectedParticipants.map(participant => participant.name),
    summary: {
      expectedCount: participants.length,
      readCount: read.length,
      missingCount: unread.length,
      needsVisualReviewCount: needsVisualReview.length,
      artifactCount: artifacts.length,
      totalContentLength: artifacts.reduce((sum, artifact) => sum + artifact.contentLength, 0),
      status: unread.length ? 'missing_artifacts' : needsVisualReview.length ? 'needs_visual_review' : 'read_complete',
    },
    participants,
    unassignedArtifacts,
  }
}

export async function getStrategyPreworkCoverageSnapshot({ pool } = {}) {
  if (!pool || typeof pool.query !== 'function') throw new Error('Strategy prework coverage snapshot requires a queryable pool.')
  const result = await pool.query(
    `
      SELECT artifact_id, source_id, artifact_type, title, source_url,
             LENGTH(content_text)::int AS content_length,
             content_text,
             metadata,
             artifact_updated_at,
             ingested_at,
             updated_at
      FROM shared_communication_artifacts
      WHERE source_id = 'SRC-GDRIVE-001'
        AND title NOT ILIKE '%template%'
        AND (
          title ILIKE '%prestrat%'
          OR title ILIKE '%pre-strat%'
          OR title ILIKE '%pre strat%'
          OR title ILIKE '%nick_strat_doc_q2_2026%'
          OR title ILIKE '%Strategy BensonCrew April%'
          OR title ILIKE '%Steve Zahnd - Q2 2026 Pre-Strat%'
          OR title ILIKE '%Scott Q2 2026 Pre-Strat%'
        )
      ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
    `,
  )

  return buildStrategyPreworkCoverageSnapshotFromRows(result.rows)
}

export function normalizeStrategyGoalFact(row) {
  return {
    sourceId: row.sourceId || row.source_id || '',
    group: row.groupTitle || row.group_title || '',
    label: row.label || '',
    value: row.value || '',
    detail: row.detail || '',
    asOf: row.asOf || row.as_of || null,
    sortOrder: Number(row.sortOrder || row.sort_order || 0),
  }
}

export function findStrategyGoalFact(rows, group, label) {
  return rows.find(row => row.group === group && row.label === label) || null
}

export function strategyGoalStatusFromValue(value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized.startsWith('ahead') || normalized.startsWith('above target')) return 'ahead'
  if (normalized.startsWith('behind') || normalized.startsWith('below target')) return 'behind'
  return 'neutral'
}

export function buildStrategyGoalGroup({ key, title, rows, labels, rule, caveat }) {
  const facts = labels
    .map(label => findStrategyGoalFact(rows, title, label))
    .filter(Boolean)
  const paceFact =
    facts.find(fact => /pace|gap/i.test(fact.label)) ||
    facts.find(fact => /actual/i.test(fact.label)) ||
    facts[0] ||
    null

  return {
    key,
    title,
    status: strategyGoalStatusFromValue(paceFact?.value),
    statusLabel: paceFact ? `${paceFact.label}: ${paceFact.value}` : 'No live pace row',
    asOf: paceFact?.asOf || facts.find(fact => fact.asOf)?.asOf || null,
    rule,
    caveat,
    facts,
  }
}

export function buildStrategyGoalTruthSnapshotFromRows({
  bhagRowsRaw = [],
  engineRowsRaw = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const bhagRows = (bhagRowsRaw || []).map(normalizeStrategyGoalFact)
  const engineRows = (engineRowsRaw || []).map(normalizeStrategyGoalFact)
  const currentRequirementRows = engineRows.filter(row => row.group === 'Current Requirement')

  const groups = [
    buildStrategyGoalGroup({
      key: 'team_volume',
      title: 'Team Goal: $2B',
      rows: bhagRows,
      labels: ['2026', 'Should Be', 'Actual', 'Pace', '2033', '2035'],
      rule: '$2B is the Benson Crew team sales-volume goal. Pace uses Owners Dashboard executed-date Volume Credit against the prorated current-year target.',
      caveat: 'This is team production pace, not the 10,000-agent community count.',
    }),
    buildStrategyGoalGroup({
      key: 'community_agents',
      title: 'Community Goal: 10,000 Agents',
      rows: bhagRows,
      labels: ['2026', 'Should Be', 'Actual', 'Pace', '2035'],
      rule: '10,000 agents is the combined ownership-group agent organization at Real Broker, not Benson Crew team headcount.',
      caveat: 'Do not describe this path as behind if the live Pace row says Ahead. Keep this separate from active productive Benson Crew agent capacity.',
    }),
    {
      key: 'agent_engine_capacity',
      title: 'Agent Engine Capacity',
      status: strategyGoalStatusFromValue(findStrategyGoalFact(currentRequirementRows, 'Current Requirement', 'Gap This Year')?.value),
      statusLabel: findStrategyGoalFact(currentRequirementRows, 'Current Requirement', 'Gap This Year')?.value
        ? `Gap This Year: ${findStrategyGoalFact(currentRequirementRows, 'Current Requirement', 'Gap This Year').value}`
        : 'No live gap row',
      asOf: currentRequirementRows.find(row => row.asOf)?.asOf || null,
      rule: 'Agent Engine capacity is the active productive Benson Crew agent requirement. It is separate from the 10,000-agent Real Broker community path.',
      caveat: 'Use this when discussing team capacity, recruiting pace, active productive agents, production gap, and split assumptions.',
      facts: [
        'Required Agents This Year',
        'Required Start-of-Year Agents',
        'Current Active Agents',
        'Gap This Year',
        'Gap to Next Year',
        'Required Recruiting Pace',
        'Current Recruiting Pace',
        'Current Avg Production / Agent',
        'Production Target / Agent',
        'Production Gap',
        'Actual Split',
        'Target Split',
        'Split Gap',
      ].map(label => findStrategyGoalFact(currentRequirementRows, 'Current Requirement', label)).filter(Boolean),
    },
  ]

  return {
    generatedAt,
    sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001', 'SRC-FREEDOM-COMMUNITY-001', 'SRC-OWNERS-001'],
    rule: 'Any Strategy Advisor or packet claim about goal pace, behind/ahead status, $2B, 10,000 agents, recruiting pace, or active-agent capacity must use these live source rows before packet summaries, old docs, or meeting chatter.',
    groups,
  }
}

export async function getStrategyGoalTruthSnapshot({ getDocSourceSnapshot } = {}) {
  if (typeof getDocSourceSnapshot !== 'function') throw new Error('Strategy goal truth snapshot requires getDocSourceSnapshot dependency.')
  const [bhagRowsRaw, engineRowsRaw] = await Promise.all([
    getDocSourceSnapshot(BHAG_DOC_PATH),
    getDocSourceSnapshot(AGENT_ENGINE_DOC_PATH),
  ])

  return buildStrategyGoalTruthSnapshotFromRows({ bhagRowsRaw, engineRowsRaw })
}

export function buildSyntheticStrategyPreworkRows() {
  return [
    {
      artifact_id: 'synthetic-steve-prework',
      source_id: 'SRC-GDRIVE-001',
      artifact_type: 'google_doc',
      title: 'Steve Zahnd - Q2 2026 Pre-Strat',
      source_url: 'https://drive.google.example/steve',
      content_length: 3200,
      content_text: 'Quarter: Q2 2026\\n--- PDF Form Fields ---\\nWhat do you think our company should start doing? Build source-backed Foundation systems.',
      metadata: { extractionMethod: 'google_doc_text', pdfFormFieldsUsed: true, parentPath: 'Strategy / Q2' },
      artifact_updated_at: '2026-04-24T12:00:00Z',
      ingested_at: '2026-04-24T13:00:00Z',
    },
    {
      artifact_id: 'synthetic-nick-prework',
      source_id: 'SRC-GDRIVE-001',
      artifact_type: 'pdf',
      title: 'Nick Bergmann Strat Doc Q2 2026',
      source_url: 'https://drive.google.example/nick',
      content_length: 1800,
      content_text: 'Name: Nick Bergmann\\nApril 24, 2026\\nStrengths, weaknesses, opportunities, threats.',
      metadata: { extractionMethod: 'ocr_v1', parentPath: 'Strategy / May-July' },
      artifact_updated_at: '2026-04-24T12:00:00Z',
      ingested_at: '2026-04-24T13:05:00Z',
    },
    {
      artifact_id: 'synthetic-template',
      source_id: 'SRC-GDRIVE-001',
      artifact_type: 'google_doc',
      title: 'Pre-Strat Template',
      content_length: 900,
      content_text: 'Template only.',
      metadata: { extractionMethod: 'google_doc_text' },
      ingested_at: '2026-04-20T13:00:00Z',
    },
  ]
}

export function buildSyntheticStrategyGoalRows() {
  return {
    bhagRowsRaw: [
      { sourceId: 'SRC-FREEDOM-BHAG-001', groupTitle: 'Team Goal: $2B', label: '2026', value: '$120M', asOf: '2026-05-15' },
      { sourceId: 'SRC-FREEDOM-BHAG-001', groupTitle: 'Team Goal: $2B', label: 'Actual', value: '$42M', asOf: '2026-05-15' },
      { sourceId: 'SRC-FREEDOM-BHAG-001', groupTitle: 'Team Goal: $2B', label: 'Pace', value: 'Ahead by $4M', asOf: '2026-05-15' },
      { sourceId: 'SRC-FREEDOM-COMMUNITY-001', groupTitle: 'Community Goal: 10,000 Agents', label: 'Actual', value: '420', asOf: '2026-05-15' },
      { sourceId: 'SRC-FREEDOM-COMMUNITY-001', groupTitle: 'Community Goal: 10,000 Agents', label: 'Pace', value: 'Ahead', asOf: '2026-05-15' },
    ],
    engineRowsRaw: [
      { sourceId: 'SRC-FREEDOM-ENGINE-001', groupTitle: 'Current Requirement', label: 'Required Agents This Year', value: '70', asOf: '2026-05-15' },
      { sourceId: 'SRC-FREEDOM-ENGINE-001', groupTitle: 'Current Requirement', label: 'Current Active Agents', value: '55', asOf: '2026-05-15' },
      { sourceId: 'SRC-FREEDOM-ENGINE-001', groupTitle: 'Current Requirement', label: 'Gap This Year', value: 'Behind by 15', asOf: '2026-05-15' },
      { sourceId: 'SRC-FREEDOM-ENGINE-001', groupTitle: 'Current Requirement', label: 'Production Gap', value: '$12M', asOf: '2026-05-15' },
    ],
  }
}

export function buildSyntheticStrategyPreworkCoverageSnapshot() {
  return buildStrategyPreworkCoverageSnapshotFromRows(buildSyntheticStrategyPreworkRows(), '2026-05-15T18:35:00.000Z')
}

export function buildSyntheticStrategyGoalTruthSnapshot() {
  return buildStrategyGoalTruthSnapshotFromRows({
    ...buildSyntheticStrategyGoalRows(),
    generatedAt: '2026-05-15T18:35:00.000Z',
  })
}

export function evaluateSyntheticStrategyGoalTruthSnapshots({
  preworkSnapshot = buildSyntheticStrategyPreworkCoverageSnapshot(),
  goalSnapshot = buildSyntheticStrategyGoalTruthSnapshot(),
} = {}) {
  const steve = preworkSnapshot.participants.find(participant => participant.key === 'steve')
  const nick = preworkSnapshot.participants.find(participant => participant.key === 'nick')
  const groups = new Map(goalSnapshot.groups.map(group => [group.key, group]))
  const checks = []
  addEvaluationCheck(checks, preworkSnapshot.sourceId === 'SRC-GDRIVE-001', 'prework source id is preserved', preworkSnapshot.sourceId)
  addEvaluationCheck(checks, preworkSnapshot.summary.expectedCount === 9, 'prework expected participant count is preserved', String(preworkSnapshot.summary.expectedCount))
  addEvaluationCheck(checks, steve?.status === 'read' && steve?.statusLabel === 'Read - form fields', 'Steve prework form-field row maps as read', steve ? `${steve.status}/${steve.statusLabel}` : 'missing')
  addEvaluationCheck(checks, nick?.status === 'needs_visual_review' && nick?.statusLabel === 'Rough OCR', 'Nick OCR row maps as needs visual review', nick ? `${nick.status}/${nick.statusLabel}` : 'missing')
  addEvaluationCheck(checks, strategyGoalGroupKeys.every(key => groups.has(key)), 'goal truth group keys are preserved', Array.from(groups.keys()).join(', '))
  addEvaluationCheck(checks, groups.get('team_volume')?.status === 'ahead', 'team volume pace status is preserved', groups.get('team_volume')?.status || 'missing')
  addEvaluationCheck(checks, groups.get('community_agents')?.status === 'ahead', 'community agent pace status is preserved', groups.get('community_agents')?.status || 'missing')
  addEvaluationCheck(checks, groups.get('agent_engine_capacity')?.status === 'behind', 'agent engine gap status is preserved', groups.get('agent_engine_capacity')?.status || 'missing')
  addEvaluationCheck(checks, goalSnapshot.sourceIds.includes('SRC-FREEDOM-BHAG-001') && goalSnapshot.sourceIds.includes('SRC-OWNERS-001'), 'goal source ids are preserved', goalSnapshot.sourceIds.join(', '))

  return {
    ok: checks.every(check => check.ok),
    checks,
    preworkSummary: preworkSnapshot.summary,
    goalGroupStatuses: goalSnapshot.groups.map(group => ({ key: group.key, status: group.status, statusLabel: group.statusLabel })),
  }
}

export function evaluateFoundationStrategyGoalTruthSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  beforeLines = FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_BEFORE_LINES,
  afterLines = 0,
} = {}) {
  const checks = []
  addEvaluationCheck(
    checks,
    moduleSource.includes('export async function getStrategyPreworkCoverageSnapshot') &&
      moduleSource.includes('export async function getStrategyGoalTruthSnapshot') &&
      moduleSource.includes('buildStrategyPreworkCoverageSnapshotFromRows') &&
      moduleSource.includes('buildStrategyGoalTruthSnapshotFromRows'),
    'module owns Strategy prework and goal truth builders',
    'builder exports present',
  )
  addEvaluationCheck(
    checks,
    foundationDbSource.includes('getStrategyPreworkCoverageSnapshotFromSources') &&
      foundationDbSource.includes('getStrategyGoalTruthSnapshotFromSources') &&
      foundationDbSource.includes('return getStrategyPreworkCoverageSnapshotFromSources({') &&
      foundationDbSource.includes('return getStrategyGoalTruthSnapshotFromSources({'),
    'foundation-db delegates public Strategy prework and goal truth exports',
    'delegating wrappers present',
  )
  addEvaluationCheck(
    checks,
    !/const\s+strategyPreworkExpectedParticipants\s*=/.test(foundationDbSource) &&
      !/function\s+inferStrategyPreworkParticipant\s*\(/.test(foundationDbSource) &&
      !/function\s+buildStrategyGoalGroup\s*\(/.test(foundationDbSource) &&
      !/function\s+normalizeStrategyGoalFact\s*\(/.test(foundationDbSource),
    'foundation-db no longer owns extracted helper definitions inline',
    'old helper definitions absent',
  )
  addEvaluationCheck(
    checks,
    (moduleSource.includes(BHAG_DOC_PATH) || moduleSource.includes('BHAG_DOC_PATH')) &&
      (moduleSource.includes(AGENT_ENGINE_DOC_PATH) || moduleSource.includes('AGENT_ENGINE_DOC_PATH')) &&
      moduleSource.includes('SRC-GDRIVE-001') &&
      moduleSource.includes('SRC-FREEDOM-BHAG-001') &&
      moduleSource.includes('SRC-FREEDOM-ENGINE-001') &&
      moduleSource.includes('SRC-FREEDOM-COMMUNITY-001') &&
      moduleSource.includes('SRC-OWNERS-001'),
    'doc paths and source ids are preserved in the module',
    'Strategy source constants present',
  )
  addEvaluationCheck(
    checks,
    strategyGoalGroupKeys.every(key => moduleSource.includes(key)),
    'Strategy goal group keys are preserved in the module',
    strategyGoalGroupKeys.join(', '),
  )
  addEvaluationCheck(
    checks,
    scriptSource.includes('dogfood rejects old inline Strategy prework and goal truth ownership') &&
      scriptSource.includes('synthetic Strategy prework and goal snapshots preserve behavior'),
    'focused proof checks dogfood and synthetic behavior',
    FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SCRIPT_PATH,
  )
  addEvaluationCheck(
    checks,
    planSource.includes('Gate decision tree') &&
      planSource.includes('Dogfood proof recreates the unsafe pattern'),
    'plan records gate decision and dogfood acceptance',
    FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_PLAN_PATH,
  )
  addEvaluationCheck(
    checks,
    Number(afterLines) > 0 && Number(afterLines) < Number(beforeLines),
    'foundation-db line count decreases after the split',
    `${beforeLines}->${afterLines}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    beforeLines,
    afterLines,
  }
}

export function buildFoundationStrategyGoalTruthSplitDogfoodProof({ afterLines = 11000 } = {}) {
  const unsplit = evaluateFoundationStrategyGoalTruthSplit({
    foundationDbSource: `
      const strategyPreworkExpectedParticipants = []
      function inferStrategyPreworkParticipant() {}
      function normalizeStrategyGoalFact() {}
      function buildStrategyGoalGroup() {}
      export async function getStrategyPreworkCoverageSnapshot() {}
      export async function getStrategyGoalTruthSnapshot() {}
    `,
    moduleSource: '',
    scriptSource: '',
    planSource: '',
    beforeLines: FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_BEFORE_LINES,
    afterLines: FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_BEFORE_LINES,
  })
  const split = evaluateFoundationStrategyGoalTruthSplit({
    foundationDbSource: `
      import {
        getStrategyPreworkCoverageSnapshot as getStrategyPreworkCoverageSnapshotFromSources,
        getStrategyGoalTruthSnapshot as getStrategyGoalTruthSnapshotFromSources,
      } from './foundation-strategy-goal-truth.js'
      export async function getStrategyPreworkCoverageSnapshot() {
        return getStrategyPreworkCoverageSnapshotFromSources({ pool })
      }
      export async function getStrategyGoalTruthSnapshot() {
        return getStrategyGoalTruthSnapshotFromSources({ getDocSourceSnapshot })
      }
    `,
    moduleSource: `
      export async function getStrategyPreworkCoverageSnapshot() {}
      export async function getStrategyGoalTruthSnapshot() {}
      export function buildStrategyPreworkCoverageSnapshotFromRows() {}
      export function buildStrategyGoalTruthSnapshotFromRows() {}
      const paths = '${BHAG_DOC_PATH} ${AGENT_ENGINE_DOC_PATH} SRC-GDRIVE-001 SRC-FREEDOM-BHAG-001 SRC-FREEDOM-ENGINE-001 SRC-FREEDOM-COMMUNITY-001 SRC-OWNERS-001 ${strategyGoalGroupKeys.join(' ')}'
    `,
    scriptSource: 'dogfood rejects old inline Strategy prework and goal truth ownership; synthetic Strategy prework and goal snapshots preserve behavior',
    planSource: 'Gate decision tree. Dogfood proof recreates the unsafe pattern.',
    beforeLines: FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_BEFORE_LINES,
    afterLines,
  })
  return {
    ok: unsplit.ok === false && split.ok === true,
    unsplit,
    split,
    dogfoodInvariant: 'The old inline Strategy prework/goal truth shape fails evaluation; the split shape only passes when the module owns behavior and foundation-db delegates to it.',
  }
}
