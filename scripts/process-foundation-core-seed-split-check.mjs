#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_CORE_SEED_SPLIT_APPROVAL_PATH,
  FOUNDATION_CORE_SEED_SPLIT_BEFORE_LINES,
  FOUNDATION_CORE_SEED_SPLIT_CARD_ID,
  FOUNDATION_CORE_SEED_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_CORE_SEED_SPLIT_PLAN_PATH,
  FOUNDATION_CORE_SEED_SPLIT_SCRIPT_PATH,
  FOUNDATION_CORE_SEED_SPLIT_SPRINT_ID,
  buildFoundationCoreSeedSplitDogfoodProof,
  evaluateFoundationCoreSeedSplit,
  getFoundationCoreSeedSummary,
} from '../lib/foundation-core-seed.js'
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

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function lineCount(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function scriptIsReadOnly(source = '') {
  const banned = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return banned.every(token => !source.includes(token))
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    coreSeedSource,
    foundationDbSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-core-seed.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile(FOUNDATION_CORE_SEED_SPLIT_SCRIPT_PATH),
    readRepoFile(FOUNDATION_CORE_SEED_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_CORE_SEED_SPLIT_APPROVAL_PATH,
    cardId: FOUNDATION_CORE_SEED_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([FOUNDATION_CORE_SEED_SPLIT_CARD_ID])
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = (sprint.items || []).find(item => item.cardId === FOUNDATION_CORE_SEED_SPLIT_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([FOUNDATION_CORE_SEED_SPLIT_CARD_ID])
  await closeFoundationDb()

  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildFoundationCoreSeedSplitDogfoodProof()
  const splitEvaluation = evaluateFoundationCoreSeedSplit({
    foundationDbSource,
    coreSeedSource,
    foundationDbLineCount: lineCount(foundationDbSource),
    preSplitFoundationDbLineCount: FOUNDATION_CORE_SEED_SPLIT_BEFORE_LINES,
    seedSummary: getFoundationCoreSeedSummary(),
  })

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FOUNDATION_CORE_SEED_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprint.sprint?.sprintId === FOUNDATION_CORE_SEED_SPLIT_SPRINT_ID, 'Current Sprint is the core seed split sprint', sprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, splitEvaluation.ok === true, 'core seed split evaluator passes current repo state', splitEvaluation.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'ok')
  ensure(checks, dogfood.ok === true, 'dogfood rejects old inline core seed ownership', dogfood.invariant)
  ensure(checks, foundationDbSource.includes('./foundation-core-seed.js') && !foundationDbSource.includes('const foundationUserSeed = ['), 'foundation-db imports core seed arrays and no longer owns first static seed array inline', 'import present, inline user seed absent')
  ensure(checks, coreSeedSource.includes('Live Postgres/API remains operational truth after bootstrap'), 'core seed module states live truth boundary', 'truth-boundary warning present')
  ensure(checks, splitEvaluation.seedInvariant.ok === true, 'static seed IDs/counts are preserved', splitEvaluation.seedInvariant.failures.join(', ') || 'ok')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, packageJson.scripts?.['process:foundation-core-seed-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_CORE_SEED_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-core-seed-split-check'] || 'missing')
  ensure(checks, planSource.includes('inline seed ownership') && planSource.includes('schema-only by default'), 'plan requires dogfood proof and schema-only posture', FOUNDATION_CORE_SEED_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: FOUNDATION_CORE_SEED_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_CORE_SEED_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: FOUNDATION_CORE_SEED_SPLIT_BEFORE_LINES,
      after: splitEvaluation.foundationDbLineCount,
      delta: splitEvaluation.foundationDbLineCount - FOUNDATION_CORE_SEED_SPLIT_BEFORE_LINES,
    },
    checks,
    dogfood,
    splitEvaluation,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation core seed split check: ${ok ? 'PASS' : 'FAIL'}`)
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
