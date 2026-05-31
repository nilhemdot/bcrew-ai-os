export const DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID = 'DEV-HUB-NEXT-REPAIR-QUEUE-001'
export const DEV_HUB_NEXT_REPAIR_QUEUE_CLOSEOUT_KEY = 'dev-hub-next-repair-queue-v1'
export const DEV_HUB_NEXT_REPAIR_QUEUE_PLAN_PATH = 'docs/process/dev-hub-next-repair-queue-001-plan.md'
export const DEV_HUB_NEXT_REPAIR_QUEUE_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-NEXT-REPAIR-QUEUE-001.json'
export const DEV_HUB_NEXT_REPAIR_QUEUE_SCRIPT_PATH = 'scripts/process-dev-hub-next-repair-queue-check.mjs'
export const DEV_HUB_NEXT_REPAIR_QUEUE_CONTRACT_VERSION = 'dev-hub-next-repair-queue.v1'
export const DEV_HUB_NEXT_REPAIR_QUEUE_VISIBLE_HOME = 'Dev Hub > Data Pool > Next Repairs'

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
    proposalOnly: true,
    noCardCreate: true,
    noBacklogMutation: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noCurrentSprintMutation: true,
    noApprovalMutation: true,
    noRouteApprove: true,
    noRouteApply: true,
    noRouteReject: true,
    noRouteSnooze: true,
    noRouteReroute: true,
    noRouteMutation: true,
    noAtomWrites: true,
    noFactWrites: true,
    noSynthesisWrite: true,
    noConnectorProbe: true,
    noSourceSync: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noHarlanSend: true,
    noExternalWrites: true,
    noAutoBuild: true,
    noAutoPromoteRecommendations: true,
  }
}

function proposal({
  repairId,
  title,
  problem,
  sourceSignals = [],
  proposedDone = '',
  operatorBoundary = '',
  suggestedCardType = 'repair',
  effort = 'M',
  risk = 'medium',
  priority = 50,
  approvalRequired = true,
  internalWriteRequired = false,
}) {
  return {
    repairId,
    rank: 0,
    title: truncate(title, 130),
    problem: truncate(problem, 220),
    sourceSignals: list(sourceSignals).map(signal => truncate(signal, 160)).slice(0, 4),
    proposedDone: truncate(proposedDone, 220),
    operatorBoundary: truncate(operatorBoundary, 240),
    suggestedCardType,
    effort,
    risk,
    priority: count(priority),
    approvalRequired: approvalRequired === true,
    internalWriteRequired: internalWriteRequired === true,
    status: 'proposal_only',
    autoCreated: false,
    autoPromoted: false,
    appliedNow: false,
    routeMutatedNow: false,
    backlogCardCreatedNow: false,
    scoperCardCreatedNow: false,
  }
}

function topFamily(businessSourcePipelineTriage = {}, statusMatcher = () => true) {
  return list(businessSourcePipelineTriage.familyBuckets)
    .filter(statusMatcher)
    .sort((left, right) => count(right.staleOrExtractedOnly) - count(left.staleOrExtractedOnly) || count(right.waitingRoutes) - count(left.waitingRoutes))
    .find(Boolean) || null
}

function buildBusinessAtomRepair(businessSourcePipelineTriage = {}) {
  const summary = businessSourcePipelineTriage.summary || {}
  if (count(summary.staleAtomFlowCount) <= 0) return null
  const family = topFamily(businessSourcePipelineTriage, bucket => bucket.status === 'waiting_on_atom_flow') || topFamily(businessSourcePipelineTriage)
  return proposal({
    repairId: 'business-source-atom-flow-repair',
    title: `Repair ${family?.label || 'business source'} atom flow`,
    problem: `${count(summary.staleAtomFlowCount)} business source(s) have stale atom flow; ${count(summary.waitingRoutes)} route(s) are waiting and ${count(summary.resolvedCount)} business source(s) are resolved.`,
    sourceSignals: [
      `Business Sources: ${count(summary.businessSourceCount)} sources across ${count(summary.familyCount)} families.`,
      `${family?.label || 'Top family'}: ${count(family?.staleOrExtractedOnly)} stale/extracted-only source(s), ${count(family?.waitingRoutes)} waiting route(s).`,
      `Mutation counters: sync=${count(summary.extractionRunsStarted)}, probes=${count(summary.connectorProbesStarted)}, writes=${count(summary.autoMutationCount)}.`,
    ],
    proposedDone: 'One source family moves from stale atom-flow gap to fresh source-backed atoms, then synthesis/routing proof remains separate.',
    operatorBoundary: 'Requires a separate repair card before writing atoms/facts; no connector sync or extraction is started by this queue.',
    suggestedCardType: 'source-flow-repair',
    effort: 'M',
    risk: 'medium',
    priority: 10,
    approvalRequired: true,
    internalWriteRequired: true,
  })
}

function buildDriveExtractedOnlyRepair(businessSourcePipelineTriage = {}) {
  const summary = businessSourcePipelineTriage.summary || {}
  if (count(summary.extractedNotAtomizedCount) <= 0) return null
  const drive = topFamily(businessSourcePipelineTriage, bucket => bucket.familyId === 'drive') || topFamily(businessSourcePipelineTriage)
  return proposal({
    repairId: 'drive-extracted-not-atomized-repair',
    title: 'Promote Drive extracted-only evidence into atom flow',
    problem: `${count(summary.extractedNotAtomizedCount)} business source(s) have extracted/shared artifacts but no current atom signal.`,
    sourceSignals: [
      `${drive?.label || 'Drive'} status: ${drive?.status || 'unknown'}.`,
      `${drive?.count || 0} source(s), ${drive?.waitingRoutes || 0} waiting route(s).`,
    ],
    proposedDone: 'Extracted Drive/Docs artifacts have a verified atom-flow path without claiming external sync or Drive mutation.',
    operatorBoundary: 'Use existing artifacts only unless Steve separately approves Drive extraction or connector work.',
    suggestedCardType: 'source-flow-repair',
    effort: 'M',
    risk: 'medium',
    priority: 20,
    approvalRequired: true,
    internalWriteRequired: true,
  })
}

function buildRouteReviewRepair(routeReviewTriage = {}) {
  const summary = routeReviewTriage.summary || {}
  if (count(summary.needsReviewItems) <= 0) return null
  return proposal({
    repairId: 'route-review-decision-sweep',
    title: 'Triage the action-route review pile',
    problem: `${count(summary.needsReviewItems)} route review item(s) are waiting: ${count(summary.ownerRequiredItems)} owner gaps, ${count(summary.sensitiveReviewItems)} sensitive, ${count(summary.duplicateOrStaleReviewItems)} duplicate/stale.`,
    sourceSignals: [
      `Route Review: pending=${count(summary.pendingRoutes)}, approved=${count(summary.approvedRoutes)}, applied=${count(summary.appliedRoutes)}.`,
      `Ready for confirmed apply: ${count(summary.readyForConfirmedApplyItems)}.`,
      `Readback mutations: routes=${count(summary.routesMutatedByReadback)}, destinations=${count(summary.destinationsMutatedByReadback)}.`,
    ],
    proposedDone: 'One exact route-review lane is reduced through explicit owner/reject/snooze/apply rules, with route IDs and approval recorded.',
    operatorBoundary: 'Requires exact route IDs and Steve approval before approve/apply/reject/snooze/reroute. This queue does not clear anything.',
    suggestedCardType: 'route-review-repair',
    effort: 'M',
    risk: 'high',
    priority: 30,
    approvalRequired: true,
    internalWriteRequired: true,
  })
}

function buildScoperRuntimeRepair(scoperRuntimeReadback = {}) {
  const summary = scoperRuntimeReadback.summary || {}
  if (count(summary.scheduledScoperJobCount) > 0 && count(summary.parkedCount) <= 0) return null
  return proposal({
    repairId: 'scoper-runtime-schedule-boundary',
    title: 'Define the Scoper runtime schedule boundary',
    problem: `${count(summary.scheduledScoperJobCount)} scheduled Scoper job(s) are visible; ${count(summary.readyForPortfolioCount)} candidate(s) are ready and ${count(summary.parkedCount)} are parked.`,
    sourceSignals: [
      `Scoper jobs=${count(summary.scoperJobCount)}, scheduled=${count(summary.scheduledScoperJobCount)}, latest=${summary.latestScoperRunStatus || 'missing'}.`,
      `Auto-promoted candidates=${count(summary.autoPromotedCount)}.`,
      `Schedule mutations by readback=${count(summary.scheduleMutationsByReadback)}.`,
    ],
    proposedDone: 'Scoper can be scheduled or deliberately kept parked with an explicit no-auto-promotion runtime boundary.',
    operatorBoundary: 'Scheduling Scoper is approval-bound and must not promote candidates into backlog, Portfolio, or Scoper records automatically.',
    suggestedCardType: 'runtime-boundary',
    effort: 'S',
    risk: 'high',
    priority: 40,
    approvalRequired: true,
    internalWriteRequired: false,
  })
}

function buildSynthesisRepair(synthesisScopeReadback = {}) {
  const summary = synthesisScopeReadback.summary || {}
  const needsRepair = summary.refreshConfiguredForRealCorpus !== true ||
    summary.proofAndRefreshSeparated !== true ||
    summary.scheduledRefreshLatestStatus === 'failed' ||
    summary.scheduledRefreshJobPresent !== true
  if (!needsRepair) return null
  return proposal({
    repairId: 'synthesis-refresh-runtime-repair',
    title: 'Repair synthesis refresh runtime before routing more work',
    problem: `Proof scope is ${summary.proofScopeKey || 'missing'}/${count(summary.proofItemLimit)}; refresh scope is ${summary.refreshScopeKey || 'missing'}/${count(summary.refreshItemLimit)} with latest job ${summary.scheduledRefreshLatestStatus || 'missing'}.`,
    sourceSignals: [
      `Real-corpus configured=${summary.refreshConfiguredForRealCorpus === true}.`,
      `Proof/refresh separated=${summary.proofAndRefreshSeparated === true}.`,
      `Readback refresh/model/route starts=${count(summary.refreshRunsStartedByReadback)}/${count(summary.modelOrProviderCallsStarted)}/${count(summary.actionRoutesProposedByReadback)}.`,
    ],
    proposedDone: 'Refresh runtime is configured and proven without using proof scope as real-corpus evidence.',
    operatorBoundary: 'Model-backed synthesis execution and downstream route proposal require separate approval.',
    suggestedCardType: 'synthesis-runtime-repair',
    effort: 'M',
    risk: 'high',
    priority: 45,
    approvalRequired: true,
    internalWriteRequired: true,
  })
}

function buildAuditorPromotionRepair(auditorFlowReadback = {}) {
  const summary = auditorFlowReadback.summary || {}
  const reportOnly = count(summary.reportOnlyJobs) + count(summary.readOnlyJobs)
  if (reportOnly <= 0 && count(summary.waitingRouteReviewItems) <= 0) return null
  return proposal({
    repairId: 'auditor-report-to-work-boundary',
    title: 'Define audit finding promotion from reports to work',
    problem: `${reportOnly} auditor output lane(s) are report/read-only; ${count(summary.autoFindingPromotionCount)} finding(s) auto-promote today.`,
    sourceSignals: [
      `Auditors=${count(summary.auditorJobCount)}, scheduled=${count(summary.scheduledAuditorJobs)}, latest failures=${count(summary.failedLatestRuns)}.`,
      `Waiting route reviews=${count(summary.waitingRouteReviewItems)}, hygiene pressure=${count(summary.hygieneCleanupPressure)}.`,
      `Backlog mutations=${count(summary.backlogMutationCount)}, route mutations=${count(summary.routeMutationCount)}, external writes=${count(summary.externalWriteCount)}.`,
    ],
    proposedDone: 'Audit findings have an explicit promotion gate that creates reviewable work only under a separately approved mutation boundary.',
    operatorBoundary: 'This queue does not run audits, write reports, create backlog cards, route findings, or send Harlan.',
    suggestedCardType: 'promotion-boundary',
    effort: 'M',
    risk: 'medium',
    priority: 50,
    approvalRequired: true,
    internalWriteRequired: true,
  })
}

function buildHygieneRepair(intelligenceHygieneReadback = {}) {
  const summary = intelligenceHygieneReadback.summary || {}
  if (count(summary.totalCleanupPressure) <= 0) return null
  return proposal({
    repairId: 'intelligence-hygiene-cleanup-slice',
    title: 'Pick one hygiene cleanup slice',
    problem: `${count(summary.totalCleanupPressure)} cleanup pressure signal(s): ${count(summary.atomizedGapSources)} atom gaps, ${count(summary.routeReviewItems)} route reviews, ${count(summary.scoperParkedCandidates)} parked Scoper candidate(s).`,
    sourceSignals: [
      `False freshness warning=${intelligenceHygieneReadback.falseFreshnessWarning ? 'visible' : 'clear'}.`,
      `Auto mutation count=${count(summary.autoMutationCount)}.`,
    ],
    proposedDone: 'One hygiene bucket moves from vague pressure to a proved repair with fresh source evidence and explicit write boundary.',
    operatorBoundary: 'Choose one bucket; do not batch atom writes, route applies, Scoper promotion, or source sync into this proposal queue.',
    suggestedCardType: 'hygiene-repair',
    effort: 'S',
    risk: 'medium',
    priority: 60,
    approvalRequired: true,
    internalWriteRequired: true,
  })
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.proposedRepairCount) <= 0) {
    return 'No next repair proposal is visible from the current Dev Hub readbacks.'
  }
  return `${count(summary.proposedRepairCount)} proposal-only repair(s) are ranked from live readbacks. The queue created ${count(summary.cardsCreatedByReadback)} card(s), promoted ${count(summary.scoperRecordsWrittenByReadback)} Scoper record(s), and mutated ${count(summary.routeMutationsByReadback)} route(s).`
}

export function buildDevHubNextRepairQueue({
  generatedAt = new Date().toISOString(),
  foundationDoneBar = {},
  businessSourcePipelineTriage = {},
  routeReviewTriage = {},
  scoperRuntimeReadback = {},
  synthesisScopeReadback = {},
  auditorFlowReadback = {},
  intelligenceHygieneReadback = {},
} = {}) {
  const proposals = [
    buildBusinessAtomRepair(businessSourcePipelineTriage),
    buildDriveExtractedOnlyRepair(businessSourcePipelineTriage),
    buildRouteReviewRepair(routeReviewTriage),
    buildScoperRuntimeRepair(scoperRuntimeReadback),
    buildSynthesisRepair(synthesisScopeReadback),
    buildAuditorPromotionRepair(auditorFlowReadback),
    buildHygieneRepair(intelligenceHygieneReadback),
  ]
    .filter(Boolean)
    .sort((left, right) => count(left.priority) - count(right.priority) || text(left.title).localeCompare(text(right.title)))
    .slice(0, 6)
    .map((item, index) => ({ ...item, rank: index + 1 }))

  const summary = {
    proposedRepairCount: proposals.length,
    approvalBoundCount: proposals.filter(item => item.approvalRequired).length,
    internalWriteRequiredCount: proposals.filter(item => item.internalWriteRequired).length,
    safeReadOnlyContinuationCount: proposals.filter(item => !item.internalWriteRequired).length,
    sourceFlowRepairCount: proposals.filter(item => item.suggestedCardType === 'source-flow-repair').length,
    routeRepairCount: proposals.filter(item => item.suggestedCardType === 'route-review-repair').length,
    runtimeBoundaryCount: proposals.filter(item => item.suggestedCardType === 'runtime-boundary').length,
    promotionBoundaryCount: proposals.filter(item => item.suggestedCardType === 'promotion-boundary').length,
    cardsCreatedByReadback: 0,
    backlogRecordsWrittenByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsWrittenByReadback: 0,
    currentSprintMutationsByReadback: 0,
    routeMutationsByReadback: 0,
    atomRowsWrittenByReadback: 0,
    factRowsWrittenByReadback: 0,
    synthesisRowsWrittenByReadback: 0,
    extractionRunsStarted: 0,
    connectorProbesStarted: 0,
    modelCallsStarted: 0,
    harlanSendsByReadback: 0,
    externalWritesByReadback: 0,
  }

  const failures = []
  if (foundationDoneBar.ok !== true) failures.push('foundation_done_bar_not_healthy')
  if (businessSourcePipelineTriage.ok !== true) failures.push('business_source_triage_not_healthy')
  if (routeReviewTriage.ok !== true) failures.push('route_review_triage_not_healthy')
  if (scoperRuntimeReadback.ok !== true) failures.push('scoper_runtime_not_healthy')
  if (synthesisScopeReadback.ok !== true) failures.push('synthesis_scope_not_healthy')
  if (auditorFlowReadback.ok !== true) failures.push('auditor_flow_not_healthy')
  if (intelligenceHygieneReadback.ok !== true) failures.push('intelligence_hygiene_not_healthy')
  if (proposals.some(item => item.status !== 'proposal_only' || item.autoCreated || item.autoPromoted || item.appliedNow)) failures.push('proposal_not_proposal_only')
  if (summary.cardsCreatedByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0) failures.push('cards_created_by_readback')
  if (summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.currentSprintMutationsByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.routeMutationsByReadback !== 0) failures.push('route_mutated_by_readback')
  if (summary.atomRowsWrittenByReadback !== 0 || summary.factRowsWrittenByReadback !== 0 || summary.synthesisRowsWrittenByReadback !== 0) failures.push('intelligence_rows_written_by_readback')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('runtime_started_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : proposals.length ? 'proposal_ready' : 'healthy',
    contractVersion: DEV_HUB_NEXT_REPAIR_QUEUE_CONTRACT_VERSION,
    cardId: DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID,
    closeoutKey: DEV_HUB_NEXT_REPAIR_QUEUE_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_NEXT_REPAIR_QUEUE_VISIBLE_HOME,
    source: {
      reusedTruthLayers: [
        'foundationDoneBar',
        'businessSourcePipelineTriage',
        'routeReviewTriage',
        'scoperRuntimeReadback',
        'synthesisScopeReadback',
        'auditorFlowReadback',
        'intelligenceHygieneReadback',
      ],
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    proposedRepairs: proposals,
    queues: {
      approvalBound: proposals.filter(item => item.approvalRequired).slice(0, 6),
      sourceFlow: proposals.filter(item => item.suggestedCardType === 'source-flow-repair').slice(0, 4),
      routeAndRuntime: proposals.filter(item => ['route-review-repair', 'runtime-boundary', 'synthesis-runtime-repair'].includes(item.suggestedCardType)).slice(0, 4),
    },
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubNextRepairQueue(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['proposal_ready', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_NEXT_REPAIR_QUEUE_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  const layers = list(snapshot.source?.reusedTruthLayers)
  for (const layer of ['foundationDoneBar', 'businessSourcePipelineTriage', 'routeReviewTriage', 'scoperRuntimeReadback', 'synthesisScopeReadback', 'auditorFlowReadback', 'intelligenceHygieneReadback']) {
    if (!layers.includes(layer)) failures.push(`source_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'proposalOnly', 'noCardCreate', 'noBacklogMutation', 'noScoperMutation', 'noPortfolioMutation', 'noRouteMutation', 'noAtomWrites', 'noFactWrites', 'noSynthesisWrite', 'noConnectorProbe', 'noSourceSync', 'noLiveExtraction', 'noModelCalls', 'noHarlanSend', 'noExternalWrites', 'noAutoBuild', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const proposals = list(snapshot.proposedRepairs)
  if (proposals.length > 6) failures.push('proposals_unbounded')
  if (list(snapshot.queues?.approvalBound).length > 6 || list(snapshot.queues?.sourceFlow).length > 4 || list(snapshot.queues?.routeAndRuntime).length > 4) failures.push('queues_unbounded')
  if (count(snapshot.summary?.proposedRepairCount) !== proposals.length) failures.push('proposal_count_mismatch')
  for (const item of proposals) {
    if (item.status !== 'proposal_only') failures.push('proposal_not_proposal_only')
    if (item.autoCreated !== false || item.autoPromoted !== false || item.appliedNow !== false) failures.push('proposal_not_proposal_only')
    if (item.routeMutatedNow !== false || item.backlogCardCreatedNow !== false || item.scoperCardCreatedNow !== false) failures.push('proposal_not_proposal_only')
    if (!text(item.title) || !text(item.problem) || !text(item.operatorBoundary)) failures.push('proposal_missing_operator_context')
  }
  if (count(snapshot.summary?.cardsCreatedByReadback) !== 0 || count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0) failures.push('cards_created_by_readback')
  if (count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.currentSprintMutationsByReadback) !== 0) failures.push('destination_records_written_by_readback')
  if (count(snapshot.summary?.routeMutationsByReadback) !== 0) failures.push('route_mutated_by_readback')
  if (count(snapshot.summary?.atomRowsWrittenByReadback) !== 0 || count(snapshot.summary?.factRowsWrittenByReadback) !== 0 || count(snapshot.summary?.synthesisRowsWrittenByReadback) !== 0) failures.push('intelligence_rows_written_by_readback')
  if (count(snapshot.summary?.extractionRunsStarted) !== 0 || count(snapshot.summary?.connectorProbesStarted) !== 0 || count(snapshot.summary?.modelCallsStarted) !== 0) failures.push('runtime_started_by_readback')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0 || count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('external_write_by_readback')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubNextRepairQueueDogfoodProof() {
  const cleanInputs = {
    foundationDoneBar: { ok: true },
    businessSourcePipelineTriage: {
      ok: true,
      summary: {
        businessSourceCount: 3,
        familyCount: 2,
        staleAtomFlowCount: 2,
        extractedNotAtomizedCount: 1,
        waitingRoutes: 3,
        resolvedCount: 0,
      },
      familyBuckets: [
        { familyId: 'crm', label: 'FUB / CRM', status: 'waiting_on_atom_flow', staleOrExtractedOnly: 1, waitingRoutes: 2 },
        { familyId: 'drive', label: 'Drive / Docs', status: 'extracted_not_atomized', staleOrExtractedOnly: 1, waitingRoutes: 0 },
      ],
    },
    routeReviewTriage: {
      ok: true,
      summary: {
        needsReviewItems: 5,
        pendingRoutes: 4,
        approvedRoutes: 0,
        appliedRoutes: 1,
        ownerRequiredItems: 2,
        sensitiveReviewItems: 3,
        duplicateOrStaleReviewItems: 4,
        readyForConfirmedApplyItems: 0,
        routesMutatedByReadback: 0,
        destinationsMutatedByReadback: 0,
      },
    },
    scoperRuntimeReadback: {
      ok: true,
      summary: {
        scoperJobCount: 0,
        scheduledScoperJobCount: 0,
        latestScoperRunStatus: 'missing',
        readyForPortfolioCount: 2,
        parkedCount: 1,
        autoPromotedCount: 0,
        scheduleMutationsByReadback: 0,
      },
    },
    synthesisScopeReadback: {
      ok: true,
      summary: {
        proofScopeKey: 'foundation-spine-proof',
        proofItemLimit: 8,
        refreshScopeKey: 'foundation-real-corpus-refresh',
        refreshItemLimit: 120,
        refreshConfiguredForRealCorpus: true,
        proofAndRefreshSeparated: true,
        scheduledRefreshJobPresent: true,
        scheduledRefreshLatestStatus: 'succeeded',
        refreshRunsStartedByReadback: 0,
        modelOrProviderCallsStarted: 0,
        actionRoutesProposedByReadback: 0,
      },
    },
    auditorFlowReadback: {
      ok: true,
      summary: {
        auditorJobCount: 4,
        scheduledAuditorJobs: 2,
        reportOnlyJobs: 2,
        readOnlyJobs: 1,
        failedLatestRuns: 0,
        autoFindingPromotionCount: 0,
        waitingRouteReviewItems: 5,
        hygieneCleanupPressure: 12,
        backlogMutationCount: 0,
        routeMutationCount: 0,
        externalWriteCount: 0,
      },
    },
    intelligenceHygieneReadback: {
      ok: true,
      falseFreshnessWarning: 'Visible',
      summary: {
        totalCleanupPressure: 12,
        atomizedGapSources: 3,
        routeReviewItems: 5,
        scoperParkedCandidates: 1,
        autoMutationCount: 0,
      },
    },
  }
  const snapshot = buildDevHubNextRepairQueue({
    generatedAt: '2026-05-31T06:52:00.000Z',
    ...cleanInputs,
  })
  const validation = validateDevHubNextRepairQueue(snapshot)
  const unsafeCreated = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      cardsCreatedByReadback: 1,
      routeMutationsByReadback: 1,
    },
    proposedRepairs: snapshot.proposedRepairs.map((item, index) => index === 0
      ? { ...item, autoCreated: true, status: 'created' }
      : item),
  }
  const unsafeValidation = validateDevHubNextRepairQueue(unsafeCreated)
  return {
    ok: validation.ok &&
      snapshot.status === 'proposal_ready' &&
      snapshot.summary.proposedRepairCount >= 4 &&
      snapshot.summary.cardsCreatedByReadback === 0 &&
      snapshot.proposedRepairs.every(item => item.status === 'proposal_only' && item.autoCreated === false) &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('proposal_not_proposal_only') &&
      unsafeValidation.failures.includes('cards_created_by_readback') &&
      unsafeValidation.failures.includes('route_mutated_by_readback'),
    validation,
    unsafeValidation,
    snapshot,
    invariant: 'Next Repair Queue ranks proposal-only repairs and rejects auto-created cards, promotion, route mutation, or non-proposal rows.',
  }
}
