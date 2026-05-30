export const BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_CARD_ID = 'BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001'
export const BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_CLOSEOUT_KEY = 'build-lane-verifier-snapshot-wiring-repair-v1'
export const BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_PLAN_PATH = 'docs/process/build-lane-verifier-snapshot-wiring-repair-001-plan.md'
export const BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_APPROVAL_PATH = 'docs/process/approvals/BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001.json'
export const BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_SCRIPT_PATH = 'scripts/process-build-lane-verifier-snapshot-wiring-repair-check.mjs'
export const BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-build-lane-verifier-snapshot-wiring-repair-closeout.md'
export const BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_SPRINT_ID = 'build-lane-verifier-snapshot-wiring-repair-2026-05-18'

export const SNAPSHOT_WIRING_FAILURE_CLASSIFICATIONS = [
  ['source crawl ledger is run-id, lease-owner, and item-key safe', 'stale_snapshot_baseline_wiring'],
  ['INTEL-JOBS-001 intelligence job ledger is schema-backed and wired into governed extraction', 'stale_snapshot_baseline_wiring'],
  ['INTEL-ATOM-001 stores governed report artifacts, atoms, hits, and Scoper-queryable proof', 'stale_snapshot_baseline_wiring'],
  ['RETRIEVAL-001 promotes real candidates into atom-backed lexical chunks with tier guard', 'stale_snapshot_baseline_wiring'],
  ['SYNTHESIS-FACTS-001 persists source-backed facts and hybrid evidence for governed synthesis', 'stale_snapshot_baseline_wiring'],
  ['SYNTHESIS-ENGINE-001 clusters and classifies synthesized items instead of atom-thread spam', 'stale_snapshot_baseline_wiring'],
  ['ACTION-ROUTER-001 creates approval-gated routes with owner and provenance before Strategy Hub resumes', 'approval_bound_side_effect'],
  ['Drive content extraction target supports governed Docs/Sheets/PDF/text/markdown/OCR/link inventory', 'stale_snapshot_baseline_wiring'],
  ['Gmail attachment extraction target is governed and source-ledgered', 'stale_snapshot_baseline_wiring'],
  ['video content extraction target is governed and source-ledgered', 'stale_snapshot_baseline_wiring'],
  ['shared-comms processing selector is content-hash scoped', 'stale_snapshot_baseline_wiring'],
  ['Foundation worker startup code matches current repo HEAD', 'real_runtime_system_health'],
  ['Strategy Hub v2 renders source-to-gap and route review while advisor remains offline', 'approval_bound_side_effect'],
  ['agent onboarding feedback form is source-backed and replay-hardened', 'stale_snapshot_baseline_wiring'],
  ['AGENT-FEEDBACK-SEND-001 builds Stage 1 send infrastructure with dry-run proof only', 'approval_bound_side_effect'],
  ['AGENT-FEEDBACK-REMINDER-CADENCE-001 remains the proven reminder cadence foundation', 'approval_bound_side_effect'],
  ['AGENT-FEEDBACK-LIVE-REMINDERS-001 live reminders are enabled and visible', 'approval_bound_side_effect'],
  ['SYSTEM-010-GHOST-CLOSEOUT-001 closes runtime/process-control readiness blocker', 'stale_snapshot_baseline_wiring'],
  ['RUNTIME-SUPERVISOR-001 exposes dashboard/worker service supervision without claiming auto-restart', 'real_runtime_system_health'],
]

const SPLIT_SUMMARY_FAILURE_PREFIXES = [
  'VERIFIER-CORE-GOVERNANCE-',
  'VERIFIER-INTELLIGENCE-SPINE-',
  'VERIFIER-EXTRACTION-RUNTIME-',
  'VERIFIER-SURFACE-TRUST-',
  'VERIFIER-AGENT-FEEDBACK-',
  'VERIFIER-CONTROL-LOOP-',
  'VERIFIER-RUNTIME-RELIABILITY-',
]

function uniqueJoin(parts = []) {
  const seen = new Set()
  return parts
    .map(part => String(part || ''))
    .filter(Boolean)
    .filter(part => {
      const key = part.slice(0, 120)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join('\n')
}

export function buildFoundationVerifierSourceBundle(input = {}) {
  const foundationDbVerifierSource = uniqueJoin([
    input.foundationDbSource,
    input.foundationDbCoreSource,
    input.foundationDbSessionSource,
    input.foundationBacklogSprintDbSource,
    input.foundationSourceCrawlDbSource,
    input.foundationRuntimeJobsDbSource,
    input.foundationPeopleSalesDbSource,
    input.foundationStrategyDocsDbSource,
    input.foundationIntelligenceDbSource,
    input.foundationSharedCommsDbSource,
    input.foundationDbSchemaSeedStoreSource,
    input.foundationBacklogStoreSource,
    input.foundationDecisionStoreSource,
    input.foundationCoreSeedSource,
    input.foundationStrategySourceSnapshotSource,
    input.foundationStrategyOperatingTruthSource,
    input.foundationStrategyGoalTruthSource,
    input.foundationFubLeadSourceStoreSource,
    input.foundationSharedCommsStoreSource,
    input.foundationSourceCrawlStoreSource,
    input.foundationDriveMeetingVaultStoreSource,
    input.foundationAgentFeedbackStoreSource,
    input.foundationRuntimeJobStoreSource,
    input.foundationLlmRuntimeStoreSource,
    input.foundationSalesListingStoreSource,
    input.intelligenceAtomsSource,
    input.intelligenceRetrievalSource,
    input.intelligenceSynthesisFactsSource,
    input.intelligenceSynthesisSource,
    input.intelligenceActionRouterSource,
  ])

  return {
    foundationDbVerifierSource,
    foundationDbWithBacklogSeedSource: uniqueJoin([
      foundationDbVerifierSource,
      input.foundationBacklogSeedSource,
    ]),
    sourceCrawlStoreOwnershipSource: uniqueJoin([
      foundationDbVerifierSource,
      input.foundationSourceCrawlStoreSource,
    ]),
    driveMeetingVaultStoreOwnershipSource: uniqueJoin([
      foundationDbVerifierSource,
      input.foundationDriveMeetingVaultStoreSource,
    ]),
    agentFeedbackStoreOwnershipSource: uniqueJoin([
      foundationDbVerifierSource,
      input.foundationAgentFeedbackStoreSource,
    ]),
  }
}

export function classifyFoundationVerifyFailure(failure = {}) {
  const check = String(failure.check || failure.checkName || '')
  if (SPLIT_SUMMARY_FAILURE_PREFIXES.some(prefix => check.startsWith(prefix))) {
    return {
      check,
      classification: 'stale_snapshot_baseline_wiring',
      reason: 'summary check is red because a domain verifier row is red',
    }
  }
  const exact = SNAPSHOT_WIRING_FAILURE_CLASSIFICATIONS.find(([name]) => name === check)
  if (exact) {
    return {
      check,
      classification: exact[1],
      reason: exact[1] === 'approval_bound_side_effect'
        ? 'live approval/pending state must be explicit instead of treated as broken'
        : exact[1] === 'real_runtime_system_health'
          ? 'local runtime/service state must be repaired or marked blocked'
          : 'verifier source snapshot expected the old root DB file shape',
    }
  }
  return {
    check,
    classification: 'unknown',
    reason: 'no classification rule exists for this verifier row',
  }
}

export function classifyFoundationVerifyFailures(failures = []) {
  const rows = failures.map(failure => classifyFoundationVerifyFailure(failure))
  const summary = rows.reduce((acc, row) => {
    acc[row.classification] = (acc[row.classification] || 0) + 1
    return acc
  }, {})
  return {
    ok: rows.length > 0 && !rows.some(row => row.classification === 'unknown'),
    rows,
    summary,
  }
}

const DOGFOOD_FAILURES = [
  { check: 'source crawl ledger is run-id, lease-owner, and item-key safe' },
  { check: 'VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001 extracts core governance/security verifier checks into a focused module' },
  { check: 'INTEL-JOBS-001 intelligence job ledger is schema-backed and wired into governed extraction' },
  { check: 'ACTION-ROUTER-001 creates approval-gated routes with owner and provenance before Strategy Hub resumes' },
  { check: 'Drive content extraction target supports governed Docs/Sheets/PDF/text/markdown/OCR/link inventory' },
  { check: 'Foundation worker startup code matches current repo HEAD' },
  { check: 'Strategy Hub v2 renders source-to-gap and route review while advisor remains offline' },
  { check: 'agent onboarding feedback form is source-backed and replay-hardened' },
  { check: 'AGENT-FEEDBACK-LIVE-REMINDERS-001 live reminders are enabled and visible' },
  { check: 'SYSTEM-010-GHOST-CLOSEOUT-001 closes runtime/process-control readiness blocker' },
  { check: 'RUNTIME-SUPERVISOR-001 exposes dashboard/worker service supervision without claiming auto-restart' },
]

export function buildVerifierSnapshotWiringDogfoodProof(input = {}) {
  const bundle = buildFoundationVerifierSourceBundle(input)
  const staleRootOnlyBundle = buildFoundationVerifierSourceBundle({
    foundationDbSource: input.foundationDbSource,
    foundationSourceCrawlStoreSource: input.foundationSourceCrawlStoreSource,
    foundationAgentFeedbackStoreSource: input.foundationAgentFeedbackStoreSource,
  })
  const classification = classifyFoundationVerifyFailures(DOGFOOD_FAILURES)
  const requiredDbTokens = [
    'CREATE TABLE IF NOT EXISTS source_crawl_target_runs',
    'CREATE TABLE IF NOT EXISTS intelligence_job_runs',
    'CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_responses',
    'idx_agent_feedback_active_send_once',
    'idx_agent_feedback_reminder_slot_once',
    'artifact_content_hash',
    'getStrategyPreworkCoverageSnapshot',
  ]
  const aggregateHasTokens = requiredDbTokens.every(token => bundle.foundationDbVerifierSource.includes(token))
  const staleRootMissesSchemaTokens = [
    'CREATE TABLE IF NOT EXISTS source_crawl_target_runs',
    'CREATE TABLE IF NOT EXISTS intelligence_job_runs',
    'CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_responses',
    'idx_agent_feedback_active_send_once',
    'idx_agent_feedback_reminder_slot_once',
  ].some(token => !staleRootOnlyBundle.foundationDbVerifierSource.includes(token))
  const rootUsesBundle = String(input.foundationVerifySource || '').includes('buildFoundationVerifierSourceBundle') &&
    String(input.foundationVerifySource || '').includes('foundationDbVerifierSource') &&
    String(input.foundationVerifySource || '').includes('foundationDbWithBacklogSeedSource')
  return {
    ok: aggregateHasTokens &&
      staleRootMissesSchemaTokens &&
      classification.ok === true &&
      rootUsesBundle,
    aggregateHasTokens,
    staleRootMissesSchemaTokens,
    classification,
    requiredDbTokens,
    invariant: 'The real verifier source snapshot includes the split DB schema/seed/store modules; a root-only snapshot misses moved schema tokens; known verifier red rows classify as wiring, runtime, or approval-bound.',
  }
}
