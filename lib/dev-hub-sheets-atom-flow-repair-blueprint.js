export const DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID = 'DEV-HUB-SHEETS-ATOM-FLOW-REPAIR-BLUEPRINT-001'
export const DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CLOSEOUT_KEY = 'dev-hub-sheets-atom-flow-repair-blueprint-v1'
export const DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_PLAN_PATH = 'docs/process/dev-hub-sheets-atom-flow-repair-blueprint-001-plan.md'
export const DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-SHEETS-ATOM-FLOW-REPAIR-BLUEPRINT-001.json'
export const DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_SCRIPT_PATH = 'scripts/process-dev-hub-sheets-atom-flow-repair-blueprint-check.mjs'
export const DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CONTRACT_VERSION = 'dev-hub-sheets-atom-flow-repair-blueprint.v1'
export const DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_VISIBLE_HOME = 'Dev Hub > Data Pool > Sheets Atom Flow Blueprint'
export const SHEETS_ATOM_FLOW_REPAIR_FAMILY_ID = 'sheets'
export const SHEETS_ATOM_FLOW_REPAIR_FAMILY_LABEL = 'Sheets / Owners'

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

function sourceContractId(source = {}) {
  return text(source.sourceId || source.id || '')
}

function sourceContractById(sourceContracts = [], sourceId = '') {
  return list(sourceContracts).find(source => sourceContractId(source) === sourceId) || null
}

function actionSummaries(actions = []) {
  return list(actions)
    .map(action => ({
      label: truncate(action.label || 'Open source', 80),
      href: text(action.href),
    }))
    .filter(action => action.label || action.href)
    .slice(0, 3)
}

function summarizeContract(contract = null) {
  if (!contract) {
    return {
      present: false,
      title: '',
      unitName: '',
      status: '',
      validation: '',
      owner: '',
      location: '',
      scope: '',
      owns: '',
      accessMethod: '',
      lastVerified: '',
      manualRefresh: '',
      actions: [],
    }
  }
  return {
    present: true,
    sourceId: sourceContractId(contract),
    title: truncate(contract.title || contract.name || sourceContractId(contract), 120),
    unitName: truncate(contract.unitName || '', 120),
    status: truncate(contract.status || '', 100),
    validation: truncate(contract.validation || contract.validationStatus || '', 120),
    owner: truncate(contract.owner || '', 80),
    location: truncate(contract.location || '', 120),
    scope: truncate(contract.scope || '', 120),
    owns: truncate(contract.owns || '', 220),
    accessMethod: truncate(contract.accessMethod || '', 100),
    lastVerified: text(contract.lastVerified || ''),
    manualRefresh: truncate(contract.manualRefresh || contract.refreshSchedule || '', 180),
    actions: actionSummaries(contract.actions),
  }
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
    noActionRouteProposal: true,
    noAtomWrites: true,
    noFactWrites: true,
    noSynthesisWrite: true,
    noSheetRead: true,
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

function repairKeyForSource(sourceId = '') {
  const suffix = text(sourceId)
    .replace(/^SRC-/, '')
    .replace(/-001$/, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `source-maturity:${suffix.toLowerCase()}:atom-flow-repair`
}

function buildRepairPhases(candidate = {}, contract = {}) {
  return [
    {
      phaseId: 'contract-boundary',
      label: 'Confirm source contract',
      status: contract.present ? 'ready' : 'blocked',
      detail: contract.present
        ? `${contract.status || 'contract present'}; owner=${contract.owner || 'unknown'}; scope=${contract.scope || 'not listed'}`
        : 'Missing source contract; do not repair atom flow until source ownership is explicit.',
    },
    {
      phaseId: 'approved-read',
      label: 'Approved source read',
      status: 'approval_required',
      detail: 'A later repair card may perform an approved read-only Sheets check. This blueprint starts zero sheet reads.',
    },
    {
      phaseId: 'atom-fact-map',
      label: 'Map atom/fact payload',
      status: 'approval_required',
      detail: truncate(contract.owns || candidate.currentProblem || 'Map source-owned fields into atom/fact payloads before writing.', 220),
    },
    {
      phaseId: 'write-fresh-atoms',
      label: 'Write fresh atoms/facts',
      status: 'approval_required',
      detail: 'Atom/fact writes must be handled by a separate approved mutation card with exact source IDs.',
    },
    {
      phaseId: 'refresh-after-write',
      label: 'Refresh synthesis later',
      status: 'approval_required',
      detail: 'Synthesis refresh, route proposal, and route apply stay separate from this source-flow blueprint.',
    },
  ]
}

function buildBlueprintGates(rows = []) {
  return [
    {
      gateId: 'sheets-family-selected',
      label: 'Sheets / Owners family selected',
      status: rows.length ? 'ready' : 'blocked',
      detail: `${rows.length} Sheets / Owners source candidate(s) are visible from Business Atom Flow Preflight.`,
    },
    {
      gateId: 'source-contracts-present',
      label: 'Source contracts present',
      status: rows.length && rows.every(row => row.sourceContractPresent) ? 'ready' : 'blocked',
      detail: `${rows.filter(row => row.sourceContractPresent).length}/${rows.length} source contract(s) matched by exact source ID.`,
    },
    {
      gateId: 'separate-source-read',
      label: 'Separate source read required',
      status: 'approval_required',
      detail: 'No Google Sheets read, connector probe, sync, or extraction starts from this blueprint.',
    },
    {
      gateId: 'separate-write-card',
      label: 'Separate atom/fact write card required',
      status: 'approval_required',
      detail: 'Actual atom and fact writes are internal mutations and need their own proof card.',
    },
    {
      gateId: 'downstream-separation',
      label: 'Synthesis and routing separated',
      status: 'approval_required',
      detail: 'Do not refresh synthesis, propose routes, approve routes, or apply routes from this blueprint.',
    },
  ]
}

function candidateIsSheets(candidate = {}) {
  return candidate.familyId === SHEETS_ATOM_FLOW_REPAIR_FAMILY_ID ||
    text(candidate.familyLabel).toLowerCase() === SHEETS_ATOM_FLOW_REPAIR_FAMILY_LABEL.toLowerCase()
}

function buildBlueprintRow(candidate = {}, index = 0, sourceContracts = []) {
  const sourceId = text(candidate.sourceId)
  const contract = summarizeContract(sourceContractById(sourceContracts, sourceId))
  const readyForBlueprint = Boolean(sourceId && contract.present && candidate.readyForRepairCard === true)
  return {
    blueprintId: `sheets-atom-flow-blueprint:${sourceId || index + 1}`,
    rank: index + 1,
    sourceId,
    title: truncate(candidate.title || contract.title || sourceId || 'Sheets source', 130),
    familyId: SHEETS_ATOM_FLOW_REPAIR_FAMILY_ID,
    familyLabel: SHEETS_ATOM_FLOW_REPAIR_FAMILY_LABEL,
    repairKey: repairKeyForSource(sourceId || `${index + 1}`),
    businessStatus: text(candidate.businessStatus || 'waiting_on_atom_flow'),
    waitingRoutes: count(candidate.waitingRoutes),
    currentProblem: truncate(candidate.currentProblem || 'Source has stale atom flow.', 220),
    sourceContractPresent: contract.present,
    sourceContract: contract,
    stages: {
      extracted: candidate.stages?.extracted === true,
      atomized: candidate.stages?.atomized === true,
      synthesized: candidate.stages?.synthesized === true,
      routed: candidate.stages?.routed === true,
      resolved: candidate.stages?.resolved === true,
    },
    metrics: {
      extractedItems: count(candidate.metrics?.extractedItems),
      sharedArtifacts: count(candidate.metrics?.sharedArtifacts),
      atomSignals: count(candidate.metrics?.atomSignals),
      atomCandidateSignals: count(candidate.metrics?.atomCandidateSignals),
      synthesisFactSignals: count(candidate.metrics?.synthesisFactSignals),
      routeSignals: count(candidate.metrics?.routeSignals),
      pendingRouteSignals: count(candidate.metrics?.pendingRouteSignals),
      appliedRouteSignals: count(candidate.metrics?.appliedRouteSignals),
    },
    repairPhases: buildRepairPhases(candidate, contract),
    readyForBlueprint,
    approvalRequired: true,
    sourceReadApprovalRequired: true,
    internalWriteRequired: true,
    downstreamRefreshRequired: true,
    operatorBoundary: 'Blueprint only. Source read, atom/fact writes, synthesis refresh, route proposal, route apply, Scoper work, and Harlan sends require separate approval.',
    status: 'proposal_only',
    autoCreated: false,
    autoPromoted: false,
    appliedNow: false,
    sourceReadStartedNow: false,
    sourceSyncStartedNow: false,
    extractionStartedNow: false,
    connectorProbeStartedNow: false,
    routeMutatedNow: false,
    actionRouteProposedNow: false,
    atomRowsWrittenNow: false,
    factRowsWrittenNow: false,
    synthesisRowsWrittenNow: false,
    backlogCardCreatedNow: false,
    scoperCardCreatedNow: false,
    portfolioRecordCreatedNow: false,
    harlanSentNow: false,
    externalWriteNow: false,
  }
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.blueprintSourceCount) <= 0) {
    return 'No Sheets / Owners atom-flow blueprint rows are ready from the current preflight.'
  }
  return `${count(summary.blueprintSourceCount)} Sheets / Owners source(s) now have a proposal-only atom-flow repair blueprint with ${count(summary.sourceContractMatchedCount)} exact source contract match(es). This panel started ${count(summary.sheetReadsStarted)} sheet read(s) and wrote ${count(summary.atomRowsWrittenByReadback)} atom row(s).`
}

export function buildDevHubSheetsAtomFlowRepairBlueprint({
  generatedAt = new Date().toISOString(),
  businessAtomFlowPreflight = {},
  sourceContracts = [],
  maxSources = 6,
} = {}) {
  const generatedAtIso = toIso(generatedAt)
  const candidates = list(businessAtomFlowPreflight.candidates)
    .filter(candidateIsSheets)
    .slice(0, maxSources)
  const rows = candidates.map((candidate, index) => buildBlueprintRow(candidate, index, sourceContracts))

  const summary = {
    targetFamilyId: SHEETS_ATOM_FLOW_REPAIR_FAMILY_ID,
    targetFamilyLabel: SHEETS_ATOM_FLOW_REPAIR_FAMILY_LABEL,
    preflightTargetFamilyId: text(businessAtomFlowPreflight.summary?.targetFamilyId || ''),
    preflightTargetFamilyLabel: text(businessAtomFlowPreflight.summary?.targetFamilyLabel || ''),
    candidateSourceCount: count(businessAtomFlowPreflight.summary?.candidateSourceCount),
    blueprintSourceCount: rows.length,
    readyBlueprintCount: rows.filter(row => row.readyForBlueprint).length,
    sourceContractMatchedCount: rows.filter(row => row.sourceContractPresent).length,
    missingSourceContractCount: rows.filter(row => !row.sourceContractPresent).length,
    approvalBoundBlueprintCount: rows.filter(row => row.approvalRequired).length,
    sourceReadApprovalRequiredCount: rows.filter(row => row.sourceReadApprovalRequired).length,
    internalWriteRequiredCount: rows.filter(row => row.internalWriteRequired).length,
    suggestedRepairCardsCreatedByReadback: 0,
    backlogRecordsWrittenByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsWrittenByReadback: 0,
    currentSprintMutationsByReadback: 0,
    approvalRecordsWrittenByReadback: 0,
    routeMutationsByReadback: 0,
    actionRoutesProposedByReadback: 0,
    atomRowsWrittenByReadback: 0,
    factRowsWrittenByReadback: 0,
    synthesisRowsWrittenByReadback: 0,
    sheetReadsStarted: 0,
    extractionRunsStarted: 0,
    connectorProbesStarted: 0,
    sourceSyncsStarted: 0,
    modelCallsStarted: 0,
    harlanSendsByReadback: 0,
    externalWritesByReadback: 0,
  }

  const failures = []
  if (businessAtomFlowPreflight.ok !== true) failures.push('business_atom_flow_preflight_not_healthy')
  if (businessAtomFlowPreflight.source?.targetRepairId !== 'business-source-atom-flow-repair') failures.push('wrong_upstream_repair_target')
  if (rows.some(row => row.status !== 'proposal_only' || row.autoCreated || row.autoPromoted || row.appliedNow)) failures.push('blueprint_not_proposal_only')
  if (rows.some(row => !row.sourceId || !row.sourceContractPresent)) failures.push('source_contract_match_missing')
  if (summary.suggestedRepairCardsCreatedByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0) failures.push('cards_created_by_readback')
  if (summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.currentSprintMutationsByReadback !== 0 || summary.approvalRecordsWrittenByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.routeMutationsByReadback !== 0 || summary.actionRoutesProposedByReadback !== 0) failures.push('route_mutated_by_readback')
  if (summary.atomRowsWrittenByReadback !== 0 || summary.factRowsWrittenByReadback !== 0 || summary.synthesisRowsWrittenByReadback !== 0) failures.push('intelligence_rows_written_by_readback')
  if (summary.sheetReadsStarted !== 0 || summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.sourceSyncsStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('source_runtime_started_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : rows.length ? 'blueprint_ready' : 'healthy',
    contractVersion: DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CONTRACT_VERSION,
    cardId: DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID,
    closeoutKey: DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CLOSEOUT_KEY,
    generatedAt: generatedAtIso,
    visibleHome: DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_VISIBLE_HOME,
    source: {
      reusedTruthLayers: [
        'businessAtomFlowPreflight',
        'sourceContracts',
      ],
      targetFamilyId: SHEETS_ATOM_FLOW_REPAIR_FAMILY_ID,
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    blueprintGates: buildBlueprintGates(rows),
    blueprintRows: rows,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubSheetsAtomFlowRepairBlueprint(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['blueprint_ready', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.targetFamilyId !== SHEETS_ATOM_FLOW_REPAIR_FAMILY_ID) failures.push('target_family_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  const layers = list(snapshot.source?.reusedTruthLayers)
  for (const layer of ['businessAtomFlowPreflight', 'sourceContracts']) {
    if (!layers.includes(layer)) failures.push(`source_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'proposalOnly', 'noCardCreate', 'noBacklogMutation', 'noScoperMutation', 'noPortfolioMutation', 'noRouteMutation', 'noActionRouteProposal', 'noAtomWrites', 'noFactWrites', 'noSynthesisWrite', 'noSheetRead', 'noConnectorProbe', 'noSourceSync', 'noLiveExtraction', 'noModelCalls', 'noHarlanSend', 'noExternalWrites', 'noAutoBuild', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const rows = list(snapshot.blueprintRows)
  if (rows.length > 6) failures.push('blueprint_rows_unbounded')
  if (list(snapshot.blueprintGates).length > 6) failures.push('blueprint_gates_unbounded')
  if (count(snapshot.summary?.blueprintSourceCount) !== rows.length) failures.push('blueprint_count_mismatch')
  if (count(snapshot.summary?.readyBlueprintCount) > count(snapshot.summary?.blueprintSourceCount)) failures.push('ready_count_exceeds_blueprints')
  for (const row of rows) {
    if (row.status !== 'proposal_only') failures.push('blueprint_not_proposal_only')
    if (row.autoCreated !== false || row.autoPromoted !== false || row.appliedNow !== false) failures.push('blueprint_not_proposal_only')
    if (row.sourceReadStartedNow !== false || row.sourceSyncStartedNow !== false || row.extractionStartedNow !== false || row.connectorProbeStartedNow !== false) failures.push('source_runtime_started_by_readback')
    if (row.routeMutatedNow !== false || row.actionRouteProposedNow !== false) failures.push('route_mutated_by_readback')
    if (row.atomRowsWrittenNow !== false || row.factRowsWrittenNow !== false || row.synthesisRowsWrittenNow !== false) failures.push('intelligence_rows_written_by_readback')
    if (row.backlogCardCreatedNow !== false || row.scoperCardCreatedNow !== false || row.portfolioRecordCreatedNow !== false) failures.push('cards_created_by_readback')
    if (row.harlanSentNow !== false || row.externalWriteNow !== false) failures.push('external_write_by_readback')
    if (!text(row.sourceId) || !text(row.title) || !text(row.operatorBoundary)) failures.push('blueprint_missing_operator_context')
    if (row.sourceContractPresent !== true || row.sourceContract?.present !== true) failures.push('source_contract_match_missing')
    if (!list(row.repairPhases).some(phase => phase.phaseId === 'write-fresh-atoms' && phase.status === 'approval_required')) failures.push('write_phase_boundary_missing')
  }
  if (count(snapshot.summary?.suggestedRepairCardsCreatedByReadback) !== 0 || count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0) failures.push('cards_created_by_readback')
  if (count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.currentSprintMutationsByReadback) !== 0 || count(snapshot.summary?.approvalRecordsWrittenByReadback) !== 0) failures.push('destination_records_written_by_readback')
  if (count(snapshot.summary?.routeMutationsByReadback) !== 0 || count(snapshot.summary?.actionRoutesProposedByReadback) !== 0) failures.push('route_mutated_by_readback')
  if (count(snapshot.summary?.atomRowsWrittenByReadback) !== 0 || count(snapshot.summary?.factRowsWrittenByReadback) !== 0 || count(snapshot.summary?.synthesisRowsWrittenByReadback) !== 0) failures.push('intelligence_rows_written_by_readback')
  if (count(snapshot.summary?.sheetReadsStarted) !== 0 || count(snapshot.summary?.extractionRunsStarted) !== 0 || count(snapshot.summary?.connectorProbesStarted) !== 0 || count(snapshot.summary?.sourceSyncsStarted) !== 0 || count(snapshot.summary?.modelCallsStarted) !== 0) failures.push('source_runtime_started_by_readback')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0 || count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('external_write_by_readback')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubSheetsAtomFlowRepairBlueprintDogfoodProof() {
  const businessAtomFlowPreflight = {
    ok: true,
    source: {
      targetRepairId: 'business-source-atom-flow-repair',
    },
    summary: {
      targetFamilyId: SHEETS_ATOM_FLOW_REPAIR_FAMILY_ID,
      targetFamilyLabel: SHEETS_ATOM_FLOW_REPAIR_FAMILY_LABEL,
      candidateSourceCount: 2,
    },
    candidates: [
      {
        sourceId: 'SRC-OWNERS-001',
        title: 'Owners Dashboard',
        familyId: SHEETS_ATOM_FLOW_REPAIR_FAMILY_ID,
        familyLabel: SHEETS_ATOM_FLOW_REPAIR_FAMILY_LABEL,
        businessStatus: 'waiting_on_atom_flow',
        waitingRoutes: 2,
        currentProblem: 'Atom flow stale.',
        readyForRepairCard: true,
        stages: { extracted: true, atomized: false, synthesized: false, routed: true, resolved: false },
        metrics: { extractedItems: 7, atomSignals: 1, routeSignals: 2, pendingRouteSignals: 2 },
      },
      {
        sourceId: 'SRC-FREEDOM-BHAG-001',
        title: 'BHAG Builder',
        familyId: SHEETS_ATOM_FLOW_REPAIR_FAMILY_ID,
        familyLabel: SHEETS_ATOM_FLOW_REPAIR_FAMILY_LABEL,
        businessStatus: 'waiting_on_atom_flow',
        waitingRoutes: 1,
        currentProblem: 'Dashboard reads exist; fresh atom flow is stale.',
        readyForRepairCard: true,
        stages: { extracted: true, atomized: false, synthesized: false, routed: true, resolved: false },
        metrics: { extractedItems: 4, atomSignals: 1, routeSignals: 1, pendingRouteSignals: 1 },
      },
    ],
  }
  const sourceContracts = [
    {
      sourceId: 'SRC-OWNERS-001',
      title: 'Benson Crew - Owners Dashboard',
      unitName: 'ADMIN ONLY - Deal Data Entry',
      status: 'Signed Off',
      validation: 'Signed Off',
      owner: 'Steve + Carson',
      location: 'Workbook tab with downstream roll-up dependencies',
      scope: 'Primary deal-ledger validation unit',
      owns: 'Deal lifecycle, attribution, split credit, and Follow Up Boss linkage.',
      accessMethod: 'Google Drive / Google Sheets',
      lastVerified: '2026-04-16',
      manualRefresh: 'Refresh Live Data button in BHAG and live doc views.',
    },
    {
      sourceId: 'SRC-FREEDOM-BHAG-001',
      title: 'Benson Crew - Freedom Sheet',
      unitName: 'Benson Crew Bhag Builder',
      status: 'Current reality captured',
      validation: 'Signed Off For Current Reality',
      owner: 'System',
      location: 'Benson Crew Bhag Builder',
      scope: 'Long-range planning blocks plus calculator ranges',
      owns: 'Sales targets, growth curve, community targets, and deal math.',
      accessMethod: 'Google Drive / Google Sheets',
      lastVerified: '2026-04-18',
      manualRefresh: 'Refresh Live Data button in BHAG and live doc views.',
    },
  ]
  const snapshot = buildDevHubSheetsAtomFlowRepairBlueprint({
    generatedAt: '2026-05-31T07:29:01.000Z',
    businessAtomFlowPreflight,
    sourceContracts,
  })
  const validation = validateDevHubSheetsAtomFlowRepairBlueprint(snapshot)
  const unsafeCreated = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      suggestedRepairCardsCreatedByReadback: 1,
      atomRowsWrittenByReadback: 2,
      sheetReadsStarted: 1,
    },
    blueprintRows: snapshot.blueprintRows.map((row, index) => index === 0
      ? { ...row, status: 'created', autoCreated: true, atomRowsWrittenNow: true, sourceReadStartedNow: true, backlogCardCreatedNow: true }
      : row),
  }
  const unsafeValidation = validateDevHubSheetsAtomFlowRepairBlueprint(unsafeCreated)
  return {
    ok: validation.ok &&
      snapshot.status === 'blueprint_ready' &&
      snapshot.summary.blueprintSourceCount === 2 &&
      snapshot.summary.sourceContractMatchedCount === 2 &&
      snapshot.summary.sheetReadsStarted === 0 &&
      snapshot.blueprintRows.every(row => row.status === 'proposal_only' && row.sourceContractPresent === true && row.internalWriteRequired === true) &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('blueprint_not_proposal_only') &&
      unsafeValidation.failures.includes('cards_created_by_readback') &&
      unsafeValidation.failures.includes('intelligence_rows_written_by_readback') &&
      unsafeValidation.failures.includes('source_runtime_started_by_readback'),
    validation,
    unsafeValidation,
    snapshot,
    invariant: 'Sheets atom-flow blueprint keeps exact source-contract repair rows proposal-only and rejects card creation, source reads, runtime starts, or intelligence writes.',
  }
}
