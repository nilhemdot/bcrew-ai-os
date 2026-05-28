import crypto from 'node:crypto'

export const PUBLIC_REPO_DEEP_REVIEW_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const PUBLIC_REPO_DEEP_REVIEW_SCRIPT_PATH = 'scripts/process-public-repo-deep-review-runner-check.mjs'
export const PUBLIC_REPO_DEEP_REVIEW_CLI_PATH = 'scripts/run-public-repo-deep-review.mjs'

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  cloneStarted: false,
  installStarted: false,
  codeImported: false,
  rawFileFetched: false,
  archiveDownloaded: false,
  packageDownloaded: false,
  externalWriteStarted: false,
  backlogWritten: false,
  providerCallStarted: false,
  authUsed: false,
  normalChromeProfileUsed: false,
})

const REVIEW_PATH_RE = /\b(readme|docs?|documentation|architecture|guide|quickstart|getting-started|examples?|samples?|templates?|recipes?|license|claude\.md|agents\.md|skills?|mcp|api|server|client|workflow|runtime|memory|eval|test)\b/i
const UNSAFE_PATH_RE = /\/(?:archive|releases\/download|download|raw|blame|commits|commit|actions|security|settings|issues\/new|pull\/new|compare|login|signin|signup)(?:\/|$)|[?&]raw=1/i
const FILE_DOWNLOAD_RE = /\.(?:zip|tar|tgz|tar\.gz|rar|7z|dmg|exe|pkg|deb|rpm|whl|jar|wasm|bin|pdf)(?:[?#]|$)/i
const INSTALL_OR_CLONE_RE = /\b(git clone|npm install|pnpm add|yarn add|pip install|uv add|brew install|curl\s+[^.\n]+(?:sh|bash)|npx\s+|bun add)\b/i

const IMPLEMENTATION_PATTERN_DEFINITIONS = [
  {
    patternId: 'agentic_browser_runtime',
    title: 'Agentic browser and Hands runtime',
    regex: /\b(browser|playwright|stagehand|computer use|click|navigate|session|viewport|screenshot|dom|hands)\b/i,
    aiosUse: 'Use as evidence for source-browser runtime, Eyes/Hands proof, and safe navigation SOPs.',
  },
  {
    patternId: 'source_session_identity',
    title: 'Source session and identity boundary',
    regex: /\b(auth|oauth|session|credential|keychain|mfa|login|identity|profile|broker)\b/i,
    aiosUse: 'Use as evidence for Source Session Broker, auth-needed escalation, and per-source session policy.',
  },
  {
    patternId: 'evidence_and_provenance',
    title: 'Evidence, provenance, and citation spine',
    regex: /\b(evidence|provenance|citation|trace|artifact|source ref|source-ref|audit|readback)\b/i,
    aiosUse: 'Use as evidence for Foundation readback, proof artifacts, and no-false-green verifier design.',
  },
  {
    patternId: 'workflow_or_queue_runtime',
    title: 'Workflow, queue, or scheduler runtime',
    regex: /\b(queue|scheduler|worker|job|batch|pipeline|orchestrator|retry|resume|checkpoint)\b/i,
    aiosUse: 'Use as evidence for autonomous extraction queues, resume/retry, and morning autopilot operations.',
  },
  {
    patternId: 'skills_plugins_or_mcp',
    title: 'Skills, plugins, or MCP interface',
    regex: /\b(skill|plugin|mcp|tool server|tooling|adapter|connector|api)\b/i,
    aiosUse: 'Use as evidence for capability registry, plugin/skill packaging, and source connector surfaces.',
  },
  {
    patternId: 'memory_context_or_knowledge',
    title: 'Memory, context, or knowledge system',
    regex: /\b(memory|context|knowledge|kb|embedding|retrieval|rag|long[- ]term|conversation|handoff)\b/i,
    aiosUse: 'Use as evidence for AIOS memory, context continuity, and source-backed knowledge base design.',
  },
  {
    patternId: 'evaluation_and_guardrails',
    title: 'Evaluation, test, and guardrail loop',
    regex: /\b(eval|test|assert|guardrail|policy|safety|fail[- ]closed|verifier|check)\b/i,
    aiosUse: 'Use as evidence for dogfood proof, audit lanes, and no unsafe action gates.',
  },
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function parsedUrl(value = '') {
  try {
    return new URL(text(value))
  } catch {
    return null
  }
}

function hostOf(value = '') {
  return parsedUrl(value)?.hostname.replace(/^www\./, '').toLowerCase() || ''
}

function stripGitSuffix(value = '') {
  return text(value).replace(/\.git$/i, '')
}

function stripHtml(value = '') {
  return text(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitle(html = '') {
  const title = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    String(html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
    ''
  return stripHtml(title).slice(0, 160)
}

function extractLinks(html = '', baseUrl = '') {
  const links = []
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match = null
  while ((match = re.exec(String(html || '')))) {
    const href = text(match[1])
    if (!href) continue
    let url = ''
    try {
      url = new URL(href, baseUrl).toString()
    } catch {
      continue
    }
    links.push({
      url,
      label: stripHtml(match[2]).slice(0, 160),
    })
  }
  return links
}

function repoIdentityFromUrl(repoUrl = '', { allowLocalFixture = false } = {}) {
  const parsed = parsedUrl(repoUrl)
  if (!parsed) {
    return { ok: false, reason: 'invalid_repo_url' }
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
  const parts = parsed.pathname.split('/').map(text).filter(Boolean)
  const localFixture = allowLocalFixture && ['127.0.0.1', 'localhost'].includes(host)
  const githubLike = host === 'github.com' || host === 'gitlab.com'
  const gist = host === 'gist.github.com'
  if (!githubLike && !gist && !localFixture) {
    return { ok: false, reason: 'unsupported_public_repo_host', host }
  }
  const requiredParts = gist ? 2 : 2
  if (parts.length < requiredParts) {
    return { ok: false, reason: 'missing_repo_owner_or_name', host }
  }
  const owner = parts[0]
  const repo = stripGitSuffix(parts[1])
  const basePath = `/${owner}/${repo}`
  return {
    ok: true,
    host,
    owner,
    repo,
    basePath,
    rootUrl: `${parsed.protocol}//${parsed.host}${basePath}`,
    repoKey: `${host}/${owner}/${repo}`.toLowerCase(),
    localFixture,
  }
}

function pathInsideRepo(url = '', repoIdentity = {}) {
  const parsed = parsedUrl(url)
  if (!parsed) return false
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
  return host === repoIdentity.host && parsed.pathname.toLowerCase().startsWith(text(repoIdentity.basePath).toLowerCase())
}

function unsafeRepoPath(url = '') {
  const parsed = parsedUrl(url)
  const source = `${parsed?.pathname || ''}${parsed?.search || ''}`
  return UNSAFE_PATH_RE.test(source) || FILE_DOWNLOAD_RE.test(source)
}

function classifyRepoLink({ url = '', label = '', repoIdentity = {} } = {}) {
  const parsed = parsedUrl(url)
  if (!parsed) {
    return {
      url,
      label,
      decision: 'blocked_invalid_url',
      shouldFollow: false,
      reason: 'URL could not be parsed.',
    }
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
  const surface = `${url} ${label}`
  if (/^(mailto|tel|javascript):/i.test(url)) {
    return { url, label, decision: 'blocked_non_http_link', shouldFollow: false, reason: 'Non-HTTP link.' }
  }
  if (/raw\.githubusercontent\.com|objects\.githubusercontent\.com|codeload\.github\.com/i.test(host)) {
    return { url, label, decision: 'blocked_raw_or_archive_download', shouldFollow: false, reason: 'Raw/blob/archive download path stays blocked in repo deep review.' }
  }
  if (unsafeRepoPath(url)) {
    return { url, label, decision: 'blocked_auth_download_archive_or_write_path', shouldFollow: false, reason: 'Auth, archive, download, write, or raw path is outside read-only review.' }
  }
  if (!pathInsideRepo(url, repoIdentity)) {
    const chromeHosts = ['github.com', 'gitlab.com', 'gist.github.com']
    return {
      url,
      label,
      decision: chromeHosts.includes(host) ? 'blocked_repo_host_chrome_or_other_repo' : 'blocked_external_link',
      shouldFollow: false,
      reason: 'Only repo-local README/docs/examples/license pages are followed.',
    }
  }
  if (REVIEW_PATH_RE.test(surface) || parsed.pathname.replace(/\/$/, '') === repoIdentity.basePath) {
    return { url, label, decision: 'repo_review_page_candidate', shouldFollow: true, reason: 'Repo-local review page.' }
  }
  return { url, label, decision: 'repo_local_low_signal_skipped', shouldFollow: false, reason: 'Repo-local page is not part of README/docs/examples/license V1 review.' }
}

function pageKindFor(url = '', title = '') {
  const source = `${url} ${title}`.toLowerCase()
  if (/license|mit|apache|gpl|bsd/.test(source)) return 'license_or_provenance'
  if (/examples?|samples?|templates?|recipes?/.test(source)) return 'examples_or_samples'
  if (/docs?|architecture|guide|quickstart|getting-started/.test(source)) return 'docs_or_architecture'
  if (/readme|claude\.md|agents\.md/.test(source)) return 'readme_or_agent_instructions'
  return 'repo_overview'
}

function snippetAround(source = '', regex) {
  const textSource = text(source)
  const match = textSource.match(regex)
  if (!match || match.index == null) return ''
  const start = Math.max(0, match.index - 90)
  const end = Math.min(textSource.length, match.index + text(match[0]).length + 140)
  return textSource.slice(start, end).replace(/\s+/g, ' ').trim()
}

function implementationPatternsForPage(page = {}) {
  return IMPLEMENTATION_PATTERN_DEFINITIONS
    .map(definition => {
      const snippet = snippetAround(page.text, definition.regex)
      if (!snippet) return null
      return {
        patternId: definition.patternId,
        title: definition.title,
        sourceUrl: page.url,
        sourceTitle: page.title,
        pageKind: page.pageKind,
        evidenceSnippet: snippet,
        aiosUse: definition.aiosUse,
      }
    })
    .filter(Boolean)
}

function uniquePatterns(patterns = []) {
  const byKey = new Map()
  for (const pattern of list(patterns)) {
    const key = `${pattern.patternId}:${pattern.sourceUrl}`
    if (!byKey.has(key)) byKey.set(key, pattern)
  }
  return [...byKey.values()]
}

function buildSourceCoverage(pages = [], patterns = []) {
  const pageKinds = new Set(list(pages).map(page => page.pageKind))
  const patternIds = new Set(list(patterns).map(pattern => pattern.patternId))
  return {
    readmeSeen: pageKinds.has('readme_or_agent_instructions') || pageKinds.has('repo_overview'),
    docsSeen: pageKinds.has('docs_or_architecture'),
    examplesSeen: pageKinds.has('examples_or_samples'),
    licenseSeen: pageKinds.has('license_or_provenance'),
    implementationPatternCount: patternIds.size,
    pageKinds: [...pageKinds],
    patternIds: [...patternIds],
  }
}

function unsafeSideEffectList(sideEffects = {}) {
  return Object.entries({ ...DEFAULT_SIDE_EFFECTS, ...sideEffects })
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
}

export async function runPublicRepoDeepReview({
  url = '',
  allowLocalFixture = false,
  maxPages = 8,
  maxDepth = 2,
  maxBytesPerPage = 180000,
  fetchImpl = globalThis.fetch,
  now = new Date().toISOString(),
} = {}) {
  const sideEffects = { ...DEFAULT_SIDE_EFFECTS }
  const repoIdentity = repoIdentityFromUrl(url, { allowLocalFixture })
  if (!repoIdentity.ok) {
    return {
      ok: false,
      status: 'blocked',
      reason: repoIdentity.reason,
      url,
      repoIdentity,
      pages: [],
      implementationPatterns: [],
      blockedLinks: [],
      sideEffects,
    }
  }
  if (unsafeRepoPath(url)) {
    return {
      ok: false,
      status: 'blocked',
      reason: 'unsafe_starting_repo_path',
      url,
      repoIdentity,
      pages: [],
      implementationPatterns: [],
      blockedLinks: [classifyRepoLink({ url, repoIdentity })],
      sideEffects,
    }
  }
  if (typeof fetchImpl !== 'function') throw new Error('runPublicRepoDeepReview requires fetchImpl or global fetch.')

  const queue = [{ url: text(url) || repoIdentity.rootUrl, depth: 0, reason: 'operator_requested_url' }]
  if (queue[0].url !== repoIdentity.rootUrl) queue.push({ url: repoIdentity.rootUrl, depth: 0, reason: 'repo_root' })
  const seen = new Set()
  const pages = []
  const blockedLinks = []
  const followedLinks = []
  const fetchFailures = []

  while (queue.length && pages.length < number(maxPages, 8)) {
    const item = queue.shift()
    const currentUrl = text(item.url)
    const key = currentUrl.replace(/#.*$/, '')
    if (!currentUrl || seen.has(key)) continue
    seen.add(key)
    const classification = classifyRepoLink({ url: currentUrl, repoIdentity })
    if (!classification.shouldFollow) {
      blockedLinks.push(classification)
      continue
    }

    let response = null
    try {
      response = await fetchImpl(currentUrl, {
        redirect: 'follow',
        headers: {
          accept: 'text/html,text/plain;q=0.9,*/*;q=0.1',
          'user-agent': 'bcrew-ai-os-public-repo-deep-review/1.0',
        },
      })
    } catch (error) {
      fetchFailures.push({ url: currentUrl, reason: error instanceof Error ? error.message : String(error) })
      continue
    }
    const contentType = text(response.headers?.get?.('content-type')).toLowerCase()
    if (!response.ok || (contentType && !/text\/html|text\/plain|application\/xhtml/.test(contentType))) {
      fetchFailures.push({ url: currentUrl, status: response.status, contentType })
      continue
    }
    const raw = await response.text()
    const html = raw.slice(0, number(maxBytesPerPage, 180000))
    const title = extractTitle(html) || currentUrl
    const pageText = stripHtml(html)
    const page = {
      url: currentUrl,
      title,
      pageKind: pageKindFor(currentUrl, title),
      text: pageText.slice(0, 12000),
      installOrCloneWarning: INSTALL_OR_CLONE_RE.test(pageText),
      linkClassifications: extractLinks(html, currentUrl).map(link => classifyRepoLink({ ...link, repoIdentity })),
    }
    pages.push(page)
    followedLinks.push({ url: currentUrl, reason: item.reason || classification.reason, depth: item.depth })

    for (const link of page.linkClassifications) {
      if (!link.shouldFollow) {
        blockedLinks.push(link)
        continue
      }
      if (item.depth >= number(maxDepth, 2)) continue
      const nextKey = link.url.replace(/#.*$/, '')
      if (seen.has(nextKey) || queue.some(entry => entry.url.replace(/#.*$/, '') === nextKey)) continue
      queue.push({ url: link.url, depth: item.depth + 1, reason: link.reason })
    }
  }

  const implementationPatterns = uniquePatterns(pages.flatMap(implementationPatternsForPage))
  const sourceCoverage = buildSourceCoverage(pages, implementationPatterns)
  const report = {
    ok: pages.length > 0,
    status: pages.length > 0 ? 'public_repo_deep_review_completed' : 'blocked',
    cardId: PUBLIC_REPO_DEEP_REVIEW_CARD_ID,
    runId: `public-repo-deep-review:${stableHash(`${repoIdentity.repoKey}:${now}`).slice(0, 12)}`,
    capturedAt: now,
    url,
    repoIdentity,
    pagesRead: pages.length,
    followedLinks,
    pages: pages.map(page => ({
      url: page.url,
      title: page.title,
      pageKind: page.pageKind,
      installOrCloneWarning: page.installOrCloneWarning,
      textPreview: page.text.slice(0, 700),
      linkClassifications: page.linkClassifications,
    })),
    implementationPatterns,
    sourceCoverage,
    blockedLinks: list(blockedLinks)
      .filter(link => link.decision !== 'repo_local_low_signal_skipped')
      .slice(0, 80),
    installOrCloneWarnings: pages
      .filter(page => page.installOrCloneWarning)
      .map(page => ({ url: page.url, title: page.title, warning: 'Install/clone text observed as source evidence only; not executed.' })),
    fetchFailures,
    sideEffects,
    plainEnglish: pages.length
      ? 'Read-only public repo deep review completed. It inspected repo-local overview/docs/examples/license pages and extracted implementation patterns with citations. It did not clone, install, download, import code, write backlog, call providers, or use auth.'
      : 'Public repo deep review did not find readable repo-local pages.',
  }

  return report
}

export function buildPublicRepoDeepReviewPacket(report = {}) {
  return {
    packetId: report.runId || `public-repo-deep-review:${stableHash(report.url || 'repo').slice(0, 12)}`,
    cardId: PUBLIC_REPO_DEEP_REVIEW_CARD_ID,
    repoKey: report.repoIdentity?.repoKey || '',
    rootUrl: report.repoIdentity?.rootUrl || report.url || '',
    status: report.status || 'unknown',
    pagesRead: number(report.pagesRead, 0),
    sourceCoverage: report.sourceCoverage || {},
    implementationPatternCount: list(report.implementationPatterns).length,
    implementationPatterns: list(report.implementationPatterns).slice(0, 20).map(pattern => ({
      patternId: pattern.patternId,
      title: pattern.title,
      sourceUrl: pattern.sourceUrl,
      evidenceSnippet: pattern.evidenceSnippet,
      aiosUse: pattern.aiosUse,
    })),
    blockedLinkCount: list(report.blockedLinks).length,
    installOrCloneWarnings: list(report.installOrCloneWarnings),
    sideEffects: { ...DEFAULT_SIDE_EFFECTS, ...(report.sideEffects || {}) },
    nextAction: 'Review the extracted patterns and citations. If useful, Steve/Codex can decide whether a separate Scoper card is warranted; this packet does not create one automatically.',
  }
}

export function evaluatePublicRepoDeepReviewReport(report = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const sideEffectViolations = unsafeSideEffectList(report.sideEffects || {})
  add(report.status === 'public_repo_deep_review_completed' && report.ok === true, 'repo_review_completed', report.status || 'missing')
  add(number(report.pagesRead, 0) >= 3, 'readme_docs_examples_license_pages_read', `${number(report.pagesRead, 0)} pages`)
  add(list(report.implementationPatterns).length >= 3, 'implementation_patterns_extracted', `${list(report.implementationPatterns).length} patterns`)
  add(report.sourceCoverage?.docsSeen === true, 'docs_or_architecture_seen', JSON.stringify(report.sourceCoverage || {}))
  add(report.sourceCoverage?.examplesSeen === true, 'examples_or_samples_seen', JSON.stringify(report.sourceCoverage || {}))
  add(report.sourceCoverage?.licenseSeen === true, 'license_or_provenance_seen', JSON.stringify(report.sourceCoverage || {}))
  add(sideEffectViolations.length === 0, 'no_clone_install_download_import_backlog_provider_or_auth_side_effects', sideEffectViolations.join(', ') || 'none')
  add(list(report.blockedLinks).some(link => /download|archive|raw/i.test(link.decision)), 'download_archive_raw_links_blocked', list(report.blockedLinks).map(link => link.decision).join(', '))
  add(list(report.blockedLinks).some(link => /auth|write|chrome|external/i.test(link.decision)), 'auth_write_external_or_chrome_links_blocked', list(report.blockedLinks).map(link => link.decision).join(', '))
  add(list(report.installOrCloneWarnings).length >= 1, 'install_or_clone_text_recorded_as_warning_only', `${list(report.installOrCloneWarnings).length} warning(s)`)
  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
