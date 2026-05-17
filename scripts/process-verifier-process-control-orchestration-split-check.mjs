#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_APPROVAL_PATH,
  VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_BEFORE_LINES,
  VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID,
  VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_HANDOFF_PATH,
  VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_PLAN_PATH,
  VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierProcessControlGovernanceDogfoodProof,
  buildFoundationVerifierProcessControlOrchestrationDogfoodProof,
} from '../lib/foundation-verifier-process-control-governance.js'

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
    approvalValidation,
    cards,
    activeSprint,
    planCriticRuns,
    moduleSource,
    verifierSource,
    proofScriptSource,
    historicalProofScriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_APPROVAL_PATH,
      cardId: VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID]),
    readRepoFile('lib/foundation-verifier-process-control-governance.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_SCRIPT_PATH),
    readRepoFile('scripts/process-verifier-process-control-governance-split-check.mjs'),
    readRepoFile(VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts()
    .find(record => record.key === VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const processControlDogfood = buildFoundationVerifierProcessControlGovernanceDogfoodProof()
  const orchestrationDogfood = buildFoundationVerifierProcessControlOrchestrationDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const closeoutOwnsCard = closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID)
  const requiredBundles = [
    'processGovernanceBundle',
    'readinessFollowupBundle',
    'guardrailCloseoutBundle',
    'controlLoopBundle',
    'processControlSharedBundle',
  ]
  const wrapperDelegation = verifierSource.includes('evaluateFoundationVerifierProcessControlGovernanceOrchestration({') &&
    verifierSource.includes('processControlGovernanceVerifier.checks')

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has Process Control orchestration split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approvalValidation.ok === true && approvalValidation.mode === 'v2' && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.ok ? `${approvalValidation.mode} / ${approvalValidation.approval?.score}` : approvalValidation.failures?.map(item => item.detail).join('; '))
  addCheck(checks, hasPlanCriticPass || closeoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId !== 'verifier-process-control-orchestration-split-2026-05-17' || card?.lane === 'done',
    'active sprint overlay was not replaced for this historical split',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    processControlDogfood.ok === true &&
      processControlDogfood.rejected.hiddenConnectorRoutingTruth.ok === false &&
      processControlDogfood.rejected.hiddenProcessGovernance.ok === false &&
      processControlDogfood.rejected.hiddenReadinessFollowup.ok === false &&
      processControlDogfood.rejected.hiddenGuardrailCloseout.ok === false &&
      processControlDogfood.rejected.hiddenControlLoop.ok === false &&
      processControlDogfood.rejected.oldInlinePredicate.ok === false,
    'Process Control governance dogfood rejects real failure classes',
    processControlDogfood.dogfoodInvariant,
  )
  addCheck(
    checks,
    orchestrationDogfood.ok === true &&
      orchestrationDogfood.rejected.missingWrapper.ok === false &&
      orchestrationDogfood.rejected.missingBundleInput.ok === false &&
      orchestrationDogfood.rejected.oldDirectRootCall.ok === false &&
      orchestrationDogfood.rejected.missingCloseout.ok === false &&
      orchestrationDogfood.rejected.missingProofRegistration.ok === false &&
      orchestrationDogfood.rejected.noLineDrop.ok === false,
    'orchestration dogfood rejects bundle migration failures',
    orchestrationDogfood.dogfoodInvariant,
  )
  addCheck(checks, moduleSource.includes('evaluateFoundationVerifierProcessControlGovernanceOrchestration') && moduleSource.includes('flattenProcessControlBundles'), 'module owns bundled Process Control orchestration wrapper', 'lib/foundation-verifier-process-control-governance.js')
  addCheck(checks, wrapperDelegation && !verifierSource.includes('evaluateFoundationVerifierProcessControlGovernance({'), 'root delegates Process Control through the orchestration wrapper', wrapperDelegation ? 'wrapper delegation present and old direct evaluator absent' : 'missing wrapper delegation')
  addCheck(checks, requiredBundles.every(key => verifierSource.includes(`${key}:`)), 'root passes Process Control domain bundles instead of flat inputs', requiredBundles.join(', '))
  addCheck(checks, verifierLines < VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_BEFORE_LINES, 'root verifier line count decreased', `${VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_BEFORE_LINES}->${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutation statements, or fs write calls')
  addCheck(
    checks,
    packageJson.scripts?.['process:verifier-process-control-orchestration-split-check'] ===
      `node --env-file-if-exists=.env ${VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-process-control-orchestration-split-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_HANDOFF_PATH),
    'plan, approval, and handoff files exist',
    `${VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_PLAN_PATH} / ${VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_APPROVAL_PATH} / ${VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_HANDOFF_PATH}`,
  )
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction') && planSource.includes('bundled domain inputs'), 'plan records dogfood, no-overlay, and bundled-domain acceptance', VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_PLAN_PATH)
  addCheck(checks, historicalProofScriptSource.includes('historical process/control split proof accepts wrapper delegation') && historicalProofScriptSource.includes('evaluateFoundationVerifierProcessControlGovernanceOrchestration({'), 'historical Process Control module proof accepts wrapper delegation', 'scripts/process-verifier-process-control-governance-split-check.mjs')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier Process Control orchestration split proof')
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
