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
  VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_APPROVAL_PATH,
  VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_BEFORE_LINES,
  VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID,
  VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_HANDOFF_PATH,
  VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_PLAN_PATH,
  VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_SCRIPT_PATH,
  buildFoundationProcessHardeningVerifierDogfoodProof,
} from '../lib/foundation-process-hardening-verifier.js'

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
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
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

async function main() {
  const args = parseArgs()
  const jsonOnly = args.json === true || args.json === 'true'
  const checks = []

  const [
    moduleSource,
    verifierSource,
    runnerSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-process-hardening-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-process-hardening-runner.js'),
    readRepoFile(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_SCRIPT_PATH),
    readRepoFile(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID])
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationProcessHardeningVerifierDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const activeSprintOwnsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID)
  const oldRootPatterns = [
    'for (const processHardeningCheck of processHardeningVerifierChecks)',
    'const processHardeningDogfood = buildFoundationProcessHardeningVerifierDogfoodProof()',
    'const verifierProcessHardeningSplitModuleCard =',
    'const processHardeningVerifierChecks = await evaluateFoundationProcessHardeningVerifierChecks({',
  ]
  const rootDelegatesProcessHardening =
    verifierSource.includes('evaluateFoundationProcessHardeningVerifierOrchestration({') ||
    (
      verifierSource.includes('runFoundationVerifyProcessHardeningVerifier({') &&
      runnerSource.includes('evaluateFoundationProcessHardeningVerifierOrchestration({')
    )

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'Process-hardening orchestration split has active or historical ownership without replacing the active overlay', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || 'missing')
  addCheck(checks, hasPlanCriticPass || historicalCloseoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationProcessHardeningVerifierOrchestration') && moduleSource.includes('evaluateFoundationProcessHardeningVerifierChecks') && moduleSource.includes('buildFoundationProcessHardeningVerifierDogfoodProof'), 'module owns process-hardening orchestration, evaluator, and dogfood', 'lib/foundation-process-hardening-verifier.js')
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.verifierCanRepair.ok === false &&
      dogfood.rejected.scheduledMutation.ok === false &&
      dogfood.rejected.seedWritesByDefault.ok === false &&
      dogfood.rejected.backlogLostUpdate.ok === false,
    'dogfood rejects process-hardening proof failures',
    dogfood.dogfoodInvariant,
  )
  addCheck(checks, rootDelegatesProcessHardening && verifierSource.includes('processHardeningOrchestrationVerifier.checks'), 'foundation verifier delegates process-hardening orchestration to focused module', 'evaluateFoundationProcessHardeningVerifierOrchestration')
  addCheck(
    checks,
    oldRootPatterns.every(pattern => !verifierSource.includes(pattern)),
    'old inline process-hardening orchestration block is removed from root',
    'process-hardening direct evaluator call, check loop, dogfood, and split self-check no longer appear inline',
  )
  addCheck(checks, verifierLines < VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, packageJson.scripts?.['process:verifier-process-hardening-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-process-hardening-orchestration-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction'), 'plan requires dogfood, rejects arbitrary extraction, and preserves active overlay', VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_PLAN_PATH)
  addCheck(
    checks,
    moduleSource.includes('VERIFY-READONLY-GATE-001') &&
      moduleSource.includes('PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001') &&
      moduleSource.includes('DB-SEED-001') &&
      moduleSource.includes('BACKLOG-STORE-CONCURRENCY-001'),
    'module owns the intended process-hardening orchestration domain',
    'read-only gate, scheduled mutation guard, DB seed, and backlog concurrency',
  )

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier process-hardening orchestration split proof')
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
