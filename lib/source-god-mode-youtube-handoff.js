import crypto from 'node:crypto'
import path from 'node:path'

import {
  YOUTUBE_SCOUT_SOURCE_ID,
} from './youtube-scout-latest-video-vision.js'
import {
  runSkoolFreeCommunityGodMode,
} from './skool-free-community-god-mode-runner.js'
import {
  buildPublicRepoDeepReviewPacket,
  runPublicRepoDeepReview,
} from './public-repo-deep-review-runner.js'
import {
  evaluateSourceBrowserPageHealth,
  runSourceGodModeExtractor,
} from './source-god-mode-extractor-runtime.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  evaluateSourceSessionBrokerRequest,
} from './source-session-broker.js'
import {
  buildSourceBrowserAgentCrawlItemInput,
  planSourceBrowserAgentRun,
} from './source-browser-agent-harness.js'
import {
  buildSourceBrowserFallbackRetryPacket,
} from './source-browser-fallback-executor.js'
import {
  buildSourceSessionActionGroupReadiness,
} from './source-session-readiness-readback.js'

export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SCRIPT_PATH = 'scripts/process-source-god-mode-youtube-handoff-check.mjs'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_ROOT = '.openclaw/source-god-mode-youtube-handoff'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY = 'source-god-mode-youtube-handoff-runs'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SOURCE_ID = YOUTUBE_SCOUT_SOURCE_ID
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_MAX_ITEMS_PER_RUN = 20
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_MAX_RUNTIME_SECONDS = 3900
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_VERSION = 2
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT = 1000

const DEFAULT_ROW_LIMIT = 0
const DEV_LANE_PRIORITY_GRADES = ['S', 'A', 'B', 'C', 'D']
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
  'dub.sh',
  'linktr.ee',
  'beacons.ai',
])
const SOCIAL_PROFILE_HOSTS = new Set([
  'instagram.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'facebook.com',
  'threads.net',
])
const DIRECT_COMMUNITY_INVITE_HOSTS = new Set([
  'discord.gg',
  'discord.com',
])
const PUBLIC_WEB_FORM_OR_AUTH_RE = /(?:^|[/?#&=._-])(login|signin|sign[_-]?in|signup|sign[_-]?up|join|checkout|payment|billing|subscription|purchase|buy|cart|booking|book-a-call|calendar|calendly|work-with-me|apply|application|download|upload|account|settings|profile|password|mfa|2fa|form|forms|fan_mail)(?:[/?#&=._-]|$)/i
const AFFILIATE_OR_TRACKING_PARAM_RE = /(?:[?&]|%3[fF])(fpr|ref|via|affiliate|partner|ps_partner_key|gspk|gsxid|ps_xid|dub_id)=/i
const PUBLIC_REPO_DEEP_REVIEW_HOSTS = new Set([
  'github.com',
  'gist.github.com',
  'gitlab.com',
  '127.0.0.1',
  'localhost',
])

const BUCKET_CONFIG = {
  'public-web-resources': {
    label: 'Public pages/resources',
    runner: 'source:god-mode',
    sourceType: 'public_or_free_source',
    status: 'ready_for_public_free_source_runtime',
    runnable: true,
    maxPages: 4,
    maxDepth: 1,
    allowedActions: ['read visible public page context', 'follow safe public/free links inside run budget', 'classify blockers'],
  },
  'public-code-repos': {
    label: 'Public code repos',
    runner: 'repo:deep-review',
    sourceType: 'github_docs_public_resources',
    status: 'ready_for_public_repo_deep_review',
    runnable: true,
    maxPages: 4,
    maxDepth: 2,
    allowedActions: ['read public repo/docs metadata', 'read visible README/docs/examples/license/provenance', 'extract implementation patterns with citations', 'classify install/download/auth blockers'],
  },
  'creator-newsletters': {
    label: 'Creator newsletters',
    runner: 'source:god-mode',
    sourceType: 'creator_newsletter',
    status: 'ready_for_newsletter_page_read',
    runnable: true,
    maxPages: 3,
    maxDepth: 1,
    allowedActions: ['read public newsletter page', 'detect signup form', 'do not submit until source identity signup lane runs'],
  },
  'free-communities': {
    label: 'Free communities',
    runner: 'skool:free-god-mode',
    sourceType: 'skool_free_community',
    status: 'ready_for_free_community_runner',
    runnable: true,
    sourceSpecific: true,
    maxPages: 12,
    maxDepth: 2,
    allowedActions: ['use approved free source identity/session', 'read visible free posts/comments for 20 days', 'read free courses/resources', 'stop at auth/paid/private/write/download blockers'],
  },
  'products-tools-to-approve': {
    label: 'Products/tools to approve',
    runner: 'approval-review',
    sourceType: 'purchase_or_product_candidate',
    status: 'parked_for_value_review',
    runnable: false,
    parked: true,
    allowedActions: ['score visible value only', 'do not buy, download, opt in, or submit forms'],
  },
  'paid-auth-gates': {
    label: 'Paid/auth gates',
    runner: 'source-session-broker',
    sourceType: 'paid_or_auth_source',
    status: 'blocked_until_source_session_packet',
    runnable: false,
    parked: true,
    requiresAuth: true,
    allowedActions: ['create exact paid/auth packet', 'use session broker only after approved scope'],
  },
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function bucketRuntimeStatus({ config = {}, rows = [] } = {}) {
  const runnableRows = rows.filter(row => row.runnable)
  const alreadyRunRows = rows.filter(row => row.status === 'already_run_source_evidence_saved')
  const parkedRows = rows.filter(row => !row.runnable && row.status !== 'already_run_source_evidence_saved')
  if (runnableRows.length) return config.status || 'ready'
  if (alreadyRunRows.length && parkedRows.length) return 'drained_with_parked_rows'
  if (alreadyRunRows.length) return 'already_run_source_evidence_saved'
  if (parkedRows.length) return 'parked_by_boundary_or_policy'
  return config.status || 'empty'
}

function safeKey(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'source'
}

function hostOf(value = '') {
  try {
    return new URL(text(value)).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function parsedUrl(value = '') {
  try {
    return new URL(text(value))
  } catch {
    return null
  }
}

function cleanPublicCommunityBridgeStartUrl(value = '') {
  const url = parsedUrl(value)
  if (!url || !PUBLIC_WEB_FORM_OR_AUTH_RE.test(value)) return ''
  const host = hostOf(value)
  if (!host || isSkoolOrLocalFixtureHost(host) || DIRECT_COMMUNITY_INVITE_HOSTS.has(host)) return ''
  const requestedHost = text(url.searchParams.get('request_host')).replace(/^www\./, '').toLowerCase()
  const cleanHost = requestedHost && requestedHost === host ? requestedHost : host
  if (!cleanHost || DIRECT_COMMUNITY_INVITE_HOSTS.has(cleanHost)) return ''
  return `${url.protocol === 'http:' ? 'http' : 'https'}://${cleanHost}/`
}

const SOURCE_HANDOFF_TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'session',
  'sessionid',
  'fbclid',
  'gclid',
  'msclkid',
  'fpr',
  'ref',
  'via',
  'affiliate',
  'partner',
  'ps_partner_key',
  'gspk',
  'gsxid',
  'ps_xid',
  'dub_id',
])

function normalizeSourceHandoffUrl(value = '') {
  const url = parsedUrl(value)
  if (!url) return ''
  url.hash = ''
  url.hostname = url.hostname.replace(/^www\./, '').toLowerCase()
  url.pathname = url.pathname.replace(/\/{2,}/g, '/')
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/g, '')
  for (const key of [...url.searchParams.keys()]) {
    if (SOURCE_HANDOFF_TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key)
    }
  }
  url.searchParams.sort()
  return url.toString()
}

function sourceHandoffDedupeKey(value = '') {
  const normalized = normalizeSourceHandoffUrl(value)
  const url = parsedUrl(normalized)
  if (!url) return text(value).toLowerCase()
  return [
    url.hostname,
    url.pathname || '/',
    url.searchParams.toString(),
  ].join('|')
}

function mergeSourceHandoffItems(existing = {}, item = {}) {
  const originalUrls = uniqueStrings([
    ...list(existing.originalUrls),
    existing.url,
    existing.normalizedUrl,
    existing.href,
    item.url,
    item.normalizedUrl,
    item.href,
    ...list(item.originalUrls),
  ])
  const reportArtifactIds = uniqueStrings([
    existing.reportArtifactId,
    ...list(existing.reportArtifactIds),
    item.reportArtifactId,
    ...list(item.reportArtifactIds),
  ])
  const sourceVideoIds = uniqueStrings([
    existing.sourceVideoId,
    ...list(existing.sourceVideoIds),
    item.sourceVideoId,
    ...list(item.sourceVideoIds),
  ])
  const sourceCreatorIds = uniqueStrings([
    existing.creatorId,
    ...list(existing.sourceCreatorIds),
    item.creatorId,
    ...list(item.sourceCreatorIds),
  ])
  const sourceCreators = uniqueStrings([
    existing.creator,
    ...list(existing.sourceCreators),
    item.creator,
    ...list(item.sourceCreators),
  ])
  const dispositions = uniqueStrings([
    existing.disposition,
    item.disposition,
    ...list(existing.dispositions),
    ...list(item.dispositions),
  ])
  return {
    ...existing,
    ...item,
    url: existing.url || item.url || '',
    normalizedUrl: existing.normalizedUrl || item.normalizedUrl || '',
    href: existing.href || item.href || '',
    host: hostOf(existing.url || existing.normalizedUrl || item.url || item.normalizedUrl) || existing.host || item.host || '',
    reportArtifactId: reportArtifactIds[0] || '',
    reportArtifactIds,
    sourceVideoId: sourceVideoIds[0] || '',
    sourceVideoIds,
    creatorId: sourceCreatorIds[0] || '',
    sourceCreatorIds,
    creator: sourceCreators[0] || '',
    sourceCreators,
    disposition: dispositions[0] || '',
    dispositions,
    originalUrls,
    duplicateEvidenceRowCount: originalUrls.length || number(existing.duplicateEvidenceRowCount, 1),
  }
}

function dedupeSourceHandoffRows(rows = []) {
  const byKey = new Map()
  const output = []
  for (const item of list(rows)) {
    const rawUrl = text(item.url || item.normalizedUrl || item.href)
    const normalizedUrl = normalizeSourceHandoffUrl(rawUrl) || rawUrl
    const key = sourceHandoffDedupeKey(normalizedUrl || rawUrl)
    const normalizedItem = {
      ...item,
      url: normalizedUrl,
      normalizedUrl,
      host: hostOf(normalizedUrl) || text(item.host),
      originalUrls: uniqueStrings([rawUrl, ...list(item.originalUrls)]),
      sourceHandoffDedupeKey: key,
    }
    if (!key || !byKey.has(key)) {
      byKey.set(key, normalizedItem)
      output.push(normalizedItem)
      continue
    }
    const merged = mergeSourceHandoffItems(byKey.get(key), normalizedItem)
    byKey.set(key, merged)
    const index = output.findIndex(row => row.sourceHandoffDedupeKey === key)
    if (index >= 0) output[index] = merged
  }
  return output
}

function isSkoolOrLocalFixtureHost(host = '') {
  const normalizedHost = text(host).replace(/^www\./, '').toLowerCase()
  return normalizedHost === 'skool.com' || normalizedHost === '127.0.0.1' || normalizedHost === 'localhost'
}

function isPublicRepoDeepReviewHost(host = '') {
  return PUBLIC_REPO_DEEP_REVIEW_HOSTS.has(text(host).replace(/^www\./, '').toLowerCase())
}

function publicRepoDeepReviewPathSegments(value = '') {
  const url = parsedUrl(value)
  if (!url) return []
  return url.pathname.split('/').map(part => text(part)).filter(Boolean)
}

function isPublicRepoDeepReviewUrl(value = '') {
  const host = hostOf(value)
  if (!isPublicRepoDeepReviewHost(host)) return false
  return publicRepoDeepReviewPathSegments(value).length >= 2
}

function uniqueStrings(values = []) {
  return [...new Set(list(values).map(text).filter(Boolean))]
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

function normalizeName(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function gradeRankValue(grade = '') {
  return { S: 5, A: 4, B: 3, C: 2, D: 1 }[text(grade).toUpperCase()] || 0
}

function laneScore(source = {}, laneId = 'aios_dev_build') {
  return list(source.laneScores).find(lane => lane.laneId === laneId) || {}
}

function buildSourceGradeLookup(sourceValueGrader = {}) {
  const grader = sourceValueGrader || {}
  const byId = new Map()
  const byName = new Map()
  for (const source of list(grader.sourceGrades)) {
    const devLane = laneScore(source)
    const row = {
      creatorId: text(source.creatorId),
      creator: text(source.creator),
      devBuildGrade: text(source.devBuildGrade || devLane.grade || source.overallGrade || 'ungraded').toUpperCase(),
      devBuildScore: number(devLane.score, 0),
      devWatchRecommendation: text(source.devWatchRecommendation || devLane.watchRecommendation || source.watchRecommendation),
      overallGrade: text(source.overallGrade || source.grade || 'ungraded').toUpperCase(),
      primaryUse: text(source.primaryUse),
    }
    if (row.creatorId) byId.set(row.creatorId, row)
    if (row.creator) byName.set(normalizeName(row.creator), row)
  }
  return { byId, byName }
}

function sourceGradeRowsForItem(item = {}, lookup = {}) {
  const rows = []
  const seen = new Set()
  for (const creatorId of uniqueStrings([item.creatorId, ...list(item.sourceCreatorIds)])) {
    const row = lookup.byId?.get(creatorId)
    if (!row) continue
    const key = row.creatorId || normalizeName(row.creator)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(row)
  }
  for (const creator of uniqueStrings([item.creator, ...list(item.sourceCreators)])) {
    const row = lookup.byName?.get(normalizeName(creator))
    if (!row) continue
    const key = row.creatorId || normalizeName(row.creator)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(row)
  }
  return rows.sort((left, right) =>
    gradeRankValue(right.devBuildGrade) - gradeRankValue(left.devBuildGrade) ||
    number(right.devBuildScore) - number(left.devBuildScore) ||
    text(left.creator).localeCompare(text(right.creator))
  )
}

function bestDevGrade(sourceGrades = []) {
  return list(sourceGrades)
    .map(source => text(source.devBuildGrade).toUpperCase())
    .filter(Boolean)
    .sort((left, right) => gradeRankValue(right) - gradeRankValue(left))[0] || ''
}

function buildDevLanePriority(row = {}, sourceGrades = [], priorityGrades = DEV_LANE_PRIORITY_GRADES) {
  const grades = list(priorityGrades).map(grade => text(grade).toUpperCase()).filter(Boolean)
  const bestGrade = bestDevGrade(sourceGrades)
  const sourceScore = sourceGrades.reduce((max, source) => Math.max(max, number(source.devBuildScore, 0)), 0)
  const priorityRank = bestGrade ? Math.max(1, grades.indexOf(bestGrade) + 1 || grades.length + 1) : grades.length + 1
  if (!bestGrade) {
    return {
      status: 'review_no_creator_grade',
      action: 'review_before_dev_downstream',
      priorityBand: 'review',
      priorityRank,
      priorityLabel: 'Needs creator grade review',
      bestDevBuildGrade: 'ungraded',
      sourceScore,
      reason: 'No source creator grade is attached yet. Keep the evidence, keep extracting, and review before sending this link into Dev downstream work.',
    }
  }
  const priorityBand = bestGrade === 'S' || bestGrade === 'A'
    ? 'highest_signal'
    : bestGrade === 'B'
      ? 'solid_signal'
      : 'later_signal'
  return {
    status: 'prioritized_by_dev_source_grade',
    action: priorityBand === 'highest_signal' ? 'run_first' : priorityBand === 'solid_signal' ? 'run_after_s_a' : 'keep_extracting_run_later',
    priorityBand,
    priorityRank,
    priorityLabel: priorityBand === 'highest_signal'
      ? 'Run first'
      : priorityBand === 'solid_signal'
        ? 'Run after S/A'
        : 'Run later, do not delete',
    bestDevBuildGrade: bestGrade,
    sourceScore,
    reason: `Best attached Dev creator grade is ${bestGrade}. This ranks the link for Dev follow-up; it does not delete or suppress Foundation evidence.`,
  }
}

function sourceSessionPrepPhase(row = {}) {
  if (row.bucketId === 'creator-newsletters') {
    return {
      phase: 'newsletter_signup_lane_needed',
      status: 'newsletter_intake_dry_run_ready',
      plainEnglish: 'Newsletter page evidence is read; the dry-run newsletter intake worker can verify the signup form and source-inbox packet. Live external submit still waits for the source-identity signup lane.',
      account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      runner: 'newsletter:intake',
      runAfterSessionCommand: `npm run newsletter:intake -- --url=${row.url} --account=${SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT}`,
    }
  }
  if (row.bucketId === 'paid-auth-gates') {
    return {
      phase: 'paid_or_auth_packet_needed',
      status: 'blocked_until_paid_auth_source_packet',
      plainEnglish: 'Paid/auth/private source evidence is parked until Steve approves the exact source packet and session boundary.',
      account: row.sourceSessionBroker?.account || 'approved_paid_account',
      runner: 'source-session-broker',
      runAfterSessionCommand: '',
    }
  }
  if (row.bucketId !== 'free-communities') return null
  if (row.status === 'ready_for_public_community_bridge_read' || row.sourceType === 'public_community_bridge') return null
  if (row.status === 'already_run_source_evidence_saved') {
    return {
      phase: 'free_community_already_read',
      status: 'already_read',
      plainEnglish: 'Free-community source evidence has already been saved for this exact URL.',
      account: row.sourceSessionBroker?.account || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      runner: row.runner,
      runAfterSessionCommand: '',
    }
  }
  if (row.status === 'blocked_non_skool_community_bridge') {
    return {
      phase: 'community_runner_needed',
      status: 'blocked_until_source_specific_community_runner',
      plainEnglish: 'This is community evidence, but it is not a Skool URL. Build a source-specific community runner or resolve the public page first.',
      account: row.sourceSessionBroker?.account || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      runner: 'source-specific-community-runner',
      runAfterSessionCommand: '',
    }
  }
  if (row.status === 'blocked_free_community_form_auth_or_action_surface') {
    return {
      phase: 'community_start_url_needed',
      status: 'blocked_until_clean_public_about_url_or_session',
      plainEnglish: 'This community row starts on a signup/login/action URL. Find the clean public/about community URL before running the 20-day SOP.',
      account: row.sourceSessionBroker?.account || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      runner: row.runner,
      runAfterSessionCommand: '',
    }
  }
  if (row.sourceSessionBroker?.status === 'session_ready' && row.runnable === true) {
    return {
      phase: 'free_skool_session_ready',
      status: 'ready_after_source_session',
      plainEnglish: 'The source-session broker says the isolated Skool profile is ready; the free-community SOP can run inside that boundary.',
      account: row.sourceSessionBroker?.account || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      runner: row.runner,
      runAfterSessionCommand: row.runCommand || buildRunCommand(row),
    }
  }
  return {
    phase: 'free_source_identity_session_needed',
    status: 'blocked_until_free_source_identity_session',
    plainEnglish: row.sourceSessionBroker?.nextAction || 'Create or verify the free source identity/session, then run the Skool free-community SOP.',
    account: row.sourceSessionBroker?.account || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    runner: row.runner,
    runAfterSessionCommand: isSkoolOrLocalFixtureHost(hostOf(row.url))
      ? `npm run skool:free-god-mode -- --url=${row.url}`
      : '',
  }
}

function sourceSessionPrepRank(row = {}) {
  const phaseRank = {
    free_skool_session_ready: 0,
    free_source_identity_session_needed: 1,
    newsletter_signup_lane_needed: 2,
    community_start_url_needed: 3,
    community_runner_needed: 4,
    paid_or_auth_packet_needed: 5,
    free_community_already_read: 9,
  }[row.phase] ?? 8
  return phaseRank * 1000 + number(row.devLanePriority?.priorityRank, 99)
}

function sourceSessionPrepPreviewRows(rows = [], limit = 80) {
  const selected = []
  const seen = new Set()
  const addRow = row => {
    const key = row.rowId || row.url
    if (!key || seen.has(key) || selected.length >= limit) return
    selected.push(row)
    seen.add(key)
  }
  for (const phase of [
    'free_skool_session_ready',
    'free_source_identity_session_needed',
    'newsletter_signup_lane_needed',
    'community_start_url_needed',
    'community_runner_needed',
    'paid_or_auth_packet_needed',
    'free_community_already_read',
  ]) {
    for (const row of list(rows).filter(item => item.phase === phase).slice(0, 8)) addRow(row)
  }
  for (const row of list(rows)) addRow(row)
  return selected
}

function sourceSessionClusterKey(row = {}) {
  const host = text(row.host || hostOf(row.url))
  const url = parsedUrl(row.url)
  const pathParts = text(url?.pathname || '')
    .split('/')
    .map(part => text(part))
    .filter(Boolean)
    .filter(part => !/^(about|posts|classroom|classrooms|courses|members|resources|login|sign[_-]?up|join)$/i.test(part))
  const communityOrPathKey = isSkoolOrLocalFixtureHost(host)
    ? pathParts[0] || host
    : pathParts[0] && row.phase === 'community_runner_needed'
      ? pathParts[0]
      : ''
  return [
    row.phase,
    row.bucketId,
    host,
    communityOrPathKey,
  ].map(text).filter(Boolean).join(':')
}

function sourceSessionClusterLabel(row = {}) {
  const host = text(row.host || hostOf(row.url))
  const url = parsedUrl(row.url)
  const pathParts = text(url?.pathname || '')
    .split('/')
    .map(part => text(part))
    .filter(Boolean)
  const pathKey = pathParts.find(part => !/^(about|posts|classroom|classrooms|courses|members|resources|login|sign[_-]?up|join)$/i.test(part))
  if (pathKey && (isSkoolOrLocalFixtureHost(host) || row.phase === 'community_runner_needed')) {
    return `${host}/${pathKey}`
  }
  return host || text(row.label) || 'source'
}

function bestPrepClusterPriority(rows = []) {
  return list(rows)
    .map(row => row.devLanePriority)
    .filter(Boolean)
    .sort((left, right) =>
      number(left.priorityRank, 99) - number(right.priorityRank, 99) ||
      number(right.sourceScore, 0) - number(left.sourceScore, 0)
    )[0] || null
}

function uniqueSourceGradesForPrepRows(rows = []) {
  const seen = new Set()
  const grades = []
  for (const row of list(rows)) {
    for (const source of list(row.sourceGrades)) {
      const key = source.creatorId || source.creator
      if (!key || seen.has(key)) continue
      seen.add(key)
      grades.push(source)
    }
  }
  return grades
    .sort((left, right) =>
      gradeRankValue(right.devBuildGrade) - gradeRankValue(left.devBuildGrade) ||
      number(right.devBuildScore, 0) - number(left.devBuildScore, 0) ||
      text(left.creator).localeCompare(text(right.creator))
    )
    .slice(0, 5)
}

const SOURCE_SESSION_PHASE_ORDER = [
  'free_skool_session_ready',
  'free_source_identity_session_needed',
  'newsletter_signup_lane_needed',
  'community_start_url_needed',
  'community_runner_needed',
  'paid_or_auth_packet_needed',
  'free_community_already_read',
]

function buildSourceSessionPrepClusters(rows = []) {
  const byKey = new Map()
  for (const row of list(rows)) {
    const clusterKey = sourceSessionClusterKey(row)
    if (!clusterKey) continue
    if (!byKey.has(clusterKey)) byKey.set(clusterKey, [])
    byKey.get(clusterKey).push(row)
  }
  const clusters = [...byKey.entries()].map(([clusterKey, clusterRows]) => {
    const sortedRows = list(clusterRows).sort((left, right) =>
      sourceSessionPrepRank(left) - sourceSessionPrepRank(right) ||
      text(left.url).localeCompare(text(right.url))
    )
    const representative = sortedRows[0] || {}
    const urls = uniqueStrings(sortedRows.map(row => row.url))
    const hosts = uniqueStrings(sortedRows.map(row => row.host || hostOf(row.url)))
    const sourceCreators = uniqueStrings(sortedRows.flatMap(row => list(row.sourceCreators)))
    const bestPriority = bestPrepClusterPriority(sortedRows)
    return {
      clusterId: `source-session-prep:${safeKey(clusterKey)}`,
      clusterKey,
      phase: representative.phase,
      status: representative.status,
      bucketId: representative.bucketId,
      host: representative.host || hosts[0] || '',
      label: sourceSessionClusterLabel(representative),
      runner: representative.runner,
      account: representative.account,
      sourceType: representative.sourceType,
      totalRows: sortedRows.length,
      runAllowedNowRows: sortedRows.filter(row => row.runAllowedNow === true).length,
      rowsWithRunAfterSessionCommand: sortedRows.filter(row => Boolean(row.runAfterSessionCommand)).length,
      rawSecretPrintedRows: sortedRows.filter(row => row.rawSecretPrinted === true).length,
      sourceCreators: sourceCreators.slice(0, 8),
      sourceGrades: uniqueSourceGradesForPrepRows(sortedRows),
      topUrls: urls.slice(0, 5),
      sampleRowIds: sortedRows.map(row => row.rowId).filter(Boolean).slice(0, 5),
      devLanePriority: bestPriority,
      plainEnglish: `${sortedRows.length} source-session prep row${sortedRows.length === 1 ? '' : 's'} grouped for ${sourceSessionClusterLabel(representative)}. ${representative.plainEnglish || ''}`.trim(),
    }
  })
  clusters.sort((left, right) =>
    sourceSessionPrepRank(left) - sourceSessionPrepRank(right) ||
    number(right.runAllowedNowRows, 0) - number(left.runAllowedNowRows, 0) ||
    number(right.totalRows, 0) - number(left.totalRows, 0) ||
    text(left.host).localeCompare(text(right.host)) ||
    text(left.clusterKey).localeCompare(text(right.clusterKey))
  )
  return clusters
}

function sourceSessionPrepPreviewClusters(rows = [], limit = 24) {
  const allClusters = buildSourceSessionPrepClusters(rows)
  const selected = []
  const seen = new Set()
  const addCluster = cluster => {
    if (!cluster?.clusterId || seen.has(cluster.clusterId) || selected.length >= limit) return
    selected.push(cluster)
    seen.add(cluster.clusterId)
  }
  for (const phase of SOURCE_SESSION_PHASE_ORDER) {
    for (const cluster of allClusters.filter(item => item.phase === phase).slice(0, 3)) {
      addCluster(cluster)
    }
  }
  for (const cluster of allClusters) addCluster(cluster)
  return selected
}

function sourceSessionActionGroupLabel(phase = '') {
  return {
    free_skool_session_ready: 'Ready free Skool runs',
    free_source_identity_session_needed: 'Free source session setup',
    newsletter_signup_lane_needed: 'Newsletter intake dry runs',
    community_start_url_needed: 'Clean community start URLs',
    community_runner_needed: 'Community runner needed',
    paid_or_auth_packet_needed: 'Paid/auth packet approval',
    free_community_already_read: 'Already read',
  }[phase] || 'Source-session work'
}

function sourceSessionActionGroupNextAction(phase = '') {
  return {
    free_skool_session_ready: 'Run the bounded free-community SOP only for exact rows whose isolated source session is already proven ready.',
    free_source_identity_session_needed: `Create or verify the isolated free-source session for ${SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT}, then run the bounded Skool free-community SOP for exact URLs.`,
    newsletter_signup_lane_needed: 'Run newsletter intake dry-run checks and source-inbox packet review; live external signup still waits for the source-identity signup lane.',
    community_start_url_needed: 'Resolve each row back to a clean public/about community start URL before any community SOP run.',
    community_runner_needed: 'Build or route to a source-specific community runner before claiming these non-Skool communities can be extracted.',
    paid_or_auth_packet_needed: 'Prepare exact paid/auth source packets and session boundaries for Steve review; do not run while this queue is only readback.',
    free_community_already_read: 'No run needed from this queue unless the saved source evidence is stale or incomplete.',
  }[phase] || 'Review this source-session work before any live action.'
}

function buildSourceSessionActionGroups(rows = [], limit = 8) {
  const byPhase = new Map()
  for (const row of list(rows)) {
    const phase = text(row.phase || 'unknown')
    if (!phase) continue
    if (!byPhase.has(phase)) byPhase.set(phase, [])
    byPhase.get(phase).push(row)
  }
  const groups = [...byPhase.entries()].map(([phase, phaseRows]) => {
    const sortedRows = list(phaseRows).sort((left, right) =>
      sourceSessionPrepRank(left) - sourceSessionPrepRank(right) ||
      number(right.devLanePriority?.sourceScore, 0) - number(left.devLanePriority?.sourceScore, 0) ||
      text(left.url).localeCompare(text(right.url))
    )
    const clusters = new Set(sortedRows.map(sourceSessionClusterKey).filter(Boolean))
    const hosts = uniqueStrings(sortedRows.map(row => row.host || hostOf(row.url)))
    const urls = uniqueStrings(sortedRows.map(row => row.url))
    const representative = sortedRows[0] || {}
    const readiness = buildSourceSessionActionGroupReadiness({ phase, rows: sortedRows })
    return {
      groupId: `source-session-action:${safeKey(phase)}`,
      phase,
      status: representative.status,
      label: sourceSessionActionGroupLabel(phase),
      runner: representative.runner,
      account: representative.account,
      totalRows: sortedRows.length,
      clusterCount: clusters.size,
      runAllowedNowRows: sortedRows.filter(row => row.runAllowedNow === true).length,
      rowsWithRunAfterSessionCommand: sortedRows.filter(row => Boolean(row.runAfterSessionCommand)).length,
      rawSecretPrintedRows: sortedRows.filter(row => row.rawSecretPrinted === true).length,
      topHosts: hosts.slice(0, 5),
      topUrls: urls.slice(0, 5),
      sourceGrades: uniqueSourceGradesForPrepRows(sortedRows),
      devLanePriority: bestPrepClusterPriority(sortedRows),
      nextAction: sourceSessionActionGroupNextAction(phase),
      readiness,
      plainEnglish: `${sortedRows.length} row${sortedRows.length === 1 ? '' : 's'} across ${clusters.size || 1} source cluster${clusters.size === 1 ? '' : 's'}. ${sourceSessionActionGroupNextAction(phase)}`,
    }
  })
  groups.sort((left, right) =>
    sourceSessionPrepRank(left) - sourceSessionPrepRank(right) ||
    number(right.totalRows, 0) - number(left.totalRows, 0) ||
    text(left.phase).localeCompare(text(right.phase))
  )
  return groups.slice(0, limit)
}

export function buildSourceSessionPrepQueue({ rows = [] } = {}) {
  const prepRows = list(rows)
    .map(row => {
      const prep = sourceSessionPrepPhase(row)
      if (!prep) return null
      const broker = row.sourceSessionBroker || {}
      return {
        rowId: row.rowId,
        bucketId: row.bucketId,
        url: row.url,
        host: row.host,
        label: row.label,
        phase: prep.phase,
        status: prep.status,
        runner: prep.runner,
        account: prep.account,
        sourceType: row.sourceType,
        sourceCreators: list(row.sourceCreators),
        sourceGrades: list(row.sourceGrades).map(source => ({
          creatorId: source.creatorId,
          creator: source.creator,
          devBuildGrade: source.devBuildGrade,
          devBuildScore: source.devBuildScore,
        })),
        sourceSessionBroker: broker.status ? broker : null,
        runAllowedNow: prep.phase === 'free_skool_session_ready' && row.runnable === true && Boolean(row.runCommand),
        runAfterSessionCommand: prep.runAfterSessionCommand,
        boundaryReason: row.boundaryReason || '',
        plainEnglish: prep.plainEnglish,
        devLanePriority: row.devLanePriority || null,
        rawSecretPrinted: broker.rawSecretPrinted === true,
      }
    })
    .filter(Boolean)
    .sort((left, right) =>
      sourceSessionPrepRank(left) - sourceSessionPrepRank(right) ||
      number(right.devLanePriority?.sourceScore, 0) - number(left.devLanePriority?.sourceScore, 0) ||
      text(left.host).localeCompare(text(right.host)) ||
      text(left.url).localeCompare(text(right.url))
    )

  const countWhere = predicate => prepRows.filter(predicate).length
  const counts = {
    totalRows: prepRows.length,
    freeCommunityRows: countWhere(row => row.bucketId === 'free-communities'),
    skoolFreeCommunityRows: countWhere(row => row.bucketId === 'free-communities' && isSkoolOrLocalFixtureHost(hostOf(row.url))),
    nonSkoolCommunityRows: countWhere(row => row.phase === 'community_runner_needed'),
    newsletterSignupRows: countWhere(row => row.bucketId === 'creator-newsletters'),
    paidAuthRows: countWhere(row => row.bucketId === 'paid-auth-gates'),
    rowsWithRunAfterSessionCommand: countWhere(row => Boolean(row.runAfterSessionCommand)),
    runAllowedNowRows: countWhere(row => row.runAllowedNow === true),
    rawSecretPrintedRows: countWhere(row => row.rawSecretPrinted === true),
  }
  const previewRows = sourceSessionPrepPreviewRows(prepRows, 80)
  counts.previewRows = previewRows.length
  const allClusters = buildSourceSessionPrepClusters(prepRows)
  const previewClusters = sourceSessionPrepPreviewClusters(prepRows, 24)
  const actionGroups = buildSourceSessionActionGroups(prepRows, 8)
  counts.clusterCount = allClusters.length
  counts.previewClusters = previewClusters.length
  counts.actionGroupCount = actionGroups.length
  counts.readinessCheckCount = actionGroups.reduce((sum, group) => sum + number(group.readiness?.checkCount, 0), 0)
  counts.credentialReadinessCheckCount = actionGroups.reduce((sum, group) => sum + number(group.readiness?.credentialCheckCount, 0), 0)
  const phaseCounts = prepRows.reduce((acc, row) => {
    acc[row.phase] = number(acc[row.phase], 0) + 1
    return acc
  }, {})

  return {
    status: counts.runAllowedNowRows
      ? 'session_ready_rows_available'
      : counts.totalRows
        ? 'waiting_for_source_session_or_approval'
        : 'clear',
    mode: 'source_session_prep_queue',
    defaultAccount: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    counts,
    phaseCounts,
    rows: previewRows,
    rowsArePreview: previewRows.length < prepRows.length,
    clusters: previewClusters,
    clustersArePreview: previewClusters.length < counts.clusterCount,
    actionGroups,
    actionGroupsArePreview: actionGroups.length < Object.keys(phaseCounts).length,
    primaryNextAction: actionGroups[0]?.nextAction || 'No source-session prep work is waiting.',
    plainEnglish: 'Prep only: this shows the exact newsletter, free-community, and paid/auth session work needed next. It does not create accounts, submit forms, crawl paid/private areas, download files, or message anyone.',
    notNext: [
      'no live signup from this readback',
      'no paid/private/auth crawl from this readback',
      'no purchases, downloads, posts, comments, messages, or credential mutation',
    ],
    sideEffects: sideEffects(),
  }
}

function rowsForBucket(bucket = {}) {
  return list(bucket.items).length ? list(bucket.items) : list(bucket.samples)
}

function limitRows(rows = [], rowLimit = DEFAULT_ROW_LIMIT) {
  const normalizedLimit = number(rowLimit, DEFAULT_ROW_LIMIT)
  if (!Number.isFinite(normalizedLimit) || normalizedLimit <= 0) return list(rows)
  return list(rows).slice(0, normalizedLimit)
}

function sideEffects(overrides = {}) {
  return {
    startsProviderCall: false,
    startsBroadCrawler: false,
    startsScoperPromotion: false,
    writesBacklog: false,
    externalWrites: false,
    submittedForm: false,
    downloadedFile: false,
    purchased: false,
    postedOrMessaged: false,
    mutatesCredentials: false,
    normalChromeProfileUsed: false,
    ...overrides,
  }
}

function metadataOf(item = {}) {
  return item.metadata || item.metadata_json || {}
}

function existingRunBrowserChallenge(metadata = {}) {
  for (const blocker of list(metadata.blockers)) {
    const surface = `${blocker.type || ''} ${blocker.reason || ''} ${blocker.detail || ''} ${blocker.nextAction || ''}`
    if (/browser_challenge_not_source_content|cloudflare|checking your browser|just a moment|security verification/i.test(surface)) {
      return {
        check: 'browser_challenge_not_source_content',
        detail: text(blocker.reason || blocker.detail || 'browser challenge/interstitial was saved instead of source content'),
        recovery: text(blocker.nextAction || 'retry clean source-browser session, then route to hosted/browser-agent fallback or source-specific session if the challenge remains'),
      }
    }
  }
  const fallbackPlan = metadata.fallbackPlan || metadata.sourceBrowserAgentPlan?.fallbackPlan || {}
  if (text(fallbackPlan.trigger) === 'browser_challenge_not_source_content' || /browser_challenge/i.test(text(fallbackPlan.status))) {
    return {
      check: 'browser_challenge_not_source_content',
      detail: text(fallbackPlan.reason || 'browser challenge/interstitial was saved instead of source content'),
      recovery: text(fallbackPlan.nextAction || 'retry clean source-browser session, then route to hosted/browser-agent fallback or source-specific session if the challenge remains'),
    }
  }
  const summaries = list(metadata.pageSummaries)
  if (!summaries.length) return null
  for (const summary of summaries) {
    const health = evaluateSourceBrowserPageHealth({
      url: summary.url || metadata.url || metadata.exactUrl,
      title: summary.title,
      bodyTextPreview: [
        summary.bodyTextPreview,
        summary.textPreview,
        ...list(summary.headings).map(heading => heading.text),
      ].filter(Boolean).join(' '),
      textChars: number(summary.textChars, 0),
    })
    const challenge = list(health.findings).find(finding => finding.check === 'browser_challenge_not_source_content')
    if (challenge) return challenge
  }
  return null
}

function buildExistingRunLookup(runItems = []) {
  const byRowId = new Map()
  const byUrl = new Map()
  const byCanonicalUrl = new Map()
  const items = [...list(runItems)].sort((left, right) => {
    const leftTime = Date.parse(text(left.processedAt || left.processed_at || left.updatedAt || left.updated_at || left.createdAt || left.created_at))
    const rightTime = Date.parse(text(right.processedAt || right.processed_at || right.updatedAt || right.updated_at || right.createdAt || right.created_at))
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0)
  })
  for (const item of items) {
    const metadata = metadataOf(item)
    const rowId = text(metadata.rowId)
    const url = text(metadata.url || metadata.exactUrl)
    const canonicalUrl = sourceHandoffDedupeKey(url)
    const rowIdAliases = [
      rowId,
      text(metadata.sourceBrowserAgentPlan?.sourceId),
      rowId && url && rowId.endsWith(`:${url}`) ? rowId.slice(0, -(`:${url}`).length) : '',
    ].filter(Boolean)
    for (const alias of rowIdAliases) {
      if (!byRowId.has(alias)) byRowId.set(alias, item)
    }
    if (url && !byUrl.has(url)) byUrl.set(url, item)
    if (canonicalUrl && !byCanonicalUrl.has(canonicalUrl)) byCanonicalUrl.set(canonicalUrl, item)
  }
  return { byRowId, byUrl, byCanonicalUrl }
}

function compactExistingRunSourceStack(update = {}) {
  if (!update || typeof update !== 'object') return null
  return {
    sourceId: text(update.sourceId),
    creatorId: text(update.creatorId),
    creatorName: text(update.creatorName),
    sourceFamily: text(update.sourceFamily),
    sourceType: text(update.sourceType),
    status: text(update.status),
    terminalState: text(update.terminalState),
    toolRoute: text(update.toolRoute),
    surfaces: update.surfaces || {},
    counts: update.counts || {},
    devBuildGrade: text(update.devBuildGrade),
    devBuildScore: number(update.devBuildScore, 0),
    nextAction: text(update.nextAction),
  }
}

function safeEvidenceArtifactRef(value = '') {
  const raw = text(value)
  if (!raw) return ''
  if (/^(\/|~\/|\.\.?\/)/.test(raw) || raw.includes('/tmp/') || raw.includes('.openclaw/')) return 'local_artifact_ref_hidden'
  return raw
}

function existingRunEvidenceReadback(existingRun = {}, metadata = {}) {
  const agentPlan = metadata.sourceBrowserAgentPlan || {}
  const sourceStackUpdate = compactExistingRunSourceStack(metadata.sourceStackUpdate)
  return {
    itemKey: text(existingRun.itemKey || existingRun.item_key),
    artifactRef: safeEvidenceArtifactRef(existingRun.artifactId || existingRun.artifact_id || metadata.artifactId),
    status: text(existingRun.status || existingRun.status_code || metadata.status),
    runtimeStatus: text(metadata.status),
    runner: text(metadata.runner || agentPlan.toolRoute),
    processedAt: text(existingRun.processedAt || existingRun.processed_at),
    pagesRead: number(metadata.pagesRead, 0),
    freeResourceCaptures: list(metadata.freeResourceCaptures).length,
    fileResourceCandidates: list(metadata.fileResourceCandidates).length,
    blockers: list(metadata.blockers).length,
    newsletterCandidates: number(metadata.newsletterCandidates, 0),
    paidGateEvaluations: number(metadata.paidGateEvaluations, 0),
    valueScore: metadata.valueScore || null,
    sourceStackUpdate,
    sourceBrowserAgent: agentPlan ? {
      route: text(agentPlan.toolRoute),
      status: text(agentPlan.status),
      terminalState: text(agentPlan.terminalState),
      stopReason: text(agentPlan.stopReason),
    } : null,
    sideEffects: {
      externalWrites: metadata.sideEffects?.externalWrites === true,
      writesBacklog: metadata.sideEffects?.writesBacklog === true,
      submittedForm: metadata.sideEffects?.submittedForm === true,
      downloadedFile: metadata.sideEffects?.downloadedFile === true,
      purchased: metadata.sideEffects?.purchased === true,
      postedOrMessaged: metadata.sideEffects?.postedOrMessaged === true,
      mutatesCredentials: metadata.sideEffects?.mutatesCredentials === true,
      normalChromeProfileUsed: metadata.sideEffects?.normalChromeProfileUsed === true,
    },
  }
}

function attachExistingRun(row = {}, existingRunLookup = {}) {
  const existingRun = existingRunLookup.byRowId?.get(row.rowId) ||
    existingRunLookup.byUrl?.get(row.url) ||
    existingRunLookup.byCanonicalUrl?.get(row.sourceHandoffDedupeKey || sourceHandoffDedupeKey(row.url)) ||
    null
  if (!existingRun) return row
  const metadata = metadataOf(existingRun)
  const existingRunEvidence = existingRunEvidenceReadback(existingRun, metadata)
  const existingStatus = text(existingRun.status || metadata.status)
  const runtimeStatus = text(metadata.status)
  const existingRunner = text(metadata.runner)
  const browserChallenge = existingRunBrowserChallenge(metadata)
  const safeSideEffects = metadata.sideEffects || {}
  const unsafeSideEffectDetected = safeSideEffects.externalWrites === true ||
    safeSideEffects.writesBacklog === true ||
    safeSideEffects.submittedForm === true ||
    safeSideEffects.downloadedFile === true ||
    safeSideEffects.purchased === true ||
    safeSideEffects.postedOrMessaged === true ||
    safeSideEffects.mutatesCredentials === true ||
    safeSideEffects.normalChromeProfileUsed === true
  const retryableReadRepair = existingStatus === 'failed' &&
    runtimeStatus === 'source_god_mode_runtime_needs_repair' &&
    number(metadata.pagesRead, 0) > 0 &&
    number(metadata.sourceHandoffReadbackVersion, 0) < SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_VERSION &&
    !unsafeSideEffectDetected
  const repoDeepReviewUpgradeNeeded = existingStatus === 'succeeded' &&
    row.bucketId === 'public-code-repos' &&
    row.runner === 'repo:deep-review' &&
    !unsafeSideEffectDetected &&
    (
      existingRunner !== row.runner ||
      (!metadata.repoReviewPacket && !list(metadata.implementationPatterns).length)
    )
  const hostedFallbackRequired = existingStatus === 'failed' &&
    browserChallenge &&
    text(metadata.sourceBrowserAgentExecutionVersion) &&
    text(metadata.sourceBrowserAgentPlan?.terminalState) === 'failed_closed' &&
    text(metadata.sourceBrowserAgentPlan?.stopReason) === 'browser_state_blocked' &&
    !unsafeSideEffectDetected
  if (repoDeepReviewUpgradeNeeded) {
    return {
      ...row,
      status: 'repo_deep_review_upgrade_needed',
      runnable: row.runnable === true,
      parked: false,
      runCommand: row.runnable === true ? row.runCommand : '',
      existingRunItemKey: existingRun.itemKey || existingRun.item_key || '',
      existingRunArtifactId: existingRun.artifactId || existingRun.artifact_id || metadata.artifactId || '',
      existingRunStatus: existingStatus,
      existingRunRuntimeStatus: runtimeStatus,
      existingRunRunner: existingRunner,
      existingRunEvidence,
      existingRunProcessedAt: existingRun.processedAt || existingRun.processed_at || '',
      previousRunPagesRead: number(metadata.pagesRead, 0),
      plainEnglish: `${row.label} has older generic source-browser evidence, but it has not been upgraded through repo:deep-review for README/docs/examples/license and implementation-pattern extraction.`,
    }
  }
  if (existingStatus === 'succeeded' && browserChallenge) {
    return {
      ...row,
      status: 'previous_source_run_browser_challenge_needs_fallback',
      runnable: false,
      parked: true,
      runCommand: '',
      existingRunItemKey: existingRun.itemKey || existingRun.item_key || '',
      existingRunArtifactId: existingRun.artifactId || existingRun.artifact_id || metadata.artifactId || '',
      existingRunStatus: existingStatus,
      existingRunRuntimeStatus: runtimeStatus,
      existingRunRunner: existingRunner,
      existingRunEvidence,
      existingRunProcessedAt: existingRun.processedAt || existingRun.processed_at || '',
      existingRunLastError: 'browser_challenge_not_source_content',
      previousRunPagesRead: number(metadata.pagesRead, 0),
      previousRunBlockers: [
        {
          type: 'browser_challenge_not_source_content',
          reason: browserChallenge.detail || 'browser challenge/interstitial was saved instead of source content',
          nextAction: browserChallenge.recovery || 'retry with a clean source-browser session or route to the source-specific browser fallback',
        },
      ],
      plainEnglish: `${row.label} saved a browser challenge/interstitial page, not real source content. Park it for source-browser fallback or source-specific session repair instead of counting it as extracted evidence.`,
    }
  }
  if (hostedFallbackRequired) {
    return {
      ...row,
      status: 'previous_clean_retry_hosted_fallback_required',
      runnable: false,
      parked: true,
      runCommand: '',
      existingRunItemKey: existingRun.itemKey || existingRun.item_key || '',
      existingRunArtifactId: existingRun.artifactId || existingRun.artifact_id || metadata.artifactId || '',
      existingRunStatus: existingStatus,
      existingRunRuntimeStatus: runtimeStatus,
      existingRunRunner: existingRunner,
      existingRunEvidence,
      existingRunProcessedAt: existingRun.processedAt || existingRun.processed_at || '',
      existingRunLastError: 'hosted_browser_fallback_required_after_clean_retry',
      previousRunPagesRead: number(metadata.pagesRead, 0),
      previousRunBlockers: [
        {
          type: 'browser_challenge_not_source_content',
          reason: browserChallenge.detail || 'clean isolated retry still saw a browser challenge/interstitial',
          nextAction: browserChallenge.recovery || 'route to approved hosted/browser-agent fallback or operator escalation; do not retry the same clean local path again',
        },
      ],
      plainEnglish: `${row.label} already had the clean isolated fallback retry and still could not prove real source content. Keep it parked for approved hosted/browser fallback or operator escalation instead of reselecting the same retry.`,
    }
  }
  if (existingStatus && existingStatus !== 'succeeded') {
    return {
      ...row,
      status: retryableReadRepair
        ? 'retry_previous_source_read_action_blocker'
        : 'previous_source_run_failed_needs_review',
      runnable: retryableReadRepair ? row.runnable === true : false,
      parked: retryableReadRepair ? row.parked === true : true,
      runCommand: retryableReadRepair ? row.runCommand : '',
      existingRunItemKey: existingRun.itemKey || existingRun.item_key || '',
      existingRunArtifactId: existingRun.artifactId || existingRun.artifact_id || metadata.artifactId || '',
      existingRunStatus: existingStatus,
      existingRunRuntimeStatus: runtimeStatus,
      existingRunEvidence,
      existingRunProcessedAt: existingRun.processedAt || existingRun.processed_at || '',
      existingRunLastError: existingRun.lastError || existingRun.last_error || '',
      previousRunPagesRead: number(metadata.pagesRead, 0),
      previousRunBlockers: list(metadata.blockers).slice(0, 8),
      plainEnglish: retryableReadRepair
        ? `${row.label} had a prior safe read classified as repair-needed. Rerun after source-runtime read/action-blocker fixes before claiming evidence is complete.`
        : `${row.label} had a prior source-browser run failure. Park for repair review instead of hiding it as completed evidence.`,
    }
  }
  return {
    ...row,
    status: 'already_run_source_evidence_saved',
    runnable: false,
    parked: false,
    runCommand: '',
    existingRunItemKey: existingRun.itemKey || existingRun.item_key || '',
    existingRunArtifactId: existingRun.artifactId || existingRun.artifact_id || metadata.artifactId || '',
    existingRunStatus: existingRun.status || metadata.status || '',
    existingRunEvidence,
    existingRunProcessedAt: existingRun.processedAt || existingRun.processed_at || '',
    plainEnglish: `${row.label} already has source-browser evidence saved for this exact URL.`,
  }
}

function buildRunCommand(row = {}) {
  if (row.runnable !== true) return ''
  if (row.runner === 'skool:free-god-mode') {
    return `npm run skool:free-god-mode -- --url=${row.url}`
  }
  if (row.runner === 'repo:deep-review') {
    return `npm run repo:deep-review -- --url=${row.url} --maxPages=${row.maxPages} --maxDepth=${row.maxDepth}`
  }
  if (row.runner === 'source:god-mode') {
    return `npm run source:god-mode -- --url=${row.url} --sourceType=${row.sourceType} --maxPages=${row.maxPages} --maxDepth=${row.maxDepth}`
  }
  return ''
}

function summarizeSourceSessionBrokerDecision(decision = {}) {
  const authEvent = decision.authEvent
  return {
    ok: decision.ok === true,
    status: text(decision.status),
    reason: text(decision.reason),
    nextAction: text(decision.nextAction),
    sourceFamily: text(decision.sourceFamily),
    source: text(decision.source),
    account: text(decision.account),
    standingApproval: decision.standingApproval === true,
    sourceBoundaryApproved: decision.sourceBoundaryApproved === true,
    secretRef: text(decision.secretRef),
    rawSecretPrinted: decision.rawSecretPrinted === true,
    externalWriteStarted: decision.externalWriteStarted === true,
    purchaseStarted: decision.purchaseStarted === true,
    credentialMutated: decision.credentialMutated === true,
    authEvent: authEvent ? {
      eventType: text(authEvent.eventType),
      sourceSystem: text(authEvent.sourceSystem),
      accountLabel: text(authEvent.accountLabel),
      blocker: text(authEvent.blocker),
      actionNeeded: text(authEvent.actionNeeded),
      credentialRef: text(authEvent.credentialRef),
    } : null,
  }
}

function buildFreeCommunitySessionBrokerDecision(row = {}) {
  const sessionReady = row.freeCommunitySessionBrokerReady === true
  const decision = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'skool_free_community',
    source: row.host || 'skool-free-community',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    action: sessionReady ? 'read_allowed_free_posts' : 'free_join_when_allowed',
    persistentProfilePresent: sessionReady,
    sessionHealthy: sessionReady,
    requiresAccountCreation: !sessionReady,
  })
  return summarizeSourceSessionBrokerDecision(decision)
}

function queueUrlBoundary(row = {}) {
  const host = hostOf(row.url)
  if (row.bucketId === 'public-code-repos' && !isPublicRepoDeepReviewHost(host)) {
    return {
      runnable: false,
      parked: true,
      status: 'blocked_not_public_repo_deep_review_host',
      reason: 'This link was discovered in the code/repo bucket, but it is not a supported public repo host. Route it through public-web, product/tool review, or a source-specific lane instead of repo:deep-review.',
    }
  }
  if (row.bucketId === 'public-code-repos' && !isPublicRepoDeepReviewUrl(row.url)) {
    return {
      runnable: false,
      parked: true,
      status: 'blocked_not_public_repo_deep_review_url',
      reason: 'This link was discovered in the code/repo bucket, but it is not an exact public repo or repo file URL. Route host roots/search pages through public-web or review instead of repo:deep-review.',
    }
  }
  if (SHORT_LINK_HOSTS.has(host)) {
    return {
      runnable: false,
      parked: true,
      status: 'blocked_short_link_expansion_needed',
      reason: 'Short links hide the final destination. Resolve through a safe resolver before source-browser extraction.',
    }
  }
  if (row.bucketId === 'public-web-resources' && SOCIAL_PROFILE_HOSTS.has(host)) {
    return {
      runnable: false,
      parked: true,
      status: 'blocked_social_profile_lane_needed',
      reason: 'Social/profile pages need a social-source lane with login, rate, and profile boundaries instead of the generic public-web reader.',
    }
  }
  if (row.bucketId === 'public-web-resources' && (/^link\./i.test(host) || host.endsWith('.link'))) {
    return {
      runnable: false,
      parked: true,
      status: 'blocked_link_bridge_resolution_needed',
      reason: 'Creator link bridge pages should be resolved and classified before generic public-web extraction.',
    }
  }
  if (row.bucketId === 'public-web-resources') {
    const url = parsedUrl(row.url)
    const shallowPath = !url || url.pathname === '/' || url.pathname === ''
    const hasAffiliateOrTrackingSurface = AFFILIATE_OR_TRACKING_PARAM_RE.test(row.url) ||
      list(row.originalUrls).some(originalUrl => AFFILIATE_OR_TRACKING_PARAM_RE.test(originalUrl))
    if (shallowPath && hasAffiliateOrTrackingSurface) {
      return {
        runnable: false,
        parked: true,
        status: 'blocked_product_or_affiliate_tracking_surface',
        reason: 'Affiliate/tracking homepages are product/tool candidates. Route to value review before generic source extraction.',
      }
    }
  }
  if (row.bucketId === 'free-communities' && PUBLIC_WEB_FORM_OR_AUTH_RE.test(row.url)) {
    return {
      runnable: false,
      parked: true,
      status: 'blocked_free_community_form_auth_or_action_surface',
      reason: 'Free-community row points at signup/login/join/action surface. Start from the community public/about page or route through the session broker.',
    }
  }
  if (row.bucketId === 'free-communities' && !isSkoolOrLocalFixtureHost(host) && DIRECT_COMMUNITY_INVITE_HOSTS.has(host)) {
    return {
      runnable: false,
      parked: true,
      status: 'blocked_non_skool_community_bridge',
      reason: 'This is a direct non-Skool community invite/action surface. It needs a source-specific community runner or a clean public landing page before extraction.',
    }
  }
  if (row.bucketId === 'free-communities' && !isSkoolOrLocalFixtureHost(host)) {
    return {
      runnable: true,
      parked: false,
      status: 'ready_for_public_community_bridge_read',
      runner: 'source:god-mode',
      sourceType: 'public_community_bridge',
      maxPages: Math.min(number(row.maxPages, 3) || 3, 3),
      maxDepth: Math.min(number(row.maxDepth, 1) || 1, 1),
      requiresSessionBroker: false,
      sourceSessionBroker: null,
      allowedActions: [
        'read public community bridge page',
        'resolve visible public/about/resource links as metadata',
        'stop at signup/login/join/invite/payment/download/post/message surfaces',
      ],
      plainEnglish: 'This is not a Skool community, but it is a public bridge page. Run a bounded public read first to find the clean community/about/resources URL; do not claim 20-day community extraction yet.',
    }
  }
  if (row.bucketId === 'free-communities' && row.freeCommunitySessionBrokerReady !== true) {
    return {
      runnable: false,
      parked: true,
      status: 'blocked_free_community_session_broker_required',
      reason: row.sourceSessionBroker?.nextAction || 'Free-community extraction needs the Source Session Broker/source identity before running the 20-day posts, courses, and resources SOP.',
    }
  }
  if (row.bucketId === 'public-web-resources' && PUBLIC_WEB_FORM_OR_AUTH_RE.test(row.url)) {
    return {
      runnable: false,
      parked: true,
      status: 'blocked_form_auth_booking_or_download_surface',
      reason: 'Public-web row points at signup/login/booking/download/action surface. Route to approval/action-specific lane instead of auto-running.',
    }
  }
  return {
    runnable: row.runnable,
    parked: row.parked,
    status: row.status,
    reason: '',
  }
}

function buildQueueRow({
  bucketId = '',
  bucket = {},
  item = {},
  index = 0,
  sourceGradeLookup = {},
  devPriorityGrades = DEV_LANE_PRIORITY_GRADES,
  freeCommunitySessionBrokerReady = false,
} = {}) {
  const config = BUCKET_CONFIG[bucketId] || BUCKET_CONFIG['public-web-resources']
  const rawUrl = text(item.url || item.normalizedUrl || item.href)
  const cleanStartUrl = bucketId === 'free-communities'
    ? cleanPublicCommunityBridgeStartUrl(rawUrl)
    : ''
  const url = cleanStartUrl || rawUrl
  const host = text(hostOf(url) || item.host || hostOf(rawUrl))
  const sourceCreatorIds = uniqueStrings([item.creatorId, ...list(item.sourceCreatorIds)])
  const sourceCreators = uniqueStrings([item.creator, ...list(item.sourceCreators)])
  const sourceGrades = sourceGradeRowsForItem({ ...item, sourceCreatorIds, sourceCreators }, sourceGradeLookup)
  const row = {
    rowId: `youtube-handoff:${bucketId}:${safeKey(url || `${host}-${index + 1}`)}`,
    bucketId,
    label: config.label,
    status: config.status,
    runnable: config.runnable === true && /^https?:\/\//i.test(url),
    parked: config.parked === true || !/^https?:\/\//i.test(url),
    requiresAuth: config.requiresAuth === true,
    sourceSpecific: config.sourceSpecific === true,
    runner: config.runner,
    sourceType: config.sourceType,
    url,
    host,
    creatorId: sourceCreatorIds[0] || '',
    creator: sourceCreators[0] || '',
    sourceCreatorIds,
    sourceCreators,
    sourceGrades,
    sourceVideoId: text(item.sourceVideoId),
    sourceVideoIds: uniqueStrings([item.sourceVideoId, ...list(item.sourceVideoIds)]),
    reportArtifactId: text(item.reportArtifactId),
    reportArtifactIds: uniqueStrings([item.reportArtifactId, ...list(item.reportArtifactIds)]),
    disposition: text(item.disposition),
    dispositions: uniqueStrings([item.disposition, ...list(item.dispositions)]),
    originalUrls: uniqueStrings([rawUrl, item.url, item.normalizedUrl, item.href, ...list(item.originalUrls)]),
    duplicateEvidenceRowCount: number(item.duplicateEvidenceRowCount, 1),
    sourceHandoffDedupeKey: text(item.sourceHandoffDedupeKey || sourceHandoffDedupeKey(url)),
    cleanStartUrl,
    cleanedFromUrl: cleanStartUrl ? rawUrl : '',
    maxPages: number(config.maxPages, 0),
    maxDepth: number(config.maxDepth, 0),
    allowedActions: [...list(config.allowedActions)],
    forbiddenActions: [
      'do not buy or checkout',
      'do not submit forms',
      'do not download unsafe files',
      'do not post, comment, or message',
      'do not mutate account, profile, or credentials',
      'do not auto-promote to Scoper',
    ],
    evidenceSource: 'youtube_full_watch_handoff_evidence',
    runCommand: '',
    plainEnglish: '',
    freeCommunitySessionBrokerReady: bucketId === 'free-communities'
      ? freeCommunitySessionBrokerReady === true
      : undefined,
    requiresSessionBroker: bucketId === 'free-communities' || config.runner === 'source-session-broker',
  }
  if (bucketId === 'free-communities') {
    row.sourceSessionBroker = buildFreeCommunitySessionBrokerDecision(row)
  }
  row.devLanePriority = buildDevLanePriority(row, sourceGrades, devPriorityGrades)
  const boundary = queueUrlBoundary(row)
  if (boundary.runner) row.runner = boundary.runner
  if (boundary.sourceType) row.sourceType = boundary.sourceType
  if (boundary.maxPages != null) row.maxPages = boundary.maxPages
  if (boundary.maxDepth != null) row.maxDepth = boundary.maxDepth
  if (Object.prototype.hasOwnProperty.call(boundary, 'requiresSessionBroker')) row.requiresSessionBroker = boundary.requiresSessionBroker
  if (Object.prototype.hasOwnProperty.call(boundary, 'sourceSessionBroker')) row.sourceSessionBroker = boundary.sourceSessionBroker
  if (boundary.allowedActions) row.allowedActions = [...boundary.allowedActions]
  row.runnable = boundary.runnable
  row.parked = boundary.parked
  row.status = boundary.status
  if (boundary.reason) {
    row.boundaryReason = boundary.reason
    row.allowedActions = row.allowedActions.filter(action => !/follow|submit|download|signup|sign/i.test(action))
  }
  row.runCommand = buildRunCommand(row)
  row.plainEnglish = row.runnable
    ? row.cleanedFromUrl
      ? `${row.label} was discovered as a signup/action URL, but the safe run starts from the clean public community URL ${row.url}. Do not submit forms, join, log in, post, message, download, or claim community extraction from this bridge read.`
      : boundary.plainEnglish || `${row.label} from watched-video evidence is ready for ${row.runner} with source type ${row.sourceType}.`
    : boundary.reason || `${row.label} from watched-video evidence is parked until the required approval/session/value decision exists.`
  return row
}

export function buildSourceGodModeYoutubeHandoffQueue({
  handoffEvidence = {},
  generatedAt = new Date().toISOString(),
  rowLimit = DEFAULT_ROW_LIMIT,
  sourceValueGrader = {},
  devPriorityGrades = DEV_LANE_PRIORITY_GRADES,
  runItems = [],
  freeCommunitySessionBrokerReady = false,
} = {}) {
  const rows = []
  const bucketCounts = {}
  const buckets = handoffEvidence.buckets || {}
  const sourceGradeLookup = buildSourceGradeLookup(sourceValueGrader)
  const existingRunLookup = buildExistingRunLookup(runItems)
  for (const [bucketId, config] of Object.entries(BUCKET_CONFIG)) {
    const bucket = buckets[bucketId] || {}
    const rawBucketRows = rowsForBucket(bucket)
    const allBucketRows = dedupeSourceHandoffRows(rawBucketRows)
    const sourceRows = limitRows(allBucketRows, rowLimit)
    bucketCounts[bucketId] = {
      label: config.label,
      count: number(bucket.count, rawBucketRows.length),
      rawRows: rawBucketRows.length,
      queuedRows: sourceRows.length,
      duplicateRows: Math.max(0, rawBucketRows.length - allBucketRows.length),
      hasMore: allBucketRows.length > sourceRows.length || number(bucket.count, rawBucketRows.length) > rawBucketRows.length,
      runnable: config.runnable === true,
      status: config.status,
    }
    for (const [index, item] of sourceRows.entries()) {
      const row = buildQueueRow({
        bucketId,
        bucket,
        item,
        index,
        sourceGradeLookup,
        devPriorityGrades,
        freeCommunitySessionBrokerReady,
      })
      rows.push(attachExistingRun(row, existingRunLookup))
    }
  }

  const alreadyRunRows = rows.filter(row => row.status === 'already_run_source_evidence_saved')
  const runnableRows = rows.filter(row => row.runnable)
  const parkedRows = rows.filter(row => !row.runnable && row.status !== 'already_run_source_evidence_saved')
  const browserChallengeFallbackRows = rows.filter(row => row.status === 'previous_source_run_browser_challenge_needs_fallback')
  for (const [bucketId, bucket] of Object.entries(bucketCounts)) {
    const config = BUCKET_CONFIG[bucketId] || {}
    const bucketRows = rows.filter(row => row.bucketId === bucketId)
    const bucketRunnableRows = bucketRows.filter(row => row.runnable)
    const bucketAlreadyRunRows = bucketRows.filter(row => row.status === 'already_run_source_evidence_saved')
    const bucketParkedRows = bucketRows.filter(row => !row.runnable && row.status !== 'already_run_source_evidence_saved')
    const bucketBrowserChallengeFallbackRows = bucketRows.filter(row => row.status === 'previous_source_run_browser_challenge_needs_fallback')
    bucketCounts[bucketId] = {
      ...bucket,
      runnable: bucketRunnableRows.length > 0,
      status: bucketRuntimeStatus({ config, rows: bucketRows }),
      runnableRows: bucketRunnableRows.length,
      parkedRows: bucketParkedRows.length,
      alreadyRunRows: bucketAlreadyRunRows.length,
      browserChallengeFallbackRows: bucketBrowserChallengeFallbackRows.length,
      rowsWithRunCommand: bucketRows.filter(row => row.runCommand).length,
    }
  }
  const evidenceRows = Object.values(bucketCounts)
    .reduce((total, bucket) => total + number(bucket.count, 0), 0)
  return {
    status: rows.length ? 'ready' : 'empty',
    cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
    generatedAt,
    sourceRoute: handoffEvidence.sourceRoute || 'youtubeSourceIntelligence.handoffEvidence',
    scannedReportCount: number(handoffEvidence.scannedReportCount, 0),
    rowLimit: number(rowLimit, DEFAULT_ROW_LIMIT),
    bucketCounts,
    rows,
    counts: {
      evidenceRows,
      queuedRows: rows.length,
      totalRows: rows.length,
      duplicateRows: Object.values(bucketCounts).reduce((total, bucket) => total + number(bucket.duplicateRows, 0), 0),
      runnableRows: runnableRows.length,
      parkedRows: parkedRows.length,
      alreadyRunRows: alreadyRunRows.length,
      browserChallengeFallbackRows: browserChallengeFallbackRows.length,
      publicFreeRuntimeRows: runnableRows.filter(row => row.runner === 'source:god-mode').length,
      publicRepoDeepReviewRows: runnableRows.filter(row => row.runner === 'repo:deep-review').length,
      freeCommunityRows: runnableRows.filter(row => row.runner === 'skool:free-god-mode').length,
      paidOrAuthParkedRows: parkedRows.filter(row => row.requiresAuth).length,
      rowsWithRunCommand: rows.filter(row => row.runCommand).length,
    },
    sourceSessionPrepQueue: buildSourceSessionPrepQueue({ rows }),
    devLanePriorityPreview: buildDevLaneHandoffPriorityPreview({ rows }, { devPriorityGrades }),
    browserChallengeFallbackReview: buildBrowserChallengeFallbackReview({ rows }),
    notNext: [
      'no Scoper promotion from this queue',
      'no purchases, downloads, posts, comments, messages, or form submits',
      'no paid/private/auth extraction without Source Session Broker packet',
    ],
    sideEffects: sideEffects(),
  }
}

export function buildDevLaneHandoffPriorityPreview(queue = {}, { devPriorityGrades = DEV_LANE_PRIORITY_GRADES } = {}) {
  const rows = list(queue.rows)
  const reviewRows = rows.filter(row => row.devLanePriority?.status === 'review_no_creator_grade')
  const prioritizedRows = rows
    .filter(row => row.devLanePriority?.status === 'prioritized_by_dev_source_grade')
    .sort((left, right) =>
      number(left.devLanePriority?.priorityRank, 99) - number(right.devLanePriority?.priorityRank, 99) ||
      number(right.devLanePriority?.sourceScore, 0) - number(left.devLanePriority?.sourceScore, 0) ||
      text(left.host).localeCompare(text(right.host))
    )
  const gradeBuckets = {}
  for (const row of rows) {
    const grade = text(row.devLanePriority?.bestDevBuildGrade || 'ungraded').toUpperCase() || 'ungraded'
    gradeBuckets[grade] = number(gradeBuckets[grade], 0) + 1
  }
  const topRows = prioritizedRows.slice(0, 12).map(row => ({
    rowId: row.rowId,
    bucketId: row.bucketId,
    url: row.url,
    host: row.host,
    runnable: row.runnable,
    priorityBand: row.devLanePriority?.priorityBand,
    priorityLabel: row.devLanePriority?.priorityLabel,
    bestDevBuildGrade: row.devLanePriority?.bestDevBuildGrade,
    sourceCreators: row.sourceCreators,
    sourceGrades: list(row.sourceGrades).map(source => ({
      creatorId: source.creatorId,
      creator: source.creator,
      devBuildGrade: source.devBuildGrade,
      devWatchRecommendation: source.devWatchRecommendation,
    })),
    reason: row.devLanePriority?.reason || '',
  }))
  return {
    status: 'priority_preview',
    mode: 'dev_lane_source_priority_preview',
    priorityGrades: list(devPriorityGrades).map(grade => text(grade).toUpperCase()).filter(Boolean),
    totalRows: rows.length,
    prioritizedRows: prioritizedRows.length,
    reviewRows: reviewRows.length,
    runnableRows: rows.filter(row => row.runnable).length,
    gradeBuckets,
    topRows,
    sideEffects: sideEffects(),
    plainEnglish: 'Priority only: YouTube-discovered links stay in Foundation evidence. Dev follow-up should work S/A source links first, then B, then C/D or ungraded rows after higher-signal work.',
  }
}

function buildBrowserChallengeFallbackReview({ rows = [] } = {}) {
  const challengeRows = list(rows)
    .filter(row => row.status === 'previous_source_run_browser_challenge_needs_fallback')
  const bucketCounts = {}
  const hostCounts = {}
  const fallbackRouteCounts = {}
  let sourceSessionRequiredRows = 0
  for (const row of challengeRows) {
    const bucketId = text(row.bucketId || 'unknown')
    const host = text(row.host || hostOf(row.url) || 'unknown')
    bucketCounts[bucketId] = number(bucketCounts[bucketId], 0) + 1
    hostCounts[host] = number(hostCounts[host], 0) + 1
    const blocker = list(row.previousRunBlockers).find(item => item.type === 'browser_challenge_not_source_content') || {}
    const fallbackPlan = buildBrowserChallengeFallbackPlanForRow(row, blocker)
    const route = text(fallbackPlan.route || 'unknown')
    fallbackRouteCounts[route] = number(fallbackRouteCounts[route], 0) + 1
    if (fallbackPlan.sourceSessionRequired === true) sourceSessionRequiredRows += 1
  }
  const topHosts = Object.entries(hostCounts)
    .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0) || text(left[0]).localeCompare(text(right[0])))
    .slice(0, 12)
    .map(([host, count]) => ({ host, count }))
  const preparedRows = [...challengeRows]
    .sort((left, right) =>
      number(left.devLanePriority?.priorityRank, 99) - number(right.devLanePriority?.priorityRank, 99) ||
      gradeRankValue(right.devLanePriority?.bestDevBuildGrade) - gradeRankValue(left.devLanePriority?.bestDevBuildGrade) ||
      text(left.host || left.url).localeCompare(text(right.host || right.url))
    )
    .map(buildBrowserChallengeFallbackReviewRow)
  const reviewRows = preparedRows.slice(0, 12)
  return {
    status: challengeRows.length ? 'needs_source_browser_fallback' : 'clear',
    totalRows: challengeRows.length,
    bucketCounts,
    fallbackRouteCounts,
    sourceSessionRequiredRows,
    topHosts,
    rows: reviewRows,
    retryBatch: buildBrowserChallengeFallbackRetryBatch(preparedRows),
    sideEffects: sideEffects(),
    plainEnglish: challengeRows.length
      ? `${challengeRows.length} saved source-browser run(s) hit browser challenge or interstitial pages. They are parked for fallback and are not counted as completed source evidence.`
      : 'No saved source-browser challenge/interstitial rows are waiting for fallback.',
    nextAction: challengeRows.length
      ? 'Prioritize high-value hosts through a clean isolated browser session, source-specific runner, or source-session broker. Do not count these rows as extracted until real source content is read.'
      : 'No browser fallback action is needed right now.',
  }
}

function buildBrowserChallengeFallbackReviewRow(row = {}) {
  const blocker = list(row.previousRunBlockers).find(item => item.type === 'browser_challenge_not_source_content') || {}
  const fallbackPlan = buildBrowserChallengeFallbackPlanForRow(row, blocker)
  const fallbackRetryPacket = buildSourceBrowserFallbackRetryPacket({
    row: {
      ...row,
      fallbackPlan,
    },
    fallbackPlan,
  })
  return {
    rowId: row.rowId,
    bucketId: row.bucketId,
    label: row.label,
    url: row.url,
    host: row.host,
    sourceType: row.sourceType,
    status: row.status,
    runnable: false,
    parked: true,
    existingRunArtifactId: row.existingRunArtifactId || '',
    existingRunProcessedAt: row.existingRunProcessedAt || '',
    previousRunPagesRead: number(row.previousRunPagesRead, 0),
    reason: blocker.reason || 'saved source-browser run saw a browser challenge/interstitial instead of source content',
    nextAction: fallbackPlan.nextAction || blocker.nextAction || 'retry with a clean source-browser session or route to the source-specific browser fallback',
    fallbackPlan,
    fallbackRetryPacket,
    sourceCreators: list(row.sourceCreators).slice(0, 4),
    sourceGrades: list(row.sourceGrades).slice(0, 4).map(source => ({
      creatorId: source.creatorId,
      creator: source.creator,
      devBuildGrade: source.devBuildGrade,
    })),
    devLanePriority: row.devLanePriority ? {
      priorityBand: row.devLanePriority.priorityBand,
      priorityLabel: row.devLanePriority.priorityLabel,
      bestDevBuildGrade: row.devLanePriority.bestDevBuildGrade,
    } : null,
  }
}

function selectBrowserChallengeFallbackBatchRows(rows = [], { maxRuns = 10, hostLimit = 1 } = {}) {
  const limit = Math.max(1, Math.min(20, number(maxRuns, 10)))
  const perHostLimit = Math.max(1, Math.min(5, number(hostLimit, 1)))
  const selected = []
  const selectedKeys = new Set()
  const hostCounts = {}
  for (const row of list(rows)) {
    const key = text(row.rowId || row.url)
    const host = text(row.host || hostOf(row.url) || 'unknown')
    if (!key || selectedKeys.has(key)) continue
    if (number(hostCounts[host], 0) >= perHostLimit) continue
    selected.push(row)
    selectedKeys.add(key)
    hostCounts[host] = number(hostCounts[host], 0) + 1
    if (selected.length >= limit) return selected
  }
  for (const row of list(rows)) {
    const key = text(row.rowId || row.url)
    if (!key || selectedKeys.has(key)) continue
    selected.push(row)
    selectedKeys.add(key)
    if (selected.length >= limit) return selected
  }
  return selected
}

function buildBrowserChallengeFallbackRetryBatch(rows = [], { maxRuns = 10, hostLimit = 1 } = {}) {
  const preparedRows = list(rows)
  const cleanRetryRows = preparedRows.filter(row => row.fallbackRetryPacket?.cleanRetry?.allowedNow === true)
  const sourceSessionRows = preparedRows.filter(row => row.fallbackRetryPacket?.afterSourceSession?.required === true)
  const selectedRows = selectBrowserChallengeFallbackBatchRows(cleanRetryRows, { maxRuns, hostLimit }).map(row => ({
    rowId: row.rowId,
    bucketId: row.bucketId,
    label: row.label,
    url: row.url,
    host: row.host,
    sourceType: row.sourceType,
    sourceFamily: row.fallbackRetryPacket?.sourcePacket?.sourceFamily || '',
    reason: row.reason,
    nextAction: row.nextAction,
    fallbackPlan: row.fallbackPlan,
    command: row.fallbackRetryPacket?.cleanRetry?.command || '',
    args: row.fallbackRetryPacket?.cleanRetry?.args || [],
    maxPages: row.fallbackRetryPacket?.cleanRetry?.maxPages || 4,
    maxDepth: row.fallbackRetryPacket?.cleanRetry?.maxDepth || 1,
    bestDevBuildGrade: row.devLanePriority?.bestDevBuildGrade || '',
    priorityLabel: row.devLanePriority?.priorityLabel || '',
    sourceCreators: list(row.sourceCreators).slice(0, 3),
  }))
  return {
    status: cleanRetryRows.length ? 'ready_for_bounded_clean_retry' : preparedRows.length ? 'waiting_for_source_session_or_hosted_fallback' : 'clear',
    mode: 'dry_run_first_bounded_batch',
    totalRows: preparedRows.length,
    cleanRetryReadyRows: cleanRetryRows.length,
    sourceSessionRequiredRows: sourceSessionRows.length,
    selectedRows,
    selectedRowCount: selectedRows.length,
    maxRuns: Math.max(1, Math.min(20, number(maxRuns, 10))),
    hostLimit: Math.max(1, Math.min(5, number(hostLimit, 1))),
    sideEffects: sideEffects(),
    plainEnglish: cleanRetryRows.length
      ? `${cleanRetryRows.length} browser-challenge row(s) have a clean isolated retry command. Run only a bounded batch first; rows that still show a challenge stay parked.`
      : preparedRows.length
        ? 'No browser-challenge rows can run a clean retry yet; source-session or hosted fallback proof is still needed.'
        : 'No browser-challenge fallback batch is needed.',
    notNext: [
      'no CAPTCHA solving or bypass',
      'no normal Chrome profile',
      'no login, signup, purchase, download, post, comment, message, credential mutation, or Scoper promotion',
    ],
  }
}

function buildBrowserChallengeFallbackPlanForRow(row = {}, blocker = {}) {
  const plan = planSourceBrowserAgentRun({
    packet: sourceBrowserAgentPacketForHandoffRow(row),
    observation: {
      url: row.url,
      title: 'Just a moment...',
      bodyTextPreview: [
        blocker.reason,
        'Cloudflare browser challenge. Verify you are human. Checking your browser before accessing the source.',
      ].filter(Boolean).join(' '),
      textChars: 96,
    },
    now: text(row.existingRunProcessedAt) || '2026-05-28T00:00:00.000Z',
  })
  const fallbackPlan = plan.fallbackPlan || {}
  return {
    status: text(fallbackPlan.status || 'browser_challenge_fallback_required'),
    trigger: text(fallbackPlan.trigger || 'browser_challenge_not_source_content'),
    route: text(fallbackPlan.route || 'clean_isolated_retry_then_hosted_browser_fallback'),
    sourceSessionRequired: fallbackPlan.sourceSessionRequired === true,
    normalChromeProfileAllowed: fallbackPlan.normalChromeProfileAllowed === true,
    profileMode: text(fallbackPlan.profileMode),
    reason: text(fallbackPlan.reason || blocker.reason || 'browser challenge/interstitial blocked source content'),
    firstStep: text(fallbackPlan.firstStep),
    nextAction: text(fallbackPlan.nextAction || blocker.nextAction),
    recoveryPolicy: fallbackPlan.recoveryPolicy ? {
      mode: text(fallbackPlan.recoveryPolicy.mode),
      maxAutomaticAttempts: number(fallbackPlan.recoveryPolicy.maxAutomaticAttempts, 0),
      automaticSteps: list(fallbackPlan.recoveryPolicy.automaticSteps).slice(0, 6),
      stopBefore: list(fallbackPlan.recoveryPolicy.stopBefore).slice(0, 6),
      humanEscalation: fallbackPlan.recoveryPolicy.humanEscalation ? {
        requiredAfter: text(fallbackPlan.recoveryPolicy.humanEscalation.requiredAfter),
        channel: text(fallbackPlan.recoveryPolicy.humanEscalation.channel),
        messagePurpose: text(fallbackPlan.recoveryPolicy.humanEscalation.messagePurpose),
        sendsMessageNow: fallbackPlan.recoveryPolicy.humanEscalation.sendsMessageNow === true,
      } : null,
    } : null,
    operatorEscalation: plan.operatorEscalation ? {
      status: text(plan.operatorEscalation.status),
      cardId: text(plan.operatorEscalation.cardId),
      finalStatus: text(plan.operatorEscalation.finalStatus),
      sendsMessageNow: plan.operatorEscalation.sendsMessageNow === true,
      notification: plan.operatorEscalation.notification ? {
        primaryChannel: text(plan.operatorEscalation.notification.primaryChannel),
        channels: list(plan.operatorEscalation.notification.channels).slice(0, 4),
        dryRun: plan.operatorEscalation.notification.dryRun === true,
        externalSent: plan.operatorEscalation.notification.externalSent === true,
      } : null,
    } : null,
    toolRoute: text(plan.toolRoute?.toolId),
    terminalState: text(plan.terminalState),
    stopReason: text(plan.stopReason),
    allowedActions: list(fallbackPlan.allowedActions).slice(0, 8),
    forbiddenActions: list(fallbackPlan.forbiddenActions).slice(0, 8),
  }
}

function normalizeSourceRunResult(row = {}, report = {}) {
  return {
    rowId: row.rowId,
    bucketId: row.bucketId,
    runner: row.runner,
    sourceType: row.sourceType,
    url: row.url,
    status: report.status || 'unknown',
    ok: report.ok === true,
    pagesRead: list(report.pages).length,
    handsEvents: list(report.handsEvents).length,
    newsletterCandidates: list(report.newsletterCandidates).length,
    paidGateEvaluations: list(report.paidGateEvaluations).length,
    pageSummaries: list(report.pages).map(page => ({
      url: page.url,
      title: page.title,
      depth: page.depth,
      textChars: page.textChars,
      headings: list(page.headings).slice(0, 6),
      blockers: list(page.pageBlockers),
    })).slice(0, 12),
    freeResourceCaptures: list(report.freeResourceCaptures).slice(0, 40),
    fileResourceCandidates: list(report.fileResourceCandidates).slice(0, 40),
    blockers: list(report.blockers).slice(0, 40),
    valueScore: report.brain?.valueScore || null,
    usefulSignals: list(report.brain?.usefulSignals).slice(0, 20),
    sourceStackUpdate: report.sourceStackUpdate || null,
    sopCompletion: report.sopCompletion || null,
    artifacts: report.artifacts || {},
    sideEffects: report.sideEffects || {},
  }
}

function normalizeSkoolRunResult(row = {}, report = {}) {
  return {
    rowId: row.rowId,
    bucketId: row.bucketId,
    runner: row.runner,
    sourceType: row.sourceType,
    url: row.url,
    status: report.status || 'unknown',
    ok: report.ok === true,
    pagesRead: number(report.counts?.pagesRead, list(report.pages).length),
    handsEvents: number(report.counts?.handsEvents, list(report.handsEvents).length),
    newsletterCandidates: 0,
    paidGateEvaluations: 0,
    sourceStackUpdate: null,
    sopCompletion: report.sopCompletion || null,
    pageSummaries: list(report.pages).map(page => ({
      url: page.url,
      title: page.title,
      textChars: page.textChars,
      headings: list(page.headings).slice(0, 6),
      recentActivityItems: list(page.activityItems).filter(item => item.withinLookback).slice(0, 6),
      safeResourceCandidates: list(page.linkClassifications).filter(link => link.decision === 'safe_external_resource_candidate').slice(0, 10),
      authState: page.authState || null,
    })).slice(0, 12),
    freeResourceCaptures: list(report.pages).flatMap(page => list(page.linkClassifications))
      .filter(link => link.decision === 'safe_external_resource_candidate')
      .slice(0, 40),
    blockers: list(report.pages).flatMap(page => list(page.linkClassifications))
      .filter(link => link.blocker)
      .slice(0, 40),
    valueScore: null,
    usefulSignals: [],
    artifacts: report.artifacts || {},
    sideEffects: report.sideEffects || {},
    authNeeded: report.authNeeded || null,
  }
}

function normalizePublicRepoRunResult(row = {}, report = {}) {
  const packet = buildPublicRepoDeepReviewPacket(report)
  return {
    rowId: row.rowId,
    bucketId: row.bucketId,
    runner: row.runner,
    sourceType: row.sourceType,
    url: row.url,
    status: report.status || 'unknown',
    ok: report.ok === true,
    pagesRead: number(report.pagesRead, list(report.pages).length),
    handsEvents: 0,
    newsletterCandidates: 0,
    paidGateEvaluations: 0,
    sourceStackUpdate: null,
    sopCompletion: {
      sourceFamily: 'public_code_repo',
      readmeSeen: report.sourceCoverage?.readmeSeen === true,
      docsSeen: report.sourceCoverage?.docsSeen === true,
      examplesSeen: report.sourceCoverage?.examplesSeen === true,
      licenseSeen: report.sourceCoverage?.licenseSeen === true,
      implementationPatternCount: packet.implementationPatternCount,
    },
    pageSummaries: list(report.pages).map(page => ({
      url: page.url,
      title: page.title,
      pageKind: page.pageKind,
      installOrCloneWarning: page.installOrCloneWarning === true,
      linkBlockers: list(page.linkClassifications).filter(link => link.shouldFollow === false).slice(0, 10),
    })).slice(0, 12),
    freeResourceCaptures: [],
    blockers: list(report.blockedLinks).slice(0, 40),
    valueScore: null,
    usefulSignals: list(packet.implementationPatterns).map(pattern => ({
      type: 'repo_implementation_pattern',
      title: pattern.title,
      patternId: pattern.patternId,
      sourceUrl: pattern.sourceUrl,
      evidenceSnippet: pattern.evidenceSnippet,
    })).slice(0, 20),
    repoReviewPacket: packet,
    implementationPatterns: list(packet.implementationPatterns),
    artifacts: report.artifacts || {},
    sideEffects: report.sideEffects || {},
  }
}

function normalizeFailedRunResult(row = {}, error) {
  return {
    rowId: row.rowId,
    bucketId: row.bucketId,
    runner: row.runner,
    sourceType: row.sourceType,
    url: row.url,
    status: 'source_handoff_row_failed',
    ok: false,
    pagesRead: 0,
    handsEvents: 0,
    newsletterCandidates: 0,
    paidGateEvaluations: 0,
    pageSummaries: [],
    freeResourceCaptures: [],
    blockers: [{
      type: 'runtime_exception',
      reason: error instanceof Error ? error.message : String(error),
      url: row.url,
    }],
    valueScore: null,
    usefulSignals: [],
    sourceStackUpdate: null,
    sopCompletion: null,
    artifacts: {},
    sideEffects: sideEffects(),
  }
}

function sourceBrowserAgentFamilyForHandoffRow(row = {}) {
  if (row.bucketId === 'public-code-repos') return 'github_docs_public_resources'
  if (row.sourceType === 'public_community_bridge' || row.runner === 'source:god-mode') return 'public_free_resources'
  if (row.bucketId === 'free-communities') return 'skool_free_community'
  return 'public_free_resources'
}

function sourceBrowserAgentPacketForHandoffRow(row = {}) {
  const sourceFamily = sourceBrowserAgentFamilyForHandoffRow(row)
  const sessionReady = row.freeCommunitySessionBrokerReady === true
  return {
    sourceId: row.rowId || row.host || 'youtube-source-handoff',
    url: row.url,
    sourceType: row.sourceType,
    sourceFamily,
    title: row.label || row.host || row.url,
    preview: row.plainEnglish || list(row.allowedActions).join(' '),
    action: sourceFamily === 'skool_free_community' ? 'read_allowed_free_posts' : 'read_public_page',
    account: sourceFamily === 'skool_free_community' ? SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT : '',
    persistentProfilePresent: sessionReady,
    sessionHealthy: sessionReady,
    keychainPresent: sessionReady,
    loginRecipePresent: sessionReady,
  }
}

function attachSourceBrowserAgentPlan(result = {}, row = {}, plan = {}) {
  const crawlItemInput = buildSourceBrowserAgentCrawlItemInput(plan, {
    row: {
      rowId: row.rowId,
      title: row.label || row.host || row.url,
      url: row.url,
      sourceType: row.sourceType,
      sourceFamily: sourceBrowserAgentFamilyForHandoffRow(row),
    },
  })
  const agentSourceStack = crawlItemInput.metadata.sourceStackUpdate || {}
  const resultSourceStack = result.sourceStackUpdate || null
  const sourceStackUpdate = resultSourceStack
    ? {
        ...agentSourceStack,
        ...resultSourceStack,
        surfaces: {
          ...(agentSourceStack.surfaces || {}),
          ...(resultSourceStack.surfaces || {}),
        },
      }
    : agentSourceStack
  return {
    ...result,
    sourceBrowserAgentReadbackVersion: crawlItemInput.metadata.sourceBrowserAgentReadbackVersion,
    sourceBrowserAgentPlan: crawlItemInput.metadata.sourceBrowserAgentPlan,
    sourceStackUpdate,
    authNeeded: result.authNeeded || crawlItemInput.metadata.authNeeded,
    blockers: [
      ...list(result.blockers),
      ...list(crawlItemInput.metadata.blockers).filter(blocker =>
        !list(result.blockers).some(existing => existing.type === blocker.type && existing.reason === blocker.reason)
      ),
    ].slice(0, 40),
  }
}

function normalizeSourceBrowserAgentBlockedResult(row = {}, plan = {}) {
  return attachSourceBrowserAgentPlan({
    rowId: row.rowId,
    bucketId: row.bucketId,
    runner: row.runner,
    sourceType: row.sourceType,
    url: row.url,
    status: plan.status || 'source_browser_agent_blocked',
    ok: false,
    pagesRead: 0,
    handsEvents: 0,
    newsletterCandidates: 0,
    paidGateEvaluations: 0,
    pageSummaries: [],
    freeResourceCaptures: [],
    blockers: [],
    valueScore: null,
    usefulSignals: [],
    sourceStackUpdate: null,
    sopCompletion: null,
    artifacts: {},
    sideEffects: sideEffects(),
    authNeeded: plan.authEvent || null,
  }, row, plan)
}

function bucketRunRank(row = {}) {
  const ranks = {
    'public-code-repos': 0,
    'public-web-resources': 1,
    'creator-newsletters': 2,
    'free-communities': 3,
  }
  return ranks[row.bucketId] ?? 9
}

function compareRunnableRowsForBatch(left = {}, right = {}) {
  return number(left.devLanePriority?.priorityRank, 99) - number(right.devLanePriority?.priorityRank, 99) ||
    number(right.devLanePriority?.sourceScore, 0) - number(left.devLanePriority?.sourceScore, 0) ||
    bucketRunRank(left) - bucketRunRank(right) ||
    text(left.host).localeCompare(text(right.host)) ||
    text(left.url).localeCompare(text(right.url))
}

export function selectSourceGodModeYoutubeHandoffRows(queue = {}, { maxRuns = 4 } = {}) {
  return list(queue.rows)
    .filter(row => row.runnable === true)
    .sort(compareRunnableRowsForBatch)
    .slice(0, Math.max(0, number(maxRuns, 4)))
}

export async function runSourceGodModeYoutubeHandoffBatch({
  queue = {},
  maxRuns = 4,
  mode = 'live_browser',
  headed = false,
  rootDir = SOURCE_GOD_MODE_YOUTUBE_HANDOFF_ROOT,
  allowLocalFixture = false,
  now = new Date().toISOString(),
} = {}) {
  const batchRunId = `source-god-mode-youtube-handoff:${now.replace(/[^0-9]/g, '').slice(0, 14)}`
  const selectedRows = selectSourceGodModeYoutubeHandoffRows(queue, { maxRuns })
  const skippedRows = list(queue.rows).filter(row => !selectedRows.some(selected => selected.rowId === row.rowId))
  const results = []

  for (const row of selectedRows) {
    try {
      const sourceBrowserAgentPlan = planSourceBrowserAgentRun({
        packet: sourceBrowserAgentPacketForHandoffRow(row),
        now,
      })
      if (sourceBrowserAgentPlan.ok !== true || sourceBrowserAgentPlan.terminalState !== 'completed') {
        results.push(normalizeSourceBrowserAgentBlockedResult(row, sourceBrowserAgentPlan))
        continue
      }

      if (row.runner === 'skool:free-god-mode') {
        const report = await runSkoolFreeCommunityGodMode({
          url: row.url,
          allowLocalFixture,
          headed,
          maxPages: row.maxPages,
          maxDepth: row.maxDepth,
          rootDir: path.join(rootDir, 'skool-free-community'),
          profileDir: path.join(rootDir, 'profiles', safeKey(row.rowId)),
          now,
        })
        results.push(attachSourceBrowserAgentPlan(normalizeSkoolRunResult(row, report), row, sourceBrowserAgentPlan))
        continue
      }

      if (row.runner === 'repo:deep-review') {
        const report = await runPublicRepoDeepReview({
          url: row.url,
          allowLocalFixture,
          maxPages: row.maxPages,
          maxDepth: row.maxDepth,
          now,
        })
        results.push(attachSourceBrowserAgentPlan(normalizePublicRepoRunResult(row, report), row, sourceBrowserAgentPlan))
        continue
      }

      const report = await runSourceGodModeExtractor({
        url: row.url,
        sourceType: row.sourceType,
        creatorId: row.sourceVideoId || row.host || 'youtube-handoff',
        creatorName: row.host || row.label,
        mode,
        maxPages: row.maxPages,
        maxDepth: row.maxDepth,
        headed,
        rootDir: path.join(rootDir, 'source-runtime'),
        now,
      })
      results.push(attachSourceBrowserAgentPlan(normalizeSourceRunResult(row, report), row, sourceBrowserAgentPlan))
    } catch (error) {
      results.push(normalizeFailedRunResult(row, error))
    }
  }

  const dangerousSideEffect = results.some(result => {
    const effects = result.sideEffects || {}
    return effects.externalWrites === true ||
      effects.writesBacklog === true ||
      effects.submittedForm === true ||
      effects.downloadedFile === true ||
      effects.purchased === true ||
      effects.postedOrMessaged === true ||
      effects.mutatesCredentials === true ||
      effects.normalChromeProfileUsed === true
  })

  return {
    status: dangerousSideEffect
      ? 'blocked_dangerous_side_effect'
      : results.every(result => result.ok)
        ? 'completed'
        : 'completed_with_blockers',
    ok: !dangerousSideEffect,
    cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
    batchRunId,
    capturedAt: now,
    reportOnly: true,
    queueCounts: queue.counts || {},
    selectedRows: selectedRows.map(row => ({
      rowId: row.rowId,
      bucketId: row.bucketId,
      runner: row.runner,
      url: row.url,
    })),
    skippedRows: skippedRows.map(row => ({
      rowId: row.rowId,
      bucketId: row.bucketId,
      status: row.status,
      runnable: row.runnable,
      url: row.url,
    })),
    results,
    sideEffects: sideEffects({
      liveBrowserLaunched: results.some(result => result.sideEffects?.liveBrowserLaunched === true),
      networkFetched: results.some(result => result.sideEffects?.networkFetched === true),
      externalWrites: false,
      writesBacklog: false,
      submittedForm: false,
      downloadedFile: false,
      purchased: false,
      postedOrMessaged: false,
      mutatesCredentials: false,
      normalChromeProfileUsed: false,
    }),
  }
}

export function buildSourceGodModeYoutubeHandoffTargetInput({
  batch = {},
  lastStatus = null,
  runItemCount = 0,
} = {}) {
  return {
    targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
    sourceId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SOURCE_ID,
    title: 'YouTube source-browser handoff runs',
    lane: 'corpus_mining',
    targetType: 'source_browser_handoff_run_ledger',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'manual',
    cursorState: {
      cursorType: 'exact_source_url_handoff',
      latestBatchRunId: batch.batchRunId || '',
      latestCapturedAt: batch.capturedAt || '',
    },
    budget: {
      llmBudget: 'none_for_read_only_public_source_handoff',
      maxItemsPerRun: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_MAX_ITEMS_PER_RUN,
      maxRuntimeSeconds: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_MAX_RUNTIME_SECONDS,
      exactStartingUrlsOnly: true,
      maxRuns: list(batch.selectedRows).length,
      maxPagesPerPublicRun: 4,
      maxPagesPerFreeCommunityRun: 12,
      broadCrawl: false,
      purchases: false,
      formSubmits: false,
      downloads: false,
      commentsOrMessages: false,
      scoperPromotion: false,
    },
    dedupePolicy: { key: 'rowId', mode: 'append_or_update_exact_source_url_runs', idempotent: true },
    lastRunAt: batch.capturedAt || null,
    lastStatus: lastStatus || batch.status || null,
    inspectedCount: list(batch.selectedRows).length,
    archivedCount: runItemCount,
    extractedCount: list(batch.results).filter(result => result.ok === true).length,
    metadata: {
      cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
      batchRunId: batch.batchRunId || '',
      queueCounts: batch.queueCounts || {},
      selectedCount: list(batch.selectedRows).length,
      skippedCount: list(batch.skippedRows).length,
      resultCount: list(batch.results).length,
      sideEffects: batch.sideEffects || sideEffects(),
      noScoperPromotion: true,
      noExternalWrites: true,
      noPurchasesFormsDownloadsPosts: true,
    },
    notes: 'Runs YouTube-discovered public/free source rows through bounded source-browser workers. Paid/auth/product/action rows stay parked.',
  }
}

export function buildSourceGodModeYoutubeHandoffCrawlItemInput(result = {}, {
  batch = {},
  row = {},
} = {}) {
  const artifactId = result.artifacts?.reportPath || `${SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY}:${safeKey(result.rowId || result.url)}`
  const externalId = result.rowId || `youtube-handoff:${safeKey(result.url)}`
  const completed = batch.capturedAt || new Date().toISOString()
  const isBlockedAuth = result.status === 'auth_needed' || result.authNeeded
  return {
    itemKey: `${SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY}:${safeKey(externalId).slice(0, 120)}:${stableHash(externalId).slice(0, 12)}`,
    targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
    sourceId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SOURCE_ID,
    externalId,
    itemType: 'source_browser_handoff_run',
    status: result.ok === true ? 'succeeded' : 'failed',
    fingerprint: stableHash({
      rowId: result.rowId,
      url: result.url,
      status: result.status,
      artifactId,
      pagesRead: result.pagesRead,
      handsEvents: result.handsEvents,
    }),
    attemptCount: 1,
    lastError: result.ok === true
      ? null
      : isBlockedAuth
        ? `blocked_auth_needed:${result.authNeeded?.reason || result.status || 'auth_needed'}`
        : result.status || 'source handoff run blocked',
    artifactId,
    discoveredAt: batch.capturedAt || completed,
    processedAt: completed,
    metadata: {
      schemaVersion: 1,
      sourceHandoffReadbackVersion: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_VERSION,
      cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
      batchRunId: batch.batchRunId || '',
      rowId: result.rowId || row.rowId || '',
      bucketId: result.bucketId || row.bucketId || '',
      runner: result.runner || row.runner || '',
      sourceType: result.sourceType || row.sourceType || '',
      url: result.url || row.url || '',
      host: hostOf(result.url || row.url),
      status: result.status || '',
      ok: result.ok === true,
      pagesRead: number(result.pagesRead, 0),
      handsEvents: number(result.handsEvents, 0),
      newsletterCandidates: number(result.newsletterCandidates, 0),
      paidGateEvaluations: number(result.paidGateEvaluations, 0),
      pageSummaries: list(result.pageSummaries).slice(0, 12),
      freeResourceCaptures: list(result.freeResourceCaptures).slice(0, 40),
      blockers: list(result.blockers).slice(0, 40),
      valueScore: result.valueScore || null,
      usefulSignals: list(result.usefulSignals).slice(0, 20),
      repoReviewPacket: result.repoReviewPacket || null,
      implementationPatterns: list(result.implementationPatterns).slice(0, 20),
      sopCompletion: result.sopCompletion || null,
      authNeeded: result.authNeeded || null,
      sourceStackUpdate: result.sourceStackUpdate || null,
      sourceBrowserAgentReadbackVersion: result.sourceBrowserAgentReadbackVersion || null,
      sourceBrowserAgentPlan: result.sourceBrowserAgentPlan || null,
      artifacts: result.artifacts || {},
      sideEffects: sideEffects(result.sideEffects || {}),
      noScoperPromotion: true,
      noAutoBacklog: true,
      noExternalWrites: true,
    },
  }
}

export function buildSourceGodModeYoutubeHandoffReportArtifactInput(batch = {}) {
  const results = list(batch.results)
  const sourceRows = list(batch.selectedRows)
  return {
    reportArtifactId: `${SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY}:${safeKey(batch.batchRunId || batch.capturedAt || 'run')}`,
    reportType: 'proof',
    scopeKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
    department: 'foundation',
    title: `YouTube source-browser handoff batch: ${results.length} rows`,
    status: batch.ok ? 'generated' : 'needs_review',
    sourceIds: [SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SOURCE_ID],
    inputArtifactIds: uniqueStrings(results.flatMap(result => [
      result.artifacts?.reportPath,
      result.artifacts?.runDir,
    ])),
    inputCandidateKeys: uniqueStrings(sourceRows.map(row => row.url)),
    sourceCoverage: results.map(result => ({
      sourceId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SOURCE_ID,
      rowId: result.rowId,
      bucketId: result.bucketId,
      runner: result.runner,
      sourceType: result.sourceType,
      url: result.url,
      status: result.status,
      ok: result.ok === true,
      pagesRead: result.pagesRead,
    })),
    freshnessWarnings: results.some(result => result.ok === true)
      ? [{
          code: 'source_browser_handoff_evidence_ready_for_synthesis',
          detail: 'Public/free source evidence was captured and should be visible to source-stack readback and future synthesis.',
          latestEvidenceAt: batch.capturedAt || '',
        }]
      : [],
    topFindings: results.map(result => ({
      title: `${result.bucketId || 'source'} ${result.host || hostOf(result.url) || result.url}`,
      summary: `${result.runner} ${result.status}; pages=${result.pagesRead}; hands=${result.handsEvents}; score=${result.valueScore?.score ?? 'n/a'}`,
      evidence: {
        rowId: result.rowId,
        url: result.url,
        artifactPath: result.artifacts?.reportPath || '',
        pageTitles: list(result.pageSummaries).map(page => page.title).filter(Boolean).slice(0, 8),
        freeResourceCaptureCount: list(result.freeResourceCaptures).length,
        blockerCount: list(result.blockers).length,
      },
    })),
    actionRequiredItems: results
      .filter(result => result.status === 'auth_needed' || result.ok !== true)
      .map(result => ({
        type: result.status === 'auth_needed' ? 'source_session_auth_needed' : 'source_handoff_blocked',
        rowId: result.rowId,
        url: result.url,
        bucketId: result.bucketId,
        runner: result.runner,
        status: result.status,
        reason: result.authNeeded?.reason || result.status || 'blocked',
      })),
    openQuestions: [],
    structuredOutputJson: {
      schemaVersion: 1,
      cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
      batch,
    },
    outputArtifactId: `${SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY}:${safeKey(batch.batchRunId || batch.capturedAt || 'run')}`,
    metadata: {
      cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
      batchRunId: batch.batchRunId || '',
      capturedAt: batch.capturedAt || '',
      reportOnly: false,
      noScoperPromotion: true,
      externalWrites: false,
      writesBacklog: false,
      submittedForms: false,
      downloads: false,
      purchases: false,
      postedOrMessaged: false,
      selectedCount: sourceRows.length,
      resultCount: results.length,
      sideEffects: batch.sideEffects || sideEffects(),
    },
  }
}

export async function persistSourceGodModeYoutubeHandoffBatch(batch = {}, deps = {}) {
  if (!batch || !list(batch.results).length) {
    return {
      ok: false,
      status: 'blocked',
      validation: { ok: false, failures: [{ code: 'missing_source_handoff_batch_results' }] },
      sideEffects: sideEffects(),
    }
  }
  if (typeof deps.upsertSourceCrawlTarget !== 'function') throw new Error('upsertSourceCrawlTarget dependency is required.')
  if (typeof deps.upsertSourceCrawlItem !== 'function') throw new Error('upsertSourceCrawlItem dependency is required.')

  const actor = text(deps.actor || 'source-god-mode-youtube-handoff-runner')
  const rowById = new Map(list(batch.selectedRows).map(row => [row.rowId, row]))
  let target = await deps.upsertSourceCrawlTarget(
    buildSourceGodModeYoutubeHandoffTargetInput({
      batch,
      lastStatus: 'running',
      runItemCount: 0,
    }),
    actor,
  )
  const sourceCrawlItems = []
  for (const result of list(batch.results)) {
    const input = buildSourceGodModeYoutubeHandoffCrawlItemInput(result, {
      batch,
      row: rowById.get(result.rowId) || {},
    })
    sourceCrawlItems.push(await deps.upsertSourceCrawlItem(input, actor))
  }
  target = await deps.upsertSourceCrawlTarget(
    buildSourceGodModeYoutubeHandoffTargetInput({
      batch,
      lastStatus: batch.status || '',
      runItemCount: sourceCrawlItems.length,
    }),
    actor,
  )
  const reportArtifactInput = buildSourceGodModeYoutubeHandoffReportArtifactInput(batch)
  const reportArtifact = typeof deps.upsertIntelligenceReportArtifact === 'function'
    ? await deps.upsertIntelligenceReportArtifact(reportArtifactInput, actor)
    : null

  return {
    ok: true,
    status: 'persisted',
    target,
    sourceCrawlItems,
    reportArtifact,
    reportArtifactInput,
    sideEffects: sideEffects({
      writesSourceCrawlItems: true,
      writesIntelligenceReportArtifact: Boolean(reportArtifact),
      externalWrites: false,
      writesBacklog: false,
    }),
  }
}
