import crypto from 'node:crypto'

export const YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID = 'YOUTUBE-RESOURCE-LINK-RESOLVER-001'
export const YOUTUBE_RESOURCE_LINK_RESOLVER_PLAN_PATH = 'docs/process/youtube-resource-link-resolver-001-plan.md'
export const YOUTUBE_RESOURCE_LINK_RESOLVER_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-RESOURCE-LINK-RESOLVER-001.json'
export const YOUTUBE_RESOURCE_LINK_RESOLVER_SCRIPT_PATH = 'scripts/process-youtube-resource-link-resolver-check.mjs'

const SAFE_PUBLIC_HOSTS = new Set([
  'github.com',
  'gist.github.com',
  'raw.githubusercontent.com',
  'docs.github.com',
  'npmjs.com',
  'pypi.org',
  'playwright.dev',
  'ai.google.dev',
  'developers.google.com',
  'docs.browserbase.com',
  'browserbase.com',
  'docs.cursor.com',
  'cursor.com',
  'vercel.app',
])

const SHORT_LINK_HOSTS = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
  'lnkd.in',
  'goo.gl',
  'buff.ly',
  'shorturl.at',
  'rebrand.ly',
  'cutt.ly',
  'linktr.ee',
  'beacons.ai',
])

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function normalizeWhitespace(value = '') {
  return text(value).replace(/\s+/g, ' ')
}

export function normalizeYoutubeResourceUrl(rawUrl = '') {
  const value = text(rawUrl)
  if (!value) return ''
  try {
    const parsed = new URL(value)
    if (/youtube\.com$/i.test(parsed.hostname) && parsed.pathname === '/redirect') {
      const redirected = text(parsed.searchParams.get('q'))
      if (redirected) return normalizeYoutubeResourceUrl(redirected)
    }
    for (const key of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'feature',
    ]) {
      parsed.searchParams.delete(key)
    }
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return value
  }
}

function hostOf(rawUrl = '') {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function hasSafeHost(host = '') {
  return Array.from(SAFE_PUBLIC_HOSTS).some(allowed => host === allowed || host.endsWith(`.${allowed}`))
}

function isDownloadPath(value = '') {
  return /\.(zip|dmg|pkg|exe|msi|tar|gz|rar|7z)(\?|$)/i.test(value) ||
    /\/(download|downloads|releases\/download|archive)\b/i.test(value)
}

export function classifyYoutubeResourceLink(rawLink = {}) {
  const url = normalizeYoutubeResourceUrl(rawLink.normalizedUrl || rawLink.url || rawLink.href || rawLink.sourceUrl || '')
  const host = hostOf(url)
  const lower = `${host} ${url}`.toLowerCase()

  if (!url || !host) {
    return {
      disposition: 'blocked_invalid_url',
      status: 'blocked',
      canResolve: false,
      approvalRequired: true,
      blocker: 'The link is missing or invalid.',
      allowedNextDecision: 'Fix the source URL or ignore it.',
    }
  }

  if (/youtube\.com$|youtu\.be$/.test(host)) {
    return {
      disposition: 'observed_youtube_reference',
      status: 'observed_only',
      canResolve: false,
      approvalRequired: false,
      blocker: '',
      allowedNextDecision: 'Use as source reference only.',
    }
  }

  if (SHORT_LINK_HOSTS.has(host)) {
    return {
      disposition: 'blocked_short_link',
      status: 'blocked',
      canResolve: false,
      approvalRequired: true,
      blocker: 'Short-link or link-hub URL hides the final destination.',
      allowedNextDecision: 'Approve exact expansion in a source packet or leave blocked.',
    }
  }

  if (/skool|circle|discord|community|member|classroom|course|myicor/.test(lower)) {
    return {
      disposition: 'blocked_private_or_course_source',
      status: 'blocked',
      canResolve: false,
      approvalRequired: true,
      blocker: 'Community, course, member, paid, or login source needs explicit source-packet approval.',
      allowedNextDecision: 'Approve exact source packet or reject.',
    }
  }

  if (/gumroad|lemonsqueezy|stripe|checkout|buy|purchase|cart|payment|paypal/.test(lower)) {
    return {
      disposition: 'blocked_purchase_or_checkout',
      status: 'blocked',
      canResolve: false,
      approvalRequired: true,
      blocker: 'Purchase, checkout, or paid-resource link cannot be followed automatically.',
      allowedNextDecision: 'Approve purchase/resource review or reject.',
    }
  }

  if (/calendly|calendar|booking|book-a-call|schedule|form|subscribe|waitlist|optin|opt-in|leadmagnet/.test(lower)) {
    return {
      disposition: 'blocked_form_or_booking',
      status: 'blocked',
      canResolve: false,
      approvalRequired: true,
      blocker: 'Form, opt-in, booking, or calendar path can submit data or create an external action.',
      allowedNextDecision: 'Approve exact follow-up or reject.',
    }
  }

  if (/drive\.google|docs\.google|dropbox|notion|figma/.test(lower)) {
    return {
      disposition: 'blocked_doc_or_file_source',
      status: 'blocked',
      canResolve: false,
      approvalRequired: true,
      blocker: 'Shared docs/files may require auth, contain private content, or trigger download behavior.',
      allowedNextDecision: 'Approve exact public document/file source or reject.',
    }
  }

  if (isDownloadPath(url)) {
    return {
      disposition: 'blocked_download',
      status: 'blocked',
      canResolve: false,
      approvalRequired: true,
      blocker: 'Download/archive/binary links are not safe public metadata reads.',
      allowedNextDecision: 'Approve exact download review or reject.',
    }
  }

  if (hasSafeHost(host)) {
    return {
      disposition: 'resolve_public_metadata',
      status: 'resolvable_public',
      canResolve: true,
      approvalRequired: false,
      blocker: '',
      allowedNextDecision: 'Resolve read-only public metadata and attach it to Scoper evidence.',
    }
  }

  return {
    disposition: 'blocked_external_site',
    status: 'blocked',
    canResolve: false,
    approvalRequired: true,
    blocker: 'External site is not on the safe public resource allowlist.',
    allowedNextDecision: 'Approve exact source follow-up or reject.',
  }
}

function normalizeInputLink(rawLink = {}, index = 0) {
  const url = normalizeYoutubeResourceUrl(rawLink.normalizedUrl || rawLink.url || rawLink.href || rawLink.sourceUrl || '')
  const classification = classifyYoutubeResourceLink({ ...rawLink, url })
  return {
    linkId: rawLink.linkId || `yt-resource:${stableHash([url, rawLink.sourceReportArtifactId, index]).slice(0, 16)}`,
    rank: index + 1,
    url,
    host: rawLink.host || hostOf(url),
    label: normalizeWhitespace(rawLink.label || rawLink.text || rawLink.sourceText || '').slice(0, 160),
    sourceVideoId: rawLink.sourceVideoId || rawLink.videoId || '',
    sourceUrl: rawLink.sourceUrl || '',
    sourceReportArtifactId: rawLink.sourceReportArtifactId || rawLink.reportArtifactId || '',
    sourceAtomId: rawLink.sourceAtomId || rawLink.atomId || '',
    evidence: rawLink.evidence || rawLink.reason || 'Observed in approved public YouTube extraction.',
    ...classification,
  }
}

export function dedupeYoutubeResourceLinks(rawLinks = []) {
  const byUrl = new Map()
  for (const [index, rawLink] of list(rawLinks).entries()) {
    const link = normalizeInputLink(rawLink, index)
    if (!link.url) continue
    const existing = byUrl.get(link.url)
    if (!existing) {
      byUrl.set(link.url, {
        ...link,
        duplicateCount: 1,
        evidenceRefs: [link.sourceReportArtifactId, link.sourceAtomId].filter(Boolean),
      })
      continue
    }
    existing.duplicateCount += 1
    existing.evidenceRefs = Array.from(new Set([
      ...existing.evidenceRefs,
      link.sourceReportArtifactId,
      link.sourceAtomId,
    ].filter(Boolean)))
    existing.approvalRequired = existing.approvalRequired || link.approvalRequired
    existing.canResolve = existing.canResolve && link.canResolve
  }
  return Array.from(byUrl.values()).map((link, index) => ({ ...link, rank: index + 1 }))
}

function headersObject(headers = {}) {
  if (!headers) return {}
  if (typeof headers.get === 'function') {
    return {
      contentType: headers.get('content-type') || '',
      contentLength: headers.get('content-length') || '',
    }
  }
  return {
    contentType: headers['content-type'] || headers.contentType || '',
    contentLength: headers['content-length'] || headers.contentLength || '',
  }
}

function extractTitle(body = '') {
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''
  return normalizeWhitespace(title.replace(/&amp;/g, '&')).slice(0, 180)
}

function extractDescription(body = '') {
  const description = body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ||
    ''
  return normalizeWhitespace(description.replace(/&amp;/g, '&')).slice(0, 260)
}

async function defaultFetcher(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'BCrew-AI-OS-YouTube-Resource-Link-Resolver/1.0 read-only-metadata',
        accept: 'text/html,text/plain,application/json;q=0.8,*/*;q=0.4',
      },
    })
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url || url,
      headers: response.headers,
      body: await response.text(),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function resolvePublicResourceLink(link = {}, {
  fetcher = defaultFetcher,
  maxBodyChars = 4000,
  timeoutMs = 15000,
} = {}) {
  if (!link.canResolve) {
    return {
      ...link,
      resolved: false,
      resolutionStatus: 'not_allowed',
      externalWrite: false,
      downloadedFile: false,
      submittedForm: false,
      reason: link.blocker || 'Link is not approved for automatic public metadata resolution.',
    }
  }

  try {
    const response = await fetcher(link.url, { timeoutMs })
    const headers = headersObject(response.headers)
    const body = String(response.body || '').slice(0, maxBodyChars)
    return {
      ...link,
      resolved: Boolean(response.ok),
      resolutionStatus: response.ok ? 'resolved_public_metadata' : 'fetch_failed',
      httpStatus: response.status || 0,
      finalUrl: normalizeYoutubeResourceUrl(response.finalUrl || link.url),
      contentType: headers.contentType,
      contentLength: headers.contentLength,
      title: extractTitle(body),
      description: extractDescription(body),
      excerpt: normalizeWhitespace(body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).slice(0, 700),
      externalWrite: false,
      downloadedFile: false,
      submittedForm: false,
    }
  } catch (error) {
    return {
      ...link,
      resolved: false,
      resolutionStatus: 'fetch_error',
      error: error instanceof Error ? error.message : String(error),
      externalWrite: false,
      downloadedFile: false,
      submittedForm: false,
    }
  }
}

export function extractYoutubeResourceLinksFromReportBundle(bundle = {}) {
  const report = bundle.report || {}
  const structured = report.structuredOutputJson || report.structured_output_json || {}
  const snapshot = structured.snapshot || {}
  const reportArtifactId = report.reportArtifactId || report.report_artifact_id || ''
  const links = []

  for (const link of [
    ...list(structured.linkQueue),
    ...list(structured.approvalRequiredLinks),
    ...list(structured.safeReferences),
    ...list(snapshot.links),
    ...list(snapshot.approvalRequiredLinks),
    ...list(snapshot.safeReferences),
  ]) {
    links.push({
      ...link,
      sourceReportArtifactId: link.sourceReportArtifactId || reportArtifactId,
    })
  }

  for (const item of [
    ...list(report.actionRequiredItems || report.action_required_items),
    ...list(snapshot.actionRequiredItems),
  ]) {
    if (item?.url || item?.sourceUrl) {
      links.push({
        ...item,
        url: item.url || item.sourceUrl,
        sourceReportArtifactId: item.sourceReportArtifactId || reportArtifactId,
      })
    }
  }

  for (const result of list(snapshot.videoResults)) {
    for (const resolved of list(result.safeResourceFollowResults)) {
      links.push({
        ...resolved,
        url: resolved.url,
        sourceVideoId: result.video?.videoId,
        sourceUrl: result.video?.url,
        sourceReportArtifactId: reportArtifactId,
      })
    }
  }

  return dedupeYoutubeResourceLinks(links)
}

export async function buildYoutubeResourceLinkResolverSnapshot({
  rawLinks = [],
  sourceLabel = 'YouTube extraction',
  resolve = true,
  maxResolve = 12,
  fetcher,
  generatedAt = new Date().toISOString(),
} = {}) {
  const links = dedupeYoutubeResourceLinks(rawLinks)
  const resolvable = links.filter(link => link.canResolve)
  const blockedLinks = links.filter(link => link.approvalRequired || link.status === 'blocked')
  const observedOnlyLinks = links.filter(link => link.status === 'observed_only')
  const toResolve = resolve ? resolvable.slice(0, Math.max(0, Number(maxResolve) || 0)) : []
  const resolvedLinks = []
  for (const link of toResolve) {
    resolvedLinks.push(await resolvePublicResourceLink(link, { fetcher }))
  }
  const unresolvedPublicLinks = resolvable.slice(toResolve.length)
  const checks = [
    { ok: links.length > 0, check: 'resource links are present', detail: `${links.length}` },
    {
      ok: blockedLinks.every(link => text(link.blocker) && text(link.allowedNextDecision)),
      check: 'blocked links have exact reasons and next decisions',
      detail: `${blockedLinks.length}`,
    },
    {
      ok: resolvedLinks.every(link => link.externalWrite === false && link.downloadedFile === false && link.submittedForm === false),
      check: 'resolved public links are read-only metadata only',
      detail: `${resolvedLinks.length}`,
    },
    {
      ok: unresolvedPublicLinks.every(link => link.canResolve === true),
      check: 'remaining public links are explicitly still resolver work, not Steve homework',
      detail: `${unresolvedPublicLinks.length}`,
    },
  ]
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_scoper',
    cardId: YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID,
    generatedAt,
    sourceLabel,
    counts: {
      totalLinks: links.length,
      resolvedPublic: resolvedLinks.filter(link => link.resolved).length,
      attemptedPublic: resolvedLinks.length,
      remainingPublic: unresolvedPublicLinks.length,
      blocked: blockedLinks.length,
      observedOnly: observedOnlyLinks.length,
      duplicates: links.filter(link => Number(link.duplicateCount || 0) > 1).length,
    },
    links,
    resolvedLinks,
    blockedLinks,
    observedOnlyLinks,
    unresolvedPublicLinks,
    scoperPacket: buildScoperResourceLinkPacket({
      sourceLabel,
      resolvedLinks,
      blockedLinks,
      unresolvedPublicLinks,
    }),
    checks,
    failures,
    externalWrites: false,
    proposalOnly: true,
  }
}

export function buildScoperResourceLinkPacket({
  sourceLabel = 'YouTube extraction',
  resolvedLinks = [],
  blockedLinks = [],
  unresolvedPublicLinks = [],
} = {}) {
  return {
    sourceLabel,
    resourceLinkDispositions: [
      ...list(resolvedLinks).map(link => `Resolved public metadata: ${link.host} - ${link.title || link.url}`),
      ...list(unresolvedPublicLinks).map(link => `Public metadata still queued for resolver: ${link.host} - ${link.url}`),
      ...list(blockedLinks).map(link => `Blocked: ${link.host || link.url} - ${link.blocker} Next decision: ${link.allowedNextDecision}`),
    ],
    resolvedResourceRefs: list(resolvedLinks).map(link => link.finalUrl || link.url).filter(Boolean),
    blockedResourceRefs: list(blockedLinks).map(link => link.url).filter(Boolean),
    proofText: [
      `${sourceLabel}: ${list(resolvedLinks).filter(link => link.resolved).length} public links resolved as read-only metadata.`,
      `${sourceLabel}: ${list(blockedLinks).length} links blocked with exact approval/source reasons.`,
      'No purchases, downloads, opt-ins, form submits, login, private-source reads, or external writes.',
    ].join(' '),
  }
}

export function buildYoutubeResourceLinkResolverDogfoodProof() {
  const rawLinks = [
    { url: 'https://github.com/earlyaidopters/claudeclaw-os?utm_source=youtube', sourceReportArtifactId: 'report:dogfood' },
    { url: 'https://github.com/earlyaidopters/claudeclaw-os', sourceReportArtifactId: 'report:dogfood' },
    { url: 'https://docs.browserbase.com/introduction', sourceReportArtifactId: 'report:dogfood' },
    { url: 'https://www.skool.com/earlyaidopters/classroom/example', sourceReportArtifactId: 'report:dogfood' },
    { url: 'https://gumroad.com/l/example', sourceReportArtifactId: 'report:dogfood' },
    { url: 'https://bit.ly/example', sourceReportArtifactId: 'report:dogfood' },
    { url: 'https://example.com/template.zip', sourceReportArtifactId: 'report:dogfood' },
    { url: 'https://www.youtube.com/watch?v=abc123', sourceReportArtifactId: 'report:dogfood' },
  ]
  const syntheticFetcher = async url => ({
    ok: true,
    status: 200,
    finalUrl: url,
    headers: { contentType: 'text/html; charset=utf-8', contentLength: '412' },
    body: `<html><head><title>${url.includes('github') ? 'ClaudeClaw OS' : 'Browserbase Docs'}</title><meta name="description" content="Public documentation for agent browser skills."></head><body><h1>Public resource</h1><p>Read-only metadata fixture.</p></body></html>`,
  })

  return buildYoutubeResourceLinkResolverSnapshot({
    rawLinks,
    sourceLabel: 'dogfood YouTube resource links',
    fetcher: syntheticFetcher,
    maxResolve: 10,
  }).then(snapshot => {
    const cases = [
      {
        name: 'public_repo_and_docs_links_resolve',
        ok: snapshot.resolvedLinks.length === 2 && snapshot.resolvedLinks.every(link => link.resolutionStatus === 'resolved_public_metadata'),
      },
      {
        name: 'duplicate_public_repo_collapses',
        ok: snapshot.counts.totalLinks === 7 && snapshot.counts.duplicates === 1,
      },
      {
        name: 'private_paid_short_and_download_links_block',
        ok: snapshot.blockedLinks.length === 4 && snapshot.blockedLinks.every(link => link.approvalRequired && link.canResolve === false && text(link.blocker)),
      },
      {
        name: 'youtube_reference_is_observed_not_followed',
        ok: snapshot.observedOnlyLinks.length === 1 && snapshot.observedOnlyLinks[0].disposition === 'observed_youtube_reference',
      },
      {
        name: 'scoper_packet_contains_dispositions',
        ok: snapshot.scoperPacket.resourceLinkDispositions.length >= 6 && /No purchases/.test(snapshot.scoperPacket.proofText),
      },
    ]
    return {
      ok: cases.every(item => item.ok),
      cases,
      snapshot,
    }
  })
}
