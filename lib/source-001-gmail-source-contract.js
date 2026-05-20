export const SOURCE_001_CARD_ID = 'SOURCE-001'
export const SOURCE_001_SOURCE_ID = 'SRC-GMAIL-001'
export const SOURCE_001_NEXT_CARD_ID = 'SOURCE-002'
export const SOURCE_001_CLOSEOUT_KEY = 'source-001-gmail-source-contract-v1'
export const SOURCE_001_PLAN_PATH = 'docs/process/source-001-gmail-source-contract-plan.md'
export const SOURCE_001_APPROVAL_PATH = 'docs/process/approvals/SOURCE-001.json'
export const SOURCE_001_SCRIPT_PATH = 'scripts/process-source-001-check.mjs'
export const SOURCE_001_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-source-001-gmail-source-contract-closeout.md'

export const SOURCE_001_CHANGED_FILES = [
  'lib/source-001-gmail-source-contract.js',
  'lib/source-contracts.js',
  'lib/source-lifecycle-completion.js',
  'docs/source-registry.md',
  'docs/source-notes/shared-communications.md',
  SOURCE_001_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_001_PLAN_PATH,
  SOURCE_001_APPROVAL_PATH,
  SOURCE_001_CLOSEOUT_PATH,
]

export const SOURCE_001_PROOF_COMMANDS = [
  `node --check lib/source-001-gmail-source-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js ${SOURCE_001_SCRIPT_PATH}`,
  'npm run process:source-001-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${SOURCE_001_CARD_ID} --planApprovalRef=${SOURCE_001_APPROVAL_PATH} --closeoutKey=${SOURCE_001_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${SOURCE_001_CARD_ID} --closeoutKey=${SOURCE_001_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${SOURCE_001_CARD_ID} --planApprovalRef=${SOURCE_001_APPROVAL_PATH} --closeoutKey=${SOURCE_001_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SOURCE_001_NOT_NEXT = [
  'Do not send Gmail.',
  'Do not mutate Gmail settings, credentials, labels, filters, or provider configuration.',
  'Do not approve broad team-mailbox exposure.',
  'Do not run broad historical private Gmail extraction from this card.',
  'Do not treat Gmail as Missive internal-comment, mention, assignment, or routing truth.',
  'Do not mutate Drive permissions.',
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

function isRecentEnough(value, maxAgeHours = 48) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= maxAgeHours * 60 * 60 * 1000
}

export function evaluateSource001ContractFixture(fixture = {}) {
  const checks = []
  add(checks, fixture.sourceSignedOff === true, 'source is signed off for current read-side reality')
  add(checks, fixture.currentSyncSucceeded === true, 'Gmail current-day sync has a successful governed run')
  add(checks, fixture.threadArchiveCount > 0, 'Gmail thread archive exists')
  add(checks, fixture.attachmentArtifactCount > 0, 'Gmail attachment artifacts exist')
  add(checks, fixture.noGmailSend === true, 'Gmail sends are not approved')
  add(checks, fixture.noCredentialMutation === true, 'credential/provider mutation is not approved')
  add(checks, fixture.missiveBoundaryPreserved === true, 'Missive internal-comment boundary is preserved')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'risk' : 'healthy', checks, failed }
}

export function buildSource001DogfoodProof() {
  const healthy = evaluateSource001ContractFixture({
    sourceSignedOff: true,
    currentSyncSucceeded: true,
    threadArchiveCount: 25,
    attachmentArtifactCount: 4,
    noGmailSend: true,
    noCredentialMutation: true,
    missiveBoundaryPreserved: true,
  })
  const rejected = {
    connectorOnly: evaluateSource001ContractFixture({
      sourceSignedOff: false,
      currentSyncSucceeded: true,
      threadArchiveCount: 25,
      attachmentArtifactCount: 4,
      noGmailSend: true,
      noCredentialMutation: true,
      missiveBoundaryPreserved: true,
    }),
    noCurrentSync: evaluateSource001ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: false,
      threadArchiveCount: 25,
      attachmentArtifactCount: 4,
      noGmailSend: true,
      noCredentialMutation: true,
      missiveBoundaryPreserved: true,
    }),
    missingAttachments: evaluateSource001ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: true,
      threadArchiveCount: 25,
      attachmentArtifactCount: 0,
      noGmailSend: true,
      noCredentialMutation: true,
      missiveBoundaryPreserved: true,
    }),
    unsafeSendApproval: evaluateSource001ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: true,
      threadArchiveCount: 25,
      attachmentArtifactCount: 4,
      noGmailSend: false,
      noCredentialMutation: true,
      missiveBoundaryPreserved: true,
    }),
    missiveBoundaryLost: evaluateSource001ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: true,
      threadArchiveCount: 25,
      attachmentArtifactCount: 4,
      noGmailSend: true,
      noCredentialMutation: true,
      missiveBoundaryPreserved: false,
    }),
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(result => result.ok === false),
    healthy,
    rejected,
    invariant: 'Gmail can be signed off only for delegated read-side current reality when governed current sync, thread archive, attachment artifacts, no-send posture, no credential mutation, and Missive boundary separation all hold.',
  }
}

export function buildSource001ContractStatus({
  artifactSummary = {},
  jobDefinitions = [],
  latestJobs = {},
  registryRows = [],
  sourceContracts = [],
  sourceLifecycleRows = [],
  targetRows = [],
  sources = {},
} = {}) {
  const checks = []
  const source = asArray(sourceContracts).find(contract => contract.sourceId === SOURCE_001_SOURCE_ID) || null
  const registryRow = asArray(registryRows).find(row => row.sourceId === SOURCE_001_SOURCE_ID || row.source_id === SOURCE_001_SOURCE_ID) || null
  const lifecycleRow = asArray(sourceLifecycleRows).find(row => row.sourceId === SOURCE_001_SOURCE_ID) || null
  const lifecycleBoundaryText = lower([
    lifecycleRow?.scopeNote,
    lifecycleRow?.reason,
    lifecycleRow?.nextAction,
  ].filter(Boolean).join(' '))
  const currentTarget = asArray(targetRows).find(row => row.target_key === 'gmail-current-day' || row.targetKey === 'gmail-current-day') || null
  const attachmentTarget = asArray(targetRows).find(row => row.target_key === 'email-attachments-backfill' || row.targetKey === 'email-attachments-backfill') || null
  const currentJobDefinition = asArray(jobDefinitions).find(job => job.key === 'gmail-sync-current') || null
  const candidateJobDefinition = asArray(jobDefinitions).find(job => job.key === 'gmail-extract-latest') || null
  const attachmentJobDefinition = asArray(jobDefinitions).find(job => job.key === 'email-attachment-extract-bite') || null
  const currentJob = latestJobs['gmail-sync-current'] || null
  const attachmentJob = latestJobs['email-attachment-extract-bite'] || null
  const candidateJob = latestJobs['gmail-extract-latest'] || null
  const syncScript = text(sources.syncGmailArchiveSource)
  const attachmentScript = text(sources.extractEmailAttachmentsSource)
  const sharedNote = text(sources.sharedCommsNoteSource)
  const sourceRegistry = text(sources.sourceRegistrySource)

  add(checks, source?.status === 'V1 Source Boundary Locked' && source?.validation === 'Signed Off For Current Reality', 'source contract is signed off for current read-side reality', `${source?.status || 'missing'} / ${source?.validation || 'missing'}`)
  add(checks, lower(source?.validationScope).includes('gmail sends') && lower(source?.validationScope).includes('missive internal-comment'), 'validation scope blocks sends and Missive-comment conflation', source?.validationScope || 'missing')
  add(checks, lower(source?.boundaryNote).includes('fallback mailbox') && lower(source?.boundaryNote).includes('missive remains'), 'boundary note preserves Gmail vs Missive roles', source?.boundaryNote || 'missing')
  add(checks, source?.lastVerified === '2026-05-20', 'source contract has fresh verification date', source?.lastVerified || 'missing')
  add(checks, registryRow?.status === 'V1 Source Boundary Locked' && registryRow?.validation === 'Signed Off For Current Reality', 'DB source registry is synced for Gmail contract', `${registryRow?.status || 'missing'} / ${registryRow?.validation || 'missing'}`)
  add(checks, lifecycleRow?.completionState === 'complete' && lifecycleRow?.coverageStatus === 'covered', 'source lifecycle treats Gmail as complete with covered targets', `${lifecycleRow?.completionState || 'missing'} / ${lifecycleRow?.coverageStatus || 'missing'}`)
  add(checks, lifecycleBoundaryText.includes('gmail current-day thread archive') && lifecycleBoundaryText.includes('missive internal-comment'), 'source lifecycle records the non-send and Missive-boundary scope', lifecycleBoundaryText || 'missing')

  add(checks, currentTarget?.status === 'active' && currentTarget?.runtime_mode === 'scheduled', 'gmail-current-day target is active and scheduled', currentTarget ? `${currentTarget.status}/${currentTarget.runtime_mode}` : 'missing')
  add(checks, currentTarget?.last_status === 'succeeded' && Number(currentTarget?.archived_count || 0) > 0, 'gmail-current-day target latest state succeeded with archived threads', currentTarget ? `${currentTarget.last_status} archived=${currentTarget.archived_count}` : 'missing')
  add(checks, attachmentTarget?.status === 'active' && attachmentTarget?.runtime_mode === 'scheduled', 'email-attachments-backfill target is active and scheduled', attachmentTarget ? `${attachmentTarget.status}/${attachmentTarget.runtime_mode}` : 'missing')
  add(checks, attachmentTarget?.last_status === 'succeeded' && Number(attachmentTarget?.archived_count || 0) > 0, 'email attachment target latest state succeeded with archived artifacts', attachmentTarget ? `${attachmentTarget.last_status} archived=${attachmentTarget.archived_count}` : 'missing')
  add(checks, currentJob?.status === 'succeeded' && isRecentEnough(currentJob.finished_at || currentJob.finishedAt, 48), 'latest Gmail current sync job succeeded recently', currentJob ? `${currentJob.status} ${currentJob.finished_at || currentJob.finishedAt}` : 'missing')
  add(checks, attachmentJob?.status === 'succeeded' && isRecentEnough(attachmentJob.finished_at || attachmentJob.finishedAt, 72), 'latest email attachment job succeeded recently', attachmentJob ? `${attachmentJob.status} ${attachmentJob.finished_at || attachmentJob.finishedAt}` : 'missing')
  add(checks, candidateJob?.status === 'succeeded' && isRecentEnough(candidateJob.finished_at || candidateJob.finishedAt, 72), 'latest Gmail candidate extraction job succeeded recently', candidateJob ? `${candidateJob.status} ${candidateJob.finished_at || candidateJob.finishedAt}` : 'missing')

  add(checks, Number(artifactSummary.threadCount || 0) > 0, 'Gmail thread artifacts exist in archive', `threads=${artifactSummary.threadCount || 0}`)
  add(checks, Number(artifactSummary.attachmentCount || 0) > 0, 'Gmail attachment artifacts exist in archive', `attachments=${artifactSummary.attachmentCount || 0}`)
  add(checks, currentJobDefinition?.runtimeMode === 'scheduled' && asArray(currentJobDefinition?.sourceIds).includes(SOURCE_001_SOURCE_ID), 'Gmail current sync job is governed and source-bound', currentJobDefinition ? `${currentJobDefinition.runtimeMode}/${currentJobDefinition.key}` : 'missing')
  add(checks, candidateJobDefinition?.runtimeMode === 'scheduled' && asArray(candidateJobDefinition?.sourceIds).includes(SOURCE_001_SOURCE_ID), 'Gmail candidate extraction job is governed and source-bound', candidateJobDefinition ? `${candidateJobDefinition.runtimeMode}/${candidateJobDefinition.key}` : 'missing')
  add(checks, attachmentJobDefinition?.runtimeMode === 'scheduled' && asArray(attachmentJobDefinition?.sourceIds).includes(SOURCE_001_SOURCE_ID), 'Gmail attachment extraction job is governed and source-bound', attachmentJobDefinition ? `${attachmentJobDefinition.runtimeMode}/${attachmentJobDefinition.key}` : 'missing')

  add(checks, syncScript.includes('listGmailMessages') && !syncScript.includes('sendGmailMessage'), 'Gmail sync archive script is read-only', 'scripts/sync-gmail-archive.mjs')
  add(checks, attachmentScript.includes('downloadGmailAttachment') && !attachmentScript.includes('sendGmailMessage'), 'Gmail attachment script downloads attachments without send path', 'scripts/extract-email-attachments.mjs')
  add(checks, sharedNote.includes('Current Foundation sign-off is narrow') && sharedNote.includes('This does not approve Gmail sends'), 'shared communications note documents narrow Gmail sign-off', 'docs/source-notes/shared-communications.md')
  add(checks, sourceRegistry.includes('SRC-GMAIL-001') && sourceRegistry.includes('Signed Off For Current Reality'), 'source registry records Gmail sign-off', 'docs/source-registry.md')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    sourceId: SOURCE_001_SOURCE_ID,
    closeoutKey: SOURCE_001_CLOSEOUT_KEY,
    artifactSummary,
    targetKeys: asArray(targetRows).map(row => row.target_key || row.targetKey).filter(Boolean),
    checks,
    failed,
  }
}
