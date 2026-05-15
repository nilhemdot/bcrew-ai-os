import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAgentFeedbackToken, hashAgentFeedbackToken } from './agent-feedback.js'
import { buildAgentFeedbackReminderEmail } from './agent-feedback-email.js'
import {
  AGENT_FEEDBACK_MILESTONE_DAYS,
  AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE,
  AGENT_FEEDBACK_SEND_DEFAULT_TARGET,
  AGENT_FEEDBACK_SEND_SOURCE_ID,
  buildAgentFeedbackCandidateFromTask,
  buildAgentFeedbackRecipientPlan,
  hashAgentFeedbackProofValue,
  normalizeAgentFeedbackText,
  resolveAgentFeedbackEmailConfig,
  resolveAgentFeedbackRawRecipients,
} from './agent-feedback-send.js'
import { buildAgentFeedbackProductionSendWindow } from './agent-feedback-auto-send.js'
import { AGENT_FEEDBACK_RESULT_FIELD_BY_MILESTONE } from './agent-feedback-clickup.js'
import { CLICKUP_AGENT_ROSTER_LIST_ID } from './agent-roster-review.js'
import { getClickUpListSnapshotSafe, isClickUpSnapshotDegraded } from './clickup.js'
import {
  createAgentFeedbackReminderAttempt,
  getActiveAgentFeedbackSendAttempt,
  getAgentOnboardingFeedbackResponseForMilestone,
  getAgentFeedbackReminderAttemptBySlot,
  listAgentFeedbackReminderAttemptsForMilestone,
  updateAgentFeedbackReminderAttemptStatus,
} from './foundation-db.js'
import { sendGmailMessage } from './google-delegated.js'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_FEEDBACK_REMINDER_CARD_ID = 'AGENT-FEEDBACK-REMINDER-CADENCE-001'
export const AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY = 'agent-feedback-reminder-cadence-v1'
export const AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-reminder-cadence-v1.md'
export const AGENT_FEEDBACK_REMINDER_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-REMINDER-CADENCE-001.json'
export const AGENT_FEEDBACK_REMINDER_PROOF_PATH = 'docs/audits/2026-05-01-agent-feedback-reminder-cadence-proof.md'
export const AGENT_FEEDBACK_REMINDER_JOB_KEY = 'agent-feedback-reminder-readiness'
export const AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID = 'AGENT-FEEDBACK-LIVE-REMINDERS-001'
export const AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY = 'agent-feedback-live-reminders-v1'
export const AGENT_FEEDBACK_LIVE_REMINDERS_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-live-reminders-v1.md'
export const AGENT_FEEDBACK_LIVE_REMINDERS_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-LIVE-REMINDERS-001.json'
export const AGENT_FEEDBACK_LIVE_REMINDERS_LIVE_APPROVAL_PATH = 'docs/process/approvals/agent-feedback-live-reminders-approval.json'
export const AGENT_FEEDBACK_LIVE_REMINDERS_PROOF_PATH = 'docs/audits/2026-05-02-agent-feedback-live-reminders-proof.md'
export const AGENT_FEEDBACK_REMINDERS_ENABLED_ENV = 'AGENT_FEEDBACK_REMINDERS_ENABLED'
export const AGENT_FEEDBACK_REMINDERS_APPROVAL_REF_ENV = 'AGENT_FEEDBACK_REMINDERS_APPROVAL_REF'
export const AGENT_FEEDBACK_REMINDERS_MAX_PER_RUN_ENV = 'AGENT_FEEDBACK_REMINDERS_MAX_PER_RUN'
export const AGENT_FEEDBACK_REMINDER_OFFSETS_DAYS = Object.freeze([1, 3, 7, 10, 14, 17])
export const AGENT_FEEDBACK_REMINDER_MAX_COUNT = 6
export const AGENT_FEEDBACK_REMINDER_MAX_AGE_DAYS = 30

const CLOSED_STATUSES = new Set(['completed', 'skipped', 'blocked'])
const REMINDER_DUPLICATE_PROTECTED_STATUSES = new Set(['pending', 'sending', 'sent', 'repair'])
const EXTERNAL_SIDE_EFFECTS_DISABLED = Object.freeze({
  gmailSent: false,
  clickUpRequestedWritten: false,
  reminderLedgerWritten: false,
  rawEmailLogged: false,
  rawTokenLogged: false,
  feedbackContentLogged: false,
})
const REPORT_CACHE_MS = 5 * 60 * 1000
let reminderReportCache = null

function normalizeText(value) {
  return normalizeAgentFeedbackText(value)
}

function boolEnv(value) {
  return String(value || '').trim().toLowerCase() === 'true'
}

function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function buildPublicFeedbackUrl(token) {
  const baseUrl = String(process.env.AIOS_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return baseUrl + '/agent-feedback?token=' + encodeURIComponent(token)
}

function runIdForNow(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now)
  const stamp = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
  return `agent-feedback-live-reminders-${stamp.replace(/[-:.TZ]/g, '').slice(0, 14)}`
}

function normalizeStatus(value) {
  return normalizeText(value).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function startOfUtcDay(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addDays(value, days) {
  const date = startOfUtcDay(value)
  if (!date) return null
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + Number(days || 0))
  return copy
}

function daysBetween(start, end) {
  const a = startOfUtcDay(start)
  const b = startOfUtcDay(end)
  if (!a || !b) return null
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

function roleSafeTargetLabel(candidate) {
  const existingLabel = normalizeText(candidate?.targetLabel)
  if (existingLabel && existingLabel !== 'candidate') return existingLabel
  const taskName = normalizeText(candidate?.taskName)
  const targetName = normalizeText(candidate?.targetName)
  const combined = `${targetName} ${taskName}`.toLowerCase()
  if (combined.includes('steve')) return 'Steve'
  if (combined.includes('georgia')) return 'Georgia'
  if (combined.includes('chris')) return 'Chris'
  return 'candidate'
}

function isGeorgiaDay30(candidate) {
  return roleSafeTargetLabel(candidate) === AGENT_FEEDBACK_SEND_DEFAULT_TARGET &&
    Number(candidate?.milestoneDay) === Number(AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE)
}

function hasPrivateProofLeak(source) {
  const text = typeof source === 'string' ? source : JSON.stringify(source || {})
  if (/\/agent-feedback\?token=/i.test(text)) return true
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) return true
  return false
}

function statusFieldForMilestone(milestoneDay) {
  return AGENT_FEEDBACK_RESULT_FIELD_BY_MILESTONE[Number(milestoneDay)]?.status || ''
}

function buildReminderSchedule(initialRequestedAt) {
  return AGENT_FEEDBACK_REMINDER_OFFSETS_DAYS.map(offsetDay => {
    const dueAt = addDays(initialRequestedAt, offsetDay)
    return {
      slotKey: `day-${offsetDay}`,
      offsetDay,
      dueAt: dueAt ? dueAt.toISOString() : '',
    }
  })
}

function summarizeReminderCandidates(candidates) {
  const counts = {
    pending: 0,
    sent: 0,
    blocked: 0,
    skipped: 0,
    maxedOut: 0,
    repair: 0,
    warning: 0,
  }
  const nextReminderDueDates = []
  for (const candidate of candidates) {
    if (candidate.action === 'pending') counts.pending += 1
    if (candidate.action === 'sent') counts.sent += 1
    else if (candidate.sentReminderCount) counts.sent += Number(candidate.sentReminderCount || 0)
    if (candidate.action === 'blocked') counts.blocked += 1
    if (candidate.action === 'skipped') counts.skipped += 1
    if (candidate.action === 'maxed_out') counts.maxedOut += 1
    if (candidate.action === 'repair') counts.repair += 1
    if ((candidate.dataQualityWarnings || []).length) counts.warning += 1
    if (candidate.nextReminderDueAt) nextReminderDueDates.push(candidate.nextReminderDueAt)
  }
  return {
    counts,
    nextReminderDueDates: nextReminderDueDates.sort().slice(0, 10),
  }
}

function buildReminderTokenProof(candidate) {
  const token = createAgentFeedbackToken({
    taskId: candidate.taskId,
    agentName: candidate.taskName || candidate.targetName || 'Agent',
    milestoneDay: candidate.milestoneDay,
  })
  return {
    tokenHash: hashAgentFeedbackToken(token),
    tokenUrlLogged: false,
    usesSamePrivateFeedbackLinkFlow: true,
  }
}

function buildReminderEmailProof(candidate) {
  const tokenProof = buildReminderTokenProof(candidate)
  const email = buildAgentFeedbackReminderEmail({
    agentName: candidate.taskName || candidate.targetName || 'Agent',
    milestoneDay: candidate.milestoneDay,
    feedbackUrl: 'https://private.local/agent-feedback-link-not-logged',
    reminderSlot: 'dry-run',
  })
  return {
    subjectHash: hashAgentFeedbackProofValue(email.subject),
    tokenHashPresent: Boolean(tokenProof.tokenHash),
    tokenUrlLogged: false,
    samePrivateFeedbackLinkFlow: true,
  }
}

function duplicateSlotAttempts(attempts) {
  return (Array.isArray(attempts) ? attempts : []).filter(attempt => normalizeText(attempt.reminderSlotKey))
}

function classifyReminderCandidate({
  candidate,
  recipientPlan,
  initialSendAttempt,
  response,
  reminderAttempts,
  now,
} = {}) {
  const nowDate = now instanceof Date ? now : new Date(now || Date.now())
  const currentStatus = normalizeStatus(candidate.currentStatus)
  const responseCompleted = Boolean(response)
  const reminderSchedule = initialSendAttempt?.updatedAt || initialSendAttempt?.createdAt
    ? buildReminderSchedule(initialSendAttempt.updatedAt || initialSendAttempt.createdAt)
    : []
  const sentReminderCount = (reminderAttempts || []).filter(attempt => normalizeText(attempt.status) === 'sent').length
  const protectedSlotKeys = new Set(duplicateSlotAttempts(reminderAttempts).map(attempt => attempt.reminderSlotKey))
  const initialRequestedAt = initialSendAttempt?.updatedAt || initialSendAttempt?.createdAt || ''
  const daysSinceInitialRequest = initialRequestedAt ? daysBetween(initialRequestedAt, nowDate) : null
  const dueSlots = reminderSchedule
    .filter(slot => slot.dueAt && new Date(slot.dueAt).getTime() <= nowDate.getTime())
    .filter(slot => !protectedSlotKeys.has(slot.slotKey))
  const futureSlots = reminderSchedule
    .filter(slot => slot.dueAt && new Date(slot.dueAt).getTime() > nowDate.getTime())
  const missingRecipient = !candidate.recipientEmailPresent || !candidate.recipientEmailValid
  const missingBcc = Boolean(recipientPlan?.bccMissingConfiguredRoles?.length)
  const blockers = []
  const dataQualityWarnings = []
  let action = 'skipped'
  let stopReason = ''
  let nextReminderDueAt = ''

  if (!candidate.contractLinkPresent) dataQualityWarnings.push('missing_contract_link_warning')
  if (responseCompleted || currentStatus === 'completed') {
    action = 'skipped'
    stopReason = 'feedback_completed'
  } else if (CLOSED_STATUSES.has(currentStatus)) {
    action = 'skipped'
    stopReason = `clickup_status_${currentStatus.replace(/\s+/g, '_')}`
  } else if (!initialSendAttempt) {
    action = 'blocked'
    blockers.push('no_successful_initial_request')
  } else if (initialSendAttempt.status !== 'clickup_requested') {
    action = initialSendAttempt.status === 'sent' ? 'repair' : 'blocked'
    blockers.push('initial_request_not_marked_requested')
    stopReason = initialSendAttempt.status === 'sent'
      ? 'gmail_succeeded_clickup_requested_repair_state'
      : 'initial_request_incomplete'
  } else if (missingRecipient) {
    action = 'blocked'
    blockers.push(candidate.recipientEmailPresent ? `invalid_${candidate.recipientSource}` : `missing_${candidate.recipientSource}`)
  } else if (missingBcc) {
    action = 'blocked'
    blockers.push('missing_bcc_internal_oversight_config')
  } else if (sentReminderCount >= AGENT_FEEDBACK_REMINDER_MAX_COUNT) {
    action = 'maxed_out'
    stopReason = 'max_reminder_count_reached'
  } else if (daysSinceInitialRequest != null && daysSinceInitialRequest > AGENT_FEEDBACK_REMINDER_MAX_AGE_DAYS) {
    action = 'maxed_out'
    stopReason = 'max_age_days_reached'
  } else if (dueSlots.length) {
    action = 'pending'
    nextReminderDueAt = dueSlots[0].dueAt
  } else {
    action = 'skipped'
    stopReason = 'not_due'
    nextReminderDueAt = futureSlots[0]?.dueAt || ''
  }

  return {
    action,
    blockers,
    stopReason,
    dataQualityWarnings,
    currentStatus: currentStatus || 'empty',
    initialRequestedAt,
    daysSinceInitialRequest,
    sentReminderCount,
    protectedDuplicateSlotKeys: Array.from(protectedSlotKeys).sort(),
    dueSlotKeys: dueSlots.map(slot => slot.slotKey),
    nextReminderDueAt,
    reminderSchedule,
  }
}

function sanitizeReminderCandidate({
  candidate,
  recipientPlan,
  initialSendAttempt,
  response,
  reminderAttempts,
  reminderDecision,
} = {}) {
  return {
    action: reminderDecision.action,
    targetLabel: roleSafeTargetLabel(candidate),
    sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
    listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
    taskIdHash: hashAgentFeedbackProofValue(candidate.taskId),
    agentNameHash: hashAgentFeedbackProofValue(candidate.taskName),
    milestoneDay: candidate.milestoneDay,
    statusField: statusFieldForMilestone(candidate.milestoneDay),
    currentStatus: reminderDecision.currentStatus,
    dueDate: candidate.dueDate,
    nextReminderDueAt: reminderDecision.nextReminderDueAt,
    dueSlotKeys: reminderDecision.dueSlotKeys,
    sentReminderCount: reminderDecision.sentReminderCount,
    initialRequest: {
      exists: Boolean(initialSendAttempt),
      status: initialSendAttempt?.status || '',
      successfulRequested: initialSendAttempt?.status === 'clickup_requested',
      requestedAt: reminderDecision.initialRequestedAt,
    },
    stop: {
      reason: reminderDecision.stopReason,
      blockers: reminderDecision.blockers,
    },
    response: {
      completed: Boolean(response),
      responseIdHash: response ? hashAgentFeedbackProofValue(response.id) : '',
    },
    reminderCadence: {
      offsetsDays: AGENT_FEEDBACK_REMINDER_OFFSETS_DAYS,
      capReminders: AGENT_FEEDBACK_REMINDER_MAX_COUNT,
      capDaysAfterInitialRequest: AGENT_FEEDBACK_REMINDER_MAX_AGE_DAYS,
      schedule: reminderDecision.reminderSchedule,
      dueSlotKeys: reminderDecision.dueSlotKeys,
      nextReminderDueAt: reminderDecision.nextReminderDueAt,
      sentReminderCount: reminderDecision.sentReminderCount,
      maxCapReached: reminderDecision.action === 'maxed_out',
    },
    duplicateProtection: {
      ledgerTable: 'agent_onboarding_feedback_reminder_attempts',
      uniqueKey: 'clickup_task_id + milestone_day + reminder_slot_key',
      duplicateProtected: true,
      protectedSlotKeys: reminderDecision.protectedDuplicateSlotKeys,
      attemptsInspected: (reminderAttempts || []).length,
    },
    recipientPlan: {
      recipientRule: recipientPlan.recipientRule,
      recipientSource: recipientPlan.recipientSource,
      recipientCategory: recipientPlan.recipientCategory,
      recipientSourceField: recipientPlan.recipientSourceField,
      toRole: recipientPlan.toRole,
      toAddressPresent: recipientPlan.toAddressPresent,
      toAddressHashPresent: Boolean(recipientPlan.toAddressHash),
      internalOversightMode: recipientPlan.internalOversightMode,
      bccRolesApplied: recipientPlan.bccRolesApplied || [],
      bccActualSendRoles: recipientPlan.bccActualSendRoles || [],
      bccRecipientDedupedRoles: recipientPlan.bccRecipientDedupedRoles || [],
      bccMissingConfiguredRoles: recipientPlan.bccMissingConfiguredRoles || [],
    },
    dataQualityWarnings: reminderDecision.dataQualityWarnings,
    email: {
      template: 'agent-feedback-reminder',
      samePrivateFeedbackLinkFlow: true,
      tokenUrlLogged: false,
      subjectHash: reminderDecision.action === 'pending'
        ? buildReminderEmailProof(candidate).subjectHash
        : '',
    },
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
  }
}

function syntheticCandidate(overrides = {}) {
  return {
    targetName: overrides.targetName || 'Synthetic Agent',
    taskId: overrides.taskId || 'synthetic-task-id',
    taskName: overrides.taskName || 'Synthetic Agent',
    milestoneDay: Number(overrides.milestoneDay || 30),
    statusField: statusFieldForMilestone(Number(overrides.milestoneDay || 30)),
    currentStatus: overrides.currentStatus || '',
    normalizedStatus: normalizeStatus(overrides.currentStatus || ''),
    dueDate: overrides.dueDate || '2026-04-30',
    recipientSource: overrides.recipientSource || 'company_email',
    recipientRule: overrides.recipientRule || 'clickup-company-email',
    recipientCategory: overrides.recipientCategory || 'external-agent',
    recipientFieldName: overrides.recipientFieldName || 'Company Email',
    recipientFieldNameHash: hashAgentFeedbackProofValue(overrides.recipientFieldName || 'Company Email'),
    recipientEmail: 'synthetic@example.invalid',
    recipientEmailPresent: true,
    recipientEmailValid: true,
    toRole: 'agent',
    contractLinkPresent: overrides.contractLinkPresent !== false,
  }
}

function syntheticRecipientPlan(candidate = syntheticCandidate()) {
  return {
    recipientRule: candidate.recipientRule,
    recipientSource: candidate.recipientSource,
    recipientCategory: candidate.recipientCategory,
    recipientSourceField: {
      name: candidate.recipientFieldName,
      nameHash: candidate.recipientFieldNameHash,
      present: true,
      valid: true,
    },
    toRole: candidate.toRole,
    toAddressPresent: true,
    toAddressHash: hashAgentFeedbackProofValue(candidate.recipientEmail),
    internalOversightMode: 'bcc',
    bccRolesApplied: ['Steve', 'Carson', 'Ryan', 'Georgia'],
    bccActualSendRoles: ['Steve', 'Carson', 'Ryan', 'Georgia'],
    bccRecipientDedupedRoles: [],
    bccMissingConfiguredRoles: [],
  }
}

function makeSyntheticReminder({
  label,
  candidate = syntheticCandidate(),
  recipientPlan = syntheticRecipientPlan(candidate),
  initialSendAttempt = {
    status: 'clickup_requested',
    createdAt: '2026-04-28T00:00:00.000Z',
    updatedAt: '2026-04-28T00:00:00.000Z',
  },
  response = null,
  reminderAttempts = [],
  now = new Date('2026-05-01T00:00:00.000Z'),
} = {}) {
  const decision = classifyReminderCandidate({
    candidate,
    recipientPlan,
    initialSendAttempt,
    response,
    reminderAttempts,
    now,
  })
  return {
    label,
    ...sanitizeReminderCandidate({
      candidate,
      recipientPlan,
      initialSendAttempt,
      response,
      reminderAttempts,
      reminderDecision: decision,
    }),
  }
}

export function buildAgentFeedbackReminderSyntheticProof() {
  const initialRequest = {
    status: 'clickup_requested',
    createdAt: '2026-04-28T00:00:00.000Z',
    updatedAt: '2026-04-28T00:00:00.000Z',
  }
  const pending = makeSyntheticReminder({ label: 'pending_day_1_and_day_3', initialSendAttempt: initialRequest })
  const noInitial = makeSyntheticReminder({ label: 'no_initial_request', initialSendAttempt: null })
  const completed = makeSyntheticReminder({
    label: 'completed_stops',
    initialSendAttempt: initialRequest,
    response: { id: 'synthetic-response-id' },
  })
  const skipped = makeSyntheticReminder({
    label: 'skipped_stops',
    candidate: syntheticCandidate({ currentStatus: 'Skipped' }),
    initialSendAttempt: initialRequest,
  })
  const blocked = makeSyntheticReminder({
    label: 'blocked_stops',
    candidate: syntheticCandidate({ currentStatus: 'Blocked' }),
    initialSendAttempt: initialRequest,
  })
  const duplicate = makeSyntheticReminder({
    label: 'duplicate_slot_protected',
    initialSendAttempt: initialRequest,
    reminderAttempts: [{
      reminderSlotKey: 'day-1',
      status: 'sent',
    }],
  })
  const maxed = makeSyntheticReminder({
    label: 'max_cap_stops',
    initialSendAttempt: initialRequest,
    reminderAttempts: AGENT_FEEDBACK_REMINDER_OFFSETS_DAYS.map(offset => ({
      reminderSlotKey: `day-${offset}`,
      status: 'sent',
    })),
  })
  const repair = makeSyntheticReminder({
    label: 'initial_request_repair_state',
    initialSendAttempt: {
      status: 'sent',
      createdAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:00:00.000Z',
    },
  })
  return {
    cardId: AGENT_FEEDBACK_REMINDER_CARD_ID,
    mode: 'dry-run-synthetic',
    schedule: {
      dayOffsets: AGENT_FEEDBACK_REMINDER_OFFSETS_DAYS,
      capReminders: AGENT_FEEDBACK_REMINDER_MAX_COUNT,
      capDaysAfterInitialRequest: AGENT_FEEDBACK_REMINDER_MAX_AGE_DAYS,
    },
    cases: [
      pending,
      noInitial,
      completed,
      skipped,
      blocked,
      duplicate,
      maxed,
      repair,
    ],
    assertions: {
      noReminderBeforeSuccessfulInitialRequest: noInitial.action === 'blocked' &&
        noInitial.stop.blockers.includes('no_successful_initial_request'),
      completedSkippedBlockedStop: [completed, skipped, blocked].every(item => item.action === 'skipped'),
      duplicateSlotProtected: duplicate.duplicateProtection.protectedSlotKeys.includes('day-1'),
      capStopsAtSixOrThirtyDays: maxed.action === 'maxed_out',
      repairStateDoesNotResend: repair.action === 'repair',
      dryRunOnly: true,
      metadataOnly: true,
    },
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
  }
}

async function buildReminderCandidatePlans({
  now = new Date(),
  snapshot = null,
  getRosterSnapshot = getClickUpListSnapshotSafe,
} = {}) {
  const rosterSnapshot = snapshot || await getRosterSnapshot(CLICKUP_AGENT_ROSTER_LIST_ID, { listName: 'Agent Roster' })
  if (isClickUpSnapshotDegraded(rosterSnapshot)) {
    return {
      source: {
        sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
        listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
        tasksInspected: 0,
        candidateCount: 0,
        sourceUnavailable: true,
        sourceHealth: rosterSnapshot.sourceHealth || null,
      },
      plans: [],
    }
  }
  const candidateInputs = []
  for (const task of rosterSnapshot.tasks || []) {
    for (const milestoneDay of AGENT_FEEDBACK_MILESTONE_DAYS) {
      candidateInputs.push(buildAgentFeedbackCandidateFromTask({
        task,
        fields: rosterSnapshot.fields || [],
        targetName: task?.name || '',
        milestoneDay,
        now,
      }))
    }
  }

  const plans = []
  for (const candidate of candidateInputs) {
    const [recipientPlan, initialSendAttempt, response, reminderAttempts] = await Promise.all([
      buildAgentFeedbackRecipientPlan(candidate),
      getActiveAgentFeedbackSendAttempt({
        taskId: candidate.taskId,
        milestoneDay: candidate.milestoneDay,
      }),
      getAgentOnboardingFeedbackResponseForMilestone({
        taskId: candidate.taskId,
        milestoneDay: candidate.milestoneDay,
      }),
      listAgentFeedbackReminderAttemptsForMilestone({
        taskId: candidate.taskId,
        milestoneDay: candidate.milestoneDay,
      }),
    ])
    const decision = classifyReminderCandidate({
      candidate,
      recipientPlan,
      initialSendAttempt,
      response,
      reminderAttempts,
      now,
    })
    const sanitized = sanitizeReminderCandidate({
      candidate,
      recipientPlan,
      initialSendAttempt,
      response,
      reminderAttempts,
      reminderDecision: decision,
    })
    plans.push({
      candidate,
      recipientPlan,
      initialSendAttempt,
      response,
      reminderAttempts,
      decision,
      sanitized,
    })
  }

  return {
    source: {
      sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
      listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
      tasksInspected: Array.isArray(rosterSnapshot.tasks) ? rosterSnapshot.tasks.length : 0,
      candidateCount: plans.length,
    },
    plans,
  }
}

export async function buildAgentFeedbackReminderDryRunReport({
  now = new Date(),
  includeCandidates = true,
  forceRefresh = false,
  snapshot = null,
  getRosterSnapshot = getClickUpListSnapshotSafe,
} = {}) {
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const useDefaultSnapshot = !snapshot && getRosterSnapshot === getClickUpListSnapshotSafe
  if (
    useDefaultSnapshot &&
    !forceRefresh &&
    reminderReportCache &&
    Number.isFinite(nowTime) &&
    nowTime - reminderReportCache.createdAtMs < REPORT_CACHE_MS
  ) {
    return {
      ...reminderReportCache.report,
      candidates: includeCandidates
        ? reminderReportCache.report.candidates
      : reminderReportCache.report.candidates.slice(0, 12),
    }
  }

  const { source, plans } = await buildReminderCandidatePlans({ now, snapshot, getRosterSnapshot })
  const candidates = plans.map(plan => plan.sanitized)

  const georgiaDay30 = candidates.find(candidate =>
    candidate.targetLabel === 'Georgia' &&
      candidate.milestoneDay === 30 &&
      candidate.initialRequest?.successfulRequested === true
  ) || null
  const chrisDay30 = candidates.find(candidate =>
    candidate.targetLabel === 'Chris' &&
      candidate.milestoneDay === 30 &&
      candidate.initialRequest?.successfulRequested === true
  ) || null
  const summary = summarizeReminderCandidates(candidates)
  const report = {
    mode: 'dry-run-report-only',
    cardId: AGENT_FEEDBACK_REMINDER_CARD_ID,
    sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
    listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
    generatedAt: now.toISOString(),
    sourceHealth: source.sourceHealth || null,
    scanner: {
      cadence: 'daily reminder readiness scan',
      dryRunOnly: true,
      candidateCount: candidates.length,
      tasksInspected: source.tasksInspected,
      sourceUnavailable: source.sourceUnavailable === true,
      remindersRequireSuccessfulInitialRequest: true,
    },
    counts: summary.counts,
    nextReminderDueDates: summary.nextReminderDueDates,
    georgiaDay30,
    chrisDay30,
    candidates: includeCandidates ? candidates : candidates.slice(0, 12),
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
  }
  if (useDefaultSnapshot) {
    reminderReportCache = {
      createdAtMs: Date.now(),
      report: {
        ...report,
        candidates,
      },
    }
  }
  return report
}

export async function loadAgentFeedbackReminderApprovalConfig({
  repoRoot = defaultRepoRoot,
  env = process.env,
  approvalConfig = null,
} = {}) {
  if (approvalConfig) {
    return {
      ...approvalConfig,
      source: approvalConfig.source || 'provided-config',
    }
  }
  const approvalRef = normalizeText(
    env[AGENT_FEEDBACK_REMINDERS_APPROVAL_REF_ENV] || AGENT_FEEDBACK_LIVE_REMINDERS_LIVE_APPROVAL_PATH,
  )
  const loaded = await readOptionalJson(repoRoot, approvalRef)
  if (!loaded) {
    return {
      approvalSchemaVersion: 1,
      mode: 'dry-run-report-only',
      approved: false,
      liveRemindersApproved: false,
      source: 'default-dry-run-no-live-reminder-approval',
      approvalRef,
    }
  }
  return {
    ...loaded,
    source: approvalRef,
    approvalRef,
  }
}

function validateReminderLiveApprovalConfig(approvalConfig = {}) {
  const mode = normalizeText(approvalConfig.mode || 'dry-run-report-only')
  const bccRoles = Array.isArray(approvalConfig.bccRoles) ? approvalConfig.bccRoles.map(normalizeText) : []
  const cadenceDays = Array.isArray(approvalConfig.cadenceDays) ? approvalConfig.cadenceDays.map(Number) : []
  const sendWindow = approvalConfig.sendWindow && typeof approvalConfig.sendWindow === 'object'
    ? approvalConfig.sendWindow
    : {}
  const validDate = !Number.isNaN(new Date(approvalConfig.approvedAt).getTime())
  const reasons = []

  if (approvalConfig.approved !== true) reasons.push('approval_not_marked_approved')
  if (approvalConfig.liveRemindersApproved !== true) reasons.push('live_reminders_not_approved')
  if (approvalConfig.cardId !== AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID) reasons.push('approval_card_mismatch')
  if (normalizeText(approvalConfig.approvedBy) !== 'Steve') reasons.push('approval_must_be_by_steve')
  if (!validDate) reasons.push('approval_timestamp_invalid')
  if (mode !== 'production-reminders') reasons.push('approval_mode_not_production_reminders')
  if (normalizeText(approvalConfig.recipientRule) !== 'clickup-company-email') {
    reasons.push('recipient_rule_not_company_email')
  }
  for (const role of ['Steve', 'Carson', 'Ryan', 'Georgia']) {
    if (!bccRoles.includes(role)) reasons.push(`missing_bcc_${role.toLowerCase()}`)
  }
  if (JSON.stringify(cadenceDays) !== JSON.stringify(AGENT_FEEDBACK_REMINDER_OFFSETS_DAYS)) {
    reasons.push('cadence_days_mismatch')
  }
  if (
    normalizeText(sendWindow.start) !== '08:30' ||
    normalizeText(sendWindow.end) !== '10:00' ||
    normalizeText(sendWindow.timezone) !== 'America/Toronto'
  ) {
    reasons.push('send_window_mismatch')
  }
  if (approvalConfig.clickUpWritebackOnReminder !== false) {
    reasons.push('reminders_must_not_write_clickup_requested')
  }

  return {
    valid: reasons.length === 0,
    mode,
    reasons,
  }
}

export function evaluateAgentFeedbackReminderLiveGuard({
  env = process.env,
  approvalConfig = {},
} = {}) {
  const toggleEnabled = boolEnv(env[AGENT_FEEDBACK_REMINDERS_ENABLED_ENV])
  const validation = validateReminderLiveApprovalConfig(approvalConfig)
  const canLiveSend = toggleEnabled && validation.valid
  const reasons = []
  if (!toggleEnabled) reasons.push('runtime_toggle_disabled')
  if (!validation.valid) reasons.push(...validation.reasons)
  return {
    canLiveSend,
    decision: canLiveSend ? 'live_reminders_allowed' : 'report_only',
    twoKeyControl: {
      required: true,
      runtimeToggleEnv: AGENT_FEEDBACK_REMINDERS_ENABLED_ENV,
      runtimeToggleEnabled: toggleEnabled,
      approvedModeRequired: 'production-reminders',
      approvedMode: validation.mode,
      approvalSource: approvalConfig.source || approvalConfig.approvalRef || 'provided-config',
    },
    reasons: [...new Set(reasons)],
  }
}

function buildNoSideEffectReminderLiveResult(extra = {}) {
  return {
    ...extra,
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
  }
}

function reminderSlotForDecision(decision, slotKey) {
  return (decision?.reminderSchedule || []).find(slot => slot.slotKey === slotKey) || null
}

async function sendLiveReminderCandidate({
  candidate,
  recipientPlan,
  decision,
  runId,
  approvalSource,
  maxSends,
  now = new Date(),
} = {}) {
  const reminderSlotKey = decision?.dueSlotKeys?.[0] || ''
  if (!reminderSlotKey) {
    return buildNoSideEffectReminderLiveResult({
      action: 'skipped',
      attemptedSend: false,
      skipReason: 'no_due_reminder_slot',
    })
  }

  const existingAttempt = await getAgentFeedbackReminderAttemptBySlot({
    taskId: candidate.taskId,
    milestoneDay: candidate.milestoneDay,
    reminderSlotKey,
  })
  if (existingAttempt) {
    return buildNoSideEffectReminderLiveResult({
      action: 'blocked',
      attemptedSend: false,
      blockers: ['duplicate_reminder_slot_attempt_exists'],
      reminderSlotKey,
      duplicateAttemptStatus: existingAttempt.status || '',
      attemptIdHash: hashAgentFeedbackProofValue(existingAttempt.id),
    })
  }

  const stableTokenIssuedAtMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const token = createAgentFeedbackToken({
    taskId: candidate.taskId,
    agentName: candidate.taskName,
    milestoneDay: candidate.milestoneDay,
  }, Number.isFinite(stableTokenIssuedAtMs) ? stableTokenIssuedAtMs : Date.now())
  const tokenHash = hashAgentFeedbackToken(token)
  const emailConfig = resolveAgentFeedbackEmailConfig()
  const { to, bcc } = await resolveAgentFeedbackRawRecipients(candidate)
  const slot = reminderSlotForDecision(decision, reminderSlotKey)
  const attempt = await createAgentFeedbackReminderAttempt({
    taskId: candidate.taskId,
    agentName: candidate.taskName,
    milestoneDay: candidate.milestoneDay,
    reminderSlotKey,
    reminderDueAt: slot?.dueAt || decision.nextReminderDueAt,
    metadata: {
      cardId: AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
      closeoutKey: AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
      runId,
      liveReminder: true,
      approvalSource,
      maxSends,
      recipientRule: recipientPlan.recipientRule,
      recipientSource: recipientPlan.recipientSource,
      internalOversightMode: 'bcc',
      bccRoles: recipientPlan.bccRolesApplied,
      bccActualSendRoles: recipientPlan.bccActualSendRoles,
      bccRecipientDedupedRoles: recipientPlan.bccRecipientDedupedRoles,
      bccAddressHashesByRole: recipientPlan.bccAddressHashesByRole,
      rawEmailsLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
      clickUpRequestedWritten: false,
    },
  })

  if (attempt.status !== 'pending') {
    return buildNoSideEffectReminderLiveResult({
      action: 'blocked',
      attemptedSend: false,
      blockers: ['duplicate_reminder_slot_attempt_exists'],
      reminderSlotKey,
      duplicateAttemptStatus: attempt.status || '',
      attemptIdHash: hashAgentFeedbackProofValue(attempt.id),
    })
  }

  let gmail = null
  let gmailSendSucceeded = false
  try {
    await updateAgentFeedbackReminderAttemptStatus(attempt.id, {
      status: 'sending',
      metadata: {
        sendStartedAt: new Date().toISOString(),
        rawEmailsLogged: false,
        rawTokenLogged: false,
        feedbackContentLogged: false,
        clickUpRequestedWritten: false,
      },
    })
    const email = buildAgentFeedbackReminderEmail({
      agentName: candidate.taskName,
      milestoneDay: candidate.milestoneDay,
      feedbackUrl: buildPublicFeedbackUrl(token),
      reminderSlot: reminderSlotKey,
    })
    gmail = await sendGmailMessage(emailConfig.fromEmail, {
      to,
      bcc,
      replyTo: emailConfig.replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
      fromName: emailConfig.fromName,
    })
    gmailSendSucceeded = true
    await updateAgentFeedbackReminderAttemptStatus(attempt.id, {
      status: 'sent',
      gmailMessageId: gmail.id || '',
      gmailThreadId: gmail.threadId || '',
      metadata: {
        gmailSendSucceeded: true,
        clickUpRequestedWritten: false,
        repairState: 'none',
        resendAllowed: false,
        rawEmailsLogged: false,
        rawTokenLogged: false,
        feedbackContentLogged: false,
      },
    })
    return {
      action: 'sent',
      attemptedSend: true,
      reminderSlotKey,
      tokenHash: tokenHash.slice(0, 16),
      attemptIdHash: hashAgentFeedbackProofValue(attempt.id),
      gmailMessageIdHash: hashAgentFeedbackProofValue(gmail.id || ''),
      gmailThreadIdHash: hashAgentFeedbackProofValue(gmail.threadId || ''),
      repairState: 'none',
      sideEffects: {
        gmailSent: true,
        clickUpRequestedWritten: false,
        reminderLedgerWritten: true,
        rawEmailLogged: false,
        rawTokenLogged: false,
        feedbackContentLogged: false,
      },
    }
  } catch (error) {
    const errorClass = error instanceof Error ? error.name : 'Error'
    if (gmailSendSucceeded) {
      try {
        await updateAgentFeedbackReminderAttemptStatus(attempt.id, {
          status: 'repair',
          gmailMessageId: gmail?.id || '',
          gmailThreadId: gmail?.threadId || '',
          metadata: {
            gmailSendSucceeded: true,
            clickUpRequestedWritten: false,
            repairState: 'reminder_ledger_sent_update_failed',
            resendAllowed: false,
            errorClass,
          },
        })
      } catch {
        // The pending/sending row and unique slot key still block resends.
      }
      return {
        action: 'repair',
        attemptedSend: true,
        reminderSlotKey,
        tokenHash: tokenHash.slice(0, 16),
        attemptIdHash: hashAgentFeedbackProofValue(attempt.id),
        gmailMessageIdHash: hashAgentFeedbackProofValue(gmail?.id || ''),
        gmailThreadIdHash: hashAgentFeedbackProofValue(gmail?.threadId || ''),
        repairState: 'reminder_ledger_sent_update_failed',
        errorClass,
        sideEffects: {
          gmailSent: true,
          clickUpRequestedWritten: false,
          reminderLedgerWritten: true,
          rawEmailLogged: false,
          rawTokenLogged: false,
          feedbackContentLogged: false,
        },
      }
    }
    await updateAgentFeedbackReminderAttemptStatus(attempt.id, {
      status: 'failed',
      metadata: {
        gmailSendSucceeded: false,
        clickUpRequestedWritten: false,
        resendAllowed: false,
        errorClass,
      },
    })
    return {
      action: 'blocked',
      attemptedSend: true,
      reminderSlotKey,
      tokenHash: tokenHash.slice(0, 16),
      attemptIdHash: hashAgentFeedbackProofValue(attempt.id),
      repairState: 'gmail_send_failed_before_reminder_sent',
      errorClass,
      sideEffects: {
        gmailSent: false,
        clickUpRequestedWritten: false,
        reminderLedgerWritten: true,
        rawEmailLogged: false,
        rawTokenLogged: false,
        feedbackContentLogged: false,
      },
    }
  }
}

function summarizeLiveReminderRunCandidates(candidates = []) {
  const base = summarizeReminderCandidates(candidates)
  const failedSendCount = candidates.filter(candidate =>
    candidate.liveResult?.attemptedSend === true &&
      candidate.liveResult?.action === 'blocked'
  ).length
  return {
    pendingReminderCount: base.counts.pending,
    sentReminderCount: base.counts.sent,
    skippedReminderCount: base.counts.skipped,
    blockedReminderCount: base.counts.blocked,
    maxedOutReminderCount: base.counts.maxedOut,
    repairReminderCount: base.counts.repair,
    warningCount: base.counts.warning,
    failedSendCount,
    nextReminderDueDates: base.nextReminderDueDates,
    totalCandidates: candidates.length,
    metadataOnly: true,
  }
}

export async function runAgentFeedbackLiveReminders({
  repoRoot = defaultRepoRoot,
  env = process.env,
  approvalConfig = null,
  includeCandidates = true,
  now = new Date(),
  maxSends = null,
} = {}) {
  const nowDate = now instanceof Date ? now : new Date(now)
  const runId = runIdForNow(nowDate)
  const liveApprovalConfig = await loadAgentFeedbackReminderApprovalConfig({ repoRoot, env, approvalConfig })
  const liveGuard = evaluateAgentFeedbackReminderLiveGuard({ env, approvalConfig: liveApprovalConfig })
  const sendWindow = buildAgentFeedbackProductionSendWindow({ now: nowDate })
  const canAttemptLiveSend = liveGuard.canLiveSend && sendWindow.canSendNow
  const configuredMaxSends = positiveInteger(
    maxSends ?? env[AGENT_FEEDBACK_REMINDERS_MAX_PER_RUN_ENV],
    25,
  )
  const { source, plans } = await buildReminderCandidatePlans({ now: nowDate })
  const candidates = []
  let sentThisRun = 0

  for (const plan of plans) {
    const base = {
      ...plan.sanitized,
      reminderRun: {
        runId,
        enabled: liveGuard.canLiveSend,
        canSendNow: canAttemptLiveSend,
        approvalSource: liveApprovalConfig.source || liveApprovalConfig.approvalRef || '',
        maxSends: configuredMaxSends,
        sendWindow,
      },
    }

    if (!canAttemptLiveSend) {
      candidates.push({
        ...base,
        liveResult: buildNoSideEffectReminderLiveResult({
          action: base.action,
          attemptedSend: false,
          failClosedReasons: [
            ...liveGuard.reasons,
            ...(sendWindow.canSendNow ? [] : [sendWindow.reason]),
          ],
        }),
      })
      continue
    }

    if (plan.decision.action !== 'pending') {
      candidates.push({
        ...base,
        liveResult: buildNoSideEffectReminderLiveResult({
          action: plan.decision.action,
          attemptedSend: false,
          skipReason: plan.decision.stopReason || plan.decision.blockers?.[0] || 'not_pending',
        }),
      })
      continue
    }

    if (sentThisRun >= configuredMaxSends) {
      candidates.push({
        ...base,
        action: 'blocked',
        liveResult: buildNoSideEffectReminderLiveResult({
          action: 'blocked',
          attemptedSend: false,
          blockers: ['max_reminder_sends_per_run_reached'],
        }),
      })
      continue
    }

    const liveResult = await sendLiveReminderCandidate({
      candidate: plan.candidate,
      recipientPlan: plan.recipientPlan,
      decision: plan.decision,
      runId,
      approvalSource: liveApprovalConfig.source || liveApprovalConfig.approvalRef || '',
      maxSends: configuredMaxSends,
      now: nowDate,
    })
    if (liveResult.action === 'sent' || liveResult.action === 'repair') sentThisRun += 1
    candidates.push({
      ...base,
      action: liveResult.action,
      liveResult,
      sideEffects: liveResult.sideEffects,
    })
  }

  const summary = summarizeLiveReminderRunCandidates(candidates)
  const failClosed = !canAttemptLiveSend
  const ok = !failClosed && summary.failedSendCount === 0
  const georgiaDay30 = candidates.find(candidate =>
    candidate.targetLabel === 'Georgia' &&
      candidate.milestoneDay === 30 &&
      candidate.initialRequest?.successfulRequested === true
  ) || null
  const chrisDay30 = candidates.find(candidate =>
    candidate.targetLabel === 'Chris' &&
      candidate.milestoneDay === 30 &&
      candidate.initialRequest?.successfulRequested === true
  ) || null

  return {
    ok,
    status: ok ? 'healthy' : 'risk',
    cardId: AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
    mode: failClosed ? 'production-live-reminders-fail-closed' : 'production-live-reminders',
    runId,
    generatedAt: nowDate.toISOString(),
    source,
    liveGuard,
    sendWindow,
    reminderEnablement: {
      enabled: liveGuard.canLiveSend,
      canSendNow: canAttemptLiveSend,
      envToggle: boolEnv(env[AGENT_FEEDBACK_REMINDERS_ENABLED_ENV]),
      approvalSource: liveApprovalConfig.source || liveApprovalConfig.approvalRef || '',
      approvalMode: liveApprovalConfig.mode || '',
      failClosedReasons: failClosed
        ? [
            ...liveGuard.reasons,
            ...(sendWindow.canSendNow ? [] : [sendWindow.reason]),
          ]
        : [],
      maxSends: configuredMaxSends,
      sendWindow,
    },
    summary: {
      ...summary,
      georgiaDay30ReminderAction: georgiaDay30?.action || 'missing',
      georgiaDay30NextReminderDueAt: georgiaDay30?.nextReminderDueAt || '',
      chrisDay30ReminderAction: chrisDay30?.action || 'missing',
      chrisDay30NextReminderDueAt: chrisDay30?.nextReminderDueAt || '',
    },
    candidates: includeCandidates ? candidates : candidates.slice(0, 12),
    privacy: {
      metadataOnly: !hasPrivateProofLeak(candidates),
      rawEmailLogged: false,
      tokenUrlLogged: false,
      feedbackContentLogged: false,
    },
  }
}

function summarizeReminderJobRuntime(foundationJobs = null) {
  const jobs = Array.isArray(foundationJobs?.jobs) ? foundationJobs.jobs : []
  const latestRuns = Array.isArray(foundationJobs?.latestRuns) ? foundationJobs.latestRuns : []
  const job = jobs.find(item => item.key === AGENT_FEEDBACK_REMINDER_JOB_KEY) || null
  const latestRun = job?.latestRun || latestRuns.find(run => run.jobKey === AGENT_FEEDBACK_REMINDER_JOB_KEY) || null
  return {
    jobKey: AGENT_FEEDBACK_REMINDER_JOB_KEY,
    enabled: job?.enabled !== false,
    runtimeMode: job?.runtimeMode || '',
    scheduleEveryMinutes: job?.scheduleEveryMinutes ?? null,
    scheduleLocalTime: job?.scheduleLocalTime || '',
    scheduleTimezone: job?.scheduleTimezone || '',
    scheduleStatus: job?.scheduleStatus || '',
    scheduleDetail: job?.scheduleDetail || '',
    lastRunAt: latestRun?.finishedAt || latestRun?.startedAt || latestRun?.createdAt || null,
    lastRunStatus: latestRun?.status || null,
    lastRunIdHash: latestRun?.runId ? hashAgentFeedbackProofValue(latestRun.runId) : '',
    nextRunAt: job?.nextRunAt || null,
  }
}

export async function buildAgentFeedbackReminderReadiness({
  repoRoot = defaultRepoRoot,
  env = process.env,
  approvalConfig = null,
  includeCandidates = false,
  now = new Date(),
  syntheticProof = null,
  foundationJobs = null,
  getRosterSnapshot = getClickUpListSnapshotSafe,
} = {}) {
  const report = await buildAgentFeedbackReminderDryRunReport({ includeCandidates, now, getRosterSnapshot })
  const liveApprovalConfig = await loadAgentFeedbackReminderApprovalConfig({ repoRoot, env, approvalConfig })
  const liveGuard = evaluateAgentFeedbackReminderLiveGuard({ env, approvalConfig: liveApprovalConfig })
  const sendWindow = buildAgentFeedbackProductionSendWindow({ now })
  const jobRuntime = summarizeReminderJobRuntime(foundationJobs)
  const synthetic = syntheticProof || buildAgentFeedbackReminderSyntheticProof()
  const privacyLeak = hasPrivateProofLeak({ report, synthetic })
  const georgiaDay30 = report.georgiaDay30
  const chrisDay30 = report.chrisDay30 || null
  return {
    status: !privacyLeak &&
      synthetic.assertions.noReminderBeforeSuccessfulInitialRequest === true &&
      synthetic.assertions.completedSkippedBlockedStop === true &&
      synthetic.assertions.duplicateSlotProtected === true &&
      synthetic.assertions.capStopsAtSixOrThirtyDays === true &&
      synthetic.assertions.repairStateDoesNotResend === true &&
      liveGuard.canLiveSend === true
      ? 'healthy'
      : 'risk',
    cardId: liveGuard.canLiveSend ? AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID : AGENT_FEEDBACK_REMINDER_CARD_ID,
    closeoutKey: liveGuard.canLiveSend ? AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY : AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
    runtimeMode: liveGuard.canLiveSend ? 'production-live-reminders' : 'dry-run-report-only',
    report,
    sourceHealth: report.sourceHealth || null,
    liveGuard,
    sendWindow,
    jobRuntime,
    syntheticProof: synthetic,
    privacy: {
      metadataOnly: !privacyLeak,
      rawEmailLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
    summary: {
      mode: report.mode,
      candidatesInspected: report.scanner.candidateCount,
      tasksInspected: report.scanner.tasksInspected,
      pendingReminderCount: report.counts.pending,
      sentReminderCount: report.counts.sent,
      skippedReminderCount: report.counts.skipped,
      blockedReminderCount: report.counts.blocked,
      maxedOutReminderCount: report.counts.maxedOut,
      repairReminderCount: report.counts.repair,
      warningCount: report.counts.warning,
      nextReminderDueDates: report.nextReminderDueDates,
      georgiaDay30ReminderAction: georgiaDay30?.action || 'missing',
      georgiaDay30InitialRequestExists: Boolean(georgiaDay30?.initialRequest?.exists),
      georgiaDay30InitialRequestSuccessful: georgiaDay30?.initialRequest?.successfulRequested === true,
      georgiaDay30NextReminderDueAt: georgiaDay30?.nextReminderDueAt || '',
      chrisDay30ReminderAction: chrisDay30?.action || 'missing',
      chrisDay30InitialRequestExists: Boolean(chrisDay30?.initialRequest?.exists),
      chrisDay30InitialRequestSuccessful: chrisDay30?.initialRequest?.successfulRequested === true,
      chrisDay30NextReminderDueAt: chrisDay30?.nextReminderDueAt || '',
      noReminderBeforeInitialRequest: synthetic.assertions.noReminderBeforeSuccessfulInitialRequest === true,
      completedSkippedBlockedStop: synthetic.assertions.completedSkippedBlockedStop === true,
      duplicateSlotProtected: synthetic.assertions.duplicateSlotProtected === true,
      capStopsAtSixOrThirtyDays: synthetic.assertions.capStopsAtSixOrThirtyDays === true,
      liveRemindersEnabled: liveGuard.canLiveSend === true,
      enabledState: liveGuard.canLiveSend ? 'enabled' : 'fail_closed',
      failClosedReasons: liveGuard.canLiveSend ? [] : liveGuard.reasons,
      approvalSource: liveApprovalConfig.source || liveApprovalConfig.approvalRef || '',
      sendWindowOpen: sendWindow.canSendNow,
      sendWindowStart: sendWindow.start,
      sendWindowEnd: sendWindow.end,
      sendWindowTimezone: sendWindow.timezone,
      nextSendWindowOpensAt: sendWindow.nextWindowOpensAt,
      jobEnabled: jobRuntime.enabled,
      lastRunAt: jobRuntime.lastRunAt,
      lastRunStatus: jobRuntime.lastRunStatus,
      nextRunAt: jobRuntime.nextRunAt,
      dryRunOnly: report.sideEffects.gmailSent === false &&
        report.sideEffects.clickUpRequestedWritten === false &&
        report.sideEffects.reminderLedgerWritten === false,
      metadataOnly: !privacyLeak,
      sourceHealthStatus: report.sourceHealth?.status || 'healthy',
      sourceUnavailable: report.scanner?.sourceUnavailable === true,
    },
  }
}

async function readOptionalText(repoRoot, relativePath) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

async function readOptionalJson(repoRoot, relativePath) {
  const source = await readOptionalText(repoRoot, relativePath)
  if (!source) return null
  return JSON.parse(source)
}

function includesAll(source, phrases) {
  return phrases.every(phrase => source.includes(phrase))
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

export async function buildAgentFeedbackReminderStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  opsHub = null,
  readiness = null,
  syntheticProof = null,
} = {}) {
  const findings = []
  const status = readiness || foundationHub?.agentFeedbackReminders || await buildAgentFeedbackReminderReadiness({ includeCandidates: false, syntheticProof })
  const [
    packageSource,
    approvedPlan,
    approval,
    liveApprovedPlan,
    liveCardApproval,
    liveApproval,
    proofArtifact,
    liveProofArtifact,
    moduleSource,
    emailSource,
    dbSource,
    jobsSource,
    serverSource,
    foundationFrontendSource,
    opsUiSource,
    commandScript,
    processScript,
    verifierSource,
    currentPlan,
    currentState,
    buildLogSource,
  ] = await Promise.all([
    readOptionalText(repoRoot, 'package.json'),
    readOptionalText(repoRoot, AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_REMINDER_APPROVAL_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_LIVE_REMINDERS_APPROVED_PLAN_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_LIVE_REMINDERS_APPROVAL_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_LIVE_REMINDERS_LIVE_APPROVAL_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_REMINDER_PROOF_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_LIVE_REMINDERS_PROOF_PATH),
    readOptionalText(repoRoot, 'lib/agent-feedback-reminders.js'),
    readOptionalText(repoRoot, 'lib/agent-feedback-email.js'),
    readOptionalText(repoRoot, 'lib/foundation-db.js'),
    readOptionalText(repoRoot, 'lib/foundation-jobs.js'),
    readOptionalText(repoRoot, 'server.js'),
    Promise.all([
      readOptionalText(repoRoot, 'public/foundation.js'),
      readOptionalText(repoRoot, 'public/foundation-source-lifecycle-renderers.js'),
      readOptionalText(repoRoot, 'public/foundation-runtime-renderers.js'),
      readOptionalText(repoRoot, 'public/foundation-operations-renderers.js'),
    ]).then(parts => parts.join('\n')),
    readOptionalText(repoRoot, 'public/ops.js'),
    readOptionalText(repoRoot, 'scripts/agent-feedback-reminders.mjs'),
    readOptionalText(repoRoot, 'scripts/process-agent-feedback-reminder-cadence-check.mjs'),
    readOptionalText(repoRoot, 'scripts/foundation-verify.mjs'),
    readOptionalText(repoRoot, 'docs/rebuild/current-plan.md'),
    readOptionalText(repoRoot, 'docs/rebuild/current-state.md'),
    readFoundationBuildLogRegistrySource(repoRoot),
  ])
  const cards = foundationHub?.backlogItems || foundationHub?.backlog || []
  const reminderCard = cards.find(card => card.id === AGENT_FEEDBACK_REMINDER_CARD_ID) || null
  const liveReminderCard = cards.find(card => card.id === AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID) || null
  const georgiaSendCard = cards.find(card => card.id === 'AGENT-FEEDBACK-GEORGIA-SEND-001') || null
  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
    {
      backlogId: AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
      buildLogSource,
    },
  ) || findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
    {
      backlogId: AGENT_FEEDBACK_REMINDER_CARD_ID,
      buildLogSource,
    },
  )
  const opsJobs = opsHub?.foundationJobs?.jobs || []
  const hubReminderStatus = foundationHub?.agentFeedbackReminders || null
  const opsReminderStatus = opsHub?.agentFeedbackReminders || null
  const synthetic = status.syntheticProof || syntheticProof || buildAgentFeedbackReminderSyntheticProof()

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', AGENT_FEEDBACK_REMINDER_APPROVAL_PATH)
  addFinding(findings, Boolean(liveApprovedPlan), 'live reminders approved plan artifact exists', AGENT_FEEDBACK_LIVE_REMINDERS_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(liveCardApproval), 'live reminders card approval artifact exists', AGENT_FEEDBACK_LIVE_REMINDERS_APPROVAL_PATH)
  addFinding(findings, Boolean(liveApproval) && liveApproval.includes('"mode": "production-reminders"'), 'live reminders production approval artifact exists', AGENT_FEEDBACK_LIVE_REMINDERS_LIVE_APPROVAL_PATH)
  addFinding(findings, Boolean(proofArtifact), 'reminder proof artifact exists', AGENT_FEEDBACK_REMINDER_PROOF_PATH)
  addFinding(findings, Boolean(liveProofArtifact), 'live reminders proof artifact exists', AGENT_FEEDBACK_LIVE_REMINDERS_PROOF_PATH)
  addFinding(findings, packageSource.includes('"agent-feedback:reminders"') &&
    packageSource.includes('"process:agent-feedback-reminder-cadence-check"') &&
    packageSource.includes('"process:agent-feedback-live-reminders-check"'), 'package scripts exist', 'agent-feedback:reminders and live reminder process checks')
  addFinding(findings, Boolean(commandScript) && Boolean(processScript), 'command and process check scripts exist', 'scripts/agent-feedback-reminders.mjs')
  addFinding(findings, includesAll(moduleSource, [
    'AGENT_FEEDBACK_REMINDER_OFFSETS_DAYS',
    '[1, 3, 7, 10, 14, 17]',
    'AGENT_FEEDBACK_REMINDER_MAX_COUNT = 6',
    'AGENT_FEEDBACK_REMINDER_MAX_AGE_DAYS = 30',
    'AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID',
    'production-live-reminders',
    'buildAgentFeedbackProductionSendWindow',
    'no_successful_initial_request',
    'duplicateSlotProtected',
    'duplicate_reminder_slot_attempt_exists',
  ]), 'reminder module encodes schedule, caps, blockers, live guard, and duplicate slots', 'lib/agent-feedback-reminders.js')
  addFinding(findings, emailSource.includes('buildAgentFeedbackReminderEmail'), 'reminder email template exists and reuses private feedback link flow', 'buildAgentFeedbackReminderEmail')
  addFinding(findings, includesAll(dbSource, [
    'agent_onboarding_feedback_reminder_attempts',
    'idx_agent_feedback_reminder_slot_once',
    'listAgentFeedbackReminderAttemptsForMilestone',
    'getAgentOnboardingFeedbackResponseForMilestone',
  ]), 'reminder ledger table and read helpers exist', 'agent_onboarding_feedback_reminder_attempts')
  addFinding(findings, includesAll(jobsSource, [AGENT_FEEDBACK_REMINDER_JOB_KEY, 'agent-feedback:reminders', '--mode=live', "scheduleLocalTime: '08:30'", "scheduleTimezone: 'America/Toronto'", "servesHubs: ['ops']"]), 'Foundation job registry includes Ops-serving live reminder job', AGENT_FEEDBACK_REMINDER_JOB_KEY)
  addFinding(findings, includesAll(serverSource, ['buildAgentFeedbackReminderReadiness', 'agentFeedbackReminders']), 'Foundation and Ops APIs expose reminder readiness status', 'server.js')
  addFinding(findings, foundationFrontendSource.includes('renderAgentFeedbackReminderPanel') && foundationFrontendSource.includes('agentFeedbackReminders'), 'Runtime Health renders reminder counts', 'Foundation frontend bundle')
  addFinding(findings, opsUiSource.includes(AGENT_FEEDBACK_REMINDER_JOB_KEY) && opsUiSource.includes('live reminders'), 'Ops UI names live reminder job', 'public/ops.js')
  addFinding(findings, verifierSource.includes(AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID), 'foundation verifier covers live reminder card', AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID)
  addFinding(findings, buildLogSource.includes(AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY), 'build log closeout exists in source', AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY)
  addFinding(findings, status.status === 'healthy', 'reminder readiness status is healthy', status.status)
  addFinding(findings, status.summary?.noReminderBeforeInitialRequest === true, 'no reminder before successful initial request is proven', 'synthetic no_initial_request')
  addFinding(findings, status.summary?.completedSkippedBlockedStop === true, 'completed/skipped/blocked stop proof passes', 'synthetic stop states')
  addFinding(findings, status.summary?.duplicateSlotProtected === true, 'duplicate slot protection proof passes', 'clickup_task_id + milestone_day + reminder_slot_key')
  addFinding(findings, status.summary?.capStopsAtSixOrThirtyDays === true, 'reminder cap proof passes', '6 reminders or 30 days')
  addFinding(findings, status.summary?.liveRemindersEnabled === true, 'live reminders are enabled by approved guard', status.summary?.enabledState || 'missing')
  addFinding(findings, status.summary?.sendWindowStart === '08:30' && status.summary?.sendWindowEnd === '10:00' && status.summary?.sendWindowTimezone === 'America/Toronto', 'live reminders use the approved morning send window', `${status.summary?.sendWindowStart || ''}-${status.summary?.sendWindowEnd || ''} ${status.summary?.sendWindowTimezone || ''}`.trim())
  addFinding(findings, status.summary?.dryRunOnly === true, 'readiness report has no Gmail, ClickUp, or reminder ledger side effect', JSON.stringify(status.report?.sideEffects || {}))
  addFinding(findings, status.summary?.metadataOnly === true &&
    !hasPrivateProofLeak(proofArtifact) &&
    !hasPrivateProofLeak(liveProofArtifact) &&
    !hasPrivateProofLeak(status), 'reminder proof has no raw emails, token URLs, or feedback content', 'metadata-only')
  addFinding(findings, Number.isFinite(Number(status.summary?.pendingReminderCount)) &&
    Number.isFinite(Number(status.summary?.sentReminderCount)) &&
    Number.isFinite(Number(status.summary?.blockedReminderCount)) &&
    Number.isFinite(Number(status.summary?.skippedReminderCount)) &&
    Number.isFinite(Number(status.summary?.maxedOutReminderCount)) &&
    Number.isFinite(Number(status.summary?.repairReminderCount)), 'Runtime counts include pending, sent, blocked, skipped, maxed-out, and repair reminders', JSON.stringify(status.summary || {}))
  addFinding(findings, Array.isArray(status.summary?.nextReminderDueDates), 'next reminder due dates are exposed', JSON.stringify(status.summary?.nextReminderDueDates || []))
  addFinding(findings, hubReminderStatus?.summary?.liveRemindersEnabled === true, 'live Foundation Hub exposes live reminders', hubReminderStatus?.summary?.enabledState || 'missing')
  addFinding(findings, opsReminderStatus?.summary?.liveRemindersEnabled === true, 'live Ops Hub exposes live reminders', opsReminderStatus?.summary?.enabledState || 'missing')
  addFinding(findings, opsJobs.some(job => job.key === AGENT_FEEDBACK_REMINDER_JOB_KEY), 'Ops Hub lists live reminder job', AGENT_FEEDBACK_REMINDER_JOB_KEY)
  addFinding(findings, reminderCard?.lane === 'done' && /agent-feedback-reminder-cadence-v1/.test(reminderCard?.statusNote || ''), 'reminder cadence card remains done as readiness foundation', reminderCard?.lane || 'missing')
  addFinding(findings, liveReminderCard?.lane === 'done' && /agent-feedback-live-reminders-v1/.test(liveReminderCard?.statusNote || ''), 'live reminder card is done', liveReminderCard?.lane || 'missing')
  addFinding(findings, georgiaSendCard?.lane === 'scoped', 'Georgia live-send card remains scoped', georgiaSendCard?.lane || 'missing')
  addFinding(findings, closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID), 'closeout owns only live reminder card', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, !(closeout?.backlogIds || []).includes(AGENT_FEEDBACK_REMINDER_CARD_ID), 'reminder cadence card remains context-only, not owned by live reminder closeout', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, synthetic.assertions?.repairStateDoesNotResend === true, 'Gmail-success/ClickUp-Requested repair state does not resend blindly', 'synthetic repair')
  addFinding(
    findings,
    currentPlan.includes('AGENT-FEEDBACK-LIVE-REMINDERS-001` is done') &&
      (currentPlan.includes('systems visibility pass') ||
        currentPlan.includes('SYSTEM-REGISTRATION-SWEEP-001` is done')),
    'current plan records live reminders and follow-on systems visibility state',
    'current-plan',
  )
  addFinding(findings, currentState.includes('AGENT-FEEDBACK-LIVE-REMINDERS-001` is done') && currentState.includes('Live reminders are enabled'), 'current state records live reminder state', 'current-state')

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
    readiness: status,
    syntheticProof: synthetic,
    summary: {
      ...status.summary,
      reminderCardLane: reminderCard?.lane || '',
      liveReminderCardLane: liveReminderCard?.lane || '',
      georgiaSendCardLane: georgiaSendCard?.lane || '',
      closeoutOwnsOnlyLiveReminder: closeout?.backlogIds?.length === 1 &&
        closeout.backlogIds.includes(AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID),
    },
    findings,
  }
}
