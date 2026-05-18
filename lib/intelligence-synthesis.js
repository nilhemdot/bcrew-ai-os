import { createHash } from 'node:crypto'
import {
  SYNTHESIS_VERIFICATION_METADATA_KEY,
  buildSynthesisEvidenceIndex,
  verifySynthesizedRecord,
} from './synthesis-claim-verification.js'

export const intelligenceSynthesisSchemaSql = `
  CREATE TABLE IF NOT EXISTS intelligence_synthesis_runs (
    run_id TEXT PRIMARY KEY,
    run_type TEXT NOT NULL
      CHECK (run_type IN ('governed_synthesis', 'governed_synthesis_proof')),
    status TEXT NOT NULL
      CHECK (status IN ('succeeded', 'failed')),
    requested_by TEXT NOT NULL DEFAULT 'system',
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    fact_count INTEGER NOT NULL DEFAULT 0,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    item_count INTEGER NOT NULL DEFAULT 0,
    max_tier INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesis_runs_lookup
  ON intelligence_synthesis_runs(run_type, status, created_at DESC);

  CREATE TABLE IF NOT EXISTS intelligence_synthesized_items (
    synthesized_item_id TEXT PRIMARY KEY,
    natural_key TEXT,
    synthesis_scope_key TEXT NOT NULL DEFAULT 'foundation-spine-proof',
    run_id TEXT NOT NULL REFERENCES intelligence_synthesis_runs(run_id) ON DELETE CASCADE,
    item_type TEXT NOT NULL
      CHECK (item_type IN (
        'evidence_pattern',
        'operating_gap',
        'source_health_issue',
        'decision_candidate',
        'action_candidate'
      )),
    status TEXT NOT NULL
      CHECK (status IN ('new', 'ready_for_action_router', 'needs_owner', 'archived')),
    review_order INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    suggested_owner TEXT,
    owner_confidence TEXT NOT NULL DEFAULT 'needs_owner'
      CHECK (owner_confidence IN ('high', 'medium', 'low', 'needs_owner')),
    owner_resolution_reason TEXT,
    owner_action TEXT NOT NULL DEFAULT '',
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    fact_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    evidence_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    evidence_chunk_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    atom_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    candidate_keys TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    artifact_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    sensitivity TEXT NOT NULL DEFAULT 'neutral'
      CHECK (sensitivity IN (
        'neutral',
        'positive',
        'performance_concern',
        'termination_risk',
        'comp_discussion',
        'undisclosed_feedback'
      )),
    min_tier INTEGER NOT NULL DEFAULT 1,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    routing_status TEXT NOT NULL DEFAULT 'unrouted'
      CHECK (routing_status IN ('unrouted', 'routed', 'ignored', 'snoozed')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesized_items_run
  ON intelligence_synthesized_items(run_id, review_order ASC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesized_items_status
  ON intelligence_synthesized_items(status, routing_status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesized_items_tier
  ON intelligence_synthesized_items(min_tier, status, updated_at DESC);

  ALTER TABLE intelligence_synthesized_items
  ADD COLUMN IF NOT EXISTS natural_key TEXT;

  ALTER TABLE intelligence_synthesized_items
  ADD COLUMN IF NOT EXISTS synthesis_scope_key TEXT NOT NULL DEFAULT 'foundation-spine-proof';

  ALTER TABLE intelligence_synthesized_items
  ADD COLUMN IF NOT EXISTS owner_confidence TEXT NOT NULL DEFAULT 'needs_owner';

  ALTER TABLE intelligence_synthesized_items
  ADD COLUMN IF NOT EXISTS owner_resolution_reason TEXT;

  ALTER TABLE intelligence_synthesized_items
  DROP CONSTRAINT IF EXISTS intelligence_synthesized_items_owner_confidence_check;

  ALTER TABLE intelligence_synthesized_items
  ADD CONSTRAINT intelligence_synthesized_items_owner_confidence_check
  CHECK (owner_confidence IN ('high', 'medium', 'low', 'needs_owner'));

  UPDATE intelligence_synthesized_items
  SET natural_key = synthesized_item_id
  WHERE natural_key IS NULL OR natural_key = '';

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesized_items_scope
  ON intelligence_synthesized_items(synthesis_scope_key, status, updated_at DESC);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_intelligence_synthesized_items_active_natural_key
  ON intelligence_synthesized_items(synthesis_scope_key, natural_key)
  WHERE status != 'archived' AND natural_key IS NOT NULL;
`

const ITEM_TYPES = new Set([
  'evidence_pattern',
  'operating_gap',
  'source_health_issue',
  'decision_candidate',
  'action_candidate',
])

const ITEM_STATUSES = new Set(['new', 'ready_for_action_router', 'needs_owner', 'archived'])
const SENSITIVITIES = new Set(['neutral', 'positive', 'performance_concern', 'termination_risk', 'comp_discussion', 'undisclosed_feedback'])
const OWNER_CONFIDENCES = new Set(['high', 'medium', 'low', 'needs_owner'])
const STRATEGIC_FACT_TYPES = new Set(['goal_truth', 'operating_truth', 'kpi_truth', 'source_health'])
const GOAL_GAP_FACT_TYPES = new Set(['goal_truth', 'operating_truth', 'kpi_truth'])
const STRATEGIC_TOPIC_REFS = new Set([
  'strategy',
  'source',
  'map',
  'goal',
  'gap',
  'capacity',
  'agent',
  'recruiting',
  'production',
  'cash',
  'finance',
  'kpi',
  'scoreboard',
  'marketing',
  'quarter',
  'q2',
])
const OPERATIONAL_TOPIC_REFS = new Set([
  'invoice',
  'payment',
  'pay',
  'visa',
  'github',
  'repository',
  'database',
  'sql',
  'lead',
  'sign',
  'creative',
  'pattison',
  'access',
])
const TOPIC_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'be',
  'by',
  'for',
  'from',
  'has',
  'have',
  'if',
  'in',
  'is',
  'it',
  'its',
  'needed',
  'needs',
  'new',
  'of',
  'on',
  'or',
  'required',
  'should',
  'that',
  'the',
  'this',
  'three',
  'to',
  'with',
])

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean)
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function uniqueText(values) {
  return Array.from(new Set(normalizeTextArray(values)))
}

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function stableId(prefix, value) {
  return `${prefix}:${stableHash(value).slice(0, 24)}`
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function normalizeMaxTier(value) {
  const maxTier = Number(value)
  if (!Number.isFinite(maxTier) || maxTier < 1) {
    throw new Error('intelligence synthesis queries require maxTier >= 1.')
  }
  return Math.floor(maxTier)
}

function coerceMinTier(value, fallback = 1) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

function normalizeRunType(value) {
  const normalized = String(value || 'governed_synthesis').trim()
  if (!['governed_synthesis', 'governed_synthesis_proof'].includes(normalized)) {
    throw new Error(`Invalid intelligence synthesis run type: ${normalized || '<blank>'}`)
  }
  return normalized
}

function normalizeRunStatus(value) {
  const normalized = String(value || 'succeeded').trim()
  if (!['succeeded', 'failed'].includes(normalized)) {
    throw new Error(`Invalid intelligence synthesis run status: ${normalized || '<blank>'}`)
  }
  return normalized
}

function normalizeItemType(value) {
  const normalized = String(value || 'evidence_pattern').trim()
  if (!ITEM_TYPES.has(normalized)) throw new Error(`Invalid synthesized item type: ${normalized || '<blank>'}`)
  return normalized
}

function normalizeItemStatus(value) {
  const normalized = String(value || 'ready_for_action_router').trim()
  if (!ITEM_STATUSES.has(normalized)) throw new Error(`Invalid synthesized item status: ${normalized || '<blank>'}`)
  return normalized
}

function normalizeSensitivity(value) {
  const normalized = String(value || 'neutral').trim()
  return SENSITIVITIES.has(normalized) ? normalized : 'neutral'
}

function normalizeOwnerConfidence(value) {
  const normalized = String(value || 'needs_owner').trim()
  return OWNER_CONFIDENCES.has(normalized) ? normalized : 'needs_owner'
}

function shorten(value, limit = 700) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit)}...`
}

function normalizeTopicToken(value) {
  const token = String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '').trim()
  if (!token || token.length < 3 || TOPIC_STOP_WORDS.has(token)) return ''
  if (token.endsWith('ies') && token.length > 5) return `${token.slice(0, -3)}y`
  if (token.endsWith('ing') && token.length > 6) return token.slice(0, -3)
  if (token.endsWith('ed') && token.length > 5) return token.slice(0, -2)
  if (token.endsWith('s') && token.length > 4 && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}

function topicRefsForText(value) {
  const counts = new Map()
  for (const rawToken of String(value || '').split(/[\s/|:,.;()[\]{}"'!?]+/)) {
    const token = normalizeTopicToken(rawToken)
    if (!token) continue
    counts.set(token, (counts.get(token) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token)
}

function topicRefsForFact(fact = {}) {
  const metadata = parseJsonObject(fact.metadata)
  return uniqueText([
    ...topicRefsForText(`${fact.title || ''} ${fact.claim || ''} ${fact.detail || ''} ${fact.value || ''}`),
    metadata.group,
    metadata.key,
  ])
}

function themeKeyForFact(fact = {}) {
  const metadata = parseJsonObject(fact.metadata)
  if (fact.factType && fact.factType !== 'retrieved_evidence') {
    const group = String(metadata.group || metadata.key || '').trim()
    if (group) return `${fact.factType}:${group}`
  }
  const topicRefs = topicRefsForFact(fact).slice(0, 6)
  const strategicRefs = topicRefsForFact(fact)
    .filter(ref => STRATEGIC_TOPIC_REFS.has(ref))
    .sort()
  if (strategicRefs.length >= 2) {
    return `${fact.factType || 'fact'}:strategic:${strategicRefs.join('|')}`
  }
  return `${fact.factType || 'fact'}:${topicRefs.join('|') || stableHash(fact.naturalKey || fact.factId).slice(0, 12)}`
}

function humanThemeLabel(topicRefs = [], fallback = 'source-backed evidence') {
  const label = uniqueText(topicRefs)
    .filter(token => !token.includes('_'))
    .slice(0, 5)
    .join(' ')
  return label || fallback
}

function clusterText(facts = []) {
  return facts
    .map(fact => `${fact.title || ''} ${fact.claim || ''} ${fact.detail || ''} ${fact.value || ''}`)
    .join(' ')
}

function sourceMapBrandLabel(text) {
  const brands = []
  if (/benson\s+crew|bcrew/i.test(text)) brands.push('Benson Crew')
  if (/steve\s+zahnd/i.test(text)) brands.push('Steve Zahnd')
  if (/market\s*masters|marketmasters/i.test(text)) brands.push('MarketMasters')
  return brands.length ? ` across ${brands.join(' / ')}` : ''
}

function mapRunRow(row = {}) {
  return {
    runId: row.run_id ?? row.runId,
    runType: row.run_type ?? row.runType,
    status: row.status,
    requestedBy: row.requested_by ?? row.requestedBy,
    sourceIds: row.source_ids ?? row.sourceIds ?? [],
    factCount: Number(row.fact_count ?? row.factCount ?? 0),
    evidenceCount: Number(row.evidence_count ?? row.evidenceCount ?? 0),
    itemCount: Number(row.item_count ?? row.itemCount ?? 0),
    maxTier: Number(row.max_tier ?? row.maxTier ?? 1),
    metadata: parseJsonObject(row.metadata),
    startedAt: row.started_at ?? row.startedAt,
    finishedAt: row.finished_at ?? row.finishedAt,
    createdAt: row.created_at ?? row.createdAt,
  }
}

function mapItemRow(row = {}) {
  const metadata = parseJsonObject(row.metadata)
  return {
    synthesizedItemId: row.synthesized_item_id ?? row.synthesizedItemId,
    naturalKey: row.natural_key ?? row.naturalKey,
    synthesisScopeKey: row.synthesis_scope_key ?? row.synthesisScopeKey,
    runId: row.run_id ?? row.runId,
    itemType: row.item_type ?? row.itemType,
    status: row.status,
    reviewOrder: Number(row.review_order ?? row.reviewOrder ?? 0),
    title: row.title,
    summary: row.summary,
    suggestedOwner: row.suggested_owner ?? row.suggestedOwner,
    ownerConfidence: row.owner_confidence ?? row.ownerConfidence,
    ownerResolutionReason: row.owner_resolution_reason ?? row.ownerResolutionReason,
    ownerAction: row.owner_action ?? row.ownerAction,
    sourceIds: row.source_ids ?? row.sourceIds ?? [],
    factRefs: row.fact_refs ?? row.factRefs ?? [],
    evidenceRefs: row.evidence_refs ?? row.evidenceRefs ?? [],
    evidenceChunkRefs: row.evidence_chunk_refs ?? row.evidenceChunkRefs ?? [],
    atomRefs: row.atom_refs ?? row.atomRefs ?? [],
    candidateKeys: row.candidate_keys ?? row.candidateKeys ?? [],
    artifactIds: row.artifact_ids ?? row.artifactIds ?? [],
    sensitivity: row.sensitivity,
    minTier: Number(row.min_tier ?? row.minTier ?? 1),
    attributes: parseJsonObject(row.attributes),
    routingStatus: row.routing_status ?? row.routingStatus,
    metadata,
    synthesisVerification: metadata[SYNTHESIS_VERIFICATION_METADATA_KEY] || null,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function evidenceIdForFact(fact = {}) {
  return fact.evidenceId || fact.atomId || fact.candidateKey || fact.artifactId || null
}

function evidenceChunkRefForResult(result = {}) {
  return result.chunk?.chunkId || result.chunkId || null
}

function ownerDecisionForFact(fact = {}) {
  const text = `${fact.title || ''} ${fact.claim || ''} ${fact.detail || ''}`.toLowerCase()
  if (text.includes('strategy') || text.includes('foundation') || text.includes('rebuild')) {
    return { owner: 'Foundation', confidence: 'high', reason: 'foundation_or_strategy_signal' }
  }
  if (text.includes('lead') || text.includes('appointment') || text.includes('agent')) {
    return { owner: 'Sales Leadership', confidence: 'high', reason: 'sales_or_agent_signal' }
  }
  if (text.includes('cash') || text.includes('finance') || text.includes('budget') || text.includes('invoice') || text.includes('pay ')) {
    return { owner: 'Finance', confidence: 'high', reason: 'finance_or_payment_signal' }
  }
  if (text.includes('content') || text.includes('marketing') || text.includes('creative') || text.includes('source map')) {
    return { owner: 'Marketing', confidence: 'high', reason: 'marketing_or_content_signal' }
  }
  return { owner: null, confidence: 'needs_owner', reason: 'no_clear_owner_signal' }
}

function itemTypeForFact(fact = {}) {
  if (fact.factType === 'source_health') return 'source_health_issue'
  if (fact.factType === 'goal_truth' || fact.factType === 'operating_truth' || fact.factType === 'kpi_truth') return 'operating_gap'
  if (fact.factType === 'retrieved_evidence') {
    const metadata = parseJsonObject(fact.metadata)
    const matchedBy = Array.isArray(metadata.matchedBy) ? metadata.matchedBy : []
    if (matchedBy.includes('atom') && matchedBy.includes('lexical')) return 'evidence_pattern'
  }
  return 'evidence_pattern'
}

function severityForFact(fact = {}) {
  const text = `${fact.title || ''} ${fact.claim || ''} ${fact.value || ''} ${fact.detail || ''}`.toLowerCase()
  if (['termination_risk', 'comp_discussion'].includes(fact.sensitivity)) return 'high'
  if (text.includes('behind') || text.includes('blocked') || text.includes('risk') || text.includes('failed')) return 'watch'
  if (text.includes('ahead') || text.includes('positive')) return 'positive'
  return 'normal'
}

function severityForCluster({ facts = [], sourceSupportFacts = [] } = {}) {
  const severities = [...facts, ...sourceSupportFacts].map(fact => severityForFact(fact))
  if (severities.includes('high')) return 'high'
  if (severities.includes('watch')) return 'watch'
  if (severities.includes('positive')) return 'positive'
  return 'normal'
}

function isBlockedOperationalNoise(fact = {}) {
  const text = `${fact.title || ''} ${fact.claim || ''} ${fact.detail || ''}`.toLowerCase()
  return [
    'password',
    'verification code',
    'one-time',
    'otp',
    'api key',
    'stubhub',
    'ticket',
    'unsubscribe',
    'receipt',
    'statement available',
  ].some(pattern => text.includes(pattern))
}

function isOperationalClusterNoise({ facts = [], topicRefs = [] } = {}) {
  if (!facts.length) return true
  const hasStrategicFact = facts.some(fact => STRATEGIC_FACT_TYPES.has(fact.factType))
  if (hasStrategicFact) return false
  const topicSet = new Set(topicRefs)
  const operationalHits = Array.from(OPERATIONAL_TOPIC_REFS).filter(ref => topicSet.has(ref)).length
  const strategicHits = Array.from(STRATEGIC_TOPIC_REFS).filter(ref => topicSet.has(ref)).length
  return operationalHits > 0 && strategicHits === 0
}

function freshnessForFact(fact = {}) {
  if (!fact.asOf) return 'current-proof'
  const date = new Date(fact.asOf)
  if (!Number.isFinite(date.getTime())) return 'unknown'
  const ageDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (ageDays <= 7) return 'fresh'
  if (ageDays <= 45) return 'recent'
  return 'aged'
}

function normalizeSynthesisScopeKey(input = {}) {
  const metadata = parseJsonObject(input.metadata)
  const normalized = String(
    input.synthesisScopeKey ||
    input.synthesis_scope_key ||
    metadata.synthesisScopeKey ||
    metadata.synthesis_scope_key ||
    'foundation-spine-proof'
  ).trim()
  return normalized || 'foundation-spine-proof'
}

function buildItemNaturalKey({ synthesisScopeKey, fact, evidenceRefs, evidenceChunkRefs }) {
  return [
    synthesisScopeKey,
    fact.factType || 'fact',
    fact.naturalKey || fact.factId,
    fact.sourceId || '',
    ...evidenceRefs,
    ...evidenceChunkRefs,
  ].filter(Boolean).join('|')
}

function buildClusterNaturalKey({ synthesisScopeKey, themeKey, routeScope }) {
  return [
    synthesisScopeKey,
    'clustered-synthesis',
    routeScope,
    themeKey,
  ].filter(Boolean).join('|')
}

function classifyCluster({ facts = [], sourceSupportFacts = [], evidenceRefs = [], evidenceChunkRefs = [], sourceIds = [], topicRefs = [] } = {}) {
  const hasGoalGapFact = sourceSupportFacts.some(fact => GOAL_GAP_FACT_TYPES.has(fact.factType))
  const topicSet = new Set(topicRefs)
  const strategicTopicHits = Array.from(STRATEGIC_TOPIC_REFS).filter(ref => topicSet.has(ref)).length
  const operationalOnly = isOperationalClusterNoise({ facts, topicRefs })
  const multiSourcePattern = evidenceRefs.length >= 3 && sourceIds.length >= 2
  const repeatedStrategicTopic = evidenceRefs.length >= 2 && strategicTopicHits >= 2
  const severity = severityForCluster({ facts, sourceSupportFacts })
  const highSeverityPattern = severity === 'high' && evidenceRefs.length >= 2
  const strategyGradeSupport = evidenceRefs.length >= 2 && evidenceChunkRefs.length >= 2
  const strategyHubEligible = !operationalOnly && strategyGradeSupport && (
    hasGoalGapFact ||
    multiSourcePattern ||
    repeatedStrategicTopic ||
    highSeverityPattern
  )

  return {
    routeScope: strategyHubEligible ? 'strategy' : 'operational',
    strategyHubEligible,
    reason: strategyHubEligible
      ? [
          hasGoalGapFact ? 'ties_to_goal_gap_fact' : null,
          multiSourcePattern ? 'links_three_or_more_atoms_across_two_or_more_sources' : null,
          repeatedStrategicTopic ? 'repeated_strategic_topic_with_multiple_evidence_refs' : null,
          highSeverityPattern ? 'high_severity_multi_evidence_pattern' : null,
        ].filter(Boolean).join('+')
      : operationalOnly ? 'operational_or_single-thread_follow_up' : 'insufficient_linked_evidence_for_strategy',
    severity,
  }
}

function buildThemeTitle({ classification, topicRefs, facts }) {
  const text = clusterText(facts)
  const topicSet = new Set(topicRefs)
  if (classification.routeScope === 'strategy') {
    if (topicSet.has('source') && topicSet.has('map')) {
      return `Clarify where leads come from${sourceMapBrandLabel(text) || ' across active brands'}`
    }
    if (topicSet.has('agent') && (topicSet.has('capacity') || topicSet.has('recruiting'))) {
      return 'Agent capacity gap needs Strategy review'
    }
    if (topicSet.has('cash') || topicSet.has('finance')) {
      return 'Cash and finance gap needs Strategy review'
    }
    if (topicSet.has('q2') || topicSet.has('quarter')) {
      return 'Quarterly Strategy prep gap needs review'
    }
  }
  const themeLabel = humanThemeLabel(topicRefs, facts[0]?.title || 'source-backed evidence')
  if (classification.routeScope === 'strategy') return `Review repeated ${themeLabel} pattern`
  if (facts.length > 1) return `Collapsed operational ${themeLabel} follow-up`
  return shorten(facts[0]?.title || 'Operational follow-up', 220)
}

function buildThemeSummary({ facts, sourceSupportFacts, evidenceRefs, evidenceChunkRefs, sourceIds, classification }) {
  const claims = facts
    .map(fact => fact.claim || fact.title || fact.value)
    .filter(Boolean)
    .slice(0, 4)
  const support = sourceSupportFacts
    .map(fact => fact.claim || fact.title || fact.value)
    .filter(Boolean)
    .slice(0, 2)
  return shorten([
    `Collapsed ${facts.length} evidence fact${facts.length === 1 ? '' : 's'} into one ${classification.routeScope} item with ${evidenceRefs.length} atom/evidence ref${evidenceRefs.length === 1 ? '' : 's'}, ${evidenceChunkRefs.length} retrieval chunk${evidenceChunkRefs.length === 1 ? '' : 's'}, and ${sourceIds.length} source${sourceIds.length === 1 ? '' : 's'}.`,
    claims.length ? `Signals: ${claims.join(' | ')}` : '',
    support.length ? `Supporting source truth: ${support.join(' | ')}` : '',
  ].filter(Boolean).join(' '), 1100)
}

function humanSampleRowsForItems(items = [], limit = 5) {
  return items.slice(0, limit).map((item, index) => ({
    n: index + 1,
    title: shorten(item.title, 80),
    scope: item.metadata?.routeScope || item.attributes?.routeScope || 'unknown',
    strategyHubEligible: item.metadata?.strategyHubEligible === true || item.attributes?.strategyHubEligible === true,
    facts: item.factRefs?.length || 0,
    atoms: item.evidenceRefs?.length || 0,
    chunks: item.evidenceChunkRefs?.length || 0,
    themeKey: item.attributes?.themeKey || item.metadata?.themeKey || '',
  }))
}

function selectDiverseItems(items = [], limit = 8) {
  const selected = []
  const selectedIds = new Set()
  const coveredSources = new Set()
  for (const item of items) {
    const itemSources = uniqueText(item.sourceIds)
    if (!itemSources.some(sourceId => !coveredSources.has(sourceId))) continue
    selected.push(item)
    selectedIds.add(item.synthesizedItemId)
    for (const sourceId of itemSources) coveredSources.add(sourceId)
    if (selected.length >= limit) return selected
  }
  for (const item of items) {
    if (selectedIds.has(item.synthesizedItemId)) continue
    selected.push(item)
    if (selected.length >= limit) break
  }
  return selected
}

function buildSynthesizedItems({ runId, synthesisScopeKey, facts, evidence, maxTier, limit = 8 }) {
  const evidenceResults = Array.isArray(evidence?.results) ? evidence.results : []
  const evidenceById = new Map()
  for (const result of evidenceResults) {
    if (result.evidenceId) evidenceById.set(result.evidenceId, result)
    if (result.atomId) evidenceById.set(result.atomId, result)
    if (result.candidateKey) evidenceById.set(result.candidateKey, result)
  }

  const activeFacts = facts.filter(fact => coerceMinTier(fact.minTier, 1) <= maxTier)
  const sourceSupportFacts = activeFacts.filter(fact => fact.factType !== 'retrieved_evidence')
  const sourceSupportBySource = new Map()
  for (const fact of sourceSupportFacts) {
    for (const sourceId of uniqueText([fact.sourceId, ...(fact.sourceIds || [])])) {
      if (!sourceSupportBySource.has(sourceId)) sourceSupportBySource.set(sourceId, [])
      sourceSupportBySource.get(sourceId).push(fact)
    }
  }
  const clusters = new Map()
  for (const fact of activeFacts.filter(fact => evidenceIdForFact(fact) && !isBlockedOperationalNoise(fact))) {
    const topicRefs = topicRefsForFact(fact)
    const themeKey = themeKeyForFact(fact)
    if (!clusters.has(themeKey)) {
      clusters.set(themeKey, {
        themeKey,
        topicRefs,
        facts: [],
      })
    }
    const cluster = clusters.get(themeKey)
    cluster.facts.push(fact)
    cluster.topicRefs = uniqueText([...cluster.topicRefs, ...topicRefs])
  }

  const items = Array.from(clusters.values())
    .map(cluster => {
      const evidenceResultsForCluster = cluster.facts
        .map(fact => evidenceById.get(evidenceIdForFact(fact)) || {})
      const clusterSourceIds = uniqueText([
        ...cluster.facts.flatMap(fact => [fact.sourceId, ...(fact.sourceIds || [])]),
      ])
      const supportingFacts = uniqueText(clusterSourceIds)
        .flatMap(sourceId => sourceSupportBySource.get(sourceId) || [])
        .filter((fact, index, list) => list.findIndex(candidate => candidate.factId === fact.factId) === index)
        .slice(0, 5)
      const factRefs = uniqueText([
        ...cluster.facts.map(fact => fact.factId),
        ...supportingFacts.map(fact => fact.factId),
      ])
      const evidenceRefs = uniqueText([
        ...cluster.facts.map(evidenceIdForFact),
        ...evidenceResultsForCluster.flatMap(result => [result.evidenceId, result.atomId]),
      ])
      const evidenceChunkRefs = uniqueText(evidenceResultsForCluster.map(evidenceChunkRefForResult))
      if (!factRefs.length || !evidenceRefs.length || !evidenceChunkRefs.length) return null

      const sourceIds = uniqueText([
        ...clusterSourceIds,
        ...supportingFacts.flatMap(fact => fact.sourceIds || []),
      ])
      const atomRefs = uniqueText([
        ...cluster.facts.map(fact => fact.atomId),
        ...evidenceResultsForCluster.map(result => result.atomId),
      ])
      const candidateKeys = uniqueText([
        ...cluster.facts.map(fact => fact.candidateKey),
        ...evidenceResultsForCluster.map(result => result.candidateKey),
      ])
      const artifactIds = uniqueText([
        ...cluster.facts.map(fact => fact.artifactId),
        ...evidenceResultsForCluster.map(result => result.artifactId),
      ])
      const classification = classifyCluster({
        facts: cluster.facts,
        sourceSupportFacts: supportingFacts,
        evidenceRefs,
        evidenceChunkRefs,
        sourceIds,
        topicRefs: cluster.topicRefs,
      })
      const ownerDecision = ownerDecisionForFact({
        title: cluster.facts.map(fact => fact.title).join(' '),
        claim: cluster.facts.map(fact => fact.claim).join(' '),
        detail: cluster.facts.map(fact => fact.detail).join(' '),
      })
      const naturalKey = buildClusterNaturalKey({
        synthesisScopeKey,
        themeKey: cluster.themeKey,
        routeScope: classification.routeScope,
      })
      const firstFact = cluster.facts[0] || {}
      const firstEvidence = evidenceResultsForCluster[0] || {}

      return {
      synthesizedItemId: stableId('synthesized-item', naturalKey),
      naturalKey,
      synthesisScopeKey,
      runId,
      itemType: classification.routeScope === 'strategy'
        ? 'evidence_pattern'
        : itemTypeForFact(firstFact),
      status: ownerDecision.owner ? 'ready_for_action_router' : 'needs_owner',
      reviewOrder: 1,
      title: buildThemeTitle({ classification, topicRefs: cluster.topicRefs, facts: cluster.facts }),
      summary: buildThemeSummary({
        facts: cluster.facts,
        sourceSupportFacts: supportingFacts,
        evidenceRefs,
        evidenceChunkRefs,
        sourceIds,
        classification,
      }),
      suggestedOwner: ownerDecision.owner,
      ownerConfidence: ownerDecision.confidence,
      ownerResolutionReason: ownerDecision.reason,
      ownerAction: ownerDecision.owner
        ? `Review the collapsed ${classification.routeScope} theme and route it with source proof.`
        : `Choose an owner for this collapsed ${classification.routeScope} theme before Action Router can route it.`,
      sourceIds,
      factRefs,
      evidenceRefs,
      evidenceChunkRefs,
      atomRefs,
      candidateKeys,
      artifactIds,
      sensitivity: normalizeSensitivity(firstFact.sensitivity || firstEvidence.sensitivity),
      minTier: coerceMinTier(firstFact.minTier ?? firstEvidence.minTier, 1),
      attributes: {
        themeKey: cluster.themeKey,
        themeLabel: humanThemeLabel(cluster.topicRefs, firstFact.title),
        topicRefs: cluster.topicRefs,
        routeScope: classification.routeScope,
        strategyHubEligible: classification.strategyHubEligible,
        classificationReason: classification.reason,
        linkedFactCount: factRefs.length,
        linkedEvidenceCount: evidenceRefs.length,
        linkedChunkCount: evidenceChunkRefs.length,
        linkedAtomCount: atomRefs.length,
        duplicateCollapseCount: cluster.facts.length,
        synthesisQuality: 'clustered',
        recency: freshnessForFact(firstFact),
        sourceConfidence: sourceIds.length ? 'source-backed' : 'unknown',
        severity: classification.severity,
        freshness: freshnessForFact(firstFact),
        ownerActionability: ownerDecision.owner ? 'owner-suggested' : 'needs-owner',
        ownerConfidence: ownerDecision.confidence,
        matchedBy: uniqueText(evidenceResultsForCluster.flatMap(result => result.matchedBy || [])),
        rankingPolicy: 'ordered-for-review-without-weighted-score',
      },
      metadata: {
        sourceFactTypes: uniqueText(cluster.facts.map(fact => fact.factType)),
        sourceFactIds: cluster.facts.map(fact => fact.factId),
        evidenceTypes: uniqueText(evidenceResultsForCluster.map(result => result.evidenceType)),
        synthesisGate: 'SYNTHESIS-ENGINE-001',
        ownerResolutionReason: ownerDecision.reason,
        themeKey: cluster.themeKey,
        topicRefs: cluster.topicRefs,
        routeScope: classification.routeScope,
        strategyHubEligible: classification.strategyHubEligible,
        reviewSurface: classification.strategyHubEligible ? 'strategy' : 'operations',
        strategySurface: classification.strategyHubEligible ? 'strategy' : null,
      },
    }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aStrategy = a.metadata.strategyHubEligible ? 1 : 0
      const bStrategy = b.metadata.strategyHubEligible ? 1 : 0
      if (aStrategy !== bStrategy) return bStrategy - aStrategy
      const aEvidence = a.evidenceRefs.length
      const bEvidence = b.evidenceRefs.length
      if (aEvidence !== bEvidence) return bEvidence - aEvidence
      return a.title.localeCompare(b.title)
    })
  return selectDiverseItems(items, limit)
    .map((item, index) => ({ ...item, reviewOrder: index + 1 }))
}

export function buildIntelligenceSynthesisSingleEvidenceGateDogfood() {
  const runId = 'synthesis-single-evidence-gate-dogfood'
  const sourceId = 'SRC-GMAIL-001'
  const baseFact = {
    factId: 'dogfood-goal-single-evidence',
    factType: 'goal_truth',
    sourceId,
    sourceIds: [sourceId],
    evidenceId: 'dogfood-evidence-single',
    atomId: 'dogfood-atom-single',
    candidateKey: 'dogfood-candidate-single',
    title: 'Strategy goal gap',
    claim: 'Strategy goal gap requires review.',
    detail: 'Synthetic goal fact with only one evidence chunk.',
    status: 'active',
    minTier: 1,
    sensitivity: 'neutral',
    metadata: { group: 'strategy-goal-gap' },
  }
  const baseEvidence = {
    evidenceId: 'dogfood-evidence-single',
    atomId: 'dogfood-atom-single',
    candidateKey: 'dogfood-candidate-single',
    chunkId: 'dogfood-chunk-single',
    sourceId,
    status: 'active',
    minTier: 1,
    sensitivity: 'neutral',
  }
  const singleChunkFacts = [baseFact]
  const singleChunkEvidence = { results: [baseEvidence] }
  const singleChunkItems = buildSynthesizedItems({
    runId,
    synthesisScopeKey: 'dogfood-single-evidence',
    facts: singleChunkFacts,
    evidence: singleChunkEvidence,
    maxTier: 1,
    limit: 4,
  })
  const singleChunkIndex = buildSynthesisEvidenceIndex({
    facts: singleChunkFacts,
    evidence: singleChunkEvidence,
    sourceIds: [sourceId],
  })
  const singleChunkVerifications = singleChunkItems.map(item => verifySynthesizedRecord({
    surface: 'intelligence_synthesized_items',
    record: item,
  }, singleChunkIndex))

  const multiChunkFacts = [
    baseFact,
    { ...baseFact, factId: 'dogfood-goal-second-evidence', evidenceId: 'dogfood-evidence-second', atomId: 'dogfood-atom-second', candidateKey: 'dogfood-candidate-second', detail: 'Synthetic goal fact with a second evidence chunk.' },
  ]
  const multiChunkEvidence = {
    results: [
      baseEvidence,
      { ...baseEvidence, evidenceId: 'dogfood-evidence-second', atomId: 'dogfood-atom-second', candidateKey: 'dogfood-candidate-second', chunkId: 'dogfood-chunk-second' },
    ],
  }
  const multiChunkItems = buildSynthesizedItems({
    runId,
    synthesisScopeKey: 'dogfood-multi-evidence',
    facts: multiChunkFacts,
    evidence: multiChunkEvidence,
    maxTier: 1,
    limit: 4,
  })
  const multiChunkIndex = buildSynthesisEvidenceIndex({
    facts: multiChunkFacts,
    evidence: multiChunkEvidence,
    sourceIds: [sourceId],
  })
  const multiChunkVerifications = multiChunkItems.map(item => verifySynthesizedRecord({
    surface: 'intelligence_synthesized_items',
    record: item,
  }, multiChunkIndex))
  const singleChunkStrategyItems = singleChunkItems.filter(item =>
    item.metadata?.strategyHubEligible === true || item.attributes?.strategyHubEligible === true
  )
  const multiChunkStrategyItems = multiChunkItems.filter(item =>
    item.metadata?.strategyHubEligible === true || item.attributes?.strategyHubEligible === true
  )

  return {
    ok: singleChunkItems.length >= 1 &&
      singleChunkStrategyItems.length === 0 &&
      singleChunkVerifications.every(row => row.status === 'verified') &&
      multiChunkStrategyItems.length >= 1 &&
      multiChunkVerifications.every(row => row.status === 'verified'),
    mode: 'intelligence-synthesis-single-evidence-gate-dogfood',
    singleChunk: {
      itemCount: singleChunkItems.length,
      strategyItemCount: singleChunkStrategyItems.length,
      verificationStatuses: singleChunkVerifications.map(row => row.status),
      blockedReasons: singleChunkVerifications.flatMap(row => row.blockedReasons || []),
    },
    multiChunk: {
      itemCount: multiChunkItems.length,
      strategyItemCount: multiChunkStrategyItems.length,
      verificationStatuses: multiChunkVerifications.map(row => row.status),
      blockedReasons: multiChunkVerifications.flatMap(row => row.blockedReasons || []),
    },
  }
}

export function createIntelligenceSynthesisStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  querySynthesisFacts,
}) {
  function normalizeItemInput(input = {}, fallbackRunId, fallbackOrder = 1) {
    const runId = String(input.runId || input.run_id || fallbackRunId || '').trim()
    if (!runId) throw new Error('runId is required for synthesized items.')
    const title = String(input.title || '').trim()
    if (!title) throw new Error('title is required for synthesized items.')
    const naturalKey = String(input.naturalKey || input.natural_key || '').trim()
    if (!naturalKey) throw new Error('synthesized items require naturalKey.')
    const synthesisScopeKey = String(input.synthesisScopeKey || input.synthesis_scope_key || 'foundation-spine-proof').trim() || 'foundation-spine-proof'
    const factRefs = uniqueText(input.factRefs || input.fact_refs)
    const evidenceRefs = uniqueText(input.evidenceRefs || input.evidence_refs)
    const evidenceChunkRefs = uniqueText(input.evidenceChunkRefs || input.evidence_chunk_refs)
    if (!factRefs.length) throw new Error('synthesized items require factRefs.')
    if (!evidenceRefs.length) throw new Error('synthesized items require evidenceRefs.')
    if (!evidenceChunkRefs.length) throw new Error('synthesized items require evidenceChunkRefs.')
    const synthesizedItemId = String(
      input.synthesizedItemId ||
      input.synthesized_item_id ||
      stableId('synthesized-item', naturalKey)
    ).trim()

    return {
      synthesizedItemId,
      naturalKey,
      synthesisScopeKey,
      runId,
      itemType: normalizeItemType(input.itemType || input.item_type),
      status: normalizeItemStatus(input.status),
      reviewOrder: Math.max(1, Number(input.reviewOrder ?? input.review_order ?? fallbackOrder) || fallbackOrder),
      title,
      summary: String(input.summary || '').trim(),
      suggestedOwner: input.suggestedOwner || input.suggested_owner || null,
      ownerConfidence: normalizeOwnerConfidence(input.ownerConfidence || input.owner_confidence),
      ownerResolutionReason: input.ownerResolutionReason || input.owner_resolution_reason || null,
      ownerAction: String(input.ownerAction || input.owner_action || '').trim(),
      sourceIds: uniqueText(input.sourceIds || input.source_ids),
      factRefs,
      evidenceRefs,
      evidenceChunkRefs,
      atomRefs: uniqueText(input.atomRefs || input.atom_refs),
      candidateKeys: uniqueText(input.candidateKeys || input.candidate_keys),
      artifactIds: uniqueText(input.artifactIds || input.artifact_ids),
      sensitivity: normalizeSensitivity(input.sensitivity),
      minTier: coerceMinTier(input.minTier ?? input.min_tier, 1),
      attributes: parseJsonObject(input.attributes),
      metadata: parseJsonObject(input.metadata),
    }
  }

  async function upsertSynthesizedItemWithClient(client, input, fallbackRunId, fallbackOrder) {
    const item = normalizeItemInput(input, fallbackRunId, fallbackOrder)
    const result = await client.query(
      `
        INSERT INTO intelligence_synthesized_items (
          synthesized_item_id, natural_key, synthesis_scope_key, run_id, item_type, status,
          review_order, title, summary, suggested_owner, owner_confidence,
          owner_resolution_reason, owner_action, source_ids, fact_refs, evidence_refs,
          evidence_chunk_refs, atom_refs, candidate_keys, artifact_ids,
          sensitivity, min_tier, attributes, routing_status, metadata, updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,
          $12,$13,$14::text[],$15::text[],$16::text[],
          $17::text[],$18::text[],$19::text[],$20::text[],
          $21,$22,$23::jsonb,'unrouted',$24::jsonb,NOW()
        )
        ON CONFLICT (synthesized_item_id) DO UPDATE SET
          natural_key = EXCLUDED.natural_key,
          synthesis_scope_key = EXCLUDED.synthesis_scope_key,
          run_id = EXCLUDED.run_id,
          item_type = EXCLUDED.item_type,
          status = EXCLUDED.status,
          review_order = EXCLUDED.review_order,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          suggested_owner = EXCLUDED.suggested_owner,
          owner_confidence = EXCLUDED.owner_confidence,
          owner_resolution_reason = EXCLUDED.owner_resolution_reason,
          owner_action = EXCLUDED.owner_action,
          source_ids = EXCLUDED.source_ids,
          fact_refs = EXCLUDED.fact_refs,
          evidence_refs = EXCLUDED.evidence_refs,
          evidence_chunk_refs = EXCLUDED.evidence_chunk_refs,
          atom_refs = EXCLUDED.atom_refs,
          candidate_keys = EXCLUDED.candidate_keys,
          artifact_ids = EXCLUDED.artifact_ids,
          sensitivity = EXCLUDED.sensitivity,
          min_tier = EXCLUDED.min_tier,
          attributes = EXCLUDED.attributes,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING *
      `,
      [
        item.synthesizedItemId,
        item.naturalKey,
        item.synthesisScopeKey,
        item.runId,
        item.itemType,
        item.status,
        item.reviewOrder,
        item.title,
        item.summary,
        item.suggestedOwner,
        item.ownerConfidence,
        item.ownerResolutionReason,
        item.ownerAction,
        item.sourceIds,
        item.factRefs,
        item.evidenceRefs,
        item.evidenceChunkRefs,
        item.atomRefs,
        item.candidateKeys,
        item.artifactIds,
        item.sensitivity,
        item.minTier,
        JSON.stringify(item.attributes),
        JSON.stringify(item.metadata),
      ]
    )
    return mapItemRow(result.rows[0])
  }

  async function runGovernedSynthesis(input = {}, actor = 'system') {
    const startedAt = new Date().toISOString()
    const runId = String(input.runId || input.run_id || `synthesis-engine-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`).trim()
    const runType = normalizeRunType(input.runType || input.run_type)
    const status = normalizeRunStatus(input.status)
    const maxTier = normalizeMaxTier(input.maxTier ?? input.max_tier)
    const synthesisScopeKey = normalizeSynthesisScopeKey(input)
    const facts = Array.isArray(input.facts)
      ? input.facts
      : await querySynthesisFacts({
          maxTier,
          limit: input.factLimit || input.fact_limit || 100,
          sourceIds: input.sourceIds || input.source_ids,
          factTypes: input.factTypes || input.fact_types,
        })
    const evidence = input.evidence || {}
    const items = buildSynthesizedItems({
      runId,
      synthesisScopeKey,
      facts,
      evidence,
      maxTier,
      limit: input.itemLimit || input.item_limit || 8,
    })
    if (!items.length) throw new Error('SYNTHESIS-ENGINE-001 produced no fact/evidence-backed synthesized items.')
    const verificationIndex = buildSynthesisEvidenceIndex({
      facts,
      evidence,
      sourceIds: uniqueText(input.sourceIds || input.source_ids || [
        ...facts.flatMap(fact => fact.sourceIds || []),
        ...items.flatMap(item => item.sourceIds || []),
      ]),
    })
    const verifiedItems = items.map(item => {
      const verification = verifySynthesizedRecord({
        surface: 'intelligence_synthesized_items',
        record: item,
      }, verificationIndex)
      if (verification.status !== 'verified') {
        throw new Error(`SYNTHESIS-VERIFY-001 blocked governed synthesis item ${item.synthesizedItemId}: ${verification.blockedReasons.join(',') || verification.status}`)
      }
      return {
        ...item,
        attributes: {
          ...item.attributes,
          synthesisVerificationStatus: verification.status,
        },
        metadata: {
          ...item.metadata,
          [SYNTHESIS_VERIFICATION_METADATA_KEY]: verification,
        },
      }
    })

    const sourceIds = uniqueText(input.sourceIds || input.source_ids || [
      ...facts.flatMap(fact => fact.sourceIds || []),
      ...verifiedItems.flatMap(item => item.sourceIds || []),
    ])
    const factRefs = uniqueText(verifiedItems.flatMap(item => item.factRefs))
    const evidenceRefs = uniqueText(verifiedItems.flatMap(item => item.evidenceRefs))
    const currentNaturalKeys = uniqueText(verifiedItems.map(item => item.naturalKey))

    return withFoundationTransaction(async client => {
      const runResult = await client.query(
        `
          INSERT INTO intelligence_synthesis_runs (
            run_id, run_type, status, requested_by, source_ids,
            fact_count, evidence_count, item_count, max_tier, metadata,
            started_at, finished_at
          )
          VALUES ($1,$2,$3,$4,$5::text[],$6,$7,$8,$9,$10::jsonb,$11,$12)
          ON CONFLICT (run_id) DO UPDATE SET
            run_type = EXCLUDED.run_type,
            status = EXCLUDED.status,
            requested_by = EXCLUDED.requested_by,
            source_ids = EXCLUDED.source_ids,
            fact_count = EXCLUDED.fact_count,
            evidence_count = EXCLUDED.evidence_count,
            item_count = EXCLUDED.item_count,
            max_tier = EXCLUDED.max_tier,
            metadata = EXCLUDED.metadata,
            started_at = EXCLUDED.started_at,
            finished_at = EXCLUDED.finished_at
          RETURNING *
        `,
        [
          runId,
          runType,
          status,
          input.requestedBy || input.requested_by || actor,
          sourceIds,
          facts.length,
          evidenceRefs.length,
          verifiedItems.length,
          maxTier,
          JSON.stringify({
            ...(input.metadata || {}),
            factRefs,
            evidenceRefs,
            humanSample: {
              format: 'numbered-list-max-80-char-title',
              rows: humanSampleRowsForItems(verifiedItems, 5),
            },
            qualityThresholds: {
              strategyEligibleRequiresMultiEvidence: true,
              strategySingleEvidenceItemsMax: 0,
              duplicateActiveThemeKeysMax: 0,
              latestProofItemsRequireThemeMetadata: true,
            },
            verificationGate: 'SYNTHESIS-VERIFY-001',
            verificationVersion: 'synthesis-verify-v1',
            recordedBy: actor,
            synthesisScopeKey,
          }),
          input.startedAt || input.started_at || startedAt,
          input.finishedAt || input.finished_at || new Date().toISOString(),
        ]
      )

      const savedItems = []
      await client.query(
        `
          WITH stale_unclustered AS (
            SELECT item.synthesized_item_id,
                   EXISTS (
                     SELECT 1
                     FROM intelligence_action_routes route
                     WHERE route.synthesized_item_id = item.synthesized_item_id
                       AND route.approval_status IN ('pending', 'approved', 'applied')
                   ) AS has_guarded_route
            FROM intelligence_synthesized_items item
            WHERE item.status != 'archived'
              AND item.synthesis_scope_key = $2
              AND NOT (item.natural_key = ANY($3::text[]))
              AND COALESCE(item.attributes->>'synthesisQuality', '') != 'clustered'
          )
          UPDATE intelligence_synthesized_items item
          SET status = CASE
                WHEN stale.has_guarded_route THEN item.status
                ELSE 'archived'
              END,
              routing_status = CASE
                WHEN stale.has_guarded_route THEN 'routed'
                ELSE item.routing_status
              END,
              attributes = item.attributes || jsonb_build_object(
                'synthesisQuality', 'legacy_unclustered',
                'routeScope', 'legacy',
                'strategyHubEligible', false,
                'legacySynthesisProtected', stale.has_guarded_route
              ),
              metadata = item.metadata || jsonb_build_object(
                'legacySynthesisProtected', stale.has_guarded_route,
                'archivedByRunId', $1::text,
                'archivedReason', CASE
                  WHEN stale.has_guarded_route THEN 'legacy_unclustered_route_preserved'
                  ELSE 'legacy_unclustered_replaced_by_clustered_synthesis'
                END
              ),
              updated_at = NOW()
          FROM stale_unclustered stale
          WHERE item.synthesized_item_id = stale.synthesized_item_id
        `,
        [runId, synthesisScopeKey, currentNaturalKeys]
      )

      await client.query(
        `
          UPDATE intelligence_synthesized_items
          SET status = 'archived',
              metadata = metadata || jsonb_build_object(
                'archivedByRunId', $1::text,
                'archivedReason', 'stale_after_governed_synthesis_refresh'
              ),
              updated_at = NOW()
          WHERE status != 'archived'
            AND routing_status = 'unrouted'
            AND synthesis_scope_key = $2
            AND NOT (natural_key = ANY($3::text[]))
            AND NOT EXISTS (
              SELECT 1
              FROM intelligence_action_routes route
              WHERE route.synthesized_item_id = intelligence_synthesized_items.synthesized_item_id
                AND route.approval_status IN ('pending', 'approved', 'applied')
            )
        `,
        [runId, synthesisScopeKey, currentNaturalKeys]
      )

      for (let index = 0; index < verifiedItems.length; index += 1) {
        savedItems.push(await upsertSynthesizedItemWithClient(client, verifiedItems[index], runId, index + 1))
      }

      await insertChangeEvent(client, {
        eventType: 'intelligence_synthesis_run_recorded',
        entityTable: 'intelligence_synthesis_runs',
        entityId: runId,
        actor,
        summary: `Recorded intelligence synthesis run ${runId}`,
        metadata: {
          runType,
          status,
          sourceIds,
          itemCount: savedItems.length,
        },
      })

      return {
        run: mapRunRow(runResult.rows[0]),
        items: savedItems,
      }
    })
  }

  async function getSynthesisEngineSnapshot({ limit = 20 } = {}) {
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const [summary, latestRun, latestProofRun, latestQualityRun, recentItems, sourceSummary, referenceIntegrity, latestProofQuality] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_items,
          COUNT(*) FILTER (WHERE status != 'archived')::int AS active_items,
          COUNT(*) FILTER (WHERE status != 'archived' AND cardinality(fact_refs) > 0)::int AS items_with_fact_refs,
          COUNT(*) FILTER (WHERE status != 'archived' AND cardinality(evidence_refs) > 0)::int AS items_with_evidence_refs,
          COUNT(*) FILTER (WHERE status != 'archived' AND cardinality(evidence_chunk_refs) > 0)::int AS items_with_evidence_chunk_refs,
          COUNT(*) FILTER (WHERE status != 'archived' AND owner_confidence IN ('high', 'medium', 'low', 'needs_owner'))::int AS items_with_owner_confidence,
          COUNT(*) FILTER (WHERE status != 'archived' AND status = 'needs_owner')::int AS needs_owner_items,
          COUNT(*) FILTER (WHERE status != 'archived' AND min_tier <= 1)::int AS tier_one_items,
          COUNT(*) FILTER (
            WHERE status != 'archived'
              AND COALESCE(attributes->>'synthesisQuality', '') = 'clustered'
          )::int AS active_clustered_items,
          COUNT(*) FILTER (
            WHERE status != 'archived'
              AND COALESCE(attributes->>'legacySynthesisProtected', metadata->>'legacySynthesisProtected') = 'true'
          )::int AS active_legacy_protected_items,
          COUNT(*) FILTER (
            WHERE status != 'archived'
              AND COALESCE(attributes->>'synthesisQuality', '') != 'clustered'
              AND COALESCE(attributes->>'legacySynthesisProtected', metadata->>'legacySynthesisProtected') != 'true'
          )::int AS active_unclustered_unprotected_items,
          COUNT(*) FILTER (
            WHERE status != 'archived'
              AND routing_status = 'unrouted'
              AND min_tier <= 1
              AND status IN ('ready_for_action_router', 'needs_owner')
              AND cardinality(fact_refs) > 0
              AND cardinality(evidence_refs) > 0
              AND cardinality(evidence_chunk_refs) > 0
          )::int AS routeable_active_items,
          COUNT(*) FILTER (
            WHERE status != 'archived'
              AND routing_status = 'unrouted'
              AND min_tier <= 1
              AND status IN ('ready_for_action_router', 'needs_owner')
              AND cardinality(fact_refs) > 0
              AND cardinality(evidence_refs) > 0
              AND cardinality(evidence_chunk_refs) > 0
              AND COALESCE(attributes->>'synthesisQuality', '') != 'clustered'
              AND COALESCE(attributes->>'legacySynthesisProtected', metadata->>'legacySynthesisProtected') != 'true'
          )::int AS routeable_unclustered_items,
          COUNT(DISTINCT run_id)::int AS total_runs
        FROM intelligence_synthesized_items
      `),
      pool.query(`
        SELECT *
        FROM intelligence_synthesis_runs
        ORDER BY created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT *
        FROM intelligence_synthesis_runs
        WHERE run_type = 'governed_synthesis_proof'
        ORDER BY created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT run.*
        FROM intelligence_synthesis_runs run
        WHERE run.status = 'succeeded'
          AND run.item_count > 0
          AND COALESCE(run.metadata->>'qualityExempt', 'false') != 'true'
          AND EXISTS (
            SELECT 1
            FROM intelligence_synthesized_items item
            WHERE item.run_id = run.run_id
              AND item.status != 'archived'
          )
        ORDER BY run.created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT *
        FROM intelligence_synthesized_items
        WHERE status != 'archived'
        ORDER BY created_at DESC, review_order ASC
        LIMIT $1
      `, [normalizedLimit]),
      pool.query(`
        SELECT COUNT(DISTINCT source_id)::int AS distinct_item_sources
        FROM intelligence_synthesized_items item,
             unnest(item.source_ids) source_id
        WHERE item.status != 'archived'
      `),
      pool.query(`
        WITH active_items AS (
          SELECT *
          FROM intelligence_synthesized_items
          WHERE status != 'archived'
        ),
        fact_item_status AS (
          SELECT item.synthesized_item_id,
                 bool_and(fact.fact_id IS NOT NULL AND fact.status = 'active') AS refs_active
          FROM active_items item
          LEFT JOIN LATERAL unnest(item.fact_refs) ref(fact_id) ON TRUE
          LEFT JOIN intelligence_synthesis_facts fact ON fact.fact_id = ref.fact_id
          GROUP BY item.synthesized_item_id
        ),
        evidence_item_status AS (
          SELECT item.synthesized_item_id,
                 bool_and(atom.atom_id IS NOT NULL AND atom.status NOT IN ('rejected', 'archived', 'superseded')) AS refs_active
          FROM active_items item
          LEFT JOIN LATERAL unnest(item.evidence_refs) ref(atom_id) ON TRUE
          LEFT JOIN intelligence_atoms atom ON atom.atom_id = ref.atom_id
          GROUP BY item.synthesized_item_id
        ),
        chunk_item_status AS (
          SELECT item.synthesized_item_id,
                 bool_and(chunk.chunk_id IS NOT NULL AND chunk.status = 'active') AS refs_active
          FROM active_items item
          LEFT JOIN LATERAL unnest(item.evidence_chunk_refs) ref(chunk_id) ON TRUE
          LEFT JOIN intelligence_retrieval_chunks chunk ON chunk.chunk_id = ref.chunk_id
          GROUP BY item.synthesized_item_id
        )
        SELECT
          COUNT(*) FILTER (WHERE fact_status.refs_active)::int AS items_with_active_fact_refs,
          COUNT(*) FILTER (WHERE evidence_status.refs_active)::int AS items_with_active_evidence_refs,
          COUNT(*) FILTER (WHERE chunk_status.refs_active)::int AS items_with_active_evidence_chunk_refs
        FROM active_items item
        LEFT JOIN fact_item_status fact_status ON fact_status.synthesized_item_id = item.synthesized_item_id
        LEFT JOIN evidence_item_status evidence_status ON evidence_status.synthesized_item_id = item.synthesized_item_id
        LEFT JOIN chunk_item_status chunk_status ON chunk_status.synthesized_item_id = item.synthesized_item_id
      `),
      pool.query(`
        WITH latest_quality_run AS (
          SELECT run_id
          FROM intelligence_synthesis_runs
          WHERE status = 'succeeded'
            AND item_count > 0
            AND COALESCE(metadata->>'qualityExempt', 'false') != 'true'
            AND EXISTS (
              SELECT 1
              FROM intelligence_synthesized_items active_item
              WHERE active_item.run_id = intelligence_synthesis_runs.run_id
                AND active_item.status != 'archived'
            )
          ORDER BY created_at DESC
          LIMIT 1
        ),
        quality_items AS (
          SELECT item.*
          FROM intelligence_synthesized_items item
          JOIN latest_quality_run quality_run ON quality_run.run_id = item.run_id
          WHERE item.status != 'archived'
        ),
        duplicate_theme_keys AS (
          SELECT attributes->>'themeKey' AS theme_key
          FROM quality_items
          WHERE COALESCE(attributes->>'themeKey', '') != ''
          GROUP BY attributes->>'themeKey'
          HAVING COUNT(*) > 1
        )
        SELECT
          COUNT(*)::int AS latest_quality_active_items,
          COUNT(*) FILTER (WHERE COALESCE(attributes->>'synthesisQuality', '') = 'clustered')::int AS latest_quality_clustered_items,
          COUNT(*) FILTER (WHERE COALESCE(attributes->>'themeKey', '') != '')::int AS latest_quality_items_with_theme_metadata,
          COUNT(*) FILTER (WHERE COALESCE(metadata->>'strategyHubEligible', attributes->>'strategyHubEligible') = 'true')::int AS latest_quality_strategy_eligible_items,
          COUNT(*) FILTER (
            WHERE COALESCE(metadata->>'strategyHubEligible', attributes->>'strategyHubEligible') = 'true'
              AND cardinality(evidence_refs) >= 2
              AND cardinality(evidence_chunk_refs) >= 2
          )::int AS latest_quality_strategy_items_with_multi_evidence,
          COUNT(*) FILTER (
            WHERE COALESCE(metadata->>'strategyHubEligible', attributes->>'strategyHubEligible') = 'true'
              AND (cardinality(evidence_refs) < 2 OR cardinality(evidence_chunk_refs) < 2)
          )::int AS latest_quality_strategy_single_evidence_items,
          COUNT(*) FILTER (WHERE cardinality(evidence_refs) >= 2)::int AS latest_quality_items_with_multi_evidence,
          COALESCE((SELECT COUNT(*) FROM duplicate_theme_keys), 0)::int AS latest_quality_duplicate_theme_keys
        FROM quality_items
      `),
    ])
    const latestProofRunRow = latestProofRun.rows[0] ? mapRunRow(latestProofRun.rows[0]) : null
    const latestQualityRunRow = latestQualityRun.rows[0] ? mapRunRow(latestQualityRun.rows[0]) : null
    const latestQualityRunMetadata = latestQualityRunRow?.metadata || latestProofRunRow?.metadata || {}
    const latestProofQualityRow = latestProofQuality.rows[0] || {}

    return {
      generatedAt: new Date().toISOString(),
      totalItems: Number(summary.rows[0]?.total_items || 0),
      activeItems: Number(summary.rows[0]?.active_items || 0),
      itemsWithFactRefs: Number(summary.rows[0]?.items_with_fact_refs || 0),
      itemsWithEvidenceRefs: Number(summary.rows[0]?.items_with_evidence_refs || 0),
      itemsWithEvidenceChunkRefs: Number(summary.rows[0]?.items_with_evidence_chunk_refs || 0),
      itemsWithOwnerConfidence: Number(summary.rows[0]?.items_with_owner_confidence || 0),
      needsOwnerItems: Number(summary.rows[0]?.needs_owner_items || 0),
      tierOneItems: Number(summary.rows[0]?.tier_one_items || 0),
      activeClusteredItems: Number(summary.rows[0]?.active_clustered_items || 0),
      activeLegacyProtectedItems: Number(summary.rows[0]?.active_legacy_protected_items || 0),
      activeUnclusteredUnprotectedItems: Number(summary.rows[0]?.active_unclustered_unprotected_items || 0),
      routeableActiveItems: Number(summary.rows[0]?.routeable_active_items || 0),
      routeableUnclusteredItems: Number(summary.rows[0]?.routeable_unclustered_items || 0),
      itemsWithActiveFactRefs: Number(referenceIntegrity.rows[0]?.items_with_active_fact_refs || 0),
      itemsWithActiveEvidenceRefs: Number(referenceIntegrity.rows[0]?.items_with_active_evidence_refs || 0),
      itemsWithActiveEvidenceChunkRefs: Number(referenceIntegrity.rows[0]?.items_with_active_evidence_chunk_refs || 0),
      totalRuns: Number(summary.rows[0]?.total_runs || 0),
      distinctItemSources: Number(sourceSummary.rows[0]?.distinct_item_sources || 0),
      latestRun: latestRun.rows[0] ? mapRunRow(latestRun.rows[0]) : null,
      latestProofRun: latestProofRunRow,
      latestQualityRun: latestQualityRunRow,
      latestProofQuality: {
        runId: latestQualityRunRow?.runId || latestProofRunRow?.runId || null,
        runType: latestQualityRunRow?.runType || latestProofRunRow?.runType || null,
        activeItems: Number(latestProofQualityRow.latest_quality_active_items || 0),
        clusteredItems: Number(latestProofQualityRow.latest_quality_clustered_items || 0),
        itemsWithThemeMetadata: Number(latestProofQualityRow.latest_quality_items_with_theme_metadata || 0),
        strategyEligibleItems: Number(latestProofQualityRow.latest_quality_strategy_eligible_items || 0),
        strategyItemsWithMultiEvidence: Number(latestProofQualityRow.latest_quality_strategy_items_with_multi_evidence || 0),
        strategySingleEvidenceItems: Number(latestProofQualityRow.latest_quality_strategy_single_evidence_items || 0),
        itemsWithMultiEvidence: Number(latestProofQualityRow.latest_quality_items_with_multi_evidence || 0),
        duplicateThemeKeys: Number(latestProofQualityRow.latest_quality_duplicate_theme_keys || 0),
        humanSampleRows: Array.isArray(latestQualityRunMetadata.humanSample?.rows)
          ? latestQualityRunMetadata.humanSample.rows.length
          : 0,
      },
      recentItems: recentItems.rows.map(mapItemRow),
    }
  }

  return {
    getSynthesisEngineSnapshot,
    runGovernedSynthesis,
  }
}
