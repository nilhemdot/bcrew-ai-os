import {
  getFoundationJobRuntime,
} from './foundation-jobs.js'
import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
} from './nightly-deep-audit-constants.js'
import {
  buildNightlyAuditRunFreshnessStatus,
} from './nightly-audit-run-proof.js'

export const SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID = 'SYSTEM-HEALTH-NIGHTLY-AUDIT-001'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY = 'system-health-nightly-audit-v1'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_PLAN_PATH = 'docs/process/system-health-nightly-audit-001-plan.md'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_APPROVAL_PATH = 'docs/process/approvals/SYSTEM-HEALTH-NIGHTLY-AUDIT-001.json'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_SCRIPT_PATH = 'scripts/process-system-health-nightly-audit-check.mjs'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_JOB_KEY = 'system-health-nightly-audit'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_REPORT_PREFIX = 'docs/handoffs/system-health'
export const SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID = 'SCHEDULED-JOB-STALENESS-DASHBOARD-001'
export const SCHEDULED_JOB_STALENESS_DASHBOARD_CLOSEOUT_KEY = 'scheduled-job-staleness-dashboard-v1'
export const SCHEDULED_JOB_STALENESS_DASHBOARD_PLAN_PATH = 'docs/process/scheduled-job-staleness-dashboard-001-plan.md'
export const SCHEDULED_JOB_STALENESS_DASHBOARD_APPROVAL_PATH = 'docs/process/approvals/SCHEDULED-JOB-STALENESS-DASHBOARD-001.json'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_SCHEDULE_LOCAL_TIME = '05:15'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_SCHEDULE_TIMEZONE = 'America/Toronto'
export const SCHEDULED_JOB_STALENESS_GRACE_MINUTES = 15

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isoDate(value) {
  const date = toDate(value)
  return date ? date.toISOString() : null
}

function elapsedMinutesSince(value, now = new Date()) {
  const date = toDate(value)
  const current = toDate(now) || new Date()
  if (!date) return null
  return Math.max(0, Math.round((current.getTime() - date.getTime()) / 60_000))
}

function latestRunTime(run = {}) {
  if (!run || typeof run !== 'object') return null
  return isoDate(run.finishedAt || run.startedAt || run.createdAt)
}

function jobLatestRun(job = {}) {
  return job.latestRun || null
}

function statusRank(status) {
  if (status === 'risk') return 0
  if (status === 'watch') return 1
  if (status === 'healthy') return 2
  return 3
}

function classifyScheduledJob(job = {}, now = new Date(), graceMinutes = SCHEDULED_JOB_STALENESS_GRACE_MINUTES) {
  const latestRun = jobLatestRun(job)
  const runtime = getFoundationJobRuntime(job, latestRun, now)
  const latestRunAt = latestRunTime(latestRun)
  const latestSuccessAt = latestRun?.status === 'succeeded' ? latestRunAt : null
  const nextRunAt = runtime.nextRunAt || job.nextRunAt || null
  const overdueMinutes = runtime.due && nextRunAt ? elapsedMinutesSince(nextRunAt, now) : 0
  const ageMinutes = latestSuccessAt ? elapsedMinutesSince(latestSuccessAt, now) : null
  const base = {
    key: job.key || 'missing-job-key',
    title: job.title || job.key || 'Untitled job',
    priority: job.priority || 'P2',
    lane: job.lane || 'unknown',
    runtimeMode: runtime.runtimeMode || job.runtimeMode || 'manual',
    scheduleStatus: runtime.scheduleStatus || job.scheduleStatus || 'manual',
    scheduleDetail: runtime.scheduleDetail || job.scheduleDetail || '',
    due: runtime.due === true,
    nextRunAt: isoDate(nextRunAt),
    latestRunStatus: latestRun?.status || null,
    latestRunAt,
    latestSuccessAt,
    ageMinutes,
    ageHours: ageMinutes === null ? null : Math.round((ageMinutes / 60) * 10) / 10,
    overdueMinutes,
    sourceIds: Array.isArray(job.sourceIds) ? job.sourceIds : [],
    mutationPosture: job.mutationPosture || null,
  }

  if (job.enabled === false || ['manual', 'paused', 'decommissioned'].includes(base.scheduleStatus) || ['manual', 'paused', 'decommissioned'].includes(base.runtimeMode)) {
    return {
      ...base,
      status: 'manual',
      color: 'gray',
      plainEnglish: `${base.title} is ${base.runtimeMode}; it is not expected to run unattended.`,
      nextAction: job.nextAction || 'Leave manual unless Steve approves scheduling.',
    }
  }

  if (base.scheduleStatus === 'blocked' || base.runtimeMode === 'blocked' || job.scheduleMutationGuard?.ok === false) {
    return {
      ...base,
      status: 'risk',
      color: 'red',
      plainEnglish: `${base.title} is blocked by scheduler or mutation guard.`,
      nextAction: runtime.scheduleDetail || job.scheduleMutationGuard?.reason || 'Review the scheduler guard before relying on this job.',
    }
  }

  if (latestRun && latestRun.status && latestRun.status !== 'succeeded') {
    return {
      ...base,
      status: 'risk',
      color: 'red',
      plainEnglish: `${base.title} latest run is ${latestRun.status}.`,
      nextAction: latestRun.errorMessage || 'Open the job run and fix the failure before trusting this surface.',
    }
  }

  if (runtime.due === true) {
    const risk = overdueMinutes > graceMinutes
    return {
      ...base,
      status: risk ? 'risk' : 'watch',
      color: risk ? 'red' : 'yellow',
      plainEnglish: risk
        ? `${base.title} is overdue by ${overdueMinutes} minutes.`
        : `${base.title} is due now and still inside the grace window.`,
      nextAction: risk
        ? 'Run or repair this scheduled job; do not treat it as green.'
        : 'Let the worker pick it up or run it manually if the worker is stopped.',
    }
  }

  if (!latestRun) {
    return {
      ...base,
      status: 'watch',
      color: 'yellow',
      plainEnglish: `${base.title} is scheduled but has no latest run yet.`,
      nextAction: 'Confirm first scheduled run records successfully.',
    }
  }

  return {
    ...base,
    status: 'healthy',
    color: 'green',
    plainEnglish: `${base.title} has a fresh successful run and is not due.`,
    nextAction: job.nextAction || 'No action needed.',
  }
}

export function buildScheduledJobStalenessSnapshot({
  foundationJobs = {},
  now = new Date(),
  graceMinutes = SCHEDULED_JOB_STALENESS_GRACE_MINUTES,
} = {}) {
  const jobs = Array.isArray(foundationJobs.jobs) ? foundationJobs.jobs : []
  const rows = jobs
    .map(job => classifyScheduledJob(job, now, graceMinutes))
    .sort((left, right) => {
      const rank = statusRank(left.status) - statusRank(right.status)
      if (rank !== 0) return rank
      const leftPriority = String(left.priority || '')
      const rightPriority = String(right.priority || '')
      if (leftPriority !== rightPriority) return leftPriority.localeCompare(rightPriority)
      return String(left.key).localeCompare(String(right.key))
    })
  const riskRows = rows.filter(row => row.status === 'risk')
  const watchRows = rows.filter(row => row.status === 'watch')
  const healthyRows = rows.filter(row => row.status === 'healthy')
  const manualRows = rows.filter(row => row.status === 'manual')
  return {
    generatedAt: isoDate(now),
    cardId: SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID,
    reportOnly: true,
    readOnly: true,
    status: riskRows.length ? 'risk' : watchRows.length ? 'watch' : 'healthy',
    summary: {
      jobCount: rows.length,
      riskCount: riskRows.length,
      watchCount: watchRows.length,
      healthyCount: healthyRows.length,
      manualCount: manualRows.length,
      dueCount: rows.filter(row => row.due).length,
    },
    rows,
    topFindings: [...riskRows, ...watchRows].slice(0, 12).map(row => ({
      id: `scheduled_job_${row.key}`,
      severity: row.priority || 'P2',
      status: row.status,
      title: `${row.title} is ${row.status}`,
      detail: row.plainEnglish,
      nextAction: row.nextAction,
      jobKey: row.key,
    })),
    plainEnglish: riskRows.length
      ? `${riskRows.length} scheduled/runtime jobs are red. Do not trust Foundation as fully green until they are acknowledged or repaired.`
      : watchRows.length
        ? `${watchRows.length} scheduled/runtime jobs need review soon.`
        : 'Scheduled jobs have no red or yellow staleness findings.',
  }
}

function summarizeSourceHealth(sourceContracts = [], foundationJobs = {}) {
  const sources = Array.isArray(sourceContracts) ? sourceContracts : []
  const jobRows = Array.isArray(foundationJobs.jobs) ? foundationJobs.jobs : []
  const sourcesWithJobs = new Set()
  for (const job of jobRows) {
    for (const sourceId of Array.isArray(job.sourceIds) ? job.sourceIds : []) {
      sourcesWithJobs.add(sourceId)
    }
  }
  const sourceIds = sources.map(source => source.id).filter(Boolean)
  return {
    totalSources: sources.length,
    sourcesWithScheduledJobs: sourceIds.filter(id => sourcesWithJobs.has(id)).length,
    sourcesWithoutScheduledJobs: sourceIds.filter(id => !sourcesWithJobs.has(id)).length,
    missingScheduledSourceIds: sourceIds.filter(id => !sourcesWithJobs.has(id)).slice(0, 20),
  }
}

function statusFromCounts(riskCount, watchCount) {
  if (riskCount > 0) return 'risk'
  if (watchCount > 0) return 'watch'
  return 'healthy'
}

function blockedConnectorRows(connectors = {}) {
  return (Array.isArray(connectors?.rows) ? connectors.rows : [])
    .filter(row => row.status === 'blocked')
}

function blockedConnectorDetail(connectors = {}) {
  const rows = blockedConnectorRows(connectors)
  if (!rows.length) return `${connectors?.summary?.blockedCount || 0} connector group(s) are blocked by manual/auth/source posture.`
  return rows
    .map(row => `${row.label || row.key || 'Unknown connector'}: ${row.reason || 'blocked without recorded reason'}`)
    .join('; ')
}

export function buildFoundationSystemHealthSnapshot({
  foundationJobs = {},
  foundationOperatingReliability = {},
  endpointBudgets = null,
  currentSprintStatus = null,
  sourceContracts = [],
  now = new Date(),
} = {}) {
  const scheduledJobs = buildScheduledJobStalenessSnapshot({ foundationJobs, now })
  const nightlyJob = (foundationJobs.jobs || []).find(job => job.key === NIGHTLY_DEEP_AUDIT_JOB_KEY) || null
  const nightlyAuditFreshness = buildNightlyAuditRunFreshnessStatus({
    job: nightlyJob,
    latestRun: nightlyJob?.latestRun || null,
    now,
  })
  const connectors = foundationOperatingReliability.connectorUptime || null
  const connectorBlockedRows = blockedConnectorRows(connectors)
  const runtimeActivation = foundationOperatingReliability.runtimeActivation || null
  const endpointSnapshot = endpointBudgets || foundationOperatingReliability.endpointBudgets || null
  const currentSprintFindings = currentSprintStatus?.findings || []
  const sourceHealth = summarizeSourceHealth(sourceContracts, foundationJobs)
  const riskCount = scheduledJobs.summary.riskCount +
    (nightlyAuditFreshness.ok ? 0 : 1) +
    (connectors?.summary?.downCount || 0) +
    (endpointSnapshot?.summary?.riskCount || 0) +
    currentSprintFindings.filter(finding => finding.severity === 'error' || finding.severity === 'critical').length
  const watchCount = scheduledJobs.summary.watchCount +
    (connectors?.summary?.degradedCount || 0) +
    (connectors?.summary?.blockedCount || 0) +
    (endpointSnapshot?.summary?.reviewCount || 0) +
    currentSprintFindings.filter(finding => finding.severity !== 'error' && finding.severity !== 'critical').length
  const status = statusFromCounts(riskCount, watchCount)
  const findings = [
    ...scheduledJobs.topFindings,
    ...(!nightlyAuditFreshness.ok ? [{
      id: 'nightly_audit_freshness',
      severity: 'P0',
      status: nightlyAuditFreshness.status || 'risk',
      title: 'Nightly audit is not fresh',
      detail: nightlyAuditFreshness.reason,
      nextAction: 'Run/backfill the nightly audit and verify the scheduler freshness proof.',
      jobKey: NIGHTLY_DEEP_AUDIT_JOB_KEY,
    }] : []),
    ...((connectors?.morningHealth?.findings || foundationOperatingReliability.morningHealth?.findings || []).slice(0, 8)),
    ...((connectors?.summary?.blockedCount || 0) > 0 ? [{
      id: 'connector_blocked',
      severity: 'P1',
      status: 'watch',
      title: 'Connector groups have blocked health posture',
      detail: blockedConnectorDetail(connectors),
      nextAction: 'Review the blocked connector row before treating dependent source surfaces as fully green.',
      source: 'foundation_operating_reliability',
      connectorKeys: connectorBlockedRows.map(row => row.key).filter(Boolean),
      autoFix: false,
      autoBacklogMutation: false,
    }] : []),
    ...((endpointSnapshot?.findings || []).slice(0, 8)),
  ]
  return {
    generatedAt: isoDate(now),
    cardId: SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID,
    closeoutKey: SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    writesSourceSystems: false,
    status,
    plainEnglish: status === 'risk'
      ? 'Foundation has red system-health findings. Do not treat every surface as green.'
      : status === 'watch'
        ? 'Foundation is usable but has yellow system-health findings to review.'
        : 'Foundation system health has no red or yellow rollup findings.',
    summary: {
      status,
      riskCount,
      watchCount,
      scheduledJobRiskCount: scheduledJobs.summary.riskCount,
      scheduledJobWatchCount: scheduledJobs.summary.watchCount,
      connectorDownCount: connectors?.summary?.downCount || 0,
      connectorDegradedCount: connectors?.summary?.degradedCount || 0,
      connectorBlockedCount: connectors?.summary?.blockedCount || 0,
      endpointRiskCount: endpointSnapshot?.summary?.riskCount || 0,
      endpointReviewCount: endpointSnapshot?.summary?.reviewCount || 0,
      currentSprintFindingCount: currentSprintFindings.length,
      sourceCount: sourceHealth.totalSources,
    },
    scheduledJobs,
    nightlyAuditFreshness,
    connectors: connectors ? { summary: connectors.summary, rows: connectors.rows } : null,
    runtimeActivation: runtimeActivation ? { summary: runtimeActivation.summary } : null,
    endpointBudgets: endpointSnapshot ? { summary: endpointSnapshot.summary, findings: endpointSnapshot.findings || [] } : null,
    currentSprint: currentSprintStatus ? {
      ok: currentSprintStatus.ok,
      findings: currentSprintFindings,
      summary: currentSprintStatus.summary || null,
    } : null,
    sourceHealth,
    findings,
  }
}

export function buildFoundationSystemHealthReportPaths(now = new Date()) {
  const date = (isoDate(now) || new Date().toISOString()).slice(0, 10)
  return {
    date,
    markdownPath: `${SYSTEM_HEALTH_NIGHTLY_AUDIT_REPORT_PREFIX}-${date}.md`,
    jsonPath: `${SYSTEM_HEALTH_NIGHTLY_AUDIT_REPORT_PREFIX}-${date}.json`,
  }
}

function markdownTable(rows = []) {
  if (!rows.length) return '_None._'
  const lines = ['| Status | Job | Last success | Due | Detail |', '| --- | --- | --- | --- | --- |']
  for (const row of rows) {
    lines.push(`| ${row.color || row.status} | ${row.title} | ${row.latestSuccessAt || 'none'} | ${row.due ? 'yes' : 'no'} | ${String(row.plainEnglish || '').replace(/\|/g, '/')} |`)
  }
  return lines.join('\n')
}

export function buildFoundationSystemHealthReportMarkdown(snapshot = {}) {
  const redYellowRows = (snapshot.scheduledJobs?.rows || [])
    .filter(row => ['risk', 'watch'].includes(row.status))
    .slice(0, 20)
  const summary = snapshot.summary || {}
  return [
    `# System Health - ${(snapshot.generatedAt || new Date().toISOString()).slice(0, 10)}`,
    '',
    `Status: ${snapshot.status || 'unknown'}`,
    '',
    snapshot.plainEnglish || 'No system health summary recorded.',
    '',
    '## Summary',
    '',
    `- Risk findings: ${summary.riskCount || 0}`,
    `- Watch findings: ${summary.watchCount || 0}`,
    `- Scheduled job red: ${summary.scheduledJobRiskCount || 0}`,
    `- Scheduled job yellow: ${summary.scheduledJobWatchCount || 0}`,
    `- Connector down/degraded/blocked: ${summary.connectorDownCount || 0}/${summary.connectorDegradedCount || 0}/${summary.connectorBlockedCount || 0}`,
    `- Endpoint risk/review: ${summary.endpointRiskCount || 0}/${summary.endpointReviewCount || 0}`,
    `- Source contracts: ${summary.sourceCount || 0}`,
    '',
    '## Red / Yellow Scheduled Jobs',
    '',
    markdownTable(redYellowRows),
    '',
    '## Findings',
    '',
    (snapshot.findings || []).slice(0, 20).map(finding => `- ${finding.severity || 'P2'} ${finding.title || finding.id}: ${finding.detail || ''} Next: ${finding.nextAction || 'Review.'}`).join('\n') || '_None._',
    '',
    '## Posture',
    '',
    '- Report only: true',
    '- Auto-fixes: false',
    '- Backlog mutation: false',
    '- Source-system mutation: false',
    '',
  ].join('\n')
}

export function buildFoundationSystemHealthDogfoodProof() {
  const now = new Date('2026-05-16T12:30:00.000Z')
  const foundationJobs = {
    jobs: [
      {
        key: 'fresh-scheduled',
        title: 'Fresh Scheduled',
        priority: 'P0',
        runtimeMode: 'scheduled',
        enabled: true,
        scheduleEveryMinutes: 60,
        mutationPosture: 'read_only',
        mutationAllowlist: {
          decision: 'allow',
          allowedPostures: ['read_only'],
          allowedRuntimeModes: ['scheduled'],
          reason: 'Synthetic dogfood scheduled job used to prove staleness classification.',
        },
        latestRun: {
          runId: 'fresh',
          jobKey: 'fresh-scheduled',
          status: 'succeeded',
          finishedAt: '2026-05-16T12:00:00.000Z',
        },
      },
      {
        key: 'overdue-missing',
        title: 'Overdue Missing',
        priority: 'P0',
        runtimeMode: 'scheduled',
        enabled: true,
        scheduleEveryMinutes: 60,
        scheduleLocalTime: '08:00',
        scheduleTimezone: 'America/Toronto',
        mutationPosture: 'read_only',
        mutationAllowlist: {
          decision: 'allow',
          allowedPostures: ['read_only'],
          allowedRuntimeModes: ['scheduled'],
          reason: 'Synthetic dogfood scheduled job used to prove staleness classification.',
        },
        latestRun: null,
      },
      {
        key: 'latest-failed',
        title: 'Latest Failed',
        priority: 'P0',
        runtimeMode: 'scheduled',
        enabled: true,
        scheduleEveryMinutes: 60,
        mutationPosture: 'read_only',
        mutationAllowlist: {
          decision: 'allow',
          allowedPostures: ['read_only'],
          allowedRuntimeModes: ['scheduled'],
          reason: 'Synthetic dogfood scheduled job used to prove staleness classification.',
        },
        latestRun: {
          runId: 'failed',
          jobKey: 'latest-failed',
          status: 'failed',
          finishedAt: '2026-05-16T12:10:00.000Z',
          errorMessage: 'Synthetic failure',
        },
      },
      {
        key: 'manual-job',
        title: 'Manual Job',
        priority: 'P2',
        runtimeMode: 'manual',
        enabled: true,
        mutationPosture: 'report_only',
      },
      {
        key: NIGHTLY_DEEP_AUDIT_JOB_KEY,
        title: 'Nightly Hybrid Deep Audit',
        priority: 'P0',
        runtimeMode: 'scheduled',
        enabled: true,
        scheduleEveryMinutes: 1440,
        scheduleLocalTime: '03:00',
        scheduleTimezone: 'America/Toronto',
        mutationPosture: 'report_only',
        latestRun: {
          runId: 'job-nightly-deep-audit-today',
          jobKey: NIGHTLY_DEEP_AUDIT_JOB_KEY,
          status: 'succeeded',
          finishedAt: '2026-05-16T07:05:00.000Z',
        },
      },
    ],
  }
  const scheduledJobs = buildScheduledJobStalenessSnapshot({ foundationJobs, now })
  const snapshot = buildFoundationSystemHealthSnapshot({
    foundationJobs,
    sourceContracts: [{ id: 'SRC-SYNTHETIC-001' }],
    now,
  })
  const checks = [
    {
      ok: scheduledJobs.rows.some(row => row.key === 'overdue-missing' && row.status === 'risk' && row.color === 'red'),
      check: 'scheduled missing overdue job renders red',
    },
    {
      ok: scheduledJobs.rows.some(row => row.key === 'latest-failed' && row.status === 'risk' && row.color === 'red'),
      check: 'latest failed scheduled job renders red',
    },
    {
      ok: scheduledJobs.rows.some(row => row.key === 'fresh-scheduled' && row.status === 'healthy' && row.color === 'green'),
      check: 'fresh scheduled success renders green',
    },
    {
      ok: scheduledJobs.rows.some(row => row.key === 'manual-job' && row.status === 'manual' && row.color === 'gray'),
      check: 'manual job renders neutral gray',
    },
    {
      ok: snapshot.status === 'risk' && snapshot.reportOnly === true && snapshot.autoFixes === false && snapshot.writesBacklog === false,
      check: 'whole system snapshot is risk and report-only when red jobs exist',
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    mode: 'foundation-system-health-dogfood',
    checks,
    scheduledJobs,
    snapshot,
  }
}
