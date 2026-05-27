export const FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID = 'FOUNDATION-VERIFY-REGISTRY-SPLIT-001'
export const FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY = 'foundation-verify-registry-split-v1'
export const FOUNDATION_VERIFY_REGISTRY_SPLIT_PLAN_PATH = 'docs/process/foundation-verify-registry-split-001-plan.md'
export const FOUNDATION_VERIFY_REGISTRY_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-VERIFY-REGISTRY-SPLIT-001.json'
export const FOUNDATION_VERIFY_REGISTRY_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-verify-registry-split-check.mjs'
export const FOUNDATION_VERIFY_REGISTRY_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-foundation-verify-registry-split-closeout.md'
export const FOUNDATION_VERIFY_REGISTRY_SPLIT_SPRINT_ID = 'foundation-verify-registry-split-2026-05-18'
export const FOUNDATION_VERIFY_REGISTRY_ROOT_PATH = 'scripts/foundation-verify.mjs'
export const FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES = 5000
export const FOUNDATION_VERIFY_REGISTRY_BEFORE_LINES = 4975

export const FOUNDATION_VERIFY_REGISTRY_SPLIT_CHANGED_FILES = [
  'lib/foundation-verify-registry-split.js',
  'lib/foundation-verifier-structural-assurance-core.js',
  'lib/foundation-verifier-module-assurance.js',
  'lib/code-quality-nightly-audit.js',
  'lib/foundation-build-closeout-tightening-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'scripts/process-foundation-verify-registry-split-check.mjs',
  'docs/process/foundation-verify-registry-split-001-plan.md',
  'docs/process/approvals/FOUNDATION-VERIFY-REGISTRY-SPLIT-001.json',
  'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-foundation-verify-registry-split-closeout.md',
  'package.json',
]

export const FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS = [
  {
    key: 'source-contract-orchestration',
    modulePath: 'lib/foundation-source-contract-verifier.js',
    evaluator: 'evaluateFoundationSourceContractVerifierOrchestration',
  },
  {
    key: 'canva-client-orchestration',
    modulePath: 'lib/foundation-canva-client-verifier.js',
    evaluator: 'evaluateFoundationCanvaClientVerifierOrchestration',
  },
  {
    key: 'recent-builds-orchestration',
    modulePath: 'lib/foundation-recent-builds-verifier.js',
    evaluator: 'evaluateFoundationRecentBuildsVerifierOrchestration',
  },
  {
    key: 'agent-feedback-orchestration',
    modulePath: 'lib/foundation-agent-feedback-verifier.js',
    evaluator: 'evaluateFoundationAgentFeedbackVerifierOrchestration',
  },
  {
    key: 'process-control-governance',
    modulePath: 'lib/foundation-verifier-process-control-governance.js',
    evaluator: 'evaluateFoundationVerifierProcessControlGovernanceOrchestration',
  },
  {
    key: 'structural-assurance-core',
    modulePath: 'lib/foundation-verifier-structural-assurance-core.js',
    evaluator: 'evaluateFoundationVerifierStructuralAssuranceCore',
  },
  {
    key: 'runtime-reliability-orchestration',
    modulePath: 'lib/foundation-runtime-reliability-verifier.js',
    evaluator: 'evaluateFoundationRuntimeReliabilityVerifierOrchestration',
  },
  {
    key: 'build-log-registry-assurance',
    modulePath: 'lib/foundation-verifier-build-log-registry-assurance.js',
    evaluator: 'evaluateFoundationVerifierBuildLogRegistryAssurance',
  },
  {
    key: 'health-live-summary',
    modulePath: 'lib/foundation-verifier-health-live-summary.js',
    evaluator: 'evaluateFoundationVerifierHealthLiveSummary',
  },
  {
    key: 'followup-backlog-assurance',
    modulePath: 'lib/foundation-verifier-followup-backlog-assurance.js',
    evaluator: 'evaluateFoundationVerifierFollowupBacklogAssurance',
  },
]

const ROOT_NESTED_STRUCTURAL_TOKENS = [
  'VERIFIER_MODULE_ASSURANCE_SPLIT_APPROVAL_PATH',
  'VERIFIER_MODULE_ASSURANCE_SPLIT_BEFORE_LINES',
  'VERIFIER_MODULE_ASSURANCE_SPLIT_CARD_ID',
  'VERIFIER_MODULE_ASSURANCE_SPLIT_CLOSEOUT_KEY',
  'VERIFIER_MODULE_ASSURANCE_SPLIT_HANDOFF_PATH',
  'VERIFIER_MODULE_ASSURANCE_SPLIT_PLAN_PATH',
  'VERIFIER_MODULE_ASSURANCE_SPLIT_SCRIPT_PATH',
  'VERIFIER_BACKEND_SPLIT_ASSURANCE_APPROVAL_PATH',
  'VERIFIER_BACKEND_SPLIT_ASSURANCE_BEFORE_LINES',
  'VERIFIER_BACKEND_SPLIT_ASSURANCE_CARD_ID',
  'VERIFIER_BACKEND_SPLIT_ASSURANCE_CLOSEOUT_KEY',
  'VERIFIER_BACKEND_SPLIT_ASSURANCE_HANDOFF_PATH',
  'VERIFIER_BACKEND_SPLIT_ASSURANCE_PLAN_PATH',
  'VERIFIER_BACKEND_SPLIT_ASSURANCE_SCRIPT_PATH',
  'buildFoundationVerifierModuleAssuranceDogfoodProof',
  'buildFoundationVerifierBackendSplitAssuranceDogfoodProof',
  'evaluateFoundationVerifierModuleAssurance',
  'evaluateFoundationVerifierBackendSplitAssurance',
]

export function countFoundationVerifyRootLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const lines = text.split(/\r?\n/)
  return lines.length - (text.endsWith('\n') ? 1 : 0)
}

function normalizeRegistry(registry = FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS) {
  return (Array.isArray(registry) ? registry : [])
    .map(item => ({
      key: String(item?.key || '').trim(),
      modulePath: String(item?.modulePath || '').trim(),
      evaluator: String(item?.evaluator || '').trim(),
    }))
    .filter(item => item.key || item.modulePath || item.evaluator)
}

function findDuplicates(values = []) {
  const seen = new Set()
  const duplicates = new Set()
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  return Array.from(duplicates)
}

export function evaluateFoundationVerifyRegistry(registry = FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS) {
  const entries = normalizeRegistry(registry)
  const duplicateKeys = findDuplicates(entries.map(item => item.key))
  const duplicateModules = findDuplicates(entries.map(item => item.modulePath))
  const duplicateEvaluators = findDuplicates(entries.map(item => item.evaluator))
  const missingFields = entries.filter(item => !item.key || !item.modulePath || !item.evaluator)
  const requiredKeys = new Set(FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS.map(item => item.key))
  const keys = new Set(entries.map(item => item.key))
  const missingRequiredKeys = Array.from(requiredKeys).filter(key => !keys.has(key))

  return {
    ok: entries.length >= FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS.length &&
      duplicateKeys.length === 0 &&
      duplicateModules.length === 0 &&
      duplicateEvaluators.length === 0 &&
      missingFields.length === 0 &&
      missingRequiredKeys.length === 0,
    entries,
    duplicateKeys,
    duplicateModules,
    duplicateEvaluators,
    missingFields,
    missingRequiredKeys,
  }
}

function rootHasRequiredDelegations(foundationVerifySource = '', registry = FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS) {
  const source = String(foundationVerifySource || '')
  return normalizeRegistry(registry)
    .filter(item => item.key !== 'structural-assurance-core' || source.includes('evaluateFoundationVerifierStructuralAssuranceCore({'))
    .every(item => source.includes(item.evaluator))
}

function rootHasNestedStructuralOwnership(foundationVerifySource = '') {
  const source = String(foundationVerifySource || '')
  return ROOT_NESTED_STRUCTURAL_TOKENS.some(token => source.includes(token))
}

function structuralCoreOwnsNestedStructuralDependencies(structuralAssuranceSource = '') {
  const source = String(structuralAssuranceSource || '')
  return ROOT_NESTED_STRUCTURAL_TOKENS.every(token => source.includes(token))
}

export function evaluateFoundationVerifyRegistrySplitFixture(fixture = {}) {
  const registry = evaluateFoundationVerifyRegistry(fixture.registry || FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS)
  const findings = []
  if (fixture.rootLineCount >= FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES) findings.push('foundation_verify_root_over_5000_lines')
  if (registry.ok !== true) findings.push('verifier_split_registry_invalid')
  if (fixture.rootHasRequiredDelegations !== true) findings.push('root_missing_registered_delegation')
  if (fixture.rootHasNestedStructuralOwnership === true) findings.push('root_still_owns_nested_structural_dependencies')
  if (fixture.structuralCoreOwnsNestedDependencies !== true) findings.push('structural_core_missing_nested_dependencies')
  if (fixture.auditDetectorSuppressesResolvedRoot !== true) findings.push('audit_still_hard_flags_resolved_root')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifyRegistrySplitDogfoodProof() {
  const healthy = evaluateFoundationVerifyRegistrySplitFixture({
    rootLineCount: FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES - 25,
    registry: FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS,
    rootHasRequiredDelegations: true,
    rootHasNestedStructuralOwnership: false,
    structuralCoreOwnsNestedDependencies: true,
    auditDetectorSuppressesResolvedRoot: true,
  })
  const oversizedRoot = evaluateFoundationVerifyRegistrySplitFixture({
    rootLineCount: FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES,
    registry: FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS,
    rootHasRequiredDelegations: true,
    rootHasNestedStructuralOwnership: false,
    structuralCoreOwnsNestedDependencies: true,
    auditDetectorSuppressesResolvedRoot: true,
  })
  const missingRegistryDomain = evaluateFoundationVerifyRegistrySplitFixture({
    rootLineCount: FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES - 25,
    registry: FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS.slice(1),
    rootHasRequiredDelegations: true,
    rootHasNestedStructuralOwnership: false,
    structuralCoreOwnsNestedDependencies: true,
    auditDetectorSuppressesResolvedRoot: true,
  })
  const duplicateRegistryDomain = evaluateFoundationVerifyRegistrySplitFixture({
    rootLineCount: FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES - 25,
    registry: [
      ...FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS,
      { ...FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS[0] },
    ],
    rootHasRequiredDelegations: true,
    rootHasNestedStructuralOwnership: false,
    structuralCoreOwnsNestedDependencies: true,
    auditDetectorSuppressesResolvedRoot: true,
  })
  const nestedStructuralOwnership = evaluateFoundationVerifyRegistrySplitFixture({
    rootLineCount: FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES - 25,
    registry: FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS,
    rootHasRequiredDelegations: true,
    rootHasNestedStructuralOwnership: true,
    structuralCoreOwnsNestedDependencies: true,
    auditDetectorSuppressesResolvedRoot: true,
  })
  const auditStillHardFlags = evaluateFoundationVerifyRegistrySplitFixture({
    rootLineCount: FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES - 25,
    registry: FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS,
    rootHasRequiredDelegations: true,
    rootHasNestedStructuralOwnership: false,
    structuralCoreOwnsNestedDependencies: true,
    auditDetectorSuppressesResolvedRoot: false,
  })

  const rejected = {
    oversizedRoot,
    missingRegistryDomain,
    duplicateRegistryDomain,
    nestedStructuralOwnership,
    auditStillHardFlags,
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy registry split passes; oversized root, missing/duplicate registry domains, nested root ownership, and stale audit hard-flag fixtures fail closed'
      : 'foundation verify registry split dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifyRegistrySplit(input = {}) {
  const {
    foundationVerifySource = '',
    structuralAssuranceSource = '',
    codeQualityNightlyAuditSource = '',
    packageScripts = {},
    backlogItems = [],
    closeouts = [],
    repoFileExists = async () => false,
  } = input
  const checks = []
  const registry = evaluateFoundationVerifyRegistry()
  const rootLineCount = countFoundationVerifyRootLines(foundationVerifySource)
  const card = (Array.isArray(backlogItems) ? backlogItems : [])
    .find(item => item?.id === FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID) || null
  const closeout = (Array.isArray(closeouts) ? closeouts : [])
    .find(item => item?.key === FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY) || null
  const closed = card?.lane === 'done'
  const moduleExistence = await Promise.all(FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS
    .map(async item => ({ ...item, exists: await repoFileExists(item.modulePath) })))
  const missingModuleFiles = moduleExistence.filter(item => !item.exists).map(item => item.modulePath)
  const rootDelegates = rootHasRequiredDelegations(foundationVerifySource)
  const rootOwnsNestedStructural = rootHasNestedStructuralOwnership(foundationVerifySource)
  const structuralCoreOwnsNested = structuralCoreOwnsNestedStructuralDependencies(structuralAssuranceSource)
  const auditDetectorResolved = String(codeQualityNightlyAuditSource || '').includes('foundationVerifyRootHasRegistrySplit') &&
    String(codeQualityNightlyAuditSource || '').includes(FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID)

  checks.push({
    ok: Boolean(card && ['executing', 'done'].includes(card.lane)),
    check: 'live backlog card exists in executing/done lane',
    detail: card ? `${card.id}:${card.lane}` : 'missing',
  })
  checks.push({
    ok: !closed || (
      String(card?.statusNote || '').includes(FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY) &&
      closeout?.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID)
    ),
    check: 'done card has verified closeout ownership',
    detail: closed ? closeout?.key || 'missing closeout' : 'not closed yet',
  })
  checks.push({
    ok: rootLineCount > 0 && rootLineCount < FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES,
    check: 'foundation verifier root stays below the 5,000-line clean target',
    detail: `${rootLineCount}/${FOUNDATION_VERIFY_REGISTRY_MAX_ROOT_LINES}`,
  })
  checks.push({
    ok: registry.ok,
    check: 'verifier split registry has unique required domains',
    detail: registry.ok ? `${registry.entries.length} domains` : [...registry.duplicateKeys, ...registry.missingRequiredKeys].join(', '),
  })
  checks.push({
    ok: missingModuleFiles.length === 0,
    check: 'registered verifier module files exist',
    detail: missingModuleFiles.join(', ') || 'all present',
  })
  checks.push({
    ok: rootDelegates,
    check: 'root verifier delegates registered domains',
    detail: rootDelegates ? 'registered evaluator calls present' : 'missing registered evaluator call',
  })
  checks.push({
    ok: !rootOwnsNestedStructural && structuralCoreOwnsNested,
    check: 'nested structural dependencies live outside the root verifier',
    detail: !rootOwnsNestedStructural ? 'owned by structural core' : 'root still owns nested structural tokens',
  })
  checks.push({
    ok: auditDetectorResolved,
    check: 'nightly audit treats under-budget registered verifier root as resolved',
    detail: auditDetectorResolved ? 'detector has registry-aware branch' : 'detector still hard-flags by pattern',
  })
  checks.push({
    ok: packageScripts['process:foundation-verify-registry-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_VERIFY_REGISTRY_SPLIT_SCRIPT_PATH}`,
    check: 'package exposes focused registry split proof',
    detail: packageScripts['process:foundation-verify-registry-split-check'] || 'missing',
  })

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      passed: checks.filter(check => check.ok).length,
      total: checks.length,
      rootLineCount,
      registryDomains: registry.entries.length,
      missingModuleFiles,
      rootDelegates,
      rootOwnsNestedStructural,
      structuralCoreOwnsNested,
      auditDetectorResolved,
    },
  }
}
