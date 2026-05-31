export const DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID = 'DEV-HUB-INTELLIGENCE-HYGIENE-READBACK-001'
export const DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CLOSEOUT_KEY = 'dev-hub-intelligence-hygiene-readback-v1'
export const DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_PLAN_PATH = 'docs/process/dev-hub-intelligence-hygiene-readback-001-plan.md'
export const DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-INTELLIGENCE-HYGIENE-READBACK-001.json'
export const DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_SCRIPT_PATH = 'scripts/process-dev-hub-intelligence-hygiene-readback-check.mjs'
export const DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CONTRACT_VERSION = 'dev-hub-intelligence-hygiene-readback.v1'
export const DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_VISIBLE_HOME = 'Dev Hub > Data Pool > Intelligence Hygiene'

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

function buildBoundaries() {
  return {
    readOnly: true,
    noAtomWrites: true,
    noFactWrites: true,
    noChunkWrites: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noBacklogMutation: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noApprovalMutation: true,
    noAutoApply: true,
    noAutoBacklogPromotion: true,
    noAutoScoperPromotion: true,
    noAutoPromoteRecommendations: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noExternalWrites: true,
    noHarlanSend: true,
  }
}

function compactSourceGap(row = {}) {
  return {
    sourceId: text(row.sourceId),
    title: truncate(row.title || row.sourceId || 'Source gap', 120),
    firstGap: text(row.firstGap || row.pipelineState || 'gap'),
    tone: text(row.tone || 'gap'),
    detail: truncate(row.detail || 'Pipeline gap visible.', 200),
    waitingRoutes: count(row.waitingRoutes || row.metrics?.pendingRouteSignals),
    appliedRoutes: count(row.appliedRoutes || row.metrics?.appliedRouteSignals),
  }
}

function sourcePipelineQueue(foundationDoneBar = {}) {
  const rows = list(foundationDoneBar.rows)
  const topGaps = list(foundationDoneBar.topGaps)
  const merged = [
    ...topGaps,
    ...rows.filter(row => ['atomized', 'routed', 'resolved'].includes(text(row.firstGap || row.pipelineState))),
  ]
  const seen = new Set()
  return merged
    .map(compactSourceGap)
    .filter(row => {
      const key = row.sourceId || row.title
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 8)
}

function routeNoiseQueue(actionRouteReadback = {}) {
  const safetyItems = list(actionRouteReadback.applySafety?.items)
    .filter(item =>
      count(item.duplicateClusterCount) > 0 ||
        ['red', 'yellow'].includes(text(item.stalenessSeverity))
    )
    .map(item => ({
      id: text(item.reviewItemId || item.routeId),
      title: truncate(item.title || item.routeId || 'Route review item', 120),
      state: text(item.safetyState || item.reviewState || 'review_required'),
      duplicateClusterCount: count(item.duplicateClusterCount),
      stalenessSeverity: text(item.stalenessSeverity || 'none'),
      routeId: text(item.routeId),
      owner: text(item.owner),
    }))
  if (safetyItems.length) return safetyItems.slice(0, 6)
  const summary = actionRouteReadback.summary || {}
  if (count(summary.needsReviewItems) <= 0) return []
  return [{
    id: 'action-route-review-pressure',
    title: `${count(summary.needsReviewItems)} action-route review item(s) need cleanup`,
    state: 'review_required',
    duplicateClusterCount: count(summary.duplicateOrStaleReviewItems),
    stalenessSeverity: count(summary.agedNeedsReviewItems) > 0 ? 'yellow' : 'none',
    routeId: '',
    owner: 'Foundation Process',
  }]
}

function scoperParkedQueue(scoperEvidenceTraceReadback = {}) {
  return list(scoperEvidenceTraceReadback.candidates)
    .filter(candidate => candidate.readyForPortfolio !== true)
    .map(candidate => ({
      rank: count(candidate.rank),
      title: truncate(candidate.title || 'Build recommendation', 140),
      sourceTraceStatus: text(candidate.sourceTraceStatus || 'missing'),
      scoperStatus: text(candidate.scoperStatus || 'needs_research'),
      parkedReason: truncate(candidate.parkedReason || 'Needs source trace before Scoper can call it ready.', 180),
      sourceReportArtifactId: text(candidate.sourceReportArtifactId),
    }))
    .slice(0, 5)
}

function sourceFamilyBlockerQueue(sourceFamilyGodModeMaturity = {}) {
  return list(sourceFamilyGodModeMaturity.families)
    .filter(family =>
      ['blocked', 'waiting_for_extractor', 'planned'].includes(text(family.maturityState)) ||
        count(family.blockers?.length) > 0 ||
        (family.capabilities?.hands && !['working', 'not_applicable', 'operator_excluded'].includes(family.capabilities.hands))
    )
    .map(family => ({
      familyId: text(family.familyId),
      label: truncate(family.label || family.familyId || 'Source family', 120),
      maturityState: text(family.maturityState || 'needs_review'),
      freshnessStatus: text(family.freshnessStatus || 'not_tracked'),
      operatorBoundary: text(family.operatorBoundary || 'source_boundary_required'),
      nextCard: text(family.nextCard),
      nextBestAction: truncate(family.nextBestAction || 'Review source-family boundary before live work.', 220),
      blockerCount: list(family.blockers).length + list(family.blockedExtractorJobKeys).length,
    }))
    .slice(0, 8)
}

function buildNextBuckets(summary = {}) {
  const buckets = []
  if (count(summary.atomizedGapSources) > 0) {
    buckets.push({
      bucketId: 'source-atom-flow',
      label: 'Atom-flow repair review',
      count: count(summary.atomizedGapSources),
      action: 'Use fresh source-backed evidence before writing new atoms; do not create false freshness from old facts.',
    })
  }
  if (count(summary.routeReviewItems) > 0) {
    buckets.push({
      bucketId: 'action-route-cleanup',
      label: 'Action-route cleanup',
      count: count(summary.routeReviewItems),
      action: 'Review, duplicate/link, reject, snooze, or explicitly apply only through separate confirmed operator action.',
    })
  }
  if (count(summary.scoperParkedCandidates) > 0) {
    buckets.push({
      bucketId: 'scoper-source-trace',
      label: 'Scoper source trace',
      count: count(summary.scoperParkedCandidates),
      action: 'Resolve raw atom/hit evidence before calling the recommendation build-ready.',
    })
  }
  if (count(summary.sourceFamilyBlockedOrWaiting) > 0) {
    buckets.push({
      bucketId: 'source-family-boundaries',
      label: 'Source-family boundaries',
      count: count(summary.sourceFamilyBlockedOrWaiting),
      action: 'Keep paid/private/auth or unproven Hands work parked until exact source packet approval exists.',
    })
  }
  return buckets.slice(0, 6)
}

function buildPlainEnglish(summary = {}) {
  const total = count(summary.totalCleanupPressure)
  if (!total) return 'No Dev intelligence hygiene pressure is visible from the current read models.'
  return `${total} cleanup pressure signal(s) are visible across source pipeline gaps, route review noise, Scoper parked candidates, and source-family boundaries. This panel is read-only: it ranks what to clean next without writing atoms, routes, backlog cards, or Scoper promotions.`
}

export function buildDevHubIntelligenceHygieneReadback({
  generatedAt = new Date().toISOString(),
  foundationDoneBar = {},
  actionRouteReadback = {},
  scoperEvidenceTraceReadback = {},
  sourceFamilyGodModeMaturity = {},
} = {}) {
  const sourceQueue = sourcePipelineQueue(foundationDoneBar)
  const routeQueue = routeNoiseQueue(actionRouteReadback)
  const scoperQueue = scoperParkedQueue(scoperEvidenceTraceReadback)
  const familyQueue = sourceFamilyBlockerQueue(sourceFamilyGodModeMaturity)
  const sourceFamilySummary = sourceFamilyGodModeMaturity.summary || {}
  const routeSummary = actionRouteReadback.summary || {}
  const foundationSummary = foundationDoneBar.summary || {}
  const scoperSummary = scoperEvidenceTraceReadback.summary || {}
  const atomizedGapSources = count(foundationSummary.firstGapCounts?.atomized)
  const routeReviewItems = count(routeSummary.needsReviewItems)
  const sourceFamilyBlockedOrWaiting = count(sourceFamilySummary.blockedCount) +
    count(sourceFamilySummary.waitingForExtractorCount) +
    count(sourceFamilySummary.plannedCount)
  const summary = {
    atomizedGapSources,
    routedButUnresolvedSources: count(foundationSummary.routedButUnresolvedSources),
    waitingRoutes: count(foundationSummary.waitingRoutes),
    routeReviewItems,
    agedRouteItems: count(routeSummary.agedNeedsReviewItems),
    duplicateOrStaleRouteItems: count(routeSummary.duplicateOrStaleReviewItems),
    scoperParkedCandidates: count(scoperSummary.parkedCount),
    scoperReadyCandidates: count(scoperSummary.readyForPortfolioCount),
    sourceFamilyBlockedOrWaiting,
    sourceFamilyHandsGaps: count(sourceFamilySummary.handsGapCount),
    sourceFamilyGodModeReady: count(sourceFamilySummary.godModeReadyCount),
    autoMutationCount: 0,
  }
  summary.totalCleanupPressure = summary.atomizedGapSources +
    summary.routeReviewItems +
    summary.scoperParkedCandidates +
    summary.sourceFamilyBlockedOrWaiting
  const failures = []
  if (foundationDoneBar.ok !== true) failures.push('foundation_done_bar_not_healthy')
  if (actionRouteReadback.ok !== true) failures.push('action_route_readback_not_healthy')
  if (scoperEvidenceTraceReadback && scoperEvidenceTraceReadback.ok !== true) failures.push('scoper_trace_not_healthy')
  if (sourceFamilyGodModeMaturity.evaluation?.ok === false) failures.push('source_family_maturity_not_healthy')
  if (summary.autoMutationCount !== 0) failures.push('auto_mutation_count_not_zero')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : summary.totalCleanupPressure ? 'needs_cleanup' : 'healthy',
    contractVersion: DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CONTRACT_VERSION,
    cardId: DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID,
    closeoutKey: DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_VISIBLE_HOME,
    source: {
      reusedTruthLayers: [
        'foundationDoneBar',
        'actionRouteReadback',
        'scoperEvidenceTraceReadback',
        'sourceFamilyGodModeMaturity',
      ],
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    falseFreshnessWarning: atomizedGapSources > 0
      ? 'Atom-flow gaps need fresh source-backed evidence. Do not write new atoms from stale facts just to make freshness green.'
      : '',
    nextBuckets: buildNextBuckets(summary),
    queues: {
      sourcePipeline: sourceQueue,
      routeNoise: routeQueue,
      scoperParked: scoperQueue,
      sourceFamilyBlockers: familyQueue,
    },
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubIntelligenceHygieneReadback(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['needs_cleanup', 'healthy'].includes(snapshot.status)) failures.push('status_not_healthy_or_cleanup')
  if (snapshot.contractVersion !== DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  const layers = list(snapshot.source?.reusedTruthLayers)
  for (const layer of ['foundationDoneBar', 'actionRouteReadback', 'scoperEvidenceTraceReadback', 'sourceFamilyGodModeMaturity']) {
    if (!layers.includes(layer)) failures.push(`truth_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'noAtomWrites', 'noRouteMutation', 'noBacklogMutation', 'noScoperMutation', 'noExternalWrites', 'noHarlanSend']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  if (count(snapshot.summary?.autoMutationCount) !== 0) failures.push('auto_mutation_count_not_zero')
  if (count(snapshot.summary?.atomizedGapSources) > 0 && !text(snapshot.falseFreshnessWarning)) failures.push('false_freshness_warning_missing')
  if (list(snapshot.queues?.sourcePipeline).length > 8) failures.push('source_pipeline_queue_unbounded')
  if (list(snapshot.queues?.routeNoise).length > 6) failures.push('route_noise_queue_unbounded')
  if (list(snapshot.queues?.scoperParked).length > 5) failures.push('scoper_queue_unbounded')
  if (list(snapshot.queues?.sourceFamilyBlockers).length > 8) failures.push('source_family_queue_unbounded')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  if (!list(snapshot.nextBuckets).length && count(snapshot.summary?.totalCleanupPressure) > 0) failures.push('next_bucket_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubIntelligenceHygieneReadbackDogfoodProof() {
  const snapshot = buildDevHubIntelligenceHygieneReadback({
    generatedAt: '2026-05-31T06:00:00.000Z',
    foundationDoneBar: {
      ok: true,
      summary: {
        firstGapCounts: { atomized: 2 },
        routedButUnresolvedSources: 1,
        waitingRoutes: 7,
      },
      topGaps: [
        { sourceId: 'SRC-ATOM-STALE-001', title: 'Stale atom source', firstGap: 'atomized', detail: 'Latest atom is stale.' },
      ],
      rows: [],
    },
    actionRouteReadback: {
      ok: true,
      summary: {
        needsReviewItems: 5,
        agedNeedsReviewItems: 4,
        duplicateOrStaleReviewItems: 3,
      },
      applySafety: {
        items: [
          {
            reviewItemId: 'review:one',
            routeId: 'action-route:one',
            title: 'Repeated route',
            duplicateClusterCount: 2,
            stalenessSeverity: 'red',
            safetyState: 'operator_review_required',
          },
        ],
      },
    },
    scoperEvidenceTraceReadback: {
      ok: true,
      summary: { parkedCount: 1, readyForPortfolioCount: 2 },
      candidates: [
        {
          rank: 3,
          title: 'Parked candidate',
          readyForPortfolio: false,
          sourceTraceStatus: 'source_bundle_found_atom_missing',
          scoperStatus: 'needs_deeper_research_before_scoping',
          parkedReason: 'Raw atom missing.',
        },
      ],
    },
    sourceFamilyGodModeMaturity: {
      evaluation: { ok: true },
      summary: {
        blockedCount: 1,
        waitingForExtractorCount: 1,
        plannedCount: 1,
        handsGapCount: 2,
        godModeReadyCount: 0,
      },
      families: [
        {
          familyId: 'paid-training',
          label: 'Paid Training',
          maturityState: 'blocked',
          freshnessStatus: 'not_started',
          operatorBoundary: 'paid_private_requires_operator_approval',
          nextBestAction: 'Wait for exact packet.',
          blockers: ['Needs approval'],
        },
      ],
    },
  })
  const validation = validateDevHubIntelligenceHygieneReadback(snapshot)
  const unsafeFreshness = {
    ...snapshot,
    falseFreshnessWarning: '',
  }
  const unsafeMutation = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      autoMutationCount: 1,
    },
  }
  const unsafeFreshnessValidation = validateDevHubIntelligenceHygieneReadback(unsafeFreshness)
  const unsafeMutationValidation = validateDevHubIntelligenceHygieneReadback(unsafeMutation)
  return {
    ok: validation.ok &&
      snapshot.summary.totalCleanupPressure === 11 &&
      snapshot.nextBuckets.length >= 4 &&
      list(snapshot.queues.sourcePipeline).length === 1 &&
      list(snapshot.queues.routeNoise).length === 1 &&
      list(snapshot.queues.scoperParked).length === 1 &&
      list(snapshot.queues.sourceFamilyBlockers).length === 1 &&
      unsafeFreshnessValidation.ok === false &&
      unsafeFreshnessValidation.failures.includes('false_freshness_warning_missing') &&
      unsafeMutationValidation.ok === false &&
      unsafeMutationValidation.failures.includes('auto_mutation_count_not_zero'),
    validation,
    unsafeFreshnessValidation,
    unsafeMutationValidation,
    snapshot,
    invariant: 'Intelligence Hygiene ranks cleanup pressure from existing read models, warns against false atom freshness, and rejects mutation/auto-promotion.',
  }
}
