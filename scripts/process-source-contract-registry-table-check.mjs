#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  SOURCE_CONTRACT_REGISTRY_SYNC_SCRIPT_PATH,
  SOURCE_CONTRACT_REGISTRY_TABLE_APPROVAL_PATH,
  SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID,
  SOURCE_CONTRACT_REGISTRY_TABLE_CLOSEOUT_KEY,
  SOURCE_CONTRACT_REGISTRY_TABLE_PLAN_PATH,
  SOURCE_CONTRACT_REGISTRY_TABLE_SCRIPT_PATH,
  SOURCE_CONTRACT_REGISTRY_TABLE_SPRINT_ID,
  buildSourceContractRegistryRows,
  buildSourceContractRegistryTableDogfoodProof,
  evaluateSourceContractRegistryTable,
} from '../lib/source-contract-registry-table.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  getSourceContractRegistrySnapshot,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

function sprintStageMap(items = []) {
  return new Map((items || []).map(item => [item.cardId, item.stage]))
}

function hasWriteMutation(source = '') {
  return /updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+plan_critic_runs|UPDATE\s+foundation_sprints|UPDATE\s+foundation_sprint_items|DELETE\s+FROM\s+foundation_sprint_items|ALTER\s+TABLE|DROP\s+TABLE|fs\.writeFile|writeFile\s*\(/i.test(source)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planText,
    packageSource,
    registrySource,
    syncScriptSource,
    scriptSource,
    foundationDbSource,
    sourceVerifierSource,
    rootVerifierSource,
    splitVerifierScriptSource,
    currentPlan,
    currentState,
    closeoutRecords,
    closeoutDoc,
  ] = await Promise.all([
    readRepoFile(SOURCE_CONTRACT_REGISTRY_TABLE_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/source-contract-registry-table.js'),
    readRepoFile(SOURCE_CONTRACT_REGISTRY_SYNC_SCRIPT_PATH),
    readRepoFile(SOURCE_CONTRACT_REGISTRY_TABLE_SCRIPT_PATH),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-source-contract-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('scripts/process-verifier-source-contracts-module-check.mjs'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-build-closeout-overnight-records.js'),
    readRepoFile('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-source-contract-registry-table-closeout.md', { optional: true }),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_CONTRACT_REGISTRY_TABLE_APPROVAL_PATH,
    cardId: SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID,
  })
  const [
    cards,
    planCriticRuns,
    sprint,
    registrySnapshot,
  ] = await Promise.all([
    getBacklogItemsByIds([SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID]),
    getPlanCriticRunsByCardIds([SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getSourceContractRegistrySnapshot(),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID) || null
  const stages = sprintStageMap(sprint.items || [])
  const cardStage = stages.get(SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID)
  const doneMode = card?.lane === 'done'
  const selfReview = evaluatePlanCriticPlan({
    planText,
    card: card || { id: SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID, priority: 'P1' },
    changedFiles: [
      'lib/source-contract-registry-table.js',
      SOURCE_CONTRACT_REGISTRY_SYNC_SCRIPT_PATH,
      SOURCE_CONTRACT_REGISTRY_TABLE_SCRIPT_PATH,
      'lib/foundation-db.js',
      'lib/foundation-source-contract-verifier.js',
      'scripts/process-verifier-source-contracts-module-check.mjs',
      'scripts/foundation-verify.mjs',
      'package.json',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'lib/foundation-build-closeout-overnight-records.js',
    ],
    declaredRisk: planText,
    architecturalRules: true,
  })
  const expectedRows = buildSourceContractRegistryRows()
  const contractEvaluation = evaluateSourceContractRegistryTable({
    registryRows: registrySnapshot.registryRows,
  })
  const dogfood = buildSourceContractRegistryTableDogfoodProof()
  const proofScriptHasLiveMutation = hasWriteMutation(scriptSource)
  const syncRequiresApply =
    syncScriptSource.includes('args.apply') &&
    syncScriptSource.includes('syncSourceContractRegistryTable') &&
    /if\s*\(\s*args\.apply\s*\)/.test(syncScriptSource)

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
    'approval file is valid at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE),
    'durable Plan Critic pass row exists before build',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
    'approved plan passes Plan Critic with architecture rules enabled',
    buildPlanCriticResultSummary(selfReview),
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    'live backlog card exists in scoped/done lane',
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    doneMode ||
      (
        sprint.sprint?.sprintId === SOURCE_CONTRACT_REGISTRY_TABLE_SPRINT_ID &&
        ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(cardStage)
      ),
    'card is active in Current Sprint or closed in backlog',
    doneMode ? 'backlog done' : `${sprint.sprint?.sprintId || 'missing'} / ${cardStage || 'missing'}`,
  )
  addCheck(
    checks,
    expectedRows.length >= 30 && registrySnapshot.evaluation.summary.expectedCount === expectedRows.length,
    'expected source contracts are loaded from code registry',
    `${expectedRows.length} expected rows`,
  )
  addCheck(
    checks,
    contractEvaluation.ok && registrySnapshot.evaluation.ok,
    'live DB source_contract_registry matches current source contracts',
    JSON.stringify(registrySnapshot.evaluation.summary),
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood rejects unsafe registry states',
    dogfood.invariant,
  )
  addCheck(
    checks,
    registrySource.includes('CREATE TABLE IF NOT EXISTS source_contract_registry') &&
      registrySource.includes('CONSTRAINT source_contract_registry_source_id_shape') &&
      registrySource.includes('syncSourceContractRegistryRowsWithClient') &&
      registrySource.includes('evaluateSourceContractRegistryTable'),
    'registry module owns schema, sync, evaluator, and dogfood',
    'lib/source-contract-registry-table.js',
  )
  addCheck(
    checks,
    foundationDbSource.includes('sourceContractRegistrySchemaSql') &&
      foundationDbSource.includes("'source_contract_registry'") &&
      foundationDbSource.includes('syncSourceContractRegistryTable') &&
      foundationDbSource.includes('getSourceContractRegistrySnapshot'),
    'foundation-db creates schema and exports registry helpers without inline registry logic',
    'schema/import/export present',
  )
  addCheck(
    checks,
    packageJson.scripts?.['source-contract-registry:sync'] === `node --env-file-if-exists=.env ${SOURCE_CONTRACT_REGISTRY_SYNC_SCRIPT_PATH}` &&
      packageJson.scripts?.['process:source-contract-registry-table-check'] === `node --env-file-if-exists=.env ${SOURCE_CONTRACT_REGISTRY_TABLE_SCRIPT_PATH}`,
    'package scripts expose sync and focused proof commands',
    'package.json scripts',
  )
  addCheck(
    checks,
    !proofScriptHasLiveMutation,
    'focused proof is read-only',
    proofScriptHasLiveMutation ? 'mutation pattern found' : 'no live mutator/write patterns',
  )
  addCheck(
    checks,
    syncRequiresApply,
    'sync script requires explicit apply posture for writes',
    syncRequiresApply ? 'apply gated' : 'missing apply guard',
  )
  addCheck(
    checks,
    sourceVerifierSource.includes('SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID') &&
      sourceVerifierSource.includes('sourceContractRegistrySnapshot') &&
      sourceVerifierSource.includes('sourceContractRegistryDogfood'),
    'source-contract verifier has registry table coverage',
    'verifier wiring present',
  )
  addCheck(
    checks,
    rootVerifierSource.includes('getSourceContractRegistrySnapshot') &&
      rootVerifierSource.includes('buildSourceContractRegistryTableDogfoodProof') &&
      splitVerifierScriptSource.includes('getSourceContractRegistrySnapshot') &&
      splitVerifierScriptSource.includes('buildSourceContractRegistryTableDogfoodProof'),
    'root and split verifier pass registry snapshot and dogfood',
    'foundation:verify + source-contract split proof',
  )
  addCheck(
    checks,
    currentPlan.includes(SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID) &&
      currentState.includes(SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID),
    'rebuild current plan/state mention this registry slice',
    'current docs',
  )
  if (doneMode) {
    addCheck(
      checks,
      closeoutDoc.includes(SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID) &&
        closeoutRecords.includes(SOURCE_CONTRACT_REGISTRY_TABLE_CLOSEOUT_KEY),
      'done mode has handoff and Recent Builds closeout',
      SOURCE_CONTRACT_REGISTRY_TABLE_CLOSEOUT_KEY,
    )
  }

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    cardId: SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID,
    status: failed.length ? 'failed' : 'passed',
    summary: {
      passed: checks.length - failed.length,
      failed: failed.length,
      expectedRows: expectedRows.length,
      activeRows: registrySnapshot.evaluation.summary.activeCount,
      registryRows: registrySnapshot.evaluation.summary.registryCount,
      doneMode,
    },
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    console.log(`Summary: ${result.summary.passed}/${checks.length} checks passed`)
  }

  if (failed.length) {
    console.error(`Source contract registry table check failed (${failed.length}/${checks.length}).`)
    for (const check of failed) console.error(`- ${check.check}: ${check.detail}`)
    process.exitCode = 1
  }
}

main()
  .catch(async error => {
    await closeFoundationDb().catch(() => {})
    console.error('Source contract registry table check failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
