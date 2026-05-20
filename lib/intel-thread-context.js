export const INTEL_THREAD_CONTEXT_CARD_ID = 'INTEL-THREAD-CONTEXT-001'
export const INTEL_THREAD_CONTEXT_CLOSEOUT_KEY = 'intel-thread-context-v1'
export const INTEL_THREAD_CONTEXT_PLAN_PATH = 'docs/process/intel-thread-context-001-plan.md'
export const INTEL_THREAD_CONTEXT_APPROVAL_PATH = 'docs/process/approvals/INTEL-THREAD-CONTEXT-001.json'
export const INTEL_THREAD_CONTEXT_SCRIPT_PATH = 'scripts/process-intel-thread-context-check.mjs'
export const INTEL_THREAD_CONTEXT_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-intel-thread-context-closeout.md'
export const INTEL_THREAD_CONTEXT_NEXT_CARD_ID = 'SCOPER-UI-001'
export const INTEL_THREAD_CONTEXT_SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'

export const INTEL_THREAD_CONTEXT_CHANGED_FILES = [
  'lib/intel-thread-context.js',
  'lib/intelligence-action-router.js',
  'public/strategic-execution.js',
  'lib/foundation-verifier-followup-backlog-assurance.js',
  'scripts/process-intel-thread-context-check.mjs',
  'package.json',
  'docs/process/intel-thread-context-001-plan.md',
  'docs/process/approvals/INTEL-THREAD-CONTEXT-001.json',
  'docs/handoffs/2026-05-20-intel-thread-context-closeout.md',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
]

export const INTEL_THREAD_CONTEXT_PROOF_COMMANDS = [
  'node --check lib/intel-thread-context.js lib/intelligence-action-router.js public/strategic-execution.js scripts/process-intel-thread-context-check.mjs',
  'npm run process:intel-thread-context-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=INTEL-THREAD-CONTEXT-001 --planApprovalRef=docs/process/approvals/INTEL-THREAD-CONTEXT-001.json --closeoutKey=intel-thread-context-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=INTEL-THREAD-CONTEXT-001 --closeoutKey=intel-thread-context-v1',
  'npm run process:foundation-ship -- --card=INTEL-THREAD-CONTEXT-001 --planApprovalRef=docs/process/approvals/INTEL-THREAD-CONTEXT-001.json --closeoutKey=intel-thread-context-v1 --commitRef=HEAD',
]

export const INTEL_THREAD_CONTEXT_NOT_NEXT_BOUNDARIES = [
  'No new extraction, sync, crawl, browser, screenshot, OCR, transcription, or provider/model call work.',
  'No private broad extraction, paid/provider access, browser-auth work, external sends, source-system writes, Drive permission mutation, or credential/key rotation.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'No action-route apply workflow changes.',
  'No Scoper UI build; SCOPER-UI-001 owns rendering structured Scoper output after this proof context exists.',
  'No new atom/retrieval schema migration.',
]

const AUTOMATED_ORIGIN_PATTERNS = [
  'no-reply',
  'noreply',
  'do-not-reply',
  'donotreply',
  'mailer-daemon',
  'postmaster',
  'zapier',
  'follow up boss',
  'followupboss',
  'system',
  'automation',
  'notification',
  'calendar',
  'google calendar',
]

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function uniqueText(values = []) {
  return Array.from(new Set(
    values
      .flatMap(value => Array.isArray(value) ? value : [value])
      .map(value => normalizeText(value))
      .filter(Boolean)
  ))
}

function firstFinite(...values) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number) && number >= 0) return number
  }
  return null
}

function parseMetadata(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function dateMillis(value) {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function ageDays(value, now = new Date()) {
  const timestamp = dateMillis(value)
  if (timestamp == null) return null
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86400000))
}

function isThreadSourceType(sourceType) {
  return /(thread|email|missive|slack|meeting|transcript|calendar)/i.test(String(sourceType || ''))
}

function addFlag(flags, code, label, severity = 'watch') {
  if (flags.some(flag => flag.code === code)) return
  flags.push({ code, label, severity })
}

function hasAutomatedOrigin(item = {}) {
  const haystack = normalizeLower([
    item.from,
    item.sourceAccount,
    item.title,
    item.sourceContainer,
    item.quote,
    item.context,
  ].filter(Boolean).join(' '))
  return AUTOMATED_ORIGIN_PATTERNS.some(pattern => haystack.includes(pattern))
}

function buildCorroboration(item = {}, allItems = []) {
  const sourceIds = uniqueText(allItems.map(candidate => candidate.sourceId))
  const artifactIds = uniqueText(allItems.map(candidate => candidate.artifactId))
  const otherSourceIds = sourceIds.filter(sourceId => sourceId !== normalizeText(item.sourceId))
  if (sourceIds.length > 1) {
    return {
      status: 'cross_source',
      label: `${sourceIds.length} sources in route proof`,
      sourceIds,
      otherSourceIds,
      artifactCount: artifactIds.length,
      missing: false,
    }
  }
  if (artifactIds.length > 1) {
    return {
      status: 'same_source_multiple_artifacts',
      label: `${artifactIds.length} artifacts from one source`,
      sourceIds,
      otherSourceIds,
      artifactCount: artifactIds.length,
      missing: true,
    }
  }
  return {
    status: 'single_source',
    label: 'No cross-source corroboration captured',
    sourceIds,
    otherSourceIds,
    artifactCount: artifactIds.length,
    missing: true,
  }
}

export function buildThreadContextForProofItem(item = {}, allItems = [], { now = new Date() } = {}) {
  const metadata = parseMetadata(item.metadata || item.threadMetadata || {})
  const messageCount = firstFinite(
    metadata.messageCount,
    metadata.message_count,
    metadata.itemCount,
    metadata.item_count,
    item.messageCount,
  )
  const explicitReplyCount = firstFinite(
    metadata.replyCount,
    metadata.reply_count,
    metadata.reply_count_captured,
    item.replyCount,
  )
  const replyCount = explicitReplyCount != null
    ? explicitReplyCount
    : messageCount != null
      ? Math.max(0, messageCount - 1)
      : null
  const commentCount = firstFinite(metadata.commentCount, metadata.comment_count, item.commentCount)
  const latestActivityAt = item.latestActivityAt || item.artifactUpdatedAt || item.occurredAt || item.updatedAt || null
  const daysOld = ageDays(latestActivityAt, now)
  const participants = uniqueText(item.participants || [])
  const sourceType = normalizeText(item.sourceType || 'source')
  const sourceAccount = normalizeText(item.sourceAccount)
  const from = normalizeText(item.from)
  const to = normalizeText(item.to)
  const evidenceUseCount = [
    item.atomId,
    item.candidateKey,
    item.artifactId,
    ...(Array.isArray(item.factSummaries) ? item.factSummaries : []),
  ].filter(Boolean).length
  const corroboration = buildCorroboration(item, allItems)
  const flags = []

  if (isThreadSourceType(sourceType) && messageCount == null) {
    addFlag(flags, 'thread_status_missing', 'Thread message count missing')
  }
  if (messageCount === 1) addFlag(flags, 'one_message_thread', 'One-message thread')
  if (messageCount != null && replyCount === 0) addFlag(flags, 'no_reply_captured', 'No reply captured')
  if (hasAutomatedOrigin(item)) addFlag(flags, 'system_drafted_or_automated_origin', 'Possible automated/system origin')
  if (daysOld != null && daysOld >= 45) addFlag(flags, 'stale_thread', `Stale thread (${daysOld} days old)`)
  if (!participants.length) addFlag(flags, 'no_participants', 'Participants missing')
  if (corroboration.missing) addFlag(flags, 'no_cross_source_corroboration', 'No cross-source corroboration')

  const threadStatus = messageCount != null
    ? `${messageCount} message${messageCount === 1 ? '' : 's'} / ${replyCount ?? 0} repl${replyCount === 1 ? 'y' : 'ies'} captured`
    : 'Thread message/reply count not captured'

  return {
    status: flags.length ? 'watch' : 'supported',
    threadStatus,
    messageCount,
    replyCount,
    commentCount,
    latestActivityAt,
    ageDays: daysOld,
    participants,
    participantCount: participants.length,
    direction: {
      from,
      to,
      sourceAccount,
      label: from && to
        ? `From ${from} to ${to}`
        : from
          ? `From ${from}`
          : to
            ? `To ${to}`
            : 'Direction not captured',
    },
    sourceAccount,
    sourceContainer: normalizeText(item.sourceContainer),
    evidenceUseCount,
    linkedArtifactId: normalizeText(item.artifactId),
    linkedCandidateKey: normalizeText(item.candidateKey),
    linkedAtomId: normalizeText(item.atomId),
    corroboration,
    weakFlags: flags,
    weakFlagCodes: flags.map(flag => flag.code),
    confidenceLabel: flags.some(flag => flag.code === 'no_reply_captured' || flag.code === 'one_message_thread')
      ? 'weak proof'
      : corroboration.missing
        ? 'single-source proof'
        : 'corroborated proof',
  }
}

export function buildThreadContextSummary(items = []) {
  const contexts = items.map(item => item.threadContext).filter(Boolean)
  const weakFlags = contexts.flatMap(context => context.weakFlags || [])
  const latestActivityAt = contexts
    .map(context => context.latestActivityAt)
    .filter(Boolean)
    .sort((a, b) => (dateMillis(b) || 0) - (dateMillis(a) || 0))[0] || null
  return {
    itemCount: items.length,
    contextItemCount: contexts.length,
    weakFlagCount: weakFlags.length,
    oneMessageThreadCount: contexts.filter(context => (context.weakFlagCodes || []).includes('one_message_thread')).length,
    noReplyCapturedCount: contexts.filter(context => (context.weakFlagCodes || []).includes('no_reply_captured')).length,
    missingThreadStatusCount: contexts.filter(context => (context.weakFlagCodes || []).includes('thread_status_missing')).length,
    corroboratedItemCount: contexts.filter(context => context.corroboration?.status === 'cross_source').length,
    missingCorroborationCount: contexts.filter(context => context.corroboration?.missing).length,
    latestActivityAt,
    status: weakFlags.length ? 'watch' : 'supported',
  }
}

export function enrichSourceProofItemsWithThreadContext(items = [], options = {}) {
  const enriched = items.map(item => {
    const { metadata, threadMetadata, ...safeItem } = item
    return {
      ...safeItem,
      threadContext: buildThreadContextForProofItem(item, items, options),
    }
  })
  return {
    items: enriched,
    summary: buildThreadContextSummary(enriched),
  }
}

export function buildIntelThreadContextDogfoodProof() {
  const now = new Date('2026-05-20T08:00:00.000Z')
  const fixtureItems = [
    {
      sourceId: 'SRC-GMAIL-001',
      sourceType: 'email_thread',
      title: 'Automated lead notification',
      sourceAccount: 'steve@example.com',
      occurredAt: '2026-04-01T12:00:00.000Z',
      from: 'no-reply@followupboss.com',
      to: 'steve@example.com',
      participants: ['no-reply@followupboss.com', 'steve@example.com'],
      metadata: { messageCount: 1 },
      factSummaries: ['Lead source question'],
      atomId: 'atom-1',
      candidateKey: 'candidate-1',
      artifactId: 'artifact-1',
    },
    {
      sourceId: 'SRC-MISSIVE-001',
      sourceType: 'missive_thread',
      title: 'Owner replied on source issue',
      sourceAccount: 'steve@example.com',
      occurredAt: '2026-05-19T12:00:00.000Z',
      from: 'nick@example.com',
      to: 'steve@example.com',
      participants: ['nick@example.com', 'steve@example.com'],
      metadata: { messageCount: 3, commentCount: 2 },
      factSummaries: ['Owner response captured'],
      atomId: 'atom-2',
      candidateKey: 'candidate-2',
      artifactId: 'artifact-2',
    },
  ]
  const { items, summary } = enrichSourceProofItemsWithThreadContext(fixtureItems, { now })
  const oneMessage = items[0].threadContext
  const replyBacked = items[1].threadContext
  const checks = [
    { ok: oneMessage.weakFlagCodes.includes('one_message_thread'), check: 'one-message thread is flagged' },
    { ok: oneMessage.weakFlagCodes.includes('no_reply_captured'), check: 'no-reply thread is flagged' },
    { ok: oneMessage.weakFlagCodes.includes('system_drafted_or_automated_origin'), check: 'automated/system origin is flagged' },
    { ok: oneMessage.weakFlagCodes.includes('stale_thread'), check: 'stale thread is flagged' },
    { ok: !replyBacked.weakFlagCodes.includes('no_reply_captured'), check: 'reply-backed thread is not flagged as no-reply' },
    { ok: replyBacked.messageCount === 3 && replyBacked.replyCount === 2, check: 'reply count is derived from message count' },
    { ok: summary.corroboratedItemCount === 2 && summary.missingCorroborationCount === 0, check: 'multi-source route proof is treated as corroborated' },
    { ok: Boolean(replyBacked.latestActivityAt) && replyBacked.participantCount === 2, check: 'latest activity and participants are surfaced' },
  ]
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary,
    items,
  }
}
