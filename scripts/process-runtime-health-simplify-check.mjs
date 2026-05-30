#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  RUNTIME_HEALTH_SIMPLIFY_APPROVAL_PATH,
  RUNTIME_HEALTH_SIMPLIFY_CARD_ID,
  RUNTIME_HEALTH_SIMPLIFY_CLOSEOUT_KEY,
  RUNTIME_HEALTH_SIMPLIFY_PLAN_PATH,
  RUNTIME_HEALTH_SIMPLIFY_SCRIPT_PATH,
  RUNTIME_HEALTH_SIMPLIFY_SPRINT_ID,
  buildRuntimeHealthSimplifyDogfoodProof,
  evaluateRuntimeHealthSimplifySource,
} from '../lib/runtime-health-simplify.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const PROCESS_SCRIPT_NAME = 'process:runtime-health-simplify-check'
const DEFAULT_HUB_MAX_MS = 2_000
const DEFAULT_HUB_MAX_BYTES = 800_000
const MIN_WRAPPED_DIAGNOSTICS = 20

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
  const response = await fetch(new URL(routePath, baseUrl), { redirect: 'manual' })
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
    'run' + 'FoundationJob(',
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
    packageSource,
    runtimeRendererSource,
    operationsRendererSource,
    stylesSource,
    runtimeHealthSimplifySource,
    runtimeReliabilityVerifierSource,
    foundationVerifySource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: RUNTIME_HEALTH_SIMPLIFY_APPROVAL_PATH,
      cardId: RUNTIME_HEALTH_SIMPLIFY_CARD_ID,
    }),
    getBacklogItemsByIds([RUNTIME_HEALTH_SIMPLIFY_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([RUNTIME_HEALTH_SIMPLIFY_CARD_ID]),
    readText('package.json'),
    readText('public/foundation-runtime-renderers.js'),
    readText('public/foundation-operations-renderers.js'),
    readText('public/styles-foundation-workflows.css'),
    readText('lib/runtime-health-simplify.js'),
    readText('lib/foundation-runtime-reliability-verifier.js'),
    readText('scripts/foundation-verify.mjs'),
    readText(RUNTIME_HEALTH_SIMPLIFY_SCRIPT_PATH),
    readText(RUNTIME_HEALTH_SIMPLIFY_PLAN_PATH),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const packageScripts = packageJson.scripts || {}
  const card = cards.find(item => item.id === RUNTIME_HEALTH_SIMPLIFY_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === RUNTIME_HEALTH_SIMPLIFY_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === RUNTIME_HEALTH_SIMPLIFY_CLOSEOUT_KEY) || null
  const sourceEvaluation = evaluateRuntimeHealthSimplifySource({
    runtimeRendererSource,
    operationsRendererSource,
    stylesSource,
    packageScripts,
    foundationVerifySource,
    runtimeReliabilityVerifierSource,
  })
  const dogfood = buildRuntimeHealthSimplifyDogfoodProof()
  const defaultHubRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/foundation-hub')
  const wrappedDiagnosticCount = (operationsRendererSource.match(/appendRuntimeDiagnosticPanel\(container/g) || []).length

  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog has Runtime Health Simplify card', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode}/${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === RUNTIME_HEALTH_SIMPLIFY_SPRINT_ID &&
      sprintItem &&
      ['building_now', 'done_this_sprint'].includes(sprintItem.stage),
    'Current Sprint contains Runtime Health Simplify card in Building Now or Done',
    activeSprint?.sprint ? `${activeSprint.sprint.sprintId}:${sprintItem?.stage || 'missing'}` : 'missing sprint',
  )
  addCheck(
    checks,
    defaultHubRoute.status === 200 && defaultHubRoute.durationMs <= DEFAULT_HUB_MAX_MS && defaultHubRoute.bytes <= DEFAULT_HUB_MAX_BYTES,
    'default /api/foundation-hub stays inside compact payload budget',
    `${defaultHubRoute.status}/${defaultHubRoute.durationMs}ms/${defaultHubRoute.bytes}B`,
  )
  addCheck(checks, sourceEvaluation.ok === true, 'source evaluator proves command panel, attention summary, jumps, wrapped diagnostics, and verifier wiring', `${sourceEvaluation.summary.passed}/${sourceEvaluation.summary.total}`)
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.oldNoCommandPanelRejected === true &&
      dogfood.oldDirectAppendDiagnosticsRejected === true &&
      dogfood.oldNoJumpActionsRejected === true &&
      dogfood.missingCollapsedDetailsRejected === true,
    'dogfood rejects old dense Runtime Health failure modes',
    dogfood.ok ? dogfood.dogfoodInvariant : JSON.stringify(dogfood),
  )
  addCheck(checks, wrappedDiagnosticCount >= MIN_WRAPPED_DIAGNOSTICS, 'existing diagnostics remain available behind collapsed groups', `${wrappedDiagnosticCount} wrapped sections`)
  addCheck(
    checks,
    packageScripts[PROCESS_SCRIPT_NAME] === `node --env-file-if-exists=.env ${RUNTIME_HEALTH_SIMPLIFY_SCRIPT_PATH}`,
    'package script is registered',
    packageScripts[PROCESS_SCRIPT_NAME] || 'missing',
  )
  addCheck(
    checks,
    runtimeHealthSimplifySource.includes('buildRuntimeHealthSimplifyDogfoodProof') &&
      runtimeHealthSimplifySource.includes('oldDirectAppendDiagnosticsRejected'),
    'runtime-health-simplify module owns dogfood proof',
    'lib/runtime-health-simplify.js',
  )
  addCheck(
    checks,
    runtimeReliabilityVerifierSource.includes(RUNTIME_HEALTH_SIMPLIFY_CARD_ID) &&
      runtimeReliabilityVerifierSource.includes('buildRuntimeHealthSimplifyDogfoodProof') &&
      runtimeReliabilityVerifierSource.includes('evaluateRuntimeHealthSimplifySource'),
    'runtime reliability verifier covers Runtime Health Simplify card',
    'lib/foundation-runtime-reliability-verifier.js',
  )
  addCheck(
    checks,
    foundationVerifySource.includes(RUNTIME_HEALTH_SIMPLIFY_CARD_ID) &&
      foundationVerifySource.includes('runtimeHealthSimplifySource') &&
      foundationVerifySource.includes('foundationOperationsRendererSource') &&
      foundationVerifySource.includes('foundationWorkflowStylesSource'),
    'foundation verifier passes Runtime Health Simplify source text into focused verifier',
    'scripts/foundation-verify.mjs',
  )
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutations, fs writes, or live job execution')
  addCheck(
    checks,
    await repoFileExists(RUNTIME_HEALTH_SIMPLIFY_PLAN_PATH) &&
      await repoFileExists(RUNTIME_HEALTH_SIMPLIFY_APPROVAL_PATH),
    'plan and approval files exist',
    `${RUNTIME_HEALTH_SIMPLIFY_PLAN_PATH} / ${RUNTIME_HEALTH_SIMPLIFY_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    /No new runtime controls/i.test(planSource) &&
      /No diagnostic deletion/i.test(planSource) &&
      /Performance proof/i.test(planSource),
    'plan preserves not-next boundaries and performance proof',
    RUNTIME_HEALTH_SIMPLIFY_PLAN_PATH,
  )
  addCheck(
    checks,
    currentPlan.includes(RUNTIME_HEALTH_SIMPLIFY_CARD_ID) &&
      currentState.includes('Runtime Health Simplify'),
    'current docs preserve Runtime Health Simplify context',
    'docs/rebuild/current-plan.md + current-state.md',
  )
  if (card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(RUNTIME_HEALTH_SIMPLIFY_CARD_ID),
      'Recent Builds closeout is registered when Runtime Health Simplify is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const output = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      wrappedDiagnostics: wrappedDiagnosticCount,
      defaultHubRoute: {
        status: defaultHubRoute.status,
        durationMs: defaultHubRoute.durationMs,
        bytes: defaultHubRoute.bytes,
      },
    },
    checks,
    failed,
  }

  await closeFoundationDb()

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else if (!output.ok) {
    console.error(`Runtime Health Simplify check failed (${failed.length}/${checks.length}).`)
    for (const check of failed) console.error(`- ${check.check}: ${check.detail}`)
  } else {
    console.log(`Runtime Health Simplify check passed (${checks.length}/${checks.length}).`)
  }

  if (!output.ok) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {
    // Ignore close errors while surfacing the original failure.
  }
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
})
