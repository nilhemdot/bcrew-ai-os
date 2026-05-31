export const SYNTHESIS_ROUTER_FRESHNESS_TRIGGER_CARD_ID = 'SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001'
export const SYNTHESIS_REFRESH_JOB_KEY = 'intelligence-synthesis-spine-refresh'
export const ACTION_ROUTER_PROPOSALS_JOB_KEY = 'intelligence-action-router-proposals'
export const SYNTHESIS_FRESHNESS_TRIGGER_ENV = 'SYNTHESIS_FRESHNESS_TRIGGER_AUTORUN'
export const DEFAULT_SYNTHESIS_FRESHNESS_DEBOUNCE_MINUTES = 20

export const SOURCE_FAMILY_FRESHNESS_WATERMARKS = Object.freeze([
  {
    familyId: 'gmail',
    label: 'Gmail',
    sourceIds: ['SRC-GMAIL-001'],
    archiveJobKeys: ['gmail-sync-current'],
    extractorJobKeys: ['gmail-extract-latest'],
  },
  {
    familyId: 'missive',
    label: 'Missive',
    sourceIds: ['SRC-MISSIVE-001'],
    archiveJobKeys: ['missive-sync-current'],
    extractorJobKeys: ['missive-extract-latest'],
  },
  {
    familyId: 'meetings',
    label: 'Meeting Notes',
    sourceIds: ['SRC-MEETINGS-001'],
    archiveJobKeys: ['meeting-notes-sync-current'],
    extractorJobKeys: ['meeting-transcripts-extract-backlog'],
  },
  {
    familyId: 'slack',
    label: 'Slack',
    sourceIds: ['SRC-SLACK-001'],
    archiveJobKeys: ['slack-sync-current'],
    extractorJobKeys: ['slack-extract-latest'],
  },
  {
    familyId: 'youtube-build-intel',
    label: 'YouTube Build Intel',
    sourceIds: ['SRC-CREATOR-WATCHLIST-001', 'SRC-YOUTUBE-INTEL-001'],
    archiveJobKeys: ['youtube-creator-daily-watch'],
    extractorJobKeys: ['youtube-god-mode-autonomous-watch-scheduler', 'video-content-extract-bite'],
  },
])

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function runTimestamp(run = {}) {
  if (!run) return null
  return toDate(run.finishedAt || run.completedAt || run.startedAt || run.createdAt || run.updatedAt)
}

function isoOrNull(date) {
  return date ? date.toISOString() : null
}

function normalizeStatus(value) {
  return text(value).toLowerCase()
}

function normalizeRun(run = {}, fallback = {}) {
  const jobKey = text(run.jobKey || run.job_key || fallback.jobKey || fallback.key)
  if (!jobKey) return null
  const at = runTimestamp(run)
  return {
    runId: text(run.runId || run.run_id),
    jobKey,
    title: text(run.title || fallback.title),
    jobType: text(run.jobType || run.job_type || fallback.jobType),
    status: text(run.status || fallback.status || 'unknown'),
    startedAt: run.startedAt || run.started_at || null,
    finishedAt: run.finishedAt || run.finished_at || run.completedAt || run.completed_at || null,
    createdAt: run.createdAt || run.created_at || null,
    updatedAt: run.updatedAt || run.updated_at || null,
    errorMessage: text(run.errorMessage || run.error_message),
    metadata: run.metadata || {},
    outputTail: text(run.outputTail || run.output_tail),
    at,
    atIso: isoOrNull(at),
  }
}

function newerRun(a = null, b = null) {
  if (!a) return b || null
  if (!b) return a
  const aAt = runTimestamp(a)
  const bAt = runTimestamp(b)
  if (!aAt) return bAt ? b : a
  if (!bAt) return a
  return bAt.getTime() > aAt.getTime() ? b : a
}

function newestRun(runs = []) {
  return list(runs).reduce((latest, run) => newerRun(latest, run), null)
}

function normalizeRuns(input = {}) {
  const output = []
  for (const run of list(input.runs || input.jobRuns)) {
    const normalized = normalizeRun(run)
    if (normalized) output.push(normalized)
  }
  for (const job of list(input.jobs)) {
    if (!job?.latestRun) continue
    const normalized = normalizeRun(job.latestRun, job)
    if (normalized) output.push(normalized)
  }
  return output
}

function latestRunForJobKey(runs = [], jobKey = '', status = null) {
  const normalizedStatus = status ? normalizeStatus(status) : null
  return newestRun(list(runs).filter(run =>
    run.jobKey === jobKey &&
    (!normalizedStatus || normalizeStatus(run.status) === normalizedStatus)
  ))
}

function latestRunsForJobKeys(runs = [], jobKeys = [], status = null) {
  return list(jobKeys)
    .map(jobKey => latestRunForJobKey(runs, jobKey, status))
    .filter(Boolean)
}

function latestSuccessfulRunForJobKeys(runs = [], jobKeys = []) {
  return newestRun(latestRunsForJobKeys(runs, jobKeys, 'succeeded'))
}

function latestAttemptForJobKeys(runs = [], jobKeys = []) {
  return newestRun(latestRunsForJobKeys(runs, jobKeys))
}

function minutesBetween(a, b) {
  const first = toDate(a)
  const second = toDate(b)
  if (!first || !second) return null
  return Math.abs(second.getTime() - first.getTime()) / 60000
}

function runIsRunning(run = null) {
  const status = normalizeStatus(run?.status)
  return status === 'running' || status === 'queued'
}

function isRunAfter(run = null, reference = null) {
  const runAt = runTimestamp(run)
  const refAt = runTimestamp(reference) || toDate(reference)
  if (!runAt || !refAt) return false
  return runAt.getTime() > refAt.getTime()
}

function numberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function usefulPartialExtractionCandidateCount(run = {}) {
  const metadata = run.metadata || {}
  const metadataCounts = [
    metadata.partialUsefulCandidateCount,
    metadata.candidatesUpsertedThisRun,
    metadata.upsertedCandidateCount,
  ]
    .map(numberOrNull)
    .filter(number => number != null && number > 0)
  if (metadataCounts.length) return metadataCounts[0]

  const outputTail = text(run.outputTail)
  const match = outputTail.match(/\bCandidates upserted this run:\s*(\d+)\b/i)
  const outputCount = match ? numberOrNull(match[1]) : null
  return outputCount != null && outputCount > 0 ? outputCount : 0
}

function failedExtractorRunHasUsefulOutput(run = {}) {
  return normalizeStatus(run.status) === 'failed' && usefulPartialExtractionCandidateCount(run) > 0
}

function buildFamilyWatermark(family = {}, runs = [], latestSynthesisSuccess = null) {
  const archiveLatest = latestAttemptForJobKeys(runs, family.archiveJobKeys)
  const archiveSuccess = latestSuccessfulRunForJobKeys(runs, family.archiveJobKeys)
  const extractorLatestRuns = latestRunsForJobKeys(runs, family.extractorJobKeys)
  const extractorLatest = newestRun(extractorLatestRuns)
  const extractorSuccess = latestSuccessfulRunForJobKeys(runs, family.extractorJobKeys)
  const extractorFailures = extractorLatestRuns
    .filter(run => normalizeStatus(run.status) === 'failed')
    .filter(run => !extractorSuccess || isRunAfter(run, extractorSuccess))
  const usefulPartialExtractorFailures = extractorFailures.filter(failedExtractorRunHasUsefulOutput)
  const blockingExtractorFailures = extractorFailures.filter(run => !failedExtractorRunHasUsefulOutput(run))
  const latestUsefulPartialExtractor = newestRun(usefulPartialExtractorFailures)
  const latestUsefulExtractor = newestRun([extractorSuccess, latestUsefulPartialExtractor].filter(Boolean))
  const latestSuccessfulUpstream = newestRun([archiveSuccess, latestUsefulExtractor].filter(Boolean))
  const latestUpstream = newestRun([archiveLatest, extractorLatest].filter(Boolean))
  const synthesisAt = runTimestamp(latestSynthesisSuccess)
  const archiveDirty = Boolean(archiveSuccess && (!synthesisAt || isRunAfter(archiveSuccess, latestSynthesisSuccess)))
  const extractorDirty = Boolean(latestUsefulExtractor && (!synthesisAt || isRunAfter(latestUsefulExtractor, latestSynthesisSuccess)))
  const dirty = Boolean(latestSuccessfulUpstream && (!synthesisAt || isRunAfter(latestSuccessfulUpstream, latestSynthesisSuccess)))
  const extractorRequired = list(family.extractorJobKeys).length > 0
  const waitingForExtractor = Boolean(
    archiveDirty &&
    extractorRequired &&
    (!latestUsefulExtractor || isRunAfter(archiveSuccess, latestUsefulExtractor))
  )
  const blockedByExtractor = blockingExtractorFailures.length > 0
  const readyForSynthesis = Boolean(dirty && !blockedByExtractor && !waitingForExtractor && (!extractorRequired || extractorDirty))
  const partialUsefulExtractorRuns = usefulPartialExtractorFailures.map(run => ({
    runId: run.runId,
    jobKey: run.jobKey,
    status: run.status,
    at: run.atIso,
    usefulCandidateCount: usefulPartialExtractionCandidateCount(run),
    errorMessage: run.errorMessage,
  }))

  return {
    familyId: family.familyId,
    label: family.label,
    sourceIds: list(family.sourceIds),
    archiveJobKeys: list(family.archiveJobKeys),
    extractorJobKeys: list(family.extractorJobKeys),
    latestArchiveRunAt: archiveLatest?.atIso || null,
    latestArchiveSuccessAt: archiveSuccess?.atIso || null,
    latestExtractorRunAt: extractorLatest?.atIso || null,
    latestExtractorSuccessAt: extractorSuccess?.atIso || null,
    latestUsefulExtractorRunAt: latestUsefulExtractor?.atIso || null,
    latestUpstreamRunAt: latestUpstream?.atIso || null,
    latestSuccessfulUpstreamAt: latestSuccessfulUpstream?.atIso || null,
    latestArchiveRunStatus: archiveLatest?.status || null,
    latestExtractorRunStatus: extractorLatest?.status || null,
    failedExtractorJobKeys: blockingExtractorFailures.map(run => run.jobKey),
    failedExtractorRuns: blockingExtractorFailures.map(run => ({
      runId: run.runId,
      jobKey: run.jobKey,
      status: run.status,
      at: run.atIso,
      errorMessage: run.errorMessage,
    })),
    partialUsefulExtractorJobKeys: usefulPartialExtractorFailures.map(run => run.jobKey),
    partialUsefulExtractorRuns,
    archiveDirty,
    extractorDirty,
    dirty,
    waitingForExtractor,
    blockedByExtractor,
    readyForSynthesis,
    plainEnglish: blockedByExtractor
      ? `${family.label} has a failed extractor, so fresh source content is not safe to claim as synthesized yet.`
      : waitingForExtractor
        ? `${family.label} has fresh archive data waiting for candidate extraction.`
        : readyForSynthesis
          ? partialUsefulExtractorRuns.length
            ? `${family.label} has useful extracted findings from a partial extractor run; failed artifacts remain visible for retry.`
            : `${family.label} has extracted findings newer than the last synthesis refresh.`
          : dirty
            ? `${family.label} has upstream source activity newer than synthesis but is not ready for synthesis yet.`
            : `${family.label} is not ahead of synthesis.`,
  }
}

function latestDirtyRunAt(families = []) {
  return families
    .filter(family => family.readyForSynthesis)
    .map(family => family.latestSuccessfulUpstreamAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null
}

function attemptIsInsideDebounce(attempt = null, referenceAt = null, now = new Date(), debounceMinutes = DEFAULT_SYNTHESIS_FRESHNESS_DEBOUNCE_MINUTES) {
  const attemptAt = runTimestamp(attempt)
  const reference = toDate(referenceAt)
  const nowDate = toDate(now) || new Date()
  if (!attemptAt || !reference) return false
  if (attemptAt.getTime() < reference.getTime()) return false
  const ageMinutes = minutesBetween(attemptAt, nowDate)
  return ageMinutes != null && ageMinutes < debounceMinutes
}

export function buildSynthesisRouterFreshnessSnapshot({
  runs = [],
  jobs = [],
  sourceFamilies = SOURCE_FAMILY_FRESHNESS_WATERMARKS,
  now = new Date().toISOString(),
  debounceMinutes = DEFAULT_SYNTHESIS_FRESHNESS_DEBOUNCE_MINUTES,
} = {}) {
  const normalizedRuns = normalizeRuns({ runs, jobs })
  const latestSynthesisRun = latestRunForJobKey(normalizedRuns, SYNTHESIS_REFRESH_JOB_KEY)
  const latestSynthesisSuccess = latestRunForJobKey(normalizedRuns, SYNTHESIS_REFRESH_JOB_KEY, 'succeeded')
  const latestActionRouterRun = latestRunForJobKey(normalizedRuns, ACTION_ROUTER_PROPOSALS_JOB_KEY)
  const latestActionRouterSuccess = latestRunForJobKey(normalizedRuns, ACTION_ROUTER_PROPOSALS_JOB_KEY, 'succeeded')
  const familyWatermarks = list(sourceFamilies).map(family => buildFamilyWatermark(family, normalizedRuns, latestSynthesisSuccess))
  const blockedFamilies = familyWatermarks.filter(family => family.blockedByExtractor)
  const waitingFamilies = familyWatermarks.filter(family => family.waitingForExtractor && !family.blockedByExtractor)
  const readyFamilies = familyWatermarks.filter(family => family.readyForSynthesis)
  const dirtyFamilies = familyWatermarks.filter(family => family.dirty)
  const latestReadyDirtyAt = latestDirtyRunAt(familyWatermarks)
  const synthesisRunning = runIsRunning(latestSynthesisRun)
  const actionRouterRunning = runIsRunning(latestActionRouterRun)
  const synthesisAttemptDebounced = attemptIsInsideDebounce(latestSynthesisRun, latestReadyDirtyAt, now, debounceMinutes)
  const shouldTriggerSynthesis = readyFamilies.length > 0 && !blockedFamilies.length && !waitingFamilies.length && !synthesisRunning && !synthesisAttemptDebounced
  const actionRouterBehind = Boolean(
    latestSynthesisSuccess &&
    (!latestActionRouterSuccess || isRunAfter(latestSynthesisSuccess, latestActionRouterSuccess))
  )
  const actionRouterDebounced = attemptIsInsideDebounce(latestActionRouterRun, latestSynthesisSuccess, now, debounceMinutes)
  const shouldTriggerActionRouter = actionRouterBehind && !actionRouterRunning && !actionRouterDebounced
  const status = blockedFamilies.length
    ? 'blocked_by_extractor'
    : waitingFamilies.length
      ? 'waiting_for_extractor'
      : shouldTriggerSynthesis
        ? 'needs_synthesis_refresh'
        : readyFamilies.length
          ? 'synthesis_refresh_debounced'
          : shouldTriggerActionRouter
            ? 'action_router_due'
            : actionRouterBehind
              ? 'action_router_debounced'
              : dirtyFamilies.length
                ? 'stale'
                : 'fresh'

  return {
    ok: blockedFamilies.length === 0,
    status,
    generatedAt: toDate(now)?.toISOString?.() || new Date().toISOString(),
    debounceMinutes,
    sourceFamilyWatermarks: familyWatermarks,
    latestSynthesisRunAt: latestSynthesisRun?.atIso || null,
    latestSynthesisRunStatus: latestSynthesisRun?.status || null,
    latestSynthesisSuccessAt: latestSynthesisSuccess?.atIso || null,
    latestActionRouterRunAt: latestActionRouterRun?.atIso || null,
    latestActionRouterRunStatus: latestActionRouterRun?.status || null,
    latestActionRouterSuccessAt: latestActionRouterSuccess?.atIso || null,
    latestReadyDirtyAt,
    blockedByExtractor: blockedFamilies.length > 0,
    waitingForExtractor: waitingFamilies.length > 0,
    stale: readyFamilies.length > 0 || dirtyFamilies.length > 0,
    shouldTriggerSynthesis,
    shouldTriggerActionRouter,
    nextJobKey: shouldTriggerSynthesis
      ? SYNTHESIS_REFRESH_JOB_KEY
      : shouldTriggerActionRouter
        ? ACTION_ROUTER_PROPOSALS_JOB_KEY
        : null,
    blockedFamilies: blockedFamilies.map(family => family.familyId),
    waitingFamilies: waitingFamilies.map(family => family.familyId),
    readyFamilies: readyFamilies.map(family => family.familyId),
    dirtyFamilies: dirtyFamilies.map(family => family.familyId),
    failedExtractorJobKeys: blockedFamilies.flatMap(family => family.failedExtractorJobKeys),
    partialUsefulExtractorJobKeys: familyWatermarks.flatMap(family => family.partialUsefulExtractorJobKeys),
    partialUsefulExtractorRuns: familyWatermarks.flatMap(family => family.partialUsefulExtractorRuns),
    plainEnglish: blockedFamilies.length
      ? `Synthesis is blocked by failed extractor jobs: ${blockedFamilies.flatMap(family => family.failedExtractorJobKeys).join(', ')}.`
      : waitingFamilies.length
        ? `Fresh source data is waiting for extractor jobs: ${waitingFamilies.map(family => family.label).join(', ')}.`
        : shouldTriggerSynthesis
          ? 'Fresh extracted findings are newer than synthesis; a bounded synthesis refresh should run next.'
          : shouldTriggerActionRouter
            ? 'Synthesis is fresh and the Action Router proposal job should run next.'
            : dirtyFamilies.length
              ? 'Fresh source work is ahead of synthesis, but the refresh is currently debounced or not ready.'
              : 'Synthesis and Action Router are current for the tracked source families.',
  }
}

export function classifySynthesisFreshnessJob(jobKey = '') {
  const normalizedJobKey = text(jobKey)
  if (normalizedJobKey === SYNTHESIS_REFRESH_JOB_KEY) return { kind: 'synthesis', role: 'brain' }
  if (normalizedJobKey === ACTION_ROUTER_PROPOSALS_JOB_KEY) return { kind: 'action_router', role: 'routing' }
  for (const family of SOURCE_FAMILY_FRESHNESS_WATERMARKS) {
    if (family.archiveJobKeys.includes(normalizedJobKey)) {
      return { kind: 'source_family', role: 'archive', familyId: family.familyId, label: family.label }
    }
    if (family.extractorJobKeys.includes(normalizedJobKey)) {
      return { kind: 'source_family', role: 'extractor', familyId: family.familyId, label: family.label }
    }
  }
  return null
}

export function buildSynthesisFreshnessMetadataForJobRun(run = {}, snapshot = null) {
  const normalizedRun = normalizeRun(run)
  if (!normalizedRun) return null
  const classification = classifySynthesisFreshnessJob(normalizedRun.jobKey)
  if (!classification) return null
  const status = normalizeStatus(normalizedRun.status)
  const isSuccess = status === 'succeeded'
  const usefulPartialCandidateCount = usefulPartialExtractionCandidateCount(normalizedRun)
  const usefulPartialExtractor = classification.kind === 'source_family' &&
    classification.role === 'extractor' &&
    status === 'failed' &&
    usefulPartialCandidateCount > 0
  const metadata = {
    cardId: SYNTHESIS_ROUTER_FRESHNESS_TRIGGER_CARD_ID,
    jobKey: normalizedRun.jobKey,
    runId: normalizedRun.runId,
    observedAt: new Date().toISOString(),
    jobKind: classification.kind,
    role: classification.role,
    status: normalizedRun.status,
  }
  if (classification.kind === 'source_family') {
    metadata.sourceFamilyId = classification.familyId
    metadata.sourceFamilyLabel = classification.label
    metadata.marksSynthesisDirty = isSuccess || usefulPartialExtractor
    metadata.blockedByExtractor = classification.role === 'extractor' && status === 'failed' && !usefulPartialExtractor
    metadata.partialUsefulExtractor = usefulPartialExtractor
    metadata.partialUsefulCandidateCount = usefulPartialExtractor ? usefulPartialCandidateCount : 0
  }
  if (classification.kind === 'synthesis') {
    metadata.synthesisSucceeded = isSuccess
    metadata.actionRouterProposalFollowupAllowed = isSuccess
  }
  if (classification.kind === 'action_router') {
    metadata.actionRouterProposalSucceeded = isSuccess
    metadata.destinationWritesApplied = false
    metadata.approvalBoundary = 'human_required_before_destination_write'
  }
  if (snapshot) {
    metadata.freshnessStatus = snapshot.status
    metadata.nextJobKey = snapshot.nextJobKey
    metadata.blockedFamilies = snapshot.blockedFamilies || []
    metadata.readyFamilies = snapshot.readyFamilies || []
    metadata.failedExtractorJobKeys = snapshot.failedExtractorJobKeys || []
    metadata.partialUsefulExtractorJobKeys = snapshot.partialUsefulExtractorJobKeys || []
  }
  return { synthesisFreshness: metadata }
}

export function shouldAutorunSynthesisFreshnessTrigger(env = process.env) {
  return text(env[SYNTHESIS_FRESHNESS_TRIGGER_ENV]).toLowerCase() === 'true'
}

export async function handleSynthesisFreshnessAfterFoundationJobRun(run = {}, {
  actor = 'synthesis-router-freshness-trigger',
  getJobRunSnapshot,
  updateJobRunMetadata,
  runFollowupJob,
  autorun = shouldAutorunSynthesisFreshnessTrigger(),
  now = new Date().toISOString(),
} = {}) {
  const classification = classifySynthesisFreshnessJob(run.jobKey || run.job_key)
  if (!classification) {
    return { handled: false, reason: 'job_not_tracked_for_synthesis_freshness' }
  }
  const snapshotInput = typeof getJobRunSnapshot === 'function'
    ? await getJobRunSnapshot({ limit: 100, includeOutput: true })
    : {}
  const freshness = buildSynthesisRouterFreshnessSnapshot({
    jobs: snapshotInput.jobs || [],
    runs: snapshotInput.latestRuns || snapshotInput.runs || [],
    now,
  })
  const metadataPatch = buildSynthesisFreshnessMetadataForJobRun(run, freshness)
  if (metadataPatch && typeof updateJobRunMetadata === 'function' && run.runId) {
    await updateJobRunMetadata(run.runId, metadataPatch, actor)
  }

  if (!autorun || typeof runFollowupJob !== 'function') {
    return {
      handled: true,
      autorun: false,
      classification,
      freshness,
      nextJobKey: freshness.nextJobKey,
    }
  }

  const status = normalizeStatus(run.status)
  const usefulPartialExtractor = classification.kind === 'source_family' &&
    classification.role === 'extractor' &&
    failedExtractorRunHasUsefulOutput(normalizeRun(run))
  if (status !== 'succeeded' && !usefulPartialExtractor) {
    return {
      handled: true,
      autorun,
      classification,
      freshness,
      nextJobKey: null,
      reason: 'completed_job_did_not_succeed',
    }
  }

  if (classification.kind === 'source_family' && freshness.shouldTriggerSynthesis) {
    const exitCode = await runFollowupJob(SYNTHESIS_REFRESH_JOB_KEY, {
      actor: `${actor}:synthesis`,
      force: true,
    })
    return {
      handled: true,
      autorun,
      classification,
      freshness,
      triggeredJobKey: SYNTHESIS_REFRESH_JOB_KEY,
      exitCode,
    }
  }

  if (classification.kind === 'synthesis' && freshness.shouldTriggerActionRouter) {
    const exitCode = await runFollowupJob(ACTION_ROUTER_PROPOSALS_JOB_KEY, {
      actor: `${actor}:action-router`,
      force: true,
    })
    return {
      handled: true,
      autorun,
      classification,
      freshness,
      triggeredJobKey: ACTION_ROUTER_PROPOSALS_JOB_KEY,
      exitCode,
    }
  }

  return {
    handled: true,
    autorun,
    classification,
    freshness,
    nextJobKey: freshness.nextJobKey,
    reason: 'no_followup_job_due',
  }
}
