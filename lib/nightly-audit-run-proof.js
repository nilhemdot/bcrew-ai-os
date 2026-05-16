import {
  getFoundationJobRuntime,
} from './foundation-jobs.js'
import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
} from './nightly-deep-audit-constants.js'

export const NIGHTLY_AUDIT_RUN_PROOF_CARD_ID = 'NIGHTLY-AUDIT-RUN-PROOF-001'
export const NIGHTLY_AUDIT_RUN_PROOF_CLOSEOUT_KEY = 'nightly-audit-run-proof-v1'
export const NIGHTLY_AUDIT_RUN_PROOF_SCRIPT_PATH = 'scripts/process-nightly-audit-run-proof-check.mjs'
export const NIGHTLY_AUDIT_RUN_PROOF_PLAN_PATH = 'docs/process/nightly-audit-run-proof-001-plan.md'
export const NIGHTLY_AUDIT_RUN_PROOF_APPROVAL_PATH = 'docs/process/approvals/NIGHTLY-AUDIT-RUN-PROOF-001.json'
export const NIGHTLY_AUDIT_RUN_PROOF_GRACE_MINUTES = 120

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function iso(date) {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + (Number(minutes) * 60_000))
}

function latestRunTime(run = {}) {
  return toDate(run.finishedAt || run.startedAt || run.createdAt)
}

function normalizeLatestRun(job = {}, explicitLatestRun = null) {
  return explicitLatestRun || job.latestRun || null
}

export function buildNightlyAuditRunFreshnessStatus({
  job = null,
  latestRun = null,
  now = new Date(),
  graceMinutes = NIGHTLY_AUDIT_RUN_PROOF_GRACE_MINUTES,
} = {}) {
  const currentTime = toDate(now) || new Date()
  const normalizedJob = job || {
    key: NIGHTLY_DEEP_AUDIT_JOB_KEY,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    scheduleLocalTime: NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
    scheduleTimezone: NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
  }
  const run = normalizeLatestRun(normalizedJob, latestRun)
  const noLatestRuntime = getFoundationJobRuntime(normalizedJob, null, currentTime)
  const scheduledRunAt = toDate(noLatestRuntime.nextRunAt)
  const deadlineAt = scheduledRunAt ? addMinutes(scheduledRunAt, graceMinutes) : null
  const runTime = latestRunTime(run || {})
  const beforeDeadline = deadlineAt ? currentTime.getTime() < deadlineAt.getTime() : false
  const latestSucceeded = run?.status === 'succeeded'
  const latestAfterSchedule = Boolean(scheduledRunAt && runTime && runTime.getTime() >= scheduledRunAt.getTime())

  if (!scheduledRunAt || noLatestRuntime.scheduleStatus === 'blocked') {
    return {
      ok: false,
      status: 'risk',
      reason: noLatestRuntime.scheduleDetail || 'Nightly audit schedule could not be evaluated.',
      jobKey: normalizedJob.key || NIGHTLY_DEEP_AUDIT_JOB_KEY,
      scheduleLocalTime: normalizedJob.scheduleLocalTime || NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
      scheduleTimezone: normalizedJob.scheduleTimezone || NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
      scheduledRunAt: iso(scheduledRunAt),
      deadlineAt: iso(deadlineAt),
      now: iso(currentTime),
      latestRun: run || null,
    }
  }

  if (beforeDeadline) {
    return {
      ok: true,
      status: 'pending',
      reason: `Nightly audit window is still open until ${deadlineAt.toISOString()}.`,
      jobKey: normalizedJob.key || NIGHTLY_DEEP_AUDIT_JOB_KEY,
      scheduleLocalTime: normalizedJob.scheduleLocalTime || NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
      scheduleTimezone: normalizedJob.scheduleTimezone || NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
      scheduledRunAt: scheduledRunAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      now: currentTime.toISOString(),
      latestRun: run || null,
    }
  }

  if (!run) {
    return {
      ok: false,
      status: 'risk',
      reason: 'Nightly audit is past its run window and has no recorded job run.',
      jobKey: normalizedJob.key || NIGHTLY_DEEP_AUDIT_JOB_KEY,
      scheduleLocalTime: normalizedJob.scheduleLocalTime || NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
      scheduleTimezone: normalizedJob.scheduleTimezone || NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
      scheduledRunAt: scheduledRunAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      now: currentTime.toISOString(),
      latestRun: null,
    }
  }

  if (!latestSucceeded) {
    return {
      ok: false,
      status: 'risk',
      reason: `Nightly audit latest run is ${run.status || 'unknown'}, not succeeded.`,
      jobKey: normalizedJob.key || NIGHTLY_DEEP_AUDIT_JOB_KEY,
      scheduleLocalTime: normalizedJob.scheduleLocalTime || NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
      scheduleTimezone: normalizedJob.scheduleTimezone || NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
      scheduledRunAt: scheduledRunAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      now: currentTime.toISOString(),
      latestRun: run,
    }
  }

  if (!latestAfterSchedule) {
    return {
      ok: false,
      status: 'stale',
      reason: `Nightly audit latest success is before today's scheduled run ${scheduledRunAt.toISOString()}.`,
      jobKey: normalizedJob.key || NIGHTLY_DEEP_AUDIT_JOB_KEY,
      scheduleLocalTime: normalizedJob.scheduleLocalTime || NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
      scheduleTimezone: normalizedJob.scheduleTimezone || NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
      scheduledRunAt: scheduledRunAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      now: currentTime.toISOString(),
      latestRun: run,
    }
  }

  return {
    ok: true,
    status: 'healthy',
    reason: `Nightly audit latest success covers today's scheduled run ${scheduledRunAt.toISOString()}.`,
    jobKey: normalizedJob.key || NIGHTLY_DEEP_AUDIT_JOB_KEY,
    scheduleLocalTime: normalizedJob.scheduleLocalTime || NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
    scheduleTimezone: normalizedJob.scheduleTimezone || NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
    scheduledRunAt: scheduledRunAt.toISOString(),
    deadlineAt: deadlineAt.toISOString(),
    now: currentTime.toISOString(),
    latestRun: run,
  }
}

export function buildNightlyAuditRunProofDogfood() {
  const job = {
    key: NIGHTLY_DEEP_AUDIT_JOB_KEY,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    scheduleLocalTime: NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
    scheduleTimezone: NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
    mutationPosture: 'report_only',
    enabled: true,
  }
  const beforeWindow = buildNightlyAuditRunFreshnessStatus({
    job,
    latestRun: null,
    now: new Date('2026-05-16T06:30:00.000Z'),
  })
  const missingAfterDeadline = buildNightlyAuditRunFreshnessStatus({
    job,
    latestRun: null,
    now: new Date('2026-05-16T10:00:00.000Z'),
  })
  const failedAfterDeadline = buildNightlyAuditRunFreshnessStatus({
    job,
    latestRun: {
      runId: 'job-nightly-deep-audit-failed',
      jobKey: NIGHTLY_DEEP_AUDIT_JOB_KEY,
      status: 'failed',
      startedAt: '2026-05-16T07:00:01.000Z',
      finishedAt: '2026-05-16T07:01:00.000Z',
    },
    now: new Date('2026-05-16T10:00:00.000Z'),
  })
  const staleSuccess = buildNightlyAuditRunFreshnessStatus({
    job,
    latestRun: {
      runId: 'job-nightly-deep-audit-yesterday',
      jobKey: NIGHTLY_DEEP_AUDIT_JOB_KEY,
      status: 'succeeded',
      startedAt: '2026-05-15T07:00:01.000Z',
      finishedAt: '2026-05-15T07:01:00.000Z',
    },
    now: new Date('2026-05-16T10:00:00.000Z'),
  })
  const freshSuccess = buildNightlyAuditRunFreshnessStatus({
    job,
    latestRun: {
      runId: 'job-nightly-deep-audit-today',
      jobKey: NIGHTLY_DEEP_AUDIT_JOB_KEY,
      status: 'succeeded',
      startedAt: '2026-05-16T07:00:01.000Z',
      finishedAt: '2026-05-16T07:02:00.000Z',
    },
    now: new Date('2026-05-16T10:00:00.000Z'),
  })
  const checks = [
    {
      ok: beforeWindow.ok === true && beforeWindow.status === 'pending',
      check: 'missing current-day run before audit window deadline is pending, not failed',
      detail: `${beforeWindow.status}/${beforeWindow.deadlineAt}`,
    },
    {
      ok: missingAfterDeadline.ok === false && missingAfterDeadline.status === 'risk',
      check: 'missing run after audit window deadline fails',
      detail: `${missingAfterDeadline.status}/${missingAfterDeadline.reason}`,
    },
    {
      ok: failedAfterDeadline.ok === false && failedAfterDeadline.status === 'risk',
      check: 'failed latest run after audit window deadline fails',
      detail: `${failedAfterDeadline.status}/${failedAfterDeadline.reason}`,
    },
    {
      ok: staleSuccess.ok === false && staleSuccess.status === 'stale',
      check: 'stale prior-day success after audit window deadline fails',
      detail: `${staleSuccess.status}/${staleSuccess.reason}`,
    },
    {
      ok: freshSuccess.ok === true && freshSuccess.status === 'healthy',
      check: 'fresh current-day success after audit window deadline passes',
      detail: `${freshSuccess.status}/${freshSuccess.latestRun?.runId || 'missing'}`,
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    mode: 'nightly-audit-run-freshness-dogfood',
    cardId: NIGHTLY_AUDIT_RUN_PROOF_CARD_ID,
    closeoutKey: NIGHTLY_AUDIT_RUN_PROOF_CLOSEOUT_KEY,
    graceMinutes: NIGHTLY_AUDIT_RUN_PROOF_GRACE_MINUTES,
    checks,
    fixtures: {
      beforeWindow,
      missingAfterDeadline,
      failedAfterDeadline,
      staleSuccess,
      freshSuccess,
    },
  }
}
