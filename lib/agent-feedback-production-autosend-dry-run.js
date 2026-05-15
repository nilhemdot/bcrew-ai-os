import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AGENT_FEEDBACK_MILESTONE_DAYS,
  AGENT_FEEDBACK_SEND_SOURCE_ID,
  AGENT_FEEDBACK_SEND_WINDOW_DAYS,
  buildAgentFeedbackCandidateFromTask,
  buildAgentFeedbackEligibility,
  buildAgentFeedbackRecipientPlan,
  hashAgentFeedbackProofValue,
  normalizeAgentFeedbackText,
} from './agent-feedback-send.js'
import {
  CLICKUP_AGENT_ROSTER_LIST_ID,
} from './agent-roster-review.js'
import { getClickUpListSnapshotSafe, isClickUpSnapshotDegraded } from './clickup.js'
import {
  AGENT_FEEDBACK_AUTO_SEND_DEFAULT_LIVE_APPROVAL_PATH,
  AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV,
  AGENT_FEEDBACK_AUTO_SEND_JOB_KEY,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_APPROVAL_PATH,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_PROOF_PATH,
  buildAgentFeedbackAutoSendReadiness,
} from './agent-feedback-auto-send.js'
import {
  getActiveAgentFeedbackSendAttempt,
  getAgentOnboardingFeedbackResponseForMilestone,
  listAgentFeedbackReminderAttemptsForMilestone,
  listAgentFeedbackSendAttemptsForMilestone,
} from './foundation-db.js'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID = 'AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001'
export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE = 'stage-1-production-dry-run-report'
export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY = 'agent-feedback-production-autosend-dry-run-v1'
export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_PROOF_PATH = 'docs/audits/2026-05-01-agent-feedback-production-autosend-dry-run.md'

const SIDE_EFFECTS_DISABLED = Object.freeze({
  gmailSent: false,
  clickUpRequestedWritten: false,
  envToggleChanged: false,
  productionApprovalArtifactWritten: false,
  georgiaSpecialSend: false,
  rosterSends: false,
  rawEmailLogged: false,
  rawTokenLogged: false,
  feedbackContentLogged: false,
})

const CLASSIFICATIONS = Object.freeze([
  'would_send',
  'already_requested',
  'completed',
  'outside_window',
  'blocked',
  'skipped',
  'warning',
])
const FORBIDDEN_SIDE_EFFECT_IMPORT_NAMES = Object.freeze([
  ['send', 'Gmail', 'Message'].join(''),
  ['markAgentFeedback', 'RequestedInClickUp'].join(''),
  ['createAgentFeedback', 'SendAttempt'].join(''),
])

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig
const REPORT_CACHE_MS = 5 * 60 * 1000
let reportCache = null

function normalizeText(value) {
  return normalizeAgentFeedbackText(value)
}

function normalizeStatus(value) {
  return normalizeText(value).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function redactEmailText(value) {
  return normalizeText(value).replace(EMAIL_PATTERN, '[redacted-email]')
}

function addDaysIso(dateIso, days) {
  const date = new Date(dateIso)
  if (!dateIso || Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() + Number(days || 0))
  return date.toISOString().slice(0, 10)
}

function hasPrivateProofLeak(source) {
  const text = typeof source === 'string' ? source : JSON.stringify(source || {})
  if (/\/agent-feedback\?token=/i.test(text)) return true
  if (EMAIL_PATTERN.test(text)) {
    EMAIL_PATTERN.lastIndex = 0
    return true
  }
  EMAIL_PATTERN.lastIndex = 0
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

async function pathExists(repoRoot, relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

function classifyCandidate({ candidate, eligibility, activeSendAttempt, response }) {
  const normalizedStatus = normalizeStatus(candidate.currentStatus)
  const blockers = new Set(eligibility.blockers || [])
  const warnings = eligibility.dataQualityWarnings || []

  if (response || normalizedStatus === 'completed') return 'completed'
  if (normalizedStatus === 'requested' || activeSendAttempt) return 'already_requested'
  if (normalizedStatus === 'skipped' || normalizedStatus === 'not eligible') return 'skipped'
  if (normalizedStatus === 'blocked') return 'blocked'
  if (blockers.has('not_due') || blockers.has('expired_send_window')) return 'outside_window'
  if (blockers.size) return 'blocked'
  if (warnings.length) return 'warning'
  if (eligibility.eligible) return 'would_send'
  return 'blocked'
}

function buildReminderState(reminderAttempts = []) {
  const statusCounts = reminderAttempts.reduce((acc, attempt) => {
    const status = normalizeText(attempt.status || 'unknown') || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})
  const latest = reminderAttempts[0] || null
  return {
    attempts: reminderAttempts.length,
    statusCounts,
    latestStatus: latest?.status || '',
    pending: Number(statusCounts.pending || 0),
    sent: Number(statusCounts.sent || 0),
    blocked: Number(statusCounts.blocked || 0),
    skipped: Number(statusCounts.skipped || 0),
  }
}

function summarizeCandidates(candidates = []) {
  const byClassification = Object.fromEntries(CLASSIFICATIONS.map(key => [key, 0]))
  for (const candidate of candidates) {
    if (candidate.classification in byClassification) byClassification[candidate.classification] += 1
  }
  const wouldBeEmailed = candidates.filter(candidate => candidate.wouldBeEmailedIfEnabled)
  return {
    totalCandidates: candidates.length,
    byClassification,
    sendableCount: wouldBeEmailed.length,
    wouldBeEmailedPreview: wouldBeEmailed.slice(0, 25).map(candidate => ({
      agentName: candidate.agentName,
      milestoneDay: candidate.milestoneDay,
      classification: candidate.classification,
      warningKeys: candidate.warningKeys,
    })),
  }
}

function sanitizeCandidate({
  candidate,
  eligibility,
  recipientPlan,
  activeSendAttempt,
  sendAttempts,
  response,
  reminderAttempts,
}) {
  const classification = classifyCandidate({ candidate, eligibility, activeSendAttempt, response })
  const warningKeys = eligibility.dataQualityWarnings || []
  const blockerKeys = eligibility.blockers || []
  const sendWindowClosesAt = addDaysIso(candidate.dueDate, AGENT_FEEDBACK_SEND_WINDOW_DAYS)
  return {
    agentName: redactEmailText(candidate.taskName || candidate.targetName),
    agentNameHash: hashAgentFeedbackProofValue(candidate.taskName || candidate.targetName),
    sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
    listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
    taskIdHash: hashAgentFeedbackProofValue(candidate.taskId),
    milestoneDay: candidate.milestoneDay,
    dueDate: candidate.dueDate,
    window: {
      dueStatus: eligibility.dueStatus,
      overdueDays: candidate.overdueDays,
      sendWindowDays: AGENT_FEEDBACK_SEND_WINDOW_DAYS,
      closesAt: sendWindowClosesAt,
      insideWindow: eligibility.dueStatus === 'due',
    },
    clickUpNpsStatus: candidate.currentStatus || 'empty',
    companyEmail: {
      present: Boolean(candidate.recipientEmailPresent),
      valid: Boolean(candidate.recipientEmailValid),
      sourceField: 'Company Email',
      sourceFieldHash: hashAgentFeedbackProofValue('Company Email'),
    },
    contractLink: {
      warningOnly: true,
      present: Boolean(candidate.contractLinkPresent),
      warningKey: candidate.contractLinkPresent ? '' : 'missing_contract_link',
    },
    duplicateLedger: {
      table: 'agent_onboarding_feedback_send_attempts',
      uniqueKey: 'clickup_task_id + milestone_day',
      activeProtectedAttemptExists: Boolean(activeSendAttempt),
      activeProtectedAttemptStatus: activeSendAttempt?.status || '',
      attemptsInspected: sendAttempts.length,
      protectedStatuses: ['sending', 'sent', 'clickup_requested'],
    },
    responseState: {
      table: 'agent_onboarding_feedback_responses',
      completed: Boolean(response),
      responseIdHash: response ? hashAgentFeedbackProofValue(response.id) : '',
      submittedAt: response?.submittedAt || '',
      feedbackContentLogged: false,
    },
    reminderState: buildReminderState(reminderAttempts),
    recipientPlan: {
      recipientRule: recipientPlan.recipientRule,
      recipientSource: recipientPlan.recipientSource,
      recipientCategory: recipientPlan.recipientCategory,
      toRole: recipientPlan.toRole,
      toAddressPresent: Boolean(recipientPlan.toAddressPresent),
      bccRolesApplied: recipientPlan.bccRolesApplied || [],
      bccActualSendRoles: recipientPlan.bccActualSendRoles || [],
      bccRecipientDedupedRoles: recipientPlan.bccRecipientDedupedRoles || [],
      bccMissingConfiguredRoles: recipientPlan.bccMissingConfiguredRoles || [],
    },
    classification,
    wouldBeEmailedIfEnabled: classification === 'would_send' || classification === 'warning',
    blockerKeys,
    warningKeys,
  }
}

export async function buildAgentFeedbackProductionAutoSendDryRunReport({
  now = new Date(),
  includeCandidates = true,
  forceRefresh = false,
  snapshot = null,
  getRosterSnapshot = getClickUpListSnapshotSafe,
} = {}) {
  const nowDate = now instanceof Date ? now : new Date(now)
  const nowMs = nowDate.getTime()
  const useDefaultSnapshot = !snapshot && getRosterSnapshot === getClickUpListSnapshotSafe
  if (
    useDefaultSnapshot &&
    !forceRefresh &&
    reportCache &&
    Number.isFinite(nowMs) &&
    nowMs - reportCache.createdAtMs < REPORT_CACHE_MS
  ) {
    return {
      ...reportCache.report,
      candidates: includeCandidates
        ? reportCache.report.candidates
        : reportCache.report.candidates.slice(0, 15),
    }
  }

  const rosterSnapshot = snapshot || await getRosterSnapshot(CLICKUP_AGENT_ROSTER_LIST_ID, { listName: 'Agent Roster' })
  const sourceDegraded = isClickUpSnapshotDegraded(rosterSnapshot)
  if (sourceDegraded) {
    const sourceHealth = rosterSnapshot.sourceHealth || null
    const report = {
      stage: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE,
      cardId: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
      mode: 'production-dry-run-report-only',
      generatedAt: nowDate.toISOString(),
      sourceHealth,
      source: {
        sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
        listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
        tasksInspected: 0,
        milestones: AGENT_FEEDBACK_MILESTONE_DAYS,
        sourceUnavailable: true,
      },
      classificationVocabulary: CLASSIFICATIONS,
      productionRules: {
        trigger: 'Real Start Date + milestone day',
        recipient: 'Company Email only',
        contractLink: 'warning-only',
        statusSource: 'ClickUp Onboarding NPS 30/60/90 Status',
        sendWindowDays: AGENT_FEEDBACK_SEND_WINDOW_DAYS,
        duplicateLedger: 'agent_onboarding_feedback_send_attempts',
        responseLedger: 'agent_onboarding_feedback_responses',
        reminderLedger: 'agent_onboarding_feedback_reminder_attempts',
      },
      summary: summarizeCandidates([]),
      candidates: [],
      sideEffects: { ...SIDE_EFFECTS_DISABLED },
      productionEnablement: {
        enabled: false,
        envToggle: process.env[AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV] === 'true',
        productionApprovalArtifactCreated: false,
        cardFullyDone: false,
        nextAction: 'ClickUp source is degraded; retry dry-run scan after source health returns.',
      },
      privacy: {
        metadataOnly: true,
        rawEmailLogged: false,
        tokenUrlLogged: false,
        feedbackContentLogged: false,
        agentNamesIncludedByRequest: false,
      },
    }
    if (useDefaultSnapshot) {
      reportCache = {
        createdAtMs: Date.now(),
        report: {
          ...report,
          candidates: [],
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
        now: nowDate,
      }))
    }
  }

  const candidates = []
  for (const candidate of candidateInputs) {
    const [recipientPlan, activeSendAttempt, sendAttempts, response, reminderAttempts] = await Promise.all([
      buildAgentFeedbackRecipientPlan(candidate),
      getActiveAgentFeedbackSendAttempt({
        taskId: candidate.taskId,
        milestoneDay: candidate.milestoneDay,
      }),
      listAgentFeedbackSendAttemptsForMilestone({
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
    const eligibility = buildAgentFeedbackEligibility(candidate, activeSendAttempt, recipientPlan)
    candidates.push(sanitizeCandidate({
      candidate,
      eligibility,
      recipientPlan,
      activeSendAttempt,
      sendAttempts,
      response,
      reminderAttempts,
    }))
  }

  const summary = summarizeCandidates(candidates)
  const report = {
    stage: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE,
    cardId: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
    mode: 'production-dry-run-report-only',
    generatedAt: nowDate.toISOString(),
    sourceHealth: rosterSnapshot.sourceHealth || null,
    source: {
      sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
      listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
      tasksInspected: Array.isArray(rosterSnapshot.tasks) ? rosterSnapshot.tasks.length : 0,
      milestones: AGENT_FEEDBACK_MILESTONE_DAYS,
    },
    classificationVocabulary: CLASSIFICATIONS,
    productionRules: {
      trigger: 'Real Start Date + milestone day',
      recipient: 'Company Email only',
      contractLink: 'warning-only',
      statusSource: 'ClickUp Onboarding NPS 30/60/90 Status',
      sendWindowDays: AGENT_FEEDBACK_SEND_WINDOW_DAYS,
      duplicateLedger: 'agent_onboarding_feedback_send_attempts',
      responseLedger: 'agent_onboarding_feedback_responses',
      reminderLedger: 'agent_onboarding_feedback_reminder_attempts',
    },
    summary,
    candidates: includeCandidates ? candidates : candidates.slice(0, 15),
    sideEffects: { ...SIDE_EFFECTS_DISABLED },
    productionEnablement: {
      enabled: false,
      envToggle: process.env[AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV] === 'true',
      productionApprovalArtifactCreated: false,
      cardFullyDone: false,
      nextAction: 'Steve reviews the would-send list before any production enablement.',
    },
    privacy: {
      metadataOnly: true,
      rawEmailLogged: false,
      tokenUrlLogged: false,
      feedbackContentLogged: false,
      agentNamesIncludedByRequest: true,
    },
  }

  if (useDefaultSnapshot) {
    reportCache = {
      createdAtMs: Date.now(),
      report: {
        ...report,
        candidates,
      },
    }
  }
  return report
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

function includesAll(source, phrases) {
  return phrases.every(phrase => source.includes(phrase))
}

function candidateHasRequiredMetadata(candidate = {}) {
  return Boolean(
    candidate.agentName &&
      Number(candidate.milestoneDay) &&
      candidate.window &&
      candidate.clickUpNpsStatus &&
      candidate.companyEmail &&
      candidate.contractLink &&
      candidate.duplicateLedger &&
      candidate.responseState &&
      candidate.reminderState &&
      CLASSIFICATIONS.includes(candidate.classification) &&
      Array.isArray(candidate.blockerKeys) &&
      Array.isArray(candidate.warningKeys)
  )
}

export async function buildAgentFeedbackProductionAutoSendDryRunStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  opsDryRun = null,
  report = null,
} = {}) {
  const findings = []
  const dryRunReport = report || await buildAgentFeedbackProductionAutoSendDryRunReport({
    includeCandidates: true,
  })
  const [
    packageSource,
    proofSource,
    moduleSource,
    commandSource,
    processSource,
    serverSource,
    foundationVerifySource,
    buildLogSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    readOptionalText(repoRoot, 'package.json'),
    readOptionalText(repoRoot, AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_PROOF_PATH),
    readOptionalText(repoRoot, 'lib/agent-feedback-production-autosend-dry-run.js'),
    readOptionalText(repoRoot, 'scripts/agent-feedback-production-dry-run.mjs'),
    readOptionalText(repoRoot, 'scripts/process-agent-feedback-production-autosend-dry-run-check.mjs'),
    readOptionalText(repoRoot, 'server.js'),
    readOptionalText(repoRoot, 'scripts/foundation-verify.mjs'),
    readFoundationBuildLogRegistrySource(repoRoot),
    readOptionalText(repoRoot, 'docs/rebuild/current-plan.md'),
    readOptionalText(repoRoot, 'docs/rebuild/current-state.md'),
  ])
  const productionApprovalArtifactExists = await pathExists(repoRoot, AGENT_FEEDBACK_AUTO_SEND_DEFAULT_LIVE_APPROVAL_PATH)
  const cards = foundationHub?.backlogItems || []
  const productionCard = cards.find(card => card.id === AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) || null
  const realUserRepairCard = cards.find(card => card.id === 'AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001') || null
  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY,
    { backlogId: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID },
  )
  const closeoutStageStatus = closeout?.status || closeout?.operatorStatus || ''
  const closeoutOwners = Array.isArray(closeout?.backlogIds) ? closeout.backlogIds : []
  const classifications = new Set((dryRunReport.candidates || []).map(candidate => candidate.classification))
  const sourceDegraded = dryRunReport.sourceHealth?.status === 'degraded' || dryRunReport.source?.sourceUnavailable === true

  addFinding(findings, dryRunReport.stage === AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE, 'report is Stage 1 production dry-run', dryRunReport.stage)
  addFinding(findings, dryRunReport.mode === 'production-dry-run-report-only', 'report mode is dry-run only', dryRunReport.mode)
  addFinding(findings, sourceDegraded || (dryRunReport.source?.tasksInspected > 0 && dryRunReport.summary?.totalCandidates === dryRunReport.source.tasksInspected * AGENT_FEEDBACK_MILESTONE_DAYS.length), 'full Agent Roster scan covers all 30/60/90 candidates or declares source outage', sourceDegraded ? 'ClickUp source degraded fail-soft' : `${dryRunReport.source?.tasksInspected || 0} tasks / ${dryRunReport.summary?.totalCandidates || 0} candidates`)
  addFinding(findings, (dryRunReport.candidates || []).every(candidateHasRequiredMetadata), 'every candidate carries required metadata', `${(dryRunReport.candidates || []).filter(candidateHasRequiredMetadata).length}/${(dryRunReport.candidates || []).length}`)
  addFinding(findings, [...classifications].every(value => CLASSIFICATIONS.includes(value)), 'classifications stay in approved vocabulary', [...classifications].join(', '))
  addFinding(findings, Number(dryRunReport.summary?.sendableCount) >= 0 && Array.isArray(dryRunReport.summary?.wouldBeEmailedPreview), 'report shows who would be emailed if enabled', `${dryRunReport.summary?.sendableCount || 0} sendable`)
  addFinding(findings, dryRunReport.sideEffects?.gmailSent === false && dryRunReport.sideEffects?.clickUpRequestedWritten === false, 'dry-run has no Gmail or ClickUp side effects', JSON.stringify(dryRunReport.sideEffects || {}))
  addFinding(findings, dryRunReport.productionEnablement?.enabled === false && dryRunReport.productionEnablement?.envToggle === false, 'production auto-send remains disabled', JSON.stringify(dryRunReport.productionEnablement || {}))
  addFinding(findings, productionApprovalArtifactExists === false && dryRunReport.productionEnablement?.productionApprovalArtifactCreated === false, 'no production approval artifact exists or was created', AGENT_FEEDBACK_AUTO_SEND_DEFAULT_LIVE_APPROVAL_PATH)
  addFinding(findings, dryRunReport.sideEffects?.georgiaSpecialSend === false && dryRunReport.sideEffects?.rosterSends === false, 'no Georgia special send or roster sends happened', JSON.stringify(dryRunReport.sideEffects || {}))
  addFinding(findings, dryRunReport.privacy?.metadataOnly === true && !hasPrivateProofLeak(dryRunReport) && !hasPrivateProofLeak(proofSource), 'tracked proof/report has no raw emails, token URLs, or feedback content', 'metadata-only')

  addFinding(findings, packageSource.includes('"agent-feedback:production-dry-run"') && packageSource.includes('"process:agent-feedback-production-autosend-dry-run-check"'), 'package exposes Stage 1 commands', 'production dry-run commands')
  addFinding(findings, Boolean(proofSource) && includesAll(proofSource, [
    AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
    AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE,
    'No Gmail sends',
    'No ClickUp Requested writeback',
    'Steve reviews the would-send list',
  ]), 'stage proof artifact exists with hard-no boundary', AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_PROOF_PATH)
  addFinding(findings, includesAll(moduleSource, [
    'buildAgentFeedbackProductionAutoSendDryRunReport',
    'listAgentFeedbackReminderAttemptsForMilestone',
    'getAgentOnboardingFeedbackResponseForMilestone',
    'production-dry-run-report-only',
  ]), 'Stage 1 module scans roster and response/reminder state', 'lib/agent-feedback-production-autosend-dry-run.js')
  addFinding(findings, FORBIDDEN_SIDE_EFFECT_IMPORT_NAMES.every(name => !moduleSource.includes(name)), 'Stage 1 module has no send/write side-effect imports', 'read-only scanner')
  addFinding(findings, Boolean(commandSource) && Boolean(processSource), 'Stage 1 command and process check scripts exist', 'scripts')
  addFinding(findings, includesAll(serverSource, ['agentFeedbackProductionAutoSendDryRun', '/api/foundation/agent-feedback-production-dry-run', '/api/ops/agent-feedback-production-dry-run']), 'live Foundation/Ops APIs expose Stage 1 proof', 'server.js')
  addFinding(findings, foundationVerifySource.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) && foundationVerifySource.includes('agentFeedbackProductionAutoSendDryRunStatus'), 'foundation verifier covers Stage 1 dry-run', AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID)
  addFinding(findings, buildLogSource.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY), 'build log has Stage 1 closeout record', AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY)
  addFinding(findings, closeoutOwners.length === 1 && closeoutOwners.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID), 'Stage 1 closeout owns only production auto-send card', closeoutOwners.join(', ') || 'missing')
  addFinding(findings, closeoutStageStatus === 'stage-complete' && closeout?.acceptanceState === 'Stage 1 verified', 'closeout is stage-complete, not production enabled', `${closeoutStageStatus || 'missing'} / ${closeout?.acceptanceState || 'missing'}`)
  addFinding(findings, productionCard && ['scoped', 'executing'].includes(productionCard.lane), 'production card remains scoped/executing, not done', productionCard?.lane || 'missing')
  addFinding(findings, realUserRepairCard?.lane === 'done', 'Steve real-user repair remains accepted', realUserRepairCard?.lane || 'missing')
  addFinding(findings, currentPlan.includes('Stage 1 production dry-run report') && currentPlan.includes('Production auto-send remains stopped'), 'current plan records Stage 1 without enablement', 'current-plan')
  addFinding(findings, currentState.includes('Stage 1 production dry-run report') && currentState.includes('production auto-send remains disabled'), 'current state records Stage 1 without enablement', 'current-state')
  addFinding(findings, !opsDryRun || opsDryRun?.summary?.totalCandidates === dryRunReport.summary?.totalCandidates, 'live Ops proof matches report candidate count', String(opsDryRun?.summary?.totalCandidates || dryRunReport.summary?.totalCandidates || 0))

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
    stage: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE,
    closeoutKey: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY,
    report: dryRunReport,
    findings,
    summary: {
      totalCandidates: dryRunReport.summary?.totalCandidates || 0,
      tasksInspected: dryRunReport.source?.tasksInspected || 0,
      sendableCount: dryRunReport.summary?.sendableCount || 0,
      byClassification: dryRunReport.summary?.byClassification || {},
      productionAutoSendEnabled: dryRunReport.productionEnablement?.enabled === true,
      envToggleEnabled: dryRunReport.productionEnablement?.envToggle === true,
      productionApprovalArtifactExists,
      metadataOnly: dryRunReport.privacy?.metadataOnly === true && !hasPrivateProofLeak(dryRunReport),
      cardLane: productionCard?.lane || '',
      closeoutStatus: closeoutStageStatus,
      closeoutAcceptanceState: closeout?.acceptanceState || '',
      nextAction: dryRunReport.productionEnablement?.nextAction || '',
      wouldBeEmailedPreview: dryRunReport.summary?.wouldBeEmailedPreview || [],
    },
  }
}

function summarizeJobRuntime(foundationJobs = {}) {
  const jobs = Array.isArray(foundationJobs?.jobs) ? foundationJobs.jobs : []
  const latestRuns = Array.isArray(foundationJobs?.latestRuns) ? foundationJobs.latestRuns : []
  const job = jobs.find(item => item.key === AGENT_FEEDBACK_AUTO_SEND_JOB_KEY) || null
  const latestRun = job?.latestRun || latestRuns.find(run => run.jobKey === AGENT_FEEDBACK_AUTO_SEND_JOB_KEY) || null
  return {
    job,
    latestRun,
    enabled: job?.enabled !== false,
    runtimeMode: job?.runtimeMode || '',
    lastRunStatus: latestRun?.status || '',
    lastRunAt: latestRun?.finishedAt || latestRun?.startedAt || latestRun?.createdAt || '',
    nextRunAt: job?.nextRunAt || '',
  }
}

export async function buildAgentFeedbackProductionAutoSendEnableStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  opsHub = null,
  readiness = null,
} = {}) {
  const findings = []
  const foundationJobs = foundationHub?.foundationJobs || opsHub?.foundationJobs || null
  const autoSend = readiness || foundationHub?.agentFeedbackAutoSend || await buildAgentFeedbackAutoSendReadiness({
    repoRoot,
    includeCandidates: false,
    foundationJobs,
  })
  const [
    packageSource,
    approvedPlan,
    cardApproval,
    liveApproval,
    proofSource,
    autoSendSource,
    dryRunSource,
    reminderSource,
    jobsSource,
    serverSource,
    foundationFrontendSource,
    opsUiSource,
    foundationVerifySource,
    sourceContractsSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    readOptionalText(repoRoot, 'package.json'),
    readOptionalText(repoRoot, AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_APPROVED_PLAN_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_APPROVAL_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_AUTO_SEND_DEFAULT_LIVE_APPROVAL_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_PROOF_PATH),
    readOptionalText(repoRoot, 'lib/agent-feedback-auto-send.js'),
    readOptionalText(repoRoot, 'lib/agent-feedback-production-autosend-dry-run.js'),
    readOptionalText(repoRoot, 'lib/agent-feedback-reminders.js'),
    readOptionalText(repoRoot, 'lib/foundation-jobs.js'),
    readOptionalText(repoRoot, 'server.js'),
    Promise.all([
      readOptionalText(repoRoot, 'public/foundation.js'),
      readOptionalText(repoRoot, 'public/foundation-source-registry-renderers.js'),
      readOptionalText(repoRoot, 'public/foundation-fub-lead-source-renderers.js'),
      readOptionalText(repoRoot, 'public/foundation-system-inventory-renderers.js'),
      readOptionalText(repoRoot, 'public/foundation-current-state-renderers.js'),
      readOptionalText(repoRoot, 'public/foundation-source-lifecycle-renderers.js'),
      readOptionalText(repoRoot, 'public/foundation-runtime-renderers.js'),
      readOptionalText(repoRoot, 'public/foundation-operations-renderers.js'),
    ]).then(parts => parts.join('\n')),
    readOptionalText(repoRoot, 'public/ops.js'),
    readOptionalText(repoRoot, 'scripts/foundation-verify.mjs'),
    readOptionalText(repoRoot, 'lib/source-contracts.js'),
    readOptionalText(repoRoot, 'docs/rebuild/current-plan.md'),
    readOptionalText(repoRoot, 'docs/rebuild/current-state.md'),
  ])
  const liveApprovalArtifactExists = await pathExists(repoRoot, AGENT_FEEDBACK_AUTO_SEND_DEFAULT_LIVE_APPROVAL_PATH)
  const cardApprovalArtifactExists = await pathExists(repoRoot, AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_APPROVAL_PATH)
  const cards = foundationHub?.backlogItems || []
  const productionCard = cards.find(card => card.id === AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) || null
  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
    { backlogId: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID },
  )
  const closeoutOwners = Array.isArray(closeout?.backlogIds) ? closeout.backlogIds : []
  const sourceSystem = (foundationHub?.sourceOfTruth?.groupedSystems || []).find(system =>
    system.systemId === 'SYS-AGENT-ONBOARDING-FEEDBACK-001'
  ) || null
  const jobRuntime = summarizeJobRuntime(foundationJobs || {})
  const summary = autoSend.summary || {}
  const reminder = foundationHub?.agentFeedbackReminders || opsHub?.agentFeedbackReminders || null

  addFinding(findings, Boolean(approvedPlan), 'approved production plan exists', AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_APPROVED_PLAN_PATH)
  addFinding(findings, cardApprovalArtifactExists && Boolean(cardApproval), 'card approval artifact exists', AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_APPROVAL_PATH)
  addFinding(findings, liveApprovalArtifactExists && Boolean(liveApproval), 'live approval artifact exists', AGENT_FEEDBACK_AUTO_SEND_DEFAULT_LIVE_APPROVAL_PATH)
  addFinding(findings, Boolean(proofSource), 'production enable proof artifact exists', AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_PROOF_PATH)
  addFinding(findings, packageSource.includes('"agent-feedback:auto-send"') && packageSource.includes('"process:agent-feedback-production-autosend-enable-check"'), 'package exposes production enable commands', 'agent-feedback:auto-send and process check')
  addFinding(findings, includesAll(autoSendSource, [
    'runAgentFeedbackProductionAutoSend',
    'sendProductionAutoSendCandidate',
    'production-live-send',
    'clickup_requested_writeback_failed',
    'resendAllowed: false',
  ]), 'auto-send module includes governed live sender and repair state', 'lib/agent-feedback-auto-send.js')
  addFinding(findings, includesAll(autoSendSource, [
    'createAgentFeedbackSendAttempt',
    'sendGmailMessage',
    'markAgentFeedbackRequestedInClickUp',
    'updateAgentFeedbackSendAttemptStatus',
  ]), 'live sender sequences ledger, Gmail, and ClickUp Requested', 'ledger -> Gmail -> Requested')
  addFinding(findings, includesAll(dryRunSource, [
    'buildAgentFeedbackProductionAutoSendDryRunReport',
    'buildAgentFeedbackProductionAutoSendEnableStatus',
  ]), 'Stage 1 dry-run report remains available beside enable proof', 'lib/agent-feedback-production-autosend-dry-run.js')
  addFinding(findings, includesAll(jobsSource, [AGENT_FEEDBACK_AUTO_SEND_JOB_KEY, '--mode=live', 'daily governed production send', "scheduleLocalTime: '08:30'", "scheduleTimezone: 'America/Toronto'"]), 'Foundation job runs live governed auto-send at a morning local schedule', AGENT_FEEDBACK_AUTO_SEND_JOB_KEY)
  addFinding(findings, includesAll(serverSource, ['agentFeedbackAutoSend', 'foundationJobs']), 'Foundation/Ops APIs expose auto-send state with job runtime', 'server.js')
  addFinding(findings, foundationFrontendSource.includes('Production auto-send enabled') && foundationFrontendSource.includes('Last run:') && foundationFrontendSource.includes('Send window:'), 'Runtime Health shows enabled state, last run, next run, send window, and counts', 'Foundation frontend bundle')
  addFinding(findings, opsUiSource.includes('Feedback production auto-send'), 'Ops names production auto-send job', 'public/ops.js')
  addFinding(findings, foundationVerifySource.includes('buildAgentFeedbackProductionAutoSendEnableStatus'), 'foundation verifier covers production enable status', 'scripts/foundation-verify.mjs')
  addFinding(findings, sourceContractsSource.includes("implementationState: 'live'") && sourceContractsSource.includes('Production auto-send is live'), 'source truth marks Agent Onboarding Feedback live when enabled', 'lib/source-contracts.js')
  addFinding(findings, autoSend.status === 'healthy', 'auto-send runtime status is healthy', autoSend.status)
  addFinding(findings, summary.productionAutoSendEnabled === true && summary.liveGuardDecision === 'live_send_allowed', 'production auto-send live guard is enabled', summary.liveGuardDecision || 'missing')
  addFinding(findings, summary.sendWindowStart === '08:30' && summary.sendWindowEnd === '10:00' && summary.sendWindowTimezone === 'America/Toronto', 'production auto-send has a morning send window', `${summary.sendWindowStart || 'missing'}-${summary.sendWindowEnd || 'missing'} ${summary.sendWindowTimezone || ''}`.trim())
  addFinding(findings, summary.jobEnabled === true && jobRuntime.runtimeMode === 'scheduled', 'production auto-send job is enabled and scheduled', `${jobRuntime.enabled}/${jobRuntime.runtimeMode}`)
  addFinding(findings, Boolean(jobRuntime.lastRunAt) && jobRuntime.lastRunStatus === 'succeeded', 'last production run succeeded', `${jobRuntime.lastRunStatus || 'missing'} ${jobRuntime.lastRunAt || ''}`.trim())
  addFinding(findings, Boolean(jobRuntime.nextRunAt), 'next production run is visible', jobRuntime.nextRunAt || 'missing')
  addFinding(findings, Number.isFinite(Number(summary.sentCount)) && Number.isFinite(Number(summary.skippedCount)) &&
    Number.isFinite(Number(summary.blockedCount)) && Number.isFinite(Number(summary.warningCount)) &&
    Number.isFinite(Number(summary.repairCount)), 'Runtime/Ops expose sent, skipped, blocked, warning, and repair counts', JSON.stringify({
      sent: summary.sentCount,
      skipped: summary.skippedCount,
      blocked: summary.blockedCount,
      warning: summary.warningCount,
      repair: summary.repairCount,
    }))
  addFinding(findings, (
    (reminder?.runtimeMode === 'dry-run-report-only' && reminder?.summary?.dryRunOnly === true) ||
    (reminder?.runtimeMode === 'production-live-reminders' && reminder?.summary?.liveRemindersEnabled === true)
  ), 'reminder runtime is explicitly governed', reminder?.runtimeMode || 'missing')
  addFinding(findings, reminderSource.includes('No reminder runs before a successful initial request') || foundationFrontendSource.includes('duplicate reminder slots are blocked'), 'reminder guardrails are visible', 'successful initial request, stop states, duplicate slots')
  addFinding(findings, !hasPrivateProofLeak(proofSource) && !hasPrivateProofLeak(autoSend), 'broad proof has no raw emails, token URLs, or feedback content', 'metadata-only')
  addFinding(findings, productionCard?.lane === 'done' && /agent-feedback-production-autosend-enable-v1/.test(productionCard?.statusNote || ''), 'production card is done for enablement', productionCard?.lane || 'missing')
  addFinding(findings, closeoutOwners.length === 1 && closeoutOwners.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID), 'closeout owns only production auto-send card', closeoutOwners.join(', ') || 'missing')
  addFinding(findings, closeout?.acceptanceState === 'Verified', 'closeout is verified', closeout?.acceptanceState || 'missing')
  addFinding(findings, sourceSystem?.implementationState === 'live' || sourceContractsSource.includes("implementationState: 'live'"), 'Agent Onboarding Feedback source system is live', sourceSystem?.implementationState || 'source check')
  addFinding(findings, currentPlan.includes('production auto-send is live') && currentPlan.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID), 'current plan records production auto-send live', 'current-plan')
  addFinding(findings, currentState.includes('production auto-send is live') && currentState.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID), 'current state records production auto-send live', 'current-state')

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
    autoSend,
    findings,
    summary: {
      productionAutoSendEnabled: summary.productionAutoSendEnabled === true,
      liveGuardDecision: summary.liveGuardDecision || '',
      sendWindowOpen: summary.sendWindowOpen === true,
      sendWindow: `${summary.sendWindowStart || ''}-${summary.sendWindowEnd || ''} ${summary.sendWindowTimezone || ''}`.trim(),
      sentCount: Number(summary.sentCount || 0),
      skippedCount: Number(summary.skippedCount || 0),
      blockedCount: Number(summary.blockedCount || 0),
      warningCount: Number(summary.warningCount || 0),
      repairCount: Number(summary.repairCount || 0),
      lastRunAt: jobRuntime.lastRunAt,
      lastRunStatus: jobRuntime.lastRunStatus,
      nextRunAt: jobRuntime.nextRunAt,
      cardLane: productionCard?.lane || '',
      closeoutStatus: closeout?.status || closeout?.operatorStatus || '',
      closeoutAcceptanceState: closeout?.acceptanceState || '',
      remindersMode: reminder?.runtimeMode || '',
      metadataOnly: !hasPrivateProofLeak(proofSource) && !hasPrivateProofLeak(autoSend),
    },
  }
}
