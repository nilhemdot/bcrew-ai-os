import {
  CLOSEOUT_OWNERSHIP_GUARD_CARD_ID,
  buildSyntheticBuildLogCloseoutValidationProof,
  buildSyntheticBuildLogOwnershipProof,
  getFoundationBuildCloseoutValidation,
} from './foundation-build-log.js'
import {
  FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID,
  FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CLOSEOUT_KEY,
  FOUNDATION_BUILD_LOG_MONOLITH_SLICE_SCRIPT_PATH,
  buildSyntheticFoundationBuildLogRegistrySplitProof,
  evaluateFoundationBuildLogRegistrySplit,
} from './foundation-build-log-monolith-slice.js'
import {
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_APPROVAL_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_HANDOFF_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_PLAN_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SPRINT_ID,
  buildFoundationBuildCloseoutRegistrySplitDogfoodProof,
  evaluateFoundationBuildCloseoutRegistrySplit,
} from './foundation-build-closeout-registry-split.js'

export const VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_CARD_ID = 'VERIFIER-BUILD-LOG-REGISTRY-ASSURANCE-SPLIT-001'
export const VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_CLOSEOUT_KEY = 'verifier-build-log-registry-assurance-split-v1'
export const VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_PLAN_PATH = 'docs/process/verifier-build-log-registry-assurance-split-001-plan.md'
export const VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-BUILD-LOG-REGISTRY-ASSURANCE-SPLIT-001.json'
export const VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-build-log-registry-assurance-split-check.mjs'
export const VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-build-log-registry-assurance-split-closeout.md'
export const VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_BEFORE_LINES = 8632

const FOUNDATION_BUILD_LOG_MONOLITH_SLICE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'CLEANUP-003',
]

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function countTextLines(text = '') {
  return String(text || '').split('\n').length
}

function evaluateBuildLogRegistryAssuranceFixture(fixture = {}) {
  const findings = []
  if (fixture.buildLogMonolithSliceClosed !== true) findings.push('build_log_monolith_slice_hidden_failure')
  if (fixture.closeoutRegistrySplitClosed !== true) findings.push('closeout_registry_split_hidden_failure')
  if (fixture.closeoutOwnershipProofClean !== true) findings.push('closeout_ownership_proof_hidden_failure')
  if (fixture.closeoutValidationClean !== true) findings.push('closeout_validation_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_build_log_registry_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierBuildLogRegistryAssuranceDogfoodProof() {
  const healthy = evaluateBuildLogRegistryAssuranceFixture({
    buildLogMonolithSliceClosed: true,
    closeoutRegistrySplitClosed: true,
    closeoutOwnershipProofClean: true,
    closeoutValidationClean: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenBuildLogMonolithSlice: evaluateBuildLogRegistryAssuranceFixture({
      buildLogMonolithSliceClosed: false,
      closeoutRegistrySplitClosed: true,
      closeoutOwnershipProofClean: true,
      closeoutValidationClean: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenCloseoutRegistrySplit: evaluateBuildLogRegistryAssuranceFixture({
      buildLogMonolithSliceClosed: true,
      closeoutRegistrySplitClosed: false,
      closeoutOwnershipProofClean: true,
      closeoutValidationClean: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenCloseoutOwnershipProof: evaluateBuildLogRegistryAssuranceFixture({
      buildLogMonolithSliceClosed: true,
      closeoutRegistrySplitClosed: true,
      closeoutOwnershipProofClean: false,
      closeoutValidationClean: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenCloseoutValidation: evaluateBuildLogRegistryAssuranceFixture({
      buildLogMonolithSliceClosed: true,
      closeoutRegistrySplitClosed: true,
      closeoutOwnershipProofClean: true,
      closeoutValidationClean: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateBuildLogRegistryAssuranceFixture({
      buildLogMonolithSliceClosed: true,
      closeoutRegistrySplitClosed: true,
      closeoutOwnershipProofClean: true,
      closeoutValidationClean: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy build-log registry assurance fixture passes; monolith slice, registry split, ownership, validation, and old-inline failures fail closed'
      : 'build-log registry assurance dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierBuildLogRegistryAssurance(input = {}) {
  const {
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationBuildCloseoutControlPlaneRecordsSource,
    foundationBuildCloseoutRecordsSource,
    foundationBuildCloseoutRegistrySplitCloseout,
    foundationBuildCloseouts,
    foundationBuildLog,
    foundationBuildLogBehaviorSource,
    foundationBuildLogMonolithSliceCloseout,
    foundationBuildLogRegistrySource,
    foundationHub,
    foundationVerifierBuildLogRegistryAssuranceSource,
    foundationVerifySource,
    packageJson,
    readRepoFile,
    repoFileExists,
  } = input
  const checks = []
  const readSource = typeof readRepoFile === 'function' ? readRepoFile : async () => ''
  const [
    foundationBuildCloseoutRegistrySplitSource,
    foundationBuildCloseoutRegistrySplitScriptSource,
    foundationBuildCloseoutRegistrySplitPlanSource,
    foundationBuildLogMonolithSliceSource,
    foundationBuildLogMonolithSliceScriptSource,
  ] = await Promise.all([
    readSource('lib/foundation-build-closeout-registry-split.js'),
    readSource(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH),
    readSource(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_PLAN_PATH),
    readSource('lib/foundation-build-log-monolith-slice.js'),
    readSource(FOUNDATION_BUILD_LOG_MONOLITH_SLICE_SCRIPT_PATH),
  ])
  const buildLogRegistryDelegationSource = [foundationVerifySource, foundationVerifierBuildLogRegistryAssuranceSource].filter(Boolean).join('\n')

  const foundationBuildLogMonolithSliceCard = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID) || null
  const closeoutOwnershipGuardCard = (foundationHub.backlogItems || []).find(item => item.id === CLOSEOUT_OWNERSHIP_GUARD_CARD_ID) || null
  const foundationBuildLogValidation = getFoundationBuildCloseoutValidation()
  const foundationBuildLogOwnershipProof = buildSyntheticBuildLogOwnershipProof()
  const foundationBuildLogCloseoutValidationProof = buildSyntheticBuildLogCloseoutValidationProof()
  const foundationBuildLogSplitProof = buildSyntheticFoundationBuildLogRegistrySplitProof()
  const foundationBuildLogSplitEvaluation = evaluateFoundationBuildLogRegistrySplit({
    behaviorLineCount: countTextLines(foundationBuildLogBehaviorSource),
    recordLineCount: countTextLines(foundationBuildCloseoutRecordsSource),
    closeoutCount: foundationBuildLogValidation.closeoutCount,
    invalidCloseoutCount: (foundationBuildLogValidation.invalidCloseoutKeys || []).length,
    behaviorImportsRecords: foundationBuildLogBehaviorSource.includes('./foundation-build-closeout-records.js') ||
      foundationBuildLogBehaviorSource.includes('./build-closeout-data-source.js'),
    behaviorEmbedsRecords: foundationBuildLogBehaviorSource.includes('const closeoutRecords = [') || foundationBuildLogBehaviorSource.includes('export const closeoutRecords = ['),
    recordsExportCloseouts: foundationBuildCloseoutRecordsSource.includes('export const closeoutRecords = ['),
    recordsEmbedBehavior: foundationBuildCloseoutRecordsSource.includes('function normalizeList') || foundationBuildCloseoutRecordsSource.includes('export function'),
    ownershipProofOk: foundationBuildLogOwnershipProof.ok === true,
  })
  ensure(
    checks,
      foundationBuildLogMonolithSliceCard &&
      ['scoped', 'done'].includes(foundationBuildLogMonolithSliceCard.lane) &&
      foundationBuildLogMonolithSliceCloseout?.operatorCloseout === true &&
      (foundationBuildLogMonolithSliceCloseout.backlogIds || []).includes(FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID) &&
      foundationBuildLogSplitEvaluation.ok === true &&
      foundationBuildLogSplitProof.ok === true &&
      foundationBuildLogSplitProof.unsplit?.ok === false &&
      foundationBuildLogSplitProof.split?.ok === true &&
      foundationBuildLogOwnershipProof.ok === true &&
      foundationBuildLogCloseoutValidationProof.ok === true &&
      (foundationBuildLogValidation.invalidCloseoutKeys || []).length === 0 &&
      (foundationBuildLogValidation.ownershipOverlapViolations || []).length === 0 &&
      packageJson.scripts?.['process:foundation-build-log-monolith-slice-check'] === `node --env-file-if-exists=.env ${FOUNDATION_BUILD_LOG_MONOLITH_SLICE_SCRIPT_PATH}` &&
      (foundationBuildLogBehaviorSource.includes('./foundation-build-closeout-records.js') ||
        foundationBuildLogBehaviorSource.includes('./build-closeout-data-source.js')) &&
      foundationBuildLogBehaviorSource.includes('export { FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION }') &&
      foundationBuildCloseoutRecordsSource.includes('export const closeoutRecords = [') &&
      foundationBuildLogMonolithSliceSource.includes('buildSyntheticFoundationBuildLogRegistrySplitProof') &&
      foundationBuildLogMonolithSliceScriptSource.includes('dogfood proof rejects unsplit oversized build-log') &&
      includesAll(buildLogRegistryDelegationSource, FOUNDATION_BUILD_LOG_MONOLITH_SLICE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'CLEANUP-003 splits Foundation build-log closeout registry from behavior module',
    foundationBuildLogMonolithSliceCard
      ? `lane=${foundationBuildLogMonolithSliceCard.lane} behaviorLines=${foundationBuildLogSplitEvaluation.summary.behaviorLineCount} recordLines=${foundationBuildLogSplitEvaluation.summary.recordLineCount} closeout=${foundationBuildLogMonolithSliceCloseout?.key || 'missing'}`
      : `missing ${FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID}`,
  )

  const foundationBuildCloseoutRegistrySplitCard = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID) || null
  const foundationBuildCloseoutRegistrySplitDogfood = buildFoundationBuildCloseoutRegistrySplitDogfoodProof()
  const foundationBuildCloseoutRegistrySplitBuildLogVisible = [
    ...(foundationBuildLog.builds || []),
    ...(foundationBuildLog.closeouts || []),
  ].some(entry =>
    (entry.closeoutKey || entry.key) === 'foundation-surface-sweep-v1' &&
      (entry.backlogIds || []).includes('FOUNDATION-SWEEP-001')
  )
  const foundationBuildCloseoutRegistrySplitEvaluation = evaluateFoundationBuildCloseoutRegistrySplit({
    afterRecords: foundationBuildCloseouts,
    mainSource: foundationBuildCloseoutRecordsSource,
    controlPlaneSource: foundationBuildCloseoutControlPlaneRecordsSource,
    registrySource: foundationBuildLogRegistrySource,
    validation: foundationBuildLogValidation,
    buildLogSweepVisible: foundationBuildCloseoutRegistrySplitBuildLogVisible,
    packageScript: packageJson.scripts?.['process:foundation-build-closeout-registry-split-check'] || '',
  })
  ensure(
    checks,
      foundationBuildCloseoutRegistrySplitCard &&
      ['executing', 'done'].includes(foundationBuildCloseoutRegistrySplitCard.lane) &&
      foundationBuildCloseoutRegistrySplitCloseout?.operatorCloseout === true &&
      (foundationBuildCloseoutRegistrySplitCloseout.backlogIds || []).includes(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID) &&
      foundationBuildCloseoutRegistrySplitDogfood.ok === true &&
      foundationBuildCloseoutRegistrySplitEvaluation.ok === true &&
      foundationBuildCloseoutRecordsSource.includes('...controlPlaneCloseoutRecords') &&
      foundationBuildLogRegistrySource.includes('source-outage-boundary-v1') &&
      foundationBuildLogRegistrySource.includes(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY) &&
      foundationBuildCloseoutRegistrySplitBuildLogVisible === true &&
      countTextLines(foundationBuildCloseoutRecordsSource) < 5000 &&
      packageJson.scripts?.['process:foundation-build-closeout-registry-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_HANDOFF_PATH) &&
      foundationBuildCloseoutRegistrySplitSource.includes('buildFoundationBuildCloseoutRegistrySplitDogfoodProof') &&
      foundationBuildCloseoutRegistrySplitScriptSource.includes('dogfood rejects missing-record') &&
      foundationBuildCloseoutRegistrySplitPlanSource.includes('Repair path') &&
      (activeFoundationSprint.sprint?.sprintId === FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SPRINT_ID ||
        foundationBuildCloseoutRegistrySplitCard.lane === 'done' ||
        activeSprintAtOrPast([FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID])),
    'FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001 splits closeout registry below the architecture-risk line without dropping records',
    foundationBuildCloseoutRegistrySplitCard
      ? `lane=${foundationBuildCloseoutRegistrySplitCard.lane} lines=${countTextLines(foundationBuildCloseoutRecordsSource)} dogfood=${foundationBuildCloseoutRegistrySplitDogfood.ok ? 'pass' : 'blocked'} sweepVisible=${foundationBuildCloseoutRegistrySplitBuildLogVisible ? 'yes' : 'no'}`
      : `missing ${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID}`,
  )

  const verifierBuildLogRegistryAssuranceCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_CARD_ID) || null
  const verifierBuildLogRegistryAssuranceCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_CLOSEOUT_KEY) || null
  const verifierBuildLogRegistryAssuranceDogfood = buildFoundationVerifierBuildLogRegistryAssuranceDogfoodProof()
  const foundationVerifyLineCountAfterBuildLogRegistryAssurance = String(foundationVerifySource || '').split('\n').length
  const oldBuildLogRegistryInlineMarkers = [
    'const foundationBuild' + 'LogMonolithSliceCard =',
    'const foundationBuild' + 'CloseoutRegistrySplitCard =',
    'const foundationBuild' + 'LogSplitEvaluation =',
  ]
  ensure(
    checks,
    verifierBuildLogRegistryAssuranceCard &&
      ['executing', 'done'].includes(verifierBuildLogRegistryAssuranceCard.lane) &&
      String(verifierBuildLogRegistryAssuranceCard.statusNote || '').includes(VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_CLOSEOUT_KEY) &&
      verifierBuildLogRegistryAssuranceCloseout?.operatorCloseout === true &&
      (verifierBuildLogRegistryAssuranceCloseout.backlogIds || []).includes(VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_CARD_ID) &&
      verifierBuildLogRegistryAssuranceDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-build-log-registry-assurance-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_HANDOFF_PATH) &&
      buildLogRegistryDelegationSource.includes('evaluateFoundationVerifierBuildLogRegistryAssurance({') &&
      buildLogRegistryDelegationSource.includes('buildLogRegistryAssuranceVerifier.checks') &&
      oldBuildLogRegistryInlineMarkers.every(marker => !foundationVerifySource.includes(marker)) &&
      foundationVerifyLineCountAfterBuildLogRegistryAssurance < VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_BEFORE_LINES &&
      foundationVerifierBuildLogRegistryAssuranceSource.includes(VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_CARD_ID) &&
      foundationVerifierBuildLogRegistryAssuranceSource.includes(FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID) &&
      foundationVerifierBuildLogRegistryAssuranceSource.includes(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID),
    'VERIFIER-BUILD-LOG-REGISTRY-ASSURANCE-SPLIT-001 extracts build-log registry assurance checks into a focused module',
    verifierBuildLogRegistryAssuranceCard
      ? `lane=${verifierBuildLogRegistryAssuranceCard.lane} dogfood=${verifierBuildLogRegistryAssuranceDogfood.ok ? 'pass' : 'blocked'} lines=${VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_BEFORE_LINES}->${foundationVerifyLineCountAfterBuildLogRegistryAssurance}`
      : `missing ${VERIFIER_BUILD_LOG_REGISTRY_ASSURANCE_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    artifacts: {
      closeoutOwnershipGuardCard,
      foundationBuildLogCloseoutValidationProof,
      foundationBuildLogValidation,
    },
  }
}
