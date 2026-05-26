import {
  getFoundationJobRuntime,
} from './foundation-jobs.js'
import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
} from './nightly-deep-audit-constants.js'
import {
  NIGHTLY_AUDIT_FLEET_JOB_KEY,
  buildNightlyAuditFleetRegistry,
  buildNightlyAuditFleetRollupStatus,
} from './nightly-audit-fleet.js'
import {
  buildNightlyAuditRunFreshnessStatus,
} from './nightly-audit-run-proof.js'
import {
  getAgentFeedbackAutoSendJobRunReconciliation,
} from './agent-feedback-auto-send-reconciliation.js'
import {
  buildFoundationFileSizeStandardStatus,
} from './foundation-file-size-standard.js'
import {
  buildBuildLaneFailureTelemetrySnapshot,
  readBuildLaneFailureTelemetrySnapshot,
} from './build-lane-failure-telemetry.js'
import {
  buildCurrentSprintHealthTruthLock,
  buildFoundationHealthGreenLockStatus,
} from './foundation-health-green-lock.js'

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
export const ACTIVE_JOB_RUN_STALE_GRACE_SECONDS = 300

const ACTIVE_JOB_RUN_STATUSES = new Set(['queued', 'running'])
const CLASSIFIED_FINDING_REPAIR_CARDS = {
  endpointMetrics: 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001',
  handoffHotDocCleanup: 'FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001',
  fileSizeClassifier: 'FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001',
  extractCurrent: 'EXTRACT-CURRENT-001',
  extractBackfill: 'EXTRACT-BACKFILL-001',
  connectorMonitor: 'CONNECTOR-UPTIME-MONITOR-001',
}

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

function activeRunStaleThresholdSeconds(job = {}) {
  const maxRuntimeSeconds = Math.floor(Number(job.maxRuntimeSeconds) || 0)
  return maxRuntimeSeconds > 0
    ? maxRuntimeSeconds + ACTIVE_JOB_RUN_STALE_GRACE_SECONDS
    : Math.max(30 * 60, ACTIVE_JOB_RUN_STALE_GRACE_SECONDS)
}

function jobLatestRun(job = {}) {
  return job.latestRun || null
}

function jobRunSystemHealthRouting(run = {}) {
  const routing = run?.metadata?.systemHealthRouting
  return routing && typeof routing === 'object' ? routing : null
}

function statusRank(status) {
  if (status === 'risk') return 0
  if (status === 'watch') return 1
  if (status === 'healthy') return 2
  return 3
}

function classifyScheduledJob(job = {}, now = new Date(), graceMinutes = SCHEDULED_JOB_STALENESS_GRACE_MINUTES) {
  const latestRun = jobLatestRun(job)
  const reconciliation = getAgentFeedbackAutoSendJobRunReconciliation(latestRun)
  const runtime = getFoundationJobRuntime(job, latestRun, now)
  const latestRunStatus = String(latestRun?.status || '').trim()
  const activeRun = ACTIVE_JOB_RUN_STATUSES.has(latestRunStatus)
  const latestRunAt = latestRunTime(latestRun)
  const latestSuccessAt = latestRun?.status === 'succeeded' ? latestRunAt : null
  const nextRunAt = runtime.nextRunAt || job.nextRunAt || null
  const overdueMinutes = runtime.due && nextRunAt ? elapsedMinutesSince(nextRunAt, now) : 0
  const ageMinutes = latestSuccessAt ? elapsedMinutesSince(latestSuccessAt, now) : null
  const activeAgeMinutes = activeRun && latestRunAt ? elapsedMinutesSince(latestRunAt, now) : null
  const activeStaleThresholdSeconds = activeRunStaleThresholdSeconds(job)
  const activeRunStale = activeRun && (
    activeAgeMinutes === null ||
    activeAgeMinutes * 60 > activeStaleThresholdSeconds
  )
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
    latestRunStatus: latestRunStatus || null,
    latestRunHealthStatus: reconciliation.reconciled ? 'reconciled' : latestRunStatus || null,
    latestRunReconciled: reconciliation.reconciled === true,
    latestRunReconciliationStatus: reconciliation.status || '',
    latestRunAt,
    latestSuccessAt,
    ageMinutes,
    ageHours: ageMinutes === null ? null : Math.round((ageMinutes / 60) * 10) / 10,
    activeAgeMinutes,
    staleThresholdMinutes: activeRun ? Math.ceil(activeStaleThresholdSeconds / 60) : null,
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

  if (activeRun) {
    return {
      ...base,
      status: activeRunStale ? 'risk' : 'healthy',
      color: activeRunStale ? 'red' : 'green',
      plainEnglish: activeRunStale
        ? `${base.title} latest run is still ${latestRunStatus} after ${activeAgeMinutes ?? 'unknown'} minutes.`
        : `${base.title} is ${latestRunStatus} now and still inside its runtime budget.`,
      nextAction: activeRunStale
        ? 'Open the job run and fix the stale active run before trusting this surface.'
        : 'Let the active run finish; intervene only if it exceeds its runtime budget.',
    }
  }

  if (latestRun && latestRun.status && latestRun.status !== 'succeeded') {
    if (reconciliation.reconciled === true) {
      return {
        ...base,
        status: 'healthy',
        color: 'green',
        plainEnglish: `${base.title} latest run was ${latestRun.status}, then reconciled with no open side effects and no live rerun.`,
        nextAction: 'No live auto-send rerun is approved or needed; keep the reconciliation metadata visible in the job run.',
      }
    }
    const systemHealthRouting = jobRunSystemHealthRouting(latestRun)
    if (systemHealthRouting?.status === 'blocked_by_approval') {
      return {
        ...base,
        status: 'watch',
        color: 'yellow',
        latestRunHealthStatus: 'blocked_by_approval',
        latestRunReconciled: true,
        latestRunReconciliationStatus: 'blocked_by_approval',
        owner: systemHealthRouting.owner || 'Steve',
        plainEnglish: `${base.title} latest run failed, but the next repair requires explicit approval before rerun.`,
        nextAction: systemHealthRouting.nextAction || 'Get explicit approval before rerunning this side-effecting job.',
      }
    }
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
      status: risk ? 'risk' : 'healthy',
      color: risk ? 'red' : 'green',
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

function findingRollupLevel(finding = {}) {
  const status = String(finding.status || '').toLowerCase()
  const severity = String(finding.severity || '').toLowerCase()
  if (['risk', 'red', 'blocked', 'failed', 'critical'].includes(status)) return 'risk'
  if (['critical', 'error'].includes(severity)) return 'risk'
  if (['watch', 'yellow', 'review', 'degraded'].includes(status)) return 'watch'
  return null
}

function buildFindingClassification({
  type,
  owner,
  reason,
  threshold,
  nextAction,
  repairCardId = '',
  relatedRepairCardIds = [],
  blocksCurrentSprint = false,
} = {}) {
  return {
    status: 'classified',
    type,
    owner,
    reason,
    threshold,
    nextAction,
    repairCardId,
    relatedRepairCardIds,
    blocksCurrentSprint,
  }
}

function classifySystemHealthFinding(finding = {}) {
  const id = String(finding.id || '')
  if (id === 'scheduled_job_gmail-sync-current') {
    return buildFindingClassification({
      type: 'approval_bound_extraction_lane',
      owner: 'Steve',
      reason: 'The failed/cancelled Gmail current-sync row belongs to the governed current extraction lane; live private/auth reruns need explicit approval and should not be hand-fixed inside system health.',
      threshold: 'Blocks sprint only if it repeats after an approved safe rerun or loses its EXTRACT-CURRENT-001 repair route.',
      nextAction: 'Keep the row visible and route current-day freshness/partial-failure proof through EXTRACT-CURRENT-001.',
      repairCardId: CLASSIFIED_FINDING_REPAIR_CARDS.extractCurrent,
      blocksCurrentSprint: true,
    })
  }
  if (id === 'scheduled_job_meeting-notes-sync-current') {
    return buildFindingClassification({
      type: 'approval_bound_extraction_lane',
      owner: 'Steve',
      reason: 'Meeting-notes current sync is approval-bound; no live meeting extraction rerun is allowed without Steve explicitly approving it.',
      threshold: 'Blocks sprint only if someone reruns the live lane without approval or the approval-bound owner/next action disappears.',
      nextAction: finding.nextAction || 'Get explicit Steve approval before rerunning this side-effecting meeting-notes job.',
      repairCardId: CLASSIFIED_FINDING_REPAIR_CARDS.extractCurrent,
      blocksCurrentSprint: true,
    })
  }
  if (id === 'scheduled_job_meeting-transcripts-extract-backlog') {
    return buildFindingClassification({
      type: 'approval_bound_backfill_lane',
      owner: 'Steve',
      reason: 'Meeting transcript backlog extraction is governed backfill work; broad private/auth extraction stays blocked until the backfill contract proves cursor, skip, retry, and approval posture.',
      threshold: 'Blocks sprint only if the job is rerun outside EXTRACT-BACKFILL-001 posture or remains failed after an approved safe rerun.',
      nextAction: 'Route historical cursor/backfill behavior through EXTRACT-BACKFILL-001 before any broad live extraction.',
      repairCardId: CLASSIFIED_FINDING_REPAIR_CARDS.extractBackfill,
      blocksCurrentSprint: true,
    })
  }
  if (id === 'runtime_jobs_failed') {
    return buildFindingClassification({
      type: 'job_ledger_routed',
      owner: 'Foundation Process',
      reason: 'The remaining recent job failures are approval-bound extraction/backfill rows; connector uptime has a later successful safe run and repeated build-lane reds are clear.',
      threshold: 'Becomes sprint-blocking when an unclassified repeated job failure appears, or when an approved safe rerun fails again without a live repair card.',
      nextAction: 'Keep the failed-run ledger visible while EXTRACT-CURRENT-001 and EXTRACT-BACKFILL-001 own the governed repair proof.',
      repairCardId: CLASSIFIED_FINDING_REPAIR_CARDS.extractCurrent,
      relatedRepairCardIds: [
        CLASSIFIED_FINDING_REPAIR_CARDS.extractCurrent,
        CLASSIFIED_FINDING_REPAIR_CARDS.extractBackfill,
      ],
      blocksCurrentSprint: true,
    })
  }
  if (id === 'connector_degraded') {
    return buildFindingClassification({
      type: 'watch_threshold',
      owner: 'Foundation Process',
      reason: 'Connector monitor is safe/read-only and now succeeds; the remaining Google Workspace degraded posture is provider/credential posture, not a failed build-lane or unsafe rerun target.',
      threshold: 'Blocks the sprint if any connector is down, blocked without owner, or required for the active card and still degraded after a safe preflight.',
      nextAction: 'Keep Google Workspace degraded visible; promote to a connector credential/source card only if it blocks the active extraction lane.',
      repairCardId: CLASSIFIED_FINDING_REPAIR_CARDS.connectorMonitor,
    })
  }
  if (id === 'endpoint_budget_review' || id.startsWith('endpoint_budget_')) {
    return buildFindingClassification({
      type: 'routed_to_next_card',
      owner: 'Foundation Process',
      reason: 'Endpoint budget freshness is the next explicit sprint slice, not hidden health noise.',
      threshold: 'Blocks source/extraction activation if endpoint metrics remain missing after FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001.',
      nextAction: 'Run FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001 to refresh or repair endpoint metrics.',
      repairCardId: CLASSIFIED_FINDING_REPAIR_CARDS.endpointMetrics,
    })
  }
  if (id.startsWith('doc_artifact_handoff_')) {
    return buildFindingClassification({
      type: 'routed_to_next_card',
      owner: 'Foundation Process',
      reason: 'Hot handoff bloat is a scoped cleanup card already in the sprint order; the row is visible and routed instead of treated as surprise red health.',
      threshold: 'Blocks source/extraction activation if the hot-doc row stays over budget after FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001.',
      nextAction: 'Run FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001 to roll up or archive cold handoffs without deleting useful history.',
      repairCardId: CLASSIFIED_FINDING_REPAIR_CARDS.handoffHotDocCleanup,
    })
  }
  if (id.startsWith('file_size_')) {
    return buildFindingClassification({
      type: 'watch_threshold',
      owner: 'Foundation Process',
      reason: 'Large watched files are known guardrail rows; they need classification or split planning before new responsibility is added.',
      threshold: 'Blocks a card if it adds responsibility to a watched file without wrapper-only proof or split plan; danger files over 10000 lines remain red.',
      nextAction: 'Run FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001 to classify or split watched files.',
      repairCardId: CLASSIFIED_FINDING_REPAIR_CARDS.fileSizeClassifier,
    })
  }
  return null
}

export function classifyFoundationSystemHealthFindings(findings = [], { rawRiskCount = 0, rawWatchCount = 0 } = {}) {
  const annotatedFindings = (Array.isArray(findings) ? findings : []).map(finding => {
    const rollupLevel = findingRollupLevel(finding)
    const classification = rollupLevel ? classifySystemHealthFinding(finding) : null
    return {
      ...finding,
      rollupLevel,
      ...(classification ? { classification } : {}),
    }
  })
  const visibleRiskFindings = annotatedFindings.filter(finding => finding.rollupLevel === 'risk')
  const visibleWatchFindings = annotatedFindings.filter(finding => finding.rollupLevel === 'watch')
  const effectiveRawRiskCount = Math.max(Number(rawRiskCount || 0), visibleRiskFindings.length)
  const effectiveRawWatchCount = Math.max(Number(rawWatchCount || 0), visibleWatchFindings.length)
  const classifiedRiskCount = visibleRiskFindings.filter(finding => finding.classification).length
  const classifiedWatchCount = visibleWatchFindings.filter(finding => finding.classification).length
  const blockingClassifiedRiskFindings = visibleRiskFindings
    .filter(finding => finding.classification?.blocksCurrentSprint === true)
  const blockingClassifiedWatchFindings = visibleWatchFindings
    .filter(finding => finding.classification?.blocksCurrentSprint === true)
  const hiddenRiskCount = Math.max(0, effectiveRawRiskCount - visibleRiskFindings.length)
  const hiddenWatchCount = Math.max(0, effectiveRawWatchCount - visibleWatchFindings.length)
  const unclassifiedRiskFindings = visibleRiskFindings.filter(finding => !finding.classification)
  const unclassifiedWatchFindings = visibleWatchFindings.filter(finding => !finding.classification)
  const unclassifiedRiskCount = unclassifiedRiskFindings.length + hiddenRiskCount
  const unclassifiedWatchCount = unclassifiedWatchFindings.length + hiddenWatchCount
  return {
    findings: annotatedFindings,
    summary: {
      rawRiskCount: effectiveRawRiskCount,
      rawWatchCount: effectiveRawWatchCount,
      visibleRiskCount: visibleRiskFindings.length,
      visibleWatchCount: visibleWatchFindings.length,
      hiddenRiskCount,
      hiddenWatchCount,
      classifiedRiskCount,
      classifiedWatchCount,
      blockingClassifiedRiskCount: blockingClassifiedRiskFindings.length,
      blockingClassifiedWatchCount: blockingClassifiedWatchFindings.length,
      classifiedFindingCount: annotatedFindings.filter(finding => finding.classification).length,
      unclassifiedRiskCount,
      unclassifiedWatchCount,
      blockingClassifiedFindingIds: [
        ...blockingClassifiedRiskFindings.map(finding => finding.id),
        ...blockingClassifiedWatchFindings.map(finding => finding.id),
      ].filter(Boolean),
      unclassifiedFindingIds: [
        ...unclassifiedRiskFindings.map(finding => finding.id),
        ...unclassifiedWatchFindings.map(finding => finding.id),
      ].filter(Boolean),
    },
  }
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
  docArtifactBloat = null,
  fileSizeStandard = null,
  buildLaneFailureTelemetry = null,
  now = new Date(),
} = {}) {
  const scheduledJobs = buildScheduledJobStalenessSnapshot({ foundationJobs, now })
  const nightlyJob = (foundationJobs.jobs || []).find(job => job.key === NIGHTLY_DEEP_AUDIT_JOB_KEY) || null
  const auditFleetJob = (foundationJobs.jobs || []).find(job => job.key === NIGHTLY_AUDIT_FLEET_JOB_KEY) || null
  const auditFleetScheduledRow = (scheduledJobs.rows || []).find(row => row.key === NIGHTLY_AUDIT_FLEET_JOB_KEY) || null
  const auditFleet = buildNightlyAuditFleetRollupStatus({
    registry: buildNightlyAuditFleetRegistry(),
    job: auditFleetJob,
    scheduledJobRow: auditFleetScheduledRow,
  })
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
  const docArtifactSnapshot = docArtifactBloat || foundationOperatingReliability.docArtifactBloat || null
  const fileSizeSnapshot = fileSizeStandard || foundationOperatingReliability.fileSizeStandard || buildFoundationFileSizeStandardStatus({ now })
  const buildLaneFailureSnapshot = buildLaneFailureTelemetry || readBuildLaneFailureTelemetrySnapshot({ now })
  const sourceHealth = summarizeSourceHealth(sourceContracts, foundationJobs)
  const rawRiskCount = scheduledJobs.summary.riskCount +
    (nightlyAuditFreshness.ok ? 0 : 1) +
    (auditFleet.ok ? 0 : 1) +
    (connectors?.summary?.downCount || 0) +
    (endpointSnapshot?.summary?.riskCount || 0) +
    (docArtifactSnapshot?.summary?.riskCount || 0) +
    (fileSizeSnapshot?.summary?.riskCount || 0) +
    (buildLaneFailureSnapshot?.summary?.redFingerprintCount || 0) +
    currentSprintFindings.filter(finding => finding.severity === 'error' || finding.severity === 'critical').length
  const rawWatchCount = scheduledJobs.summary.watchCount +
    (connectors?.summary?.degradedCount || 0) +
    (connectors?.summary?.blockedCount || 0) +
    (endpointSnapshot?.summary?.reviewCount || 0) +
    (docArtifactSnapshot?.summary?.reviewCount || 0) +
    (fileSizeSnapshot?.summary?.watchCount || 0) +
    (buildLaneFailureSnapshot?.summary?.yellowFingerprintCount || 0) +
    currentSprintFindings.filter(finding => finding.severity !== 'error' && finding.severity !== 'critical').length
  const rawFindings = [
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
    ...(!auditFleet.ok ? [{
      id: 'nightly_audit_fleet_rollup',
      severity: 'P0',
      status: 'risk',
      title: 'Nightly audit fleet is not wired cleanly',
      detail: auditFleet.failures.map(failure => `${failure.code}: ${failure.detail}`).join('; ') || 'Audit fleet rollup failed without detailed failures.',
      nextAction: 'Repair the audit-fleet scheduled job, allowlist row, or registry proof before trusting the morning rollup.',
      jobKey: NIGHTLY_AUDIT_FLEET_JOB_KEY,
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
    ...((docArtifactSnapshot?.topFindings || docArtifactSnapshot?.findings || []).slice(0, 8)),
    ...((fileSizeSnapshot?.topFindings || []).slice(0, 8)),
    ...((buildLaneFailureSnapshot?.topFindings || []).slice(0, 8)),
  ]
  const classifiedFindings = classifyFoundationSystemHealthFindings(rawFindings, {
    rawRiskCount,
    rawWatchCount,
  })
  const classificationStatus = statusFromCounts(
    classifiedFindings.summary.unclassifiedRiskCount,
    classifiedFindings.summary.unclassifiedWatchCount,
  )
  const rawStatus = statusFromCounts(rawRiskCount, rawWatchCount)
  const riskCount = classifiedFindings.summary.unclassifiedRiskCount +
    classifiedFindings.summary.blockingClassifiedRiskCount
  const watchCount = classifiedFindings.summary.unclassifiedWatchCount +
    classifiedFindings.summary.blockingClassifiedWatchCount
  const preGreenLockStatus = statusFromCounts(riskCount, watchCount)
  const greenLock = buildFoundationHealthGreenLockStatus({
    rawRiskCount,
    rawWatchCount,
    classifiedFindings,
    currentSprintStatus,
    now,
  })
  const currentSprintHealthTruthLock = buildCurrentSprintHealthTruthLock({
    currentSprintStatus,
    systemHealthSummary: {
      status: greenLock.status,
      rawStatus,
      classificationStatus,
      riskCount,
      watchCount,
      rawRiskCount,
      rawWatchCount,
    },
  })
  const status = currentSprintHealthTruthLock.ok ? greenLock.status : 'risk'
  const findings = classifiedFindings.findings
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
      ? 'Foundation has red workflow/system-health findings that block green. Do not treat classified rows as fixed.'
      : status === 'watch'
        ? 'Foundation has yellow workflow/system-health findings that block green until repaired or explicitly excepted in sprint truth.'
        : (rawRiskCount + rawWatchCount > 0)
            ? 'Foundation has raw red/yellow rows only under explicit Steve-approved sprint exceptions; the exceptions remain visible with owner, threshold, repair card, and next action.'
            : 'Foundation system health has no red or yellow rollup findings.',
    summary: {
      status,
      rawStatus,
      classificationStatus,
      preGreenLockStatus,
      greenLockStatus: greenLock.status,
      greenLockBlocksGreen: greenLock.blocksGreen,
      greenLockApprovedExceptionCount: greenLock.approvedExceptionCount,
      currentSprintHealthTruthLockStatus: currentSprintHealthTruthLock.status,
      riskCount,
      watchCount,
      rawRiskCount,
      rawWatchCount,
      ...classifiedFindings.summary,
      scheduledJobRiskCount: scheduledJobs.summary.riskCount,
      scheduledJobWatchCount: scheduledJobs.summary.watchCount,
      auditFleetStatus: auditFleet.status,
      auditFleetLaneCount: auditFleet.laneCount,
      auditFleetRiskCount: auditFleet.ok ? 0 : 1,
      auditFleetScheduledJobStatus: auditFleet.scheduledJobStatus,
      connectorDownCount: connectors?.summary?.downCount || 0,
      connectorDegradedCount: connectors?.summary?.degradedCount || 0,
      connectorBlockedCount: connectors?.summary?.blockedCount || 0,
      endpointRiskCount: endpointSnapshot?.summary?.riskCount || 0,
      endpointReviewCount: endpointSnapshot?.summary?.reviewCount || 0,
      docArtifactRiskCount: docArtifactSnapshot?.summary?.riskCount || 0,
      docArtifactReviewCount: docArtifactSnapshot?.summary?.reviewCount || 0,
      fileSizeRiskCount: fileSizeSnapshot?.summary?.riskCount || 0,
      fileSizeWatchCount: fileSizeSnapshot?.summary?.watchCount || 0,
      fileSizeManagedWatchCount: fileSizeSnapshot?.summary?.managedWatchCount || 0,
      fileSizeBlockingWatchCount: fileSizeSnapshot?.summary?.blockingWatchCount || 0,
      fileSizeUnmanagedWatchCount: fileSizeSnapshot?.summary?.unmanagedWatchCount || 0,
      fileSizeStaleWatchCount: fileSizeSnapshot?.summary?.staleWatchCount || 0,
      buildLaneFailureRedCount: buildLaneFailureSnapshot?.summary?.redFingerprintCount || 0,
      buildLaneFailureYellowCount: buildLaneFailureSnapshot?.summary?.yellowFingerprintCount || 0,
      buildLaneFailureEventCount7d: buildLaneFailureSnapshot?.summary?.eventCount7d || 0,
      currentSprintFindingCount: currentSprintFindings.length,
      sourceCount: sourceHealth.totalSources,
    },
    greenLock,
    currentSprintHealthTruthLock,
    scheduledJobs,
    nightlyAuditFreshness,
    auditFleet,
    connectors: connectors ? { summary: connectors.summary, rows: connectors.rows } : null,
    runtimeActivation: runtimeActivation ? { summary: runtimeActivation.summary } : null,
    endpointBudgets: endpointSnapshot ? { summary: endpointSnapshot.summary, findings: endpointSnapshot.findings || [] } : null,
    docArtifactBloat: docArtifactSnapshot ? {
      status: docArtifactSnapshot.status,
      summary: docArtifactSnapshot.summary,
      topFindings: docArtifactSnapshot.topFindings || [],
    } : null,
    fileSizeStandard: fileSizeSnapshot ? {
      status: fileSizeSnapshot.status,
      summary: fileSizeSnapshot.summary,
      topFindings: fileSizeSnapshot.topFindings || [],
      managedFindings: fileSizeSnapshot.managedFindings || [],
      rows: (fileSizeSnapshot.rows || []).slice(0, 20),
    } : null,
    buildLaneFailureTelemetry: buildLaneFailureSnapshot ? {
      status: buildLaneFailureSnapshot.status,
      summary: buildLaneFailureSnapshot.summary,
      topFindings: buildLaneFailureSnapshot.topFindings || [],
      fingerprints: (buildLaneFailureSnapshot.fingerprints || []).slice(0, 20),
      plainEnglish: buildLaneFailureSnapshot.plainEnglish,
    } : null,
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
    `- Unclassified risk findings: ${summary.riskCount || 0}`,
    `- Unclassified watch findings: ${summary.watchCount || 0}`,
    `- Raw risk/watch before classification: ${summary.rawRiskCount || 0}/${summary.rawWatchCount || 0}`,
    `- Classified risk/watch rows: ${summary.classifiedRiskCount || 0}/${summary.classifiedWatchCount || 0}`,
    `- Scheduled job red: ${summary.scheduledJobRiskCount || 0}`,
    `- Scheduled job yellow: ${summary.scheduledJobWatchCount || 0}`,
    `- Audit fleet: ${summary.auditFleetStatus || 'unknown'} (${summary.auditFleetLaneCount || 0} lanes)`,
    `- Connector down/degraded/blocked: ${summary.connectorDownCount || 0}/${summary.connectorDegradedCount || 0}/${summary.connectorBlockedCount || 0}`,
    `- Endpoint risk/review: ${summary.endpointRiskCount || 0}/${summary.endpointReviewCount || 0}`,
    `- Doc/report bloat risk/review: ${summary.docArtifactRiskCount || 0}/${summary.docArtifactReviewCount || 0}`,
    `- File-size risk/watch: ${summary.fileSizeRiskCount || 0}/${summary.fileSizeWatchCount || 0}`,
    `- Build-lane repeated failures red/yellow: ${summary.buildLaneFailureRedCount || 0}/${summary.buildLaneFailureYellowCount || 0}`,
    `- Source contracts: ${summary.sourceCount || 0}`,
    '',
    '## Red / Yellow Scheduled Jobs',
    '',
    markdownTable(redYellowRows),
    '',
    '## Audit Fleet',
    '',
    snapshot.auditFleet
      ? [
          `- Status: ${snapshot.auditFleet.status || 'unknown'}`,
          `- Job: ${snapshot.auditFleet.jobKey || 'missing'} at ${snapshot.auditFleet.scheduleLocalTime || 'missing'} ${snapshot.auditFleet.scheduleTimezone || ''}`.trim(),
          `- Lanes: ${snapshot.auditFleet.laneCount || 0}`,
          `- Hardcoded truth lane: ${snapshot.auditFleet.hardcodedTruthLanePresent ? 'present' : 'missing'}`,
        ].join('\n')
      : '_Missing audit fleet rollup._',
    '',
    '## Findings',
    '',
    (snapshot.findings || []).slice(0, 20).map(finding => {
      const classification = finding.classification
      const classified = classification
        ? ` Classified: ${classification.type}; owner: ${classification.owner}; repair: ${classification.repairCardId || 'none'}; threshold: ${classification.threshold}`
        : ''
      return `- ${finding.severity || 'P2'} ${finding.title || finding.id}: ${finding.detail || ''} Next: ${finding.nextAction || 'Review.'}${classified}`
    }).join('\n') || '_None._',
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
        key: 'approval-blocked-failed',
        title: 'Approval Blocked Failed',
        priority: 'P0',
        runtimeMode: 'scheduled',
        enabled: true,
        scheduleEveryMinutes: 60,
        mutationPosture: 'operational_write',
        mutationAllowlist: {
          decision: 'allow',
          allowedPostures: ['operational_write'],
          allowedRuntimeModes: ['scheduled'],
          reason: 'Synthetic approval-bound job used to prove failed side-effecting jobs route to owner/watch without rerun.',
        },
        latestRun: {
          runId: 'approval-blocked-failed',
          jobKey: 'approval-blocked-failed',
          status: 'failed',
          finishedAt: '2026-05-16T12:12:00.000Z',
          errorMessage: 'Synthetic approval-bound failure',
          metadata: {
            systemHealthRouting: {
              status: 'blocked_by_approval',
              owner: 'Steve',
              nextAction: 'Approve the live side-effecting rerun before retrying.',
            },
          },
        },
      },
      {
        key: 'fresh-running',
        title: 'Fresh Running',
        priority: 'P0',
        runtimeMode: 'scheduled',
        enabled: true,
        scheduleEveryMinutes: 60,
        maxRuntimeSeconds: 600,
        mutationPosture: 'read_only',
        mutationAllowlist: {
          decision: 'allow',
          allowedPostures: ['read_only'],
          allowedRuntimeModes: ['scheduled'],
          reason: 'Synthetic active-run proof fixture.',
        },
        latestRun: {
          runId: 'fresh-running',
          jobKey: 'fresh-running',
          status: 'running',
          startedAt: '2026-05-16T12:25:00.000Z',
        },
      },
      {
        key: 'stale-running',
        title: 'Stale Running',
        priority: 'P0',
        runtimeMode: 'scheduled',
        enabled: true,
        scheduleEveryMinutes: 60,
        maxRuntimeSeconds: 60,
        mutationPosture: 'read_only',
        mutationAllowlist: {
          decision: 'allow',
          allowedPostures: ['read_only'],
          allowedRuntimeModes: ['scheduled'],
          reason: 'Synthetic active-run proof fixture.',
        },
        latestRun: {
          runId: 'stale-running',
          jobKey: 'stale-running',
          status: 'running',
          startedAt: '2026-05-16T12:20:00.000Z',
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
    buildLaneFailureTelemetry: buildBuildLaneFailureTelemetrySnapshot({
      now,
      events: [
        {
          eventVersion: 1,
          command: 'foundation:verify',
          cardId: 'SYNTHETIC-001',
          sprintId: 'synthetic',
          checkName: 'Synthetic repeated verifier wiring',
          failureClass: 'verifier_snapshot_wiring',
          fileModule: 'foundation-verifier-control-loop',
          shortDetail: 'Synthetic repeated failure.',
          firstFailedLine: 'FAIL Synthetic repeated verifier wiring',
          occurredAt: '2026-05-16T12:01:00.000Z',
          fingerprint: 'synthetic-system-health-failure',
        },
        {
          eventVersion: 1,
          command: 'foundation:verify',
          cardId: 'SYNTHETIC-001',
          sprintId: 'synthetic',
          checkName: 'Synthetic repeated verifier wiring',
          failureClass: 'verifier_snapshot_wiring',
          fileModule: 'foundation-verifier-control-loop',
          shortDetail: 'Synthetic repeated failure.',
          firstFailedLine: 'FAIL Synthetic repeated verifier wiring',
          occurredAt: '2026-05-16T12:02:00.000Z',
          fingerprint: 'synthetic-system-health-failure',
        },
        {
          eventVersion: 1,
          command: 'foundation:verify',
          cardId: 'SYNTHETIC-001',
          sprintId: 'synthetic',
          checkName: 'Synthetic repeated verifier wiring',
          failureClass: 'verifier_snapshot_wiring',
          fileModule: 'foundation-verifier-control-loop',
          shortDetail: 'Synthetic repeated failure.',
          firstFailedLine: 'FAIL Synthetic repeated verifier wiring',
          occurredAt: '2026-05-16T12:03:00.000Z',
          fingerprint: 'synthetic-system-health-failure',
        },
      ],
    }),
    fileSizeStandard: buildFoundationFileSizeStandardStatus({
      watchedPaths: ['lib/red-danger-module.js'],
      fileLineCounts: { 'lib/red-danger-module.js': 10001 },
      now,
    }),
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
      ok: scheduledJobs.rows.some(row => row.key === 'approval-blocked-failed' && row.status === 'watch' && row.latestRunHealthStatus === 'blocked_by_approval'),
      check: 'approval-bound failed scheduled job renders watch with blocked owner action',
    },
    {
      ok: scheduledJobs.rows.some(row => row.key === 'fresh-running' && row.status === 'healthy' && row.color === 'green'),
      check: 'fresh active scheduled job stays green while inside runtime budget',
    },
    {
      ok: scheduledJobs.rows.some(row => row.key === 'stale-running' && row.status === 'risk' && row.color === 'red'),
      check: 'stale active scheduled job renders red',
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
    {
      ok: snapshot.fileSizeStandard?.status === 'risk' &&
        snapshot.findings.some(finding => finding.id === 'file_size_lib_red_danger_module_js'),
      check: 'file-size danger row is surfaced in system health',
    },
    {
      ok: snapshot.buildLaneFailureTelemetry?.status === 'watch' &&
        snapshot.summary?.buildLaneFailureYellowCount === 1 &&
        snapshot.findings.some(finding => finding.id === 'build_lane_failure_synthetic-system-health-failure'),
      check: 'repeated build-lane failure telemetry is surfaced in system health',
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
