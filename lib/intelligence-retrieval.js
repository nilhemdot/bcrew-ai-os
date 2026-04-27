import { createHash, randomUUID } from 'node:crypto'

export const intelligenceRetrievalSchemaSql = `
  CREATE EXTENSION IF NOT EXISTS vector;

  CREATE TABLE IF NOT EXISTS intelligence_retrieval_runs (
    run_id TEXT PRIMARY KEY,
    run_type TEXT NOT NULL
      CHECK (run_type IN ('candidate_promotion', 'lexical_proof', 'semantic_embedding', 'semantic_proof', 'hybrid_proof', 'retrieval_eval')),
    status TEXT NOT NULL
      CHECK (status IN ('succeeded', 'failed')),
    requested_by TEXT NOT NULL DEFAULT 'system',
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    candidates_read INTEGER NOT NULL DEFAULT 0,
    atoms_promoted INTEGER NOT NULL DEFAULT 0,
    chunks_upserted INTEGER NOT NULL DEFAULT 0,
    search_query TEXT,
    search_result_count INTEGER NOT NULL DEFAULT 0,
    max_tier INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_retrieval_runs_lookup
  ON intelligence_retrieval_runs(run_type, status, created_at DESC);

  CREATE TABLE IF NOT EXISTS intelligence_retrieval_chunks (
    chunk_id TEXT PRIMARY KEY,
    chunk_type TEXT NOT NULL DEFAULT 'candidate_atom'
      CHECK (chunk_type IN ('candidate_atom', 'artifact_excerpt', 'report_excerpt', 'proof')),
    source_id TEXT NOT NULL,
    artifact_id TEXT REFERENCES shared_communication_artifacts(artifact_id) ON DELETE CASCADE,
    candidate_key TEXT REFERENCES shared_communication_candidates(candidate_key) ON DELETE SET NULL,
    atom_id TEXT REFERENCES intelligence_atoms(atom_id) ON DELETE SET NULL,
    report_artifact_id TEXT REFERENCES intelligence_report_artifacts(report_artifact_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    body_hash TEXT NOT NULL,
    search_vector TSVECTOR NOT NULL,
    embedding vector(1536),
    embedding_model TEXT,
    embedding_dimensions INTEGER,
    embedding_input_hash TEXT,
    embedded_at TIMESTAMPTZ,
    embedding_llm_call_id TEXT,
    anchor_type TEXT,
    anchor_value TEXT,
    source_url TEXT,
    sensitivity TEXT NOT NULL DEFAULT 'neutral',
    min_tier INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_retrieval_chunks_search
  ON intelligence_retrieval_chunks USING GIN(search_vector);

  CREATE INDEX IF NOT EXISTS idx_intelligence_retrieval_chunks_source
  ON intelligence_retrieval_chunks(source_id, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_retrieval_chunks_atom
  ON intelligence_retrieval_chunks(atom_id, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_retrieval_chunks_candidate
  ON intelligence_retrieval_chunks(candidate_key, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_retrieval_chunks_tier
  ON intelligence_retrieval_chunks(min_tier, status, updated_at DESC);

  ALTER TABLE intelligence_retrieval_runs
  DROP CONSTRAINT IF EXISTS intelligence_retrieval_runs_run_type_check;

  ALTER TABLE intelligence_retrieval_runs
  ADD CONSTRAINT intelligence_retrieval_runs_run_type_check
  CHECK (run_type IN ('candidate_promotion', 'lexical_proof', 'semantic_embedding', 'semantic_proof', 'hybrid_proof', 'retrieval_eval'));

  ALTER TABLE intelligence_retrieval_chunks
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

  ALTER TABLE intelligence_retrieval_chunks
  ADD COLUMN IF NOT EXISTS embedding_model TEXT;

  ALTER TABLE intelligence_retrieval_chunks
  ADD COLUMN IF NOT EXISTS embedding_dimensions INTEGER;

  ALTER TABLE intelligence_retrieval_chunks
  ADD COLUMN IF NOT EXISTS embedding_input_hash TEXT;

  ALTER TABLE intelligence_retrieval_chunks
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

  ALTER TABLE intelligence_retrieval_chunks
  ADD COLUMN IF NOT EXISTS embedding_llm_call_id TEXT;

  CREATE INDEX IF NOT EXISTS idx_intelligence_retrieval_chunks_embedding_hnsw
  ON intelligence_retrieval_chunks USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL AND status = 'active';
`

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

function vectorSqlLiteral(embedding, dimensions = 1536) {
  if (!Array.isArray(embedding)) throw new Error('Embedding vector must be an array.')
  if (embedding.length !== Number(dimensions)) {
    throw new Error(`Embedding vector must contain ${dimensions} dimensions; received ${embedding.length}.`)
  }
  const values = embedding.map(value => {
    const number = Number(value)
    if (!Number.isFinite(number)) throw new Error('Embedding vector contains a non-finite value.')
    return Number(number.toFixed(8))
  })
  return `[${values.join(',')}]`
}

export function buildRetrievalEmbeddingInput(chunk = {}) {
  return [
    chunk.title || '',
    chunk.body || '',
  ].filter(Boolean).join('\n\n').slice(0, 24000)
}

export function hashRetrievalEmbeddingInput(text) {
  return stableHash(String(text || '').trim())
}

function clampLimit(value, fallback = 10, max = 100) {
  return Math.min(max, Math.max(1, Number(value) || fallback))
}

function normalizeMaxTier(value) {
  const maxTier = Number(value)
  if (!Number.isFinite(maxTier) || maxTier < 1) {
    throw new Error('intelligence retrieval queries require maxTier >= 1.')
  }
  return Math.floor(maxTier)
}

function coerceMinTier(value, fallback = 1) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

function minTierFromSensitivity(sensitivity, currentTier = 1) {
  const normalized = String(sensitivity || 'neutral').trim()
  if (['termination_risk', 'comp_discussion', 'undisclosed_feedback'].includes(normalized)) {
    return Math.max(currentTier, 3)
  }
  if (normalized === 'performance_concern') return Math.max(currentTier, 2)
  return currentTier
}

function normalizeSensitivity(value) {
  return String(value || 'neutral').trim() || 'neutral'
}

function normalizeStatusList(value) {
  const statuses = normalizeTextArray(value)
  return statuses.length ? statuses : ['pending', 'approved']
}

function normalizeChunkStatus(value) {
  const normalized = String(value || 'active').trim()
  if (!['active', 'archived'].includes(normalized)) {
    throw new Error(`Invalid retrieval chunk status: ${normalized}`)
  }
  return normalized
}

function normalizeChunkType(value) {
  const normalized = String(value || 'candidate_atom').trim()
  if (!['candidate_atom', 'artifact_excerpt', 'report_excerpt', 'proof'].includes(normalized)) {
    throw new Error(`Invalid retrieval chunk type: ${normalized}`)
  }
  return normalized
}

function normalizeRunType(value) {
  const normalized = String(value || 'candidate_promotion').trim()
  if (!['candidate_promotion', 'lexical_proof', 'semantic_embedding', 'semantic_proof', 'hybrid_proof', 'retrieval_eval'].includes(normalized)) {
    throw new Error(`Invalid retrieval run type: ${normalized}`)
  }
  return normalized
}

function normalizeRunStatus(value) {
  const normalized = String(value || 'succeeded').trim()
  if (!['succeeded', 'failed'].includes(normalized)) {
    throw new Error(`Invalid retrieval run status: ${normalized}`)
  }
  return normalized
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  return {}
}

function mapRetrievalRunRow(row) {
  return {
    runId: row.run_id ?? row.runId,
    runType: row.run_type ?? row.runType,
    status: row.status,
    requestedBy: row.requested_by ?? row.requestedBy,
    sourceIds: Array.isArray(row.source_ids) ? row.source_ids : [],
    candidatesRead: Number(row.candidates_read ?? row.candidatesRead ?? 0),
    atomsPromoted: Number(row.atoms_promoted ?? row.atomsPromoted ?? 0),
    chunksUpserted: Number(row.chunks_upserted ?? row.chunksUpserted ?? 0),
    searchQuery: row.search_query ?? row.searchQuery ?? null,
    searchResultCount: Number(row.search_result_count ?? row.searchResultCount ?? 0),
    maxTier: Number(row.max_tier ?? row.maxTier ?? 1),
    metadata: row.metadata || {},
    startedAt: row.started_at?.toISOString?.() || row.started_at || row.startedAt || null,
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || row.finishedAt || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || row.createdAt || null,
  }
}

function mapRetrievalChunkRow(row) {
  return {
    chunkId: row.chunk_id ?? row.chunkId,
    chunkType: row.chunk_type ?? row.chunkType,
    sourceId: row.source_id ?? row.sourceId,
    artifactId: row.artifact_id ?? row.artifactId ?? null,
    candidateKey: row.candidate_key ?? row.candidateKey ?? null,
    atomId: row.atom_id ?? row.atomId ?? null,
    reportArtifactId: row.report_artifact_id ?? row.reportArtifactId ?? null,
    title: row.title || '',
    body: row.body || '',
    bodyHash: row.body_hash ?? row.bodyHash,
    embeddingModel: row.embedding_model ?? row.embeddingModel ?? null,
    embeddingDimensions: row.embedding_dimensions == null && row.embeddingDimensions == null
      ? null
      : Number(row.embedding_dimensions ?? row.embeddingDimensions),
    embeddingInputHash: row.embedding_input_hash ?? row.embeddingInputHash ?? null,
    embeddedAt: row.embedded_at?.toISOString?.() || row.embedded_at || row.embeddedAt || null,
    embeddingLlmCallId: row.embedding_llm_call_id ?? row.embeddingLlmCallId ?? null,
    anchorType: row.anchor_type ?? row.anchorType ?? null,
    anchorValue: row.anchor_value ?? row.anchorValue ?? null,
    sourceUrl: row.source_url ?? row.sourceUrl ?? null,
    sensitivity: row.sensitivity || 'neutral',
    minTier: Number(row.min_tier ?? row.minTier ?? 1),
    status: row.status || 'active',
    rank: row.rank == null ? null : Number(row.rank),
    matchedBy: row.matched_by ?? row.matchedBy ?? null,
    excerpt: row.excerpt || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || row.createdAt || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || row.updatedAt || null,
  }
}

function mapCandidateRow(row) {
  const candidateMetadata = parseJsonObject(row.candidate_metadata)
  const artifactMetadata = parseJsonObject(row.artifact_metadata)
  return {
    candidateKey: row.candidate_key,
    artifactId: row.artifact_id,
    sourceId: row.source_id,
    candidateType: row.candidate_type,
    status: row.status,
    title: row.title || '',
    summary: row.summary || '',
    ownerHint: row.owner_hint || '',
    evidenceExcerpt: row.evidence_excerpt || '',
    confidence: row.confidence == null ? null : Number(row.confidence),
    candidateMetadata,
    artifactType: row.artifact_type || '',
    artifactTitle: row.artifact_title || '',
    artifactContent: row.artifact_content || '',
    artifactExternalId: row.artifact_external_id || '',
    artifactSourceUrl: row.artifact_source_url || '',
    artifactUpdatedAt: row.artifact_updated_at?.toISOString?.() || row.artifact_updated_at || null,
    artifactMetadata,
  }
}

function candidateTypeToAtomType(candidateType) {
  switch (candidateType) {
    case 'task_candidate':
      return 'action_candidate'
    case 'decision_candidate':
      return 'decision'
    case 'blocker':
      return 'risk'
    case 'feedback_signal':
      return 'pattern'
    case 'atom_candidate':
      return 'observation'
    default:
      return 'observation'
  }
}

function candidateTypeToHitType(candidateType) {
  if (candidateType === 'feedback_signal') return 'repeat_signal'
  if (candidateType === 'blocker') return 'supporting_evidence'
  return 'supporting_evidence'
}

function candidatePillar(candidate) {
  const links = parseJsonObject(candidate.candidateMetadata.links)
  return String(links.pillar || candidate.candidateMetadata.pillar || '').trim() || null
}

function candidateMinTier(candidate) {
  const metadataTier = coerceMinTier(candidate.candidateMetadata.minTier ?? candidate.candidateMetadata.min_tier, 1)
  return minTierFromSensitivity(candidateSensitivity(candidate), metadataTier)
}

function candidateSensitivity(candidate) {
  return normalizeSensitivity(candidate.candidateMetadata.sensitivity || candidate.candidateMetadata.sensitivityClass)
}

function candidateSubjectPeople(candidate) {
  const value = candidate.candidateMetadata.subjectPeople || candidate.candidateMetadata.subject_people
  return Array.isArray(value) ? value : []
}

function candidateTopicRefs(candidate) {
  const links = parseJsonObject(candidate.candidateMetadata.links)
  return uniqueText([
    candidate.candidateType,
    candidate.artifactType,
    candidatePillar(candidate),
    ...(Array.isArray(links.related_backlog_ids) ? links.related_backlog_ids : []),
    ...(Array.isArray(links.related_decision_ids) ? links.related_decision_ids : []),
  ])
}

function candidateMetricRefs(candidate) {
  const links = parseJsonObject(candidate.candidateMetadata.links)
  return uniqueText([
    'RETRIEVAL-001',
    ...(Array.isArray(links.related_backlog_ids) ? links.related_backlog_ids : []),
  ])
}

function buildCandidateBody(candidate) {
  return [
    candidate.title,
    candidate.summary,
    candidate.evidenceExcerpt,
    candidate.artifactTitle ? `Artifact: ${candidate.artifactTitle}` : '',
    candidate.artifactContent ? `Artifact excerpt: ${candidate.artifactContent.slice(0, 1600)}` : '',
  ].filter(Boolean).join('\n\n').slice(0, 5000)
}

function buildCandidateClaim(candidate) {
  return (candidate.summary || candidate.title || candidate.evidenceExcerpt || '').slice(0, 1200)
}

function buildProofQueryFromChunk(chunk) {
  const text = `${chunk.title || ''} ${chunk.body || ''}`
  const words = String(text)
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length >= 4)
    .filter(word => /\p{L}/u.test(word))
    .filter(word => !['from', 'with', 'that', 'this', 'will', 'should', 'candidate', 'artifact'].includes(word.toLowerCase()))
  return words.slice(0, 2).join(' ') || 'foundation'
}

function rrfScore(position, k = 60) {
  return 1 / (k + position + 1)
}

function excerptFromText(text, limit = 520) {
  const normalized = String(text || '').trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit)}...`
}

function evidenceKeyForAtomId(atomId) {
  const normalized = String(atomId || '').trim()
  if (!normalized) return null
  return normalized.startsWith('atom:') ? normalized : `atom:${normalized}`
}

export function createIntelligenceRetrievalStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getRegisteredSourceIds,
  upsertIntelligenceReportArtifact,
  upsertIntelligenceAtom,
  recordIntelligenceAtomHit,
  queryIntelligenceAtomsForScoper,
}) {
  function assertRegisteredSourceIds(sourceIds, fieldName = 'sourceId') {
    const normalized = normalizeTextArray(sourceIds)
    if (!normalized.length) return normalized
    const registered = new Set(normalizeTextArray(getRegisteredSourceIds?.() || []))
    const missing = normalized.filter(sourceId => !registered.has(sourceId))
    if (missing.length) {
      throw new Error(`${fieldName} contains unregistered source contract IDs: ${missing.join(', ')}`)
    }
    return normalized
  }

  async function recordRetrievalRun(input = {}, actor = 'system') {
    const runId = String(input.runId || input.run_id || '').trim()
    if (!runId) throw new Error('runId is required for intelligence retrieval runs.')
    const runType = normalizeRunType(input.runType || input.run_type)
    const status = normalizeRunStatus(input.status)
    const sourceIds = assertRegisteredSourceIds(input.sourceIds || input.source_ids, 'sourceIds')
    const maxTier = normalizeMaxTier(input.maxTier ?? input.max_tier ?? 1)

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          INSERT INTO intelligence_retrieval_runs (
            run_id, run_type, status, requested_by, source_ids,
            candidates_read, atoms_promoted, chunks_upserted,
            search_query, search_result_count, max_tier, metadata,
            started_at, finished_at
          )
          VALUES ($1,$2,$3,$4,$5::text[],$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)
          ON CONFLICT (run_id) DO UPDATE
          SET run_type = EXCLUDED.run_type,
              status = EXCLUDED.status,
              requested_by = EXCLUDED.requested_by,
              source_ids = EXCLUDED.source_ids,
              candidates_read = EXCLUDED.candidates_read,
              atoms_promoted = EXCLUDED.atoms_promoted,
              chunks_upserted = EXCLUDED.chunks_upserted,
              search_query = EXCLUDED.search_query,
              search_result_count = EXCLUDED.search_result_count,
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
          Number(input.candidatesRead ?? input.candidates_read ?? 0),
          Number(input.atomsPromoted ?? input.atoms_promoted ?? 0),
          Number(input.chunksUpserted ?? input.chunks_upserted ?? 0),
          input.searchQuery || input.search_query || null,
          Number(input.searchResultCount ?? input.search_result_count ?? 0),
          maxTier,
          JSON.stringify({
            ...(input.metadata || {}),
            recordedBy: actor,
          }),
          input.startedAt || input.started_at || new Date().toISOString(),
          input.finishedAt || input.finished_at || new Date().toISOString(),
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'intelligence_retrieval_run_recorded',
        entityTable: 'intelligence_retrieval_runs',
        entityId: runId,
        actor,
        summary: `Recorded intelligence retrieval ${runType} run ${runId}`,
        metadata: {
          runType,
          status,
          sourceIds,
        },
      })

      return mapRetrievalRunRow(result.rows[0])
    })
  }

  async function upsertRetrievalChunk(input = {}, actor = 'system') {
    const sourceId = String(input.sourceId || input.source_id || '').trim()
    if (!sourceId) throw new Error('sourceId is required for intelligence retrieval chunks.')
    assertRegisteredSourceIds([sourceId], 'sourceId')

    const title = String(input.title || '').trim() || 'Untitled retrieval chunk'
    const body = String(input.body || '').trim() || title
    const bodyHash = String(input.bodyHash || input.body_hash || stableHash([title, body].join('\n'))).trim()
    const chunkId = String(input.chunkId || input.chunk_id || stableId('retrieval-chunk', `${sourceId}:${bodyHash}`)).trim()
    const chunkType = normalizeChunkType(input.chunkType || input.chunk_type)
    const status = normalizeChunkStatus(input.status)
    const minTier = coerceMinTier(input.minTier ?? input.min_tier, 1)

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          INSERT INTO intelligence_retrieval_chunks (
            chunk_id, chunk_type, source_id, artifact_id, candidate_key, atom_id,
            report_artifact_id, title, body, body_hash, search_vector,
            anchor_type, anchor_value, source_url, sensitivity, min_tier,
            status, metadata
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,
            $7,$8,$9,$10,
            setweight(to_tsvector('english', COALESCE($8, '')), 'A')
              || setweight(to_tsvector('english', COALESCE($9, '')), 'B'),
            $11,$12,$13,$14,$15,$16,$17::jsonb
          )
          ON CONFLICT (chunk_id) DO UPDATE
          SET chunk_type = EXCLUDED.chunk_type,
              source_id = EXCLUDED.source_id,
              artifact_id = EXCLUDED.artifact_id,
              candidate_key = EXCLUDED.candidate_key,
              atom_id = EXCLUDED.atom_id,
              report_artifact_id = EXCLUDED.report_artifact_id,
              title = EXCLUDED.title,
              body = EXCLUDED.body,
              body_hash = EXCLUDED.body_hash,
              search_vector = EXCLUDED.search_vector,
              anchor_type = EXCLUDED.anchor_type,
              anchor_value = EXCLUDED.anchor_value,
              source_url = EXCLUDED.source_url,
              sensitivity = EXCLUDED.sensitivity,
              min_tier = EXCLUDED.min_tier,
              status = EXCLUDED.status,
              metadata = EXCLUDED.metadata,
              updated_at = NOW()
          RETURNING *
        `,
        [
          chunkId,
          chunkType,
          sourceId,
          input.artifactId || input.artifact_id || null,
          input.candidateKey || input.candidate_key || null,
          input.atomId || input.atom_id || null,
          input.reportArtifactId || input.report_artifact_id || null,
          title,
          body,
          bodyHash,
          input.anchorType || input.anchor_type || null,
          input.anchorValue || input.anchor_value || null,
          input.sourceUrl || input.source_url || null,
          normalizeSensitivity(input.sensitivity),
          minTier,
          status,
          JSON.stringify({
            ...(input.metadata || {}),
            recordedBy: actor,
          }),
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'intelligence_retrieval_chunk_upserted',
        entityTable: 'intelligence_retrieval_chunks',
        entityId: chunkId,
        actor,
        summary: `Upserted intelligence retrieval chunk ${chunkId}`,
        metadata: {
          sourceId,
          chunkType,
          atomId: input.atomId || input.atom_id || null,
          candidateKey: input.candidateKey || input.candidate_key || null,
        },
      })

      return mapRetrievalChunkRow(result.rows[0])
    })
  }

  async function selectSharedCommunicationCandidatesForPromotion(options = {}) {
    const maxTier = normalizeMaxTier(options.maxTier ?? options.max_tier)
    const limit = clampLimit(options.limit, 10, 50)
    const statuses = normalizeStatusList(options.statuses || options.status)
    const sourceIds = assertRegisteredSourceIds(options.sourceIds || options.source_ids || [], 'sourceIds')

    const values = [statuses, maxTier]
    const filters = [
      'c.status = ANY($1::text[])',
      `
        CASE
          WHEN COALESCE(c.metadata->>'minTier', '') ~ '^[0-9]+$'
          THEN (c.metadata->>'minTier')::int
          ELSE 1
        END <= $2
      `,
      `
        NOT EXISTS (
          SELECT 1
          FROM intelligence_retrieval_chunks chunk
          WHERE chunk.candidate_key = c.candidate_key
            AND chunk.status = 'active'
            AND chunk.atom_id IS NOT NULL
        )
      `,
    ]

    if (sourceIds.length) {
      values.push(sourceIds)
      filters.push(`c.source_id = ANY($${values.length}::text[])`)
    }

    values.push(limit)
    const result = await pool.query(
      `
        SELECT c.candidate_key, c.artifact_id, c.source_id, c.candidate_type,
               c.status, c.title, c.summary, c.owner_hint, c.evidence_excerpt,
               c.confidence, c.metadata AS candidate_metadata,
               artifact.artifact_type, artifact.title AS artifact_title,
               artifact.content_text AS artifact_content,
               artifact.external_id AS artifact_external_id,
               artifact.source_url AS artifact_source_url,
               artifact.artifact_updated_at,
               artifact.metadata AS artifact_metadata
        FROM shared_communication_candidates c
        JOIN shared_communication_artifacts artifact
          ON artifact.artifact_id = c.artifact_id
        WHERE ${filters.join(' AND ')}
        ORDER BY
          CASE c.candidate_type
            WHEN 'atom_candidate' THEN 0
            WHEN 'decision_candidate' THEN 1
            WHEN 'blocker' THEN 2
            WHEN 'feedback_signal' THEN 3
            WHEN 'task_candidate' THEN 4
            ELSE 5
          END,
          c.updated_at DESC,
          c.created_at DESC
        LIMIT $${values.length}
      `,
      values
    )

    return result.rows.map(mapCandidateRow)
  }

  async function promoteSharedCommunicationCandidatesToAtoms(options = {}, actor = 'system') {
    const startedAt = new Date().toISOString()
    const maxTier = normalizeMaxTier(options.maxTier ?? options.max_tier)
    const limit = clampLimit(options.limit, 10, 50)
    const candidates = await selectSharedCommunicationCandidatesForPromotion({
      ...options,
      maxTier,
      limit,
    })

    const runId = String(options.runId || options.run_id || `retrieval-candidate-promotion-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`).trim()
    const reportArtifactId = String(options.reportArtifactId || options.report_artifact_id || 'report-artifact:retrieval-001-real-candidate-promotion').trim()
    const sourceIds = uniqueText(candidates.map(candidate => candidate.sourceId))
    const inputCandidateKeys = candidates.map(candidate => candidate.candidateKey)
    const inputArtifactIds = uniqueText(candidates.map(candidate => candidate.artifactId))

    await upsertIntelligenceReportArtifact({
      reportArtifactId,
      reportType: 'department_brief',
      scopeKey: 'foundation:retrieval-001',
      department: 'foundation',
      title: 'RETRIEVAL-001 real shared-communications candidate promotion',
      status: 'reviewed',
      sourceIds,
      inputArtifactIds,
      inputCandidateKeys,
      sourceCoverage: sourceIds.map(sourceId => ({
        sourceId,
        candidatesRead: candidates.filter(candidate => candidate.sourceId === sourceId).length,
      })),
      topFindings: candidates.slice(0, 10).map(candidate => ({
        candidateKey: candidate.candidateKey,
        title: candidate.title,
        sourceId: candidate.sourceId,
      })),
      actionRequiredItems: [
        {
          backlogCardId: 'RETRIEVAL-002',
          action: 'Build semantic retrieval only after lexical retrieval is proven over real atom chunks.',
        },
      ],
      structuredOutputJson: {
        contract: 'retrieval_real_corpus_promotion',
        promotedFrom: 'shared_communication_candidates',
        chunkTable: 'intelligence_retrieval_chunks',
      },
      metadata: {
        backlogCardId: 'RETRIEVAL-001',
        proofCommand: 'npm run intelligence:retrieval-proof',
        maxTier,
        limit,
      },
    }, actor)

    const promoted = []
    for (const candidate of candidates) {
      const sensitivity = candidateSensitivity(candidate)
      const minTier = candidateMinTier(candidate)
      const body = buildCandidateBody(candidate)
      const atomId = stableId('atom:shared-candidate', candidate.candidateKey)
      const chunkId = stableId('chunk:shared-candidate', candidate.candidateKey)
      const atom = await upsertIntelligenceAtom({
        atomId,
        title: candidate.title,
        content: body,
        atomType: candidateTypeToAtomType(candidate.candidateType),
        sourceId: candidate.sourceId,
        artifactId: candidate.artifactId,
        candidateKey: candidate.candidateKey,
        reportArtifactId,
        modality: candidate.artifactType === 'video_transcript' ? 'video' : 'text',
        anchorType: candidate.artifactType || 'shared_communication_artifact',
        anchorValue: candidate.artifactExternalId || candidate.artifactId,
        evidenceExcerpt: candidate.evidenceExcerpt || candidate.summary,
        derivedClaim: buildCandidateClaim(candidate),
        metricRefs: candidateMetricRefs(candidate),
        topicRefs: candidateTopicRefs(candidate),
        department: candidatePillar(candidate) || 'foundation',
        pillar: candidatePillar(candidate),
        valueRoute: candidate.candidateMetadata.valueRoute || candidate.candidateMetadata.value_route || 'shared_comms_intelligence',
        contentUseClass: candidate.candidateMetadata.contentUseClass || candidate.candidateMetadata.content_use_class || 'internal_operating_intelligence',
        qualityScore: Math.round(Number(candidate.confidence || 0.75) * 5),
        relevanceScore: Math.round(Number(candidate.confidence || 0.75) * 5),
        sourceConfidence: candidate.confidence ?? null,
        extractionConfidence: candidate.confidence ?? null,
        sensitivity,
        minTier,
        subjectPeople: candidateSubjectPeople(candidate),
        freshness: 'trending',
        status: 'detected',
        suggestedOwner: candidate.ownerHint || null,
        suggestedAction: candidate.candidateType === 'task_candidate' ? candidate.summary : null,
        tags: ['RETRIEVAL-001', 'shared-comms-candidate', candidate.candidateType],
        dedupHash: `shared-candidate:${stableHash(candidate.candidateKey)}`,
        metadata: {
          backlogCardId: 'RETRIEVAL-001',
          promotedFromCandidate: true,
          candidateKey: candidate.candidateKey,
          artifactType: candidate.artifactType,
          artifactTitle: candidate.artifactTitle,
          sourceUrl: candidate.artifactSourceUrl,
          candidateMetadata: candidate.candidateMetadata,
          proofCommand: 'npm run intelligence:retrieval-proof',
        },
      }, actor)

      const hit = await recordIntelligenceAtomHit({
        hitId: stableId('atom-hit:retrieval-001', candidate.candidateKey),
        atomId: atom.atomId,
        sourceId: candidate.sourceId,
        artifactId: candidate.artifactId,
        candidateKey: candidate.candidateKey,
        reportArtifactId,
        hitType: candidateTypeToHitType(candidate.candidateType),
        evidenceExcerpt: candidate.evidenceExcerpt || candidate.summary,
        anchorType: candidate.artifactType || 'shared_communication_artifact',
        anchorValue: candidate.artifactExternalId || candidate.artifactId,
        confidence: candidate.confidence ?? null,
        occurredAt: candidate.artifactUpdatedAt || new Date().toISOString(),
        metadata: {
          backlogCardId: 'RETRIEVAL-001',
          promotedFromCandidate: true,
        },
      }, actor)

      const chunk = await upsertRetrievalChunk({
        chunkId,
        chunkType: 'candidate_atom',
        sourceId: candidate.sourceId,
        artifactId: candidate.artifactId,
        candidateKey: candidate.candidateKey,
        atomId: atom.atomId,
        reportArtifactId,
        title: candidate.title,
        body,
        anchorType: candidate.artifactType || 'shared_communication_artifact',
        anchorValue: candidate.artifactExternalId || candidate.artifactId,
        sourceUrl: candidate.artifactSourceUrl || null,
        sensitivity,
        minTier,
        status: 'active',
        metadata: {
          backlogCardId: 'RETRIEVAL-001',
          promotedFromCandidate: true,
          candidateType: candidate.candidateType,
          artifactTitle: candidate.artifactTitle,
          hitId: hit.hitId,
        },
      }, actor)

      promoted.push({ candidate, atom, hit, chunk })
    }

    const run = await recordRetrievalRun({
      runId,
      runType: 'candidate_promotion',
      status: 'succeeded',
      requestedBy: actor,
      sourceIds,
      candidatesRead: candidates.length,
      atomsPromoted: promoted.length,
      chunksUpserted: promoted.length,
      maxTier,
      metadata: {
        backlogCardId: 'RETRIEVAL-001',
        reportArtifactId,
        inputCandidateKeys,
        inputArtifactIds,
        proofCommand: 'npm run intelligence:retrieval-proof',
      },
      startedAt,
      finishedAt: new Date().toISOString(),
    }, actor)

    return {
      run,
      reportArtifactId,
      candidatesRead: candidates.length,
      atomsPromoted: promoted.length,
      chunksUpserted: promoted.length,
      promoted: promoted.map(item => ({
        candidateKey: item.candidate.candidateKey,
        atomId: item.atom.atomId,
        chunkId: item.chunk.chunkId,
        sourceId: item.candidate.sourceId,
        minTier: item.chunk.minTier,
        title: item.chunk.title,
      })),
    }
  }

  async function selectRetrievalChunksForEmbedding(options = {}) {
    const maxTier = normalizeMaxTier(options.maxTier ?? options.max_tier)
    const limit = clampLimit(options.limit, 20, 100)
    const model = String(options.embeddingModel || options.embedding_model || 'text-embedding-3-large').trim()
    const dimensions = Number(options.embeddingDimensions ?? options.embedding_dimensions ?? 1536)
    if (dimensions !== 1536) throw new Error('RETRIEVAL-002 stores 1536-dimension embeddings.')

    const values = [maxTier]
    const clauses = [
      "chunk.status = 'active'",
      'chunk.min_tier <= $1',
    ]

    function addAny(column, inputValues) {
      const normalized = normalizeTextArray(inputValues)
      if (!normalized.length) return
      values.push(normalized)
      clauses.push(`${column} = ANY($${values.length}::text[])`)
    }

    addAny('chunk.source_id', options.sourceIds || options.source_ids)
    addAny('chunk.candidate_key', options.candidateKeys || options.candidate_keys)
    addAny('chunk.atom_id', options.atomIds || options.atom_ids)

    values.push(limit * 5)
    const result = await pool.query(
      `
        SELECT *
        FROM intelligence_retrieval_chunks chunk
        WHERE ${clauses.join(' AND ')}
        ORDER BY
          CASE WHEN chunk.embedding IS NULL THEN 0 ELSE 1 END,
          chunk.embedded_at ASC NULLS FIRST,
          chunk.updated_at DESC
        LIMIT $${values.length}
      `,
      values
    )

    return result.rows
      .map(mapRetrievalChunkRow)
      .filter(chunk => {
        const inputText = buildRetrievalEmbeddingInput(chunk)
        const inputHash = hashRetrievalEmbeddingInput(inputText)
        return chunk.embeddingInputHash !== inputHash ||
          chunk.embeddingModel !== model ||
          chunk.embeddingDimensions !== dimensions
      })
      .slice(0, limit)
  }

  async function upsertRetrievalChunkEmbedding(input = {}, actor = 'system') {
    const chunkId = String(input.chunkId || input.chunk_id || '').trim()
    if (!chunkId) throw new Error('chunkId is required for retrieval chunk embeddings.')
    const dimensions = Number(input.embeddingDimensions ?? input.embedding_dimensions ?? 1536)
    if (dimensions !== 1536) throw new Error('RETRIEVAL-002 stores 1536-dimension embeddings.')
    const embedding = vectorSqlLiteral(input.embedding, dimensions)
    const embeddingModel = String(input.embeddingModel || input.embedding_model || 'text-embedding-3-large').trim()
    const embeddingInputHash = String(input.embeddingInputHash || input.embedding_input_hash || '').trim()
    if (!embeddingModel) throw new Error('embeddingModel is required for retrieval chunk embeddings.')
    if (!embeddingInputHash) throw new Error('embeddingInputHash is required for retrieval chunk embeddings.')

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          UPDATE intelligence_retrieval_chunks
          SET embedding = $2::vector(1536),
              embedding_model = $3,
              embedding_dimensions = $4,
              embedding_input_hash = $5,
              embedded_at = COALESCE($6, NOW()),
              embedding_llm_call_id = $7,
              updated_at = NOW()
          WHERE chunk_id = $1
          RETURNING *
        `,
        [
          chunkId,
          embedding,
          embeddingModel,
          dimensions,
          embeddingInputHash,
          input.embeddedAt || input.embedded_at || new Date().toISOString(),
          input.embeddingLlmCallId || input.embedding_llm_call_id || null,
        ]
      )

      if (!result.rows[0]) throw new Error(`Retrieval chunk not found: ${chunkId}`)

      await insertChangeEvent(client, {
        eventType: 'intelligence_retrieval_chunk_upserted',
        entityTable: 'intelligence_retrieval_chunks',
        entityId: chunkId,
        actor,
        summary: `Upserted semantic embedding for retrieval chunk ${chunkId}`,
        metadata: {
          backlogCardId: 'RETRIEVAL-002',
          embeddingModel,
          embeddingDimensions: dimensions,
          embeddingLlmCallId: input.embeddingLlmCallId || input.embedding_llm_call_id || null,
        },
      })

      return mapRetrievalChunkRow(result.rows[0])
    })
  }

  async function searchIntelligenceChunks(filters = {}) {
    const query = String(filters.query || '').trim()
    if (!query) throw new Error('query is required for intelligence retrieval search.')
    const maxTier = normalizeMaxTier(filters.maxTier ?? filters.max_tier)
    const limit = clampLimit(filters.limit, 10, 100)
    const values = [query, `%${query}%`, maxTier]
    const clauses = [
      'chunk.status = \'active\'',
      'chunk.min_tier <= $3',
      '(chunk.search_vector @@ plainto_tsquery(\'english\', $1) OR chunk.title ILIKE $2 OR chunk.body ILIKE $2)',
    ]

    function addAny(column, inputValues) {
      const normalized = normalizeTextArray(inputValues)
      if (!normalized.length) return
      values.push(normalized)
      clauses.push(`${column} = ANY($${values.length}::text[])`)
    }

    addAny('chunk.source_id', filters.sourceIds || filters.source_ids)
    addAny('chunk.artifact_id', filters.artifactIds || filters.artifact_ids)
    addAny('chunk.candidate_key', filters.candidateKeys || filters.candidate_keys)
    addAny('chunk.atom_id', filters.atomIds || filters.atom_ids)
    addAny('chunk.report_artifact_id', filters.reportArtifactIds || filters.report_artifact_ids)

    values.push(limit)
    const result = await pool.query(
      `
        SELECT chunk.*,
               ts_rank_cd(chunk.search_vector, plainto_tsquery('english', $1)) AS rank,
               CASE
                 WHEN chunk.search_vector @@ plainto_tsquery('english', $1) THEN 'full_text'
                 ELSE 'lexical_fallback'
               END AS matched_by,
               CASE
                 WHEN LENGTH(chunk.body) > 520 THEN LEFT(chunk.body, 520) || '...'
                 ELSE chunk.body
               END AS excerpt
        FROM intelligence_retrieval_chunks chunk
        WHERE ${clauses.join(' AND ')}
        ORDER BY
          CASE WHEN chunk.search_vector @@ plainto_tsquery('english', $1) THEN 0 ELSE 1 END,
          rank DESC NULLS LAST,
          chunk.updated_at DESC
        LIMIT $${values.length}
      `,
      values
    )

    return result.rows.map(mapRetrievalChunkRow)
  }

  async function searchIntelligenceChunksSemantic(filters = {}) {
    const queryEmbedding = filters.queryEmbedding || filters.query_embedding
    if (!queryEmbedding) throw new Error('queryEmbedding is required for semantic retrieval search.')
    const maxTier = normalizeMaxTier(filters.maxTier ?? filters.max_tier)
    const limit = clampLimit(filters.limit, 10, 100)
    const values = [vectorSqlLiteral(queryEmbedding, 1536), maxTier]
    const clauses = [
      "chunk.status = 'active'",
      'chunk.embedding IS NOT NULL',
      'chunk.min_tier <= $2',
    ]

    function addAny(column, inputValues) {
      const normalized = normalizeTextArray(inputValues)
      if (!normalized.length) return
      values.push(normalized)
      clauses.push(`${column} = ANY($${values.length}::text[])`)
    }

    addAny('chunk.source_id', filters.sourceIds || filters.source_ids)
    addAny('chunk.artifact_id', filters.artifactIds || filters.artifact_ids)
    addAny('chunk.candidate_key', filters.candidateKeys || filters.candidate_keys)
    addAny('chunk.atom_id', filters.atomIds || filters.atom_ids)
    addAny('chunk.report_artifact_id', filters.reportArtifactIds || filters.report_artifact_ids)

    values.push(limit)
    const result = await pool.query(
      `
        SELECT chunk.*,
               (1 - (chunk.embedding <=> $1::vector(1536))) AS rank,
               'semantic_vector' AS matched_by,
               CASE
                 WHEN LENGTH(chunk.body) > 520 THEN LEFT(chunk.body, 520) || '...'
                 ELSE chunk.body
               END AS excerpt
        FROM intelligence_retrieval_chunks chunk
        WHERE ${clauses.join(' AND ')}
        ORDER BY chunk.embedding <=> $1::vector(1536) ASC,
                 chunk.updated_at DESC
        LIMIT $${values.length}
      `,
      values
    )

    return result.rows.map(mapRetrievalChunkRow)
  }

  async function searchIntelligenceEvidenceHybrid(filters = {}) {
    const query = String(filters.query || '').trim()
    if (!query) throw new Error('query is required for hybrid evidence retrieval.')
    const queryEmbedding = filters.queryEmbedding || filters.query_embedding
    if (!queryEmbedding) throw new Error('queryEmbedding is required for hybrid evidence retrieval.')
    const maxTier = normalizeMaxTier(filters.maxTier ?? filters.max_tier)
    const limit = clampLimit(filters.limit, 10, 50)
    const laneLimit = clampLimit(filters.laneLimit || filters.lane_limit || limit * 3, Math.min(30, limit * 3), 100)
    const rrfK = Math.max(1, Number(filters.rrfK || filters.rrf_k || 60))

    const sharedFilters = {
      sourceIds: filters.sourceIds || filters.source_ids,
      artifactIds: filters.artifactIds || filters.artifact_ids,
      candidateKeys: filters.candidateKeys || filters.candidate_keys,
      atomIds: filters.atomIds || filters.atom_ids,
      reportArtifactIds: filters.reportArtifactIds || filters.report_artifact_ids,
      maxTier,
      limit: laneLimit,
    }

    const [lexicalResults, semanticResults] = await Promise.all([
      searchIntelligenceChunks({
        ...sharedFilters,
        query,
      }),
      searchIntelligenceChunksSemantic({
        ...sharedFilters,
        queryEmbedding,
      }),
    ])

    const linkedAtomIds = uniqueText([
      ...lexicalResults.map(chunk => chunk.atomId),
      ...semanticResults.map(chunk => chunk.atomId),
    ])
    const atomQueryFilters = {
      maxTier,
      limit: laneLimit,
      sourceIds: filters.sourceIds || filters.source_ids,
      artifactIds: filters.artifactIds || filters.artifact_ids,
      candidateKeys: filters.candidateKeys || filters.candidate_keys,
      reportArtifactIds: filters.reportArtifactIds || filters.report_artifact_ids,
      statuses: filters.atomStatuses || filters.atom_statuses,
      valueRoutes: filters.valueRoutes || filters.value_routes,
      metricRefs: filters.metricRefs || filters.metric_refs,
      topicRefs: filters.topicRefs || filters.topic_refs,
      personRefs: filters.personRefs || filters.person_refs,
      entityRefs: filters.entityRefs || filters.entity_refs,
    }
    const [queryAtomResults, linkedAtomResults] = queryIntelligenceAtomsForScoper
      ? await Promise.all([
          queryIntelligenceAtomsForScoper({
            ...atomQueryFilters,
            query,
          }),
          linkedAtomIds.length
            ? queryIntelligenceAtomsForScoper({
                ...atomQueryFilters,
                atomIds: linkedAtomIds,
                limit: Math.max(laneLimit, linkedAtomIds.length),
              })
            : [],
        ])
      : [[], []]
    const atomResults = Array.from(
      new Map([...queryAtomResults, ...linkedAtomResults].map(atom => [atom.atomId, atom])).values()
    )

    const evidenceByKey = new Map()

    function ensureEntry(key, base) {
      if (!evidenceByKey.has(key)) {
        evidenceByKey.set(key, {
          evidenceId: key,
          evidenceType: base.evidenceType,
          sourceId: base.sourceId || null,
          artifactId: base.artifactId || null,
          candidateKey: base.candidateKey || null,
          atomId: base.atomId || null,
          reportArtifactId: base.reportArtifactId || null,
          title: base.title || 'Untitled evidence',
          excerpt: base.excerpt || '',
          sourceUrl: base.sourceUrl || null,
          sensitivity: base.sensitivity || 'neutral',
          minTier: coerceMinTier(base.minTier, 1),
          score: 0,
          matchedBy: [],
          ranks: {},
          chunk: base.chunk || null,
          atom: base.atom || null,
          metadata: base.metadata || {},
        })
      }
      return evidenceByKey.get(key)
    }

    function addLane(entry, lane, position, rank = null) {
      entry.score += rrfScore(position, rrfK)
      if (!entry.matchedBy.includes(lane)) entry.matchedBy.push(lane)
      entry.ranks[lane] = {
        position: position + 1,
        rank,
      }
    }

    lexicalResults.forEach((chunk, index) => {
      const key = evidenceKeyForAtomId(chunk.atomId) || `chunk:${chunk.chunkId}`
      const entry = ensureEntry(key, {
        evidenceType: 'retrieval_chunk',
        sourceId: chunk.sourceId,
        artifactId: chunk.artifactId,
        candidateKey: chunk.candidateKey,
        atomId: chunk.atomId,
        reportArtifactId: chunk.reportArtifactId,
        title: chunk.title,
        excerpt: chunk.excerpt || excerptFromText(chunk.body),
        sourceUrl: chunk.sourceUrl,
        sensitivity: chunk.sensitivity,
        minTier: chunk.minTier,
        chunk,
        metadata: chunk.metadata,
      })
      entry.chunk = entry.chunk || chunk
      addLane(entry, 'lexical', index, chunk.rank)
    })

    semanticResults.forEach((chunk, index) => {
      const key = evidenceKeyForAtomId(chunk.atomId) || `chunk:${chunk.chunkId}`
      const entry = ensureEntry(key, {
        evidenceType: 'retrieval_chunk',
        sourceId: chunk.sourceId,
        artifactId: chunk.artifactId,
        candidateKey: chunk.candidateKey,
        atomId: chunk.atomId,
        reportArtifactId: chunk.reportArtifactId,
        title: chunk.title,
        excerpt: chunk.excerpt || excerptFromText(chunk.body),
        sourceUrl: chunk.sourceUrl,
        sensitivity: chunk.sensitivity,
        minTier: chunk.minTier,
        chunk,
        metadata: chunk.metadata,
      })
      entry.chunk = entry.chunk || chunk
      addLane(entry, 'semantic', index, chunk.rank)
    })

    atomResults.forEach((atom, index) => {
      const key = evidenceKeyForAtomId(atom.atomId)
      const entry = ensureEntry(key, {
        evidenceType: 'atom',
        sourceId: atom.sourceId,
        artifactId: atom.artifactId,
        candidateKey: atom.candidateKey,
        atomId: atom.atomId,
        reportArtifactId: atom.reportArtifactId,
        title: atom.title,
        excerpt: excerptFromText(atom.evidenceExcerpt || atom.derivedClaim || atom.content),
        sensitivity: atom.sensitivity,
        minTier: atom.minTier,
        atom,
        metadata: atom.metadata,
      })
      entry.atom = entry.atom || atom
      if (!entry.excerpt && atom.evidenceExcerpt) entry.excerpt = excerptFromText(atom.evidenceExcerpt)
      addLane(entry, 'atom', index, null)
    })

    const results = Array.from(evidenceByKey.values())
      .filter(entry => entry.minTier <= maxTier)
      .sort((a, b) => b.score - a.score || b.matchedBy.length - a.matchedBy.length || a.title.localeCompare(b.title))
      .slice(0, limit)

    return {
      generatedAt: new Date().toISOString(),
      query,
      maxTier,
      limit,
      laneCounts: {
        lexical: lexicalResults.length,
        semantic: semanticResults.length,
        atom: atomResults.length,
      },
      resultCount: results.length,
      results,
    }
  }

  async function getIntelligenceRetrievalSnapshot({ limit = 20 } = {}) {
    const normalizedLimit = clampLimit(limit, 20, 100)
    const [
      chunkSummaryResult,
      repairGapResult,
      latestRunResult,
      latestHybridProofResult,
      latestEvalRunResult,
      latestSuccessfulEvalRunResult,
      bySourceResult,
      recentChunksResult,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_chunks,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_chunks,
          COUNT(*) FILTER (WHERE atom_id IS NOT NULL)::int AS chunks_with_atoms,
          COUNT(*) FILTER (WHERE candidate_key IS NOT NULL)::int AS chunks_from_candidates,
          COUNT(*) FILTER (WHERE report_artifact_id IS NOT NULL)::int AS chunks_with_report_artifact,
          COUNT(*) FILTER (WHERE min_tier <= 1)::int AS tier_one_chunks,
          COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS chunks_with_embeddings,
          COUNT(*) FILTER (WHERE embedding IS NOT NULL AND candidate_key IS NOT NULL AND atom_id IS NOT NULL)::int AS candidate_atom_chunks_with_embeddings,
          COUNT(*) FILTER (WHERE embedding IS NOT NULL AND min_tier <= 1)::int AS tier_one_chunks_with_embeddings
        FROM intelligence_retrieval_chunks
      `),
      pool.query(`
        SELECT COUNT(*)::int AS active_candidate_atoms_missing_retrieval_chunks
        FROM intelligence_atoms atom
        WHERE atom.candidate_key IS NOT NULL
          AND atom.status NOT IN ('rejected', 'archived', 'superseded')
          AND NOT EXISTS (
            SELECT 1
            FROM intelligence_retrieval_chunks chunk
            WHERE chunk.candidate_key = atom.candidate_key
              AND chunk.atom_id = atom.atom_id
              AND chunk.status = 'active'
          )
      `),
      pool.query(`
        SELECT *
        FROM intelligence_retrieval_runs
        ORDER BY created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT *
        FROM intelligence_retrieval_runs
        WHERE run_type = 'hybrid_proof'
          AND status = 'succeeded'
        ORDER BY created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT *
        FROM intelligence_retrieval_runs
        WHERE run_type = 'retrieval_eval'
        ORDER BY created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT *
        FROM intelligence_retrieval_runs
        WHERE run_type = 'retrieval_eval'
          AND status = 'succeeded'
        ORDER BY created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT source_id, COUNT(*)::int AS count
        FROM intelligence_retrieval_chunks
        GROUP BY source_id
        ORDER BY count DESC, source_id ASC
      `),
      pool.query(`
        SELECT *
        FROM intelligence_retrieval_chunks
        ORDER BY updated_at DESC
        LIMIT $1
      `, [normalizedLimit]),
    ])

    const recentChunks = recentChunksResult.rows.map(mapRetrievalChunkRow)
    const proofChunk = recentChunks.find(chunk => chunk.minTier <= 1 && chunk.candidateKey && chunk.atomId) || null
    const proofQuery = proofChunk ? buildProofQueryFromChunk(proofChunk) : null
    const latestLexicalProof = proofQuery
      ? await searchIntelligenceChunks({
          query: proofQuery,
          maxTier: 1,
          limit: 5,
        })
      : []

    return {
      generatedAt: new Date().toISOString(),
      totalChunks: Number(chunkSummaryResult.rows[0]?.total_chunks || 0),
      activeChunks: Number(chunkSummaryResult.rows[0]?.active_chunks || 0),
      chunksWithAtoms: Number(chunkSummaryResult.rows[0]?.chunks_with_atoms || 0),
      chunksFromCandidates: Number(chunkSummaryResult.rows[0]?.chunks_from_candidates || 0),
      chunksWithReportArtifact: Number(chunkSummaryResult.rows[0]?.chunks_with_report_artifact || 0),
      tierOneChunks: Number(chunkSummaryResult.rows[0]?.tier_one_chunks || 0),
      chunksWithEmbeddings: Number(chunkSummaryResult.rows[0]?.chunks_with_embeddings || 0),
      candidateAtomChunksWithEmbeddings: Number(chunkSummaryResult.rows[0]?.candidate_atom_chunks_with_embeddings || 0),
      tierOneChunksWithEmbeddings: Number(chunkSummaryResult.rows[0]?.tier_one_chunks_with_embeddings || 0),
      activeCandidateAtomsMissingRetrievalChunks: Number(repairGapResult.rows[0]?.active_candidate_atoms_missing_retrieval_chunks || 0),
      bySource: bySourceResult.rows.map(row => ({ sourceId: row.source_id, count: Number(row.count || 0) })),
      latestRun: latestRunResult.rows[0] ? mapRetrievalRunRow(latestRunResult.rows[0]) : null,
      latestHybridProofRun: latestHybridProofResult.rows[0] ? mapRetrievalRunRow(latestHybridProofResult.rows[0]) : null,
      latestEvalRun: latestEvalRunResult.rows[0] ? mapRetrievalRunRow(latestEvalRunResult.rows[0]) : null,
      latestSuccessfulEvalRun: latestSuccessfulEvalRunResult.rows[0] ? mapRetrievalRunRow(latestSuccessfulEvalRunResult.rows[0]) : null,
      recentChunks,
      latestLexicalProofQuery: proofQuery,
      latestLexicalProof,
    }
  }

  return {
    buildRetrievalEmbeddingInput,
    getIntelligenceRetrievalSnapshot,
    promoteSharedCommunicationCandidatesToAtoms,
    recordRetrievalRun,
    searchIntelligenceEvidenceHybrid,
    searchIntelligenceChunks,
    searchIntelligenceChunksSemantic,
    selectRetrievalChunksForEmbedding,
    upsertRetrievalChunkEmbedding,
    upsertRetrievalChunk,
  }
}
