export const DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID = 'DEV-HUB-SCOPER-RUNTIME-READBACK-001'
export const DEV_HUB_SCOPER_RUNTIME_READBACK_CLOSEOUT_KEY = 'dev-hub-scoper-runtime-readback-v1'
export const DEV_HUB_SCOPER_RUNTIME_READBACK_PLAN_PATH = 'docs/process/dev-hub-scoper-runtime-readback-001-plan.md'
export const DEV_HUB_SCOPER_RUNTIME_READBACK_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-SCOPER-RUNTIME-READBACK-001.json'
export const DEV_HUB_SCOPER_RUNTIME_READBACK_SCRIPT_PATH = 'scripts/process-dev-hub-scoper-runtime-readback-check.mjs'
export const DEV_HUB_SCOPER_RUNTIME_READBACK_CONTRACT_VERSION = 'dev-hub-scoper-runtime-readback.v1'
export const DEV_HUB_SCOPER_RUNTIME_READBACK_VISIBLE_HOME = 'Dev Hub > Data Pool > Scoper Runtime'

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
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function truncate(value, maxChars = 170) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function latestRunAt(job = {}) {
  const run = job.latestRun || {}
  return run.finishedAt || run.completedAt || run.startedAt || run.createdAt || job.lastRunAt || null
}

function jobMatchesScoper(job = {}) {
  const haystack = `${job.key || ''} ${job.title || ''} ${job.description || ''}`.toLowerCase()
  return /\bscoper\b|\bportfolio\b|dev-build-opportunity-scoper/.test(haystack)
}

function normalizeJob(job = {}) {
  const run = job.latestRun || {}
  return {
    key: text(job.key),
    title: text(job.title || job.key || 'Scoper job'),
    status: text(job.status || 'unknown'),
    enabled: job.enabled !== false,
    runtimeMode: text(job.runtimeMode || ''),
    cadence: text(job.cadence || job.scheduleDetail || ''),
    nextRunAt: job.nextRunAt || null,
    latestRunStatus: text(run.status || 'no_run'),
    latestRunAt: latestRunAt(job),
    errorMessage: truncate(run.errorMessage || job.errorMessage || '', 220),
  }
}

function buildBoundaries() {
  return {
    readOnly: true,
    proposalOnly: true,
    noScheduleMutation: true,
    noScoperRun: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noBacklogMutation: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noApprovalMutation: true,
    noAutoScoperPromotion: true,
    noAutoBacklogPromotion: true,
    noAutoPromoteRecommendations: true,
    noModelCalls: true,
    noLiveExtraction: true,
    noHarlanSend: true,
    noExternalWrites: true,
  }
}

function compactCandidate(candidate = {}) {
  return {
    rank: count(candidate.rank),
    title: truncate(candidate.title || 'Build recommendation', 140),
    sourceTraceStatus: text(candidate.sourceTraceStatus || 'missing'),
    scoperStatus: text(candidate.scoperStatus || 'needs_research'),
    readyForPortfolio: candidate.readyForPortfolio === true,
    rawTraceReady: candidate.rawTraceReady === true,
    promotionStatus: text(candidate.promotionStatus || 'proposal_only'),
    parkedReason: truncate(candidate.parkedReason || '', 180),
    sourceReportArtifactId: text(candidate.sourceReportArtifactId),
    rawReportArtifactId: text(candidate.rawReportArtifactId),
  }
}

function buildRuntimeBuckets(summary = {}) {
  const buckets = []
  if (!summary.scheduledScoperJobPresent) {
    buckets.push({
      bucketId: 'schedule-missing',
      label: 'Schedule missing',
      count: 1,
      action: 'Park live scheduling until Steve approves the exact Scoper runtime boundary.',
    })
  }
  if (count(summary.readyForPortfolioCount) > 0) {
    buckets.push({
      bucketId: 'ready-for-portfolio-review',
      label: 'Ready candidates',
      count: count(summary.readyForPortfolioCount),
      action: 'Review candidates; do not create Scoper, Portfolio, or backlog records from this readback.',
    })
  }
  if (count(summary.parkedCount) > 0) {
    buckets.push({
      bucketId: 'parked-by-evidence',
      label: 'Parked by evidence',
      count: count(summary.parkedCount),
      action: 'Repair raw atom/hit trace before calling the recommendation build-ready.',
    })
  }
  return buckets.slice(0, 5)
}

function buildPlainEnglish(summary = {}) {
  const schedule = summary.scheduledScoperJobPresent ? 'a Scoper runtime job is visible' : 'no Scoper runtime job is visible'
  return `${schedule}; ${count(summary.readyForPortfolioCount)} candidate(s) are ready for portfolio review and ${count(summary.parkedCount)} are parked by evidence or boundary. This panel does not schedule Scoper or promote any recommendation.`
}

export function buildDevHubScoperRuntimeReadback({
  generatedAt = new Date().toISOString(),
  foundationJobs = {},
  scoperEvidenceTraceReadback = {},
} = {}) {
  const generatedAtIso = toIso(generatedAt)
  const jobs = list(foundationJobs.jobs || foundationJobs.runtime?.jobs || foundationJobs)
    .filter(jobMatchesScoper)
    .map(normalizeJob)
  const scheduledJobs = jobs.filter(job => job.enabled && (job.runtimeMode === 'scheduled' || Boolean(job.nextRunAt)))
  const latestJob = jobs
    .slice()
    .sort((left, right) => text(right.latestRunAt).localeCompare(text(left.latestRunAt)))
    .find(job => job.latestRunAt) || jobs[0] || null
  const candidates = list(scoperEvidenceTraceReadback.candidates).map(compactCandidate)
  const readyCandidates = candidates.filter(candidate => candidate.readyForPortfolio === true)
  const parkedCandidates = candidates.filter(candidate => candidate.readyForPortfolio !== true)
  const summary = {
    scoperJobCount: jobs.length,
    scheduledScoperJobPresent: scheduledJobs.length > 0,
    scheduledScoperJobCount: scheduledJobs.length,
    latestScoperRunStatus: latestJob?.latestRunStatus || 'missing',
    latestScoperRunAt: latestJob?.latestRunAt || null,
    nextRunAt: scheduledJobs.map(job => job.nextRunAt).filter(Boolean).sort()[0] || null,
    traceReviewedCount: count(scoperEvidenceTraceReadback.summary?.reviewedCount) || candidates.length,
    readyForPortfolioCount: count(scoperEvidenceTraceReadback.summary?.readyForPortfolioCount) || readyCandidates.length,
    parkedCount: count(scoperEvidenceTraceReadback.summary?.parkedCount) || parkedCandidates.length,
    sourceTraceReadyCount: count(scoperEvidenceTraceReadback.summary?.sourceTraceReadyCount),
    autoPromotedCount: count(scoperEvidenceTraceReadback.summary?.autoPromotedCount),
    scheduleMutationsByReadback: 0,
    scoperRunsStartedByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsWrittenByReadback: 0,
    backlogRecordsWrittenByReadback: 0,
    routeMutationsByReadback: 0,
    harlanSendsByReadback: 0,
    externalWritesByReadback: 0,
  }
  const failures = []
  if (scoperEvidenceTraceReadback.ok !== true) failures.push('scoper_evidence_trace_not_healthy')
  if (summary.autoPromotedCount !== 0) failures.push('auto_promoted_candidates_present')
  if (summary.scheduleMutationsByReadback !== 0) failures.push('schedule_mutated_by_readback')
  if (summary.scoperRunsStartedByReadback !== 0) failures.push('scoper_run_started_by_readback')
  if (summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.routeMutationsByReadback !== 0) failures.push('route_mutated_by_readback')
  if (summary.harlanSendsByReadback !== 0) failures.push('harlan_sent_by_readback')
  if (summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : summary.scheduledScoperJobPresent ? 'scheduled_visible' : 'missing_schedule',
    contractVersion: DEV_HUB_SCOPER_RUNTIME_READBACK_CONTRACT_VERSION,
    cardId: DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID,
    closeoutKey: DEV_HUB_SCOPER_RUNTIME_READBACK_CLOSEOUT_KEY,
    generatedAt: generatedAtIso,
    visibleHome: DEV_HUB_SCOPER_RUNTIME_READBACK_VISIBLE_HOME,
    source: {
      registry: 'foundationJobs.jobs',
      traceReadback: 'scoperEvidenceTraceReadback',
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    runtimeBuckets: buildRuntimeBuckets(summary),
    jobs: jobs.slice(0, 5),
    queues: {
      readyForPortfolioReview: readyCandidates.slice(0, 5),
      parkedByEvidence: parkedCandidates.slice(0, 5),
    },
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubScoperRuntimeReadback(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['missing_schedule', 'scheduled_visible'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_SCOPER_RUNTIME_READBACK_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.registry !== 'foundationJobs.jobs') failures.push('job_registry_source_missing')
  if (snapshot.source?.traceReadback !== 'scoperEvidenceTraceReadback') failures.push('trace_readback_source_missing')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'proposalOnly', 'noScheduleMutation', 'noScoperRun', 'noScoperMutation', 'noPortfolioMutation', 'noBacklogMutation', 'noRouteMutation', 'noAutoScoperPromotion', 'noExternalWrites']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  if (count(snapshot.summary?.autoPromotedCount) !== 0) failures.push('auto_promoted_candidates_present')
  if (count(snapshot.summary?.scheduleMutationsByReadback) !== 0) failures.push('schedule_mutated_by_readback')
  if (count(snapshot.summary?.scoperRunsStartedByReadback) !== 0) failures.push('scoper_run_started_by_readback')
  if (count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0) failures.push('destination_records_written_by_readback')
  if (count(snapshot.summary?.routeMutationsByReadback) !== 0) failures.push('route_mutated_by_readback')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0) failures.push('harlan_sent_by_readback')
  if (count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('external_write_by_readback')
  if (list(snapshot.jobs).length > 5) failures.push('jobs_unbounded')
  if (list(snapshot.runtimeBuckets).length > 5 || !list(snapshot.runtimeBuckets).length) failures.push('runtime_buckets_missing_or_unbounded')
  if (list(snapshot.queues?.readyForPortfolioReview).length > 5) failures.push('ready_queue_unbounded')
  if (list(snapshot.queues?.parkedByEvidence).length > 5) failures.push('parked_queue_unbounded')
  for (const candidate of [...list(snapshot.queues?.readyForPortfolioReview), ...list(snapshot.queues?.parkedByEvidence)]) {
    if (!text(candidate.promotionStatus).includes('proposal_only')) failures.push('candidate_not_proposal_only')
  }
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubScoperRuntimeReadbackDogfoodProof() {
  const trace = {
    ok: true,
    summary: {
      reviewedCount: 3,
      readyForPortfolioCount: 1,
      parkedCount: 2,
      sourceTraceReadyCount: 1,
      autoPromotedCount: 0,
    },
    candidates: [
      {
        rank: 1,
        title: 'Ready traced candidate',
        sourceTraceStatus: 'source_trace_ready',
        scoperStatus: 'ready_for_portfolio_review',
        readyForPortfolio: true,
        rawTraceReady: true,
        promotionStatus: 'proposal_only_needs_scoper_before_steve_approval',
      },
      {
        rank: 2,
        title: 'Parked candidate',
        sourceTraceStatus: 'raw_source_evidence_missing',
        scoperStatus: 'needs_research',
        readyForPortfolio: false,
        rawTraceReady: false,
        promotionStatus: 'proposal_only_needs_scoper_before_steve_approval',
        parkedReason: 'Raw hit missing.',
      },
      {
        rank: 3,
        title: 'Boundary candidate',
        sourceTraceStatus: 'raw_source_evidence_missing',
        scoperStatus: 'blocked_source_or_auth',
        readyForPortfolio: false,
        rawTraceReady: false,
        promotionStatus: 'proposal_only_needs_scoper_before_steve_approval',
        parkedReason: 'Source or auth boundary.',
      },
    ],
  }
  const missingSchedule = buildDevHubScoperRuntimeReadback({
    generatedAt: '2026-05-31T06:30:00.000Z',
    foundationJobs: { jobs: [] },
    scoperEvidenceTraceReadback: trace,
  })
  const scheduled = buildDevHubScoperRuntimeReadback({
    generatedAt: '2026-05-31T06:30:00.000Z',
    foundationJobs: {
      jobs: [{
        key: 'dev-build-opportunity-scoper-daily',
        title: 'Dev Build Opportunity Scoper',
        status: 'live',
        enabled: true,
        runtimeMode: 'scheduled',
        cadence: 'daily',
        nextRunAt: '2026-05-31T12:00:00.000Z',
        latestRun: { status: 'succeeded', finishedAt: '2026-05-30T12:00:00.000Z' },
      }],
    },
    scoperEvidenceTraceReadback: trace,
  })
  const unsafe = {
    ...missingSchedule,
    summary: {
      ...missingSchedule.summary,
      scheduleMutationsByReadback: 1,
      scoperRecordsWrittenByReadback: 1,
      autoPromotedCount: 1,
    },
  }
  const missingValidation = validateDevHubScoperRuntimeReadback(missingSchedule)
  const scheduledValidation = validateDevHubScoperRuntimeReadback(scheduled)
  const unsafeValidation = validateDevHubScoperRuntimeReadback(unsafe)
  return {
    ok: missingValidation.ok &&
      scheduledValidation.ok &&
      missingSchedule.status === 'missing_schedule' &&
      scheduled.status === 'scheduled_visible' &&
      missingSchedule.summary.readyForPortfolioCount === 1 &&
      list(missingSchedule.queues.readyForPortfolioReview).length === 1 &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('schedule_mutated_by_readback') &&
      unsafeValidation.failures.includes('destination_records_written_by_readback') &&
      unsafeValidation.failures.includes('auto_promoted_candidates_present'),
    missingValidation,
    scheduledValidation,
    unsafeValidation,
    missingSchedule,
    scheduled,
    invariant: 'Scoper Runtime readback shows schedule/run truth and candidate flow while rejecting schedule mutation, Scoper writes, and auto-promotion.',
  }
}
