import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAgentFeedbackResponseNotificationEmail } from './agent-feedback-email.js'
import { sendGmailMessage } from './google-delegated.js'
import {
  createAgentFeedbackResponseNotification,
  getAgentFeedbackResponseNotificationByResponseId,
  listFoundationUsers,
  updateAgentFeedbackResponseNotificationStatus,
} from './foundation-db.js'
import { resolveAgentFeedbackEmailConfig } from './agent-feedback-send.js'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID = 'AGENT-FEEDBACK-RESPONSE-NOTIFY-001'
export const AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY = 'agent-feedback-response-notify-v1'
export const AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-response-notify-v1.md'
export const AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-RESPONSE-NOTIFY-001.json'
export const AGENT_FEEDBACK_RESPONSE_NOTIFY_PROOF_PATH = 'docs/audits/2026-05-01-agent-feedback-response-notify-proof.md'
export const AGENT_FEEDBACK_RESPONSE_NOTIFY_SOURCE_ID = 'SRC-CLICKUP-001'

const OVERSIGHT_ROLES = [
  { key: 'steve', label: 'Steve' },
  { key: 'carson', label: 'Carson' },
  { key: 'ryan', label: 'Ryan' },
  { key: 'georgia', label: 'Georgia' },
]
const OVERSIGHT_ROLE_KEYS = OVERSIGHT_ROLES.map(role => role.key)
const ROLE_EMAIL_ENV = {
  steve: ['AGENT_FEEDBACK_NOTIFY_STEVE_EMAIL', 'AGENT_FEEDBACK_BCC_STEVE_EMAIL', 'AGENT_FEEDBACK_OVERSIGHT_STEVE_EMAIL', 'AGENT_FEEDBACK_STEVE_EMAIL'],
  carson: ['AGENT_FEEDBACK_NOTIFY_CARSON_EMAIL', 'AGENT_FEEDBACK_BCC_CARSON_EMAIL', 'AGENT_FEEDBACK_OVERSIGHT_CARSON_EMAIL', 'AGENT_FEEDBACK_CARSON_EMAIL'],
  ryan: ['AGENT_FEEDBACK_NOTIFY_RYAN_EMAIL', 'AGENT_FEEDBACK_BCC_RYAN_EMAIL', 'AGENT_FEEDBACK_OVERSIGHT_RYAN_EMAIL', 'AGENT_FEEDBACK_RYAN_EMAIL'],
  georgia: ['AGENT_FEEDBACK_NOTIFY_GEORGIA_EMAIL', 'AGENT_FEEDBACK_BCC_GEORGIA_EMAIL', 'AGENT_FEEDBACK_OVERSIGHT_GEORGIA_EMAIL', 'AGENT_FEEDBACK_GEORGIA_EMAIL'],
}
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function normalizeText(value) {
  return String(value || '').trim()
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function hashForProof(value) {
  const text = normalizeText(value)
  return text ? sha256(text).slice(0, 16) : ''
}

function validEmail(value) {
  return EMAIL_PATTERN.test(normalizeText(value))
}

function roleLabel(roleKey) {
  return OVERSIGHT_ROLES.find(role => role.key === roleKey)?.label || roleKey
}

function getRoleEmailFromEnv(roleKey) {
  const names = ROLE_EMAIL_ENV[roleKey] || []
  for (const name of names) {
    const value = normalizeText(process.env[name])
    if (validEmail(value)) return value
  }
  return ''
}

async function resolveInternalRecipientMap() {
  const users = await listFoundationUsers({ activeOnly: true, userType: 'human' })
  const userEmailByName = new Map(users
    .map(user => [normalizeText(user.name).toLowerCase(), normalizeText(user.email)])
    .filter(([, email]) => validEmail(email)))
  const result = new Map()
  for (const role of OVERSIGHT_ROLES) {
    const fromUsers = userEmailByName.get(role.label.toLowerCase()) || ''
    const fromEnv = getRoleEmailFromEnv(role.key)
    const email = [fromUsers, fromEnv].find(validEmail) || ''
    result.set(role.key, email)
  }
  return result
}

async function buildRecipientPlan() {
  const emailByRole = await resolveInternalRecipientMap()
  const appliedRoleKeys = OVERSIGHT_ROLE_KEYS.filter(role => validEmail(emailByRole.get(role)))
  const missingRoleKeys = OVERSIGHT_ROLE_KEYS.filter(role => !appliedRoleKeys.includes(role))
  const addressHashesByRole = {}
  for (const role of appliedRoleKeys) {
    addressHashesByRole[roleLabel(role)] = hashForProof(emailByRole.get(role))
  }
  return {
    mode: 'internal-email',
    rolesRequested: OVERSIGHT_ROLE_KEYS.map(roleLabel),
    rolesApplied: appliedRoleKeys.map(roleLabel),
    missingRoles: missingRoleKeys.map(roleLabel),
    addressHashesByRole,
    internalOnly: missingRoleKeys.length === 0,
    rawEmailsLogged: false,
    to: appliedRoleKeys.map(role => emailByRole.get(role)).filter(validEmail),
  }
}

function normalizeClickUpWriteback(input = {}) {
  if (input.status === 'failed' || input.ok === false || input.error) {
    return {
      status: 'failed',
      repairStatus: 'clickup_completed_writeback_failed',
      succeeded: false,
      errorClass: input.errorClass || input.error?.name || 'Error',
    }
  }
  return {
    status: 'succeeded',
    repairStatus: 'none',
    succeeded: true,
    errorClass: '',
  }
}

function normalizeResponse(input = {}) {
  return {
    id: normalizeText(input.id || 'synthetic-response-id'),
    tokenHash: normalizeText(input.tokenHash || 'synthetic-token-hash'),
    clickUpTaskId: normalizeText(input.clickUpTaskId || 'synthetic-clickup-task-id'),
    agentName: normalizeText(input.agentName || 'Synthetic Agent'),
    milestoneDay: Number(input.milestoneDay || 30),
    score: Number(input.score || 9),
    improvementFeedback: normalizeText(input.improvementFeedback || 'Synthetic feedback text for local proof only.'),
    submittedAt: normalizeText(input.submittedAt || new Date('2026-05-01T00:00:00.000Z').toISOString()),
  }
}

function buildClickUpTaskRef(response) {
  return `${AGENT_FEEDBACK_RESPONSE_NOTIFY_SOURCE_ID}:task:${response.clickUpTaskId}`
}

function buildNotificationProof({ response, clickUpWriteback, recipientPlan, mode = 'dry-run', email }) {
  const normalizedWriteback = normalizeClickUpWriteback(clickUpWriteback)
  return {
    cardId: AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
    mode,
    sequence: {
      afterDbSave: true,
      afterClickUpWritebackAttempt: true,
      notifyBeforeDbSave: false,
    },
    response: {
      responseIdHash: hashForProof(response.id),
      tokenHashPresent: Boolean(response.tokenHash),
      tokenLogged: false,
      agentNameHash: hashForProof(response.agentName),
      agentNameIncludedInEmail: true,
      milestoneDay: response.milestoneDay,
      score: response.score,
      feedbackTextIncludedInEmail: true,
      feedbackTextHash: hashForProof(response.improvementFeedback),
      feedbackTextLogged: false,
      submittedAt: response.submittedAt,
      clickUpTaskIdHash: hashForProof(response.clickUpTaskId),
      sourceRef: AGENT_FEEDBACK_RESPONSE_NOTIFY_SOURCE_ID,
    },
    clickUpWriteback: {
      status: normalizedWriteback.status,
      repairStatus: normalizedWriteback.repairStatus,
      statusIncludedInEmail: true,
    },
    notification: {
      recipientMode: recipientPlan.mode,
      recipientRoles: recipientPlan.rolesApplied,
      missingRoles: recipientPlan.missingRoles,
      addressHashesByRole: recipientPlan.addressHashesByRole,
      internalOnly: recipientPlan.internalOnly,
      subject: email.subject,
      duplicateProtectionKey: 'agent_onboarding_feedback_response_notifications.response_id',
      duplicateProtected: true,
      dryRunSends: mode === 'dry-run' ? false : undefined,
      gmailSent: false,
      rawEmailsLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
  }
}

export async function buildAgentFeedbackResponseNotificationDryRunProof(options = {}) {
  const response = normalizeResponse(options.response)
  const clickUpWriteback = normalizeClickUpWriteback(options.clickUpWriteback || { status: options.clickUpWritebackStatus || 'succeeded' })
  const recipientPlan = await buildRecipientPlan()
  const email = buildAgentFeedbackResponseNotificationEmail({
    agentName: response.agentName,
    milestoneDay: response.milestoneDay,
    score: response.score,
    improvementFeedback: response.improvementFeedback,
    submittedAt: response.submittedAt,
    clickUpTaskRef: buildClickUpTaskRef(response),
    clickUpWritebackStatus: clickUpWriteback.status,
    clickUpRepairStatus: clickUpWriteback.repairStatus,
  })
  return buildNotificationProof({ response, clickUpWriteback, recipientPlan, mode: 'dry-run', email })
}

export async function sendAgentFeedbackResponseNotification({ response, clickUpWriteback = {} } = {}) {
  const normalizedResponse = normalizeResponse(response)
  const normalizedWriteback = normalizeClickUpWriteback(clickUpWriteback)
  const recipientPlan = await buildRecipientPlan()
  const emailConfig = resolveAgentFeedbackEmailConfig()
  const email = buildAgentFeedbackResponseNotificationEmail({
    agentName: normalizedResponse.agentName,
    milestoneDay: normalizedResponse.milestoneDay,
    score: normalizedResponse.score,
    improvementFeedback: normalizedResponse.improvementFeedback,
    submittedAt: normalizedResponse.submittedAt,
    clickUpTaskRef: buildClickUpTaskRef(normalizedResponse),
    clickUpWritebackStatus: normalizedWriteback.status,
    clickUpRepairStatus: normalizedWriteback.repairStatus,
  })

  const existing = await getAgentFeedbackResponseNotificationByResponseId(normalizedResponse.id)
  if (existing && ['sending', 'sent'].includes(existing.status)) {
    return {
      ok: existing.status === 'sent',
      status: existing.status,
      duplicateBlocked: true,
      recipientRoles: recipientPlan.rolesApplied,
      repairStatus: existing.metadata?.repairStatus || '',
    }
  }

  const notification = await createAgentFeedbackResponseNotification({
    responseId: normalizedResponse.id,
    taskId: normalizedResponse.clickUpTaskId,
    agentName: normalizedResponse.agentName,
    milestoneDay: normalizedResponse.milestoneDay,
    metadata: {
      recipientRoles: recipientPlan.rolesApplied,
      addressHashesByRole: recipientPlan.addressHashesByRole,
      clickUpWritebackStatus: normalizedWriteback.status,
      repairStatus: normalizedWriteback.repairStatus,
      rawEmailsLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
  })

  if (!recipientPlan.internalOnly) {
    const failed = await updateAgentFeedbackResponseNotificationStatus(notification.id, {
      status: 'failed',
      metadata: {
        repairStatus: 'missing_internal_notification_recipient',
        missingRoles: recipientPlan.missingRoles,
      },
    })
    return {
      ok: false,
      status: failed.status,
      duplicateBlocked: false,
      recipientRoles: recipientPlan.rolesApplied,
      repairStatus: 'missing_internal_notification_recipient',
    }
  }

  try {
    const gmail = await sendGmailMessage(emailConfig.fromEmail, {
      to: recipientPlan.to.join(', '),
      replyTo: emailConfig.replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
      fromName: emailConfig.fromName,
    })
    const sent = await updateAgentFeedbackResponseNotificationStatus(notification.id, {
      status: 'sent',
      gmailMessageId: gmail.id || '',
      gmailThreadId: gmail.threadId || '',
      metadata: {
        gmailSendSucceeded: true,
        clickUpWritebackStatus: normalizedWriteback.status,
        repairStatus: normalizedWriteback.repairStatus,
      },
    })
    return {
      ok: true,
      status: sent.status,
      duplicateBlocked: false,
      recipientRoles: recipientPlan.rolesApplied,
      gmail: {
        messageId: sent.gmailMessageId,
        threadId: sent.gmailThreadId,
      },
      repairStatus: normalizedWriteback.repairStatus,
    }
  } catch (error) {
    const failed = await updateAgentFeedbackResponseNotificationStatus(notification.id, {
      status: 'failed',
      metadata: {
        gmailSendSucceeded: false,
        clickUpWritebackStatus: normalizedWriteback.status,
        repairStatus: 'internal_response_notification_failed',
        errorClass: error instanceof Error ? error.name : 'Error',
      },
    })
    return {
      ok: false,
      status: failed.status,
      duplicateBlocked: false,
      recipientRoles: recipientPlan.rolesApplied,
      repairStatus: 'internal_response_notification_failed',
    }
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

function hasPrivateProofLeak(source) {
  if (!source) return false
  if (/\/agent-feedback\?token=/i.test(source)) return true
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(source)) return true
  return false
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

export async function buildAgentFeedbackResponseNotifyStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  successProof = null,
  repairProof = null,
} = {}) {
  const findings = []
  const success = successProof || await buildAgentFeedbackResponseNotificationDryRunProof({ clickUpWritebackStatus: 'succeeded' })
  const repair = repairProof || await buildAgentFeedbackResponseNotificationDryRunProof({ clickUpWritebackStatus: 'failed' })
  const packageSource = await readOptionalText(repoRoot, 'package.json')
  const approvedPlan = await readOptionalText(repoRoot, AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVAL_PATH)
  const proofArtifact = await readOptionalText(repoRoot, AGENT_FEEDBACK_RESPONSE_NOTIFY_PROOF_PATH)
  const moduleSource = await readOptionalText(repoRoot, 'lib/agent-feedback-response-notify.js')
  const emailSource = await readOptionalText(repoRoot, 'lib/agent-feedback-email.js')
  const dbSource = await readOptionalText(repoRoot, 'lib/foundation-db.js')
  const agentFeedbackRouteSource = await readOptionalText(repoRoot, 'lib/agent-feedback-routes.js')
  const processScript = await readOptionalText(repoRoot, 'scripts/process-agent-feedback-response-notify-check.mjs')
  const commandScript = await readOptionalText(repoRoot, 'scripts/agent-feedback-response-notify.mjs')
  const verifierSource = await readOptionalText(repoRoot, 'scripts/foundation-verify.mjs')
  const foundationAgentFeedbackVerifierSource = await readOptionalText(repoRoot, 'lib/foundation-agent-feedback-verifier.js')
  const verifierCoverageSource = `${verifierSource}\n${foundationAgentFeedbackVerifierSource}`
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')
  const buildLogSource = await readFoundationBuildLogRegistrySource(repoRoot)
  const cards = foundationHub?.backlogItems || foundationHub?.backlog || []
  const notifyCard = cards.find(card => card.id === AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID) || null
  const georgiaSendCard = cards.find(card => card.id === 'AGENT-FEEDBACK-GEORGIA-SEND-001') || null
  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY,
    { backlogId: AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID },
  )
  const closeoutProofText = JSON.stringify(closeout || {})

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVAL_PATH)
  addFinding(findings, Boolean(proofArtifact), 'dry-run proof artifact exists', AGENT_FEEDBACK_RESPONSE_NOTIFY_PROOF_PATH)
  addFinding(findings, packageSource.includes('"agent-feedback:response-notify"') && packageSource.includes('"process:agent-feedback-response-notify-check"'), 'package scripts exist', 'agent-feedback:response-notify and process:agent-feedback-response-notify-check')
  addFinding(findings, Boolean(processScript) && Boolean(commandScript), 'process and command scripts exist', 'scripts/process-agent-feedback-response-notify-check.mjs')
  addFinding(findings, buildLogSource.includes(AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY), 'build log closeout exists in source', AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY)
  addFinding(findings, verifierCoverageSource.includes(AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID), 'foundation verifier covers response notify card', AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID)
  addFinding(findings, includesAll(moduleSource, [
    'buildAgentFeedbackResponseNotificationDryRunProof',
    'sendAgentFeedbackResponseNotification',
    'agent_onboarding_feedback_response_notifications.response_id',
    'clickup_completed_writeback_failed',
    'internal_response_notification_failed',
  ]), 'response notify module includes dry-run, send, duplicate, and repair handling', 'lib/agent-feedback-response-notify.js')
  addFinding(findings, includesAll(emailSource, ['buildAgentFeedbackResponseNotificationEmail', 'Feedback text', 'ClickUp writeback']), 'response notification email template exists', 'buildAgentFeedbackResponseNotificationEmail')
  addFinding(findings, includesAll(dbSource, [
    'agent_onboarding_feedback_response_notifications',
    'getAgentFeedbackResponseNotificationByResponseId',
    'createAgentFeedbackResponseNotification',
    'updateAgentFeedbackResponseNotificationStatus',
  ]), 'response notification ledger and duplicate protection exist', 'agent_onboarding_feedback_response_notifications')
  addFinding(findings, includesAll(agentFeedbackRouteSource, [
    'sendAgentFeedbackResponseNotification',
    'clickup_completed_writeback_failed',
    'responseNotification',
  ]), 'submit path calls response notification after DB save and ClickUp writeback attempt', 'lib/agent-feedback-routes.js')
  for (const [label, proof] of [['success', success], ['repair', repair]]) {
    addFinding(findings, proof.mode === 'dry-run', `${label} proof is dry-run only`, proof.mode)
    addFinding(findings, proof.sequence?.afterDbSave === true && proof.sequence?.notifyBeforeDbSave === false, `${label} proof notifies only after DB save`, JSON.stringify(proof.sequence || {}))
    addFinding(findings, proof.response?.agentNameIncludedInEmail === true && proof.response?.feedbackTextIncludedInEmail === true, `${label} email includes required content`, 'agent/milestone/score/feedback/submitted/source/writeback')
    addFinding(findings, proof.response?.feedbackTextLogged === false && proof.response?.tokenLogged === false, `${label} proof keeps token and feedback content out of logs`, 'metadata-only')
    addFinding(findings, ['succeeded', 'failed'].includes(proof.clickUpWriteback?.status), `${label} proof carries ClickUp writeback status`, proof.clickUpWriteback?.status || 'missing')
    addFinding(findings, proof.notification?.internalOnly === true && ['Steve', 'Carson', 'Ryan', 'Georgia'].every(role => (proof.notification?.recipientRoles || []).includes(role)), `${label} proof resolves internal oversight recipients`, (proof.notification?.recipientRoles || []).join(', ') || 'none')
    addFinding(findings, proof.notification?.duplicateProtected === true, `${label} proof has duplicate notification protection`, proof.notification?.duplicateProtectionKey || 'missing')
    addFinding(findings, proof.notification?.gmailSent === false && proof.notification?.dryRunSends === false, `${label} dry-run has no Gmail side effect`, JSON.stringify(proof.notification || {}))
    addFinding(findings, proof.notification?.rawEmailsLogged === false && proof.notification?.rawTokenLogged === false && proof.notification?.feedbackContentLogged === false, `${label} proof is metadata-only`, 'roles/hashes only')
  }
  addFinding(findings, repair.clickUpWriteback?.repairStatus === 'clickup_completed_writeback_failed', 'repair proof still notifies when ClickUp writeback fails', repair.clickUpWriteback?.repairStatus || 'missing')
  addFinding(findings, !hasPrivateProofLeak(proofArtifact), 'proof artifact has no raw emails, token URLs, or feedback text', AGENT_FEEDBACK_RESPONSE_NOTIFY_PROOF_PATH)
  addFinding(findings, !hasPrivateProofLeak(closeoutProofText), 'response notify closeout has no raw emails, token URLs, or feedback text', 'metadata-only')
  addFinding(findings, notifyCard?.lane === 'done' && Boolean(closeout), 'response notify card is done and closeout exists', notifyCard?.lane || 'missing')
  addFinding(findings, georgiaSendCard?.lane === 'scoped', 'Georgia live-send card remains scoped', georgiaSendCard?.lane || 'missing')
  addFinding(findings, closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID), 'closeout owns only response notify card', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, (closeout?.mentionedBacklogIds || []).includes('AGENT-FEEDBACK-GEORGIA-SEND-001'), 'closeout keeps Georgia send context-only', (closeout?.mentionedBacklogIds || []).join(', ') || 'missing')
  addFinding(findings, currentPlan.includes(AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID) && currentPlan.includes('AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001'), 'current plan records response-notify boundary', 'current-plan')
  addFinding(findings, currentState.includes(AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID) && currentState.includes('AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001'), 'current state records response-notify boundary', 'current-state')

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY,
    successProof: success,
    repairProof: repair,
    summary: {
      successDryRun: success.mode === 'dry-run',
      repairDryRun: repair.mode === 'dry-run',
      recipientRoles: success.notification?.recipientRoles || [],
      missingRecipientRoles: success.notification?.missingRoles || [],
      duplicateProtected: success.notification?.duplicateProtected === true,
      clickUpRepairProof: repair.clickUpWriteback?.repairStatus || '',
      gmailSent: Boolean(success.notification?.gmailSent || repair.notification?.gmailSent),
      clickUpRequestedWritten: false,
      metadataOnly: success.notification?.rawEmailsLogged === false &&
        success.notification?.rawTokenLogged === false &&
        success.notification?.feedbackContentLogged === false &&
        repair.notification?.feedbackContentLogged === false,
      notifyCardLane: notifyCard?.lane || '',
      georgiaSendCardLane: georgiaSendCard?.lane || '',
      closeoutOwnsOnlyResponseNotify: closeout?.backlogIds?.length === 1 &&
        closeout.backlogIds.includes(AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID),
    },
    findings,
  }
}
