import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'
import { getGmailMessage } from './google-delegated.js'
import { buildAgentFeedbackReminderDryRunReport } from './agent-feedback-reminders.js'
import {
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
} from './agent-feedback-company-email-policy.js'
import {
  AGENT_FEEDBACK_SEND_SOURCE_ID,
  buildAgentFeedbackDryRunProof,
  executeApprovedAgentFeedbackSend,
  hashAgentFeedbackProofValue,
  loadAgentFeedbackCandidateForTarget,
  normalizeAgentFeedbackText,
  resolveAgentFeedbackEmailConfig,
} from './agent-feedback-send.js'
import {
  getActiveAgentFeedbackSendAttempt,
  getAgentFeedbackResponseNotificationByResponseId,
  getAgentOnboardingFeedbackResponseForMilestone,
  listAgentFeedbackSendAttemptsForMilestone,
  listAgentOnboardingFeedbackResponsesForMilestone,
  supersedeAgentFeedbackSendAttemptForRepair,
  supersedeAgentOnboardingFeedbackResponseForRepair,
} from './foundation-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID = 'AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001'
export const AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY = 'agent-feedback-real-user-submit-repair-v1'
export const AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-real-user-submit-repair-v1.md'
export const AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001.json'
export const AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_PROOF_PATH = 'docs/audits/2026-05-01-agent-feedback-real-user-submit-repair-proof.md'
export const AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_TARGET = 'Steve Zahnd'
export const AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_MILESTONE_DAY = 30

const ACTIVE_SEND_STATUSES = new Set(['sending', 'sent', 'clickup_requested'])
const REQUIRED_BCC_ROLES = ['Steve', 'Carson', 'Ryan', 'Georgia']
const REPAIR_REASON = 'live_token_consumed_by_script_before_real_user_submit'

function normalizeText(value) {
  return normalizeAgentFeedbackText(value)
}

function normalizeRole(value) {
  return normalizeText(value).toLowerCase()
}

function activeAttempt(attempts = []) {
  return attempts.find(attempt => ACTIVE_SEND_STATUSES.has(attempt.status)) || null
}

function isScriptConsumedResponse(response = {}) {
  const metadata = response.metadata || {}
  return metadata.testSubmission === true ||
    metadata.actor === 'agent-feedback-steve-full-loop-test' ||
    String(response.userAgent || '').includes('agent-feedback-steve-full-loop-test')
}

function isSuperseded(record = {}) {
  return record.metadata?.supersededByRepair === true
}

function isRepairAttempt(attempt = {}) {
  return attempt.metadata?.repairCardId === AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID &&
    attempt.metadata?.manualUserSubmit === true
}

function isRealBrowserResponse(response = {}, repairAttempt = null) {
  if (!response || !repairAttempt) return false
  const metadata = response.metadata || {}
  return response.tokenHash === repairAttempt.tokenHash &&
    !isSuperseded(response) &&
    metadata.testSubmission !== true &&
    metadata.actor !== 'agent-feedback-steve-full-loop-test' &&
    !String(response.userAgent || '').includes('agent-feedback-steve-full-loop-test')
}

function sanitizeAttempt(attempt = null) {
  if (!attempt) return null
  return {
    exists: true,
    status: attempt.status || '',
    tokenHash: attempt.tokenHash ? String(attempt.tokenHash).slice(0, 16) : '',
    gmailMessageIdPresent: Boolean(attempt.gmailMessageId),
    gmailThreadIdPresent: Boolean(attempt.gmailThreadId),
    metadata: {
      repairCardId: attempt.metadata?.repairCardId || '',
      manualUserSubmit: attempt.metadata?.manualUserSubmit === true,
      syntheticSubmitLiveToken: attempt.metadata?.syntheticSubmitLiveToken === true,
      bccRoles: attempt.metadata?.bccRoles || [],
      bccActualSendRoles: attempt.metadata?.bccActualSendRoles || [],
      bccRecipientDedupedRoles: attempt.metadata?.bccRecipientDedupedRoles || [],
      previousScriptConsumedEvidence: attempt.metadata?.previousScriptConsumedEvidence === true,
    },
  }
}

function sanitizeResponse(response = null) {
  if (!response) return null
  return {
    exists: true,
    responseIdHash: hashAgentFeedbackProofValue(response.id),
    tokenHash: response.tokenHash ? String(response.tokenHash).slice(0, 16) : '',
    taskIdHash: hashAgentFeedbackProofValue(response.clickUpTaskId),
    agentNameHash: hashAgentFeedbackProofValue(response.agentName),
    milestoneDay: Number(response.milestoneDay),
    score: Number(response.score),
    submittedAt: response.submittedAt || '',
    browserUserAgentPresent: Boolean(response.userAgent),
    scriptSubmission: isScriptConsumedResponse(response),
    supersededByRepair: isSuperseded(response),
    feedbackTextLogged: false,
  }
}

function sanitizeNotification(notification = null) {
  if (!notification) return null
  return {
    exists: true,
    status: notification.status || '',
    gmailMessageIdPresent: Boolean(notification.gmailMessageId),
    gmailThreadIdPresent: Boolean(notification.gmailThreadId),
    recipientRoles: notification.metadata?.recipientRoles || [],
    clickUpWritebackStatus: notification.metadata?.clickUpWritebackStatus || '',
    repairStatus: notification.metadata?.repairStatus || '',
    rawEmailsLogged: false,
    feedbackContentLogged: false,
  }
}

function sanitizeGmailMetadata(message = null) {
  if (!message) {
    return {
      fetched: false,
      bccHeaderPresent: false,
      bccHeaderHash: '',
      rawEmailsLogged: false,
    }
  }
  return {
    fetched: true,
    messageIdPresent: Boolean(message.id),
    threadIdPresent: Boolean(message.threadId),
    subjectHash: hashAgentFeedbackProofValue(message.subject),
    toHeaderHash: hashAgentFeedbackProofValue(message.to),
    bccHeaderPresent: Boolean(message.bcc),
    bccHeaderHash: hashAgentFeedbackProofValue(message.bcc),
    rawEmailsLogged: false,
  }
}

function extractFeedbackTokenFromGmailMessage(message = {}) {
  const source = [message.body, message.snippet].map(value => String(value || '')).join('\n')
  const match = source.match(/\/agent-feedback\?token=([A-Za-z0-9._-]+)/)
  return match ? match[1] : ''
}

async function loadRepairGmailMessage(attempt = null) {
  if (!attempt?.gmailMessageId) return null
  const emailConfig = resolveAgentFeedbackEmailConfig()
  return getGmailMessage(emailConfig.fromEmail, attempt.gmailMessageId)
}

async function probeDuplicateSubmitMessage(token) {
  if (!token) {
    return {
      probed: false,
      clearMessage: false,
      status: 0,
      code: '',
      message: '',
      errorClass: 'missing-token',
    }
  }
  const baseUrl = String(process.env.AIOS_INTERNAL_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  try {
    const response = await fetch(baseUrl + '/api/agent-feedback/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        score: 10,
        improvementFeedback: 'duplicate-submit-proof',
      }),
    })
    const payload = await response.json().catch(() => ({}))
    const code = String(payload?.error?.code || '')
    const message = String(payload?.error?.message || '')
    return {
      probed: true,
      clearMessage: response.status === 409 &&
        code === 'agent_feedback_link_already_submitted' &&
        message === 'This feedback link has already been submitted.',
      status: response.status,
      code,
      message,
      errorClass: '',
    }
  } catch (error) {
    return {
      probed: true,
      clearMessage: false,
      status: 0,
      code: '',
      message: '',
      errorClass: error instanceof Error ? error.name : 'Error',
    }
  }
}

function hasPrivateProofLeak(source) {
  const text = typeof source === 'string' ? source : JSON.stringify(source || {})
  if (/\/agent-feedback\?token=/i.test(text)) return true
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) return true
  return false
}

function validateRepairApproval(approval = {}, proof = null) {
  const bccRoles = (Array.isArray(approval.bccRoles) ? approval.bccRoles : []).map(normalizeRole)
  const missingRoles = REQUIRED_BCC_ROLES.filter(role => !bccRoles.includes(normalizeRole(role)))
  const ok = approval.cardId === AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID &&
    approval.approvedBy === 'Steve' &&
    approval.sendOnlyApproved === true &&
    approval.syntheticSubmitLiveTokenApproved === false &&
    approval.supersedePreviousScriptArtifactsApproved === true &&
    approval.clickUpStatusResetToRequestedApproved === true &&
    approval.clickUpScoreFeedbackResetApproved === false &&
    approval.productionAutoSendApproved === false &&
    approval.georgiaSendApproved === false &&
    normalizeText(approval.targetName) === AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_TARGET &&
    Number(approval.milestoneDay) === AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_MILESTONE_DAY &&
    normalizeText(approval.recipientRule) === (proof?.recipientPlan?.recipientRule || 'clickup-company-email') &&
    approval.oneSendLimit === true &&
    missingRoles.length === 0
  if (!ok) {
    throw new Error('Real-user submit repair requires Steve approval for Steve Zahnd Day-30 send-only/manual-user mode, previous script-artifact supersede, Requested status reset, no score/feedback reset, and no production or Georgia send.')
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

async function loadRepairRuntime({ now = new Date() } = {}) {
  const candidate = await loadAgentFeedbackCandidateForTarget({
    targetName: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_TARGET,
    milestoneDay: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_MILESTONE_DAY,
    now,
  })
  const [attempts, responses] = await Promise.all([
    listAgentFeedbackSendAttemptsForMilestone({
      taskId: candidate.taskId,
      milestoneDay: candidate.milestoneDay,
    }),
    listAgentOnboardingFeedbackResponsesForMilestone({
      taskId: candidate.taskId,
      milestoneDay: candidate.milestoneDay,
    }),
  ])
  const active = activeAttempt(attempts)
  const repair = attempts.find(isRepairAttempt) || null
  const scriptResponses = responses.filter(isScriptConsumedResponse)
  const realResponse = responses.find(response => isRealBrowserResponse(response, repair || active)) || null
  const responseForNotification = realResponse || null
  const notification = responseForNotification
    ? await getAgentFeedbackResponseNotificationByResponseId(responseForNotification.id)
    : null
  return {
    candidate,
    attempts,
    responses,
    activeAttempt: active,
    repairAttempt: repair,
    scriptResponses,
    realResponse,
    notification,
  }
}

export function buildAgentFeedbackRealUserSyntheticSubmitProof() {
  return {
    mode: 'synthetic-submit-dry-run-only',
    cardId: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
    liveEmailedTokenConsumed: false,
    dbResponseSaved: false,
    clickUpWritebackWritten: false,
    responseNotificationSent: false,
    purpose: 'Synthetic submit proof is code-level only and never consumes a live emailed token.',
  }
}

export async function executeApprovedRealUserSubmitRepairSendOnly({
  approval,
  now = new Date(),
} = {}) {
  const proof = await buildAgentFeedbackDryRunProof({
    targetName: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_TARGET,
    milestoneDay: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_MILESTONE_DAY,
    now,
  })
  validateRepairApproval(approval || {}, proof)

  const runtimeBefore = await loadRepairRuntime({ now })
  const existingRepairActive = runtimeBefore.activeAttempt && isRepairAttempt(runtimeBefore.activeAttempt)
  if (existingRepairActive) {
    throw new Error('Steve real-user repair email has already been sent and is waiting for browser submission.')
  }

  const supersededAttempts = []
  for (const attempt of runtimeBefore.attempts.filter(attempt =>
    ACTIVE_SEND_STATUSES.has(attempt.status) && !isRepairAttempt(attempt)
  )) {
    supersededAttempts.push(await supersedeAgentFeedbackSendAttemptForRepair(attempt.id, {
      repairCardId: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
      repairReason: REPAIR_REASON,
    }))
  }

  const supersededResponses = []
  for (const response of runtimeBefore.scriptResponses.filter(response => !isSuperseded(response))) {
    supersededResponses.push(await supersedeAgentOnboardingFeedbackResponseForRepair(response.id, {
      repairCardId: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
      repairReason: REPAIR_REASON,
    }))
  }

  const send = await executeApprovedAgentFeedbackSend({
    targetName: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_TARGET,
    milestoneDay: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_MILESTONE_DAY,
    approval: {
      sendApproved: true,
      approvedBy: approval.approvedBy,
      targetName: approval.targetName,
      milestoneDay: approval.milestoneDay,
      recipientRule: approval.recipientRule,
      bccRoles: approval.bccRoles,
      oneSendLimit: approval.oneSendLimit,
    },
    allowedEligibilityBlockers: ['already_closed'],
    sendAttemptMetadata: {
      repairCardId: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
      repairReason: REPAIR_REASON,
      manualUserSubmit: true,
      syntheticSubmitLiveToken: false,
      previousScriptConsumedEvidence: runtimeBefore.scriptResponses.length > 0,
      clickUpStatusResetToRequestedApproved: approval.clickUpStatusResetToRequestedApproved === true,
      clickUpScoreFeedbackResetApproved: approval.clickUpScoreFeedbackResetApproved === true,
    },
    now,
  })

  const runtimeAfter = await loadRepairRuntime({ now })
  const freshAttempt = runtimeAfter.activeAttempt
  let gmailMetadata = null
  if (freshAttempt?.gmailMessageId) {
    try {
      const emailConfig = resolveAgentFeedbackEmailConfig()
      gmailMetadata = await getGmailMessage(emailConfig.fromEmail, freshAttempt.gmailMessageId)
    } catch (_error) {
      gmailMetadata = null
    }
  }

  const result = {
    ok: send.ok === true &&
      freshAttempt?.status === 'clickup_requested' &&
      isRepairAttempt(freshAttempt) &&
      runtimeAfter.realResponse === null,
    cardId: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
    mode: 'send-only-manual-user',
    target: {
      label: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_TARGET,
      sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
      taskIdHash: hashAgentFeedbackProofValue(runtimeAfter.candidate.taskId),
      agentNameHash: hashAgentFeedbackProofValue(runtimeAfter.candidate.taskName),
      milestoneDay: runtimeAfter.candidate.milestoneDay,
    },
    previousRun: {
      scriptConsumedEvidencePreserved: runtimeBefore.scriptResponses.length > 0,
      supersededSendAttempts: supersededAttempts.length,
      supersededScriptResponses: supersededResponses.length,
      scoreFeedbackReset: false,
    },
    freshSend: {
      gmailMessageIdPresent: Boolean(send.gmail?.messageId),
      gmailThreadIdPresent: Boolean(send.gmail?.threadId),
      clickUpRequestedWritten: send.clickUpRequestedWritten === true,
      tokenHash: send.tokenHash || '',
      liveEmailedTokenConsumedByScript: false,
      waitingForRealUserBrowserSubmit: true,
    },
    bccProof: {
      rolesApplied: send.recipientPlan?.bccRolesApplied || [],
      actualSendRoles: send.recipientPlan?.bccActualSendRoles || [],
      dedupedRoles: send.recipientPlan?.bccRecipientDedupedRoles || [],
      gmailMetadata: sanitizeGmailMetadata(gmailMetadata),
    },
    boundaries: {
      productionAutoSendEnabled: false,
      georgiaTargeted: false,
      otherRosterSends: false,
      syntheticSubmitLiveToken: false,
      rawEmailLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
  }

  if (hasPrivateProofLeak(result)) throw new Error('Repair send-only proof contains private email or token URL.')
  return result
}

export async function buildAgentFeedbackRealUserSubmitRepairStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  includeDuplicateProbe = false,
} = {}) {
  const findings = []
  const runtime = await loadRepairRuntime()
  const repairAttempt = runtime.repairAttempt || (isRepairAttempt(runtime.activeAttempt) ? runtime.activeAttempt : null)
  const realResponse = runtime.realResponse
  const notification = runtime.notification
  let repairGmailMessage = null
  let duplicateSubmitProbe = {
    probed: false,
    clearMessage: false,
    status: 0,
    code: '',
    message: '',
    errorClass: '',
  }
  if (repairAttempt?.gmailMessageId) {
    try {
      repairGmailMessage = await loadRepairGmailMessage(repairAttempt)
    } catch (_error) {
      repairGmailMessage = null
    }
  }
  const reminderReport = await buildAgentFeedbackReminderDryRunReport({
    includeCandidates: true,
    forceRefresh: true,
  })
  const steveReminder = (reminderReport.candidates || []).find(candidate =>
    candidate.targetLabel === 'Steve' &&
      Number(candidate.milestoneDay) === AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_MILESTONE_DAY
  ) || null
  let duplicateResendBlocked = false
  if (includeDuplicateProbe && repairAttempt) {
    try {
      await executeApprovedAgentFeedbackSend({
        targetName: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_TARGET,
        milestoneDay: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_MILESTONE_DAY,
        approval: {
          sendApproved: true,
          approvedBy: 'Steve',
          targetName: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_TARGET,
          milestoneDay: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_MILESTONE_DAY,
          recipientRule: 'clickup-company-email',
          bccRoles: REQUIRED_BCC_ROLES,
          oneSendLimit: true,
        },
      })
    } catch (error) {
      duplicateResendBlocked = /duplicate_send_attempt_exists|already_closed|already_requested/.test(error instanceof Error ? error.message : String(error))
    }
  }
  if (includeDuplicateProbe && realResponse && repairGmailMessage) {
    duplicateSubmitProbe = await probeDuplicateSubmitMessage(extractFeedbackTokenFromGmailMessage(repairGmailMessage))
  }

  const packageSource = await readOptionalText(repoRoot, 'package.json')
  const serverSource = await readOptionalText(repoRoot, 'server.js')
  const uiSource = await readOptionalText(repoRoot, 'public/agent-feedback.js')
  const fullLoopScript = await readOptionalText(repoRoot, 'scripts/agent-feedback-steve-full-loop-test.mjs')
  const repairScript = await readOptionalText(repoRoot, 'scripts/agent-feedback-real-user-submit-repair.mjs')
  const proofArtifact = await readOptionalText(repoRoot, AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_PROOF_PATH)
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')
  const buildLogSource = await readFoundationBuildLogRegistrySource(repoRoot)
  const cards = foundationHub?.backlogItems || []
  const repairCard = cards.find(card => card.id === AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) || null
  const productionCard = cards.find(card => card.id === AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) || null
  const steveLoopCard = cards.find(card => card.id === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID) || null
  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
    { backlogId: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID },
  )

  function addFinding(ok, check, detail = '') {
    if (!ok) findings.push({ check, detail })
  }

  addFinding(packageSource.includes('"agent-feedback:real-user-submit-repair"') &&
    packageSource.includes('"process:agent-feedback-real-user-submit-repair-check"'), 'package scripts exist', 'real-user repair scripts')
  addFinding(Boolean(repairScript), 'repair command exists', 'scripts/agent-feedback-real-user-submit-repair.mjs')
  addFinding(fullLoopScript.includes('send-only') && fullLoopScript.includes('synthetic-submit'), 'Steve full-loop command is split into send-only and synthetic-submit modes', 'scripts/agent-feedback-steve-full-loop-test.mjs')
  addFinding(serverSource.includes('agent_feedback_link_already_submitted') &&
    serverSource.includes('This feedback link has already been submitted.'), 'submit route returns clear already-submitted error', 'server.js')
  addFinding(uiSource.includes('payload.error.message'), 'feedback UI displays API error messages', 'public/agent-feedback.js')
  addFinding(runtime.scriptResponses.length > 0 && runtime.scriptResponses.every(isSuperseded), 'previous script-consumed response evidence is preserved and superseded', String(runtime.scriptResponses.length))
  addFinding(Boolean(repairAttempt) && repairAttempt.status === 'clickup_requested', 'fresh send-only repair attempt is active after Gmail and Requested', repairAttempt?.status || 'missing')
  addFinding(repairAttempt?.metadata?.manualUserSubmit === true && repairAttempt?.metadata?.syntheticSubmitLiveToken === false, 'fresh attempt waits for real browser submit and does not synth-submit live token', 'manual-user')
  const repairBccRoles = repairAttempt?.metadata?.bccRoles || []
  const repairActualBccRoles = repairAttempt?.metadata?.bccActualSendRoles || []
  const repairDedupedBccRoles = repairAttempt?.metadata?.bccRecipientDedupedRoles || []
  addFinding(REQUIRED_BCC_ROLES.every(role => repairBccRoles.includes(role)) &&
    ['Carson', 'Ryan', 'Georgia'].every(role => repairActualBccRoles.includes(role)) &&
    repairDedupedBccRoles.includes('Steve'), 'BCC roles are recorded with Steve deduped from actual BCC', repairActualBccRoles.join(', ') || 'missing')
  addFinding(Boolean(repairAttempt?.gmailMessageId), 'fresh Steve request has Gmail message proof', repairAttempt?.gmailMessageId ? 'present' : 'missing')
  const gmailMetadata = sanitizeGmailMetadata(repairGmailMessage)
  addFinding(gmailMetadata.fetched && gmailMetadata.bccHeaderPresent, 'Gmail sent metadata proves BCC header present without raw addresses', gmailMetadata.bccHeaderPresent ? 'bcc-present' : 'missing')
  addFinding(Boolean(realResponse), 'real Steve browser response exists', realResponse ? 'present' : 'waiting')
  addFinding(realResponse ? isRealBrowserResponse(realResponse, repairAttempt) : false, 'response came from real browser token, not script', realResponse?.userAgent ? 'browser-user-agent-present' : 'waiting')
  addFinding(notification?.status === 'sent' && notification?.metadata?.clickUpWritebackStatus === 'succeeded', 'ClickUp Completed/Score/Feedback succeeded and internal notification sent', notification?.status || 'waiting')
  const notificationRoles = notification?.metadata?.recipientRoles || []
  addFinding(REQUIRED_BCC_ROLES.every(role => notificationRoles.includes(role)), 'internal notification includes Steve, Carson, Ryan, Georgia', notificationRoles.join(', ') || 'waiting')
  addFinding(steveReminder?.action === 'skipped' && steveReminder?.stop?.reason === 'feedback_completed', 'reminder readiness stops because feedback is completed', steveReminder?.stop?.reason || 'waiting')
  addFinding(!includeDuplicateProbe || duplicateResendBlocked, 'duplicate resend is blocked before side effects', includeDuplicateProbe ? String(duplicateResendBlocked) : 'not probed')
  addFinding(!includeDuplicateProbe || duplicateSubmitProbe.clearMessage, 'duplicate submit gives clear already-submitted message', includeDuplicateProbe ? `${duplicateSubmitProbe.status || 'error'} ${duplicateSubmitProbe.code || duplicateSubmitProbe.errorClass || 'missing'}` : 'not probed')
  const productionCardPreEnableOrClosed = productionCard?.lane === 'scoped' ||
    (productionCard?.lane === 'done' &&
      /agent-feedback-production-autosend-enable-v1/.test(productionCard?.statusNote || ''))
  addFinding(productionCardPreEnableOrClosed, 'production auto-send is either still scoped or closed by the production enable card', productionCard?.lane || 'missing')
  addFinding(steveLoopCard?.lane === 'scoped', 'Steve full-loop remains not accepted until repair passes', steveLoopCard?.lane || 'missing')
  addFinding(!hasPrivateProofLeak(proofArtifact), 'tracked proof is metadata-only', 'metadata-only')
  addFinding(currentPlan.includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) &&
    !currentPlan.includes('after Steve accepts the full-loop proof, dry-run production report first'), 'current plan puts repair before production enablement', 'current-plan')
  addFinding(currentState.includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) &&
    currentState.includes('real browser submission'), 'current state records real-user repair boundary', 'current-state')
  addFinding(!closeout || (closeout.backlogIds || []).length === 1, 'closeout owns only real-user repair card when present', (closeout?.backlogIds || []).join(', ') || 'no closeout yet')
  addFinding(buildLogSource.includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY) || !closeout, 'build-log source is ready for repair closeout or not closed yet', AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY)

  return {
    status: findings.length ? 'risk' : 'healthy',
    phase: realResponse ? 'real_user_submitted' : 'waiting_for_real_user_submit',
    cardId: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
    summary: {
      repairCardLane: repairCard?.lane || '',
      steveLoopCardLane: steveLoopCard?.lane || '',
      productionCardLane: productionCard?.lane || '',
      previousScriptResponses: runtime.scriptResponses.length,
      previousScriptResponsesSuperseded: runtime.scriptResponses.filter(isSuperseded).length,
      freshSendAttempt: sanitizeAttempt(repairAttempt),
      realBrowserResponse: sanitizeResponse(realResponse),
      notification: sanitizeNotification(notification),
      gmailMetadata,
      reminderStopped: steveReminder?.action === 'skipped' && steveReminder?.stop?.reason === 'feedback_completed',
      duplicateResendBlocked,
      duplicateSubmitClearMessage: duplicateSubmitProbe.clearMessage,
      productionAutoSendEnabled: productionCard?.lane === 'done',
      georgiaTargeted: false,
      metadataOnly: !hasPrivateProofLeak(proofArtifact),
    },
    findings,
  }
}
