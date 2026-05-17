import {
  FOUNDATION_CURRENT_SPRINT_STAGES,
  FOUNDATION_SPRINT_CADENCE_CARD_ID,
  FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_CADENCE_PLAN_PATH,
  FOUNDATION_SPRINT_EXIT_CRITERIA,
  FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_SYSTEM_PLAN_PATH,
} from './foundation-current-sprint.js'
import { MEETING_VAULT_ACL_CARD_ID } from './meeting-vault-acl.js'
import { MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY } from './meeting-vault-auto-enforcement.js'
import { FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY } from './foundation-control-compression.js'

export const VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID = 'VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001'
export const VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-current-sprint-split-module-v1'
export const VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-current-sprint-split-module-001-plan.md'
export const VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001.json'
export const VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-current-sprint-split-module-check.mjs'
export const VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SPRINT_ID = 'verifier-current-sprint-split-module-2026-05-15'
export const VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_BEFORE_LINES = 14984

export const FOUNDATION_SPRINT_SYSTEM_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
]

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function cardText(card = {}) {
  return [
    card.summary,
    card.nextAction,
    card.statusNote,
  ].filter(Boolean).join(' ')
}

function currentSprintReviewNextActionOk(foundationHub = {}, activeSprintCompleteReview = false) {
  if (foundationHub.currentSprint?.cadence?.nextCard?.cardId) return true
  if (!activeSprintCompleteReview) return false
  const nextAction = String(foundationHub.currentSprint?.cadence?.nextAction || '').toLowerCase()
  return nextAction.includes('sprint closeout') ||
    nextAction.includes('sprint review/rollover') ||
    nextAction.includes('sprint review') ||
    nextAction.includes('review/rollover')
}

export function evaluateFoundationCurrentSprintVerifier(input = {}) {
  const checks = []
  const foundationHub = input.foundationHub || {}
  const currentState = input.currentState || ''
  const currentPlan = input.currentPlan || ''
  const foundationFrontendSource = input.foundationFrontendSource || ''
  const foundationStylesSource = input.foundationStylesSource || ''
  const foundationCurrentSprintSource = input.foundationCurrentSprintSource || ''
  const foundationDbSource = input.foundationDbSource || ''
  const serverRouteSource = input.serverRouteSource || ''
  const foundationVerifySource = `${input.foundationVerifySource || ''}\n${input.moduleSource || ''}`
  const foundationSprintSystem = input.foundationSprintSystem || null
  const foundationSprintCadence = input.foundationSprintCadence || null
  const meetingVaultAcl = input.meetingVaultAcl || null
  const meetingVaultAutoEnforcementClosed = input.meetingVaultAutoEnforcementClosed === true
  const foundationCurrentSprintStatus = input.foundationCurrentSprintStatus || {}
  const packageJson = input.packageJson || {}
  const buildLogFoundationSprintSystemBuild = input.buildLogFoundationSprintSystemBuild || null
  const buildLogFoundationSprintCadenceBuild = input.buildLogFoundationSprintCadenceBuild || null
  const foundationSprintSurfaceFollowUp = input.foundationSprintSurfaceFollowUp || null
  const foundationSprintDoneVelocity = input.foundationSprintDoneVelocity || null
  const foundationSprintSystemApproval = input.foundationSprintSystemApproval || {}
  const foundationSprintCadenceApproval = input.foundationSprintCadenceApproval || {}
  const activeSprintCompleteReview = input.activeSprintCompleteReview === true &&
    foundationCurrentSprintStatus.status === 'healthy' &&
    foundationHub.currentSprint?.status === 'healthy'
  const foundationSprintSystemHistoricalStateOk = activeSprintCompleteReview || (
    currentPlan.includes(FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY) &&
    currentPlan.includes(FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID) &&
    currentPlan.includes(FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID) &&
    currentState.includes(FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY) &&
    currentState.includes('Current Sprint') &&
    (meetingVaultAutoEnforcementClosed
      ? currentState.includes(MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY)
      : currentState.includes('MEETING-VAULT-ACL-001 remains scoped'))
  )
  const foundationSprintCadenceHistoricalStateOk = activeSprintCompleteReview || (
    currentPlan.includes(FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY) &&
    currentPlan.includes(FOUNDATION_SPRINT_CADENCE_CARD_ID) &&
    currentState.includes(FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY) &&
    currentState.includes('sprint command view') &&
    currentState.includes('MEETING-VAULT-ACL-001') &&
    (meetingVaultAutoEnforcementClosed
      ? currentState.includes(MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY)
      : currentState.includes('moves into Scoping'))
  )

  addCheck(
    checks,
    foundationSprintSystem?.lane === 'done' &&
      String(foundationSprintSystem?.statusNote || '').includes(FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY) &&
      input.foundationSprintSystemApprovalValidation?.ok === true &&
      input.foundationSprintSystemApprovalValidation?.mode === 'v2' &&
      foundationSprintSystemApproval.cardId === FOUNDATION_SPRINT_SYSTEM_CARD_ID &&
      Number(foundationSprintSystemApproval.score) >= 9.8 &&
      foundationSprintSystemApproval.approvedPlanRef === FOUNDATION_SPRINT_SYSTEM_PLAN_PATH &&
      includesAll(input.foundationSprintSystemPlanSource, [
        'Current Sprint is an overlay on live backlog truth, not a second backlog',
        '`sprint_ready`: Sprint Ready',
        '`returned`: Returned',
        'returnedReason',
        'FOUNDATION-DONE-VELOCITY-001',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'FOUNDATION_CURRENT_SPRINT_STAGES',
        'FOUNDATION_EXISTING_WORK_CHECK_FIELDS',
        'validateExistingWorkCheck',
        'buildFoundationCurrentSprintStatus',
        'buildSyntheticFoundationCurrentSprintProof',
      ]) &&
      FOUNDATION_CURRENT_SPRINT_STAGES.map(stage => stage.key).join(',') === 'scoping,sprint_ready,building_now,returned,done_this_sprint' &&
      includesAll(foundationDbSource, [
        'foundation_sprints',
        'foundation_sprint_items',
        'getActiveFoundationCurrentSprint',
        'upsertFoundationCurrentSprintOverlay',
      ]) &&
      includesAll(serverRouteSource, [
        '/api/foundation/current-sprint',
        'currentSprint',
        'sprint: currentSprint.sprintId',
        'items: currentSprint.items',
        'buildFoundationCurrentSprintStatus',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderCurrentSprintPanel',
        'Current Sprint',
        'done_this_sprint',
        'Sprint command view',
        'current-sprint-board',
        'hub.currentSprint',
        'active Current Sprint move',
        'Sprint Ready requires existing code, docs, scripts, doctrine',
      ]) &&
      !foundationFrontendSource.includes('this panel shows the next Phase G command move') &&
      includesAll(foundationStylesSource, [
        '.current-sprint-panel',
        '.current-sprint-board',
      ]) &&
      packageJson.scripts?.['process:foundation-sprint-system-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-sprint-system-check.mjs' &&
      includesAll(input.foundationSprintSystemScriptSource, [
        input.foundationSprintSystemSummaryMarker || 'FOUNDATION_SPRINT_SYSTEM_SUMMARY',
        'FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES',
        'FOUNDATION-DONE-VELOCITY-001',
        'MEETING-VAULT-ACL-001',
      ]) &&
      includesAll(input.foundationSprintSystemDocSource, [
        'overlay on live backlog',
        'Sprint Ready',
        'Returned requires',
        FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
      ]) &&
      input.syntheticFoundationSprintProof?.ok === true &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      foundationSprintSurfaceFollowUp?.lane === 'scoped' &&
      cardText(foundationSprintSurfaceFollowUp).includes(FOUNDATION_SPRINT_SYSTEM_CARD_ID) &&
      (foundationSprintDoneVelocity?.lane === 'scoped' ||
        (foundationSprintDoneVelocity?.lane === 'done' &&
          String(foundationSprintDoneVelocity?.statusNote || '').includes(FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY))) &&
      cardText(foundationSprintDoneVelocity).includes('velocity') &&
      (meetingVaultAutoEnforcementClosed || meetingVaultAcl?.lane !== 'done') &&
      String(input.foundationSprintCaptureSource || '').includes('Phase B paused') &&
      buildLogFoundationSprintSystemBuild?.operatorCloseout === true &&
      input.foundationSprintSystemBuildLogExact === true &&
      foundationSprintSystemHistoricalStateOk &&
      includesAll(foundationVerifySource, FOUNDATION_SPRINT_SYSTEM_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'FOUNDATION-SPRINT-SYSTEM-001 adds Current Sprint control without a second backlog',
    `lane=${foundationSprintSystem?.lane || 'missing'} sprint=${foundationCurrentSprintStatus.status || 'missing'} api=${foundationHub.currentSprint?.status || 'missing'} meeting=${meetingVaultAcl?.lane || 'missing'}`,
  )

  addCheck(
    checks,
    foundationSprintCadence?.lane === 'done' &&
      String(foundationSprintCadence?.statusNote || '').includes(FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY) &&
      input.foundationSprintCadenceApprovalValidation?.ok === true &&
      input.foundationSprintCadenceApprovalValidation?.mode === 'v2' &&
      foundationSprintCadenceApproval.cardId === FOUNDATION_SPRINT_CADENCE_CARD_ID &&
      Number(foundationSprintCadenceApproval.score) >= 9.8 &&
      foundationSprintCadenceApproval.approvedPlanRef === FOUNDATION_SPRINT_CADENCE_PLAN_PATH &&
      includesAll(input.foundationSprintCadencePlanSource, [
        'executive sprint summary',
        'current status',
        'next card',
        'current blocker',
        'exit criteria',
        'No Google Drive permission mutation is approved',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'FOUNDATION_SPRINT_CADENCE_CARD_ID',
        'FOUNDATION_SPRINT_EXIT_CRITERIA',
        'executiveSummary',
        'nextCard',
        'currentBlocker',
        'stageCounts',
      ]) &&
      FOUNDATION_CURRENT_SPRINT_STAGES.map(stage => stage.key).join(',') === 'scoping,sprint_ready,building_now,returned,done_this_sprint' &&
      FOUNDATION_SPRINT_EXIT_CRITERIA.some(item => item.includes('executive summary')) &&
      FOUNDATION_SPRINT_EXIT_CRITERIA.some(item => item.includes('No Drive permission mutation')) &&
      includesAll(foundationFrontendSource, [
        'Sprint command view',
        'current-sprint-command-grid',
        'current-sprint-board',
        'Exit criteria',
        'Next action',
      ]) &&
      includesAll(foundationStylesSource, [
        '.current-sprint-command-grid',
        '.current-sprint-command-strip',
        '.current-sprint-exit',
        '.current-sprint-board',
        '.current-sprint-stage-row',
      ]) &&
      !foundationStylesSource.includes('.current-sprint-stage-grid') &&
      packageJson.scripts?.['process:foundation-sprint-cadence-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-sprint-cadence-check.mjs' &&
      includesAll(input.foundationSprintCadenceScriptSource, [
        input.foundationSprintCadenceSummaryMarker || 'FOUNDATION_SPRINT_CADENCE_SUMMARY',
        'Current Sprint layout is readable board/rows',
        'REBUILD-PLAN-RECONCILE-001',
      ]) &&
      includesAll(input.foundationSprintCadenceDocSource, [
        FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
        'sprint command view',
        'No Google Drive permission mutations',
        'No request-access emails',
      ]) &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      foundationHub.currentSprint?.cadence?.executiveSummary &&
      currentSprintReviewNextActionOk(foundationHub, activeSprintCompleteReview) &&
      (foundationHub.currentSprint?.cadence?.currentBlocker?.cardId || activeSprintCompleteReview) &&
      Array.isArray(foundationHub.currentSprint?.cadence?.exitCriteria) &&
      foundationHub.currentSprint.cadence.exitCriteria.length > 0 &&
      foundationHub.currentSprint.cadence.exitCriteria.every(item => String(item || '').trim()) &&
      (meetingVaultAutoEnforcementClosed || meetingVaultAcl?.lane !== 'done') &&
      buildLogFoundationSprintCadenceBuild?.operatorCloseout === true &&
      input.foundationSprintCadenceBuildLogExact === true &&
      foundationSprintCadenceHistoricalStateOk &&
      String(input.foundationSprintCaptureSource || '').includes(FOUNDATION_SPRINT_CADENCE_CARD_ID) &&
      String(input.foundationSprintCaptureSource || '').includes('No Drive permission mutation is approved'),
    'FOUNDATION-SPRINT-CADENCE-001 adds readable sprint command view without Drive mutation',
    `lane=${foundationSprintCadence?.lane || 'missing'} sprint=${foundationCurrentSprintStatus.status || 'missing'} api=${foundationHub.currentSprint?.status || 'missing'} next=${foundationHub.currentSprint?.cadence?.nextCard?.cardId || 'missing'} meeting=${meetingVaultAcl?.lane || 'missing'}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(check => check.ok).length,
      failed: checks.filter(check => !check.ok).length,
    },
  }
}

function healthyCurrentSprintFixture() {
  const currentPlan = [
    FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
    FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
    FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
    FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
    FOUNDATION_SPRINT_CADENCE_CARD_ID,
  ].join('\n')
  const currentState = [
    FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
    FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
    'Current Sprint',
    'sprint command view',
    'MEETING-VAULT-ACL-001 remains scoped',
    'MEETING-VAULT-ACL-001 moves into Scoping',
  ].join('\n')
  const frontend = [
    'renderCurrentSprintPanel',
    'Current Sprint',
    'done_this_sprint',
    'Sprint command view',
    'current-sprint-board',
    'hub.currentSprint',
    'active Current Sprint move',
    'Sprint Ready requires existing code, docs, scripts, doctrine',
    'current-sprint-command-grid',
    'Exit criteria',
    'Next action',
  ].join('\n')
  const styles = [
    '.current-sprint-panel',
    '.current-sprint-board',
    '.current-sprint-command-grid',
    '.current-sprint-command-strip',
    '.current-sprint-exit',
    '.current-sprint-stage-row',
  ].join('\n')
  const currentSprintSource = [
    'FOUNDATION_CURRENT_SPRINT_STAGES',
    'FOUNDATION_EXISTING_WORK_CHECK_FIELDS',
    'validateExistingWorkCheck',
    'buildFoundationCurrentSprintStatus',
    'buildSyntheticFoundationCurrentSprintProof',
    'FOUNDATION_SPRINT_CADENCE_CARD_ID',
    'FOUNDATION_SPRINT_EXIT_CRITERIA',
    'executiveSummary',
    'nextCard',
    'currentBlocker',
    'stageCounts',
  ].join('\n')
  return {
    foundationSprintSystem: { lane: 'done', statusNote: FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY },
    foundationSprintCadence: { lane: 'done', statusNote: FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY },
    foundationSprintSystemApprovalValidation: { ok: true, mode: 'v2' },
    foundationSprintCadenceApprovalValidation: { ok: true, mode: 'v2' },
    foundationSprintSystemApproval: { cardId: FOUNDATION_SPRINT_SYSTEM_CARD_ID, score: 10, approvedPlanRef: FOUNDATION_SPRINT_SYSTEM_PLAN_PATH },
    foundationSprintCadenceApproval: { cardId: FOUNDATION_SPRINT_CADENCE_CARD_ID, score: 10, approvedPlanRef: FOUNDATION_SPRINT_CADENCE_PLAN_PATH },
    foundationSprintSystemPlanSource: 'Current Sprint is an overlay on live backlog truth, not a second backlog\n`sprint_ready`: Sprint Ready\n`returned`: Returned\nreturnedReason\nFOUNDATION-DONE-VELOCITY-001',
    foundationSprintCadencePlanSource: 'executive sprint summary\ncurrent status\nnext card\ncurrent blocker\nexit criteria\nNo Google Drive permission mutation is approved',
    foundationCurrentSprintSource: currentSprintSource,
    foundationDbSource: 'foundation_sprints\nfoundation_sprint_items\ngetActiveFoundationCurrentSprint\nupsertFoundationCurrentSprintOverlay',
    serverRouteSource: '/api/foundation/current-sprint\ncurrentSprint\nsprint: currentSprint.sprintId\nitems: currentSprint.items\nbuildFoundationCurrentSprintStatus',
    foundationFrontendSource: frontend,
    foundationStylesSource: styles,
    packageJson: {
      scripts: {
        'process:foundation-sprint-system-check': 'node --env-file-if-exists=.env scripts/process-foundation-sprint-system-check.mjs',
        'process:foundation-sprint-cadence-check': 'node --env-file-if-exists=.env scripts/process-foundation-sprint-cadence-check.mjs',
      },
    },
    foundationSprintSystemScriptSource: 'FOUNDATION_SPRINT_SYSTEM_SUMMARY\nFOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES\nFOUNDATION-DONE-VELOCITY-001\nMEETING-VAULT-ACL-001',
    foundationSprintCadenceScriptSource: 'FOUNDATION_SPRINT_CADENCE_SUMMARY\nCurrent Sprint layout is readable board/rows\nREBUILD-PLAN-RECONCILE-001',
    foundationSprintSystemDocSource: `overlay on live backlog\nSprint Ready\nReturned requires\n${FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY}`,
    foundationSprintCadenceDocSource: `${FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY}\nsprint command view\nNo Google Drive permission mutations\nNo request-access emails`,
    syntheticFoundationSprintProof: { ok: true },
    foundationCurrentSprintStatus: { status: 'healthy' },
    foundationHub: {
      currentSprint: {
        status: 'healthy',
        cadence: {
          executiveSummary: 'Sprint summary',
          nextCard: { cardId: 'NEXT-CARD' },
          currentBlocker: { cardId: 'NEXT-CARD' },
          exitCriteria: ['done'],
          nextAction: 'Build next card.',
        },
      },
    },
    foundationSprintSurfaceFollowUp: { lane: 'scoped', summary: FOUNDATION_SPRINT_SYSTEM_CARD_ID },
    foundationSprintDoneVelocity: { lane: 'scoped', summary: 'velocity' },
    meetingVaultAutoEnforcementClosed: false,
    meetingVaultAcl: { lane: 'scoped' },
    foundationSprintCaptureSource: `Phase B paused\n${FOUNDATION_SPRINT_CADENCE_CARD_ID}\nNo Drive permission mutation is approved`,
    buildLogFoundationSprintSystemBuild: { operatorCloseout: true },
    buildLogFoundationSprintCadenceBuild: { operatorCloseout: true },
    foundationSprintSystemBuildLogExact: true,
    foundationSprintCadenceBuildLogExact: true,
    currentPlan,
    currentState,
    foundationVerifySource: FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  }
}

export function buildFoundationCurrentSprintVerifierDogfoodProof() {
  const healthyInput = healthyCurrentSprintFixture()
  const healthy = evaluateFoundationCurrentSprintVerifier(healthyInput)
  const badApi = evaluateFoundationCurrentSprintVerifier({
    ...healthyInput,
    foundationHub: { currentSprint: { status: 'risk', cadence: healthyInput.foundationHub.currentSprint.cadence } },
  })
  const missingDoctrine = evaluateFoundationCurrentSprintVerifier({
    ...healthyInput,
    foundationCurrentSprintSource: 'FOUNDATION_CURRENT_SPRINT_STAGES only',
  })
  const missingBuildLog = evaluateFoundationCurrentSprintVerifier({
    ...healthyInput,
    foundationSprintSystemBuildLogExact: false,
    foundationSprintCadenceBuildLogExact: false,
  })
  const missingDriveGuard = evaluateFoundationCurrentSprintVerifier({
    ...healthyInput,
    currentState: healthyInput.currentState.replace('MEETING-VAULT-ACL-001 moves into Scoping', ''),
    foundationSprintCaptureSource: 'Phase B paused',
  })
  const reviewComplete = evaluateFoundationCurrentSprintVerifier({
    ...healthyInput,
    activeSprintCompleteReview: true,
    currentPlan: '',
    currentState: '',
    foundationHub: {
      currentSprint: {
        status: 'healthy',
        cadence: {
          executiveSummary: 'Sprint summary',
          exitCriteria: ['done'],
          nextAction: 'Sprint review/rollover is next.',
        },
      },
    },
  })
  const unhealthyReviewComplete = evaluateFoundationCurrentSprintVerifier({
    ...healthyInput,
    activeSprintCompleteReview: true,
    currentPlan: '',
    currentState: '',
    foundationCurrentSprintStatus: { status: 'risk' },
    foundationHub: {
      currentSprint: {
        status: 'healthy',
        cadence: {
          executiveSummary: 'Sprint summary',
          exitCriteria: ['done'],
          nextAction: 'Sprint review/rollover is next.',
        },
      },
    },
  })
  return {
    ok: healthy.ok === true &&
      reviewComplete.ok === true &&
      badApi.ok === false &&
      missingDoctrine.ok === false &&
      missingBuildLog.ok === false &&
      missingDriveGuard.ok === false &&
      unhealthyReviewComplete.ok === false,
    healthy,
    reviewComplete,
    badApi,
    missingDoctrine,
    missingBuildLog,
    missingDriveGuard,
    unhealthyReviewComplete,
    dogfoodInvariant: 'Current Sprint verifier accepts healthy sprint proof and completed-sprint review state, and rejects unhealthy API/status, missing doctrine markers, missing build-log ownership, and missing Drive/Meeting Vault stop-lines.',
  }
}
