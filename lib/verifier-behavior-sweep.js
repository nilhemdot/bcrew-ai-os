import {
  DRIVE_ACCESS_REQUEST_CARD_ID,
  DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
  DRIVE_ACCESS_REQUEST_SCRIPT_PATH,
  buildSyntheticDriveAccessPreflightProof,
} from './drive-access-preflight.js'
import {
  EXTRACT_RUN_HARDENING_CARD_ID,
  EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
  EXTRACT_RUN_HARDENING_SCRIPT_PATH,
  buildSyntheticExtractionRunHardeningProof,
} from './extraction-run-hardening.js'
import {
  FOUNDATION_DONE_TEST_CARD_ID,
  FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
  FOUNDATION_DONE_TEST_SCRIPT_PATH,
  FOUNDATION_READINESS_GATE_CARDS,
  buildFoundationReadinessStatus,
} from './foundation-readiness-gates.js'
import {
  FOUNDATION_CURRENT_SPRINT_ID,
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
  PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
  SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  buildSyntheticFoundationCurrentSprintProof,
} from './foundation-current-sprint.js'
import {
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_CLOSEOUT_KEY,
  MEETING_VAULT_ACL_SCRIPT_PATH,
  buildSyntheticMeetingVaultAclProof,
} from './meeting-vault-acl.js'
import {
  MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
  MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
  MEETING_VAULT_AUTO_ENFORCEMENT_SCRIPT_PATH,
  buildSyntheticMeetingVaultAutoEnforcementProof,
} from './meeting-vault-auto-enforcement.js'
import {
  PLAN_CRITIC_SUMMARY_MARKER,
  buildSyntheticPlanCriticProof,
} from './process-plan-critic.js'
import {
  VERIFY_GATE_TIERING_CARD_ID,
  VERIFY_GATE_TIERING_CLOSEOUT_KEY,
  VERIFY_GATE_TIERING_SCRIPT_PATH,
  buildSyntheticVerifyGateTieringProof,
} from './process-verify-gate-tiering.js'
import {
  SYSTEM_010_CARD_ID,
  SYSTEM_010_CLOSEOUT_KEY,
  SYSTEM_010_PROCESS_SCRIPT_PATH,
  buildDecommissionDecision,
  buildServiceRestartOnPushStatus,
  buildStopDecision,
} from './runtime-process-control.js'
import {
  SECURITY_BEHAVIOR_PROOF_SUMMARY_MARKER,
  buildSyntheticSecurityBehaviorProof,
} from './security-behavior-proof.js'
import {
  SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE,
  SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT,
} from './source-lifecycle.js'
import {
  SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
  SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY,
  SOURCE_LIFECYCLE_COMPLETION_RULES,
  SOURCE_LIFECYCLE_COMPLETION_SCRIPT_PATH,
  buildSourceLifecycleCompletionStatus,
} from './source-lifecycle-completion.js'
import {
  SYNTHESIS_CLAIM_SURFACES,
  SYNTHESIS_VERIFY_CARD_ID,
  SYNTHESIS_VERIFY_CLOSEOUT_KEY,
  SYNTHESIS_VERIFY_SCRIPT_PATH,
  buildSynthesisEvidenceIndex,
  filterVerifiedSynthesisRecords,
  requireVerifiedSynthesisRecord,
  verifySynthesizedRecord,
} from './synthesis-claim-verification.js'

export const VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY = 'verifier-behavior-sweep-v1'
export const VERIFIER_BEHAVIOR_SWEEP_PLAN_PATH = 'docs/process/verifier-behavior-sweep-001-plan.md'
export const VERIFIER_BEHAVIOR_SWEEP_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-BEHAVIOR-SWEEP-001.json'
export const VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH = 'scripts/process-verifier-behavior-sweep-check.mjs'
export const VERIFIER_BEHAVIOR_SWEEP_SUMMARY_MARKER = 'VERIFIER_BEHAVIOR_SWEEP_SUMMARY'
export const VERIFIER_BEHAVIOR_SWEEP_MIN_TARGETS = 10

export const VERIFIER_BEHAVIOR_PROOF_MODES = Object.freeze({
  SYNTHETIC_BEHAVIOR: 'synthetic_behavior',
  DIRECT_FUNCTION: 'direct_function',
  FOCUSED_PROCESS: 'focused_process',
})

function makeTarget({
  cardId,
  closeoutKey,
  proofMode = VERIFIER_BEHAVIOR_PROOF_MODES.SYNTHETIC_BEHAVIOR,
  proofCommand,
  scriptPath,
  proofSymbols = [],
  behaviorClaim,
}) {
  return {
    cardId,
    closeoutKey,
    proofMode,
    proofCommand,
    scriptPath,
    proofSymbols,
    behaviorClaim,
    substringOnlyProofRejected: true,
  }
}

export const VERIFIER_BEHAVIOR_TARGETS = [
  makeTarget({
    cardId: VERIFY_GATE_TIERING_CARD_ID,
    closeoutKey: VERIFY_GATE_TIERING_CLOSEOUT_KEY,
    proofCommand: 'npm run process:verify-gate-tiering-check',
    scriptPath: VERIFY_GATE_TIERING_SCRIPT_PATH,
    proofSymbols: ['buildSyntheticVerifyGateTieringProof', 'classifyVerificationGateForFiles'],
    behaviorClaim: 'Protected Foundation changes are classified into static, focused, or full gates based on blast radius.',
  }),
  makeTarget({
    cardId: PLAN_CRITIC_REPLACEMENT_CARD_ID,
    closeoutKey: PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
    proofCommand: 'npm run process:plan-critic-check',
    scriptPath: PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH,
    proofSymbols: ['buildSyntheticPlanCriticProof', 'evaluatePlanCriticPlan', PLAN_CRITIC_SUMMARY_MARKER],
    behaviorClaim: 'Plan Critic passes a strong plan and rejects weak substring-only and over-broad plans.',
  }),
  makeTarget({
    cardId: SECURITY_BEHAVIOR_PROOF_CARD_ID,
    closeoutKey: SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
    proofCommand: 'npm run process:security-behavior-proof-check',
    scriptPath: SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH,
    proofSymbols: ['buildSyntheticSecurityBehaviorProof', 'authorizeRouteAccess', SECURITY_BEHAVIOR_PROOF_SUMMARY_MARKER],
    behaviorClaim: 'Route-boundary and subject-person security behavior is proved through the security function path.',
  }),
  makeTarget({
    cardId: FOUNDATION_SPRINT_SYSTEM_CARD_ID,
    closeoutKey: FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
    proofCommand: 'npm run process:foundation-sprint-system-check',
    scriptPath: FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH,
    proofSymbols: ['buildSyntheticFoundationCurrentSprintProof', 'buildFoundationCurrentSprintStatus'],
    behaviorClaim: 'Current Sprint command truth validates live backlog-backed stage, done, returned, and closeout rules.',
  }),
  makeTarget({
    cardId: MEETING_VAULT_ACL_CARD_ID,
    closeoutKey: MEETING_VAULT_ACL_CLOSEOUT_KEY,
    proofCommand: 'npm run process:meeting-vault-acl-check',
    scriptPath: MEETING_VAULT_ACL_SCRIPT_PATH,
    proofSymbols: ['buildSyntheticMeetingVaultAclProof', 'classifyMeetingRawFileAcl'],
    behaviorClaim: 'Meeting Vault ACL proof classifies safe, unsafe, missing-Crewbert, owner-ambiguous, and legacy-copy cases.',
  }),
  makeTarget({
    cardId: MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
    closeoutKey: MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
    proofCommand: 'npm run process:meeting-vault-auto-enforcement-check',
    scriptPath: MEETING_VAULT_AUTO_ENFORCEMENT_SCRIPT_PATH,
    proofSymbols: ['buildSyntheticMeetingVaultAutoEnforcementProof', 'classifyMeetingVaultAutoEnforcementItem'],
    behaviorClaim: 'Forward-flow Meeting Vault enforcement queues safe actions and legacy exceptions without Drive mutation.',
  }),
  makeTarget({
    cardId: DRIVE_ACCESS_REQUEST_CARD_ID,
    closeoutKey: DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
    proofCommand: 'npm run process:drive-access-request-check',
    scriptPath: DRIVE_ACCESS_REQUEST_SCRIPT_PATH,
    proofSymbols: ['buildSyntheticDriveAccessPreflightProof', 'buildDriveFilePreflight'],
    behaviorClaim: 'Drive access preflight distinguishes safe, repairable, owner-ambiguous, and request-access cases.',
  }),
  makeTarget({
    cardId: EXTRACT_RUN_HARDENING_CARD_ID,
    closeoutKey: EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
    proofCommand: 'npm run process:extract-run-hardening-check',
    scriptPath: EXTRACT_RUN_HARDENING_SCRIPT_PATH,
    proofSymbols: ['buildSyntheticExtractionRunHardeningProof', 'classifyExtractionItemRetry'],
    behaviorClaim: 'Extraction retry behavior handles retryable, exhausted, blocked, stale-lease, and idempotent attempt cases.',
  }),
  makeTarget({
    cardId: SYNTHESIS_VERIFY_CARD_ID,
    closeoutKey: SYNTHESIS_VERIFY_CLOSEOUT_KEY,
    proofMode: VERIFIER_BEHAVIOR_PROOF_MODES.DIRECT_FUNCTION,
    proofCommand: 'npm run process:synthesis-verify-check',
    scriptPath: SYNTHESIS_VERIFY_SCRIPT_PATH,
    proofSymbols: ['verifySynthesizedRecord', 'requireVerifiedSynthesisRecord', 'filterVerifiedSynthesisRecords'],
    behaviorClaim: 'Verified synthesis records pass and unverified decision-grade records are rejected before Strategy consumption.',
  }),
  makeTarget({
    cardId: SYSTEM_010_CARD_ID,
    closeoutKey: SYSTEM_010_CLOSEOUT_KEY,
    proofMode: VERIFIER_BEHAVIOR_PROOF_MODES.DIRECT_FUNCTION,
    proofCommand: 'npm run process:system-010-ghost-closeout-check',
    scriptPath: SYSTEM_010_PROCESS_SCRIPT_PATH,
    proofSymbols: ['buildStopDecision', 'buildDecommissionDecision', 'buildServiceRestartOnPushStatus'],
    behaviorClaim: 'Runtime control decisions fail closed for unsafe stop/decommission/restart states.',
  }),
  makeTarget({
    cardId: FOUNDATION_DONE_TEST_CARD_ID,
    closeoutKey: FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
    proofMode: VERIFIER_BEHAVIOR_PROOF_MODES.DIRECT_FUNCTION,
    proofCommand: 'npm run process:foundation-done-test -- --report-only',
    scriptPath: FOUNDATION_DONE_TEST_SCRIPT_PATH,
    proofSymbols: ['buildFoundationReadinessStatus', 'FOUNDATION_READINESS_GATE_CARDS'],
    behaviorClaim: 'Foundation readiness returns ready only when required gates, closeouts, scripts, and safety flags line up.',
  }),
  makeTarget({
    cardId: SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
    closeoutKey: SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY,
    proofMode: VERIFIER_BEHAVIOR_PROOF_MODES.DIRECT_FUNCTION,
    proofCommand: 'npm run process:source-lifecycle-completion-check',
    scriptPath: SOURCE_LIFECYCLE_COMPLETION_SCRIPT_PATH,
    proofSymbols: ['buildSourceLifecycleCompletionStatus', 'SOURCE_LIFECYCLE_COMPLETION_RULES'],
    behaviorClaim: 'Source lifecycle completion validates all current terminal source contracts and approved extraction targets.',
  }),
]

function summarizeProof(value) {
  if (!value || typeof value !== 'object') return {}
  if (value.summary && typeof value.summary === 'object') return value.summary
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => ['string', 'number', 'boolean'].includes(typeof entry))
      .slice(0, 8),
  )
}

function buildSynthesisVerifyBehaviorProof() {
  const evidenceIndex = buildSynthesisEvidenceIndex({
    registeredSourceIds: ['SRC-STRATEGY-001'],
    facts: [
      { factId: 'fact-1', sourceId: 'SRC-STRATEGY-001', status: 'active', asOf: '2026-05-12T00:00:00.000Z' },
      { factId: 'fact-2', sourceId: 'SRC-STRATEGY-001', status: 'active', asOf: '2026-05-12T00:00:00.000Z' },
    ],
    chunks: [
      { chunkId: 'chunk-1', sourceId: 'SRC-STRATEGY-001', status: 'active', minTier: 1, sensitivity: 'neutral' },
      { chunkId: 'chunk-2', sourceId: 'SRC-STRATEGY-001', status: 'active', minTier: 1, sensitivity: 'neutral' },
    ],
    atoms: [
      { atomId: 'atom-1', sourceId: 'SRC-STRATEGY-001', status: 'active', minTier: 1, sensitivity: 'neutral' },
      { atomId: 'atom-2', sourceId: 'SRC-STRATEGY-001', status: 'active', minTier: 1, sensitivity: 'neutral' },
    ],
  })
  const verifiedRecord = {
    synthesizedItemId: 'synthetic-strategy-ready',
    title: 'Synthetic Strategy-ready claim',
    summary: 'Synthetic claim with two active facts, atoms, and chunks.',
    sourceIds: ['SRC-STRATEGY-001'],
    factRefs: ['fact-1', 'fact-2'],
    evidenceRefs: ['atom-1', 'atom-2'],
    evidenceChunkRefs: ['chunk-1', 'chunk-2'],
    minTier: 1,
    sensitivity: 'neutral',
    strategyHubEligible: true,
  }
  const verification = verifySynthesizedRecord(verifiedRecord, evidenceIndex, {
    requiresFreshEvidence: true,
    freshnessDays: 365,
  })
  const embeddedVerified = {
    ...verifiedRecord,
    synthesisVerification: verification,
  }
  const unverifiedDecision = {
    routeId: 'synthetic-unverified-action',
    routeType: 'create',
    destinationTable: 'decisions',
    title: 'Synthetic unverified decision route',
    sourceIds: ['SRC-STRATEGY-001'],
    minTier: 1,
    sensitivity: 'neutral',
  }
  let requireVerifiedPassed = false
  let unverifiedRejected = false
  try {
    requireVerifiedSynthesisRecord(embeddedVerified)
    requireVerifiedPassed = true
  } catch {
    requireVerifiedPassed = false
  }
  try {
    requireVerifiedSynthesisRecord(unverifiedDecision, { surface: SYNTHESIS_CLAIM_SURFACES.actionRoutes.surface })
    unverifiedRejected = false
  } catch {
    unverifiedRejected = true
  }
  const filtered = filterVerifiedSynthesisRecords([embeddedVerified, unverifiedDecision])
  return {
    ok: verification.status === 'verified' &&
      requireVerifiedPassed &&
      unverifiedRejected &&
      filtered.summary.included === 1 &&
      filtered.summary.blocked === 1,
    verification,
    requireVerifiedPassed,
    unverifiedRejected,
    filtered: filtered.summary,
  }
}

function buildSystem010BehaviorProof() {
  const currentRepoHead = '0123456789abcdef0123456789abcdef01234567'
  const safeRun = {
    runId: 'run-safe',
    jobKey: 'synthetic-job',
    status: 'running',
    metadata: {
      childPid: 4321,
      processOwner: 'foundation-job-runner',
      processStartedByRunId: 'run-safe',
    },
  }
  const unsafeRun = {
    ...safeRun,
    runId: 'run-unsafe',
    metadata: {
      childPid: 4322,
      processOwner: 'unknown',
      processStartedByRunId: 'different-run',
    },
  }
  const servedCode = { status: 'live', runningCommit: currentRepoHead }
  const safeStop = buildStopDecision({ run: safeRun, servedCode, currentRepoHead })
  const unsafeStop = buildStopDecision({ run: unsafeRun, servedCode, currentRepoHead })
  const confirmedDecommission = buildDecommissionDecision({
    job: { key: 'synthetic-job', latestRun: { status: 'succeeded' } },
    confirmation: 'DECOMMISSION synthetic-job',
  })
  const rejectedDecommission = buildDecommissionDecision({
    job: { key: 'synthetic-job', latestRun: { status: 'running' } },
    confirmation: 'decommission synthetic-job',
  })
  const restartStatus = buildServiceRestartOnPushStatus({
    currentRepoHead,
    runtimeSupervisor: {
      servedCode: {
        serviceKey: 'dashboard',
        status: 'live',
        runningCommit: currentRepoHead,
        metadata: { autoRestartOnPush: true },
      },
      workerCode: {
        serviceKey: 'foundation-worker',
        status: 'live',
        runningCommit: currentRepoHead,
        metadata: { autoRestartOnPush: true },
      },
    },
  })
  return {
    ok: safeStop.ok &&
      unsafeStop.failClosed &&
      confirmedDecommission.ok &&
      rejectedDecommission.failClosed &&
      restartStatus.status === 'automatic',
    safeStop,
    unsafeStop,
    confirmedDecommission,
    rejectedDecommission,
    restartStatus: {
      status: restartStatus.status,
      serviceCount: restartStatus.services.length,
    },
  }
}

function packageScriptsForReadiness() {
  return {
    'process:foundation-done-test': 'node --env-file-if-exists=.env scripts/process-foundation-done-test.mjs',
    'process:security-002-check': 'node --env-file-if-exists=.env scripts/process-security-002-check.mjs',
    'process:meeting-vault-auto-enforcement-check': 'node --env-file-if-exists=.env scripts/process-meeting-vault-auto-enforcement-check.mjs',
    'process:meeting-vault-acl-check': 'node --env-file-if-exists=.env scripts/process-meeting-vault-acl-check.mjs',
    'process:drive-access-request-check': 'node --env-file-if-exists=.env scripts/process-drive-access-request-check.mjs',
    'process:system-010-ghost-closeout-check': 'node --env-file-if-exists=.env scripts/process-system-010-ghost-closeout-check.mjs',
    'process:source-lifecycle-completion-check': 'node --env-file-if-exists=.env scripts/process-source-lifecycle-completion-check.mjs',
    'process:extract-run-hardening-check': 'node --env-file-if-exists=.env scripts/process-extract-run-hardening-check.mjs',
    'process:synthesis-verify-check': 'node --env-file-if-exists=.env scripts/process-synthesis-verify-check.mjs',
    'intelligence:retrieval-eval': 'node --env-file-if-exists=.env scripts/intelligence-retrieval-eval.mjs',
    'foundation:verify': 'node --env-file-if-exists=.env scripts/foundation-verify.mjs',
  }
}

function buildReadinessBacklogItems() {
  return FOUNDATION_READINESS_GATE_CARDS.map(gate => ({
    id: gate.cardId,
    title: gate.label,
    lane: gate.requiredForStrategy ? 'done' : 'scoped',
    priority: 'P0',
    statusNote: gate.closeoutKey ? `Synthetic closed under ${gate.closeoutKey}.` : 'Synthetic conditional gate card.',
  }))
}

function buildReadinessCloseouts({ omitCardId = null } = {}) {
  return FOUNDATION_READINESS_GATE_CARDS
    .filter(gate => gate.requiredForStrategy && gate.closeoutKey && gate.cardId !== omitCardId)
    .map(gate => ({
      key: gate.closeoutKey,
      backlogIds: [gate.cardId],
      status: 'accepted',
    }))
}

function buildFoundationReadinessBehaviorProof() {
  const foundationHub = { backlogItems: buildReadinessBacklogItems() }
  const repo = {
    packageJson: { scripts: packageScriptsForReadiness() },
    securityAccessHasRegistry: true,
    securityScriptHasExternalDenials: true,
    scriptHasSummaryMarker: true,
    scriptSupportsReportOnly: true,
  }
  const ready = buildFoundationReadinessStatus({
    foundationHub,
    closeouts: buildReadinessCloseouts(),
    repo,
    generatedAt: '2026-05-12T00:00:00.000Z',
    repoHead: '0123456789abcdef0123456789abcdef01234567',
  })
  const missingCloseout = buildFoundationReadinessStatus({
    foundationHub,
    closeouts: buildReadinessCloseouts({ omitCardId: SYNTHESIS_VERIFY_CARD_ID }),
    repo,
    generatedAt: '2026-05-12T00:00:00.000Z',
    repoHead: '0123456789abcdef0123456789abcdef01234567',
  })
  return {
    ok: ready.status === 'ready' &&
      ready.readyForStrategy === true &&
      missingCloseout.status === 'not_ready' &&
      missingCloseout.blockingCards.includes(SYNTHESIS_VERIFY_CARD_ID),
    ready: {
      status: ready.status,
      readyForStrategy: ready.readyForStrategy,
      passedLegs: ready.summary.passedLegs,
    },
    missingCloseout: {
      status: missingCloseout.status,
      blockingCards: missingCloseout.blockingCards,
    },
  }
}

function sourceStatusForRule(rule) {
  if (rule.requiredState === 'current_reality_complete') return 'current reality signed off'
  if (rule.requiredState === 'read_only_complete') return 'verified readable'
  if (rule.requiredState === 'read_only_non_readiness') return 'active read-only'
  if (rule.requiredState === 'accepted_blocked') return 'gap accepted blocked'
  return 'verified'
}

function sourceValidationForRule(rule) {
  if (rule.requiredState === 'current_reality_complete') return 'signed off for current reality'
  if (rule.requiredState === 'read_only_complete') return 'readable only'
  if (rule.requiredState === 'read_only_non_readiness') return 'read-only v1'
  if (rule.requiredState === 'accepted_blocked') return 'not signed off'
  return 'signed off'
}

function buildSourceLifecycleBehaviorProof() {
  const sourceContracts = SOURCE_LIFECYCLE_COMPLETION_RULES.map(rule => ({
    sourceId: rule.sourceId,
    title: `Synthetic ${rule.sourceId}`,
    owner: 'Foundation',
    status: sourceStatusForRule(rule),
    validation: sourceValidationForRule(rule),
    lastVerified: '2026-05-12',
  }))
  const lifecycleSources = SOURCE_LIFECYCLE_COMPLETION_RULES.map(rule => ({
    sourceId: rule.sourceId,
    title: `Synthetic lifecycle ${rule.sourceId}`,
    targetKeys: rule.targetKeys || [],
  }))
  const targets = Object.entries(SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE).map(([targetKey, baseline]) => ({
    targetKey,
    sourceId: baseline.sourceId,
    status: baseline.status || 'active',
    runtimeMode: baseline.runtimeMode || 'scheduled',
    schedulerMode: baseline.schedulerMode || 'scheduled',
    counts: {
      totalItems: 1,
      succeededItems: 1,
    },
    budgetCaps: baseline.budget || {},
    evidenceRefs: [`target:${targetKey}`],
  }))
  const connectorIds = Array.from(new Set(SOURCE_LIFECYCLE_COMPLETION_RULES.flatMap(rule => rule.connectorIds || [])))
  const connectors = connectorIds.map(connectorId => ({
    connectorId,
    status: 'working',
    group: 'working',
  }))
  const blockerIds = Array.from(new Set(SOURCE_LIFECYCLE_COMPLETION_RULES.flatMap(rule => rule.blockerCards || [])))
  const foundationHub = {
    backlogItems: [
      ...buildReadinessBacklogItems(),
      ...blockerIds.map(cardId => ({
        id: cardId,
        title: `Synthetic blocker ${cardId}`,
        lane: 'scoped',
        priority: 'P1',
        statusNote: 'Synthetic accepted-blocked source blocker.',
      })),
    ],
  }
  const status = buildSourceLifecycleCompletionStatus({
    sourceLifecycle: {
      sources: lifecycleSources,
      targets,
      summary: {
        extractionCapsUnchanged: true,
        targetBaselineChanges: 0,
        blockedPausedPlannedActivated: 0,
      },
    },
    sourceOfTruth: {
      sources: sourceContracts,
      connectors,
    },
    foundationHub,
    generatedAt: '2026-05-12T00:00:00.000Z',
    repoHead: '0123456789abcdef0123456789abcdef01234567',
  })
  return {
    ok: status.status === 'healthy' &&
      status.summary.sourceContractCount === SOURCE_LIFECYCLE_COMPLETION_RULES.length &&
      status.summary.extractionTargetCount === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT &&
      status.summary.findingCount === 0,
    status: {
      status: status.status,
      sourceContractCount: status.summary.sourceContractCount,
      extractionTargetCount: status.summary.extractionTargetCount,
      findingCount: status.summary.findingCount,
    },
  }
}

function runTargetProof(target) {
  if (target.cardId === VERIFY_GATE_TIERING_CARD_ID) return buildSyntheticVerifyGateTieringProof()
  if (target.cardId === PLAN_CRITIC_REPLACEMENT_CARD_ID) return buildSyntheticPlanCriticProof()
  if (target.cardId === SECURITY_BEHAVIOR_PROOF_CARD_ID) return buildSyntheticSecurityBehaviorProof()
  if (target.cardId === FOUNDATION_SPRINT_SYSTEM_CARD_ID) return buildSyntheticFoundationCurrentSprintProof()
  if (target.cardId === MEETING_VAULT_ACL_CARD_ID) return buildSyntheticMeetingVaultAclProof()
  if (target.cardId === MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID) return buildSyntheticMeetingVaultAutoEnforcementProof()
  if (target.cardId === DRIVE_ACCESS_REQUEST_CARD_ID) return buildSyntheticDriveAccessPreflightProof()
  if (target.cardId === EXTRACT_RUN_HARDENING_CARD_ID) return buildSyntheticExtractionRunHardeningProof()
  if (target.cardId === SYNTHESIS_VERIFY_CARD_ID) return buildSynthesisVerifyBehaviorProof()
  if (target.cardId === SYSTEM_010_CARD_ID) return buildSystem010BehaviorProof()
  if (target.cardId === FOUNDATION_DONE_TEST_CARD_ID) return buildFoundationReadinessBehaviorProof()
  if (target.cardId === SOURCE_LIFECYCLE_COMPLETION_CARD_ID) return buildSourceLifecycleBehaviorProof()
  return {
    ok: false,
    reason: 'No behavior proof runner registered for target.',
  }
}

export function buildSyntheticVerifierBehaviorSweepProof() {
  const results = VERIFIER_BEHAVIOR_TARGETS.map(target => {
    const proof = runTargetProof(target)
    const ok = proof.ok === true || proof.pass === true
    return {
      ...target,
      ok,
      proofSummary: summarizeProof(proof),
      proof,
    }
  })
  const failingTargets = results.filter(target => !target.ok)
  const substringOnlyTargets = results.filter(target =>
    target.substringOnlyProofRejected !== true ||
    !Object.values(VERIFIER_BEHAVIOR_PROOF_MODES).includes(target.proofMode)
  )
  const behaviorCoveredTargets = results.filter(target =>
    target.ok &&
    target.substringOnlyProofRejected === true &&
    Object.values(VERIFIER_BEHAVIOR_PROOF_MODES).includes(target.proofMode) &&
    Array.isArray(target.proofSymbols) &&
    target.proofSymbols.length > 0
  )
  return {
    ok: results.length >= VERIFIER_BEHAVIOR_SWEEP_MIN_TARGETS &&
      failingTargets.length === 0 &&
      substringOnlyTargets.length === 0 &&
      behaviorCoveredTargets.length === results.length,
    cardId: VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    closeoutKey: VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
    sprintId: FOUNDATION_CURRENT_SPRINT_ID,
    targets: results,
    failingTargets,
    substringOnlyTargets,
    summary: {
      targetCount: results.length,
      minTargetCount: VERIFIER_BEHAVIOR_SWEEP_MIN_TARGETS,
      behaviorCoveredTargetCount: behaviorCoveredTargets.length,
      failingTargetCount: failingTargets.length,
      substringOnlyTargetCount: substringOnlyTargets.length,
      proofModes: Array.from(new Set(results.map(target => target.proofMode))).sort(),
    },
  }
}
