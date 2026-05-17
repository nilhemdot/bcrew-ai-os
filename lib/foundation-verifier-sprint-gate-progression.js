import { MEETING_VAULT_ACL_CARD_ID } from './meeting-vault-acl.js'
import {
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
  AVATAR_IMPORT_CARD_ID,
  BRAND_STACK_CARD_ID,
  FOUNDATION_SPRINT_CADENCE_CARD_ID,
  FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  MARKETING_SOURCE_MAP_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
  PLAN_CRITIC_REPLACEMENT_PLAN_PATH,
  PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH,
  REBUILD_PLAN_RECONCILE_CARD_ID,
  REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
  REBUILD_PLAN_RECONCILE_PLAN_PATH,
  REBUILD_PLAN_RECONCILE_SCRIPT_PATH,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
  SECURITY_BEHAVIOR_PROOF_PLAN_PATH,
  SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH,
  SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  VERIFICATION_RUNS_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
  VERIFIER_BEHAVIOR_SWEEP_PLAN_PATH,
  VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH,
} from './foundation-current-sprint.js'
import {
  VERIFY_GATE_TIERING_CARD_ID,
  VERIFY_GATE_TIERING_CLOSEOUT_KEY,
  VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND,
  VERIFY_GATE_TIERING_PLAN_PATH,
  VERIFY_GATE_TIERING_SCRIPT_PATH,
} from './process-verify-gate-tiering.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
  PLAN_CRITIC_SCORING_SCHEMA,
  buildPlanCriticResultSummary,
} from './process-plan-critic.js'
import {
  SECURITY_BEHAVIOR_PROOF_SUMMARY_MARKER,
} from './security-behavior-proof.js'
import {
  VERIFIER_BEHAVIOR_SWEEP_MIN_TARGETS,
  VERIFIER_BEHAVIOR_SWEEP_SUMMARY_MARKER,
} from './verifier-behavior-sweep.js'
import { FOUNDATION_DONE_TEST_CARD_ID } from './foundation-readiness-gates.js'
import { SOURCE_MATURITY_GRID_CARD_ID } from './source-maturity-grid.js'
import { VERIFICATION_RUNS_NEXT_CARD_ID } from './verification-runs.js'
import { PER_USER_CHANGELOG_NEXT_CARD_ID } from './per-user-changelog.js'
import { DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID } from './decision-restricted-queue.js'
import { evaluateFoundationCurrentSprintVerifier } from './foundation-current-sprint-verifier.js'

export const VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID = 'VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001'
export const VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CLOSEOUT_KEY = 'verifier-sprint-gate-progression-split-v1'
export const VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_PLAN_PATH = 'docs/process/verifier-sprint-gate-progression-split-001-plan.md'
export const VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001.json'
export const VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-sprint-gate-progression-split-check.mjs'
export const VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-sprint-gate-progression-split-closeout.md'
export const VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_BEFORE_LINES = 10303

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function evaluateSprintGateProgressionFixture(fixture = {}) {
  const findings = []
  if (fixture.currentSprintSystemClosed !== true) findings.push('current_sprint_system_hidden_failure')
  if (fixture.verifyGateTieringClosed !== true) findings.push('verify_gate_tiering_hidden_failure')
  if (fixture.planCriticGateClosed !== true) findings.push('plan_critic_gate_hidden_failure')
  if (fixture.securityBehaviorClosed !== true) findings.push('security_behavior_hidden_failure')
  if (fixture.verifierBehaviorSweepClosed !== true) findings.push('verifier_behavior_sweep_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_sprint_gate_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierSprintGateProgressionDogfoodProof() {
  const healthy = evaluateSprintGateProgressionFixture({
    currentSprintSystemClosed: true,
    verifyGateTieringClosed: true,
    planCriticGateClosed: true,
    securityBehaviorClosed: true,
    verifierBehaviorSweepClosed: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenCurrentSprintSystem: evaluateSprintGateProgressionFixture({
      currentSprintSystemClosed: false,
      verifyGateTieringClosed: true,
      planCriticGateClosed: true,
      securityBehaviorClosed: true,
      verifierBehaviorSweepClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenVerifyGateTiering: evaluateSprintGateProgressionFixture({
      currentSprintSystemClosed: true,
      verifyGateTieringClosed: false,
      planCriticGateClosed: true,
      securityBehaviorClosed: true,
      verifierBehaviorSweepClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenPlanCriticGate: evaluateSprintGateProgressionFixture({
      currentSprintSystemClosed: true,
      verifyGateTieringClosed: true,
      planCriticGateClosed: false,
      securityBehaviorClosed: true,
      verifierBehaviorSweepClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenSecurityBehavior: evaluateSprintGateProgressionFixture({
      currentSprintSystemClosed: true,
      verifyGateTieringClosed: true,
      planCriticGateClosed: true,
      securityBehaviorClosed: false,
      verifierBehaviorSweepClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenVerifierBehaviorSweep: evaluateSprintGateProgressionFixture({
      currentSprintSystemClosed: true,
      verifyGateTieringClosed: true,
      planCriticGateClosed: true,
      securityBehaviorClosed: true,
      verifierBehaviorSweepClosed: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateSprintGateProgressionFixture({
      currentSprintSystemClosed: true,
      verifyGateTieringClosed: true,
      planCriticGateClosed: true,
      securityBehaviorClosed: true,
      verifierBehaviorSweepClosed: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy sprint gate progression fixture passes; hidden sprint, verify-gate, plan-critic, security, verifier-behavior, and old-inline failures fail closed'
      : 'sprint gate progression dogfood did not reject every known failure fixture',
  }
}

export function evaluateFoundationVerifierSprintGateProgression(input = {}) {
  const {
    activeSprintAtOrPast,
    activeSprintCompleteReview,
    buildLogFoundationSprintCadenceBuild,
    buildLogFoundationSprintSystemBuild,
    buildLogPlanCriticReplacementBuild,
    buildLogRebuildPlanReconcileBuild,
    buildLogSecurityBehaviorProofBuild,
    buildLogVerifierBehaviorSweepBuild,
    buildLogVerifyGateTieringBuild,
    currentPlan,
    currentState,
    currentStateMentionsActiveBlockerOrLater,
    foundationCurrentSprintSource,
    foundationCurrentSprintStatus,
    foundationCurrentSprintVerifierSource,
    foundationDbSource,
    foundationFrontendSource,
    foundationHub,
    foundationSprintCadence,
    foundationSprintCadenceApproval,
    foundationSprintCadenceApprovalValidation,
    foundationSprintCadenceDocSource,
    foundationSprintCadencePlanSource,
    foundationSprintCadenceScriptSource,
    foundationSprintCaptureSource,
    foundationSprintSystem,
    foundationSprintSystemApproval,
    foundationSprintSystemApprovalValidation,
    foundationSprintSystemDocSource,
    foundationSprintSystemPlanSource,
    foundationSprintSystemScriptSource,
    foundationSprintDoneVelocity,
    foundationSprintSurfaceFollowUp,
    foundationStylesSource,
    foundationVerifySource,
    meetingVaultAcl,
    meetingVaultAutoEnforcementClosed,
    packageJson,
    planCriticApproval,
    planCriticApprovalValidation,
    planCriticDecisionTreeSource,
    planCriticPlanSource,
    planCriticReplacement,
    planCriticScriptSource,
    planCriticSelfReview,
    planCriticSource,
    planCriticSynthetic,
    processGitHooksSource,
    rebuildPlanReconcile,
    rebuildPlanReconcileApproval,
    rebuildPlanReconcileApprovalValidation,
    rebuildPlanReconcilePlanSource,
    rebuildPlanReconcileScriptSource,
    securityBehaviorPlanReview,
    securityBehaviorProof,
    securityBehaviorProofApproval,
    securityBehaviorProofApprovalValidation,
    securityBehaviorProofPlanSource,
    securityBehaviorProofScriptSource,
    securityBehaviorProofSource,
    securityBehaviorProofSynthetic,
    serverRouteSource,
    syntheticFoundationSprintProof,
    verifierBehaviorSweep,
    verifierBehaviorSweepApproval,
    verifierBehaviorSweepApprovalValidation,
    verifierBehaviorSweepPlanSource,
    verifierBehaviorSweepScriptSource,
    verifierBehaviorSweepSource,
    verifierBehaviorSweepSynthetic,
    verifyGateTiering,
    verifyGateTieringPlanSource,
    verifyGateTieringScriptSource,
    verifyGateTieringSource,
    verifyGateTieringSynthetic,
  } = input
  const checks = []
  const sprintAtOrPast = typeof activeSprintAtOrPast === 'function' ? activeSprintAtOrPast : () => false
  const stateMentionsActiveOrLater = typeof currentStateMentionsActiveBlockerOrLater === 'function'
    ? currentStateMentionsActiveBlockerOrLater
    : (...snippets) => snippets.some(snippet => typeof snippet === 'boolean' ? snippet : String(currentState || '').includes(snippet))

  const foundationSprintSystemBuildLogExact = buildLogFoundationSprintSystemBuild?.backlogIds?.length === 1 &&
    buildLogFoundationSprintSystemBuild.backlogIds.includes(FOUNDATION_SPRINT_SYSTEM_CARD_ID) &&
    [
      MEETING_VAULT_ACL_CARD_ID,
      FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
      FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
    ].every(id => (buildLogFoundationSprintSystemBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      MEETING_VAULT_ACL_CARD_ID,
      FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
      FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
    ].every(id => !(buildLogFoundationSprintSystemBuild.backlogIds || []).includes(id))
  const foundationSprintCadenceBuildLogExact = buildLogFoundationSprintCadenceBuild?.backlogIds?.length === 1 &&
    buildLogFoundationSprintCadenceBuild.backlogIds.includes(FOUNDATION_SPRINT_CADENCE_CARD_ID) &&
    [
      FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      MEETING_VAULT_ACL_CARD_ID,
      FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
      FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
    ].every(id => (buildLogFoundationSprintCadenceBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      MEETING_VAULT_ACL_CARD_ID,
      FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
      FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
    ].every(id => !(buildLogFoundationSprintCadenceBuild.backlogIds || []).includes(id))
  const verifyGateTieringBuildLogExact = buildLogVerifyGateTieringBuild?.backlogIds?.length === 1 &&
    buildLogVerifyGateTieringBuild.backlogIds.includes(VERIFY_GATE_TIERING_CARD_ID) &&
    [
      REBUILD_PLAN_RECONCILE_CARD_ID,
      VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    ].every(id => (buildLogVerifyGateTieringBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      REBUILD_PLAN_RECONCILE_CARD_ID,
      VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    ].every(id => !(buildLogVerifyGateTieringBuild.backlogIds || []).includes(id))
  const rebuildPlanReconcileBuildLogExact = buildLogRebuildPlanReconcileBuild?.backlogIds?.length === 1 &&
    buildLogRebuildPlanReconcileBuild.backlogIds.includes(REBUILD_PLAN_RECONCILE_CARD_ID) &&
    [
      PLAN_CRITIC_REPLACEMENT_CARD_ID,
      SECURITY_BEHAVIOR_PROOF_CARD_ID,
      VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
      'TELEGRAM-BOTS-REBUILD-001',
      'INTEL-DIRECTORS-REBUILD-001',
    ].every(id => (buildLogRebuildPlanReconcileBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      PLAN_CRITIC_REPLACEMENT_CARD_ID,
      SECURITY_BEHAVIOR_PROOF_CARD_ID,
      VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
      'TELEGRAM-BOTS-REBUILD-001',
      'INTEL-DIRECTORS-REBUILD-001',
    ].every(id => !(buildLogRebuildPlanReconcileBuild.backlogIds || []).includes(id))
  const planCriticReplacementBuildLogExact = buildLogPlanCriticReplacementBuild?.backlogIds?.length === 1 &&
    buildLogPlanCriticReplacementBuild.backlogIds.includes(PLAN_CRITIC_REPLACEMENT_CARD_ID) &&
    [
      SECURITY_BEHAVIOR_PROOF_CARD_ID,
      VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
      'STRATEGY-HUB-MEETING-READY-001',
      AVATAR_IMPORT_CARD_ID,
    ].every(id => (buildLogPlanCriticReplacementBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      SECURITY_BEHAVIOR_PROOF_CARD_ID,
      VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
      'STRATEGY-HUB-MEETING-READY-001',
      AVATAR_IMPORT_CARD_ID,
    ].every(id => !(buildLogPlanCriticReplacementBuild.backlogIds || []).includes(id))
  const securityBehaviorProofBuildLogExact = buildLogSecurityBehaviorProofBuild?.backlogIds?.length === 1 &&
    buildLogSecurityBehaviorProofBuild.backlogIds.includes(SECURITY_BEHAVIOR_PROOF_CARD_ID) &&
    [
      'SECURITY-002',
      VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
      'SECURITY-FILTERED-COMMS-ACCESS-001',
    ].every(id => (buildLogSecurityBehaviorProofBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      'SECURITY-002',
      VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
      'SECURITY-FILTERED-COMMS-ACCESS-001',
    ].every(id => !(buildLogSecurityBehaviorProofBuild.backlogIds || []).includes(id))
  const verifierBehaviorSweepBuildLogExact = buildLogVerifierBehaviorSweepBuild?.backlogIds?.length === 1 &&
    buildLogVerifierBehaviorSweepBuild.backlogIds.includes(VERIFIER_BEHAVIOR_SWEEP_CARD_ID) &&
    [
      STRATEGY_HUB_MEETING_READY_CARD_ID,
      AVATAR_IMPORT_CARD_ID,
      'SECURITY-FILTERED-COMMS-ACCESS-001',
    ].every(id => (buildLogVerifierBehaviorSweepBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      STRATEGY_HUB_MEETING_READY_CARD_ID,
      AVATAR_IMPORT_CARD_ID,
      'SECURITY-FILTERED-COMMS-ACCESS-001',
    ].every(id => !(buildLogVerifierBehaviorSweepBuild.backlogIds || []).includes(id))

  const currentSprintVerifier = evaluateFoundationCurrentSprintVerifier({
    foundationHub,
    currentPlan,
    currentState,
    foundationFrontendSource,
    foundationStylesSource,
    foundationCurrentSprintSource,
    foundationDbSource,
    serverRouteSource,
    foundationVerifySource,
    moduleSource: foundationCurrentSprintVerifierSource,
    foundationSprintSystem,
    foundationSprintCadence,
    meetingVaultAcl,
    meetingVaultAutoEnforcementClosed,
    foundationCurrentSprintStatus,
    packageJson,
    buildLogFoundationSprintSystemBuild,
    buildLogFoundationSprintCadenceBuild,
    foundationSprintSurfaceFollowUp,
    foundationSprintDoneVelocity,
    foundationSprintSystemApprovalValidation,
    foundationSprintCadenceApprovalValidation,
    foundationSprintSystemApproval,
    foundationSprintCadenceApproval,
    foundationSprintSystemPlanSource,
    foundationSprintCadencePlanSource,
    foundationSprintSystemScriptSource,
    foundationSprintCadenceScriptSource,
    foundationSprintSystemDocSource,
    foundationSprintCadenceDocSource,
    foundationSprintCaptureSource,
    foundationSprintSystemBuildLogExact,
    foundationSprintCadenceBuildLogExact,
    syntheticFoundationSprintProof,
    activeSprintCompleteReview,
    foundationSprintSystemSummaryMarker: input.foundationSprintSystemSummaryMarker,
    foundationSprintCadenceSummaryMarker: input.foundationSprintCadenceSummaryMarker,
  })
  checks.push(...currentSprintVerifier.checks)

  ensure(
    checks,
    verifyGateTiering?.lane === 'done' &&
      String(verifyGateTiering?.statusNote || '').includes(VERIFY_GATE_TIERING_CLOSEOUT_KEY) &&
      packageJson.scripts?.['process:verify-gate-tiering-check'] === `node --env-file-if-exists=.env ${VERIFY_GATE_TIERING_SCRIPT_PATH}` &&
      verifyGateTieringSynthetic.ok &&
      includesAll(verifyGateTieringSource, [
        'classifyVerificationGateForFiles',
        'buildSyntheticVerifyGateTieringProof',
        VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND,
        'fullVerifyRequired',
      ]) &&
      includesAll(verifyGateTieringScriptSource, [
        'VERIFY_GATE_TIERING_OK',
        'recordFocusedVerificationProof',
        'runBacklogHygiene',
      ]) &&
      includesAll(verifyGateTieringPlanSource, [
        VERIFY_GATE_TIERING_CARD_ID,
        'focused verification',
        'full Foundation ship gate',
      ]) &&
      includesAll(processGitHooksSource, [
        'FOUNDATION_FOCUSED_VERIFY_PROOF_PATH',
        'classifyVerificationGateForFiles',
        'recordFocusedVerificationProof',
      ]) &&
      buildLogVerifyGateTieringBuild?.operatorCloseout === true &&
      verifyGateTieringBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      sprintAtOrPast([
        SECURITY_BEHAVIOR_PROOF_CARD_ID,
        VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
        'STRATEGY-HUB-MEETING-READY-001',
        AVATAR_IMPORT_CARD_ID,
        AUTO_DEPLOY_ROLLBACK_CARD_ID,
        SOURCE_MATURITY_GRID_CARD_ID,
        SOURCE_EXTRACTION_COVERAGE_CARD_ID,
        SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
        MARKETING_SOURCE_MAP_CARD_ID,
        BRAND_STACK_CARD_ID,
        TIER_BEHAVIORAL_COMPLETION_CARD_ID,
        'VERIFICATION-RUNS-001',
        VERIFICATION_RUNS_NEXT_CARD_ID,
        PER_USER_CHANGELOG_NEXT_CARD_ID,
        DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
      ]) &&
      currentPlan.includes(VERIFY_GATE_TIERING_CARD_ID) &&
      currentPlan.includes('proportional verification') &&
      currentState.includes(VERIFY_GATE_TIERING_CARD_ID) &&
      currentState.includes('proportional verification'),
    'VERIFY-GATE-TIERING-001 adds proportional Foundation verification without weakening full-risk gates',
    `lane=${verifyGateTiering?.lane || 'missing'} synthetic=${verifyGateTieringSynthetic.ok} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )

  ensure(
    checks,
    rebuildPlanReconcile?.lane === 'done' &&
      String(rebuildPlanReconcile?.statusNote || '').includes(REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY) &&
      packageJson.scripts?.['process:rebuild-plan-reconcile-check'] === `node --env-file-if-exists=.env ${REBUILD_PLAN_RECONCILE_SCRIPT_PATH}` &&
      rebuildPlanReconcileApprovalValidation.ok &&
      rebuildPlanReconcileApprovalValidation.mode === 'v2' &&
      rebuildPlanReconcileApproval.cardId === REBUILD_PLAN_RECONCILE_CARD_ID &&
      Number(rebuildPlanReconcileApproval.score) >= 9.8 &&
      rebuildPlanReconcileApproval.approvedPlanRef === REBUILD_PLAN_RECONCILE_PLAN_PATH &&
      includesAll(rebuildPlanReconcilePlanSource, [
        REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
        'owner-only Strategy re-entry',
        'Telegram/mobile bots',
        'Directors/Master Director',
        PLAN_CRITIC_REPLACEMENT_CARD_ID,
      ]) &&
      includesAll(rebuildPlanReconcileScriptSource, [
        'REBUILD_PLAN_RECONCILE_SUMMARY',
        'REQUIRED_OLD_SYSTEM_GAP_CARDS',
        'Current Sprint active blocker advanced through Plan Critic',
        'old-system gap cards exist',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY',
        'PLAN_CRITIC_REPLACEMENT_CARD_ID',
        'PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY',
      ]) &&
      buildLogRebuildPlanReconcileBuild?.operatorCloseout === true &&
      rebuildPlanReconcileBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      sprintAtOrPast([
        SECURITY_BEHAVIOR_PROOF_CARD_ID,
        VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
        'STRATEGY-HUB-MEETING-READY-001',
        AVATAR_IMPORT_CARD_ID,
        AUTO_DEPLOY_ROLLBACK_CARD_ID,
        SOURCE_MATURITY_GRID_CARD_ID,
        SOURCE_EXTRACTION_COVERAGE_CARD_ID,
        SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
        MARKETING_SOURCE_MAP_CARD_ID,
        BRAND_STACK_CARD_ID,
        TIER_BEHAVIORAL_COMPLETION_CARD_ID,
        'VERIFICATION-RUNS-001',
        VERIFICATION_RUNS_NEXT_CARD_ID,
        PER_USER_CHANGELOG_NEXT_CARD_ID,
        DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
      ]) &&
      currentPlan.includes(REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY) &&
      currentPlan.includes('not automatically active') &&
      currentPlan.includes('TELEGRAM-BOTS-REBUILD-001') &&
      currentPlan.includes('INTEL-DIRECTORS-REBUILD-001') &&
      currentState.includes(REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY) &&
      currentState.includes('legacy-exception sprint') &&
      currentState.includes(PLAN_CRITIC_REPLACEMENT_CARD_ID) &&
      currentState.includes('TELEGRAM-BOTS-REBUILD-001') &&
      currentState.includes('INTEL-DIRECTORS-REBUILD-001'),
    'REBUILD-PLAN-RECONCILE-001 closes the audit reset and keeps Plan Critic in the sprint order',
    `lane=${rebuildPlanReconcile?.lane || 'missing'} approval=${rebuildPlanReconcileApprovalValidation.ok} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )

  ensure(
    checks,
    planCriticReplacement?.lane === 'done' &&
      String(planCriticReplacement?.statusNote || '').includes(PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY) &&
      packageJson.scripts?.['process:plan-critic-check'] === `node --env-file-if-exists=.env ${PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH}` &&
      planCriticApprovalValidation.ok &&
      planCriticApprovalValidation.mode === 'v2' &&
      planCriticApproval.cardId === PLAN_CRITIC_REPLACEMENT_CARD_ID &&
      Number(planCriticApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      planCriticApproval.approvedPlanRef === PLAN_CRITIC_REPLACEMENT_PLAN_PATH &&
      Math.abs(PLAN_CRITIC_SCORING_SCHEMA.reduce((sum, item) => sum + item.maxScore, 0) - 10) < 0.001 &&
      planCriticSelfReview.status === 'pass' &&
      planCriticSelfReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      planCriticSynthetic.ok &&
      includesAll(planCriticSource, [
        'PLAN_CRITIC_SCORING_SCHEMA',
        'behavior_not_substring',
        PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
        'rejectsSubstringProof',
        'classifyFoundationGateDecision',
        'buildSyntheticPlanCriticProof',
      ]) &&
      includesAll(planCriticScriptSource, [
        'PLAN_CRITIC_SUMMARY_MARKER',
        'synthetic strong/weak/broad/root-vs-patch plan proof passes',
        'synthetic symptom-patch escape plan is rejected',
        'Current Sprint active blocker advanced to security behavior proof',
      ]) &&
      includesAll(planCriticPlanSource, [
        PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
        'behavior-not-substring',
        'gate decision tree',
        'substring-only',
        SECURITY_BEHAVIOR_PROOF_CARD_ID,
      ]) &&
      includesAll(planCriticDecisionTreeSource, [
        'docs-only',
        'static',
        'focused',
        'full',
        'auth',
        'schema',
        'package',
        'canonical verifier',
        'process:foundation-ship',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
        'SECURITY_BEHAVIOR_PROOF_CARD_ID',
        'process:plan-critic-check',
      ]) &&
      buildLogPlanCriticReplacementBuild?.operatorCloseout === true &&
      planCriticReplacementBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      sprintAtOrPast([
        SECURITY_BEHAVIOR_PROOF_CARD_ID,
        VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
        'STRATEGY-HUB-MEETING-READY-001',
        AVATAR_IMPORT_CARD_ID,
        AUTO_DEPLOY_ROLLBACK_CARD_ID,
        SOURCE_MATURITY_GRID_CARD_ID,
        SOURCE_EXTRACTION_COVERAGE_CARD_ID,
        SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
        MARKETING_SOURCE_MAP_CARD_ID,
        BRAND_STACK_CARD_ID,
        TIER_BEHAVIORAL_COMPLETION_CARD_ID,
        'VERIFICATION-RUNS-001',
        VERIFICATION_RUNS_NEXT_CARD_ID,
        PER_USER_CHANGELOG_NEXT_CARD_ID,
        DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
      ]) &&
      currentPlan.includes(PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY) &&
      currentPlan.includes('gate decision tree') &&
      currentPlan.includes(SECURITY_BEHAVIOR_PROOF_CARD_ID) &&
      currentState.includes(PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY) &&
      currentState.includes('SECURITY-BEHAVIOR-PROOF-001'),
    'PLAN-CRITIC-REPLACEMENT-001 adds a fast behavior-not-substring pre-build gate',
    `lane=${planCriticReplacement?.lane || 'missing'} approval=${planCriticApprovalValidation.ok} self=${buildPlanCriticResultSummary(planCriticSelfReview)} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )

  ensure(
    checks,
    securityBehaviorProof?.lane === 'done' &&
      String(securityBehaviorProof?.statusNote || '').includes(SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY) &&
      packageJson.scripts?.['process:security-behavior-proof-check'] === `node --env-file-if-exists=.env ${SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH}` &&
      securityBehaviorProofApprovalValidation.ok &&
      securityBehaviorProofApprovalValidation.mode === 'v2' &&
      securityBehaviorProofApproval.cardId === SECURITY_BEHAVIOR_PROOF_CARD_ID &&
      Number(securityBehaviorProofApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      securityBehaviorProofApproval.approvedPlanRef === SECURITY_BEHAVIOR_PROOF_PLAN_PATH &&
      securityBehaviorPlanReview.status === 'pass' &&
      securityBehaviorPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      securityBehaviorProofSynthetic.ok &&
      securityBehaviorProofSynthetic.summary.routeCaseCount >= 15 &&
      securityBehaviorProofSynthetic.summary.coveredActors.includes('tannerSubject') &&
      securityBehaviorProofSynthetic.subjectPerson.tannerVisibleIds.includes('team-open-operating-note') &&
      !securityBehaviorProofSynthetic.subjectPerson.tannerVisibleIds.includes('tanner-tier1-comp') &&
      !securityBehaviorProofSynthetic.subjectPerson.tannerVisibleIds.includes('tanner-performance-concern') &&
      securityBehaviorProofSynthetic.routeCases.some(item => item.id === 'shared-comms-archive-stays-owner-only-for-ops' && item.ok) &&
      securityBehaviorProofSynthetic.routeCases.some(item => item.id === 'strategy-v2-stays-owner-only-for-sales' && item.ok) &&
      securityBehaviorProofSynthetic.routeCases.some(item => item.id === 'sales-cannot-read-unregistered-protected-route' && item.ok) &&
      includesAll(securityBehaviorProofSource, [
        'buildSyntheticSecurityBehaviorProof',
        'buildSubjectPersonLeakProof',
        'SECURITY_BEHAVIOR_ROUTE_CASES',
        'tanner.marsh@bensoncrew.ca',
        'authorizeRouteAccess',
        'buildRedactedCollectionResponse',
      ]) &&
      includesAll(securityBehaviorProofScriptSource, [
        SECURITY_BEHAVIOR_PROOF_SUMMARY_MARKER,
        'route and subject-person behavior matrix passes',
        'Current Sprint active blocker advanced through verifier behavior sweep',
      ]) &&
      includesAll(securityBehaviorProofPlanSource, [
        SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
        'actual function path',
        'Tanner',
        'Substring-only proof is rejected',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
        'process:security-behavior-proof-check',
      ]) &&
      buildLogSecurityBehaviorProofBuild?.operatorCloseout === true &&
      securityBehaviorProofBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      sprintAtOrPast([VERIFIER_BEHAVIOR_SWEEP_CARD_ID, STRATEGY_HUB_MEETING_READY_CARD_ID, AVATAR_IMPORT_CARD_ID, AUTO_DEPLOY_ROLLBACK_CARD_ID, SOURCE_MATURITY_GRID_CARD_ID, SOURCE_EXTRACTION_COVERAGE_CARD_ID, SOURCE_COVERAGE_CLOSEOUT_CARD_ID, MARKETING_SOURCE_MAP_CARD_ID, BRAND_STACK_CARD_ID, TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'VERIFICATION-RUNS-001', VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY) &&
      currentPlan.includes('route-boundary') &&
      currentPlan.includes(VERIFIER_BEHAVIOR_SWEEP_CARD_ID) &&
      currentState.includes(SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY) &&
      stateMentionsActiveOrLater('Current sprint active blocker is now `VERIFIER-BEHAVIOR-SWEEP-001`') &&
      currentState.includes('subject-person'),
    'SECURITY-BEHAVIOR-PROOF-001 proves route-boundary access and subject-person redaction behavior',
    `lane=${securityBehaviorProof?.lane || 'missing'} approval=${securityBehaviorProofApprovalValidation.ok} behavior=${securityBehaviorProofSynthetic.ok} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )

  ensure(
    checks,
    verifierBehaviorSweep?.lane === 'done' &&
      String(verifierBehaviorSweep?.statusNote || '').includes(VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY) &&
      packageJson.scripts?.['process:verifier-behavior-sweep-check'] === `node --env-file-if-exists=.env ${VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH}` &&
      verifierBehaviorSweepApprovalValidation.ok &&
      verifierBehaviorSweepApprovalValidation.mode === 'v2' &&
      verifierBehaviorSweepApproval.cardId === VERIFIER_BEHAVIOR_SWEEP_CARD_ID &&
      Number(verifierBehaviorSweepApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      verifierBehaviorSweepApproval.approvedPlanRef === VERIFIER_BEHAVIOR_SWEEP_PLAN_PATH &&
      verifierBehaviorSweepSynthetic.ok &&
      verifierBehaviorSweepSynthetic.summary.targetCount >= VERIFIER_BEHAVIOR_SWEEP_MIN_TARGETS &&
      verifierBehaviorSweepSynthetic.summary.behaviorCoveredTargetCount === verifierBehaviorSweepSynthetic.summary.targetCount &&
      verifierBehaviorSweepSynthetic.summary.substringOnlyTargetCount === 0 &&
      verifierBehaviorSweepSynthetic.targets.some(item => item.cardId === 'SYNTHESIS-VERIFY-001' && item.ok && item.proof?.unverifiedRejected) &&
      verifierBehaviorSweepSynthetic.targets.some(item => item.cardId === 'SYSTEM-010-GHOST-CLOSEOUT-001' && item.ok && item.proof?.unsafeStop?.failClosed) &&
      verifierBehaviorSweepSynthetic.targets.some(item => item.cardId === FOUNDATION_DONE_TEST_CARD_ID && item.ok && item.proof?.missingCloseout?.blockingCards?.includes('SYNTHESIS-VERIFY-001')) &&
      includesAll(verifierBehaviorSweepSource, [
        'VERIFIER_BEHAVIOR_TARGETS',
        'buildSyntheticVerifierBehaviorSweepProof',
        'verifySynthesizedRecord',
        'buildStopDecision',
        'buildFoundationReadinessStatus',
        'buildSourceLifecycleCompletionStatus',
        'substringOnlyProofRejected',
      ]) &&
      includesAll(verifierBehaviorSweepScriptSource, [
        VERIFIER_BEHAVIOR_SWEEP_SUMMARY_MARKER,
        'top P0 verifier behavior sweep passes',
        'Current Sprint active blocker advanced through Strategy Hub meeting-ready',
      ]) &&
      includesAll(verifierBehaviorSweepPlanSource, [
        VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
        'top-P0 behavior registry',
        'substring-only',
        STRATEGY_HUB_MEETING_READY_CARD_ID,
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
        'STRATEGY_HUB_MEETING_READY_CARD_ID',
        'process:verifier-behavior-sweep-check',
      ]) &&
      buildLogVerifierBehaviorSweepBuild?.operatorCloseout === true &&
      verifierBehaviorSweepBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      sprintAtOrPast([STRATEGY_HUB_MEETING_READY_CARD_ID, AVATAR_IMPORT_CARD_ID, AUTO_DEPLOY_ROLLBACK_CARD_ID, SOURCE_MATURITY_GRID_CARD_ID, SOURCE_EXTRACTION_COVERAGE_CARD_ID, SOURCE_COVERAGE_CLOSEOUT_CARD_ID, MARKETING_SOURCE_MAP_CARD_ID, BRAND_STACK_CARD_ID, TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'VERIFICATION-RUNS-001', VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY) &&
      currentPlan.includes('top-P0 behavior registry') &&
      currentPlan.includes(STRATEGY_HUB_MEETING_READY_CARD_ID) &&
      currentState.includes(VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY) &&
      stateMentionsActiveOrLater('Current sprint active blocker is now `STRATEGY-HUB-MEETING-READY-001`') &&
      currentState.includes('behavior registry') &&
      foundationVerifySource.includes('buildSyntheticVerifierBehaviorSweepProof'),
    'VERIFIER-BEHAVIOR-SWEEP-001 top P0 verifier checks now require behavior proof coverage',
    `lane=${verifierBehaviorSweep?.lane || 'missing'} approval=${verifierBehaviorSweepApprovalValidation.ok} targets=${verifierBehaviorSweepSynthetic.summary.behaviorCoveredTargetCount}/${verifierBehaviorSweepSynthetic.summary.targetCount} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )

  return {
    ok: checks.every(check => check.ok),
    currentSprintVerifier,
    summary: {
      passed: checks.filter(check => check.ok).length,
      total: checks.length,
    },
    checks,
  }
}
