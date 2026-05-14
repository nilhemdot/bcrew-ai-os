import { CLICKUP_AGENT_ROSTER_LIST_ID } from './agent-roster-review.js'
import {
  AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
  buildAgentFeedbackAutoSendReadiness,
} from './agent-feedback-auto-send.js'
import {
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
  buildAgentFeedbackProductionAutoSendDryRunReport,
} from './agent-feedback-production-autosend-dry-run.js'
import {
  AGENT_FEEDBACK_REMINDER_CARD_ID,
  buildAgentFeedbackReminderReadiness,
} from './agent-feedback-reminders.js'
import { AGENT_FEEDBACK_SEND_SOURCE_ID } from './agent-feedback-send.js'
import {
  buildUnavailableClickUpListSnapshot,
  getClickUpListSnapshotSafe,
} from './clickup.js'

export const FOUNDATION_FULL_DIAGNOSTICS_PERF_CARD_ID = 'FOUNDATION-FULL-DIAGNOSTICS-PERF-001'
export const FOUNDATION_HUB_FULL_ROUTE_SPLIT_CARD_ID = 'FOUNDATION-HUB-FULL-ROUTE-SPLIT-001'
export const FOUNDATION_FULL_DIAGNOSTICS_SPRINT_ID = 'foundation-full-diagnostics-perf-2026-05-14'
export const FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY = 'foundation-full-diagnostics-perf-v1'
export const FOUNDATION_FULL_DIAGNOSTICS_SCRIPT_PATH = 'scripts/process-foundation-full-diagnostics-perf-check.mjs'

export const FOUNDATION_FULL_DIAGNOSTICS_BUDGET = Object.freeze({
  maxSeconds: 15,
  maxBytes: 5500000,
  agentFeedbackDeadlineMs: 8000,
  clickUpRequestTimeoutMs: 6000,
})

function nowIso() {
  return new Date().toISOString()
}

function buildDiagnosticTimeoutSourceHealth({
  label,
  deadlineMs = FOUNDATION_FULL_DIAGNOSTICS_BUDGET.agentFeedbackDeadlineMs,
  checkedAt = nowIso(),
} = {}) {
  return {
    provider: 'clickup',
    sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
    connectorId: 'CONN-CLICKUP-001',
    status: 'degraded',
    reason: 'runtime_diagnostic_timeout',
    checkedAt,
    listId: CLICKUP_AGENT_ROSTER_LIST_ID,
    listName: 'Agent Roster',
    message: `${label || 'Agent Feedback diagnostic'} exceeded the ${deadlineMs}ms full-diagnostics budget.`,
    failSoft: true,
    timedOut: true,
    budgetMs: deadlineMs,
  }
}

function buildTimeoutReport({ label, mode, sourceHealth, generatedAt = nowIso() } = {}) {
  return {
    mode,
    sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
    listIdHash: '',
    generatedAt,
    sourceHealth,
    scanner: {
      cadence: 'runtime diagnostic bounded source-health check',
      candidateCount: 0,
      tasksInspected: 0,
      dryRunOnly: true,
      sourceUnavailable: true,
      timedOut: true,
      timeoutLabel: label,
    },
    counts: {},
    candidates: [],
    sideEffects: {
      gmailSent: false,
      clickUpRequestedWritten: false,
      clickUpReminderWritten: false,
    },
  }
}

function buildAutoSendTimeoutFallback({ deadlineMs, elapsedMs = deadlineMs } = {}) {
  const sourceHealth = buildDiagnosticTimeoutSourceHealth({ label: 'Agent Feedback Auto-Send', deadlineMs })
  return {
    status: 'risk',
    cardId: AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
    closeoutKey: '',
    runtimeMode: 'dry-run-report-only',
    liveSendDefault: 'disabled',
    report: buildTimeoutReport({
      label: 'Agent Feedback Auto-Send',
      mode: 'dry-run-report-only',
      sourceHealth,
    }),
    sourceHealth,
    liveGuard: {
      decision: 'runtime_diagnostic_timeout',
      canLiveSend: false,
      reasons: ['runtime_diagnostic_timeout'],
    },
    summary: {
      mode: 'dry-run-report-only',
      candidatesInspected: 0,
      tasksInspected: 0,
      wouldSendCount: 0,
      sentCount: 0,
      skippedCount: 0,
      blockedCount: 1,
      warningCount: 0,
      repairCount: 0,
      georgiaDay30Action: 'source_unavailable',
      georgiaDay30Eligible: false,
      productionAutoSendEnabled: false,
      enabledState: 'degraded_source',
      failClosedReasons: ['runtime_diagnostic_timeout'],
      liveGuardDecision: 'runtime_diagnostic_timeout',
      sourceHealthStatus: 'degraded',
      sourceUnavailable: true,
      timedOut: true,
      elapsedMs,
    },
    privacy: {
      metadataOnly: true,
      rawEmailLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
  }
}

function buildProductionDryRunTimeoutFallback({ deadlineMs, elapsedMs = deadlineMs } = {}) {
  const sourceHealth = buildDiagnosticTimeoutSourceHealth({ label: 'Agent Feedback Production Dry-Run', deadlineMs })
  return {
    stage: 'production-auto-send-dry-run',
    cardId: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
    mode: 'production-dry-run-report-only',
    generatedAt: nowIso(),
    sourceHealth,
    source: {
      sourceId: AGENT_FEEDBACK_SEND_SOURCE_ID,
      listIdHash: '',
      tasksInspected: 0,
      sourceUnavailable: true,
      timedOut: true,
    },
    summary: {
      totalCandidates: 0,
      sendableCount: 0,
      byClassification: {},
      wouldBeEmailedPreview: [],
      sourceUnavailable: true,
      timedOut: true,
      elapsedMs,
    },
    candidates: [],
    sideEffects: {
      gmailSent: false,
      clickUpRequestedWritten: false,
    },
    productionEnablement: {
      enabled: false,
      nextAction: 'ClickUp source-health timed out inside Foundation full diagnostics; run the dedicated agent-feedback proof for a deep scan.',
    },
    privacy: {
      metadataOnly: true,
      rawEmailLogged: false,
      tokenUrlLogged: false,
      feedbackContentLogged: false,
    },
  }
}

function buildReminderTimeoutFallback({ deadlineMs, elapsedMs = deadlineMs } = {}) {
  const sourceHealth = buildDiagnosticTimeoutSourceHealth({ label: 'Agent Feedback Reminders', deadlineMs })
  return {
    status: 'risk',
    cardId: AGENT_FEEDBACK_REMINDER_CARD_ID,
    closeoutKey: '',
    runtimeMode: 'dry-run-report-only',
    report: buildTimeoutReport({
      label: 'Agent Feedback Reminders',
      mode: 'dry-run-report-only',
      sourceHealth,
    }),
    sourceHealth,
    liveGuard: {
      canLiveSend: false,
      reasons: ['runtime_diagnostic_timeout'],
    },
    summary: {
      mode: 'dry-run-report-only',
      candidatesInspected: 0,
      tasksInspected: 0,
      pendingReminderCount: 0,
      sentReminderCount: 0,
      skippedReminderCount: 0,
      blockedReminderCount: 1,
      maxedOutReminderCount: 0,
      repairReminderCount: 0,
      nextReminderDueDates: [],
      liveRemindersEnabled: false,
      enabledState: 'degraded_source',
      duplicateSlotProtected: false,
      completedSkippedBlockedStop: false,
      sourceUnavailable: true,
      timedOut: true,
      elapsedMs,
    },
    assertions: {
      dryRunOnly: true,
      metadataOnly: true,
    },
    sideEffects: {
      gmailSent: false,
      clickUpRequestedWritten: false,
      clickUpReminderWritten: false,
    },
    privacy: {
      metadataOnly: true,
      rawEmailLogged: false,
      rawTokenLogged: false,
      feedbackContentLogged: false,
    },
  }
}

function createSharedRosterSnapshotGetter({
  timeoutMs = FOUNDATION_FULL_DIAGNOSTICS_BUDGET.clickUpRequestTimeoutMs,
  maxPages = 10,
  getter = getClickUpListSnapshotSafe,
} = {}) {
  let rosterSnapshotPromise = null
  return async function getSharedRosterSnapshot(listId, options = {}) {
    if (String(listId) !== String(CLICKUP_AGENT_ROSTER_LIST_ID)) {
      return getter(listId, {
        ...options,
        timeoutMs,
        maxPages,
      })
    }
    if (!rosterSnapshotPromise) {
      rosterSnapshotPromise = getter(listId, {
        ...options,
        listName: options.listName || 'Agent Roster',
        timeoutMs,
        maxPages,
      })
    }
    return rosterSnapshotPromise
  }
}

async function withDiagnosticDeadline({
  label,
  deadlineMs = FOUNDATION_FULL_DIAGNOSTICS_BUDGET.agentFeedbackDeadlineMs,
  run,
  fallback,
} = {}) {
  const startedAtMs = Date.now()
  let timeout = null
  try {
    return await Promise.race([
      Promise.resolve().then(run),
      new Promise(resolve => {
        timeout = setTimeout(() => {
          resolve(fallback({
            deadlineMs,
            elapsedMs: Math.max(0, Date.now() - startedAtMs),
            label,
          }))
        }, deadlineMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function buildFoundationHubAgentFeedbackDiagnostics({
  repoRoot = process.cwd(),
  foundationJobs = null,
  now = new Date(),
  deadlineMs = FOUNDATION_FULL_DIAGNOSTICS_BUDGET.agentFeedbackDeadlineMs,
  clickUpRequestTimeoutMs = FOUNDATION_FULL_DIAGNOSTICS_BUDGET.clickUpRequestTimeoutMs,
  clickUpMaxPages = 10,
  rosterSnapshotGetter = getClickUpListSnapshotSafe,
  builders = {},
} = {}) {
  const getRosterSnapshot = createSharedRosterSnapshotGetter({
    timeoutMs: clickUpRequestTimeoutMs,
    maxPages: clickUpMaxPages,
    getter: rosterSnapshotGetter,
  })
  const autoSendBuilder = builders.autoSendReadiness || buildAgentFeedbackAutoSendReadiness
  const productionDryRunBuilder = builders.productionDryRun || buildAgentFeedbackProductionAutoSendDryRunReport
  const reminderBuilder = builders.reminderReadiness || buildAgentFeedbackReminderReadiness

  const [
    agentFeedbackAutoSend,
    agentFeedbackProductionAutoSendDryRun,
    agentFeedbackReminders,
  ] = await Promise.all([
    withDiagnosticDeadline({
      label: 'Agent Feedback Auto-Send',
      deadlineMs,
      run: () => autoSendBuilder({
        repoRoot,
        includeCandidates: false,
        foundationJobs,
        now,
        getRosterSnapshot,
      }),
      fallback: buildAutoSendTimeoutFallback,
    }),
    withDiagnosticDeadline({
      label: 'Agent Feedback Production Dry-Run',
      deadlineMs,
      run: () => productionDryRunBuilder({
        includeCandidates: false,
        now,
        getRosterSnapshot,
      }),
      fallback: buildProductionDryRunTimeoutFallback,
    }),
    withDiagnosticDeadline({
      label: 'Agent Feedback Reminders',
      deadlineMs,
      run: () => reminderBuilder({
        repoRoot,
        includeCandidates: false,
        foundationJobs,
        now,
        getRosterSnapshot,
      }),
      fallback: buildReminderTimeoutFallback,
    }),
  ])

  return {
    agentFeedbackAutoSend,
    agentFeedbackProductionAutoSendDryRun,
    agentFeedbackReminders,
    diagnostics: {
      deadlineMs,
      clickUpRequestTimeoutMs,
      clickUpMaxPages,
      boundedSourceHealth: true,
      generatedAt: nowIso(),
    },
  }
}

export function buildFoundationHubSourceOutageBoundary({
  agentFeedbackAutoSend = null,
  agentFeedbackProductionAutoSendDryRun = null,
  agentFeedbackReminders = null,
  generatedAt = nowIso(),
} = {}) {
  const degradedClickUpSurfaces = [
    agentFeedbackAutoSend?.sourceHealth,
    agentFeedbackAutoSend?.report?.sourceHealth,
    agentFeedbackProductionAutoSendDryRun?.sourceHealth,
    agentFeedbackReminders?.sourceHealth,
    agentFeedbackReminders?.report?.sourceHealth,
  ].filter(item => item?.status === 'degraded')

  return {
    status: degradedClickUpSurfaces.length ? 'degraded' : 'healthy',
    generatedAt,
    providers: {
      clickup: degradedClickUpSurfaces[0] || {
        provider: 'clickup',
        sourceId: 'SRC-CLICKUP-001',
        connectorId: 'CONN-CLICKUP-001',
        status: 'healthy',
        reason: 'ok',
      },
    },
    summary: {
      degradedProviderCount: degradedClickUpSurfaces.length ? 1 : 0,
      foundationApisFailSoft: true,
      externalOutageBlocksCoreApi: false,
      fullDiagnosticsBounded: true,
    },
  }
}

export function evaluateFoundationFullDiagnosticsMeasurement(measurement = {}) {
  const seconds = Number(measurement.seconds)
  const bytes = Number(measurement.bytes)
  const checks = [
    {
      ok: Number(measurement.statusCode) === 200,
      check: 'full diagnostics route returns HTTP 200',
      detail: String(measurement.statusCode || 'missing'),
    },
    {
      ok: Number.isFinite(seconds) && seconds <= FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxSeconds,
      check: 'full diagnostics route stays under latency budget',
      detail: `${Number.isFinite(seconds) ? seconds : 'missing'}s <= ${FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxSeconds}s`,
    },
    {
      ok: Number.isFinite(bytes) && bytes <= FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxBytes,
      check: 'full diagnostics route stays under payload budget',
      detail: `${Number.isFinite(bytes) ? bytes : 'missing'} <= ${FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxBytes}`,
    },
  ]
  const findings = checks.filter(check => !check.ok)
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    measurement,
    budget: FOUNDATION_FULL_DIAGNOSTICS_BUDGET,
    checks,
    findings,
  }
}

export async function buildSyntheticFoundationFullDiagnosticsDogfoodProof() {
  const slowBuilder = () => new Promise(resolve => {
    setTimeout(() => {
      resolve({ status: 'healthy', summary: { timedOut: false } })
    }, 50)
  })
  const startedAtMs = Date.now()
  const diagnostics = await buildFoundationHubAgentFeedbackDiagnostics({
    repoRoot: process.cwd(),
    foundationJobs: { jobs: [], latestRuns: [] },
    deadlineMs: 5,
    clickUpRequestTimeoutMs: 5,
    clickUpMaxPages: 1,
    rosterSnapshotGetter: (listId, options) => Promise.resolve(buildUnavailableClickUpListSnapshot(
      listId,
      new Error(`synthetic timeout ${options.timeoutMs}`),
      options,
    )),
    builders: {
      autoSendReadiness: slowBuilder,
      productionDryRun: slowBuilder,
      reminderReadiness: slowBuilder,
    },
  })
  const elapsedMs = Date.now() - startedAtMs
  const boundary = buildFoundationHubSourceOutageBoundary(diagnostics)
  return {
    ok: elapsedMs < 100 &&
      diagnostics.agentFeedbackAutoSend?.sourceHealth?.reason === 'runtime_diagnostic_timeout' &&
      diagnostics.agentFeedbackProductionAutoSendDryRun?.sourceHealth?.reason === 'runtime_diagnostic_timeout' &&
      diagnostics.agentFeedbackReminders?.sourceHealth?.reason === 'runtime_diagnostic_timeout' &&
      boundary.status === 'degraded' &&
      boundary.summary?.externalOutageBlocksCoreApi === false,
    elapsedMs,
    diagnostics,
    boundary,
    invariant: 'A slow optional ClickUp/Agent Feedback panel times out as degraded source health and does not hold the full diagnostics route open.',
  }
}
