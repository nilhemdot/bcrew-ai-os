#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  initFoundationDb,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-db.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessReportWriteRequested,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_APPROVAL_PATH,
  BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID,
  BUILD_INTEL_SOURCE_VALUE_GRADER_PLAN_PATH,
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_PATH,
  BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH,
  buildBuildIntelSourceValueGraderDogfoodProof,
  buildBuildIntelSourceValueGraderSnapshot,
  buildBuildIntelSourceValueGraderWriteSet,
  renderBuildIntelSourceValueGraderReport,
} from '../lib/build-intel-source-value-grader.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
  buildYoutubeCreatorDailyWatchPlan,
  normalizeYoutubeChannelUrl,
} from '../lib/youtube-creator-daily-watch.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'build-intel-source-value-grader-v1'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    writeReport: isProcessReportWriteRequested(argv),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function isDeepVisualReviewReport(report = {}) {
  const reportArtifactId = String(report.report_artifact_id || report.reportArtifactId || '')
  return reportArtifactId.startsWith('batch:youtube-deep-visual-review:v1') ||
    report.metadata?.proofMode === 'youtube_deep_visual_review_v1'
}

async function loadFullWatchReports({ limit = 500 } = {}) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, title, structured_output_json, action_required_items, metadata, created_at, updated_at
        FROM intelligence_report_artifacts
        WHERE metadata->>'fullWatchRoute' = 'gemini_api_youtube_url_video_understanding'
           OR report_artifact_id LIKE 'batch:youtube-latest-20:api-full-watch-v1%'
           OR report_artifact_id LIKE 'batch:youtube-long-course:api-full-watch-v1%'
           OR metadata->>'proofMode' = 'youtube_long_course_god_mode_api_full_watch'
           OR report_artifact_id LIKE 'batch:youtube-deep-visual-review:v1%'
           OR metadata->>'proofMode' = 'youtube_deep_visual_review_v1'
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT $1
      `,
      [Math.min(1000, Math.max(1, Number(limit) || 500))],
    )
    return result.rows
  } finally {
    await pool.end().catch(() => {})
  }
}

async function loadDirectorReport() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, title, structured_output_json, metadata, created_at, updated_at
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = 'director:dev-team-intelligence-director-001:aios-mission-v0'
        LIMIT 1
      `,
    )
    return result.rows[0] || null
  } finally {
    await pool.end().catch(() => {})
  }
}

function normalizeCreatorName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

async function loadActiveDailyWatchFilter() {
  const watchPlan = buildYoutubeCreatorDailyWatchPlan()
  const activeChannelByCreator = new Map(watchPlan.creators.map(creator => [
    String(creator.creatorId || '').trim(),
    normalizeYoutubeChannelUrl(creator.channelUrl || creator.channelVideosUrl || ''),
  ]))
  const activeCreatorIdsByName = new Map(watchPlan.creators
    .map(creator => [normalizeCreatorName(creator.displayName), String(creator.creatorId || '').trim()])
    .filter(([name, creatorId]) => name && creatorId))
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT metadata->>'creatorId' AS creator_id,
               metadata->>'videoId' AS video_id,
               metadata->>'channelUrl' AS channel_url
        FROM source_crawl_items
        WHERE target_key = $1
          AND metadata->>'creatorId' IS NOT NULL
          AND metadata->>'videoId' IS NOT NULL
      `,
      [YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY],
    )
    const activeVideoIdsByCreator = new Map()
    for (const row of result.rows) {
      const creatorId = String(row.creator_id || '').trim()
      if (!activeChannelByCreator.has(creatorId)) continue
      const expectedChannelUrl = activeChannelByCreator.get(creatorId) || ''
      const rowChannelUrl = normalizeYoutubeChannelUrl(row.channel_url || '')
      if (expectedChannelUrl && rowChannelUrl && rowChannelUrl !== expectedChannelUrl) continue
      if (!activeVideoIdsByCreator.has(creatorId)) activeVideoIdsByCreator.set(creatorId, new Set())
      activeVideoIdsByCreator.get(creatorId).add(String(row.video_id || '').trim())
    }
    return { activeVideoIdsByCreator, activeCreatorIdsByName }
  } finally {
    await pool.end().catch(() => {})
  }
}

async function persistSnapshot(snapshot = {}, options = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH,
    operation: 'persist Build Intel source-value grader report',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildBuildIntelSourceValueGraderWriteSet(snapshot)
  const report = await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
  if (options.writeReport) {
    await fs.writeFile(path.join(repoRoot, BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_PATH), renderBuildIntelSourceValueGraderReport(snapshot), 'utf8')
  }
  return { report, writeSet }
}

async function main() {
  const args = parseArgs()
  const checks = []
  let persistence = null

  await initFoundationDb()

  const [
    packageJson,
    planSource,
    moduleSource,
    scriptSource,
    approvalValidation,
    dogfood,
    reports,
    directorReport,
    activeDailyWatchFilter,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(BUILD_INTEL_SOURCE_VALUE_GRADER_PLAN_PATH),
    readRepoFile('lib/build-intel-source-value-grader.js'),
    readRepoFile(BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: BUILD_INTEL_SOURCE_VALUE_GRADER_APPROVAL_PATH,
      cardId: BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID,
    }),
    buildBuildIntelSourceValueGraderDogfoodProof(),
    loadFullWatchReports(),
    loadDirectorReport(),
    loadActiveDailyWatchFilter(),
  ])

  const activeVideoIdsByCreator = activeDailyWatchFilter.activeVideoIdsByCreator
  const activeCreatorIdsByName = activeDailyWatchFilter.activeCreatorIdsByName
  const snapshot = buildBuildIntelSourceValueGraderSnapshot({
    reports,
    directorReport,
    activeVideoIdsByCreator,
    activeCreatorIdsByName,
  })

  if (args.apply) {
    persistence = await persistSnapshot(snapshot, { writeReport: args.writeReport })
  }

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || BUILD_INTEL_SOURCE_VALUE_GRADER_APPROVAL_PATH)
  addCheck(checks, packageJson.scripts?.['process:build-intel-source-value-grader-check'] === 'node --env-file-if-exists=.env scripts/process-build-intel-source-value-grader-check.mjs', 'package exposes focused source-value grader proof', packageJson.scripts?.['process:build-intel-source-value-grader-check'] || 'missing')
  addCheck(checks, /lane-specific grades/i.test(planSource) && /realtor AI coaching\/training value/i.test(planSource), 'plan requires lane-specific source grades', BUILD_INTEL_SOURCE_VALUE_GRADER_PLAN_PATH)
  addCheck(
    checks,
    [
      'aios_dev_build',
      'ops_process',
      'sales_conversion',
      'marketing_recruiting',
      'marketing_lead_gen',
      'steve_ai_authority',
      'realtor_ai_training',
      'leadership_strategy',
      'product_tool_evaluation',
    ].every(laneId => moduleSource.includes(laneId)),
    'module separates shared Foundation business lanes instead of global Dev-only grading',
    'Dev, Ops, Sales, Recruiting, Lead Gen, Steve Authority, Realtor Training, Strategy, Product/Tool',
  )
  addCheck(checks, scriptSource.includes('upsertIntelligenceReportArtifact') && scriptSource.includes('renderBuildIntelSourceValueGraderReport'), 'focused proof can persist a reviewable report', BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH)
  addCheck(
    checks,
    scriptSource.includes('loadFullWatchReports({ limit = 500 }') &&
      scriptSource.includes('Math.min(1000') &&
      !/loadFullWatchReports\(\{ limit = 40 \}/.test(scriptSource) &&
      !/Math\.min\(80,/.test(scriptSource),
    'source-value grader reads the full current YouTube report spine instead of a recent 40-report slice',
    `reports=${reports.length}`,
  )
  addCheck(checks, dogfood.ok === true, 'dogfood proves ranking, lane split, no volume-only S grade, and throttling', JSON.stringify(dogfood.cases))
  addCheck(checks, activeVideoIdsByCreator.size >= 3, 'source-value grader filters stale reports through current daily-watch video IDs', `${activeVideoIdsByCreator.size} creator active-video maps`)
  addCheck(checks, activeCreatorIdsByName.size >= 3, 'source-value grader maps nameless stale reports back to active creator identities', `${activeCreatorIdsByName.size} active creator names`)
  addCheck(checks, reports.length >= 3, 'live full-watch reports are available', `${reports.length}`)
  addCheck(checks, reports.some(isDeepVisualReviewReport), 'live deep visual reports feed source-value grading', reports.map(report => report.report_artifact_id || report.reportArtifactId).filter(Boolean).join(', ') || 'missing')
  addCheck(checks, Boolean(directorReport), 'live Dev Director report is available', directorReport?.report_artifact_id || 'missing')
  addCheck(checks, snapshot.ok === true, 'source-value grader snapshot is healthy', snapshot.failures.map(failure => failure.check).join(', ') || snapshot.status)
  addCheck(checks, snapshot.sourceGrades.length >= 5, 'source-value grader ranks multiple creators', `${snapshot.sourceGrades.length}`)
  addCheck(
    checks,
    !snapshot.sourceGrades.some(source => String(source.creator || '').trim() === 'Andrej Karpathy' && !String(source.creatorId || '').trim()),
    'corrected creator channels cannot retain blank-id stale grading rows',
    snapshot.sourceGrades
      .filter(source => String(source.creator || '').trim() === 'Andrej Karpathy')
      .map(source => `${source.creatorId || 'blank'}:${source.watchedVideos}`)
      .join(', ') || 'no active Andrej source grade until corrected videos are watched',
  )
  const realtorTrainingLane = Array.isArray(snapshot.topByLane)
    ? snapshot.topByLane.find(lane => lane.laneId === 'realtor_ai_training')
    : null
  const realtorTrainingSources = Array.isArray(realtorTrainingLane?.sources) ? realtorTrainingLane.sources : []
  addCheck(
    checks,
    Boolean(realtorTrainingLane) &&
      realtorTrainingSources.length >= 3 &&
      realtorTrainingSources.every(source =>
        String(source.creator || '').trim() &&
        String(source.grade || '').trim() &&
        Number.isFinite(Number(source.score)) &&
        Number(source.score) > 0
      ),
    'realtor training value is preserved as a lane',
    realtorTrainingSources.map(source => `${source.creator}:${source.grade}:${source.score}`).join(', ') || 'missing realtor_ai_training lane',
  )
  addCheck(checks, snapshot.externalWrites === false && snapshot.noAutoBacklogPromotion === true, 'grader remains report-only', `${snapshot.externalWrites}/${snapshot.noAutoBacklogPromotion}`)
  if (args.apply) {
    addCheck(checks, persistence?.report?.reportArtifactId || persistence?.report?.report_artifact_id, 'persisted source-value grader report reads back', persistence?.report?.reportArtifactId || persistence?.report?.report_artifact_id || 'missing')
  }

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : snapshot.status,
    cardId: BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID,
    reportArtifactId: BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
    checks,
    failed: failures,
    snapshot: {
      status: snapshot.status,
      sourceCount: snapshot.sourceGrades.length,
      topDevBuildSources: snapshot.topDevBuildSources.slice(0, 8).map(source => ({
        creatorId: source.creatorId,
        creator: source.creator,
        devBuildGrade: source.devBuildGrade,
        overallGrade: source.overallGrade,
        primaryUse: source.primaryUse,
        watchRecommendation: source.watchRecommendation,
        watchedVideos: source.watchedVideos,
        buildCandidates: source.buildCandidates,
        bestDirectorRank: source.bestDirectorRank,
      })),
      sourceGrades: snapshot.sourceGrades.map(source => ({
        creatorId: source.creatorId,
        creator: source.creator,
        devBuildGrade: source.devBuildGrade,
        overallGrade: source.overallGrade,
        primaryUse: source.primaryUse,
        watchRecommendation: source.watchRecommendation,
        watchedVideos: source.watchedVideos,
        buildCandidates: source.buildCandidates,
        bestDirectorRank: source.bestDirectorRank,
      })),
      topByLane: snapshot.topByLane,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Build Intel Source Value Grader check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
