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
  TIER_BEHAVIORAL_COMPLETION_CARD_ID,
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
  MARKETING_AVATAR_OLD_README_PATH,
  MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
  MARKETING_AVATAR_RETAIN_SOURCE_PATH,
  buildMarketingAvatarImportSnapshot,
} from '../lib/marketing-avatar-registry.js'
import {
  MARKETING_SOURCE_MAP_NOTE_PATH,
  buildMarketingSourceMapSnapshot,
} from '../lib/marketing-source-map.js'
import {
  BRAND_STACK_APPROVAL_PATH,
  BRAND_STACK_CARD_ID,
  BRAND_STACK_CLOSEOUT_KEY,
  BRAND_STACK_PLAN_PATH,
  BRAND_STACK_SCRIPT_PATH,
  BRAND_STACK_SUMMARY_MARKER,
  buildBrandStackSnapshot,
  buildSyntheticBrandStackProof,
} from '../lib/brand-stack.js'

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

function allBrandsHaveSourceLane(stack) {
  return (stack.brands || []).every(brand =>
    brand.sourceMapLaneStatus !== 'missing' &&
      brand.sourceRefCount > 0 &&
      brand.missingSourceCount === 0
  )
}

async function main() {
  const args = parseArgs()
  const jsonMode = String(args.json || '').toLowerCase() === 'true'
  const findings = []

  const [
    packageJson,
    planText,
    brandStackSource,
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
    marketmastersText,
    systemStrategyText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(BRAND_STACK_PLAN_PATH),
    readRepoFile('lib/brand-stack.js'),
    readRepoFile(BRAND_STACK_SCRIPT_PATH),
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
    readRepoFile('docs/strategy/marketmasters.md'),
    readRepoFile('docs/system-strategy.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: BRAND_STACK_APPROVAL_PATH,
    cardId: BRAND_STACK_CARD_ID,
  })
  const changedFiles = [
    BRAND_STACK_PLAN_PATH,
    BRAND_STACK_APPROVAL_PATH,
    'lib/brand-stack.js',
    BRAND_STACK_SCRIPT_PATH,
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
    card: { id: BRAND_STACK_CARD_ID, priority: 'P1' },
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
  const brandStack = buildBrandStackSnapshot({ marketingSourceMap })
  const syntheticProof = buildSyntheticBrandStackProof()

  await initFoundationDb()
  const closeoutNote = 'Closed on 2026-05-12 under `brand-stack-v1`. V1 adds `lib/brand-stack.js`, `/api/foundation/brand-stack`, Source Lifecycle/Foundation Hub payload wiring, Foundation Source Lifecycle UI rendering, `scripts/process-brand-stack-check.mjs`, package/verifier/current-sprint coverage, and Recent Work closeout. The behavior proof calls the real brand stack snapshot path and the real marketing source map path, verifies five brand entities, five Guardian boundary definitions, source/avatar carry-through from the marketing source map, synthetic brand-boundary classification, and advances Current Sprint to `TIER-BEHAVIORAL-COMPLETION-001`. This does not build Brand Guardian enforcement, Marketing Pipeline, writer/editor/designer/video/repurposer/scheduler operators, campaigns, content production, connector repair, Reply/Watching Loop, Strategy Hub expansion, Telegram bots, Directors, or Drive ACL mutation.'
  await updateBacklogItem(BRAND_STACK_CARD_ID, {
    lane: 'done',
    nextAction: 'Closed for v1. Pull `TIER-BEHAVIORAL-COMPLETION-001` next to decide/prove first non-owner read surfaces or keep them owner-only.',
    statusNote: closeoutNote,
  }, 'codex')

  await upsertFoundationCurrentSprintOverlay(
    buildFoundationSourceOnceOverSprintSeed({
      sourceMaturityStage: 'done_this_sprint',
      sourceExtractionCoverageStage: 'done_this_sprint',
      sourceCoverageCloseoutStage: 'done_this_sprint',
      marketingSourceMapStage: 'done_this_sprint',
      brandStackStage: 'done_this_sprint',
    }),
    'codex'
  )

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    BRAND_STACK_CARD_ID,
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
    'MARKETING-SOURCE-MAP-001',
    'MARKETING-PIPELINE-REBUILD-001',
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintStageMap = new Map((sprint.items || []).map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null
  const brandStackCard = cardMap.get(BRAND_STACK_CARD_ID)
  const tierBehaviorCard = cardMap.get(TIER_BEHAVIORAL_COMPLETION_CARD_ID)
  const marketingSourceMapCard = cardMap.get('MARKETING-SOURCE-MAP-001')

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Brand Stack plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, marketingSourceMap.status === 'healthy', 'real marketing source map snapshot is healthy', JSON.stringify(marketingSourceMap.summary))
  addFinding(findings, brandStack.status === 'healthy', 'brand stack snapshot is healthy', JSON.stringify(brandStack.findings))
  addFinding(findings, brandStack.summary?.brandCount === 5, 'brand stack has five brand entities', String(brandStack.summary?.brandCount || 0))
  addFinding(findings, brandStack.summary?.guardianBoundaryCount === 5, 'every brand has a Guardian boundary', String(brandStack.summary?.guardianBoundaryCount || 0))
  addFinding(findings, allBrandsHaveSourceLane(brandStack), 'every brand resolves to a marketing source-map lane with source refs')
  addFinding(findings, brandStack.summary?.brandGuardianEnforcementBuilt === false && brandStack.summary?.marketingProductionBuilt === false, 'Brand Guardian enforcement and marketing production remain unbuilt by this card')
  addFinding(findings, brandStack.brands.some(brand => brand.label === 'MarketMasters' && brand.guardianRules.some(rule => rule.includes('direct recruiting'))), 'MarketMasters keeps direct-recruiting boundary')
  addFinding(findings, brandStack.brands.some(brand => brand.label === 'Benson Crew' && brand.avatarCount === 15), 'Benson Crew inherits RETAIN and ATTRACT avatars')
  addFinding(findings, syntheticProof.ok, 'synthetic brand stack proof classifies entities, boundaries, and carry-through', JSON.stringify(syntheticProof.summary))
  addFinding(findings, packageJson.scripts?.['process:brand-stack-check'] === `node --env-file-if-exists=.env ${BRAND_STACK_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, brandStackCard?.lane === 'done' && String(brandStackCard?.statusNote || '').includes(BRAND_STACK_CLOSEOUT_KEY), 'BRAND-STACK-001 is done with closeout proof', brandStackCard?.lane || 'missing')
  addFinding(findings, marketingSourceMapCard?.lane === 'done', 'MARKETING-SOURCE-MAP-001 remains done before Brand Stack', marketingSourceMapCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(tierBehaviorCard?.lane), 'TIER-BEHAVIORAL-COMPLETION-001 is available next', tierBehaviorCard?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'Current Sprint active blocker advanced to tier behavioral completion', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(BRAND_STACK_CARD_ID) === 'done_this_sprint', 'Brand Stack moved to Done This Sprint', sprintStageMap.get(BRAND_STACK_CARD_ID) || 'missing')
  addFinding(findings, sprintStageMap.get(TIER_BEHAVIORAL_COMPLETION_CARD_ID) === 'building_now', 'Tier behavioral completion is next in Building Now', sprintStageMap.get(TIER_BEHAVIORAL_COMPLETION_CARD_ID) || 'missing')
  addFinding(findings, includesAll(brandStackSource, [
    'buildBrandStackSnapshot',
    'BRAND_STACK_ENTITIES',
    'buildSyntheticBrandStackProof',
    'BRAND_STACK_CLOSEOUT_KEY',
  ]), 'brand stack library owns entity definitions and behavior proof')
  addFinding(findings, includesAll(scriptSource, [
    BRAND_STACK_SUMMARY_MARKER,
    'every brand resolves to a marketing source-map lane with source refs',
    'Current Sprint active blocker advanced to tier behavioral completion',
  ]), 'focused proof checks behavior and sprint advancement')
  addFinding(findings, includesAll(serverSource, [
    '/api/foundation/brand-stack',
    'buildBrandStackSnapshot',
    'brandStack',
  ]), 'Foundation APIs expose brand stack')
  addFinding(findings, includesAll(publicFoundationSource, [
    'renderBrandStackPanel',
    'brandStack',
    'brand-stack',
  ]), 'Foundation UI renders brand stack')
  addFinding(findings, includesAll(publicStylesSource, [
    '.brand-stack-panel',
    '.brand-stack-grid',
  ]), 'Foundation styles cover brand stack')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    'brandStackStage',
    'BRAND_STACK_CLOSEOUT_KEY',
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  ]), 'Current Sprint seed advances after Brand Stack')
  addFinding(findings, includesAll(foundationDbSource, [
    BRAND_STACK_CARD_ID,
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  ]), 'Foundation backlog has Brand Stack and tier completion cards')
  addFinding(findings, includesAll(foundationBuildLogSource, [
    BRAND_STACK_CLOSEOUT_KEY,
    BRAND_STACK_CARD_ID,
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticBrandStackProof',
    'BRAND_STACK_CLOSEOUT_KEY',
    'BRAND_STACK_CARD_ID',
  ]), 'canonical verifier covers Brand Stack')
  addFinding(findings, includesAll(currentPlanText, [
    BRAND_STACK_CLOSEOUT_KEY,
    BRAND_STACK_CARD_ID,
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  ]), 'current plan records Brand Stack closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    BRAND_STACK_CLOSEOUT_KEY,
    'Current sprint active blocker is now `TIER-BEHAVIORAL-COMPLETION-001`',
    'brand stack',
  ]), 'current state records Brand Stack closeout and active blocker')
  addFinding(findings, includesAll(marketingSourceNoteText, [
    'Benson Crew',
    'Zahnd Team Ag',
    'Steve Zahnd',
    'MarketMasters',
  ]), 'Freedom marketing note carries brand-lane evidence')
  addFinding(findings, includesAll(marketmastersText, [
    'Trust = MarketMasters',
    'Execution = Benson Crew',
  ]), 'MarketMasters strategy carries the decision test')
  addFinding(findings, includesAll(systemStrategyText, [
    'Benson Crew and Real Broker must stay distinct',
  ]), 'system strategy carries entity-boundary doctrine')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: BRAND_STACK_CARD_ID,
    closeoutKey: BRAND_STACK_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    brandStack: {
      summary: brandStack.summary,
      brandLabels: brandStack.brands.map(brand => brand.label),
    },
    syntheticProof: syntheticProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(BRAND_STACK_CARD_ID) || null,
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Brand stack check: ${result.status}`)
    console.log(`${BRAND_STACK_SUMMARY_MARKER} ${JSON.stringify(result.brandStack.summary)}`)
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
