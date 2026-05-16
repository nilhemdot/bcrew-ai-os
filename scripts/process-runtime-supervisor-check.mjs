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
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  RUNTIME_SUPERVISOR_APPROVAL_PATH,
  RUNTIME_SUPERVISOR_CARD_ID,
  RUNTIME_SUPERVISOR_CLOSEOUT_KEY,
  RUNTIME_SUPERVISOR_PLAN_PATH,
  RUNTIME_SUPERVISOR_SCRIPT_PATH,
  RUNTIME_SUPERVISOR_SPRINT_ID,
  buildRuntimeSupervisorDogfoodProof,
  validateRuntimeServiceSupervisorSnapshot,
} from '../lib/runtime-process-control.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const PROCESS_SCRIPT_NAME = 'process:runtime-supervisor-check'
const FOUNDATION_HUB_MAX_DURATION_MS = 2_000
const FOUNDATION_HUB_MAX_BYTES = 800_000

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
    serverSource,
    rendererSource,
    runtimeReliabilityVerifierSource,
    moduleSource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: RUNTIME_SUPERVISOR_APPROVAL_PATH,
      cardId: RUNTIME_SUPERVISOR_CARD_ID,
    }),
    getBacklogItemsByIds([RUNTIME_SUPERVISOR_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([RUNTIME_SUPERVISOR_CARD_ID]),
    readText('package.json'),
    readText('server.js'),
    readText('public/foundation-runtime-renderers.js'),
    readText('lib/foundation-runtime-reliability-verifier.js'),
    readText('lib/runtime-process-control.js'),
    readText(RUNTIME_SUPERVISOR_SCRIPT_PATH),
    readText(RUNTIME_SUPERVISOR_PLAN_PATH),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const [card] = cards
  const foundationHubRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/foundation-hub')
  const activeProcessesRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/foundation/active-processes')
  const serviceSupervisor = activeProcessesRoute.json?.serviceSupervisor || {}
  const serviceValidation = validateRuntimeServiceSupervisorSnapshot(serviceSupervisor)
  const dogfood = buildRuntimeSupervisorDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(item => item.key === RUNTIME_SUPERVISOR_CLOSEOUT_KEY) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === RUNTIME_SUPERVISOR_CARD_ID) || null

  addCheck(checks, card && ['executing', 'done', 'scoped'].includes(card.lane), 'live backlog has Runtime Supervisor card', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode}/${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === RUNTIME_SUPERVISOR_SPRINT_ID &&
      sprintItem &&
      ['building_now', 'done_this_sprint'].includes(sprintItem.stage),
    'Current Sprint contains Runtime Supervisor card in Building Now or Done',
    activeSprint?.sprint ? `${activeSprint.sprint.sprintId}:${sprintItem?.stage || 'missing'}` : 'missing sprint',
  )
  addCheck(checks, foundationHubRoute.status === 200, '/api/foundation-hub returns 200', String(foundationHubRoute.status))
  addCheck(
    checks,
    foundationHubRoute.durationMs <= FOUNDATION_HUB_MAX_DURATION_MS &&
      foundationHubRoute.bytes <= FOUNDATION_HUB_MAX_BYTES,
    '/api/foundation-hub stays inside runtime-supervisor route budget',
    `${foundationHubRoute.durationMs}ms/${foundationHubRoute.bytes}B`,
  )
  addCheck(checks, activeProcessesRoute.status === 200, '/api/foundation/active-processes returns supervised runtime payload', String(activeProcessesRoute.status))
  addCheck(checks, serviceValidation.ok === true, 'live service-supervisor payload validates', serviceValidation.ok ? serviceSupervisor.status : serviceValidation.checks.filter(check => !check.ok).map(check => check.check).join('; '))
  addCheck(checks, dogfood.ok === true, 'dogfood rejects missing LaunchAgent, pid mismatch, stale code, and stale heartbeat', dogfood.dogfoodInvariant)
  addCheck(
    checks,
    packageJson.scripts?.['process:runtime-supervisor-check'] === `node --env-file-if-exists=.env ${RUNTIME_SUPERVISOR_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:runtime-supervisor-check'] || 'missing',
  )
  addCheck(
    checks,
    serverSource.includes('getLaunchAgentStatus') &&
      serverSource.includes('launchAgents:') &&
      serverSource.includes('ai.bcrew.dashboard') &&
      serverSource.includes('ai.bcrew.foundation-worker'),
    'server wires LaunchAgent status into runtime process-control snapshot',
    'dashboard + worker LaunchAgent labels',
  )
  addCheck(
    checks,
    rendererSource.includes('Supervised services') &&
      rendererSource.includes('serviceSupervisor.services') &&
      rendererSource.includes('logPaths'),
    'Runtime Health renders supervised-service details',
    'panel + per-service rows',
  )
  addCheck(
    checks,
    runtimeReliabilityVerifierSource.includes(RUNTIME_SUPERVISOR_CARD_ID) &&
      runtimeReliabilityVerifierSource.includes('buildRuntimeSupervisorDogfoodProof') &&
      runtimeReliabilityVerifierSource.includes('serviceSupervisor'),
    'runtime reliability verifier covers Runtime Supervisor behavior',
    RUNTIME_SUPERVISOR_CARD_ID,
  )
  addCheck(
    checks,
    moduleSource.includes('buildRuntimeServiceSupervisorSnapshot') &&
      moduleSource.includes('validateRuntimeServiceSupervisorSnapshot') &&
      moduleSource.includes('buildRuntimeSupervisorDogfoodProof') &&
      moduleSource.includes('missingLaunchAgentRejected'),
    'runtime process-control module owns supervisor builder and dogfood',
    'builder / validator / dogfood',
  )
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutations, or fs write calls')
  addCheck(
    checks,
    await repoFileExists(RUNTIME_SUPERVISOR_PLAN_PATH) &&
      await repoFileExists(RUNTIME_SUPERVISOR_APPROVAL_PATH),
    'plan and approval files exist',
    `${RUNTIME_SUPERVISOR_PLAN_PATH} / ${RUNTIME_SUPERVISOR_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    planSource.includes('no auto-restart-on-push install') &&
      planSource.includes('no Drive permission mutation'),
    'plan records runtime and Drive not-next boundaries',
    'auto-restart / Drive stop-lines present',
  )
  if (closeout || card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(RUNTIME_SUPERVISOR_CARD_ID) &&
        currentPlan.includes(RUNTIME_SUPERVISOR_CLOSEOUT_KEY) &&
        currentState.includes(RUNTIME_SUPERVISOR_CLOSEOUT_KEY),
      'closeout is registered when card is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(check => check.ok).length,
      failed: checks.filter(check => !check.ok).length,
      routeMs: foundationHubRoute.durationMs,
      routeBytes: foundationHubRoute.bytes,
      activeProcessesMs: activeProcessesRoute.durationMs,
      activeProcessesBytes: activeProcessesRoute.bytes,
      supervisorStatus: serviceSupervisor.status || 'missing',
      serviceCount: serviceSupervisor.summary?.serviceCount || 0,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(PROCESS_SCRIPT_NAME)
    console.log('Runtime supervisor check')
    console.log(`  Status: ${ok ? 'pass' : 'fail'}`)
    for (const check of checks) {
      console.log(`  ${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` — ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (!ok) process.exitCode = 1
}

main().catch(async error => {
  console.error('Runtime supervisor check failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  try {
    await closeFoundationDb()
  } catch {
    // ignore cleanup failures
  }
  process.exitCode = 1
})
