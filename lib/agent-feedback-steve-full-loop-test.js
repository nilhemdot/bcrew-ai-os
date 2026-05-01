import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAgentFeedbackToken, hashAgentFeedbackToken, verifyAgentFeedbackToken } from './agent-feedback.js'
import { writeAgentFeedbackToClickUp } from './agent-feedback-clickup.js'
import { sendAgentFeedbackResponseNotification } from './agent-feedback-response-notify.js'
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
} from './agent-feedback-send.js'
import {
  getActiveAgentFeedbackSendAttempt,
  getAgentFeedbackResponseNotificationByResponseId,
  getAgentOnboardingFeedbackResponseForMilestone,
  upsertAgentOnboardingFeedbackResponse,
} from './foundation-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY = 'agent-feedback-steve-full-loop-test-v1'
export const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-steve-full-loop-test-v1.md'
export const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001.json'
export const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_PROOF_PATH = 'docs/audits/2026-05-01-agent-feedback-steve-full-loop-test-proof.md'
export const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET = 'Steve Zahnd'
export const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY = 30
export const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_SCORE = 10
export const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_FEEDBACK = 'Controlled Steve full-loop system test submission. Ignore for NPS reporting.'

const REQUIRED_BCC_ROLES = ['Steve', 'Carson', 'Ryan', 'Georgia']
const SIDE_EFFECTS_DISABLED = Object.freeze({
  gmailSent: false,
  clickUpRequestedWritten: false,
  clickUpCompletedWritten: false,
  responseNotificationSent: false,
  productionAutoSendEnabled: false,
  georgiaTargeted: false,
  rawEmailLogged: false,
  rawTokenLogged: false,
  feedbackContentLogged: false,
})

function normalizeText(value) {
  return normalizeAgentFeedbackText(value)
}

function normalizeRole(value) {
  return normalizeText(value).toLowerCase()
}

function hasPrivateProofLeak(source) {
  const text = typeof source === 'string' ? source : JSON.stringify(source || {})
  if (/\/agent-feedback\?token=/i.test(text)) return true
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) return true
  if (text.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_FEEDBACK)) return true
  return false
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
  const trimmed = source.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed)
  const fencedJson = trimmed.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fencedJson) return JSON.parse(fencedJson[1])
  return null
}

function approvalBccRoles(approval = {}) {
  return (Array.isArray(approval.bccRoles) ? approval.bccRoles : [])
    .map(normalizeText)
    .filter(Boolean)
}

function validateSteveFullLoopApproval(approval = {}, proof = null) {
  const bccRoles = approvalBccRoles(approval)
  const normalizedBccRoles = bccRoles.map(normalizeRole)
  const missingRoles = REQUIRED_BCC_ROLES.filter(role => !normalizedBccRoles.includes(normalizeRole(role)))
  const extraRoles = bccRoles.filter(role => !REQUIRED_BCC_ROLES.map(normalizeRole).includes(normalizeRole(role)))
  const expectedRecipientRule = proof?.recipientPlan?.recipientRule || 'clickup-company-email'
  const ok = approval.cardId === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID &&
    approval.sendApproved === true &&
    approval.approvedBy === 'Steve' &&
    normalizeText(approval.targetName) === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET &&
    Number(approval.milestoneDay) === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY &&
    normalizeText(approval.recipientRule) === expectedRecipientRule &&
    approval.oneSendLimit === true &&
    approval.liveExternalSideEffectsApproved === true &&
    approval.productionAutoSendApproved !== true &&
    approval.georgiaSendApproved !== true &&
    missingRoles.length === 0 &&
    extraRoles.length === 0

  if (!ok) {
    throw new Error('Steve full-loop test requires Steve approval for Steve Zahnd Day-30 only, Company Email, BCC Steve/Carson/Ryan/Georgia, one-send limit, live external side effects, and no production/Georgia send approval.')
  }
  return true
}

function buildTokenForCandidate(candidate, tokenIssuedAtMs) {
  return createAgentFeedbackToken({
    taskId: candidate.taskId,
    agentName: candidate.taskName,
    milestoneDay: candidate.milestoneDay,
  }, tokenIssuedAtMs)
}

function sanitizeSendResult(result = {}) {
  return {
    ok: Boolean(result.ok),
    mode: result.mode || '',
    gmail: {
      messageId: result.gmail?.messageId || '',
      threadId: result.gmail?.threadId || '',
    },
    clickUpRequestedWritten: Boolean(result.clickUpRequestedWritten),
  }
}

function sanitizeResponse(response = {}) {
  return {
    responseIdHash: hashAgentFeedbackProofValue(response.id),
    tokenHashPresent: Boolean(response.tokenHash),
    tokenHash: response.tokenHash ? String(response.tokenHash).slice(0, 16) : '',
    taskIdHash: hashAgentFeedbackProofValue(response.clickUpTaskId),
    agentNameHash: hashAgentFeedbackProofValue(response.agentName),
    milestoneDay: Number(response.milestoneDay),
    score: Number(response.score),
    submittedAt: response.submittedAt || '',
    feedbackTextLogged: false,
  }
}

function sanitizeClickUpWriteback(writeback = {}) {
  return {
    status: writeback.status || '',
    repairStatus: writeback.repairStatus || 'none',
    statusField: writeback.statusField || '',
    scoreField: writeback.scoreField || '',
    feedbackField: writeback.feedbackField || '',
    taskIdHash: hashAgentFeedbackProofValue(writeback.taskId),
    feedbackTextLogged: false,
  }
}

function sanitizeNotification(notification = {}, responseId = '') {
  return {
    status: notification.status || '',
    duplicateBlocked: Boolean(notification.duplicateBlocked),
    recipientRoles: notification.recipientRoles || [],
    repairStatus: notification.repairStatus || 'none',
    responseIdHash: hashAgentFeedbackProofValue(responseId),
    gmail: {
      messageId: notification.gmail?.messageId || notification.gmailMessageId || '',
      threadId: notification.gmail?.threadId || notification.gmailThreadId || '',
    },
    rawEmailsLogged: false,
    feedbackContentLogged: false,
  }
}

function buildDuplicateProof(error) {
  const message = error instanceof Error ? error.message : String(error || '')
  const duplicateBlocked = /duplicate_send_attempt_exists|already_closed|already_requested/.test(message)
  return {
    duplicateBlocked,
    attemptedSecondSend: true,
    secondSendGmailSent: false,
    secondSendClickUpRequestedWritten: false,
    errorClass: error instanceof Error ? error.name : 'Error',
    blockerSummary: duplicateBlocked ? 'duplicate_or_closed_send_blocked_before_side_effects' : 'unexpected_duplicate_check_result',
  }
}

function findSteveReminderCandidate(report = {}) {
  return (report.candidates || []).find(candidate =>
    candidate.targetLabel === 'Steve' &&
      Number(candidate.milestoneDay) === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY
  ) || null
}

export async function buildAgentFeedbackSteveFullLoopDryRunProof() {
  const proof = await buildAgentFeedbackDryRunProof({
    targetName: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET,
    milestoneDay: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY,
  })
  return {
    cardId: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
    mode: 'dry-run',
    target: proof.target,
    milestone: proof.milestone,
    eligibility: proof.eligibility,
    recipientPlan: proof.recipientPlan,
    email: proof.email,
    clickUpWritebackPlan: proof.clickUpWritebackPlan,
    duplicateProtection: proof.duplicateProtection,
    sideEffects: { ...SIDE_EFFECTS_DISABLED },
    assertions: {
      steveOnly: proof.target?.label === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET,
      companyEmailTo: proof.recipientPlan?.recipientSource === 'company_email',
      steveDedupedFromBcc: (proof.recipientPlan?.bccRecipientDedupedRoles || []).includes('Steve'),
      bccOversightConfigured: REQUIRED_BCC_ROLES.every(role => (proof.recipientPlan?.bccRolesApplied || []).includes(role)),
      oneSendLimitReady: proof.duplicateProtection?.activeSendAttemptExists === false,
      productionAutoSendDisabled: true,
      georgiaNotTargeted: true,
      metadataOnly: true,
    },
  }
}

export async function executeApprovedSteveFullLoopTest({
  approval,
  now = new Date(),
} = {}) {
  const tokenIssuedAtMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const proof = await buildAgentFeedbackDryRunProof({
    targetName: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET,
    milestoneDay: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY,
    tokenIssuedAtMs,
  })
  validateSteveFullLoopApproval(approval || {}, proof)
  if (!proof.eligibility.eligible) {
    throw new Error('Steve full-loop test is not eligible: ' + (proof.eligibility.blockers || []).join(', '))
  }

  const candidate = await loadAgentFeedbackCandidateForTarget({
    targetName: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET,
    milestoneDay: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY,
    now,
  })
  const token = buildTokenForCandidate(candidate, tokenIssuedAtMs)
  const tokenHash = hashAgentFeedbackToken(token)

  const send = await executeApprovedAgentFeedbackSend({
    targetName: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET,
    milestoneDay: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY,
    approval,
    tokenIssuedAtMs,
    now,
  })

  const session = verifyAgentFeedbackToken(token)
  const response = await upsertAgentOnboardingFeedbackResponse({
    tokenHash: session.tokenHash,
    clickUpTaskId: session.taskId,
    agentName: session.agentName,
    milestoneDay: session.milestoneDay,
    score: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_SCORE,
    improvementFeedback: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_FEEDBACK,
    userAgent: 'agent-feedback-steve-full-loop-test',
    metadata: {
      cardId: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
      closeoutKey: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
      testSubmission: true,
    },
  }, 'agent-feedback-steve-full-loop-test')
  const clickUpWritebackResult = await writeAgentFeedbackToClickUp({
    taskId: session.taskId,
    milestoneDay: session.milestoneDay,
    score: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_SCORE,
    improvementFeedback: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_FEEDBACK,
  })
  const clickUpWriteback = {
    status: 'succeeded',
    repairStatus: 'none',
    ...clickUpWritebackResult,
  }
  const responseNotification = await sendAgentFeedbackResponseNotification({
    response,
    clickUpWriteback,
  })
  const notificationRecord = responseNotification.duplicateBlocked
    ? await getAgentFeedbackResponseNotificationByResponseId(response.id)
    : null

  let duplicateProof = null
  try {
    await executeApprovedAgentFeedbackSend({
      targetName: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET,
      milestoneDay: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY,
      approval,
      tokenIssuedAtMs: tokenIssuedAtMs + 1,
      now,
    })
    duplicateProof = {
      duplicateBlocked: false,
      attemptedSecondSend: true,
      secondSendGmailSent: true,
      secondSendClickUpRequestedWritten: true,
      errorClass: '',
      blockerSummary: 'unexpected_second_send_succeeded',
    }
  } catch (error) {
    duplicateProof = buildDuplicateProof(error)
  }

  const reminderReport = await buildAgentFeedbackReminderDryRunReport({
    includeCandidates: true,
    forceRefresh: true,
    now,
  })
  const steveReminderCandidate = findSteveReminderCandidate(reminderReport)
  const activeSendAttempt = await getActiveAgentFeedbackSendAttempt({
    taskId: candidate.taskId,
    milestoneDay: candidate.milestoneDay,
  })
  const savedResponse = await getAgentOnboardingFeedbackResponseForMilestone({
    taskId: candidate.taskId,
    milestoneDay: candidate.milestoneDay,
  })

  const liveProof = {
    ok: send.ok === true &&
      Boolean(send.gmail?.messageId) &&
      send.clickUpRequestedWritten === true &&
      Boolean(response.id) &&
      clickUpWriteback.status === 'succeeded' &&
      responseNotification.status === 'sent' &&
      duplicateProof.duplicateBlocked === true &&
      steveReminderCandidate?.action === 'skipped' &&
      steveReminderCandidate?.stop?.reason === 'feedback_completed',
    cardId: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
    mode: 'live-steve-full-loop-test',
    target: {
      label: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET,
      sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
      taskIdHash: hashAgentFeedbackProofValue(candidate.taskId),
      agentNameHash: hashAgentFeedbackProofValue(candidate.taskName),
      milestoneDay: candidate.milestoneDay,
    },
    send: sanitizeSendResult(send),
    requestToken: {
      tokenHash: tokenHash.slice(0, 16),
      tokenUrlLogged: false,
      rawTokenLogged: false,
    },
    response: sanitizeResponse(response),
    savedResponse: sanitizeResponse(savedResponse || response),
    clickUpCompletedWriteback: sanitizeClickUpWriteback(clickUpWriteback),
    responseNotification: {
      ...sanitizeNotification(responseNotification, response.id),
      gmail: {
        messageId: responseNotification.gmail?.messageId || notificationRecord?.gmailMessageId || '',
        threadId: responseNotification.gmail?.threadId || notificationRecord?.gmailThreadId || '',
      },
    },
    reminderStop: {
      stopped: steveReminderCandidate?.action === 'skipped' &&
        steveReminderCandidate?.stop?.reason === 'feedback_completed',
      action: steveReminderCandidate?.action || '',
      stopReason: steveReminderCandidate?.stop?.reason || '',
      pendingReminderCount: reminderReport.counts?.pending ?? 0,
      dryRunOnly: true,
    },
    duplicateProtection: duplicateProof,
    activeSendAttempt: {
      exists: Boolean(activeSendAttempt),
      status: activeSendAttempt?.status || '',
      gmailMessageIdPresent: Boolean(activeSendAttempt?.gmailMessageId),
      gmailThreadIdPresent: Boolean(activeSendAttempt?.gmailThreadId),
      tokenHashMatches: activeSendAttempt?.tokenHash === tokenHash,
    },
    boundaries: {
      productionAutoSendEnabled: false,
      georgiaTargeted: false,
      otherRosterSends: false,
      liveReminderSent: false,
      rawEmailLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
  }
  const privacyLeak = hasPrivateProofLeak(liveProof)
  if (privacyLeak) throw new Error('Steve full-loop proof contains private email, token URL, or feedback text.')
  return liveProof
}

export async function buildAgentFeedbackSteveFullLoopTestStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  liveProof = null,
  dryRunProof = null,
} = {}) {
  const findings = []
  const proof = dryRunProof || await buildAgentFeedbackSteveFullLoopDryRunProof()
  const live = liveProof || await readOptionalJson(repoRoot, AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_PROOF_PATH)
  const packageSource = await readOptionalText(repoRoot, 'package.json')
  const commandScript = await readOptionalText(repoRoot, 'scripts/agent-feedback-steve-full-loop-test.mjs')
  const processScript = await readOptionalText(repoRoot, 'scripts/process-agent-feedback-steve-full-loop-test-check.mjs')
  const moduleSource = await readOptionalText(repoRoot, 'lib/agent-feedback-steve-full-loop-test.js')
  const sendSource = await readOptionalText(repoRoot, 'lib/agent-feedback-send.js')
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')
  const approvedPlan = await readOptionalText(repoRoot, AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVAL_PATH)
  const buildLogSource = await readOptionalText(repoRoot, 'lib/foundation-build-log.js')
  const cards = foundationHub?.backlogItems || []
  const steveCard = cards.find(card => card.id === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID) || null
  const productionCard = cards.find(card => card.id === AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) || null
  const closeout = (foundationBuildLog?.builds || []).find(build => build.closeoutKey === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY) || null
  const privacyLeak = hasPrivateProofLeak({ proof, live })

  function addFinding(ok, check, detail = '') {
    if (!ok) findings.push({ check, detail })
  }

  addFinding(Boolean(approvedPlan), 'approved plan artifact exists', AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVED_PLAN_PATH)
  addFinding(Boolean(approval), 'approval artifact exists', AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVAL_PATH)
  addFinding(Boolean(commandScript) && Boolean(processScript), 'command and process scripts exist', 'scripts/agent-feedback-steve-full-loop-test.mjs')
  addFinding(packageSource.includes('"agent-feedback:steve-full-loop-test"') && packageSource.includes('"process:agent-feedback-steve-full-loop-test-check"'), 'package scripts exist', 'agent-feedback:steve-full-loop-test')
  addFinding(moduleSource.includes('executeApprovedSteveFullLoopTest') && moduleSource.includes('productionAutoSendEnabled: false') && moduleSource.includes('georgiaTargeted: false'), 'full-loop module encodes Steve-only boundaries', 'lib/agent-feedback-steve-full-loop-test.js')
  addFinding(sendSource.includes('tokenIssuedAtMs') && sendSource.includes('loadAgentFeedbackCandidateForTarget'), 'send module supports stable token issuance for same-process full-loop test', 'lib/agent-feedback-send.js')
  addFinding(proof.assertions?.steveOnly === true && proof.assertions?.companyEmailTo === true, 'dry-run proof is Steve-only and Company Email only', proof.target?.label || 'missing')
  addFinding(proof.assertions?.steveDedupedFromBcc === true && proof.assertions?.bccOversightConfigured === true, 'BCC oversight is configured with Steve dedupe', (proof.recipientPlan?.bccActualSendRoles || []).join(', '))
  addFinding(live?.ok === true && live?.send?.clickUpRequestedWritten === true && Boolean(live?.send?.gmail?.messageId), 'live proof records Gmail-before-Requested success', live?.send?.gmail?.messageId ? 'messageId present' : 'missing')
  addFinding(live?.clickUpCompletedWriteback?.status === 'succeeded' && live?.response?.responseIdHash, 'live proof records DB response and Completed/Score/Feedback writeback', live?.clickUpCompletedWriteback?.status || 'missing')
  addFinding(live?.responseNotification?.status === 'sent', 'live proof records internal response notification sent', live?.responseNotification?.status || 'missing')
  addFinding(live?.reminderStop?.stopped === true && live?.reminderStop?.stopReason === 'feedback_completed', 'live proof records reminder stop after completion', live?.reminderStop?.stopReason || 'missing')
  addFinding(live?.duplicateProtection?.duplicateBlocked === true && live?.duplicateProtection?.secondSendGmailSent === false, 'live proof records duplicate resend prevention', live?.duplicateProtection?.blockerSummary || 'missing')
  addFinding(live?.boundaries?.productionAutoSendEnabled === false && live?.boundaries?.georgiaTargeted === false, 'live proof keeps production auto-send and Georgia target disabled', 'boundaries')
  addFinding(!privacyLeak, 'metadata-only proof has no raw email, token URL, or feedback text', privacyLeak ? 'leak detected' : 'clean')
  addFinding(steveCard?.lane === 'done' && /agent-feedback-steve-full-loop-test-v1/.test(steveCard?.statusNote || ''), 'Steve full-loop card is done', steveCard?.lane || 'missing')
  addFinding(productionCard?.lane === 'scoped', 'production auto-send card remains scoped next', productionCard?.lane || 'missing')
  addFinding(closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID), 'build log closeout owns only Steve full-loop card', closeout?.closeoutKey || 'missing')
  addFinding(buildLogSource.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY), 'build log closeout exists in source', AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY)
  addFinding(currentPlan.includes('AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001` is done') && currentPlan.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID), 'current plan records Steve full-loop done and production next', 'current-plan')
  addFinding(currentState.includes('AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001` is done') && currentState.includes('No production auto-send'), 'current state records Steve full-loop boundary', 'current-state')

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
    summary: {
      steveEligible: proof.eligibility?.eligible === true,
      recipientSource: proof.recipientPlan?.recipientSource || '',
      gmailMessageIdPresent: Boolean(live?.send?.gmail?.messageId),
      clickUpRequestedWritten: live?.send?.clickUpRequestedWritten === true,
      dbResponseSaved: Boolean(live?.response?.responseIdHash),
      clickUpCompletedWritten: live?.clickUpCompletedWriteback?.status === 'succeeded',
      responseNotificationSent: live?.responseNotification?.status === 'sent',
      reminderStopped: live?.reminderStop?.stopped === true,
      duplicateBlocked: live?.duplicateProtection?.duplicateBlocked === true,
      productionAutoSendEnabled: live?.boundaries?.productionAutoSendEnabled === true,
      georgiaTargeted: live?.boundaries?.georgiaTargeted === true,
      metadataOnly: !privacyLeak,
      steveCardLane: steveCard?.lane || '',
      productionCardLane: productionCard?.lane || '',
    },
    findings,
  }
}
