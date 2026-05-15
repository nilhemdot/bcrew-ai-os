import {
  FOUNDATION_BACKLOG_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID,
  FOUNDATION_BACKLOG_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_BACKLOG_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_BACKLOG_STORE_SPLIT_SPRINT_ID,
  buildFoundationBacklogStoreSplitDogfoodProof,
} from './foundation-backlog-store.js'
import {
  FOUNDATION_DECISION_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_DECISION_STORE_SPLIT_CARD_ID,
  FOUNDATION_DECISION_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_DECISION_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_DECISION_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_DECISION_STORE_SPLIT_SPRINT_ID,
  buildFoundationDecisionStoreSplitDogfoodProof,
} from './foundation-decision-store.js'
import {
  FOUNDATION_CORE_SEED_SPLIT_APPROVAL_PATH,
  FOUNDATION_CORE_SEED_SPLIT_CARD_ID,
  FOUNDATION_CORE_SEED_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_CORE_SEED_SPLIT_PLAN_PATH,
  FOUNDATION_CORE_SEED_SPLIT_SCRIPT_PATH,
  FOUNDATION_CORE_SEED_SPLIT_SPRINT_ID,
  buildFoundationCoreSeedSplitDogfoodProof,
  evaluateFoundationCoreSeedSplit,
  getFoundationCoreSeedSummary,
} from './foundation-core-seed.js'
import {
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_APPROVAL_PATH,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SCRIPT_PATH,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SPRINT_ID,
  buildFoundationStrategySourceSnapshotSplitDogfoodProof,
  evaluateFoundationStrategySourceSnapshotSplit,
} from './foundation-strategy-source-snapshots.js'
import {
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_APPROVAL_PATH,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_PLAN_PATH,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SCRIPT_PATH,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SPRINT_ID,
  buildFoundationStrategyOperatingTruthSplitDogfoodProof,
  evaluateFoundationStrategyOperatingTruthSplit,
} from './foundation-strategy-operating-truth.js'
import {
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_APPROVAL_PATH,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_PLAN_PATH,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SCRIPT_PATH,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SPRINT_ID,
  buildFoundationStrategyGoalTruthSplitDogfoodProof,
  evaluateFoundationStrategyGoalTruthSplit,
} from './foundation-strategy-goal-truth.js'
import {
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SPRINT_ID,
  buildFoundationFubLeadSourceStoreSplitDogfoodProof,
  evaluateFoundationFubLeadSourceStoreSplit,
} from './foundation-fub-lead-source-store.js'
import {
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_APPROVAL_PATH,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SCRIPT_PATH,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SPRINT_ID,
  buildFoundationSharedCommsCoverageSplitDogfoodProof,
  evaluateFoundationSharedCommsCoverageSplit,
} from './foundation-shared-comms-coverage.js'

export const VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID = 'VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001'
export const VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-foundation-db-split-module-v1'
export const VERIFIER_FOUNDATION_DB_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-foundation-db-split-module-001-plan.md'
export const VERIFIER_FOUNDATION_DB_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001.json'
export const VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-foundation-db-split-module-check.mjs'
export const VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SPRINT_ID = 'verifier-foundation-db-split-module-2026-05-15'
export const VERIFIER_FOUNDATION_DB_SPLIT_MODULE_BEFORE_LINES = 15515

export const FOUNDATION_DB_SPLIT_VERIFIER_COVERED_CARD_IDS = [
  FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID,
  FOUNDATION_DECISION_STORE_SPLIT_CARD_ID,
  FOUNDATION_CORE_SEED_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CARD_ID,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID,
]

export const FOUNDATION_DB_SPLIT_VERIFIER_SOURCE_PATHS = {
  backlogStoreScript: FOUNDATION_BACKLOG_STORE_SPLIT_SCRIPT_PATH,
  backlogStorePlan: FOUNDATION_BACKLOG_STORE_SPLIT_PLAN_PATH,
  decisionStoreScript: FOUNDATION_DECISION_STORE_SPLIT_SCRIPT_PATH,
  decisionStorePlan: FOUNDATION_DECISION_STORE_SPLIT_PLAN_PATH,
  coreSeedScript: FOUNDATION_CORE_SEED_SPLIT_SCRIPT_PATH,
  coreSeedPlan: FOUNDATION_CORE_SEED_SPLIT_PLAN_PATH,
  sourceSnapshotScript: FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SCRIPT_PATH,
  sourceSnapshotPlan: FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH,
  operatingTruthScript: FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SCRIPT_PATH,
  operatingTruthPlan: FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_PLAN_PATH,
  goalTruthScript: FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SCRIPT_PATH,
  goalTruthPlan: FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_PLAN_PATH,
  fubLeadSourceScript: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SCRIPT_PATH,
  fubLeadSourcePlan: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH,
  sharedCommsScript: FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SCRIPT_PATH,
  sharedCommsPlan: FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH,
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function findCard(cards = [], cardId) {
  return (cards || []).find(item => item.id === cardId) || null
}

function findCloseout(closeouts = [], closeoutKey) {
  return (closeouts || []).find(closeout => closeout.key === closeoutKey || closeout.closeoutKey === closeoutKey) || null
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function fallbackRepoFileExists() {
  return false
}

function activeSprintMatches(activeFoundationSprint, sprintId, cardId, activeSprintAtOrPast, card, closeout) {
  return activeFoundationSprint?.sprint?.sprintId === sprintId ||
    (typeof activeSprintAtOrPast === 'function' && activeSprintAtOrPast([cardId])) ||
    (card?.lane === 'done' &&
      closeout?.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(cardId))
}

export async function evaluateFoundationDbSplitVerifier(input = {}) {
  const checks = []
  const cards = input.foundationHub?.backlogItems || input.cards || []
  const closeouts = input.foundationBuildCloseouts || input.closeouts || []
  const packageScripts = input.packageJson?.scripts || input.packageScripts || {}
  const repoFileExists = input.repoFileExists || fallbackRepoFileExists
  const foundationDbLineCount = lineCount(input.foundationDbSource)

  const backlogCard = findCard(cards, FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID)
  const backlogCloseout = findCloseout(closeouts, FOUNDATION_BACKLOG_STORE_SPLIT_CLOSEOUT_KEY)
  const backlogDogfood = buildFoundationBacklogStoreSplitDogfoodProof()
  addCheck(
    checks,
    backlogCard &&
      backlogCard.lane === 'done' &&
      String(backlogCard.statusNote || '').includes(FOUNDATION_BACKLOG_STORE_SPLIT_CLOSEOUT_KEY) &&
      backlogCloseout?.operatorCloseout === true &&
      (backlogCloseout.backlogIds || []).includes(FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID) &&
      backlogDogfood.ok === true &&
      packageScripts['process:foundation-backlog-store-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_BACKLOG_STORE_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_BACKLOG_STORE_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_BACKLOG_STORE_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-foundation-backlog-store-split-closeout.md') &&
      input.foundationBacklogStoreSource?.includes('createFoundationBacklogStore') &&
      input.foundationBacklogStoreSource?.includes('FOR UPDATE') &&
      input.foundationBacklogStoreSource?.includes('changedFields') &&
      input.foundationBacklogStoreScriptSource?.includes('dogfood rejects old backlog store failures') &&
      input.foundationBacklogStorePlanSource?.includes('weak done-lane closeout') &&
      input.foundationDbSource?.includes('createFoundationBacklogStore') &&
      input.foundationDbSource?.includes('export const createBacklogItem') &&
      input.foundationDbSource?.includes('export const updateBacklogItem') &&
      !input.foundationDbSource?.includes('async function updateBacklogItemWithClient') &&
      input.currentPlan?.includes(FOUNDATION_BACKLOG_STORE_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_BACKLOG_STORE_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, FOUNDATION_BACKLOG_STORE_SPLIT_SPRINT_ID, FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID, input.activeSprintAtOrPast, backlogCard, backlogCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationDbSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID'),
    'FOUNDATION-DB-MONOLITH-SPLIT-001 splits backlog write store out of foundation-db.js',
    backlogCard
      ? `lane=${backlogCard.lane} dogfood=${backlogDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID}`,
  )

  const decisionCard = findCard(cards, FOUNDATION_DECISION_STORE_SPLIT_CARD_ID)
  const decisionCloseout = findCloseout(closeouts, FOUNDATION_DECISION_STORE_SPLIT_CLOSEOUT_KEY)
  const decisionDogfood = buildFoundationDecisionStoreSplitDogfoodProof()
  addCheck(
    checks,
    decisionCard &&
      decisionCard.lane === 'done' &&
      String(decisionCard.statusNote || '').includes(FOUNDATION_DECISION_STORE_SPLIT_CLOSEOUT_KEY) &&
      decisionCloseout?.operatorCloseout === true &&
      (decisionCloseout.backlogIds || []).includes(FOUNDATION_DECISION_STORE_SPLIT_CARD_ID) &&
      decisionDogfood.ok === true &&
      packageScripts['process:foundation-decision-store-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_DECISION_STORE_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_DECISION_STORE_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_DECISION_STORE_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-foundation-decision-store-split-closeout.md') &&
      input.foundationDecisionStoreSource?.includes('createFoundationDecisionStore') &&
      input.foundationDecisionStoreSource?.includes('assertPendingDocUpdateCanApprove') &&
      input.foundationDecisionStoreSource?.includes('buildFoundationDecisionStoreSplitDogfoodProof') &&
      input.foundationDecisionStoreScriptSource?.includes('dogfood rejects old decision store failures') &&
      input.foundationDecisionStorePlanSource?.includes('invalid pending doc-update status transitions') &&
      input.foundationDbSource?.includes('createFoundationDecisionStore') &&
      input.foundationDbSource?.includes('export const createDecision') &&
      input.foundationDbSource?.includes('export const markPendingDocUpdateApplied') &&
      !input.foundationDbSource?.includes('export async function createDecision') &&
      !input.foundationDbSource?.includes('async function markSupersededDecisions') &&
      input.currentPlan?.includes(FOUNDATION_DECISION_STORE_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_DECISION_STORE_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, FOUNDATION_DECISION_STORE_SPLIT_SPRINT_ID, FOUNDATION_DECISION_STORE_SPLIT_CARD_ID, input.activeSprintAtOrPast, decisionCard, decisionCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationDbSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_DECISION_STORE_SPLIT_CARD_ID'),
    'FOUNDATION-DB-MONOLITH-SPLIT-002 splits decision/doc-update store out of foundation-db.js',
    decisionCard
      ? `lane=${decisionCard.lane} dogfood=${decisionDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${FOUNDATION_DECISION_STORE_SPLIT_CARD_ID}`,
  )

  const coreSeedCard = findCard(cards, FOUNDATION_CORE_SEED_SPLIT_CARD_ID)
  const coreSeedCloseout = findCloseout(closeouts, FOUNDATION_CORE_SEED_SPLIT_CLOSEOUT_KEY)
  const coreSeedDogfood = buildFoundationCoreSeedSplitDogfoodProof()
  const coreSeedEvaluation = evaluateFoundationCoreSeedSplit({
    foundationDbSource: input.foundationDbSource,
    coreSeedSource: input.foundationCoreSeedSource,
    seedSummary: getFoundationCoreSeedSummary(),
  })
  addCheck(
    checks,
    coreSeedCard &&
      (activeSprintMatches(input.activeFoundationSprint, FOUNDATION_CORE_SEED_SPLIT_SPRINT_ID, FOUNDATION_CORE_SEED_SPLIT_CARD_ID, input.activeSprintAtOrPast, coreSeedCard, coreSeedCloseout)) &&
      coreSeedDogfood.ok === true &&
      coreSeedEvaluation.ok === true &&
      packageScripts['process:foundation-core-seed-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_CORE_SEED_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_CORE_SEED_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_CORE_SEED_SPLIT_APPROVAL_PATH) &&
      input.foundationCoreSeedSource?.includes('Live Postgres/API remains operational truth after bootstrap') &&
      input.foundationCoreSeedSource?.includes('export const foundationUserSeed') &&
      input.foundationCoreSeedSource?.includes('export const docSourceSnapshotsSeed') &&
      input.foundationCoreSeedScriptSource?.includes('dogfood rejects old inline core seed ownership') &&
      input.foundationCoreSeedPlanSource?.includes('inline seed ownership') &&
      input.foundationDbSource?.includes('./foundation-core-seed.js') &&
      !input.foundationDbSource?.includes('const foundationUserSeed = [') &&
      !input.foundationDbSource?.includes('const decisionsSeed = [') &&
      !input.foundationDbSource?.includes('const docSourceSnapshotsSeed = [') &&
      input.currentPlan?.includes(FOUNDATION_CORE_SEED_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_CORE_SEED_SPLIT_CLOSEOUT_KEY) &&
      input.foundationVerifySource?.includes('evaluateFoundationDbSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_CORE_SEED_SPLIT_CARD_ID'),
    'FOUNDATION-DB-MONOLITH-SPLIT-003 splits static core seed arrays out of foundation-db.js',
    coreSeedCard
      ? `lane=${coreSeedCard.lane} dogfood=${coreSeedDogfood.ok ? 'pass' : 'blocked'} lines=${coreSeedEvaluation.preSplitFoundationDbLineCount}->${coreSeedEvaluation.foundationDbLineCount}`
      : `missing ${FOUNDATION_CORE_SEED_SPLIT_CARD_ID}`,
  )

  const sourceSnapshotCard = findCard(cards, FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID)
  const sourceSnapshotCloseout = findCloseout(closeouts, FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY)
  const sourceSnapshotDogfood = buildFoundationStrategySourceSnapshotSplitDogfoodProof({ afterLines: foundationDbLineCount })
  const sourceSnapshotEvaluation = evaluateFoundationStrategySourceSnapshotSplit({
    foundationDbSource: input.foundationDbSource,
    moduleSource: input.foundationStrategySourceSnapshotSource,
    scriptSource: input.foundationStrategySourceSnapshotScriptSource,
    planSource: input.foundationStrategySourceSnapshotPlanSource,
    afterLines: foundationDbLineCount,
  })
  addCheck(
    checks,
    sourceSnapshotCard &&
      activeSprintMatches(input.activeFoundationSprint, FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SPRINT_ID, FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID, input.activeSprintAtOrPast, sourceSnapshotCard, sourceSnapshotCloseout) &&
      sourceSnapshotDogfood.ok === true &&
      sourceSnapshotEvaluation.ok === true &&
      packageScripts['process:foundation-strategy-source-snapshot-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_APPROVAL_PATH) &&
      input.foundationStrategySourceSnapshotSource?.includes('export async function getLiveBhagSourceSnapshot()') &&
      input.foundationStrategySourceSnapshotSource?.includes('export async function getLiveAgentEngineSourceSnapshot()') &&
      input.foundationStrategySourceSnapshotSource?.includes("'Benson Crew Bhag Builder'!K4:L13") &&
      input.foundationStrategySourceSnapshotSource?.includes("'Agent Engine'!A1:K10") &&
      input.foundationStrategySourceSnapshotScriptSource?.includes('dogfood rejects old inline builder ownership') &&
      input.foundationStrategySourceSnapshotPlanSource?.includes('source-backed BHAG and Agent Engine doc snapshot builders') &&
      input.foundationDbSource?.includes('./foundation-strategy-source-snapshots.js') &&
      !input.foundationDbSource?.includes('async function getLiveBhagSourceSnapshot()') &&
      !input.foundationDbSource?.includes('async function getLiveAgentEngineSourceSnapshot()') &&
      input.currentPlan?.includes(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY) &&
      input.foundationVerifySource?.includes('evaluateFoundationDbSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID'),
    'FOUNDATION-DB-MONOLITH-SPLIT-004 splits Strategy source snapshot builders out of foundation-db.js',
    sourceSnapshotCard
      ? `lane=${sourceSnapshotCard.lane} dogfood=${sourceSnapshotDogfood.ok ? 'pass' : 'blocked'} lines=${sourceSnapshotEvaluation.beforeLines}->${sourceSnapshotEvaluation.afterLines}`
      : `missing ${FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID}`,
  )

  const operatingTruthCard = findCard(cards, FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CARD_ID)
  const operatingTruthCloseout = findCloseout(closeouts, FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CLOSEOUT_KEY)
  const operatingTruthDogfood = buildFoundationStrategyOperatingTruthSplitDogfoodProof({ afterLines: foundationDbLineCount })
  const operatingTruthEvaluation = evaluateFoundationStrategyOperatingTruthSplit({
    foundationDbSource: input.foundationDbSource,
    moduleSource: input.foundationStrategyOperatingTruthSource,
    scriptSource: input.foundationStrategyOperatingTruthScriptSource,
    planSource: input.foundationStrategyOperatingTruthPlanSource,
    afterLines: foundationDbLineCount,
  })
  addCheck(
    checks,
    operatingTruthCard &&
      activeSprintMatches(input.activeFoundationSprint, FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SPRINT_ID, FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CARD_ID, input.activeSprintAtOrPast, operatingTruthCard, operatingTruthCloseout) &&
      operatingTruthDogfood.ok === true &&
      operatingTruthEvaluation.ok === true &&
      packageScripts['process:foundation-strategy-operating-truth-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_APPROVAL_PATH) &&
      input.foundationStrategyOperatingTruthSource?.includes('export async function getStrategyOperatingTruthSnapshot') &&
      input.foundationStrategyOperatingTruthSource?.includes('export function buildStrategyOperatingTruthSnapshot') &&
      input.foundationStrategyOperatingTruthSource?.includes("'Cashflow Dash'!A1:J25") &&
      input.foundationStrategyOperatingTruthSource?.includes("'(Input) Weekly Actuals'!A1:BR8") &&
      input.foundationStrategyOperatingTruthSource?.includes("'Listings and Conditional Deals'!A1:B12") &&
      input.foundationStrategyOperatingTruthScriptSource?.includes('dogfood rejects old inline Strategy Operating Truth ownership') &&
      input.foundationStrategyOperatingTruthPlanSource?.includes('Strategy Operating Truth source-card builder') &&
      input.foundationDbSource?.includes('./foundation-strategy-operating-truth.js') &&
      input.foundationDbSource?.includes('return getStrategyOperatingTruthSnapshotFromSources({') &&
      !input.foundationDbSource?.includes('function findSheetMetric') &&
      !input.foundationDbSource?.includes('function conditionalCollectionFacts') &&
      input.currentPlan?.includes(FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CLOSEOUT_KEY) &&
      input.foundationVerifySource?.includes('evaluateFoundationDbSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CARD_ID'),
    'FOUNDATION-DB-MONOLITH-SPLIT-005 splits Strategy Operating Truth source cards out of foundation-db.js',
    operatingTruthCard
      ? `lane=${operatingTruthCard.lane} dogfood=${operatingTruthDogfood.ok ? 'pass' : 'blocked'} lines=${operatingTruthEvaluation.beforeLines}->${operatingTruthEvaluation.afterLines}`
      : `missing ${FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CARD_ID}`,
  )

  const goalTruthCard = findCard(cards, FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CARD_ID)
  const goalTruthCloseout = findCloseout(closeouts, FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CLOSEOUT_KEY)
  const goalTruthDogfood = buildFoundationStrategyGoalTruthSplitDogfoodProof({ afterLines: foundationDbLineCount })
  const goalTruthEvaluation = evaluateFoundationStrategyGoalTruthSplit({
    foundationDbSource: input.foundationDbSource,
    moduleSource: input.foundationStrategyGoalTruthSource,
    scriptSource: input.foundationStrategyGoalTruthScriptSource,
    planSource: input.foundationStrategyGoalTruthPlanSource,
    afterLines: foundationDbLineCount,
  })
  addCheck(
    checks,
    goalTruthCard &&
      activeSprintMatches(input.activeFoundationSprint, FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SPRINT_ID, FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CARD_ID, input.activeSprintAtOrPast, goalTruthCard, goalTruthCloseout) &&
      goalTruthDogfood.ok === true &&
      goalTruthEvaluation.ok === true &&
      packageScripts['process:foundation-strategy-goal-truth-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_APPROVAL_PATH) &&
      input.foundationStrategyGoalTruthSource?.includes('export async function getStrategyPreworkCoverageSnapshot') &&
      input.foundationStrategyGoalTruthSource?.includes('export async function getStrategyGoalTruthSnapshot') &&
      input.foundationStrategyGoalTruthSource?.includes('strategyPreworkExpectedParticipants') &&
      input.foundationStrategyGoalTruthSource?.includes('team_volume') &&
      input.foundationStrategyGoalTruthSource?.includes('community_agents') &&
      input.foundationStrategyGoalTruthSource?.includes('agent_engine_capacity') &&
      input.foundationStrategyGoalTruthScriptSource?.includes('dogfood rejects old inline Strategy prework and goal truth ownership') &&
      input.foundationStrategyGoalTruthPlanSource?.includes('Strategy Prework Coverage and Strategy Goal Truth') &&
      input.foundationDbSource?.includes('./foundation-strategy-goal-truth.js') &&
      input.foundationDbSource?.includes('return getStrategyPreworkCoverageSnapshotFromSources({') &&
      input.foundationDbSource?.includes('return getStrategyGoalTruthSnapshotFromSources({') &&
      !input.foundationDbSource?.includes('function inferStrategyPreworkParticipant') &&
      !input.foundationDbSource?.includes('function buildStrategyGoalGroup') &&
      input.currentPlan?.includes(FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CLOSEOUT_KEY) &&
      input.foundationVerifySource?.includes('evaluateFoundationDbSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CARD_ID'),
    'FOUNDATION-DB-MONOLITH-SPLIT-006 splits Strategy prework and goal truth builders out of foundation-db.js',
    goalTruthCard
      ? `lane=${goalTruthCard.lane} dogfood=${goalTruthDogfood.ok ? 'pass' : 'blocked'} lines=${goalTruthEvaluation.beforeLines}->${goalTruthEvaluation.afterLines}`
      : `missing ${FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CARD_ID}`,
  )

  const fubLeadSourceCard = findCard(cards, FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID)
  const fubLeadSourceCloseout = findCloseout(closeouts, FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY)
  const fubLeadSourceDogfood = buildFoundationFubLeadSourceStoreSplitDogfoodProof({ afterLines: foundationDbLineCount })
  const fubLeadSourceEvaluation = evaluateFoundationFubLeadSourceStoreSplit({
    foundationDbSource: input.foundationDbSource,
    moduleSource: input.foundationFubLeadSourceStoreSource,
    scriptSource: input.foundationFubLeadSourceStoreScriptSource,
    afterLines: foundationDbLineCount,
  })
  addCheck(
    checks,
    fubLeadSourceCard &&
      activeSprintMatches(input.activeFoundationSprint, FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SPRINT_ID, FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID, input.activeSprintAtOrPast, fubLeadSourceCard, fubLeadSourceCloseout) &&
      fubLeadSourceDogfood.ok === true &&
      fubLeadSourceEvaluation.ok === true &&
      packageScripts['process:foundation-fub-lead-source-store-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_APPROVAL_PATH) &&
      input.foundationFubLeadSourceStoreSource?.includes('export function createFubLeadSourceStore') &&
      input.foundationFubLeadSourceStoreSource?.includes('function listFubLeadSourceRules') &&
      input.foundationFubLeadSourceStoreSource?.includes('function saveFubLeadSourceSnapshot') &&
      input.foundationFubLeadSourceStoreScriptSource?.includes('dogfood rejects old inline FUB lead-source store ownership') &&
      input.foundationFubLeadSourceStorePlanSource?.includes('split/extraction plan') &&
      input.foundationDbSource?.includes('./foundation-fub-lead-source-store.js') &&
      input.foundationDbSource?.includes('export const listFubLeadSourceRules = fubLeadSourceStore.listFubLeadSourceRules') &&
      input.foundationDbSource?.includes('export const saveFubLeadSourceSnapshot = fubLeadSourceStore.saveFubLeadSourceSnapshot') &&
      !input.foundationDbSource?.includes('function mapFubLeadSourceRuleRow') &&
      !input.foundationDbSource?.includes('export async function listFubLeadSourceRules') &&
      input.currentPlan?.includes(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY) &&
      input.foundationVerifySource?.includes('evaluateFoundationDbSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID'),
    'FOUNDATION-DB-MONOLITH-SPLIT-007 splits FUB lead-source store out of foundation-db.js',
    fubLeadSourceCard
      ? `lane=${fubLeadSourceCard.lane} dogfood=${fubLeadSourceDogfood.ok ? 'pass' : 'blocked'} lines=${fubLeadSourceEvaluation.beforeLines}->${fubLeadSourceEvaluation.afterLines}`
      : `missing ${FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID}`,
  )

  const sharedCommsCard = findCard(cards, FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID)
  const sharedCommsCloseout = findCloseout(closeouts, FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY)
  const sharedCommsEvaluation = evaluateFoundationSharedCommsCoverageSplit({
    foundationDbSource: input.foundationDbSource,
    moduleSource: input.foundationSharedCommsCoverageSource,
    scriptSource: input.foundationSharedCommsCoverageScriptSource,
    planSource: input.foundationSharedCommsCoveragePlanSource,
  })
  const sharedCommsDogfood = await buildFoundationSharedCommsCoverageSplitDogfoodProof({
    foundationDbSource: input.foundationDbSource,
    moduleSource: input.foundationSharedCommsCoverageSource,
    scriptSource: input.foundationSharedCommsCoverageScriptSource,
    planSource: input.foundationSharedCommsCoveragePlanSource,
    afterLines: sharedCommsEvaluation.afterLines,
  })
  addCheck(
    checks,
    sharedCommsCard &&
      activeSprintMatches(input.activeFoundationSprint, FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SPRINT_ID, FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID, input.activeSprintAtOrPast, sharedCommsCard, sharedCommsCloseout) &&
      sharedCommsDogfood.ok === true &&
      sharedCommsEvaluation.ok === true &&
      packageScripts['process:foundation-shared-comms-coverage-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_APPROVAL_PATH) &&
      input.foundationSharedCommsCoverageSource?.includes('getSharedCommunicationCoverageSnapshotFromDb') &&
      input.foundationSharedCommsCoverageSource?.includes('buildSharedCommunicationCoverageSnapshotFromRows') &&
      input.foundationSharedCommsCoverageSource?.includes('shared_communication_artifacts') &&
      input.foundationSharedCommsCoverageSource?.includes('shared_communication_candidates') &&
      input.foundationSharedCommsCoverageScriptSource?.includes('dogfood rejects old inline shared-comms coverage ownership') &&
      input.foundationSharedCommsCoveragePlanSource?.includes('split/extraction plan') &&
      input.foundationDbSource?.includes('./foundation-shared-comms-coverage.js') &&
      input.foundationDbSource?.includes('return getSharedCommunicationCoverageSnapshotFromDb({ pool })') &&
      !input.foundationDbSource?.includes('FROM shared_communication_artifacts\n        GROUP BY source_id, artifact_type') &&
      input.currentPlan?.includes(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY) &&
      input.foundationVerifySource?.includes('evaluateFoundationDbSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID'),
    'FOUNDATION-DB-MONOLITH-SPLIT-008 splits shared-comms coverage out of foundation-db.js',
    sharedCommsCard
      ? `lane=${sharedCommsCard.lane} dogfood=${sharedCommsDogfood.ok ? 'pass' : 'blocked'} lines=${sharedCommsEvaluation.beforeLines}->${sharedCommsEvaluation.afterLines}`
      : `missing ${FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID}`,
  )
  const oldInlineFoundationDbSplitPredicate = 'const foundationBacklog' + 'StoreSplitCard ='
  addCheck(
    checks,
    input.foundationVerifySource?.includes('evaluateFoundationDbSplitVerifier') &&
      !input.foundationVerifySource?.includes(oldInlineFoundationDbSplitPredicate),
    'Foundation verifier delegates Foundation-DB split assertions instead of keeping old inline predicates',
    input.foundationVerifySource?.includes(oldInlineFoundationDbSplitPredicate)
      ? 'old inline Foundation-DB split predicate still present'
      : 'delegated to evaluateFoundationDbSplitVerifier',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      foundationDbLineCount,
    },
  }
}

export async function buildFoundationDbSplitVerifierDogfoodProof(input = {}) {
  const healthy = await evaluateFoundationDbSplitVerifier(input)
  const missingBacklogModule = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationBacklogStoreSource: '',
  })
  const oldInlineBacklogOwnership = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationDbSource: `${input.foundationDbSource || ''}\nasync function updateBacklogItemWithClient() {}`,
  })
  const missingDecisionDogfood = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationDecisionStoreSource: String(input.foundationDecisionStoreSource || '').replace('buildFoundationDecisionStoreSplitDogfoodProof', 'missingDecisionStoreDogfoodProof'),
  })
  const missingCoreSeed = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationCoreSeedSource: '',
  })
  const missingSourceSnapshot = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationStrategySourceSnapshotSource: '',
  })
  const missingOperatingTruth = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationStrategyOperatingTruthSource: '',
  })
  const missingGoalTruth = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationStrategyGoalTruthSource: '',
  })
  const missingFubLeadSource = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationFubLeadSourceStoreSource: '',
  })
  const missingSharedComms = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationSharedCommsCoverageSource: '',
  })
  const oldInlineVerifier = await evaluateFoundationDbSplitVerifier({
    ...input,
    foundationVerifySource: `${input.foundationVerifySource || ''}\nconst foundationBacklogStoreSplitCard = null`,
  })

  const rejected = {
    missingBacklogModule: missingBacklogModule.ok === false,
    oldInlineBacklogOwnership: oldInlineBacklogOwnership.ok === false,
    missingDecisionDogfood: missingDecisionDogfood.ok === false,
    missingCoreSeed: missingCoreSeed.ok === false,
    missingSourceSnapshot: missingSourceSnapshot.ok === false,
    missingOperatingTruth: missingOperatingTruth.ok === false,
    missingGoalTruth: missingGoalTruth.ok === false,
    missingFubLeadSource: missingFubLeadSource.ok === false,
    missingSharedComms: missingSharedComms.ok === false,
    oldInlineVerifier: oldInlineVerifier.ok === false,
  }

  return {
    ok: healthy.ok === true && Object.values(rejected).every(Boolean),
    healthy,
    rejected,
    invariant: 'The Foundation-DB split verifier accepts the current split state and rejects missing modules, old inline ownership, weak split evidence, and old inline verifier predicates.',
  }
}
