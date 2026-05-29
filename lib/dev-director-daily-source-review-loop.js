export const DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID = 'DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001'
export const DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY = 'dev-director-daily-source-review-loop-v1'
export const DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_PLAN_PATH = 'docs/process/dev-director-daily-source-review-loop-001-plan.md'
export const DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_SCRIPT_PATH = 'scripts/process-dev-director-daily-source-review-loop-check.mjs'
export const DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID = 'director:dev-daily-source-review-loop:v1'

export const DEV_DIRECTOR_DAILY_SOURCE_REVIEW_INPUT_REPORT_IDS = [
  'director:dev-team-intelligence-director-001:aios-mission-v0',
  'source-system:extraction-state-ledger:v1',
  'source-system:myicor:mcp-catalog-snapshot:v1',
  'source-system:myicor:approved-lesson-extract-proof:v1',
  'source-system:skool:source-system-map:v1',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function number(value) {
  return Number(value || 0)
}

function structured(report = {}) {
  return report.structuredOutputJson || report.structured_output_json || {}
}

function sourceIds(report = {}) {
  return list(report.sourceIds || report.source_ids)
}

function compactCandidate(row = {}, index = 0) {
  return {
    rank: number(row.rank || index + 1),
    title: text(row.title),
    buildReadiness: text(row.buildReadiness || row.scopeReadiness?.status),
    sourceReportArtifactId: text(row.sourceReportArtifactId),
    promotionStatus: text(row.promotionStatus),
    suggestedCardId: text(row.suggestedCardId),
  }
}

function compactMyicorCandidate(row = {}, index = 0) {
  return {
    rank: index + 1,
    sourceFamily: 'myicor',
    kind: text(row.kind),
    title: text(row.title),
    courseName: text(row.courseName),
    lessonId: text(row.lessonId),
    url: text(row.url),
    theme: text(row.theme),
    sourceState: text(row.sourceState),
    extractionStatus: text(row.extractionStatus || 'metadata_mapped_content_not_extracted'),
    directorUse: 'packet_candidate_not_director_build_candidate_until_content_evidence_exists',
  }
}

function compactSkoolTarget(row = {}, index = 0) {
  return {
    rank: index + 1,
    sourceFamily: 'skool',
    targetKey: text(row.targetKey),
    title: text(row.title),
    status: text(row.status),
    accessBoundary: text(row.accessBoundary),
    itemCount: number(row.itemCount),
    extractedCount: number(row.extractedCount),
    exactPacketRequired: row.exactPacketRequired === true,
    nextAction: text(row.nextAction),
    directorUse: 'source_packet_or_blocker_not_director_build_candidate_until_evidence_exists',
  }
}

function compactBlockedTarget(row = {}, index = 0) {
  return {
    rank: index + 1,
    targetKey: text(row.targetKey),
    sourceId: text(row.sourceId),
    title: text(row.title),
    targetStatus: text(row.targetStatus || row.status),
    nextAction: text(row.nextAction),
  }
}

function compactExtractedEvidence(report = {}, index = 0) {
  const structuredOutput = structured(report)
  const target = structuredOutput.target || {}
  const extraction = structuredOutput.extraction || {}
  const buildIntelRoute = structuredOutput.buildIntelRoute || {}
  return {
    rank: index + 1,
    sourceFamily: 'myicor',
    title: text(target.title || report.title || report.report_artifact_id),
    url: text(target.url || extraction.finalUrl),
    reportArtifactId: text(report.reportArtifactId || report.report_artifact_id),
    evidenceState: 'extracted_with_evidence',
    reviewState: 'graded_keep',
    textChars: number(extraction.textChars),
    contentHash: text(extraction.contentHash),
    rawTextPath: text(extraction.rawTextPath),
    screenshotHash: text(extraction.screenshotHash),
    signalIds: list(buildIntelRoute.contentSignals).map(signal => text(signal.id)),
    directorUse: 'extracted_source_evidence_ready_for_proposal_review_not_auto_promotion',
  }
}

function latestReportAt(reports = []) {
  return list(reports)
    .map(report => text(report.updatedAt || report.updated_at || report.createdAt || report.created_at))
    .filter(Boolean)
    .sort()
    .pop() || ''
}

export function buildDevDirectorDailySourceReviewLoop({
  directorReport = {},
  ledgerReport = {},
  myicorReport = {},
  myicorExtractReport = {},
  skoolReport = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const director = structured(directorReport)
  const ledger = structured(ledgerReport)
  const myicor = structured(myicorReport)
  const skool = structured(skoolReport)
  const ledgerSummary = ledger.summary || {}
  const myicorSnapshot = myicor.snapshot || myicor
  const skoolTargets = list(skool.sourceTargets)
  const directorRecommended = list(director.recommendedBuildNow).map(compactCandidate)
  const directorStrongNext = list(director.strongNext).map(compactCandidate)
  const myicorPacketCandidates = list(myicorSnapshot.priorityCandidates).slice(0, 12).map(compactMyicorCandidate)
  const extractedEvidenceQueue = text(myicorExtractReport?.reportArtifactId || myicorExtractReport?.report_artifact_id)
    ? [compactExtractedEvidence(myicorExtractReport)]
    : []
  const skoolPacketTargets = skoolTargets.slice(0, 8).map(compactSkoolTarget)
  const ledgerBlockedTargets = list(ledger.targetSummaries)
    .filter(target => text(target.nextAction).includes('Resolve source boundary') || text(target.targetStatus) === 'blocked')
    .slice(0, 12)
    .map(compactBlockedTarget)

  const inputReports = [directorReport, ledgerReport, myicorReport, myicorExtractReport, skoolReport].filter(report => text(report.reportArtifactId || report.report_artifact_id))
  const allSourceIds = Array.from(new Set(inputReports.flatMap(sourceIds))).sort()
  const enrichmentPacketQueue = [
    ...myicorPacketCandidates,
    ...skoolPacketTargets,
  ]
  const blockedApprovalQueue = [
    ...ledgerBlockedTargets,
    ...skoolPacketTargets.filter(target => /paid|private|member|blocked/i.test(`${target.accessBoundary} ${target.status}`)),
  ]

  return {
    schemaVersion: 1,
    generatedAt,
    cardId: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID,
    closeoutKey: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY,
    reportArtifactId: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
    inputReportIds: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_INPUT_REPORT_IDS,
    inputReportUpdatedAt: latestReportAt(inputReports),
    sourceIds: allSourceIds,
    status: 'proposal_only_daily_source_review_ready',
    summary: {
      existingDirectorCandidateCount: number(list(director.rankedCandidates).length),
      existingRecommendedBuildNowCount: directorRecommended.length,
      existingStrongNextCount: directorStrongNext.length,
      ledgerTargetCount: number(ledgerSummary.targetCount),
      ledgerItemCount: number(ledgerSummary.itemCount),
      newChangedOrKeptDirectorCandidateCount: number(ledgerSummary.directorCandidateCount),
      suppressedFromDirectorCount: number(ledgerSummary.suppressedFromDirectorCount),
      metadataMappedNotExtractedCount: number(ledgerSummary.metadataMappedNotExtractedCount),
      extractedEvidenceCandidateCount: extractedEvidenceQueue.length,
      myicorPacketCandidateCount: myicorPacketCandidates.length,
      skoolPacketTargetCount: skoolPacketTargets.length,
      blockedApprovalQueueCount: blockedApprovalQueue.length,
      autoBacklogPromotions: 0,
      externalWrites: 0,
      extractionRunsStarted: 0,
    },
    guardrails: {
      proposalOnly: true,
      autoBacklogPromotionAllowed: false,
      backlogWritesAllowedOnlyForThisCardCloseout: true,
      sourceExtractionAllowed: false,
      browserStarted: false,
      sourceRowsMutated: false,
      writesAtomsOrVectors: false,
      deletesHistory: false,
      externalWritesAllowed: false,
      appliesSuppressionAutomatically: false,
    },
    reviewPolicy: {
      directorCandidateRule: 'new + changed + graded_keep, excluding graded_ignore and implemented_cleared',
      suppressionRule: 'graded_ignore and implemented_cleared stay searchable as history and are excluded from default recommendations until changed',
      enrichmentRule: 'metadata-only MyICOR/Skool items become exact source-packet candidates, not build recommendations, until extracted evidence exists',
      extractedEvidenceRule: 'exact approved extraction reports become proposal-ready evidence, not automatic backlog promotion',
      existingDirectorRule: 'existing Director top builds remain review input until new extracted evidence changes the ranking',
      sourceMapRule: 'Skool/MyICOR maps can route packet approvals but cannot claim content evidence',
    },
    existingDirectorTopBuilds: directorRecommended,
    existingDirectorStrongNext: directorStrongNext.slice(0, 5),
    sourceQueues: {
      readyDirectorCandidateCount: number(ledgerSummary.directorCandidateCount),
      extractedEvidenceQueue,
      enrichmentPacketQueue,
      blockedApprovalQueue,
      suppressedHistoryCount: number(ledgerSummary.suppressedFromDirectorCount),
    },
    dailyReviewDecision: {
      status: 'no_auto_promotion',
      keepExistingDirectorRanking: true,
      reason: number(ledgerSummary.directorCandidateCount) === 0
        ? 'No new/changed/kept source items are ready to alter Director ranking; new MyICOR/Skool inputs are metadata/source-map only.'
        : extractedEvidenceQueue.length
          ? 'New extracted source evidence is ready for proposal review before any ranking or backlog change.'
          : 'New/changed/kept source items should be reviewed as proposals before any ranking or backlog change.',
      nextAction: 'Review exact MyICOR/Skool packet candidates or continue source extraction; only extracted evidence should enrich Director build opportunities.',
    },
    nextCards: [
      'DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001',
      'BUILDER-MEMORY-SYSTEM-001',
      'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
      'FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001',
    ],
  }
}

export function evaluateDevDirectorDailySourceReviewLoop(review = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const summary = review.summary || {}
  const guardrails = review.guardrails || {}
  const queues = review.sourceQueues || {}

  add(review.cardId === DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID, 'review is tied to the daily source review card', review.cardId || 'missing')
  add(list(review.inputReportIds).every(id => DEV_DIRECTOR_DAILY_SOURCE_REVIEW_INPUT_REPORT_IDS.includes(id)), 'review declares the expected Director/source input reports', list(review.inputReportIds).join(', '))
  add(number(summary.existingDirectorCandidateCount) > 0, 'review sees existing Director candidate base', String(summary.existingDirectorCandidateCount || 0))
  add(number(summary.ledgerTargetCount) > 0 && number(summary.ledgerItemCount) > 0, 'review sees source-state ledger target/item counts', `${summary.ledgerTargetCount || 0}/${summary.ledgerItemCount || 0}`)
  add(number(summary.myicorPacketCandidateCount) > 0, 'review turns MyICOR metadata into exact packet candidates', String(summary.myicorPacketCandidateCount || 0))
  add(number(summary.extractedEvidenceCandidateCount) > 0, 'review includes exact extracted source evidence candidates', String(summary.extractedEvidenceCandidateCount || 0))
  add(number(summary.skoolPacketTargetCount) > 0, 'review turns Skool source map into packet/blocker queue', String(summary.skoolPacketTargetCount || 0))
  add(number(summary.autoBacklogPromotions) === 0 && number(summary.externalWrites) === 0 && number(summary.extractionRunsStarted) === 0, 'review performs no auto promotion, external write, or extraction run', JSON.stringify(summary))
  add(
    guardrails.proposalOnly === true &&
      guardrails.autoBacklogPromotionAllowed === false &&
      guardrails.sourceExtractionAllowed === false &&
      guardrails.browserStarted === false &&
      guardrails.sourceRowsMutated === false &&
      guardrails.writesAtomsOrVectors === false &&
      guardrails.appliesSuppressionAutomatically === false,
    'guardrails keep review proposal-only and non-mutating',
    JSON.stringify(guardrails),
  )
  add(
    review.reviewPolicy?.suppressionRule?.includes('stay searchable as history') &&
      review.reviewPolicy?.directorCandidateRule?.includes('excluding graded_ignore'),
    'suppression is reversible history, not deletion',
    JSON.stringify(review.reviewPolicy || {}),
  )
  add(
    number(queues.suppressedHistoryCount) === number(summary.suppressedFromDirectorCount) &&
      Array.isArray(queues.enrichmentPacketQueue) &&
      Array.isArray(queues.extractedEvidenceQueue) &&
      Array.isArray(queues.blockedApprovalQueue),
    'queues separate ready candidates, extracted evidence, enrichment packets, blocked approvals, and suppressed history',
    JSON.stringify({ suppressed: queues.suppressedHistoryCount, extracted: queues.extractedEvidenceQueue?.length, enrichment: queues.enrichmentPacketQueue?.length, blocked: queues.blockedApprovalQueue?.length }),
  )
  add(
    review.dailyReviewDecision?.status === 'no_auto_promotion' &&
      review.dailyReviewDecision?.keepExistingDirectorRanking === true,
    'daily decision keeps ranking review-only until extracted evidence changes it',
    JSON.stringify(review.dailyReviewDecision || {}),
  )
  add(
    list(review.nextCards).includes('DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001') &&
      list(review.nextCards).includes('BUILDER-MEMORY-SYSTEM-001'),
    'next cards route to Dev page truth and builder memory',
    list(review.nextCards).join(', '),
  )

  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'blocked' : 'healthy', checks, failed }
}

export function buildDevDirectorDailySourceReviewLoopFixtureInput() {
  return {
    directorReport: {
      reportArtifactId: 'director:dev-team-intelligence-director-001:aios-mission-v0',
      sourceIds: ['SRC-YOUTUBE-INTEL-001'],
      structuredOutputJson: {
        rankedCandidates: [{ title: 'Browser Agent That Can Work' }, { title: 'Memory System That Keeps Agents Sharp' }],
        recommendedBuildNow: [{ rank: 1, title: 'Browser Agent That Can Work', buildReadiness: 'ready_for_scoper' }],
        strongNext: [{ rank: 2, title: 'Extractor That Can Go Anywhere', buildReadiness: 'ready_for_scoper' }],
      },
    },
    ledgerReport: {
      reportArtifactId: 'source-system:extraction-state-ledger:v1',
      sourceIds: ['SRC-YOUTUBE-INTEL-001', 'SRC-MYICRO-001', 'SRC-SKOOL-001'],
      structuredOutputJson: {
        summary: {
          targetCount: 4,
          itemCount: 20,
          directorCandidateCount: 3,
          suppressedFromDirectorCount: 2,
          metadataMappedNotExtractedCount: 6,
        },
        targetSummaries: [
          { targetKey: 'myicor-mcp-catalog-snapshot-v1', sourceId: 'SRC-MYICRO-001', title: 'MyICOR', nextAction: 'Grade metadata-only items and approve exact packets for high-value content.' },
          { targetKey: 'skool-corpus-backfill', sourceId: 'SRC-SKOOL-001', title: 'Skool', targetStatus: 'blocked', nextAction: 'Resolve source boundary or exact approval blocker before extraction.' },
        ],
      },
    },
    myicorReport: {
      reportArtifactId: 'source-system:myicor:mcp-catalog-snapshot:v1',
      sourceIds: ['SRC-MYICRO-001'],
      structuredOutputJson: {
        snapshot: {
          priorityCandidates: [
            { kind: 'lesson', title: 'Agent (The Specialist)', lessonId: '2329', theme: 'agentic_os', extractionStatus: 'metadata_mapped_content_not_extracted' },
          ],
        },
      },
    },
    myicorExtractReport: {
      reportArtifactId: 'source-system:myicor:approved-lesson-extract-proof:v1',
      sourceIds: ['SRC-MYICRO-001'],
      structuredOutputJson: {
        target: {
          title: 'Stop Managing Your AI Agents. Build the One That Manages Them for You.',
          url: 'https://app.myicor.com/resources/stop-managing-your-ai-agents-build-the-one-that-manages-them-for-you',
        },
        extraction: {
          textChars: 18033,
          contentHash: '4bcf30a70eb180f029202a1f5c93e335265aa60f20930006cbbee7987f3c7cec',
          rawTextPath: '.openclaw/myicor-approved-lesson-extract/runs/fixture/artifacts/page-text.txt',
          screenshotHash: 'cfd3631880d2ee76feaecbe24407c888774bd89b64434ddf51b39ecf3c43df91',
        },
        buildIntelRoute: {
          contentSignals: [
            { id: 'chief_of_staff_agent' },
            { id: 'compounding_memory' },
          ],
        },
      },
    },
    skoolReport: {
      reportArtifactId: 'source-system:skool:source-system-map:v1',
      sourceIds: ['SRC-SKOOL-001'],
      structuredOutputJson: {
        sourceTargets: [
          { targetKey: 'mark-skool-premium-recordings', title: 'Mark Skool premium membership recordings', status: 'blocked', accessBoundary: 'paid_auth_member_content', itemCount: 0, extractedCount: 0, exactPacketRequired: true },
        ],
      },
    },
  }
}

export function buildDevDirectorDailySourceReviewLoopDogfoodProof() {
  const review = buildDevDirectorDailySourceReviewLoop(buildDevDirectorDailySourceReviewLoopFixtureInput())
  const evaluation = evaluateDevDirectorDailySourceReviewLoop(review)
  const ok = evaluation.ok &&
    review.summary.newChangedOrKeptDirectorCandidateCount === 3 &&
    review.summary.suppressedFromDirectorCount === 2 &&
    review.summary.autoBacklogPromotions === 0 &&
    review.sourceQueues.extractedEvidenceQueue.length >= 1 &&
    review.sourceQueues.enrichmentPacketQueue.length >= 2 &&
    review.sourceQueues.blockedApprovalQueue.length >= 1
  return {
    ok,
    summary: review.summary,
    dogfoodInvariant: ok
      ? 'fixture proves old Director candidates, new/changed source candidates, exact extracted evidence, MyICOR/Skool packet queues, blocked approvals, reversible suppression, and no auto promotion'
      : evaluation.failed.map(item => item.check).join(', ') || 'daily source review dogfood failed',
  }
}

export function buildDevDirectorDailySourceReviewLoopReportArtifact(review = {}) {
  return {
    reportArtifactId: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
    reportType: 'director_brief',
    scopeKey: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY,
    department: 'dev',
    title: 'Dev Director Daily Source Review Loop V1',
    status: 'generated',
    sourceIds: list(review.sourceIds),
    inputArtifactIds: list(review.inputReportIds),
    sourceCoverage: list(review.sourceIds).map(sourceId => ({ sourceId })),
    topFindings: [
      {
        title: 'Daily source review is proposal-only.',
        detail: 'Existing Director ranking is not changed until new extracted evidence exists.',
      },
      {
        title: 'Metadata-only source maps become packet candidates.',
        detail: `${number(review.summary?.myicorPacketCandidateCount)} MyICOR candidates and ${number(review.summary?.skoolPacketTargetCount)} Skool targets are available for exact packet review.`,
      },
      {
        title: 'Exact extracted source evidence is ready for proposal review.',
        detail: `${number(review.summary?.extractedEvidenceCandidateCount)} extracted evidence candidates are available without auto-promotion.`,
      },
      {
        title: 'Suppression is reversible history.',
        detail: `${number(review.summary?.suppressedFromDirectorCount)} suppressed history items are excluded from default recommendations without deletion.`,
      },
    ],
    actionRequiredItems: [
      {
        cardId: 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
        action: 'Use the extracted MyICOR proof as proposal evidence; approve another exact resource only if more MyICOR content is needed.',
      },
      {
        cardId: 'FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001',
        action: 'Run only exact approved free/public Skool packet after session/source boundary proof.',
      },
      {
        cardId: 'DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001',
        action: 'Expose source-review truth on the Dev page after this loop exists.',
      },
    ],
    structuredOutputJson: review,
    metadata: {
      cardId: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID,
      closeoutKey: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY,
      planPath: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_PLAN_PATH,
      proofCommand: 'npm run process:dev-director-daily-source-review-loop-check -- --apply --json',
      proposalOnly: true,
      autoBacklogPromotions: 0,
      externalWrites: 0,
      extractionRunsStarted: 0,
    },
  }
}
