export const DRIVE_CONTENT_CARD_ID = 'DRIVE-CONTENT-001'
export const DRIVE_CONTENT_NEXT_CARD_ID = 'EMAIL-ATTACHMENTS-001'
export const DRIVE_CONTENT_CLOSEOUT_KEY = 'drive-content-next-bite-v1'
export const DRIVE_CONTENT_PLAN_PATH = 'docs/process/drive-content-001-plan.md'
export const DRIVE_CONTENT_APPROVAL_PATH = 'docs/process/approvals/DRIVE-CONTENT-001.json'
export const DRIVE_CONTENT_SCRIPT_PATH = 'scripts/process-drive-content-check.mjs'
export const DRIVE_CONTENT_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-drive-content-next-bite-closeout.md'
export const DRIVE_CONTENT_TARGET_KEY = 'drive-content-extract-backfill'
export const DRIVE_CONTENT_JOB_KEY = 'drive-content-extract-bite'
export const DRIVE_CONTENT_DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const DRIVE_CONTENT_RETRY_PREFIXES = Object.freeze([
  'pdf_too_large_for_v1',
  'sheet_text_extraction_not_in_v1',
  'office_file_conversion_not_in_v1',
])

export const DRIVE_CONTENT_CHANGED_FILES = [
  'scripts/extract-drive-content.mjs',
  'scripts/run-extraction-target.mjs',
  'scripts/seed-extraction-control.mjs',
  'lib/foundation-source-crawl-store.js',
  'lib/foundation-extraction-runtime-verifier.js',
  'lib/drive-content-next-bite.js',
  DRIVE_CONTENT_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  DRIVE_CONTENT_PLAN_PATH,
  DRIVE_CONTENT_APPROVAL_PATH,
  DRIVE_CONTENT_CLOSEOUT_PATH,
]

export const DRIVE_CONTENT_PROOF_COMMANDS = [
  `node --check scripts/extract-drive-content.mjs scripts/run-extraction-target.mjs lib/foundation-source-crawl-store.js lib/drive-content-next-bite.js ${DRIVE_CONTENT_SCRIPT_PATH}`,
  'npm run process:drive-content-check -- --apply --json',
  'npm run extraction:target -- --target=drive-content-extract-backfill --force=true --actor=codex-drive-content-docx-proof',
  'npm run process:drive-content-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${DRIVE_CONTENT_CARD_ID} --planApprovalRef=${DRIVE_CONTENT_APPROVAL_PATH} --closeoutKey=${DRIVE_CONTENT_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${DRIVE_CONTENT_CARD_ID} --closeoutKey=${DRIVE_CONTENT_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${DRIVE_CONTENT_CARD_ID} --planApprovalRef=${DRIVE_CONTENT_APPROVAL_PATH} --closeoutKey=${DRIVE_CONTENT_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const DRIVE_CONTENT_NOT_NEXT = [
  'Do not mutate Google Drive permissions.',
  'Do not send request-access emails or external writes.',
  'Do not run broad Drive sweeps outside the bounded daily quota lane.',
  'Do not add paid/provider/browser-auth extraction.',
  'Do not route vision/OCR/video/media extraction through this text-only card.',
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

export function buildDriveContentDogfoodProof() {
  const checks = []
  const healthy = {
    target: {
      status: 'active',
      runtimeMode: 'scheduled',
      budget: {
        maxItemsPerRun: 5,
        maxOfficeBytes: 25000000,
        retrySkippedReasonPrefixes: [...DRIVE_CONTENT_RETRY_PREFIXES],
      },
      dedupePolicy: { idempotent: true },
    },
    code: {
      supportsDocx: true,
      prioritizesRetrySkips: true,
      mutatesDrivePermissions: false,
      hasExplicitSkipManifest: true,
    },
  }
  const missingDocx = { ...healthy, code: { ...healthy.code, supportsDocx: false } }
  const hiddenRetry = { ...healthy, code: { ...healthy.code, prioritizesRetrySkips: false } }
  const unsafeWrite = { ...healthy, code: { ...healthy.code, mutatesDrivePermissions: true } }
  const weakBudget = {
    ...healthy,
    target: { ...healthy.target, budget: { maxItemsPerRun: 50, retrySkippedReasonPrefixes: ['pdf_too_large_for_v1'] } },
  }
  const vagueSkips = { ...healthy, code: { ...healthy.code, hasExplicitSkipManifest: false } }

  const evaluate = fixture => {
    const retryPrefixes = asArray(fixture.target?.budget?.retrySkippedReasonPrefixes)
    return Boolean(
      fixture.target?.status === 'active' &&
      fixture.target?.runtimeMode === 'scheduled' &&
      Number(fixture.target?.budget?.maxItemsPerRun || 0) <= 5 &&
      Number(fixture.target?.budget?.maxOfficeBytes || 0) >= 1000000 &&
      DRIVE_CONTENT_RETRY_PREFIXES.every(prefix => retryPrefixes.includes(prefix)) &&
      fixture.target?.dedupePolicy?.idempotent === true &&
      fixture.code?.supportsDocx &&
      fixture.code?.prioritizesRetrySkips &&
      fixture.code?.hasExplicitSkipManifest &&
      fixture.code?.mutatesDrivePermissions !== true
    )
  }

  add(checks, evaluate(healthy), 'healthy bounded Drive content fixture passes')
  add(checks, !evaluate(missingDocx), 'dogfood rejects missing DOCX coverage')
  add(checks, !evaluate(hiddenRetry), 'dogfood rejects unsupported retry skips sitting behind fresh backlog')
  add(checks, !evaluate(unsafeWrite), 'dogfood rejects Drive permission mutation')
  add(checks, !evaluate(weakBudget), 'dogfood rejects unbounded or unowned retry budget')
  add(checks, !evaluate(vagueSkips), 'dogfood rejects vague unsupported skip manifest')

  return {
    ok: checks.every(check => check.ok),
    invariant: 'Drive content next bite must add bounded file coverage, prioritize newly-supported retry skips, and park unsafe Drive/media work without permission mutation.',
    checks,
    failed: checks.filter(check => !check.ok),
  }
}

export function summarizeDriveContentRows(rows = []) {
  const summary = {
    failedCount: 0,
    skippedCount: 0,
    succeededCount: 0,
    docxSkippedCount: 0,
    docxSucceededCount: 0,
    unresolvedOfficeSkipCount: 0,
    skipReasons: {},
    mimeTypes: {},
  }

  for (const row of rows) {
    const status = lower(row.status)
    const retryReason = text(row.retry_reason)
    const mimeType = text(row.mime_type)
    if (status === 'failed') summary.failedCount += 1
    if (status === 'skipped') summary.skippedCount += 1
    if (status === 'succeeded') summary.succeededCount += 1
    if (status === 'skipped' && mimeType === DRIVE_CONTENT_DOCX_MIME) summary.docxSkippedCount += 1
    if (status === 'succeeded' && mimeType === DRIVE_CONTENT_DOCX_MIME) summary.docxSucceededCount += 1
    if (status === 'skipped' && retryReason === 'office_file_conversion_not_in_v1') summary.unresolvedOfficeSkipCount += 1
    if (retryReason) summary.skipReasons[retryReason] = (summary.skipReasons[retryReason] || 0) + 1
    if (mimeType) summary.mimeTypes[mimeType] = (summary.mimeTypes[mimeType] || 0) + 1
  }

  return summary
}

export function buildDriveContentStatus({
  target,
  itemRows = [],
  latestTargetRun = null,
  latestJob = null,
  requireDocxRunProof = false,
} = {}) {
  const checks = []
  const budget = target?.budget || {}
  const metadata = target?.metadata || {}
  const retryPrefixes = asArray(budget.retrySkippedReasonPrefixes)
  const rowSummary = summarizeDriveContentRows(itemRows)
  const latestCommand = asArray(latestTargetRun?.metadata?.command).join(' ')
  const latestRunSucceeded = latestTargetRun?.status === 'succeeded' || target?.lastStatus === 'succeeded'

  add(checks, target?.targetKey === DRIVE_CONTENT_TARGET_KEY && target?.status === 'active', 'Drive content target is active', target?.status || 'missing')
  add(checks, target?.runtimeMode === 'scheduled', 'Drive content target is scheduled', target?.runtimeMode || 'missing')
  add(checks, Number(budget.maxItemsPerRun || 0) > 0 && Number(budget.maxItemsPerRun || 0) <= 5, 'Drive content stays bounded to five files per run', String(budget.maxItemsPerRun || 'missing'))
  add(checks, Number(budget.maxOfficeBytes || 0) >= 1000000, 'Office extraction has bounded byte cap', String(budget.maxOfficeBytes || 'missing'))
  add(checks, DRIVE_CONTENT_RETRY_PREFIXES.every(prefix => retryPrefixes.includes(prefix)), 'retry prefixes include PDF, sheet, and Office support recovery', retryPrefixes.join(', ') || 'missing')
  add(checks, target?.dedupePolicy?.idempotent === true, 'Drive content target remains idempotent', JSON.stringify(target?.dedupePolicy || {}))
  add(checks, latestRunSucceeded, 'latest Drive content target state is succeeded', latestTargetRun?.status || target?.lastStatus || 'missing')
  add(checks, latestJob?.status === 'succeeded' || latestJob == null, 'latest governed Drive content job is succeeded or not present', latestJob?.status || 'not_present')
  add(checks, rowSummary.failedCount === 0, 'Drive content has zero failed crawl items', String(rowSummary.failedCount))
  add(checks, metadata.foundationJobKey === DRIVE_CONTENT_JOB_KEY, 'target metadata links governed Foundation job', metadata.foundationJobKey || 'missing')
  add(checks, asArray(metadata.officialApiBasis).some(item => text(item).includes('DOCX')), 'metadata names DOCX local text extraction basis', asArray(metadata.officialApiBasis).join(' | '))
  add(checks, !requireDocxRunProof || rowSummary.unresolvedOfficeSkipCount === 0, 'DOCX office conversion skips are retired after proof run', String(rowSummary.unresolvedOfficeSkipCount))
  add(checks, !requireDocxRunProof || rowSummary.docxSucceededCount >= 1, 'at least one DOCX Drive artifact is extracted after proof run', String(rowSummary.docxSucceededCount))
  add(checks, !requireDocxRunProof || latestCommand.includes('--maxOfficeBytes=') && latestCommand.includes('office_file_conversion_not_in_v1'), 'latest target run used bounded Office retry command', latestCommand || 'missing command')

  return {
    ok: checks.every(check => check.ok),
    targetKey: DRIVE_CONTENT_TARGET_KEY,
    rowSummary,
    latestTargetRun,
    latestJob,
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
