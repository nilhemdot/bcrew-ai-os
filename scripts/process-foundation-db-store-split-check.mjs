#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  buildCurrentSprintMutationGuardsDogfoodProof,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  FOUNDATION_DB_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_DB_STORE_SPLIT_CARD_ID,
  FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_DB_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_DB_STORE_SPLIT_SPRINT_ID,
  buildSyntheticFoundationCurrentSprintStoreSplitProof,
  evaluateFoundationCurrentSprintStoreSplit,
} from '../lib/foundation-current-sprint-store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    foundationDbSource,
    foundationBacklogSprintSource,
    storeSource,
    packageSource,
    approval,
    cards,
    planCriticRuns,
    activeSprint,
    mutationGuardProof,
  ] = await Promise.all([
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-backlog-sprint-db.js'),
    readRepoFile('lib/foundation-current-sprint-store.js'),
    readRepoFile('package.json'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_DB_STORE_SPLIT_APPROVAL_PATH,
      cardId: FOUNDATION_DB_STORE_SPLIT_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_DB_STORE_SPLIT_CARD_ID]),
    getPlanCriticRunsByCardIds([FOUNDATION_DB_STORE_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    buildCurrentSprintMutationGuardsDogfoodProof(),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_DB_STORE_SPLIT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_DB_STORE_SPLIT_CARD_ID) || null
  const historicalCloseout = getFoundationBuildCloseouts().find(item =>
    item.key === FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY &&
      item.operatorCloseout === true &&
      (item.backlogIds || []).includes(FOUNDATION_DB_STORE_SPLIT_CARD_ID)
  ) || null
  const splitEvaluation = evaluateFoundationCurrentSprintStoreSplit({
    foundationDbSource,
    foundationBacklogSprintSource,
    currentSprintStoreSource: storeSource,
  })
  const syntheticSplitProof = buildSyntheticFoundationCurrentSprintStoreSplitProof()

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'approval file is valid at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === FOUNDATION_DB_STORE_SPLIT_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists before build',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    'live backlog card exists',
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    (
      activeSprint.sprint?.sprintId === FOUNDATION_DB_STORE_SPLIT_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage)
    ) ||
      (
        card?.lane === 'done' &&
        String(card?.statusNote || '').includes(FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY) &&
        historicalCloseout
      ),
    'card is in active Foundation DB store split sprint or has verified historical closeout',
    historicalCloseout
      ? `historical closeout ${historicalCloseout.key}`
      : activeSprint.sprint ? `${activeSprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing sprint',
  )
  addCheck(
    checks,
    splitEvaluation.ok,
    'real split layout passes evaluator',
    splitEvaluation.checks.filter(check => !check.ok).map(check => check.check).join(', ') || `foundation-db lines=${splitEvaluation.foundationDbLineCount}`,
  )
  addCheck(
    checks,
    syntheticSplitProof.ok &&
      syntheticSplitProof.unsplit.ok === false &&
      syntheticSplitProof.split.ok === true,
    'dogfood split proof rejects old unsplit shape and accepts split shape',
    `unsplit=${syntheticSplitProof.unsplit.ok} split=${syntheticSplitProof.split.ok}`,
  )
  addCheck(
    checks,
    mutationGuardProof.ok === true &&
      mutationGuardProof.unsafeNoApply?.blocked === true &&
      mutationGuardProof.missingExpectedPreviousActiveSprintId?.blocked === true &&
      mutationGuardProof.missingAllowItemReplacement?.blocked === true &&
      mutationGuardProof.explicitAllowed?.ok === true &&
      mutationGuardProof.syntheticRollback?.replacement_card_exists === false,
    'actual Current Sprint dogfood proof still blocks unsafe writes after split',
    `blocked=${mutationGuardProof.unsafeNoApply?.blocked ? 'yes' : 'no'} diff=${mutationGuardProof.explicitAllowed?.itemDiff?.changedCount || 0}`,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-db-store-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_DB_STORE_SPLIT_SCRIPT_PATH}`,
    'package exposes focused proof script',
    packageJson.scripts?.['process:foundation-db-store-split-check'] || 'missing',
  )
  addCheck(
    checks,
    storeSource.includes(FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY),
    'store module exposes closeout key for ship proof',
    FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY,
  )

  const failed = checks.filter(check => !check.ok)
  const summary = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: FOUNDATION_DB_STORE_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY,
    checks,
    failed,
    splitEvaluation,
    syntheticSplitProof,
    mutationGuardProof: {
      ok: mutationGuardProof.ok,
      unsafeNoApplyBlocked: mutationGuardProof.unsafeNoApply?.blocked === true,
      missingExpectedPreviousActiveSprintIdBlocked: mutationGuardProof.missingExpectedPreviousActiveSprintId?.blocked === true,
      missingAllowItemReplacementBlocked: mutationGuardProof.missingAllowItemReplacement?.blocked === true,
      explicitAllowed: mutationGuardProof.explicitAllowed?.ok === true,
      rollbackClean: mutationGuardProof.syntheticRollback?.replacement_card_exists === false,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Foundation DB store split proof')
    console.log(`  Status: ${summary.status}`)
    for (const check of checks) console.log(`  ${check.ok ? 'OK' : 'BLOCKED'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
