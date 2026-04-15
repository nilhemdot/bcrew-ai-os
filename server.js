import express from 'express'
import { execFile } from 'node:child_process'
import { createHash, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  approvePendingDocUpdate,
  closeFoundationDb,
  createBacklogItem,
  createDecision,
  createOpenQuestion,
  createPendingDocUpdate,
  getCanonicalDecisionCategories,
  getDocSourceSnapshot,
  getFoundationBacklogIdPrefixes,
  getFoundationSnapshot,
  getPendingDocUpdate,
  getRecentChangeEvents,
  initFoundationDb,
  listPendingDocUpdates,
  markPendingDocUpdateApplied,
  markPendingDocUpdateFailed,
  rejectPendingDocUpdate,
  updateBacklogItem,
  updateDecision,
  updateOpenQuestion,
} from './lib/foundation-db.js'
import { isDocUpdateAllowlisted } from './lib/doc-allowlist.js'
import { getSourceContracts, getSourceContractsByIds } from './lib/source-contracts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const fontkit = require('@pdf-lib/fontkit')
const app = express()
const port = process.env.PORT || 3000
const execFileAsync = promisify(execFile)
const adminToken = process.env.ADMIN_TOKEN || process.env.DASHBOARD_API_KEY || ''
app.disable('x-powered-by')

const docsDir = path.join(__dirname, 'docs')
const businessStrategyPath = path.join(docsDir, 'business-strategy.md')
const sourceRegistryPath = path.join(docsDir, 'source-registry.md')
const stratumRegularPath = path.join(__dirname, 'public', 'fonts', 'Stratum1-Regular.otf')
const stratumBoldPath = path.join(__dirname, 'public', 'fonts', 'Stratum1-Bold.otf')
const strategyDocs = [
  path.join(docsDir, 'strategy', 'bhag-model.md'),
  path.join(docsDir, 'strategy', 'agent-engine.md'),
  path.join(docsDir, 'strategy', 'financial-model-and-assumptions.md'),
  path.join(docsDir, 'strategy', 'quarterly-priorities.md'),
  path.join(docsDir, 'strategy', 'strategic-issues.md'),
  path.join(docsDir, 'strategy', 'governance.md'),
  path.join(docsDir, 'strategy', 'department-mandates.md'),
  path.join(docsDir, 'strategy', 'core-values.md'),
  path.join(docsDir, 'strategy', 'marketmasters.md'),
]
const canonicalDecisionCategories = getCanonicalDecisionCategories()
const backlogIdPrefixes = getFoundationBacklogIdPrefixes()

function setSecurityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  next()
}

function logApiRequest(req, res, next) {
  if (!req.path.startsWith('/api/')) {
    next()
    return
  }

  const startedAt = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt
    console.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`)
  })
  next()
}

function sendApiError(res, statusCode, code, message, details) {
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  })
}

function cacheHeadersNoStore(res) {
  res.setHeader('Cache-Control', 'no-store')
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

app.use(setSecurityHeaders)
app.use(logApiRequest)
app.use(express.json({ limit: '1mb' }))
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (/\.(js|css|html)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store')
    }
  },
}))

function tokensMatch(provided, expected) {
  if (!provided || !expected) return false
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

function requireAdminToken(req, res, next) {
  if (!adminToken) {
    sendApiError(
      res,
      503,
      'admin_token_unconfigured',
      'Mutation routes are not available until ADMIN_TOKEN or DASHBOARD_API_KEY is configured.'
    )
    return
  }

  const providedToken = req.get('X-Admin-Token') || ''
  if (!tokensMatch(providedToken, adminToken)) {
    sendApiError(res, 401, 'invalid_admin_token', 'Valid admin token required.')
    return
  }

  next()
}

function isAllowedDocPath(filePath) {
  const normalizedDocsDir = path.resolve(docsDir) + path.sep
  const normalizedFilePath = path.resolve(filePath)
  return normalizedFilePath.startsWith(normalizedDocsDir) && normalizedFilePath.endsWith('.md')
}

function resolveRequestedDoc(requestedPath) {
  if (typeof requestedPath !== 'string' || !requestedPath.trim()) return null
  const resolvedPath = path.resolve(__dirname, requestedPath)
  return isAllowedDocPath(resolvedPath) ? resolvedPath : null
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function getDocMeta(filePath) {
  try {
    const stat = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    return {
      exists: true,
      path: path.relative(__dirname, filePath),
      lines: content.split('\n').length,
      updatedAt: stat.mtime.toISOString(),
      daysOld: Math.floor((Date.now() - stat.mtimeMs) / 86400000),
    }
  } catch {
    return {
      exists: false,
      path: path.relative(__dirname, filePath),
      lines: 0,
      updatedAt: null,
      daysOld: null,
    }
  }
}

function parseSections(markdown) {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const sections = []
  let current = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: line.slice(3).trim(), body: [] }
      continue
    }

    if (current) current.body.push(line)
  }

  if (current) sections.push(current)

  return sections
    .map(section => ({
      title: section.title,
      content: section.body.join('\n').trim(),
    }))
    .filter(section => section.content)
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatTorontoDate(isoString, includeTime) {
  if (!isoString) return 'Not available'
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date) + (includeTime ? ' ET' : '')
}

function stripInlineMarkdown(text) {
  return String(text || '')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
}

function parsePdfBlocks(markdown) {
  const blocks = []
  const lines = String(markdown || '').split('\n')
  let paragraphLines = []
  let listItems = []
  let listType = null

  function flushParagraph() {
    if (!paragraphLines.length) return
    blocks.push({
      type: 'paragraph',
      text: stripInlineMarkdown(paragraphLines.join(' ').replace(/\s+/g, ' ').trim()),
    })
    paragraphLines = []
  }

  function flushList() {
    if (!listItems.length) return
    blocks.push({
      type: listType,
      items: listItems.map(item => stripInlineMarkdown(item)),
    })
    listItems = []
    listType = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ordered') flushList()
      listType = 'ordered'
      listItems.push(orderedMatch[2])
      continue
    }

    if (line.startsWith('- ')) {
      flushParagraph()
      if (listType && listType !== 'unordered') flushList()
      listType = 'unordered'
      listItems.push(line.slice(2))
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

function wrapPdfText(text, font, size, maxWidth) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return []

  const words = clean.split(' ')
  const lines = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
      continue
    }

    lines.push(line)
    line = word
  }

  if (line) lines.push(line)
  return lines
}

function drawWrappedParagraph(page, text, options) {
  const {
    x,
    y,
    font,
    size,
    color,
    maxWidth,
    lineHeight,
  } = options

  let cursorY = y
  const lines = wrapPdfText(text, font, size, maxWidth)
  for (const line of lines) {
    page.drawText(line, {
      x,
      y: cursorY,
      size,
      font,
      color,
    })
    cursorY -= lineHeight
  }

  return cursorY
}

function drawWrappedListItem(page, label, text, options) {
  const {
    x,
    y,
    font,
    size,
    color,
    maxWidth,
    lineHeight,
  } = options

  const labelWidth = font.widthOfTextAtSize(label, size)
  const gap = 6
  const textX = x + labelWidth + gap
  const textWidth = maxWidth - labelWidth - gap
  const lines = wrapPdfText(text, font, size, textWidth)
  let cursorY = y

  if (!lines.length) return cursorY

  page.drawText(label, {
    x,
    y: cursorY,
    size,
    font,
    color,
  })

  page.drawText(lines[0], {
    x: textX,
    y: cursorY,
    size,
    font,
    color,
  })

  cursorY -= lineHeight

  for (let index = 1; index < lines.length; index += 1) {
    page.drawText(lines[index], {
      x: textX,
      y: cursorY,
      size,
      font,
      color,
    })
    cursorY -= lineHeight
  }

  return cursorY
}

function addStrategyPdfFooter(page, footerText, fonts, palette) {
  const { width } = page.getSize()
  page.drawLine({
    start: { x: 48, y: 40 },
    end: { x: width - 48, y: 40 },
    thickness: 1,
    color: palette.border,
  })

  page.drawText(footerText, {
    x: 48,
    y: 24,
    size: 8.5,
    font: fonts.body,
    color: palette.muted,
  })
}

function addStrategyPdfSectionPage(pdfDoc, section, sectionIndex, totalSections, fonts, palette, continuation) {
  const page = pdfDoc.addPage([612, 792])
  const { width, height } = page.getSize()

  page.drawRectangle({
    x: 0,
    y: height - 96,
    width,
    height: 96,
    color: palette.brandDark,
  })

  page.drawRectangle({
    x: 48,
    y: height - 126,
    width: 8,
    height: 54,
    color: palette.brand,
  })

  page.drawText('BCrew AI OS · Business Strategy', {
    x: 70,
    y: height - 48,
    size: 10,
    font: fonts.heading,
    color: palette.white,
  })

  const sectionLabel = `Section ${String(sectionIndex + 1).padStart(2, '0')} of ${String(totalSections).padStart(2, '0')}${continuation ? ' · Continued' : ''}`
  page.drawText(sectionLabel, {
    x: 70,
    y: height - 78,
    size: 9,
    font: fonts.body,
    color: palette.white,
  })

  page.drawText(section.title, {
    x: 48,
    y: height - 158,
    size: 24,
    font: fonts.heading,
    color: palette.text,
  })

  page.drawLine({
    start: { x: 48, y: height - 176 },
    end: { x: width - 48, y: height - 176 },
    thickness: 1,
    color: palette.border,
  })

  addStrategyPdfFooter(page, `Benson Crew Business Strategy · ${section.title}`, fonts, palette)

  return {
    page,
    cursorY: height - 210,
    contentBottomY: 60,
    contentWidth: width - 96,
  }
}

async function buildBusinessStrategyPdf(packet) {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const headingFont = await pdfDoc.embedFont(fs.readFileSync(stratumBoldPath))
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bodyBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const fonts = {
    heading: headingFont,
    body: bodyFont,
    bodyBold: bodyBoldFont,
  }

  const palette = {
    brand: rgb(0 / 255, 132 / 255, 201 / 255),
    brandDark: rgb(0 / 255, 95 / 255, 148 / 255),
    text: rgb(10 / 255, 15 / 255, 26 / 255),
    muted: rgb(86 / 255, 97 / 255, 114 / 255),
    border: rgb(220 / 255, 226 / 255, 234 / 255),
    white: rgb(1, 1, 1),
    card: rgb(245 / 255, 248 / 255, 252 / 255),
  }

  pdfDoc.setTitle('Benson Crew Business Strategy')
  pdfDoc.setAuthor('BCrew AI OS')
  pdfDoc.setSubject('Business Strategy')
  pdfDoc.setCreator('BCrew AI OS Foundation')
  pdfDoc.setProducer('BCrew AI OS Foundation')
  pdfDoc.setCreationDate(new Date())
  pdfDoc.setModificationDate(new Date())

  const cover = pdfDoc.addPage([612, 792])
  const { width, height } = cover.getSize()
  const sections = packet.sections || []

  cover.drawRectangle({
    x: 0,
    y: height - 282,
    width,
    height: 282,
    color: palette.brandDark,
  })

  cover.drawText('BCrew AI OS · Foundation', {
    x: 48,
    y: height - 54,
    size: 11,
    font: fonts.heading,
    color: palette.white,
  })

  cover.drawText('Benson Crew', {
    x: 48,
    y: height - 130,
    size: 34,
    font: fonts.heading,
    color: palette.white,
  })

  cover.drawText('Business Strategy', {
    x: 48,
    y: height - 172,
    size: 34,
    font: fonts.heading,
    color: palette.white,
  })

  const subtitleLines = wrapPdfText(
    'Durable business direction for Benson Crew. This PDF is generated from the live Foundation strategy packet.',
    fonts.body,
    12,
    width - 96
  )
  let subtitleY = height - 214
  for (const line of subtitleLines) {
    cover.drawText(line, {
      x: 48,
      y: subtitleY,
      size: 12,
      font: fonts.body,
      color: palette.white,
    })
    subtitleY -= 18
  }

  const metaCards = [
    ['Packet', 'Business Strategy'],
    ['Sections', String(sections.length)],
    ['Updated', formatTorontoDate(packet.meta.updatedAt, true)],
    ['Exported', formatTorontoDate(new Date().toISOString(), true)],
  ]

  const cardWidth = 120
  const cardGap = 10
  metaCards.forEach((entry, index) => {
    const x = 48 + index * (cardWidth + cardGap)
    cover.drawRectangle({
      x,
      y: height - 340,
      width: cardWidth,
      height: 62,
      color: rgb(1, 1, 1),
      opacity: 0.12,
      borderColor: rgb(1, 1, 1),
      borderOpacity: 0.15,
      borderWidth: 1,
    })

    cover.drawText(entry[0], {
      x: x + 12,
      y: height - 306,
      size: 8,
      font: fonts.heading,
      color: palette.white,
    })

    cover.drawText(entry[1], {
      x: x + 12,
      y: height - 324,
      size: 10,
      font: fonts.bodyBold,
      color: palette.white,
      maxWidth: cardWidth - 24,
    })
  })

  cover.drawText('Included Sections', {
    x: 48,
    y: height - 390,
    size: 16,
    font: fonts.heading,
    color: palette.text,
  })

  let tocY = height - 428
  sections.forEach((section, index) => {
    cover.drawRectangle({
      x: 48,
      y: tocY - 8,
      width: width - 96,
      height: 34,
      color: palette.card,
      borderColor: palette.border,
      borderWidth: 1,
    })

    cover.drawText(String(index + 1).padStart(2, '0'), {
      x: 62,
      y: tocY + 3,
      size: 10,
      font: fonts.heading,
      color: palette.brand,
    })

    cover.drawText(section.title, {
      x: 98,
      y: tocY + 2,
      size: 12,
      font: fonts.bodyBold,
      color: palette.text,
    })

    tocY -= 42
  })

  addStrategyPdfFooter(cover, `Benson Crew Business Strategy · Live Foundation export · ${formatTorontoDate(new Date().toISOString(), false)}`, fonts, palette)

  const paragraphSize = 11.5
  const lineHeight = 17
  const blockGap = 12

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex]
    const blocks = parsePdfBlocks(section.content)
    let state = addStrategyPdfSectionPage(pdfDoc, section, sectionIndex, sections.length, fonts, palette, false)

    function ensureSpace(requiredHeight) {
      if (state.cursorY - requiredHeight >= state.contentBottomY) return
      state = addStrategyPdfSectionPage(pdfDoc, section, sectionIndex, sections.length, fonts, palette, true)
    }

    for (const block of blocks) {
      if (block.type === 'paragraph') {
        const lines = wrapPdfText(block.text, fonts.body, paragraphSize, state.contentWidth)
        const blockHeight = Math.max(lineHeight, lines.length * lineHeight)
        ensureSpace(blockHeight)
        state.cursorY = drawWrappedParagraph(state.page, block.text, {
          x: 48,
          y: state.cursorY,
          font: fonts.body,
          size: paragraphSize,
          color: palette.text,
          maxWidth: state.contentWidth,
          lineHeight,
        }) - blockGap
        continue
      }

      if (block.type === 'unordered' || block.type === 'ordered') {
        for (let itemIndex = 0; itemIndex < block.items.length; itemIndex += 1) {
          const label = block.type === 'ordered' ? `${itemIndex + 1}.` : '-'
          const lines = wrapPdfText(block.items[itemIndex], fonts.body, paragraphSize, state.contentWidth - 24)
          const itemHeight = Math.max(lineHeight, lines.length * lineHeight)
          ensureSpace(itemHeight)
          state.cursorY = drawWrappedListItem(state.page, label, block.items[itemIndex], {
            x: 48,
            y: state.cursorY,
            font: fonts.body,
            size: paragraphSize,
            color: palette.text,
            maxWidth: state.contentWidth,
            lineHeight,
          }) - 6
        }

        state.cursorY -= 6
      }
    }
  }

  return pdfDoc.save()
}

function getHeadingSection(markdown, targetSection) {
  const targetSlug = slugify(targetSection)
  if (!targetSlug) return null

  const lines = markdown.split('\n')
  let start = -1
  let end = lines.length
  let heading = ''

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,3})\s+(.+?)\s*$/)
    if (!match) continue

    const currentSlug = slugify(match[2])
    if (start === -1 && currentSlug === targetSlug) {
      start = index
      heading = match[2].trim()
      continue
    }

    if (start !== -1) {
      end = index
      break
    }
  }

  if (start === -1) return null

  const currentText = lines.slice(start + 1, end).join('\n').trim()
  return {
    start,
    end,
    heading,
    currentText,
  }
}

function replaceHeadingSection(markdown, targetSection, proposedText) {
  const section = getHeadingSection(markdown, targetSection)
  if (!section) return null

  const lines = markdown.split('\n')
  const before = lines.slice(0, section.start + 1)
  const after = lines.slice(section.end)
  const nextBody = String(proposedText || '').trim()
  const bodyLines = nextBody ? ['', ...nextBody.split('\n')] : ['']

  return {
    section,
    content: before.concat(bodyLines, after).join('\n').replace(/\n{3,}/g, '\n\n'),
  }
}

function buildSimpleDiff(currentText, proposedText) {
  return [
    '--- current',
    '+++ proposed',
    '',
    'Current:',
    currentText || '(empty)',
    '',
    'Proposed:',
    proposedText || '(empty)',
  ].join('\n')
}

function hashText(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

async function runGit(args) {
  return execFileAsync('git', args, { cwd: __dirname })
}

async function getGitStatusForFile(relativePath) {
  const { stdout } = await runGit(['status', '--porcelain', '--', relativePath])
  return stdout.trim()
}

async function restoreTrackedFile(relativePath) {
  try {
    await runGit(['restore', '--staged', '--worktree', '--', relativePath])
  } catch {
    // Leave recovery to the caller if restore fails.
  }
}

function toRelativeDocPath(filePath) {
  return path.relative(__dirname, filePath)
}

function getRequestActor() {
  return 'steve'
}

function validateCategory(value) {
  return canonicalDecisionCategories.includes(value)
}

function validateBacklogPrefix(value) {
  return backlogIdPrefixes.includes(String(value || '').trim().toUpperCase()) || String(value || '').trim().toUpperCase() === 'TASK'
}

function getSupportingStrategyDocs() {
  return strategyDocs.map(filePath => {
    const meta = getDocMeta(filePath)
    const content = readFileSafe(filePath)
    return {
      meta,
      sections: parseSections(content),
    }
  })
}

function getDocTitle(markdown, filePath) {
  if (markdown) {
    const lines = markdown.split('\n')
    const heading = lines.find(line => line.startsWith('# '))
    if (heading) return heading.slice(2).trim()
  }

  return path.basename(filePath, '.md')
}

function requireStringField(errors, body, field, label) {
  const value = body[field]
  if (typeof value !== 'string' || !value.trim()) {
    errors[field] = `${label} is required.`
    return null
  }
  return value.trim()
}

function optionalStringField(errors, body, field, label, maxLength) {
  const value = body[field]
  if (value == null || value === '') return null
  if (typeof value !== 'string') {
    errors[field] = `${label} must be text.`
    return null
  }
  const trimmed = value.trim()
  if (maxLength && trimmed.length > maxLength) {
    errors[field] = `${label} must be ${maxLength} characters or fewer.`
    return null
  }
  return trimmed
}

function optionalNumberField(errors, body, field, label) {
  const value = body[field]
  if (value == null || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    errors[field] = `${label} must be a number.`
    return null
  }
  return parsed
}

function getAllowedBodyKeys(body, allowedKeys) {
  return Object.keys(body || {}).filter(key => !allowedKeys.includes(key))
}

app.get('/api/source-of-truth', (_req, res) => {
  const businessStrategy = readFileSafe(businessStrategyPath)
  const sourceRegistry = readFileSafe(sourceRegistryPath)
  const sourceContracts = getSourceContracts()

  res.json({
    title: 'BCrew AI OS',
    foundation: {
      businessStrategy: {
        meta: getDocMeta(businessStrategyPath),
        sections: parseSections(businessStrategy),
      },
      sourceRegistry: {
        meta: getDocMeta(sourceRegistryPath),
        sections: parseSections(sourceRegistry),
      },
      supportingStrategy: getSupportingStrategyDocs(),
    },
    sources: sourceContracts,
    systemStatus: [
      {
        key: 'strategy-doc',
        label: 'Business Strategy',
        status: businessStrategy ? 'connected' : 'missing',
        detail: businessStrategy
          ? 'Primary strategy source is in the repo and rendered in the dashboard.'
          : 'Missing docs/business-strategy.md.',
      },
      {
        key: 'supporting-strategy',
        label: 'Supporting Strategy',
        status: getSupportingStrategyDocs().every(doc => doc.meta.exists) ? 'connected' : 'pending',
        detail: 'BHAG model, Agent Engine, mandates, governance, and the other supporting docs exist as a maintainable layer around the core strategy.',
      },
      {
        key: 'source-trust',
        label: 'Source Trust',
        status: sourceRegistry ? 'pending' : 'missing',
        detail: sourceRegistry
          ? `${sourceContracts.length} source contracts are tracked, but no live spreadsheet or API source is fully signed off yet.`
          : 'Create the registry next so every business input has an owner, validation state, and trust boundary.',
      },
      {
        key: 'foundation-memory',
        label: 'Foundation Memory',
        status: 'live',
        detail: 'Backlog, decisions, open questions, pending doc updates, and recent changes are running through the Foundation trust layer.',
      },
      {
        key: 'verification',
        label: 'Verification',
        status: 'pending',
        detail: 'Minimal smoke checks and source-health verification are not fully in place yet.',
      },
      {
        key: 'assistant-loop',
        label: 'Trusted Assistant Loop',
        status: 'pending',
        detail: 'The first narrow assistant loop is not proven end to end yet. The rebuild still needs source sign-off, verification, and memory-baseline proof.',
      },
    ],
  })
})

app.get('/api/foundation-hub', async (_req, res) => {
  try {
    const snapshot = await getFoundationSnapshot()
    res.json(snapshot)
  } catch (error) {
    sendApiError(
      res,
      500,
      'foundation_hub_load_failed',
      error instanceof Error ? error.message : 'Failed to load foundation hub data.'
    )
  }
})

app.get('/api/foundation/changes', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const changes = await getRecentChangeEvents(limit)
    res.json({ changes })
  } catch (error) {
    sendApiError(
      res,
      500,
      'foundation_changes_load_failed',
      error instanceof Error ? error.message : 'Failed to load recent changes.'
    )
  }
})

app.get('/api/foundation/doc-updates', async (_req, res) => {
  try {
    const docUpdates = await listPendingDocUpdates()
    res.json({ docUpdates })
  } catch (error) {
    sendApiError(
      res,
      500,
      'doc_updates_load_failed',
      error instanceof Error ? error.message : 'Failed to load pending doc updates.'
    )
  }
})

app.post('/api/foundation/backlog', requireAdminToken, async (req, res) => {
  const allowedKeys = ['idPrefix', 'title', 'team', 'lane', 'priority', 'rank', 'source', 'summary', 'whyItMatters', 'nextAction', 'statusNote', 'owner']
  const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
  if (unknownFields.length) {
    sendApiError(res, 400, 'invalid_backlog_body', 'Unknown backlog fields.', { unknownFields })
    return
  }

  const errors = {}
  const title = requireStringField(errors, req.body, 'title', 'Title')
  const team = requireStringField(errors, req.body, 'team', 'Team')
  const lane = requireStringField(errors, req.body, 'lane', 'Lane')
  const priority = requireStringField(errors, req.body, 'priority', 'Priority')
  const idPrefix = requireStringField(errors, req.body, 'idPrefix', 'ID prefix')
  const rank = optionalNumberField(errors, req.body, 'rank', 'Rank')
  const source = optionalStringField(errors, req.body, 'source', 'Source')
  const summary = optionalStringField(errors, req.body, 'summary', 'Summary')
  const whyItMatters = optionalStringField(errors, req.body, 'whyItMatters', 'Why it matters')
  const nextAction = optionalStringField(errors, req.body, 'nextAction', 'Next action')
  const statusNote = optionalStringField(errors, req.body, 'statusNote', 'Status note')
  const owner = optionalStringField(errors, req.body, 'owner', 'Owner')

  if (team && !['dev', 'marketing'].includes(team)) errors.team = 'Team must be dev or marketing.'
  if (lane && !['research', 'scoped', 'ranked', 'executing', 'parked', 'done'].includes(lane)) errors.lane = 'Invalid backlog lane.'
  if (priority && !['P0', 'P1', 'P2', 'P3'].includes(priority)) errors.priority = 'Invalid priority.'
  if (idPrefix && !validateBacklogPrefix(idPrefix)) errors.idPrefix = 'Choose a valid backlog ID prefix.'

  if (Object.keys(errors).length) {
    sendApiError(res, 400, 'invalid_backlog_body', 'Backlog item is not valid.', { fields: errors })
    return
  }

  try {
    const item = await createBacklogItem({
      idPrefix,
      title,
      team,
      lane,
      priority,
      rank,
      source,
      summary,
      whyItMatters,
      nextAction,
      statusNote,
      owner,
    }, getRequestActor())
    cacheHeadersNoStore(res)
    res.status(201).json({ item })
  } catch (error) {
    sendApiError(res, 500, 'backlog_create_failed', error instanceof Error ? error.message : 'Failed to create backlog item.')
  }
})

app.patch('/api/foundation/backlog/:id', requireAdminToken, async (req, res) => {
  const allowedKeys = ['title', 'team', 'lane', 'priority', 'rank', 'source', 'summary', 'whyItMatters', 'nextAction', 'statusNote', 'owner']
  const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
  if (unknownFields.length) {
    sendApiError(res, 400, 'invalid_backlog_body', 'Unknown backlog fields.', { unknownFields })
    return
  }

  const errors = {}
  if ('team' in req.body && req.body.team && !['dev', 'marketing'].includes(req.body.team)) errors.team = 'Team must be dev or marketing.'
  if ('lane' in req.body && req.body.lane && !['research', 'scoped', 'ranked', 'executing', 'parked', 'done'].includes(req.body.lane)) errors.lane = 'Invalid backlog lane.'
  if ('priority' in req.body && req.body.priority && !['P0', 'P1', 'P2', 'P3'].includes(req.body.priority)) errors.priority = 'Invalid priority.'
  const rank = 'rank' in req.body ? optionalNumberField(errors, req.body, 'rank', 'Rank') : undefined

  if (Object.keys(errors).length) {
    sendApiError(res, 400, 'invalid_backlog_body', 'Backlog update is not valid.', { fields: errors })
    return
  }

  try {
    const item = await updateBacklogItem(req.params.id, {
      ...req.body,
      rank,
    }, getRequestActor())
    cacheHeadersNoStore(res)
    res.json({ item })
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      sendApiError(res, 404, 'backlog_not_found', error.message)
      return
    }
    sendApiError(res, 500, 'backlog_update_failed', error instanceof Error ? error.message : 'Failed to update backlog item.')
  }
})

app.post('/api/foundation/decisions', requireAdminToken, async (req, res) => {
  const allowedKeys = ['title', 'summary', 'category', 'rationale', 'sourceRef']
  const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
  if (unknownFields.length) {
    sendApiError(res, 400, 'invalid_decision_body', 'Unknown decision fields.', { unknownFields })
    return
  }

  const errors = {}
  const title = requireStringField(errors, req.body, 'title', 'Title')
  const summary = requireStringField(errors, req.body, 'summary', 'Summary')
  const category = requireStringField(errors, req.body, 'category', 'Category')
  const rationale = optionalStringField(errors, req.body, 'rationale', 'Rationale')
  const sourceRef = optionalStringField(errors, req.body, 'sourceRef', 'Source reference')

  if (category && !validateCategory(category)) errors.category = 'Choose one of the four canonical decision categories.'

  if (Object.keys(errors).length) {
    sendApiError(res, 400, 'invalid_decision_body', 'Decision is not valid.', { fields: errors })
    return
  }

  try {
    const decision = await createDecision({ title, summary, category, rationale, sourceRef }, getRequestActor())
    cacheHeadersNoStore(res)
    res.status(201).json({ decision })
  } catch (error) {
    sendApiError(res, 500, 'decision_create_failed', error instanceof Error ? error.message : 'Failed to create decision.')
  }
})

app.patch('/api/foundation/decisions/:id', requireAdminToken, async (req, res) => {
  const allowedKeys = ['category', 'status', 'rationale', 'sourceRef', 'supersedesIds']
  const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
  if (unknownFields.length) {
    sendApiError(res, 400, 'invalid_decision_body', 'Unknown decision fields.', { unknownFields })
    return
  }

  const errors = {}
  if ('category' in req.body && req.body.category && !validateCategory(req.body.category)) errors.category = 'Choose one of the four canonical decision categories.'
  if ('status' in req.body && req.body.status && !['proposed', 'locked', 'superseded'].includes(req.body.status)) errors.status = 'Invalid decision status.'
  if ('supersedesIds' in req.body && !Array.isArray(req.body.supersedesIds)) errors.supersedesIds = 'supersedesIds must be an array of decision IDs.'

  if (Object.keys(errors).length) {
    sendApiError(res, 400, 'invalid_decision_body', 'Decision update is not valid.', { fields: errors })
    return
  }

  try {
    const decision = await updateDecision(req.params.id, req.body, getRequestActor())
    cacheHeadersNoStore(res)
    res.json({ decision })
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      sendApiError(res, 404, 'decision_not_found', error.message)
      return
    }
    sendApiError(res, 500, 'decision_update_failed', error instanceof Error ? error.message : 'Failed to update decision.')
  }
})

app.post('/api/foundation/questions', requireAdminToken, async (req, res) => {
  const allowedKeys = ['title', 'summary', 'owner']
  const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
  if (unknownFields.length) {
    sendApiError(res, 400, 'invalid_question_body', 'Unknown question fields.', { unknownFields })
    return
  }

  const errors = {}
  const title = requireStringField(errors, req.body, 'title', 'Title')
  const summary = requireStringField(errors, req.body, 'summary', 'Summary')
  const owner = optionalStringField(errors, req.body, 'owner', 'Owner')

  if (Object.keys(errors).length) {
    sendApiError(res, 400, 'invalid_question_body', 'Question is not valid.', { fields: errors })
    return
  }

  try {
    const question = await createOpenQuestion({ title, summary, owner }, getRequestActor())
    cacheHeadersNoStore(res)
    res.status(201).json({ question })
  } catch (error) {
    sendApiError(res, 500, 'question_create_failed', error instanceof Error ? error.message : 'Failed to create question.')
  }
})

app.patch('/api/foundation/questions/:id', requireAdminToken, async (req, res) => {
  const allowedKeys = ['title', 'summary', 'owner', 'status', 'resolutionNote']
  const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
  if (unknownFields.length) {
    sendApiError(res, 400, 'invalid_question_body', 'Unknown question fields.', { unknownFields })
    return
  }

  const errors = {}
  if ('status' in req.body && req.body.status && !['open', 'resolved'].includes(req.body.status)) errors.status = 'Status must be open or resolved.'
  if (Object.keys(errors).length) {
    sendApiError(res, 400, 'invalid_question_body', 'Question update is not valid.', { fields: errors })
    return
  }

  try {
    const question = await updateOpenQuestion(req.params.id, req.body, getRequestActor())
    cacheHeadersNoStore(res)
    res.json({ question })
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      sendApiError(res, 404, 'question_not_found', error.message)
      return
    }
    sendApiError(res, 500, 'question_update_failed', error instanceof Error ? error.message : 'Failed to update question.')
  }
})

app.post('/api/foundation/doc-updates', requireAdminToken, async (req, res) => {
  const allowedKeys = ['decisionId', 'targetDocPath', 'targetSection', 'summary', 'proposedText']
  const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
  if (unknownFields.length) {
    sendApiError(res, 400, 'invalid_doc_update_body', 'Unknown doc update fields.', { unknownFields })
    return
  }

  const errors = {}
  const targetDocPath = requireStringField(errors, req.body, 'targetDocPath', 'Target doc path')
  const targetSection = requireStringField(errors, req.body, 'targetSection', 'Target section')
  const summary = requireStringField(errors, req.body, 'summary', 'Summary')
  const proposedText = requireStringField(errors, req.body, 'proposedText', 'Proposed text')
  const decisionId = optionalStringField(errors, req.body, 'decisionId', 'Decision ID')

  const resolvedPath = targetDocPath ? resolveRequestedDoc(targetDocPath) : null
  if (targetDocPath && !resolvedPath) errors.targetDocPath = 'Target doc path must point to a markdown file inside docs/.'

  if (Object.keys(errors).length) {
    sendApiError(res, 400, 'invalid_doc_update_body', 'Doc update proposal is not valid.', { fields: errors })
    return
  }

  const content = readFileSafe(resolvedPath)
  if (!content) {
    sendApiError(res, 404, 'doc_not_found', 'Target document not found.')
    return
  }

  const section = getHeadingSection(content, targetSection)
  if (!section) {
    sendApiError(res, 404, 'target_section_not_found', 'Target section was not found in the document.')
    return
  }

  try {
    const docUpdate = await createPendingDocUpdate({
      decisionId,
      targetDocPath,
      targetSection: slugify(targetSection),
      summary,
      currentText: section.currentText,
      proposedText,
      proposedDiff: buildSimpleDiff(section.currentText, proposedText),
      metadata: {
        currentHash: hashText(section.currentText),
        heading: section.heading,
      },
    }, getRequestActor())
    cacheHeadersNoStore(res)
    res.status(201).json({ docUpdate })
  } catch (error) {
    sendApiError(res, 500, 'doc_update_create_failed', error instanceof Error ? error.message : 'Failed to create doc update proposal.')
  }
})

app.post('/api/foundation/doc-updates/:id/approve', requireAdminToken, async (req, res) => {
  try {
    const docUpdate = await approvePendingDocUpdate(req.params.id, getRequestActor())
    cacheHeadersNoStore(res)
    res.json({ docUpdate })
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      sendApiError(res, 404, 'doc_update_not_found', error.message)
      return
    }
    sendApiError(res, 500, 'doc_update_approve_failed', error instanceof Error ? error.message : 'Failed to approve doc update.')
  }
})

app.post('/api/foundation/doc-updates/:id/reject', requireAdminToken, async (req, res) => {
  try {
    const docUpdate = await rejectPendingDocUpdate(req.params.id, getRequestActor())
    cacheHeadersNoStore(res)
    res.json({ docUpdate })
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      sendApiError(res, 404, 'doc_update_not_found', error.message)
      return
    }
    sendApiError(res, 500, 'doc_update_reject_failed', error instanceof Error ? error.message : 'Failed to reject doc update.')
  }
})

app.post('/api/foundation/doc-updates/:id/apply', requireAdminToken, async (req, res) => {
  const docUpdate = await getPendingDocUpdate(req.params.id)
  if (!docUpdate) {
    sendApiError(res, 404, 'doc_update_not_found', 'Pending doc update not found.')
    return
  }

  if (!['approved', 'failed'].includes(docUpdate.status)) {
    sendApiError(res, 409, 'doc_update_not_ready', 'Approve the doc update before applying it.')
    return
  }

  if (!isDocUpdateAllowlisted(docUpdate.targetDocPath)) {
    sendApiError(res, 409, 'not_in_allowlist', 'This document is not on the B1 apply allowlist.')
    return
  }

  const resolvedPath = resolveRequestedDoc(docUpdate.targetDocPath)
  if (!resolvedPath) {
    sendApiError(res, 400, 'invalid_doc_path', 'Target doc path is not allowed.')
    return
  }

  const relativePath = toRelativeDocPath(resolvedPath)
  const currentContent = readFileSafe(resolvedPath)
  if (!currentContent) {
    sendApiError(res, 404, 'doc_not_found', 'Target document not found.')
    return
  }

  const gitStatus = await getGitStatusForFile(relativePath)
  if (gitStatus) {
    sendApiError(res, 409, 'doc_file_dirty', 'Target document has uncommitted changes. Apply is blocked until the file is clean.')
    return
  }

  const section = getHeadingSection(currentContent, docUpdate.targetSection)
  if (!section) {
    sendApiError(res, 409, 'target_section_not_found', 'Target section no longer exists in the document.')
    return
  }

  const currentHash = hashText(section.currentText)
  const expectedHash = docUpdate.metadata && docUpdate.metadata.currentHash
  if ((expectedHash && currentHash !== expectedHash) || section.currentText.trim() !== String(docUpdate.currentText || '').trim()) {
    sendApiError(res, 409, 'doc_section_conflict', 'The document changed after the proposal was created. Review it again before applying.')
    return
  }

  const replacement = replaceHeadingSection(currentContent, docUpdate.targetSection, docUpdate.proposedText)
  if (!replacement) {
    sendApiError(res, 409, 'target_section_not_found', 'Target section could not be replaced.')
    return
  }

  try {
    fs.writeFileSync(resolvedPath, replacement.content, 'utf8')
    await runGit(['add', '--', relativePath])
    await runGit([
      'commit',
      '-m',
      `Apply doc update ${docUpdate.id}: ${docUpdate.summary}`,
      '-m',
      'Co-Authored-By: BCrew AI OS <system@bensoncrew.ai>',
    ])
    const { stdout } = await runGit(['rev-parse', 'HEAD'])
    const appliedCommit = stdout.trim()
    const applied = await markPendingDocUpdateApplied(docUpdate.id, appliedCommit, 'system')
    cacheHeadersNoStore(res)
    res.json({ docUpdate: applied, appliedCommit })
  } catch (error) {
    await restoreTrackedFile(relativePath)
    try {
      const recoveredContent = readFileSafe(resolvedPath)
      if (recoveredContent !== currentContent) {
        fs.writeFileSync(resolvedPath, currentContent, 'utf8')
      }
    } catch {
      // Best-effort recovery only.
    }

    try {
      await markPendingDocUpdateFailed(docUpdate.id, {
        errorDetail: error instanceof Error ? error.message : 'Failed to apply doc update.',
        partialWrite: false,
      }, 'system')
    } catch {
      // Preserve the original apply error below.
    }

    sendApiError(
      res,
      500,
      'doc_update_apply_failed',
      error instanceof Error ? error.message : 'Failed to apply doc update.'
    )
  }
})

app.get('/api/doc', async (req, res) => {
  const filePath = resolveRequestedDoc(req.query.path)

  if (!filePath) {
    sendApiError(res, 400, 'invalid_doc_path', 'Invalid doc path.')
    return
  }

  const content = readFileSafe(filePath)

  if (!content) {
    sendApiError(res, 404, 'document_not_found', 'Document not found.')
    return
  }

  try {
    if (path.relative(__dirname, filePath) === 'docs/strategy/bhag-model.md') {
      res.setHeader('Cache-Control', 'no-store')
    }

    const sourceSnapshot = await getDocSourceSnapshot(path.relative(__dirname, filePath))
    const sourceContracts = getSourceContractsByIds(
      Array.from(new Set(sourceSnapshot.map(row => row.sourceId)))
    )
    res.json({
      title: getDocTitle(content, filePath),
      meta: getDocMeta(filePath),
      content,
      sourceSnapshot,
      sourceContracts,
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'doc_snapshot_load_failed',
      error instanceof Error ? error.message : 'Failed to load document source snapshot.'
    )
  }
})

app.get('/doc', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'doc.html'))
})

app.get('/foundation', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'foundation.html'))
})

app.get('/foundation/export/strategy.pdf', async (_req, res) => {
  try {
    const businessStrategy = readFileSafe(businessStrategyPath)
    if (!businessStrategy) {
      sendApiError(res, 404, 'strategy_missing', 'Business strategy source file is missing.')
      return
    }

    const packet = {
      meta: getDocMeta(businessStrategyPath),
      sections: parseSections(businessStrategy),
    }

    const pdfBytes = await buildBusinessStrategyPdf(packet)
    cacheHeadersNoStore(res)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=\"benson-crew-business-strategy.pdf\"')
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    console.error('Failed to generate business strategy PDF:', error)
    sendApiError(res, 500, 'strategy_pdf_failed', 'Failed to generate the business strategy PDF.')
  }
})

app.get('/foundation/export/strategy', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'strategy-export.html'))
})

app.get('/strategic-execution', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'strategic-execution.html'))
})

app.use('/api', (_req, res) => {
  sendApiError(res, 404, 'api_not_found', 'API endpoint not found.')
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

async function start() {
  await initFoundationDb()

  const server = app.listen(port, () => {
    console.log(`BCrew AI OS dashboard listening on http://localhost:${port}`)
  })

  let isShuttingDown = false
  const shutdown = async () => {
    if (isShuttingDown) return
    isShuttingDown = true

    try {
      await closeServer(server)
      await closeFoundationDb()
      process.exit(0)
    } catch (error) {
      console.error('Failed to shut down BCrew AI OS dashboard cleanly:', error)
      process.exit(1)
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch(error => {
  console.error('Failed to start BCrew AI OS dashboard:', error)
  process.exit(1)
})
