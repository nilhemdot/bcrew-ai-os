import {
  CREATOR_WATCHLIST_SOURCE_ID,
  listCreatorWatchlistEntries,
} from './build-intel-watchlist.js'
import {
  buildCourseSourceAuthBoundarySnapshot,
} from './course-source-auth-boundary.js'

export const YOUTUBE_BUILD_INTEL_BATCH_CARD_ID = 'YOUTUBE-BUILD-INTEL-BATCH-001'
export const YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY = 'youtube-build-intel-batch-v1'
export const YOUTUBE_BUILD_INTEL_BATCH_PLAN_PATH = 'docs/process/youtube-build-intel-batch-001-plan.md'
export const YOUTUBE_BUILD_INTEL_BATCH_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-BUILD-INTEL-BATCH-001.json'
export const YOUTUBE_BUILD_INTEL_BATCH_SCRIPT_PATH = 'scripts/process-youtube-build-intel-batch-check.mjs'
export const YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-youtube-build-intel-batch-closeout.md'
export const YOUTUBE_BUILD_INTEL_BATCH_SPRINT_ID = 'youtube-build-intel-batch-2026-05-18'
export const YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID = 'EXTRACTION-TO-KB-ATOM-PIPELINE-001'
export const YOUTUBE_BUILD_INTEL_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const YOUTUBE_BUILD_INTEL_MAX_VIDEOS_PER_CHANNEL = 20

export const YOUTUBE_BUILD_INTEL_BATCH_CHANGED_FILES = [
  'lib/youtube-build-intel-batch.js',
  'scripts/process-youtube-build-intel-batch-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  YOUTUBE_BUILD_INTEL_BATCH_PLAN_PATH,
  YOUTUBE_BUILD_INTEL_BATCH_APPROVAL_PATH,
  YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const YOUTUBE_BUILD_INTEL_BATCH_PROOF_COMMANDS = [
  'node --check lib/youtube-build-intel-batch.js lib/foundation-intelligence-audit-verifier.js scripts/process-youtube-build-intel-batch-check.mjs scripts/foundation-verify.mjs',
  'npm run process:youtube-build-intel-batch-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=YOUTUBE-BUILD-INTEL-BATCH-001 --planApprovalRef=docs/process/approvals/YOUTUBE-BUILD-INTEL-BATCH-001.json --closeoutKey=youtube-build-intel-batch-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=YOUTUBE-BUILD-INTEL-BATCH-001 --closeoutKey=youtube-build-intel-batch-v1',
  'npm run process:foundation-ship -- --card=YOUTUBE-BUILD-INTEL-BATCH-001 --planApprovalRef=docs/process/approvals/YOUTUBE-BUILD-INTEL-BATCH-001.json --closeoutKey=youtube-build-intel-batch-v1 --commitRef=HEAD',
]

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  liveExtractionStarted: false,
  publicWebLookupStarted: false,
  transcriptFetched: false,
  screenshotsCaptured: 0,
  keyframesCaptured: 0,
  modelCallsStarted: false,
  privateAuthUsed: false,
  paidAuthUsed: false,
  researchInboxWritten: false,
  kbDraftsCreated: 0,
  atomsCreated: 0,
  actionRoutesCreated: 0,
  backlogMutatedFromContent: false,
  externalWrites: false,
})

const VISUAL_WORKFLOW_PATTERNS = [
  /workflow/i,
  /dashboard/i,
  /folder/i,
  /setup/i,
  /tool/i,
  /agent/i,
  /screen/i,
  /builder/i,
]

function normalizeText(value) {
  return String(value || '').trim()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function uniqueBy(values = [], keyFn = value => value) {
  const seen = new Set()
  const rows = []
  for (const value of values) {
    const key = keyFn(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(value)
  }
  return rows
}

function isPublicYoutubeUrl(value) {
  const url = normalizeText(value)
  return /^https:\/\/(www\.)?youtube\.com\/(@|watch\?v=|channel\/|c\/|user\/)/i.test(url) ||
    /^https:\/\/youtu\.be\//i.test(url)
}

function youtubeRefType(ref = {}) {
  const text = `${ref.type || ''} ${ref.sourceType || ''} ${ref.label || ''}`.toLowerCase()
  if (text.includes('video') || /watch\?v=|youtu\.be\//i.test(ref.url || '')) return 'public_youtube_video'
  if (text.includes('youtube')) return 'public_youtube_channel'
  return 'unknown'
}

function getPublicYoutubeRefs(entry = {}) {
  const platformRefs = (entry.platforms || [])
    .filter(platform => normalizeText(platform.type).toLowerCase() === 'youtube' && isPublicYoutubeUrl(platform.url))
    .map(platform => ({
      sourceKey: `${entry.creatorId}-youtube`,
      label: platform.label || 'YouTube',
      url: platform.url,
      sourceType: youtubeRefType(platform),
      lookupStatus: platform.lookupStatus || 'known_public_url',
      accessBoundary: platform.accessBoundary || 'public_lookup_required',
      lookupEvidence: platform.lookupEvidence || [],
    }))
  const sourceRefs = (entry.sourceRefs || [])
    .filter(ref => /youtube/i.test(`${ref.sourceType || ''} ${ref.sourceKey || ''}`) && isPublicYoutubeUrl(ref.url))
    .map(ref => ({
      sourceKey: ref.sourceKey || `${entry.creatorId}-youtube`,
      label: ref.sourceKey || 'YouTube',
      url: ref.url,
      sourceType: youtubeRefType(ref),
      lookupStatus: ref.lookupStatus || 'known_public_url',
      accessBoundary: 'public_lookup_required',
      lookupEvidence: ref.lookupEvidence || [],
    }))
  return uniqueBy([...platformRefs, ...sourceRefs], ref => ref.url)
}

function visualEvidenceNeeded(entry = {}, ref = {}) {
  const text = [entry.displayName, entry.whySteveCares, ref.label, ref.sourceKey].filter(Boolean).join(' ')
  return VISUAL_WORKFLOW_PATTERNS.some(pattern => pattern.test(text))
}

export function validateYoutubeBuildIntelQueueSpec(spec = {}) {
  const findings = []
  addFinding(findings, spec.sourceId === YOUTUBE_BUILD_INTEL_SOURCE_ID, 'queue spec uses public YouTube source ID', spec.sourceId || 'missing')
  addFinding(findings, normalizeText(spec.creatorId).length > 0, 'queue spec has creator ID', spec.creatorId || 'missing')
  addFinding(findings, isPublicYoutubeUrl(spec.sourceUrl), 'queue spec has public YouTube URL', spec.sourceUrl || 'missing')
  addFinding(findings, ['public_youtube_channel', 'public_youtube_video'].includes(spec.sourceType), 'queue spec source type is public YouTube', spec.sourceType || 'missing')
  addFinding(findings, Number(spec.maxVideos) >= 1 && Number(spec.maxVideos) <= YOUTUBE_BUILD_INTEL_MAX_VIDEOS_PER_CHANNEL, 'queue spec video limit stays within last-20 cap', String(spec.maxVideos || 0))
  addFinding(findings, spec.runtimeApprovalRequired === true, 'queue spec requires runtime approval', String(spec.runtimeApprovalRequired))
  addFinding(findings, spec.metadataOnly === true, 'queue spec is metadata-only in this card', String(spec.metadataOnly))
  addFinding(findings, spec.liveExtractionApproved === false, 'queue spec does not approve live extraction', String(spec.liveExtractionApproved))
  addFinding(findings, spec.transcriptFetchApproved === false, 'queue spec does not approve transcript fetch', String(spec.transcriptFetchApproved))
  addFinding(findings, spec.modelCallApproved === false, 'queue spec does not approve model calls', String(spec.modelCallApproved))
  addFinding(findings, spec.privateOrPaidContentAllowed === false, 'queue spec blocks private or paid content', String(spec.privateOrPaidContentAllowed))
  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures }
}

function buildQueueSpec(entry = {}, ref = {}, { maxVideosPerChannel = YOUTUBE_BUILD_INTEL_MAX_VIDEOS_PER_CHANNEL } = {}) {
  const sourceType = youtubeRefType(ref)
  const visualNeeded = visualEvidenceNeeded(entry, ref)
  const maxVideos = sourceType === 'public_youtube_video'
    ? 1
    : Math.min(YOUTUBE_BUILD_INTEL_MAX_VIDEOS_PER_CHANNEL, Math.max(1, Number(maxVideosPerChannel) || YOUTUBE_BUILD_INTEL_MAX_VIDEOS_PER_CHANNEL))
  const spec = {
    queueKey: `${entry.creatorId}:${ref.sourceKey || 'youtube'}`,
    cardId: YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
    sourceId: YOUTUBE_BUILD_INTEL_SOURCE_ID,
    creatorWatchlistSourceId: CREATOR_WATCHLIST_SOURCE_ID,
    creatorId: entry.creatorId,
    displayName: entry.displayName,
    priority: entry.priority,
    cadence: entry.cadence,
    sourceKey: ref.sourceKey || `${entry.creatorId}-youtube`,
    sourceType,
    sourceUrl: ref.url,
    targetWindow: sourceType === 'public_youtube_channel' ? 'last_20_public_videos' : 'known_public_video_seed',
    maxVideos,
    metadataOnly: true,
    runtimeApprovalRequired: true,
    liveExtractionApproved: false,
    transcriptFetchApproved: false,
    keyframeCaptureApproved: false,
    screenshotCaptureApproved: false,
    modelCallApproved: false,
    privateOrPaidContentAllowed: false,
    expectedEvidence: {
      transcriptText: true,
      titleAndDescription: true,
      keyframes: visualNeeded,
      screenshots: visualNeeded,
      visualWorkflowNotes: visualNeeded,
    },
    runBudgetDraft: {
      maxVideos,
      maxTranscriptCharsPerVideo: 250000,
      maxKeyframesPerVideo: visualNeeded ? 8 : 0,
      maxScreenshotsPerVideo: visualNeeded ? 4 : 0,
      maxModelCallsPerVideo: 0,
    },
    downstreamRouteDraft: {
      researchInbox: 'proposal_after_runtime_review',
      kbDraft: 'blocked_until_extraction_to_kb_gate',
      atoms: 'blocked_until_extraction_to_kb_gate',
      actionRoutes: 'blocked_until_extraction_to_kb_gate',
    },
    skipUnsafeContent: [
      'private videos',
      'members-only videos',
      'paid courses',
      'Skool/community content',
      'comments/member data',
      'non-public browser sessions',
    ],
  }
  return {
    ...spec,
    validation: validateYoutubeBuildIntelQueueSpec(spec),
  }
}

function buildSkippedCreator(entry = {}, reason = 'missing_public_youtube_url') {
  return {
    creatorId: entry.creatorId,
    displayName: entry.displayName,
    priority: entry.priority,
    reason,
    accessBoundary: entry.accessBoundary,
    sourceCategory: entry.sourceCategory,
  }
}

function unsafeSideEffectCount(sideEffects = {}) {
  return Object.values(sideEffects || {}).filter(value => value !== false && value !== 0 && value !== null && value !== undefined).length
}

export function buildYoutubeBuildIntelBatchSnapshot({
  watchlistEntries = listCreatorWatchlistEntries({ sourceCategory: 'build_intel' }),
  sourceAuthBoundary = buildCourseSourceAuthBoundarySnapshot(),
  sideEffects = {},
  maxVideosPerChannel = YOUTUBE_BUILD_INTEL_MAX_VIDEOS_PER_CHANNEL,
} = {}) {
  const entries = clone(watchlistEntries).filter(entry => entry.active !== false && entry.sourceCategory === 'build_intel')
  const effects = { ...DEFAULT_SIDE_EFFECTS, ...(sideEffects || {}) }
  const specs = []
  const skippedCreators = []
  for (const entry of entries) {
    const refs = getPublicYoutubeRefs(entry)
    if (!refs.length) {
      skippedCreators.push(buildSkippedCreator(entry))
      continue
    }
    specs.push(...refs.map(ref => buildQueueSpec(entry, ref, { maxVideosPerChannel })))
    if (/paid_authorized_required/.test(entry.accessBoundary || '')) {
      skippedCreators.push(buildSkippedCreator(entry, 'private_or_paid_surfaces_blocked_public_youtube_only'))
    }
  }

  const publicYoutubeSourceRow = (sourceAuthBoundary.rows || []).find(row => row.sourceId === YOUTUBE_BUILD_INTEL_SOURCE_ID)
  const privateOrPaidRows = (sourceAuthBoundary.rows || []).filter(row => row.privateOrPaid === true)
  const validatedSpecs = specs.map(spec => ({ ...spec, validation: validateYoutubeBuildIntelQueueSpec(spec) }))
  const findings = []

  addFinding(findings, publicYoutubeSourceRow?.sourceClass === 'public_no_auth', 'public YouTube source row is classified no-auth', publicYoutubeSourceRow?.sourceClass || 'missing')
  addFinding(findings, publicYoutubeSourceRow?.extractionAllowed === false, 'public YouTube source still requires runtime approval before extraction', String(publicYoutubeSourceRow?.extractionAllowed))
  addFinding(findings, privateOrPaidRows.length >= 3 && privateOrPaidRows.every(row => row.extractionAllowed === false), 'private/course source rows remain blocked', `${privateOrPaidRows.filter(row => row.extractionAllowed === false).length}/${privateOrPaidRows.length}`)
  addFinding(findings, validatedSpecs.length >= 6, 'public YouTube queue has multiple source-backed specs', String(validatedSpecs.length))
  addFinding(findings, validatedSpecs.some(spec => spec.creatorId === 'mark-kashef'), 'Mark Kashef public YouTube is queued while Skool stays blocked', validatedSpecs.map(spec => spec.creatorId).join(', '))
  addFinding(findings, validatedSpecs.some(spec => spec.creatorId === 'matt-pocock-total-typescript'), 'Matt Pocock public YouTube is queued for coding-agent evaluation', validatedSpecs.map(spec => spec.creatorId).join(', '))
  addFinding(findings, validatedSpecs.every(spec => spec.validation.ok), 'all queue specs validate fail-closed boundaries', validatedSpecs.flatMap(spec => spec.validation.failures.map(failure => `${spec.queueKey}:${failure.check}`)).join(', ') || 'all valid')
  addFinding(findings, Number(maxVideosPerChannel) <= YOUTUBE_BUILD_INTEL_MAX_VIDEOS_PER_CHANNEL, 'batch cap does not exceed last-20 videos per channel', String(maxVideosPerChannel))
  addFinding(findings, validatedSpecs.every(spec => spec.metadataOnly && spec.runtimeApprovalRequired && !spec.liveExtractionApproved && !spec.transcriptFetchApproved && !spec.modelCallApproved), 'queue preparation does not approve extraction, transcript fetch, or model calls', 'metadata-only specs')
  addFinding(findings, skippedCreators.some(row => row.reason === 'missing_public_youtube_url'), 'creators without known public YouTube URLs are skipped, not fabricated', `${skippedCreators.length} skipped`)
  addFinding(findings, unsafeSideEffectCount(effects) === 0, 'no live extraction, lookup, model, output, or external-write side effects', JSON.stringify(effects))

  const failures = findings.filter(finding => !finding.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'ready',
    cardId: YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
    closeoutKey: YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
    recommendedNext: YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID,
    sourceId: YOUTUBE_BUILD_INTEL_SOURCE_ID,
    creatorWatchlistSourceId: CREATOR_WATCHLIST_SOURCE_ID,
    metadataOnlyPreflight: true,
    runtimeApprovalRequired: true,
    liveExtractionApprovedByThisCard: false,
    writesBacklog: false,
    opensSprint: false,
    sideEffects: effects,
    queueSpecs: validatedSpecs,
    skippedCreators,
    findings,
    failures,
    summary: {
      buildIntelCreatorCount: entries.length,
      queueSpecCount: validatedSpecs.length,
      queueCreatorCount: new Set(validatedSpecs.map(spec => spec.creatorId)).size,
      publicChannelSpecCount: validatedSpecs.filter(spec => spec.sourceType === 'public_youtube_channel').length,
      knownVideoSeedCount: validatedSpecs.filter(spec => spec.sourceType === 'public_youtube_video').length,
      maxVideosPerChannel: Math.min(YOUTUBE_BUILD_INTEL_MAX_VIDEOS_PER_CHANNEL, Number(maxVideosPerChannel) || YOUTUBE_BUILD_INTEL_MAX_VIDEOS_PER_CHANNEL),
      plannedVideoCeiling: validatedSpecs.reduce((total, spec) => total + Number(spec.maxVideos || 0), 0),
      skippedCreatorCount: skippedCreators.length,
      privateOrPaidBlockedCount: privateOrPaidRows.filter(row => row.extractionAllowed === false).length,
      unsafeSideEffectCount: unsafeSideEffectCount(effects),
    },
  }
}

export function buildYoutubeBuildIntelBatchDogfoodProof() {
  const healthy = buildYoutubeBuildIntelBatchSnapshot()
  const liveExtraction = buildYoutubeBuildIntelBatchSnapshot({ sideEffects: { liveExtractionStarted: true } })
  const overLimit = buildYoutubeBuildIntelBatchSnapshot({ maxVideosPerChannel: 25 })
  const unsafePrivate = buildYoutubeBuildIntelBatchSnapshot({
    sourceAuthBoundary: buildCourseSourceAuthBoundarySnapshot({
      sourceRows: [
        { sourceId: YOUTUBE_BUILD_INTEL_SOURCE_ID, sourceClass: 'public_no_auth', extractionAllowed: false },
        { sourceId: 'SRC-SKOOL-001', sourceClass: 'private_community', privateOrPaid: true, extractionAllowed: true },
        { sourceId: 'SRC-MYICRO-001', sourceClass: 'paid_course', privateOrPaid: true, extractionAllowed: false },
        { sourceId: 'SRC-LOOM-001', sourceClass: 'private_video_training', privateOrPaid: true, extractionAllowed: false },
      ],
    }),
  })
  const invalidSpec = validateYoutubeBuildIntelQueueSpec({
    ...healthy.queueSpecs[0],
    sourceUrl: '',
    maxVideos: 50,
    transcriptFetchApproved: true,
  })
  return {
    ok: healthy.ok === true &&
      liveExtraction.ok === false &&
      overLimit.ok === false &&
      unsafePrivate.ok === false &&
      invalidSpec.ok === false,
    healthy: { ok: healthy.ok, queueSpecCount: healthy.summary.queueSpecCount },
    rejectedCases: {
      liveExtractionStarted: liveExtraction.ok === false,
      overLast20Limit: overLimit.ok === false,
      privateSourceUnblocked: unsafePrivate.ok === false,
      invalidQueueSpec: invalidSpec.ok === false,
    },
  }
}

export function renderYoutubeBuildIntelBatchReport(snapshot = buildYoutubeBuildIntelBatchSnapshot()) {
  const lines = [
    `# ${YOUTUBE_BUILD_INTEL_BATCH_CARD_ID} Closeout`,
    '',
    `Closeout key: \`${YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY}\``,
    '',
    '## Outcome',
    '',
    `Prepared ${snapshot.summary.queueSpecCount} metadata-only public YouTube Build Intel queue spec(s) across ${snapshot.summary.queueCreatorCount} creator(s).`,
    '',
    '## Queue Summary',
    '',
    `- Source ID: \`${snapshot.sourceId}\``,
    `- Creator watchlist source: \`${snapshot.creatorWatchlistSourceId}\``,
    `- Max videos per channel: ${snapshot.summary.maxVideosPerChannel}`,
    `- Planned video ceiling if later approved: ${snapshot.summary.plannedVideoCeiling}`,
    `- Runtime approval required: ${snapshot.runtimeApprovalRequired}`,
    `- Live extraction approved by this card: ${snapshot.liveExtractionApprovedByThisCard}`,
    '',
    '## Public Queue Specs',
    '',
    ...snapshot.queueSpecs.map(spec => `- \`${spec.queueKey}\` - ${spec.displayName} - ${spec.sourceType} - max ${spec.maxVideos} - ${spec.sourceUrl}`),
    '',
    '## Skipped / Blocked',
    '',
    ...snapshot.skippedCreators.map(row => `- \`${row.creatorId}\` - ${row.reason}`),
    '',
    '## Side Effects',
    '',
    `\`\`\`json\n${JSON.stringify(snapshot.sideEffects, null, 2)}\n\`\`\``,
    '',
    '## Next',
    '',
    `Continue \`${snapshot.recommendedNext}\` for output routing design. Do not run public video extraction until a separate runtime approval packet is approved.`,
  ]
  return `${lines.join('\n')}\n`
}
