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
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_APPROVAL_PATH,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_BEFORE_LINES,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CARD_ID,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CLOSEOUT_KEY,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_HANDOFF_PATH,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_PLAN_PATH,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierProcessControlGovernanceDogfoodProof,
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
  return !/updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM|fs\.writeFile|writeFile\s*\(/i.test(source)
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
    readRepoFile('lib/foundation-verifier-process-control-governance.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_SCRIPT_PATH),
    readRepoFile(VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CARD_ID])
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationVerifierProcessControlGovernanceDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const activeSprintOwnsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CARD_ID)
  const oldConnectorRoutingMarker = 'CONNECTOR_ROUTING_TRUTH_CARD_IDS' + '.every'
  const oldProcessGovernanceMarker = 'const process' + 'GovernanceVerifier = await'
  const oldReadinessFollowupMarker = 'const readiness' + 'FollowupVerifier = await'
  const oldGuardrailCloseoutMarker = 'const guardrail' + 'CloseoutsVerifier = await'
  const oldControlLoopMarker = 'const control' + 'LoopVerifier = evaluateFoundationVerifierControlLoop'

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'Process/control governance split has active or historical ownership without replacing the active overlay', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || 'missing')
  addCheck(checks, hasPlanCriticPass || historicalCloseoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationVerifierProcessControlGovernance') && moduleSource.includes('buildFoundationVerifierProcessControlGovernanceDogfoodProof'), 'new module owns process/control governance evaluator and dogfood', 'lib/foundation-verifier-process-control-governance.js')
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.hiddenConnectorRoutingTruth.ok === false &&
      dogfood.rejected.hiddenProcessGovernance.ok === false &&
      dogfood.rejected.hiddenReadinessFollowup.ok === false &&
      dogfood.rejected.hiddenGuardrailCloseout.ok === false &&
      dogfood.rejected.hiddenControlLoop.ok === false &&
      dogfood.rejected.oldInlinePredicate.ok === false,
    'dogfood rejects process/control governance failures',
    dogfood.dogfoodInvariant,
  )
  const directOrWrapperDelegation = verifierSource.includes('evaluateFoundationVerifierProcessControlGovernance({') ||
    verifierSource.includes('evaluateFoundationVerifierProcessControlGovernanceOrchestration({')
  addCheck(checks, directOrWrapperDelegation && verifierSource.includes('processControlGovernanceVerifier.checks'), 'foundation verifier delegates process/control governance checks to focused module', directOrWrapperDelegation ? 'historical process/control split proof accepts wrapper delegation' : 'missing process/control evaluator delegation')
  addCheck(
    checks,
    !verifierSource.includes(oldConnectorRoutingMarker) &&
      !verifierSource.includes(oldProcessGovernanceMarker) &&
      !verifierSource.includes(oldReadinessFollowupMarker) &&
      !verifierSource.includes(oldGuardrailCloseoutMarker) &&
      !verifierSource.includes(oldControlLoopMarker),
    'old inline process/control governance blocks are removed from root',
    'connector routing truth, process governance, readiness follow-up, guardrail closeout, and control-loop predicates no longer appear inline',
  )
  addCheck(checks, verifierLines < VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, packageJson.scripts?.['process:verifier-process-control-governance-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-process-control-governance-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction'), 'plan requires dogfood, rejects arbitrary extraction, and preserves active overlay', VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_PLAN_PATH)
  addCheck(checks, moduleSource.includes('CONNECTOR_ROUTING_TRUTH_CARD_IDS') && moduleSource.includes('evaluateFoundationVerifierProcessGovernance') && moduleSource.includes('evaluateFoundationVerifierReadinessFollowup') && moduleSource.includes('evaluateFoundationVerifierGuardrailCloseouts') && moduleSource.includes('evaluateFoundationVerifierControlLoop'), 'module owns the intended process/control governance domain', 'connector routing truth / process governance / readiness follow-up / guardrail closeout / control loop')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier process/control governance split proof')
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
