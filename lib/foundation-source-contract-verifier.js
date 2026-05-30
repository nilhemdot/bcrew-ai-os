import {
  SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID,
  buildSourceContractRegistryTableDogfoodProof,
} from './source-contract-registry-table.js'
import {
  SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID,
  SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY,
  buildSourceIdScalarFkDogfoodProof,
  getSourceIdScalarFkMigrationSnapshot,
} from './source-id-scalar-fk-migration.js'
import {
  SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID,
  SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CLOSEOUT_KEY,
  buildSourceIdArrayProvenanceDesignDogfoodProof,
  evaluateSourceIdArrayProvenanceDesign,
} from './source-id-array-provenance-design.js'
import {
  getExtractionControlSnapshot,
  getSourceContractRegistrySnapshot,
} from './foundation-source-crawl-db.js'
import {
  SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID,
  buildSourceContractValidationLayerDogfoodProof,
  evaluateSourceContractValidationLayer,
} from './source-contract-validation-layer.js'
import {
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
  buildMarketingMeasurementSourceContractsDogfoodProof,
  evaluateMarketingMeasurementSourceContracts,
} from './marketing-measurement-source-contracts.js'

export const VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID = 'VERIFIER-MONOLITH-SPLIT-CONTINUE-002'
export const VERIFIER_SOURCE_CONTRACT_MODULE_CLOSEOUT_KEY = 'verifier-source-contracts-module-v1'
export const VERIFIER_SOURCE_CONTRACT_MODULE_PLAN_PATH = 'docs/process/verifier-source-contracts-module-001-plan.md'
export const VERIFIER_SOURCE_CONTRACT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-002.json'
export const VERIFIER_SOURCE_CONTRACT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-source-contracts-module-check.mjs'
export const VERIFIER_SOURCE_CONTRACT_MODULE_SPRINT_ID = 'verifier-source-contracts-module-2026-05-15'
export const VERIFIER_SOURCE_CONTRACT_MODULE_BEFORE_LINES = 15732
export const VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001'
export const VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-source-contract-orchestration-split-v1'
export const VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-source-contract-orchestration-split-001-plan.md'
export const VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-source-contract-orchestration-split-check.mjs'
export const VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-source-contract-orchestration-split-closeout.md'
export const VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_BEFORE_LINES = 5832

const REQUIRED_OWNERS_TABS = [
  'Split Cal',
  'Agent Splits',
  'Listings and Conditional Deals',
  'Sales & Deposit',
  'Goal & KPI Calculator',
  'CI Report',
]

const REQUIRED_FINANCE_TABS = [
  'Monthly Budget',
  'Budget Original',
  'Monthly Actuals (Roll Up)',
  'Annual Actuals (Roll Up)',
  'Annual Budget (Roll Up)',
  'Unspent -L3M + Actual Helper',
]

function findSourceById(sources = [], sourceId) {
  return (sources || []).find(source => source.sourceId === sourceId || source.id === sourceId) || null
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function countTextLines(source = '') {
  return String(source || '').split('\n').length
}

function findBacklogCard(backlogItems = [], cardId = '') {
  return (backlogItems || []).find(item => item.id === cardId) || null
}

function findCloseout(closeouts = [], closeoutKey = '') {
  return (closeouts || []).find(record => record.key === closeoutKey) || null
}

export function evaluateFoundationSourceContractVerifier({
  sourceContracts = [],
  sourceRegistry = '',
  currentState = '',
  sourceContractRegistrySnapshot = null,
  sourceContractRegistryDogfood = null,
  sourceIdScalarFkMigrationSnapshot = null,
  sourceIdScalarFkDogfood = null,
  sourceIdArrayProvenanceDesign = null,
  sourceIdArrayProvenanceDogfood = null,
  sourceContractValidationLayer = null,
  sourceContractValidationLayerDogfood = null,
  marketingMeasurementSourceContracts = null,
  marketingMeasurementSourceContractsDogfood = null,
} = {}) {
  const checks = []
  const ownersContract = findSourceById(sourceContracts, 'SRC-OWNERS-001')
  const financeContract = findSourceById(sourceContracts, 'SRC-FINANCE-001')
  const freedomCommunityContract = findSourceById(sourceContracts, 'SRC-FREEDOM-COMMUNITY-001')

  addCheck(
    checks,
    ownersContract?.status === 'Signed Off' && ownersContract?.validation === 'Signed Off',
    'source contracts: SRC-OWNERS-001 is signed off',
    ownersContract ? `${ownersContract.status} / ${ownersContract.validation}` : 'missing',
  )
  addCheck(
    checks,
    financeContract?.status === 'Current reality captured' && financeContract?.validation === 'Signed Off For Current Reality',
    'source contracts: SRC-FINANCE-001 is signed off for current reality',
    financeContract ? `${financeContract.status} / ${financeContract.validation}` : 'missing',
  )
  addCheck(
    checks,
    REQUIRED_OWNERS_TABS.every(tab => ownersContract?.signedOffTabs?.includes(tab)),
    'source contracts: SRC-OWNERS-001 exposes signed-off tab coverage',
    ownersContract?.signedOffTabs?.join(', ') || 'missing',
  )
  addCheck(
    checks,
    REQUIRED_FINANCE_TABS.every(tab => financeContract?.signedOffTabs?.includes(tab)),
    'source contracts: SRC-FINANCE-001 exposes signed-off finance tab coverage',
    financeContract?.signedOffTabs?.join(', ') || 'missing',
  )
  addCheck(
    checks,
    ownersContract?.verifiedNonSourceTabs?.some(item => item.name === 'Lists' && /IMPORTRANGE/.test(item.reason || '') && /SRC-OWNERS-LISTS-001/.test(item.reason || '')),
    'source contracts: Owners Lists mirror explains non-source sign-off boundary',
    JSON.stringify(ownersContract?.verifiedNonSourceTabs || []),
  )
  addCheck(
    checks,
    freedomCommunityContract?.signedOffTabs?.includes('Data Entry - BCrew Team/Community · G:O Community tracker'),
    'source contracts: Freedom units expose signed-off range coverage',
    freedomCommunityContract?.signedOffTabs?.join(', ') || 'missing',
  )
  addCheck(
    checks,
    includesAll(sourceRegistry, ['### Signed Off Validation Units', '`SRC-OWNERS-001`', 'Signed Off | 2026-04-16']),
    'docs/source-registry.md reflects Owners sign-off',
    'signed-off unit and dated table row present',
  )
  addCheck(
    checks,
    includesAll(sourceRegistry, ['`SRC-FINANCE-001`', 'Signed Off For Current Reality | 2026-04-20']),
    'docs/source-registry.md reflects finance current-reality sign-off',
    'finance row present with current-reality signoff status',
  )
  addCheck(
    checks,
    includesAll(sourceRegistry, ['### Freedom Sheet Signed-Off Range Coverage', 'Data Entry - BCrew Team/Community · G:O Community tracker', 'Benson Crew Bhag Builder']),
    'docs/source-registry.md reflects Freedom signed-off range coverage',
    'Freedom range coverage section present',
  )
  addCheck(
    checks,
    includesAll(sourceRegistry, ['### Owners Dashboard Signed-Off Tab Coverage', 'Split Cal', 'Annual Budget (Roll Up)', 'Unspent -L3M + Actual Helper', 'SRC-OWNERS-LISTS-001']),
    'docs/source-registry.md reflects Owners signed-off tab coverage',
    'Owners tab coverage section present',
  )
  addCheck(
    checks,
    includesAll(currentState, ['Unspent -L3M + Actual Helper', 'IMPORTRANGE', 'SRC-OWNERS-LISTS-001']),
    'docs/rebuild/current-state.md reflects helper and mirror source boundaries',
    'current state explains finance helper coverage and Owners Lists mirror boundary',
  )
  addCheck(
    checks,
    sourceContractRegistrySnapshot?.evaluation?.ok === true &&
      Number(sourceContractRegistrySnapshot.evaluation.summary?.expectedCount || 0) >= 30 &&
      sourceContractRegistryDogfood?.ok === true,
    `${SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID} materializes source contracts into DB registry`,
    sourceContractRegistrySnapshot?.evaluation?.summary
      ? `expected=${sourceContractRegistrySnapshot.evaluation.summary.expectedCount} active=${sourceContractRegistrySnapshot.evaluation.summary.activeCount} dogfood=${sourceContractRegistryDogfood?.ok ? 'pass' : 'blocked'}`
      : 'missing source contract registry snapshot',
  )
  addCheck(
    checks,
    sourceIdScalarFkMigrationSnapshot?.ok === true &&
      sourceIdScalarFkMigrationSnapshot?.constraints?.validatedCount === sourceIdScalarFkMigrationSnapshot?.constraints?.expectedCount &&
      sourceIdScalarFkMigrationSnapshot?.invalidReferenceCount === 0 &&
      sourceIdScalarFkMigrationSnapshot?.arrayConstraintRows?.length === 0 &&
      sourceIdScalarFkDogfood?.ok === true,
    `${SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID} enforces scalar source IDs through registry FKs`,
    sourceIdScalarFkMigrationSnapshot?.constraints
      ? `${SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY} / validated=${sourceIdScalarFkMigrationSnapshot.constraints.validatedCount}/${sourceIdScalarFkMigrationSnapshot.constraints.expectedCount} invalidRefs=${sourceIdScalarFkMigrationSnapshot.invalidReferenceCount || 0} dogfood=${sourceIdScalarFkDogfood?.ok ? 'pass' : 'blocked'}`
      : 'missing scalar FK migration snapshot',
  )
  addCheck(
    checks,
    sourceIdArrayProvenanceDesign?.ok === true &&
      sourceIdArrayProvenanceDesign?.mutationPosture === 'report_only' &&
      sourceIdArrayProvenanceDesign?.selectedRelationCount === 3 &&
      sourceIdArrayProvenanceDesign?.designRelationCount === 3 &&
      sourceIdArrayProvenanceDogfood?.ok === true,
    `${SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID} designs array-backed source provenance before schema mutation`,
    sourceIdArrayProvenanceDesign
      ? `${SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CLOSEOUT_KEY} / relations=${sourceIdArrayProvenanceDesign.designRelationCount}/${sourceIdArrayProvenanceDesign.expectedRelationCount} dogfood=${sourceIdArrayProvenanceDogfood?.ok ? 'pass' : 'blocked'}`
      : 'missing array provenance design proof',
  )
  addCheck(
    checks,
    sourceContractValidationLayer?.ok === true &&
      sourceContractValidationLayerDogfood?.ok === true &&
      Number(sourceContractValidationLayer?.summary?.contractCount || 0) >= 39 &&
      Number(sourceContractValidationLayer?.summary?.activeAuthRequiredExtractionTargetCount || 0) === 0,
    `${SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID} validates source contracts before connector/extractor work`,
    sourceContractValidationLayer?.summary
      ? `contracts=${sourceContractValidationLayer.summary.passed}/${sourceContractValidationLayer.summary.contractCount} blocked=${sourceContractValidationLayer.summary.blockedCount} authRequiredActiveTargets=${sourceContractValidationLayer.summary.activeAuthRequiredExtractionTargetCount} dogfood=${sourceContractValidationLayerDogfood?.ok ? 'pass' : 'blocked'}`
      : 'missing source contract validation-layer proof',
  )
  addCheck(
    checks,
    marketingMeasurementSourceContracts?.ok === true &&
      marketingMeasurementSourceContractsDogfood?.ok === true &&
      Number(marketingMeasurementSourceContracts?.summary?.blockedMarketingMeasurementRows || 0) === 3 &&
      Number(marketingMeasurementSourceContracts?.summary?.activeExtractionTargetCount || 0) === 0,
    `${MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID} registers GA4/GSC/GBP source contracts fail-closed`,
    marketingMeasurementSourceContracts?.summary
      ? `blockedRows=${marketingMeasurementSourceContracts.summary.blockedMarketingMeasurementRows} activeTargets=${marketingMeasurementSourceContracts.summary.activeExtractionTargetCount} dogfood=${marketingMeasurementSourceContractsDogfood?.ok ? 'pass' : 'blocked'}`
      : 'missing marketing measurement source-contract proof',
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
      sourceIds: ['SRC-OWNERS-001', 'SRC-FINANCE-001', 'SRC-FREEDOM-COMMUNITY-001'],
      sourceContractValidationLayer: sourceContractValidationLayer?.summary || null,
      marketingMeasurementSourceContracts: marketingMeasurementSourceContracts?.summary || null,
    },
  }
}

function buildHealthyContext(overrides = {}) {
  return {
    sourceContracts: [
      {
        sourceId: 'SRC-OWNERS-001',
        status: 'Signed Off',
        validation: 'Signed Off',
        signedOffTabs: REQUIRED_OWNERS_TABS,
        verifiedNonSourceTabs: [
          { name: 'Lists', reason: 'IMPORTRANGE mirror boundary is owned by SRC-OWNERS-LISTS-001' },
        ],
      },
      {
        sourceId: 'SRC-FINANCE-001',
        status: 'Current reality captured',
        validation: 'Signed Off For Current Reality',
        signedOffTabs: REQUIRED_FINANCE_TABS,
      },
      {
        sourceId: 'SRC-FREEDOM-COMMUNITY-001',
        signedOffTabs: ['Data Entry - BCrew Team/Community · G:O Community tracker'],
      },
    ],
    sourceRegistry: [
      '### Signed Off Validation Units',
      '`SRC-OWNERS-001`',
      'Signed Off | 2026-04-16',
      '`SRC-FINANCE-001`',
      'Signed Off For Current Reality | 2026-04-20',
      '### Freedom Sheet Signed-Off Range Coverage',
      'Data Entry - BCrew Team/Community · G:O Community tracker',
      'Benson Crew Bhag Builder',
      '### Owners Dashboard Signed-Off Tab Coverage',
      'Split Cal',
      'Annual Budget (Roll Up)',
      'Unspent -L3M + Actual Helper',
      'SRC-OWNERS-LISTS-001',
    ].join('\n'),
    currentState: 'Unspent -L3M + Actual Helper uses an IMPORTRANGE mirror owned by SRC-OWNERS-LISTS-001.',
    sourceContractRegistrySnapshot: {
      evaluation: {
        ok: true,
        summary: {
          expectedCount: 36,
          activeCount: 36,
        },
      },
    },
    sourceContractRegistryDogfood: { ok: true },
    sourceIdScalarFkMigrationSnapshot: {
      ok: true,
      invalidReferenceCount: 0,
      arrayConstraintRows: [],
      constraints: {
        expectedCount: 10,
        existingCount: 10,
        validatedCount: 10,
      },
    },
    sourceIdScalarFkDogfood: { ok: true },
    sourceIdArrayProvenanceDesign: {
      ok: true,
      mutationPosture: 'report_only',
      expectedRelationCount: 3,
      selectedRelationCount: 3,
      designRelationCount: 3,
    },
    sourceIdArrayProvenanceDogfood: { ok: true },
    sourceContractValidationLayer: {
      ok: true,
      summary: {
        contractCount: 39,
        passed: 39,
        blockedCount: 14,
        activeAuthRequiredExtractionTargetCount: 0,
      },
    },
    sourceContractValidationLayerDogfood: { ok: true },
    marketingMeasurementSourceContracts: {
      ok: true,
      summary: {
        blockedMarketingMeasurementRows: 3,
        activeExtractionTargetCount: 0,
      },
    },
    marketingMeasurementSourceContractsDogfood: { ok: true },
    ...overrides,
  }
}

export function buildFoundationSourceContractVerifierDogfoodProof() {
  const healthy = evaluateFoundationSourceContractVerifier(buildHealthyContext())
  const missingOwnersSignoff = evaluateFoundationSourceContractVerifier(buildHealthyContext({
    sourceContracts: buildHealthyContext().sourceContracts.map(source =>
      source.sourceId === 'SRC-OWNERS-001' ? { ...source, status: 'Draft' } : source
    ),
  }))
  const missingOwnersTab = evaluateFoundationSourceContractVerifier(buildHealthyContext({
    sourceContracts: buildHealthyContext().sourceContracts.map(source =>
      source.sourceId === 'SRC-OWNERS-001'
        ? { ...source, signedOffTabs: REQUIRED_OWNERS_TABS.filter(tab => tab !== 'CI Report') }
        : source
    ),
  }))
  const missingRegistryRow = evaluateFoundationSourceContractVerifier(buildHealthyContext({
    sourceRegistry: buildHealthyContext().sourceRegistry.replace('Signed Off | 2026-04-16', 'Needs Review'),
  }))
  const staleCurrentState = evaluateFoundationSourceContractVerifier(buildHealthyContext({
    currentState: 'Unspent helper exists but no mirror boundary is named.',
  }))
  const missingSourceContractRegistry = evaluateFoundationSourceContractVerifier(buildHealthyContext({
    sourceContractRegistrySnapshot: null,
    sourceContractRegistryDogfood: { ok: false },
  }))
  const missingScalarFkMigration = evaluateFoundationSourceContractVerifier(buildHealthyContext({
    sourceIdScalarFkMigrationSnapshot: {
      ok: false,
      invalidReferenceCount: 0,
      arrayConstraintRows: [],
      constraints: {
        expectedCount: 10,
        existingCount: 9,
        validatedCount: 9,
      },
    },
  }))
  const missingArrayProvenanceDesign = evaluateFoundationSourceContractVerifier(buildHealthyContext({
    sourceIdArrayProvenanceDesign: {
      ok: false,
      mutationPosture: 'report_only',
      expectedRelationCount: 3,
      selectedRelationCount: 3,
      designRelationCount: 2,
    },
    sourceIdArrayProvenanceDogfood: { ok: false },
  }))
  const missingValidationLayer = evaluateFoundationSourceContractVerifier(buildHealthyContext({
    sourceContractValidationLayer: {
      ok: false,
      summary: {
        contractCount: 39,
        passed: 38,
        blockedCount: 14,
        activeAuthRequiredExtractionTargetCount: 1,
      },
    },
    sourceContractValidationLayerDogfood: { ok: false },
  }))
  const missingMarketingMeasurementSourceContracts = evaluateFoundationSourceContractVerifier(buildHealthyContext({
    marketingMeasurementSourceContracts: null,
    marketingMeasurementSourceContractsDogfood: { ok: false },
  }))

  return {
    ok: healthy.ok === true &&
      missingOwnersSignoff.ok === false &&
      missingOwnersTab.ok === false &&
      missingRegistryRow.ok === false &&
      staleCurrentState.ok === false &&
      missingSourceContractRegistry.ok === false &&
      missingScalarFkMigration.ok === false &&
      missingArrayProvenanceDesign.ok === false &&
      missingValidationLayer.ok === false &&
      missingMarketingMeasurementSourceContracts.ok === false,
    healthy,
    missingOwnersSignoff,
    missingOwnersTab,
    missingRegistryRow,
    staleCurrentState,
    missingSourceContractRegistry,
    missingScalarFkMigration,
    missingArrayProvenanceDesign,
    missingValidationLayer,
    missingMarketingMeasurementSourceContracts,
    invariant: 'The source-contract verifier accepts signed-off source truth and rejects missing signoff, missing tab coverage, stale registry rows, stale current-state mirror boundaries, missing DB source-contract registry proof, missing scalar source-ID FK enforcement, missing array source-ID provenance design, missing source-contract validation-layer proof, and missing marketing measurement source-contract proof.',
  }
}

function evaluateSourceContractOrchestrationFixture(fixture = {}) {
  const findings = []
  if (fixture.moduleOwnsWrapper !== true) findings.push('module_wrapper_missing')
  if (fixture.rootDelegatesThroughWrapper !== true) findings.push('root_delegation_missing')
  if (fixture.oldDirectRootCallRemoved !== true) findings.push('old_direct_root_source_contract_call_present')
  if (fixture.registryAndSourceIdDogfoodOwnedByModule !== true) findings.push('registry_source_id_dogfood_still_root_owned')
  if (fixture.closeoutRegistered !== true) findings.push('orchestration_closeout_missing')
  if (fixture.focusedProofRegistered !== true) findings.push('focused_proof_not_registered')
  if (fixture.lineCountDecreased !== true) findings.push('root_line_count_not_reduced')
  return {
    ok: findings.length === 0,
    findings,
  }
}

export function buildFoundationSourceContractOrchestrationSplitDogfoodProof() {
  const healthy = evaluateSourceContractOrchestrationFixture({
    moduleOwnsWrapper: true,
    rootDelegatesThroughWrapper: true,
    oldDirectRootCallRemoved: true,
    registryAndSourceIdDogfoodOwnedByModule: true,
    closeoutRegistered: true,
    focusedProofRegistered: true,
    lineCountDecreased: true,
  })
  const rejected = {
    missingWrapper: evaluateSourceContractOrchestrationFixture({
      moduleOwnsWrapper: false,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: true,
      registryAndSourceIdDogfoodOwnedByModule: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    missingDelegation: evaluateSourceContractOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: false,
      oldDirectRootCallRemoved: true,
      registryAndSourceIdDogfoodOwnedByModule: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    oldDirectRootCall: evaluateSourceContractOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: false,
      registryAndSourceIdDogfoodOwnedByModule: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    rootOwnedRegistryDogfood: evaluateSourceContractOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: true,
      registryAndSourceIdDogfoodOwnedByModule: false,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    missingCloseout: evaluateSourceContractOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: true,
      registryAndSourceIdDogfoodOwnedByModule: true,
      closeoutRegistered: false,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    missingProofRegistration: evaluateSourceContractOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: true,
      registryAndSourceIdDogfoodOwnedByModule: true,
      closeoutRegistered: true,
      focusedProofRegistered: false,
      lineCountDecreased: true,
    }),
    noLineDrop: evaluateSourceContractOrchestrationFixture({
      moduleOwnsWrapper: true,
      rootDelegatesThroughWrapper: true,
      oldDirectRootCallRemoved: true,
      registryAndSourceIdDogfoodOwnedByModule: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: false,
    }),
  }
  return {
    ok: healthy.ok === true && Object.values(rejected).every(result => result.ok === false),
    healthy,
    rejected,
    invariant: 'Source Contract orchestration split accepts a wrapper-owned registry/source-ID dogfood handoff and rejects missing wrapper, missing delegation, old direct root call, root-owned registry dogfood, missing closeout, missing focused proof registration, and no root line-count reduction.',
  }
}

export async function evaluateFoundationSourceContractVerifierOrchestration(input = {}) {
  const {
    sourceContracts = [],
    sourceRegistry = '',
    currentState = '',
    foundationHub = {},
    foundationBuildCloseouts = [],
    packageJson = {},
    repoFileExists = async () => false,
    foundationSourceContractVerifierSource = '',
    foundationVerifyRootSource = input.foundationVerifySource || '',
  } = input
  const sourceContractRegistrySnapshot =
    input.sourceContractRegistrySnapshot || await getSourceContractRegistrySnapshot()
  const sourceContractRegistryDogfood =
    input.sourceContractRegistryDogfood || buildSourceContractRegistryTableDogfoodProof()
  const sourceIdScalarFkMigrationSnapshot =
    input.sourceIdScalarFkMigrationSnapshot || await getSourceIdScalarFkMigrationSnapshot()
  const sourceIdScalarFkDogfood =
    input.sourceIdScalarFkDogfood || buildSourceIdScalarFkDogfoodProof()
  const sourceIdArrayProvenanceDesign =
    input.sourceIdArrayProvenanceDesign || evaluateSourceIdArrayProvenanceDesign()
  const sourceIdArrayProvenanceDogfood =
    input.sourceIdArrayProvenanceDogfood || buildSourceIdArrayProvenanceDesignDogfoodProof()
  const extractionControlSnapshot =
    input.extractionControlSnapshot || await getExtractionControlSnapshot({ limit: 300 })
  const sourceContractValidationLayer =
    input.sourceContractValidationLayer || evaluateSourceContractValidationLayer({
      sourceContracts,
      extractionTargets: extractionControlSnapshot.targets || [],
      sourceRegistryText: sourceRegistry,
      currentStateText: currentState,
    })
  const sourceContractValidationLayerDogfood =
    input.sourceContractValidationLayerDogfood || buildSourceContractValidationLayerDogfoodProof()
  const marketingMeasurementSourceContracts =
    input.marketingMeasurementSourceContracts || evaluateMarketingMeasurementSourceContracts({
      sourceContracts,
      extractionTargets: extractionControlSnapshot.targets || [],
    })
  const marketingMeasurementSourceContractsDogfood =
    input.marketingMeasurementSourceContractsDogfood || buildMarketingMeasurementSourceContractsDogfoodProof()
  const sourceContractVerifier = evaluateFoundationSourceContractVerifier({
    sourceContracts,
    sourceRegistry,
    currentState,
    sourceContractRegistrySnapshot,
    sourceContractRegistryDogfood,
    sourceIdScalarFkMigrationSnapshot,
    sourceIdScalarFkDogfood,
    sourceIdArrayProvenanceDesign,
    sourceIdArrayProvenanceDogfood,
    sourceContractValidationLayer,
    sourceContractValidationLayerDogfood,
    marketingMeasurementSourceContracts,
    marketingMeasurementSourceContractsDogfood,
  })
  const checks = [...sourceContractVerifier.checks]
  const sourceContractDogfood = buildFoundationSourceContractVerifierDogfoodProof()
  const orchestrationDogfood = buildFoundationSourceContractOrchestrationSplitDogfoodProof()
  const backlogItems = foundationHub.backlogItems || []
  const orchestrationCard = findBacklogCard(backlogItems, VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID)
  const orchestrationCloseout = findCloseout(
    foundationBuildCloseouts,
    VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
  )
  const rootLineCount = countTextLines(foundationVerifyRootSource)
  const oldRootPatterns = [
    'const sourceContractRegistrySnapshot = await getSourceContractRegistrySnapshot()',
    'const sourceIdScalarFkMigrationSnapshot = await getSourceIdScalarFkMigrationSnapshot()',
    'const sourceIdArrayProvenanceDesign = evaluateSourceIdArrayProvenanceDesign()',
    'const sourceContractVerifierResult = evaluateFoundationSourceContractVerifier({',
    'sourceContractRegistryDogfood: buildSourceContractRegistryTableDogfoodProof()',
    'sourceIdScalarFkDogfood: buildSourceIdScalarFkDogfoodProof()',
    'sourceIdArrayProvenanceDogfood: buildSourceIdArrayProvenanceDesignDogfoodProof()',
    'checks.push(...sourceContractVerifierResult.checks)',
  ]
  const rootDelegatesThroughWrapper =
    foundationVerifyRootSource.includes('evaluateFoundationSourceContractVerifierOrchestration({') &&
    foundationVerifyRootSource.includes('sourceContractOrchestrationVerifier.checks')
  const oldDirectRootCallRemoved = oldRootPatterns.every(pattern => !foundationVerifyRootSource.includes(pattern))
  const focusedProofRegistered =
    packageJson.scripts?.['process:verifier-source-contract-orchestration-split-check'] ===
      `node --env-file-if-exists=.env ${VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_SCRIPT_PATH}` &&
    await repoFileExists(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_PLAN_PATH) &&
    await repoFileExists(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
    await repoFileExists(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_HANDOFF_PATH)
  const closeoutRegistered =
    orchestrationCard &&
    ['executing', 'done'].includes(orchestrationCard.lane) &&
    String(orchestrationCard.statusNote || '').includes(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
    orchestrationCloseout?.operatorCloseout === true &&
    (orchestrationCloseout.backlogIds || []).includes(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID)
  const orchestrationFixture = evaluateSourceContractOrchestrationFixture({
    moduleOwnsWrapper: includesAll(foundationSourceContractVerifierSource, [
      'evaluateFoundationSourceContractVerifierOrchestration',
      'buildFoundationSourceContractOrchestrationSplitDogfoodProof',
      'getSourceContractRegistrySnapshot',
      'buildSourceContractRegistryTableDogfoodProof',
      'getSourceIdScalarFkMigrationSnapshot',
      'buildSourceIdScalarFkDogfoodProof',
      'evaluateSourceIdArrayProvenanceDesign',
      'buildSourceIdArrayProvenanceDesignDogfoodProof',
      'evaluateSourceContractValidationLayer',
      'buildSourceContractValidationLayerDogfoodProof',
      'evaluateMarketingMeasurementSourceContracts',
      'buildMarketingMeasurementSourceContractsDogfoodProof',
    ]),
    rootDelegatesThroughWrapper,
    oldDirectRootCallRemoved,
    registryAndSourceIdDogfoodOwnedByModule: includesAll(foundationSourceContractVerifierSource, [
      'sourceContractRegistryDogfood',
      'sourceIdScalarFkDogfood',
      'sourceIdArrayProvenanceDogfood',
      'sourceContractValidationLayerDogfood',
    ]),
    closeoutRegistered,
    focusedProofRegistered,
    lineCountDecreased: rootLineCount < VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_BEFORE_LINES,
  })
  addCheck(
    checks,
    orchestrationFixture.ok === true &&
      orchestrationDogfood.ok === true &&
      sourceContractDogfood.ok === true &&
      sourceContractVerifier.checks.every(check => check.ok),
    'VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001 moves Source Contract verifier orchestration into the focused module',
    orchestrationCard
      ? `lane=${orchestrationCard.lane} dogfood=${orchestrationDogfood.ok ? 'pass' : 'blocked'} sourceChecks=${sourceContractVerifier.summary.passed}/${sourceContractVerifier.summary.total} lines=${VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_BEFORE_LINES}->${rootLineCount}`
      : `missing ${VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    sourceContractVerifier,
    dogfood: sourceContractDogfood,
    orchestrationDogfood,
    sourceContractRegistrySnapshot,
    sourceContractRegistryDogfood,
    sourceIdScalarFkMigrationSnapshot,
    sourceIdScalarFkDogfood,
    sourceIdArrayProvenanceDesign,
    sourceIdArrayProvenanceDogfood,
    extractionControlSnapshot,
    sourceContractValidationLayer,
    sourceContractValidationLayerDogfood,
    marketingMeasurementSourceContracts,
    marketingMeasurementSourceContractsDogfood,
  }
}
