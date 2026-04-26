#!/usr/bin/env node

import { createHash } from 'node:crypto'
import process from 'node:process'
import {
  closeFoundationDb,
  initFoundationDb,
  listVideoContentExtractionQueue,
  upsertSharedCommunicationArtifact,
  upsertSourceCrawlItem,
} from '../lib/foundation-db.js'
import { getYouTubeSubtitles } from '../lib/dataforseo.js'

const DEFAULT_TARGET = 'video-content-extract-backfill'
const DEFAULT_INVENTORY_TARGET = 'video-link-inventory'
const EXTRACTOR_VERSION = 'video_content_youtube_subtitles_v1'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function boolValue(value) {
  return value === true || value === 'true'
}

function safeKeyPart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, '_')
    .slice(0, 180)
}

function sha256(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

function formatSeconds(seconds) {
  const total = Math.max(0, Number(seconds) || 0)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = Math.floor(total % 60)
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function getPlatform(item) {
  return String(item?.metadata?.platform || '').trim()
}

function parseYouTubeVideoId(rawUrl, metadata = {}) {
  const candidate = String(metadata.externalVideoId || '').trim()
  if (/^[a-zA-Z0-9_-]{6,20}$/.test(candidate) && !['videos', 'shorts', 'watch', 'channel'].includes(candidate)) {
    return candidate
  }

  let parsed = null
  try {
    parsed = new URL(String(rawUrl || '').trim())
  } catch {
    return ''
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  const pathParts = parsed.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') return pathParts[0] || ''
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const watchId = parsed.searchParams.get('v')
    if (watchId) return watchId
    if (['shorts', 'embed', 'live'].includes(pathParts[0])) return pathParts[1] || ''
  }

  return ''
}

function classifyVideoItem(item) {
  const platform = getPlatform(item)
  if (platform !== 'youtube') {
    return {
      supported: false,
      skipReason: `platform_extractor_not_in_v1:${platform || 'unknown'}`,
    }
  }

  const videoId = parseYouTubeVideoId(item.externalId, item.metadata)
  if (!videoId) {
    return {
      supported: false,
      skipReason: 'youtube_channel_or_profile_routed_to_creator_watchlist',
    }
  }

  return {
    supported: true,
    videoId,
    extractionMethod: 'dataforseo_youtube_subtitles_v1',
    artifactSourceId: 'SRC-YOUTUBE-INTEL-001',
  }
}

function getExtractionItemKey(item) {
  return `video-content:${safeKeyPart(getPlatform(item))}:${safeKeyPart(item.externalId)}`
}

function buildArtifactId(item, classification) {
  return `${classification.artifactSourceId}:video_transcript:${safeKeyPart(classification.videoId)}`
}

function getSubtitleResult(task) {
  const results = Array.isArray(task?.result) ? task.result : []
  return results.find(result => Array.isArray(result?.items)) || results[0] || {}
}

function formatSubtitleText(result) {
  const items = Array.isArray(result?.items) ? result.items : []
  return items
    .map(item => {
      const text = normalizeText(item?.text || '')
      if (!text) return ''
      const start = formatSeconds(item?.start_time)
      const end = formatSeconds(item?.end_time)
      return `[${start}-${end}] ${text}`
    })
    .filter(Boolean)
    .join('\n')
}

function buildMetadata(item, classification, extra = {}) {
  return {
    sourceVideoInventoryItemKey: item.itemKey,
    sourceVideoInventoryExternalId: item.externalId,
    normalizedUrl: item.externalId,
    platform: getPlatform(item),
    videoId: classification.videoId || item.metadata?.externalVideoId || '',
    valueRoute: item.metadata?.valueRoute || '',
    ownershipClass: item.metadata?.ownershipClass || '',
    sourceKind: item.metadata?.sourceKind || '',
    discoveredFrom: item.metadata?.discoveredFrom || null,
    evidenceExcerpt: item.metadata?.evidenceExcerpt || '',
    extractorVersion: EXTRACTOR_VERSION,
    extractionMethod: classification.extractionMethod || null,
    officialApiBasis: ['DataForSEO YouTube Video Subtitles live advanced'],
    ...extra,
  }
}

function getRecoverableSkipReason(error) {
  const message = String(error?.message || error || '')
  if (message.includes('40102') || /No Search Results/i.test(message)) {
    return 'youtube_subtitles_unavailable_needs_video_vision_or_transcription'
  }
  return ''
}

async function markVideoSkipped({ item, targetKey, actor, reason, classification = {} }) {
  return upsertSourceCrawlItem(
    {
      itemKey: getExtractionItemKey(item),
      targetKey,
      sourceId: 'SRC-VIDEO-001',
      externalId: item.externalId,
      itemType: 'video_content_extraction',
      status: 'skipped',
      fingerprint: item.fingerprint || sha256(item.externalId),
      metadata: {
        ...buildMetadata(item, classification, {
          contentExtractionStatus: 'skipped',
          skipReason: reason,
        }),
      },
      discoveredAt: item.discoveredAt || new Date().toISOString(),
      processedAt: new Date().toISOString(),
    },
    actor,
  )
}

async function markVideoFailed({ item, targetKey, actor, error, classification = {} }) {
  const message = error instanceof Error ? error.message : String(error)
  return upsertSourceCrawlItem(
    {
      itemKey: getExtractionItemKey(item),
      targetKey,
      sourceId: 'SRC-VIDEO-001',
      externalId: item.externalId,
      itemType: 'video_content_extraction',
      status: 'failed',
      fingerprint: item.fingerprint || sha256(item.externalId),
      lastError: message,
      metadata: {
        ...buildMetadata(item, classification, {
          contentExtractionStatus: 'failed',
        }),
      },
      discoveredAt: item.discoveredAt || new Date().toISOString(),
      processedAt: new Date().toISOString(),
      incrementAttempt: true,
    },
    actor,
  )
}

async function archiveVideoTranscript({ item, targetKey, actor, classification, result, response, maxTextChars }) {
  const transcriptText = normalizeText(formatSubtitleText(result))
  if (!transcriptText) {
    await markVideoSkipped({
      item,
      targetKey,
      actor,
      reason: 'youtube_subtitles_unavailable_needs_video_vision_or_transcription',
      classification,
    })
    return { status: 'skipped', artifact: null, textChars: 0 }
  }

  const contentHash = sha256(transcriptText)
  const storedText = transcriptText.length > maxTextChars
    ? transcriptText.slice(0, maxTextChars)
    : transcriptText
  const truncated = storedText.length !== transcriptText.length
  const metadata = buildMetadata(item, classification, {
    extractionTargetKey: targetKey,
    title: result.title || '',
    subtitlesCount: result.subtitles_count || null,
    subtitleItemsCount: Array.isArray(result.items) ? result.items.length : 0,
    originalTextChars: transcriptText.length,
    storedTextChars: storedText.length,
    truncated,
    dataForSeoCostUsd: response.cost || null,
    dataForSeoTaskId: response.task?.id || null,
  })

  const artifact = await upsertSharedCommunicationArtifact(
    {
      artifactId: buildArtifactId(item, classification),
      sourceId: classification.artifactSourceId,
      artifactType: 'video_transcript',
      externalId: item.externalId,
      title: result.title || `YouTube transcript ${classification.videoId}`,
      sourceAccount: result.channel_name || result.channel_id || null,
      sourceContainer: 'YouTube / DataForSEO subtitles',
      sourceUrl: item.externalId,
      participants: result.channel_name ? [{ role: 'channel', value: result.channel_name }] : [],
      contentText: storedText,
      contentHash,
      artifactCreatedAt: null,
      artifactUpdatedAt: new Date().toISOString(),
      metadata,
    },
    actor,
  )

  await upsertSourceCrawlItem(
    {
      itemKey: getExtractionItemKey(item),
      targetKey,
      sourceId: 'SRC-VIDEO-001',
      externalId: item.externalId,
      itemType: 'video_content_extraction',
      status: 'succeeded',
      fingerprint: contentHash,
      artifactId: artifact.artifactId,
      metadata: {
        ...metadata,
        contentExtractionStatus: 'content_extracted',
        contentHash,
        artifactId: artifact.artifactId,
      },
      metadataDeleteKeys: ['skipReason'],
      discoveredAt: item.discoveredAt || new Date().toISOString(),
      processedAt: new Date().toISOString(),
    },
    actor,
  )

  return { status: 'succeeded', artifact, textChars: transcriptText.length }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const targetKey = String(args.target || args.crawlTarget || DEFAULT_TARGET).trim()
  const inventoryTargetKey = String(args.inventoryTarget || DEFAULT_INVENTORY_TARGET).trim()
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'video-content-extractor').trim()
  const limit = Math.min(100, Math.max(1, Number(args.limit || args.maxItems || 5) || 5))
  const maxTextChars = Math.max(10000, Number(args.maxTextChars || 250000) || 250000)
  const dryRun = boolValue(args.dryRun)
  const controlledByTargetRunner = boolValue(args.controlledByTargetRunner)

  if (!dryRun && !controlledByTargetRunner) {
    throw new Error(
      'Video content extraction writes artifacts and must be run through `npm run extraction:target -- --target=video-content-extract-backfill`.',
    )
  }

  await initFoundationDb()

  try {
    const items = await listVideoContentExtractionQueue({
      inventoryTargetKey,
      extractionTargetKey: targetKey,
      limit,
    })

    console.log('Video content extraction bite')
    console.log(`  Target: ${targetKey}`)
    console.log(`  Inventory target: ${inventoryTargetKey}`)
    console.log(`  Queue selected: ${items.length}`)

    if (dryRun) {
      console.log(JSON.stringify(items.map(item => ({
        itemKey: item.itemKey,
        externalId: item.externalId,
        platform: getPlatform(item),
        valueRoute: item.metadata?.valueRoute || '',
        sourceKind: item.metadata?.sourceKind || '',
        classification: classifyVideoItem(item),
      })), null, 2))
      return
    }

    let extracted = 0
    let skipped = 0
    let failures = 0
    let textChars = 0
    const processed = []

    for (const item of items) {
      const classification = classifyVideoItem(item)
      try {
        if (!classification.supported) {
          skipped += 1
          await markVideoSkipped({ item, targetKey, actor, reason: classification.skipReason, classification })
          processed.push({ externalId: item.externalId, status: 'skipped', reason: classification.skipReason })
          continue
        }

        const subtitles = await getYouTubeSubtitles(classification.videoId)
        const result = getSubtitleResult(subtitles.task)
        const archived = await archiveVideoTranscript({
          item,
          targetKey,
          actor,
          classification,
          result,
          response: subtitles,
          maxTextChars,
        })

        if (archived.status === 'succeeded') {
          extracted += 1
          textChars += archived.textChars
          processed.push({
            externalId: item.externalId,
            status: 'succeeded',
            artifactId: archived.artifact?.artifactId,
            textChars: archived.textChars,
          })
        } else {
          skipped += 1
          processed.push({ externalId: item.externalId, status: 'skipped', reason: 'youtube_subtitles_unavailable_needs_video_vision_or_transcription' })
        }
      } catch (error) {
        const recoverableSkipReason = getRecoverableSkipReason(error)
        if (recoverableSkipReason) {
          skipped += 1
          await markVideoSkipped({ item, targetKey, actor, reason: recoverableSkipReason, classification })
          processed.push({ externalId: item.externalId, status: 'skipped', reason: recoverableSkipReason })
          continue
        }

        failures += 1
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Video content extraction failed: ${item.externalId} ${message}`)
        await markVideoFailed({ item, targetKey, actor, error, classification })
        processed.push({ externalId: item.externalId, status: 'failed', error: message })
      }
    }

    const summary = {
      inspected: items.length,
      archived: extracted,
      extracted,
      skipped,
      itemFailures: failures,
      cursorState: {
        videoContentExtraction: {
          inventoryTargetKey,
          lastRunAt: new Date().toISOString(),
          lastSelectedCount: items.length,
          lastExtractedCount: extracted,
          lastSkippedCount: skipped,
          lastFailureCount: failures,
        },
      },
      metadata: {
        extractorVersion: EXTRACTOR_VERSION,
        maxTextChars,
        processed: processed.slice(0, 25),
      },
    }

    console.log(`Video content items inspected: ${items.length}`)
    console.log(`Video transcripts extracted: ${extracted}`)
    console.log(`Video content items skipped: ${skipped}`)
    console.log(`Crawl items failed: ${failures}`)
    console.log(`Extracted text chars: ${textChars}`)
    console.log(`EXTRACTION_TARGET_SUMMARY ${JSON.stringify(summary)}`)
    if (failures > 0) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Video content extraction failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
