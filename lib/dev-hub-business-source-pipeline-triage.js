export const DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID = 'DEV-HUB-BUSINESS-SOURCE-PIPELINE-TRIAGE-001'
export const DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CLOSEOUT_KEY = 'dev-hub-business-source-pipeline-triage-v1'
export const DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_PLAN_PATH = 'docs/process/dev-hub-business-source-pipeline-triage-001-plan.md'
export const DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-BUSINESS-SOURCE-PIPELINE-TRIAGE-001.json'
export const DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_SCRIPT_PATH = 'scripts/process-dev-hub-business-source-pipeline-triage-check.mjs'
export const DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CONTRACT_VERSION = 'dev-hub-business-source-pipeline-triage.v1'
export const DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_VISIBLE_HOME = 'Dev Hub > Data Pool > Business Sources'

const FAMILY_DEFINITIONS = [
  {
    familyId: 'crm',
    label: 'FUB / CRM',
    pattern: /\b(fub|follow up boss|crm)\b/i,
    action: 'Prove CRM facts become atoms, synthesis, and reviewable routes before using them for build recommendations.',
  },
  {
    familyId: 'kpi',
    label: 'KPI / Supabase',
    pattern: /\b(kpi|supabase)\b/i,
    action: 'Separate readable KPI storage from fresh source-backed atom and route flow.',
  },
  {
    familyId: 'sheets',
    label: 'Sheets / Owners',
    pattern: /\b(gsheets|google sheets|sheet|owners|freedom|finance|bhag)\b/i,
    action: 'Repair stale sheet-derived atom flow before treating dashboards as live intelligence.',
  },
  {
    familyId: 'clickup',
    label: 'ClickUp',
    pattern: /\bclickup\b/i,
    action: 'Keep ClickUp as read-only source truth until fresh atom and route flow is proven.',
  },
  {
    familyId: 'drive',
    label: 'Drive / Docs',
    pattern: /\b(gdrive|drive|gdocs|google docs)\b/i,
    action: 'Turn extracted/shared artifacts into promoted atoms before calling Drive intelligence connected.',
  },
]

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

function truncate(value, maxChars = 180) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function rowHaystack(row = {}) {
  return `${row.sourceId || ''} ${row.title || ''} ${row.unitName || ''} ${row.owner || ''} ${row.group || ''}`
}

function classifyFamily(row = {}) {
  const haystack = rowHaystack(row)
  return FAMILY_DEFINITIONS.find(family => family.pattern.test(haystack)) || null
}

function sourceLooksBusiness(row = {}) {
  return Boolean(classifyFamily(row))
}

function stageOk(row = {}, key) {
  return row.pipelineStages?.[key]?.ok === true
}

function waitingRoutes(row = {}) {
  return count(row.metrics?.pendingRouteSignals) + count(row.metrics?.approvedRouteSignals)
}

function hasExtractedOnly(row = {}) {
  const extracted = count(row.metrics?.extractedItems) + count(row.metrics?.sharedArtifacts)
  const atoms = count(row.metrics?.atomSignals) + count(row.metrics?.atomCandidateSignals)
  return extracted > 0 && atoms === 0
}

function hasStaleAtomFlow(row = {}) {
  const detail = `${row.detail || ''} ${row.pipelineStages?.atomized?.detail || ''}`
  return row.firstGap === 'atomized' || /stale|no atom|atom flow|freshness/i.test(detail)
}

function businessStatusForRow(row = {}) {
  if (row.pipelineState === 'foundation_done' && !hasStaleAtomFlow(row) && !hasExtractedOnly(row)) return 'resolved'
  if (hasExtractedOnly(row)) return 'extracted_not_atomized'
  if (hasStaleAtomFlow(row)) return 'waiting_on_atom_flow'
  if (row.firstGap === 'synthesized') return 'waiting_on_synthesis'
  if (row.firstGap === 'routed') return 'waiting_on_route'
  if (row.firstGap === 'resolved' || waitingRoutes(row) > 0) return 'waiting_on_route_review'
  if (row.firstGap === 'extracted') return 'needs_extraction'
  if (row.firstGap === 'deferred') return 'parked'
  return 'needs_source_flow'
}

function statusLabel(value = '') {
  return text(value).replace(/[_-]+/g, ' ')
}

function compactBusinessRow(row = {}) {
  const family = classifyFamily(row)
  const status = businessStatusForRow(row)
  return {
    sourceId: text(row.sourceId),
    title: truncate(row.title || row.sourceId || 'Business source', 120),
    familyId: family?.familyId || 'business_other',
    familyLabel: family?.label || 'Business Other',
    owner: text(row.owner),
    firstGap: text(row.firstGap || 'unknown'),
    pipelineState: text(row.pipelineState || row.firstGap || 'unknown'),
    businessStatus: status,
    businessStatusLabel: statusLabel(status),
    detail: truncate(row.detail || row.pipelineStages?.[row.firstGap]?.detail || 'Pipeline state is not complete.', 180),
    waitingRoutes: waitingRoutes(row),
    appliedRoutes: count(row.metrics?.appliedRouteSignals),
    metrics: {
      extractedItems: count(row.metrics?.extractedItems),
      sharedArtifacts: count(row.metrics?.sharedArtifacts),
      atomSignals: count(row.metrics?.atomSignals),
      atomCandidateSignals: count(row.metrics?.atomCandidateSignals),
      synthesisFactSignals: count(row.metrics?.synthesisFactSignals),
      synthesizedItemSignals: count(row.metrics?.synthesizedItemSignals),
      routeSignals: count(row.metrics?.routeSignals),
      pendingRouteSignals: count(row.metrics?.pendingRouteSignals),
      approvedRouteSignals: count(row.metrics?.approvedRouteSignals),
      appliedRouteSignals: count(row.metrics?.appliedRouteSignals),
    },
    stages: {
      extracted: stageOk(row, 'extracted'),
      atomized: stageOk(row, 'atomized'),
      synthesized: stageOk(row, 'synthesized'),
      routed: stageOk(row, 'routed'),
      resolved: stageOk(row, 'resolved'),
    },
  }
}

function urgency(row = {}) {
  if (row.businessStatus === 'extracted_not_atomized') return 0
  if (row.businessStatus === 'waiting_on_atom_flow') return 1
  if (row.businessStatus === 'waiting_on_synthesis') return 2
  if (row.businessStatus === 'waiting_on_route') return 3
  if (row.businessStatus === 'waiting_on_route_review') return 4
  if (row.businessStatus === 'parked') return 8
  if (row.businessStatus === 'resolved') return 9
  return 5
}

function familyStatus(rows = []) {
  if (!rows.length) return 'missing'
  if (rows.every(row => row.businessStatus === 'resolved')) return 'resolved'
  if (rows.some(row => row.businessStatus === 'extracted_not_atomized')) return 'extracted_not_atomized'
  if (rows.some(row => row.businessStatus === 'waiting_on_atom_flow')) return 'waiting_on_atom_flow'
  if (rows.some(row => row.businessStatus === 'waiting_on_synthesis')) return 'waiting_on_synthesis'
  if (rows.some(row => row.businessStatus === 'waiting_on_route')) return 'waiting_on_route'
  if (rows.some(row => row.businessStatus === 'waiting_on_route_review')) return 'waiting_on_route_review'
  if (rows.some(row => row.businessStatus === 'parked')) return 'parked'
  return 'needs_source_flow'
}

function buildFamilyBuckets(rows = []) {
  return FAMILY_DEFINITIONS
    .map(family => {
      const familyRows = rows.filter(row => row.familyId === family.familyId)
      const status = familyStatus(familyRows)
      return {
        familyId: family.familyId,
        label: family.label,
        count: familyRows.length,
        status,
        statusLabel: statusLabel(status),
        waitingRoutes: familyRows.reduce((sum, row) => sum + count(row.waitingRoutes), 0),
        staleOrExtractedOnly: familyRows.filter(row => row.businessStatus === 'waiting_on_atom_flow' || row.businessStatus === 'extracted_not_atomized').length,
        resolved: familyRows.filter(row => row.businessStatus === 'resolved').length,
        action: family.action,
      }
    })
    .filter(bucket => bucket.count > 0)
}

function buildBoundaries() {
  return {
    readOnly: true,
    proposalOnly: true,
    noConnectorProbe: true,
    noSourceSync: true,
    noLiveExtraction: true,
    noAtomWrites: true,
    noFactWrites: true,
    noSynthesisWrite: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noBacklogMutation: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noApprovalMutation: true,
    noModelCalls: true,
    noHarlanSend: true,
    noExternalWrites: true,
    noAutoPromoteRecommendations: true,
  }
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.staleAtomFlowCount) > 0 || count(summary.extractedNotAtomizedCount) > 0) {
    return `${count(summary.dashboardOnlyOrStaleCount)} business source(s) are connected or extracted but not flowing cleanly into current atoms; ${count(summary.waitingRoutes)} route(s) are still waiting for review or apply.`
  }
  if (count(summary.waitingRoutes) > 0) {
    return `${count(summary.waitingRoutes)} business-source route(s) are waiting; do not count the family done until applied-route proof exists.`
  }
  return `${count(summary.resolvedCount)} of ${count(summary.businessSourceCount)} business source(s) have applied-route proof.`
}

export function buildDevHubBusinessSourcePipelineTriage({
  generatedAt = new Date().toISOString(),
  foundationDoneBar = {},
  maxRows = 16,
} = {}) {
  const generatedAtIso = toIso(generatedAt)
  const businessRows = list(foundationDoneBar.rows)
    .filter(sourceLooksBusiness)
    .map(compactBusinessRow)
    .sort((left, right) => urgency(left) - urgency(right) || text(left.title).localeCompare(text(right.title)))
  const rows = businessRows.slice(0, maxRows)
  const familyBuckets = buildFamilyBuckets(businessRows)
  const extractedNotAtomized = businessRows.filter(row => row.businessStatus === 'extracted_not_atomized')
  const staleAtomFlow = businessRows.filter(row => row.businessStatus === 'waiting_on_atom_flow')
  const waitingRouteRows = businessRows.filter(row => count(row.waitingRoutes) > 0 || row.businessStatus === 'waiting_on_route_review')
  const resolvedRows = businessRows.filter(row => row.businessStatus === 'resolved')
  const dashboardOnlyOrStaleCount = businessRows.filter(row => ['extracted_not_atomized', 'waiting_on_atom_flow', 'needs_extraction'].includes(row.businessStatus)).length
  const summary = {
    businessSourceCount: businessRows.length,
    familyCount: familyBuckets.length,
    extractedCount: businessRows.filter(row => row.stages.extracted).length,
    atomizedCurrentCount: businessRows.filter(row => row.stages.atomized && row.businessStatus !== 'waiting_on_atom_flow' && row.businessStatus !== 'extracted_not_atomized').length,
    staleAtomFlowCount: staleAtomFlow.length,
    extractedNotAtomizedCount: extractedNotAtomized.length,
    synthesizedCount: businessRows.filter(row => row.stages.synthesized).length,
    routedCount: businessRows.filter(row => row.stages.routed).length,
    resolvedCount: resolvedRows.length,
    completeSources: businessRows.filter(row => row.pipelineState === 'foundation_done').length,
    waitingRoutes: businessRows.reduce((sum, row) => sum + count(row.waitingRoutes), 0),
    dashboardOnlyOrStaleCount,
    extractionRunsStarted: 0,
    connectorProbesStarted: 0,
    autoMutationCount: 0,
    atomRowsWrittenByReadback: 0,
    factRowsWrittenByReadback: 0,
    synthesisRowsWrittenByReadback: 0,
    routeMutationsByReadback: 0,
    destinationWritesByReadback: 0,
    backlogRecordsWrittenByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsWrittenByReadback: 0,
    harlanSendsByReadback: 0,
    externalWritesByReadback: 0,
  }
  const failures = []
  if (foundationDoneBar.ok !== true) failures.push('foundation_done_bar_not_healthy')
  if (businessRows.length === 0) failures.push('business_sources_missing')
  if (businessRows.some(row => row.pipelineState === 'foundation_done' && ['waiting_on_atom_flow', 'extracted_not_atomized', 'needs_extraction'].includes(row.businessStatus))) failures.push('stale_source_marked_complete')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0) failures.push('source_runtime_started_by_readback')
  if (summary.atomRowsWrittenByReadback !== 0 || summary.factRowsWrittenByReadback !== 0 || summary.synthesisRowsWrittenByReadback !== 0) failures.push('intelligence_rows_written_by_readback')
  if (summary.routeMutationsByReadback !== 0 || summary.destinationWritesByReadback !== 0) failures.push('route_or_destination_mutated_by_readback')
  if (summary.backlogRecordsWrittenByReadback !== 0 || summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : dashboardOnlyOrStaleCount > 0 || summary.waitingRoutes > 0 ? 'needs_source_flow' : 'healthy',
    contractVersion: DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CONTRACT_VERSION,
    cardId: DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID,
    closeoutKey: DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CLOSEOUT_KEY,
    generatedAt: generatedAtIso,
    visibleHome: DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_VISIBLE_HOME,
    source: {
      reusedTruthLayer: 'foundationDoneBar',
      sourceRoute: '/api/foundation/source-maturity-grid',
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    familyBuckets: familyBuckets.slice(0, 6),
    queues: {
      staleAtomFlow: staleAtomFlow.slice(0, 8),
      extractedNotAtomized: extractedNotAtomized.slice(0, 6),
      waitingRoutes: waitingRouteRows.slice(0, 8),
      nextFamilies: familyBuckets.filter(bucket => bucket.status !== 'resolved').slice(0, 6),
    },
    rows,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubBusinessSourcePipelineTriage(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['needs_source_flow', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.reusedTruthLayer !== 'foundationDoneBar') failures.push('foundation_done_bar_source_missing')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'proposalOnly', 'noConnectorProbe', 'noSourceSync', 'noLiveExtraction', 'noAtomWrites', 'noFactWrites', 'noSynthesisWrite', 'noRouteMutation', 'noDestinationMutation', 'noBacklogMutation', 'noScoperMutation', 'noPortfolioMutation', 'noModelCalls', 'noHarlanSend', 'noExternalWrites', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  if (count(snapshot.summary?.businessSourceCount) < list(snapshot.rows).length) failures.push('business_source_count_less_than_rows')
  if (list(snapshot.rows).length > 16) failures.push('rows_unbounded')
  if (list(snapshot.familyBuckets).length > 6) failures.push('family_buckets_unbounded')
  if (list(snapshot.queues?.staleAtomFlow).length > 8) failures.push('stale_atom_queue_unbounded')
  if (list(snapshot.queues?.extractedNotAtomized).length > 6) failures.push('extracted_not_atomized_queue_unbounded')
  if (list(snapshot.queues?.waitingRoutes).length > 8) failures.push('waiting_routes_queue_unbounded')
  if (list(snapshot.queues?.nextFamilies).length > 6) failures.push('next_families_queue_unbounded')
  if (count(snapshot.summary?.completeSources) > count(snapshot.summary?.resolvedCount)) failures.push('complete_exceeds_resolved')
  if (list(snapshot.rows).some(row => row.pipelineState === 'foundation_done' && ['waiting_on_atom_flow', 'extracted_not_atomized', 'needs_extraction'].includes(row.businessStatus))) failures.push('stale_source_marked_complete')
  if (count(snapshot.summary?.extractionRunsStarted) !== 0 || count(snapshot.summary?.connectorProbesStarted) !== 0) failures.push('source_runtime_started_by_readback')
  if (count(snapshot.summary?.atomRowsWrittenByReadback) !== 0 || count(snapshot.summary?.factRowsWrittenByReadback) !== 0 || count(snapshot.summary?.synthesisRowsWrittenByReadback) !== 0) failures.push('intelligence_rows_written_by_readback')
  if (count(snapshot.summary?.routeMutationsByReadback) !== 0 || count(snapshot.summary?.destinationWritesByReadback) !== 0) failures.push('route_or_destination_mutated_by_readback')
  if (count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsWrittenByReadback) !== 0) failures.push('destination_records_written_by_readback')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0 || count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('external_write_by_readback')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubBusinessSourcePipelineTriageDogfoodProof() {
  const foundationDoneBar = {
    ok: true,
    rows: [
      {
        sourceId: 'SRC-FUB-001',
        title: 'Follow Up Boss',
        firstGap: 'atomized',
        pipelineState: 'atomized',
        detail: 'Source atom flow stale 309.7h.',
        metrics: {
          extractedItems: 6,
          atomSignals: 1,
          routeSignals: 4,
          pendingRouteSignals: 2,
        },
        pipelineStages: {
          extracted: { ok: true },
          atomized: { ok: false, detail: 'Atom flow stale.' },
          synthesized: { ok: false },
          routed: { ok: true },
          resolved: { ok: false },
        },
      },
      {
        sourceId: 'SRC-GDRIVE-001',
        title: 'Google Drive',
        firstGap: 'atomized',
        pipelineState: 'atomized',
        detail: '908 extracted items and 198 shared artifacts, but no atom signal visible.',
        metrics: {
          extractedItems: 908,
          sharedArtifacts: 198,
          atomSignals: 0,
          routeSignals: 0,
        },
        pipelineStages: {
          extracted: { ok: true },
          atomized: { ok: false, detail: 'No atom signal visible.' },
          synthesized: { ok: false },
          routed: { ok: false },
          resolved: { ok: false },
        },
      },
      {
        sourceId: 'SRC-SUPABASE-001',
        title: 'Supabase KPI Store',
        firstGap: 'complete',
        pipelineState: 'foundation_done',
        detail: 'Extracted, atomized, synthesized, routed, and resolved.',
        metrics: {
          extractedItems: 2,
          atomSignals: 2,
          synthesisFactSignals: 1,
          routeSignals: 1,
          appliedRouteSignals: 1,
        },
        pipelineStages: {
          extracted: { ok: true },
          atomized: { ok: true },
          synthesized: { ok: true },
          routed: { ok: true },
          resolved: { ok: true },
        },
      },
    ],
  }
  const snapshot = buildDevHubBusinessSourcePipelineTriage({
    generatedAt: '2026-05-31T06:42:00.000Z',
    foundationDoneBar,
  })
  const validation = validateDevHubBusinessSourcePipelineTriage(snapshot)
  const unsafeFalseGreen = {
    ...snapshot,
    rows: snapshot.rows.map(row => row.sourceId === 'SRC-FUB-001'
      ? { ...row, pipelineState: 'foundation_done' }
      : row),
  }
  const unsafeMutation = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      atomRowsWrittenByReadback: 1,
      routeMutationsByReadback: 1,
      externalWritesByReadback: 1,
    },
  }
  const falseGreenValidation = validateDevHubBusinessSourcePipelineTriage(unsafeFalseGreen)
  const mutationValidation = validateDevHubBusinessSourcePipelineTriage(unsafeMutation)
  return {
    ok: validation.ok &&
      snapshot.status === 'needs_source_flow' &&
      snapshot.summary.businessSourceCount === 3 &&
      snapshot.summary.staleAtomFlowCount >= 1 &&
      snapshot.summary.extractedNotAtomizedCount >= 1 &&
      snapshot.summary.waitingRoutes === 2 &&
      falseGreenValidation.ok === false &&
      falseGreenValidation.failures.includes('stale_source_marked_complete') &&
      mutationValidation.ok === false &&
      mutationValidation.failures.includes('intelligence_rows_written_by_readback') &&
      mutationValidation.failures.includes('route_or_destination_mutated_by_readback') &&
      mutationValidation.failures.includes('external_write_by_readback'),
    validation,
    falseGreenValidation,
    mutationValidation,
    snapshot,
    invariant: 'Business source readback reuses Foundation Done truth, exposes stale/extracted-only flow, and rejects false complete or mutation.',
  }
}
