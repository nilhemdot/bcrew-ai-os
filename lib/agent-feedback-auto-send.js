import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAgentFeedbackToken, hashAgentFeedbackToken } from './agent-feedback.js'
import { buildAgentFeedbackEmail } from './agent-feedback-email.js'
import {
  AGENT_FEEDBACK_MILESTONE_DAYS,
  AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE,
  AGENT_FEEDBACK_SEND_DEFAULT_TARGET,
  AGENT_FEEDBACK_SEND_SOURCE_ID,
  AGENT_FEEDBACK_SEND_WINDOW_DAYS,
  buildAgentFeedbackCandidateFromTask,
  buildAgentFeedbackEligibility,
  buildAgentFeedbackRecipientPlan,
  hashAgentFeedbackProofValue,
  normalizeAgentFeedbackText,
  resolveAgentFeedbackEmailConfig,
  resolveAgentFeedbackRawRecipients,
} from './agent-feedback-send.js'
import {
  buildAgentFeedbackRequestedWritebackPlan,
  markAgentFeedbackRequestedInClickUp,
} from './agent-feedback-clickup.js'
import { CLICKUP_AGENT_ROSTER_LIST_ID } from './agent-roster-review.js'
import { getClickUpListSnapshotSafe, isClickUpSnapshotDegraded } from './clickup.js'
import {
  createAgentFeedbackSendAttempt,
  getActiveAgentFeedbackSendAttempt,
  getAgentOnboardingFeedbackResponseForMilestone,
  updateAgentFeedbackSendAttemptStatus,
} from './foundation-db.js'
import { sendGmailMessage } from './google-delegated.js'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_FEEDBACK_AUTO_SEND_CARD_ID = 'AGENT-FEEDBACK-AUTO-SEND-001'
export const AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY = 'agent-feedback-auto-send-v1'
export const AGENT_FEEDBACK_AUTO_SEND_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-auto-send-v1.md'
export const AGENT_FEEDBACK_AUTO_SEND_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-AUTO-SEND-001.json'
export const AGENT_FEEDBACK_AUTO_SEND_READINESS_PROOF_PATH = 'docs/audits/2026-05-01-agent-feedback-auto-send-readiness.md'
export const AGENT_FEEDBACK_AUTO_SEND_JOB_KEY = 'agent-feedback-auto-send-readiness'
export const AGENT_FEEDBACK_AUTO_SEND_LIVE_APPROVAL_REF_ENV = 'AGENT_FEEDBACK_AUTO_SEND_APPROVAL_REF'
export const AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV = 'AGENT_FEEDBACK_AUTO_SEND_ENABLED'
export const AGENT_FEEDBACK_AUTO_SEND_MAX_PER_RUN_ENV = 'AGENT_FEEDBACK_AUTO_SEND_MAX_PER_RUN'
export const AGENT_FEEDBACK_AUTO_SEND_DEFAULT_LIVE_APPROVAL_PATH = 'docs/process/approvals/agent-feedback-auto-send-live-approval.json'
export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID = 'AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001'
export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY = 'agent-feedback-production-autosend-enable-v1'
export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001.json'
export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-production-autosend-enable-v1.md'
export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_PROOF_PATH = 'docs/audits/2026-05-01-agent-feedback-production-autosend-enable-proof.md'
export const AGENT_FEEDBACK_AUTO_SEND_WINDOW_START = '08:30'
export const AGENT_FEEDBACK_AUTO_SEND_WINDOW_END = '10:00'
export const AGENT_FEEDBACK_AUTO_SEND_WINDOW_TIMEZONE = 'America/Toronto'

const AUTO_SEND_MODE_DRY_RUN_ONLY = 'dry-run-only'
const AUTO_SEND_MODE_TEST_ONLY = 'test-only'
const AUTO_SEND_MODE_PRODUCTION_ALL = 'production-all'
const AUTO_SEND_MODES = new Set([
  AUTO_SEND_MODE_DRY_RUN_ONLY,
  AUTO_SEND_MODE_TEST_ONLY,
  AUTO_SEND_MODE_PRODUCTION_ALL,
])
const EXTERNAL_SIDE_EFFECTS_DISABLED = Object.freeze({
  gmailSent: false,
  clickUpRequestedWritten: false,
  rawEmailLogged: false,
  rawTokenLogged: false,
  feedbackContentLogged: false,
})
const EXTERNAL_SIDE_EFFECTS_LIVE_DEFAULT = Object.freeze({
  gmailSent: false,
  clickUpRequestedWritten: false,
  rawEmailLogged: false,
  rawTokenLogged: false,
  feedbackContentLogged: false,
})
const AUTO_SEND_REPORT_CACHE_MS = 5 * 60 * 1000
let autoSendReportCache = null

function buildSourceDegradedAutoSendCandidate(sourceHealth = null) {
  return {
    action: 'skipped',
    targetLabel: 'Georgia',
    sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
    sourceHealth,
    listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
    taskIdHash: hashAgentFeedbackProofValue('clickup-source-degraded'),
    agentNameHash: hashAgentFeedbackProofValue('Georgia'),
    milestoneDay: 30,
    dueStatus: 'blocked',
    dueDate: '',
    overdueDays: null,
    sendWindowDays: AGENT_FEEDBACK_SEND_WINDOW_DAYS,
    currentStatus: 'source_degraded',
    eligibility: {
      eligible: false,
      blockers: ['clickup_source_degraded'],
      contractLinkStatus: 'unknown',
    },
    dataQualityWarnings: ['clickup_source_degraded'],
    recipientPlan: {
      recipientRule: 'company_email',
      recipientSource: 'company_email',
      recipientCategory: 'company_email',
      recipientSourceField: {
        name: 'Company Email',
        nameHash: hashAgentFeedbackProofValue('Company Email'),
        present: false,
        valid: false,
      },
      toRole: 'Georgia',
      toAddressPresent: false,
      toAddressHashPresent: false,
      internalOversightMode: 'bcc',
      bccRolesApplied: ['Steve', 'Carson', 'Ryan', 'Georgia'],
      bccActualSendRoles: ['Steve', 'Carson', 'Ryan'],
      bccRecipientDedupedRoles: ['Georgia'],
      bccMissingConfiguredRoles: [],
    },
    duplicateProtection: {
      activeSendAttemptExists: false,
      activeSendAttemptStatus: '',
      uniqueKey: 'clickup_task_id + milestone_day',
      protectedStatuses: ['sending', 'sent', 'clickup_requested'],
      resendAllowed: false,
    },
    responseState: {
      completed: false,
      responseIdHash: '',
      submittedAt: '',
      feedbackContentLogged: false,
    },
    clickUpWritebackPlan: {
      milestoneDay: 30,
      statusField: 'Onboarding NPS 30 Status',
      requestedStatus: 'Requested',
      sequence: ['gmail_success_required', 'clickup_requested_writeback'],
      dryRunWritesRequested: false,
    },
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
  }
}

function normalizeText(value) {
  return normalizeAgentFeedbackText(value)
}

function normalizeMode(value) {
  const mode = normalizeText(value || AUTO_SEND_MODE_DRY_RUN_ONLY)
  return AUTO_SEND_MODES.has(mode) ? mode : AUTO_SEND_MODE_DRY_RUN_ONLY
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
  return `agent-feedback-production-autosend-${stamp.replace(/[-:.TZ]/g, '').slice(0, 14)}`
}

function parseWindowTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }
  return { hour, minute, minutes: hour * 60 + minute }
}

function localPartsForDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = Number(part.value)
    return acc
  }, {})
  if (parts.hour === 24) parts.hour = 0
  return parts
}

function zonedLocalTimeToUtc({ year, month, day, hour, minute, timeZone }) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const actual = localPartsForDate(new Date(guess), timeZone)
  const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second || 0, 0)
  return new Date(guess - (actualAsUtc - guess))
}

function addLocalDays({ year, month, day }, days) {
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0))
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

function nextWindowOpenAt(now, startTime, timeZone) {
  const parsed = parseWindowTime(startTime)
  if (!parsed) return null
  const date = now instanceof Date ? now : new Date(now)
  if (Number.isNaN(date.getTime())) return null
  let localDate = localPartsForDate(date, timeZone)
  let candidate = zonedLocalTimeToUtc({
    year: localDate.year,
    month: localDate.month,
    day: localDate.day,
    hour: parsed.hour,
    minute: parsed.minute,
    timeZone,
  })
  if (candidate.getTime() <= date.getTime()) {
    localDate = addLocalDays(localDate, 1)
    candidate = zonedLocalTimeToUtc({
      year: localDate.year,
      month: localDate.month,
      day: localDate.day,
      hour: parsed.hour,
      minute: parsed.minute,
      timeZone,
    })
  }
  return candidate
}

export function buildAgentFeedbackProductionSendWindow({ now = new Date() } = {}) {
  const date = now instanceof Date ? now : new Date(now)
  const timeZone = AGENT_FEEDBACK_AUTO_SEND_WINDOW_TIMEZONE
  const start = parseWindowTime(AGENT_FEEDBACK_AUTO_SEND_WINDOW_START)
  const end = parseWindowTime(AGENT_FEEDBACK_AUTO_SEND_WINDOW_END)
  const local = Number.isNaN(date.getTime()) ? null : localPartsForDate(date, timeZone)
  const localMinutes = local ? local.hour * 60 + local.minute : null
  const validWindow = Boolean(start && end && start.minutes < end.minutes)
  const canSendNow = validWindow && localMinutes >= start.minutes && localMinutes < end.minutes
  const nextOpenAt = nextWindowOpenAt(date, AGENT_FEEDBACK_AUTO_SEND_WINDOW_START, timeZone)
  return {
    canSendNow,
    reason: canSendNow ? '' : 'outside_approved_send_window',
    start: AGENT_FEEDBACK_AUTO_SEND_WINDOW_START,
    end: AGENT_FEEDBACK_AUTO_SEND_WINDOW_END,
    timezone: timeZone,
    localTime: local
      ? `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`
      : '',
    nextWindowOpensAt: nextOpenAt ? nextOpenAt.toISOString() : null,
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

function classifyCandidateAction(candidate, eligibility, activeSendAttempt, response = null) {
  const currentStatus = normalizeText(candidate?.currentStatus).toLowerCase()
  if (response || currentStatus === 'completed') return 'skipped'
  if (activeSendAttempt?.status === 'clickup_requested' || currentStatus === 'requested') return 'sent'
  if (eligibility?.eligible) return 'would_send'
  const blockers = new Set(eligibility?.blockers || [])
  if (activeSendAttempt?.status === 'sent') return 'repair'
  if (
    blockers.has('not_due') ||
    blockers.has('already_requested') ||
    blockers.has('already_closed') ||
    blockers.has('expired_send_window') ||
    blockers.has('duplicate_send_attempt_exists')
  ) {
    return 'skipped'
  }
  return 'blocked'
}

function summarizeCounts(candidates) {
  const counts = {
    wouldSend: 0,
    sent: 0,
    skipped: 0,
    blocked: 0,
    warning: 0,
    repair: 0,
  }
  for (const candidate of candidates) {
    if (candidate.action === 'would_send') counts.wouldSend += 1
    if (candidate.action === 'sent') counts.sent += 1
    if (candidate.action === 'skipped') counts.skipped += 1
    if (candidate.action === 'blocked') counts.blocked += 1
    if (candidate.action === 'repair') counts.repair += 1
    if ((candidate.dataQualityWarnings || []).length) counts.warning += 1
  }
  return counts
}

function sanitizeCandidate(candidate, eligibility, recipientPlan, activeSendAttempt, writebackPlan, response = null) {
  const action = classifyCandidateAction(candidate, eligibility, activeSendAttempt, response)
  return {
    action,
    targetLabel: roleSafeTargetLabel(candidate),
    sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
    listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
    taskIdHash: hashAgentFeedbackProofValue(candidate.taskId),
    agentNameHash: hashAgentFeedbackProofValue(candidate.taskName),
    milestoneDay: candidate.milestoneDay,
    dueStatus: eligibility.dueStatus,
    dueDate: candidate.dueDate,
    overdueDays: candidate.overdueDays,
    sendWindowDays: AGENT_FEEDBACK_SEND_WINDOW_DAYS,
    currentStatus: candidate.currentStatus || 'empty',
    eligibility: {
      eligible: Boolean(eligibility.eligible),
      blockers: eligibility.blockers || [],
      contractLinkStatus: eligibility.contractLinkStatus,
    },
    dataQualityWarnings: eligibility.dataQualityWarnings || [],
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
    duplicateProtection: {
      activeSendAttemptExists: Boolean(activeSendAttempt),
      activeSendAttemptStatus: activeSendAttempt?.status || '',
      uniqueKey: 'clickup_task_id + milestone_day',
      protectedStatuses: ['sending', 'sent', 'clickup_requested'],
      resendAllowed: !activeSendAttempt,
    },
    responseState: {
      completed: Boolean(response),
      responseIdHash: response ? hashAgentFeedbackProofValue(response.id) : '',
      submittedAt: response?.submittedAt || '',
      feedbackContentLogged: false,
    },
    clickUpWritebackPlan: {
      milestoneDay: candidate.milestoneDay,
      statusField: writebackPlan.statusField,
      requestedStatus: writebackPlan.requestedStatus,
      sequence: writebackPlan.sequence,
      dryRunWritesRequested: false,
    },
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
  }
}

function buildFastRecipientPlan(candidate, oversightReference = {}) {
  const appliedRoles = oversightReference.bccRolesApplied || ['Steve', 'Carson', 'Ryan', 'Georgia']
  const targetLabel = roleSafeTargetLabel(candidate)
  const dedupedRoles = appliedRoles.includes(targetLabel) ? [targetLabel] : []
  return {
    recipientRule: candidate.recipientRule,
    recipientSource: candidate.recipientSource,
    recipientCategory: candidate.recipientCategory,
    recipientSourceField: {
      name: candidate.recipientFieldName,
      nameHash: candidate.recipientFieldNameHash,
      present: candidate.recipientEmailPresent,
      valid: candidate.recipientEmailValid,
    },
    toRole: candidate.toRole,
    toAddressPresent: Boolean(candidate.recipientEmail),
    toAddressHash: hashAgentFeedbackProofValue(candidate.recipientEmail),
    internalOversightMode: 'bcc',
    bccRolesRequested: oversightReference.bccRolesRequested || ['Steve', 'Carson', 'Ryan', 'Georgia'],
    bccRolesApplied: appliedRoles,
    bccActualSendRoles: appliedRoles.filter(role => !dedupedRoles.includes(role)),
    bccRecipientDedupedRoles: dedupedRoles.filter(role => appliedRoles.includes(role)),
    bccMissingConfiguredRoles: oversightReference.bccMissingConfiguredRoles || [],
  }
}

function candidateMatchesAllowlist(candidate, allowlist = []) {
  return (Array.isArray(allowlist) ? allowlist : []).some(item => {
    const milestoneMatches = Number(item?.milestoneDay) === Number(candidate?.milestoneDay)
    const label = normalizeText(item?.targetName || item?.agentName).toLowerCase()
    const safeLabel = roleSafeTargetLabel(candidate).toLowerCase()
    const targetLabel = normalizeText(candidate?.targetLabel).toLowerCase()
    const targetName = normalizeText(candidate?.targetName).toLowerCase()
    const taskName = normalizeText(candidate?.taskName).toLowerCase()
    const labelMatches = label && (
      safeLabel === label ||
      targetLabel === label ||
      (targetLabel && label.includes(targetLabel)) ||
      targetName === label ||
      taskName === label ||
      taskName.includes(label)
    )
    const taskHashMatches = normalizeText(item?.taskIdHash) &&
      normalizeText(item.taskIdHash) === hashAgentFeedbackProofValue(candidate?.taskId)
    return milestoneMatches && (labelMatches || taskHashMatches)
  })
}

function validateApprovalConfig(config = {}, candidate = null) {
  const mode = normalizeMode(config.mode)
  const validApprovalHeader = mode === AUTO_SEND_MODE_DRY_RUN_ONLY ||
    (
      Number(config.approvalSchemaVersion || 0) >= 1 &&
      normalizeText(config.approvedBy) === 'Steve' &&
      !Number.isNaN(new Date(config.approvedAt).getTime())
    )
  const allowlist = Array.isArray(config.allowlist) ? config.allowlist : []
  const allowlistMatched = candidate ? candidateMatchesAllowlist(candidate, allowlist) : false
  const separateProductionApprovalPresent = Boolean(normalizeText(config.productionApprovalRef || config.separateProductionApprovalRef))
  const testOnlyValid = mode !== AUTO_SEND_MODE_TEST_ONLY || (validApprovalHeader && allowlist.length > 0)
  const productionAllValid = mode !== AUTO_SEND_MODE_PRODUCTION_ALL ||
    (validApprovalHeader && separateProductionApprovalPresent && config.productionAllApproved === true)
  return {
    mode,
    valid: validApprovalHeader && testOnlyValid && productionAllValid,
    validApprovalHeader,
    allowlistCount: allowlist.length,
    allowlistMatched,
    separateProductionApprovalPresent,
    productionAllApproved: config.productionAllApproved === true,
    reasons: [
      !validApprovalHeader ? 'approval_header_missing_or_invalid' : '',
      !testOnlyValid ? 'test_only_allowlist_missing' : '',
      !productionAllValid ? 'production_all_requires_separate_approval_artifact' : '',
    ].filter(Boolean),
  }
}

export async function loadAgentFeedbackAutoSendApprovalConfig({
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
  const approvalRef = normalizeText(env[AGENT_FEEDBACK_AUTO_SEND_LIVE_APPROVAL_REF_ENV] || AGENT_FEEDBACK_AUTO_SEND_DEFAULT_LIVE_APPROVAL_PATH)
  const loaded = await readOptionalJson(repoRoot, approvalRef)
  if (!loaded) {
    return {
      approvalSchemaVersion: 1,
      mode: AUTO_SEND_MODE_DRY_RUN_ONLY,
      approved: false,
      allowlist: [],
      source: 'default-dry-run-no-live-approval',
      approvalRef,
    }
  }
  return {
    ...loaded,
    source: approvalRef,
    approvalRef,
  }
}

export function evaluateAgentFeedbackAutoSendLiveGuard({
  env = process.env,
  approvalConfig = {},
  candidate = null,
} = {}) {
  const toggleEnabled = boolEnv(env[AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV])
  const validation = validateApprovalConfig(approvalConfig, candidate)
  const mode = validation.mode
  const canLiveSend = toggleEnabled &&
    validation.valid &&
    (
      (mode === AUTO_SEND_MODE_TEST_ONLY && validation.allowlistMatched) ||
      (mode === AUTO_SEND_MODE_PRODUCTION_ALL && validation.productionAllApproved)
    )
  const reasons = []
  if (!toggleEnabled) reasons.push('runtime_toggle_disabled')
  if (mode === AUTO_SEND_MODE_DRY_RUN_ONLY) reasons.push('approval_mode_dry_run_only')
  if (!validation.valid) reasons.push(...validation.reasons)
  if (mode === AUTO_SEND_MODE_TEST_ONLY && !validation.allowlistMatched) reasons.push('candidate_not_in_test_allowlist')
  if (mode === AUTO_SEND_MODE_PRODUCTION_ALL && !validation.productionAllApproved) {
    reasons.push('production_all_requires_separate_approval_artifact')
  }
  return {
    canLiveSend,
    decision: canLiveSend ? 'live_send_allowed' : 'report_only',
    twoKeyControl: {
      required: true,
      runtimeToggleEnv: AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV,
      runtimeToggleEnabled: toggleEnabled,
      approvedModeRequired: true,
      approvedMode: mode,
      approvalSource: approvalConfig.source || 'provided-config',
      allowlistCount: validation.allowlistCount,
      allowlistMatched: validation.allowlistMatched,
      productionAllRequiresSeparateApprovalArtifact: true,
      separateProductionApprovalPresent: validation.separateProductionApprovalPresent,
    },
    reasons: [...new Set(reasons)],
  }
}

export function buildAgentFeedbackAutoSendGuardMatrix(candidate) {
  const targetName = roleSafeTargetLabel(candidate) !== 'candidate'
    ? roleSafeTargetLabel(candidate)
    : normalizeText(candidate?.targetName || candidate?.taskName || 'Synthetic Agent')
  const milestoneDay = Number(candidate?.milestoneDay || AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE)
  const testOnlyApproval = {
    approvalSchemaVersion: 1,
    approvedBy: 'Steve',
    approvedAt: '2026-05-01T00:00:00.000Z',
    mode: AUTO_SEND_MODE_TEST_ONLY,
    allowlist: [{ targetName, milestoneDay }],
    source: 'synthetic-test-only-allowlist',
  }
  const productionAllApprovalWithoutSeparateArtifact = {
    approvalSchemaVersion: 1,
    approvedBy: 'Steve',
    approvedAt: '2026-05-01T00:00:00.000Z',
    mode: AUTO_SEND_MODE_PRODUCTION_ALL,
    productionAllApproved: false,
    source: 'synthetic-production-all-without-separate-approval',
  }
  return {
    defaultDryRunCannotSend: evaluateAgentFeedbackAutoSendLiveGuard({
      env: {},
      approvalConfig: { mode: AUTO_SEND_MODE_DRY_RUN_ONLY, source: 'default' },
      candidate,
    }),
    toggleAloneCannotSend: evaluateAgentFeedbackAutoSendLiveGuard({
      env: { [AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV]: 'true' },
      approvalConfig: { mode: AUTO_SEND_MODE_DRY_RUN_ONLY, source: 'toggle-only' },
      candidate,
    }),
    allowlistAloneCannotSend: evaluateAgentFeedbackAutoSendLiveGuard({
      env: {},
      approvalConfig: testOnlyApproval,
      candidate,
    }),
    bothToggleAndAllowlistWouldPermitTestOnly: evaluateAgentFeedbackAutoSendLiveGuard({
      env: { [AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV]: 'true' },
      approvalConfig: testOnlyApproval,
      candidate,
    }),
    productionAllWithoutSeparateApprovalCannotSend: evaluateAgentFeedbackAutoSendLiveGuard({
      env: { [AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV]: 'true' },
      approvalConfig: productionAllApprovalWithoutSeparateArtifact,
      candidate,
    }),
  }
}

async function mapWithConcurrency(items = [], limit = 20, mapper = async item => item) {
  const normalizedLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : 20
  const results = new Array(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(normalizedLimit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  })
  await Promise.all(workers)
  return results
}

export async function buildAgentFeedbackAutoSendDryRunReport({
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
    autoSendReportCache &&
    Number.isFinite(nowTime) &&
    nowTime - autoSendReportCache.createdAtMs < AUTO_SEND_REPORT_CACHE_MS
  ) {
    return {
      ...autoSendReportCache.report,
      candidates: includeCandidates
        ? autoSendReportCache.report.candidates
        : autoSendReportCache.report.candidates.slice(0, 12),
    }
  }

  const rosterSnapshot = snapshot || await getRosterSnapshot(CLICKUP_AGENT_ROSTER_LIST_ID, { listName: 'Agent Roster' })
  const sourceDegraded = isClickUpSnapshotDegraded(rosterSnapshot)
  if (sourceDegraded) {
    const sourceHealth = rosterSnapshot.sourceHealth || null
    const degradedCandidate = buildSourceDegradedAutoSendCandidate(sourceHealth)
    const candidates = [degradedCandidate]
    const counts = summarizeCounts(candidates)
    const report = {
      mode: 'dry-run-report-only',
      sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
      listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
      generatedAt: now.toISOString(),
      sourceHealth,
      scanner: {
        cadence: 'daily scheduled scan',
        milestones: AGENT_FEEDBACK_MILESTONE_DAYS,
        candidateCount: candidates.length,
        tasksInspected: 0,
        dryRunOnly: true,
        sourceUnavailable: true,
      },
      counts,
      georgiaDay30: degradedCandidate,
      candidates: includeCandidates ? candidates : candidates.slice(0, 12),
      sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
    }
    if (useDefaultSnapshot) {
      autoSendReportCache = {
        createdAtMs: Date.now(),
        report: {
          ...report,
          candidates,
        },
      }
    }
    return report
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

  const georgiaInput = candidateInputs.find(candidate => isGeorgiaDay30(candidate)) || candidateInputs[0] || null
  const oversightReference = georgiaInput
    ? await buildAgentFeedbackRecipientPlan(georgiaInput)
    : {
        bccRolesRequested: ['Steve', 'Carson', 'Ryan', 'Georgia'],
        bccRolesApplied: [],
        bccMissingConfiguredRoles: ['Steve', 'Carson', 'Ryan', 'Georgia'],
      }

  const candidates = await mapWithConcurrency(candidateInputs, 20, async candidate => {
    const recipientPlan = isGeorgiaDay30(candidate)
      ? oversightReference
      : buildFastRecipientPlan(candidate, oversightReference)
    const [activeSendAttempt, response, writebackPlan] = await Promise.all([
        getActiveAgentFeedbackSendAttempt({
          taskId: candidate.taskId,
          milestoneDay: candidate.milestoneDay,
        }),
        getAgentOnboardingFeedbackResponseForMilestone({
          taskId: candidate.taskId,
          milestoneDay: candidate.milestoneDay,
        }),
        buildAgentFeedbackRequestedWritebackPlan({ milestoneDay: candidate.milestoneDay }),
      ])
    const eligibility = buildAgentFeedbackEligibility(candidate, activeSendAttempt, recipientPlan)
    return sanitizeCandidate(candidate, eligibility, recipientPlan, activeSendAttempt, writebackPlan, response)
  })

  const georgiaDay30 = candidates.find(candidate => candidate.targetLabel === 'Georgia' && candidate.milestoneDay === 30) || null
  const counts = summarizeCounts(candidates)
  const report = {
    mode: 'dry-run-report-only',
      sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
      listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
      generatedAt: now.toISOString(),
      sourceHealth: rosterSnapshot.sourceHealth || null,
      scanner: {
        cadence: 'daily scheduled scan',
        milestones: AGENT_FEEDBACK_MILESTONE_DAYS,
        candidateCount: candidates.length,
        tasksInspected: Array.isArray(rosterSnapshot.tasks) ? rosterSnapshot.tasks.length : 0,
        dryRunOnly: true,
      },
    counts,
    georgiaDay30,
    candidates: includeCandidates ? candidates : candidates.slice(0, 12),
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
  }
  if (useDefaultSnapshot) {
    autoSendReportCache = {
      createdAtMs: Date.now(),
      report: {
        ...report,
        candidates,
      },
    }
  }
  return report
}

async function buildProductionAutoSendCandidatePlans({ now = new Date() } = {}) {
  const snapshot = await getClickUpListSnapshotSafe(CLICKUP_AGENT_ROSTER_LIST_ID, { listName: 'Agent Roster' })
  if (isClickUpSnapshotDegraded(snapshot)) {
    return {
      source: {
        sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
        listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
        tasksInspected: 0,
        milestones: AGENT_FEEDBACK_MILESTONE_DAYS,
        sourceHealth: snapshot.sourceHealth || null,
      },
      plans: [],
    }
  }
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

  const plans = []
  for (const candidate of candidateInputs) {
    const [recipientPlan, activeSendAttempt, response, writebackPlan] = await Promise.all([
      buildAgentFeedbackRecipientPlan(candidate),
      getActiveAgentFeedbackSendAttempt({
        taskId: candidate.taskId,
        milestoneDay: candidate.milestoneDay,
      }),
      getAgentOnboardingFeedbackResponseForMilestone({
        taskId: candidate.taskId,
        milestoneDay: candidate.milestoneDay,
      }),
      buildAgentFeedbackRequestedWritebackPlan({ milestoneDay: candidate.milestoneDay }),
    ])
    const eligibility = buildAgentFeedbackEligibility(candidate, activeSendAttempt, recipientPlan)
    plans.push({
      candidate,
      recipientPlan,
      activeSendAttempt,
      response,
      writebackPlan,
      eligibility,
      sanitized: sanitizeCandidate(candidate, eligibility, recipientPlan, activeSendAttempt, writebackPlan, response),
    })
  }

  return {
    source: {
      sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
      listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
      tasksInspected: Array.isArray(snapshot.tasks) ? snapshot.tasks.length : 0,
      milestones: AGENT_FEEDBACK_MILESTONE_DAYS,
    },
    plans,
  }
}

function buildNoSideEffectLiveResult(extra = {}) {
  return {
    ...extra,
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_LIVE_DEFAULT },
  }
}

async function sendProductionAutoSendCandidate({
  candidate,
  recipientPlan,
  runId,
  approvalSource,
  maxSends,
  now = new Date(),
} = {}) {
  const stableTokenIssuedAtMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const token = createAgentFeedbackToken({
    taskId: candidate.taskId,
    agentName: candidate.taskName,
    milestoneDay: candidate.milestoneDay,
  }, Number.isFinite(stableTokenIssuedAtMs) ? stableTokenIssuedAtMs : Date.now())
  const tokenHash = hashAgentFeedbackToken(token)
  const emailConfig = resolveAgentFeedbackEmailConfig()
  const { to, bcc } = await resolveAgentFeedbackRawRecipients(candidate)
  const attempt = await createAgentFeedbackSendAttempt({
    taskId: candidate.taskId,
    agentName: candidate.taskName,
    milestoneDay: candidate.milestoneDay,
    tokenHash,
    metadata: {
      cardId: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
      closeoutKey: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
      runId,
      productionAutoSend: true,
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
    },
  })

  let gmail = null
  let gmailSendSucceeded = false
  try {
    const email = buildAgentFeedbackEmail({
      agentName: candidate.taskName,
      milestoneDay: candidate.milestoneDay,
      feedbackUrl: buildPublicFeedbackUrl(token),
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
    await updateAgentFeedbackSendAttemptStatus(attempt.id, {
      status: 'sent',
      gmailMessageId: gmail.id || '',
      gmailThreadId: gmail.threadId || '',
      metadata: {
        gmailSendSucceeded: true,
        rawEmailsLogged: false,
        rawTokenLogged: false,
        feedbackContentLogged: false,
      },
    })
    await markAgentFeedbackRequestedInClickUp({
      taskId: candidate.taskId,
      milestoneDay: candidate.milestoneDay,
    })
    await updateAgentFeedbackSendAttemptStatus(attempt.id, {
      status: 'clickup_requested',
      gmailMessageId: gmail.id || '',
      gmailThreadId: gmail.threadId || '',
      metadata: {
        clickUpRequestedWritten: true,
        repairState: 'none',
        resendAllowed: false,
      },
    })
    return {
      action: 'sent',
      attemptedSend: true,
      tokenHash: tokenHash.slice(0, 16),
      attemptIdHash: hashAgentFeedbackProofValue(attempt.id),
      gmailMessageIdHash: hashAgentFeedbackProofValue(gmail.id || ''),
      gmailThreadIdHash: hashAgentFeedbackProofValue(gmail.threadId || ''),
      repairState: 'none',
      sideEffects: {
        gmailSent: true,
        clickUpRequestedWritten: true,
        rawEmailLogged: false,
        rawTokenLogged: false,
        feedbackContentLogged: false,
      },
    }
  } catch (error) {
    if (gmailSendSucceeded) {
      await updateAgentFeedbackSendAttemptStatus(attempt.id, {
        status: 'sent',
        gmailMessageId: gmail?.id || '',
        gmailThreadId: gmail?.threadId || '',
        metadata: {
          gmailSendSucceeded: true,
          clickUpRequestedWritten: false,
          repairState: 'clickup_requested_writeback_failed',
          resendAllowed: false,
          errorClass: error instanceof Error ? error.name : 'Error',
        },
      })
      return {
        action: 'repair',
        attemptedSend: true,
        tokenHash: tokenHash.slice(0, 16),
        attemptIdHash: hashAgentFeedbackProofValue(attempt.id),
        gmailMessageIdHash: hashAgentFeedbackProofValue(gmail?.id || ''),
        gmailThreadIdHash: hashAgentFeedbackProofValue(gmail?.threadId || ''),
        repairState: 'clickup_requested_writeback_failed',
        errorClass: error instanceof Error ? error.name : 'Error',
        sideEffects: {
          gmailSent: true,
          clickUpRequestedWritten: false,
          rawEmailLogged: false,
          rawTokenLogged: false,
          feedbackContentLogged: false,
        },
      }
    }
    await updateAgentFeedbackSendAttemptStatus(attempt.id, {
      status: 'failed',
      metadata: {
        gmailSendSucceeded: false,
        clickUpRequestedWritten: false,
        resendAllowed: true,
        errorClass: error instanceof Error ? error.name : 'Error',
      },
    })
    return {
      action: 'blocked',
      attemptedSend: true,
      tokenHash: tokenHash.slice(0, 16),
      attemptIdHash: hashAgentFeedbackProofValue(attempt.id),
      repairState: 'gmail_send_failed_before_clickup_requested',
      errorClass: error instanceof Error ? error.name : 'Error',
      sideEffects: {
        gmailSent: false,
        clickUpRequestedWritten: false,
        rawEmailLogged: false,
        rawTokenLogged: false,
        feedbackContentLogged: false,
      },
    }
  }
}

function summarizeLiveRunCandidates(candidates = []) {
  const base = summarizeCounts(candidates)
  const failedSendCount = candidates.filter(candidate =>
    candidate.liveResult?.attemptedSend === true &&
      candidate.liveResult?.action === 'blocked'
  ).length
  return {
    ...base,
    failedSendCount,
    totalCandidates: candidates.length,
    metadataOnly: true,
  }
}

export async function runAgentFeedbackProductionAutoSend({
  repoRoot = defaultRepoRoot,
  env = process.env,
  approvalConfig = null,
  includeCandidates = true,
  now = new Date(),
  maxSends = null,
} = {}) {
  const nowDate = now instanceof Date ? now : new Date(now)
  const runId = runIdForNow(nowDate)
  const liveApprovalConfig = await loadAgentFeedbackAutoSendApprovalConfig({ repoRoot, env, approvalConfig })
  const liveGuard = evaluateAgentFeedbackAutoSendLiveGuard({
    env,
    approvalConfig: liveApprovalConfig,
  })
  const sendWindow = buildAgentFeedbackProductionSendWindow({ now: nowDate })
  const canAttemptLiveSend = liveGuard.canLiveSend && sendWindow.canSendNow
  const configuredMaxSends = positiveInteger(
    maxSends ?? env[AGENT_FEEDBACK_AUTO_SEND_MAX_PER_RUN_ENV],
    25,
  )
  const { source, plans } = await buildProductionAutoSendCandidatePlans({ now: nowDate })
  const candidates = []
  let sentThisRun = 0

  for (const plan of plans) {
    const base = {
      ...plan.sanitized,
      productionRun: {
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
        liveResult: buildNoSideEffectLiveResult({
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

    if (plan.response) {
      candidates.push({
        ...base,
        action: 'skipped',
        liveResult: buildNoSideEffectLiveResult({
          action: 'skipped',
          attemptedSend: false,
          skipReason: 'feedback_already_completed',
        }),
      })
      continue
    }

    if (!plan.eligibility.eligible) {
      candidates.push({
        ...base,
        liveResult: buildNoSideEffectLiveResult({
          action: base.action,
          attemptedSend: false,
          blockers: plan.eligibility.blockers,
        }),
      })
      continue
    }

    if (sentThisRun >= configuredMaxSends) {
      candidates.push({
        ...base,
        action: 'blocked',
        liveResult: buildNoSideEffectLiveResult({
          action: 'blocked',
          attemptedSend: false,
          blockers: ['max_sends_per_run_reached'],
        }),
      })
      continue
    }

    const liveResult = await sendProductionAutoSendCandidate({
      candidate: plan.candidate,
      recipientPlan: plan.recipientPlan,
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

  const summary = summarizeLiveRunCandidates(candidates)
  const failClosed = !canAttemptLiveSend
  const ok = !failClosed && summary.failedSendCount === 0
  return {
    ok,
    status: ok ? 'healthy' : 'risk',
    cardId: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
    mode: failClosed ? 'production-live-fail-closed' : 'production-live-send',
    runId,
    generatedAt: nowDate.toISOString(),
    source,
    liveGuard,
    productionEnablement: {
      enabled: liveGuard.canLiveSend,
      canSendNow: canAttemptLiveSend,
      envToggle: boolEnv(env[AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV]),
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
    summary,
    candidates: includeCandidates ? candidates : candidates.slice(0, 12),
    privacy: {
      metadataOnly: !hasPrivateProofLeak(candidates),
      rawEmailLogged: false,
      tokenUrlLogged: false,
      feedbackContentLogged: false,
    },
  }
}

function summarizeAutoSendJobRuntime(foundationJobs = null) {
  const jobs = Array.isArray(foundationJobs?.jobs) ? foundationJobs.jobs : []
  const latestRuns = Array.isArray(foundationJobs?.latestRuns) ? foundationJobs.latestRuns : []
  const job = jobs.find(item => item.key === AGENT_FEEDBACK_AUTO_SEND_JOB_KEY) || null
  const latestRun = job?.latestRun || latestRuns.find(run => run.jobKey === AGENT_FEEDBACK_AUTO_SEND_JOB_KEY) || null
  return {
    jobKey: AGENT_FEEDBACK_AUTO_SEND_JOB_KEY,
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

export async function buildAgentFeedbackAutoSendReadiness({
  repoRoot = defaultRepoRoot,
  env = process.env,
  approvalConfig = null,
  includeCandidates = false,
  now = new Date(),
  foundationJobs = null,
  getRosterSnapshot = getClickUpListSnapshotSafe,
} = {}) {
  const report = await buildAgentFeedbackAutoSendDryRunReport({ now, includeCandidates, getRosterSnapshot })
  const georgiaDay30 = report.georgiaDay30
  const liveApprovalConfig = await loadAgentFeedbackAutoSendApprovalConfig({ repoRoot, env, approvalConfig })
  const liveGuard = evaluateAgentFeedbackAutoSendLiveGuard({
    env,
    approvalConfig: liveApprovalConfig,
    candidate: georgiaDay30,
  })
  const guardMatrix = buildAgentFeedbackAutoSendGuardMatrix(georgiaDay30)
  const privacyLeak = hasPrivateProofLeak({ report, liveGuard })
  const jobRuntime = summarizeAutoSendJobRuntime(foundationJobs)
  const sendWindow = buildAgentFeedbackProductionSendWindow({ now })
  const liveGuardHealthy = liveGuard.decision === 'report_only' || liveGuard.decision === 'live_send_allowed'

  return {
    status: liveGuardHealthy && !privacyLeak
      ? 'healthy'
      : 'risk',
    cardId: AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
    runtimeMode: liveGuard.canLiveSend ? 'production-live-send' : 'dry-run-report-only',
    liveSendDefault: liveGuard.canLiveSend ? 'enabled-by-approved-production-guard' : 'disabled',
    report,
    sourceHealth: report.sourceHealth || null,
    liveGuard,
    sendWindow,
    guardMatrix,
    jobRuntime,
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
      wouldSendCount: report.counts.wouldSend,
      sentCount: report.counts.sent,
      skippedCount: report.counts.skipped,
      blockedCount: report.counts.blocked,
      warningCount: report.counts.warning,
      repairCount: report.counts.repair,
      georgiaDay30Action: georgiaDay30?.action || 'missing',
      georgiaDay30Eligible: Boolean(georgiaDay30?.eligibility?.eligible),
      georgiaDay30RecipientSource: georgiaDay30?.recipientPlan?.recipientSource || '',
      georgiaDay30BccRolesApplied: georgiaDay30?.recipientPlan?.bccRolesApplied || [],
      productionAutoSendEnabled: liveGuard.canLiveSend === true,
      enabledState: liveGuard.canLiveSend ? 'enabled' : 'fail_closed',
      failClosedReasons: liveGuard.canLiveSend ? [] : liveGuard.reasons,
      approvalSource: liveApprovalConfig.source || liveApprovalConfig.approvalRef || '',
      sendWindowOpen: sendWindow.canSendNow,
      sendWindowStart: sendWindow.start,
      sendWindowEnd: sendWindow.end,
      sendWindowTimezone: sendWindow.timezone,
      nextSendWindowOpensAt: sendWindow.nextWindowOpensAt,
      defaultCannotSend: guardMatrix.defaultDryRunCannotSend.canLiveSend === false,
      toggleAloneCannotSend: guardMatrix.toggleAloneCannotSend.canLiveSend === false,
      allowlistAloneCannotSend: guardMatrix.allowlistAloneCannotSend.canLiveSend === false,
      bothKeysRequired: guardMatrix.bothToggleAndAllowlistWouldPermitTestOnly.canLiveSend === true,
      productionAllRequiresSeparateApproval: guardMatrix.productionAllWithoutSeparateApprovalCannotSend.canLiveSend === false,
      liveGuardDecision: liveGuard.decision,
      jobEnabled: jobRuntime.enabled,
      lastRunAt: jobRuntime.lastRunAt,
      lastRunStatus: jobRuntime.lastRunStatus,
      nextRunAt: jobRuntime.nextRunAt,
      metadataOnly: !privacyLeak,
      sourceHealthStatus: report.sourceHealth?.status || 'healthy',
      sourceUnavailable: report.scanner?.sourceUnavailable === true,
    },
  }
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

function includesAll(source, phrases) {
  return phrases.every(phrase => source.includes(phrase))
}

export async function buildAgentFeedbackAutoSendStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  opsHub = null,
  readiness = null,
} = {}) {
  const findings = []
  const status = readiness || foundationHub?.agentFeedbackAutoSend || await buildAgentFeedbackAutoSendReadiness({ repoRoot, includeCandidates: false })
  const [
    packageSource,
    approvedPlan,
    approval,
    readinessProof,
    autoSendSource,
    sendSource,
    jobsSource,
    serverSource,
    foundationVerifySource,
    currentPlan,
    currentState,
    buildLogSource,
  ] = await Promise.all([
    readOptionalText(repoRoot, 'package.json'),
    readOptionalText(repoRoot, AGENT_FEEDBACK_AUTO_SEND_APPROVED_PLAN_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_AUTO_SEND_APPROVAL_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_AUTO_SEND_READINESS_PROOF_PATH),
    readOptionalText(repoRoot, 'lib/agent-feedback-auto-send.js'),
    readOptionalText(repoRoot, 'lib/agent-feedback-send.js'),
    readOptionalText(repoRoot, 'lib/foundation-jobs.js'),
    readOptionalText(repoRoot, 'server.js'),
    readOptionalText(repoRoot, 'scripts/foundation-verify.mjs'),
    readOptionalText(repoRoot, 'docs/rebuild/current-plan.md'),
    readOptionalText(repoRoot, 'docs/rebuild/current-state.md'),
    readFoundationBuildLogRegistrySource(repoRoot),
  ])
  const cards = foundationHub?.backlogItems || []
  const autoSendCard = cards.find(card => card.id === AGENT_FEEDBACK_AUTO_SEND_CARD_ID) || null
  const georgiaSendCard = cards.find(card => card.id === 'AGENT-FEEDBACK-GEORGIA-SEND-001') || null
  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
    { backlogId: AGENT_FEEDBACK_AUTO_SEND_CARD_ID },
  )
  const hubStatus = foundationHub?.agentFeedbackAutoSend || null
  const opsStatus = opsHub?.agentFeedbackAutoSend || null
  const opsJobs = opsHub?.foundationJobs?.jobs || []

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', AGENT_FEEDBACK_AUTO_SEND_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', AGENT_FEEDBACK_AUTO_SEND_APPROVAL_PATH)
  addFinding(findings, Boolean(readinessProof), 'readiness proof artifact exists', AGENT_FEEDBACK_AUTO_SEND_READINESS_PROOF_PATH)
  addFinding(findings, packageSource.includes('"agent-feedback:auto-send"') && packageSource.includes('"process:agent-feedback-auto-send-check"'), 'package scripts exist', 'agent-feedback:auto-send and process:agent-feedback-auto-send-check')
  addFinding(findings, includesAll(autoSendSource, [
    AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV,
    AGENT_FEEDBACK_AUTO_SEND_LIVE_APPROVAL_REF_ENV,
    'defaultDryRunCannotSend',
    'toggleAloneCannotSend',
    'allowlistAloneCannotSend',
    'productionAllWithoutSeparateApprovalCannotSend',
    'dry-run-report-only',
    'would_send',
  ]), 'auto-send module includes dry-run scanner and two-key controls', 'lib/agent-feedback-auto-send.js')
  addFinding(findings, includesAll(sendSource, ['repairState', 'clickup_requested_writeback_failed', 'resendAllowed: false']), 'Gmail-before-Requested repair state prevents resend after writeback failure', 'lib/agent-feedback-send.js')
  addFinding(findings, includesAll(jobsSource, [AGENT_FEEDBACK_AUTO_SEND_JOB_KEY, 'agent-feedback:auto-send', '--mode=live', "servesHubs: ['ops']"]), 'Foundation job registry includes Ops-serving production auto-send job', AGENT_FEEDBACK_AUTO_SEND_JOB_KEY)
  addFinding(findings, includesAll(serverSource, ['buildAgentFeedbackAutoSendReadiness', 'agentFeedbackAutoSend']), 'Foundation and Ops APIs expose auto-send readiness status', 'server.js')
  addFinding(findings, foundationVerifySource.includes(AGENT_FEEDBACK_AUTO_SEND_CARD_ID), 'foundation verifier covers auto-send card', AGENT_FEEDBACK_AUTO_SEND_CARD_ID)
  addFinding(findings, buildLogSource.includes(AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY), 'build log closeout exists in source', AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY)
  addFinding(findings, status.status === 'healthy', 'auto-send runtime status is healthy', status.status)
  addFinding(findings, ['would_send', 'sent', 'repair', 'skipped'].includes(status.summary?.georgiaDay30Action), 'Georgia Day-30 has a governed production action', status.summary?.georgiaDay30Action || 'missing')
  addFinding(findings, status.summary?.defaultCannotSend === true, 'default mode cannot send', 'default dry-run/report-only')
  addFinding(findings, status.summary?.toggleAloneCannotSend === true, 'runtime toggle alone cannot send', AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV)
  addFinding(findings, status.summary?.allowlistAloneCannotSend === true, 'allowlist alone cannot send', 'test-only allowlist without runtime toggle')
  addFinding(findings, status.summary?.bothKeysRequired === true, 'both toggle and approved allowlist are required for test-only live send', 'synthetic guard only, no send executed')
  addFinding(findings, status.summary?.productionAllRequiresSeparateApproval === true, 'production-all requires separate approval artifact', 'production-all no separate approval cannot send')
  addFinding(findings, ['report_only', 'live_send_allowed'].includes(status.summary?.liveGuardDecision), 'live runtime guard has an explicit decision', status.summary?.liveGuardDecision || 'missing')
  addFinding(findings, status.report?.sideEffects?.gmailSent === false && status.report?.sideEffects?.clickUpRequestedWritten === false, 'dry-run report has no external side effects', JSON.stringify(status.report?.sideEffects || {}))
  addFinding(findings, status.summary?.metadataOnly === true && !hasPrivateProofLeak(readinessProof) && !hasPrivateProofLeak(status), 'auto-send proof has no raw emails, token URLs, or feedback content', 'metadata-only')
  addFinding(findings, Number.isFinite(Number(status.summary?.wouldSendCount)) &&
    Number.isFinite(Number(status.summary?.sentCount)) &&
    Number.isFinite(Number(status.summary?.skippedCount)) &&
    Number.isFinite(Number(status.summary?.blockedCount)) &&
    Number.isFinite(Number(status.summary?.warningCount)) &&
    Number.isFinite(Number(status.summary?.repairCount)), 'runtime counts include would-send, sent, skipped, blocked, warning, and repair', JSON.stringify(status.summary || {}))
  addFinding(findings, ['would_send', 'sent', 'repair', 'skipped'].includes(hubStatus?.summary?.georgiaDay30Action), 'live Foundation Hub exposes Georgia production action', hubStatus?.summary?.georgiaDay30Action || 'missing')
  addFinding(findings, ['would_send', 'sent', 'repair', 'skipped'].includes(opsStatus?.summary?.georgiaDay30Action), 'live Ops Hub exposes Georgia production action', opsStatus?.summary?.georgiaDay30Action || 'missing')
  addFinding(findings, opsJobs.some(job => job.key === AGENT_FEEDBACK_AUTO_SEND_JOB_KEY), 'Ops Hub lists auto-send readiness job', AGENT_FEEDBACK_AUTO_SEND_JOB_KEY)
  addFinding(findings, autoSendCard?.lane === 'done' && /agent-feedback-auto-send-v1/.test(autoSendCard?.statusNote || ''), 'auto-send card is done for readiness only', autoSendCard?.lane || 'missing')
  addFinding(findings, georgiaSendCard?.lane === 'scoped', 'Georgia send follow-up remains scoped for test-only approval decision', georgiaSendCard?.lane || 'missing')
  addFinding(findings, closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_AUTO_SEND_CARD_ID), 'closeout owns only auto-send card', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, !(closeout?.backlogIds || []).includes('AGENT-FEEDBACK-GEORGIA-SEND-001'), 'Georgia send card remains context-only, not owned by auto-send closeout', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, currentPlan.includes('AGENT-FEEDBACK-AUTO-SEND-001` is done for readiness') && currentPlan.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID), 'current plan records readiness and production follow-through', 'current-plan')
  addFinding(findings, currentState.includes('AGENT-FEEDBACK-AUTO-SEND-001` is done for readiness') && currentState.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID), 'current state records readiness and production follow-through', 'current-state')

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
    readiness: status,
    summary: {
      ...status.summary,
      autoSendCardLane: autoSendCard?.lane || '',
      georgiaSendCardLane: georgiaSendCard?.lane || '',
      closeoutOwnsOnlyAutoSend: closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_AUTO_SEND_CARD_ID),
    },
    findings,
  }
}
