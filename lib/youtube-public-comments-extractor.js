import crypto from 'node:crypto'

import {
  buildSourcePacketPreview,
  validateSourcePacketPreview,
} from './build-intel-link-approval-source-packets.js'

export const YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_CARD_ID = 'YOUTUBE-PUBLIC-COMMENTS-EXTRACTOR-001'
export const YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_PLAN_PATH = 'docs/process/youtube-public-comments-extractor-001-plan.md'
export const YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_SCRIPT_PATH = 'scripts/process-youtube-public-comments-extractor-check.mjs'
export const YOUTUBE_PUBLIC_COMMENTS_SOURCE_ID = 'SRC-YOUTUBE-COMMENTS-001'
export const YOUTUBE_PUBLIC_COMMENTS_ACTIVE_EXTRACTION_STATUS = 'operator_excluded'
export const YOUTUBE_PUBLIC_COMMENTS_OPERATOR_EXCLUSION_REASON = 'Steve explicitly excluded YouTube comments from active God Mode extraction for this sprint.'

const MAX_COMMENT_COUNT = 200
const YOUTUBE_DATA_API_MAX_RESULTS = 100
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
])

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function hash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function clip(value = '', max = 220) {
  const clean = text(value).replace(/\s+/g, ' ')
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trim()}…`
}

function envValue(env = {}, names = []) {
  for (const name of names) {
    const value = text(env[name])
    if (value) return value
  }
  return ''
}

function normalizeHost(rawUrl = '') {
  try {
    return new URL(rawUrl).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function normalizeOutboundUrl(rawUrl = '') {
  const clean = text(rawUrl).replace(/[)\].,!?;:'"]+$/g, '')
  try {
    return new URL(clean).toString()
  } catch {
    return ''
  }
}

export function extractYoutubeVideoId(value = '') {
  const input = text(value)
  if (!input) return ''
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input
  try {
    const url = new URL(input)
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return ''
    if (url.hostname.toLowerCase() === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] || ''
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : ''
    }
    const fromQuery = url.searchParams.get('v') || ''
    if (/^[a-zA-Z0-9_-]{11}$/.test(fromQuery)) return fromQuery
    const parts = url.pathname.split('/').filter(Boolean)
    const markerIndex = parts.findIndex(part => ['embed', 'shorts', 'live'].includes(part))
    const id = markerIndex >= 0 ? parts[markerIndex + 1] || '' : ''
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : ''
  } catch {
    return ''
  }
}

export function normalizeYoutubeWatchUrl(value = '') {
  const videoId = extractYoutubeVideoId(value)
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''
}

export function getYoutubeDataApiKey(env = typeof process !== 'undefined' ? process.env : {}) {
  return envValue(env, ['YOUTUBE_DATA_API_KEY', 'YOUTUBE_API_KEY', 'GOOGLE_API_KEY'])
}

export function extractUrlsFromCommentText(value = '') {
  const matches = text(value).match(/https?:\/\/[^\s<>()]+/gi) || []
  return Array.from(new Set(matches.map(normalizeOutboundUrl).filter(Boolean)))
}

function classifyCommentSignal(comment = {}) {
  const lower = text(comment.text).toLowerCase()
  if (/broken|doesn.t work|doesn't work|wrong|bug|error|issue|fails|outdated|not true/.test(lower)) return 'challenges_or_warns'
  if (/repo|github|gist|code|template|prompt|skill|workflow|download|docs|source/.test(lower)) return 'adds_resource_or_implementation_clue'
  if (/worked|works|using this|built this|helped|validated|confirm|proof/.test(lower)) return 'validates_or_social_proof'
  if (/question|how do|what about|can you|where is/.test(lower)) return 'operator_question_or_gap'
  return 'context_signal'
}

export function validateYoutubePublicCommentsRequest(request = {}) {
  const failures = []
  const videoId = extractYoutubeVideoId(request.videoId || request.videoUrl || request.sourceUrl)
  const videoUrl = normalizeYoutubeWatchUrl(request.videoUrl || request.sourceUrl || videoId)
  const host = normalizeHost(request.videoUrl || request.sourceUrl || videoUrl)

  if (!videoId) failures.push('missing_exact_youtube_video_id')
  if (!videoUrl) failures.push('missing_exact_youtube_video_url')
  if (host && !YOUTUBE_HOSTS.has(host)) failures.push('source_must_be_youtube_video')
  if (request.allowPublicComments !== true) failures.push('public_comments_must_be_explicitly_allowed')
  if (request.exactVideoOnly !== true) failures.push('must_be_exact_video_only')
  if (request.publicNoAuth !== true) failures.push('must_be_public_no_auth')
  if (request.authSessionUsed === true || request.cookiesUsed === true || request.loggedIn === true) failures.push('auth_or_cookies_not_allowed')
  if (request.includeReplies === true) failures.push('comment_replies_need_separate_scope')
  if (request.crawlAuthorProfiles === true) failures.push('author_profile_crawling_not_allowed')
  if (request.followOutboundLinks === true) failures.push('comment_links_must_be_source_packets_not_crawled')
  if (request.sourcePacketRequiredForOutboundLinks !== true) failures.push('comment_links_require_source_packets')
  if (Number(request.maxComments || 0) < 1) failures.push('max_comments_required')
  if (Number(request.maxComments || 0) > MAX_COMMENT_COUNT) failures.push('max_comments_exceeds_public_comment_bound')

  return {
    ok: failures.length === 0,
    failures,
    normalized: {
      videoId,
      videoUrl,
      maxComments: Number(request.maxComments || 0),
    },
  }
}

export function normalizePublicYoutubeComment(rawComment = {}, context = {}) {
  const commentId = text(rawComment.commentId || rawComment.id)
  const commentText = text(rawComment.text || rawComment.commentText || rawComment.body)
  const sourceVideoId = extractYoutubeVideoId(rawComment.sourceVideoId || context.videoId || context.videoUrl)
  const sourceUrl = normalizeYoutubeWatchUrl(rawComment.sourceUrl || context.videoUrl || sourceVideoId)
  const observedAt = text(rawComment.observedAt || rawComment.captureTimestamp || context.captureTimestamp)
  const reportArtifactId = text(rawComment.reportArtifactId || context.reportArtifactId)
  const authorLabel = text(rawComment.authorHandle || rawComment.authorDisplayName || rawComment.publicAuthor || 'public-comment-author')
  const links = extractUrlsFromCommentText(commentText)

  return {
    commentId,
    sourceId: YOUTUBE_PUBLIC_COMMENTS_SOURCE_ID,
    sourceVideoId,
    sourceUrl,
    observedAt,
    reportArtifactId,
    rank: Number(rawComment.rank || 0),
    relevanceReason: text(rawComment.relevanceReason || rawComment.reason || classifyCommentSignal({ text: commentText })),
    signalRole: text(rawComment.signalRole || classifyCommentSignal({ text: commentText })),
    authorDisplay: authorLabel,
    authorHash: hash(authorLabel),
    textHash: hash(commentText),
    textExcerpt: clip(commentText),
    likeCount: Number(rawComment.likeCount || 0),
    replyCount: Number(rawComment.replyCount || 0),
    permalink: text(rawComment.permalink),
    outboundLinks: links,
  }
}

export function buildYoutubePublicCommentsPacket({ request = {}, rawComments = [] } = {}) {
  const requestValidation = validateYoutubePublicCommentsRequest(request)
  const normalizedRequest = requestValidation.normalized
  const captureTimestamp = text(request.captureTimestamp || new Date().toISOString())
  const context = {
    videoId: normalizedRequest.videoId,
    videoUrl: normalizedRequest.videoUrl,
    captureTimestamp,
    reportArtifactId: text(request.reportArtifactId),
  }
  const comments = list(rawComments).slice(0, normalizedRequest.maxComments || MAX_COMMENT_COUNT).map((comment, index) => {
    const normalized = normalizePublicYoutubeComment(
      {
        rank: index + 1,
        ...comment,
      },
      context,
    )
    return {
      ...normalized,
      sourcePacketPreviews: normalized.outboundLinks.map(url => {
        const packet = buildSourcePacketPreview({
          url,
          sourceVideoId: normalized.sourceVideoId,
          sourceUrl: normalized.sourceUrl,
          reportArtifactId: normalized.reportArtifactId,
          reason: 'Public YouTube comment outbound link needs source-packet review before any worker reads it.',
        })
        return {
          ...packet,
          validation: validateSourcePacketPreview(packet),
        }
      }),
    }
  })
  const sourcePacketPreviews = comments.flatMap(comment => comment.sourcePacketPreviews)

  return {
    cardId: YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_CARD_ID,
    sourceId: YOUTUBE_PUBLIC_COMMENTS_SOURCE_ID,
    reportOnly: true,
    exactVideoOnly: true,
    publicNoAuth: true,
    startsCrawler: false,
    externalWrites: false,
    writesBacklog: false,
    noLiveFetchInProof: true,
    captureTimestamp,
    request: {
      ...normalizedRequest,
      allowPublicComments: request.allowPublicComments === true,
      exactVideoOnly: request.exactVideoOnly === true,
      publicNoAuth: request.publicNoAuth === true,
      sourcePacketRequiredForOutboundLinks: request.sourcePacketRequiredForOutboundLinks === true,
    },
    requestValidation,
    comments,
    sourcePacketPreviews,
    summary: {
      commentCount: comments.length,
      outboundLinkCount: sourcePacketPreviews.length,
      sourcePacketCount: sourcePacketPreviews.length,
      signalRoles: Array.from(new Set(comments.map(comment => comment.signalRole).filter(Boolean))),
    },
  }
}

function youtubeCommentThreadsEndpoint({ videoId = '', apiKey = '', maxResults = 25, order = 'relevance' } = {}) {
  const params = new URLSearchParams({
    part: 'snippet',
    videoId,
    maxResults: String(Math.max(1, Math.min(YOUTUBE_DATA_API_MAX_RESULTS, Number(maxResults || 25)))),
    order: order === 'time' ? 'time' : 'relevance',
    textFormat: 'plainText',
    key: apiKey,
  })
  return `https://www.googleapis.com/youtube/v3/commentThreads?${params.toString()}`
}

function commentThreadToRawComment(item = {}, context = {}) {
  const snippet = item.snippet?.topLevelComment?.snippet || {}
  const commentId = text(item.snippet?.topLevelComment?.id || item.id)
  return {
    commentId,
    authorDisplayName: text(snippet.authorDisplayName || 'public-comment-author'),
    text: text(snippet.textDisplay || snippet.textOriginal),
    likeCount: Number(snippet.likeCount || 0),
    replyCount: Number(item.snippet?.totalReplyCount || 0),
    observedAt: context.captureTimestamp,
    sourceVideoId: context.videoId,
    sourceUrl: context.videoUrl,
    reportArtifactId: context.reportArtifactId,
    permalink: commentId ? `${context.videoUrl}&lc=${encodeURIComponent(commentId)}` : '',
    relevanceReason: 'Captured from public YouTube top-level comments through the YouTube Data API route.',
  }
}

export async function fetchYoutubePublicCommentsViaDataApi({
  videoUrl = '',
  videoId = '',
  apiKey = getYoutubeDataApiKey(),
  maxComments = 25,
  order = 'relevance',
  reportArtifactId = '',
  captureTimestamp = new Date().toISOString(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const normalizedVideoId = extractYoutubeVideoId(videoId || videoUrl)
  const normalizedVideoUrl = normalizeYoutubeWatchUrl(videoUrl || normalizedVideoId)
  const request = {
    videoId: normalizedVideoId,
    videoUrl: normalizedVideoUrl,
    allowPublicComments: true,
    exactVideoOnly: true,
    publicNoAuth: true,
    sourcePacketRequiredForOutboundLinks: true,
    maxComments: Math.max(1, Math.min(YOUTUBE_DATA_API_MAX_RESULTS, Number(maxComments || 25))),
    reportArtifactId,
    captureTimestamp,
  }
  const requestValidation = validateYoutubePublicCommentsRequest(request)
  if (!requestValidation.ok) {
    return {
      ok: false,
      status: 'blocked',
      blocker: 'invalid_public_comment_request',
      failures: requestValidation.failures,
      startsCrawler: false,
      externalWrites: false,
      writesBacklog: false,
    }
  }
  if (!text(apiKey)) {
    return {
      ok: false,
      status: 'blocked',
      blocker: 'missing_youtube_data_api_key',
      failures: ['Set YOUTUBE_DATA_API_KEY or YOUTUBE_API_KEY for public no-auth YouTube comments.'],
      startsCrawler: false,
      externalWrites: false,
      writesBacklog: false,
    }
  }
  if (typeof fetchImpl !== 'function') {
    return {
      ok: false,
      status: 'blocked',
      blocker: 'missing_fetch_impl',
      failures: ['fetch implementation is required'],
      startsCrawler: false,
      externalWrites: false,
      writesBacklog: false,
    }
  }

  const endpoint = youtubeCommentThreadsEndpoint({
    videoId: normalizedVideoId,
    apiKey,
    maxResults: request.maxComments,
    order,
  })
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      status: 'blocked',
      blocker: 'youtube_data_api_request_failed',
      httpStatus: response.status,
      failures: [payload.error?.message || `YouTube Data API returned HTTP ${response.status}`],
      startsCrawler: false,
      externalWrites: false,
      writesBacklog: false,
    }
  }

  const rawComments = list(payload.items)
    .slice(0, request.maxComments)
    .map(item => commentThreadToRawComment(item, {
      videoId: normalizedVideoId,
      videoUrl: normalizedVideoUrl,
      captureTimestamp,
      reportArtifactId,
    }))
    .filter(comment => text(comment.commentId) && text(comment.text))
  const packet = buildYoutubePublicCommentsPacket({ request, rawComments })
  const evaluation = evaluateYoutubePublicCommentsPacket(packet)
  return {
    ok: evaluation.ok,
    status: evaluation.ok ? 'healthy' : 'blocked',
    blocker: evaluation.ok ? '' : 'comment_packet_validation_failed',
    packet,
    evaluation,
    startsCrawler: false,
    externalWrites: false,
    writesBacklog: false,
  }
}

function validateCommentEvidence(comment = {}) {
  const failures = []
  if (!text(comment.commentId)) failures.push('missing_comment_id')
  if (!text(comment.sourceVideoId)) failures.push('missing_source_video_id')
  if (!text(comment.sourceUrl)) failures.push('missing_source_url')
  if (!text(comment.observedAt)) failures.push('missing_observed_at')
  if (!text(comment.reportArtifactId)) failures.push('missing_report_artifact_id')
  if (!text(comment.textHash)) failures.push('missing_text_hash')
  if (!text(comment.textExcerpt)) failures.push('missing_safe_excerpt')
  if (!text(comment.authorHash)) failures.push('missing_author_hash')
  if (!text(comment.signalRole)) failures.push('missing_signal_role')
  if (Number(comment.replyCount || 0) > 0 && /reply/i.test(comment.permalink || '')) failures.push('reply_threads_not_in_v1_scope')
  return failures
}

export function evaluateYoutubePublicCommentsPacket(packet = {}) {
  const failures = []
  if (packet.cardId !== YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_CARD_ID) failures.push('wrong_card_id')
  if (packet.sourceId !== YOUTUBE_PUBLIC_COMMENTS_SOURCE_ID) failures.push('wrong_source_id')
  if (packet.reportOnly !== true) failures.push('v1_must_be_report_only')
  if (packet.startsCrawler !== false) failures.push('must_not_start_crawler')
  if (packet.externalWrites !== false) failures.push('must_not_write_external_systems')
  if (packet.writesBacklog !== false) failures.push('must_not_write_backlog')
  if (!packet.requestValidation?.ok) failures.push(...list(packet.requestValidation?.failures))
  if (!list(packet.comments).length) failures.push('comments_required')
  for (const comment of list(packet.comments)) {
    failures.push(...validateCommentEvidence(comment).map(failure => `${comment.commentId || 'comment'}:${failure}`))
    for (const packetPreview of list(comment.sourcePacketPreviews)) {
      if (packetPreview.startsCrawler !== false) failures.push('source_packet_must_not_start_crawler')
      if (packetPreview.externalWrites !== false) failures.push('source_packet_must_not_write_external_systems')
      if (packetPreview.writesBacklog !== false) failures.push('source_packet_must_not_write_backlog')
      if (packetPreview.validation?.ok !== true) failures.push(`source_packet_invalid:${packetPreview.exactUrl || 'unknown'}`)
    }
  }
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    failures: Array.from(new Set(failures)),
  }
}

export function buildYoutubePublicCommentsExtractorDogfoodProof() {
  const validRequest = {
    videoUrl: 'https://www.youtube.com/watch?v=efRIrLXoOVA',
    allowPublicComments: true,
    exactVideoOnly: true,
    publicNoAuth: true,
    sourcePacketRequiredForOutboundLinks: true,
    maxComments: 25,
    reportArtifactId: 'report:youtube-comments-dogfood',
    captureTimestamp: '2026-05-25T16:00:00.000Z',
  }
  const rawComments = [
    {
      commentId: 'comment-public-resource-001',
      authorHandle: '@aleksdeveloper698',
      text: 'This is the part that matters: keep a state checkpoint and compare it with the repo. Example repo https://github.com/earlyaidopters/claudeclaw-os',
      likeCount: 42,
      relevanceReason: 'Adds code/resource clue',
      observedAt: '2026-05-25T16:00:00.000Z',
    },
    {
      commentId: 'comment-free-community-002',
      authorDisplayName: 'Public Builder',
      text: 'There is a free community talking about this here https://www.skool.com/ai-automations-by-kia',
      likeCount: 8,
      observedAt: '2026-05-25T16:00:00.000Z',
    },
    {
      commentId: 'comment-paid-hold-003',
      authorDisplayName: 'Course Member',
      text: 'The paid classroom version is at https://www.skool.com/earlyaidopters/classroom/26269254 but it should not be crawled unless approved.',
      likeCount: 5,
      observedAt: '2026-05-25T16:00:00.000Z',
    },
  ]
  const validPacket = buildYoutubePublicCommentsPacket({ request: validRequest, rawComments })
  const validEvaluation = evaluateYoutubePublicCommentsPacket(validPacket)

  const authPacket = buildYoutubePublicCommentsPacket({
    request: {
      ...validRequest,
      authSessionUsed: true,
      cookiesUsed: true,
    },
    rawComments,
  })
  const authEvaluation = evaluateYoutubePublicCommentsPacket(authPacket)

  const broadPacket = buildYoutubePublicCommentsPacket({
    request: {
      ...validRequest,
      videoUrl: 'https://example.com/not-youtube',
    },
    rawComments,
  })
  const broadEvaluation = evaluateYoutubePublicCommentsPacket(broadPacket)

  const missingProvenancePacket = buildYoutubePublicCommentsPacket({
    request: validRequest,
    rawComments: [
      {
        commentId: '',
        text: 'Missing ID should fail.',
      },
    ],
  })
  const missingProvenanceEvaluation = evaluateYoutubePublicCommentsPacket(missingProvenancePacket)

  const profileCrawlPacket = buildYoutubePublicCommentsPacket({
    request: {
      ...validRequest,
      crawlAuthorProfiles: true,
      followOutboundLinks: true,
    },
    rawComments,
  })
  const profileCrawlEvaluation = evaluateYoutubePublicCommentsPacket(profileCrawlPacket)

  const sourcePacketFamilies = validPacket.sourcePacketPreviews.map(packet => `${packet.sourceFamily}:${packet.proposedDecision}`)
  const cases = [
    {
      name: 'valid_public_exact_video_comment_packet_passes',
      ok: validEvaluation.ok === true &&
        validPacket.startsCrawler === false &&
        validPacket.externalWrites === false &&
        validPacket.writesBacklog === false,
    },
    {
      name: 'auth_or_cookies_fail_closed',
      ok: authEvaluation.ok === false && authEvaluation.failures.includes('auth_or_cookies_not_allowed'),
    },
    {
      name: 'non_youtube_source_fails_closed',
      ok: broadEvaluation.ok === false && broadEvaluation.failures.includes('missing_exact_youtube_video_id'),
    },
    {
      name: 'missing_comment_provenance_fails_closed',
      ok: missingProvenanceEvaluation.ok === false && missingProvenanceEvaluation.failures.some(failure => failure.includes('missing_comment_id')),
    },
    {
      name: 'profile_crawl_and_link_following_fail_closed',
      ok: profileCrawlEvaluation.ok === false &&
        profileCrawlEvaluation.failures.includes('author_profile_crawling_not_allowed') &&
        profileCrawlEvaluation.failures.includes('comment_links_must_be_source_packets_not_crawled'),
    },
    {
      name: 'comment_links_become_source_packets_not_crawls',
      ok: validPacket.sourcePacketPreviews.length >= 3 &&
        validPacket.sourcePacketPreviews.every(packet => packet.startsCrawler === false && packet.externalWrites === false && packet.writesBacklog === false && packet.validation?.ok === true) &&
        sourcePacketFamilies.some(item => item.startsWith('github:approve_public_free_read')) &&
        sourcePacketFamilies.some(item => item.startsWith('skool:manual_source_packet')) &&
        sourcePacketFamilies.some(item => item.startsWith('skool:hold_paid_private')),
    },
  ]

  return {
    ok: cases.every(item => item.ok),
    cases,
    validPacket,
    blockedExamples: {
      auth: authEvaluation,
      broad: broadEvaluation,
      missingProvenance: missingProvenanceEvaluation,
      profileCrawl: profileCrawlEvaluation,
    },
  }
}

export async function buildYoutubePublicCommentsLiveAdapterDogfoodProof() {
  const fakePayload = {
    items: [
      {
        id: 'thread-1',
        snippet: {
          totalReplyCount: 0,
          topLevelComment: {
            id: 'UgztPublicComment001',
            snippet: {
              authorDisplayName: 'Public Builder',
              textDisplay: 'Useful repo from the comments: https://github.com/earlyaidopters/claudeclaw-os',
              likeCount: 12,
            },
          },
        },
      },
      {
        id: 'thread-2',
        snippet: {
          totalReplyCount: 2,
          topLevelComment: {
            id: 'UgztPublicComment002',
            snippet: {
              authorDisplayName: 'Course Buyer',
              textDisplay: 'Paid classroom link is https://www.skool.com/earlyaidopters/classroom/26269254',
              likeCount: 3,
            },
          },
        },
      },
    ],
  }
  const calls = []
  const fakeFetch = async (url, options = {}) => {
    calls.push({ url, options })
    return {
      ok: true,
      status: 200,
      async json() {
        return fakePayload
      },
    }
  }
  const fetched = await fetchYoutubePublicCommentsViaDataApi({
    videoUrl: 'https://www.youtube.com/watch?v=efRIrLXoOVA',
    apiKey: 'test-youtube-data-api-key',
    maxComments: 10,
    reportArtifactId: 'report:youtube-comments-live-adapter-dogfood',
    captureTimestamp: '2026-05-25T16:15:00.000Z',
    fetchImpl: fakeFetch,
  })
  const missingKey = await fetchYoutubePublicCommentsViaDataApi({
    videoUrl: 'https://www.youtube.com/watch?v=efRIrLXoOVA',
    apiKey: '',
    maxComments: 10,
    reportArtifactId: 'report:youtube-comments-live-adapter-dogfood',
    captureTimestamp: '2026-05-25T16:15:00.000Z',
    fetchImpl: fakeFetch,
  })
  const failedApi = await fetchYoutubePublicCommentsViaDataApi({
    videoUrl: 'https://www.youtube.com/watch?v=efRIrLXoOVA',
    apiKey: 'test-youtube-data-api-key',
    maxComments: 10,
    reportArtifactId: 'report:youtube-comments-live-adapter-dogfood',
    captureTimestamp: '2026-05-25T16:15:00.000Z',
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      async json() {
        return { error: { message: 'commentsDisabled or quotaExceeded' } }
      },
    }),
  })
  const endpoint = calls[0]?.url || ''
  const cases = [
    {
      name: 'adapter_uses_public_youtube_comment_threads_endpoint',
      ok: endpoint.startsWith('https://www.googleapis.com/youtube/v3/commentThreads?') &&
        endpoint.includes('videoId=efRIrLXoOVA') &&
        endpoint.includes('part=snippet') &&
        endpoint.includes('textFormat=plainText'),
    },
    {
      name: 'adapter_maps_public_threads_to_valid_comment_packet',
      ok: fetched.ok === true &&
        fetched.packet?.summary?.commentCount === 2 &&
        fetched.packet?.startsCrawler === false &&
        fetched.packet?.externalWrites === false &&
        fetched.packet?.writesBacklog === false,
    },
    {
      name: 'adapter_keeps_comment_links_as_source_packets',
      ok: (fetched.packet?.sourcePacketPreviews || []).some(packet => packet.sourceFamily === 'github') &&
        (fetched.packet?.sourcePacketPreviews || []).some(packet => packet.sourceFamily === 'skool') &&
        (fetched.packet?.sourcePacketPreviews || []).every(packet => packet.startsCrawler === false),
    },
    {
      name: 'missing_api_key_blocks_without_network_call',
      ok: missingKey.ok === false &&
        missingKey.blocker === 'missing_youtube_data_api_key' &&
        calls.length === 1,
    },
    {
      name: 'api_error_blocks_without_downstream_writes',
      ok: failedApi.ok === false &&
        failedApi.blocker === 'youtube_data_api_request_failed' &&
        failedApi.startsCrawler === false &&
        failedApi.externalWrites === false &&
        failedApi.writesBacklog === false,
    },
  ]
  return {
    ok: cases.every(item => item.ok),
    cases,
    fetched,
    missingKey,
    failedApi,
  }
}
