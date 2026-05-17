import { execFile as execFileCallback } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { promisify } from 'node:util'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const require = createRequire(import.meta.url)
const fontkit = require('@pdf-lib/fontkit')
const execFileAsync = promisify(execFileCallback)

export const CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID = 'CRITICAL-ROOTS-UNDER-3K-PHASE-3'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_3_CLOSEOUT_KEY = 'critical-roots-under-3k-phase-3-v1'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_3_PLAN_PATH = 'docs/process/critical-roots-under-3k-phase-3-plan.md'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_3_APPROVAL_PATH = 'docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-3.json'
export const CRITICAL_ROOTS_UNDER_3K_PHASE_3_SCRIPT_PATH = 'scripts/process-critical-roots-under-3k-phase-3-check.mjs'
export const SERVER_DOCUMENT_STRATEGY_SURFACE_MODULE_PATH = 'lib/server-document-strategy-surface.js'
export const SERVER_DOCUMENT_STRATEGY_SURFACE_BEFORE_LINES = 4831
export const SERVER_DOCUMENT_STRATEGY_SURFACE_MAX_ROOT_LINES = 4300
export const SERVER_DOCUMENT_STRATEGY_SURFACE_MAX_MODULE_LINES = 1500

function lineCount(source = '') {
  return String(source || '').split(/\r?\n/).length
}

function addFinding(findings, condition, code, detail) {
  if (!condition) findings.push({ code, detail })
}

export function createServerDocumentStrategySurface({
  repoRoot,
  runtimeDir,
  privateLocalMarkdownMeta = {},
  stratumBoldPath,
} = {}) {
  const root = path.resolve(repoRoot || runtimeDir || process.cwd())
  const runtimeRoot = path.resolve(runtimeDir || root)
  const privateMeta = privateLocalMarkdownMeta && typeof privateLocalMarkdownMeta === 'object'
    ? privateLocalMarkdownMeta
    : {}
  const boldFontPath = stratumBoldPath || path.join(runtimeRoot, 'public', 'fonts', 'Stratum1-Bold.otf')

  function isAllowedDocPath(filePath) {
    const normalizedFilePath = path.resolve(filePath)
    const normalizedRepoRoot = root + path.sep
    if (!normalizedFilePath.startsWith(normalizedRepoRoot)) return false
    if (!normalizedFilePath.endsWith('.md')) return false

    const relativePath = path.relative(root, normalizedFilePath)
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return false
    if (Object.prototype.hasOwnProperty.call(privateMeta, relativePath)) return false
    if (
      relativePath.startsWith('memory/') ||
      relativePath.startsWith('node_modules/') ||
      relativePath.startsWith('.git/') ||
      relativePath.startsWith('.openclaw/') ||
      relativePath.startsWith('store/')
    ) {
      return false
    }

    return true
  }

  function resolveRequestedDoc(requestedPath) {
    if (typeof requestedPath !== 'string' || !requestedPath.trim()) return null
    const resolvedPath = path.resolve(runtimeRoot, requestedPath)
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
        path: path.relative(runtimeRoot, filePath),
        lines: content.split('\n').length,
        updatedAt: stat.mtime.toISOString(),
        daysOld: Math.floor((Date.now() - stat.mtimeMs) / 86400000),
      }
    } catch {
      return {
        exists: false,
        path: path.relative(runtimeRoot, filePath),
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

    const headingFont = await pdfDoc.embedFont(fs.readFileSync(boldFontPath))
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
    return execFileAsync('git', args, { cwd: runtimeRoot })
  }

  async function getGitStatusForFile(relativePath) {
    const { stdout } = await runGit(['status', '--porcelain', '--', relativePath])
    return stdout.trim()
  }

  async function getGitStatus() {
    const { stdout } = await runGit(['status', '--porcelain'])
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
    return path.relative(runtimeRoot, filePath)
  }

  function getDocTitle(markdown, filePath) {
    if (markdown) {
      const lines = markdown.split('\n')
      const heading = lines.find(line => line.startsWith('# '))
      if (heading) return heading.slice(2).trim()
    }

    return path.basename(filePath, '.md')
  }

  function getDocSurfaceMeta(relativePath) {
    const exact = {
      'docs/business-strategy.md': {
        surfaceLabel: 'Foundation > Strategy Packet',
        surfaceHref: '/foundation#overview',
        role: 'Canonical business strategy',
        category: 'Strategy & Doctrine',
        usage: 'runtime',
        storageClass: 'Primary surface',
      },
      'docs/system-strategy.md': {
        surfaceLabel: 'Foundation > System Strategy',
        surfaceHref: '/foundation#system-strategy',
        role: 'System doctrine',
        category: 'Strategy & Doctrine',
        usage: 'runtime',
        storageClass: 'Primary surface',
      },
      'docs/users/README.md': {
        surfaceLabel: 'Foundation > Users',
        surfaceHref: '/foundation#users',
        role: 'Visible user registry',
        category: 'People',
        usage: 'runtime',
        storageClass: 'Primary surface',
      },
      'docs/users/steve.md': {
        surfaceLabel: 'Foundation > People > Users > Steve',
        surfaceHref: '/foundation#user-steve',
        role: 'Visible user profile',
        category: 'People',
        usage: 'runtime',
        storageClass: 'Profile doc',
      },
      'docs/agents/README.md': {
        surfaceLabel: 'Foundation > People > Agents',
        surfaceHref: '/foundation#agents',
        role: 'Visible agent layer',
        category: 'People',
        usage: 'runtime',
        storageClass: 'Primary surface',
      },
      'docs/agents/harlan.md': {
        surfaceLabel: 'Foundation > People > Agents > Harlan',
        surfaceHref: '/foundation#agent-harlan',
        role: 'Visible personal-agent profile',
        category: 'People',
        usage: 'runtime',
        storageClass: 'Profile doc',
      },
      'docs/agents/crewbert.md': {
        surfaceLabel: 'Foundation > People > Agents > Crewbert',
        surfaceHref: '/foundation#agent-crewbert',
        role: 'Visible system-agent profile',
        category: 'People',
        usage: 'runtime',
        storageClass: 'Profile doc',
      },
      'docs/source-registry.md': {
        surfaceLabel: 'Foundation > Data Sources > Overview',
        surfaceHref: '/foundation#source-overview',
        role: 'Source layer operator note',
        category: 'Source Layer',
        usage: 'runtime',
        storageClass: 'Operator note',
      },
      'AGENTS.md': {
        surfaceLabel: 'Workspace runtime',
        surfaceHref: '',
        role: 'Workspace operating rules',
        category: 'Workspace Runtime',
        usage: 'runtime',
        storageClass: 'Runtime doc',
      },
      'SOUL.md': {
        surfaceLabel: 'Workspace runtime',
        surfaceHref: '',
        role: 'Assistant identity for this workspace',
        category: 'Workspace Runtime',
        usage: 'runtime',
        storageClass: 'Runtime doc',
      },
      'README.md': {
        surfaceLabel: 'Repo guide',
        surfaceHref: '',
        role: 'Repository overview',
        category: 'Workspace Runtime',
        usage: 'reference',
        storageClass: 'Reference doc',
      },
      'docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md': {
        surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
        surfaceHref: '/foundation#rebuild-plan',
        role: 'Retired rebuild decision log',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Decision log',
      },
      'docs/rebuild/current-state.md': {
        surfaceLabel: 'Foundation > Current State',
        surfaceHref: '/foundation#current-state',
        role: 'Current rebuild state',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'State summary',
      },
      'docs/rebuild/current-plan.md': {
        surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
        surfaceHref: '/foundation#rebuild-plan',
        role: 'Current rebuild plan',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Execution plan',
      },
      'docs/rebuild/intelligence-pipeline.md': {
        surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
        surfaceHref: '/foundation#rebuild-plan',
        role: 'Archive, extraction, synthesis, action routing, hub, and agent operating model',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Operating model',
      },
      'docs/rebuild/current-runtime-map.md': {
        surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
        surfaceHref: '/foundation#rebuild-plan',
        role: 'Plain-English runtime map',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Architecture explainer',
      },
      'docs/rebuild/agent-architecture.md': {
        surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
        surfaceHref: '/foundation#rebuild-plan',
        role: 'Target agent operating model',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Architecture doc',
      },
      'docs/rebuild/doc-cleanup-plan.md': {
        surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
        surfaceHref: '/foundation#rebuild-plan',
        role: 'Doc authority and evidence consolidation plan',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Operating plan',
      },
      'docs/rebuild/owners-closeout.md': {
        surfaceLabel: 'Foundation > Current State',
        surfaceHref: '/foundation#current-state',
        role: 'Owners package closeout order',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Closeout plan',
      },
      'docs/rebuild/plan-history/rebuild-master-plan-2026-04-29-retired.md': {
        surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
        surfaceHref: '/foundation#rebuild-plan',
        role: 'Archived rebuild baseline',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Baseline doc',
      },
      'docs/rebuild/README.md': {
        surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
        surfaceHref: '/foundation#rebuild-plan',
        role: 'Rebuild doc index',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Reference doc',
      },
    }

    if (exact[relativePath]) return exact[relativePath]

    if (relativePath.startsWith('docs/strategy/')) {
      const strategySurfaceMap = {
        'docs/strategy/bhag-model.md': '/foundation#bhag-model',
        'docs/strategy/core-values.md': '/foundation#core-values',
        'docs/strategy/agent-engine.md': '/foundation#agent-engine',
        'docs/strategy/department-mandates.md': '/foundation#departments',
        'docs/strategy/governance.md': '/foundation#governance',
        'docs/strategy/marketmasters.md': '/foundation#marketmasters',
        'docs/strategy/quarterly-priorities.md': '/strategic-execution#quarterly-priorities',
        'docs/strategy/strategic-issues.md': '/strategic-execution#strategic-issues',
      }

      return {
        surfaceLabel: strategySurfaceMap[relativePath]
          ? (strategySurfaceMap[relativePath].startsWith('/foundation')
            ? 'Foundation supporting doc'
            : 'Strategic Execution surface')
          : '',
        surfaceHref: strategySurfaceMap[relativePath] || '',
        role: 'Supporting strategy doc',
        category: 'Strategy & Doctrine',
        usage: 'runtime',
        storageClass: 'Supporting doc',
      }
    }

    if (relativePath.startsWith('docs/source-notes/')) {
      return {
        surfaceLabel: 'Foundation > Data Sources > Overview',
        surfaceHref: '/foundation#source-overview',
        role: 'Detailed source note',
        category: 'Source Layer',
        usage: 'runtime',
        storageClass: 'Storage note',
      }
    }

    if (relativePath.startsWith('docs/audits/')) {
      return {
        surfaceLabel: '',
        surfaceHref: '',
        role: 'Audit artifact',
        category: 'Audits & Reports',
        usage: 'reference',
        storageClass: 'Audit history',
      }
    }

    if (relativePath.startsWith('docs/handoffs/')) {
      return {
        surfaceLabel: '',
        surfaceHref: '',
        role: 'Session handoff',
        category: 'Audits & Reports',
        usage: 'reference',
        storageClass: 'Handoff history',
      }
    }

    if (relativePath.startsWith('docs/rebuild/')) {
      return {
        surfaceLabel: '',
        surfaceHref: '',
        role: 'Rebuild reference',
        category: 'Rebuild',
        usage: 'reference',
        storageClass: 'Planning doc',
      }
    }

    if (relativePath.startsWith('docs/research/')) {
      return {
        surfaceLabel: '',
        surfaceHref: '',
        role: 'Research artifact',
        category: 'Research & Specs',
        usage: 'reference',
        storageClass: 'Research archive',
      }
    }

    if (relativePath.startsWith('docs/specs/') || relativePath.startsWith('docs/superpowers/specs/')) {
      return {
        surfaceLabel: '',
        surfaceHref: '',
        role: 'Specification doc',
        category: 'Research & Specs',
        usage: 'reference',
        storageClass: 'Spec',
      }
    }

    if (relativePath.startsWith('docs/superpowers/plans/')) {
      return {
        surfaceLabel: '',
        surfaceHref: '',
        role: 'Plan artifact',
        category: 'Research & Specs',
        usage: 'reference',
        storageClass: 'Plan',
      }
    }

    if (['docs/process/local-doc-link.md', 'docs/process/doc-other-triage.md'].includes(relativePath)) {
      return {
        surfaceLabel: 'Foundation > System Inventory',
        surfaceHref: '/foundation#inventory-docs',
        role: 'Process runbook',
        category: 'Process & Runbooks',
        usage: 'runtime',
        storageClass: 'Process doc',
      }
    }

    return {
      surfaceLabel: '',
      surfaceHref: '',
      role: 'Markdown doc',
      category: 'Other',
      usage: 'reference',
      storageClass: 'Reference doc',
    }
  }

  return {
    isAllowedDocPath,
    resolveRequestedDoc,
    readFileSafe,
    getDocMeta,
    parseSections,
    slugify,
    formatTorontoDate,
    parsePdfBlocks,
    buildBusinessStrategyPdf,
    getHeadingSection,
    replaceHeadingSection,
    buildSimpleDiff,
    hashText,
    runGit,
    getGitStatusForFile,
    getGitStatus,
    restoreTrackedFile,
    toRelativeDocPath,
    getDocTitle,
    getDocSurfaceMeta,
  }
}

export function evaluateServerDocumentStrategySurfaceSplit(input = {}) {
  const rootSource = String(input.rootSource || '')
  const moduleSource = String(input.moduleSource || '')
  const rootLineCount = Number(input.rootLineCount || lineCount(rootSource))
  const moduleLineCount = Number(input.moduleLineCount || lineCount(moduleSource))
  const packageScripts = input.packageJson?.scripts || {}
  const findings = []
  const rootStillDefinesMovedDomain = [
    'isAllowedDocPath',
    'resolveRequestedDoc',
    'parsePdfBlocks',
    'buildBusinessStrategyPdf',
    'getHeadingSection',
    'hashText',
    'runGit',
    'getDocTitle',
    'getDocSurfaceMeta',
  ].filter(name => new RegExp(`function\\s+${name}\\s*\\(`).test(rootSource))
  const moduleRequiredPatterns = [
    { label: 'createServerDocumentStrategySurface export', pattern: /export\s+function\s+createServerDocumentStrategySurface\s*\(/ },
    { label: 'buildBusinessStrategyPdf function', pattern: /async\s+function\s+buildBusinessStrategyPdf\s*\(\s*packet\s*\)/ },
    { label: 'parsePdfBlocks function', pattern: /function\s+parsePdfBlocks\s*\(\s*markdown\s*\)/ },
    { label: 'getDocSurfaceMeta function', pattern: /function\s+getDocSurfaceMeta\s*\(\s*relativePath\s*\)/ },
    { label: 'getHeadingSection function', pattern: /function\s+getHeadingSection\s*\(\s*markdown,\s*targetSection\s*\)/ },
    { label: 'hashText function', pattern: /function\s+hashText\s*\(\s*value\s*\)/ },
    { label: 'runGit function', pattern: /async\s+function\s+runGit\s*\(\s*args\s*\)/ },
    { label: 'PDFDocument.create call', pattern: /PDFDocument\.create\(\)/ },
    { label: 'fontkit registration', pattern: /require\('@pdf-lib\/fontkit'\)/ },
    { label: 'private local markdown meta input', pattern: /privateLocalMarkdownMeta\s*=\s*\{\}/ },
    { label: 'buildSimpleDiff function', pattern: /function\s+buildSimpleDiff\s*\(\s*currentText,\s*proposedText\s*\)/ },
    { label: 'resolveRequestedDoc function', pattern: /function\s+resolveRequestedDoc\s*\(\s*requestedPath\s*\)/ },
  ]
  const missingModuleTokens = moduleRequiredPatterns
    .filter(({ pattern }) => !pattern.test(moduleSource))
    .map(({ label }) => label)
  const rootRouteTokens = [
    "app.get('/api/doc'",
    "app.get('/foundation/export/strategy.pdf'",
    'createServerDocumentStrategySurface({',
    'buildBusinessStrategyPdf(packet)',
  ]
  const missingRootRouteTokens = rootRouteTokens.filter(token => !rootSource.includes(token))
  const packageScriptValue = packageScripts['process:critical-roots-under-3k-phase-3-check']

  addFinding(findings, rootLineCount < SERVER_DOCUMENT_STRATEGY_SURFACE_BEFORE_LINES, 'root_not_reduced', `${rootLineCount}/${SERVER_DOCUMENT_STRATEGY_SURFACE_BEFORE_LINES}`)
  addFinding(findings, rootLineCount <= SERVER_DOCUMENT_STRATEGY_SURFACE_MAX_ROOT_LINES, 'root_above_phase_3_budget', `${rootLineCount}/${SERVER_DOCUMENT_STRATEGY_SURFACE_MAX_ROOT_LINES}`)
  addFinding(findings, moduleLineCount <= SERVER_DOCUMENT_STRATEGY_SURFACE_MAX_MODULE_LINES, 'module_above_1500', `${moduleLineCount}/${SERVER_DOCUMENT_STRATEGY_SURFACE_MAX_MODULE_LINES}`)
  addFinding(findings, rootStillDefinesMovedDomain.length === 0, 'root_still_defines_document_strategy_domain', rootStillDefinesMovedDomain.join(', '))
  addFinding(findings, missingModuleTokens.length === 0, 'module_missing_document_strategy_tokens', missingModuleTokens.join(', '))
  addFinding(findings, missingRootRouteTokens.length === 0, 'root_missing_route_or_factory_wiring', missingRootRouteTokens.join(', '))
  addFinding(findings, packageScriptValue === `node --env-file-if-exists=.env ${CRITICAL_ROOTS_UNDER_3K_PHASE_3_SCRIPT_PATH}`, 'package_script_missing', CRITICAL_ROOTS_UNDER_3K_PHASE_3_SCRIPT_PATH)

  return {
    ok: findings.length === 0,
    findings,
    rootLineCount,
    moduleLineCount,
    rootStillDefinesMovedDomain,
    missingModuleTokens,
    missingRootRouteTokens,
  }
}

export function buildServerDocumentStrategySurfaceDogfoodProof(goodFixture = {}) {
  const rejected = {
    rootNotReduced: evaluateServerDocumentStrategySurfaceSplit({
      ...goodFixture,
      rootLineCount: SERVER_DOCUMENT_STRATEGY_SURFACE_BEFORE_LINES,
    }),
    oversizedModule: evaluateServerDocumentStrategySurfaceSplit({
      ...goodFixture,
      moduleLineCount: SERVER_DOCUMENT_STRATEGY_SURFACE_MAX_MODULE_LINES + 1,
    }),
    rootStillOwnsDomain: evaluateServerDocumentStrategySurfaceSplit({
      ...goodFixture,
      rootSource: `${goodFixture.rootSource || ''}\nfunction buildBusinessStrategyPdf(packet) { return packet }`,
    }),
    missingPdfBuilder: evaluateServerDocumentStrategySurfaceSplit({
      ...goodFixture,
      moduleSource: String(goodFixture.moduleSource || '').replace('function buildBusinessStrategyPdf(packet)', 'function buildBusinessStrategyPdfMoved(packet)'),
    }),
    arbitraryLineMovement: evaluateServerDocumentStrategySurfaceSplit({
      ...goodFixture,
      moduleSource: 'export function movedLinesOnly() { return true }',
    }),
    missingPackageScript: evaluateServerDocumentStrategySurfaceSplit({
      ...goodFixture,
      packageJson: { scripts: {} },
    }),
  }
  const ok = Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    rejected,
    dogfoodInvariant: ok
      ? 'unchanged root, oversized module, root-owned PDF builder, missing PDF builder, arbitrary line movement, and missing package script fixtures fail closed'
      : 'server document strategy split dogfood did not reject every known bad fixture',
  }
}
