import {
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SPRINT_ID,
  buildFoundationCurrentSprintVerifierDogfoodProof,
} from './foundation-current-sprint-verifier.js'
import {
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_CLOSEOUT_KEY,
  buildFoundationHubSafetyVerifierDogfoodProof,
  evaluateFoundationHubSafetyVerifier,
} from './foundation-hub-safety-verifier.js'
import {
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SPRINT_ID,
  buildFoundationIntelligenceAuditVerifierDogfoodProof,
  evaluateFoundationIntelligenceAuditVerifier,
} from './foundation-intelligence-audit-verifier.js'
import {
  buildFoundationOperatorBudgetVerifierDogfoodProof,
  evaluateFoundationOperatorBudgetVerifier,
} from './foundation-operator-budget-verifier.js'
import {
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_APPROVAL_PATH,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_PLAN_PATH,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_SCRIPT_PATH,
  buildFoundationDbSchemaSeedSplitDogfoodProof,
  evaluateFoundationDbSchemaSeedSplit,
} from './foundation-db-schema-seed-store.js'
import {
  FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID,
  FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY,
  buildFoundationVerifyRegistrySplitDogfoodProof,
  evaluateFoundationVerifyRegistrySplit,
} from './foundation-verify-registry-split.js'
import {
  VERIFIER_ROUTE_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID,
  VERIFIER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_ROUTE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_ROUTE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_ROUTE_SPLIT_MODULE_SPRINT_ID,
  buildFoundationRouteSplitVerifierDogfoodProof,
  evaluateFoundationRouteSplitVerifier,
} from './foundation-route-split-verifier.js'
import {
  VERIFIER_SOURCE_CONTRACT_MODULE_APPROVAL_PATH,
  VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID,
  VERIFIER_SOURCE_CONTRACT_MODULE_CLOSEOUT_KEY,
  VERIFIER_SOURCE_CONTRACT_MODULE_PLAN_PATH,
  VERIFIER_SOURCE_CONTRACT_MODULE_SCRIPT_PATH,
  VERIFIER_SOURCE_CONTRACT_MODULE_SPRINT_ID,
  buildFoundationSourceContractVerifierDogfoodProof,
} from './foundation-source-contract-verifier.js'
import {
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SPRINT_ID,
  buildFoundationSourceTrustVerifierDogfoodProof,
} from './foundation-source-trust-verifier.js'

export const VERIFIER_MODULE_ASSURANCE_SPLIT_CARD_ID = 'VERIFIER-MODULE-ASSURANCE-SPLIT-001'
export const VERIFIER_MODULE_ASSURANCE_SPLIT_CLOSEOUT_KEY = 'verifier-module-assurance-split-v1'
export const VERIFIER_MODULE_ASSURANCE_SPLIT_PLAN_PATH = 'docs/process/verifier-module-assurance-split-001-plan.md'
export const VERIFIER_MODULE_ASSURANCE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-MODULE-ASSURANCE-SPLIT-001.json'
export const VERIFIER_MODULE_ASSURANCE_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-module-assurance-split-check.mjs'
export const VERIFIER_MODULE_ASSURANCE_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-module-assurance-split-closeout.md'
export const VERIFIER_MODULE_ASSURANCE_SPLIT_BEFORE_LINES = 11293

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function evaluateModuleAssuranceFixture(fixture = {}) {
  const findings = []
  if (fixture.focusedVerifierChecksPass !== true) findings.push('focused_verifier_partial_failure_hidden')
  if (fixture.operatorBudgetDogfoodPresent !== true) findings.push('operator_budget_dogfood_missing')
  if (fixture.hubSafetyDogfoodPresent !== true) findings.push('hub_safety_matrix_proof_missing')
  if (fixture.moduleCloseoutProofPresent !== true) findings.push('split_module_closeout_proof_missing')
  if (fixture.planRejectsSubstringOnly !== true) findings.push('substring_only_proof_allowed')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierModuleAssuranceDogfoodProof() {
  const healthy = evaluateModuleAssuranceFixture({
    focusedVerifierChecksPass: true,
    operatorBudgetDogfoodPresent: true,
    hubSafetyDogfoodPresent: true,
    moduleCloseoutProofPresent: true,
    planRejectsSubstringOnly: true,
  })
  const rejected = {
    hiddenVerifierFailure: evaluateModuleAssuranceFixture({
      focusedVerifierChecksPass: false,
      operatorBudgetDogfoodPresent: true,
      hubSafetyDogfoodPresent: true,
      moduleCloseoutProofPresent: true,
      planRejectsSubstringOnly: true,
    }),
    missingOperatorDogfood: evaluateModuleAssuranceFixture({
      focusedVerifierChecksPass: true,
      operatorBudgetDogfoodPresent: false,
      hubSafetyDogfoodPresent: true,
      moduleCloseoutProofPresent: true,
      planRejectsSubstringOnly: true,
    }),
    missingHubMatrixProof: evaluateModuleAssuranceFixture({
      focusedVerifierChecksPass: true,
      operatorBudgetDogfoodPresent: true,
      hubSafetyDogfoodPresent: false,
      moduleCloseoutProofPresent: true,
      planRejectsSubstringOnly: true,
    }),
    missingModuleCloseoutProof: evaluateModuleAssuranceFixture({
      focusedVerifierChecksPass: true,
      operatorBudgetDogfoodPresent: true,
      hubSafetyDogfoodPresent: true,
      moduleCloseoutProofPresent: false,
      planRejectsSubstringOnly: true,
    }),
    substringOnlyProof: evaluateModuleAssuranceFixture({
      focusedVerifierChecksPass: true,
      operatorBudgetDogfoodPresent: true,
      hubSafetyDogfoodPresent: true,
      moduleCloseoutProofPresent: true,
      planRejectsSubstringOnly: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy module-assurance fixture passes; hidden verifier failures, missing dogfood, missing closeout proof, and substring-only proof fail closed'
      : 'module-assurance dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierModuleAssurance(input = {}) {
  const {
    activeFoundationSprint,
    activeSprintAtOrPast,
    buildIntelRouteSplitPlanSource,
    buildIntelRouteSplitScriptSource,
    closeoutRecordAsBuildLogEntry,
    codeQualityNightlyAuditSource,
    connectorUptimeMonitorSource,
    currentPlan,
    currentSprintVerifier,
    currentState,
    foundationBacklogDetailEndpointApi,
    foundationBrandStack,
    foundationBuildCloseouts,
    foundationBuildIntelExtractionApi,
    foundationBuildIntelRoutesSource,
    foundationBuildIntelWatchlist,
    foundationBuildLog,
    foundationChangeLog,
    foundationChangesApi,
    foundationConnectorCredentialPreflightApi,
    foundationControlCompressionApi,
    foundationCurrentSprintVerifierSource,
    foundationDailySummary,
    foundationDbSource,
    foundationDbSessionSource,
    foundationDbSchemaSeedStoreSource,
    foundationDocUpdatesApi,
    foundationEndpointBudgetsPlanSource,
    foundationEndpointBudgetsScriptSource,
    foundationEndpointBudgetsSource,
    foundationFrontendAssetBudgetsPlanSource,
    foundationFrontendAssetBudgetsScriptSource,
    foundationFrontendAssetBudgetsSource,
    foundationFrontendDomBudgetsPlanSource,
    foundationFrontendDomBudgetsScriptSource,
    foundationFrontendDomBudgetsSource,
    foundationGStackBuildIntelApi,
    foundationHub,
    foundationHubSafetyVerifierPlanSource,
    foundationHubSafetyVerifierScriptSource,
    foundationHubSafetyVerifierSource,
    foundationHubSummary,
    foundationHubSummaryPayloadSource,
    foundationImplementationIntelligenceApi,
    foundationIntelligenceAuditVerifierSource,
    foundationMarketingSourceMap,
    foundationMultimodalExtractorContract,
    foundationOperatorBudgetVerifierPlanSource,
    foundationOperatorBudgetVerifierScriptSource,
    foundationOperatorBudgetVerifierSource,
    foundationOperatorRoutesSource,
    foundationPerUserChangelog,
    foundationRestrictedDecisionQueue,
    foundationRouteBudgetCleanupScriptSource,
    foundationRouteSplitVerifierSource,
    foundationSourceConnectorMatrixApi,
    foundationSourceCoverageCloseout,
    foundationSourceExtractionCoverage,
    foundationSourceHubRoutingMatrixApi,
    foundationSourceLifecycle,
    foundationSourceMaturityGrid,
    foundationSourceRoutesSource,
    foundationResearchInboxContract,
    foundationTierBehavioralCompletion,
    foundationVerificationRuns,
    foundationVerifyRootSource,
    foundationVerifySource,
    hubReadRoutesSource,
    kpiHealthSource,
    nightlyDeepAuditScriptSource,
    nightlyDeepAuditUpgradeSource,
    packageJson,
    repoFileExists,
    repoRoot,
    securityAccessSource,
    serverRouteSplitPlanSource,
    serverRouteSplitScriptSource,
    serverSource,
    sourceContractVerifierResult,
    sourceOfTruth,
    sourceOfTruthPayloadSource,
    sourceRegistry,
    sourceRouteSplitPlanSource,
    sourceRouteSplitScriptSource,
    sourceTrustVerifier,
    moduleSource,
    verifierCurrentSprintSplitModulePlanSource,
    verifierCurrentSprintSplitModuleScriptSource,
    verifierIntelligenceAuditSplitModulePlanSource,
    verifierIntelligenceAuditSplitModuleScriptSource,
    verifierRouteSplitModulePlanSource,
    verifierRouteSplitModuleScriptSource,
    verifierSourceContractModulePlanSource,
    verifierSourceContractModuleScriptSource,
    verifierSourceTrustSplitModulePlanSource,
    verifierSourceTrustSplitModuleScriptSource,
  } = input
  const checks = []
  const assuranceSource = [foundationVerifySource, moduleSource].filter(Boolean).join('\n')

  const intelligenceAuditVerifier = await evaluateFoundationIntelligenceAuditVerifier({
    repoRoot,
    foundationHub,
    activeFoundationSprint,
    foundationBuildCloseouts,
    foundationBuildLog,
    packageJson,
    currentPlan,
    currentState,
    sourceRegistry,
    foundationBuildIntelRoutesSource,
    securityAccessSource,
    foundationJobsSource: input.foundationJobsSource,
    foundationVerifySource: assuranceSource,
    moduleSource: foundationIntelligenceAuditVerifierSource,
  })
  checks.push(...intelligenceAuditVerifier.checks)
  const operatorBudgetVerifier = await evaluateFoundationOperatorBudgetVerifier({
    repoRoot,
    foundationHub,
    foundationHubSummary,
    sourceOfTruth,
    activeFoundationSprint,
    foundationBuildCloseouts,
    foundationBuildLog,
    packageJson,
    packageScripts: packageJson.scripts,
    serverSource,
    kpiHealthSource,
    sourceOfTruthPayloadSource,
    foundationHubSummaryPayloadSource,
    foundationRouteBudgetCleanupScriptSource,
    foundationEndpointBudgetsSource,
    foundationEndpointBudgetsScriptSource,
    foundationEndpointBudgetsPlanSource,
    nightlyDeepAuditUpgradeSource,
    nightlyDeepAuditScriptSource,
    connectorUptimeMonitorSource,
    hubReadRoutesSource,
    foundationFrontendAssetBudgetsSource,
    foundationFrontendAssetBudgetsScriptSource,
    foundationFrontendAssetBudgetsPlanSource,
    codeQualityNightlyAuditSource,
    foundationFrontendDomBudgetsSource,
    foundationFrontendDomBudgetsScriptSource,
    foundationFrontendDomBudgetsPlanSource,
    foundationVerifySource: assuranceSource,
    moduleSource: foundationOperatorBudgetVerifierSource,
    proofScriptSource: foundationOperatorBudgetVerifierScriptSource,
    planSource: foundationOperatorBudgetVerifierPlanSource,
    currentPlan,
    currentState,
    closeoutRecordAsBuildLogEntry,
    repoFileExists,
    sourceDurationMs: 100,
    sourcePayloadBytes: Buffer.byteLength(JSON.stringify(sourceOfTruth)),
    foundationHubPayloadBytes: Number(foundationHubSummary.foundationHubPerformance?.payloadBytes || 0),
    foundationVerifyLineCount: String(foundationVerifySource || '').split('\n').length,
  })
  checks.push(...operatorBudgetVerifier.checks)
  const operatorBudgetVerifierDogfood = buildFoundationOperatorBudgetVerifierDogfoodProof()
  ensure(
    checks,
    operatorBudgetVerifier.ok === true && operatorBudgetVerifierDogfood.ok === true,
    'Foundation operator budget verifier keeps route, endpoint, frontend, DOM, and failure-reporting budgets honest',
    `checks=${operatorBudgetVerifier.summary.passed}/${operatorBudgetVerifier.summary.total} dogfood=${operatorBudgetVerifierDogfood.ok ? 'pass' : 'blocked'} route=${operatorBudgetVerifier.details.routeBudget?.hubBytes || 0}B endpointMissing=${operatorBudgetVerifier.details.endpointBudget?.missingCount || 0} domRisk=${operatorBudgetVerifier.details.frontendDom?.riskCount || 0}`,
  )
  const hubSafetyVerifier = await evaluateFoundationHubSafetyVerifier({
    repoRoot,
    foundationHub,
    foundationHubSummary,
    foundationBuildCloseouts,
    packageScripts: packageJson.scripts,
    packageJson,
    activeFoundationSprint,
    sourceOfTruth,
    serverSource,
    foundationOperatorRoutesSource,
    foundationBacklogDetailEndpointApi,
    foundationVerifySource: assuranceSource,
    moduleSource: foundationHubSafetyVerifierSource,
    proofScriptSource: foundationHubSafetyVerifierScriptSource,
    planSource: foundationHubSafetyVerifierPlanSource,
    currentPlan,
    currentState,
    activeSprintAtOrPast,
    repoFileExists,
    foundationVerifyLineCount: String(foundationVerifySource || '').split('\n').length,
  })
  checks.push(...hubSafetyVerifier.checks)
  const hubSafetyVerifierDogfood = buildFoundationHubSafetyVerifierDogfoodProof({
    matrix: hubSafetyVerifier.details.hubWorkOwnershipMatrix,
  })
  ensure(
    checks,
    hubSafetyVerifier.ok === true && hubSafetyVerifierDogfood.ok === true,
    'Foundation hub-safety verifier keeps hub coordination and backlog contracts honest',
    `checks=${hubSafetyVerifier.summary.passed}/${hubSafetyVerifier.summary.total} dogfood=${hubSafetyVerifierDogfood.ok ? 'pass' : 'blocked'} route=${foundationHubSummary.foundationHubPerformance?.payloadBytes || 0}B`,
  )
  const verifyRegistrySplit = await evaluateFoundationVerifyRegistrySplit({
    foundationVerifySource: foundationVerifyRootSource || foundationVerifySource,
    structuralAssuranceSource: input.foundationVerifierStructuralAssuranceCoreSource,
    codeQualityNightlyAuditSource,
    packageScripts: packageJson.scripts || {},
    backlogItems: foundationHub.backlogItems || [],
    closeouts: foundationBuildCloseouts,
    repoFileExists,
  })
  checks.push(...verifyRegistrySplit.checks)
  const verifyRegistrySplitDogfood = buildFoundationVerifyRegistrySplitDogfoodProof()
  ensure(
    checks,
    verifyRegistrySplit.ok === true && verifyRegistrySplitDogfood.ok === true,
    'FOUNDATION-VERIFY-REGISTRY-SPLIT-001 keeps the root verifier under budget with registered split domains',
    `checks=${verifyRegistrySplit.summary.passed}/${verifyRegistrySplit.summary.total} dogfood=${verifyRegistrySplitDogfood.ok ? 'pass' : 'blocked'} closeout=${FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY}`,
  )
  const dbSchemaSeedSplit = evaluateFoundationDbSchemaSeedSplit({
    foundationDbSource,
    foundationDbSessionSource,
    schemaSeedSource: foundationDbSchemaSeedStoreSource,
  })
  const dbSchemaSeedSplitDogfood = buildFoundationDbSchemaSeedSplitDogfoodProof({
    foundationDbSource,
    foundationDbSessionSource,
    schemaSeedSource: foundationDbSchemaSeedStoreSource,
  })
  const dbSchemaSeedSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID) || null
  const dbSchemaSeedSplitClosed = dbSchemaSeedSplitCard?.lane === 'done'
  const dbSchemaSeedSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_DB_SCHEMA_SEED_SPLIT_CLOSEOUT_KEY) || null
  ensure(
    checks,
      dbSchemaSeedSplitCard &&
      ['executing', 'done'].includes(dbSchemaSeedSplitCard.lane) &&
      (!dbSchemaSeedSplitClosed || (
        String(dbSchemaSeedSplitCard.statusNote || '').includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CLOSEOUT_KEY) &&
        dbSchemaSeedSplitCloseout?.operatorCloseout === true &&
        (dbSchemaSeedSplitCloseout.backlogIds || []).includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-18-foundation-db-schema-seed-split-closeout.md')
      )) &&
      dbSchemaSeedSplit.ok === true &&
      dbSchemaSeedSplitDogfood.ok === true &&
      packageJson.scripts?.['process:foundation-db-schema-seed-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_DB_SCHEMA_SEED_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_DB_SCHEMA_SEED_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_DB_SCHEMA_SEED_SPLIT_APPROVAL_PATH) &&
      (
        String(foundationDbSource || '').includes('./foundation-db-schema-seed-store.js') ||
        (
          String(foundationDbSource || '').includes("} from './foundation-db-session.js'") &&
          String(foundationDbSessionSource || '').includes('./foundation-db-schema-seed-store.js')
        )
      ) &&
      String(foundationDbSchemaSeedStoreSource || '').includes('createFoundationDbSchemaSeedStore') &&
      String(moduleSource || '').includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID),
    'FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 keeps DB schema/bootstrap initialization module-owned',
    dbSchemaSeedSplitCard
      ? `lane=${dbSchemaSeedSplitCard.lane} dogfood=${dbSchemaSeedSplitDogfood.ok ? 'pass' : 'blocked'} checks=${dbSchemaSeedSplit.checks.filter(check => check.ok).length}/${dbSchemaSeedSplit.checks.length}`
      : `missing ${FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID}`,
  )
  const routeSplitVerifierResult = evaluateFoundationRouteSplitVerifier({
    cards: foundationHub.backlogItems || [],
    closeouts: foundationBuildCloseouts,
    packageScripts: packageJson.scripts || {},
    repoFiles: {
      'docs/process/server-route-split-001-plan.md': await repoFileExists('docs/process/server-route-split-001-plan.md'),
      'docs/process/approvals/SERVER-ROUTE-SPLIT-001.json': await repoFileExists('docs/process/approvals/SERVER-ROUTE-SPLIT-001.json'),
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-server-route-split-closeout.md': await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-server-route-split-closeout.md'),
      'docs/process/source-route-split-001-plan.md': await repoFileExists('docs/process/source-route-split-001-plan.md'),
      'docs/process/approvals/SOURCE-ROUTE-SPLIT-001.json': await repoFileExists('docs/process/approvals/SOURCE-ROUTE-SPLIT-001.json'),
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-source-route-split-closeout.md': await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-source-route-split-closeout.md'),
      'docs/process/build-intel-route-split-001-plan.md': await repoFileExists('docs/process/build-intel-route-split-001-plan.md'),
      'docs/process/approvals/BUILD-INTEL-ROUTE-SPLIT-001.json': await repoFileExists('docs/process/approvals/BUILD-INTEL-ROUTE-SPLIT-001.json'),
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-build-intel-route-split-closeout.md': await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-build-intel-route-split-closeout.md'),
    },
    sources: {
      serverSource,
      foundationOperatorRoutesSource,
      foundationSourceRoutesSource,
      foundationBuildIntelRoutesSource,
      scriptSources: {
        'SERVER-ROUTE-SPLIT-001': serverRouteSplitScriptSource,
        'SOURCE-ROUTE-SPLIT-001': sourceRouteSplitScriptSource,
        'BUILD-INTEL-ROUTE-SPLIT-001': buildIntelRouteSplitScriptSource,
      },
      planSources: {
        'SERVER-ROUTE-SPLIT-001': serverRouteSplitPlanSource,
        'SOURCE-ROUTE-SPLIT-001': sourceRouteSplitPlanSource,
        'BUILD-INTEL-ROUTE-SPLIT-001': buildIntelRouteSplitPlanSource,
      },
    },
    apis: {
      foundationChangesApi,
      foundationBuildLog,
      foundationChangeLog,
      foundationDailySummary,
      foundationDocUpdatesApi,
      foundationBacklogDetailEndpointRouteValidation: hubSafetyVerifier.details.foundationBacklogDetailEndpointRouteValidation,
      sourceOfTruth,
      foundationSourceLifecycle,
      foundationSourceMaturityGrid,
      foundationSourceExtractionCoverage,
      foundationSourceCoverageCloseout,
      foundationMarketingSourceMap,
      foundationBrandStack,
      foundationTierBehavioralCompletion,
      foundationVerificationRuns,
      foundationPerUserChangelog,
      foundationRestrictedDecisionQueue,
      foundationSourceConnectorMatrixApi,
      foundationConnectorCredentialPreflightApi,
      foundationSourceHubRoutingMatrixApi,
      foundationBuildIntelWatchlist,
      foundationMultimodalExtractorContract,
      foundationResearchInboxContract,
      foundationControlCompressionApi,
      foundationImplementationIntelligenceApi,
      foundationBuildIntelExtractionApi,
      foundationGStackBuildIntelApi,
    },
    currentPlan,
    currentState,
    activeSprintId: activeFoundationSprint.sprint?.sprintId,
    activeSprintAtOrPast,
    foundationVerifySource: assuranceSource,
  })
  checks.push(...routeSplitVerifierResult.checks)
  const verifierRouteSplitModuleCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID) || null
  const verifierRouteSplitModuleCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierRouteSplitModuleDogfood = buildFoundationRouteSplitVerifierDogfoodProof()
  ensure(
    checks,
      verifierRouteSplitModuleCard &&
      verifierRouteSplitModuleCard.lane === 'done' &&
      String(verifierRouteSplitModuleCard.statusNote || '').includes(VERIFIER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY) &&
      verifierRouteSplitModuleCloseout?.operatorCloseout === true &&
      (verifierRouteSplitModuleCloseout.backlogIds || []).includes(VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID) &&
      verifierRouteSplitModuleDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-route-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_ROUTE_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_ROUTE_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_ROUTE_SPLIT_MODULE_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-verifier-route-split-module-closeout.md') &&
      foundationRouteSplitVerifierSource.includes('evaluateFoundationRouteSplitVerifier') &&
      foundationRouteSplitVerifierSource.includes('FOUNDATION_ROUTE_SPLIT_DEFINITIONS') &&
      verifierRouteSplitModuleScriptSource.includes('dogfood rejects old route-split verifier failures') &&
      verifierRouteSplitModulePlanSource.includes('Dogfood proof recreates the failure class') &&
      currentPlan.includes(VERIFIER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_ROUTE_SPLIT_MODULE_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID])) &&
      assuranceSource.includes(VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID),
    'VERIFIER-MONOLITH-SPLIT-CONTINUE-001 extracts route-split verifier checks into a focused module',
    verifierRouteSplitModuleCard
      ? `lane=${verifierRouteSplitModuleCard.lane} dogfood=${verifierRouteSplitModuleDogfood.ok ? 'pass' : 'blocked'} routeSplitChecks=${routeSplitVerifierResult.summary.passed}/${routeSplitVerifierResult.summary.total}`
      : `missing ${VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID}`,
  )
  const verifierSourceContractModuleCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID) || null
  const verifierSourceContractModuleCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_SOURCE_CONTRACT_MODULE_CLOSEOUT_KEY) || null
  const verifierSourceContractModuleDogfood = buildFoundationSourceContractVerifierDogfoodProof()
  const verifierSourceContractModuleClosed = verifierSourceContractModuleCard?.lane === 'done'
  ensure(
    checks,
      verifierSourceContractModuleCard &&
      ['executing', 'done'].includes(verifierSourceContractModuleCard.lane) &&
      (!verifierSourceContractModuleClosed || (
        String(verifierSourceContractModuleCard.statusNote || '').includes(VERIFIER_SOURCE_CONTRACT_MODULE_CLOSEOUT_KEY) &&
        verifierSourceContractModuleCloseout?.operatorCloseout === true &&
        (verifierSourceContractModuleCloseout.backlogIds || []).includes(VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-verifier-source-contracts-module-closeout.md')
      )) &&
      verifierSourceContractModuleDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-source-contracts-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_SOURCE_CONTRACT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_SOURCE_CONTRACT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_SOURCE_CONTRACT_MODULE_APPROVAL_PATH) &&
      input.foundationSourceContractVerifierSource.includes('evaluateFoundationSourceContractVerifier') &&
      input.foundationSourceContractVerifierSource.includes('buildFoundationSourceContractVerifierDogfoodProof') &&
      verifierSourceContractModuleScriptSource.includes('dogfood rejects source-contract verifier failures') &&
      verifierSourceContractModulePlanSource.includes('Dogfood proof recreates the failure class') &&
      currentPlan.includes(VERIFIER_SOURCE_CONTRACT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_SOURCE_CONTRACT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_SOURCE_CONTRACT_MODULE_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID])) &&
      assuranceSource.includes(VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID),
    'VERIFIER-MONOLITH-SPLIT-CONTINUE-002 extracts source-contract verifier checks into a focused module',
    verifierSourceContractModuleCard
      ? `lane=${verifierSourceContractModuleCard.lane} dogfood=${verifierSourceContractModuleDogfood.ok ? 'pass' : 'blocked'} sourceChecks=${sourceContractVerifierResult.summary.passed}/${sourceContractVerifierResult.summary.total}`
      : `missing ${VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID}`,
  )
  const verifierSourceTrustSplitModuleCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID) || null
  const verifierSourceTrustSplitModuleCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierSourceTrustSplitModuleDogfood = buildFoundationSourceTrustVerifierDogfoodProof()
  const verifierSourceTrustSplitModuleClosed = verifierSourceTrustSplitModuleCard?.lane === 'done'
  ensure(
    checks,
      verifierSourceTrustSplitModuleCard &&
      ['executing', 'done'].includes(verifierSourceTrustSplitModuleCard.lane) &&
      (!verifierSourceTrustSplitModuleClosed || (
        String(verifierSourceTrustSplitModuleCard.statusNote || '').includes(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) &&
        verifierSourceTrustSplitModuleCloseout?.operatorCloseout === true &&
        (verifierSourceTrustSplitModuleCloseout.backlogIds || []).includes(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-verifier-source-trust-split-module-closeout.md')
      )) &&
      verifierSourceTrustSplitModuleDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-source-trust-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_APPROVAL_PATH) &&
      input.foundationSourceTrustVerifierSource.includes('evaluateFoundationSourceTrustVerifier') &&
      input.foundationSourceTrustVerifierSource.includes('buildFoundationSourceTrustVerifierDogfoodProof') &&
      verifierSourceTrustSplitModuleScriptSource.includes('dogfood rejects source-trust verifier failures') &&
      verifierSourceTrustSplitModulePlanSource.includes('Dogfood proof recreates the failure class') &&
      currentPlan.includes(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID])) &&
      input.foundationSourceTrustVerifierSource.includes(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID),
    'VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001 extracts source-trust verifier checks into a focused module',
    verifierSourceTrustSplitModuleCard
      ? `lane=${verifierSourceTrustSplitModuleCard.lane} dogfood=${verifierSourceTrustSplitModuleDogfood.ok ? 'pass' : 'blocked'} sourceTrustChecks=${sourceTrustVerifier.summary.passed}/${sourceTrustVerifier.summary.total}`
      : `missing ${VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID}`,
  )
  const verifierCurrentSprintSplitModuleCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID) || null
  const verifierCurrentSprintSplitModuleCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierCurrentSprintSplitModuleDogfood = buildFoundationCurrentSprintVerifierDogfoodProof()
  const verifierCurrentSprintSplitModuleClosed = verifierCurrentSprintSplitModuleCard?.lane === 'done'
  ensure(
    checks,
      verifierCurrentSprintSplitModuleCard &&
      ['executing', 'done'].includes(verifierCurrentSprintSplitModuleCard.lane) &&
      (!verifierCurrentSprintSplitModuleClosed || (
        String(verifierCurrentSprintSplitModuleCard.statusNote || '').includes(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY) &&
        verifierCurrentSprintSplitModuleCloseout?.operatorCloseout === true &&
        (verifierCurrentSprintSplitModuleCloseout.backlogIds || []).includes(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-verifier-current-sprint-split-module-closeout.md')
      )) &&
      verifierCurrentSprintSplitModuleDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-current-sprint-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_APPROVAL_PATH) &&
      foundationCurrentSprintVerifierSource.includes('evaluateFoundationCurrentSprintVerifier') &&
      foundationCurrentSprintVerifierSource.includes('buildFoundationCurrentSprintVerifierDogfoodProof') &&
      verifierCurrentSprintSplitModuleScriptSource.includes('dogfood rejects Current Sprint verifier failures') &&
      verifierCurrentSprintSplitModulePlanSource.includes('Dogfood proof recreates the failure class') &&
      currentPlan.includes(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID])) &&
      foundationCurrentSprintVerifierSource.includes(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID),
    'VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001 extracts Current Sprint verifier checks into a focused module',
    verifierCurrentSprintSplitModuleCard
      ? `lane=${verifierCurrentSprintSplitModuleCard.lane} dogfood=${verifierCurrentSprintSplitModuleDogfood.ok ? 'pass' : 'blocked'} currentSprintChecks=${currentSprintVerifier.summary.passed}/${currentSprintVerifier.summary.total}`
      : `missing ${VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID}`,
  )
  const verifierIntelligenceAuditSplitModuleCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID) || null
  const verifierIntelligenceAuditSplitModuleCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierIntelligenceAuditSplitModuleDogfood = await buildFoundationIntelligenceAuditVerifierDogfoodProof()
  const verifierIntelligenceAuditSplitModuleClosed = verifierIntelligenceAuditSplitModuleCard?.lane === 'done'
  const foundationVerifyLineCountAfterIntelligenceAuditSplit = String(foundationVerifySource || '').split('\n').length
  ensure(
    checks,
      verifierIntelligenceAuditSplitModuleCard &&
      ['executing', 'done'].includes(verifierIntelligenceAuditSplitModuleCard.lane) &&
      (!verifierIntelligenceAuditSplitModuleClosed || (
        String(verifierIntelligenceAuditSplitModuleCard.statusNote || '').includes(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CLOSEOUT_KEY) &&
        verifierIntelligenceAuditSplitModuleCloseout?.operatorCloseout === true &&
        (verifierIntelligenceAuditSplitModuleCloseout.backlogIds || []).includes(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-verifier-intelligence-audit-split-module-closeout.md')
      )) &&
      verifierIntelligenceAuditSplitModuleDogfood.ok === true &&
      intelligenceAuditVerifier.summary.passed === intelligenceAuditVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-intelligence-audit-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_APPROVAL_PATH) &&
      foundationIntelligenceAuditVerifierSource.includes('evaluateFoundationIntelligenceAuditVerifier') &&
      foundationIntelligenceAuditVerifierSource.includes('buildFoundationIntelligenceAuditVerifierDogfoodProof') &&
      verifierIntelligenceAuditSplitModuleScriptSource.includes('dogfood rejects intelligence/audit verifier failures') &&
      verifierIntelligenceAuditSplitModulePlanSource.includes('Dogfood proof recreates the failure class') &&
      String(moduleSource || '').includes('evaluateFoundationIntelligenceAuditVerifier({') &&
      String(moduleSource || '').includes('intelligenceAuditVerifier.checks') &&
      !foundationVerifySource.includes('const implementationIntelligence' + 'Cards =') &&
      !foundationVerifySource.includes('const codeQualityNightly' + 'AuditCards =') &&
      currentPlan.includes(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID])) &&
      foundationIntelligenceAuditVerifierSource.includes(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID) &&
      String(moduleSource || '').includes(FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID),
    'VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001 extracts intelligence/audit verifier checks into a focused module',
    verifierIntelligenceAuditSplitModuleCard
      ? `lane=${verifierIntelligenceAuditSplitModuleCard.lane} dogfood=${verifierIntelligenceAuditSplitModuleDogfood.ok ? 'pass' : 'blocked'} intelligenceChecks=${intelligenceAuditVerifier.summary.passed}/${intelligenceAuditVerifier.summary.total} lines=${VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLineCountAfterIntelligenceAuditSplit}`
      : `missing ${VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID}`,
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
