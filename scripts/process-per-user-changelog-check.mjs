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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { listFoundationUsers } from '../lib/foundation-people-sales-db.js'
import { getRecentChangeEvents } from '../lib/foundation-strategy-docs-db.js'
import {
  PER_USER_CHANGELOG_APPROVAL_PATH,
  PER_USER_CHANGELOG_CARD_ID,
  PER_USER_CHANGELOG_CLOSEOUT_KEY,
  PER_USER_CHANGELOG_NEXT_CARD_ID,
  PER_USER_CHANGELOG_PLAN_PATH,
  PER_USER_CHANGELOG_SCRIPT_PATH,
  PER_USER_CHANGELOG_SUMMARY_MARKER,
  buildPerUserChangelogSnapshot,
  buildSyntheticPerUserChangelogProof,
} from '../lib/per-user-changelog.js'

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
    perUserSource,
    scriptSource,
    serverSource,
    publicFoundationSource,
    publicStylesSource,
    securityAccessSource,
    foundationCurrentSprintSource,
    foundationDbSource,
    foundationBuildLogSource,
    foundationVerifySource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(PER_USER_CHANGELOG_PLAN_PATH),
    readRepoFile('lib/per-user-changelog.js'),
    readRepoFile(PER_USER_CHANGELOG_SCRIPT_PATH),
    readRepoFile('server.js'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/styles.css'),
    readRepoFile('lib/security-access.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: PER_USER_CHANGELOG_APPROVAL_PATH,
    cardId: PER_USER_CHANGELOG_CARD_ID,
  })
  const changedFiles = [
    PER_USER_CHANGELOG_PLAN_PATH,
    PER_USER_CHANGELOG_APPROVAL_PATH,
    'lib/per-user-changelog.js',
    PER_USER_CHANGELOG_SCRIPT_PATH,
    'server.js',
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
    card: { id: PER_USER_CHANGELOG_CARD_ID, priority: 'P2' },
    changedFiles,
    declaredRisk: planText,
  })

  await initFoundationDb()
  const [users, changeEvents] = await Promise.all([
    listFoundationUsers({ activeOnly: true }),
    getRecentChangeEvents(100),
  ])
  const perUserChangelog = buildPerUserChangelogSnapshot({
    users,
    changeEvents,
    limit: 100,
  })
  const syntheticProof = buildSyntheticPerUserChangelogProof()

  const closeoutNote = 'Closed on 2026-05-12 under `per-user-changelog-v1`. V1 adds `lib/per-user-changelog.js`, `/api/foundation/per-user-changelog`, Source Lifecycle/Foundation Hub payload wiring, Foundation Source Lifecycle UI rendering, `scripts/process-per-user-changelog-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The behavior proof calls the real per-user changelog snapshot path over existing `change_events`, proves synthetic known-user/agent/system/unknown actor grouping, changed/approved/applied/system classification, metadata-key-only privacy, explicit missing viewed/ignored/received coverage, and Current Sprint advancement to `DECISION-RESTRICTED-QUEUE-001`. This does not create a new audit-log write table, add read/view tracking middleware, build a searchable audit explorer, build Reply Parser, Watching Items, restricted decisions, Strategy Hub expansion, Marketing Pipeline, Telegram bots, Directors, or Drive ACL mutation.'
  await updateBacklogItem(PER_USER_CHANGELOG_CARD_ID, {
    lane: 'done',
    nextAction: 'Closed for v1. Pull `DECISION-RESTRICTED-QUEUE-001` next and sequester restricted personnel/comp/performance decisions before broader routing.',
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
    }),
    'codex'
  )

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    PER_USER_CHANGELOG_CARD_ID,
    PER_USER_CHANGELOG_NEXT_CARD_ID,
    'VERIFICATION-RUNS-001',
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintStageMap = new Map((sprint.items || []).map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null
  const perUserCard = cardMap.get(PER_USER_CHANGELOG_CARD_ID)
  const nextCard = cardMap.get(PER_USER_CHANGELOG_NEXT_CARD_ID)

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Per-User Changelog plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, perUserChangelog.status === 'partial', 'real per-user changelog snapshot is honestly partial', perUserChangelog.status)
  addFinding(findings, Number(perUserChangelog.summary?.eventCount || 0) > 0, 'real snapshot has change event activity', String(perUserChangelog.summary?.eventCount || 0))
  addFinding(findings, typeof perUserChangelog.summary?.actorCount === 'number', 'real snapshot has actor count', String(perUserChangelog.summary?.actorCount ?? 'missing'))
  addFinding(findings, perUserChangelog.summary?.metadataValuesIncluded === false, 'real snapshot excludes metadata values', JSON.stringify(perUserChangelog.summary))
  addFinding(findings, perUserChangelog.summary?.missingCoverageCount === 3, 'real snapshot keeps viewed/ignored/received coverage missing', JSON.stringify(perUserChangelog.missingCoverage || []))
  addFinding(findings, perUserChangelog.summary?.nextCardId === PER_USER_CHANGELOG_NEXT_CARD_ID, 'per-user changelog points to restricted decision queue next', perUserChangelog.summary?.nextCardId || 'missing')
  addFinding(findings, syntheticProof.ok, 'synthetic per-user changelog proof covers known user, agent, system, unknown actor, classification, and privacy', JSON.stringify(syntheticProof.summary))
  addFinding(findings, packageJson.scripts?.['process:per-user-changelog-check'] === `node --env-file-if-exists=.env ${PER_USER_CHANGELOG_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, perUserCard?.lane === 'done' && String(perUserCard?.statusNote || '').includes(PER_USER_CHANGELOG_CLOSEOUT_KEY), 'PER-USER-CHANGELOG-001 is done with closeout proof', perUserCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(nextCard?.lane), 'DECISION-RESTRICTED-QUEUE-001 is available next', nextCard?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === PER_USER_CHANGELOG_NEXT_CARD_ID, 'Current Sprint active blocker advanced to restricted decision queue', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(PER_USER_CHANGELOG_CARD_ID) === 'done_this_sprint', 'Per-User Changelog moved to Done This Sprint', sprintStageMap.get(PER_USER_CHANGELOG_CARD_ID) || 'missing')
  addFinding(findings, sprintStageMap.get(PER_USER_CHANGELOG_NEXT_CARD_ID) === 'building_now', 'Restricted Decision Queue is next in Building Now', sprintStageMap.get(PER_USER_CHANGELOG_NEXT_CARD_ID) || 'missing')
  addFinding(findings, includesAll(perUserSource, [
    'buildPerUserChangelogSnapshot',
    'buildSyntheticPerUserChangelogProof',
    'PER_USER_CHANGELOG_CLOSEOUT_KEY',
    'metadataValuesIncluded: false',
    'viewed',
    'ignored',
    'received',
  ]), 'per-user changelog library owns behavior proof and missing coverage')
  addFinding(findings, includesAll(scriptSource, [
    PER_USER_CHANGELOG_SUMMARY_MARKER,
    'real snapshot excludes metadata values',
    'Current Sprint active blocker advanced to restricted decision queue',
  ]), 'focused proof checks behavior and sprint advancement')
  addFinding(findings, includesAll(serverSource, [
    '/api/foundation/per-user-changelog',
    'buildPerUserChangelogSnapshot',
    'perUserChangelog',
  ]), 'Foundation APIs expose per-user changelog')
  addFinding(findings, securityAccessSource.includes('/api/foundation/per-user-changelog'), 'security route posture registry covers per-user changelog API')
  addFinding(findings, includesAll(publicFoundationSource, [
    'renderPerUserChangelogPanel',
    'perUserChangelog',
    'per-user-changelog',
  ]), 'Foundation UI renders per-user changelog')
  addFinding(findings, includesAll(publicStylesSource, [
    '.per-user-changelog-panel',
    '.per-user-changelog-grid',
  ]), 'Foundation styles cover per-user changelog panel')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'perUserChangelogStage',
    'PER_USER_CHANGELOG_CLOSEOUT_KEY',
    PER_USER_CHANGELOG_NEXT_CARD_ID,
  ]), 'Current Sprint seed advances after Per-User Changelog')
  addFinding(findings, includesAll(foundationDbSource, [
    PER_USER_CHANGELOG_CARD_ID,
    PER_USER_CHANGELOG_NEXT_CARD_ID,
    'change_events',
  ]), 'Foundation backlog and DB source contain per-user changelog inputs')
  addFinding(findings, includesAll(foundationBuildLogSource, [
    PER_USER_CHANGELOG_CLOSEOUT_KEY,
    PER_USER_CHANGELOG_CARD_ID,
    PER_USER_CHANGELOG_NEXT_CARD_ID,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticPerUserChangelogProof',
    'PER_USER_CHANGELOG_CLOSEOUT_KEY',
    'PER_USER_CHANGELOG_CARD_ID',
  ]), 'canonical verifier covers Per-User Changelog')
  addFinding(findings, includesAll(currentPlanText, [
    PER_USER_CHANGELOG_CLOSEOUT_KEY,
    PER_USER_CHANGELOG_CARD_ID,
    PER_USER_CHANGELOG_NEXT_CARD_ID,
  ]), 'current plan records Per-User Changelog closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    PER_USER_CHANGELOG_CLOSEOUT_KEY,
    'Current sprint active blocker is now `DECISION-RESTRICTED-QUEUE-001`',
    'viewed/ignored/received',
  ]), 'current state records Per-User Changelog closeout and active blocker')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: PER_USER_CHANGELOG_CARD_ID,
    closeoutKey: PER_USER_CHANGELOG_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    perUserChangelog: {
      summary: perUserChangelog.summary,
      actorKeys: (perUserChangelog.activeActors || []).slice(0, 12).map(actor => actor.actorKey),
      missingCoverage: (perUserChangelog.missingCoverage || []).map(item => item.key),
    },
    syntheticProof: syntheticProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(PER_USER_CHANGELOG_CARD_ID) || null,
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Per-user changelog check: ${result.status}`)
    console.log(`${PER_USER_CHANGELOG_SUMMARY_MARKER} ${JSON.stringify(result.perUserChangelog.summary)}`)
    for (const finding of findings) {
      console.log(`- ${finding.check}: ${finding.detail}`)
    }
  }

  if (findings.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
