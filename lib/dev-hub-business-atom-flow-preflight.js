export const DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID = 'DEV-HUB-BUSINESS-ATOM-FLOW-PREFLIGHT-001'
export const DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CLOSEOUT_KEY = 'dev-hub-business-atom-flow-preflight-v1'
export const DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_PLAN_PATH = 'docs/process/dev-hub-business-atom-flow-preflight-001-plan.md'
export const DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-BUSINESS-ATOM-FLOW-PREFLIGHT-001.json'
export const DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_SCRIPT_PATH = 'scripts/process-dev-hub-business-atom-flow-preflight-check.mjs'
export const DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CONTRACT_VERSION = 'dev-hub-business-atom-flow-preflight.v1'
export const DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_VISIBLE_HOME = 'Dev Hub > Data Pool > Business Atom Flow Preflight'
export const BUSINESS_ATOM_FLOW_REPAIR_ID = 'business-source-atom-flow-repair'

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

function statusLabel(value = '') {
  return text(value || 'proposal').replace(/[_-]+/g, ' ')
}

function uniqueBy(items = [], keyFn = item => item) {
  const seen = new Set()
  const output = []
  for (const item of list(items)) {
    const key = text(keyFn(item))
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }
  return output
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

function findAtomRepairProposal(nextRepairQueue = {}) {
  return list(nextRepairQueue.proposedRepairs)
    .find(item => item.repairId === BUSINESS_ATOM_FLOW_REPAIR_ID) || null
}

function chooseTargetFamily(businessSourcePipelineTriage = {}, atomRepairProposal = null) {
  const familyBuckets = list(businessSourcePipelineTriage.familyBuckets)
  const staleFamilies = familyBuckets
    .filter(bucket => bucket.status === 'waiting_on_atom_flow' || count(bucket.staleOrExtractedOnly) > 0)
    .sort((left, right) => count(right.staleOrExtractedOnly) - count(left.staleOrExtractedOnly) || count(right.waitingRoutes) - count(left.waitingRoutes) || text(left.label).localeCompare(text(right.label)))
  if (staleFamilies.length) return staleFamilies[0]
  if (atomRepairProposal) {
    const title = text(atomRepairProposal.title).toLowerCase()
    return familyBuckets.find(bucket => title.includes(text(bucket.label).toLowerCase())) || familyBuckets[0] || null
  }
  return familyBuckets[0] || null
}

function candidatePoolForFamily(businessSourcePipelineTriage = {}, familyId = '') {
  const rows = uniqueBy([
    ...list(businessSourcePipelineTriage.queues?.staleAtomFlow),
    ...list(businessSourcePipelineTriage.rows),
  ], row => row.sourceId)
  const familyRows = rows.filter(row => row.familyId === familyId)
  const staleRows = familyRows.filter(row => row.businessStatus === 'waiting_on_atom_flow')
  return (staleRows.length ? staleRows : familyRows)
    .sort((left, right) => count(right.waitingRoutes) - count(left.waitingRoutes) || text(left.title).localeCompare(text(right.title)))
}

function buildCandidate(row = {}, index = 0, targetFamily = {}) {
  const sourceId = text(row.sourceId)
  const status = text(row.businessStatus || 'waiting_on_atom_flow')
  const hasExactSourceId = Boolean(sourceId)
  const hasStageProof = Boolean(row.stages && Object.prototype.hasOwnProperty.call(row.stages, 'atomized'))
  const readyForRepairCard = hasExactSourceId && hasStageProof && status === 'waiting_on_atom_flow'
  return {
    candidateId: `atom-flow-preflight:${sourceId || index + 1}`,
    rank: index + 1,
    sourceId,
    title: truncate(row.title || sourceId || 'Business source', 130),
    familyId: text(targetFamily.familyId || row.familyId || ''),
    familyLabel: text(targetFamily.label || row.familyLabel || 'Business source'),
    businessStatus: status,
    businessStatusLabel: statusLabel(status),
    firstGap: text(row.firstGap || 'atomized'),
    waitingRoutes: count(row.waitingRoutes),
    currentProblem: truncate(row.detail || 'Source is connected but atom flow is stale.', 220),
    proposedRepair: 'Prepare a separate approved source-flow repair that writes fresh source-backed atoms/facts from existing governed evidence before synthesis refresh or route work.',
    operatorBoundary: 'No atom/fact rows are written here. Actual source-flow repair, synthesis refresh, and route proposal/apply need separate approval.',
    gates: [
      {
        gateId: 'source-id',
        label: 'Exact source ID',
        status: hasExactSourceId ? 'ready' : 'blocked',
        detail: sourceId || 'Missing source ID.',
      },
      {
        gateId: 'atom-stage-proof',
        label: 'Atomized stage proof',
        status: hasStageProof ? 'ready' : 'blocked',
        detail: `atomized=${row.stages?.atomized === true ? 'true' : 'false'}; firstGap=${row.firstGap || 'unknown'}`,
      },
      {
        gateId: 'write-approval',
        label: 'Internal write approval',
        status: 'approval_required',
        detail: 'Atom/fact writes must be a separate approved repair card.',
      },
      {
        gateId: 'synthesis-separation',
        label: 'Synthesis separation',
        status: 'approval_required',
        detail: 'Do not run model-backed synthesis or route proposal from this preflight.',
      },
    ],
    metrics: {
      extractedItems: count(row.metrics?.extractedItems),
      sharedArtifacts: count(row.metrics?.sharedArtifacts),
      atomSignals: count(row.metrics?.atomSignals),
      atomCandidateSignals: count(row.metrics?.atomCandidateSignals),
      synthesisFactSignals: count(row.metrics?.synthesisFactSignals),
      routeSignals: count(row.metrics?.routeSignals),
      pendingRouteSignals: count(row.metrics?.pendingRouteSignals),
      approvedRouteSignals: count(row.metrics?.approvedRouteSignals),
      appliedRouteSignals: count(row.metrics?.appliedRouteSignals),
    },
    stages: {
      extracted: row.stages?.extracted === true,
      atomized: row.stages?.atomized === true,
      synthesized: row.stages?.synthesized === true,
      routed: row.stages?.routed === true,
      resolved: row.stages?.resolved === true,
    },
    readyForRepairCard,
    approvalRequired: true,
    internalWriteRequired: true,
    status: 'proposal_only',
    autoCreated: false,
    autoPromoted: false,
    appliedNow: false,
    routeMutatedNow: false,
    atomRowsWrittenNow: false,
    factRowsWrittenNow: false,
    synthesisRowsWrittenNow: false,
    backlogCardCreatedNow: false,
    scoperCardCreatedNow: false,
  }
}

function buildRepairGates(targetFamily = {}, candidates = []) {
  return [
    {
      gateId: 'pick-one-family',
      label: 'One family selected',
      status: targetFamily?.familyId ? 'ready' : 'blocked',
      detail: targetFamily?.label || 'No stale business family selected.',
    },
    {
      gateId: 'candidate-source-ids',
      label: 'Candidate source IDs present',
      status: candidates.length && candidates.every(candidate => candidate.sourceId) ? 'ready' : 'blocked',
      detail: `${candidates.filter(candidate => candidate.sourceId).length}/${candidates.length} candidate(s) have exact source IDs.`,
    },
    {
      gateId: 'separate-write-card',
      label: 'Separate write card required',
      status: 'approval_required',
      detail: 'Atom/fact writes are not allowed in this preflight readback.',
    },
    {
      gateId: 'no-runtime-start',
      label: 'No source runtime started',
      status: 'ready',
      detail: 'No source sync, extraction, connector probe, model call, or Harlan send is started here.',
    },
  ]
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.candidateSourceCount) <= 0) {
    return 'No business atom-flow repair candidate is ready from the current readbacks.'
  }
  return `${summary.targetFamilyLabel || 'Business source'} has ${count(summary.candidateSourceCount)} proposal-only source candidate(s) for a separate atom-flow repair. This preflight wrote ${count(summary.atomRowsWrittenByReadback)} atom row(s) and created ${count(summary.cardsCreatedByReadback)} card(s).`
}

export function buildDevHubBusinessAtomFlowPreflight({
  generatedAt = new Date().toISOString(),
  businessSourcePipelineTriage = {},
  nextRepairQueue = {},
  maxCandidates = 6,
} = {}) {
  const atomRepairProposal = findAtomRepairProposal(nextRepairQueue)
  const targetFamily = chooseTargetFamily(businessSourcePipelineTriage, atomRepairProposal)
  const candidates = candidatePoolForFamily(businessSourcePipelineTriage, targetFamily?.familyId)
    .slice(0, maxCandidates)
    .map((row, index) => buildCandidate(row, index, targetFamily || {}))

  const summary = {
    targetRepairId: atomRepairProposal?.repairId || BUSINESS_ATOM_FLOW_REPAIR_ID,
    targetRepairProposalVisible: Boolean(atomRepairProposal),
    targetFamilyId: text(targetFamily?.familyId || ''),
    targetFamilyLabel: text(targetFamily?.label || ''),
    targetFamilyStatus: text(targetFamily?.status || ''),
    targetStaleOrExtractedOnly: count(targetFamily?.staleOrExtractedOnly),
    targetWaitingRoutes: count(targetFamily?.waitingRoutes),
    candidateSourceCount: candidates.length,
    readyForRepairCardCount: candidates.filter(candidate => candidate.readyForRepairCard).length,
    exactSourceIdCount: candidates.filter(candidate => candidate.sourceId).length,
    missingSourceIdCount: candidates.filter(candidate => !candidate.sourceId).length,
    approvalBoundCandidateCount: candidates.filter(candidate => candidate.approvalRequired).length,
    internalWriteRequiredCount: candidates.filter(candidate => candidate.internalWriteRequired).length,
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
    sourceSyncsStarted: 0,
    modelCallsStarted: 0,
    harlanSendsByReadback: 0,
    externalWritesByReadback: 0,
  }

  const failures = []
  if (businessSourcePipelineTriage.ok !== true) failures.push('business_source_triage_not_healthy')
  if (nextRepairQueue.ok !== true) failures.push('next_repair_queue_not_healthy')
  if (count(businessSourcePipelineTriage.summary?.staleAtomFlowCount) > 0 && !atomRepairProposal) failures.push('business_atom_repair_proposal_missing')
  if (atomRepairProposal && atomRepairProposal.repairId !== BUSINESS_ATOM_FLOW_REPAIR_ID) failures.push('wrong_repair_target')
  if (candidates.some(candidate => candidate.status !== 'proposal_only' || candidate.autoCreated || candidate.autoPromoted || candidate.appliedNow)) failures.push('candidate_not_proposal_only')
  if (summary.cardsCreatedByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0) failures.push('cards_created_by_readback')
  if (summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.currentSprintMutationsByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.routeMutationsByReadback !== 0) failures.push('route_mutated_by_readback')
  if (summary.atomRowsWrittenByReadback !== 0 || summary.factRowsWrittenByReadback !== 0 || summary.synthesisRowsWrittenByReadback !== 0) failures.push('intelligence_rows_written_by_readback')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.sourceSyncsStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('runtime_started_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : candidates.length ? 'preflight_ready' : 'healthy',
    contractVersion: DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CONTRACT_VERSION,
    cardId: DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID,
    closeoutKey: DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_VISIBLE_HOME,
    source: {
      reusedTruthLayers: [
        'businessSourcePipelineTriage',
        'nextRepairQueue',
      ],
      targetRepairId: BUSINESS_ATOM_FLOW_REPAIR_ID,
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    targetRepair: atomRepairProposal ? {
      repairId: atomRepairProposal.repairId,
      rank: atomRepairProposal.rank,
      title: atomRepairProposal.title,
      problem: atomRepairProposal.problem,
      operatorBoundary: atomRepairProposal.operatorBoundary,
      approvalRequired: atomRepairProposal.approvalRequired === true,
      internalWriteRequired: atomRepairProposal.internalWriteRequired === true,
    } : null,
    repairGates: buildRepairGates(targetFamily || {}, candidates),
    candidates,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubBusinessAtomFlowPreflight(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['preflight_ready', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.targetRepairId !== BUSINESS_ATOM_FLOW_REPAIR_ID) failures.push('target_repair_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  const layers = list(snapshot.source?.reusedTruthLayers)
  for (const layer of ['businessSourcePipelineTriage', 'nextRepairQueue']) {
    if (!layers.includes(layer)) failures.push(`source_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'proposalOnly', 'noCardCreate', 'noBacklogMutation', 'noScoperMutation', 'noPortfolioMutation', 'noRouteMutation', 'noAtomWrites', 'noFactWrites', 'noSynthesisWrite', 'noConnectorProbe', 'noSourceSync', 'noLiveExtraction', 'noModelCalls', 'noHarlanSend', 'noExternalWrites', 'noAutoBuild', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const candidates = list(snapshot.candidates)
  if (candidates.length > 6) failures.push('candidates_unbounded')
  if (list(snapshot.repairGates).length > 6) failures.push('repair_gates_unbounded')
  if (count(snapshot.summary?.candidateSourceCount) !== candidates.length) failures.push('candidate_count_mismatch')
  if (count(snapshot.summary?.readyForRepairCardCount) > count(snapshot.summary?.candidateSourceCount)) failures.push('ready_count_exceeds_candidates')
  for (const candidate of candidates) {
    if (candidate.status !== 'proposal_only') failures.push('candidate_not_proposal_only')
    if (candidate.autoCreated !== false || candidate.autoPromoted !== false || candidate.appliedNow !== false) failures.push('candidate_not_proposal_only')
    if (candidate.routeMutatedNow !== false || candidate.atomRowsWrittenNow !== false || candidate.factRowsWrittenNow !== false || candidate.synthesisRowsWrittenNow !== false) failures.push('candidate_not_proposal_only')
    if (candidate.backlogCardCreatedNow !== false || candidate.scoperCardCreatedNow !== false) failures.push('candidate_not_proposal_only')
    if (!text(candidate.sourceId) || !text(candidate.title) || !text(candidate.operatorBoundary)) failures.push('candidate_missing_operator_context')
  }
  if (count(snapshot.summary?.cardsCreatedByReadback) !== 0 || count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0) failures.push('cards_created_by_readback')
  if (count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.currentSprintMutationsByReadback) !== 0) failures.push('destination_records_written_by_readback')
  if (count(snapshot.summary?.routeMutationsByReadback) !== 0) failures.push('route_mutated_by_readback')
  if (count(snapshot.summary?.atomRowsWrittenByReadback) !== 0 || count(snapshot.summary?.factRowsWrittenByReadback) !== 0 || count(snapshot.summary?.synthesisRowsWrittenByReadback) !== 0) failures.push('intelligence_rows_written_by_readback')
  if (count(snapshot.summary?.extractionRunsStarted) !== 0 || count(snapshot.summary?.connectorProbesStarted) !== 0 || count(snapshot.summary?.sourceSyncsStarted) !== 0 || count(snapshot.summary?.modelCallsStarted) !== 0) failures.push('runtime_started_by_readback')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0 || count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('external_write_by_readback')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubBusinessAtomFlowPreflightDogfoodProof() {
  const businessSourcePipelineTriage = {
    ok: true,
    summary: {
      staleAtomFlowCount: 3,
    },
    familyBuckets: [
      { familyId: 'kpi', label: 'KPI / Supabase', status: 'waiting_on_atom_flow', staleOrExtractedOnly: 1, waitingRoutes: 0 },
      { familyId: 'sheets', label: 'Sheets / Owners', status: 'waiting_on_atom_flow', staleOrExtractedOnly: 2, waitingRoutes: 3 },
    ],
    queues: {
      staleAtomFlow: [
        {
          sourceId: 'SRC-OWNERS-001',
          title: 'Owners Workbook',
          familyId: 'sheets',
          familyLabel: 'Sheets / Owners',
          businessStatus: 'waiting_on_atom_flow',
          firstGap: 'atomized',
          waitingRoutes: 2,
          detail: 'Atom flow stale.',
          metrics: { extractedItems: 7, atomSignals: 1, routeSignals: 2, pendingRouteSignals: 2 },
          stages: { extracted: true, atomized: false, synthesized: false, routed: true, resolved: false },
        },
        {
          sourceId: 'SRC-FINANCE-001',
          title: 'Finance Workbook',
          familyId: 'sheets',
          familyLabel: 'Sheets / Owners',
          businessStatus: 'waiting_on_atom_flow',
          firstGap: 'atomized',
          waitingRoutes: 1,
          detail: 'Dashboard reads exist; fresh atom flow is stale.',
          metrics: { extractedItems: 4, atomSignals: 1, routeSignals: 1, pendingRouteSignals: 1 },
          stages: { extracted: true, atomized: false, synthesized: false, routed: true, resolved: false },
        },
      ],
    },
    rows: [],
  }
  const nextRepairQueue = {
    ok: true,
    proposedRepairs: [
      {
        repairId: BUSINESS_ATOM_FLOW_REPAIR_ID,
        rank: 1,
        title: 'Repair Sheets / Owners atom flow',
        problem: 'Business source atom flow is stale.',
        operatorBoundary: 'Requires separate repair card before writing atoms/facts.',
        approvalRequired: true,
        internalWriteRequired: true,
      },
    ],
  }
  const snapshot = buildDevHubBusinessAtomFlowPreflight({
    generatedAt: '2026-05-31T07:01:28.000Z',
    businessSourcePipelineTriage,
    nextRepairQueue,
  })
  const validation = validateDevHubBusinessAtomFlowPreflight(snapshot)
  const unsafeCreated = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      cardsCreatedByReadback: 1,
      atomRowsWrittenByReadback: 2,
      sourceSyncsStarted: 1,
    },
    candidates: snapshot.candidates.map((candidate, index) => index === 0
      ? { ...candidate, status: 'created', autoCreated: true, atomRowsWrittenNow: true }
      : candidate),
  }
  const unsafeValidation = validateDevHubBusinessAtomFlowPreflight(unsafeCreated)
  return {
    ok: validation.ok &&
      snapshot.status === 'preflight_ready' &&
      snapshot.summary.targetFamilyId === 'sheets' &&
      snapshot.summary.candidateSourceCount === 2 &&
      snapshot.summary.cardsCreatedByReadback === 0 &&
      snapshot.candidates.every(candidate => candidate.status === 'proposal_only' && candidate.autoCreated === false && candidate.internalWriteRequired === true) &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('candidate_not_proposal_only') &&
      unsafeValidation.failures.includes('cards_created_by_readback') &&
      unsafeValidation.failures.includes('intelligence_rows_written_by_readback') &&
      unsafeValidation.failures.includes('runtime_started_by_readback'),
    validation,
    unsafeValidation,
    snapshot,
    invariant: 'Business atom-flow preflight selects one stale business family, keeps candidates proposal-only, and rejects card creation, source runtime starts, or intelligence writes.',
  }
}
