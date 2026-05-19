#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationCoreSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_SPRINT_ID,
  buildFoundationHubSafetyVerifierDogfoodProof,
  evaluateFoundationHubSafetySplitSource,
  evaluateFoundationHubSafetyVerifier,
} from '../lib/foundation-hub-safety-verifier.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://127.0.0.1:3000',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  args.baseUrl = String(args.baseUrl || '').replace(/\/$/, '')
  return args
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

async function fetchJsonWithMetrics(baseUrl, routePath) {
  const started = Date.now()
  const response = await fetch(new URL(routePath, baseUrl))
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return {
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - started,
    bytes: Buffer.byteLength(text, 'utf8'),
    json,
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

function activeSprintAtOrPastFactory(foundation = {}) {
  return function activeSprintAtOrPast(cardIds = []) {
    return (Array.isArray(cardIds) ? cardIds : []).every(cardId =>
      (foundation.backlogItems || []).some(item => item.id === cardId && item.lane === 'done')
    )
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
    foundation,
    packageSource,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
    serverSource,
    foundationOperatorRoutesSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: VERIFIER_HUB_SAFETY_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID]),
    getFoundationCoreSnapshot(),
    readText('package.json'),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-hub-safety-verifier.js'),
    readText(VERIFIER_HUB_SAFETY_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_HUB_SAFETY_SPLIT_MODULE_PLAN_PATH),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('server.js'),
    readText('lib/foundation-operator-routes.js'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID) || null
  const foundationHubSummaryRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/foundation-hub')
  const foundationBacklogDetailEndpointRoute = await fetchJsonWithMetrics(
    args.baseUrl,
    '/api/foundation/backlog/FOUNDATION-HUB-BACKLOG-CONTRACT-001',
  )
  const foundationBuildCloseouts = getFoundationBuildCloseouts()
  const evaluator = await evaluateFoundationHubSafetyVerifier({
    repoRoot,
    foundationHub: foundation,
    foundationHubSummary: foundationHubSummaryRoute.json || {},
    foundationBuildCloseouts,
    packageScripts: packageJson.scripts,
    packageJson,
    activeFoundationSprint: activeSprint,
    serverSource,
    foundationOperatorRoutesSource,
    foundationBacklogDetailEndpointApi: foundationBacklogDetailEndpointRoute.json || {},
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
    activeSprintAtOrPast: activeSprintAtOrPastFactory(foundation),
    repoFileExists,
    foundationVerifyLineCount: lineCount(foundationVerifySource),
  })
  const dogfood = buildFoundationHubSafetyVerifierDogfoodProof({
    matrix: evaluator.details.hubWorkOwnershipMatrix,
  })
  const splitSource = evaluateFoundationHubSafetySplitSource({
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageScripts: packageJson.scripts,
  })
  const missingMatrixDogfood = buildFoundationHubSafetyVerifierDogfoodProof({ matrix: {} })
  const missingRootDelegation = evaluateFoundationHubSafetySplitSource({
    foundationVerifySource: '',
    moduleSource,
    proofScriptSource,
    planSource,
    packageScripts: packageJson.scripts,
  })
  const closeout = foundationBuildCloseouts.find(item => item.key === VERIFIER_HUB_SAFETY_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const foundationVerifyLines = lineCount(foundationVerifySource)

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has hub-safety verifier split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === VERIFIER_HUB_SAFETY_SPLIT_MODULE_SPRINT_ID || card?.lane === 'done',
    'Current Sprint points to this card while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(checks, evaluator.ok === true, 'module evaluator passes hub-safety checks', `${evaluator.summary.passed}/${evaluator.summary.total}`)
  addCheck(checks, dogfood.ok === true, 'dogfood rejects old hub-safety failure modes', dogfood.ok ? 'all synthetic failures blocked' : 'synthetic failure escaped')
  addCheck(checks, missingMatrixDogfood.ok === false, 'missing ownership matrix dogfood fails closed', missingMatrixDogfood.ok ? 'unexpected pass' : 'blocked')
  addCheck(checks, missingRootDelegation.ok === false, 'missing root delegation is rejected', `${missingRootDelegation.summary.passed}/${missingRootDelegation.summary.total}`)
  addCheck(checks, splitSource.ok === true, 'root/module/proof source contract is satisfied', `${splitSource.summary.passed}/${splitSource.summary.total}`)
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutation statements, or fs write calls')
  addCheck(
    checks,
    packageJson.scripts?.['process:verifier-hub-safety-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_HUB_SAFETY_SPLIT_MODULE_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-hub-safety-split-module-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_HUB_SAFETY_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_HUB_SAFETY_SPLIT_MODULE_APPROVAL_PATH),
    'plan and approval files exist',
    `${VERIFIER_HUB_SAFETY_SPLIT_MODULE_PLAN_PATH} / ${VERIFIER_HUB_SAFETY_SPLIT_MODULE_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    foundationVerifyLines < VERIFIER_HUB_SAFETY_SPLIT_MODULE_BEFORE_LINES,
    'root verifier line count decreased',
    `${VERIFIER_HUB_SAFETY_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLines}`,
  )
  addCheck(
    checks,
    foundationHubSummaryRoute.ok === true &&
      foundationHubSummaryRoute.json?.backlogContract?.contractVersion &&
      foundationBacklogDetailEndpointRoute.status === 200,
    'live routes needed by hub-safety checks are reachable',
    `/api/foundation-hub=${foundationHubSummaryRoute.status}/${foundationHubSummaryRoute.bytes}B detail=${foundationBacklogDetailEndpointRoute.status}/${foundationBacklogDetailEndpointRoute.bytes}B`,
  )
  addCheck(
    checks,
    planSource.includes('Useful operator behavior') &&
      planSource.includes('Gate decision: full gate') &&
      planSource.includes('No hub UI work') &&
      planSource.includes('No Drive permission mutation'),
    'plan records operator behavior, full gate, and not-next boundaries',
    'plan requires behavior proof, full gate, and no force-green closeout',
  )
  if (closeout || card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-verifier-hub-safety-split-module-closeout.md') &&
        currentState.includes(VERIFIER_HUB_SAFETY_SPLIT_MODULE_CLOSEOUT_KEY),
      'closeout is registered when card is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  await closeFoundationDb()
  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    cardId: VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_HUB_SAFETY_SPLIT_MODULE_CLOSEOUT_KEY,
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
    },
    routes: {
      foundationHub: {
        status: foundationHubSummaryRoute.status,
        durationMs: foundationHubSummaryRoute.durationMs,
        bytes: foundationHubSummaryRoute.bytes,
      },
      backlogDetail: {
        status: foundationBacklogDetailEndpointRoute.status,
        durationMs: foundationBacklogDetailEndpointRoute.durationMs,
        bytes: foundationBacklogDetailEndpointRoute.bytes,
      },
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} - ${check.detail}`)
    }
  }
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  const args = parseArgs()
  const payload = {
    ok: false,
    cardId: VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
    error: error instanceof Error ? error.message : String(error),
  }
  if (args.json) console.log(JSON.stringify(payload, null, 2))
  else console.error(payload.error)
  process.exitCode = 1
})
