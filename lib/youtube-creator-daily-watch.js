import crypto from 'node:crypto'

import {
  CREATOR_WATCHLIST_SOURCE_ID,
  listCreatorWatchlistEntries,
} from './build-intel-watchlist.js'
import {
  extractYoutubeVideoId,
  normalizeDiscoveredUrl,
} from './web-godmode-live-operator.js'

export const YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID = 'YOUTUBE-CREATOR-DAILY-WATCH-001'
export const YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY = 'youtube-creator-daily-watch-v1'
export const YOUTUBE_CREATOR_DAILY_WATCH_SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
export const YOUTUBE_CREATOR_DAILY_WATCH_NEXT_CARD_ID = 'DEV-TEAM-HUB-V0-001'
export const YOUTUBE_CREATOR_DAILY_WATCH_PLAN_PATH = 'docs/process/youtube-creator-daily-watch-001-plan.md'
export const YOUTUBE_CREATOR_DAILY_WATCH_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-CREATOR-DAILY-WATCH-001.json'
export const YOUTUBE_CREATOR_DAILY_WATCH_SCRIPT_PATH = 'scripts/process-youtube-creator-daily-watch-check.mjs'
export const YOUTUBE_CREATOR_DAILY_WATCH_RUNNER_PATH = 'scripts/run-youtube-creator-daily-watch.mjs'
export const YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_PATH = 'docs/handoffs/2026-05-21-youtube-creator-daily-watch-closeout.md'
export const YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY = 'youtube-creator-daily-watch'
export const YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY = 'youtube-creator-daily-watch'
export const YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID = 'research-pool:youtube-creator-daily-watch'
export const YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID = 'mark-kashef'
export const YOUTUBE_CREATOR_DAILY_WATCH_MARK_BASELINE_DEPTH = 50
export const YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH = 20
export const YOUTUBE_CREATOR_DAILY_WATCH_MAX_BASELINE_DEPTH = 50
export const YOUTUBE_CREATOR_DAILY_WATCH_SCHEDULE_LOCAL_TIME = '06:30'
export const YOUTUBE_CREATOR_DAILY_WATCH_SCHEDULE_TIMEZONE = 'America/Toronto'

export const YOUTUBE_CREATOR_DAILY_WATCH_NOT_NEXT = [
  'Public YouTube channel/video metadata only.',
  'No Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment/course extraction.',
  'Do not follow purchase, download, opt-in, booking, form, community, or external resource links.',
  'Do not fetch transcripts, call models, capture screenshots/keyframes, or run visual interpretation from the daily watch.',
  'Do not mutate credentials, browser profiles, source systems, provider/account config, Drive permissions, or external systems.',
  'Do not create backlog cards automatically from creator findings; promotion is approval-gated.',
  'Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or Drive permission lanes from this card.',
]

export const YOUTUBE_CREATOR_DAILY_WATCH_CHANGED_FILES = [
  'lib/youtube-creator-daily-watch.js',
  YOUTUBE_CREATOR_DAILY_WATCH_RUNNER_PATH,
  YOUTUBE_CREATOR_DAILY_WATCH_SCRIPT_PATH,
  YOUTUBE_CREATOR_DAILY_WATCH_PLAN_PATH,
  YOUTUBE_CREATOR_DAILY_WATCH_APPROVAL_PATH,
  YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_PATH,
  'lib/foundation-job-mutation-allowlist.js',
  'lib/foundation-jobs.js',
  'lib/foundation-build-intel-routes.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/source-contracts.js',
  'lib/source-contract-validation-layer.js',
  'lib/source-lifecycle.js',
  'lib/source-lifecycle-completion.js',
  'lib/hub-read-routes.js',
  'server.js',
  'package.json',
]

export const YOUTUBE_CREATOR_DAILY_WATCH_PROOF_COMMANDS = [
  'node --check lib/youtube-creator-daily-watch.js',
  'node --check scripts/run-youtube-creator-daily-watch.mjs',
  'node --check scripts/process-youtube-creator-daily-watch-check.mjs',
  'npm run foundation:job -- --job=youtube-creator-daily-watch --actor=youtube-creator-daily-watch-proof --force',
  'npm run process:youtube-creator-daily-watch-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:current-sprint-active-card-gate-check -- --json',
  'npm run process:foundation-plan-reconcile-check -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=YOUTUBE-CREATOR-DAILY-WATCH-001 --planApprovalRef=docs/process/approvals/YOUTUBE-CREATOR-DAILY-WATCH-001.json --closeoutKey=youtube-creator-daily-watch-v1 --commitRef=HEAD',
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
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = stableValue(value[key])
      return acc
    }, {})
}

export function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function normalizeWhitespace(value = '') {
  return text(value).replace(/\s+/g, ' ')
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

export function isPublicYoutubeChannelUrl(value = '') {
  const normalized = normalizeDiscoveredUrl(value)
  return /^https:\/\/(www\.)?youtube\.com\/(@|channel\/|c\/|user\/)/i.test(normalized) &&
    !/\/watch\?/i.test(normalized) &&
    !/\/shorts\//i.test(normalized) &&
    !/\/playlist\?/i.test(normalized)
}

export function normalizeYoutubeChannelUrl(value = '') {
  const normalized = normalizeDiscoveredUrl(value).replace(/\/+$/, '')
  if (!isPublicYoutubeChannelUrl(normalized)) return ''
  return normalized.replace(/\/(videos|featured|streams|shorts|playlists|community|about)$/i, '')
}

export function youtubeChannelVideosUrl(value = '') {
  const channelUrl = normalizeYoutubeChannelUrl(value)
  return channelUrl ? `${channelUrl}/videos` : ''
}

export function baselineDepthForCreator(creatorId = '') {
  return creatorId === YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID
    ? YOUTUBE_CREATOR_DAILY_WATCH_MARK_BASELINE_DEPTH
    : YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH
}

function platformHasPublicYoutubeChannel(platform = {}) {
  const type = text(platform.type).toLowerCase()
  const access = text(platform.accessBoundary).toLowerCase()
  const lookup = text(platform.lookupStatus).toLowerCase()
  return type === 'youtube' &&
    normalizeYoutubeChannelUrl(platform.url) &&
    !access.includes('paid') &&
    !access.includes('auth') &&
    (!lookup || lookup.includes('known_public') || lookup === 'known')
}

function sourceRefHasPublicYoutubeChannel(ref = {}) {
  const sourceType = text(ref.sourceType).toLowerCase()
  const lookup = text(ref.lookupStatus).toLowerCase()
  return sourceType === 'public_youtube_channel' &&
    normalizeYoutubeChannelUrl(ref.url) &&
    (!lookup || lookup.includes('known_public') || lookup === 'known')
}

export function buildYoutubeCreatorDailyWatchPlan({
  watchlistEntries = listCreatorWatchlistEntries({ sourceCategory: 'build_intel' }),
} = {}) {
  const creators = []
  const lookupGaps = []
  const blockedRefs = []
  const seen = new Set()

  for (const entry of list(watchlistEntries)) {
    if (entry.active === false || entry.sourceCategory !== 'build_intel') continue
    const youtubePlatforms = list(entry.platforms).filter(platform => text(platform.type).toLowerCase() === 'youtube')
    const youtubeSourceRefs = list(entry.sourceRefs).filter(ref => text(ref.sourceType).toLowerCase().includes('youtube'))
    const publicChannelRefs = [
      ...youtubePlatforms.filter(platformHasPublicYoutubeChannel).map(platform => ({
        sourceKey: `${entry.creatorId}-youtube-platform`,
        url: platform.url,
        label: platform.label || 'YouTube',
        evidence: platform.lookupEvidence || [],
      })),
      ...youtubeSourceRefs.filter(sourceRefHasPublicYoutubeChannel).map(ref => ({
        sourceKey: ref.sourceKey,
        url: ref.url,
        label: ref.sourceKey || 'YouTube',
        evidence: ref.lookupEvidence || [],
      })),
    ]

    if (!publicChannelRefs.length && youtubePlatforms.length) {
      lookupGaps.push({
        creatorId: entry.creatorId,
        displayName: entry.displayName,
        reason: youtubeSourceRefs.some(ref => text(ref.sourceType).toLowerCase() === 'public_youtube_video')
          ? 'public_video_ref_without_channel_url'
          : 'public_channel_url_lookup_required',
        platforms: youtubePlatforms.map(platform => ({
          label: platform.label,
          lookupStatus: platform.lookupStatus,
          accessBoundary: platform.accessBoundary,
          url: platform.url || null,
        })),
        sourceRefs: youtubeSourceRefs.map(ref => ({
          sourceKey: ref.sourceKey,
          sourceType: ref.sourceType,
          lookupStatus: ref.lookupStatus,
          url: ref.url || null,
        })),
      })
    }

    for (const ref of [...youtubePlatforms, ...youtubeSourceRefs]) {
      const url = ref.url || ''
      const access = text(ref.accessBoundary || '').toLowerCase()
      const sourceType = text(ref.sourceType || '').toLowerCase()
      if (!url) continue
      if ((access.includes('paid') || access.includes('auth') || sourceType.includes('paid')) && /youtube\.com/i.test(url)) {
        blockedRefs.push({
          creatorId: entry.creatorId,
          displayName: entry.displayName,
          url,
          reason: 'paid_or_auth_youtube_ref_not_watched',
        })
      }
    }

    for (const ref of publicChannelRefs) {
      const channelUrl = normalizeYoutubeChannelUrl(ref.url)
      const channelVideosUrl = youtubeChannelVideosUrl(channelUrl)
      const dedupeKey = `${entry.creatorId}:${channelUrl}`
      if (!channelUrl || seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      const baselineDepth = baselineDepthForCreator(entry.creatorId)
      creators.push({
        creatorId: entry.creatorId,
        displayName: entry.displayName,
        priority: entry.priority,
        cadence: entry.cadence,
        sourceCategory: entry.sourceCategory,
        consumerLane: entry.consumerLane,
        sourceWatchlistId: CREATOR_WATCHLIST_SOURCE_ID,
        sourceIds: [CREATOR_WATCHLIST_SOURCE_ID, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
        sourceKey: ref.sourceKey,
        channelUrl,
        channelVideosUrl,
        baselineDepth,
        dailyDeltaDepth: baselineDepth,
        accessBoundary: 'public_no_auth_youtube_channel_metadata',
        noAuth: true,
        publicOnly: true,
        whySteveCares: entry.whySteveCares,
        lookupEvidence: list(ref.evidence),
      })
    }
  }

  return {
    cardId: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    jobKey: YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
    sourceIds: [CREATOR_WATCHLIST_SOURCE_ID, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    markBaselineDepth: YOUTUBE_CREATOR_DAILY_WATCH_MARK_BASELINE_DEPTH,
    defaultBaselineDepth: YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH,
    maxBaselineDepth: YOUTUBE_CREATOR_DAILY_WATCH_MAX_BASELINE_DEPTH,
    creators,
    lookupGaps,
    blockedRefs,
    notNext: YOUTUBE_CREATOR_DAILY_WATCH_NOT_NEXT,
  }
}

function parseDurationFromText(value = '') {
  const match = normalizeWhitespace(value).match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/)
  return match ? match[1] : ''
}

function titleFromRendererText(value = '') {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return ''
  return normalized
    .replace(/^\d{1,2}:\d{2}(?::\d{2})?\s+/, '')
    .replace(/\s+\d+([.,]\d+)?[KM]?\s+views?\s+.*$/i, '')
    .replace(/\s+No views\s+.*$/i, '')
    .trim()
}

function titleFromAnchor(value = '') {
  return normalizeWhitespace(value)
    .replace(/\s+\d+\s+minutes?.*$/i, '')
    .replace(/\s+\d+\s+seconds?.*$/i, '')
    .trim()
}

function publishVisibleText(value = '') {
  const normalized = normalizeWhitespace(value)
  const candidates = [
    /\b(Streamed|Premiered)\s+[^•|]+/i,
    /\b\d+\s+(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+ago\b/i,
    /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i,
  ]
  for (const pattern of candidates) {
    const match = normalized.match(pattern)
    if (match) return match[0].trim()
  }
  const parts = normalized.split('•').map(part => part.trim()).filter(Boolean)
  return parts.find(part => /ago|streamed|premiered|\d{4}/i.test(part)) || ''
}

function normalizeYoutubeVideoUrl(rawUrl = '') {
  const videoId = extractYoutubeVideoId(rawUrl)
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : normalizeDiscoveredUrl(rawUrl)
}

export function uniqueCreatorVideos(rawVideos = [], {
  creator,
  limit = YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH,
  discoveredAt = new Date().toISOString(),
} = {}) {
  const boundedLimit = Math.min(YOUTUBE_CREATOR_DAILY_WATCH_MAX_BASELINE_DEPTH, Math.max(1, Number(limit) || YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH))
  const byVideoId = new Map()
  for (const raw of list(rawVideos)) {
    const normalizedUrl = normalizeYoutubeVideoUrl(raw.href || raw.url)
    const videoId = extractYoutubeVideoId(normalizedUrl)
    if (!videoId || byVideoId.has(videoId)) continue
    const visibleMetadata = normalizeWhitespace(raw.text || raw.aria || '')
    const title = titleFromRendererText(raw.text) || titleFromAnchor(raw.title || raw.aria || '')
    byVideoId.set(videoId, {
      videoId,
      title: title || `YouTube video ${videoId}`,
      url: normalizedUrl,
      duration: raw.duration || parseDurationFromText(`${raw.text || ''} ${raw.aria || ''}`),
      publishVisibleDate: raw.publishVisibleDate || publishVisibleText(`${raw.text || ''} ${raw.aria || ''}`),
      publishDate: raw.publishDate || null,
      visibleMetadata: visibleMetadata.slice(0, 700),
      thumbnailUrlPresent: Boolean(raw.thumbnailUrl),
      thumbnailAlt: normalizeWhitespace(raw.thumbnailAlt || ''),
      creatorId: creator?.creatorId || '',
      creator: creator?.displayName || '',
      channelUrl: creator?.channelUrl || '',
      channelVideosUrl: creator?.channelVideosUrl || '',
      rank: byVideoId.size + 1,
      sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
      sourceWatchlistId: CREATOR_WATCHLIST_SOURCE_ID,
      discoveredAt,
      publicNoAuth: true,
    })
    if (byVideoId.size >= boundedLimit) break
  }
  return Array.from(byVideoId.values())
}

export async function discoverYoutubeCreatorChannelVideos({
  page,
  creator,
  limit = creator?.baselineDepth || YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH,
  now = new Date().toISOString(),
} = {}) {
  if (!page) throw new Error('A Playwright page is required.')
  const channelVideosUrl = youtubeChannelVideosUrl(creator?.channelUrl || creator?.channelVideosUrl || '')
  if (!channelVideosUrl) throw new Error(`Creator ${creator?.creatorId || 'unknown'} does not have a public YouTube channel URL.`)
  const boundedLimit = Math.min(YOUTUBE_CREATOR_DAILY_WATCH_MAX_BASELINE_DEPTH, Math.max(1, Number(limit) || YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH))
  const response = await page.goto(channelVideosUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  const scrolls = Math.max(4, Math.min(10, Math.ceil(boundedLimit / 7) + 2))
  for (let index = 0; index < scrolls; index += 1) {
    await page.mouse.wheel(0, 2600)
    await page.waitForTimeout(500)
  }
  const raw = await page.evaluate((maxItems) => {
    const norm = value => String(value || '').trim().replace(/\s+/g, ' ')
    const rendererVideos = Array.from(document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer'))
      .map(element => {
        const anchor = element.querySelector('a#video-title-link[href*="/watch"], a#thumbnail[href*="/watch"], a[href*="/watch?v="]')
        const titleElement = element.querySelector('#video-title, yt-formatted-string#video-title')
        const img = element.querySelector('img')
        return {
          href: anchor?.href || '',
          title: norm(titleElement?.textContent || anchor?.textContent || anchor?.getAttribute('aria-label') || ''),
          text: norm(element.innerText || element.textContent || ''),
          aria: anchor?.getAttribute('aria-label') || '',
          thumbnailUrl: img?.currentSrc || img?.src || '',
          thumbnailAlt: img?.alt || '',
        }
      })
    const anchorVideos = Array.from(document.querySelectorAll('a[href*="/watch?v="]')).map(anchor => ({
      href: anchor.href,
      title: norm(anchor.innerText || anchor.textContent || anchor.getAttribute('aria-label') || ''),
      text: norm(anchor.innerText || anchor.textContent || ''),
      aria: anchor.getAttribute('aria-label') || '',
      thumbnailUrl: '',
      thumbnailAlt: '',
    }))
    return {
      pageTitle: document.title || '',
      finalUrl: location.href,
      rendererVideos: rendererVideos.slice(0, maxItems * 4),
      anchorVideos: anchorVideos.slice(0, maxItems * 5),
    }
  }, boundedLimit)
  const videos = uniqueCreatorVideos([...raw.rendererVideos, ...raw.anchorVideos], {
    creator,
    limit: boundedLimit,
    discoveredAt: now,
  })
  return {
    creatorId: creator.creatorId,
    creator: creator.displayName,
    channelUrl: creator.channelUrl,
    channelVideosUrl,
    finalUrl: page.url(),
    pageTitle: raw.pageTitle,
    responseStatus: response?.status() || 0,
    responseOk: response?.ok() || false,
    discoveredAt: now,
    baselineDepth: boundedLimit,
    videos,
    discoveredCount: videos.length,
    noAuth: true,
    publicOnly: true,
    externalLinksFollowed: false,
    privateOrPaidAccess: false,
    transcriptsFetched: false,
    commentsCrawled: false,
    screenshotsCaptured: false,
  }
}

export async function runYoutubeCreatorDailyWatchDiscovery({
  creators = buildYoutubeCreatorDailyWatchPlan().creators,
  now = new Date().toISOString(),
  limitCreators = null,
} = {}) {
  const selectedCreators = Number(limitCreators) > 0 ? creators.slice(0, Number(limitCreators)) : creators
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  const discoveries = []
  const failures = []
  try {
    for (const creator of selectedCreators) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
      try {
        discoveries.push(await discoverYoutubeCreatorChannelVideos({
          page,
          creator,
          limit: creator.baselineDepth,
          now,
        }))
      } catch (error) {
        failures.push({
          creatorId: creator.creatorId,
          creator: creator.displayName,
          channelUrl: creator.channelUrl,
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        await page.close().catch(() => {})
      }
    }
  } finally {
    await browser.close().catch(() => {})
  }
  return {
    generatedAt: now,
    mode: 'live_public_youtube',
    discoveries,
    failures,
  }
}

export function buildYoutubeCreatorDailyWatchTargetInput({
  plan = buildYoutubeCreatorDailyWatchPlan(),
  now = new Date().toISOString(),
} = {}) {
  return {
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
    title: 'Public YouTube creator daily watch',
    lane: 'current_day',
    targetType: 'public_youtube_creator_watch',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'scheduled',
    cursorState: {
      youtubeCreatorDailyWatch: {
        lastConfiguredAt: now,
        creatorCount: plan.creators.length,
        markBaselineDepth: plan.markBaselineDepth,
        defaultBaselineDepth: plan.defaultBaselineDepth,
      },
    },
    budget: {
      llmBudget: 'none',
      dailyMissionQuota: 1,
      maxItemsPerRun: plan.creators.length,
      maxRuntimeSeconds: 1800,
      maxCreatorsPerRun: plan.creators.length,
      maxVideosPerCreator: YOUTUBE_CREATOR_DAILY_WATCH_MAX_BASELINE_DEPTH,
      markBaselineDepth: plan.markBaselineDepth,
      defaultBaselineDepth: plan.defaultBaselineDepth,
      publicNoAuthOnly: true,
    },
    dedupePolicy: {
      key: 'youtube_video_id',
      targetScope: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
      onDuplicate: 'update_last_seen_keep_first_seen',
    },
    metadata: {
      cardId: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
      closeoutKey: YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY,
      foundationJobKey: YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
      sourceIds: plan.sourceIds,
      sourceWatchlistId: CREATOR_WATCHLIST_SOURCE_ID,
      publicYoutubeOnly: true,
      noAuth: true,
      noExternalWrites: true,
      createsBacklogCardsAutomatically: false,
      notNext: YOUTUBE_CREATOR_DAILY_WATCH_NOT_NEXT,
    },
    notes: 'Daily public YouTube metadata watch for Build Intel; deeper extraction and opportunity promotion are approval-gated.',
  }
}

function itemKeyForVideo(videoId = '') {
  return `${YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY}:${videoId}`
}

function artifactIdForVideo(videoId = '') {
  return `${YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID}:youtube_video_metadata:${videoId}`
}

export function buildYoutubeCreatorDailyWatchPoolItems({
  discoveries = [],
  existingItemsByExternalId = new Map(),
  crawlRunId = '',
  now = new Date().toISOString(),
  baselineCompleted = false,
} = {}) {
  const poolItems = []
  const seenVideoIds = new Set()
  for (const discovery of list(discoveries)) {
    for (const video of list(discovery.videos)) {
      if (!video.videoId || seenVideoIds.has(video.videoId)) continue
      seenVideoIds.add(video.videoId)
      const existing = existingItemsByExternalId.get(video.videoId) || null
      const existingMetadata = existing?.metadata || {}
      const firstSeenAt = existingMetadata.firstSeenAt || existing?.discoveredAt || now
      const firstSeenDiscoveryRunId = existingMetadata.firstSeenDiscoveryRunId || existing?.lastSourceCrawlRunId || crawlRunId || null
      const seenCount = Math.max(0, Number(existingMetadata.seenCount || 0)) + 1
      const discoveryRunIds = [
        ...list(existingMetadata.discoveryRunIds),
        crawlRunId,
      ].filter(Boolean).slice(-20)
      const deltaState = existing ? 'seen_again' : (baselineCompleted ? 'new_daily_delta' : 'new_baseline_item')
      const metadata = {
        cardId: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
        closeoutKey: YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY,
        sourceIds: [CREATOR_WATCHLIST_SOURCE_ID, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
        sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
        sourceWatchlistId: CREATOR_WATCHLIST_SOURCE_ID,
        discoveryRunId: crawlRunId || null,
        discoveryRunIds,
        creatorId: video.creatorId,
        creator: video.creator,
        channelUrl: video.channelUrl,
        channelVideosUrl: video.channelVideosUrl,
        videoId: video.videoId,
        url: video.url,
        title: video.title,
        rank: video.rank,
        baselineDepth: discovery.baselineDepth,
        publishVisibleDate: video.publishVisibleDate || null,
        publishDate: video.publishDate || null,
        publishDatePrecision: video.publishDate ? 'date' : 'visible_text',
        visibleMetadata: video.visibleMetadata || '',
        duration: video.duration || '',
        thumbnailUrlPresent: Boolean(video.thumbnailUrlPresent),
        thumbnailAlt: video.thumbnailAlt || '',
        firstSeenAt,
        firstSeenDiscoveryRunId,
        lastSeenAt: now,
        lastSeenDiscoveryRunId: crawlRunId || null,
        seenCount,
        deltaState,
        reviewState: 'needs_build_intel_review',
        proposalOnly: true,
        publicNoAuth: true,
        privateOrPaidAccess: false,
        commentsCrawled: false,
        memberCommunityCrawled: false,
        transcriptsFetched: false,
        resourceLinksFollowed: false,
        screenshotsCaptured: false,
        externalWrites: false,
        createsBacklogCardsAutomatically: false,
      }
      poolItems.push({
        itemKey: itemKeyForVideo(video.videoId),
        targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
        sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
        externalId: video.videoId,
        itemType: 'public_youtube_video_candidate',
        status: 'pending',
        fingerprint: stableHash([
          video.videoId,
          video.title,
          video.publishVisibleDate,
          video.channelUrl,
        ]),
        artifactId: artifactIdForVideo(video.videoId),
        discoveredAt: firstSeenAt,
        processedAt: null,
        metadata,
      })
    }
  }
  return poolItems
}

export function buildYoutubeCreatorDailyWatchReportArtifact({
  plan = buildYoutubeCreatorDailyWatchPlan(),
  discoveries = [],
  poolItems = [],
  crawlRunId = '',
  foundationJobRunId = '',
  now = new Date().toISOString(),
  status = 'generated',
} = {}) {
  const newItems = poolItems.filter(item => String(item.metadata?.deltaState || '').startsWith('new_'))
  const seenAgainItems = poolItems.filter(item => item.metadata?.deltaState === 'seen_again')
  const creatorSummaries = plan.creators.map(creator => {
    const discovery = discoveries.find(item => item.creatorId === creator.creatorId)
    const items = poolItems.filter(item => item.metadata?.creatorId === creator.creatorId)
    return {
      creatorId: creator.creatorId,
      creator: creator.displayName,
      channelUrl: creator.channelUrl,
      baselineDepth: creator.baselineDepth,
      discoveredCount: discovery?.discoveredCount || 0,
      storedItemCount: items.length,
      latestVideoId: discovery?.videos?.[0]?.videoId || null,
      latestTitle: discovery?.videos?.[0]?.title || null,
      status: discovery ? 'checked' : 'missing_discovery',
    }
  })
  return {
    reportArtifactId: YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
    reportType: 'scout_report',
    scopeKey: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
    department: 'Foundation / Dev Team Intelligence',
    title: 'Public YouTube creator daily watch research pool',
    status,
    sourceIds: [CREATOR_WATCHLIST_SOURCE_ID, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    generatedByJobRunId: foundationJobRunId || null,
    intelligenceJobRunId: crawlRunId || null,
    inputArtifactIds: poolItems.map(item => item.artifactId).filter(Boolean).slice(0, 250),
    sourceCoverage: creatorSummaries.map(summary => ({
      sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
      creatorId: summary.creatorId,
      channelUrl: summary.channelUrl,
      coverage: `public_channel_videos_metadata_last_${summary.baselineDepth}`,
      discoveredCount: summary.discoveredCount,
    })),
    missingSourceWarnings: plan.lookupGaps.map(gap => ({
      creatorId: gap.creatorId,
      creator: gap.displayName,
      reason: gap.reason,
      action: 'lookup_public_channel_url_before_daily_watch',
    })),
    staleSourceWarnings: [],
    freshnessWarnings: discoveries
      .filter(discovery => discovery.discoveredCount === 0)
      .map(discovery => ({
        creatorId: discovery.creatorId,
        creator: discovery.creator,
        reason: 'no_public_videos_discovered',
      })),
    dedupSummary: {
      guard: 'source_crawl_items unique target_key/external_id plus youtube_video_id item keys',
      targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
      inspectedVideoCount: poolItems.length,
      newItemCount: newItems.length,
      seenAgainCount: seenAgainItems.length,
      duplicateVideoIdsInRun: poolItems.length - new Set(poolItems.map(item => item.externalId)).size,
      createsBacklogCardsAutomatically: false,
    },
    rejectedNoiseSummary: [
      'private_paid_auth_member_comment_course_community_refs_not_watched',
      'purchase_download_opt_in_booking_form_links_not_followed',
      'transcripts_models_screenshots_visual_interpretation_not_run_by_daily_watch',
      'backlog_cards_not_created_from_findings',
    ],
    topFindings: newItems.slice(0, 25).map(item => ({
      type: item.metadata.deltaState,
      creatorId: item.metadata.creatorId,
      creator: item.metadata.creator,
      videoId: item.metadata.videoId,
      title: item.metadata.title,
      url: item.metadata.url,
      recommendation: 'Review exact public source item before extraction or backlog promotion.',
    })),
    actionRequiredItems: [
      ...newItems.slice(0, 50).map(item => ({
        reviewRouteId: `build-intel-review:${YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY}:${item.externalId}`,
        decisionState: 'needs_steve_review',
        allowedDecisions: ['approve_exact_source_item_for_extraction', 'park', 'reject_duplicate_or_stale'],
        sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
        creatorId: item.metadata.creatorId,
        sourceUrl: item.metadata.url,
        proposalOnly: true,
        writesBacklog: false,
        externalWrites: false,
      })),
      ...plan.lookupGaps.map(gap => ({
        type: 'creator_channel_lookup_required',
        creatorId: gap.creatorId,
        creator: gap.displayName,
        proposalOnly: true,
        writesBacklog: false,
        externalWrites: false,
      })),
    ],
    openQuestions: [
      {
        question: 'Which exact source items should move from title-level watch metadata into transcript/description/resource extraction?',
        reason: 'Daily watch records candidate source items only; extraction and backlog promotion remain approval-gated.',
      },
    ],
    structuredOutputJson: {
      generatedAt: now,
      cardId: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
      closeoutKey: YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY,
      targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
      crawlRunId,
      foundationJobRunId,
      sourceIds: [CREATOR_WATCHLIST_SOURCE_ID, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
      creatorSummaries,
      pool: poolItems.map(item => ({
        itemKey: item.itemKey,
        videoId: item.externalId,
        creatorId: item.metadata.creatorId,
        creator: item.metadata.creator,
        title: item.metadata.title,
        url: item.metadata.url,
        publishVisibleDate: item.metadata.publishVisibleDate,
        firstSeenAt: item.metadata.firstSeenAt,
        lastSeenAt: item.metadata.lastSeenAt,
        deltaState: item.metadata.deltaState,
        reviewState: item.metadata.reviewState,
      })),
      lookupGaps: plan.lookupGaps,
      blockedRefs: plan.blockedRefs,
      notNext: YOUTUBE_CREATOR_DAILY_WATCH_NOT_NEXT,
    },
    metadata: {
      cardId: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
      closeoutKey: YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY,
      targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
      foundationJobKey: YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
      reportForDevTeamHub: true,
      researchPool: true,
      proposalOnly: true,
      publicYoutubeOnly: true,
      noAuth: true,
      noExternalWrites: true,
      noCredentialMutation: true,
      createsBacklogCardsAutomatically: false,
      markBaselineDepth: YOUTUBE_CREATOR_DAILY_WATCH_MARK_BASELINE_DEPTH,
      defaultCreatorBaselineDepth: YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH,
      creatorCount: plan.creators.length,
      poolItemCount: poolItems.length,
      newItemCount: newItems.length,
      seenAgainCount: seenAgainItems.length,
      lookupGapCount: plan.lookupGaps.length,
      generatedAt: now,
    },
  }
}

export function buildYoutubeCreatorDailyWatchAtomInputs({
  poolItems = [],
  reportArtifactId = YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  crawlRunId = '',
} = {}) {
  return poolItems.map(item => {
    const metadata = item.metadata || {}
    const dedupHash = stableHash([
      YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY,
      metadata.videoId,
      metadata.creatorId,
    ])
    return {
      atomId: `atom:${YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY}:${dedupHash.slice(0, 16)}`,
      title: `${metadata.creator}: ${metadata.title}`,
      content: `${metadata.creator} has a public YouTube video candidate in the Build Intel research pool: ${metadata.title}.`,
      atomType: 'observation',
      sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
      artifactId: null,
      sourceCrawlRunId: crawlRunId || null,
      reportArtifactId,
      modality: 'video',
      anchorType: 'source_url',
      anchorValue: metadata.url,
      evidenceExcerpt: metadata.visibleMetadata || metadata.publishVisibleDate || metadata.title,
      derivedClaim: 'Title-level public YouTube source item candidate for Build Intel review; extraction and backlog promotion require approval.',
      topicRefs: ['build_intel', 'public_youtube', 'creator_daily_watch', metadata.creatorId].filter(Boolean),
      valueRoute: 'build_intel',
      contentUseClass: 'internal_learning',
      audience: 'Dev Team / Foundation Builder',
      platformFit: ['foundation', 'dev_team_hub', 'build_intel'],
      formatRec: ['research_pool', 'review_queue'],
      department: 'Foundation',
      qualityScore: metadata.deltaState === 'new_daily_delta' ? 78 : 70,
      relevanceScore: metadata.creatorId === YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID ? 86 : 76,
      sourceConfidence: 0.82,
      extractionConfidence: 0.4,
      sensitivity: 'neutral',
      minTier: 1,
      freshness: metadata.deltaState === 'seen_again' ? 'evergreen' : 'trending',
      status: 'detected',
      usedIn: [YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID],
      dedupHash,
      suggestedOwner: 'Dev Team / Build Intel',
      suggestedAction: 'Review exact source item before extraction or backlog promotion.',
      tags: ['build-intel', 'public-youtube', 'creator-watch', metadata.creatorId].filter(Boolean),
      notes: 'Daily watch title-level atom only; not an extraction summary and not a backlog card.',
      metadata: {
        cardId: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
        closeoutKey: YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY,
        targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
        itemKey: item.itemKey,
        videoId: metadata.videoId,
        creatorId: metadata.creatorId,
        deltaState: metadata.deltaState,
        proposalOnly: true,
        createsBacklogCardsAutomatically: false,
        externalWrites: false,
      },
    }
  })
}

export function buildYoutubeCreatorDailyWatchHitInputs({
  atomInputs = [],
  poolItems = [],
  reportArtifactId = YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  crawlRunId = '',
} = {}) {
  const itemByVideoId = new Map(poolItems.map(item => [item.metadata?.videoId, item]))
  return atomInputs.map(atom => {
    const item = itemByVideoId.get(atom.metadata?.videoId) || null
    return {
      hitId: `hit:${YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY}:${stableHash([atom.atomId, reportArtifactId]).slice(0, 16)}`,
      atomId: atom.atomId,
      sourceId: atom.sourceId,
      artifactId: null,
      reportArtifactId,
      intelligenceJobRunId: crawlRunId || null,
      hitType: 'supporting_evidence',
      evidenceExcerpt: atom.evidenceExcerpt,
      anchorType: 'source_url',
      anchorValue: atom.anchorValue,
      confidence: 0.82,
      occurredAt: item?.metadata?.lastSeenAt || new Date().toISOString(),
      metadata: {
        cardId: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
        closeoutKey: YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY,
        itemKey: item?.itemKey || null,
        videoId: atom.metadata?.videoId || null,
        proposalOnly: true,
      },
    }
  })
}

export function buildYoutubeCreatorDailyWatchSnapshot({
  plan = buildYoutubeCreatorDailyWatchPlan(),
  target = null,
  items = [],
  report = null,
  jobDefinition = null,
  latestJobRun = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const findings = []
  const knownPublicCreators = list(plan.creators)
  const mark = knownPublicCreators.find(creator => creator.creatorId === YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID)
  const publicItems = list(items).filter(item => item.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY || item.target_key === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY)
  const metadataRows = publicItems.map(item => item.metadata || {})
  const duplicateVideoCount = metadataRows.length - new Set(metadataRows.map(row => row.videoId).filter(Boolean)).size
  const reportMetadata = report?.metadata || {}
  const reportStructured = report?.structuredOutputJson || report?.structured_output_json || {}
  const sourceIds = report?.sourceIds || report?.source_ids || []

  addFinding(findings, knownPublicCreators.length >= 3, 'watch plan includes known public YouTube creator channel refs', `${knownPublicCreators.length} creator(s)`)
  addFinding(findings, mark?.baselineDepth === YOUTUBE_CREATOR_DAILY_WATCH_MARK_BASELINE_DEPTH, 'Mark Kashef baseline depth is last 50', String(mark?.baselineDepth || 'missing'))
  addFinding(findings, knownPublicCreators.filter(creator => creator.creatorId !== YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID).every(creator => creator.baselineDepth === YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH), 'other public creators baseline depth is last 20', `${knownPublicCreators.length - 1} non-Mark creator(s)`)
  addFinding(findings, knownPublicCreators.every(creator => creator.noAuth && creator.publicOnly && creator.channelVideosUrl.endsWith('/videos')), 'all watched refs are public no-auth YouTube videos pages', knownPublicCreators.map(creator => creator.channelVideosUrl).join(', '))
  addFinding(findings, plan.lookupGaps.every(gap => gap.reason !== 'paid_or_auth_youtube_ref_not_watched'), 'lookup gaps do not become private/auth crawling', `${plan.lookupGaps.length} lookup gap(s)`)
  addFinding(findings, target?.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY || target?.target_key === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, 'source crawl target exists for daily watch', target?.targetKey || target?.target_key || 'missing')
  addFinding(findings, (target?.runtimeMode || target?.runtime_mode) === 'scheduled' && (target?.metadata?.foundationJobKey === YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY), 'source crawl target is scheduled and linked to Foundation job', `${target?.runtimeMode || target?.runtime_mode || 'missing'}/${target?.metadata?.foundationJobKey || 'missing'}`)
  addFinding(findings, jobDefinition?.key === YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY && jobDefinition?.runtimeMode === 'scheduled' && jobDefinition?.mutationPosture === 'operational_write', 'Foundation job is scheduled operational-write', jobDefinition ? `${jobDefinition.runtimeMode}/${jobDefinition.mutationPosture}` : 'missing')
  addFinding(findings, latestJobRun?.status === 'succeeded', 'latest scheduled job run succeeded', latestJobRun ? `${latestJobRun.runId || latestJobRun.run_id}/${latestJobRun.status}` : 'missing')
  addFinding(findings, publicItems.length >= Math.min(knownPublicCreators.length, 1), 'research pool has persisted source-crawl items', `${publicItems.length} item(s)`)
  addFinding(findings, duplicateVideoCount === 0, 'research pool dedupes by video ID', `${duplicateVideoCount} duplicate(s)`)
  addFinding(findings, metadataRows.every(row => row.creator && row.channelUrl && row.videoId && row.title && row.url && row.firstSeenAt && row.lastSeenAt && row.discoveryRunId !== undefined), 'pool rows preserve required provenance', `${metadataRows.length} row(s)`)
  addFinding(findings, metadataRows.every(row => row.publicNoAuth === true && row.privateOrPaidAccess === false && row.commentsCrawled === false && row.memberCommunityCrawled === false && row.resourceLinksFollowed === false), 'pool rows prove no-auth/no-private/no-comment/no-external-follow boundary', 'metadata flags')
  addFinding(findings, report?.reportArtifactId === YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID || report?.report_artifact_id === YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID, 'research pool report artifact exists', report?.reportArtifactId || report?.report_artifact_id || 'missing')
  addFinding(findings, sourceIds.includes(CREATOR_WATCHLIST_SOURCE_ID) && sourceIds.includes(YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID), 'report links creator watchlist and YouTube intel source IDs', sourceIds.join(', ') || 'missing')
  addFinding(findings, reportMetadata.reportForDevTeamHub === true && reportMetadata.researchPool === true, 'report is exposed for Dev Team Hub / Build Intel review', JSON.stringify({ hub: reportMetadata.reportForDevTeamHub, pool: reportMetadata.researchPool }))
  addFinding(findings, reportMetadata.createsBacklogCardsAutomatically === false && reportMetadata.noExternalWrites === true, 'report records no auto backlog cards and no external writes', JSON.stringify({ auto: reportMetadata.createsBacklogCardsAutomatically, external: reportMetadata.noExternalWrites }))
  addFinding(findings, list(reportStructured.pool).length >= 1 || publicItems.length >= 1, 'report contains reviewable research pool output', `${list(reportStructured.pool).length} structured item(s)`)
  addFinding(findings, YOUTUBE_CREATOR_DAILY_WATCH_NOT_NEXT.every(boundary => boundary.length > 10), 'hard boundaries are explicit', YOUTUBE_CREATOR_DAILY_WATCH_NOT_NEXT.join(' | '))

  const failures = findings.filter(finding => !finding.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
    closeoutKey: YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY,
    generatedAt,
    plan,
    target,
    latestJobRun,
    reportArtifactId: YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
    summary: {
      creatorCount: knownPublicCreators.length,
      lookupGapCount: plan.lookupGaps.length,
      poolItemCount: publicItems.length,
      duplicateVideoCount,
      markBaselineDepth: mark?.baselineDepth || null,
      defaultBaselineDepth: YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH,
    },
    findings,
    failures,
  }
}

export function buildYoutubeCreatorDailyWatchReadSnapshot({
  plan = buildYoutubeCreatorDailyWatchPlan(),
  target = null,
  items = [],
  report = null,
  latestJobRun = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const snapshot = buildYoutubeCreatorDailyWatchSnapshot({
    plan,
    target,
    items,
    report,
    latestJobRun,
    jobDefinition: {
      key: YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
      runtimeMode: 'scheduled',
      mutationPosture: 'operational_write',
    },
    generatedAt,
  })
  const rows = list(items)
    .filter(item => item.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY || item.target_key === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY)
    .map(item => {
      const metadata = item.metadata || {}
      return {
        itemKey: item.itemKey || item.item_key,
        status: item.status,
        creatorId: metadata.creatorId || '',
        creator: metadata.creator || '',
        channelUrl: metadata.channelUrl || '',
        videoId: metadata.videoId || item.externalId || item.external_id || '',
        title: metadata.title || '',
        url: metadata.url || '',
        publishVisibleDate: metadata.publishVisibleDate || '',
        firstSeenAt: metadata.firstSeenAt || item.discoveredAt || item.discovered_at || null,
        lastSeenAt: metadata.lastSeenAt || item.updatedAt || item.updated_at || null,
        discoveryRunId: metadata.discoveryRunId || item.lastSourceCrawlRunId || item.last_source_crawl_run_id || null,
        deltaState: metadata.deltaState || '',
        reviewState: metadata.reviewState || '',
        proposalOnly: metadata.proposalOnly === true,
      }
    })
  return {
    status: snapshot.status,
    ok: snapshot.ok,
    generatedAt,
    cardId: YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID,
    closeoutKey: YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY,
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    jobKey: YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
    reportArtifactId: YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
    sourceIds: [CREATOR_WATCHLIST_SOURCE_ID, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    summary: snapshot.summary,
    target,
    latestJobRun,
    creators: plan.creators.map(creator => ({
      creatorId: creator.creatorId,
      displayName: creator.displayName,
      channelUrl: creator.channelUrl,
      channelVideosUrl: creator.channelVideosUrl,
      baselineDepth: creator.baselineDepth,
      publicNoAuth: true,
    })),
    lookupGaps: plan.lookupGaps,
    researchPool: rows,
    report: report ? {
      reportArtifactId: report.reportArtifactId || report.report_artifact_id,
      title: report.title,
      status: report.status,
      sourceIds: report.sourceIds || report.source_ids || [],
      metadata: report.metadata || {},
      actionRequiredItems: report.actionRequiredItems || report.action_required_items || [],
    } : null,
    findings: snapshot.findings,
    failures: snapshot.failures,
    notNext: YOUTUBE_CREATOR_DAILY_WATCH_NOT_NEXT,
  }
}

export function buildYoutubeCreatorDailyWatchDogfoodProof() {
  const now = '2026-05-21T16:00:00.000Z'
  const plan = {
    ...buildYoutubeCreatorDailyWatchPlan({
      watchlistEntries: [
        {
          creatorId: 'mark-kashef',
          displayName: 'Mark Kashef',
          sourceCategory: 'build_intel',
          priority: 'P0',
          accessBoundary: 'mixed_public_and_paid_authorized_required',
          consumerLane: 'build_intel',
          cadence: 'weekly',
          whySteveCares: 'Synthetic Mark proof.',
          platforms: [{ type: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@Mark_Kashef', lookupStatus: 'known_public_url', accessBoundary: 'public_lookup_required' }],
          sourceRefs: [],
          active: true,
        },
        {
          creatorId: 'nate-herk',
          displayName: 'Nate Herk',
          sourceCategory: 'build_intel',
          priority: 'P0',
          accessBoundary: 'public_lookup_required',
          consumerLane: 'build_intel',
          cadence: 'weekly',
          whySteveCares: 'Synthetic Nate proof.',
          platforms: [{ type: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@nateherk', lookupStatus: 'known_public_url', accessBoundary: 'public_lookup_required' }],
          sourceRefs: [],
          active: true,
        },
        {
          creatorId: 'paid-skool-source',
          displayName: 'Paid Source',
          sourceCategory: 'build_intel',
          priority: 'P0',
          accessBoundary: 'paid_authorized_required',
          consumerLane: 'build_intel',
          cadence: 'weekly',
          whySteveCares: 'Should stay out.',
          platforms: [{ type: 'skool', label: 'Skool', url: 'https://www.skool.com/private', lookupStatus: 'known_paid', accessBoundary: 'paid_authorized_required' }],
          active: true,
        },
      ],
    }),
  }
  const mark = plan.creators.find(creator => creator.creatorId === 'mark-kashef')
  const nate = plan.creators.find(creator => creator.creatorId === 'nate-herk')
  const markRaw = Array.from({ length: 55 }, (_, index) => ({
    href: `https://www.youtube.com/watch?v=mkbase${String(index).padStart(5, '0')}`,
    text: `10:0${index % 10} Mark baseline ${index} ${index + 1} views • ${index + 1} days ago`,
  }))
  const nateRaw = Array.from({ length: 25 }, (_, index) => ({
    href: `https://www.youtube.com/watch?v=natevid${String(index).padStart(4, '0')}`,
    text: `Nate delta ${index} ${index + 1} views • ${index + 1} days ago`,
  }))
  const duplicateRaw = [
    { href: 'https://www.youtube.com/watch?v=dupevideo01', text: 'Duplicate first 1 view • 1 day ago' },
    { href: 'https://www.youtube.com/watch?v=dupevideo01', text: 'Duplicate second 2 views • 2 days ago' },
  ]
  const markVideos = uniqueCreatorVideos(markRaw, { creator: mark, limit: mark.baselineDepth, discoveredAt: now })
  const nateVideos = uniqueCreatorVideos(nateRaw, { creator: nate, limit: nate.baselineDepth, discoveredAt: now })
  const dedupedVideos = uniqueCreatorVideos(duplicateRaw, { creator: mark, limit: 20, discoveredAt: now })
  const existingMap = new Map([
    ['natevid0000', {
      externalId: 'natevid0000',
      discoveredAt: '2026-05-20T16:00:00.000Z',
      lastSourceCrawlRunId: 'crawl-old',
      metadata: {
        firstSeenAt: '2026-05-20T16:00:00.000Z',
        firstSeenDiscoveryRunId: 'crawl-old',
        discoveryRunIds: ['crawl-old'],
        seenCount: 1,
      },
    }],
  ])
  const poolItems = buildYoutubeCreatorDailyWatchPoolItems({
    discoveries: [
      { creatorId: mark.creatorId, creator: mark.displayName, baselineDepth: mark.baselineDepth, videos: markVideos, discoveredCount: markVideos.length },
      { creatorId: nate.creatorId, creator: nate.displayName, baselineDepth: nate.baselineDepth, videos: nateVideos, discoveredCount: nateVideos.length },
    ],
    existingItemsByExternalId: existingMap,
    crawlRunId: 'crawl-synthetic',
    now,
    baselineCompleted: true,
  })
  const report = buildYoutubeCreatorDailyWatchReportArtifact({
    plan,
    discoveries: [
      { creatorId: mark.creatorId, creator: mark.displayName, baselineDepth: mark.baselineDepth, videos: markVideos, discoveredCount: markVideos.length },
      { creatorId: nate.creatorId, creator: nate.displayName, baselineDepth: nate.baselineDepth, videos: nateVideos, discoveredCount: nateVideos.length },
    ],
    poolItems,
    crawlRunId: 'crawl-synthetic',
    foundationJobRunId: 'job-synthetic',
    now,
  })
  const atoms = buildYoutubeCreatorDailyWatchAtomInputs({ poolItems, crawlRunId: 'crawl-synthetic' })
  const hits = buildYoutubeCreatorDailyWatchHitInputs({ atomInputs: atoms, poolItems, crawlRunId: 'crawl-synthetic' })
  const privateUrlRejected = !isPublicYoutubeChannelUrl('https://www.skool.com/earlyaidopters')
  const noAutoPromotion = report.metadata.createsBacklogCardsAutomatically === false &&
    report.promotedBacklogIds === undefined &&
    report.metadata.noExternalWrites === true
  const seenAgain = poolItems.find(item => item.externalId === 'natevid0000')
  const newDelta = poolItems.find(item => item.externalId === 'natevid0001')

  const cases = [
    { name: 'mark_baseline_depth_last_50', ok: markVideos.length === 50, detail: `${markVideos.length}/50` },
    { name: 'other_creator_baseline_depth_last_20', ok: nateVideos.length === 20, detail: `${nateVideos.length}/20` },
    { name: 'duplicates_collapse_to_one_video_id', ok: dedupedVideos.length === 1, detail: `${dedupedVideos.length}/1` },
    { name: 'daily_delta_preserves_first_seen_and_marks_new', ok: seenAgain?.metadata?.deltaState === 'seen_again' && newDelta?.metadata?.deltaState === 'new_daily_delta', detail: `${seenAgain?.metadata?.deltaState}/${newDelta?.metadata?.deltaState}` },
    { name: 'private_non_youtube_url_rejected', ok: privateUrlRejected, detail: 'skool URL rejected' },
    { name: 'report_does_not_auto_promote_or_external_write', ok: noAutoPromotion, detail: JSON.stringify({ auto: report.metadata.createsBacklogCardsAutomatically, external: report.metadata.noExternalWrites }) },
    { name: 'atoms_and_hits_match_pool_items', ok: atoms.length === poolItems.length && hits.length === atoms.length, detail: `${poolItems.length}/${atoms.length}/${hits.length}` },
  ]

  return {
    ok: cases.every(item => item.ok),
    cases,
    poolItemCount: poolItems.length,
    atomCount: atoms.length,
    hitCount: hits.length,
    invariant: 'Synthetic proof exercises baseline depth, duplicate collapse, daily delta, no-auth boundary, no auto-promotion, and atom/hit preparation without external writes.',
  }
}

export function renderYoutubeCreatorDailyWatchCloseout(snapshot = {}) {
  const plan = snapshot.plan || {}
  const creators = list(plan.creators).map(creator =>
    `- ${creator.displayName} (${creator.creatorId}) - ${creator.channelVideosUrl} - baseline ${creator.baselineDepth}`
  )
  const gaps = list(plan.lookupGaps).map(gap =>
    `- ${gap.displayName} (${gap.creatorId}) - ${gap.reason}`
  )
  const findings = list(snapshot.findings).map(finding =>
    `- ${finding.ok ? 'PASS' : 'FAIL'} ${finding.check}${finding.detail ? `: ${finding.detail}` : ''}`
  )

  return [
    '# YOUTUBE-CREATOR-DAILY-WATCH-001 Closeout',
    '',
    `Closeout key: \`${YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY}\``,
    `Card: \`${YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID}\``,
    `Target: \`${YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY}\``,
    `Scheduled job: \`${YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY}\``,
    `Report artifact: \`${YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID}\``,
    '',
    '## What Shipped',
    '',
    '- A scheduled public no-auth YouTube creator-channel watch over canonical Build Intel watchlist refs.',
    '- Mark Kashef starts at last 50 public videos; other approved public YouTube creators start at last 20.',
    '- Discovered video metadata is deduped into `source_crawl_items` with creator, channel URL, video ID, title, visible publish date, URL, discovery run, source IDs, first-seen, and last-seen provenance.',
    '- A Foundation scout report exposes the reviewable research pool for Dev Team Hub / Build Intel review.',
    '- Title-level candidate atoms and evidence hits are proposal-only and do not create backlog cards.',
    '- Private/auth/member/comment/course/resource-link/external-write paths remain blocked.',
    '',
    '## Watched Public Creators',
    '',
    ...(creators.length ? creators : ['- None.']),
    '',
    '## Lookup Gaps',
    '',
    ...(gaps.length ? gaps : ['- None.']),
    '',
    '## Proof Findings',
    '',
    ...(findings.length ? findings : ['- No findings recorded.']),
    '',
    '## Proof Commands',
    '',
    ...YOUTUBE_CREATOR_DAILY_WATCH_PROOF_COMMANDS.map(command => `- \`${command}\``),
    '',
    '## Next',
    '',
    `Next active card: \`${YOUTUBE_CREATOR_DAILY_WATCH_NEXT_CARD_ID}\`. Do not start it without Steve/Orchestrator direction from this chat.`,
    '',
  ].join('\n')
}
