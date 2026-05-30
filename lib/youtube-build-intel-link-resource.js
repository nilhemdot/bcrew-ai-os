import crypto from 'node:crypto'

import {
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
  YOUTUBE_SCOUT_SEED_VIDEO_URL,
  YOUTUBE_SCOUT_SOURCE_ID,
  YOUTUBE_SCOUT_VIDEO_SOURCE_ID,
} from './youtube-scout-latest-video-vision.js'

export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CARD_ID = 'YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002'
export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CLOSEOUT_KEY = 'youtube-build-intel-link-resource-v1'
export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID = 'review:youtube-build-intel-link-resource-002'
export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_PLAN_PATH = 'docs/process/youtube-build-intel-link-resource-002-plan.md'
export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002.json'
export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-23-youtube-build-intel-link-resource-closeout.md'
export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_SCRIPT_PATH = 'scripts/process-youtube-build-intel-link-resource-check.mjs'
export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_NEXT_CARD_ID = 'GOD-MODE-EXTRACTOR-RESEARCH-SWARM-001'
export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'

export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CHANGED_FILES = [
  'lib/youtube-build-intel-link-resource.js',
  'scripts/process-youtube-build-intel-link-resource-check.mjs',
  'lib/dev-team-hub.js',
  'lib/foundation-build-intel-routes.js',
  'docs/process/youtube-build-intel-link-resource-002-plan.md',
  'docs/process/approvals/YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002.json',
  'docs/_archive/handoffs/2026-05-23-youtube-build-intel-link-resource-closeout.md',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_NOT_NEXT = [
  'Do not follow external links from YouTube descriptions automatically.',
  'Do not run Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment extraction.',
  'Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.',
  'Do not create backlog cards automatically from links or recommendations.',
  'Do not process Mark last-50 or other creator latest-20 through weak transcript-only mode.',
  'Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions from this card.',
]

export const YOUTUBE_BUILD_INTEL_LINK_RESOURCE_PROOF_COMMANDS = [
  'node --check lib/youtube-build-intel-link-resource.js',
  'node --check scripts/process-youtube-build-intel-link-resource-check.mjs',
  'npm run process:youtube-build-intel-link-resource-check -- --close-card --json',
  'npm run process:dev-team-hub-v0-check -- --json',
  'npm run process:current-sprint-active-card-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:foundation-plan-reconcile-check -- --json',
  'npm run foundation:verify -- --json-summary',
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function safeUrl(value = '') {
  const raw = text(value)
  if (!raw) return null
  try {
    return new URL(raw)
  } catch {
    try {
      return new URL(`https://${raw}`)
    } catch {
      return null
    }
  }
}

function normalizeUrl(value = '') {
  const parsed = safeUrl(value)
  if (!parsed) return ''
  parsed.hash = ''
  const removableParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
  ]
  for (const key of removableParams) parsed.searchParams.delete(key)
  return parsed.toString().replace(/\/$/, '')
}

function hostOf(value = '') {
  const parsed = safeUrl(value)
  return parsed ? parsed.hostname.replace(/^www\./, '').toLowerCase() : ''
}

function classifyHostAndPath(url = '') {
  const normalizedUrl = normalizeUrl(url)
  const host = hostOf(normalizedUrl)
  const lower = `${host} ${normalizedUrl}`.toLowerCase()
  const isYoutube = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host)
  const isInternal = /(^|\.)bcrewaios\.ngrok\.app$|(^|\.)bensoncrew\.ca$/.test(host)

  if (!normalizedUrl) {
    return {
      classification: 'invalid_or_missing_url',
      category: 'invalid',
      approvalRequired: true,
      riskBoundary: 'missing_url',
      allowedDecision: 'fix_source_url',
      reason: 'The source link is missing or invalid and cannot be followed.',
    }
  }

  if (isYoutube || isInternal) {
    return {
      classification: isYoutube ? 'safe_public_youtube_reference' : 'safe_internal_reference',
      category: 'safe_reference',
      approvalRequired: false,
      riskBoundary: 'public_no_auth_reference',
      allowedDecision: 'review_only',
      reason: 'Public no-auth YouTube or internal reference. Still not followed by this card.',
    }
  }

  if (/skool|circle|discord|community|member|classroom|course/.test(lower)) {
    return {
      classification: 'approval_required_private_or_community',
      category: 'private_or_community',
      approvalRequired: true,
      riskBoundary: 'paid_private_auth_or_member_surface',
      allowedDecision: 'approve_exact_source_item_or_reject',
      reason: 'Community/course/member/auth surfaces require exact Steve approval before access.',
    }
  }

  if (/gumroad|lemonsqueezy|stripe|checkout|buy|purchase|cart|payment|paypal/.test(lower)) {
    return {
      classification: 'approval_required_purchase_or_checkout',
      category: 'purchase',
      approvalRequired: true,
      riskBoundary: 'purchase_or_checkout',
      allowedDecision: 'approve_purchase_or_reject',
      reason: 'Purchase, checkout, or paid-resource links require Steve approval.',
    }
  }

  if (/calendly|calendar|booking|book-a-call|schedule/.test(lower)) {
    return {
      classification: 'approval_required_booking_or_calendar',
      category: 'booking',
      approvalRequired: true,
      riskBoundary: 'booking_or_calendar_action',
      allowedDecision: 'approve_follow_or_reject',
      reason: 'Booking or calendar links can create external action paths.',
    }
  }

  if (/drive\.google|docs\.google|dropbox|notion|github|gitlab|download|\.zip|\.dmg|\.pkg|\.exe|\.pdf/.test(lower)) {
    return {
      classification: /github|gitlab/.test(lower) ? 'approval_required_public_code_or_repo' : 'approval_required_file_or_download',
      category: /github|gitlab/.test(lower) ? 'code_or_repo' : 'file_or_download',
      approvalRequired: true,
      riskBoundary: /github|gitlab/.test(lower) ? 'external_code_repository' : 'download_or_file_access',
      allowedDecision: 'approve_exact_public_resource_or_reject',
      reason: 'External code/file/download resources are useful but must be approved before follow or ingest.',
    }
  }

  if (/newsletter|subscribe|waitlist|optin|opt-in|leadmagnet|lead-magnet|form/.test(lower)) {
    return {
      classification: 'approval_required_opt_in_or_form',
      category: 'opt_in',
      approvalRequired: true,
      riskBoundary: 'form_or_opt_in',
      allowedDecision: 'approve_follow_or_reject',
      reason: 'Opt-in and form links can submit personal or business data.',
    }
  }

  return {
    classification: 'approval_required_external_reference',
    category: 'external_reference',
    approvalRequired: true,
    riskBoundary: 'external_site',
    allowedDecision: 'approve_follow_or_reject',
    reason: 'External links are review-only until Steve approves the exact follow-up.',
  }
}

function normalizeRawLink(raw = {}, index = 0) {
  const url = raw.normalizedUrl || raw.url || raw.sourceUrl || raw.href || ''
  const normalizedUrl = normalizeUrl(url)
  const classification = classifyHostAndPath(normalizedUrl || url)
  return {
    linkId: `youtube-link:${stableHash([normalizedUrl || url, index]).slice(0, 16)}`,
    sourceIndex: index,
    url: normalizedUrl || text(url),
    host: raw.host || hostOf(normalizedUrl || url),
    sourceText: raw.text || raw.label || raw.anchorText || '',
    sourceUrl: raw.sourceUrl || YOUTUBE_SCOUT_SEED_VIDEO_URL,
    sourceVideoId: raw.sourceVideoId || '5xrjO38WUYY',
    sourceReportArtifactId: raw.sourceReportArtifactId || YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
    sourceId: raw.sourceId || YOUTUBE_SCOUT_SOURCE_ID,
    classification: raw.classification || classification.classification,
    category: raw.category || classification.category,
    approvalRequired: raw.approvalRequired ?? classification.approvalRequired,
    requiresSteveReview: raw.requiresSteveReview ?? classification.approvalRequired,
    canFollowAutomatically: false,
    riskBoundary: raw.riskBoundary || classification.riskBoundary,
    allowedDecision: raw.allowedDecision || classification.allowedDecision,
    reason: raw.reason || classification.reason,
    evidence: raw.evidence || 'Observed in approved public YouTube description/resource-link proof.',
  }
}

function rawLinksFromScoutReport(scoutReport = null) {
  const structured = scoutReport?.structuredOutputJson || scoutReport?.structured_output_json || {}
  const fromStructured = list(structured.seedCapture?.resourceLinks).map(link => ({
    ...link,
    sourceUrl: structured.source?.seedVideoUrl || YOUTUBE_SCOUT_SEED_VIDEO_URL,
    sourceVideoId: structured.source?.seedVideoId || '5xrjO38WUYY',
  }))
  const fromActionItems = list(scoutReport?.actionRequiredItems || scoutReport?.action_required_items)
    .filter(item => item.type === 'external_resource_approval_required' || item.requiresSteveReview === true || item.url || item.sourceUrl)
    .map(item => ({
      ...item,
      normalizedUrl: item.url || item.sourceUrl,
      sourceUrl: item.sourceUrl || structured.source?.seedVideoUrl || YOUTUBE_SCOUT_SEED_VIDEO_URL,
      sourceVideoId: item.sourceVideoId || structured.source?.seedVideoId || '5xrjO38WUYY',
      approvalRequired: true,
      requiresSteveReview: true,
    }))
  return [...fromStructured, ...fromActionItems]
}

function dedupeLinks(rawLinks = []) {
  const grouped = new Map()
  rawLinks
    .map(normalizeRawLink)
    .filter(link => text(link.url))
    .forEach(link => {
      const key = normalizeUrl(link.url) || link.url
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, { ...link, duplicateCount: 1, evidenceRefs: [link.sourceReportArtifactId] })
        return
      }
      existing.duplicateCount += 1
      existing.evidenceRefs = Array.from(new Set([...existing.evidenceRefs, link.sourceReportArtifactId]))
      existing.approvalRequired = existing.approvalRequired || link.approvalRequired
      existing.requiresSteveReview = existing.requiresSteveReview || link.requiresSteveReview
      existing.canFollowAutomatically = false
    })
  return Array.from(grouped.values()).map((link, index) => ({
    ...link,
    linkId: `youtube-link:${stableHash([link.url, link.sourceReportArtifactId]).slice(0, 16)}`,
    rank: index + 1,
  }))
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

export function buildYoutubeBuildIntelLinkResourceSnapshot({
  scoutBundle = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const scoutReport = scoutBundle.report || null
  const rawLinks = rawLinksFromScoutReport(scoutReport)
  const links = dedupeLinks(rawLinks)
  const approvalRequiredLinks = links.filter(link => link.approvalRequired || link.requiresSteveReview)
  const safeReferences = links.filter(link => !link.approvalRequired)
  const duplicateLinks = links.filter(link => Number(link.duplicateCount || 0) > 1)
  const findings = []

  addFinding(findings, Boolean(scoutReport), 'approved scout report is available', scoutReport?.reportArtifactId || 'missing')
  addFinding(findings, links.length >= 1, 'description/resource links are captured and deduped', `${links.length} link(s)`)
  addFinding(findings, approvalRequiredLinks.length >= 1, 'approval-required external/resource links are queued', `${approvalRequiredLinks.length} link(s)`)
  addFinding(findings, links.every(link => link.canFollowAutomatically === false), 'no link can be followed automatically', 'all follow=false')
  addFinding(findings, approvalRequiredLinks.every(link => link.requiresSteveReview === true && text(link.allowedDecision)), 'approval links have Steve-review decision boundary', `${approvalRequiredLinks.length} approval link(s)`)
  addFinding(findings, links.every(link => text(link.sourceReportArtifactId) && text(link.sourceUrl)), 'every link preserves source evidence', 'report + source URL')
  addFinding(findings, true, 'hard boundaries remain recorded', YOUTUBE_BUILD_INTEL_LINK_RESOURCE_NOT_NEXT.join(' | '))

  const failures = findings.filter(finding => !finding.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CARD_ID,
    closeoutKey: YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CLOSEOUT_KEY,
    reportArtifactId: YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
    sourceIds: [YOUTUBE_SCOUT_SOURCE_ID, YOUTUBE_SCOUT_VIDEO_SOURCE_ID],
    generatedAt,
    sourceReportArtifactId: YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
    sourceVideoUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
    rawLinkCount: rawLinks.length,
    links,
    approvalRequiredLinks,
    safeReferences,
    duplicateLinks,
    notNext: YOUTUBE_BUILD_INTEL_LINK_RESOURCE_NOT_NEXT,
    findings,
    failures,
  }
}

export function buildYoutubeBuildIntelLinkResourceWriteSet(snapshot = {}) {
  return {
    reportArtifact: {
      reportArtifactId: YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
      reportType: 'scout_report',
      scopeKey: YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CARD_ID,
      department: 'Foundation / Dev Team Intelligence',
      title: 'YouTube Build Intel link/resource approval queue',
      status: snapshot.ok ? 'reviewed' : 'failed',
      sourceIds: snapshot.sourceIds,
      inputArtifactIds: [snapshot.sourceReportArtifactId].filter(Boolean),
      sourceCoverage: [{
        sourceId: YOUTUBE_SCOUT_SOURCE_ID,
        reportArtifactId: snapshot.sourceReportArtifactId,
        sourceUrl: snapshot.sourceVideoUrl,
        coverage: 'youtube_description_resource_links_classified_without_following',
      }],
      dedupSummary: {
        guard: 'normalized_url',
        rawLinkCount: snapshot.rawLinkCount,
        uniqueLinkCount: list(snapshot.links).length,
        duplicateLinkCount: list(snapshot.duplicateLinks).length,
      },
      rejectedNoiseSummary: [
        'no_external_link_follow',
        'no_purchase_download_opt_in_booking_or_form_submit',
        'no_private_paid_auth_member_community_crawl',
        'no_backlog_card_auto_creation',
      ],
      topFindings: list(snapshot.approvalRequiredLinks).slice(0, 10).map((link, index) => ({
        rank: index + 1,
        finding: `${link.host || 'external link'} requires approval before follow`,
        recommendation: link.allowedDecision,
        url: link.url,
        classification: link.classification,
        reason: link.reason,
      })),
      actionRequiredItems: list(snapshot.approvalRequiredLinks).map(link => ({
        type: 'youtube_link_resource_approval_required',
        linkId: link.linkId,
        url: link.url,
        host: link.host,
        classification: link.classification,
        category: link.category,
        reason: link.reason,
        riskBoundary: link.riskBoundary,
        allowedDecision: link.allowedDecision,
        requiresSteveReview: true,
        canFollowAutomatically: false,
        sourceUrl: link.sourceUrl,
        sourceVideoId: link.sourceVideoId,
        sourceReportArtifactId: link.sourceReportArtifactId,
      })),
      openQuestions: [{
        question: 'Which exact link/resource should Steve approve for a follow-up extraction card?',
        reason: 'This card classifies and queues links only; follow/download/auth/purchase actions stay blocked.',
      }],
      structuredOutputJson: {
        linkQueue: snapshot.links,
        approvalRequiredLinks: snapshot.approvalRequiredLinks,
        safeReferences: snapshot.safeReferences,
        duplicateLinks: snapshot.duplicateLinks,
        sourceReportArtifactId: snapshot.sourceReportArtifactId,
        sourceVideoUrl: snapshot.sourceVideoUrl,
        stopControls: snapshot.notNext,
        createsBacklogCardsAutomatically: false,
        externalWrites: false,
      },
      metadata: {
        cardId: YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CARD_ID,
        closeoutKey: YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CLOSEOUT_KEY,
        sourceReportArtifactId: snapshot.sourceReportArtifactId,
        approvalRequiredLinkCount: list(snapshot.approvalRequiredLinks).length,
        safeReferenceCount: list(snapshot.safeReferences).length,
        proposalOnly: true,
        createsBacklogCardsAutomatically: false,
        externalWrites: false,
        privateOrPaidAccess: false,
      },
    },
  }
}

export function verifyYoutubeBuildIntelLinkResourcePersistedProof({ snapshot = {}, report = null } = {}) {
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}
  const actionItems = list(report?.actionRequiredItems || report?.action_required_items)
  const linkQueue = list(structured.linkQueue)
  const failures = []
  if (!report || report.reportArtifactId !== YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID) failures.push({ check: 'report_missing' })
  if (linkQueue.length !== list(snapshot.links).length) failures.push({ check: 'link_queue_count_mismatch' })
  if (actionItems.length !== list(snapshot.approvalRequiredLinks).length) failures.push({ check: 'approval_item_count_mismatch' })
  if (!actionItems.every(item => item.requiresSteveReview === true && item.canFollowAutomatically === false)) failures.push({ check: 'unsafe_approval_item_posture' })
  if (structured.externalWrites !== false || structured.createsBacklogCardsAutomatically !== false) failures.push({ check: 'unsafe_write_posture' })
  return {
    ok: failures.length === 0,
    failures,
  }
}

export function buildYoutubeBuildIntelLinkResourceDogfoodProof() {
  const rawLinks = [
    { normalizedUrl: 'https://www.youtube.com/watch?v=safe123', sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL },
    { normalizedUrl: 'https://www.youtube.com/watch?v=safe123&utm_source=x', sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL },
    { normalizedUrl: 'https://www.skool.com/earlyaidopters/classroom/example', sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL },
    { normalizedUrl: 'https://github.com/example/repo', sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL },
    { normalizedUrl: 'https://buy.stripe.com/example', sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL },
  ]
  const syntheticReport = {
    reportArtifactId: YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
    structuredOutputJson: { seedCapture: { resourceLinks: rawLinks } },
    actionRequiredItems: [],
  }
  const snapshot = buildYoutubeBuildIntelLinkResourceSnapshot({ scoutBundle: { report: syntheticReport } })
  const missing = buildYoutubeBuildIntelLinkResourceSnapshot({ scoutBundle: { report: null } })
  const safeLinks = snapshot.links.filter(link => !link.approvalRequired)
  const riskyLinks = snapshot.links.filter(link => link.approvalRequired)

  const cases = [
    { name: 'safe_youtube_reference_is_not_approval_required', ok: safeLinks.length === 1 && safeLinks[0].classification === 'safe_public_youtube_reference' },
    { name: 'duplicate_youtube_links_collapse', ok: snapshot.links.length === 4 && snapshot.duplicateLinks.length === 1 },
    { name: 'risky_external_links_require_steve_review', ok: riskyLinks.length === 3 && riskyLinks.every(link => link.requiresSteveReview && !link.canFollowAutomatically) },
    { name: 'missing_source_fails_closed', ok: missing.ok === false && missing.failures.some(failure => failure.check === 'approved scout report is available') },
  ]

  return {
    ok: cases.every(item => item.ok),
    cases,
  }
}

export function renderYoutubeBuildIntelLinkResourceCloseout(snapshot = {}) {
  return [
    '# YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002 Closeout',
    '',
    `Closeout key: \`${YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CLOSEOUT_KEY}\``,
    '',
    '## What Shipped',
    '',
    '- Captured and deduped YouTube description/resource links from the approved scout report.',
    '- Classified safe public YouTube/internal references separately from approval-required external/private/download/purchase/opt-in/auth/community links.',
    '- Persisted a Foundation report artifact for the Dev Team approval queue.',
    '- Did not follow links, download files, purchase, opt in, submit forms, mutate credentials, or create backlog cards.',
    '',
    '## Proof Summary',
    '',
    `- Unique links: ${list(snapshot.links).length}`,
    `- Approval-required links: ${list(snapshot.approvalRequiredLinks).length}`,
    `- Safe references: ${list(snapshot.safeReferences).length}`,
    `- Duplicate groups: ${list(snapshot.duplicateLinks).length}`,
    '',
    '## Next',
    '',
    `Continue \`${YOUTUBE_BUILD_INTEL_LINK_RESOURCE_NEXT_CARD_ID}\` before any Mark last-50 or broader latest-20 extraction. The next phase researches and designs the real God Mode extractor/EYES quality loop.`,
    '',
    '## Not Next',
    '',
    ...YOUTUBE_BUILD_INTEL_LINK_RESOURCE_NOT_NEXT.map(item => `- ${item}`),
    '',
  ].join('\n')
}
