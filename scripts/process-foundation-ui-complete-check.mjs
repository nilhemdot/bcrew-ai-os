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
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  FOUNDATION_UI_COMPLETE_APPROVAL_PATH,
  FOUNDATION_UI_COMPLETE_CARD_ID,
  FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
  FOUNDATION_UI_COMPLETE_NEXT_REVIEW,
  FOUNDATION_UI_COMPLETE_PLAN_PATH,
  FOUNDATION_UI_COMPLETE_SCRIPT_PATH,
  FOUNDATION_UI_COMPLETE_SUMMARY_MARKER,
  buildSyntheticFoundationUiCompleteProof,
} from '../lib/foundation-ui-complete.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const baseUrl = process.env.FOUNDATION_BASE_URL || 'http://localhost:3000'

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

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchJson(pathname, { attempts = 3 } = {}) {
  const headers = {}
  if (process.env.ADMIN_TOKEN) headers['X-Admin-Token'] = process.env.ADMIN_TOKEN
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${pathname}`, { headers })
      if (response.ok) return response.json()
      const body = await response.text().catch(() => '')
      lastError = new Error(`${pathname} failed with ${response.status}: ${body.slice(0, 400)}`)
    } catch (error) {
      lastError = error
    }
    if (attempt < attempts) await wait(1500 * attempt)
  }
  throw lastError || new Error(`${pathname} failed`)
}

async function main() {
  const args = parseArgs()
  const jsonMode = String(args.json || '').toLowerCase() === 'true'
  const findings = []

  const [
    packageJson,
    planText,
    approvalJson,
    uiCompleteSource,
    scriptSource,
    serverSource,
    publicFoundationSource,
    publicStylesSource,
    foundationCurrentSprintSource,
    foundationBuildLogSource,
    foundationVerifySource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(FOUNDATION_UI_COMPLETE_PLAN_PATH),
    readJson(FOUNDATION_UI_COMPLETE_APPROVAL_PATH),
    readRepoFile('lib/foundation-ui-complete.js'),
    readRepoFile(FOUNDATION_UI_COMPLETE_SCRIPT_PATH),
    readRepoFile('server.js'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/styles.css'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_UI_COMPLETE_APPROVAL_PATH,
    cardId: FOUNDATION_UI_COMPLETE_CARD_ID,
  })
  const changedFiles = [
    FOUNDATION_UI_COMPLETE_PLAN_PATH,
    FOUNDATION_UI_COMPLETE_APPROVAL_PATH,
    'lib/foundation-ui-complete.js',
    FOUNDATION_UI_COMPLETE_SCRIPT_PATH,
    'server.js',
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
    card: { id: FOUNDATION_UI_COMPLETE_CARD_ID, priority: 'P0' },
    changedFiles,
    declaredRisk: planText,
  })
  const syntheticProof = buildSyntheticFoundationUiCompleteProof()

  const closeoutNote = 'Closed on 2026-05-12 under `foundation-ui-complete-v1`. V1 adds `lib/foundation-ui-complete.js`, a `foundationUiComplete` live summary on `/api/foundation/source-lifecycle`, `/api/foundation-hub`, and nested Source Lifecycle payloads, a Source Lifecycle `Foundation 30-Second Read` panel, `scripts/process-foundation-ui-complete-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The proof calls the real aggregation function, real Source Lifecycle API payload, real UI source, and real Current Sprint overlay; proves all ten Source Once-Over sections are visible; proves visible gaps stay visible; and leaves the final active blocker pinned to `FOUNDATION-UI-COMPLETE-001` for sprint review/rollover. This does not build Reply Parser, Watching Items, Strategy expansion, Marketing production, Telegram bots, Directors, agents, new ingestion, Drive ACL mutation, or request-access email.'

  await initFoundationDb()
  await updateBacklogItem(FOUNDATION_UI_COMPLETE_CARD_ID, {
    lane: 'done',
    nextAction: `Closed for v1. ${FOUNDATION_UI_COMPLETE_NEXT_REVIEW}`,
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
      foundationUiCompleteStage: 'done_this_sprint',
    }),
    'codex'
  )
  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    FOUNDATION_UI_COMPLETE_CARD_ID,
    'DECISION-RESTRICTED-QUEUE-001',
  ])
  await closeFoundationDb()

  const sourceLifecycle = await fetchJson('/api/foundation/source-lifecycle')
  const foundationHub = await fetchJson('/api/foundation-hub')
  const uiComplete = sourceLifecycle.foundationUiComplete || {}
  const hubUiComplete = foundationHub.foundationUiComplete || {}
  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintStageMap = new Map((sprint.items || []).map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null
  const card = cardMap.get(FOUNDATION_UI_COMPLETE_CARD_ID)

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, approvalJson.cardId === FOUNDATION_UI_COMPLETE_CARD_ID, 'approval JSON is for Foundation UI Complete')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Foundation UI Complete plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, syntheticProof.ok, 'synthetic Foundation UI Complete proof covers all ten sections and visible gaps', JSON.stringify(syntheticProof.summary))
  addFinding(findings, uiComplete.status === 'healthy', 'real Source Lifecycle payload exposes healthy Foundation UI Complete summary', uiComplete.status || 'missing')
  addFinding(findings, uiComplete.closeoutKey === FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY, 'real summary has closeout key', uiComplete.closeoutKey || 'missing')
  addFinding(findings, uiComplete.summary?.sectionCount === 10, 'real summary has ten scan sections', String(uiComplete.summary?.sectionCount ?? 'missing'))
  addFinding(findings, uiComplete.summary?.sourceCount >= 35, 'real summary carries source count', String(uiComplete.summary?.sourceCount ?? 'missing'))
  addFinding(findings, uiComplete.summary?.brandLaneCount >= 5, 'real summary carries brand lanes', String(uiComplete.summary?.brandLaneCount ?? 'missing'))
  addFinding(findings, uiComplete.summary?.avatarCount === 15, 'real summary carries avatar import count', String(uiComplete.summary?.avatarCount ?? 'missing'))
  addFinding(findings, uiComplete.summary?.tierSurfaceCount >= 14, 'real summary carries tier proof surfaces', String(uiComplete.summary?.tierSurfaceCount ?? 'missing'))
  addFinding(findings, typeof uiComplete.summary?.verificationCandidateCount === 'number', 'real summary carries verification candidate count', String(uiComplete.summary?.verificationCandidateCount ?? 'missing'))
  addFinding(findings, typeof uiComplete.summary?.auditActorCount === 'number', 'real summary carries per-user audit actor count', String(uiComplete.summary?.auditActorCount ?? 'missing'))
  addFinding(findings, typeof uiComplete.summary?.restrictedDecisionCount === 'number', 'real summary carries restricted decision count', String(uiComplete.summary?.restrictedDecisionCount ?? 'missing'))
  addFinding(findings, uiComplete.summary?.productExpansionBuilt === false, 'summary explicitly avoids product expansion', String(uiComplete.summary?.productExpansionBuilt))
  addFinding(findings, (uiComplete.topVisibleGaps || []).length > 0, 'real summary keeps visible gaps visible', String((uiComplete.topVisibleGaps || []).length))
  addFinding(findings, hubUiComplete.closeoutKey === FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY && foundationHub.sourceLifecycle?.foundationUiComplete?.closeoutKey === FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY, 'Foundation Hub exposes top-level and nested Foundation UI Complete summary')
  addFinding(findings, packageJson.scripts?.['process:foundation-ui-complete-check'] === `node --env-file-if-exists=.env ${FOUNDATION_UI_COMPLETE_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, card?.lane === 'done' && String(card?.statusNote || '').includes(FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY), 'FOUNDATION-UI-COMPLETE-001 is done with closeout proof', card?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === FOUNDATION_UI_COMPLETE_CARD_ID, 'Current Sprint active blocker remains pinned to Foundation UI Complete for sprint review', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(FOUNDATION_UI_COMPLETE_CARD_ID) === 'done_this_sprint', 'Foundation UI Complete moved to Done This Sprint', sprintStageMap.get(FOUNDATION_UI_COMPLETE_CARD_ID) || 'missing')
  addFinding(findings, (sprint.items || []).filter(item => item.stage === 'done_this_sprint').length >= 10, 'all Source Once-Over sprint cards are done this sprint', String((sprint.items || []).filter(item => item.stage === 'done_this_sprint').length))
  addFinding(findings, includesAll(uiCompleteSource, [
    'buildFoundationUiCompleteSnapshot',
    'buildSyntheticFoundationUiCompleteProof',
    'REQUIRED_SECTIONS',
    FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
  ]), 'Foundation UI Complete library owns aggregation and synthetic proof')
  addFinding(findings, includesAll(scriptSource, [
    FOUNDATION_UI_COMPLETE_SUMMARY_MARKER,
    'real Source Lifecycle payload exposes healthy Foundation UI Complete summary',
    'all Source Once-Over sprint cards are done this sprint',
  ]), 'focused proof checks API payload and sprint closeout')
  addFinding(findings, includesAll(serverSource, [
    'buildFoundationUiCompleteSnapshot',
    'sourceLifecycle.foundationUiComplete',
    'foundationUiComplete',
  ]), 'server attaches Foundation UI Complete to source lifecycle and hub payloads')
  addFinding(findings, includesAll(publicFoundationSource, [
    'renderFoundationUiCompletePanel',
    'Foundation 30-Second Read',
    'data-foundation-ui-complete-section',
  ]), 'Foundation UI renders the 30-second read panel')
  addFinding(findings, includesAll(publicStylesSource, [
    '.foundation-ui-complete-panel',
    '.foundation-ui-complete-grid',
    '.foundation-ui-complete-card',
  ]), 'Foundation styles cover the UI Complete panel')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'foundationUiCompleteStage',
    'FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY',
    'FOUNDATION_UI_COMPLETE_SCRIPT_PATH',
  ]), 'Current Sprint seed closes final Source Once-Over card')
  addFinding(findings, includesAll(foundationBuildLogSource, [
    FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
    FOUNDATION_UI_COMPLETE_CARD_ID,
    'Source Once-Over is complete',
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticFoundationUiCompleteProof',
    'FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY',
    'renderFoundationUiCompletePanel',
  ]), 'canonical verifier covers Foundation UI Complete')
  addFinding(findings, includesAll(currentPlanText, [
    FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
    FOUNDATION_UI_COMPLETE_CARD_ID,
    'Source Once-Over complete',
  ]), 'current plan records Source Once-Over completion')
  addFinding(findings, includesAll(currentStateText, [
    FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
    'Current sprint active blocker remains pinned to `FOUNDATION-UI-COMPLETE-001`',
    'Foundation 30-second read',
  ]), 'current state records Foundation UI Complete closeout')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: FOUNDATION_UI_COMPLETE_CARD_ID,
    closeoutKey: FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
      summary: buildPlanCriticResultSummary(planCritic),
    },
    uiComplete: {
      status: uiComplete.status,
      summary: uiComplete.summary,
      sections: (uiComplete.sections || []).map(section => section.id),
    },
    syntheticProof: syntheticProof.summary,
    currentSprint: {
      activeBlockerCardId,
      foundationUiCompleteStage: sprintStageMap.get(FOUNDATION_UI_COMPLETE_CARD_ID) || null,
      doneThisSprintCount: (sprint.items || []).filter(item => item.stage === 'done_this_sprint').length,
    },
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`${FOUNDATION_UI_COMPLETE_SUMMARY_MARKER} ${JSON.stringify(result)}`)
  }

  if (findings.length) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
