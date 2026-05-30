import { createIntelligenceActionRouterStore } from './intelligence-action-router.js'
import { createIntelligenceAtomStore } from './intelligence-atoms.js'
import { createIntelligenceRetrievalStore } from './intelligence-retrieval.js'
import { createIntelligenceSynthesisFactStore } from './intelligence-synthesis-facts.js'
import { createIntelligenceSynthesisStore } from './intelligence-synthesis.js'
import { getSourceContracts } from './source-contracts.js'
import {
  foundationPoolHandle as pool,
  insertChangeEvent,
  withFoundationTransaction,
} from './foundation-db-core.js'
import {
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
} from './foundation-strategy-docs-db.js'

function getRegisteredSourceContractIds() {
  return getSourceContracts().map(source => source.sourceId || source.id).filter(Boolean)
}

function mapIntelligenceJobRunRow(row) {
  return {
    jobId: row.job_id,
    jobType: row.job_type,
    sourceId: row.source_id || null,
    artifactId: row.artifact_id || null,
    foundationRunId: row.foundation_run_id || null,
    sourceCrawlRunId: row.source_crawl_run_id || null,
    synthesisRunId: row.synthesis_run_id || null,
    status: row.status,
    cursorState: row.cursor_state || {},
    budget: row.budget || {},
    model: row.model || null,
    provider: row.provider || null,
    authPath: row.auth_path || null,
    routeKey: row.route_key || null,
    costUsd: row.cost_usd == null ? null : Number(row.cost_usd),
    itemCounts: row.item_counts || {},
    failureCount: Number(row.failure_count || 0),
    outputArtifactIds: Array.isArray(row.output_artifact_ids) ? row.output_artifact_ids : [],
    nextRunState: row.next_run_state || {},
    resultSummary: row.result_summary || {},
    errorMessage: row.error_message || null,
    provenance: row.provenance || {},
    llmCallIds: Array.isArray(row.llm_call_ids) ? row.llm_call_ids.filter(Boolean) : [],
    startedAt: row.started_at?.toISOString?.() || row.started_at || null,
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function normalizeIntelligenceJobStatus(status) {
  const normalized = String(status || 'started').trim()
  const allowed = new Set(['planned', 'started', 'succeeded', 'failed', 'skipped'])
  if (!allowed.has(normalized)) throw new Error(`Invalid intelligence job status: ${normalized}`)
  return normalized
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean)
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

const intelligenceAtomStore = createIntelligenceAtomStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getRegisteredSourceIds: getRegisteredSourceContractIds,
})

export const upsertIntelligenceReportArtifact = (...args) => intelligenceAtomStore.upsertIntelligenceReportArtifact(...args)
export const upsertIntelligenceAtom = (...args) => intelligenceAtomStore.upsertIntelligenceAtom(...args)
export const recordIntelligenceAtomHit = (...args) => intelligenceAtomStore.recordIntelligenceAtomHit(...args)
export const queryIntelligenceAtomsForScoper = (...args) => intelligenceAtomStore.queryIntelligenceAtomsForScoper(...args)
export const getIntelligenceAtomSpineSnapshot = (...args) => intelligenceAtomStore.getIntelligenceAtomSpineSnapshot(...args)
export const getIntelligenceReportBundle = (...args) => intelligenceAtomStore.getIntelligenceReportBundle(...args)

export async function listYoutubeFullWatchReportArtifacts({ limit = 500 } = {}) {
  const boundedLimit = Math.max(1, Math.min(1000, Number(limit) || 500))
  const result = await pool.query(
    `
      SELECT report_artifact_id AS "reportArtifactId",
             report_type AS "reportType",
             status,
             source_ids AS "sourceIds",
             structured_output_json AS "structuredOutputJson",
             metadata,
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM intelligence_report_artifacts
      WHERE metadata->>'fullWatchRoute' = 'gemini_api_youtube_url_video_understanding'
         OR metadata->>'proofMode' = 'youtube_latest_20_god_mode_api_full_watch'
         OR report_artifact_id LIKE 'batch:youtube-latest-20:api-full-watch-v1:%'
         OR report_artifact_id LIKE 'batch:youtube-long-course:api-full-watch-v1:%'
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT $1
    `,
    [boundedLimit],
  )
  return result.rows
}

const intelligenceRetrievalStore = createIntelligenceRetrievalStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getRegisteredSourceIds: getRegisteredSourceContractIds,
  upsertIntelligenceReportArtifact,
  upsertIntelligenceAtom,
  recordIntelligenceAtomHit,
  queryIntelligenceAtomsForScoper,
})

export const promoteSharedCommunicationCandidatesToAtoms = (...args) => intelligenceRetrievalStore.promoteSharedCommunicationCandidatesToAtoms(...args)
export const searchIntelligenceEvidenceHybrid = (...args) => intelligenceRetrievalStore.searchIntelligenceEvidenceHybrid(...args)
export const searchIntelligenceChunks = (...args) => intelligenceRetrievalStore.searchIntelligenceChunks(...args)
export const searchIntelligenceChunksSemantic = (...args) => intelligenceRetrievalStore.searchIntelligenceChunksSemantic(...args)
export const selectRetrievalChunksForEmbedding = (...args) => intelligenceRetrievalStore.selectRetrievalChunksForEmbedding(...args)
export const upsertRetrievalChunkEmbedding = (...args) => intelligenceRetrievalStore.upsertRetrievalChunkEmbedding(...args)
export const buildRetrievalEmbeddingInput = (...args) => intelligenceRetrievalStore.buildRetrievalEmbeddingInput(...args)
export const upsertRetrievalChunk = (...args) => intelligenceRetrievalStore.upsertRetrievalChunk(...args)
export const recordRetrievalRun = (...args) => intelligenceRetrievalStore.recordRetrievalRun(...args)
export const getIntelligenceRetrievalSnapshot = (...args) => intelligenceRetrievalStore.getIntelligenceRetrievalSnapshot(...args)

const intelligenceSynthesisFactStore = createIntelligenceSynthesisFactStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getRegisteredSourceIds: getRegisteredSourceContractIds,
  getSourceContracts,
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
  searchIntelligenceEvidenceHybrid,
})

export const collectSourceBackedSynthesisFacts = (...args) => intelligenceSynthesisFactStore.collectSourceBackedSynthesisFacts(...args)
export const upsertSynthesisFactsBundle = (...args) => intelligenceSynthesisFactStore.upsertSynthesisFactsBundle(...args)
export const querySynthesisFacts = (...args) => intelligenceSynthesisFactStore.querySynthesisFacts(...args)
export const getSynthesisFactsSnapshot = (...args) => intelligenceSynthesisFactStore.getSynthesisFactsSnapshot(...args)

const intelligenceSynthesisStore = createIntelligenceSynthesisStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  querySynthesisFacts,
})

export const runGovernedSynthesis = (...args) => intelligenceSynthesisStore.runGovernedSynthesis(...args)
export const getSynthesisEngineSnapshot = (...args) => intelligenceSynthesisStore.getSynthesisEngineSnapshot(...args)

const intelligenceActionRouterStore = createIntelligenceActionRouterStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
})

export const proposeActionRoutes = (...args) => intelligenceActionRouterStore.proposeActionRoutes(...args)
export const approveActionRoute = (...args) => intelligenceActionRouterStore.approveActionRoute(...args)
export const applyApprovedActionRoute = (...args) => intelligenceActionRouterStore.applyApprovedActionRoute(...args)
export const getActionRoute = (...args) => intelligenceActionRouterStore.getActionRoute(...args)
export const getActionRouterSnapshot = (...args) => intelligenceActionRouterStore.getActionRouterSnapshot(...args)
export const rejectActionRoute = (...args) => intelligenceActionRouterStore.rejectActionRoute(...args)
export const rerouteActionRoute = (...args) => intelligenceActionRouterStore.rerouteActionRoute(...args)

export async function upsertIntelligenceJobRun(input = {}, actor = 'system') {
  const jobId = String(input.jobId || input.job_id || '').trim()
  const jobType = String(input.jobType || input.job_type || '').trim()
  if (!jobId || !jobType) throw new Error('jobId and jobType are required for intelligence job runs.')

  const status = normalizeIntelligenceJobStatus(input.status)
  const outputArtifactIds = normalizeTextArray(input.outputArtifactIds || input.output_artifact_ids)
  const llmCallIds = normalizeTextArray(input.llmCallIds || input.llm_call_ids)

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO intelligence_job_runs (
          job_id, job_type, source_id, artifact_id, foundation_run_id,
          source_crawl_run_id, synthesis_run_id, status, cursor_state,
          budget, model, provider, auth_path, route_key, cost_usd,
          item_counts, failure_count, output_artifact_ids, next_run_state,
          result_summary, error_message, provenance, started_at, finished_at,
          duration_ms
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9::jsonb,
          $10::jsonb,$11,$12,$13,$14,$15,
          $16::jsonb,$17,$18::text[],$19::jsonb,
          $20::jsonb,$21,$22::jsonb,$23,$24,
          $25
        )
        ON CONFLICT (job_id) DO UPDATE SET
          job_type = EXCLUDED.job_type,
          source_id = EXCLUDED.source_id,
          artifact_id = EXCLUDED.artifact_id,
          foundation_run_id = EXCLUDED.foundation_run_id,
          source_crawl_run_id = EXCLUDED.source_crawl_run_id,
          synthesis_run_id = EXCLUDED.synthesis_run_id,
          status = EXCLUDED.status,
          cursor_state = EXCLUDED.cursor_state,
          budget = EXCLUDED.budget,
          model = EXCLUDED.model,
          provider = EXCLUDED.provider,
          auth_path = EXCLUDED.auth_path,
          route_key = EXCLUDED.route_key,
          cost_usd = EXCLUDED.cost_usd,
          item_counts = EXCLUDED.item_counts,
          failure_count = EXCLUDED.failure_count,
          output_artifact_ids = EXCLUDED.output_artifact_ids,
          next_run_state = EXCLUDED.next_run_state,
          result_summary = EXCLUDED.result_summary,
          error_message = EXCLUDED.error_message,
          provenance = EXCLUDED.provenance,
          started_at = EXCLUDED.started_at,
          finished_at = EXCLUDED.finished_at,
          duration_ms = EXCLUDED.duration_ms,
          updated_at = NOW()
        RETURNING job_id, job_type, source_id, artifact_id, foundation_run_id,
                  source_crawl_run_id, synthesis_run_id, status, cursor_state,
                  budget, model, provider, auth_path, route_key, cost_usd,
                  item_counts, failure_count, output_artifact_ids, next_run_state,
                  result_summary, error_message, provenance, started_at,
                  finished_at, duration_ms, created_at, updated_at,
                  ARRAY[]::text[] AS llm_call_ids
      `,
      [
        jobId,
        jobType,
        input.sourceId == null ? null : String(input.sourceId).trim(),
        input.artifactId == null ? null : String(input.artifactId).trim(),
        input.foundationRunId == null ? null : String(input.foundationRunId).trim(),
        input.sourceCrawlRunId == null ? null : String(input.sourceCrawlRunId).trim(),
        input.synthesisRunId == null ? null : String(input.synthesisRunId).trim(),
        status,
        JSON.stringify(input.cursorState || {}),
        JSON.stringify(input.budget || {}),
        input.model == null ? null : String(input.model).trim(),
        input.provider == null ? null : String(input.provider).trim(),
        input.authPath == null ? null : String(input.authPath).trim(),
        input.routeKey == null ? null : String(input.routeKey).trim(),
        input.costUsd == null ? null : Number(input.costUsd),
        JSON.stringify(input.itemCounts || {}),
        Number(input.failureCount || 0),
        outputArtifactIds,
        JSON.stringify(input.nextRunState || {}),
        JSON.stringify(input.resultSummary || {}),
        input.errorMessage == null ? null : String(input.errorMessage).trim(),
        JSON.stringify({
          ...(input.provenance || {}),
          recordedBy: actor,
        }),
        input.startedAt || null,
        input.finishedAt || null,
        input.durationMs == null ? null : Number(input.durationMs),
      ]
    )

    await client.query('DELETE FROM intelligence_job_llm_calls WHERE job_id = $1', [jobId])
    for (const callId of llmCallIds) {
      await client.query(
        `
          INSERT INTO intelligence_job_llm_calls (job_id, call_id, relationship, metadata)
          VALUES ($1,$2,$3,$4::jsonb)
          ON CONFLICT (job_id, call_id) DO UPDATE SET
            relationship = EXCLUDED.relationship,
            metadata = EXCLUDED.metadata
        `,
        [
          jobId,
          callId,
          String(input.llmCallRelationship || 'used').trim(),
          JSON.stringify(input.llmCallMetadata || {}),
        ]
      )
    }

    await insertChangeEvent(client, {
      eventType: 'intelligence_job_run_recorded',
      entityTable: 'intelligence_job_runs',
      entityId: jobId,
      actor,
      summary: `${jobType} intelligence job ${status}`,
      metadata: {
        jobId,
        jobType,
        status,
        sourceId: input.sourceId || null,
        foundationRunId: input.foundationRunId || null,
        sourceCrawlRunId: input.sourceCrawlRunId || null,
        synthesisRunId: input.synthesisRunId || null,
      },
    })

    return {
      ...mapIntelligenceJobRunRow(result.rows[0]),
      llmCallIds,
    }
  })
}

export async function getIntelligenceJobLedgerSnapshot({ limit = 20 } = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const [runsResult, summaryResult] = await Promise.all([
    pool.query(
      `
        SELECT jobs.job_id, jobs.job_type, jobs.source_id, jobs.artifact_id,
               jobs.foundation_run_id, jobs.source_crawl_run_id, jobs.synthesis_run_id,
               jobs.status, jobs.cursor_state, jobs.budget, jobs.model, jobs.provider,
               jobs.auth_path, jobs.route_key, jobs.cost_usd, jobs.item_counts,
               jobs.failure_count, jobs.output_artifact_ids, jobs.next_run_state,
               jobs.result_summary, jobs.error_message, jobs.provenance,
               jobs.started_at, jobs.finished_at, jobs.duration_ms,
               jobs.created_at, jobs.updated_at,
               COALESCE(array_agg(links.call_id ORDER BY links.created_at) FILTER (WHERE links.call_id IS NOT NULL), ARRAY[]::text[]) AS llm_call_ids
        FROM intelligence_job_runs jobs
        LEFT JOIN intelligence_job_llm_calls links ON links.job_id = jobs.job_id
        GROUP BY jobs.job_id
        ORDER BY jobs.created_at DESC
        LIMIT $1
      `,
      [normalizedLimit]
    ),
    pool.query(`
      SELECT status, job_type, COUNT(*)::integer AS total
      FROM intelligence_job_runs
      GROUP BY status, job_type
      ORDER BY status ASC, job_type ASC
    `),
  ])

  const recentRuns = runsResult.rows.map(mapIntelligenceJobRunRow)
  const byStatus = {}
  const byType = {}
  let totalRuns = 0
  for (const row of summaryResult.rows) {
    const count = Number(row.total || 0)
    totalRuns += count
    byStatus[row.status] = (byStatus[row.status] || 0) + count
    byType[row.job_type] = (byType[row.job_type] || 0) + count
  }

  return {
    generatedAt: new Date().toISOString(),
    totalRuns,
    byStatus,
    byType,
    recentRuns,
  }
}

export async function recordActionRouteCuration(routeId, input = {}, actor = 'foundation-review-sprint') {
  const normalizedRouteId = String(routeId || '').trim()
  if (!normalizedRouteId) throw new Error('routeId is required for action-route curation.')

  return withFoundationTransaction(async client => {
    const routeResult = await client.query(
      `SELECT * FROM intelligence_action_routes WHERE route_id = $1 FOR UPDATE`,
      [normalizedRouteId]
    )
    const route = routeResult.rows[0]
    if (!route) throw new Error(`Action route not found: ${normalizedRouteId}`)
    if (route.approval_status === 'applied' && input.applyAllowedWithoutSteve !== true) {
      throw new Error(`Refusing to curate already-applied route without explicit apply allowance: ${normalizedRouteId}`)
    }

    const curation = {
      closeoutKey: String(input.closeoutKey || '').trim(),
      disposition: String(input.disposition || '').trim(),
      recommendation: String(input.recommendation || '').trim(),
      reviewedOnly: input.reviewedOnly !== false,
      foundationHousekeeping: Boolean(input.foundationHousekeeping),
      businessSideEffect: Boolean(input.businessSideEffect),
      applyAllowedWithoutSteve: Boolean(input.applyAllowedWithoutSteve),
      externalSideEffectAllowed: Boolean(input.externalSideEffectAllowed),
      reviewedBy: String(input.reviewedBy || actor).trim(),
      reviewedAt: input.reviewedAt || new Date().toISOString(),
    }
    const promotionWorkflow =
      input.promotionWorkflow && typeof input.promotionWorkflow === 'object' && !Array.isArray(input.promotionWorkflow)
        ? input.promotionWorkflow
        : null
    const metadataPatch = { foundation1100Review: curation }
    if (promotionWorkflow) metadataPatch.actionRoutePromotionWorkflow = promotionWorkflow

    const updatedResult = await client.query(
      `
        UPDATE intelligence_action_routes
        SET metadata = metadata || $2::jsonb,
            updated_at = NOW()
        WHERE route_id = $1
        RETURNING *
      `,
      [
        normalizedRouteId,
        JSON.stringify(metadataPatch),
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'intelligence_action_route_curated',
      entityTable: 'intelligence_action_routes',
      entityId: normalizedRouteId,
      actor,
      summary: `Curated action route ${normalizedRouteId} for ${curation.closeoutKey}`,
      metadata: {
        closeoutKey: curation.closeoutKey,
        disposition: curation.disposition,
        reviewedOnly: curation.reviewedOnly,
      },
    })

    return updatedResult.rows[0]
  })
}
