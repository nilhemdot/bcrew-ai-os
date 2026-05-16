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
export const RUNTIME_SUPERVISOR_CARD_ID = 'RUNTIME-SUPERVISOR-001'
export const RUNTIME_SUPERVISOR_CLOSEOUT_KEY = 'runtime-supervisor-v1'
export const RUNTIME_SUPERVISOR_PLAN_PATH = 'docs/process/runtime-supervisor-001-plan.md'
export const RUNTIME_SUPERVISOR_APPROVAL_PATH = 'docs/process/approvals/RUNTIME-SUPERVISOR-001.json'
export const RUNTIME_SUPERVISOR_SCRIPT_PATH = 'scripts/process-runtime-supervisor-check.mjs'
export const RUNTIME_SUPERVISOR_SPRINT_ID = 'foundation-identity-visibility-2026-05-16'

export const RUNTIME_SUPERVISED_SERVICES = Object.freeze([
  {
    key: 'dashboard',
    label: 'Dashboard',
    runtimeKey: 'servedCode',
    launchAgentLabel: 'ai.bcrew.dashboard',
    restartCommand: 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.dashboard',
    logPaths: [
      '/Users/bensoncrew/Library/Logs/bcrew-ai-os/dashboard.log',
      '/Users/bensoncrew/Library/Logs/bcrew-ai-os/dashboard.err.log',
    ],
    maxCapturedAgeSeconds: 86_400,
  },
  {
    key: 'foundation-worker',
    label: 'Foundation Worker',
    runtimeKey: 'workerCode',
    launchAgentLabel: 'ai.bcrew.foundation-worker',
    restartCommand: 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.foundation-worker',
    logPaths: [
      '/Users/bensoncrew/Library/Logs/bcrew-ai-os/foundation-worker.log',
      '/Users/bensoncrew/Library/Logs/bcrew-ai-os/foundation-worker.err.log',
    ],
    maxCapturedAgeSeconds: 86_400,
  },
])

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

export async function getLaunchAgentStatus(label) {
  try {
    const { stdout } = await execFileAsync('launchctl', ['list'], {
      maxBuffer: 1024 * 1024,
    })
    const line = String(stdout || '').split(/\r?\n/).find(item => item.includes(label)) || ''
    if (!line) {
      return { ok: false, pid: null, status: null, line: '', error: `LaunchAgent ${label} was not listed.` }
    }
    const [pidRaw, statusRaw] = line.trim().split(/\s+/)
    const pid = /^\d+$/.test(pidRaw) ? Number(pidRaw) : null
    return {
      ok: Boolean(pid),
      pid,
      status: statusRaw || null,
      line,
      error: pid ? '' : `LaunchAgent ${label} is listed but has no running pid.`,
    }
  } catch (error) {
    return {
      ok: false,
      pid: null,
      status: null,
      line: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
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

export function buildSupervisedServiceSnapshot(serviceDefinition = {}, {
  launchAgent = {},
  runtime = {},
  currentRepoHead = null,
  now = new Date(),
} = {}) {
  const runtimeStatus = normalizeServiceRuntime(runtime, serviceDefinition.key)
  const launchPid = numberOrNull(launchAgent.pid)
  const runtimePid = numberOrNull(runtimeStatus.processId)
  const capturedAgeSeconds = ageSecondsSince(runtimeStatus.capturedAt || runtimeStatus.startedAt, now)
  const maxCapturedAgeSeconds = Math.max(60, Number(serviceDefinition.maxCapturedAgeSeconds || 86_400))
  const launchAgentOk = launchAgent.ok === true && Boolean(launchPid)
  const runtimeLive = runtimeStatus.status === 'live'
  const pidMatches = launchAgentOk && runtimePid && launchPid === runtimePid
  const codeMatchesHead = Boolean(currentRepoHead && runtimeStatus.runningCommit && runtimeStatus.runningCommit === currentRepoHead)
  const captureFresh = capturedAgeSeconds != null && capturedAgeSeconds <= maxCapturedAgeSeconds
  const reasons = []

  if (!launchAgentOk) reasons.push(launchAgent.error || `LaunchAgent ${serviceDefinition.launchAgentLabel} is not running.`)
  if (!runtimeLive) reasons.push('Runtime metadata is not live.')
  if (!pidMatches) reasons.push(`LaunchAgent pid ${launchPid || 'missing'} does not match recorded pid ${runtimePid || 'missing'}.`)
  if (!codeMatchesHead) reasons.push('Recorded running commit does not match repo HEAD.')
  if (!captureFresh) reasons.push(`Runtime metadata is older than ${maxCapturedAgeSeconds} seconds or missing.`)

  return {
    key: serviceDefinition.key,
    label: serviceDefinition.label,
    status: reasons.length ? 'risk' : 'healthy',
    launchAgent: {
      label: serviceDefinition.launchAgentLabel,
      ok: launchAgentOk,
      pid: launchPid,
      status: launchAgent.status || null,
      error: launchAgent.error || '',
    },
    runtime: {
      status: runtimeStatus.status,
      processId: runtimePid,
      runningCommit: runtimeStatus.runningCommit,
      runningShortCommit: runtimeStatus.runningShortCommit,
      capturedAt: runtimeStatus.capturedAt,
      capturedAgeSeconds,
      startedAt: runtimeStatus.startedAt,
      codeMatchesHead,
      pidMatches,
      captureFresh,
    },
    restartCommand: runtimeStatus.restartCommand || serviceDefinition.restartCommand,
    logPaths: serviceDefinition.logPaths || [],
    restartOnPushStatus: runtimeStatus.autoRestartOnPush ? 'automatic' : 'manual_restart_required',
    reasons,
    plainEnglish: reasons.length
      ? `${serviceDefinition.label} supervision is not healthy: ${reasons.join(' ')}`
      : `${serviceDefinition.label} is running current code under ${serviceDefinition.launchAgentLabel} with pid ${launchPid}.`,
  }
}

export function buildRuntimeServiceSupervisorSnapshot({
  runtimeSupervisor = {},
  launchAgents = {},
  currentRepoHead = null,
  generatedAt = new Date().toISOString(),
  now = new Date(generatedAt),
} = {}) {
  const services = RUNTIME_SUPERVISED_SERVICES.map(service => buildSupervisedServiceSnapshot(service, {
    launchAgent: launchAgents[service.key] || launchAgents[service.launchAgentLabel] || {},
    runtime: runtimeSupervisor[service.runtimeKey] || {},
    currentRepoHead,
    now,
  }))
  const riskServices = services.filter(service => service.status !== 'healthy')
  return {
    cardId: RUNTIME_SUPERVISOR_CARD_ID,
    closeoutKey: RUNTIME_SUPERVISOR_CLOSEOUT_KEY,
    generatedAt,
    status: riskServices.length ? 'risk' : 'healthy',
    summary: {
      serviceCount: services.length,
      healthyServices: services.length - riskServices.length,
      riskServices: riskServices.length,
      manualRestartRequired: services.filter(service => service.restartOnPushStatus !== 'automatic').length,
    },
    services,
    failClosed: {
      missingLaunchAgentIsRisk: true,
      pidMismatchIsRisk: true,
      staleCodeIsRisk: true,
      staleRuntimeMetadataIsRisk: true,
      autoRestartRequiresProof: true,
    },
    plainEnglish: riskServices.length
      ? `${riskServices.length} supervised service(s) need runtime attention.`
      : 'Dashboard and Foundation worker are supervised, current, and visible.',
  }
}

export function validateRuntimeServiceSupervisorSnapshot(snapshot = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const services = Array.isArray(snapshot.services) ? snapshot.services : []
  add(snapshot.status === 'healthy', 'snapshot status is healthy', snapshot.status || 'missing')
  add(services.length === RUNTIME_SUPERVISED_SERVICES.length, 'all supervised services are present', `${services.length}/${RUNTIME_SUPERVISED_SERVICES.length}`)
  for (const definition of RUNTIME_SUPERVISED_SERVICES) {
    const service = services.find(item => item.key === definition.key)
    add(service && service.launchAgent?.label === definition.launchAgentLabel, `${definition.key} LaunchAgent label is visible`, service?.launchAgent?.label || 'missing')
    add(service && service.launchAgent?.ok === true && Number.isFinite(Number(service.launchAgent?.pid)), `${definition.key} LaunchAgent is running`, String(service?.launchAgent?.pid || 'missing'))
    add(service && service.runtime?.pidMatches === true, `${definition.key} pid matches LaunchAgent`, String(service?.runtime?.pidMatches || false))
    add(service && service.runtime?.codeMatchesHead === true, `${definition.key} running commit matches HEAD`, service?.runtime?.runningShortCommit || 'missing')
    add(service && service.runtime?.captureFresh === true, `${definition.key} runtime metadata is fresh`, String(service?.runtime?.capturedAgeSeconds ?? 'missing'))
    add(service && Array.isArray(service.logPaths) && service.logPaths.length >= 2, `${definition.key} log paths are visible`, (service?.logPaths || []).join(', '))
    add(service && /launchctl kickstart/.test(service.restartCommand || ''), `${definition.key} restart command is visible`, service?.restartCommand || 'missing')
  }
  return {
    ok: checks.every(check => check.ok),
    checks,
  }
}

export function buildRuntimeSupervisorDogfoodProof() {
  const now = new Date('2026-05-16T12:00:00.000Z')
  const currentRepoHead = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const healthyLaunchAgents = {
    dashboard: { ok: true, pid: 101, status: '0' },
    'foundation-worker': { ok: true, pid: 202, status: '0' },
  }
  const healthyRuntimeSupervisor = {
    servedCode: {
      serviceKey: 'dashboard',
      status: 'live',
      processId: 101,
      runningCommit: currentRepoHead,
      runningShortCommit: currentRepoHead.slice(0, 7),
      capturedAt: now.toISOString(),
      restartCommand: 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.dashboard',
    },
    workerCode: {
      serviceKey: 'foundation-worker',
      status: 'live',
      processId: 202,
      runningCommit: currentRepoHead,
      runningShortCommit: currentRepoHead.slice(0, 7),
      capturedAt: now.toISOString(),
      restartCommand: 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.foundation-worker',
    },
  }
  const healthy = buildRuntimeServiceSupervisorSnapshot({
    runtimeSupervisor: healthyRuntimeSupervisor,
    launchAgents: healthyLaunchAgents,
    currentRepoHead,
    generatedAt: now.toISOString(),
    now,
  })
  const missingLaunchAgent = buildRuntimeServiceSupervisorSnapshot({
    runtimeSupervisor: healthyRuntimeSupervisor,
    launchAgents: { ...healthyLaunchAgents, dashboard: { ok: false, pid: null, error: 'missing' } },
    currentRepoHead,
    generatedAt: now.toISOString(),
    now,
  })
  const pidMismatch = buildRuntimeServiceSupervisorSnapshot({
    runtimeSupervisor: healthyRuntimeSupervisor,
    launchAgents: { ...healthyLaunchAgents, 'foundation-worker': { ok: true, pid: 999, status: '0' } },
    currentRepoHead,
    generatedAt: now.toISOString(),
    now,
  })
  const staleCommit = buildRuntimeServiceSupervisorSnapshot({
    runtimeSupervisor: {
      ...healthyRuntimeSupervisor,
      servedCode: { ...healthyRuntimeSupervisor.servedCode, runningCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    },
    launchAgents: healthyLaunchAgents,
    currentRepoHead,
    generatedAt: now.toISOString(),
    now,
  })
  const staleHeartbeat = buildRuntimeServiceSupervisorSnapshot({
    runtimeSupervisor: {
      ...healthyRuntimeSupervisor,
      workerCode: { ...healthyRuntimeSupervisor.workerCode, capturedAt: '2026-05-14T12:00:00.000Z' },
    },
    launchAgents: healthyLaunchAgents,
    currentRepoHead,
    generatedAt: now.toISOString(),
    now,
  })

  return {
    ok: healthy.status === 'healthy' &&
      validateRuntimeServiceSupervisorSnapshot(healthy).ok === true &&
      missingLaunchAgent.status === 'risk' &&
      pidMismatch.status === 'risk' &&
      staleCommit.status === 'risk' &&
      staleHeartbeat.status === 'risk',
    healthy,
    missingLaunchAgentRejected: missingLaunchAgent.status === 'risk',
    pidMismatchRejected: pidMismatch.status === 'risk',
    staleCommitRejected: staleCommit.status === 'risk',
    staleHeartbeatRejected: staleHeartbeat.status === 'risk',
    dogfoodInvariant: 'Runtime supervisor accepts healthy dashboard/worker LaunchAgent proof and rejects missing LaunchAgent, pid mismatch, stale commit, and stale heartbeat cases.',
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
  launchAgents = {},
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
  const serviceSupervisor = buildRuntimeServiceSupervisorSnapshot({
    runtimeSupervisor,
    launchAgents,
    currentRepoHead,
    generatedAt,
  })
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
    serviceSupervisor,
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
