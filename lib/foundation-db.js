import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { getSourceContracts } from './source-contracts.js'
import { createIntelligenceAtomStore, intelligenceAtomSchemaSql } from './intelligence-atoms.js'
import { createIntelligenceRetrievalStore, intelligenceRetrievalSchemaSql } from './intelligence-retrieval.js'
import { createIntelligenceSynthesisFactStore, intelligenceSynthesisFactsSchemaSql } from './intelligence-synthesis-facts.js'
import { createIntelligenceSynthesisStore, intelligenceSynthesisSchemaSql } from './intelligence-synthesis.js'
import { createIntelligenceActionRouterStore, intelligenceActionRouterSchemaSql } from './intelligence-action-router.js'
import {
  createFoundationControlCompressionStore,
  foundationControlCompressionSchemaSql,
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
import {
  decisionsSeed,
  docSourceSnapshotsSeed,
  foundationUserSeed,
  memoryStatusSeed,
  openQuestionsSeed,
  parkingLotSeed,
} from './foundation-core-seed.js'
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

async function seedTable(client, tableName, rows, insertSql, valuesBuilder) {
  for (const row of rows) {
    const values = valuesBuilder(row)
    await client.query(insertSql, values)
  }
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

function mapSalesListingAssignmentRow(row) {
  return {
    clickUpTaskId: row.clickup_task_id,
    listingTitle: row.listing_title || '',
    listingUrl: row.listing_url || '',
    agentName: row.agent_name || '',
    resetDate: row.reset_date?.toISOString?.()?.slice(0, 10) || row.reset_date || null,
    daysSinceReset: row.days_since_reset == null ? null : Number(row.days_since_reset),
    assignedLeaderKey: row.assigned_leader_key || '',
    assignedLeaderName: row.assigned_leader_name || '',
    assignedLeaderEmail: row.assigned_leader_email || '',
    actionPlanStatus: row.action_plan_status || 'not_started',
    caseStatus: row.case_status || 'identified',
    outcomeStatus: row.outcome_status || 'open',
    actionPlanState: row.action_plan_state || 'unknown',
    actionPlanNoReason: row.action_plan_no_reason || '',
    firstSeenStaleDate: row.first_seen_stale_date?.toISOString?.()?.slice(0, 10) || row.first_seen_stale_date || null,
    staleSinceDate: row.stale_since_date?.toISOString?.()?.slice(0, 10) || row.stale_since_date || null,
    originalResetDate: row.original_reset_date?.toISOString?.()?.slice(0, 10) || row.original_reset_date || null,
    currentResetDate: row.current_reset_date?.toISOString?.()?.slice(0, 10) || row.current_reset_date || null,
    adjustedAt: row.adjusted_at?.toISOString?.()?.slice(0, 10) || row.adjusted_at || null,
    adjustmentDetectedAt: row.adjustment_detected_at?.toISOString?.() || row.adjustment_detected_at || null,
    actionPlanText: row.action_plan_text || '',
    updatedBy: row.updated_by || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

const SALES_LISTING_CASE_HISTORY_LIMIT = 30

function normalizeSalesHistoryText(value, limit = 240) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

function salesHistoryValue(value) {
  if (value instanceof Date) return value.toISOString()
  return normalizeSalesHistoryText(value)
}

function salesHistoryActorLabel(actor) {
  const text = normalizeSalesHistoryText(actor, 80)
  if (!text) return 'system'
  if (text.includes('@')) return 'Sales Hub user'
  if (/process:sales-listings-hub-check/i.test(text)) return 'Sales Hub check'
  if (/sales-listing-case-sync/i.test(text)) return 'GLS sync'
  if (/sales-hub/i.test(text)) return 'Sales Hub'
  return text
}

function normalizeSalesCaseHistoryEvent(event) {
  if (!event || typeof event !== 'object') return null
  const at = normalizeSalesHistoryText(event.at || event.createdAt, 40)
  const title = normalizeSalesHistoryText(event.title, 80)
  if (!at || !title) return null
  return {
    id: normalizeSalesHistoryText(event.id || `${at}:${title}`, 120),
    at,
    title,
    source: normalizeSalesHistoryText(event.source, 80),
    actor: salesHistoryActorLabel(event.actor),
    note: normalizeSalesHistoryText(event.note, 500),
    changes: Array.isArray(event.changes)
      ? event.changes.map(change => ({
          field: normalizeSalesHistoryText(change?.field, 60),
          label: normalizeSalesHistoryText(change?.label, 80),
          from: normalizeSalesHistoryText(change?.from, 160),
          to: normalizeSalesHistoryText(change?.to, 160),
        })).filter(change => change.field && change.label)
      : [],
  }
}

function normalizeSalesCaseHistory(metadata) {
  const history = Array.isArray(metadata?.caseHistory) ? metadata.caseHistory : []
  return history.map(normalizeSalesCaseHistoryEvent).filter(Boolean).slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
}

function buildSalesCaseHistoryTitle(changes, input = {}) {
  const outcome = String(input.outcomeStatus || '').trim()
  const actionPlanState = String(input.actionPlanState || '').trim()
  if (changes.some(change => change.field === 'actionPlanNoReason') && !String(input.actionPlanNoReason || '').trim()) return 'No-game-plan reason cleared'
  if (changes.some(change => change.field === 'actionPlanText') && !String(input.actionPlanText || '').trim()) return 'Game plan note cleared'
  if (['no_action', 'cancelled', 'expired'].includes(outcome)) return 'Marked failed'
  if (['conditional', 'firm', 'closed'].includes(outcome)) return 'Movement recorded'
  if (outcome === 'adjusted') return 'Adjusted or repositioned'
  if (changes.some(change => change.field === 'currentResetDate' || change.field === 'adjustedAt')) return 'Listing adjusted or relisted'
  if (actionPlanState === 'no') return 'Game plan marked no'
  if (actionPlanState === 'yes') return 'Game plan marked yes'
  if (changes.some(change => change.field === 'actionPlanNoReason')) return 'No-game-plan reason updated'
  if (changes.some(change => change.field === 'actionPlanText')) return 'Game plan note updated'
  if (changes.some(change => change.field === 'assignedLeader')) return 'Sales leader updated'
  if (changes.some(change => change.field === 'caseStatus')) return 'Case status updated'
  return 'Case updated'
}

function buildSalesCaseHistoryNote(input = {}, flags = {}) {
  if (flags.hasActionPlanNoReason && String(input.actionPlanNoReason || '').trim()) {
    return normalizeSalesHistoryText(input.actionPlanNoReason, 500)
  }
  if (flags.hasActionPlanText && String(input.actionPlanText || '').trim()) {
    return normalizeSalesHistoryText(input.actionPlanText, 500)
  }
  return ''
}

function currentSalesCaseChanges(existing = {}) {
  return [
    { field: 'assignedLeader', label: 'Sales leader', from: '', to: existing.assignedLeaderName || existing.assignedLeaderKey || 'Unassigned' },
    { field: 'caseStatus', label: 'Case status', from: '', to: existing.caseStatus || 'identified' },
    { field: 'outcomeStatus', label: 'Outcome', from: '', to: existing.outcomeStatus || 'open' },
    { field: 'actionPlanState', label: 'Game plan', from: '', to: existing.actionPlanState || 'unknown' },
    existing.actionPlanNoReason
      ? { field: 'actionPlanNoReason', label: 'No-game-plan reason', from: '', to: existing.actionPlanNoReason }
      : null,
    existing.actionPlanText
      ? { field: 'actionPlanText', label: 'Game plan note', from: '', to: existing.actionPlanText }
      : null,
  ].filter(change => change && change.to)
}

function historyAlreadyHasCurrentNote(history = [], existing = {}) {
  const note = normalizeSalesHistoryText(existing.actionPlanNoReason || existing.actionPlanText || '', 500)
  if (!note) return true
  return history.some(event =>
    normalizeSalesHistoryText(event.note, 500) === note ||
    (event.changes || []).some(change => ['actionPlanNoReason', 'actionPlanText'].includes(change.field) && normalizeSalesHistoryText(change.to, 500) === note)
  )
}

function buildCurrentSalesCaseCapture(existing = {}, inputMetadata = {}, actor = 'system', at = new Date().toISOString()) {
  const note = normalizeSalesHistoryText(existing.actionPlanNoReason || existing.actionPlanText || 'History started from existing GLS case state.', 500)
  return {
    id: `gls-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at,
    title: existing.actionPlanNoReason ? 'No-game-plan reason captured' : 'Current state captured',
    source: normalizeSalesHistoryText(inputMetadata.source || 'sales-hub', 80),
    actor: salesHistoryActorLabel(actor),
    note,
    changes: currentSalesCaseChanges(existing),
  }
}

function buildSalesCaseHistory(existing, input = {}, inputMetadata = {}, actor = 'system', flags = {}) {
  const priorHistory = normalizeSalesCaseHistory(existing?.metadata)
  const source = normalizeSalesHistoryText(inputMetadata.source || 'sales-hub', 80)
  const at = new Date().toISOString()
  const changes = []

  function addChange(enabled, field, label, fromValue, toValue) {
    if (!enabled) return
    const from = salesHistoryValue(fromValue)
    const to = salesHistoryValue(toValue)
    if (from === to) return
    changes.push({ field, label, from, to })
  }

  addChange(
    Object.prototype.hasOwnProperty.call(input, 'assignedLeaderKey'),
    'assignedLeader',
    'Sales leader',
    existing?.assignedLeaderName || existing?.assignedLeaderKey || 'Unassigned',
    input.assignedLeaderName || input.assignedLeaderKey || 'Unassigned'
  )
  addChange(flags.hasCaseStatus, 'caseStatus', 'Case status', existing?.caseStatus || '', input.caseStatus || 'identified')
  addChange(flags.hasOutcomeStatus, 'outcomeStatus', 'Outcome', existing?.outcomeStatus || '', input.outcomeStatus || 'open')
  addChange(flags.hasActionPlanState, 'actionPlanState', 'Game plan', existing?.actionPlanState || '', input.actionPlanState || 'unknown')
  addChange(flags.hasActionPlanNoReason, 'actionPlanNoReason', 'No-game-plan reason', existing?.actionPlanNoReason || '', input.actionPlanNoReason || '')
  addChange(flags.hasActionPlanText, 'actionPlanText', 'Game plan note', existing?.actionPlanText || '', input.actionPlanText || '')
  addChange(
    Object.prototype.hasOwnProperty.call(input, 'currentResetDate'),
    'currentResetDate',
    'Reset date',
    existing?.currentResetDate || '',
    input.currentResetDate || ''
  )
  addChange(
    Object.prototype.hasOwnProperty.call(input, 'adjustedAt'),
    'adjustedAt',
    'Adjusted date',
    existing?.adjustedAt || '',
    input.adjustedAt || ''
  )

  if (!existing) {
    return [
      ...priorHistory,
      {
        id: `gls-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at,
        title: 'Entered GLS',
        source,
        actor: salesHistoryActorLabel(actor),
        note: normalizeSalesHistoryText(inputMetadata.clickUpStatus || 'Listing crossed the stale threshold.', 500),
        changes: changes.filter(change => change.to),
      },
    ].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
  }

  if (!priorHistory.length && !changes.length) {
    return [buildCurrentSalesCaseCapture(existing, inputMetadata, actor, at)].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
  }

  if (!changes.length && !historyAlreadyHasCurrentNote(priorHistory, existing)) {
    return [
      ...priorHistory,
      buildCurrentSalesCaseCapture(existing, inputMetadata, actor, at),
    ].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
  }

  if (!changes.length) return null

  return [
    ...priorHistory,
    {
      id: `gls-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at,
      title: buildSalesCaseHistoryTitle(changes, input),
      source,
      actor: salesHistoryActorLabel(actor),
      note: buildSalesCaseHistoryNote(input, flags),
      changes,
    },
  ].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
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

export async function initFoundationDb(options = {}) {
  const includeBootstrapSeed = options?.includeBootstrapSeed === true
  const client = await pool.connect()
  let schemaLockHeld = false

  try {
    await client.query("SELECT pg_advisory_lock(hashtext('bcrew_foundation_schema_init'))")
    schemaLockHeld = true
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS backlog_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        team TEXT NOT NULL,
        lane TEXT NOT NULL CHECK (lane IN ('research', 'scoped', 'ranked', 'executing', 'parked', 'done')),
        priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
        rank INTEGER,
        source TEXT,
        summary TEXT,
        why_it_matters TEXT,
        next_action TEXT,
        status_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_backlog_team_lane_rank
      ON backlog_items(team, lane, rank, created_at);

      CREATE TABLE IF NOT EXISTS foundation_sprints (
        sprint_id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
        goal TEXT NOT NULL,
        active_blocker_card_id TEXT REFERENCES backlog_items(id),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_foundation_sprints_one_active
      ON foundation_sprints((status))
      WHERE status = 'active';

      CREATE TABLE IF NOT EXISTS foundation_sprint_items (
        sprint_id TEXT NOT NULL REFERENCES foundation_sprints(sprint_id) ON DELETE CASCADE,
        backlog_id TEXT NOT NULL REFERENCES backlog_items(id),
        sprint_order INTEGER NOT NULL,
        stage TEXT NOT NULL CHECK (stage IN ('scoping', 'sprint_ready', 'building_now', 'done_this_sprint', 'returned')),
        plan_ref TEXT,
        definition_of_done TEXT NOT NULL,
        proof_commands TEXT[] NOT NULL DEFAULT '{}'::text[],
        readiness_blocker_cleared TEXT,
        not_next_boundaries TEXT[] NOT NULL DEFAULT '{}'::text[],
        existing_work_check JSONB NOT NULL DEFAULT '{}'::jsonb,
        returned_reason TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (sprint_id, backlog_id),
        UNIQUE (sprint_id, sprint_order)
      );

      CREATE INDEX IF NOT EXISTS idx_foundation_sprint_items_backlog
      ON foundation_sprint_items(backlog_id);

      CREATE INDEX IF NOT EXISTS idx_foundation_sprint_items_stage
      ON foundation_sprint_items(stage, sprint_order);

      CREATE TABLE IF NOT EXISTS plan_critic_runs (
        run_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        plan_ref TEXT,
        status TEXT NOT NULL CHECK (status IN ('pass', 'revise', 'error')),
        score NUMERIC NOT NULL DEFAULT 0,
        max_score NUMERIC NOT NULL DEFAULT 10,
        pass_threshold NUMERIC NOT NULL DEFAULT 9.8,
        priority TEXT,
        gate_level TEXT,
        full_verify_required BOOLEAN NOT NULL DEFAULT false,
        changed_files TEXT[] NOT NULL DEFAULT '{}'::text[],
        findings JSONB NOT NULL DEFAULT '[]'::jsonb,
        result JSONB NOT NULL DEFAULT '{}'::jsonb,
        requested_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_plan_critic_runs_lookup
      ON plan_critic_runs(card_id, status, created_at DESC);

      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('locked', 'proposed', 'superseded')),
        summary TEXT NOT NULL,
        rationale TEXT,
        source_ref TEXT,
        decision_owner TEXT,
        confirmed_by TEXT,
        participant_names TEXT[],
        context_ref TEXT,
        evidence_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_decisions_status_category
      ON decisions(status, category, created_at DESC);

      CREATE TABLE IF NOT EXISTS parking_lot_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS open_questions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS memory_system_status (
        component_key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('live', 'pending', 'planned', 'risk')),
        detail TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS foundation_runtime_status (
        service_key TEXT PRIMARY KEY,
        service_label TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('starting', 'live', 'risk', 'stale', 'unknown')),
        started_at TIMESTAMPTZ,
        process_id INTEGER,
        running_commit TEXT,
        running_short_commit TEXT,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        check_name TEXT NOT NULL,
        restart_command TEXT NOT NULL,
        plain_english TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS doc_source_snapshots (
        id TEXT PRIMARY KEY,
        doc_path TEXT NOT NULL,
        source_id TEXT NOT NULL,
        group_title TEXT NOT NULL,
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        detail TEXT,
        as_of DATE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_doc_source_snapshots_doc_path
      ON doc_source_snapshots(doc_path, group_title, sort_order, created_at);

      CREATE TABLE IF NOT EXISTS strategy_hub_snapshots (
        snapshot_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        source_status TEXT NOT NULL DEFAULT 'live'
          CHECK (source_status IN ('live', 'degraded')),
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT NOT NULL DEFAULT 'system'
      );

      CREATE TABLE IF NOT EXISTS fub_lead_source_rules (
        source_name TEXT PRIMARY KEY,
        marketing_type TEXT NOT NULL DEFAULT 'unclassified'
          CHECK (marketing_type IN ('marketing', 'non_marketing', 'unclassified')),
        ownership_type TEXT NOT NULL DEFAULT 'unclassified'
          CHECK (ownership_type IN ('company', 'agent', 'referral', 'other', 'unclassified')),
        flag_state TEXT NOT NULL DEFAULT 'none'
          CHECK (flag_state IN ('none', 'needs_cleanup', 'not_canonical', 'merge_candidate')),
        source_group TEXT,
        notes TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_fub_lead_source_rules_marketing
      ON fub_lead_source_rules(marketing_type, ownership_type, updated_at DESC);

      CREATE TABLE IF NOT EXISTS fub_lead_source_snapshots (
        context_key TEXT PRIMARY KEY,
        context_label TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '[]'::jsonb,
        unique_sources INTEGER NOT NULL DEFAULT 0,
        people_scanned INTEGER NOT NULL DEFAULT 0,
        pages_scanned INTEGER NOT NULL DEFAULT 0,
        truncated BOOLEAN NOT NULL DEFAULT FALSE,
        refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        refreshed_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_fub_lead_source_snapshots_refreshed
      ON fub_lead_source_snapshots(refreshed_at DESC);
    `)

    await client.query(`
      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS classified_by TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS supersedes_ids TEXT[];

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS decision_owner TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS confirmed_by TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS participant_names TEXT[];

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS context_ref TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS evidence_notes TEXT;

      ALTER TABLE decisions
      DROP CONSTRAINT IF EXISTS decisions_category_check;

      ALTER TABLE decisions
      ADD CONSTRAINT decisions_category_check
      CHECK (category IN ('strategy', 'system', 'execution', 'people'));

      ALTER TABLE backlog_items
      ADD COLUMN IF NOT EXISTS owner TEXT;

      ALTER TABLE fub_lead_source_rules
      ADD COLUMN IF NOT EXISTS flag_state TEXT NOT NULL DEFAULT 'none';

      ALTER TABLE fub_lead_source_rules
      DROP CONSTRAINT IF EXISTS fub_lead_source_rules_flag_state_check;

      ALTER TABLE fub_lead_source_rules
      ADD CONSTRAINT fub_lead_source_rules_flag_state_check
      CHECK (flag_state IN ('none', 'needs_cleanup', 'not_canonical', 'merge_candidate'));

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

      ALTER TABLE open_questions
      DROP CONSTRAINT IF EXISTS open_questions_status_check;

      ALTER TABLE open_questions
      ADD CONSTRAINT open_questions_status_check
      CHECK (status IN ('open', 'resolved'));

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolved_by TEXT;

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolution_note TEXT;

      CREATE TABLE IF NOT EXISTS pending_doc_updates (
        id TEXT PRIMARY KEY,
        decision_id TEXT REFERENCES decisions(id),
        target_doc_path TEXT NOT NULL,
        target_section TEXT,
        summary TEXT NOT NULL,
        current_text TEXT,
        proposed_text TEXT NOT NULL,
        proposed_diff TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'expired', 'failed')),
        proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        proposed_by TEXT NOT NULL,
        reviewed_at TIMESTAMPTZ,
        reviewed_by TEXT,
        applied_at TIMESTAMPTZ,
        applied_commit TEXT,
        expires_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_status
      ON pending_doc_updates(status);

      CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_decision
      ON pending_doc_updates(decision_id);

      CREATE TABLE IF NOT EXISTS change_events (
        id BIGSERIAL PRIMARY KEY,
        event_type TEXT NOT NULL
          CHECK (event_type IN (
            'decision_proposed', 'decision_classified', 'decision_locked', 'decision_superseded',
            'backlog_created', 'backlog_status_changed', 'backlog_updated',
            'question_created', 'question_updated', 'question_resolved', 'question_reopened',
            'doc_update_proposed', 'doc_update_approved', 'doc_update_applied', 'doc_update_rejected', 'doc_update_failed',
            'source_drift_detected', 'source_drift_cleared',
            'review_queue_changed', 'review_queue_cleared',
            'job_run_started', 'job_run_succeeded', 'job_run_failed', 'job_run_process_metadata_updated',
            'foundation_job_control_updated',
            'foundation_sprint_updated',
            'drive_access_preflight_recorded', 'meeting_vault_acl_audit_recorded', 'meeting_vault_auto_enforcement_recorded',
            'llm_credential_updated', 'llm_route_updated', 'llm_route_probe_recorded',
            'source_crawl_target_updated', 'source_crawl_item_updated',
            'intelligence_job_run_recorded',
            'intelligence_report_artifact_recorded',
            'intelligence_atom_upserted',
            'intelligence_atom_hit_recorded',
            'intelligence_retrieval_run_recorded',
            'intelligence_retrieval_chunk_upserted',
            'intelligence_synthesis_facts_run_recorded',
            'intelligence_synthesis_run_recorded',
            'intelligence_action_router_run_recorded',
            'intelligence_action_route_proposed',
            'intelligence_action_route_curated',
            'intelligence_action_route_approved',
            'intelligence_action_route_applied'
          )),
        entity_table TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        summary TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_change_events_created_at
      ON change_events(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_change_events_entity
      ON change_events(entity_table, entity_id);

      ALTER TABLE change_events
      DROP CONSTRAINT IF EXISTS change_events_event_type_check;

      ALTER TABLE change_events
      ADD CONSTRAINT change_events_event_type_check
      CHECK (event_type IN (
        'decision_proposed', 'decision_classified', 'decision_locked', 'decision_superseded',
        'backlog_created', 'backlog_status_changed', 'backlog_updated',
        'question_created', 'question_updated', 'question_resolved', 'question_reopened',
        'doc_update_proposed', 'doc_update_approved', 'doc_update_applied', 'doc_update_rejected', 'doc_update_failed',
        'source_drift_detected', 'source_drift_cleared',
        'review_queue_changed', 'review_queue_cleared',
        'job_run_started', 'job_run_succeeded', 'job_run_failed', 'job_run_process_metadata_updated',
        'foundation_job_control_updated',
        'foundation_sprint_updated',
        'drive_access_preflight_recorded', 'meeting_vault_acl_audit_recorded', 'meeting_vault_auto_enforcement_recorded',
        'llm_credential_updated', 'llm_route_updated', 'llm_route_probe_recorded',
        'source_crawl_target_updated', 'source_crawl_item_updated',
        'intelligence_job_run_recorded',
        'intelligence_report_artifact_recorded',
        'intelligence_atom_upserted',
        'intelligence_atom_hit_recorded',
        'intelligence_retrieval_run_recorded',
        'intelligence_retrieval_chunk_upserted',
        'intelligence_synthesis_facts_run_recorded',
        'intelligence_synthesis_run_recorded',
        'intelligence_action_router_run_recorded',
        'intelligence_action_route_proposed',
        'intelligence_action_route_curated',
        'intelligence_action_route_approved',
        'intelligence_action_route_applied'
      ));

      CREATE TABLE IF NOT EXISTS shared_communication_artifacts (
        artifact_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL
          CHECK (artifact_type IN ('meeting_note', 'meeting_transcript', 'email_thread', 'calendar_event', 'missive_thread', 'slack_thread', 'drive_document', 'drive_spreadsheet', 'drive_pdf', 'drive_text', 'gmail_attachment', 'video_transcript')),
        external_id TEXT NOT NULL,
        title TEXT,
        source_account TEXT,
        source_container TEXT,
        source_url TEXT,
        participants JSONB NOT NULL DEFAULT '[]'::jsonb,
        content_text TEXT NOT NULL DEFAULT '',
        content_hash TEXT NOT NULL DEFAULT '',
        artifact_created_at TIMESTAMPTZ,
        artifact_updated_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        ingested_by TEXT,
        ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_artifacts_source
      ON shared_communication_artifacts(source_id, artifact_type, artifact_updated_at DESC, ingested_at DESC);

      CREATE TABLE IF NOT EXISTS shared_communication_candidates (
        candidate_key TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL REFERENCES shared_communication_artifacts(artifact_id) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        candidate_type TEXT NOT NULL
          CHECK (candidate_type IN ('task_candidate', 'decision_candidate', 'blocker', 'feedback_signal', 'atom_candidate')),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'duplicate')),
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner_hint TEXT,
        evidence_excerpt TEXT,
        confidence NUMERIC(4,3),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_candidates_lookup
      ON shared_communication_candidates(source_id, candidate_type, status, updated_at DESC);

      CREATE TABLE IF NOT EXISTS shared_communication_artifact_processing_runs (
        run_id TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL REFERENCES shared_communication_artifacts(artifact_id) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL,
        artifact_content_hash TEXT NOT NULL DEFAULT '',
        processing_type TEXT NOT NULL,
        extraction_method TEXT,
        provider TEXT,
        auth_path TEXT,
        route_key TEXT,
        model TEXT,
        status TEXT NOT NULL
          CHECK (status IN ('succeeded', 'failed', 'skipped', 'blocked')),
        candidate_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        processed_by TEXT,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE shared_communication_artifact_processing_runs
      ADD COLUMN IF NOT EXISTS artifact_content_hash TEXT NOT NULL DEFAULT '';

      ALTER TABLE shared_communication_artifact_processing_runs
      ADD COLUMN IF NOT EXISTS provider TEXT;

      ALTER TABLE shared_communication_artifact_processing_runs
      ADD COLUMN IF NOT EXISTS auth_path TEXT;

      ALTER TABLE shared_communication_artifact_processing_runs
      ADD COLUMN IF NOT EXISTS route_key TEXT;

      CREATE INDEX IF NOT EXISTS idx_shared_communication_artifact_processing_lookup
      ON shared_communication_artifact_processing_runs(
        source_id, artifact_type, processing_type, extraction_method, status, processed_at DESC
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_artifact_processing_artifact
      ON shared_communication_artifact_processing_runs(artifact_id, processing_type, extraction_method, status);

      CREATE INDEX IF NOT EXISTS idx_shared_communication_artifact_processing_current
      ON shared_communication_artifact_processing_runs(
        artifact_id, processing_type, extraction_method, artifact_content_hash, status
      );

      CREATE TABLE IF NOT EXISTS shared_communication_synthesis_runs (
        run_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed'
          CHECK (status IN ('completed', 'failed')),
        model TEXT NOT NULL,
        output_path TEXT,
        candidate_limit INTEGER,
        candidates_read INTEGER NOT NULL DEFAULT 0,
        days_window INTEGER,
        max_items INTEGER,
        source_coverage JSONB NOT NULL DEFAULT '[]'::jsonb,
        suppressed_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
        open_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        archive_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
        candidate_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
        source_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE shared_communication_synthesis_runs
      ADD COLUMN IF NOT EXISTS source_facts JSONB NOT NULL DEFAULT '{}'::jsonb;

      CREATE INDEX IF NOT EXISTS idx_shared_communication_synthesis_runs_generated
      ON shared_communication_synthesis_runs(generated_at DESC);

      CREATE TABLE IF NOT EXISTS shared_communication_synthesized_items (
        synthesis_item_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES shared_communication_synthesis_runs(run_id) ON DELETE CASCADE,
        rank INTEGER NOT NULL,
        item_type TEXT NOT NULL
          CHECK (item_type IN (
            'decision',
            'blocker',
            'action_item',
            'strategic_issue',
            'pattern',
            'content_atom',
            'source_trust_issue'
          )),
        status TEXT NOT NULL
          CHECK (status IN (
            'new',
            'active',
            'needs_decision',
            'needs_owner',
            'stale_watch',
            'historical_context',
            'likely_resolved'
          )),
        title TEXT NOT NULL,
        one_line TEXT NOT NULL DEFAULT '',
        why_it_matters TEXT NOT NULL DEFAULT '',
        recommended_next_action TEXT NOT NULL DEFAULT '',
        suggested_owner TEXT,
        source_count INTEGER NOT NULL DEFAULT 0,
        candidate_keys TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        evidence_summary TEXT NOT NULL DEFAULT '',
        confidence NUMERIC(4,3),
        sensitivity TEXT NOT NULL DEFAULT 'neutral'
          CHECK (sensitivity IN (
            'neutral',
            'positive',
            'performance_concern',
            'termination_risk',
            'comp_discussion',
            'undisclosed_feedback'
          )),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_synthesized_items_run
      ON shared_communication_synthesized_items(run_id, rank ASC);

      CREATE INDEX IF NOT EXISTS idx_shared_communication_synthesized_items_lookup
      ON shared_communication_synthesized_items(item_type, status, rank ASC);

      ${intelligenceAtomSchemaSql}

      ${intelligenceRetrievalSchemaSql}

      ${intelligenceSynthesisFactsSchemaSql}

      ${intelligenceSynthesisSchemaSql}

      ${intelligenceActionRouterSchemaSql}

      ${foundationControlCompressionSchemaSql}

      CREATE TABLE IF NOT EXISTS foundation_job_runs (
        run_id TEXT PRIMARY KEY,
        job_key TEXT NOT NULL,
        title TEXT NOT NULL,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
        command JSONB NOT NULL DEFAULT '{}'::jsonb,
        requested_by TEXT NOT NULL DEFAULT 'system',
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        duration_ms INTEGER,
        exit_code INTEGER,
        signal TEXT,
        output_tail TEXT NOT NULL DEFAULT '',
        error_message TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_foundation_job_runs_lookup
      ON foundation_job_runs(job_key, status, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_foundation_job_runs_created
      ON foundation_job_runs(created_at DESC);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_foundation_job_runs_active_unique
      ON foundation_job_runs(job_key)
      WHERE status IN ('queued', 'running');

      CREATE TABLE IF NOT EXISTS foundation_job_controls (
        job_key TEXT PRIMARY KEY,
        runtime_mode TEXT
          CHECK (runtime_mode IS NULL OR runtime_mode IN ('scheduled', 'manual', 'paused', 'decommissioned')),
        enabled BOOLEAN,
        schedule_every_minutes INTEGER
          CHECK (schedule_every_minutes IS NULL OR schedule_every_minutes > 0),
        pause_reason TEXT,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE foundation_job_controls
      DROP CONSTRAINT IF EXISTS foundation_job_controls_runtime_mode_check;

      ALTER TABLE foundation_job_controls
      ADD CONSTRAINT foundation_job_controls_runtime_mode_check
      CHECK (runtime_mode IS NULL OR runtime_mode IN ('scheduled', 'manual', 'paused', 'decommissioned'));

      CREATE TABLE IF NOT EXISTS llm_credentials (
        credential_key TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        auth_path TEXT NOT NULL
          CHECK (auth_path IN (
            'api_direct',
            'claude_code_subscription',
            'claude_code_oauth_token',
            'claude_agent_sdk',
            'chatgpt_subscription_gateway',
            'codex_subscription',
            'gemini_api_direct',
            'manual_interactive'
          )),
        display_name TEXT NOT NULL,
        account_label TEXT,
        hub_key TEXT NOT NULL DEFAULT 'foundation',
        workload_lane TEXT NOT NULL DEFAULT 'foundation',
        secret_ref TEXT,
        status TEXT NOT NULL DEFAULT 'unknown'
          CHECK (status IN ('unknown', 'available', 'missing', 'blocked', 'exhausted', 'disabled')),
        policy_classification TEXT NOT NULL DEFAULT 'untested'
          CHECK (policy_classification IN (
            'untested',
            'allowed',
            'blocked',
            'manual_only',
            'experimental',
            'api_fallback'
          )),
        allowed_workloads TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        notes TEXT,
        quota_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_llm_credentials_lookup
      ON llm_credentials(provider, auth_path, hub_key, workload_lane, status);

      CREATE TABLE IF NOT EXISTS llm_routes (
        route_key TEXT PRIMARY KEY,
        workload TEXT NOT NULL,
        hub_key TEXT NOT NULL DEFAULT 'foundation',
        priority INTEGER NOT NULL DEFAULT 1,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        auth_path TEXT NOT NULL
          CHECK (auth_path IN (
            'api_direct',
            'claude_code_subscription',
            'claude_code_oauth_token',
            'claude_agent_sdk',
            'chatgpt_subscription_gateway',
            'codex_subscription',
            'gemini_api_direct',
            'manual_interactive'
          )),
        credential_key TEXT REFERENCES llm_credentials(credential_key) ON DELETE SET NULL,
        fallback_route_key TEXT,
        status TEXT NOT NULL DEFAULT 'planned'
          CHECK (status IN ('planned', 'probe_required', 'available', 'blocked', 'disabled')),
        policy_classification TEXT NOT NULL DEFAULT 'untested'
          CHECK (policy_classification IN (
            'untested',
            'allowed',
            'blocked',
            'manual_only',
            'experimental',
            'api_fallback'
          )),
        cost_cap_usd NUMERIC(10,4),
        risk_class TEXT NOT NULL DEFAULT 'untested'
          CHECK (risk_class IN ('low', 'medium', 'high', 'untested', 'blocked')),
        notes TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_llm_routes_lookup
      ON llm_routes(workload, hub_key, priority, status);

      CREATE TABLE IF NOT EXISTS llm_route_probes (
        probe_id TEXT PRIMARY KEY,
        credential_key TEXT REFERENCES llm_credentials(credential_key) ON DELETE SET NULL,
        provider TEXT NOT NULL,
        auth_path TEXT NOT NULL,
        probe_type TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('passed', 'failed', 'skipped', 'warning')),
        detail TEXT NOT NULL DEFAULT '',
        capability JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        probed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        probed_by TEXT NOT NULL DEFAULT 'system'
      );

      CREATE INDEX IF NOT EXISTS idx_llm_route_probes_lookup
      ON llm_route_probes(provider, auth_path, probe_type, probed_at DESC);

      CREATE TABLE IF NOT EXISTS llm_calls (
        call_id TEXT PRIMARY KEY,
        workload TEXT NOT NULL,
        hub_key TEXT NOT NULL DEFAULT 'foundation',
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        auth_path TEXT NOT NULL,
        credential_key TEXT REFERENCES llm_credentials(credential_key) ON DELETE SET NULL,
        route_key TEXT REFERENCES llm_routes(route_key) ON DELETE SET NULL,
        status TEXT NOT NULL
          CHECK (status IN ('planned', 'started', 'succeeded', 'failed', 'skipped')),
        estimated_input_tokens INTEGER,
        estimated_output_tokens INTEGER,
        estimated_cost_usd NUMERIC(12,6),
        error_message TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_llm_calls_lookup
      ON llm_calls(workload, hub_key, status, created_at DESC);

      CREATE TABLE IF NOT EXISTS source_crawl_targets (
        target_key TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        title TEXT NOT NULL,
        lane TEXT NOT NULL
          CHECK (lane IN ('current_day', 'backfill', 'corpus_mining', 'recovery')),
        target_type TEXT NOT NULL DEFAULT 'source',
        status TEXT NOT NULL DEFAULT 'planned'
          CHECK (status IN ('planned', 'active', 'paused', 'complete', 'blocked')),
        priority TEXT NOT NULL DEFAULT 'P1'
          CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
        runtime_mode TEXT NOT NULL DEFAULT 'manual'
          CHECK (runtime_mode IN ('scheduled', 'manual', 'paused')),
        cursor_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        budget JSONB NOT NULL DEFAULT '{}'::jsonb,
        dedupe_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
        lease_owner TEXT,
        lease_expires_at TIMESTAMPTZ,
        last_run_at TIMESTAMPTZ,
        next_run_at TIMESTAMPTZ,
        last_status TEXT,
        last_error TEXT,
        inspected_count INTEGER NOT NULL DEFAULT 0,
        archived_count INTEGER NOT NULL DEFAULT 0,
        extracted_count INTEGER NOT NULL DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        notes TEXT,
        updated_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_source_crawl_targets_lookup
      ON source_crawl_targets(lane, status, priority, updated_at DESC);

      CREATE TABLE IF NOT EXISTS source_crawl_target_runs (
        run_id TEXT PRIMARY KEY,
        target_key TEXT NOT NULL REFERENCES source_crawl_targets(target_key) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('running', 'succeeded', 'partial', 'failed', 'skipped')),
        lease_owner TEXT NOT NULL,
        lease_expires_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        next_run_at TIMESTAMPTZ,
        last_error TEXT,
        inspected_delta INTEGER NOT NULL DEFAULT 0,
        archived_delta INTEGER NOT NULL DEFAULT 0,
        extracted_delta INTEGER NOT NULL DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_source_crawl_target_runs_lookup
      ON source_crawl_target_runs(target_key, status, started_at DESC);

      CREATE TABLE IF NOT EXISTS source_crawl_items (
        item_key TEXT PRIMARY KEY,
        target_key TEXT NOT NULL REFERENCES source_crawl_targets(target_key) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        external_id TEXT NOT NULL,
        item_type TEXT NOT NULL DEFAULT 'artifact',
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'leased', 'succeeded', 'failed', 'skipped')),
        fingerprint TEXT,
        lease_owner TEXT,
        lease_expires_at TIMESTAMPTZ,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        retry_state TEXT NOT NULL DEFAULT 'not_evaluated'
          CHECK (retry_state IN ('not_evaluated', 'not_retryable', 'eligible', 'waiting', 'leased', 'succeeded', 'skipped', 'blocked', 'exhausted')),
        max_attempts INTEGER NOT NULL DEFAULT 3,
        next_retry_at TIMESTAMPTZ,
        last_attempted_at TIMESTAMPTZ,
        last_source_crawl_run_id TEXT REFERENCES source_crawl_target_runs(run_id) ON DELETE SET NULL,
        retry_reason TEXT,
        retry_blocker_card TEXT,
        last_error TEXT,
        artifact_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (target_key, external_id)
      );

      CREATE INDEX IF NOT EXISTS idx_source_crawl_items_lookup
      ON source_crawl_items(target_key, status, updated_at DESC);

      CREATE TABLE IF NOT EXISTS source_crawl_item_attempts (
        attempt_id TEXT PRIMARY KEY,
        item_key TEXT REFERENCES source_crawl_items(item_key) ON DELETE CASCADE,
        target_key TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_crawl_run_id TEXT REFERENCES source_crawl_target_runs(run_id) ON DELETE SET NULL,
        attempt_number INTEGER NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('leased', 'succeeded', 'failed', 'skipped', 'blocked')),
        lease_owner TEXT,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        next_retry_at TIMESTAMPTZ,
        error_class TEXT,
        error_message TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_source_crawl_item_attempts_idempotent
      ON source_crawl_item_attempts(item_key, source_crawl_run_id, attempt_number);

      CREATE INDEX IF NOT EXISTS idx_source_crawl_item_attempts_lookup
      ON source_crawl_item_attempts(target_key, status, updated_at DESC);

      ALTER TABLE source_crawl_items
      ADD COLUMN IF NOT EXISTS retry_state TEXT NOT NULL DEFAULT 'not_evaluated';

      ALTER TABLE source_crawl_items
      ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;

      ALTER TABLE source_crawl_items
      ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

      ALTER TABLE source_crawl_items
      ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ;

      ALTER TABLE source_crawl_items
      ADD COLUMN IF NOT EXISTS last_source_crawl_run_id TEXT REFERENCES source_crawl_target_runs(run_id) ON DELETE SET NULL;

      ALTER TABLE source_crawl_items
      ADD COLUMN IF NOT EXISTS retry_reason TEXT;

      ALTER TABLE source_crawl_items
      ADD COLUMN IF NOT EXISTS retry_blocker_card TEXT;

      ALTER TABLE source_crawl_items
      DROP CONSTRAINT IF EXISTS source_crawl_items_retry_state_check;

      ALTER TABLE source_crawl_items
      ADD CONSTRAINT source_crawl_items_retry_state_check
      CHECK (retry_state IN ('not_evaluated', 'not_retryable', 'eligible', 'waiting', 'leased', 'succeeded', 'skipped', 'blocked', 'exhausted'));

      CREATE INDEX IF NOT EXISTS idx_source_crawl_items_retry
      ON source_crawl_items(target_key, retry_state, next_retry_at, updated_at DESC);

      CREATE TABLE IF NOT EXISTS drive_access_preflight_runs (
        run_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('healthy', 'blocked', 'failed_closed')),
        actor_email_hash TEXT,
        actor_count INTEGER NOT NULL DEFAULT 0,
        candidate_count INTEGER NOT NULL DEFAULT 0,
        inspected_file_count INTEGER NOT NULL DEFAULT 0,
        safe_count INTEGER NOT NULL DEFAULT 0,
        repairable_count INTEGER NOT NULL DEFAULT 0,
        missing_access_count INTEGER NOT NULL DEFAULT 0,
        owner_ambiguous_count INTEGER NOT NULL DEFAULT 0,
        request_access_needed_count INTEGER NOT NULL DEFAULT 0,
        blocked_count INTEGER NOT NULL DEFAULT 0,
        dry_run_hash TEXT NOT NULL,
        summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_drive_access_preflight_runs_card
      ON drive_access_preflight_runs(card_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS drive_access_preflight_items (
        item_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES drive_access_preflight_runs(run_id) ON DELETE CASCADE,
        file_ref_hash TEXT,
        source_account_hash TEXT,
        source_id TEXT,
        artifact_id TEXT,
        state TEXT NOT NULL,
        access_plan_action TEXT,
        owner_hash TEXT,
        permission_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        proposed_operation_types TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        blocker_card TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_drive_access_preflight_items_run
      ON drive_access_preflight_items(run_id, state, created_at DESC);

      CREATE TABLE IF NOT EXISTS meeting_vault_acl_audits (
        audit_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('safe', 'blocked_phase_b_required', 'blocked_phase_a_unproven', 'failed_closed')),
        dry_run_hash TEXT NOT NULL,
        inventory_total INTEGER NOT NULL DEFAULT 0,
        inventory_scanned INTEGER NOT NULL DEFAULT 0,
        inventory_complete BOOLEAN NOT NULL DEFAULT false,
        phase_a_complete BOOLEAN NOT NULL DEFAULT false,
        safe_count INTEGER NOT NULL DEFAULT 0,
        unsafe_count INTEGER NOT NULL DEFAULT 0,
        missing_crewbert_count INTEGER NOT NULL DEFAULT 0,
        missing_access_count INTEGER NOT NULL DEFAULT 0,
        owner_ambiguous_count INTEGER NOT NULL DEFAULT 0,
        blocked_count INTEGER NOT NULL DEFAULT 0,
        proposed_operation_types JSONB NOT NULL DEFAULT '{}'::jsonb,
        summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_meeting_vault_acl_audits_card
      ON meeting_vault_acl_audits(card_id, created_at DESC);

      ALTER TABLE meeting_vault_acl_audits
      DROP CONSTRAINT IF EXISTS meeting_vault_acl_audits_status_check;

      ALTER TABLE meeting_vault_acl_audits
      ADD CONSTRAINT meeting_vault_acl_audits_status_check
      CHECK (status IN ('safe', 'blocked_phase_b_required', 'blocked_phase_a_unproven', 'failed_closed'));

      CREATE TABLE IF NOT EXISTS meeting_vault_enforcement_runs (
        run_id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        closeout_key TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'report_only'
          CHECK (mode IN ('report_only', 'apply', 'live')),
        status TEXT NOT NULL
          CHECK (status IN ('ready', 'blocked', 'failed_closed')),
        enforcement_start_at TIMESTAMPTZ,
        processed_count INTEGER NOT NULL DEFAULT 0,
        forward_count INTEGER NOT NULL DEFAULT 0,
        legacy_exception_count INTEGER NOT NULL DEFAULT 0,
        high_risk_count INTEGER NOT NULL DEFAULT 0,
        missing_crewbert_queued_count INTEGER NOT NULL DEFAULT 0,
        protected_review_queue_count INTEGER NOT NULL DEFAULT 0,
        can_close_meeting_vault_acl BOOLEAN NOT NULL DEFAULT false,
        report_hash TEXT NOT NULL,
        summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_meeting_vault_enforcement_runs_card
      ON meeting_vault_enforcement_runs(card_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS meeting_vault_enforcement_items (
        item_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES meeting_vault_enforcement_runs(run_id) ON DELETE CASCADE,
        file_ref_hash TEXT,
        source_file_role TEXT NOT NULL,
        sensitivity_class TEXT NOT NULL,
        owner_hash TEXT,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        reason TEXT NOT NULL,
        blocker_card TEXT,
        operation_type TEXT,
        legacy_exception_reason TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_meeting_vault_enforcement_items_run
      ON meeting_vault_enforcement_items(run_id, status, action, created_at DESC);

      CREATE TABLE IF NOT EXISTS meeting_vault_legacy_exceptions (
        exception_id TEXT PRIMARY KEY,
        file_ref_hash TEXT,
        source_file_role TEXT NOT NULL,
        sensitivity_class TEXT NOT NULL,
        owner_hash TEXT,
        reason TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open'
          CHECK (status IN ('open', 'queued', 'blocked', 'resolved')),
        blocker_card TEXT,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        latest_report_hash TEXT NOT NULL,
        next_action TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        UNIQUE (file_ref_hash, reason)
      );

      CREATE INDEX IF NOT EXISTS idx_meeting_vault_legacy_exceptions_status
      ON meeting_vault_legacy_exceptions(status, risk_level, last_seen_at DESC);

      CREATE TABLE IF NOT EXISTS intelligence_job_runs (
        job_id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        source_id TEXT,
        artifact_id TEXT,
        foundation_run_id TEXT REFERENCES foundation_job_runs(run_id) ON DELETE SET NULL,
        source_crawl_run_id TEXT REFERENCES source_crawl_target_runs(run_id) ON DELETE SET NULL,
        synthesis_run_id TEXT REFERENCES shared_communication_synthesis_runs(run_id) ON DELETE SET NULL,
        status TEXT NOT NULL
          CHECK (status IN ('planned', 'started', 'succeeded', 'failed', 'skipped')),
        cursor_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        budget JSONB NOT NULL DEFAULT '{}'::jsonb,
        model TEXT,
        provider TEXT,
        auth_path TEXT,
        route_key TEXT,
        cost_usd NUMERIC(12,6),
        item_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
        failure_count INTEGER NOT NULL DEFAULT 0,
        output_artifact_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        next_run_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        error_message TEXT,
        provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        duration_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_intelligence_job_runs_lookup
      ON intelligence_job_runs(status, job_type, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_intelligence_job_runs_source
      ON intelligence_job_runs(source_id, job_type, created_at DESC);

      CREATE TABLE IF NOT EXISTS intelligence_job_llm_calls (
        job_id TEXT NOT NULL REFERENCES intelligence_job_runs(job_id) ON DELETE CASCADE,
        call_id TEXT NOT NULL REFERENCES llm_calls(call_id) ON DELETE CASCADE,
        relationship TEXT NOT NULL DEFAULT 'used',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (job_id, call_id)
      );

      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier SMALLINT
          CHECK (tier IS NULL OR tier IN (1, 2, 3)),
        user_type TEXT NOT NULL
          CHECK (user_type IN ('human', 'system')),
        active BOOLEAN NOT NULL DEFAULT true,
        meeting_sync_enabled BOOLEAN NOT NULL DEFAULT false,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_meeting_sync_enabled
      ON users(meeting_sync_enabled, active, user_type, email);

      CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_responses (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        clickup_task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        milestone_day INTEGER NOT NULL
          CHECK (milestone_day IN (30, 60, 90)),
        score INTEGER NOT NULL
          CHECK (score BETWEEN 1 AND 10),
        improvement_feedback TEXT NOT NULL DEFAULT '',
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_agent TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_agent_onboarding_feedback_lookup
      ON agent_onboarding_feedback_responses(clickup_task_id, milestone_day, submitted_at DESC);

      CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_send_attempts (
        id TEXT PRIMARY KEY,
        clickup_task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        milestone_day INTEGER NOT NULL
          CHECK (milestone_day IN (30, 60, 90)),
        token_hash TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('sending', 'sent', 'clickup_requested', 'failed', 'superseded')),
        gmail_message_id TEXT,
        gmail_thread_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_feedback_active_send_once
      ON agent_onboarding_feedback_send_attempts(clickup_task_id, milestone_day)
      WHERE status IN ('sending', 'sent', 'clickup_requested');

      CREATE INDEX IF NOT EXISTS idx_agent_feedback_send_attempt_lookup
      ON agent_onboarding_feedback_send_attempts(clickup_task_id, milestone_day, updated_at DESC);

      ALTER TABLE agent_onboarding_feedback_send_attempts
      DROP CONSTRAINT IF EXISTS agent_onboarding_feedback_send_attempts_status_check;

      ALTER TABLE agent_onboarding_feedback_send_attempts
      ADD CONSTRAINT agent_onboarding_feedback_send_attempts_status_check
      CHECK (status IN ('sending', 'sent', 'clickup_requested', 'failed', 'superseded'));

      CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_reminder_attempts (
        id TEXT PRIMARY KEY,
        clickup_task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        milestone_day INTEGER NOT NULL
          CHECK (milestone_day IN (30, 60, 90)),
        reminder_slot_key TEXT NOT NULL,
        reminder_due_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('pending', 'sending', 'sent', 'skipped', 'blocked', 'maxed_out', 'repair', 'failed')),
        gmail_message_id TEXT,
        gmail_thread_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_feedback_reminder_slot_once
      ON agent_onboarding_feedback_reminder_attempts(clickup_task_id, milestone_day, reminder_slot_key);

      CREATE INDEX IF NOT EXISTS idx_agent_feedback_reminder_attempt_lookup
      ON agent_onboarding_feedback_reminder_attempts(clickup_task_id, milestone_day, updated_at DESC);

      CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_response_notifications (
        id TEXT PRIMARY KEY,
        response_id TEXT NOT NULL UNIQUE,
        clickup_task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        milestone_day INTEGER NOT NULL
          CHECK (milestone_day IN (30, 60, 90)),
        status TEXT NOT NULL
          CHECK (status IN ('sending', 'sent', 'failed')),
        gmail_message_id TEXT,
        gmail_thread_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_agent_feedback_response_notification_lookup
      ON agent_onboarding_feedback_response_notifications(clickup_task_id, milestone_day, updated_at DESC);

      CREATE TABLE IF NOT EXISTS sales_listing_assignments (
        clickup_task_id TEXT PRIMARY KEY,
        listing_title TEXT NOT NULL DEFAULT '',
        listing_url TEXT NOT NULL DEFAULT '',
        agent_name TEXT NOT NULL DEFAULT '',
        reset_date DATE,
        days_since_reset INTEGER,
        assigned_leader_key TEXT NOT NULL DEFAULT '',
        assigned_leader_name TEXT NOT NULL DEFAULT '',
        assigned_leader_email TEXT NOT NULL DEFAULT '',
        action_plan_status TEXT NOT NULL DEFAULT 'not_started'
          CHECK (action_plan_status IN ('not_started', 'connected_with_agent', 'created', 'implemented', 'blocked')),
        case_status TEXT NOT NULL DEFAULT 'identified',
        outcome_status TEXT NOT NULL DEFAULT 'open',
        action_plan_state TEXT NOT NULL DEFAULT 'unknown',
        action_plan_no_reason TEXT NOT NULL DEFAULT '',
        first_seen_stale_date DATE,
        stale_since_date DATE,
        original_reset_date DATE,
        current_reset_date DATE,
        adjusted_at DATE,
        adjustment_detected_at TIMESTAMPTZ,
        action_plan_text TEXT NOT NULL DEFAULT '',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sales_listing_assignments_leader
      ON sales_listing_assignments(assigned_leader_key, updated_at DESC);
    `)

    await client.query(`
      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS case_status TEXT NOT NULL DEFAULT 'identified';

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS outcome_status TEXT NOT NULL DEFAULT 'open';

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS action_plan_state TEXT NOT NULL DEFAULT 'unknown';

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS action_plan_no_reason TEXT NOT NULL DEFAULT '';

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS first_seen_stale_date DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS stale_since_date DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS original_reset_date DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS current_reset_date DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS adjusted_at DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS adjustment_detected_at TIMESTAMPTZ;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS action_plan_text TEXT NOT NULL DEFAULT '';

      ALTER TABLE sales_listing_assignments
      DROP CONSTRAINT IF EXISTS sales_listing_assignments_case_status_check;

      ALTER TABLE sales_listing_assignments
      ADD CONSTRAINT sales_listing_assignments_case_status_check
      CHECK (case_status IN ('identified', 'assigned', 'contacted_agent', 'action_plan_created', 'action_plan_implemented', 'adjusted', 'blocked', 'closed'));

      ALTER TABLE sales_listing_assignments
      DROP CONSTRAINT IF EXISTS sales_listing_assignments_outcome_status_check;

      ALTER TABLE sales_listing_assignments
      ADD CONSTRAINT sales_listing_assignments_outcome_status_check
      CHECK (outcome_status IN ('open', 'adjusted', 'conditional', 'firm', 'closed', 'cancelled', 'expired', 'no_action'));

      ALTER TABLE sales_listing_assignments
      DROP CONSTRAINT IF EXISTS sales_listing_assignments_action_plan_state_check;

      ALTER TABLE sales_listing_assignments
      ADD CONSTRAINT sales_listing_assignments_action_plan_state_check
      CHECK (action_plan_state IN ('unknown', 'yes', 'no'));
    `)

    await client.query(`
      ALTER TABLE shared_communication_artifacts
      DROP CONSTRAINT IF EXISTS shared_communication_artifacts_artifact_type_check;
    `)

    await client.query(`
      ALTER TABLE shared_communication_artifacts
      ADD CONSTRAINT shared_communication_artifacts_artifact_type_check
      CHECK (artifact_type IN ('meeting_note', 'meeting_transcript', 'email_thread', 'calendar_event', 'missive_thread', 'slack_thread', 'drive_document', 'drive_spreadsheet', 'drive_pdf', 'drive_text', 'gmail_attachment', 'video_transcript'));
    `)

    await client.query(`
      ALTER TABLE backlog_items
      DROP CONSTRAINT IF EXISTS backlog_items_team_check;
    `)

    if (includeBootstrapSeed) {
      await client.query(`
        UPDATE backlog_items
        SET team = 'foundation'
        WHERE team = 'dev';
      `)
    }

    await client.query(`
      ALTER TABLE backlog_items
      ADD CONSTRAINT backlog_items_team_check
      CHECK (team IN (${backlogScopeKeys.map(scope => `'${scope}'`).join(', ')}));
    `)

    if (includeBootstrapSeed) {
    await client.query(`
      UPDATE decisions
      SET classified_at = COALESCE(classified_at, created_at)
      WHERE classified_at IS NULL;
    `)

    await client.query(`
      UPDATE open_questions
      SET status = COALESCE(status, 'open')
      WHERE status IS NULL;
    `)

    await client.query(`
      UPDATE shared_communication_artifact_processing_runs processing
      SET artifact_content_hash = artifact.content_hash
      FROM shared_communication_artifacts artifact
      WHERE processing.artifact_id = artifact.artifact_id
        AND COALESCE(processing.artifact_content_hash, '') = ''
        AND COALESCE(artifact.content_hash, '') <> ''
        AND artifact.updated_at <= processing.processed_at;
    `)

    await seedTable(
      client,
      'users',
      foundationUserSeed,
      `
        INSERT INTO users (
          email, name, tier, user_type, active, meeting_sync_enabled, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            tier = EXCLUDED.tier,
            user_type = EXCLUDED.user_type,
            active = EXCLUDED.active,
            meeting_sync_enabled = EXCLUDED.meeting_sync_enabled,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
      `,
      row => [
        row.email,
        row.name,
        row.tier,
        row.userType,
        row.active,
        row.meetingSyncEnabled,
        JSON.stringify(row.metadata || {}),
      ]
    )

    await seedTable(
      client,
      'backlog_items',
      backlogSeed,
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [
        row.id,
        row.title,
        normalizeBacklogScopeKey(row.scope ?? row.team),
        row.lane,
        row.priority,
        row.rank,
        row.source,
        row.summary,
        row.whyItMatters,
        row.nextAction,
        row.statusNote,
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYSTEM-010-GHOST-CLOSEOUT-001',
        'done',
        'P0',
        'SYSTEM-010 ghost-process controls now have a shipped v1 closeout: active-process visibility, dead-man/liveness checks, owned stop decisions, confirmation-gated decommission controls, pause/decommission safety, restart-on-push status, and cost/process risk rollup.',
        'The old system could keep running silently after people thought it was dead. This closeout makes running Foundation work visible and stoppable through fail-closed process-control rules before autonomous loops expand.',
        'Run `npm run process:system-010-ghost-closeout-check` and `npm run process:foundation-done-test -- --report-only` when runtime/process controls change. Treat auto-restart-on-push as manual until a later push-hook/WatchPaths proof exists.',
        'Closed on 2026-05-09 under `system-010-ghost-closeout-v1`. V1 adds `lib/runtime-process-control.js`, active-process route, stop/decommission routes, owned PID metadata in the Foundation job runner, decommissioned runtime mode, Runtime Health controls, focused proof script, build-log closeout, foundation:verify coverage, and readiness-gate integration. It does not mark SOURCE-LIFECYCLE-COMPLETION-001, SYNTHESIS-VERIFY-001, EXTRACT-RUN-HARDENING-001, MEETING-VAULT-ACL-001, or DRIVE-ACCESS-REQUEST-001 done.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-LIFECYCLE-COMPLETION-001',
        'done',
        'P0',
        'Closed the source lifecycle completion gate for the current Foundation readiness scope: all 35 source contracts now have terminal states, load-bearing sources are complete/read-only/current-reality for their declared role, and future/gap sources are accepted-blocked with owner, reason, next action, and blocker card.',
        'Foundation readiness depends on source states being operationally true. This prevents vague Pending Revalidation or Gap states from hiding inside a green lifecycle surface while keeping future source builds parked until their own approved cards.',
        'Run `npm run process:source-lifecycle-completion-check` and `npm run process:foundation-done-test -- --report-only` when source contracts, extraction targets, or blocker classifications change. Keep synthesis, extraction hardening, and meeting ACL/vault blockers on their own cards.',
        'Closed on 2026-05-09 under `source-lifecycle-completion-v1`. V1 adds `lib/source-lifecycle-completion.js`, `scripts/process-source-lifecycle-completion-check.mjs`, metadata-only terminal-state proof for all 35 source contracts, accepted-blocked classifications for 13 future/gap sources, verifier/readiness coverage, build-log closeout, and `docs/process/source-lifecycle-completion.md`. It does not mark SYNTHESIS-VERIFY-001, EXTRACT-RUN-HARDENING-001, MEETING-VAULT-ACL-001, or DRIVE-ACCESS-REQUEST-001 done.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
          AND title = $8
      `,
      [
        'FOUNDATION-002',
        'Close out the Admin-tab sign-off and route remaining follow-on work to the right cards',
        'done',
        'The `ADMIN ONLY - Deal Data Entry` sign-off is complete. This card now exists to preserve that closure and make sure the remaining Owners Dashboard follow-on work stays attached to the right downstream cards instead of keeping a false "source sign-off still open" story alive.',
        'If the backlog keeps claiming the Admin-tab sign-off is unfinished after the source layer marks it signed off, Foundation starts violating its own truth model.',
        'Treat `SRC-OWNERS-001`, `SRC-FUB-001` Owners/Admin parity, and `SRC-FINANCE-001` current-reality meaning as closed for v1. Route remaining Owners data cleanup through Ops findings instead of reopening source sign-off.',
        'Closed on 2026-04-16. This card should stay as a closeout record, not an active blocker.',
        'Finish source sign-off for SRC-OWNERS-001',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'FOUNDATION-001',
        'Close the Foundation strategy layer against signed-off sources',
        'done',
        'Home, Strategy Packet, System Strategy, Freedom current-reality inputs, Owners Admin meaning, Owners Lists current-reality boundary, and Finance current-reality boundary are aligned to signed-off source truth for this phase.',
        'The strategy layer should not keep reopening because old backlog text says source sign-off is missing after the source contracts and verifier prove the current input boundary is closed.',
        'No active strategy-layer source closeout remains. Route later work to the separate hardening cards for Freedom drift monitoring, source-backed value hardening, decision provenance, temporal history, FUB/KPI parity, and Strategy Hub.',
        'Closed on 2026-04-25 for the current strategy-input boundary. This is not a Foundation-wide completion claim.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            summary = $3,
            next_action = $4,
            status_note = $5,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'UI-MENU-LAYOUT-POLISH-001',
        'done',
        'Foundation navigation, page hierarchy, mobile behavior, and System Inventory current-vs-archive/history split are polished for operator use.',
        'Done for v1. Stop for review; next expected Phase G card is RECENT-BUILDS-BILLION-DOLLAR-UI-001 unless Steve changes the order.',
        'Closed on 2026-04-30 under ui-menu-layout-polish-v1. Default System Inventory current-doc view excludes archive/history docs, Archive / History is available at /foundation#inventory-archive-history, private/local docs remain metadata-only, and desktop/mobile manual review passed for the required routes. This did not redesign Recent Work, changelog, daily summary, source lifecycle, Strategy, Scoper, Agent Factory, corpus, research, or action-review workflows.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'GATE-RELIABILITY-003',
        'done',
        'P0',
        'Direct Foundation verifier and process gate reads now use read-only DB readiness checks instead of running write-heavy schema/seed initialization during normal review.',
        'Done for v1. Keep direct verifier gates read-only under normal review, keep safe Postgres metadata diagnostics for future transient retries, and continue to use explicit app startup or approved migration paths for DB initialization.',
        'Closed on 2026-04-30 under gate-reliability-direct-verifier-deadlock-v1. V1 adds read-only DB readiness checks for foundation:verify, process ship/fanout gates, post-ship fanout, and backlog hygiene so direct review proof does not run write-heavy initFoundationDb schema/seed work. Gate reliability proof now covers direct foundation:verify Postgres deadlock metadata with safe code, relation OID, process id, gate label, and retry-attempt diagnostics only; no row data, source content, or private content is logged. Proof commands: npm run process:gate-reliability-check, three repeated npm run foundation:verify runs, npm run backlog:hygiene -- --json, and npm run process:foundation-ship -- --card=GATE-RELIABILITY-003 --planApprovalRef=docs/process/approvals/GATE-RELIABILITY-003.json --closeoutKey=gate-reliability-direct-verifier-deadlock-v1 --commitRef=HEAD.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
        'done',
        'P1',
        'Recent Work / Recent Builds is now an executive-grade review surface with collapsed closeout cards, a review-next queue, proof visibility, owner/context separation, and same-commit closeouts that remain individually reviewable.',
        'Done for v1. Stop for review; next expected Phase G card is CHANGE-LOG-COMPREHENSIVE-001 unless Steve changes the order.',
        'Closed on 2026-04-30 under recent-builds-billion-dollar-ui-v1. Recent Work now has an executive summary, visible review-next queue, collapsed-by-default closeout cards, proof/known-limit/where-it-lives sections, separate owning-card and context-card treatments, and same-commit groups that stay grouped while keeping each closeout individually reviewable. Ownership semantics remain exact: backlogIds own cards only, mentioned/context cards stay context only. This did not implement comprehensive changelog, daily summary, source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, or a new feature lane.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'CHANGE-LOG-COMPREHENSIVE-001',
        'done',
        'P1',
        'System Activity now has a comprehensive source-backed changelog with recent highlights, by-surface grouping, by-type grouping, raw evidence rows, inspectable evidence refs, and owner/context card separation.',
        'Done for v1. Stop for review; next expected Phase G card is DAILY-EXEC-SUMMARY-001 unless Steve changes the order.',
        'Closed on 2026-04-30 under change-log-comprehensive-v1. V1 adds /api/foundation/change-log as an additive source-backed changelog layer over verified closeouts, DB change_events, and changed-file evidence; /api/foundation/changes remains backward-compatible. System Activity now shows recent highlights, by-surface groups, by-type groups, and a raw evidence feed with inspectable evidence refs. The process check proves 40+ entries, 20+ verified closeout-backed entries, at least 8/10 change types unless absence is proven, latest 5 Recent Builds represented, the current closeout represented, zero ownership/context smearing, no silent missing categories, and no private/local file content copied into entries. This did not implement Daily Exec Summary, source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, or a new feature lane.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
        'done',
        'P1',
        'Agent Onboarding Feedback is now visible as a partial Foundation/Ops system with trigger, source, queue, form, writeback, statuses, blockers, proof surfaces, and privacy boundaries.',
        'Done for v1. Stop for review. Next expected Agent Feedback build is AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 before Steve full-loop live testing. SYS-AGENT-ONBOARDING-FEEDBACK-001 stays implementationState partial until the governed send loop ships live.',
        'Closed on 2026-04-30 under agent-onboarding-feedback-system-v1. Added SYS-AGENT-ONBOARDING-FEEDBACK-001 to /api/source-of-truth groupedSystems as the 13th grouped system, preserved the existing 12 grouped systems, mapped the system to Agent Onboarding, and marked implementationState partial because the queue, /agent-feedback private-token form, agent_onboarding_feedback_responses table, and Completed/Score/Feedback writeback path exist but the production Gmail send path and ClickUp Requested writeback are not built yet. Preserved system context: System name: Agent Onboarding Feedback. Operating area: Agent Onboarding. Source of truth: ClickUp Agent Roster. Trigger: Real Start Date + day 30/60/90. Current queue: Agent Roster review / Ops review queue. Current form: /agent-feedback private token link. Current writeback: Onboarding NPS 30/60/90 Status, Score, Feedback fields. Current statuses: not due, due, requested, completed, skipped, blocked, expired window. Current blockers after AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001: missing Real Start Date, missing Company Email, invalid Company Email, expired send window, missing/invalid feedback fields. Contract Link is warning-only. Proof surfaces: Ops Hub Agent Roster queue, /api/owners/review-queue, ClickUp task, feedback response DB table agent_onboarding_feedback_responses, Gmail send proof once send path exists. Privacy boundary: private feedback links, no private feedback content broadly exposed, feedback content visible only in approved owner/review surfaces. Known test cases: Steve Zahnd: Day-30 dry-run eligible through Company Email; Georgia: Real Start Date 2026-03-29, Day-30 due 2026-04-28, due item exists; Chris: does not fire until Real Start Date is set/readable. Proof is metadata-only for known cases. No Gmail send. No ClickUp Requested writeback. This card created/scoped FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001 as context only, kept AGENT-FEEDBACK-SEND-001 scoped, did not send Georgia a survey, did not build the production email path, did not broaden Systems regrouping, and did not copy private feedback tokens, feedback content, or raw email addresses into tracked docs, verifier logs, build log, or manual proof.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'AGENT-FEEDBACK-SEND-001',
        'done',
        'P1',
        'Stage 1 of the 30/60/90 onboarding feedback send path is built and dry-run proven without sending Gmail or writing ClickUp Requested.',
        'Done for Stage 1. Stop for review. The next live test is AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001 after AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001; no Georgia test is the current target.',
        'Closed on 2026-04-30 under agent-feedback-send-v1 for Stage 1 only, then policy-corrected by AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001. Dry-run first. No real send without Steve exact SEND APPROVED or a later approved production-all artifact. Agent Feedback sends use ClickUp Company Email only for every request, test send, auto-send candidate, and reminder candidate. Personal Email is not used for Agent Feedback send eligibility. Onboarding feedback sends use BCC/internal oversight roles Steve, Carson, Ryan, and Georgia by default, with To-recipient dedupe. Capture Gmail message/thread ID only after approval. Built eligibility, metadata-only dry-run, duplicate-send protection, Gmail send path wiring, Requested writeback sequencing, privacy checks, and verifier coverage. Mark Requested in ClickUp only after Gmail send succeeds. Duplicate send protection. No send if Company Email is missing or invalid. No send if milestone window expired. Contract Link is warning/data-quality metadata only and does not block 30/60/90 onboarding feedback send eligibility. Steve Zahnd Day-30 dry-run is eligible through Company Email and is the next live full-loop test target; Georgia may remain eligible in dry-run but is not the test target. No Gmail send. No ClickUp Requested writeback. No Georgia survey. Submitted feedback still writes Completed, score, and feedback text back to the correct ClickUp Onboarding NPS 30/60/90 Status, Score, and Feedback fields. Feedback response is stored in the agent_onboarding_feedback_responses table with task ID, agent name, milestone day, token hash, score, feedback, and submitted timestamp. Feedback content is not broadly exposed outside approved owner/review surfaces. Private feedback token URLs, raw email addresses, and feedback content are not copied into tracked proof.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001',
        'Make Agent Feedback sends use Company Email only',
        'foundation',
        'done',
        'P1',
        14,
        'Steve mission to get Agent Feedback live without one-person patches',
        'Agent Feedback request sends, test sends, auto-send readiness, and reminder readiness now use ClickUp Company Email only, with Personal Email removed from send eligibility.',
        'The Steve full-loop dry-run was blocked because the workflow still treated non-Georgia targets as external agents and looked for Personal Email. Agent Feedback is a company-roster workflow, so all eligibility must use Company Email before live testing or production auto-send.',
        'Done for v1. Next build is AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001 for Steve Zahnd only, then AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 after the full loop passes.',
        'Closed on 2026-05-01 under agent-feedback-company-email-policy-v1. Agent Feedback request sends, auto-send candidates, reminder candidates, and test sends now use ClickUp Company Email only. Personal Email is not used anywhere in Agent Feedback send eligibility, and legacy Personal Email blockers cannot appear in Agent Feedback checks. Contract Link remains warning-only. BCC oversight remains Steve, Carson, Ryan, and Georgia with To-recipient dedupe. The route-specific approval validator supports any approved target, not Georgia only. Test allowlists and auto-send allowlists support any named target while production-all remains a separate approval mode. Proof shows Steve Zahnd Day-30 dry-run eligible via Company Email, Georgia Day-30 eligible via Company Email when checked but not the live test target, and a synthetic external agent eligible via Company Email. Send, auto-send, reminder, and response-notify checks passed. No Gmail send, no ClickUp Requested writeback, no production auto-send, no Georgia test, and no raw emails/tokens/feedback content in tracked proof.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001',
        'Run the Steve Zahnd Agent Feedback full-loop test',
        'foundation',
        'scoped',
        'P1',
        15,
        'Steve mission to get Agent Feedback live',
        'Run one controlled live onboarding feedback loop on the Steve Zahnd card only: request email, Requested writeback, form submission, DB save, Completed/Score/Feedback writeback, response notification, reminder stop, and duplicate protection.',
        'The live system needs one end-to-end proof on Steve before production auto-send is enabled. This proves Gmail, ClickUp Requested, feedback submission, DB persistence, ClickUp completion fields, internal notification, reminder stop, and duplicate ledger behavior together.',
        'Not accepted. Build AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 before any production enablement. The repair must prove Steve submitted through the real emailed browser link.',
        'Reopened on 2026-05-01 after Steve reported the browser submit failed because the live test script consumed the emailed token with a synthetic controlled response. The prior proof remains evidence of the failure mode only, not acceptance. Production auto-send is stopped until AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 sends a fresh Steve Day-30 email, waits for Steve to submit the real browser link, and proves DB response, ClickUp Completed/Score/Feedback, notification, reminder stop, and duplicate protection.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001',
        'Repair Steve full-loop test for real browser submission',
        'foundation',
        'done',
        'P0',
        16,
        'Steve correction after script consumed the emailed full-loop token',
        'Split Steve full-loop testing into send-only/manual-user and dry-run-only synthetic modes, supersede the script-consumed test artifacts, send one fresh Steve Day-30 request, and verify Steve submits through the real emailed browser link.',
        'The previous script proved internal plumbing but invalidated the actual user experience by consuming Steve’s token before he could submit. Production cannot start until the real browser path is proven.',
        'Done for repair. Stop before production enablement. The next card remains AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 only after separate production approval; start with dry-run production report, not live auto-send.',
        'Closed on 2026-05-01 under agent-feedback-real-user-submit-repair-v1. The repair split send-only/manual-user mode from dry-run-only synthetic-submit, disabled live synthetic consumption of the emailed token, superseded the prior script-consumed Steve Day-30 response without deleting evidence, sent one fresh Steve Day-30 Company Email request, and waited for Steve to submit from the real emailed browser link. Final proof shows the DB saved the real browser response, ClickUp Completed/Score/Feedback writeback succeeded, internal notification sent to Steve/Carson/Ryan/Georgia, reminder readiness stops because feedback is completed, duplicate submit returns the clear already-submitted message, duplicate resend is blocked before Gmail or ClickUp side effects, manual-user BCC metadata is correct with Steve deduped from actual BCC, production auto-send remains disabled, Georgia was not the target, and no other roster send happened. Closeout owns only AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'FOUNDATION-VERIFY-HEALTH-REPAIR-001',
        'Repair Foundation verifier health before production auto-send',
        'foundation',
        'done',
        'P0',
        17,
        'Steve directive after AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 acceptance',
        'Fix or classify the three remaining foundation:verify failures: worker startup code trust, DAILY-EXEC-SUMMARY-001, and AGENT-ONBOARDING-FEEDBACK-SYSTEM-001.',
        'The onboarding real-user flow is proven, but production auto-send should not start while Foundation health is red. The verifier must be green before the production enablement card opens.',
        'Done for health repair. Next card is AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001, starting with a dry-run production report and separate production approval. Do not enable production auto-send from this closeout.',
        'Closed on 2026-05-01 under foundation-verify-health-repair-v1. Worker startup code trust was real served-code drift and was repaired by restarting the Foundation worker so it serves HEAD. DAILY-EXEC-SUMMARY-001 was stale date-scoped verifier expectation and now compares latest Recent Work builds as of the selected summary date. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001 was stale live source-context wording and now records explicit status vocabulary, live-send Gmail proof wording, and current Chris source-state proof. Full foundation:verify is green, backlog hygiene is green, dashboard and worker serve HEAD, the real-user Agent Feedback repair remains accepted, production auto-send remains disabled, no Gmail was sent, and no ClickUp writeback happened. Closeout owns only FOUNDATION-VERIFY-HEALTH-REPAIR-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001',
        'Enable governed Agent Feedback production auto-send',
        'foundation',
        'done',
        'P1',
        18,
        'Agent Feedback production enablement',
        'Production-all auto-send is live for eligible 30/60/90 onboarding feedback initial requests through the governed two-key approval path.',
        'This closes the operational gap between ready Agent Feedback infrastructure and live production onboarding feedback requests while keeping sends governed, duplicate-safe, and visible.',
        'Closed under agent-feedback-production-autosend-enable-v1. Live reminders are now handled by AGENT-FEEDBACK-LIVE-REMINDERS-001.',
        'Closed on 2026-05-01 under agent-feedback-production-autosend-enable-v1. Production auto-send is live with AGENT_FEEDBACK_AUTO_SEND_ENABLED=true and the approved production artifact. The daily job runs at 8:30 AM America/Toronto, fails closed outside the 8:30-10:00 AM America/Toronto send window, uses Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, writes ClickUp Requested only after Gmail succeeds, blocks repeat sends through agent_onboarding_feedback_send_attempts, records non-resend repair state if Gmail succeeds and ClickUp Requested writeback fails, and exposes enabled state, send window, last run, next run, sent/skipped/blocked/warning/repair counts in Runtime/Ops. Controlled production proof is metadata-only with no raw emails, private token URLs, raw tokens, or feedback content. Reminder sends were intentionally left to AGENT-FEEDBACK-LIVE-REMINDERS-001. Closeout owns only AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001. Proof commands include npm run agent-feedback:auto-send -- --mode=live --maxSends=5, npm run process:agent-feedback-production-autosend-enable-check, npm run backlog:hygiene -- --json, and npm run foundation:verify. Proof doc: docs/audits/2026-05-01-agent-feedback-production-autosend-enable-proof.md.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-LIVE-REMINDERS-001',
        'Enable governed Agent Feedback live reminders',
        'foundation',
        'done',
        'P1',
        19,
        'Steve mission to make the full Agent Onboarding Feedback loop live',
        'Live reminders are enabled for requested-but-not-completed 30/60/90 onboarding feedback, using the existing cadence and the approved 8:30-10:00 AM America/Toronto send window.',
        'Production initial requests are live, but the full loop is not running until requested feedback receives governed follow-up reminders without duplicate sends or off-hours outreach.',
        'Closed under agent-feedback-live-reminders-v1. Stop for Steve review. Next work is the systems visibility pass, then Foundation + Strategy only.',
        'Closed on 2026-05-02 under agent-feedback-live-reminders-v1. Live reminders are enabled with AGENT_FEEDBACK_REMINDERS_ENABLED=true and the approved production reminder artifact. The reminder job runs at 8:30 AM America/Toronto, fails closed outside the 8:30-10:00 AM America/Toronto send window before Gmail, ClickUp, or reminder ledger side effects, uses ClickUp Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, follows the day 1, 3, 7, 10, 14, and 17 cadence after the initial Requested timestamp, blocks repeat reminder slots through agent_onboarding_feedback_reminder_attempts, does not write ClickUp Requested, and stops after feedback is completed, skipped, or blocked. Georgia Huntley Day-30 and Chris Chopite Day-30 have exactly one protected Requested initial attempt each; no reminder was due in the controlled run, and both next reminder states are deferred to 2026-05-03T00:00:00.000Z unless completed first. Broad proof is metadata-only with no raw emails, private token URLs, raw tokens, or feedback content. Closeout owns only AGENT-FEEDBACK-LIVE-REMINDERS-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-REMINDER-CADENCE-001',
        'Build Agent Onboarding Feedback reminder cadence readiness',
        'foundation',
        'done',
        'P1',
        13,
        'Steve reminder cadence gate before full-loop test',
        'Agent Onboarding Feedback now has dry-run reminder cadence readiness with schedule, caps, stop rules, duplicate slot protection, ledger schema, and Runtime/Ops counts.',
        'Before Steve tests the full loop, the system needs the reminder lane in place so request, reminder, submission, ClickUp writeback, and internal notification can be exercised without redesigning the send path mid-test.',
        'Done for readiness. Stop for review. Next expected step is AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001, then AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001; no live reminder, Georgia send, Steve test, production auto-send, or ClickUp Requested writeback happened in this build.',
        'Closed on 2026-05-01 under agent-feedback-reminder-cadence-v1 as reminder cadence readiness only. V1 adds the reminder schedule day 1, day 3, day 7, day 10, day 14, and day 17 after a successful initial request, with cap 6 reminders or 30 days after initial request. No reminder can run before a successful initial request exists in agent_onboarding_feedback_send_attempts with status clickup_requested. Reminders stop if feedback is completed or ClickUp status is Completed, Skipped, or Blocked. Duplicate slot protection is keyed by agent_onboarding_feedback_reminder_attempts clickup_task_id + milestone_day + reminder_slot_key. Runtime Health and Ops expose pending, sent, skipped, blocked, maxed-out, repair, warning, and next-due counts. AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 makes reminder recipients use Company Email only. Dry-run/report mode only; no live reminder send, Georgia send, Steve test, production auto-send, ClickUp Requested writeback, Gmail send, raw email address, token URL, or feedback-content exposure happened. Closeout owns only AGENT-FEEDBACK-REMINDER-CADENCE-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-AUTO-SEND-001',
        'Build governed Agent Onboarding Feedback auto-send readiness',
        'foundation',
        'done',
        'P1',
        11,
        'Steve clarification after AGENT-FEEDBACK-SEND-001 Stage 2 readiness',
        'The Agent Onboarding Feedback send path now has daily auto-send readiness scanning and two-key live-send controls, with no Gmail send or ClickUp Requested writeback during this build.',
        'The intended end-state is governed automatic 30/60/90 feedback sending, not manual one-off sends. The system needs scanner, reporting, side-effect safety, duplicate protection, and explicit live-send controls before Steve approves any test or production send mode.',
        'Done for readiness. Stop for review. Next decision is AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001, then AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001. Production-all requires a separate approval artifact.',
        'Closed on 2026-05-01 under agent-feedback-auto-send-v1 as auto-send readiness only, then policy-corrected by AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001. V1 adds a daily dry-run/report scanner over the ClickUp Agent Roster for 30/60/90 onboarding feedback candidates, reports would-send/sent/skipped/blocked/warning/repair counts in Runtime Health and Ops, and keeps default behavior dry-run/report-only. Live sends require both AGENT_FEEDBACK_AUTO_SEND_ENABLED=true and an approved mode/allowlist artifact; toggle alone cannot send, allowlist alone cannot send, and production-all requires a separate approval artifact. Auto-send candidates use Company Email only. Steve Zahnd Day-30 is eligible in dry-run and is the next full-loop test target; Georgia Day-30 may remain eligible in dry-run but is not the live test target. Contract Link remains warning-only. Duplicate-send protection and Gmail-before-ClickUp Requested sequencing remain enforced; if Gmail succeeds but ClickUp Requested fails, the send attempt stays in sent/repair state and does not become resendable. No Gmail send, no ClickUp Requested writeback, no broad live auto-send, no raw email addresses, token URLs, or feedback content were written to tracked docs, verifier logs, build log, or broad API JSON. Closeout owns only AGENT-FEEDBACK-AUTO-SEND-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-RESPONSE-NOTIFY-001',
        'Notify internal oversight when onboarding feedback is submitted',
        'foundation',
        'done',
        'P1',
        12,
        'Steve response-notification gate before Georgia live-send',
        'Agent Onboarding Feedback submissions now notify Steve, Carson, Ryan, and Georgia internally after the response is saved, with ClickUp writeback status and duplicate protection.',
        'A Georgia or future agent survey is not useful if completed feedback sits quietly in the database. Internal oversight needs a private notification after submission, including repair status when ClickUp writeback fails.',
        'Done for v1. Stop for review. Response notifications remain active for the Steve full-loop test and later production-all enablement.',
        'Closed on 2026-05-01 under agent-feedback-response-notify-v1. V1 sends internal response notifications only after agent_onboarding_feedback_responses saves the submitted feedback and after the ClickUp Completed/Score/Feedback writeback attempt. Notifications go to internal oversight roles Steve, Carson, Ryan, and Georgia using approved internal email identities. The internal email includes agent name, milestone day, score, feedback text, submitted timestamp, ClickUp task/source reference, and ClickUp writeback status. If ClickUp writeback fails after DB save, the notification still sends with repair status clickup_completed_writeback_failed. Duplicate notification protection is keyed by response_id in agent_onboarding_feedback_response_notifications. Synthetic dry-run proof covers success and repair paths with no Gmail send. Tracked docs, verifier logs, build log, and broad API proof use roles/hashes only and do not copy private tokens, raw email addresses, or feedback text. No external survey email, ClickUp Requested writeback, live auto-send, Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or new feature lane happened. Closeout owns only AGENT-FEEDBACK-RESPONSE-NOTIFY-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-GEORGIA-SEND-001',
        'Send the approved Georgia onboarding feedback request',
        'foundation',
        'scoped',
        'P2',
        19,
        'AGENT-FEEDBACK-SEND-001 Stage 1 follow-up',
        'Paused Georgia-specific live-send card retained as historical context only; Steve full-loop test is now the active live test path.',
        'Georgia helped prove readiness, but the current mission is not another one-off Georgia patch. The system must prove Steve real-user browser submit, then production auto-send.',
        'Do not build unless Steve explicitly reopens a Georgia-specific send. Active order is AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001, then AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 after repair acceptance.',
        'Scoped by AGENT-FEEDBACK-SEND-001 as historical context and superseded by AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 plus the Steve full-loop test path. Georgia Day-30 may remain eligible in dry-run through ClickUp Company Email, but Georgia is not the live test target. Onboarding feedback sends use Company Email only, BCC/internal oversight roles Steve, Carson, Ryan, and Georgia by default, and To-recipient dedupe. Contract Link is warning/data-quality metadata only and does not block 30/60/90 onboarding feedback send eligibility. Proof must remain metadata-only except Gmail message/thread IDs and ClickUp Requested writeback confirmation after an approved send; no token URLs, raw email addresses, or feedback content in tracked proof.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        'FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001',
        'Audit empty Foundation Systems service groups',
        'foundation',
        'scoped',
        'P2',
        11,
        'FOUNDATION-SYSTEMS-SERVICE-GROUPING-001 review follow-up',
        'Audit every empty Systems service group and decide whether it is truly empty, missing an existing system mapping, or needs a new scoped system-build card.',
        'Empty service groups are useful signals. They should not be filled with fake systems, but they also should not hide missing mappings for Recruiting, Finance, onboarding, deals, people, or marketing-client systems.',
        'Plan the audit only when Steve approves this card. Every empty group gets a disposition: valid empty, existing system to map, or new scoped card needed. Findings must be visible in backlog/current plan. No fake systems. Sales and Recruiting stay separate.',
        'Scoped on 2026-04-30 by AGENT-ONBOARDING-FEEDBACK-SYSTEM-001 as context only. After Agent Onboarding Feedback is mapped, Agent Onboarding should no longer be empty. Remaining empty groups should be audited without inventing fake systems: Recruiting, Marketing - Clients, Client Onboarding, Closing / Deals, Finance, and People / Retention unless source-backed evidence changes before the audit. This card stays scoped and is not owned by agent-onboarding-feedback-system-v1.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'DAILY-EXEC-SUMMARY-001',
        'done',
        'P1',
        'Foundation now has a date-scoped daily executive summary surface that shows where the day started, what changed, what shipped, what remains, what was learned, what is next, and proof/evidence refs.',
        'Done for v1. Stop for review; next expected Phase G card is SOURCE-LIFECYCLE-EXPANSION-001 unless Steve changes the order.',
        'Closed on 2026-04-30 under daily-exec-summary-v1. V1 adds /api/foundation/daily-summary as an additive date-scoped summary layer over Recent Work, comprehensive changelog, current plan/state, live backlog truth, action/research disposition summaries, and recorded proof. Foundation > Daily Summary shows selected date, recent-day selector/list, where we started, what changed, what shipped, what remains, what we learned, what is next, and proof/evidence refs. The process check proves evidence refs on every section, latest 5 Recent Builds represented, this closeout represented, shipped/still-open/needs-review/next-build separation, no ownership/context smearing, no private/local content copied, and existing build-log/changelog/changes API compatibility. This did not implement source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, Action Review applying, or a new feature lane.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-014',
        'Close strategy live-input boundary for the full strategy packet',
        'done',
        'Freedom Community, BHAG Builder, Agent Engine, and the strategy-used Owners slice are captured for current-reality strategy use. The current strategy live-input boundary is closed for this phase.',
        'The Strategy packet should show as closed once the exact live inputs behind it are signed off; future hardening should not masquerade as an unfinished source sign-off.',
        'Keep the closed package aligned through verifier checks. Route later work to Freedom drift monitoring, source-backed value hardening, decision provenance, temporal history, FUB/KPI source trust, and Strategy Hub cards.',
        'Closed on 2026-04-25 after Owners, Finance, Freedom, and Lists current-reality coverage were made explicit and verified.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'FOUNDATION-003',
        'Close source sign-off for SRC-FINANCE-001',
        'done',
        'Weekly Actuals, Monthly Budget, Cashflow Dash, and the partner-commission normalization boundary are signed off for current-reality meaning.',
        'The source layer should not keep reopening finance meaning after the source note already locked the workbook logic. Future payment reconciliation and QuickBooks checks are separate hardening, not current source-signoff blockers.',
        'Treat `SRC-FINANCE-001` as closed for current reality. Keep QuickBooks parked as optional compliance verification and route future work to freshness, payment reconciliation, or automation-hardening cards only when those surfaces are being built.',
        'Closed for current reality. Current doctrine: Weekly Actuals = operating finance ledger, Cashflow Dash = management truth after partner-commission normalization, QuickBooks = optional compliance ledger / verification detail.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            summary = $3,
            next_action = $4,
            status_note = $5,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYSTEM-009',
        'done',
        'The root backlog now uses a data-driven scope registry instead of fixed `dev` / `marketing` labels, so Foundation, Strategic Execution, Marketing, and future hubs can share one queue model without frontend surgery.',
        'Keep the scope registry authoritative, let the API/UI read from it, and expand the active scopes only when a real root queue or hub is ready instead of hardcoding new labels ad hoc.',
        'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing proof details remain: canonical backlog scopes are registry-driven, legacy dev items are backfilled to foundation, and the Foundation UI/API create, filter, and edit against scope metadata instead of fixed labels.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-001',
        'scoped',
        'Keep scoped and not active. Later plan the Gmail boundary and normalization slice with signed-off source scope, acceptance, and proof commands before execution.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Delegated Gmail access exists, but remaining work is signed-off scope and normalization and must not start without approved plan, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            next_action = $4,
            status_note = $5,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'STRATEGIC-INTEL-001',
        'scoped',
        'P0',
        'Keep scoped and not active. Before any build, review and approve `docs/specs/2026-04-28-strategic-intelligence-loop.md`. The approved plan must decide the `intelligence_strategic_issues` ledger/schema, lifecycle fields, typed urgency, impact, confidence, and staleness, daily/event/weekly cadence, old scout -> director -> scoper -> sprint mapping, resolution feedback writes, and 10x pilot metrics: >= 5 strategic issues surfaced/week, >= 3 scoped/week, >= 2 resolved-to-applied/week, and median manual investigation time <= 30 minutes per issue. Implementation blocks `INTEL-SCOPER-001` until the issue-ledger/schema decision is accepted. Closeout requires acceptance criteria, proof commands, foundation:verify, and closeout evidence.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. This card must not move to executing or done without an approved plan, explicit acceptance criteria, proof commands, foundation:verify, and closeout evidence. Original context is preserved below.\n\nNew P0 from 2026-04-28. The checkpoint moved the design out of chat memory into `docs/specs/2026-04-28-strategic-intelligence-loop.md`, but this remains scoped until Steve/system review accepts the spec. Do not expand Strategic Intelligence code before Foundation sweep/build visibility catches up.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-002',
        'scoped',
        'Keep scoped and not active. Later plan the Calendar boundary and normalization slice with signed-off source scope, acceptance, and proof commands before execution.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Delegated Calendar access exists, but remaining work is signed-off scope and normalization and must not start without approved plan, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-006',
        'scoped',
        'Keep scoped and not active. Later plan Missive boundary/normalization with signed-off source scope, acceptance, and proof commands before execution.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Missive access exists, but remaining work is signed-off scope and normalization and must not start without approved plan, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-018',
        'scoped',
        'Use the now-live paginated delegated scan, transcript-gap report, and meeting-class metadata to close the meeting contract: verify the post-default forward flow on each organizer’s most recent meetings, keep widening governed extraction/apply depth, and only then decide whether older pre-2026 artifacts justify a deeper historical pull.',
        'Delegated meeting-note reads now scan the enabled BCrew user list with paginated Drive search, detect standalone transcript docs or embedded transcript sections, archive canonical meeting artifacts into PostgreSQL, mirror organized copies into Crewbert Drive in copy mode, and tag meetings `broadcast` vs `discussion`. Remaining work is forward-looking transcript enforcement verification, privacy/read-side controls, and deeper historical probing, not basic access.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-019',
        'scoped',
        'Keep Gmail / Missive / Slack / meeting archives stable, deepen candidate promotion paths, add read-side subject-person redaction, and close the synthesis functions on top: cross-artifact linking, resolution detection, cross-source dedup, staleness scoring, and actionability ranking.',
        'Shared archive is now materially real across Gmail, Missive, Slack, meeting notes, and meeting transcripts, with governed extraction live for all four, first apply paths for task -> backlog, decision -> decision, and blocker -> open question, plus a first batch synthesis proof. Remaining work is durable backfill control, source-backed fact grounding, read-side privacy/query logic, and turning synthesis from proof into operating layer.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            rank = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYNTHESIS-ENGINE-001',
        'done',
        'P0',
        8,
        'Done for v1. Keep synthesis quality gates active while Strategy Hub consumes clustered, strategy/operational classified items; next hardening is route disposition, build-closeout discipline, and the Strategy Quarter source layer.',
        'Closed on 2026-04-27 after Steve accepted the repaired sample grain. Proof synthesis-engine-proof-20260428030545 produced 8 clustered items, 1 Strategy item, 0 single-evidence Strategy items, and a meeting-readable title: "Clarify where leads come from across Benson Crew / Steve Zahnd / MarketMasters." Action Router selector proof shows routerVisible=7/7 after first Strategy route action-route:f49fdec1289d13c01400bfa2 was generated with no operational leakage into Strategy Hub.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET next_action = $2,
            status_note = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-020',
        'Keep the now-live Google delegated stack, Missive bridge, and Slack reader stable, watch for pagination/regression issues, and harden the remaining rollout gaps before layering more automation on top.',
        'Adapter hardening is no longer hypothetical: Drive pagination is fixed, the meeting backfill now reaches a real multi-month archive, Slack history paginates, and the existing bot covers almost all required ops channels. Remaining adapter work is the last Slack rollout gaps plus older-archive probing, not blank-sheet connector work.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            rank = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'EXTRACTION-TEAM-001',
        'scoped',
        'P0',
        7,
        'Keep scoped and not active. Later choose the next extraction slice from Runtime Health evidence, then write acceptance/proof commands and run foundation:verify before closeout.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Existing runtime slices are proof history only; missing pieces must not start without approved plan, acceptance criteria, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            rank = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYSTEM-010',
        'scoped',
        'P0',
        5,
        'Keep scoped and not active. Later plan scheduler/supervision controls with acceptance, proof commands, foundation:verify, and explicit closeout before any runtime-control build.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Existing job ledger proof history stays separate; scheduler, kill-switch, pause, retry, cursor, cost, and approval-gated write controls require a later approved plan, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            rank = $4,
            summary = $5,
            why_it_matters = $6,
            next_action = $7,
            status_note = $8,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SECURITY-002',
        'done',
        'P0',
        4,
        'Central auth/tier/redaction v1 is implemented through `lib/security-access.js`: requests get server-derived access context, covered routes have explicit postures, `assertTier`/`assertRole` are central, intelligence evidence ignores client `maxTier`, and shared-comms/intelligence routes stay Tier 1-only unless filtered access is proven.',
        'Tiers alone do not solve the real leak. The system now has a fail-closed layer for subject-person redaction, sensitivity/min_tier checks, stable redacted response shapes, and raw shared-comms boundaries before any broader hub/query/assistant expansion.',
        'Done for v1. Keep non-Tier-1 shared-comms/intelligence access closed until a later approved card proves filtered summaries against real data. Do not expand Strategy, Sales, Agent Feedback, Scoper, Agent Factory, corpus, or UI polish from this closeout.',
        'Closed on 2026-05-02 under `security-002-auth-tier-redaction-v1`. V1 adds `lib/security-access.js`, a route posture registry for all planned read surfaces, DB-backed request access context via Foundation users, central `assertTier`/`assertRole`, server-derived actor tier for `/api/intelligence/evidence`, stable redacted response helpers, subject_people/sensitivity/min_tier synthetic proof, owner-preserving shared-comms summary boundary, fail-closed missing tier/classification behavior, `process:security-002-check`, approval integrity evidence, and `foundation:verify` coverage. Routes that cannot yet be filtered safely remain Tier 1-only.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            summary = $3,
            next_action = $4,
            status_note = $5,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SECURITY-003',
        'done',
        'Zoom audio transcription no longer contains a direct OpenAI audio endpoint call and fails closed for non-dry-run use. The verifier now checks direct OpenAI, Anthropic, and Gemini host calls outside approved adapters instead of only checking OpenAI Responses.',
        'Keep Zoom audio recovery paused. If the business later reopens it, build transcription as a router-ledged workload with explicit provenance instead of restoring direct API calls.',
        'Closed as a stop-gap on 2026-04-25: direct transcription spend path is fail-closed and verifier coverage is broadened.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SECURITY-004',
        'Gate broad Foundation, Ops, and doc read APIs before any non-local access',
        'done',
        'Broad Foundation/Ops/doc read APIs now use `requireAdminToken` outside localhost: source-of-truth, document reads, Foundation hub snapshot, Owners review queue/governance, FUB read helpers, sheet structure, system inventory, changes, and pending doc updates.',
        'Keep the verifier guard. Replace this stop-gap with full `SECURITY-002` auth/tier and subject-person redaction before broader hub, assistant, or user-facing access.',
        'Closed as an interim gate on 2026-04-25. Full privacy model remains under `SECURITY-002`.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET priority = $2,
            rank = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYNTHESIS-FACTS-001',
        'P0',
        9,
      ]
    )

    await seedTable(
      client,
      'decisions',
      decisionsSeed,
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref,
          decision_owner, confirmed_by, participant_names, context_ref, evidence_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [
        row.id,
        row.category,
        row.title,
        row.status,
        row.summary,
        row.rationale,
        row.sourceRef,
        row.decisionOwner ?? null,
        row.confirmedBy ?? null,
        normalizeStringList(row.participantNames),
        row.contextRef ?? null,
        row.evidenceNotes ?? null,
      ]
    )

    for (const row of decisionsSeed) {
      await client.query(
        `
          UPDATE decisions
          SET decision_owner = COALESCE(decision_owner, $2),
              confirmed_by = COALESCE(confirmed_by, $3),
              participant_names = CASE
                WHEN participant_names IS NULL OR cardinality(participant_names) = 0 THEN $4::text[]
                ELSE participant_names
              END,
              context_ref = COALESCE(context_ref, $5),
              evidence_notes = COALESCE(evidence_notes, $6),
              updated_at = CASE
                WHEN decision_owner IS NULL
                  OR confirmed_by IS NULL
                  OR participant_names IS NULL
                  OR cardinality(participant_names) = 0
                  OR context_ref IS NULL
                  OR evidence_notes IS NULL
                THEN NOW()
                ELSE updated_at
              END
          WHERE id = $1
        `,
        [
          row.id,
          row.decisionOwner ?? null,
          row.confirmedBy ?? null,
          normalizeStringList(row.participantNames),
          row.contextRef ?? null,
          row.evidenceNotes ?? null,
        ]
      )
    }

    await seedTable(
      client,
      'parking_lot_items',
      parkingLotSeed,
      `
        INSERT INTO parking_lot_items (id, title, summary, owner)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [row.id, row.title, row.summary, row.owner]
    )

    await seedTable(
      client,
      'open_questions',
      openQuestionsSeed,
      `
        INSERT INTO open_questions (id, title, summary, owner, status, resolved_at, resolved_by, resolution_note)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [
        row.id,
        row.title,
        row.summary,
        row.owner,
        row.status || 'open',
        row.resolvedAt || null,
        row.resolvedBy || null,
        row.resolutionNote || null,
      ]
    )

    await seedTable(
      client,
      'memory_system_status',
      memoryStatusSeed,
      `
        INSERT INTO memory_system_status (component_key, label, status, detail)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (component_key) DO NOTHING
      `,
      row => [row.componentKey, row.label, row.status, row.detail]
    )

    await client.query(
      `
        DELETE FROM doc_source_snapshots
        WHERE doc_path = $1
      `,
      ['docs/strategy/bhag-model.md']
    )

    await seedTable(
      client,
      'doc_source_snapshots',
      docSourceSnapshotsSeed,
      `
        INSERT INTO doc_source_snapshots (
          id, doc_path, source_id, group_title, label, value, detail, as_of, sort_order
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET
          doc_path = EXCLUDED.doc_path,
          source_id = EXCLUDED.source_id,
          group_title = EXCLUDED.group_title,
          label = EXCLUDED.label,
          value = EXCLUDED.value,
          detail = EXCLUDED.detail,
          as_of = EXCLUDED.as_of,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `,
      row => [
        row.id,
        row.docPath,
        row.sourceId,
        row.groupTitle,
        row.label,
        row.value,
        row.detail,
        row.asOf,
        row.sortOrder,
      ]
    )
    }

    await client.query('COMMIT')
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback failures and rethrow the original startup error.
    }
    throw error
  } finally {
    if (schemaLockHeld) {
      try {
        await client.query("SELECT pg_advisory_unlock(hashtext('bcrew_foundation_schema_init'))")
      } catch {
        // The connection is about to be released; ignore unlock cleanup failures.
      }
    }
    client.release()
  }
}

export async function bootstrapFoundationDb(options = {}) {
  return initFoundationDb({ ...options, includeBootstrapSeed: true })
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
        JSON.stringify({ foundation1100Review: curation }),
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
             classified_at, classified_by, supersedes_ids, created_at, updated_at
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
             d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
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
               classified_at, classified_by, supersedes_ids, created_at, updated_at
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
               d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
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

export async function listSalesListingAssignments(taskIds = []) {
  const normalizedTaskIds = Array.from(new Set((taskIds || []).map(id => String(id || '').trim()).filter(Boolean)))
  if (!normalizedTaskIds.length) return []

  try {
    const result = await pool.query(
      `
        SELECT clickup_task_id, listing_title, listing_url, agent_name, reset_date,
               days_since_reset, assigned_leader_key, assigned_leader_name,
               assigned_leader_email, action_plan_status, case_status,
               outcome_status, action_plan_state, action_plan_no_reason,
               first_seen_stale_date, stale_since_date, original_reset_date,
               current_reset_date, adjusted_at, adjustment_detected_at,
               action_plan_text, metadata, created_at, updated_at, updated_by
        FROM sales_listing_assignments
        WHERE clickup_task_id = ANY($1::text[])
      `,
      [normalizedTaskIds]
    )

    return result.rows.map(mapSalesListingAssignmentRow)
  } catch (error) {
    if (error?.code === '42P01') return []
    throw error
  }
}

export async function listSalesListingCases() {
  try {
    const result = await pool.query(
      `
        SELECT clickup_task_id, listing_title, listing_url, agent_name, reset_date,
               days_since_reset, assigned_leader_key, assigned_leader_name,
               assigned_leader_email, action_plan_status, case_status,
               outcome_status, action_plan_state, action_plan_no_reason,
               first_seen_stale_date, stale_since_date, original_reset_date,
               current_reset_date, adjusted_at, adjustment_detected_at,
               action_plan_text, metadata, created_at, updated_at, updated_by
        FROM sales_listing_assignments
        ORDER BY updated_at DESC, clickup_task_id ASC
      `
    )

    return result.rows.map(mapSalesListingAssignmentRow)
  } catch (error) {
    if (error?.code === '42P01') return []
    throw error
  }
}

export async function upsertSalesListingAssignment(input = {}, actor = 'system') {
  const taskId = String(input.clickUpTaskId || input.taskId || '').trim()
  if (!taskId) throw new Error('ClickUp task id is required.')
  const hasCaseStatus = Object.prototype.hasOwnProperty.call(input, 'caseStatus')
  const hasOutcomeStatus = Object.prototype.hasOwnProperty.call(input, 'outcomeStatus')
  const hasActionPlanState = Object.prototype.hasOwnProperty.call(input, 'actionPlanState')
  const hasActionPlanNoReason = Object.prototype.hasOwnProperty.call(input, 'actionPlanNoReason')
  const hasActionPlanText = Object.prototype.hasOwnProperty.call(input, 'actionPlanText')
  const existingResult = await pool.query('SELECT * FROM sales_listing_assignments WHERE clickup_task_id = $1 LIMIT 1', [taskId])
  const existing = existingResult.rows[0] ? mapSalesListingAssignmentRow(existingResult.rows[0]) : null
  const inputMetadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  const nextCaseHistory = buildSalesCaseHistory(existing, input, inputMetadata, actor, {
    hasCaseStatus,
    hasOutcomeStatus,
    hasActionPlanState,
    hasActionPlanNoReason,
    hasActionPlanText,
  })
  const metadata = nextCaseHistory ? { ...inputMetadata, caseHistory: nextCaseHistory } : inputMetadata

  const result = await pool.query(
    `
      INSERT INTO sales_listing_assignments (
        clickup_task_id, listing_title, listing_url, agent_name, reset_date,
        days_since_reset, assigned_leader_key, assigned_leader_name,
        assigned_leader_email, action_plan_status, case_status, outcome_status,
        action_plan_state, action_plan_no_reason, first_seen_stale_date,
        stale_since_date, original_reset_date, current_reset_date, adjusted_at,
        adjustment_detected_at, action_plan_text, metadata, updated_by,
        created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, 'identified'),COALESCE($12, 'open'),COALESCE($13, 'unknown'),COALESCE($14, ''),$15,$16,$17,$18,$19,$20,COALESCE($21, ''),$22::jsonb,$23,NOW(),NOW())
      ON CONFLICT (clickup_task_id) DO UPDATE
      SET listing_title = EXCLUDED.listing_title,
          listing_url = EXCLUDED.listing_url,
          agent_name = EXCLUDED.agent_name,
          reset_date = EXCLUDED.reset_date,
          days_since_reset = EXCLUDED.days_since_reset,
          assigned_leader_key = EXCLUDED.assigned_leader_key,
          assigned_leader_name = EXCLUDED.assigned_leader_name,
          assigned_leader_email = EXCLUDED.assigned_leader_email,
          action_plan_status = EXCLUDED.action_plan_status,
          case_status = CASE WHEN $11 IS NULL THEN sales_listing_assignments.case_status ELSE EXCLUDED.case_status END,
          outcome_status = CASE WHEN $12 IS NULL THEN sales_listing_assignments.outcome_status ELSE EXCLUDED.outcome_status END,
          action_plan_state = CASE WHEN $13 IS NULL THEN sales_listing_assignments.action_plan_state ELSE EXCLUDED.action_plan_state END,
          action_plan_no_reason = CASE WHEN $14 IS NULL THEN sales_listing_assignments.action_plan_no_reason ELSE EXCLUDED.action_plan_no_reason END,
          first_seen_stale_date = COALESCE(sales_listing_assignments.first_seen_stale_date, EXCLUDED.first_seen_stale_date),
          stale_since_date = COALESCE(sales_listing_assignments.stale_since_date, EXCLUDED.stale_since_date),
          original_reset_date = COALESCE(sales_listing_assignments.original_reset_date, EXCLUDED.original_reset_date),
          current_reset_date = EXCLUDED.current_reset_date,
          adjusted_at = COALESCE(EXCLUDED.adjusted_at, sales_listing_assignments.adjusted_at),
          adjustment_detected_at = COALESCE(EXCLUDED.adjustment_detected_at, sales_listing_assignments.adjustment_detected_at),
          action_plan_text = CASE WHEN $21 IS NULL THEN sales_listing_assignments.action_plan_text ELSE EXCLUDED.action_plan_text END,
          metadata = sales_listing_assignments.metadata || EXCLUDED.metadata,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      RETURNING clickup_task_id, listing_title, listing_url, agent_name,
                reset_date, days_since_reset, assigned_leader_key,
                assigned_leader_name, assigned_leader_email, action_plan_status,
                case_status, outcome_status, action_plan_state,
                action_plan_no_reason, first_seen_stale_date, stale_since_date,
                original_reset_date, current_reset_date, adjusted_at,
                adjustment_detected_at, action_plan_text, metadata, created_at,
                updated_at, updated_by
    `,
    [
      taskId,
      String(input.listingTitle || '').trim(),
      String(input.listingUrl || '').trim(),
      String(input.agentName || '').trim(),
      input.resetDate || null,
      input.daysSinceReset == null ? null : Number(input.daysSinceReset),
      String(input.assignedLeaderKey || '').trim(),
      String(input.assignedLeaderName || '').trim(),
      String(input.assignedLeaderEmail || '').trim(),
      String(input.actionPlanStatus || 'not_started').trim(),
      hasCaseStatus ? String(input.caseStatus || 'identified').trim() : null,
      hasOutcomeStatus ? String(input.outcomeStatus || 'open').trim() : null,
      hasActionPlanState ? String(input.actionPlanState || 'unknown').trim() : null,
      hasActionPlanNoReason ? String(input.actionPlanNoReason || '').trim() : null,
      input.firstSeenStaleDate || null,
      input.staleSinceDate || null,
      input.originalResetDate || input.resetDate || null,
      input.currentResetDate || input.resetDate || null,
      input.adjustedAt || null,
      input.adjustmentDetectedAt || null,
      hasActionPlanText ? String(input.actionPlanText || '').trim() : null,
      JSON.stringify(metadata),
      actor,
    ]
  )

  return mapSalesListingAssignmentRow(result.rows[0])
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
