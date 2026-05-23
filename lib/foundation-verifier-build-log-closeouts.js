function asArray(value) {
  return Array.isArray(value) ? value : []
}

export function closeoutRecordAsBuildLogEntry(closeout) {
  const backlogIds = asArray(closeout?.backlogIds)
  const mentionedBacklogIds = asArray(closeout?.mentionedBacklogIds)
  return closeout
    ? {
        ...closeout,
        operatorCloseout: true,
        closeoutKey: closeout.key,
        backlogIds,
        mentionedBacklogIds,
        relatedBacklog: backlogIds.map(id => ({
          id,
          lane: 'done',
        })),
        mentionedBacklog: mentionedBacklogIds.map(id => ({
          id,
        })),
      }
    : null
}

function findBuild(builds, backlogIds, closeoutKey) {
  const requiredBacklogIds = asArray(backlogIds)
  return asArray(builds).find(build =>
    requiredBacklogIds.every(id => asArray(build.backlogIds).includes(id)) &&
      build.closeoutKey === closeoutKey
  ) || null
}

function findBuildOrCloseout(builds, closeouts, cardId, closeoutKey) {
  return findBuild(builds, [cardId], closeoutKey) ||
    closeoutRecordAsBuildLogEntry(asArray(closeouts).find(closeout =>
      closeout.key === closeoutKey &&
        asArray(closeout.backlogIds).includes(cardId)
    ) || null)
}

function findBuildOrMultiCloseout(builds, closeouts, backlogIds, closeoutKey) {
  const requiredBacklogIds = asArray(backlogIds)
  return findBuild(builds, requiredBacklogIds, closeoutKey) ||
    closeoutRecordAsBuildLogEntry(asArray(closeouts).find(closeout =>
      closeout.key === closeoutKey &&
        requiredBacklogIds.every(id => asArray(closeout.backlogIds).includes(id))
    ) || null)
}

export function buildFoundationVerifierBuildLogCloseoutEntry(input = {}) {
  const {
    foundationBuildLog = {},
    foundationBuildCloseouts = [],
    cardId,
    closeoutKey,
  } = input
  return findBuildOrCloseout(foundationBuildLog.builds || [], foundationBuildCloseouts, cardId, closeoutKey)
}

function registryFallback(registrySource, closeoutKey, backlogIds, mentionedBacklogIds = []) {
  return String(registrySource || '').includes(closeoutKey)
    ? {
        closeoutKey,
        backlogIds: asArray(backlogIds),
        mentionedBacklogIds: asArray(mentionedBacklogIds),
        operatorCloseout: true,
      }
    : null
}

function findBuildWithRegistryFallback(builds, registrySource, backlogIds, closeoutKey, mentionedBacklogIds = []) {
  return findBuild(builds, backlogIds, closeoutKey) ||
    registryFallback(registrySource, closeoutKey, backlogIds, mentionedBacklogIds)
}

function id(ids, key) {
  return ids[key]
}

export function buildFoundationVerifierBuildLogCloseoutEntries(input = {}) {
  const {
    foundationBuildLog = {},
    foundationBuildCloseouts = [],
    foundationBuildLogRegistrySource = '',
    ids = {},
  } = input
  const builds = asArray(foundationBuildLog.builds)
  const registrySource = String(foundationBuildLogRegistrySource || '')
  const fallback = (key, backlogIds, mentionedBacklogIds = []) =>
    registryFallback(registrySource, key, backlogIds, mentionedBacklogIds)
  const withFallback = (backlogIds, key, mentionedBacklogIds = []) =>
    findBuildWithRegistryFallback(builds, registrySource, backlogIds, key, mentionedBacklogIds)
  const closeoutEntry = (cardId, key) => findBuildOrCloseout(builds, foundationBuildCloseouts, cardId, key)

  return {
    buildLogRecentMultiCloseoutBuild: closeoutEntry('RECENT-BUILDS-MULTI-CLOSEOUT-001', 'recent-builds-multi-closeout-ux-v1'),
    buildLogFullSystemReAuditBuild: closeoutEntry('FULL-SYSTEM-RE-AUDIT-001', 'full-system-re-audit-v1'),
    buildLogWaveCleanupABuild: findBuildOrMultiCloseout(builds, foundationBuildCloseouts, ['LOCAL-DOC-LINK-001', 'DOC-AUTHORITY-INDEX-REPAIR-001', 'DOC-OTHER-TRIAGE-001'], 'wave-cleanup-a-local-docs-triage-v1'),
    buildLogWaveCleanupBBuild: findBuildOrMultiCloseout(builds, foundationBuildCloseouts, ['DOC-CATEGORIZATION-001', 'DOCTRINE-PROPAGATION-002', 'PROCESS-HOOKS-002'], 'wave-cleanup-b-doc-categories-doctrine-hooks-v1'),
    buildLogGatePerformanceBuild: closeoutEntry('GATE-PERFORMANCE-001', 'gate-performance-v1'),
    buildLogPlanReconcileBuild: findBuildOrMultiCloseout(
      builds,
      foundationBuildCloseouts,
      [
        'FOUNDATION-PLAN-RECONCILE-001',
        'PERSONAL-WORKSPACE-BOUNDARY-001',
        'CEO-DASHBOARD-PATTERN-001',
        'APPROVAL-FILE-INTEGRITY-001',
        'DOCTRINE-PROPAGATION-003',
        'DECISION-AUTO-EMIT-002',
        'BUILD-LOG-BACKLOG-ID-FIX-001',
        'PRE-COMMIT-HOOK-INSTALL-001',
        'CLOSEOUT-BACKFILL-001',
        'GATE-PERFORMANCE-001',
      ],
      'foundation-plan-reconcile-backlog-depth-v1',
    ),
    buildLogPhase1EnforcementBuild: findBuildOrMultiCloseout(builds, foundationBuildCloseouts, ['APPROVAL-FILE-INTEGRITY-001', 'BUILD-LOG-BACKLOG-ID-FIX-001', 'CLOSEOUT-BACKFILL-001', 'PRE-COMMIT-HOOK-INSTALL-001'], 'phase-1-enforcement-v1'),
    buildLogFoundationControlBuild: findBuildOrMultiCloseout(builds, foundationBuildCloseouts, ['GATE-RELIABILITY-001', 'PERSONAL-WORKSPACE-BOUNDARY-001', 'DOCTRINE-PROPAGATION-003', 'DECISION-AUTO-EMIT-002', 'CEO-DASHBOARD-PATTERN-001'], 'foundation-control-layer-v1'),
    buildLogFoundation1100ReviewBuild: withFallback(
      id(ids, 'FOUNDATION_REVIEW_SPRINT_CARD_IDS'),
      id(ids, 'FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY'),
    ),
    buildLogPlainEnglishSweepBuild: closeoutEntry(id(ids, 'PLAIN_ENGLISH_SWEEP_CARD_ID'), id(ids, 'PLAIN_ENGLISH_SWEEP_CLOSEOUT_KEY')),
    buildLogUiMenuLayoutPolishBuild: withFallback([id(ids, 'UI_MENU_LAYOUT_POLISH_CARD_ID')], id(ids, 'UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY')),
    buildLogRecentBuildsUiBuild: withFallback([id(ids, 'RECENT_BUILDS_UI_CARD_ID')], id(ids, 'RECENT_BUILDS_UI_CLOSEOUT_KEY')),
    buildLogChangeLogComprehensiveBuild: withFallback([id(ids, 'CHANGE_LOG_COMPREHENSIVE_CARD_ID')], id(ids, 'CHANGE_LOG_COMPREHENSIVE_CLOSEOUT_KEY')),
    buildLogDailyExecSummaryBuild: withFallback([id(ids, 'DAILY_EXEC_SUMMARY_CARD_ID')], id(ids, 'DAILY_EXEC_SUMMARY_CLOSEOUT_KEY')),
    buildLogSourceLifecycleBuild: withFallback([id(ids, 'SOURCE_LIFECYCLE_CARD_ID')], id(ids, 'SOURCE_LIFECYCLE_CLOSEOUT_KEY')),
    buildLogSourceLifecycleCompletionBuild: withFallback(
      [id(ids, 'SOURCE_LIFECYCLE_COMPLETION_CARD_ID')],
      id(ids, 'SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY'),
      ['SYNTHESIS-VERIFY-001', 'EXTRACT-RUN-HARDENING-001', 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001'],
    ),
    buildLogSynthesisVerifyBuild: withFallback(
      [id(ids, 'SYNTHESIS_VERIFY_CARD_ID')],
      id(ids, 'SYNTHESIS_VERIFY_CLOSEOUT_KEY'),
      ['SYNTHESIS-FACTS-001', 'SYNTHESIS-ENGINE-001', 'ACTION-ROUTER-001', id(ids, 'FOUNDATION_DONE_TEST_CARD_ID'), 'EXTRACT-RUN-HARDENING-001', 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001'],
    ),
    buildLogExtractRunHardeningBuild: withFallback(
      [id(ids, 'EXTRACT_RUN_HARDENING_CARD_ID')],
      id(ids, 'EXTRACT_RUN_HARDENING_CLOSEOUT_KEY'),
      [id(ids, 'FOUNDATION_DONE_TEST_CARD_ID'), 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001', 'MULTIMODAL-EXTRACTOR-001'],
    ),
    buildLogDriveAccessRequestBuild: withFallback(
      [id(ids, 'DRIVE_ACCESS_REQUEST_CARD_ID')],
      id(ids, 'DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY'),
      [id(ids, 'MEETING_VAULT_ACL_CARD_ID'), id(ids, 'FOUNDATION_DONE_TEST_CARD_ID')],
    ),
    buildLogMeetingVaultAutoEnforcementBuild: findBuild(builds, [id(ids, 'MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID')], id(ids, 'MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY')) ||
      fallback(id(ids, 'MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY'), [id(ids, 'MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID'), id(ids, 'MEETING_VAULT_ACL_CARD_ID')], [id(ids, 'DRIVE_ACCESS_REQUEST_CARD_ID'), id(ids, 'FOUNDATION_DONE_TEST_CARD_ID')]),
    buildLogFoundationSprintSystemBuild: withFallback(
      [id(ids, 'FOUNDATION_SPRINT_SYSTEM_CARD_ID')],
      id(ids, 'FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY'),
      [id(ids, 'MEETING_VAULT_ACL_CARD_ID'), id(ids, 'FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID'), id(ids, 'FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID')],
    ),
    buildLogFoundationSprintCadenceBuild: withFallback(
      [id(ids, 'FOUNDATION_SPRINT_CADENCE_CARD_ID')],
      id(ids, 'FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY'),
      [id(ids, 'FOUNDATION_SPRINT_SYSTEM_CARD_ID'), id(ids, 'MEETING_VAULT_ACL_CARD_ID'), id(ids, 'FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID'), id(ids, 'FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID')],
    ),
    buildLogVerifyGateTieringBuild: withFallback(
      [id(ids, 'VERIFY_GATE_TIERING_CARD_ID')],
      id(ids, 'VERIFY_GATE_TIERING_CLOSEOUT_KEY'),
      [id(ids, 'REBUILD_PLAN_RECONCILE_CARD_ID'), id(ids, 'VERIFIER_BEHAVIOR_SWEEP_CARD_ID')],
    ),
    buildLogRebuildPlanReconcileBuild: withFallback(
      [id(ids, 'REBUILD_PLAN_RECONCILE_CARD_ID')],
      id(ids, 'REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY'),
      [id(ids, 'PLAN_CRITIC_REPLACEMENT_CARD_ID'), id(ids, 'SECURITY_BEHAVIOR_PROOF_CARD_ID'), id(ids, 'VERIFIER_BEHAVIOR_SWEEP_CARD_ID'), 'TELEGRAM-BOTS-REBUILD-001', 'INTEL-DIRECTORS-REBUILD-001'],
    ),
    buildLogPlanCriticReplacementBuild: withFallback(
      [id(ids, 'PLAN_CRITIC_REPLACEMENT_CARD_ID')],
      id(ids, 'PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY'),
      [id(ids, 'SECURITY_BEHAVIOR_PROOF_CARD_ID'), id(ids, 'VERIFIER_BEHAVIOR_SWEEP_CARD_ID'), 'STRATEGY-HUB-MEETING-READY-001', id(ids, 'AVATAR_IMPORT_CARD_ID')],
    ),
    buildLogSecurityBehaviorProofBuild: withFallback(
      [id(ids, 'SECURITY_BEHAVIOR_PROOF_CARD_ID')],
      id(ids, 'SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY'),
      ['SECURITY-002', id(ids, 'VERIFIER_BEHAVIOR_SWEEP_CARD_ID'), 'SECURITY-FILTERED-COMMS-ACCESS-001'],
    ),
    buildLogVerifierBehaviorSweepBuild: withFallback(
      [id(ids, 'VERIFIER_BEHAVIOR_SWEEP_CARD_ID')],
      id(ids, 'VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY'),
      [id(ids, 'STRATEGY_HUB_MEETING_READY_CARD_ID'), id(ids, 'AVATAR_IMPORT_CARD_ID'), 'SECURITY-FILTERED-COMMS-ACCESS-001'],
    ),
    buildLogStrategyHubMeetingReadyBuild: withFallback(
      [id(ids, 'STRATEGY_HUB_MEETING_READY_CARD_ID')],
      id(ids, 'STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY'),
      [id(ids, 'AVATAR_IMPORT_CARD_ID'), 'INTEL-SCOPER-001', 'STRATEGIC-INTEL-001'],
    ),
    buildLogAvatarImportBuild: withFallback(
      [id(ids, 'AVATAR_IMPORT_CARD_ID')],
      id(ids, 'AVATAR_IMPORT_CLOSEOUT_KEY'),
      [id(ids, 'AUTO_DEPLOY_ROLLBACK_CARD_ID'), 'AVATAR-001', 'MARKETING-PIPELINE-REBUILD-001', 'BRAND-STACK-001'],
    ),
    buildLogAutoDeployRollbackBuild: withFallback(
      [id(ids, 'AUTO_DEPLOY_ROLLBACK_CARD_ID')],
      id(ids, 'AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY'),
      ['REPLY-WATCHING-LOOP-001', 'SYSTEM-010-GHOST-CLOSEOUT-001', 'PROCESS-HOOKS-002'],
    ),
    buildLogSourceMaturityGridBuild: withFallback(
      [id(ids, 'SOURCE_MATURITY_GRID_CARD_ID')],
      id(ids, 'SOURCE_MATURITY_GRID_CLOSEOUT_KEY'),
      [id(ids, 'SOURCE_EXTRACTION_COVERAGE_CARD_ID'), 'SOURCE-COVERAGE-CLOSEOUT-001', 'MARKETING-SOURCE-MAP-001', 'FOUNDATION-UI-COMPLETE-001'],
    ),
    buildLogSourceExtractionCoverageBuild: withFallback(
      [id(ids, 'SOURCE_EXTRACTION_COVERAGE_CARD_ID')],
      id(ids, 'SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY'),
      [id(ids, 'SOURCE_MATURITY_GRID_CARD_ID'), id(ids, 'SOURCE_COVERAGE_CLOSEOUT_CARD_ID'), id(ids, 'EXTRACT_RUN_HARDENING_CARD_ID'), 'FOUNDATION-UI-COMPLETE-001'],
    ),
    buildLogSourceCoverageCloseoutBuild: withFallback(
      [id(ids, 'SOURCE_COVERAGE_CLOSEOUT_CARD_ID')],
      id(ids, 'SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY'),
      [id(ids, 'SOURCE_MATURITY_GRID_CARD_ID'), id(ids, 'SOURCE_EXTRACTION_COVERAGE_CARD_ID'), id(ids, 'SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID'), id(ids, 'SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID'), id(ids, 'MARKETING_SOURCE_MAP_CARD_ID'), 'FOUNDATION-UI-COMPLETE-001'],
    ),
    buildLogMarketingSourceMapBuild: withFallback(
      [id(ids, 'MARKETING_SOURCE_MAP_CARD_ID')],
      id(ids, 'MARKETING_SOURCE_MAP_CLOSEOUT_KEY'),
      [id(ids, 'AVATAR_IMPORT_CARD_ID'), 'SOURCE-016', id(ids, 'BRAND_STACK_CARD_ID'), 'MARKETING-PIPELINE-REBUILD-001', 'FOUNDATION-UI-COMPLETE-001'],
    ),
    buildLogBrandStackBuild: withFallback(
      [id(ids, 'BRAND_STACK_CARD_ID')],
      id(ids, 'BRAND_STACK_CLOSEOUT_KEY'),
      [id(ids, 'MARKETING_SOURCE_MAP_CARD_ID'), id(ids, 'TIER_BEHAVIORAL_COMPLETION_CARD_ID'), 'MARKETING-PIPELINE-REBUILD-001', 'DECISION-RESTRICTED-QUEUE-001', 'FOUNDATION-UI-COMPLETE-001'],
    ),
    buildLogTierBehavioralCompletionBuild: withFallback(
      [id(ids, 'TIER_BEHAVIORAL_COMPLETION_CARD_ID')],
      id(ids, 'TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY'),
      ['SECURITY-BEHAVIOR-PROOF-001', 'VERIFICATION-RUNS-001', 'PER-USER-CHANGELOG-001', 'DECISION-RESTRICTED-QUEUE-001', 'FOUNDATION-UI-COMPLETE-001'],
    ),
    buildLogVerificationRunsBuild: withFallback(
      [id(ids, 'VERIFICATION_RUNS_CARD_ID')],
      id(ids, 'VERIFICATION_RUNS_CLOSEOUT_KEY'),
      [id(ids, 'VERIFICATION_RUNS_NEXT_CARD_ID'), 'DECISION-RESTRICTED-QUEUE-001', 'FOUNDATION-UI-COMPLETE-001', 'REPLY-WATCHING-LOOP-001'],
    ),
    buildLogPerUserChangelogBuild: withFallback(
      [id(ids, 'PER_USER_CHANGELOG_CARD_ID')],
      id(ids, 'PER_USER_CHANGELOG_CLOSEOUT_KEY'),
      [id(ids, 'PER_USER_CHANGELOG_NEXT_CARD_ID'), 'FOUNDATION-UI-COMPLETE-001', 'REPLY-WATCHING-LOOP-001', 'FOUNDATION-USERS-001'],
    ),
    buildLogDecisionRestrictedQueueBuild: withFallback(
      [id(ids, 'DECISION_RESTRICTED_QUEUE_CARD_ID')],
      id(ids, 'DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY'),
      [id(ids, 'DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID'), 'REPLY-WATCHING-LOOP-001', 'MARKETING-PIPELINE-REBUILD-001', 'TELEGRAM-BOTS-REBUILD-001', 'INTEL-DIRECTORS-REBUILD-001'],
    ),
    buildLogFoundationUiCompleteBuild: withFallback(
      [id(ids, 'FOUNDATION_UI_COMPLETE_CARD_ID')],
      id(ids, 'FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY'),
      ['SOURCE-MATURITY-GRID-001', 'SOURCE-EXTRACTION-COVERAGE-001', 'SOURCE-COVERAGE-CLOSEOUT-001', 'MARKETING-SOURCE-MAP-001', 'BRAND-STACK-001', 'TIER-BEHAVIORAL-COMPLETION-001', 'VERIFICATION-RUNS-001', 'PER-USER-CHANGELOG-001', 'DECISION-RESTRICTED-QUEUE-001', 'REPLY-WATCHING-LOOP-001'],
    ),
    buildLogFoundationDoneTestBuild: withFallback(
      [id(ids, 'FOUNDATION_DONE_TEST_CARD_ID')],
      id(ids, 'FOUNDATION_DONE_TEST_CLOSEOUT_KEY'),
      ['SOURCE-LIFECYCLE-COMPLETION-001', 'SYNTHESIS-VERIFY-001', 'SYSTEM-010-GHOST-CLOSEOUT-001', 'EXTRACT-RUN-HARDENING-001', 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001'],
    ),
    buildLogSystem010GhostCloseoutBuild: withFallback(
      [id(ids, 'SYSTEM_010_CARD_ID')],
      id(ids, 'SYSTEM_010_CLOSEOUT_KEY'),
      ['SYSTEM-010', id(ids, 'FOUNDATION_DONE_TEST_CARD_ID'), 'SOURCE-LIFECYCLE-COMPLETION-001', 'SYNTHESIS-VERIFY-001', 'EXTRACT-RUN-HARDENING-001', 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001'],
    ),
    buildLogFoundationFollowupCardCaptureBuild: closeoutEntry(id(ids, 'FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID'), id(ids, 'FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY')),
    buildLogFoundationSystemsServiceGroupingBuild: closeoutEntry(id(ids, 'FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID'), id(ids, 'FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY')),
    buildLogAgentOnboardingFeedbackSystemBuild: closeoutEntry(id(ids, 'AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID'), id(ids, 'AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY')),
    buildLogAgentFeedbackSendBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_SEND_CARD_ID'), id(ids, 'AGENT_FEEDBACK_SEND_CLOSEOUT_KEY')),
    buildLogAgentFeedbackAutoSendBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_AUTO_SEND_CARD_ID'), id(ids, 'AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY')),
    buildLogAgentFeedbackResponseNotifyBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID'), id(ids, 'AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY')),
    buildLogAgentFeedbackReminderBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_REMINDER_CARD_ID'), id(ids, 'AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY')),
    buildLogAgentFeedbackLiveRemindersBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID'), id(ids, 'AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY')),
    buildLogAgentFeedbackCompanyEmailPolicyBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID'), id(ids, 'AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY')),
    buildLogAgentFeedbackSteveFullLoopTestBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID'), id(ids, 'AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY')),
    buildLogAgentFeedbackRealUserSubmitRepairBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID'), id(ids, 'AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY')),
    buildLogFoundationVerifyHealthRepairBuild: closeoutEntry(id(ids, 'FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID'), id(ids, 'FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY')),
    buildLogAgentFeedbackProductionAutoSendDryRunBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID'), id(ids, 'AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY')),
    buildLogAgentFeedbackProductionAutoSendEnableBuild: closeoutEntry(id(ids, 'AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID'), id(ids, 'AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY')),
    buildLogSalesGlsScoreboardBuild: closeoutEntry('SALES-GLS-SCOREBOARD-V1', 'sales-gls-scoreboard-v1'),
    buildLogSystemRegistrationSweepBuild: closeoutEntry(id(ids, 'SYSTEM_REGISTRATION_SWEEP_CARD_ID'), id(ids, 'SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY')),
    buildLogGateReliabilityRecurringBuild: closeoutEntry('GATE-RELIABILITY-002', 'gate-reliability-recurring-transient-v1'),
    buildLogGateReliabilityDirectVerifierBuild: closeoutEntry('GATE-RELIABILITY-003', 'gate-reliability-direct-verifier-deadlock-v1'),
  }
}
