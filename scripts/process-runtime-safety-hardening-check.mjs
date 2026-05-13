#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
  RUNTIME_SAFETY_HARDENING_SPRINT_ID,
  VERIFY_READONLY_GATE_CARD_ID,
  buildFoundationVerifyRetryOptions,
  buildVerifyReadOnlyGateDogfoodProof,
} from '../lib/foundation-runtime-safety.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_IDS = [
  VERIFY_READONLY_GATE_CARD_ID,
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, card: VERIFY_READONLY_GATE_CARD_ID }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--card=')) args.card = arg.slice('--card='.length)
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function buildVerifyReadOnlyGateStatus() {
  const checks = []
  const cardId = VERIFY_READONLY_GATE_CARD_ID
  const [packageSource, foundationVerifySource, runtimeSafetySource] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-runtime-safety.js'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: `docs/process/approvals/${cardId}.json`,
    cardId,
  })
  const planCriticRuns = await getPlanCriticRunsByCardIds([cardId])
  const backlogItems = await getBacklogItemsByIds([cardId])
  const activeSprint = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === cardId) || null
  const card = backlogItems.find(item => item.id === cardId) || null
  const proof = await buildVerifyReadOnlyGateDogfoodProof()
  const forbiddenResetFunctionToken = ['reset', 'Foundation', 'Db'].join('')
  const forbiddenRetryRepairHookToken = ['before', 'Retry'].join('')
  let repairHookThrows = false
  try {
    buildFoundationVerifyRetryOptions({ beforeRetry: async () => {} })
  } catch {
    repairHookThrows = true
  }

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    `${cardId} approval file is valid at 9.8+`,
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8),
    `${cardId} has durable Plan Critic pass row`,
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    `${cardId} exists in live backlog`,
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === RUNTIME_SAFETY_HARDENING_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    `${cardId} is active in the runtime safety sprint`,
    activeSprint.sprint ? `${activeSprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing active sprint',
  )
  addCheck(
    checks,
    proof.ok === true &&
      proof.legacyRepairThenPass?.wentGreenAfterRepair === true &&
      proof.readOnlyFailClosed?.failedClosed === true &&
      proof.readOnlyFailClosed?.repairCalls === 0 &&
      proof.repairHookRejected?.ok === true,
    'dogfood proof blocks repair-then-pass verifier behavior',
    JSON.stringify(proof),
  )
  addCheck(
    checks,
    repairHookThrows,
    'foundation:verify retry options reject repair hooks',
    repairHookThrows ? 'repair hook rejected' : 'repair hook accepted',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:runtime-safety-hardening-check'] === `node --env-file-if-exists=.env ${RUNTIME_SAFETY_HARDENING_SCRIPT_PATH}`,
    'package exposes runtime safety focused proof',
    packageJson.scripts?.['process:runtime-safety-hardening-check'] || 'missing',
  )
  addCheck(
    checks,
    foundationVerifySource.includes('buildFoundationVerifyRetryOptions') &&
      foundationVerifySource.includes('buildVerifyReadOnlyGateDogfoodProof') &&
      !foundationVerifySource.includes(forbiddenResetFunctionToken) &&
      !foundationVerifySource.includes(forbiddenRetryRepairHookToken),
    'foundation:verify source uses read-only retry helper and no live repair hook',
    `${forbiddenResetFunctionToken}=absent ${forbiddenRetryRepairHookToken}=absent`,
  )
  addCheck(
    checks,
    runtimeSafetySource.includes('repair-then-pass') &&
      runtimeSafetySource.includes('foundation:verify is read-only') &&
      runtimeSafetySource.includes('buildVerifyReadOnlyGateDogfoodProof'),
    'runtime safety helper owns the dogfood invariant',
    'dogfood helper present',
  )

  return { checks, proof }
}

async function main() {
  const args = parseArgs()
  const checks = []
  let proof = null

  if (!CARD_IDS.includes(args.card)) {
    addCheck(checks, false, 'requested card is implemented in this focused proof', args.card || 'missing --card')
  } else if (args.card === VERIFY_READONLY_GATE_CARD_ID) {
    const status = await buildVerifyReadOnlyGateStatus()
    checks.push(...status.checks)
    proof = status.proof
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    card: args.card,
    sprintId: RUNTIME_SAFETY_HARDENING_SPRINT_ID,
    scriptPath: RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
    proof,
    findings: failures,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Runtime safety hardening check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
