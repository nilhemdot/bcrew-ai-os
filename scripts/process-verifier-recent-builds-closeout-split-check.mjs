#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  VERIFIER_RECENT_BUILDS_SPLIT_APPROVAL_PATH,
  VERIFIER_RECENT_BUILDS_SPLIT_BEFORE_LINES,
  VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID,
  VERIFIER_RECENT_BUILDS_SPLIT_CLOSEOUT_KEY,
  VERIFIER_RECENT_BUILDS_SPLIT_HANDOFF_PATH,
  VERIFIER_RECENT_BUILDS_SPLIT_PLAN_PATH,
  VERIFIER_RECENT_BUILDS_SPLIT_SCRIPT_PATH,
  VERIFIER_RECENT_BUILDS_SPLIT_SPRINT_ID,
  buildFoundationRecentBuildsVerifierDogfoodProof,
} from '../lib/foundation-recent-builds-verifier.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...value] = arg.slice(2).split('=')
    args[key] = value.length ? value.join('=') : 'true'
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
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
  const jsonOnly = args.json === true || args.json === 'true'
  const checks = []

  const [
    moduleSource,
    verifierSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-recent-builds-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_RECENT_BUILDS_SPLIT_SCRIPT_PATH),
    readRepoFile(VERIFIER_RECENT_BUILDS_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_RECENT_BUILDS_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_RECENT_BUILDS_SPLIT_CLOSEOUT_KEY) || null
  const activeSprintOwnsCard =
    activeSprint.sprint?.sprintId === VERIFIER_RECENT_BUILDS_SPLIT_SPRINT_ID &&
    sprintItem &&
    ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_RECENT_BUILDS_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID)
  const dogfood = buildFoundationRecentBuildsVerifierDogfoodProof()
  const verifierLines = lineCount(verifierSource)

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_RECENT_BUILDS_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'verifier Recent Builds split has active or historical ownership', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'closed verifier Recent Builds split carries durable closeout proof', historicalCloseoutOwnsCard ? `${card?.lane}:${closeout?.key}` : sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationRecentBuildsVerifier') && moduleSource.includes('RECENT_BUILD_CLOSEOUT_EXPECTATIONS'), 'new module owns Recent Builds closeout verifier definitions', 'lib/foundation-recent-builds-verifier.js')
  addCheck(checks, dogfood.ok === true, 'dogfood rejects old Recent Builds closeout verifier failures', JSON.stringify({
    healthy: dogfood.healthy?.ok,
    missingProofRejected: dogfood.missingProofRejected,
    invalidSchemaRejected: dogfood.invalidSchemaRejected,
    missingWhereItLivesRejected: dogfood.missingWhereItLivesRejected,
  }))
  addCheck(
    checks,
    (verifierSource.includes('evaluateFoundationRecentBuildsVerifier({') ||
      verifierSource.includes('evaluateFoundationRecentBuildsVerifierOrchestration({')) &&
      (verifierSource.includes('recentBuildsCloseoutVerifier.checks') ||
        verifierSource.includes('recentBuildsCloseoutOrchestrationVerifier.checks')),
    'foundation verifier delegates Recent Builds closeout checks to focused module',
    'evaluateFoundationRecentBuildsVerifier',
  )
  addCheck(
    checks,
    moduleSource.includes('evaluateFoundationRecentBuildsVerifierOrchestration') &&
      verifierSource.includes('evaluateFoundationRecentBuildsVerifierOrchestration({'),
    'historical Recent Builds split proof accepts wrapper delegation',
    'root may delegate through evaluateFoundationRecentBuildsVerifierOrchestration',
  )
  addCheck(checks, !verifierSource.includes('Recent Builds v2 carries closeout proof for ' + 'FOUNDATION-SWEEP-001'), 'foundation verifier no longer owns old inline Recent Builds closeout labels', 'old labels absent from root verifier')
  addCheck(checks, verifierLines < VERIFIER_RECENT_BUILDS_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_RECENT_BUILDS_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  addCheck(checks, packageJson.scripts?.['process:verifier-recent-builds-closeout-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_RECENT_BUILDS_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-recent-builds-closeout-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_RECENT_BUILDS_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_RECENT_BUILDS_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Substring-only proof is rejected') && planSource.includes('dogfood proof recreates the old failure modes'), 'plan rejects substring-only proof and requires dogfood', VERIFIER_RECENT_BUILDS_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_RECENT_BUILDS_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_RECENT_BUILDS_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_RECENT_BUILDS_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier Recent Builds closeout split proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.filter(check => check.ok).length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (!ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
