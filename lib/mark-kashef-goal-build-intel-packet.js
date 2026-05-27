import {
  listCreatorWatchlistEntries,
} from './build-intel-watchlist.js'
import {
  buildCourseSourceAuthBoundarySnapshot,
} from './course-source-auth-boundary.js'
import {
  YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
  YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
  YOUTUBE_BUILD_INTEL_SOURCE_ID,
  buildYoutubeBuildIntelBatchSnapshot,
} from './youtube-build-intel-batch.js'

export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID = 'MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001'
export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY = 'mark-kashef-goal-build-intel-packet-v1'
export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PLAN_PATH = 'docs/process/mark-kashef-goal-build-intel-packet-001-plan.md'
export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PACKET_PATH = 'docs/process/mark-kashef-goal-build-intel-packet-001-packet.md'
export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_APPROVAL_PATH = 'docs/process/approvals/MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001.json'
export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SCRIPT_PATH = 'scripts/process-mark-kashef-goal-build-intel-packet-check.mjs'
export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-mark-kashef-goal-build-intel-packet-closeout.md'
export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SPRINT_ID = 'mark-kashef-goal-build-intel-packet-2026-05-18'
export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID = 'MATT-POCOCK-CLAUDE-FOLDER-EVAL-001'
export const MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID = 'AIOS-GOAL-DRIVEN-RUNNER-EVAL-001'
export const MARK_KASHEF_GOAL_CREATOR_ID = 'mark-kashef'
export const MARK_KASHEF_GOAL_VIDEO_ID = '5xrjO38WUYY'
export const MARK_KASHEF_GOAL_VIDEO_URL = `https://www.youtube.com/watch?v=${MARK_KASHEF_GOAL_VIDEO_ID}`
export const MARK_KASHEF_GOAL_VIDEO_TITLE = 'How to Use /goal to Build a Self-Improving OS'
export const MARK_KASHEF_GOAL_VIDEO_CHANNEL = 'Mark Kashef'
export const MARK_KASHEF_GOAL_VIDEO_DURATION_SECONDS = 653

export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CHANGED_FILES = [
  'lib/mark-kashef-goal-build-intel-packet.js',
  'scripts/process-mark-kashef-goal-build-intel-packet-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PLAN_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PACKET_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_APPROVAL_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PROOF_COMMANDS = [
  'node --check lib/mark-kashef-goal-build-intel-packet.js lib/foundation-intelligence-audit-verifier.js scripts/process-mark-kashef-goal-build-intel-packet-check.mjs scripts/foundation-verify.mjs',
  'npm run process:mark-kashef-goal-build-intel-packet-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001 --planApprovalRef=docs/process/approvals/MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001.json --closeoutKey=mark-kashef-goal-build-intel-packet-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001 --closeoutKey=mark-kashef-goal-build-intel-packet-v1',
  'npm run process:foundation-ship -- --card=MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001 --planApprovalRef=docs/process/approvals/MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001.json --closeoutKey=mark-kashef-goal-build-intel-packet-v1 --commitRef=HEAD',
]

export const MARK_KASHEF_GOAL_NOT_NEXT_BOUNDARIES = [
  'No transcript fetch, video download, screenshot/keyframe capture, vision analysis, summarization, or model call.',
  'No private Skool access, paid content, comments/member data, authorized browser session, or community/course crawl.',
  'No Research Inbox write, KB page write, atom row write, synthesis fact write, action-route row write, vector/query-index write, or backlog mutation from extracted content.',
  'No implementation of a goal runner, Claude Code /goal automation, Codex goal automation, Harlan runtime, hidden subagent, or live extraction worker.',
  'No MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
  'No Drive permissions mutation or Drive request-access email.',
  'No Drive/Gmail/ClickUp/Slack/Agent Feedback mutation or external write.',
]

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  liveExtractionStarted: false,
  transcriptFetched: false,
  screenshotsCaptured: 0,
  keyframesCaptured: 0,
  videoDownloaded: false,
  visionAnalysisStarted: false,
  modelCallsStarted: false,
  privateSkoolAccessUsed: false,
  paidAuthUsed: false,
  authorizedBrowserOpened: false,
  commentsRead: false,
  memberDataRead: false,
  researchInboxWritten: false,
  kbDraftsCreated: 0,
  atomsCreated: 0,
  synthesisFactsCreated: 0,
  actionRoutesCreated: 0,
  vectorWrites: 0,
  queryIndexWrites: 0,
  backlogMutatedFromExtractedContent: false,
  externalWritesStarted: false,
})

export const MARK_KASHEF_GOAL_PUBLIC_SOURCE_EVIDENCE = [
  {
    sourceKey: 'mark-kashef-youtube-video',
    sourceType: 'public_youtube_video_metadata',
    url: MARK_KASHEF_GOAL_VIDEO_URL,
    title: MARK_KASHEF_GOAL_VIDEO_TITLE,
    creator: MARK_KASHEF_GOAL_VIDEO_CHANNEL,
    videoId: MARK_KASHEF_GOAL_VIDEO_ID,
    durationSeconds: MARK_KASHEF_GOAL_VIDEO_DURATION_SECONDS,
    lookupMethod: 'public YouTube page metadata only',
    lookupAt: '2026-05-18T18:45:00.000-04:00',
  },
  {
    sourceKey: 'mark-kashef-youtube-channel',
    sourceType: 'public_youtube_channel_metadata',
    url: 'https://www.youtube.com/@Mark_Kashef',
    channelId: 'UCHkzp52CldSPZqU5T49mOnA',
    creator: MARK_KASHEF_GOAL_VIDEO_CHANNEL,
    lookupMethod: 'public YouTube channel page metadata only',
    lookupAt: '2026-05-18T18:45:00.000-04:00',
  },
  {
    sourceKey: 'claude-code-goal-docs',
    sourceType: 'official_product_docs',
    url: 'https://code.claude.com/docs/en/goal',
    title: 'Keep Claude working toward a goal',
    creator: 'Anthropic Claude Code docs',
    lookupMethod: 'official docs lookup',
    lookupAt: '2026-05-18T18:45:00.000-04:00',
  },
  {
    sourceKey: 'moderncreator-mark-kashef-listing',
    sourceType: 'public_editorial_listing',
    url: 'https://moderncreator.app/',
    title: 'How to Use /goal to Build a Self-Improving OS',
    creator: MARK_KASHEF_GOAL_VIDEO_CHANNEL,
    publishedDate: '2026-05-17',
    lookupMethod: 'public listing corroborates title/date/duration only',
    lookupAt: '2026-05-18T18:45:00.000-04:00',
  },
]

export const MARK_KASHEF_GOAL_PATTERN_CANDIDATES = [
  {
    patternId: 'measurable_goal_condition',
    status: 'official_goal_docs_supported',
    aiosUse: 'Foundation runner goals should name a measurable done condition and proof command before unattended work starts.',
    targetCardId: MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID,
  },
  {
    patternId: 'turn_to_turn_continuation',
    status: 'official_goal_docs_supported',
    aiosUse: 'Long-running builders need an explicit continue/stop loop that survives ordinary turn boundaries without Steve babysitting each step.',
    targetCardId: MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID,
  },
  {
    patternId: 'independent_completion_evaluator',
    status: 'official_goal_docs_supported',
    aiosUse: 'A separate evaluator/proof step should decide whether a goal is done instead of trusting the same builder that performed the work.',
    targetCardId: MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID,
  },
  {
    patternId: 'operator_visible_stop_controls',
    status: 'official_goal_docs_supported',
    aiosUse: 'Foundation runners need visible pause/clear/stop controls, max time/spend, and wrap-report rules.',
    targetCardId: MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID,
  },
]

function text(value) {
  return String(value || '').trim()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function unsafeSideEffects(sideEffects = {}) {
  return Object.entries({ ...DEFAULT_SIDE_EFFECTS, ...sideEffects })
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
}

function copiedContentViolations(contentArtifacts = []) {
  const unsafeKeys = /transcript|rawVideo|screenshot|keyframe|summaryFromVideo|commentText|memberData|skoolContent/i
  const violations = []
  for (const [index, artifact] of (contentArtifacts || []).entries()) {
    for (const [key, value] of Object.entries(artifact || {})) {
      const hasValue = Array.isArray(value) ? value.length > 0 : Boolean(text(value))
      if (unsafeKeys.test(key) && hasValue) violations.push(`${index}.${key}`)
    }
  }
  return violations
}

function findMarkKashefWatchlistEntry(watchlistEntries = listCreatorWatchlistEntries({ sourceCategory: 'build_intel' })) {
  return (watchlistEntries || []).find(entry => entry.creatorId === MARK_KASHEF_GOAL_CREATOR_ID) || null
}

function publicYoutubePlatform(entry = {}) {
  return (entry.platforms || []).find(platform =>
    platform.type === 'youtube' &&
      platform.url === 'https://www.youtube.com/@Mark_Kashef' &&
      platform.accessBoundary === 'public_lookup_required'
  ) || null
}

function paidSkoolPlatform(entry = {}) {
  return (entry.platforms || []).find(platform =>
    platform.type === 'skool' &&
      /paid_authorized_required/.test(platform.accessBoundary || '')
  ) || null
}

function sourceEvidenceByKey(evidence = MARK_KASHEF_GOAL_PUBLIC_SOURCE_EVIDENCE) {
  return Object.fromEntries((evidence || []).map(row => [row.sourceKey, row]))
}

function buildSourcePacket({
  evidence = MARK_KASHEF_GOAL_PUBLIC_SOURCE_EVIDENCE,
  transcriptExtracted = false,
  visualWorkflowExtracted = false,
  contentClaimsVerified = false,
} = {}) {
  const byKey = sourceEvidenceByKey(evidence)
  return {
    sourceId: YOUTUBE_BUILD_INTEL_SOURCE_ID,
    creatorId: MARK_KASHEF_GOAL_CREATOR_ID,
    creatorName: MARK_KASHEF_GOAL_VIDEO_CHANNEL,
    video: {
      videoId: byKey['mark-kashef-youtube-video']?.videoId || '',
      url: byKey['mark-kashef-youtube-video']?.url || '',
      title: byKey['mark-kashef-youtube-video']?.title || '',
      durationSeconds: byKey['mark-kashef-youtube-video']?.durationSeconds || 0,
      channel: byKey['mark-kashef-youtube-video']?.creator || '',
      publishedDate: byKey['moderncreator-mark-kashef-listing']?.publishedDate || 'lookup_required',
    },
    channel: {
      url: byKey['mark-kashef-youtube-channel']?.url || '',
      channelId: byKey['mark-kashef-youtube-channel']?.channelId || '',
    },
    officialGoalDocs: {
      url: byKey['claude-code-goal-docs']?.url || '',
      title: byKey['claude-code-goal-docs']?.title || '',
    },
    sourceEvidence: clone(evidence),
    sourceClaims: {
      videoMetadataVerified: true,
      officialGoalMechanicsVerified: true,
      transcriptExtracted,
      visualWorkflowExtracted,
      contentClaimsVerified,
      markSpecificWorkflowClaims: 'blocked_until_public_runtime_extraction',
    },
  }
}

export function buildMarkKashefGoalBuildIntelPacketSnapshot({
  watchlistEntries = listCreatorWatchlistEntries({ sourceCategory: 'build_intel' }),
  youtubeBatch = buildYoutubeBuildIntelBatchSnapshot(),
  sourceAuthBoundary = buildCourseSourceAuthBoundarySnapshot(),
  evidence = MARK_KASHEF_GOAL_PUBLIC_SOURCE_EVIDENCE,
  sourcePacket = buildSourcePacket({ evidence }),
  sideEffects = {},
  contentArtifacts = [],
  outputTarget = 'proposal_packet_only',
} = {}) {
  const findings = []
  const watchlistEntry = findMarkKashefWatchlistEntry(watchlistEntries)
  const youtubePlatform = publicYoutubePlatform(watchlistEntry || {})
  const skoolPlatform = paidSkoolPlatform(watchlistEntry || {})
  const youtubeRow = (sourceAuthBoundary.rows || []).find(row => row.sourceId === YOUTUBE_BUILD_INTEL_SOURCE_ID)
  const queueSpec = (youtubeBatch.queueSpecs || []).find(spec => spec.creatorId === MARK_KASHEF_GOAL_CREATOR_ID)
  const effects = { ...DEFAULT_SIDE_EFFECTS, ...(sideEffects || {}) }
  const effectViolations = unsafeSideEffects(effects)
  const contentViolations = copiedContentViolations(contentArtifacts)
  const byKey = sourceEvidenceByKey(evidence)

  addFinding(findings, watchlistEntry?.creatorId === MARK_KASHEF_GOAL_CREATOR_ID && watchlistEntry?.sourceCategory === 'build_intel', 'Mark Kashef watchlist entry exists as Build Intel source', watchlistEntry ? `${watchlistEntry.creatorId}:${watchlistEntry.sourceCategory}` : 'missing')
  addFinding(findings, youtubePlatform?.url === 'https://www.youtube.com/@Mark_Kashef', 'watchlist carries public YouTube source', youtubePlatform?.url || 'missing')
  addFinding(findings, Boolean(skoolPlatform) && watchlistEntry?.accessBoundary === 'mixed_public_and_paid_authorized_required', 'paid Skool surface stays separated from public lookup', skoolPlatform ? `${skoolPlatform.url} / ${skoolPlatform.accessBoundary}` : 'missing')
  addFinding(findings, youtubeRow?.sourceClass === 'public_no_auth' && youtubeRow?.extractionAllowed === false && youtubeRow?.approvalRequired === true, 'public YouTube is metadata/public lookup only until runtime approval', `${youtubeRow?.sourceClass || 'missing'} allowed=${youtubeRow?.extractionAllowed}`)
  addFinding(findings, youtubeBatch.ok === true && queueSpec?.runtimeApprovalRequired === true && queueSpec?.liveExtractionApproved === false, `${YOUTUBE_BUILD_INTEL_BATCH_CARD_ID} queue includes Mark Kashef without live extraction`, queueSpec ? `${queueSpec.queueKey} approval=${queueSpec.runtimeApprovalRequired}` : 'missing')
  addFinding(findings, sourcePacket.video.videoId === MARK_KASHEF_GOAL_VIDEO_ID && sourcePacket.video.url === MARK_KASHEF_GOAL_VIDEO_URL, 'exact public video URL is verified from metadata lookup', sourcePacket.video.url || 'missing')
  addFinding(findings, sourcePacket.video.title === MARK_KASHEF_GOAL_VIDEO_TITLE && sourcePacket.video.channel === MARK_KASHEF_GOAL_VIDEO_CHANNEL, 'exact public video title and channel are verified', `${sourcePacket.video.title || 'missing'} / ${sourcePacket.video.channel || 'missing'}`)
  addFinding(findings, Number(sourcePacket.video.durationSeconds) === MARK_KASHEF_GOAL_VIDEO_DURATION_SECONDS, 'public video duration metadata is captured without download', String(sourcePacket.video.durationSeconds || 0))
  addFinding(findings, byKey['claude-code-goal-docs']?.url === 'https://code.claude.com/docs/en/goal', 'official Claude /goal docs are linked for mechanics', byKey['claude-code-goal-docs']?.url || 'missing')
  addFinding(findings, sourcePacket.sourceClaims.transcriptExtracted === false && sourcePacket.sourceClaims.visualWorkflowExtracted === false && sourcePacket.sourceClaims.contentClaimsVerified === false, 'Mark-specific transcript/visual claims remain unextracted', JSON.stringify(sourcePacket.sourceClaims))
  addFinding(findings, MARK_KASHEF_GOAL_PATTERN_CANDIDATES.length >= 4 && MARK_KASHEF_GOAL_PATTERN_CANDIDATES.every(pattern => pattern.targetCardId === MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID), 'pattern candidates route to AIOS goal-runner eval, not direct implementation', MARK_KASHEF_GOAL_PATTERN_CANDIDATES.map(pattern => pattern.patternId).join(', '))
  addFinding(findings, outputTarget === 'proposal_packet_only', 'packet output stays proposal-only', outputTarget)
  addFinding(findings, contentViolations.length === 0, 'no transcript/video/private content copied into packet', contentViolations.join(', ') || 'none')
  addFinding(findings, effectViolations.length === 0, 'no extraction/model/output/external side effects occurred', effectViolations.join(', ') || 'none')

  const failures = findings.filter(finding => !finding.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready',
    cardId: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
    closeoutKey: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY,
    sourceId: YOUTUBE_BUILD_INTEL_SOURCE_ID,
    creatorId: MARK_KASHEF_GOAL_CREATOR_ID,
    metadataOnlyPublicLookup: true,
    publicSourceLookupCompleted: true,
    liveExtractionStarted: false,
    runtimeExtractionApprovalRequired: true,
    writesBacklog: false,
    opensSprint: false,
    outputTarget,
    sourcePacket,
    patternCandidates: clone(MARK_KASHEF_GOAL_PATTERN_CANDIDATES),
    aiosEvaluationFollowUp: MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID,
    recommendedNext: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID,
    notNextBoundaries: MARK_KASHEF_GOAL_NOT_NEXT_BOUNDARIES,
    sideEffects: effects,
    contentArtifacts: clone(contentArtifacts),
    findings,
    failures,
    summary: {
      sourceEvidenceCount: evidence.length,
      patternCandidateCount: MARK_KASHEF_GOAL_PATTERN_CANDIDATES.length,
      unsafeSideEffectCount: effectViolations.length,
      copiedContentViolationCount: contentViolations.length,
      transcriptExtracted: sourcePacket.sourceClaims.transcriptExtracted,
      visualWorkflowExtracted: sourcePacket.sourceClaims.visualWorkflowExtracted,
      contentClaimsVerified: sourcePacket.sourceClaims.contentClaimsVerified,
    },
  }
}

export function buildMarkKashefGoalBuildIntelPacketDogfoodProof() {
  const healthy = buildMarkKashefGoalBuildIntelPacketSnapshot()
  const missingVideo = buildMarkKashefGoalBuildIntelPacketSnapshot({
    evidence: MARK_KASHEF_GOAL_PUBLIC_SOURCE_EVIDENCE.filter(row => row.sourceKey !== 'mark-kashef-youtube-video'),
  })
  const titleMismatch = buildMarkKashefGoalBuildIntelPacketSnapshot({
    sourcePacket: buildSourcePacket({
      evidence: MARK_KASHEF_GOAL_PUBLIC_SOURCE_EVIDENCE.map(row =>
        row.sourceKey === 'mark-kashef-youtube-video' ? { ...row, title: 'unverified chat title' } : row
      ),
    }),
  })
  const missingOfficialGoalDocs = buildMarkKashefGoalBuildIntelPacketSnapshot({
    evidence: MARK_KASHEF_GOAL_PUBLIC_SOURCE_EVIDENCE.filter(row => row.sourceKey !== 'claude-code-goal-docs'),
  })
  const transcriptFetched = buildMarkKashefGoalBuildIntelPacketSnapshot({
    sideEffects: { transcriptFetched: true },
  })
  const privateSkoolAccess = buildMarkKashefGoalBuildIntelPacketSnapshot({
    sideEffects: { privateSkoolAccessUsed: true, authorizedBrowserOpened: true },
  })
  const copiedTranscript = buildMarkKashefGoalBuildIntelPacketSnapshot({
    contentArtifacts: [{ transcriptText: 'synthetic transcript sentinel' }],
  })
  const downstreamWrite = buildMarkKashefGoalBuildIntelPacketSnapshot({
    sideEffects: { researchInboxWritten: true, atomsCreated: 1 },
  })
  const directImplementation = buildMarkKashefGoalBuildIntelPacketSnapshot({
    outputTarget: 'direct_implementation',
  })
  const rejectedCases = {
    missingVideo: missingVideo.ok === false,
    titleMismatch: titleMismatch.ok === false,
    missingOfficialGoalDocs: missingOfficialGoalDocs.ok === false,
    transcriptFetched: transcriptFetched.ok === false,
    privateSkoolAccess: privateSkoolAccess.ok === false,
    copiedTranscript: copiedTranscript.ok === false,
    downstreamWrite: downstreamWrite.ok === false,
    directImplementation: directImplementation.ok === false,
  }
  return {
    ok: healthy.ok === true && Object.values(rejectedCases).every(Boolean),
    healthy,
    rejectedCases,
    invariant: 'Mark Kashef /goal packet passes only with verified public metadata, official /goal docs, no transcript/visual extraction, no private Skool access, no downstream writes, and proposal-only routing to AIOS goal-runner evaluation.',
  }
}

export function renderMarkKashefGoalBuildIntelPacketReport(snapshot = buildMarkKashefGoalBuildIntelPacketSnapshot()) {
  const failures = snapshot.failures.length
    ? snapshot.failures.map(failure => `- ${failure.check}: ${failure.detail}`).join('\n')
    : '- none'
  return `# ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID}

Status: ${snapshot.status}
Closeout key: \`${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY}\`

## Source Packet

| Field | Value |
| --- | --- |
| Video | ${snapshot.sourcePacket.video.title} |
| URL | ${snapshot.sourcePacket.video.url} |
| Channel | ${snapshot.sourcePacket.video.channel} |
| Duration | ${snapshot.sourcePacket.video.durationSeconds}s |
| Official /goal docs | ${snapshot.sourcePacket.officialGoalDocs.url} |
| Transcript extracted | ${snapshot.sourcePacket.sourceClaims.transcriptExtracted} |
| Visual workflow extracted | ${snapshot.sourcePacket.sourceClaims.visualWorkflowExtracted} |

## Pattern Candidates

${snapshot.patternCandidates.map(pattern => `- ${pattern.patternId}: ${pattern.aiosUse}`).join('\n')}

## Failures

${failures}

## Next

Continue \`${snapshot.recommendedNext}\` from repo truth.`
}
