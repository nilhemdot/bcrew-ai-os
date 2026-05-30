#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_APPROVAL_PATH,
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_BEFORE_LINES,
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID,
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_CLOSEOUT_KEY,
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_HANDOFF_PATH,
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_PLAN_PATH,
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_SCRIPT_PATH,
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_SPRINT_ID,
  buildFoundationRuntimeReliabilityVerifierDogfoodProof,
} from '../lib/foundation-runtime-reliability-verifier.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

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
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_RUNTIME_RELIABILITY_SPLIT_SCRIPT_PATH),
    readRepoFile(VERIFIER_RUNTIME_RELIABILITY_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_RUNTIME_RELIABILITY_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID])
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID) || null
  const dogfood = await buildFoundationRuntimeReliabilityVerifierDogfoodProof()
  const verifierLines = lineCount(verifierSource)

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_RUNTIME_RELIABILITY_SPLIT_APPROVAL_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === VERIFIER_RUNTIME_RELIABILITY_SPLIT_SPRINT_ID || card?.lane === 'done', 'Current Sprint is the verifier runtime reliability split sprint or card is historically done', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)) || card?.lane === 'done', 'Current Sprint contains the card in Building Now or card is historically done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : card?.lane || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationRuntimeReliabilityVerifier') && moduleSource.includes('evaluateFoundationRuntimeReliabilityVerifierOrchestration') && moduleSource.includes('RUNTIME_RELIABILITY_VERIFIER_CHECK_DEFINITIONS'), 'new module owns runtime reliability verifier definitions', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, dogfood.ok === true, 'dogfood rejects old runtime reliability verifier failures', JSON.stringify({
    healthy: dogfood.healthy?.ok,
    missingSourceOutageRejected: dogfood.missingSourceOutageRejected,
    missingOperatingReliabilityRejected: dogfood.missingOperatingReliabilityRejected,
    missingPlanCriticDogfoodRejected: dogfood.missingPlanCriticDogfoodRejected,
    oversizedHubPayloadRejected: dogfood.oversizedHubPayloadRejected,
    missingShipPreflightRejected: dogfood.missingShipPreflightRejected,
    missingClickUpSlowBudgetRejected: dogfood.missingClickUpSlowBudgetRejected,
  }))
  addCheck(
    checks,
    (verifierSource.includes('evaluateFoundationRuntimeReliabilityVerifier({') ||
      verifierSource.includes('evaluateFoundationRuntimeReliabilityVerifierOrchestration({')) &&
      (verifierSource.includes('runtimeReliabilityVerifier.checks') ||
        verifierSource.includes('runtimeReliabilityOrchestrationVerifier.checks')),
    'foundation verifier delegates runtime reliability checks to focused module',
    'evaluateFoundationRuntimeReliabilityVerifier or evaluateFoundationRuntimeReliabilityVerifierOrchestration',
  )
  addCheck(checks, !verifierSource.includes('SOURCE-OUTAGE-BOUNDARY-001 keeps Foundation/Ops ' + 'serving during ClickUp read outages'), 'foundation verifier no longer owns old inline runtime reliability labels', 'old source outage label absent from root verifier')
  addCheck(checks, verifierLines < VERIFIER_RUNTIME_RELIABILITY_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_RUNTIME_RELIABILITY_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  addCheck(checks, packageJson.scripts?.['process:verifier-runtime-reliability-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_RUNTIME_RELIABILITY_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-runtime-reliability-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_RUNTIME_RELIABILITY_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_RUNTIME_RELIABILITY_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Substring-only proof is rejected') && planSource.includes('dogfood proof recreates the old failure modes'), 'plan rejects substring-only proof and requires dogfood', VERIFIER_RUNTIME_RELIABILITY_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_RUNTIME_RELIABILITY_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_RUNTIME_RELIABILITY_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_RUNTIME_RELIABILITY_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier runtime reliability split proof')
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
