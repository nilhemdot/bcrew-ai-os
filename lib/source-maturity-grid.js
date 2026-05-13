import {
  DEFAULT_ATOM_FLOW_WINDOW_HOURS,
  buildAtomFlowStatus,
} from './atom-flow-auto-demotion.js'

export const SOURCE_MATURITY_GRID_CARD_ID = 'SOURCE-MATURITY-GRID-001'
export const SOURCE_MATURITY_GRID_CLOSEOUT_KEY = 'source-maturity-grid-v1'
export const SOURCE_MATURITY_GRID_PLAN_PATH = 'docs/process/source-maturity-grid-001-plan.md'
export const SOURCE_MATURITY_GRID_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-GRID-001.json'
export const SOURCE_MATURITY_GRID_SCRIPT_PATH = 'scripts/process-source-maturity-grid-check.mjs'
export const SOURCE_MATURITY_GRID_SUMMARY_MARKER = 'SOURCE_MATURITY_GRID_SUMMARY'

export const SOURCE_MATURITY_STAGE_KEYS = [
  'connected',
  'trusted',
  'monitored',
  'extracted',
  'atomized',
  'synthesized',
  'routed',
]

export const SOURCE_MATURITY_STAGE_DEFINITIONS = [
  {
    key: 'connected',
    label: 'Connected',
    definition: 'A real source contract exists and the source is not merely a proposed, gap, or not-connected placeholder.',
  },
  {
    key: 'trusted',
    label: 'Trusted',
    definition: 'The source has a signed-off, readable, verified, or current-reality trust boundary.',
  },
  {
    key: 'monitored',
    label: 'Monitored',
    definition: 'The source has a live/scheduled extraction target, explicit refresh method, or governed manual review boundary.',
  },
  {
    key: 'extracted',
    label: 'Extracted',
    definition: 'The source has archived artifacts, extracted rows/content, or current-reality source facts with provenance.',
  },
  {
    key: 'atomized',
    label: 'Atomized',
    definition: 'The source has promoted intelligence atoms or source-backed atom candidates available to the memory spine.',
  },
  {
    key: 'synthesized',
    label: 'Synthesized',
    definition: 'The source contributes facts or synthesized items to the governed synthesis layer.',
  },
  {
    key: 'routed',
    label: 'Routed',
    definition: 'The source contributes to approval-gated action routes, decisions, backlog tasks, questions, or owner actions.',
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function bySourceId(rows = []) {
  return new Map(normalizeList(rows).map(row => [row.sourceId || row.source_id, row]).filter(([sourceId]) => Boolean(sourceId)))
}

function targetsForSource(extractionControl = {}, sourceId) {
  return normalizeList(extractionControl.coverageByTarget || extractionControl.targets)
    .filter(target => target.sourceId === sourceId || target.source_id === sourceId)
}

function sourceCoverage(sharedCommunicationsCoverage = {}, sourceId) {
  return normalizeList(sharedCommunicationsCoverage.sources).find(source => source.sourceId === sourceId) || null
}

function hasUsableContract(contract) {
  const status = normalizeLower(contract.status)
  const validation = normalizeLower(contract.validation)
  if (!contract.sourceId) return false
  if (status.includes('gap') || status.includes('scoped, not connected')) return false
  if (validation.includes('not signed off') && status.includes('pending revalidation')) return false
  return true
}

function hasTrustBoundary(contract) {
  const status = normalizeLower(contract.status)
  const validation = normalizeLower(contract.validation)
  return [
    'signed off',
    'readable only',
    'verified',
    'current reality',
    'source boundary locked',
  ].some(token => status.includes(token) || validation.includes(token))
}

function hasManualMonitoring(contract) {
  return Boolean(
    normalizeText(contract.updateMethod) ||
    normalizeText(contract.refreshSchedule) ||
    normalizeText(contract.manualRefresh)
  )
}

function hasTargetMonitoring(targets) {
  return targets.some(target => {
    const status = normalizeLower(target.status)
    const runtime = normalizeLower(target.runtimeMode || target.effectiveRuntimeMode)
    const schedule = normalizeLower(target.schedulerMode || target.scheduleStatus || target.scheduleTruth)
    return status === 'active' || runtime === 'scheduled' || schedule === 'scheduled'
  })
}

function countTargetMetric(targets, key) {
  return targets.reduce((sum, target) => {
    const counts = target.counts || target.itemSummary || {}
    return sum + Number(target[key] || counts[key] || 0)
  }, 0)
}

function latestTargetSuccess(targets) {
  return targets
    .map(target => normalizeText(target.lastSuccessAt || target.lastRunAt || target.updatedAt))
    .filter(Boolean)
    .sort()
    .pop() || null
}

function coverageCandidateCount(coverage) {
  if (!coverage) return 0
  return Object.entries(coverage.candidateTypes || {})
    .filter(([key]) => key.includes('atom_candidate'))
    .reduce((sum, [, count]) => sum + Number(count || 0), 0)
}

function operationalCount(map, sourceId, fields) {
  const row = map.get(sourceId)
  if (!row) return 0
  return fields.reduce((sum, field) => sum + Number(row[field] || 0), 0)
}

function buildStage(ok, detail, evidenceRefs = []) {
  return {
    ok: Boolean(ok),
    status: ok ? 'complete' : 'gap',
    detail,
    evidenceRefs: normalizeList(evidenceRefs),
  }
}

function firstGap(stages, deferred) {
  if (deferred) return 'deferred'
  return SOURCE_MATURITY_STAGE_KEYS.find(key => !stages[key]?.ok) || 'complete'
}

function rowTone(nextGap) {
  if (nextGap === 'complete') return 'connected'
  if (nextGap === 'deferred') return 'pending'
  if (['connected', 'trusted', 'monitored'].includes(nextGap)) return 'missing'
  return 'pending'
}

export function buildSourceMaturityGridSnapshot({
  sources = [],
  extractionControl = {},
  sharedCommunicationsCoverage = {},
  intelligenceSynthesisFacts = {},
  intelligenceSynthesis = {},
  intelligenceActionRouter = {},
  sourceMaturityOperational = {},
  lifecycle = {},
  atomFlowWindowHours = DEFAULT_ATOM_FLOW_WINDOW_HOURS,
  now = new Date(),
} = {}) {
  const atomMap = bySourceId(sourceMaturityOperational.atomsBySource)
  const factMap = bySourceId(sourceMaturityOperational.factsBySource || intelligenceSynthesisFacts.factsBySource)
  const synthesizedMap = bySourceId(sourceMaturityOperational.synthesizedItemsBySource)
  const routeMap = bySourceId(sourceMaturityOperational.routesBySource)
  const lifecycleMap = bySourceId(lifecycle.sources)
  const latestSynthesisSourceIds = new Set(normalizeList(intelligenceSynthesis.latestRun?.sourceIds))
  const latestRouteSourceIds = new Set(normalizeList(intelligenceActionRouter.latestRun?.sourceIds))

  const rows = normalizeList(sources).map(contract => {
    const sourceId = contract.sourceId
    const targets = targetsForSource(extractionControl, sourceId)
    const coverage = sourceCoverage(sharedCommunicationsCoverage, sourceId)
    const lifecycleRow = lifecycleMap.get(sourceId) || {}
    const lifecycleParked = lifecycleRow.lifecycle?.parked === 'yes'
    const contractBlocked = ['gap', 'scoped, not connected'].some(token => normalizeLower(contract.status).includes(token))
    const deferred = lifecycleParked || contractBlocked
    const targetSuccesses = targets.filter(target => target.lastSuccessAt || target.lastStatus === 'succeeded')
    const extractedItems = countTargetMetric(targets, 'extractedCount') +
      countTargetMetric(targets, 'archivedCount') +
      countTargetMetric(targets, 'succeededItems')
    const coverageArtifacts = Number(coverage?.totalArtifacts || 0)
    const atomCount = operationalCount(atomMap, sourceId, ['activeAtoms', 'totalAtoms'])
    const atomMetricRow = atomMap.get(sourceId) || {}
    const atomCandidateCount = coverageCandidateCount(coverage)
    const factCount = operationalCount(factMap, sourceId, ['activeFacts', 'totalFacts', 'total'])
    const synthesizedCount = operationalCount(synthesizedMap, sourceId, ['activeSynthesizedItems', 'totalSynthesizedItems'])
    const routeCount = operationalCount(routeMap, sourceId, ['activeRoutes', 'totalRoutes'])
    const extractedOk = extractedItems > 0 || coverageArtifacts > 0 || factCount > 0
    const atomFlow = buildAtomFlowStatus({
      sourceId,
      extractedOk,
      activeAtoms: atomCount,
      atomCandidateSignals: atomCandidateCount,
      latestAtomAt: atomMetricRow.latestAtomAt,
      now,
      windowHours: atomFlowWindowHours,
    })

    const stages = {
      connected: buildStage(
        hasUsableContract(contract),
        hasUsableContract(contract)
          ? `${sourceId} has a usable source contract.`
          : `${sourceId} is still proposed, blocked, or not connected.`,
        ['lib/source-contracts.js'],
      ),
      trusted: buildStage(
        hasTrustBoundary(contract),
        hasTrustBoundary(contract)
          ? contract.validation || contract.status
          : 'No signed-off/readable/current-reality trust boundary yet.',
        [contract.validation || contract.status].filter(Boolean),
      ),
      monitored: buildStage(
        hasTargetMonitoring(targets) || hasManualMonitoring(contract),
        targets.length
          ? `${targets.length} extraction target${targets.length === 1 ? '' : 's'} visible.`
          : hasManualMonitoring(contract)
            ? contract.refreshSchedule || contract.updateMethod || contract.manualRefresh
            : 'No runtime target or refresh boundary visible.',
        targets.map(target => target.targetKey).slice(0, 4),
      ),
      extracted: buildStage(
        extractedOk,
        extractedItems > 0 || coverageArtifacts > 0
          ? `${extractedItems} extracted/archived crawl item signals and ${coverageArtifacts} shared artifact signals.`
          : factCount > 0
            ? `${factCount} source facts provide current-reality extraction proof.`
            : 'No extracted artifacts or source facts visible.',
        [latestTargetSuccess(targets), coverage?.lastIngestedAt].filter(Boolean),
      ),
      atomized: buildStage(
        (atomCount > 0 || atomCandidateCount > 0) && !atomFlow.demoteAtomized,
        atomFlow.demoteAtomized
          ? atomFlow.reason
          : atomCount > 0
          ? `${atomCount} intelligence atom signals.`
          : atomCandidateCount > 0
            ? `${atomCandidateCount} atom candidate signals.`
            : 'No atom or atom-candidate signal visible.',
        atomCount > 0 ? ['intelligence_atoms'] : atomCandidateCount > 0 ? ['shared_communication_candidates'] : [],
      ),
      synthesized: buildStage(
        factCount > 0 || synthesizedCount > 0 || latestSynthesisSourceIds.has(sourceId),
        factCount > 0 || synthesizedCount > 0
          ? `${factCount} synthesis fact signals and ${synthesizedCount} synthesized item signals.`
          : latestSynthesisSourceIds.has(sourceId)
            ? 'Included in the latest synthesis run source list.'
            : 'No governed synthesis contribution visible.',
        factCount > 0 ? ['intelligence_synthesis_facts'] : latestSynthesisSourceIds.has(sourceId) ? ['latest synthesis run'] : [],
      ),
      routed: buildStage(
        routeCount > 0 || latestRouteSourceIds.has(sourceId),
        routeCount > 0
          ? `${routeCount} action route signals.`
          : latestRouteSourceIds.has(sourceId)
            ? 'Included in the latest Action Router run source list.'
            : 'No action route signal visible.',
        routeCount > 0 ? ['intelligence_action_routes'] : [],
      ),
    }

    const nextGap = firstGap(stages, deferred)
    return {
      sourceId,
      title: contract.title,
      unitName: contract.unitName,
      owner: contract.owner,
      group: contract.group,
      status: contract.status,
      validation: contract.validation,
      accessMethod: contract.accessMethod,
      deferred,
      lifecycleStage: lifecycleRow.lifecycleStage || null,
      nextGap,
      tone: rowTone(nextGap),
      targetKeys: targets.map(target => target.targetKey),
      latestSuccessAt: latestTargetSuccess(targets),
      metrics: {
        extractionTargets: targets.length,
        extractedItems,
        sharedArtifacts: coverageArtifacts,
        atomSignals: atomCount,
        atomCandidateSignals: atomCandidateCount,
        latestAtomAt: atomMetricRow.latestAtomAt || null,
        synthesisFactSignals: factCount,
        synthesizedItemSignals: synthesizedCount,
        routeSignals: routeCount,
      },
      atomFlow,
      stages,
    }
  })

  const stageCounts = SOURCE_MATURITY_STAGE_KEYS.reduce((acc, key) => {
    acc[key] = rows.filter(row => row.stages[key]?.ok).length
    return acc
  }, {})
  const gapRows = rows.filter(row => row.nextGap !== 'complete' && row.nextGap !== 'deferred')
  const deferredRows = rows.filter(row => row.deferred)

  return {
    generatedAt: new Date().toISOString(),
    cardId: SOURCE_MATURITY_GRID_CARD_ID,
    closeoutKey: SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
    definitions: SOURCE_MATURITY_STAGE_DEFINITIONS,
    stageKeys: SOURCE_MATURITY_STAGE_KEYS,
    rows,
    summary: {
      sourceCount: rows.length,
      completeSources: rows.filter(row => row.nextGap === 'complete').length,
      deferredSources: deferredRows.length,
      gapSources: gapRows.length,
      stageCounts,
      atomFlowWindowHours,
      staleAtomFlowSources: rows.filter(row => row.atomFlow?.status === 'stale').length,
      healthyAtomFlowSources: rows.filter(row => row.atomFlow?.status === 'healthy').length,
      loadBearingSourceCount: rows.filter(row => !row.deferred).length,
      firstGapCounts: SOURCE_MATURITY_STAGE_KEYS.reduce((acc, key) => {
        acc[key] = rows.filter(row => row.nextGap === key).length
        return acc
      }, {}),
    },
    topGaps: gapRows.slice(0, 12).map(row => ({
      sourceId: row.sourceId,
      title: row.title,
      nextGap: row.nextGap,
      detail: row.stages[row.nextGap]?.detail || '',
    })),
  }
}

export function buildSyntheticSourceMaturityGridProof() {
  const sources = [
    {
      sourceId: 'SRC-ONE-001',
      title: 'Complete Source',
      unitName: 'Complete unit',
      status: 'Verified Readable',
      validation: 'Signed Off',
      accessMethod: 'API',
      owner: 'System',
      updateMethod: 'Scheduled',
    },
    {
      sourceId: 'SRC-TWO-001',
      title: 'Gap Source',
      unitName: 'Gap unit',
      status: 'Gap',
      validation: 'Not Signed Off',
      accessMethod: 'TBD',
      owner: 'System',
    },
  ]
  const grid = buildSourceMaturityGridSnapshot({
    sources,
    extractionControl: {
      coverageByTarget: [
        {
          targetKey: 'complete-target',
          sourceId: 'SRC-ONE-001',
          status: 'active',
          runtimeMode: 'scheduled',
          lastStatus: 'succeeded',
          lastSuccessAt: '2026-05-12T12:00:00.000Z',
          counts: { succeededItems: 4 },
        },
      ],
    },
    sharedCommunicationsCoverage: {
      sources: [
        {
          sourceId: 'SRC-ONE-001',
          totalArtifacts: 4,
          candidateTypes: { 'atom_candidate:pending': 2 },
        },
      ],
    },
    intelligenceSynthesisFacts: {
      factsBySource: [{ sourceId: 'SRC-ONE-001', total: 3 }],
    },
    intelligenceSynthesis: {
      latestRun: { sourceIds: ['SRC-ONE-001'] },
    },
    intelligenceActionRouter: {
      latestRun: { sourceIds: [] },
    },
    sourceMaturityOperational: {
      atomsBySource: [{ sourceId: 'SRC-ONE-001', activeAtoms: 2, latestAtomAt: '2026-05-12T12:30:00.000Z' }],
      synthesizedItemsBySource: [{ sourceId: 'SRC-ONE-001', activeSynthesizedItems: 1 }],
      routesBySource: [{ sourceId: 'SRC-ONE-001', activeRoutes: 1 }],
    },
    now: new Date('2026-05-12T13:00:00.000Z'),
    lifecycle: {
      sources: [
        { sourceId: 'SRC-TWO-001', lifecycle: { parked: 'yes' }, lifecycleStage: 'accepted_blocked' },
      ],
    },
  })

  const completeRow = grid.rows.find(row => row.sourceId === 'SRC-ONE-001')
  const deferredRow = grid.rows.find(row => row.sourceId === 'SRC-TWO-001')
  return {
    ok: grid.rows.length === 2 &&
      completeRow?.nextGap === 'complete' &&
      deferredRow?.nextGap === 'deferred' &&
      SOURCE_MATURITY_STAGE_KEYS.every(key => completeRow.stages[key]?.ok) &&
      grid.summary.completeSources === 1 &&
      grid.summary.deferredSources === 1,
    summary: grid.summary,
    completeRow,
    deferredRow,
  }
}
