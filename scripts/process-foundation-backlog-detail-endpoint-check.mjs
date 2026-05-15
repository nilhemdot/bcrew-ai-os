#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationCoreSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_APPROVAL_PATH,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_BUDGET_BYTES,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_BUDGET_MS,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_PLAN_PATH,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SCRIPT_PATH,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SPRINT_ID,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_VERSION,
  buildFoundationBacklogDetailEndpointDogfoodProof,
  validateFoundationBacklogDetailPayload,
} from '../lib/foundation-backlog-detail.js'
import {
  FOUNDATION_HUB_BACKLOG_CONTRACT_DEFAULT_ROUTE_BUDGET_BYTES,
} from '../lib/foundation-hub-backlog-contract.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = []) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fetchJsonWithMetrics(url) {
  const started = Date.now()
  const response = await fetch(url)
  const text = await response.text()
  const durationMs = Date.now() - started
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return {
    status: response.status,
    ok: response.ok,
    durationMs,
    bytes: Buffer.byteLength(text, 'utf8'),
    json,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const jsonMode = args.json === true || args.json === 'true'
  const baseUrl = String(args.baseUrl || 'http://localhost:3000').replace(/\/$/, '')
  const checks = []

  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    foundation,
    packageSource,
    serverSource,
    moduleSource,
    verifierSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_APPROVAL_PATH,
      cardId: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID, 'FOUNDATION-HUB-BACKLOG-CONTRACT-001']),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID]),
    getFoundationCoreSnapshot(),
    readRepoFile('package.json'),
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-backlog-detail.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID) || null
  const referenceCard = cards.find(item => item.id === 'FOUNDATION-HUB-BACKLOG-CONTRACT-001') || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID) || null
  const dogfood = buildFoundationBacklogDetailEndpointDogfoodProof()

  const realRoute = await fetchJsonWithMetrics(`${baseUrl}/api/foundation/backlog/${FOUNDATION_HUB_ENCODED_REFERENCE_CARD_ID}`)
  const missingRoute = await fetchJsonWithMetrics(`${baseUrl}/api/foundation/backlog/FOUNDATION-BACKLOG-DETAIL-ENDPOINT-999`)
  const malformedRoute = await fetchJsonWithMetrics(`${baseUrl}/api/foundation/backlog/not-a-card`)
  const foundationHubRoute = await fetchJsonWithMetrics(`${baseUrl}/api/foundation-hub`)
  const realRouteValidation = validateFoundationBacklogDetailPayload(realRoute.json || {})

  addCheck(
    checks,
    approval.ok &&
      approval.mode === 'v2' &&
      Number(approval.approval?.score) >= 9.8 &&
      approval.approval?.approvedPlanRef === FOUNDATION_BACKLOG_DETAIL_ENDPOINT_PLAN_PATH,
    'Plan approval validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || FOUNDATION_BACKLOG_DETAIL_ENDPOINT_APPROVAL_PATH,
  )
  addCheck(checks, Boolean(card) && ['scoped', 'done'].includes(card.lane), 'live backlog card exists in scoped/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    'Current Sprint contains the card in Building Now or Done',
    `${activeSprint.sprint?.sprintId || 'missing'} ${sprintItem?.cardId || 'missing'}:${sprintItem?.stage || 'missing'}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists',
    planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(checks, dogfood.ok, 'dogfood proof covers found, missing, and malformed card behavior', dogfood.invariant)
  addCheck(
    checks,
    referenceCard &&
      realRoute.status === 200 &&
      realRouteValidation.ok &&
      realRoute.json.cardId === referenceCard.id &&
      realRoute.json.card.whyItMatters === referenceCard.whyItMatters,
    'live detail route returns full detail for one real card',
    `status=${realRoute.status} durationMs=${realRoute.durationMs} bytes=${realRoute.bytes} validation=${realRouteValidation.ok}`,
  )
  addCheck(
    checks,
    realRoute.durationMs <= FOUNDATION_BACKLOG_DETAIL_ENDPOINT_BUDGET_MS &&
      realRoute.bytes > 0 &&
      realRoute.bytes <= FOUNDATION_BACKLOG_DETAIL_ENDPOINT_BUDGET_BYTES,
    'live detail route stays under single-card performance budget',
    `durationMs=${realRoute.durationMs}/${FOUNDATION_BACKLOG_DETAIL_ENDPOINT_BUDGET_MS} bytes=${realRoute.bytes}/${FOUNDATION_BACKLOG_DETAIL_ENDPOINT_BUDGET_BYTES}`,
  )
  addCheck(checks, missingRoute.status === 404, 'missing valid card returns 404', `status=${missingRoute.status}`)
  addCheck(checks, malformedRoute.status === 400, 'malformed card id returns 400', `status=${malformedRoute.status}`)
  addCheck(
    checks,
    foundationHubRoute.status === 200 &&
      foundationHubRoute.json?.backlogContract?.contractVersion &&
      foundationHubRoute.bytes < FOUNDATION_HUB_BACKLOG_CONTRACT_DEFAULT_ROUTE_BUDGET_BYTES,
    'default Foundation Hub route remains compact while detail route exists',
    `status=${foundationHubRoute.status} bytes=${foundationHubRoute.bytes}/${FOUNDATION_HUB_BACKLOG_CONTRACT_DEFAULT_ROUTE_BUDGET_BYTES}`,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-backlog-detail-endpoint-check'] === `node --env-file-if-exists=.env ${FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SCRIPT_PATH}`,
    'focused proof script is registered',
    packageJson.scripts?.['process:foundation-backlog-detail-endpoint-check'] || 'missing',
  )
  addCheck(
    checks,
    serverSource.includes("app.get('/api/foundation/backlog/:cardId'") &&
      serverSource.includes('getBacklogItemsByIds([validation.cardId])') &&
      moduleSource.includes('buildFoundationBacklogDetailEndpointDogfoodProof') &&
      verifierSource.includes(FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID),
    'repo source wires module, route, and verifier coverage',
    'server.js + lib/foundation-backlog-detail.js + scripts/foundation-verify.mjs',
  )
  addCheck(
    checks,
    foundation.backlogItems?.some(item => item.id === FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID),
    'Foundation core snapshot can still read the card through DB truth',
    `${foundation.backlogItems?.length || 0} backlog rows`,
  )

  const summary = {
    ok: checks.every(check => check.ok),
    cardId: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID,
    closeoutKey: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY,
    contractVersion: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_VERSION,
    checks,
    dogfood,
    route: {
      real: { status: realRoute.status, durationMs: realRoute.durationMs, bytes: realRoute.bytes, validation: realRouteValidation },
      missing: { status: missingRoute.status, durationMs: missingRoute.durationMs, bytes: missingRoute.bytes },
      malformed: { status: malformedRoute.status, durationMs: malformedRoute.durationMs, bytes: malformedRoute.bytes },
      foundationHub: { status: foundationHubRoute.status, durationMs: foundationHubRoute.durationMs, bytes: foundationHubRoute.bytes },
    },
  }

  if (jsonMode) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Foundation backlog detail endpoint proof')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (!summary.ok) process.exitCode = 1
}

const FOUNDATION_HUB_ENCODED_REFERENCE_CARD_ID = encodeURIComponent('FOUNDATION-HUB-BACKLOG-CONTRACT-001')

main().catch(error => {
  console.error('Foundation backlog detail endpoint proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
