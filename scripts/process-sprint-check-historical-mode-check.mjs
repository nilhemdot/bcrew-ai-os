#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { overnightCloseoutRecords } from '../lib/foundation-build-closeout-overnight-records.js'
import {
  PROCESS_CHECK_READONLY_MODE_CARD_ID,
  PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY,
  PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH,
  PROCESS_CHECK_READONLY_MODE_SPRINT_ID,
} from '../lib/process-check-readonly-mode.js'
import {
  SPRINT_CHECK_HISTORICAL_MODE_APPROVAL_PATH,
  SPRINT_CHECK_HISTORICAL_MODE_CARD_ID,
  SPRINT_CHECK_HISTORICAL_MODE_CLOSEOUT_KEY,
  SPRINT_CHECK_HISTORICAL_MODE_PLAN_PATH,
  SPRINT_CHECK_HISTORICAL_MODE_SCRIPT_PATH,
  SPRINT_CHECK_HISTORICAL_MODE_SPRINT_ID,
  buildSyntheticSprintCheckHistoricalModeProof,
  evaluateSprintCheckHistoricalMode,
  processCheckReadonlyProofIsHistoricalAware,
} from '../lib/sprint-check-historical-mode.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function scriptIsReadOnly(source = '') {
  const banned = [
    'update' + 'BacklogItem(',
    'create' + 'BacklogItem(',
    'upsert' + 'FoundationCurrentSprintOverlay(',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'batch' + 'UpdateSheetValues',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return banned.every(token => !source.includes(token))
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    helperSource,
    scriptSource,
    readonlyScriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/sprint-check-historical-mode.js'),
    readRepoFile(SPRINT_CHECK_HISTORICAL_MODE_SCRIPT_PATH),
    readRepoFile(PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH),
    readRepoFile(SPRINT_CHECK_HISTORICAL_MODE_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SPRINT_CHECK_HISTORICAL_MODE_APPROVAL_PATH,
    cardId: SPRINT_CHECK_HISTORICAL_MODE_CARD_ID,
  })
  const backlogItems = await getBacklogItemsByIds([
    SPRINT_CHECK_HISTORICAL_MODE_CARD_ID,
    PROCESS_CHECK_READONLY_MODE_CARD_ID,
  ])
  const backlogItemsById = new Map(backlogItems.map(item => [item.id, item]))
  const card = backlogItemsById.get(SPRINT_CHECK_HISTORICAL_MODE_CARD_ID) || null
  const previousCard = backlogItemsById.get(PROCESS_CHECK_READONLY_MODE_CARD_ID) || null
  const sprint = await getActiveFoundationCurrentSprint()
  const currentSprintMode = evaluateSprintCheckHistoricalMode({
    activeSprint: sprint,
    card,
    closeouts: overnightCloseoutRecords,
    cardId: SPRINT_CHECK_HISTORICAL_MODE_CARD_ID,
    expectedSprintId: SPRINT_CHECK_HISTORICAL_MODE_SPRINT_ID,
    closeoutKey: SPRINT_CHECK_HISTORICAL_MODE_CLOSEOUT_KEY,
  })
  const previousSprintMode = evaluateSprintCheckHistoricalMode({
    activeSprint: sprint,
    card: previousCard,
    closeouts: overnightCloseoutRecords,
    cardId: PROCESS_CHECK_READONLY_MODE_CARD_ID,
    expectedSprintId: PROCESS_CHECK_READONLY_MODE_SPRINT_ID,
    closeoutKey: PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY,
  })
  const planCriticRuns = await getPlanCriticRunsByCardIds([SPRINT_CHECK_HISTORICAL_MODE_CARD_ID])
  const proof = buildSyntheticSprintCheckHistoricalModeProof()
  await closeFoundationDb()

  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || SPRINT_CHECK_HISTORICAL_MODE_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, currentSprintMode.ok === true && currentSprintMode.mode === 'active_current', 'current card validates against the active Current Sprint', `${currentSprintMode.mode}: ${currentSprintMode.reason}`)
  ensure(checks, previousSprintMode.ok === true && previousSprintMode.mode === 'historical_closeout', 'closed readonly-mode proof validates from verified historical closeout after rollover', `${previousSprintMode.mode}: ${previousSprintMode.reason}`)
  ensure(checks, previousCard?.lane === 'done', 'dogfood target card is done in live backlog', previousCard ? `${previousCard.id}:${previousCard.lane}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, proof.ok === true, 'synthetic dogfood covers active and historical modes', JSON.stringify(proof))
  ensure(checks, proof.activeCurrent?.ok === true && proof.historicalPass?.ok === true, 'active-current and historical-closeout fixtures pass', `active=${proof.activeCurrent?.mode} historical=${proof.historicalPass?.mode}`)
  ensure(checks, proof.historicalNoCloseout?.ok === false && proof.scopedWithCloseout?.ok === false && proof.historicalWrongKey?.ok === false, 'weak historical fixtures fail closed', `missing=${proof.historicalNoCloseout?.mode} scoped=${proof.scopedWithCloseout?.mode} wrongKey=${proof.historicalWrongKey?.mode}`)
  ensure(checks, processCheckReadonlyProofIsHistoricalAware(readonlyScriptSource), 'process-check readonly proof script uses historical mode helper', PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH)
  ensure(checks, helperSource.includes('evaluateSprintCheckHistoricalMode') && helperSource.includes('findVerifiedHistoricalCloseout'), 'helper module owns active-or-historical function path', 'lib/sprint-check-historical-mode.js')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, packageJson.scripts?.['process:sprint-check-historical-mode-check'] === `node --env-file-if-exists=.env ${SPRINT_CHECK_HISTORICAL_MODE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:sprint-check-historical-mode-check'] || 'missing')
  ensure(checks, planSource.includes('Actual function path') && planSource.includes('Substring-only proof is rejected') && planSource.includes('under 2 minutes'), 'plan requires behavior proof, substring rejection, and speed bound', SPRINT_CHECK_HISTORICAL_MODE_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: SPRINT_CHECK_HISTORICAL_MODE_CARD_ID,
    closeoutKey: SPRINT_CHECK_HISTORICAL_MODE_CLOSEOUT_KEY,
    checks,
    proof,
    currentSprintMode,
    previousSprintMode,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Sprint-check historical mode: ${ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (!ok) process.exit(1)
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
