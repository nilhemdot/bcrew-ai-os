export const EMAIL_ATTACHMENTS_CARD_ID = 'EMAIL-ATTACHMENTS-001'
export const EMAIL_ATTACHMENTS_NEXT_CARD_ID = 'FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001'
export const EMAIL_ATTACHMENTS_CLOSEOUT_KEY = 'email-attachments-next-bite-v1'
export const EMAIL_ATTACHMENTS_PLAN_PATH = 'docs/process/email-attachments-001-plan.md'
export const EMAIL_ATTACHMENTS_APPROVAL_PATH = 'docs/process/approvals/EMAIL-ATTACHMENTS-001.json'
export const EMAIL_ATTACHMENTS_SCRIPT_PATH = 'scripts/process-email-attachments-check.mjs'
export const EMAIL_ATTACHMENTS_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-email-attachments-next-bite-closeout.md'
export const EMAIL_ATTACHMENTS_TARGET_KEY = 'email-attachments-backfill'
export const EMAIL_ATTACHMENTS_JOB_KEY = 'email-attachment-extract-bite'
export const EMAIL_ATTACHMENTS_ICS_MIME = 'application/ics'
export const EMAIL_ATTACHMENTS_RETRY_PREFIXES = Object.freeze(['calendar_invite_not_in_v1'])

export const EMAIL_ATTACHMENTS_CHANGED_FILES = [
  'scripts/extract-email-attachments.mjs',
  'scripts/run-extraction-target.mjs',
  'scripts/seed-extraction-control.mjs',
  'lib/email-attachments-next-bite.js',
  EMAIL_ATTACHMENTS_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  EMAIL_ATTACHMENTS_PLAN_PATH,
  EMAIL_ATTACHMENTS_APPROVAL_PATH,
  EMAIL_ATTACHMENTS_CLOSEOUT_PATH,
]

export const EMAIL_ATTACHMENTS_PROOF_COMMANDS = [
  `node --check scripts/extract-email-attachments.mjs scripts/run-extraction-target.mjs lib/email-attachments-next-bite.js ${EMAIL_ATTACHMENTS_SCRIPT_PATH}`,
  'npm run process:email-attachments-check -- --apply --json',
  'npm run extraction:target -- --target=email-attachments-backfill --force=true --actor=codex-email-attachments-ics-proof',
  'npm run process:email-attachments-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${EMAIL_ATTACHMENTS_CARD_ID} --planApprovalRef=${EMAIL_ATTACHMENTS_APPROVAL_PATH} --closeoutKey=${EMAIL_ATTACHMENTS_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${EMAIL_ATTACHMENTS_CARD_ID} --closeoutKey=${EMAIL_ATTACHMENTS_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${EMAIL_ATTACHMENTS_CARD_ID} --planApprovalRef=${EMAIL_ATTACHMENTS_APPROVAL_PATH} --closeoutKey=${EMAIL_ATTACHMENTS_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const EMAIL_ATTACHMENTS_NOT_NEXT = [
  'Do not send emails or external messages.',
  'Do not mutate Gmail, Missive, Drive permissions, credentials, provider config, or keys.',
  'Do not run broad historical private extraction outside the bounded target.',
  'Do not add paid/provider/browser-auth extraction.',
  'Do not route OCR/images/audio/video through this text-only card.',
  'Do not start Value Builder split.',
]

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function add(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function buildEmailAttachmentsDogfoodProof() {
  const checks = []
  const healthy = {
    target: {
      status: 'active',
      runtimeMode: 'scheduled',
      budget: {
        maxItemsPerRun: 5,
        maxAttachmentBytes: 80000000,
        retrySkippedReasonPrefixes: [...EMAIL_ATTACHMENTS_RETRY_PREFIXES],
      },
      dedupePolicy: { idempotent: true },
    },
    code: {
      supportsApplicationIcs: true,
      prioritizesRetrySkips: true,
      sendsEmail: false,
      hasExplicitSkipManifest: true,
    },
  }
  const missingIcs = { ...healthy, code: { ...healthy.code, supportsApplicationIcs: false } }
  const hiddenRetry = { ...healthy, code: { ...healthy.code, prioritizesRetrySkips: false } }
  const unsafeSend = { ...healthy, code: { ...healthy.code, sendsEmail: true } }
  const weakBudget = {
    ...healthy,
    target: { ...healthy.target, budget: { maxItemsPerRun: 50, retrySkippedReasonPrefixes: [] } },
  }
  const vagueSkips = { ...healthy, code: { ...healthy.code, hasExplicitSkipManifest: false } }

  const evaluate = fixture => {
    const retryPrefixes = asArray(fixture.target?.budget?.retrySkippedReasonPrefixes)
    return Boolean(
      fixture.target?.status === 'active' &&
      fixture.target?.runtimeMode === 'scheduled' &&
      Number(fixture.target?.budget?.maxItemsPerRun || 0) <= 5 &&
      Number(fixture.target?.budget?.maxAttachmentBytes || 0) >= 1000000 &&
      EMAIL_ATTACHMENTS_RETRY_PREFIXES.every(prefix => retryPrefixes.includes(prefix)) &&
      fixture.target?.dedupePolicy?.idempotent === true &&
      fixture.code?.supportsApplicationIcs &&
      fixture.code?.prioritizesRetrySkips &&
      fixture.code?.hasExplicitSkipManifest &&
      fixture.code?.sendsEmail !== true
    )
  }

  add(checks, evaluate(healthy), 'healthy bounded attachment fixture passes')
  add(checks, !evaluate(missingIcs), 'dogfood rejects missing application/ics coverage')
  add(checks, !evaluate(hiddenRetry), 'dogfood rejects unsupported retry skips sitting behind fresh backlog')
  add(checks, !evaluate(unsafeSend), 'dogfood rejects email sends or external writes')
  add(checks, !evaluate(weakBudget), 'dogfood rejects unbounded or unowned retry budget')
  add(checks, !evaluate(vagueSkips), 'dogfood rejects vague unsupported skip manifest')

  return {
    ok: checks.every(check => check.ok),
    invariant: 'Email attachment next bite must add bounded calendar invite text coverage, prioritize newly-supported retry skips, and park unsafe multimodal/private expansion without sends or external writes.',
    checks,
    failed: checks.filter(check => !check.ok),
  }
}

export function summarizeEmailAttachmentRows(rows = []) {
  const summary = {
    failedCount: 0,
    skippedCount: 0,
    succeededCount: 0,
    icsSkippedCount: 0,
    icsSucceededCount: 0,
    unresolvedCalendarSkipCount: 0,
    skipReasons: {},
    mimeTypes: {},
  }

  for (const row of rows) {
    const status = lower(row.status)
    const retryReason = text(row.retry_reason || row.skip_reason)
    const mimeType = lower(row.mime_type)
    if (status === 'failed') summary.failedCount += 1
    if (status === 'skipped') summary.skippedCount += 1
    if (status === 'succeeded') summary.succeededCount += 1
    if (status === 'skipped' && mimeType === EMAIL_ATTACHMENTS_ICS_MIME) summary.icsSkippedCount += 1
    if (status === 'succeeded' && mimeType === EMAIL_ATTACHMENTS_ICS_MIME) summary.icsSucceededCount += 1
    if (status === 'skipped' && retryReason === 'calendar_invite_not_in_v1') summary.unresolvedCalendarSkipCount += 1
    if (status === 'skipped' && retryReason) summary.skipReasons[retryReason] = (summary.skipReasons[retryReason] || 0) + 1
    if (mimeType) summary.mimeTypes[mimeType] = (summary.mimeTypes[mimeType] || 0) + 1
  }

  return summary
}

export function buildEmailAttachmentsStatus({
  target,
  itemRows = [],
  latestTargetRun = null,
  latestJob = null,
  requireIcsRunProof = false,
} = {}) {
  const checks = []
  const budget = target?.budget || {}
  const metadata = target?.metadata || {}
  const retryPrefixes = asArray(budget.retrySkippedReasonPrefixes)
  const rowSummary = summarizeEmailAttachmentRows(itemRows)
  const latestCommand = asArray(latestTargetRun?.metadata?.command).join(' ')
  const latestRunSucceeded = latestTargetRun?.status === 'succeeded' || target?.lastStatus === 'succeeded'

  add(checks, target?.targetKey === EMAIL_ATTACHMENTS_TARGET_KEY && target?.status === 'active', 'email attachment target is active', target?.status || 'missing')
  add(checks, target?.runtimeMode === 'scheduled', 'email attachment target is scheduled', target?.runtimeMode || 'missing')
  add(checks, Number(budget.maxItemsPerRun || 0) > 0 && Number(budget.maxItemsPerRun || 0) <= 5, 'email attachment lane stays bounded to five attachments per run', String(budget.maxItemsPerRun || 'missing'))
  add(checks, Number(budget.maxAttachmentBytes || 0) >= 1000000, 'attachment extraction has bounded byte cap', String(budget.maxAttachmentBytes || 'missing'))
  add(checks, EMAIL_ATTACHMENTS_RETRY_PREFIXES.every(prefix => retryPrefixes.includes(prefix)), 'retry prefixes include calendar invite support recovery', retryPrefixes.join(', ') || 'missing')
  add(checks, target?.dedupePolicy?.idempotent === true, 'email attachment target remains idempotent', JSON.stringify(target?.dedupePolicy || {}))
  add(checks, latestRunSucceeded, 'latest email attachment target state is succeeded', latestTargetRun?.status || target?.lastStatus || 'missing')
  add(checks, latestJob?.status === 'succeeded' || latestJob == null, 'latest governed email attachment job is succeeded or not present', latestJob?.status || 'not_present')
  add(checks, rowSummary.failedCount === 0, 'email attachment lane has zero failed crawl items', String(rowSummary.failedCount))
  add(checks, metadata.foundationJobKey === EMAIL_ATTACHMENTS_JOB_KEY, 'target metadata links governed Foundation job', metadata.foundationJobKey || 'missing')
  add(checks, asArray(metadata.officialApiBasis).some(item => text(item).includes('Gmail users.messages.attachments.get')), 'metadata names Gmail attachment API basis', asArray(metadata.officialApiBasis).join(' | '))
  add(checks, !requireIcsRunProof || rowSummary.unresolvedCalendarSkipCount === 0, 'calendar invite skips are retired after proof run', String(rowSummary.unresolvedCalendarSkipCount))
  add(checks, !requireIcsRunProof || rowSummary.icsSucceededCount >= 1, 'at least one application/ics attachment is extracted after proof run', String(rowSummary.icsSucceededCount))
  add(checks, !requireIcsRunProof || latestCommand.includes('--retrySkippedReasonPrefixes=') && latestCommand.includes('calendar_invite_not_in_v1'), 'latest target run used bounded calendar retry command', latestCommand || 'missing command')

  return {
    ok: checks.every(check => check.ok),
    targetKey: EMAIL_ATTACHMENTS_TARGET_KEY,
    rowSummary,
    latestTargetRun,
    latestJob,
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
