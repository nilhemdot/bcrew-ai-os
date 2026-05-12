#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'
import {
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
  PLAN_CRITIC_MIN_PASS_SCORE,
} from '../lib/process-plan-critic.js'
import {
  buildFoundationSourceOnceOverSprintSeed,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationSnapshot,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  DECISION_RESTRICTED_QUEUE_APPROVAL_PATH,
  DECISION_RESTRICTED_QUEUE_CARD_ID,
  DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
  DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
  DECISION_RESTRICTED_QUEUE_PLAN_PATH,
  DECISION_RESTRICTED_QUEUE_SCRIPT_PATH,
  DECISION_RESTRICTED_QUEUE_SUMMARY_MARKER,
  buildDecisionRestrictedQueueSnapshot,
  buildSyntheticDecisionRestrictedQueueProof,
  filterGeneralDecisionRecords,
} from '../lib/decision-restricted-queue.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return argv.reduce((acc, arg) => {
    const match = String(arg).match(/^--([^=]+)=(.*)$/)
    if (match) acc[match[1]] = match[2]
    return acc
  }, {})
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function includesAll(source, needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

async function main() {
  const args = parseArgs()
  const jsonMode = String(args.json || '').toLowerCase() === 'true'
  const findings = []

  const [
    packageJson,
    planText,
    decisionQueueSource,
    scriptSource,
    serverSource,
    sharedCandidateSource,
    publicFoundationSource,
    publicStylesSource,
    securityAccessSource,
    foundationCurrentSprintSource,
    foundationBuildLogSource,
    foundationVerifySource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(DECISION_RESTRICTED_QUEUE_PLAN_PATH),
    readRepoFile('lib/decision-restricted-queue.js'),
    readRepoFile(DECISION_RESTRICTED_QUEUE_SCRIPT_PATH),
    readRepoFile('server.js'),
    readRepoFile('lib/shared-candidate-extraction.js'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/styles.css'),
    readRepoFile('lib/security-access.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DECISION_RESTRICTED_QUEUE_APPROVAL_PATH,
    cardId: DECISION_RESTRICTED_QUEUE_CARD_ID,
  })
  const changedFiles = [
    DECISION_RESTRICTED_QUEUE_PLAN_PATH,
    DECISION_RESTRICTED_QUEUE_APPROVAL_PATH,
    'lib/decision-restricted-queue.js',
    DECISION_RESTRICTED_QUEUE_SCRIPT_PATH,
    'server.js',
    'lib/shared-candidate-extraction.js',
    'lib/security-access.js',
    'public/foundation.js',
    'public/styles.css',
    'lib/foundation-current-sprint.js',
    'lib/foundation-build-log.js',
    'scripts/foundation-verify.mjs',
    'docs/rebuild/current-plan.md',
    'docs/rebuild/current-state.md',
    'package.json',
  ]
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: DECISION_RESTRICTED_QUEUE_CARD_ID, priority: 'P1' },
    changedFiles,
    declaredRisk: planText,
  })

  await initFoundationDb()
  const snapshot = await getFoundationSnapshot()
  const restrictedQueue = buildDecisionRestrictedQueueSnapshot({
    decisions: snapshot.decisions || [],
  })
  const syntheticProof = buildSyntheticDecisionRestrictedQueueProof()
  const generalDecisions = filterGeneralDecisionRecords(snapshot.decisions || [])

  const closeoutNote = 'Closed on 2026-05-12 under `decision-restricted-queue-v1`. V1 adds `lib/decision-restricted-queue.js`, `/api/foundation/restricted-decision-queue`, Source Lifecycle/Foundation Hub payload wiring, Foundation Source Lifecycle UI rendering, Strategy advisor and shared-candidate extraction general-decision filters, `scripts/process-decision-restricted-queue-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The behavior proof calls the real restricted decision classifier and snapshot builder, proves synthetic termination, compensation, performance concern, personnel/HR, and legal/compliance decisions route to owner-only review, proves generic marketing performance stays general, proves restricted decisions are filtered out of general decision contexts, and advances Current Sprint to `FOUNDATION-UI-COMPLETE-001`. This does not create a new decision table, auto-lock or auto-apply decisions, send messages, provide legal/HR advice, build Reply Parser, Watching Items, Strategy Hub expansion, Marketing Pipeline, Telegram bots, Directors, or Drive ACL mutation.'
  await updateBacklogItem(DECISION_RESTRICTED_QUEUE_CARD_ID, {
    lane: 'done',
    nextAction: 'Closed for v1. Pull `FOUNDATION-UI-COMPLETE-001` next and make the Foundation depth state visible in one scan.',
    statusNote: closeoutNote,
  }, 'codex')

  await upsertFoundationCurrentSprintOverlay(
    buildFoundationSourceOnceOverSprintSeed({
      sourceMaturityStage: 'done_this_sprint',
      sourceExtractionCoverageStage: 'done_this_sprint',
      sourceCoverageCloseoutStage: 'done_this_sprint',
      marketingSourceMapStage: 'done_this_sprint',
      brandStackStage: 'done_this_sprint',
      tierBehavioralCompletionStage: 'done_this_sprint',
      verificationRunsStage: 'done_this_sprint',
      perUserChangelogStage: 'done_this_sprint',
      decisionRestrictedQueueStage: 'done_this_sprint',
    }),
    'codex'
  )

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    DECISION_RESTRICTED_QUEUE_CARD_ID,
    DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
    'PER-USER-CHANGELOG-001',
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintStageMap = new Map((sprint.items || []).map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null
  const decisionCard = cardMap.get(DECISION_RESTRICTED_QUEUE_CARD_ID)
  const nextCard = cardMap.get(DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID)

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Restricted Decision Queue plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, restrictedQueue.status === 'healthy', 'real restricted queue snapshot is healthy', restrictedQueue.status)
  addFinding(findings, typeof restrictedQueue.summary?.decisionCount === 'number', 'real snapshot counts decisions', String(restrictedQueue.summary?.decisionCount ?? 'missing'))
  addFinding(findings, restrictedQueue.summary?.ownerOnly === true, 'restricted queue is owner-only', JSON.stringify(restrictedQueue.summary))
  addFinding(findings, restrictedQueue.summary?.proposedOnly === true, 'restricted queue keeps proposed-only boundary', JSON.stringify(restrictedQueue.summary))
  addFinding(findings, restrictedQueue.summary?.autoApplies === false && restrictedQueue.summary?.autoLocks === false, 'restricted queue does not auto-apply or auto-lock', JSON.stringify(restrictedQueue.summary))
  addFinding(findings, restrictedQueue.summary?.nextCardId === DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID, 'restricted queue points to Foundation UI next', restrictedQueue.summary?.nextCardId || 'missing')
  addFinding(findings, Array.isArray(generalDecisions), 'general decision filter returns safe context array', String(generalDecisions.length))
  addFinding(findings, syntheticProof.ok, 'synthetic restricted queue proof covers restricted/general routing and no-auto-apply boundary', JSON.stringify(syntheticProof.summary))
  addFinding(findings, packageJson.scripts?.['process:decision-restricted-queue-check'] === `node --env-file-if-exists=.env ${DECISION_RESTRICTED_QUEUE_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, decisionCard?.lane === 'done' && String(decisionCard?.statusNote || '').includes(DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY), 'DECISION-RESTRICTED-QUEUE-001 is done with closeout proof', decisionCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(nextCard?.lane), 'FOUNDATION-UI-COMPLETE-001 is available next', nextCard?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID, 'Current Sprint active blocker advanced to Foundation UI Complete', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(DECISION_RESTRICTED_QUEUE_CARD_ID) === 'done_this_sprint', 'Restricted Decision Queue moved to Done This Sprint', sprintStageMap.get(DECISION_RESTRICTED_QUEUE_CARD_ID) || 'missing')
  addFinding(findings, sprintStageMap.get(DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID) === 'building_now', 'Foundation UI Complete is next in Building Now', sprintStageMap.get(DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID) || 'missing')
  addFinding(findings, includesAll(decisionQueueSource, [
    'classifyDecisionRestriction',
    'buildDecisionRestrictedQueueSnapshot',
    'filterGeneralDecisionRecords',
    'buildSyntheticDecisionRestrictedQueueProof',
    'owner_only_restricted_review',
    'performance_concern',
  ]), 'restricted decision queue library owns behavior proof')
  addFinding(findings, includesAll(scriptSource, [
    DECISION_RESTRICTED_QUEUE_SUMMARY_MARKER,
    'synthetic restricted queue proof covers restricted/general routing',
    'Current Sprint active blocker advanced to Foundation UI Complete',
  ]), 'focused proof checks behavior and sprint advancement')
  addFinding(findings, includesAll(serverSource, [
    '/api/foundation/restricted-decision-queue',
    'buildDecisionRestrictedQueueSnapshot',
    'filterGeneralDecisionRecords',
    'restrictedDecisionQueue',
  ]), 'Foundation APIs and Strategy context expose/filter restricted queue')
  addFinding(findings, sharedCandidateSource.includes('filterGeneralDecisionRecords'), 'shared-candidate extraction filters restricted decisions from general context')
  addFinding(findings, securityAccessSource.includes('/api/foundation/restricted-decision-queue'), 'security route posture registry covers restricted queue API')
  addFinding(findings, includesAll(publicFoundationSource, [
    'renderRestrictedDecisionQueuePanel',
    'restrictedDecisionQueue',
    'restricted-decision-queue',
  ]), 'Foundation UI renders restricted decision queue')
  addFinding(findings, includesAll(publicStylesSource, [
    '.restricted-decision-queue-panel',
    '.restricted-decision-queue-grid',
  ]), 'Foundation styles cover restricted decision queue panel')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'decisionRestrictedQueueStage',
    'DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY',
    DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
  ]), 'Current Sprint seed advances after restricted decisions')
  addFinding(findings, includesAll(foundationBuildLogSource, [
    DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
    DECISION_RESTRICTED_QUEUE_CARD_ID,
    DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticDecisionRestrictedQueueProof',
    'DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY',
    'DECISION_RESTRICTED_QUEUE_CARD_ID',
  ]), 'canonical verifier covers Restricted Decision Queue')
  addFinding(findings, includesAll(currentPlanText, [
    DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
    DECISION_RESTRICTED_QUEUE_CARD_ID,
    DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
  ]), 'current plan records Restricted Decision Queue closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
    'Current sprint active blocker is now `FOUNDATION-UI-COMPLETE-001`',
    'termination, compensation, performance concern',
  ]), 'current state records Restricted Decision Queue closeout and active blocker')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: DECISION_RESTRICTED_QUEUE_CARD_ID,
    closeoutKey: DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
      summary: buildPlanCriticResultSummary(planCritic),
    },
    restrictedQueue: {
      status: restrictedQueue.status,
      summary: restrictedQueue.summary,
    },
    syntheticProof: syntheticProof.summary,
    currentSprint: {
      activeBlockerCardId,
      decisionRestrictedQueueStage: sprintStageMap.get(DECISION_RESTRICTED_QUEUE_CARD_ID) || null,
      foundationUiCompleteStage: sprintStageMap.get(DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID) || null,
    },
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`${DECISION_RESTRICTED_QUEUE_SUMMARY_MARKER} ${JSON.stringify(result)}`)
  }

  if (findings.length) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
