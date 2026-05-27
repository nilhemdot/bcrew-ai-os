import path from 'node:path'

import {
  runSkoolFreeCommunityGodMode,
} from './skool-free-community-god-mode-runner.js'
import {
  runSourceGodModeExtractor,
} from './source-god-mode-extractor-runtime.js'

export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SCRIPT_PATH = 'scripts/process-source-god-mode-youtube-handoff-check.mjs'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_ROOT = '.openclaw/source-god-mode-youtube-handoff'

const DEFAULT_ROW_LIMIT = 250

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
    runner: 'source:god-mode',
    sourceType: 'github_docs_public_resources',
    status: 'ready_for_public_repo_runtime',
    runnable: true,
    maxPages: 4,
    maxDepth: 1,
    allowedActions: ['read public repo/docs metadata', 'read visible README/docs/examples', 'classify install/download/auth blockers'],
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

function rowsForBucket(bucket = {}) {
  return list(bucket.items).length ? list(bucket.items) : list(bucket.samples)
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

function buildRunCommand(row = {}) {
  if (row.runner === 'skool:free-god-mode') {
    return `npm run skool:free-god-mode -- --url=${row.url}`
  }
  if (row.runner === 'source:god-mode') {
    return `npm run source:god-mode -- --url=${row.url} --sourceType=${row.sourceType} --maxPages=${row.maxPages} --maxDepth=${row.maxDepth}`
  }
  return ''
}

function buildQueueRow({ bucketId = '', bucket = {}, item = {}, index = 0 } = {}) {
  const config = BUCKET_CONFIG[bucketId] || BUCKET_CONFIG['public-web-resources']
  const url = text(item.url || item.normalizedUrl || item.href)
  const host = text(item.host || hostOf(url))
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
    sourceVideoId: text(item.sourceVideoId),
    reportArtifactId: text(item.reportArtifactId),
    disposition: text(item.disposition),
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
  }
  row.runCommand = buildRunCommand(row)
  row.plainEnglish = row.runnable
    ? `${row.label} from watched-video evidence is ready for ${row.runner} with source type ${row.sourceType}.`
    : `${row.label} from watched-video evidence is parked until the required approval/session/value decision exists.`
  return row
}

export function buildSourceGodModeYoutubeHandoffQueue({
  handoffEvidence = {},
  generatedAt = new Date().toISOString(),
  rowLimit = DEFAULT_ROW_LIMIT,
} = {}) {
  const rows = []
  const bucketCounts = {}
  const buckets = handoffEvidence.buckets || {}
  for (const [bucketId, config] of Object.entries(BUCKET_CONFIG)) {
    const bucket = buckets[bucketId] || {}
    const sourceRows = rowsForBucket(bucket).slice(0, Math.max(0, number(rowLimit, DEFAULT_ROW_LIMIT)))
    bucketCounts[bucketId] = {
      label: config.label,
      count: number(bucket.count, sourceRows.length),
      queuedRows: sourceRows.length,
      hasMore: number(bucket.count, sourceRows.length) > sourceRows.length,
      runnable: config.runnable === true,
      status: config.status,
    }
    for (const [index, item] of sourceRows.entries()) {
      rows.push(buildQueueRow({ bucketId, bucket, item, index }))
    }
  }

  const runnableRows = rows.filter(row => row.runnable)
  const parkedRows = rows.filter(row => !row.runnable)
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
      runnableRows: runnableRows.length,
      parkedRows: parkedRows.length,
      publicFreeRuntimeRows: runnableRows.filter(row => row.runner === 'source:god-mode').length,
      freeCommunityRows: runnableRows.filter(row => row.runner === 'skool:free-god-mode').length,
      paidOrAuthParkedRows: parkedRows.filter(row => row.requiresAuth).length,
      rowsWithRunCommand: rows.filter(row => row.runCommand).length,
    },
    notNext: [
      'no Scoper promotion from this queue',
      'no purchases, downloads, posts, comments, messages, or form submits',
      'no paid/private/auth extraction without Source Session Broker packet',
    ],
    sideEffects: sideEffects(),
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
    artifacts: report.artifacts || {},
    sideEffects: report.sideEffects || {},
    authNeeded: report.authNeeded || null,
  }
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
  const selectedRows = list(queue.rows)
    .filter(row => row.runnable === true)
    .slice(0, Math.max(0, number(maxRuns, 4)))
  const skippedRows = list(queue.rows).filter(row => !selectedRows.some(selected => selected.rowId === row.rowId))
  const results = []

  for (const row of selectedRows) {
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
      results.push(normalizeSkoolRunResult(row, report))
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
    results.push(normalizeSourceRunResult(row, report))
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
    ok: !dangerousSideEffect && results.every(result => result.ok || result.status === 'auth_needed'),
    cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
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
