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
  FOUNDATION_IDENTITY_APPROVAL_PATH,
  FOUNDATION_IDENTITY_CARD_ID,
  FOUNDATION_IDENTITY_CLOSEOUT_KEY,
  FOUNDATION_IDENTITY_PLAN_PATH,
  FOUNDATION_IDENTITY_SCRIPT_PATH,
  FOUNDATION_IDENTITY_SPRINT_ID,
  buildFoundationIdentityDogfoodProof,
  evaluateFoundationIdentitySource,
  validateFoundationIdentitySurface,
} from '../lib/foundation-identity-surface.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const PROCESS_SCRIPT_NAME = 'process:foundation-identity-check'

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

function identityPayloadHasNoPrivateContent(identity = {}) {
  const serialized = JSON.stringify(identity)
  return !/SYNTHETIC_PRIVATE_SENTINEL|rawText|\"content\"|\"body\"|\"excerpt\"/i.test(serialized)
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
    sourceTrustVerifierSource,
    moduleSource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: FOUNDATION_IDENTITY_APPROVAL_PATH,
      cardId: FOUNDATION_IDENTITY_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_IDENTITY_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_IDENTITY_CARD_ID]),
    readText('package.json'),
    readText('server.js'),
    readText('public/foundation-system-inventory-renderers.js'),
    readText('lib/foundation-source-trust-verifier.js'),
    readText('lib/foundation-identity-surface.js'),
    readText(FOUNDATION_IDENTITY_SCRIPT_PATH),
    readText(FOUNDATION_IDENTITY_PLAN_PATH),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_IDENTITY_CARD_ID) || null
  const systemInventoryRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/system-inventory')
  const identity = systemInventoryRoute.json?.identity || {}
  const identityValidation = validateFoundationIdentitySurface(identity)
  const dogfood = buildFoundationIdentityDogfoodProof()
  const sourceEvaluation = evaluateFoundationIdentitySource({
    serverSource,
    rendererSource,
    sourceTrustVerifierSource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageScripts: packageJson.scripts,
  })
  const closeout = getFoundationBuildCloseouts().find(item => item.key === FOUNDATION_IDENTITY_CLOSEOUT_KEY) || null

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has Foundation identity card executing or done', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode}/${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_IDENTITY_CARD_ID) || null
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === FOUNDATION_IDENTITY_SPRINT_ID &&
      sprintItem &&
      ['building_now', 'done_this_sprint'].includes(sprintItem.stage),
    'Current Sprint contains Foundation identity card in Building Now or Done',
    activeSprint?.sprint ? `${activeSprint.sprint.sprintId}:${sprintItem?.stage || 'missing'}` : 'missing sprint',
  )
  addCheck(checks, systemInventoryRoute.status === 200 && systemInventoryRoute.bytes < 2_000_000, '/api/system-inventory returns identity inside route budget', `${systemInventoryRoute.status}/${systemInventoryRoute.durationMs}ms/${systemInventoryRoute.bytes}B`)
  addCheck(checks, identityValidation.ok === true, 'live identity payload validates', identityValidation.ok ? `status=${identity.status}` : identityValidation.checks.filter(check => !check.ok).map(check => check.check).join('; '))
  addCheck(checks, identityPayloadHasNoPrivateContent(identity), 'live identity payload has no private content-shaped fields', 'content/body/excerpt/rawText scan clean')
  addCheck(checks, dogfood.ok === true, 'synthetic leaking payload fails closed', dogfood.ok ? dogfood.dogfoodInvariant : 'dogfood escaped')
  addCheck(checks, sourceEvaluation.ok === true, 'source wiring evaluator passes', `${sourceEvaluation.summary.passed}/${sourceEvaluation.summary.total}`)
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutations, or fs write calls')
  addCheck(
    checks,
    await repoFileExists(FOUNDATION_IDENTITY_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_IDENTITY_APPROVAL_PATH),
    'plan and approval files exist',
    `${FOUNDATION_IDENTITY_PLAN_PATH} / ${FOUNDATION_IDENTITY_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    planSource.includes('No shared-context `MEMORY.md` exposure') &&
      planSource.includes('No Drive permissions mutation'),
    'plan records privacy and Drive not-next boundaries',
    'privacy / Drive stop-lines present',
  )
  if (closeout || card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(FOUNDATION_IDENTITY_CARD_ID) &&
        currentPlan.includes(FOUNDATION_IDENTITY_CLOSEOUT_KEY) &&
        currentState.includes(FOUNDATION_IDENTITY_CLOSEOUT_KEY),
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
      routeMs: systemInventoryRoute.durationMs,
      routeBytes: systemInventoryRoute.bytes,
      identityStatus: identity.status || 'missing',
    },
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(PROCESS_SCRIPT_NAME)
    console.log('Foundation identity check')
    console.log(`  Status: ${ok ? 'pass' : 'fail'}`)
    for (const check of checks) {
      console.log(`  ${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` — ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (!ok) process.exitCode = 1
}

main().catch(async error => {
  console.error('Foundation identity check failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  try {
    await closeFoundationDb()
  } catch {
    // ignore cleanup failures
  }
  process.exitCode = 1
})
