export const SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID = 'SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001'
export const SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY = 'source-lifecycle-dynamic-counts-v1'
export const SOURCE_LIFECYCLE_DYNAMIC_COUNTS_PLAN_PATH = 'docs/process/source-lifecycle-dynamic-counts-001-plan.md'
export const SOURCE_LIFECYCLE_DYNAMIC_COUNTS_APPROVAL_PATH = 'docs/process/approvals/SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001.json'
export const SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SCRIPT_PATH = 'scripts/process-source-lifecycle-dynamic-counts-check.mjs'
export const SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SPRINT_ID = 'source-lifecycle-dynamic-counts-2026-05-16'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function unique(values) {
  const seen = new Set()
  return normalizeList(values)
    .map(value => normalizeText(value))
    .filter(Boolean)
    .filter(value => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function sourceIdOf(source) {
  return normalizeText(source?.sourceId || source?.source_id || source?.id)
}

function lower(value) {
  return normalizeText(value).toLowerCase()
}

export function isOptionalSourceLifecycleContract(source = {}) {
  if (source.foundationReadinessRequired === true || source.foundation_readiness_required === true) return false
  if (source.foundationReadinessRequired === false || source.foundation_readiness_required === false) return true
  if (source.optionalFoundationReadiness === true || source.optional_foundation_readiness === true) return true

  const group = lower(source.group)
  const status = lower(source.status)
  const validation = lower(source.validation)

  if (validation === 'not signed off') return true
  if (group === 'proposed' || group === 'gap') return true
  if (status.includes('scoped') || status.includes('not connected') || status === 'gap') return true

  return false
}

export function isRequiredSourceLifecycleContract(source = {}) {
  if (!sourceIdOf(source)) return false
  if (isOptionalSourceLifecycleContract(source)) return false

  const group = lower(source.group)
  const status = lower(source.status)
  const validation = lower(source.validation)

  return source.foundationReadinessRequired === true ||
    source.foundation_readiness_required === true ||
    group === 'verified' ||
    validation === 'signed off' ||
    validation === 'signed off for current reality' ||
    validation === 'readable only' ||
    status.includes('signed off') ||
    status.includes('verified') ||
    status.includes('current reality') ||
    status.includes('boundary locked') ||
    status.includes('active read-only')
}

export function buildSourceLifecycleDynamicCoverage({
  sourceContracts = [],
  terminalRuleIds = [],
  lifecycleSources = [],
} = {}) {
  const contracts = normalizeList(sourceContracts)
  const ruleIds = unique(terminalRuleIds)
  const ruleSet = new Set(ruleIds)
  const contractIds = unique(contracts.map(sourceIdOf))
  const contractSet = new Set(contractIds)
  const lifecycleIds = unique(normalizeList(lifecycleSources).map(sourceIdOf))
  const lifecycleSet = new Set(lifecycleIds)

  const governedRequiredSourceIds = ruleIds.filter(sourceId => contractSet.has(sourceId))
  const terminalRulesWithoutContracts = ruleIds.filter(sourceId => !contractSet.has(sourceId))
  const requiredWithoutTerminalRuleIds = []
  const optionalUnruledSourceIds = []

  for (const contract of contracts) {
    const sourceId = sourceIdOf(contract)
    if (!sourceId || ruleSet.has(sourceId)) continue
    if (isRequiredSourceLifecycleContract(contract)) {
      requiredWithoutTerminalRuleIds.push(sourceId)
    } else {
      optionalUnruledSourceIds.push(sourceId)
    }
  }

  const requiredSourceIds = unique([...governedRequiredSourceIds, ...requiredWithoutTerminalRuleIds])
  const requiredMissingLifecycleRowIds = lifecycleIds.length
    ? requiredSourceIds.filter(sourceId => !lifecycleSet.has(sourceId))
    : []
  const duplicateTerminalRuleIds = ruleIds.filter((sourceId, index, values) => values.indexOf(sourceId) !== index)
  const duplicateSourceContractIds = contractIds.filter((sourceId, index, values) => values.indexOf(sourceId) !== index)

  const findings = []
  for (const sourceId of requiredWithoutTerminalRuleIds) {
    findings.push({
      id: `required_source_missing_terminal_rule:${sourceId}`,
      severity: 'critical',
      type: 'required_source_missing_terminal_rule',
      sourceId,
      detail: `${sourceId} is a required source contract but has no terminal lifecycle rule.`,
    })
  }
  for (const sourceId of terminalRulesWithoutContracts) {
    findings.push({
      id: `terminal_rule_missing_source_contract:${sourceId}`,
      severity: 'critical',
      type: 'terminal_rule_missing_source_contract',
      sourceId,
      detail: `${sourceId} has a terminal lifecycle rule but no source contract.`,
    })
  }
  for (const sourceId of requiredMissingLifecycleRowIds) {
    findings.push({
      id: `required_source_missing_lifecycle_row:${sourceId}`,
      severity: 'critical',
      type: 'required_source_missing_lifecycle_row',
      sourceId,
      detail: `${sourceId} is required but missing from the Source Lifecycle row set.`,
    })
  }
  for (const sourceId of duplicateTerminalRuleIds) {
    findings.push({
      id: `duplicate_terminal_rule:${sourceId}`,
      severity: 'critical',
      type: 'duplicate_terminal_rule',
      sourceId,
      detail: `${sourceId} appears more than once in terminal lifecycle rules.`,
    })
  }
  for (const sourceId of duplicateSourceContractIds) {
    findings.push({
      id: `duplicate_source_contract:${sourceId}`,
      severity: 'critical',
      type: 'duplicate_source_contract',
      sourceId,
      detail: `${sourceId} appears more than once in source contracts.`,
    })
  }

  return {
    ok: findings.length === 0,
    summary: {
      sourceContractCount: contracts.length,
      terminalRuleCount: ruleIds.length,
      requiredSourceCount: requiredSourceIds.length,
      governedRequiredSourceCount: governedRequiredSourceIds.length,
      optionalUnruledSourceCount: optionalUnruledSourceIds.length,
      requiredMissingTerminalRuleCount: requiredWithoutTerminalRuleIds.length,
      terminalRuleMissingContractCount: terminalRulesWithoutContracts.length,
      requiredMissingLifecycleRowCount: requiredMissingLifecycleRowIds.length,
      duplicateTerminalRuleCount: duplicateTerminalRuleIds.length,
      duplicateSourceContractCount: duplicateSourceContractIds.length,
    },
    requiredSourceIds,
    governedRequiredSourceIds,
    optionalUnruledSourceIds,
    requiredWithoutTerminalRuleIds,
    terminalRulesWithoutContracts,
    requiredMissingLifecycleRowIds,
    duplicateTerminalRuleIds,
    duplicateSourceContractIds,
    findings,
  }
}

export function buildSourceLifecycleDynamicCountsDogfoodProof() {
  const terminalRuleIds = ['SRC-REQUIRED-001']
  const required = {
    sourceId: 'SRC-REQUIRED-001',
    group: 'verified',
    status: 'Verified Readable',
    validation: 'Readable Only',
  }
  const optionalAddition = {
    sourceId: 'SRC-OPTIONAL-FUTURE-001',
    group: 'proposed',
    status: 'Scoped, not connected',
    validation: 'Not Signed Off',
  }
  const requiredAddition = {
    sourceId: 'SRC-REQUIRED-NEW-001',
    group: 'verified',
    status: 'Verified Readable',
    validation: 'Readable Only',
  }

  const healthy = buildSourceLifecycleDynamicCoverage({
    sourceContracts: [required],
    terminalRuleIds,
    lifecycleSources: [required],
  })
  const optionalPass = buildSourceLifecycleDynamicCoverage({
    sourceContracts: [required, optionalAddition],
    terminalRuleIds,
    lifecycleSources: [required, optionalAddition],
  })
  const requiredMissingRule = buildSourceLifecycleDynamicCoverage({
    sourceContracts: [required, requiredAddition],
    terminalRuleIds,
    lifecycleSources: [required, requiredAddition],
  })
  const missingRequiredContract = buildSourceLifecycleDynamicCoverage({
    sourceContracts: [],
    terminalRuleIds,
    lifecycleSources: [],
  })

  const ok = healthy.ok === true &&
    optionalPass.ok === true &&
    optionalPass.optionalUnruledSourceIds.includes('SRC-OPTIONAL-FUTURE-001') &&
    requiredMissingRule.ok === false &&
    requiredMissingRule.requiredWithoutTerminalRuleIds.includes('SRC-REQUIRED-NEW-001') &&
    missingRequiredContract.ok === false &&
    missingRequiredContract.terminalRulesWithoutContracts.includes('SRC-REQUIRED-001')

  return {
    ok,
    healthy,
    optionalPass,
    requiredMissingRule,
    missingRequiredContract,
    invariant: 'Optional source additions do not fail Source Lifecycle completion, while required sources without terminal coverage and terminal rules without source contracts fail closed.',
  }
}
