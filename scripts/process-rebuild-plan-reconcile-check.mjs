#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
  AVATAR_IMPORT_CARD_ID,
  FOUNDATION_CURRENT_SPRINT_ACTIVE_CARD_IDS,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  REBUILD_PLAN_RECONCILE_APPROVAL_PATH,
  REBUILD_PLAN_RECONCILE_CARD_ID,
  REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
  REBUILD_PLAN_RECONCILE_PLAN_PATH,
  REBUILD_PLAN_RECONCILE_SCRIPT_PATH,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  VERIFY_GATE_TIERING_CARD_ID,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
} from '../lib/foundation-backlog-sprint-db.js'

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
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
]

const REQUIRED_OLD_SYSTEM_GAP_CARDS = [
  'AUTO-DEPLOY-ROLLBACK-001',
  'REPLY-WATCHING-LOOP-001',
  'DECISION-RESTRICTED-QUEUE-001',
  'BRAND-STACK-001',
  'MARKETING-PIPELINE-REBUILD-001',
  'PER-USER-CHANGELOG-001',
  'VERIFICATION-RUNS-001',
  'TELEGRAM-BOTS-REBUILD-001',
  'INTEL-DIRECTORS-REBUILD-001',
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

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(process.cwd(), relativePath), 'utf8')
}

async function runBacklogHygiene() {
  await execFile('npm', ['run', 'backlog:hygiene', '--', '--json'], {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 1024 * 1024 * 8,
  })
}

function includesAll(text, values = []) {
  return values.every(value => text.includes(value))
}

async function main() {
  const args = parseArgs()
  const jsonOnly = args.json === true || args.json === 'true'
  const findings = []

  const [
    currentPlan,
    currentState,
    reconcilePlan,
    buildLogSource,
    sprintSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile(REBUILD_PLAN_RECONCILE_PLAN_PATH),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot: process.cwd(),
    approvalRef: REBUILD_PLAN_RECONCILE_APPROVAL_PATH,
    cardId: REBUILD_PLAN_RECONCILE_CARD_ID,
  })

  const sprint = await getActiveFoundationCurrentSprint()
  const requiredCardIds = [
    ...REQUIRED_SPRINT_ORDER,
    ...REQUIRED_OLD_SYSTEM_GAP_CARDS,
    'CURRENT-SPRINT-DYNAMIC-TRUTH-001',
  ]
  const cards = await getBacklogItemsByIds(requiredCardIds)
  await closeFoundationDb()
  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintItems = sprint.items || []
  const sprintOrder = sprintItems.map(item => item.cardId)
  const sprintStageMap = new Map(sprintItems.map(item => [item.cardId, item.stage]))

  addFinding(findings, approval.ok && Number(approval.approval?.score) >= 9.8, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, packageJson.scripts?.['process:rebuild-plan-reconcile-check'] === `node --env-file-if-exists=.env ${REBUILD_PLAN_RECONCILE_SCRIPT_PATH}`, 'package exposes focused proof script')
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null
  const planCriticClosed = sprintStageMap.get(PLAN_CRITIC_REPLACEMENT_CARD_ID) === 'done_this_sprint' &&
    cardMap.get(PLAN_CRITIC_REPLACEMENT_CARD_ID)?.lane === 'done'
  const securityClosed = sprintStageMap.get(SECURITY_BEHAVIOR_PROOF_CARD_ID) === 'done_this_sprint' &&
    cardMap.get(SECURITY_BEHAVIOR_PROOF_CARD_ID)?.lane === 'done'
  const verifierClosed = sprintStageMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID) === 'done_this_sprint' &&
    cardMap.get(VERIFIER_BEHAVIOR_SWEEP_CARD_ID)?.lane === 'done'
  addFinding(findings, REQUIRED_SPRINT_ORDER.every((id, index) => sprintOrder[index] === id), 'Current Sprint order matches audit reset', sprintOrder.join(' -> '))
  addFinding(
    findings,
    activeBlockerCardId === PLAN_CRITIC_REPLACEMENT_CARD_ID ||
      (planCriticClosed && activeBlockerCardId === SECURITY_BEHAVIOR_PROOF_CARD_ID) ||
      (planCriticClosed && securityClosed && activeBlockerCardId === VERIFIER_BEHAVIOR_SWEEP_CARD_ID) ||
      (planCriticClosed && securityClosed && verifierClosed && [STRATEGY_HUB_MEETING_READY_CARD_ID, AVATAR_IMPORT_CARD_ID, AUTO_DEPLOY_ROLLBACK_CARD_ID].includes(activeBlockerCardId)),
    'Current Sprint active blocker advanced through Plan Critic',
    activeBlockerCardId || 'missing',
  )
  addFinding(findings, sprintStageMap.get(VERIFY_GATE_TIERING_CARD_ID) === 'done_this_sprint' && sprintStageMap.get(REBUILD_PLAN_RECONCILE_CARD_ID) === 'done_this_sprint', 'first two sprint cards are Done This Sprint')
  addFinding(
    findings,
    sprintStageMap.get(PLAN_CRITIC_REPLACEMENT_CARD_ID) === 'scoping' ||
      sprintStageMap.get(PLAN_CRITIC_REPLACEMENT_CARD_ID) === 'done_this_sprint',
    'Plan Critic is next or done this sprint',
    sprintStageMap.get(PLAN_CRITIC_REPLACEMENT_CARD_ID) || 'missing',
  )
  addFinding(findings, cardMap.get(REBUILD_PLAN_RECONCILE_CARD_ID)?.lane === 'done', 'REBUILD-PLAN-RECONCILE-001 is done in live backlog', cardMap.get(REBUILD_PLAN_RECONCILE_CARD_ID)?.lane || 'missing')
  addFinding(findings, REQUIRED_OLD_SYSTEM_GAP_CARDS.every(id => cardMap.has(id)), 'old-system gap cards exist', REQUIRED_OLD_SYSTEM_GAP_CARDS.filter(id => !cardMap.has(id)).join(', '))
  addFinding(
    findings,
    REQUIRED_OLD_SYSTEM_GAP_CARDS.every(id => {
      const lane = cardMap.get(id)?.lane
      if (id === AUTO_DEPLOY_ROLLBACK_CARD_ID) return ['research', 'scoped', 'ranked', 'done'].includes(lane)
      return ['research', 'scoped', 'ranked'].includes(lane)
    }),
    'old-system gap cards are visible but not silently active',
    REQUIRED_OLD_SYSTEM_GAP_CARDS.map(id => `${id}:${cardMap.get(id)?.lane || 'missing'}`).join(', '),
  )
  addFinding(findings, cardMap.get('CURRENT-SPRINT-DYNAMIC-TRUTH-001')?.lane === 'scoped', 'Current Sprint dynamic truth follow-up remains carded', cardMap.get('CURRENT-SPRINT-DYNAMIC-TRUTH-001')?.lane || 'missing')
  addFinding(findings, includesAll(currentPlan, [
    VERIFY_GATE_TIERING_CARD_ID,
    REBUILD_PLAN_RECONCILE_CARD_ID,
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
    'owner-only Strategy re-entry',
    'not automatically active',
    'TELEGRAM-BOTS-REBUILD-001',
    'INTEL-DIRECTORS-REBUILD-001',
  ]), 'current plan records order, READY meaning, and gap cards')
  addFinding(findings, includesAll(currentState, [
    REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
    'owner-only Strategy re-entry',
    'TELEGRAM-BOTS-REBUILD-001',
    'INTEL-DIRECTORS-REBUILD-001',
    'legacy-exception sprint',
  ]), 'current state records reconciliation closeout and boundaries')
  addFinding(findings, includesAll(reconcilePlan, [
    REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
    'Telegram/mobile bots',
    'Directors/Master Director',
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
  ]), 'reconcile plan captures done state and missing old-system gaps')
  addFinding(findings, includesAll(sprintSource, [
    'REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY',
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
    'PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY',
  ]), 'Current Sprint seed captures closed reconciliation state')
  addFinding(findings, includesAll(buildLogSource, [
    REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
    REBUILD_PLAN_RECONCILE_CARD_ID,
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
    'old-system gap map',
  ]), 'Recent Work closeout record exists for reconciliation')

  await runBacklogHygiene()

  const summary = {
    status: findings.length ? 'blocked' : 'healthy',
    cardId: REBUILD_PLAN_RECONCILE_CARD_ID,
    closeoutKey: REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
    sprintOrder,
    activeBlockerCardId: sprint.sprint?.activeBlockerCardId || null,
    oldSystemGapCards: REQUIRED_OLD_SYSTEM_GAP_CARDS,
    findings,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Rebuild plan reconcile proof')
    console.log(`  Card: ${REBUILD_PLAN_RECONCILE_CARD_ID}`)
    console.log(`  Closeout: ${REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY}`)
    console.log(`  Status: ${summary.status}`)
    console.log(`  Active blocker: ${summary.activeBlockerCardId || 'missing'}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    console.log(`REBUILD_PLAN_RECONCILE_SUMMARY ${JSON.stringify(summary)}`)
  }
  if (summary.status !== 'healthy') process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
  await closeFoundationDb().catch(() => {})
})
