#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_APPROVAL_PATH,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CLOSEOUT_KEY,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_PLAN_PATH,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SCRIPT_PATH,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SPRINT_ID,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_VERSION,
  buildFoundationHubPayloadBudgetV2DogfoodProof,
  evaluateFoundationHubPayloadBudgetV2,
} from '../lib/foundation-hub-payload-budget-v2.js'
import {
  FOUNDATION_FULL_DIAGNOSTICS_BUDGET,
  evaluateFoundationFullDiagnosticsMeasurement,
} from '../lib/foundation-hub-full-diagnostics.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationCoreSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function measureJsonRoute(baseUrl, routePath) {
  const started = performance.now()
  const response = await fetch(new URL(routePath, baseUrl))
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return {
    routePath,
    status: response.status,
    ok: response.ok,
    durationMs: Math.round(performance.now() - started),
    bytes: Buffer.byteLength(text, 'utf8'),
    json,
  }
}

function scriptIsReadOnly(source = '') {
  return !/updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|DELETE\s+FROM\s+backlog_items|INSERT\s+INTO\s+plan_critic_runs|UPDATE\s+foundation_sprints|DELETE\s+FROM\s+foundation_sprint_items|fs\.writeFile|writeFile\s*\(/i.test(source)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    snapshot,
    packageSource,
    moduleSource,
    performanceSource,
    hubSafetySource,
    verifierSource,
	    scriptSource,
	    planSource,
	    route,
	    fullRoute,
	  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_APPROVAL_PATH,
      cardId: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID]),
    getFoundationCoreSnapshot(),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-hub-payload-budget-v2.js'),
    readRepoFile('lib/foundation-hub-performance.js'),
    readRepoFile('lib/foundation-hub-safety-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SCRIPT_PATH),
	    readRepoFile(FOUNDATION_HUB_PAYLOAD_BUDGET_V2_PLAN_PATH),
	    measureJsonRoute(args.baseUrl, '/api/foundation-hub'),
	    measureJsonRoute(args.baseUrl, '/api/foundation-hub?view=full'),
	  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record =>
    record.key === FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CLOSEOUT_KEY &&
      (record.backlogIds || []).includes(FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID)
  ) || null
  const activeSprintOwnsCard =
    sprint.sprint?.sprintId === FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
      closeout?.operatorCloseout === true
	  const liveEvaluation = evaluateFoundationHubPayloadBudgetV2({
	    payload: route.json || {},
	    mode: route.json?.foundationHubPerformance?.mode || 'summary',
	    durationMs: route.durationMs,
	    payloadBytes: route.bytes,
	  })
	  const fullRouteEvaluation = evaluateFoundationFullDiagnosticsMeasurement({
	    statusCode: fullRoute.status,
	    seconds: fullRoute.durationMs / 1000,
	    bytes: fullRoute.bytes,
	  })
	  const dogfood = buildFoundationHubPayloadBudgetV2DogfoodProof()
  const sourceRows = Array.isArray(snapshot.backlogItems) ? snapshot.backlogItems : []
  const routeRows = Array.isArray(route.json?.backlogItems) ? route.json.backlogItems : []

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'Plan approval validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || FOUNDATION_HUB_PAYLOAD_BUDGET_V2_APPROVAL_PATH,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'executing', 'done'].includes(card.lane),
    'live backlog card exists',
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    activeSprintOwnsCard || historicalCloseoutOwnsCard,
    'card is in the active V2 payload budget sprint or historical closeout',
    activeSprintOwnsCard
      ? `${sprint.sprint?.sprintId} / ${sprintItem?.stage || 'missing stage'}`
      : historicalCloseoutOwnsCard
        ? FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CLOSEOUT_KEY
        : sprint.sprint ? `${sprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing sprint',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood proof rejects over-budget, full-leak, hidden-row, and missing-compaction fixtures',
    dogfood.invariant,
  )
	  addCheck(
	    checks,
	    route.ok &&
      route.json?.foundationHubPerformance?.mode === 'summary' &&
      route.json?.foundationHubPayloadBudgetV2?.budgetVersion === FOUNDATION_HUB_PAYLOAD_BUDGET_V2_VERSION &&
      route.json?.foundationHubPayloadBudgetV2?.status === 'healthy' &&
      liveEvaluation.status === 'healthy' &&
      route.bytes <= FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET.maxPayloadBytes,
    'live default Foundation Hub route is summary-only and under V2 budget',
	    `status=${route.status} durationMs=${route.durationMs} bytes=${route.bytes}/${FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET.maxPayloadBytes} budget=${route.json?.foundationHubPayloadBudgetV2?.status || 'missing'}`,
	  )
	  addCheck(
	    checks,
	    fullRoute.ok &&
	      fullRoute.json?.foundationHubPerformance?.mode === 'full' &&
	      fullRouteEvaluation.ok &&
	      fullRoute.json?.foundationJobs?.fullPayloadCompacted === true,
	    'full diagnostics route remains inside the existing full-route budget after V2 growth',
	    `status=${fullRoute.status} durationMs=${fullRoute.durationMs} bytes=${fullRoute.bytes}/${FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxBytes} jobsCompacted=${fullRoute.json?.foundationJobs?.fullPayloadCompacted === true}`,
	  )
  addCheck(
    checks,
    routeRows.length === sourceRows.length &&
      Number(route.json?.backlogContract?.totalItems || 0) === sourceRows.length,
    'live route preserves every backlog card identity instead of hiding rows',
    `routeRows=${routeRows.length} sourceRows=${sourceRows.length} totalItems=${route.json?.backlogContract?.totalItems || 'missing'}`,
  )
  addCheck(
    checks,
    !route.json || ![
      'sharedCommunicationSynthesis',
      'extractionControl',
      'llmRuntime',
      'driveCorpusInventory',
      'sourceLifecycle',
      'runtimeProcessControl',
    ].some(key => Object.prototype.hasOwnProperty.call(route.json, key)),
    'summary route excludes full diagnostics keys',
    'detail keys stay behind /api/foundation-hub?view=full',
  )
  addCheck(
    checks,
    route.json?.foundationHubPerformance?.budget?.maxPayloadBytes === FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET.maxPayloadBytes &&
      performanceSource.includes('buildFoundationHubPayloadBudgetV2Status') &&
      performanceSource.includes('FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET.maxPayloadBytes'),
    'Foundation Hub performance metadata uses the canonical V2 summary budget',
    `${route.json?.foundationHubPerformance?.budget?.maxPayloadBytes || 'missing'} bytes`,
  )
  addCheck(
    checks,
    moduleSource.includes('buildFoundationHubPayloadBudgetV2DogfoodProof') &&
      moduleSource.includes('FOUNDATION_HUB_PAYLOAD_BUDGET_V2_FULL_ONLY_KEYS') &&
      moduleSource.includes('backlog_rows_hidden_or_mismatched'),
    'V2 module owns budget, full-only leak guard, hidden-row guard, and dogfood proof',
    'lib/foundation-hub-payload-budget-v2.js',
  )
  addCheck(
    checks,
    hubSafetySource.includes('FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID') &&
      verifierSource.includes('evaluateFoundationHubSafetyVerifier'),
    'foundation verifier has V2 payload budget coverage',
    'hub-safety verifier + root progression coverage',
  )
  addCheck(
    checks,
    scriptIsReadOnly(scriptSource),
    'focused proof is read-only by default',
    FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SCRIPT_PATH,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-hub-payload-budget-v2-check'] === `node --env-file-if-exists=.env ${FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SCRIPT_PATH}`,
    'focused proof script is registered',
    packageJson.scripts?.['process:foundation-hub-payload-budget-v2-check'] || 'missing',
  )
  addCheck(
    checks,
    planSource.includes('650KB') &&
      planSource.includes('No UI polish') &&
      planSource.includes('No Harlan/Fal/voice'),
    'plan captures budget and not-next boundaries',
    FOUNDATION_HUB_PAYLOAD_BUDGET_V2_PLAN_PATH,
  )

  const findings = checks.filter(check => !check.ok)
  const summary = {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardId: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID,
    closeoutKey: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CLOSEOUT_KEY,
	    route: {
	      path: route.routePath,
	      status: route.status,
	      durationMs: route.durationMs,
	      bytes: route.bytes,
	      payloadBudgetV2: route.json?.foundationHubPayloadBudgetV2 || null,
	    },
	    fullRoute: {
	      path: fullRoute.routePath,
	      status: fullRoute.status,
	      durationMs: fullRoute.durationMs,
	      bytes: fullRoute.bytes,
	      evaluation: fullRouteEvaluation,
	    },
    liveEvaluation,
    dogfood,
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation Hub payload budget V2: ${summary.status}`)
    console.log(`  Route: ${route.durationMs}ms / ${route.bytes}B`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (findings.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
