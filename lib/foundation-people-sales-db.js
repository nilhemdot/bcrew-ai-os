import { createFoundationAgentFeedbackStore } from './foundation-agent-feedback-store.js'
import { createFoundationControlCompressionStore } from './foundation-control-compression.js'
import { createFoundationSalesListingStore } from './foundation-sales-listing-store.js'
import { createFubLeadSourceStore } from './foundation-fub-lead-source-store.js'
import {
  foundationPoolHandle as pool,
  insertChangeEvent,
  withFoundationTransaction,
} from './foundation-db-core.js'
import {
  getFoundationRuntimeStatus,
} from './foundation-runtime-jobs-db.js'

export {
  getFoundationRuntimeStatus,
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

const fubLeadSourceStore = createFubLeadSourceStore({
  pool,
  withFoundationTransaction,
})

export const listFubLeadSourceRules = fubLeadSourceStore.listFubLeadSourceRules
export const getFubLeadSourceSnapshot = fubLeadSourceStore.getFubLeadSourceSnapshot
export const upsertFubLeadSourceRule = fubLeadSourceStore.upsertFubLeadSourceRule
export const saveFubLeadSourceSnapshot = fubLeadSourceStore.saveFubLeadSourceSnapshot

const foundationAgentFeedbackStore = createFoundationAgentFeedbackStore({
  pool,
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
  pool,
})

export const listSalesListingAssignments = foundationSalesListingStore.listSalesListingAssignments
export const listSalesListingCases = foundationSalesListingStore.listSalesListingCases
export const upsertSalesListingAssignment = foundationSalesListingStore.upsertSalesListingAssignment

const foundationControlCompressionStore = createFoundationControlCompressionStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
})

export const captureFoundationFeedbackItem = (...args) => foundationControlCompressionStore.captureFeedbackItem(...args)
export const listFoundationFeedbackItems = (...args) => foundationControlCompressionStore.listFeedbackItems(...args)

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
      return { inserted: false, event: existing }
    }

    await insertChangeEvent(client, { eventType, entityTable, entityId, actor, summary, metadata })

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
      return { inserted: false, event: existing }
    }

    await insertChangeEvent(client, { eventType, entityTable, entityId, actor, summary, metadata })

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
