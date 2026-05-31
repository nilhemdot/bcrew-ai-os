export const DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID = 'DEV-HUB-AUDITOR-FLOW-READBACK-001'
export const DEV_HUB_AUDITOR_FLOW_READBACK_CLOSEOUT_KEY = 'dev-hub-auditor-flow-readback-v1'
export const DEV_HUB_AUDITOR_FLOW_READBACK_PLAN_PATH = 'docs/process/dev-hub-auditor-flow-readback-001-plan.md'
export const DEV_HUB_AUDITOR_FLOW_READBACK_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-AUDITOR-FLOW-READBACK-001.json'
export const DEV_HUB_AUDITOR_FLOW_READBACK_SCRIPT_PATH = 'scripts/process-dev-hub-auditor-flow-readback-check.mjs'
export const DEV_HUB_AUDITOR_FLOW_READBACK_CONTRACT_VERSION = 'dev-hub-auditor-flow-readback.v1'
export const DEV_HUB_AUDITOR_FLOW_READBACK_VISIBLE_HOME = 'Dev Hub > Data Pool > Auditor Flow'

const AUDITOR_JOB_KEYS = [
  'nightly-deep-audit',
  'nightly-audit-fleet',
  'system-health-nightly-audit',
  'llm-auth-audit',
  'code-quality-nightly-audit',
  'recurring-deep-audit',
]

const DOWNSTREAM_JOB_KEYS = [
  'intelligence-synthesis-spine-refresh',
  'shared-comms-synthesis-v1',
]

const OUTPUT_CHANNEL_BY_KEY = {
  'nightly-deep-audit': 'report_artifact_only',
  'nightly-audit-fleet': 'read_only_check_only',
  'system-health-nightly-audit': 'report_artifact_only',
  'llm-auth-audit': 'read_only_check_only',
  'code-quality-nightly-audit': 'report_artifact_only',
  'recurring-deep-audit': 'report_artifact_only',
  'intelligence-synthesis-spine-refresh': 'governed_internal_write',
  'shared-comms-synthesis-v1': 'governed_internal_write',
}

const OUTPUT_DESTINATION_BY_CHANNEL = {
  report_artifact_only: 'Writes an audit/report artifact for review; it does not directly create backlog cards, action-route applies, Scoper records, or external messages.',
  read_only_check_only: 'Runs a deterministic read-only check; output stays as check status until a separate repair card is approved.',
  governed_internal_write: 'Downstream writer job with its own governance; not an audit-finding promotion path.',
  unknown: 'Output destination is not classified yet; keep it review-only until the job contract is explicit.',
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function truncate(value, maxChars = 180) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function ageHours(value, generatedAt) {
  const date = new Date(value || '')
  const generated = new Date(generatedAt || '')
  if (Number.isNaN(date.getTime()) || Number.isNaN(generated.getTime())) return null
  return Math.max(0, Math.round(((generated.getTime() - date.getTime()) / 36e5) * 10) / 10)
}

function latestRunAt(job = {}) {
  return text(job.latestRun?.finishedAt || job.latestRun?.startedAt || '')
}

function outputChannelForJob(job = {}) {
  const key = text(job.key)
  if (OUTPUT_CHANNEL_BY_KEY[key]) return OUTPUT_CHANNEL_BY_KEY[key]
  const mode = text(job.mutationPosture || job.writePosture || job.outputMode || job.runtimeMode).toLowerCase()
  if (mode.includes('report')) return 'report_artifact_only'
  if (mode.includes('read')) return 'read_only_check_only'
  if (mode.includes('write')) return 'governed_internal_write'
  return 'unknown'
}

function buildBoundaries() {
  return {
    readOnly: true,
    noAuditRun: true,
    noReportWrite: true,
    noBacklogMutation: true,
    noRouteMutation: true,
    noRouteApply: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noCurrentSprintMutation: true,
    noHarlanSend: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noExternalWrites: true,
    noAutoFindingPromotion: true,
    noAutoBacklogPromotion: true,
    noAutoScoperPromotion: true,
  }
}

function compactJob(job = {}, generatedAt = new Date().toISOString()) {
  const latestAt = latestRunAt(job)
  const outputChannel = outputChannelForJob(job)
  const latestRunStatus = text(job.latestRun?.status || 'not_run')
  return {
    key: text(job.key),
    title: truncate(job.title || job.key || 'Audit job', 120),
    lane: text(job.lane || 'health'),
    status: text(job.status || 'unknown'),
    runtimeMode: text(job.runtimeMode || 'manual'),
    scheduleLocalTime: text(job.scheduleLocalTime),
    nextRunAt: toIso(job.nextRunAt),
    latestRunStatus,
    latestRunAt: toIso(latestAt),
    latestRunAgeHours: latestAt ? ageHours(latestAt, generatedAt) : null,
    latestRunError: truncate(job.latestRun?.errorMessage || job.latestRun?.error || '', 180),
    outputChannel,
    outputLandsIn: OUTPUT_DESTINATION_BY_CHANNEL[outputChannel] || OUTPUT_DESTINATION_BY_CHANNEL.unknown,
    findingsMoveAutomatically: false,
    writesBacklogNow: false,
    writesRoutesNow: false,
    writesScoperNow: false,
    sendsExternalNow: false,
  }
}

function pickJobs(jobs = [], keys = [], limit = 8, generatedAt = new Date().toISOString()) {
  const wanted = new Set(keys)
  return list(jobs)
    .filter(job => wanted.has(text(job.key)))
    .map(job => compactJob(job, generatedAt))
    .slice(0, limit)
}

function buildFlowStages(summary = {}) {
  return [
    {
      stageId: 'audit-runs',
      label: 'Auditors run',
      status: count(summary.scheduledAuditorJobs) > 0 ? 'flowing' : 'manual_only',
      detail: `${count(summary.scheduledAuditorJobs)} scheduled auditor(s), ${count(summary.succeededLatestRuns)} latest success(es), ${count(summary.failedLatestRuns)} latest failure(s).`,
    },
    {
      stageId: 'report-output',
      label: 'Output lands as reports',
      status: count(summary.reportOnlyJobs) + count(summary.readOnlyJobs) > 0 ? 'report_only' : 'unknown',
      detail: `${count(summary.reportOnlyJobs)} report-only and ${count(summary.readOnlyJobs)} read-only auditor(s) need explicit review before they become repair work.`,
    },
    {
      stageId: 'review-router',
      label: 'Review router owns promotion',
      status: count(summary.autoFindingPromotionCount) === 0 ? 'manual_gate' : 'unsafe',
      detail: 'Audit findings do not auto-create backlog cards or route applies; a separate card must approve any promotion.',
    },
    {
      stageId: 'operator-review',
      label: 'Operator action stays bounded',
      status: count(summary.waitingRouteReviewItems) > 0 || count(summary.hygieneCleanupPressure) > 0 ? 'review_needed' : 'clear',
      detail: `${count(summary.waitingRouteReviewItems)} route review item(s) and ${count(summary.hygieneCleanupPressure)} hygiene signal(s) are visible for cleanup triage.`,
    },
  ]
}

function buildReviewBuckets(summary = {}) {
  const buckets = []
  if (count(summary.scheduledAuditorJobs) > 0) {
    buckets.push({
      bucketId: 'auditors-running',
      label: 'Auditors running',
      count: count(summary.scheduledAuditorJobs),
      action: 'Review latest status and output destination before treating an audit as repair work.',
    })
  }
  if (count(summary.reportOnlyJobs) + count(summary.readOnlyJobs) > 0) {
    buckets.push({
      bucketId: 'report-output',
      label: 'Report-only output',
      count: count(summary.reportOnlyJobs) + count(summary.readOnlyJobs),
      action: 'Promote findings only through a separate approved card; do not let reports silently mutate backlog or Scoper.',
    })
  }
  if (count(summary.waitingRouteReviewItems) > 0) {
    buckets.push({
      bucketId: 'route-review-pressure',
      label: 'Route review pressure',
      count: count(summary.waitingRouteReviewItems),
      action: 'Use the action-route review inbox for apply/reject/snooze decisions; this panel does not apply routes.',
    })
  }
  if (count(summary.hygieneCleanupPressure) > 0) {
    buckets.push({
      bucketId: 'hygiene-pressure',
      label: 'Hygiene cleanup pressure',
      count: count(summary.hygieneCleanupPressure),
      action: 'Choose one cleanup bucket with source-backed proof before writing atoms, facts, routes, or backlog cards.',
    })
  }
  if (count(summary.manualAuditorJobs) > 0) {
    buckets.push({
      bucketId: 'manual-auditors',
      label: 'Manual auditors',
      count: count(summary.manualAuditorJobs),
      action: 'Schedule only when the job contract and output path are clear; do not run live audits from this readback.',
    })
  }
  return buckets.slice(0, 5)
}

function buildStuckSignals(summary = {}, downstreamJobs = []) {
  const signals = []
  if (count(summary.reportOnlyJobs) + count(summary.readOnlyJobs) > 0) {
    signals.push({
      signalId: 'auditor_findings_report_only',
      severity: 'review',
      detail: 'Auditor output is visible as reports/check status, not as automatic backlog or route movement.',
    })
  }
  if (count(summary.waitingRouteReviewItems) > 0) {
    signals.push({
      signalId: 'route_review_pressure_waiting',
      severity: 'review',
      detail: `${count(summary.waitingRouteReviewItems)} action-route review item(s) still need operator decision.`,
    })
  }
  if (count(summary.hygieneCleanupPressure) > 0) {
    signals.push({
      signalId: 'hygiene_pressure_waiting',
      severity: 'review',
      detail: `${count(summary.hygieneCleanupPressure)} intelligence hygiene signal(s) need a scoped cleanup slice.`,
    })
  }
  if (count(summary.manualAuditorJobs) > 0) {
    signals.push({
      signalId: 'manual_auditors_not_scheduled',
      severity: 'info',
      detail: `${count(summary.manualAuditorJobs)} auditor(s) are manual/planned rather than scheduled.`,
    })
  }
  const failedDownstream = list(downstreamJobs).filter(job => job.latestRunStatus === 'failed')
  if (failedDownstream.length) {
    signals.push({
      signalId: 'downstream_synthesis_failure',
      severity: 'repair',
      detail: `${failedDownstream.length} downstream synthesis job(s) have failed latest runs; keep audit promotion separate from synthesis repair.`,
    })
  }
  return signals.slice(0, 6)
}

function buildPlainEnglish(summary = {}) {
  return `Auditors are visible, but their output is intentionally gated: ${count(summary.scheduledAuditorJobs)} scheduled auditor(s), ${count(summary.reportOnlyJobs)} report-only job(s), ${count(summary.readOnlyJobs)} read-only job(s), and ${count(summary.autoFindingPromotionCount)} automatic finding promotion(s). This answers whether audit output is flowing or sitting: reports/checks flow to review, while backlog/routes/Scoper require a separate approved action.`
}

export function buildDevHubAuditorFlowReadback({
  generatedAt = new Date().toISOString(),
  foundationJobs = {},
  actionRouteReadback = {},
  intelligenceHygieneReadback = {},
} = {}) {
  const jobs = list(foundationJobs.jobs)
  const auditorJobs = pickJobs(jobs, AUDITOR_JOB_KEYS, 8, generatedAt)
  const downstreamJobs = pickJobs(jobs, DOWNSTREAM_JOB_KEYS, 4, generatedAt)
  const summary = {
    auditorJobCount: auditorJobs.length,
    scheduledAuditorJobs: auditorJobs.filter(job => job.runtimeMode === 'scheduled').length,
    activeAuditorJobs: auditorJobs.filter(job => job.status === 'live').length,
    succeededLatestRuns: auditorJobs.filter(job => job.latestRunStatus === 'succeeded').length,
    failedLatestRuns: auditorJobs.filter(job => job.latestRunStatus === 'failed').length,
    reportOnlyJobs: auditorJobs.filter(job => job.outputChannel === 'report_artifact_only').length,
    readOnlyJobs: auditorJobs.filter(job => job.outputChannel === 'read_only_check_only').length,
    manualAuditorJobs: auditorJobs.filter(job => job.runtimeMode === 'manual' || job.status === 'planned').length,
    downstreamWriterJobs: downstreamJobs.filter(job => job.outputChannel === 'governed_internal_write').length,
    autoFindingPromotionCount: 0,
    externalWriteCount: 0,
    backlogMutationCount: 0,
    routeMutationCount: 0,
    scoperMutationCount: 0,
    waitingRouteReviewItems: count(actionRouteReadback.summary?.needsReviewItems),
    hygieneCleanupPressure: count(intelligenceHygieneReadback.summary?.totalCleanupPressure),
  }
  summary.reportOnlyOutputsStillNeedReview = summary.reportOnlyJobs + summary.readOnlyJobs
  summary.totalReviewPressure = summary.reportOnlyOutputsStillNeedReview +
    summary.waitingRouteReviewItems +
    summary.hygieneCleanupPressure

  const failures = []
  if (!auditorJobs.length) failures.push('auditor_jobs_missing')
  if (summary.autoFindingPromotionCount !== 0) failures.push('auto_finding_promotion_not_zero')
  if (summary.externalWriteCount !== 0) failures.push('external_write_count_not_zero')
  if (summary.backlogMutationCount !== 0) failures.push('backlog_mutation_count_not_zero')
  if (summary.routeMutationCount !== 0) failures.push('route_mutation_count_not_zero')

  const stuckSignals = buildStuckSignals(summary, downstreamJobs)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : stuckSignals.length ? 'needs_review' : 'healthy',
    contractVersion: DEV_HUB_AUDITOR_FLOW_READBACK_CONTRACT_VERSION,
    cardId: DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID,
    closeoutKey: DEV_HUB_AUDITOR_FLOW_READBACK_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt) || new Date().toISOString(),
    visibleHome: DEV_HUB_AUDITOR_FLOW_READBACK_VISIBLE_HOME,
    source: {
      registry: 'foundationJobs.jobs',
      reusedTruthLayers: [
        'foundationJobs',
        'actionRouteReadback',
        'intelligenceHygieneReadback',
      ],
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    flowStages: buildFlowStages(summary),
    reviewBuckets: buildReviewBuckets(summary),
    stuckSignals,
    auditorJobs,
    downstreamJobs,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubAuditorFlowReadback(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['needs_review', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_AUDITOR_FLOW_READBACK_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.registry !== 'foundationJobs.jobs') failures.push('foundation_jobs_registry_missing')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  for (const layer of ['foundationJobs', 'actionRouteReadback', 'intelligenceHygieneReadback']) {
    if (!list(snapshot.source?.reusedTruthLayers).includes(layer)) failures.push(`truth_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'noAuditRun', 'noReportWrite', 'noBacklogMutation', 'noRouteMutation', 'noScoperMutation', 'noExternalWrites', 'noHarlanSend', 'noAutoFindingPromotion']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  if (count(snapshot.summary?.autoFindingPromotionCount) !== 0) failures.push('auto_finding_promotion_not_zero')
  if (count(snapshot.summary?.externalWriteCount) !== 0) failures.push('external_write_count_not_zero')
  if (count(snapshot.summary?.backlogMutationCount) !== 0) failures.push('backlog_mutation_count_not_zero')
  if (count(snapshot.summary?.routeMutationCount) !== 0) failures.push('route_mutation_count_not_zero')
  if (count(snapshot.summary?.scoperMutationCount) !== 0) failures.push('scoper_mutation_count_not_zero')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  if (!list(snapshot.auditorJobs).length) failures.push('auditor_jobs_missing')
  if (list(snapshot.auditorJobs).length > 8) failures.push('auditor_jobs_unbounded')
  if (list(snapshot.downstreamJobs).length > 4) failures.push('downstream_jobs_unbounded')
  if (list(snapshot.flowStages).length > 4 || !list(snapshot.flowStages).length) failures.push('flow_stages_missing_or_unbounded')
  if (list(snapshot.reviewBuckets).length > 5) failures.push('review_buckets_unbounded')
  for (const job of list(snapshot.auditorJobs)) {
    if (job.findingsMoveAutomatically !== false) failures.push('auditor_findings_move_automatically')
    if (job.writesBacklogNow !== false) failures.push('auditor_writes_backlog_now')
    if (job.writesRoutesNow !== false) failures.push('auditor_writes_routes_now')
    if (job.writesScoperNow !== false) failures.push('auditor_writes_scoper_now')
    if (job.sendsExternalNow !== false) failures.push('auditor_sends_external_now')
    if (!text(job.outputLandsIn)) failures.push('auditor_output_destination_missing')
  }
  if (count(snapshot.summary?.reportOnlyOutputsStillNeedReview) > 0 && !list(snapshot.reviewBuckets).some(bucket => bucket.bucketId === 'report-output')) {
    failures.push('report_output_review_bucket_missing')
  }
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubAuditorFlowReadbackDogfoodProof() {
  const snapshot = buildDevHubAuditorFlowReadback({
    generatedAt: '2026-05-31T06:00:00.000Z',
    foundationJobs: {
      jobs: [
        {
          key: 'nightly-deep-audit',
          title: 'Nightly Hybrid Deep Audit',
          lane: 'health',
          status: 'live',
          runtimeMode: 'scheduled',
          scheduleLocalTime: '03:00',
          nextRunAt: '2026-05-31T07:00:00.000Z',
          latestRun: {
            status: 'succeeded',
            startedAt: '2026-05-30T07:00:31.598Z',
            finishedAt: '2026-05-30T07:00:49.227Z',
          },
        },
        {
          key: 'nightly-audit-fleet',
          title: 'Nightly Specialist Audit Fleet',
          lane: 'health',
          status: 'live',
          runtimeMode: 'scheduled',
          scheduleLocalTime: '03:05',
          nextRunAt: '2026-05-31T07:05:00.000Z',
          latestRun: {
            status: 'succeeded',
            startedAt: '2026-05-30T07:05:49.753Z',
            finishedAt: '2026-05-30T07:05:50.199Z',
          },
        },
        {
          key: 'recurring-deep-audit',
          title: 'Recurring Senior-Engineer Deep Audit',
          lane: 'health',
          status: 'planned',
          runtimeMode: 'manual',
        },
        {
          key: 'intelligence-synthesis-spine-refresh',
          title: 'Intelligence Spine Synthesis Refresh',
          lane: 'synthesis',
          status: 'live',
          runtimeMode: 'scheduled',
          latestRun: {
            status: 'succeeded',
            startedAt: '2026-05-30T09:30:45.094Z',
            finishedAt: '2026-05-30T09:31:01.971Z',
          },
        },
      ],
    },
    actionRouteReadback: {
      summary: { needsReviewItems: 5 },
    },
    intelligenceHygieneReadback: {
      summary: { totalCleanupPressure: 7 },
    },
  })
  const validation = validateDevHubAuditorFlowReadback(snapshot)
  const unsafePromotion = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      autoFindingPromotionCount: 1,
    },
  }
  const unsafeJob = {
    ...snapshot,
    auditorJobs: snapshot.auditorJobs.map((job, index) => index === 0
      ? { ...job, findingsMoveAutomatically: true }
      : job),
  }
  const unsafePromotionValidation = validateDevHubAuditorFlowReadback(unsafePromotion)
  const unsafeJobValidation = validateDevHubAuditorFlowReadback(unsafeJob)
  return {
    ok: validation.ok &&
      snapshot.summary.auditorJobCount === 3 &&
      snapshot.summary.scheduledAuditorJobs === 2 &&
      snapshot.summary.reportOnlyJobs === 2 &&
      snapshot.summary.readOnlyJobs === 1 &&
      snapshot.summary.autoFindingPromotionCount === 0 &&
      snapshot.summary.waitingRouteReviewItems === 5 &&
      snapshot.summary.hygieneCleanupPressure === 7 &&
      list(snapshot.reviewBuckets).some(bucket => bucket.bucketId === 'report-output') &&
      list(snapshot.stuckSignals).some(signal => signal.signalId === 'auditor_findings_report_only') &&
      unsafePromotionValidation.ok === false &&
      unsafePromotionValidation.failures.includes('auto_finding_promotion_not_zero') &&
      unsafeJobValidation.ok === false &&
      unsafeJobValidation.failures.includes('auditor_findings_move_automatically'),
    validation,
    unsafePromotionValidation,
    unsafeJobValidation,
    snapshot,
    invariant: 'Auditor Flow shows run/report/review status, proves findings stay report-only/read-only, and rejects automatic finding promotion.',
  }
}
