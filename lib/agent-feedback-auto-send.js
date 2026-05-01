import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
} from './agent-feedback-send.js'
import { buildAgentFeedbackRequestedWritebackPlan } from './agent-feedback-clickup.js'
import { CLICKUP_AGENT_ROSTER_LIST_ID } from './agent-roster-review.js'
import { getClickUpListSnapshot } from './clickup.js'
import { getActiveAgentFeedbackSendAttempt } from './foundation-db.js'

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
export const AGENT_FEEDBACK_AUTO_SEND_DEFAULT_LIVE_APPROVAL_PATH = 'docs/process/approvals/agent-feedback-auto-send-live-approval.json'

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
const AUTO_SEND_REPORT_CACHE_MS = 5 * 60 * 1000
let autoSendReportCache = null

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

function classifyCandidateAction(candidate, eligibility, activeSendAttempt) {
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

function sanitizeCandidate(candidate, eligibility, recipientPlan, activeSendAttempt, writebackPlan) {
  const action = classifyCandidateAction(candidate, eligibility, activeSendAttempt)
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

export async function buildAgentFeedbackAutoSendDryRunReport({
  now = new Date(),
  includeCandidates = true,
  forceRefresh = false,
} = {}) {
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime()
  if (
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

  const georgiaInput = candidateInputs.find(candidate => isGeorgiaDay30(candidate)) || candidateInputs[0] || null
  const oversightReference = georgiaInput
    ? await buildAgentFeedbackRecipientPlan(georgiaInput)
    : {
        bccRolesRequested: ['Steve', 'Carson', 'Ryan', 'Georgia'],
        bccRolesApplied: [],
        bccMissingConfiguredRoles: ['Steve', 'Carson', 'Ryan', 'Georgia'],
      }

  const candidates = []
  for (const candidate of candidateInputs) {
    const recipientPlan = isGeorgiaDay30(candidate)
      ? oversightReference
      : buildFastRecipientPlan(candidate, oversightReference)
    const [activeSendAttempt, writebackPlan] = await Promise.all([
        getActiveAgentFeedbackSendAttempt({
          taskId: candidate.taskId,
          milestoneDay: candidate.milestoneDay,
        }),
        buildAgentFeedbackRequestedWritebackPlan({ milestoneDay: candidate.milestoneDay }),
      ])
    const eligibility = buildAgentFeedbackEligibility(candidate, activeSendAttempt, recipientPlan)
    candidates.push(sanitizeCandidate(candidate, eligibility, recipientPlan, activeSendAttempt, writebackPlan))
  }

  const georgiaDay30 = candidates.find(candidate => candidate.targetLabel === 'Georgia' && candidate.milestoneDay === 30) || null
  const counts = summarizeCounts(candidates)
  const report = {
    mode: 'dry-run-report-only',
    sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
    listIdHash: hashAgentFeedbackProofValue(CLICKUP_AGENT_ROSTER_LIST_ID),
    generatedAt: now.toISOString(),
    scanner: {
      cadence: 'daily scheduled scan',
      milestones: AGENT_FEEDBACK_MILESTONE_DAYS,
      candidateCount: candidates.length,
      tasksInspected: Array.isArray(snapshot.tasks) ? snapshot.tasks.length : 0,
      dryRunOnly: true,
    },
    counts,
    georgiaDay30,
    candidates: includeCandidates ? candidates : candidates.slice(0, 12),
    sideEffects: { ...EXTERNAL_SIDE_EFFECTS_DISABLED },
  }
  autoSendReportCache = {
    createdAtMs: Date.now(),
    report: {
      ...report,
      candidates,
    },
  }
  return report
}

export async function buildAgentFeedbackAutoSendReadiness({
  repoRoot = defaultRepoRoot,
  env = process.env,
  approvalConfig = null,
  includeCandidates = false,
  now = new Date(),
} = {}) {
  const report = await buildAgentFeedbackAutoSendDryRunReport({ now, includeCandidates })
  const georgiaDay30 = report.georgiaDay30
  const liveApprovalConfig = await loadAgentFeedbackAutoSendApprovalConfig({ repoRoot, env, approvalConfig })
  const liveGuard = evaluateAgentFeedbackAutoSendLiveGuard({
    env,
    approvalConfig: liveApprovalConfig,
    candidate: georgiaDay30,
  })
  const guardMatrix = buildAgentFeedbackAutoSendGuardMatrix(georgiaDay30)
  const privacyLeak = hasPrivateProofLeak({ report, liveGuard })

  return {
    status: georgiaDay30?.action === 'would_send' &&
      liveGuard.decision === 'report_only' &&
      !privacyLeak
      ? 'healthy'
      : 'risk',
    cardId: AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
    runtimeMode: 'dry-run-report-only',
    liveSendDefault: 'disabled',
    report,
    liveGuard,
    guardMatrix,
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
      defaultCannotSend: guardMatrix.defaultDryRunCannotSend.canLiveSend === false,
      toggleAloneCannotSend: guardMatrix.toggleAloneCannotSend.canLiveSend === false,
      allowlistAloneCannotSend: guardMatrix.allowlistAloneCannotSend.canLiveSend === false,
      bothKeysRequired: guardMatrix.bothToggleAndAllowlistWouldPermitTestOnly.canLiveSend === true,
      productionAllRequiresSeparateApproval: guardMatrix.productionAllWithoutSeparateApprovalCannotSend.canLiveSend === false,
      liveGuardDecision: liveGuard.decision,
      metadataOnly: !privacyLeak,
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
    readOptionalText(repoRoot, 'lib/foundation-build-log.js'),
  ])
  const cards = foundationHub?.backlogItems || []
  const autoSendCard = cards.find(card => card.id === AGENT_FEEDBACK_AUTO_SEND_CARD_ID) || null
  const georgiaSendCard = cards.find(card => card.id === 'AGENT-FEEDBACK-GEORGIA-SEND-001') || null
  const closeout = (foundationBuildLog?.builds || []).find(build => build.closeoutKey === AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY) || null
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
  addFinding(findings, includesAll(jobsSource, [AGENT_FEEDBACK_AUTO_SEND_JOB_KEY, 'agent-feedback:auto-send', '--mode=dry-run', "servesHubs: ['ops']"]), 'Foundation job registry includes Ops-serving dry-run readiness job', AGENT_FEEDBACK_AUTO_SEND_JOB_KEY)
  addFinding(findings, includesAll(serverSource, ['buildAgentFeedbackAutoSendReadiness', 'agentFeedbackAutoSend']), 'Foundation and Ops APIs expose auto-send readiness status', 'server.js')
  addFinding(findings, foundationVerifySource.includes(AGENT_FEEDBACK_AUTO_SEND_CARD_ID), 'foundation verifier covers auto-send card', AGENT_FEEDBACK_AUTO_SEND_CARD_ID)
  addFinding(findings, buildLogSource.includes(AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY), 'build log closeout exists in source', AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY)
  addFinding(findings, status.status === 'healthy', 'auto-send readiness status is healthy', status.status)
  addFinding(findings, status.summary?.georgiaDay30Action === 'would_send' && status.summary?.georgiaDay30Eligible === true, 'Georgia Day-30 is discovered as would_send in dry-run', status.summary?.georgiaDay30Action || 'missing')
  addFinding(findings, status.summary?.defaultCannotSend === true, 'default mode cannot send', 'default dry-run/report-only')
  addFinding(findings, status.summary?.toggleAloneCannotSend === true, 'runtime toggle alone cannot send', AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV)
  addFinding(findings, status.summary?.allowlistAloneCannotSend === true, 'allowlist alone cannot send', 'test-only allowlist without runtime toggle')
  addFinding(findings, status.summary?.bothKeysRequired === true, 'both toggle and approved allowlist are required for test-only live send', 'synthetic guard only, no send executed')
  addFinding(findings, status.summary?.productionAllRequiresSeparateApproval === true, 'production-all requires separate approval artifact', 'production-all no separate approval cannot send')
  addFinding(findings, status.summary?.liveGuardDecision === 'report_only', 'live runtime guard is report-only by default', status.summary?.liveGuardDecision || 'missing')
  addFinding(findings, status.report?.sideEffects?.gmailSent === false && status.report?.sideEffects?.clickUpRequestedWritten === false, 'dry-run report has no external side effects', JSON.stringify(status.report?.sideEffects || {}))
  addFinding(findings, status.summary?.metadataOnly === true && !hasPrivateProofLeak(readinessProof) && !hasPrivateProofLeak(status), 'auto-send proof has no raw emails, token URLs, or feedback content', 'metadata-only')
  addFinding(findings, Number(status.summary?.wouldSendCount) >= 1 && Number.isFinite(Number(status.summary?.blockedCount)), 'runtime counts include would-send, sent, skipped, blocked, warning, and repair', JSON.stringify(status.summary || {}))
  addFinding(findings, hubStatus?.summary?.georgiaDay30Action === 'would_send', 'live Foundation Hub exposes Georgia would_send readiness', hubStatus?.summary?.georgiaDay30Action || 'missing')
  addFinding(findings, opsStatus?.summary?.georgiaDay30Action === 'would_send', 'live Ops Hub exposes Georgia would_send readiness', opsStatus?.summary?.georgiaDay30Action || 'missing')
  addFinding(findings, opsJobs.some(job => job.key === AGENT_FEEDBACK_AUTO_SEND_JOB_KEY), 'Ops Hub lists auto-send readiness job', AGENT_FEEDBACK_AUTO_SEND_JOB_KEY)
  addFinding(findings, autoSendCard?.lane === 'done' && /agent-feedback-auto-send-v1/.test(autoSendCard?.statusNote || ''), 'auto-send card is done for readiness only', autoSendCard?.lane || 'missing')
  addFinding(findings, georgiaSendCard?.lane === 'scoped', 'Georgia send follow-up remains scoped for test-only approval decision', georgiaSendCard?.lane || 'missing')
  addFinding(findings, closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_AUTO_SEND_CARD_ID), 'closeout owns only auto-send card', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, !(closeout?.backlogIds || []).includes('AGENT-FEEDBACK-GEORGIA-SEND-001'), 'Georgia send card remains context-only, not owned by auto-send closeout', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, currentPlan.includes('AGENT-FEEDBACK-AUTO-SEND-001` is done for readiness') && currentPlan.includes('AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001'), 'current plan records readiness ship and next decision', 'current-plan')
  addFinding(findings, currentState.includes('AGENT-FEEDBACK-AUTO-SEND-001` is done for readiness') && currentState.includes('AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001'), 'current state records readiness ship and next decision', 'current-state')

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
