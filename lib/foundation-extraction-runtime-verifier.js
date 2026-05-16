import {
  CRAWL_RUN_LEDGER_CARD_ID,
  CRAWL_RUN_LEDGER_CLOSEOUT_KEY,
  evaluateCrawlRunLedgerSources,
} from './crawl-run-ledger.js'
import {
  EXTRACT_RETIRE_CARD_ID,
  EXTRACT_RETIRE_CLOSEOUT_KEY,
  evaluateExtractRetireSources,
} from './extract-retire.js'
import {
  EXTRACT_RETRY_CARD_ID,
  EXTRACT_RETRY_CLOSEOUT_KEY,
  evaluateExtractRetrySources,
} from './extract-retry.js'

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
  const sourceCrawlStoreSource = input.sourceCrawlStoreSource || input.foundationSourceCrawlStoreSource || ''
  const llmRuntimeStoreSource = input.llmRuntimeStoreSource || input.foundationLlmRuntimeStoreSource || ''
  const runtimeJobStoreSource = input.runtimeJobStoreSource || input.foundationRuntimeJobStoreSource || ''
  const sourceCrawlOwnershipSource = `${foundationDbSource}\n${sourceCrawlStoreSource}`
  const llmRuntimeOwnershipSource = `${foundationDbSource}\n${sourceCrawlStoreSource}\n${llmRuntimeStoreSource}\n${runtimeJobStoreSource}`
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
  const crawlRunLedgerCard = (input.foundationHub?.backlogItems || []).find(item => item.id === CRAWL_RUN_LEDGER_CARD_ID) || null
  const crawlRunLedgerClosed = crawlRunLedgerCard?.lane === 'done'
  const crawlRunLedgerCloseout = (input.foundationBuildCloseouts || []).find(item => item.key === CRAWL_RUN_LEDGER_CLOSEOUT_KEY) || null
  const extractRetireCard = (input.foundationHub?.backlogItems || []).find(item => item.id === EXTRACT_RETIRE_CARD_ID) || null
  const extractRetireClosed = extractRetireCard?.lane === 'done'
  const extractRetireCloseout = (input.foundationBuildCloseouts || []).find(item => item.key === EXTRACT_RETIRE_CLOSEOUT_KEY) || null
  const extractRetryCard = (input.foundationHub?.backlogItems || []).find(item => item.id === EXTRACT_RETRY_CARD_ID) || null
  const extractRetryClosed = extractRetryCard?.lane === 'done'
  const extractRetryCloseout = (input.foundationBuildCloseouts || []).find(item => item.key === EXTRACT_RETRY_CLOSEOUT_KEY) || null
  const crawlRunLedgerSources = evaluateCrawlRunLedgerSources({
    sourceCrawlStoreSource,
    extractionTargetSource,
    currentPlan,
    currentState,
    packageSource,
    proofScriptSource: input.crawlRunLedgerScriptSource || '',
  })
  const extractRetireSources = evaluateExtractRetireSources({
    moduleSource: input.extractRetireModuleSource || '',
    sourceCrawlStoreSource,
    extractionRuntimeVerifierSource: input.extractionRuntimeVerifierSource || '',
    packageSource,
    proofScriptSource: input.extractRetireScriptSource || '',
    planSource: input.extractRetirePlanSource || '',
    currentPlan,
    currentState,
  })
  const extractRetrySources = evaluateExtractRetrySources({
    retryModuleSource: input.extractRetryModuleSource || '',
    runHardeningSource: input.extractRunHardeningSource || '',
    executionSource: input.extractRunHardeningExecutionSource || '',
    meetingSyncSource: input.meetingNotesSyncSource || '',
    retryScriptSource: input.extractionRetryFailedScriptSource || '',
    packageSource,
    jobsSource: foundationJobsSource,
    extractionRuntimeVerifierSource: input.extractionRuntimeVerifierSource || '',
    proofScriptSource: input.extractRetryScriptSource || '',
    planSource: input.extractRetryPlanSource || '',
    currentPlan,
    currentState,
  })

  addCheck(
    checks,
    includesAll(llmRuntimeOwnershipSource, ['markStaleFoundationJobRuns', 'Marked failed by stale active-run reaper', 'markStaleLlmCalls', 'Marked failed by stale LLM call reaper', 'markStaleSourceCrawlTargetRuns', 'Marked failed by stale source-crawl run reaper']) &&
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
      includesAll(sourceCrawlOwnershipSource, [
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
      includesAll(sourceCrawlOwnershipSource, [
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
      includesAll(sourceCrawlOwnershipSource, [
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
  addCheck(
    checks,
    crawlRunLedgerSources.ok === true &&
      crawlRunLedgerCard &&
      ['executing', 'done'].includes(crawlRunLedgerCard.lane) &&
      (!crawlRunLedgerClosed || (
        String(crawlRunLedgerCard.statusNote || '').includes(CRAWL_RUN_LEDGER_CLOSEOUT_KEY) &&
        crawlRunLedgerCloseout?.operatorCloseout === true &&
        (crawlRunLedgerCloseout.backlogIds || []).includes(CRAWL_RUN_LEDGER_CARD_ID)
      )),
    'CRAWL-RUN-LEDGER-001 closes source crawl run-ledger truth with crawlRunId proof',
    crawlRunLedgerCard
      ? `${crawlRunLedgerCard.lane} / source checks ${crawlRunLedgerSources.summary.passed}/${crawlRunLedgerSources.summary.total}`
      : `missing ${CRAWL_RUN_LEDGER_CARD_ID}`,
  )
  addCheck(
    checks,
    extractRetireSources.ok === true &&
      extractRetireCard &&
      ['executing', 'done'].includes(extractRetireCard.lane) &&
      (!extractRetireClosed || (
        String(extractRetireCard.statusNote || '').includes(EXTRACT_RETIRE_CLOSEOUT_KEY) &&
        extractRetireCloseout?.operatorCloseout === true &&
        (extractRetireCloseout.backlogIds || []).includes(EXTRACT_RETIRE_CARD_ID)
      )),
    'EXTRACT-RETIRE-001 retires empty historical/corpus missions while preserving current-day lanes',
    extractRetireCard
      ? `${extractRetireCard.lane} / source checks ${extractRetireSources.summary.passed}/${extractRetireSources.summary.total}`
      : `missing ${EXTRACT_RETIRE_CARD_ID}`,
  )
  addCheck(
    checks,
    extractRetrySources.ok === true &&
      extractRetryCard &&
      ['executing', 'done'].includes(extractRetryCard.lane) &&
      (!extractRetryClosed || (
        String(extractRetryCard.statusNote || '').includes(EXTRACT_RETRY_CLOSEOUT_KEY) &&
        extractRetryCloseout?.operatorCloseout === true &&
        (extractRetryCloseout.backlogIds || []).includes(EXTRACT_RETRY_CARD_ID)
      )),
    'EXTRACT-RETRY-001 keeps failed-item retry support honest and reviewed',
    extractRetryCard
      ? `${extractRetryCard.lane} / source checks ${extractRetrySources.summary.passed}/${extractRetrySources.summary.total}`
      : `missing ${EXTRACT_RETRY_CARD_ID}`,
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
    sourceCrawlStoreSource: [
      'source_crawl_target_runs',
      'makeSourceCrawlRunId',
      'INSERT INTO source_crawl_target_runs',
      'crawlRunId: runId',
      'finishSourceCrawlTargetRun',
      'requestedRunId',
      'idempotentFinish',
      "from './extract-retire.js'",
      'buildExtractRetireRunUpdate',
      'status = COALESCE($12, status)',
      'runtime_mode = COALESCE($13, runtime_mode)',
      'stopped target statuses use target stop-state scheduling',
    ].join('\n'),
    extractRetireModuleSource: [
      'export function buildExtractRetireDecision',
      'export function buildExtractRetireRunUpdate',
      'current_day_targets_remain_scheduled',
      'clean_zero_work_threshold_met',
    ].join('\n'),
    extractRetryModuleSource: 'buildExtractRetryDogfoodProof',
    extractRunHardeningSource: [
      'export const EXTRACTION_RETRY_FAILED_TARGETS',
      'targetSupportsFailedItemRetry',
      'npm run extraction:retry-failed -- --target=${targetKey} --dryRun=true',
      'needs a target-specific retry command',
    ].join('\n'),
    extractRunHardeningExecutionSource: [
      'EXTRACTION_RETRY_FAILED_TARGETS,\n  EXTRACTION_RETRY_STATES',
      'export { EXTRACTION_RETRY_FAILED_TARGETS }',
      'targetSupportsRetryExecution',
    ].join('\n'),
    meetingNotesSyncSource: 'getRetryableSourceCrawlItems Retry eligible crawl items',
    extractionRetryFailedScriptSource: 'getRetryableSourceCrawlItems targetSupportsRetryExecution --dryRun=true eligibleItemCount',
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
      "key: 'extraction-retry-failed'",
      "runtimeMode: 'scheduled'",
      "runtimeMode: 'manual'",
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
      'leasedTarget.crawlRunId',
      '--crawlRunId=${leasedTarget.crawlRunId}',
      'runId: leasedTarget.crawlRunId',
      'sourceCrawlRunId: leasedTarget.crawlRunId',
      'recordExtractionIntelligenceJob',
    ].join('\n'),
    videoInventorySource: 'Refusing non-dry-run video link inventory outside extraction:target',
    currentPlan: `Corpus mission lane daily quota missions files the outputs with provenance source_crawl_target_runs crawlRunId ${EXTRACT_RETIRE_CLOSEOUT_KEY} ${EXTRACT_RETRY_CLOSEOUT_KEY}`,
    currentState: `daily quota missions file outputs with provenance source_crawl_target_runs crawlRunId ${EXTRACT_RETIRE_CLOSEOUT_KEY} ${EXTRACT_RETRY_CLOSEOUT_KEY}`,
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
    packageSource: '"drive:inventory-links" "extraction:retry-failed" "process:crawl-run-ledger-check": "node --env-file-if-exists=.env scripts/process-crawl-run-ledger-check.mjs" "process:extract-retire-check": "node --env-file-if-exists=.env scripts/process-extract-retire-check.mjs" "process:extract-retry-check": "node --env-file-if-exists=.env scripts/process-extract-retry-check.mjs"',
    crawlRunLedgerScriptSource: 'buildCrawlRunLedgerDogfoodProof focused proof script is read-only',
    extractionRuntimeVerifierSource: 'EXTRACT-RETIRE-001 evaluateExtractRetireSources EXTRACT-RETRY-001 evaluateExtractRetrySources',
    extractRetireScriptSource: 'buildSourceCrawlStoreRetirementDogfoodProof focused proof script is read-only',
    extractRetirePlanSource: 'Current-day targets never retire No live extraction',
    extractRetryScriptSource: 'focused proof script is read-only',
    extractRetryPlanSource: 'unsupported targets block No live extraction',
    driveLinkInventorySource: 'extractLinks createDrivePermission sendGmailMessage drive_link_access_request',
    sharedCandidateExtractionSource: 'requestedModel provider authPath routeKey llmCallId',
    processingProvenanceGaps: [],
    staleLlmCalls: [],
    foundationHub: {
      backlogItems: [{
        id: CRAWL_RUN_LEDGER_CARD_ID,
        lane: 'done',
        statusNote: CRAWL_RUN_LEDGER_CLOSEOUT_KEY,
      }, {
        id: EXTRACT_RETIRE_CARD_ID,
        lane: 'done',
        statusNote: EXTRACT_RETIRE_CLOSEOUT_KEY,
      }, {
        id: EXTRACT_RETRY_CARD_ID,
        lane: 'done',
        statusNote: EXTRACT_RETRY_CLOSEOUT_KEY,
      }],
    },
    foundationBuildCloseouts: [{
      key: CRAWL_RUN_LEDGER_CLOSEOUT_KEY,
      operatorCloseout: true,
      backlogIds: [CRAWL_RUN_LEDGER_CARD_ID],
    }, {
      key: EXTRACT_RETIRE_CLOSEOUT_KEY,
      operatorCloseout: true,
      backlogIds: [EXTRACT_RETIRE_CARD_ID],
    }, {
      key: EXTRACT_RETRY_CLOSEOUT_KEY,
      operatorCloseout: true,
      backlogIds: [EXTRACT_RETRY_CARD_ID],
    }],
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
  const missingExtractRetire = evaluateFoundationExtractionRuntimeVerifier({
    ...buildHealthyFixture(),
    extractRetireModuleSource: 'export function buildExtractRetireDecision',
  })
  const missingExtractRetry = evaluateFoundationExtractionRuntimeVerifier({
    ...buildHealthyFixture(),
    extractRunHardeningSource: 'export const EXTRACTION_RETRY_FAILED_TARGETS',
  })

  const rejected = {
    missingWorkerReaper,
    missingCorpusQuota,
    missingDriveExtractionSupport,
    missingLlmProvenance,
    missingExtractRetire,
    missingExtractRetry,
  }
  return {
    ok: healthy.ok === true &&
      Object.values(rejected).every(result => result.ok === false) &&
      missingWorkerReaper.checks.some(check => check.check === 'Foundation worker catches job failures and reaps stale active runs/calls' && !check.ok) &&
      missingCorpusQuota.checks.some(check => check.check === 'corpus extraction uses daily mission quotas instead of blind timers' && !check.ok) &&
      missingDriveExtractionSupport.checks.some(check => check.check === 'Drive content extraction target supports governed Docs/Sheets/PDF/text/markdown/OCR/link inventory' && !check.ok) &&
      missingLlmProvenance.checks.some(check => check.check === 'shared-comms extraction records actual LLM route provenance' && !check.ok) &&
      missingLlmProvenance.checks.some(check => check.check === 'shared-comms processing runs have routed LLM provenance' && !check.ok) &&
      missingLlmProvenance.checks.some(check => check.check === 'llm_calls has no timeout-expired planned/started calls' && !check.ok) &&
      missingExtractRetire.checks.some(check => check.check === 'EXTRACT-RETIRE-001 retires empty historical/corpus missions while preserving current-day lanes' && !check.ok) &&
      missingExtractRetry.checks.some(check => check.check === 'EXTRACT-RETRY-001 keeps failed-item retry support honest and reviewed' && !check.ok),
    healthy,
    rejected,
    dogfoodInvariant: 'Healthy extraction/runtime fixture passes; missing worker reapers, corpus quotas, Drive extraction support, LLM provenance, extract-retire coverage, or extract-retry coverage fail closed.',
  }
}
