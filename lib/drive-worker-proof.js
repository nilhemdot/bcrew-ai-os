export const DRIVE_WORKER_CARD_ID = 'DRIVE-WORKER-001'
export const DRIVE_WORKER_CLOSEOUT_KEY = 'drive-worker-governed-v1'
export const DRIVE_WORKER_PLAN_PATH = 'docs/process/drive-worker-001-plan.md'
export const DRIVE_WORKER_APPROVAL_PATH = 'docs/process/approvals/DRIVE-WORKER-001.json'
export const DRIVE_WORKER_SCRIPT_PATH = 'scripts/process-drive-worker-check.mjs'
export const DRIVE_WORKER_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-drive-worker-governed-closeout.md'
export const DRIVE_WORKER_NEXT_CARD_ID = 'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001'
export const DRIVE_CORPUS_TARGET_KEY = 'drive-corpus-backfill'
export const DRIVE_CONTENT_TARGET_KEY = 'drive-content-extract-backfill'

export const DRIVE_WORKER_CHANGED_FILES = [
  'lib/drive-worker-proof.js',
  DRIVE_WORKER_SCRIPT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  DRIVE_WORKER_PLAN_PATH,
  DRIVE_WORKER_APPROVAL_PATH,
  DRIVE_WORKER_CLOSEOUT_PATH,
  'package.json',
]

export const DRIVE_WORKER_PROOF_COMMANDS = [
  'node --check lib/drive-worker-proof.js scripts/process-drive-worker-check.mjs',
  'npm run process:drive-worker-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=DRIVE-WORKER-001 --planApprovalRef=docs/process/approvals/DRIVE-WORKER-001.json --closeoutKey=drive-worker-governed-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=DRIVE-WORKER-001 --closeoutKey=drive-worker-governed-v1',
  'npm run process:foundation-ship -- --card=DRIVE-WORKER-001 --planApprovalRef=docs/process/approvals/DRIVE-WORKER-001.json --closeoutKey=drive-worker-governed-v1 --commitRef=HEAD',
]

const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document'
const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet'
const GOOGLE_SLIDE_MIME = 'application/vnd.google-apps.presentation'
const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder'
const GOOGLE_SHORTCUT_MIME = 'application/vnd.google-apps.shortcut'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PDF_MIME = 'application/pdf'

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  drivePermissionMutationStarted: false,
  requestAccessEmailSent: false,
  broadDriveSweepStarted: false,
  externalWritesStarted: false,
  credentialMutationStarted: false,
  providerCallsStarted: false,
  browserAuthStarted: false,
  mediaDownloadStarted: false,
  visionOcrModelCallsStarted: false,
  downstreamWritesStarted: false,
})

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function metadataOf(row = {}) {
  return row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
}

function sideEffectViolations(sideEffects = {}) {
  return Object.entries({ ...DEFAULT_SIDE_EFFECTS, ...sideEffects })
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
}

function add(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function countBy(rows = [], fn) {
  const counts = {}
  for (const row of rows) {
    const key = text(fn(row)) || 'unknown'
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

function uniqueCount(rows = [], fn) {
  return new Set(rows.map(fn).map(text).filter(Boolean)).size
}

function classifyDriveMime(mimeType = '') {
  const mime = lower(mimeType)
  if (mime === GOOGLE_FOLDER_MIME) return 'inventory_folder'
  if (mime === GOOGLE_DOC_MIME) return 'supported_text'
  if (mime === GOOGLE_SHEET_MIME) return 'supported_sheet_text'
  if (mime === PDF_MIME) return 'supported_pdf_or_ocr_followup'
  if (mime === DOCX_MIME) return 'supported_docx_text'
  if (mime === 'text/plain' || mime === 'text/markdown') return 'supported_plain_text'
  if (mime === GOOGLE_SHORTCUT_MIME) return 'shortcut_resolution_followup'
  if (mime === GOOGLE_SLIDE_MIME || mime.includes('presentation')) return 'slides_worker_followup'
  if (mime.includes('video') || mime.includes('audio')) return 'media_multimodal_followup'
  if (mime.includes('image') || mime.includes('drawing') || mime.includes('form')) return 'unsupported_or_vision_followup'
  return 'unsupported_or_needs_classification'
}

export function summarizeDriveWorkerLedger({ corpusItems = [], contentItems = [] } = {}) {
  const corpusMimes = countBy(corpusItems, row => metadataOf(row).mimeType)
  const contentMimes = countBy(contentItems, row => metadataOf(row).mimeType || row.mime_type)
  const contentStatuses = countBy(contentItems, row => row.status)
  const retryReasons = countBy([...corpusItems, ...contentItems], row => row.retry_reason || metadataOf(row).skipReason || metadataOf(row).retryReason)
  const routeCounts = countBy(corpusItems, row => classifyDriveMime(metadataOf(row).mimeType))
  const driveFileIdCount = uniqueCount(corpusItems, row => metadataOf(row).driveFileId)
  const corpusItemCount = corpusItems.length
  const duplicateFingerprintCount = Math.max(0, corpusItemCount - driveFileIdCount)
  const supportedContentCount = contentItems.filter(row => lower(row.status) === 'succeeded').length
  const explicitSkipCount = [...corpusItems, ...contentItems].filter(row => text(row.retry_reason || metadataOf(row).skipReason || metadataOf(row).retryReason)).length
  return {
    corpusItemCount,
    contentItemCount: contentItems.length,
    driveFileIdCount,
    duplicateFingerprintCount,
    supportedContentCount,
    explicitSkipCount,
    corpusMimes,
    contentMimes,
    contentStatuses,
    retryReasons,
    routeCounts,
  }
}

export function buildDriveWorkerRouteMatrix() {
  return [
    {
      route: 'folder_file_inventory',
      status: 'live_bounded',
      targetKey: DRIVE_CORPUS_TARGET_KEY,
      handles: ['folders', 'file metadata', 'parent path', 'sensitivity', 'Drive file IDs', 'mime classification'],
      blocked: ['permission mutation', 'request-access emails', 'broad unbounded sweeps'],
      nextAction: 'Continue scheduled inventory bites and keep cursor/ledger proof visible.',
    },
    {
      route: 'text_content_extraction',
      status: 'live_bounded',
      targetKey: DRIVE_CONTENT_TARGET_KEY,
      handles: ['Google Docs', 'Google Sheets', 'PDF text', 'DOCX', 'plain text', 'markdown'],
      blocked: ['Drive permission mutation', 'unsupported media conversion', 'broad Drive sweeps'],
      nextAction: 'Continue daily content bites with manifests, skip reasons, and provenance.',
    },
    {
      route: 'shortcut_resolution',
      status: 'followup_bounded',
      targetKey: DRIVE_CORPUS_TARGET_KEY,
      handles: ['shortcut metadata and target IDs when visible'],
      blocked: ['request-access email', 'permission create/update/delete'],
      nextAction: 'Resolve target metadata only where visible; park access-required shortcuts with explicit skip reason.',
    },
    {
      route: 'slides_office_expansion',
      status: 'followup_bounded',
      targetKey: DRIVE_CONTENT_TARGET_KEY,
      handles: ['Slides/PPTX/XLSX as separate file-type bites'],
      blocked: ['giant conversion sweep', 'provider/model calls'],
      nextAction: 'Add Slides and remaining Office file types as separate capped extraction bites.',
    },
    {
      route: 'media_vision_multimodal',
      status: 'approval_or_multimodal_followup',
      targetKey: 'MEETING-VIDEO-001 / MULTIMODAL-EXTRACTOR-001',
      handles: ['videos', 'audio', 'image PDFs', 'screenshots', 'handwriting'],
      blocked: ['video download', 'OCR/model calls', 'screenshot/keyframe storage without policy'],
      nextAction: 'Route to meeting-video or multimodal workers with source-specific packet and artifact policy.',
    },
  ]
}

export function buildDriveWorkerStatus(input = {}) {
  const corpusTarget = input.corpusTarget || {}
  const contentTarget = input.contentTarget || {}
  const corpusItems = list(input.corpusItems)
  const contentItems = list(input.contentItems)
  const sideEffects = { ...DEFAULT_SIDE_EFFECTS, ...(input.sideEffects || {}) }
  const sideEffectsStarted = sideEffectViolations(sideEffects)
  const summary = summarizeDriveWorkerLedger({ corpusItems, contentItems })
  const routeMatrix = buildDriveWorkerRouteMatrix()
  const checks = []

  add(checks, corpusTarget.targetKey === DRIVE_CORPUS_TARGET_KEY && corpusTarget.status === 'active', 'Drive corpus inventory target is active', corpusTarget.status || 'missing')
  add(checks, contentTarget.targetKey === DRIVE_CONTENT_TARGET_KEY && contentTarget.status === 'active', 'Drive content extraction target is active', contentTarget.status || 'missing')
  add(checks, corpusTarget.lastStatus === 'succeeded' && contentTarget.lastStatus === 'succeeded', 'Drive worker source targets latest state succeeded', `${corpusTarget.lastStatus || 'missing'} / ${contentTarget.lastStatus || 'missing'}`)
  add(checks, summary.corpusItemCount >= 200, 'Drive corpus inventory has material ledger rows', String(summary.corpusItemCount))
  add(checks, summary.contentItemCount >= 100 && summary.supportedContentCount >= 100, 'Drive content lane has material extracted content rows', `${summary.supportedContentCount}/${summary.contentItemCount}`)
  add(checks, summary.driveFileIdCount >= 150, 'Drive inventory carries stable Drive file IDs for duplicate detection', String(summary.driveFileIdCount))
  add(checks, ['supported_text', 'supported_sheet_text', 'supported_pdf_or_ocr_followup', 'supported_docx_text'].every(route => Number(summary.routeCounts[route] || 0) > 0), 'Drive inventory route matrix sees supported text/file classes', JSON.stringify(summary.routeCounts))
  add(checks, routeMatrix.length >= 5 && routeMatrix.every(row => row.route && row.status && row.nextAction), 'Drive worker route matrix names owned lanes and next actions', routeMatrix.map(row => `${row.route}:${row.status}`).join(', '))
  add(checks, summary.explicitSkipCount >= 20, 'Drive worker preserves explicit skip/retry reasons', String(summary.explicitSkipCount))
  add(checks, sideEffectsStarted.length === 0, 'no Drive permission/external/provider side effects occurred', sideEffectsStarted.join(', ') || 'none')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'ready',
    summary,
    routeMatrix,
    sideEffects,
    checks,
    failed,
  }
}

export function buildDriveWorkerDogfoodProof() {
  const healthy = {
    corpusTarget: { targetKey: DRIVE_CORPUS_TARGET_KEY, status: 'active', lastStatus: 'succeeded' },
    contentTarget: { targetKey: DRIVE_CONTENT_TARGET_KEY, status: 'active', lastStatus: 'succeeded' },
    corpusItems: Array.from({ length: 220 }, (_, index) => ({
      status: 'succeeded',
      retry_reason: index % 2 ? 'pdf_not_exported_in_v1' : 'doc_text_export_deferred_in_v1',
      metadata: {
        driveFileId: `drive-${index}`,
        mimeType: [GOOGLE_DOC_MIME, GOOGLE_SHEET_MIME, PDF_MIME, DOCX_MIME][index % 4],
      },
    })),
    contentItems: Array.from({ length: 120 }, (_, index) => ({
      status: 'succeeded',
      retry_reason: 'content_extracted',
      metadata: {
        driveFileId: `content-${index}`,
        mimeType: [GOOGLE_DOC_MIME, GOOGLE_SHEET_MIME, PDF_MIME, DOCX_MIME][index % 4],
      },
    })),
  }
  const missingCorpus = { ...healthy, corpusItems: [] }
  const failedTarget = { ...healthy, corpusTarget: { ...healthy.corpusTarget, lastStatus: 'failed' } }
  const unsafeWrite = { ...healthy, sideEffects: { drivePermissionMutationStarted: true } }
  const vagueSkips = {
    ...healthy,
    corpusItems: healthy.corpusItems.map(row => ({ ...row, retry_reason: '' })),
    contentItems: healthy.contentItems.map(row => ({ ...row, retry_reason: '' })),
  }
  const cases = {
    healthy: buildDriveWorkerStatus(healthy),
    missingCorpus: buildDriveWorkerStatus(missingCorpus),
    failedTarget: buildDriveWorkerStatus(failedTarget),
    unsafeWrite: buildDriveWorkerStatus(unsafeWrite),
    vagueSkips: buildDriveWorkerStatus(vagueSkips),
  }
  const rejectedCases = {
    missingCorpus: cases.missingCorpus.ok === false,
    failedTarget: cases.failedTarget.ok === false,
    unsafeWrite: cases.unsafeWrite.ok === false,
    vagueSkips: cases.vagueSkips.ok === false,
  }
  return {
    ok: cases.healthy.ok === true && Object.values(rejectedCases).every(Boolean),
    cases,
    rejectedCases,
    invariant: 'Drive worker V1 is only healthy when inventory and content targets are live/succeeded, ledger rows have stable file IDs and explicit skip reasons, route lanes are owned, and Drive permission/provider side effects stay blocked.',
  }
}
