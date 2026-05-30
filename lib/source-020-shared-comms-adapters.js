import crypto from 'node:crypto'

export const SOURCE_020_CARD_ID = 'SOURCE-020'
export const SOURCE_020_CLOSEOUT_KEY = 'source-020-shared-comms-adapters-v1'
export const SOURCE_020_PLAN_PATH = 'docs/process/source-020-shared-comms-adapters-plan.md'
export const SOURCE_020_APPROVAL_PATH = 'docs/process/approvals/SOURCE-020.json'
export const SOURCE_020_SCRIPT_PATH = 'scripts/process-source-020-check.mjs'
export const SOURCE_020_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-source-020-shared-comms-adapters-closeout.md'
export const SOURCE_020_NEXT_CARD_ID = 'DATA-002'

export const SOURCE_020_REQUIRED_FILES = [
  'lib/google-delegated.js',
  'lib/missive.js',
  'lib/slack.js',
  'scripts/sync-gmail-archive.mjs',
  'scripts/sync-missive-archive.mjs',
  'scripts/sync-slack-archive.mjs',
  'scripts/sync-meeting-notes-archive.mjs',
  'scripts/extract-email-attachments.mjs',
]

export const SOURCE_020_CHANGED_FILES = [
  'lib/source-020-shared-comms-adapters.js',
  SOURCE_020_SCRIPT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  SOURCE_020_PLAN_PATH,
  SOURCE_020_APPROVAL_PATH,
  SOURCE_020_CLOSEOUT_PATH,
  'package.json',
]

export const SOURCE_020_PROOF_COMMANDS = [
  'node --check lib/source-020-shared-comms-adapters.js scripts/process-source-020-check.mjs',
  'npm run process:source-020-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=SOURCE-020 --planApprovalRef=docs/process/approvals/SOURCE-020.json --closeoutKey=source-020-shared-comms-adapters-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=SOURCE-020 --closeoutKey=source-020-shared-comms-adapters-v1',
  'npm run process:foundation-ship -- --card=SOURCE-020 --planApprovalRef=docs/process/approvals/SOURCE-020.json --closeoutKey=source-020-shared-comms-adapters-v1 --commitRef=HEAD',
]

export const SOURCE_020_NOT_NEXT = [
  'No MEETING-VAULT-ACL-001 Phase B, broad meeting-vault cleanup, or Drive permissions mutation from this card.',
  'No live private source reruns, broad backfill, browser login, paid/provider access, credential mutation, external sends, or public exposure.',
  'No automatic backlog, atom, KB, synthesis, action-route, vector, ClickUp, CRM, or external writes from adapter content.',
  'No raw email, Slack, Missive, meeting note, meeting transcript, or attachment content in proof output.',
]

const REQUIRED_ARTIFACTS = [
  { sourceId: 'SRC-GMAIL-001', artifactType: 'email_thread' },
  { sourceId: 'SRC-GMAIL-001', artifactType: 'gmail_attachment' },
  { sourceId: 'SRC-MISSIVE-001', artifactType: 'missive_thread' },
  { sourceId: 'SRC-SLACK-001', artifactType: 'slack_thread' },
  { sourceId: 'SRC-MEETINGS-001', artifactType: 'meeting_note' },
  { sourceId: 'SRC-MEETINGS-001', artifactType: 'meeting_transcript' },
]

const ADAPTER_SPECS = [
  {
    key: 'google-delegated',
    sourceIds: ['SRC-GMAIL-001', 'SRC-GDRIVE-001', 'SRC-GCAL-001', 'SRC-MEETINGS-001'],
    adapterFile: 'lib/google-delegated.js',
    requiredFunctions: [
      'driveSearch',
      'driveListFolder',
      'driveExportDoc',
      'listGmailMessages',
      'getGmailThread',
      'downloadGmailAttachment',
      'listCalendarEvents',
    ],
    paginationSignals: ['pageToken', 'nextPageToken'],
    syncScripts: [
      'scripts/sync-gmail-archive.mjs',
      'scripts/sync-meeting-notes-archive.mjs',
      'scripts/extract-email-attachments.mjs',
    ],
    requiredTargetKeys: ['gmail-current-day', 'email-attachments-backfill', 'meetings-current-day'],
  },
  {
    key: 'missive',
    sourceIds: ['SRC-MISSIVE-001'],
    adapterFile: 'lib/missive.js',
    requiredFunctions: [
      'getMissiveHealth',
      'listMissiveInbox',
      'searchMissiveConversations',
      'getMissiveConversation',
      'listMissiveMessages',
      'listMissiveComments',
      'getMissiveThread',
    ],
    paginationSignals: ['limit', 'until', 'conversations'],
    syncScripts: ['scripts/sync-missive-archive.mjs'],
    requiredTargetKeys: ['missive-current-day'],
  },
  {
    key: 'slack',
    sourceIds: ['SRC-SLACK-001'],
    adapterFile: 'lib/slack.js',
    requiredFunctions: [
      'getSlackHealth',
      'listSlackChannels',
      'getSlackChannelHistory',
      'getSlackThreadReplies',
      'getSlackPermalink',
    ],
    paginationSignals: ['cursor', 'next_cursor'],
    syncScripts: ['scripts/sync-slack-archive.mjs'],
    requiredTargetKeys: ['slack-current-day'],
  },
]

const FORBIDDEN_SYNC_TOKENS = [
  'sendGmailMessage',
  'createDrivePermission',
  'deleteDrivePermission',
  'updateSheetValues',
  'batchUpdateSheetValues',
  'clearSheetValues',
  'createDriveFolder',
  'createDriveTextFile',
]

function text(value) {
  return String(value || '').trim()
}

function number(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function unique(values = []) {
  return [...new Set(values.map(value => text(value)).filter(Boolean))]
}

function hash(value = '') {
  return crypto.createHash('sha256').update(text(value)).digest('hex').slice(0, 16)
}

function toIso(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function containsExportedFunction(source = '', functionName = '') {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`export\\s+async\\s+function\\s+${escaped}\\s*\\(`).test(source) ||
    new RegExp(`export\\s+function\\s+${escaped}\\s*\\(`).test(source)
}

function evaluateAdapterSpec(spec, fileSources = {}) {
  const adapterSource = text(fileSources[spec.adapterFile])
  const missingFunctions = spec.requiredFunctions.filter(fn => !containsExportedFunction(adapterSource, fn))
  const missingPaginationSignals = spec.paginationSignals.filter(signal => !adapterSource.includes(signal))
  const scriptFindings = spec.syncScripts.map(scriptPath => {
    const source = text(fileSources[scriptPath])
    const forbiddenTokens = FORBIDDEN_SYNC_TOKENS.filter(token => source.includes(token))
    return {
      scriptPath,
      present: Boolean(source),
      forbiddenTokens,
      hasArtifactWrite: /upsertSharedCommunicationArtifact|recordSharedCommunicationArtifact|shared communications archive|SharedCommunicationArtifact/i.test(source),
      hasLedgerWrite: /recordSourceCrawlItem|source_crawl|crawl item|finishExtractionTargetRun|cursorState/i.test(source),
    }
  })
  const failedScripts = scriptFindings.filter(row => !row.present || row.forbiddenTokens.length || !row.hasArtifactWrite)
  const ok = Boolean(adapterSource) &&
    missingFunctions.length === 0 &&
    missingPaginationSignals.length === 0 &&
    failedScripts.length === 0
  return {
    key: spec.key,
    sourceIds: spec.sourceIds,
    adapterFile: spec.adapterFile,
    syncScripts: spec.syncScripts,
    requiredTargetKeys: spec.requiredTargetKeys,
    missingFunctions,
    missingPaginationSignals,
    scriptFindings,
    ok,
  }
}

function evaluateTargets(targetRows = []) {
  const targets = targetRows.map(row => ({
    targetKey: text(row.targetKey || row.target_key),
    sourceId: text(row.sourceId || row.source_id),
    status: text(row.status),
    runtimeMode: text(row.runtimeMode || row.runtime_mode),
    lastRunAt: toIso(row.lastRunAt || row.last_run_at),
    nextRunAt: toIso(row.nextRunAt || row.next_run_at),
    lastStatus: text(row.lastStatus || row.last_status),
    lastError: text(row.lastError || row.last_error),
    inspectedCount: number(row.inspectedCount || row.inspected_count),
    archivedCount: number(row.archivedCount || row.archived_count),
    extractedCount: number(row.extractedCount || row.extracted_count),
  }))
  const activeFailures = targets.filter(row => row.status === 'active' && row.lastStatus && row.lastStatus !== 'succeeded')
  const activeMissingRuns = targets.filter(row => row.status === 'active' && !row.lastRunAt)
  const pausedTargets = targets.filter(row => row.status === 'paused')
  return {
    targets,
    activeCount: targets.filter(row => row.status === 'active').length,
    activeFailures,
    activeMissingRuns,
    pausedTargets,
    ok: activeFailures.length === 0 && activeMissingRuns.length === 0,
  }
}

function evaluateArtifactCoverage(artifactRows = []) {
  const artifactMap = new Map()
  for (const row of artifactRows) {
    const sourceId = text(row.sourceId || row.source_id)
    const artifactType = text(row.artifactType || row.artifact_type)
    const key = `${sourceId}:${artifactType}`
    artifactMap.set(key, {
      sourceId,
      artifactType,
      total: number(row.total),
      latestIngestedAt: toIso(row.latestIngestedAt || row.latest_ingested_at),
    })
  }
  const required = REQUIRED_ARTIFACTS.map(item => ({
    ...item,
    key: `${item.sourceId}:${item.artifactType}`,
    total: artifactMap.get(`${item.sourceId}:${item.artifactType}`)?.total || 0,
    latestIngestedAt: artifactMap.get(`${item.sourceId}:${item.artifactType}`)?.latestIngestedAt || '',
  }))
  const missing = required.filter(row => row.total < 1)
  return {
    required,
    missing,
    total: [...artifactMap.values()].reduce((sum, row) => sum + row.total, 0),
    ok: missing.length === 0,
  }
}

export function buildSource020AdapterHardeningSnapshot({
  fileSources = {},
  targetRows = [],
  artifactRows = [],
  now = new Date(),
} = {}) {
  const adapters = ADAPTER_SPECS.map(spec => evaluateAdapterSpec(spec, fileSources))
  const targetStatus = evaluateTargets(targetRows)
  const artifactCoverage = evaluateArtifactCoverage(artifactRows)
  const requiredTargetKeys = unique(ADAPTER_SPECS.flatMap(spec => spec.requiredTargetKeys))
  const presentTargetKeys = unique(targetStatus.targets.map(row => row.targetKey))
  const missingTargetKeys = requiredTargetKeys.filter(key => !presentTargetKeys.includes(key))
  const failures = []
  const warnings = []

  for (const adapter of adapters) {
    if (!adapter.ok) {
      failures.push(`${adapter.key} adapter hardening failed`)
    }
  }
  if (!targetStatus.ok) failures.push('one or more active shared-comms source targets are not latest-successful')
  if (missingTargetKeys.length) failures.push(`missing shared-comms target keys: ${missingTargetKeys.join(', ')}`)
  if (!artifactCoverage.ok) failures.push(`missing required shared-comms artifact lanes: ${artifactCoverage.missing.map(row => row.key).join(', ')}`)
  if (targetStatus.pausedTargets.length) warnings.push(`${targetStatus.pausedTargets.length} paused target(s) remain explicit and non-blocking`)

  return {
    generatedAt: (now instanceof Date ? now : new Date(now)).toISOString(),
    cardId: SOURCE_020_CARD_ID,
    closeoutKey: SOURCE_020_CLOSEOUT_KEY,
    status: failures.length ? 'risk' : 'ready',
    adapters,
    targetStatus,
    artifactCoverage,
    requiredTargetKeys,
    presentTargetKeys,
    missingTargetKeys,
    privacyBoundary: {
      readFirst: true,
      proofOnly: true,
      rawContentInOutput: false,
      externalWrites: false,
      drivePermissionMutation: false,
      livePrivateRerun: false,
    },
    warnings,
    failures,
    proofHash: hash(JSON.stringify({
      adapters: adapters.map(adapter => ({ key: adapter.key, ok: adapter.ok })),
      targets: targetStatus.targets.map(row => `${row.targetKey}:${row.status}:${row.lastStatus}`),
      artifacts: artifactCoverage.required.map(row => `${row.key}:${row.total}`),
    })),
  }
}

export function buildSource020DogfoodProof() {
  const goodSources = {
    'lib/google-delegated.js': 'export async function driveSearch() { const pageToken = ""; const nextPageToken = ""; }\nexport async function driveListFolder() {}\nexport async function driveExportDoc() {}\nexport async function listGmailMessages() { const pageToken = ""; const nextPageToken = ""; }\nexport async function getGmailThread() {}\nexport async function downloadGmailAttachment() {}\nexport async function listCalendarEvents() {}',
    'scripts/sync-gmail-archive.mjs': 'Sync Gmail threads into shared communications archive; upsertSharedCommunicationArtifact(); recordSourceCrawlItem();',
    'scripts/sync-meeting-notes-archive.mjs': 'Sync meeting artifacts into shared communications archive; upsertSharedCommunicationArtifact(); recordSourceCrawlItem();',
    'scripts/extract-email-attachments.mjs': 'upsertSharedCommunicationArtifact(); recordSourceCrawlItem();',
  }
  const goodGoogle = evaluateAdapterSpec(ADAPTER_SPECS[0], goodSources)
  const missingFunction = evaluateAdapterSpec(ADAPTER_SPECS[0], {
    ...goodSources,
    'lib/google-delegated.js': goodSources['lib/google-delegated.js'].replace('export async function driveSearch() { const pageToken = ""; const nextPageToken = ""; }', ''),
  })
  const unsafeScript = evaluateAdapterSpec(ADAPTER_SPECS[0], {
    ...goodSources,
    'scripts/sync-gmail-archive.mjs': `${goodSources['scripts/sync-gmail-archive.mjs']} createDrivePermission();`,
  })
  const failedTarget = evaluateTargets([
    { target_key: 'gmail-current-day', source_id: 'SRC-GMAIL-001', status: 'active', last_status: 'failed', last_run_at: new Date().toISOString() },
  ])
  const missingArtifact = evaluateArtifactCoverage([])
  const cases = [
    { name: 'valid-google-adapter', shouldPass: true, ok: goodGoogle.ok },
    { name: 'missing-adapter-function', shouldPass: false, ok: missingFunction.ok },
    { name: 'unsafe-sync-mutation-token', shouldPass: false, ok: unsafeScript.ok },
    { name: 'failed-active-target', shouldPass: false, ok: failedTarget.ok },
    { name: 'missing-artifact-lane', shouldPass: false, ok: missingArtifact.ok },
  ]
  const failed = cases.filter(testCase => testCase.ok !== testCase.shouldPass)
  return {
    ok: failed.length === 0,
    passed: cases.filter(testCase => testCase.ok === testCase.shouldPass).map(testCase => testCase.name),
    failed,
    rejectedCases: cases.filter(testCase => !testCase.shouldPass).map(testCase => testCase.name),
  }
}
