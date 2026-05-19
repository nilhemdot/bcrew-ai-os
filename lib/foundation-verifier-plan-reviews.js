import { evaluatePlanCriticPlan } from './process-plan-critic.js'
import {
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_PLAN_PATH,
  SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH,
} from './security-behavior-proof.js'
import {
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  STRATEGY_HUB_MEETING_READY_PLAN_PATH,
  STRATEGY_HUB_MEETING_READY_SCRIPT_PATH,
} from './strategy-hub-meeting-ready.js'
import {
  AVATAR_IMPORT_CARD_ID,
  AVATAR_IMPORT_SCRIPT_PATH,
  MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
  MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
  MARKETING_AVATAR_REGISTRY_README_PATH,
  MARKETING_AVATAR_RETAIN_SOURCE_PATH,
} from './marketing-avatar-registry.js'
import {
  AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH,
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
  AUTO_DEPLOY_ROLLBACK_PLAN_PATH,
  AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
  AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH,
} from './auto-deploy-rollback.js'
import {
  SOURCE_MATURITY_GRID_APPROVAL_PATH,
  SOURCE_MATURITY_GRID_CARD_ID,
  SOURCE_MATURITY_GRID_PLAN_PATH,
  SOURCE_MATURITY_GRID_SCRIPT_PATH,
} from './source-maturity-grid.js'
import {
  SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH,
  SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
  SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH,
} from './source-extraction-coverage.js'
import {
  SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH,
  SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH,
  SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH,
} from './source-coverage-closeout.js'
import {
  MARKETING_SOURCE_MAP_APPROVAL_PATH,
  MARKETING_SOURCE_MAP_CARD_ID,
  MARKETING_SOURCE_MAP_PLAN_PATH,
  MARKETING_SOURCE_MAP_SCRIPT_PATH,
} from './marketing-source-map.js'
import {
  BRAND_STACK_APPROVAL_PATH,
  BRAND_STACK_CARD_ID,
  BRAND_STACK_PLAN_PATH,
  BRAND_STACK_SCRIPT_PATH,
} from './brand-stack.js'
import {
  TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH,
  TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  TIER_BEHAVIORAL_COMPLETION_PLAN_PATH,
  TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH,
} from './tier-behavioral-completion.js'
import {
  VERIFICATION_RUNS_APPROVAL_PATH,
  VERIFICATION_RUNS_CARD_ID,
  VERIFICATION_RUNS_PLAN_PATH,
  VERIFICATION_RUNS_SCRIPT_PATH,
} from './verification-runs.js'
import {
  PER_USER_CHANGELOG_APPROVAL_PATH,
  PER_USER_CHANGELOG_CARD_ID,
  PER_USER_CHANGELOG_PLAN_PATH,
  PER_USER_CHANGELOG_SCRIPT_PATH,
} from './per-user-changelog.js'
import {
  DECISION_RESTRICTED_QUEUE_APPROVAL_PATH,
  DECISION_RESTRICTED_QUEUE_CARD_ID,
  DECISION_RESTRICTED_QUEUE_PLAN_PATH,
  DECISION_RESTRICTED_QUEUE_SCRIPT_PATH,
} from './decision-restricted-queue.js'
import {
  FOUNDATION_UI_COMPLETE_APPROVAL_PATH,
  FOUNDATION_UI_COMPLETE_CARD_ID,
  FOUNDATION_UI_COMPLETE_PLAN_PATH,
  FOUNDATION_UI_COMPLETE_SCRIPT_PATH,
} from './foundation-ui-complete.js'

export const VERIFIER_PLAN_REVIEWS_SPLIT_CARD_ID = 'VERIFIER-PLAN-REVIEWS-SPLIT-001'
export const VERIFIER_PLAN_REVIEWS_SPLIT_CLOSEOUT_KEY = 'verifier-plan-reviews-split-v1'
export const VERIFIER_PLAN_REVIEWS_SPLIT_PLAN_PATH = 'docs/process/verifier-plan-reviews-split-001-plan.md'
export const VERIFIER_PLAN_REVIEWS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-PLAN-REVIEWS-SPLIT-001.json'
export const VERIFIER_PLAN_REVIEWS_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-plan-reviews-split-check.mjs'
export const VERIFIER_PLAN_REVIEWS_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-plan-reviews-split-closeout.md'
export const VERIFIER_PLAN_REVIEWS_SPLIT_BEFORE_LINES = 12628

const ROOT_VERIFIER_PATH = 'scripts/foundation-verify.mjs'
const SERVER_PATH = 'server.js'
const FOUNDATION_FRONTEND_PATH = 'public/foundation.js'
const STYLES_PATH = 'public/styles.css'
const CURRENT_SPRINT_PATH = 'lib/foundation-current-sprint.js'
const FOUNDATION_DB_PATH = 'lib/foundation-db.js'
const BUILD_LOG_PATH = 'lib/foundation-build-log.js'
const PACKAGE_PATH = 'package.json'
const CURRENT_PLAN_PATH = 'docs/rebuild/current-plan.md'
const CURRENT_STATE_PATH = 'docs/rebuild/current-state.md'

function reviewPlan({ planText, card, fallbackId, priority = 'P1', changedFiles, declaredRisk }) {
  return evaluatePlanCriticPlan({
    planText,
    card: card || { id: fallbackId, priority },
    changedFiles,
    ...(declaredRisk ? { declaredRisk } : {}),
  })
}

const PLAN_SOURCE_KEYS = [
  'securityBehaviorProofPlanSource',
  'strategyHubMeetingReadyPlanSource',
  'avatarImportPlanSource',
  'autoDeployRollbackPlanSource',
  'sourceMaturityGridPlanSource',
  'sourceExtractionCoveragePlanSource',
  'sourceCoverageCloseoutPlanSource',
  'marketingSourceMapPlanSource',
  'brandStackPlanSource',
  'tierBehavioralCompletionPlanSource',
  'verificationRunsPlanSource',
  'perUserChangelogPlanSource',
  'decisionRestrictedQueuePlanSource',
  'foundationUiCompletePlanSource',
]

export function buildFoundationVerifierPlanReviews(input = {}) {
  const cards = input.cards || {}
  const planSources = input.planSources || {}

  return {
    securityBehaviorPlanReview: reviewPlan({
      planText: planSources.securityBehaviorProofPlanSource,
      card: cards.securityBehaviorProof,
      fallbackId: SECURITY_BEHAVIOR_PROOF_CARD_ID,
      priority: 'P0',
      changedFiles: [
        'lib/security-behavior-proof.js',
        SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH,
        SECURITY_BEHAVIOR_PROOF_PLAN_PATH,
        CURRENT_SPRINT_PATH,
        FOUNDATION_DB_PATH,
        ROOT_VERIFIER_PATH,
        PACKAGE_PATH,
      ],
    }),
    strategyHubMeetingReadyPlanReview: reviewPlan({
      planText: planSources.strategyHubMeetingReadyPlanSource,
      card: cards.strategyHubMeetingReady,
      fallbackId: STRATEGY_HUB_MEETING_READY_CARD_ID,
      changedFiles: [
        'lib/strategy-hub-meeting-ready.js',
        STRATEGY_HUB_MEETING_READY_SCRIPT_PATH,
        STRATEGY_HUB_MEETING_READY_PLAN_PATH,
        SERVER_PATH,
        'public/strategic-execution.html',
        'public/strategic-execution.js',
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        FOUNDATION_DB_PATH,
        ROOT_VERIFIER_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.strategyHubMeetingReadyPlanSource,
    }),
    avatarImportPlanReview: reviewPlan({
      planText: planSources.avatarImportPlanSource,
      card: cards.avatarImport,
      fallbackId: AVATAR_IMPORT_CARD_ID,
      changedFiles: [
        MARKETING_AVATAR_REGISTRY_README_PATH,
        MARKETING_AVATAR_RETAIN_SOURCE_PATH,
        MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
        MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
        'lib/marketing-avatar-registry.js',
        AVATAR_IMPORT_SCRIPT_PATH,
        SERVER_PATH,
        CURRENT_SPRINT_PATH,
        FOUNDATION_DB_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.avatarImportPlanSource,
    }),
    autoDeployRollbackPlanReview: reviewPlan({
      planText: planSources.autoDeployRollbackPlanSource,
      card: cards.autoDeployRollback,
      fallbackId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
      changedFiles: [
        AUTO_DEPLOY_ROLLBACK_PLAN_PATH,
        AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH,
        'lib/auto-deploy-rollback.js',
        AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
        AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH,
        CURRENT_SPRINT_PATH,
        FOUNDATION_DB_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.autoDeployRollbackPlanSource,
    }),
    sourceMaturityGridPlanReview: reviewPlan({
      planText: planSources.sourceMaturityGridPlanSource,
      card: cards.sourceMaturityGrid,
      fallbackId: SOURCE_MATURITY_GRID_CARD_ID,
      priority: 'P0',
      changedFiles: [
        SOURCE_MATURITY_GRID_PLAN_PATH,
        SOURCE_MATURITY_GRID_APPROVAL_PATH,
        'lib/source-maturity-grid.js',
        SOURCE_MATURITY_GRID_SCRIPT_PATH,
        SERVER_PATH,
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        FOUNDATION_DB_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.sourceMaturityGridPlanSource,
    }),
    sourceExtractionCoveragePlanReview: reviewPlan({
      planText: planSources.sourceExtractionCoveragePlanSource,
      card: cards.sourceExtractionCoverage,
      fallbackId: SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      priority: 'P0',
      changedFiles: [
        SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
        SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH,
        'lib/source-extraction-coverage.js',
        SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH,
        SERVER_PATH,
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        FOUNDATION_DB_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.sourceExtractionCoveragePlanSource,
    }),
    sourceCoverageCloseoutPlanReview: reviewPlan({
      planText: planSources.sourceCoverageCloseoutPlanSource,
      card: cards.sourceCoverageCloseout,
      fallbackId: SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
      priority: 'P0',
      changedFiles: [
        SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH,
        SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH,
        'lib/source-coverage-closeout.js',
        SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH,
        SERVER_PATH,
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        FOUNDATION_DB_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.sourceCoverageCloseoutPlanSource,
    }),
    marketingSourceMapPlanReview: reviewPlan({
      planText: planSources.marketingSourceMapPlanSource,
      card: cards.marketingSourceMap,
      fallbackId: MARKETING_SOURCE_MAP_CARD_ID,
      changedFiles: [
        MARKETING_SOURCE_MAP_PLAN_PATH,
        MARKETING_SOURCE_MAP_APPROVAL_PATH,
        'lib/marketing-source-map.js',
        MARKETING_SOURCE_MAP_SCRIPT_PATH,
        SERVER_PATH,
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        FOUNDATION_DB_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        CURRENT_PLAN_PATH,
        CURRENT_STATE_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.marketingSourceMapPlanSource,
    }),
    brandStackPlanReview: reviewPlan({
      planText: planSources.brandStackPlanSource,
      card: cards.brandStack,
      fallbackId: BRAND_STACK_CARD_ID,
      changedFiles: [
        BRAND_STACK_PLAN_PATH,
        BRAND_STACK_APPROVAL_PATH,
        'lib/brand-stack.js',
        BRAND_STACK_SCRIPT_PATH,
        SERVER_PATH,
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        FOUNDATION_DB_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        CURRENT_PLAN_PATH,
        CURRENT_STATE_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.brandStackPlanSource,
    }),
    tierBehavioralCompletionPlanReview: reviewPlan({
      planText: planSources.tierBehavioralCompletionPlanSource,
      card: cards.tierBehavioralCompletion,
      fallbackId: TIER_BEHAVIORAL_COMPLETION_CARD_ID,
      changedFiles: [
        TIER_BEHAVIORAL_COMPLETION_PLAN_PATH,
        TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH,
        'lib/tier-behavioral-completion.js',
        TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH,
        'lib/security-access.js',
        SERVER_PATH,
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        CURRENT_PLAN_PATH,
        CURRENT_STATE_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.tierBehavioralCompletionPlanSource,
    }),
    verificationRunsPlanReview: reviewPlan({
      planText: planSources.verificationRunsPlanSource,
      card: cards.verificationRuns,
      fallbackId: VERIFICATION_RUNS_CARD_ID,
      changedFiles: [
        VERIFICATION_RUNS_PLAN_PATH,
        VERIFICATION_RUNS_APPROVAL_PATH,
        'lib/verification-runs.js',
        VERIFICATION_RUNS_SCRIPT_PATH,
        SERVER_PATH,
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        'lib/foundation-jobs.js',
        'lib/security-access.js',
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        CURRENT_PLAN_PATH,
        CURRENT_STATE_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.verificationRunsPlanSource,
    }),
    perUserChangelogPlanReview: reviewPlan({
      planText: planSources.perUserChangelogPlanSource,
      card: cards.perUserChangelog,
      fallbackId: PER_USER_CHANGELOG_CARD_ID,
      priority: 'P2',
      changedFiles: [
        PER_USER_CHANGELOG_PLAN_PATH,
        PER_USER_CHANGELOG_APPROVAL_PATH,
        'lib/per-user-changelog.js',
        PER_USER_CHANGELOG_SCRIPT_PATH,
        SERVER_PATH,
        'lib/security-access.js',
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        CURRENT_PLAN_PATH,
        CURRENT_STATE_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.perUserChangelogPlanSource,
    }),
    decisionRestrictedQueuePlanReview: reviewPlan({
      planText: planSources.decisionRestrictedQueuePlanSource,
      card: cards.decisionRestrictedQueue,
      fallbackId: DECISION_RESTRICTED_QUEUE_CARD_ID,
      changedFiles: [
        DECISION_RESTRICTED_QUEUE_PLAN_PATH,
        DECISION_RESTRICTED_QUEUE_APPROVAL_PATH,
        'lib/decision-restricted-queue.js',
        DECISION_RESTRICTED_QUEUE_SCRIPT_PATH,
        SERVER_PATH,
        'lib/shared-candidate-extraction.js',
        'lib/security-access.js',
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        CURRENT_PLAN_PATH,
        CURRENT_STATE_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.decisionRestrictedQueuePlanSource,
    }),
    foundationUiCompletePlanReview: reviewPlan({
      planText: planSources.foundationUiCompletePlanSource,
      card: cards.foundationUiComplete,
      fallbackId: FOUNDATION_UI_COMPLETE_CARD_ID,
      priority: 'P0',
      changedFiles: [
        FOUNDATION_UI_COMPLETE_PLAN_PATH,
        FOUNDATION_UI_COMPLETE_APPROVAL_PATH,
        'lib/foundation-ui-complete.js',
        FOUNDATION_UI_COMPLETE_SCRIPT_PATH,
        SERVER_PATH,
        FOUNDATION_FRONTEND_PATH,
        STYLES_PATH,
        CURRENT_SPRINT_PATH,
        BUILD_LOG_PATH,
        ROOT_VERIFIER_PATH,
        CURRENT_PLAN_PATH,
        CURRENT_STATE_PATH,
        PACKAGE_PATH,
      ],
      declaredRisk: planSources.foundationUiCompletePlanSource,
    }),
  }
}

export function buildFoundationVerifierPlanReviewsDogfoodProof() {
  const weakPlan = [
    '# Weak verifier plan',
    '',
    'What: add more lines directly to scripts/foundation-verify.mjs.',
    'Proof: run node --check.',
  ].join('\n')
  const weakPlanSources = Object.fromEntries(PLAN_SOURCE_KEYS.map(key => [key, weakPlan]))
  const reviews = buildFoundationVerifierPlanReviews({ planSources: weakPlanSources })
  const acceptedWeakPlans = Object.entries(reviews)
    .filter(([, review]) => review?.status === 'pass')
    .map(([key]) => key)

  return {
    ok: acceptedWeakPlans.length === 0,
    reviewCount: Object.keys(reviews).length,
    acceptedWeakPlans,
  }
}
