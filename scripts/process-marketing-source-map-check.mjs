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
  BRAND_STACK_CARD_ID,
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
import { getSourceContracts } from '../lib/source-contracts.js'
import {
  MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
  MARKETING_AVATAR_EXPECTED_COUNTS,
  MARKETING_AVATAR_OLD_README_PATH,
  MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
  MARKETING_AVATAR_RETAIN_SOURCE_PATH,
  buildMarketingAvatarImportSnapshot,
} from '../lib/marketing-avatar-registry.js'
import {
  MARKETING_SOURCE_MAP_APPROVAL_PATH,
  MARKETING_SOURCE_MAP_CARD_ID,
  MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
  MARKETING_SOURCE_MAP_NOTE_PATH,
  MARKETING_SOURCE_MAP_PLAN_PATH,
  MARKETING_SOURCE_MAP_SCRIPT_PATH,
  MARKETING_SOURCE_MAP_SUMMARY_MARKER,
  buildMarketingSourceMapSnapshot,
  buildSyntheticMarketingSourceMapProof,
} from '../lib/marketing-source-map.js'

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

function everySourceRefResolved(map) {
  return (map.lanes || []).every(lane =>
    (lane.sourceRefs || []).every(ref => ref.state !== 'missing')
  )
}

async function main() {
  const args = parseArgs()
  const jsonMode = String(args.json || '').toLowerCase() === 'true'
  const findings = []

  const [
    packageJson,
    planText,
    marketingSourceMapSource,
    scriptSource,
    serverSource,
    foundationCurrentSprintSource,
    foundationDbSource,
    foundationBuildLogSource,
    foundationVerifySource,
    publicFoundationSource,
    publicStylesSource,
    currentPlanText,
    currentStateText,
    avatarReferenceBriefText,
    avatarRetainText,
    avatarAttractText,
    avatarOldReadmeText,
    marketingSourceNoteText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(MARKETING_SOURCE_MAP_PLAN_PATH),
    readRepoFile('lib/marketing-source-map.js'),
    readRepoFile(MARKETING_SOURCE_MAP_SCRIPT_PATH),
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/styles.css'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile(MARKETING_AVATAR_REFERENCE_BRIEF_PATH),
    readRepoFile(MARKETING_AVATAR_RETAIN_SOURCE_PATH),
    readRepoFile(MARKETING_AVATAR_ATTRACT_SOURCE_PATH),
    readRepoFile(MARKETING_AVATAR_OLD_README_PATH),
    readRepoFile(MARKETING_SOURCE_MAP_NOTE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: MARKETING_SOURCE_MAP_APPROVAL_PATH,
    cardId: MARKETING_SOURCE_MAP_CARD_ID,
  })
  const changedFiles = [
    MARKETING_SOURCE_MAP_PLAN_PATH,
    MARKETING_SOURCE_MAP_APPROVAL_PATH,
    'lib/marketing-source-map.js',
    MARKETING_SOURCE_MAP_SCRIPT_PATH,
    'server.js',
    'public/foundation.js',
    'public/styles.css',
    'lib/foundation-current-sprint.js',
    'lib/foundation-db.js',
    'lib/foundation-build-log.js',
    'scripts/foundation-verify.mjs',
    'docs/rebuild/current-plan.md',
    'docs/rebuild/current-state.md',
    'package.json',
  ]
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: MARKETING_SOURCE_MAP_CARD_ID, priority: 'P1' },
    changedFiles,
    declaredRisk: planText,
  })

  const avatarRegistry = buildMarketingAvatarImportSnapshot({
    referenceBriefText: avatarReferenceBriefText,
    retainProfilesText: avatarRetainText,
    attractProfilesText: avatarAttractText,
    oldReadmeText: avatarOldReadmeText,
  })
  const marketingSourceMap = buildMarketingSourceMapSnapshot({
    sourceContracts: getSourceContracts(),
    avatarRegistry,
    sourceNoteText: marketingSourceNoteText,
  })
  const syntheticProof = buildSyntheticMarketingSourceMapProof()

  await initFoundationDb()
  const closeoutNote = 'Closed on 2026-05-12 under `marketing-source-map-v1`. V1 adds `lib/marketing-source-map.js`, `/api/foundation/marketing-source-map`, Source Lifecycle/Foundation Hub payload wiring, Foundation Source Lifecycle UI rendering, `scripts/process-marketing-source-map-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The behavior proof calls the real marketing source map snapshot path and the real avatar registry path, verifies five brand lanes, 15 imported avatars, every source ref resolving to a registered source contract, synthetic lane/source/avatar classification, and advances Current Sprint to `BRAND-STACK-001`. This does not build Marketing Pipeline, Brand Guardian enforcement, writer/editor/designer/video/repurposer/scheduler operators, campaigns, Google Ads auth repair, SocialPilot validation, Real Broker connection, Reply/Watching Loop, Strategy Hub expansion, Telegram bots, Directors, or Drive ACL mutation.'
  await updateBacklogItem(MARKETING_SOURCE_MAP_CARD_ID, {
    lane: 'done',
    nextAction: 'Closed for v1. Pull `BRAND-STACK-001` next to model brand entities and Brand Guardian boundaries without content production.',
    statusNote: closeoutNote,
  }, 'codex')

  await upsertFoundationCurrentSprintOverlay(
    buildFoundationSourceOnceOverSprintSeed({
      sourceMaturityStage: 'done_this_sprint',
      sourceExtractionCoverageStage: 'done_this_sprint',
      sourceCoverageCloseoutStage: 'done_this_sprint',
      marketingSourceMapStage: 'done_this_sprint',
    }),
    'codex'
  )

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    MARKETING_SOURCE_MAP_CARD_ID,
    BRAND_STACK_CARD_ID,
    'AVATAR-IMPORT-001',
    'SOURCE-016',
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintStageMap = new Map((sprint.items || []).map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null
  const marketingSourceMapCard = cardMap.get(MARKETING_SOURCE_MAP_CARD_ID)
  const brandStackCard = cardMap.get(BRAND_STACK_CARD_ID)
  const avatarImportCard = cardMap.get('AVATAR-IMPORT-001')
  const source016Card = cardMap.get('SOURCE-016')

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Marketing Source Map plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, avatarRegistry.status === 'healthy' && avatarRegistry.summary?.totalAvatars === MARKETING_AVATAR_EXPECTED_COUNTS.total, 'real avatar registry provides 15 imported avatars', JSON.stringify(avatarRegistry.summary))
  addFinding(findings, marketingSourceMap.status === 'healthy', 'marketing source map snapshot is healthy', JSON.stringify(marketingSourceMap.findings))
  addFinding(findings, marketingSourceMap.summary?.laneCount === 5, 'marketing source map has five brand lanes', String(marketingSourceMap.summary?.laneCount || 0))
  addFinding(findings, marketingSourceMap.summary?.avatarCount === MARKETING_AVATAR_EXPECTED_COUNTS.total, 'marketing source map consumes all imported avatars', String(marketingSourceMap.summary?.avatarCount || 0))
  addFinding(findings, marketingSourceMap.summary?.missingSourceRefs === 0 && everySourceRefResolved(marketingSourceMap), 'every source reference resolves to a registered source contract', String(marketingSourceMap.summary?.missingSourceRefs || 0))
  addFinding(findings, marketingSourceMap.summary?.marketingProductionBuilt === false && marketingSourceMap.summary?.brandStackBuilt === false, 'marketing production and Brand Stack remain unbuilt by this card')
  addFinding(findings, marketingSourceMap.lanes.some(lane => lane.laneId === 'benson-crew' && lane.avatarCount === 15), 'Benson Crew lane maps RETAIN and ATTRACT avatars')
  addFinding(findings, marketingSourceMap.lanes.some(lane => lane.laneId === 'steve-zahnd' && lane.avatarCount === 5), 'Steve Zahnd lane maps ATTRACT avatars only')
  addFinding(findings, syntheticProof.ok, 'synthetic marketing source map proof classifies brand lanes, sources, and avatars', JSON.stringify(syntheticProof.summary))
  addFinding(findings, packageJson.scripts?.['process:marketing-source-map-check'] === `node --env-file-if-exists=.env ${MARKETING_SOURCE_MAP_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, marketingSourceMapCard?.lane === 'done' && String(marketingSourceMapCard?.statusNote || '').includes(MARKETING_SOURCE_MAP_CLOSEOUT_KEY), 'MARKETING-SOURCE-MAP-001 is done with closeout proof', marketingSourceMapCard?.lane || 'missing')
  addFinding(findings, avatarImportCard?.lane === 'done', 'AVATAR-IMPORT-001 remains done before marketing source map', avatarImportCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(brandStackCard?.lane), 'BRAND-STACK-001 is available next', brandStackCard?.lane || 'missing')
  addFinding(findings, source016Card && ['scoped', 'research', 'done'].includes(source016Card.lane), 'SOURCE-016 remains visible as marketing source-map context', source016Card?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === BRAND_STACK_CARD_ID, 'Current Sprint active blocker advanced to Brand Stack', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(MARKETING_SOURCE_MAP_CARD_ID) === 'done_this_sprint', 'Marketing Source Map moved to Done This Sprint', sprintStageMap.get(MARKETING_SOURCE_MAP_CARD_ID) || 'missing')
  addFinding(findings, sprintStageMap.get(BRAND_STACK_CARD_ID) === 'building_now', 'Brand Stack is next in Building Now', sprintStageMap.get(BRAND_STACK_CARD_ID) || 'missing')
  addFinding(findings, includesAll(marketingSourceMapSource, [
    'buildMarketingSourceMapSnapshot',
    'MARKETING_BRAND_LANES',
    'buildSyntheticMarketingSourceMapProof',
    'MARKETING_SOURCE_MAP_CLOSEOUT_KEY',
  ]), 'marketing source map library owns lane definitions and behavior proof')
  addFinding(findings, includesAll(scriptSource, [
    MARKETING_SOURCE_MAP_SUMMARY_MARKER,
    'every source reference resolves to a registered source contract',
    'Current Sprint active blocker advanced to Brand Stack',
  ]), 'focused proof checks behavior and sprint advancement')
  addFinding(findings, includesAll(serverSource, [
    '/api/foundation/marketing-source-map',
    'buildMarketingSourceMapSnapshot',
    'marketingSourceMap',
  ]), 'Foundation APIs expose marketing source map')
  addFinding(findings, includesAll(publicFoundationSource, [
    'renderMarketingSourceMapPanel',
    'marketingSourceMap',
    'marketing-source-map',
  ]), 'Foundation UI renders marketing source map')
  addFinding(findings, includesAll(publicStylesSource, [
    '.marketing-source-map-panel',
    '.marketing-source-map-grid',
  ]), 'Foundation styles cover marketing source map')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'marketingSourceMapStage',
    'MARKETING_SOURCE_MAP_CLOSEOUT_KEY',
    BRAND_STACK_CARD_ID,
  ]), 'Current Sprint seed advances after marketing source map')
  addFinding(findings, includesAll(foundationDbSource, [
    MARKETING_SOURCE_MAP_CARD_ID,
    BRAND_STACK_CARD_ID,
  ]), 'Foundation backlog has marketing map and brand stack cards')
  addFinding(findings, includesAll(foundationBuildLogSource, [
    MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
    MARKETING_SOURCE_MAP_CARD_ID,
    BRAND_STACK_CARD_ID,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticMarketingSourceMapProof',
    'MARKETING_SOURCE_MAP_CLOSEOUT_KEY',
    'MARKETING_SOURCE_MAP_CARD_ID',
  ]), 'canonical verifier covers Marketing Source Map')
  addFinding(findings, includesAll(currentPlanText, [
    MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
    MARKETING_SOURCE_MAP_CARD_ID,
    BRAND_STACK_CARD_ID,
  ]), 'current plan records Marketing Source Map closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
    'Current sprint active blocker is now `BRAND-STACK-001`',
    'marketing source map',
  ]), 'current state records Marketing Source Map closeout and active blocker')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: MARKETING_SOURCE_MAP_CARD_ID,
    closeoutKey: MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    marketingSourceMap: {
      summary: marketingSourceMap.summary,
      laneLabels: marketingSourceMap.lanes.map(lane => lane.label),
    },
    syntheticProof: syntheticProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(MARKETING_SOURCE_MAP_CARD_ID) || null,
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Marketing source map check: ${result.status}`)
    console.log(`${MARKETING_SOURCE_MAP_SUMMARY_MARKER} ${JSON.stringify(result.marketingSourceMap.summary)}`)
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
