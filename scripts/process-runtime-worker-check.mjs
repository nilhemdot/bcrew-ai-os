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
  RUNTIME_WORKER_APPROVAL_PATH,
  RUNTIME_WORKER_CARD_ID,
  RUNTIME_WORKER_CLOSEOUT_KEY,
  RUNTIME_WORKER_PLAN_PATH,
  RUNTIME_WORKER_SCRIPT_PATH,
  buildFoundationWorkerReliabilityDogfoodProof,
  validateFoundationWorkerReliabilitySnapshot,
} from '../lib/foundation-worker-reliability.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const PROCESS_SCRIPT_NAME = 'process:runtime-worker-check'
const JOBS_ROUTE_MAX_MS = 2_000
const DEFAULT_HUB_MAX_MS = 2_000
const DEFAULT_HUB_MAX_BYTES = 800_000

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
    'foundation' + ':worker',
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
    workerSource,
    moduleSource,
    jobStoreSource,
    compactSource,
    rendererSource,
    runtimeReliabilityVerifierSource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: RUNTIME_WORKER_APPROVAL_PATH,
      cardId: RUNTIME_WORKER_CARD_ID,
    }),
    getBacklogItemsByIds([RUNTIME_WORKER_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([RUNTIME_WORKER_CARD_ID]),
    readText('package.json'),
    readText('scripts/foundation-worker.mjs'),
    readText('lib/foundation-worker-reliability.js'),
    readText('lib/foundation-runtime-job-store.js'),
    readText('lib/foundation-hub-summary-payload.js'),
    readText('public/foundation-runtime-renderers.js'),
    readText('lib/foundation-runtime-reliability-verifier.js'),
    readText(RUNTIME_WORKER_SCRIPT_PATH),
    readText(RUNTIME_WORKER_PLAN_PATH),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === RUNTIME_WORKER_CARD_ID) || null
  const jobsRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/foundation/jobs')
  const defaultHubRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/foundation-hub')
  const fullHubRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/foundation-hub?view=full')
  const liveReliability = jobsRoute.json?.workerReliability || {}
  const liveValidation = validateFoundationWorkerReliabilitySnapshot(liveReliability)
  const fullHubReliability = fullHubRoute.json?.foundationJobs?.workerReliability || null
  const compactReliability = defaultHubRoute.json?.foundationJobs?.workerReliability || null
  const dogfood = buildFoundationWorkerReliabilityDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(item => item.key === RUNTIME_WORKER_CLOSEOUT_KEY) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === RUNTIME_WORKER_CARD_ID) || null

  addCheck(checks, card && ['executing', 'done', 'scoped'].includes(card.lane), 'live backlog has Runtime Worker card', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode}/${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    sprintItem &&
      ['building_now', 'done_this_sprint'].includes(sprintItem.stage),
    'Current Sprint contains Runtime Worker card in Building Now or Done',
    activeSprint?.sprint ? `${activeSprint.sprint.activeBlockerCardId || 'none'}:${sprintItem?.stage || 'missing'}` : 'missing sprint',
  )
  addCheck(checks, jobsRoute.status === 200 && jobsRoute.durationMs <= JOBS_ROUTE_MAX_MS, '/api/foundation/jobs returns worker reliability inside route budget', `${jobsRoute.status}/${jobsRoute.durationMs}ms/${jobsRoute.bytes}B`)
  addCheck(checks, defaultHubRoute.status === 200 && defaultHubRoute.durationMs <= DEFAULT_HUB_MAX_MS && defaultHubRoute.bytes <= DEFAULT_HUB_MAX_BYTES, 'default /api/foundation-hub stays inside compact payload budget', `${defaultHubRoute.status}/${defaultHubRoute.durationMs}ms/${defaultHubRoute.bytes}B`)
  addCheck(checks, fullHubRoute.status === 200, 'full Foundation Hub diagnostics route returns 200', String(fullHubRoute.status))
  addCheck(checks, liveValidation.ok === true, 'live worker reliability payload validates', liveValidation.ok ? liveReliability.status : liveValidation.failed.map(item => item.check).join('; '))
  addCheck(checks, fullHubReliability && fullHubReliability.cardId === RUNTIME_WORKER_CARD_ID, 'full Runtime Health payload carries worker reliability', fullHubReliability ? fullHubReliability.status : 'missing')
  addCheck(checks, compactReliability && compactReliability.cardId === RUNTIME_WORKER_CARD_ID, 'compact Foundation Hub payload preserves worker reliability summary', compactReliability ? compactReliability.status : 'missing')
  addCheck(checks, dogfood.ok === true, 'dogfood proves dry-run alias, retry candidate, blocked schedule, and stale active-run failure modes', dogfood.ok ? dogfood.snapshotStatus : JSON.stringify(dogfood))
  addCheck(
    checks,
    packageJson.scripts?.[PROCESS_SCRIPT_NAME] === `node --env-file-if-exists=.env ${RUNTIME_WORKER_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.[PROCESS_SCRIPT_NAME] || 'missing',
  )
  addCheck(
    checks,
    workerSource.includes('parseFoundationWorkerArgs') &&
      workerSource.includes('shouldRecordRuntimeStatus') &&
      workerSource.includes('!(once && dryRun)') &&
      !/function\s+parseArgs\s*\(/.test(workerSource),
    'worker reuses shared parser and dry-run proof cannot overwrite live worker runtime status',
    'scripts/foundation-worker.mjs',
  )
  addCheck(
    checks,
    moduleSource.includes('parseFoundationWorkerArgs') &&
      moduleSource.includes('buildFoundationWorkerReliabilitySnapshot') &&
      moduleSource.includes('buildFoundationWorkerReliabilityDogfoodProof') &&
      moduleSource.includes('validateFoundationWorkerReliabilitySnapshot') &&
      moduleSource.includes('dry-run alias'),
    'worker reliability module owns parser, snapshot, validation, and dogfood behavior',
    'lib/foundation-worker-reliability.js',
  )
  addCheck(
    checks,
    jobStoreSource.includes('buildFoundationWorkerReliabilitySnapshot') &&
      jobStoreSource.includes('workerReliability: buildFoundationWorkerReliabilitySnapshot'),
    'runtime job store attaches worker reliability to job snapshot',
    'lib/foundation-runtime-job-store.js',
  )
  addCheck(
    checks,
    compactSource.includes('workerReliability') &&
      compactSource.includes('failClosed'),
    'compact Foundation Hub payload preserves worker reliability summary',
    'lib/foundation-hub-summary-payload.js',
  )
  addCheck(
    checks,
    rendererSource.includes('Worker reliability') &&
      rendererSource.includes('retry candidates') &&
      rendererSource.includes('stale active'),
    'Runtime Health renders worker reliability operator summary',
    'public/foundation-runtime-renderers.js',
  )
  addCheck(
    checks,
    runtimeReliabilityVerifierSource.includes(RUNTIME_WORKER_CARD_ID) &&
      runtimeReliabilityVerifierSource.includes('buildFoundationWorkerReliabilityDogfoodProof'),
    'runtime reliability verifier covers Runtime Worker card',
    'lib/foundation-runtime-reliability-verifier.js',
  )
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutations, fs writes, live worker/job execution')
  addCheck(
    checks,
    await repoFileExists(RUNTIME_WORKER_PLAN_PATH) &&
      await repoFileExists(RUNTIME_WORKER_APPROVAL_PATH),
    'plan and approval files exist',
    `${RUNTIME_WORKER_PLAN_PATH} / ${RUNTIME_WORKER_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    /no new scheduler framework/i.test(planSource) &&
      /dry-run/i.test(planSource) &&
      /speed budget/i.test(planSource),
    'plan preserves tight scope, dry-run safety, and speed budget',
    RUNTIME_WORKER_PLAN_PATH,
  )
  addCheck(
    checks,
    currentPlan.includes(RUNTIME_WORKER_CARD_ID) &&
      currentState.includes('Runtime activation'),
    'current docs preserve runtime worker context',
    'docs/rebuild/current-plan.md + current-state.md',
  )
  if (card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(RUNTIME_WORKER_CARD_ID),
      'Recent Builds closeout is registered when Runtime Worker is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const output = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      failed: failed.length,
      jobsRoute: `${jobsRoute.durationMs}ms/${jobsRoute.bytes}B`,
      defaultHubRoute: `${defaultHubRoute.durationMs}ms/${defaultHubRoute.bytes}B`,
      liveWorkerStatus: liveReliability.status || 'missing',
    },
    checks,
  }

  if (args.json) console.log(JSON.stringify(output, null, 2))
  else {
    console.log('Runtime Worker reliability proof')
    for (const check of checks) console.log(`${check.ok ? 'ok' : 'FAIL'} - ${check.check}${check.detail ? ` (${check.detail})` : ''}`)
  }

  if (!output.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
