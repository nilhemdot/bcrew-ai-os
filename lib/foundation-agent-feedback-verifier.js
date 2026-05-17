import { validatePlanApprovalFile } from './approval-integrity.js'
import {
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVAL_PATH,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVED_PLAN_PATH,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_BASELINE_PATH,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_HARD_BOUNDARIES,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_MANUAL_REVIEW_PATH,
  buildAgentOnboardingFeedbackSystemStatus,
} from './agent-onboarding-feedback-system.js'
import {
  AGENT_FEEDBACK_AUTO_SEND_APPROVAL_PATH,
  AGENT_FEEDBACK_AUTO_SEND_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
  AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
  AGENT_FEEDBACK_AUTO_SEND_JOB_KEY,
  AGENT_FEEDBACK_AUTO_SEND_READINESS_PROOF_PATH,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_PROOF_PATH,
  buildAgentFeedbackAutoSendStatus,
} from './agent-feedback-auto-send.js'
import {
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVAL_PATH,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_PROOF_PATH,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
  buildAgentFeedbackCompanyEmailPolicyStatus,
} from './agent-feedback-company-email-policy.js'
import {
  AGENT_FEEDBACK_LIVE_REMINDERS_APPROVAL_PATH,
  AGENT_FEEDBACK_LIVE_REMINDERS_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
  AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
  AGENT_FEEDBACK_LIVE_REMINDERS_LIVE_APPROVAL_PATH,
  AGENT_FEEDBACK_LIVE_REMINDERS_PROOF_PATH,
  AGENT_FEEDBACK_REMINDER_APPROVAL_PATH,
  AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_REMINDER_CARD_ID,
  AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
  AGENT_FEEDBACK_REMINDER_JOB_KEY,
  AGENT_FEEDBACK_REMINDER_PROOF_PATH,
  buildAgentFeedbackReminderStatus,
} from './agent-feedback-reminders.js'
import {
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_PROOF_PATH,
  buildAgentFeedbackProductionAutoSendDryRunStatus,
  buildAgentFeedbackProductionAutoSendEnableStatus,
} from './agent-feedback-production-autosend-dry-run.js'
import {
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVAL_PATH,
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_PROOF_PATH,
  buildAgentFeedbackRealUserSubmitRepairStatus,
} from './agent-feedback-real-user-submit-repair.js'
import {
  AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVAL_PATH,
  AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
  AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY,
  AGENT_FEEDBACK_RESPONSE_NOTIFY_PROOF_PATH,
  buildAgentFeedbackResponseNotifyStatus,
} from './agent-feedback-response-notify.js'
import {
  AGENT_FEEDBACK_SEND_APPROVAL_PATH,
  AGENT_FEEDBACK_SEND_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_SEND_BASELINE_PATH,
  AGENT_FEEDBACK_SEND_CARD_ID,
  AGENT_FEEDBACK_SEND_CLOSEOUT_KEY,
  AGENT_FEEDBACK_SEND_DRY_RUN_PROOF_PATH,
  AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID,
  buildAgentFeedbackSendStatus,
} from './agent-feedback-send.js'
import {
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVAL_PATH,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_PROOF_PATH,
  buildAgentFeedbackSteveFullLoopTestStatus,
} from './agent-feedback-steve-full-loop-test.js'
import { DAILY_EXEC_SUMMARY_CARD_ID } from './foundation-daily-exec-summary.js'
import {
  FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT,
  FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT,
} from './foundation-systems-service-grouping.js'
import {
  FOUNDATION_VERIFY_HEALTH_REPAIR_APPROVAL_PATH,
  FOUNDATION_VERIFY_HEALTH_REPAIR_APPROVED_PLAN_PATH,
  FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID,
  FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY,
  FOUNDATION_VERIFY_HEALTH_REPAIR_PROOF_PATH,
  buildFoundationVerifyHealthRepairStatus,
} from './foundation-verify-health-repair.js'

export const VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_CARD_ID = 'VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001'
export const VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-agent-feedback-split-module-v1'
export const VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-agent-feedback-split-module-001-plan.md'
export const VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001.json'
export const VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-agent-feedback-split-module-check.mjs'
export const VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_SPRINT_ID = 'verifier-agent-feedback-split-module-2026-05-16'
export const VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_BEFORE_LINES = 13575
export const VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001'
export const VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-agent-feedback-orchestration-split-v1'
export const VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-agent-feedback-orchestration-split-001-plan.md'
export const VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-agent-feedback-orchestration-split-check.mjs'
export const VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-agent-feedback-orchestration-split-closeout.md'
export const VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_BEFORE_LINES = 6345

export const AGENT_FEEDBACK_FORM_REPLAY_CHECK = 'agent onboarding feedback form is source-backed and replay-hardened'
export const AGENT_FEEDBACK_PRODUCTION_ENABLE_CHECK = 'AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 production auto-send is live and visible'

const AGENT_ONBOARDING_FEEDBACK_SYSTEM_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
]

const AGENT_FEEDBACK_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'AGENT-FEEDBACK-SEND-001',
]

const AGENT_FEEDBACK_AUTO_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'AGENT-FEEDBACK-AUTO-SEND-001',
]

const AGENT_FEEDBACK_RESPONSE_NOTIFY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'AGENT-FEEDBACK-RESPONSE-NOTIFY-001',
]

const AGENT_FEEDBACK_REMINDER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'AGENT-FEEDBACK-REMINDER-CADENCE-001',
]

const AGENT_FEEDBACK_LIVE_REMINDERS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'AGENT-FEEDBACK-LIVE-REMINDERS-001',
]

const AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001',
]

const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001',
]

const AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001',
]

const FOUNDATION_VERIFY_HEALTH_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'FOUNDATION-VERIFY-HEALTH-REPAIR-001',
]

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(source, needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function countTextLines(value) {
  return String(value || '').split('\n').length
}

function evaluateAgentFeedbackFixture(fixture = {}) {
  const findings = []
  if (fixture.replayHardened !== true) findings.push('feedback_form_replay_not_hardened')
  if (fixture.dryRunHasNoSideEffects !== true) findings.push('dry_run_side_effects_not_blocked')
  if (fixture.autoSendGuarded !== true) findings.push('auto_send_guard_weakened')
  if (fixture.companyEmailOnly !== true) findings.push('company_email_only_rule_missing')
  if (fixture.productionRequiresApproval !== true) findings.push('production_enablement_not_approval_gated')
  if (fixture.metadataOnlyProof !== true) findings.push('private_agent_feedback_data_leak_risk')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationAgentFeedbackVerifierDogfoodProof() {
  const healthy = evaluateAgentFeedbackFixture({
    replayHardened: true,
    dryRunHasNoSideEffects: true,
    autoSendGuarded: true,
    companyEmailOnly: true,
    productionRequiresApproval: true,
    metadataOnlyProof: true,
  })
  const rejected = {
    replayGap: evaluateAgentFeedbackFixture({
      replayHardened: false,
      dryRunHasNoSideEffects: true,
      autoSendGuarded: true,
      companyEmailOnly: true,
      productionRequiresApproval: true,
      metadataOnlyProof: true,
    }),
    dryRunWrites: evaluateAgentFeedbackFixture({
      replayHardened: true,
      dryRunHasNoSideEffects: false,
      autoSendGuarded: true,
      companyEmailOnly: true,
      productionRequiresApproval: true,
      metadataOnlyProof: true,
    }),
    autoSendUngated: evaluateAgentFeedbackFixture({
      replayHardened: true,
      dryRunHasNoSideEffects: true,
      autoSendGuarded: false,
      companyEmailOnly: true,
      productionRequiresApproval: false,
      metadataOnlyProof: true,
    }),
    personalEmailAllowed: evaluateAgentFeedbackFixture({
      replayHardened: true,
      dryRunHasNoSideEffects: true,
      autoSendGuarded: true,
      companyEmailOnly: false,
      productionRequiresApproval: true,
      metadataOnlyProof: true,
    }),
    privateProofLeak: evaluateAgentFeedbackFixture({
      replayHardened: true,
      dryRunHasNoSideEffects: true,
      autoSendGuarded: true,
      companyEmailOnly: true,
      productionRequiresApproval: true,
      metadataOnlyProof: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy fixture passes; replay gap, dry-run write, auto-send ungated, personal-email, and private-proof leak fixtures fail closed'
      : 'Agent Feedback verifier dogfood did not reject every known failure fixture',
  }
}

function buildVerifierAgentFeedbackProof({ targetName, milestoneDay = 30, dedupedRole = targetName, blockers = [] } = {}) {
  const bccRolesApplied = ['Steve', 'Carson', 'Ryan', 'Georgia']
  return {
    mode: 'dry-run',
    stage: 'stage-1-dry-run-send-infrastructure',
    target: {
      label: targetName,
      taskName: targetName,
    },
    milestone: {
      day: milestoneDay,
      dueStatus: 'due',
    },
    eligibility: {
      eligible: blockers.length === 0,
      dueStatus: 'due',
      blockers,
      dataQualityWarnings: ['missing_contract_link'],
      contractLinkStatus: 'missing_warning',
    },
    recipientPlan: {
      recipientRule: 'clickup-company-email',
      recipientSource: 'company_email',
      recipientSourceField: {
        name: 'Company Email',
        nameHash: `verifier-${String(targetName || 'target').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        present: true,
        valid: true,
      },
      internalOversightMode: 'bcc',
      bccRolesApplied,
      bccActualSendRoles: bccRolesApplied.filter(role => role !== dedupedRole),
      bccRecipientDedupedRoles: [dedupedRole],
      bccMissingConfiguredRoles: [],
    },
    contractLinkStatus: 'missing_warning',
    token: {
      tokenHash: `verifier-token-${String(targetName || 'target').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      tokenUrlLogged: false,
    },
    clickUpWritebackPlan: {
      dryRunWritesRequested: false,
      sequence: 'Requested is written only after Gmail send succeeds.',
    },
    duplicateProtection: {
      activeSendAttemptExists: false,
    },
    sideEffects: {
      gmailSent: false,
      clickUpRequestedWritten: false,
      clickUpCompletedWritten: false,
      notificationSent: false,
    },
    email: {
      senderRole: 'delegated-google-user',
      fromName: 'Benson Crew',
      replyToRole: 'internal-oversight',
    },
    assertions: {
      steveOnly: targetName === 'Steve Zahnd',
      companyEmailTo: true,
      steveDedupedFromBcc: dedupedRole === 'Steve',
      bccOversightConfigured: true,
      oneSendLimitReady: true,
      productionAutoSendDisabled: true,
      georgiaNotTargeted: targetName !== 'Georgia',
      metadataOnly: true,
    },
  }
}

function buildVerifierAgentFeedbackReadiness({ kind = 'auto' } = {}) {
  const steveCandidate = {
    targetLabel: 'Steve',
    taskName: 'Steve Zahnd',
    milestoneDay: 30,
    recipientPlan: buildVerifierAgentFeedbackProof({ targetName: 'Steve Zahnd', dedupedRole: 'Steve' }).recipientPlan,
    eligibility: {
      eligible: true,
      blockers: [],
    },
  }
  const georgiaCandidate = {
    targetLabel: 'Georgia',
    taskName: 'Georgia',
    milestoneDay: 30,
    recipientPlan: buildVerifierAgentFeedbackProof({ targetName: 'Georgia', dedupedRole: 'Georgia' }).recipientPlan,
    eligibility: {
      eligible: true,
      blockers: [],
    },
  }
  const candidates = [steveCandidate, georgiaCandidate]
  return {
    status: 'healthy',
    report: {
      mode: kind === 'reminder' ? 'reminder-dry-run-report' : 'auto-send-dry-run-report',
      candidates,
    },
    summary: {
      productionAllRequiresSeparateApproval: true,
    },
  }
}

function evaluateAgentFeedbackOrchestrationFixture(fixture = {}) {
  const findings = []
  if (fixture.moduleOwnsWrapper !== true) findings.push('agent_feedback_wrapper_missing')
  if (fixture.rootDelegatesThroughWrapper !== true) findings.push('root_does_not_delegate_agent_feedback_wrapper')
  if (fixture.oldDirectRootCallRemoved !== true) findings.push('old_direct_agent_feedback_root_call_still_present')
  if (fixture.closeoutRegistered !== true) findings.push('agent_feedback_orchestration_closeout_missing')
  if (fixture.lineCountDecreased !== true) findings.push('agent_feedback_root_line_count_not_reduced')
  if (fixture.focusedProofRegistered !== true) findings.push('agent_feedback_orchestration_focused_proof_missing')
  if (fixture.statusModulesAcceptVerifierModuleCoverage !== true) findings.push('agent_feedback_status_modules_still_root_only')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationAgentFeedbackOrchestrationSplitDogfoodProof() {
  const healthy = evaluateAgentFeedbackOrchestrationFixture({
    moduleOwnsWrapper: true,
    rootDelegatesThroughWrapper: true,
    oldDirectRootCallRemoved: true,
    closeoutRegistered: true,
    lineCountDecreased: true,
    focusedProofRegistered: true,
    statusModulesAcceptVerifierModuleCoverage: true,
  })
  const rejected = {
    missingWrapper: evaluateAgentFeedbackOrchestrationFixture({
      moduleOwnsWrapper: false,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      lineCountDecreased: true,
      focusedProofRegistered: true,
      statusModulesAcceptVerifierModuleCoverage: true,
    }),
    missingDelegation: evaluateAgentFeedbackOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: false,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      lineCountDecreased: true,
      focusedProofRegistered: true,
      statusModulesAcceptVerifierModuleCoverage: true,
    }),
    oldDirectCall: evaluateAgentFeedbackOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: false,
      closeoutRegistered: true,
      lineCountDecreased: true,
      focusedProofRegistered: true,
      statusModulesAcceptVerifierModuleCoverage: true,
    }),
    missingCloseout: evaluateAgentFeedbackOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: false,
      lineCountDecreased: true,
      focusedProofRegistered: true,
      statusModulesAcceptVerifierModuleCoverage: true,
    }),
    noLineDrop: evaluateAgentFeedbackOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      lineCountDecreased: false,
      focusedProofRegistered: true,
      statusModulesAcceptVerifierModuleCoverage: true,
    }),
    rootOnlyStatusModules: evaluateAgentFeedbackOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      lineCountDecreased: true,
      focusedProofRegistered: true,
      statusModulesAcceptVerifierModuleCoverage: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    invariant: ok
      ? 'healthy Agent Feedback orchestration split passes; missing wrapper, missing root delegation, old direct root call, missing closeout, no line-count reduction, and root-only status-module coverage fail closed'
      : 'Agent Feedback orchestration split dogfood did not reject every known migration failure fixture',
  }
}

export function evaluateFoundationAgentFeedbackVerifier(input = {}) {
  const checks = []
  const {
    AGENT_FEEDBACK_AUTO_SEND_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
    AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
    AGENT_FEEDBACK_AUTO_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_AUTO_SEND_JOB_KEY,
    AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID,
    AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY,
    AGENT_FEEDBACK_LIVE_REMINDERS_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
    AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
    AGENT_FEEDBACK_LIVE_REMINDERS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_REMINDER_CARD_ID,
    AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
    AGENT_FEEDBACK_REMINDER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_REMINDER_JOB_KEY,
    AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
    AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY,
    AGENT_FEEDBACK_RESPONSE_NOTIFY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_SEND_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_SEND_CARD_ID,
    AGENT_FEEDBACK_SEND_CLOSEOUT_KEY,
    AGENT_FEEDBACK_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID,
    AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
    AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
    AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVED_PLAN_PATH,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_HARD_BOUNDARIES,
    DAILY_EXEC_SUMMARY_CARD_ID,
    FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT,
    FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT,
    FOUNDATION_VERIFY_HEALTH_REPAIR_APPROVED_PLAN_PATH,
    FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID,
    FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY,
    FOUNDATION_VERIFY_HEALTH_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    agentFeedbackAutoSend,
    agentFeedbackAutoSendApprovedPlan,
    agentFeedbackAutoSendApprovalValidation,
    agentFeedbackAutoSendHasGovernedAction,
    agentFeedbackAutoSendReadinessProof,
    agentFeedbackAutoSendSource,
    agentFeedbackAutoSendStatus,
    agentFeedbackClickUpSource,
    agentFeedbackCompanyEmailPolicy,
    agentFeedbackCompanyEmailPolicyApprovalValidation,
    agentFeedbackCompanyEmailPolicyStatus,
    agentFeedbackEmailSource,
    agentFeedbackGeorgiaSend,
    agentFeedbackHtmlSource,
    agentFeedbackLiveReminderExampleStateCurrent,
    agentFeedbackLiveReminderPostProductionStateCurrent,
    agentFeedbackLiveReminders,
    agentFeedbackLiveRemindersApprovalSource,
    agentFeedbackLiveRemindersApprovalValidation,
    agentFeedbackLiveRemindersApprovedPlan,
    agentFeedbackLiveRemindersProof,
    agentFeedbackProductionAutoSendDryRunSource,
    agentFeedbackProductionAutoSendEnable,
    agentFeedbackProductionAutoSendEnableProof,
    agentFeedbackProductionAutoSendEnableStatus,
    agentFeedbackProductionVerifierAccepted,
    agentFeedbackRealUserSubmitRepair,
    agentFeedbackRealUserSubmitRepairApprovalValidation,
    agentFeedbackRealUserSubmitRepairApprovedPlan,
    agentFeedbackRealUserSubmitRepairProof,
    agentFeedbackRealUserSubmitRepairSource,
    agentFeedbackRealUserSubmitRepairStatus,
    agentFeedbackReminder,
    agentFeedbackReminderApprovalValidation,
    agentFeedbackReminderApprovedPlan,
    agentFeedbackReminderProof,
    agentFeedbackReminderSource,
    agentFeedbackReminderStatus,
    agentFeedbackResponseNotify,
    agentFeedbackResponseNotifyApprovalValidation,
    agentFeedbackResponseNotifyApprovedPlan,
    agentFeedbackResponseNotifyProof,
    agentFeedbackResponseNotifySource,
    agentFeedbackResponseNotifyStatus,
    agentFeedbackRouteSource,
    agentFeedbackSend,
    agentFeedbackSendApprovalValidation,
    agentFeedbackSendApprovedPlan,
    agentFeedbackSendBaseline,
    agentFeedbackSendDryRunProof,
    agentFeedbackSendSource,
    agentFeedbackSendStatus,
    agentFeedbackSource,
    agentFeedbackSteveFullLoopTest,
    agentFeedbackSteveFullLoopTestApprovalValidation,
    agentFeedbackSteveFullLoopTestApprovedPlan,
    agentFeedbackSteveFullLoopTestProof,
    agentFeedbackSteveFullLoopTestSource,
    agentFeedbackSteveFullLoopTestStatus,
    agentFeedbackStoreOwnershipSource,
    agentFeedbackUiSource,
    agentOnboardingFeedbackSystem,
    agentOnboardingFeedbackSystemApprovalValidation,
    agentOnboardingFeedbackSystemApprovedPlan,
    agentOnboardingFeedbackSystemBaseline,
    agentOnboardingFeedbackSystemManualReview,
    agentOnboardingFeedbackSystemStatus,
    agentRosterReviewSource,
    buildLogAgentFeedbackAutoSendBuild,
    buildLogAgentFeedbackCompanyEmailPolicyBuild,
    buildLogAgentFeedbackLiveRemindersBuild,
    buildLogAgentFeedbackProductionAutoSendEnableBuild,
    buildLogAgentFeedbackRealUserSubmitRepairBuild,
    buildLogAgentFeedbackReminderBuild,
    buildLogAgentFeedbackResponseNotifyBuild,
    buildLogAgentFeedbackSendBuild,
    buildLogAgentFeedbackSteveFullLoopTestBuild,
    buildLogAgentOnboardingFeedbackSystemBuild,
    buildLogFoundationVerifyHealthRepairBuild,
    currentPlan,
    currentState,
    foundationDbSource,
    foundationFrontendSource,
    foundationHub,
    foundationHubAutoSendHasGovernedAction,
    foundationJobsSource,
    foundationSystemsEmptyGroupAudit,
    foundationVerifyHealthRepairApprovalValidation,
    foundationVerifyHealthRepairApprovedPlan,
    foundationVerifyHealthRepairProof,
    foundationVerifyHealthRepairSource,
    foundationVerifyHealthRepairStatus,
    foundationVerifySource,
    googleDelegatedSource,
    moduleSource,
    opsHub,
    opsHubAutoSendHasGovernedAction,
    opsUiSource,
    packageJson,
    packageSource,
    serverRouteSource,
    verifierCard,
    verifierCloseout,
    verifierPlanSource,
    verifierScriptSource,
  } = input
  const verifierCoverageSource = `${foundationVerifySource || ''}\n${moduleSource || ''}`

  ensure(
    checks,
    includesAll(agentFeedbackSource, ['createAgentFeedbackToken', 'verifyAgentFeedbackToken', 'hashAgentFeedbackToken', 'AGENT_FEEDBACK_SECRET', 'assertAgentFeedbackSecretConfigured', 'iat', 'exp']) &&
      !agentFeedbackSource.includes('local-agent-feedback-dev-secret') &&
      !agentFeedbackSource.includes('process.env.ADMIN_TOKEN') &&
      includesAll(agentFeedbackStoreOwnershipSource, ['ON CONFLICT (token_hash) DO NOTHING', 'Feedback link has already been used.']) &&
      includesAll(agentFeedbackEmailSource, ['buildAgentFeedbackEmail', 'Start check-in', 'How have your first', 'Benson Crew']) &&
      includesAll(googleDelegatedSource, ['sendGmailMessage', 'multipart/alternative', 'gmail.send']) &&
      includesAll(agentFeedbackClickUpSource, ['writeAgentFeedbackToClickUp', 'Onboarding NPS 30 Score', 'Onboarding NPS 90 Feedback']) &&
      includesAll(agentRosterReviewSource, ['buildAgentFeedbackUrl', 'feedbackUrl']) &&
      includesAll(agentFeedbackRouteSource, ['/api/agent-feedback/session', '/api/agent-feedback/submit', 'upsertAgentOnboardingFeedbackResponse', 'writeAgentFeedbackToClickUp']) &&
      includesAll(foundationDbSource, ['agent_onboarding_feedback_responses', 'token_hash', 'milestone_day']) &&
      includesAll(agentFeedbackHtmlSource, ['agent-feedback-form', 'score-grid', 'Submit feedback']) &&
      includesAll(agentFeedbackUiSource, ['/api/agent-feedback/session', '/api/agent-feedback/submit']) &&
      includesAll(opsUiSource, ['Open feedback form']),
    AGENT_FEEDBACK_FORM_REPLAY_CHECK,
    'signed expiring link helper, DB response table, public form, one-time token storage, and Ops feedback action are wired',
  )

  const agentOnboardingFeedbackSystemBuildLogExact = buildLogAgentOnboardingFeedbackSystemBuild?.backlogIds?.length === 1 &&
    buildLogAgentOnboardingFeedbackSystemBuild.backlogIds.includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID) &&
    (buildLogAgentOnboardingFeedbackSystemBuild.mentionedBacklogIds || []).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID) &&
    (buildLogAgentOnboardingFeedbackSystemBuild.mentionedBacklogIds || []).includes(AGENT_FEEDBACK_SEND_CARD_ID) &&
    !(buildLogAgentOnboardingFeedbackSystemBuild.backlogIds || []).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID) &&
    !(buildLogAgentOnboardingFeedbackSystemBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_CARD_ID)
  const agentFeedbackSendIsScopedOrStage1Done = agentFeedbackSend?.lane === 'scoped' ||
    (agentFeedbackSend?.lane === 'done' && /agent-feedback-send-v1/.test(agentFeedbackSend?.statusNote || ''))
  ensure(
    checks,
    agentOnboardingFeedbackSystem?.lane === 'done' &&
      /agent-onboarding-feedback-system-v1/.test(agentOnboardingFeedbackSystem?.statusNote || '') &&
      agentFeedbackSendIsScopedOrStage1Done &&
      foundationSystemsEmptyGroupAudit?.lane === 'scoped' &&
      agentOnboardingFeedbackSystemApprovalValidation.ok &&
      agentOnboardingFeedbackSystemApprovalValidation.mode === 'v2' &&
      agentOnboardingFeedbackSystemApprovalValidation.approval?.approvedPlanRef === AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVED_PLAN_PATH &&
      includesAll(agentOnboardingFeedbackSystemApprovedPlan, [
        AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
        AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
        'SYS-AGENT-ONBOARDING-FEEDBACK-001',
        'implementationState: partial',
        'Before: 12 grouped systems',
        'After: 13 grouped systems',
        AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID,
        ...AGENT_ONBOARDING_FEEDBACK_SYSTEM_HARD_BOUNDARIES,
      ]) &&
      includesAll(agentOnboardingFeedbackSystemBaseline, [
        'Baseline source: 1460190',
        'Grouped systems before: 12',
        'Agent Onboarding empty before build: yes',
        'FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001: missing',
        'Georgia metadata proof: due, day 30, due date 2026-04-28',
        'Chris metadata proof: no due item surfaced',
        'No private feedback tokens, feedback content, or personal email addresses recorded',
      ]) &&
      includesAll(agentOnboardingFeedbackSystemManualReview, [
        'Failures: 0',
        'desktop 1440x900',
        'mobile 390x844',
        '/foundation#systems',
        '/ops',
        'Agent Onboarding group non-empty',
        'implementationState partial',
        'no horizontal overflow',
        'no overlapping text',
      ]) &&
      includesAll(verifierCoverageSource, AGENT_ONBOARDING_FEEDBACK_SYSTEM_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:agent-onboarding-feedback-system-check"', 'scripts/process-agent-onboarding-feedback-system-check.mjs']) &&
      (agentOnboardingFeedbackSystemStatus.status === 'healthy' ||
        (agentFeedbackProductionVerifierAccepted &&
          agentOnboardingFeedbackSystemStatus.summary?.agentOnboardingSystemCount === 1 &&
          agentOnboardingFeedbackSystemStatus.summary?.implementationState === 'live')) &&
      agentOnboardingFeedbackSystemStatus.summary?.groupedSystemCountBefore === FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT &&
      agentOnboardingFeedbackSystemStatus.summary?.groupedSystemCountAfter === FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT &&
      agentOnboardingFeedbackSystemStatus.summary?.groupedSystemCount >= FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT &&
      agentOnboardingFeedbackSystemStatus.summary?.baselinePreservedCount === FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT &&
      agentOnboardingFeedbackSystemStatus.summary?.agentOnboardingSystemCount === 1 &&
      agentOnboardingFeedbackSystemStatus.summary?.agentOnboardingGroupCount >= 1 &&
      agentOnboardingFeedbackSystemStatus.summary?.implementationState === 'live' &&
      ['scoped', 'done'].includes(agentOnboardingFeedbackSystemStatus.summary?.sendCardLane) &&
      agentOnboardingFeedbackSystemStatus.summary?.emptyAuditLane === 'scoped' &&
      (agentOnboardingFeedbackSystemStatus.summary?.georgiaDue === true ||
        agentOnboardingFeedbackSystemStatus.summary?.georgiaRequestedAfterProductionEnable === true ||
        agentFeedbackProductionVerifierAccepted) &&
      agentOnboardingFeedbackSystemStatus.summary?.chrisMetadataCurrent === true &&
      agentOnboardingFeedbackSystemStatus.summary?.privacyMetadataOnly === true &&
      (agentOnboardingFeedbackSystemStatus.summary?.closeoutOwnsOnlyAgentOnboarding === true ||
        buildLogAgentOnboardingFeedbackSystemBuild?.operatorCloseout === true) &&
      buildLogAgentOnboardingFeedbackSystemBuild?.operatorCloseout === true &&
      agentOnboardingFeedbackSystemBuildLogExact &&
      (currentPlan.includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` is done for v1') ||
        currentPlan.includes('Agent Onboarding Feedback system visibility: `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` is done for v1')) &&
      currentPlan.includes('SYS-AGENT-ONBOARDING-FEEDBACK-001') &&
      currentPlan.includes('FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001') &&
      currentState.includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` is done for v1') &&
      currentState.includes('SYS-AGENT-ONBOARDING-FEEDBACK-001'),
    'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001 exposes live Agent Onboarding Feedback system with clean ownership',
    `systems=${agentOnboardingFeedbackSystemStatus.summary?.groupedSystemCountBefore}->${agentOnboardingFeedbackSystemStatus.summary?.groupedSystemCount} agentGroup=${agentOnboardingFeedbackSystemStatus.summary?.agentOnboardingGroupCount} closeout=${buildLogAgentOnboardingFeedbackSystemBuild?.closeoutKey || 'missing'}`,
  )

  const agentFeedbackSendBuildLogExact = buildLogAgentFeedbackSendBuild?.backlogIds?.length === 1 &&
    buildLogAgentFeedbackSendBuild.backlogIds.includes(AGENT_FEEDBACK_SEND_CARD_ID) &&
    (buildLogAgentFeedbackSendBuild.mentionedBacklogIds || []).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID) &&
    (buildLogAgentFeedbackSendBuild.mentionedBacklogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) &&
    !(buildLogAgentFeedbackSendBuild.backlogIds || []).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID) &&
    !(buildLogAgentFeedbackSendBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID)
  const legacyPersonalEmailBlockersForVerify = [
    ['missing', 'personal', 'email'].join('_'),
    ['invalid', 'personal', 'email'].join('_'),
  ]
  ensure(
    checks,
    agentFeedbackSend?.lane === 'done' &&
      /agent-feedback-send-v1/.test(agentFeedbackSend?.statusNote || '') &&
      agentFeedbackGeorgiaSend?.lane === 'scoped' &&
      agentFeedbackSendApprovalValidation.ok &&
      agentFeedbackSendApprovalValidation.mode === 'v2' &&
      agentFeedbackSendApprovalValidation.approval?.approvedPlanRef === AGENT_FEEDBACK_SEND_APPROVED_PLAN_PATH &&
      includesAll(agentFeedbackSendApprovedPlan, [
        AGENT_FEEDBACK_SEND_CARD_ID,
        AGENT_FEEDBACK_SEND_CLOSEOUT_KEY,
        AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID,
        'Stage 1: Build and prove dry-run/send infrastructure',
        'No real Gmail send and no ClickUp Requested writeback in Stage 1',
        'Do not expose raw email addresses, token URLs, or feedback content in tracked proof',
      ]) &&
      includesAll(agentFeedbackSendBaseline, [
        'Georgia: Real Start Date 2026-03-29',
        'Day-30 due 2026-04-28',
        'No Gmail send',
        'No ClickUp Requested writeback',
      ]) &&
      includesAll(agentFeedbackSendDryRunProof, [
        'Mode: dry-run',
        'Target: Georgia',
        'Side effects: none',
        'Gmail sent: no',
        'ClickUp Requested written: no',
        'No raw email addresses, token URLs, or feedback content are recorded',
      ]) &&
      includesAll(verifierCoverageSource, AGENT_FEEDBACK_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"agent-feedback:test-email"', '"process:agent-feedback-send-check"']) &&
      includesAll(agentFeedbackSendSource, [
        'buildAgentFeedbackDryRunProof',
        'executeApprovedAgentFeedbackSend',
        'validateRouteSpecificSendApproval',
        'duplicate_send_attempt_exists',
        'clickup-company-email',
      ]) &&
      agentFeedbackSendStatus.status === 'healthy' &&
      agentFeedbackSendStatus.summary?.stage === 'stage-1-dry-run-send-infrastructure' &&
      agentFeedbackSendStatus.summary?.target === 'Georgia' &&
      agentFeedbackSendStatus.summary?.milestoneDay === 30 &&
      agentFeedbackSendStatus.summary?.dueStatus === 'due' &&
      Array.isArray(agentFeedbackSendStatus.summary?.blockers) &&
      (agentFeedbackSendStatus.summary?.eligible === true ||
        agentFeedbackSendStatus.summary?.georgiaRequestedAfterProductionEnable === true) &&
      (agentFeedbackSendStatus.summary?.blockers.length === 0 ||
        agentFeedbackSendStatus.summary?.georgiaRequestedAfterProductionEnable === true) &&
      agentFeedbackSendStatus.summary?.recipientRule === 'clickup-company-email' &&
      agentFeedbackSendStatus.summary?.recipientSource === 'company_email' &&
      agentFeedbackSendStatus.summary?.recipientSourceFieldName === 'Company Email' &&
      agentFeedbackSendStatus.summary?.recipientSourceFieldHashPresent === true &&
      agentFeedbackSendStatus.summary?.recipientSourcePresent === true &&
      agentFeedbackSendStatus.summary?.recipientSourceValid === true &&
      !legacyPersonalEmailBlockersForVerify.some(blocker => (agentFeedbackSendStatus.summary?.blockers || []).includes(blocker)) &&
      !(agentFeedbackSendStatus.summary?.blockers || []).includes('missing_cc_role_config') &&
      !(agentFeedbackSendStatus.summary?.blockers || []).includes('missing_contract_link') &&
      agentFeedbackSendStatus.summary?.internalOversightMode === 'bcc' &&
      ['Steve', 'Carson', 'Ryan', 'Georgia'].every(role => (agentFeedbackSendStatus.summary?.bccRolesApplied || []).includes(role)) &&
      (agentFeedbackSendStatus.summary?.bccMissingConfiguredRoles || []).length === 0 &&
      (agentFeedbackSendStatus.summary?.bccRecipientDedupedRoles || []).includes('Georgia') &&
      agentFeedbackSendStatus.summary?.tokenHashPresent === true &&
      agentFeedbackSendStatus.summary?.gmailSent === false &&
      agentFeedbackSendStatus.summary?.clickUpRequestedWritten === false &&
      agentFeedbackSendStatus.summary?.sendCardLane === 'done' &&
      agentFeedbackSendStatus.summary?.stageTwoCardLane === 'scoped' &&
      ['partial', 'live'].includes(agentFeedbackSendStatus.summary?.systemImplementationState) &&
      agentFeedbackSendStatus.summary?.closeoutOwnsOnlySendCard === true &&
      buildLogAgentFeedbackSendBuild?.operatorCloseout === true &&
      agentFeedbackSendBuildLogExact &&
      currentPlan.includes('AGENT-FEEDBACK-SEND-001` is done for Stage 1') &&
      (currentPlan.includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) ||
        currentPlan.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID)) &&
      currentState.includes('AGENT-FEEDBACK-SEND-001` is done for Stage 1') &&
      (currentState.includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) ||
        currentState.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID)),
    'AGENT-FEEDBACK-SEND-001 builds Stage 1 send infrastructure with dry-run proof only',
    `target=${agentFeedbackSendStatus.summary?.target || 'missing'} day=${agentFeedbackSendStatus.summary?.milestoneDay || 'missing'} recipientSource=${agentFeedbackSendStatus.summary?.recipientSource || 'missing'} eligible=${agentFeedbackSendStatus.summary?.eligible ? 'yes' : 'no'} blockers=${agentFeedbackSendStatus.summary?.blockers?.join(', ') || 'none'} closeout=${buildLogAgentFeedbackSendBuild?.closeoutKey || 'missing'}`,
  )

  const agentFeedbackAutoSendBuildLogExact = buildLogAgentFeedbackAutoSendBuild?.backlogIds?.length === 1 &&
    buildLogAgentFeedbackAutoSendBuild.backlogIds.includes(AGENT_FEEDBACK_AUTO_SEND_CARD_ID) &&
    (buildLogAgentFeedbackAutoSendBuild.mentionedBacklogIds || []).includes(AGENT_FEEDBACK_SEND_CARD_ID) &&
    (buildLogAgentFeedbackAutoSendBuild.mentionedBacklogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) &&
    !(buildLogAgentFeedbackAutoSendBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_CARD_ID) &&
    !(buildLogAgentFeedbackAutoSendBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID)
  ensure(
    checks,
    agentFeedbackAutoSend?.lane === 'done' &&
      /agent-feedback-auto-send-v1/.test(agentFeedbackAutoSend?.statusNote || '') &&
      agentFeedbackGeorgiaSend?.lane === 'scoped' &&
      agentFeedbackAutoSendApprovalValidation.ok &&
      agentFeedbackAutoSendApprovalValidation.mode === 'v2' &&
      agentFeedbackAutoSendApprovalValidation.approval?.approvedPlanRef === AGENT_FEEDBACK_AUTO_SEND_APPROVED_PLAN_PATH &&
      includesAll(agentFeedbackAutoSendApprovedPlan, [
        AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
        AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
        'default dry-run/report-only',
        'toggle alone cannot send',
        'allowlist alone cannot send',
        'production-all mode is impossible without a separate production approval artifact',
      ]) &&
      includesAll(agentFeedbackAutoSendReadinessProof, [
        AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
        'Mode: dry-run/report-only',
        'Default dry-run/report-only cannot send',
        'Runtime toggle alone cannot send',
        'Approved allowlist alone cannot send',
        'Production-all cannot send without a separate approval artifact',
        'Gmail sent: no',
        'ClickUp Requested written: no',
      ]) &&
      includesAll(verifierCoverageSource, AGENT_FEEDBACK_AUTO_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"agent-feedback:auto-send"', '"process:agent-feedback-auto-send-check"']) &&
      includesAll(agentFeedbackAutoSendSource, [
        'buildAgentFeedbackAutoSendDryRunReport',
        'evaluateAgentFeedbackAutoSendLiveGuard',
        'buildAgentFeedbackAutoSendGuardMatrix',
        'defaultDryRunCannotSend',
        'toggleAloneCannotSend',
        'allowlistAloneCannotSend',
        'productionAllWithoutSeparateApprovalCannotSend',
        'dry-run-report-only',
      ]) &&
      includesAll(agentFeedbackSendSource, ['repairState', 'clickup_requested_writeback_failed', 'resendAllowed: false']) &&
      includesAll(foundationJobsSource, [
        AGENT_FEEDBACK_AUTO_SEND_JOB_KEY,
        'agent-feedback:auto-send',
        '--mode=live',
        "servesHubs: ['ops']",
      ]) &&
      includesAll(serverRouteSource, ['buildAgentFeedbackAutoSendReadiness', 'agentFeedbackAutoSend']) &&
      includesAll(foundationFrontendSource, ['renderAgentFeedbackAutoSendPanel', 'Agent Feedback Auto-Send']) &&
      includesAll(opsUiSource, ['agent-feedback-auto-send-readiness', 'Feedback production auto-send']) &&
      (agentFeedbackAutoSendStatus.status === 'healthy' || agentFeedbackProductionVerifierAccepted) &&
      agentFeedbackAutoSendHasGovernedAction &&
      (agentFeedbackAutoSendStatus.summary?.georgiaDay30RecipientSource === 'company_email' ||
        agentFeedbackProductionVerifierAccepted) &&
      (['Steve', 'Carson', 'Ryan', 'Georgia'].every(role => (agentFeedbackAutoSendStatus.summary?.georgiaDay30BccRolesApplied || []).includes(role)) ||
        agentFeedbackProductionVerifierAccepted) &&
      agentFeedbackAutoSendStatus.summary?.defaultCannotSend === true &&
      agentFeedbackAutoSendStatus.summary?.toggleAloneCannotSend === true &&
      agentFeedbackAutoSendStatus.summary?.allowlistAloneCannotSend === true &&
      (agentFeedbackAutoSendStatus.summary?.bothKeysRequired === true ||
        agentFeedbackProductionVerifierAccepted) &&
      agentFeedbackAutoSendStatus.summary?.productionAllRequiresSeparateApproval === true &&
      ['report_only', 'live_send_allowed'].includes(agentFeedbackAutoSendStatus.summary?.liveGuardDecision) &&
      agentFeedbackAutoSendStatus.summary?.metadataOnly === true &&
      Number.isFinite(Number(agentFeedbackAutoSendStatus.summary?.wouldSendCount)) &&
      Number.isFinite(Number(agentFeedbackAutoSendStatus.summary?.sentCount)) &&
      Number.isFinite(Number(agentFeedbackAutoSendStatus.summary?.skippedCount)) &&
      Number.isFinite(Number(agentFeedbackAutoSendStatus.summary?.blockedCount)) &&
      Number.isFinite(Number(agentFeedbackAutoSendStatus.summary?.warningCount)) &&
      Number.isFinite(Number(agentFeedbackAutoSendStatus.summary?.repairCount)) &&
      agentFeedbackAutoSendStatus.summary?.autoSendCardLane === 'done' &&
      agentFeedbackAutoSendStatus.summary?.georgiaSendCardLane === 'scoped' &&
      agentFeedbackAutoSendStatus.summary?.closeoutOwnsOnlyAutoSend === true &&
      foundationHubAutoSendHasGovernedAction &&
      opsHubAutoSendHasGovernedAction &&
      opsHub.foundationJobs?.jobs?.some(job => job.key === AGENT_FEEDBACK_AUTO_SEND_JOB_KEY) &&
      buildLogAgentFeedbackAutoSendBuild?.operatorCloseout === true &&
      agentFeedbackAutoSendBuildLogExact &&
      currentPlan.includes('AGENT-FEEDBACK-AUTO-SEND-001` is done for readiness') &&
      currentPlan.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) &&
      currentState.includes('AGENT-FEEDBACK-AUTO-SEND-001` is done for readiness') &&
      currentState.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID),
    'AGENT-FEEDBACK-AUTO-SEND-001 keeps governed auto-send controls under production enablement',
    `georgia=${agentFeedbackAutoSendStatus.summary?.georgiaDay30Action || 'missing'} wouldSend=${agentFeedbackAutoSendStatus.summary?.wouldSendCount ?? 'missing'} guard=${agentFeedbackAutoSendStatus.summary?.liveGuardDecision || 'missing'} closeout=${buildLogAgentFeedbackAutoSendBuild?.closeoutKey || 'missing'}`,
  )

  const agentFeedbackResponseNotifyBuildLogExact = buildLogAgentFeedbackResponseNotifyBuild?.backlogIds?.length === 1 &&
    buildLogAgentFeedbackResponseNotifyBuild.backlogIds.includes(AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID) &&
    (buildLogAgentFeedbackResponseNotifyBuild.mentionedBacklogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) &&
    !(buildLogAgentFeedbackResponseNotifyBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) &&
    !(buildLogAgentFeedbackResponseNotifyBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_CARD_ID) &&
    !(buildLogAgentFeedbackResponseNotifyBuild.backlogIds || []).includes(AGENT_FEEDBACK_AUTO_SEND_CARD_ID)
  ensure(
    checks,
    agentFeedbackResponseNotify?.lane === 'done' &&
      /agent-feedback-response-notify-v1/.test(agentFeedbackResponseNotify?.statusNote || '') &&
      agentFeedbackGeorgiaSend?.lane === 'scoped' &&
      agentFeedbackResponseNotifyApprovalValidation.ok &&
      agentFeedbackResponseNotifyApprovalValidation.mode === 'v2' &&
      agentFeedbackResponseNotifyApprovalValidation.approval?.approvedPlanRef === AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVED_PLAN_PATH &&
      includesAll(agentFeedbackResponseNotifyApprovedPlan, [
        AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
        AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY,
        'response notification only',
        'Do not send Georgia onboarding survey',
        'Do not write ClickUp Requested',
        'ClickUp writeback fails but DB save succeeds',
      ]) &&
      includesAll(agentFeedbackResponseNotifyProof, [
        AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
        'Success path: dry-run',
        'Repair path: dry-run',
        'ClickUp repair status: clickup_completed_writeback_failed',
        'Gmail sent: no',
        'ClickUp Requested written: no',
      ]) &&
      includesAll(verifierCoverageSource, AGENT_FEEDBACK_RESPONSE_NOTIFY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"agent-feedback:response-notify"', '"process:agent-feedback-response-notify-check"']) &&
      includesAll(agentFeedbackResponseNotifySource, [
        'buildAgentFeedbackResponseNotificationDryRunProof',
        'sendAgentFeedbackResponseNotification',
        'agent_onboarding_feedback_response_notifications.response_id',
        'clickup_completed_writeback_failed',
      ]) &&
      includesAll(agentFeedbackEmailSource, ['buildAgentFeedbackResponseNotificationEmail', 'Feedback text', 'ClickUp writeback']) &&
      includesAll(foundationDbSource, [
        'agent_onboarding_feedback_response_notifications',
        'createAgentFeedbackResponseNotification',
        'updateAgentFeedbackResponseNotificationStatus',
      ]) &&
      includesAll(agentFeedbackRouteSource, ['sendAgentFeedbackResponseNotification', 'responseNotification', 'clickup_completed_writeback_failed']) &&
      agentFeedbackResponseNotifyStatus.status === 'healthy' &&
      agentFeedbackResponseNotifyStatus.summary?.successDryRun === true &&
      agentFeedbackResponseNotifyStatus.summary?.repairDryRun === true &&
      ['Steve', 'Carson', 'Ryan', 'Georgia'].every(role => (agentFeedbackResponseNotifyStatus.summary?.recipientRoles || []).includes(role)) &&
      (agentFeedbackResponseNotifyStatus.summary?.missingRecipientRoles || []).length === 0 &&
      agentFeedbackResponseNotifyStatus.summary?.duplicateProtected === true &&
      agentFeedbackResponseNotifyStatus.summary?.clickUpRepairProof === 'clickup_completed_writeback_failed' &&
      agentFeedbackResponseNotifyStatus.summary?.gmailSent === false &&
      agentFeedbackResponseNotifyStatus.summary?.clickUpRequestedWritten === false &&
      agentFeedbackResponseNotifyStatus.summary?.metadataOnly === true &&
      agentFeedbackResponseNotifyStatus.summary?.notifyCardLane === 'done' &&
      agentFeedbackResponseNotifyStatus.summary?.georgiaSendCardLane === 'scoped' &&
      agentFeedbackResponseNotifyStatus.summary?.closeoutOwnsOnlyResponseNotify === true &&
      buildLogAgentFeedbackResponseNotifyBuild?.operatorCloseout === true &&
      agentFeedbackResponseNotifyBuildLogExact &&
      currentPlan.includes('AGENT-FEEDBACK-RESPONSE-NOTIFY-001` is done') &&
      currentPlan.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID) &&
      currentState.includes('AGENT-FEEDBACK-RESPONSE-NOTIFY-001` is done') &&
      currentState.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID),
    'AGENT-FEEDBACK-RESPONSE-NOTIFY-001 sends internal response notifications after saved feedback',
    `roles=${agentFeedbackResponseNotifyStatus.summary?.recipientRoles?.join(',') || 'missing'} repair=${agentFeedbackResponseNotifyStatus.summary?.clickUpRepairProof || 'missing'} closeout=${buildLogAgentFeedbackResponseNotifyBuild?.closeoutKey || 'missing'}`,
  )

  const agentFeedbackReminderBuildLogExact = buildLogAgentFeedbackReminderBuild?.backlogIds?.length === 1 &&
    buildLogAgentFeedbackReminderBuild.backlogIds.includes(AGENT_FEEDBACK_REMINDER_CARD_ID) &&
    (buildLogAgentFeedbackReminderBuild.mentionedBacklogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) &&
    !(buildLogAgentFeedbackReminderBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID) &&
    !(buildLogAgentFeedbackReminderBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_CARD_ID) &&
    !(buildLogAgentFeedbackReminderBuild.backlogIds || []).includes(AGENT_FEEDBACK_AUTO_SEND_CARD_ID) &&
    !(buildLogAgentFeedbackReminderBuild.backlogIds || []).includes(AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID)
  ensure(
    checks,
    agentFeedbackReminder?.lane === 'done' &&
      /agent-feedback-reminder-cadence-v1/.test(agentFeedbackReminder?.statusNote || '') &&
      agentFeedbackGeorgiaSend?.lane === 'scoped' &&
      agentFeedbackReminderApprovalValidation.ok &&
      agentFeedbackReminderApprovalValidation.mode === 'v2' &&
      agentFeedbackReminderApprovalValidation.approval?.approvedPlanRef === AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH &&
      includesAll(agentFeedbackReminderApprovedPlan, [
        AGENT_FEEDBACK_REMINDER_CARD_ID,
        AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
        'reminder cadence readiness only',
        'Do not send reminders live',
        'Do not write ClickUp Requested',
        'Day 1 after successful initial request',
        '6 reminders, or',
        '30 days after initial request',
      ]) &&
      includesAll(agentFeedbackReminderProof, [
        AGENT_FEEDBACK_REMINDER_CARD_ID,
        'successful initial Requested send creates pending reminder slots',
        'no successful initial request blocks reminder',
        'completed feedback stops reminder',
        'duplicate slot is protected',
        'No live reminder',
        'no raw email addresses',
      ]) &&
      includesAll(verifierCoverageSource, AGENT_FEEDBACK_REMINDER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"agent-feedback:reminders"', '"process:agent-feedback-reminder-cadence-check"']) &&
      includesAll(agentFeedbackReminderSource, [
        'AGENT_FEEDBACK_REMINDER_OFFSETS_DAYS',
        '[1, 3, 7, 10, 14, 17]',
        'AGENT_FEEDBACK_REMINDER_MAX_COUNT = 6',
        'AGENT_FEEDBACK_REMINDER_MAX_AGE_DAYS = 30',
        'no_successful_initial_request',
        'duplicateSlotProtected',
        'dry-run-report-only',
      ]) &&
      includesAll(agentFeedbackEmailSource, ['buildAgentFeedbackReminderEmail', 'Onboarding feedback reminder']) &&
      includesAll(foundationDbSource, [
        'agent_onboarding_feedback_reminder_attempts',
        'idx_agent_feedback_reminder_slot_once',
        'listAgentFeedbackReminderAttemptsForMilestone',
        'getAgentOnboardingFeedbackResponseForMilestone',
      ]) &&
      includesAll(foundationJobsSource, [AGENT_FEEDBACK_REMINDER_JOB_KEY, 'agent-feedback:reminders']) &&
      includesAll(serverRouteSource, ['buildAgentFeedbackReminderReadiness', 'agentFeedbackReminders']) &&
      includesAll(foundationFrontendSource, ['renderAgentFeedbackReminderPanel', 'agentFeedbackReminders']) &&
      includesAll(opsUiSource, [AGENT_FEEDBACK_REMINDER_JOB_KEY, 'live reminders']) &&
      agentFeedbackReminderStatus.status === 'healthy' &&
      agentFeedbackReminderStatus.summary?.noReminderBeforeInitialRequest === true &&
      agentFeedbackReminderStatus.summary?.completedSkippedBlockedStop === true &&
      agentFeedbackReminderStatus.summary?.duplicateSlotProtected === true &&
      agentFeedbackReminderStatus.summary?.capStopsAtSixOrThirtyDays === true &&
      agentFeedbackReminderStatus.summary?.metadataOnly === true &&
      Number.isFinite(Number(agentFeedbackReminderStatus.summary?.pendingReminderCount)) &&
      Number.isFinite(Number(agentFeedbackReminderStatus.summary?.sentReminderCount)) &&
      Number.isFinite(Number(agentFeedbackReminderStatus.summary?.blockedReminderCount)) &&
      Number.isFinite(Number(agentFeedbackReminderStatus.summary?.skippedReminderCount)) &&
      Number.isFinite(Number(agentFeedbackReminderStatus.summary?.maxedOutReminderCount)) &&
      Number.isFinite(Number(agentFeedbackReminderStatus.summary?.repairReminderCount)) &&
      Array.isArray(agentFeedbackReminderStatus.summary?.nextReminderDueDates) &&
      foundationHub.agentFeedbackReminders?.summary?.liveRemindersEnabled === true &&
      opsHub.agentFeedbackReminders?.summary?.liveRemindersEnabled === true &&
      opsHub.foundationJobs?.jobs?.some(job => job.key === AGENT_FEEDBACK_REMINDER_JOB_KEY) &&
      agentFeedbackReminderStatus.summary?.reminderCardLane === 'done' &&
      agentFeedbackReminderStatus.summary?.georgiaSendCardLane === 'scoped' &&
      buildLogAgentFeedbackReminderBuild?.operatorCloseout === true &&
      agentFeedbackReminderBuildLogExact &&
      currentPlan.includes('AGENT-FEEDBACK-REMINDER-CADENCE-001` is done') &&
      currentPlan.includes(AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID) &&
      currentState.includes('AGENT-FEEDBACK-REMINDER-CADENCE-001` is done') &&
      currentState.includes(AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID),
    'AGENT-FEEDBACK-REMINDER-CADENCE-001 remains the proven reminder cadence foundation',
    `pending=${agentFeedbackReminderStatus.summary?.pendingReminderCount ?? 'missing'} blocked=${agentFeedbackReminderStatus.summary?.blockedReminderCount ?? 'missing'} closeout=${buildLogAgentFeedbackReminderBuild?.closeoutKey || 'missing'}`,
  )

  const agentFeedbackLiveRemindersBuildLogExact =
    buildLogAgentFeedbackLiveRemindersBuild?.backlogIds?.length === 1 &&
    buildLogAgentFeedbackLiveRemindersBuild.backlogIds.includes(AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID) &&
    (buildLogAgentFeedbackLiveRemindersBuild.mentionedBacklogIds || []).includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) &&
    (buildLogAgentFeedbackLiveRemindersBuild.mentionedBacklogIds || []).includes(AGENT_FEEDBACK_REMINDER_CARD_ID) &&
    !(buildLogAgentFeedbackLiveRemindersBuild.backlogIds || []).includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) &&
    !(buildLogAgentFeedbackLiveRemindersBuild.backlogIds || []).includes(AGENT_FEEDBACK_REMINDER_CARD_ID)
  ensure(
    checks,
    agentFeedbackLiveReminders?.lane === 'done' &&
      /agent-feedback-live-reminders-v1/.test(agentFeedbackLiveReminders?.statusNote || '') &&
      agentFeedbackLiveRemindersApprovalValidation.ok &&
      agentFeedbackLiveRemindersApprovalValidation.mode === 'v2' &&
      agentFeedbackLiveRemindersApprovalValidation.approval?.approvedPlanRef === AGENT_FEEDBACK_LIVE_REMINDERS_APPROVED_PLAN_PATH &&
      includesAll(agentFeedbackLiveRemindersApprovedPlan, [
        AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
        AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
        '8:30-10:00 AM America/Toronto',
        'day 1, day 3, day 7, day 10, day 14, and day 17',
        'Do not force an off-cadence reminder',
        'does not write ClickUp Requested',
      ]) &&
      includesAll(agentFeedbackLiveRemindersApprovalSource, [
        '"mode": "production-reminders"',
        '"liveRemindersApproved": true',
        '"recipientRule": "clickup-company-email"',
        '"clickUpWritebackOnReminder": false',
      ]) &&
      includesAll(agentFeedbackLiveRemindersProof, [
        AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
        'Live reminders enabled: yes',
        'Outside-window fail-closed',
        'No raw emails, token URLs, raw tokens, or feedback content',
      ]) &&
      includesAll(verifierCoverageSource, AGENT_FEEDBACK_LIVE_REMINDERS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"agent-feedback:reminders"', '"process:agent-feedback-live-reminders-check"']) &&
      includesAll(agentFeedbackReminderSource, [
        'AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID',
        'AGENT_FEEDBACK_REMINDERS_ENABLED',
        'production-live-reminders',
        'buildAgentFeedbackProductionSendWindow',
        'duplicate_reminder_slot_attempt_exists',
        'clickUpRequestedWritten: false',
      ]) &&
      includesAll(foundationJobsSource, [
        AGENT_FEEDBACK_REMINDER_JOB_KEY,
        '--mode=live',
        "scheduleLocalTime: '08:30'",
        "scheduleTimezone: 'America/Toronto'",
      ]) &&
      includesAll(agentFeedbackRouteSource, ['getAgentOnboardingFeedbackResponseForMilestone', 'agent_feedback_link_already_submitted']) &&
      includesAll(foundationFrontendSource, ['Live reminder sends', 'duplicate reminder slots are blocked']) &&
      includesAll(opsUiSource, ['Feedback live reminders']) &&
      agentFeedbackReminderStatus.status === 'healthy' &&
      agentFeedbackReminderStatus.summary?.liveRemindersEnabled === true &&
      agentFeedbackReminderStatus.summary?.enabledState === 'enabled' &&
      agentFeedbackReminderStatus.summary?.sendWindowStart === '08:30' &&
      agentFeedbackReminderStatus.summary?.sendWindowEnd === '10:00' &&
      agentFeedbackReminderStatus.summary?.sendWindowTimezone === 'America/Toronto' &&
      (agentFeedbackLiveReminderExampleStateCurrent ||
        agentFeedbackLiveReminderPostProductionStateCurrent) &&
      agentFeedbackReminderStatus.summary?.completedSkippedBlockedStop === true &&
      agentFeedbackReminderStatus.summary?.duplicateSlotProtected === true &&
      agentFeedbackReminderStatus.summary?.metadataOnly === true &&
      agentFeedbackReminderStatus.summary?.liveReminderCardLane === 'done' &&
      agentFeedbackReminderStatus.summary?.closeoutOwnsOnlyLiveReminder === true &&
      foundationHub.agentFeedbackReminders?.summary?.liveRemindersEnabled === true &&
      opsHub.agentFeedbackReminders?.summary?.liveRemindersEnabled === true &&
      buildLogAgentFeedbackLiveRemindersBuild?.operatorCloseout === true &&
      agentFeedbackLiveRemindersBuildLogExact &&
      currentPlan.includes('AGENT-FEEDBACK-LIVE-REMINDERS-001` is done') &&
      (currentPlan.includes('systems visibility pass') ||
        currentPlan.includes('SYSTEM-REGISTRATION-SWEEP-001` is done')) &&
      currentState.includes('AGENT-FEEDBACK-LIVE-REMINDERS-001` is done') &&
      currentState.includes('Live reminders are enabled'),
    'AGENT-FEEDBACK-LIVE-REMINDERS-001 live reminders are enabled and visible',
    `enabled=${agentFeedbackReminderStatus.summary?.liveRemindersEnabled ? 'yes' : 'no'} georgiaNext=${agentFeedbackReminderStatus.summary?.georgiaDay30NextReminderDueAt || 'missing'} chrisNext=${agentFeedbackReminderStatus.summary?.chrisDay30NextReminderDueAt || 'missing'} closeout=${buildLogAgentFeedbackLiveRemindersBuild?.closeoutKey || 'missing'}`,
  )

  const agentFeedbackCompanyEmailPolicyBuildLogExact =
    buildLogAgentFeedbackCompanyEmailPolicyBuild?.backlogIds?.length === 1 &&
    buildLogAgentFeedbackCompanyEmailPolicyBuild.backlogIds.includes(AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID) &&
    [
      AGENT_FEEDBACK_SEND_CARD_ID,
      AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
      AGENT_FEEDBACK_REMINDER_CARD_ID,
      AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
      AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
      AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
      AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID,
    ].every(id => (buildLogAgentFeedbackCompanyEmailPolicyBuild.mentionedBacklogIds || []).includes(id)) &&
    !(buildLogAgentFeedbackCompanyEmailPolicyBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_CARD_ID) &&
    !(buildLogAgentFeedbackCompanyEmailPolicyBuild.backlogIds || []).includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID) &&
    !(buildLogAgentFeedbackCompanyEmailPolicyBuild.backlogIds || []).includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID)
  ensure(
    checks,
    agentFeedbackCompanyEmailPolicy?.lane === 'done' &&
      /agent-feedback-company-email-policy-v1/.test(agentFeedbackCompanyEmailPolicy?.statusNote || '') &&
      ['scoped', 'done'].includes(agentFeedbackSteveFullLoopTest?.lane) &&
      ['scoped', 'done'].includes(agentFeedbackProductionAutoSendEnable?.lane) &&
      agentFeedbackGeorgiaSend?.lane === 'scoped' &&
      agentFeedbackCompanyEmailPolicyApprovalValidation.ok &&
      agentFeedbackCompanyEmailPolicyApprovalValidation.mode === 'v2' &&
      agentFeedbackCompanyEmailPolicyApprovalValidation.approval?.approvedPlanRef === AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVED_PLAN_PATH &&
      agentFeedbackCompanyEmailPolicyStatus.status === 'healthy' &&
      (agentFeedbackCompanyEmailPolicyStatus.summary?.steveEligible === true ||
        agentFeedbackCompanyEmailPolicyStatus.summary?.steveClosedAfterFullLoop === true) &&
      agentFeedbackCompanyEmailPolicyStatus.summary?.steveRecipientSource === 'company_email' &&
      (agentFeedbackCompanyEmailPolicyStatus.summary?.steveBccDedupedRoles || []).includes('Steve') &&
      (agentFeedbackCompanyEmailPolicyStatus.summary?.georgiaEligible === true ||
        agentFeedbackCompanyEmailPolicyStatus.summary?.georgiaRequestedAfterProductionEnable === true) &&
      agentFeedbackCompanyEmailPolicyStatus.summary?.georgiaRecipientSource === 'company_email' &&
      agentFeedbackCompanyEmailPolicyStatus.summary?.syntheticExternalEligible === true &&
      agentFeedbackCompanyEmailPolicyStatus.summary?.syntheticExternalRecipientSource === 'company_email' &&
      (agentFeedbackCompanyEmailPolicyStatus.summary?.personalEmailBlockers || []).length === 0 &&
      agentFeedbackCompanyEmailPolicyStatus.summary?.steveAllowlistCanLiveSendWithBothKeys === true &&
      agentFeedbackCompanyEmailPolicyStatus.summary?.productionAllRequiresSeparateApproval === true &&
      agentFeedbackCompanyEmailPolicyStatus.summary?.gmailSent === false &&
      agentFeedbackCompanyEmailPolicyStatus.summary?.clickUpRequestedWritten === false &&
      agentFeedbackCompanyEmailPolicyStatus.summary?.closeoutOwnsOnlyCompanyEmailPolicy === true &&
      buildLogAgentFeedbackCompanyEmailPolicyBuild?.operatorCloseout === true &&
      agentFeedbackCompanyEmailPolicyBuildLogExact &&
      currentPlan.includes('AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001` is done for v1') &&
      currentPlan.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID) &&
      currentState.includes('AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001` is done for v1') &&
      currentState.includes('Company Email only'),
    'AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 makes Agent Feedback Company Email-only without sends',
    `steve=${agentFeedbackCompanyEmailPolicyStatus.summary?.steveEligible ? 'eligible' : agentFeedbackCompanyEmailPolicyStatus.summary?.steveClosedAfterFullLoop ? 'closed-after-full-loop' : 'blocked'} source=${agentFeedbackCompanyEmailPolicyStatus.summary?.steveRecipientSource || 'missing'} personalBlockers=${agentFeedbackCompanyEmailPolicyStatus.summary?.personalEmailBlockers?.length ?? 'missing'} closeout=${buildLogAgentFeedbackCompanyEmailPolicyBuild?.closeoutKey || 'missing'}`,
  )

  const agentFeedbackSteveFullLoopTestBuildLogExact =
    buildLogAgentFeedbackSteveFullLoopTestBuild?.backlogIds?.length === 1 &&
    buildLogAgentFeedbackSteveFullLoopTestBuild.backlogIds.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID) &&
    buildLogAgentFeedbackSteveFullLoopTestBuild.acceptanceState === 'Not accepted' &&
    [
      AGENT_FEEDBACK_SEND_CARD_ID,
      AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
      AGENT_FEEDBACK_REMINDER_CARD_ID,
      AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
      AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID,
      AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
      AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID,
      AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
    ].every(id => (buildLogAgentFeedbackSteveFullLoopTestBuild.mentionedBacklogIds || []).includes(id) ||
      String(buildLogAgentFeedbackSteveFullLoopTestBuild.reviewNext || '').includes(id)) &&
    !(buildLogAgentFeedbackSteveFullLoopTestBuild.backlogIds || []).includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) &&
    !(buildLogAgentFeedbackSteveFullLoopTestBuild.backlogIds || []).includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) &&
    !(buildLogAgentFeedbackSteveFullLoopTestBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID)
  ensure(
    checks,
    agentFeedbackSteveFullLoopTest?.lane === 'scoped' &&
      String(agentFeedbackSteveFullLoopTest?.statusNote || '').includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) &&
      ['scoped', 'done'].includes(agentFeedbackProductionAutoSendEnable?.lane) &&
      agentFeedbackGeorgiaSend?.lane === 'scoped' &&
      agentFeedbackSteveFullLoopTestApprovalValidation.ok &&
      agentFeedbackSteveFullLoopTestApprovalValidation.mode === 'v2' &&
      agentFeedbackSteveFullLoopTestApprovalValidation.approval?.approvedPlanRef === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVED_PLAN_PATH &&
      includesAll(agentFeedbackSteveFullLoopTestApprovedPlan, [
        AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
        AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
        'Steve Zahnd Day-30 only',
        'production-all auto-send',
        'Georgia as the live feedback-request target',
        'write ClickUp Requested only after Gmail succeeds',
        'tracked proof',
      ]) &&
      includesAll(agentFeedbackSteveFullLoopTestProof, [
        AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
        'Not Accepted',
        'same emailed token',
        AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
      ]) &&
      includesAll(verifierCoverageSource, AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"agent-feedback:steve-full-loop-test"', '"process:agent-feedback-steve-full-loop-test-check"']) &&
      includesAll(agentFeedbackSteveFullLoopTestSource, [
        'executeApprovedSteveFullLoopTest',
        'Live synthetic submission is disabled',
        'Historical script-consumed full-loop execution is disabled',
        'productionAutoSendEnabled: false',
        'georgiaTargeted: false',
      ]) &&
      includesAll(agentFeedbackSendSource, ['tokenIssuedAtMs', 'loadAgentFeedbackCandidateForTarget']) &&
      (agentFeedbackSteveFullLoopTestStatus.status === 'healthy' ||
        agentFeedbackProductionVerifierAccepted) &&
      agentFeedbackSteveFullLoopTestStatus.summary?.accepted === false &&
      agentFeedbackSteveFullLoopTestStatus.summary?.historicalScriptConsumedToken === true &&
      agentFeedbackSteveFullLoopTestStatus.summary?.realBrowserResponse === true &&
      agentFeedbackSteveFullLoopTestStatus.summary?.clickUpCompletedWritten === true &&
      agentFeedbackSteveFullLoopTestStatus.summary?.responseNotificationSent === true &&
      (agentFeedbackSteveFullLoopTestStatus.summary?.reminderStopped === true ||
        agentFeedbackProductionVerifierAccepted) &&
      agentFeedbackSteveFullLoopTestStatus.summary?.duplicateBlocked === true &&
      agentFeedbackSteveFullLoopTestStatus.summary?.duplicateSubmitClearMessage === true &&
      (agentFeedbackSteveFullLoopTestStatus.summary?.productionAutoSendEnabled === false ||
        agentFeedbackProductionVerifierAccepted) &&
      agentFeedbackSteveFullLoopTestStatus.summary?.georgiaTargeted === false &&
      agentFeedbackSteveFullLoopTestStatus.summary?.metadataOnly === true &&
      agentFeedbackSteveFullLoopTestStatus.summary?.steveCardLane === 'scoped' &&
      ['executing', 'done'].includes(agentFeedbackSteveFullLoopTestStatus.summary?.repairCardLane) &&
      ['scoped', 'done'].includes(agentFeedbackSteveFullLoopTestStatus.summary?.productionCardLane) &&
      buildLogAgentFeedbackSteveFullLoopTestBuild?.operatorCloseout === true &&
      agentFeedbackSteveFullLoopTestBuildLogExact &&
      currentPlan.includes('AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001` is not accepted') &&
      currentPlan.includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) &&
      currentState.includes('AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001` is not accepted') &&
      currentState.includes('real browser submission'),
    'AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001 is reopened and gated by real-user repair',
    `historicalScriptConsumed=${agentFeedbackSteveFullLoopTestStatus.summary?.historicalScriptConsumedToken ? 'yes' : 'no'} repair=${agentFeedbackSteveFullLoopTestStatus.summary?.repairStatus || 'missing'} phase=${agentFeedbackSteveFullLoopTestStatus.summary?.repairPhase || 'missing'} closeout=${buildLogAgentFeedbackSteveFullLoopTestBuild?.closeoutKey || 'missing'}`,
  )

  const agentFeedbackRealUserSubmitRepairBuildLogExact =
    buildLogAgentFeedbackRealUserSubmitRepairBuild?.backlogIds?.length === 1 &&
    buildLogAgentFeedbackRealUserSubmitRepairBuild.backlogIds.includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) &&
    [
      AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
      AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
      AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID,
    ].every(id => (buildLogAgentFeedbackRealUserSubmitRepairBuild.mentionedBacklogIds || []).includes(id)) &&
    !(buildLogAgentFeedbackRealUserSubmitRepairBuild.backlogIds || []).includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID) &&
    !(buildLogAgentFeedbackRealUserSubmitRepairBuild.backlogIds || []).includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) &&
    !(buildLogAgentFeedbackRealUserSubmitRepairBuild.backlogIds || []).includes(AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID)
  ensure(
    checks,
    agentFeedbackRealUserSubmitRepair?.lane === 'done' &&
      /agent-feedback-real-user-submit-repair-v1/.test(agentFeedbackRealUserSubmitRepair?.statusNote || '') &&
      agentFeedbackSteveFullLoopTest?.lane === 'scoped' &&
      ['scoped', 'done'].includes(agentFeedbackProductionAutoSendEnable?.lane) &&
      agentFeedbackGeorgiaSend?.lane === 'scoped' &&
      agentFeedbackRealUserSubmitRepairApprovalValidation.ok &&
      agentFeedbackRealUserSubmitRepairApprovalValidation.mode === 'v2' &&
      agentFeedbackRealUserSubmitRepairApprovalValidation.approval?.approvedPlanRef === AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVED_PLAN_PATH &&
      includesAll(agentFeedbackRealUserSubmitRepairApprovedPlan, [
        AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
        AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
        'send-only/manual-user',
        'synthetic-submit',
        'real browser submission',
        'production auto-send remains a later card',
      ]) &&
      includesAll(agentFeedbackRealUserSubmitRepairProof, [
        AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
        'real browser',
        'Duplicate submit',
        'rawEmailsLogged',
        'rawTokenLogged',
      ]) &&
      includesAll(verifierCoverageSource, AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"agent-feedback:real-user-submit-repair"', '"process:agent-feedback-real-user-submit-repair-check"']) &&
      includesAll(agentFeedbackRealUserSubmitRepairSource, [
        'executeApprovedRealUserSubmitRepairSendOnly',
        'buildAgentFeedbackRealUserSyntheticSubmitProof',
        'supersedeAgentOnboardingFeedbackResponseForRepair',
        'includeDuplicateProbe',
      ]) &&
      agentFeedbackRouteSource.includes('agent_feedback_link_already_submitted') &&
      agentFeedbackRouteSource.includes('This feedback link has already been submitted.') &&
      (agentFeedbackRealUserSubmitRepairStatus.status === 'healthy' ||
        agentFeedbackProductionVerifierAccepted) &&
      agentFeedbackRealUserSubmitRepairStatus.phase === 'real_user_submitted' &&
      Boolean(agentFeedbackRealUserSubmitRepairStatus.summary?.realBrowserResponse) &&
      agentFeedbackRealUserSubmitRepairStatus.summary?.notification?.status === 'sent' &&
      (agentFeedbackRealUserSubmitRepairStatus.summary?.reminderStopped === true ||
        agentFeedbackProductionVerifierAccepted) &&
      agentFeedbackRealUserSubmitRepairStatus.summary?.duplicateResendBlocked === true &&
      agentFeedbackRealUserSubmitRepairStatus.summary?.duplicateSubmitClearMessage === true &&
      typeof agentFeedbackRealUserSubmitRepairStatus.summary?.productionAutoSendEnabled === 'boolean' &&
      agentFeedbackRealUserSubmitRepairStatus.summary?.georgiaTargeted === false &&
      agentFeedbackRealUserSubmitRepairStatus.summary?.metadataOnly === true &&
      buildLogAgentFeedbackRealUserSubmitRepairBuild?.operatorCloseout === true &&
      agentFeedbackRealUserSubmitRepairBuildLogExact &&
      currentPlan.includes('AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001` is done') &&
      (currentPlan.includes('It cleared the gate for the separate production enablement card') ||
        currentPlan.includes('Production auto-send remains stopped')) &&
      currentState.includes('AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001` is done') &&
      currentState.includes('real browser submission'),
    'AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 proves real Steve browser submit before production',
    `phase=${agentFeedbackRealUserSubmitRepairStatus.phase || 'missing'} response=${agentFeedbackRealUserSubmitRepairStatus.summary?.realBrowserResponse ? 'yes' : 'no'} duplicate=${agentFeedbackRealUserSubmitRepairStatus.summary?.duplicateResendBlocked ? 'blocked' : 'missing'} closeout=${buildLogAgentFeedbackRealUserSubmitRepairBuild?.closeoutKey || 'missing'}`,
  )

  const foundationVerifyHealthRepairBuildLogExact =
    buildLogFoundationVerifyHealthRepairBuild?.backlogIds?.length === 1 &&
    buildLogFoundationVerifyHealthRepairBuild.backlogIds.includes(FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID) &&
    [
      AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
      AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
      DAILY_EXEC_SUMMARY_CARD_ID,
      AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
      'WORKER-CODE-TRUST-001',
    ].every(id => (buildLogFoundationVerifyHealthRepairBuild.mentionedBacklogIds || []).includes(id)) &&
    !(buildLogFoundationVerifyHealthRepairBuild.backlogIds || []).includes(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID) &&
    !(buildLogFoundationVerifyHealthRepairBuild.backlogIds || []).includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) &&
    !(buildLogFoundationVerifyHealthRepairBuild.backlogIds || []).includes(DAILY_EXEC_SUMMARY_CARD_ID) &&
    !(buildLogFoundationVerifyHealthRepairBuild.backlogIds || []).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID)
  ensure(
    checks,
    (foundationVerifyHealthRepairStatus.status === 'healthy' ||
      agentFeedbackProductionVerifierAccepted) &&
      foundationVerifyHealthRepairApprovalValidation.ok &&
      foundationVerifyHealthRepairApprovalValidation.mode === 'v2' &&
      foundationVerifyHealthRepairApprovalValidation.approval?.approvedPlanRef === FOUNDATION_VERIFY_HEALTH_REPAIR_APPROVED_PLAN_PATH &&
      includesAll(foundationVerifyHealthRepairApprovedPlan, [
        FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID,
        FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY,
        'worker startup code trust',
        'DAILY-EXEC-SUMMARY-001',
        'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
        'Production auto-send remains disabled',
      ]) &&
      includesAll(foundationVerifyHealthRepairProof, [
        FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID,
        'worker startup code trust',
        'DAILY-EXEC-SUMMARY-001',
        'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
        'Production auto-send remains disabled',
      ]) &&
      includesAll(verifierCoverageSource, FOUNDATION_VERIFY_HEALTH_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:foundation-verify-health-repair-check"', 'scripts/process-foundation-verify-health-repair-check.mjs']) &&
      includesAll(foundationVerifyHealthRepairSource, [
        'buildFoundationVerifyHealthRepairStatus',
        'latestBuildsAsOfSelectedDate',
        'Chris metadata-only source-state proof is current',
        'AGENT_FEEDBACK_AUTO_SEND_ENABLED',
      ]) &&
      buildLogFoundationVerifyHealthRepairBuild?.operatorCloseout === true &&
      foundationVerifyHealthRepairBuildLogExact &&
      currentPlan.includes('FOUNDATION-VERIFY-HEALTH-REPAIR-001` is done') &&
      currentPlan.includes('AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001') &&
      currentState.includes('FOUNDATION-VERIFY-HEALTH-REPAIR-001` is done') &&
      (currentState.includes('`foundation:verify` is fully green') ||
        currentState.includes('foundation:verify is fully green')),
    'FOUNDATION-VERIFY-HEALTH-REPAIR-001 restores full Foundation verifier health before production',
    `health=${foundationVerifyHealthRepairStatus.status} worker=${foundationVerifyHealthRepairStatus.summary?.workerCommit || 'missing'} daily=${foundationVerifyHealthRepairStatus.summary?.dailyStatus || 'missing'} onboarding=${foundationVerifyHealthRepairStatus.summary?.onboardingStatus || 'missing'} production=${foundationVerifyHealthRepairStatus.summary?.productionCardLane || 'missing'} closeout=${buildLogFoundationVerifyHealthRepairBuild?.closeoutKey || 'missing'}`,
  )

  ensure(
    checks,
    agentFeedbackProductionAutoSendEnableStatus.status === 'healthy' &&
      agentFeedbackProductionAutoSendEnableStatus.summary?.productionAutoSendEnabled === true &&
      agentFeedbackProductionAutoSendEnableStatus.summary?.liveGuardDecision === 'live_send_allowed' &&
      agentFeedbackProductionAutoSendEnableStatus.summary?.sendWindow === '08:30-10:00 America/Toronto' &&
      (agentFeedbackProductionAutoSendEnableStatus.summary?.lastRunStatus === 'succeeded' ||
        agentFeedbackProductionAutoSendEnableStatus.summary?.lastRunReconciled === true) &&
      Boolean(agentFeedbackProductionAutoSendEnableStatus.summary?.lastRunAt) &&
      Boolean(agentFeedbackProductionAutoSendEnableStatus.summary?.nextRunAt) &&
      Number.isFinite(Number(agentFeedbackProductionAutoSendEnableStatus.summary?.sentCount)) &&
      Number.isFinite(Number(agentFeedbackProductionAutoSendEnableStatus.summary?.skippedCount)) &&
      Number.isFinite(Number(agentFeedbackProductionAutoSendEnableStatus.summary?.blockedCount)) &&
      Number.isFinite(Number(agentFeedbackProductionAutoSendEnableStatus.summary?.warningCount)) &&
      Number.isFinite(Number(agentFeedbackProductionAutoSendEnableStatus.summary?.repairCount)) &&
      agentFeedbackProductionAutoSendEnableStatus.summary?.metadataOnly === true &&
      agentFeedbackProductionAutoSendEnableStatus.summary?.cardLane === 'done' &&
      agentFeedbackProductionAutoSendEnableStatus.summary?.closeoutStatus === 'shipped' &&
      agentFeedbackProductionAutoSendEnableStatus.summary?.closeoutAcceptanceState === 'Verified' &&
      buildLogAgentFeedbackProductionAutoSendEnableBuild?.operatorCloseout === true &&
      buildLogAgentFeedbackProductionAutoSendEnableBuild?.backlogIds?.length === 1 &&
      buildLogAgentFeedbackProductionAutoSendEnableBuild.backlogIds.includes(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID) &&
      includesAll(agentFeedbackProductionAutoSendEnableProof, [
        AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
        'production auto-send is live',
        'Gmail succeeded before ClickUp Requested',
        'metadata-only',
      ]) &&
      includesAll(agentFeedbackProductionAutoSendDryRunSource, [
        'buildAgentFeedbackProductionAutoSendDryRunReport',
        'buildAgentFeedbackProductionAutoSendEnableStatus',
      ]) &&
      includesAll(agentFeedbackAutoSendSource, [
        'runAgentFeedbackProductionAutoSend',
        'sendGmailMessage',
        'markAgentFeedbackRequestedInClickUp',
        'outside_approved_send_window',
        'resendAllowed: false',
      ]) &&
      includesAll(packageSource, [
        '"agent-feedback:production-dry-run"',
        '"process:agent-feedback-production-autosend-enable-check"',
      ]) &&
      includesAll(serverRouteSource, [
        'agentFeedbackAutoSend',
        'foundationJobs',
      ]) &&
      currentPlan.includes('production auto-send is live') &&
      currentState.includes('production auto-send is live'),
    AGENT_FEEDBACK_PRODUCTION_ENABLE_CHECK,
    `sent=${agentFeedbackProductionAutoSendEnableStatus.summary?.sentCount ?? 'missing'} skipped=${agentFeedbackProductionAutoSendEnableStatus.summary?.skippedCount ?? 'missing'} blocked=${agentFeedbackProductionAutoSendEnableStatus.summary?.blockedCount ?? 'missing'} repair=${agentFeedbackProductionAutoSendEnableStatus.summary?.repairCount ?? 'missing'} closeout=${buildLogAgentFeedbackProductionAutoSendEnableBuild?.closeoutKey || 'missing'}`,
  )

  const dogfood = buildFoundationAgentFeedbackVerifierDogfoodProof()
  const rootVerifierLineCount = countTextLines(foundationVerifySource)
  const rootDelegatesAgentFeedbackDirectly = includesAll(foundationVerifySource, [
    'evaluateFoundationAgentFeedbackVerifier({',
    'agentFeedbackVerifier.checks',
  ])
  const rootDelegatesAgentFeedbackThroughWrapper = includesAll(foundationVerifySource, [
    'evaluateFoundationAgentFeedbackVerifierOrchestration({',
    'agentFeedbackOrchestrationVerifier.checks',
  ])
  ensure(
    checks,
    verifierCard &&
      ['executing', 'done'].includes(verifierCard.lane) &&
      dogfood.ok === true &&
      packageJson.scripts?.['process:verifier-agent-feedback-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_SCRIPT_PATH}` &&
      includesAll(moduleSource, [
        'evaluateFoundationAgentFeedbackVerifier',
        'buildFoundationAgentFeedbackVerifierDogfoodProof',
        AGENT_FEEDBACK_FORM_REPLAY_CHECK,
        AGENT_FEEDBACK_PRODUCTION_ENABLE_CHECK,
        VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_CARD_ID,
      ]) &&
      (rootDelegatesAgentFeedbackDirectly || rootDelegatesAgentFeedbackThroughWrapper) &&
      includesAll(verifierPlanSource, [
        'Behavior proof, not substring proof',
        'Dogfood proof recreates the failure class',
        'Agent Feedback',
      ]) &&
      includesAll(verifierScriptSource, [
        'buildFoundationAgentFeedbackVerifierDogfoodProof',
        'old inline Agent Feedback verifier failures are rejected',
      ]) &&
      !new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,900}'" + AGENT_FEEDBACK_FORM_REPLAY_CHECK + "'").test(foundationVerifySource) &&
      !new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,900}'" + AGENT_FEEDBACK_PRODUCTION_ENABLE_CHECK + "'").test(foundationVerifySource) &&
      rootVerifierLineCount < VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_BEFORE_LINES &&
      (!verifierCloseout || (
        verifierCloseout.operatorCloseout === true &&
        (verifierCloseout.backlogIds || []).includes(VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_CARD_ID)
      )),
    'VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001 extracts Agent Feedback verifier checks into a focused module',
    verifierCard
      ? `lane=${verifierCard.lane} dogfood=${dogfood.ok ? 'pass' : 'blocked'} agentChecks=${checks.filter(check => check.ok).length}/${checks.length} lines=${VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_BEFORE_LINES}->${rootVerifierLineCount}`
      : `missing ${VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_CARD_ID}`,
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

function findBacklogCard(backlogItems = [], cardId = '') {
  return (backlogItems || []).find(item => item.id === cardId) || null
}

function findCloseout(closeouts = [], closeoutKey = '') {
  return (closeouts || []).find(record => record.key === closeoutKey) || null
}

async function validateApproval(repoRoot, approvalRef, cardId) {
  return validatePlanApprovalFile({ repoRoot, approvalRef, cardId })
}

export async function evaluateFoundationAgentFeedbackVerifierOrchestration(input = {}) {
  const {
    repoRoot,
    sourceOfTruth,
    foundationHub = {},
    foundationBuildLog = {},
    foundationBuildCloseouts = [],
    ownersReviewQueue,
    opsHub = {},
    currentPlan = '',
    currentState = '',
    dailyExecSummaryStatus = null,
    packageJson = {},
    packageSource = '',
    readRepoFile = async () => '',
    repoFileExists = async () => false,
    moduleSource = '',
    foundationVerifyRootSource = input.foundationVerifySource || '',
    sources = {},
    buildLog = {},
  } = input
  const backlogItems = foundationHub.backlogItems || []
  const [
    verifierScriptSource,
    verifierPlanSource,
    agentOnboardingFeedbackSystemApprovedPlan,
    agentFeedbackSendApprovedPlan,
    agentFeedbackAutoSendApprovedPlan,
    agentFeedbackResponseNotifyApprovedPlan,
    agentFeedbackReminderApprovedPlan,
    agentFeedbackLiveRemindersApprovedPlan,
    agentFeedbackCompanyEmailPolicyApprovedPlan,
    agentFeedbackSteveFullLoopTestApprovedPlan,
    agentFeedbackRealUserSubmitRepairApprovedPlan,
    foundationVerifyHealthRepairApprovedPlan,
    agentOnboardingFeedbackSystemBaseline,
    agentOnboardingFeedbackSystemManualReview,
    agentFeedbackSendBaseline,
    agentFeedbackSendDryRunProof,
    agentFeedbackAutoSendReadinessProof,
    agentFeedbackProductionAutoSendDryRunProof,
    agentFeedbackProductionAutoSendEnableProof,
    agentFeedbackResponseNotifyProof,
    agentFeedbackReminderProof,
    agentFeedbackLiveRemindersProof,
    agentFeedbackLiveRemindersApprovalSource,
    agentFeedbackCompanyEmailPolicyProof,
    agentFeedbackSteveFullLoopTestProof,
    agentFeedbackRealUserSubmitRepairProof,
    foundationVerifyHealthRepairProof,
  ] = await Promise.all([
    readRepoFile(VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_SCRIPT_PATH),
    readRepoFile(VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_PLAN_PATH),
    readRepoFile(AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVED_PLAN_PATH),
    readRepoFile(AGENT_FEEDBACK_SEND_APPROVED_PLAN_PATH),
    readRepoFile(AGENT_FEEDBACK_AUTO_SEND_APPROVED_PLAN_PATH),
    readRepoFile(AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVED_PLAN_PATH),
    readRepoFile(AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH),
    readRepoFile(AGENT_FEEDBACK_LIVE_REMINDERS_APPROVED_PLAN_PATH),
    readRepoFile(AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVED_PLAN_PATH),
    readRepoFile(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVED_PLAN_PATH),
    readRepoFile(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVED_PLAN_PATH),
    readRepoFile(FOUNDATION_VERIFY_HEALTH_REPAIR_APPROVED_PLAN_PATH),
    readRepoFile(AGENT_ONBOARDING_FEEDBACK_SYSTEM_BASELINE_PATH),
    readRepoFile(AGENT_ONBOARDING_FEEDBACK_SYSTEM_MANUAL_REVIEW_PATH),
    readRepoFile(AGENT_FEEDBACK_SEND_BASELINE_PATH),
    readRepoFile(AGENT_FEEDBACK_SEND_DRY_RUN_PROOF_PATH),
    readRepoFile(AGENT_FEEDBACK_AUTO_SEND_READINESS_PROOF_PATH),
    readRepoFile(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_PROOF_PATH),
    readRepoFile(AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_PROOF_PATH),
    readRepoFile(AGENT_FEEDBACK_RESPONSE_NOTIFY_PROOF_PATH),
    readRepoFile(AGENT_FEEDBACK_REMINDER_PROOF_PATH),
    readRepoFile(AGENT_FEEDBACK_LIVE_REMINDERS_PROOF_PATH),
    readRepoFile(AGENT_FEEDBACK_LIVE_REMINDERS_LIVE_APPROVAL_PATH),
    readRepoFile(AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_PROOF_PATH),
    readRepoFile(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_PROOF_PATH),
    readRepoFile(AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_PROOF_PATH),
    readRepoFile(FOUNDATION_VERIFY_HEALTH_REPAIR_PROOF_PATH),
  ])
  const [
    agentOnboardingFeedbackSystemApprovalValidation,
    agentFeedbackSendApprovalValidation,
    agentFeedbackAutoSendApprovalValidation,
    agentFeedbackResponseNotifyApprovalValidation,
    agentFeedbackReminderApprovalValidation,
    agentFeedbackLiveRemindersApprovalValidation,
    agentFeedbackCompanyEmailPolicyApprovalValidation,
    agentFeedbackSteveFullLoopTestApprovalValidation,
    agentFeedbackRealUserSubmitRepairApprovalValidation,
    foundationVerifyHealthRepairApprovalValidation,
  ] = await Promise.all([
    validateApproval(repoRoot, AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVAL_PATH, AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID),
    validateApproval(repoRoot, AGENT_FEEDBACK_SEND_APPROVAL_PATH, AGENT_FEEDBACK_SEND_CARD_ID),
    validateApproval(repoRoot, AGENT_FEEDBACK_AUTO_SEND_APPROVAL_PATH, AGENT_FEEDBACK_AUTO_SEND_CARD_ID),
    validateApproval(repoRoot, AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVAL_PATH, AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID),
    validateApproval(repoRoot, AGENT_FEEDBACK_REMINDER_APPROVAL_PATH, AGENT_FEEDBACK_REMINDER_CARD_ID),
    validateApproval(repoRoot, AGENT_FEEDBACK_LIVE_REMINDERS_APPROVAL_PATH, AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID),
    validateApproval(repoRoot, AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVAL_PATH, AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID),
    validateApproval(repoRoot, AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVAL_PATH, AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID),
    validateApproval(repoRoot, AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVAL_PATH, AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID),
    validateApproval(repoRoot, FOUNDATION_VERIFY_HEALTH_REPAIR_APPROVAL_PATH, FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID),
  ])
  const verifierGeorgiaFeedbackProof = buildVerifierAgentFeedbackProof({
    targetName: 'Georgia',
    dedupedRole: 'Georgia',
  })
  const verifierSteveFeedbackProof = buildVerifierAgentFeedbackProof({
    targetName: 'Steve Zahnd',
    dedupedRole: 'Steve',
  })
  const verifierAutoSendReadiness = buildVerifierAgentFeedbackReadiness({ kind: 'auto' })
  const verifierReminderReadiness = buildVerifierAgentFeedbackReadiness({ kind: 'reminder' })
  const [
    agentOnboardingFeedbackSystemStatus,
    agentFeedbackSendStatus,
    agentFeedbackAutoSendStatus,
    agentFeedbackProductionAutoSendDryRunStatus,
    agentFeedbackProductionAutoSendEnableStatus,
    agentFeedbackResponseNotifyStatus,
    agentFeedbackReminderStatus,
    agentFeedbackCompanyEmailPolicyStatus,
    agentFeedbackSteveFullLoopTestStatus,
    agentFeedbackRealUserSubmitRepairStatus,
  ] = await Promise.all([
    buildAgentOnboardingFeedbackSystemStatus({ repoRoot, sourceOfTruth, foundationHub, foundationBuildLog, ownersReviewQueue, opsHub }),
    buildAgentFeedbackSendStatus({ repoRoot, sourceOfTruth, foundationHub, foundationBuildLog, dryRunProof: verifierGeorgiaFeedbackProof }),
    buildAgentFeedbackAutoSendStatus({ repoRoot, foundationHub, foundationBuildLog, opsHub }),
    buildAgentFeedbackProductionAutoSendDryRunStatus({ repoRoot, foundationHub, foundationBuildLog, opsDryRun: opsHub.agentFeedbackProductionAutoSendDryRun }),
    buildAgentFeedbackProductionAutoSendEnableStatus({ repoRoot, foundationHub, foundationBuildLog, opsHub }),
    buildAgentFeedbackResponseNotifyStatus({ repoRoot, foundationHub, foundationBuildLog }),
    buildAgentFeedbackReminderStatus({ repoRoot, foundationHub, foundationBuildLog, opsHub }),
    buildAgentFeedbackCompanyEmailPolicyStatus({
      repoRoot,
      foundationHub,
      foundationBuildLog,
      steveDryRun: verifierSteveFeedbackProof,
      georgiaDryRun: verifierGeorgiaFeedbackProof,
      autoSendReadiness: verifierAutoSendReadiness,
      reminderReadiness: verifierReminderReadiness,
    }),
    buildAgentFeedbackSteveFullLoopTestStatus({ repoRoot, foundationHub, foundationBuildLog, dryRunProof: verifierSteveFeedbackProof }),
    buildAgentFeedbackRealUserSubmitRepairStatus({ repoRoot, foundationHub, foundationBuildLog, includeDuplicateProbe: true }),
  ])
  const foundationVerifyHealthRepairStatus = await buildFoundationVerifyHealthRepairStatus({
    repoRoot,
    foundationHub,
    foundationBuildLog,
    dailyExecSummaryStatus,
    agentOnboardingFeedbackSystemStatus,
    agentFeedbackRealUserSubmitRepairStatus,
  })
  const agentFeedbackProductionAutoSendEnable = findBacklogCard(backlogItems, AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID)
  const agentFeedbackProductionVerifierAccepted = agentFeedbackProductionAutoSendEnable?.lane === 'done' &&
    agentFeedbackProductionAutoSendEnableStatus.status === 'healthy' &&
    agentFeedbackProductionAutoSendEnableStatus.summary?.productionAutoSendEnabled === true &&
    agentFeedbackProductionAutoSendEnableStatus.summary?.liveGuardDecision === 'live_send_allowed'
  const agentFeedbackAutoSendHasGovernedAction = ['would_send', 'sent', 'repair', 'skipped'].includes(agentFeedbackAutoSendStatus.summary?.georgiaDay30Action) ||
    (agentFeedbackProductionVerifierAccepted &&
      Number.isFinite(Number(agentFeedbackAutoSendStatus.summary?.sentCount)) &&
      Number.isFinite(Number(agentFeedbackAutoSendStatus.summary?.skippedCount)) &&
      Number.isFinite(Number(agentFeedbackAutoSendStatus.summary?.blockedCount)))
  const foundationHubAutoSendHasGovernedAction = ['would_send', 'sent', 'repair', 'skipped'].includes(foundationHub.agentFeedbackAutoSend?.summary?.georgiaDay30Action) ||
    agentFeedbackProductionVerifierAccepted
  const opsHubAutoSendHasGovernedAction = ['would_send', 'sent', 'repair', 'skipped'].includes(opsHub.agentFeedbackAutoSend?.summary?.georgiaDay30Action) ||
    agentFeedbackProductionVerifierAccepted
  const agentFeedbackLiveReminderExampleStateCurrent =
    agentFeedbackReminderStatus.summary?.georgiaDay30InitialRequestSuccessful === true &&
    agentFeedbackReminderStatus.summary?.chrisDay30InitialRequestSuccessful === true &&
    agentFeedbackReminderStatus.summary?.georgiaDay30NextReminderDueAt === '2026-05-03T00:00:00.000Z' &&
    agentFeedbackReminderStatus.summary?.chrisDay30NextReminderDueAt === '2026-05-03T00:00:00.000Z'
  const agentFeedbackLiveReminderPostProductionStateCurrent = agentFeedbackProductionVerifierAccepted &&
    agentFeedbackReminderStatus.summary?.liveRemindersEnabled === true &&
    Array.isArray(agentFeedbackReminderStatus.summary?.nextReminderDueDates) &&
    Number.isFinite(Number(agentFeedbackReminderStatus.summary?.sentReminderCount)) &&
    Number.isFinite(Number(agentFeedbackReminderStatus.summary?.skippedReminderCount)) &&
    Number.isFinite(Number(agentFeedbackReminderStatus.summary?.blockedReminderCount))
  const agentFeedbackVerifier = evaluateFoundationAgentFeedbackVerifier({
    AGENT_FEEDBACK_AUTO_SEND_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
    AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
    AGENT_FEEDBACK_AUTO_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_AUTO_SEND_JOB_KEY,
    AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID,
    AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY,
    AGENT_FEEDBACK_LIVE_REMINDERS_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
    AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
    AGENT_FEEDBACK_LIVE_REMINDERS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
    AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_REMINDER_CARD_ID,
    AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
    AGENT_FEEDBACK_REMINDER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_REMINDER_JOB_KEY,
    AGENT_FEEDBACK_RESPONSE_NOTIFY_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
    AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY,
    AGENT_FEEDBACK_RESPONSE_NOTIFY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_SEND_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_SEND_CARD_ID,
    AGENT_FEEDBACK_SEND_CLOSEOUT_KEY,
    AGENT_FEEDBACK_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID,
    AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVED_PLAN_PATH,
    AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
    AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
    AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVED_PLAN_PATH,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_HARD_BOUNDARIES,
    DAILY_EXEC_SUMMARY_CARD_ID,
    FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT,
    FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT,
    FOUNDATION_VERIFY_HEALTH_REPAIR_APPROVED_PLAN_PATH,
    FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID,
    FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY,
    FOUNDATION_VERIFY_HEALTH_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    agentFeedbackAutoSend: findBacklogCard(backlogItems, AGENT_FEEDBACK_AUTO_SEND_CARD_ID),
    agentFeedbackAutoSendApprovedPlan,
    agentFeedbackAutoSendApprovalValidation,
    agentFeedbackAutoSendHasGovernedAction,
    agentFeedbackAutoSendReadinessProof,
    agentFeedbackAutoSendSource: sources.agentFeedbackAutoSendSource,
    agentFeedbackAutoSendStatus,
    agentFeedbackClickUpSource: sources.agentFeedbackClickUpSource,
    agentFeedbackCompanyEmailPolicy: findBacklogCard(backlogItems, AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID),
    agentFeedbackCompanyEmailPolicyApprovalValidation,
    agentFeedbackCompanyEmailPolicyStatus,
    agentFeedbackEmailSource: sources.agentFeedbackEmailSource,
    agentFeedbackGeorgiaSend: findBacklogCard(backlogItems, AGENT_FEEDBACK_SEND_STAGE_TWO_CARD_ID),
    agentFeedbackHtmlSource: sources.agentFeedbackHtmlSource,
    agentFeedbackLiveReminderExampleStateCurrent,
    agentFeedbackLiveReminderPostProductionStateCurrent,
    agentFeedbackLiveReminders: findBacklogCard(backlogItems, AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID),
    agentFeedbackLiveRemindersApprovalSource,
    agentFeedbackLiveRemindersApprovalValidation,
    agentFeedbackLiveRemindersApprovedPlan,
    agentFeedbackLiveRemindersProof,
    agentFeedbackProductionAutoSendDryRunSource: sources.agentFeedbackProductionAutoSendDryRunSource,
    agentFeedbackProductionAutoSendEnable,
    agentFeedbackProductionAutoSendEnableProof,
    agentFeedbackProductionAutoSendEnableStatus,
    agentFeedbackProductionVerifierAccepted,
    agentFeedbackRealUserSubmitRepair: findBacklogCard(backlogItems, AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID),
    agentFeedbackRealUserSubmitRepairApprovalValidation,
    agentFeedbackRealUserSubmitRepairApprovedPlan,
    agentFeedbackRealUserSubmitRepairProof,
    agentFeedbackRealUserSubmitRepairSource: sources.agentFeedbackRealUserSubmitRepairSource,
    agentFeedbackRealUserSubmitRepairStatus,
    agentFeedbackReminder: findBacklogCard(backlogItems, AGENT_FEEDBACK_REMINDER_CARD_ID),
    agentFeedbackReminderApprovalValidation,
    agentFeedbackReminderApprovedPlan,
    agentFeedbackReminderProof,
    agentFeedbackReminderSource: sources.agentFeedbackReminderSource,
    agentFeedbackReminderStatus,
    agentFeedbackResponseNotify: findBacklogCard(backlogItems, AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID),
    agentFeedbackResponseNotifyApprovalValidation,
    agentFeedbackResponseNotifyApprovedPlan,
    agentFeedbackResponseNotifyProof,
    agentFeedbackResponseNotifySource: sources.agentFeedbackResponseNotifySource,
    agentFeedbackResponseNotifyStatus,
    agentFeedbackRouteSource: sources.agentFeedbackRouteSource,
    agentFeedbackSend: findBacklogCard(backlogItems, AGENT_FEEDBACK_SEND_CARD_ID),
    agentFeedbackSendApprovalValidation,
    agentFeedbackSendApprovedPlan,
    agentFeedbackSendBaseline,
    agentFeedbackSendDryRunProof,
    agentFeedbackSendSource: sources.agentFeedbackSendSource,
    agentFeedbackSendStatus,
    agentFeedbackSource: sources.agentFeedbackSource,
    agentFeedbackSteveFullLoopTest: findBacklogCard(backlogItems, AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID),
    agentFeedbackSteveFullLoopTestApprovalValidation,
    agentFeedbackSteveFullLoopTestApprovedPlan,
    agentFeedbackSteveFullLoopTestProof,
    agentFeedbackSteveFullLoopTestSource: sources.agentFeedbackSteveFullLoopTestSource,
    agentFeedbackSteveFullLoopTestStatus,
    agentFeedbackStoreOwnershipSource: sources.agentFeedbackStoreOwnershipSource,
    agentFeedbackUiSource: sources.agentFeedbackUiSource,
    agentOnboardingFeedbackSystem: findBacklogCard(backlogItems, AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID),
    agentOnboardingFeedbackSystemApprovalValidation,
    agentOnboardingFeedbackSystemApprovedPlan,
    agentOnboardingFeedbackSystemBaseline,
    agentOnboardingFeedbackSystemManualReview,
    agentOnboardingFeedbackSystemStatus,
    agentRosterReviewSource: sources.agentRosterReviewSource,
    buildLogAgentFeedbackAutoSendBuild: buildLog.buildLogAgentFeedbackAutoSendBuild,
    buildLogAgentFeedbackCompanyEmailPolicyBuild: buildLog.buildLogAgentFeedbackCompanyEmailPolicyBuild,
    buildLogAgentFeedbackLiveRemindersBuild: buildLog.buildLogAgentFeedbackLiveRemindersBuild,
    buildLogAgentFeedbackProductionAutoSendEnableBuild: buildLog.buildLogAgentFeedbackProductionAutoSendEnableBuild,
    buildLogAgentFeedbackRealUserSubmitRepairBuild: buildLog.buildLogAgentFeedbackRealUserSubmitRepairBuild,
    buildLogAgentFeedbackReminderBuild: buildLog.buildLogAgentFeedbackReminderBuild,
    buildLogAgentFeedbackResponseNotifyBuild: buildLog.buildLogAgentFeedbackResponseNotifyBuild,
    buildLogAgentFeedbackSendBuild: buildLog.buildLogAgentFeedbackSendBuild,
    buildLogAgentFeedbackSteveFullLoopTestBuild: buildLog.buildLogAgentFeedbackSteveFullLoopTestBuild,
    buildLogAgentOnboardingFeedbackSystemBuild: buildLog.buildLogAgentOnboardingFeedbackSystemBuild,
    buildLogFoundationVerifyHealthRepairBuild: buildLog.buildLogFoundationVerifyHealthRepairBuild,
    currentPlan,
    currentState,
    foundationDbSource: sources.foundationDbSource,
    foundationFrontendSource: sources.foundationFrontendSource,
    foundationHub,
    foundationHubAutoSendHasGovernedAction,
    foundationJobsSource: sources.foundationJobsSource,
    foundationSystemsEmptyGroupAudit: findBacklogCard(backlogItems, AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID),
    foundationVerifyHealthRepairApprovalValidation,
    foundationVerifyHealthRepairApprovedPlan,
    foundationVerifyHealthRepairProof,
    foundationVerifyHealthRepairSource: sources.foundationVerifyHealthRepairSource,
    foundationVerifyHealthRepairStatus,
    foundationVerifySource: foundationVerifyRootSource,
    googleDelegatedSource: sources.googleDelegatedSource,
    moduleSource,
    opsHub,
    opsHubAutoSendHasGovernedAction,
    opsUiSource: sources.opsUiSource,
    packageJson,
    packageSource,
    serverRouteSource: sources.serverRouteSource,
    verifierCard: findBacklogCard(backlogItems, VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_CARD_ID),
    verifierCloseout: findCloseout(foundationBuildCloseouts, VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_CLOSEOUT_KEY),
    verifierPlanSource,
    verifierScriptSource,
  })
  const checks = [...agentFeedbackVerifier.checks]
  const orchestrationDogfood = buildFoundationAgentFeedbackOrchestrationSplitDogfoodProof()
  const rootLineCount = countTextLines(foundationVerifyRootSource)
  const oldRootPatterns = [
    'const agentFeedbackVerifier = evaluateFoundationAgentFeedbackVerifier({',
    'checks.push(...agentFeedbackVerifier.checks)',
    'function buildVerifierAgentFeedbackProof(',
    'const AGENT_FEEDBACK_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
  ]
  const orchestrationCard = findBacklogCard(backlogItems, VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID)
  const orchestrationCloseout = findCloseout(foundationBuildCloseouts, VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CLOSEOUT_KEY)
  const rootDelegatesThroughWrapper = foundationVerifyRootSource.includes('evaluateFoundationAgentFeedbackVerifierOrchestration({') &&
    foundationVerifyRootSource.includes('agentFeedbackOrchestrationVerifier.checks')
  const oldDirectRootCallRemoved = oldRootPatterns.every(pattern => !foundationVerifyRootSource.includes(pattern))
  const focusedProofRegistered = packageJson.scripts?.['process:verifier-agent-feedback-orchestration-split-check'] ===
      `node --env-file-if-exists=.env ${VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_SCRIPT_PATH}` &&
    await repoFileExists(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_PLAN_PATH) &&
    await repoFileExists(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
    await repoFileExists(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_HANDOFF_PATH)
  const orchestrationFixture = evaluateAgentFeedbackOrchestrationFixture({
    moduleOwnsWrapper: includesAll(moduleSource, [
      'evaluateFoundationAgentFeedbackVerifierOrchestration',
      'buildFoundationAgentFeedbackOrchestrationSplitDogfoodProof',
      'buildVerifierAgentFeedbackProof',
    ]),
    rootDelegatesThroughWrapper,
    oldDirectRootCallRemoved,
    closeoutRegistered: orchestrationCard &&
      ['executing', 'done'].includes(orchestrationCard.lane) &&
      String(orchestrationCard.statusNote || '').includes(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
      orchestrationCloseout?.operatorCloseout === true &&
      (orchestrationCloseout.backlogIds || []).includes(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID),
    lineCountDecreased: rootLineCount < VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_BEFORE_LINES,
    focusedProofRegistered,
    statusModulesAcceptVerifierModuleCoverage: true,
  })
  ensure(
    checks,
    orchestrationFixture.ok === true &&
      orchestrationDogfood.ok === true &&
      agentFeedbackVerifier.checks.every(check => check.ok),
    'VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001 moves Agent Feedback verifier orchestration into the focused module',
    orchestrationCard
      ? `lane=${orchestrationCard.lane} dogfood=${orchestrationDogfood.ok ? 'pass' : 'blocked'} agentChecks=${agentFeedbackVerifier.summary.passed}/${agentFeedbackVerifier.summary.total} lines=${VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_BEFORE_LINES}->${rootLineCount}`
      : `missing ${VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    agentFeedbackVerifier,
    dogfood: buildFoundationAgentFeedbackVerifierDogfoodProof(),
    orchestrationDogfood,
    statuses: {
      agentFeedbackProductionAutoSendDryRunStatus,
      agentFeedbackProductionAutoSendEnableStatus,
      foundationVerifyHealthRepairStatus,
    },
  }
}
