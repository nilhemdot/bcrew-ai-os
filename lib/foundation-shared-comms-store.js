import { randomUUID } from 'node:crypto'

import {
  SYNTHESIS_VERIFICATION_METADATA_KEY,
  buildSynthesisEvidenceIndex,
  isDecisionGradeActionRoute,
  summarizeVerificationResults,
  verifySynthesizedRecord,
} from './synthesis-claim-verification.js'

export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-009'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_SPRINT_ID = 'foundation-db-shared-comms-store-split-2026-05-16'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-shared-comms-store-split-v1'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-shared-comms-store-split-009-plan.md'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-009.json'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-shared-comms-store-split-check.mjs'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_BEFORE_LINES = 11187

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addEvaluationCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

export function createFoundationSharedCommunicationStore(deps = {}) {
  const {
    pool,
    withFoundationTransaction,
    getNextPrefixedId,
    normalizeBacklogScopeKey,
    mapBacklogRow,
    normalizeDecisionCategory,
    normalizeDecisionIdList,
    normalizeStringList,
    mapDecisionRow,
    mapOpenQuestionRow,
    insertChangeEvent,
    getRegisteredSourceIds,
  } = deps

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('Shared communications store requires a queryable pool.')
  }
  if (typeof withFoundationTransaction !== 'function') {
    throw new Error('Shared communications store requires withFoundationTransaction.')
  }
  if (typeof insertChangeEvent !== 'function') {
    throw new Error('Shared communications store requires insertChangeEvent.')
  }

  function mapSharedCommunicationArtifactRow(row, { includeSensitive = false } = {}) {
    const contentText = row.content_text ?? row.contentText ?? ''
    const mapped = {
      artifactId: row.artifact_id ?? row.artifactId,
      sourceId: row.source_id ?? row.sourceId,
      artifactType: row.artifact_type ?? row.artifactType,
      externalId: row.external_id ?? row.externalId,
      contentHash: row.content_hash ?? row.contentHash ?? '',
      contentLength: contentText.length,
      artifactCreatedAt: row.artifact_created_at ?? row.artifactCreatedAt ?? null,
      artifactUpdatedAt: row.artifact_updated_at ?? row.artifactUpdatedAt ?? null,
      metadata: row.metadata || {},
      ingestedBy: row.ingested_by ?? row.ingestedBy ?? null,
      ingestedAt: row.ingested_at ?? row.ingestedAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    }

    if (includeSensitive) {
      mapped.title = row.title || ''
      mapped.sourceAccount = row.source_account ?? row.sourceAccount ?? ''
      mapped.sourceContainer = row.source_container ?? row.sourceContainer ?? ''
      mapped.sourceUrl = row.source_url ?? row.sourceUrl ?? ''
      mapped.participants = Array.isArray(row.participants) ? row.participants : []
      mapped.excerpt = contentText ? contentText.slice(0, 280) : ''
    }

    return mapped
  }

  function mapSharedCommunicationCandidateRow(row) {
    return {
      candidateKey: row.candidate_key ?? row.candidateKey,
      artifactId: row.artifact_id ?? row.artifactId,
      sourceId: row.source_id ?? row.sourceId,
      candidateType: row.candidate_type ?? row.candidateType,
      status: row.status,
      title: row.title || '',
      summary: row.summary || '',
      ownerHint: row.owner_hint ?? row.ownerHint ?? '',
      evidenceExcerpt: row.evidence_excerpt ?? row.evidenceExcerpt ?? '',
      confidence: row.confidence == null ? null : Number(row.confidence),
      metadata: row.metadata || {},
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    }
  }

  function ensureSharedCommunicationCandidateCanApply(candidate) {
    if (!['pending', 'approved'].includes(candidate.status)) {
      throw new Error(`Candidate ${candidate.candidateKey} is ${candidate.status}; only pending or approved candidates can be applied.`)
    }
    if (candidate.metadata && candidate.metadata.appliedTargetId) {
      throw new Error(`Candidate ${candidate.candidateKey} was already applied to ${candidate.metadata.appliedTarget || 'a target'} ${candidate.metadata.appliedTargetId}.`)
    }
  }

  function mapSharedCommunicationSynthesisRunRow(row) {
    return {
      runId: row.run_id ?? row.runId,
      title: row.title || '',
      status: row.status,
      model: row.model || '',
      outputPath: row.output_path ?? row.outputPath ?? '',
      candidateLimit: row.candidate_limit ?? row.candidateLimit ?? null,
      candidatesRead: row.candidates_read ?? row.candidatesRead ?? 0,
      daysWindow: row.days_window ?? row.daysWindow ?? null,
      maxItems: row.max_items ?? row.maxItems ?? null,
      sourceCoverage: row.source_coverage || [],
      suppressedPatterns: row.suppressed_patterns || [],
      openQuestions: row.open_questions || [],
      archiveSummary: row.archive_summary || [],
      candidateSummary: row.candidate_summary || [],
      sourceFacts: row.source_facts || {},
      metadata: row.metadata || {},
      generatedAt: row.generated_at ?? row.generatedAt ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    }
  }

  function mapSharedCommunicationSynthesizedItemRow(row) {
    const metadata = row.metadata || {}
    return {
      synthesisItemId: row.synthesis_item_id ?? row.synthesisItemId,
      runId: row.run_id ?? row.runId,
      rank: row.rank == null ? null : Number(row.rank),
      itemType: row.item_type ?? row.itemType,
      status: row.status,
      title: row.title || '',
      oneLine: row.one_line ?? row.oneLine ?? '',
      whyItMatters: row.why_it_matters ?? row.whyItMatters ?? '',
      recommendedNextAction: row.recommended_next_action ?? row.recommendedNextAction ?? '',
      suggestedOwner: row.suggested_owner ?? row.suggestedOwner ?? '',
      sourceCount: row.source_count ?? row.sourceCount ?? 0,
      candidateKeys: Array.isArray(row.candidate_keys) ? row.candidate_keys : [],
      sourceIds: Array.isArray(row.source_ids) ? row.source_ids : [],
      evidenceSummary: row.evidence_summary ?? row.evidenceSummary ?? '',
      confidence: row.confidence == null ? null : Number(row.confidence),
      sensitivity: row.sensitivity || 'neutral',
      metadata,
      synthesisVerification: metadata[SYNTHESIS_VERIFICATION_METADATA_KEY] || null,
      createdAt: row.created_at ?? row.createdAt ?? null,
    }
  }


  async function getSharedCommunicationSourceStats(sourceId) {
    const normalizedSourceId = String(sourceId || '').trim()
    if (!normalizedSourceId) throw new Error('sourceId is required.')

    const result = await pool.query(
      `
        SELECT
          COUNT(*)::integer AS artifacts,
          MAX(artifact_updated_at) AS latest_artifact_updated_at,
          MAX(ingested_at) AS latest_ingested_at
        FROM shared_communication_artifacts
        WHERE source_id = $1
      `,
      [normalizedSourceId]
    )

    const row = result.rows[0] || {}
    return {
      sourceId: normalizedSourceId,
      artifacts: Number(row.artifacts || 0),
      latestArtifactUpdatedAt: row.latest_artifact_updated_at?.toISOString?.() || row.latest_artifact_updated_at || null,
      latestIngestedAt: row.latest_ingested_at?.toISOString?.() || row.latest_ingested_at || null,
    }
  }

  async function getSharedCommunicationExistingExternalIds({ sourceId, artifactType, externalIds = [] } = {}) {
    const normalizedSourceId = String(sourceId || '').trim()
    const normalizedArtifactType = String(artifactType || '').trim()
    const normalizedExternalIds = [...new Set(
      (externalIds || [])
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )]

    if (!normalizedSourceId) throw new Error('sourceId is required.')
    if (!normalizedArtifactType) throw new Error('artifactType is required.')
    if (!normalizedExternalIds.length) return new Set()

    const result = await pool.query(
      `
        SELECT external_id
        FROM shared_communication_artifacts
        WHERE source_id = $1
          AND artifact_type = $2
          AND external_id = ANY($3::text[])
      `,
      [normalizedSourceId, normalizedArtifactType, normalizedExternalIds]
    )

    return new Set(result.rows.map(row => row.external_id).filter(Boolean))
  }

  async function getSharedCommunicationExistingArtifactsByExternalId({ sourceId, artifactType, externalIds = [] } = {}) {
    const normalizedSourceId = String(sourceId || '').trim()
    const normalizedArtifactType = String(artifactType || '').trim()
    const normalizedExternalIds = [...new Set(
      (externalIds || [])
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )]

    if (!normalizedSourceId) throw new Error('sourceId is required.')
    if (!normalizedArtifactType) throw new Error('artifactType is required.')
    if (!normalizedExternalIds.length) return new Map()

    const result = await pool.query(
      `
        SELECT external_id, artifact_updated_at, ingested_at, content_hash
        FROM shared_communication_artifacts
        WHERE source_id = $1
          AND artifact_type = $2
          AND external_id = ANY($3::text[])
      `,
      [normalizedSourceId, normalizedArtifactType, normalizedExternalIds]
    )

    return new Map(result.rows.map(row => [
      row.external_id,
      {
        externalId: row.external_id,
        artifactUpdatedAt: row.artifact_updated_at?.toISOString?.() || row.artifact_updated_at || null,
        ingestedAt: row.ingested_at?.toISOString?.() || row.ingested_at || null,
        contentHash: row.content_hash || null,
      },
    ]))
  }


  async function getSharedCommunicationArchiveSnapshot({ sourceId, artifactType, limit = 20, includeSensitive = false } = {}) {
    const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 20))
    const values = []
    const filters = []

    if (sourceId) {
      values.push(String(sourceId).trim())
      filters.push(`source_id = $${values.length}`)
    }

    if (artifactType) {
      values.push(String(artifactType).trim())
      filters.push(`artifact_type = $${values.length}`)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const [summaryResult, recentResult] = await Promise.all([
      pool.query(
        `
          SELECT source_id, artifact_type, COUNT(*)::int AS total
          FROM shared_communication_artifacts
          ${whereClause}
          GROUP BY source_id, artifact_type
          ORDER BY source_id ASC, artifact_type ASC
        `,
        values
      ),
      pool.query(
        `
          SELECT artifact_id, source_id, artifact_type, external_id, title,
                 source_account, source_container, source_url, participants,
                 content_text, content_hash, artifact_created_at, artifact_updated_at,
                 metadata, ingested_by, ingested_at, updated_at
          FROM shared_communication_artifacts
          ${whereClause}
          ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
          LIMIT $${values.length + 1}
        `,
        [...values, normalizedLimit]
      ),
    ])

    const bySource = {}
    const byType = {}
    let totalArtifacts = 0

    for (const row of summaryResult.rows) {
      const count = Number(row.total || 0)
      totalArtifacts += count
      bySource[row.source_id] = (bySource[row.source_id] || 0) + count
      byType[row.artifact_type] = (byType[row.artifact_type] || 0) + count
    }

    return {
      totalArtifacts,
      bySource,
      byType,
      items: recentResult.rows.map(row => mapSharedCommunicationArtifactRow(row, { includeSensitive })),
    }
  }

  const artifactContextStopWords = new Set([
    'the',
    'and',
    'for',
    'you',
    'your',
    'that',
    'this',
    'with',
    'what',
    'did',
    'his',
    'her',
    'was',
    'were',
    'say',
    'he',
    'she',
    'when',
    'where',
    'said',
    'says',
    'from',
    'have',
    'about',
    'into',
    'they',
    'them',
    'being',
    'pre',
    'prestrat',
    'strat',
    'strategy',
    'strategic',
    'start',
    'stop',
    'doc',
  ])

  const artifactContextNameTerms = new Set([
    'steve',
    'scott',
    'ryan',
    'carson',
    'georgia',
    'nick',
    'clare',
    'ahsan',
    'blake',
    'tanner',
  ])

  function getArtifactContextTerms(query) {
    const terms = Array.from(new Set(String(query || '')
      .toLowerCase()
      .match(/[a-z0-9]+/g) || []))
      .filter(term => term.length >= 3 && !artifactContextStopWords.has(term))
      .slice(0, 10)

    const expanded = [...terms]
    if (terms.includes('angry')) expanded.push('hate', 'upset', 'frustrat', 'mad')
    return Array.from(new Set(expanded)).slice(0, 14)
  }

  function buildArtifactContextExcerpt(contentText, terms, excerptChars) {
    const content = String(contentText || '')
    if (!content) return ''
    const lowerContent = content.toLowerCase()
    const focusTerms = terms.filter(term => !artifactContextNameTerms.has(term))
    const searchTerms = focusTerms.length ? focusTerms : terms
    const firstMatch = searchTerms
      .map(term => lowerContent.indexOf(term.toLowerCase()))
      .filter(index => index >= 0)
      .sort((left, right) => left - right)[0]
    const normalizedExcerptChars = Math.min(6000, Math.max(600, Number(excerptChars) || 1800))
    const start = firstMatch >= 0
      ? Math.max(0, firstMatch - Math.floor(normalizedExcerptChars / 3))
      : 0
    const excerpt = content.slice(start, start + normalizedExcerptChars).trim()
    return `${start > 0 ? '...' : ''}${excerpt}${start + normalizedExcerptChars < content.length ? '...' : ''}`
  }

  async function searchSharedCommunicationArtifactsForContext({
    query = '',
    sourceIds = [],
    artifactTypes = [],
    limit = 12,
    excerptChars = 1800,
  } = {}) {
    const terms = getArtifactContextTerms(query)
    const normalizedSourceIds = Array.isArray(sourceIds)
      ? sourceIds.map(sourceId => String(sourceId || '').trim()).filter(Boolean)
      : []
    const normalizedArtifactTypes = Array.isArray(artifactTypes)
      ? artifactTypes.map(artifactType => String(artifactType || '').trim()).filter(Boolean)
      : []
    const normalizedLimit = Math.min(30, Math.max(1, Number(limit) || 12))

    const filters = []
    const values = []

    if (normalizedSourceIds.length) {
      values.push(normalizedSourceIds)
      filters.push(`source_id = ANY($${values.length}::text[])`)
    }

    if (normalizedArtifactTypes.length) {
      values.push(normalizedArtifactTypes)
      filters.push(`artifact_type = ANY($${values.length}::text[])`)
    }

    if (terms.length) {
      const termFilters = []
      for (const term of terms) {
        values.push(`%${term}%`)
        termFilters.push(`(title ILIKE $${values.length} OR content_text ILIKE $${values.length})`)
      }
      filters.push(`(${termFilters.join(' OR ')})`)
    }

    values.push(Math.min(500, Math.max(normalizedLimit * 20, 100)))
    const result = await pool.query(
      `
        SELECT artifact_id, source_id, artifact_type, external_id, title,
               source_account, source_container, source_url, participants,
               content_text, content_hash, artifact_created_at, artifact_updated_at,
               metadata, ingested_by, ingested_at, updated_at
        FROM shared_communication_artifacts
        ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
        ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
        LIMIT $${values.length}
      `,
      values,
    )

    return result.rows
      .map(row => {
        const contentText = row.content_text || ''
        const lowerTitle = String(row.title || '').toLowerCase()
        const lowerContent = contentText.toLowerCase()
        const matchedTerms = terms.filter(term => lowerTitle.includes(term) || lowerContent.includes(term))
        const titleHits = terms.filter(term => lowerTitle.includes(term)).length
        const contentHits = terms.filter(term => lowerContent.includes(term)).length
        return {
          artifactId: row.artifact_id,
          sourceId: row.source_id,
          artifactType: row.artifact_type,
          title: row.title || '',
          sourceAccount: row.source_account || '',
          sourceContainer: row.source_container || '',
          sourceUrl: row.source_url || '',
          contentLength: contentText.length,
          artifactUpdatedAt: row.artifact_updated_at || null,
          ingestedAt: row.ingested_at || null,
          matchedTerms,
          relevanceScore: titleHits * 12 + contentHits,
          excerpt: buildArtifactContextExcerpt(contentText, matchedTerms.length ? matchedTerms : terms, excerptChars),
          metadata: row.metadata || {},
        }
      })
      .filter(item => item.excerpt)
      .sort((left, right) => {
        if (right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore
        return String(right.ingestedAt || '').localeCompare(String(left.ingestedAt || ''))
      })
      .slice(0, normalizedLimit)
  }

  async function getStrategyPreworkCoverageSnapshot() {
    return getStrategyPreworkCoverageSnapshotFromSources({ pool })
  }

  async function getStrategyGoalTruthSnapshot() {
    return getStrategyGoalTruthSnapshotFromSources({ getDocSourceSnapshot })
  }

  async function getStrategyOperatingTruthSnapshot() {
    return getStrategyOperatingTruthSnapshotFromSources({
      pool,
      getFubLeadSourceSnapshot,
      getStrategyGoalTruthSnapshot,
    })
  }


  async function getSharedCommunicationArtifactsForProcessing({ sourceId, artifactType, limit = 20, offset = 0 } = {}) {
    const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 20))
    const normalizedOffset = Math.max(0, Number(offset) || 0)
    const values = []
    const filters = []

    if (sourceId) {
      values.push(String(sourceId).trim())
      filters.push(`source_id = $${values.length}`)
    }

    if (artifactType) {
      values.push(String(artifactType).trim())
      filters.push(`artifact_type = $${values.length}`)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const result = await pool.query(
      `
        SELECT artifact_id, source_id, artifact_type, external_id, title,
               content_text, content_hash, artifact_updated_at, metadata
        FROM shared_communication_artifacts
        ${whereClause}
        ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
      `,
      [...values, normalizedLimit, normalizedOffset]
    )

    return result.rows.map(row => ({
      artifactId: row.artifact_id,
      sourceId: row.source_id,
      artifactType: row.artifact_type,
      externalId: row.external_id,
      title: row.title || '',
      contentText: row.content_text || '',
      contentHash: row.content_hash || '',
      artifactUpdatedAt: row.artifact_updated_at ?? null,
      metadata: row.metadata || {},
    }))
  }

  async function getSharedCommunicationArtifactsWithoutCandidatesForProcessing({
    sourceId,
    artifactType,
    limit = 20,
    offset = 0,
    processingType = 'candidate_extraction',
    extractionMethod = null,
  } = {}) {
    const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 20))
    const normalizedOffset = Math.max(0, Number(offset) || 0)
    const values = []
    const filters = []

    if (sourceId) {
      values.push(String(sourceId).trim())
      filters.push(`artifact.source_id = $${values.length}`)
    }

    if (artifactType) {
      values.push(String(artifactType).trim())
      filters.push(`artifact.artifact_type = $${values.length}`)
    }

    const processingFilters = [
      'processing.artifact_id = artifact.artifact_id',
      `processing.status = 'succeeded'`,
      `COALESCE(processing.artifact_content_hash, '') = COALESCE(artifact.content_hash, '')`,
    ]
    if (processingType) {
      values.push(String(processingType).trim())
      processingFilters.push(`processing.processing_type = $${values.length}`)
    }
    if (extractionMethod) {
      values.push(String(extractionMethod).trim())
      processingFilters.push(`processing.extraction_method = $${values.length}`)
    }
    filters.push(`
          NOT EXISTS (
            SELECT 1
            FROM shared_communication_artifact_processing_runs processing
            WHERE ${processingFilters.join(' AND ')}
          )
    `)

    const whereClause = `WHERE ${filters.join(' AND ')}`
    const result = await pool.query(
      `
        SELECT artifact.artifact_id, artifact.source_id, artifact.artifact_type,
               artifact.external_id, artifact.title, artifact.content_text,
               artifact.content_hash, artifact.artifact_updated_at, artifact.metadata
        FROM shared_communication_artifacts artifact
        ${whereClause}
        ORDER BY COALESCE(artifact.artifact_updated_at, artifact.ingested_at) DESC, artifact.ingested_at DESC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
      `,
      [...values, normalizedLimit, normalizedOffset]
    )

    return result.rows.map(row => ({
      artifactId: row.artifact_id,
      sourceId: row.source_id,
      artifactType: row.artifact_type,
      externalId: row.external_id,
      title: row.title || '',
      contentText: row.content_text || '',
      contentHash: row.content_hash || '',
      artifactUpdatedAt: row.artifact_updated_at ?? null,
      metadata: row.metadata || {},
    }))
  }

  async function recordSharedCommunicationArtifactProcessingRun(input, actor = 'system') {
    if (!input.artifactId || !input.sourceId || !input.artifactType || !input.processingType || !input.status) {
      throw new Error('artifactId/sourceId/artifactType/processingType/status are required for artifact processing run writes.')
    }

    const runId = input.runId || `artifact-proc-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${randomUUID().slice(0, 8)}`
    const result = await pool.query(
      `
        INSERT INTO shared_communication_artifact_processing_runs (
          run_id, artifact_id, source_id, artifact_type, artifact_content_hash,
          processing_type, extraction_method, provider, auth_path, route_key,
          model, status, candidate_count, error_message,
          metadata, processed_by, processed_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,COALESCE($17::timestamptz, NOW()))
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            artifact_content_hash = EXCLUDED.artifact_content_hash,
            provider = EXCLUDED.provider,
            auth_path = EXCLUDED.auth_path,
            route_key = EXCLUDED.route_key,
            model = EXCLUDED.model,
            candidate_count = EXCLUDED.candidate_count,
            error_message = EXCLUDED.error_message,
            metadata = EXCLUDED.metadata,
            processed_by = EXCLUDED.processed_by,
            processed_at = EXCLUDED.processed_at
        RETURNING run_id, artifact_id, source_id, artifact_type, processing_type,
                  artifact_content_hash, extraction_method, provider, auth_path,
                  route_key, model, status, candidate_count, error_message,
                  metadata, processed_by, processed_at
      `,
      [
        runId,
        input.artifactId,
        input.sourceId,
        input.artifactType,
        input.artifactContentHash ?? '',
        input.processingType,
        input.extractionMethod ?? null,
        input.provider ?? null,
        input.authPath ?? null,
        input.routeKey ?? null,
        input.model ?? null,
        input.status,
        Number(input.candidateCount || 0),
        input.errorMessage ?? null,
        JSON.stringify(input.metadata || {}),
        actor,
        input.processedAt ?? null,
      ]
    )

    const row = result.rows[0]
    return {
      runId: row.run_id,
      artifactId: row.artifact_id,
      sourceId: row.source_id,
      artifactType: row.artifact_type,
      artifactContentHash: row.artifact_content_hash || '',
      processingType: row.processing_type,
      extractionMethod: row.extraction_method,
      provider: row.provider || null,
      authPath: row.auth_path || null,
      routeKey: row.route_key || null,
      model: row.model,
      status: row.status,
      candidateCount: Number(row.candidate_count || 0),
      errorMessage: row.error_message || '',
      metadata: row.metadata || {},
      processedBy: row.processed_by || null,
      processedAt: row.processed_at,
    }
  }

  async function getSharedCommunicationProcessingProvenanceGaps({
    since = '2026-04-24T17:14:00-04:00',
    limit = 20,
  } = {}) {
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const result = await pool.query(
      `
        SELECT run_id, artifact_id, source_id, artifact_type, processing_type,
               extraction_method, status, artifact_content_hash, provider,
               auth_path, route_key, model, processed_at
        FROM shared_communication_artifact_processing_runs
        WHERE processed_at >= $1::timestamptz
          AND processing_type = 'candidate_extraction'
          AND (
            COALESCE(artifact_content_hash, '') = ''
            OR provider IS NULL
            OR auth_path IS NULL
            OR route_key IS NULL
            OR model IS NULL
          )
        ORDER BY processed_at DESC
        LIMIT $2
      `,
      [since, normalizedLimit]
    )

    return result.rows.map(row => ({
      runId: row.run_id,
      artifactId: row.artifact_id,
      sourceId: row.source_id,
      artifactType: row.artifact_type,
      processingType: row.processing_type,
      extractionMethod: row.extraction_method,
      status: row.status,
      artifactContentHash: row.artifact_content_hash || '',
      provider: row.provider || null,
      authPath: row.auth_path || null,
      routeKey: row.route_key || null,
      model: row.model || null,
      processedAt: row.processed_at,
    }))
  }

  async function upsertSharedCommunicationArtifact(input, actor = 'system') {
    const artifactId =
      input.artifactId ||
      `${String(input.sourceId || '').trim()}:${String(input.externalId || '').trim()}`

    if (!artifactId || !input.sourceId || !input.artifactType || !input.externalId) {
      throw new Error('artifactId/sourceId/artifactType/externalId are required for shared communication archive writes.')
    }

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          INSERT INTO shared_communication_artifacts (
            artifact_id, source_id, artifact_type, external_id, title,
            source_account, source_container, source_url, participants,
            content_text, content_hash, artifact_created_at, artifact_updated_at,
            metadata, ingested_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14::jsonb,$15)
          ON CONFLICT (artifact_id) DO UPDATE
          SET title = EXCLUDED.title,
              source_account = EXCLUDED.source_account,
              source_container = EXCLUDED.source_container,
              source_url = EXCLUDED.source_url,
              participants = EXCLUDED.participants,
              content_text = EXCLUDED.content_text,
              content_hash = EXCLUDED.content_hash,
              artifact_created_at = COALESCE(EXCLUDED.artifact_created_at, shared_communication_artifacts.artifact_created_at),
              artifact_updated_at = COALESCE(EXCLUDED.artifact_updated_at, shared_communication_artifacts.artifact_updated_at),
              metadata = EXCLUDED.metadata,
              ingested_by = EXCLUDED.ingested_by,
              ingested_at = NOW(),
              updated_at = CASE
                WHEN shared_communication_artifacts.title IS DISTINCT FROM EXCLUDED.title
                  OR shared_communication_artifacts.source_account IS DISTINCT FROM EXCLUDED.source_account
                  OR shared_communication_artifacts.source_container IS DISTINCT FROM EXCLUDED.source_container
                  OR shared_communication_artifacts.source_url IS DISTINCT FROM EXCLUDED.source_url
                  OR shared_communication_artifacts.participants IS DISTINCT FROM EXCLUDED.participants
                  OR shared_communication_artifacts.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                  OR shared_communication_artifacts.artifact_updated_at IS DISTINCT FROM EXCLUDED.artifact_updated_at
                  OR shared_communication_artifacts.metadata IS DISTINCT FROM EXCLUDED.metadata
                THEN NOW()
                ELSE shared_communication_artifacts.updated_at
              END
          RETURNING artifact_id, source_id, artifact_type, external_id, title,
                    source_account, source_container, source_url, participants,
                    content_text, content_hash, artifact_created_at, artifact_updated_at,
                    metadata, ingested_by, ingested_at, updated_at
        `,
        [
          artifactId,
          input.sourceId,
          input.artifactType,
          input.externalId,
          input.title ?? null,
          input.sourceAccount ?? null,
          input.sourceContainer ?? null,
          input.sourceUrl ?? null,
          JSON.stringify(Array.isArray(input.participants) ? input.participants : []),
          input.contentText ?? '',
          input.contentHash ?? '',
          input.artifactCreatedAt ?? null,
          input.artifactUpdatedAt ?? null,
          JSON.stringify(input.metadata || {}),
          actor,
        ]
      )

      return mapSharedCommunicationArtifactRow(result.rows[0])
    })
  }

  async function getSharedCommunicationCandidateSnapshot({
    sourceId,
    candidateType,
    status,
    limit = 20,
    includeItems = true,
  } = {}) {
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const values = []
    const filters = []

    if (sourceId) {
      values.push(String(sourceId).trim())
      filters.push(`source_id = $${values.length}`)
    }

    if (candidateType) {
      values.push(String(candidateType).trim())
      filters.push(`candidate_type = $${values.length}`)
    }

    if (status) {
      values.push(String(status).trim())
      filters.push(`status = $${values.length}`)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const summaryResult = await pool.query(
      `
        SELECT candidate_type, status, COUNT(*)::int AS total
        FROM shared_communication_candidates
        ${whereClause}
        GROUP BY candidate_type, status
        ORDER BY candidate_type ASC, status ASC
      `,
      values
    )

    const byType = {}
    const byStatus = {}
    let totalCandidates = 0

    for (const row of summaryResult.rows) {
      const count = Number(row.total || 0)
      totalCandidates += count
      byType[row.candidate_type] = (byType[row.candidate_type] || 0) + count
      byStatus[row.status] = (byStatus[row.status] || 0) + count
    }

    let items = []
    if (includeItems) {
      const itemsResult = await pool.query(
        `
          SELECT candidate_key, artifact_id, source_id, candidate_type, status,
                 title, summary, owner_hint, evidence_excerpt, confidence,
                 metadata, created_at, updated_at
          FROM shared_communication_candidates
          ${whereClause}
          ORDER BY updated_at DESC, created_at DESC
          LIMIT $${values.length + 1}
        `,
        [...values, normalizedLimit]
      )
      items = itemsResult.rows.map(mapSharedCommunicationCandidateRow)
    }

    return {
      totalCandidates,
      byType,
      byStatus,
      items,
    }
  }

  async function upsertSharedCommunicationCandidate(input) {
    if (!input.candidateKey || !input.artifactId || !input.sourceId || !input.candidateType || !input.title || !input.summary) {
      throw new Error('candidateKey/artifactId/sourceId/candidateType/title/summary are required for shared communication candidate writes.')
    }

    const result = await pool.query(
      `
        INSERT INTO shared_communication_candidates (
          candidate_key, artifact_id, source_id, candidate_type, title, summary,
          owner_hint, evidence_excerpt, confidence, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
        ON CONFLICT (candidate_key) DO UPDATE
        SET title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            owner_hint = EXCLUDED.owner_hint,
            evidence_excerpt = EXCLUDED.evidence_excerpt,
            confidence = EXCLUDED.confidence,
            metadata = EXCLUDED.metadata,
            status = CASE
              WHEN shared_communication_candidates.status = 'rejected'
                AND shared_communication_candidates.metadata->>'rejectedByCleanup' = 'true'
              THEN 'pending'
              WHEN shared_communication_candidates.status = 'duplicate'
                AND shared_communication_candidates.metadata->>'duplicateByCleanup' = 'true'
              THEN 'pending'
              ELSE shared_communication_candidates.status
            END,
            updated_at = CASE
              WHEN shared_communication_candidates.title IS DISTINCT FROM EXCLUDED.title
                OR shared_communication_candidates.summary IS DISTINCT FROM EXCLUDED.summary
                OR shared_communication_candidates.owner_hint IS DISTINCT FROM EXCLUDED.owner_hint
                OR shared_communication_candidates.evidence_excerpt IS DISTINCT FROM EXCLUDED.evidence_excerpt
                OR shared_communication_candidates.confidence IS DISTINCT FROM EXCLUDED.confidence
                OR shared_communication_candidates.metadata IS DISTINCT FROM EXCLUDED.metadata
                OR (
                  shared_communication_candidates.status = 'rejected'
                  AND shared_communication_candidates.metadata->>'rejectedByCleanup' = 'true'
                )
                OR (
                  shared_communication_candidates.status = 'duplicate'
                  AND shared_communication_candidates.metadata->>'duplicateByCleanup' = 'true'
                )
              THEN NOW()
              ELSE shared_communication_candidates.updated_at
            END
        RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                  title, summary, owner_hint, evidence_excerpt, confidence,
                  metadata, created_at, updated_at
      `,
      [
        input.candidateKey,
        input.artifactId,
        input.sourceId,
        input.candidateType,
        input.title,
        input.summary,
        input.ownerHint ?? null,
        input.evidenceExcerpt ?? null,
        input.confidence ?? null,
        JSON.stringify(input.metadata || {}),
      ]
    )

    return mapSharedCommunicationCandidateRow(result.rows[0])
  }

  async function recordSharedCommunicationSynthesisRun(input, actor = 'system') {
    if (!input.runId || !input.title || !input.model) {
      throw new Error('runId/title/model are required for shared communication synthesis writes.')
    }

    const items = Array.isArray(input.items) ? input.items : []
    return withFoundationTransaction(async client => {
      const runResult = await client.query(
        `
          INSERT INTO shared_communication_synthesis_runs (
            run_id, title, status, model, output_path, candidate_limit,
            candidates_read, days_window, max_items, source_coverage,
            suppressed_patterns, open_questions, archive_summary,
            candidate_summary, source_facts, metadata, generated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17)
          ON CONFLICT (run_id) DO UPDATE
          SET title = EXCLUDED.title,
              status = EXCLUDED.status,
              model = EXCLUDED.model,
              output_path = EXCLUDED.output_path,
              candidate_limit = EXCLUDED.candidate_limit,
              candidates_read = EXCLUDED.candidates_read,
              days_window = EXCLUDED.days_window,
              max_items = EXCLUDED.max_items,
              source_coverage = EXCLUDED.source_coverage,
              suppressed_patterns = EXCLUDED.suppressed_patterns,
              open_questions = EXCLUDED.open_questions,
              archive_summary = EXCLUDED.archive_summary,
              candidate_summary = EXCLUDED.candidate_summary,
              source_facts = EXCLUDED.source_facts,
              metadata = EXCLUDED.metadata,
              generated_at = EXCLUDED.generated_at,
              updated_at = NOW()
          RETURNING run_id, title, status, model, output_path, candidate_limit,
                    candidates_read, days_window, max_items, source_coverage,
                    suppressed_patterns, open_questions, archive_summary,
                    candidate_summary, source_facts, metadata, generated_at, created_at, updated_at
        `,
        [
          input.runId,
          input.title,
          input.status || 'completed',
          input.model,
          input.outputPath || null,
          input.candidateLimit ?? null,
          input.candidatesRead ?? 0,
          input.daysWindow ?? null,
          input.maxItems ?? null,
          JSON.stringify(input.sourceCoverage || []),
          JSON.stringify(input.suppressedPatterns || []),
          JSON.stringify(input.openQuestions || []),
          JSON.stringify(input.archiveSummary || []),
          JSON.stringify(input.candidateSummary || []),
          JSON.stringify(input.sourceFacts || {}),
          JSON.stringify({
            ...(input.metadata || {}),
            recordedBy: actor,
          }),
          input.generatedAt || new Date().toISOString(),
        ]
      )

      await client.query(
        `DELETE FROM shared_communication_synthesized_items WHERE run_id = $1`,
        [input.runId]
      )

      for (const item of items) {
        const itemId = item.synthesisItemId || `${input.runId}:${item.rank}`
        const verification = verifySynthesizedRecord({
          surface: 'shared_communication_synthesized_items',
          record: {
            synthesisItemId: itemId,
            ...item,
            sourceIds: Array.isArray(item.sourceIds) ? item.sourceIds : item.source_ids || [],
            candidateKeys: Array.isArray(item.candidateKeys) ? item.candidateKeys : item.candidate_keys || [],
            sourceCount: item.sourceCount ?? item.source_count ?? 0,
            sensitivity: item.sensitivity || 'neutral',
          },
        }, buildSynthesisEvidenceIndex({
          sourceIds: getRegisteredSourceIds(),
        }))
        await client.query(
          `
            INSERT INTO shared_communication_synthesized_items (
              synthesis_item_id, run_id, rank, item_type, status, title,
              one_line, why_it_matters, recommended_next_action, suggested_owner,
              source_count, candidate_keys, source_ids, evidence_summary,
              confidence, sensitivity, metadata
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::text[],$13::text[],$14,$15,$16,$17::jsonb)
          `,
          [
            itemId,
            input.runId,
            item.rank,
            item.itemType || item.item_type,
            item.status,
            item.title,
            item.oneLine || item.one_line || '',
            item.whyItMatters || item.why_it_matters || '',
            item.recommendedNextAction || item.recommended_next_action || '',
            item.suggestedOwner || item.suggested_owner || null,
            item.sourceCount ?? item.source_count ?? 0,
            Array.isArray(item.candidateKeys) ? item.candidateKeys : item.candidate_keys || [],
            Array.isArray(item.sourceIds) ? item.sourceIds : item.source_ids || [],
            item.evidenceSummary || item.evidence_summary || '',
            item.confidence ?? null,
            item.sensitivity || 'neutral',
            JSON.stringify({
              ...(item.metadata || {}),
              [SYNTHESIS_VERIFICATION_METADATA_KEY]: verification,
            }),
          ]
        )
      }

      return {
        run: mapSharedCommunicationSynthesisRunRow(runResult.rows[0]),
        itemCount: items.length,
      }
    })
  }

  async function getSharedCommunicationSynthesisSnapshot({ limit = 3, itemLimit = 20, packetType = '' } = {}) {
    const normalizedLimit = Math.min(20, Math.max(1, Number(limit) || 3))
    const normalizedItemLimit = Math.min(100, Math.max(1, Number(itemLimit) || 20))
    const normalizedPacketType = String(packetType || '').trim()
    const values = [normalizedLimit]
    const filters = []

    if (normalizedPacketType) {
      values.push(normalizedPacketType)
      filters.push(`metadata->>'packetType' = $${values.length}`)
    }

    const runsResult = await pool.query(
      `
        SELECT run_id, title, status, model, output_path, candidate_limit,
               candidates_read, days_window, max_items, source_coverage,
               suppressed_patterns, open_questions, archive_summary,
               candidate_summary, source_facts, metadata, generated_at, created_at, updated_at
        FROM shared_communication_synthesis_runs
        ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
        ORDER BY generated_at DESC, created_at DESC
        LIMIT $1
      `,
      values
    )

    const runs = runsResult.rows.map(mapSharedCommunicationSynthesisRunRow)
    const latestRunId = runs[0]?.runId || ''
    let latestItems = []

    if (latestRunId) {
      const itemsResult = await pool.query(
        `
          SELECT synthesis_item_id, run_id, rank, item_type, status, title,
                 one_line, why_it_matters, recommended_next_action, suggested_owner,
                 source_count, candidate_keys, source_ids, evidence_summary,
                 confidence, sensitivity, metadata, created_at
          FROM shared_communication_synthesized_items
          WHERE run_id = $1
          ORDER BY rank ASC
          LIMIT $2
        `,
        [latestRunId, normalizedItemLimit]
      )
      latestItems = itemsResult.rows.map(mapSharedCommunicationSynthesizedItemRow)
    }

    return {
      latestRun: runs[0] || null,
      runs,
      latestItems,
      latestTrustedItems: latestItems.filter(item => item.synthesisVerification?.status === 'verified'),
      latestAdvisoryItems: latestItems.filter(item => item.synthesisVerification?.status !== 'verified'),
      verificationSummary: {
        totalItems: latestItems.length,
        verifiedItems: latestItems.filter(item => item.synthesisVerification?.status === 'verified').length,
        advisoryOrBlockedItems: latestItems.filter(item => item.synthesisVerification?.status !== 'verified').length,
        rule: 'Unverified shared-comms synthesis is advisory/blocked and must not feed Strategy-grade output.',
      },
    }
  }

  function synthesisVerificationLeakCount(payload) {
    const text = JSON.stringify(payload || {})
    const rawContentPatterns = [
      /"body"\s*:/i,
      /"content"\s*:/i,
      /"raw"\s*:/i,
      /"transcript"\s*:/i,
      /"message"\s*:/i,
      /"email"\s*:/i,
      /"quote"\s*:/i,
    ]
    return rawContentPatterns.filter(pattern => pattern.test(text)).length
  }

  function collectVerificationRefs(rows = []) {
    return {
      factRefs: Array.from(new Set(rows.flatMap(row => row.fact_refs || row.factRefs || []))),
      evidenceRefs: Array.from(new Set(rows.flatMap(row => [
        ...(row.evidence_refs || row.evidenceRefs || []),
        ...(row.atom_refs || row.atomRefs || []),
      ]))),
      chunkRefs: Array.from(new Set(rows.flatMap(row => row.evidence_chunk_refs || row.evidenceChunkRefs || []))),
      candidateKeys: Array.from(new Set(rows.flatMap(row => row.candidate_keys || row.candidateKeys || []))),
    }
  }

  async function buildSynthesisVerificationEvidenceIndex(rows = []) {
    const refs = collectVerificationRefs(rows)
    const [facts, atoms, chunks, candidates] = await Promise.all([
      refs.factRefs.length
        ? pool.query(
          `
            SELECT fact_id, fact_type, source_id, source_ids, status, sensitivity, min_tier,
                   evidence_id, artifact_id, atom_id, candidate_key, as_of, metadata, created_at, updated_at
            FROM intelligence_synthesis_facts
            WHERE fact_id = ANY($1::text[])
          `,
          [refs.factRefs]
        )
        : { rows: [] },
      refs.evidenceRefs.length
        ? pool.query(
          `
            SELECT atom_id, source_id, artifact_id, candidate_key, status, sensitivity, min_tier, metadata, created_at, updated_at
            FROM intelligence_atoms
            WHERE atom_id = ANY($1::text[])
          `,
          [refs.evidenceRefs]
        )
        : { rows: [] },
      refs.chunkRefs.length
        ? pool.query(
          `
            SELECT chunk_id, source_id, artifact_id, candidate_key, atom_id, status, sensitivity, min_tier, metadata, created_at, updated_at
            FROM intelligence_retrieval_chunks
            WHERE chunk_id = ANY($1::text[])
          `,
          [refs.chunkRefs]
        )
        : { rows: [] },
      refs.candidateKeys.length
        ? pool.query(
          `
            SELECT candidate_key, artifact_id, source_id, status, confidence, metadata, created_at, updated_at
            FROM shared_communication_candidates
            WHERE candidate_key = ANY($1::text[])
          `,
          [refs.candidateKeys]
        )
        : { rows: [] },
    ])

    return buildSynthesisEvidenceIndex({
      facts: facts.rows,
      atoms: atoms.rows,
      chunks: chunks.rows,
      candidates: candidates.rows,
      sourceIds: getRegisteredSourceIds(),
      registeredSourceIds: getRegisteredSourceIds(),
    })
  }

  function verificationPatch(verification) {
    return JSON.stringify({
      [SYNTHESIS_VERIFICATION_METADATA_KEY]: verification,
    })
  }

  async function buildSynthesisVerificationDbReport({ stamp = false, limit = 500 } = {}) {
    const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 500))
    const [governedItems, sharedItems, actionRoutes] = await Promise.all([
      pool.query(
        `
          SELECT *
          FROM intelligence_synthesized_items
          WHERE status != 'archived'
          ORDER BY updated_at DESC
          LIMIT $1
        `,
        [normalizedLimit]
      ),
      pool.query(
        `
          SELECT item.*
          FROM shared_communication_synthesized_items item
          JOIN shared_communication_synthesis_runs run ON run.run_id = item.run_id
          ORDER BY run.generated_at DESC, item.rank ASC
          LIMIT $1
        `,
        [normalizedLimit]
      ),
      pool.query(
        `
          SELECT *
          FROM intelligence_action_routes
          WHERE approval_status IN ('pending', 'approved', 'applied')
          ORDER BY updated_at DESC
          LIMIT $1
        `,
        [normalizedLimit]
      ),
    ])
    const allRows = [...governedItems.rows, ...sharedItems.rows, ...actionRoutes.rows]
    const evidenceIndex = await buildSynthesisVerificationEvidenceIndex(allRows)

    const governedResults = governedItems.rows.map(row => ({
      row,
      verification: verifySynthesizedRecord({
        surface: 'intelligence_synthesized_items',
        record: row,
      }, evidenceIndex),
    }))
    const sharedResults = sharedItems.rows.map(row => ({
      row,
      verification: verifySynthesizedRecord({
        surface: 'shared_communication_synthesized_items',
        record: row,
      }, evidenceIndex),
    }))
    const routeResults = actionRoutes.rows.map(row => ({
      row,
      decisionGrade: isDecisionGradeActionRoute({
        routeType: row.route_type,
        destinationTable: row.destination_table,
        metadata: row.metadata || {},
      }),
      verification: verifySynthesizedRecord({
        surface: 'intelligence_action_routes',
        record: row,
      }, evidenceIndex),
    }))

    if (stamp) {
      await withFoundationTransaction(async client => {
        for (const result of governedResults) {
          await client.query(
            `
              UPDATE intelligence_synthesized_items
              SET metadata = metadata || $2::jsonb,
                  attributes = attributes || $3::jsonb,
                  updated_at = NOW()
              WHERE synthesized_item_id = $1
            `,
            [
              result.row.synthesized_item_id,
              verificationPatch(result.verification),
              JSON.stringify({ synthesisVerificationStatus: result.verification.status }),
            ]
          )
        }
        for (const result of sharedResults) {
          await client.query(
            `
              UPDATE shared_communication_synthesized_items
              SET metadata = metadata || $2::jsonb
              WHERE synthesis_item_id = $1
            `,
            [result.row.synthesis_item_id, verificationPatch(result.verification)]
          )
        }
        for (const result of routeResults) {
          await client.query(
            `
              UPDATE intelligence_action_routes
              SET metadata = metadata || $2::jsonb,
                  updated_at = NOW()
              WHERE route_id = $1
            `,
            [result.row.route_id, verificationPatch(result.verification)]
          )
        }
      })
    }

    const nonLegacyGovernedResults = governedResults.filter(result =>
      String(result.row.metadata?.legacySynthesisProtected || result.row.attributes?.legacySynthesisProtected || 'false') !== 'true'
    )
    const unverifiedDecisionGradeRoutes = routeResults.filter(result =>
      result.decisionGrade && result.verification.status !== 'verified'
    )
    const payloadForLeakCheck = {
      governed: governedResults.map(result => result.verification),
      shared: sharedResults.map(result => result.verification),
      routes: routeResults.map(result => result.verification),
    }
    const privateOrRawLeakFindings = synthesisVerificationLeakCount(payloadForLeakCheck)
    const status = nonLegacyGovernedResults.every(result => result.verification.status === 'verified') &&
      unverifiedDecisionGradeRoutes.length === 0 &&
      privateOrRawLeakFindings === 0
      ? 'healthy'
      : 'blocked'

    return {
      generatedAt: new Date().toISOString(),
      status,
      summary: {
        governedItemCount: governedResults.length,
        governedVerifiedCount: governedResults.filter(result => result.verification.status === 'verified').length,
        governedUnverifiedCount: governedResults.filter(result => result.verification.status !== 'verified').length,
        nonLegacyGovernedItemCount: nonLegacyGovernedResults.length,
        nonLegacyGovernedUnverifiedCount: nonLegacyGovernedResults.filter(result => result.verification.status !== 'verified').length,
        sharedItemCount: sharedResults.length,
        sharedVerifiedCount: sharedResults.filter(result => result.verification.status === 'verified').length,
        sharedAdvisoryOrBlockedCount: sharedResults.filter(result => result.verification.status !== 'verified').length,
        actionRouteCount: routeResults.length,
        decisionGradeRouteCount: routeResults.filter(result => result.decisionGrade).length,
        unverifiedDecisionGradeRouteCount: unverifiedDecisionGradeRoutes.length,
        privateOrRawLeakFindings,
        stampApplied: Boolean(stamp),
      },
      counts: {
        governed: summarizeVerificationResults(governedResults.map(result => result.verification)),
        shared: summarizeVerificationResults(sharedResults.map(result => result.verification)),
        routes: summarizeVerificationResults(routeResults.map(result => result.verification)),
      },
      governedItems: governedResults.map(result => result.verification),
      sharedItems: sharedResults.map(result => result.verification),
      actionRoutes: routeResults.map(result => ({
        ...result.verification,
        decisionGrade: result.decisionGrade,
      })),
      blocked: [
        ...nonLegacyGovernedResults
          .filter(result => result.verification.status !== 'verified')
          .map(result => result.verification),
        ...unverifiedDecisionGradeRoutes.map(result => result.verification),
      ],
    }
  }

  async function rejectSharedCommunicationCandidatesByExtractionMethod({
    sourceId,
    candidateType,
    extractionMethods,
    actor = 'system',
    reason = 'Superseded by a newer extraction method.',
  } = {}) {
    const normalizedMethods = (Array.isArray(extractionMethods) ? extractionMethods : [extractionMethods])
      .map(value => String(value || '').trim())
      .filter(Boolean)

    if (!normalizedMethods.length) {
      throw new Error('At least one extraction method is required to reject shared communication candidates.')
    }

    const values = []
    const filters = [`status = 'pending'`]

    if (sourceId) {
      values.push(String(sourceId).trim())
      filters.push(`source_id = $${values.length}`)
    }

    if (candidateType) {
      values.push(String(candidateType).trim())
      filters.push(`candidate_type = $${values.length}`)
    }

    values.push(normalizedMethods)
    filters.push(`COALESCE(metadata->>'extractionMethod', '') = ANY($${values.length}::text[])`)

    values.push(
      JSON.stringify({
        rejectionActor: actor,
        rejectionReason: reason,
        rejectedByCleanup: true,
        rejectedAt: new Date().toISOString(),
      })
    )

    const patchParam = values.length
    const result = await pool.query(
      `
        UPDATE shared_communication_candidates
        SET status = 'rejected',
            metadata = COALESCE(metadata, '{}'::jsonb) || $${patchParam}::jsonb,
            updated_at = NOW()
        WHERE ${filters.join(' AND ')}
        RETURNING candidate_key
      `,
      values
    )

    return {
      rejected: result.rowCount || 0,
      candidateKeys: result.rows.map(row => row.candidate_key),
    }
  }

  async function rejectSharedCommunicationCandidatesForArtifacts({
    sourceId,
    candidateType,
    artifactIds,
    excludeCandidateKeys = [],
    extractionMethods,
    actor = 'system',
    reason = 'Superseded by a newer extraction method.',
  } = {}) {
    const normalizedMethods = (Array.isArray(extractionMethods) ? extractionMethods : [extractionMethods])
      .map(value => String(value || '').trim())
      .filter(Boolean)
    const normalizedArtifactIds = (Array.isArray(artifactIds) ? artifactIds : [artifactIds])
      .map(value => String(value || '').trim())
      .filter(Boolean)
    const normalizedExcludeCandidateKeys = (Array.isArray(excludeCandidateKeys) ? excludeCandidateKeys : [excludeCandidateKeys])
      .map(value => String(value || '').trim())
      .filter(Boolean)

    if (!normalizedMethods.length) {
      throw new Error('At least one extraction method is required to reject shared communication candidates.')
    }
    if (!normalizedArtifactIds.length) {
      return { rejected: 0, candidateKeys: [] }
    }

    const values = []
    const filters = [`status = 'pending'`]

    if (sourceId) {
      values.push(String(sourceId).trim())
      filters.push(`source_id = $${values.length}`)
    }

    if (candidateType) {
      values.push(String(candidateType).trim())
      filters.push(`candidate_type = $${values.length}`)
    }

    values.push(normalizedArtifactIds)
    filters.push(`artifact_id = ANY($${values.length}::text[])`)

    values.push(normalizedMethods)
    filters.push(`COALESCE(metadata->>'extractionMethod', '') = ANY($${values.length}::text[])`)

    if (normalizedExcludeCandidateKeys.length) {
      values.push(normalizedExcludeCandidateKeys)
      filters.push(`candidate_key <> ALL($${values.length}::text[])`)
    }

    values.push(
      JSON.stringify({
        rejectionActor: actor,
        rejectionReason: reason,
        rejectedByCleanup: true,
        rejectedAt: new Date().toISOString(),
      })
    )

    const patchParam = values.length
    const result = await pool.query(
      `
        UPDATE shared_communication_candidates
        SET status = 'rejected',
            metadata = COALESCE(metadata, '{}'::jsonb) || $${patchParam}::jsonb,
            updated_at = NOW()
        WHERE ${filters.join(' AND ')}
        RETURNING candidate_key
      `,
      values
    )

    return {
      rejected: result.rowCount || 0,
      candidateKeys: result.rows.map(row => row.candidate_key),
    }
  }

  async function updateSharedCommunicationCandidateStatus(
    candidateKey,
    status,
    actor = 'system',
    metadataPatch = {}
  ) {
    const normalizedStatus = String(status || '').trim()
    const allowedStatuses = new Set(['pending', 'approved', 'rejected', 'applied', 'duplicate'])
    if (!allowedStatuses.has(normalizedStatus)) {
      throw new Error(`Unsupported shared communication candidate status: ${normalizedStatus}`)
    }

    const result = await pool.query(
      `
        UPDATE shared_communication_candidates
        SET status = $2,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
            updated_at = NOW()
        WHERE candidate_key = $1
        RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                  title, summary, owner_hint, evidence_excerpt, confidence,
                  metadata, created_at, updated_at
      `,
      [
        candidateKey,
        normalizedStatus,
        JSON.stringify({
          ...metadataPatch,
          lastStatusActor: actor,
          lastStatusChangedAt: new Date().toISOString(),
        }),
      ]
    )

    const row = result.rows[0]
    if (!row) {
      throw new Error(`Shared communication candidate not found: ${candidateKey}`)
    }

    return mapSharedCommunicationCandidateRow(row)
  }

  async function applySharedCommunicationCandidateToBacklog(
    candidateKey,
    backlogInput = {},
    actor = 'system'
  ) {
    return withFoundationTransaction(async client => {
      const candidateResult = await client.query(
        `
          SELECT candidate_key, artifact_id, source_id, candidate_type, status,
                 title, summary, owner_hint, evidence_excerpt, confidence,
                 metadata, created_at, updated_at
          FROM shared_communication_candidates
          WHERE candidate_key = $1
          FOR UPDATE
        `,
        [candidateKey]
      )

      const candidateRow = candidateResult.rows[0]
      if (!candidateRow) {
        throw new Error(`Shared communication candidate not found: ${candidateKey}`)
      }

      const candidate = mapSharedCommunicationCandidateRow(candidateRow)
      ensureSharedCommunicationCandidateCanApply(candidate)
      if (candidate.candidateType !== 'task_candidate') {
        throw new Error(`Only task candidates can be applied to backlog right now: ${candidate.candidateType}`)
      }

      const backlogId = await getNextPrefixedId(client, 'backlog_items', backlogInput.idPrefix || 'SYSTEM')
      const scope = normalizeBacklogScopeKey(backlogInput.scope ?? backlogInput.team ?? 'foundation')
      const lane = backlogInput.lane || 'scoped'
      const priority = backlogInput.priority || 'P2'
      const source = backlogInput.source || `${candidate.sourceId} shared communications candidate`
      const owner = backlogInput.owner ?? candidate.ownerHint ?? null
      const whyItMatters =
        backlogInput.whyItMatters ||
        `Promoted from shared communications candidate ${candidate.candidateKey} so the work can move into the governed backlog.`
      const nextAction = backlogInput.nextAction || candidate.summary
      const statusNote = backlogInput.statusNote || `Applied from ${candidate.candidateKey}.`

      const backlogResult = await client.query(
        `
          INSERT INTO backlog_items (
            id, title, team, lane, priority, rank, source, summary,
            why_it_matters, next_action, status_note, owner
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          RETURNING *
        `,
        [
          backlogId,
          backlogInput.title || candidate.title,
          scope,
          lane,
          priority,
          backlogInput.rank ?? null,
          source,
          backlogInput.summary || candidate.summary,
          whyItMatters,
          nextAction,
          statusNote,
          owner,
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'backlog_created',
        entityTable: 'backlog_items',
        entityId: backlogId,
        actor,
        summary: `Created backlog item ${backlogId}: ${backlogInput.title || candidate.title}`,
        metadata: {
          lane,
          priority,
          scope,
          sourceCandidateKey: candidate.candidateKey,
        },
      })

      const appliedCandidateResult = await client.query(
        `
          UPDATE shared_communication_candidates
          SET status = 'applied',
              metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
          WHERE candidate_key = $1
          RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                    title, summary, owner_hint, evidence_excerpt, confidence,
                    metadata, created_at, updated_at
        `,
        [
          candidateKey,
          JSON.stringify({
            appliedBy: actor,
            appliedAt: new Date().toISOString(),
            appliedTarget: 'backlog_item',
            appliedTargetId: backlogId,
          }),
        ]
      )

      return {
        backlogItem: mapBacklogRow(backlogResult.rows[0]),
        candidate: mapSharedCommunicationCandidateRow(appliedCandidateResult.rows[0]),
      }
    })
  }

  async function applySharedCommunicationCandidateToDecision(
    candidateKey,
    decisionInput = {},
    actor = 'system'
  ) {
    return withFoundationTransaction(async client => {
      const candidateResult = await client.query(
        `
          SELECT candidate_key, artifact_id, source_id, candidate_type, status,
                 title, summary, owner_hint, evidence_excerpt, confidence,
                 metadata, created_at, updated_at
          FROM shared_communication_candidates
          WHERE candidate_key = $1
          FOR UPDATE
        `,
        [candidateKey]
      )

      const candidateRow = candidateResult.rows[0]
      if (!candidateRow) {
        throw new Error(`Shared communication candidate not found: ${candidateKey}`)
      }

      const candidate = mapSharedCommunicationCandidateRow(candidateRow)
      ensureSharedCommunicationCandidateCanApply(candidate)
      if (candidate.candidateType !== 'decision_candidate') {
        throw new Error(`Only decision candidates can be applied to decisions right now: ${candidate.candidateType}`)
      }

      const decisionId = await getNextPrefixedId(client, 'decisions', 'DEC')
      const category = normalizeDecisionCategory(decisionInput.category, 'execution')
      const supersedesIds = normalizeDecisionIdList(decisionInput.supersedesIds, decisionId)
      const participantNames = normalizeStringList(
        decisionInput.participantNames ?? candidate.metadata?.links?.participants ?? []
      )
      const decisionTitle = decisionInput.title || candidate.title
      const decisionSummary = decisionInput.summary || candidate.summary
      const rationale = Object.prototype.hasOwnProperty.call(decisionInput, 'rationale')
        ? (decisionInput.rationale ?? null)
        : candidate.summary
      const sourceRef =
        decisionInput.sourceRef ||
        `${candidate.sourceId} shared communications candidate ${candidate.candidateKey}`
      const decisionOwner = Object.prototype.hasOwnProperty.call(decisionInput, 'decisionOwner')
        ? (decisionInput.decisionOwner ?? null)
        : (candidate.ownerHint ?? null)
      const confirmedBy = Object.prototype.hasOwnProperty.call(decisionInput, 'confirmedBy')
        ? (decisionInput.confirmedBy ?? null)
        : null
      const contextRef = Object.prototype.hasOwnProperty.call(decisionInput, 'contextRef')
        ? (decisionInput.contextRef ?? null)
        : (candidate.metadata?.artifactTitle || candidate.artifactId || null)
      const evidenceNotes = Object.prototype.hasOwnProperty.call(decisionInput, 'evidenceNotes')
        ? (decisionInput.evidenceNotes ?? null)
        : (candidate.evidenceExcerpt || null)

      const decisionResult = await client.query(
        `
          INSERT INTO decisions (
            id, category, title, status, summary, rationale, source_ref,
            decision_owner, confirmed_by, participant_names, context_ref, evidence_notes,
            classified_at, classified_by, supersedes_ids
          )
          VALUES ($1,$2,$3,'proposed',$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13)
          RETURNING *
        `,
        [
          decisionId,
          category,
          decisionTitle,
          decisionSummary,
          rationale,
          sourceRef,
          decisionOwner,
          confirmedBy,
          participantNames,
          contextRef,
          evidenceNotes,
          actor,
          supersedesIds,
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'decision_proposed',
        entityTable: 'decisions',
        entityId: decisionId,
        actor,
        summary: `Proposed decision ${decisionId}: ${decisionTitle}`,
        metadata: {
          category,
          supersedesIds,
          decisionOwner,
          confirmedBy,
          participantNames,
          contextRef,
          sourceCandidateKey: candidate.candidateKey,
        },
      })

      const appliedCandidateResult = await client.query(
        `
          UPDATE shared_communication_candidates
          SET status = 'applied',
              metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
          WHERE candidate_key = $1
          RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                    title, summary, owner_hint, evidence_excerpt, confidence,
                    metadata, created_at, updated_at
        `,
        [
          candidateKey,
          JSON.stringify({
            appliedBy: actor,
            appliedAt: new Date().toISOString(),
            appliedTarget: 'decision',
            appliedTargetId: decisionId,
          }),
        ]
      )

      return {
        decision: mapDecisionRow(decisionResult.rows[0]),
        candidate: mapSharedCommunicationCandidateRow(appliedCandidateResult.rows[0]),
      }
    })
  }

  async function applySharedCommunicationCandidateToQuestion(
    candidateKey,
    questionInput = {},
    actor = 'system'
  ) {
    return withFoundationTransaction(async client => {
      const candidateResult = await client.query(
        `
          SELECT candidate_key, artifact_id, source_id, candidate_type, status,
                 title, summary, owner_hint, evidence_excerpt, confidence,
                 metadata, created_at, updated_at
          FROM shared_communication_candidates
          WHERE candidate_key = $1
          FOR UPDATE
        `,
        [candidateKey]
      )

      const candidateRow = candidateResult.rows[0]
      if (!candidateRow) {
        throw new Error(`Shared communication candidate not found: ${candidateKey}`)
      }

      const candidate = mapSharedCommunicationCandidateRow(candidateRow)
      ensureSharedCommunicationCandidateCanApply(candidate)
      if (candidate.candidateType !== 'blocker') {
        throw new Error(`Only blocker candidates can be applied to open questions right now: ${candidate.candidateType}`)
      }

      const questionId = await getNextPrefixedId(client, 'open_questions', 'Q')
      const questionTitle = questionInput.title || candidate.title
      const questionSummary = questionInput.summary || candidate.summary
      const questionOwner = Object.prototype.hasOwnProperty.call(questionInput, 'owner')
        ? (questionInput.owner ?? null)
        : (candidate.ownerHint ?? null)

      const questionResult = await client.query(
        `
          INSERT INTO open_questions (
            id, title, summary, owner, status
          )
          VALUES ($1,$2,$3,$4,'open')
          RETURNING *
        `,
        [questionId, questionTitle, questionSummary, questionOwner]
      )

      await insertChangeEvent(client, {
        eventType: 'question_created',
        entityTable: 'open_questions',
        entityId: questionId,
        actor,
        summary: `Opened question ${questionId}: ${questionTitle}`,
        metadata: {
          sourceCandidateKey: candidate.candidateKey,
        },
      })

      const appliedCandidateResult = await client.query(
        `
          UPDATE shared_communication_candidates
          SET status = 'applied',
              metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
          WHERE candidate_key = $1
          RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                    title, summary, owner_hint, evidence_excerpt, confidence,
                    metadata, created_at, updated_at
        `,
        [
          candidateKey,
          JSON.stringify({
            appliedBy: actor,
            appliedAt: new Date().toISOString(),
            appliedTarget: 'open_question',
            appliedTargetId: questionId,
          }),
        ]
      )

      return {
        question: mapOpenQuestionRow(questionResult.rows[0]),
        candidate: mapSharedCommunicationCandidateRow(appliedCandidateResult.rows[0]),
      }
    })
  }



  return {
    getSharedCommunicationSourceStats,
    getSharedCommunicationExistingExternalIds,
    getSharedCommunicationExistingArtifactsByExternalId,
    getSharedCommunicationArchiveSnapshot,
    searchSharedCommunicationArtifactsForContext,
    getSharedCommunicationArtifactsForProcessing,
    getSharedCommunicationArtifactsWithoutCandidatesForProcessing,
    recordSharedCommunicationArtifactProcessingRun,
    getSharedCommunicationProcessingProvenanceGaps,
    upsertSharedCommunicationArtifact,
    getSharedCommunicationCandidateSnapshot,
    upsertSharedCommunicationCandidate,
    recordSharedCommunicationSynthesisRun,
    getSharedCommunicationSynthesisSnapshot,
    buildSynthesisVerificationDbReport,
    rejectSharedCommunicationCandidatesByExtractionMethod,
    rejectSharedCommunicationCandidatesForArtifacts,
    updateSharedCommunicationCandidateStatus,
    applySharedCommunicationCandidateToBacklog,
    applySharedCommunicationCandidateToDecision,
    applySharedCommunicationCandidateToQuestion,
  }
}

export function evaluateFoundationSharedCommsStoreSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  beforeLines = FOUNDATION_SHARED_COMMS_STORE_SPLIT_BEFORE_LINES,
  afterLines = null,
} = {}) {
  const checks = []
  const dbLines = afterLines == null ? countTextLines(foundationDbSource) : Number(afterLines || 0)

  addEvaluationCheck(checks, moduleSource.includes('export function createFoundationSharedCommunicationStore'), 'shared-comms store factory is exported', 'createFoundationSharedCommunicationStore')
  addEvaluationCheck(checks, moduleSource.includes('function mapSharedCommunicationArtifactRow'), 'artifact mapper moved into store module', 'mapSharedCommunicationArtifactRow')
  addEvaluationCheck(checks, moduleSource.includes('async function upsertSharedCommunicationArtifact'), 'artifact write path moved into store module', 'upsertSharedCommunicationArtifact')
  addEvaluationCheck(checks, moduleSource.includes('async function applySharedCommunicationCandidateToBacklog'), 'candidate apply write path moved into store module', 'applySharedCommunicationCandidateToBacklog')
  addEvaluationCheck(checks, moduleSource.includes('async function buildSynthesisVerificationDbReport'), 'synthesis verification DB report moved into store module', 'buildSynthesisVerificationDbReport')
  addEvaluationCheck(checks, moduleSource.includes('FOR UPDATE') && moduleSource.includes('insertChangeEvent'), 'transaction and change-event behavior preserved in module', 'FOR UPDATE + insertChangeEvent')
  addEvaluationCheck(checks, foundationDbSource.includes("./foundation-shared-comms-store.js"), 'foundation-db imports shared-comms store module', './foundation-shared-comms-store.js')
  addEvaluationCheck(checks, foundationDbSource.includes('const foundationSharedCommunicationStore = createFoundationSharedCommunicationStore({'), 'foundation-db wires shared-comms store factory', 'factory wiring present')
  addEvaluationCheck(checks, foundationDbSource.includes('export const getSharedCommunicationArchiveSnapshot = foundationSharedCommunicationStore.getSharedCommunicationArchiveSnapshot'), 'archive export delegates to store', 'getSharedCommunicationArchiveSnapshot delegate')
  addEvaluationCheck(checks, foundationDbSource.includes('export const upsertSharedCommunicationArtifact = foundationSharedCommunicationStore.upsertSharedCommunicationArtifact'), 'artifact write export delegates to store', 'upsertSharedCommunicationArtifact delegate')
  addEvaluationCheck(checks, foundationDbSource.includes('export const applySharedCommunicationCandidateToBacklog = foundationSharedCommunicationStore.applySharedCommunicationCandidateToBacklog'), 'backlog apply export delegates to store', 'applySharedCommunicationCandidateToBacklog delegate')
  addEvaluationCheck(checks, !foundationDbSource.includes('function mapSharedCommunicationArtifactRow'), 'old inline artifact mapper is absent from foundation-db.js', 'mapper removed')
  addEvaluationCheck(checks, !foundationDbSource.includes('export async function getSharedCommunicationArchiveSnapshot'), 'old inline archive export is absent from foundation-db.js', 'archive removed')
  addEvaluationCheck(checks, !foundationDbSource.includes('export async function upsertSharedCommunicationArtifact'), 'old inline artifact write export is absent from foundation-db.js', 'artifact write removed')
  addEvaluationCheck(checks, !foundationDbSource.includes('export async function applySharedCommunicationCandidateToBacklog'), 'old inline candidate apply export is absent from foundation-db.js', 'candidate apply removed')
  addEvaluationCheck(checks, scriptSource.includes('dogfood rejects old inline shared-comms store ownership'), 'focused proof has dogfood assertion', 'dogfood phrase present')
  addEvaluationCheck(checks, planSource.includes('split/extraction plan'), 'plan documents split/extraction posture', FOUNDATION_SHARED_COMMS_STORE_SPLIT_PLAN_PATH)
  addEvaluationCheck(checks, dbLines > 0 && dbLines < Number(beforeLines || FOUNDATION_SHARED_COMMS_STORE_SPLIT_BEFORE_LINES), 'foundation-db.js line count decreased', String(beforeLines) + '->' + String(dbLines))

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    beforeLines: Number(beforeLines || FOUNDATION_SHARED_COMMS_STORE_SPLIT_BEFORE_LINES),
    afterLines: dbLines,
  }
}

function createSyntheticArtifactRow(overrides = {}) {
  return {
    artifact_id: 'SRC-MISSIVE-001:thread-1',
    source_id: 'SRC-MISSIVE-001',
    artifact_type: 'missive_thread',
    external_id: 'thread-1',
    title: 'Steve listing follow up',
    source_account: 'steve@example.com',
    source_container: 'Inbox',
    source_url: 'https://example.test/thread-1',
    participants: ['Steve', 'Tanner'],
    content_text: 'Steve asked Tanner to fix the listing follow up and price adjustment visibility.',
    content_hash: 'hash-1',
    artifact_created_at: '2026-05-15T12:00:00.000Z',
    artifact_updated_at: '2026-05-15T12:30:00.000Z',
    metadata: { synthetic: true },
    ingested_by: 'synthetic-proof',
    ingested_at: '2026-05-15T12:35:00.000Z',
    updated_at: '2026-05-15T12:35:00.000Z',
    ...overrides,
  }
}

function createSyntheticCandidateRow(overrides = {}) {
  return {
    candidate_key: 'candidate-1',
    artifact_id: 'SRC-MISSIVE-001:thread-1',
    source_id: 'SRC-MISSIVE-001',
    candidate_type: 'task_candidate',
    status: 'pending',
    title: 'Fix listing follow-up visibility',
    summary: 'Make adjusted-price visibility trustworthy in the Sales Hub.',
    owner_hint: 'Sales',
    evidence_excerpt: 'price adjustment visibility',
    confidence: 0.91,
    metadata: { extractionMethod: 'synthetic-proof' },
    created_at: '2026-05-15T12:40:00.000Z',
    updated_at: '2026-05-15T12:40:00.000Z',
    ...overrides,
  }
}

function createSyntheticPoolAndClient(events = []) {
  const artifactRow = createSyntheticArtifactRow()
  const candidateRow = createSyntheticCandidateRow()
  const query = async (sql) => {
    const text = String(sql || '')
    if (text.includes('COUNT(*)::integer AS artifacts')) {
      return { rows: [{ artifacts: 3, latest_artifact_updated_at: artifactRow.artifact_updated_at, latest_ingested_at: artifactRow.ingested_at }] }
    }
    if (text.includes('SELECT external_id') && text.includes('external_id = ANY')) {
      return { rows: [{ external_id: 'thread-1' }] }
    }
    if (text.includes('SELECT external_id, artifact_updated_at, ingested_at, content_hash')) {
      return { rows: [{ external_id: 'thread-1', artifact_updated_at: artifactRow.artifact_updated_at, ingested_at: artifactRow.ingested_at, content_hash: artifactRow.content_hash }] }
    }
    if (text.includes('SELECT source_id, artifact_type, COUNT(*)::int AS total')) {
      return { rows: [{ source_id: 'SRC-MISSIVE-001', artifact_type: 'missive_thread', total: 3 }] }
    }
    if (text.includes('FROM shared_communication_artifacts') && text.includes('ORDER BY COALESCE(artifact_updated_at, ingested_at)')) {
      return { rows: [artifactRow] }
    }
    if (text.includes('SELECT candidate_type, status, COUNT(*)::int AS total')) {
      return { rows: [{ candidate_type: 'task_candidate', status: 'pending', total: 1 }] }
    }
    if (text.includes('FROM shared_communication_candidates') && text.includes('ORDER BY updated_at DESC')) {
      return { rows: [candidateRow] }
    }
    if (text.includes('UPDATE shared_communication_candidates') && text.includes('lastStatusActor')) {
      return { rows: [createSyntheticCandidateRow({ status: 'approved' })] }
    }
    if (text.includes('INSERT INTO shared_communication_candidates')) {
      return { rows: [candidateRow] }
    }
    throw new Error('Unexpected synthetic pool query: ' + text.slice(0, 140))
  }
  const client = {
    async query(sql) {
      const text = String(sql || '')
      if (text.includes('INSERT INTO shared_communication_artifacts')) {
        return { rows: [artifactRow] }
      }
      if (text.includes('SELECT candidate_key') && text.includes('FOR UPDATE')) {
        return { rows: [candidateRow] }
      }
      if (text.includes('INSERT INTO backlog_items')) {
        return { rows: [{ id: 'SYSTEM-100', title: candidateRow.title, team: 'foundation', lane: 'scoped', priority: 'P2', rank: null, source: 'synthetic', summary: candidateRow.summary, why_it_matters: 'Synthetic proof', next_action: candidateRow.summary, status_note: 'Synthetic proof', owner: 'Sales', created_at: '2026-05-15T12:45:00.000Z', updated_at: '2026-05-15T12:45:00.000Z' }] }
      }
      if (text.includes('UPDATE shared_communication_candidates') && text.includes("SET status = 'applied'")) {
        return { rows: [createSyntheticCandidateRow({ status: 'applied', metadata: { appliedTargetId: 'SYSTEM-100' } })] }
      }
      return query(sql)
    },
  }
  return {
    pool: { query },
    client,
    withFoundationTransaction: async work => work(client),
    insertChangeEvent: async (_client, event) => events.push(event),
  }
}

export async function buildSyntheticSharedCommsStoreBehaviorProof() {
  const events = []
  const synthetic = createSyntheticPoolAndClient(events)
  const store = createFoundationSharedCommunicationStore({
    pool: synthetic.pool,
    withFoundationTransaction: synthetic.withFoundationTransaction,
    getNextPrefixedId: async () => 'SYSTEM-100',
    normalizeBacklogScopeKey: value => String(value || '').trim() || 'foundation',
    mapBacklogRow: row => ({ id: row.id, title: row.title, scope: row.team, team: row.team, lane: row.lane, priority: row.priority }),
    normalizeDecisionCategory: value => String(value || 'execution'),
    normalizeDecisionIdList: () => [],
    normalizeStringList: value => Array.isArray(value) ? value : [],
    mapDecisionRow: row => row,
    mapOpenQuestionRow: row => row,
    insertChangeEvent: synthetic.insertChangeEvent,
    getRegisteredSourceIds: () => ['SRC-MISSIVE-001'],
  })

  const stats = await store.getSharedCommunicationSourceStats('SRC-MISSIVE-001')
  const ids = await store.getSharedCommunicationExistingExternalIds({ sourceId: 'SRC-MISSIVE-001', artifactType: 'missive_thread', externalIds: ['thread-1', 'thread-2'] })
  const archive = await store.getSharedCommunicationArchiveSnapshot({ sourceId: 'SRC-MISSIVE-001', limit: 2, includeSensitive: true })
  const search = await store.searchSharedCommunicationArtifactsForContext({ query: 'Steve price adjustment visibility', limit: 2 })
  const candidates = await store.getSharedCommunicationCandidateSnapshot({ status: 'pending' })
  const artifact = await store.upsertSharedCommunicationArtifact({ sourceId: 'SRC-MISSIVE-001', artifactType: 'missive_thread', externalId: 'thread-1', title: 'Steve listing follow up' }, 'synthetic-proof')
  const applied = await store.applySharedCommunicationCandidateToBacklog('candidate-1', { source: 'synthetic', whyItMatters: 'Synthetic proof', statusNote: 'Synthetic proof' }, 'synthetic-proof')

  const checks = []
  addEvaluationCheck(checks, stats.artifacts === 3, 'source stats query is preserved', JSON.stringify(stats))
  addEvaluationCheck(checks, ids.has('thread-1'), 'existing external id query is preserved', Array.from(ids).join(','))
  addEvaluationCheck(checks, archive.totalArtifacts === 3 && archive.items[0]?.title === 'Steve listing follow up', 'archive snapshot mapping is preserved', JSON.stringify(archive))
  addEvaluationCheck(checks, search[0]?.matchedTerms?.includes('price') && search[0]?.excerpt, 'context search relevance is preserved', JSON.stringify(search[0] || {}))
  addEvaluationCheck(checks, candidates.totalCandidates === 1 && candidates.items[0]?.candidateKey === 'candidate-1', 'candidate snapshot mapping is preserved', JSON.stringify(candidates))
  addEvaluationCheck(checks, artifact.artifactId === 'SRC-MISSIVE-001:thread-1', 'artifact upsert write mapping is preserved', JSON.stringify(artifact))
  addEvaluationCheck(checks, applied.backlogItem?.id === 'SYSTEM-100' && applied.candidate?.status === 'applied' && events.length === 1, 'candidate-to-backlog transaction is preserved', JSON.stringify(applied))
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, checks, failed }
}

export async function buildFoundationSharedCommsStoreSplitDogfoodProof(input = {}) {
  const healthy = evaluateFoundationSharedCommsStoreSplit(input)
  const missingModule = evaluateFoundationSharedCommsStoreSplit({ ...input, moduleSource: '' })
  const oldInlineArchive = evaluateFoundationSharedCommsStoreSplit({
    ...input,
    foundationDbSource: String(input.foundationDbSource || '') + '\nexport async function getSharedCommunicationArchiveSnapshot() {}',
  })
  const missingDelegate = evaluateFoundationSharedCommsStoreSplit({
    ...input,
    foundationDbSource: String(input.foundationDbSource || '').replace('export const upsertSharedCommunicationArtifact = foundationSharedCommunicationStore.upsertSharedCommunicationArtifact', ''),
  })
  const weakPlan = evaluateFoundationSharedCommsStoreSplit({
    ...input,
    planSource: String(input.planSource || '').replace('split/extraction plan', 'split plan'),
  })
  const syntheticBehavior = await buildSyntheticSharedCommsStoreBehaviorProof()

  const rejected = {
    missingModule: missingModule.ok === false,
    oldInlineArchive: oldInlineArchive.ok === false,
    missingDelegate: missingDelegate.ok === false,
    weakPlan: weakPlan.ok === false,
  }

  return {
    ok: healthy.ok === true && syntheticBehavior.ok === true && Object.values(rejected).every(Boolean),
    healthy,
    rejected,
    syntheticBehavior,
    invariant: 'The shared-comms store split accepts delegated ownership and rejects missing modules, old inline exports, missing delegates, and weak split plans.',
  }
}
