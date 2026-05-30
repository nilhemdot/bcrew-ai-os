import { buildMeetingVaultNoDuplicateGoogleDocProof } from './meeting-vault-acl.js'

export const SOURCE_018_CARD_ID = 'SOURCE-018'
export const SOURCE_018_SOURCE_ID = 'SRC-MEETINGS-001'
export const SOURCE_018_NEXT_CARD_ID = 'EXTRACT-CURRENT-001'
export const SOURCE_018_CLOSEOUT_KEY = 'source-018-google-gemini-meeting-notes-contract-v1'
export const SOURCE_018_PLAN_PATH = 'docs/process/source-018-google-gemini-meeting-notes-contract-plan.md'
export const SOURCE_018_APPROVAL_PATH = 'docs/process/approvals/SOURCE-018.json'
export const SOURCE_018_SCRIPT_PATH = 'scripts/process-source-018-check.mjs'
export const SOURCE_018_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-source-018-google-gemini-meeting-notes-contract-closeout.md'

export const SOURCE_018_CHANGED_FILES = [
  'lib/source-018-google-gemini-meeting-notes-contract.js',
  'lib/source-contracts.js',
  'lib/source-lifecycle-completion.js',
  'docs/source-registry.md',
  'docs/source-notes/shared-communications.md',
  SOURCE_018_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  SOURCE_018_PLAN_PATH,
  SOURCE_018_APPROVAL_PATH,
  SOURCE_018_CLOSEOUT_PATH,
]

export const SOURCE_018_PROOF_COMMANDS = [
  `node --check lib/source-018-google-gemini-meeting-notes-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js ${SOURCE_018_SCRIPT_PATH}`,
  'npm run process:source-018-check -- --apply --close-card --json',
  'npm run source-contract-registry:sync -- --apply --actor=codex-source-018 --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${SOURCE_018_CARD_ID} --planApprovalRef=${SOURCE_018_APPROVAL_PATH} --closeoutKey=${SOURCE_018_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${SOURCE_018_CARD_ID} --closeoutKey=${SOURCE_018_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${SOURCE_018_CARD_ID} --planApprovalRef=${SOURCE_018_APPROVAL_PATH} --closeoutKey=${SOURCE_018_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SOURCE_018_NOT_NEXT = [
  'Do not mutate Google Drive permissions.',
  'Do not expose raw transcripts to broad team or agent query surfaces.',
  'Do not extract from Gemini summaries when transcript evidence is missing.',
  'Do not run broad historical meeting extraction from this card.',
  'Do not start Value Builder split.',
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
  checks.push({ ok: Boolean(ok), check, detail })
}

function isRecentEnough(value, maxAgeHours = 30) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= maxAgeHours * 60 * 60 * 1000
}

export function evaluateSource018ContractFixture(fixture = {}) {
  const checks = []
  add(checks, fixture.sourceSignedOff === true, 'source is signed off for current reality')
  add(checks, fixture.currentSyncSucceeded === true, 'meeting current-day sync has a successful governed run')
  add(checks, Number(fixture.noteCount || 0) > 0 && Number(fixture.transcriptCount || 0) > 0, 'notes and transcripts are archived')
  add(checks, fixture.transcriptEvidenceRequired === true, 'candidate extraction requires transcript evidence')
  add(checks, fixture.noDriveMutation === true, 'current contract does not mutate Drive permissions')
  add(checks, fixture.rawTranscriptBroadAccessBlocked === true, 'raw transcript broad access remains blocked')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'risk' : 'healthy', checks, failed }
}

export function buildSource018DogfoodProof() {
  const healthy = evaluateSource018ContractFixture({
    sourceSignedOff: true,
    currentSyncSucceeded: true,
    noteCount: 3,
    transcriptCount: 2,
    transcriptEvidenceRequired: true,
    noDriveMutation: true,
    rawTranscriptBroadAccessBlocked: true,
  })
  const rejected = {
    connectorOnly: evaluateSource018ContractFixture({
      sourceSignedOff: false,
      currentSyncSucceeded: true,
      noteCount: 3,
      transcriptCount: 2,
      transcriptEvidenceRequired: true,
      noDriveMutation: true,
      rawTranscriptBroadAccessBlocked: true,
    }),
    noTranscriptEvidence: evaluateSource018ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: true,
      noteCount: 3,
      transcriptCount: 0,
      transcriptEvidenceRequired: false,
      noDriveMutation: true,
      rawTranscriptBroadAccessBlocked: true,
    }),
    driveMutation: evaluateSource018ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: true,
      noteCount: 3,
      transcriptCount: 2,
      transcriptEvidenceRequired: true,
      noDriveMutation: false,
      rawTranscriptBroadAccessBlocked: true,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    invariant: 'Meeting notes can be signed off for current Foundation use only when transcript evidence, governed current sync, no Drive mutation, and raw-access boundaries all hold.',
  }
}

export function buildSource018ContractStatus({
  artifactSummary = {},
  jobDefinitions = [],
  latestCurrentJob = null,
  latestTranscriptJob = null,
  sourceContracts = [],
  sourceLayerStatus = null,
  sourceLifecycleRows = [],
  targetRow = null,
  sources = {},
} = {}) {
  const checks = []
  const source = asArray(sourceContracts).find(contract => contract.sourceId === SOURCE_018_SOURCE_ID) || null
  const sourceLayerRow = asArray(sourceLayerStatus?.sourceRows).find(row => row.sourceId === SOURCE_018_SOURCE_ID) || null
  const lifecycleRow = asArray(sourceLifecycleRows).find(row => row.sourceId === SOURCE_018_SOURCE_ID) || null
  const lifecycleBoundaryText = lower([
    lifecycleRow?.scopeNote,
    lifecycleRow?.reason,
    lifecycleRow?.nextAction,
  ].filter(Boolean).join(' '))
  const currentJobDefinition = asArray(jobDefinitions).find(job => job.key === 'meeting-notes-sync-current') || null
  const gapJobDefinition = asArray(jobDefinitions).find(job => job.key === 'meeting-transcript-gaps') || null
  const recentGapJobDefinition = asArray(jobDefinitions).find(job => job.key === 'meeting-transcript-recent-gap-verify') || null
  const extractionJobDefinition = asArray(jobDefinitions).find(job => job.key === 'meeting-transcripts-extract-backlog') || null
  const noDuplicateProof = buildMeetingVaultNoDuplicateGoogleDocProof(sources)

  add(checks, source?.status === 'Current reality captured' && source?.validation === 'Signed Off For Current Reality', 'source contract is signed off for current reality', `${source?.status || 'missing'} / ${source?.validation || 'missing'}`)
  add(checks, lower(source?.validationScope).includes('transcript evidence') && lower(source?.validationScope).includes('does not approve raw transcript exposure'), 'validation scope preserves transcript and raw-access boundaries', source?.validationScope || 'missing')
  add(checks, lower(source?.boundaryNote).includes('owner/foundation') && lower(source?.boundaryNote).includes('filtered-summary'), 'boundary note keeps broad read-side access gated', source?.boundaryNote || 'missing')
  add(checks, source?.lastVerified === '2026-05-19', 'source contract has fresh verification date', source?.lastVerified || 'missing')
  add(checks, sourceLayerRow?.trustStatus?.startsWith('trusted') && sourceLayerRow?.sourceStatus === 'signed_off', 'source layer marks Meetings as trusted current contract', `${sourceLayerRow?.sourceStatus || 'missing'} / ${sourceLayerRow?.trustStatus || 'missing'}`)
  add(checks, asArray(sourceLayerRow?.connectorIds).includes('CONN-GDRIVE-001') && asArray(sourceLayerRow?.connectorIds).includes('CONN-GCAL-001'), 'source layer keeps Drive and Calendar connector reach explicit', asArray(sourceLayerRow?.connectorIds).join(', ') || 'missing')
  add(checks, lifecycleRow?.coverageStatus === 'partial_with_blocker' && lifecycleBoundaryText.includes('current foundation/steve owner use'), 'source lifecycle distinguishes current sign-off from future blockers', lifecycleBoundaryText || 'missing')

  add(checks, targetRow?.target_key === 'meetings-current-day' && targetRow?.status === 'active' && targetRow?.runtime_mode === 'scheduled', 'meetings-current-day target is active and scheduled', targetRow ? `${targetRow.status}/${targetRow.runtime_mode}` : 'missing')
  add(checks, targetRow?.last_status === 'succeeded' && Number(targetRow?.archived_count || 0) > 0, 'meetings-current-day target latest state succeeded with archived artifacts', targetRow ? `${targetRow.last_status} archived=${targetRow.archived_count}` : 'missing')
  add(checks, latestCurrentJob?.status === 'succeeded' && isRecentEnough(latestCurrentJob.finished_at || latestCurrentJob.finishedAt, 36), 'latest meeting current sync job succeeded recently', latestCurrentJob ? `${latestCurrentJob.status} ${latestCurrentJob.finished_at || latestCurrentJob.finishedAt}` : 'missing')
  add(checks, latestTranscriptJob?.status === 'succeeded' && isRecentEnough(latestTranscriptJob.finished_at || latestTranscriptJob.finishedAt, 36), 'latest meeting transcript extraction job succeeded recently', latestTranscriptJob ? `${latestTranscriptJob.status} ${latestTranscriptJob.finished_at || latestTranscriptJob.finishedAt}` : 'missing')
  add(checks, Number(artifactSummary.noteCount || 0) >= 100 && Number(artifactSummary.transcriptCount || 0) >= 100, 'meeting note and transcript artifacts exist in archive', `notes=${artifactSummary.noteCount || 0} transcripts=${artifactSummary.transcriptCount || 0}`)
  add(checks, Number(artifactSummary.meetingKeyCount || 0) >= 100, 'meeting artifacts carry meeting-key coverage', String(artifactSummary.meetingKeyCount || 0))

  add(checks, currentJobDefinition?.runtimeMode === 'scheduled' && asArray(currentJobDefinition?.sourceIds).includes(SOURCE_018_SOURCE_ID), 'meeting current sync job is a governed scheduled Foundation job', currentJobDefinition ? `${currentJobDefinition.runtimeMode}/${currentJobDefinition.key}` : 'missing')
  add(checks, gapJobDefinition && recentGapJobDefinition && extractionJobDefinition, 'transcript gap and extraction jobs are registered separately', [gapJobDefinition?.key, recentGapJobDefinition?.key, extractionJobDefinition?.key].filter(Boolean).join(', ') || 'missing')
  add(checks, noDuplicateProof.ok, 'meeting jobs cannot create duplicate Gemini docs or mutate Drive files', noDuplicateProof.findings.join(', ') || 'pass')
  add(checks, text(sources.extractMeetingTranscriptCandidatesSource).includes('Never extract from Gemini summaries or bullet lists. Use transcript evidence only.'), 'meeting extraction requires transcript evidence, not Gemini summaries', 'scripts/extract-meeting-transcript-candidates.mjs')
  add(checks, text(sources.sharedCommsNoteSource).includes('Current Foundation sign-off is narrow'), 'shared communications note documents the current sign-off boundary', 'docs/source-notes/shared-communications.md')
  add(checks, text(sources.sourceRegistrySource).includes('SRC-MEETINGS-001') && text(sources.sourceRegistrySource).includes('Signed Off For Current Reality'), 'source registry records current-reality sign-off', 'docs/source-registry.md')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    sourceId: SOURCE_018_SOURCE_ID,
    closeoutKey: SOURCE_018_CLOSEOUT_KEY,
    artifactSummary,
    checks,
    failed,
    noDuplicateProof,
  }
}
