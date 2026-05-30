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
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
} from '../lib/foundation-current-sprint.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  AVATAR_IMPORT_APPROVAL_PATH,
  AVATAR_IMPORT_CARD_ID,
  AVATAR_IMPORT_CLOSEOUT_KEY,
  AVATAR_IMPORT_PLAN_PATH,
  AVATAR_IMPORT_SCRIPT_PATH,
  AVATAR_IMPORT_SUMMARY_MARKER,
  MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
  MARKETING_AVATAR_EXPECTED_COUNTS,
  MARKETING_AVATAR_OLD_README_PATH,
  MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
  MARKETING_AVATAR_REGISTRY_README_PATH,
  MARKETING_AVATAR_RETAIN_SOURCE_PATH,
  buildMarketingAvatarImportSnapshot,
  buildSyntheticAvatarImportProof,
} from '../lib/marketing-avatar-registry.js'

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

async function main() {
  const args = parseArgs()
  const jsonMode = String(args.json || '').toLowerCase() === 'true'
  const findings = []

  const [
    packageJson,
    planText,
    registryReadmeText,
    referenceBriefText,
    retainProfilesText,
    attractProfilesText,
    oldReadmeText,
    registrySource,
    scriptSource,
    serverSource,
    foundationCurrentSprintSource,
    foundationDbSource,
    foundationBuildLogSource,
    foundationVerifySource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readJson('package.json'),
    readRepoFile(AVATAR_IMPORT_PLAN_PATH),
    readRepoFile(MARKETING_AVATAR_REGISTRY_README_PATH),
    readRepoFile(MARKETING_AVATAR_REFERENCE_BRIEF_PATH),
    readRepoFile(MARKETING_AVATAR_RETAIN_SOURCE_PATH),
    readRepoFile(MARKETING_AVATAR_ATTRACT_SOURCE_PATH),
    readRepoFile(MARKETING_AVATAR_OLD_README_PATH),
    readRepoFile('lib/marketing-avatar-registry.js'),
    readRepoFile(AVATAR_IMPORT_SCRIPT_PATH),
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: AVATAR_IMPORT_APPROVAL_PATH,
    cardId: AVATAR_IMPORT_CARD_ID,
  })
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: AVATAR_IMPORT_CARD_ID, priority: 'P1' },
    changedFiles: [
      MARKETING_AVATAR_REGISTRY_README_PATH,
      MARKETING_AVATAR_RETAIN_SOURCE_PATH,
      MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
      MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
      'lib/marketing-avatar-registry.js',
      AVATAR_IMPORT_SCRIPT_PATH,
      'server.js',
      'lib/foundation-current-sprint.js',
      'lib/foundation-db.js',
      'lib/foundation-build-log.js',
      'scripts/foundation-verify.mjs',
      'package.json',
    ],
    declaredRisk: planText,
  })
  const snapshot = buildMarketingAvatarImportSnapshot({
    referenceBriefText,
    retainProfilesText,
    attractProfilesText,
    oldReadmeText,
  })
  const syntheticProof = buildSyntheticAvatarImportProof()

  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([
    AVATAR_IMPORT_CARD_ID,
    AUTO_DEPLOY_ROLLBACK_CARD_ID,
  ])
  await closeFoundationDb()

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const avatarCard = cardMap.get(AVATAR_IMPORT_CARD_ID)
  const autoDeployCard = cardMap.get(AUTO_DEPLOY_ROLLBACK_CARD_ID)
  const sprintItems = sprint.items || []
  const sprintStageMap = new Map(sprintItems.map(item => [item.cardId, item.stage]))
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Avatar import plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, snapshot.status === 'healthy', 'real imported avatar registry snapshot is healthy', JSON.stringify(snapshot.summary))
  addFinding(findings, snapshot.summary.totalAvatars === MARKETING_AVATAR_EXPECTED_COUNTS.total, 'registry exposes 15 avatars', String(snapshot.summary.totalAvatars))
  addFinding(findings, snapshot.summary.retainAvatars === MARKETING_AVATAR_EXPECTED_COUNTS.retain, 'registry exposes 10 RETAIN avatars', String(snapshot.summary.retainAvatars))
  addFinding(findings, snapshot.summary.attractAvatars === MARKETING_AVATAR_EXPECTED_COUNTS.attract, 'registry exposes 5 ATTRACT avatars', String(snapshot.summary.attractAvatars))
  addFinding(findings, snapshot.summary.platformBehaviorSections === MARKETING_AVATAR_EXPECTED_COUNTS.total, 'source profiles preserve platform behavior sections', String(snapshot.summary.platformBehaviorSections))
  addFinding(findings, snapshot.summary.objectionSections === MARKETING_AVATAR_EXPECTED_COUNTS.total, 'source profiles preserve objections sections', String(snapshot.summary.objectionSections))
  addFinding(findings, snapshot.summary.buyingSignalSections === MARKETING_AVATAR_EXPECTED_COUNTS.total, 'source profiles preserve buying signals sections', String(snapshot.summary.buyingSignalSections))
  addFinding(findings, syntheticProof.ok, 'synthetic avatar proof rejects wrong-count and missing-field variants', JSON.stringify(syntheticProof.summary))
  addFinding(findings, packageJson.scripts?.['process:avatar-import-check'] === `node --env-file-if-exists=.env ${AVATAR_IMPORT_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, avatarCard?.lane === 'done' && String(avatarCard?.statusNote || '').includes(AVATAR_IMPORT_CLOSEOUT_KEY), 'AVATAR-IMPORT-001 is done with closeout proof', avatarCard?.lane || 'missing')
  addFinding(findings, ['scoped', 'done'].includes(autoDeployCard?.lane), 'AUTO-DEPLOY-ROLLBACK-001 remains scoped or done as next card', autoDeployCard?.lane || 'missing')
  addFinding(findings, activeBlockerCardId === AUTO_DEPLOY_ROLLBACK_CARD_ID, 'Current Sprint active blocker advanced to Auto Deploy rollback', activeBlockerCardId || 'missing')
  addFinding(findings, sprintStageMap.get(AVATAR_IMPORT_CARD_ID) === 'done_this_sprint', 'Avatar import moved to Done This Sprint', sprintStageMap.get(AVATAR_IMPORT_CARD_ID) || 'missing')
  addFinding(findings, includesAll(registryReadmeText, [
    'source/old-bcrew-buddy/retain-avatars.md',
    'source/old-bcrew-buddy/attract-avatars.md',
    'optional overlays',
  ]), 'avatar README documents source and boundary')
  addFinding(findings, includesAll(registrySource, [
    'parseMarketingAvatarReferenceBrief',
    'buildMarketingAvatarImportSnapshot',
    'buildSyntheticAvatarImportProof',
    'missingFieldRejected',
    'marketingPipelineBuilt: false',
  ]), 'registry library owns parser, snapshot, and behavior proof')
  addFinding(findings, includesAll(scriptSource, [
    AVATAR_IMPORT_SUMMARY_MARKER,
    'real imported avatar registry snapshot is healthy',
    'Current Sprint active blocker advanced to Auto Deploy rollback',
  ]), 'focused proof script checks behavior and sprint advancement')
  addFinding(findings, includesAll(serverSource, [
    'buildMarketingAvatarImportSnapshot',
    'marketingAvatarRegistry',
    'MARKETING_AVATAR_REFERENCE_BRIEF_PATH',
  ]), 'Foundation API exposes marketingAvatarRegistry snapshot')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    AVATAR_IMPORT_CLOSEOUT_KEY,
    'activeBlockerCardId: AUTO_DEPLOY_ROLLBACK_CARD_ID',
    'process:avatar-import-check',
  ]), 'Current Sprint seed records Avatar closeout and next blocker')
  addFinding(findings, includesAll(foundationDbSource, [
    AVATAR_IMPORT_CARD_ID,
    AVATAR_IMPORT_CLOSEOUT_KEY,
    'Marketing Pipeline',
  ]), 'Foundation backlog seed records Avatar closeout and marketing boundary')
  addFinding(findings, includesAll(foundationBuildLogSource, [
    AVATAR_IMPORT_CLOSEOUT_KEY,
    AVATAR_IMPORT_CARD_ID,
    AUTO_DEPLOY_ROLLBACK_CARD_ID,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticAvatarImportProof',
    'marketingAvatarRegistry',
    'AVATAR_IMPORT_CLOSEOUT_KEY',
  ]), 'canonical verifier covers Avatar import')
  addFinding(findings, includesAll(currentPlanText, [
    AVATAR_IMPORT_CLOSEOUT_KEY,
    AVATAR_IMPORT_CARD_ID,
    AUTO_DEPLOY_ROLLBACK_CARD_ID,
  ]), 'current plan records Avatar closeout and next card')
  addFinding(findings, includesAll(currentStateText, [
    AVATAR_IMPORT_CLOSEOUT_KEY,
    'Current sprint active blocker is now `AUTO-DEPLOY-ROLLBACK-001`',
    '15 avatars',
  ]), 'current state records Avatar closeout and active blocker')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AVATAR_IMPORT_CARD_ID,
    closeoutKey: AVATAR_IMPORT_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    registry: snapshot.summary,
    syntheticProof: syntheticProof.summary,
    activeBlockerCardId,
    sprintStage: sprintStageMap.get(AVATAR_IMPORT_CARD_ID) || null,
    findings,
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Avatar import check: ${result.status}`)
    console.log(`${AVATAR_IMPORT_SUMMARY_MARKER} ${JSON.stringify(result.registry)}`)
    for (const finding of findings) {
      console.log(`- ${finding.check}: ${finding.detail}`)
    }
  }

  if (findings.length) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
