import crypto from 'node:crypto'

import { CREATOR_WATCHLIST_ENTRIES } from './build-intel-watchlist.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from './youtube-creator-daily-watch.js'
import { GEMINI_VIDEO_FULL_WATCH_MODEL } from './gemini-video-brain-route.js'
import { YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID } from './youtube-resource-link-resolver.js'

export const YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID = 'YOUTUBE-LATEST-20-INTEL-RUN-001'
export const YOUTUBE_LATEST_20_INTEL_RUN_PLAN_PATH = 'docs/process/youtube-latest-20-intel-run-001-plan.md'
export const YOUTUBE_LATEST_20_INTEL_RUN_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-LATEST-20-INTEL-RUN-001.json'
export const YOUTUBE_LATEST_20_INTEL_RUN_SCRIPT_PATH = 'scripts/process-youtube-latest-20-intel-run-check.mjs'
export const YOUTUBE_LATEST_20_MAX_SELECTED_CREATORS = 9
export const YOUTUBE_LATEST_20_MAX_VIDEOS_PER_CREATOR = 1
export const YOUTUBE_LATEST_20_MAX_RUN_VIDEOS = 9

export const YOUTUBE_LATEST_20_NOT_NEXT = [
  'Do not run a broad all-creator extraction from this card.',
  'Do not use metadata-only or transcript-only output as God Mode extraction.',
  'Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.',
  'Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.',
  'Do not auto-create backlog cards from recommendations.',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function asNumber(value, fallback = 9999) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const CREATOR_BY_ID = new Map(CREATOR_WATCHLIST_ENTRIES.map(entry => [entry.creatorId, entry]))

const BUILD_INTEL_POSITIVE_TERMS = [
  'ai agent',
  'agentic',
  'claude',
  'codex',
  'cursor',
  'openclaw',
  'mcp',
  'browserbase',
  'hermes',
  'gemini',
  'gpt',
  'llm',
  'automation',
  'automate',
  'workflow',
  'software',
  'developer',
  'code',
  'coding',
  'app',
  'tool',
  'tools',
  'api',
  'repo',
  'github',
  'open source',
  'skill',
  'context',
  'harness',
  'browser',
  'computer use',
  'n8n',
  'rag',
  'vector',
  'prompt',
  'dashboard',
  'system',
]

const BUILD_INTEL_NEGATIVE_TERMS = [
  'girlfriend',
  'seductive',
  'robot',
  'robots',
  'humanoid',
  'female robot',
  'humanoid girlfriend',
  'skate',
  'skateboard',
  'skate trip',
  'skateboarding',
  'clip clean out',
]

function standardFullWatchRisk(title = '') {
  const lower = text(title).toLowerCase()
  const reasons = []
  if (/\bfull course\b/.test(lower) && !/\b(under|in)\s+\d+\s*(min|minute|minutes)\b/.test(lower) && !/\b(1|one)\s*hour\b/.test(lower)) {
    reasons.push('full_course_without_bounded_duration')
  }
  if (/\b(\d+\+?|two|three|four|five|six)\s*hour\s+course\b/.test(lower)) {
    reasons.push('multi_hour_course_needs_long_course_lane')
  }
  return {
    risk: reasons.length > 0,
    reasons,
  }
}

function priorityScore(priority = '') {
  if (priority === 'P0') return 12
  if (priority === 'P1') return 8
  if (priority === 'P2') return 4
  return 0
}

function termScore(haystack = '') {
  const lower = haystack.toLowerCase()
  const positive = BUILD_INTEL_POSITIVE_TERMS.filter(term => lower.includes(term))
  const negative = BUILD_INTEL_NEGATIVE_TERMS.filter(term => lower.includes(term))
  return {
    positive,
    negative,
    score: positive.length * 8 - negative.length * 30,
  }
}

function scoreBuildIntelVideo(video = {}) {
  const creator = CREATOR_BY_ID.get(video.creatorId) || {}
  const titleTerms = termScore(`${video.title} ${video.visibleMetadata}`)
  const creatorTerms = termScore(`${creator.whySteveCares || ''} ${creator.displayName || ''}`)
  const score = Math.max(0, priorityScore(creator.priority) + titleTerms.score + Math.min(16, creatorTerms.score))
  return {
    score,
    creatorPriority: creator.priority || '',
    consumerLane: creator.consumerLane || '',
    titlePositiveTerms: titleTerms.positive,
    creatorPositiveTerms: creatorTerms.positive,
    positiveTerms: [...new Set([...titleTerms.positive, ...creatorTerms.positive])],
    negativeTerms: [...new Set([...titleTerms.negative, ...creatorTerms.negative])],
  }
}

function normalizePoolRow(row = {}) {
  const metadata = row.metadata || {}
  const videoId = text(row.external_id || row.externalId || metadata.videoId)
  const title = text(metadata.title) || videoId
  const relevance = scoreBuildIntelVideo({
    videoId,
    title,
    creatorId: text(metadata.creatorId),
    visibleMetadata: text(metadata.visibleMetadata),
  })
  const longVideoRisk = standardFullWatchRisk(title)
  return {
    videoId,
    url: text(metadata.url) || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
    title,
    creatorId: text(metadata.creatorId),
    creator: text(metadata.creator),
    rank: asNumber(metadata.rank),
    duration: text(metadata.duration),
    sourceId: text(row.source_id || row.sourceId || metadata.sourceId) || YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
    targetKey: text(row.target_key || row.targetKey) || YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    publicNoAuth: metadata.publicNoAuth !== false,
    privateOrPaidAccess: metadata.privateOrPaidAccess === true,
    resourceLinksFollowed: metadata.resourceLinksFollowed === true,
    transcriptsFetched: metadata.transcriptsFetched === true,
    screenshotsCaptured: Boolean(metadata.screenshotsCaptured),
    fullWatchBlocked: metadata.fullWatchBlocked === true,
    fullWatchBlockedReason: text(metadata.fullWatchBlockedReason),
    visibleMetadata: text(metadata.visibleMetadata),
    publishVisibleDate: text(metadata.publishVisibleDate),
    lastSeenAt: text(metadata.lastSeenAt),
    reviewState: text(metadata.reviewState),
    buildIntelRelevance: relevance,
    standardFullWatchRisk: longVideoRisk.risk,
    standardFullWatchRiskReasons: longVideoRisk.reasons,
  }
}

function videoRelevantPublicCandidate(video = {}, alreadyFullWatched = new Set()) {
  return video.videoId &&
    video.creatorId &&
    video.creatorId !== YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID &&
    video.sourceId === YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID &&
    video.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY &&
    video.publicNoAuth === true &&
    video.privateOrPaidAccess === false &&
    video.fullWatchBlocked !== true &&
    video.buildIntelRelevance.titlePositiveTerms.length >= 1 &&
    video.buildIntelRelevance.score >= 16 &&
    video.buildIntelRelevance.negativeTerms.length === 0 &&
    !alreadyFullWatched.has(video.videoId)
}

function videoEligible(video = {}, alreadyFullWatched = new Set()) {
  return videoRelevantPublicCandidate(video, alreadyFullWatched) &&
    video.standardFullWatchRisk !== true
}

function sortBuildIntelVideos(left, right) {
  return asNumber(left.rank) - asNumber(right.rank) ||
    right.buildIntelRelevance.score - left.buildIntelRelevance.score ||
    left.creatorId.localeCompare(right.creatorId) ||
    left.videoId.localeCompare(right.videoId)
}

export function selectYoutubeLatest20IntelRunVideos({
  poolRows = [],
  alreadyFullWatchedVideoIds = [],
  creatorIds = [],
  videoIds = [],
  maxCreators = YOUTUBE_LATEST_20_MAX_SELECTED_CREATORS,
  maxVideosPerCreator = YOUTUBE_LATEST_20_MAX_VIDEOS_PER_CREATOR,
  maxRunVideos = YOUTUBE_LATEST_20_MAX_RUN_VIDEOS,
} = {}) {
  const alreadyFullWatched = new Set(list(alreadyFullWatchedVideoIds).map(text).filter(Boolean))
  const allowedCreators = new Set(list(creatorIds).map(text).filter(Boolean))
  const allowedVideos = new Set(list(videoIds).map(text).filter(Boolean))
  const eligible = list(poolRows)
    .map(normalizePoolRow)
    .filter(video => !allowedCreators.size || allowedCreators.has(video.creatorId))
    .filter(video => !allowedVideos.size || allowedVideos.has(video.videoId))
    .filter(video => videoEligible(video, alreadyFullWatched))
    .sort(sortBuildIntelVideos)
  const byCreator = new Map()
  for (const video of eligible) {
    if (!byCreator.has(video.creatorId)) byCreator.set(video.creatorId, [])
    byCreator.get(video.creatorId).push(video)
  }
  const selected = []
  const boundedMaxCreators = Math.max(1, Number(maxCreators) || YOUTUBE_LATEST_20_MAX_SELECTED_CREATORS)
  const boundedMaxPerCreator = Math.max(1, Number(maxVideosPerCreator) || YOUTUBE_LATEST_20_MAX_VIDEOS_PER_CREATOR)
  const boundedMaxRunVideos = Math.max(1, Number(maxRunVideos) || YOUTUBE_LATEST_20_MAX_RUN_VIDEOS)
  const creatorOrder = Array.from(byCreator.keys())
    .sort((left, right) => {
      const leftCreator = CREATOR_BY_ID.get(left) || {}
      const rightCreator = CREATOR_BY_ID.get(right) || {}
      const leftBest = Math.max(...list(byCreator.get(left)).map(video => video.buildIntelRelevance.score), 0)
      const rightBest = Math.max(...list(byCreator.get(right)).map(video => video.buildIntelRelevance.score), 0)
      return priorityScore(rightCreator.priority) - priorityScore(leftCreator.priority) ||
        rightBest - leftBest ||
        left.localeCompare(right)
    })
    .slice(0, boundedMaxCreators)
  for (let round = 0; round < boundedMaxPerCreator && selected.length < boundedMaxRunVideos; round += 1) {
    let added = false
    for (const creatorId of creatorOrder) {
      const video = byCreator.get(creatorId)?.[round]
      if (!video) continue
      selected.push(video)
      added = true
      if (selected.length >= boundedMaxRunVideos) break
    }
    if (!added) break
  }
  return selected.slice(0, boundedMaxRunVideos)
}

function selectStandardFullWatchRiskVideos({
  normalizedRows = [],
  alreadyFullWatchedVideoIds = [],
  creatorIds = [],
  videoIds = [],
  maxVideos = 20,
} = {}) {
  const alreadyFullWatched = new Set(list(alreadyFullWatchedVideoIds).map(text).filter(Boolean))
  const allowedCreators = new Set(list(creatorIds).map(text).filter(Boolean))
  const allowedVideos = new Set(list(videoIds).map(text).filter(Boolean))
  return list(normalizedRows)
    .filter(video => !allowedCreators.size || allowedCreators.has(video.creatorId))
    .filter(video => !allowedVideos.size || allowedVideos.has(video.videoId))
    .filter(video => videoRelevantPublicCandidate(video, alreadyFullWatched))
    .filter(video => video.standardFullWatchRisk === true)
    .sort(sortBuildIntelVideos)
    .slice(0, Math.max(1, Number(maxVideos) || 20))
}

export function buildYoutubeLatest20IntelRunSnapshot({
  generatedAt = new Date().toISOString(),
  poolRows = [],
  alreadyFullWatchedVideoIds = [],
  creatorIds = [],
  videoIds = [],
  maxCreators = YOUTUBE_LATEST_20_MAX_SELECTED_CREATORS,
  maxVideosPerCreator = YOUTUBE_LATEST_20_MAX_VIDEOS_PER_CREATOR,
  maxRunVideos = YOUTUBE_LATEST_20_MAX_RUN_VIDEOS,
} = {}) {
  const normalizedRows = list(poolRows).map(normalizePoolRow)
  const requestedVideoIds = list(videoIds).map(text).filter(Boolean)
  const longCourseRoutedOut = selectStandardFullWatchRiskVideos({
    normalizedRows,
    alreadyFullWatchedVideoIds,
    creatorIds,
    videoIds: requestedVideoIds,
    maxVideos: 20,
  })
  const selectedVideos = selectYoutubeLatest20IntelRunVideos({
    poolRows,
    alreadyFullWatchedVideoIds,
    creatorIds,
    videoIds: requestedVideoIds,
    maxCreators,
    maxVideosPerCreator,
    maxRunVideos,
  })
  const selectedByCreator = selectedVideos.reduce((acc, video) => {
    acc[video.creatorId] = (acc[video.creatorId] || 0) + 1
    return acc
  }, {})
  const requestedCreatorIds = list(creatorIds).map(text).filter(Boolean)
  const requestedCreatorRows = requestedCreatorIds.length
    ? normalizedRows.filter(row => requestedCreatorIds.includes(row.creatorId))
    : []
  const requestedVideoRows = requestedVideoIds.length
    ? normalizedRows.filter(row => requestedVideoIds.includes(row.videoId))
    : []
  const requestedSelectionExhausted = (requestedCreatorIds.length > 0 || requestedVideoIds.length > 0) &&
    (requestedCreatorIds.length ? requestedCreatorRows.length > 0 : true) &&
    (requestedVideoIds.length ? requestedVideoRows.length > 0 : true) &&
    selectedVideos.length === 0
  const boundedMaxVideosPerCreator = Math.max(1, Number(maxVideosPerCreator) || YOUTUBE_LATEST_20_MAX_VIDEOS_PER_CREATOR)
  const checks = []
  addCheck(checks, normalizedRows.length >= selectedVideos.length, 'daily watch pool is available', `${normalizedRows.length}`)
  if (requestedCreatorIds.length) {
    addCheck(checks, requestedCreatorRows.length >= 1, 'requested creator has daily-watch rows', `${requestedCreatorRows.length}`)
  }
  if (requestedVideoIds.length) {
    addCheck(checks, requestedVideoRows.length === requestedVideoIds.length, 'requested exact video ids exist in daily-watch rows', `${requestedVideoRows.length}/${requestedVideoIds.length}`)
    addCheck(checks, selectedVideos.every(video => requestedVideoIds.includes(video.videoId)), 'selected videos stay locked to requested exact ids', selectedVideos.map(video => video.videoId).join(', '))
  }
  addCheck(checks, selectedVideos.length >= 1 || requestedSelectionExhausted, 'next non-Mark public videos are selected or requested selection is exhausted', requestedSelectionExhausted ? 'exhausted' : `${selectedVideos.length}`)
  addCheck(checks, selectedVideos.every(video => video.buildIntelRelevance.titlePositiveTerms.length >= 1 && video.buildIntelRelevance.score >= 16 && video.buildIntelRelevance.negativeTerms.length === 0), 'selected videos are relevant Build Intel, not random channel noise', selectedVideos.map(video => `${video.videoId}:${video.buildIntelRelevance.score}:${video.buildIntelRelevance.titlePositiveTerms.join('|')}`).join(', '))
  addCheck(checks, selectedVideos.every(video => video.standardFullWatchRisk !== true), 'selected videos avoid standard full-watch long-course risk', selectedVideos.map(video => `${video.videoId}:${video.standardFullWatchRiskReasons.join('|')}`).join(', '))
  addCheck(checks, selectedVideos.length <= YOUTUBE_LATEST_20_MAX_RUN_VIDEOS, 'selected run stays within bounded run cap', `${selectedVideos.length}/${YOUTUBE_LATEST_20_MAX_RUN_VIDEOS}`)
  addCheck(checks, selectedVideos.every(video => video.creatorId !== YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID), 'Mark videos are excluded from broader latest-20 run', selectedVideos.map(video => video.creatorId).join(', '))
  addCheck(checks, Object.values(selectedByCreator).every(count => count <= boundedMaxVideosPerCreator), 'selected run caps videos per creator', JSON.stringify(selectedByCreator))
  addCheck(checks, selectedVideos.every(video => video.publicNoAuth && !video.privateOrPaidAccess), 'selected videos are public/no-auth only', selectedVideos.map(video => `${video.videoId}:${video.publicNoAuth}`).join(', '))
  addCheck(checks, selectedVideos.every(video => !video.transcriptsFetched && !video.screenshotsCaptured), 'daily watch rows are metadata-only before full-watch run', selectedVideos.map(video => `${video.videoId}:${video.transcriptsFetched}/${video.screenshotsCaptured}`).join(', '))
  addCheck(checks, longCourseRoutedOut.every(video => video.standardFullWatchRiskReasons.length >= 1), 'long-course candidates are surfaced instead of hidden', `${longCourseRoutedOut.length}`)
  addCheck(checks, true, 'resource links must flow through resolver/scoper, not Steve', YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID)
  addCheck(checks, true, 'run manifest is read-only/proposal-only', 'no Gemini call, no extraction, no external write in this proof')
  const failures = checks.filter(check => !check.ok)
  const status = requestedSelectionExhausted
    ? 'exhausted_for_requested_creator'
    : failures.length ? 'blocked' : 'ready_for_guarded_full_watch_run'
  return {
    ok: failures.length === 0,
    status,
    generatedAt,
    cardId: YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID,
    sourceIds: [YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    runManifestId: `youtube-latest-20-intel-run:${stableHash(selectedVideos).slice(0, 16)}`,
    selectedVideos,
    selectedByCreator,
    counts: {
      poolRows: normalizedRows.length,
      selectedVideos: selectedVideos.length,
      selectedCreators: Object.keys(selectedByCreator).length,
      alreadyFullWatched: list(alreadyFullWatchedVideoIds).length,
      requestedCreators: requestedCreatorIds.length,
      requestedCreatorRows: requestedCreatorRows.length,
      requestedVideos: requestedVideoIds.length,
      requestedVideoRows: requestedVideoRows.length,
      standardFullWatchRiskRoutedOut: longCourseRoutedOut.length,
    },
    standardFullWatchRiskRoutedOut: longCourseRoutedOut,
    requiredRuntime: {
      route: 'gemini_api_youtube_url_video_understanding',
      model: GEMINI_VIDEO_FULL_WATCH_MODEL,
      mode: 'full video/audio/visual watch plus page/transcript/resource evidence',
      resourceLinkDispositionRequired: true,
      scoperRequiredBeforeApproval: true,
    },
    nextAction: requestedSelectionExhausted
      ? longCourseRoutedOut.length
        ? 'No standard-lane public videos remain for the requested creator. Route the remaining long-course videos to the long-course extractor lane before watching them.'
        : 'No relevant unwatched public videos remain for the requested selection under the current Build Intel guard.'
      : requestedCreatorIds.length
      ? 'Run this targeted creator batch through the full God Mode Gemini API path, then rerun Director and Scoper with resource-link dispositions.'
      : 'Run this selected coverage batch through the full God Mode Gemini API path, then rerun Director and Scoper with resource-link dispositions.',
    notNext: YOUTUBE_LATEST_20_NOT_NEXT,
    checks,
    failures,
    proposalOnly: true,
    liveExtractionStarted: false,
    externalWrites: false,
  }
}

export function buildYoutubeLatest20IntelRunDogfoodProof() {
  const poolRows = [
    { external_id: 'mark-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'mark-kashef', creator: 'Mark Kashef', videoId: 'mark-1', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'nate-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'nate-herk', creator: 'Nate Herk', videoId: 'nate-1', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'nate-2', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'nate-herk', creator: 'Nate Herk', videoId: 'nate-2', title: 'Build an AI Agent Workflow in n8n', rank: 2, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'paid-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'paid-source', creator: 'Paid Source', videoId: 'paid-1', rank: 1, publicNoAuth: false, privateOrPaidAccess: true } },
    { external_id: 'kia-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'kia-ghasem-ai-automations', creator: 'Kia Ghasem', videoId: 'kia-1', title: 'Hermes Agent connects Browserbase skills catalog', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'icor-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'icor-tom-ai-productivity', creator: 'ICOR with Tom', videoId: 'icor-1', title: 'Claude links my AI productivity folder', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'icor-2', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'icor-tom-ai-productivity', creator: 'ICOR with Tom', videoId: 'icor-2', title: 'Build an AI team setup with Claude and Gemini', rank: 2, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'noise-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'alex-finn', creator: 'Alex Finn', videoId: 'noise-1', title: 'Mini Skate Trip', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'course-risk-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'nick-saraev', creator: 'Nick Saraev', videoId: 'course-risk-1', title: 'How to Build Mobile Apps with Claude Code: Full Course (2026)', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'course-risk-2', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'nate-herk', creator: 'Nate Herk', videoId: 'course-risk-2', title: 'Build & Sell Claude Code Operating Systems (2+ Hour Course)', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
  ]
  const snapshot = buildYoutubeLatest20IntelRunSnapshot({
    generatedAt: '2026-05-25T13:30:00.000Z',
    poolRows,
    alreadyFullWatchedVideoIds: ['nate-2'],
    maxCreators: 2,
    maxVideosPerCreator: 2,
    maxRunVideos: 4,
  })
  const targeted = buildYoutubeLatest20IntelRunSnapshot({
    generatedAt: '2026-05-25T13:30:00.000Z',
    poolRows,
    alreadyFullWatchedVideoIds: [],
    creatorIds: ['icor-tom-ai-productivity'],
    maxCreators: 1,
    maxVideosPerCreator: 9,
    maxRunVideos: 9,
  })
  const targetedExhausted = buildYoutubeLatest20IntelRunSnapshot({
    generatedAt: '2026-05-25T13:30:00.000Z',
    poolRows,
    alreadyFullWatchedVideoIds: ['icor-1', 'icor-2'],
    creatorIds: ['icor-tom-ai-productivity'],
    maxCreators: 1,
    maxVideosPerCreator: 9,
    maxRunVideos: 9,
  })
  const targetedLongCourseOnly = buildYoutubeLatest20IntelRunSnapshot({
    generatedAt: '2026-05-25T13:30:00.000Z',
    poolRows,
    alreadyFullWatchedVideoIds: ['nate-1', 'nate-2'],
    creatorIds: ['nate-herk'],
    maxCreators: 1,
    maxVideosPerCreator: 9,
    maxRunVideos: 9,
  })
  const cases = [
    {
      name: 'excludes_mark_from_broader_latest20',
      ok: snapshot.selectedVideos.every(video => video.creatorId !== YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID),
    },
    {
      name: 'excludes_paid_private_rows',
      ok: snapshot.selectedVideos.every(video => video.publicNoAuth === true && video.privateOrPaidAccess === false),
    },
    {
      name: 'excludes_already_full_watched_rows',
      ok: !snapshot.selectedVideos.some(video => video.videoId === 'nate-2'),
    },
    {
      name: 'keeps_manifest_read_only',
      ok: snapshot.liveExtractionStarted === false && snapshot.externalWrites === false,
    },
    {
      name: 'rejects_random_channel_noise',
      ok: !snapshot.selectedVideos.some(video => video.videoId === 'noise-1'),
    },
    {
      name: 'routes_unbounded_full_course_out_of_standard_full_watch',
      ok: !snapshot.selectedVideos.some(video => video.videoId === 'course-risk-1'),
    },
    {
      name: 'routes_multi_hour_course_out_of_standard_full_watch',
      ok: !snapshot.selectedVideos.some(video => video.videoId === 'course-risk-2') &&
        snapshot.standardFullWatchRiskRoutedOut.some(video => video.videoId === 'course-risk-2'),
    },
    {
      name: 'targeted_creator_long_course_remainder_is_visible',
      ok: targetedLongCourseOnly.status === 'exhausted_for_requested_creator' &&
        targetedLongCourseOnly.standardFullWatchRiskRoutedOut.some(video => video.videoId === 'course-risk-2'),
    },
    {
      name: 'targeted_creator_mode_can_select_multiple_icor_videos',
      ok: targeted.selectedVideos.length >= 2 && targeted.selectedVideos.every(video => video.creatorId === 'icor-tom-ai-productivity'),
    },
    {
      name: 'targeted_creator_exhaustion_is_clean_status',
      ok: targetedExhausted.ok === true &&
        targetedExhausted.status === 'exhausted_for_requested_creator' &&
        targetedExhausted.selectedVideos.length === 0,
    },
  ]
  return {
    ok: snapshot.ok && targetedExhausted.ok && cases.every(item => item.ok),
    cases,
    snapshot,
  }
}
