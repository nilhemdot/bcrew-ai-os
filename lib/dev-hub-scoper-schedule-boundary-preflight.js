export const DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID = 'DEV-HUB-SCOPER-SCHEDULE-BOUNDARY-PREFLIGHT-001'
export const DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY = 'dev-hub-scoper-schedule-boundary-preflight-v1'
export const DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_PLAN_PATH = 'docs/process/dev-hub-scoper-schedule-boundary-preflight-001-plan.md'
export const DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-SCOPER-SCHEDULE-BOUNDARY-PREFLIGHT-001.json'
export const DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_SCRIPT_PATH = 'scripts/process-dev-hub-scoper-schedule-boundary-preflight-check.mjs'
export const DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CONTRACT_VERSION = 'dev-hub-scoper-schedule-boundary-preflight.v1'
export const DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_VISIBLE_HOME = 'Dev Hub > Data Pool > Scoper Schedule Boundary'

const PROPOSED_SCOPER_JOB_KEY = 'dev-build-scoper-evidence-trace-readonly'
const PROPOSED_SCOPER_COMMAND = 'npm run process:dev-build-scoper-evidence-trace-check -- --json --limit=5'

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

function truncate(value, maxChars = 190) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function buildBoundaries() {
  return {
    readOnly: true,
    preflightOnly: true,
    approvalRequiredBeforeSchedule: true,
    noScheduleMutation: true,
    noJobRegistryWrite: true,
    noScoperRun: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noBacklogMutation: true,
    noRouteMutation: true,
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

function findScoperRepairProposal(nextRepairQueue = {}) {
  return list(nextRepairQueue.proposedRepairs)
    .find(item => item.repairId === 'scoper-runtime-schedule-boundary') || null
}

function buildScheduleProposal({ scoperRuntimeReadback = {}, nextRepairQueue = {} } = {}) {
  const runtimeSummary = scoperRuntimeReadback.summary || {}
  const repairProposal = findScoperRepairProposal(nextRepairQueue)
  if (runtimeSummary.scheduledScoperJobPresent === true) return null
  if (!repairProposal && count(runtimeSummary.readyForPortfolioCount) <= 0) return null

  return {
    proposalId: 'scoper-schedule-boundary-readonly-v1',
    proposedJobKey: PROPOSED_SCOPER_JOB_KEY,
    title: 'Dev Build Scoper Evidence Trace Read-Only',
    status: 'approval_required',
    approvalRequired: true,
    mutationPosture: 'read_only',
    runtimeMode: 'scheduled_proposed',
    cadence: 'daily after synthesis refresh and Director report refresh',
    command: PROPOSED_SCOPER_COMMAND,
    sourceInputs: [
      'DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID',
      'scoperEvidenceTraceReadback',
      'foundationJobs.jobs',
    ],
    proposedDone: 'A scheduled read-only Scoper proof reports ready/parked candidates without creating Scoper, Portfolio, backlog, route, Harlan, model, extraction, or external writes.',
    approvalText: 'Approve only the read-only scheduled job registration for this exact command. Any job that writes Scoper/backlog/Portfolio records, runs providers, applies routes, sends Harlan, or promotes builds needs a separate approval.',
    operatorBoundary: 'This preflight prepares the schedule contract only. It does not add the job to the registry, schedule it, run it, or promote candidates.',
    currentSignal: truncate(repairProposal?.problem || scoperRuntimeReadback.plainEnglish || 'Scoper schedule is missing while candidates are ready for review.', 220),
    readyForPortfolioCount: count(runtimeSummary.readyForPortfolioCount),
    parkedCount: count(runtimeSummary.parkedCount),
    scheduledNow: false,
    jobRegisteredNow: false,
    scoperRunStartedNow: false,
    scoperRecordsWrittenNow: false,
    portfolioRecordsWrittenNow: false,
    backlogRecordsWrittenNow: false,
    routeMutatedNow: false,
    harlanSentNow: false,
    externalWriteNow: false,
  }
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.proposedScheduleCount) > 0) {
    return `${count(summary.proposedScheduleCount)} read-only Scoper schedule contract is ready for Steve approval. Nothing was scheduled or promoted.`
  }
  if (summary.scheduledScoperJobPresent === true) {
    return 'A Scoper runtime job is already visible; no new schedule proposal is prepared by this preflight.'
  }
  return 'No Scoper schedule proposal is ready from the current runtime readback.'
}

export function buildDevHubScoperScheduleBoundaryPreflight({
  generatedAt = new Date().toISOString(),
  scoperRuntimeReadback = {},
  nextRepairQueue = {},
} = {}) {
  const proposal = buildScheduleProposal({ scoperRuntimeReadback, nextRepairQueue })
  const proposedSchedules = proposal ? [proposal] : []
  const runtimeSummary = scoperRuntimeReadback.summary || {}
  const summary = {
    scheduledScoperJobPresent: runtimeSummary.scheduledScoperJobPresent === true,
    existingScoperJobCount: count(runtimeSummary.scoperJobCount),
    readyForPortfolioCount: count(runtimeSummary.readyForPortfolioCount),
    parkedCount: count(runtimeSummary.parkedCount),
    proposedScheduleCount: proposedSchedules.length,
    approvalRequiredCount: proposedSchedules.filter(item => item.approvalRequired).length,
    readOnlyScheduleProposalCount: proposedSchedules.filter(item => item.mutationPosture === 'read_only').length,
    scheduleMutationsByReadback: 0,
    jobRegistryWritesByReadback: 0,
    scoperRunsStartedByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsWrittenByReadback: 0,
    backlogRecordsWrittenByReadback: 0,
    routeMutationsByReadback: 0,
    approvalRecordsWrittenByReadback: 0,
    modelCallsStarted: 0,
    extractionRunsStarted: 0,
    harlanSendsByReadback: 0,
    externalWritesByReadback: 0,
  }

  const failures = []
  if (scoperRuntimeReadback.ok !== true) failures.push('scoper_runtime_not_healthy')
  if (nextRepairQueue.ok !== true) failures.push('next_repair_queue_not_healthy')
  if (proposedSchedules.some(item => item.status !== 'approval_required' || item.approvalRequired !== true)) failures.push('schedule_not_approval_required')
  if (proposedSchedules.some(item => item.mutationPosture !== 'read_only')) failures.push('schedule_not_read_only')
  if (proposedSchedules.some(item => item.scheduledNow || item.jobRegisteredNow || item.scoperRunStartedNow)) failures.push('schedule_or_run_started_by_readback')
  if (proposedSchedules.some(item => item.scoperRecordsWrittenNow || item.portfolioRecordsWrittenNow || item.backlogRecordsWrittenNow || item.routeMutatedNow)) failures.push('destination_mutated_by_readback')
  if (proposedSchedules.some(item => item.harlanSentNow || item.externalWriteNow)) failures.push('external_write_by_readback')
  if (summary.scheduleMutationsByReadback !== 0 || summary.jobRegistryWritesByReadback !== 0) failures.push('schedule_mutated_by_readback')
  if (summary.scoperRunsStartedByReadback !== 0) failures.push('scoper_run_started_by_readback')
  if (summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.routeMutationsByReadback !== 0 || summary.approvalRecordsWrittenByReadback !== 0) failures.push('route_or_approval_mutated_by_readback')
  if (summary.modelCallsStarted !== 0 || summary.extractionRunsStarted !== 0) failures.push('runtime_started_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length
      ? 'fail_closed'
      : proposedSchedules.length
        ? 'approval_ready'
        : summary.scheduledScoperJobPresent ? 'already_scheduled' : 'no_schedule_proposal',
    contractVersion: DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CONTRACT_VERSION,
    cardId: DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID,
    closeoutKey: DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_VISIBLE_HOME,
    source: {
      reusedTruthLayers: ['scoperRuntimeReadback', 'nextRepairQueue'],
      targetRepairId: 'scoper-runtime-schedule-boundary',
      proposedJobKey: PROPOSED_SCOPER_JOB_KEY,
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    proposedSchedules,
    approvalPacket: proposedSchedules[0] ? {
      proposedJobKey: proposedSchedules[0].proposedJobKey,
      command: proposedSchedules[0].command,
      mutationPosture: proposedSchedules[0].mutationPosture,
      approvalText: proposedSchedules[0].approvalText,
    } : null,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubScoperScheduleBoundaryPreflight(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['approval_ready', 'already_scheduled', 'no_schedule_proposal'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  if (!list(snapshot.source?.reusedTruthLayers).includes('scoperRuntimeReadback')) failures.push('source_layer_missing:scoperRuntimeReadback')
  if (!list(snapshot.source?.reusedTruthLayers).includes('nextRepairQueue')) failures.push('source_layer_missing:nextRepairQueue')
  if (snapshot.source?.proposedJobKey !== PROPOSED_SCOPER_JOB_KEY) failures.push('proposed_job_key_mismatch')
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'preflightOnly', 'approvalRequiredBeforeSchedule', 'noScheduleMutation', 'noJobRegistryWrite', 'noScoperRun', 'noScoperMutation', 'noPortfolioMutation', 'noBacklogMutation', 'noRouteMutation', 'noAutoScoperPromotion', 'noModelCalls', 'noLiveExtraction', 'noHarlanSend', 'noExternalWrites']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const schedules = list(snapshot.proposedSchedules)
  if (schedules.length > 1) failures.push('schedules_unbounded')
  if (count(snapshot.summary?.proposedScheduleCount) !== schedules.length) failures.push('schedule_count_mismatch')
  for (const item of schedules) {
    if (item.status !== 'approval_required' || item.approvalRequired !== true) failures.push('schedule_not_approval_required')
    if (item.proposedJobKey !== PROPOSED_SCOPER_JOB_KEY) failures.push('schedule_job_key_mismatch')
    if (item.command !== PROPOSED_SCOPER_COMMAND) failures.push('schedule_command_mismatch')
    if (item.mutationPosture !== 'read_only') failures.push('schedule_not_read_only')
    if (item.scheduledNow || item.jobRegisteredNow || item.scoperRunStartedNow) failures.push('schedule_or_run_started_by_readback')
    if (item.scoperRecordsWrittenNow || item.portfolioRecordsWrittenNow || item.backlogRecordsWrittenNow || item.routeMutatedNow) failures.push('destination_mutated_by_readback')
    if (item.harlanSentNow || item.externalWriteNow) failures.push('external_write_by_readback')
  }
  if (count(snapshot.summary?.scheduleMutationsByReadback) !== 0 || count(snapshot.summary?.jobRegistryWritesByReadback) !== 0) failures.push('schedule_mutated_by_readback')
  if (count(snapshot.summary?.scoperRunsStartedByReadback) !== 0) failures.push('scoper_run_started_by_readback')
  if (count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0) failures.push('destination_records_written_by_readback')
  if (count(snapshot.summary?.routeMutationsByReadback) !== 0 || count(snapshot.summary?.approvalRecordsWrittenByReadback) !== 0) failures.push('route_or_approval_mutated_by_readback')
  if (count(snapshot.summary?.modelCallsStarted) !== 0 || count(snapshot.summary?.extractionRunsStarted) !== 0) failures.push('runtime_started_by_readback')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0 || count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('external_write_by_readback')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubScoperScheduleBoundaryPreflightDogfoodProof() {
  const missingSchedule = buildDevHubScoperScheduleBoundaryPreflight({
    scoperRuntimeReadback: {
      ok: true,
      status: 'missing_schedule',
      summary: {
        scoperJobCount: 0,
        scheduledScoperJobPresent: false,
        readyForPortfolioCount: 2,
        parkedCount: 1,
      },
      plainEnglish: 'No Scoper runtime job is visible; 2 candidates are ready.',
    },
    nextRepairQueue: {
      ok: true,
      proposedRepairs: [{
        repairId: 'scoper-runtime-schedule-boundary',
        problem: '0 scheduled Scoper jobs are visible while 2 candidates are ready.',
      }],
    },
  })
  const scheduledVisible = buildDevHubScoperScheduleBoundaryPreflight({
    scoperRuntimeReadback: {
      ok: true,
      status: 'scheduled_visible',
      summary: {
        scoperJobCount: 1,
        scheduledScoperJobPresent: true,
        readyForPortfolioCount: 2,
        parkedCount: 0,
      },
    },
    nextRepairQueue: { ok: true, proposedRepairs: [] },
  })
  const mutated = {
    ...missingSchedule,
    summary: {
      ...missingSchedule.summary,
      scheduleMutationsByReadback: 1,
    },
    proposedSchedules: list(missingSchedule.proposedSchedules).map(item => ({
      ...item,
      scheduledNow: true,
    })),
  }
  const missingValidation = validateDevHubScoperScheduleBoundaryPreflight(missingSchedule)
  const scheduledValidation = validateDevHubScoperScheduleBoundaryPreflight(scheduledVisible)
  const mutatedValidation = validateDevHubScoperScheduleBoundaryPreflight(mutated)
  return {
    ok: missingSchedule.status === 'approval_ready' &&
      missingValidation.ok === true &&
      scheduledVisible.status === 'already_scheduled' &&
      scheduledValidation.ok === true &&
      mutatedValidation.ok === false &&
      mutatedValidation.failures.includes('schedule_or_run_started_by_readback'),
    invariant: 'Scoper Schedule Boundary preflight proposes one read-only approval-required schedule contract and rejects schedule/run mutation.',
    missingSchedule,
    scheduledVisible,
    mutatedFailures: mutatedValidation.failures,
  }
}
