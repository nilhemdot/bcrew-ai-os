import {
  VERIFIER_RECENT_BUILDS_SPLIT_APPROVAL_PATH,
  VERIFIER_RECENT_BUILDS_SPLIT_BEFORE_LINES,
  VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID,
  VERIFIER_RECENT_BUILDS_SPLIT_CLOSEOUT_KEY,
  VERIFIER_RECENT_BUILDS_SPLIT_HANDOFF_PATH,
  VERIFIER_RECENT_BUILDS_SPLIT_PLAN_PATH,
  VERIFIER_RECENT_BUILDS_SPLIT_SCRIPT_PATH,
  VERIFIER_RECENT_BUILDS_SPLIT_SPRINT_ID,
  buildFoundationRecentBuildsVerifierDogfoodProof,
} from './foundation-recent-builds-verifier.js'
import {
  VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_APPROVAL_PATH,
  VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_BEFORE_LINES,
  VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CARD_ID,
  VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CLOSEOUT_KEY,
  VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_HANDOFF_PATH,
  VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_PLAN_PATH,
  VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierPhaseGOperatorCloseoutDogfoodProof,
} from './foundation-verifier-phase-g-operator-closeout.js'
import {
  VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_APPROVAL_PATH,
  VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_BEFORE_LINES,
  VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CARD_ID,
  VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CLOSEOUT_KEY,
  VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_HANDOFF_PATH,
  VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_PLAN_PATH,
  VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierReadinessBlockerCloseoutDogfoodProof,
} from './foundation-verifier-readiness-blocker-closeout.js'
import {
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_APPROVAL_PATH,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_BEFORE_LINES,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_HANDOFF_PATH,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_PLAN_PATH,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierSprintGateProgressionDogfoodProof,
} from './foundation-verifier-sprint-gate-progression.js'

export const VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_CARD_ID = 'VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001'
export const VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_CLOSEOUT_KEY = 'verifier-historical-split-closeouts-split-v1'
export const VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_PLAN_PATH = 'docs/process/verifier-historical-split-closeouts-split-001-plan.md'
export const VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001.json'
export const VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-historical-split-closeouts-split-check.mjs'
export const VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-historical-split-closeouts-split-closeout.md'
export const VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_BEFORE_LINES = 8759

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function evaluateHistoricalSplitCloseoutsFixture(fixture = {}) {
  const findings = []
  if (fixture.phaseGCloseoutClosed !== true) findings.push('phase_g_closeout_hidden_failure')
  if (fixture.readinessBlockerCloseoutClosed !== true) findings.push('readiness_blocker_closeout_hidden_failure')
  if (fixture.sprintGateProgressionClosed !== true) findings.push('sprint_gate_progression_hidden_failure')
  if (fixture.recentBuildsCloseoutClosed !== true) findings.push('recent_builds_closeout_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_historical_split_closeout_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierHistoricalSplitCloseoutsDogfoodProof() {
  const healthy = evaluateHistoricalSplitCloseoutsFixture({
    phaseGCloseoutClosed: true,
    readinessBlockerCloseoutClosed: true,
    sprintGateProgressionClosed: true,
    recentBuildsCloseoutClosed: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenPhaseGCloseout: evaluateHistoricalSplitCloseoutsFixture({
      phaseGCloseoutClosed: false,
      readinessBlockerCloseoutClosed: true,
      sprintGateProgressionClosed: true,
      recentBuildsCloseoutClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenReadinessBlockerCloseout: evaluateHistoricalSplitCloseoutsFixture({
      phaseGCloseoutClosed: true,
      readinessBlockerCloseoutClosed: false,
      sprintGateProgressionClosed: true,
      recentBuildsCloseoutClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenSprintGateProgression: evaluateHistoricalSplitCloseoutsFixture({
      phaseGCloseoutClosed: true,
      readinessBlockerCloseoutClosed: true,
      sprintGateProgressionClosed: false,
      recentBuildsCloseoutClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenRecentBuildsCloseout: evaluateHistoricalSplitCloseoutsFixture({
      phaseGCloseoutClosed: true,
      readinessBlockerCloseoutClosed: true,
      sprintGateProgressionClosed: true,
      recentBuildsCloseoutClosed: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateHistoricalSplitCloseoutsFixture({
      phaseGCloseoutClosed: true,
      readinessBlockerCloseoutClosed: true,
      sprintGateProgressionClosed: true,
      recentBuildsCloseoutClosed: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy historical split closeout fixture passes; Phase G, readiness blocker, sprint gate, Recent Builds, and old-inline failures fail closed'
      : 'historical split closeouts dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierHistoricalSplitCloseouts(input = {}) {
  const {
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationBuildCloseouts,
    foundationHub,
    foundationRecentBuildsVerifierSource,
    foundationVerifierHistoricalSplitCloseoutsSource,
    foundationVerifierPhaseGOperatorCloseoutSource,
    foundationVerifierReadinessBlockerCloseoutSource,
    foundationVerifierSprintGateProgressionSource,
    foundationVerifySource,
    packageJson,
    phaseGOperatorCloseoutVerifier,
    readinessBlockerCloseoutVerifier,
    readRepoFile,
    repoFileExists,
    sprintGateProgressionVerifier,
  } = input
  const checks = []
  const historicalSplitCloseoutsDelegationSource = [foundationVerifySource, foundationVerifierHistoricalSplitCloseoutsSource].filter(Boolean).join('\n')
  const readSource = typeof readRepoFile === 'function' ? readRepoFile : async () => ''
  const [
    verifierRecentBuildsSplitScriptSource,
    verifierRecentBuildsSplitPlanSource,
  ] = await Promise.all([
    readSource(VERIFIER_RECENT_BUILDS_SPLIT_SCRIPT_PATH),
    readSource(VERIFIER_RECENT_BUILDS_SPLIT_PLAN_PATH),
  ])

  const verifierPhaseGOperatorCloseoutCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CARD_ID) || null
  const verifierPhaseGOperatorCloseoutCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CLOSEOUT_KEY) || null
  const verifierPhaseGOperatorCloseoutDogfood = buildFoundationVerifierPhaseGOperatorCloseoutDogfoodProof()
  const foundationVerifyLineCountAfterPhaseGOperatorCloseout = String(foundationVerifySource || '').split('\n').length
  const oldPhaseGOperatorInlineMarker = 'const foundation' + '1100BuildLogExact ='
  ensure(
    checks,
    verifierPhaseGOperatorCloseoutCard &&
      ['executing', 'done'].includes(verifierPhaseGOperatorCloseoutCard.lane) &&
      String(verifierPhaseGOperatorCloseoutCard.statusNote || '').includes(VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CLOSEOUT_KEY) &&
      verifierPhaseGOperatorCloseoutCloseout?.operatorCloseout === true &&
      (verifierPhaseGOperatorCloseoutCloseout.backlogIds || []).includes(VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CARD_ID) &&
      verifierPhaseGOperatorCloseoutDogfood.ok === true &&
      phaseGOperatorCloseoutVerifier.summary.passed === phaseGOperatorCloseoutVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-phase-g-operator-closeout-split-check'] === 'node --env-file-if-exists=.env ' + VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_SCRIPT_PATH &&
      await repoFileExists(VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_HANDOFF_PATH) &&
      historicalSplitCloseoutsDelegationSource.includes('evaluateFoundationVerifierPhaseGOperatorCloseout({') &&
      historicalSplitCloseoutsDelegationSource.includes('phaseGOperatorCloseoutVerifier.checks') &&
      !foundationVerifySource.includes(oldPhaseGOperatorInlineMarker) &&
      foundationVerifyLineCountAfterPhaseGOperatorCloseout < VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_BEFORE_LINES &&
      foundationVerifierPhaseGOperatorCloseoutSource.includes(VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CARD_ID),
    'VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001 extracts Phase G operator closeout verifier checks into a focused module',
    verifierPhaseGOperatorCloseoutCard
      ? 'lane=' + verifierPhaseGOperatorCloseoutCard.lane + ' dogfood=' + (verifierPhaseGOperatorCloseoutDogfood.ok ? 'pass' : 'blocked') + ' phaseGChecks=' + phaseGOperatorCloseoutVerifier.summary.passed + '/' + phaseGOperatorCloseoutVerifier.summary.total + ' lines=' + VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_BEFORE_LINES + '->' + foundationVerifyLineCountAfterPhaseGOperatorCloseout
      : 'missing ' + VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CARD_ID,
  )

  const verifierReadinessBlockerCloseoutCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CARD_ID) || null
  const verifierReadinessBlockerCloseoutCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CLOSEOUT_KEY) || null
  const verifierReadinessBlockerCloseoutDogfood = buildFoundationVerifierReadinessBlockerCloseoutDogfoodProof()
  const foundationVerifyLineCountAfterReadinessBlockerCloseout = String(foundationVerifySource || '').split('\n').length
  const oldReadinessBlockerInlineMarker = 'const source' + 'LifecycleCompletionBuildLogExact ='
  ensure(
    checks,
    verifierReadinessBlockerCloseoutCard &&
      ['executing', 'done'].includes(verifierReadinessBlockerCloseoutCard.lane) &&
      String(verifierReadinessBlockerCloseoutCard.statusNote || '').includes(VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CLOSEOUT_KEY) &&
      verifierReadinessBlockerCloseoutCloseout?.operatorCloseout === true &&
      (verifierReadinessBlockerCloseoutCloseout.backlogIds || []).includes(VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CARD_ID) &&
      verifierReadinessBlockerCloseoutDogfood.ok === true &&
      readinessBlockerCloseoutVerifier.summary.passed === readinessBlockerCloseoutVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-readiness-blocker-closeout-split-check'] === 'node --env-file-if-exists=.env ' + VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_SCRIPT_PATH &&
      await repoFileExists(VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_HANDOFF_PATH) &&
      historicalSplitCloseoutsDelegationSource.includes('evaluateFoundationVerifierReadinessBlockerCloseout({') &&
      historicalSplitCloseoutsDelegationSource.includes('readinessBlockerCloseoutVerifier.checks') &&
      !foundationVerifySource.includes(oldReadinessBlockerInlineMarker) &&
      foundationVerifyLineCountAfterReadinessBlockerCloseout < VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_BEFORE_LINES &&
      foundationVerifierReadinessBlockerCloseoutSource.includes(VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CARD_ID),
    'VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001 extracts readiness blocker closeout verifier checks into a focused module',
    verifierReadinessBlockerCloseoutCard
      ? 'lane=' + verifierReadinessBlockerCloseoutCard.lane + ' dogfood=' + (verifierReadinessBlockerCloseoutDogfood.ok ? 'pass' : 'blocked') + ' readinessChecks=' + readinessBlockerCloseoutVerifier.summary.passed + '/' + readinessBlockerCloseoutVerifier.summary.total + ' lines=' + VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_BEFORE_LINES + '->' + foundationVerifyLineCountAfterReadinessBlockerCloseout
      : 'missing ' + VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CARD_ID,
  )

  const verifierSprintGateProgressionCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID) || null
  const verifierSprintGateProgressionCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CLOSEOUT_KEY) || null
  const verifierSprintGateProgressionDogfood = buildFoundationVerifierSprintGateProgressionDogfoodProof()
  const foundationVerifyLineCountAfterSprintGateProgression = String(foundationVerifySource || '').split('\n').length
  const oldSprintGateInlineMarker = 'const verify' + 'GateTieringBuildLogExact ='
  ensure(
    checks,
    verifierSprintGateProgressionCard &&
      ['executing', 'done'].includes(verifierSprintGateProgressionCard.lane) &&
      String(verifierSprintGateProgressionCard.statusNote || '').includes(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CLOSEOUT_KEY) &&
      verifierSprintGateProgressionCloseout?.operatorCloseout === true &&
      (verifierSprintGateProgressionCloseout.backlogIds || []).includes(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID) &&
      verifierSprintGateProgressionDogfood.ok === true &&
      sprintGateProgressionVerifier.summary.passed === sprintGateProgressionVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-sprint-gate-progression-split-check'] === 'node --env-file-if-exists=.env ' + VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_SCRIPT_PATH &&
      await repoFileExists(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_HANDOFF_PATH) &&
      historicalSplitCloseoutsDelegationSource.includes('evaluateFoundationVerifierSprintGateProgression({') &&
      historicalSplitCloseoutsDelegationSource.includes('sprintGateProgressionVerifier.checks') &&
      !foundationVerifySource.includes(oldSprintGateInlineMarker) &&
      foundationVerifyLineCountAfterSprintGateProgression < VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_BEFORE_LINES &&
      foundationVerifierSprintGateProgressionSource.includes(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID),
    'VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001 extracts Current Sprint gate progression checks into a focused module',
    verifierSprintGateProgressionCard
      ? 'lane=' + verifierSprintGateProgressionCard.lane + ' dogfood=' + (verifierSprintGateProgressionDogfood.ok ? 'pass' : 'blocked') + ' sprintGateChecks=' + sprintGateProgressionVerifier.summary.passed + '/' + sprintGateProgressionVerifier.summary.total + ' lines=' + VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_BEFORE_LINES + '->' + foundationVerifyLineCountAfterSprintGateProgression
      : 'missing ' + VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID,
  )

  const verifierRecentBuildsSplitCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID) || null
  const verifierRecentBuildsSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_RECENT_BUILDS_SPLIT_CLOSEOUT_KEY) || null
  const verifierRecentBuildsSplitDogfood = buildFoundationRecentBuildsVerifierDogfoodProof()
  const foundationVerifyLineCountAfterRecentBuildsSplit = String(foundationVerifySource || '').split('\n').length
  ensure(
    checks,
      verifierRecentBuildsSplitCard &&
      ['executing', 'done'].includes(verifierRecentBuildsSplitCard.lane) &&
      String(verifierRecentBuildsSplitCard.statusNote || '').includes(VERIFIER_RECENT_BUILDS_SPLIT_CLOSEOUT_KEY) &&
      verifierRecentBuildsSplitCloseout?.operatorCloseout === true &&
      (verifierRecentBuildsSplitCloseout.backlogIds || []).includes(VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID) &&
      verifierRecentBuildsSplitDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-recent-builds-closeout-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_RECENT_BUILDS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_RECENT_BUILDS_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_RECENT_BUILDS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_RECENT_BUILDS_SPLIT_HANDOFF_PATH) &&
      foundationRecentBuildsVerifierSource.includes('evaluateFoundationRecentBuildsVerifier') &&
      foundationRecentBuildsVerifierSource.includes('RECENT_BUILD_CLOSEOUT_EXPECTATIONS') &&
      verifierRecentBuildsSplitScriptSource.includes('dogfood rejects old Recent Builds closeout verifier failures') &&
      verifierRecentBuildsSplitPlanSource.includes('Substring-only proof is rejected') &&
      historicalSplitCloseoutsDelegationSource.includes('evaluateFoundationRecentBuildsVerifier({') &&
      historicalSplitCloseoutsDelegationSource.includes('recentBuildsCloseoutVerifier.checks') &&
      !foundationVerifySource.includes('Recent Builds v2 carries closeout proof for ' + 'FOUNDATION-SWEEP-001') &&
      foundationVerifyLineCountAfterRecentBuildsSplit < VERIFIER_RECENT_BUILDS_SPLIT_BEFORE_LINES &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_RECENT_BUILDS_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID])) &&
      historicalSplitCloseoutsDelegationSource.includes(VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID),
    'VERIFIER-RECENT-BUILDS-CLOSEOUT-SPLIT-001 extracts Recent Builds closeout verifier checks into a focused module',
    verifierRecentBuildsSplitCard
      ? `lane=${verifierRecentBuildsSplitCard.lane} dogfood=${verifierRecentBuildsSplitDogfood.ok ? 'pass' : 'blocked'} lines=${VERIFIER_RECENT_BUILDS_SPLIT_BEFORE_LINES}->${foundationVerifyLineCountAfterRecentBuildsSplit}`
      : `missing ${VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID}`,
  )

  const verifierHistoricalSplitCloseoutsCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_CARD_ID) || null
  const verifierHistoricalSplitCloseoutsCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_CLOSEOUT_KEY) || null
  const verifierHistoricalSplitCloseoutsDogfood = buildFoundationVerifierHistoricalSplitCloseoutsDogfoodProof()
  const foundationVerifyLineCountAfterHistoricalSplitCloseouts = String(foundationVerifySource || '').split('\n').length
  const oldHistoricalSplitInlineMarkers = [
    'const verifierPhase' + 'GOperatorCloseoutCard =',
    'const verifierReadiness' + 'BlockerCloseoutCard =',
    'const verifierSprint' + 'GateProgressionCard =',
    'const verifierRecent' + 'BuildsSplitCard =',
  ]
  ensure(
    checks,
    verifierHistoricalSplitCloseoutsCard &&
      ['executing', 'done'].includes(verifierHistoricalSplitCloseoutsCard.lane) &&
      String(verifierHistoricalSplitCloseoutsCard.statusNote || '').includes(VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_CLOSEOUT_KEY) &&
      verifierHistoricalSplitCloseoutsCloseout?.operatorCloseout === true &&
      (verifierHistoricalSplitCloseoutsCloseout.backlogIds || []).includes(VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_CARD_ID) &&
      verifierHistoricalSplitCloseoutsDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-historical-split-closeouts-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_HANDOFF_PATH) &&
      historicalSplitCloseoutsDelegationSource.includes('evaluateFoundationVerifierHistoricalSplitCloseouts({') &&
      historicalSplitCloseoutsDelegationSource.includes('historicalSplitCloseoutsVerifier.checks') &&
      oldHistoricalSplitInlineMarkers.every(marker => !foundationVerifySource.includes(marker)) &&
      foundationVerifyLineCountAfterHistoricalSplitCloseouts < VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_BEFORE_LINES &&
      foundationVerifierHistoricalSplitCloseoutsSource.includes(VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_CARD_ID) &&
      foundationVerifierHistoricalSplitCloseoutsSource.includes(VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CARD_ID) &&
      foundationVerifierHistoricalSplitCloseoutsSource.includes(VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CARD_ID) &&
      foundationVerifierHistoricalSplitCloseoutsSource.includes(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID) &&
      foundationVerifierHistoricalSplitCloseoutsSource.includes(VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID),
    'VERIFIER-HISTORICAL-SPLIT-CLOSEOUTS-SPLIT-001 extracts shipped verifier split closeout assertions into a focused module',
    verifierHistoricalSplitCloseoutsCard
      ? `lane=${verifierHistoricalSplitCloseoutsCard.lane} dogfood=${verifierHistoricalSplitCloseoutsDogfood.ok ? 'pass' : 'blocked'} lines=${VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_BEFORE_LINES}->${foundationVerifyLineCountAfterHistoricalSplitCloseouts}`
      : `missing ${VERIFIER_HISTORICAL_SPLIT_CLOSEOUTS_SPLIT_CARD_ID}`,
  )

  return { checks }
}
