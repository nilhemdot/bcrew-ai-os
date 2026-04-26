#!/usr/bin/env node

import crypto from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import {
  closeFoundationDb,
  initFoundationDb,
  listDriveContentExtractionQueue,
  upsertSharedCommunicationArtifact,
  upsertSourceCrawlItem,
} from '../lib/foundation-db.js'
import { driveDownloadFile, driveExportDoc } from '../lib/google-delegated.js'

const execFile = promisify(execFileCallback)

const DEFAULT_SOURCE_USER = process.env.GOOGLE_DRIVE_CORPUS_USER || 'steve.zahnd@bensoncrew.ca'
const DEFAULT_INVENTORY_TARGET = 'drive-corpus-backfill'
const DEFAULT_EXTRACTION_TARGET = 'drive-content-extract-backfill'
const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document'
const PDF_MIME = 'application/pdf'
const TEXT_MIME = 'text/plain'
const MARKDOWN_MIME = 'text/markdown'
const EXTRACTOR_VERSION = 'drive_content_text_v1'

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

function listValue(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function safeKeyPart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, '_')
    .slice(0, 180)
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

function getFileId(item) {
  return String(item?.metadata?.driveFileId || '').trim()
}

function getMimeType(item) {
  return String(item?.metadata?.mimeType || '').trim()
}

function getExtractionItemKey(item) {
  return `drive-content:${safeKeyPart(getFileId(item))}:${safeKeyPart(item.externalId)}`
}

function classifyDriveContentItem(item) {
  const mimeType = getMimeType(item)
  if (mimeType === GOOGLE_DOC_MIME) {
    return {
      supported: true,
      artifactType: 'drive_document',
      extractionMethod: 'drive_google_doc_export_text_v1',
    }
  }
  if (mimeType === PDF_MIME) {
    return {
      supported: true,
      artifactType: 'drive_pdf',
      extractionMethod: 'drive_pdf_pdftotext_v1',
    }
  }
  if (mimeType === TEXT_MIME || mimeType === MARKDOWN_MIME) {
    return {
      supported: true,
      artifactType: 'drive_text',
      extractionMethod: 'drive_blob_text_v1',
    }
  }

  return {
    supported: false,
    artifactType: null,
    extractionMethod: null,
    skipReason: getUnsupportedSkipReason(mimeType),
  }
}

function getUnsupportedSkipReason(mimeType) {
  if (mimeType.includes('spreadsheet')) return 'sheet_text_extraction_not_in_v1'
  if (mimeType.includes('presentation')) return 'slides_text_extraction_not_in_v1'
  if (mimeType.includes('video')) return 'video_extraction_requires_multimodal_lane'
  if (mimeType.includes('audio')) return 'audio_transcription_requires_multimodal_lane'
  if (mimeType.startsWith('image/')) return 'image_ocr_requires_multimodal_lane'
  if (mimeType.includes('msword') || mimeType.includes('officedocument')) return 'office_file_conversion_not_in_v1'
  return 'unsupported_drive_mime_type_for_v1_text_extraction'
}

function buildArtifactId(item, artifactType) {
  return `SRC-GDRIVE-001:${artifactType}:${safeKeyPart(getFileId(item))}`
}

function buildParticipants(item) {
  const owner = item?.metadata?.owner || null
  if (!owner?.emailAddress && !owner?.displayName) return []
  return [{
    role: 'drive_owner',
    email: owner.emailAddress || '',
    name: owner.displayName || '',
  }]
}

function buildSourceFileMetadata(item) {
  const name = item.metadata?.name || ''
  return {
    sourceInventoryItemKey: item.itemKey,
    sourceInventoryExternalId: item.externalId,
    driveFileId: getFileId(item),
    title: name,
    name,
    mimeType: getMimeType(item),
    size: item.metadata?.size || null,
    webViewLink: item.metadata?.webViewLink || null,
    parents: item.metadata?.parents || [],
    owner: item.metadata?.owner || null,
    parentFolderId: item.metadata?.parentFolderId || null,
    parentFolderName: item.metadata?.parentFolderName || '',
    parentPath: item.metadata?.parentPath || '',
    sensitivity: item.metadata?.sensitivity || 'unknown',
    valueRoute: item.metadata?.valueRoute || '',
  }
}

async function extractPdfTextWithPdftotext(buffer, { pdftotextBin = 'pdftotext' } = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bcrew-drive-pdf-'))
  const inputPath = path.join(tmpDir, 'input.pdf')
  try {
    await fs.writeFile(inputPath, buffer)
    const { stdout } = await execFile(pdftotextBin, ['-layout', inputPath, '-'], {
      maxBuffer: 64 * 1024 * 1024,
    })
    return stdout
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function extractPdfTextWithOcr(
  buffer,
  {
    pdftoppmBin = 'pdftoppm',
    tesseractBin = 'tesseract',
    maxOcrPages = 8,
    ocrDpi = 180,
  } = {},
) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bcrew-drive-pdf-ocr-'))
  const inputPath = path.join(tmpDir, 'input.pdf')
  const outputPrefix = path.join(tmpDir, 'page')
  try {
    await fs.writeFile(inputPath, buffer)
    await execFile(
      pdftoppmBin,
      ['-r', String(ocrDpi), '-png', '-f', '1', '-l', String(Math.max(1, maxOcrPages)), inputPath, outputPrefix],
      { maxBuffer: 64 * 1024 * 1024 },
    )

    const pageFiles = (await fs.readdir(tmpDir))
      .filter(file => /^page-\d+\.png$/.test(file))
      .sort((left, right) => {
        const leftNum = Number(left.match(/\d+/)?.[0] || 0)
        const rightNum = Number(right.match(/\d+/)?.[0] || 0)
        return leftNum - rightNum
      })

    const chunks = []
    for (const file of pageFiles) {
      const pageNumber = Number(file.match(/\d+/)?.[0] || chunks.length + 1)
      const { stdout } = await execFile(
        tesseractBin,
        [path.join(tmpDir, file), 'stdout', '--psm', '6'],
        { maxBuffer: 32 * 1024 * 1024 },
      )
      const text = normalizeText(stdout)
      if (text) chunks.push(`--- OCR page ${pageNumber} ---\n${text}`)
    }

    return chunks.join('\n\n')
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function extractItemText(item, {
  userEmail,
  maxPdfBytes,
  pdftotextBin,
  ocrEmptyPdf,
  pdftoppmBin,
  tesseractBin,
  maxOcrPages,
  ocrDpi,
}) {
  const fileId = getFileId(item)
  const mimeType = getMimeType(item)
  if (!fileId) throw new Error('Drive inventory item is missing driveFileId.')

  if (mimeType === GOOGLE_DOC_MIME) {
    return driveExportDoc(userEmail, fileId)
  }

  if (mimeType === PDF_MIME) {
    const declaredSize = Number(item?.metadata?.size || 0)
    if (declaredSize && declaredSize > maxPdfBytes) {
      return {
        skipped: true,
        skipReason: `pdf_too_large_for_v1:${declaredSize}>${maxPdfBytes}`,
      }
    }
    const buffer = await driveDownloadFile(userEmail, fileId)
    if (buffer.length > maxPdfBytes) {
      return {
        skipped: true,
        skipReason: `pdf_too_large_for_v1:${buffer.length}>${maxPdfBytes}`,
      }
    }
    const embeddedText = await extractPdfTextWithPdftotext(buffer, { pdftotextBin })
    if (normalizeText(embeddedText)) return embeddedText

    if (!ocrEmptyPdf) {
      return {
        skipped: true,
        skipReason: 'empty_text_after_pdf_extraction_needs_ocr_or_vision',
        extractionMethod: 'drive_pdf_pdftotext_v1',
      }
    }

    const ocrText = await extractPdfTextWithOcr(buffer, {
      pdftoppmBin,
      tesseractBin,
      maxOcrPages,
      ocrDpi,
    })
    if (normalizeText(ocrText)) {
      return {
        text: ocrText,
        extractionMethod: 'drive_pdf_tesseract_ocr_v1',
        ocrFallbackUsed: true,
      }
    }

    return {
      skipped: true,
      skipReason: 'empty_text_after_ocr_needs_vision_handwriting_extraction',
      extractionMethod: 'drive_pdf_tesseract_ocr_v1',
      needsVisionExtraction: true,
    }
  }

  if (mimeType === TEXT_MIME || mimeType === MARKDOWN_MIME) {
    const buffer = await driveDownloadFile(userEmail, fileId)
    return buffer.toString('utf8')
  }

  return {
    skipped: true,
    skipReason: getUnsupportedSkipReason(mimeType),
  }
}

async function markExtractionSkipped({ item, targetKey, actor, reason, metadata = {} }) {
  return upsertSourceCrawlItem(
    {
      itemKey: getExtractionItemKey(item),
      targetKey,
      sourceId: 'SRC-GDRIVE-001',
      externalId: item.externalId,
      itemType: 'drive_content_extraction',
      status: 'skipped',
      fingerprint: item.fingerprint || item.externalId,
      metadata: {
        ...buildSourceFileMetadata(item),
        contentExtractionStatus: 'skipped',
        skipReason: reason,
        extractorVersion: EXTRACTOR_VERSION,
        ...metadata,
      },
      discoveredAt: item.discoveredAt || new Date().toISOString(),
      processedAt: new Date().toISOString(),
    },
    actor,
  )
}

async function markExtractionFailed({ item, targetKey, actor, error }) {
  const message = error instanceof Error ? error.message : String(error)
  return upsertSourceCrawlItem(
    {
      itemKey: getExtractionItemKey(item),
      targetKey,
      sourceId: 'SRC-GDRIVE-001',
      externalId: item.externalId,
      itemType: 'drive_content_extraction',
      status: 'failed',
      fingerprint: item.fingerprint || item.externalId,
      lastError: message,
      metadata: {
        ...buildSourceFileMetadata(item),
        contentExtractionStatus: 'failed',
        extractorVersion: EXTRACTOR_VERSION,
      },
      discoveredAt: item.discoveredAt || new Date().toISOString(),
      processedAt: new Date().toISOString(),
      incrementAttempt: true,
    },
    actor,
  )
}

async function archiveExtractedText({
  item,
  classification,
  targetKey,
  actor,
  userEmail,
  text,
  maxTextChars,
  extractionMethod,
  extractionMetadata = {},
}) {
  const normalizedText = normalizeText(text)
  if (!normalizedText) {
    await markExtractionSkipped({
      item,
      targetKey,
      actor,
      reason: 'empty_text_after_extraction',
      metadata: { extractionMethod: extractionMethod || classification.extractionMethod, ...extractionMetadata },
    })
    return { status: 'skipped', artifact: null, textChars: 0 }
  }

  const contentHash = sha256(normalizedText)
  const storedText = normalizedText.length > maxTextChars
    ? normalizedText.slice(0, maxTextChars)
    : normalizedText
  const truncated = storedText.length !== normalizedText.length
  const artifactId = buildArtifactId(item, classification.artifactType)
  const metadata = {
    ...buildSourceFileMetadata(item),
    extractionTargetKey: targetKey,
    extractionMethod: extractionMethod || classification.extractionMethod,
    extractorVersion: EXTRACTOR_VERSION,
    originalTextChars: normalizedText.length,
    storedTextChars: storedText.length,
    truncated,
    ...extractionMetadata,
    officialApiBasis: [
      'Drive files.export for Google Workspace docs',
      'Drive files.get alt=media for blob files',
    ],
  }

  const artifact = await upsertSharedCommunicationArtifact(
    {
      artifactId,
      sourceId: 'SRC-GDRIVE-001',
      artifactType: classification.artifactType,
      externalId: item.externalId,
      title: item.metadata?.name || getFileId(item),
      sourceAccount: userEmail,
      sourceContainer: item.metadata?.parentPath || item.metadata?.parentFolderName || '',
      sourceUrl: item.metadata?.webViewLink || null,
      participants: buildParticipants(item),
      contentText: storedText,
      contentHash,
      artifactCreatedAt: item.metadata?.createdTime || null,
      artifactUpdatedAt: item.metadata?.modifiedTime || null,
      metadata,
    },
    actor,
  )

  await upsertSourceCrawlItem(
    {
      itemKey: getExtractionItemKey(item),
      targetKey,
      sourceId: 'SRC-GDRIVE-001',
      externalId: item.externalId,
      itemType: 'drive_content_extraction',
      status: 'succeeded',
      fingerprint: contentHash,
      artifactId: artifact.artifactId,
      metadata: {
        ...metadata,
        contentExtractionStatus: 'content_extracted',
        contentHash,
        artifactId: artifact.artifactId,
      },
      metadataDeleteKeys: ['skipReason', 'unsupportedMimeType'],
      discoveredAt: item.discoveredAt || new Date().toISOString(),
      processedAt: new Date().toISOString(),
    },
    actor,
  )

  return { status: 'succeeded', artifact, textChars: normalizedText.length }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const targetKey = String(args.target || args.crawlTarget || DEFAULT_EXTRACTION_TARGET).trim()
  const inventoryTargetKey = String(args.inventoryTarget || DEFAULT_INVENTORY_TARGET).trim()
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'drive-content-extractor').trim()
  const userEmail = String(args.user || args.sourceUser || DEFAULT_SOURCE_USER).trim()
  const limit = Math.min(100, Math.max(1, Number(args.limit || args.maxItems || 5) || 5))
  const maxTextChars = Math.max(10000, Number(args.maxTextChars || 250000) || 250000)
  const maxPdfBytes = Math.max(1000000, Number(args.maxPdfBytes || 25 * 1024 * 1024) || 25 * 1024 * 1024)
  const pdftotextBin = String(args.pdftotextBin || process.env.PDFTOTEXT_BIN || 'pdftotext').trim()
  const pdftoppmBin = String(args.pdftoppmBin || process.env.PDFTOPPM_BIN || 'pdftoppm').trim()
  const tesseractBin = String(args.tesseractBin || process.env.TESSERACT_BIN || 'tesseract').trim()
  const ocrEmptyPdf = args.ocrEmptyPdf == null ? false : boolValue(args.ocrEmptyPdf)
  const maxOcrPages = Math.min(30, Math.max(1, Number(args.maxOcrPages || 8) || 8))
  const ocrDpi = Math.min(300, Math.max(120, Number(args.ocrDpi || 180) || 180))
  const includeUnsupported = args.includeUnsupported == null ? true : boolValue(args.includeUnsupported)
  const retrySkippedReasonPrefixes = listValue(args.retrySkippedReasonPrefixes || args.retrySkippedPrefix)
  const parentPathIncludes = String(args.parentPathIncludes || '').trim()
  const nameIncludes = String(args.nameIncludes || '').trim()
  const fileIds = listValue(args.fileIds || args.fileId)
  const dryRun = boolValue(args.dryRun)
  const controlledByTargetRunner = boolValue(args.controlledByTargetRunner)

  if (!dryRun && !controlledByTargetRunner) {
    throw new Error(
      'Drive content extraction writes artifacts and must be run through `npm run extraction:target -- --target=drive-content-extract-backfill`.',
    )
  }

  await initFoundationDb()

  try {
    const items = await listDriveContentExtractionQueue({
      inventoryTargetKey,
      extractionTargetKey: targetKey,
      limit,
      includeUnsupported,
      retrySkippedReasonPrefixes,
      parentPathIncludes,
      nameIncludes,
      fileIds,
    })

    console.log('Drive content extraction bite')
    console.log(`  User: ${userEmail}`)
    console.log(`  Target: ${targetKey}`)
    console.log(`  Inventory target: ${inventoryTargetKey}`)
    console.log(`  Queue selected: ${items.length}`)

    if (dryRun) {
      console.log(JSON.stringify(items.map(item => ({
        itemKey: item.itemKey,
        externalId: item.externalId,
        driveFileId: getFileId(item),
        name: item.metadata?.name || '',
        mimeType: getMimeType(item),
        parentPath: item.metadata?.parentPath || '',
        classification: classifyDriveContentItem(item),
      })), null, 2))
      return
    }

    let extracted = 0
    let skipped = 0
    let failures = 0
    let textChars = 0
    const processed = []

    for (const item of items) {
      const classification = classifyDriveContentItem(item)
      try {
        if (!classification.supported) {
          skipped += 1
          await markExtractionSkipped({
            item,
            targetKey,
            actor,
            reason: classification.skipReason,
            metadata: { unsupportedMimeType: getMimeType(item) },
          })
          processed.push({ itemKey: item.itemKey, status: 'skipped', reason: classification.skipReason })
          continue
        }

        const textResult = await extractItemText(item, {
          userEmail,
          maxPdfBytes,
          pdftotextBin,
          ocrEmptyPdf,
          pdftoppmBin,
          tesseractBin,
          maxOcrPages,
          ocrDpi,
        })
        if (textResult && typeof textResult === 'object' && textResult.skipped) {
          skipped += 1
          await markExtractionSkipped({
            item,
            targetKey,
            actor,
            reason: textResult.skipReason || 'extraction_skipped',
            metadata: {
              extractionMethod: textResult.extractionMethod || classification.extractionMethod,
              needsVisionExtraction: Boolean(textResult.needsVisionExtraction),
            },
          })
          processed.push({ itemKey: item.itemKey, status: 'skipped', reason: textResult.skipReason || 'extraction_skipped' })
          continue
        }

        const extractedText = textResult && typeof textResult === 'object' && Object.prototype.hasOwnProperty.call(textResult, 'text')
          ? textResult.text
          : textResult
        const extractionMethod = textResult && typeof textResult === 'object'
          ? textResult.extractionMethod || classification.extractionMethod
          : classification.extractionMethod
        const extractionMetadata = textResult && typeof textResult === 'object'
          ? { ocrFallbackUsed: Boolean(textResult.ocrFallbackUsed) }
          : {}

        const archived = await archiveExtractedText({
          item,
          classification,
          targetKey,
          actor,
          userEmail,
          text: extractedText,
          maxTextChars,
          extractionMethod,
          extractionMetadata,
        })

        if (archived.status === 'succeeded') {
          extracted += 1
          textChars += archived.textChars
          processed.push({
            itemKey: item.itemKey,
            status: 'succeeded',
            artifactId: archived.artifact?.artifactId,
            textChars: archived.textChars,
          })
        } else {
          skipped += 1
          processed.push({ itemKey: item.itemKey, status: 'skipped', reason: 'empty_text_after_extraction' })
        }
      } catch (error) {
        failures += 1
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Drive content extraction failed: ${getFileId(item) || item.itemKey} ${message}`)
        await markExtractionFailed({ item, targetKey, actor, error })
        processed.push({ itemKey: item.itemKey, status: 'failed', error: message })
      }
    }

    const summary = {
      inspected: items.length,
      archived: extracted,
      extracted,
      skipped,
      itemFailures: failures,
      cursorState: {
        driveContentExtraction: {
          inventoryTargetKey,
          lastRunAt: new Date().toISOString(),
          lastSelectedCount: items.length,
          lastExtractedCount: extracted,
          lastSkippedCount: skipped,
          lastFailureCount: failures,
        },
      },
      metadata: {
        userEmail,
        extractorVersion: EXTRACTOR_VERSION,
        maxTextChars,
        maxPdfBytes,
        includeUnsupported,
        parentPathIncludes,
        nameIncludes,
        fileIds,
        ocrEmptyPdf,
        maxOcrPages,
        ocrDpi,
        retrySkippedReasonPrefixes,
        processed: processed.slice(0, 25),
      },
    }

    console.log(`Drive content files inspected: ${items.length}`)
    console.log(`Drive content extracted: ${extracted}`)
    console.log(`Drive content skipped: ${skipped}`)
    console.log(`Crawl items failed: ${failures}`)
    console.log(`Extracted text chars: ${textChars}`)
    console.log(`EXTRACTION_TARGET_SUMMARY ${JSON.stringify(summary)}`)
    if (failures > 0) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Drive content extraction failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
