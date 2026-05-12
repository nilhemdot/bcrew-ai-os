#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildPlanCriticResultSummary,
  buildSyntheticPlanCriticProof,
  evaluatePlanCriticPlan,
  PLAN_CRITIC_DECISION_TREE_PATH,
  PLAN_CRITIC_MIN_PASS_SCORE,
  PLAN_CRITIC_REPLACEMENT_APPROVAL_PATH,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
  PLAN_CRITIC_REPLACEMENT_PLAN_PATH,
  PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH,
  PLAN_CRITIC_SCORING_SCHEMA,
  PLAN_CRITIC_SUMMARY_MARKER,
} from '../lib/process-plan-critic.js'
import {
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
  AVATAR_IMPORT_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  VERIFY_GATE_TIERING_CARD_ID,
  REBUILD_PLAN_RECONCILE_CARD_ID,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)

const REQUIRED_SPRINT_ORDER = [
  VERIFY_GATE_TIERING_CARD_ID,
  REBUILD_PLAN_RECONCILE_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  AVATAR_IMPORT_CARD_ID,
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
]
const CONNECTOR_TRUTH_SPRINT_ORDER = [
  'ATOM-PROMOTION-DIAGNOSE-001',
  'SPRINT-DB-RECONCILE-001',
  'VERIFY-GATE-TIERING-FIX-001',
  'PLAN-CRITIC-LOG-001',
  'SOURCE-CONNECTOR-MATRIX-001',
  'SOURCE-HUB-ROUTING-MATRIX-001',
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
  const planPath = String(args.plan || PLAN_CRITIC_REPLACEMENT_PLAN_PATH)

  const [
    planText,
    decisionTreeText,
    libraryText,
    scriptText,
    currentPlanText,
    currentStateText,
    currentSprintText,
    buildLogText,
    packageText,
  ] = await Promise.all([
    readRepoFile(planPath),
    readRepoFile(PLAN_CRITIC_DECISION_TREE_PATH),
    readRepoFile('lib/process-plan-critic.js'),
    readRepoFile(PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('package.json'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot: process.cwd(),
    approvalRef: PLAN_CRITIC_REPLACEMENT_APPROVAL_PATH,
    cardId: PLAN_CRITIC_REPLACEMENT_CARD_ID,
  })
  const packageJson = JSON.parse(packageText)
  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    STRATEGY_HUB_MEETING_READY_CARD_ID,
    AVATAR_IMPORT_CARD_ID,
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintOrder = (sprint.items || []).map(item => item.cardId)
  const sprintStageMap = new Map((sprint.items || []).map(item => [item.cardId, item.stage]))
  const criticCard = cardMap.get(PLAN_CRITIC_REPLACEMENT_CARD_ID)
  const securityCard = cardMap.get(SECURITY_BEHAVIOR_PROOF_CARD_ID)
  const securityClosed = securityCard?.lane === 'done' && sprintStageMap.get(SECURITY_BEHAVIOR_PROOF_CARD_ID) === 'done_this_sprint'
  const securityClosedHistorically = securityCard?.lane === 'done'
  const verifierClosed = cardMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID)?.lane === 'done' &&
    sprintStageMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID) === 'done_this_sprint'
  const connectorTruthSprintActive = sprint.sprint?.sprintId === 'connector-routing-truth-2026-05-12'
  const selfReview = evaluatePlanCriticPlan({
    planText,
    card: criticCard || { id: PLAN_CRITIC_REPLACEMENT_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/process-plan-critic.js',
      PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH,
      PLAN_CRITIC_REPLACEMENT_PLAN_PATH,
      PLAN_CRITIC_DECISION_TREE_PATH,
      'lib/foundation-current-sprint.js',
      'scripts/foundation-verify.mjs',
    ],
  })
  const synthetic = buildSyntheticPlanCriticProof()

  addFinding(findings, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, packageJson.scripts?.['process:plan-critic-check'] === `node --env-file-if-exists=.env ${PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, Math.abs(PLAN_CRITIC_SCORING_SCHEMA.reduce((sum, item) => sum + item.maxScore, 0) - 10) < 0.001, 'Plan Critic scoring schema totals 10')
  addFinding(findings, selfReview.status === 'pass' && selfReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic dogfoods its own approved plan', buildPlanCriticResultSummary(selfReview))
  addFinding(findings, synthetic.ok, 'synthetic strong/weak/broad plan proof passes', synthetic.ok ? '' : JSON.stringify(synthetic, null, 2).slice(0, 1000))
  addFinding(findings, criticCard?.lane === 'done' && String(criticCard?.statusNote || '').includes(PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY), 'PLAN-CRITIC-REPLACEMENT-001 is done with closeout proof', criticCard?.lane || 'missing')
  addFinding(
    findings,
    securityCard?.lane === 'scoped' || securityClosed || securityClosedHistorically || connectorTruthSprintActive,
    'SECURITY-BEHAVIOR-PROOF-001 remains next or done this sprint',
    `${securityCard?.lane || 'missing'} / ${sprintStageMap.get(SECURITY_BEHAVIOR_PROOF_CARD_ID) || 'missing'}`,
  )
  addFinding(
    findings,
    REQUIRED_SPRINT_ORDER.every((id, index) => sprintOrder[index] === id) ||
      CONNECTOR_TRUTH_SPRINT_ORDER.every((id, index) => sprintOrder[index] === id),
    'Current Sprint order remains valid for the active sprint generation',
    sprintOrder.join(' -> '),
  )
  addFinding(
    findings,
    sprint.sprint?.activeBlockerCardId === SECURITY_BEHAVIOR_PROOF_CARD_ID ||
      (securityClosed && sprint.sprint?.activeBlockerCardId === VERIFIER_BEHAVIOR_SWEEP_CARD_ID) ||
      (securityClosed && verifierClosed && [STRATEGY_HUB_MEETING_READY_CARD_ID, AVATAR_IMPORT_CARD_ID, AUTO_DEPLOY_ROLLBACK_CARD_ID].includes(sprint.sprint?.activeBlockerCardId)) ||
      (connectorTruthSprintActive && CONNECTOR_TRUTH_SPRINT_ORDER.includes(sprint.sprint?.activeBlockerCardId)),
    'Current Sprint active blocker advanced through security behavior proof',
    sprint.sprint?.activeBlockerCardId || 'missing',
  )
  addFinding(
    findings,
    sprintStageMap.get(PLAN_CRITIC_REPLACEMENT_CARD_ID) === 'done_this_sprint' || criticCard?.lane === 'done',
    'Plan Critic moved to Done This Sprint or remains closed historically',
    sprintStageMap.get(PLAN_CRITIC_REPLACEMENT_CARD_ID) || criticCard?.lane || 'missing',
  )
  addFinding(findings, includesAll(decisionTreeText, [
    'docs-only',
    'static',
    'focused',
    'full',
    'auth',
    'schema',
    'package',
    'canonical verifier',
    'process:foundation-ship',
  ]), 'decision tree records fast/default and full-risk cases')
  addFinding(findings, includesAll(libraryText, [
    'PLAN_CRITIC_SCORING_SCHEMA',
    'behavior_not_substring',
    'rejectsSubstringProof',
    'classifyFoundationGateDecision',
    'buildSyntheticPlanCriticProof',
  ]), 'Plan Critic library owns scoring schema and behavior-not-substring proof')
  addFinding(findings, includesAll(scriptText, [
    'PLAN_CRITIC_SUMMARY_MARKER',
    'synthetic strong/weak/broad plan proof passes',
    'Current Sprint active blocker advanced to security behavior proof',
  ]), 'Plan Critic proof script checks dogfood and sprint advancement')
  addFinding(findings, includesAll(currentSprintText, [
    PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
    'SECURITY_BEHAVIOR_PROOF_CARD_ID',
    'process:plan-critic-check',
  ]), 'Current Sprint seed records Plan Critic closeout and next blocker')
  addFinding(findings, includesAll(buildLogText, [
    PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
    'behavior-not-substring',
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(currentPlanText, [
    PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
    'done this sprint',
    'gate decision tree',
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
  ]), 'current plan records Plan Critic closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
    'Plan Critic',
    'SECURITY-BEHAVIOR-PROOF-001',
  ]), 'current state records Plan Critic closeout and security handoff')

  await Promise.all([
    runNodeCheck('lib/process-plan-critic.js'),
    runNodeCheck(PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH),
    runNodeCheck('lib/foundation-current-sprint.js'),
    runNodeCheck('lib/foundation-build-log.js'),
  ])
  await runBacklogHygiene()

  const summary = {
    status: findings.length ? 'blocked' : 'healthy',
    cardId: PLAN_CRITIC_REPLACEMENT_CARD_ID,
    closeoutKey: PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
    score: selfReview.score,
    passThreshold: PLAN_CRITIC_MIN_PASS_SCORE,
    planStatus: selfReview.status,
    gateDecision: selfReview.gateDecision,
    activeBlockerCardId: sprint.sprint?.activeBlockerCardId || null,
    sprintStage: sprintStageMap.get(PLAN_CRITIC_REPLACEMENT_CARD_ID) || null,
    findings,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Plan Critic replacement proof')
    console.log(`  Card: ${PLAN_CRITIC_REPLACEMENT_CARD_ID}`)
    console.log(`  Closeout: ${PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY}`)
    console.log(`  Status: ${summary.status}`)
    console.log(`  Score: ${summary.score}/10`)
    console.log(`  Active blocker: ${summary.activeBlockerCardId || 'missing'}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    console.log(`${PLAN_CRITIC_SUMMARY_MARKER} ${JSON.stringify(summary)}`)
  }
  if (summary.status !== 'healthy') process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
  await closeFoundationDb().catch(() => {})
})
