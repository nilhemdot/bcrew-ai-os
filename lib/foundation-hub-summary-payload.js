export const FOUNDATION_HUB_PAYLOAD_EXTRACT_CARD_ID = 'FOUNDATION-HUB-PAYLOAD-EXTRACT-001'
export const FOUNDATION_HUB_DEFAULT_PAYLOAD_WARNING_BYTES = 800_000
export const FOUNDATION_HUB_CRITICAL_JOB_RUN_KEYS = [
  'llm-auth-audit',
]

function compactCommand(command = {}) {
  if (!command || typeof command !== 'object') return null
  return {
    command: command.command || null,
    args: Array.isArray(command.args) ? command.args.slice(0, 8) : [],
  }
}

function truncateText(value, maxLength = 240) {
  const text = String(value || '')
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

export function compactFoundationJobRun(run = {}) {
  if (!run || typeof run !== 'object') return null
  return {
    runId: run.runId || null,
    jobKey: run.jobKey || null,
    title: run.title || null,
    jobType: run.jobType || null,
    status: run.status || null,
    command: compactCommand(run.command),
    requestedBy: run.requestedBy || null,
    startedAt: run.startedAt || null,
    finishedAt: run.finishedAt || null,
    durationMs: run.durationMs ?? null,
    exitCode: run.exitCode ?? null,
    signal: run.signal || null,
    errorMessage: truncateText(run.errorMessage, 240) || null,
    createdAt: run.createdAt || null,
    updatedAt: run.updatedAt || null,
  }
}

export function compactFoundationJob(job = {}) {
  if (!job || typeof job !== 'object') return null
  return {
    key: job.key || null,
    title: job.title || null,
    jobType: job.jobType || null,
    lane: job.lane || null,
    priority: job.priority || null,
    cadence: job.cadence || null,
    enabled: job.enabled === true,
    runtimeMode: job.runtimeMode || null,
    scheduleEveryMinutes: job.scheduleEveryMinutes ?? null,
    maxRuntimeSeconds: job.maxRuntimeSeconds ?? null,
    budget: job.budget || null,
    sourceIds: Array.isArray(job.sourceIds) ? job.sourceIds : [],
    mutationPosture: job.mutationPosture || null,
    mutationAllowlist: job.mutationAllowlist
      ? {
          ok: job.mutationAllowlist.ok === true,
          status: job.mutationAllowlist.status || null,
          decision: job.mutationAllowlist.decision || null,
          plainEnglish: job.mutationAllowlist.plainEnglish || null,
        }
      : null,
    processCheck: job.processCheck || null,
    servesHubs: Array.isArray(job.servesHubs) ? job.servesHubs : [],
    status: job.status || null,
    statusDetail: truncateText(job.statusDetail, 240) || null,
    scheduleStatus: job.scheduleStatus || null,
    scheduleDetail: job.scheduleDetail || null,
    due: job.due === true,
    nextRunAt: job.nextRunAt || null,
    latestRun: compactFoundationJobRun(job.latestRun),
    scheduleMutationGuard: job.scheduleMutationGuard
      ? {
          ok: job.scheduleMutationGuard.ok === true,
          mutationPosture: job.scheduleMutationGuard.mutationPosture || null,
          reason: job.scheduleMutationGuard.reason || null,
        }
      : null,
  }
}

export function compactFoundationJobRunSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot
  const rawLatestRuns = Array.isArray(snapshot.latestRuns) ? snapshot.latestRuns : []
  const rawJobs = Array.isArray(snapshot.jobs) ? snapshot.jobs : []
  const selectedLatestRuns = [...rawLatestRuns.slice(0, 5)]
  for (const jobKey of FOUNDATION_HUB_CRITICAL_JOB_RUN_KEYS) {
    const criticalRun =
      rawLatestRuns.find(run => run?.jobKey === jobKey) ||
      rawJobs.find(job => job?.key === jobKey)?.latestRun ||
      null
    if (criticalRun && !selectedLatestRuns.some(run => run?.runId === criticalRun.runId)) {
      selectedLatestRuns.push(criticalRun)
    }
  }
  return {
    generatedAt: snapshot.generatedAt || null,
    totalJobs: snapshot.totalJobs ?? 0,
    enabledJobs: snapshot.enabledJobs ?? 0,
    scheduledJobs: snapshot.scheduledJobs ?? 0,
    dueJobs: snapshot.dueJobs ?? 0,
    manualJobs: snapshot.manualJobs ?? 0,
    jobs: Array.isArray(snapshot.jobs) ? snapshot.jobs.map(compactFoundationJob).filter(Boolean) : [],
    latestRuns: selectedLatestRuns.map(compactFoundationJobRun).filter(Boolean),
    fullPayloadCompacted: true,
    compactedByCardId: FOUNDATION_HUB_PAYLOAD_EXTRACT_CARD_ID,
  }
}

export function compactResearchCurationSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot
  return {
    ...snapshot,
    cards: Array.isArray(snapshot.cards)
      ? snapshot.cards.slice(0, 8).map(card => ({
          id: card.id || null,
          title: card.title || null,
          curationState: card.curationState || null,
          subTag: card.subTag || null,
          plainEnglish: truncateText(card.plainEnglish, 160) || null,
        }))
      : [],
    fullPayloadCompacted: true,
    compactedByCardId: FOUNDATION_HUB_PAYLOAD_EXTRACT_CARD_ID,
  }
}

export function compactFoundationReviewSprintSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot
  return {
    status: snapshot.status || null,
    visibleHome: snapshot.visibleHome || null,
    closeoutKey: snapshot.closeoutKey || null,
    artifactPath: snapshot.artifactPath || null,
    summary: snapshot.summary || {},
    wrapperCards: Array.isArray(snapshot.wrapperCards) ? snapshot.wrapperCards : [],
    phaseGReadiness: snapshot.phaseGReadiness || null,
    findings: Array.isArray(snapshot.findings) ? snapshot.findings.slice(0, 8) : [],
    knownLimits: Array.isArray(snapshot.knownLimits) ? snapshot.knownLimits : [],
    fullPayloadCompacted: true,
    compactedByCardId: FOUNDATION_HUB_PAYLOAD_EXTRACT_CARD_ID,
  }
}

export function evaluateFoundationHubPayloadBudget({
  bytes = 0,
  budgetBytes = FOUNDATION_HUB_DEFAULT_PAYLOAD_WARNING_BYTES,
} = {}) {
  const normalizedBytes = Number(bytes) || 0
  const normalizedBudget = Number(budgetBytes) || FOUNDATION_HUB_DEFAULT_PAYLOAD_WARNING_BYTES
  return {
    ok: normalizedBytes > 0 && normalizedBytes < normalizedBudget,
    bytes: normalizedBytes,
    budgetBytes: normalizedBudget,
    overByBytes: Math.max(0, normalizedBytes - normalizedBudget),
  }
}

export function buildFoundationHubPayloadDogfoodProof() {
  const passing = evaluateFoundationHubPayloadBudget({ bytes: 720_000 })
  const failing = evaluateFoundationHubPayloadBudget({ bytes: 872_726 })
  return {
    ok: passing.ok === true && failing.ok === false,
    passing,
    failing,
    invariant: 'The payload budget checker rejects the old over-budget Foundation Hub payload and accepts a compact under-budget payload.',
  }
}
