import { validateMultimodalExtractionEnvelope } from './multimodal-extractor-contract.js'

export const WEB_GODMODE_CARD_ID = 'WEB-GODMODE-001'
export const WEB_GODMODE_CLOSEOUT_KEY = 'web-godmode-extractor-v1'
export const WEB_GODMODE_PLAN_PATH = 'docs/process/web-godmode-001-plan.md'
export const WEB_GODMODE_APPROVAL_PATH = 'docs/process/approvals/WEB-GODMODE-001.json'
export const WEB_GODMODE_SCRIPT_PATH = 'scripts/process-web-godmode-check.mjs'
export const WEB_GODMODE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-web-godmode-closeout.md'
export const WEB_GODMODE_SPRINT_ID = 'FOUNDATION-GODMODE-EXTRACTION-2026-05-19'
export const WEB_GODMODE_NEXT_CARD_ID = 'LOOM-001'

export const WEB_GODMODE_CHANGED_FILES = [
  'lib/web-godmode-extractor.js',
  'scripts/process-web-godmode-check.mjs',
  'lib/foundation-build-closeout-intelligence-records.js',
  WEB_GODMODE_PLAN_PATH,
  WEB_GODMODE_APPROVAL_PATH,
  WEB_GODMODE_CLOSEOUT_PATH,
  'package.json',
]

export const WEB_GODMODE_PROOF_COMMANDS = [
  'node --check lib/web-godmode-extractor.js scripts/process-web-godmode-check.mjs',
  'npm run process:web-godmode-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=WEB-GODMODE-001 --planApprovalRef=docs/process/approvals/WEB-GODMODE-001.json --closeoutKey=web-godmode-extractor-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=WEB-GODMODE-001 --closeoutKey=web-godmode-extractor-v1',
  'npm run process:foundation-ship -- --card=WEB-GODMODE-001 --planApprovalRef=docs/process/approvals/WEB-GODMODE-001.json --closeoutKey=web-godmode-extractor-v1 --commitRef=HEAD',
]

export const WEB_GODMODE_NOT_NEXT_BOUNDARIES = [
  'No live private/auth/browser session launch in this card.',
  'No broad crawl, blind scraping, paid/provider access, credential mutation, Drive permission mutation, external sends, or public exposure.',
  'No automatic backlog, atom, KB, synthesis, action-route, vector, or query-index writes from extracted content.',
  'No private Loom, Skool, MyICOR, course, community, or paid training content access without source-specific approval.',
  'No bulk screenshot, keyframe, audio/video transcription, or model observation without a separately approved source/run packet.',
]

export const WEB_GODMODE_APPROVED_OPERATIONS = Object.freeze([
  'page_text',
  'dom_outline',
  'link_discovery',
  'media_discovery',
  'transcript_discovery',
  'screenshot_reference',
  'workflow_observation',
])

export const WEB_GODMODE_FORBIDDEN_OPERATIONS = Object.freeze([
  'external_send',
  'external_write',
  'credential_mutation',
  'drive_permission_mutation',
  'public_post',
  'auto_backlog_mutation',
  'auto_atom_write',
  'auto_kb_write',
  'auto_action_route_write',
  'vector_write',
  'browser_login',
  'private_content_read',
  'bulk_crawl',
])

export const WEB_GODMODE_SPRINT_CARD_ORDER = [
  WEB_GODMODE_CARD_ID,
  'LOOM-001',
  'MEETING-VIDEO-001',
  'SKOOL-WORKER-001',
  'MYICRO-TRAINING-001',
  'DRIVE-WORKER-001',
  'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001',
  'SOURCE-019',
  'SOURCE-020',
  'DATA-002',
]

export const WEB_GODMODE_REQUIRED_PRIOR_CARDS = [
  'FOUNDATION-DEEP-AUDITOR-REAL-LOOP-001',
  'FOUNDATION-DEEP-MERGE-AUDIT-001',
  'OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001',
  'FOUNDATION-OPERATOR-PULSE-001',
  'MULTIMODAL-EXTRACTOR-001',
  'COURSE-SOURCE-AUTH-BOUNDARY-001',
  'EXTRACTION-TEAM-001',
  'EXTRACTION-TO-KB-ATOM-PIPELINE-001',
]

const DEFAULT_LIMITS = Object.freeze({
  maxPages: 1,
  maxScreenshots: 2,
  maxRuntimeMs: 60000,
  maxTextChars: 20000,
  maxMediaRefs: 25,
})

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  browserLaunched: false,
  networkFetchStarted: false,
  privateAuthUsed: false,
  paidAuthUsed: false,
  sourceCrawlStarted: false,
  livePrivateContentRead: false,
  screenshotBytesStored: false,
  videoDownloadStarted: false,
  audioDownloadStarted: false,
  transcriptFetchedFromProvider: false,
  modelCallsStarted: false,
  externalWritesStarted: false,
  sendsStarted: false,
  credentialMutationStarted: false,
  drivePermissionMutationStarted: false,
  downstreamWritesStarted: false,
})

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function unique(values = []) {
  return [...new Set(values.map(value => text(value)).filter(Boolean))]
}

function normalizeHost(host = '') {
  return text(host).toLowerCase().replace(/^www\./, '')
}

function parseUrl(value = '') {
  try {
    return new URL(text(value))
  } catch {
    return null
  }
}

function stripHtml(value = '') {
  return text(String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' '))
}

function getAttr(tag = '', attr = '') {
  const pattern = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i')
  return tag.match(pattern)?.[1] || ''
}

function collectTags(html = '', tagName = '') {
  return [...String(html || '').matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map(match => match[0])
}

function collectPairedTags(html = '', tagName = '') {
  return [...String(html || '').matchAll(new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))]
    .map(match => ({
      tag: `<${tagName}${match[1] || ''}>`,
      text: stripHtml(match[2] || ''),
    }))
}

function collectHeadings(html = '') {
  return [...String(html || '').matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(match => ({
      level: Number(match[1].slice(1)),
      text: stripHtml(match[2] || '').slice(0, 240),
    }))
    .filter(row => row.text)
}

function tagCounts(html = '') {
  const counts = {}
  for (const match of String(html || '').matchAll(/<([a-z][a-z0-9-]*)\b/gi)) {
    const key = match[1].toLowerCase()
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

function discoverLinks(html = '', sourceUrl = '') {
  const base = parseUrl(sourceUrl)
  return collectPairedTags(html, 'a').map(row => {
    const rawHref = getAttr(row.tag, 'href')
    let href = rawHref
    if (base && rawHref) {
      try {
        href = new URL(rawHref, base).toString()
      } catch {
        href = rawHref
      }
    }
    const lower = `${href} ${row.text}`.toLowerCase()
    return {
      href,
      text: row.text.slice(0, 240),
      kind: /transcript|caption|subtitle|srt|vtt/.test(lower) ? 'transcript_candidate' : 'link',
    }
  }).filter(row => row.href)
}

function discoverMedia(html = '', sourceUrl = '') {
  const base = parseUrl(sourceUrl)
  const normalize = raw => {
    if (!raw) return ''
    if (!base) return raw
    try {
      return new URL(raw, base).toString()
    } catch {
      return raw
    }
  }
  const media = []
  for (const tag of collectTags(html, 'video')) media.push({ kind: 'video', src: normalize(getAttr(tag, 'src')) || 'inline-video-tag' })
  for (const tag of collectTags(html, 'audio')) media.push({ kind: 'audio', src: normalize(getAttr(tag, 'src')) || 'inline-audio-tag' })
  for (const tag of collectTags(html, 'source')) media.push({ kind: 'source', src: normalize(getAttr(tag, 'src')) })
  for (const tag of collectTags(html, 'iframe')) {
    const src = normalize(getAttr(tag, 'src'))
    const lower = src.toLowerCase()
    media.push({
      kind: /loom|youtube|vimeo|zoom/.test(lower) ? 'embedded_video_frame' : 'iframe',
      src,
    })
  }
  return media.filter(row => row.src)
}

function buildDefaultRequest(overrides = {}) {
  const sourceUrl = overrides.sourceUrl || 'https://training.example.com/module/intro'
  const parsed = parseUrl(sourceUrl)
  return {
    cardId: WEB_GODMODE_CARD_ID,
    sourceId: 'SRC-WEB-GODMODE-FIXTURE-001',
    sourceType: 'web_demo_page',
    sourceUrl,
    accessClass: 'public_permitted',
    rightsClass: 'synthetic_fixture_permitted',
    contentUseBoundary: 'Synthetic fixture only; no live source content is accessed.',
    allowedHosts: parsed ? [normalizeHost(parsed.hostname)] : ['training.example.com'],
    runMode: 'synthetic_no_network',
    operations: [
      'page_text',
      'dom_outline',
      'link_discovery',
      'media_discovery',
      'transcript_discovery',
      'screenshot_reference',
      'workflow_observation',
    ],
    limits: { ...DEFAULT_LIMITS },
    screenshotStoragePolicy: 'synthetic artifact references only; no screenshot bytes stored by this card',
    visualEvidenceUseBoundary: 'visual references are review pointers only and cannot become doctrine without source-backed review',
    browserSessionPreflight: {
      approved: false,
      approvedBy: '',
      actor: 'codex-foundation-builder',
      identity: 'no live browser identity used by synthetic proof',
      expiresAtOrReviewBy: 'not-applicable',
    },
    sideEffects: { ...DEFAULT_SIDE_EFFECTS },
    ...overrides,
    operations: overrides.operations || [
      'page_text',
      'dom_outline',
      'link_discovery',
      'media_discovery',
      'transcript_discovery',
      'screenshot_reference',
      'workflow_observation',
    ],
    limits: { ...DEFAULT_LIMITS, ...(overrides.limits || {}) },
    sideEffects: { ...DEFAULT_SIDE_EFFECTS, ...(overrides.sideEffects || {}) },
  }
}

function addFailure(failures, condition, code, detail = '') {
  if (!condition) failures.push({ code, detail })
}

export function validateWebGodmodeRequest(rawRequest = {}) {
  const request = buildDefaultRequest(rawRequest)
  const failures = []
  const url = parseUrl(request.sourceUrl)
  const sourceHost = normalizeHost(url?.hostname || '')
  const allowedHosts = unique(request.allowedHosts).map(normalizeHost)
  const operations = unique(request.operations)
  const limits = { ...DEFAULT_LIMITS, ...(request.limits || {}) }
  const sideEffects = { ...DEFAULT_SIDE_EFFECTS, ...(request.sideEffects || {}) }
  const forbiddenRequested = operations.filter(operation => WEB_GODMODE_FORBIDDEN_OPERATIONS.includes(operation))
  const unknownRequested = operations.filter(operation =>
    !WEB_GODMODE_APPROVED_OPERATIONS.includes(operation) &&
      !WEB_GODMODE_FORBIDDEN_OPERATIONS.includes(operation)
  )
  const unsafeEffects = Object.entries(sideEffects)
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
  const usesScreenshots = operations.includes('screenshot_reference')
  const privateOrPaid = request.accessClass === 'authorized_paid_private'
  const browserAuthRequested = operations.includes('browser_login') || privateOrPaid
  const preflight = request.browserSessionPreflight || {}

  addFailure(failures, request.cardId === WEB_GODMODE_CARD_ID, 'card_id_mismatch', request.cardId || 'missing')
  addFailure(failures, Boolean(url) && /^https?:$/.test(url?.protocol || ''), 'source_url_required', request.sourceUrl || 'missing')
  addFailure(failures, Boolean(sourceHost), 'source_host_required', request.sourceUrl || 'missing host')
  addFailure(failures, allowedHosts.includes(sourceHost), 'source_host_outside_boundary', `${sourceHost} not in ${allowedHosts.join(', ')}`)
  addFailure(failures, operations.length > 0, 'operations_required', 'missing operations')
  addFailure(failures, forbiddenRequested.length === 0, 'forbidden_operation_requested', forbiddenRequested.join(', '))
  addFailure(failures, unknownRequested.length === 0, 'unknown_operation_requested', unknownRequested.join(', '))
  addFailure(failures, Number(limits.maxPages) >= 1 && Number(limits.maxPages) <= 5, 'max_pages_boundary', String(limits.maxPages))
  addFailure(failures, Number(limits.maxScreenshots) >= 0 && Number(limits.maxScreenshots) <= 10, 'max_screenshots_boundary', String(limits.maxScreenshots))
  addFailure(failures, Number(limits.maxRuntimeMs) >= 1000 && Number(limits.maxRuntimeMs) <= 300000, 'max_runtime_boundary', String(limits.maxRuntimeMs))
  addFailure(failures, !usesScreenshots || Boolean(text(request.screenshotStoragePolicy)), 'screenshot_storage_policy_required', request.screenshotStoragePolicy || 'missing')
  addFailure(failures, !usesScreenshots || Boolean(text(request.visualEvidenceUseBoundary)), 'visual_evidence_use_boundary_required', request.visualEvidenceUseBoundary || 'missing')
  addFailure(failures, !browserAuthRequested || preflight.approved === true, 'browser_session_preflight_required', preflight.approved ? 'approved' : 'missing approval')
  addFailure(failures, !browserAuthRequested || Boolean(text(preflight.approvedBy)), 'browser_session_approver_required', preflight.approvedBy || 'missing approver')
  addFailure(failures, request.accessClass !== 'unknown_blocked', 'unknown_access_blocked', request.accessClass || 'missing')
  addFailure(failures, unsafeEffects.length === 0, 'unsafe_side_effect_started', unsafeEffects.join(', '))
  addFailure(failures, request.runMode === 'synthetic_no_network' || preflight.approved === true, 'live_run_requires_preflight', request.runMode || 'missing')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready',
    request,
    summary: {
      sourceHost,
      operationCount: operations.length,
      maxPages: limits.maxPages,
      maxScreenshots: limits.maxScreenshots,
      maxRuntimeMs: limits.maxRuntimeMs,
      unsafeSideEffectCount: unsafeEffects.length,
      forbiddenOperationCount: forbiddenRequested.length,
    },
    failures,
  }
}

export function buildWebGodmodeFixtureHtml() {
  return `
    <main>
      <h1>Team Training: Listing Intake Workflow</h1>
      <p>Use the listing intake checklist before ordering media or drafting public copy.</p>
      <section>
        <h2>Workflow Steps</h2>
        <ol>
          <li>Confirm seller intent and timeline.</li>
          <li>Check required disclosures.</li>
          <li>Route missing details to the assigned operator.</li>
        </ol>
        <a href="/module/intro/transcript.vtt">Transcript</a>
        <a href="/module/intro/resources">Resources</a>
        <video src="/media/listing-intake-demo.mp4" controls></video>
        <iframe src="https://www.loom.com/embed/example-training-video"></iframe>
      </section>
    </main>
  `
}

export function buildWebGodmodeObservation(input = {}) {
  const request = buildDefaultRequest(input.request || input)
  const validation = validateWebGodmodeRequest(request)
  const html = text(input.html || buildWebGodmodeFixtureHtml())
  if (!validation.ok) {
    return {
      ok: false,
      status: 'blocked',
      cardId: WEB_GODMODE_CARD_ID,
      request: validation.request,
      validation,
      liveBrowserLaunched: false,
      networkFetched: false,
      outputWritesApprovedByThisCard: false,
      failures: validation.failures,
    }
  }

  const pageText = stripHtml(html).slice(0, request.limits.maxTextChars)
  const links = discoverLinks(html, request.sourceUrl)
  const media = discoverMedia(html, request.sourceUrl).slice(0, request.limits.maxMediaRefs)
  const transcriptCandidates = [
    ...links.filter(link => link.kind === 'transcript_candidate').map(link => ({ kind: 'link', href: link.href, text: link.text })),
    ...media.filter(row => /transcript|caption|subtitle|vtt|srt/i.test(row.src)).map(row => ({ kind: row.kind, href: row.src, text: 'media transcript candidate' })),
  ]
  const headings = collectHeadings(html)
  const operations = unique(request.operations)
  const screenshotReferences = operations.includes('screenshot_reference')
    ? [{
        artifactRef: 'artifact://web-godmode/synthetic-fixture/screenshot-001',
        storagePolicy: request.screenshotStoragePolicy,
        bytesStored: false,
        note: 'Synthetic screenshot reference only; V1 does not store screenshot bytes.',
      }]
    : []
  const evidenceLevels = [
    'metadata_only',
    operations.includes('page_text') ? 'transcript_text' : null,
    operations.includes('workflow_observation') ? 'browser_session_observation' : null,
    screenshotReferences.length ? 'screenshot_keyframe_reference' : null,
  ].filter(Boolean)
  const observations = [
    {
      type: 'workflow',
      text: headings[0]?.text || 'Synthetic page has a visible training workflow.',
      sourceAnchor: `${request.sourceUrl}#synthetic-heading-1`,
    },
    {
      type: 'media_discovery',
      text: `${media.length} media reference(s) and ${transcriptCandidates.length} transcript candidate(s) discovered.`,
      sourceAnchor: `${request.sourceUrl}#synthetic-media`,
    },
  ]
  const envelope = {
    sourceId: request.sourceId,
    sourceType: request.sourceType,
    sourceUrl: request.sourceUrl,
    accessClass: request.accessClass,
    rightsClass: request.rightsClass,
    contentUseBoundary: request.contentUseBoundary,
    evidenceLevels,
    route: {
      provider: 'none',
      model: 'synthetic-contract-proof',
      authPath: request.runMode,
      estimatedCostUsd: 0,
    },
    sourceAnchors: [
      { id: 'page', url: request.sourceUrl, kind: 'synthetic_page' },
      ...links.slice(0, 5).map((link, index) => ({ id: `link-${index + 1}`, url: link.href, kind: link.kind })),
    ],
    observations,
    recommendation: 'needs_review',
    confidence: 0.74,
    skipReason: '',
    screenshotStoragePolicy: request.screenshotStoragePolicy,
    visualEvidenceUseBoundary: request.visualEvidenceUseBoundary,
    autoBacklogMutation: false,
    accountPreflight: request.accessClass === 'authorized_paid_private'
      ? {
          approved: request.browserSessionPreflight?.approved === true,
          approvedBy: request.browserSessionPreflight?.approvedBy,
        }
      : undefined,
  }
  const multimodal = validateMultimodalExtractionEnvelope(envelope)
  const failures = multimodal.ok ? [] : multimodal.findings.map(code => ({ code: 'multimodal_envelope_invalid', detail: code }))

  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready',
    cardId: WEB_GODMODE_CARD_ID,
    closeoutKey: WEB_GODMODE_CLOSEOUT_KEY,
    kernelOnly: true,
    liveBrowserLaunched: false,
    networkFetched: false,
    outputWritesApprovedByThisCard: false,
    runLedger: {
      mode: request.runMode,
      estimatedCostUsd: 0,
      maxRuntimeMs: request.limits.maxRuntimeMs,
      maxPages: request.limits.maxPages,
      sourceHost: validation.summary.sourceHost,
    },
    request,
    validation,
    page: {
      text: pageText,
      textChars: pageText.length,
      headings,
      tagCounts: tagCounts(html),
      domOutline: {
        headings,
        linkCount: links.length,
        mediaCount: media.length,
        transcriptCandidateCount: transcriptCandidates.length,
      },
    },
    links,
    media,
    transcriptCandidates,
    screenshotReferences,
    envelope,
    multimodal,
    failures,
    boundaries: {
      broadCrawlAllowed: false,
      privateBrowserAuthAllowedByThisCard: false,
      screenshotBytesStoredByThisCard: false,
      modelObservationApprovedByThisCard: false,
      downstreamMutationApprovedByThisCard: false,
    },
  }
}

export function buildWebGodmodeDogfoodProof() {
  const clean = buildWebGodmodeObservation()
  const cases = [
    {
      name: 'unknown access blocks',
      result: buildWebGodmodeObservation({ request: { accessClass: 'unknown_blocked' } }),
      expectedCode: 'unknown_access_blocked',
    },
    {
      name: 'authorized private source without preflight blocks',
      result: buildWebGodmodeObservation({
        request: {
          accessClass: 'authorized_paid_private',
          sourceType: 'authorized_loom_video',
          sourceUrl: 'https://www.loom.com/share/private-fixture',
          allowedHosts: ['loom.com'],
          rightsClass: 'private_video_training',
          contentUseBoundary: 'Approval required before private video content is accessed.',
        },
      }),
      expectedCode: 'browser_session_preflight_required',
    },
    {
      name: 'cross-host navigation blocks',
      result: buildWebGodmodeObservation({ request: { sourceUrl: 'https://evil.example.net/page', allowedHosts: ['training.example.com'] } }),
      expectedCode: 'source_host_outside_boundary',
    },
    {
      name: 'broad crawl blocks',
      result: buildWebGodmodeObservation({ request: { limits: { maxPages: 25 } } }),
      expectedCode: 'max_pages_boundary',
    },
    {
      name: 'screenshots need storage policy',
      result: buildWebGodmodeObservation({ request: { screenshotStoragePolicy: '' } }),
      expectedCode: 'screenshot_storage_policy_required',
    },
    {
      name: 'external writes block',
      result: buildWebGodmodeObservation({ request: { operations: ['page_text', 'external_write'] } }),
      expectedCode: 'forbidden_operation_requested',
    },
    {
      name: 'unsafe live browser side effect blocks',
      result: buildWebGodmodeObservation({ request: { sideEffects: { browserLaunched: true } } }),
      expectedCode: 'unsafe_side_effect_started',
    },
    {
      name: 'live run requires approved preflight',
      result: buildWebGodmodeObservation({ request: { runMode: 'live_browser_session' } }),
      expectedCode: 'live_run_requires_preflight',
    },
  ]
  const rejectedCases = cases.map(testCase => ({
    name: testCase.name,
    ok: testCase.result.ok === false &&
      testCase.result.failures.some(failure => failure.code === testCase.expectedCode),
    expectedCode: testCase.expectedCode,
    actualCodes: testCase.result.failures.map(failure => failure.code),
  }))

  return {
    ok: clean.ok === true &&
      clean.liveBrowserLaunched === false &&
      clean.networkFetched === false &&
      clean.outputWritesApprovedByThisCard === false &&
      clean.media.length >= 2 &&
      clean.transcriptCandidates.length >= 1 &&
      rejectedCases.every(row => row.ok),
    cleanSummary: {
      status: clean.status,
      textChars: clean.page.textChars,
      mediaCount: clean.media.length,
      transcriptCandidateCount: clean.transcriptCandidates.length,
      screenshotReferenceCount: clean.screenshotReferences.length,
      costUsd: clean.runLedger.estimatedCostUsd,
    },
    rejectedCases,
  }
}

