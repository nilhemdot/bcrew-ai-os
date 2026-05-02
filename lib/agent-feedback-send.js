import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAgentFeedbackEmail } from './agent-feedback-email.js'
import { createAgentFeedbackToken, hashAgentFeedbackToken } from './agent-feedback.js'
import {
  buildAgentFeedbackRequestedWritebackPlan,
  markAgentFeedbackRequestedInClickUp,
} from './agent-feedback-clickup.js'
import {
  CLICKUP_AGENT_ROSTER_LIST_ID,
} from './agent-roster-review.js'
import {
  getClickUpFieldMap,
  getClickUpListSnapshot,
  normalizeClickUpKey,
} from './clickup.js'
import {
  createAgentFeedbackSendAttempt,
  getActiveAgentFeedbackSendAttempt,
  listFoundationUsers,
  updateAgentFeedbackSendAttemptStatus,
} from './foundation-db.js'
import { sendGmailMessage } from './google-delegated.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_FEEDBACK_SEND_CARD_ID = 'AGENT-FEEDBACK-SEND-001'
export const AGENT_FEEDBACK_SEND_CLOSEOUT_KEY = 'agent-feedback-send-v1'
export const AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID = 'AGENT-FEEDBACK-GEORGIA-SEND-001'
export const AGENT_FEEDBACK_SEND_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-send-v1.md'
export const AGENT_FEEDBACK_SEND_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-SEND-001.json'
export const AGENT_FEEDBACK_SEND_BASELINE_PATH = 'docs/audits/2026-04-30-agent-feedback-send-baseline.md'
export const AGENT_FEEDBACK_SEND_DRY_RUN_PROOF_PATH = 'docs/audits/2026-04-30-agent-feedback-send-dry-run-proof.md'
export const AGENT_FEEDBACK_SEND_SOURCE_ID = 'SRC-CLICKUP-001'
export const AGENT_FEEDBACK_SEND_DEFAULT_TARGET = 'Georgia'
export const AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE = 30
export const AGENT_FEEDBACK_SEND_WINDOW_DAYS = 15
export const AGENT_FEEDBACK_SEND_STAGE = 'stage-1-dry-run-send-infrastructure'

const MILESTONE_FIELDS = {
  30: {
    statusField: 'Onboarding NPS 30 Status',
    scoreField: 'Onboarding NPS 30 Score',
    feedbackField: 'Onboarding NPS 30 Feedback',
  },
  60: {
    statusField: 'Onboarding NPS 60 Status',
    scoreField: 'Onboarding NPS 60 Score',
    feedbackField: 'Onboarding NPS 60 Feedback',
  },
  90: {
    statusField: 'Onboarding NPS 90 Status',
    scoreField: 'Onboarding NPS 90 Score',
    feedbackField: 'Onboarding NPS 90 Feedback',
  },
}
export const AGENT_FEEDBACK_MILESTONE_DAYS = Object.freeze(Object.keys(MILESTONE_FIELDS).map(Number))

const CLOSED_STATUSES = new Set(['completed', 'skipped', 'blocked', 'not eligible'])
const INTERNAL_OVERSIGHT_BCC_ROLE_DEFINITIONS = [
  { key: 'steve', label: 'Steve' },
  { key: 'carson', label: 'Carson' },
  { key: 'ryan', label: 'Ryan' },
  { key: 'georgia', label: 'Georgia' },
]
const INTERNAL_OVERSIGHT_BCC_ROLE_KEYS = INTERNAL_OVERSIGHT_BCC_ROLE_DEFINITIONS.map(role => role.key)
const APPROVED_INTERNAL_OVERSIGHT_ROLE_KEYS = new Set(INTERNAL_OVERSIGHT_BCC_ROLE_KEYS)
const COMPANY_EMAIL_FIELD = 'Company Email'
const RECIPIENT_SOURCE_COMPANY = 'company_email'
const INTERNAL_TEAM_RECIPIENTS = ['georgia']
const INTERNAL_OVERSIGHT_EMAIL_ENV = {
  steve: ['AGENT_FEEDBACK_BCC_STEVE_EMAIL', 'AGENT_FEEDBACK_OVERSIGHT_STEVE_EMAIL', 'AGENT_FEEDBACK_STEVE_EMAIL'],
  carson: ['AGENT_FEEDBACK_BCC_CARSON_EMAIL', 'AGENT_FEEDBACK_OVERSIGHT_CARSON_EMAIL', 'AGENT_FEEDBACK_CARSON_EMAIL'],
  ryan: ['AGENT_FEEDBACK_BCC_RYAN_EMAIL', 'AGENT_FEEDBACK_OVERSIGHT_RYAN_EMAIL', 'AGENT_FEEDBACK_RYAN_EMAIL'],
  georgia: ['AGENT_FEEDBACK_BCC_GEORGIA_EMAIL', 'AGENT_FEEDBACK_OVERSIGHT_GEORGIA_EMAIL', 'AGENT_FEEDBACK_GEORGIA_EMAIL'],
}
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeStatus(value) {
  return normalizeText(value).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function hashForProof(value) {
  const text = normalizeText(value)
  return text ? sha256(text).slice(0, 16) : ''
}

function parseDate(value) {
  const text = normalizeText(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfUtcDay(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function addDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function daysBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000)
}

function formatDate(date) {
  return date ? date.toISOString().slice(0, 10) : ''
}

function fieldDefinitionMap(fields = []) {
  const map = new Map()
  for (const field of fields || []) {
    map.set(normalizeClickUpKey(field.name), field)
  }
  return map
}

function normalizedInternalTeamRecipients() {
  return new Set([...INTERNAL_TEAM_RECIPIENTS, ...splitList(process.env.AGENT_FEEDBACK_INTERNAL_TEAM_RECIPIENTS)]
    .map(value => normalizeText(value).toLowerCase())
    .filter(Boolean))
}

function isInternalTeamRecipient(candidate = {}) {
  const configuredNames = normalizedInternalTeamRecipients()
  const targetName = normalizeText(candidate.targetName).toLowerCase()
  const taskName = normalizeText(candidate.taskName).toLowerCase()
  return [...configuredNames].some(name => name && (targetName === name || taskName === name || taskName.includes(name)))
}

function selectRecipientSource(candidate = {}) {
  const internalTeam = isInternalTeamRecipient(candidate)
  return {
    recipientCategory: internalTeam ? 'internal_team' : 'external_agent',
    recipientSource: RECIPIENT_SOURCE_COMPANY,
    recipientFieldName: COMPANY_EMAIL_FIELD,
    recipientRule: 'clickup-company-email',
    toRole: internalTeam ? 'internal-team-recipient' : 'agent-company-email-recipient',
  }
}

function hasField(fieldsByName, fieldName) {
  return fieldsByName.has(normalizeClickUpKey(fieldName))
}

function getRoleEmailFromEnv(role) {
  const envNames = INTERNAL_OVERSIGHT_EMAIL_ENV[role] || []
  for (const envName of envNames) {
    const value = normalizeText(process.env[envName])
    if (value) return value
  }
  return ''
}

async function loadInternalOversightEmailMap(candidate = {}) {
  const users = await listFoundationUsers({ activeOnly: true, userType: 'human' })
  const userEmailByName = new Map(users
    .map(user => [normalizeText(user.name).toLowerCase(), normalizeText(user.email)])
    .filter(([, email]) => validEmail(email)))
  const emailByRole = new Map()
  const candidateLabel = normalizeText(`${candidate.targetName || ''} ${candidate.taskName || ''}`).toLowerCase()
  for (const role of INTERNAL_OVERSIGHT_BCC_ROLE_KEYS) {
    const candidateEmail = candidateLabel.includes(role)
      ? normalizeText(candidate.recipientEmail)
      : ''
    const userEmail = userEmailByName.get(roleLabel(role).toLowerCase()) || ''
    const envEmail = getRoleEmailFromEnv(role)
    const email = [candidateEmail, userEmail, envEmail].find(validEmail) || ''
    emailByRole.set(role, email)
  }
  return emailByRole
}

function validEmail(value) {
  return EMAIL_PATTERN.test(normalizeText(value))
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean)
  return String(value || '')
    .split(',')
    .map(normalizeText)
    .filter(Boolean)
}

function roleLabel(roleKey) {
  return INTERNAL_OVERSIGHT_BCC_ROLE_DEFINITIONS.find(role => role.key === roleKey)?.label || roleKey
}

function normalizeRoleKey(value) {
  const normalized = normalizeText(value).toLowerCase()
  const match = INTERNAL_OVERSIGHT_BCC_ROLE_DEFINITIONS.find(role =>
    role.key === normalized || role.label.toLowerCase() === normalized)
  return match?.key || normalized
}

function normalizeRoleKeys(values = INTERNAL_OVERSIGHT_BCC_ROLE_KEYS) {
  return splitList(values)
    .map(normalizeRoleKey)
    .filter(role => role && APPROVED_INTERNAL_OVERSIGHT_ROLE_KEYS.has(role))
    .filter((role, index, roles) => roles.indexOf(role) === index)
}

function buildPublicFeedbackUrl(token) {
  const baseUrl = String(process.env.AIOS_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return baseUrl + '/agent-feedback?token=' + encodeURIComponent(token)
}

function resolveEmailConfig() {
  const fromEmail = normalizeText(process.env.AGENT_FEEDBACK_FROM_EMAIL || process.env.FOUNDATION_GOOGLE_USER || 'ai@bensoncrew.ca')
  const fromName = normalizeText(process.env.AGENT_FEEDBACK_FROM_NAME || 'Benson Crew')
  const replyTo = normalizeText(process.env.AGENT_FEEDBACK_REPLY_TO_EMAIL || fromEmail)
  return {
    fromEmail,
    fromName,
    replyTo,
    senderRole: 'delegated-google-user',
    replyToRole: replyTo === fromEmail ? 'sender' : 'configured-reply-to',
  }
}

async function resolveInternalOversightBcc(candidate, requestedRoles = INTERNAL_OVERSIGHT_BCC_ROLE_KEYS) {
  const requestedRoleKeys = normalizeRoleKeys(requestedRoles)
  const emailByRole = await loadInternalOversightEmailMap(candidate)
  const to = normalizeText(candidate.recipientEmail).toLowerCase()
  const configuredRoleKeys = requestedRoleKeys.filter(role => validEmail(emailByRole.get(role)))
  const missingRoleKeys = requestedRoleKeys.filter(role => !configuredRoleKeys.includes(role))
  const dedupedRoleKeys = configuredRoleKeys.filter(role => to && normalizeText(emailByRole.get(role)).toLowerCase() === to)
  const actualBccRoleKeys = configuredRoleKeys.filter(role => !dedupedRoleKeys.includes(role))
  const addressHashesByRole = {}
  for (const role of configuredRoleKeys) {
    addressHashesByRole[roleLabel(role)] = hashForProof(emailByRole.get(role))
  }
  return {
    bcc: actualBccRoleKeys.map(role => emailByRole.get(role)).filter(validEmail).join(', '),
    plan: {
      bccRolesRequested: requestedRoleKeys.map(roleLabel),
      bccRolesApplied: configuredRoleKeys.map(roleLabel),
      bccActualSendRoles: actualBccRoleKeys.map(roleLabel),
      bccRecipientDedupedRoles: dedupedRoleKeys.map(roleLabel),
      bccMissingConfiguredRoles: missingRoleKeys.map(roleLabel),
      bccAddressHashesByRole: addressHashesByRole,
    },
  }
}

async function buildRecipientPlan(candidate, requestedBccRoles = INTERNAL_OVERSIGHT_BCC_ROLE_KEYS) {
  const oversight = await resolveInternalOversightBcc(candidate, requestedBccRoles)
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
    toAddressHash: hashForProof(candidate.recipientEmail),
    internalOversightMode: 'bcc',
    bccRolesRequested: oversight.plan.bccRolesRequested,
    bccRolesApplied: oversight.plan.bccRolesApplied,
    bccActualSendRoles: oversight.plan.bccActualSendRoles,
    bccRecipientDedupedRoles: oversight.plan.bccRecipientDedupedRoles,
    bccMissingConfiguredRoles: oversight.plan.bccMissingConfiguredRoles,
    bccAddressHashesByRole: oversight.plan.bccAddressHashesByRole,
    stageTwoRequiresApprovedInternalOversightRoles: oversight.plan.bccRolesRequested,
  }
}

async function resolveRawRecipients(candidate, requestedBccRoles = INTERNAL_OVERSIGHT_BCC_ROLE_KEYS) {
  const to = normalizeText(candidate.recipientEmail)
  if (!validEmail(to)) throw new Error(`${candidate.recipientFieldName || 'Recipient email'} is missing or invalid.`)
  const oversight = await resolveInternalOversightBcc(candidate, requestedBccRoles)
  if (oversight.plan.bccMissingConfiguredRoles.length) {
    throw new Error('Missing approved BCC/internal oversight address configuration for: ' + oversight.plan.bccMissingConfiguredRoles.join(', '))
  }
  return { to, bcc: oversight.bcc }
}

function findTargetTask(tasks, targetName) {
  const target = normalizeText(targetName).toLowerCase()
  return (tasks || []).find(task => normalizeText(task.name).toLowerCase().includes(target)) || null
}

function buildCandidateFromTask({ task, fields, targetName, milestoneDay, now = new Date() }) {
  const milestone = MILESTONE_FIELDS[milestoneDay]
  if (!milestone) throw new Error('Invalid feedback milestone.')
  const taskFields = getClickUpFieldMap(task)
  const fieldsByName = fieldDefinitionMap(fields)
  const today = startOfUtcDay(now) || startOfUtcDay(new Date())
  const realStart = parseDate(taskFields.get('Real Start Date'))
  const dueDate = realStart ? addDays(startOfUtcDay(realStart), milestoneDay) : null
  const overdueDays = dueDate ? daysBetween(dueDate, today) : null
  const currentStatus = taskFields.get(milestone.statusField)
  const companyEmail = normalizeText(taskFields.get(COMPANY_EMAIL_FIELD))
  const recipientSource = selectRecipientSource({
    targetName,
    taskName: task.name,
    rosterStatus: task.status?.status,
  })
  const recipientEmail = companyEmail
  const contractLink = normalizeText(taskFields.get('Contract Link'))
  const missingFields = [milestone.statusField, milestone.scoreField, milestone.feedbackField]
    .filter(fieldName => !hasField(fieldsByName, fieldName))

  return {
    targetName,
    taskId: normalizeText(task.id),
    taskName: normalizeText(task.name),
    clickUpUrl: normalizeText(task.url),
    rosterStatus: normalizeText(task.status?.status),
    milestoneDay,
    statusField: milestone.statusField,
    scoreField: milestone.scoreField,
    feedbackField: milestone.feedbackField,
    currentStatus: normalizeText(currentStatus),
    normalizedStatus: normalizeStatus(currentStatus),
    realStartDate: realStart ? formatDate(startOfUtcDay(realStart)) : '',
    dueDate: formatDate(dueDate),
    overdueDays,
    sendWindowDays: AGENT_FEEDBACK_SEND_WINDOW_DAYS,
    companyEmailPresent: Boolean(companyEmail),
    recipientCategory: recipientSource.recipientCategory,
    recipientSource: recipientSource.recipientSource,
    recipientRule: recipientSource.recipientRule,
    recipientFieldName: recipientSource.recipientFieldName,
    recipientFieldNameHash: hashForProof(recipientSource.recipientFieldName),
    recipientEmail,
    recipientEmailPresent: Boolean(recipientEmail),
    recipientEmailValid: validEmail(recipientEmail),
    toRole: recipientSource.toRole,
    contractLinkPresent: Boolean(contractLink),
    missingFields,
  }
}

function buildEligibility(candidate, activeSendAttempt = null, recipientPlan = null) {
  const blockers = []
  const dataQualityWarnings = []
  const todayDue = candidate.dueDate && candidate.overdueDays >= 0
  if (!candidate.realStartDate) blockers.push('missing_real_start_date')
  if (candidate.dueDate && candidate.overdueDays < 0) blockers.push('not_due')
  if (candidate.overdueDays != null && candidate.overdueDays > AGENT_FEEDBACK_SEND_WINDOW_DAYS) blockers.push('expired_send_window')
  if (!candidate.recipientEmailPresent) blockers.push(`missing_${candidate.recipientSource}`)
  if (!candidate.recipientEmailValid) blockers.push(`invalid_${candidate.recipientSource}`)
  if (!candidate.contractLinkPresent) dataQualityWarnings.push('missing_contract_link')
  if (candidate.missingFields.length) blockers.push('missing_feedback_fields')
  if (candidate.normalizedStatus === 'requested') blockers.push('already_requested')
  if (CLOSED_STATUSES.has(candidate.normalizedStatus)) blockers.push('already_closed')
  if (activeSendAttempt) blockers.push('duplicate_send_attempt_exists')
  if (recipientPlan?.bccMissingConfiguredRoles?.length) blockers.push('missing_bcc_internal_oversight_config')

  return {
    eligible: blockers.length === 0,
    dueStatus: !candidate.realStartDate
      ? 'blocked'
      : !todayDue
        ? 'not_due'
        : candidate.overdueDays > AGENT_FEEDBACK_SEND_WINDOW_DAYS
          ? 'expired_window'
          : 'due',
    blockers,
    dataQualityWarnings,
    contractLinkStatus: candidate.contractLinkPresent ? 'present' : 'missing_warning',
  }
}

async function loadCandidate({ targetName = AGENT_FEEDBACK_SEND_DEFAULT_TARGET, milestoneDay = AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE, now = new Date() } = {}) {
  const snapshot = await getClickUpListSnapshot(CLICKUP_AGENT_ROSTER_LIST_ID)
  const task = findTargetTask(snapshot.tasks, targetName)
  if (!task) throw new Error('Agent Roster target not found for dry run.')
  return buildCandidateFromTask({
    task,
    fields: snapshot.fields,
    targetName,
    milestoneDay: Number(milestoneDay),
    now,
  })
}

export async function buildAgentFeedbackDryRunProof(options = {}) {
  const targetName = normalizeText(options.targetName || AGENT_FEEDBACK_SEND_DEFAULT_TARGET)
  const milestoneDay = Number(options.milestoneDay || AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE)
  const candidate = await loadCandidate({ targetName, milestoneDay, now: options.now || new Date() })
  const tokenIssuedAtMs = Number(options.tokenIssuedAtMs)
  const token = createAgentFeedbackToken({
    taskId: candidate.taskId,
    agentName: candidate.taskName || targetName,
    milestoneDay,
  }, Number.isFinite(tokenIssuedAtMs) && tokenIssuedAtMs > 0 ? tokenIssuedAtMs : Date.now())
  const tokenHash = hashAgentFeedbackToken(token)
  const activeSendAttempt = await getActiveAgentFeedbackSendAttempt({
    taskId: candidate.taskId,
    milestoneDay,
  })
  const requestedBccRoles = splitList(options.bccRoles).length
    ? splitList(options.bccRoles)
    : INTERNAL_OVERSIGHT_BCC_ROLE_KEYS
  const recipientPlan = await buildRecipientPlan(candidate, requestedBccRoles)
  const eligibility = buildEligibility(candidate, activeSendAttempt, recipientPlan)
  const emailConfig = resolveEmailConfig()
  const writebackPlan = await buildAgentFeedbackRequestedWritebackPlan({ milestoneDay })
  const email = buildAgentFeedbackEmail({
    agentName: candidate.taskName || targetName,
    milestoneDay,
    feedbackUrl: '[private-feedback-link-not-logged]',
  })

  return {
    stage: AGENT_FEEDBACK_SEND_STAGE,
    mode: 'dry-run',
    target: {
      label: targetName,
      sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
      listIdHash: hashForProof(CLICKUP_AGENT_ROSTER_LIST_ID),
      taskIdHash: hashForProof(candidate.taskId),
      rosterStatus: candidate.rosterStatus,
    },
    milestone: {
      day: milestoneDay,
      realStartDate: candidate.realStartDate,
      dueDate: candidate.dueDate,
      dueStatus: eligibility.dueStatus,
      overdueDays: candidate.overdueDays,
      sendWindowDays: AGENT_FEEDBACK_SEND_WINDOW_DAYS,
      currentStatus: candidate.currentStatus || 'empty',
    },
    eligibility,
    contractLinkStatus: eligibility.contractLinkStatus,
    recipientPlan,
    email: {
      subject: email.subject,
      senderRole: emailConfig.senderRole,
      fromName: emailConfig.fromName,
      replyToRole: emailConfig.replyToRole,
      ccSupported: false,
      bccSupported: true,
    },
    token: {
      tokenHash: tokenHash.slice(0, 16),
      tokenUrlLogged: false,
    },
    clickUpWritebackPlan: {
      milestoneDay,
      statusField: writebackPlan.statusField,
      requestedStatus: writebackPlan.requestedStatus,
      sequence: writebackPlan.sequence,
      dryRunWritesRequested: false,
    },
    duplicateProtection: {
      activeSendAttemptExists: Boolean(activeSendAttempt),
      uniqueKey: 'clickup_task_id + milestone_day',
      protectedStatuses: ['sending', 'sent', 'clickup_requested'],
    },
    sideEffects: {
      gmailSent: false,
      clickUpRequestedWritten: false,
      rawEmailLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
  }
}

function validateRouteSpecificSendApproval(approval = {}, proof = null) {
  const bccRoleKeys = normalizeRoleKeys(Array.isArray(approval.bccRoles) ? approval.bccRoles : [])
  const expectedRecipientRule = proof?.recipientPlan?.recipientRule || 'clickup-company-email'
  const expectedTarget = normalizeText(proof?.target?.label).toLowerCase()
  const ok = approval.sendApproved === true &&
    approval.approvedBy === 'Steve' &&
    Boolean(expectedTarget) &&
    normalizeText(approval.targetName).toLowerCase() === expectedTarget &&
    Number(approval.milestoneDay) === Number(proof?.milestone?.day || AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE) &&
    normalizeText(approval.recipientRule) === expectedRecipientRule &&
    approval.oneSendLimit === true &&
    INTERNAL_OVERSIGHT_BCC_ROLE_KEYS.every(role => bccRoleKeys.includes(role)) &&
    bccRoleKeys.every(role => APPROVED_INTERNAL_OVERSIGHT_ROLE_KEYS.has(role))
  if (!ok) {
    throw new Error('Real send requires Steve SEND APPROVED naming the exact target, milestone/day, recipient source/rule, BCC/internal oversight roles, and one-send limit.')
  }
  return true
}

export async function executeApprovedAgentFeedbackSend(options = {}) {
  const tokenIssuedAtMs = Number(options.tokenIssuedAtMs)
  const stableTokenIssuedAtMs = Number.isFinite(tokenIssuedAtMs) && tokenIssuedAtMs > 0
    ? tokenIssuedAtMs
    : Date.now()
  const proof = await buildAgentFeedbackDryRunProof({
    ...options,
    tokenIssuedAtMs: stableTokenIssuedAtMs,
  })
  validateRouteSpecificSendApproval(options.approval || {}, proof)
  const allowedBlockers = new Set(splitList(options.allowedEligibilityBlockers))
  const blockingReasons = (proof.eligibility.blockers || []).filter(blocker => !allowedBlockers.has(blocker))
  if (!proof.eligibility.eligible && blockingReasons.length) {
    throw new Error('Feedback request is not eligible to send: ' + proof.eligibility.blockers.join(', '))
  }

  const candidate = await loadCandidate({
    targetName: options.targetName || AGENT_FEEDBACK_SEND_DEFAULT_TARGET,
    milestoneDay: options.milestoneDay || AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE,
    now: options.now || new Date(),
  })
  const token = createAgentFeedbackToken({
    taskId: candidate.taskId,
    agentName: candidate.taskName,
    milestoneDay: candidate.milestoneDay,
  }, stableTokenIssuedAtMs)
  const tokenHash = hashAgentFeedbackToken(token)
  const emailConfig = resolveEmailConfig()
  const { to, bcc } = await resolveRawRecipients(candidate, INTERNAL_OVERSIGHT_BCC_ROLE_KEYS)
  const attempt = await createAgentFeedbackSendAttempt({
    taskId: candidate.taskId,
    agentName: candidate.taskName,
    milestoneDay: candidate.milestoneDay,
    tokenHash,
    metadata: {
      target: proof.target?.label || candidate.taskName,
      recipientRule: proof.recipientPlan.recipientRule,
      recipientSource: proof.recipientPlan.recipientSource,
      internalOversightMode: 'bcc',
      bccRoles: proof.recipientPlan.bccRolesApplied,
      bccActualSendRoles: proof.recipientPlan.bccActualSendRoles,
      bccRecipientDedupedRoles: proof.recipientPlan.bccRecipientDedupedRoles,
      oneSendLimit: true,
      ...(options.sendAttemptMetadata && typeof options.sendAttemptMetadata === 'object'
        ? options.sendAttemptMetadata
        : {}),
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
      metadata: { gmailSendSucceeded: true },
    })
    await markAgentFeedbackRequestedInClickUp({
      taskId: candidate.taskId,
      milestoneDay: candidate.milestoneDay,
    })
    await updateAgentFeedbackSendAttemptStatus(attempt.id, {
      status: 'clickup_requested',
      gmailMessageId: gmail.id || '',
      gmailThreadId: gmail.threadId || '',
      metadata: { clickUpRequestedWritten: true },
    })
    return {
      ok: true,
      mode: 'send',
      target: proof.target,
      milestone: proof.milestone,
      recipientPlan: proof.recipientPlan,
      tokenHash: tokenHash.slice(0, 16),
      eligibility: proof.eligibility,
      gmail: {
        messageId: gmail.id || '',
        threadId: gmail.threadId || '',
      },
      clickUpRequestedWritten: true,
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
      throw error
    }
    await updateAgentFeedbackSendAttemptStatus(attempt.id, {
      status: 'failed',
      metadata: { errorClass: error instanceof Error ? error.name : 'Error' },
    })
    throw error
  }
}

export {
  buildCandidateFromTask as buildAgentFeedbackCandidateFromTask,
  buildEligibility as buildAgentFeedbackEligibility,
  loadCandidate as loadAgentFeedbackCandidateForTarget,
  buildRecipientPlan as buildAgentFeedbackRecipientPlan,
  hashForProof as hashAgentFeedbackProofValue,
  normalizeText as normalizeAgentFeedbackText,
  resolveEmailConfig as resolveAgentFeedbackEmailConfig,
  resolveRawRecipients as resolveAgentFeedbackRawRecipients,
  splitList as splitAgentFeedbackList,
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
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

function hasPrivateProofLeak(source) {
  if (!source) return false
  if (/\/agent-feedback\?token=/i.test(source)) return true
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(source)) return true
  return false
}

const ALLOWED_ELIGIBILITY_BLOCKERS = new Set([
  'missing_real_start_date',
  'not_due',
  'expired_send_window',
  'missing_company_email',
  'invalid_company_email',
  'missing_bcc_internal_oversight_config',
  'missing_feedback_fields',
  'already_requested',
  'already_closed',
  'duplicate_send_attempt_exists',
])
const LEGACY_PERSONAL_EMAIL_BLOCKERS = [
  ['missing', 'personal', 'email'].join('_'),
  ['invalid', 'personal', 'email'].join('_'),
]

export async function buildAgentFeedbackSendStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  sourceOfTruth = null,
  dryRunProof = null,
} = {}) {
  const findings = []
  const proof = dryRunProof || await buildAgentFeedbackDryRunProof()
  const packageJson = await readOptionalText(repoRoot, 'package.json')
  const approvedPlan = await readOptionalText(repoRoot, AGENT_FEEDBACK_SEND_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, AGENT_FEEDBACK_SEND_APPROVAL_PATH)
  const baseline = await readOptionalText(repoRoot, AGENT_FEEDBACK_SEND_BASELINE_PATH)
  const dryRunArtifact = await readOptionalText(repoRoot, AGENT_FEEDBACK_SEND_DRY_RUN_PROOF_PATH)
  const sendSource = await readOptionalText(repoRoot, 'lib/agent-feedback-send.js')
  const emailSource = await readOptionalText(repoRoot, 'lib/agent-feedback-email.js')
  const googleDelegatedSource = await readOptionalText(repoRoot, 'lib/google-delegated.js')
  const clickUpSource = await readOptionalText(repoRoot, 'lib/agent-feedback-clickup.js')
  const foundationDbSource = await readOptionalText(repoRoot, 'lib/foundation-db.js')
  const foundationVerifySource = await readOptionalText(repoRoot, 'scripts/foundation-verify.mjs')
  const processScript = await readOptionalText(repoRoot, 'scripts/process-agent-feedback-send-check.mjs')
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')
  const buildLogSource = await readOptionalText(repoRoot, 'lib/foundation-build-log.js')
  const testEmailScript = await readOptionalText(repoRoot, 'scripts/send-agent-feedback-test-email.mjs')
  const cards = foundationHub?.backlogItems || []
  const sendCard = cards.find(card => card.id === AGENT_FEEDBACK_SEND_CARD_ID) || null
  const stageTwoCard = cards.find(card => card.id === AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) || null
  const agentSystem = (sourceOfTruth?.groupedSystems || []).find(system => system.systemId === 'SYS-AGENT-ONBOARDING-FEEDBACK-001') || null
  const closeout = (foundationBuildLog?.builds || []).find(build => build.closeoutKey === AGENT_FEEDBACK_SEND_CLOSEOUT_KEY) || null
  const internalRecipientSource = selectRecipientSource({ targetName: 'Georgia', taskName: 'Georgia' })
  const externalRecipientSource = selectRecipientSource({ targetName: 'Chris', taskName: 'Chris' })
  const georgiaRequestedAfterProductionEnable = (proof.eligibility?.blockers || []).includes('already_requested') &&
    (proof.eligibility?.blockers || []).includes('duplicate_send_attempt_exists')

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', AGENT_FEEDBACK_SEND_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', AGENT_FEEDBACK_SEND_APPROVAL_PATH)
  addFinding(findings, Boolean(baseline), 'baseline artifact exists', AGENT_FEEDBACK_SEND_BASELINE_PATH)
  addFinding(findings, Boolean(dryRunArtifact), 'dry-run proof artifact exists', AGENT_FEEDBACK_SEND_DRY_RUN_PROOF_PATH)
  addFinding(findings, packageJson.includes('"process:agent-feedback-send-check"'), 'package script exists', 'process:agent-feedback-send-check')
  addFinding(findings, Boolean(processScript), 'process check script exists', 'scripts/process-agent-feedback-send-check.mjs')
  addFinding(findings, buildLogSource.includes(AGENT_FEEDBACK_SEND_CLOSEOUT_KEY), 'build log closeout exists in source', AGENT_FEEDBACK_SEND_CLOSEOUT_KEY)
  addFinding(findings, foundationVerifySource.includes(AGENT_FEEDBACK_SEND_CARD_ID), 'foundation verifier covers send card', AGENT_FEEDBACK_SEND_CARD_ID)
  addFinding(findings, includesAll(sendSource, [
    'buildAgentFeedbackDryRunProof',
    'executeApprovedAgentFeedbackSend',
    'validateRouteSpecificSendApproval',
    'duplicate_send_attempt_exists',
    'clickup-company-email',
    'company_email',
    'stage-1-dry-run-send-infrastructure',
  ]), 'send module includes dry-run, approval gate, and duplicate protection', 'lib/agent-feedback-send.js')
  addFinding(
    findings,
    internalRecipientSource.recipientSource === RECIPIENT_SOURCE_COMPANY &&
      internalRecipientSource.recipientFieldName === COMPANY_EMAIL_FIELD &&
      externalRecipientSource.recipientSource === RECIPIENT_SOURCE_COMPANY &&
      externalRecipientSource.recipientFieldName === COMPANY_EMAIL_FIELD,
    'recipient source selection uses Company Email for internal/team and external agents',
    `${internalRecipientSource.recipientSource}/${externalRecipientSource.recipientSource}`,
  )
  addFinding(findings, includesAll(googleDelegatedSource, ['Bcc:', 'Reply-To:', 'replyTo']), 'Gmail helper supports BCC and reply-to additively', 'sendGmailMessage')
  addFinding(findings, includesAll(clickUpSource, ['buildAgentFeedbackRequestedWritebackPlan', 'markAgentFeedbackRequestedInClickUp', 'Requested']), 'ClickUp Requested writeback helper exists', 'Requested')
  addFinding(findings, includesAll(foundationDbSource, [
    'agent_onboarding_feedback_send_attempts',
    'idx_agent_feedback_active_send_once',
    'getActiveAgentFeedbackSendAttempt',
    'createAgentFeedbackSendAttempt',
    'updateAgentFeedbackSendAttemptStatus',
  ]), 'send attempt ledger and active-send uniqueness exist', 'agent_onboarding_feedback_send_attempts')
  addFinding(findings, includesAll(testEmailScript, ['mode', 'dry-run', 'SEND APPROVED', 'executeApprovedAgentFeedbackSend']), 'legacy test-email command defaults to dry-run and gates send mode', 'scripts/send-agent-feedback-test-email.mjs')
  addFinding(findings, emailSource.includes('buildAgentFeedbackEmail'), 'email template remains reusable', 'buildAgentFeedbackEmail')
  addFinding(findings, proof.mode === 'dry-run', 'Georgia proof is dry-run only', proof.mode)
  addFinding(findings, proof.target?.label === AGENT_FEEDBACK_SEND_DEFAULT_TARGET, 'Georgia dry-run target is selected', proof.target?.label || 'missing')
  addFinding(findings, proof.milestone?.day === AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE, 'Georgia dry-run milestone is day 30', String(proof.milestone?.day || 'missing'))
  addFinding(findings, proof.milestone?.dueStatus === 'due', 'Georgia dry-run due status is due', proof.milestone?.dueStatus || 'missing')
  addFinding(
    findings,
    typeof proof.eligibility?.eligible === 'boolean' &&
      Array.isArray(proof.eligibility?.blockers) &&
      proof.eligibility.blockers.every(blocker => ALLOWED_ELIGIBILITY_BLOCKERS.has(blocker)),
    'Georgia dry-run produces a governed eligibility decision with blockers if any',
    proof.eligibility?.blockers?.join(', ') || 'eligible',
  )
  addFinding(findings, proof.recipientPlan?.recipientRule === 'clickup-company-email', 'Georgia recipient rule is ClickUp Company Email', proof.recipientPlan?.recipientRule || 'missing')
  addFinding(
    findings,
    proof.recipientPlan?.recipientSource === RECIPIENT_SOURCE_COMPANY &&
      proof.recipientPlan?.recipientSourceField?.name === COMPANY_EMAIL_FIELD &&
      Boolean(proof.recipientPlan?.recipientSourceField?.nameHash) &&
      proof.recipientPlan?.recipientSourceField?.present === true &&
      proof.recipientPlan?.recipientSourceField?.valid === true,
    'Georgia recipient source proof is Company Email metadata only and valid',
    `${proof.recipientPlan?.recipientSource || 'missing'} present=${proof.recipientPlan?.recipientSourceField?.present ? 'yes' : 'no'} valid=${proof.recipientPlan?.recipientSourceField?.valid ? 'yes' : 'no'}`,
  )
  addFinding(
    findings,
    LEGACY_PERSONAL_EMAIL_BLOCKERS.every(blocker => !(proof.eligibility?.blockers || []).includes(blocker)),
    'Agent Feedback send proof has no Personal Email blockers',
    (proof.eligibility?.blockers || []).join(', ') || 'none',
  )
  addFinding(
    findings,
    proof.recipientPlan?.internalOversightMode === 'bcc' &&
      ['Steve', 'Carson', 'Ryan', 'Georgia'].every(role => (proof.recipientPlan?.bccRolesApplied || []).includes(role)),
    'BCC/internal oversight roles include Steve, Carson, Ryan, and Georgia',
    (proof.recipientPlan?.bccRolesApplied || []).join(', ') || 'none',
  )
  addFinding(
    findings,
    (proof.recipientPlan?.bccMissingConfiguredRoles || []).length === 0,
    'BCC/internal oversight roles have approved internal email identities',
    (proof.recipientPlan?.bccMissingConfiguredRoles || []).join(', ') || 'none',
  )
  addFinding(findings, proof.recipientPlan?.bccRecipientDedupedRoles?.includes('Georgia'), 'Georgia is not duplicated in BCC when she is To', (proof.recipientPlan?.bccRecipientDedupedRoles || []).join(', ') || 'none')
  addFinding(
    findings,
    (proof.eligibility?.eligible === true || georgiaRequestedAfterProductionEnable) &&
      !(proof.eligibility?.blockers || []).includes('missing_contract_link') &&
      ['missing_warning', 'present'].includes(proof.contractLinkStatus || proof.eligibility?.contractLinkStatus),
    'Contract Link is warning metadata and does not block send eligibility or already-requested state',
    `status=${proof.contractLinkStatus || proof.eligibility?.contractLinkStatus || 'missing'} blockers=${(proof.eligibility?.blockers || []).join(', ') || 'none'}`,
  )
  addFinding(findings, Boolean(proof.token?.tokenHash) && proof.token?.tokenUrlLogged === false, 'token proof is hash-only', proof.token?.tokenHash || 'missing')
  addFinding(findings, proof.clickUpWritebackPlan?.dryRunWritesRequested === false && /after Gmail send succeeds/i.test(proof.clickUpWritebackPlan?.sequence || ''), 'dry-run does not write Requested and sequence is Gmail-first', proof.clickUpWritebackPlan?.sequence || 'missing')
  addFinding(findings, proof.sideEffects?.gmailSent === false && proof.sideEffects?.clickUpRequestedWritten === false, 'Stage 1 proof has no external side effects', JSON.stringify(proof.sideEffects || {}))
  addFinding(findings, proof.email?.senderRole === 'delegated-google-user' && proof.email?.fromName && proof.email?.replyToRole, 'sender/from-name/reply-to behavior is explicit', `${proof.email?.senderRole || ''}/${proof.email?.fromName || ''}/${proof.email?.replyToRole || ''}`)
  addFinding(findings, !hasPrivateProofLeak(dryRunArtifact), 'dry-run artifact has no raw email addresses, token URLs, or feedback content', AGENT_FEEDBACK_SEND_DRY_RUN_PROOF_PATH)
  addFinding(findings, !hasPrivateProofLeak(buildLogSource), 'build log source has no raw email addresses, token URLs, or feedback content for send closeout', 'metadata-only')
  addFinding(findings, sendCard?.lane === 'done' && /agent-feedback-send-v1/.test(sendCard?.statusNote || ''), 'send card is closed as Stage 1 only', sendCard?.lane || 'missing')
  addFinding(findings, stageTwoCard?.lane === 'scoped', 'Stage 2 Georgia send follow-up remains scoped', stageTwoCard?.lane || 'missing')
  addFinding(findings, ['partial', 'live'].includes(agentSystem?.implementationState), 'Agent Onboarding Feedback system is partial before send or live after production enablement', agentSystem?.implementationState || 'missing')
  addFinding(findings, closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_SEND_CARD_ID), 'closeout owns only send card', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, closeout?.mentionedBacklogIds?.includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID), 'closeout mentions Stage 2 follow-up as context only', (closeout?.mentionedBacklogIds || []).join(', ') || 'missing')
  addFinding(findings, currentPlan.includes(AGENT_FEEDBACK_SEND_CARD_ID) && currentPlan.includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID), 'current plan records Stage 1 and Stage 2 boundary', 'current-plan')
  addFinding(
    findings,
    currentState.includes(AGENT_FEEDBACK_SEND_CARD_ID) &&
      (currentState.includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) ||
        currentState.includes('AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001')),
    'current state records Stage 1 and next live-test boundary',
    'current-state',
  )

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_SEND_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_SEND_CLOSEOUT_KEY,
    dryRunProof: proof,
    summary: {
      stage: proof.stage,
      target: proof.target?.label || '',
      milestoneDay: proof.milestone?.day || null,
      dueStatus: proof.milestone?.dueStatus || '',
      eligible: Boolean(proof.eligibility?.eligible),
      georgiaRequestedAfterProductionEnable,
      blockers: proof.eligibility?.blockers || [],
      dataQualityWarnings: proof.eligibility?.dataQualityWarnings || [],
      contractLinkStatus: proof.contractLinkStatus || proof.eligibility?.contractLinkStatus || '',
      recipientRule: proof.recipientPlan?.recipientRule || '',
      recipientSource: proof.recipientPlan?.recipientSource || '',
      recipientSourceFieldName: proof.recipientPlan?.recipientSourceField?.name || '',
      recipientSourceFieldHashPresent: Boolean(proof.recipientPlan?.recipientSourceField?.nameHash),
      recipientSourcePresent: Boolean(proof.recipientPlan?.recipientSourceField?.present),
      recipientSourceValid: Boolean(proof.recipientPlan?.recipientSourceField?.valid),
      internalOversightMode: proof.recipientPlan?.internalOversightMode || '',
      bccRolesApplied: proof.recipientPlan?.bccRolesApplied || [],
      bccActualSendRoles: proof.recipientPlan?.bccActualSendRoles || [],
      bccRecipientDedupedRoles: proof.recipientPlan?.bccRecipientDedupedRoles || [],
      bccMissingConfiguredRoles: proof.recipientPlan?.bccMissingConfiguredRoles || [],
      tokenHashPresent: Boolean(proof.token?.tokenHash),
      gmailSent: Boolean(proof.sideEffects?.gmailSent),
      clickUpRequestedWritten: Boolean(proof.sideEffects?.clickUpRequestedWritten),
      sendCardLane: sendCard?.lane || '',
      stageTwoCardLane: stageTwoCard?.lane || '',
      systemImplementationState: agentSystem?.implementationState || '',
      closeoutOwnsOnlySendCard: closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_SEND_CARD_ID),
    },
    findings,
  }
}
