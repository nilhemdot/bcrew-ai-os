#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  AVATAR_IMPORT_CARD_ID,
  REBUILD_PLAN_RECONCILE_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  VERIFY_GATE_TIERING_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
} from '../lib/foundation-db.js'
import {
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
  PLAN_CRITIC_MIN_PASS_SCORE,
} from '../lib/process-plan-critic.js'
import {
  VERIFIER_BEHAVIOR_SWEEP_APPROVAL_PATH,
  VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
  VERIFIER_BEHAVIOR_SWEEP_MIN_TARGETS,
  VERIFIER_BEHAVIOR_SWEEP_PLAN_PATH,
  VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH,
  VERIFIER_BEHAVIOR_SWEEP_SUMMARY_MARKER,
  buildSyntheticVerifierBehaviorSweepProof,
} from '../lib/verifier-behavior-sweep.js'

const execFile = promisify(execFileCallback)
const STRATEGY_HUB_MEETING_READY_CARD_ID = 'STRATEGY-HUB-MEETING-READY-001'

const REQUIRED_SPRINT_ORDER = [
  VERIFY_GATE_TIERING_CARD_ID,
  REBUILD_PLAN_RECONCILE_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  AVATAR_IMPORT_CARD_ID,
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...value] = arg.slice(2).split('=')
    args[key] = value.length ? value.join('=') : 'true'
  }
  return args
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(process.cwd(), relativePath), 'utf8')
}

function includesAll(text, values = []) {
  return values.every(value => text.includes(value))
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

async function runNodeCheck(filePath) {
  await execFile('node', ['--check', filePath], {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 1024 * 1024,
  })
}

async function runBacklogHygiene() {
  await execFile('npm', ['run', 'backlog:hygiene', '--', '--json'], {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 1024 * 1024 * 8,
  })
}

async function main() {
  const args = parseArgs()
  const jsonOnly = args.json === true || args.json === 'true'
  const findings = []

  const [
    planText,
    proofLibraryText,
    proofScriptText,
    currentSprintText,
    currentPlanText,
    currentStateText,
    buildLogText,
    packageText,
    foundationVerifyText,
  ] = await Promise.all([
    readRepoFile(VERIFIER_BEHAVIOR_SWEEP_PLAN_PATH),
    readRepoFile('lib/verifier-behavior-sweep.js'),
    readRepoFile(VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('package.json'),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])

  const packageJson = JSON.parse(packageText)
  const approval = await validatePlanApprovalFile({
    repoRoot: process.cwd(),
    approvalRef: VERIFIER_BEHAVIOR_SWEEP_APPROVAL_PATH,
    cardId: VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  })
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: VERIFIER_BEHAVIOR_SWEEP_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/verifier-behavior-sweep.js',
      VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH,
      'lib/foundation-current-sprint.js',
      'lib/foundation-db.js',
      'lib/foundation-build-log.js',
      'scripts/foundation-verify.mjs',
      'package.json',
    ],
    declaredRisk: planText,
  })
  const behaviorProof = buildSyntheticVerifierBehaviorSweepProof()

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    STRATEGY_HUB_MEETING_READY_CARD_ID,
    AVATAR_IMPORT_CARD_ID,
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const verifierCard = cardMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID)
  const strategyCard = cardMap.get(STRATEGY_HUB_MEETING_READY_CARD_ID)
  const sprintItems = sprint.items || []
  const sprintOrder = sprintItems.map(item => item.cardId)
  const sprintStageMap = new Map(sprintItems.map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the verifier behavior sweep plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, behaviorProof.ok, 'top P0 verifier behavior sweep passes', JSON.stringify(behaviorProof.summary))
  addFinding(findings, behaviorProof.summary.targetCount >= VERIFIER_BEHAVIOR_SWEEP_MIN_TARGETS, 'behavior target registry covers at least 10 P0 closeouts', String(behaviorProof.summary.targetCount))
  addFinding(findings, behaviorProof.summary.behaviorCoveredTargetCount === behaviorProof.summary.targetCount, 'every target has behavior proof coverage', JSON.stringify(behaviorProof.summary))
  addFinding(findings, behaviorProof.summary.substringOnlyTargetCount === 0, 'substring-only verifier proof is rejected for all sweep targets', JSON.stringify(behaviorProof.substringOnlyTargets.map(item => item.cardId)))
  addFinding(findings, behaviorProof.targets.some(item => item.cardId === 'SYNTHESIS-VERIFY-001' && item.ok && item.proof?.unverifiedRejected), 'synthesis target rejects unverified decision-grade records')
  addFinding(findings, behaviorProof.targets.some(item => item.cardId === 'SYSTEM-010-GHOST-CLOSEOUT-001' && item.ok && item.proof?.unsafeStop?.failClosed), 'runtime target fails closed on unsafe stop/decommission cases')
  addFinding(findings, behaviorProof.targets.some(item => item.cardId === 'FOUNDATION-DONE-TEST-001' && item.ok && item.proof?.missingCloseout?.blockingCards?.includes('SYNTHESIS-VERIFY-001')), 'Foundation readiness target has a failing missing-closeout variant')
  addFinding(findings, packageJson.scripts?.['process:verifier-behavior-sweep-check'] === `node --env-file-if-exists=.env ${VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, verifierCard?.lane === 'done' && String(verifierCard?.statusNote || '').includes(VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY), 'VERIFIER-BEHAVIOR-SWEEP-001 is done with closeout proof', verifierCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(strategyCard?.lane), 'STRATEGY-HUB-MEETING-READY-001 remains scoped or done after verifier sweep', strategyCard?.lane || 'missing')
  addFinding(findings, REQUIRED_SPRINT_ORDER.every((id, index) => sprintOrder[index] === id), 'Current Sprint order remains audit reset order', sprintOrder.join(' -> '))
  addFinding(findings, [STRATEGY_HUB_MEETING_READY_CARD_ID, AVATAR_IMPORT_CARD_ID].includes(activeBlockerCardId), 'Current Sprint active blocker advanced through Strategy Hub meeting-ready', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID) === 'done_this_sprint', 'Verifier behavior sweep moved to Done This Sprint', sprintStageMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID) || 'missing')
  addFinding(findings, includesAll(proofLibraryText, [
    'VERIFIER_BEHAVIOR_TARGETS',
    'buildSyntheticVerifierBehaviorSweepProof',
    'verifySynthesizedRecord',
    'buildStopDecision',
    'buildFoundationReadinessStatus',
    'buildSourceLifecycleCompletionStatus',
    'substringOnlyProofRejected',
  ]), 'verifier behavior sweep library owns behavior registry and direct proof paths')
  addFinding(findings, includesAll(proofScriptText, [
    VERIFIER_BEHAVIOR_SWEEP_SUMMARY_MARKER,
    'top P0 verifier behavior sweep passes',
    'Current Sprint active blocker advanced through Strategy Hub meeting-ready',
  ]), 'focused proof script checks behavior and sprint advancement')
  addFinding(findings, includesAll(currentSprintText, [
    VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
    'STRATEGY_HUB_MEETING_READY_CARD_ID',
    'process:verifier-behavior-sweep-check',
  ]), 'Current Sprint seed records verifier closeout and next blocker')
  addFinding(findings, includesAll(buildLogText, [
    VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    STRATEGY_HUB_MEETING_READY_CARD_ID,
    'top-P0 behavior registry',
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(currentPlanText, [
    VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    'top-P0 behavior registry',
    STRATEGY_HUB_MEETING_READY_CARD_ID,
  ]), 'current plan records verifier behavior closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
    'Current sprint active blocker',
    'process proof over product behavior',
    'behavior registry',
  ]), 'current state records verifier behavior closeout and active blocker')
  addFinding(findings, includesAll(foundationVerifyText, [
    'buildSyntheticVerifierBehaviorSweepProof',
    'VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY',
    'top P0 verifier checks now require behavior proof coverage',
  ]), 'canonical verifier includes sweep behavior coverage')

  await Promise.all([
    runNodeCheck('lib/verifier-behavior-sweep.js'),
    runNodeCheck(VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH),
    runNodeCheck('lib/foundation-current-sprint.js'),
    runNodeCheck('lib/foundation-build-log.js'),
  ])
  await runBacklogHygiene()

  const summary = {
    status: findings.length ? 'blocked' : 'healthy',
    cardId: VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    closeoutKey: VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    behaviorProof: behaviorProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID) || null,
    findings,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier behavior sweep')
    console.log(`  Card: ${VERIFIER_BEHAVIOR_SWEEP_CARD_ID}`)
    console.log(`  Closeout: ${VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY}`)
    console.log(`  Status: ${summary.status}`)
    console.log(`  Active blocker: ${summary.activeBlockerCardId || 'missing'}`)
    console.log(`  Targets: ${behaviorProof.summary.behaviorCoveredTargetCount}/${behaviorProof.summary.targetCount}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    console.log(`${VERIFIER_BEHAVIOR_SWEEP_SUMMARY_MARKER} ${JSON.stringify(summary)}`)
  }
  if (summary.status !== 'healthy') process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {
    // Ignore close failures while reporting the original error.
  }
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
