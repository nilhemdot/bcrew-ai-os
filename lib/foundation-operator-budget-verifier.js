import {
  FOUNDATION_ROUTE_BUDGET_CLEANUP_CARD_IDS,
  FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY,
  VERIFIER_ROUTE_BUDGET_MODULE_SPLIT_CARD_ID,
  buildFoundationRouteBudgetVerifierDogfoodProof,
  evaluateFoundationRouteBudgetVerifier,
} from './foundation-route-budget-verifier.js'
import {
  FOUNDATION_ENDPOINT_BUDGETS_CARD_ID,
  FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY,
  FOUNDATION_ENDPOINT_BUDGETS_PLAN_PATH,
  FOUNDATION_ENDPOINT_BUDGETS_SCRIPT_PATH,
  FOUNDATION_ENDPOINT_BUDGETS_SPRINT_ID,
  buildFoundationEndpointBudgetsDogfoodProof,
  loadLatestFoundationEndpointBudgetSnapshot,
} from './foundation-endpoint-budgets.js'
import {
  FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID,
  FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY,
  FOUNDATION_FRONTEND_ASSET_BUDGET_PLAN_PATH,
  FOUNDATION_FRONTEND_ASSET_BUDGET_SCRIPT_PATH,
  FOUNDATION_FRONTEND_ASSET_BUDGET_SPRINT_ID,
  buildFoundationFrontendAssetBudgetDogfoodProof,
  measureFoundationFrontendAssetsFromRepo,
} from './foundation-frontend-asset-budgets.js'
import {
  FOUNDATION_FRONTEND_DOM_BUDGET_APPROVAL_PATH,
  FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID,
  FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY,
  FOUNDATION_FRONTEND_DOM_BUDGET_PLAN_PATH,
  FOUNDATION_FRONTEND_DOM_BUDGET_SCRIPT_PATH,
  FOUNDATION_FRONTEND_DOM_BUDGET_SPRINT_ID,
  buildFoundationFrontendDomBudgetDogfoodProof,
  measureFoundationFrontendDomBudgetFromRepo,
} from './foundation-frontend-dom-budgets.js'
import {
  buildFoundationVerifyReporterDogfoodProof,
} from './foundation-verify-reporter.js'

export const VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID = 'VERIFIER-OPERATOR-BUDGET-SPLIT-MODULE-001'
export const VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-operator-budget-split-module-v1'
export const VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-operator-budget-split-module-001-plan.md'
export const VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-OPERATOR-BUDGET-SPLIT-MODULE-001.json'
export const VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-operator-budget-split-module-check.mjs'
export const VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SPRINT_ID = 'verifier-operator-budget-split-module-2026-05-16'
export const VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_BEFORE_LINES = 13068

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function summarizeChecks(checks = []) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

function findCard(foundationHub = {}, cardId = '') {
  return (foundationHub.backlogItems || []).find(item => item.id === cardId) || null
}

function buildLogCloseout(buildLog = {}, key = '') {
  return (buildLog.builds || []).find(build =>
    build.key === key ||
    build.closeoutKey === key
  ) || null
}

function findCloseout(closeouts = [], key = '') {
  return (Array.isArray(closeouts) ? closeouts : []).find(closeout => closeout.key === key) || null
}

async function fileExists(input, relativePath) {
  if (typeof input.repoFileExists === 'function') return input.repoFileExists(relativePath)
  return false
}

export async function evaluateFoundationOperatorBudgetVerifier(input = {}) {
  const checks = []
  const repoRoot = input.repoRoot || process.cwd()
  const foundationHub = input.foundationHub || {}
  const foundationBuildCloseouts = input.foundationBuildCloseouts || []
  const foundationBuildLog = input.foundationBuildLog || {}
  const packageScripts = input.packageScripts || input.packageJson?.scripts || {}
  const activeFoundationSprint = input.activeFoundationSprint || {}

  const routeBudgetCleanupCloseout = buildLogCloseout(
    foundationBuildLog,
    FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY,
  ) || input.closeoutRecordAsBuildLogEntry?.(findCloseout(
    foundationBuildCloseouts,
    FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY,
  ) || null)
  const routeBudgetCleanupCards = FOUNDATION_ROUTE_BUDGET_CLEANUP_CARD_IDS.map(cardId => findCard(foundationHub, cardId))
  const routeBudgetVerifierResult = evaluateFoundationRouteBudgetVerifier({
    cards: routeBudgetCleanupCards,
    closeout: routeBudgetCleanupCloseout,
    sourceOfTruth: input.sourceOfTruth || {},
    foundationHubSummary: input.foundationHubSummary || {},
    packageScripts,
    serverSource: input.serverSource || '',
    kpiHealthSource: input.kpiHealthSource || '',
    sourceOfTruthPayloadSource: input.sourceOfTruthPayloadSource || '',
    foundationHubSummaryPayloadSource: input.foundationHubSummaryPayloadSource || '',
    foundationRouteBudgetCleanupScriptSource: input.foundationRouteBudgetCleanupScriptSource || '',
    sourceDurationMs: Number(input.sourceDurationMs || 100),
    sourcePayloadBytes: Number(input.sourcePayloadBytes || 0),
    foundationHubPayloadBytes: Number(input.foundationHubPayloadBytes || 0),
  })
  const routeBudgetDogfood = buildFoundationRouteBudgetVerifierDogfoodProof()

  addCheck(
    checks,
    routeBudgetVerifierResult.sourceOk,
    'SOURCE-OF-TRUTH-PERF-BUDGET-001 keeps source truth route under budget',
    `sourceBytes=${routeBudgetVerifierResult.sourceOfTruthPayloadBudget.bytes} cache=${routeBudgetVerifierResult.summary.sourceCacheStatus} sourceDogfood=${routeBudgetVerifierResult.sourceOfTruthDogfood.ok}`,
  )
  addCheck(
    checks,
    routeBudgetVerifierResult.hubOk,
    'FOUNDATION-HUB-PAYLOAD-EXTRACT-001 keeps Foundation Hub default payload compact',
    `hubBytes=${routeBudgetVerifierResult.foundationHubPayloadBudget.bytes} hubDogfood=${routeBudgetVerifierResult.foundationHubPayloadDogfood.ok} jobs=${input.foundationHubSummary?.foundationJobs?.latestRuns?.length || 0} researchCards=${input.foundationHubSummary?.researchCuration?.cards?.length || 0}`,
  )
  addCheck(
    checks,
    routeBudgetVerifierResult.closeoutOk,
    'Foundation route budget cleanup has operator closeout coverage',
    routeBudgetCleanupCloseout
      ? `operatorCloseout=${routeBudgetCleanupCloseout.operatorCloseout} backlogIds=${(routeBudgetCleanupCloseout.backlogIds || []).join(',')}`
      : `missing ${FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY}`,
  )
  addCheck(
    checks,
    routeBudgetVerifierResult.ok && routeBudgetDogfood.ok === true,
    'Foundation route budget cleanup keeps source truth fast and Foundation Hub default payload compact',
    `cards=${routeBudgetCleanupCards.filter(card => card?.lane === 'done').length}/2 sourceBytes=${routeBudgetVerifierResult.sourceOfTruthPayloadBudget.bytes} hubBytes=${routeBudgetVerifierResult.foundationHubPayloadBudget.bytes} cache=${routeBudgetVerifierResult.summary.sourceCacheStatus} moduleDogfood=${routeBudgetDogfood.ok}`,
  )

  const verifierRouteBudgetModuleSplitCard = findCard(foundationHub, VERIFIER_ROUTE_BUDGET_MODULE_SPLIT_CARD_ID)
  addCheck(
    checks,
    verifierRouteBudgetModuleSplitCard &&
      ['executing', 'done'].includes(verifierRouteBudgetModuleSplitCard.lane) &&
      routeBudgetDogfood.ok === true &&
      String(input.foundationVerifySource || '').includes('evaluateFoundationRouteBudgetVerifier') &&
      String(input.foundationVerifySource || '').includes('buildFoundationRouteBudgetVerifierDogfoodProof'),
    'VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001 delegates route-budget verifier behavior to focused module',
    verifierRouteBudgetModuleSplitCard
      ? `lane=${verifierRouteBudgetModuleSplitCard.lane} dogfood=${routeBudgetDogfood.ok ? 'pass' : 'blocked'} sourceOldFailure=${routeBudgetDogfood.overLatencySource.sourceOfTruthPayloadBudget.ok ? 'missed' : 'rejected'} hubOldFailure=${routeBudgetDogfood.overBudgetHub.foundationHubPayloadBudget.ok ? 'missed' : 'rejected'}`
      : `missing ${VERIFIER_ROUTE_BUDGET_MODULE_SPLIT_CARD_ID}`,
  )

  const endpointBudgetCard = findCard(foundationHub, FOUNDATION_ENDPOINT_BUDGETS_CARD_ID)
  const endpointBudgetDogfood = buildFoundationEndpointBudgetsDogfoodProof()
  const endpointBudgetLatestSnapshot = input.foundationEndpointBudgetLatestSnapshot ||
    await loadLatestFoundationEndpointBudgetSnapshot({ repoRoot })
  const endpointBudgetCloseout = findCloseout(foundationBuildCloseouts, FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY)
  const endpointBudgetClosed = endpointBudgetCard?.lane === 'done'
  const endpointBudgetCloseoutOk = !endpointBudgetClosed ||
    (String(endpointBudgetCard.statusNote || '').includes(FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY) &&
      endpointBudgetCloseout?.operatorCloseout === true &&
      (endpointBudgetCloseout.backlogIds || []).includes(FOUNDATION_ENDPOINT_BUDGETS_CARD_ID) &&
      await fileExists(input, 'docs/handoffs/2026-05-16-foundation-endpoint-budgets-closeout.md'))
  addCheck(
    checks,
    endpointBudgetCard &&
      ['executing', 'done'].includes(endpointBudgetCard.lane) &&
      (activeFoundationSprint.sprint?.sprintId === FOUNDATION_ENDPOINT_BUDGETS_SPRINT_ID || endpointBudgetClosed) &&
      endpointBudgetCloseoutOk &&
      endpointBudgetDogfood.ok === true,
    'FOUNDATION-ENDPOINT-BUDGETS-001 surfaces operator endpoint latency and payload budgets',
    endpointBudgetCard
      ? `lane=${endpointBudgetCard.lane} dogfood=${endpointBudgetDogfood.ok ? 'pass' : 'blocked'} latest=${endpointBudgetLatestSnapshot.status} missing=${endpointBudgetLatestSnapshot.summary?.missingCount || 0}`
      : `missing ${FOUNDATION_ENDPOINT_BUDGETS_CARD_ID}`,
  )
  addCheck(
    checks,
    String(input.foundationEndpointBudgetsSource || '').includes('loadLatestFoundationEndpointBudgetSnapshot') &&
      String(input.foundationEndpointBudgetsSource || '').includes('measureFoundationEndpointBudgetSnapshot') &&
      String(input.foundationEndpointBudgetsSource || '').includes('buildFoundationEndpointBudgetsDogfoodProof') &&
      String(input.foundationEndpointBudgetsSource || '').includes('CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS') &&
      String(input.foundationEndpointBudgetsScriptSource || '').includes('scriptIsReadOnly') &&
      packageScripts['process:foundation-endpoint-budgets-check'] === `node --env-file-if-exists=.env ${FOUNDATION_ENDPOINT_BUDGETS_SCRIPT_PATH}`,
    'FOUNDATION-ENDPOINT-BUDGETS-001 has focused module, read-only proof script, and package command',
    `routes=${endpointBudgetLatestSnapshot.summary?.routeCount || 0} plan=${String(input.foundationEndpointBudgetsPlanSource || '').includes(FOUNDATION_ENDPOINT_BUDGETS_CARD_ID) ? 'present' : 'missing'}`,
  )
  addCheck(
    checks,
    String(input.nightlyDeepAuditUpgradeSource || '').includes('serializeNightlyDeepAuditUpgradeJson') &&
      String(input.nightlyDeepAuditUpgradeSource || '').includes('endpointMetrics: audit.deterministicAudit?.endpointMetrics || []') &&
      String(input.nightlyDeepAuditScriptSource || '').includes('serializeNightlyDeepAuditUpgradeJson(audit)') &&
      String(input.connectorUptimeMonitorSource || '').includes('endpoint_budget_risk') &&
      String(input.connectorUptimeMonitorSource || '').includes('endpointBudgetMissingCount') &&
      String(input.hubReadRoutesSource || '').includes('loadLatestFoundationEndpointBudgetSnapshot') &&
      String(input.serverSource || '').includes("from './lib/foundation-endpoint-budgets.js'"),
    'FOUNDATION-ENDPOINT-BUDGETS-001 persists endpoint metrics into nightly JSON and full Foundation Operating Reliability',
    `latestSource=${endpointBudgetLatestSnapshot.sourcePath || endpointBudgetLatestSnapshot.source}`,
  )

  const frontendAssetBudgetCard = findCard(foundationHub, FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID)
  const frontendAssetBudgetDogfood = buildFoundationFrontendAssetBudgetDogfoodProof()
  const frontendAssetBudgetSnapshot = input.foundationFrontendAssetBudgetSnapshot ||
    await measureFoundationFrontendAssetsFromRepo({ repoRoot })
  const frontendAssetBudgetCloseout = findCloseout(foundationBuildCloseouts, FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY)
  const frontendAssetBudgetClosed = frontendAssetBudgetCard?.lane === 'done'
  const frontendAssetBudgetCloseoutOk = !frontendAssetBudgetClosed ||
    (String(frontendAssetBudgetCard.statusNote || '').includes(FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY) &&
      frontendAssetBudgetCloseout?.operatorCloseout === true &&
      (frontendAssetBudgetCloseout.backlogIds || []).includes(FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID) &&
      await fileExists(input, 'docs/handoffs/2026-05-16-foundation-frontend-asset-budget-closeout.md'))
  addCheck(
    checks,
    frontendAssetBudgetCard &&
      ['executing', 'done'].includes(frontendAssetBudgetCard.lane) &&
      (activeFoundationSprint.sprint?.sprintId === FOUNDATION_FRONTEND_ASSET_BUDGET_SPRINT_ID || frontendAssetBudgetClosed) &&
      frontendAssetBudgetCloseoutOk &&
      frontendAssetBudgetDogfood.ok === true &&
      frontendAssetBudgetSnapshot.summary?.assetCount >= 4 &&
      frontendAssetBudgetSnapshot.summary?.riskCount === 0,
    'FOUNDATION-FRONTEND-ASSET-BUDGET-001 tracks served Foundation JS/CSS asset budgets',
    frontendAssetBudgetCard
      ? `lane=${frontendAssetBudgetCard.lane} dogfood=${frontendAssetBudgetDogfood.ok ? 'pass' : 'blocked'} repo=${frontendAssetBudgetSnapshot.status} assets=${frontendAssetBudgetSnapshot.summary?.assetCount || 0} total=${frontendAssetBudgetSnapshot.summary?.totalBytes || 0}B`
      : `missing ${FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID}`,
  )
  addCheck(
    checks,
    String(input.foundationFrontendAssetBudgetsSource || '').includes('discoverFoundationFrontendAssetRefs') &&
      String(input.foundationFrontendAssetBudgetsSource || '').includes('measureFoundationFrontendAssetsFromRepo') &&
      String(input.foundationFrontendAssetBudgetsSource || '').includes('measureFoundationFrontendAssetsFromServer') &&
      String(input.foundationFrontendAssetBudgetsSource || '').includes('buildFoundationFrontendAssetBudgetDogfoodProof') &&
      String(input.foundationFrontendAssetBudgetsScriptSource || '').includes('scriptIsReadOnly') &&
      packageScripts['process:foundation-frontend-asset-budget-check'] === `node --env-file-if-exists=.env ${FOUNDATION_FRONTEND_ASSET_BUDGET_SCRIPT_PATH}`,
    'FOUNDATION-FRONTEND-ASSET-BUDGET-001 has focused module, read-only proof script, and package command',
    `assets=${frontendAssetBudgetSnapshot.summary?.assetCount || 0} plan=${String(input.foundationFrontendAssetBudgetsPlanSource || '').includes(FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID) ? 'present' : 'missing'}`,
  )
  addCheck(
    checks,
    String(input.codeQualityNightlyAuditSource || '').includes('measureFoundationFrontendAssetsFromRepo') &&
      String(input.codeQualityNightlyAuditSource || '').includes('assetBudgetSnapshot') &&
      String(input.codeQualityNightlyAuditSource || '').includes('FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID'),
    'FOUNDATION-FRONTEND-ASSET-BUDGET-001 feeds nightly code-quality asset budget findings',
    `repoStatus=${frontendAssetBudgetSnapshot.status} noStore=${frontendAssetBudgetSnapshot.summary?.noStoreCount || 0}`,
  )

  const frontendDomBudgetCard = findCard(foundationHub, FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID)
  const frontendDomBudgetDogfood = buildFoundationFrontendDomBudgetDogfoodProof()
  const frontendDomBudgetSnapshot = input.foundationFrontendDomBudgetSnapshot ||
    await measureFoundationFrontendDomBudgetFromRepo({ repoRoot })
  const frontendDomBudgetCloseout = findCloseout(foundationBuildCloseouts, FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY)
  const frontendDomBudgetClosed = frontendDomBudgetCard?.lane === 'done'
  const frontendDomBudgetCloseoutOk = !frontendDomBudgetClosed ||
    (String(frontendDomBudgetCard.statusNote || '').includes(FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY) &&
      frontendDomBudgetCloseout?.operatorCloseout === true &&
      (frontendDomBudgetCloseout.backlogIds || []).includes(FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID) &&
      await fileExists(input, 'docs/handoffs/2026-05-16-foundation-frontend-dom-budget-closeout.md'))
  addCheck(
    checks,
    frontendDomBudgetCard &&
      ['executing', 'done'].includes(frontendDomBudgetCard.lane) &&
      (activeFoundationSprint.sprint?.sprintId === FOUNDATION_FRONTEND_DOM_BUDGET_SPRINT_ID || frontendDomBudgetClosed) &&
      frontendDomBudgetCloseoutOk &&
      frontendDomBudgetDogfood.ok === true &&
      frontendDomBudgetSnapshot.summary?.scriptCount >= 10 &&
      frontendDomBudgetSnapshot.summary?.riskCount === 0 &&
      await fileExists(input, FOUNDATION_FRONTEND_DOM_BUDGET_APPROVAL_PATH),
    'FOUNDATION-FRONTEND-DOM-BUDGET-001 measures frontend DOM rebuild budget',
    frontendDomBudgetCard
      ? `lane=${frontendDomBudgetCard.lane} dogfood=${frontendDomBudgetDogfood.ok ? 'pass' : 'blocked'} repo=${frontendDomBudgetSnapshot.status} scripts=${frontendDomBudgetSnapshot.summary?.scriptCount || 0} createElement=${frontendDomBudgetSnapshot.summary?.totalCreateElementCount || 0} closeout=${frontendDomBudgetCloseout?.key || 'pending'}`
      : `missing ${FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID}`,
  )
  addCheck(
    checks,
    String(input.foundationFrontendDomBudgetsSource || '').includes('measureFoundationFrontendDomBudgetFromRepo') &&
      String(input.foundationFrontendDomBudgetsSource || '').includes('countDomRebuildSignalsInText') &&
      String(input.foundationFrontendDomBudgetsSource || '').includes('buildFoundationFrontendDomBudgetDogfoodProof') &&
      String(input.foundationFrontendDomBudgetsScriptSource || '').includes('VM route proof counts real Current State renderer DOM work') &&
      String(input.foundationFrontendDomBudgetsScriptSource || '').includes('synthetic heavy render fixture triggers DOM budget risk') &&
      packageScripts['process:foundation-frontend-dom-budget-check'] === `node --env-file-if-exists=.env ${FOUNDATION_FRONTEND_DOM_BUDGET_SCRIPT_PATH}`,
    'FOUNDATION-FRONTEND-DOM-BUDGET-001 has focused module, VM proof script, and package command',
    `domStatus=${frontendDomBudgetSnapshot.status} plan=${String(input.foundationFrontendDomBudgetsPlanSource || '').includes(FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID) ? 'present' : 'missing'}`,
  )
  addCheck(
    checks,
    String(input.codeQualityNightlyAuditSource || '').includes('measureFoundationFrontendDomBudgetFromRepo') &&
      String(input.codeQualityNightlyAuditSource || '').includes('domBudgetSnapshot') &&
      String(input.codeQualityNightlyAuditSource || '').includes('FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID'),
    'FOUNDATION-FRONTEND-DOM-BUDGET-001 feeds nightly code-quality DOM budget findings',
    `createElement=${frontendDomBudgetSnapshot.summary?.totalCreateElementCount || 0} appendChild=${frontendDomBudgetSnapshot.summary?.totalAppendChildCount || 0}`,
  )

  const verifyFailureReporterCard = findCard(foundationHub, 'VERIFY-FAILURE-REPORTER-001')
  const verifyFailureReporterDogfood = buildFoundationVerifyReporterDogfoodProof()
  addCheck(
    checks,
    verifyFailureReporterCard &&
      verifyFailureReporterCard.lane === 'done' &&
      verifyFailureReporterDogfood.ok === true &&
      String(input.foundationVerifySource || '').includes('buildFoundationVerifyCheckOutput') &&
      String(input.foundationVerifySource || '').includes("args['failures-only']") &&
      String(input.foundationVerifySource || '').includes("args['json-summary']"),
    'VERIFY-FAILURE-REPORTER-001 adds failure-only and JSON verifier summaries',
    verifyFailureReporterCard
      ? `lane=${verifyFailureReporterCard.lane} dogfood=${verifyFailureReporterDogfood.ok ? 'pass' : 'blocked'} failuresOnly=${verifyFailureReporterDogfood.failuresOnlyOutput.length}`
      : 'missing VERIFY-FAILURE-REPORTER-001',
  )

  const splitCard = findCard(foundationHub, VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID)
  const splitCloseout = findCloseout(foundationBuildCloseouts, VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CLOSEOUT_KEY)
  const moduleSource = String(input.moduleSource || '')
  const proofScriptSource = String(input.proofScriptSource || '')
  const foundationVerifySource = String(input.foundationVerifySource || '')
  const currentPlan = String(input.currentPlan || '')
  const currentState = String(input.currentState || '')
  const rootLineCount = Number(input.foundationVerifyLineCount || 0)
  const rootDelegateOk = foundationVerifySource.includes('evaluateFoundationOperatorBudgetVerifier({') &&
    foundationVerifySource.includes('operatorBudgetVerifier.checks') &&
    foundationVerifySource.includes('buildFoundationOperatorBudgetVerifierDogfoodProof')
  const closeoutOk = splitCard?.lane !== 'done' ||
    (splitCloseout?.operatorCloseout === true &&
      (splitCloseout.backlogIds || []).includes(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID) &&
      await fileExists(input, 'docs/handoffs/2026-05-16-verifier-operator-budget-split-module-closeout.md') &&
      currentState.includes(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CLOSEOUT_KEY))
  addCheck(
    checks,
    splitCard &&
      ['executing', 'done'].includes(splitCard.lane) &&
      buildFoundationOperatorBudgetVerifierDogfoodProof().ok === true &&
      rootDelegateOk &&
      moduleSource.includes('evaluateFoundationOperatorBudgetVerifier') &&
      moduleSource.includes('buildFoundationOperatorBudgetVerifierDogfoodProof') &&
      proofScriptSource.includes('focused proof script is read-only') &&
      currentPlan.includes(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CLOSEOUT_KEY) &&
      closeoutOk &&
      (!rootLineCount || rootLineCount < VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_BEFORE_LINES),
    'VERIFIER-OPERATOR-BUDGET-SPLIT-MODULE-001 delegates operator budget verifier behavior to focused module',
    splitCard
      ? `lane=${splitCard.lane} rootDelegate=${rootDelegateOk ? 'yes' : 'no'} dogfood=${buildFoundationOperatorBudgetVerifierDogfoodProof().ok ? 'pass' : 'blocked'} rootLines=${rootLineCount || 'unknown'}`
      : `missing ${VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID}`,
  )

  const summary = summarizeChecks(checks)
  return {
    ok: summary.failed === 0,
    checks,
    summary,
    details: {
      routeBudget: routeBudgetVerifierResult.summary,
      endpointBudget: endpointBudgetLatestSnapshot.summary,
      frontendAssets: frontendAssetBudgetSnapshot.summary,
      frontendDom: frontendDomBudgetSnapshot.summary,
    },
  }
}

export function buildFoundationOperatorBudgetVerifierDogfoodProof() {
  const route = buildFoundationRouteBudgetVerifierDogfoodProof()
  const endpoints = buildFoundationEndpointBudgetsDogfoodProof()
  const assets = buildFoundationFrontendAssetBudgetDogfoodProof()
  const dom = buildFoundationFrontendDomBudgetDogfoodProof()
  const reporter = buildFoundationVerifyReporterDogfoodProof()
  return {
    ok: route.ok === true &&
      route.overLatencySource?.sourceOfTruthPayloadBudget?.ok === false &&
      route.overBudgetHub?.foundationHubPayloadBudget?.ok === false &&
      endpoints.ok === true &&
      endpoints.oldSlowRoute?.status === 'risk' &&
      endpoints.missingMetrics?.status === 'review' &&
      assets.ok === true &&
      assets.oversizedScript?.status === 'risk' &&
      assets.missingAsset?.status === 'risk' &&
      dom.ok === true &&
      dom.heavySource?.status === 'risk' &&
      dom.heavyRoute?.status === 'risk' &&
      reporter.ok === true,
    route,
    endpoints,
    assets,
    dom,
    reporter,
    invariant: 'Operator budget verifier accepts healthy proof modules and rejects old route latency, payload bloat, missing endpoint metrics, oversized/missing assets, heavy DOM churn, and weak verifier failure-reporting behavior.',
  }
}
