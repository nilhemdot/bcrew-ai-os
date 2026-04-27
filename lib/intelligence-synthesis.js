import { createHash } from 'node:crypto'

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
    metadata: parseJsonObject(row.metadata),
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
  const evidenceFactsBySource = new Map()
  for (const fact of activeFacts.filter(fact => evidenceIdForFact(fact) && !isBlockedOperationalNoise(fact))) {
    const sourceId = fact.sourceId || 'unknown'
    if (!evidenceFactsBySource.has(sourceId)) evidenceFactsBySource.set(sourceId, [])
    evidenceFactsBySource.get(sourceId).push(fact)
  }
  const evidenceFacts = []
  while (Array.from(evidenceFactsBySource.values()).some(group => group.length)) {
    for (const sourceId of Array.from(evidenceFactsBySource.keys()).sort()) {
      const group = evidenceFactsBySource.get(sourceId)
      const next = group.shift()
      if (next) evidenceFacts.push(next)
    }
  }
  const items = []

  for (const fact of evidenceFacts) {
    const evidenceId = evidenceIdForFact(fact)
    const evidenceResult = evidenceById.get(evidenceId) || {}
    const supportingFacts = sourceSupportFacts
      .filter(sourceFact => uniqueText(sourceFact.sourceIds).some(sourceId => uniqueText(fact.sourceIds).includes(sourceId)))
      .slice(0, 3)
    const factRefs = uniqueText([fact.factId, ...supportingFacts.map(sourceFact => sourceFact.factId)])
    const evidenceRefs = uniqueText([evidenceId, evidenceResult.evidenceId, evidenceResult.atomId])
    const evidenceChunkRefs = uniqueText([evidenceChunkRefForResult(evidenceResult)])
    if (!factRefs.length || !evidenceRefs.length || !evidenceChunkRefs.length) continue

    const reviewOrder = items.length + 1
    const ownerDecision = ownerDecisionForFact(fact)
    const sourceIds = uniqueText([...(fact.sourceIds || []), fact.sourceId, ...supportingFacts.flatMap(sourceFact => sourceFact.sourceIds || [])])
    const atomRefs = uniqueText([fact.atomId, evidenceResult.atomId])
    const candidateKeys = uniqueText([fact.candidateKey, evidenceResult.candidateKey])
    const artifactIds = uniqueText([fact.artifactId, evidenceResult.artifactId])
    const naturalKey = buildItemNaturalKey({ synthesisScopeKey, fact, evidenceRefs, evidenceChunkRefs })

    items.push({
      synthesizedItemId: stableId('synthesized-item', naturalKey),
      naturalKey,
      synthesisScopeKey,
      runId,
      itemType: itemTypeForFact(fact),
      status: ownerDecision.owner ? 'ready_for_action_router' : 'needs_owner',
      reviewOrder,
      title: shorten(fact.title || evidenceResult.title || 'Synthesized intelligence item', 220),
      summary: shorten(fact.claim || evidenceResult.excerpt || '', 900),
      suggestedOwner: ownerDecision.owner,
      ownerConfidence: ownerDecision.confidence,
      ownerResolutionReason: ownerDecision.reason,
      ownerAction: ownerDecision.owner
        ? `Review and route this ${fact.factType || 'evidence'} item with its source proof before Strategy Hub consumes it.`
        : `Choose an owner for this ${fact.factType || 'evidence'} item before Action Router can route it.`,
      sourceIds,
      factRefs,
      evidenceRefs,
      evidenceChunkRefs,
      atomRefs,
      candidateKeys,
      artifactIds,
      sensitivity: normalizeSensitivity(fact.sensitivity || evidenceResult.sensitivity),
      minTier: coerceMinTier(fact.minTier ?? evidenceResult.minTier, 1),
      attributes: {
        recency: freshnessForFact(fact),
        sourceConfidence: fact.sourceId ? 'source-backed' : 'unknown',
        severity: severityForFact(fact),
        freshness: freshnessForFact(fact),
        ownerActionability: ownerDecision.owner ? 'owner-suggested' : 'needs-owner',
        ownerConfidence: ownerDecision.confidence,
        matchedBy: evidenceResult.matchedBy || parseJsonObject(fact.metadata).matchedBy || [],
        rankingPolicy: 'ordered-for-review-without-weighted-score',
      },
      metadata: {
        sourceFactType: fact.factType,
        sourceFactId: fact.factId,
        evidenceType: evidenceResult.evidenceType || null,
        synthesisGate: 'SYNTHESIS-ENGINE-001',
        ownerResolutionReason: ownerDecision.reason,
      },
    })

    if (items.length >= limit) break
  }

  return items
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

    const sourceIds = uniqueText(input.sourceIds || input.source_ids || [
      ...facts.flatMap(fact => fact.sourceIds || []),
      ...items.flatMap(item => item.sourceIds || []),
    ])
    const factRefs = uniqueText(items.flatMap(item => item.factRefs))
    const evidenceRefs = uniqueText(items.flatMap(item => item.evidenceRefs))
    const currentNaturalKeys = uniqueText(items.map(item => item.naturalKey))

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
          items.length,
          maxTier,
          JSON.stringify({
            ...(input.metadata || {}),
            factRefs,
            evidenceRefs,
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

      for (let index = 0; index < items.length; index += 1) {
        savedItems.push(await upsertSynthesizedItemWithClient(client, items[index], runId, index + 1))
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
    const [summary, latestRun, latestProofRun, recentItems, sourceSummary, referenceIntegrity] = await Promise.all([
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
    ])

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
      itemsWithActiveFactRefs: Number(referenceIntegrity.rows[0]?.items_with_active_fact_refs || 0),
      itemsWithActiveEvidenceRefs: Number(referenceIntegrity.rows[0]?.items_with_active_evidence_refs || 0),
      itemsWithActiveEvidenceChunkRefs: Number(referenceIntegrity.rows[0]?.items_with_active_evidence_chunk_refs || 0),
      totalRuns: Number(summary.rows[0]?.total_runs || 0),
      distinctItemSources: Number(sourceSummary.rows[0]?.distinct_item_sources || 0),
      latestRun: latestRun.rows[0] ? mapRunRow(latestRun.rows[0]) : null,
      latestProofRun: latestProofRun.rows[0] ? mapRunRow(latestProofRun.rows[0]) : null,
      recentItems: recentItems.rows.map(mapItemRow),
    }
  }

  return {
    getSynthesisEngineSnapshot,
    runGovernedSynthesis,
  }
}
