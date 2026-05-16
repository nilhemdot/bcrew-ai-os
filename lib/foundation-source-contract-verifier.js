import {
  SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID,
} from './source-contract-registry-table.js'
import {
  SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID,
  SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY,
} from './source-id-scalar-fk-migration.js'

export const VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID = 'VERIFIER-MONOLITH-SPLIT-CONTINUE-002'
export const VERIFIER_SOURCE_CONTRACT_MODULE_CLOSEOUT_KEY = 'verifier-source-contracts-module-v1'
export const VERIFIER_SOURCE_CONTRACT_MODULE_PLAN_PATH = 'docs/process/verifier-source-contracts-module-001-plan.md'
export const VERIFIER_SOURCE_CONTRACT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-002.json'
export const VERIFIER_SOURCE_CONTRACT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-source-contracts-module-check.mjs'
export const VERIFIER_SOURCE_CONTRACT_MODULE_SPRINT_ID = 'verifier-source-contracts-module-2026-05-15'
export const VERIFIER_SOURCE_CONTRACT_MODULE_BEFORE_LINES = 15732

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

export function evaluateFoundationSourceContractVerifier({
  sourceContracts = [],
  sourceRegistry = '',
  currentState = '',
  sourceContractRegistrySnapshot = null,
  sourceContractRegistryDogfood = null,
  sourceIdScalarFkMigrationSnapshot = null,
  sourceIdScalarFkDogfood = null,
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
      sourceIdScalarFkMigrationSnapshot?.constraints?.validatedCount === 10 &&
      sourceIdScalarFkMigrationSnapshot?.invalidReferenceCount === 0 &&
      sourceIdScalarFkMigrationSnapshot?.arrayConstraintRows?.length === 0 &&
      sourceIdScalarFkDogfood?.ok === true,
    `${SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID} enforces scalar source IDs through registry FKs`,
    sourceIdScalarFkMigrationSnapshot?.constraints
      ? `${SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY} / validated=${sourceIdScalarFkMigrationSnapshot.constraints.validatedCount}/${sourceIdScalarFkMigrationSnapshot.constraints.expectedCount} invalidRefs=${sourceIdScalarFkMigrationSnapshot.invalidReferenceCount || 0} dogfood=${sourceIdScalarFkDogfood?.ok ? 'pass' : 'blocked'}`
      : 'missing scalar FK migration snapshot',
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

  return {
    ok: healthy.ok === true &&
      missingOwnersSignoff.ok === false &&
      missingOwnersTab.ok === false &&
      missingRegistryRow.ok === false &&
      staleCurrentState.ok === false &&
      missingSourceContractRegistry.ok === false &&
      missingScalarFkMigration.ok === false,
    healthy,
    missingOwnersSignoff,
    missingOwnersTab,
    missingRegistryRow,
    staleCurrentState,
    missingSourceContractRegistry,
    missingScalarFkMigration,
    invariant: 'The source-contract verifier accepts signed-off source truth and rejects missing signoff, missing tab coverage, stale registry rows, stale current-state mirror boundaries, missing DB source-contract registry proof, and missing scalar source-ID FK enforcement.',
  }
}
