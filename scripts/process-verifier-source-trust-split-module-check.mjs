#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  PHASE_C_VISIBILITY_CARD_IDS,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SPRINT_ID,
  buildFoundationSourceTrustVerifierDogfoodProof,
  evaluateFoundationSourceTrustVerifier,
} from '../lib/foundation-source-trust-verifier.js'
import { getGroupedSourceSystems, getSourceConnectors, getSourceContracts } from '../lib/source-contracts.js'
import { buildCardReferenceTrustStatus, buildSyntheticPhantomCardReferenceStatus } from '../lib/card-reference-trust.js'
import { buildSourceReferenceTrustStatus } from '../lib/source-reference-trust.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    baseUrl: (argv.find(arg => arg.startsWith('--baseUrl=')) || '').split('=')[1] || process.env.FOUNDATION_VERIFY_BASE_URL || 'http://localhost:3000',
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`GET ${pathname} failed: ${response.status}`)
  return response.json()
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

async function loadEvaluationInput({ baseUrl }) {
  const [
    sourceOfTruth,
    foundationHub,
    systemInventory,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageSource,
    foundationHtmlSource,
    foundationUiSource,
    foundationNavConfigSource,
    foundationDataSource,
    foundationSourceRegistryRenderersSource,
    foundationFubLeadSourceRenderersSource,
    foundationSystemInventoryRenderersSource,
    foundationCurrentStateRenderersSource,
    foundationDecisionQuestionRenderersSource,
    foundationSourceLifecycleRenderersSource,
    foundationRuntimeRenderersSource,
    foundationOperationsRenderersSource,
    foundationRouterSource,
    sourceContractsSource,
    sourceContractCleanupDoc,
    verifierConsolidationDoc,
    kpiHealthSource,
    kpiHealthScriptSource,
    kpiSourceNote,
    currentPlan,
    currentState,
    foundationDbSource,
    foundationBacklogSeedSource,
    serverSource,
    hubReadRoutesSource,
    strategySharedCommsRoutesSource,
    foundationWriteRoutesSource,
    agentFeedbackRoutesSource,
    driveCorpusNote,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/source-of-truth'),
    fetchJson(baseUrl, '/api/foundation-hub?detail=full'),
    fetchJson(baseUrl, '/api/system-inventory'),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-source-trust-verifier.js'),
    readText(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_PLAN_PATH),
    readText('package.json'),
    readText('public/foundation.html'),
    readText('public/foundation.js'),
    readText('public/foundation-nav-config.js'),
    readText('public/foundation-data.js'),
    readText('public/foundation-source-registry-renderers.js'),
    readText('public/foundation-fub-lead-source-renderers.js'),
    readText('public/foundation-system-inventory-renderers.js'),
    readText('public/foundation-current-state-renderers.js'),
    readText('public/foundation-decision-question-renderers.js'),
    readText('public/foundation-source-lifecycle-renderers.js'),
    readText('public/foundation-runtime-renderers.js'),
    readText('public/foundation-operations-renderers.js'),
    readText('public/foundation-router.js'),
    readText('lib/source-contracts.js'),
    readText('docs/process/source-contract-cleanup.md'),
    readText('docs/process/verifier-consolidation.md'),
    readText('lib/kpi-health.js'),
    readText('scripts/kpi-supabase-health.mjs'),
    readText('docs/source-notes/kpi-dashboard.md'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('lib/foundation-db.js'),
    readText('lib/foundation-backlog-seed.js'),
    readText('server.js'),
    readText('lib/hub-read-routes.js'),
    readText('lib/strategy-shared-comms-routes.js'),
    readText('lib/foundation-write-routes.js'),
    readText('lib/agent-feedback-routes.js'),
    readText('docs/source-notes/google-drive-corpus.md'),
  ])
  const liveBacklogCardIds = new Set((foundationHub.backlogItems || []).map(item => item.id))
  const phaseCApprovalFilesPresent = await Promise.all(
    PHASE_C_VISIBILITY_CARD_IDS.map(async cardId => {
      try {
        await fs.stat(path.join(repoRoot, `docs/process/approvals/${cardId}.json`))
        return true
      } catch {
        return false
      }
    }),
  )

  return {
    sourceOfTruth,
    foundationHub,
    sourceContracts: getSourceContracts(),
    sourceConnectors: getSourceConnectors(),
    groupedSourceSystems: getGroupedSourceSystems(),
    sourceTruthKpiHealth: sourceOfTruth.kpiHealth || {},
    foundationHubKpiHealth: foundationHub.kpiHealth || {},
    backlogHygieneApi: foundationHub.backlogHygiene || {},
    cardReferenceTrust: await buildCardReferenceTrustStatus({ repoRoot, declaredCardIds: liveBacklogCardIds }),
    syntheticCardReferenceTrust: buildSyntheticPhantomCardReferenceStatus(),
    sourceReferenceTrust: await buildSourceReferenceTrustStatus({ repoRoot }),
    systemInventory,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageSource,
    foundationFrontendSource: [
      foundationNavConfigSource,
      foundationDataSource,
      foundationUiSource,
      foundationSourceRegistryRenderersSource,
      foundationFubLeadSourceRenderersSource,
      foundationSystemInventoryRenderersSource,
      foundationCurrentStateRenderersSource,
      foundationDecisionQuestionRenderersSource,
      foundationSourceLifecycleRenderersSource,
      foundationRuntimeRenderersSource,
      foundationOperationsRenderersSource,
      foundationRouterSource,
    ].join('\n'),
    foundationHtmlSource,
    foundationUiSource,
    sourceContractsSource,
    sourceContractCleanupDoc,
    verifierConsolidationDoc,
    kpiHealthSource,
    kpiHealthScriptSource,
    kpiSourceNote,
    currentPlan,
    currentState,
    foundationDbWithBacklogSeedSource: `${foundationDbSource}\n${foundationBacklogSeedSource}`,
    serverRouteSource: [serverSource, hubReadRoutesSource, strategySharedCommsRoutesSource, foundationWriteRoutesSource, agentFeedbackRoutesSource].join('\n'),
    driveCorpusNote,
    phaseCApprovalFilesPresent,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    input,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: VERIFIER_SOURCE_TRUST_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID]),
    loadEvaluationInput({ baseUrl: args.baseUrl }),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.cardId === VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8) || null
  const evaluation = evaluateFoundationSourceTrustVerifier(input)
  const dogfood = buildFoundationSourceTrustVerifierDogfoodProof()
  const verifierLines = lineCount(input.foundationVerifySource)
  const oldInlineSourceTrustPredicate = 'const required' + 'WorkingConnectorIds ='

  addCheck(checks, approval.ok, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || VERIFIER_SOURCE_TRUST_SPLIT_MODULE_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SPRINT_ID || card?.lane === 'done', 'Current Sprint is the verifier source-trust split module sprint or card is historically done', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)) || card?.lane === 'done', 'Current Sprint contains the card in Building Now or card is historically done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : card?.lane || 'missing')
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, input.moduleSource.includes('evaluateFoundationSourceTrustVerifier') && input.moduleSource.includes('evaluateFoundationSourceTrustVerifierOrchestration') && input.moduleSource.includes('buildFoundationSourceTrustVerifierDogfoodProof'), 'new module owns source-trust verifier logic', 'lib/foundation-source-trust-verifier.js')
  addCheck(checks, evaluation.ok, 'source-trust verifier module passes current source state', `${evaluation.summary.passed}/${evaluation.summary.total}`)
  addCheck(checks, dogfood.ok, 'dogfood rejects source-trust verifier failures', dogfood.invariant)
  addCheck(checks, dogfood.missingConnector.ok === false, 'dogfood rejects missing working connector health', dogfood.missingConnector.failed.map(item => item.check).join('; '))
  addCheck(checks, dogfood.staleKpi.ok === false, 'dogfood rejects stale KPI health contract', dogfood.staleKpi.failed.map(item => item.check).join('; '))
  addCheck(checks, dogfood.missingReferenceTrust.ok === false, 'dogfood rejects missing reference trust', dogfood.missingReferenceTrust.failed.map(item => item.check).join('; '))
  addCheck(checks, dogfood.stalePhaseCoverage.ok === false, 'dogfood rejects substring-only Phase C coverage', dogfood.stalePhaseCoverage.failed.map(item => item.check).join('; '))
  addCheck(
    checks,
    (input.foundationVerifySource.includes('evaluateFoundationSourceTrustVerifier({') ||
      input.foundationVerifySource.includes('evaluateFoundationSourceTrustVerifierOrchestration({')) &&
      (input.foundationVerifySource.includes('sourceTrustVerifier.checks') ||
        input.foundationVerifySource.includes('sourceTrustOrchestrationVerifier.checks')),
    'foundation verifier delegates source-trust checks to focused module',
    'evaluateFoundationSourceTrustVerifier or evaluateFoundationSourceTrustVerifierOrchestration',
  )
  addCheck(checks, !input.foundationVerifySource.includes(oldInlineSourceTrustPredicate), 'foundation verifier no longer owns old inline source-trust predicates', 'old requiredWorkingConnectorIds block absent')
  addCheck(checks, verifierLines < VERIFIER_SOURCE_TRUST_SPLIT_MODULE_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_SOURCE_TRUST_SPLIT_MODULE_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(input.proofScriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  const packageJson = JSON.parse(input.packageSource)
  addCheck(checks, packageJson.scripts?.['process:verifier-source-trust-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-source-trust-split-module-check'] || 'missing')
  addCheck(checks, input.planSource.includes('Substring-only proof is rejected'), 'plan rejects substring-only proof', VERIFIER_SOURCE_TRUST_SPLIT_MODULE_PLAN_PATH)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_SOURCE_TRUST_SPLIT_MODULE_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_SOURCE_TRUST_SPLIT_MODULE_BEFORE_LINES,
    },
    checks,
    failed,
    dogfood: {
      healthy: dogfood.healthy.ok,
      missingConnectorRejected: dogfood.missingConnector.ok === false,
      staleKpiRejected: dogfood.staleKpi.ok === false,
      missingReferenceTrustRejected: dogfood.missingReferenceTrust.ok === false,
      stalePhaseCoverageRejected: dogfood.stalePhaseCoverage.ok === false,
    },
    evaluation: evaluation.summary,
    evaluationFailed: evaluation.failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('Verifier source-trust split module proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (failed.length) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
