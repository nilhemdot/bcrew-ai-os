import {
  buildSourceMaturityGridSnapshot,
} from './source-maturity-grid.js'

export const DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID = 'DEV-HUB-FOUNDATION-DONE-BAR-001'
export const DEV_HUB_FOUNDATION_DONE_BAR_CLOSEOUT_KEY = 'dev-hub-foundation-done-bar-v1'
export const DEV_HUB_FOUNDATION_DONE_BAR_PLAN_PATH = 'docs/process/dev-hub-foundation-done-bar-001-plan.md'
export const DEV_HUB_FOUNDATION_DONE_BAR_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-FOUNDATION-DONE-BAR-001.json'
export const DEV_HUB_FOUNDATION_DONE_BAR_SCRIPT_PATH = 'scripts/process-dev-hub-foundation-done-bar-check.mjs'
export const DEV_HUB_FOUNDATION_DONE_BAR_CONTRACT_VERSION = 'dev-hub-foundation-done-bar.v1'
export const DEV_HUB_FOUNDATION_DONE_BAR_VISIBLE_HOME = 'Dev Hub > Data Pool > Foundation Done bar'
export const DEV_HUB_FOUNDATION_DONE_BAR_STAGE_KEYS = [
  'extracted',
  'atomized',
  'synthesized',
  'routed',
  'resolved',
]

export const DEV_HUB_FOUNDATION_DONE_BAR_STAGE_DEFINITIONS = [
  {
    key: 'extracted',
    label: 'Extracted',
    definition: 'The source has archived, extracted, or current-reality fact signals.',
  },
  {
    key: 'atomized',
    label: 'Atomized',
    definition: 'The source has active atoms or current atom-candidate signals available to the intelligence spine.',
  },
  {
    key: 'synthesized',
    label: 'Synthesized',
    definition: 'The source contributes facts or synthesized items to governed synthesis.',
  },
  {
    key: 'routed',
    label: 'Routed',
    definition: 'The source produced owner/reason-backed action routes or was included in the latest router run.',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    definition: 'The source has at least one applied action-route signal; pending and approved-only routes remain waiting.',
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

function compactDetail(value, fallback = '', maxChars = 180) {
  const normalized = text(value || fallback)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function buildBoundaries() {
  return {
    readOnly: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noExternalWrites: true,
    noHarlanSend: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noBacklogMutation: true,
    noApprovalMutation: true,
    noAutoApply: true,
    noAutoPromoteRecommendations: true,
    noSecondSourceTruthLayer: true,
  }
}

function stageFromSource(row = {}, key) {
  const sourceStage = row.stages?.[key] || {}
  return {
    ok: sourceStage.ok === true,
    status: sourceStage.ok === true ? 'complete' : 'gap',
    detail: compactDetail(sourceStage.detail, `No ${key} signal visible.`),
  }
}

function resolvedStage(row = {}) {
  const applied = count(row.metrics?.appliedRouteSignals)
  const pending = count(row.metrics?.pendingRouteSignals)
  const approved = count(row.metrics?.approvedRouteSignals)
  const routes = count(row.metrics?.routeSignals)
  const waiting = pending + approved
  return {
    ok: applied > 0,
    status: applied > 0 ? 'complete' : 'gap',
    detail: applied > 0
      ? `${applied} applied route signal(s).`
      : routes > 0 || waiting > 0
        ? `${waiting} route(s) still waiting; ${applied} applied.`
        : 'No applied action-route signal visible.',
  }
}

function firstPipelineGap(row = {}) {
  if (row.deferred) return 'deferred'
  const stages = row.pipelineStages || {}
  return DEV_HUB_FOUNDATION_DONE_BAR_STAGE_KEYS.find(key => stages[key]?.ok !== true) || 'complete'
}

function toneForGap(gap, row = {}) {
  if (gap === 'complete') return 'done'
  if (gap === 'deferred') return 'deferred'
  if (gap === 'resolved' && count(row.metrics?.pendingRouteSignals) + count(row.metrics?.approvedRouteSignals) > 0) return 'waiting'
  if (gap === 'routed' || gap === 'resolved') return 'review'
  return 'gap'
}

function urgency(row = {}) {
  const gap = row.firstGap
  const waiting = count(row.metrics?.pendingRouteSignals) + count(row.metrics?.approvedRouteSignals)
  if (gap === 'resolved' && waiting > 0) return 0
  if (gap === 'resolved') return 1
  if (gap === 'routed') return 2
  if (gap === 'synthesized') return 3
  if (gap === 'atomized') return 4
  if (gap === 'extracted') return 5
  return 9
}

function compactRow(row = {}) {
  const pipelineStages = {
    extracted: stageFromSource(row, 'extracted'),
    atomized: stageFromSource(row, 'atomized'),
    synthesized: stageFromSource(row, 'synthesized'),
    routed: stageFromSource(row, 'routed'),
    resolved: resolvedStage(row),
  }
  const pipelineRow = {
    sourceId: row.sourceId,
    title: row.title || row.sourceId,
    unitName: row.unitName || '',
    owner: row.owner || '',
    group: row.group || '',
    deferred: row.deferred === true,
    lifecycleStage: row.lifecycleStage || '',
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
    pipelineStages,
  }
  pipelineRow.firstGap = firstPipelineGap(pipelineRow)
  pipelineRow.pipelineState = pipelineRow.firstGap === 'complete' ? 'foundation_done' : pipelineRow.firstGap
  pipelineRow.tone = toneForGap(pipelineRow.firstGap, pipelineRow)
  pipelineRow.detail = pipelineRow.firstGap === 'complete'
    ? 'Extracted, atomized, synthesized, routed, and resolved.'
    : pipelineRow.firstGap === 'deferred'
      ? 'Source is parked or blocked.'
      : pipelineStages[pipelineRow.firstGap]?.detail || 'Pipeline gap visible.'
  return pipelineRow
}

function buildStageCounts(rows = []) {
  return DEV_HUB_FOUNDATION_DONE_BAR_STAGE_KEYS.reduce((acc, key) => {
    acc[key] = rows.filter(row => row.pipelineStages?.[key]?.ok === true).length
    return acc
  }, {})
}

function buildFirstGapCounts(rows = []) {
  return [...DEV_HUB_FOUNDATION_DONE_BAR_STAGE_KEYS, 'complete', 'deferred'].reduce((acc, key) => {
    acc[key] = rows.filter(row => row.firstGap === key).length
    return acc
  }, {})
}

function buildPlainEnglish(summary = {}) {
  const waiting = count(summary.waitingRoutes)
  const resolved = count(summary.stageCounts?.resolved)
  const sourceCount = count(summary.sourceCount)
  if (waiting > 0) {
    return `${waiting} route(s) reached routing but are not resolved; ${resolved} of ${sourceCount} source(s) have an applied route signal.`
  }
  if (resolved > 0) return `${resolved} of ${sourceCount} source(s) have reached the applied-route Foundation Done bar.`
  return `No source has reached the applied-route Foundation Done bar yet; ${sourceCount} source(s) are visible.`
}

export function buildDevHubFoundationDoneBar({
  sourceMaturityGrid = {},
  generatedAt = new Date().toISOString(),
  maxRows = 48,
  maxGaps = 10,
} = {}) {
  const generatedAtIso = toIso(generatedAt)
  const sourceRows = list(sourceMaturityGrid.rows).map(compactRow)
  const rows = sourceRows
    .slice()
    .sort((left, right) => urgency(left) - urgency(right) || text(left.title).localeCompare(text(right.title)))
    .slice(0, maxRows)
  const stageCounts = buildStageCounts(sourceRows)
  const firstGapCounts = buildFirstGapCounts(sourceRows)
  const waitingRoutes = sourceRows.reduce((sum, row) => {
    return sum + count(row.metrics?.pendingRouteSignals) + count(row.metrics?.approvedRouteSignals)
  }, 0)
  const routeReview = {
    ...(sourceMaturityGrid.summary?.routeReview || {}),
    waitingRoutes: count(sourceMaturityGrid.summary?.routeReview?.waitingRoutes) || waitingRoutes,
  }
  const summary = {
    sourceCount: sourceRows.length,
    loadBearingSourceCount: count(sourceMaturityGrid.summary?.loadBearingSourceCount) || sourceRows.filter(row => !row.deferred).length,
    completeSources: firstGapCounts.complete,
    deferredSources: firstGapCounts.deferred,
    gapSources: sourceRows.filter(row => !['complete', 'deferred'].includes(row.firstGap)).length,
    routedButUnresolvedSources: sourceRows.filter(row => row.pipelineStages?.routed?.ok === true && row.pipelineStages?.resolved?.ok !== true).length,
    waitingRouteSources: sourceRows.filter(row => count(row.metrics?.pendingRouteSignals) + count(row.metrics?.approvedRouteSignals) > 0).length,
    waitingRoutes,
    stageCounts,
    firstGapCounts,
    routeReview,
  }
  const topGaps = sourceRows
    .filter(row => !['complete', 'deferred'].includes(row.firstGap))
    .sort((left, right) => urgency(left) - urgency(right) || text(left.title).localeCompare(text(right.title)))
    .slice(0, maxGaps)
    .map(row => ({
      sourceId: row.sourceId,
      title: row.title,
      firstGap: row.firstGap,
      tone: row.tone,
      detail: row.detail,
      waitingRoutes: count(row.metrics?.pendingRouteSignals) + count(row.metrics?.approvedRouteSignals),
      appliedRoutes: count(row.metrics?.appliedRouteSignals),
    }))

  return {
    ok: true,
    status: 'healthy',
    contractVersion: DEV_HUB_FOUNDATION_DONE_BAR_CONTRACT_VERSION,
    cardId: DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID,
    closeoutKey: DEV_HUB_FOUNDATION_DONE_BAR_CLOSEOUT_KEY,
    generatedAt: generatedAtIso,
    visibleHome: DEV_HUB_FOUNDATION_DONE_BAR_VISIBLE_HOME,
    source: {
      sourceMaturityCloseoutKey: sourceMaturityGrid.closeoutKey || '',
      sourceMaturityCardId: sourceMaturityGrid.cardId || '',
      reusedTruthLayer: 'buildSourceMaturityGridSnapshot',
      sourceRoute: '/api/foundation/source-maturity-grid',
    },
    stageKeys: DEV_HUB_FOUNDATION_DONE_BAR_STAGE_KEYS,
    definitions: DEV_HUB_FOUNDATION_DONE_BAR_STAGE_DEFINITIONS,
    summary,
    plainEnglish: buildPlainEnglish(summary),
    rows,
    topGaps,
    boundaries: buildBoundaries(),
    failures: [],
  }
}

export function buildDevHubFoundationDoneBarFromInputs({
  foundationSnapshot = {},
  sourceContracts = [],
  extractionControl = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const sourceMaturityGrid = buildSourceMaturityGridSnapshot({
    sources: sourceContracts,
    extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
  })
  return buildDevHubFoundationDoneBar({
    sourceMaturityGrid,
    generatedAt,
  })
}

export function validateDevHubFoundationDoneBar(snapshot = {}) {
  const failures = []
  const rows = list(snapshot.rows)
  const stageKeys = list(snapshot.stageKeys)
  const stageCount = key => count(snapshot.summary?.stageCounts?.[key])
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (snapshot.status !== 'healthy') failures.push('status_not_healthy')
  if (snapshot.contractVersion !== DEV_HUB_FOUNDATION_DONE_BAR_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.reusedTruthLayer !== 'buildSourceMaturityGridSnapshot') failures.push('source_maturity_reuse_missing')
  if (stageKeys.join('|') !== DEV_HUB_FOUNDATION_DONE_BAR_STAGE_KEYS.join('|')) failures.push('stage_keys_mismatch')
  if (snapshot.boundaries?.readOnly !== true || snapshot.boundaries?.noExternalWrites !== true) failures.push('unsafe_boundary')
  if (snapshot.boundaries?.noRouteMutation !== true || snapshot.boundaries?.noDestinationMutation !== true) failures.push('mutation_boundary_missing')
  if (snapshot.boundaries?.noBacklogMutation !== true || snapshot.boundaries?.noAutoPromoteRecommendations !== true) failures.push('promotion_boundary_missing')
  if (rows.length > 48) failures.push('rows_unbounded')
  if (list(snapshot.topGaps).length > 10) failures.push('top_gaps_unbounded')
  if (count(snapshot.summary?.sourceCount) < rows.length) failures.push('source_count_less_than_rows')
  if (stageCount('resolved') > stageCount('routed')) failures.push('resolved_exceeds_routed')
  if (rows.some(row => DEV_HUB_FOUNDATION_DONE_BAR_STAGE_KEYS.some(key => typeof row.pipelineStages?.[key]?.ok !== 'boolean'))) failures.push('row_stage_missing')
  if (rows.some(row => row.pipelineStages?.resolved?.ok === true && count(row.metrics?.appliedRouteSignals) === 0)) failures.push('resolved_without_applied_route')
  if (rows.some(row => {
    const priorStagesDone = ['extracted', 'atomized', 'synthesized', 'routed']
      .every(key => row.pipelineStages?.[key]?.ok === true)
    return priorStagesDone && row.pipelineStages?.resolved?.ok !== true && row.firstGap !== 'resolved'
  })) failures.push('routed_unresolved_not_marked_resolved_gap')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubFoundationDoneBarDogfoodProof() {
  const sourceMaturityGrid = {
    cardId: 'SOURCE-MATURITY-GRID-001',
    closeoutKey: 'source-maturity-grid-v1',
    rows: [
      {
        sourceId: 'SRC-DONE-001',
        title: 'Done Source',
        owner: 'Dev Hub',
        group: 'dev',
        stages: {
          extracted: { ok: true, detail: '3 extracted items.' },
          atomized: { ok: true, detail: '2 atoms.' },
          synthesized: { ok: true, detail: '1 synthesis fact.' },
          routed: { ok: true, detail: '1 route: 0 pending review, 0 approved, 1 applied.' },
        },
        metrics: {
          extractedItems: 3,
          atomSignals: 2,
          synthesisFactSignals: 1,
          routeSignals: 1,
          appliedRouteSignals: 1,
        },
      },
      {
        sourceId: 'SRC-WAITING-001',
        title: 'Waiting Source',
        owner: 'Dev Hub',
        group: 'dev',
        stages: {
          extracted: { ok: true, detail: '5 extracted items.' },
          atomized: { ok: true, detail: '4 atoms.' },
          synthesized: { ok: true, detail: '2 synthesis facts.' },
          routed: { ok: true, detail: '2 routes: 2 pending review, 0 approved, 0 applied.' },
        },
        metrics: {
          extractedItems: 5,
          atomSignals: 4,
          synthesisFactSignals: 2,
          routeSignals: 2,
          pendingRouteSignals: 2,
          appliedRouteSignals: 0,
        },
      },
      {
        sourceId: 'SRC-ATOM-GAP-001',
        title: 'Atom Gap Source',
        owner: 'Foundation',
        group: 'foundation',
        stages: {
          extracted: { ok: true, detail: '1 extracted item.' },
          atomized: { ok: false, detail: 'No atom signal visible.' },
          synthesized: { ok: false, detail: 'No synthesis contribution visible.' },
          routed: { ok: false, detail: 'No action route signal visible.' },
        },
        metrics: {
          extractedItems: 1,
        },
      },
      {
        sourceId: 'SRC-PARKED-001',
        title: 'Parked Source',
        owner: 'Foundation',
        group: 'foundation',
        deferred: true,
        stages: {
          extracted: { ok: false, detail: 'No extracted artifact.' },
          atomized: { ok: false, detail: 'No atom.' },
          synthesized: { ok: false, detail: 'No synthesis.' },
          routed: { ok: false, detail: 'No route.' },
        },
        metrics: {},
      },
    ],
    summary: {
      loadBearingSourceCount: 3,
      routeReview: {
        totalRoutes: 3,
        pendingRoutes: 2,
        approvedRoutes: 0,
        appliedRoutes: 1,
        waitingRoutes: 2,
      },
    },
  }
  const snapshot = buildDevHubFoundationDoneBar({
    sourceMaturityGrid,
    generatedAt: '2026-05-31T05:00:00.000Z',
  })
  const validation = validateDevHubFoundationDoneBar(snapshot)
  const waitingRow = snapshot.rows.find(row => row.sourceId === 'SRC-WAITING-001')
  const doneRow = snapshot.rows.find(row => row.sourceId === 'SRC-DONE-001')
  const unsafeValidation = validateDevHubFoundationDoneBar({
    ...snapshot,
    boundaries: {
      ...snapshot.boundaries,
      readOnly: false,
    },
  })
  return {
    ok: validation.ok &&
      doneRow?.firstGap === 'complete' &&
      doneRow?.pipelineState === 'foundation_done' &&
      waitingRow?.firstGap === 'resolved' &&
      waitingRow?.pipelineState === 'resolved' &&
      snapshot.summary.completeSources === 1 &&
      snapshot.summary.stageCounts.routed === 2 &&
      snapshot.summary.stageCounts.resolved === 1 &&
      snapshot.summary.routedButUnresolvedSources === 1 &&
      snapshot.summary.waitingRoutes === 2 &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('unsafe_boundary'),
    validation,
    unsafeValidation,
    snapshot,
    invariant: 'Routed-but-unapplied source work remains a resolved-stage gap and never counts as Foundation done.',
  }
}
