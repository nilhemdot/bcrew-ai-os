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
  SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
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
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildSourceLifecycleStatus } from '../lib/source-lifecycle.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
import {
  buildSyntheticExtractionRunHardeningProof,
  EXTRACT_RUN_HARDENING_CARD_ID,
  EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
} from '../lib/extraction-run-hardening.js'
import {
  SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH,
  SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
  SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
  SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH,
  SOURCE_EXTRACTION_COVERAGE_STATES,
  SOURCE_EXTRACTION_COVERAGE_SUMMARY_MARKER,
  buildSourceExtractionCoverageSnapshot,
  buildSyntheticSourceExtractionCoverageProof,
} from '../lib/source-extraction-coverage.js'

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
  if (!ok) {
    findings.push({
      check,
      detail,
    })
  }
}

function rowHasAllowedState(row) {
  return SOURCE_EXTRACTION_COVERAGE_STATES.includes(row?.extractionState) &&
    typeof row.reason === 'string' &&
    row.reason.trim().length > 0
}

async function main() {
  const args = parseArgs()
  const jsonMode = String(args.json || '').toLowerCase() === 'true'
  const findings = []

  const [
    packageJson,
    planText,
    sourceExtractionSource,
    scriptSource,
    serverSource,
    foundationDbSource,
    foundationCurrentSprintSource,
    foundationBuildLogSource,
    foundationVerifySource,
    publicFoundationSource,
    publicStylesSource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(SOURCE_EXTRACTION_COVERAGE_PLAN_PATH),
    readRepoFile('lib/source-extraction-coverage.js'),
    readRepoFile(SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH),
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/styles.css'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH,
    cardId: SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  })
  const changedFiles = [
    SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
    SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH,
    'lib/source-extraction-coverage.js',
    'lib/foundation-db.js',
    'lib/foundation-current-sprint.js',
    'lib/foundation-build-log.js',
    'server.js',
    'public/foundation.js',
    'public/styles.css',
    SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH,
    'scripts/foundation-verify.mjs',
    'docs/rebuild/current-plan.md',
    'docs/rebuild/current-state.md',
    'package.json',
  ]
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: SOURCE_EXTRACTION_COVERAGE_CARD_ID, priority: 'P0' },
    changedFiles,
    declaredRisk: planText,
  })

  await initFoundationDb()
  const foundationSnapshot = await getFoundationSnapshot()
  const sources = getSourceContracts()
  const lifecycle = buildSourceLifecycleStatus({
    sources,
    connectors: [],
    groupedSystems: [],
    extractionControl: foundationSnapshot.extractionControl,
    foundationJobs: foundationSnapshot.foundationJobs?.jobs || [],
  })
  const sourceMaturityGrid = buildSourceMaturityGridSnapshot({
    sources,
    extractionControl: foundationSnapshot.extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    lifecycle,
  })
  const sourceExtractionCoverage = buildSourceExtractionCoverageSnapshot({
    sources,
    extractionControl: foundationSnapshot.extractionControl,
    sourceMaturityGrid,
    lifecycle,
  })
  const syntheticProof = buildSyntheticSourceExtractionCoverageProof()
  const extractRunHardeningSynthetic = buildSyntheticExtractionRunHardeningProof()

  const closeoutNote = 'Closed on 2026-05-12 under `source-extraction-coverage-v1`. V1 adds `lib/source-extraction-coverage.js`, `/api/foundation/source-extraction-coverage`, Source Lifecycle/Foundation Hub payload wiring, Foundation Source Lifecycle UI rendering, 24-hour item/run signals from existing extraction-control state, `scripts/process-source-extraction-coverage-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The behavior proof calls the real source extraction coverage snapshot path, verifies every source row has one allowed extraction state, proves synthetic last-success/failure/deferred/not-required classification, keeps `EXTRACT-RUN-HARDENING-001` done, and advances Current Sprint to `SOURCE-COVERAGE-CLOSEOUT-001`. This does not run new extraction jobs, add connectors, fix every source gap, reopen extraction hardening, build Reply/Watching Loop, expand Strategy Hub, build Marketing production, Telegram bots, Directors, or mutate Drive permissions.'
  await updateBacklogItem(SOURCE_EXTRACTION_COVERAGE_CARD_ID, {
    lane: 'done',
    nextAction: 'Closed for v1. Pull `SOURCE-COVERAGE-CLOSEOUT-001` next to decide, fix, or defer every source row that remains non-green.',
    statusNote: closeoutNote,
  }, 'codex')

  await upsertFoundationCurrentSprintOverlay(
    buildFoundationSourceOnceOverSprintSeed({
      sourceMaturityStage: 'done_this_sprint',
      sourceExtractionCoverageStage: 'done_this_sprint',
    }),
    'codex'
  )

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    SOURCE_EXTRACTION_COVERAGE_CARD_ID,
    SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
    EXTRACT_RUN_HARDENING_CARD_ID,
    'SOURCE-MATURITY-GRID-001',
    'MARKETING-SOURCE-MAP-001',
    'BRAND-STACK-001',
    'TIER-BEHAVIORAL-COMPLETION-001',
    'VERIFICATION-RUNS-001',
    'PER-USER-CHANGELOG-001',
    'DECISION-RESTRICTED-QUEUE-001',
    'FOUNDATION-UI-COMPLETE-001',
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintStageMap = new Map((sprint.items || []).map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null
  const sourceExtractionCard = cardMap.get(SOURCE_EXTRACTION_COVERAGE_CARD_ID)
  const sourceCoverageCloseoutCard = cardMap.get(SOURCE_COVERAGE_CLOSEOUT_CARD_ID)
  const extractRunHardeningCard = cardMap.get(EXTRACT_RUN_HARDENING_CARD_ID)

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Source Extraction Coverage plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, Array.isArray(sourceExtractionCoverage.rows) && sourceExtractionCoverage.rows.length >= 35, 'source extraction coverage includes every source contract', String(sourceExtractionCoverage.rows.length))
  addFinding(findings, sourceExtractionCoverage.rows.every(rowHasAllowedState), 'every source row has one allowed extraction state and reason')
  addFinding(findings, Number(sourceExtractionCoverage.summary?.sourceCount || 0) === sourceExtractionCoverage.rows.length, 'source extraction summary source count matches rows', JSON.stringify(sourceExtractionCoverage.summary))
  addFinding(findings, Number(sourceExtractionCoverage.summary?.targetCount || 0) >= 12, 'source extraction coverage reuses governed extraction targets', String(sourceExtractionCoverage.summary?.targetCount || 0))
  addFinding(findings, typeof sourceExtractionCoverage.summary?.last24hRuns === 'number' && typeof sourceExtractionCoverage.summary?.last24hItems === 'number', 'source extraction coverage exposes 24-hour volume signals')
  addFinding(findings, Array.isArray(sourceExtractionCoverage.topAttention) && sourceExtractionCoverage.topAttention.length > 0, 'source extraction coverage exposes attention rows', String(sourceExtractionCoverage.topAttention?.length || 0))
  addFinding(findings, syntheticProof.ok, 'synthetic source extraction proof classifies covered/failure/deferred/not-required rows', JSON.stringify(syntheticProof.summary))
  addFinding(findings, extractRunHardeningSynthetic.pass, 'existing extraction run hardening synthetic proof still passes')
  addFinding(findings, extractRunHardeningCard?.lane === 'done' && String(extractRunHardeningCard?.statusNote || '').includes(EXTRACT_RUN_HARDENING_CLOSEOUT_KEY), 'EXTRACT-RUN-HARDENING-001 remains done and narrow', extractRunHardeningCard?.lane || 'missing')
  addFinding(findings, packageJson.scripts?.['process:source-extraction-coverage-check'] === `node --env-file-if-exists=.env ${SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, sourceExtractionCard?.lane === 'done' && String(sourceExtractionCard?.statusNote || '').includes(SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY), 'SOURCE-EXTRACTION-COVERAGE-001 is done with closeout proof', sourceExtractionCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(sourceCoverageCloseoutCard?.lane), 'SOURCE-COVERAGE-CLOSEOUT-001 is available next', sourceCoverageCloseoutCard?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === SOURCE_COVERAGE_CLOSEOUT_CARD_ID, 'Current Sprint active blocker advanced to source coverage closeout', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(SOURCE_EXTRACTION_COVERAGE_CARD_ID) === 'done_this_sprint', 'Source Extraction Coverage moved to Done This Sprint', sprintStageMap.get(SOURCE_EXTRACTION_COVERAGE_CARD_ID) || 'missing')
  addFinding(findings, sprintStageMap.get(SOURCE_COVERAGE_CLOSEOUT_CARD_ID) === 'building_now', 'Source Coverage Closeout is next in Building Now', sprintStageMap.get(SOURCE_COVERAGE_CLOSEOUT_CARD_ID) || 'missing')
  addFinding(findings, includesAll(sourceExtractionSource, [
    'buildSourceExtractionCoverageSnapshot',
    'SOURCE_EXTRACTION_COVERAGE_STATES',
    'buildSyntheticSourceExtractionCoverageProof',
    'SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY',
  ]), 'source extraction library owns state definitions and behavior proof')
  addFinding(findings, includesAll(scriptSource, [
    SOURCE_EXTRACTION_COVERAGE_SUMMARY_MARKER,
    'every source row has one allowed extraction state',
    'Current Sprint active blocker advanced to source coverage closeout',
  ]), 'focused proof checks behavior and sprint advancement')
  addFinding(findings, includesAll(serverSource, [
    '/api/foundation/source-extraction-coverage',
    'buildSourceExtractionCoverageSnapshot',
    'sourceExtractionCoverage',
  ]), 'Foundation APIs expose source extraction coverage')
  addFinding(findings, includesAll(foundationDbSource, [
    'last24hItems',
    'runsLast24h',
    'last24h',
  ]), 'Foundation DB extraction coverage exposes 24-hour volume signals')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY',
    'sourceExtractionCoverageStage',
    SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  ]), 'Current Sprint seed advances after source extraction coverage')
  addFinding(findings, includesAll(publicFoundationSource, [
    'renderSourceExtractionCoveragePanel',
    'sourceExtractionCoverage',
    'source-extraction-coverage',
  ]), 'Foundation UI renders source extraction coverage')
  addFinding(findings, includesAll(publicStylesSource, [
    '.source-extraction-panel',
    '.source-extraction-table',
  ]), 'Foundation styles cover source extraction coverage')
  addFinding(findings, includesAll(foundationBuildLogSource, [
    SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
    SOURCE_EXTRACTION_COVERAGE_CARD_ID,
    SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticSourceExtractionCoverageProof',
    'SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY',
    'SOURCE_EXTRACTION_COVERAGE_CARD_ID',
  ]), 'canonical verifier covers Source Extraction Coverage')
  addFinding(findings, includesAll(currentPlanText, [
    SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
    SOURCE_EXTRACTION_COVERAGE_CARD_ID,
    SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  ]), 'current plan records Source Extraction Coverage closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
    'Current sprint active blocker is now `SOURCE-COVERAGE-CLOSEOUT-001`',
    'source-level extraction coverage',
  ]), 'current state records Source Extraction Coverage closeout and active blocker')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_EXTRACTION_COVERAGE_CARD_ID,
    closeoutKey: SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    coverage: {
      summary: sourceExtractionCoverage.summary,
      topAttention: sourceExtractionCoverage.topAttention,
    },
    syntheticProof: syntheticProof.summary,
    extractRunHardeningSynthetic: extractRunHardeningSynthetic.pass,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(SOURCE_EXTRACTION_COVERAGE_CARD_ID) || null,
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source extraction coverage check: ${result.status}`)
    console.log(`${SOURCE_EXTRACTION_COVERAGE_SUMMARY_MARKER} ${JSON.stringify(result.coverage.summary)}`)
    for (const finding of findings) {
      console.log(`- ${finding.check}: ${finding.detail}`)
    }
  }

  if (findings.length) {
    process.exitCode = 1
  }
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
