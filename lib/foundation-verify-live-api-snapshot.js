import { SOURCE_LIFECYCLE_API_PATH } from './source-lifecycle.js'
import {
  fetchJson,
  fetchTextResponse,
  fetchTextResponseWithHostHeader,
} from './foundation-verify-runtime-support.js'

export const CRITICAL_ROOTS_UNDER_3K_PHASE_2_CARD_ID = 'CRITICAL-ROOTS-UNDER-3K-PHASE-2'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_2_CLOSEOUT_KEY = 'critical-roots-under-3k-phase-2-v1'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_2_PLAN_PATH = 'docs/process/critical-roots-under-3k-phase-2-plan.md'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_2_APPROVAL_PATH = 'docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-2.json'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_2_SCRIPT_PATH = 'scripts/process-critical-roots-under-3k-phase-2-check.mjs'
export const FOUNDATION_VERIFY_LIVE_API_SNAPSHOT_MODULE_PATH = 'lib/foundation-verify-live-api-snapshot.js'
export const FOUNDATION_VERIFY_PHASE_2_BEFORE_LINES = 4998
export const FOUNDATION_VERIFY_PHASE_2_MAX_ROOT_LINES = 4960
export const FOUNDATION_VERIFY_PHASE_2_MAX_MODULE_LINES = 1500

export const FOUNDATION_VERIFY_LIVE_API_ENDPOINTS = [
  '/api/source-of-truth',
  '/api/system-inventory',
  '/api/foundation-hub',
  '/api/foundation-hub?view=full',
  '/api/foundation/backlog',
  '/api/foundation/backlog/done-archive',
  '/api/foundation/backlog/FOUNDATION-HUB-BACKLOG-CONTRACT-001',
  '/api/foundation/current-sprint',
  '/api/foundation/action-review',
  '/api/foundation/action-route-review-inbox',
  '/api/foundation/llm-runtime?limit=100',
  '/api/foundation/build-log?limit=500',
  '/api/foundation/change-log?limit=100',
  '/api/foundation/daily-summary?date=2026-04-30&days=7',
  '/api/foundation/doc-updates',
  SOURCE_LIFECYCLE_API_PATH,
  '/api/foundation/source-maturity-grid',
  '/api/foundation/source-extraction-coverage',
  '/api/foundation/source-coverage-closeout',
  '/api/foundation/source-connector-matrix',
  '/api/foundation/connector-credential-preflight',
  '/api/foundation/source-hub-routing-matrix',
  '/api/foundation/marketing-source-map',
  '/api/foundation/brand-stack',
  '/api/foundation/tier-behavioral-completion',
  '/api/foundation/verification-runs',
  '/api/foundation/extraction-runtime-readiness',
  '/api/foundation/per-user-changelog?limit=100',
  '/api/foundation/restricted-decision-queue?limit=100',
  '/api/foundation/build-intel-watchlist',
  '/api/foundation/multimodal-extractor-contract',
  '/api/foundation/research-inbox-contract',
  '/api/foundation/control-compression',
  '/api/foundation/implementation-intelligence',
  '/api/foundation/build-intel-extraction',
  '/api/foundation/gstack-build-intel',
  '/api/foundation/changes?limit=20',
  '/api/strategic-execution/prework-coverage',
  '/api/strategic-execution/goal-truth',
  '/api/strategic-execution/operating-truth',
  '/api/strategic-execution/v2',
  '/api/ops-hub',
  '/api/owners/lead-source-governance',
  '/api/owners/review-queue',
]

function lineCount(source = '') {
  return String(source || '').split(/\r?\n/).length
}

function addFinding(findings, condition, code, detail) {
  if (!condition) findings.push({ code, detail })
}

export async function loadFoundationVerifyLiveApiSnapshot({ baseUrl }) {
  const sourceOfTruth = await fetchJson(baseUrl, '/api/source-of-truth')
  const systemInventory = await fetchJson(baseUrl, '/api/system-inventory')
  const foundationHubSummary = await fetchJson(baseUrl, '/api/foundation-hub')
  const foundationHubFull = await fetchJson(baseUrl, '/api/foundation-hub?view=full')
  const foundationLlmRuntimeApi = await fetchJson(baseUrl, '/api/foundation/llm-runtime?limit=100')
  const foundationHub = {
    ...foundationHubFull,
    ...foundationHubSummary,
    backlogItems: foundationHubFull.backlogItems || foundationHubSummary.backlogItems,
    foundation1100Review: foundationHubFull.foundation1100Review || foundationHubSummary.foundation1100Review,
    llmRuntime: foundationLlmRuntimeApi,
    fullDiagnostics: {
      ...foundationHubFull,
      llmRuntime: foundationLlmRuntimeApi,
    },
  }
  const foundationBacklogListApi = await fetchJson(baseUrl, '/api/foundation/backlog')
  const foundationBacklogDoneArchiveApi = await fetchJson(baseUrl, '/api/foundation/backlog/done-archive')
  const foundationBacklogDetailEndpointApi = await fetchJson(baseUrl, '/api/foundation/backlog/FOUNDATION-HUB-BACKLOG-CONTRACT-001')
  const foundationCurrentSprintApi = await fetchJson(baseUrl, '/api/foundation/current-sprint')
  const actionReviewApi = await fetchJson(baseUrl, '/api/foundation/action-review')
  const actionRouteReviewInboxApi = await fetchJson(baseUrl, '/api/foundation/action-route-review-inbox')
  const foundationBuildLog = await fetchJson(baseUrl, '/api/foundation/build-log?limit=500')
  const foundationChangeLog = await fetchJson(baseUrl, '/api/foundation/change-log?limit=100')
  const foundationDailySummary = await fetchJson(baseUrl, '/api/foundation/daily-summary?date=2026-04-30&days=7')
  const foundationDocUpdatesApi = await fetchJson(baseUrl, '/api/foundation/doc-updates')
  const foundationSourceLifecycle = await fetchJson(baseUrl, SOURCE_LIFECYCLE_API_PATH)
  const foundationSourceMaturityGrid = await fetchJson(baseUrl, '/api/foundation/source-maturity-grid')
  const foundationSourceExtractionCoverage = await fetchJson(baseUrl, '/api/foundation/source-extraction-coverage')
  const foundationSourceCoverageCloseout = await fetchJson(baseUrl, '/api/foundation/source-coverage-closeout')
  const foundationSourceConnectorMatrixApi = await fetchJson(baseUrl, '/api/foundation/source-connector-matrix')
  const foundationConnectorCredentialPreflightApi = await fetchJson(baseUrl, '/api/foundation/connector-credential-preflight')
  const foundationSourceHubRoutingMatrixApi = await fetchJson(baseUrl, '/api/foundation/source-hub-routing-matrix')
  const foundationMarketingSourceMap = await fetchJson(baseUrl, '/api/foundation/marketing-source-map')
  const foundationBrandStack = await fetchJson(baseUrl, '/api/foundation/brand-stack')
  const foundationTierBehavioralCompletion = await fetchJson(baseUrl, '/api/foundation/tier-behavioral-completion')
  const foundationVerificationRuns = await fetchJson(baseUrl, '/api/foundation/verification-runs')
  const foundationExtractionRuntimeReadinessApi = await fetchJson(baseUrl, '/api/foundation/extraction-runtime-readiness')
  const foundationPerUserChangelog = await fetchJson(baseUrl, '/api/foundation/per-user-changelog?limit=100')
  const foundationRestrictedDecisionQueue = await fetchJson(baseUrl, '/api/foundation/restricted-decision-queue?limit=100')
  const foundationBuildIntelWatchlist = await fetchJson(baseUrl, '/api/foundation/build-intel-watchlist')
  const foundationMultimodalExtractorContract = await fetchJson(baseUrl, '/api/foundation/multimodal-extractor-contract')
  const foundationResearchInboxContract = await fetchJson(baseUrl, '/api/foundation/research-inbox-contract')
  const foundationControlCompressionApi = await fetchJson(baseUrl, '/api/foundation/control-compression')
  const foundationImplementationIntelligenceApi = await fetchJson(baseUrl, '/api/foundation/implementation-intelligence')
  const foundationBuildIntelExtractionApi = await fetchJson(baseUrl, '/api/foundation/build-intel-extraction')
  const foundationGStackBuildIntelApi = await fetchJson(baseUrl, '/api/foundation/gstack-build-intel')
  const foundationChangesApi = await fetchJson(baseUrl, '/api/foundation/changes?limit=20')
  const strategyPreworkCoverageApi = await fetchJson(baseUrl, '/api/strategic-execution/prework-coverage')
  const strategyGoalTruthApi = await fetchJson(baseUrl, '/api/strategic-execution/goal-truth')
  const strategyOperatingTruthApi = await fetchJson(baseUrl, '/api/strategic-execution/operating-truth')
  const strategyHubV2Api = await fetchJson(baseUrl, '/api/strategic-execution/v2')
  const opsHub = await fetchJson(baseUrl, '/api/ops-hub')
  const ownersLeadSourceGovernance = await fetchJson(baseUrl, '/api/owners/lead-source-governance')
  const ownersReviewQueue = await fetchJson(baseUrl, '/api/owners/review-queue')
  const localDocSuccessResponse = await fetchTextResponse(baseUrl, '/api/foundation/local-doc/USER.md')
    .catch(error => ({ ok: false, status: 0, text: error instanceof Error ? error.message : String(error) }))
  const localDocNonLocalResponse = await fetchTextResponseWithHostHeader(baseUrl, '/api/foundation/local-doc/USER.md', 'example.com')
    .catch(error => ({ ok: false, status: 0, text: error instanceof Error ? error.message : String(error) }))
  const localDocTraversalResponse = await fetchTextResponse(baseUrl, '/api/foundation/local-doc/..%2F..%2F..%2Fetc%2Fpasswd')
    .catch(error => ({ ok: false, status: 0, text: error instanceof Error ? error.message : String(error) }))
  const localDocNonAllowlistedResponse = await fetchTextResponse(baseUrl, '/api/foundation/local-doc/AGENTS.md')
    .catch(error => ({ ok: false, status: 0, text: error instanceof Error ? error.message : String(error) }))
  const extractionTargets = Array.isArray(foundationHub.extractionControl?.targets)
    ? foundationHub.extractionControl.targets
    : []
  const extractionCoverageTargets = Array.isArray(foundationHub.extractionControl?.coverageByTarget)
    ? foundationHub.extractionControl.coverageByTarget
    : []
  const extractionStaleActiveRuns = Array.isArray(foundationHub.extractionControl?.staleActiveRuns)
    ? foundationHub.extractionControl.staleActiveRuns
    : []
  const extractionRecentStaleReapedRuns = Array.isArray(foundationHub.extractionControl?.recentStaleReapedRuns)
    ? foundationHub.extractionControl.recentStaleReapedRuns
    : []

  return {
    sourceOfTruth,
    systemInventory,
    foundationHubSummary,
    foundationHubFull,
    foundationHub,
    foundationBacklogListApi,
    foundationBacklogDoneArchiveApi,
    foundationBacklogDetailEndpointApi,
    foundationCurrentSprintApi,
    actionReviewApi,
    actionRouteReviewInboxApi,
    foundationLlmRuntimeApi,
    foundationBuildLog,
    foundationChangeLog,
    foundationDailySummary,
    foundationDocUpdatesApi,
    foundationSourceLifecycle,
    foundationSourceMaturityGrid,
    foundationSourceExtractionCoverage,
    foundationSourceCoverageCloseout,
    foundationSourceConnectorMatrixApi,
    foundationConnectorCredentialPreflightApi,
    foundationSourceHubRoutingMatrixApi,
    foundationMarketingSourceMap,
    foundationBrandStack,
    foundationTierBehavioralCompletion,
    foundationVerificationRuns,
    foundationExtractionRuntimeReadinessApi,
    foundationPerUserChangelog,
    foundationRestrictedDecisionQueue,
    foundationBuildIntelWatchlist,
    foundationMultimodalExtractorContract,
    foundationResearchInboxContract,
    foundationControlCompressionApi,
    foundationImplementationIntelligenceApi,
    foundationBuildIntelExtractionApi,
    foundationGStackBuildIntelApi,
    foundationChangesApi,
    strategyPreworkCoverageApi,
    strategyGoalTruthApi,
    strategyOperatingTruthApi,
    strategyHubV2Api,
    opsHub,
    ownersLeadSourceGovernance,
    ownersReviewQueue,
    localDocSuccessResponse,
    localDocNonLocalResponse,
    localDocTraversalResponse,
    localDocNonAllowlistedResponse,
    extractionTargets,
    extractionCoverageTargets,
    extractionStaleActiveRuns,
    extractionRecentStaleReapedRuns,
    sourceTruthKpiHealth: sourceOfTruth.kpiHealth || {},
    foundationHubKpiHealth: foundationHub.kpiHealth || {},
    backlogHygieneApi: foundationHub.backlogHygiene || {},
  }
}

export function evaluateFoundationVerifyLiveApiSnapshotSplit(input = {}) {
  const rootSource = String(input.rootSource || '')
  const moduleSource = String(input.moduleSource || '')
  const rootLineCount = Number(input.rootLineCount || lineCount(rootSource))
  const moduleLineCount = Number(input.moduleLineCount || lineCount(moduleSource))
  const packageScripts = input.packageJson?.scripts || {}
  const checks = []
  const requiredEndpointsMissing = FOUNDATION_VERIFY_LIVE_API_ENDPOINTS.filter(endpoint => {
    if (endpoint === SOURCE_LIFECYCLE_API_PATH) {
      return !moduleSource.includes(endpoint) && !moduleSource.includes('SOURCE_LIFECYCLE_API_PATH')
    }
    return !moduleSource.includes(endpoint)
  })
  const directRootFetches = [
    'const sourceOfTruth = await fetchJson',
    'const foundationHubSummary = await fetchJson',
    'const foundationBuildLog = await fetchJson',
    'const strategyHubV2Api = await fetchJson',
    'const localDocSuccessResponse = await fetchTextResponse',
  ].filter(token => rootSource.includes(token))

  addFinding(checks, rootLineCount < FOUNDATION_VERIFY_PHASE_2_BEFORE_LINES, 'root_not_reduced', `${rootLineCount}/${FOUNDATION_VERIFY_PHASE_2_BEFORE_LINES}`)
  addFinding(checks, rootLineCount <= FOUNDATION_VERIFY_PHASE_2_MAX_ROOT_LINES, 'root_above_phase_2_budget', `${rootLineCount}/${FOUNDATION_VERIFY_PHASE_2_MAX_ROOT_LINES}`)
  addFinding(checks, moduleLineCount <= FOUNDATION_VERIFY_PHASE_2_MAX_MODULE_LINES, 'module_above_1500', `${moduleLineCount}/${FOUNDATION_VERIFY_PHASE_2_MAX_MODULE_LINES}`)
  addFinding(checks, rootSource.includes('loadFoundationVerifyLiveApiSnapshot({ baseUrl })'), 'root_missing_live_api_loader', FOUNDATION_VERIFY_LIVE_API_SNAPSHOT_MODULE_PATH)
  addFinding(checks, directRootFetches.length === 0, 'root_still_owns_live_api_fetches', directRootFetches.join(', '))
  addFinding(checks, requiredEndpointsMissing.length === 0, 'module_missing_live_api_endpoints', requiredEndpointsMissing.join(', '))
  addFinding(checks, moduleSource.includes('fetchTextResponseWithHostHeader') && moduleSource.includes('/api/foundation/local-doc/USER.md'), 'module_missing_local_doc_host_probe', 'local-doc guard probes must stay with live API snapshot loading')
  addFinding(checks, packageScripts['process:critical-roots-under-3k-phase-2-check'] === `node --env-file-if-exists=.env ${CRITICAL_ROOTS_UNDER_3K_PHASE_2_SCRIPT_PATH}`, 'package_script_missing', CRITICAL_ROOTS_UNDER_3K_PHASE_2_SCRIPT_PATH)

  return {
    ok: checks.length === 0,
    findings: checks,
    rootLineCount,
    moduleLineCount,
    requiredEndpointsMissing,
    directRootFetches,
  }
}

export function buildFoundationVerifyLiveApiSnapshotDogfoodProof(goodFixture = {}) {
  const rejected = {
    rootNotReduced: evaluateFoundationVerifyLiveApiSnapshotSplit({
      ...goodFixture,
      rootLineCount: FOUNDATION_VERIFY_PHASE_2_BEFORE_LINES,
    }),
    oversizedModule: evaluateFoundationVerifyLiveApiSnapshotSplit({
      ...goodFixture,
      moduleLineCount: FOUNDATION_VERIFY_PHASE_2_MAX_MODULE_LINES + 1,
    }),
    directRootFetch: evaluateFoundationVerifyLiveApiSnapshotSplit({
      ...goodFixture,
      rootSource: `${goodFixture.rootSource || ''}\nconst sourceOfTruth = await fetchJson(baseUrl, '/api/source-of-truth')`,
    }),
    missingEndpoint: evaluateFoundationVerifyLiveApiSnapshotSplit({
      ...goodFixture,
      moduleSource: String(goodFixture.moduleSource || '').replaceAll('/api/foundation-hub?view=full', '/api/foundation-hub?view=summary-only'),
    }),
    missingPackageScript: evaluateFoundationVerifyLiveApiSnapshotSplit({
      ...goodFixture,
      packageJson: { scripts: {} },
    }),
  }
  const ok = Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    rejected,
    dogfoodInvariant: ok
      ? 'unchanged root, oversized module, direct root fetch, missing endpoint, and missing package script fixtures fail closed'
      : 'live API snapshot split dogfood did not reject every known bad fixture',
  }
}
