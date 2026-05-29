export const DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID = 'DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001'
export const DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY = 'dev-page-system-truth-cleanup-v1'
export const DEV_PAGE_SYSTEM_TRUTH_CLEANUP_PLAN_PATH = 'docs/process/dev-page-system-truth-cleanup-001-plan.md'
export const DEV_PAGE_SYSTEM_TRUTH_CLEANUP_SCRIPT_PATH = 'scripts/process-dev-page-system-truth-cleanup-check.mjs'
export const DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID = 'dev-page:system-truth-cleanup:v1'

function text(value, fallback = '') {
  const output = String(value || '').trim()
  return output || fallback
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function number(value) {
  return Number(value || 0)
}

function structured(report = {}) {
  return report?.structuredOutputJson || report?.structured_output_json || {}
}

function reportId(report = {}) {
  return text(report?.reportArtifactId || report?.report_artifact_id)
}

function reportUpdatedAt(report = {}) {
  return text(report?.updatedAt || report?.updated_at || report?.createdAt || report?.created_at)
}

function latestReportAt(reports = []) {
  return list(reports)
    .map(reportUpdatedAt)
    .filter(Boolean)
    .sort()
    .pop() || ''
}

function statusFromState(state = '') {
  const normalized = text(state).toLowerCase()
  if (normalized.includes('blocked')) return 'blocked'
  if (normalized.includes('running') || normalized.includes('live')) return 'running'
  if (normalized.includes('ready') || normalized.includes('built')) return 'built'
  if (normalized.includes('planned') || normalized.includes('scoped')) return 'planned'
  return text(state, 'unknown')
}

function makeSystem({
  systemId,
  title,
  state,
  summary,
  reportArtifactId = '',
  proofCommand = '',
  counts = [],
  nextAction = '',
  sourceRoute = '',
} = {}) {
  return {
    systemId,
    title,
    state: statusFromState(state),
    label: text(state, 'unknown'),
    summary: text(summary),
    reportArtifactId: text(reportArtifactId),
    proofCommand: text(proofCommand),
    counts: list(counts).map(item => ({
      label: text(item.label),
      value: number(item.value),
    })).filter(item => item.label),
    nextAction: text(nextAction),
    sourceRoute: text(sourceRoute),
  }
}

function compactBlocker(row = {}, index = 0) {
  return {
    rank: index + 1,
    title: text(row.title || row.targetKey || row.sourceId || `Blocker ${index + 1}`),
    sourceFamily: text(row.sourceFamily || row.sourceId || ''),
    targetKey: text(row.targetKey),
    status: text(row.status || row.targetStatus || row.accessBoundary || 'blocked'),
    nextAction: text(row.nextAction),
  }
}

export function buildDevPageSystemTruthSnapshot({
  generatedAt = new Date().toISOString(),
  currentSprint = {},
  activeExtractionLanes = [],
  directorReport = {},
  devDirectorDailySourceReviewReport = {},
  sourceExtractionLedgerReport = {},
  myicorCatalogReport = {},
  myicorApprovedLessonExtractReport = {},
  skoolSourceSystemMapReport = {},
  youtubeCreatorGodModeCatchup = {},
  sourceFamilyGodModeMaturity = {},
  godModeExtractorParity = {},
  extractionEconomics = {},
} = {}) {
  const director = structured(directorReport)
  const dailyReview = structured(devDirectorDailySourceReviewReport)
  const ledger = structured(sourceExtractionLedgerReport)
  const myicor = structured(myicorCatalogReport)
  const myicorExtract = structured(myicorApprovedLessonExtractReport)
  const myicorSnapshot = myicor.snapshot || myicor
  const skool = structured(skoolSourceSystemMapReport)
  const activeSprint = currentSprint?.sprint || {}
  const activeCard = list(currentSprint?.items).find(item => item.cardId === activeSprint.activeBlockerCardId) || null
  const inputReports = [
    directorReport,
    devDirectorDailySourceReviewReport,
    sourceExtractionLedgerReport,
    myicorCatalogReport,
    myicorApprovedLessonExtractReport,
    skoolSourceSystemMapReport,
  ].filter(report => reportId(report))

  const ledgerSummary = ledger.summary || {}
  const myicorCounts = myicorSnapshot.counts || {}
  const skoolSummary = skool.summary || {}
  const dailySummary = dailyReview.summary || {}
  const myicorPacketCandidateCount = number(
    dailySummary.myicorPacketCandidateCount ||
    list(myicorSnapshot.priorityCandidates).length ||
    myicorCounts.highPriorityCandidateCount,
  )
  const sourceQueues = dailyReview.sourceQueues || {}
  const extractedEvidenceCount = number(dailySummary.extractedEvidenceCandidateCount || list(sourceQueues.extractedEvidenceQueue).length)
  const myicorExtractTarget = myicorExtract.target || {}
  const myicorExtractExtraction = myicorExtract.extraction || {}
  const youtubeSummary = youtubeCreatorGodModeCatchup.summary || {}
  const sourceMaturity = sourceFamilyGodModeMaturity.summary || {}
  const paritySummary = godModeExtractorParity.summary || {}

  const systems = [
    makeSystem({
      systemId: 'youtube-source-intelligence',
      title: 'YouTube Source Intelligence',
      state: number(youtubeSummary.creatorCount) > 0 ? 'running' : 'needs source',
      summary: 'Public creator watch, video/audio/visual review, source handoff, and proposal-only build ideas are visible from the Dev Hub.',
      reportArtifactId: reportId(directorReport),
      proofCommand: 'npm run process:dev-team-hub-v0-check -- --json',
      counts: [
        { label: 'creators', value: youtubeSummary.creatorCount },
        { label: 'tracked videos', value: youtubeSummary.trackedMetadataCount },
        { label: 'full-watch reports', value: youtubeSummary.fullWatchReportCount },
      ],
      nextAction: 'Continue exact packet extraction and avoid false full-God-Mode claims.',
      sourceRoute: '/api/foundation/dev-team-hub',
    }),
    makeSystem({
      systemId: 'source-extraction-state-ledger',
      title: 'Source Extraction State Ledger',
      state: reportId(sourceExtractionLedgerReport) ? 'built' : 'missing report',
      summary: 'Shared ledger for discovered, changed, metadata-only, extracted, blocked, ignored, and implemented-cleared source items.',
      reportArtifactId: reportId(sourceExtractionLedgerReport),
      proofCommand: 'npm run process:source-extraction-state-ledger-check -- --apply --json',
      counts: [
        { label: 'targets', value: ledgerSummary.targetCount },
        { label: 'items', value: ledgerSummary.itemCount },
        { label: 'metadata only', value: ledgerSummary.metadataMappedNotExtractedCount },
      ],
      nextAction: 'Use the ledger to prevent rereading unchanged/trash/implemented material.',
      sourceRoute: 'source-system:extraction-state-ledger:v1',
    }),
    makeSystem({
      systemId: 'myicor-mcp-catalog',
      title: 'MyICOR MCP Catalog',
      state: reportId(myicorCatalogReport) ? 'built metadata-only' : 'missing report',
      summary: 'Connector-first course, lesson, progress, and resource catalog. No lesson body, video, screenshots, downloads, atoms, or vectors were extracted.',
      reportArtifactId: reportId(myicorCatalogReport),
      proofCommand: 'npm run process:myicor-mcp-catalog-snapshot-check -- --apply --json',
      counts: [
        { label: 'courses', value: myicorCounts.courseCount },
        { label: 'lessons/resources', value: myicorCounts.totalItemCount },
        { label: 'priority packets', value: myicorPacketCandidateCount },
      ],
      nextAction: 'Approve one exact high-value lesson/resource packet before content extraction.',
      sourceRoute: 'source-system:myicor:mcp-catalog-snapshot:v1',
    }),
    makeSystem({
      systemId: 'myicor-approved-extraction',
      title: 'MyICOR Approved Extraction',
      state: reportId(myicorApprovedLessonExtractReport) ? 'built extracted' : 'missing report',
      summary: 'One exact approved MyICOR resource has extracted evidence, local-only raw artifacts, hashes, and source-ledger state.',
      reportArtifactId: reportId(myicorApprovedLessonExtractReport),
      proofCommand: 'npm run process:myicor-approved-lesson-extract-proof-check -- --live-mcp --live-browser --headless --apply --json',
      counts: [
        { label: 'text chars', value: myicorExtractExtraction.textChars },
        { label: 'evidence items', value: reportId(myicorApprovedLessonExtractReport) ? 1 : 0 },
        { label: 'Director evidence', value: extractedEvidenceCount },
      ],
      nextAction: text(myicorExtractTarget.title)
        ? 'Use this extracted evidence in proposal review; approve another exact packet before any broader MyICOR crawl.'
        : 'Run one exact approved MyICOR packet before claiming content evidence.',
      sourceRoute: 'source-system:myicor:approved-lesson-extract-proof:v1',
    }),
    makeSystem({
      systemId: 'skool-source-map',
      title: 'Skool Source Map',
      state: number(skoolSummary.blockedTargetCount) > 0 ? 'blocked map-ready' : 'built',
      summary: 'Approved free/paid Skool targets are mapped as targets and blockers, with zero Skool content extracted in this slice.',
      reportArtifactId: reportId(skoolSourceSystemMapReport),
      proofCommand: 'npm run process:skool-source-system-map-check -- --apply --json',
      counts: [
        { label: 'targets', value: skoolSummary.targetCount },
        { label: 'paid/private', value: skoolSummary.paidPrivateTargetCount },
        { label: 'content extracted', value: skoolSummary.extractedItemCount },
      ],
      nextAction: 'Create exact public/free or paid/private packets before any Skool run.',
      sourceRoute: 'source-system:skool:source-system-map:v1',
    }),
    makeSystem({
      systemId: 'dev-director-daily-source-review',
      title: 'Dev Director Daily Source Review',
      state: reportId(devDirectorDailySourceReviewReport) ? 'built proposal-only' : 'missing report',
      summary: 'Daily review reads old Director ranking plus source ledger, MyICOR, and Skool maps without promoting backlog cards or starting extraction.',
      reportArtifactId: reportId(devDirectorDailySourceReviewReport),
      proofCommand: 'npm run process:dev-director-daily-source-review-loop-check -- --apply --json',
      counts: [
        { label: 'Director candidates', value: dailySummary.existingDirectorCandidateCount },
        { label: 'Extracted evidence', value: extractedEvidenceCount },
        { label: 'MyICOR packets', value: dailySummary.myicorPacketCandidateCount },
        { label: 'Skool packets', value: dailySummary.skoolPacketTargetCount },
      ],
      nextAction: text(dailyReview.dailyReviewDecision?.nextAction, 'Review exact source packets before enriching Director recommendations.'),
      sourceRoute: 'director:dev-daily-source-review-loop:v1',
    }),
    makeSystem({
      systemId: 'source-family-god-mode-maturity',
      title: 'Source-Family Maturity Guard',
      state: number(paritySummary.claimsGodModeCount) === 0 ? 'running guardrail' : 'blocked false claim',
      summary: 'Extractor families show what they can actually do today. No source family is allowed to claim full God Mode without proof.',
      reportArtifactId: '',
      proofCommand: 'npm run process:dev-team-hub-v0-check -- --json',
      counts: [
        { label: 'families', value: sourceMaturity.familyCount || list(sourceFamilyGodModeMaturity.families).length },
        { label: 'false claims', value: paritySummary.claimsGodModeCount },
        { label: 'estimated spend', value: Math.round(number(extractionEconomics.estimatedSpendUsd)) },
      ],
      nextAction: 'Keep Browserbase parked; use local approved source packets and visible/guarded sessions when browser hands are needed.',
      sourceRoute: 'buildSourceFamilyGodModeMaturitySnapshot()',
    }),
  ]

  const blockedApprovalQueue = [
    ...list(sourceQueues.blockedApprovalQueue),
    ...list(skool.sourceTargets)
      .filter(target => target.approvalRequired || /blocked|paid|private|member|auth/i.test(`${target.status} ${target.accessBoundary}`)),
  ].slice(0, 12).map(compactBlocker)

  const reports = inputReports.map(report => ({
    reportArtifactId: reportId(report),
    title: text(report.title),
    status: text(report.status),
    updatedAt: reportUpdatedAt(report),
  }))

  return {
    schemaVersion: 1,
    generatedAt,
    cardId: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID,
    closeoutKey: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY,
    reportArtifactId: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID,
    status: 'ready',
    summary: {
      systemCount: systems.length,
      builtSystemCount: systems.filter(system => ['built', 'running'].includes(system.state)).length,
      blockedSystemCount: systems.filter(system => system.state === 'blocked').length,
      reportCount: reports.length,
      sourceLedgerItemCount: number(ledgerSummary.itemCount),
      extractedEvidenceCandidateCount: extractedEvidenceCount,
      myicorPriorityPacketCount: myicorPacketCandidateCount,
      skoolTargetCount: number(skoolSummary.targetCount),
      directorCandidateCount: number(dailySummary.existingDirectorCandidateCount || list(director.rankedCandidates).length),
      blockedApprovalCount: blockedApprovalQueue.length,
      autoBacklogPromotions: 0,
      extractionRunsStarted: 0,
      externalWrites: 0,
    },
    activeSprint: {
      sprintId: text(activeSprint.sprintId),
      status: text(activeSprint.status),
      activeBlockerCardId: text(activeSprint.activeBlockerCardId),
      activeCardTitle: text(activeCard?.title || activeCard?.summary),
      activeCardStage: text(activeCard?.stage),
      nextAction: text(activeCard?.nextAction),
    },
    systems,
    blockedApprovalQueue,
    proofCommands: systems.map(system => system.proofCommand).filter(Boolean),
    reports,
    guardrails: {
      pageReadOnly: true,
      proposalOnlyDirectorReview: true,
      autoBacklogPromotionAllowed: false,
      extractionStartedByPage: false,
      browserStartedByPage: false,
      browserbaseDefaultAllowed: false,
      normalChromeProfileAllowed: false,
      externalWritesAllowed: false,
      hidesUnverifiedRuntimeClaims: true,
    },
    sourceRoute: '/api/foundation/dev-team-hub -> systemTruth',
    inputReportUpdatedAt: latestReportAt(inputReports),
  }
}

export function evaluateDevPageSystemTruthSnapshot(snapshot = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const summary = snapshot.summary || {}
  const guardrails = snapshot.guardrails || {}

  add(snapshot.cardId === DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID, 'snapshot is tied to Dev page truth cleanup card', snapshot.cardId || 'missing')
  add(snapshot.status === 'ready', 'snapshot is ready for Dev page rendering', snapshot.status || 'missing')
  add(number(summary.systemCount) >= 6, 'snapshot exposes the main built/running source systems', String(summary.systemCount || 0))
  add(number(summary.reportCount) >= 4, 'snapshot is backed by persisted source/Director reports', String(summary.reportCount || 0))
  add(number(summary.sourceLedgerItemCount) > 0, 'snapshot shows source ledger item truth', String(summary.sourceLedgerItemCount || 0))
  add(number(summary.extractedEvidenceCandidateCount) > 0, 'snapshot shows extracted evidence candidate truth', String(summary.extractedEvidenceCandidateCount || 0))
  add(number(summary.myicorPriorityPacketCount) > 0, 'snapshot shows MyICOR packet candidates', String(summary.myicorPriorityPacketCount || 0))
  add(number(summary.skoolTargetCount) > 0, 'snapshot shows Skool source targets', String(summary.skoolTargetCount || 0))
  add(number(summary.directorCandidateCount) > 0, 'snapshot shows Director candidate base', String(summary.directorCandidateCount || 0))
  add(number(summary.autoBacklogPromotions) === 0 && number(summary.extractionRunsStarted) === 0 && number(summary.externalWrites) === 0, 'snapshot performs no promotion, extraction, or external write', JSON.stringify(summary))
  add(
    guardrails.pageReadOnly === true &&
      guardrails.autoBacklogPromotionAllowed === false &&
      guardrails.extractionStartedByPage === false &&
      guardrails.browserStartedByPage === false &&
      guardrails.browserbaseDefaultAllowed === false &&
      guardrails.externalWritesAllowed === false,
    'guardrails keep Dev page truth read-only and no-Browserbase-by-default',
    JSON.stringify(guardrails),
  )
  add(list(snapshot.systems).every(system => text(system.title) && text(system.summary) && text(system.nextAction)), 'each visible system has title, summary, and next action', `${list(snapshot.systems).length} systems`)
  add(list(snapshot.proofCommands).some(command => command.includes('process:dev-director-daily-source-review-loop-check')), 'proof commands include daily source review loop', list(snapshot.proofCommands).join('; '))

  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'blocked' : 'healthy', checks, failed }
}

export function buildDevPageSystemTruthDogfoodProof() {
  const snapshot = buildDevPageSystemTruthSnapshot({
    currentSprint: {
      sprint: {
        sprintId: 'synthetic-human-web-agent-v1',
        status: 'active',
        activeBlockerCardId: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID,
      },
      items: [{
        cardId: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID,
        title: 'Clean Dev page around live system truth',
        stage: 'building_now',
        nextAction: 'Render system truth.',
      }],
    },
    directorReport: {
      reportArtifactId: 'director:dev-team-intelligence-director-001:aios-mission-v0',
      status: 'generated',
      structuredOutputJson: {
        rankedCandidates: [{ title: 'Browser Agent That Can Work' }],
      },
    },
    devDirectorDailySourceReviewReport: {
      reportArtifactId: 'director:dev-daily-source-review-loop:v1',
      status: 'generated',
      structuredOutputJson: {
        summary: {
          existingDirectorCandidateCount: 10,
          extractedEvidenceCandidateCount: 1,
          myicorPacketCandidateCount: 2,
          skoolPacketTargetCount: 1,
        },
        sourceQueues: {
          extractedEvidenceQueue: [{ title: 'MyICOR approved extraction', reportArtifactId: 'source-system:myicor:approved-lesson-extract-proof:v1' }],
          blockedApprovalQueue: [{ title: 'Paid source packet', targetKey: 'paid-source', nextAction: 'Ask Steve.' }],
        },
        dailyReviewDecision: { nextAction: 'Review exact packet.' },
      },
    },
    myicorApprovedLessonExtractReport: {
      reportArtifactId: 'source-system:myicor:approved-lesson-extract-proof:v1',
      status: 'generated',
      structuredOutputJson: {
        target: {
          title: 'Stop Managing Your AI Agents. Build the One That Manages Them for You.',
          url: 'https://app.myicor.com/resources/stop-managing-your-ai-agents-build-the-one-that-manages-them-for-you',
        },
        extraction: {
          textChars: 18033,
          contentHash: '4bcf30a70eb180f029202a1f5c93e335265aa60f20930006cbbee7987f3c7cec',
        },
      },
    },
    sourceExtractionLedgerReport: {
      reportArtifactId: 'source-system:extraction-state-ledger:v1',
      status: 'generated',
      structuredOutputJson: {
        summary: {
          targetCount: 3,
          itemCount: 120,
          metadataMappedNotExtractedCount: 40,
        },
      },
    },
    myicorCatalogReport: {
      reportArtifactId: 'source-system:myicor:mcp-catalog-snapshot:v1',
      status: 'generated',
      structuredOutputJson: {
        snapshot: {
          counts: {
            courseCount: 4,
            totalItemCount: 20,
            highPriorityCandidateCount: 3,
          },
        },
      },
    },
    skoolSourceSystemMapReport: {
      reportArtifactId: 'source-system:skool:source-system-map:v1',
      status: 'generated',
      structuredOutputJson: {
        summary: {
          targetCount: 2,
          blockedTargetCount: 1,
          paidPrivateTargetCount: 1,
          extractedItemCount: 0,
        },
        sourceTargets: [{ title: 'Paid Skool', status: 'blocked', accessBoundary: 'paid_auth_member_content', approvalRequired: true, nextAction: 'Hold.' }],
      },
    },
    youtubeCreatorGodModeCatchup: {
      summary: {
        creatorCount: 32,
        trackedMetadataCount: 700,
        fullWatchReportCount: 50,
      },
    },
    sourceFamilyGodModeMaturity: { summary: { familyCount: 14 } },
    godModeExtractorParity: { summary: { claimsGodModeCount: 0 } },
    extractionEconomics: { estimatedSpendUsd: 42 },
  })
  const evaluation = evaluateDevPageSystemTruthSnapshot(snapshot)
  return {
    ok: evaluation.ok,
    snapshot,
    checks: evaluation.checks,
    failureSummary: evaluation.failed.map(item => item.check).join(', '),
  }
}

export function buildDevPageSystemTruthReportArtifact(snapshot = {}) {
  return {
    reportArtifactId: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID,
    reportType: 'proof',
    scopeKey: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY,
    department: 'dev',
    title: 'Dev Page System Truth Cleanup V1',
    status: 'generated',
    sourceIds: ['SRC-YOUTUBE-INTEL-001', 'SRC-MYICRO-001', 'SRC-SKOOL-001'],
    inputArtifactIds: list(snapshot.reports).map(report => report.reportArtifactId).filter(Boolean),
    sourceCoverage: list(snapshot.systems).map(system => ({
      sourceId: system.systemId,
      status: system.state,
      reportArtifactId: system.reportArtifactId,
    })),
    topFindings: [
      {
        title: 'Dev page now has a source-backed system truth read model.',
        detail: `${number(snapshot.summary?.systemCount)} systems are shown with proof, counts, blockers, and next action.`,
      },
      {
        title: 'The source-system vision is visible without starting extraction.',
        detail: `${number(snapshot.summary?.sourceLedgerItemCount)} ledger items, ${number(snapshot.summary?.extractedEvidenceCandidateCount)} extracted evidence candidates, ${number(snapshot.summary?.myicorPriorityPacketCount)} MyICOR packet candidates, and ${number(snapshot.summary?.skoolTargetCount)} Skool targets are surfaced.`,
      },
      {
        title: 'Browserbase and hidden writes remain blocked by default.',
        detail: 'The Dev page is read-only and does not start browser sessions, promotions, external writes, or source extraction.',
      },
    ],
    actionRequiredItems: [
      {
        cardId: 'BUILDER-MEMORY-SYSTEM-001',
        action: 'Use this visible truth read model as one input to the builder startup packet.',
      },
    ],
    structuredOutputJson: snapshot,
    metadata: {
      cardId: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID,
      closeoutKey: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY,
      planPath: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_PLAN_PATH,
      proofCommand: 'npm run process:dev-page-system-truth-cleanup-check -- --apply --json',
      readOnly: true,
      autoBacklogPromotions: 0,
      extractionRunsStarted: 0,
      externalWrites: 0,
      browserStarted: false,
      browserbaseDefaultAllowed: false,
    },
  }
}
