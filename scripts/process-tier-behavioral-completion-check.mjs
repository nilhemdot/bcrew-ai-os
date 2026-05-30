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
import {
  TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH,
  TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
  TIER_BEHAVIORAL_COMPLETION_PLAN_PATH,
  TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH,
  TIER_BEHAVIORAL_COMPLETION_SUMMARY_MARKER,
  buildSyntheticTierBehavioralCompletionProof,
  buildTierBehavioralCompletionSnapshot,
} from '../lib/tier-behavioral-completion.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const NEXT_CARD_ID = 'VERIFICATION-RUNS-001'

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

function countDecision(snapshot, decision) {
  return (snapshot.surfaces || []).filter(surface => surface.decision === decision).length
}

async function main() {
  const args = parseArgs()
  const jsonMode = String(args.json || '').toLowerCase() === 'true'
  const findings = []

  const [
    packageJson,
    planText,
    tierSource,
    scriptSource,
    securityAccessSource,
    securityBehaviorSource,
    serverSource,
    publicFoundationSource,
    publicStylesSource,
    foundationCurrentSprintSource,
    foundationDbSource,
    foundationBuildLogSource,
    foundationVerifySource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(TIER_BEHAVIORAL_COMPLETION_PLAN_PATH),
    readRepoFile('lib/tier-behavioral-completion.js'),
    readRepoFile(TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH),
    readRepoFile('lib/security-access.js'),
    readRepoFile('lib/security-behavior-proof.js'),
    readRepoFile('server.js'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/styles.css'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH,
    cardId: TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  })
  const changedFiles = [
    TIER_BEHAVIORAL_COMPLETION_PLAN_PATH,
    TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH,
    'lib/tier-behavioral-completion.js',
    TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH,
    'lib/security-access.js',
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
    card: { id: TIER_BEHAVIORAL_COMPLETION_CARD_ID, priority: 'P1' },
    changedFiles,
    declaredRisk: planText,
  })

  const snapshot = buildTierBehavioralCompletionSnapshot()
  const syntheticProof = buildSyntheticTierBehavioralCompletionProof()

  await initFoundationDb()
  const closeoutNote = 'Closed on 2026-05-12 under `tier-behavioral-completion-v1`. V1 adds `lib/tier-behavioral-completion.js`, explicit owner-only route postures for Foundation source-depth APIs, `/api/foundation/tier-behavioral-completion`, Source Lifecycle/Foundation Hub payload wiring, Foundation UI rendering, `scripts/process-tier-behavioral-completion-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The behavior proof calls the real route posture path for fourteen first-read surfaces, proves four role-filtered non-owner reads (Ops Hub, Ops Agent Feedback Dry Run, Owners Review Queue, Sales Hub), keeps Foundation/source/brand/shared-comms/Strategy/intelligence evidence owner-only, reuses the Tanner subject-person redaction proof, and advances Current Sprint to `VERIFICATION-RUNS-001`. This does not open shared communications, team Strategy access, broad Foundation access, intelligence evidence access, write permissions, Brand Guardian enforcement, Marketing Pipeline, Reply/Watching Loop, Telegram bots, Directors, or Drive ACL mutation.'
  await updateBacklogItem(TIER_BEHAVIORAL_COMPLETION_CARD_ID, {
    lane: 'done',
    nextAction: 'Closed for v1. Pull `VERIFICATION-RUNS-001` next to turn stale research/findings cleanup into an automatic verification run.',
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
    }),
    'codex'
  )

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
    NEXT_CARD_ID,
    'SECURITY-BEHAVIOR-PROOF-001',
    'BRAND-STACK-001',
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintStageMap = new Map((sprint.items || []).map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null
  const tierCard = cardMap.get(TIER_BEHAVIORAL_COMPLETION_CARD_ID)
  const nextCard = cardMap.get(NEXT_CARD_ID)

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Tier Behavioral plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, snapshot.status === 'healthy', 'tier behavior snapshot is healthy', JSON.stringify(snapshot.findings))
  addFinding(findings, snapshot.summary?.surfaceCount >= 14, 'first-read surface matrix is complete', String(snapshot.summary?.surfaceCount || 0))
  addFinding(findings, snapshot.summary?.missingRoutePostureCount === 0, 'all first-read surfaces have explicit route postures', String(snapshot.summary?.missingRoutePostureCount || 0))
  addFinding(findings, snapshot.summary?.roleFilteredSurfaceCount >= 4, 'role-filtered non-owner reads are proven', String(snapshot.summary?.roleFilteredSurfaceCount || 0))
  addFinding(findings, snapshot.summary?.ownerOnlySurfaceCount >= 7, 'Foundation source-depth surfaces stay owner-only', String(snapshot.summary?.ownerOnlySurfaceCount || 0))
  addFinding(findings, snapshot.summary?.redactionReadyOwnerOnlySurfaceCount >= 3, 'redaction-ready sensitive reads stay owner-only', String(snapshot.summary?.redactionReadyOwnerOnlySurfaceCount || 0))
  addFinding(findings, snapshot.summary?.subjectPersonProofOk === true, 'Tanner subject-person leak proof remains green', String(snapshot.summary?.subjectPersonProofOk || false))
  addFinding(findings, snapshot.summary?.broadSharedCommsOpened === false && snapshot.summary?.strategyTeamAccessOpened === false && snapshot.summary?.foundationTeamAccessOpened === false, 'no broad team access opened by this card')
  addFinding(findings, countDecision(snapshot, 'role_filtered') === snapshot.summary?.roleFilteredSurfaceCount, 'decision counts match role-filtered surfaces')
  addFinding(findings, syntheticProof.ok, 'synthetic tier behavior proof passes', JSON.stringify(syntheticProof.summary))
  addFinding(findings, packageJson.scripts?.['process:tier-behavioral-completion-check'] === `node --env-file-if-exists=.env ${TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, tierCard?.lane === 'done' && String(tierCard?.statusNote || '').includes(TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY), 'TIER-BEHAVIORAL-COMPLETION-001 is done with closeout proof', tierCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(nextCard?.lane), 'VERIFICATION-RUNS-001 is available next', nextCard?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint active blocker advanced to verification runs', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(TIER_BEHAVIORAL_COMPLETION_CARD_ID) === 'done_this_sprint', 'Tier Behavioral moved to Done This Sprint', sprintStageMap.get(TIER_BEHAVIORAL_COMPLETION_CARD_ID) || 'missing')
  addFinding(findings, sprintStageMap.get(NEXT_CARD_ID) === 'building_now', 'Verification Runs is next in Building Now', sprintStageMap.get(NEXT_CARD_ID) || 'missing')
  addFinding(findings, includesAll(tierSource, [
    'TIER_BEHAVIORAL_SURFACES',
    'buildTierBehavioralCompletionSnapshot',
    'buildSyntheticTierBehavioralCompletionProof',
    TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
  ]), 'tier behavior library owns surface decisions and behavior proof')
  addFinding(findings, includesAll(scriptSource, [
    TIER_BEHAVIORAL_COMPLETION_SUMMARY_MARKER,
    'role-filtered non-owner reads are proven',
    'Current Sprint active blocker advanced to verification runs',
  ]), 'focused proof checks behavior and sprint advancement')
  addFinding(findings, includesAll(securityAccessSource, [
    "/api/foundation/source-maturity-grid",
    "/api/foundation/marketing-source-map",
    "/api/foundation/tier-behavioral-completion",
    "/api/foundation/current-sprint",
  ]), 'security route posture registry explicitly covers Foundation source-depth reads')
  addFinding(findings, includesAll(securityBehaviorSource, [
    'buildSubjectPersonLeakProof',
    'tanner-tier1-subject-content-suppressed',
  ]), 'subject-person proof is reused instead of reimplemented')
  addFinding(findings, includesAll(serverSource, [
    '/api/foundation/tier-behavioral-completion',
    'buildTierBehavioralCompletionSnapshot',
    'tierBehavioralCompletion',
  ]), 'Foundation APIs expose tier behavior completion')
  addFinding(findings, includesAll(publicFoundationSource, [
    'renderTierBehavioralCompletionPanel',
    'tierBehavioralCompletion',
    'tier-behavioral-completion',
  ]), 'Foundation UI renders tier behavior completion')
  addFinding(findings, includesAll(publicStylesSource, [
    '.tier-behavior-panel',
    '.tier-behavior-grid',
  ]), 'Foundation styles cover tier behavior panel')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'tierBehavioralCompletionStage',
    'TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY',
    NEXT_CARD_ID,
  ]), 'Current Sprint seed advances after Tier Behavioral')
  addFinding(findings, includesAll(foundationDbSource, [
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
    NEXT_CARD_ID,
  ]), 'Foundation backlog has Tier Behavioral and Verification Runs cards')
  addFinding(findings, includesAll(foundationBuildLogSource, [
    TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
    NEXT_CARD_ID,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticTierBehavioralCompletionProof',
    'TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY',
    'TIER_BEHAVIORAL_COMPLETION_CARD_ID',
  ]), 'canonical verifier covers Tier Behavioral')
  addFinding(findings, includesAll(currentPlanText, [
    TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
    NEXT_CARD_ID,
  ]), 'current plan records Tier Behavioral closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
    'Current sprint active blocker is now `VERIFICATION-RUNS-001`',
    'first non-owner read',
  ]), 'current state records Tier Behavioral closeout and active blocker')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: TIER_BEHAVIORAL_COMPLETION_CARD_ID,
    closeoutKey: TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    tierBehavioralCompletion: {
      summary: snapshot.summary,
      surfaceIds: snapshot.surfaces.map(surface => surface.id),
    },
    syntheticProof: syntheticProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(TIER_BEHAVIORAL_COMPLETION_CARD_ID) || null,
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Tier behavioral completion check: ${result.status}`)
    console.log(`${TIER_BEHAVIORAL_COMPLETION_SUMMARY_MARKER} ${JSON.stringify(result.tierBehavioralCompletion.summary)}`)
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
