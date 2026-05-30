#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_BACKLOG_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_BACKLOG_STORE_SPLIT_BEFORE_LINES,
  FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID,
  FOUNDATION_BACKLOG_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_BACKLOG_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_BACKLOG_STORE_SPLIT_SPRINT_ID,
  buildFoundationBacklogStoreSplitDogfoodProof,
} from '../lib/foundation-backlog-store.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'

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
  return String(source || '').split('\n').length
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
    moduleSource,
    foundationDbSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-backlog-store.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile(FOUNDATION_BACKLOG_STORE_SPLIT_SCRIPT_PATH),
    readRepoFile(FOUNDATION_BACKLOG_STORE_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_BACKLOG_STORE_SPLIT_APPROVAL_PATH,
    cardId: FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID])
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = (sprint.items || []).find(item => item.cardId === FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID])
  await closeFoundationDb()

  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildFoundationBacklogStoreSplitDogfoodProof()
  const foundationDbLines = lineCount(foundationDbSource)
  const createExport = 'export const create' + 'BacklogItem'
  const updateExport = 'export const update' + 'BacklogItem'
  const oldAssert = 'function assert' + 'BacklogDoneCloseout'
  const oldUpdateHelper = 'async function update' + 'BacklogItemWithClient'

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FOUNDATION_BACKLOG_STORE_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprint.sprint?.sprintId === FOUNDATION_BACKLOG_STORE_SPLIT_SPRINT_ID, 'Current Sprint is the backlog store split sprint', sprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleSource.includes('createFoundationBacklogStore') && moduleSource.includes('buildFoundationBacklogStoreSplitDogfoodProof'), 'new module owns backlog store factory and dogfood proof', 'lib/foundation-backlog-store.js')
  ensure(checks, moduleSource.includes('FOR ' + 'UPDATE'), 'backlog update path still locks row before merge', 'row lock present in store module')
  ensure(checks, moduleSource.includes('before,') && moduleSource.includes('after,') && moduleSource.includes('changedFields'), 'backlog change events still include before/after/changedFields metadata', 'metadata fields present')
  ensure(checks, dogfood.ok === true, 'dogfood rejects old backlog store failures', dogfood.invariant)
  ensure(checks, foundationDbSource.includes('createFoundationBacklogStore') && foundationDbSource.includes(createExport) && foundationDbSource.includes(updateExport), 'foundation-db delegates public backlog exports to focused store', 'wrapper exports present')
  ensure(checks, !foundationDbSource.includes(oldAssert) && !foundationDbSource.includes(oldUpdateHelper), 'foundation-db no longer owns old backlog write helpers', 'old helpers absent')
  ensure(checks, foundationDbLines < FOUNDATION_BACKLOG_STORE_SPLIT_BEFORE_LINES, 'foundation-db line count decreases', `${FOUNDATION_BACKLOG_STORE_SPLIT_BEFORE_LINES} -> ${foundationDbLines}`)
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, packageJson.scripts?.['process:foundation-backlog-store-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_BACKLOG_STORE_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-backlog-store-split-check'] || 'missing')
  ensure(checks, planSource.includes('Dogfood proof recreates the unsafe patterns') && planSource.includes('weak done-lane closeout'), 'plan requires behavioral dogfood proof', FOUNDATION_BACKLOG_STORE_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_BACKLOG_STORE_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: FOUNDATION_BACKLOG_STORE_SPLIT_BEFORE_LINES,
      after: foundationDbLines,
      delta: foundationDbLines - FOUNDATION_BACKLOG_STORE_SPLIT_BEFORE_LINES,
    },
    checks,
    dogfood,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation backlog store split check: ${ok ? 'PASS' : 'FAIL'}`)
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
