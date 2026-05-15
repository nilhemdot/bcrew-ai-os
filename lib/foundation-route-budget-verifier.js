import {
  SOURCE_OF_TRUTH_PERF_BUDGET_CARD_ID,
  buildSourceOfTruthRouteDogfoodProof,
  evaluateSourceOfTruthRouteBudget,
} from './source-of-truth-payload.js'
import {
  FOUNDATION_HUB_PAYLOAD_EXTRACT_CARD_ID,
  buildFoundationHubPayloadDogfoodProof,
  evaluateFoundationHubPayloadBudget,
} from './foundation-hub-summary-payload.js'

export const VERIFIER_ROUTE_BUDGET_MODULE_SPLIT_CARD_ID = 'VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001'
export const FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY = 'foundation-route-budget-cleanup-v1'
export const FOUNDATION_ROUTE_BUDGET_CLEANUP_CARD_IDS = [
  SOURCE_OF_TRUTH_PERF_BUDGET_CARD_ID,
  FOUNDATION_HUB_PAYLOAD_EXTRACT_CARD_ID,
]

function findCard(cards = [], cardId) {
  return (Array.isArray(cards) ? cards : []).find(card => card?.id === cardId) || null
}

function sourceRouteCacheStatus(sourceOfTruth = {}) {
  return sourceOfTruth?.kpiHealth?.routeCache?.cacheStatus || 'missing'
}

export function evaluateFoundationRouteBudgetVerifier({
  cards = [],
  closeout = null,
  sourceOfTruth = {},
  foundationHubSummary = {},
  packageScripts = {},
  serverSource = '',
  kpiHealthSource = '',
  sourceOfTruthPayloadSource = '',
  foundationHubSummaryPayloadSource = '',
  foundationRouteBudgetCleanupScriptSource = '',
  sourceDurationMs = 100,
  sourcePayloadBytes = 0,
  foundationHubPayloadBytes = 0,
} = {}) {
  const sourceCard = findCard(cards, SOURCE_OF_TRUTH_PERF_BUDGET_CARD_ID)
  const hubCard = findCard(cards, FOUNDATION_HUB_PAYLOAD_EXTRACT_CARD_ID)
  const sourceOfTruthDogfood = buildSourceOfTruthRouteDogfoodProof()
  const foundationHubPayloadDogfood = buildFoundationHubPayloadDogfoodProof()
  const sourceOfTruthPayloadBudget = evaluateSourceOfTruthRouteBudget({
    durationMs: sourceDurationMs,
    bytes: sourcePayloadBytes,
  })
  const foundationHubPayloadBudget = evaluateFoundationHubPayloadBudget({
    bytes: foundationHubPayloadBytes,
  })

  const sourceOk = Boolean(
    sourceCard &&
      sourceCard.lane === 'done' &&
      String(sourceCard.statusNote || '').includes(FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY) &&
      sourceOfTruthDogfood.ok === true &&
      sourceOfTruthPayloadBudget.ok === true &&
      sourceOfTruth.kpiHealth?.summary?.probeSilent === false &&
      ['memory', 'persisted', 'refreshed'].includes(sourceRouteCacheStatus(sourceOfTruth)) &&
      packageScripts?.['process:foundation-route-budget-cleanup-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-route-budget-cleanup-check.mjs' &&
      serverSource.includes('buildSourceOfTruthPayload') &&
      kpiHealthSource.includes('getCachedSafeKpiHealthSnapshot') &&
      kpiHealthSource.includes('KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS') &&
      sourceOfTruthPayloadSource.includes('buildSourceOfTruthRouteDogfoodProof') &&
      foundationRouteBudgetCleanupScriptSource.includes('source-of-truth dogfood rejects old over-latency measurement')
  )
  const hubOk = Boolean(
    hubCard &&
      hubCard.lane === 'done' &&
      String(hubCard.statusNote || '').includes(FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY) &&
      foundationHubPayloadDogfood.ok === true &&
      foundationHubPayloadBudget.ok === true &&
      foundationHubSummary.foundationJobs?.fullPayloadCompacted === true &&
      foundationHubSummary.foundation1100Review?.fullPayloadCompacted === true &&
      foundationHubSummary.researchCuration?.fullPayloadCompacted === true &&
      foundationHubSummary.researchCuration?.cards?.length <= 12 &&
      serverSource.includes('compactFoundationJobRunSnapshot') &&
      serverSource.includes('compactFoundationReviewSprintSnapshot') &&
      serverSource.includes('compactResearchCurationSnapshot') &&
      foundationHubSummaryPayloadSource.includes('buildFoundationHubPayloadDogfoodProof') &&
      foundationRouteBudgetCleanupScriptSource.includes('Foundation Hub dogfood rejects old over-budget payload')
  )
  const closeoutOk = Boolean(
    closeout?.operatorCloseout === true &&
      FOUNDATION_ROUTE_BUDGET_CLEANUP_CARD_IDS.every(id => (closeout.backlogIds || []).includes(id))
  )

  return {
    ok: sourceOk && hubOk && closeoutOk,
    sourceOk,
    hubOk,
    closeoutOk,
    sourceCard,
    hubCard,
    closeout,
    sourceOfTruthDogfood,
    foundationHubPayloadDogfood,
    sourceOfTruthPayloadBudget,
    foundationHubPayloadBudget,
    summary: {
      cardCount: [sourceCard, hubCard].filter(Boolean).length,
      sourceBytes: sourceOfTruthPayloadBudget.bytes,
      sourceDurationMs: sourceOfTruthPayloadBudget.durationMs,
      hubBytes: foundationHubPayloadBudget.bytes,
      sourceCacheStatus: sourceRouteCacheStatus(sourceOfTruth),
      closeoutKey: closeout?.key || closeout?.closeoutKey || null,
    },
  }
}

function buildSyntheticInput(overrides = {}) {
  return {
    cards: [
      {
        id: SOURCE_OF_TRUTH_PERF_BUDGET_CARD_ID,
        lane: 'done',
        statusNote: `Closed under ${FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY}.`,
      },
      {
        id: FOUNDATION_HUB_PAYLOAD_EXTRACT_CARD_ID,
        lane: 'done',
        statusNote: `Closed under ${FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY}.`,
      },
    ],
    closeout: {
      operatorCloseout: true,
      key: FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY,
      backlogIds: FOUNDATION_ROUTE_BUDGET_CLEANUP_CARD_IDS,
    },
    sourceOfTruth: {
      kpiHealth: {
        summary: { probeSilent: false },
        routeCache: { cacheStatus: 'memory' },
      },
    },
    foundationHubSummary: {
      foundationJobs: { fullPayloadCompacted: true },
      foundation1100Review: { fullPayloadCompacted: true },
      researchCuration: { fullPayloadCompacted: true, cards: new Array(5).fill({}) },
    },
    packageScripts: {
      'process:foundation-route-budget-cleanup-check': 'node --env-file-if-exists=.env scripts/process-foundation-route-budget-cleanup-check.mjs',
    },
    serverSource: 'buildSourceOfTruthPayload compactFoundationJobRunSnapshot compactFoundationReviewSprintSnapshot compactResearchCurationSnapshot',
    kpiHealthSource: 'getCachedSafeKpiHealthSnapshot KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS',
    sourceOfTruthPayloadSource: 'buildSourceOfTruthRouteDogfoodProof',
    foundationHubSummaryPayloadSource: 'buildFoundationHubPayloadDogfoodProof',
    foundationRouteBudgetCleanupScriptSource: 'source-of-truth dogfood rejects old over-latency measurement Foundation Hub dogfood rejects old over-budget payload',
    sourceDurationMs: 120,
    sourcePayloadBytes: 134_000,
    foundationHubPayloadBytes: 720_000,
    ...overrides,
  }
}

export function buildFoundationRouteBudgetVerifierDogfoodProof() {
  const passing = evaluateFoundationRouteBudgetVerifier(buildSyntheticInput())
  const overLatencySource = evaluateFoundationRouteBudgetVerifier(buildSyntheticInput({
    sourceDurationMs: 2_489,
  }))
  const overBudgetHub = evaluateFoundationRouteBudgetVerifier(buildSyntheticInput({
    foundationHubPayloadBytes: 872_726,
  }))

  return {
    ok: passing.ok === true &&
      overLatencySource.sourceOk === false &&
      overLatencySource.sourceOfTruthPayloadBudget.ok === false &&
      overBudgetHub.hubOk === false &&
      overBudgetHub.foundationHubPayloadBudget.ok === false,
    passing,
    overLatencySource,
    overBudgetHub,
    invariant: 'Route-budget verifier module accepts healthy measurements and rejects the old source latency and Foundation Hub payload failures.',
  }
}
