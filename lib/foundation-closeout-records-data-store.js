import {
  buildFoundationBuildCloseoutDataArtifactSnapshot,
  validateFoundationBuildCloseoutDataArtifactRecords,
} from './foundation-build-closeout-data-artifacts.js'
import {
  getFoundationBuildCloseouts,
  getFoundationBuildCloseoutValidation,
} from './foundation-build-log.js'

export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CARD_ID = 'FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001'
export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CLOSEOUT_KEY = 'foundation-closeout-records-data-store-v1'
export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_PLAN_PATH = 'docs/process/foundation-closeout-records-data-store-001-plan.md'
export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001.json'
export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_SCRIPT_PATH = 'scripts/process-foundation-closeout-records-data-store-check.mjs'
export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_NEXT_CARD_ID = 'FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001'
export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_DATA_PATH = 'data/foundation-build-closeouts/source-newsletter-records.json'
export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_OVERNIGHT_DATA_PATH = 'data/foundation-build-closeouts/overnight-records.json'
export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_DATA_PATHS = [
  FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_DATA_PATH,
  FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_OVERNIGHT_DATA_PATH,
]
export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_MIGRATED_ARTIFACTS = [
  {
    artifactId: 'source-newsletter-records',
    label: 'source-newsletter',
    expectedRecordCount: 6,
    wrapperPath: 'lib/foundation-build-closeout-source-newsletter-records.js',
  },
  {
    artifactId: 'overnight-records',
    label: 'overnight',
    expectedRecordCount: 103,
    wrapperPath: 'lib/foundation-build-closeout-overnight-records.js',
  },
]

export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_PROOF_COMMANDS = [
  'node --check lib/foundation-build-closeout-data-artifacts.js',
  'node --check lib/foundation-closeout-records-data-store.js',
  'node --check scripts/process-foundation-closeout-records-data-store-check.mjs',
  'npm run process:foundation-closeout-records-data-store-check -- --apply --stage=building_now --json',
  'npm run process:foundation-closeout-records-data-store-check -- --close-card --json',
  'npm run process:build-closeout-data-source-check -- --json',
  'npm run process:build-closeout-registry-extract-check -- --json',
  'npm run process:foundation-tuneup-roadmap-check -- --json',
  'npm run process:builder-memory-system-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CARD_ID} --planApprovalRef=${FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_APPROVAL_PATH} --closeoutKey=${FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CARD_ID} --closeoutKey=${FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CARD_ID} --planApprovalRef=${FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_APPROVAL_PATH} --closeoutKey=${FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CHANGED_FILES = [
  'lib/foundation-build-closeout-data-artifacts.js',
  'lib/foundation-closeout-records-data-store.js',
  'lib/foundation-build-closeout-source-newsletter-records.js',
  'lib/foundation-build-closeout-overnight-records.js',
  'lib/foundation-build-log-source.js',
  'lib/build-closeout-registry-extract.js',
  'lib/foundation-build-closeout-process-gate-operations-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_DATA_PATH,
  FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_OVERNIGHT_DATA_PATH,
  FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_PLAN_PATH,
  FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_APPROVAL_PATH,
  FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_SCRIPT_PATH,
  'package.json',
]

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function countLines(source = '') {
  if (!source) return 0
  return String(source).split(/\r?\n/).length
}

export function buildFoundationCloseoutRecordsDataStoreDogfoodProof() {
  const missingProofValidation = validateFoundationBuildCloseoutDataArtifactRecords([
    {
      key: 'synthetic-closeout',
      backlogIds: ['SYNTHETIC-001'],
      systemArea: 'Synthetic',
      status: 'accepted',
      acceptanceState: 'Verified',
      whatChanged: 'x',
      whatItDoes: 'x',
      whyItMatters: 'x',
      whereItLives: ['x'],
      proofStatus: 'x',
      reviewNext: 'x',
    },
  ])
  const duplicateValidation = validateFoundationBuildCloseoutDataArtifactRecords([
    {
      key: 'duplicate-closeout',
      backlogIds: ['SYNTHETIC-001'],
      systemArea: 'Synthetic',
      status: 'accepted',
      acceptanceState: 'Verified',
      whatChanged: 'x',
      whatItDoes: 'x',
      whyItMatters: 'x',
      whereItLives: ['x'],
      proofCommands: ['npm run foundation:verify'],
      proofStatus: 'x',
      reviewNext: 'x',
    },
    {
      key: 'duplicate-closeout',
      backlogIds: ['SYNTHETIC-002'],
      systemArea: 'Synthetic',
      status: 'accepted',
      acceptanceState: 'Verified',
      whatChanged: 'x',
      whatItDoes: 'x',
      whyItMatters: 'x',
      whereItLives: ['x'],
      proofCommands: ['npm run foundation:verify'],
      proofStatus: 'x',
      reviewNext: 'x',
    },
  ])
  return {
    ok: !missingProofValidation.ok && !duplicateValidation.ok,
    missingProofRejected: !missingProofValidation.ok &&
      missingProofValidation.invalid.includes('synthetic-closeout'),
    duplicateRejected: !duplicateValidation.ok &&
      duplicateValidation.duplicateKeys.includes('duplicate-closeout'),
  }
}

export function buildFoundationCloseoutRecordsDataStoreSnapshot({
  wrapperSource = '',
  wrapperSources = {},
  overnightWrapperSource = '',
  buildLogSourceHelperSource = '',
  registryExtractSource = '',
  closeouts = getFoundationBuildCloseouts(),
  validation = getFoundationBuildCloseoutValidation(),
  artifactSnapshot = buildFoundationBuildCloseoutDataArtifactSnapshot(),
} = {}) {
  const migratedArtifacts = FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_MIGRATED_ARTIFACTS
    .map(expected => ({
      ...expected,
      artifact: artifactSnapshot.find(row => row.artifactId === expected.artifactId) || null,
      wrapperSource: wrapperSources[expected.wrapperPath] ||
        (expected.artifactId === 'source-newsletter-records' ? wrapperSource : '') ||
        (expected.artifactId === 'overnight-records' ? overnightWrapperSource : ''),
    }))
  const migratedKeys = migratedArtifacts.flatMap(row => row.artifact?.keys || [])
  const closeoutKeys = new Set(closeouts.map(record => record.key))
  const missingMigratedKeys = migratedKeys.filter(key => !closeoutKeys.has(key))
  const wrapperLineCounts = Object.fromEntries(
    migratedArtifacts.map(row => [row.wrapperPath, countLines(row.wrapperSource)]),
  )
  const wrapperLines = wrapperLineCounts['lib/foundation-build-closeout-source-newsletter-records.js'] || 0
  const dogfood = buildFoundationCloseoutRecordsDataStoreDogfoodProof()
  const checks = []

  for (const row of migratedArtifacts) {
    const rowWrapperLines = wrapperLineCounts[row.wrapperPath] || 0
    addCheck(
      checks,
      row.artifact?.validation?.ok === true && row.artifact.recordCount === row.expectedRecordCount,
      `${row.label} closeouts load from JSON data artifact`,
      row.artifact ? `${row.artifact.relativePath} records=${row.artifact.recordCount}` : 'missing artifact',
    )
    addCheck(
      checks,
      rowWrapperLines <= 12 &&
        row.wrapperSource.includes('loadFoundationBuildCloseoutDataArtifact') &&
        !row.wrapperSource.includes('whatChanged:'),
      `${row.label} JS module is a thin data-loader wrapper`,
      `${rowWrapperLines} lines`,
    )
  }
  addCheck(
    checks,
    validation.invalidCloseoutKeys.length === 0 &&
      validation.ownershipOverlapViolations.length === 0 &&
      missingMigratedKeys.length === 0,
    'Build Log closeout validation still covers migrated records',
    `total=${closeouts.length} missingMigratedKeys=${missingMigratedKeys.length} invalid=${validation.invalidCloseoutKeys.length}`,
  )
  addCheck(
    checks,
    FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_DATA_PATHS.every(relativePath => buildLogSourceHelperSource.includes(relativePath)) &&
      buildLogSourceHelperSource.includes('FOUNDATION_BUILD_CLOSEOUT_SOURCE_NEWSLETTER_RECORDS_DATA_PATH') &&
      buildLogSourceHelperSource.includes('FOUNDATION_BUILD_CLOSEOUT_OVERNIGHT_RECORDS_DATA_PATH'),
    'registry source visibility includes migrated JSON artifact',
    FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_DATA_PATHS.join(', '),
  )
  addCheck(
    checks,
    FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_DATA_PATHS.every(relativePath => registryExtractSource.includes(relativePath)),
    'registry extract proof treats JSON artifacts as closeout source visibility',
    FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_DATA_PATHS.join(', '),
  )
  addCheck(
    checks,
    dogfood.ok && dogfood.missingProofRejected && dogfood.duplicateRejected,
    'data artifact validator rejects missing proof commands and duplicate keys',
    `missingProof=${dogfood.missingProofRejected} duplicate=${dogfood.duplicateRejected}`,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    cardId: FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CARD_ID,
    closeoutKey: FOUNDATION_CLOSEOUT_RECORDS_DATA_STORE_CLOSEOUT_KEY,
    migratedArtifact: migratedArtifacts[0]?.artifact || null,
    migratedArtifacts: migratedArtifacts.map(row => row.artifact).filter(Boolean),
    totalCloseouts: closeouts.length,
    wrapperLines,
    wrapperLineCounts,
    validation,
    dogfood,
    checks,
    failed,
  }
}
