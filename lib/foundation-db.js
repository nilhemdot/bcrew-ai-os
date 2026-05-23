import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { getSourceContracts } from './source-contracts.js'
import {
  getSourceContractRegistrySnapshotWithClient,
  syncSourceContractRegistryRowsWithClient,
} from './source-contract-registry-table.js'
import { createIntelligenceAtomStore } from './intelligence-atoms.js'
import { createIntelligenceRetrievalStore } from './intelligence-retrieval.js'
import { createIntelligenceSynthesisFactStore } from './intelligence-synthesis-facts.js'
import { createIntelligenceSynthesisStore } from './intelligence-synthesis.js'
import { createIntelligenceActionRouterStore } from './intelligence-action-router.js'
import {
  createFoundationControlCompressionStore,
} from './foundation-control-compression.js'
import { getFoundationSurfaceMap } from './foundation-surface-map.js'
import { buildCardReferenceTrustStatus } from './card-reference-trust.js'
import { buildSourceReferenceTrustStatus } from './source-reference-trust.js'
import {
  CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
  FoundationCurrentSprintMutationGuardError,
  createFoundationCurrentSprintStore,
} from './foundation-current-sprint-store.js'
import { createFoundationBacklogStore } from './foundation-backlog-store.js'
import { createFubLeadSourceStore } from './foundation-fub-lead-source-store.js'
import { backlogSeed } from './foundation-backlog-seed.js'
import { createFoundationDbSchemaSeedStore } from './foundation-db-schema-seed-store.js'
import {
  buildDecisionReviewSnapshot,
  buildDecisionTraceabilitySnapshot,
  createFoundationDecisionStore,
  mapDecisionRow,
  mapOpenQuestionRow,
  mapPendingDocUpdateRow,
  normalizeDecisionCategory,
  normalizeDecisionIdList,
  normalizeStringList,
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
import { getSharedCommunicationCoverageSnapshotFromDb } from './foundation-shared-comms-coverage.js'
import { createFoundationSharedCommunicationStore } from './foundation-shared-comms-store.js'
import { createFoundationLlmRuntimeStore } from './foundation-llm-runtime-store.js'
import { createFoundationRuntimeJobStore } from './foundation-runtime-job-store.js'
import { createFoundationSourceCrawlStore } from './foundation-source-crawl-store.js'
import { createFoundationDriveMeetingVaultStore } from './foundation-drive-meeting-vault-store.js'
import { createFoundationAgentFeedbackStore } from './foundation-agent-feedback-store.js'
import { createFoundationSalesListingStore } from './foundation-sales-listing-store.js'
import {
  getBusinessAtomDashboardSnapshotFromDb,
} from './strategy-001-business-atoms.js'

export {
  CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
  FoundationCurrentSprintMutationGuardError,
}

function createFoundationPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

let pool = createFoundationPool()
let poolEndPromise = null

export const FOUNDATION_DB_READ_ONLY_GATE_TABLES = [
  'backlog_items',
  'decisions',
  'parking_lot_items',
  'open_questions',
  'memory_system_status',
  'source_contract_registry',
  'foundation_runtime_status',
  'pending_doc_updates',
  'change_events',
  'foundation_job_runs',
  'foundation_job_controls',
  'shared_communication_artifacts',
  'shared_communication_candidates',
  'source_crawl_targets',
  'source_crawl_target_runs',
  'source_crawl_items',
  'source_crawl_item_attempts',
  'drive_access_preflight_runs',
  'drive_access_preflight_items',
  'meeting_vault_acl_audits',
  'meeting_vault_enforcement_runs',
  'meeting_vault_enforcement_items',
  'meeting_vault_legacy_exceptions',
  'foundation_sprints',
  'foundation_sprint_items',
  'plan_critic_runs',
  'foundation_feedback_items',
  'foundation_acknowledged_states',
  'foundation_incremental_verifier_runs',
  'intelligence_job_runs',
  'intelligence_atoms',
  'business_atoms',
  'atom_hits',
  'intelligence_retrieval_runs',
  'intelligence_synthesis_fact_runs',
  'intelligence_synthesis_runs',
  'intelligence_action_routes',
  'agent_onboarding_feedback_responses',
  'agent_onboarding_feedback_send_attempts',
  'agent_onboarding_feedback_reminder_attempts',
  'agent_onboarding_feedback_response_notifications',
  'sales_listing_assignments',
]

export const FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID = 'FOUNDATION-DB-INIT-SEED-SPLIT-001'
export const BACKLOG_STORE_CONCURRENCY_CARD_ID = 'BACKLOG-STORE-CONCURRENCY-001'

const foundationPoolHandle = {
  query(...args) {
    return pool.query(...args)
  },
  connect(...args) {
    return pool.connect(...args)
  },
}

const canonicalDecisionCategories = ['strategy', 'system', 'execution', 'people']

const backlogScopeDefinitions = [
  {
    key: 'foundation',
    label: 'Foundation / System',
    shortLabel: 'foundation/system',
    queueOwner: 'root',
    active: true,
  },
  {
    key: 'strategic_execution',
    label: 'Strategic Execution',
    shortLabel: 'strategic execution',
    queueOwner: 'root',
    active: true,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    shortLabel: 'marketing',
    queueOwner: 'hub',
    active: true,
  },
  {
    key: 'sales',
    label: 'Sales',
    shortLabel: 'sales',
    queueOwner: 'hub',
    active: false,
  },
  {
    key: 'operations',
    label: 'Operations',
    shortLabel: 'operations',
    queueOwner: 'hub',
    active: false,
  },
  {
    key: 'retention',
    label: 'Retention',
    shortLabel: 'retention',
    queueOwner: 'hub',
    active: false,
  },
]

const legacyBacklogScopeMap = {
  dev: 'foundation',
}

const backlogScopeKeys = backlogScopeDefinitions.map(scope => scope.key)
const backlogScopeOrderSql = backlogScopeDefinitions
  .map((scope, index) => `WHEN '${scope.key}' THEN ${index}`)
  .join(' ')

const foundationDbSchemaSeedStore = createFoundationDbSchemaSeedStore({
  pool: foundationPoolHandle,
  backlogScopeKeys,
  canonicalDecisionCategories,
})

export const initFoundationDb = foundationDbSchemaSeedStore.initFoundationDb
export const bootstrapFoundationDb = foundationDbSchemaSeedStore.bootstrapFoundationDb

export async function getBusinessAtomDashboardSnapshot(options = {}) {
  return getBusinessAtomDashboardSnapshotFromDb(pool, options)
}

function getBacklogIdPrefixes() {
  return Array.from(new Set(backlogSeed.map(item => String(item.id || '').split('-')[0]).filter(Boolean))).sort()
}

function getBacklogScopes() {
  return backlogScopeDefinitions.map(scope => ({ ...scope }))
}

function normalizeBacklogScopeKey(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return ''
  return legacyBacklogScopeMap[normalized] || normalized
}

function mapBacklogRow(row) {
  const scope = normalizeBacklogScopeKey(row.scope ?? row.team)
  return {
    id: row.id,
    title: row.title,
    scope,
    team: scope,
    lane: row.lane,
    priority: row.priority,
    rank: row.rank,
    source: row.source,
    summary: row.summary,
    whyItMatters: row.why_it_matters ?? row.whyItMatters,
    nextAction: row.next_action ?? row.nextAction,
    statusNote: row.status_note ?? row.statusNote,
    owner: row.owner,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

const foundationCurrentSprintStore = createFoundationCurrentSprintStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  mapBacklogRow,
})

export const getActiveFoundationCurrentSprint = foundationCurrentSprintStore.getActiveFoundationCurrentSprint
export const getPlanCriticRunsByCardIds = foundationCurrentSprintStore.getPlanCriticRunsByCardIds
export const upsertFoundationCurrentSprintOverlay = foundationCurrentSprintStore.upsertFoundationCurrentSprintOverlay
export const buildCurrentSprintMutationGuardsDogfoodProof = foundationCurrentSprintStore.buildCurrentSprintMutationGuardsDogfoodProof

export async function getBacklogItemsByIds(ids = []) {
  const normalizedIds = Array.from(new Set(
    (Array.isArray(ids) ? ids : [])
      .map(id => String(id || '').trim())
      .filter(Boolean)
  ))

  if (!normalizedIds.length) return []

  const result = await pool.query(
    `
      SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters AS "whyItMatters",
             next_action AS "nextAction", status_note AS "statusNote", owner, created_at, updated_at
      FROM backlog_items
      WHERE id = ANY($1::text[])
      ORDER BY CASE team ${backlogScopeOrderSql} ELSE 999 END,
               rank NULLS LAST,
               created_at ASC
    `,
    [normalizedIds]
  )

  return result.rows.map(mapBacklogRow)
}

const backlogSeedStableFields = ['title', 'team', 'source', 'summary', 'whyItMatters']
const backlogSeedMutableFields = ['lane', 'priority', 'rank', 'nextAction', 'statusNote']

function normalizeBacklogSeedComparableValue(field, value) {
  if (value === undefined || value === null) return null
  if (field === 'rank') {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
  }
  if (field === 'team') return normalizeBacklogScopeKey(value)
  return String(value).trim().replace(/\s+/g, ' ')
}

function normalizeBacklogSeedComparableRow(row) {
  const mapped = mapBacklogRow(row)
  return {
    id: mapped.id,
    title: mapped.title,
    team: mapped.team,
    lane: mapped.lane,
    priority: mapped.priority,
    rank: mapped.rank,
    source: mapped.source,
    summary: mapped.summary,
    whyItMatters: mapped.whyItMatters,
    nextAction: mapped.nextAction,
    statusNote: mapped.statusNote,
    updatedAt: mapped.updatedAt || null,
  }
}

function compareBacklogSeedFields(seedRow, liveRow, fields) {
  return fields
    .map(field => {
      const seedValue = seedRow[field]
      const liveValue = liveRow[field]
      const normalizedSeed = normalizeBacklogSeedComparableValue(field, seedValue)
      const normalizedLive = normalizeBacklogSeedComparableValue(field, liveValue)
      if (normalizedSeed === normalizedLive) return null
      return {
        field,
        seedValue,
        liveValue,
      }
    })
    .filter(Boolean)
}

export async function getBacklogSeedDriftSnapshot(options = {}) {
  const parsedLimit = Number(options.limit ?? 50)
  const limit = Number.isFinite(parsedLimit) && parsedLimit >= 0 ? Math.floor(parsedLimit) : 50
  const seedRows = backlogSeed.map(normalizeBacklogSeedComparableRow)
  const seedIds = seedRows.map(row => row.id).filter(Boolean)

  if (!seedIds.length) {
    return {
      generatedAt: new Date().toISOString(),
      policy: 'Live Postgres backlog is operational truth. backlogSeed is bootstrap/default doctrine until promoted through explicit migration or review.',
      seedRows: 0,
      liveSeedRows: 0,
      missingLiveIds: [],
      stableFields: backlogSeedStableFields,
      mutableFields: backlogSeedMutableFields,
      stableMismatchCount: 0,
      mutableMismatchCount: 0,
      totalMismatchCount: 0,
      rowsWithStableDrift: 0,
      rowsWithMutableDrift: 0,
      driftItemCount: 0,
      items: [],
    }
  }

  const result = await pool.query(
    `
      SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, updated_at
      FROM backlog_items
      WHERE id = ANY($1::text[])
    `,
    [seedIds]
  )
  const liveById = new Map(result.rows.map(row => [row.id, normalizeBacklogSeedComparableRow(row)]))
  const missingLiveIds = []
  const items = []
  let driftItemCount = 0
  let stableMismatchCount = 0
  let mutableMismatchCount = 0
  let rowsWithStableDrift = 0
  let rowsWithMutableDrift = 0

  for (const seedRow of seedRows) {
    const liveRow = liveById.get(seedRow.id)
    if (!liveRow) {
      missingLiveIds.push(seedRow.id)
      driftItemCount += 1
      stableMismatchCount += backlogSeedStableFields.length
      rowsWithStableDrift += 1
      if (items.length < limit) {
        items.push({
          id: seedRow.id,
          title: seedRow.title,
          status: 'missing_live_row',
          stableMismatches: backlogSeedStableFields.map(field => ({
            field,
            seedValue: seedRow[field],
            liveValue: null,
          })),
          mutableMismatches: [],
        })
      }
      continue
    }

    const stableMismatches = compareBacklogSeedFields(seedRow, liveRow, backlogSeedStableFields)
    const mutableMismatches = compareBacklogSeedFields(seedRow, liveRow, backlogSeedMutableFields)
    if (!stableMismatches.length && !mutableMismatches.length) continue

    driftItemCount += 1
    stableMismatchCount += stableMismatches.length
    mutableMismatchCount += mutableMismatches.length
    if (stableMismatches.length) rowsWithStableDrift += 1
    if (mutableMismatches.length) rowsWithMutableDrift += 1

    if (items.length < limit) {
      items.push({
        id: seedRow.id,
        title: liveRow.title || seedRow.title,
        status: stableMismatches.length ? 'requires_promotion_review' : 'live_state_differs_from_seed',
        liveUpdatedAt: liveRow.updatedAt,
        stableMismatches,
        mutableMismatches,
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    policy: 'Live Postgres backlog is operational truth. backlogSeed is bootstrap/default doctrine until promoted through explicit migration or review.',
    seedRows: seedRows.length,
    liveSeedRows: result.rows.length,
    missingLiveIds,
    stableFields: backlogSeedStableFields,
    mutableFields: backlogSeedMutableFields,
    stableMismatchCount,
    mutableMismatchCount,
    totalMismatchCount: stableMismatchCount + mutableMismatchCount,
    rowsWithStableDrift,
    rowsWithMutableDrift,
    driftItemCount,
    items,
  }
}

function getRegisteredSourceIds() {
  return getSourceContracts()
    .map(source => source.sourceId || source.id)
    .filter(Boolean)
    .sort()
}

function mapDbAuditCountRow(row) {
  return {
    relation: row.relation,
    value: row.value,
    count: Number(row.count || 0),
  }
}

export async function getFoundationDbConstraintAudit(options = {}) {
  const parsedLimit = Number(options.limit ?? 50)
  const limit = Number.isFinite(parsedLimit) && parsedLimit >= 0 ? Math.floor(parsedLimit) : 50
  const registeredSourceIds = Array.isArray(options.sourceIds) && options.sourceIds.length
    ? options.sourceIds
    : getRegisteredSourceIds()

  const [decisionCategoryResult, sourceReferenceResult, docUpdateStateResult] = await Promise.all([
    pool.query(
      `
        SELECT 'decisions.category' AS relation, category AS value, COUNT(*)::int AS count
        FROM decisions
        WHERE NOT (category = ANY($1::text[]))
        GROUP BY category
        ORDER BY category
        LIMIT $2
      `,
      [canonicalDecisionCategories, limit]
    ),
    pool.query(
      `
        WITH source_refs AS (
          SELECT 'doc_source_snapshots.source_id' AS relation, source_id AS value FROM doc_source_snapshots
          UNION ALL
          SELECT 'shared_communication_artifacts.source_id' AS relation, source_id AS value FROM shared_communication_artifacts
          UNION ALL
          SELECT 'shared_communication_candidates.source_id' AS relation, source_id AS value FROM shared_communication_candidates
          UNION ALL
          SELECT 'shared_communication_artifact_processing_runs.source_id' AS relation, source_id AS value FROM shared_communication_artifact_processing_runs
          UNION ALL
          SELECT 'source_crawl_targets.source_id' AS relation, source_id AS value FROM source_crawl_targets
          UNION ALL
          SELECT 'source_crawl_target_runs.source_id' AS relation, source_id AS value FROM source_crawl_target_runs
          UNION ALL
          SELECT 'source_crawl_items.source_id' AS relation, source_id AS value FROM source_crawl_items
          UNION ALL
          SELECT 'intelligence_report_artifacts.source_ids' AS relation, source_id AS value
          FROM intelligence_report_artifacts, unnest(source_ids) AS source_id
          UNION ALL
          SELECT 'intelligence_atoms.source_id' AS relation, source_id AS value FROM intelligence_atoms
          UNION ALL
          SELECT 'intelligence_atom_hits.source_id' AS relation, source_id AS value FROM intelligence_atom_hits
          UNION ALL
          SELECT 'business_atoms.source_id' AS relation, source_id AS value FROM business_atoms
          UNION ALL
          SELECT 'atom_hits.source_id' AS relation, source_id AS value FROM atom_hits
          UNION ALL
          SELECT 'intelligence_retrieval_chunks.source_id' AS relation, source_id AS value FROM intelligence_retrieval_chunks
          UNION ALL
          SELECT 'intelligence_retrieval_runs.source_ids' AS relation, source_id AS value
          FROM intelligence_retrieval_runs, unnest(source_ids) AS source_id
          UNION ALL
          SELECT 'shared_communication_synthesized_items.source_ids' AS relation, source_id AS value
          FROM shared_communication_synthesized_items, unnest(source_ids) AS source_id
        )
        SELECT relation, value, COUNT(*)::int AS count
        FROM source_refs
        WHERE value IS NOT NULL
          AND NOT (value = ANY($1::text[]))
        GROUP BY relation, value
        ORDER BY relation, value
        LIMIT $2
      `,
      [registeredSourceIds, limit]
    ),
    pool.query(
      `
        SELECT 'pending_doc_updates.status_state' AS relation,
               id || ':' || status AS value,
               1::int AS count
        FROM pending_doc_updates
        WHERE (status = 'applied' AND (applied_at IS NULL OR applied_commit IS NULL))
           OR (status IN ('approved', 'rejected', 'failed') AND reviewed_at IS NULL)
           OR (status = 'pending' AND reviewed_at IS NOT NULL)
        ORDER BY id
        LIMIT $1
      `,
      [limit]
    ),
  ])

  const invalidDecisionCategories = decisionCategoryResult.rows.map(mapDbAuditCountRow)
  const invalidSourceReferences = sourceReferenceResult.rows.map(mapDbAuditCountRow)
  const pendingDocUpdateStateIssues = docUpdateStateResult.rows.map(mapDbAuditCountRow)

  return {
    generatedAt: new Date().toISOString(),
    registeredSourceIds: registeredSourceIds.length,
    canonicalDecisionCategories: canonicalDecisionCategories.slice(),
    invalidDecisionCategoryCount: invalidDecisionCategories.reduce((total, item) => total + item.count, 0),
    invalidDecisionCategories,
    invalidSourceReferenceCount: invalidSourceReferences.reduce((total, item) => total + item.count, 0),
    invalidSourceReferences,
    pendingDocUpdateStateIssueCount: pendingDocUpdateStateIssues.reduce((total, item) => total + item.count, 0),
    pendingDocUpdateStateIssues,
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

async function withFoundationTransaction(work) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback failures and rethrow the original error.
    }
    throw error
  } finally {
    client.release()
  }
}

async function insertChangeEvent(client, event) {
  await client.query(
    `
      INSERT INTO change_events (
        event_type, entity_table, entity_id, actor, summary, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    `,
    [
      event.eventType,
      event.entityTable,
      event.entityId,
      event.actor,
      event.summary,
      JSON.stringify(event.metadata || {}),
    ]
  )
}

export async function withFoundationAdvisoryLock(lockKey, work) {
  const normalizedLockKey = String(lockKey || '').trim()
  if (!normalizedLockKey) throw new Error('lockKey is required.')

  const client = await pool.connect()
  let lockHeld = false
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [normalizedLockKey])
    lockHeld = true
    return await work()
  } finally {
    if (lockHeld) {
      try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [normalizedLockKey])
      } catch {
        // The lock is session scoped and the client is being released.
      }
    }
    client.release()
  }
}

const fubLeadSourceStore = createFubLeadSourceStore({
  pool,
  withFoundationTransaction,
})
export const listFubLeadSourceRules = fubLeadSourceStore.listFubLeadSourceRules
export const getFubLeadSourceSnapshot = fubLeadSourceStore.getFubLeadSourceSnapshot
export const upsertFubLeadSourceRule = fubLeadSourceStore.upsertFubLeadSourceRule
export const saveFubLeadSourceSnapshot = fubLeadSourceStore.saveFubLeadSourceSnapshot

function getNumericSuffix(id, prefix) {
  const match = String(id || '').match(new RegExp(`^${prefix}-(\\d+)$`))
  return match ? Number(match[1]) : 0
}

async function getNextPrefixedId(client, tableName, prefix) {
  const normalizedPrefix = String(prefix || '').trim().toUpperCase()
  if (!normalizedPrefix) throw new Error('A valid ID prefix is required.')

  const result = await client.query(
    `
      SELECT id
      FROM ${tableName}
      WHERE id LIKE $1
      ORDER BY id DESC
    `,
    [`${normalizedPrefix}-%`]
  )

  const nextNumber = result.rows.reduce((max, row) => {
    return Math.max(max, getNumericSuffix(row.id, normalizedPrefix))
  }, 0) + 1

  return `${normalizedPrefix}-${String(nextNumber).padStart(3, '0')}`
}

const foundationBacklogStore = createFoundationBacklogStore({
  withFoundationTransaction,
  insertChangeEvent,
  getNextPrefixedId,
  normalizeBacklogScopeKey,
  mapBacklogRow,
})

export const createBacklogItem = foundationBacklogStore.createBacklogItem
export const updateBacklogItem = foundationBacklogStore.updateBacklogItem

export async function syncSourceContractRegistryTable(options = {}) {
  return withFoundationTransaction(async client => {
    return syncSourceContractRegistryRowsWithClient(client, options)
  })
}

export async function getSourceContractRegistrySnapshot() {
  return withFoundationTransaction(async client => {
    return getSourceContractRegistrySnapshotWithClient(client)
  })
}

const foundationSharedCommunicationStore = createFoundationSharedCommunicationStore({
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
})

export const getSharedCommunicationSourceStats = foundationSharedCommunicationStore.getSharedCommunicationSourceStats
export const getSharedCommunicationExistingExternalIds = foundationSharedCommunicationStore.getSharedCommunicationExistingExternalIds
export const getSharedCommunicationExistingArtifactsByExternalId = foundationSharedCommunicationStore.getSharedCommunicationExistingArtifactsByExternalId
export const getSharedCommunicationArchiveSnapshot = foundationSharedCommunicationStore.getSharedCommunicationArchiveSnapshot
export const searchSharedCommunicationArtifactsForContext = foundationSharedCommunicationStore.searchSharedCommunicationArtifactsForContext
export const getSharedCommunicationArtifactsForProcessing = foundationSharedCommunicationStore.getSharedCommunicationArtifactsForProcessing
export const getSharedCommunicationArtifactsWithoutCandidatesForProcessing = foundationSharedCommunicationStore.getSharedCommunicationArtifactsWithoutCandidatesForProcessing
export const recordSharedCommunicationArtifactProcessingRun = foundationSharedCommunicationStore.recordSharedCommunicationArtifactProcessingRun
export const getSharedCommunicationProcessingProvenanceGaps = foundationSharedCommunicationStore.getSharedCommunicationProcessingProvenanceGaps
export const upsertSharedCommunicationArtifact = foundationSharedCommunicationStore.upsertSharedCommunicationArtifact
export const getSharedCommunicationCandidateSnapshot = foundationSharedCommunicationStore.getSharedCommunicationCandidateSnapshot
export const upsertSharedCommunicationCandidate = foundationSharedCommunicationStore.upsertSharedCommunicationCandidate
export const recordSharedCommunicationSynthesisRun = foundationSharedCommunicationStore.recordSharedCommunicationSynthesisRun
export const getSharedCommunicationSynthesisSnapshot = foundationSharedCommunicationStore.getSharedCommunicationSynthesisSnapshot
export const buildSynthesisVerificationDbReport = foundationSharedCommunicationStore.buildSynthesisVerificationDbReport
export const rejectSharedCommunicationCandidatesByExtractionMethod = foundationSharedCommunicationStore.rejectSharedCommunicationCandidatesByExtractionMethod
export const rejectSharedCommunicationCandidatesForArtifacts = foundationSharedCommunicationStore.rejectSharedCommunicationCandidatesForArtifacts
export const updateSharedCommunicationCandidateStatus = foundationSharedCommunicationStore.updateSharedCommunicationCandidateStatus
export const applySharedCommunicationCandidateToBacklog = foundationSharedCommunicationStore.applySharedCommunicationCandidateToBacklog
export const applySharedCommunicationCandidateToDecision = foundationSharedCommunicationStore.applySharedCommunicationCandidateToDecision
export const applySharedCommunicationCandidateToQuestion = foundationSharedCommunicationStore.applySharedCommunicationCandidateToQuestion

const foundationLlmRuntimeStore = createFoundationLlmRuntimeStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
})

export const upsertLlmCredential = foundationLlmRuntimeStore.upsertLlmCredential
export const upsertLlmRoute = foundationLlmRuntimeStore.upsertLlmRoute
export const recordLlmRouteProbe = foundationLlmRuntimeStore.recordLlmRouteProbe
export const createLlmCall = foundationLlmRuntimeStore.createLlmCall
export const finishLlmCall = foundationLlmRuntimeStore.finishLlmCall
export const getLlmRuntimeSnapshot = foundationLlmRuntimeStore.getLlmRuntimeSnapshot
export const getStaleLlmCalls = foundationLlmRuntimeStore.getStaleLlmCalls
export const markStaleLlmCalls = foundationLlmRuntimeStore.markStaleLlmCalls

const foundationRuntimeJobStore = createFoundationRuntimeJobStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
})

export const getFoundationJobScheduleIndex = foundationRuntimeJobStore.getFoundationJobScheduleIndex
export const getFoundationJobControl = foundationRuntimeJobStore.getFoundationJobControl
export const recordFoundationRuntimeStatus = foundationRuntimeJobStore.recordFoundationRuntimeStatus
export const getFoundationRuntimeStatus = foundationRuntimeJobStore.getFoundationRuntimeStatus
export const getFoundationJobRunSnapshot = foundationRuntimeJobStore.getFoundationJobRunSnapshot
export const getFoundationJobRunById = foundationRuntimeJobStore.getFoundationJobRunById
export const updateFoundationJobControl = foundationRuntimeJobStore.updateFoundationJobControl
export const updateFoundationJobRunMetadata = foundationRuntimeJobStore.updateFoundationJobRunMetadata
export const createFoundationJobRun = foundationRuntimeJobStore.createFoundationJobRun
export const finishFoundationJobRun = foundationRuntimeJobStore.finishFoundationJobRun
export const markFoundationJobRunStopped = foundationRuntimeJobStore.markFoundationJobRunStopped
export const markStaleFoundationJobRuns = foundationRuntimeJobStore.markStaleFoundationJobRuns

const foundationSourceCrawlStore = createFoundationSourceCrawlStore({
  pool: foundationPoolHandle,
  withFoundationTransaction,
  insertChangeEvent,
  getFoundationJobScheduleIndex,
})

export const getStaleSourceCrawlTargetRuns = foundationSourceCrawlStore.getStaleSourceCrawlTargetRuns
export const markStaleSourceCrawlTargetRuns = foundationSourceCrawlStore.markStaleSourceCrawlTargetRuns
export const upsertSourceCrawlTarget = foundationSourceCrawlStore.upsertSourceCrawlTarget
export const upsertSourceCrawlItem = foundationSourceCrawlStore.upsertSourceCrawlItem
export const leaseSourceCrawlTarget = foundationSourceCrawlStore.leaseSourceCrawlTarget
export const finishSourceCrawlTargetRun = foundationSourceCrawlStore.finishSourceCrawlTargetRun
export const listSourceCrawlItems = foundationSourceCrawlStore.listSourceCrawlItems
export const classifySourceCrawlItemRetries = foundationSourceCrawlStore.classifySourceCrawlItemRetries
export const getRetryableSourceCrawlItems = foundationSourceCrawlStore.getRetryableSourceCrawlItems
export const leaseRetryableSourceCrawlItems = foundationSourceCrawlStore.leaseRetryableSourceCrawlItems
export const markSourceCrawlItemAttemptStarted = foundationSourceCrawlStore.markSourceCrawlItemAttemptStarted
export const markSourceCrawlItemAttemptFinished = foundationSourceCrawlStore.markSourceCrawlItemAttemptFinished
export const markStaleSourceCrawlItems = foundationSourceCrawlStore.markStaleSourceCrawlItems
export const getSourceCrawlItemsByExternalId = foundationSourceCrawlStore.getSourceCrawlItemsByExternalId
export const listDriveContentExtractionQueue = foundationSourceCrawlStore.listDriveContentExtractionQueue
export const listVideoContentExtractionQueue = foundationSourceCrawlStore.listVideoContentExtractionQueue
export const getExtractionControlSnapshot = foundationSourceCrawlStore.getExtractionControlSnapshot
export const getExtractionRunHardeningSnapshot = foundationSourceCrawlStore.getExtractionRunHardeningSnapshot
export const getDriveCorpusInventorySnapshot = foundationSourceCrawlStore.getDriveCorpusInventorySnapshot

const foundationDriveMeetingVaultStore = createFoundationDriveMeetingVaultStore({
  pool: foundationPoolHandle,
  withFoundationTransaction,
  insertChangeEvent,
  stableLedgerId,
  mapSourceCrawlItemRows: foundationSourceCrawlStore.mapSourceCrawlItemRows,
})

export const listMeetingRawDriveFileCandidates = foundationDriveMeetingVaultStore.listMeetingRawDriveFileCandidates
export const recordDriveAccessPreflightRun = foundationDriveMeetingVaultStore.recordDriveAccessPreflightRun
export const getLatestDriveAccessPreflightRun = foundationDriveMeetingVaultStore.getLatestDriveAccessPreflightRun
export const recordMeetingVaultAclAudit = foundationDriveMeetingVaultStore.recordMeetingVaultAclAudit
export const getLatestMeetingVaultAclAudit = foundationDriveMeetingVaultStore.getLatestMeetingVaultAclAudit
export const recordMeetingVaultAutoEnforcementRun = foundationDriveMeetingVaultStore.recordMeetingVaultAutoEnforcementRun
export const getLatestMeetingVaultAutoEnforcementRun = foundationDriveMeetingVaultStore.getLatestMeetingVaultAutoEnforcementRun
export const getMeetingVaultLegacyExceptions = foundationDriveMeetingVaultStore.getMeetingVaultLegacyExceptions

const foundationAgentFeedbackStore = createFoundationAgentFeedbackStore({
  pool: foundationPoolHandle,
  withFoundationTransaction,
})

export const upsertAgentOnboardingFeedbackResponse = foundationAgentFeedbackStore.upsertAgentOnboardingFeedbackResponse
export const getActiveAgentFeedbackSendAttempt = foundationAgentFeedbackStore.getActiveAgentFeedbackSendAttempt
export const createAgentFeedbackSendAttempt = foundationAgentFeedbackStore.createAgentFeedbackSendAttempt
export const updateAgentFeedbackSendAttemptStatus = foundationAgentFeedbackStore.updateAgentFeedbackSendAttemptStatus
export const listAgentFeedbackSendAttemptsForMilestone = foundationAgentFeedbackStore.listAgentFeedbackSendAttemptsForMilestone
export const listAgentFeedbackSendAttemptsForRunId = foundationAgentFeedbackStore.listAgentFeedbackSendAttemptsForRunId
export const supersedeAgentFeedbackSendAttemptForRepair = foundationAgentFeedbackStore.supersedeAgentFeedbackSendAttemptForRepair
export const getAgentOnboardingFeedbackResponseForMilestone = foundationAgentFeedbackStore.getAgentOnboardingFeedbackResponseForMilestone
export const getAgentOnboardingFeedbackResponseByTokenHash = foundationAgentFeedbackStore.getAgentOnboardingFeedbackResponseByTokenHash
export const listAgentOnboardingFeedbackResponsesForMilestone = foundationAgentFeedbackStore.listAgentOnboardingFeedbackResponsesForMilestone
export const supersedeAgentOnboardingFeedbackResponseForRepair = foundationAgentFeedbackStore.supersedeAgentOnboardingFeedbackResponseForRepair
export const listAgentFeedbackReminderAttemptsForMilestone = foundationAgentFeedbackStore.listAgentFeedbackReminderAttemptsForMilestone
export const getAgentFeedbackReminderAttemptBySlot = foundationAgentFeedbackStore.getAgentFeedbackReminderAttemptBySlot
export const createAgentFeedbackReminderAttempt = foundationAgentFeedbackStore.createAgentFeedbackReminderAttempt
export const updateAgentFeedbackReminderAttemptStatus = foundationAgentFeedbackStore.updateAgentFeedbackReminderAttemptStatus
export const getAgentFeedbackResponseNotificationByResponseId = foundationAgentFeedbackStore.getAgentFeedbackResponseNotificationByResponseId
export const createAgentFeedbackResponseNotification = foundationAgentFeedbackStore.createAgentFeedbackResponseNotification
export const updateAgentFeedbackResponseNotificationStatus = foundationAgentFeedbackStore.updateAgentFeedbackResponseNotificationStatus

const foundationSalesListingStore = createFoundationSalesListingStore({
  pool: foundationPoolHandle,
})

export const listSalesListingAssignments = foundationSalesListingStore.listSalesListingAssignments
export const listSalesListingCases = foundationSalesListingStore.listSalesListingCases
export const upsertSalesListingAssignment = foundationSalesListingStore.upsertSalesListingAssignment

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

const foundationDbInitSeedSplitSnapshotQueries = [
  {
    key: 'users',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.email)), '') AS fingerprint
      FROM (
        SELECT email, name, tier, user_type, active, meeting_sync_enabled, metadata::text, updated_at::text
        FROM users
      ) t
    `,
  },
  {
    key: 'backlog_items',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, updated_at::text
        FROM backlog_items
      ) t
    `,
  },
  {
    key: 'foundation_sprints',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.sprint_id)), '') AS fingerprint
      FROM (
        SELECT sprint_id, status, goal, active_blocker_card_id, started_at::text, closed_at::text, metadata::text, updated_at::text
        FROM foundation_sprints
      ) t
    `,
  },
  {
    key: 'foundation_sprint_items',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.sprint_id, t.backlog_id)), '') AS fingerprint
      FROM (
        SELECT sprint_id, backlog_id, sprint_order, stage, plan_ref, definition_of_done, proof_commands::text, readiness_blocker_cleared, not_next_boundaries::text, existing_work_check::text, returned_reason, metadata::text, updated_at::text
        FROM foundation_sprint_items
      ) t
    `,
  },
  {
    key: 'decisions',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, category, title, status, summary, decision_owner, classified_at::text, updated_at::text
        FROM decisions
      ) t
    `,
  },
  {
    key: 'open_questions',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, title, status, owner, resolved_at::text, resolved_by, resolution_note, updated_at::text
        FROM open_questions
      ) t
    `,
  },
  {
    key: 'parking_lot_items',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, title, summary, owner, updated_at::text
        FROM parking_lot_items
      ) t
    `,
  },
  {
    key: 'memory_system_status',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.component_key)), '') AS fingerprint
      FROM (
        SELECT component_key, label, status, detail, updated_at::text
        FROM memory_system_status
      ) t
    `,
  },
  {
    key: 'doc_source_snapshots',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, doc_path, source_id, group_title, label, value, detail, as_of::text, sort_order, updated_at::text
        FROM doc_source_snapshots
      ) t
    `,
  },
  {
    key: 'shared_communication_artifact_processing_runs',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.run_id)), '') AS fingerprint
      FROM (
        SELECT run_id, artifact_id, source_id, artifact_type, artifact_content_hash, processing_type, extraction_method, provider, auth_path, route_key, status, processed_at::text
        FROM shared_communication_artifact_processing_runs
      ) t
    `,
  },
]

async function getFoundationDbInitSeedSplitMutationSnapshot() {
  const tables = {}
  for (const query of foundationDbInitSeedSplitSnapshotQueries) {
    const result = await pool.query(query.sql)
    const row = result.rows[0] || {}
    tables[query.key] = {
      rowCount: Number(row.row_count || 0),
      fingerprint: row.fingerprint || '',
    }
  }
  return {
    capturedAt: new Date().toISOString(),
    tables,
  }
}

function compareFoundationDbInitSeedSplitSnapshots(before, after) {
  return Object.keys(before.tables || {}).map(table => {
    const beforeTable = before.tables[table] || {}
    const afterTable = after.tables?.[table] || {}
    return {
      table,
      beforeRowCount: beforeTable.rowCount ?? null,
      afterRowCount: afterTable.rowCount ?? null,
      beforeFingerprint: beforeTable.fingerprint || '',
      afterFingerprint: afterTable.fingerprint || '',
      unchanged:
        beforeTable.rowCount === afterTable.rowCount &&
        beforeTable.fingerprint === afterTable.fingerprint,
    }
  })
}

export async function buildFoundationDbInitSeedSplitDogfoodProof() {
  const before = await getFoundationDbInitSeedSplitMutationSnapshot()
  await initFoundationDb()
  const after = await getFoundationDbInitSeedSplitMutationSnapshot()
  const tableComparisons = compareFoundationDbInitSeedSplitSnapshots(before, after)
  const changedTables = tableComparisons.filter(table => !table.unchanged)

  return {
    ok: changedTables.length === 0,
    cardId: FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID,
    mode: 'schema-init-black-box-before-after',
    schemaInitFunction: 'initFoundationDb',
    explicitBootstrapFunction: 'bootstrapFoundationDb',
    watchedTables: tableComparisons.map(table => table.table),
    tableComparisons,
    changedTables,
    dogfoodInvariant: 'Calling initFoundationDb() must not seed, repair, close cards, or rewrite backlog/source/sprint truth.',
  }
}

export async function getFoundationDbReadOnlyGateReadiness(options = {}) {
  const requiredTables = Array.isArray(options.requiredTables) && options.requiredTables.length
    ? options.requiredTables.map(value => String(value || '').trim()).filter(Boolean)
    : FOUNDATION_DB_READ_ONLY_GATE_TABLES
  const result = await pool.query(
    `
      SELECT c.relname, c.oid::text AS oid, c.relkind::text AS relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1::text[])
        AND c.relkind IN ('r', 'p')
      ORDER BY c.relname ASC
    `,
    [requiredTables]
  )
  const foundByName = new Map(result.rows.map(row => [row.relname, row]))
  const missingTables = requiredTables.filter(name => !foundByName.has(name))

  return {
    ok: missingTables.length === 0,
    mode: 'read-only-metadata-check',
    checkedAt: new Date().toISOString(),
    requiredTables,
    presentTables: requiredTables
      .filter(name => foundByName.has(name))
      .map(name => ({
        name,
        oid: foundByName.get(name).oid,
        relkind: foundByName.get(name).relkind,
      })),
    missingTables,
    writeInitializationSkipped: true,
  }
}

export async function assertFoundationDbReadyForReadOnlyGate(label = 'Foundation read-only gate', options = {}) {
  const readiness = await getFoundationDbReadOnlyGateReadiness(options)
  if (!readiness.ok) {
    const missing = readiness.missingTables.join(', ') || 'unknown'
    throw new Error(`${label} requires an initialized Foundation DB before read-only gate checks. Missing tables: ${missing}. Start or restart the Foundation dashboard/worker, or run an explicit approved DB initialization path, then rerun the gate.`)
  }
  return readiness
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

function getRegisteredSourceContractIds() {
  return getSourceContracts().map(source => source.sourceId || source.id).filter(Boolean)
}

const intelligenceAtomStore = createIntelligenceAtomStore({
  pool: foundationPoolHandle,
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

const intelligenceRetrievalStore = createIntelligenceRetrievalStore({
  pool: foundationPoolHandle,
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
  pool: foundationPoolHandle,
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
  pool: foundationPoolHandle,
  withFoundationTransaction,
  insertChangeEvent,
  querySynthesisFacts,
})

export const runGovernedSynthesis = (...args) => intelligenceSynthesisStore.runGovernedSynthesis(...args)
export const getSynthesisEngineSnapshot = (...args) => intelligenceSynthesisStore.getSynthesisEngineSnapshot(...args)

const intelligenceActionRouterStore = createIntelligenceActionRouterStore({
  pool: foundationPoolHandle,
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

const foundationControlCompressionStore = createFoundationControlCompressionStore({
  pool: foundationPoolHandle,
  withFoundationTransaction,
  insertChangeEvent,
})

export const captureFoundationFeedbackItem = (...args) => foundationControlCompressionStore.captureFeedbackItem(...args)
export const listFoundationFeedbackItems = (...args) => foundationControlCompressionStore.listFeedbackItems(...args)
export const upsertFoundationAcknowledgedState = (...args) => foundationControlCompressionStore.upsertAcknowledgedState(...args)
export const listFoundationAcknowledgedStates = (...args) => foundationControlCompressionStore.listAcknowledgedStates(...args)
export const recordFoundationIncrementalVerifierRun = (...args) => foundationControlCompressionStore.recordIncrementalVerifierRun(...args)

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

function mapSourceMetricRows(rows = []) {
  return rows.map(row => Object.fromEntries(Object.entries({
    sourceId: row.source_id || row.sourceId,
    totalAtoms: row.total_atoms,
    activeAtoms: row.active_atoms,
    latestAtomAt: row.latest_atom_at?.toISOString?.() || row.latest_atom_at || null,
    totalFacts: row.total_facts,
    activeFacts: row.active_facts,
    latestFactAt: row.latest_fact_at?.toISOString?.() || row.latest_fact_at || null,
    totalSynthesizedItems: row.total_synthesized_items,
    activeSynthesizedItems: row.active_synthesized_items,
    latestSynthesizedAt: row.latest_synthesized_at?.toISOString?.() || row.latest_synthesized_at || null,
    totalRoutes: row.total_routes,
    activeRoutes: row.active_routes,
    pendingRoutes: row.pending_routes,
    appliedRoutes: row.applied_routes,
    latestRouteAt: row.latest_route_at?.toISOString?.() || row.latest_route_at || null,
  }).filter(([, value]) => value !== undefined)))
}

export async function getSourceMaturityOperationalMetrics() {
  const [
    atomResult,
    factResult,
    synthesizedResult,
    routeResult,
  ] = await Promise.all([
    pool.query(`
      SELECT source_id,
             COUNT(*)::integer AS total_atoms,
             COUNT(*) FILTER (WHERE status <> 'rejected')::integer AS active_atoms,
             MAX(updated_at) AS latest_atom_at
      FROM intelligence_atoms
      GROUP BY source_id
      ORDER BY source_id ASC
    `),
    pool.query(`
      SELECT source_id,
             COUNT(*)::integer AS total_facts,
             COUNT(*) FILTER (WHERE status = 'active')::integer AS active_facts,
             MAX(updated_at) AS latest_fact_at
      FROM intelligence_synthesis_facts
      GROUP BY source_id
      ORDER BY source_id ASC
    `),
    pool.query(`
      SELECT source_id,
             COUNT(*)::integer AS total_synthesized_items,
             COUNT(*) FILTER (WHERE status <> 'archived')::integer AS active_synthesized_items,
             MAX(created_at) AS latest_synthesized_at
      FROM (
        SELECT unnest(source_ids) AS source_id, status, created_at
        FROM intelligence_synthesized_items
        WHERE cardinality(source_ids) > 0
      ) item_sources
      GROUP BY source_id
      ORDER BY source_id ASC
    `),
    pool.query(`
      SELECT source_id,
             COUNT(*)::integer AS total_routes,
             COUNT(*) FILTER (WHERE approval_status <> 'cancelled')::integer AS active_routes,
             COUNT(*) FILTER (WHERE approval_status = 'pending')::integer AS pending_routes,
             COUNT(*) FILTER (WHERE approval_status = 'applied')::integer AS applied_routes,
             MAX(routed_at) AS latest_route_at
      FROM (
        SELECT unnest(source_ids) AS source_id, approval_status, routed_at
        FROM intelligence_action_routes
        WHERE cardinality(source_ids) > 0
      ) route_sources
      GROUP BY source_id
      ORDER BY source_id ASC
    `),
  ])

  return {
    generatedAt: new Date().toISOString(),
    atomsBySource: mapSourceMetricRows(atomResult.rows),
    factsBySource: mapSourceMetricRows(factResult.rows),
    synthesizedItemsBySource: mapSourceMetricRows(synthesizedResult.rows),
    routesBySource: mapSourceMetricRows(routeResult.rows),
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

  const backlogItems = backlogResult.rows.map(mapBacklogRow)
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
      backlogIdPrefixes: getBacklogIdPrefixes(),
      backlogScopes: getBacklogScopes(),
    },
  }
}

export async function getFoundationSnapshot(options = {}) {
  if (options?.mode === 'core') return getFoundationCoreSnapshot(options)

  const sharedCommunicationsArchive = await getSharedCommunicationArchiveSnapshot({ limit: 10 })
  const sharedCommunicationsCoverage = await getSharedCommunicationCoverageSnapshot()
  const sharedCommunicationCandidates = await getSharedCommunicationCandidateSnapshot({
    status: 'pending',
    limit: 10,
    includeItems: false,
  })
  const sharedCommunicationSynthesis = await getSharedCommunicationSynthesisSnapshot({
    limit: 3,
    itemLimit: 12,
  })
  const foundationJobs = await getFoundationJobRunSnapshot({ limit: 20 })
  const intelligenceJobs = await getIntelligenceJobLedgerSnapshot({ limit: 20 })
  const intelligenceAtomSpine = await getIntelligenceAtomSpineSnapshot({ limit: 20 })
  const intelligenceRetrieval = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  const intelligenceSynthesisFacts = await getSynthesisFactsSnapshot({ limit: 20 })
  const intelligenceSynthesis = await getSynthesisEngineSnapshot({ limit: 20 })
  const intelligenceActionRouter = await getActionRouterSnapshot({ limit: 100 })
  const llmRuntime = await getLlmRuntimeSnapshot({ limit: 20 })
  const extractionControl = await getExtractionControlSnapshot({ limit: 50 })
  const sourceMaturityOperational = await getSourceMaturityOperationalMetrics()
  const driveCorpusInventory = await getDriveCorpusInventorySnapshot({ limit: 20 })
  const backlogSeedDrift = await getBacklogSeedDriftSnapshot({ limit: 20 })
  const dbConstraintAudit = await getFoundationDbConstraintAudit({ limit: 20 })
  const [backlogResult, decisionsResult, parkingResult, questionsResult, memoryStatusResult, pendingDocUpdatesResult, recentChangesResult, usersResult] =
    await Promise.all([
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
        LIMIT 200
      `),
      pool.query(`
        SELECT id, title, summary, owner, created_at, updated_at
        FROM parking_lot_items
        ORDER BY created_at ASC
        LIMIT 200
      `),
      pool.query(`
        SELECT id, title, summary, owner, status, resolved_at, resolved_by, resolution_note, created_at, updated_at
        FROM open_questions
        ORDER BY status ASC, created_at ASC
        LIMIT 200
      `),
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
        LIMIT 20
      `),
      pool.query(`
        SELECT email, name, tier, user_type, active, meeting_sync_enabled, metadata, created_at, updated_at
        FROM users
        WHERE active = true
        ORDER BY user_type ASC, name ASC, email ASC
      `),
    ])

  const backlogItems = backlogResult.rows.map(mapBacklogRow)
  const decisions = decisionsResult.rows.map(mapDecisionRow)
  const pendingDocUpdates = pendingDocUpdatesResult.rows.map(mapPendingDocUpdateRow)
  const recentChanges = recentChangesResult.rows.map(mapChangeEventRow)
  const surfaceFreshnessSweep = buildFoundationSurfaceFreshnessSweep({
    backlogItems,
    extractionControl,
    backlogSeedDrift,
    dbConstraintAudit,
  })
  const cardReferenceTrust = await buildCardReferenceTrustStatus({
    declaredCardIds: backlogItems.map(item => item.id),
  })
  const sourceReferenceTrust = await buildSourceReferenceTrustStatus()

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
    meta: {
      canonicalDecisionCategories,
      backlogIdPrefixes: getBacklogIdPrefixes(),
      backlogScopes: getBacklogScopes(),
    },
  }
}

export function getCanonicalDecisionCategories() {
  return canonicalDecisionCategories.slice()
}

export function getFoundationBacklogIdPrefixes() {
  return getBacklogIdPrefixes()
}

export function getFoundationBacklogScopes() {
  return getBacklogScopes()
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

export async function getSharedCommunicationCoverageSnapshot() {
  return getSharedCommunicationCoverageSnapshotFromDb({ pool })
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

function stableLedgerId(prefix) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${prefix}-${timestamp}-${randomUUID().slice(0, 8)}`
}

export async function recordSourceDriftChange(input, actor = 'system') {
  return withFoundationTransaction(async client => {
    const eventType = String(input.eventType || '').trim()
    const entityTable = String(input.entityTable || '').trim()
    const entityId = String(input.entityId || '').trim()
    const summary = String(input.summary || '').trim()
    const metadata = input.metadata || {}
    const fingerprint = metadata && typeof metadata === 'object' ? String(metadata.fingerprint || '').trim() : ''

    if (!['source_drift_detected', 'source_drift_cleared'].includes(eventType)) {
      throw new Error('Source drift event type must be source_drift_detected or source_drift_cleared.')
    }
    if (!entityTable) throw new Error('Source drift entity table is required.')
    if (!entityId) throw new Error('Source drift entity id is required.')
    if (!summary) throw new Error('Source drift summary is required.')
    if (!fingerprint) throw new Error('Source drift fingerprint is required.')

    const existingResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type IN ('source_drift_detected', 'source_drift_cleared')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId]
    )

    const existing = existingResult.rows[0] ? mapChangeEventRow(existingResult.rows[0]) : null
    if (
      existing &&
      existing.eventType === eventType &&
      String(existing.metadata && existing.metadata.fingerprint || '') === fingerprint
    ) {
      return {
        inserted: false,
        event: existing,
      }
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable,
      entityId,
      actor,
      summary,
      metadata,
    })

    const insertedResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type = $3
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId, eventType]
    )

    return {
      inserted: true,
      event: insertedResult.rows[0] ? mapChangeEventRow(insertedResult.rows[0]) : null,
    }
  })
}

export async function recordReviewQueueChange(input, actor = 'system') {
  return withFoundationTransaction(async client => {
    const eventType = String(input.eventType || '').trim()
    const entityTable = String(input.entityTable || '').trim()
    const entityId = String(input.entityId || '').trim()
    const summary = String(input.summary || '').trim()
    const metadata = input.metadata || {}
    const fingerprint = metadata && typeof metadata === 'object' ? String(metadata.fingerprint || '').trim() : ''

    if (!['review_queue_changed', 'review_queue_cleared'].includes(eventType)) {
      throw new Error('Review queue event type must be review_queue_changed or review_queue_cleared.')
    }
    if (!entityTable) throw new Error('Review queue entity table is required.')
    if (!entityId) throw new Error('Review queue entity id is required.')
    if (!summary) throw new Error('Review queue summary is required.')
    if (!fingerprint) throw new Error('Review queue fingerprint is required.')

    const existingResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type IN ('review_queue_changed', 'review_queue_cleared')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId]
    )

    const existing = existingResult.rows[0] ? mapChangeEventRow(existingResult.rows[0]) : null
    if (
      existing &&
      existing.eventType === eventType &&
      String(existing.metadata && existing.metadata.fingerprint || '') === fingerprint
    ) {
      return {
        inserted: false,
        event: existing,
      }
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable,
      entityId,
      actor,
      summary,
      metadata,
    })

    const insertedResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type = $3
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId, eventType]
    )

    return {
      inserted: true,
      event: insertedResult.rows[0] ? mapChangeEventRow(insertedResult.rows[0]) : null,
    }
  })
}

const foundationDecisionStore = createFoundationDecisionStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getNextPrefixedId,
  canonicalDecisionCategories,
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

export async function closeFoundationDb() {
  if (!poolEndPromise) {
    poolEndPromise = pool.end()
  }
  await poolEndPromise
}

export async function resetFoundationDb() {
  await closeFoundationDb()
  pool = createFoundationPool()
  poolEndPromise = null
}
