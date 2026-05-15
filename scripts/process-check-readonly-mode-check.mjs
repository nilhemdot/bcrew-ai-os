#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  PROCESS_CHECK_READONLY_MODE_APPROVAL_PATH,
  PROCESS_CHECK_READONLY_MODE_CARD_ID,
  PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY,
  PROCESS_CHECK_READONLY_MODE_PLAN_PATH,
  PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH,
  PROCESS_CHECK_READONLY_MODE_SPRINT_ID,
  buildProcessCheckReadonlyModeProof,
} from '../lib/process-check-readonly-mode.js'
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
    processWriteGuardSource,
    backlogStoreSource,
    readonlyModeSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/process-write-guard.js'),
    readRepoFile('lib/foundation-backlog-store.js'),
    readRepoFile('lib/process-check-readonly-mode.js'),
    readRepoFile(PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH),
    readRepoFile(PROCESS_CHECK_READONLY_MODE_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: PROCESS_CHECK_READONLY_MODE_APPROVAL_PATH,
    cardId: PROCESS_CHECK_READONLY_MODE_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([PROCESS_CHECK_READONLY_MODE_CARD_ID])
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = (sprint.items || []).find(item => item.cardId === PROCESS_CHECK_READONLY_MODE_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([PROCESS_CHECK_READONLY_MODE_CARD_ID])
  const proof = await buildProcessCheckReadonlyModeProof({ repoRoot })
  await closeFoundationDb()

  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || PROCESS_CHECK_READONLY_MODE_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprint.sprint?.sprintId === PROCESS_CHECK_READONLY_MODE_SPRINT_ID, 'Current Sprint is the process-check readonly mode sprint', sprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, proof.ok === true, 'dogfood proof blocks unguarded process-check live mutation', JSON.stringify(proof))
  ensure(checks, proof.unguardedFixture?.protected === false && proof.unguardedFixture?.classification === 'unclassified_live_mutation', 'synthetic unguarded live mutator is rejected', proof.unguardedFixture?.reason || 'missing')
  ensure(checks, proof.guardedFixture?.protected === true && proof.guardedFixture?.classification === 'guarded_live_mutation', 'synthetic guarded mutator is accepted', proof.guardedFixture?.reason || 'missing')
  ensure(checks, proof.noFlagBlocked?.code === 'PROCESS_CHECK_WRITE_BLOCKED' && proof.explicitAllowed?.ok === true, 'process write guard blocks no-flag and allows explicit posture', `blocked=${proof.noFlagBlocked?.code || 'no'} allowed=${proof.explicitAllowed?.ok}`)
  ensure(checks, proof.scan?.ok === true && Number(proof.scan?.scriptCount) >= 100, 'real repo has zero unclassified unguarded process-check mutators', `scripts=${proof.scan?.scriptCount} counts=${JSON.stringify(proof.scan?.classificationCounts || {})}`)
  ensure(checks, processWriteGuardSource.includes('assertCurrentProcessCheckWriteAllowed') && processWriteGuardSource.includes('getCurrentProcessScriptPath'), 'shared process write guard exposes current-process helper', 'lib/process-write-guard.js')
  ensure(checks, backlogStoreSource.includes('assertCurrentProcessCheckWriteAllowed') && backlogStoreSource.includes('create backlog item') && backlogStoreSource.includes('update backlog item'), 'Foundation backlog store guards process-check create/update calls', 'lib/foundation-backlog-store.js')
  ensure(checks, readonlyModeSource.includes('PROCESS_CHECK_READONLY_LEGACY_CLASSIFICATIONS') && readonlyModeSource.includes('buildProcessCheckReadonlyModeProof'), 'readonly mode module owns scanner, classifications, and proof', 'lib/process-check-readonly-mode.js')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, packageJson.scripts?.['process:process-check-readonly-mode-check'] === `node --env-file-if-exists=.env ${PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:process-check-readonly-mode-check'] || 'missing')
  ensure(checks, planSource.includes('actual function path') && planSource.includes('Substring-only proof is rejected') && planSource.includes('under 2 minutes'), 'plan requires behavior proof, substring rejection, and speed bound', PROCESS_CHECK_READONLY_MODE_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: PROCESS_CHECK_READONLY_MODE_CARD_ID,
    closeoutKey: PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY,
    checks,
    proof,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Process-check readonly mode: ${ok ? 'PASS' : 'FAIL'}`)
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
