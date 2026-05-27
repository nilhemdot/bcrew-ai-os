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
  'language model',
  'language modeling',
  'neural network',
  'neural networks',
  'backprop',
  'backpropagation',
  'micrograd',
  'makemore',
  'tokenizer',
  'tokenization',
  'transformer',
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
  'memory',
  'retrieval',
  'knowledge management',
  'knowledge-management',
  'personal knowledge management',
  'pkm',
  'second brain',
  'knowledge base',
  'note taking',
  'note-taking',
  'zettelkasten',
  'linked thinking',
  'linked-thinking',
  'obsidian',
  'vault',
  'notes',
  'graph',
  'notebooklm',
  'notebook lm',
  'capture',
  'organize',
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
  'skating',
  'skateboard',
  'skate trip',
  'skateboarding',
  'bmx',
  'face plant',
  'faceplant',
  'stair set',
  'kickflip',
  'tre out',
  'tyre',
  'clip clean out',
  'stable diffusion dreams',
  'dreams of blueberry spaghetti',
]

function parseDurationSeconds(value = '') {
  const input = text(value).toLowerCase()
  const colonMatch = input.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/)
  if (colonMatch) {
    const first = asNumber(colonMatch[1])
    const second = asNumber(colonMatch[2])
    const third = colonMatch[3] == null ? null : asNumber(colonMatch[3])
    return third == null
      ? first * 60 + second
      : first * 3600 + second * 60 + third
  }

  const hourMatch = input.match(/\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/)
  const minuteMatch = input.match(/\b(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/)
  const hours = hourMatch ? Number(hourMatch[1]) : 0
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
  return Math.round(hours * 3600 + minutes * 60)
}

function standardFullWatchRisk(input = '') {
  const title = typeof input === 'object' && input !== null ? text(input.title) : text(input)
  const duration = typeof input === 'object' && input !== null ? text(input.duration || input.durationText) : ''
  const visibleMetadata = typeof input === 'object' && input !== null ? text(input.visibleMetadata) : ''
  const lower = `${title} ${duration} ${visibleMetadata}`.toLowerCase()
  const durationSeconds = Math.max(parseDurationSeconds(duration), parseDurationSeconds(visibleMetadata))
  const reasons = []
  if (/\bfull course\b/.test(lower) && !/\b(under|in)\s+\d+\s*(min|minute|minutes)\b/.test(lower) && !/\b(1|one)\s*hour\b/.test(lower)) {
    reasons.push('full_course_without_bounded_duration')
  }
  if (/\b(\d+\+?|two|three|four|five|six)\s*hour\s+course\b/.test(lower)) {
    reasons.push('multi_hour_course_needs_long_course_lane')
  }
  if (durationSeconds >= 7200) {
    reasons.push('multi_hour_duration_needs_long_course_lane')
  } else if (
    durationSeconds >= 3600 &&
    /\b(course|training|tutorial|workshop|masterclass|live|sales call|build with me)\b/.test(lower)
  ) {
    reasons.push('long_training_duration_needs_long_course_lane')
  }
  if (
    durationSeconds >= 5400 &&
    /\b(let'?s build|building|from scratch|spelled out|code|coding|tutorial)\b/.test(lower)
  ) {
    reasons.push('long_code_tutorial_needs_long_course_lane')
  }
  return {
    risk: reasons.length > 0,
    reasons: [...new Set(reasons)],
  }
}

function accessGateVisible(input = '') {
  return /\b(members?\s+only|member-only|members-only|private\s+video|join\s+this\s+channel|sign\s+in\s+to\s+confirm)\b/i.test(text(input))
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

export function scoreBuildIntelVideo(video = {}) {
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
  const visibleMetadata = text(metadata.visibleMetadata)
  const accessGated = accessGateVisible(`${title} ${visibleMetadata}`)
  const relevance = scoreBuildIntelVideo({
    videoId,
    title,
    creatorId: text(metadata.creatorId),
    visibleMetadata,
  })
  const longVideoRisk = standardFullWatchRisk({
    title,
    duration: metadata.duration,
    visibleMetadata: metadata.visibleMetadata,
  })
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
    publicNoAuth: metadata.publicNoAuth !== false && !accessGated,
    privateOrPaidAccess: metadata.privateOrPaidAccess === true || accessGated,
    resourceLinksFollowed: metadata.resourceLinksFollowed === true,
    transcriptsFetched: metadata.transcriptsFetched === true,
    screenshotsCaptured: Boolean(metadata.screenshotsCaptured),
    fullWatchBlocked: metadata.fullWatchBlocked === true,
    fullWatchBlockedReason: text(metadata.fullWatchBlockedReason),
    visibleMetadata,
    publishVisibleDate: text(metadata.publishVisibleDate),
    lastSeenAt: text(metadata.lastSeenAt),
    reviewState: text(metadata.reviewState),
    buildIntelRelevance: relevance,
    standardFullWatchRisk: longVideoRisk.risk,
    standardFullWatchRiskReasons: longVideoRisk.reasons,
  }
}

function videoRelevantPublicCandidate(video = {}, alreadyFullWatched = new Set(), options = {}) {
  const exactVideoRequested = options.exactVideoRequested === true
  const relevanceOk = exactVideoRequested
    ? video.buildIntelRelevance.score >= 16
    : video.buildIntelRelevance.titlePositiveTerms.length >= 1 && video.buildIntelRelevance.score >= 16
  return video.videoId &&
    video.creatorId &&
    (exactVideoRequested || video.creatorId !== YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID) &&
    video.sourceId === YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID &&
    video.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY &&
    video.publicNoAuth === true &&
    video.privateOrPaidAccess === false &&
    video.fullWatchBlocked !== true &&
    relevanceOk &&
    video.buildIntelRelevance.negativeTerms.length === 0 &&
    !alreadyFullWatched.has(video.videoId)
}

function videoEligible(video = {}, alreadyFullWatched = new Set(), options = {}) {
  return videoRelevantPublicCandidate(video, alreadyFullWatched, options) &&
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
    .filter(video => videoEligible(video, alreadyFullWatched, { exactVideoRequested: allowedVideos.size > 0 }))
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
    .filter(video => videoRelevantPublicCandidate(video, alreadyFullWatched, { exactVideoRequested: allowedVideos.size > 0 }))
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
  const noEligibleVideosSelected = requestedCreatorIds.length === 0 &&
    requestedVideoIds.length === 0 &&
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
  addCheck(checks, selectedVideos.length >= 1 || requestedSelectionExhausted || noEligibleVideosSelected, 'next non-Mark public videos are selected or current public backlog is exhausted', requestedSelectionExhausted ? 'requested exhausted' : noEligibleVideosSelected ? 'no eligible videos selected' : `${selectedVideos.length}`)
  addCheck(checks, selectedVideos.every(video => (
    requestedVideoIds.length
      ? video.buildIntelRelevance.score >= 16
      : video.buildIntelRelevance.titlePositiveTerms.length >= 1 && video.buildIntelRelevance.score >= 16
  ) && video.buildIntelRelevance.negativeTerms.length === 0), 'selected videos are relevant Build Intel, not random channel noise', selectedVideos.map(video => `${video.videoId}:${video.buildIntelRelevance.score}:${video.buildIntelRelevance.titlePositiveTerms.join('|') || 'creator/source score'}`).join(', '))
  addCheck(checks, selectedVideos.every(video => video.standardFullWatchRisk !== true), 'selected videos avoid standard full-watch long-course risk', selectedVideos.map(video => `${video.videoId}:${video.standardFullWatchRiskReasons.join('|')}`).join(', '))
  addCheck(checks, selectedVideos.length <= YOUTUBE_LATEST_20_MAX_RUN_VIDEOS, 'selected run stays within bounded run cap', `${selectedVideos.length}/${YOUTUBE_LATEST_20_MAX_RUN_VIDEOS}`)
  addCheck(checks, requestedVideoIds.length > 0 || selectedVideos.every(video => video.creatorId !== YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID), 'Mark videos are excluded from broader latest-20 run unless exact scheduler ids are requested', selectedVideos.map(video => video.creatorId).join(', '))
  addCheck(checks, Object.values(selectedByCreator).every(count => count <= boundedMaxVideosPerCreator), 'selected run caps videos per creator', JSON.stringify(selectedByCreator))
  addCheck(checks, selectedVideos.every(video => video.publicNoAuth && !video.privateOrPaidAccess), 'selected videos are public/no-auth only', selectedVideos.map(video => `${video.videoId}:${video.publicNoAuth}`).join(', '))
  addCheck(checks, selectedVideos.every(video => !video.transcriptsFetched && !video.screenshotsCaptured), 'daily watch rows are metadata-only before full-watch run', selectedVideos.map(video => `${video.videoId}:${video.transcriptsFetched}/${video.screenshotsCaptured}`).join(', '))
  addCheck(checks, longCourseRoutedOut.every(video => video.standardFullWatchRiskReasons.length >= 1), 'long-course candidates are surfaced instead of hidden', `${longCourseRoutedOut.length}`)
  addCheck(checks, true, 'resource links must flow through resolver/scoper, not Steve', YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID)
  addCheck(checks, true, 'run manifest is read-only/proposal-only', 'no Gemini call, no extraction, no external write in this proof')
  const failures = checks.filter(check => !check.ok)
  const status = requestedSelectionExhausted
    ? 'exhausted_for_requested_creator'
    : noEligibleVideosSelected
      ? 'no_eligible_videos_selected'
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
      : noEligibleVideosSelected
        ? 'No relevant unwatched public videos are eligible for the standard lane right now. Rerun discovery, long-course extraction, or the source grader before starting more standard full-watch calls.'
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
    { external_id: 'lyt-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'linking-your-thinking-nick-milo', creator: 'Linking Your Thinking / Nick Milo', videoId: 'lyt-1', title: 'Give Me 13 Minutes. I Will Teach You 80% of NotebookLM', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'lyt-member-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'linking-your-thinking-nick-milo', creator: 'Linking Your Thinking / Nick Milo', videoId: 'lyt-member-1', title: '3 Factors to Consider When Using AI - Members only', rank: 2, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'noise-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'alex-finn', creator: 'Alex Finn', videoId: 'noise-1', title: 'Mini Skate Trip', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'noise-2', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'alex-finn', creator: 'Alex Finn', videoId: 'noise-2', title: 'FACE PLANT FRIDAY! Big stair set ledge', rank: 2, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'noise-3', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'alex-finn', creator: 'Alex Finn', videoId: 'noise-3', title: 'SKATING A TYRE?', rank: 3, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'noise-4', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'alex-finn', creator: 'Alex Finn', videoId: 'noise-4', title: 'Best Of BMX - 2013', rank: 4, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'course-risk-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'nick-saraev', creator: 'Nick Saraev', videoId: 'course-risk-1', title: 'How to Build Mobile Apps with Claude Code: Full Course (2026)', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'course-risk-2', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'nate-herk', creator: 'Nate Herk', videoId: 'course-risk-2', title: 'Build & Sell Claude Code Operating Systems (2+ Hour Course)', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'course-risk-3', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'andrej-karpathy', creator: 'Andrej Karpathy', videoId: 'course-risk-3', title: "Let's build GPT: from scratch, in code, spelled out.", duration: '1:56:20', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'course-risk-4', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'andrej-karpathy', creator: 'Andrej Karpathy', videoId: 'course-risk-4', title: 'The spelled-out intro to language modeling: building makemore', duration: '1:57:45', rank: 2, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'demo-noise-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'andrej-karpathy', creator: 'Andrej Karpathy', videoId: 'demo-noise-1', title: 'Stable diffusion dreams of steam punk neural networks', duration: '2:35', rank: 3, publicNoAuth: true, privateOrPaidAccess: false } },
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
  const exactVideoSchedulerSelection = buildYoutubeLatest20IntelRunSnapshot({
    generatedAt: '2026-05-25T13:30:00.000Z',
    poolRows: [
      ...poolRows,
      { external_id: 'dan-operator-1', source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, metadata: { creatorId: 'dan-martell', creator: 'Dan Martell', videoId: 'dan-operator-1', title: 'Delegation Laws for Operators', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    ],
    alreadyFullWatchedVideoIds: [],
    videoIds: ['dan-operator-1'],
    maxCreators: 1,
    maxVideosPerCreator: 1,
    maxRunVideos: 1,
  })
  const exactMarkSchedulerSelection = buildYoutubeLatest20IntelRunSnapshot({
    generatedAt: '2026-05-25T13:30:00.000Z',
    poolRows,
    alreadyFullWatchedVideoIds: [],
    videoIds: ['mark-1'],
    maxCreators: 1,
    maxVideosPerCreator: 1,
    maxRunVideos: 1,
  })
  const exactOffTopicSchedulerSelection = buildYoutubeLatest20IntelRunSnapshot({
    generatedAt: '2026-05-25T13:30:00.000Z',
    poolRows,
    alreadyFullWatchedVideoIds: [],
    videoIds: ['noise-2', 'noise-3', 'noise-4'],
    maxCreators: 1,
    maxVideosPerCreator: 3,
    maxRunVideos: 3,
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
      ok: !snapshot.selectedVideos.some(video => ['noise-1', 'noise-2', 'noise-3', 'noise-4'].includes(video.videoId)),
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
      name: 'routes_long_code_tutorial_out_of_standard_full_watch',
      ok: !snapshot.selectedVideos.some(video => video.videoId === 'course-risk-3') &&
        snapshot.standardFullWatchRiskRoutedOut.some(video =>
          video.videoId === 'course-risk-3' &&
          list(video.standardFullWatchRiskReasons).includes('long_code_tutorial_needs_long_course_lane')
        ),
    },
    {
      name: 'routes_foundational_ml_tutorial_out_of_standard_full_watch',
      ok: !snapshot.selectedVideos.some(video => video.videoId === 'course-risk-4') &&
        snapshot.standardFullWatchRiskRoutedOut.some(video =>
          video.videoId === 'course-risk-4' &&
          list(video.buildIntelRelevance?.titlePositiveTerms).some(term => ['language modeling', 'makemore'].includes(term))
        ),
    },
    {
      name: 'parks_stable_diffusion_dream_demo_noise',
      ok: !snapshot.selectedVideos.some(video => video.videoId === 'demo-noise-1') &&
        !snapshot.standardFullWatchRiskRoutedOut.some(video => video.videoId === 'demo-noise-1'),
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
    {
      name: 'exact_scheduler_video_can_use_creator_source_relevance',
      ok: exactVideoSchedulerSelection.ok === true &&
        exactVideoSchedulerSelection.selectedVideos.some(video => video.videoId === 'dan-operator-1'),
    },
    {
      name: 'exact_scheduler_video_can_include_mark_catchup_rows',
      ok: exactMarkSchedulerSelection.ok === true &&
        exactMarkSchedulerSelection.selectedVideos.some(video => video.videoId === 'mark-1'),
    },
    {
      name: 'knowledge_management_sources_count_as_aios_memory_retrieval_intel',
      ok: scoreBuildIntelVideo({
        creatorId: 'linking-your-thinking-nick-milo',
        title: 'Give Me 13 Minutes. I Will Teach You 80% of NotebookLM',
      }).score >= 16,
    },
    {
      name: 'member_only_metadata_parks_as_auth_gated_not_public_watch',
      ok: !snapshot.selectedVideos.some(video => video.videoId === 'lyt-member-1'),
    },
    {
      name: 'exact_scheduler_video_still_rejects_off_topic_action_sports_noise',
      ok: exactOffTopicSchedulerSelection.ok === true &&
        exactOffTopicSchedulerSelection.status === 'exhausted_for_requested_creator' &&
        exactOffTopicSchedulerSelection.selectedVideos.length === 0,
    },
  ]
  return {
    ok: snapshot.ok && targetedExhausted.ok && exactVideoSchedulerSelection.ok && exactMarkSchedulerSelection.ok && exactOffTopicSchedulerSelection.ok && cases.every(item => item.ok),
    cases,
    snapshot,
  }
}
