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
} from '../lib/foundation-db-session.js'
import {
  getSourceCrawlItemsByExternalId,
  listSourceCrawlItems,
  upsertSourceCrawlItem,
} from '../lib/foundation-source-crawl-db.js'
import { upsertSharedCommunicationArtifact } from '../lib/foundation-shared-comms-db.js'
import { listFoundationUsers } from '../lib/foundation-people-sales-db.js'
import { downloadGmailAttachment, getGmailThread, listGmailMessages } from '../lib/google-delegated.js'

const execFile = promisify(execFileCallback)

const DEFAULT_USER = process.env.GOOGLE_IMPERSONATE_EMAIL || 'ai@bensoncrew.ca'
const DEFAULT_TARGET = 'email-attachments-backfill'
const DEFAULT_QUERY = process.env.GMAIL_ATTACHMENT_QUERY || 'has:attachment newer_than:30d'
const EXTRACTOR_VERSION = 'gmail_attachment_text_v1'

const PDF_MIME = 'application/pdf'
const TEXT_MIME_PREFIX = 'text/'
const JSON_MIME = 'application/json'
const XML_MIME = 'application/xml'
const CALENDAR_MIME_TYPES = new Set(['text/calendar', 'application/ics', 'text/ics'])
const CALENDAR_INVITE_RETRY_PREFIX = 'calendar_invite_not_in_v1'

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
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean)
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

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function getUnsupportedSkipReason(mimeType, filename) {
  const normalizedMime = String(mimeType || '').toLowerCase()
  const normalizedName = String(filename || '').toLowerCase()
  if (normalizedMime.startsWith('image/')) return 'image_ocr_requires_multimodal_lane'
  if (normalizedMime.startsWith('audio/')) return 'audio_transcription_requires_multimodal_lane'
  if (normalizedMime.startsWith('video/')) return 'video_extraction_requires_multimodal_lane'
  if (normalizedMime.includes('officedocument') || normalizedMime.includes('msword') || normalizedName.endsWith('.docx')) return 'office_file_conversion_not_in_v1'
  if (normalizedMime.includes('spreadsheet') || normalizedName.endsWith('.xlsx') || normalizedName.endsWith('.xls')) return 'spreadsheet_attachment_extraction_not_in_v1'
  if (normalizedMime.includes('presentation') || normalizedName.endsWith('.pptx') || normalizedName.endsWith('.ppt')) return 'slides_attachment_extraction_not_in_v1'
  if (normalizedMime.includes('calendar') || normalizedName.endsWith('.ics')) return CALENDAR_INVITE_RETRY_PREFIX
  return 'unsupported_attachment_mime_type_for_v1_text_extraction'
}

function isCalendarInviteAttachment(attachment) {
  const mimeType = String(attachment?.mimeType || '').toLowerCase()
  const filename = String(attachment?.filename || '').toLowerCase()
  return CALENDAR_MIME_TYPES.has(mimeType) || filename.endsWith('.ics')
}

function classifyAttachment(attachment) {
  const mimeType = String(attachment?.mimeType || '').toLowerCase()
  if (mimeType === PDF_MIME) {
    return {
      supported: true,
      extractionMethod: 'gmail_attachment_pdf_pdftotext_v1',
    }
  }
  if (isCalendarInviteAttachment(attachment)) {
    return {
      supported: true,
      extractionMethod: 'gmail_attachment_calendar_ics_text_v1',
    }
  }
  if (mimeType.startsWith(TEXT_MIME_PREFIX) || mimeType === JSON_MIME || mimeType === XML_MIME) {
    return {
      supported: true,
      extractionMethod: 'gmail_attachment_text_blob_v1',
    }
  }
  return {
    supported: false,
    skipReason: getUnsupportedSkipReason(mimeType, attachment?.filename || ''),
  }
}

function buildExternalId(candidate) {
  if (candidate.retryExternalId) return candidate.retryExternalId
  const stablePartKey = candidate.attachment.partId || candidate.attachment.partPath || candidate.attachment.attachmentId
  return [
    'gmail',
    candidate.mailbox,
    candidate.message.id,
    stablePartKey,
    candidate.attachment.filename,
    candidate.attachment.size || 0,
  ].join(':')
}

function buildItemKey(targetKey, candidate) {
  if (candidate.retryItemKey) return candidate.retryItemKey
  const stablePartKey = candidate.attachment.partId || candidate.attachment.partPath || candidate.attachment.attachmentId
  return `${targetKey}:${safeKeyPart(candidate.mailbox)}:${safeKeyPart(candidate.message.id)}:${safeKeyPart(stablePartKey)}:${safeKeyPart(candidate.attachment.filename)}`
}

function buildArtifactId(candidate) {
  const stablePartKey = candidate.attachment.partId || candidate.attachment.partPath || candidate.attachment.attachmentId
  return `SRC-GMAIL-001:gmail_attachment:${safeKeyPart(candidate.mailbox)}:${safeKeyPart(candidate.message.id)}:${safeKeyPart(stablePartKey)}:${safeKeyPart(candidate.attachment.filename)}`
}

function buildParticipants(message) {
  const participants = []
  if (message.from) participants.push({ role: 'from', value: message.from })
  for (const value of String(message.to || '').split(',')) {
    const normalized = value.trim()
    if (normalized) participants.push({ role: 'to', value: normalized })
  }
  return participants
}

function buildMetadata(candidate, classification, extra = {}) {
  return {
    mailbox: candidate.mailbox,
    gmailThreadId: candidate.threadId,
    gmailMessageId: candidate.message.id,
    gmailAttachmentId: candidate.attachment.attachmentId,
    filename: candidate.attachment.filename,
    mimeType: candidate.attachment.mimeType || '',
    declaredSize: candidate.attachment.size || 0,
    partId: candidate.attachment.partId || '',
    partPath: candidate.attachment.partPath || '',
    messageSubject: candidate.message.subject || '',
    messageFrom: candidate.message.from || '',
    messageTo: candidate.message.to || '',
    messageDate: candidate.message.date || '',
    extractionMethod: classification?.extractionMethod || null,
    extractorVersion: EXTRACTOR_VERSION,
    officialApiBasis: ['Gmail users.messages.attachments.get'],
    ...extra,
  }
}

function getExistingSkipReason(existing) {
  return String(existing?.metadata?.skipReason || existing?.retryReason || existing?.retry_reason || '').trim()
}

function shouldRetrySkippedItem(existing, retrySkippedReasonPrefixes = []) {
  if (existing?.status !== 'skipped') return false
  const skipReason = getExistingSkipReason(existing)
  return retrySkippedReasonPrefixes.some(prefix => skipReason.startsWith(prefix))
}

async function extractPdfTextWithPdftotext(buffer, { pdftotextBin = 'pdftotext' } = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bcrew-gmail-attachment-pdf-'))
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

async function extractAttachmentText(candidate, { maxAttachmentBytes, pdftotextBin }) {
  const declaredSize = Number(candidate.attachment.size || 0)
  if (declaredSize && declaredSize > maxAttachmentBytes) {
    return {
      skipped: true,
      skipReason: `attachment_too_large_for_v1:${declaredSize}>${maxAttachmentBytes}`,
    }
  }

  const buffer = await downloadGmailAttachment(
    candidate.mailbox,
    candidate.message.id,
    candidate.attachment.attachmentId,
  )

  if (buffer.length > maxAttachmentBytes) {
    return {
      skipped: true,
      skipReason: `attachment_too_large_for_v1:${buffer.length}>${maxAttachmentBytes}`,
    }
  }

  const mimeType = String(candidate.attachment.mimeType || '').toLowerCase()
  if (mimeType === PDF_MIME) return extractPdfTextWithPdftotext(buffer, { pdftotextBin })
  if (mimeType === 'text/html') return stripHtml(buffer.toString('utf8'))
  return buffer.toString('utf8')
}

async function markAttachmentSkipped({ candidate, targetKey, actor, reason, classification }) {
  return upsertSourceCrawlItem(
    {
      itemKey: buildItemKey(targetKey, candidate),
      targetKey,
      sourceId: 'SRC-GMAIL-001',
      externalId: buildExternalId(candidate),
      itemType: 'gmail_attachment',
      status: 'skipped',
      fingerprint: `${candidate.attachment.size || 0}:${candidate.attachment.mimeType || ''}:${candidate.attachment.filename || ''}`,
      metadata: {
        ...buildMetadata(candidate, classification, {
          contentExtractionStatus: 'skipped',
          skipReason: reason,
        }),
      },
      discoveredAt: candidate.message.date || new Date().toISOString(),
      processedAt: new Date().toISOString(),
    },
    actor,
  )
}

async function markAttachmentFailed({ candidate, targetKey, actor, error, classification }) {
  const message = error instanceof Error ? error.message : String(error)
  return upsertSourceCrawlItem(
    {
      itemKey: buildItemKey(targetKey, candidate),
      targetKey,
      sourceId: 'SRC-GMAIL-001',
      externalId: buildExternalId(candidate),
      itemType: 'gmail_attachment',
      status: 'failed',
      fingerprint: `${candidate.attachment.size || 0}:${candidate.attachment.mimeType || ''}:${candidate.attachment.filename || ''}`,
      lastError: message,
      metadata: {
        ...buildMetadata(candidate, classification, {
          contentExtractionStatus: 'failed',
        }),
      },
      discoveredAt: candidate.message.date || new Date().toISOString(),
      processedAt: new Date().toISOString(),
      incrementAttempt: true,
    },
    actor,
  )
}

async function archiveAttachmentText({ candidate, targetKey, actor, classification, text, maxTextChars }) {
  const normalizedText = normalizeText(text)
  if (!normalizedText) {
    await markAttachmentSkipped({
      candidate,
      targetKey,
      actor,
      reason: 'empty_text_after_extraction',
      classification,
    })
    return { status: 'skipped', artifact: null, textChars: 0 }
  }

  const contentHash = sha256(normalizedText)
  const storedText = normalizedText.length > maxTextChars
    ? normalizedText.slice(0, maxTextChars)
    : normalizedText
  const truncated = storedText.length !== normalizedText.length
  const metadata = buildMetadata(candidate, classification, {
    extractionTargetKey: targetKey,
    originalTextChars: normalizedText.length,
    storedTextChars: storedText.length,
    truncated,
  })

  const artifact = await upsertSharedCommunicationArtifact(
    {
      artifactId: buildArtifactId(candidate),
      sourceId: 'SRC-GMAIL-001',
      artifactType: 'gmail_attachment',
      externalId: buildExternalId(candidate),
      title: `${candidate.attachment.filename || 'Gmail attachment'} - ${candidate.message.subject || '(no subject)'}`,
      sourceAccount: candidate.mailbox,
      sourceContainer: `Gmail / Attachments / ${candidate.mailbox}`,
      sourceUrl: null,
      participants: buildParticipants(candidate.message),
      contentText: storedText,
      contentHash,
      artifactCreatedAt: candidate.message.date || null,
      artifactUpdatedAt: candidate.message.date || null,
      metadata,
    },
    actor,
  )

  await upsertSourceCrawlItem(
    {
      itemKey: buildItemKey(targetKey, candidate),
      targetKey,
      sourceId: 'SRC-GMAIL-001',
      externalId: buildExternalId(candidate),
      itemType: 'gmail_attachment',
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
      discoveredAt: candidate.message.date || new Date().toISOString(),
      processedAt: new Date().toISOString(),
    },
    actor,
  )

  return { status: 'succeeded', artifact, textChars: normalizedText.length }
}

async function collectCandidates({ users, query, searchLimitPerUser, maxCandidates }) {
  const candidates = []

  for (const mailbox of users) {
    const messages = await listGmailMessages(mailbox, {
      query,
      maxResults: searchLimitPerUser,
    })
    const threadIds = [...new Set(messages.map(message => message.threadId).filter(Boolean))]

    for (const threadId of threadIds) {
      const thread = await getGmailThread(mailbox, threadId)
      for (const message of thread) {
        for (const attachment of message.attachments || []) {
          candidates.push({ mailbox, threadId, message, attachment })
          if (candidates.length >= maxCandidates) return candidates
        }
      }
    }
  }

  return candidates
}

async function collectRetrySkippedCandidates({ targetKey, retrySkippedReasonPrefixes, maxCandidates }) {
  if (!retrySkippedReasonPrefixes.length) return []
  const rows = await listSourceCrawlItems({
    targetKey,
    status: 'skipped',
    limit: Math.max(maxCandidates, 200),
    order: 'asc',
  })
  const retryRows = rows.filter(row => shouldRetrySkippedItem(row, retrySkippedReasonPrefixes))
  const candidates = []

  for (const row of retryRows) {
    const metadata = row.metadata || {}
    const mailbox = String(metadata.mailbox || '').trim()
    const threadId = String(metadata.gmailThreadId || '').trim()
    const messageId = String(metadata.gmailMessageId || '').trim()
    const attachmentId = String(metadata.gmailAttachmentId || '').trim()
    const partId = String(metadata.partId || '').trim()
    const filename = String(metadata.filename || '').trim()
    if (!mailbox || !threadId || !messageId) continue

    const thread = await getGmailThread(mailbox, threadId)
    const message = thread.find(item => item.id === messageId)
    if (!message) continue
    const attachment = (message.attachments || []).find(item =>
      (attachmentId && item.attachmentId === attachmentId) ||
      (partId && item.partId === partId) ||
      (filename && item.filename === filename)
    )
    if (!attachment) continue
    candidates.push({
      mailbox,
      threadId,
      message,
      retryExternalId: row.externalId,
      retryItemKey: row.itemKey,
      attachment: {
        ...attachment,
        filename: metadata.filename || attachment.filename,
        mimeType: metadata.mimeType || attachment.mimeType,
        partId: metadata.partId || attachment.partId,
      },
    })
    if (candidates.length >= maxCandidates) break
  }

  return candidates
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const targetKey = String(args.target || args.crawlTarget || DEFAULT_TARGET).trim()
  const query = String(args.query || DEFAULT_QUERY).trim()
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'email-attachment-extractor').trim()
  const userEmail = String(args.user || DEFAULT_USER).trim()
  const teamMode = boolValue(args.team)
  const limit = Math.min(100, Math.max(1, Number(args.limit || args.maxItems || 5) || 5))
  const searchLimitPerUser = Math.min(500, Math.max(limit * 10, Number(args.searchLimitPerUser || 25) || 25))
  const candidateBuffer = Math.min(1000, Math.max(limit * 6, Number(args.candidateBuffer || limit * 6) || limit * 6))
  const maxTextChars = Math.max(10000, Number(args.maxTextChars || 250000) || 250000)
  const maxAttachmentBytes = Math.max(1000000, Number(args.maxAttachmentBytes || 25 * 1024 * 1024) || 25 * 1024 * 1024)
  const pdftotextBin = String(args.pdftotextBin || process.env.PDFTOTEXT_BIN || 'pdftotext').trim()
  const retrySkippedReasonPrefixes = listValue(args.retrySkippedReasonPrefixes || args.retrySkippedPrefix)
  const dryRun = boolValue(args.dryRun)
  const controlledByTargetRunner = boolValue(args.controlledByTargetRunner)

  if (!dryRun && !controlledByTargetRunner) {
    throw new Error(
      'Email attachment extraction writes artifacts and must be run through `npm run extraction:target -- --target=email-attachments-backfill`.',
    )
  }

  await initFoundationDb()

  try {
    const users = teamMode
      ? (await listFoundationUsers({ meetingSyncEnabled: true })).map(user => user.email).filter(Boolean)
      : [userEmail]

    const retryCandidates = await collectRetrySkippedCandidates({
      targetKey,
      retrySkippedReasonPrefixes,
      maxCandidates: limit,
    })
    const freshCandidates = await collectCandidates({
      users,
      query,
      searchLimitPerUser,
      maxCandidates: candidateBuffer,
    })
    const candidatesById = new Map()
    for (const candidate of [...retryCandidates, ...freshCandidates]) {
      const externalId = buildExternalId(candidate)
      if (!candidatesById.has(externalId)) candidatesById.set(externalId, candidate)
    }
    const candidates = [...candidatesById.values()]
    const existingItems = await getSourceCrawlItemsByExternalId({
      targetKey,
      externalIds: candidates.map(buildExternalId),
    })
    const queue = candidates
      .map((candidate, index) => {
        const existing = existingItems.get(buildExternalId(candidate))
        if (!existing) return { candidate, priority: 2, reason: 'fresh', index }
        if (existing.status === 'failed') return { candidate, priority: 0, reason: 'failed_retry', index }
        if (shouldRetrySkippedItem(existing, retrySkippedReasonPrefixes)) {
          return { candidate, priority: 1, reason: `skipped_retry:${getExistingSkipReason(existing)}`, index }
        }
        return null
      })
      .filter(Boolean)
      .sort((a, b) => a.priority - b.priority || a.index - b.index)
    const pendingCandidates = queue
      .slice(0, limit)
      .map(item => item.candidate)
    const alreadyLedgeredCount = candidates.length - queue.length

    console.log('Email attachment extraction bite')
    console.log(`  Target: ${targetKey}`)
    console.log(`  Query: ${query}`)
    console.log(`  Mode: ${teamMode ? 'team' : 'single-user'}`)
    console.log(`  Users: ${users.length}`)
    console.log(`  Candidates discovered: ${candidates.length}`)
    console.log(`  Retry candidates loaded: ${retryCandidates.length}`)
    console.log(`  Already ledgered: ${alreadyLedgeredCount}`)
    console.log(`  Retry skipped prefixes: ${retrySkippedReasonPrefixes.join(', ') || '(none)'}`)
    console.log(`  Queue selected: ${pendingCandidates.length}`)

    if (dryRun) {
      console.log(JSON.stringify(pendingCandidates.map(candidate => ({
        externalId: buildExternalId(candidate),
        mailbox: candidate.mailbox,
        threadId: candidate.threadId,
        messageId: candidate.message.id,
        subject: candidate.message.subject,
        filename: candidate.attachment.filename,
        mimeType: candidate.attachment.mimeType,
        size: candidate.attachment.size,
        queueReason: queue.find(item => buildExternalId(item.candidate) === buildExternalId(candidate))?.reason || 'selected',
        classification: classifyAttachment(candidate.attachment),
      })), null, 2))
      return
    }

    let extracted = 0
    let skipped = 0
    let failures = 0
    let textChars = 0
    const processed = []

    for (const candidate of pendingCandidates) {
      const classification = classifyAttachment(candidate.attachment)
      try {
        if (!classification.supported) {
          skipped += 1
          await markAttachmentSkipped({
            candidate,
            targetKey,
            actor,
            reason: classification.skipReason,
            classification,
          })
          processed.push({ externalId: buildExternalId(candidate), status: 'skipped', reason: classification.skipReason })
          continue
        }

        const textResult = await extractAttachmentText(candidate, { maxAttachmentBytes, pdftotextBin })
        if (textResult && typeof textResult === 'object' && textResult.skipped) {
          skipped += 1
          await markAttachmentSkipped({
            candidate,
            targetKey,
            actor,
            reason: textResult.skipReason || 'extraction_skipped',
            classification,
          })
          processed.push({ externalId: buildExternalId(candidate), status: 'skipped', reason: textResult.skipReason || 'extraction_skipped' })
          continue
        }

        const archived = await archiveAttachmentText({
          candidate,
          targetKey,
          actor,
          classification,
          text: textResult,
          maxTextChars,
        })

        if (archived.status === 'succeeded') {
          extracted += 1
          textChars += archived.textChars
          processed.push({
            externalId: buildExternalId(candidate),
            status: 'succeeded',
            artifactId: archived.artifact?.artifactId,
            textChars: archived.textChars,
          })
        } else {
          skipped += 1
          processed.push({ externalId: buildExternalId(candidate), status: 'skipped', reason: 'empty_text_after_extraction' })
        }
      } catch (error) {
        failures += 1
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Email attachment extraction failed: ${buildExternalId(candidate)} ${message}`)
        await markAttachmentFailed({ candidate, targetKey, actor, error, classification })
        processed.push({ externalId: buildExternalId(candidate), status: 'failed', error: message })
      }
    }

    const summary = {
      inspected: pendingCandidates.length,
      archived: extracted,
      extracted,
      skipped,
      itemFailures: failures,
      cursorState: {
        emailAttachmentExtraction: {
          query,
          lastRunAt: new Date().toISOString(),
          discoveredCandidates: candidates.length,
          lastSelectedCount: pendingCandidates.length,
          lastExtractedCount: extracted,
          lastSkippedCount: skipped,
          lastFailureCount: failures,
        },
      },
      metadata: {
        users,
        extractorVersion: EXTRACTOR_VERSION,
          maxTextChars,
          maxAttachmentBytes,
          retrySkippedReasonPrefixes,
          processed: processed.slice(0, 25),
        },
      }

    console.log(`Email attachments inspected: ${pendingCandidates.length}`)
    console.log(`Email attachments extracted: ${extracted}`)
    console.log(`Email attachments skipped: ${skipped}`)
    console.log(`Crawl items failed: ${failures}`)
    console.log(`Extracted text chars: ${textChars}`)
    console.log(`EXTRACTION_TARGET_SUMMARY ${JSON.stringify(summary)}`)
    if (failures > 0) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Email attachment extraction failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
