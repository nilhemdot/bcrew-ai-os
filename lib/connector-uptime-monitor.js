import {
  CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
} from './code-quality-nightly-audit.js'
import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_REPORT_PATTERN,
} from './nightly-deep-audit-constants.js'
import {
  CONNECTOR_CREDENTIAL_DEFINITIONS,
  buildConnectorCredentialRegistrySnapshot,
} from './connector-credential-registry.js'
import {
  FOUNDATION_JOB_MUTATION_POSTURES,
  getFoundationJobDefinitions,
  getFoundationJobRuntime,
  validateFoundationJobSchedulePosture,
} from './foundation-jobs.js'
import { getSourceConnectors, getSourceContracts } from './source-contracts.js'

export const FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID = 'foundation-operating-reliability-2026-05-14'
export const FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY = 'foundation-operating-reliability-v1'
export const FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH = 'scripts/process-foundation-operating-reliability-check.mjs'

export const FOUNDATION_OPERATING_RELIABILITY_CARD_IDS = [
  'CONNECTOR-UPTIME-MONITOR-001',
  'SOURCE-023',
  'RUNTIME-ACTIVATION-001',
  'SYSTEM-HEALTH-AUDITOR-001',
  'PLAN-STATE-RECONCILE-001',
]

export const CONNECTOR_UPTIME_MONITOR_JOB_KEY = 'connector-uptime-monitor'
export const CONNECTOR_UPTIME_MONITOR_JOB_TITLE = 'Connector Uptime Monitor'

export const CONNECTOR_HEALTH_STATUSES = Object.freeze({
  healthy: 'healthy',
  degraded: 'degraded',
  down: 'down',
  stale: 'stale',
  manual: 'manual',
  blocked: 'blocked',
  unknown: 'unknown',
})

export const RUNTIME_ACTIVATION_STATES = Object.freeze({
  active: 'active',
  scheduled: 'scheduled',
  manual: 'manual',
  paused: 'paused',
  blocked: 'blocked',
  due: 'due',
  stale: 'stale',
  failed: 'failed',
  unknown: 'unknown',
})

export const OPERATING_RELIABILITY_CONNECTOR_GROUPS = [
  {
    key: 'clickup',
    label: 'ClickUp',
    provider: 'clickup',
    registryKeys: ['clickup-api'],
    connectorIds: ['CONN-CLICKUP-001'],
    sourceIds: ['SRC-CLICKUP-001'],
    owner: 'Foundation / Ops',
  },
  {
    key: 'fub',
    label: 'Follow Up Boss',
    provider: 'follow_up_boss',
    registryKeys: ['fub-api'],
    connectorIds: ['CONN-FUB-001'],
    sourceIds: ['SRC-FUB-001'],
    owner: 'Sales / Recruiting',
  },
  {
    key: 'google-workspace',
    label: 'Google Workspace',
    provider: 'google_workspace',
    registryKeys: [
      'google-delegated-drive',
      'google-delegated-gmail',
      'google-delegated-sheets',
      'google-delegated-calendar',
    ],
    connectorIds: ['CONN-GDRIVE-001', 'CONN-GMAIL-001', 'CONN-GSHEETS-001', 'CONN-GCAL-001'],
    sourceIds: [
      'SRC-GDRIVE-001',
      'SRC-GDOCS-001',
      'SRC-GSLIDES-001',
      'SRC-MEETINGS-001',
      'SRC-GMAIL-001',
      'SRC-GSHEETS-001',
      'SRC-OWNERS-001',
      'SRC-FINANCE-001',
      'SRC-GCAL-001',
    ],
    owner: 'Foundation / Google Workspace',
  },
  {
    key: 'slack',
    label: 'Slack',
    provider: 'slack',
    registryKeys: ['slack-api'],
    connectorIds: ['CONN-SLACK-001'],
    sourceIds: ['SRC-SLACK-001'],
    owner: 'Foundation / Comms',
  },
  {
    key: 'missive',
    label: 'Missive',
    provider: 'missive',
    registryKeys: ['missive-api'],
    connectorIds: ['CONN-MISSIVE-001'],
    sourceIds: ['SRC-MISSIVE-001'],
    owner: 'Foundation / Comms',
  },
  {
    key: 'kpi-supabase',
    label: 'KPI / Supabase',
    provider: 'supabase',
    registryKeys: ['kpi-supabase'],
    connectorIds: ['CONN-SUPABASE-001'],
    sourceIds: ['SRC-SUPABASE-001'],
    owner: 'Foundation / Sales Metrics',
  },
]

function normalizeList(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean)
}

function unique(values = []) {
  return Array.from(new Set(normalizeList(values)))
}

function normalizeText(value) {
  return String(value || '').trim()
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isoDate(value, fallback = new Date()) {
  const date = toDate(value) || toDate(fallback) || new Date()
  return date.toISOString()
}

function statusRank(status) {
  return {
    [CONNECTOR_HEALTH_STATUSES.down]: 0,
    [CONNECTOR_HEALTH_STATUSES.blocked]: 1,
    [CONNECTOR_HEALTH_STATUSES.degraded]: 2,
    [CONNECTOR_HEALTH_STATUSES.stale]: 3,
    [CONNECTOR_HEALTH_STATUSES.manual]: 4,
    [CONNECTOR_HEALTH_STATUSES.unknown]: 5,
    [CONNECTOR_HEALTH_STATUSES.healthy]: 6,
  }[status] ?? 5
}

function worstStatus(statuses = []) {
  const normalized = normalizeList(statuses)
  if (!normalized.length) return CONNECTOR_HEALTH_STATUSES.unknown
  return normalized.slice().sort((left, right) => statusRank(left) - statusRank(right))[0]
}

export function redactConnectorError(value) {
  let text = normalizeText(value instanceof Error ? value.stack || value.message : value)
  if (!text) return ''
  text = text.replace(/(authorization|x-api-key|api-key|api_key|access_token|refresh_token|token|password|secret|cookie|set-cookie)(\s*[:=]\s*)(bearer\s+)?[^\\s,;"']+/gi, '$1$2[REDACTED]')
  text = text.replace(/bearer\s+[a-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED]')
  text = text.replace(/([?&](?:key|api_key|token|access_token|password|secret)=)[^&\\s]+/gi, '$1[REDACTED]')
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
  text = text.replace(/\b[a-f0-9]{32,}\b/gi, '[REDACTED_ID]')
  text = text.replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[REDACTED_ID]')
  return text.slice(0, 700)
}

export function classifyConnectorFailure(errorLike = {}) {
  const statusCode = Number(errorLike.statusCode || errorLike.status || errorLike.httpStatus || 0)
  const rawText = normalizeText(errorLike.message || errorLike.error || errorLike.reason || errorLike)
  const text = rawText.toLowerCase()

  if (statusCode === 429 || /\brate limit|too many requests|quota/.test(text)) {
    return {
      category: 'rate_limit',
      status: CONNECTOR_HEALTH_STATUSES.degraded,
      retryable: true,
      backoffSeconds: 300,
      reason: 'Rate limited. Back off before retrying.',
    }
  }
  if (statusCode >= 500 || /\btimeout|timed out|econnreset|enotfound|network|db_003|temporarily unavailable/.test(text)) {
    return {
      category: statusCode >= 500 ? 'server_error' : 'network',
      status: CONNECTOR_HEALTH_STATUSES.degraded,
      retryable: true,
      backoffSeconds: 120,
      reason: 'Vendor or network failure. Retry with bounded backoff.',
    }
  }
  if (statusCode === 401 || statusCode === 403 || /\bauth|unauthorized|forbidden|invalid_grant|credential/.test(text)) {
    return {
      category: 'auth',
      status: CONNECTOR_HEALTH_STATUSES.down,
      retryable: false,
      backoffSeconds: null,
      reason: 'Auth or credential failure. Re-auth or credential repair required.',
    }
  }
  if (statusCode === 404 || /\bnot found\b/.test(text)) {
    return {
      category: 'not_found',
      status: CONNECTOR_HEALTH_STATUSES.degraded,
      retryable: false,
      backoffSeconds: null,
      reason: 'Requested connector resource was not found.',
    }
  }
  return {
    category: 'unknown',
    status: CONNECTOR_HEALTH_STATUSES.degraded,
    retryable: false,
    backoffSeconds: null,
    reason: 'Unknown connector failure. Inspect source-specific logs.',
  }
}

export function normalizeConnectorProbeResult(result = {}) {
  if (result.ok === true || result.status === CONNECTOR_HEALTH_STATUSES.healthy) {
    return {
      status: CONNECTOR_HEALTH_STATUSES.healthy,
      category: 'ok',
      retryable: false,
      backoffSeconds: null,
      sanitizedError: '',
      reason: normalizeText(result.reason) || 'Probe succeeded.',
    }
  }
  const failure = classifyConnectorFailure(result)
  return {
    ...failure,
    sanitizedError: redactConnectorError(result.message || result.error || result.reason || ''),
  }
}

function credentialStatusForRows(rows = []) {
  if (!rows.length) {
    return {
      status: CONNECTOR_HEALTH_STATUSES.unknown,
      reason: 'No credential registry row maps to this connector group.',
    }
  }
  if (rows.some(row => row.status === 'blocked')) {
    return {
      status: CONNECTOR_HEALTH_STATUSES.blocked,
      reason: rows.find(row => row.blockerReason)?.blockerReason || 'Credential registry marks this connector blocked.',
    }
  }
  if (rows.every(row => row.status === 'available')) {
    return { status: CONNECTOR_HEALTH_STATUSES.healthy, reason: 'Credential metadata is available.' }
  }
  if (rows.some(row => row.status === 'available')) {
    return { status: CONNECTOR_HEALTH_STATUSES.degraded, reason: 'Some credential metadata is available, but part of the group is missing.' }
  }
  if (rows.some(row => row.status === 'candidate')) {
    return { status: CONNECTOR_HEALTH_STATUSES.manual, reason: 'Connector has candidate credentials that need human validation.' }
  }
  return { status: CONNECTOR_HEALTH_STATUSES.down, reason: 'Credential metadata is missing.' }
}

function jobsForConnectorGroup(jobs = [], group = {}) {
  const sourceIds = new Set(normalizeList(group.sourceIds))
  return jobs.filter(job => normalizeList(job.sourceIds).some(sourceId => sourceIds.has(sourceId)))
}

function latestJobStatusForGroup(jobs = []) {
  if (!jobs.length) return { status: CONNECTOR_HEALTH_STATUSES.unknown, reason: 'No Foundation job currently references this connector group.' }
  if (jobs.some(job => job.status === 'risk' || job.latestRun?.status === 'failed')) {
    return { status: CONNECTOR_HEALTH_STATUSES.degraded, reason: 'At least one connector job reports a failed or risk status.' }
  }
  if (jobs.some(job => job.scheduleStatus === 'blocked')) {
    return { status: CONNECTOR_HEALTH_STATUSES.blocked, reason: 'At least one connector job is blocked by schedule posture.' }
  }
  if (jobs.some(job => job.scheduleStatus === 'due')) {
    return { status: CONNECTOR_HEALTH_STATUSES.stale, reason: 'At least one connector job is due.' }
  }
  return { status: CONNECTOR_HEALTH_STATUSES.healthy, reason: 'Referenced connector jobs are not reporting risk.' }
}

export function buildConnectorUptimeSnapshot({
  now = new Date(),
  env = process.env,
  sourceContracts = getSourceContracts(),
  sourceConnectors = getSourceConnectors(),
  credentialRegistry = null,
  foundationJobs = null,
  probeResults = {},
} = {}) {
  const generatedAt = isoDate(now)
  const registry = credentialRegistry || buildConnectorCredentialRegistrySnapshot({
    env,
    now,
    sourceContracts,
    sourceConnectors,
  })
  const jobs = Array.isArray(foundationJobs?.jobs)
    ? foundationJobs.jobs
    : Array.isArray(foundationJobs)
      ? foundationJobs
      : []

  const rows = OPERATING_RELIABILITY_CONNECTOR_GROUPS.map(group => {
    const registryRows = (registry.rows || []).filter(row =>
      normalizeList(group.registryKeys).includes(row.key) ||
      normalizeList(group.connectorIds).includes(row.connectorId) ||
      normalizeList(row.sourceIds).some(sourceId => normalizeList(group.sourceIds).includes(sourceId))
    )
    const groupJobs = jobsForConnectorGroup(jobs, group)
    const credential = credentialStatusForRows(registryRows)
    const jobStatus = latestJobStatusForGroup(groupJobs)
    const probe = probeResults[group.key] ? normalizeConnectorProbeResult(probeResults[group.key]) : null
    const finalStatus = worstStatus([
      credential.status,
      groupJobs.length ? jobStatus.status : null,
      probe?.status,
    ].filter(Boolean))
    const reasons = unique([
      credential.reason,
      jobStatus.reason,
      probe?.reason,
    ])
    const sanitizedError = redactConnectorError(probe?.sanitizedError || probeResults[group.key]?.error || probeResults[group.key]?.message || '')

    return {
      key: group.key,
      label: group.label,
      provider: group.provider,
      owner: group.owner,
      status: finalStatus,
      reason: reasons.join(' '),
      connectorIds: unique([...normalizeList(group.connectorIds), ...registryRows.map(row => row.connectorId)]),
      sourceIds: unique([...normalizeList(group.sourceIds), ...registryRows.flatMap(row => row.sourceIds)]),
      credentialRegistryKeys: registryRows.map(row => row.key),
      credentialStatus: credential.status,
      credentialAvailableCount: registryRows.filter(row => row.status === 'available').length,
      credentialMissingCount: registryRows.filter(row => row.status === 'missing').length,
      credentialBlockedCount: registryRows.filter(row => row.status === 'blocked').length,
      jobKeys: groupJobs.map(job => job.key),
      jobStatuses: groupJobs.map(job => ({
        key: job.key,
        status: job.status || job.scheduleStatus || 'unknown',
        scheduleStatus: job.scheduleStatus || 'unknown',
        latestRunStatus: job.latestRun?.status || null,
      })),
      lastProbeAt: generatedAt,
      lastProbeKind: probe ? 'synthetic_or_live_probe' : 'credential_and_job_metadata',
      sanitizedError,
      retry: probe?.retryable
        ? { retryable: true, backoffSeconds: probe.backoffSeconds, category: probe.category }
        : { retryable: false, backoffSeconds: null, category: probe?.category || 'metadata' },
      safeToUse: finalStatus === CONNECTOR_HEALTH_STATUSES.healthy || finalStatus === CONNECTOR_HEALTH_STATUSES.stale,
      readOnly: true,
    }
  })

  const statusCounts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})
  return {
    generatedAt,
    cardId: 'CONNECTOR-UPTIME-MONITOR-001',
    closeoutKey: FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    summary: {
      connectorGroupCount: rows.length,
      healthyCount: statusCounts.healthy || 0,
      degradedCount: statusCounts.degraded || 0,
      downCount: statusCounts.down || 0,
      staleCount: statusCounts.stale || 0,
      manualCount: statusCounts.manual || 0,
      blockedCount: statusCounts.blocked || 0,
      unknownCount: statusCounts.unknown || 0,
    },
    rows,
  }
}

function staleJobState(job = {}, now = new Date()) {
  const latestTime = job.latestRun?.finishedAt || job.latestRun?.startedAt || job.latestRun?.createdAt || null
  if (!latestTime) return false
  const latestAt = toDate(latestTime)
  const intervalMinutes = Number(job.scheduleEveryMinutes || 0)
  if (!latestAt || !intervalMinutes) return false
  const staleAfterMs = Math.max(intervalMinutes * 2 * 60 * 1000, 24 * 60 * 60 * 1000)
  return now.getTime() - latestAt.getTime() > staleAfterMs
}

export function classifyRuntimeJobActivation(job = {}, now = new Date()) {
  const runtime = job.scheduleStatus ? job : getFoundationJobRuntime(job, job.latestRun || null, now)
  const scheduleGuard = job.scheduleMutationGuard || validateFoundationJobSchedulePosture(job)
  if (runtime.scheduleStatus === 'blocked' || scheduleGuard.ok === false) return RUNTIME_ACTIVATION_STATES.blocked
  if (runtime.runtimeMode === 'paused' || runtime.scheduleStatus === 'paused') return RUNTIME_ACTIVATION_STATES.paused
  if (job.latestRun?.status === 'failed' || job.status === 'risk') return RUNTIME_ACTIVATION_STATES.failed
  if (runtime.due === true || runtime.scheduleStatus === 'due') return RUNTIME_ACTIVATION_STATES.due
  if (staleJobState(job, now)) return RUNTIME_ACTIVATION_STATES.stale
  if (runtime.runtimeMode === 'manual' || runtime.scheduleStatus === 'manual') return RUNTIME_ACTIVATION_STATES.manual
  if (runtime.runtimeMode === 'scheduled') return RUNTIME_ACTIVATION_STATES.scheduled
  return RUNTIME_ACTIVATION_STATES.unknown
}

export function buildRuntimeActivationSnapshot({
  now = new Date(),
  foundationJobs = null,
  connectorUptime = null,
} = {}) {
  const generatedAt = isoDate(now)
  const jobRows = Array.isArray(foundationJobs?.jobs)
    ? foundationJobs.jobs
    : getFoundationJobDefinitions().map(job => {
      const runtime = getFoundationJobRuntime(job, null, now)
      return { ...job, ...runtime }
    })
  const jobs = jobRows.map(job => {
    const state = classifyRuntimeJobActivation(job, now)
    const scheduleGuard = job.scheduleMutationGuard || validateFoundationJobSchedulePosture(job)
    return {
      key: job.key,
      title: job.title,
      lane: job.lane || '',
      priority: job.priority || '',
      jobType: job.jobType || '',
      state,
      runtimeMode: job.runtimeMode || state,
      scheduleStatus: job.scheduleStatus || state,
      due: job.due === true,
      stale: state === RUNTIME_ACTIVATION_STATES.stale,
      failed: state === RUNTIME_ACTIVATION_STATES.failed,
      blocked: state === RUNTIME_ACTIVATION_STATES.blocked,
      manualOnly: state === RUNTIME_ACTIVATION_STATES.manual,
      nextRunAt: job.nextRunAt || null,
      latestRunStatus: job.latestRun?.status || null,
      latestRunAt: job.latestRun?.finishedAt || job.latestRun?.startedAt || null,
      mutationPosture: job.mutationPosture || scheduleGuard.mutationPosture || FOUNDATION_JOB_MUTATION_POSTURES.unknown,
      scheduleMutationGuard: scheduleGuard,
      sourceIds: normalizeList(job.sourceIds),
      nextAction: job.nextAction || '',
      scheduleDetail: job.scheduleDetail || '',
      command: job.command || '',
      args: normalizeList(job.args),
    }
  })
  const stateCounts = jobs.reduce((acc, row) => {
    acc[row.state] = (acc[row.state] || 0) + 1
    return acc
  }, {})
  const connectorStates = (connectorUptime?.rows || []).map(row => ({
    key: row.key,
    label: row.label,
    state: row.status,
    sourceIds: row.sourceIds,
    jobKeys: row.jobKeys,
    reason: row.reason,
  }))
  return {
    generatedAt,
    cardId: 'RUNTIME-ACTIVATION-001',
    closeoutKey: FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
    readOnly: true,
    reportOnly: true,
    autoStartsJobs: false,
    autoStopsJobs: false,
    summary: {
      jobCount: jobs.length,
      connectorCount: connectorStates.length,
      scheduledCount: stateCounts.scheduled || 0,
      manualCount: stateCounts.manual || 0,
      pausedCount: stateCounts.paused || 0,
      blockedCount: stateCounts.blocked || 0,
      dueCount: stateCounts.due || 0,
      staleCount: stateCounts.stale || 0,
      failedCount: stateCounts.failed || 0,
    },
    jobs,
    connectorStates,
  }
}

function finding(input) {
  return {
    id: input.id,
    severity: input.severity || 'P2',
    status: input.status || 'review',
    title: input.title,
    detail: input.detail,
    nextAction: input.nextAction || '',
    source: input.source || 'foundation_operating_reliability',
    autoFix: false,
    autoBacklogMutation: false,
  }
}

export function buildMorningHealthSnapshot({
  now = new Date(),
  connectorUptime = null,
  runtimeActivation = null,
  currentSprintStatus = null,
  backlogItems = [],
  closeouts = [],
} = {}) {
  const generatedAt = isoDate(now)
  const findings = []
  const codeQualityJob = (runtimeActivation?.jobs || []).find(job => job.key === CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY) || null
  const nightlyDeepAuditJob = (runtimeActivation?.jobs || []).find(job => job.key === NIGHTLY_DEEP_AUDIT_JOB_KEY) || null
  const recurringDeepAuditCard = backlogItems.find(item => item.id === 'RECURRING-DEEP-AUDIT-001') || null
  const nightlyDeepAuditCard = backlogItems.find(item => item.id === 'NIGHTLY-DEEP-AUDIT-UPGRADE-001') || null
  const nightlyDeepAuditScheduled = nightlyDeepAuditJob &&
    ['scheduled', 'due', 'running'].includes(nightlyDeepAuditJob.state) &&
    nightlyDeepAuditJob.scheduleMutationGuard?.ok !== false

  const downConnectors = (connectorUptime?.rows || []).filter(row => row.status === CONNECTOR_HEALTH_STATUSES.down)
  const degradedConnectors = (connectorUptime?.rows || []).filter(row => row.status === CONNECTOR_HEALTH_STATUSES.degraded)
  const blockedJobs = (runtimeActivation?.jobs || []).filter(job => job.state === RUNTIME_ACTIVATION_STATES.blocked)
  const failedJobs = (runtimeActivation?.jobs || []).filter(job => job.state === RUNTIME_ACTIVATION_STATES.failed)

  if (downConnectors.length) {
    findings.push(finding({
      id: 'connector_down',
      severity: 'P0',
      title: 'One or more connectors are down',
      detail: downConnectors.map(row => row.label).join(', '),
      nextAction: 'Review connector credentials or vendor status before relying on dependent hubs.',
    }))
  }
  if (degradedConnectors.length) {
    findings.push(finding({
      id: 'connector_degraded',
      severity: 'P1',
      title: 'One or more connectors are degraded',
      detail: degradedConnectors.map(row => row.label).join(', '),
      nextAction: 'Use source-health details before changing hub behavior.',
    }))
  }
  if (blockedJobs.length) {
    findings.push(finding({
      id: 'runtime_jobs_blocked',
      severity: 'P1',
      title: 'Scheduled jobs are blocked by runtime posture',
      detail: blockedJobs.map(job => job.key).slice(0, 8).join(', '),
      nextAction: 'Split mutating checks into read-only proof plus explicit apply lane before scheduling.',
    }))
  }
  if (failedJobs.length) {
    findings.push(finding({
      id: 'runtime_jobs_failed',
      severity: 'P1',
      title: 'Foundation jobs have recent failures',
      detail: failedJobs.map(job => job.key).slice(0, 8).join(', '),
      nextAction: 'Review latest run error before treating the system as green.',
    }))
  }
  if (!nightlyDeepAuditScheduled) {
    findings.push(finding({
      id: 'nightly_deep_audit_not_scheduled',
      severity: 'P1',
      title: 'Nightly hybrid deep audit is not scheduled',
      detail: `The deterministic scanner job is ${codeQualityJob?.state || 'missing'}, and the nightly deep audit job is ${nightlyDeepAuditJob?.state || 'missing'}.`,
      nextAction: 'Schedule the report-only nightly hybrid audit before trusting morning review coverage.',
    }))
  }
  if (!nightlyDeepAuditCard || !['scoped', 'done'].includes(nightlyDeepAuditCard.lane)) {
    findings.push(finding({
      id: 'nightly_deep_audit_card_not_ready',
      severity: 'P1',
      title: 'Nightly deep audit upgrade card is not ready',
      detail: nightlyDeepAuditCard
        ? `NIGHTLY-DEEP-AUDIT-UPGRADE-001 is lane ${nightlyDeepAuditCard.lane}.`
        : 'NIGHTLY-DEEP-AUDIT-UPGRADE-001 is missing from live backlog.',
      nextAction: 'Keep the scheduled reviewer upgrade visible in backlog and close it only after dogfood proof passes.',
    }))
  }
  if (currentSprintStatus && currentSprintStatus.status && currentSprintStatus.status !== 'healthy') {
    findings.push(finding({
      id: 'current_sprint_unhealthy',
      severity: 'P0',
      title: 'Current Sprint status is not healthy',
      detail: currentSprintStatus.findings?.map(item => item.check).join(', ') || currentSprintStatus.status,
      nextAction: 'Fix sprint doctrine/state before opening another sprint.',
    }))
  }

  const hasP0 = findings.some(item => item.severity === 'P0')
  const status = hasP0 ? 'risk' : findings.length ? 'review' : 'healthy'
  return {
    generatedAt,
    cardId: 'SYSTEM-HEALTH-AUDITOR-001',
    closeoutKey: FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
    status,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    autonomousDev: false,
    deterministicScanner: {
      jobKey: CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
      state: codeQualityJob?.state || 'missing',
      reportPath: CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
      note: 'This deterministic scanner is the cheap base layer; the nightly hybrid deep audit is the scheduled reviewer layer.',
    },
    recurringDeepAudit: {
      cardId: 'RECURRING-DEEP-AUDIT-001',
      lane: recurringDeepAuditCard?.lane || 'missing',
      built: recurringDeepAuditCard?.lane === 'done',
      note: 'Manual recurring deep audit remains historical/explicit-run posture.',
    },
    nightlyDeepAudit: {
      cardId: 'NIGHTLY-DEEP-AUDIT-UPGRADE-001',
      jobKey: NIGHTLY_DEEP_AUDIT_JOB_KEY,
      lane: nightlyDeepAuditCard?.lane || 'missing',
      state: nightlyDeepAuditJob?.state || 'missing',
      scheduled: Boolean(nightlyDeepAuditScheduled),
      reportPattern: NIGHTLY_DEEP_AUDIT_REPORT_PATTERN,
      note: 'This is the scheduled report-only hybrid reviewer Steve expected.',
    },
    summary: {
      findingCount: findings.length,
      p0Count: findings.filter(item => item.severity === 'P0').length,
      p1Count: findings.filter(item => item.severity === 'P1').length,
      connectorDownCount: downConnectors.length,
      connectorDegradedCount: degradedConnectors.length,
      blockedJobCount: blockedJobs.length,
      failedJobCount: failedJobs.length,
      closeoutRecorded: closeouts.some(closeout => closeout.key === FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY),
    },
    findings,
    plainEnglish: findings.length
      ? 'Morning health is report-only. Review connector/runtime/audit findings before assuming Foundation is green.'
      : 'Morning health has no findings in the deterministic report-only checks.',
  }
}

export function buildFoundationOperatingReliabilitySnapshot({
  now = new Date(),
  sourceContracts = getSourceContracts(),
  sourceConnectors = getSourceConnectors(),
  foundationJobs = null,
  currentSprintStatus = null,
  backlogItems = [],
  closeouts = [],
  env = process.env,
} = {}) {
  const connectorUptime = buildConnectorUptimeSnapshot({
    now,
    env,
    sourceContracts,
    sourceConnectors,
    foundationJobs,
  })
  const runtimeActivation = buildRuntimeActivationSnapshot({
    now,
    foundationJobs,
    connectorUptime,
  })
  const morningHealth = buildMorningHealthSnapshot({
    now,
    connectorUptime,
    runtimeActivation,
    currentSprintStatus,
    backlogItems,
    closeouts,
  })
  return {
    generatedAt: isoDate(now),
    closeoutKey: FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
    sprintId: FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID,
    cards: FOUNDATION_OPERATING_RELIABILITY_CARD_IDS,
    connectorUptime,
    runtimeActivation,
    morningHealth,
  }
}

export function assertNoConnectorUptimeSecretLeak(snapshot, forbiddenValues = []) {
  const text = JSON.stringify(snapshot)
  const leakedSentinels = normalizeList(forbiddenValues).filter(value => value && text.includes(value))
  const unsafeKeys = []
  const stack = [snapshot]
  while (stack.length) {
    const value = stack.pop()
    if (!value || typeof value !== 'object') continue
    for (const [key, child] of Object.entries(value)) {
      if (/^(token|password|secret|apiKey|api_key|authorization|cookie|rawValue|credentialValue)$/i.test(key)) {
        unsafeKeys.push(key)
      }
      if (child && typeof child === 'object') stack.push(child)
    }
  }
  return {
    ok: leakedSentinels.length === 0 && unsafeKeys.length === 0,
    leakedSentinels,
    unsafeKeys,
  }
}

export function buildFoundationOperatingReliabilityDogfoodProof() {
  const secret = 'sk_test_1234567890abcdefghijklmnopqrstuvwxyzSECRET'
  const bearer = 'Bearer secretBearerValueabcdefghijklmnopqrstuvwxyz0123456789'
  const degradedProbe = normalizeConnectorProbeResult({
    statusCode: 500,
    error: `ClickUp 500 DB_003 token=${secret} authorization=${bearer}`,
  })
  const authProbe = normalizeConnectorProbeResult({
    statusCode: 401,
    error: `Unauthorized api_key=${secret}`,
  })
  const healthyProbe = normalizeConnectorProbeResult({ ok: true, reason: 'ok' })
  const rateLimitedProbe = normalizeConnectorProbeResult({
    statusCode: 429,
    error: `rate limit for steve@example.com access_token=${secret}`,
  })
  const syntheticCredentialRegistry = {
    generatedAt: new Date('2026-05-14T09:00:00.000Z').toISOString(),
    rows: CONNECTOR_CREDENTIAL_DEFINITIONS.map(definition => ({
      key: definition.key,
      connectorId: definition.connectorId,
      sourceIds: normalizeList(definition.sourceIds),
      provider: definition.provider,
      status: definition.key === 'slack-api' ? 'missing' : 'available',
      sourceUnlocked: definition.key !== 'slack-api',
      blockerReason: '',
      lastProbeStatus: definition.key === 'slack-api' ? 'missing' : 'passed',
    })),
  }
  const connectorUptime = buildConnectorUptimeSnapshot({
    now: new Date('2026-05-14T09:00:00.000Z'),
    credentialRegistry: syntheticCredentialRegistry,
    foundationJobs: {
      jobs: [
        { key: 'gmail-sync-current', sourceIds: ['SRC-GMAIL-001'], scheduleStatus: 'scheduled', status: 'healthy' },
        { key: 'clickup-read-check', sourceIds: ['SRC-CLICKUP-001'], scheduleStatus: 'scheduled', status: 'healthy' },
      ],
    },
    probeResults: {
      clickup: { statusCode: 500, error: `ClickUp 500 DB_003 token=${secret}` },
      fub: { ok: true, reason: 'ok' },
      'google-workspace': { ok: true, reason: 'ok' },
      slack: { statusCode: 401, error: `Unauthorized authorization=${bearer}` },
      missive: { statusCode: 429, error: `Rate limit email=steve@example.com access_token=${secret}` },
      'kpi-supabase': { ok: true, reason: 'ok' },
    },
  })
  const runtimeActivation = buildRuntimeActivationSnapshot({
    now: new Date('2026-05-14T09:00:00.000Z'),
    connectorUptime,
    foundationJobs: {
      jobs: [
        {
          key: 'scheduled-healthy',
          title: 'Scheduled Healthy',
          runtimeMode: 'scheduled',
          scheduleStatus: 'scheduled',
          scheduleEveryMinutes: 60,
          sourceIds: [],
          mutationPosture: 'read_only',
          scheduleMutationGuard: { ok: true, mutationPosture: 'read_only' },
        },
        {
          key: 'manual-audit',
          title: 'Manual Audit',
          runtimeMode: 'manual',
          scheduleStatus: 'manual',
          sourceIds: [],
          mutationPosture: 'report_only',
        },
        {
          key: 'blocked-mutating-check',
          title: 'Blocked Mutating Check',
          runtimeMode: 'blocked',
          scheduleStatus: 'blocked',
          sourceIds: [],
          mutationPosture: 'mutating',
          scheduleMutationGuard: { ok: false, mutationPosture: 'mutating', reason: 'blocked' },
        },
        {
          key: CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
          title: 'Code Quality Nightly Audit',
          runtimeMode: 'manual',
          scheduleStatus: 'manual',
          sourceIds: [],
          mutationPosture: 'report_only',
        },
      ],
    },
  })
  const morningHealth = buildMorningHealthSnapshot({
    now: new Date('2026-05-14T09:00:00.000Z'),
    connectorUptime,
    runtimeActivation,
    currentSprintStatus: { status: 'healthy', findings: [] },
    backlogItems: [{ id: 'RECURRING-DEEP-AUDIT-001', lane: 'scoped' }],
    closeouts: [],
  })
  const leakCheck = assertNoConnectorUptimeSecretLeak(connectorUptime, [secret, bearer, 'steve@example.com'])
  const checks = [
    {
      ok: degradedProbe.status === CONNECTOR_HEALTH_STATUSES.degraded && !degradedProbe.sanitizedError.includes(secret),
      check: '500 connector failure becomes degraded and redacted',
      detail: degradedProbe.sanitizedError,
    },
    {
      ok: authProbe.status === CONNECTOR_HEALTH_STATUSES.down && authProbe.retryable === false && !authProbe.sanitizedError.includes(secret),
      check: 'auth failure becomes down/non-retryable and redacted',
      detail: authProbe.sanitizedError,
    },
    {
      ok: healthyProbe.status === CONNECTOR_HEALTH_STATUSES.healthy,
      check: 'healthy probe stays healthy',
      detail: healthyProbe.reason,
    },
    {
      ok: rateLimitedProbe.retryable === true && rateLimitedProbe.backoffSeconds === 300 && !rateLimitedProbe.sanitizedError.includes(secret),
      check: 'rate limit gets bounded backoff and redaction',
      detail: rateLimitedProbe.sanitizedError,
    },
    {
      ok: connectorUptime.rows.length === OPERATING_RELIABILITY_CONNECTOR_GROUPS.length &&
        connectorUptime.rows.some(row => row.key === 'clickup' && row.status === CONNECTOR_HEALTH_STATUSES.degraded) &&
        connectorUptime.rows.some(row => row.key === 'slack' && row.status === CONNECTOR_HEALTH_STATUSES.down),
      check: 'connector uptime snapshot covers all groups and reports degraded/down states',
      detail: connectorUptime.rows.map(row => `${row.key}:${row.status}`).join(', '),
    },
    {
      ok: leakCheck.ok,
      check: 'connector uptime snapshot does not leak sentinels or unsafe secret keys',
      detail: JSON.stringify(leakCheck),
    },
    {
      ok: runtimeActivation.jobs.some(job => job.key === 'blocked-mutating-check' && job.state === RUNTIME_ACTIVATION_STATES.blocked) &&
        runtimeActivation.jobs.some(job => job.key === 'manual-audit' && job.state === RUNTIME_ACTIVATION_STATES.manual),
      check: 'runtime activation distinguishes blocked mutating checks from manual report-only jobs',
      detail: runtimeActivation.jobs.map(job => `${job.key}:${job.state}`).join(', '),
    },
    {
      ok: morningHealth.findings.some(item => item.id === 'nightly_deep_audit_not_scheduled') &&
        morningHealth.findings.some(item => item.id === 'nightly_deep_audit_card_not_ready') &&
        morningHealth.reportOnly === true &&
        morningHealth.autoFixes === false &&
        morningHealth.writesBacklog === false,
      check: 'morning health distinguishes deterministic scanner from missing scheduled deep audit without mutation',
      detail: morningHealth.findings.map(item => item.id).join(', '),
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    connectorUptime,
    runtimeActivation,
    morningHealth,
  }
}
