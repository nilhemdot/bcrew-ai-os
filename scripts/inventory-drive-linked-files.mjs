#!/usr/bin/env node

import process from 'node:process'
import {
  closeFoundationDb,
  initFoundationDb,
  upsertSourceCrawlItem,
} from '../lib/foundation-db.js'
import {
  GOOGLE_SCOPES,
  createDrivePermission,
  googleJsonFetch,
  googleTextFetch,
  sendGmailMessage,
} from '../lib/google-delegated.js'

const DEFAULT_TARGET = 'drive-corpus-backfill'
const DEFAULT_SOURCE_USER = process.env.GOOGLE_DRIVE_LINK_SOURCE_USER || 'steve.zahnd@bensoncrew.ca'
const DEFAULT_ACCESS_USER = process.env.GOOGLE_DRIVE_CORPUS_USER || 'ai@bensoncrew.ca'
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

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function unwrapGoogleRedirect(rawUrl) {
  const cleanUrl = decodeHtml(rawUrl).trim()
  try {
    const url = new URL(cleanUrl)
    const redirected = url.searchParams.get('q') || url.searchParams.get('url')
    if (redirected && /^(https?:\/\/)/i.test(redirected)) return redirected
  } catch {
    return cleanUrl
  }
  return cleanUrl
}

function extractDriveLink(rawUrl) {
  const url = unwrapGoogleRedirect(rawUrl)
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase()
  const path = parsed.pathname
  let fileId = ''
  let kind = 'drive_file'

  const directMatch = path.match(/\/(?:document|spreadsheets|presentation|file)\/d\/([a-zA-Z0-9_-]+)/)
  if (directMatch) {
    fileId = directMatch[1]
  }

  const folderMatch = path.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/)
  if (folderMatch) {
    fileId = folderMatch[1]
    kind = 'drive_folder'
  }

  if (!fileId && (host === 'drive.google.com' || host.endsWith('.google.com'))) {
    fileId = parsed.searchParams.get('id') || ''
  }

  if (!fileId) return null
  return { fileId, url, kind }
}

function extractLinks(html) {
  const links = []
  const hrefPattern = /href=["']([^"']+)["']/gi
  let match
  while ((match = hrefPattern.exec(html)) !== null) {
    links.push(match[1])
  }

  const urlPattern = /https?:\/\/[^\s"'<>]+/gi
  while ((match = urlPattern.exec(html)) !== null) {
    links.push(match[0])
  }

  const byId = new Map()
  for (const link of links) {
    const driveLink = extractDriveLink(link)
    if (!driveLink) continue
    if (!byId.has(driveLink.fileId)) byId.set(driveLink.fileId, driveLink)
  }
  return Array.from(byId.values())
}

async function getDriveMetadata(userEmail, fileId) {
  const fields = [
    'id',
    'name',
    'mimeType',
    'modifiedTime',
    'createdTime',
    'parents',
    'webViewLink',
    'size',
    'owners(displayName,emailAddress)',
    'shortcutDetails(targetId,targetMimeType)',
  ].join(',')
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    `?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`
  return googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] })
}

async function exportGoogleDocHtml(userEmail, fileId) {
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    '/export?mimeType=text%2Fhtml'
  return googleTextFetch(userEmail, url, {
    scopes: [GOOGLE_SCOPES.drive],
    accept: 'text/html',
  })
}

function classifyDriveItem(file, inheritedSensitivity) {
  const name = String(file.name || '').toLowerCase()
  const mimeType = String(file.mimeType || '')
  let valueRoute = inheritedSensitivity === 'strategy_internal' ? 'strategy_evidence' : 'archive_only'
  let extractionStatus = 'metadata_only'
  let skipReason = 'linked_file_inventory_only'

  if (mimeType === FOLDER_MIME) {
    extractionStatus = 'folder_discovered'
    skipReason = 'linked_folder_requires_inventory_bite'
  } else if (mimeType === SHORTCUT_MIME) {
    extractionStatus = 'skipped'
    skipReason = 'linked_shortcut_requires_resolution'
  } else if (mimeType.includes('spreadsheet')) {
    extractionStatus = 'skipped'
    skipReason = 'sheet_text_extraction_not_in_v1'
  } else if (mimeType.includes('presentation')) {
    extractionStatus = 'pending_future_extraction'
    skipReason = 'slides_text_extraction_not_in_v1'
  } else if (mimeType.includes('video')) {
    valueRoute = 'youtube_source'
    extractionStatus = 'pending_future_video_review'
    skipReason = 'video_extraction_requires_multimodal_lane'
  } else if (mimeType.includes('audio')) {
    extractionStatus = 'skipped'
    skipReason = 'audio_transcription_requires_multimodal_lane'
  } else if (mimeType.startsWith('image/')) {
    extractionStatus = 'skipped'
    skipReason = 'image_ocr_requires_multimodal_lane'
  } else if (mimeType === 'application/pdf') {
    extractionStatus = 'pending_future_extraction'
    skipReason = 'pdf_text_or_ocr_extraction_pending'
  } else if (mimeType.includes('document') || mimeType === 'text/plain' || mimeType === 'text/markdown') {
    extractionStatus = 'pending_future_text_export'
    skipReason = 'doc_text_export_pending'
  }

  if (name.includes('strategy') || name.includes('strat') || name.includes('quarter')) valueRoute = 'strategy_evidence'
  if (name.includes('training') || name.includes('course')) valueRoute = 'sales_training'
  if (name.includes('youtube') || name.includes('loom') || name.includes('video')) valueRoute = 'youtube_source'

  return { valueRoute, extractionStatus, skipReason }
}

function getOwner(file) {
  return Array.isArray(file?.owners) && file.owners[0]
    ? {
        displayName: file.owners[0].displayName || null,
        emailAddress: file.owners[0].emailAddress || null,
      }
    : null
}

async function recordAccessibleFile({
  targetKey,
  sourceId,
  file,
  sourceFile,
  link,
  actor,
  sensitivity,
  accessStatus,
  grantStatus,
}) {
  const modifiedTime = file.modifiedTime || file.createdTime || 'no-time'
  const externalId = `${file.id}:${modifiedTime}`
  const isFolder = file.mimeType === FOLDER_MIME
  const classification = classifyDriveItem(file, sensitivity)

  return upsertSourceCrawlItem(
    {
      itemKey: `drive-corpus:${safeKeyPart(file.id)}:${safeKeyPart(modifiedTime)}`,
      targetKey,
      sourceId,
      externalId,
      itemType: isFolder ? 'drive_folder' : 'drive_file',
      status: 'succeeded',
      fingerprint: externalId,
      metadata: {
        driveFileId: file.id,
        name: file.name || '',
        mimeType: file.mimeType || '',
        modifiedTime: file.modifiedTime || null,
        createdTime: file.createdTime || null,
        webViewLink: file.webViewLink || link.url || null,
        size: file.size || null,
        parents: file.parents || [],
        owner: getOwner(file),
        parentFolderId: sourceFile.id,
        parentFolderName: sourceFile.name,
        parentPath: `linked from ${sourceFile.name || sourceFile.id}`,
        sensitivity,
        valueRoute: classification.valueRoute,
        extractionStatus: classification.extractionStatus,
        skipReason: classification.skipReason,
        linkedFromDriveFileId: sourceFile.id,
        linkedFromTitle: sourceFile.name || '',
        linkedFromUrl: sourceFile.webViewLink || null,
        linkUrl: link.url,
        accessStatus,
        grantStatus,
        shortcutDetails: file.shortcutDetails || null,
      },
      discoveredAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    },
    actor,
  )
}

async function recordAccessGap({
  targetKey,
  sourceId,
  fileId,
  sourceFile,
  link,
  actor,
  sensitivity,
  owner,
  grantError,
  emailStatus,
}) {
  return upsertSourceCrawlItem(
    {
      itemKey: `drive-link-access:${safeKeyPart(fileId)}`,
      targetKey,
      sourceId,
      externalId: `access-needed:${fileId}`,
      itemType: 'drive_link_access_request',
      status: 'skipped',
      fingerprint: `${fileId}:access-needed`,
      lastError: grantError || null,
      metadata: {
        driveFileId: fileId,
        webViewLink: link.url,
        linkUrl: link.url,
        linkedFromDriveFileId: sourceFile.id,
        linkedFromTitle: sourceFile.name || '',
        linkedFromUrl: sourceFile.webViewLink || null,
        sensitivity,
        valueRoute: 'strategy_evidence',
        accessStatus: 'access_required',
        grantStatus: grantError ? 'failed' : 'not_attempted',
        owner,
        emailStatus,
        skipReason: 'linked_drive_item_access_required',
      },
      discoveredAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    },
    actor,
  )
}

async function sendAccessEmail({ accessUser, owner, sourceFile, link }) {
  if (!owner?.emailAddress) return 'no_owner_email'
  await sendGmailMessage(accessUser, {
    to: owner.emailAddress,
    fromName: 'Benson Crew AI',
    subject: `Access request for strategy prep: ${sourceFile.name || 'strategy doc'}`,
    text: [
      `Hi ${owner.displayName || ''}`.trim() + ',',
      '',
      `Please add ${accessUser} to this strategy doc or folder so I can review the contents in preparation for the Benson Crew strategy session.`,
      '',
      link.url,
      '',
      'Thanks.',
    ].join('\n'),
  })
  return `sent:${owner.emailAddress}`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const sourceFileId = String(args.fileId || '').trim()
  const targetKey = String(args.target || DEFAULT_TARGET).trim()
  const sourceUser = String(args.sourceUser || DEFAULT_SOURCE_USER).trim()
  const accessUser = String(args.accessUser || args.user || DEFAULT_ACCESS_USER).trim()
  const sourceId = String(args.sourceId || 'SRC-GDRIVE-001').trim()
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'drive-link-inventory').trim()
  const sensitivity = String(args.sensitivity || 'strategy_internal').trim()
  const grantAccess = args.grantAccess == null ? true : boolValue(args.grantAccess)
  const sendAccessEmails = args.sendAccessEmails == null ? false : boolValue(args.sendAccessEmails)
  const includeSourceFile = args.includeSourceFile == null ? true : boolValue(args.includeSourceFile)
  const dryRun = boolValue(args.dryRun)
  const controlledByTargetRunner = boolValue(args.controlledByTargetRunner)

  if (!sourceFileId) throw new Error('--fileId is required.')
  if (!dryRun && !controlledByTargetRunner) {
    throw new Error('Drive link inventory writes crawl items; pass --controlledByTargetRunner=true for a manual governed run.')
  }

  await initFoundationDb()
  try {
    const sourceFile = await getDriveMetadata(sourceUser, sourceFileId)
    const html = await exportGoogleDocHtml(sourceUser, sourceFileId)
    const links = extractLinks(html).filter(link => link.fileId !== sourceFileId)

    const includedLinks = includeSourceFile
      ? [{ fileId: sourceFileId, url: sourceFile.webViewLink || `https://docs.google.com/document/d/${sourceFileId}/edit`, kind: 'drive_file', sourceFileSelf: true }, ...links]
      : links

    console.log('Drive linked-file inventory')
    console.log(`  Source doc: ${sourceFile.name} (${sourceFileId})`)
    console.log(`  Source user: ${sourceUser}`)
    console.log(`  Access user: ${accessUser}`)
    console.log(`  Links found: ${links.length}`)

    let accessible = 0
    let granted = 0
    let accessGaps = 0
    let emailsSent = 0
    const processed = []

    for (const link of includedLinks) {
      let metadata = null
      let accessStatus = 'accessible'
      let grantStatus = link.sourceFileSelf ? 'source_file' : 'not_needed'
      let grantError = ''

      try {
        metadata = await getDriveMetadata(accessUser, link.fileId)
      } catch {
        accessStatus = 'not_accessible_as_access_user'
      }

      if (!metadata && grantAccess) {
        try {
          await createDrivePermission(sourceUser, link.fileId, {
            emailAddress: accessUser,
            role: 'reader',
            sendNotificationEmail: false,
          })
          grantStatus = 'granted'
          granted += 1
          metadata = await getDriveMetadata(accessUser, link.fileId)
          accessStatus = 'granted_then_accessible'
        } catch (error) {
          grantStatus = 'failed'
          grantError = error instanceof Error ? error.message : String(error)
        }
      }

      if (metadata) {
        accessible += 1
        if (!dryRun) {
          await recordAccessibleFile({
            targetKey,
            sourceId,
            file: metadata,
            sourceFile,
            link,
            actor,
            sensitivity,
            accessStatus,
            grantStatus,
          })
        }
        processed.push({ fileId: link.fileId, name: metadata.name, status: accessStatus, grantStatus })
        continue
      }

      accessGaps += 1
      let owner = null
      try {
        const sourceVisibleMetadata = await getDriveMetadata(sourceUser, link.fileId)
        owner = getOwner(sourceVisibleMetadata)
      } catch {
        owner = null
      }

      let emailStatus = 'not_sent'
      if (sendAccessEmails) {
        try {
          emailStatus = await sendAccessEmail({ accessUser, owner, sourceFile, link })
          if (emailStatus.startsWith('sent:')) emailsSent += 1
        } catch (error) {
          emailStatus = `failed:${error instanceof Error ? error.message : String(error)}`
        }
      }

      if (!dryRun) {
        await recordAccessGap({
          targetKey,
          sourceId,
          fileId: link.fileId,
          sourceFile,
          link,
          actor,
          sensitivity,
          owner,
          grantError,
          emailStatus,
        })
      }
      processed.push({ fileId: link.fileId, status: 'access_required', grantStatus, emailStatus })
    }

    console.log(`Accessible/recorded: ${accessible}`)
    console.log(`Permissions granted: ${granted}`)
    console.log(`Access gaps: ${accessGaps}`)
    console.log(`Access emails sent: ${emailsSent}`)
    console.log(`DRIVE_LINK_INVENTORY_SUMMARY ${JSON.stringify({
      inspected: includedLinks.length,
      accessible,
      granted,
      accessGaps,
      emailsSent,
      sourceFileId,
      sourceTitle: sourceFile.name,
      processed: processed.slice(0, 50),
    })}`)
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Drive linked-file inventory failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
