import { createHash } from 'node:crypto'

export const intelligenceSynthesisFactsSchemaSql = `
  CREATE TABLE IF NOT EXISTS intelligence_synthesis_fact_runs (
    run_id TEXT PRIMARY KEY,
    run_type TEXT NOT NULL
      CHECK (run_type IN ('source_fact_proof', 'fact_refresh')),
    status TEXT NOT NULL
      CHECK (status IN ('succeeded', 'failed')),
    requested_by TEXT NOT NULL DEFAULT 'system',
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    fact_count INTEGER NOT NULL DEFAULT 0,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    max_tier INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesis_fact_runs_lookup
  ON intelligence_synthesis_fact_runs(run_type, status, created_at DESC);

  CREATE TABLE IF NOT EXISTS intelligence_synthesis_facts (
    fact_id TEXT PRIMARY KEY,
    natural_key TEXT,
    run_id TEXT REFERENCES intelligence_synthesis_fact_runs(run_id) ON DELETE SET NULL,
    fact_type TEXT NOT NULL
      CHECK (fact_type IN (
        'source_contract',
        'goal_truth',
        'operating_truth',
        'kpi_truth',
        'source_snapshot',
        'source_health',
        'retrieved_evidence'
      )),
    source_id TEXT NOT NULL,
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    title TEXT NOT NULL,
    claim TEXT NOT NULL,
    value TEXT,
    detail TEXT NOT NULL DEFAULT '',
    source_ref TEXT,
    evidence_id TEXT,
    artifact_id TEXT,
    atom_id TEXT,
    candidate_key TEXT,
    report_artifact_id TEXT,
    source_url TEXT,
    as_of TIMESTAMPTZ,
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
    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived', 'superseded')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesis_facts_type
  ON intelligence_synthesis_facts(fact_type, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesis_facts_source
  ON intelligence_synthesis_facts(source_id, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesis_facts_tier
  ON intelligence_synthesis_facts(min_tier, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesis_facts_run
  ON intelligence_synthesis_facts(run_id, fact_type);

  CREATE INDEX IF NOT EXISTS idx_intelligence_synthesis_facts_evidence
  ON intelligence_synthesis_facts(evidence_id, atom_id, candidate_key);

  ALTER TABLE intelligence_synthesis_facts
  ADD COLUMN IF NOT EXISTS natural_key TEXT;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_intelligence_synthesis_facts_active_natural_key
  ON intelligence_synthesis_facts(natural_key)
  WHERE status = 'active' AND natural_key IS NOT NULL;
`

const FACT_TYPES = new Set([
  'source_contract',
  'goal_truth',
  'operating_truth',
  'kpi_truth',
  'source_snapshot',
  'source_health',
  'retrieved_evidence',
])

const SENSITIVITIES = new Set([
  'neutral',
  'positive',
  'performance_concern',
  'termination_risk',
  'comp_discussion',
  'undisclosed_feedback',
])

const STATUSES = new Set(['active', 'archived', 'superseded'])

const SOURCE_CONTRACT_FACT_IDS = new Set([
  'SRC-STRATEGY-001',
  'SRC-FINANCE-001',
  'SRC-OWNERS-001',
  'SRC-FUB-001',
  'SRC-SUPABASE-001',
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

function stableFactNaturalKey(input = {}) {
  const metadata = parseJsonObject(input.metadata)
  return [
    input.factType || input.fact_type,
    input.sourceId || input.source_id,
    input.evidenceId || input.evidence_id ||
      input.atomId || input.atom_id ||
      input.candidateKey || input.candidate_key ||
      input.reportArtifactId || input.report_artifact_id ||
      input.sourceRef || input.source_ref ||
      metadata.backlogId ||
      metadata.targetKey ||
      metadata.group ||
      '',
    input.title,
  ].filter(Boolean).join('|')
}

function stableFactId(input = {}) {
  return `fact:${stableHash(stableFactNaturalKey(input)).slice(0, 24)}`
}

function shorten(value, length = 520) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= length) return normalized
  return `${normalized.slice(0, length)}...`
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

function normalizeTimestamp(value) {
  if (!value) return null
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString()
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function normalizeMaxTier(value) {
  const maxTier = Number(value)
  if (!Number.isFinite(maxTier) || maxTier < 1) {
    throw new Error('synthesis fact queries require maxTier >= 1.')
  }
  return Math.floor(maxTier)
}

function coerceMinTier(value, fallback = 1) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

function normalizeFactType(value) {
  const normalized = String(value || '').trim()
  if (!FACT_TYPES.has(normalized)) throw new Error(`Invalid synthesis fact type: ${normalized || '<blank>'}`)
  return normalized
}

function normalizeSensitivity(value) {
  const normalized = String(value || 'neutral').trim()
  return SENSITIVITIES.has(normalized) ? normalized : 'neutral'
}

function normalizeStatus(value) {
  const normalized = String(value || 'active').trim()
  if (!STATUSES.has(normalized)) throw new Error(`Invalid synthesis fact status: ${normalized || '<blank>'}`)
  return normalized
}

function normalizeRunType(value) {
  const normalized = String(value || 'source_fact_proof').trim()
  if (!['source_fact_proof', 'fact_refresh'].includes(normalized)) {
    throw new Error(`Invalid synthesis fact run type: ${normalized || '<blank>'}`)
  }
  return normalized
}

function normalizeRunStatus(value) {
  const normalized = String(value || 'succeeded').trim()
  if (!['succeeded', 'failed'].includes(normalized)) {
    throw new Error(`Invalid synthesis fact run status: ${normalized || '<blank>'}`)
  }
  return normalized
}

function mapFactRow(row = {}) {
  return {
    factId: row.fact_id ?? row.factId,
    naturalKey: row.natural_key ?? row.naturalKey,
    runId: row.run_id ?? row.runId,
    factType: row.fact_type ?? row.factType,
    sourceId: row.source_id ?? row.sourceId,
    sourceIds: row.source_ids ?? row.sourceIds ?? [],
    title: row.title,
    claim: row.claim,
    value: row.value,
    detail: row.detail,
    sourceRef: row.source_ref ?? row.sourceRef,
    evidenceId: row.evidence_id ?? row.evidenceId,
    artifactId: row.artifact_id ?? row.artifactId,
    atomId: row.atom_id ?? row.atomId,
    candidateKey: row.candidate_key ?? row.candidateKey,
    reportArtifactId: row.report_artifact_id ?? row.reportArtifactId,
    sourceUrl: row.source_url ?? row.sourceUrl,
    asOf: row.as_of ?? row.asOf,
    sensitivity: row.sensitivity,
    minTier: Number(row.min_tier ?? row.minTier ?? 1),
    status: row.status,
    metadata: parseJsonObject(row.metadata),
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
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
    maxTier: Number(row.max_tier ?? row.maxTier ?? 1),
    metadata: parseJsonObject(row.metadata),
    startedAt: row.started_at ?? row.startedAt,
    finishedAt: row.finished_at ?? row.finishedAt,
    createdAt: row.created_at ?? row.createdAt,
  }
}

function buildSourceContractFacts(sourceContracts = []) {
  return sourceContracts
    .filter(source => SOURCE_CONTRACT_FACT_IDS.has(source.sourceId || source.id))
    .map(source => ({
      factType: 'source_contract',
      sourceId: source.sourceId || source.id,
      sourceIds: [source.sourceId || source.id],
      title: `${source.sourceId || source.id}: ${source.title}`,
      claim: `${source.sourceId || source.id} is the governed source for ${source.owns || source.scope || source.title}.`,
      value: source.validation || source.status || null,
      detail: shorten(source.validationScope || source.boundaryNote || source.doneMeans || ''),
      sourceRef: source.location || null,
      asOf: normalizeTimestamp(source.lastVerified),
      metadata: {
        status: source.status,
        validation: source.validation,
        owner: source.owner || '',
        unitName: source.unitName || '',
      },
    }))
}

function buildGoalTruthFacts(goalTruth = {}) {
  const facts = []
  for (const group of Array.isArray(goalTruth.groups) ? goalTruth.groups : []) {
    const groupFacts = Array.isArray(group.facts) ? group.facts : []
    const sourceIds = uniqueText(groupFacts.map(fact => fact.sourceId))
    const sourceId = sourceIds[0]
    if (!sourceId) continue
    facts.push({
      factType: 'goal_truth',
      sourceId,
      sourceIds,
      title: group.title || group.key || 'Goal truth',
      claim: `${group.title || group.key} is ${group.statusLabel || group.status || 'current'}.`,
      value: group.statusLabel || group.status || null,
      detail: shorten([group.rule, group.caveat].filter(Boolean).join(' '), 700),
      asOf: normalizeTimestamp(group.asOf),
      metadata: {
        key: group.key,
        status: group.status,
        rule: goalTruth.rule,
      },
    })
    for (const fact of groupFacts) {
      if (!fact.sourceId || !fact.label) continue
      facts.push({
        factType: 'goal_truth',
        sourceId: fact.sourceId,
        sourceIds: [fact.sourceId],
        title: `${group.title || group.key}: ${fact.label}`,
        claim: `${group.title || group.key} ${fact.label} is ${fact.value}.`,
        value: fact.value || null,
        detail: shorten(fact.detail || group.rule || '', 700),
        asOf: normalizeTimestamp(fact.asOf || group.asOf),
        metadata: {
          group: group.key || group.title,
          sortOrder: fact.sortOrder ?? null,
        },
      })
    }
  }
  return facts
}

function buildOperatingTruthFacts(operatingTruth = {}) {
  const facts = []
  for (const card of Array.isArray(operatingTruth.sourceCards) ? operatingTruth.sourceCards : []) {
    if (!card.sourceId) continue
    facts.push({
      factType: 'operating_truth',
      sourceId: card.sourceId,
      sourceIds: [card.sourceId],
      title: `${card.sourceId}: ${card.title}`,
      claim: card.currentRead || `${card.sourceId} is ${card.status || 'available'} for current operating truth.`,
      value: card.validation || card.status || null,
      detail: shorten([card.guardrail, card.boundaryNote, card.validationScope].filter(Boolean).join(' '), 900),
      asOf: normalizeTimestamp(card.lastVerified),
      metadata: {
        unitName: card.unitName || '',
        owns: card.owns || '',
      },
    })
    for (const fact of Array.isArray(card.facts) ? card.facts : []) {
      const sourceId = fact.sourceId || card.sourceId
      if (!sourceId || !fact.label) continue
      facts.push({
        factType: 'operating_truth',
        sourceId,
        sourceIds: [sourceId],
        title: `${card.sourceId}: ${fact.label}`,
        claim: `${fact.label}: ${fact.value}.`,
        value: fact.value || null,
        detail: shorten(fact.detail || card.guardrail || '', 700),
        asOf: normalizeTimestamp(fact.asOf || card.lastVerified),
        metadata: {
          cardSourceId: card.sourceId,
          cardTitle: card.title,
        },
      })
    }
  }
  for (const card of Array.isArray(operatingTruth.kpiCards) ? operatingTruth.kpiCards : []) {
    facts.push({
      factType: 'kpi_truth',
      sourceId: 'SRC-SUPABASE-001',
      sourceIds: ['SRC-SUPABASE-001'],
      title: card.title || card.id,
      claim: shorten(card.summary || card.title || '', 900),
      value: card.priority || null,
      detail: shorten(card.statusNote || '', 700),
      sourceRef: card.id || null,
      asOf: normalizeTimestamp(card.updatedAt),
      metadata: {
        backlogId: card.id,
        lane: card.lane,
        priority: card.priority,
      },
    })
  }
  return facts
}

function buildDocSnapshotFacts(rows = []) {
  return rows
    .filter(row => row.source_id && row.label)
    .map(row => ({
      factType: 'source_snapshot',
      sourceId: row.source_id,
      sourceIds: [row.source_id],
      title: `${row.group_title || row.doc_path || row.source_id}: ${row.label}`,
      claim: `${row.label}: ${row.value}.`,
      value: row.value || null,
      detail: shorten(row.detail || '', 700),
      sourceRef: row.doc_path || null,
      asOf: normalizeTimestamp(row.as_of),
      metadata: {
        group: row.group_title || '',
        sortOrder: row.sort_order ?? null,
      },
    }))
}

function buildSourceHealthFacts(rows = []) {
  return rows
    .filter(row => row.source_id && row.target_key)
    .map(row => ({
      factType: 'source_health',
      sourceId: row.source_id,
      sourceIds: [row.source_id],
      title: `${row.source_id}: ${row.title || row.target_key}`,
      claim: `${row.target_key} is ${row.status || 'unknown'} with last status ${row.last_status || 'unknown'}.`,
      value: row.last_status || row.status || null,
      detail: shorten(`Inspected ${row.inspected_count || 0}, archived ${row.archived_count || 0}, extracted ${row.extracted_count || 0}.`, 500),
      sourceRef: row.target_key,
      asOf: normalizeTimestamp(row.last_run_at),
      metadata: {
        lane: row.lane,
        runtimeMode: row.runtime_mode,
        cursorState: row.cursor_state || {},
      },
    }))
}

function isBlockedOperationalNoise(result = {}) {
  const text = `${result.title || ''} ${result.excerpt || ''}`.toLowerCase()
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

function buildHybridEvidenceFacts(evidence = {}) {
  return (Array.isArray(evidence.results) ? evidence.results : [])
    .filter(result => result.sourceId && result.evidenceId && !isBlockedOperationalNoise(result))
    .slice(0, 8)
    .map(result => ({
      factType: 'retrieved_evidence',
      sourceId: result.sourceId,
      sourceIds: [result.sourceId],
      title: result.title || result.evidenceId,
      claim: shorten(result.excerpt || result.title || '', 900),
      value: Array.isArray(result.matchedBy) ? result.matchedBy.join('+') : null,
      detail: shorten(`Hybrid evidence match for "${evidence.query || ''}" with score ${result.score ?? 'n/a'}.`, 500),
      evidenceId: result.evidenceId,
      artifactId: result.artifactId,
      atomId: result.atomId,
      candidateKey: result.candidateKey,
      reportArtifactId: result.reportArtifactId,
      sourceUrl: result.sourceUrl,
      sensitivity: result.sensitivity || 'neutral',
      minTier: result.minTier || 1,
      metadata: {
        query: evidence.query,
        matchedBy: result.matchedBy || [],
        ranks: result.ranks || {},
        score: result.score ?? null,
      },
    }))
}

export function createIntelligenceSynthesisFactStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getRegisteredSourceIds,
  getSourceContracts,
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
  searchIntelligenceEvidenceHybrid,
}) {
  function assertRegisteredSourceIds(sourceIds, fieldName = 'sourceId') {
    const registered = new Set(getRegisteredSourceIds())
    const invalid = uniqueText(sourceIds).filter(sourceId => !registered.has(sourceId))
    if (invalid.length) {
      throw new Error(`${fieldName} contains unregistered source IDs: ${invalid.join(', ')}`)
    }
  }

  function normalizeFactInput(input = {}, runId = null) {
    const factType = normalizeFactType(input.factType || input.fact_type)
    const sourceIds = uniqueText([
      input.sourceId || input.source_id,
      ...(input.sourceIds || input.source_ids || []),
    ])
    const sourceId = String(input.sourceId || input.source_id || sourceIds[0] || '').trim()
    if (!sourceId) throw new Error('sourceId is required for synthesis facts.')
    const title = String(input.title || '').trim()
    const claim = String(input.claim || '').trim()
    if (!title || !claim) throw new Error('title and claim are required for synthesis facts.')
    const normalizedSourceIds = uniqueText([sourceId, ...sourceIds])
    assertRegisteredSourceIds(normalizedSourceIds, 'sourceIds')
    const naturalKey = String(input.naturalKey || input.natural_key || stableFactNaturalKey({ ...input, factType, sourceId, title })).trim()
    return {
      factId: String(input.factId || input.fact_id || stableFactId({ ...input, factType, sourceId, title, claim })).trim(),
      naturalKey,
      runId: input.runId || input.run_id || runId,
      factType,
      sourceId,
      sourceIds: normalizedSourceIds,
      title,
      claim,
      value: input.value == null ? null : String(input.value),
      detail: String(input.detail || ''),
      sourceRef: input.sourceRef || input.source_ref || null,
      evidenceId: input.evidenceId || input.evidence_id || null,
      artifactId: input.artifactId || input.artifact_id || null,
      atomId: input.atomId || input.atom_id || null,
      candidateKey: input.candidateKey || input.candidate_key || null,
      reportArtifactId: input.reportArtifactId || input.report_artifact_id || null,
      sourceUrl: input.sourceUrl || input.source_url || null,
      asOf: normalizeTimestamp(input.asOf || input.as_of),
      sensitivity: normalizeSensitivity(input.sensitivity),
      minTier: coerceMinTier(input.minTier || input.min_tier, 1),
      status: normalizeStatus(input.status),
      metadata: parseJsonObject(input.metadata),
    }
  }

  async function upsertFactWithClient(client, input, runId = null) {
    const fact = normalizeFactInput(input, runId)
    const result = await client.query(
      `
        INSERT INTO intelligence_synthesis_facts (
          fact_id, natural_key, run_id, fact_type, source_id, source_ids, title, claim, value, detail,
          source_ref, evidence_id, artifact_id, atom_id, candidate_key, report_artifact_id,
          source_url, as_of, sensitivity, min_tier, status, metadata, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6::text[],$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb,NOW())
        ON CONFLICT (fact_id) DO UPDATE SET
          natural_key = EXCLUDED.natural_key,
          run_id = EXCLUDED.run_id,
          fact_type = EXCLUDED.fact_type,
          source_id = EXCLUDED.source_id,
          source_ids = EXCLUDED.source_ids,
          title = EXCLUDED.title,
          claim = EXCLUDED.claim,
          value = EXCLUDED.value,
          detail = EXCLUDED.detail,
          source_ref = EXCLUDED.source_ref,
          evidence_id = EXCLUDED.evidence_id,
          artifact_id = EXCLUDED.artifact_id,
          atom_id = EXCLUDED.atom_id,
          candidate_key = EXCLUDED.candidate_key,
          report_artifact_id = EXCLUDED.report_artifact_id,
          source_url = EXCLUDED.source_url,
          as_of = EXCLUDED.as_of,
          sensitivity = EXCLUDED.sensitivity,
          min_tier = EXCLUDED.min_tier,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING *
      `,
      [
        fact.factId,
        fact.naturalKey,
        fact.runId,
        fact.factType,
        fact.sourceId,
        fact.sourceIds,
        fact.title,
        fact.claim,
        fact.value,
        fact.detail,
        fact.sourceRef,
        fact.evidenceId,
        fact.artifactId,
        fact.atomId,
        fact.candidateKey,
        fact.reportArtifactId,
        fact.sourceUrl,
        fact.asOf,
        fact.sensitivity,
        fact.minTier,
        fact.status,
        JSON.stringify(fact.metadata || {}),
      ]
    )
    return mapFactRow(result.rows[0])
  }

  async function collectSourceBackedSynthesisFacts(filters = {}) {
    const maxTier = normalizeMaxTier(filters.maxTier ?? filters.max_tier)
    const limit = Math.min(200, Math.max(20, Number(filters.limit) || 100))
    const query = String(filters.query || '').trim()
    const queryEmbedding = filters.queryEmbedding || filters.query_embedding

    const [docFacts, sourceHealth, goalTruth, operatingTruth] = await Promise.all([
      pool.query(
        `
          SELECT source_id, doc_path, group_title, label, value, detail, as_of, sort_order
          FROM doc_source_snapshots
          ORDER BY doc_path ASC, group_title ASC, sort_order ASC, updated_at DESC
          LIMIT 100
        `
      ),
      pool.query(
        `
          SELECT target_key, source_id, title, lane, status, runtime_mode,
                 last_status, last_run_at, inspected_count, archived_count,
                 extracted_count, cursor_state
          FROM source_crawl_targets
          WHERE source_id IS NOT NULL
          ORDER BY priority ASC, target_key ASC
          LIMIT 40
        `
      ),
      getStrategyGoalTruthSnapshot(),
      getStrategyOperatingTruthSnapshot(),
    ])

    const evidence = query && queryEmbedding && searchIntelligenceEvidenceHybrid
      ? await searchIntelligenceEvidenceHybrid({
          query,
          queryEmbedding,
          maxTier,
          limit: Math.min(10, Number(filters.evidenceLimit || filters.evidence_limit) || 5),
        })
      : null

    const rawFacts = [
      ...buildSourceContractFacts(getSourceContracts()),
      ...buildGoalTruthFacts(goalTruth),
      ...buildOperatingTruthFacts(operatingTruth),
      ...buildDocSnapshotFacts(docFacts.rows),
      ...buildSourceHealthFacts(sourceHealth.rows),
      ...buildHybridEvidenceFacts(evidence || {}),
    ]

    const byNaturalKey = new Map()
    for (const fact of rawFacts) {
      const normalized = normalizeFactInput(fact)
      if (normalized.minTier <= maxTier && !byNaturalKey.has(normalized.naturalKey)) {
        byNaturalKey.set(normalized.naturalKey, normalized)
      }
      if (byNaturalKey.size >= limit) break
    }

    return {
      generatedAt: new Date().toISOString(),
      maxTier,
      query: query || null,
      sourceIds: uniqueText(Array.from(byNaturalKey.values()).flatMap(fact => fact.sourceIds)),
      facts: Array.from(byNaturalKey.values()),
      evidence: evidence
        ? {
            query: evidence.query,
            resultCount: evidence.resultCount,
            laneCounts: evidence.laneCounts,
            evidenceIds: evidence.results.map(result => result.evidenceId),
            results: evidence.results.map(result => ({
              evidenceId: result.evidenceId,
              evidenceType: result.evidenceType,
              sourceId: result.sourceId,
              artifactId: result.artifactId,
              candidateKey: result.candidateKey,
              atomId: result.atomId,
              reportArtifactId: result.reportArtifactId,
              title: result.title,
              chunkId: result.chunk?.chunkId || result.chunkId || null,
              matchedBy: result.matchedBy || [],
              minTier: result.minTier,
              sensitivity: result.sensitivity,
            })),
          }
        : null,
    }
  }

  async function upsertSynthesisFactsBundle(input = {}, actor = 'system') {
    const runId = String(input.runId || input.run_id || `synthesis-facts-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`).trim()
    const runType = normalizeRunType(input.runType || input.run_type)
    const status = normalizeRunStatus(input.status)
    const maxTier = normalizeMaxTier(input.maxTier ?? input.max_tier ?? 1)
    const facts = Array.isArray(input.facts) ? input.facts : []
    if (!facts.length) throw new Error('At least one synthesis fact is required.')
    const normalizedFacts = facts.map(fact => normalizeFactInput(fact, runId))
    const sourceIds = uniqueText(input.sourceIds || input.source_ids || normalizedFacts.flatMap(fact => fact.sourceIds))
    assertRegisteredSourceIds(sourceIds, 'sourceIds')
    const evidenceCount = normalizedFacts.filter(fact => fact.evidenceId || fact.atomId || fact.candidateKey).length
    const factIds = uniqueText(normalizedFacts.map(fact => fact.factId))
    const naturalKeys = uniqueText(normalizedFacts.map(fact => fact.naturalKey))
    const factTypes = uniqueText(normalizedFacts.map(fact => fact.factType))

    return withFoundationTransaction(async client => {
      const runResult = await client.query(
        `
          INSERT INTO intelligence_synthesis_fact_runs (
            run_id, run_type, status, requested_by, source_ids, fact_count,
            evidence_count, max_tier, metadata, started_at, finished_at
          )
          VALUES ($1,$2,$3,$4,$5::text[],$6,$7,$8,$9::jsonb,COALESCE($10::timestamptz,NOW()),COALESCE($11::timestamptz,NOW()))
          ON CONFLICT (run_id) DO UPDATE SET
            run_type = EXCLUDED.run_type,
            status = EXCLUDED.status,
            requested_by = EXCLUDED.requested_by,
            source_ids = EXCLUDED.source_ids,
            fact_count = EXCLUDED.fact_count,
            evidence_count = EXCLUDED.evidence_count,
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
          normalizedFacts.length,
          evidenceCount,
          maxTier,
          JSON.stringify(input.metadata || {}),
          normalizeTimestamp(input.startedAt || input.started_at),
          normalizeTimestamp(input.finishedAt || input.finished_at),
        ]
      )

      const archivedResult = await client.query(
        `
          UPDATE intelligence_synthesis_facts
          SET status = 'archived',
              run_id = $1,
              metadata = metadata || jsonb_build_object(
                'archivedByRunId', $1::text,
                'archivedReason', 'stale_after_synthesis_fact_refresh'
              ),
              updated_at = NOW()
          WHERE status = 'active'
            AND fact_type = ANY($2::text[])
            AND source_ids && $3::text[]
            AND NOT (fact_id = ANY($4::text[]))
            AND (
              natural_key IS NULL
              OR NOT (natural_key = ANY($5::text[]))
            )
        `,
        [runId, factTypes, sourceIds, factIds, naturalKeys]
      )
      const archivedStaleFacts = archivedResult.rowCount || 0

      let archivedSynthesizedItemsWithStaleFacts = 0
      const synthesisTableResult = await client.query("SELECT to_regclass('public.intelligence_synthesized_items') AS table_name")
      if (synthesisTableResult.rows[0]?.table_name) {
        const archivedItemsResult = await client.query(
          `
            UPDATE intelligence_synthesized_items item
            SET status = 'archived',
                metadata = metadata || jsonb_build_object(
                  'archivedByFactRunId', $1::text,
                  'archivedReason', 'stale_fact_refs_after_synthesis_fact_refresh'
                ),
                updated_at = NOW()
            WHERE item.status != 'archived'
              AND item.routing_status = 'unrouted'
              AND EXISTS (
                SELECT 1
                FROM unnest(item.fact_refs) ref(fact_id)
                LEFT JOIN intelligence_synthesis_facts fact ON fact.fact_id = ref.fact_id
                WHERE fact.fact_id IS NULL
                   OR fact.status != 'active'
              )
          `,
          [runId]
        )
        archivedSynthesizedItemsWithStaleFacts = archivedItemsResult.rowCount || 0
      }

      const savedFacts = []
      for (const fact of normalizedFacts) {
        savedFacts.push(await upsertFactWithClient(client, fact, runId))
      }

      await insertChangeEvent(client, {
        eventType: 'intelligence_synthesis_facts_run_recorded',
        entityTable: 'intelligence_synthesis_fact_runs',
        entityId: runId,
        actor,
        summary: `Recorded ${savedFacts.length} source-backed synthesis facts for ${runType}.`,
        metadata: {
          sourceIds,
          factCount: savedFacts.length,
          evidenceCount,
          archivedStaleFacts,
          archivedSynthesizedItemsWithStaleFacts,
          maxTier,
        },
      })

      return {
        run: mapRunRow(runResult.rows[0]),
        facts: savedFacts,
        archivedStaleFacts,
        archivedSynthesizedItemsWithStaleFacts,
      }
    })
  }

  async function querySynthesisFacts(filters = {}) {
    const maxTier = normalizeMaxTier(filters.maxTier ?? filters.max_tier)
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20))
    const clauses = ['status = $1', 'min_tier <= $2']
    const values = ['active', maxTier]

    function addAny(column, value) {
      const items = uniqueText(value)
      if (!items.length) return
      values.push(items)
      clauses.push(`${column} = ANY($${values.length}::text[])`)
    }

    const sourceIds = uniqueText(filters.sourceIds || filters.source_ids)
    if (sourceIds.length) {
      values.push(sourceIds)
      clauses.push(`(source_id = ANY($${values.length}::text[]) OR source_ids && $${values.length}::text[])`)
    }
    addAny('fact_type', filters.factTypes || filters.fact_types)
    addAny('fact_id', filters.factIds || filters.fact_ids)

    const query = String(filters.query || '').trim()
    if (query) {
      values.push(`%${query}%`)
      clauses.push(`(title ILIKE $${values.length} OR claim ILIKE $${values.length} OR detail ILIKE $${values.length})`)
    }

    values.push(limit)
    const result = await pool.query(
      `
        SELECT *
        FROM intelligence_synthesis_facts
        WHERE ${clauses.join(' AND ')}
        ORDER BY updated_at DESC, fact_type ASC, title ASC
        LIMIT $${values.length}
      `,
      values
    )
    return result.rows.map(mapFactRow)
  }

  async function getSynthesisFactsSnapshot(filters = {}) {
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20))
    const [summary, types, sources, naturalKeys, sourceOverlap, latestRun, latestSourceFactProofRun, recentFacts] = await Promise.all([
      pool.query(
        `
          SELECT
            count(*)::int AS total_active_facts,
            count(*) FILTER (WHERE evidence_id IS NOT NULL OR atom_id IS NOT NULL OR candidate_key IS NOT NULL)::int AS facts_with_evidence,
            count(DISTINCT source_id)::int AS distinct_sources,
            count(*) FILTER (WHERE natural_key IS NULL OR natural_key = '')::int AS active_facts_without_natural_key
          FROM intelligence_synthesis_facts
          WHERE status = 'active'
        `
      ),
      pool.query(
        `
          SELECT fact_type, count(*)::int total
          FROM intelligence_synthesis_facts
          WHERE status = 'active'
          GROUP BY fact_type
          ORDER BY fact_type ASC
        `
      ),
      pool.query(
        `
          SELECT source_id, count(*)::int total
          FROM intelligence_synthesis_facts
          WHERE status = 'active'
          GROUP BY source_id
          ORDER BY total DESC, source_id ASC
        `
      ),
      pool.query(
        `
          SELECT count(*)::int AS duplicate_natural_keys
          FROM (
            SELECT natural_key
            FROM intelligence_synthesis_facts
            WHERE status = 'active'
              AND natural_key IS NOT NULL
            GROUP BY natural_key
            HAVING count(*) > 1
          ) duplicate_keys
        `
      ),
      pool.query(
        `
          SELECT count(*)::int AS secondary_source_facts
          FROM intelligence_synthesis_facts fact
          WHERE fact.status = 'active'
            AND EXISTS (
              SELECT 1
              FROM unnest(fact.source_ids) source_id
              WHERE source_id <> fact.source_id
            )
        `
      ),
      pool.query(
        `
          SELECT *
          FROM intelligence_synthesis_fact_runs
          ORDER BY created_at DESC
          LIMIT 1
        `
      ),
      pool.query(
        `
          SELECT *
          FROM intelligence_synthesis_fact_runs
          WHERE run_type = 'source_fact_proof'
            AND status = 'succeeded'
          ORDER BY created_at DESC
          LIMIT 1
        `
      ),
      pool.query(
        `
          SELECT *
          FROM intelligence_synthesis_facts
          WHERE status = 'active'
          ORDER BY updated_at DESC, fact_type ASC
          LIMIT $1
        `,
        [limit]
      ),
    ])

    return {
      totalActiveFacts: Number(summary.rows[0]?.total_active_facts || 0),
      factsWithEvidence: Number(summary.rows[0]?.facts_with_evidence || 0),
      distinctSources: Number(summary.rows[0]?.distinct_sources || 0),
      activeFactsWithoutNaturalKey: Number(summary.rows[0]?.active_facts_without_natural_key || 0),
      duplicateActiveNaturalKeys: Number(naturalKeys.rows[0]?.duplicate_natural_keys || 0),
      secondarySourceFacts: Number(sourceOverlap.rows[0]?.secondary_source_facts || 0),
      factsByType: types.rows.map(row => ({
        factType: row.fact_type,
        total: Number(row.total || 0),
      })),
      factsBySource: sources.rows.map(row => ({
        sourceId: row.source_id,
        total: Number(row.total || 0),
      })),
      latestFactRun: latestRun.rows[0] ? mapRunRow(latestRun.rows[0]) : null,
      latestSourceFactProofRun: latestSourceFactProofRun.rows[0] ? mapRunRow(latestSourceFactProofRun.rows[0]) : null,
      recentFacts: recentFacts.rows.map(mapFactRow),
    }
  }

  return {
    collectSourceBackedSynthesisFacts,
    upsertSynthesisFactsBundle,
    querySynthesisFacts,
    getSynthesisFactsSnapshot,
  }
}
