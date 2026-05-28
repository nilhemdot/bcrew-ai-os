import {
  executeSourceBrowserAgentRun,
  persistSourceBrowserAgentExecution,
} from './source-browser-agent-executor.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} from './source-session-broker.js'

export const SOURCE_BROWSER_FALLBACK_EXECUTOR_SCRIPT_PATH = 'scripts/process-source-browser-fallback-executor-check.mjs'
export const SOURCE_BROWSER_FALLBACK_EXECUTOR_VERSION = 'source-browser-fallback-executor-v1'
export const SOURCE_BROWSER_FALLBACK_EXECUTOR_CLOSEOUT_KEY = 'source-browser-fallback-executor-v1'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function bool(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sideEffects(overrides = {}) {
  return {
    externalRunStarted: false,
    liveBrowserLaunched: false,
    networkFetched: false,
    modelCalled: false,
    manualClicks: false,
    clicked: false,
    submittedForm: false,
    downloadedFile: false,
    purchased: false,
    optedIn: false,
    postedOrMessaged: false,
    loggedIn: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    normalChromeProfileUsed: false,
    rawSecretPrinted: false,
    ...overrides,
  }
}

function quoteArg(value = '') {
  const raw = String(value || '')
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(raw)) return raw
  return `'${raw.replace(/'/g, "'\\''")}'`
}

function packageCommand(script = '', args = []) {
  return ['npm', 'run', script, '--', ...args].map(quoteArg).join(' ')
}

function hostOf(value = '') {
  try {
    return new URL(text(value)).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function sourceFamilyForFallbackRow(row = {}) {
  const explicit = text(row.sourceFamily || row.source_family)
  if (explicit) return explicit
  const bucketId = text(row.bucketId)
  const sourceType = text(row.sourceType || row.source_type)
  const host = hostOf(row.url)
  if (sourceType === 'public_community_bridge') return 'public_free_resources'
  if (bucketId === 'public-code-repos' || /github|gitlab|gist|repo|code/i.test(sourceType)) return 'github_docs_public_resources'
  if (bucketId === 'creator-newsletters' || /newsletter/i.test(sourceType)) return 'creator_newsletters'
  if (bucketId === 'free-communities' || /skool\.com$/i.test(host) || /community/i.test(sourceType)) return 'skool_free_community'
  return 'public_free_resources'
}

function sourceTypeForFallbackRow(row = {}, sourceFamily = sourceFamilyForFallbackRow(row)) {
  const explicit = text(row.sourceType || row.source_type)
  if (explicit) return explicit
  if (sourceFamily === 'github_docs_public_resources') return 'github_docs_public_resources'
  if (sourceFamily === 'creator_newsletters') return 'creator_newsletter'
  if (sourceFamily === 'skool_free_community') return 'skool_free_community'
  return 'public_or_free_source'
}

function buildSourcePacket(row = {}) {
  const sourceFamily = sourceFamilyForFallbackRow(row)
  const sourceType = sourceTypeForFallbackRow(row, sourceFamily)
  const sourceSessionReady = bool(row.sourceSessionReady || row.sessionHealthy || row.persistentProfilePresent || row.freeCommunitySessionBrokerReady)
  return {
    sourceId: text(row.rowId || row.sourceId || row.host || hostOf(row.url) || 'source-browser-fallback'),
    url: text(row.url),
    sourceType,
    sourceFamily,
    title: text(row.label || row.title || row.host || row.url),
    preview: text(row.reason || row.plainEnglish || row.nextAction || ''),
    action: sourceFamily === 'skool_free_community'
      ? 'read_allowed_free_posts'
      : sourceFamily === 'creator_newsletters'
        ? 'read_newsletter_page'
        : sourceFamily === 'github_docs_public_resources'
          ? 'read_public_repo_metadata'
          : 'read_public_page',
    account: ['skool_free_community', 'creator_newsletters'].includes(sourceFamily)
      ? text(row.account || row.sourceAccount || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT)
      : text(row.account || row.sourceAccount || ''),
    sourceBoundaryApproved: true,
    keychainPresent: sourceSessionReady,
    persistentProfilePresent: sourceSessionReady,
    sessionHealthy: sourceSessionReady,
    loginRecipePresent: sourceSessionReady,
  }
}

function buildRetryArgs(packet = {}, { maxPages = 4, maxDepth = 1, mode = 'live_browser', persist = true } = {}) {
  return [
    `--url=${packet.url}`,
    `--sourceId=${packet.sourceId}`,
    `--sourceType=${packet.sourceType}`,
    `--sourceFamily=${packet.sourceFamily}`,
    packet.account ? `--account=${packet.account}` : '',
    '--execute',
    persist ? '--persist' : '',
    '--json',
    `--mode=${mode}`,
    `--maxPages=${number(maxPages, 4)}`,
    `--maxDepth=${number(maxDepth, 1)}`,
  ].filter(Boolean)
}

function sourceSessionRequiredFor(packet = {}, fallbackPlan = {}) {
  if (fallbackPlan.sourceSessionRequired === true) return true
  return ['creator_newsletters', 'skool_free_community', 'skool_paid_or_private', 'paid_course_training_platforms'].includes(text(packet.sourceFamily))
}

function detectChallengeAgain(execution = {}) {
  const blockers = [
    ...list(execution.runnerSummary?.blockers),
    ...list(execution.crawlItem?.metadata?.blockers),
  ]
  return blockers.some(blocker => /browser_challenge_not_source_content|cloudflare|checking your browser|just a moment/i.test(`${blocker.type || ''} ${blocker.reason || ''} ${blocker.detail || ''}`)) ||
    list(execution.runnerSummary?.pageSummaries).some(page => /just a moment|checking your browser|cloudflare/i.test(`${page.title || ''} ${list(page.blockers).join(' ')}`))
}

function hasUnsafeSideEffect(execution = {}) {
  const effects = execution.crawlItem?.metadata?.sideEffects || execution.sideEffects || {}
  return effects.externalWrites === true ||
    effects.writesBacklog === true ||
    effects.submittedForm === true ||
    effects.downloadedFile === true ||
    effects.purchased === true ||
    effects.postedOrMessaged === true ||
    effects.mutatesCredentials === true ||
    effects.normalChromeProfileUsed === true
}

export function buildSourceBrowserFallbackRetryPacket({
  row = {},
  fallbackPlan = row.fallbackPlan || {},
  maxPages = 4,
  maxDepth = 1,
  mode = 'live_browser',
  persist = true,
} = {}) {
  const packet = buildSourcePacket(row)
  const missingUrl = !packet.url
  const sourceSessionRequired = sourceSessionRequiredFor(packet, fallbackPlan)
  const sourceSessionReady = packet.keychainPresent === true && packet.persistentProfilePresent === true && packet.sessionHealthy === true
  const retryArgs = buildRetryArgs(packet, { maxPages, maxDepth, mode, persist })
  const retryWithSessionArgs = [
    ...retryArgs,
    '--allowSourceSessionRun',
    '--keychainPresent=true',
    '--persistentProfilePresent=true',
    '--sessionHealthy=true',
    '--loginRecipePresent=true',
  ]
  const ready = !missingUrl && (!sourceSessionRequired || sourceSessionReady)
  const status = missingUrl
    ? 'failed_closed_missing_url'
    : ready
      ? 'ready_for_clean_isolated_retry'
      : 'waiting_for_source_session'
  return {
    version: SOURCE_BROWSER_FALLBACK_EXECUTOR_VERSION,
    status,
    sourcePacket: packet,
    fallbackPlan: {
      status: text(fallbackPlan.status || 'browser_challenge_fallback_required'),
      route: text(fallbackPlan.route || (sourceSessionRequired ? 'source_specific_session_then_hosted_browser_fallback' : 'clean_isolated_retry_then_hosted_browser_fallback')),
      sourceSessionRequired,
      normalChromeProfileAllowed: fallbackPlan.normalChromeProfileAllowed === true,
      firstStep: text(fallbackPlan.firstStep || (sourceSessionRequired ? 'Prove the isolated source session, then retry the exact URL.' : 'Retry the exact URL in a clean isolated source-browser session.')),
      nextAction: text(fallbackPlan.nextAction || 'Run the clean retry first; if the challenge remains, route to approved hosted/browser fallback or human escalation.'),
    },
    cleanRetry: {
      allowedNow: ready,
      command: ready ? packageCommand('source:browser-agent', retryArgs) : '',
      args: ready ? retryArgs : [],
      maxPages: number(maxPages, 4),
      maxDepth: number(maxDepth, 1),
      mode,
      exactUrlOnly: true,
      normalChromeProfileAllowed: false,
    },
    afterSourceSession: sourceSessionRequired
      ? {
          required: true,
          ready: sourceSessionReady,
          command: packageCommand('source:browser-agent', retryWithSessionArgs),
          args: retryWithSessionArgs,
        }
      : { required: false, ready: true, command: '', args: [] },
    hostedFallback: {
      status: 'pending_approval',
      allowedOnlyAfterCleanRetryFails: true,
      route: 'hosted_browser_agent_read_only_fallback',
      nextAction: 'Use only after clean isolated retry/source-session retry still cannot prove real source content.',
    },
    sideEffects: sideEffects(),
    plainEnglish: ready
      ? 'Clean isolated retry is ready for this exact source URL. It still cannot use normal Chrome, submit forms, download, buy, post, message, mutate credentials, or promote Scoper work.'
      : sourceSessionRequired
        ? 'This fallback row needs source-session proof before the retry can run.'
        : 'This fallback row is blocked before retry.',
  }
}

export async function runSourceBrowserFallbackRetry({
  row = {},
  fallbackPlan = row.fallbackPlan || {},
  apply = false,
  persist = false,
  maxPages = 4,
  maxDepth = 1,
  mode = 'live_browser',
  htmlByUrl = {},
  fetchImpl = globalThis.fetch,
  allowLocalFixture = false,
  allowSourceSessionRun = false,
  deps = {},
  now = new Date().toISOString(),
} = {}) {
  const packet = buildSourceBrowserFallbackRetryPacket({
    row,
    fallbackPlan,
    maxPages,
    maxDepth,
    mode,
    persist,
  })
  if (apply !== true) {
    return {
      ok: true,
      status: 'source_browser_fallback_retry_dry_run',
      packet,
      execution: null,
      persistence: null,
      sideEffects: sideEffects(),
      plainEnglish: 'Dry run only. No browser, network, source-session, hosted fallback, Telegram, or persistence action started.',
    }
  }
  if (packet.cleanRetry.allowedNow !== true && allowSourceSessionRun !== true) {
    return {
      ok: false,
      status: 'source_browser_fallback_retry_blocked_before_run',
      packet,
      execution: null,
      persistence: null,
      sideEffects: sideEffects(),
      plainEnglish: packet.plainEnglish,
    }
  }
  const execution = await executeSourceBrowserAgentRun({
    packet: packet.sourcePacket,
    mode,
    htmlByUrl,
    maxPages,
    maxDepth,
    allowLocalFixture,
    allowSourceSessionRun,
    fetchImpl,
    now,
  })
  let persistence = null
  if (persist === true && execution?.crawlItem && deps.upsertSourceCrawlTarget && deps.upsertSourceCrawlItem) {
    persistence = await persistSourceBrowserAgentExecution(execution, deps)
  }
  const challengeAgain = detectChallengeAgain(execution)
  const unsafe = hasUnsafeSideEffect(execution)
  const status = execution.ok === true && unsafe === false
    ? 'source_browser_fallback_clean_retry_completed'
    : challengeAgain
      ? 'source_browser_fallback_hosted_fallback_required'
      : unsafe
        ? 'source_browser_fallback_retry_unsafe_side_effect_blocked'
        : 'source_browser_fallback_retry_failed_closed'
  return {
    ok: status === 'source_browser_fallback_clean_retry_completed',
    status,
    packet,
    execution,
    persistence,
    challengeAgain,
    unsafeSideEffectDetected: unsafe,
    hostedFallbackRequired: challengeAgain,
    sideEffects: execution.sideEffects || sideEffects(),
    plainEnglish: status === 'source_browser_fallback_clean_retry_completed'
      ? 'Clean isolated retry read real source content and produced a source-browser ledger item.'
      : challengeAgain
        ? 'Clean isolated retry still saw a browser challenge. Park for approved hosted/browser fallback or operator escalation; do not count this as extracted evidence.'
        : 'Clean isolated retry failed closed without unsafe side effects.',
  }
}
