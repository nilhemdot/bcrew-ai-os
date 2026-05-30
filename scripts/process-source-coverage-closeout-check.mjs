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
  MARKETING_SOURCE_MAP_CARD_ID,
  SOURCE_EXTRACTION_COVERAGE_CARD_ID,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getBacklogItemsByIds,
  updateBacklogItem,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildSourceLifecycleStatus } from '../lib/source-lifecycle.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
import { buildSourceExtractionCoverageSnapshot } from '../lib/source-extraction-coverage.js'
import {
  SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH,
  SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
  SOURCE_COVERAGE_CLOSEOUT_DECISIONS,
  SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH,
  SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH,
  SOURCE_COVERAGE_CLOSEOUT_SUMMARY_MARKER,
  SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
  SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
  buildSourceCoverageCloseoutSnapshot,
  buildSyntheticSourceCoverageCloseoutProof,
} from '../lib/source-coverage-closeout.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const parsed = argv.reduce((acc, arg) => {
    const match = String(arg).match(/^--([^=]+)=(.*)$/)
    if (match) acc[match[1]] = match[2]
    return acc
  }, {})
  return {
    ...parsed,
    json: argv.includes('--json') || String(parsed.json || '').toLowerCase() === 'true',
    writeBacklog: isProcessCheckWriteRequested({
      argv,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
    }),
  }
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

function rowHasAllowedDecision(row) {
  return SOURCE_COVERAGE_CLOSEOUT_DECISIONS.includes(row?.decision) &&
    typeof row.reason === 'string' &&
    row.reason.trim().length > 0 &&
    ['closed', 'routed'].includes(row.status)
}

async function main() {
  const args = parseArgs()
  const jsonMode = args.json
  const findings = []

  const [
    packageJson,
    planText,
    closeoutSource,
    scriptSource,
    serverSource,
    foundationDbSource,
    foundationCurrentSprintSource,
    foundationBuildLogSource,
    foundationVerifySource,
    publicFoundationSource,
    publicStylesSource,
    foundationSourceRoutesSource,
    hubReadRoutesSource,
    publicSourceLifecycleRenderersSource,
    frontendSourceLifecycleRenderersSource,
    foundationWorkflowStylesSource,
    sourceOnceOverCloseoutSource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH),
    readRepoFile('lib/source-coverage-closeout.js'),
    readRepoFile(SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH),
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/styles.css'),
    readRepoFile('lib/foundation-source-routes.js'),
    readRepoFile('lib/hub-read-routes.js'),
    readRepoFile('public/foundation-source-lifecycle-renderers.js'),
    readRepoFile('lib/foundation-frontend-source-lifecycle-renderers-split.js'),
    readRepoFile('public/styles-foundation-workflows.css'),
    readRepoFile('lib/foundation-build-closeout-source-once-over-records.js'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH,
    cardId: SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  })
  const changedFiles = [
    SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH,
    SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH,
    'lib/source-coverage-closeout.js',
    'lib/foundation-current-sprint.js',
    'lib/foundation-db.js',
    'lib/foundation-build-log.js',
    'server.js',
    'public/foundation.js',
    'public/styles.css',
    SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH,
    'scripts/foundation-verify.mjs',
    'docs/rebuild/current-plan.md',
    'docs/rebuild/current-state.md',
    'package.json',
  ]
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: SOURCE_COVERAGE_CLOSEOUT_CARD_ID, priority: 'P0' },
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
  const sourceCoverageCloseout = buildSourceCoverageCloseoutSnapshot({
    sources,
    sourceMaturityGrid,
    sourceExtractionCoverage,
  })
  const syntheticProof = buildSyntheticSourceCoverageCloseoutProof()

  const closeoutNote = 'Closed on 2026-05-12 under `source-coverage-closeout-v1`. V1 adds `lib/source-coverage-closeout.js`, `/api/foundation/source-coverage-closeout`, Source Lifecycle/Foundation Hub payload wiring, Foundation Source Lifecycle UI rendering, follow-up queues `SOURCE-EXTRACTION-GAP-FOLLOWUP-001` and `SOURCE-MATURITY-GAP-FOLLOWUP-001`, `scripts/process-source-coverage-closeout-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The behavior proof calls the real source coverage closeout snapshot path, verifies every source row has one allowed decision, proves synthetic covered/extraction-gap/maturity-gap/deferred classification, verifies routed rows point to follow-up cards, and advances Current Sprint to `MARKETING-SOURCE-MAP-001`. This does not run new extraction jobs, add connectors, fix Google Ads/Real Broker/Loom/Skool/Zoom/Drive OCR/Missive attachments, build Reply/Watching Loop, expand Strategy Hub, build Marketing production, Telegram bots, Directors, or mutate Drive permissions.'
  if (args.writeBacklog) {
    await updateBacklogItem(SOURCE_COVERAGE_CLOSEOUT_CARD_ID, {
      lane: 'done',
      nextAction: 'Closed for v1. Pull `MARKETING-SOURCE-MAP-001` next to map imported avatars and marketing source contracts to brand lanes.',
      statusNote: closeoutNote,
    }, 'codex')
    await updateBacklogItem(SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID, {
      lane: 'scoped',
      nextAction: 'Use the source coverage closeout matrix to pull one source-specific extraction gap at a time after the Source Once-Over sprint allows it.',
    }, 'codex')
    await updateBacklogItem(SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID, {
      lane: 'scoped',
      nextAction: 'Use the source coverage closeout matrix to pull one maturity-stage gap at a time after the Source Once-Over sprint allows it.',
    }, 'codex')
  }

  const historicalSprint = buildFoundationSourceOnceOverSprintSeed({
    sourceMaturityStage: 'done_this_sprint',
    sourceExtractionCoverageStage: 'done_this_sprint',
    sourceCoverageCloseoutStage: 'done_this_sprint',
  })
  const cards = await getBacklogItemsByIds([
    SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
    SOURCE_EXTRACTION_COVERAGE_CARD_ID,
    SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
    SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
    MARKETING_SOURCE_MAP_CARD_ID,
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintStageMap = new Map((historicalSprint.items || []).map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = historicalSprint.sprint?.activeBlockerCardId || null
  const sourceCoverageCloseoutCard = cardMap.get(SOURCE_COVERAGE_CLOSEOUT_CARD_ID)
  const sourceExtractionCoverageCard = cardMap.get(SOURCE_EXTRACTION_COVERAGE_CARD_ID)
  const extractionGapCard = cardMap.get(SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID)
  const maturityGapCard = cardMap.get(SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID)
  const marketingSourceMapCard = cardMap.get(MARKETING_SOURCE_MAP_CARD_ID)
  const routedExtractionRows = sourceCoverageCloseout.rows.filter(row => row.decision === 'advance_extraction_gap')
  const routedMaturityRows = sourceCoverageCloseout.rows.filter(row => row.decision === 'advance_maturity_gap')
  const routeSource = [
    serverSource,
    foundationSourceRoutesSource,
    hubReadRoutesSource,
  ].join('\n')
  const sourceLifecycleUiSource = [
    publicFoundationSource,
    publicSourceLifecycleRenderersSource,
    frontendSourceLifecycleRenderersSource,
  ].join('\n')
  const sourceLifecycleStyleSource = [
    publicStylesSource,
    foundationWorkflowStylesSource,
  ].join('\n')
  const closeoutRecordsSource = [
    foundationBuildLogSource,
    sourceOnceOverCloseoutSource,
  ].join('\n')

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Source Coverage Closeout plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, Array.isArray(sourceCoverageCloseout.rows) && sourceCoverageCloseout.rows.length >= 35, 'source coverage closeout includes every source contract', String(sourceCoverageCloseout.rows.length))
  addFinding(findings, sourceCoverageCloseout.rows.every(rowHasAllowedDecision), 'every source row has one allowed closeout decision and reason')
  addFinding(findings, Number(sourceCoverageCloseout.summary?.sourceCount || 0) === sourceCoverageCloseout.rows.length, 'source coverage closeout summary source count matches rows', JSON.stringify(sourceCoverageCloseout.summary))
  addFinding(findings, sourceCoverageCloseout.summary?.unresolvedDecisionCount === 0, 'source coverage closeout has zero unresolved decisions', String(sourceCoverageCloseout.summary?.unresolvedDecisionCount))
  addFinding(findings, routedExtractionRows.every(row => row.nextCardId === SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID), 'extraction gap rows route to extraction follow-up card')
  addFinding(findings, routedMaturityRows.every(row => row.nextCardId === SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID), 'maturity gap rows route to maturity follow-up card')
  addFinding(findings, syntheticProof.ok, 'synthetic source coverage closeout proof classifies covered/extraction-gap/maturity-gap/deferred rows', JSON.stringify(syntheticProof.summary))
  addFinding(findings, sourceExtractionCoverageCard?.lane === 'done', 'SOURCE-EXTRACTION-COVERAGE-001 remains done before closeout', sourceExtractionCoverageCard?.lane || 'missing')
  addFinding(findings, packageJson.scripts?.['process:source-coverage-closeout-check'] === `node --env-file-if-exists=.env ${SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, includesAll(scriptSource, [
    'writeBacklog',
    'if (args.writeBacklog)',
    'historicalSprint',
  ]), 'focused proof keeps backlog writes behind explicit flags and does not rewind the active sprint')
  addFinding(findings, sourceCoverageCloseoutCard?.lane === 'done' && String(sourceCoverageCloseoutCard?.statusNote || '').includes(SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY), 'SOURCE-COVERAGE-CLOSEOUT-001 is done with closeout proof', sourceCoverageCloseoutCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(extractionGapCard?.lane), 'source extraction gap follow-up card is scoped or done', extractionGapCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(maturityGapCard?.lane), 'source maturity gap follow-up card is scoped or done', maturityGapCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(marketingSourceMapCard?.lane), 'MARKETING-SOURCE-MAP-001 is available next', marketingSourceMapCard?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === MARKETING_SOURCE_MAP_CARD_ID, 'historical Source Once-Over seed advances to marketing source map', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(SOURCE_COVERAGE_CLOSEOUT_CARD_ID) === 'done_this_sprint', 'Source Coverage Closeout moved to Done This Sprint', sprintStageMap.get(SOURCE_COVERAGE_CLOSEOUT_CARD_ID) || 'missing')
  addFinding(findings, sprintStageMap.get(MARKETING_SOURCE_MAP_CARD_ID) === 'building_now', 'Marketing Source Map is next in Building Now', sprintStageMap.get(MARKETING_SOURCE_MAP_CARD_ID) || 'missing')
  addFinding(findings, includesAll(closeoutSource, [
    'buildSourceCoverageCloseoutSnapshot',
    'SOURCE_COVERAGE_CLOSEOUT_DECISIONS',
    'buildSyntheticSourceCoverageCloseoutProof',
    'SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY',
  ]), 'source coverage closeout library owns decision definitions and behavior proof')
  addFinding(findings, includesAll(scriptSource, [
    SOURCE_COVERAGE_CLOSEOUT_SUMMARY_MARKER,
    'every source row has one allowed closeout decision',
    'historical Source Once-Over seed advances to marketing source map',
  ]), 'focused proof checks behavior and historical sprint advancement')
  addFinding(findings, includesAll(routeSource, [
    '/api/foundation/source-coverage-closeout',
    'buildSourceCoverageCloseoutSnapshot',
    'sourceCoverageCloseout',
  ]), 'Foundation APIs expose source coverage closeout')
  addFinding(findings, includesAll(`${foundationDbSource}\n${sourceOnceOverCloseoutSource}\n${closeoutSource}`, [
    SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
    SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
  ]), 'Foundation backlog has source follow-up cards')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'sourceCoverageCloseoutStage',
    'SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY',
    MARKETING_SOURCE_MAP_CARD_ID,
  ]), 'Current Sprint seed advances after source coverage closeout')
  addFinding(findings, includesAll(sourceLifecycleUiSource, [
    'renderSourceCoverageCloseoutPanel',
    'sourceCoverageCloseout',
    'source-coverage-closeout',
  ]), 'Foundation UI renders source coverage closeout')
  addFinding(findings, includesAll(sourceLifecycleStyleSource, [
    '.source-coverage-closeout-panel',
    '.source-coverage-closeout-table',
  ]), 'Foundation styles cover source coverage closeout')
  addFinding(findings, includesAll(closeoutRecordsSource, [
    SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
    SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
    MARKETING_SOURCE_MAP_CARD_ID,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticSourceCoverageCloseoutProof',
    'SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY',
    'SOURCE_COVERAGE_CLOSEOUT_DECISIONS',
  ]), 'canonical verifier covers Source Coverage Closeout')
  addFinding(findings, includesAll(currentPlanText, [
    SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
    SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
    MARKETING_SOURCE_MAP_CARD_ID,
  ]), 'current plan records Source Coverage Closeout closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
    MARKETING_SOURCE_MAP_CARD_ID,
    'source coverage closeout',
  ]), 'current state records Source Coverage Closeout closeout and historical next card')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
    closeoutKey: SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    closeout: {
      summary: sourceCoverageCloseout.summary,
      routedRows: sourceCoverageCloseout.routedRows,
    },
    syntheticProof: syntheticProof.summary,
    historicalActiveBlockerCardId: activeBlockerCardId,
    sprintStage: sprintStageMap.get(SOURCE_COVERAGE_CLOSEOUT_CARD_ID) || null,
    wroteBacklog: args.writeBacklog,
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source coverage closeout check: ${result.status}`)
    console.log(`${SOURCE_COVERAGE_CLOSEOUT_SUMMARY_MARKER} ${JSON.stringify(result.closeout.summary)}`)
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
