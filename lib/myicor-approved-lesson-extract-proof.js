import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID = 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY = 'myicor-approved-lesson-extract-proof-v1'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PLAN_PATH = 'docs/process/myicor-approved-lesson-extract-proof-001-plan.md'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_APPROVAL_PATH = 'docs/process/approvals/MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001.json'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SCRIPT_PATH = 'scripts/process-myicor-approved-lesson-extract-proof-check.mjs'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY = 'myicor-approved-lesson-extract-proof-v1'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID = 'source-system:myicor:approved-lesson-extract-proof:v1'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID = 'SRC-MYICRO-001'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_NAME = 'MyICOR'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_ARTIFACT_ROOT = '.openclaw/myicor-approved-lesson-extract'
export const MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PROFILE_DIR = '.openclaw/myicor-mcp-oauth/profiles/myicor-authorized-member'

export const MYICOR_APPROVED_RESOURCE_TITLE = 'Stop Managing Your AI Agents. Build the One That Manages Them for You.'
export const MYICOR_APPROVED_RESOURCE_URL = 'https://app.myicor.com/resources/stop-managing-your-ai-agents-build-the-one-that-manages-them-for-you'
export const MYICOR_APPROVED_RESOURCE_EXTERNAL_ID = 'resource:stop-managing-your-ai-agents-build-the-one-that-manages-them-for-you'

const REQUIRED_APPROVAL_FORBIDDEN_ACTIONS = [
  'broad_crawl',
  'adjacent_navigation',
  'clicks',
  'forms',
  'comments',
  'likes',
  'bookmarks',
  'downloads',
  'purchases',
  'post_comment_message',
  'profile_account_credential_mutation',
  'normal_chrome',
  'browserbase',
  'external_writes',
  'atom_vector_writes',
]

const CONTENT_SIGNAL_PATTERNS = [
  {
    id: 'chief_of_staff_agent',
    label: 'Manager agent / chief-of-staff pattern',
    terms: ['chief of staff', 'ai agents', 'managing your ai agents'],
    buildRoute: 'Use a manager agent over specialists instead of manually steering every worker.',
  },
  {
    id: 'agent_orchestration',
    label: 'Agent orchestration',
    terms: ['orchestration', 'delegate', 'delegates', 'team leader', 'handoff'],
    buildRoute: 'Route tasks through explicit orchestration, delegation, and handoff state.',
  },
  {
    id: 'compounding_memory',
    label: 'Compounding memory',
    terms: ['memory', 'context', 'compounds', 'gets better'],
    buildRoute: 'Persist context, run state, and lessons so future agents improve instead of restarting.',
  },
  {
    id: 'project_operating_system',
    label: 'Project operating system',
    terms: ['projects', 'priorities', 'workflow', 'tasks'],
    buildRoute: 'Tie source extraction to project/workflow state, not isolated page reads.',
  },
  {
    id: 'friday_architecture',
    label: 'Friday-style architecture reference',
    terms: ['friday', 'architecture'],
    buildRoute: 'Treat named architecture patterns as reviewable build evidence for the Human Web Agent sprint.',
  },
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function lower(value) {
  return text(value).toLowerCase()
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(item => stableJson(item)).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function stableMyicorApprovedLessonHash(value) {
  const hash = crypto.createHash('sha256')
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    hash.update(value)
  } else {
    hash.update(typeof value === 'string' ? value : stableJson(value))
  }
  return hash.digest('hex')
}

function normalizeUrl(value = '') {
  const raw = text(value)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    url.hash = ''
    const normalized = url.toString()
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
  } catch {
    return raw.replace(/\/+$/, '')
  }
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function contentHashFromText(value = '') {
  return stableMyicorApprovedLessonHash(cleanText(value))
}

function buildRunId(now = new Date().toISOString()) {
  return `myicor-approved-lesson-${String(now).replace(/[-:.TZ]/g, '').slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`
}

function isUnderLocalArtifactRoot(value = '') {
  return text(value).includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_ARTIFACT_ROOT)
}

export function buildMyicorApprovedLessonApprovalPacket({ approvedAt = '2026-05-29T00:00:00.000-04:00' } = {}) {
  return {
    cardId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
    sourceId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID,
    sourceName: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_NAME,
    approvedBy: 'Steve',
    approvedAt,
    exactSourceApproval: true,
    targetTitle: MYICOR_APPROVED_RESOURCE_TITLE,
    targetUrl: MYICOR_APPROVED_RESOURCE_URL,
    allowedAccount: 'steve.zahnd@bensoncrew.ca via source-owned isolated MyICOR profile',
    purpose: 'Extract one exact MyICOR resource as evidence for the Human Web Agent / agentic OS / memory sprint.',
    allowedArtifacts: [
      'MCP metadata match',
      'exact approved page DOM/text read',
      'headings and link inventory',
      'local-only raw text artifact',
      'local-only screenshot artifact',
      'content hash and screenshot hash',
      'source_crawl_target/source_crawl_item proof rows',
      'intelligence_report_artifacts proof row',
    ],
    forbiddenActions: REQUIRED_APPROVAL_FORBIDDEN_ACTIONS,
    stopConditions: [
      'login wall or MFA prompt',
      'purchase or checkout page',
      'download prompt',
      'comment/message/form surface',
      'profile/account/credential mutation prompt',
      'redirect outside app.myicor.com',
      'any page other than the exact approved resource URL',
    ],
    costPolicy: {
      llmCallsAllowed: false,
      browserbaseAllowed: false,
      normalChromeProfileAllowed: false,
      maxPages: 1,
      maxRuntimeSeconds: 120,
    },
  }
}

export function normalizeMyicorApprovedResourceMcpMatch(mcpSearchResult = {}) {
  const payload = mcpSearchResult.payload || mcpSearchResult
  const results = list(payload.results || mcpSearchResult.results)
  const exactUrl = normalizeUrl(MYICOR_APPROVED_RESOURCE_URL)
  const exactTitle = lower(MYICOR_APPROVED_RESOURCE_TITLE)
  const exact = results.find(row => normalizeUrl(row?.url) === exactUrl) ||
    results.find(row => lower(row?.title) === exactTitle) ||
    null
  return {
    ok: Boolean(exact),
    query: text(payload.query || mcpSearchResult.query || MYICOR_APPROVED_RESOURCE_TITLE),
    total: number(payload.total ?? results.length),
    tokenRefreshed: Boolean(mcpSearchResult.tokenRefreshed),
    rawSecretPrinted: mcpSearchResult.rawSecretPrinted === true,
    exactMatch: exact ? {
      title: text(exact.title),
      type: text(exact.type),
      url: text(exact.url),
      categories: list(exact.categories).map(text),
      publishedDate: text(exact.published_date || exact.publishedDate),
    } : null,
  }
}

function buildContentSignalsFromText(pageText = '') {
  const normalized = lower(pageText)
  return CONTENT_SIGNAL_PATTERNS.map(pattern => {
    const matchedTerms = pattern.terms.filter(term => normalized.includes(lower(term)))
    return {
      id: pattern.id,
      label: pattern.label,
      present: matchedTerms.length > 0,
      matchedTerms,
      buildRoute: pattern.buildRoute,
    }
  }).filter(signal => signal.present)
}

function summarizeLinks(links = []) {
  const normalizedLinks = list(links).map(link => ({
    text: cleanText(link.text).slice(0, 120),
    href: text(link.href),
    sameHost: Boolean(link.sameHost),
    risky: Boolean(link.risky),
  })).slice(0, 40)
  return {
    total: normalizedLinks.length,
    sameHostCount: normalizedLinks.filter(link => link.sameHost).length,
    externalCount: normalizedLinks.filter(link => !link.sameHost).length,
    riskyCount: normalizedLinks.filter(link => link.risky).length,
    links: normalizedLinks,
  }
}

function hasPasswordInput(inputs = []) {
  return list(inputs).some(input => /password/i.test(text(input.type)))
}

function detectsAuthWall({ textContent = '', inputs = [], finalUrl = '' } = {}) {
  const body = lower(textContent)
  const final = lower(finalUrl)
  if (hasPasswordInput(inputs)) return true
  if (/\/login|\/sign-in|\/signin|\/authorize/.test(final)) return true
  if (body.length > 6000) return false
  return /sign in to continue|log in to continue|continue with google|verify it is you|two-step|2fa|authenticator|authorize/i.test(textContent)
}

function normalizeExtractionResult(input = {}) {
  return {
    route: text(input.route || 'fixture'),
    capturedAt: text(input.capturedAt || new Date().toISOString()),
    runId: text(input.runId || 'fixture'),
    sourceProfileDir: text(input.sourceProfileDir || MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PROFILE_DIR),
    artifactDir: text(input.artifactDir || ''),
    targetUrl: normalizeUrl(input.targetUrl || MYICOR_APPROVED_RESOURCE_URL),
    finalUrl: normalizeUrl(input.finalUrl || input.url || MYICOR_APPROVED_RESOURCE_URL),
    pageTitle: text(input.pageTitle || input.title),
    h1: text(input.h1),
    textChars: number(input.textChars),
    contentHash: text(input.contentHash),
    rawTextPath: text(input.rawTextPath),
    screenshotPath: text(input.screenshotPath),
    screenshotHash: text(input.screenshotHash),
    screenshotBytes: number(input.screenshotBytes),
    headings: list(input.headings).map(heading => ({
      level: text(heading.level),
      text: cleanText(heading.text).slice(0, 180),
    })),
    linkInventory: input.linkInventory || summarizeLinks(input.links || []),
    buttons: list(input.buttons).map(button => cleanText(button).slice(0, 120)).slice(0, 30),
    inputs: list(input.inputs).map(input => ({
      type: text(input.type || 'text'),
      name: text(input.name),
      placeholder: text(input.placeholder),
    })).slice(0, 30),
    contentSignals: list(input.contentSignals),
    sideEffects: {
      clicksAttempted: number(input.sideEffects?.clicksAttempted),
      formsSubmitted: number(input.sideEffects?.formsSubmitted),
      downloadsStarted: number(input.sideEffects?.downloadsStarted),
      downloadsCancelled: number(input.sideEffects?.downloadsCancelled),
      externalWritesStarted: Boolean(input.sideEffects?.externalWritesStarted),
      pagesOpened: number(input.sideEffects?.pagesOpened || 1),
      documentNavigations: list(input.sideEffects?.documentNavigations).slice(0, 10),
      browserbaseUsed: Boolean(input.sideEffects?.browserbaseUsed),
      normalChromeProfileUsed: Boolean(input.sideEffects?.normalChromeProfileUsed),
    },
    authWallDetected: Boolean(input.authWallDetected),
    wrongSignupBranchDetected: Boolean(input.wrongSignupBranchDetected),
    localOnlyArtifacts: input.localOnlyArtifacts !== false,
  }
}

export async function runMyicorApprovedLessonBrowserExtraction({
  repoRoot = process.cwd(),
  profileDir = MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PROFILE_DIR,
  artifactRoot = MYICOR_APPROVED_LESSON_EXTRACT_PROOF_ARTIFACT_ROOT,
  headless = true,
  now = new Date().toISOString(),
  timeoutMs = 45000,
} = {}) {
  const { chromium } = await import('playwright')
  const runId = buildRunId(now)
  const resolvedProfileDir = path.resolve(repoRoot, profileDir)
  const runDir = path.resolve(repoRoot, artifactRoot, 'runs', runId)
  const artifactDir = path.join(runDir, 'artifacts')
  const rawTextPath = path.join(artifactDir, 'page-text.txt')
  const screenshotPath = path.join(artifactDir, 'viewport.png')
  const sideEffects = {
    clicksAttempted: 0,
    formsSubmitted: 0,
    downloadsStarted: 0,
    downloadsCancelled: 0,
    externalWritesStarted: false,
    pagesOpened: 1,
    documentNavigations: [],
    browserbaseUsed: false,
    normalChromeProfileUsed: false,
  }

  await fs.mkdir(artifactDir, { recursive: true })
  await fs.mkdir(resolvedProfileDir, { recursive: true })

  const context = await chromium.launchPersistentContext(resolvedProfileDir, {
    headless: Boolean(headless),
    acceptDownloads: false,
    viewport: { width: 1440, height: 1000 },
  })
  context.on('page', openedPage => {
    sideEffects.pagesOpened += 1
    openedPage.on('download', download => {
      sideEffects.downloadsStarted += 1
      sideEffects.downloadsCancelled += 1
      download.cancel().catch(() => {})
    })
  })
  await context.route('**/*', route => {
    const request = route.request()
    const requestUrl = request.url()
    if (request.resourceType() === 'document') {
      sideEffects.documentNavigations.push(requestUrl)
      try {
        const parsed = new URL(requestUrl)
        if (parsed.hostname !== 'app.myicor.com' && requestUrl !== 'about:blank') {
          return route.abort('blockedbyclient').catch(() => {})
        }
      } catch {
        return route.abort('blockedbyclient').catch(() => {})
      }
    }
    return route.continue().catch(() => {})
  })

  try {
    const page = context.pages()[0] || await context.newPage()
    page.on('download', download => {
      sideEffects.downloadsStarted += 1
      sideEffects.downloadsCancelled += 1
      download.cancel().catch(() => {})
    })
    await page.goto(MYICOR_APPROVED_RESOURCE_URL, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(1500).catch(() => {})

    const snapshot = await page.evaluate(() => {
      const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
      const main = document.querySelector('main') || document.body
      const textContent = clean(main?.innerText || document.body?.innerText || '')
      const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
        .map(node => ({ level: node.tagName.toLowerCase(), text: clean(node.innerText || node.textContent || '') }))
        .filter(row => row.text)
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(node => {
          const href = node.href || ''
          let sameHost = false
          try {
            sameHost = new URL(href).hostname === window.location.hostname
          } catch {
            sameHost = false
          }
          return {
            text: clean(node.innerText || node.textContent || node.getAttribute('aria-label') || ''),
            href,
            sameHost,
            risky: /checkout|billing|purchase|subscribe|download|logout|delete|settings|profile|account|comment|message/i.test(`${href} ${node.innerText || ''}`),
          }
        })
        .filter(row => row.href)
      const buttons = Array.from(document.querySelectorAll('button,[role="button"]'))
        .map(node => clean(node.innerText || node.textContent || node.getAttribute('aria-label') || ''))
        .filter(Boolean)
      const inputs = Array.from(document.querySelectorAll('input,textarea,select'))
        .map(node => ({
          type: node.getAttribute('type') || node.tagName.toLowerCase(),
          name: node.getAttribute('name') || '',
          placeholder: node.getAttribute('placeholder') || '',
        }))
      return {
        url: window.location.href,
        pageTitle: document.title || '',
        h1: headings.find(row => row.level === 'h1')?.text || '',
        textContent,
        textChars: textContent.length,
        headings,
        links,
        buttons,
        inputs,
      }
    })

    const textContent = cleanText(snapshot.textContent)
    await fs.writeFile(rawTextPath, `${textContent}\n`, 'utf8')
    const screenshotBuffer = await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false }).catch(() => null)
    const contentHash = contentHashFromText(textContent)
    const screenshotHash = screenshotBuffer ? stableMyicorApprovedLessonHash(screenshotBuffer) : ''
    const screenshotStat = screenshotBuffer ? await fs.stat(screenshotPath).catch(() => null) : null
    const relativeRawTextPath = path.relative(repoRoot, rawTextPath)
    const relativeScreenshotPath = screenshotBuffer ? path.relative(repoRoot, screenshotPath) : ''
    const extraction = normalizeExtractionResult({
      route: 'myicor_source_owned_isolated_playwright_profile_exact_url',
      capturedAt: now,
      runId,
      sourceProfileDir: path.relative(repoRoot, resolvedProfileDir),
      artifactDir: path.relative(repoRoot, artifactDir),
      targetUrl: MYICOR_APPROVED_RESOURCE_URL,
      finalUrl: snapshot.url,
      pageTitle: snapshot.pageTitle,
      h1: snapshot.h1,
      textChars: textContent.length,
      contentHash,
      rawTextPath: relativeRawTextPath,
      screenshotPath: relativeScreenshotPath,
      screenshotHash,
      screenshotBytes: screenshotStat?.size || screenshotBuffer?.length || 0,
      headings: snapshot.headings,
      links: snapshot.links,
      buttons: snapshot.buttons,
      inputs: snapshot.inputs,
      contentSignals: buildContentSignalsFromText(textContent),
      sideEffects,
      authWallDetected: detectsAuthWall({
        textContent,
        inputs: snapshot.inputs,
        finalUrl: snapshot.url,
      }),
      wrongSignupBranchDetected: /create profile|start free|sign up/i.test(textContent) && textContent.length < 6000,
      localOnlyArtifacts: true,
    })
    return extraction
  } finally {
    await context.close().catch(() => {})
  }
}

export function buildMyicorApprovedLessonFixtureExtraction() {
  const synthetic = [
    MYICOR_APPROVED_RESOURCE_TITLE,
    'Synthetic fixture only. It models a resource about a chief of staff agent that manages AI agents, delegates work to specialists, keeps context, tracks priorities, and improves through compounding memory.',
    'The manager agent acts as the team leader for orchestration, workflow handoff, project state, and Friday-style architecture review.',
  ].join(' ').repeat(18)
  return normalizeExtractionResult({
    route: 'fixture_no_live_browser',
    capturedAt: '2026-05-29T12:00:00.000Z',
    runId: 'fixture',
    sourceProfileDir: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PROFILE_DIR,
    artifactDir: `${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_ARTIFACT_ROOT}/fixtures`,
    targetUrl: MYICOR_APPROVED_RESOURCE_URL,
    finalUrl: MYICOR_APPROVED_RESOURCE_URL,
    pageTitle: 'Resources - Stop Managing Your Ai Agents Build The One That Manages Them For You | myICOR',
    h1: MYICOR_APPROVED_RESOURCE_TITLE,
    textChars: synthetic.length,
    contentHash: contentHashFromText(synthetic),
    rawTextPath: `${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_ARTIFACT_ROOT}/fixtures/page-text.txt`,
    screenshotPath: `${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_ARTIFACT_ROOT}/fixtures/viewport.png`,
    screenshotHash: stableMyicorApprovedLessonHash('fixture-screenshot'),
    screenshotBytes: 5000,
    headings: [
      { level: 'h1', text: MYICOR_APPROVED_RESOURCE_TITLE },
      { level: 'h2', text: 'Why Every Growing Team Needs a Chief of Staff' },
      { level: 'h2', text: 'What a Chief of Staff Agent Actually Does' },
      { level: 'h2', text: 'How I Built Friday: The Architecture That Compounds' },
    ],
    links: [{ text: 'Related Resources', href: 'https://app.myicor.com/resources', sameHost: true, risky: false }],
    buttons: ['Like', 'Bookmark', 'Share your thoughts'],
    inputs: [],
    contentSignals: buildContentSignalsFromText(synthetic),
    sideEffects: {
      clicksAttempted: 0,
      formsSubmitted: 0,
      downloadsStarted: 0,
      downloadsCancelled: 0,
      externalWritesStarted: false,
      pagesOpened: 1,
      documentNavigations: [MYICOR_APPROVED_RESOURCE_URL],
      browserbaseUsed: false,
      normalChromeProfileUsed: false,
    },
    authWallDetected: false,
    wrongSignupBranchDetected: false,
    localOnlyArtifacts: true,
  })
}

export function buildMyicorApprovedLessonFixtureMcpSearchResult() {
  return {
    ok: true,
    payload: {
      total: 1,
      results: [
        {
          title: MYICOR_APPROVED_RESOURCE_TITLE,
          type: 'Article',
          url: MYICOR_APPROVED_RESOURCE_URL,
          categories: ['PPM'],
          published_date: '2026-03-06T18:00:00+00:00',
        },
      ],
    },
    tokenRefreshed: false,
    rawSecretPrinted: false,
  }
}

export function buildMyicorApprovedLessonExtractionProof({
  mcpSearchResult = buildMyicorApprovedLessonFixtureMcpSearchResult(),
  browserExtraction = buildMyicorApprovedLessonFixtureExtraction(),
  liveMcp = false,
  liveBrowser = false,
  capturedAt = new Date().toISOString(),
  approval = buildMyicorApprovedLessonApprovalPacket({ approvedAt: capturedAt }),
} = {}) {
  const mcpMatch = normalizeMyicorApprovedResourceMcpMatch(mcpSearchResult)
  const extraction = normalizeExtractionResult(browserExtraction)
  const exactUrl = normalizeUrl(MYICOR_APPROVED_RESOURCE_URL)
  const finalUrl = normalizeUrl(extraction.finalUrl)
  const contentSignals = list(extraction.contentSignals).length
    ? list(extraction.contentSignals)
    : []

  return {
    schemaVersion: 1,
    cardId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
    closeoutKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY,
    sourceId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID,
    sourceName: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_NAME,
    targetKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY,
    reportArtifactId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
    capturedAt: text(extraction.capturedAt || capturedAt),
    liveMcp: Boolean(liveMcp),
    liveBrowser: Boolean(liveBrowser),
    target: {
      title: MYICOR_APPROVED_RESOURCE_TITLE,
      url: MYICOR_APPROVED_RESOURCE_URL,
      externalId: MYICOR_APPROVED_RESOURCE_EXTERNAL_ID,
      exactUrlMatched: finalUrl === exactUrl,
    },
    approval,
    mcp: mcpMatch,
    extraction: {
      route: extraction.route,
      runId: extraction.runId,
      sourceProfileDir: extraction.sourceProfileDir,
      artifactDir: extraction.artifactDir,
      finalUrl: extraction.finalUrl,
      pageTitle: extraction.pageTitle,
      h1: extraction.h1,
      textChars: extraction.textChars,
      contentHash: extraction.contentHash,
      rawTextPath: extraction.rawTextPath,
      screenshotPath: extraction.screenshotPath,
      screenshotHash: extraction.screenshotHash,
      screenshotBytes: extraction.screenshotBytes,
      headings: extraction.headings.slice(0, 12),
      linkInventory: extraction.linkInventory,
      buttonCount: extraction.buttons.length,
      inputCount: extraction.inputs.length,
      passwordInputDetected: hasPasswordInput(extraction.inputs),
      authWallDetected: extraction.authWallDetected,
      wrongSignupBranchDetected: extraction.wrongSignupBranchDetected,
      localOnlyArtifacts: extraction.localOnlyArtifacts,
      sideEffects: extraction.sideEffects,
    },
    buildIntelRoute: {
      status: contentSignals.length ? 'evidence_ready_for_director_review' : 'needs_human_review',
      directorEligible: true,
      autoBacklogPromotionAllowed: false,
      suggestedUse: 'Use as extracted source evidence for manager-agent, memory, and orchestration implementation decisions. Do not auto-promote without Steve review.',
      contentSignals,
    },
    guardrails: {
      exactUrlOnly: true,
      maxPages: 1,
      mcpFirst: true,
      browserGapFillUsed: Boolean(liveBrowser),
      sourceOwnedIsolatedProfile: true,
      browserbaseUsed: extraction.sideEffects.browserbaseUsed === true,
      normalChromeProfileUsed: extraction.sideEffects.normalChromeProfileUsed === true,
      clicksAttempted: extraction.sideEffects.clicksAttempted,
      formsSubmitted: extraction.sideEffects.formsSubmitted,
      downloadsStarted: extraction.sideEffects.downloadsStarted,
      externalWritesStarted: extraction.sideEffects.externalWritesStarted,
      atomVectorWritesStarted: false,
      rawTextCommittedToRepo: false,
      screenshotCommittedToRepo: false,
    },
  }
}

export function evaluateMyicorApprovedLessonExtractionProof(proof = {}, {
  requireLiveMcp = false,
  requireLiveBrowser = false,
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const approval = proof.approval || {}
  const extraction = proof.extraction || {}
  const sideEffects = extraction.sideEffects || {}
  const forbidden = list(approval.forbiddenActions)
  const headingsText = list(extraction.headings).map(row => row.text).join(' ')
  const exactUrl = normalizeUrl(MYICOR_APPROVED_RESOURCE_URL)

  add(proof.cardId === MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID, 'proof is tied to the approved MyICOR extraction card', proof.cardId || 'missing')
  add(proof.sourceId === MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID, 'proof uses registered MyICOR source contract', proof.sourceId || 'missing')
  add(approval.exactSourceApproval === true && normalizeUrl(approval.targetUrl) === exactUrl, 'approval packet authorizes this exact resource only', approval.targetUrl || 'missing')
  add(REQUIRED_APPROVAL_FORBIDDEN_ACTIONS.every(action => forbidden.includes(action)), 'approval packet forbids broad crawl, clicks, downloads, Browserbase, normal Chrome, atom/vector writes, and external writes', forbidden.join(', '))
  add(proof.mcp?.ok === true && normalizeUrl(proof.mcp?.exactMatch?.url) === exactUrl, 'MCP metadata confirms exact resource before browser gap-fill', proof.mcp?.exactMatch?.url || 'missing')
  add(!requireLiveMcp || proof.liveMcp === true, 'live MCP metadata pass ran when required', String(proof.liveMcp))
  add(!requireLiveBrowser || proof.liveBrowser === true, 'live browser gap-fill ran when required', String(proof.liveBrowser))
  add(normalizeUrl(extraction.finalUrl) === exactUrl && proof.target?.exactUrlMatched === true, 'browser stayed on exact approved resource URL', extraction.finalUrl || 'missing')
  add(/stop managing your ai agents/i.test(`${extraction.pageTitle} ${extraction.h1} ${headingsText}`), 'page title/headings match the approved resource', `${extraction.pageTitle} / ${extraction.h1}`)
  add(number(extraction.textChars) >= 2500, 'resource body text was captured into local-only artifact', `${extraction.textChars || 0} chars`)
  add(/^[0-9a-f]{64}$/i.test(extraction.contentHash || ''), 'content hash is recorded', extraction.contentHash || 'missing')
  add(!requireLiveBrowser || /^[0-9a-f]{64}$/i.test(extraction.screenshotHash || ''), 'screenshot hash is recorded for live browser proof', extraction.screenshotHash || 'missing')
  add(!requireLiveBrowser || number(extraction.screenshotBytes) > 1000, 'live screenshot artifact has non-trivial bytes', String(extraction.screenshotBytes || 0))
  add(isUnderLocalArtifactRoot(extraction.rawTextPath) && extraction.localOnlyArtifacts === true, 'raw text is local-only under .openclaw', extraction.rawTextPath || 'missing')
  add(!extraction.screenshotPath || isUnderLocalArtifactRoot(extraction.screenshotPath), 'screenshot path is local-only under .openclaw', extraction.screenshotPath || 'missing')
  add(extraction.authWallDetected !== true && extraction.passwordInputDetected !== true && extraction.wrongSignupBranchDetected !== true, 'proof did not stop on login, MFA, password, or wrong signup branch', JSON.stringify({ authWallDetected: extraction.authWallDetected, passwordInputDetected: extraction.passwordInputDetected, wrongSignupBranchDetected: extraction.wrongSignupBranchDetected }))
  add(number(sideEffects.clicksAttempted) === 0 && number(sideEffects.formsSubmitted) === 0, 'no clicks or forms were attempted', JSON.stringify(sideEffects))
  add(number(sideEffects.downloadsStarted) === 0 && sideEffects.externalWritesStarted !== true, 'no downloads or external writes started', JSON.stringify(sideEffects))
  add(proof.guardrails?.browserbaseUsed === false && proof.guardrails?.normalChromeProfileUsed === false, 'Browserbase and normal Chrome were not used', JSON.stringify(proof.guardrails || {}))
  add(proof.guardrails?.atomVectorWritesStarted === false && proof.guardrails?.autoBacklogPromotionAllowed !== true, 'no atom/vector writes or auto backlog promotion', JSON.stringify(proof.guardrails || {}))
  add(list(proof.buildIntelRoute?.contentSignals).length >= 3, 'extracted evidence has build-intel signals for manager-agent/memory/orchestration review', list(proof.buildIntelRoute?.contentSignals).map(row => row.id).join(', '))

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    checks,
    failed,
  }
}

export function buildMyicorApprovedLessonSourceCrawlTargetInput(proof = {}) {
  return {
    targetKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY,
    sourceId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID,
    title: 'MyICOR approved exact resource extraction proof',
    lane: 'corpus_mining',
    targetType: 'approved_exact_content_extraction',
    status: 'complete',
    priority: 'P0',
    runtimeMode: 'manual',
    inspectedCount: 1,
    archivedCount: 1,
    extractedCount: 1,
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 1,
      maxPagesPerRun: 1,
      maxRuntimeSeconds: 120,
      noExternalWrites: true,
      noBrowserbase: true,
      noNormalChromeProfile: true,
      localOnlyArtifacts: true,
      exactApprovalRequired: true,
    },
    dedupePolicy: {
      externalId: 'exact_resource_url_slug',
      fingerprint: 'page_text_sha256',
    },
    cursorState: {
      targetUrl: MYICOR_APPROVED_RESOURCE_URL,
      contentHash: proof.extraction?.contentHash || '',
      capturedAt: proof.capturedAt || '',
    },
    metadata: {
      cardId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
      closeoutKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY,
      reportArtifactId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
      targetTitle: MYICOR_APPROVED_RESOURCE_TITLE,
      targetUrl: MYICOR_APPROVED_RESOURCE_URL,
      approvalRef: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_APPROVAL_PATH,
      contentExtractionStatus: 'extracted_with_evidence',
      sourceState: 'graded_keep',
      externalWritesAllowed: false,
      browserbaseAllowed: false,
      normalChromeProfileAllowed: false,
    },
    notes: 'One exact Steve-approved MyICOR resource extraction. No broad crawl, adjacent navigation, forms, downloads, external writes, Browserbase, normal Chrome, atoms, or vectors.',
  }
}

export function buildMyicorApprovedLessonSourceCrawlItemInput(proof = {}) {
  const extraction = proof.extraction || {}
  const itemKey = `${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY}:${stableMyicorApprovedLessonHash(MYICOR_APPROVED_RESOURCE_EXTERNAL_ID).slice(0, 20)}`
  return {
    itemKey,
    targetKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY,
    sourceId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID,
    externalId: MYICOR_APPROVED_RESOURCE_EXTERNAL_ID,
    itemType: 'myicor_approved_resource_extraction',
    status: 'succeeded',
    fingerprint: extraction.contentHash,
    artifactId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
    processedAt: proof.capturedAt,
    metadata: {
      cardId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
      closeoutKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY,
      sourceName: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_NAME,
      sourceState: 'graded_keep',
      reviewState: 'graded_keep',
      extractionStatus: 'extracted_with_evidence',
      contentExtractionStatus: 'extracted_with_evidence',
      implementedStatus: 'not_cleared',
      targetTitle: MYICOR_APPROVED_RESOURCE_TITLE,
      targetUrl: MYICOR_APPROVED_RESOURCE_URL,
      finalUrl: extraction.finalUrl,
      route: extraction.route,
      contentHash: extraction.contentHash,
      textChars: extraction.textChars,
      rawTextPath: extraction.rawTextPath,
      screenshotPath: extraction.screenshotPath,
      screenshotHash: extraction.screenshotHash,
      localOnlyArtifacts: true,
      directorEligible: true,
      devDirectorEligible: true,
      approvalRef: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_APPROVAL_PATH,
      approvedBy: proof.approval?.approvedBy || 'Steve',
      approvedAt: proof.approval?.approvedAt || proof.capturedAt,
      contentSignals: list(proof.buildIntelRoute?.contentSignals).map(signal => signal.id),
      externalWritesAllowed: false,
      browserbaseUsed: false,
      normalChromeProfileUsed: false,
      clicksAttempted: number(extraction.sideEffects?.clicksAttempted),
      formsSubmitted: number(extraction.sideEffects?.formsSubmitted),
      downloadsStarted: number(extraction.sideEffects?.downloadsStarted),
      atomVectorWritesStarted: false,
    },
  }
}

export function buildMyicorApprovedLessonReportArtifact(proof = {}) {
  const extraction = proof.extraction || {}
  const signals = list(proof.buildIntelRoute?.contentSignals)
  return {
    reportArtifactId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
    reportType: 'proof',
    scopeKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY,
    department: 'foundation',
    title: 'MyICOR Approved Exact Resource Extraction Proof V1',
    status: 'generated',
    sourceIds: [MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID],
    inputArtifactIds: [
      'source-system:myicor:mcp-catalog-snapshot:v1',
      'builder-memory:startup-packet:v1',
    ],
    sourceCoverage: [
      {
        sourceId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID,
        sourceName: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_NAME,
        route: extraction.route,
        surfaces: ['learning_resource_metadata', 'exact_resource_page_text', 'headings', 'link_inventory', 'local_screenshot_hash'],
        exactUrlOnly: true,
        rawContentStoredLocalOnly: true,
      },
    ],
    topFindings: signals.map((signal, index) => ({
      rank: index + 1,
      finding: signal.label,
      buildRoute: signal.buildRoute,
      sourceFamily: 'myicor',
      evidenceLevel: 'exact_resource_extracted_with_local_artifact_hash',
    })),
    actionRequiredItems: [
      {
        cardId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
        action: 'Use this exact extracted evidence in the daily source review / Dev Director proposal bundle. Broaden only through another exact Steve-approved source packet.',
      },
      {
        cardId: 'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001',
        action: 'Reuse the exact packet pattern for one Skool source after Steve approves the exact community/class/thread boundary.',
      },
    ],
    openQuestions: [
      {
        question: 'Which exact MyICOR lesson/resource should be approved next, if any?',
        blockerCardId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
      },
    ],
    structuredOutputJson: proof,
    metadata: {
      cardId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
      closeoutKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY,
      targetKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY,
      targetUrl: MYICOR_APPROVED_RESOURCE_URL,
      contentHash: extraction.contentHash,
      screenshotHash: extraction.screenshotHash,
      rawTextPath: extraction.rawTextPath,
      screenshotPath: extraction.screenshotPath,
      localOnlyArtifacts: true,
      liveMcp: Boolean(proof.liveMcp),
      liveBrowser: Boolean(proof.liveBrowser),
      contentBodyCaptured: true,
      externalWritesAllowed: false,
      browserbaseAllowed: false,
      normalChromeProfileAllowed: false,
      atomVectorWritesStarted: false,
      autoBacklogPromotionAllowed: false,
    },
  }
}

export function buildMyicorApprovedLessonDogfoodProof() {
  const passing = buildMyicorApprovedLessonExtractionProof({
    mcpSearchResult: buildMyicorApprovedLessonFixtureMcpSearchResult(),
    browserExtraction: buildMyicorApprovedLessonFixtureExtraction(),
    liveMcp: false,
    liveBrowser: false,
    capturedAt: '2026-05-29T12:00:00.000Z',
  })
  const cases = [
    {
      name: 'approved exact fixture passes',
      expectedOk: true,
      evaluation: evaluateMyicorApprovedLessonExtractionProof(passing),
    },
    {
      name: 'wrong final URL is rejected',
      expectedOk: false,
      evaluation: evaluateMyicorApprovedLessonExtractionProof({
        ...passing,
        target: { ...passing.target, exactUrlMatched: false },
        extraction: { ...passing.extraction, finalUrl: 'https://app.myicor.com/resources/other-resource' },
      }),
    },
    {
      name: 'login/password wall is rejected',
      expectedOk: false,
      evaluation: evaluateMyicorApprovedLessonExtractionProof({
        ...passing,
        extraction: {
          ...passing.extraction,
          authWallDetected: true,
          passwordInputDetected: true,
        },
      }),
    },
    {
      name: 'side effects are rejected',
      expectedOk: false,
      evaluation: evaluateMyicorApprovedLessonExtractionProof({
        ...passing,
        extraction: {
          ...passing.extraction,
          sideEffects: {
            ...passing.extraction.sideEffects,
            clicksAttempted: 1,
            downloadsStarted: 1,
            externalWritesStarted: true,
          },
        },
      }),
    },
    {
      name: 'missing approval is rejected',
      expectedOk: false,
      evaluation: evaluateMyicorApprovedLessonExtractionProof({
        ...passing,
        approval: {
          ...passing.approval,
          exactSourceApproval: false,
        },
      }),
    },
    {
      name: 'Browserbase or normal Chrome route is rejected',
      expectedOk: false,
      evaluation: evaluateMyicorApprovedLessonExtractionProof({
        ...passing,
        guardrails: {
          ...passing.guardrails,
          browserbaseUsed: true,
          normalChromeProfileUsed: true,
        },
      }),
    },
  ]
  const ok = cases.every(row => row.evaluation.ok === row.expectedOk)
  return {
    ok,
    dogfoodInvariant: 'exact approved resource passes; wrong URL, auth wall, side effects, missing approval, Browserbase, and normal Chrome fail closed',
    cases: cases.map(row => ({
      name: row.name,
      expectedOk: row.expectedOk,
      actualOk: row.evaluation.ok,
      failedChecks: row.evaluation.failed.map(check => check.check),
    })),
  }
}
