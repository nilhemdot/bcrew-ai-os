#!/usr/bin/env node

import process from 'node:process'
import {
  closeFoundationDb,
  getExtractionControlSnapshot,
  initFoundationDb,
  upsertSourceCrawlItem,
} from '../lib/foundation-db.js'
import { GOOGLE_SCOPES, googleJsonFetch } from '../lib/google-delegated.js'

const DEFAULT_SOURCE_USER = process.env.GOOGLE_DRIVE_CORPUS_USER || 'steve.zahnd@bensoncrew.ca'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut'

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

function escapeDriveQueryLiteral(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function normalizeQueueItem(item) {
  if (!item) return null
  if (typeof item === 'string') {
    return { folderId: item, name: item, path: item, sensitivity: 'unknown' }
  }
  const folderId = String(item.folderId || item.id || '').trim()
  if (!folderId) return null
  return {
    folderId,
    name: String(item.name || folderId).trim(),
    path: String(item.path || item.name || folderId).trim(),
    sensitivity: String(item.sensitivity || 'unknown').trim(),
    parentFolderId: item.parentFolderId || null,
    pageToken: item.pageToken || null,
  }
}

function rootQueueFromTarget(target) {
  return (target.cursorState?.rootFolders || [])
    .map(item => normalizeQueueItem({
      ...item,
      path: item.name || item.folderId,
    }))
    .filter(Boolean)
}

function selectFolder(target, args) {
  if (args.folderId) {
    return {
      selected: normalizeQueueItem({
        folderId: args.folderId,
        name: args.folderName || args.folderId,
        path: args.folderName || args.folderId,
        sensitivity: args.sensitivity || 'manual',
        pageToken: args.pageToken || null,
      }),
      queue: [],
      inspectedFolderIds: new Set(target.cursorState?.driveInventory?.inspectedFolderIds || []),
    }
  }

  const driveInventory = target.cursorState?.driveInventory || {}
  const inspectedFolderIds = new Set(driveInventory.inspectedFolderIds || [])
  const currentQueue = Array.isArray(driveInventory.folderQueue)
    ? driveInventory.folderQueue.map(normalizeQueueItem).filter(Boolean)
    : []
  const seededQueue = currentQueue.length ? currentQueue : rootQueueFromTarget(target)
  const queue = seededQueue.filter(item => !inspectedFolderIds.has(item.folderId) || item.pageToken)
  const selected = queue.shift() || null
  return { selected, queue, inspectedFolderIds }
}

function classifyDriveItem(file, selectedFolder) {
  const name = String(file.name || '').toLowerCase()
  const mimeType = String(file.mimeType || '')
  let valueRoute = 'archive_only'
  let extractionStatus = 'metadata_only'
  let skipReason = 'v1_inventory_only'

  if (mimeType === FOLDER_MIME) {
    valueRoute = 'archive_only'
    extractionStatus = 'folder_discovered'
    skipReason = 'queued_for_later_folder_bite'
  } else if (mimeType === SHORTCUT_MIME) {
    extractionStatus = 'skipped'
    skipReason = 'shortcut_not_followed_in_v1'
  } else if (mimeType.includes('spreadsheet')) {
    extractionStatus = 'skipped'
    skipReason = 'sheet_not_exported_in_v1'
  } else if (mimeType.includes('presentation')) {
    valueRoute = 'presentation_system'
    extractionStatus = 'pending_future_extraction'
    skipReason = 'slides_not_exported_in_v1'
  } else if (mimeType.includes('video')) {
    valueRoute = 'youtube_source'
    extractionStatus = 'pending_future_video_review'
    skipReason = 'video_not_downloaded_in_v1'
  } else if (mimeType.includes('audio')) {
    extractionStatus = 'skipped'
    skipReason = 'audio_not_transcribed_in_v1'
  } else if (mimeType === 'application/pdf') {
    extractionStatus = 'pending_future_extraction'
    skipReason = 'pdf_not_exported_in_v1'
  } else if (mimeType.includes('document')) {
    extractionStatus = 'pending_future_text_export'
    skipReason = 'doc_text_export_deferred_in_v1'
  }

  if (name.includes('buyer')) valueRoute = 'buyer_course'
  if (name.includes('seller') || name.includes('listing')) valueRoute = 'seller_course'
  if (name.includes('presentation') || name.includes('script') || name.includes('pitch')) valueRoute = 'presentation_system'
  if (name.includes('training') || name.includes('course') || name.includes('lesson')) valueRoute = 'sales_training'
  if (name.includes('youtube') || name.includes('reel') || name.includes('content')) valueRoute = 'content_script'
  if (name.includes('recruit')) valueRoute = 'recruiting_proof'
  if (name.includes('houseable') || name.includes('crm') || name.includes('software')) valueRoute = 'software_product_ip'
  if (selectedFolder.sensitivity === 'owners_private' || name.includes('private')) valueRoute = 'sensitive_skip'
  if (selectedFolder.sensitivity === 'steve_marketmasters') valueRoute = 'marketmasters_training'
  if (selectedFolder.sensitivity === 'strategy_internal') valueRoute = 'strategy_evidence'
  if (selectedFolder.sensitivity === 'steve_owned_sensitive' && valueRoute === 'archive_only') valueRoute = 'unchained_monetization'

  return { valueRoute, extractionStatus, skipReason }
}

async function listFolderPage(userEmail, folderId, { pageSize, pageToken = '' } = {}) {
  const params = new URLSearchParams()
  params.set('q', `'${escapeDriveQueryLiteral(folderId)}' in parents and trashed = false`)
  params.set('pageSize', String(Math.min(100, Math.max(1, Number(pageSize) || 50))))
  params.set('supportsAllDrives', 'true')
  params.set('includeItemsFromAllDrives', 'true')
  params.set('orderBy', 'folder,name')
  params.set(
    'fields',
    [
      'nextPageToken',
      'files(id,name,mimeType,modifiedTime,createdTime,parents,webViewLink,size)',
      'files(owners(displayName,emailAddress))',
      'files(shortcutDetails(targetId,targetMimeType))',
    ].join(','),
  )
  if (pageToken) params.set('pageToken', pageToken)

  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  const data = await googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] })
  return {
    files: Array.isArray(data.files) ? data.files : [],
    nextPageToken: String(data.nextPageToken || '').trim() || null,
  }
}

async function recordDriveItem({ target, file, selectedFolder, actor }) {
  const classification = classifyDriveItem(file, selectedFolder)
  const modifiedTime = file.modifiedTime || file.createdTime || 'no-time'
  const externalId = `${file.id}:${modifiedTime}`
  const isFolder = file.mimeType === FOLDER_MIME
  const owner = Array.isArray(file.owners) && file.owners[0]
    ? {
        displayName: file.owners[0].displayName || null,
        emailAddress: file.owners[0].emailAddress || null,
      }
    : null

  return upsertSourceCrawlItem(
    {
      itemKey: `drive-corpus:${safeKeyPart(file.id)}:${safeKeyPart(modifiedTime)}`,
      targetKey: target.targetKey,
      sourceId: target.sourceId,
      externalId,
      itemType: isFolder ? 'drive_folder' : 'drive_file',
      status: 'succeeded',
      fingerprint: externalId,
      attemptCount: 0,
      metadata: {
        driveFileId: file.id,
        name: file.name || '',
        mimeType: file.mimeType || '',
        modifiedTime: file.modifiedTime || null,
        createdTime: file.createdTime || null,
        webViewLink: file.webViewLink || null,
        size: file.size || null,
        parents: file.parents || [],
        owner,
        parentFolderId: selectedFolder.folderId,
        parentFolderName: selectedFolder.name,
        parentPath: selectedFolder.path,
        sensitivity: selectedFolder.sensitivity,
        valueRoute: classification.valueRoute,
        extractionStatus: classification.extractionStatus,
        skipReason: classification.skipReason,
        shortcutDetails: file.shortcutDetails || null,
      },
      discoveredAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    },
    actor,
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const targetKey = String(args.target || args.crawlTarget || 'drive-corpus-backfill').trim()
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'drive-corpus-inventory').trim()
  const userEmail = String(args.user || args.sourceUser || DEFAULT_SOURCE_USER).trim()
  const maxItems = Math.min(100, Math.max(1, Number(args.maxItems || args.limit || 50) || 50))
  const dryRun = boolValue(args.dryRun)
  const controlledByTargetRunner = boolValue(args.controlledByTargetRunner)

  if (!dryRun && !controlledByTargetRunner) {
    throw new Error(
      'Drive corpus inventory writes crawl items and must be run through `npm run extraction:target -- --target=drive-corpus-backfill` so the target lease/cursor advances.',
    )
  }

  await initFoundationDb()

  try {
    const snapshot = await getExtractionControlSnapshot({ limit: 200 })
    const target = snapshot.targets.find(item => item.targetKey === targetKey)
    if (!target) throw new Error(`Unknown extraction target: ${targetKey}`)

    const { selected, queue, inspectedFolderIds } = selectFolder(target, args)
    if (!selected) {
      const summary = {
        inspected: 0,
        foldersDiscovered: 0,
        filesDiscovered: 0,
        itemFailures: 0,
        cursorState: {
          driveInventory: {
            ...(target.cursorState?.driveInventory || {}),
            completed: true,
            completedAt: new Date().toISOString(),
          },
        },
      }
      console.log('Drive corpus inventory: no remaining folder bite.')
      console.log(`EXTRACTION_TARGET_SUMMARY ${JSON.stringify(summary)}`)
      return
    }

    console.log('Drive corpus inventory bite')
    console.log(`  User: ${userEmail}`)
    console.log(`  Target: ${targetKey}`)
    console.log(`  Folder: ${selected.path} (${selected.folderId})`)
    if (selected.pageToken) console.log('  Page: continuing previous folder page')

    if (dryRun) {
      console.log(JSON.stringify({ targetKey, userEmail, selected, maxItems }, null, 2))
      return
    }

    const page = await listFolderPage(userEmail, selected.folderId, {
      pageSize: maxItems,
      pageToken: selected.pageToken,
    })
    const files = page.files
    let failures = 0
    let foldersDiscovered = 0
    let filesDiscovered = 0
    const discoveredFolders = []

    for (const file of files) {
      try {
        await recordDriveItem({ target, file, selectedFolder: selected, actor })
        if (file.mimeType === FOLDER_MIME) {
          foldersDiscovered += 1
          discoveredFolders.push({
            folderId: file.id,
            name: file.name,
            path: `${selected.path} / ${file.name}`,
            parentFolderId: selected.folderId,
            sensitivity: selected.sensitivity,
          })
        } else {
          filesDiscovered += 1
        }
      } catch (error) {
        failures += 1
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Drive item inventory failed: ${file.id || 'unknown'} ${message}`)
        await upsertSourceCrawlItem(
          {
            itemKey: `drive-corpus:${safeKeyPart(file.id || file.name)}:failed`,
            targetKey: target.targetKey,
            sourceId: target.sourceId,
            externalId: `${file.id || file.name}:failed`,
            itemType: file.mimeType === FOLDER_MIME ? 'drive_folder' : 'drive_file',
            status: 'failed',
            lastError: message,
            metadata: {
              driveFileId: file.id || null,
              name: file.name || '',
              mimeType: file.mimeType || '',
              parentFolderId: selected.folderId,
              parentPath: selected.path,
            },
            discoveredAt: new Date().toISOString(),
            processedAt: new Date().toISOString(),
            incrementAttempt: true,
          },
          actor,
        )
      }
    }

    const nextQueue = []
    if (page.nextPageToken) {
      nextQueue.push({ ...selected, pageToken: page.nextPageToken })
    } else {
      inspectedFolderIds.add(selected.folderId)
    }
    nextQueue.push(...discoveredFolders, ...queue)

    const driveInventory = {
      rootFolderCount: (target.cursorState?.rootFolders || []).length,
      inspectedFolderIds: [...inspectedFolderIds],
      inspectedFolderCount: inspectedFolderIds.size,
      folderQueue: nextQueue.slice(0, 500),
      queuedFolderCount: nextQueue.length,
      lastFolderId: selected.folderId,
      lastFolderName: selected.name,
      lastFolderPath: selected.path,
      lastPageHadMore: Boolean(page.nextPageToken),
      lastRunAt: new Date().toISOString(),
    }

    const summary = {
      inspected: files.length,
      foldersDiscovered,
      filesDiscovered,
      itemFailures: failures,
      cursorState: { driveInventory },
      metadata: {
        userEmail,
        folder: selected,
        nextPageTokenPresent: Boolean(page.nextPageToken),
      },
    }

    console.log(`Drive items inspected: ${files.length}`)
    console.log(`Drive folders discovered: ${foldersDiscovered}`)
    console.log(`Drive files discovered: ${filesDiscovered}`)
    console.log(`Crawl items failed: ${failures}`)
    console.log(`EXTRACTION_TARGET_SUMMARY ${JSON.stringify(summary)}`)
    if (failures > 0) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Drive corpus inventory failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
