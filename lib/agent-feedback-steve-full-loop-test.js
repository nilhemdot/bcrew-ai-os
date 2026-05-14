import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'
import { createAgentFeedbackToken, hashAgentFeedbackToken, verifyAgentFeedbackToken } from './agent-feedback.js'
import { writeAgentFeedbackToClickUp } from './agent-feedback-clickup.js'
import { sendAgentFeedbackResponseNotification } from './agent-feedback-response-notify.js'
import { buildAgentFeedbackReminderDryRunReport } from './agent-feedback-reminders.js'
import {
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
} from './agent-feedback-company-email-policy.js'
import {
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
  buildAgentFeedbackRealUserSubmitRepairStatus,
} from './agent-feedback-real-user-submit-repair.js'
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
} = {}) {
  validateSteveFullLoopApproval(approval || {}, await buildAgentFeedbackSteveFullLoopDryRunProof())
  throw new Error('Live synthetic submission is disabled. Use send-only/manual-user mode and wait for Steve to submit the emailed browser link.')
}

export async function executeApprovedSteveFullLoopSendOnly({
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

  const send = await executeApprovedAgentFeedbackSend({
    targetName: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET,
    milestoneDay: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY,
    approval,
    tokenIssuedAtMs,
    now,
  })

  return {
    ok: send.ok === true,
    cardId: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
    mode: 'send-only-manual-user',
    target: send.target,
    milestone: send.milestone,
    gmail: send.gmail,
    clickUpRequestedWritten: send.clickUpRequestedWritten === true,
    liveEmailedTokenConsumedByScript: false,
    waitingForRealUserBrowserSubmit: true,
    boundaries: {
      productionAutoSendEnabled: false,
      georgiaTargeted: false,
      syntheticSubmitLiveToken: false,
      rawEmailLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
  }
}

export function buildAgentFeedbackSteveFullLoopSyntheticSubmitProof() {
  return {
    cardId: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
    mode: 'synthetic-submit-dry-run-only',
    liveEmailedTokenConsumed: false,
    dbResponseSaved: false,
    clickUpWritebackWritten: false,
    responseNotificationSent: false,
    proofOnly: true,
  }
}

export async function executeDeprecatedApprovedSteveFullLoopTestForHistoricalAudit({
  approval,
} = {}) {
  validateSteveFullLoopApproval(approval || {}, await buildAgentFeedbackSteveFullLoopDryRunProof())
  throw new Error('Historical script-consumed full-loop execution is disabled. It is retained only as the documented failure mode for AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001.')
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
  const buildLogSource = await readFoundationBuildLogRegistrySource(repoRoot)
  const cards = foundationHub?.backlogItems || []
  const steveCard = cards.find(card => card.id === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID) || null
  const repairCard = cards.find(card => card.id === AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) || null
  const productionCard = cards.find(card => card.id === AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) || null
  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
    { backlogId: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID },
  )
  const repairCloseout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
    { backlogId: AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID },
  )
  const repairStatus = await buildAgentFeedbackRealUserSubmitRepairStatus({
    repoRoot,
    foundationHub,
    foundationBuildLog,
    includeDuplicateProbe: true,
  })
  const privacyLeak = hasPrivateProofLeak({ proof, live })

  function addFinding(ok, check, detail = '') {
    if (!ok) findings.push({ check, detail })
  }

  addFinding(Boolean(approvedPlan), 'approved plan artifact exists', AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVED_PLAN_PATH)
  addFinding(Boolean(approval), 'approval artifact exists', AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVAL_PATH)
  addFinding(Boolean(commandScript) && Boolean(processScript), 'command and process scripts exist', 'scripts/agent-feedback-steve-full-loop-test.mjs')
  addFinding(packageSource.includes('"agent-feedback:steve-full-loop-test"') && packageSource.includes('"process:agent-feedback-steve-full-loop-test-check"'), 'package scripts exist', 'agent-feedback:steve-full-loop-test')
  addFinding(moduleSource.includes('executeApprovedSteveFullLoopTest') &&
    moduleSource.includes('Live synthetic submission is disabled') &&
    moduleSource.includes('Historical script-consumed full-loop execution is disabled') &&
    moduleSource.includes('productionAutoSendEnabled: false') &&
    moduleSource.includes('georgiaTargeted: false'), 'full-loop module encodes Steve-only boundaries and disables live synthetic submit', 'lib/agent-feedback-steve-full-loop-test.js')
  addFinding(sendSource.includes('tokenIssuedAtMs') && sendSource.includes('loadAgentFeedbackCandidateForTarget'), 'send module supports stable token issuance for same-process full-loop test', 'lib/agent-feedback-send.js')
  addFinding(proof.assertions?.steveOnly === true && proof.assertions?.companyEmailTo === true, 'dry-run proof is Steve-only and Company Email only', proof.target?.label || 'missing')
  addFinding(proof.assertions?.steveDedupedFromBcc === true && proof.assertions?.bccOversightConfigured === true, 'BCC oversight is configured with Steve dedupe', (proof.recipientPlan?.bccActualSendRoles || []).join(', '))
  addFinding(commandScript.includes('send-only') &&
    commandScript.includes('synthetic-submit') &&
    commandScript.includes('consumed the live emailed token'), 'Steve full-loop command is split and old live send mode is disabled', 'scripts/agent-feedback-steve-full-loop-test.mjs')
  addFinding(live?.ok === true &&
    Boolean(live?.send?.gmail?.messageId) &&
    live?.response?.tokenHash === live?.requestToken?.tokenHash, 'historical proof preserves script-consumed token evidence', live?.requestToken?.tokenHash ? 'token-hash-present' : 'missing')
  addFinding(live?.boundaries?.productionAutoSendEnabled === false && live?.boundaries?.georgiaTargeted === false, 'historical proof kept production auto-send and Georgia target disabled', 'boundaries')
  addFinding(!privacyLeak, 'metadata-only proof has no raw email, token URL, or feedback text', privacyLeak ? 'leak detected' : 'clean')
  addFinding(steveCard?.lane === 'scoped' && String(steveCard?.statusNote || '').includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID), 'Steve full-loop card is reopened/not accepted until repair passes', steveCard?.lane || 'missing')
  addFinding(repairCard && ['executing', 'done'].includes(repairCard.lane), 'real-user repair card is active or done', repairCard?.lane || 'missing')
  const productionCardScopedOrClosed = productionCard?.lane === 'scoped' ||
    (productionCard?.lane === 'done' &&
      /agent-feedback-production-autosend-enable-v1/.test(productionCard?.statusNote || ''))
  addFinding(productionCardScopedOrClosed, 'production auto-send card is either still scoped or closed by the production enable card', productionCard?.lane || 'missing')
  addFinding(closeout?.operatorCloseout === true &&
    closeout.acceptanceState === 'Not accepted' &&
    (closeout.backlogIds || []).includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID), 'historical build-log closeout is marked not accepted', closeout?.acceptanceState || 'missing')
  addFinding(buildLogSource.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY), 'build log closeout exists in source', AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY)
  addFinding(repairStatus.status === 'healthy' &&
    repairStatus.phase === 'real_user_submitted' &&
    Boolean(repairStatus.summary?.realBrowserResponse) &&
    repairStatus.summary?.notification?.status === 'sent' &&
    repairStatus.summary?.reminderStopped === true &&
    repairStatus.summary?.duplicateResendBlocked === true &&
    repairStatus.summary?.duplicateSubmitClearMessage === true, 'real-user repair proves Steve browser submission and downstream loop', repairStatus.phase || 'waiting')
  addFinding(!repairCloseout || (repairCloseout.backlogIds || []).length === 1, 'repair closeout owns only repair card when present', (repairCloseout?.backlogIds || []).join(', ') || 'no closeout yet')
  addFinding(currentPlan.includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) &&
    currentPlan.includes('No production auto-send may start from it.'), 'current plan records Steve full-loop not accepted and repair before production', 'current-plan')
  addFinding(currentState.includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) &&
    currentState.includes('Steve’s real browser submission'), 'current state records Steve full-loop repair boundary', 'current-state')

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
    summary: {
      steveEligible: proof.eligibility?.eligible === true,
      recipientSource: proof.recipientPlan?.recipientSource || '',
      historicalGmailMessageIdPresent: Boolean(live?.send?.gmail?.messageId),
      historicalScriptConsumedToken: live?.response?.tokenHash === live?.requestToken?.tokenHash,
      accepted: false,
      repairStatus: repairStatus.status,
      repairPhase: repairStatus.phase,
      realBrowserResponse: Boolean(repairStatus.summary?.realBrowserResponse),
      clickUpCompletedWritten: repairStatus.summary?.notification?.metadata?.clickUpWritebackStatus === 'succeeded' ||
        repairStatus.summary?.notification?.clickUpWritebackStatus === 'succeeded',
      responseNotificationSent: repairStatus.summary?.notification?.status === 'sent',
      reminderStopped: repairStatus.summary?.reminderStopped === true,
      duplicateBlocked: repairStatus.summary?.duplicateResendBlocked === true,
      duplicateSubmitClearMessage: repairStatus.summary?.duplicateSubmitClearMessage === true,
      productionAutoSendEnabled: live?.boundaries?.productionAutoSendEnabled === true,
      georgiaTargeted: live?.boundaries?.georgiaTargeted === true,
      metadataOnly: !privacyLeak,
      steveCardLane: steveCard?.lane || '',
      repairCardLane: repairCard?.lane || '',
      productionCardLane: productionCard?.lane || '',
    },
    findings,
  }
}
