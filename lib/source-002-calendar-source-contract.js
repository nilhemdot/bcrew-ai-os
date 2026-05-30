export const SOURCE_002_CARD_ID = 'SOURCE-002'
export const SOURCE_002_SOURCE_ID = 'SRC-GCAL-001'
export const SOURCE_002_NEXT_CARD_ID = 'SOURCE-003'
export const SOURCE_002_CLOSEOUT_KEY = 'source-002-calendar-source-contract-v1'
export const SOURCE_002_PLAN_PATH = 'docs/process/source-002-calendar-source-contract-plan.md'
export const SOURCE_002_APPROVAL_PATH = 'docs/process/approvals/SOURCE-002.json'
export const SOURCE_002_SCRIPT_PATH = 'scripts/process-source-002-check.mjs'
export const SOURCE_002_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-source-002-calendar-source-contract-closeout.md'

export const SOURCE_002_CHANGED_FILES = [
  'lib/source-002-calendar-source-contract.js',
  'lib/source-contracts.js',
  'lib/source-lifecycle-completion.js',
  'docs/source-registry.md',
  'docs/source-notes/shared-communications.md',
  SOURCE_002_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_002_PLAN_PATH,
  SOURCE_002_APPROVAL_PATH,
  SOURCE_002_CLOSEOUT_PATH,
]

export const SOURCE_002_PROOF_COMMANDS = [
  `node --check lib/source-002-calendar-source-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js ${SOURCE_002_SCRIPT_PATH}`,
  'npm run process:source-002-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${SOURCE_002_CARD_ID} --planApprovalRef=${SOURCE_002_APPROVAL_PATH} --closeoutKey=${SOURCE_002_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${SOURCE_002_CARD_ID} --closeoutKey=${SOURCE_002_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${SOURCE_002_CARD_ID} --planApprovalRef=${SOURCE_002_APPROVAL_PATH} --closeoutKey=${SOURCE_002_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SOURCE_002_NOT_NEXT = [
  'Do not create, update, delete, invite, RSVP, or otherwise write to Google Calendar.',
  'Do not mutate Calendar credentials, OAuth scopes, provider config, or source access.',
  'Do not approve broad calendar extraction outside the existing current-window target.',
  'Do not archive event descriptions, raw notes, invite bodies, or attachments.',
  'Do not treat Calendar as meeting-note, transcript, decision, or discussion truth.',
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

function isRecentEnough(value, maxAgeHours = 36) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= maxAgeHours * 60 * 60 * 1000
}

function hasCalendarMutationToken(source = '') {
  return [
    /method:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/i,
    /calendar\/v3[^\n`'"]*\/events[^\n`'"]*(?:insert|update|delete|move|quickAdd)/i,
    /events\.(?:insert|update|delete|patch|move|quickAdd)\b/i,
    /\b(sendUpdates|attendeesOmitted|anyoneCanAddSelf)\b/,
  ].some(pattern => pattern.test(String(source || '')))
}

export function evaluateSource002ContractFixture(fixture = {}) {
  const checks = []
  add(checks, fixture.sourceSignedOff === true, 'source is signed off for current read-side Calendar reality')
  add(checks, fixture.currentSyncSucceeded === true, 'Calendar current-window sync has a successful governed run')
  add(checks, fixture.calendarEventArtifactCount > 0, 'Calendar event archive exists')
  add(checks, fixture.noCalendarWrite === true, 'Calendar writes are not approved')
  add(checks, fixture.privacyBoundaryPreserved === true, 'Calendar event descriptions/raw notes stay out of V1')
  add(checks, fixture.meetingContentBoundaryPreserved === true, 'meeting notes/transcripts remain separate source truth')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'risk' : 'healthy', checks, failed }
}

export function buildSource002DogfoodProof() {
  const healthy = evaluateSource002ContractFixture({
    sourceSignedOff: true,
    currentSyncSucceeded: true,
    calendarEventArtifactCount: 12,
    noCalendarWrite: true,
    privacyBoundaryPreserved: true,
    meetingContentBoundaryPreserved: true,
  })
  const rejected = {
    connectorOnly: evaluateSource002ContractFixture({
      sourceSignedOff: false,
      currentSyncSucceeded: true,
      calendarEventArtifactCount: 12,
      noCalendarWrite: true,
      privacyBoundaryPreserved: true,
      meetingContentBoundaryPreserved: true,
    }),
    noCurrentSync: evaluateSource002ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: false,
      calendarEventArtifactCount: 12,
      noCalendarWrite: true,
      privacyBoundaryPreserved: true,
      meetingContentBoundaryPreserved: true,
    }),
    missingCalendarEvents: evaluateSource002ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: true,
      calendarEventArtifactCount: 0,
      noCalendarWrite: true,
      privacyBoundaryPreserved: true,
      meetingContentBoundaryPreserved: true,
    }),
    unsafeCalendarWriteApproval: evaluateSource002ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: true,
      calendarEventArtifactCount: 12,
      noCalendarWrite: false,
      privacyBoundaryPreserved: true,
      meetingContentBoundaryPreserved: true,
    }),
    meetingContentBoundaryLost: evaluateSource002ContractFixture({
      sourceSignedOff: true,
      currentSyncSucceeded: true,
      calendarEventArtifactCount: 12,
      noCalendarWrite: true,
      privacyBoundaryPreserved: false,
      meetingContentBoundaryPreserved: false,
    }),
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(result => !result.ok),
    healthy,
    rejected,
    invariant: 'Calendar can be signed off only for delegated read-side current reality when governed current-window sync, calendar_event artifacts, no-write posture, privacy boundary, and meeting-content source separation all hold.',
  }
}

export function buildSource002ContractStatus({
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
  const contract = asArray(sourceContracts).find(source => source.sourceId === SOURCE_002_SOURCE_ID) || {}
  const registryRow = asArray(registryRows).find(row => row.source_id === SOURCE_002_SOURCE_ID || row.sourceId === SOURCE_002_SOURCE_ID) || {}
  const lifecycleRow = asArray(sourceLifecycleRows).find(row => row.sourceId === SOURCE_002_SOURCE_ID || row.source_id === SOURCE_002_SOURCE_ID) || {}
  const calendarTarget = asArray(targetRows).find(row => row.target_key === 'calendar-current-day' || row.targetKey === 'calendar-current-day') || {}
  const calendarJob = latestJobs['calendar-sync-current'] || {}
  const jobDefinition = asArray(jobDefinitions).find(job => job.key === 'calendar-sync-current') || {}
  const contractText = lower(`${contract.validationScope || ''} ${contract.boundaryNote || ''} ${contract.manualRefresh || ''}`)
  const lifecycleText = lower(`${lifecycleRow.scopeNote || lifecycleRow.scope_note || ''} ${lifecycleRow.detail || ''} ${lifecycleRow.reason || ''} ${lifecycleRow.nextAction || lifecycleRow.next_action || ''}`)
  const syncSource = sources.syncCalendarEventsSource || ''
  const sourceRegistrySource = sources.sourceRegistrySource || ''
  const sharedCommsNoteSource = sources.sharedCommsNoteSource || ''

  add(checks, contract.status === 'V1 Source Boundary Locked' && contract.validation === 'Signed Off For Current Reality', 'source contract is signed off for current Calendar read-side reality', `${contract.status || 'missing'} / ${contract.validation || 'missing'}`)
  add(checks, /calendar writes|invites|rsvp|event updates\/deletes|credential/.test(contractText), 'validation scope blocks Calendar writes and credential mutation', contract.validationScope || 'missing validationScope')
  add(checks, /meeting notes|transcripts/.test(contractText), 'boundary note preserves Calendar versus meeting-content roles', contract.boundaryNote || 'missing boundaryNote')
  add(checks, contract.lastVerified === '2026-05-20', 'source contract has fresh verification date', contract.lastVerified || 'missing')
  add(checks, registryRow.status === 'V1 Source Boundary Locked' && registryRow.validation === 'Signed Off For Current Reality', 'DB source registry is synced for Calendar contract', `${registryRow.status || 'missing'} / ${registryRow.validation || 'missing'}`)
  add(checks, lifecycleRow.completionState === 'complete' && lifecycleRow.coverageStatus === 'covered', 'source lifecycle treats Calendar as complete with covered target', `${lifecycleRow.completionState || 'missing'} / ${lifecycleRow.coverageStatus || 'missing'}`)
  add(checks, /calendar current-window event archive/.test(lifecycleText) && /calendar writes/.test(lifecycleText), 'source lifecycle records read-only Calendar scope boundary', lifecycleText || 'missing scope note')
  add(checks, calendarTarget.status === 'active' && calendarTarget.runtime_mode === 'scheduled', 'calendar-current-day target is active and scheduled', `${calendarTarget.status || 'missing'}/${calendarTarget.runtime_mode || 'missing'}`)
  add(checks, calendarTarget.last_status === 'succeeded' && Number(calendarTarget.archived_count || 0) > 0, 'calendar-current-day target latest state succeeded with archived events', `${calendarTarget.last_status || 'missing'} archived=${calendarTarget.archived_count || 0}`)
  add(checks, calendarJob.status === 'succeeded' && isRecentEnough(calendarJob.finished_at || calendarJob.finishedAt, 36), 'latest Calendar current sync job succeeded recently', `${calendarJob.status || 'missing'} ${calendarJob.finished_at || calendarJob.finishedAt || 'missing time'}`)
  add(checks, Number(artifactSummary.calendarEventCount || 0) > 0, 'Calendar event artifacts exist in archive', `calendar_event=${artifactSummary.calendarEventCount || 0}`)
  add(checks, jobDefinition.runtimeMode === 'scheduled' && asArray(jobDefinition.sourceIds).includes(SOURCE_002_SOURCE_ID) && asArray(jobDefinition.args).includes('--target=calendar-current-day'), 'Calendar current sync job is governed and source-bound', `${jobDefinition.runtimeMode || 'missing'}/${jobDefinition.key || 'missing'}`)
  add(checks, !hasCalendarMutationToken(syncSource) && /listCalendarEvents/.test(syncSource) && /privacyBoundary/.test(syncSource), 'Calendar sync script is read-only and records privacy boundary', hasCalendarMutationToken(syncSource) ? 'calendar mutation token found' : 'scripts/sync-calendar-events.mjs')
  add(checks, sourceRegistrySource.includes('SRC-GCAL-001') && sourceRegistrySource.includes('V1 Source Boundary Locked') && sourceRegistrySource.includes('Calendar writes'), 'source registry records Calendar sign-off', 'docs/source-registry.md')
  add(checks, sharedCommsNoteSource.includes('Current Calendar boundary') && sharedCommsNoteSource.includes('calendar-current-day') && sharedCommsNoteSource.includes('does not approve Calendar writes'), 'shared communications note documents narrow Calendar sign-off', 'docs/source-notes/shared-communications.md')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    sourceId: SOURCE_002_SOURCE_ID,
    closeoutKey: SOURCE_002_CLOSEOUT_KEY,
    artifactSummary,
    targetKeys: asArray(targetRows).map(row => row.target_key || row.targetKey).filter(Boolean),
    checks,
    failed,
  }
}
