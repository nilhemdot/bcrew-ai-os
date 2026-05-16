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
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SPRINT_ID,
  buildFoundationOperatorBudgetVerifierDogfoodProof,
} from '../lib/foundation-operator-budget-verifier.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function lineCount(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
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

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageSource,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID]),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-operator-budget-verifier.js'),
    readText(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_PLAN_PATH),
    readText('package.json'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID) || null
  const dogfood = buildFoundationOperatorBudgetVerifierDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(item => item.key === VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const foundationVerifyLines = lineCount(foundationVerifySource)
  const oldInlinePatterns = [
    new RegExp("const foundationRouteBudgetCleanupCards =[\\\\s\\\\S]{0,4000}'Foundation route budget cleanup keeps source truth fast"),
    new RegExp("const foundationEndpointBudgetsCard =[\\\\s\\\\S]{0,4000}'FOUNDATION-ENDPOINT-BUDGETS-001 surfaces operator endpoint latency"),
    new RegExp("const foundationFrontendAssetBudgetCard =[\\\\s\\\\S]{0,4000}'FOUNDATION-FRONTEND-ASSET-BUDGET-001 tracks served Foundation JS/CSS asset budgets"),
    new RegExp("const foundationFrontendDomBudgetCard =[\\\\s\\\\S]{0,4000}'FOUNDATION-FRONTEND-DOM-BUDGET-001 measures frontend DOM rebuild budget"),
  ]

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has operator-budget verifier split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SPRINT_ID ||
      card?.lane === 'done',
    'Current Sprint points to this card while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.route.overLatencySource.sourceOfTruthPayloadBudget.ok === false &&
      dogfood.route.overBudgetHub.foundationHubPayloadBudget.ok === false &&
      dogfood.endpoints.oldSlowRoute.status === 'risk' &&
      dogfood.endpoints.missingMetrics.status === 'review' &&
      dogfood.assets.oversizedScript.status === 'risk' &&
      dogfood.assets.missingAsset.status === 'risk' &&
      dogfood.dom.heavySource.status === 'risk' &&
      dogfood.dom.heavyRoute.status === 'risk' &&
      dogfood.reporter.ok === true,
    'dogfood rejects old operator budget failures',
    dogfood.invariant,
  )
  addCheck(
    checks,
    scriptIsReadOnly(proofScriptSource),
    'focused proof script is read-only',
    'no DB write helpers, SQL mutation statements, or fs write calls',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:verifier-operator-budget-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-operator-budget-split-module-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_APPROVAL_PATH),
    'plan and approval files exist',
    `${VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_PLAN_PATH} / ${VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    foundationVerifyLines < VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_BEFORE_LINES,
    'root verifier line count decreased',
    `${VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLines}`,
  )
  addCheck(
    checks,
    moduleSource.includes('evaluateFoundationOperatorBudgetVerifier') &&
      moduleSource.includes('buildFoundationOperatorBudgetVerifierDogfoodProof') &&
      moduleSource.includes('evaluateFoundationRouteBudgetVerifier') &&
      moduleSource.includes('buildFoundationEndpointBudgetsDogfoodProof') &&
      moduleSource.includes('buildFoundationFrontendAssetBudgetDogfoodProof') &&
      moduleSource.includes('buildFoundationFrontendDomBudgetDogfoodProof') &&
      moduleSource.includes('buildFoundationVerifyReporterDogfoodProof') &&
      moduleSource.includes(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID),
    'module owns operator budget verifier functions',
    'operator budget evaluator, dogfood, and card constants live in module',
  )
  addCheck(
    checks,
    foundationVerifySource.includes('evaluateFoundationOperatorBudgetVerifier({') &&
      foundationVerifySource.includes('operatorBudgetVerifier.checks') &&
      foundationVerifySource.includes('buildFoundationOperatorBudgetVerifierDogfoodProof') &&
      oldInlinePatterns.every(pattern => !pattern.test(foundationVerifySource)),
    'root verifier delegates operator budget checks',
    'root imports the module, pushes module checks, and no longer owns the old inline budget ensure blocks',
  )
  addCheck(
    checks,
    planSource.includes('Root invariant:') &&
      planSource.includes('synthetic over-budget or missing-proof cases fail closed') &&
      planSource.includes('Useful operator behavior') &&
      planSource.includes('Repair path:'),
    'plan records root invariant, operator behavior, and repair path',
    'plan requires behavior proof, full gate, and no force-green closeout',
  )
  if (closeout || card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/handoffs/2026-05-16-verifier-operator-budget-split-module-closeout.md') &&
        currentState.includes(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CLOSEOUT_KEY),
      'closeout is registered when card is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} - ${check.detail}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
