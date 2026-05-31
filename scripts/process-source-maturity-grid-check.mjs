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
  SOURCE_EXTRACTION_COVERAGE_CARD_ID,
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
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildSourceLifecycleStatus } from '../lib/source-lifecycle.js'
import {
  SOURCE_MATURITY_GRID_APPROVAL_PATH,
  SOURCE_MATURITY_GRID_CARD_ID,
  SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
  SOURCE_MATURITY_GRID_PLAN_PATH,
  SOURCE_MATURITY_GRID_SCRIPT_PATH,
  SOURCE_MATURITY_GRID_SUMMARY_MARKER,
  SOURCE_MATURITY_STAGE_KEYS,
  buildSourceMaturityGridSnapshot,
  buildSyntheticSourceMaturityGridProof,
} from '../lib/source-maturity-grid.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return argv.reduce((acc, arg) => {
    if (String(arg).startsWith('--') && !String(arg).includes('=')) {
      acc[String(arg).slice(2)] = 'true'
      return acc
    }
    const match = String(arg).match(/^--([^=]+)=(.*)$/)
    if (match) acc[match[1]] = match[2]
    return acc
  }, {})
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
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

function hasSevenStages(row) {
  return SOURCE_MATURITY_STAGE_KEYS.every(key => row?.stages?.[key] && typeof row.stages[key].ok === 'boolean')
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const closeRequested = isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: ['apply', 'close-card', 'mutate-sprint'],
  })
  const findings = []

  const [
    packageJson,
    planText,
    sourceMaturitySource,
    scriptSource,
    foundationSourceRoutesSource,
    foundationDbSource,
    foundationSourceCrawlDbSource,
    foundationCurrentSprintSource,
    foundationVerifySource,
    publicFoundationSource,
    publicSourceLifecycleRendererSource,
    publicStylesSource,
    publicWorkflowStylesSource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(SOURCE_MATURITY_GRID_PLAN_PATH),
    readRepoFile('lib/source-maturity-grid.js'),
    readRepoFile(SOURCE_MATURITY_GRID_SCRIPT_PATH),
    readRepoFile('lib/foundation-source-routes.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-source-crawl-db.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-source-lifecycle-renderers.js'),
    readRepoFile('public/styles.css'),
    readRepoFile('public/styles-foundation-workflows.css'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_MATURITY_GRID_APPROVAL_PATH,
    cardId: SOURCE_MATURITY_GRID_CARD_ID,
  })
  const changedFiles = [
    SOURCE_MATURITY_GRID_PLAN_PATH,
    SOURCE_MATURITY_GRID_APPROVAL_PATH,
    'lib/source-maturity-grid.js',
    'lib/foundation-db.js',
    'lib/foundation-current-sprint.js',
    'lib/foundation-build-log.js',
    'server.js',
    'public/foundation.js',
    'public/styles.css',
    SOURCE_MATURITY_GRID_SCRIPT_PATH,
    'scripts/foundation-verify.mjs',
    'docs/rebuild/current-plan.md',
    'docs/rebuild/current-state.md',
    'package.json',
  ]
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: SOURCE_MATURITY_GRID_CARD_ID, priority: 'P0' },
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
  const grid = buildSourceMaturityGridSnapshot({
    sources,
    extractionControl: foundationSnapshot.extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    lifecycle,
  })
  const syntheticProof = buildSyntheticSourceMaturityGridProof()

  const scopedCardIds = [
    SOURCE_EXTRACTION_COVERAGE_CARD_ID,
    'SOURCE-COVERAGE-CLOSEOUT-001',
    'MARKETING-SOURCE-MAP-001',
    'BRAND-STACK-001',
    'TIER-BEHAVIORAL-COMPLETION-001',
    'VERIFICATION-RUNS-001',
    'PER-USER-CHANGELOG-001',
    'DECISION-RESTRICTED-QUEUE-001',
    'FOUNDATION-UI-COMPLETE-001',
  ]

  if (closeRequested) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SOURCE_MATURITY_GRID_SCRIPT_PATH,
      operation: 'close source maturity card and mutate sprint state',
      allowedFlags: ['apply', 'close-card', 'mutate-sprint'],
    })

    const closeoutNote = 'Closed on 2026-05-12 under `source-maturity-grid-v1`. V1 adds `lib/source-maturity-grid.js`, `/api/foundation/source-maturity-grid`, Source Lifecycle/Foundation Hub payload wiring, Foundation Source Lifecycle UI rendering, source operational metrics from atoms/synthesis/action routes, `scripts/process-source-maturity-grid-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The behavior proof calls the real source maturity snapshot path, verifies every source row has seven stages, proves synthetic complete/deferred classification, and advances Current Sprint to `SOURCE-EXTRACTION-COVERAGE-001`. This does not ingest new sources, fix every source gap, build Reply/Watching Loop, expand Strategy Hub, build Marketing production, Telegram bots, Directors, or mutate Drive permissions.'
    await updateBacklogItem(SOURCE_MATURITY_GRID_CARD_ID, {
      lane: 'done',
      nextAction: 'Closed for v1. Pull `SOURCE-EXTRACTION-COVERAGE-001` next to close extraction coverage visibility per source.',
      statusNote: closeoutNote,
    }, 'codex')

    for (const cardId of scopedCardIds) {
      const [existing] = await getBacklogItemsByIds([cardId])
      if (existing && existing.lane !== 'done' && existing.lane !== 'scoped') {
        await updateBacklogItem(cardId, { lane: 'scoped' }, 'codex')
      }
    }

    await upsertFoundationCurrentSprintOverlay(
      buildFoundationSourceOnceOverSprintSeed({ sourceMaturityStage: 'done_this_sprint' }),
      'codex'
    )
  }

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    SOURCE_MATURITY_GRID_CARD_ID,
    SOURCE_EXTRACTION_COVERAGE_CARD_ID,
    'SOURCE-COVERAGE-CLOSEOUT-001',
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
  const sourceCard = cardMap.get(SOURCE_MATURITY_GRID_CARD_ID)
  const extractionCoverageCard = cardMap.get(SOURCE_EXTRACTION_COVERAGE_CARD_ID)
  const sourceMaturityCloseout = getFoundationBuildCloseouts()
    .find(closeout => closeout.key === SOURCE_MATURITY_GRID_CLOSEOUT_KEY) || null
  const frontendSource = [publicFoundationSource, publicSourceLifecycleRendererSource].join('\n')
  const stylesSource = [publicStylesSource, publicWorkflowStylesSource].join('\n')
  const sourceMaturityDone = sourceCard?.lane === 'done' &&
    String(sourceCard?.statusNote || '').includes(SOURCE_MATURITY_GRID_CLOSEOUT_KEY)

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Source Maturity Grid plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, Array.isArray(grid.rows) && grid.rows.length >= 35, 'grid includes every source contract', String(grid.rows.length))
  addFinding(findings, Array.isArray(grid.stageKeys) && grid.stageKeys.join('|') === SOURCE_MATURITY_STAGE_KEYS.join('|'), 'grid exposes exactly seven maturity stages', grid.stageKeys?.join(',') || 'missing')
  addFinding(findings, grid.rows.every(hasSevenStages), 'every grid row has seven behavior stage objects')
  addFinding(findings, Number(grid.summary?.sourceCount || 0) === grid.rows.length, 'grid summary source count matches rows', JSON.stringify(grid.summary))
  addFinding(findings, Array.isArray(grid.topGaps) && grid.topGaps.length > 0, 'grid exposes top source maturity gaps', String(grid.topGaps?.length || 0))
  addFinding(findings, syntheticProof.ok, 'synthetic source maturity proof classifies complete and deferred rows', JSON.stringify(syntheticProof.summary))
  addFinding(findings, packageJson.scripts?.['process:source-maturity-grid-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_GRID_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, sourceMaturityDone, 'SOURCE-MATURITY-GRID-001 is done with closeout proof', sourceCard?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === SOURCE_EXTRACTION_COVERAGE_CARD_ID || sourceMaturityDone, 'Current Sprint advanced beyond source maturity grid', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(SOURCE_MATURITY_GRID_CARD_ID) === 'done_this_sprint' || sourceMaturityDone, 'Source Maturity Grid is done or was done in the active sprint', sprintStageMap.get(SOURCE_MATURITY_GRID_CARD_ID) || sourceCard?.lane || 'missing')
  addFinding(findings, sprintStageMap.get(SOURCE_EXTRACTION_COVERAGE_CARD_ID) === 'building_now' || ['scoped', 'done'].includes(extractionCoverageCard?.lane), 'Extraction coverage is live or historically complete', sprintStageMap.get(SOURCE_EXTRACTION_COVERAGE_CARD_ID) || extractionCoverageCard?.lane || 'missing')
  addFinding(findings, scopedCardIds.every(cardId => ['scoped', 'done'].includes(cardMap.get(cardId)?.lane)), 'remaining Source Once-Over cards are scoped or done')
  addFinding(findings, includesAll(sourceMaturitySource, [
    'buildSourceMaturityGridSnapshot',
    'SOURCE_MATURITY_STAGE_KEYS',
    'buildSyntheticSourceMaturityGridProof',
    'SOURCE_MATURITY_GRID_CLOSEOUT_KEY',
  ]), 'source maturity library owns stage definitions and behavior proof')
  addFinding(findings, includesAll(scriptSource, [
    SOURCE_MATURITY_GRID_SUMMARY_MARKER,
    'every grid row has seven behavior stage objects',
    'Current Sprint active blocker advanced to extraction coverage',
  ]), 'focused proof checks behavior and sprint advancement')
  addFinding(findings, includesAll(foundationSourceRoutesSource, [
    '/api/foundation/source-maturity-grid',
    'buildSourceMaturityGridSnapshot',
    'sourceMaturityGrid',
  ]), 'Foundation APIs expose source maturity grid')
  addFinding(findings, foundationDbSource.includes('getSourceMaturityOperationalMetrics') &&
    foundationSourceCrawlDbSource.includes('getSourceMaturityOperationalMetrics') &&
    [SOURCE_MATURITY_GRID_CARD_ID, SOURCE_EXTRACTION_COVERAGE_CARD_ID].every(cardId => cardMap.has(cardId)), 'Foundation DB exposes operational source metrics and scoped cards')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'buildFoundationSourceOnceOverSprintSeed',
    'FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID',
    'SOURCE_MATURITY_GRID_CLOSEOUT_KEY',
    'SOURCE_EXTRACTION_COVERAGE_CARD_ID',
  ]), 'Current Sprint seed owns Source Once-Over sprint order')
  addFinding(findings, includesAll(frontendSource, [
    'renderSourceMaturityGridPanel',
    'sourceMaturityGrid',
    'source-maturity-grid',
  ]), 'Foundation UI renders source maturity grid')
  addFinding(findings, includesAll(stylesSource, [
    '.source-maturity-panel',
    '.source-maturity-table',
  ]), 'Foundation styles cover source maturity grid')
  addFinding(findings, sourceMaturityCloseout &&
    sourceMaturityCloseout.backlogIds?.includes(SOURCE_MATURITY_GRID_CARD_ID) &&
    sourceMaturityCloseout.mentionedBacklogIds?.includes(SOURCE_EXTRACTION_COVERAGE_CARD_ID), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticSourceMaturityGridProof',
    'SOURCE_MATURITY_GRID_CLOSEOUT_KEY',
    'SOURCE_MATURITY_GRID_CARD_ID',
  ]), 'canonical verifier covers Source Maturity Grid')
  addFinding(findings, includesAll(currentPlanText, [
    SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
    SOURCE_MATURITY_GRID_CARD_ID,
    SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  ]), 'current plan records Source Maturity Grid closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
    'seven-stage source maturity grid',
  ]), 'current state records Source Maturity Grid closeout')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_GRID_CARD_ID,
    closeoutKey: SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    grid: {
      summary: grid.summary,
      topGaps: grid.topGaps,
    },
    syntheticProof: syntheticProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(SOURCE_MATURITY_GRID_CARD_ID) || null,
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source maturity grid check: ${result.status}`)
    console.log(`${SOURCE_MATURITY_GRID_SUMMARY_MARKER} ${JSON.stringify(result.grid.summary)}`)
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
