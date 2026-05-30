import {
  FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
  closeoutRecords,
} from './foundation-build-closeout-records.js'

export const BUILD_CLOSEOUT_DATA_SOURCE_CARD_ID = 'BUILD-CLOSEOUT-DATA-SOURCE-001'
export const BUILD_CLOSEOUT_DATA_SOURCE_CLOSEOUT_KEY = 'build-closeout-data-source-v1'
export const BUILD_CLOSEOUT_DATA_SOURCE_PLAN_PATH = 'docs/process/build-closeout-data-source-001-plan.md'
export const BUILD_CLOSEOUT_DATA_SOURCE_APPROVAL_PATH = 'docs/process/approvals/BUILD-CLOSEOUT-DATA-SOURCE-001.json'
export const BUILD_CLOSEOUT_DATA_SOURCE_SCRIPT_PATH = 'scripts/process-build-closeout-data-source-check.mjs'
export const BUILD_CLOSEOUT_DATA_SOURCE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-build-closeout-data-source-closeout.md'
export const BUILD_CLOSEOUT_DATA_SOURCE_NEXT_CARD_ID = 'FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001'
export const BUILD_CLOSEOUT_DATA_SOURCE_ID = 'SRC-FOUNDATION-BUILD-CLOSEOUTS-001'

export const BUILD_CLOSEOUT_DATA_SOURCE_PROOF_COMMANDS = [
  'node --check lib/build-closeout-data-source.js scripts/process-build-closeout-data-source-check.mjs lib/foundation-build-log.js lib/foundation-verifier-build-log-registry-assurance.js lib/code-quality-nightly-audit.js lib/source-of-truth-payload.js lib/source-contract-validation-layer.js scripts/process-source-contract-validation-layer-check.mjs scripts/process-foundation-build-log-monolith-slice-check.mjs',
  'npm run process:build-closeout-data-source-check -- --close-card --json',
  'npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=BUILD-CLOSEOUT-DATA-SOURCE-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-DATA-SOURCE-001.json --closeoutKey=build-closeout-data-source-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=BUILD-CLOSEOUT-DATA-SOURCE-001 --closeoutKey=build-closeout-data-source-v1',
  'npm run process:foundation-ship -- --card=BUILD-CLOSEOUT-DATA-SOURCE-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-DATA-SOURCE-001.json --closeoutKey=build-closeout-data-source-v1 --commitRef=HEAD',
]

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeList(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => normalizeText(value))
    .filter(Boolean)
}

function unique(values) {
  const seen = new Set()
  return normalizeList(values).filter(value => {
    const key = value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function lineNumberForIndex(text = '', index = 0) {
  return String(text || '').slice(0, Math.max(0, index)).split(/\r?\n/).length
}

function refForPattern(filePath, source, pattern, detail) {
  const text = String(source || '')
  const match = text.match(pattern)
  if (!match || match.index === undefined) return null
  return {
    path: filePath,
    line: lineNumberForIndex(text, match.index),
    detail: detail || match[0].slice(0, 120).replace(/\s+/g, ' '),
  }
}

function addCheck(checks, ok, check, detail = '', refs = []) {
  checks.push({
    ok: Boolean(ok),
    check,
    detail,
    refs: refs.filter(Boolean),
  })
}

function findCloseoutOwnershipOverlaps(record = {}) {
  const ownedIds = unique(record.backlogIds)
  const mentionedLookup = new Set(unique(record.mentionedBacklogIds || []).map(id => id.toLowerCase()))
  return ownedIds.filter(id => mentionedLookup.has(id.toLowerCase()))
}

export function getBuildCloseoutDataSourceContract() {
  return {
    sourceId: BUILD_CLOSEOUT_DATA_SOURCE_ID,
    title: 'Foundation Build Closeout History',
    unitName: 'Build closeout record set',
    group: 'verified',
    status: 'Repo-backed data-source boundary live',
    validation: 'System Generated / Verified',
    optionalFoundationReadiness: true,
    validationScope: 'Closeout records are schema-validated and mirrored in source_contract_registry.',
    owner: 'Foundation Process',
    location: 'lib/build-closeout-data-source.js and closeout record modules',
    scope: 'Recent Builds closeout records',
    owns: 'Closeout schema, proof metadata, source identity, and Build Log read boundary.',
    accessMethod: 'Git record modules plus source_contract_registry mirror',
    lastVerified: '2026-05-19',
    updateMethod: 'Card closeouts update records; focused proof validates source and registry parity.',
    refreshSchedule: 'Card closeout and nightly audit.',
    manualRefresh: 'Run process:build-closeout-data-source-check after metadata changes.',
    actions: [
      { label: 'Open Recent Builds', href: '/foundation#recent-builds' },
      { label: 'Open Build Log API', href: '/api/foundation/build-log' },
    ],
  }
}

export function getBuildCloseoutDataSourceRecords() {
  return closeoutRecords.map(record => ({
    ...record,
    backlogIds: normalizeList(record.backlogIds),
    mentionedBacklogIds: unique(record.mentionedBacklogIds || []),
    whereItLives: normalizeList(record.whereItLives),
    proofCommands: normalizeList(record.proofCommands),
    knownLimits: normalizeList(record.knownLimits),
  }))
}

export function validateBuildCloseoutDataSourceRecords(records = getBuildCloseoutDataSourceRecords()) {
  const requiredTextFields = [
    'key',
    'systemArea',
    'status',
    'acceptanceState',
    'whatChanged',
    'whatItDoes',
    'whyItMatters',
    'proofStatus',
    'reviewNext',
  ]
  const normalizedRecords = (Array.isArray(records) ? records : []).map(record => ({
    ...record,
    backlogIds: normalizeList(record.backlogIds),
    mentionedBacklogIds: unique(record.mentionedBacklogIds || []),
    whereItLives: normalizeList(record.whereItLives),
    proofCommands: normalizeList(record.proofCommands),
    knownLimits: normalizeList(record.knownLimits),
  }))
  const invalid = normalizedRecords.filter(record =>
    requiredTextFields.some(field => !normalizeText(record[field])) ||
      !record.backlogIds.length ||
      !record.whereItLives.length ||
      !record.proofCommands.length
  )
  const ownershipOverlapViolations = normalizedRecords
    .map(record => ({
      key: record.key || '<missing-key>',
      overlappingBacklogIds: findCloseoutOwnershipOverlaps(record),
    }))
    .filter(violation => violation.overlappingBacklogIds.length > 0)
  const invalidCloseoutKeys = unique([
    ...invalid.map(record => record.key || '<missing-key>'),
    ...ownershipOverlapViolations.map(violation => violation.key),
  ])

  return {
    schemaVersion: FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
    sourceId: BUILD_CLOSEOUT_DATA_SOURCE_ID,
    closeoutCount: normalizedRecords.length,
    invalidCloseoutKeys,
    ownershipOverlapViolations,
    backlogIds: unique(normalizedRecords.flatMap(record => record.backlogIds)),
  }
}

export function buildBuildCloseoutDataSourceSnapshot({
  sourceContracts = [],
  registryRows = [],
  records = getBuildCloseoutDataSourceRecords(),
} = {}) {
  const validation = validateBuildCloseoutDataSourceRecords(records)
  const sourceContract = (sourceContracts || []).find(contract => contract?.sourceId === BUILD_CLOSEOUT_DATA_SOURCE_ID) || null
  const registryRow = (registryRows || []).find(row =>
    (row?.sourceId || row?.source_id) === BUILD_CLOSEOUT_DATA_SOURCE_ID &&
      (row.active === true || row.active === 'true')
  ) || null
  const checks = []

  addCheck(
    checks,
    Boolean(sourceContract) &&
      sourceContract.owner === 'Foundation Process' &&
      /closeout/i.test(sourceContract.owns || '') &&
      /source_contract_registry/i.test(sourceContract.validationScope || ''),
    'source contract exists with owner, scope, and registry mirror boundary',
    sourceContract ? `${sourceContract.sourceId}:${sourceContract.status}` : 'missing source contract',
  )
  addCheck(
    checks,
    Boolean(registryRow) && normalizeText(registryRow.contractHash || registryRow.contract_hash).length === 64,
    'source_contract_registry has active build closeout source row',
    registryRow ? normalizeText(registryRow.contractHash || registryRow.contract_hash).slice(0, 12) : 'missing registry row',
  )
  addCheck(
    checks,
    validation.closeoutCount >= 400 &&
      validation.invalidCloseoutKeys.length === 0 &&
      validation.ownershipOverlapViolations.length === 0,
    'closeout data source validates current record set',
    `records=${validation.closeoutCount} invalid=${validation.invalidCloseoutKeys.length} overlaps=${validation.ownershipOverlapViolations.length}`,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    sourceId: BUILD_CLOSEOUT_DATA_SOURCE_ID,
    sourceContract,
    registryRow: registryRow ? {
      sourceId: registryRow.sourceId || registryRow.source_id,
      title: registryRow.title,
      sourceGroup: registryRow.sourceGroup || registryRow.source_group,
      status: registryRow.status,
      contractHash: registryRow.contractHash || registryRow.contract_hash,
      active: registryRow.active,
    } : null,
    validation,
    checks,
    failed,
  }
}

export function evaluateBuildCloseoutDataSourceUsage({
  dataSourceSource = '',
  buildLogSource = '',
  sourceContractsSource = '',
  codeQualityAuditSource = '',
  deepAuditClosureSource = '',
} = {}) {
  const dataSource = String(dataSourceSource || '')
  const buildLog = String(buildLogSource || '')
  const sourceContracts = String(sourceContractsSource || '')
  const codeQualityAudit = String(codeQualityAuditSource || '')
  const deepAuditClosure = String(deepAuditClosureSource || '')
  const checks = []

  addCheck(
    checks,
    dataSource.includes('BUILD_CLOSEOUT_DATA_SOURCE_ID') &&
      dataSource.includes('getBuildCloseoutDataSourceContract') &&
      dataSource.includes('getBuildCloseoutDataSourceRecords') &&
      dataSource.includes('validateBuildCloseoutDataSourceRecords') &&
      dataSource.includes('buildBuildCloseoutDataSourceSnapshot'),
    'data-source module owns source identity, record access, validation, and runtime snapshot',
    'lib/build-closeout-data-source.js',
    [refForPattern('lib/build-closeout-data-source.js', dataSource, /BUILD_CLOSEOUT_DATA_SOURCE_ID/, 'source ID constant')],
  )
  addCheck(
    checks,
    buildLog.includes('getBuildCloseoutDataSourceRecords') &&
      buildLog.includes('validateBuildCloseoutDataSourceRecords') &&
      !/closeoutRecords\s*,/.test(buildLog) &&
      !/from\s+['"]\.\/foundation-build-closeout-records\.js['"]/.test(buildLog),
    'foundation build log reads closeouts through data-source boundary',
    'lib/foundation-build-log.js',
    [refForPattern('lib/foundation-build-log.js', buildLog, /from\s+['"]\.\/foundation-build-closeout-records\.js['"]/, 'direct registry import')],
  )
  addCheck(
    checks,
    sourceContracts.includes('getBuildCloseoutDataSourceContract') &&
      sourceContracts.includes('...sourceContracts') === false,
    'source contracts registry includes build closeout data-source contract explicitly',
    'lib/source-contracts.js',
    [refForPattern('lib/source-contracts.js', sourceContracts, /getBuildCloseoutDataSourceContract/, 'source contract insertion')],
  )
  addCheck(
    checks,
    codeQualityAudit.includes('evaluateBuildCloseoutDataSourceUsage') &&
      (codeQualityAudit.includes(BUILD_CLOSEOUT_DATA_SOURCE_CARD_ID) ||
        codeQualityAudit.includes('BUILD_CLOSEOUT_DATA_SOURCE_CARD_ID')) &&
      !codeQualityAudit.includes("proposedCard: 'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001'"),
    'code-quality audit uses data-source evaluator and routes stale closeout ownership to current card',
    'lib/code-quality-nightly-audit.js',
    [refForPattern('lib/code-quality-nightly-audit.js', codeQualityAudit, /BUILD-CLOSEOUT-REGISTRY-EXTRACT-001/, 'old routed card')],
  )
  addCheck(
    checks,
    deepAuditClosure.includes(BUILD_CLOSEOUT_DATA_SOURCE_CARD_ID) &&
      deepAuditClosure.includes(BUILD_CLOSEOUT_DATA_SOURCE_CLOSEOUT_KEY) &&
      /findingId:\s*['"]build-closeout-code-owned-data['"][\s\S]{0,500}routeStatus:\s*['"]done['"]/.test(deepAuditClosure),
    'deep-audit route closes build closeout code-owned data finding to data-source closeout',
    'lib/deep-audit-findings-closure-gate.js',
    [refForPattern('lib/deep-audit-findings-closure-gate.js', deepAuditClosure, /build-closeout-code-owned-data/, 'deep audit route')],
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    refs: failed.flatMap(check => check.refs || []),
  }
}

export function buildBuildCloseoutDataSourceDogfoodProof() {
  const healthy = evaluateBuildCloseoutDataSourceUsage({
    dataSourceSource: `
      export const BUILD_CLOSEOUT_DATA_SOURCE_ID = 'SRC-FOUNDATION-BUILD-CLOSEOUTS-001'
      export function getBuildCloseoutDataSourceContract() {}
      export function getBuildCloseoutDataSourceRecords() {}
      export function validateBuildCloseoutDataSourceRecords() {}
      export function buildBuildCloseoutDataSourceSnapshot() {}
    `,
    buildLogSource: `
      import { getBuildCloseoutDataSourceRecords, validateBuildCloseoutDataSourceRecords } from './build-closeout-data-source.js'
      export function getFoundationBuildCloseouts() { return getBuildCloseoutDataSourceRecords() }
    `,
    sourceContractsSource: `
      import { getBuildCloseoutDataSourceContract } from './build-closeout-data-source.js'
      const sourceContracts = [getBuildCloseoutDataSourceContract()]
    `,
    codeQualityAuditSource: `
      import { evaluateBuildCloseoutDataSourceUsage, BUILD_CLOSEOUT_DATA_SOURCE_CARD_ID } from './build-closeout-data-source.js'
      const buildCloseoutDataSourceUsage = evaluateBuildCloseoutDataSourceUsage({})
      const proposedCard = BUILD_CLOSEOUT_DATA_SOURCE_CARD_ID
    `,
    deepAuditClosureSource: `
      findingId: 'build-closeout-code-owned-data',
      routeStatus: 'done',
      targetCardId: 'BUILD-CLOSEOUT-DATA-SOURCE-001',
      targetCloseoutKey: 'build-closeout-data-source-v1',
    `,
  })
  const stale = evaluateBuildCloseoutDataSourceUsage({
    dataSourceSource: 'export const old = true',
    buildLogSource: `
      import { FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION, closeoutRecords } from './foundation-build-closeout-records.js'
      export function getFoundationBuildCloseouts() { return closeoutRecords }
    `,
    sourceContractsSource: 'const sourceContracts = []',
    codeQualityAuditSource: "proposedCard: 'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001'",
    deepAuditClosureSource: "findingId: 'build-closeout-code-owned-data', routeStatus: 'scoped'",
  })
  const runtimeHealthy = buildBuildCloseoutDataSourceSnapshot({
    sourceContracts: [getBuildCloseoutDataSourceContract()],
    registryRows: [{ sourceId: BUILD_CLOSEOUT_DATA_SOURCE_ID, active: true, contractHash: 'a'.repeat(64), title: 'Foundation Build Closeout History', status: 'Repo-backed data-source boundary live' }],
    records: getBuildCloseoutDataSourceRecords().slice(0, 400),
  })
  const missingRegistryFails = buildBuildCloseoutDataSourceSnapshot({
    sourceContracts: [getBuildCloseoutDataSourceContract()],
    registryRows: [],
    records: getBuildCloseoutDataSourceRecords().slice(0, 400),
  })

  return {
    ok: healthy.ok && !stale.ok && runtimeHealthy.ok && !missingRegistryFails.ok,
    healthy,
    stale,
    runtimeHealthy,
    missingRegistryFails,
    dogfoodInvariant: 'direct code-owned closeout registry access, missing source contract insertion, missing registry mirror, and scoped audit route all fail closed',
  }
}

export { FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION }
