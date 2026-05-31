import {
  SYNTHESIS_PROOF_ITEM_LIMIT,
  SYNTHESIS_PROOF_SCOPE_KEY,
  SYNTHESIS_REFRESH_ITEM_LIMIT,
  SYNTHESIS_REFRESH_SCOPE_KEY,
  buildSynthesisEngineRunConfig,
  buildSynthesisRefreshRealCorpusScopeDogfoodProof,
  validateSynthesisEngineRunConfig,
} from './synthesis-refresh-real-corpus-scope.js'

export const DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID = 'DEV-HUB-SYNTHESIS-SCOPE-READBACK-001'
export const DEV_HUB_SYNTHESIS_SCOPE_READBACK_CLOSEOUT_KEY = 'dev-hub-synthesis-scope-readback-v1'
export const DEV_HUB_SYNTHESIS_SCOPE_READBACK_PLAN_PATH = 'docs/process/dev-hub-synthesis-scope-readback-001-plan.md'
export const DEV_HUB_SYNTHESIS_SCOPE_READBACK_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-SYNTHESIS-SCOPE-READBACK-001.json'
export const DEV_HUB_SYNTHESIS_SCOPE_READBACK_SCRIPT_PATH = 'scripts/process-dev-hub-synthesis-scope-readback-check.mjs'
export const DEV_HUB_SYNTHESIS_SCOPE_READBACK_CONTRACT_VERSION = 'dev-hub-synthesis-scope-readback.v1'
export const DEV_HUB_SYNTHESIS_SCOPE_READBACK_VISIBLE_HOME = 'Dev Hub > Data Pool > Synthesis Scope'

const SYNTHESIS_REFRESH_JOB_KEY = 'intelligence-synthesis-spine-refresh'

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

function buildBoundaries() {
  return {
    readOnly: true,
    noRefreshRun: true,
    noSynthesisWrite: true,
    noDestinationWrites: true,
    noActionRouteProposal: true,
    noActionRouteMutation: true,
    noBacklogMutation: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noHarlanSend: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noEmbeddings: true,
    noExternalWrites: true,
    noAutoPromoteRecommendations: true,
  }
}

function latestRunAt(job = {}) {
  return text(job.latestRun?.finishedAt || job.latestRun?.startedAt || '')
}

function compactSynthesisJob(job = {}, generatedAt = new Date().toISOString()) {
  const latestAt = latestRunAt(job)
  return {
    key: text(job.key),
    title: truncate(job.title || job.key || 'Synthesis refresh job', 120),
    lane: text(job.lane || 'synthesis'),
    status: text(job.status || 'unknown'),
    runtimeMode: text(job.runtimeMode || 'manual'),
    nextRunAt: toIso(job.nextRunAt),
    latestRunStatus: text(job.latestRun?.status || 'not_run'),
    latestRunAt: toIso(latestAt),
    latestRunAgeHours: latestAt ? ageHours(latestAt, generatedAt) : null,
    latestRunError: truncate(job.latestRun?.errorMessage || job.latestRun?.error || '', 180),
    startsFromReadback: false,
    writesFromReadback: false,
  }
}

function findSynthesisRefreshJob(foundationJobs = {}, generatedAt = new Date().toISOString()) {
  const job = list(foundationJobs.jobs).find(row => text(row.key) === SYNTHESIS_REFRESH_JOB_KEY) || null
  return job ? compactSynthesisJob(job, generatedAt) : null
}

function buildFlowStages(summary = {}) {
  return [
    {
      stageId: 'proof-scope',
      label: 'Proof lane',
      status: summary.proofScopeKey === SYNTHESIS_PROOF_SCOPE_KEY && summary.proofItemLimit === SYNTHESIS_PROOF_ITEM_LIMIT ? 'small_proof' : 'unsafe',
      detail: `${summary.proofScopeKey || 'missing'} stays at ${count(summary.proofItemLimit)} item(s) for deterministic verification.`,
    },
    {
      stageId: 'refresh-scope',
      label: 'Refresh lane',
      status: summary.refreshConfiguredForRealCorpus ? 'real_corpus_configured' : 'demo_scope_risk',
      detail: `${summary.refreshScopeKey || 'missing'} is bounded at ${count(summary.refreshItemLimit)} item(s) across ${count(summary.refreshSourceCount)} source family input(s).`,
    },
    {
      stageId: 'scheduled-job',
      label: 'Scheduled job',
      status: summary.scheduledRefreshJobPresent ? summary.scheduledRefreshLatestStatus || 'registered' : 'missing',
      detail: summary.scheduledRefreshJobPresent
        ? `Latest run: ${summary.scheduledRefreshLatestStatus || 'unknown'}; next run: ${summary.scheduledRefreshNextRunAt || 'not scheduled'}.`
        : 'Synthesis refresh job is not visible in the Foundation job registry.',
    },
    {
      stageId: 'action-router-boundary',
      label: 'Route boundary',
      status: 'separate_governed_step',
      detail: 'Synthesis refresh does not approve/apply routes from this panel; Action Router remains a separate governed step.',
    },
  ]
}

function buildReviewBuckets(summary = {}) {
  const buckets = [
    {
      bucketId: 'proof-scope',
      label: 'Proof scope',
      count: count(summary.proofItemLimit),
      action: 'Keep this lane small; do not use the proof scope as evidence that the real corpus refreshed.',
    },
    {
      bucketId: 'real-corpus-refresh',
      label: 'Real-corpus refresh',
      count: count(summary.refreshItemLimit),
      action: 'Use this config when a model-backed synthesis refresh is explicitly approved.',
    },
  ]
  if (summary.scheduledRefreshJobPresent) {
    buckets.push({
      bucketId: 'scheduled-job',
      label: 'Scheduled refresh job',
      count: 1,
      action: 'Review latest status and next run; this panel does not start the job.',
    })
  }
  if (summary.scheduledRefreshLatestStatus === 'failed') {
    buckets.push({
      bucketId: 'refresh-failure',
      label: 'Refresh failure',
      count: 1,
      action: 'Repair the scheduled synthesis job separately before trusting new synthesis output.',
    })
  }
  return buckets.slice(0, 5)
}

function buildStuckSignals(summary = {}) {
  const signals = []
  if (!summary.refreshConfiguredForRealCorpus) {
    signals.push({
      signalId: 'refresh_scope_not_real_corpus',
      severity: 'blocked',
      detail: 'Scheduled refresh would still inherit the proof/demo scope.',
    })
  }
  if (!summary.scheduledRefreshJobPresent) {
    signals.push({
      signalId: 'scheduled_refresh_job_missing',
      severity: 'blocked',
      detail: 'Foundation job registry does not expose the synthesis refresh job.',
    })
  }
  if (summary.scheduledRefreshLatestStatus === 'failed') {
    signals.push({
      signalId: 'scheduled_refresh_latest_failed',
      severity: 'repair',
      detail: 'Latest scheduled synthesis refresh failed; keep action routing separate from this repair.',
    })
  }
  if (count(summary.refreshRunsStartedByReadback) !== 0) {
    signals.push({
      signalId: 'readback_started_refresh',
      severity: 'unsafe',
      detail: 'Readback must never start synthesis refresh.',
    })
  }
  return signals.slice(0, 5)
}

function buildPlainEnglish(summary = {}) {
  return `Synthesis proof and refresh are separated: proof is ${summary.proofScopeKey}/${count(summary.proofItemLimit)}, while scheduled refresh is ${summary.refreshScopeKey}/${count(summary.refreshItemLimit)}. This panel is read-only and starts ${count(summary.refreshRunsStartedByReadback)} refresh run(s), model call(s), or action-route proposal(s).`
}

export function buildDevHubSynthesisScopeReadback({
  generatedAt = new Date().toISOString(),
  foundationJobs = {},
} = {}) {
  const proofConfig = buildSynthesisEngineRunConfig({ refreshMode: false })
  const refreshConfig = buildSynthesisEngineRunConfig({ refreshMode: true })
  const proofValidation = validateSynthesisEngineRunConfig(proofConfig)
  const refreshValidation = validateSynthesisEngineRunConfig(refreshConfig)
  const synthesisRefreshJob = findSynthesisRefreshJob(foundationJobs, generatedAt)
  const proofAndRefreshSeparated = proofConfig.synthesisScopeKey !== refreshConfig.synthesisScopeKey &&
    Number(refreshConfig.itemLimit) > Number(proofConfig.itemLimit)
  const summary = {
    proofScopeKey: proofConfig.synthesisScopeKey,
    proofItemLimit: count(proofConfig.itemLimit),
    refreshScopeKey: refreshConfig.synthesisScopeKey,
    refreshItemLimit: count(refreshConfig.itemLimit),
    refreshSourceCount: list(refreshConfig.scheduledPromotionSourceIds).length,
    refreshConfiguredForRealCorpus: refreshConfig.synthesisScopeKey === SYNTHESIS_REFRESH_SCOPE_KEY &&
      refreshConfig.synthesisScopeKey !== SYNTHESIS_PROOF_SCOPE_KEY &&
      Number(refreshConfig.itemLimit) > Number(proofConfig.itemLimit),
    proofAndRefreshSeparated,
    scheduledRefreshJobPresent: Boolean(synthesisRefreshJob),
    scheduledRefreshJobStatus: synthesisRefreshJob?.status || 'missing',
    scheduledRefreshRuntimeMode: synthesisRefreshJob?.runtimeMode || '',
    scheduledRefreshLatestStatus: synthesisRefreshJob?.latestRunStatus || 'missing',
    scheduledRefreshLatestAt: synthesisRefreshJob?.latestRunAt || '',
    scheduledRefreshAgeHours: synthesisRefreshJob?.latestRunAgeHours ?? null,
    scheduledRefreshNextRunAt: synthesisRefreshJob?.nextRunAt || '',
    refreshRunsStartedByReadback: 0,
    modelOrProviderCallsStarted: 0,
    embeddingsStarted: 0,
    synthesisRowsWrittenByReadback: 0,
    actionRoutesProposedByReadback: 0,
    destinationWritesByReadback: 0,
    externalWritesByReadback: 0,
  }
  const failures = []
  if (!proofValidation.ok) failures.push(...proofValidation.failures.map(item => `proof:${item}`))
  if (!refreshValidation.ok) failures.push(...refreshValidation.failures.map(item => `refresh:${item}`))
  if (!summary.refreshConfiguredForRealCorpus) failures.push('refresh_scope_not_real_corpus')
  if (!summary.proofAndRefreshSeparated) failures.push('proof_and_refresh_not_separated')
  if (!summary.scheduledRefreshJobPresent) failures.push('scheduled_refresh_job_missing')
  if (summary.refreshRunsStartedByReadback !== 0) failures.push('readback_started_refresh')
  if (summary.modelOrProviderCallsStarted !== 0) failures.push('readback_started_model_call')
  if (summary.actionRoutesProposedByReadback !== 0) failures.push('readback_proposed_action_routes')

  const stuckSignals = buildStuckSignals(summary)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : stuckSignals.length ? 'needs_review' : 'healthy',
    contractVersion: DEV_HUB_SYNTHESIS_SCOPE_READBACK_CONTRACT_VERSION,
    cardId: DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID,
    closeoutKey: DEV_HUB_SYNTHESIS_SCOPE_READBACK_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt) || new Date().toISOString(),
    visibleHome: DEV_HUB_SYNTHESIS_SCOPE_READBACK_VISIBLE_HOME,
    source: {
      configOwner: 'buildSynthesisEngineRunConfig',
      foundationJobKey: SYNTHESIS_REFRESH_JOB_KEY,
      reusedTruthLayers: [
        'synthesis-refresh-real-corpus-scope',
        'foundationJobs',
      ],
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    configs: {
      proof: proofConfig,
      refresh: refreshConfig,
      proofValidation,
      refreshValidation,
    },
    synthesisRefreshJob,
    flowStages: buildFlowStages(summary),
    reviewBuckets: buildReviewBuckets(summary),
    stuckSignals,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubSynthesisScopeReadback(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['needs_review', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_SYNTHESIS_SCOPE_READBACK_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.configOwner !== 'buildSynthesisEngineRunConfig') failures.push('config_owner_missing')
  if (snapshot.source?.foundationJobKey !== SYNTHESIS_REFRESH_JOB_KEY) failures.push('foundation_job_key_missing')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  for (const layer of ['synthesis-refresh-real-corpus-scope', 'foundationJobs']) {
    if (!list(snapshot.source?.reusedTruthLayers).includes(layer)) failures.push(`truth_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'noRefreshRun', 'noSynthesisWrite', 'noActionRouteProposal', 'noActionRouteMutation', 'noBacklogMutation', 'noExternalWrites', 'noModelCalls', 'noEmbeddings']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  if (snapshot.summary?.proofScopeKey !== SYNTHESIS_PROOF_SCOPE_KEY) failures.push('proof_scope_mismatch')
  if (count(snapshot.summary?.proofItemLimit) !== SYNTHESIS_PROOF_ITEM_LIMIT) failures.push('proof_item_limit_mismatch')
  if (snapshot.summary?.refreshScopeKey !== SYNTHESIS_REFRESH_SCOPE_KEY) failures.push('refresh_scope_mismatch')
  if (count(snapshot.summary?.refreshItemLimit) !== SYNTHESIS_REFRESH_ITEM_LIMIT) failures.push('refresh_item_limit_mismatch')
  if (snapshot.summary?.refreshConfiguredForRealCorpus !== true) failures.push('refresh_scope_not_real_corpus')
  if (snapshot.summary?.proofAndRefreshSeparated !== true) failures.push('proof_and_refresh_not_separated')
  if (snapshot.summary?.scheduledRefreshJobPresent !== true) failures.push('scheduled_refresh_job_missing')
  if (count(snapshot.summary?.refreshRunsStartedByReadback) !== 0) failures.push('readback_started_refresh')
  if (count(snapshot.summary?.modelOrProviderCallsStarted) !== 0) failures.push('readback_started_model_call')
  if (count(snapshot.summary?.embeddingsStarted) !== 0) failures.push('readback_started_embeddings')
  if (count(snapshot.summary?.synthesisRowsWrittenByReadback) !== 0) failures.push('readback_wrote_synthesis_rows')
  if (count(snapshot.summary?.actionRoutesProposedByReadback) !== 0) failures.push('readback_proposed_action_routes')
  if (count(snapshot.summary?.destinationWritesByReadback) !== 0) failures.push('readback_wrote_destinations')
  if (count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('readback_external_write')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  if (list(snapshot.flowStages).length > 4 || !list(snapshot.flowStages).length) failures.push('flow_stages_missing_or_unbounded')
  if (list(snapshot.reviewBuckets).length > 5 || !list(snapshot.reviewBuckets).length) failures.push('review_buckets_missing_or_unbounded')
  if (snapshot.configs?.proofValidation?.ok !== true) failures.push('proof_config_not_valid')
  if (snapshot.configs?.refreshValidation?.ok !== true) failures.push('refresh_config_not_valid')
  if (snapshot.synthesisRefreshJob?.startsFromReadback !== false || snapshot.synthesisRefreshJob?.writesFromReadback !== false) failures.push('job_row_claims_readback_side_effect')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubSynthesisScopeReadbackDogfoodProof() {
  const snapshot = buildDevHubSynthesisScopeReadback({
    generatedAt: '2026-05-31T06:00:00.000Z',
    foundationJobs: {
      jobs: [
        {
          key: SYNTHESIS_REFRESH_JOB_KEY,
          title: 'Intelligence Spine Synthesis Refresh',
          lane: 'synthesis',
          status: 'live',
          runtimeMode: 'scheduled',
          nextRunAt: '2026-05-31T09:31:01.971Z',
          latestRun: {
            status: 'succeeded',
            startedAt: '2026-05-30T09:30:45.094Z',
            finishedAt: '2026-05-30T09:31:01.971Z',
          },
        },
      ],
    },
  })
  const existingDogfood = buildSynthesisRefreshRealCorpusScopeDogfoodProof()
  const validation = validateDevHubSynthesisScopeReadback(snapshot)
  const unsafeScope = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      refreshScopeKey: SYNTHESIS_PROOF_SCOPE_KEY,
      refreshItemLimit: SYNTHESIS_PROOF_ITEM_LIMIT,
      refreshConfiguredForRealCorpus: false,
      proofAndRefreshSeparated: false,
    },
  }
  const unsafeRun = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      refreshRunsStartedByReadback: 1,
      modelOrProviderCallsStarted: 1,
    },
  }
  const unsafeScopeValidation = validateDevHubSynthesisScopeReadback(unsafeScope)
  const unsafeRunValidation = validateDevHubSynthesisScopeReadback(unsafeRun)
  return {
    ok: existingDogfood.ok &&
      validation.ok &&
      snapshot.summary.proofScopeKey === SYNTHESIS_PROOF_SCOPE_KEY &&
      snapshot.summary.refreshScopeKey === SYNTHESIS_REFRESH_SCOPE_KEY &&
      snapshot.summary.refreshItemLimit > snapshot.summary.proofItemLimit &&
      snapshot.summary.scheduledRefreshJobPresent === true &&
      snapshot.summary.refreshRunsStartedByReadback === 0 &&
      unsafeScopeValidation.ok === false &&
      unsafeScopeValidation.failures.includes('refresh_scope_not_real_corpus') &&
      unsafeScopeValidation.failures.includes('proof_and_refresh_not_separated') &&
      unsafeRunValidation.ok === false &&
      unsafeRunValidation.failures.includes('readback_started_refresh') &&
      unsafeRunValidation.failures.includes('readback_started_model_call'),
    existingDogfood,
    validation,
    unsafeScopeValidation,
    unsafeRunValidation,
    snapshot,
    invariant: 'Synthesis Scope shows proof vs real-corpus refresh config, proves the scheduled job is visible, and rejects demo-scope regression or readback-started refresh/model work.',
  }
}
