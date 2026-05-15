#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  VERIFIER_FRONTEND_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_FRONTEND_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID,
  VERIFIER_FRONTEND_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_FRONTEND_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_FRONTEND_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_FRONTEND_SPLIT_MODULE_SPRINT_ID,
  buildFoundationFrontendSplitVerifierDogfoodProof,
  evaluateFoundationFrontendSplitVerifier,
} from '../lib/foundation-frontend-split-verifier.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const FRONTEND_SPLIT_CARD_IDS = [
  'FRONTEND-MONOLITH-SPLIT-001',
  'FRONTEND-OPERATIONS-RENDERERS-SPLIT-001',
  'FRONTEND-RUNTIME-RENDERERS-SPLIT-001',
  'FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001',
  'FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001',
  'FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001',
  'FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001',
  'FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001',
  'FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001',
]

function parseArgs(argv) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
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
  const banned = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return banned.every(token => !source.includes(token))
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
}

async function buildVerifierInput(baseUrl) {
  const [
    foundationHub,
    activeSprint,
    backlogCards,
    currentPlan,
    currentState,
    foundationVerifySource,
    packageSource,
    foundationHtmlSource,
    foundationUiSource,
    foundationNavConfigSource,
    foundationDataSource,
    foundationRouterSource,
    foundationOperationsRenderersSource,
    foundationRuntimeRenderersSource,
    foundationSourceLifecycleRenderersSource,
    foundationSourceRegistryRenderersSource,
    foundationFubLeadSourceRenderersSource,
    foundationSystemInventoryRenderersSource,
    foundationCurrentStateRenderersSource,
    foundationDecisionQuestionRenderersSource,
    frontendMonolithSplitScriptSource,
    frontendMonolithSplitPlanSource,
    frontendOperationsRenderersSplitScriptSource,
    frontendOperationsRenderersSplitPlanSource,
    frontendRuntimeRenderersSplitScriptSource,
    frontendRuntimeRenderersSplitPlanSource,
    frontendSourceLifecycleRenderersSplitScriptSource,
    frontendSourceLifecycleRenderersSplitPlanSource,
    frontendSourceRegistryRenderersSplitScriptSource,
    frontendSourceRegistryRenderersSplitPlanSource,
    frontendFubLeadSourceRenderersSplitScriptSource,
    frontendFubLeadSourceRenderersSplitPlanSource,
    frontendSystemInventoryRenderersSplitScriptSource,
    frontendSystemInventoryRenderersSplitPlanSource,
    frontendCurrentStateRenderersSplitScriptSource,
    frontendCurrentStateRenderersSplitPlanSource,
    frontendDecisionQuestionRenderersSplitScriptSource,
    frontendDecisionQuestionRenderersSplitPlanSource,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub?view=full'),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([...FRONTEND_SPLIT_CARD_IDS, VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID]),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('package.json'),
    readRepoFile('public/foundation.html'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-nav-config.js'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('public/foundation-runtime-renderers.js'),
    readRepoFile('public/foundation-source-lifecycle-renderers.js'),
    readRepoFile('public/foundation-source-registry-renderers.js'),
    readRepoFile('public/foundation-fub-lead-source-renderers.js'),
    readRepoFile('public/foundation-system-inventory-renderers.js'),
    readRepoFile('public/foundation-current-state-renderers.js'),
    readRepoFile('public/foundation-decision-question-renderers.js'),
    readRepoFile('scripts/process-frontend-monolith-split-check.mjs'),
    readRepoFile('docs/process/frontend-monolith-split-001-plan.md'),
    readRepoFile('scripts/process-frontend-operations-renderers-split-check.mjs'),
    readRepoFile('docs/process/frontend-operations-renderers-split-001-plan.md'),
    readRepoFile('scripts/process-frontend-runtime-renderers-split-check.mjs'),
    readRepoFile('docs/process/frontend-runtime-renderers-split-001-plan.md'),
    readRepoFile('scripts/process-frontend-source-lifecycle-renderers-split-check.mjs'),
    readRepoFile('docs/process/frontend-source-lifecycle-renderers-split-001-plan.md'),
    readRepoFile('scripts/process-frontend-source-registry-renderers-split-check.mjs'),
    readRepoFile('docs/process/frontend-source-registry-renderers-split-001-plan.md'),
    readRepoFile('scripts/process-frontend-fub-lead-source-renderers-split-check.mjs'),
    readRepoFile('docs/process/frontend-fub-lead-source-renderers-split-001-plan.md'),
    readRepoFile('scripts/process-frontend-system-inventory-renderers-split-check.mjs'),
    readRepoFile('docs/process/frontend-system-inventory-renderers-split-001-plan.md'),
    readRepoFile('scripts/process-frontend-current-state-renderers-split-check.mjs'),
    readRepoFile('docs/process/frontend-current-state-renderers-split-001-plan.md'),
    readRepoFile('scripts/process-frontend-decision-question-renderers-split-check.mjs'),
    readRepoFile('docs/process/frontend-decision-question-renderers-split-001-plan.md'),
  ])
  const backlogItems = Array.isArray(foundationHub.backlogItems) && foundationHub.backlogItems.length
    ? foundationHub.backlogItems
    : backlogCards
  const historicalDoneIds = new Set(
    backlogCards
      .filter(card => card?.lane === 'done' && String(card.statusNote || '').includes('-v1'))
      .map(card => card.id),
  )
  const currentSprintActiveBlockerCardId = activeSprint.sprint?.activeBlockerCardId || null
  const activeSprintCompleteReview =
    activeSprint.items?.length > 0 &&
    activeSprint.items.every(item => item.stage === 'done_this_sprint') &&
    !currentSprintActiveBlockerCardId
  return {
    foundationHub: {
      ...foundationHub,
      backlogItems,
    },
    foundationBuildCloseouts: getFoundationBuildCloseouts(),
    packageJson: JSON.parse(packageSource),
    currentPlan,
    currentState,
    activeFoundationSprint: activeSprint,
    activeSprintAtOrPast: expectedCardIds =>
      expectedCardIds.includes(currentSprintActiveBlockerCardId) ||
      expectedCardIds.some(cardId => historicalDoneIds.has(cardId)) ||
      activeSprintCompleteReview,
    foundationVerifySource,
    foundationHtmlSource,
    foundationUiSource,
    foundationNavConfigSource,
    foundationDataSource,
    foundationRouterSource,
    foundationOperationsRenderersSource,
    foundationRuntimeRenderersSource,
    foundationSourceLifecycleRenderersSource,
    foundationSourceRegistryRenderersSource,
    foundationFubLeadSourceRenderersSource,
    foundationSystemInventoryRenderersSource,
    foundationCurrentStateRenderersSource,
    foundationDecisionQuestionRenderersSource,
    frontendMonolithSplitScriptSource,
    frontendMonolithSplitPlanSource,
    frontendOperationsRenderersSplitScriptSource,
    frontendOperationsRenderersSplitPlanSource,
    frontendRuntimeRenderersSplitScriptSource,
    frontendRuntimeRenderersSplitPlanSource,
    frontendSourceLifecycleRenderersSplitScriptSource,
    frontendSourceLifecycleRenderersSplitPlanSource,
    frontendSourceRegistryRenderersSplitScriptSource,
    frontendSourceRegistryRenderersSplitPlanSource,
    frontendFubLeadSourceRenderersSplitScriptSource,
    frontendFubLeadSourceRenderersSplitPlanSource,
    frontendSystemInventoryRenderersSplitScriptSource,
    frontendSystemInventoryRenderersSplitPlanSource,
    frontendCurrentStateRenderersSplitScriptSource,
    frontendCurrentStateRenderersSplitPlanSource,
    frontendDecisionQuestionRenderersSplitScriptSource,
    frontendDecisionQuestionRenderersSplitPlanSource,
    repoFileExists,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const jsonOutput = args.json === true || args.json === 'true'
  const baseUrl = String(args.baseUrl || 'http://localhost:3000')
  const checks = []

  const [
    moduleSource,
    verifierSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-frontend-split-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_FRONTEND_SPLIT_MODULE_SCRIPT_PATH),
    readRepoFile(VERIFIER_FRONTEND_SPLIT_MODULE_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_FRONTEND_SPLIT_MODULE_APPROVAL_PATH,
    cardId: VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID])
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const verifierInput = await buildVerifierInput(baseUrl)
  const moduleResult = await evaluateFoundationFrontendSplitVerifier(verifierInput)
  const dogfood = await buildFoundationFrontendSplitVerifierDogfoodProof(verifierInput)
  const verifierLines = lineCount(verifierSource)
  const oldInlineBlocksRemoved =
    !verifierSource.includes('const frontendCurrentStateRenderersSplitCard =') &&
    !verifierSource.includes('const frontendDecisionQuestionRenderersSplitCard =')

  ensure(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_FRONTEND_SPLIT_MODULE_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === VERIFIER_FRONTEND_SPLIT_MODULE_SPRINT_ID, 'Current Sprint is the frontend split verifier module sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleSource.includes('evaluateFoundationFrontendSplitVerifier') && moduleSource.includes('buildFoundationFrontendSplitVerifierDogfoodProof'), 'new module owns frontend split verifier behavior', 'lib/foundation-frontend-split-verifier.js')
  ensure(checks, moduleResult.ok === true && moduleResult.summary.total >= 9, 'module preserves frontend split verifier rows', `${moduleResult.summary.passed}/${moduleResult.summary.total}`)
  ensure(checks, dogfood.ok === true, 'dogfood rejects old frontend split verifier failures', dogfood.invariant)
  ensure(checks, verifierSource.includes('evaluateFoundationFrontendSplitVerifier(frontendSplitVerifierInput)'), 'foundation verifier delegates frontend split checks to focused module', 'evaluateFoundationFrontendSplitVerifier')
  ensure(checks, oldInlineBlocksRemoved, 'foundation verifier no longer owns old inline frontend split blocks', oldInlineBlocksRemoved ? 'old blocks absent' : 'old blocks still inline')
  ensure(checks, verifierLines < VERIFIER_FRONTEND_SPLIT_MODULE_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_FRONTEND_SPLIT_MODULE_BEFORE_LINES} -> ${verifierLines}`)
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, packageJson.scripts?.['process:verifier-frontend-split-checks-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_FRONTEND_SPLIT_MODULE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-frontend-split-checks-module-check'] || 'missing')
  ensure(checks, planSource.includes('Substring-only proof is rejected'), 'plan rejects substring-only proof', VERIFIER_FRONTEND_SPLIT_MODULE_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_FRONTEND_SPLIT_MODULE_CLOSEOUT_KEY,
    baseUrl,
    lineCounts: {
      before: VERIFIER_FRONTEND_SPLIT_MODULE_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_FRONTEND_SPLIT_MODULE_BEFORE_LINES,
    },
    checks,
    dogfood: {
      passing: dogfood.passing.ok,
      rejected: dogfood.rejected,
    },
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier frontend split module proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.filter(check => check.ok).length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (!ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
