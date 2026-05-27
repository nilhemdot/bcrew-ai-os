export const FOUNDATION_GROWTH_SAFE_READBACK_CARD_ID = 'FOUNDATION-GROWTH-SAFE-READBACK-001'
export const FOUNDATION_GROWTH_SAFE_READBACK_PLAN_PATH = 'docs/process/foundation-growth-safe-readback-001-plan.md'
export const FOUNDATION_GROWTH_SAFE_READBACK_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-GROWTH-SAFE-READBACK-001.json'
export const FOUNDATION_GROWTH_SAFE_READBACK_SCRIPT_PATH = 'scripts/process-foundation-growth-safe-readback-check.mjs'

const DEV_LANE_ID = 'aios_dev_build'

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function gradeRankValue(grade = '') {
  const rank = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1, UNGRADED: 0 }
  return rank[text(grade).toUpperCase()] ?? 0
}

function laneScore(source = {}, laneId = DEV_LANE_ID) {
  return list(source.laneScores).find(lane => lane.laneId === laneId) || null
}

export function gradeBucketCounts(rows = [], { gradeAccessor = row => row.grade } = {}) {
  const counts = {}
  for (const row of list(rows)) {
    const grade = text(gradeAccessor(row) || 'ungraded').toUpperCase()
    counts[grade || 'UNGRADED'] = (counts[grade || 'UNGRADED'] || 0) + 1
  }
  return counts
}

export function buildCreatorLeaderboard(sourceValueGrader = {}) {
  return list(sourceValueGrader?.sourceGrades)
    .filter(source => source.creator || source.creatorId)
    .map(source => {
      const devLane = laneScore(source)
      const grade = text(source.devBuildGrade || devLane?.grade || source.overallGrade || 'ungraded').toUpperCase()
      return {
        creatorId: text(source.creatorId),
        creator: text(source.creator || source.creatorId),
        grade,
        devBuildGrade: grade,
        overallGrade: text(source.overallGrade || source.grade || 'ungraded').toUpperCase(),
        primaryUse: text(source.primaryUse),
        score: number(devLane?.score),
        buildCandidates: number(source.buildCandidates),
        watchedVideos: number(source.watchedVideos),
        bestDirectorRank: number(source.bestDirectorRank),
        watchRecommendation: text(source.watchRecommendation),
        laneScores: list(source.laneScores),
      }
    })
    .sort((left, right) =>
      gradeRankValue(right.devBuildGrade) - gradeRankValue(left.devBuildGrade) ||
      number(right.score) - number(left.score) ||
      number(right.buildCandidates) - number(left.buildCandidates) ||
      number(right.watchedVideos) - number(left.watchedVideos) ||
      number(left.bestDirectorRank || 9999) - number(right.bestDirectorRank || 9999) ||
      text(left.creator).localeCompare(text(right.creator))
    )
}

export function buildSourceGraderReadbackTruth(sourceValueGrader = {}) {
  const sourceGrades = list(sourceValueGrader?.sourceGrades)
  const topDevBuildSources = list(sourceValueGrader?.topDevBuildSources)
  const topByLane = list(sourceValueGrader?.topByLane)
  return {
    fullSourceGradeCount: sourceGrades.length,
    topDevPreviewCount: topDevBuildSources.length,
    topDevBuildSourcesArePreview: topDevBuildSources.length > 0 && topDevBuildSources.length < sourceGrades.length,
    laneCount: topByLane.length,
    lanePreviewCount: topByLane.filter(lane => number(lane.showingCount || list(lane.sources).length) < number(lane.totalSourceCount || list(lane.sources).length)).length,
    laneTotalsProven: topByLane.every(lane =>
      number(lane.totalSourceCount || 0) >= list(lane.sources).length &&
      number(lane.showingCount || list(lane.sources).length) === list(lane.sources).length &&
      typeof lane.hasMore === 'boolean' &&
      lane.gradeBuckets &&
      typeof lane.gradeBuckets === 'object'
    ),
    gradeBuckets: gradeBucketCounts(sourceGrades, {
      gradeAccessor: source => source.devBuildGrade || laneScore(source)?.grade || source.overallGrade,
    }),
  }
}

export function classifyPostRunLedgerStatus({ latestBatch = null, watchJob = {} } = {}) {
  const latestRunStatus = text(watchJob.latestRunStatus || watchJob.status).toLowerCase()
  const jobStartedAt = text(watchJob.latestRunStartedAt || watchJob.startedAt || watchJob.latestRunAt)
  const batchUpdatedAt = text(latestBatch?.updatedAt)
  const jobStartedMs = Date.parse(jobStartedAt)
  const batchUpdatedMs = Date.parse(batchUpdatedAt)
  const latestBatchPersistedAfterRun = Boolean(
    latestBatch &&
    Number.isFinite(jobStartedMs) &&
    Number.isFinite(batchUpdatedMs) &&
    batchUpdatedMs >= jobStartedMs
  )
  const watchRunNeedsLedgerRepair = latestRunStatus === 'failed' && latestBatchPersistedAfterRun
  const status = watchRunNeedsLedgerRepair
    ? 'post_run_review_needed'
    : latestRunStatus === 'failed'
      ? 'failed'
      : text(latestBatch?.status || watchJob.status || 'ready')
  return {
    status,
    latestBatchPersistedAfterRun,
    watchRunNeedsLedgerRepair,
  }
}

export function buildFoundationGrowthSafeReadbackSnapshot({
  generatedAt = new Date().toISOString(),
  devHubSnapshot = {},
  routeSource = '',
  devPageSource = '',
  devHubCheckSource = '',
} = {}) {
  const sourceValueGrader = devHubSnapshot.sourceValueGrader || {}
  const sourceGrades = list(sourceValueGrader.sourceGrades)
  const creatorLeaderboard = list(devHubSnapshot.youtubeSourceIntelligence?.creatorLeaderboard)
  const topCreators = list(devHubSnapshot.youtubeSourceIntelligence?.topCreators)
  const graderTruth = buildSourceGraderReadbackTruth(sourceValueGrader)
  const catchupSummary = devHubSnapshot.youtubeCreatorGodModeCatchup?.summary || {}
  const youtubeTruth = devHubSnapshot.youtubeSourceIntelligence?.readbackTruth || {}
  const checks = [
    {
      ok: sourceGrades.length >= 3,
      check: 'full source grade readback is present',
      detail: `${sourceGrades.length} source grades`,
    },
    {
      ok: creatorLeaderboard.length === sourceGrades.length && creatorLeaderboard.length >= topCreators.length,
      check: 'YouTube creator leaderboard exposes all graded creators, not only the preview',
      detail: `${creatorLeaderboard.length}/${sourceGrades.length} full rows; preview=${topCreators.length}`,
    },
    {
      ok: graderTruth.laneTotalsProven,
      check: 'lane-specific grading declares totals, preview size, has-more, and grade buckets',
      detail: `${graderTruth.laneCount} lanes`,
    },
    {
      ok: text(youtubeTruth.fullWatchReportReadbackRoute).includes('getIntelligenceAtomSpineSnapshot({ limit: 500 })') &&
        text(youtubeTruth.geminiCallReadbackRoute).includes('limit: 5000'),
      check: 'Dev Hub readback declares full report and Gemini call ceilings',
      detail: `${youtubeTruth.fullWatchReportReadbackRoute || 'missing'} / ${youtubeTruth.geminiCallReadbackRoute || 'missing'}`,
    },
    {
      ok: number(catchupSummary.creatorCount) === list(devHubSnapshot.youtubeCreatorGodModeCatchup?.creators).length &&
        number(catchupSummary.creatorCount) >= 3,
      check: 'YouTube catch-up readback returns every approved creator row',
      detail: `${list(devHubSnapshot.youtubeCreatorGodModeCatchup?.creators).length}/${catchupSummary.creatorCount || 0}`,
    },
    {
      ok: !/targetKey:\s*['"]youtube-creator-daily-watch['"][\s\S]{0,120}limit:\s*200/.test(routeSource) &&
        routeSource.includes('YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT'),
      check: 'daily-watch source readback is not capped at the old 200-row ceiling',
      detail: 'YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT',
    },
    {
      ok: devPageSource.includes('system.creatorLeaderboard') &&
        !devPageSource.includes('const SOURCE_LEADERBOARD_LIMIT') &&
        devPageSource.includes('of ${escapeHtml(compactNumber(totalRankedCreators))}'),
      check: 'Dev page shows full creator ranking with disclosed totals instead of a hidden top-N cap',
      detail: 'creatorLeaderboard + totalRankedCreators',
    },
    {
      ok: devHubCheckSource.includes('creatorLeaderboard') &&
        devHubCheckSource.includes('full creator ranking'),
      check: 'Dev Hub proof protects the no-hidden-creator-cap behavior',
      detail: 'process-dev-team-hub-v0-check',
    },
  ]
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    generatedAt,
    cardId: FOUNDATION_GROWTH_SAFE_READBACK_CARD_ID,
    sourceIds: ['SRC-YOUTUBE-INTEL-001', 'SRC-FOUNDATION-RUNTIME-001'],
    readOnly: true,
    reportOnly: true,
    sourceGrader: graderTruth,
    youtube: {
      creatorLeaderboardCount: creatorLeaderboard.length,
      topCreatorPreviewCount: topCreators.length,
      topCreatorsArePreview: topCreators.length > 0 && topCreators.length < creatorLeaderboard.length,
      creatorCount: number(catchupSummary.creatorCount),
      trackedMetadataCount: number(catchupSummary.trackedMetadataCount),
      watchedVideoCount: number(catchupSummary.videoAudioVisualWatchedCount),
      readbackTruth: youtubeTruth,
    },
    checks,
    failures,
    noBacklogMutation: true,
    noExternalWrites: true,
  }
}

export function buildFoundationGrowthSafeReadbackDogfoodProof() {
  const sourceValueGrader = {
    sourceGrades: [
      { creatorId: 'a', creator: 'A', devBuildGrade: 'S', overallGrade: 'S', buildCandidates: 10, watchedVideos: 10, laneScores: [{ laneId: DEV_LANE_ID, grade: 'S', score: 95 }] },
      { creatorId: 'b', creator: 'B', devBuildGrade: 'A', overallGrade: 'A', buildCandidates: 8, watchedVideos: 10, laneScores: [{ laneId: DEV_LANE_ID, grade: 'A', score: 80 }] },
      { creatorId: 'c', creator: 'C', devBuildGrade: 'D', overallGrade: 'A', buildCandidates: 6, watchedVideos: 10, laneScores: [{ laneId: DEV_LANE_ID, grade: 'D', score: 20 }, { laneId: 'marketing_lead_gen', grade: 'A', score: 80 }] },
    ],
    topDevBuildSources: [
      { creatorId: 'a', creator: 'A', devBuildGrade: 'S', overallGrade: 'S', buildCandidates: 10, watchedVideos: 10, laneScores: [{ laneId: DEV_LANE_ID, grade: 'S', score: 95 }] },
    ],
    topByLane: [
      {
        laneId: DEV_LANE_ID,
        sources: [{ creatorId: 'a', grade: 'S', score: 95 }],
        totalSourceCount: 3,
        showingCount: 1,
        hasMore: true,
        gradeBuckets: { S: 1, A: 1, D: 1 },
      },
    ],
  }
  const creatorLeaderboard = buildCreatorLeaderboard(sourceValueGrader)
  const postRunLedger = classifyPostRunLedgerStatus({
    latestBatch: { updatedAt: '2026-05-27T10:05:00.000Z', status: 'generated' },
    watchJob: { latestRunStatus: 'failed', latestRunStartedAt: '2026-05-27T10:00:00.000Z' },
  })
  return {
    ok: creatorLeaderboard.length === 3 &&
      buildSourceGraderReadbackTruth(sourceValueGrader).laneTotalsProven === true &&
      postRunLedger.status === 'post_run_review_needed' &&
      postRunLedger.watchRunNeedsLedgerRepair === true,
    creatorLeaderboard,
    postRunLedger,
  }
}
