import {
  DRIVE_CONTENT_TARGET_KEY,
  DRIVE_CORPUS_TARGET_KEY,
  buildDriveWorkerStatus,
} from './drive-worker-proof.js'

export const SOURCE_003_CARD_ID = 'SOURCE-003'
export const SOURCE_003_SOURCE_ID = 'SRC-GDRIVE-001'
export const SOURCE_003_CLOSEOUT_KEY = 'source-003-drive-source-contract-v1'
export const SOURCE_003_PLAN_PATH = 'docs/process/source-003-drive-source-contract-plan.md'
export const SOURCE_003_APPROVAL_PATH = 'docs/process/approvals/SOURCE-003.json'
export const SOURCE_003_SCRIPT_PATH = 'scripts/process-source-003-check.mjs'
export const SOURCE_003_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-source-003-drive-source-contract-closeout.md'

export const SOURCE_003_CHANGED_FILES = [
  'lib/source-003-drive-source-contract.js',
  'lib/source-contracts.js',
  'lib/source-lifecycle-completion.js',
  'docs/source-registry.md',
  'docs/source-notes/google-drive-corpus.md',
  SOURCE_003_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_003_PLAN_PATH,
  SOURCE_003_APPROVAL_PATH,
  SOURCE_003_CLOSEOUT_PATH,
]

export const SOURCE_003_PROOF_COMMANDS = [
  `node --check lib/source-003-drive-source-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js ${SOURCE_003_SCRIPT_PATH}`,
  'npm run process:source-003-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${SOURCE_003_CARD_ID} --planApprovalRef=${SOURCE_003_APPROVAL_PATH} --closeoutKey=${SOURCE_003_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${SOURCE_003_CARD_ID} --closeoutKey=${SOURCE_003_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${SOURCE_003_CARD_ID} --planApprovalRef=${SOURCE_003_APPROVAL_PATH} --closeoutKey=${SOURCE_003_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SOURCE_003_NOT_NEXT = [
  'Do not mutate Google Drive permissions, sharing, ACLs, owners, or file locations.',
  'Do not send request-access emails or external messages.',
  'Do not mutate credentials, OAuth scopes, provider config, or source access.',
  'Do not run broad private Drive sweeps outside governed bounded targets.',
  'Do not expose raw Drive content to broad team or agent surfaces.',
  'Do not treat the Strategy Folder as canonical strategy truth.',
  'Do not add media/video/vision/provider/browser-auth extraction in SOURCE-003.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
]

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function add(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function hasDriveMutationToken(source = '') {
  return [
    /drive\.permissions\./i,
    /permissions\.(?:create|update|delete|patch)\b/i,
    /files\.(?:create|copy|update|delete|trash|untrash)\b/i,
    /method:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/i,
    /\brequestAccess\b/i,
    /\bsendRequestAccess\b/i,
  ].some(pattern => pattern.test(String(source || '')))
}

export function evaluateSource003ContractFixture(fixture = {}) {
  const checks = []
  add(checks, fixture.sourceSignedOff === true, 'source is signed off for current read-side Drive reality')
  add(checks, fixture.inventoryTargetSucceeded === true, 'Drive inventory lane has a successful governed run')
  add(checks, fixture.contentTargetSucceeded === true, 'Drive content lane has a successful governed run')
  add(checks, Number(fixture.driveArtifactCount || 0) >= 100, 'Drive source-backed artifacts exist')
  add(checks, fixture.noDrivePermissionMutation === true, 'Drive permission mutation is not approved')
  add(checks, fixture.strategyFolderBoundaryPreserved === true, 'Strategy Folder remains evidence intake, not canonical strategy truth')
  add(checks, fixture.unsafeMediaVisionParked === true, 'media/video/vision/provider extraction stays parked')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'risk' : 'healthy', checks, failed }
}

export function buildSource003DogfoodProof() {
  const healthy = evaluateSource003ContractFixture({
    sourceSignedOff: true,
    inventoryTargetSucceeded: true,
    contentTargetSucceeded: true,
    driveArtifactCount: 143,
    noDrivePermissionMutation: true,
    strategyFolderBoundaryPreserved: true,
    unsafeMediaVisionParked: true,
  })
  const rejected = {
    connectorOnly: evaluateSource003ContractFixture({
      sourceSignedOff: false,
      inventoryTargetSucceeded: true,
      contentTargetSucceeded: true,
      driveArtifactCount: 143,
      noDrivePermissionMutation: true,
      strategyFolderBoundaryPreserved: true,
      unsafeMediaVisionParked: true,
    }),
    noInventory: evaluateSource003ContractFixture({
      sourceSignedOff: true,
      inventoryTargetSucceeded: false,
      contentTargetSucceeded: true,
      driveArtifactCount: 143,
      noDrivePermissionMutation: true,
      strategyFolderBoundaryPreserved: true,
      unsafeMediaVisionParked: true,
    }),
    noContent: evaluateSource003ContractFixture({
      sourceSignedOff: true,
      inventoryTargetSucceeded: true,
      contentTargetSucceeded: false,
      driveArtifactCount: 143,
      noDrivePermissionMutation: true,
      strategyFolderBoundaryPreserved: true,
      unsafeMediaVisionParked: true,
    }),
    unsafePermissionMutation: evaluateSource003ContractFixture({
      sourceSignedOff: true,
      inventoryTargetSucceeded: true,
      contentTargetSucceeded: true,
      driveArtifactCount: 143,
      noDrivePermissionMutation: false,
      strategyFolderBoundaryPreserved: true,
      unsafeMediaVisionParked: true,
    }),
    canonicalStrategyConfusion: evaluateSource003ContractFixture({
      sourceSignedOff: true,
      inventoryTargetSucceeded: true,
      contentTargetSucceeded: true,
      driveArtifactCount: 143,
      noDrivePermissionMutation: true,
      strategyFolderBoundaryPreserved: false,
      unsafeMediaVisionParked: true,
    }),
    mediaVisionLeak: evaluateSource003ContractFixture({
      sourceSignedOff: true,
      inventoryTargetSucceeded: true,
      contentTargetSucceeded: true,
      driveArtifactCount: 143,
      noDrivePermissionMutation: true,
      strategyFolderBoundaryPreserved: true,
      unsafeMediaVisionParked: false,
    }),
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(result => !result.ok),
    healthy,
    rejected,
    invariant: 'Drive can be signed off only when governed inventory/content lanes are healthy, source artifacts exist, permission mutation stays blocked, strategy evidence remains non-canonical, and media/vision/provider work stays parked.',
  }
}

export function buildSource003ContractStatus({
  artifactSummary = {},
  registryRows = [],
  sourceContracts = [],
  sourceLifecycleRows = [],
  targetRows = [],
  corpusItems = [],
  contentItems = [],
  sources = {},
} = {}) {
  const checks = []
  const contract = asArray(sourceContracts).find(source => source.sourceId === SOURCE_003_SOURCE_ID) || {}
  const registryRow = asArray(registryRows).find(row => row.source_id === SOURCE_003_SOURCE_ID || row.sourceId === SOURCE_003_SOURCE_ID) || {}
  const lifecycleRow = asArray(sourceLifecycleRows).find(row => row.sourceId === SOURCE_003_SOURCE_ID || row.source_id === SOURCE_003_SOURCE_ID) || {}
  const corpusTarget = asArray(targetRows).find(row => row.target_key === DRIVE_CORPUS_TARGET_KEY || row.targetKey === DRIVE_CORPUS_TARGET_KEY) || {}
  const contentTarget = asArray(targetRows).find(row => row.target_key === DRIVE_CONTENT_TARGET_KEY || row.targetKey === DRIVE_CONTENT_TARGET_KEY) || {}
  const contractText = lower(`${contract.validationScope || ''} ${contract.boundaryNote || ''} ${contract.manualRefresh || ''}`)
  const lifecycleText = lower(`${lifecycleRow.scopeNote || lifecycleRow.scope_note || ''} ${lifecycleRow.detail || ''} ${lifecycleRow.reason || ''} ${lifecycleRow.nextAction || lifecycleRow.next_action || ''}`)
  const sourceRegistrySource = sources.sourceRegistrySource || ''
  const driveNoteSource = sources.driveNoteSource || ''
  const inventorySource = sources.inventoryDriveCorpusSource || ''
  const contentSource = sources.extractDriveContentSource || ''
  const driveWorkerStatus = buildDriveWorkerStatus({
    corpusTarget: {
      targetKey: DRIVE_CORPUS_TARGET_KEY,
      status: corpusTarget.status,
      lastStatus: corpusTarget.last_status || corpusTarget.lastStatus,
    },
    contentTarget: {
      targetKey: DRIVE_CONTENT_TARGET_KEY,
      status: contentTarget.status,
      lastStatus: contentTarget.last_status || contentTarget.lastStatus,
    },
    corpusItems,
    contentItems,
  })

  add(checks, contract.status === 'V1 Source Boundary Locked' && contract.validation === 'Signed Off For Current Reality', 'source contract is signed off for current Drive read-side reality', `${contract.status || 'missing'} / ${contract.validation || 'missing'}`)
  add(checks, /permission mutation|request-access|broad private drive sweeps|oauth/.test(contractText), 'validation scope blocks Drive permission/access mutation and broad sweeps', contract.validationScope || 'missing validationScope')
  add(checks, /strategy folder/.test(contractText) && /canonical strategy/.test(contractText), 'boundary note preserves Drive evidence versus canonical strategy roles', contract.boundaryNote || 'missing boundaryNote')
  add(checks, contract.lastVerified === '2026-05-20', 'source contract has fresh verification date', contract.lastVerified || 'missing')
  add(checks, registryRow.status === 'V1 Source Boundary Locked' && registryRow.validation === 'Signed Off For Current Reality', 'DB source registry is synced for Drive contract', `${registryRow.status || 'missing'} / ${registryRow.validation || 'missing'}`)
  add(checks, lifecycleRow.completionState === 'complete' && ['covered', 'partial_with_blocker'].includes(lifecycleRow.coverageStatus), 'source lifecycle treats Drive as complete with explicit blocked follow-up lanes', `${lifecycleRow.completionState || 'missing'} / ${lifecycleRow.coverageStatus || 'missing'}`)
  add(checks, /drive corpus inventory/.test(lifecycleText) && /drive permission mutation/.test(lifecycleText), 'source lifecycle records Drive read-side scope boundary', lifecycleText || 'missing scope note')
  add(checks, corpusTarget.status === 'active' && corpusTarget.runtime_mode === 'scheduled' && corpusTarget.last_status === 'succeeded', 'drive-corpus-backfill target is active, scheduled, and latest succeeded', `${corpusTarget.status || 'missing'}/${corpusTarget.runtime_mode || 'missing'}/${corpusTarget.last_status || 'missing'}`)
  add(checks, contentTarget.status === 'active' && contentTarget.runtime_mode === 'scheduled' && contentTarget.last_status === 'succeeded', 'drive-content-extract-backfill target is active, scheduled, and latest succeeded', `${contentTarget.status || 'missing'}/${contentTarget.runtime_mode || 'missing'}/${contentTarget.last_status || 'missing'}`)
  add(checks, Number(corpusTarget.inspected_count || 0) >= 200, 'Drive corpus inventory has material inspected count', String(corpusTarget.inspected_count || 0))
  add(checks, Number(contentTarget.archived_count || 0) >= 100, 'Drive content lane has material archived count', String(contentTarget.archived_count || 0))
  add(checks, Number(artifactSummary.totalDriveArtifacts || 0) >= 100, 'Drive artifacts exist in shared archive', `driveArtifacts=${artifactSummary.totalDriveArtifacts || 0}`)
  add(checks, driveWorkerStatus.ok, 'Drive worker ledger supports source sign-off', driveWorkerStatus.failed.map(item => item.check).join(', ') || 'ready')
  add(checks, !hasDriveMutationToken(`${inventorySource}\n${contentSource}`), 'Drive inventory/content scripts do not mutate permissions or files', hasDriveMutationToken(`${inventorySource}\n${contentSource}`) ? 'mutation token found' : 'read-only/extraction-only scripts')
  add(checks, sourceRegistrySource.includes('SRC-GDRIVE-001') && sourceRegistrySource.includes('V1 Source Boundary Locked') && sourceRegistrySource.includes('Drive permission mutation'), 'source registry records Drive sign-off', 'docs/source-registry.md')
  add(checks, driveNoteSource.includes('Current V1 Boundary') && driveNoteSource.includes('drive-corpus-backfill') && driveNoteSource.includes('not canonical strategy truth'), 'Drive source note documents current V1 boundary', 'docs/source-notes/google-drive-corpus.md')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    sourceId: SOURCE_003_SOURCE_ID,
    closeoutKey: SOURCE_003_CLOSEOUT_KEY,
    artifactSummary,
    driveWorkerStatus,
    targetKeys: asArray(targetRows).map(row => row.target_key || row.targetKey).filter(Boolean),
    checks,
    failed,
  }
}
