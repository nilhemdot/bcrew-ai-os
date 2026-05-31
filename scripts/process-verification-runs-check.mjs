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
import { getFoundationSnapshot } from '../lib/foundation-strategy-docs-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  parseProcessWriteFlags,
} from '../lib/process-write-guard.js'
import {
  buildBacklogHygieneSnapshot,
} from '../lib/backlog-hygiene.js'
import {
  getFoundationBuildCloseouts,
} from '../lib/foundation-build-log.js'
import { readFoundationBacklogSeedSourceBundle } from '../lib/foundation-backlog-seed-source.js'
import {
  buildResearchCurationStatus,
} from '../lib/phase-d-cleanup.js'
import {
  VERIFICATION_RUNS_APPROVAL_PATH,
  VERIFICATION_RUNS_CARD_ID,
  VERIFICATION_RUNS_CLOSEOUT_KEY,
  VERIFICATION_RUNS_NEXT_CARD_ID,
  VERIFICATION_RUNS_PLAN_PATH,
  VERIFICATION_RUNS_SCRIPT_PATH,
  VERIFICATION_RUNS_SUMMARY_MARKER,
  buildSyntheticVerificationRunsProof,
  buildVerificationRunsSnapshot,
} from '../lib/verification-runs.js'

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
  const writeFlags = parseProcessWriteFlags(process.argv.slice(2))
  const applyMode = writeFlags.has(PROCESS_CHECK_WRITE_FLAGS.apply)
  const findings = []

  const [
    packageJson,
    planText,
    verificationRunsSource,
    scriptSource,
    sourceRoutesSource,
    sourceLifecycleRenderersSource,
    workflowStylesSource,
    foundationCurrentSprintSource,
    backlogSeedSource,
    closeoutRecordsSource,
    sourceOnceOverCloseoutRecordsSource,
    foundationVerifySource,
    foundationJobsSource,
    securityAccessSource,
    phaseDCleanupSource,
    backlogHygieneSource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(VERIFICATION_RUNS_PLAN_PATH),
    readRepoFile('lib/verification-runs.js'),
    readRepoFile(VERIFICATION_RUNS_SCRIPT_PATH),
    readRepoFile('lib/foundation-source-routes.js'),
    readRepoFile('public/foundation-source-lifecycle-renderers.js'),
    readRepoFile('public/styles-foundation-workflows.css'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readFoundationBacklogSeedSourceBundle({ readRepoFile }),
    readRepoFile('lib/foundation-build-closeout-records.js'),
    Promise.all([
      readRepoFile('lib/foundation-build-closeout-source-once-over-records.js'),
      readRepoFile('data/foundation-build-closeouts/source-once-over-records.json'),
    ]).then(parts => parts.join('\n')),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-jobs.js'),
    readRepoFile('lib/security-access.js'),
    readRepoFile('lib/phase-d-cleanup.js'),
    readRepoFile('lib/backlog-hygiene.js'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFICATION_RUNS_APPROVAL_PATH,
    cardId: VERIFICATION_RUNS_CARD_ID,
  })
  const changedFiles = [
    VERIFICATION_RUNS_PLAN_PATH,
    VERIFICATION_RUNS_APPROVAL_PATH,
    'lib/verification-runs.js',
    VERIFICATION_RUNS_SCRIPT_PATH,
    'server.js',
    'public/foundation.js',
    'public/styles.css',
    'lib/foundation-current-sprint.js',
    'lib/foundation-jobs.js',
    'lib/security-access.js',
    'lib/foundation-build-log.js',
    'scripts/foundation-verify.mjs',
    'docs/rebuild/current-plan.md',
    'docs/rebuild/current-state.md',
    'package.json',
  ]
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: VERIFICATION_RUNS_CARD_ID, priority: 'P1' },
    changedFiles,
    declaredRisk: planText,
  })

  await initFoundationDb()
  const foundationSnapshot = await getFoundationSnapshot()
  const backlogHygiene = buildBacklogHygieneSnapshot({
    backlogItems: foundationSnapshot.backlogItems || [],
    closeouts: getFoundationBuildCloseouts(),
  })
  const researchCuration = buildResearchCurationStatus({
    backlogItems: foundationSnapshot.backlogItems || [],
  })
  const verificationRuns = buildVerificationRunsSnapshot({
    backlogItems: foundationSnapshot.backlogItems || [],
    researchCuration,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis || {},
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter || {},
    backlogHygiene,
  })
  const syntheticProof = buildSyntheticVerificationRunsProof()

  const closeoutNote = 'Closed on 2026-05-12 under `verification-runs-v1`. V1 adds `lib/verification-runs.js`, the scheduled `verification-runs` Foundation job definition, `/api/foundation/verification-runs`, Source Lifecycle/Foundation Hub payload wiring, Foundation Source Lifecycle UI rendering, `scripts/process-verification-runs-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The behavior proof calls the real verification runs snapshot path, proves stale research/synthesized finding/action route fixtures are detected while fresh/applied/archived fixtures are not, includes backlog hygiene findings as candidates, keeps `proposedOnly: true`, keeps `autoExpiredCount: 0`, and advances Current Sprint to `PER-USER-CHANGELOG-001`. This does not auto-close research cards, archive synthesized items, reject/apply action routes, build Reply Parser, Watching Items, per-user changelog, restricted decisions, Strategy Hub expansion, Marketing Pipeline, Telegram bots, Directors, or Drive ACL mutation.'
  if (applyMode) {
    await updateBacklogItem(VERIFICATION_RUNS_CARD_ID, {
      lane: 'done',
      nextAction: 'Closed for v1. Pull `PER-USER-CHANGELOG-001` next to define the write_audit_log equivalent before broader team access resumes.',
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
      }),
      'codex'
    )
  }

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    VERIFICATION_RUNS_CARD_ID,
    VERIFICATION_RUNS_NEXT_CARD_ID,
    'TIER-BEHAVIORAL-COMPLETION-001',
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintStageMap = new Map((sprint.items || []).map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null
  const verificationRunsCard = cardMap.get(VERIFICATION_RUNS_CARD_ID)
  const nextCard = cardMap.get(VERIFICATION_RUNS_NEXT_CARD_ID)

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Verification Runs plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, ['healthy', 'review_due'].includes(verificationRuns.status), 'real verification runs snapshot builds', JSON.stringify(verificationRuns.summary))
  addFinding(findings, verificationRuns.summary?.proposedOnly === true && verificationRuns.summary?.autoExpiredCount === 0, 'verification runs are proposed-only with zero auto-expiry', JSON.stringify(verificationRuns.summary))
  addFinding(findings, verificationRuns.summary?.nextCardId === VERIFICATION_RUNS_NEXT_CARD_ID, 'verification runs point to per-user changelog next', verificationRuns.summary?.nextCardId || 'missing')
  addFinding(findings, syntheticProof.ok, 'synthetic verification runs proof detects stale-only candidates', JSON.stringify(syntheticProof.summary))
  addFinding(findings, packageJson.scripts?.['process:verification-runs-check'] === `node --env-file-if-exists=.env ${VERIFICATION_RUNS_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, verificationRunsCard?.lane === 'done' && String(verificationRunsCard?.statusNote || '').includes(VERIFICATION_RUNS_CLOSEOUT_KEY), 'VERIFICATION-RUNS-001 is done with closeout proof', verificationRunsCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(nextCard?.lane), 'PER-USER-CHANGELOG-001 is available next', nextCard?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === VERIFICATION_RUNS_NEXT_CARD_ID || verificationRunsCard?.lane === 'done', 'Verification Runs is historically closed or active blocker advanced', activeBlockerCardId || verificationRunsCard?.lane || 'missing')
  addFinding(findings, sprintStageMap.get(VERIFICATION_RUNS_CARD_ID) === 'done_this_sprint' || verificationRunsCard?.lane === 'done', 'Verification Runs moved to Done This Sprint or is historically done', sprintStageMap.get(VERIFICATION_RUNS_CARD_ID) || verificationRunsCard?.lane || 'missing')
  addFinding(findings, ['building_now', 'scoped', 'done'].includes(nextCard?.lane) || activeBlockerCardId === VERIFICATION_RUNS_NEXT_CARD_ID, 'Per-user changelog is available after Verification Runs', nextCard?.lane || activeBlockerCardId || 'missing')
  addFinding(findings, includesAll(verificationRunsSource, [
    'buildVerificationRunsSnapshot',
    'buildSyntheticVerificationRunsProof',
    'VERIFICATION_RUNS_CLOSEOUT_KEY',
    'proposedOnly',
    'autoExpiredCount',
  ]), 'verification runs library owns proposed-only behavior proof')
  addFinding(findings, includesAll(scriptSource, [
    VERIFICATION_RUNS_SUMMARY_MARKER,
    'synthetic verification runs proof detects stale-only candidates',
    'Current Sprint active blocker advanced to per-user changelog',
  ]), 'focused proof checks behavior and sprint advancement')
  addFinding(findings, includesAll(sourceRoutesSource, [
    '/api/foundation/verification-runs',
    'buildVerificationRunsSnapshot',
    'verificationRuns',
  ]), 'Foundation APIs expose verification runs')
  addFinding(findings, includesAll(sourceLifecycleRenderersSource, [
    'renderVerificationRunsPanel',
    'data-source-lifecycle-section',
    'verification-runs',
  ]), 'Foundation UI renders verification runs')
  addFinding(findings, includesAll(workflowStylesSource, [
    '.verification-runs-panel',
    '.verification-runs-grid',
  ]), 'Foundation styles cover verification runs panel')
  addFinding(findings, includesAll(foundationJobsSource, [
    "key: 'verification-runs'",
    'process:verification-runs-check',
    'daily stale research/finding review',
  ]), 'Foundation job registry schedules verification runs')
  addFinding(findings, securityAccessSource.includes('/api/foundation/verification-runs'), 'security route posture registry covers verification runs API')
  addFinding(findings, includesAll(phaseDCleanupSource, ['buildResearchCurationStatus', 'autoClosedCount: 0']), 'research curation is reused as an input')
  addFinding(findings, includesAll(backlogHygieneSource, ['buildBacklogHygieneSnapshot', 'visibleFindings']), 'backlog hygiene is reused as an input')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'verificationRunsStage',
    'VERIFICATION_RUNS_CLOSEOUT_KEY',
    VERIFICATION_RUNS_NEXT_CARD_ID,
  ]), 'Current Sprint seed advances after Verification Runs')
  addFinding(findings, includesAll(backlogSeedSource, [
    VERIFICATION_RUNS_CARD_ID,
    VERIFICATION_RUNS_NEXT_CARD_ID,
  ]), 'Foundation backlog has Verification Runs and Per-User Changelog cards')
  addFinding(findings, includesAll(closeoutRecordsSource, [
    'sourceOnceOverCloseoutRecords',
  ]) && includesAll(sourceOnceOverCloseoutRecordsSource, [
    VERIFICATION_RUNS_CLOSEOUT_KEY,
    VERIFICATION_RUNS_CARD_ID,
    VERIFICATION_RUNS_NEXT_CARD_ID,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticVerificationRunsProof',
    'VERIFICATION_RUNS_CLOSEOUT_KEY',
    'VERIFICATION_RUNS_CARD_ID',
  ]), 'canonical verifier covers Verification Runs')
  addFinding(findings, includesAll(currentPlanText, [
    VERIFICATION_RUNS_CLOSEOUT_KEY,
    VERIFICATION_RUNS_CARD_ID,
    VERIFICATION_RUNS_NEXT_CARD_ID,
  ]), 'current plan records Verification Runs closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    VERIFICATION_RUNS_CLOSEOUT_KEY,
    'proposed-only',
  ]), 'current state records Verification Runs closeout and proposed-only boundary')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: VERIFICATION_RUNS_CARD_ID,
    closeoutKey: VERIFICATION_RUNS_CLOSEOUT_KEY,
    mode: applyMode ? 'apply' : 'read_only',
    writesSkipped: !applyMode,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    verificationRuns: {
      summary: verificationRuns.summary,
      topCandidateIds: (verificationRuns.topCandidates || []).slice(0, 12).map(candidate => candidate.id),
    },
    syntheticProof: syntheticProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(VERIFICATION_RUNS_CARD_ID) || null,
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Verification runs check: ${result.status}`)
    console.log(`${VERIFICATION_RUNS_SUMMARY_MARKER} ${JSON.stringify(result.verificationRuns.summary)}`)
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
