#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { overnightCloseoutRecords } from '../lib/foundation-build-closeout-overnight-records.js'
import {
  ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_APPROVAL_PATH,
  ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID,
  ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY,
  ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_PLAN_PATH,
  ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SCRIPT_PATH,
  ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SPRINT_ID,
  buildActiveVsHistoricalVerifierSplitDogfoodProof,
  evaluateActiveLiveTruthAssertion,
  evaluateHistoricalCloseoutAssertion,
} from '../lib/foundation-active-historical-verifier.js'
import {
  evaluateSprintCheckHistoricalMode,
} from '../lib/sprint-check-historical-mode.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function scriptIsReadOnly(source = '') {
  const banned = [
    ['update', 'BacklogItem('].join(''),
    ['create', 'BacklogItem('].join(''),
    ['upsert', 'FoundationCurrentSprintOverlay('].join(''),
    ['INSERT', ' INTO'].join(''),
    ['UPDATE', ' '].join(''),
    ['DELETE', ' FROM'].join(''),
    ['batch', 'UpdateSheetValues'].join(''),
    ['fs.', 'writeFile'].join(''),
    ['write', 'File('].join(''),
  ]
  return banned.every(token => !source.includes(token))
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    helperSource,
    scriptSource,
    planSource,
    verifierSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-active-historical-verifier.js'),
    readRepoFile(ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SCRIPT_PATH),
    readRepoFile(ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_PLAN_PATH),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_APPROVAL_PATH,
    cardId: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID])
  await closeFoundationDb()

  const sprintMode = evaluateSprintCheckHistoricalMode({
    activeSprint,
    card,
    closeouts: overnightCloseoutRecords,
    cardId: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID,
    expectedSprintId: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SPRINT_ID,
    closeoutKey: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY,
  })
  const planCritic = planCriticRuns.find(run =>
    run.cardId === ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= 9.8 &&
      run.planRef === ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_PLAN_PATH
  ) || null
  const dogfood = buildActiveVsHistoricalVerifierSplitDogfoodProof()
  const activeFunctionProof = evaluateActiveLiveTruthAssertion({
    label: 'proof current sprint id',
    expected: 'current',
    actual: 'stale',
    historicalCloseout: { key: 'proof-closeout-v1', backlogIds: [ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID], status: 'accepted', acceptanceState: 'Verified' },
  })
  const historicalFunctionProof = evaluateHistoricalCloseoutAssertion({
    card: { id: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID, lane: 'done' },
    closeouts: [{ key: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY, backlogIds: [ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID], status: 'accepted', acceptanceState: 'Verified' }],
    cardId: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID,
    closeoutKey: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY,
  })

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, sprintMode.ok === true && ['active_current', 'historical_closeout'].includes(sprintMode.mode), 'card validates against active sprint or verified historical closeout', `${sprintMode.mode}: ${sprintMode.reason}`)
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, dogfood.ok === true, 'dogfood covers active and historical modes', JSON.stringify(dogfood))
  addCheck(checks, dogfood.activeStaleWithCloseout?.ok === false && dogfood.activeStaleWithCloseout?.hasHistoricalCloseout === true, 'stale active truth fails even with historical closeout evidence', dogfood.activeStaleWithCloseout?.mode || 'missing')
  addCheck(checks, dogfood.historicalPass?.ok === true && dogfood.historicalPass?.mode === 'historical_closeout', 'historical done-card closeout fixture passes', dogfood.historicalPass?.mode || 'missing')
  addCheck(checks, dogfood.historicalMissingCloseout?.ok === false && dogfood.historicalCardNotDone?.ok === false, 'weak historical fixtures fail closed', `missing=${dogfood.historicalMissingCloseout?.mode} notDone=${dogfood.historicalCardNotDone?.mode}`)
  addCheck(checks, activeFunctionProof.ok === false && activeFunctionProof.mode === 'active_live_truth_mismatch', 'actual active helper rejects stale value', activeFunctionProof.mode)
  addCheck(checks, historicalFunctionProof.ok === true && historicalFunctionProof.mode === 'historical_closeout', 'actual historical helper accepts done card plus verified closeout', historicalFunctionProof.mode)
  addCheck(checks, helperSource.includes('evaluateActiveLiveTruthAssertion') && helperSource.includes('evaluateHistoricalCloseoutAssertion'), 'helper module owns split function paths', 'lib/foundation-active-historical-verifier.js')
  addCheck(checks, verifierSource.includes('buildActiveVsHistoricalVerifierSplitDogfoodProof') && verifierSource.includes('ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY'), 'foundation verifier delegates to focused dogfood proof', 'scripts/foundation-verify.mjs')
  addCheck(checks, packageJson.scripts?.['process:active-vs-historical-verifier-split-check'] === `node --env-file-if-exists=.env ${ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:active-vs-historical-verifier-split-check'] || 'missing')
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  addCheck(checks, planSource.includes('Actual function path') && planSource.includes('Substring-only proof is rejected') && planSource.includes('Useful operator behavior'), 'plan requires behavior proof and operator value', ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID,
    closeoutKey: ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY,
    checks,
    dogfood,
    sprintMode,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Active vs historical verifier split: ${ok ? 'PASS' : 'FAIL'}`)
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
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
