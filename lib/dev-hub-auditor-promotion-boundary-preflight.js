export const DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID = 'DEV-HUB-AUDITOR-PROMOTION-BOUNDARY-PREFLIGHT-001'
export const DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY = 'dev-hub-auditor-promotion-boundary-preflight-v1'
export const DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_PLAN_PATH = 'docs/process/dev-hub-auditor-promotion-boundary-preflight-001-plan.md'
export const DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-AUDITOR-PROMOTION-BOUNDARY-PREFLIGHT-001.json'
export const DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_SCRIPT_PATH = 'scripts/process-dev-hub-auditor-promotion-boundary-preflight-check.mjs'
export const DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CONTRACT_VERSION = 'dev-hub-auditor-promotion-boundary-preflight.v1'
export const DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_VISIBLE_HOME = 'Dev Hub > Data Pool > Auditor Promotion Boundary'

const TARGET_REPAIR_ID = 'auditor-report-to-work-boundary'
const EXISTING_ROUTER_CARD_ID = 'AUDIT-FINDING-TO-BACKLOG-ROUTER-001'
const PROPOSED_GATE_ID = 'auditor-report-to-work-approval-gate-v1'

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
    approvalRequiredBeforeInternalWrite: true,
    noAuditRun: true,
    noReportWrite: true,
    noBacklogMutationNow: true,
    noRouteMutationNow: true,
    noRouteApply: true,
    noScoperMutationNow: true,
    noPortfolioMutationNow: true,
    noCurrentSprintMutationNow: true,
    noApprovalRecordWriteNow: true,
    noHarlanSend: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noExternalWrites: true,
    noAutoFindingPromotion: true,
    noAutoBacklogPromotion: true,
    noAutoScoperPromotion: true,
  }
}

function findAuditorRepairProposal(nextRepairQueue = {}) {
  return list(nextRepairQueue.proposedRepairs)
    .find(item => item.repairId === TARGET_REPAIR_ID) || null
}

function outputLaneCount(auditorFlowReadback = {}) {
  const summary = auditorFlowReadback.summary || {}
  return count(summary.reportOnlyJobs) + count(summary.readOnlyJobs)
}

function compactAuditorLane(job = {}) {
  return {
    key: text(job.key),
    title: truncate(job.title || job.key || 'Auditor job', 120),
    runtimeMode: text(job.runtimeMode || 'unknown'),
    latestRunStatus: text(job.latestRunStatus || 'unknown'),
    outputChannel: text(job.outputChannel || 'unknown'),
    outputLandsIn: truncate(job.outputLandsIn || 'Output destination not classified.', 190),
    eligibleAsInputLater: ['report_artifact_only', 'read_only_check_only'].includes(text(job.outputChannel)),
    promotedNow: false,
    backlogWrittenNow: false,
    routeMutatedNow: false,
    scoperWrittenNow: false,
    externalWriteNow: false,
  }
}

function buildPromotionContract({ auditorFlowReadback = {}, nextRepairQueue = {} } = {}) {
  const summary = auditorFlowReadback.summary || {}
  const repairProposal = findAuditorRepairProposal(nextRepairQueue)
  const reportOnlyOutputCount = outputLaneCount(auditorFlowReadback)
  if (!repairProposal && reportOnlyOutputCount <= 0) return null

  const inputLanes = list(auditorFlowReadback.auditorJobs)
    .filter(job => ['report_artifact_only', 'read_only_check_only'].includes(text(job.outputChannel)))
    .map(compactAuditorLane)
    .slice(0, 5)

  return {
    gateId: PROPOSED_GATE_ID,
    title: 'Audit Finding Promotion Approval Gate',
    status: 'approval_required',
    approvalRequired: true,
    mutationPosture: 'approval_required_internal_write_later',
    existingRouterCardId: EXISTING_ROUTER_CARD_ID,
    targetRepairId: TARGET_REPAIR_ID,
    suggestedCardType: repairProposal?.suggestedCardType || 'promotion-boundary',
    effort: repairProposal?.effort || 'M',
    risk: repairProposal?.risk || 'medium',
    currentSignal: truncate(repairProposal?.problem || auditorFlowReadback.plainEnglish || 'Auditor output is report/read-only and needs an explicit promotion boundary.', 230),
    allowedInputsLater: [
      'Latest governed audit/report artifacts from visible auditor jobs',
      'Live backlog_items rows for existing-card routing',
      'Explicit stale, approval-required, and watch-only classifications',
    ],
    allowedWritesLaterOnlyAfterApproval: [
      'Create or update scoped backlog cards for actionable audit findings',
      'Record change_events for those scoped backlog/card classifications',
      'Record proof metadata for the approved promotion card',
    ],
    forbiddenWrites: [
      'No audit runs or report writes',
      'No route approve/apply/reject/snooze/reroute',
      'No Scoper, Portfolio, Current Sprint, source, atom, fact, synthesis, Harlan, model, extraction, or external writes',
      'No implementation of the findings inside the promotion gate',
    ],
    approvalText: 'Approve a separate audit-finding promotion card only after it lists the exact source report artifacts, candidate finding IDs/card IDs, stale/approval/watch classifications, and focused proof. This preflight is not approval to write.',
    operatorBoundary: 'This preflight prepares the mutation boundary only. It does not run auditors, write reports, create cards, mutate routes, send Harlan, or promote findings.',
    reportOnlyOutputCount,
    auditorJobCount: count(summary.auditorJobCount),
    scheduledAuditorJobs: count(summary.scheduledAuditorJobs),
    waitingRouteReviewItems: count(summary.waitingRouteReviewItems),
    hygieneCleanupPressure: count(summary.hygieneCleanupPressure),
    autoFindingPromotionCount: count(summary.autoFindingPromotionCount),
    inputLanes,
    promotedNow: false,
    backlogRecordsWrittenNow: false,
    routeMutatedNow: false,
    scoperRecordsWrittenNow: false,
    portfolioRecordsWrittenNow: false,
    currentSprintMutatedNow: false,
    approvalRecordsWrittenNow: false,
    auditRunsStartedNow: false,
    reportsWrittenNow: false,
    harlanSentNow: false,
    externalWriteNow: false,
  }
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.promotionContractCount) > 0) {
    return `${count(summary.promotionContractCount)} audit-finding promotion boundary is ready for Steve approval. Nothing was promoted, created, routed, run, sent, or written.`
  }
  return 'No audit-finding promotion boundary is ready from the current auditor and next-repair readbacks.'
}

export function buildDevHubAuditorPromotionBoundaryPreflight({
  generatedAt = new Date().toISOString(),
  auditorFlowReadback = {},
  nextRepairQueue = {},
} = {}) {
  const promotionContract = buildPromotionContract({ auditorFlowReadback, nextRepairQueue })
  const promotionContracts = promotionContract ? [promotionContract] : []
  const auditorSummary = auditorFlowReadback.summary || {}
  const queueSummary = nextRepairQueue.summary || {}
  const summary = {
    auditorJobCount: count(auditorSummary.auditorJobCount),
    scheduledAuditorJobs: count(auditorSummary.scheduledAuditorJobs),
    reportOnlyOutputLanes: outputLaneCount(auditorFlowReadback),
    autoFindingPromotionCount: count(auditorSummary.autoFindingPromotionCount),
    waitingRouteReviewItems: count(auditorSummary.waitingRouteReviewItems),
    hygieneCleanupPressure: count(auditorSummary.hygieneCleanupPressure),
    nextRepairPromotionBoundaryCount: count(queueSummary.promotionBoundaryCount),
    promotionContractCount: promotionContracts.length,
    approvalRequiredCount: promotionContracts.filter(item => item.approvalRequired).length,
    internalWriteRequiredLaterCount: promotionContracts.filter(item => item.mutationPosture === 'approval_required_internal_write_later').length,
    auditRunsStartedByReadback: 0,
    reportsWrittenByReadback: 0,
    findingsPromotedByReadback: 0,
    backlogRecordsWrittenByReadback: 0,
    routeMutationsByReadback: 0,
    routeAppliesByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsWrittenByReadback: 0,
    currentSprintMutationsByReadback: 0,
    approvalRecordsWrittenByReadback: 0,
    modelCallsStarted: 0,
    extractionRunsStarted: 0,
    harlanSendsByReadback: 0,
    externalWritesByReadback: 0,
  }

  const failures = []
  if (auditorFlowReadback.ok !== true) failures.push('auditor_flow_not_healthy')
  if (nextRepairQueue.ok !== true) failures.push('next_repair_queue_not_healthy')
  if (promotionContracts.some(item => item.status !== 'approval_required' || item.approvalRequired !== true)) failures.push('promotion_contract_not_approval_required')
  if (promotionContracts.some(item => item.mutationPosture !== 'approval_required_internal_write_later')) failures.push('promotion_contract_not_approval_bound')
  if (promotionContracts.some(item => item.promotedNow || item.backlogRecordsWrittenNow || item.routeMutatedNow || item.scoperRecordsWrittenNow || item.portfolioRecordsWrittenNow)) failures.push('promotion_mutated_by_readback')
  if (promotionContracts.some(item => item.currentSprintMutatedNow || item.approvalRecordsWrittenNow || item.auditRunsStartedNow || item.reportsWrittenNow)) failures.push('promotion_runtime_or_control_mutated_by_readback')
  if (promotionContracts.some(item => item.harlanSentNow || item.externalWriteNow)) failures.push('external_write_by_readback')
  if (summary.auditRunsStartedByReadback !== 0 || summary.reportsWrittenByReadback !== 0) failures.push('audit_runtime_started_by_readback')
  if (summary.findingsPromotedByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0) failures.push('backlog_or_finding_promoted_by_readback')
  if (summary.routeMutationsByReadback !== 0 || summary.routeAppliesByReadback !== 0) failures.push('route_mutated_by_readback')
  if (summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.currentSprintMutationsByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.approvalRecordsWrittenByReadback !== 0) failures.push('approval_records_written_by_readback')
  if (summary.modelCallsStarted !== 0 || summary.extractionRunsStarted !== 0) failures.push('runtime_started_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length
      ? 'fail_closed'
      : promotionContracts.length ? 'approval_ready' : 'no_promotion_contract',
    contractVersion: DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CONTRACT_VERSION,
    cardId: DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID,
    closeoutKey: DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_VISIBLE_HOME,
    source: {
      reusedTruthLayers: ['auditorFlowReadback', 'nextRepairQueue'],
      targetRepairId: TARGET_REPAIR_ID,
      existingRouterCardId: EXISTING_ROUTER_CARD_ID,
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    promotionContracts,
    approvalPacket: promotionContracts[0] ? {
      gateId: promotionContracts[0].gateId,
      mutationPosture: promotionContracts[0].mutationPosture,
      approvalText: promotionContracts[0].approvalText,
      forbiddenWrites: promotionContracts[0].forbiddenWrites,
    } : null,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubAuditorPromotionBoundaryPreflight(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['approval_ready', 'no_promotion_contract'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.targetRepairId !== TARGET_REPAIR_ID) failures.push('target_repair_id_mismatch')
  if (snapshot.source?.existingRouterCardId !== EXISTING_ROUTER_CARD_ID) failures.push('existing_router_card_missing')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  for (const layer of ['auditorFlowReadback', 'nextRepairQueue']) {
    if (!list(snapshot.source?.reusedTruthLayers).includes(layer)) failures.push(`source_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'preflightOnly', 'approvalRequiredBeforeInternalWrite', 'noAuditRun', 'noReportWrite', 'noBacklogMutationNow', 'noRouteMutationNow', 'noRouteApply', 'noScoperMutationNow', 'noPortfolioMutationNow', 'noCurrentSprintMutationNow', 'noHarlanSend', 'noExternalWrites', 'noAutoFindingPromotion', 'noAutoBacklogPromotion']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const contracts = list(snapshot.promotionContracts)
  if (contracts.length > 1) failures.push('promotion_contracts_unbounded')
  if (count(snapshot.summary?.promotionContractCount) !== contracts.length) failures.push('promotion_contract_count_mismatch')
  for (const item of contracts) {
    if (item.gateId !== PROPOSED_GATE_ID) failures.push('gate_id_mismatch')
    if (item.status !== 'approval_required' || item.approvalRequired !== true) failures.push('promotion_contract_not_approval_required')
    if (item.mutationPosture !== 'approval_required_internal_write_later') failures.push('promotion_contract_not_approval_bound')
    if (item.existingRouterCardId !== EXISTING_ROUTER_CARD_ID) failures.push('contract_existing_router_missing')
    if (item.targetRepairId !== TARGET_REPAIR_ID) failures.push('contract_target_repair_missing')
    if (!text(item.approvalText) || !text(item.operatorBoundary)) failures.push('approval_context_missing')
    if (list(item.inputLanes).length > 5) failures.push('input_lanes_unbounded')
    if (item.promotedNow || item.backlogRecordsWrittenNow || item.routeMutatedNow || item.scoperRecordsWrittenNow || item.portfolioRecordsWrittenNow) failures.push('promotion_mutated_by_readback')
    if (item.currentSprintMutatedNow || item.approvalRecordsWrittenNow || item.auditRunsStartedNow || item.reportsWrittenNow) failures.push('promotion_runtime_or_control_mutated_by_readback')
    if (item.harlanSentNow || item.externalWriteNow) failures.push('external_write_by_readback')
  }
  if (count(snapshot.summary?.autoFindingPromotionCount) !== 0) failures.push('auto_finding_promotion_not_zero')
  if (count(snapshot.summary?.auditRunsStartedByReadback) !== 0 || count(snapshot.summary?.reportsWrittenByReadback) !== 0) failures.push('audit_runtime_started_by_readback')
  if (count(snapshot.summary?.findingsPromotedByReadback) !== 0 || count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0) failures.push('backlog_or_finding_promoted_by_readback')
  if (count(snapshot.summary?.routeMutationsByReadback) !== 0 || count(snapshot.summary?.routeAppliesByReadback) !== 0) failures.push('route_mutated_by_readback')
  if (count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.currentSprintMutationsByReadback) !== 0) failures.push('destination_records_written_by_readback')
  if (count(snapshot.summary?.approvalRecordsWrittenByReadback) !== 0) failures.push('approval_records_written_by_readback')
  if (count(snapshot.summary?.modelCallsStarted) !== 0 || count(snapshot.summary?.extractionRunsStarted) !== 0) failures.push('runtime_started_by_readback')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0 || count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('external_write_by_readback')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubAuditorPromotionBoundaryPreflightDogfoodProof() {
  const ready = buildDevHubAuditorPromotionBoundaryPreflight({
    generatedAt: '2026-05-31T07:15:00.000Z',
    auditorFlowReadback: {
      ok: true,
      plainEnglish: 'Auditors are report-only.',
      summary: {
        auditorJobCount: 3,
        scheduledAuditorJobs: 2,
        reportOnlyJobs: 2,
        readOnlyJobs: 1,
        autoFindingPromotionCount: 0,
        waitingRouteReviewItems: 5,
        hygieneCleanupPressure: 8,
      },
      auditorJobs: [
        { key: 'nightly-deep-audit', title: 'Nightly Deep Audit', runtimeMode: 'scheduled', latestRunStatus: 'succeeded', outputChannel: 'report_artifact_only', outputLandsIn: 'Report artifact only.' },
        { key: 'llm-auth-audit', title: 'LLM Auth Audit', runtimeMode: 'scheduled', latestRunStatus: 'succeeded', outputChannel: 'read_only_check_only', outputLandsIn: 'Check status only.' },
      ],
    },
    nextRepairQueue: {
      ok: true,
      summary: { promotionBoundaryCount: 1 },
      proposedRepairs: [{
        repairId: TARGET_REPAIR_ID,
        problem: '3 auditor output lanes are report/read-only; 0 findings auto-promote today.',
        suggestedCardType: 'promotion-boundary',
        effort: 'M',
        risk: 'medium',
      }],
    },
  })
  const noContract = buildDevHubAuditorPromotionBoundaryPreflight({
    auditorFlowReadback: {
      ok: true,
      summary: { auditorJobCount: 1, reportOnlyJobs: 0, readOnlyJobs: 0, autoFindingPromotionCount: 0 },
      auditorJobs: [],
    },
    nextRepairQueue: { ok: true, summary: { promotionBoundaryCount: 0 }, proposedRepairs: [] },
  })
  const mutated = {
    ...ready,
    summary: {
      ...ready.summary,
      findingsPromotedByReadback: 1,
      backlogRecordsWrittenByReadback: 1,
    },
    promotionContracts: list(ready.promotionContracts).map(item => ({
      ...item,
      promotedNow: true,
      backlogRecordsWrittenNow: true,
    })),
  }
  const readyValidation = validateDevHubAuditorPromotionBoundaryPreflight(ready)
  const noContractValidation = validateDevHubAuditorPromotionBoundaryPreflight(noContract)
  const mutatedValidation = validateDevHubAuditorPromotionBoundaryPreflight(mutated)
  return {
    ok: ready.status === 'approval_ready' &&
      readyValidation.ok === true &&
      noContract.status === 'no_promotion_contract' &&
      noContractValidation.ok === true &&
      mutatedValidation.ok === false &&
      mutatedValidation.failures.includes('promotion_mutated_by_readback') &&
      mutatedValidation.failures.includes('backlog_or_finding_promoted_by_readback'),
    invariant: 'Auditor Promotion Boundary preflight prepares one approval-required internal-write-later gate and rejects finding/backlog promotion by readback.',
    ready,
    noContract,
    mutatedFailures: mutatedValidation.failures,
  }
}
