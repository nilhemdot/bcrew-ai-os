export const RUNTIME_WORKER_CARD_ID = 'RUNTIME-WORKER-001'
export const RUNTIME_WORKER_CLOSEOUT_KEY = 'runtime-worker-reliability-v1'
export const RUNTIME_WORKER_PLAN_PATH = 'docs/process/runtime-worker-001-plan.md'
export const RUNTIME_WORKER_APPROVAL_PATH = 'docs/process/approvals/RUNTIME-WORKER-001.json'
export const RUNTIME_WORKER_SCRIPT_PATH = 'scripts/process-runtime-worker-check.mjs'

const ACTIVE_RUN_STATUSES = new Set(['queued', 'running'])
const CLOSED_RUN_STATUSES = new Set(['succeeded', 'failed', 'cancelled'])

function normalizeFlagKey(key = '') {
  return String(key || '').trim().replace(/-([a-z0-9])/g, (_match, char) => char.toUpperCase())
}

export function parseFoundationWorkerArgs(argv = []) {
  const result = {}
  for (const arg of Array.isArray(argv) ? argv : []) {
    if (!String(arg || '').startsWith('--')) continue
    const raw = String(arg).slice(2)
    const separatorIndex = raw.indexOf('=')
    const rawKey = separatorIndex >= 0 ? raw.slice(0, separatorIndex) : raw
    const value = separatorIndex >= 0 ? raw.slice(separatorIndex + 1) : true
    const normalizedKey = normalizeFlagKey(rawKey)
    if (!normalizedKey) continue
    result[normalizedKey] = value
  }
  return result
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function minutesAgo(date, now) {
  if (!date) return null
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000))
}

function summarizeRun(run = {}) {
  if (!run || typeof run !== 'object') return null
  return {
    runId: run.runId || null,
    status: run.status || null,
    startedAt: run.startedAt || null,
    finishedAt: run.finishedAt || null,
    createdAt: run.createdAt || null,
    durationMs: run.durationMs ?? null,
    exitCode: run.exitCode ?? null,
    errorMessage: run.errorMessage || null,
  }
}

function summarizeJob(job = {}, now) {
  const latestRun = job.latestRun || null
  const maxRuntimeSeconds = Number(job.maxRuntimeSeconds) > 0 ? Number(job.maxRuntimeSeconds) : 180
  const activeStartedAt = parseDate(latestRun?.startedAt || latestRun?.createdAt)
  const activeAgeMinutes = ACTIVE_RUN_STATUSES.has(String(latestRun?.status || '')) ? minutesAgo(activeStartedAt, now) : null
  const staleActive = activeAgeMinutes != null && activeAgeMinutes * 60 > maxRuntimeSeconds + 60
  const blocked = job.enabled !== false &&
    (job.scheduleStatus === 'blocked' || job.runtimeMode === 'blocked' || job.scheduleMutationGuard?.ok === false)
  const failedLatest = latestRun?.status === 'failed'
  const scheduled = job.runtimeMode === 'scheduled'
  const retryCandidate = failedLatest && scheduled && !blocked && job.due === true
  const waitingForRetry = failedLatest && scheduled && !blocked && job.due !== true

  return {
    jobKey: job.key || job.jobKey || null,
    title: job.title || job.key || 'Foundation job',
    status: job.status || null,
    runtimeMode: job.runtimeMode || null,
    scheduleStatus: job.scheduleStatus || null,
    scheduleDetail: job.scheduleDetail || job.statusDetail || null,
    enabled: job.enabled !== false,
    due: job.due === true,
    nextRunAt: job.nextRunAt || null,
    maxRuntimeSeconds,
    latestRun: summarizeRun(latestRun),
    activeAgeMinutes,
    staleActive,
    blocked,
    failedLatest,
    retryCandidate,
    waitingForRetry,
  }
}

function compactJobs(jobs = [], limit = 8) {
  return asArray(jobs).slice(0, limit).map(job => ({
    jobKey: job.jobKey,
    title: job.title,
    runtimeMode: job.runtimeMode,
    scheduleStatus: job.scheduleStatus,
    due: job.due,
    nextRunAt: job.nextRunAt,
    latestRun: job.latestRun,
    detail: job.scheduleDetail,
    activeAgeMinutes: job.activeAgeMinutes,
  }))
}

export function buildFoundationWorkerReliabilitySnapshot({
  jobs = [],
  latestRuns = [],
  generatedAt = new Date().toISOString(),
  now = new Date(generatedAt),
} = {}) {
  const reliableNow = Number.isNaN(now.getTime()) ? new Date() : now
  const latestByJob = new Map(asArray(latestRuns).map(run => [run.jobKey, run]))
  const jobSummaries = asArray(jobs).map(job => summarizeJob({
    ...job,
    latestRun: job.latestRun || latestByJob.get(job.key || job.jobKey) || null,
  }, reliableNow))

  const scheduledJobs = jobSummaries.filter(job => job.enabled && job.runtimeMode === 'scheduled')
  const dueJobs = scheduledJobs.filter(job => job.due)
  const blockedScheduledJobs = scheduledJobs.filter(job => job.blocked)
  const failedLatestRuns = jobSummaries.filter(job => job.failedLatest)
  const retryCandidateJobs = jobSummaries.filter(job => job.retryCandidate)
  const waitingRetryJobs = jobSummaries.filter(job => job.waitingForRetry)
  const staleActiveRuns = jobSummaries.filter(job => job.staleActive)
  const activeRuns = jobSummaries.filter(job => ACTIVE_RUN_STATUSES.has(String(job.latestRun?.status || '')))

  const status = staleActiveRuns.length || blockedScheduledJobs.length || retryCandidateJobs.length
    ? 'risk'
    : failedLatestRuns.length || dueJobs.length || waitingRetryJobs.length
      ? 'pending'
      : 'healthy'

  const plainEnglish = status === 'risk'
    ? `${staleActiveRuns.length} stale active, ${blockedScheduledJobs.length} blocked scheduled, ${retryCandidateJobs.length} failed due job(s) need worker attention.`
    : status === 'pending'
      ? `${dueJobs.length} scheduled job(s) due and ${failedLatestRuns.length} failed latest run(s) are visible for retry review.`
      : 'Worker lane is boring: no stale active runs, no blocked scheduled jobs, and no failed due jobs.'

  return {
    generatedAt,
    cardId: RUNTIME_WORKER_CARD_ID,
    closeoutKey: RUNTIME_WORKER_CLOSEOUT_KEY,
    status,
    plainEnglish,
    summary: {
      totalJobs: jobSummaries.length,
      scheduledJobs: scheduledJobs.length,
      dueJobs: dueJobs.length,
      activeRuns: activeRuns.length,
      failedLatestRuns: failedLatestRuns.length,
      retryCandidateJobs: retryCandidateJobs.length,
      waitingRetryJobs: waitingRetryJobs.length,
      blockedScheduledJobs: blockedScheduledJobs.length,
      staleActiveRuns: staleActiveRuns.length,
    },
    dueJobs: compactJobs(dueJobs),
    retryCandidateJobs: compactJobs(retryCandidateJobs),
    waitingRetryJobs: compactJobs(waitingRetryJobs),
    failedLatestRuns: compactJobs(failedLatestRuns),
    blockedScheduledJobs: compactJobs(blockedScheduledJobs),
    staleActiveRuns: compactJobs(staleActiveRuns),
    failClosed: {
      dryRunAliasRequired: true,
      blockedScheduledJobsSeparated: true,
      failedDueJobsSurfaceRetryCandidate: true,
      staleActiveRunsSurfaceRisk: true,
      noAutoRetryMutation: true,
    },
  }
}

export function validateFoundationWorkerReliabilitySnapshot(snapshot = {}) {
  const checks = []
  const add = (condition, check, detail = '') => checks.push({ ok: Boolean(condition), check, detail })
  const summary = snapshot.summary || {}
  add([RUNTIME_WORKER_CARD_ID].includes(snapshot.cardId), 'worker reliability card id is present', snapshot.cardId || 'missing')
  add(snapshot.closeoutKey === RUNTIME_WORKER_CLOSEOUT_KEY, 'worker reliability closeout key is present', snapshot.closeoutKey || 'missing')
  add(['healthy', 'pending', 'risk'].includes(snapshot.status), 'worker reliability status is recognized', snapshot.status || 'missing')
  add(typeof snapshot.plainEnglish === 'string' && snapshot.plainEnglish.length > 20, 'worker reliability plain-English operator summary exists')
  add(Number.isFinite(Number(summary.totalJobs)), 'worker reliability total job count is numeric', String(summary.totalJobs ?? 'missing'))
  add(Number.isFinite(Number(summary.scheduledJobs)), 'worker reliability scheduled job count is numeric', String(summary.scheduledJobs ?? 'missing'))
  add(snapshot.failClosed?.dryRunAliasRequired === true, 'dry-run alias safety is declared fail-closed')
  add(snapshot.failClosed?.blockedScheduledJobsSeparated === true, 'blocked scheduled jobs are separated from no-due state')
  add(snapshot.failClosed?.failedDueJobsSurfaceRetryCandidate === true, 'failed due jobs surface retry candidate status')
  add(snapshot.failClosed?.staleActiveRunsSurfaceRisk === true, 'stale active runs surface risk')
  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}

export function buildFoundationWorkerReliabilityDogfoodProof() {
  const kebabDryRun = parseFoundationWorkerArgs(['--once', '--dry-run', '--max-jobs=1'])
  const camelDryRun = parseFoundationWorkerArgs(['--once=true', '--dryRun=true', '--maxJobs=1'])
  const now = new Date('2026-05-16T14:00:00.000Z')
  const snapshot = buildFoundationWorkerReliabilitySnapshot({
    generatedAt: now.toISOString(),
    now,
    jobs: [
      {
        key: 'healthy-scheduled',
        title: 'Healthy Scheduled Job',
        enabled: true,
        runtimeMode: 'scheduled',
        scheduleStatus: 'scheduled',
        due: false,
        maxRuntimeSeconds: 180,
        latestRun: { runId: 'healthy-1', status: 'succeeded', finishedAt: '2026-05-16T13:50:00.000Z' },
      },
      {
        key: 'failed-due',
        title: 'Failed Due Job',
        enabled: true,
        runtimeMode: 'scheduled',
        scheduleStatus: 'scheduled',
        due: true,
        maxRuntimeSeconds: 180,
        latestRun: { runId: 'failed-1', status: 'failed', finishedAt: '2026-05-16T12:00:00.000Z', errorMessage: 'Synthetic failure.' },
      },
      {
        key: 'blocked-mutating-check',
        title: 'Blocked Scheduled Job',
        enabled: true,
        runtimeMode: 'scheduled',
        scheduleStatus: 'blocked',
        scheduleMutationGuard: { ok: false, reason: 'Synthetic mutation posture block.' },
        due: false,
        latestRun: null,
      },
      {
        key: 'stale-running',
        title: 'Stale Running Job',
        enabled: true,
        runtimeMode: 'scheduled',
        scheduleStatus: 'scheduled',
        due: false,
        maxRuntimeSeconds: 60,
        latestRun: { runId: 'running-1', status: 'running', startedAt: '2026-05-16T13:50:00.000Z' },
      },
    ],
  })
  const validation = validateFoundationWorkerReliabilitySnapshot(snapshot)
  const ok = kebabDryRun.dryRun === true &&
    camelDryRun.dryRun === 'true' &&
    kebabDryRun.maxJobs === '1' &&
    snapshot.status === 'risk' &&
    snapshot.summary.retryCandidateJobs === 1 &&
    snapshot.summary.blockedScheduledJobs === 1 &&
    snapshot.summary.staleActiveRuns === 1 &&
    validation.ok === true

  return {
    ok,
    mode: 'runtime-worker-reliability-dogfood',
    dryRunAliasAccepted: kebabDryRun.dryRun === true,
    camelDryRunAccepted: camelDryRun.dryRun === 'true',
    retryCandidateSurfaced: snapshot.summary.retryCandidateJobs === 1,
    blockedScheduledSurfaced: snapshot.summary.blockedScheduledJobs === 1,
    staleActiveSurfaced: snapshot.summary.staleActiveRuns === 1,
    snapshotStatus: snapshot.status,
    validation,
    snapshot,
  }
}
