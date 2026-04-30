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

const CLOSED_STATUSES = new Set(['completed', 'skipped', 'blocked', 'not eligible'])
const REQUESTED_CC_ROLES = ['steve', 'carson', 'ryan', 'georgia']
const APPROVED_CC_ROLES = new Set(REQUESTED_CC_ROLES)
const ROLE_EMAIL_ENV = {
  steve: ['AGENT_FEEDBACK_CC_STEVE_EMAIL', 'AGENT_FEEDBACK_STEVE_EMAIL'],
  carson: ['AGENT_FEEDBACK_CC_CARSON_EMAIL', 'AGENT_FEEDBACK_CARSON_EMAIL'],
  ryan: ['AGENT_FEEDBACK_CC_RYAN_EMAIL', 'AGENT_FEEDBACK_RYAN_EMAIL'],
  georgia: ['AGENT_FEEDBACK_CC_GEORGIA_EMAIL', 'AGENT_FEEDBACK_GEORGIA_EMAIL'],
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

function hasField(fieldsByName, fieldName) {
  return fieldsByName.has(normalizeClickUpKey(fieldName))
}

function getRoleEmail(role, candidate = null) {
  if (role === 'georgia' && candidate?.personalEmail) return candidate.personalEmail
  const envNames = ROLE_EMAIL_ENV[role] || []
  for (const envName of envNames) {
    const value = normalizeText(process.env[envName])
    if (value) return value
  }
  return ''
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

function resolveCcRoles(targetName, requestedRoles = REQUESTED_CC_ROLES) {
  const target = normalizeText(targetName).toLowerCase()
  const uniqueRoles = []
  for (const role of requestedRoles.map(role => normalizeText(role).toLowerCase())) {
    if (!role || !APPROVED_CC_ROLES.has(role)) continue
    if (!uniqueRoles.includes(role)) uniqueRoles.push(role)
  }
  const duplicateRolesRemoved = target.includes('georgia') && uniqueRoles.includes('georgia')
    ? ['georgia']
    : []
  return {
    requestedRoles: uniqueRoles,
    appliedRoles: uniqueRoles.filter(role => !duplicateRolesRemoved.includes(role)),
    duplicateRolesRemoved,
  }
}

function buildRecipientPlan(candidate, requestedCcRoles = REQUESTED_CC_ROLES) {
  const ccRoles = resolveCcRoles(candidate.targetName, requestedCcRoles)
  const configuredCcRoles = ccRoles.appliedRoles.filter(role => validEmail(getRoleEmail(role, candidate)))
  return {
    recipientRule: 'clickup-personal-email',
    toRole: 'agent',
    toAddressPresent: Boolean(candidate.personalEmail),
    toAddressHash: hashForProof(candidate.personalEmail),
    ccRolesRequested: ccRoles.requestedRoles,
    ccRolesApplied: ccRoles.appliedRoles,
    ccDuplicateRolesRemoved: ccRoles.duplicateRolesRemoved,
    ccApprovedAddressConfiguredRoles: configuredCcRoles,
    stageTwoRequiresApprovedAddresses: ccRoles.appliedRoles,
  }
}

function resolveRawRecipients(candidate, requestedCcRoles = REQUESTED_CC_ROLES) {
  const to = normalizeText(candidate.personalEmail)
  if (!validEmail(to)) throw new Error('Personal Email is missing or invalid.')
  const ccRoles = resolveCcRoles(candidate.targetName, requestedCcRoles)
  const missingRoles = []
  const cc = []
  for (const role of ccRoles.appliedRoles) {
    const email = getRoleEmail(role, candidate)
    if (!validEmail(email)) {
      missingRoles.push(role)
      continue
    }
    if (email.toLowerCase() !== to.toLowerCase() && !cc.some(item => item.toLowerCase() === email.toLowerCase())) {
      cc.push(email)
    }
  }
  if (missingRoles.length) {
    throw new Error('Missing approved CC address configuration for: ' + missingRoles.join(', '))
  }
  return { to, cc: cc.join(', ') }
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
  const personalEmail = normalizeText(taskFields.get('Personal Email'))
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
    personalEmail,
    personalEmailPresent: Boolean(personalEmail),
    contractLinkPresent: Boolean(contractLink),
    missingFields,
  }
}

function buildEligibility(candidate, activeSendAttempt = null) {
  const blockers = []
  const todayDue = candidate.dueDate && candidate.overdueDays >= 0
  if (!candidate.realStartDate) blockers.push('missing_real_start_date')
  if (candidate.dueDate && candidate.overdueDays < 0) blockers.push('not_due')
  if (candidate.overdueDays != null && candidate.overdueDays > AGENT_FEEDBACK_SEND_WINDOW_DAYS) blockers.push('expired_send_window')
  if (!candidate.personalEmailPresent) blockers.push('missing_personal_email')
  if (!validEmail(candidate.personalEmail)) blockers.push('invalid_personal_email')
  if (!candidate.contractLinkPresent) blockers.push('missing_contract_link')
  if (candidate.missingFields.length) blockers.push('missing_feedback_fields')
  if (candidate.normalizedStatus === 'requested') blockers.push('already_requested')
  if (CLOSED_STATUSES.has(candidate.normalizedStatus)) blockers.push('already_closed')
  if (activeSendAttempt) blockers.push('duplicate_send_attempt_exists')

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
  const token = createAgentFeedbackToken({
    taskId: candidate.taskId,
    agentName: candidate.taskName || targetName,
    milestoneDay,
  })
  const tokenHash = hashAgentFeedbackToken(token)
  const activeSendAttempt = await getActiveAgentFeedbackSendAttempt({
    taskId: candidate.taskId,
    milestoneDay,
  })
  const eligibility = buildEligibility(candidate, activeSendAttempt)
  const recipientPlan = buildRecipientPlan(candidate, splitList(options.ccRoles).length ? splitList(options.ccRoles) : REQUESTED_CC_ROLES)
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
    recipientPlan,
    email: {
      subject: email.subject,
      senderRole: emailConfig.senderRole,
      fromName: emailConfig.fromName,
      replyToRole: emailConfig.replyToRole,
      ccSupported: true,
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
  const ccRoles = Array.isArray(approval.ccRoles) ? approval.ccRoles.map(role => normalizeText(role).toLowerCase()) : []
  const ok = approval.sendApproved === true &&
    approval.approvedBy === 'Steve' &&
    normalizeText(approval.targetName).toLowerCase() === 'georgia' &&
    Number(approval.milestoneDay) === Number(proof?.milestone?.day || AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE) &&
    normalizeText(approval.recipientRule) === 'clickup-personal-email' &&
    approval.oneSendLimit === true &&
    REQUESTED_CC_ROLES.every(role => ccRoles.includes(role)) &&
    ccRoles.every(role => APPROVED_CC_ROLES.has(role))
  if (!ok) {
    throw new Error('Real send requires Steve SEND APPROVED naming Georgia, milestone/day, recipient rule, CC roles, and one-send limit.')
  }
  return true
}

export async function executeApprovedAgentFeedbackSend(options = {}) {
  const proof = await buildAgentFeedbackDryRunProof(options)
  validateRouteSpecificSendApproval(options.approval || {}, proof)
  if (!proof.eligibility.eligible) {
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
  })
  const tokenHash = hashAgentFeedbackToken(token)
  const emailConfig = resolveEmailConfig()
  const { to, cc } = resolveRawRecipients(candidate, REQUESTED_CC_ROLES)
  const attempt = await createAgentFeedbackSendAttempt({
    taskId: candidate.taskId,
    agentName: candidate.taskName,
    milestoneDay: candidate.milestoneDay,
    tokenHash,
    metadata: {
      target: 'Georgia',
      recipientRule: 'clickup-personal-email',
      ccRoles: proof.recipientPlan.ccRolesApplied,
      oneSendLimit: true,
    },
  })

  try {
    const email = buildAgentFeedbackEmail({
      agentName: candidate.taskName,
      milestoneDay: candidate.milestoneDay,
      feedbackUrl: buildPublicFeedbackUrl(token),
    })
    const gmail = await sendGmailMessage(emailConfig.fromEmail, {
      to,
      cc,
      replyTo: emailConfig.replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
      fromName: emailConfig.fromName,
    })
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
      gmail: {
        messageId: gmail.id || '',
        threadId: gmail.threadId || '',
      },
      clickUpRequestedWritten: true,
    }
  } catch (error) {
    await updateAgentFeedbackSendAttemptStatus(attempt.id, {
      status: 'failed',
      metadata: { errorClass: error instanceof Error ? error.name : 'Error' },
    })
    throw error
  }
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
  'missing_personal_email',
  'invalid_personal_email',
  'missing_contract_link',
  'missing_feedback_fields',
  'already_requested',
  'already_closed',
  'duplicate_send_attempt_exists',
])

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
    'clickup-personal-email',
    'stage-1-dry-run-send-infrastructure',
  ]), 'send module includes dry-run, approval gate, and duplicate protection', 'lib/agent-feedback-send.js')
  addFinding(findings, includesAll(googleDelegatedSource, ['Cc:', 'Reply-To:', 'replyTo']), 'Gmail helper supports CC and reply-to additively', 'sendGmailMessage')
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
  addFinding(findings, proof.recipientPlan?.recipientRule === 'clickup-personal-email', 'recipient rule is ClickUp Personal Email', proof.recipientPlan?.recipientRule || 'missing')
  addFinding(findings, proof.recipientPlan?.ccRolesApplied?.includes('steve') && proof.recipientPlan?.ccRolesApplied?.includes('carson') && proof.recipientPlan?.ccRolesApplied?.includes('ryan'), 'CC roles include Steve, Carson, and Ryan', (proof.recipientPlan?.ccRolesApplied || []).join(', '))
  addFinding(findings, proof.recipientPlan?.ccDuplicateRolesRemoved?.includes('georgia'), 'Georgia is not duplicated in CC when she is To', (proof.recipientPlan?.ccDuplicateRolesRemoved || []).join(', ') || 'none')
  addFinding(findings, Boolean(proof.token?.tokenHash) && proof.token?.tokenUrlLogged === false, 'token proof is hash-only', proof.token?.tokenHash || 'missing')
  addFinding(findings, proof.clickUpWritebackPlan?.dryRunWritesRequested === false && /after Gmail send succeeds/i.test(proof.clickUpWritebackPlan?.sequence || ''), 'dry-run does not write Requested and sequence is Gmail-first', proof.clickUpWritebackPlan?.sequence || 'missing')
  addFinding(findings, proof.sideEffects?.gmailSent === false && proof.sideEffects?.clickUpRequestedWritten === false, 'Stage 1 proof has no external side effects', JSON.stringify(proof.sideEffects || {}))
  addFinding(findings, proof.email?.senderRole === 'delegated-google-user' && proof.email?.fromName && proof.email?.replyToRole, 'sender/from-name/reply-to behavior is explicit', `${proof.email?.senderRole || ''}/${proof.email?.fromName || ''}/${proof.email?.replyToRole || ''}`)
  addFinding(findings, !hasPrivateProofLeak(dryRunArtifact), 'dry-run artifact has no raw email addresses, token URLs, or feedback content', AGENT_FEEDBACK_SEND_DRY_RUN_PROOF_PATH)
  addFinding(findings, !hasPrivateProofLeak(buildLogSource), 'build log source has no raw email addresses, token URLs, or feedback content for send closeout', 'metadata-only')
  addFinding(findings, sendCard?.lane === 'done' && /agent-feedback-send-v1/.test(sendCard?.statusNote || ''), 'send card is closed as Stage 1 only', sendCard?.lane || 'missing')
  addFinding(findings, stageTwoCard?.lane === 'scoped', 'Stage 2 Georgia send follow-up remains scoped', stageTwoCard?.lane || 'missing')
  addFinding(findings, agentSystem?.implementationState === 'partial', 'Agent Onboarding Feedback system remains partial until approved send', agentSystem?.implementationState || 'missing')
  addFinding(findings, closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_SEND_CARD_ID), 'closeout owns only send card', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, closeout?.mentionedBacklogIds?.includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID), 'closeout mentions Stage 2 follow-up as context only', (closeout?.mentionedBacklogIds || []).join(', ') || 'missing')
  addFinding(findings, currentPlan.includes(AGENT_FEEDBACK_SEND_CARD_ID) && currentPlan.includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID), 'current plan records Stage 1 and Stage 2 boundary', 'current-plan')
  addFinding(findings, currentState.includes(AGENT_FEEDBACK_SEND_CARD_ID) && currentState.includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID), 'current state records Stage 1 and Stage 2 boundary', 'current-state')

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
      blockers: proof.eligibility?.blockers || [],
      ccRolesApplied: proof.recipientPlan?.ccRolesApplied || [],
      ccDuplicateRolesRemoved: proof.recipientPlan?.ccDuplicateRolesRemoved || [],
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
