const API_ROUTE = '/api/foundation/dev-team-hub'
const LINK_PACKET_PREVIEW_ROUTE = '/api/foundation/dev-team-hub/link-source-packet-preview'
const LINK_PACKET_DECISION_ROUTE = '/api/foundation/dev-team-hub/link-source-packet-decision'
const SOURCE_PACKET_WORKER_QUEUE_ROUTE = '/api/foundation/dev-team-hub/source-packet-worker-queue'
const EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE = '/api/foundation/dev-team-hub/source-packet-hands-queue'
const YOUTUBE_CREATOR_TARGET_FALLBACK_LIMIT = 10
const DEV_DATA_POOL_REFRESH_INTERVAL_MS = 30000

const plannedSources = [
  {
    id: 'creator-source-stack',
    name: 'Creator Source Stack',
    label: 'Unified creator card',
    badge: 'Planned',
    status: 'Planned source-stack lane',
    summary: 'Each creator should show YouTube, blog/site, newsletter, GitHub/resources, free Skool/community, paid course/training platforms, extracted value, blocker, and next action in one place.',
    tags: ['creator', 'source stack', 'planned'],
    sourceRoute: 'EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001',
    targets: [
      ['All approved creators', 'Source stack', 'Show what we get from every surface: video, blog, newsletter, repos/docs, free community, paid course/training gate.', 'Planned'],
      ['Grades', 'Lane-specific', 'Grade Dev build, realtor training, marketing, ops, and other lanes separately instead of one global score.', 'Planned'],
    ],
  },
  {
    id: 'creator-newsletters',
    name: 'Creator Newsletters',
    label: 'Free newsletter source',
    badge: 'Planned',
    status: 'Planned source lane',
    summary: 'Approved free creator newsletters should sign up through a source inbox, land in AIOS Sources/Newsletters, and feed creator grades/resources.',
    tags: ['newsletter', 'free source', 'mailbox'],
    sourceRoute: 'AIOS Sources/Newsletters mailbox label',
    targets: [
      ['ai@bensoncrew.ca', 'Default intake inbox', 'Use for free creator newsletter signups and confirmations when approved by source policy.', 'Planned'],
      ['crewbert@bensoncrew.ca', 'Fallback identity', 'Use only when a named operator identity is needed.', 'Planned'],
    ],
  },
  {
    id: 'skool-free',
    name: 'Skool / Free Communities',
    label: 'Free community',
    badge: 'Planned',
    status: 'Planned free-source lane',
    summary: 'Free communities should be inspected with the approved source identity/session boundary: last 20 days of free posts/comments, free courses, resources, and safe free downloads.',
    tags: ['free community', 'hands', 'resources'],
    sourceRoute: 'Free community SOP · approved source identity',
    targets: [
      ['Free chat/posts/comments', '20-day window', 'Read allowed free areas only; no posting, commenting, DMs, profile mutation, or paid/private areas.', 'Planned'],
      ['Free resources', 'Resource capture', 'Follow public/free links and capture safe free resources; stop at paid/private/unsafe boundaries.', 'Planned'],
    ],
  },
  {
    id: 'skool-paid',
    name: 'Paid Courses / Training Platforms',
    label: 'Paid / auth',
    badge: 'Pending',
    status: 'Pending registry',
    summary: 'Paid communities, courses, and training platforms are blocked until source packets and auth boundaries are approved. MyICOR is one source instance, not its own top-level tag.',
    tags: ['auth', 'paid', 'approval'],
    sourceRoute: 'Pending source packet + auth guard',
    targets: [
      ['Mark Kashef', 'Paid Skool', 'Needs exact source packet and guarded auth rules before crawling.', 'Approval required'],
      ['ICOR / Tom', 'Paid training platform', 'Known high-value paid-course source instance, not a separate source family.', 'Approval required'],
    ],
  },
  {
    id: 'github-repos',
    name: 'GitHub / Repos',
    label: 'Code repos',
    badge: 'Needs source',
    status: 'Needs source',
    summary: 'Code repos are planned source systems for implementation patterns and reusable tools.',
    tags: ['repo', 'planned'],
    sourceRoute: 'Pending repo target registry',
    targets: [
      ['ClaudeClaw OS', 'Private repo', 'Needs durable source packet and boundaries before mining.', 'Pending approval'],
      ['OpenClaw / adapters', 'Runtime patterns', 'Needs normalized repo target registry.', 'Needs source'],
    ],
  },
  {
    id: 'internal-signals',
    name: 'Gmail / Missive / Slack',
    label: 'Internal signals',
    badge: 'Foundation',
    status: 'Foundation live; Dev route pending',
    summary: 'Foundation syncs comms. Dev-specific routing is still pending.',
    tags: ['internal', 'shared pool'],
    sourceRoute: 'Foundation comms spine · Dev route pending',
    targets: [
      ['Gmail', 'Email source', 'Current sync and candidate extraction run as Foundation jobs.', 'Foundation live'],
      ['Missive', 'Comms source', 'Current sync and candidate extraction run as Foundation jobs.', 'Foundation live'],
      ['Slack', 'Thread source', 'Current sync and candidate extraction runs through the shared comms spine.', 'Foundation live'],
    ],
  },
  {
    id: 'meetings-transcripts-source',
    name: 'Meetings / Transcripts',
    label: 'Meeting notes',
    badge: 'Foundation',
    status: 'Foundation live; Dev route pending',
    summary: 'Foundation syncs notes and transcripts. Dev-specific routing is still pending.',
    tags: ['meetings', 'transcripts', 'shared pool'],
    sourceRoute: 'Foundation meeting sync · Dev route pending',
    targets: [
      ['Meeting notes', 'Meeting source', 'Current meeting notes sync runs as a Foundation job.', 'Foundation live'],
      ['Meeting transcripts', 'Transcript source', 'Transcript candidate extraction runs through the shared comms spine.', 'Foundation live'],
    ],
  },
]

const state = {
  snapshot: null,
  sources: [],
  selectedSourceId: null,
  selectedPriorityLensId: 'current-sprint',
  dataPoolLoadInFlight: false,
  lastDataPoolRefreshAt: null,
}

const els = {
  grid: document.getElementById('source-grid'),
  panel: document.getElementById('target-panel'),
  extractorGrid: document.getElementById('extractor-grid'),
  godModeParity: document.getElementById('god-mode-parity'),
  evidenceGrid: document.getElementById('evidence-grid'),
  approvalReview: document.getElementById('approval-review'),
  sourceLeaderboard: document.getElementById('source-leaderboard'),
  directorPanel: document.getElementById('director-panel'),
  directorHeadStats: document.getElementById('director-head-stats'),
  youtubeSystem: document.getElementById('youtube-system'),
  rankingsSystem: document.getElementById('rankings-system'),
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value, fallback = '') {
  const output = String(value ?? '').trim()
  return output || fallback
}

function escapeHtml(value = '') {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function compactNumber(value = 0) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  if (number >= 1000) return `${Math.round(number / 100) / 10}K`
  return String(number)
}

function money(value = 0) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '$0.00'
  if (number >= 1000) return `$${Math.round(number).toLocaleString('en-US')}`
  return `$${number.toFixed(2)}`
}

function shortDate(value = '') {
  if (!value) return 'Needs source'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Needs source'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function pillClass(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('active') || normalized.includes('ready') || normalized.includes('succeeded') || normalized.includes('generated') || normalized.includes('verified')) return 'active'
  if (normalized.includes('pending') || normalized.includes('approval') || normalized.includes('needs') || normalized.includes('not exposed')) return 'pending'
  return ''
}

function dotClass(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('live') || normalized.includes('active') || normalized.includes('succeeded') || normalized.includes('generated') || normalized.includes('healthy')) return 'live'
  if (normalized.includes('pending') || normalized.includes('approval') || normalized.includes('needs') || normalized.includes('risk') || normalized.includes('failed') || normalized.includes('stale') || normalized.includes('blocked')) return 'pending'
  if (normalized.includes('verified') || normalized.includes('proof') || normalized.includes('source-backed') || normalized.includes('locked')) return 'verified'
  return ''
}

function statusBadge(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('needs source')) return 'Needs source'
  if (normalized.includes('pending') || normalized.includes('approval')) return 'Pending'
  if (normalized.includes('locked') || normalized.includes('verified') || normalized.includes('source-backed') || normalized.includes('proof') || normalized.includes('signed')) return 'Verified'
  if (normalized.includes('healthy') || normalized.includes('succeeded') || normalized.includes('generated') || normalized.includes('live') || normalized.includes('active')) return 'Live'
  if (normalized.includes('foundation')) return 'Foundation'
  return text(value, 'Needs source')
}

function statusLabel(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('needs source')) return 'Needs source'
  if (normalized.includes('needs steve') || normalized.includes('approval required')) return 'Needs approval'
  if (normalized.includes('pending approval')) return 'Pending'
  if (normalized.includes('pending')) return 'Pending'
  if (normalized.includes('foundation pool') || normalized.includes('foundation live') || normalized.includes('foundation')) return 'Foundation'
  if (normalized.includes('source-backed')) return 'Verified'
  if (normalized.includes('verified') || normalized.includes('proof')) return 'Verified'
  if (normalized.includes('succeeded') || normalized.includes('generated') || normalized.includes('healthy') || normalized.includes('live') || normalized.includes('active')) return 'Live'
  if (normalized.includes('clear')) return 'Clear'
  return text(value, 'Needs source')
}

function sourceContract(snapshot = {}, sourceId = '') {
  return list(snapshot.sourceContracts).find(source => source.sourceId === sourceId) || null
}

function uniqueBy(items = [], keyFn = item => item) {
  const seen = new Set()
  const output = []
  for (const item of list(items)) {
    const key = text(keyFn(item))
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }
  return output
}

function creatorNameFromId(value = '') {
  return text(value)
    .split('-')
    .filter(Boolean)
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ')
}

function sourceGrades(snapshot = {}) {
  return list(snapshot.sourceValueGrader?.sourceGrades)
}

function sourceCoverageRows(snapshot = {}) {
  return list(snapshot.sourceCoverage?.rows)
}

function topDevSources(snapshot = {}) {
  return list(snapshot.sourceValueGrader?.topDevBuildSources).length
    ? list(snapshot.sourceValueGrader?.topDevBuildSources)
    : sourceGrades(snapshot)
}

function catchupRows(snapshot = {}) {
  return list(snapshot.youtubeCreatorGodModeCatchup?.creators)
}

function dailyCreators(snapshot = {}) {
  return list(snapshot.dailyWatch?.creators)
}

function creatorDisplayName(snapshot = {}, creatorId = '') {
  const creator = dailyCreators(snapshot).find(item => item.creatorId === creatorId)
  const grade = sourceGrades(snapshot).find(item => item.creatorId === creatorId)
  return text(creator?.displayName || grade?.creator || creatorNameFromId(creatorId), 'Unknown creator')
}

function laneScore(source = {}, laneId = 'aios_dev_build') {
  return list(source.laneScores).find(lane => lane.laneId === laneId) || null
}

function gradeRankValue(grade = '') {
  const rank = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 }
  return rank[text(grade).toUpperCase()] || 0
}

function gradeTone(grade = '') {
  const normalized = text(grade).toUpperCase()
  if (normalized === 'S' || normalized === 'A') return 'live'
  if (normalized === 'B') return 'verified'
  if (normalized === 'C' || normalized === 'D') return 'pending'
  return ''
}

function rankedDevSources(snapshot = {}) {
  const rows = sourceGrades(snapshot).length ? sourceGrades(snapshot) : topDevSources(snapshot)
  return [...list(rows)]
    .filter(source => source.creator || source.creatorId)
    .sort((left, right) => {
      const leftLane = laneScore(left)
      const rightLane = laneScore(right)
      const leftGrade = text(left.devBuildGrade || leftLane?.grade || left.overallGrade)
      const rightGrade = text(right.devBuildGrade || rightLane?.grade || right.overallGrade)
      return gradeRankValue(rightGrade) - gradeRankValue(leftGrade) ||
        Number(rightLane?.score || 0) - Number(leftLane?.score || 0) ||
        Number(right.buildCandidates || 0) - Number(left.buildCandidates || 0) ||
        Number(right.watchedVideos || 0) - Number(left.watchedVideos || 0) ||
        Number(left.bestDirectorRank || 9999) - Number(right.bestDirectorRank || 9999) ||
        text(left.creator || left.creatorId).localeCompare(text(right.creator || right.creatorId))
    })
}

function gradeBucketSummary(snapshot = {}) {
  const rows = rankedDevSources(snapshot)
  const counts = new Map()
  for (const source of rows) {
    const devLane = laneScore(source)
    const grade = text(source.devBuildGrade || devLane?.grade || source.overallGrade, 'ungraded').toUpperCase()
    counts.set(grade, (counts.get(grade) || 0) + 1)
  }
  return ['S', 'A', 'B', 'C', 'D', 'F', 'UNGRADED']
    .filter(grade => counts.has(grade))
    .map(grade => `${grade}: ${counts.get(grade)}`)
}

function familyTone(status = '') {
  const normalized = text(status).toLowerCase()
  if (normalized === 'active') return 'live'
  if (normalized === 'partial') return 'verified'
  if (normalized === 'blocked') return 'pending'
  return ''
}

function familyStatusCopy(status = '') {
  const normalized = text(status).toLowerCase()
  if (normalized === 'active') return 'Feeding Dev now'
  if (normalized === 'partial') return 'Partly connected'
  if (normalized === 'blocked') return 'Needs approval'
  if (normalized === 'planned') return 'Planned'
  return text(status, 'Needs source')
}

function researchRowsForCreator(snapshot = {}, creatorId = '') {
  return list(snapshot.dailyWatch?.researchPool).filter(item => item.creatorId === creatorId)
}

function latestResearchRow(rows = []) {
  return [...list(rows)]
    .sort((left, right) => text(right.lastSeenAt || right.firstSeenAt).localeCompare(text(left.lastSeenAt || left.firstSeenAt)))
    [0] || null
}

function creatorTargetFromGrade(snapshot = {}, source = {}) {
  const rows = researchRowsForCreator(snapshot, source.creatorId)
  const latest = latestResearchRow(rows)
  const devLane = laneScore(source)
  const grade = text(source.devBuildGrade || devLane?.grade || source.overallGrade, 'Needs grade')
  const score = devLane?.score == null ? '' : ` · ${compactNumber(devLane.score)} score`
  const bestRank = source.bestDirectorRank ? ` · best Director rank ${source.bestDirectorRank}` : ''
  const watched = compactNumber(source.watchedVideos || rows.length || 0)
  const ideas = compactNumber(source.buildCandidates || 0)
  const latestCopy = latest?.title ? ` Latest: ${latest.title}` : ''
  return [
    text(source.creator || creatorDisplayName(snapshot, source.creatorId), 'Unknown creator'),
    `${grade} Dev build${score}`,
    `${watched} watched/represented videos · ${ideas} ideas${bestRank}.${latestCopy}`,
    'Live',
  ]
}

function creatorTargetFromDaily(snapshot = {}, creator = {}) {
  const rows = researchRowsForCreator(snapshot, creator.creatorId)
  const latest = latestResearchRow(rows)
  const latestRun = latest?.lastSeenAt || snapshot.dailyWatch?.latestJobRun?.completedAt || snapshot.dailyWatch?.latestJobRun?.startedAt
  return [
    text(creator.displayName || creatorNameFromId(creator.creatorId), 'Unknown creator'),
    'Daily watch source',
    `${compactNumber(rows.length)} videos in pool · last seen ${shortDate(latestRun)}`,
    rows.length ? 'Live' : 'Needs source',
  ]
}

function creatorRepresentationLabel(row = {}) {
  if (row.representationStatus === 'represented') return 'Live'
  if (row.representationStatus === 'metadata_missing') return 'Ready for metadata'
  if (row.representationStatus === 'blocked_lookup_required') return 'Needs source URL'
  return 'Needs source'
}

function creatorTargetFromCatchup(row = {}) {
  const grade = text(row.devBuildGrade, 'ungraded')
  const watched = compactNumber(row.videoAudioVisualWatchedCount || 0)
  const baseline = compactNumber(row.baselineTargetVideos || 10)
  const tracked = compactNumber(row.trackedMetadataCount || 0)
  const longCourse = Number(row.longCoursePendingCount || 0)
  const gap = Number(row.baselineGap || 0)
  const status = gap > 0 ? 'Needs watch' : 'Baseline met'
  const longCourseCopy = longCourse ? ` · ${compactNumber(longCourse)} long-course pending` : ''
  const sopCopy = row.youtubeSopStatus === 'source_sop_complete'
    ? 'SOP complete'
    : 'SOP incomplete'
  const resourceCopy = statusCopy(row.freeResourceCaptureStatus || row.approvedResourceFollowStatus || '')
  const gateCopy = statusCopy(row.paidGateEvaluationStatus || '')
  const evidence = row.sourceSopEvidence || {}
  const evidenceCopy = Number(evidence.evidenceVideoCount || 0)
    ? ` Evidence: ${compactNumber(evidence.evidenceVideoCount)} videos, ${compactNumber(evidence.fullPageComplete || 0)} pages.`
    : ''
  const packetCount = Number(evidence.sourcePacketActionCount || 0)
  const packetCopy = packetCount
    ? ` Packets: ${compactNumber(packetCount)} review, ${compactNumber(evidence.runnablePublicSourcePacketCount || 0)} public, ${compactNumber(evidence.freeCommunityPacketCount || 0)} community, ${compactNumber(evidence.paidGatePacketCount || 0)} paid/gate.`
    : ''
  const stackCopy = ' Source stack: YouTube tracked; newsletter, blog/site, GitHub/resources, Skool/community, and paid course/training platform status pending source-stack lane.'
  return [
    text(row.creator || creatorNameFromId(row.creatorId), 'Unknown creator'),
    `${grade} Dev build · ${status} · ${sopCopy}`,
    `${watched}/${baseline} watched · ${tracked} tracked${longCourseCopy}. Resources: ${resourceCopy}; gates: ${gateCopy}.${evidenceCopy}${packetCopy}${stackCopy} ${statusCopy(row.nextWatchAction || '')}`,
    creatorRepresentationLabel(row),
  ]
}

function buildYoutubeCreatorTargets(snapshot = {}) {
  const catchup = catchupRows(snapshot)
    .filter(row => row.creatorId || row.creator)
    .sort((left, right) =>
      Number(right.baselineGap || 0) - Number(left.baselineGap || 0) ||
      Number(right.deepBaselineGap || 0) - Number(left.deepBaselineGap || 0) ||
      text(left.creator).localeCompare(text(right.creator))
    )
    .map(creatorTargetFromCatchup)
  if (catchup.length) return catchup

  const graded = topDevSources(snapshot)
    .filter(source => source.creatorId || source.creator)
    .slice(0, YOUTUBE_CREATOR_TARGET_FALLBACK_LIMIT)
    .map(source => creatorTargetFromGrade(snapshot, source))
  if (graded.length) return graded

  return dailyCreators(snapshot)
    .slice(0, YOUTUBE_CREATOR_TARGET_FALLBACK_LIMIT)
    .map(creator => creatorTargetFromDaily(snapshot, creator))
}

function buildYoutubeAutopilotRows(snapshot = {}) {
  const autopilot = snapshot.youtubeGodModeAutopilotPlan || {}
  return list(autopilot.selectedVideos).map(video => ({
    title: text(video.title, 'Untitled video'),
    subtitle: `${text(video.creator || creatorDisplayName(snapshot, video.creatorId), 'Unknown creator')} · ${text(video.sourceGrade || video.overallGrade, 'ungraded')} source`,
    description: `${money(autopilot.budget?.estimatedUsdPerVideo || 0)} est · ${statusCopy(video.nextWatchAction || autopilot.status || 'dry-run')}`,
    url: text(video.url),
    status: autopilot.status === 'ready_for_dry_run_report' ? 'Dry-run ready' : 'Blocked',
    steps: list(video.sourceSopReadiness).map(step => ({
      label: text(step.label || step.key, 'Step'),
      status: statusCopy(step.status || step.rawStatus || 'pending'),
      detail: statusCopy(step.detail || step.rawStatus || ''),
    })),
  }))
}

function buildYoutubeAutopilotBlockedRows(snapshot = {}) {
  const autopilot = snapshot.youtubeGodModeAutopilotPlan || {}
  const groups = new Map()
  for (const video of list(autopilot.rejectedVideos)) {
    const reason = text(video.reason || 'blocked')
    if (!groups.has(reason)) groups.set(reason, [])
    groups.get(reason).push(video)
  }
  return Array.from(groups.entries())
    .map(([reason, videos]) => ({
      title: statusCopy(reason),
      count: videos.length,
      subtitle: `${compactNumber(videos.length)} ${videos.length === 1 ? 'candidate' : 'candidates'} blocked`,
      description: videos
        .slice(0, 3)
        .map(video => `${text(video.creator || video.creatorId, 'Unknown creator')}: ${text(video.title || video.videoId, 'Untitled video')}`)
        .join(' · '),
      status: reason.includes('blocks') || reason.includes('approval') || reason.includes('not_public') ? 'Blocked' : 'Filtered',
    }))
    .sort((left, right) => Number(right.count || 0) - Number(left.count || 0))
    .slice(0, 6)
}

function buildLiveSources(snapshot = {}) {
  const daily = snapshot.dailyWatch || {}
  const catchup = snapshot.youtubeCreatorGodModeCatchup || {}
  const youtubeContract = sourceContract(snapshot, 'SRC-YOUTUBE-INTEL-001')
  const youtubeTargets = buildYoutubeCreatorTargets(snapshot)
  const gradedCount = sourceGrades(snapshot).length
  const creatorCount = Number(daily.summary?.creatorCount || dailyCreators(snapshot).length || 0)
  const baselineComplete = Number(catchup.summary?.baselineCompleteCount || 0)
  const baselineIncomplete = Number(catchup.summary?.baselineIncompleteCount || 0)
  const catchupStatus = catchup.buildPromotionReadiness?.status
    ? statusCopy(catchup.buildPromotionReadiness.status)
    : `${compactNumber(gradedCount)} sources graded`

  const live = [
    {
      id: 'youtube',
      name: 'YouTube Creators',
      label: 'Public creators',
      badge: statusBadge(daily.status),
      status: text(youtubeContract?.status, 'Needs source'),
      summary: `${compactNumber(creatorCount)} public creator channels feed Foundation. ${compactNumber(baselineComplete)} baseline met; ${compactNumber(baselineIncomplete)} still need watch.`,
      tags: ['public', 'daily', gradedCount ? 'graded' : 'needs grade', baselineIncomplete ? 'baseline gap' : 'baseline met'],
      targets: youtubeTargets,
      autopilotRows: buildYoutubeAutopilotRows(snapshot),
      autopilotBlockedRows: buildYoutubeAutopilotBlockedRows(snapshot),
      targetNoun: 'public creator',
      statusLine: `Running · ${catchupStatus}`,
      sourceRoute: daily.sourceRoute || '/api/foundation/build-intel/youtube-creator-daily-watch',
    },
  ]

  return [...live, ...plannedSources]
}

function buildEvidenceCards(snapshot = {}) {
  const counts = snapshot.counts || {}
  const catchup = snapshot.youtubeCreatorGodModeCatchup || {}
  const autopilot = snapshot.youtubeGodModeAutopilotPlan || {}
  const economics = snapshot.extractionEconomics || {}
  const gradedSources = sourceGrades(snapshot)
  const gradedVideos = gradedSources.reduce((sum, source) => sum + Number(source.watchedVideos || 0), 0)
  const gradedCandidates = gradedSources.reduce((sum, source) => sum + Number(source.buildCandidates || 0), 0)
  const sourcePacketCount = Number(snapshot.youtubeCreatorGodModeCatchup?.summary?.sourcePacketActionCount || 0)
  const approvalReviewCount = list(snapshot.approvalReviewQueue).length || sourcePacketCount || counts.apiFullWatchApprovalLinks || counts.approvalRequiredLinks
  const inventoryCount = Number(catchup.summary?.trackedMetadataCount || counts.researchPool || 0)
  const fullReviewCount = Number(catchup.summary?.videoAudioVisualWatchedCount || gradedVideos || counts.apiFullWatchVideos || 0)
  const buildIdeaCount = Number(economics.ideaCount || gradedCandidates || counts.apiFullWatchBuildCandidates || counts.eyesBuildCandidates || 0)
  return [
    {
      value: inventoryCount,
      label: 'Video inventory',
      tone: 'live',
      summary: `${compactNumber(inventoryCount)} public YouTube metadata rows are known. This is inventory, not full video watching.`,
      meta: `${compactNumber(autopilot.selectedVideos?.length || 0)} eligible now · ${compactNumber(catchup.summary?.parkedStandardVideoCount || 0)} parked/no-spend · ${compactNumber(catchup.summary?.providerBlockedVideoCount || 0)} provider-blocked · ${compactNumber(catchup.summary?.longCoursePendingCount || 0)} long-course pending`,
    },
    {
      value: fullReviewCount,
      label: 'Full video reviews',
      tone: 'verified',
      summary: `${compactNumber(fullReviewCount)} videos are represented as video/audio/visual reviews in the current catch-up readback.`,
      meta: snapshot.markApiFullWatch?.model || 'Gemini video route',
    },
    {
      value: list(autopilot.selectedVideos).length,
      label: 'Next dry-run batch',
      tone: autopilot.status === 'ready_for_dry_run_report' ? 'pending' : 'blocked',
      summary: `${compactNumber(list(autopilot.selectedVideos).length)} exact public videos selected by the morning autopilot dry-run. No live Gemini run starts without explicit budget approval.`,
      meta: `${compactNumber(autopilot.candidateVideoCount || 0)} candidates · ${money(autopilot.budget?.estimatedRunSpendUsd || 0)} est run`,
    },
    {
      value: buildIdeaCount,
      label: 'Build ideas',
      tone: 'verified',
      summary: `${compactNumber(buildIdeaCount)} proposal-only ideas are counted from the graded source/economics layer; they are not backlog cards yet.`,
      meta: `${compactNumber(gradedCandidates || 0)} graded · ${compactNumber(counts.apiFullWatchBuildCandidates || 0)} latest API`,
    },
    {
      value: approvalReviewCount,
      label: 'Links to review',
      tone: approvalReviewCount ? 'pending' : 'live',
      summary: `${compactNumber(approvalReviewCount || 0)} source-packet decisions are held until Steve approves, holds, or rejects the exact follow-up.`,
      meta: `${compactNumber(sourcePacketCount || 0)} from YouTube SOP evidence`,
    },
    {
      value: counts.apiFullWatchTimestampedVisualEvidence || counts.eyesTimestampedVisualEvidence,
      label: 'Visual evidence',
      tone: 'live',
      summary: 'Timestamped notes from approved video, audio, and screen review.',
      meta: 'Video/audio/visual review',
    },
  ]
}

function systemRuntimeCopy(system = {}) {
  const job = system.liveJob || {}
  if (text(system.status).toLowerCase() === 'post_run_review_needed') return 'Review needed'
  if (text(job.latestRunStatus).toLowerCase() === 'failed') return 'Error'
  if (text(job.latestRunStatus).toLowerCase() === 'running') return 'Running'
  if (job.due === true || text(system.status).toLowerCase() === 'due') return 'Due now'
  if (text(job.scheduleStatus).toLowerCase() === 'scheduled') return 'Idle'
  if (text(system.status).toLowerCase().includes('failed')) return 'Error'
  return statusLabel(system.status || job.status || 'Needs source')
}

function systemTone(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('running') || normalized.includes('live')) return 'live'
  if (normalized.includes('idle') || normalized.includes('scheduled') || normalized.includes('ready')) return 'verified'
  if (normalized.includes('review')) return 'pending'
  if (normalized.includes('due')) return 'pending'
  if (normalized.includes('error') || normalized.includes('failed') || normalized.includes('blocked')) return 'pending'
  return ''
}

function durationCopy(ms = null) {
  const value = Number(ms)
  if (!Number.isFinite(value) || value <= 0) return 'No duration'
  const seconds = Math.round(value / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.round(minutes / 60)}h`
}

function renderYoutubeSystemStats(system = {}) {
  const summary = system.summary || {}
  return [
    ['Creators', summary.creatorCount],
    ['Tracked videos', summary.trackedMetadataCount],
    ['Watched', summary.watchedVideoCount],
    ['Eligible now', summary.eligibleStandardVideoCount],
    ['Parked/no-spend', summary.parkedStandardVideoCount ?? summary.filteredStandardCandidateCount ?? 0],
    ['Provider blocked', summary.providerBlockedVideoCount || 0],
    ['Ideas', summary.buildIdeaCount],
    ['Spend', money(summary.estimatedSpendUsd || 0)],
  ].map(([label, value]) => `
    <article class="yt-stat">
      <strong>${escapeHtml(typeof value === 'number' ? compactNumber(value) : value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join('')
}

function renderYoutubeStage(stage = {}) {
  return `
    <article class="yt-stage ${escapeHtml(systemTone(stage.status))}">
      <span>${escapeHtml(stage.label || 'Stage')}</span>
      <h3>${escapeHtml(stage.title || 'Pipeline stage')}</h3>
      <p>${escapeHtml(stage.summary || '')}</p>
      <small>${escapeHtml(stage.detail || '')}</small>
      <div class="yt-stage-foot">
        <b>${escapeHtml(statusCopy(stage.status || 'unknown'))}</b>
        <em>${escapeHtml(shortDate(stage.latestRunAt))}</em>
      </div>
    </article>
  `
}

function renderYoutubeHandoff(bucket = {}) {
  return `
    <article class="yt-handoff ${Number(bucket.count || 0) ? 'pending' : ''}">
      <div>
        <strong>${escapeHtml(compactNumber(bucket.count || 0))}</strong>
        <span>${escapeHtml(bucket.label || bucket.bucketId || 'Handoff')}</span>
      </div>
      <p>${escapeHtml(bucket.description || '')}</p>
      ${bucket.sourceDetail ? `<small>${escapeHtml(bucket.sourceDetail)}</small>` : ''}
      <small>${escapeHtml(statusCopy(bucket.status || 'waiting'))}${bucket.route ? ` · ${escapeHtml(bucket.route)}` : ''}</small>
    </article>
  `
}

function renderSourceSessionBrokerDecision(row = {}) {
  const broker = row.sourceSessionBroker || {}
  if (!broker.status) return ''
  const brokerCopy = [
    broker.account ? `account ${broker.account}` : '',
    broker.sourceFamily ? broker.sourceFamily : '',
    broker.reason ? broker.reason : '',
  ].filter(Boolean).join(' · ')
  return `
    <div class="yt-source-session">
      <span>Session broker</span>
      <strong>${escapeHtml(statusCopy(broker.status))}</strong>
      <small>${escapeHtml(brokerCopy)}</small>
      ${broker.nextAction ? `<p>${escapeHtml(broker.nextAction)}</p>` : ''}
    </div>
  `
}

function sourceHandoffVisibleRows(queue = {}, limit = 12) {
  const rows = list(queue.rows)
  const bucketIds = Object.keys(queue.bucketCounts || {})
  const orderedBucketIds = bucketIds.length
    ? bucketIds
    : Array.from(new Set(rows.map(row => row.bucketId).filter(Boolean)))
  const selected = []
  for (const bucketId of orderedBucketIds) {
    const bucketRows = rows.filter(row => row.bucketId === bucketId)
    selected.push(...bucketRows.slice(0, 2))
  }
  const seen = new Set(selected.map(row => row.rowId || row.url))
  for (const row of rows) {
    const key = row.rowId || row.url
    if (seen.has(key)) continue
    selected.push(row)
    seen.add(key)
    if (selected.length >= limit) break
  }
  return selected.slice(0, limit)
}

function renderYoutubeSourceBucketCards(queue = {}) {
  const bucketCounts = queue.bucketCounts || {}
  const buckets = Object.entries(bucketCounts)
  if (!buckets.length) return ''
  return `
    <div class="yt-source-bucket-grid">
      ${buckets.map(([bucketId, bucket]) => `
        <article class="yt-source-bucket ${bucket.runnable ? 'live' : 'pending'}">
          <div>
            <span>${escapeHtml(bucket.label || bucketId)}</span>
            <strong>${escapeHtml(compactNumber(bucket.count || bucket.queuedRows || 0))}</strong>
          </div>
          <p>${escapeHtml(statusCopy(bucket.status || 'waiting'))}</p>
          <small>${escapeHtml(compactNumber(bucket.runnableRows || 0))} ready · ${escapeHtml(compactNumber(bucket.alreadyRunRows || 0))} read · ${escapeHtml(compactNumber(bucket.parkedRows || 0))} parked</small>
        </article>
      `).join('')}
    </div>
  `
}

function renderSourceSessionPrepQueue(prep = {}) {
  if (!prep || !prep.status) return ''
  const rows = list(prep.rows).slice(0, 8)
  const clusters = list(prep.clusters).slice(0, 6)
  const counts = prep.counts || {}
  return `
    <section class="yt-session-prep">
      <div class="yt-section-head">
        <span>SOURCE SESSION PREP</span>
        <h3>What needs identity or auth next</h3>
        <small>${escapeHtml(compactNumber(counts.totalRows || 0))} prep rows · ${escapeHtml(compactNumber(counts.clusterCount || 0))} source clusters · ${escapeHtml(compactNumber(counts.skoolFreeCommunityRows || 0))} Skool · ${escapeHtml(compactNumber(counts.newsletterSignupRows || 0))} newsletters · ${escapeHtml(compactNumber(counts.paidAuthRows || 0))} paid/auth · ${escapeHtml(compactNumber(counts.runAllowedNowRows || 0))} runnable now</small>
      </div>
      <p>${escapeHtml(prep.plainEnglish || '')}</p>
      <div class="yt-session-cluster-grid">
        ${clusters.map(cluster => `
          <article class="${escapeHtml(Number(cluster.runAllowedNowRows || 0) ? 'ready' : 'blocked')}">
            <div>
              <span>${escapeHtml(statusCopy(cluster.phase || cluster.status || 'source cluster'))}</span>
              <strong>${escapeHtml(cluster.label || cluster.host || 'source')}</strong>
            </div>
            <p>${escapeHtml(cluster.plainEnglish || '')}</p>
            <small>${escapeHtml([`${compactNumber(cluster.totalRows || 0)} rows`, cluster.account, cluster.runner, list(cluster.sourceGrades).slice(0, 2).map(source => `${source.creator}: ${source.devBuildGrade}`).join(' · ')].filter(Boolean).join(' · '))}</small>
          </article>
        `).join('') || '<article class="loading-card">No source-session clusters returned.</article>'}
      </div>
      <div class="yt-session-prep-grid">
        ${rows.map(row => `
          <article class="${escapeHtml(row.runAllowedNow ? 'ready' : 'blocked')}">
            <div>
              <span>${escapeHtml(statusCopy(row.phase || row.status || 'session prep'))}</span>
              <strong>${escapeHtml(row.host || row.label || 'source')}</strong>
            </div>
            <p>${escapeHtml(row.plainEnglish || '')}</p>
            <small>${escapeHtml([row.account, row.runner, list(row.sourceGrades).slice(0, 2).map(source => `${source.creator}: ${source.devBuildGrade}`).join(' · ')].filter(Boolean).join(' · '))}</small>
          </article>
        `).join('') || '<article class="loading-card">No source-session prep rows returned.</article>'}
      </div>
    </section>
  `
}

function renderYoutubeSourceHandoffRow(row = {}) {
  const tone = row.runnable ? 'live' : 'pending'
  const action = row.runnable ? row.runner || 'source worker' : row.status || 'parked'
  const priority = row.devLanePriority || {}
  const priorityCopy = priority.priorityLabel || ''
  const sourceGradeCopy = list(row.sourceGrades).length
    ? list(row.sourceGrades).slice(0, 2).map(source => `${source.creator}: ${source.devBuildGrade}`).join(' · ')
    : ''
  return `
    <article class="yt-source-handoff-row ${escapeHtml(tone)}">
      <div>
        <span>${escapeHtml(row.label || row.bucketId || 'Source')}</span>
        <strong>${escapeHtml(action)}</strong>
      </div>
      <p>${escapeHtml(row.plainEnglish || row.url || '')}</p>
      ${renderSourceSessionBrokerDecision(row)}
      <small>${escapeHtml(row.host || '')}${row.sourceType ? ` · ${escapeHtml(row.sourceType)}` : ''}${sourceGradeCopy ? ` · ${escapeHtml(sourceGradeCopy)}` : ''}${priorityCopy ? ` · ${escapeHtml(priorityCopy)}` : ''}</small>
    </article>
  `
}

function renderYoutubeDevPriorityPreview(preview = {}) {
  if (!preview || !preview.status) return ''
  const topRows = list(preview.topRows).slice(0, 8)
  const buckets = preview.gradeBuckets || {}
  const bucketCopy = ['S', 'A', 'B', 'C', 'D', 'UNGRADED']
    .map(grade => `${grade}: ${compactNumber(buckets[grade] || buckets[grade.toLowerCase()] || 0)}`)
    .join(' · ')
  return `
    <section class="yt-dev-priority">
      <div class="yt-section-head">
        <span>DEV LINK PRIORITY</span>
        <h3>What to inspect first</h3>
        <small>${escapeHtml(compactNumber(preview.prioritizedRows || 0))} graded rows · ${escapeHtml(compactNumber(preview.reviewRows || 0))} review rows · ${escapeHtml(bucketCopy)}</small>
      </div>
      <p>${escapeHtml(preview.plainEnglish || 'Priority only. Source evidence stays in Foundation.')}</p>
      <div class="yt-dev-priority-grid">
        <article>
          <strong>${escapeHtml(compactNumber(buckets.S || 0))}</strong>
          <span>S rows</span>
        </article>
        <article>
          <strong>${escapeHtml(compactNumber(buckets.A || 0))}</strong>
          <span>A rows</span>
        </article>
        <article>
          <strong>${escapeHtml(compactNumber((buckets.B || 0) + (buckets.C || 0) + (buckets.D || 0)))}</strong>
          <span>B/C/D rows kept for later</span>
        </article>
      </div>
      ${topRows.length ? `
        <div class="yt-dev-priority-samples">
          ${topRows.map(row => `
            <article>
              <span>${escapeHtml(row.bestDevBuildGrade || 'ungraded')} · ${escapeHtml(row.priorityLabel || '')}</span>
              <strong>${escapeHtml(row.host || row.url || 'link')}</strong>
              <small>${escapeHtml(list(row.sourceGrades).map(source => `${source.creator}: ${source.devBuildGrade}`).join(' · '))}</small>
            </article>
          `).join('')}
        </div>
      ` : '<small>No graded source-link priority rows yet.</small>'}
    </section>
  `
}

function renderSourceRunSummary(summary = {}) {
  if (!summary || summary.status !== 'ready') return ''
  const buckets = list(summary.bucketSummaries).slice(0, 6)
  const topRuns = list(summary.topRuns).slice(0, 6)
  const repoReadback = summary.repoReadback || {}
  const topRepos = list(repoReadback.topRepos).slice(0, 6)
  return `
    <section class="yt-source-run-summary">
      <div class="yt-section-head">
        <span>SOURCE RUN OUTPUT</span>
        <h3>What the source browser already found</h3>
        <small>${escapeHtml(compactNumber(summary.totalRuns || 0))} runs · ${escapeHtml(compactNumber(summary.pagesRead || 0))} pages · ${escapeHtml(compactNumber(summary.freeResourceCaptures || 0))} resources · ${escapeHtml(compactNumber(summary.unsafeSideEffectRows || 0))} unsafe side effects</small>
      </div>
      <p>${escapeHtml(summary.plainEnglish || '')}</p>
      <div class="yt-source-run-grid">
        ${buckets.map(bucket => `
          <article>
            <div>
              <span>${escapeHtml(bucket.label || bucket.bucketId || 'Source')}</span>
              <strong>${escapeHtml(compactNumber(bucket.runs || 0))}</strong>
            </div>
            <p>${escapeHtml(`${compactNumber(bucket.pagesRead || 0)} pages · ${compactNumber(bucket.freeResourceCaptures || 0)} resources · ${compactNumber(bucket.blockers || 0)} blockers`)}</p>
            <small>${escapeHtml(`${compactNumber(bucket.succeeded || 0)} saved · best ${bucket.bestGrade || 'ungraded'} ${compactNumber(bucket.bestScore || 0)}`)}</small>
          </article>
        `).join('')}
      </div>
      <div class="yt-source-run-list">
        ${topRuns.map(run => `
          <article>
            <div>
              <span>${escapeHtml(run.grade || 'ungraded')} · ${escapeHtml(compactNumber(run.score || 0))}</span>
              <strong>${escapeHtml(run.host || run.label || 'source')}</strong>
            </div>
            <p>${escapeHtml(list(run.usefulSignals).join(' · ') || run.url || '')}</p>
            <small>${escapeHtml(`${compactNumber(run.pagesRead || 0)} pages · ${compactNumber(run.freeResourceCaptures || 0)} resources · ${compactNumber(run.blockers || 0)} blockers`)}</small>
          </article>
        `).join('')}
      </div>
      ${repoReadback.status === 'ready' ? `
        <div class="yt-repo-readback">
          <div class="yt-section-head">
            <span>REPO READBACK</span>
            <h3>Public code repos saved from YouTube</h3>
            <small>${escapeHtml(compactNumber(repoReadback.uniqueRepoCount || 0))} repos · ${escapeHtml(compactNumber(repoReadback.runCount || 0))} runs · ${escapeHtml(compactNumber(repoReadback.pagesRead || 0))} pages · ${escapeHtml(compactNumber(repoReadback.unsafeSideEffectRows || 0))} unsafe side effects</small>
          </div>
          <p>${escapeHtml(repoReadback.plainEnglish || '')}</p>
          <div class="yt-source-run-list">
            ${topRepos.map(repo => `
              <article>
                <div>
                  <span>${escapeHtml(repo.grade || 'ungraded')} · ${escapeHtml(compactNumber(repo.score || 0))}</span>
                  <strong>${escapeHtml(repo.label || repo.host || 'repo')}</strong>
                </div>
                <p>${escapeHtml(list(repo.usefulSignals).join(' · ') || list(repo.pageTitles).join(' · ') || list(repo.urls)[0] || '')}</p>
                <small>${escapeHtml(`${compactNumber(repo.runs || 0)} runs · ${compactNumber(repo.pagesRead || 0)} pages · ${compactNumber(repo.freeResourceCaptures || 0)} resources · ${compactNumber(repo.blockers || 0)} blockers`)}</small>
              </article>
            `).join('') || '<article><p>No repo rows returned.</p></article>'}
          </div>
          <small>${escapeHtml(repoReadback.nextAction || '')}</small>
        </div>
      ` : ''}
    </section>
  `
}

function renderYoutubeSourceHandoffQueue(queue = {}) {
  const rows = sourceHandoffVisibleRows(queue, 12)
  const counts = queue.counts || {}
  const queueCopy = [
    `${compactNumber(counts.evidenceRows || counts.totalRows || 0)} discovered`,
    `${compactNumber(counts.runnableRows || 0)} public/free rows ready`,
    `${compactNumber(counts.parkedRows || 0)} parked`,
    `${compactNumber(counts.rowsWithRunCommand || 0)} with runner commands`,
  ].join(' · ')
  return `
    <section class="yt-section">
      <div class="yt-section-head">
        <span>SOURCE-BROWSER QUEUE</span>
        <h3>What can run next</h3>
        <small>${escapeHtml(queueCopy)}</small>
      </div>
      ${renderYoutubeSourceBucketCards(queue)}
      ${renderSourceRunSummary(queue.sourceRunSummary)}
      ${renderSourceSessionPrepQueue(queue.sourceSessionPrepQueue)}
      <div class="yt-source-handoff-list">
        ${rows.map(renderYoutubeSourceHandoffRow).join('') || '<article class="loading-card">No source-browser queue rows returned yet.</article>'}
      </div>
      ${renderYoutubeDevPriorityPreview(queue.devLanePriorityPreview)}
    </section>
  `
}

function renderYoutubeNextVideo(video = {}) {
  const steps = list(video.sourceSopReadiness).slice(0, 8)
  return `
    <article class="yt-video">
      <div class="yt-video-head">
        <div>
          <span>${escapeHtml(text(video.creator || creatorDisplayName(state.snapshot, video.creatorId), 'Unknown creator'))}</span>
          <h3>${escapeHtml(text(video.title, 'Untitled video'))}</h3>
        </div>
        <b>${escapeHtml(text(video.sourceGrade, 'ungraded').toUpperCase())}</b>
      </div>
      <a href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer">${escapeHtml(video.videoId || video.url || 'Open video')}</a>
      ${steps.length ? `
        <div class="yt-step-strip">
          ${steps.map(step => `<span class="${escapeHtml(systemTone(step.status))}" title="${escapeHtml(step.detail || step.rawStatus || '')}">${escapeHtml(step.label || step.key)}</span>`).join('')}
        </div>
      ` : ''}
    </article>
  `
}

function renderYoutubeCreatorGrade(row = {}) {
  return `
    <article class="yt-creator ${escapeHtml(gradeTone(row.grade))}">
      <div>
        <strong>${escapeHtml(text(row.grade, 'ungraded').toUpperCase())}</strong>
        <span>${escapeHtml(text(row.creator || row.creatorId, 'Unknown creator'))}</span>
      </div>
      <p>${escapeHtml(`${compactNumber(row.watchedVideos || 0)} watched · ${compactNumber(row.buildCandidates || 0)} ideas${row.bestDirectorRank ? ` · best rank #${row.bestDirectorRank}` : ''}`)}</p>
    </article>
  `
}

function surfaceStatusTone(status = '') {
  const normalized = text(status).toLowerCase()
  if (['ready', 'read', 'baseline_complete'].includes(normalized)) return 'live'
  if (normalized === 'mixed_read_and_parked') return 'verified'
  if (['parked', 'needs_watch'].includes(normalized)) return 'pending'
  return ''
}

function renderCreatorSurface(surface = {}) {
  return `
    <span class="yt-surface ${escapeHtml(surfaceStatusTone(surface.status))}" title="${escapeHtml(list(surface.hosts).join(' · ') || statusCopy(surface.status || 'not_found'))}">
      <b>${escapeHtml(surface.label || 'Surface')}</b>
      <em>${escapeHtml(compactNumber(surface.count || surface.watched || 0))}</em>
    </span>
  `
}

function renderYoutubeCreatorSourceStack(row = {}) {
  const surfaces = row.surfaces || {}
  const ordered = [
    surfaces.youtube,
    surfaces.publicWeb,
    surfaces.githubRepos,
    surfaces.newsletters,
    surfaces.freeCommunities,
    surfaces.paidAuthGates,
    surfaces.productsTools,
  ].filter(Boolean)
  return `
    <article class="yt-source-stack">
      <div>
        <strong>${escapeHtml(text(row.grade, 'ungraded').toUpperCase())}</strong>
        <span>${escapeHtml(text(row.creator || row.creatorId, 'Unknown creator'))}</span>
      </div>
      <p>${escapeHtml(`${compactNumber(row.discoveredSurfaceCount || 0)} surfaces · ${compactNumber(row.readSurfaceCount || 0)} read · ${compactNumber(row.parkedSurfaceCount || 0)} parked`)}</p>
      <div class="yt-surface-strip">
        ${ordered.map(renderCreatorSurface).join('')}
      </div>
    </article>
  `
}

function renderYoutubeCreatorSourceStacks(stacks = []) {
  const rows = list(stacks)
  if (!rows.length) return ''
  return `
    <section class="yt-section">
      <div class="yt-section-head">
        <span>CREATOR SOURCE STACK</span>
        <h3>What surfaces we found per creator</h3>
        <small>${escapeHtml(compactNumber(list(stacks).length))} creator stacks · YouTube, public pages, repos, newsletters, communities, paid/auth gates</small>
      </div>
      <div class="yt-source-stack-grid">
        ${rows.map(renderYoutubeCreatorSourceStack).join('')}
      </div>
    </section>
  `
}

function renderYoutubeRejectedReasons(reasons = {}) {
  const rows = Object.entries(reasons || {})
    .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))
    .slice(0, 8)
  if (!rows.length) return '<article class="loading-card">No rejected candidates in the current plan.</article>'
  return rows.map(([reason, count]) => `
    <article class="yt-reason">
      <strong>${escapeHtml(compactNumber(count))}</strong>
      <span>${escapeHtml(statusCopy(reason))}</span>
    </article>
  `).join('')
}

function renderYoutubeExecutiveSummary(summary = {}) {
  const workingSteps = list(summary.workingSteps)
  const openGaps = list(summary.openGaps)
  const nextBuilds = list(summary.nextBuilds)
  const currentState = list(summary.currentState)
  return `
    <section class="yt-section yt-exec-summary">
      <div class="yt-section-head">
        <span>EXECUTIVE SUMMARY</span>
        <h3>${escapeHtml(summary.title || 'Current chain truth')}</h3>
      </div>
      <div class="yt-exec-state">
        ${currentState.map(item => `<p>${escapeHtml(item)}</p>`).join('')}
      </div>
      <div class="yt-exec-grid">
        <article>
          <h4>Working Now</h4>
          ${workingSteps.map(step => `
            <div class="yt-exec-row">
              <strong>${escapeHtml(step.label || '')}</strong>
              <p>${escapeHtml(step.detail || '')}</p>
            </div>
          `).join('')}
        </article>
        <article>
          <h4>Open Gaps</h4>
          <ul>
            ${openGaps.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>
        <article>
          <h4>Next Builds</h4>
          <ul>
            ${nextBuilds.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>
      </div>
    </section>
  `
}

function renderYoutubeSourceIntelligence(snapshot = {}) {
  if (!els.youtubeSystem) return
  const system = snapshot.youtubeSourceIntelligence || {}
  const job = system.liveJob || {}
  const latestBatch = system.latestBatch || {}
  const runtime = systemRuntimeCopy(system)
  const youtubeCreators = list(system.creatorLeaderboard).length
    ? list(system.creatorLeaderboard)
    : list(system.topCreators)
  const youtubeCreatorTotal = Number(system.readbackTruth?.creatorLeaderboardCount || youtubeCreators.length)
  const youtubeGradeSummary = Object.entries(system.creatorGradeBuckets || {})
    .map(([grade, count]) => `${grade}: ${count}`)
    .join(' · ')
  els.youtubeSystem.innerHTML = `
    <section class="yt-runtime ${escapeHtml(systemTone(runtime))}">
      <div>
        <span>LIVE PIPELINE</span>
        <h2>${escapeHtml(runtime)}</h2>
        <p>${escapeHtml(job.statusDetail || job.scheduleDetail || system.sourceRoute || 'Foundation runtime status is loading.')}</p>
      </div>
      <div class="yt-runtime-meta">
        <span><b>Last job</b>${escapeHtml(shortDate(job.latestRunAt || job.latestRunStartedAt))}</span>
        <span><b>Next run</b>${escapeHtml(shortDate(job.nextRunAt))}</span>
        <span><b>Latest batch</b>${escapeHtml(shortDate(latestBatch.updatedAt))}</span>
        <span><b>Duration</b>${escapeHtml(durationCopy(job.latestRunDurationMs))}</span>
      </div>
    </section>

    <section class="yt-stats" aria-label="YouTube intelligence counts">
      ${renderYoutubeSystemStats(system)}
    </section>

    <section class="yt-section">
      <div class="yt-section-head">
        <span>PIPELINE STAGES</span>
        <h3>One connected system, not separate chores</h3>
      </div>
      <div class="yt-stage-grid">
        ${list(system.stages).map(renderYoutubeStage).join('') || '<article class="loading-card">No stage readback available.</article>'}
      </div>
    </section>

    <section class="yt-two-col">
      <div class="yt-section">
        <div class="yt-section-head">
          <span>NEXT WATCH BATCH</span>
          <h3>Exact public videos selected</h3>
        </div>
        <div class="yt-video-list">
          ${list(system.selectedVideos).map(renderYoutubeNextVideo).join('') || '<article class="loading-card">No runnable public videos selected right now.</article>'}
        </div>
      </div>
      <div class="yt-section">
        <div class="yt-section-head">
          <span>FILTERED BEFORE SPEND</span>
          <h3>Why candidates did not run</h3>
        </div>
        <div class="yt-reason-list">
          ${renderYoutubeRejectedReasons(system.rejectedReasonCounts)}
        </div>
      </div>
    </section>

    <section class="yt-section">
      <div class="yt-section-head">
        <span>HANDOFF QUEUES</span>
        <h3>Where YouTube sends the next work</h3>
      </div>
      <div class="yt-handoff-grid">
        ${list(system.handoffBuckets).map(renderYoutubeHandoff).join('') || '<article class="loading-card">No handoff queues returned.</article>'}
      </div>
    </section>

    ${renderYoutubeSourceHandoffQueue(system.sourceGodModeHandoffQueue)}

    ${renderYoutubeCreatorSourceStacks(system.creatorSourceStacks)}

    <section class="yt-two-col">
      <div class="yt-section">
        <div class="yt-section-head">
          <span>CREATOR GRADES</span>
          <h3>Who deserves deeper watching</h3>
          <small>${escapeHtml(compactNumber(youtubeCreators.length))} of ${escapeHtml(compactNumber(youtubeCreatorTotal))} creators · ${escapeHtml(youtubeGradeSummary || 'no grades yet')}</small>
        </div>
        <div class="yt-creator-grid">
          ${youtubeCreators.map(renderYoutubeCreatorGrade).join('') || '<article class="loading-card">No creator grades returned yet.</article>'}
        </div>
      </div>
      <div class="yt-section yt-latest-batch">
        <div class="yt-section-head">
          <span>LATEST FULL-WATCH BATCH</span>
          <h3>${escapeHtml(latestBatch.reportArtifactId || 'No batch yet')}</h3>
        </div>
        <div class="yt-batch-card">
          <strong>${escapeHtml(compactNumber(latestBatch.videoCount || 0))} videos</strong>
          <strong>${escapeHtml(compactNumber(latestBatch.buildCandidateCount || 0))} ideas</strong>
          <span>${escapeHtml(statusCopy(latestBatch.status || 'Needs source'))}</span>
          <p>${escapeHtml(latestBatch.sourceRoute || 'Waiting for full-watch report evidence.')}</p>
        </div>
      </div>
    </section>

    ${renderYoutubeExecutiveSummary(system.executiveSummary)}
  `
}

function approvalReviewTitle(item = {}) {
  const host = text(item.host, 'external link')
  const video = text(item.sourceVideoId)
  return video ? `${host} · ${video}` : host
}

function renderApprovalTriage(snapshot = {}) {
  const triage = snapshot.approvalReviewTriage || {}
  const rows = list(triage.rows)
  if (!rows.length) return ''
  const summary = triage.summary || {}
  const total = Number(triage.totalReviewRows || 0)
  const unsafeStartCount = Number(summary.startsImmediatelyCount || 0) + Number(summary.startsFromApprovalActionCount || 0)
  return `
    <div class="approval-triage">
      <div class="approval-triage-head">
        <div>
          <span>Source-packet triage</span>
          <p>${escapeHtml(compactNumber(total))} review rows held. ${escapeHtml(compactNumber(summary.runnableAfterPacketCount || 0))} can run after a recorded public packet, ${escapeHtml(compactNumber(summary.sourceSpecificApprovalRequiredCount || 0))} need source-specific scope, ${escapeHtml(compactNumber(summary.requiresAuthCount || 0))} need auth/paid boundaries.</p>
        </div>
        <strong>${escapeHtml(unsafeStartCount ? `${unsafeStartCount} unsafe starts` : '0 unsafe starts')}</strong>
      </div>
      <div class="approval-triage-grid">
        ${rows.map(row => `
          <article class="approval-triage-row ${Number(row.count || 0) ? 'has-count' : 'empty'}">
            <div>
              <span>${escapeHtml(row.label || row.bucketId || 'Packet group')}</span>
              <strong>${escapeHtml(compactNumber(row.count || 0))}</strong>
            </div>
            <p>${escapeHtml(row.plainEnglish || '')}</p>
            <small>${escapeHtml(`${compactNumber(row.runnableAfterPacketCount || 0)} public-after-packet · ${compactNumber(row.sourceSpecificApprovalRequiredCount || 0)} source-specific · ${compactNumber(row.requiresAuthCount || 0)} auth`)}</small>
            ${list(row.samples).length ? `<em>${escapeHtml(list(row.samples).map(sample => sample.host || sample.sourceFamily || sample.proposedDecision || 'source').filter(Boolean).slice(0, 3).join(' · '))}</em>` : ''}
          </article>
        `).join('')}
      </div>
    </div>
  `
}

function workerQueueStatusCopy(row = {}) {
  if (row.status === 'ready_to_run') return 'Ready for exact-page worker'
  if (row.status === 'already_run') return 'Worker evidence saved'
  if (row.status === 'ready_to_run_exact_public_worker') return 'Ready for exact-page worker'
  if (row.status === 'blocked_before_worker_run') return 'Packet boundary blocked'
  if (row.status === 'not_ready_for_worker') return 'Not approved for worker'
  return text(row.status, 'Worker blocked')
}

function renderWorkerQueue(snapshot = {}) {
  const queue = snapshot.sourcePacketWorkerQueue || {}
  const rows = list(queue.rows).slice(0, 5)
  const counts = queue.counts || {}
  const pendingApprovalCount = list(snapshot.approvalReviewQueue).length
  if (!rows.length) {
    return `
      <article class="approval-empty">
        <span>Exact-page worker status</span>
        <p>No approved source-packet rows are waiting for the exact public page worker. ${pendingApprovalCount ? `${escapeHtml(compactNumber(pendingApprovalCount))} links are still in review above; recording an approval creates queue visibility but does not start the worker.` : `Queue route: ${escapeHtml(SOURCE_PACKET_WORKER_QUEUE_ROUTE)}.`}</p>
      </article>
    `
  }
  return `
    <div class="approval-head">
      <div>
        <span>Exact-page worker status</span>
        <p>Approved public packets can run through the separate exact-page worker. The worker captures the approved URL only and turns discovered links into new source-packet candidates.</p>
      </div>
      <strong>${escapeHtml(compactNumber(counts.ready || 0))}/${escapeHtml(compactNumber(counts.total || rows.length))}</strong>
    </div>
    <div class="approval-list">
      ${rows.map(row => `
        <article class="approval-row">
          <div>
            <span>${escapeHtml(workerQueueStatusCopy(row))}</span>
            <h3>${escapeHtml(row.host || row.exactUrl || 'Source packet')}</h3>
            <p>${escapeHtml(row.workerStatus?.plainEnglish || 'Exact public page worker queue row.')}</p>
            <a href="${escapeHtml(row.exactUrl)}" target="_blank" rel="noreferrer">${escapeHtml(row.exactUrl)}</a>
          </div>
          <aside>
            <small>${escapeHtml(row.ready ? 'Separate worker run route is available for this exact approved packet.' : 'No worker starts from approval or from this status view.')}</small>
            ${row.existingRunArtifactId ? `<em>${escapeHtml(row.existingRunArtifactId)}</em>` : ''}
          </aside>
        </article>
      `).join('')}
    </div>
  `
}

function handsQueueStatusCopy(row = {}) {
  if (row.status === 'ready_to_run') return 'Ready for Hands'
  if (row.status === 'already_run') return 'Hands evidence saved'
  if (row.status === 'exact_public_read_ready') return 'Needs approved selector'
  if (row.status === 'auth_session_required') return 'Needs source-specific auth'
  if (row.status === 'paid_or_private_blocked') return 'Paid/private blocked'
  if (row.status === 'purchase_or_form_blocked') return 'Form/purchase blocked'
  if (row.status === 'not_ready_for_hands') return 'Not approved'
  return text(row.status, 'Blocked')
}

function renderHandsQueue(snapshot = {}) {
  const queue = snapshot.sourcePacketHandsQueue || {}
  const rows = list(queue.rows).slice(0, 5)
  const counts = queue.counts || {}
  const pendingApprovalCount = list(snapshot.approvalReviewQueue).length
  if (!rows.length) {
    return `
      <article class="approval-empty">
        <span>Hands runner status</span>
        <p>No approved source-packet rows are waiting for bounded browser Hands. ${pendingApprovalCount ? `${escapeHtml(compactNumber(pendingApprovalCount))} links are still in review above; Hands also needs approved selector/action policy before it can run.` : `Queue route: ${escapeHtml(EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE)}.`}</p>
      </article>
    `
  }
  return `
    <div class="approval-head">
      <div>
        <span>Hands runner status</span>
        <p>Approved packets only run through bounded Hands after an approved selector/action, next URL pattern, stop condition, and evidence target are present.</p>
      </div>
      <strong>${escapeHtml(compactNumber(counts.ready || 0))}/${escapeHtml(compactNumber(counts.total || rows.length))}</strong>
    </div>
    <div class="approval-list">
      ${rows.map(row => `
        <article class="approval-row">
          <div>
            <span>${escapeHtml(handsQueueStatusCopy(row))}</span>
            <h3>${escapeHtml(row.host || row.exactUrl || 'Source packet')}</h3>
            <p>${escapeHtml(row.handsStatus?.plainEnglish || 'Bounded browser Hands queue row.')}</p>
            <a href="${escapeHtml(row.exactUrl)}" target="_blank" rel="noreferrer">${escapeHtml(row.exactUrl)}</a>
          </div>
          <aside>
            <small>${escapeHtml(row.ready ? 'Separate run route is available for this exact approved action.' : 'No run starts from approval or from this status view.')}</small>
            <em>${escapeHtml(row.hasHandsPolicy ? 'Has approved selector/action' : 'Needs approved selector/action')}</em>
          </aside>
        </article>
      `).join('')}
    </div>
  `
}

function renderApprovalReview(snapshot = {}) {
  if (!els.approvalReview) return
  const queue = list(snapshot.approvalReviewQueue)
  if (!queue.length) {
    els.approvalReview.innerHTML = `
      <article class="approval-empty">
        <span>No link approvals waiting</span>
        <p>The extractor did not return useful external links that need Steve review right now.</p>
      </article>
      ${renderWorkerQueue(snapshot)}
      ${renderHandsQueue(snapshot)}
    `
    return
  }
  els.approvalReview.innerHTML = `
    <div class="approval-head">
      <div>
        <span>Links held for review</span>
        <p>These are links found in watched videos. The system will not crawl them deeper until the exact source follow-up is approved.</p>
      </div>
      <strong>${escapeHtml(compactNumber(queue.length))}</strong>
    </div>
    ${renderApprovalTriage(snapshot)}
    <div class="approval-list">
      ${queue.map((item, index) => `
        <article class="approval-row">
          <div>
            <span>${escapeHtml(item.type || 'review')}</span>
            <h3>${escapeHtml(approvalReviewTitle(item))}</h3>
            <p>${escapeHtml(item.reason || 'Needs approval before the system reads this link.')}</p>
            ${item.sourcePacketPreview?.plainEnglish ? `<p class="approval-packet-copy">${escapeHtml(item.sourcePacketPreview.plainEnglish)}</p>` : ''}
            ${item.sourcePacketPreview?.runtimePlan?.plainEnglish ? `<p class="approval-runtime-copy">${escapeHtml(item.sourcePacketPreview.runtimePlan.plainEnglish)}</p>` : ''}
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a>
          </div>
          <aside>
            <small>${escapeHtml(item.decisionNeeded || 'Approve exact source follow-up or reject.')}</small>
            ${Number(item.evidenceCount || 0) > 1 ? `<em>${escapeHtml(compactNumber(item.evidenceCount))} video mentions</em>` : ''}
            <button class="approval-ai-btn" type="button" data-approval-action="toggle" data-approval-index="${escapeHtml(String(index))}">Decide with AI</button>
          </aside>
          <div class="approval-ai-panel" data-approval-panel="${escapeHtml(String(index))}" hidden>
            <label>
              <span>Tell the AI what this link is for</span>
              <textarea rows="3" placeholder="Example: free community, follow public/free areas. Or: sales page, review how they sell AI products."></textarea>
            </label>
            <div class="approval-ai-actions">
              <button type="button" data-approval-action="preview" data-approval-index="${escapeHtml(String(index))}">Preview packet</button>
              <button type="button" data-approval-action="record" data-approval-decision="approve_packet" data-approval-index="${escapeHtml(String(index))}">Approve packet</button>
              <button type="button" data-approval-action="record" data-approval-decision="hold_packet" data-approval-index="${escapeHtml(String(index))}">Hold</button>
              <button type="button" data-approval-action="record" data-approval-decision="reject_link" data-approval-index="${escapeHtml(String(index))}">Reject</button>
              <em>Recording does not start the worker. Approved public packets show separate runner status.</em>
            </div>
            <div class="approval-ai-result" data-approval-result="${escapeHtml(String(index))}"></div>
          </div>
        </article>
      `).join('')}
    </div>
    ${renderWorkerQueue(snapshot)}
    ${renderHandsQueue(snapshot)}
  `
  bindApprovalReviewControls(queue)
}

function packetPreviewParams(item = {}, operatorNote = '') {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({
    url: item.url,
    host: item.host,
    sourceVideoId: item.sourceVideoId,
    sourceUrl: item.sourceUrl,
    reportArtifactId: item.reportArtifactId,
    reason: item.reason,
    operatorNote,
  })) {
    if (text(value)) params.set(key, text(value))
  }
  return params
}

function renderPacketPreviewResult(result = {}) {
  const packet = result.packet || {}
  const runtime = packet.runtimePlan || {}
  return `
    <article class="approval-packet-preview">
      <span>${escapeHtml(packet.proposedDecision || 'packet preview')}</span>
      <h4>${escapeHtml(packet.plainEnglish || result.plainEnglish || 'Packet preview ready.')}</h4>
      ${runtime.plainEnglish ? `<p class="approval-runtime-copy">${escapeHtml(runtime.plainEnglish)}</p>` : ''}
      <ul>
        ${list(packet.allowedActions).slice(0, 4).map(action => `<li>${escapeHtml(action)}</li>`).join('')}
      </ul>
      ${list(runtime.requiredBeforeRun).length ? `
        <p>Before anything runs:</p>
        <ul>
          ${list(runtime.requiredBeforeRun).slice(0, 4).map(action => `<li>${escapeHtml(action)}</li>`).join('')}
        </ul>
      ` : ''}
      <p>${escapeHtml(result.plainEnglish || 'Preview only. No crawl, login, purchase, form, worker, or backlog write starts from this preview.')}</p>
    </article>
  `
}

function renderPacketDecisionResult(result = {}) {
  const record = result.record || {}
  const item = result.sourceCrawlItem || {}
  const worker = result.workerStatus || {}
  const blocked = result.status === 'blocked' || result.validation?.ok === false
  const workerCopy = worker.plainEnglish ||
    (worker.ready
      ? 'Ready for the separate exact-page worker.'
      : 'No worker is ready from this decision.')
  return `
    <article class="approval-packet-preview ${blocked ? 'blocked' : 'recorded'}">
      <span>${escapeHtml(blocked ? 'Needs adjustment' : 'Decision recorded')}</span>
      <h4>${escapeHtml(result.plainEnglish || record.plainEnglish || 'Decision saved.')}</h4>
      <p>${escapeHtml(blocked ? 'Nothing ran. Adjust the note or hold the link.' : 'Saved in the Foundation decision ledger. Approval did not start the worker.')}</p>
      <p>${escapeHtml(workerCopy)}</p>
      ${item.itemKey ? `<p>${escapeHtml(item.itemKey)}</p>` : ''}
    </article>
  `
}

function bindApprovalReviewControls(queue = []) {
  if (!els.approvalReview) return
  els.approvalReview.querySelectorAll('[data-approval-action="toggle"]').forEach(button => {
    button.addEventListener('click', () => {
      const index = button.getAttribute('data-approval-index')
      const panel = els.approvalReview.querySelector(`[data-approval-panel="${CSS.escape(index)}"]`)
      if (!panel) return
      panel.hidden = !panel.hidden
    })
  })
  els.approvalReview.querySelectorAll('[data-approval-action="preview"]').forEach(button => {
    button.addEventListener('click', async () => {
      const index = Number(button.getAttribute('data-approval-index'))
      const item = queue[index]
      const panel = els.approvalReview.querySelector(`[data-approval-panel="${CSS.escape(String(index))}"]`)
      const result = els.approvalReview.querySelector(`[data-approval-result="${CSS.escape(String(index))}"]`)
      const operatorNote = panel?.querySelector('textarea')?.value || ''
      if (!item || !result) return
      button.disabled = true
      result.innerHTML = '<p class="approval-ai-loading">Building packet preview...</p>'
      try {
        const response = await fetch(`${LINK_PACKET_PREVIEW_ROUTE}?${packetPreviewParams(item, operatorNote).toString()}`, { credentials: 'same-origin' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json()
        result.innerHTML = renderPacketPreviewResult(payload)
      } catch (error) {
        result.innerHTML = `<p class="approval-ai-error">${escapeHtml(error instanceof Error ? error.message : 'Packet preview failed.')}</p>`
      } finally {
        button.disabled = false
      }
    })
  })
  els.approvalReview.querySelectorAll('[data-approval-action="record"]').forEach(button => {
    button.addEventListener('click', async () => {
      const index = Number(button.getAttribute('data-approval-index'))
      const item = queue[index]
      const panel = els.approvalReview.querySelector(`[data-approval-panel="${CSS.escape(String(index))}"]`)
      const result = els.approvalReview.querySelector(`[data-approval-result="${CSS.escape(String(index))}"]`)
      const operatorNote = panel?.querySelector('textarea')?.value || ''
      const operatorAction = button.getAttribute('data-approval-decision') || 'hold_packet'
      if (!item || !result) return
      button.disabled = true
      result.innerHTML = '<p class="approval-ai-loading">Recording decision...</p>'
      try {
        const response = await fetch(LINK_PACKET_DECISION_ROUTE, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: item.url,
            host: item.host,
            sourceVideoId: item.sourceVideoId,
            sourceUrl: item.sourceUrl,
            reportArtifactId: item.reportArtifactId,
            reason: item.reason,
            operatorNote,
            operatorAction,
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          result.innerHTML = renderPacketDecisionResult({
            ...payload,
            status: 'blocked',
            plainEnglish: payload.plainEnglish || `HTTP ${response.status}`,
          })
          return
        }
        result.innerHTML = renderPacketDecisionResult(payload)
      } catch (error) {
        result.innerHTML = `<p class="approval-ai-error">${escapeHtml(error instanceof Error ? error.message : 'Decision record failed.')}</p>`
      } finally {
        button.disabled = false
      }
    })
  })
}

function buildSourceFamilyRows(snapshot = {}) {
  return sourceCoverageRows(snapshot)
    .filter(row => row.familyId !== 'youtube-public-build-intel')
    .slice(0, 8)
}

function renderEconomics(snapshot = {}) {
  const economics = snapshot.extractionEconomics || {}
  if (!Number(economics.estimatedSpendUsd || 0)) {
    return `
      <div class="leader-economics empty">
        <span>API cost tracking needs usage data</span>
        <p>The LLM call ledger did not return Gemini video-review usage yet.</p>
      </div>
    `
  }
  return `
    <div class="leader-economics">
      <article>
        <strong>${escapeHtml(money(economics.estimatedSpendUsd))}</strong>
        <span>estimated API spend</span>
      </article>
      <article>
        <strong>${escapeHtml(money(economics.costPerIdeaUsd))}</strong>
        <span>cost per idea</span>
      </article>
      <article>
        <strong>${escapeHtml(money(economics.costPerVideoUsd))}</strong>
        <span>cost per video</span>
      </article>
      <p>${escapeHtml(compactNumber(economics.callCount))} Gemini video-review calls · ${escapeHtml(compactNumber(economics.videoCount))} videos · ${escapeHtml(compactNumber(economics.ideaCount))} build ideas. Estimate uses stored token usage, not Google invoice totals.</p>
    </div>
  `
}

function renderSourceLeaderboard(snapshot = {}) {
  if (!els.sourceLeaderboard) return
  const rankedCreators = rankedDevSources(snapshot)
  const totalRankedCreators = rankedCreators.length
  const gradeFilters = gradeBucketSummary(snapshot)
  const familyRows = buildSourceFamilyRows(snapshot)

  els.sourceLeaderboard.innerHTML = `
    ${renderEconomics(snapshot)}
    <div class="leader-columns">
      <section class="leader-block">
        <div class="leader-block-head">
          <span>Ranked creators</span>
          <small>${escapeHtml(compactNumber(rankedCreators.length))} of ${escapeHtml(compactNumber(totalRankedCreators))} showing · ${escapeHtml(gradeFilters.join(' · ') || 'no grades yet')}</small>
        </div>
        <div class="leader-list">
          ${rankedCreators.map((source, index) => {
            const devLane = laneScore(source)
            const grade = text(source.devBuildGrade || devLane?.grade || source.overallGrade, 'Needs grade').toUpperCase()
            const score = devLane?.score == null ? '' : ` · ${compactNumber(devLane.score)} score`
            const rankCopy = source.bestDirectorRank ? `Best idea rank #${compactNumber(source.bestDirectorRank)}` : 'No Director rank yet'
            const watchCopy = text(source.devWatchRecommendation || devLane?.watchRecommendation || source.watchRecommendation, 'watch recommendation pending')
            const whyRanked = `Why ranked: ${grade} grade; ${compactNumber(source.buildCandidates)} ideas; ${compactNumber(source.watchedVideos)} watched; ${rankCopy.toLowerCase()}.`
            return `
              <article class="leader-card ${escapeHtml(gradeTone(grade))}">
                <div class="leader-grade">${escapeHtml(grade)}</div>
                <div class="leader-copy">
                  <span>#${escapeHtml(compactNumber(index + 1))} · Dev build${escapeHtml(score)}</span>
                  <h3>${escapeHtml(source.creator || creatorDisplayName(snapshot, source.creatorId))}</h3>
                  <p>${escapeHtml(`${compactNumber(source.buildCandidates)} ideas · ${compactNumber(source.watchedVideos)} watched/represented videos · ${rankCopy}`)}</p>
                  <p>${escapeHtml(`Dev action: ${statusCopy(watchCopy)}.`)}</p>
                  <p>${escapeHtml(whyRanked)}</p>
                </div>
              </article>
            `
          }).join('') || '<article class="loading-card">No creator grades returned yet.</article>'}
        </div>
      </section>
      <section class="leader-block">
        <div class="leader-block-head">
          <span>Source families</span>
          <small>Connected vs waiting</small>
        </div>
        <div class="family-list">
          ${familyRows.map(row => `
            <article class="family-row ${escapeHtml(familyTone(row.status))}">
              <div>
                <h3>${escapeHtml(row.label)}</h3>
                <p>${escapeHtml(row.feedsDev ? row.feedPath : row.nextAction || row.blocker || row.notes || 'Not feeding Dev yet.')}</p>
              </div>
              <strong>${escapeHtml(familyStatusCopy(row.status))}</strong>
            </article>
          `).join('') || '<article class="loading-card">No source-family coverage returned yet.</article>'}
        </div>
      </section>
    </div>
  `
}

function extractorSummary(item = {}) {
  if (item.summary) return text(item.summary)
  const byLane = {
    'youtube-video-intelligence-pipeline': 'Reads public video/page context, transcripts, audio, and approved visual evidence. Browser hands and approved resource follow-up are next. Comments are excluded.',
    'meetings-transcripts': 'Reads meeting notes and transcripts into Foundation. Dev-specific routing is pending.',
    'email-missive-comms': 'Reads governed email/comms candidates into Foundation. Dev-specific routing is pending.',
    'slack-comms': 'Reads governed Slack threads into Foundation. Dev-specific routing is pending.',
    'synthesis-router': 'Brain layer: dedupes extracted facts and routes them into build candidates.',
  }
  return byLane[item.laneId] || text(item.summary || item.detail, 'Foundation extraction lane.')
}

function extractorTitle(item = {}) {
  const byLane = {
    'youtube-video-intelligence-pipeline': 'YouTube video extractor',
    'meetings-transcripts': 'Meetings extractor',
    'email-missive-comms': 'Gmail / Missive extractor',
    'slack-comms': 'Slack extractor',
    'synthesis-router': 'Synthesis router',
  }
  return byLane[item.laneId] || text(item.title || item.name, 'Extraction system')
}

function extractorIcon(item = {}) {
  const byLane = {
    'youtube-video-intelligence-pipeline': 'video_library',
    'meetings-transcripts': 'forum',
    'email-missive-comms': 'mail',
    'slack-comms': 'tag',
    'synthesis-router': 'account_tree',
  }
  return byLane[item.laneId] || 'hub'
}

const GOD_MODE_CAPABILITY_LABELS = {
  eyes: 'Eyes',
  ears: 'Ears',
  hands: 'Hands',
  reading: 'Read',
  brain: 'Brain',
  evidence: 'Evidence',
  boundaries: 'Boundaries',
  output: 'Output',
}

function statusCopy(value = '') {
  return text(value, 'unknown').replace(/_/g, ' ')
}

function parityTone(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized === 'working' || normalized.includes('proven') || normalized.includes('ready')) return 'verified'
  if (normalized.includes('blocked') || normalized.includes('required')) return 'blocked'
  if (normalized.includes('planned') || normalized.includes('partial') || normalized.includes('queue')) return 'pending'
  if (normalized.includes('excluded') || normalized.includes('not_applicable')) return 'neutral'
  return 'pending'
}

function renderCapabilityChips(family = {}) {
  const capabilities = family.capabilities || {}
  return Object.entries(GOD_MODE_CAPABILITY_LABELS)
    .map(([key, label]) => ({ key, label, value: text(capabilities[key]) }))
    .filter(item => item.value && item.value !== 'not_applicable')
    .map(item => `
      <span class="cap-chip ${escapeHtml(parityTone(item.value))}">
        <b>${escapeHtml(item.label)}</b>
        ${escapeHtml(statusCopy(item.value))}
      </span>
    `).join('')
}

function renderGodModeParity(snapshot = {}) {
  if (!els.godModeParity) return
  const parity = snapshot.godModeExtractorParity || {}
  const maturity = snapshot.sourceFamilyGodModeMaturity || {}
  const families = list(parity.families)
  const maturityByFamilyId = new Map(list(maturity.families).map(family => [family.familyId, family]))
  const summary = maturity.summary || parity.summary || {}
  const evaluation = maturity.evaluation || parity.evaluation || {}
  const status = evaluation.ok === true ? 'No false God Mode claims' : 'Parity finding'
  const familyRows = families.map(family => {
    const maturityRow = maturityByFamilyId.get(family.familyId) || {}
    const blockers = list(family.blockers).slice(0, 2)
    const freshnessStatus = statusCopy(maturityRow.freshnessStatus || 'not tracked')
    const latestSuccess = maturityRow.latestSuccessfulRunAt ? shortDate(maturityRow.latestSuccessfulRunAt) : 'No live success'
    const nextAction = maturityRow.nextBestAction || family.nextCard || 'Needs source-family review.'
    return `
      <article class="parity-card ${escapeHtml(parityTone(family.currentLevel))}">
        <div class="parity-card-head">
          <span>${escapeHtml(statusCopy(family.currentLevel))}</span>
          <strong>${escapeHtml(family.familyId || '')}</strong>
        </div>
        <h3>${escapeHtml(family.label || family.familyId || 'Source family')}</h3>
        <p>${escapeHtml(family.accessBoundary || family.modelRoute || '')}</p>
        <div class="parity-meta">
          <span><b>Freshness</b>${escapeHtml(freshnessStatus)}</span>
          <span><b>Latest success</b>${escapeHtml(latestSuccess)}</span>
        </div>
        <div class="cap-list parity-cap-list">${renderCapabilityChips(family)}</div>
        <div class="parity-next">
          <span>Next</span>
          <b>${escapeHtml(family.nextCard || 'No active card')}</b>
          <p>${escapeHtml(nextAction)}</p>
        </div>
        ${blockers.length ? `<ul>${blockers.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      </article>
    `
  }).join('')

  els.godModeParity.innerHTML = `
    <div class="parity-head">
      <div>
        <span>EXTRACTOR TRUTH GUARD</span>
        <h3>${escapeHtml(status)}</h3>
        <p>Capability audit for the extraction systems above. These rows show what each source family can actually do and when it last succeeded.</p>
      </div>
      <div class="parity-summary" aria-label="God Mode parity summary">
        <span><b>${escapeHtml(compactNumber(summary.familyCount || families.length))}</b> families</span>
        <span><b>${escapeHtml(compactNumber(summary.godModeReadyCount || summary.claimsGodModeCount || 0))}</b> God ready</span>
        <span><b>${escapeHtml(compactNumber(summary.blockedCount || summary.blockedFamilyCount || 0))}</b> blocked</span>
        <span><b>${escapeHtml(compactNumber(summary.handsGapCount || summary.handsNotProvenCount || 0))}</b> hands gaps</span>
      </div>
    </div>
    <div class="parity-grid">
      ${familyRows || '<article class="loading-card">No parity rows returned from Foundation.</article>'}
    </div>
  `
}

function sourceIcon(source = {}) {
  const bySource = {
    youtube: 'play_circle',
    'skool-paid': 'school',
    'github-repos': 'code',
    'internal-signals': 'mail',
    'meetings-transcripts-source': 'forum',
  }
  return bySource[source.id] || 'database'
}

function sourceStatusLine(source = {}) {
  if (source.statusLine) return source.statusLine
  const status = statusLabel(source.badge || source.label)
  const count = list(source.targets).length
  const noun = text(source.targetNoun, 'target')
  const targetCopy = count === 1 ? `1 ${noun}` : `${compactNumber(count)} ${noun}s`
  if (status === 'Live') return `Running · ${targetCopy}`
  if (status === 'Foundation') return `Connected · ${targetCopy}`
  if (status === 'Pending') return 'Needs login rules'
  if (status === 'Needs source') return 'Planned'
  return `${status} · ${targetCopy}`
}

function sourceTone(source = {}) {
  const status = statusLabel(source.badge || source.label)
  if (status === 'Live' || status === 'Foundation') return 'live'
  if (status === 'Pending' || status === 'Needs approval') return 'pending'
  if (status === 'Verified' || status === 'Source-backed') return 'verified'
  return ''
}

function shortCandidateTitle(candidate = {}) {
  const raw = text(candidate.title || candidate.recommendedNextStep, 'Build candidate')
  const normalized = raw.toLowerCase()
  if (normalized.includes('package reusable aios skills')) return 'Reusable AIOS skills'
  if (normalized.includes('developer workflow signals')) return 'Developer workflow signals'
  if (normalized.includes('self-healing state registry')) return 'Self-healing handoff controller'
  if (normalized.includes('browserbase') || normalized.includes('browse/hermes')) return 'Browser skills hands layer'
  if (normalized.includes('canvas-to-terminal')) return 'Canvas-terminal sync'
  if (normalized.includes('silver-platter')) return 'Silver-platter CLI skill'
  const withoutPrefix = raw.replace(/^Mark Kashef:\s*/i, '').replace(/^Use\s+/i, '')
  const beforeColon = withoutPrefix.split(':')[0]
  const beforeComma = beforeColon.split(',')[0]
  const words = beforeComma.trim().split(/\s+/).filter(Boolean)
  return words.length > 7 ? words.slice(0, 6).join(' ') : beforeComma.trim()
}

function shortCandidateBody(candidate = {}) {
  const raw = text(candidate.why || candidate.recommendedNextStep, 'Build idea from approved research.')
  const normalized = `${raw} ${candidate.title || ''} ${candidate.recommendedNextStep || ''}`.toLowerCase()
  if (normalized.includes('package reusable aios skills')) {
    return 'Turn reusable Claude/Codex workflows into governed AIOS skills with proof and promotion gates.'
  }
  if (normalized.includes('developer workflow signals')) {
    return 'Use recurring workflow, memory, design, and context themes as AIOS training candidates.'
  }
  if (normalized.includes('self-healing state registry')) {
    return 'Standardize a local state checkpoint so agent handoffs can recover after crashes or context loss.'
  }
  if (normalized.includes('browserbase') || normalized.includes('browse/hermes')) {
    return 'Evaluate browser skills as the HANDS layer, but only after source-packet approvals.'
  }
  if (normalized.includes('canvas-to-terminal')) {
    return 'Connect visual design state and terminal execution so builders can move cleanly between them.'
  }
  if (normalized.includes('silver-platter')) {
    return 'Create operator-friendly commands that trigger multi-source extraction and formatted reports.'
  }
  const sentence = raw.split(/[.!?]/).find(part => part.trim().length > 20) || raw
  const words = sentence.trim().split(/\s+/).filter(Boolean)
  return words.length > 22 ? words.slice(0, 22).join(' ') : sentence.trim()
}

function creatorIdFromReportId(value = '') {
  const latest20Match = text(value).match(/batch:youtube-latest-20:api-full-watch-v1:([^:]+):/i)
  if (latest20Match?.[1]) return latest20Match[1]
  if (/mark-kashef/i.test(value)) return 'mark-kashef'
  return ''
}

function candidateCreatorName(candidate = {}) {
  const snapshot = state.snapshot || {}
  const directCreatorId = text(candidate.creatorId || creatorIdFromReportId(candidate.sourceReportArtifactId))
  if (directCreatorId) return creatorDisplayName(snapshot, directCreatorId)

  const byVideo = sourceGrades(snapshot).find(source =>
    list(source.topCandidates).some(item => text(item.sourceVideoId) && text(item.sourceVideoId) === text(candidate.sourceVideoId))
  )
  if (byVideo?.creator) return byVideo.creator

  const byResearchVideo = list(snapshot.dailyWatch?.researchPool)
    .find(item => text(item.videoId) && text(item.videoId) === text(candidate.sourceVideoId))
  if (byResearchVideo?.creator) return byResearchVideo.creator

  const reportTitle = text(candidate.sourceReportTitle)
  if (/mark kashef/i.test(reportTitle)) return 'Mark Kashef'
  return ''
}

function candidateSourceCopy(candidate = {}) {
  const creator = candidateCreatorName(candidate)
  if (creator) return `From ${creator} video`
  const reportTitle = text(candidate.sourceReportTitle)
  if (reportTitle && !/latest-20|batch|god mode api full-watch/i.test(reportTitle)) return `From ${reportTitle}`
  if (candidate.sourceVideoId) return 'From watched video'
  return 'From approved research'
}

function candidateDevSourceGrade(candidate = {}) {
  const direct = text(candidate.sourceDevBuildGrade).toUpperCase()
  if (direct) return direct
  const creatorId = text(candidate.creatorId || creatorIdFromReportId(candidate.sourceReportArtifactId))
  if (creatorId) {
    const source = sourceGrades(state.snapshot || {}).find(item => item.creatorId === creatorId)
    const devLane = laneScore(source)
    return text(source?.devBuildGrade || devLane?.grade || source?.overallGrade || 'ungraded').toUpperCase()
  }
  return 'ungraded'
}

function safeHref(value = '') {
  const raw = text(value)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function urlHost(value = '') {
  const href = safeHref(value)
  if (!href) return text(value)
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}

function renderExternalLink(url = '', label = '') {
  const href = safeHref(url)
  if (!href) return escapeHtml(label || url || 'No link')
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label || urlHost(href) || href)}</a>`
}

function candidateVideoRecord(candidate = {}, snapshot = state.snapshot || {}) {
  const videoId = text(candidate.sourceVideoId)
  if (!videoId) return null
  return list(snapshot.dailyWatch?.researchPool).find(item => text(item.videoId) === videoId) || null
}

function candidateAssociatedLinkRows(candidate = {}, snapshot = state.snapshot || {}) {
  const videoId = text(candidate.sourceVideoId)
  if (!videoId) return []
  const rows = list(snapshot.youtubeSourceIntelligence?.sourceGodModeHandoffQueue?.rows)
    .filter(row => text(row.sourceVideoId) === videoId || list(row.sourceVideoIds).map(text).includes(videoId))
  return uniqueBy(rows, row => row.rowId || row.url)
}

function candidateApprovalRows(candidate = {}, snapshot = state.snapshot || {}) {
  const videoId = text(candidate.sourceVideoId)
  if (!videoId) return []
  const rows = list(snapshot.director?.report?.actionRequiredItems)
    .filter(row => text(row.sourceVideoId) === videoId || text(row.sourceUrl).includes(videoId))
  return uniqueBy(rows, row => row.url || `${row.host}:${row.blocker}`)
}

function candidateSourceLinkRows(candidate = {}, snapshot = state.snapshot || {}) {
  const handoffRows = candidateAssociatedLinkRows(candidate, snapshot).map(row => ({
    url: row.url,
    host: row.host || urlHost(row.url),
    label: row.label || statusCopy(row.bucketId || row.sourceType),
    status: row.devLanePriority?.priorityLabel || statusCopy(row.status || row.disposition),
    reason: row.plainEnglish || row.devLanePriority?.reason || '',
    bucketId: row.bucketId,
  }))
  const approvalRows = candidateApprovalRows(candidate, snapshot).map(row => ({
    url: row.url,
    host: row.host || urlHost(row.url),
    label: statusCopy(row.type || 'approval required'),
    status: row.allowedNextDecision || statusCopy(row.blocker),
    reason: row.blocker || '',
    bucketId: 'approval',
  }))
  return uniqueBy([...handoffRows, ...approvalRows], row => row.url).slice(0, 6)
}

function topCandidateLanes(candidate = {}) {
  return list(candidate.missionScoreBreakdown?.laneScores)
    .filter(lane => Number(lane.score || 0) > 0)
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
    .slice(0, 3)
}

function candidateRankReason(candidate = {}) {
  const grade = candidateDevSourceGrade(candidate)
  const lanes = topCandidateLanes(candidate).map(lane => lane.label || lane.id)
  const parts = []
  if (candidate.sourceTrustLabel === 'api_full_watch') parts.push('full video/audio/visual watch')
  if (candidate.scopeReadiness?.status === 'ready_for_scoper') parts.push('ready for Scoper')
  if (grade && grade !== 'ungraded') parts.push(`${grade} Dev source`)
  if (lanes.length) parts.push(`matches ${lanes.join(', ')}`)
  return parts.length ? parts.join(' · ') : 'Ranked by mission fit, evidence, trust, and source strength.'
}

function renderCandidateScoreBreakdown(candidate = {}) {
  const breakdown = candidate.missionScoreBreakdown || {}
  const lanes = topCandidateLanes(candidate)
  const chips = [
    ['Mission', candidate.missionScore],
    ['Evidence', breakdown.evidenceScore],
    ['Trust', breakdown.sourceTrustScore ?? candidate.sourceTrustScore],
    ['Creator', breakdown.sourceQualityScore ?? candidate.sourceQualityScore],
    ['Confidence', breakdown.confidenceScore],
  ].filter(([, value]) => value !== undefined && value !== null && text(value) !== '')
  return `
    <div class="ranking-score-grid" aria-label="Idea score breakdown">
      ${chips.map(([label, value]) => `
        <span><b>${escapeHtml(label)}</b>${escapeHtml(compactNumber(value || 0))}</span>
      `).join('')}
    </div>
    ${lanes.length ? `
      <div class="ranking-lanes">
        ${lanes.map(lane => `<span>${escapeHtml(lane.label || lane.id)} ${escapeHtml(compactNumber(lane.score || 0))}</span>`).join('')}
      </div>
    ` : ''}
  `
}

function renderCandidateEvidence(candidate = {}) {
  const video = candidateVideoRecord(candidate)
  const videoTitle = video?.title || candidate.sourceVideoId || 'Source video'
  const videoUrl = candidate.sourceUrl || video?.url || ''
  const timestamps = list(candidate.evidenceTimestamps).slice(0, 4)
  const refs = list(candidate.evidenceRefs).slice(0, 3)
  const posture = candidate.sourceTrustEvidencePosture || candidate.scopeReadiness?.evidencePosture || statusCopy(candidate.sourceTrustLabel)
  return `
    <div class="ranking-evidence">
      <div>
        <b>Source video</b>
        <span>${videoUrl ? renderExternalLink(videoUrl, videoTitle) : escapeHtml(videoTitle)}</span>
      </div>
      <div>
        <b>Evidence posture</b>
        <span>${escapeHtml(posture || 'Evidence pointer present; deeper details need review.')}</span>
      </div>
      <div>
        <b>Report</b>
        <span>${escapeHtml(candidate.sourceReportTitle || candidate.sourceReportArtifactId || 'No report attached')}</span>
      </div>
      <div>
        <b>Visual details</b>
        <span>${timestamps.length ? escapeHtml(timestamps.join(' · ')) : 'No timestamp list exposed on this card yet.'}</span>
      </div>
      ${refs.length ? `
        <div>
          <b>Evidence refs</b>
          <span>${escapeHtml(refs.join(' · '))}</span>
        </div>
      ` : ''}
    </div>
  `
}

function renderCandidateSourceLinks(candidate = {}) {
  const rows = candidateSourceLinkRows(candidate)
  if (!rows.length) {
    return `
      <div class="ranking-links empty">
        <b>Attached links/resources</b>
        <span>No repo/resource/community/product links are attached to this idea yet.</span>
      </div>
    `
  }
  return `
    <div class="ranking-links">
      <b>Attached links/resources</b>
      <div>
        ${rows.map(row => `
          <a href="${escapeHtml(safeHref(row.url) || '#')}" target="_blank" rel="noreferrer">
            <span>${escapeHtml(row.host || urlHost(row.url) || 'resource')}</span>
            <small>${escapeHtml(row.label)} · ${escapeHtml(row.status)}</small>
          </a>
        `).join('')}
      </div>
    </div>
  `
}

function renderOpportunityLensScores(opportunity = {}) {
  const lenses = list(opportunity.lensScores).slice(0, 5)
  if (!lenses.length) return ''
  return `
    <div class="opportunity-lenses">
      ${lenses.map(lens => `
        <span><b>${escapeHtml(lens.label || lens.lensId)}</b>${escapeHtml(compactNumber(lens.score || 0))}</span>
      `).join('')}
    </div>
  `
}

function renderOpportunitySupport(opportunity = {}) {
  const support = opportunity.support || {}
  const creators = list(support.creators).slice(0, 5)
  const videos = list(support.videos).slice(0, 4)
  const links = list(support.links).slice(0, 4)
  return `
    <div class="opportunity-support">
      <div>
        <b>Support</b>
        <span>${escapeHtml(opportunity.supportSummary || 'No support summary')}</span>
      </div>
      <div>
        <b>Creators</b>
        <span>${creators.length ? escapeHtml(creators.map(item => item.creator || item.creatorId).join(' · ')) : 'No creator support exposed yet'}</span>
      </div>
      <div>
        <b>Videos</b>
        <span>${videos.length ? videos.map(video => renderExternalLink(video.url, video.creator ? `${video.creator}: ${video.videoId}` : video.videoId)).join(' · ') : 'No video links exposed yet'}</span>
      </div>
      <div>
        <b>Links/resources</b>
        <span>${links.length ? links.map(link => renderExternalLink(link.url, link.host || link.label)).join(' · ') : 'No attached links/resources yet'}</span>
      </div>
    </div>
  `
}

function renderOpportunitySignal(signal = {}) {
  return `
    <li>
      <strong>${escapeHtml(signal.title || 'Idea signal')}</strong>
      <span>${escapeHtml(signal.creator || 'Unknown source')}${signal.missionScore ? ` · score ${escapeHtml(compactNumber(signal.missionScore))}` : ''}</span>
    </li>
  `
}

function renderOperatorPlaybook(opportunity = {}) {
  const playbook = opportunity.operatorPlaybook || null
  if (!playbook) return ''
  const pillars = list(playbook.pillars)
  return `
    <div class="operator-playbook">
      <div class="operator-playbook-head">
        <b>${escapeHtml(playbook.title || 'Operator playbook')}</b>
        <span>${escapeHtml(playbook.plainEnglish || '')}</span>
      </div>
      <div class="operator-playbook-grid">
        ${pillars.map(pillar => `
          <div class="operator-playbook-pillar">
            <b>${escapeHtml(pillar.label || pillar.id)}</b>
            <span>${escapeHtml(pillar.operatorRule || '')}</span>
            <small>${escapeHtml(compactNumber(list(pillar.supportingSignals).length))} source signals · ${escapeHtml(pillar.status || 'needs evidence')}</small>
          </div>
        `).join('')}
      </div>
      <div class="operator-playbook-rules">
        <b>Codex rules to review</b>
        <ul>${list(playbook.codexRules).map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}</ul>
      </div>
      <p><b>Next review:</b> ${escapeHtml(playbook.nextReview || 'Review before doctrine.')}</p>
    </div>
  `
}

function renderVisionOpportunity(opportunity = {}) {
  const rank = opportunity.priorityRank || opportunity.rank || 0
  const score = opportunity.priorityScore || opportunity.score || 0
  const recommendation = opportunity.scoperRecommendation || {}
  return `
    <article class="vision-opportunity">
      <div class="vision-rank">#${escapeHtml(compactNumber(rank))}</div>
      <div class="vision-body">
        <div class="ranking-meta">
          <span>score ${escapeHtml(compactNumber(score))}</span>
          <span>${escapeHtml(opportunity.selectedPriorityLensLabel || opportunity.strongestLens?.label || 'Vision lens')}</span>
          <span>${escapeHtml(compactNumber(opportunity.candidateCount || 0))} signals</span>
          ${recommendation.label ? `<span>${escapeHtml(recommendation.label)}</span>` : ''}
        </div>
        <h3>${escapeHtml(opportunity.title || 'Opportunity')}</h3>
        <p>${escapeHtml(opportunity.whyForAios || opportunity.plainEnglish || '')}</p>
        ${opportunity.priorityReason ? `<p><b>Why this lens:</b> ${escapeHtml(opportunity.priorityReason)}</p>` : ''}
        <p><b>Next useful move:</b> ${escapeHtml(opportunity.nextMove || 'Review before Scoper.')}</p>
        ${recommendation.plainEnglish ? `<p><b>Promotion boundary:</b> ${escapeHtml(recommendation.plainEnglish)}</p>` : ''}
        ${renderOpportunityLensScores(opportunity)}
        ${renderOperatorPlaybook(opportunity)}
        ${renderOpportunitySupport(opportunity)}
        <div class="opportunity-signal-list">
          <b>Strongest idea signals</b>
          <ul>${list(opportunity.importantSignals).slice(0, 4).map(renderOpportunitySignal).join('')}</ul>
        </div>
      </div>
    </article>
  `
}

function selectedPriorityLens(review = {}) {
  const router = review.priorityLensRouter || {}
  const lenses = list(router.lenses)
  const selectedId = state.selectedPriorityLensId || router.defaultLensId || 'current-sprint'
  return lenses.find(lens => lens.lensId === selectedId) || lenses.find(lens => lens.lensId === router.defaultLensId) || lenses[0] || null
}

function renderPriorityLensRouter(review = {}) {
  const router = review.priorityLensRouter || {}
  const lenses = list(router.lenses)
  if (!lenses.length) return ''
  const selected = selectedPriorityLens(review)
  const context = router.context || {}
  return `
    <div class="priority-lens-router">
      <div class="priority-lens-copy">
        <span>PRIORITY LENS</span>
        <h3>${escapeHtml(selected?.label || 'Current Sprint')}</h3>
        <p>${escapeHtml(selected?.question || router.plainEnglish || 'Choose how to rank the same source evidence.')}</p>
      </div>
      <div class="priority-lens-tabs" role="tablist" aria-label="Priority ranking lenses">
        ${lenses.map(lens => `
          <button class="priority-lens-button${lens.lensId === selected?.lensId ? ' active' : ''}" type="button" data-priority-lens="${escapeHtml(lens.lensId)}">
            <span>${escapeHtml(lens.label)}</span>
            <small>${escapeHtml(compactNumber(lens.opportunityCount || 0))} ranked</small>
          </button>
        `).join('')}
      </div>
      <div class="priority-context-grid">
        <div>
          <b>Current objective</b>
          <span>${escapeHtml(context.currentObjective || 'Use the selected lens to choose the next move.')}</span>
        </div>
        <div>
          <b>System posture</b>
          <span>${escapeHtml(context.existingSystemPosture || 'Raw evidence stays neutral; lenses only change ranking.')}</span>
        </div>
        <div>
          <b>Known gaps</b>
          <span>${escapeHtml(list(context.knownGaps).slice(0, 3).join(' · ') || 'No live gaps exposed by this payload.')}</span>
        </div>
        <div>
          <b>Who picks Scoper candidates</b>
          <span>${escapeHtml(context.scoperOwnership?.now || 'Steve + Codex choose for now.')} ${escapeHtml(context.scoperOwnership?.later || '')}</span>
        </div>
      </div>
    </div>
  `
}

function renderDirectorScoperCandidate(candidate = {}) {
  const support = candidate.lensSupport || {}
  const topLensCopy = list(support.top3LensLabels).slice(0, 5).join(' · ')
  return `
    <article class="director-scoper-card">
      <div class="director-scoper-rank">#${escapeHtml(compactNumber(candidate.directorRank || 0))}</div>
      <div>
        <div class="ranking-meta">
          <span>Director score ${escapeHtml(compactNumber(candidate.directorScore || 0))}</span>
          <span>${escapeHtml(compactNumber(support.top3Count || 0))}/${escapeHtml(compactNumber(support.lensCount || 0))} lenses top 3</span>
          <span>${escapeHtml(candidate.scoperPromotion?.label || 'Draft candidate')}</span>
        </div>
        <h3>${escapeHtml(candidate.title || 'Scoper candidate')}</h3>
        <p>${escapeHtml(candidate.whySelectedForScoper || 'Needs Director explanation.')}</p>
        <p><b>Why it got through:</b> ${escapeHtml(candidate.whyThisBeatsAlternatives || 'Needs comparison.')}</p>
        <p><b>Lens support:</b> ${escapeHtml(topLensCopy || 'No top lens support exposed yet.')}</p>
        <p><b>Boundary:</b> ${escapeHtml(candidate.scoperPromotion?.boundary || 'Review-only until Steve/Codex approves promotion.')}</p>
      </div>
    </article>
  `
}

function renderDirectorTop3ScoperReview(review = {}) {
  const router = review.priorityLensRouter || {}
  const scoperReview = router.directorTop3ScoperReview || {}
  const candidates = list(scoperReview.candidates)
  if (!candidates.length) return ''
  const nearMisses = list(scoperReview.nearMisses).slice(0, 3)
  return `
    <div class="director-scoper-review">
      <div class="priority-lens-copy">
        <span>DIRECTOR TOP 3</span>
        <h3>Scoper candidates</h3>
        <p>${escapeHtml(scoperReview.plainEnglish || 'All lenses vote before anything becomes a Scoper candidate.')}</p>
      </div>
      <div class="director-scoper-rule">
        <b>Selection rule</b>
        <span>${escapeHtml(scoperReview.selectionRule || 'Compare all lenses, dedupe overlaps, explain the why, then require Steve/Codex approval.')}</span>
      </div>
      <div class="director-scoper-grid">
        ${candidates.map(renderDirectorScoperCandidate).join('')}
      </div>
      ${nearMisses.length ? `
        <div class="director-near-misses">
          <b>Near misses</b>
          <span>${nearMisses.map(item => `${item.rank}. ${item.title} (${compactNumber(item.directorScore || 0)})`).map(escapeHtml).join(' · ')}</span>
        </div>
      ` : ''}
    </div>
  `
}

function renderVisionOpportunities(snapshot = {}) {
  const review = snapshot.devOpportunityVisionLens || {}
  const selected = selectedPriorityLens(review)
  const opportunities = list(selected?.opportunities).length ? list(selected.opportunities).slice(0, 8) : list(review.opportunities).slice(0, 8)
  return `
    <section class="vision-opportunities">
      <div class="ranking-head">
        <span>VISION OPPORTUNITIES</span>
        <h2>What this points to</h2>
        <small>${escapeHtml(compactNumber(review.opportunityCount || opportunities.length))} opportunities from ${escapeHtml(compactNumber(review.matchedCandidateCount || 0))}/${escapeHtml(compactNumber(review.inputCandidateCount || 0))} matched idea signals · ${escapeHtml(selected?.label || 'default lens')} · review-only</small>
      </div>
      ${renderPriorityLensRouter(review)}
      ${renderDirectorTop3ScoperReview(review)}
      <div class="vision-opportunity-list">
        ${opportunities.map(renderVisionOpportunity).join('') || '<article class="loading-card">No vision opportunities returned yet.</article>'}
      </div>
    </section>
  `
}

function renderRankingIdea(candidate = {}) {
  const grade = candidateDevSourceGrade(candidate)
  const readiness = candidate.scopeReadiness?.label || statusCopy(candidate.buildReadiness || candidate.directorRecommendation || 'Needs Director review')
  return `
    <article class="ranking-idea">
      <div class="ranking-rank">#${escapeHtml(compactNumber(candidate.rank || 0))}</div>
      <div class="ranking-idea-body">
        <div class="ranking-meta">
          <span>score ${escapeHtml(compactNumber(candidate.missionScore || 0))}</span>
          <span>source ${escapeHtml(grade)}</span>
          <span>${escapeHtml(readiness)}</span>
        </div>
        <h3>${escapeHtml(candidate.title || shortCandidateTitle(candidate))}</h3>
        <p><b>Why for AIOS:</b> ${escapeHtml(candidate.why || shortCandidateBody(candidate))}</p>
        <p><b>Next useful move:</b> ${escapeHtml(candidate.recommendedNextStep || 'Review with Steve before Scoper promotion.')}</p>
        <div class="ranking-rationale">
          <b>Why ranked here</b>
          <span>${escapeHtml(candidateRankReason(candidate))}</span>
        </div>
        ${renderCandidateScoreBreakdown(candidate)}
        ${renderCandidateEvidence(candidate)}
        ${renderCandidateSourceLinks(candidate)}
        <small>${escapeHtml(candidateSourceCopy(candidate))}${candidate.sourceVideoId ? ` · ${escapeHtml(candidate.sourceVideoId)}` : ''}</small>
      </div>
    </article>
  `
}

function renderRankingCreator(source = {}, index = 0) {
  const devLane = laneScore(source)
  const grade = text(source.devBuildGrade || devLane?.grade || source.overallGrade, 'ungraded').toUpperCase()
  const rankCopy = source.bestDirectorRank ? `best idea #${compactNumber(source.bestDirectorRank)}` : 'no top idea yet'
  const watchCopy = statusCopy(source.devWatchRecommendation || devLane?.watchRecommendation || source.watchRecommendation || '')
  return `
    <article class="ranking-creator">
      <div class="creator-grade ${grade.toLowerCase()}">${escapeHtml(grade)}</div>
      <div>
        <strong>${escapeHtml(source.creator || creatorDisplayName(state.snapshot || {}, source.creatorId) || `Creator ${index + 1}`)}</strong>
        <p>${escapeHtml(`${compactNumber(source.buildCandidates || 0)} ideas · ${compactNumber(source.watchedVideos || 0)} watched · ${rankCopy}`)}</p>
        <small>${escapeHtml(watchCopy || 'Priority pending')}</small>
      </div>
    </article>
  `
}

function renderRankingProcessList(items = []) {
  return `<ul>${list(items).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function renderGradeThresholds(thresholds = []) {
  return `
    <div class="ranking-grade-thresholds">
      ${list(thresholds).map(item => `
        <span><b>${escapeHtml(item.grade)}</b>${escapeHtml(item.rule)}</span>
      `).join('')}
    </div>
  `
}

function renderRankingProcessVisualizer(snapshot = {}) {
  const process = snapshot.rankingProcess || {}
  if (!process || process.status !== 'ready') return ''
  const creator = process.creatorRanking || {}
  const idea = process.ideaRanking || {}
  const proof = process.proofPosture || {}
  const counts = process.currentCounts || {}
  return `
    <section class="ranking-process">
      <div class="ranking-head">
        <span>RANKING PROCESS</span>
        <h2>${escapeHtml(process.title || 'How ranking works')}</h2>
        <small>${escapeHtml(process.plainEnglish || 'Ranking rules are exposed here for audit.')}</small>
      </div>
      <div class="ranking-process-flow">
        <article class="ranking-process-card">
          <span>CREATORS</span>
          <h3>${escapeHtml(creator.title || 'Creator ranking')}</h3>
          <p>${escapeHtml(creator.goal || '')}</p>
          <div class="ranking-process-columns">
            <div>
              <b>Inputs</b>
              ${renderRankingProcessList(creator.inputs)}
            </div>
            <div>
              <b>Score pieces</b>
              ${renderRankingProcessList(creator.scoring)}
            </div>
          </div>
          ${renderGradeThresholds(creator.gradeThresholds)}
          <div class="ranking-process-guard">
            <b>Guardrails</b>
            ${renderRankingProcessList(creator.guardrails)}
          </div>
        </article>
        <article class="ranking-process-card">
          <span>IDEAS</span>
          <h3>${escapeHtml(idea.title || 'Idea ranking')}</h3>
          <p>${escapeHtml(idea.goal || '')}</p>
          <div class="ranking-process-columns">
            <div>
              <b>Inputs</b>
              ${renderRankingProcessList(idea.inputs)}
            </div>
            <div>
              <b>Score pieces</b>
              ${renderRankingProcessList(idea.scoring)}
            </div>
          </div>
          <div class="ranking-process-guard">
            <b>Sorting</b>
            ${renderRankingProcessList(idea.sorting)}
          </div>
          <div class="ranking-process-guard">
            <b>Guardrails</b>
            ${renderRankingProcessList(idea.guardrails)}
          </div>
        </article>
      </div>
      <div class="ranking-audit-strip">
        <div>
          <b>Not allowed to judge by itself</b>
          <span>${list(process.notScoredAsJudgment).map(escapeHtml).join(' · ')}</span>
        </div>
        <div>
          <b>Dogfood proof</b>
          <span>${escapeHtml(proof.sourceTitleDogfood || '')} ${escapeHtml(proof.ambiguousReportDogfood || '')} ${escapeHtml(proof.sourceGraderDogfood || '')}</span>
        </div>
        <div>
          <b>Current readback</b>
          <span>${escapeHtml(compactNumber(counts.gradedCreators || 0))} creators graded · ${escapeHtml(compactNumber(counts.rankedIdeas || 0))} ideas ranked · read-only</span>
        </div>
      </div>
    </section>
  `
}

function renderRankings(snapshot = {}) {
  if (!els.rankingsSystem) return
  const director = snapshot.director || {}
  const rankedIdeas = list(director.rankedCandidates).length
    ? list(director.rankedCandidates)
    : uniqueBy([...list(director.recommendedBuildNow), ...list(director.strongNext)], candidate => candidate.title)
  const rankedIdeaTotal = Number(director.rankedCandidateCount || rankedIdeas.length)
  const topIdeas = rankedIdeas.slice(0, 12)
  const topCreators = rankedDevSources(snapshot)
  const mission = director.mission?.creatorSourceGradeInfluence?.scoring || 'Creator source grades influence Dev idea ranking; opportunity merge is the next ranking layer.'
  els.rankingsSystem.innerHTML = `
    <section class="rankings-grid">
      <article class="ranking-rule">
        <span>RANKING RULE</span>
        <h3>Ideas rank first</h3>
        <p>Top build ideas should come from evidence quality, implementation usefulness, mission fit, source trust, and creator/source strength. Duplicate ideas still need the canonical opportunity merge layer.</p>
        <small>${escapeHtml(mission)}</small>
      </article>
      <article class="ranking-rule">
        <span>CREATOR RULE</span>
        <h3>Trust is lane-specific</h3>
        <p>A creator can be S for Ops, A for Dev, and C for another lane. Weak YouTube does not delete the contributor profile; it only lowers follow-up priority for that surface.</p>
        <small>${escapeHtml(compactNumber(sourceGrades(snapshot).length))} creators graded from current evidence</small>
      </article>
    </section>

    ${renderRankingProcessVisualizer(snapshot)}

    ${renderVisionOpportunities(snapshot)}

    <section class="rankings-layout">
      <div class="ranking-column">
        <div class="ranking-head">
          <span>RAW IDEA SIGNALS</span>
          <h2>Top 12</h2>
          <small>${escapeHtml(compactNumber(rankedIdeaTotal))} raw ranked ideas · original signals preserved${director.rankedCandidatesArePreview ? ' · preview rows shown' : ''}</small>
        </div>
        <div class="ranking-list">
          ${topIdeas.map(renderRankingIdea).join('') || '<article class="loading-card">No ranked ideas returned yet.</article>'}
        </div>
      </div>
      <div class="ranking-column">
        <div class="ranking-head">
          <span>DEV CREATOR PRIORITY</span>
          <h2>All creators</h2>
          <small>${escapeHtml(compactNumber(topCreators.length))} ranked highest to lowest for Dev only.</small>
        </div>
        <div class="ranking-list compact">
          ${topCreators.map(renderRankingCreator).join('') || '<article class="loading-card">No creator grades returned yet.</article>'}
        </div>
      </div>
    </section>
  `
}

function renderExtractors(snapshot = {}) {
  const extractors = list(snapshot.activeExtractionLanes)

  els.extractorGrid.innerHTML = extractors.map(item => `
    <article class="extractor-card ${dotClass(item.status)}">
      <div class="card-icon"><span class="material-symbols-outlined">${escapeHtml(extractorIcon(item))}</span></div>
      <span class="label">${escapeHtml(item.label || item.status)}</span>
      <h3>${escapeHtml(extractorTitle(item))}</h3>
      <p>${escapeHtml(extractorSummary(item))}</p>
      <div class="extractor-meta">
        <span>${escapeHtml(item.latestRunLabel || 'Last run')}</span>
        <strong>${escapeHtml(shortDate(item.latestRunAt))}</strong>
      </div>
    </article>
  `).join('') || '<article class="loading-card">No extraction lanes returned from Foundation.</article>'
}

function renderEvidence(snapshot = {}) {
  if (!els.evidenceGrid) return
  const evidence = buildEvidenceCards(snapshot)
  els.evidenceGrid.innerHTML = evidence.map(item => `
    <article class="evidence-card ${escapeHtml(item.tone)}">
      <div class="evidence-num">${escapeHtml(compactNumber(item.value))}</div>
      <div class="evidence-label">${escapeHtml(item.label)}</div>
      <p>${escapeHtml(item.summary)}</p>
      <div class="evidence-meta">${escapeHtml(item.meta)}</div>
    </article>
  `).join('')
}

function renderSources() {
  const sources = state.sources
  els.grid.innerHTML = sources.map((source, index) => `
    <button class="source-card source-mini${source.id === state.selectedSourceId || (!state.selectedSourceId && index === 0) ? ' active' : ''}" type="button" data-source="${escapeHtml(source.id)}">
      <div class="source-mini-icon ${sourceTone(source)}">
        <span class="material-symbols-outlined">${escapeHtml(sourceIcon(source))}</span>
      </div>
      <div class="source-mini-copy">
        <h3>${escapeHtml(source.name)}</h3>
        <span class="source-mini-status ${sourceTone(source)}">${escapeHtml(sourceStatusLine(source))}</span>
      </div>
    </button>
  `).join('')
}

function renderAutopilotRows(source = {}) {
  const rows = list(source.autopilotRows)
  if (!rows.length) return ''
  return `
    <div class="target-list">
      ${rows.map(row => {
        const rowStatus = statusLabel(row.status)
        const needsAttention = !['Live', 'Foundation', 'Verified', 'Source-backed', 'Clear'].includes(rowStatus)
        return `
        <div class="target-row">
          <div class="target-row-head">
            <div>
              <strong>${escapeHtml(row.title)}</strong>
              <small>${escapeHtml(row.subtitle)}</small>
            </div>
            ${needsAttention ? `<span class="pill ${pillClass(row.status)}">${escapeHtml(rowStatus)}</span>` : ''}
          </div>
          <p>${escapeHtml(row.description)}${row.url ? ` · <a href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">${escapeHtml(row.url)}</a>` : ''}</p>
          ${list(row.steps).length ? `
            <div class="autopilot-step-list" aria-label="Autopilot SOP steps">
              ${list(row.steps).map(step => `
                <span class="autopilot-step ${pillClass(step.status)}" title="${escapeHtml(step.detail || step.status)}">
                  <strong>${escapeHtml(step.label)}</strong>
                  <small>${escapeHtml(step.status)}</small>
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `}).join('')}
    </div>
  `
}

function renderAutopilotBlockedRows(source = {}) {
  const rows = list(source.autopilotBlockedRows)
  if (!rows.length) return ''
  return `
    <div class="target-subhead">
      <span>Autopilot filtered candidates</span>
      <small>Blocked/filtered before spend</small>
    </div>
    <div class="target-list">
      ${rows.map(row => `
        <div class="target-row">
          <div class="target-row-head">
            <div>
              <strong>${escapeHtml(row.title)}</strong>
              <small>${escapeHtml(row.subtitle)}</small>
            </div>
            <span class="pill ${pillClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span>
          </div>
          <p>${escapeHtml(row.description || 'No sample rows available.')}</p>
        </div>
      `).join('')}
    </div>
  `
}

function renderTargets(sourceId) {
  const source = state.sources.find(item => item.id === sourceId) || state.sources[0]
  if (!source) {
    els.panel.innerHTML = '<div class="target-empty"><span>No source data</span><p>The Dev Data Pool API did not return source cards.</p></div>'
    return
  }
  state.selectedSourceId = source.id
  const targetCount = list(source.targets).length + list(source.autopilotRows).length + list(source.autopilotBlockedRows).length
  const sourceStatus = statusLabel(source.badge || source.label)
  const sourceNeedsAttention = !['Live', 'Foundation', 'Verified', 'Source-backed', 'Clear'].includes(sourceStatus)
  els.panel.innerHTML = `
    <div class="target-head">
      <div>
        <span class="eyebrow">Selected source · ${escapeHtml(compactNumber(targetCount))} ${targetCount === 1 ? 'target' : 'targets'}</span>
        <small class="route">${escapeHtml(source.sourceRoute || 'Route pending')}</small>
      </div>
      ${sourceNeedsAttention ? `<span class="source-status ${pillClass(source.badge || source.label)}">${escapeHtml(sourceStatus)}</span>` : ''}
    </div>
    ${renderAutopilotRows(source)}
    ${renderAutopilotBlockedRows(source)}
    <div class="target-list">
      ${list(source.targets).map(target => {
        const targetStatus = statusLabel(target[3])
        const targetNeedsAttention = !['Live', 'Foundation', 'Verified', 'Source-backed', 'Clear'].includes(targetStatus)
        return `
        <div class="target-row">
          <div class="target-row-head">
            <div>
              <strong>${escapeHtml(target[0])}</strong>
              <small>${escapeHtml(target[1])}</small>
            </div>
            ${targetNeedsAttention ? `<span class="pill ${pillClass(target[3])}">${escapeHtml(targetStatus)}</span>` : ''}
          </div>
          <p>${escapeHtml(target[2])}</p>
        </div>
      `}).join('') || '<div class="target-empty"><span>No targets</span><p>This source exists, but target details are not wired yet.</p></div>'}
    </div>
  `
}

function renderDirector(snapshot = {}) {
  const director = snapshot.director || {}
  const recommended = list(director.recommendedBuildNow)
  const strongNext = list(director.strongNext)
  const rankedCount = Number(director.rankedCandidateCount || list(director.rankedCandidates).length)
  const candidates = uniqueBy([...recommended, ...strongNext], candidate => candidate.title).slice(0, 6)
  const recommendedTitles = new Set(recommended.map(candidate => text(candidate.title)))
  if (els.directorHeadStats) {
    els.directorHeadStats.innerHTML = `
      <span><b>${escapeHtml(compactNumber(recommended.length))}</b> ready</span>
      <span><b>${escapeHtml(compactNumber(strongNext.length))}</b> next</span>
      <span><b>${escapeHtml(compactNumber(rankedCount))}</b> total</span>
    `
  }
  if (!candidates.length) {
    els.directorPanel.innerHTML = `
      <article class="director-empty">
        <span>Needs source</span>
        <h3>Director report not available</h3>
        <p>The Dev Intelligence Director should read Foundation reports and return proposal-only build candidates here.</p>
      </article>
    `
    return
  }
  const previewTitles = candidates.slice(0, 3).map(candidate => shortCandidateTitle(candidate)).join(' · ')
  els.directorPanel.innerHTML = `
    <details class="director-accordion">
      <summary>
        <span class="director-kicker">Director recommendations</span>
        <small>${escapeHtml(compactNumber(recommended.length))} ready ideas · ${escapeHtml(previewTitles)}</small>
      </summary>
      <div class="director-list">
        ${candidates.map(candidate => {
          const lane = recommendedTitles.has(text(candidate.title)) ? 'BUILD-NOW' : 'STRONG-NEXT'
          const laneCopy = lane === 'BUILD-NOW' ? 'Ready to build' : 'Next up'
          return `
          <article class="candidate-card ${lane === 'STRONG-NEXT' ? 'next' : ''}">
            <div class="candidate-rankline">#${escapeHtml(candidate.rank)} · ${escapeHtml(laneCopy)} · score ${escapeHtml(compactNumber(candidate.missionScore))}</div>
            <h3 title="${escapeHtml(candidate.title)}">${escapeHtml(shortCandidateTitle(candidate))}</h3>
            <p>${escapeHtml(shortCandidateBody(candidate))}</p>
            <div class="candidate-meta">
              <small title="${escapeHtml(candidate.sourceReportArtifactId || 'Needs source')}">${escapeHtml(candidateSourceCopy(candidate))}</small>
            </div>
          </article>
        `}).join('')}
      </div>
      ${rankedCount > candidates.length ? `<div class="director-more">Showing top ${escapeHtml(compactNumber(candidates.length))} of ${escapeHtml(compactNumber(rankedCount))} ideas.</div>` : ''}
    </details>
  `
}

function renderSnapshot(snapshot = {}) {
  state.snapshot = snapshot
  state.sources = buildLiveSources(snapshot)
  state.selectedSourceId = state.selectedSourceId || state.sources[0]?.id || null
  renderExtractors(snapshot)
  renderGodModeParity(snapshot)
  renderEvidence(snapshot)
  renderApprovalReview(snapshot)
  renderSourceLeaderboard(snapshot)
  renderYoutubeSourceIntelligence(snapshot)
  renderRankings(snapshot)
  renderSources()
  renderTargets(state.selectedSourceId)
  renderDirector(snapshot)
}

function renderError(error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  const html = `<article class="loading-card error">Dev Data Pool failed to load: ${escapeHtml(message)}</article>`
  els.extractorGrid.innerHTML = html
  if (els.godModeParity) els.godModeParity.innerHTML = html
  if (els.approvalReview) els.approvalReview.innerHTML = html
  if (els.sourceLeaderboard) els.sourceLeaderboard.innerHTML = html
  if (els.youtubeSystem) els.youtubeSystem.innerHTML = html
  if (els.rankingsSystem) els.rankingsSystem.innerHTML = html
  els.grid.innerHTML = html
  els.panel.innerHTML = html
  els.directorPanel.innerHTML = html
}

async function loadDevDataPool() {
  if (state.dataPoolLoadInFlight) return
  state.dataPoolLoadInFlight = true
  try {
    const response = await fetch(API_ROUTE, { credentials: 'same-origin', cache: 'no-store' })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    const snapshot = await response.json()
    renderSnapshot(snapshot)
    state.lastDataPoolRefreshAt = new Date().toISOString()
  } catch (error) {
    renderError(error)
  } finally {
    state.dataPoolLoadInFlight = false
  }
}

function refreshDevDataPoolFromBackend() {
  if (document.visibilityState === 'hidden') return
  loadDevDataPool()
}

function updateTime() {
  const current = document.getElementById('launcher-clock') || document.getElementById('current-time')
  if (!current) return
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})
  current.innerHTML = `${parts.day} ${parts.month.toLowerCase()} ${parts.year} <b>· ${parts.hour}:${parts.minute} ${parts.dayPeriod} EDT</b>`
}

function initialsFromUser(user = {}) {
  const raw = text(user.name || user.displayName || user.email || 'Steve Zahnd')
  const emailName = raw.includes('@') ? raw.split('@')[0] : raw
  const parts = emailName.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'SZ'
}

function displayNameFromUser(user = {}) {
  const raw = text(user.name || user.displayName || user.fullName || user.email || 'Steve Zahnd')
  if (!raw.includes('@')) return raw.toUpperCase()
  return raw.split('@')[0].replace(/[._-]+/g, ' ').toUpperCase()
}

function roleFromUser(user = {}) {
  const role = text(user.role).toLowerCase()
  if (role === 'owner') return 'EXEC LEADERSHIP · T1'
  if (role === 'sales') return 'SALES · ACCESS'
  if (role === 'ops') return 'OPS · ACCESS'
  return text(user.roleLabel || user.title || 'ACCESS').toUpperCase()
}

function setAccountMenuOpen(open) {
  const button = document.getElementById('launcher-user-button')
  const menu = document.getElementById('launcher-account-menu')
  if (!button || !menu) return
  button.setAttribute('aria-expanded', open ? 'true' : 'false')
  menu.hidden = !open
}

function toggleAccountMenu() {
  const button = document.getElementById('launcher-user-button')
  if (!button) return
  setAccountMenuOpen(button.getAttribute('aria-expanded') !== 'true')
}

function handleAccountMenuDocumentClick(event) {
  const wrap = document.getElementById('launcher-user')
  if (!wrap || wrap.contains(event.target)) return
  setAccountMenuOpen(false)
}

function handleAccountMenuKeydown(event) {
  if (event.key === 'Escape') setAccountMenuOpen(false)
}

async function logoutDevUser() {
  const button = document.getElementById('launcher-logout')
  if (button) {
    button.disabled = true
    button.textContent = 'Logging out...'
  }

  try {
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' })
    window.location.assign('/login?next=/dev')
  } catch (error) {
    if (button) {
      button.disabled = false
      button.textContent = 'Log out'
    }
  }
}

async function loadDevSessionChrome() {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' })
    if (!response.ok) throw new Error('Session fetch failed.')
    const session = await response.json()
    const user = session?.user || {}
    const avatar = document.getElementById('launcher-avatar')
    const name = document.getElementById('launcher-user-name')
    const role = document.getElementById('launcher-user-role')
    if (avatar) avatar.textContent = initialsFromUser(user)
    if (name) name.textContent = displayNameFromUser(user)
    if (role) role.textContent = roleFromUser(user)
  } catch (error) {
    const name = document.getElementById('launcher-user-name')
    const role = document.getElementById('launcher-user-role')
    if (name) name.textContent = 'SIGNED OUT'
    if (role) role.textContent = 'LOGIN REQUIRED'
  }
}

function normalizeViewName(value = '') {
  const normalized = text(value).replace(/^#/, '')
  if (normalized === 'youtube' || normalized === 'youtube-intelligence') return 'youtube'
  if (normalized === 'rankings' || normalized === 'idea-rankings' || normalized === 'build-rankings') return 'rankings'
  return 'pool'
}

function setDevView(viewName = 'pool', { updateHash = true } = {}) {
  const activeView = normalizeViewName(viewName)
  document.querySelectorAll('.view').forEach(view => {
    const isActive = view.id === `view-${activeView}`
    view.classList.toggle('active', isActive)
    view.hidden = !isActive
  })
  document.querySelectorAll('.sb-link').forEach(button => {
    button.classList.toggle('active', button.dataset.view === activeView)
  })
  if (updateHash) {
    const hash = activeView === 'youtube' ? 'youtube-intelligence' : activeView === 'rankings' ? 'rankings' : 'data-pool'
    if (window.location.hash !== `#${hash}`) window.location.hash = hash
  }
}

document.querySelectorAll('.sb-link').forEach(button => {
  button.addEventListener('click', () => {
    setDevView(button.dataset.view || 'pool')
  })
})

window.addEventListener('hashchange', () => {
  setDevView(window.location.hash, { updateHash: false })
})

els.grid.addEventListener('click', event => {
  const card = event.target.closest('.source-card')
  if (!card) return
  document.querySelectorAll('.source-card').forEach(item => item.classList.remove('active'))
  card.classList.add('active')
  renderTargets(card.dataset.source)
})

document.addEventListener('click', event => {
  const button = event.target.closest('[data-priority-lens]')
  if (!button) return
  state.selectedPriorityLensId = button.dataset.priorityLens || 'current-sprint'
  if (state.snapshot) renderRankings(state.snapshot)
})

updateTime()
setDevView(window.location.hash, { updateHash: false })
setInterval(updateTime, 60000)
setInterval(refreshDevDataPoolFromBackend, DEV_DATA_POOL_REFRESH_INTERVAL_MS)
window.addEventListener('focus', refreshDevDataPoolFromBackend)
loadDevSessionChrome()
document.addEventListener('click', handleAccountMenuDocumentClick)
document.addEventListener('keydown', handleAccountMenuKeydown)
document.getElementById('launcher-user-button')?.addEventListener('click', toggleAccountMenu)
document.getElementById('launcher-logout')?.addEventListener('click', logoutDevUser)
loadDevDataPool()
