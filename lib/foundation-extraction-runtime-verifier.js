export const VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID = 'VERIFIER-EXTRACTION-RUNTIME-SPLIT-MODULE-001'
export const VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-extraction-runtime-split-module-v1'
export const VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-extraction-runtime-split-module-001-plan.md'
export const VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-EXTRACTION-RUNTIME-SPLIT-MODULE-001.json'
export const VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-extraction-runtime-split-module-check.mjs'
export const VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_SPRINT_ID = 'verifier-extraction-runtime-split-module-2026-05-16'
export const VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_BEFORE_LINES = 14081

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function summary(checks) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

export function evaluateFoundationExtractionRuntimeVerifier(input = {}) {
  const checks = []
  const foundationDbSource = input.foundationDbSource || ''
  const foundationWorkerSource = input.foundationWorkerSource || ''
  const foundationJobsSource = input.foundationJobsSource || ''
  const extractionTargetSource = input.extractionTargetSource || ''
  const videoInventorySource = input.videoInventorySource || ''
  const currentPlan = input.currentPlan || ''
  const currentState = input.currentState || ''
  const extractionControlSeedSource = input.extractionControlSeedSource || ''
  const googleDelegatedSource = input.googleDelegatedSource || ''
  const driveContentExtractionSource = input.driveContentExtractionSource || ''
  const packageSource = input.packageSource || ''
  const driveLinkInventorySource = input.driveLinkInventorySource || ''
  const sharedCandidateExtractionSource = input.sharedCandidateExtractionSource || ''
  const processingProvenanceGaps = Array.isArray(input.processingProvenanceGaps) ? input.processingProvenanceGaps : []
  const staleLlmCalls = Array.isArray(input.staleLlmCalls) ? input.staleLlmCalls : []

  addCheck(
    checks,
    includesAll(foundationDbSource, ['markStaleFoundationJobRuns', 'Marked failed by stale active-run reaper', 'markStaleLlmCalls', 'Marked failed by stale LLM call reaper', 'markStaleSourceCrawlTargetRuns', 'Marked failed by stale source-crawl run reaper']) &&
      includesAll(foundationWorkerSource, ['markStaleFoundationJobRuns', 'markStaleLlmCalls', 'markStaleSourceCrawlTargetRuns', 'job ' + '${job.key}' + ' failed before completion', 'Foundation worker pass failed']),
    'Foundation worker catches job failures and reaps stale active runs/calls',
    'worker pass catches per-job failures, continues looping, and marks stale queued/running job runs, stale source-crawl target runs, and planned/started LLM calls failed before selecting due jobs',
  )
  addCheck(
    checks,
    foundationJobsSource.includes("args: ['run', 'extraction:target', '--', '--target=video-link-inventory']") &&
      extractionTargetSource.includes("target.targetKey === 'video-link-inventory'") &&
      extractionTargetSource.includes('--controlledByTargetRunner=true') &&
      videoInventorySource.includes('Refusing non-dry-run video link inventory outside extraction:target'),
    'video-link inventory runs through extraction target control',
    'job uses extraction:target, target runner passes controlled flag, raw script refuses direct non-dry-run writes',
  )
  addCheck(
    checks,
    includesAll(currentPlan, ['Corpus mission lane', 'daily quota missions', 'files the outputs with provenance']) &&
      includesAll(currentState, ['daily quota missions', 'file outputs with provenance']) &&
      includesAll(extractionControlSeedSource, ['missionMode', 'daily_quota', 'dailyMissionQuota', 'requiresFiledOutput']),
    'corpus extraction uses daily mission quotas instead of blind timers',
    'Drive/video/Skool/Zoom/report corpus lanes are seeded and documented as quota missions with filed-output expectations',
  )
  addCheck(
    checks,
    includesAll(foundationJobsSource, [
      "key: 'meeting-notes-sync-current'",
      "key: 'slack-sync-current'",
      "key: 'drive-corpus-inventory-bite'",
      "key: 'gmail-extract-latest'",
      "key: 'missive-extract-latest'",
      "key: 'meeting-transcripts-extract-backlog'",
      "key: 'slack-extract-latest'",
      "key: 'drive-content-extract-bite'",
      "key: 'email-attachment-extract-bite'",
      "key: 'video-content-extract-bite'",
      "runtimeMode: 'scheduled'",
      'scheduleEveryMinutes: 1440',
      "'--onlyWithoutCandidates=true'",
    ]) &&
      includesAll(extractionControlSeedSource, [
        "targetKey: 'meetings-current-day'",
        "targetKey: 'slack-current-day'",
        "targetKey: 'drive-corpus-backfill'",
        "targetKey: 'drive-content-extract-backfill'",
        "targetKey: 'email-attachments-backfill'",
        "targetKey: 'video-content-extract-backfill'",
        "runtimeMode: 'scheduled'",
        'scheduleEveryMinutes: 1440',
      ]),
    'core sources have scheduled current-day and daily history/mission lanes',
    'meetings/slack current sync, Gmail/Missive/meeting/Slack extraction, Drive inventory/content, Gmail attachments, and video content extraction are scheduled with daily quotas',
  )
  addCheck(
    checks,
    includesAll(extractionTargetSource, [
      "target.targetKey === 'drive-content-extract-backfill'",
      '--maxPdfBytes=',
      '--maxSheets=',
      '--maxSheetRows=',
      '--retrySkippedReasonPrefixes=',
    ]) &&
      includesAll(extractionControlSeedSource, [
        'maxPdfBytes: 80000000',
        "retrySkippedReasonPrefixes: ['pdf_too_large_for_v1', 'sheet_text_extraction_not_in_v1']",
        'maxSheetRows: 200',
      ]) &&
      includesAll(foundationDbSource, [
        'listDriveContentExtractionQueue',
        'retrySkippedReasonPrefixes',
        'drive_document',
        'drive_spreadsheet',
        'drive_pdf',
        'drive_text',
        'application/vnd.google-apps.spreadsheet',
        'text/markdown',
        'parentPathIncludes',
        'fileIds',
      ]) &&
      includesAll(googleDelegatedSource, [
        'getSpreadsheetMetadata',
        'getSheetValues',
      ]) &&
      includesAll(driveContentExtractionSource, [
        'GOOGLE_SHEET_MIME',
        'extractGoogleSheetText',
        'drive_google_sheet_values_v1',
        'extractPdfTextWithOcr',
        'empty_text_after_ocr_needs_vision_handwriting_extraction',
        'drive_pdf_tesseract_ocr_v1',
      ]) &&
      includesAll(packageSource, ['"drive:inventory-links"']) &&
      includesAll(driveLinkInventorySource, [
        'extractLinks',
        'createDrivePermission',
        'sendGmailMessage',
        'drive_link_access_request',
      ]),
    'Drive content extraction target supports governed Docs/Sheets/PDF/text/markdown/OCR/link inventory',
    'target runner passes sheet/PDF caps, retry prefixes, and DB queue/script support Drive document/spreadsheet/PDF/text/markdown artifacts, OCR fallback, and linked-doc access requests',
  )
  addCheck(
    checks,
    includesAll(extractionTargetSource, [
      "target.targetKey === 'email-attachments-backfill'",
      '--maxAttachmentBytes=',
      '--maxTextChars=',
    ]) &&
      includesAll(extractionControlSeedSource, [
        "targetKey: 'email-attachments-backfill'",
        'maxAttachmentBytes: 80000000',
        "missionUnit: 'email_attachment_text_outputs'",
      ]) &&
      includesAll(foundationDbSource, [
        'getSourceCrawlItemsByExternalId',
        'gmail_attachment',
      ]),
    'Gmail attachment extraction target is governed and source-ledgered',
    'target runner passes attachment/text caps and DB artifacts/crawl items include gmail_attachment support',
  )
  addCheck(
    checks,
    includesAll(extractionTargetSource, [
      "target.targetKey === 'video-content-extract-backfill'",
      'video:extract-content',
      '--maxTextChars=',
    ]) &&
      includesAll(extractionControlSeedSource, [
        "targetKey: 'video-content-extract-backfill'",
        "missionUnit: 'video_transcript_outputs'",
        'DataForSEO YouTube Video Subtitles live advanced',
      ]) &&
      includesAll(foundationDbSource, [
        'listVideoContentExtractionQueue',
        'video_transcript',
      ]),
    'video content extraction target is governed and source-ledgered',
    'target runner passes text caps and DB queue/artifact constraints include the video transcript lane',
  )
  addCheck(
    checks,
    foundationDbSource.includes('artifact_content_hash') &&
      foundationDbSource.includes('COALESCE(processing.artifact_content_hash') &&
      !foundationDbSource.includes('active_candidate.artifact_id IS NULL'),
    'shared-comms processing selector is content-hash scoped',
    'current-content processing runs, not candidate existence, control extraction eligibility',
  )
  addCheck(
    checks,
    includesAll(sharedCandidateExtractionSource, ['requestedModel', 'provider', 'authPath', 'routeKey', 'llmCallId']),
    'shared-comms extraction records actual LLM route provenance',
    'candidate metadata carries requested model plus actual provider/auth path/route/model',
  )
  addCheck(
    checks,
    processingProvenanceGaps.length === 0,
    'shared-comms processing runs have routed LLM provenance',
    processingProvenanceGaps.length
      ? processingProvenanceGaps.map(item => `${item.runId}:${item.artifactId}`).join(', ')
      : 'no post-hardening candidate extraction rows missing hash/provider/auth/route/model',
  )
  addCheck(
    checks,
    staleLlmCalls.length === 0,
    'llm_calls has no timeout-expired planned/started calls',
    staleLlmCalls.length
      ? staleLlmCalls.map(item => `${item.callId}:${item.status}:${item.ageSeconds}s>${item.timeoutSeconds + item.graceSeconds}s`).join(', ')
      : 'no planned/started LLM calls older than their timeout plus grace',
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summary(checks),
  }
}

function buildHealthyFixture() {
  return {
    foundationDbSource: [
      'markStaleFoundationJobRuns Marked failed by stale active-run reaper',
      'markStaleLlmCalls Marked failed by stale LLM call reaper',
      'markStaleSourceCrawlTargetRuns Marked failed by stale source-crawl run reaper',
      'listDriveContentExtractionQueue retrySkippedReasonPrefixes drive_document drive_spreadsheet drive_pdf drive_text application/vnd.google-apps.spreadsheet text/markdown parentPathIncludes fileIds',
      'getSourceCrawlItemsByExternalId gmail_attachment listVideoContentExtractionQueue video_transcript',
      'artifact_content_hash COALESCE(processing.artifact_content_hash',
    ].join('\n'),
    foundationWorkerSource: 'markStaleFoundationJobRuns markStaleLlmCalls markStaleSourceCrawlTargetRuns job ${job.key} failed before completion Foundation worker pass failed',
    foundationJobsSource: [
      "args: ['run', 'extraction:target', '--', '--target=video-link-inventory']",
      "key: 'meeting-notes-sync-current'",
      "key: 'slack-sync-current'",
      "key: 'drive-corpus-inventory-bite'",
      "key: 'gmail-extract-latest'",
      "key: 'missive-extract-latest'",
      "key: 'meeting-transcripts-extract-backlog'",
      "key: 'slack-extract-latest'",
      "key: 'drive-content-extract-bite'",
      "key: 'email-attachment-extract-bite'",
      "key: 'video-content-extract-bite'",
      "runtimeMode: 'scheduled'",
      'scheduleEveryMinutes: 1440',
      "'--onlyWithoutCandidates=true'",
    ].join('\n'),
    extractionTargetSource: [
      "target.targetKey === 'video-link-inventory'",
      '--controlledByTargetRunner=true',
      "target.targetKey === 'drive-content-extract-backfill'",
      '--maxPdfBytes= --maxSheets= --maxSheetRows= --retrySkippedReasonPrefixes=',
      "target.targetKey === 'email-attachments-backfill'",
      '--maxAttachmentBytes= --maxTextChars=',
      "target.targetKey === 'video-content-extract-backfill'",
      'video:extract-content',
    ].join('\n'),
    videoInventorySource: 'Refusing non-dry-run video link inventory outside extraction:target',
    currentPlan: 'Corpus mission lane daily quota missions files the outputs with provenance',
    currentState: 'daily quota missions file outputs with provenance',
    extractionControlSeedSource: [
      'missionMode daily_quota dailyMissionQuota requiresFiledOutput',
      "targetKey: 'meetings-current-day'",
      "targetKey: 'slack-current-day'",
      "targetKey: 'drive-corpus-backfill'",
      "targetKey: 'drive-content-extract-backfill'",
      "targetKey: 'email-attachments-backfill'",
      "targetKey: 'video-content-extract-backfill'",
      "runtimeMode: 'scheduled'",
      'scheduleEveryMinutes: 1440',
      'maxPdfBytes: 80000000',
      "retrySkippedReasonPrefixes: ['pdf_too_large_for_v1', 'sheet_text_extraction_not_in_v1']",
      'maxSheetRows: 200',
      'maxAttachmentBytes: 80000000',
      "missionUnit: 'email_attachment_text_outputs'",
      "missionUnit: 'video_transcript_outputs'",
      'DataForSEO YouTube Video Subtitles live advanced',
    ].join('\n'),
    googleDelegatedSource: 'getSpreadsheetMetadata getSheetValues',
    driveContentExtractionSource: 'GOOGLE_SHEET_MIME extractGoogleSheetText drive_google_sheet_values_v1 extractPdfTextWithOcr empty_text_after_ocr_needs_vision_handwriting_extraction drive_pdf_tesseract_ocr_v1',
    packageSource: '"drive:inventory-links"',
    driveLinkInventorySource: 'extractLinks createDrivePermission sendGmailMessage drive_link_access_request',
    sharedCandidateExtractionSource: 'requestedModel provider authPath routeKey llmCallId',
    processingProvenanceGaps: [],
    staleLlmCalls: [],
  }
}

export function buildFoundationExtractionRuntimeVerifierDogfoodProof() {
  const healthy = evaluateFoundationExtractionRuntimeVerifier(buildHealthyFixture())
  const missingWorkerReaper = evaluateFoundationExtractionRuntimeVerifier({
    ...buildHealthyFixture(),
    foundationWorkerSource: 'Foundation worker pass failed',
  })
  const missingCorpusQuota = evaluateFoundationExtractionRuntimeVerifier({
    ...buildHealthyFixture(),
    extractionControlSeedSource: "targetKey: 'drive-content-extract-backfill'",
  })
  const missingDriveExtractionSupport = evaluateFoundationExtractionRuntimeVerifier({
    ...buildHealthyFixture(),
    driveContentExtractionSource: 'GOOGLE_SHEET_MIME extractGoogleSheetText',
  })
  const missingLlmProvenance = evaluateFoundationExtractionRuntimeVerifier({
    ...buildHealthyFixture(),
    sharedCandidateExtractionSource: 'requestedModel',
    processingProvenanceGaps: [{ runId: 'run-1', artifactId: 'artifact-1' }],
    staleLlmCalls: [{ callId: 'call-1', status: 'planned', ageSeconds: 600, timeoutSeconds: 240, graceSeconds: 60 }],
  })

  const rejected = {
    missingWorkerReaper,
    missingCorpusQuota,
    missingDriveExtractionSupport,
    missingLlmProvenance,
  }
  return {
    ok: healthy.ok === true &&
      Object.values(rejected).every(result => result.ok === false) &&
      missingWorkerReaper.checks.some(check => check.check === 'Foundation worker catches job failures and reaps stale active runs/calls' && !check.ok) &&
      missingCorpusQuota.checks.some(check => check.check === 'corpus extraction uses daily mission quotas instead of blind timers' && !check.ok) &&
      missingDriveExtractionSupport.checks.some(check => check.check === 'Drive content extraction target supports governed Docs/Sheets/PDF/text/markdown/OCR/link inventory' && !check.ok) &&
      missingLlmProvenance.checks.some(check => check.check === 'shared-comms extraction records actual LLM route provenance' && !check.ok) &&
      missingLlmProvenance.checks.some(check => check.check === 'shared-comms processing runs have routed LLM provenance' && !check.ok) &&
      missingLlmProvenance.checks.some(check => check.check === 'llm_calls has no timeout-expired planned/started calls' && !check.ok),
    healthy,
    rejected,
    dogfoodInvariant: 'Healthy extraction/runtime fixture passes; missing worker reapers, corpus quotas, Drive extraction support, or LLM provenance fail closed.',
  }
}
