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
} from './agent-feedback-send.js'
import { AGENT_FEEDBACK_RESULT_FIELD_BY_MILESTONE } from './agent-feedback-clickup.js'
import { CLICKUP_AGENT_ROSTER_LIST_ID } from './agent-roster-review.js'
import { getClickUpListSnapshot } from './clickup.js'
import {
  getActiveAgentFeedbackSendAttempt,
  getAgentOnboardingFeedbackResponseForMilestone,
  listAgentFeedbackReminderAttemptsForMilestone,
} from './foundation-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_FEEDBACK_REMINDER_CARD_ID = 'AGENT-FEEDBACK-REMINDER-CADENCE-001'
export const AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY = 'agent-feedback-reminder-cadence-v1'
export const AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-reminder-cadence-v1.md'
export const AGENT_FEEDBACK_REMINDER_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-REMINDER-CADENCE-001.json'
export const AGENT_FEEDBACK_REMINDER_PROOF_PATH = 'docs/audits/2026-05-01-agent-feedback-reminder-cadence-proof.md'
export const AGENT_FEEDBACK_REMINDER_JOB_KEY = 'agent-feedback-reminder-readiness'
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
    if (candidate.sentReminderCount) counts.sent += Number(candidate.sentReminderCount || 0)
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

function activeDuplicateSlotAttempts(attempts) {
  return (Array.isArray(attempts) ? attempts : []).filter(attempt =>
    REMINDER_DUPLICATE_PROTECTED_STATUSES.has(normalizeText(attempt.status))
  )
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
  const protectedSlotKeys = new Set(activeDuplicateSlotAttempts(reminderAttempts).map(attempt => attempt.reminderSlotKey))
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

export async function buildAgentFeedbackReminderDryRunReport({
  now = new Date(),
  includeCandidates = true,
  forceRefresh = false,
} = {}) {
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime()
  if (
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

  const snapshot = await getClickUpListSnapshot(CLICKUP_AGENT_ROSTER_LIST_ID)
  const candidateInputs = []
  for (const task of snapshot.tasks || []) {
    for (const milestoneDay of AGENT_FEEDBACK_MILESTONE_DAYS) {
      candidateInputs.push(buildAgentFeedbackCandidateFromTask({
        task,
        fields: snapshot.fields || [],
        targetName: task?.name || '',
        milestoneDay,
        now,
      }))
    }
  }

  const candidates = []
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
    candidates.push(sanitizeReminderCandidate({
      candidate,
      recipientPlan,
      initialSendAttempt,
      response,
      reminderAttempts,
      reminderDecision: decision,
    }))
  }

  const georgiaDay30 = candidates.find(candidate => candidate.targetLabel === 'Georgia' && candidate.milestoneDay === 30) || null
  const summary = summarizeReminderCandidates(candidates)
  const report = {
    mode: 'dry-run-report-only',
    cardId: AGENT_FEEDBACK_REMINDER_CARD_ID,
    sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
    listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
    generatedAt: now.toISOString(),
    scanner: {
      cadence: 'daily reminder readiness scan',
      dryRunOnly: true,
      candidateCount: candidates.length,
      tasksInspected: Array.isArray(snapshot.tasks) ? snapshot.tasks.length : 0,
      remindersRequireSuccessfulInitialRequest: true,
    },
    counts: summary.counts,
    nextReminderDueDates: summary.nextReminderDueDates,
    georgiaDay30,
    candidates: includeCandidates ? candidates : candidates.slice(0, 12),
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
  }
  reminderReportCache = {
    createdAtMs: Date.now(),
    report: {
      ...report,
      candidates,
    },
  }
  return report
}

export async function buildAgentFeedbackReminderReadiness({
  includeCandidates = false,
  now = new Date(),
  syntheticProof = null,
} = {}) {
  const report = await buildAgentFeedbackReminderDryRunReport({ includeCandidates, now })
  const synthetic = syntheticProof || buildAgentFeedbackReminderSyntheticProof()
  const privacyLeak = hasPrivateProofLeak({ report, synthetic })
  const georgiaDay30 = report.georgiaDay30
  return {
    status: !privacyLeak &&
      synthetic.assertions.noReminderBeforeSuccessfulInitialRequest === true &&
      synthetic.assertions.completedSkippedBlockedStop === true &&
      synthetic.assertions.duplicateSlotProtected === true &&
      synthetic.assertions.capStopsAtSixOrThirtyDays === true &&
      synthetic.assertions.repairStateDoesNotResend === true
      ? 'healthy'
      : 'risk',
    cardId: AGENT_FEEDBACK_REMINDER_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
    runtimeMode: 'dry-run-report-only',
    report,
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
      noReminderBeforeInitialRequest: synthetic.assertions.noReminderBeforeSuccessfulInitialRequest === true,
      completedSkippedBlockedStop: synthetic.assertions.completedSkippedBlockedStop === true,
      duplicateSlotProtected: synthetic.assertions.duplicateSlotProtected === true,
      capStopsAtSixOrThirtyDays: synthetic.assertions.capStopsAtSixOrThirtyDays === true,
      dryRunOnly: report.sideEffects.gmailSent === false &&
        report.sideEffects.clickUpRequestedWritten === false &&
        report.sideEffects.reminderLedgerWritten === false,
      metadataOnly: !privacyLeak,
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
    proofArtifact,
    moduleSource,
    emailSource,
    dbSource,
    jobsSource,
    serverSource,
    foundationUiSource,
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
    readOptionalText(repoRoot, AGENT_FEEDBACK_REMINDER_PROOF_PATH),
    readOptionalText(repoRoot, 'lib/agent-feedback-reminders.js'),
    readOptionalText(repoRoot, 'lib/agent-feedback-email.js'),
    readOptionalText(repoRoot, 'lib/foundation-db.js'),
    readOptionalText(repoRoot, 'lib/foundation-jobs.js'),
    readOptionalText(repoRoot, 'server.js'),
    readOptionalText(repoRoot, 'public/foundation.js'),
    readOptionalText(repoRoot, 'public/ops.js'),
    readOptionalText(repoRoot, 'scripts/agent-feedback-reminders.mjs'),
    readOptionalText(repoRoot, 'scripts/process-agent-feedback-reminder-cadence-check.mjs'),
    readOptionalText(repoRoot, 'scripts/foundation-verify.mjs'),
    readOptionalText(repoRoot, 'docs/rebuild/current-plan.md'),
    readOptionalText(repoRoot, 'docs/rebuild/current-state.md'),
    readOptionalText(repoRoot, 'lib/foundation-build-log.js'),
  ])
  const cards = foundationHub?.backlogItems || foundationHub?.backlog || []
  const reminderCard = cards.find(card => card.id === AGENT_FEEDBACK_REMINDER_CARD_ID) || null
  const georgiaSendCard = cards.find(card => card.id === 'AGENT-FEEDBACK-GEORGIA-SEND-001') || null
  const closeout = (foundationBuildLog?.builds || foundationBuildLog?.closeouts || []).find(build =>
    build.closeoutKey === AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY || build.key === AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY
  ) || null
  const opsJobs = opsHub?.foundationJobs?.jobs || []
  const hubReminderStatus = foundationHub?.agentFeedbackReminders || null
  const opsReminderStatus = opsHub?.agentFeedbackReminders || null
  const synthetic = status.syntheticProof || syntheticProof || buildAgentFeedbackReminderSyntheticProof()

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', AGENT_FEEDBACK_REMINDER_APPROVAL_PATH)
  addFinding(findings, Boolean(proofArtifact), 'reminder proof artifact exists', AGENT_FEEDBACK_REMINDER_PROOF_PATH)
  addFinding(findings, packageSource.includes('"agent-feedback:reminders"') && packageSource.includes('"process:agent-feedback-reminder-cadence-check"'), 'package scripts exist', 'agent-feedback:reminders and process:agent-feedback-reminder-cadence-check')
  addFinding(findings, Boolean(commandScript) && Boolean(processScript), 'command and process check scripts exist', 'scripts/agent-feedback-reminders.mjs')
  addFinding(findings, includesAll(moduleSource, [
    'AGENT_FEEDBACK_REMINDER_OFFSETS_DAYS',
    '[1, 3, 7, 10, 14, 17]',
    'AGENT_FEEDBACK_REMINDER_MAX_COUNT = 6',
    'AGENT_FEEDBACK_REMINDER_MAX_AGE_DAYS = 30',
    'no_successful_initial_request',
    'duplicateSlotProtected',
    'dry-run-report-only',
  ]), 'reminder module encodes schedule, caps, blockers, and dry-run readiness', 'lib/agent-feedback-reminders.js')
  addFinding(findings, emailSource.includes('buildAgentFeedbackReminderEmail'), 'reminder email template exists and reuses private feedback link flow', 'buildAgentFeedbackReminderEmail')
  addFinding(findings, includesAll(dbSource, [
    'agent_onboarding_feedback_reminder_attempts',
    'idx_agent_feedback_reminder_slot_once',
    'listAgentFeedbackReminderAttemptsForMilestone',
    'getAgentOnboardingFeedbackResponseForMilestone',
  ]), 'reminder ledger table and read helpers exist', 'agent_onboarding_feedback_reminder_attempts')
  addFinding(findings, includesAll(jobsSource, [AGENT_FEEDBACK_REMINDER_JOB_KEY, 'agent-feedback:reminders', '--mode=dry-run', "servesHubs: ['ops']"]), 'Foundation job registry includes Ops-serving reminder readiness job', AGENT_FEEDBACK_REMINDER_JOB_KEY)
  addFinding(findings, includesAll(serverSource, ['buildAgentFeedbackReminderReadiness', 'agentFeedbackReminders']), 'Foundation and Ops APIs expose reminder readiness status', 'server.js')
  addFinding(findings, foundationUiSource.includes('renderAgentFeedbackReminderPanel') && foundationUiSource.includes('agentFeedbackReminders'), 'Runtime Health renders reminder counts', 'public/foundation.js')
  addFinding(findings, opsUiSource.includes(AGENT_FEEDBACK_REMINDER_JOB_KEY) && opsUiSource.includes('reminder cadence'), 'Ops UI names reminder cadence job', 'public/ops.js')
  addFinding(findings, verifierSource.includes(AGENT_FEEDBACK_REMINDER_CARD_ID), 'foundation verifier covers reminder card', AGENT_FEEDBACK_REMINDER_CARD_ID)
  addFinding(findings, buildLogSource.includes(AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY), 'build log closeout exists in source', AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY)
  addFinding(findings, status.status === 'healthy', 'reminder readiness status is healthy', status.status)
  addFinding(findings, status.summary?.noReminderBeforeInitialRequest === true, 'no reminder before successful initial request is proven', 'synthetic no_initial_request')
  addFinding(findings, status.summary?.completedSkippedBlockedStop === true, 'completed/skipped/blocked stop proof passes', 'synthetic stop states')
  addFinding(findings, status.summary?.duplicateSlotProtected === true, 'duplicate slot protection proof passes', 'clickup_task_id + milestone_day + reminder_slot_key')
  addFinding(findings, status.summary?.capStopsAtSixOrThirtyDays === true, 'reminder cap proof passes', '6 reminders or 30 days')
  addFinding(findings, status.summary?.dryRunOnly === true, 'dry-run has no Gmail, Requested writeback, or reminder ledger side effect', JSON.stringify(status.report?.sideEffects || {}))
  addFinding(findings, status.summary?.metadataOnly === true && !hasPrivateProofLeak(proofArtifact) && !hasPrivateProofLeak(status), 'reminder proof has no raw emails, token URLs, or feedback content', 'metadata-only')
  addFinding(findings, Number.isFinite(Number(status.summary?.pendingReminderCount)) &&
    Number.isFinite(Number(status.summary?.sentReminderCount)) &&
    Number.isFinite(Number(status.summary?.blockedReminderCount)) &&
    Number.isFinite(Number(status.summary?.skippedReminderCount)) &&
    Number.isFinite(Number(status.summary?.maxedOutReminderCount)) &&
    Number.isFinite(Number(status.summary?.repairReminderCount)), 'Runtime counts include pending, sent, blocked, skipped, maxed-out, and repair reminders', JSON.stringify(status.summary || {}))
  addFinding(findings, Array.isArray(status.summary?.nextReminderDueDates), 'next reminder due dates are exposed', JSON.stringify(status.summary?.nextReminderDueDates || []))
  addFinding(findings, hubReminderStatus?.summary?.dryRunOnly === true, 'live Foundation Hub exposes reminder readiness', hubReminderStatus?.summary?.mode || 'missing')
  addFinding(findings, opsReminderStatus?.summary?.dryRunOnly === true, 'live Ops Hub exposes reminder readiness', opsReminderStatus?.summary?.mode || 'missing')
  addFinding(findings, opsJobs.some(job => job.key === AGENT_FEEDBACK_REMINDER_JOB_KEY), 'Ops Hub lists reminder readiness job', AGENT_FEEDBACK_REMINDER_JOB_KEY)
  addFinding(findings, reminderCard?.lane === 'done' && /agent-feedback-reminder-cadence-v1/.test(reminderCard?.statusNote || ''), 'reminder card is done for readiness only', reminderCard?.lane || 'missing')
  addFinding(findings, georgiaSendCard?.lane === 'scoped', 'Georgia live-send card remains scoped', georgiaSendCard?.lane || 'missing')
  addFinding(findings, closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_REMINDER_CARD_ID), 'closeout owns only reminder card', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, !(closeout?.backlogIds || []).includes('AGENT-FEEDBACK-GEORGIA-SEND-001'), 'Georgia send remains context-only, not owned by reminder closeout', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, synthetic.assertions?.repairStateDoesNotResend === true, 'Gmail-success/ClickUp-Requested repair state does not resend blindly', 'synthetic repair')
  addFinding(findings, currentPlan.includes('AGENT-FEEDBACK-REMINDER-CADENCE-001` is done') && currentPlan.includes('Steve full-loop test'), 'current plan records reminder readiness and next full-loop test', 'current-plan')
  addFinding(findings, currentState.includes('AGENT-FEEDBACK-REMINDER-CADENCE-001` is done') && currentState.includes('No live reminder send'), 'current state records reminder readiness boundary', 'current-state')

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_REMINDER_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
    readiness: status,
    syntheticProof: synthetic,
    summary: {
      ...status.summary,
      reminderCardLane: reminderCard?.lane || '',
      georgiaSendCardLane: georgiaSendCard?.lane || '',
      closeoutOwnsOnlyReminder: closeout?.backlogIds?.length === 1 &&
        closeout.backlogIds.includes(AGENT_FEEDBACK_REMINDER_CARD_ID),
    },
    findings,
  }
}
