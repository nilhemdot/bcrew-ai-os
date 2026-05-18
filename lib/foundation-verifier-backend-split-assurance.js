import {
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SPRINT_ID,
  buildFoundationDbSplitVerifierDogfoodProof,
  evaluateFoundationDbSplitVerifier,
} from './foundation-db-split-verifier.js'
import {
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SPRINT_ID,
  buildFoundationServerRouteSplitVerifierDogfoodProof,
  evaluateFoundationServerRouteSplitVerifier,
} from './foundation-server-route-split-verifier.js'

export const VERIFIER_BACKEND_SPLIT_ASSURANCE_CARD_ID = 'VERIFIER-BACKEND-SPLIT-ASSURANCE-001'
export const VERIFIER_BACKEND_SPLIT_ASSURANCE_CLOSEOUT_KEY = 'verifier-backend-split-assurance-v1'
export const VERIFIER_BACKEND_SPLIT_ASSURANCE_PLAN_PATH = 'docs/process/verifier-backend-split-assurance-001-plan.md'
export const VERIFIER_BACKEND_SPLIT_ASSURANCE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-BACKEND-SPLIT-ASSURANCE-001.json'
export const VERIFIER_BACKEND_SPLIT_ASSURANCE_SCRIPT_PATH = 'scripts/process-verifier-backend-split-assurance-check.mjs'
export const VERIFIER_BACKEND_SPLIT_ASSURANCE_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-backend-split-assurance-closeout.md'
export const VERIFIER_BACKEND_SPLIT_ASSURANCE_BEFORE_LINES = 11103

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function evaluateBackendSplitFixture(fixture = {}) {
  const findings = []
  if (fixture.serverRouteChecksPass !== true) findings.push('server_route_split_failure_hidden')
  if (fixture.foundationDbChecksPass !== true) findings.push('foundation_db_split_failure_hidden')
  if (fixture.dogfoodPresent !== true) findings.push('split_dogfood_missing')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_inline_predicates_present')
  if (fixture.closeoutProofPresent !== true) findings.push('split_closeout_proof_missing')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierBackendSplitAssuranceDogfoodProof() {
  const healthy = evaluateBackendSplitFixture({
    serverRouteChecksPass: true,
    foundationDbChecksPass: true,
    dogfoodPresent: true,
    oldInlinePredicatesRemoved: true,
    closeoutProofPresent: true,
  })
  const rejected = {
    hiddenServerRouteFailure: evaluateBackendSplitFixture({
      serverRouteChecksPass: false,
      foundationDbChecksPass: true,
      dogfoodPresent: true,
      oldInlinePredicatesRemoved: true,
      closeoutProofPresent: true,
    }),
    hiddenFoundationDbFailure: evaluateBackendSplitFixture({
      serverRouteChecksPass: true,
      foundationDbChecksPass: false,
      dogfoodPresent: true,
      oldInlinePredicatesRemoved: true,
      closeoutProofPresent: true,
    }),
    missingDogfood: evaluateBackendSplitFixture({
      serverRouteChecksPass: true,
      foundationDbChecksPass: true,
      dogfoodPresent: false,
      oldInlinePredicatesRemoved: true,
      closeoutProofPresent: true,
    }),
    oldInlinePredicate: evaluateBackendSplitFixture({
      serverRouteChecksPass: true,
      foundationDbChecksPass: true,
      dogfoodPresent: true,
      oldInlinePredicatesRemoved: false,
      closeoutProofPresent: true,
    }),
    missingCloseoutProof: evaluateBackendSplitFixture({
      serverRouteChecksPass: true,
      foundationDbChecksPass: true,
      dogfoodPresent: true,
      oldInlinePredicatesRemoved: true,
      closeoutProofPresent: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy backend split fixture passes; hidden server/DB failures, missing dogfood, inline predicates, and missing closeout proof fail closed'
      : 'backend split assurance dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierBackendSplitAssurance(input = {}) {
  const {
    activeFoundationSprint,
    activeSprintAtOrPast,
    agentFeedbackRouteSource,
    agentFeedbackRoutesSource,
    agentFeedbackRoutesSplitPlanSource,
    agentFeedbackRoutesSplitScriptSource,
    appPageRoutesSource,
    appPageRoutesSplitPlanSource,
    appPageRoutesSplitScriptSource,
    authRoutesSource,
    authRoutesSplitPlanSource,
    authRoutesSplitScriptSource,
    currentPlan,
    currentState,
    foundationAgentFeedbackStorePlanSource,
    foundationAgentFeedbackStoreScriptSource,
    foundationAgentFeedbackStoreSource,
    foundationBacklogStorePlanSource,
    foundationBacklogStoreScriptSource,
    foundationBacklogStoreSource,
    foundationBuildCloseouts,
    foundationCoreSeedPlanSource,
    foundationCoreSeedScriptSource,
    foundationCoreSeedSource,
    foundationDbSource,
    foundationDbSchemaSeedStoreSource,
    foundationDbSplitVerifierSource,
    foundationDecisionStorePlanSource,
    foundationDecisionStoreScriptSource,
    foundationDecisionStoreSource,
    foundationDriveMeetingVaultStorePlanSource,
    foundationDriveMeetingVaultStoreScriptSource,
    foundationDriveMeetingVaultStoreSource,
    foundationFubLeadSourceStorePlanSource,
    foundationFubLeadSourceStoreScriptSource,
    foundationFubLeadSourceStoreSource,
    foundationHub,
    foundationLlmRuntimeStorePlanSource,
    foundationLlmRuntimeStoreScriptSource,
    foundationLlmRuntimeStoreSource,
    foundationRuntimeJobStorePlanSource,
    foundationRuntimeJobStoreScriptSource,
    foundationRuntimeJobStoreSource,
    foundationRuntimeReadRoutesSource,
    foundationRuntimeReadRoutesSplitPlanSource,
    foundationRuntimeReadRoutesSplitScriptSource,
    foundationSalesListingStorePlanSource,
    foundationSalesListingStoreScriptSource,
    foundationSalesListingStoreSource,
    foundationServerRouteSplitVerifierSource,
    foundationSharedCommsCoveragePlanSource,
    foundationSharedCommsCoverageScriptSource,
    foundationSharedCommsCoverageSource,
    foundationSharedCommsStorePlanSource,
    foundationSharedCommsStoreScriptSource,
    foundationSharedCommsStoreSource,
    foundationSourceCrawlStorePlanSource,
    foundationSourceCrawlStoreScriptSource,
    foundationSourceCrawlStoreSource,
    foundationStrategyGoalTruthPlanSource,
    foundationStrategyGoalTruthScriptSource,
    foundationStrategyGoalTruthSource,
    foundationStrategyOperatingTruthPlanSource,
    foundationStrategyOperatingTruthScriptSource,
    foundationStrategyOperatingTruthSource,
    foundationStrategySourceSnapshotPlanSource,
    foundationStrategySourceSnapshotScriptSource,
    foundationStrategySourceSnapshotSource,
    foundationVerifySource,
    foundationWriteRouteSource,
    foundationWriteRoutesSource,
    foundationWriteRoutesSplitPlanSource,
    foundationWriteRoutesSplitScriptSource,
    fubSourceRouteSplitPlanSource,
    fubSourceRouteSplitScriptSource,
    fubSourceRoutesSource,
    hubReadRoutesSource,
    hubReadRoutesSplitPlanSource,
    hubReadRoutesSplitScriptSource,
    moduleSource,
    packageJson,
    repoFileExists,
    salesHubRoutesSource,
    serverSource,
    strategySharedCommsRoutesSource,
    strategySharedCommsRoutesSplitPlanSource,
    strategySharedCommsRoutesSplitScriptSource,
    verifierFoundationDbSplitModulePlanSource,
    verifierFoundationDbSplitModuleScriptSource,
    verifierServerRouteSplitModulePlanSource,
    verifierServerRouteSplitModuleScriptSource,
  } = input
  const checks = []
  const assuranceSource = [foundationVerifySource, moduleSource].filter(Boolean).join('\n')

  const serverRouteSplitVerifierInput = {
    foundationHub,
    foundationBuildCloseouts,
    packageJson,
    currentPlan,
    currentState,
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationVerifySource: assuranceSource,
    moduleSource: foundationServerRouteSplitVerifierSource,
    serverSource,
    salesHubRoutesSource,
    fubSourceRoutesSource,
    fubSourceRouteSplitScriptSource,
    fubSourceRouteSplitPlanSource,
    foundationRuntimeReadRoutesSource,
    foundationRuntimeReadRoutesSplitScriptSource,
    foundationRuntimeReadRoutesSplitPlanSource,
    appPageRoutesSource,
    appPageRoutesSplitScriptSource,
    appPageRoutesSplitPlanSource,
    authRoutesSource,
    authRoutesSplitScriptSource,
    authRoutesSplitPlanSource,
    hubReadRoutesSource,
    hubReadRoutesSplitScriptSource,
    hubReadRoutesSplitPlanSource,
    strategySharedCommsRoutesSource,
    strategySharedCommsRoutesSplitScriptSource,
    strategySharedCommsRoutesSplitPlanSource,
    foundationWriteRoutesSource,
    foundationWriteRoutesSplitScriptSource,
    foundationWriteRoutesSplitPlanSource,
    agentFeedbackRoutesSource,
    agentFeedbackRoutesSplitScriptSource,
    agentFeedbackRoutesSplitPlanSource,
    foundationWriteRouteSource,
    agentFeedbackRouteSource,
    repoFileExists,
  }
  const serverRouteSplitVerifier = await evaluateFoundationServerRouteSplitVerifier(serverRouteSplitVerifierInput)
  for (const check of serverRouteSplitVerifier.checks) {
    ensure(checks, check.ok, check.check, check.detail)
  }
  const verifierServerRouteSplitModuleCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID) || null
  const verifierServerRouteSplitModuleCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierServerRouteSplitModuleDogfood = await buildFoundationServerRouteSplitVerifierDogfoodProof(serverRouteSplitVerifierInput)
  const foundationVerifyLineCountAfterServerRouteVerifierSplit = String(foundationVerifySource || '').split('\n').length
  const oldInlineServerRouteSplitPredicate = 'const fub' + 'SourceRouteSplitCard ='
  ensure(
    checks,
      verifierServerRouteSplitModuleCard &&
      ['executing', 'done'].includes(verifierServerRouteSplitModuleCard.lane) &&
      (!verifierServerRouteSplitModuleCloseout || String(verifierServerRouteSplitModuleCard.statusNote || '').includes(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY)) &&
      (!verifierServerRouteSplitModuleCloseout || verifierServerRouteSplitModuleCloseout.operatorCloseout === true) &&
      (!verifierServerRouteSplitModuleCloseout || (verifierServerRouteSplitModuleCloseout.backlogIds || []).includes(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID)) &&
      verifierServerRouteSplitModuleDogfood.ok === true &&
      serverRouteSplitVerifier.summary.passed === serverRouteSplitVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-server-route-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_APPROVAL_PATH) &&
      foundationServerRouteSplitVerifierSource.includes('evaluateFoundationServerRouteSplitVerifier') &&
      foundationServerRouteSplitVerifierSource.includes('buildFoundationServerRouteSplitVerifierDogfoodProof') &&
      verifierServerRouteSplitModuleScriptSource.includes('dogfood rejects old server-route split verifier failures') &&
      verifierServerRouteSplitModulePlanSource.includes('Substring-only proof is rejected') &&
      assuranceSource.includes('evaluateFoundationServerRouteSplitVerifier(serverRouteSplitVerifierInput)') &&
      !foundationVerifySource.includes(oldInlineServerRouteSplitPredicate) &&
      currentPlan.includes(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID])) &&
      assuranceSource.includes(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID),
    'VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001 extracts server-route split verifier checks into a focused module',
    verifierServerRouteSplitModuleCard
      ? `lane=${verifierServerRouteSplitModuleCard.lane} dogfood=${verifierServerRouteSplitModuleDogfood.ok ? 'pass' : 'blocked'} routeSplitChecks=${serverRouteSplitVerifier.summary.passed}/${serverRouteSplitVerifier.summary.total} lines=${VERIFIER_SERVER_ROUTE_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLineCountAfterServerRouteVerifierSplit}`
      : `missing ${VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID}`,
  )

  const foundationDbSplitVerifierInput = {
    foundationHub,
    foundationBuildCloseouts,
    packageJson,
    currentPlan,
    currentState,
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationVerifySource: assuranceSource,
    foundationDbSource,
    foundationDbSchemaSeedStoreSource,
    foundationBacklogStoreSource,
    foundationBacklogStoreScriptSource,
    foundationBacklogStorePlanSource,
    foundationDecisionStoreSource,
    foundationDecisionStoreScriptSource,
    foundationDecisionStorePlanSource,
    foundationCoreSeedSource,
    foundationCoreSeedScriptSource,
    foundationCoreSeedPlanSource,
    foundationStrategySourceSnapshotSource,
    foundationStrategySourceSnapshotScriptSource,
    foundationStrategySourceSnapshotPlanSource,
    foundationStrategyOperatingTruthSource,
    foundationStrategyOperatingTruthScriptSource,
    foundationStrategyOperatingTruthPlanSource,
    foundationStrategyGoalTruthSource,
    foundationStrategyGoalTruthScriptSource,
    foundationStrategyGoalTruthPlanSource,
    foundationFubLeadSourceStoreSource,
    foundationFubLeadSourceStoreScriptSource,
    foundationFubLeadSourceStorePlanSource,
    foundationSharedCommsCoverageSource,
    foundationSharedCommsCoverageScriptSource,
    foundationSharedCommsCoveragePlanSource,
    foundationSharedCommsStoreSource,
    foundationSharedCommsStoreScriptSource,
    foundationSharedCommsStorePlanSource,
    foundationLlmRuntimeStoreSource,
    foundationLlmRuntimeStoreScriptSource,
    foundationLlmRuntimeStorePlanSource,
    foundationRuntimeJobStoreSource,
    foundationRuntimeJobStoreScriptSource,
    foundationRuntimeJobStorePlanSource,
    foundationSourceCrawlStoreSource,
    foundationSourceCrawlStoreScriptSource,
    foundationSourceCrawlStorePlanSource,
    foundationDriveMeetingVaultStoreSource,
    foundationDriveMeetingVaultStoreScriptSource,
    foundationDriveMeetingVaultStorePlanSource,
    foundationAgentFeedbackStoreSource,
    foundationAgentFeedbackStoreScriptSource,
    foundationAgentFeedbackStorePlanSource,
    foundationSalesListingStoreSource,
    foundationSalesListingStoreScriptSource,
    foundationSalesListingStorePlanSource,
    moduleSource: foundationDbSplitVerifierSource,
    repoFileExists,
  }
  const foundationDbSplitVerifier = await evaluateFoundationDbSplitVerifier(foundationDbSplitVerifierInput)
  for (const check of foundationDbSplitVerifier.checks) {
    ensure(checks, check.ok, check.check, check.detail)
  }
  const verifierFoundationDbSplitModuleCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID) || null
  const verifierFoundationDbSplitModuleCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierFoundationDbSplitModuleDogfood = await buildFoundationDbSplitVerifierDogfoodProof(foundationDbSplitVerifierInput)
  const foundationVerifyLineCountAfterDbSplitVerifierSplit = String(foundationVerifySource || '').split('\n').length
  const oldInlineFoundationDbSplitPredicate = 'const foundationBacklog' + 'StoreSplitCard ='
  ensure(
    checks,
      verifierFoundationDbSplitModuleCard &&
      ['executing', 'done'].includes(verifierFoundationDbSplitModuleCard.lane) &&
      (!verifierFoundationDbSplitModuleCloseout || String(verifierFoundationDbSplitModuleCard.statusNote || '').includes(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CLOSEOUT_KEY)) &&
      (!verifierFoundationDbSplitModuleCloseout || verifierFoundationDbSplitModuleCloseout.operatorCloseout === true) &&
      (!verifierFoundationDbSplitModuleCloseout || (verifierFoundationDbSplitModuleCloseout.backlogIds || []).includes(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID)) &&
      verifierFoundationDbSplitModuleDogfood.ok === true &&
      foundationDbSplitVerifier.summary.passed === foundationDbSplitVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-foundation-db-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_APPROVAL_PATH) &&
      foundationDbSplitVerifierSource.includes('evaluateFoundationDbSplitVerifier') &&
      foundationDbSplitVerifierSource.includes('buildFoundationDbSplitVerifierDogfoodProof') &&
      verifierFoundationDbSplitModuleScriptSource.includes('dogfood rejects old Foundation-DB split verifier failures') &&
      verifierFoundationDbSplitModulePlanSource.includes('Substring-only proof is rejected') &&
      assuranceSource.includes('evaluateFoundationDbSplitVerifier(foundationDbSplitVerifierInput)') &&
      !foundationVerifySource.includes(oldInlineFoundationDbSplitPredicate) &&
      currentPlan.includes(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID])) &&
      assuranceSource.includes(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID),
    'VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001 extracts Foundation-DB split verifier checks into a focused module',
    verifierFoundationDbSplitModuleCard
      ? `lane=${verifierFoundationDbSplitModuleCard.lane} dogfood=${verifierFoundationDbSplitModuleDogfood.ok ? 'pass' : 'blocked'} dbSplitChecks=${foundationDbSplitVerifier.summary.passed}/${foundationDbSplitVerifier.summary.total} lines=${VERIFIER_FOUNDATION_DB_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLineCountAfterDbSplitVerifierSplit}`
      : `missing ${VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID}`,
  )

  return {
    ok: checks.every(check => check.ok),
    summary: {
      passed: checks.filter(check => check.ok).length,
      total: checks.length,
    },
    checks,
  }
}
