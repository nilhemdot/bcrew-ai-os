import crypto from 'node:crypto'

export const SOURCE_019_CARD_ID = 'SOURCE-019'
export const SOURCE_019_CLOSEOUT_KEY = 'source-019-shared-comms-layer-v1'
export const SOURCE_019_PLAN_PATH = 'docs/process/source-019-shared-comms-layer-plan.md'
export const SOURCE_019_APPROVAL_PATH = 'docs/process/approvals/SOURCE-019.json'
export const SOURCE_019_SCRIPT_PATH = 'scripts/process-source-019-check.mjs'
export const SOURCE_019_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-source-019-shared-comms-layer-closeout.md'
export const SOURCE_019_NEXT_CARD_ID = 'SOURCE-020'

export const SOURCE_019_REQUIRED_SOURCE_IDS = [
  'SRC-GMAIL-001',
  'SRC-MISSIVE-001',
  'SRC-SLACK-001',
  'SRC-MEETINGS-001',
]

export const SOURCE_019_REQUIRED_CANDIDATE_TYPES = [
  'task_candidate',
  'decision_candidate',
  'blocker',
]

export const SOURCE_019_CHANGED_FILES = [
  'lib/source-019-shared-comms-layer.js',
  SOURCE_019_SCRIPT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  SOURCE_019_PLAN_PATH,
  SOURCE_019_APPROVAL_PATH,
  SOURCE_019_CLOSEOUT_PATH,
  'package.json',
]

export const SOURCE_019_PROOF_COMMANDS = [
  'node --check lib/source-019-shared-comms-layer.js scripts/process-source-019-check.mjs',
  'npm run process:source-019-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=SOURCE-019 --planApprovalRef=docs/process/approvals/SOURCE-019.json --closeoutKey=source-019-shared-comms-layer-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=SOURCE-019 --closeoutKey=source-019-shared-comms-layer-v1',
  'npm run process:foundation-ship -- --card=SOURCE-019 --planApprovalRef=docs/process/approvals/SOURCE-019.json --closeoutKey=source-019-shared-comms-layer-v1 --commitRef=HEAD',
]

export const SOURCE_019_NOT_NEXT = [
  'No live Gmail, Missive, Slack, meeting, Drive, Loom, Skool, or paid-training reruns from this card.',
  'No MEETING-VAULT-ACL-001 Phase B, broad meeting-vault cleanup, or Drive permissions mutation from this card.',
  'No external sends, CRM/ClickUp writes, Drive permission mutation, credential mutation, provider/model calls, or public exposure.',
  'No raw email body, Slack body, transcript text, Missive comment body, or private participant detail in proof output.',
  'No automatic apply of synthesized routes; action routes remain proposal/approval-gated.',
]

const FORBIDDEN_OUTPUT_KEYS = [
  'body',
  'content',
  'contentText',
  'content_text',
  'raw',
  'rawText',
  'raw_text',
  'rawTranscript',
  'raw_transcript',
  'transcript',
  'message',
  'messages',
  'email',
  'html',
  'quote',
  'evidenceExcerpt',
  'evidence_excerpt',
]

const ALLOWED_ROUTE_DESTINATIONS = [
  'backlog_items',
  'decisions',
  'open_questions',
  'intelligence_synthesized_items',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function number(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function unique(values = []) {
  return [...new Set(values.map(value => text(value)).filter(Boolean))]
}

function hash(value = '') {
  return crypto.createHash('sha256').update(text(value)).digest('hex').slice(0, 16)
}

function normalizeTopic(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

function toIso(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function ageHours(value, now = new Date()) {
  const iso = toIso(value)
  if (!iso) return null
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 36_000) / 100)
}

function stalenessStatus(value, now = new Date()) {
  const hours = ageHours(value, now)
  if (hours === null) return 'missing_timestamp'
  if (hours <= 48) return 'fresh'
  if (hours <= 168) return 'watch'
  return 'stale_watch'
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(number(value))))
}

function itemActionabilityScore(item = {}) {
  const typeWeights = {
    blocker: 40,
    action_item: 38,
    decision: 36,
    strategic_issue: 30,
    source_trust_issue: 30,
    pattern: 22,
    content_atom: 14,
  }
  const statusWeights = {
    needs_decision: 26,
    needs_owner: 24,
    active: 20,
    new: 16,
    stale_watch: -8,
    likely_resolved: -20,
    historical_context: -28,
  }
  const sourceBonus = Math.min(12, number(item.sourceCount) * 3)
  const candidateBonus = Math.min(12, list(item.candidateKeys).length * 2)
  const confidenceBonus = Math.round(number(item.confidence) * 10)
  const sensitivityBonus = ['performance_concern', 'comp_discussion', 'undisclosed_feedback'].includes(text(item.sensitivity)) ? 4 : 0
  return clampScore(10 + (typeWeights[item.itemType] || 18) + (statusWeights[item.status] || 0) + sourceBonus + candidateBonus + confidenceBonus + sensitivityBonus)
}

function candidateActionabilityScore(row = {}, now = new Date()) {
  const typeWeights = {
    blocker: 32,
    task_candidate: 28,
    decision_candidate: 26,
    feedback_signal: 18,
    atom_candidate: 12,
  }
  const recency = stalenessStatus(row.latestUpdatedAt || row.updated_at || row.updatedAt || row.created_at || row.createdAt, now)
  const recencyWeights = {
    fresh: 20,
    watch: 10,
    stale_watch: 0,
    missing_timestamp: -5,
  }
  const confidenceBonus = Math.round(number(row.confidence) * 10)
  return clampScore((typeWeights[row.candidateType || row.candidate_type] || 10) + (recencyWeights[recency] || 0) + confidenceBonus)
}

function scanForbiddenKeys(value, path = '$', findings = []) {
  if (!value || typeof value !== 'object') return findings
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (FORBIDDEN_OUTPUT_KEYS.includes(key)) findings.push(childPath)
    if (child && typeof child === 'object') scanForbiddenKeys(child, childPath, findings)
  }
  return findings
}

function buildSourceCoverage(artifactRows = []) {
  const perSource = new Map()
  for (const row of artifactRows) {
    const sourceId = text(row.sourceId || row.source_id)
    const artifactType = text(row.artifactType || row.artifact_type)
    const total = number(row.total)
    if (!sourceId) continue
    const current = perSource.get(sourceId) || {
      sourceId,
      artifactTotal: 0,
      artifactTypes: [],
      latestArtifactAt: '',
      latestIngestedAt: '',
    }
    current.artifactTotal += total
    current.artifactTypes = unique([...current.artifactTypes, artifactType])
    current.latestArtifactAt = [current.latestArtifactAt, toIso(row.latestArtifactAt || row.latest_artifact_at)]
      .filter(Boolean)
      .sort()
      .pop() || ''
    current.latestIngestedAt = [current.latestIngestedAt, toIso(row.latestIngestedAt || row.latest_ingested_at)]
      .filter(Boolean)
      .sort()
      .pop() || ''
    perSource.set(sourceId, current)
  }

  const sources = [...perSource.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId))
  const coveredSources = sources.filter(source => SOURCE_019_REQUIRED_SOURCE_IDS.includes(source.sourceId) && source.artifactTotal > 0).map(source => source.sourceId)
  return {
    requiredSources: SOURCE_019_REQUIRED_SOURCE_IDS,
    coveredSources,
    missingSources: SOURCE_019_REQUIRED_SOURCE_IDS.filter(sourceId => !coveredSources.includes(sourceId)),
    artifactTotal: sources.reduce((sum, source) => sum + source.artifactTotal, 0),
    sourceCount: coveredSources.length,
    sources,
  }
}

function buildCandidateCoverage(candidateRows = [], candidateSamples = [], now = new Date()) {
  const typeTotals = new Map()
  const sourceTotals = new Map()
  let total = 0
  let pendingTotal = 0
  for (const row of candidateRows) {
    const count = number(row.total)
    const sourceId = text(row.sourceId || row.source_id)
    const candidateType = text(row.candidateType || row.candidate_type)
    const status = text(row.status)
    total += count
    if (status === 'pending') pendingTotal += count
    if (candidateType) typeTotals.set(candidateType, number(typeTotals.get(candidateType)) + count)
    if (sourceId) sourceTotals.set(sourceId, number(sourceTotals.get(sourceId)) + count)
  }

  const clusters = new Map()
  for (const row of candidateSamples) {
    const sourceId = text(row.sourceId || row.source_id)
    const candidateType = text(row.candidateType || row.candidate_type)
    const status = text(row.status)
    const topic = normalizeTopic(row.title || row.summary || row.candidateKey || row.candidate_key)
    const topicHash = hash(`${candidateType}:${topic || row.candidateKey || row.candidate_key}`)
    const current = clusters.get(topicHash) || {
      topicHash,
      sourceIds: [],
      candidateTypes: [],
      count: 0,
      latestUpdatedAt: '',
      actionabilityScore: 0,
    }
    current.sourceIds = unique([...current.sourceIds, sourceId])
    current.candidateTypes = unique([...current.candidateTypes, candidateType])
    current.count += 1
    current.latestUpdatedAt = [current.latestUpdatedAt, toIso(row.latestUpdatedAt || row.updated_at || row.updatedAt || row.created_at || row.createdAt)]
      .filter(Boolean)
      .sort()
      .pop() || ''
    current.actionabilityScore = Math.max(current.actionabilityScore, candidateActionabilityScore({
      ...row,
      sourceId,
      candidateType,
      status,
      latestUpdatedAt: current.latestUpdatedAt,
    }, now))
    clusters.set(topicHash, current)
  }

  const rankedControlItems = [...clusters.values()]
    .map(item => ({
      ...item,
      crossSource: item.sourceIds.length > 1,
      crossArtifactLinking: item.count > 1 || item.sourceIds.length > 1,
      stalenessStatus: stalenessStatus(item.latestUpdatedAt, now),
    }))
    .sort((a, b) => b.actionabilityScore - a.actionabilityScore || b.count - a.count)
    .slice(0, 20)

  return {
    total,
    pendingTotal,
    candidateTypes: [...typeTotals.keys()].sort(),
    missingRequiredTypes: SOURCE_019_REQUIRED_CANDIDATE_TYPES.filter(type => !typeTotals.has(type)),
    perType: [...typeTotals.entries()].map(([candidateType, count]) => ({ candidateType, count })).sort((a, b) => a.candidateType.localeCompare(b.candidateType)),
    perSource: [...sourceTotals.entries()].map(([sourceId, count]) => ({ sourceId, count })).sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    rankedControlItems,
  }
}

function buildSynthesisControls(synthesisSnapshot = {}, now = new Date()) {
  const latestRun = synthesisSnapshot.latestRun || null
  const latestItems = list(synthesisSnapshot.latestItems)
  const latestRunGeneratedAt = toIso(latestRun?.generatedAt || latestRun?.generated_at || latestRun?.createdAt || latestRun?.created_at)
  const controlItems = latestItems.map(item => {
    const sourceIds = unique(item.sourceIds || item.source_ids)
    const candidateKeys = unique(item.candidateKeys || item.candidate_keys)
    const status = text(item.status)
    return {
      itemHash: hash(item.synthesisItemId || item.synthesis_item_id || item.title),
      itemType: text(item.itemType || item.item_type),
      status,
      sensitivity: text(item.sensitivity || 'neutral'),
      sourceCount: number(item.sourceCount || item.source_count || sourceIds.length),
      candidateCount: candidateKeys.length,
      crossArtifactLinking: sourceIds.length > 1 || candidateKeys.length > 1,
      dedupeKey: hash(`${item.itemType || item.item_type}:${normalizeTopic(item.title)}`),
      resolutionStatus: ['likely_resolved', 'historical_context'].includes(status) ? status : 'open_or_needs_review',
      stalenessStatus: ['likely_resolved', 'historical_context', 'stale_watch'].includes(status) ? status : stalenessStatus(item.createdAt || item.created_at || latestRunGeneratedAt, now),
      actionabilityScore: itemActionabilityScore({
        ...item,
        itemType: item.itemType || item.item_type,
        sourceCount: item.sourceCount || item.source_count || sourceIds.length,
        candidateKeys,
      }),
    }
  }).sort((a, b) => b.actionabilityScore - a.actionabilityScore)

  return {
    latestRunExists: Boolean(latestRun),
    latestRunHash: latestRun ? hash(latestRun.runId || latestRun.run_id) : '',
    latestRunStatus: text(latestRun?.status),
    latestRunGeneratedAt,
    latestRunAgeHours: ageHours(latestRunGeneratedAt, now),
    latestRunFreshness: stalenessStatus(latestRunGeneratedAt, now),
    latestItemsCount: latestItems.length,
    verifiedItems: number(synthesisSnapshot.verificationSummary?.verifiedItems),
    advisoryOrBlockedItems: number(synthesisSnapshot.verificationSummary?.advisoryOrBlockedItems),
    controlItems,
  }
}

function buildRouteCoverage(routeRows = []) {
  const routes = routeRows.map(row => ({
    routeType: text(row.routeType || row.route_type),
    destinationTable: text(row.destinationTable || row.destination_table),
    approvalStatus: text(row.approvalStatus || row.approval_status),
    total: number(row.total),
    approvalRequiredAll: row.approvalRequiredAll ?? row.approval_required_all ?? false,
    latestUpdatedAt: toIso(row.latestUpdatedAt || row.latest_updated_at),
  }))
  const routeTotal = routes.reduce((sum, row) => sum + row.total, 0)
  const unsafeRoutes = routes.filter(row => !row.approvalRequiredAll || !ALLOWED_ROUTE_DESTINATIONS.includes(row.destinationTable))
  return {
    routeTotal,
    routeTypes: unique(routes.map(row => row.routeType)).sort(),
    destinations: unique(routes.map(row => row.destinationTable)).sort(),
    pendingRoutes: routes.filter(row => row.approvalStatus === 'pending').reduce((sum, row) => sum + row.total, 0),
    appliedRoutes: routes.filter(row => row.approvalStatus === 'applied').reduce((sum, row) => sum + row.total, 0),
    approvalGated: unsafeRoutes.length === 0 && routeTotal > 0,
    unsafeRoutes,
    routes,
  }
}

export function buildSource019SharedCommsLayerSnapshot({
  artifactRows = [],
  candidateRows = [],
  candidateSamples = [],
  synthesisSnapshot = {},
  routeRows = [],
  now = new Date(),
} = {}) {
  const normalizedNow = now instanceof Date ? now : new Date(now)
  const sourceCoverage = buildSourceCoverage(artifactRows)
  const candidateCoverage = buildCandidateCoverage(candidateRows, candidateSamples, normalizedNow)
  const synthesisControls = buildSynthesisControls(synthesisSnapshot, normalizedNow)
  const routeCoverage = buildRouteCoverage(routeRows)
  const failures = []
  const warnings = []

  if (sourceCoverage.missingSources.length) failures.push(`missing shared communications source artifacts: ${sourceCoverage.missingSources.join(', ')}`)
  if (candidateCoverage.pendingTotal < 100) failures.push(`too few pending shared communications candidates: ${candidateCoverage.pendingTotal}`)
  if (candidateCoverage.missingRequiredTypes.length) failures.push(`missing candidate types: ${candidateCoverage.missingRequiredTypes.join(', ')}`)
  if (!synthesisControls.latestRunExists) failures.push('missing shared communications synthesis run')
  if (synthesisControls.latestItemsCount < 5) failures.push(`too few synthesized items: ${synthesisControls.latestItemsCount}`)
  if (routeCoverage.routeTotal < 5) failures.push(`too few action routes: ${routeCoverage.routeTotal}`)
  if (!routeCoverage.approvalGated) failures.push('action routes are not fully approval-gated or contain disallowed destinations')
  if (!candidateCoverage.rankedControlItems.length) failures.push('missing deterministic current candidate control items')

  if (synthesisControls.latestRunFreshness === 'stale_watch') {
    warnings.push('latest LLM synthesis packet is stale; SOURCE-019 exposes freshness instead of rerunning private/provider synthesis')
  }

  const publicSnapshot = {
    generatedAt: normalizedNow.toISOString(),
    cardId: SOURCE_019_CARD_ID,
    closeoutKey: SOURCE_019_CLOSEOUT_KEY,
    status: failures.length ? 'risk' : 'ready',
    sourceCoverage,
    candidateCoverage,
    synthesisControls,
    routeCoverage,
    privacyBoundary: {
      proposalOnly: true,
      downstreamApplyRequiresApproval: true,
      rawContentInOutput: false,
      privateProviderRerun: false,
      externalWrites: false,
    },
    warnings,
    failures,
  }

  const forbiddenOutputPaths = scanForbiddenKeys(publicSnapshot)
  if (forbiddenOutputPaths.length) {
    publicSnapshot.status = 'risk'
    publicSnapshot.failures = [...publicSnapshot.failures, `proof output contains forbidden raw-content keys: ${forbiddenOutputPaths.join(', ')}`]
  }

  return publicSnapshot
}

function validateControlItem(item = {}) {
  const findings = []
  if (!list(item.sourceIds).length && number(item.sourceCount) < 1) findings.push('missing source coverage')
  if (!list(item.candidateTypes).length && number(item.candidateCount) < 1) findings.push('missing candidate coverage')
  if (!text(item.stalenessStatus)) findings.push('missing staleness status')
  if (!text(item.dedupeKey) && !text(item.topicHash)) findings.push('missing dedupe key')
  if (number(item.actionabilityScore) <= 0) findings.push('missing actionability score')
  if (scanForbiddenKeys(item).length) findings.push('raw content leaked into control item')
  return { ok: findings.length === 0, findings }
}

export function buildSource019DogfoodProof() {
  const goodItem = {
    topicHash: hash('source-019-good'),
    sourceIds: ['SRC-MEETINGS-001', 'SRC-SLACK-001'],
    candidateTypes: ['task_candidate', 'blocker'],
    stalenessStatus: 'fresh',
    dedupeKey: hash('followup'),
    actionabilityScore: 74,
  }
  const cases = [
    {
      name: 'valid-control-item',
      shouldPass: true,
      result: validateControlItem(goodItem),
    },
    {
      name: 'missing-source',
      shouldPass: false,
      result: validateControlItem({ ...goodItem, sourceIds: [], sourceCount: 0 }),
    },
    {
      name: 'missing-dedupe',
      shouldPass: false,
      result: validateControlItem({ ...goodItem, dedupeKey: '', topicHash: '' }),
    },
    {
      name: 'raw-content-leak',
      shouldPass: false,
      result: validateControlItem({ ...goodItem, body: 'private content should never appear in proof output' }),
    },
    {
      name: 'auto-write-route',
      shouldPass: false,
      result: {
        ok: buildRouteCoverage([
          {
            routeType: 'owner_action',
            destinationTable: 'external_system',
            approvalStatus: 'applied',
            total: 1,
            approvalRequiredAll: false,
          },
        ]).approvalGated,
        findings: ['route should be rejected because it is not approval-gated and writes to a disallowed destination'],
      },
    },
  ]
  const passed = cases.filter(testCase => testCase.result.ok === testCase.shouldPass).map(testCase => testCase.name)
  const failed = cases.filter(testCase => testCase.result.ok !== testCase.shouldPass).map(testCase => ({
    name: testCase.name,
    expectedPass: testCase.shouldPass,
    actualPass: testCase.result.ok,
    findings: testCase.result.findings,
  }))
  return {
    ok: failed.length === 0,
    passed,
    failed,
    rejectedCases: cases.filter(testCase => !testCase.shouldPass).map(testCase => testCase.name),
  }
}
