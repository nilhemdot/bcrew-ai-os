#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH,
  FOUNDATION_SPRINT_CADENCE_CARD_ID,
  FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_CADENCE_DOC_PATH,
  FOUNDATION_SPRINT_CADENCE_PLAN_PATH,
  FOUNDATION_SPRINT_CADENCE_SCRIPT_PATH,
  FOUNDATION_SPRINT_CADENCE_SUMMARY_MARKER,
  FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_APPROVAL_PATH,
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_SYSTEM_DOC_PATH,
  FOUNDATION_SPRINT_SYSTEM_PLAN_PATH,
  FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH,
  FOUNDATION_SPRINT_SYSTEM_SUMMARY_MARKER,
  buildSyntheticFoundationCurrentSprintProof,
} from '../lib/foundation-current-sprint.js'
import {
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SPRINT_ID,
  buildFoundationCurrentSprintVerifierDogfoodProof,
  evaluateFoundationCurrentSprintVerifier,
} from '../lib/foundation-current-sprint-verifier.js'
import {
  STYLESHEET_MODULE_PATHS,
  combineImportedStylesheets,
} from '../lib/foundation-stylesheet-monolith-split.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    baseUrl: (argv.find(arg => arg.startsWith('--baseUrl=')) || '').split('=')[1] || process.env.FOUNDATION_VERIFY_BASE_URL || 'http://localhost:3000',
  }
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readTextIfExists(relativePath) {
  try {
    return await readText(relativePath)
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`GET ${pathname} failed: ${response.status}`)
  return response.json()
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

function cardText(card = {}) {
  return [
    card.summary,
    card.nextAction,
    card.statusNote,
  ].filter(Boolean).join(' ')
}

function closeoutBuildLogExact(build, ownedId, mentionedIds = []) {
  return build?.backlogIds?.length === 1 &&
    build.backlogIds.includes(ownedId) &&
    mentionedIds.every(id => (build.mentionedBacklogIds || []).includes(id)) &&
    mentionedIds.every(id => !(build.backlogIds || []).includes(id))
}

async function loadEvaluationInput({ baseUrl }) {
  const [
    foundationHub,
    currentSprintApi,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageSource,
    currentPlan,
    currentState,
    foundationCurrentSprintSource,
    foundationDbSource,
    serverSource,
    hubReadRoutesSource,
    foundationOperatorRoutesSource,
    foundationSourceRoutesSource,
    foundationRuntimeReadRoutesSource,
    appPageRoutesSource,
    foundationWriteRoutesSource,
    agentFeedbackRoutesSource,
    foundationSprintSystemScriptSource,
    foundationSprintSystemPlanSource,
    foundationSprintSystemDocSource,
    foundationSprintSystemApprovalSource,
    foundationSprintCadenceScriptSource,
    foundationSprintCadencePlanSource,
    foundationSprintCadenceDocSource,
    foundationSprintCadenceApprovalSource,
    foundationSprintCaptureSource,
    foundationUiSource,
    foundationNavConfigSource,
    foundationDataSource,
    foundationRouterSource,
    foundationSourceRegistryRenderersSource,
    foundationFubLeadSourceRenderersSource,
    foundationSystemInventoryRenderersSource,
    foundationCurrentStateRenderersSource,
    foundationDecisionQuestionRenderersSource,
    foundationSourceLifecycleRenderersSource,
    foundationRuntimeRenderersSource,
    foundationOperationsRenderersSource,
    stylesSource,
    stylesBaseSource,
    stylesCoreSource,
    stylesWorkflowsSource,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub?detail=full'),
    fetchJson(baseUrl, '/api/foundation/current-sprint'),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-current-sprint-verifier.js'),
    readText(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_PLAN_PATH),
    readText('package.json'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('lib/foundation-current-sprint.js'),
    readText('lib/foundation-db.js'),
    readText('server.js'),
    readTextIfExists('lib/hub-read-routes.js'),
    readTextIfExists('lib/foundation-operator-routes.js'),
    readTextIfExists('lib/foundation-source-routes.js'),
    readTextIfExists('lib/foundation-runtime-read-routes.js'),
    readTextIfExists('lib/app-page-routes.js'),
    readTextIfExists('lib/foundation-write-routes.js'),
    readTextIfExists('lib/agent-feedback-routes.js'),
    readText(FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH),
    readText(FOUNDATION_SPRINT_SYSTEM_PLAN_PATH),
    readText(FOUNDATION_SPRINT_SYSTEM_DOC_PATH),
    readText(FOUNDATION_SPRINT_SYSTEM_APPROVAL_PATH),
    readText(FOUNDATION_SPRINT_CADENCE_SCRIPT_PATH),
    readText(FOUNDATION_SPRINT_CADENCE_PLAN_PATH),
    readText(FOUNDATION_SPRINT_CADENCE_DOC_PATH),
    readText(FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH),
    readText('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-10-foundation-sprint-capture.md'),
    readText('public/foundation.js'),
    readTextIfExists('public/foundation-nav-config.js'),
    readTextIfExists('public/foundation-data.js'),
    readTextIfExists('public/foundation-router.js'),
    readTextIfExists('public/foundation-source-registry-renderers.js'),
    readTextIfExists('public/foundation-fub-lead-source-renderers.js'),
    readTextIfExists('public/foundation-system-inventory-renderers.js'),
    readTextIfExists('public/foundation-current-state-renderers.js'),
    readTextIfExists('public/foundation-decision-question-renderers.js'),
    readTextIfExists('public/foundation-source-lifecycle-renderers.js'),
    readTextIfExists('public/foundation-runtime-renderers.js'),
    readTextIfExists('public/foundation-operations-renderers.js'),
    readText('public/styles.css'),
    readTextIfExists('public/styles-base-layout.css'),
    readTextIfExists('public/styles-foundation-core.css'),
    readTextIfExists('public/styles-foundation-workflows.css'),
  ])
  const packageJson = JSON.parse(packageSource)
  const stylesheetModuleSources = Object.fromEntries(await Promise.all(
    STYLESHEET_MODULE_PATHS.map(async modulePath => [modulePath, await readTextIfExists(modulePath)]),
  ))
  const closeouts = getFoundationBuildCloseouts()
  const backlogItems = foundationHub.backlogItems || []
  const itemById = new Map(backlogItems.map(item => [item.id, item]))
  const buildLogFoundationSprintSystemCloseout = closeouts.find(closeout =>
    closeout.key === FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY &&
    (closeout.backlogIds || []).includes(FOUNDATION_SPRINT_SYSTEM_CARD_ID)
  ) || null
  const buildLogFoundationSprintCadenceCloseout = closeouts.find(closeout =>
    closeout.key === FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY &&
    (closeout.backlogIds || []).includes(FOUNDATION_SPRINT_CADENCE_CARD_ID)
  ) || null
  const buildLogFoundationSprintSystemBuild = buildLogFoundationSprintSystemCloseout
    ? { ...buildLogFoundationSprintSystemCloseout, operatorCloseout: true, closeoutKey: buildLogFoundationSprintSystemCloseout.key }
    : null
  const buildLogFoundationSprintCadenceBuild = buildLogFoundationSprintCadenceCloseout
    ? { ...buildLogFoundationSprintCadenceCloseout, operatorCloseout: true, closeoutKey: buildLogFoundationSprintCadenceCloseout.key }
    : null
  const meetingVaultAutoEnforcementClosed = closeouts.some(closeout => closeout.key === 'meeting-vault-auto-enforcement-v1')

  return {
    foundationHub,
    currentSprintApi,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageJson,
    currentPlan,
    currentState,
    foundationCurrentSprintSource,
    foundationDbSource,
    serverRouteSource: [
      serverSource,
      hubReadRoutesSource,
      foundationOperatorRoutesSource,
      foundationSourceRoutesSource,
      foundationRuntimeReadRoutesSource,
      appPageRoutesSource,
      foundationWriteRoutesSource,
      agentFeedbackRoutesSource,
    ].join('\n'),
    foundationFrontendSource: [
      foundationNavConfigSource,
      foundationDataSource,
      foundationUiSource,
      foundationSourceRegistryRenderersSource,
      foundationFubLeadSourceRenderersSource,
      foundationSystemInventoryRenderersSource,
      foundationCurrentStateRenderersSource,
      foundationDecisionQuestionRenderersSource,
      foundationSourceLifecycleRenderersSource,
      foundationRuntimeRenderersSource,
      foundationOperationsRenderersSource,
      foundationRouterSource,
    ].join('\n'),
    foundationStylesSource: combineImportedStylesheets(stylesSource, stylesheetModuleSources) || [
      stylesSource,
      stylesBaseSource,
      stylesCoreSource,
      stylesWorkflowsSource,
    ].join('\n'),
    foundationSprintSystem: itemById.get(FOUNDATION_SPRINT_SYSTEM_CARD_ID) || null,
    foundationSprintCadence: itemById.get(FOUNDATION_SPRINT_CADENCE_CARD_ID) || null,
    meetingVaultAcl: itemById.get('MEETING-VAULT-ACL-001') || null,
    meetingVaultAutoEnforcementClosed,
    foundationCurrentSprintStatus: currentSprintApi.currentSprint || currentSprintApi,
    foundationSprintSurfaceFollowUp: itemById.get(FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID) || null,
    foundationSprintDoneVelocity: itemById.get(FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID) || null,
    foundationSprintSystemApprovalValidation: await validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_SPRINT_SYSTEM_APPROVAL_PATH,
      cardId: FOUNDATION_SPRINT_SYSTEM_CARD_ID,
    }),
    foundationSprintCadenceApprovalValidation: await validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH,
      cardId: FOUNDATION_SPRINT_CADENCE_CARD_ID,
    }),
    foundationSprintSystemApproval: JSON.parse(foundationSprintSystemApprovalSource),
    foundationSprintCadenceApproval: JSON.parse(foundationSprintCadenceApprovalSource),
    foundationSprintSystemPlanSource,
    foundationSprintCadencePlanSource,
    foundationSprintSystemScriptSource,
    foundationSprintCadenceScriptSource,
    foundationSprintSystemDocSource,
    foundationSprintCadenceDocSource,
    foundationSprintCaptureSource,
    buildLogFoundationSprintSystemBuild,
    buildLogFoundationSprintCadenceBuild,
    foundationSprintSystemBuildLogExact: closeoutBuildLogExact(
      buildLogFoundationSprintSystemBuild,
      FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      ['MEETING-VAULT-ACL-001', FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID, FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID],
    ),
    foundationSprintCadenceBuildLogExact: closeoutBuildLogExact(
      buildLogFoundationSprintCadenceBuild,
      FOUNDATION_SPRINT_CADENCE_CARD_ID,
      [FOUNDATION_SPRINT_SYSTEM_CARD_ID, 'MEETING-VAULT-ACL-001', FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID, FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID],
    ),
    syntheticFoundationSprintProof: buildSyntheticFoundationCurrentSprintProof(),
    activeSprintCompleteReview: (currentSprintApi.currentSprint || currentSprintApi).summary?.itemCount > 0 &&
      (currentSprintApi.currentSprint || currentSprintApi).summary?.doneThisSprintCount === (currentSprintApi.currentSprint || currentSprintApi).summary.itemCount &&
      !(currentSprintApi.currentSprint || currentSprintApi).activeBlocker?.cardId,
    foundationSprintSystemSummaryMarker: FOUNDATION_SPRINT_SYSTEM_SUMMARY_MARKER,
    foundationSprintCadenceSummaryMarker: FOUNDATION_SPRINT_CADENCE_SUMMARY_MARKER,
    foundationBuildCloseouts: closeouts,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    input,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID]),
    loadEvaluationInput({ baseUrl: args.baseUrl }),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.cardId === VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8) || null
  const evaluation = evaluateFoundationCurrentSprintVerifier(input)
  const dogfood = buildFoundationCurrentSprintVerifierDogfoodProof()
  const verifierLines = lineCount(input.foundationVerifySource)
  const closed = card?.lane === 'done'
  const closeout = input.foundationBuildCloseouts.find(record => record.key === VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const activeSprintOwnsCard = activeSprint.sprint?.sprintId === VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SPRINT_ID
  const activeSprintContainsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    closed &&
      String(card.statusNote || '').includes(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY) &&
      closeout?.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID)

  addCheck(checks, approval.ok, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'Current Sprint is the verifier Current Sprint split module sprint or historical closeout owns it', activeSprintOwnsCard ? activeSprint.sprint?.sprintId : closeout?.key || 'missing')
  addCheck(checks, activeSprintContainsCard || historicalCloseoutOwnsCard, 'Current Sprint contains the card in Building Now/Done or historical closeout owns it', activeSprintContainsCard ? `${sprintItem.cardId}:${sprintItem.stage}` : closeout?.key || 'missing')
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, input.moduleSource.includes('evaluateFoundationCurrentSprintVerifier') && input.moduleSource.includes('buildFoundationCurrentSprintVerifierDogfoodProof'), 'new module owns Current Sprint verifier logic', 'lib/foundation-current-sprint-verifier.js')
  addCheck(checks, evaluation.ok, 'Current Sprint verifier module passes current sprint state', `${evaluation.summary.passed}/${evaluation.summary.total}`)
  addCheck(checks, dogfood.ok, 'dogfood rejects Current Sprint verifier failures', dogfood.dogfoodInvariant)
  addCheck(checks, dogfood.badApi.ok === false, 'dogfood rejects unhealthy Current Sprint API/status', dogfood.badApi.checks.filter(check => !check.ok).map(check => check.check).join('; '))
  addCheck(checks, dogfood.missingDoctrine.ok === false, 'dogfood rejects missing current-sprint doctrine/source markers', dogfood.missingDoctrine.checks.filter(check => !check.ok).map(check => check.check).join('; '))
  addCheck(checks, dogfood.missingBuildLog.ok === false, 'dogfood rejects missing build-log ownership', dogfood.missingBuildLog.checks.filter(check => !check.ok).map(check => check.check).join('; '))
  addCheck(checks, dogfood.missingDriveGuard.ok === false, 'dogfood rejects missing Drive/Meeting Vault stop-lines', dogfood.missingDriveGuard.checks.filter(check => !check.ok).map(check => check.check).join('; '))
  addCheck(checks, input.foundationVerifySource.includes('evaluateFoundationCurrentSprintVerifier') && input.foundationVerifySource.includes('buildFoundationCurrentSprintVerifierDogfoodProof'), 'foundation verifier delegates Current Sprint checks to focused module', 'evaluateFoundationCurrentSprintVerifier')
  addCheck(checks, !input.foundationVerifySource.includes('FOUNDATION-SPRINT-SYSTEM-001 adds Current Sprint control without a second backlog'), 'foundation verifier no longer owns old inline Current Sprint system row', 'old system row absent from root verifier')
  addCheck(checks, !input.foundationVerifySource.includes('FOUNDATION-SPRINT-CADENCE-001 adds readable sprint command view without Drive mutation'), 'foundation verifier no longer owns old inline Current Sprint cadence row', 'old cadence row absent from root verifier')
  addCheck(checks, verifierLines < VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(input.proofScriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  addCheck(checks, input.packageJson.scripts?.['process:verifier-current-sprint-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SCRIPT_PATH}`, 'package script is registered', input.packageJson.scripts?.['process:verifier-current-sprint-split-module-check'] || 'missing')
  addCheck(checks, input.planSource.includes('Dogfood proof recreates the failure class') && input.planSource.includes('Substring-only proof is not enough'), 'plan requires dogfood and rejects substring-only proof', VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_PLAN_PATH)
  addCheck(checks, !closed || (
    String(card.statusNote || '').includes(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID) &&
    await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-verifier-current-sprint-split-module-closeout.md')
  ), 'closed card has closeout record and handoff when lane is done', closed ? VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY : 'card still executing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_BEFORE_LINES,
    },
    checks,
    failed,
    dogfood: {
      healthy: dogfood.healthy.ok,
      badApiRejected: dogfood.badApi.ok === false,
      missingDoctrineRejected: dogfood.missingDoctrine.ok === false,
      missingBuildLogRejected: dogfood.missingBuildLog.ok === false,
      missingDriveGuardRejected: dogfood.missingDriveGuard.ok === false,
    },
    evaluation: evaluation.summary,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('Verifier Current Sprint split module proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (failed.length) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
