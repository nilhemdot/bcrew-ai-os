import { randomUUID } from 'node:crypto'

export const FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-014'
export const FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_SPRINT_ID = 'foundation-db-agent-feedback-store-split-2026-05-16'
export const FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-agent-feedback-store-split-v1'
export const FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-agent-feedback-store-split-014-plan.md'
export const FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-014.json'
export const FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-agent-feedback-store-split-check.mjs'
export const FOUNDATION_AGENT_FEEDBACK_STORE_PRE_SPLIT_LINES = 5608

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

export function evaluateFoundationAgentFeedbackStoreSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  afterLines = countTextLines(foundationDbSource),
  beforeLines = FOUNDATION_AGENT_FEEDBACK_STORE_PRE_SPLIT_LINES,
} = {}) {
  const checks = []
  const normalizedPlanSource = String(planSource || '').toLowerCase()

  addCheck(
    checks,
    moduleSource.includes('export function createFoundationAgentFeedbackStore') &&
      moduleSource.includes('async function upsertAgentOnboardingFeedbackResponse') &&
      moduleSource.includes('async function createAgentFeedbackSendAttempt') &&
      moduleSource.includes('async function createAgentFeedbackReminderAttempt') &&
      moduleSource.includes('async function createAgentFeedbackResponseNotification'),
    'Agent Feedback store module owns the extracted public behavior',
    'factory and response/send/reminder/notification methods present',
  )
  addCheck(
    checks,
    moduleSource.includes('function mapAgentOnboardingFeedbackResponseRow') &&
      moduleSource.includes('function mapAgentOnboardingFeedbackSendAttemptRow') &&
      moduleSource.includes('function mapAgentOnboardingFeedbackReminderAttemptRow') &&
      moduleSource.includes('function mapAgentOnboardingFeedbackResponseNotificationRow'),
    'Agent Feedback store module owns row mappers',
    'response/send/reminder/notification mappers present',
  )
  addCheck(
    checks,
    foundationDbSource.includes("./foundation-agent-feedback-store.js") &&
      foundationDbSource.includes('createFoundationAgentFeedbackStore({') &&
      foundationDbSource.includes('foundationAgentFeedbackStore'),
    'foundation-db wires through the dedicated Agent Feedback store module',
    'store import and instance present',
  )
  addCheck(
    checks,
    foundationDbSource.includes('export const upsertAgentOnboardingFeedbackResponse = foundationAgentFeedbackStore.upsertAgentOnboardingFeedbackResponse') &&
      foundationDbSource.includes('export const createAgentFeedbackSendAttempt = foundationAgentFeedbackStore.createAgentFeedbackSendAttempt') &&
      foundationDbSource.includes('export const updateAgentFeedbackResponseNotificationStatus = foundationAgentFeedbackStore.updateAgentFeedbackResponseNotificationStatus'),
    'foundation-db keeps stable public Agent Feedback delegates',
    'delegate exports present',
  )
  addCheck(
    checks,
    !/function\s+mapAgentOnboardingFeedbackResponseRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapAgentOnboardingFeedbackSendAttemptRow\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+upsertAgentOnboardingFeedbackResponse\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+createAgentFeedbackResponseNotification\s*\(/.test(foundationDbSource),
    'foundation-db no longer defines extracted Agent Feedback behavior inline',
    'inline mapper/function definitions absent',
  )
  addCheck(
    checks,
    scriptSource.includes('dogfood rejects old inline Agent Feedback ownership') &&
      scriptSource.includes('buildSyntheticFoundationAgentFeedbackStoreBehaviorProof') &&
      scriptSource.includes('getPlanCriticRunsByCardIds'),
    'focused proof has dogfood and Plan Critic checks',
    FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_SCRIPT_PATH,
  )
  addCheck(
    checks,
    normalizedPlanSource.includes('split/extraction plan') &&
      normalizedPlanSource.includes('agent feedback') &&
      normalizedPlanSource.includes('no gmail send') &&
      normalizedPlanSource.includes('no clickup write'),
    'plan documents split/extraction posture and no live-send/write boundary',
    FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_PLAN_PATH,
  )
  addCheck(
    checks,
    beforeLines > 0 && afterLines > 0 && afterLines < beforeLines,
    'foundation-db.js line count decreases after the split',
    `${beforeLines}->${afterLines}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    beforeLines,
    afterLines,
  }
}

export async function buildFoundationAgentFeedbackStoreSplitDogfoodProof(input = {}) {
  const unsplit = evaluateFoundationAgentFeedbackStoreSplit({
    foundationDbSource: `
      function mapAgentOnboardingFeedbackResponseRow() {}
      export async function upsertAgentOnboardingFeedbackResponse() {}
      export async function createAgentFeedbackResponseNotification() {}
    `,
    moduleSource: '',
    scriptSource: '',
    planSource: '',
    beforeLines: FOUNDATION_AGENT_FEEDBACK_STORE_PRE_SPLIT_LINES,
    afterLines: FOUNDATION_AGENT_FEEDBACK_STORE_PRE_SPLIT_LINES,
  })
  const split = evaluateFoundationAgentFeedbackStoreSplit(input)
  return {
    ok: unsplit.ok === false && split.ok === true,
    unsplit,
    split,
    dogfoodInvariant: 'The old inline Agent Feedback DB shape fails; the split shape passes only when a dedicated store owns behavior and foundation-db delegates stable exports.',
  }
}

function mapAgentOnboardingFeedbackResponseRow(row) {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    clickUpTaskId: row.clickup_task_id,
    agentName: row.agent_name,
    milestoneDay: Number(row.milestone_day),
    score: Number(row.score),
    improvementFeedback: row.improvement_feedback || '',
    submittedAt: row.submitted_at?.toISOString?.() || row.submitted_at || null,
    userAgent: row.user_agent || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapAgentOnboardingFeedbackSendAttemptRow(row) {
  return {
    id: row.id,
    clickUpTaskId: row.clickup_task_id,
    agentName: row.agent_name,
    milestoneDay: Number(row.milestone_day),
    tokenHash: row.token_hash || '',
    status: row.status,
    gmailMessageId: row.gmail_message_id || '',
    gmailThreadId: row.gmail_thread_id || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapAgentOnboardingFeedbackResponseNotificationRow(row) {
  return {
    id: row.id,
    responseId: row.response_id,
    clickUpTaskId: row.clickup_task_id,
    agentName: row.agent_name,
    milestoneDay: Number(row.milestone_day),
    status: row.status,
    gmailMessageId: row.gmail_message_id || '',
    gmailThreadId: row.gmail_thread_id || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapAgentOnboardingFeedbackReminderAttemptRow(row) {
  return {
    id: row.id,
    clickUpTaskId: row.clickup_task_id,
    agentName: row.agent_name,
    milestoneDay: Number(row.milestone_day),
    reminderSlotKey: row.reminder_slot_key,
    reminderDueAt: row.reminder_due_at?.toISOString?.() || row.reminder_due_at || null,
    status: row.status,
    gmailMessageId: row.gmail_message_id || '',
    gmailThreadId: row.gmail_thread_id || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

export function createFoundationAgentFeedbackStore({
  pool,
  withFoundationTransaction,
  randomUuid = randomUUID,
} = {}) {
  if (!pool) throw new Error('Foundation Agent Feedback store requires a pool.')
  if (typeof withFoundationTransaction !== 'function') throw new Error('Foundation Agent Feedback store requires withFoundationTransaction.')
  if (typeof randomUuid !== 'function') throw new Error('Foundation Agent Feedback store requires randomUuid.')

  async function upsertAgentOnboardingFeedbackResponse(input, actor = 'agent-feedback') {
    const tokenHash = String(input.tokenHash || '').trim()
    const clickUpTaskId = String(input.clickUpTaskId || '').trim()
    const agentName = String(input.agentName || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    const score = Number(input.score)
    const improvementFeedback = String(input.improvementFeedback || '').trim()
    const userAgent = input.userAgent == null ? null : String(input.userAgent).slice(0, 500)

    if (!tokenHash) throw new Error('Feedback token hash is required.')
    if (!clickUpTaskId) throw new Error('ClickUp task id is required.')
    if (!agentName) throw new Error('Agent name is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')
    if (!Number.isInteger(score) || score < 1 || score > 10) throw new Error('Feedback score must be between 1 and 10.')

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          INSERT INTO agent_onboarding_feedback_responses (
            id, token_hash, clickup_task_id, agent_name, milestone_day, score,
            improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9::jsonb, NOW(), NOW())
          ON CONFLICT (token_hash) DO NOTHING
          RETURNING id, token_hash, clickup_task_id, agent_name, milestone_day, score,
                    improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
        `,
        [
          randomUuid(),
          tokenHash,
          clickUpTaskId,
          agentName,
          milestoneDay,
          score,
          improvementFeedback,
          userAgent,
          JSON.stringify({
            actor,
            source: 'aios-agent-feedback-form',
            ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
          }),
        ]
      )

      if (!result.rows[0]) {
        throw new Error('Feedback link has already been used.')
      }

      return mapAgentOnboardingFeedbackResponseRow(result.rows[0])
    })
  }

  async function getActiveAgentFeedbackSendAttempt(input = {}) {
    const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    if (!taskId) throw new Error('ClickUp task id is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

    const result = await pool.query(
      `
        SELECT id, clickup_task_id, agent_name, milestone_day, token_hash, status,
               gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
        FROM agent_onboarding_feedback_send_attempts
        WHERE clickup_task_id = $1
          AND milestone_day = $2
          AND status IN ('sending', 'sent', 'clickup_requested')
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [taskId, milestoneDay],
    )

    return result.rows[0] ? mapAgentOnboardingFeedbackSendAttemptRow(result.rows[0]) : null
  }

  async function createAgentFeedbackSendAttempt(input = {}) {
    const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
    const agentName = String(input.agentName || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    const tokenHash = String(input.tokenHash || '').trim()

    if (!taskId) throw new Error('ClickUp task id is required.')
    if (!agentName) throw new Error('Agent name is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')
    if (!tokenHash) throw new Error('Feedback token hash is required.')

    const result = await pool.query(
      `
        INSERT INTO agent_onboarding_feedback_send_attempts (
          id, clickup_task_id, agent_name, milestone_day, token_hash, status, metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'sending', $6::jsonb, NOW(), NOW())
        RETURNING id, clickup_task_id, agent_name, milestone_day, token_hash, status,
                  gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      `,
      [
        randomUuid(),
        taskId,
        agentName,
        milestoneDay,
        tokenHash,
        JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
      ],
    )

    return mapAgentOnboardingFeedbackSendAttemptRow(result.rows[0])
  }

  async function updateAgentFeedbackSendAttemptStatus(id, input = {}) {
    const attemptId = String(id || '').trim()
    const status = String(input.status || '').trim()
    if (!attemptId) throw new Error('Send attempt id is required.')
    if (!['sending', 'sent', 'clickup_requested', 'failed', 'superseded'].includes(status)) {
      throw new Error('Invalid feedback send attempt status.')
    }

    const result = await pool.query(
      `
        UPDATE agent_onboarding_feedback_send_attempts
        SET status = $2,
            gmail_message_id = COALESCE($3, gmail_message_id),
            gmail_thread_id = COALESCE($4, gmail_thread_id),
            metadata = metadata || $5::jsonb,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, clickup_task_id, agent_name, milestone_day, token_hash, status,
                  gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      `,
      [
        attemptId,
        status,
        input.gmailMessageId || null,
        input.gmailThreadId || null,
        JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
      ],
    )

    if (!result.rows[0]) throw new Error('Feedback send attempt not found.')
    return mapAgentOnboardingFeedbackSendAttemptRow(result.rows[0])
  }

  async function listAgentFeedbackSendAttemptsForMilestone(input = {}) {
    const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    if (!taskId) throw new Error('ClickUp task id is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

    const result = await pool.query(
      `
        SELECT id, clickup_task_id, agent_name, milestone_day, token_hash, status,
               gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
        FROM agent_onboarding_feedback_send_attempts
        WHERE clickup_task_id = $1
          AND milestone_day = $2
        ORDER BY updated_at DESC
      `,
      [taskId, milestoneDay],
    )

    return result.rows.map(mapAgentOnboardingFeedbackSendAttemptRow)
  }

  async function supersedeAgentFeedbackSendAttemptForRepair(id, input = {}) {
    const attemptId = String(id || '').trim()
    if (!attemptId) throw new Error('Send attempt id is required.')
    const result = await pool.query(
      `
        UPDATE agent_onboarding_feedback_send_attempts
        SET status = 'superseded',
            metadata = metadata || $2::jsonb,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, clickup_task_id, agent_name, milestone_day, token_hash, status,
                  gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      `,
      [
        attemptId,
        JSON.stringify({
          supersededByRepair: true,
          repairCardId: input.repairCardId || '',
          repairReason: input.repairReason || '',
          supersededAt: new Date().toISOString(),
          evidencePreserved: true,
        }),
      ],
    )

    if (!result.rows[0]) throw new Error('Feedback send attempt not found.')
    return mapAgentOnboardingFeedbackSendAttemptRow(result.rows[0])
  }

  async function getAgentOnboardingFeedbackResponseForMilestone(input = {}) {
    const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    if (!taskId) throw new Error('ClickUp task id is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

    const result = await pool.query(
      `
        SELECT id, token_hash, clickup_task_id, agent_name, milestone_day, score,
               improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
        FROM agent_onboarding_feedback_responses
        WHERE clickup_task_id = $1
          AND milestone_day = $2
          AND COALESCE((metadata ->> 'supersededByRepair')::boolean, false) = false
        ORDER BY submitted_at DESC
        LIMIT 1
      `,
      [taskId, milestoneDay],
    )

    return result.rows[0] ? mapAgentOnboardingFeedbackResponseRow(result.rows[0]) : null
  }

  async function getAgentOnboardingFeedbackResponseByTokenHash(tokenHash) {
    const normalizedTokenHash = String(tokenHash || '').trim()
    if (!normalizedTokenHash) throw new Error('Feedback token hash is required.')

    const result = await pool.query(
      `
        SELECT id, token_hash, clickup_task_id, agent_name, milestone_day, score,
               improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
        FROM agent_onboarding_feedback_responses
        WHERE token_hash = $1
        LIMIT 1
      `,
      [normalizedTokenHash],
    )

    return result.rows[0] ? mapAgentOnboardingFeedbackResponseRow(result.rows[0]) : null
  }

  async function listAgentOnboardingFeedbackResponsesForMilestone(input = {}) {
    const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    if (!taskId) throw new Error('ClickUp task id is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

    const result = await pool.query(
      `
        SELECT id, token_hash, clickup_task_id, agent_name, milestone_day, score,
               improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
        FROM agent_onboarding_feedback_responses
        WHERE clickup_task_id = $1
          AND milestone_day = $2
        ORDER BY submitted_at DESC
      `,
      [taskId, milestoneDay],
    )

    return result.rows.map(mapAgentOnboardingFeedbackResponseRow)
  }

  async function supersedeAgentOnboardingFeedbackResponseForRepair(id, input = {}) {
    const responseId = String(id || '').trim()
    if (!responseId) throw new Error('Feedback response id is required.')
    const result = await pool.query(
      `
        UPDATE agent_onboarding_feedback_responses
        SET metadata = metadata || $2::jsonb,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, token_hash, clickup_task_id, agent_name, milestone_day, score,
                  improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
      `,
      [
        responseId,
        JSON.stringify({
          supersededByRepair: true,
          repairCardId: input.repairCardId || '',
          repairReason: input.repairReason || '',
          supersededAt: new Date().toISOString(),
          evidencePreserved: true,
        }),
      ],
    )

    if (!result.rows[0]) throw new Error('Feedback response not found.')
    return mapAgentOnboardingFeedbackResponseRow(result.rows[0])
  }

  async function listAgentFeedbackReminderAttemptsForMilestone(input = {}) {
    const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    if (!taskId) throw new Error('ClickUp task id is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

    const result = await pool.query(
      `
        SELECT id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
               reminder_due_at, status, gmail_message_id, gmail_thread_id,
               metadata, created_at, updated_at
        FROM agent_onboarding_feedback_reminder_attempts
        WHERE clickup_task_id = $1
          AND milestone_day = $2
        ORDER BY reminder_due_at ASC, updated_at DESC
      `,
      [taskId, milestoneDay],
    )

    return result.rows.map(mapAgentOnboardingFeedbackReminderAttemptRow)
  }

  async function getAgentFeedbackReminderAttemptBySlot(input = {}) {
    const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    const reminderSlotKey = String(input.reminderSlotKey || '').trim()
    if (!taskId) throw new Error('ClickUp task id is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')
    if (!reminderSlotKey) throw new Error('Reminder slot key is required.')

    const result = await pool.query(
      `
        SELECT id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
               reminder_due_at, status, gmail_message_id, gmail_thread_id,
               metadata, created_at, updated_at
        FROM agent_onboarding_feedback_reminder_attempts
        WHERE clickup_task_id = $1
          AND milestone_day = $2
          AND reminder_slot_key = $3
        LIMIT 1
      `,
      [taskId, milestoneDay, reminderSlotKey],
    )

    return result.rows[0] ? mapAgentOnboardingFeedbackReminderAttemptRow(result.rows[0]) : null
  }

  async function createAgentFeedbackReminderAttempt(input = {}) {
    const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
    const agentName = String(input.agentName || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    const reminderSlotKey = String(input.reminderSlotKey || '').trim()
    const reminderDueAt = input.reminderDueAt ? new Date(input.reminderDueAt) : null
    if (!taskId) throw new Error('ClickUp task id is required.')
    if (!agentName) throw new Error('Agent name is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')
    if (!reminderSlotKey) throw new Error('Reminder slot key is required.')
    if (!reminderDueAt || Number.isNaN(reminderDueAt.getTime())) throw new Error('Valid reminder due date is required.')

    const result = await pool.query(
      `
        INSERT INTO agent_onboarding_feedback_reminder_attempts (
          id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
          reminder_due_at, status, gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', NULL, NULL, $7::jsonb, NOW(), NOW())
        ON CONFLICT (clickup_task_id, milestone_day, reminder_slot_key) DO NOTHING
        RETURNING id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
                  reminder_due_at, status, gmail_message_id, gmail_thread_id,
                  metadata, created_at, updated_at
      `,
      [
        randomUuid(),
        taskId,
        agentName,
        milestoneDay,
        reminderSlotKey,
        reminderDueAt.toISOString(),
        JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
      ],
    )

    if (result.rows[0]) return mapAgentOnboardingFeedbackReminderAttemptRow(result.rows[0])
    return getAgentFeedbackReminderAttemptBySlot({ taskId, milestoneDay, reminderSlotKey })
  }

  async function updateAgentFeedbackReminderAttemptStatus(id, input = {}) {
    const attemptId = String(id || '').trim()
    const status = String(input.status || '').trim()
    if (!attemptId) throw new Error('Reminder attempt id is required.')
    if (!['pending', 'sending', 'sent', 'skipped', 'blocked', 'maxed_out', 'repair', 'failed'].includes(status)) {
      throw new Error('Invalid feedback reminder attempt status.')
    }

    const result = await pool.query(
      `
        UPDATE agent_onboarding_feedback_reminder_attempts
        SET status = $2,
            gmail_message_id = COALESCE($3, gmail_message_id),
            gmail_thread_id = COALESCE($4, gmail_thread_id),
            metadata = metadata || $5::jsonb,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
                  reminder_due_at, status, gmail_message_id, gmail_thread_id,
                  metadata, created_at, updated_at
      `,
      [
        attemptId,
        status,
        input.gmailMessageId || null,
        input.gmailThreadId || null,
        JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
      ],
    )

    if (!result.rows[0]) throw new Error('Feedback reminder attempt not found.')
    return mapAgentOnboardingFeedbackReminderAttemptRow(result.rows[0])
  }

  async function getAgentFeedbackResponseNotificationByResponseId(responseId) {
    const normalizedResponseId = String(responseId || '').trim()
    if (!normalizedResponseId) throw new Error('Feedback response id is required.')

    const result = await pool.query(
      `
        SELECT id, response_id, clickup_task_id, agent_name, milestone_day, status,
               gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
        FROM agent_onboarding_feedback_response_notifications
        WHERE response_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [normalizedResponseId],
    )

    return result.rows[0] ? mapAgentOnboardingFeedbackResponseNotificationRow(result.rows[0]) : null
  }

  async function createAgentFeedbackResponseNotification(input = {}) {
    const responseId = String(input.responseId || '').trim()
    const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
    const agentName = String(input.agentName || '').trim()
    const milestoneDay = Number(input.milestoneDay)
    if (!responseId) throw new Error('Feedback response id is required.')
    if (!taskId) throw new Error('ClickUp task id is required.')
    if (!agentName) throw new Error('Agent name is required.')
    if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

    const result = await pool.query(
      `
        INSERT INTO agent_onboarding_feedback_response_notifications (
          id, response_id, clickup_task_id, agent_name, milestone_day, status,
          gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'sending', NULL, NULL, $6::jsonb, NOW(), NOW())
        ON CONFLICT (response_id) DO NOTHING
        RETURNING id, response_id, clickup_task_id, agent_name, milestone_day, status,
                  gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      `,
      [
        randomUuid(),
        responseId,
        taskId,
        agentName,
        milestoneDay,
        JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
      ],
    )

    if (result.rows[0]) return mapAgentOnboardingFeedbackResponseNotificationRow(result.rows[0])
    return getAgentFeedbackResponseNotificationByResponseId(responseId)
  }

  async function updateAgentFeedbackResponseNotificationStatus(id, input = {}) {
    const notificationId = String(id || '').trim()
    const status = String(input.status || '').trim()
    if (!notificationId) throw new Error('Response notification id is required.')
    if (!['sending', 'sent', 'failed'].includes(status)) {
      throw new Error('Invalid feedback response notification status.')
    }

    const result = await pool.query(
      `
        UPDATE agent_onboarding_feedback_response_notifications
        SET status = $2,
            gmail_message_id = COALESCE($3, gmail_message_id),
            gmail_thread_id = COALESCE($4, gmail_thread_id),
            metadata = metadata || $5::jsonb,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, response_id, clickup_task_id, agent_name, milestone_day, status,
                  gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      `,
      [
        notificationId,
        status,
        input.gmailMessageId || null,
        input.gmailThreadId || null,
        JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
      ],
    )

    if (!result.rows[0]) throw new Error('Feedback response notification record not found.')
    return mapAgentOnboardingFeedbackResponseNotificationRow(result.rows[0])
  }

  return {
    upsertAgentOnboardingFeedbackResponse,
    getActiveAgentFeedbackSendAttempt,
    createAgentFeedbackSendAttempt,
    updateAgentFeedbackSendAttemptStatus,
    listAgentFeedbackSendAttemptsForMilestone,
    supersedeAgentFeedbackSendAttemptForRepair,
    getAgentOnboardingFeedbackResponseForMilestone,
    getAgentOnboardingFeedbackResponseByTokenHash,
    listAgentOnboardingFeedbackResponsesForMilestone,
    supersedeAgentOnboardingFeedbackResponseForRepair,
    listAgentFeedbackReminderAttemptsForMilestone,
    getAgentFeedbackReminderAttemptBySlot,
    createAgentFeedbackReminderAttempt,
    updateAgentFeedbackReminderAttemptStatus,
    getAgentFeedbackResponseNotificationByResponseId,
    createAgentFeedbackResponseNotification,
    updateAgentFeedbackResponseNotificationStatus,
  }
}

export async function buildSyntheticFoundationAgentFeedbackStoreBehaviorProof() {
  const rows = {
    response: null,
    sendAttempt: null,
    reminderAttempt: null,
    notification: null,
  }
  let idCounter = 0
  const now = '2026-05-16T06:30:00.000Z'
  const nextId = () => `synthetic-agent-feedback-${++idCounter}`

  async function fakeQuery(sql, values = []) {
    const text = String(sql || '')
    if (text.includes('INSERT INTO agent_onboarding_feedback_responses')) {
      rows.response = {
        id: values[0],
        token_hash: values[1],
        clickup_task_id: values[2],
        agent_name: values[3],
        milestone_day: values[4],
        score: values[5],
        improvement_feedback: values[6],
        submitted_at: now,
        user_agent: values[7],
        metadata: JSON.parse(values[8] || '{}'),
        created_at: now,
        updated_at: now,
      }
      return { rows: [rows.response] }
    }
    if (text.includes('INSERT INTO agent_onboarding_feedback_send_attempts')) {
      rows.sendAttempt = {
        id: values[0],
        clickup_task_id: values[1],
        agent_name: values[2],
        milestone_day: values[3],
        token_hash: values[4],
        status: 'sending',
        gmail_message_id: null,
        gmail_thread_id: null,
        metadata: JSON.parse(values[5] || '{}'),
        created_at: now,
        updated_at: now,
      }
      return { rows: [rows.sendAttempt] }
    }
    if (text.includes('FROM agent_onboarding_feedback_send_attempts') && text.includes("status IN ('sending', 'sent', 'clickup_requested')")) {
      return { rows: rows.sendAttempt ? [rows.sendAttempt] : [] }
    }
    if (text.includes('UPDATE agent_onboarding_feedback_send_attempts')) {
      rows.sendAttempt = {
        ...rows.sendAttempt,
        status: values[1],
        gmail_message_id: values[2] || rows.sendAttempt?.gmail_message_id || null,
        gmail_thread_id: values[3] || rows.sendAttempt?.gmail_thread_id || null,
        metadata: { ...(rows.sendAttempt?.metadata || {}), ...JSON.parse(values[4] || '{}') },
        updated_at: now,
      }
      return { rows: [rows.sendAttempt] }
    }
    if (text.includes('FROM agent_onboarding_feedback_responses') && text.includes('WHERE token_hash = $1')) {
      return { rows: rows.response ? [rows.response] : [] }
    }
    if (text.includes('INSERT INTO agent_onboarding_feedback_reminder_attempts')) {
      rows.reminderAttempt = {
        id: values[0],
        clickup_task_id: values[1],
        agent_name: values[2],
        milestone_day: values[3],
        reminder_slot_key: values[4],
        reminder_due_at: values[5],
        status: 'pending',
        gmail_message_id: null,
        gmail_thread_id: null,
        metadata: JSON.parse(values[6] || '{}'),
        created_at: now,
        updated_at: now,
      }
      return { rows: [rows.reminderAttempt] }
    }
    if (text.includes('UPDATE agent_onboarding_feedback_reminder_attempts')) {
      rows.reminderAttempt = {
        ...rows.reminderAttempt,
        status: values[1],
        gmail_message_id: values[2] || rows.reminderAttempt?.gmail_message_id || null,
        gmail_thread_id: values[3] || rows.reminderAttempt?.gmail_thread_id || null,
        metadata: { ...(rows.reminderAttempt?.metadata || {}), ...JSON.parse(values[4] || '{}') },
        updated_at: now,
      }
      return { rows: [rows.reminderAttempt] }
    }
    if (text.includes('INSERT INTO agent_onboarding_feedback_response_notifications')) {
      rows.notification = {
        id: values[0],
        response_id: values[1],
        clickup_task_id: values[2],
        agent_name: values[3],
        milestone_day: values[4],
        status: 'sending',
        gmail_message_id: null,
        gmail_thread_id: null,
        metadata: JSON.parse(values[5] || '{}'),
        created_at: now,
        updated_at: now,
      }
      return { rows: [rows.notification] }
    }
    if (text.includes('UPDATE agent_onboarding_feedback_response_notifications')) {
      rows.notification = {
        ...rows.notification,
        status: values[1],
        gmail_message_id: values[2] || rows.notification?.gmail_message_id || null,
        gmail_thread_id: values[3] || rows.notification?.gmail_thread_id || null,
        metadata: { ...(rows.notification?.metadata || {}), ...JSON.parse(values[4] || '{}') },
        updated_at: now,
      }
      return { rows: [rows.notification] }
    }
    return { rows: [] }
  }

  const pool = { query: fakeQuery }
  const store = createFoundationAgentFeedbackStore({
    pool,
    withFoundationTransaction: async work => work({ query: fakeQuery }),
    randomUuid: nextId,
  })

  const response = await store.upsertAgentOnboardingFeedbackResponse({
    tokenHash: 'token-hash',
    clickUpTaskId: 'task-1',
    agentName: 'Synthetic Agent',
    milestoneDay: 30,
    score: 9,
    improvementFeedback: 'Synthetic feedback',
  }, 'synthetic-proof')
  const send = await store.createAgentFeedbackSendAttempt({
    taskId: 'task-1',
    agentName: 'Synthetic Agent',
    milestoneDay: 30,
    tokenHash: 'token-hash',
  })
  const activeSend = await store.getActiveAgentFeedbackSendAttempt({ taskId: 'task-1', milestoneDay: 30 })
  const updatedSend = await store.updateAgentFeedbackSendAttemptStatus(send.id, {
    status: 'sent',
    gmailMessageId: 'gmail-1',
    gmailThreadId: 'thread-1',
  })
  const tokenResponse = await store.getAgentOnboardingFeedbackResponseByTokenHash('token-hash')
  const reminder = await store.createAgentFeedbackReminderAttempt({
    taskId: 'task-1',
    agentName: 'Synthetic Agent',
    milestoneDay: 30,
    reminderSlotKey: 'day-3',
    reminderDueAt: now,
  })
  const updatedReminder = await store.updateAgentFeedbackReminderAttemptStatus(reminder.id, { status: 'sent' })
  const notification = await store.createAgentFeedbackResponseNotification({
    responseId: response.id,
    taskId: 'task-1',
    agentName: 'Synthetic Agent',
    milestoneDay: 30,
  })
  const updatedNotification = await store.updateAgentFeedbackResponseNotificationStatus(notification.id, { status: 'sent' })

  const checks = []
  addCheck(checks, response.tokenHash === 'token-hash' && response.score === 9, 'response insert maps output shape', response.id)
  addCheck(checks, send.status === 'sending' && activeSend?.id === send.id, 'send attempt create/read maps output shape', send.id)
  addCheck(checks, updatedSend.status === 'sent' && updatedSend.gmailMessageId === 'gmail-1', 'send attempt update maps output shape', updatedSend.status)
  addCheck(checks, tokenResponse?.id === response.id, 'token response read maps output shape', tokenResponse?.id || 'missing')
  addCheck(checks, reminder.reminderSlotKey === 'day-3' && updatedReminder.status === 'sent', 'reminder attempt create/update maps output shape', reminder.id)
  addCheck(checks, notification.responseId === response.id && updatedNotification.status === 'sent', 'notification create/update maps output shape', notification.id)

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    rows: {
      response: response.id,
      sendAttempt: updatedSend.id,
      reminderAttempt: updatedReminder.id,
      notification: updatedNotification.id,
    },
  }
}
