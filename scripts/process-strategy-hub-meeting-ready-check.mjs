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
  STRATEGY_HUB_MEETING_READY_APPROVAL_PATH,
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
  STRATEGY_HUB_MEETING_READY_PLAN_PATH,
  STRATEGY_HUB_MEETING_READY_SCRIPT_PATH,
  STRATEGY_HUB_MEETING_READY_SUMMARY_MARKER,
  buildSyntheticStrategyHubMeetingReadyProof,
} from '../lib/strategy-hub-meeting-ready.js'

const execFile = promisify(execFileCallback)

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
    serverText,
    htmlText,
    uiText,
    stylesText,
    currentSprintText,
    currentPlanText,
    currentStateText,
    buildLogText,
    packageText,
    foundationVerifyText,
  ] = await Promise.all([
    readRepoFile(STRATEGY_HUB_MEETING_READY_PLAN_PATH),
    readRepoFile('lib/strategy-hub-meeting-ready.js'),
    readRepoFile(STRATEGY_HUB_MEETING_READY_SCRIPT_PATH),
    readRepoFile('server.js'),
    readRepoFile('public/strategic-execution.html'),
    readRepoFile('public/strategic-execution.js'),
    readRepoFile('public/styles.css'),
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
    approvalRef: STRATEGY_HUB_MEETING_READY_APPROVAL_PATH,
    cardId: STRATEGY_HUB_MEETING_READY_CARD_ID,
  })
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: STRATEGY_HUB_MEETING_READY_CARD_ID, priority: 'P1' },
    changedFiles: [
      'lib/strategy-hub-meeting-ready.js',
      STRATEGY_HUB_MEETING_READY_SCRIPT_PATH,
      'server.js',
      'public/strategic-execution.js',
      'public/strategic-execution.html',
      'public/styles.css',
      'lib/foundation-current-sprint.js',
      'lib/foundation-db.js',
      'scripts/foundation-verify.mjs',
      'package.json',
    ],
    declaredRisk: planText,
  })
  const behaviorProof = buildSyntheticStrategyHubMeetingReadyProof()

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    STRATEGY_HUB_MEETING_READY_CARD_ID,
    AVATAR_IMPORT_CARD_ID,
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const strategyCard = cardMap.get(STRATEGY_HUB_MEETING_READY_CARD_ID)
  const avatarCard = cardMap.get(AVATAR_IMPORT_CARD_ID)
  const sprintItems = sprint.items || []
  const sprintOrder = sprintItems.map(item => item.cardId)
  const sprintStageMap = new Map(sprintItems.map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Strategy meeting-ready plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, behaviorProof.ok, 'Strategy meeting packet behavior proof passes', JSON.stringify(behaviorProof.summary))
  addFinding(findings, behaviorProof.summary.pressureCardCount >= 4, 'meeting packet has source-backed pressure cards', String(behaviorProof.summary.pressureCardCount))
  addFinding(findings, behaviorProof.summary.agendaItemCount >= 5, 'meeting packet has meeting agenda items', String(behaviorProof.summary.agendaItemCount))
  addFinding(findings, behaviorProof.summary.hiddenOperationalRoutes === 1, 'operational routes stay hidden from meeting packet', String(behaviorProof.summary.hiddenOperationalRoutes))
  addFinding(findings, behaviorProof.summary.variantChanged === true, 'changed source values change packet output')
  addFinding(findings, behaviorProof.summary.substringOnlyProofRejected === true, 'substring-only proof is rejected')
  addFinding(findings, packageJson.scripts?.['process:strategy-hub-meeting-ready-check'] === `node --env-file-if-exists=.env ${STRATEGY_HUB_MEETING_READY_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, strategyCard?.lane === 'done' && String(strategyCard?.statusNote || '').includes(STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY), 'STRATEGY-HUB-MEETING-READY-001 is done with closeout proof', strategyCard?.lane || 'missing')
  addFinding(findings, avatarCard?.lane === 'scoped', 'AVATAR-IMPORT-001 remains scoped as next card', avatarCard?.lane || 'missing')
  addFinding(findings, REQUIRED_SPRINT_ORDER.every((id, index) => sprintOrder[index] === id), 'Current Sprint order remains audit reset order', sprintOrder.join(' -> '))
  addFinding(findings, activeBlockerCardId === AVATAR_IMPORT_CARD_ID, 'Current Sprint active blocker advanced to Avatar import', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(STRATEGY_HUB_MEETING_READY_CARD_ID) === 'done_this_sprint', 'Strategy Hub meeting-ready moved to Done This Sprint', sprintStageMap.get(STRATEGY_HUB_MEETING_READY_CARD_ID) || 'missing')
  addFinding(findings, includesAll(proofLibraryText, [
    'buildStrategyMeetingReadySnapshot',
    'buildSyntheticStrategyHubMeetingReadyProof',
    'isStrategyHubMeetingRoute',
    'changed_values_affect_packet',
    'hiddenOperationalRoutes',
  ]), 'meeting-ready library owns packet transform and behavior proof')
  addFinding(findings, includesAll(proofScriptText, [
    STRATEGY_HUB_MEETING_READY_SUMMARY_MARKER,
    'Strategy meeting packet behavior proof passes',
    'Current Sprint active blocker advanced to Avatar import',
  ]), 'focused proof script checks behavior and sprint advancement')
  addFinding(findings, includesAll(serverText, [
    'buildStrategyMeetingReadySnapshot',
    'meetingReady',
    'buildStrategyHubV2Payload',
  ]), 'Strategy API includes meetingReady packet')
  addFinding(findings, includesAll(htmlText, [
    'data-section="meeting"',
    'Meeting Packet',
  ]), 'Strategy navigation exposes Meeting Packet section')
  addFinding(findings, includesAll(uiText, [
    'renderMeetingReady',
    'renderMeetingPacketPreview',
    'meetingReady',
    'strategy-v2-meeting-agenda',
  ]), 'Strategy UI renders meeting packet behavior')
  addFinding(findings, includesAll(stylesText, [
    'strategy-v2-meeting-grid',
    'strategy-v2-agenda-item',
    'strategy-v2-meeting-proof',
  ]), 'Strategy UI styles meeting packet')
  addFinding(findings, includesAll(currentSprintText, [
    STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
    'activeBlockerCardId: AVATAR_IMPORT_CARD_ID',
    'process:strategy-hub-meeting-ready-check',
  ]), 'Current Sprint seed records Strategy closeout and next blocker')
  addFinding(findings, includesAll(buildLogText, [
    STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
    STRATEGY_HUB_MEETING_READY_CARD_ID,
    AVATAR_IMPORT_CARD_ID,
    'owner-only Strategy meeting packet',
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(currentPlanText, [
    STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
    STRATEGY_HUB_MEETING_READY_CARD_ID,
    'owner-only Strategy meeting packet',
    AVATAR_IMPORT_CARD_ID,
  ]), 'current plan records Strategy closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
    'Current sprint active blocker is now `AVATAR-IMPORT-001`',
    'meeting packet',
  ]), 'current state records Strategy closeout and active blocker')
  addFinding(findings, includesAll(foundationVerifyText, [
    'buildSyntheticStrategyHubMeetingReadyProof',
    'STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY',
    'owner-only Strategy meeting packet',
  ]), 'canonical verifier includes Strategy meeting-ready behavior coverage')

  await Promise.all([
    runNodeCheck('lib/strategy-hub-meeting-ready.js'),
    runNodeCheck(STRATEGY_HUB_MEETING_READY_SCRIPT_PATH),
    runNodeCheck('server.js'),
    runNodeCheck('public/strategic-execution.js'),
    runNodeCheck('lib/foundation-current-sprint.js'),
    runNodeCheck('lib/foundation-build-log.js'),
  ])
  await runBacklogHygiene()

  const summary = {
    status: findings.length ? 'blocked' : 'healthy',
    cardId: STRATEGY_HUB_MEETING_READY_CARD_ID,
    closeoutKey: STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    behaviorProof: behaviorProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(STRATEGY_HUB_MEETING_READY_CARD_ID) || null,
    findings,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Strategy Hub meeting-ready')
    console.log(`  Card: ${STRATEGY_HUB_MEETING_READY_CARD_ID}`)
    console.log(`  Closeout: ${STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY}`)
    console.log(`  Status: ${summary.status}`)
    console.log(`  Active blocker: ${summary.activeBlockerCardId || 'missing'}`)
    console.log(`  Agenda items: ${behaviorProof.summary.agendaItemCount}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    console.log(`${STRATEGY_HUB_MEETING_READY_SUMMARY_MARKER} ${JSON.stringify(summary)}`)
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
