import { getSourceContracts } from './source-contracts.js'
import { getFoundationSurfaceMap } from './foundation-surface-map.js'
import { buildCardReferenceTrustStatus } from './card-reference-trust.js'
import { buildSourceReferenceTrustStatus } from './source-reference-trust.js'
import {
  buildDecisionReviewSnapshot,
  buildDecisionTraceabilitySnapshot,
  createFoundationDecisionStore,
  mapDecisionRow,
  mapOpenQuestionRow,
  mapPendingDocUpdateRow,
} from './foundation-decision-store.js'
import {
  AGENT_ENGINE_DOC_PATH,
  BHAG_DOC_PATH,
  getLiveAgentEngineSourceSnapshot,
  getLiveBhagSourceSnapshot,
} from './foundation-strategy-source-snapshots.js'
import {
  getStrategyOperatingTruthSnapshot as getStrategyOperatingTruthSnapshotFromSources,
} from './foundation-strategy-operating-truth.js'
import {
  getStrategyGoalTruthSnapshot as getStrategyGoalTruthSnapshotFromSources,
  getStrategyPreworkCoverageSnapshot as getStrategyPreworkCoverageSnapshotFromSources,
} from './foundation-strategy-goal-truth.js'
import {
  getBusinessAtomDashboardSnapshotFromDb,
} from './strategy-001-business-atoms.js'
import {
  foundationPoolHandle as pool,
  insertChangeEvent,
  withFoundationTransaction,
} from './foundation-db-core.js'
import {
  foundationBacklogDbInternals,
  getBacklogSeedDriftSnapshot,
  getFoundationBacklogIdPrefixes,
  getFoundationBacklogScopes,
} from './foundation-backlog-sprint-db.js'
import {
  getFoundationDbConstraintAudit,
} from './foundation-db-session.js'
import {
  getDriveCorpusInventorySnapshot,
  getExtractionControlSnapshot,
  getSourceMaturityOperationalMetrics,
} from './foundation-source-crawl-db.js'
import {
  getFoundationJobRunSnapshot,
  getLlmRuntimeSnapshot,
} from './foundation-runtime-jobs-db.js'
import {
  getFubLeadSourceSnapshot,
} from './foundation-people-sales-db.js'
import {
  getSharedCommunicationArchiveSnapshot,
  getSharedCommunicationCandidateSnapshot,
  getSharedCommunicationCoverageSnapshot,
  getSharedCommunicationSynthesisSnapshot,
} from './foundation-shared-comms-db.js'
import { createFoundationControlCompressionStore } from './foundation-control-compression.js'

const canonicalDecisionCategories = ['strategy', 'system', 'execution', 'people']
const backlogScopeOrderSql = getFoundationBacklogScopes()
  .map((scope, index) => `WHEN '${scope.key}' THEN ${index}`)
  .join(' ')

const foundationDecisionStore = createFoundationDecisionStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getNextPrefixedId: foundationBacklogDbInternals.getNextPrefixedId,
  canonicalDecisionCategories,
})

const foundationControlCompressionStore = createFoundationControlCompressionStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
})

export const createDecision = foundationDecisionStore.createDecision
export const updateDecision = foundationDecisionStore.updateDecision
export const createOpenQuestion = foundationDecisionStore.createOpenQuestion
export const updateOpenQuestion = foundationDecisionStore.updateOpenQuestion
export const listPendingDocUpdates = foundationDecisionStore.listPendingDocUpdates
export const getPendingDocUpdate = foundationDecisionStore.getPendingDocUpdate
export const createPendingDocUpdate = foundationDecisionStore.createPendingDocUpdate
export const approvePendingDocUpdate = foundationDecisionStore.approvePendingDocUpdate
export const rejectPendingDocUpdate = foundationDecisionStore.rejectPendingDocUpdate
export const markPendingDocUpdateFailed = foundationDecisionStore.markPendingDocUpdateFailed
export const markPendingDocUpdateApplied = foundationDecisionStore.markPendingDocUpdateApplied

export const upsertFoundationAcknowledgedState = (...args) => foundationControlCompressionStore.upsertAcknowledgedState(...args)
export const listFoundationAcknowledgedStates = (...args) => foundationControlCompressionStore.listAcknowledgedStates(...args)
export const recordFoundationIncrementalVerifierRun = (...args) => foundationControlCompressionStore.recordIncrementalVerifierRun(...args)

export async function getBusinessAtomDashboardSnapshot(options = {}) {
  return getBusinessAtomDashboardSnapshotFromDb(pool, options)
}

export async function getStrategyPreworkCoverageSnapshot() {
  return getStrategyPreworkCoverageSnapshotFromSources({ pool })
}

export async function getStrategyGoalTruthSnapshot() {
  return getStrategyGoalTruthSnapshotFromSources({ getDocSourceSnapshot })
}

export async function getStrategyOperatingTruthSnapshot() {
  return getStrategyOperatingTruthSnapshotFromSources({
    pool,
    getFubLeadSourceSnapshot,
    getStrategyGoalTruthSnapshot,
  })
}

function mapChangeEventRow(row) {
  return {
    id: row.id,
    eventType: row.event_type ?? row.eventType,
    entityTable: row.entity_table ?? row.entityTable,
    entityId: row.entity_id ?? row.entityId,
    actor: row.actor,
    summary: row.summary,
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt,
  }
}

function mapFoundationUserRow(row) {
  return {
    email: row.email,
    name: row.name,
    tier: row.tier === null || row.tier === undefined ? null : Number(row.tier),
    userType: row.user_type ?? row.userType,
    active: Boolean(row.active),
    meetingSyncEnabled: Boolean(row.meeting_sync_enabled ?? row.meetingSyncEnabled),
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function buildFoundationSurfaceFreshnessSweep({
  backlogItems = [],
  extractionControl = {},
  backlogSeedDrift = {},
  dbConstraintAudit = {},
} = {}) {
  const sourceIds = new Set(getSourceContracts().map(source => source.sourceId || source.id).filter(Boolean))
  const backlogIds = new Set((backlogItems || []).map(item => item.id).filter(Boolean))
  const staleActiveRuns = Array.isArray(extractionControl.staleActiveRuns)
    ? extractionControl.staleActiveRuns
    : []
  const recentStaleReapedRuns = Array.isArray(extractionControl.recentStaleReapedRuns)
    ? extractionControl.recentStaleReapedRuns
    : []

  const surfaces = getFoundationSurfaceMap().map(surface => {
    const findings = []
    const missingSourceIds = (surface.sourceIds || []).filter(sourceId => !sourceIds.has(sourceId))
    const missingBacklogIds = (surface.backlogIds || []).filter(backlogId => !backlogIds.has(backlogId))

    if (missingSourceIds.length) {
      findings.push({
        severity: 'risk',
        type: 'missing_source_contract',
        detail: `Missing source contract IDs: ${missingSourceIds.join(', ')}`,
      })
    }

    if (missingBacklogIds.length) {
      findings.push({
        severity: 'risk',
        type: 'missing_backlog_owner',
        detail: `Missing backlog owner IDs: ${missingBacklogIds.join(', ')}`,
      })
    }

    if (surface.section === 'system-health') {
      staleActiveRuns.forEach(run => {
        findings.push({
          severity: 'risk',
          type: 'stale_source_crawl_run',
          detail: `${run.targetKey} run ${run.runId} is still ${run.status} after ${run.staleState?.ageMinutes ?? 'unknown'} minutes.`,
          targetKey: run.targetKey,
          runId: run.runId,
        })
      })
      recentStaleReapedRuns.slice(0, 5).forEach(run => {
        findings.push({
          severity: 'warning',
          type: 'stale_source_crawl_run_reaped',
          detail: `${run.targetKey} run ${run.runId} was marked failed by the stale source-crawl run reaper.`,
          targetKey: run.targetKey,
          runId: run.runId,
        })
      })
    }

    if (surface.section === 'backlog' && Number(backlogSeedDrift?.totalMismatchCount || 0) > 0) {
      findings.push({
        severity: 'warning',
        type: 'seed_live_drift',
        detail: `${backlogSeedDrift.totalMismatchCount} seed/live backlog mismatches are visible in the drift report.`,
      })
    }

    if (surface.section === 'source-overview' && Number(dbConstraintAudit?.invalidSourceReferenceCount || 0) > 0) {
      findings.push({
        severity: 'risk',
        type: 'invalid_source_reference',
        detail: `${dbConstraintAudit.invalidSourceReferenceCount} invalid source references exist in DB-backed records.`,
      })
    }

    const status = findings.some(finding => finding.severity === 'risk')
      ? 'risk'
      : findings.length
        ? 'warning'
        : 'live'

    return {
      ...surface,
      status,
      findings,
      missingSourceIds,
      missingBacklogIds,
      backingCounts: {
        apis: surface.backingApis.length,
        docs: surface.backingDocs.length,
        tables: surface.backingTables.length,
        sourceIds: surface.sourceIds.length,
        backlogIds: surface.backlogIds.length,
      },
    }
  })

  const findings = surfaces.flatMap(surface =>
    surface.findings.map(finding => ({
      surfaceSection: surface.section,
      surfaceLabel: surface.label,
      owner: surface.owner,
      ...finding,
    }))
  )

  return {
    generatedAt: new Date().toISOString(),
    surfaces,
    findings,
    summary: {
      mappedSurfaceCount: surfaces.length,
      surfacesWithFindings: surfaces.filter(surface => surface.findings.length).length,
      riskSurfaces: surfaces.filter(surface => surface.status === 'risk').length,
      warningSurfaces: surfaces.filter(surface => surface.status === 'warning').length,
      staleActiveRunCount: staleActiveRuns.length,
      recentStaleReapedRunCount: recentStaleReapedRuns.length,
      missingSourceBindingCount: surfaces.reduce((sum, surface) => sum + surface.missingSourceIds.length, 0),
      missingBacklogBindingCount: surfaces.reduce((sum, surface) => sum + surface.missingBacklogIds.length, 0),
    },
  }
}

export async function getFoundationCoreSnapshot(options = {}) {
  const decisionLimit = Math.min(500, Math.max(1, Number(options.decisionLimit) || 200))
  const parkingLimit = Math.min(500, Math.max(1, Number(options.parkingLimit) || 200))
  const questionLimit = Math.min(500, Math.max(1, Number(options.questionLimit) || 200))
  const changeLimit = Math.min(100, Math.max(1, Number(options.changeLimit) || 20))
  const [
    backlogResult,
    decisionsResult,
    parkingResult,
    questionsResult,
    memoryStatusResult,
    pendingDocUpdatesResult,
    recentChangesResult,
    usersResult,
  ] = await Promise.all([
    pool.query(`
      SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters AS "whyItMatters",
             next_action AS "nextAction", status_note AS "statusNote", owner, created_at, updated_at
      FROM backlog_items
      ORDER BY CASE team ${backlogScopeOrderSql} ELSE 999 END,
               rank NULLS LAST,
               created_at ASC
    `),
    pool.query(`
      SELECT id, category, title, status, summary, rationale, source_ref,
             decision_owner, confirmed_by, participant_names, context_ref, evidence_notes,
             provenance_type, provenance_status, provenance_notes, source_ids, route_refs,
             artifact_refs, meeting_ref, session_ref, thread_ref, participant_roles,
             classified_at, classified_by, supersedes_ids, valid_from, valid_until, superseded_by,
             created_at, updated_at
      FROM decisions
      ORDER BY created_at DESC
      LIMIT $1
    `, [decisionLimit]),
    pool.query(`
      SELECT id, title, summary, owner, created_at, updated_at
      FROM parking_lot_items
      ORDER BY created_at ASC
      LIMIT $1
    `, [parkingLimit]),
    pool.query(`
      SELECT id, title, summary, owner, status, resolved_at, resolved_by, resolution_note, created_at, updated_at
      FROM open_questions
      ORDER BY status ASC, created_at ASC
      LIMIT $1
    `, [questionLimit]),
    pool.query(`
      SELECT component_key AS "componentKey", label, status, detail, updated_at AS "updatedAt"
      FROM memory_system_status
      ORDER BY label ASC
    `),
    pool.query(`
      SELECT p.id, p.decision_id, d.title AS decision_title, d.category AS decision_category, d.status AS decision_status,
             d.source_ref AS decision_source_ref, d.decision_owner AS decision_owner, d.confirmed_by AS decision_confirmed_by,
             d.participant_names AS decision_participant_names, d.context_ref AS decision_context_ref,
             d.evidence_notes AS decision_evidence_notes, d.provenance_type AS decision_provenance_type,
             d.provenance_status AS decision_provenance_status, d.provenance_notes AS decision_provenance_notes,
             d.source_ids AS decision_source_ids, d.route_refs AS decision_route_refs,
             d.artifact_refs AS decision_artifact_refs, d.meeting_ref AS decision_meeting_ref,
             d.session_ref AS decision_session_ref, d.thread_ref AS decision_thread_ref,
             d.participant_roles AS decision_participant_roles, d.rationale AS decision_rationale,
             p.target_doc_path, p.target_section, p.summary,
             p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
             p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
      FROM pending_doc_updates p
      LEFT JOIN decisions d ON d.id = p.decision_id
      ORDER BY p.proposed_at DESC
    `),
    pool.query(`
      SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
      FROM change_events
      ORDER BY created_at DESC
      LIMIT $1
    `, [changeLimit]),
    pool.query(`
      SELECT email, name, tier, user_type, active, meeting_sync_enabled, metadata, created_at, updated_at
      FROM users
      WHERE active = true
      ORDER BY user_type ASC, name ASC, email ASC
    `),
  ])

  const backlogItems = backlogResult.rows.map(foundationBacklogDbInternals.mapBacklogRow)
  const decisions = decisionsResult.rows.map(mapDecisionRow)
  const pendingDocUpdates = pendingDocUpdatesResult.rows.map(mapPendingDocUpdateRow)
  const recentChanges = recentChangesResult.rows.map(mapChangeEventRow)

  return {
    backlogItems,
    decisions,
    parkingLot: parkingResult.rows,
    openQuestions: questionsResult.rows.map(mapOpenQuestionRow),
    users: usersResult.rows.map(mapFoundationUserRow),
    memoryStatus: memoryStatusResult.rows,
    pendingDocUpdates,
    recentChanges,
    decisionTraceability: buildDecisionTraceabilitySnapshot(decisions, pendingDocUpdates, recentChanges),
    decisionReview: buildDecisionReviewSnapshot(decisions, pendingDocUpdates),
    meta: {
      canonicalDecisionCategories,
      backlogIdPrefixes: getFoundationBacklogIdPrefixes(),
      backlogScopes: getFoundationBacklogScopes(),
    },
  }
}

export async function getFoundationSnapshot(options = {}) {
  if (options?.mode === 'core') return getFoundationCoreSnapshot(options)

  const {
    getActionRouterSnapshot,
    getIntelligenceAtomSpineSnapshot,
    getIntelligenceJobLedgerSnapshot,
    getIntelligenceRetrievalSnapshot,
    getSynthesisEngineSnapshot,
    getSynthesisFactsSnapshot,
  } = await import('./foundation-intelligence-db.js')

  const [
    core,
    sharedCommunicationsArchive,
    sharedCommunicationsCoverage,
    sharedCommunicationCandidates,
    sharedCommunicationSynthesis,
    foundationJobs,
    intelligenceJobs,
    intelligenceAtomSpine,
    intelligenceRetrieval,
    intelligenceSynthesisFacts,
    intelligenceSynthesis,
    intelligenceActionRouter,
    llmRuntime,
    extractionControl,
    sourceMaturityOperational,
    driveCorpusInventory,
    backlogSeedDrift,
    dbConstraintAudit,
  ] = await Promise.all([
    getFoundationCoreSnapshot(options),
    getSharedCommunicationArchiveSnapshot({ limit: 10 }),
    getSharedCommunicationCoverageSnapshot(),
    getSharedCommunicationCandidateSnapshot({
      status: 'pending',
      limit: 10,
      includeItems: false,
    }),
    getSharedCommunicationSynthesisSnapshot({
      limit: 3,
      itemLimit: 12,
    }),
    getFoundationJobRunSnapshot({ limit: 20 }),
    getIntelligenceJobLedgerSnapshot({ limit: 20 }),
    getIntelligenceAtomSpineSnapshot({ limit: 20 }),
    getIntelligenceRetrievalSnapshot({ limit: 20 }),
    getSynthesisFactsSnapshot({ limit: 20 }),
    getSynthesisEngineSnapshot({ limit: 20 }),
    getActionRouterSnapshot({ limit: 500 }),
    getLlmRuntimeSnapshot({ limit: 20 }),
    getExtractionControlSnapshot({ limit: 50 }),
    getSourceMaturityOperationalMetrics(),
    getDriveCorpusInventorySnapshot({ limit: 20 }),
    getBacklogSeedDriftSnapshot({ limit: 20 }),
    getFoundationDbConstraintAudit({ limit: 20 }),
  ])

  const surfaceFreshnessSweep = buildFoundationSurfaceFreshnessSweep({
    backlogItems: core.backlogItems,
    extractionControl,
    backlogSeedDrift,
    dbConstraintAudit,
  })
  const cardReferenceTrust = await buildCardReferenceTrustStatus({
    declaredCardIds: core.backlogItems.map(item => item.id),
  })
  const sourceReferenceTrust = await buildSourceReferenceTrustStatus()

  return {
    ...core,
    sharedCommunicationsArchive,
    sharedCommunicationsCoverage,
    sharedCommunicationCandidates,
    sharedCommunicationSynthesis,
    foundationJobs,
    intelligenceJobs,
    intelligenceAtomSpine,
    intelligenceRetrieval,
    intelligenceSynthesisFacts,
    intelligenceSynthesis,
    intelligenceActionRouter,
    llmRuntime,
    extractionControl,
    sourceMaturityOperational,
    driveCorpusInventory,
    surfaceFreshnessSweep,
    cardReferenceTrust,
    sourceReferenceTrust,
    backlogSeedDrift,
    dbConstraintAudit,
  }
}

export function getCanonicalDecisionCategories() {
  return canonicalDecisionCategories.slice()
}

export async function getRecentChangeEvents(limit = 20) {
  const result = await pool.query(
    `
      SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
      FROM change_events
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit]
  )

  return result.rows.map(mapChangeEventRow)
}

export async function getLatestChangeEventForEntity(entityTable, entityId, eventTypes = []) {
  const table = String(entityTable || '').trim()
  const id = String(entityId || '').trim()
  if (!table || !id) return null

  const normalizedEventTypes = Array.isArray(eventTypes)
    ? eventTypes.map(value => String(value || '').trim()).filter(Boolean)
    : []

  const values = [table, id]
  let where = `
      WHERE entity_table = $1
        AND entity_id = $2
  `

  if (normalizedEventTypes.length) {
    values.push(normalizedEventTypes)
    where += `
        AND event_type = ANY($3)
    `
  }

  const result = await pool.query(
    `
      SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
      FROM change_events
      ${where}
      ORDER BY created_at DESC
      LIMIT 1
    `,
    values
  )

  return result.rows[0] ? mapChangeEventRow(result.rows[0]) : null
}

export async function listFoundationUsers({
  activeOnly = true,
  meetingSyncEnabled = null,
  userType = null,
} = {}) {
  const values = []
  const filters = []

  if (activeOnly) {
    values.push(true)
    filters.push(`active = $${values.length}`)
  }

  if (meetingSyncEnabled !== null && meetingSyncEnabled !== undefined) {
    values.push(Boolean(meetingSyncEnabled))
    filters.push(`meeting_sync_enabled = $${values.length}`)
  }

  if (userType) {
    values.push(String(userType).trim())
    filters.push(`user_type = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const result = await pool.query(
    `
      SELECT email, name, tier, user_type, active, meeting_sync_enabled, metadata, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY user_type ASC, name ASC, email ASC
    `,
    values
  )

  return result.rows.map(mapFoundationUserRow)
}

export async function getDocSourceSnapshot(docPath) {
  if (docPath === BHAG_DOC_PATH) {
    try {
      return await getLiveBhagSourceSnapshot()
    } catch (error) {
      console.warn(`Falling back to stored BHAG snapshot: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (docPath === AGENT_ENGINE_DOC_PATH) {
    try {
      return await getLiveAgentEngineSourceSnapshot()
    } catch (error) {
      console.warn(`Falling back to stored Agent Engine snapshot: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const result = await pool.query(
    `
      SELECT doc_path AS "docPath", source_id AS "sourceId", group_title AS "groupTitle",
             label, value, detail, as_of AS "asOf", sort_order AS "sortOrder"
      FROM doc_source_snapshots
      WHERE doc_path = $1
      ORDER BY group_title ASC, sort_order ASC, created_at ASC
    `,
    [docPath]
  )

  return result.rows
}

export async function saveStrategyHubSnapshot(input = {}, actor = 'system') {
  const snapshotKey = String(input.snapshotKey || input.snapshot_key || 'source_to_gap_route_review').trim()
  if (!snapshotKey) throw new Error('Strategy Hub snapshot key is required.')
  const payload = input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
    ? input.payload
    : {}
  const generatedAt = input.generatedAt || input.generated_at || payload.generatedAt || new Date().toISOString()
  const sourceStatus = input.sourceStatus || input.source_status || 'live'
  if (!['live', 'degraded'].includes(sourceStatus)) throw new Error(`Invalid Strategy Hub snapshot source status: ${sourceStatus}`)

  const result = await pool.query(
    `
      INSERT INTO strategy_hub_snapshots (
        snapshot_key, payload, source_status, generated_at, updated_at, updated_by
      )
      VALUES ($1,$2::jsonb,$3,$4,NOW(),$5)
      ON CONFLICT (snapshot_key) DO UPDATE SET
        payload = EXCLUDED.payload,
        source_status = EXCLUDED.source_status,
        generated_at = EXCLUDED.generated_at,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
      RETURNING snapshot_key, payload, source_status, generated_at, updated_at, updated_by
    `,
    [snapshotKey, JSON.stringify(payload), sourceStatus, generatedAt, actor]
  )
  return {
    snapshotKey: result.rows[0].snapshot_key,
    payload: result.rows[0].payload || {},
    sourceStatus: result.rows[0].source_status,
    generatedAt: result.rows[0].generated_at?.toISOString?.() || result.rows[0].generated_at,
    updatedAt: result.rows[0].updated_at?.toISOString?.() || result.rows[0].updated_at,
    updatedBy: result.rows[0].updated_by,
  }
}

export async function getStrategyHubSnapshot(snapshotKey = 'source_to_gap_route_review') {
  const normalizedKey = String(snapshotKey || '').trim()
  if (!normalizedKey) throw new Error('Strategy Hub snapshot key is required.')
  const result = await pool.query(
    `
      SELECT snapshot_key, payload, source_status, generated_at, updated_at, updated_by
      FROM strategy_hub_snapshots
      WHERE snapshot_key = $1
    `,
    [normalizedKey]
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    snapshotKey: row.snapshot_key,
    payload: row.payload || {},
    sourceStatus: row.source_status,
    generatedAt: row.generated_at?.toISOString?.() || row.generated_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    updatedBy: row.updated_by,
  }
}

export async function recordActionRouteCuration(...args) {
  const { recordActionRouteCuration: record } = await import('./foundation-intelligence-db.js')
  return record(...args)
}
