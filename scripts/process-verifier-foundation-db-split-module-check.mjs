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
  FOUNDATION_DB_SPLIT_VERIFIER_COVERED_CARD_IDS,
  FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SPRINT_ID,
  buildFoundationDbSplitVerifierDogfoodProof,
  evaluateFoundationDbSplitVerifier,
} from '../lib/foundation-db-split-verifier.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
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

async function loadVerifierInput() {
  const [
    foundationVerifySource,
    packageSource,
    currentPlan,
    currentState,
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
    moduleSource,
    proofScriptSource,
    planSource,
  ] = await Promise.all([
    readText('scripts/foundation-verify.mjs'),
    readText('package.json'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('lib/foundation-db.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.schemaSeedStore),
    readText('lib/foundation-backlog-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.backlogStoreScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.backlogStorePlan),
    readText('lib/foundation-decision-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.decisionStoreScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.decisionStorePlan),
    readText('lib/foundation-core-seed.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.coreSeedScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.coreSeedPlan),
    readText('lib/foundation-strategy-source-snapshots.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.sourceSnapshotScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.sourceSnapshotPlan),
    readText('lib/foundation-strategy-operating-truth.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.operatingTruthScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.operatingTruthPlan),
    readText('lib/foundation-strategy-goal-truth.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.goalTruthScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.goalTruthPlan),
    readText('lib/foundation-fub-lead-source-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.fubLeadSourceScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.fubLeadSourcePlan),
    readText('lib/foundation-shared-comms-coverage.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.sharedCommsScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.sharedCommsPlan),
    readText('lib/foundation-shared-comms-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.sharedCommsStoreScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.sharedCommsStorePlan),
    readText('lib/foundation-llm-runtime-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.llmRuntimeStoreScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.llmRuntimeStorePlan),
    readText('lib/foundation-runtime-job-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.runtimeJobStoreScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.runtimeJobStorePlan),
    readText('lib/foundation-source-crawl-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.sourceCrawlStoreScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.sourceCrawlStorePlan),
    readText('lib/foundation-drive-meeting-vault-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.driveMeetingVaultStoreScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.driveMeetingVaultStorePlan),
    readText('lib/foundation-agent-feedback-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.agentFeedbackStoreScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.agentFeedbackStorePlan),
    readText('lib/foundation-sales-listing-store.js'),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.salesListingStoreScript),
    readText(FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS.salesListingStorePlan),
    readText('lib/foundation-db-split-verifier.js'),
    readText(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_PLAN_PATH),
  ])
  const activeFoundationSprint = await getActiveFoundationCurrentSprint()
  const activeSprintAtOrPast = cardIds =>
    (activeFoundationSprint.items || []).some(item =>
      (cardIds || []).includes(item.cardId) &&
        ['building_now', 'done_this_sprint'].includes(item.stage)
    )

  return {
    foundationHub: {
      backlogItems: await getBacklogItemsByIds([
        VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID,
        ...FOUNDATION_DB_SPLIT_VERIFIER_COVERED_CARD_IDS,
      ]),
    },
    foundationBuildCloseouts: (await import('../lib/foundation-build-log.js')).getFoundationBuildCloseouts(),
    packageJson: JSON.parse(packageSource),
    currentPlan,
    currentState,
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationVerifySource,
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
    moduleSource,
    proofScriptSource,
    planSource,
    repoFileExists,
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
      approvalRef: VERIFIER_FOUNDATION_DB_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID]),
    loadVerifierInput(),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID) || null
  const cardClosed = card?.lane === 'done'
  const planCritic = planCriticRuns.find(run => run.cardId === VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8) || null
  const evaluation = await evaluateFoundationDbSplitVerifier(input)
  const dogfood = await buildFoundationDbSplitVerifierDogfoodProof(input)
  const verifierLines = lineCount(input.foundationVerifySource)

  addCheck(checks, approval.ok, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || VERIFIER_FOUNDATION_DB_SPLIT_MODULE_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SPRINT_ID || cardClosed, 'Current Sprint is the verifier Foundation-DB split module sprint or the card is historically done', cardClosed ? 'card done' : (activeSprint.sprint?.sprintId || 'missing'))
  addCheck(checks, (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)) || cardClosed, 'Current Sprint contains the card in Building Now/Done or the card is historically done', cardClosed ? 'card done' : (sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing'))
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, input.moduleSource.includes('evaluateFoundationDbSplitVerifier') && input.moduleSource.includes('buildFoundationDbSplitVerifierDogfoodProof'), 'new module owns Foundation-DB split verifier logic', 'lib/foundation-db-split-verifier.js')
  addCheck(checks, evaluation.ok, 'Foundation-DB split verifier module passes current split state', `${evaluation.summary.passed}/${evaluation.summary.total}`)
  addCheck(checks, dogfood.ok, 'dogfood rejects old Foundation-DB split verifier failures', dogfood.invariant)
  addCheck(checks, dogfood.rejected?.missingBacklogModule, 'dogfood rejects missing backlog-store module evidence', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.oldInlineBacklogOwnership, 'dogfood rejects old inline backlog-store ownership', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingDecisionDogfood, 'dogfood rejects missing decision-store dogfood proof', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingCoreSeed, 'dogfood rejects missing core seed module export', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingSourceSnapshot, 'dogfood rejects missing source snapshot module evidence', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingOperatingTruth, 'dogfood rejects missing operating truth module export', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingGoalTruth, 'dogfood rejects missing goal truth module evidence', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingFubLeadSource, 'dogfood rejects missing FUB lead-source module evidence', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingSharedComms, 'dogfood rejects missing shared-comms module evidence', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingDriveMeetingVaultStore, 'dogfood rejects missing Drive/Meeting Vault store module evidence', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingAgentFeedbackStore, 'dogfood rejects missing Agent Feedback store module evidence', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingSalesListingStore, 'dogfood rejects missing Sales Listing store module evidence', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.oldInlineVerifier, 'dogfood rejects old inline verifier predicates', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, input.foundationVerifySource.includes('evaluateFoundationDbSplitVerifier') && input.foundationVerifySource.includes('buildFoundationDbSplitVerifierDogfoodProof'), 'foundation verifier delegates Foundation-DB split checks to focused module', 'evaluateFoundationDbSplitVerifier')
  const oldInlineFoundationDbPredicate = 'const foundationBacklog' + 'StoreSplitCard ='
  addCheck(checks, !input.foundationVerifySource.includes(oldInlineFoundationDbPredicate), 'foundation verifier no longer owns old inline Foundation-DB split predicates', 'old inline backlog-store split block absent')
  addCheck(checks, verifierLines < VERIFIER_FOUNDATION_DB_SPLIT_MODULE_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_FOUNDATION_DB_SPLIT_MODULE_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(input.proofScriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  addCheck(checks, input.packageJson.scripts?.['process:verifier-foundation-db-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SCRIPT_PATH}`, 'package script is registered', input.packageJson.scripts?.['process:verifier-foundation-db-split-module-check'] || 'missing')
  addCheck(checks, input.planSource.includes('Substring-only proof is rejected'), 'plan rejects substring-only proof', VERIFIER_FOUNDATION_DB_SPLIT_MODULE_PLAN_PATH)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_FOUNDATION_DB_SPLIT_MODULE_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_FOUNDATION_DB_SPLIT_MODULE_BEFORE_LINES,
    },
    checks,
    failed,
    dogfood: dogfood.rejected,
    foundationDbSplitChecks: evaluation.summary,
    foundationDbSplitFailed: evaluation.failed,
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    process.stdout.write(`${result.status}: ${checks.length - failed.length}/${checks.length} checks passed\n`)
    for (const failure of failed) {
      process.stdout.write(`- ${failure.check}: ${failure.detail}\n`)
    }
  }

  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
