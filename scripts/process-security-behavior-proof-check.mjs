#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  AVATAR_IMPORT_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  REBUILD_PLAN_RECONCILE_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  VERIFY_GATE_TIERING_CARD_ID,
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
  buildSyntheticSecurityBehaviorProof,
  SECURITY_BEHAVIOR_PROOF_APPROVAL_PATH,
  SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
  SECURITY_BEHAVIOR_PROOF_PLAN_PATH,
  SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH,
  SECURITY_BEHAVIOR_PROOF_SUMMARY_MARKER,
} from '../lib/security-behavior-proof.js'

const execFile = promisify(execFileCallback)

const REQUIRED_SPRINT_ORDER = [
  VERIFY_GATE_TIERING_CARD_ID,
  REBUILD_PLAN_RECONCILE_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  'STRATEGY-HUB-MEETING-READY-001',
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
  ] = await Promise.all([
    readRepoFile(SECURITY_BEHAVIOR_PROOF_PLAN_PATH),
    readRepoFile('lib/security-behavior-proof.js'),
    readRepoFile(SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('package.json'),
  ])

  const packageJson = JSON.parse(packageText)
  const approval = await validatePlanApprovalFile({
    repoRoot: process.cwd(),
    approvalRef: SECURITY_BEHAVIOR_PROOF_APPROVAL_PATH,
    cardId: SECURITY_BEHAVIOR_PROOF_CARD_ID,
  })
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: SECURITY_BEHAVIOR_PROOF_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/security-behavior-proof.js',
      SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH,
      'lib/foundation-current-sprint.js',
      'lib/foundation-db.js',
      'lib/foundation-build-log.js',
      'scripts/foundation-verify.mjs',
      'package.json',
    ],
    declaredRisk: planText,
  })
  const behaviorProof = buildSyntheticSecurityBehaviorProof()

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    'SECURITY-002',
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    'STRATEGY-HUB-MEETING-READY-001',
    AVATAR_IMPORT_CARD_ID,
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const securityCard = cardMap.get(SECURITY_BEHAVIOR_PROOF_CARD_ID)
  const security002 = cardMap.get('SECURITY-002')
  const sprintItems = sprint.items || []
  const sprintOrder = sprintItems.map(item => item.cardId)
  const sprintStageMap = new Map(sprintItems.map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the security behavior plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, behaviorProof.ok, 'route and subject-person behavior matrix passes', JSON.stringify({ failedRouteCases: behaviorProof.failedRouteCases, failedSubjectChecks: behaviorProof.failedSubjectChecks }).slice(0, 1000))
  addFinding(findings, behaviorProof.summary.coveredActors.includes('tannerSubject') && behaviorProof.subjectPerson.tannerVisibleIds.includes('team-open-operating-note'), 'Tanner subject-person matrix includes visible safe content')
  addFinding(findings, !behaviorProof.subjectPerson.tannerVisibleIds.includes('tanner-tier1-comp') && !behaviorProof.subjectPerson.tannerVisibleIds.includes('tanner-performance-concern'), 'Tanner subject-person matrix suppresses Tier 1 and sensitive self content', behaviorProof.subjectPerson.tannerVisibleIds.join(','))
  addFinding(findings, behaviorProof.routeCases.some(item => item.id === 'shared-comms-archive-stays-owner-only-for-ops' && item.ok), 'shared-comms route remains Tier 1-only for ops')
  addFinding(findings, behaviorProof.routeCases.some(item => item.id === 'strategy-v2-stays-owner-only-for-sales' && item.ok), 'Strategy route remains Tier 1-only for sales')
  addFinding(findings, behaviorProof.routeCases.some(item => item.id === 'sales-cannot-read-unregistered-protected-route' && item.ok), 'unregistered protected route fails closed by default')
  addFinding(findings, packageJson.scripts?.['process:security-behavior-proof-check'] === `node --env-file-if-exists=.env ${SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, security002?.lane === 'done' && String(security002?.statusNote || '').includes('security-002-auth-tier-redaction-v1'), 'SECURITY-002 remains closed as v1 base layer', security002?.lane || 'missing')
  addFinding(findings, securityCard?.lane === 'done' && String(securityCard?.statusNote || '').includes(SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY), 'SECURITY-BEHAVIOR-PROOF-001 is done with closeout proof', securityCard?.lane || 'missing')
  addFinding(findings, cardMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID)?.lane === 'scoped', 'VERIFIER-BEHAVIOR-SWEEP-001 remains scoped as next card', cardMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID)?.lane || 'missing')
  addFinding(findings, REQUIRED_SPRINT_ORDER.every((id, index) => sprintOrder[index] === id), 'Current Sprint order remains audit reset order', sprintOrder.join(' -> '))
  addFinding(findings, activeBlockerCardId === VERIFIER_BEHAVIOR_SWEEP_CARD_ID, 'Current Sprint active blocker advanced to verifier behavior sweep', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(SECURITY_BEHAVIOR_PROOF_CARD_ID) === 'done_this_sprint', 'Security behavior proof moved to Done This Sprint', sprintStageMap.get(SECURITY_BEHAVIOR_PROOF_CARD_ID) || 'missing')
  addFinding(findings, includesAll(proofLibraryText, [
    'buildSyntheticSecurityBehaviorProof',
    'buildSubjectPersonLeakProof',
    'SECURITY_BEHAVIOR_ROUTE_CASES',
    'tanner.marsh@bensoncrew.ca',
    'authorizeRouteAccess',
    'buildRedactedCollectionResponse',
  ]), 'security behavior proof library owns behavior matrix')
  addFinding(findings, includesAll(proofScriptText, [
    SECURITY_BEHAVIOR_PROOF_SUMMARY_MARKER,
    'route and subject-person behavior matrix passes',
    'Current Sprint active blocker advanced to verifier behavior sweep',
  ]), 'focused proof script checks behavior and sprint advancement')
  addFinding(findings, includesAll(currentSprintText, [
    SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
    'activeBlockerCardId: VERIFIER_BEHAVIOR_SWEEP_CARD_ID',
    'process:security-behavior-proof-check',
  ]), 'Current Sprint seed records security closeout and next blocker')
  addFinding(findings, includesAll(buildLogText, [
    SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    'subject-person',
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(currentPlanText, [
    SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
    'route-boundary',
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  ]), 'current plan records security behavior closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
    'Current sprint active blocker is now `VERIFIER-BEHAVIOR-SWEEP-001`',
    'Tanner',
    'subject-person',
  ]), 'current state records security behavior closeout and active blocker')

  await Promise.all([
    runNodeCheck('lib/security-behavior-proof.js'),
    runNodeCheck(SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH),
    runNodeCheck('lib/foundation-current-sprint.js'),
    runNodeCheck('lib/foundation-build-log.js'),
  ])
  await runBacklogHygiene()

  const summary = {
    status: findings.length ? 'blocked' : 'healthy',
    cardId: SECURITY_BEHAVIOR_PROOF_CARD_ID,
    closeoutKey: SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    behaviorProof: behaviorProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(SECURITY_BEHAVIOR_PROOF_CARD_ID) || null,
    findings,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Security behavior proof')
    console.log(`  Card: ${SECURITY_BEHAVIOR_PROOF_CARD_ID}`)
    console.log(`  Closeout: ${SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY}`)
    console.log(`  Status: ${summary.status}`)
    console.log(`  Active blocker: ${summary.activeBlockerCardId || 'missing'}`)
    console.log(`  Matrix: ${behaviorProof.summary.routeCaseCount} routes, ${behaviorProof.summary.subjectCheckCount} subject checks`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    console.log(`${SECURITY_BEHAVIOR_PROOF_SUMMARY_MARKER} ${JSON.stringify(summary)}`)
  }
  if (summary.status !== 'healthy') process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
  await closeFoundationDb().catch(() => {})
})
