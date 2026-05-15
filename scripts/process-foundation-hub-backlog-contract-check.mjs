#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_HUB_BACKLOG_CONTRACT_APPROVAL_PATH,
  FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID,
  FOUNDATION_HUB_BACKLOG_CONTRACT_DEFAULT_ROUTE_BUDGET_BYTES,
  FOUNDATION_HUB_BACKLOG_CONTRACT_PLAN_PATH,
  FOUNDATION_HUB_BACKLOG_CONTRACT_SCRIPT_PATH,
  FOUNDATION_HUB_BACKLOG_CONTRACT_SPRINT_ID,
  FOUNDATION_HUB_BACKLOG_CONTRACT_VERSION,
  buildFoundationHubBacklogContract,
  buildFoundationHubBacklogContractDogfoodProof,
  validateFoundationHubBacklogContract,
} from '../lib/foundation-hub-backlog-contract.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationCoreSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

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
  return {
    status: response.status,
    ok: response.ok,
    durationMs: Math.round(performance.now() - started),
    bytes: Buffer.byteLength(text, 'utf8'),
    json: JSON.parse(text),
  }
}

function maxBacklogTextLength(rows = []) {
  return rows.reduce((max, row) => {
    return Math.max(
      max,
      String(row.title || '').length,
      String(row.source || '').length,
      String(row.summary || '').length,
      String(row.whyItMatters || '').length,
      String(row.nextAction || '').length,
      String(row.statusNote || '').length,
      String(row.owner || '').length,
    )
  }, 0)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    activeSprint,
    planCriticRuns,
    backlogCards,
    snapshot,
    packageSource,
    serverSource,
    moduleSource,
    verifierSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_HUB_BACKLOG_CONTRACT_APPROVAL_PATH,
      cardId: FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID,
    }),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID]),
    getBacklogItemsByIds([FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID]),
    getFoundationCoreSnapshot(),
    readRepoFile('package.json'),
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-hub-backlog-contract.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])

  const localContract = buildFoundationHubBacklogContract({
    backlogItems: snapshot.backlogItems || [],
  })
  const localValidation = validateFoundationHubBacklogContract(localContract)
  const dogfood = buildFoundationHubBacklogContractDogfoodProof()
  const packageJson = JSON.parse(packageSource)
  const route = await measureJsonRoute(args.baseUrl, '/api/foundation-hub')
  const routeValidation = validateFoundationHubBacklogContract({
    backlogItems: route.json?.backlogItems || [],
    backlogContract: route.json?.backlogContract || {},
  })

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'Plan approval validates at 9.8+',
    approval.failures?.map(failure => failure.check).join(', ') || FOUNDATION_HUB_BACKLOG_CONTRACT_APPROVAL_PATH,
  )
  addCheck(
    checks,
    backlogCards.length === 1 && ['scoped', 'done'].includes(backlogCards[0].lane),
    'live backlog card exists in scoped/done lane',
    backlogCards.map(card => `${card.id}:${card.lane}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === FOUNDATION_HUB_BACKLOG_CONTRACT_SPRINT_ID &&
      activeSprint.items.some(item =>
        item.cardId === FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID &&
        ['building_now', 'done_this_sprint'].includes(item.stage)
      ),
    'Current Sprint contains the card in Building Now or Done',
    activeSprint.sprint ? `${activeSprint.sprint.sprintId} ${activeSprint.items.map(item => `${item.cardId}:${item.stage}`).join(', ')}` : 'missing sprint',
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists',
    planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood proof truncates pathological backlog rows',
    `${dogfood.fullRowsBytes}B -> ${dogfood.compactRowsBytes}B; fields=${dogfood.truncatedFieldCount}`,
  )
  addCheck(
    checks,
    localValidation.ok &&
      localContract.backlogItems.length === (snapshot.backlogItems || []).length &&
      localContract.backlogContract.payload.compactRowsBytes < localContract.backlogContract.payload.fullRowsBytes,
    'local contract preserves card count while shrinking default rows',
    `${localContract.backlogContract.payload.fullRowsBytes}B -> ${localContract.backlogContract.payload.compactRowsBytes}B rows=${localContract.backlogItems.length}`,
  )
  addCheck(
    checks,
    route.ok &&
      route.bytes < FOUNDATION_HUB_BACKLOG_CONTRACT_DEFAULT_ROUTE_BUDGET_BYTES &&
      route.json?.backlogContract?.contractVersion === FOUNDATION_HUB_BACKLOG_CONTRACT_VERSION &&
      routeValidation.ok &&
      route.json?.foundationHubPerformance?.mode === 'summary',
    'live /api/foundation-hub uses the backlog contract and stays under default route budget',
    `status=${route.status} durationMs=${route.durationMs} bytes=${route.bytes} maxText=${maxBacklogTextLength(route.json?.backlogItems || [])}`,
  )
  addCheck(
    checks,
    route.json?.backlogContract?.totalItems === (snapshot.backlogItems || []).length &&
      route.json?.backlogItems?.length === (snapshot.backlogItems || []).length,
    'live route preserves backlog row count',
    `route=${route.json?.backlogItems?.length || 0} source=${(snapshot.backlogItems || []).length}`,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-hub-backlog-contract-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-hub-backlog-contract-check.mjs',
    'focused proof script is registered',
    packageJson.scripts?.['process:foundation-hub-backlog-contract-check'] || 'missing',
  )
  addCheck(
    checks,
    serverSource.includes('buildFoundationHubBacklogContract') &&
      moduleSource.includes('validateFoundationHubBacklogContract') &&
      verifierSource.includes('FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID') &&
      verifierSource.includes('backlogContract'),
    'repo source wires contract module, server route, and verifier coverage',
    'server.js + lib/foundation-hub-backlog-contract.js + scripts/foundation-verify.mjs',
  )
  addCheck(
    checks,
    approval.approval?.approvedPlanRef === FOUNDATION_HUB_BACKLOG_CONTRACT_PLAN_PATH &&
      FOUNDATION_HUB_BACKLOG_CONTRACT_SCRIPT_PATH === 'scripts/process-foundation-hub-backlog-contract-check.mjs',
    'plan and script constants point at canonical artifacts',
    approval.approval?.approvedPlanRef || 'missing',
  )

  await closeFoundationDb()

  const summary = {
    ok: checks.every(check => check.ok),
    cardId: FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID,
    checks,
    localContract: localContract.backlogContract,
    dogfood,
    route: {
      status: route.status,
      durationMs: route.durationMs,
      bytes: route.bytes,
      performance: route.json?.foundationHubPerformance || null,
      backlogContract: route.json?.backlogContract || null,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    console.log(`FOUNDATION_HUB ${route.durationMs}ms ${route.bytes} bytes`)
  }

  if (!summary.ok) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {
    // Ignore close errors while surfacing the original failure.
  }
  const args = parseArgs()
  const payload = {
    ok: false,
    cardId: FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID,
    error: error instanceof Error ? error.message : String(error),
  }
  if (args.json) console.log(JSON.stringify(payload, null, 2))
  else console.error(payload.error)
  process.exitCode = 1
})
