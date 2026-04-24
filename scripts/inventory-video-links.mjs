#!/usr/bin/env node

import { createHash } from 'node:crypto'
import process from 'node:process'
import {
  closeFoundationDb,
  getSharedCommunicationArtifactsForProcessing,
  initFoundationDb,
  listSourceCrawlItems,
  upsertSourceCrawlItem,
  upsertSourceCrawlTarget,
} from '../lib/foundation-db.js'

const TARGET_KEY = 'video-link-inventory'
const SOURCE_ID = 'SRC-VIDEO-001'
const VIDEO_HOSTS = new Set(['loom', 'google_drive', 'youtube', 'vimeo', 'wistia', 'zoom', 'skool'])

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

function hashText(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function safeKeyPart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, '_')
    .slice(0, 120)
}

function trimUrl(rawUrl) {
  return String(rawUrl || '')
    .trim()
    .replace(/[),.;\]}>"']+$/g, '')
}

function normalizeUrl(rawUrl) {
  const trimmed = trimUrl(rawUrl)
  try {
    const url = new URL(trimmed)
    url.hash = ''
    for (const param of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(param) || ['fbclid', 'gclid'].includes(param.toLowerCase())) {
        url.searchParams.delete(param)
      }
    }
    return url.toString()
  } catch {
    return trimmed
  }
}

function classifyUrl(rawUrl) {
  const normalizedUrl = normalizeUrl(rawUrl)
  let parsed
  try {
    parsed = new URL(normalizedUrl)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  const path = parsed.pathname
  let platform = 'other'
  let externalVideoId = ''
  let extractionStatus = 'link_inventory_only'
  let valueRoute = 'video_source'
  let ownershipClass = 'unknown'

  if (host === 'loom.com' || host.endsWith('.loom.com')) {
    platform = 'loom'
    const match = path.match(/\/(?:share|embed)\/([a-zA-Z0-9]+)/)
    externalVideoId = match?.[1] || ''
    extractionStatus = 'pending_loom_access_review'
    valueRoute = 'loom_source'
  } else if (host === 'drive.google.com' || host === 'docs.google.com') {
    platform = 'google_drive'
    const fileMatch = path.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([^/]+)/)
    externalVideoId = fileMatch?.[1] || ''
    extractionStatus = 'pending_drive_resolution'
    valueRoute = 'drive_media_or_doc_source'
    ownershipClass = 'workspace_owned_possible'
  } else if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    platform = 'youtube'
    externalVideoId = parsed.searchParams.get('v') || path.split('/').filter(Boolean).pop() || ''
    extractionStatus = 'pending_public_or_authorized_video_review'
    valueRoute = 'youtube_source'
  } else if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    platform = 'vimeo'
    externalVideoId = path.split('/').filter(Boolean).pop() || ''
    extractionStatus = 'pending_vimeo_access_review'
    valueRoute = 'vimeo_source'
  } else if (host.includes('wistia')) {
    platform = 'wistia'
    externalVideoId = path.split('/').filter(Boolean).pop() || ''
    extractionStatus = 'pending_wistia_access_review'
    valueRoute = 'wistia_source'
  } else if (host.endsWith('zoom.us')) {
    platform = 'zoom'
    externalVideoId = path.split('/').filter(Boolean).pop() || ''
    extractionStatus = 'pending_zoom_recording_review'
    valueRoute = 'zoom_source'
  } else if (host === 'skool.com' || host.endsWith('.skool.com')) {
    platform = 'skool'
    externalVideoId = parsed.searchParams.get('md') || path
    extractionStatus = 'source_link_inventory_only'
    valueRoute = 'skool_source'
  }

  if (!VIDEO_HOSTS.has(platform)) return null

  return {
    rawUrl: trimUrl(rawUrl),
    normalizedUrl,
    platform,
    host,
    externalVideoId,
    extractionStatus,
    valueRoute,
    ownershipClass,
  }
}

function extractVideoLinks(text) {
  const matches = String(text || '').match(/https?:\/\/[^\s<>"'`)\]}]+/g) || []
  const byUrl = new Map()
  for (const match of matches) {
    const classified = classifyUrl(match)
    if (!classified) continue
    byUrl.set(classified.normalizedUrl, classified)
  }
  return [...byUrl.values()]
}

function evidenceExcerpt(text, url) {
  const content = String(text || '')
  const index = content.indexOf(url)
  if (index < 0) return ''
  const start = Math.max(0, index - 180)
  const end = Math.min(content.length, index + url.length + 180)
  return content.slice(start, end).replace(/\s+/g, ' ').trim()
}

async function ensureVideoTarget(actor) {
  return upsertSourceCrawlTarget({
    targetKey: TARGET_KEY,
    sourceId: SOURCE_ID,
    title: 'Video link inventory lane',
    lane: 'corpus_mining',
    targetType: 'video_url_inventory',
    status: 'planned',
    priority: 'P1',
    runtimeMode: 'manual',
    cursorState: { cursorType: 'archive_scan_offset', lastScannedAt: new Date().toISOString() },
    budget: { maxArtifactsPerRun: 1000, maxRuntimeSeconds: 900, llmBudget: 'none' },
    dedupePolicy: { key: 'normalized_url', idempotent: true },
    metadata: {
      backlogIds: ['WEB-CRAWLER-001', 'EXTRACTION-TEAM-001'],
      sourceNote: 'docs/source-notes/video-link-inventory.md',
      platforms: [...VIDEO_HOSTS],
    },
    notes: 'System-owned inventory lane for Loom, Drive, YouTube, Vimeo, Wistia, Zoom, and Skool video/media links discovered inside existing archives.',
  }, actor)
}

async function recordVideoLink({ link, artifact, sourceKind, dryRun, actor }) {
  const urlHash = hashText(link.normalizedUrl)
  const itemKey = `video-link:${safeKeyPart(link.platform)}:${urlHash.slice(0, 24)}`
  const metadata = {
    ...link,
    sourceKind,
    discoveredFrom: artifact
      ? {
          artifactId: artifact.artifactId || null,
          sourceId: artifact.sourceId || null,
          artifactType: artifact.artifactType || null,
          title: artifact.title || '',
          artifactUpdatedAt: artifact.artifactUpdatedAt || null,
          artifactContentHash: artifact.contentHash || '',
        }
      : null,
    evidenceExcerpt: artifact?.contentText ? evidenceExcerpt(artifact.contentText, link.rawUrl) : '',
  }

  if (dryRun) return { itemKey, metadata }

  return upsertSourceCrawlItem({
    itemKey,
    targetKey: TARGET_KEY,
    sourceId: SOURCE_ID,
    externalId: link.normalizedUrl,
    itemType: 'video_link',
    status: 'succeeded',
    fingerprint: urlHash,
    attemptCount: 0,
    metadata,
    discoveredAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
  }, actor)
}

async function scanSharedArtifacts({ maxArtifacts, dryRun, actor }) {
  let offset = 0
  let scanned = 0
  let discovered = 0
  const byPlatform = {}
  const pageSize = Math.min(1000, Math.max(1, Math.min(maxArtifacts, 1000)))

  while (scanned < maxArtifacts) {
    const limit = Math.min(pageSize, maxArtifacts - scanned)
    const artifacts = await getSharedCommunicationArtifactsForProcessing({ limit, offset })
    if (!artifacts.length) break
    for (const artifact of artifacts) {
      scanned += 1
      const links = extractVideoLinks(artifact.contentText)
      for (const link of links) {
        await recordVideoLink({ link, artifact, sourceKind: 'shared_communication_artifact', dryRun, actor })
        discovered += 1
        byPlatform[link.platform] = (byPlatform[link.platform] || 0) + 1
      }
    }
    if (artifacts.length < limit) break
    offset += artifacts.length
  }

  return { scanned, discovered, byPlatform }
}

async function scanDriveInventory({ dryRun, actor }) {
  const items = await listSourceCrawlItems({ targetKey: 'drive-corpus-backfill', status: 'succeeded', limit: 200 })
  let scanned = 0
  let discovered = 0
  const byPlatform = {}

  for (const item of items) {
    scanned += 1
    const links = []
    const webViewLink = item.metadata?.webViewLink
    const mimeType = String(item.metadata?.mimeType || '')
    if (webViewLink && (mimeType.includes('video') || mimeType.includes('presentation') || mimeType.includes('document'))) {
      const classified = classifyUrl(webViewLink)
      if (classified) links.push(classified)
    }
    for (const link of links) {
      await recordVideoLink({
        link,
        artifact: {
          artifactId: item.itemKey,
          sourceId: item.sourceId,
          artifactType: item.itemType,
          title: item.metadata?.name || item.externalId,
          artifactUpdatedAt: item.metadata?.modifiedTime || item.updatedAt,
          contentHash: item.fingerprint || '',
          contentText: '',
        },
        sourceKind: 'drive_corpus_inventory',
        dryRun,
        actor,
      })
      discovered += 1
      byPlatform[link.platform] = (byPlatform[link.platform] || 0) + 1
    }
  }

  return { scanned, discovered, byPlatform }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const dryRun = boolValue(args.dryRun)
  const maxArtifacts = Math.min(10000, Math.max(1, Number(args.maxArtifacts || args.limit || 1000) || 1000))
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'video-link-inventory').trim()

  console.log('Inventory video/media links from existing archives')
  console.log(`  Target: ${TARGET_KEY}`)
  console.log(`  Max artifacts: ${maxArtifacts}`)
  console.log(`  Dry run: ${dryRun}`)

  await initFoundationDb()
  if (!dryRun) await ensureVideoTarget(actor)

  const shared = await scanSharedArtifacts({ maxArtifacts, dryRun, actor })
  const drive = await scanDriveInventory({ dryRun, actor })

  const combined = {}
  for (const source of [shared.byPlatform, drive.byPlatform]) {
    for (const [platform, count] of Object.entries(source)) {
      combined[platform] = (combined[platform] || 0) + count
    }
  }

  console.log(`  Shared artifacts scanned: ${shared.scanned}`)
  console.log(`  Drive inventory items scanned: ${drive.scanned}`)
  console.log(`  Video/media links discovered: ${shared.discovered + drive.discovered}`)
  console.log(`  By platform: ${JSON.stringify(combined)}`)
}

main()
  .catch(error => {
    console.error('Video link inventory failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
