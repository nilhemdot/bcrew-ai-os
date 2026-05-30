import { validateMultimodalExtractionEnvelope } from './multimodal-extractor-contract.js'
import {
  buildWebGodmodeObservation,
} from './web-godmode-extractor.js'

export const MEETING_VIDEO_CARD_ID = 'MEETING-VIDEO-001'
export const MEETING_VIDEO_CLOSEOUT_KEY = 'meeting-video-preflight-v1'
export const MEETING_VIDEO_PLAN_PATH = 'docs/process/meeting-video-001-plan.md'
export const MEETING_VIDEO_APPROVAL_PATH = 'docs/process/approvals/MEETING-VIDEO-001.json'
export const MEETING_VIDEO_SCRIPT_PATH = 'scripts/process-meeting-video-check.mjs'
export const MEETING_VIDEO_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-meeting-video-preflight-closeout.md'
export const MEETING_VIDEO_NEXT_CARD_ID = 'SKOOL-WORKER-001'
export const MEETING_SOURCE_ID = 'SRC-MEETINGS-001'
export const VIDEO_SOURCE_ID = 'SRC-VIDEO-001'
export const VIDEO_INVENTORY_TARGET_KEY = 'video-link-inventory'
export const VIDEO_CONTENT_TARGET_KEY = 'video-content-extract-backfill'

export const MEETING_VIDEO_CHANGED_FILES = [
  'lib/meeting-video-proof.js',
  MEETING_VIDEO_SCRIPT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  MEETING_VIDEO_PLAN_PATH,
  MEETING_VIDEO_APPROVAL_PATH,
  MEETING_VIDEO_CLOSEOUT_PATH,
  'package.json',
]

export const MEETING_VIDEO_PROOF_COMMANDS = [
  'node --check lib/meeting-video-proof.js scripts/process-meeting-video-check.mjs',
  'npm run process:meeting-video-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MEETING-VIDEO-001 --planApprovalRef=docs/process/approvals/MEETING-VIDEO-001.json --closeoutKey=meeting-video-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MEETING-VIDEO-001 --closeoutKey=meeting-video-preflight-v1',
  'npm run process:foundation-ship -- --card=MEETING-VIDEO-001 --planApprovalRef=docs/process/approvals/MEETING-VIDEO-001.json --closeoutKey=meeting-video-preflight-v1 --commitRef=HEAD',
]

const PLATFORM_ORDER = {
  youtube: 0,
  google_drive: 1,
  zoom: 2,
  loom: 3,
  skool: 4,
  unknown: 9,
}

const SAFE_TRANSCRIPT_PLATFORMS = new Set(['youtube'])
const APPROVAL_BOUND_PLATFORMS = new Set(['google_drive', 'zoom', 'loom', 'skool'])

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function metadataOf(row = {}) {
  return row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
}

function discoveredFrom(row = {}) {
  const metadata = metadataOf(row)
  return metadata.discoveredFrom && typeof metadata.discoveredFrom === 'object'
    ? metadata.discoveredFrom
    : {}
}

function lowerBlob(parts = []) {
  return parts.map(value => text(value).toLowerCase()).filter(Boolean).join(' ')
}

function stableExternalId(row = {}) {
  return text(row.externalId || row.external_id || row.sourceUrl || row.source_url)
}

function normalizePlatform(value = '') {
  const raw = text(value).toLowerCase()
  if (raw.includes('youtube') || raw.includes('youtu.be')) return 'youtube'
  if (raw.includes('google_drive') || raw.includes('drive.google') || raw.includes('docs.google')) return 'google_drive'
  if (raw.includes('zoom')) return 'zoom'
  if (raw.includes('loom')) return 'loom'
  if (raw.includes('skool')) return 'skool'
  if (raw.includes('vimeo')) return 'vimeo'
  if (raw.includes('wistia')) return 'wistia'
  return raw || 'unknown'
}

function inferPlatform(rawUrl = '', metadata = {}) {
  const explicit = normalizePlatform(metadata.platform || metadata.valueRoute || metadata.sourceKind)
  if (explicit !== 'unknown') return explicit
  return normalizePlatform(rawUrl)
}

function hasMeetingWords(value = '') {
  return /(meeting|huddle|regroup|recording|transcript|gemini|notes by gemini|weekly|training|webinar|live sales|zoom)/i.test(String(value || ''))
}

function meetingSignalScore(row = {}) {
  const metadata = metadataOf(row)
  const from = discoveredFrom(row)
  const blob = lowerBlob([
    row.title,
    row.externalId,
    row.external_id,
    metadata.valueRoute,
    metadata.sourceKind,
    metadata.evidenceExcerpt,
    from.sourceId,
    from.artifactType,
    from.title,
  ])
  let score = 0
  if (from.sourceId === MEETING_SOURCE_ID) score += 5
  if (/meeting_note|meeting_transcript/.test(text(from.artifactType))) score += 4
  if (/meeting|huddle|regroup|gemini|notes by gemini/.test(blob)) score += 3
  if (/recording|zoom|webinar|live sales|training/.test(blob)) score += 2
  if (/shared_communication_artifact/.test(blob)) score += 1
  return score
}

function buildVideoExtractionMap(extractionItems = []) {
  const map = new Map()
  for (const item of list(extractionItems)) {
    const externalId = stableExternalId(item)
    if (!externalId) continue
    map.set(externalId, {
      itemKey: item.itemKey || item.item_key || '',
      status: item.status || '',
      artifactId: item.artifactId || item.artifact_id || '',
      platform: inferPlatform(externalId, metadataOf(item)),
      contentExtractionStatus: metadataOf(item).contentExtractionStatus || '',
      skipReason: metadataOf(item).skipReason || '',
    })
  }
  return map
}

export function classifyMeetingVideoLink(row = {}, extractionMap = new Map()) {
  const metadata = metadataOf(row)
  const from = discoveredFrom(row)
  const externalId = stableExternalId(row)
  const platform = inferPlatform(externalId, metadata)
  const extraction = extractionMap.get(externalId) || null
  const score = meetingSignalScore(row)
  const approvalBound = APPROVAL_BOUND_PLATFORMS.has(platform)
  const transcriptReady = SAFE_TRANSCRIPT_PLATFORMS.has(platform) && extraction?.status === 'succeeded'
  const route = (() => {
    if (platform === 'youtube' && transcriptReady) return 'reuse_existing_youtube_transcript'
    if (platform === 'youtube') return 'youtube_subtitle_or_no_subtitle_vision_lane'
    if (platform === 'google_drive') return 'drive_media_locator_and_drive_worker'
    if (platform === 'zoom') return 'zoom_recording_or_registration_approval_packet'
    if (platform === 'loom') return 'loom_preflight_packet'
    if (platform === 'skool') return 'skool_worker_access_packet'
    return 'unsupported_platform_review'
  })()
  return {
    itemKey: row.itemKey || row.item_key || '',
    targetKey: row.targetKey || row.target_key || VIDEO_INVENTORY_TARGET_KEY,
    externalId,
    sourceId: row.sourceId || row.source_id || VIDEO_SOURCE_ID,
    platform,
    status: row.status || '',
    valueRoute: metadata.valueRoute || '',
    ownershipClass: metadata.ownershipClass || 'unknown',
    sourceKind: metadata.sourceKind || '',
    discoveredFrom: {
      sourceId: from.sourceId || '',
      artifactType: from.artifactType || '',
      title: from.title || '',
      artifactId: from.artifactId || '',
    },
    evidenceExcerptPresent: Boolean(text(metadata.evidenceExcerpt)),
    meetingSignalScore: score,
    meetingLinked: score > 0,
    extraction,
    transcriptReady,
    approvalBound,
    route,
    nextAction: approvalBound
      ? 'Park live media access behind source-specific approval; keep queue/provenance visible.'
      : 'Use existing transcript lane or route unsupported media to a bounded follow-up.',
  }
}

export function classifyMeetingRecordingArtifact(artifact = {}) {
  const content = text(artifact.contentText || artifact.content_text)
  const title = text(artifact.title)
  const hasRecordingLabel = /meeting records[\s\S]{0,80}recording/i.test(content) || /recording/i.test(title)
  const hasTranscriptLabel = /meeting records[\s\S]{0,80}transcript/i.test(content) || /transcript/i.test(title)
  const isMeetingNote = (artifact.sourceId || artifact.source_id) === MEETING_SOURCE_ID &&
    (artifact.artifactType || artifact.artifact_type) === 'meeting_note'
  return {
    artifactId: artifact.artifactId || artifact.artifact_id || '',
    sourceId: artifact.sourceId || artifact.source_id || '',
    artifactType: artifact.artifactType || artifact.artifact_type || '',
    title,
    hasRecordingLabel,
    hasTranscriptLabel,
    candidate: isMeetingNote && hasRecordingLabel,
    route: hasRecordingLabel ? 'meeting_recording_locator_required' : 'no_recording_label',
    accessClass: 'workspace_meeting_media_private',
    nextAction: hasRecordingLabel
      ? 'Locate the actual Drive/Meet/Zoom recording via approved meeting media locator before any transcription or screenshots.'
      : 'No meeting recording action.',
  }
}

export function buildMeetingVideoQueue({ videoItems = [], extractionItems = [], meetingArtifacts = [] } = {}) {
  const extractionMap = buildVideoExtractionMap(extractionItems)
  const videoRows = list(videoItems).map(item => classifyMeetingVideoLink(item, extractionMap))
  const meetingLinkedRows = videoRows
    .filter(row => row.meetingLinked || row.platform === 'zoom')
    .sort((a, b) => {
      if (b.meetingSignalScore !== a.meetingSignalScore) return b.meetingSignalScore - a.meetingSignalScore
      return (PLATFORM_ORDER[a.platform] ?? 9) - (PLATFORM_ORDER[b.platform] ?? 9)
    })
  const recordingArtifacts = list(meetingArtifacts)
    .map(classifyMeetingRecordingArtifact)
    .filter(row => row.candidate)
  const platformCounts = {}
  const approvalBoundCounts = {}
  for (const row of videoRows) {
    platformCounts[row.platform] = (platformCounts[row.platform] || 0) + 1
    if (row.approvalBound) approvalBoundCounts[row.platform] = (approvalBoundCounts[row.platform] || 0) + 1
  }
  const transcriptRows = videoRows.filter(row => row.transcriptReady)
  const decisions = [
    {
      platform: 'youtube',
      status: transcriptRows.length ? 'existing_transcript_available' : 'subtitle_or_vision_followup',
      blocking: false,
      nextAction: 'Reuse existing subtitle transcripts where present; no-subtitle videos route to the future vision/transcription lane.',
    },
    {
      platform: 'google_drive',
      status: approvalBoundCounts.google_drive ? 'approval_bound_drive_media_locator' : 'no_current_candidate',
      blocking: Boolean(approvalBoundCounts.google_drive),
      nextAction: 'Use DRIVE-WORKER-001 or a meeting-media locator before reading/downloading private Drive video files.',
    },
    {
      platform: 'zoom',
      status: approvalBoundCounts.zoom ? 'approval_bound_zoom_recording' : 'no_current_candidate',
      blocking: Boolean(approvalBoundCounts.zoom),
      nextAction: 'Do not open Zoom links or recover recordings without a source-specific packet.',
    },
    {
      platform: 'loom',
      status: approvalBoundCounts.loom ? 'approval_bound_loom_packet' : 'no_current_candidate',
      blocking: Boolean(approvalBoundCounts.loom),
      nextAction: 'Use the parked LOOM-001 run packet path.',
    },
    {
      platform: 'skool',
      status: approvalBoundCounts.skool ? 'approval_bound_skool_worker' : 'no_current_candidate',
      blocking: Boolean(approvalBoundCounts.skool),
      nextAction: 'Continue to SKOOL-WORKER-001 for access-path proof.',
    },
    {
      platform: 'meeting_records',
      status: recordingArtifacts.length ? 'meeting_recording_locator_required' : 'no_recording_labels_found',
      blocking: recordingArtifacts.length > 0,
      nextAction: 'Meeting notes show recording labels, but actual media URLs/files require an approved locator before review.',
    },
  ]
  const blockedActions = decisions
    .filter(row => row.blocking)
    .map(row => ({
      platform: row.platform,
      reason: row.status,
      nextAction: row.nextAction,
    }))
  return {
    ok: videoRows.length > 0 && recordingArtifacts.length > 0 && decisions.length >= 5,
    status: 'blocked_pending_platform_extractor',
    sourceId: VIDEO_SOURCE_ID,
    meetingSourceId: MEETING_SOURCE_ID,
    videoLinkCount: videoRows.length,
    meetingLinkedVideoLinkCount: meetingLinkedRows.length,
    meetingRecordingArtifactCount: recordingArtifacts.length,
    platformCounts,
    approvalBoundCounts,
    transcriptReadyCount: transcriptRows.length,
    selectedMeetingLinks: meetingLinkedRows.slice(0, 10),
    selectedMeetingRecordings: recordingArtifacts.slice(0, 10),
    decisions,
    blockedActions,
    canRunLiveMediaNow: false,
    sideEffects: {
      liveBrowserLaunched: false,
      networkFetched: false,
      privateMediaRead: false,
      recordingDownloaded: false,
      screenshotBytesStored: false,
      providerCallsStarted: false,
      modelCallsStarted: false,
      downstreamWritesStarted: false,
      externalWritesStarted: false,
      credentialMutationStarted: false,
      drivePermissionMutationStarted: false,
    },
  }
}

export function buildMeetingVideoApprovalPacket(queue = {}) {
  return {
    cardId: MEETING_VIDEO_CARD_ID,
    sourceId: MEETING_SOURCE_ID,
    sourcePosture: 'private_workspace_meeting_media',
    status: 'approval_required',
    canRunNow: false,
    requestedMeetingRecordings: queue.selectedMeetingRecordings?.length || 0,
    requestedMeetingLinks: queue.selectedMeetingLinks?.length || 0,
    approvalRequiredFor: [
      'locating private Google Meet/Drive/Zoom recording files',
      'reading or downloading private meeting media',
      'transcribing audio/video beyond existing archived transcript text',
      'capturing screenshots/keyframes from private meeting recordings',
      'provider/browser/model calls over private meeting media',
      'writing local artifacts from private meeting media',
    ],
    blockedCommand: 'No live meeting media locator or recording review command is approved by this card. Create/run a source-specific governed job after Steve approves exact meeting/media scope.',
    allowedWithoutApproval: [
      'read local meeting notes/transcripts already archived',
      'read local video-link-inventory manifest rows',
      'prioritize meeting-linked media candidates',
      'classify platform/access/rights posture',
      'prove WEB-GODMODE and multimodal synthetic meeting-video envelopes',
    ],
    requiredApprovalFields: [
      'approvedBy',
      'approvedAt',
      'meetingArtifactIds',
      'mediaUrlsOrFileIds',
      'contentUseBoundary',
      'screenshotStoragePolicy',
      'transcriptionProviderOrLocalRoute',
      'maxRecordings',
      'maxRuntimeMinutes',
      'maxCostUsd',
      'artifactRetentionPolicy',
    ],
    nextAction: `Park live meeting media review as approval-bound and continue ${MEETING_VIDEO_NEXT_CARD_ID}.`,
  }
}

export function buildSyntheticApprovedMeetingVideoObservation() {
  return buildWebGodmodeObservation({
    request: {
      sourceId: MEETING_SOURCE_ID,
      sourceType: 'drive_video_or_screenshot',
      sourceUrl: 'https://meet.google.com/synthetic-recording/meeting-video-proof',
      accessClass: 'authorized_paid_private',
      rightsClass: 'steve_workspace_meeting_recording',
      contentUseBoundary: 'Synthetic approved fixture only; real meeting media requires a source-specific run packet.',
      allowedHosts: ['meet.google.com'],
      runMode: 'synthetic_no_network',
      operations: [
        'page_text',
        'dom_outline',
        'media_discovery',
        'transcript_discovery',
        'screenshot_reference',
        'workflow_observation',
      ],
      browserSessionPreflight: {
        approved: true,
        approvedBy: 'synthetic-test',
        actor: 'codex-foundation-builder',
        identity: 'synthetic meeting media fixture',
        expiresAtOrReviewBy: '2026-05-20',
      },
      screenshotStoragePolicy: 'synthetic meeting screenshot references only; real keyframes require approved storage policy',
      visualEvidenceUseBoundary: 'synthetic workflow notes only; real visual evidence remains review-only until source packet approval',
    },
    html: `
      <main>
        <h1>Meeting Recording: Weekly Partner Meeting</h1>
        <p>The synthetic screen recording shows a dashboard walkthrough.</p>
        <a href="https://meet.google.com/synthetic-recording/transcript.vtt">Transcript</a>
        <video src="https://meet.google.com/synthetic-recording/video.mp4"></video>
      </main>
    `,
  })
}

export function buildMeetingVideoMultimodalEnvelope() {
  const envelope = {
    sourceId: MEETING_SOURCE_ID,
    sourceType: 'drive_video_or_screenshot',
    sourceUrl: 'https://meet.google.com/synthetic-recording/meeting-video-proof',
    accessClass: 'authorized_paid_private',
    rightsClass: 'steve_workspace_meeting_recording',
    contentUseBoundary: 'Real meeting recording review is approval-bound; this envelope proves the required output contract only.',
    evidenceLevels: ['metadata_only', 'transcript_text', 'screenshot_keyframe_reference', 'browser_session_observation'],
    route: {
      provider: 'none',
      model: 'synthetic-contract-proof',
      authPath: 'synthetic_no_network',
      estimatedCostUsd: 0,
    },
    observations: [
      {
        type: 'meeting_video_preflight',
        text: 'Meeting note has recording label and awaits source-specific approval before media review.',
        sourceAnchor: 'SRC-MEETINGS-001 synthetic meeting artifact',
      },
    ],
    sourceAnchors: [
      { id: 'meeting-note', url: 'SRC-MEETINGS-001 synthetic meeting artifact', kind: 'meeting_note' },
    ],
    recommendation: 'needs_review',
    confidence: 0.7,
    screenshotStoragePolicy: 'Synthetic only; real screenshot/keyframe storage requires approved meeting-video packet.',
    visualEvidenceUseBoundary: 'Visual observations remain review-only until Steve approves meeting media use.',
    accountPreflight: {
      approved: true,
      approvedBy: 'synthetic-test',
    },
    autoBacklogMutation: false,
  }
  return {
    envelope,
    validation: validateMultimodalExtractionEnvelope(envelope),
  }
}

export function buildMeetingVideoPreflightStatus(input = {}) {
  const queue = buildMeetingVideoQueue(input)
  const approvalPacket = buildMeetingVideoApprovalPacket(queue)
  const approvedObservation = buildSyntheticApprovedMeetingVideoObservation()
  const blockedObservation = buildWebGodmodeObservation({
    request: {
      sourceId: MEETING_SOURCE_ID,
      sourceType: 'drive_video_or_screenshot',
      sourceUrl: 'https://meet.google.com/synthetic-recording/private-proof',
      accessClass: 'authorized_paid_private',
      rightsClass: 'steve_workspace_meeting_recording',
      contentUseBoundary: 'Approval required before private meeting media is accessed.',
      allowedHosts: ['meet.google.com'],
      runMode: 'synthetic_no_network',
      operations: ['page_text', 'media_discovery', 'screenshot_reference'],
      browserSessionPreflight: {
        approved: false,
      },
      screenshotStoragePolicy: 'required but not enough without source preflight',
      visualEvidenceUseBoundary: 'required but not enough without source preflight',
    },
    html: '<main><h1>Blocked private meeting recording</h1></main>',
  })
  const multimodal = buildMeetingVideoMultimodalEnvelope()
  return {
    ok: queue.ok &&
      approvalPacket.canRunNow === false &&
      approvedObservation.ok === true &&
      blockedObservation.ok === false &&
      multimodal.validation.ok === true,
    status: 'blocked_pending_approval',
    queue,
    approvalPacket,
    approvedObservationSummary: {
      ok: approvedObservation.ok,
      status: approvedObservation.status,
      liveBrowserLaunched: approvedObservation.liveBrowserLaunched,
      networkFetched: approvedObservation.networkFetched,
      mediaCount: approvedObservation.media?.length || 0,
      transcriptCandidateCount: approvedObservation.transcriptCandidates?.length || 0,
    },
    blockedObservationSummary: {
      ok: blockedObservation.ok,
      status: blockedObservation.status,
      failureCodes: list(blockedObservation.failures).map(item => item.code),
    },
    multimodal: {
      ok: multimodal.validation.ok,
      findings: multimodal.validation.findings || [],
    },
    sideEffects: queue.sideEffects,
  }
}

export function buildMeetingVideoDogfoodProof() {
  const syntheticVideoItems = [
    {
      itemKey: 'video-link:zoom:synthetic',
      externalId: 'https://us02web.zoom.us/rec/share/synthetic',
      status: 'succeeded',
      metadata: {
        platform: 'zoom',
        valueRoute: 'zoom_source',
        evidenceExcerpt: 'Meeting recording link from Weekly Partner Meeting.',
        discoveredFrom: {
          sourceId: MEETING_SOURCE_ID,
          artifactType: 'meeting_note',
          title: 'Weekly Partner Meeting - Notes by Gemini',
          artifactId: 'synthetic-meeting-note',
        },
      },
    },
    {
      itemKey: 'video-link:youtube:synthetic',
      externalId: 'https://www.youtube.com/watch?v=abc123xyz',
      status: 'succeeded',
      metadata: {
        platform: 'youtube',
        valueRoute: 'youtube_source',
        evidenceExcerpt: 'Meeting training recap video.',
        discoveredFrom: {
          sourceId: MEETING_SOURCE_ID,
          artifactType: 'meeting_note',
          title: 'Training Recap Meeting - Notes by Gemini',
          artifactId: 'synthetic-meeting-note',
        },
      },
    },
  ]
  const syntheticExtractionItems = [
    {
      itemKey: 'video-content:youtube:synthetic',
      externalId: 'https://www.youtube.com/watch?v=abc123xyz',
      status: 'succeeded',
      artifactId: 'SRC-YOUTUBE-INTEL-001:video_transcript:abc123xyz',
      metadata: {
        platform: 'youtube',
        contentExtractionStatus: 'succeeded',
      },
    },
  ]
  const syntheticMeetingArtifacts = [
    {
      artifactId: 'synthetic-meeting-note',
      sourceId: MEETING_SOURCE_ID,
      artifactType: 'meeting_note',
      title: 'Weekly Partner Meeting - Notes by Gemini',
      contentText: 'Meeting records Transcript Recording\nSummary\nThe team reviewed a dashboard.',
    },
  ]
  const queue = buildMeetingVideoQueue({
    videoItems: syntheticVideoItems,
    extractionItems: syntheticExtractionItems,
    meetingArtifacts: syntheticMeetingArtifacts,
  })
  const preflight = buildMeetingVideoPreflightStatus({
    videoItems: syntheticVideoItems,
    extractionItems: syntheticExtractionItems,
    meetingArtifacts: syntheticMeetingArtifacts,
  })
  const checks = [
    {
      ok: queue.meetingLinkedVideoLinkCount === 2,
      check: 'synthetic meeting-linked video links are prioritized',
      detail: String(queue.meetingLinkedVideoLinkCount),
    },
    {
      ok: queue.transcriptReadyCount === 1,
      check: 'existing YouTube transcript can be reused without private media access',
      detail: String(queue.transcriptReadyCount),
    },
    {
      ok: queue.blockedActions.some(row => row.platform === 'zoom'),
      check: 'Zoom meeting media routes to approval-bound packet',
      detail: queue.blockedActions.map(row => row.platform).join(', '),
    },
    {
      ok: preflight.blockedObservationSummary.failureCodes.includes('browser_session_preflight_required'),
      check: 'private meeting observation blocks without browser/source preflight',
      detail: preflight.blockedObservationSummary.failureCodes.join(', '),
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    queue,
    preflightStatus: preflight.status,
  }
}
