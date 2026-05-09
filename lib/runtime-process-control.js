import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const SYSTEM_010_CARD_ID = 'SYSTEM-010-GHOST-CLOSEOUT-001'
export const SYSTEM_010_CLOSEOUT_KEY = 'system-010-ghost-closeout-v1'
export const SYSTEM_010_APPROVAL_PATH = 'docs/process/approvals/SYSTEM-010-GHOST-CLOSEOUT-001.json'
export const SYSTEM_010_PLAN_PATH = 'docs/process/system-010-ghost-closeout-001-plan.md'
export const SYSTEM_010_DOC_PATH = 'docs/process/system-010-ghost-closeout.md'
export const SYSTEM_010_PROCESS_SCRIPT_PATH = 'scripts/process-system-010-ghost-closeout-check.mjs'
export const SYSTEM_010_SUMMARY_MARKER = 'SYSTEM_010_GHOST_CLOSEOUT_SUMMARY'
export const SYSTEM_010_RUNTIME_MODES = Object.freeze(['scheduled', 'manual', 'paused', 'decommissioned'])

const ACTIVE_RUN_STATUSES = new Set(['queued', 'running'])
const ACTIVE_LLM_CALL_STATUSES = new Set(['planned', 'started'])
const CLOSED_SOURCE_ITEM_STATUSES = new Set(['succeeded', 'failed', 'skipped'])
const DEFAULT_STALE_GRACE_SECONDS = 60

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function toIso(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function ageSecondsSince(value, now = new Date()) {
  const iso = toIso(value)
  if (!iso) return null
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000))
}

function numberOrNull(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

function normalizeServiceRuntime(service = {}, fallbackKey = '') {
  const serviceKey = service.serviceKey || service.service || fallbackKey || 'unknown'
  const runningCommit = String(service.runningCommit || '').trim() || null
  const runningShortCommit = String(service.runningShortCommit || '').trim() || (
    runningCommit ? runningCommit.slice(0, 7) : null
  )
  return {
    serviceKey,
    serviceLabel: service.serviceLabel || service.label || serviceKey,
    status: service.status || 'unknown',
    processId: numberOrNull(service.processId),
    runningCommit,
    runningShortCommit,
    startedAt: service.startedAt || null,
    capturedAt: service.capturedAt || null,
    checkName: service.checkName || 'served-code-equals-HEAD',
    restartCommand: service.restartCommand || '',
    plainEnglish: service.plainEnglish || '',
    autoRestartOnPush: Boolean(service.metadata?.autoRestartOnPush),
  }
}

export function normalizeRuntimeMode(value, fallback = 'manual') {
  const normalized = String(value || '').trim()
  if (SYSTEM_010_RUNTIME_MODES.includes(normalized)) return normalized
  return SYSTEM_010_RUNTIME_MODES.includes(fallback) ? fallback : 'manual'
}

export function getJobRunPermission(job = {}, { force = false } = {}) {
  const runtimeMode = normalizeRuntimeMode(job.runtimeMode, job.enabled === false ? 'paused' : 'manual')
  if (runtimeMode === 'decommissioned') {
    return {
      ok: false,
      reason: 'Job is decommissioned. Re-enable through an explicit control change before running it.',
      runtimeMode,
    }
  }

  if (runtimeMode === 'paused' || job.enabled === false) {
    return {
      ok: Boolean(force),
      reason: force ? 'Force run allowed for paused/manual recovery.' : 'Job is paused or disabled.',
      runtimeMode: 'paused',
    }
  }

  return {
    ok: true,
    reason: runtimeMode === 'scheduled' ? 'Scheduled job is runnable.' : 'Manual job is runnable.',
    runtimeMode,
  }
}

export function buildFoundationRunLiveness(run = {}, job = {}, now = new Date()) {
  const status = String(run.status || '').trim()
  const active = ACTIVE_RUN_STATUSES.has(status)
  const startedAt = run.startedAt || run.createdAt || null
  const ageSeconds = active ? ageSecondsSince(startedAt, now) : null
  const maxRuntimeSeconds = Math.max(1, Number(job.maxRuntimeSeconds || run.metadata?.maxRuntimeSeconds || 180))
  const staleAfterSeconds = maxRuntimeSeconds + DEFAULT_STALE_GRACE_SECONDS
  const missingStartedAt = active && ageSeconds == null
  const stale = active && (missingStartedAt || ageSeconds > staleAfterSeconds)
  return {
    active,
    stale,
    status: stale ? 'stale' : active ? 'active' : 'closed',
    ageSeconds,
    maxRuntimeSeconds,
    staleAfterSeconds,
    reason: !active
      ? 'Run is closed.'
      : missingStartedAt
        ? 'Active run has no startedAt timestamp.'
        : stale
          ? `Active run exceeded ${staleAfterSeconds} seconds.`
          : 'Active run is within its liveness window.',
  }
}

export function buildServiceRestartOnPushStatus({ runtimeSupervisor = {}, currentRepoHead = null } = {}) {
  const services = [
    normalizeServiceRuntime(runtimeSupervisor.servedCode || runtimeSupervisor.dashboard || {}, 'dashboard'),
    normalizeServiceRuntime(runtimeSupervisor.workerCode || {}, 'foundation-worker'),
  ]

  return {
    status: services.every(service => service.autoRestartOnPush) ? 'automatic' : 'manual_restart_required',
    plainEnglish: services.every(service => service.autoRestartOnPush)
      ? 'Dashboard and worker advertise automatic restart-on-push metadata.'
      : 'Restart commands are visible, but no push hook or LaunchAgent WatchPaths proof is recorded; treat restart-on-push as manual until proven otherwise.',
    services: services.map(service => ({
      ...service,
      staleAgainstHead: Boolean(currentRepoHead && service.runningCommit && service.runningCommit !== currentRepoHead),
      restartOnPushStatus: service.autoRestartOnPush ? 'automatic' : 'manual_restart_required',
    })),
  }
}

export function buildStopDecision({ run = {}, servedCode = {}, currentRepoHead = null, signal = 'SIGTERM' } = {}) {
  const reasons = []
  const metadata = run.metadata || {}
  const childPid = numberOrNull(metadata.childPid)
  const processOwner = String(metadata.processOwner || '').trim()
  const startedByRunId = String(metadata.processStartedByRunId || '').trim()
  const normalizedSignal = String(signal || 'SIGTERM').trim().toUpperCase()

  if (!ACTIVE_RUN_STATUSES.has(String(run.status || '').trim())) {
    reasons.push('Run is not active.')
  }
  if (!childPid || childPid <= 1) {
    reasons.push('Run does not expose a valid child PID.')
  }
  if (processOwner !== 'foundation-job-runner') {
    reasons.push('Run process owner is not foundation-job-runner.')
  }
  if (startedByRunId && startedByRunId !== run.runId) {
    reasons.push('Run PID metadata does not match this run id.')
  }
  if (servedCode?.status && servedCode.status !== 'live') {
    reasons.push('Served-code trust is not live.')
  }
  if (servedCode?.runningCommit && currentRepoHead && servedCode.runningCommit !== currentRepoHead) {
    reasons.push('Served code does not match repo HEAD.')
  }

  return {
    ok: reasons.length === 0,
    action: 'stop_foundation_job_run',
    runId: run.runId || null,
    jobKey: run.jobKey || null,
    childPid,
    signal: normalizedSignal,
    reasons,
    failClosed: reasons.length > 0,
  }
}

export function buildDecommissionDecision({ job = {}, confirmation = '' } = {}) {
  const jobKey = String(job.key || job.jobKey || '').trim()
  const expected = `DECOMMISSION ${jobKey}`
  const activeRun = job.latestRun && ACTIVE_RUN_STATUSES.has(String(job.latestRun.status || '').trim())
  const reasons = []

  if (!jobKey) reasons.push('Job key is required.')
  if (String(confirmation || '').trim() !== expected) {
    reasons.push(`Confirmation must be exactly: ${expected}`)
  }
  if (activeRun) {
    reasons.push('Job has an active run; stop the run before decommissioning the job.')
  }

  return {
    ok: reasons.length === 0,
    action: 'decommission_foundation_job',
    jobKey,
    expectedConfirmation: expected,
    reasons,
    control: reasons.length
      ? null
      : {
          runtimeMode: 'decommissioned',
          enabled: false,
          scheduleEveryMinutes: null,
          pauseReason: `${SYSTEM_010_CARD_ID}: decommissioned by runtime process-control guard.`,
        },
    failClosed: reasons.length > 0,
  }
}

function buildCostRisk({ activeFoundationRuns, jobsByKey, activeLlmCalls, sourceCrawlRuns }) {
  const activeJobBudgets = activeFoundationRuns.map(run => {
    const job = jobsByKey.get(run.jobKey) || {}
    return {
      runId: run.runId,
      jobKey: run.jobKey,
      budget: job.budget || run.metadata?.budget || 'unknown',
    }
  })
  const estimatedOpenCostUsd = activeLlmCalls.reduce((sum, call) => (
    sum + (Number.isFinite(Number(call.estimatedCostUsd)) ? Number(call.estimatedCostUsd) : 0)
  ), 0)
  const connectorWork = activeJobBudgets.filter(item => item.budget === 'connector').length + sourceCrawlRuns.length
  const llmWork = activeJobBudgets.filter(item => item.budget === 'llm').length + activeLlmCalls.length
  const unboundedWork = activeJobBudgets.filter(item => item.budget === 'unknown').length

  return {
    status: connectorWork || llmWork || unboundedWork || estimatedOpenCostUsd > 0 ? 'watch' : 'quiet',
    estimatedOpenCostUsd: Number(estimatedOpenCostUsd.toFixed(6)),
    activeConnectorWork: connectorWork,
    activeLlmWork: llmWork,
    activeUnknownBudgetWork: unboundedWork,
    activeJobBudgets,
    plainEnglish: 'Open cost/process risk is derived from active job budgets, source-crawl leases, and planned/started LLM calls.',
  }
}

export function buildRuntimeProcessControlSnapshot({
  foundationJobs = {},
  llmRuntime = {},
  extractionControl = {},
  runtimeSupervisor = {},
  currentRepoHead = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const jobs = asArray(foundationJobs.jobs)
  const jobsByKey = new Map(jobs.map(job => [job.key, job]))
  const latestRuns = asArray(foundationJobs.latestRuns)
  const activeFoundationRuns = latestRuns
    .filter(run => ACTIVE_RUN_STATUSES.has(String(run.status || '').trim()))
    .map(run => {
      const job = jobsByKey.get(run.jobKey) || {}
      return {
        ...run,
        liveness: buildFoundationRunLiveness(run, job),
        stopDecision: buildStopDecision({
          run,
          servedCode: runtimeSupervisor.servedCode || {},
          currentRepoHead,
        }),
      }
    })
  const sourceCrawlRuns = asArray(extractionControl.recentRuns)
    .filter(run => run.status === 'running')
    .map(run => ({
      ...run,
      liveness: run.staleState || {
        isStale: false,
        reason: null,
      },
    }))
  const leasedSourceItems = asArray(extractionControl.recentItems)
    .filter(item => item.leaseExpiresAt && !CLOSED_SOURCE_ITEM_STATUSES.has(String(item.status || '').trim()))
  const activeLlmCalls = asArray(llmRuntime.recentCalls)
    .filter(call => ACTIVE_LLM_CALL_STATUSES.has(String(call.status || '').trim()))
  const staleFoundationRuns = activeFoundationRuns.filter(run => run.liveness?.stale)
  const staleSourceRuns = sourceCrawlRuns.filter(run => run.liveness?.isStale)
  const restartOnPush = buildServiceRestartOnPushStatus({ runtimeSupervisor, currentRepoHead })
  const decommissionedJobs = jobs.filter(job => job.runtimeMode === 'decommissioned')
  const pausedJobs = jobs.filter(job => job.runtimeMode === 'paused' || job.enabled === false)
  const costRisk = buildCostRisk({ activeFoundationRuns, jobsByKey, activeLlmCalls, sourceCrawlRuns })
  const staleRiskCount = staleFoundationRuns.length + staleSourceRuns.length

  return {
    generatedAt,
    status: staleRiskCount ? 'risk' : 'healthy',
    cardId: SYSTEM_010_CARD_ID,
    closeoutKey: SYSTEM_010_CLOSEOUT_KEY,
    summary: {
      activeFoundationJobRuns: activeFoundationRuns.length,
      activeSourceCrawlRuns: sourceCrawlRuns.length,
      leasedSourceCrawlItems: leasedSourceItems.length,
      activeLlmCalls: activeLlmCalls.length,
      staleRiskCount,
      stopEligibleRuns: activeFoundationRuns.filter(run => run.stopDecision?.ok).length,
      pausedJobs: pausedJobs.length,
      decommissionedJobs: decommissionedJobs.length,
      restartOnPushStatus: restartOnPush.status,
      estimatedOpenCostUsd: costRisk.estimatedOpenCostUsd,
    },
    activeProcessView: {
      foundationJobRuns: activeFoundationRuns,
      sourceCrawlRuns,
      leasedSourceItems,
      llmCalls: activeLlmCalls,
    },
    controls: {
      stopEligibleRuns: activeFoundationRuns.filter(run => run.stopDecision?.ok),
      stopBlockedRuns: activeFoundationRuns.filter(run => !run.stopDecision?.ok),
      pausedJobs,
      decommissionedJobs,
      decommissionableJobs: jobs
        .map(job => ({
          jobKey: job.key,
          title: job.title,
          decision: buildDecommissionDecision({
            job,
            confirmation: `DECOMMISSION ${job.key}`,
          }),
        }))
        .filter(item => item.decision.ok),
    },
    liveness: {
      staleFoundationRuns,
      staleSourceRuns,
      staleLlmCalls: [],
      failClosedBehavior: 'Stale active records are surfaced as risk; worker reapers mark stale job/source/LLM records failed before scheduling new work.',
    },
    restartOnPush,
    costRisk,
    failClosed: {
      missingPidCannotStop: true,
      unownedPidCannotStop: true,
      decommissionedJobsCannotRun: true,
      staleServedCodeBlocksStop: true,
    },
  }
}

export async function terminateProcessTree(pid, { signal = 'SIGTERM' } = {}) {
  const normalizedPid = numberOrNull(pid)
  const normalizedSignal = String(signal || 'SIGTERM').trim().toUpperCase()
  if (!normalizedPid || normalizedPid <= 1) {
    throw new Error('A valid child PID is required to stop a process tree.')
  }

  if (process.platform === 'win32') {
    await execFileAsync('taskkill', ['/PID', String(normalizedPid), '/T', '/F'])
    return {
      ok: true,
      pid: normalizedPid,
      signal: normalizedSignal,
      method: 'taskkill',
    }
  }

  try {
    process.kill(-normalizedPid, normalizedSignal)
    return {
      ok: true,
      pid: normalizedPid,
      signal: normalizedSignal,
      method: 'process_group',
    }
  } catch (groupError) {
    if (groupError?.code === 'ESRCH') {
      process.kill(normalizedPid, normalizedSignal)
      return {
        ok: true,
        pid: normalizedPid,
        signal: normalizedSignal,
        method: 'single_process',
      }
    }
    try {
      process.kill(normalizedPid, normalizedSignal)
      return {
        ok: true,
        pid: normalizedPid,
        signal: normalizedSignal,
        method: 'single_process',
      }
    } catch {
      throw groupError
    }
  }
}
