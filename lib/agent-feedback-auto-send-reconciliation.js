export const AGENT_FEEDBACK_AUTO_SEND_RECONCILIATION_KEY = 'agent-feedback-auto-send-stale-reaper-no-open-side-effects-v1'
export const AGENT_FEEDBACK_AUTO_SEND_RECONCILED_STATUS = 'reconciled_no_open_side_effects'
export const AGENT_FEEDBACK_AUTO_SEND_OPERATOR_BLOCKED_STATUS = 'operator_blocked_external_write_review'
export const AGENT_FEEDBACK_AUTO_SEND_STALE_REAPER_ERROR = 'Marked failed by stale active-run reaper.'
export const AGENT_FEEDBACK_AUTO_SEND_RECONCILIATION_METADATA_KEY = 'agentFeedbackAutoSendReconciliation'

const AUTO_SEND_JOB_KEY = 'agent-feedback-auto-send-readiness'
const PRODUCTION_RUN_ID_PREFIX = 'agent-feedback-production-autosend-'

function normalizeText(value) {
  return String(value || '').trim()
}

function compactIsoStamp(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
}

export function deriveAgentFeedbackAutoSendRunIdForJobRun(run = {}) {
  const metadataRunId = normalizeText(run.metadata?.agentFeedbackAutoSendRunId || run.metadata?.runId)
  if (metadataRunId.startsWith(PRODUCTION_RUN_ID_PREFIX)) return metadataRunId

  const runIdStamp = normalizeText(run.runId).match(/agent-feedback-auto-send-readiness-(\d{14})-/)?.[1] || ''
  const timestamp = runIdStamp || compactIsoStamp(run.startedAt || run.createdAt)
  return timestamp ? `${PRODUCTION_RUN_ID_PREFIX}${timestamp}` : ''
}

function hasPrivateAttemptLeak(attempt = {}) {
  const metadata = attempt.metadata && typeof attempt.metadata === 'object' ? attempt.metadata : {}
  return metadata.rawEmailsLogged === true ||
    metadata.rawEmailLogged === true ||
    metadata.rawTokenLogged === true ||
    metadata.tokenUrlLogged === true ||
    metadata.feedbackContentLogged === true
}

export function summarizeAgentFeedbackAutoSendRunAttempts(attempts = []) {
  const rows = Array.isArray(attempts) ? attempts : []
  const statusCounts = {}
  let clickUpRequestedCount = 0
  let completedExternalWriteCount = 0
  let openSendingCount = 0
  let resendAllowedCount = 0
  let gmailSucceededWithoutClickUpCount = 0
  let privateLeakCount = 0

  for (const attempt of rows) {
    const status = normalizeText(attempt.status || 'unknown') || 'unknown'
    const metadata = attempt.metadata && typeof attempt.metadata === 'object' ? attempt.metadata : {}
    const gmailSucceeded = metadata.gmailSendSucceeded === true || Boolean(attempt.gmailMessageId)
    const clickUpRequested = status === 'clickup_requested' || metadata.clickUpRequestedWritten === true
    statusCounts[status] = (statusCounts[status] || 0) + 1
    if (status === 'sending') openSendingCount += 1
    if (metadata.resendAllowed !== false) resendAllowedCount += 1
    if (clickUpRequested) clickUpRequestedCount += 1
    if (gmailSucceeded && clickUpRequested) completedExternalWriteCount += 1
    if (gmailSucceeded && !clickUpRequested) gmailSucceededWithoutClickUpCount += 1
    if (hasPrivateAttemptLeak(attempt)) privateLeakCount += 1
  }

  return {
    attemptCount: rows.length,
    statusCounts,
    clickUpRequestedCount,
    completedExternalWriteCount,
    openSendingCount,
    resendAllowedCount,
    gmailSucceededWithoutClickUpCount,
    privateLeakCount,
  }
}

function readinessSummary(readiness = {}) {
  const summary = readiness.summary || {}
  const sideEffects = readiness.report?.sideEffects || {}
  return {
    wouldSendCount: Number(summary.wouldSendCount ?? readiness.report?.counts?.wouldSend ?? 0),
    repairCount: Number(summary.repairCount ?? readiness.report?.counts?.repair ?? 0),
    metadataOnly: summary.metadataOnly === true || readiness.privacy?.metadataOnly === true,
    reportGmailSent: sideEffects.gmailSent === true,
    reportClickUpRequestedWritten: sideEffects.clickUpRequestedWritten === true,
    liveGuardDecision: summary.liveGuardDecision || readiness.liveGuard?.decision || '',
  }
}

function isStaleReapedAutoSendRun(run = {}) {
  return run?.jobKey === AUTO_SEND_JOB_KEY &&
    run?.status === 'failed' &&
    /stale active-run reaper/i.test(normalizeText(run.errorMessage || run.metadata?.errorMessage || AGENT_FEEDBACK_AUTO_SEND_STALE_REAPER_ERROR))
}

export function buildAgentFeedbackAutoSendRunReconciliation({
  foundationJobRun = {},
  sendAttempts = [],
  readiness = {},
  now = new Date(),
  actor = 'foundation',
} = {}) {
  const logicalRunId = deriveAgentFeedbackAutoSendRunIdForJobRun(foundationJobRun)
  const attempts = summarizeAgentFeedbackAutoSendRunAttempts(sendAttempts)
  const currentReadiness = readinessSummary(readiness)
  const blockingReasons = []

  if (!isStaleReapedAutoSendRun(foundationJobRun)) blockingReasons.push('latest_job_run_is_not_stale_reaped_auto_send_failure')
  if (!logicalRunId) blockingReasons.push('logical_production_run_id_missing')
  if (attempts.attemptCount < 1) blockingReasons.push('no_send_attempt_for_production_run')
  if (attempts.openSendingCount > 0) blockingReasons.push('send_attempt_still_open')
  if (attempts.resendAllowedCount > 0) blockingReasons.push('send_attempt_resend_allowed_or_unproven')
  if (attempts.gmailSucceededWithoutClickUpCount > 0) blockingReasons.push('gmail_succeeded_without_clickup_requested')
  if (attempts.privateLeakCount > 0) blockingReasons.push('private_proof_leak_in_attempt_metadata')
  if (attempts.completedExternalWriteCount !== attempts.attemptCount) blockingReasons.push('not_all_attempts_completed_gmail_and_clickup')
  if (currentReadiness.wouldSendCount !== 0) blockingReasons.push('current_report_still_has_would_send_candidates')
  if (currentReadiness.repairCount !== 0) blockingReasons.push('current_report_still_has_repair_candidates')
  if (currentReadiness.metadataOnly !== true) blockingReasons.push('current_report_not_metadata_only')
  if (currentReadiness.reportGmailSent === true) blockingReasons.push('repair_report_sent_gmail')
  if (currentReadiness.reportClickUpRequestedWritten === true) blockingReasons.push('repair_report_wrote_clickup_requested')

  const ok = blockingReasons.length === 0
  const status = ok
    ? AGENT_FEEDBACK_AUTO_SEND_RECONCILED_STATUS
    : AGENT_FEEDBACK_AUTO_SEND_OPERATOR_BLOCKED_STATUS
  const evidence = {
    logicalRunId,
    attemptCount: attempts.attemptCount,
    clickUpRequestedCount: attempts.clickUpRequestedCount,
    completedExternalWriteCount: attempts.completedExternalWriteCount,
    openSendingCount: attempts.openSendingCount,
    resendAllowedCount: attempts.resendAllowedCount,
    gmailSucceededWithoutClickUpCount: attempts.gmailSucceededWithoutClickUpCount,
    privateLeakCount: attempts.privateLeakCount,
    wouldSendCount: currentReadiness.wouldSendCount,
    repairCount: currentReadiness.repairCount,
    metadataOnly: currentReadiness.metadataOnly,
    reportGmailSent: currentReadiness.reportGmailSent,
    reportClickUpRequestedWritten: currentReadiness.reportClickUpRequestedWritten,
  }

  return {
    ok,
    status,
    key: AGENT_FEEDBACK_AUTO_SEND_RECONCILIATION_KEY,
    logicalRunId,
    evidence,
    blockingReasons,
    operatorAction: ok
      ? 'Do not rerun live auto-send; record the no-send/no-ClickUp reconciliation and keep scheduled runtime visible.'
      : 'Operator approval is required before any live auto-send rerun or external-write repair.',
    metadataPatch: ok ? {
      [AGENT_FEEDBACK_AUTO_SEND_RECONCILIATION_METADATA_KEY]: {
        key: AGENT_FEEDBACK_AUTO_SEND_RECONCILIATION_KEY,
        status,
        actor,
        reconciledAt: (now instanceof Date ? now : new Date(now)).toISOString(),
        staleRunStatus: foundationJobRun.status || '',
        staleRunError: foundationJobRun.errorMessage || AGENT_FEEDBACK_AUTO_SEND_STALE_REAPER_ERROR,
        logicalRunId,
        evidence,
        repairSentGmail: false,
        repairWroteClickUp: false,
        noLiveRerunApproved: true,
        hiddenGreen: false,
      },
    } : null,
  }
}

export function getAgentFeedbackAutoSendJobRunReconciliation(run = {}) {
  const metadata = run?.metadata && typeof run.metadata === 'object' ? run.metadata : {}
  const reconciliation = metadata[AGENT_FEEDBACK_AUTO_SEND_RECONCILIATION_METADATA_KEY] || null
  const reconciled = reconciliation?.key === AGENT_FEEDBACK_AUTO_SEND_RECONCILIATION_KEY &&
    reconciliation?.status === AGENT_FEEDBACK_AUTO_SEND_RECONCILED_STATUS &&
    reconciliation?.repairSentGmail === false &&
    reconciliation?.repairWroteClickUp === false &&
    reconciliation?.hiddenGreen === false
  return {
    reconciled,
    status: reconciliation?.status || '',
    key: reconciliation?.key || '',
    logicalRunId: reconciliation?.logicalRunId || '',
    evidence: reconciliation?.evidence || {},
  }
}

export function buildSyntheticAgentFeedbackAutoSendReconciliationProof() {
  const run = {
    runId: 'job-agent-feedback-auto-send-readiness-20260517123043-synth',
    jobKey: AUTO_SEND_JOB_KEY,
    status: 'failed',
    startedAt: '2026-05-17T12:30:43.000Z',
    errorMessage: AGENT_FEEDBACK_AUTO_SEND_STALE_REAPER_ERROR,
    metadata: {},
  }
  const attempt = {
    status: 'clickup_requested',
    gmailMessageId: 'gmail-synthetic',
    metadata: {
      runId: 'agent-feedback-production-autosend-20260517123043',
      gmailSendSucceeded: true,
      clickUpRequestedWritten: true,
      resendAllowed: false,
      rawEmailsLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
  }
  const readiness = {
    summary: {
      wouldSendCount: 0,
      repairCount: 0,
      metadataOnly: true,
      liveGuardDecision: 'live_send_allowed',
    },
    report: {
      sideEffects: {
        gmailSent: false,
        clickUpRequestedWritten: false,
      },
    },
  }

  const good = buildAgentFeedbackAutoSendRunReconciliation({ foundationJobRun: run, sendAttempts: [attempt], readiness })
  const openSend = buildAgentFeedbackAutoSendRunReconciliation({
    foundationJobRun: run,
    sendAttempts: [{ ...attempt, status: 'sending' }],
    readiness,
  })
  const halfWrite = buildAgentFeedbackAutoSendRunReconciliation({
    foundationJobRun: run,
    sendAttempts: [{ ...attempt, status: 'sent', metadata: { ...attempt.metadata, clickUpRequestedWritten: false } }],
    readiness,
  })
  const resendAllowed = buildAgentFeedbackAutoSendRunReconciliation({
    foundationJobRun: run,
    sendAttempts: [{ ...attempt, metadata: { ...attempt.metadata, resendAllowed: true } }],
    readiness,
  })
  const wouldSend = buildAgentFeedbackAutoSendRunReconciliation({
    foundationJobRun: run,
    sendAttempts: [attempt],
    readiness: { ...readiness, summary: { ...readiness.summary, wouldSendCount: 1 } },
  })
  const privateLeak = buildAgentFeedbackAutoSendRunReconciliation({
    foundationJobRun: run,
    sendAttempts: [{ ...attempt, metadata: { ...attempt.metadata, rawEmailsLogged: true } }],
    readiness,
  })
  const genericFailure = buildAgentFeedbackAutoSendRunReconciliation({
    foundationJobRun: { ...run, errorMessage: 'Synthetic process failed.' },
    sendAttempts: [attempt],
    readiness,
  })

  return {
    ok: good.ok === true &&
      openSend.ok === false &&
      halfWrite.ok === false &&
      resendAllowed.ok === false &&
      wouldSend.ok === false &&
      privateLeak.ok === false &&
      genericFailure.ok === false,
    good,
    rejected: {
      openSend: openSend.blockingReasons,
      halfWrite: halfWrite.blockingReasons,
      resendAllowed: resendAllowed.blockingReasons,
      wouldSend: wouldSend.blockingReasons,
      privateLeak: privateLeak.blockingReasons,
      genericFailure: genericFailure.blockingReasons,
    },
  }
}
