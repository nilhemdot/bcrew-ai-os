#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  getIntelligenceReportBundle,
  initFoundationDb,
  listSourceCrawlItems,
} from '../lib/foundation-db.js'
import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
} from '../lib/build-intel-source-value-grader.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
  buildYoutubeCreatorDailyWatchPlan,
} from '../lib/youtube-creator-daily-watch.js'
import {
  YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID,
  YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_CARD_ID,
  YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_PLAN_PATH,
  YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_SCRIPT_PATH,
  buildYoutubeCreatorGodModeCatchupDogfoodProof,
  buildYoutubeCreatorGodModeCatchupSnapshot,
} from '../lib/youtube-creator-god-mode-catchup.js'
import {
  SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY,
} from '../lib/source-packet-worker-runner.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
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

function youtubeVideoIdFromUrl(value = '') {
  const input = text(value)
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{6,})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
  ]
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match?.[1]) return match[1]
  }
  return ''
}

function videoIdsFromMetadataRow(row = {}) {
  const metadata = row.metadata || {}
  return [
    metadata.sourceVideoId,
    metadata.videoId,
    ...(list(metadata.videoIds)),
    youtubeVideoIdFromUrl(row.anchor_value || row.anchorValue),
    youtubeVideoIdFromUrl(metadata.sourceUrl),
    youtubeVideoIdFromUrl(metadata.url),
  ].map(text).filter(Boolean)
}

async function loadAlreadyFullWatchedVideoIds() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT metadata, NULL::text AS anchor_value
        FROM intelligence_report_artifacts
        WHERE metadata->>'fullWatchRoute' = 'gemini_api_youtube_url_video_understanding'
        UNION ALL
        SELECT metadata, anchor_value
        FROM intelligence_atoms
        WHERE metadata->>'sourceVideoId' IS NOT NULL
        UNION ALL
        SELECT metadata, anchor_value
        FROM intelligence_atom_hits
        WHERE metadata->>'sourceVideoId' IS NOT NULL
      `,
    )
    const ids = new Set()
    for (const row of result.rows) {
      for (const id of videoIdsFromMetadataRow(row)) ids.add(id)
    }
    return Array.from(ids).filter(Boolean)
  } finally {
    await pool.end().catch(() => {})
  }
}

async function countSourceCrawlItemsForTarget(targetKey) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM source_crawl_items
        WHERE target_key = $1
      `,
      [targetKey],
    )
    return Number(result.rows[0]?.count || 0)
  } finally {
    await pool.end().catch(() => {})
  }
}

async function loadYoutubeFullWatchReports() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id AS "reportArtifactId",
               report_type AS "reportType",
               status,
               source_ids AS "sourceIds",
               structured_output_json AS "structuredOutputJson",
               metadata,
               created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM intelligence_report_artifacts
        WHERE metadata->>'fullWatchRoute' = 'gemini_api_youtube_url_video_understanding'
           OR metadata->>'proofMode' = 'youtube_latest_20_god_mode_api_full_watch'
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 500
      `,
    )
    return result.rows
  } finally {
    await pool.end().catch(() => {})
  }
}

function normalizeSourceValueGraderReport(bundle = {}) {
  const report = bundle.report || null
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}
  return {
    status: report?.status || structured.status || 'Needs source',
    sourceGrades: list(structured.sourceGrades),
    topDevBuildSources: list(structured.topDevBuildSources),
    topByLane: list(structured.topByLane),
    noAutoBacklogPromotion: structured.noAutoBacklogPromotion !== false,
    externalWrites: structured.externalWrites === true,
    reportArtifactId: report?.reportArtifactId || report?.report_artifact_id || BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
  }
}

function sourceDoesNotWriteOrExtract(source = '') {
  const haystack = String(source || '')
  const forbidden = [
    'update' + 'BacklogItem',
    'create' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
    'run' + 'LiveBatch',
    '--' + 'apply',
    'live-' + 'gemini-api',
  ]
  return forbidden.every(token => !haystack.includes(token))
}

async function loadLiveSnapshot() {
  const [poolItems, fullWatchedVideoIds, sourceValueGraderBundle, youtubeFullWatchReports, sourcePacketWorkerRuns] = await Promise.all([
    listSourceCrawlItems({
      targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
      limit: YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
      order: 'desc',
    }),
    loadAlreadyFullWatchedVideoIds(),
    getIntelligenceReportBundle(BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
    loadYoutubeFullWatchReports(),
    listSourceCrawlItems({
      targetKey: SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY,
      limit: 500,
      order: 'desc',
    }),
  ])
  return buildYoutubeCreatorGodModeCatchupSnapshot({
    watchPlan: buildYoutubeCreatorDailyWatchPlan(),
    poolItems,
    fullWatchedVideoIds,
    sourceValueGrader: normalizeSourceValueGraderReport(sourceValueGraderBundle),
    youtubeFullWatchReports,
    sourcePacketWorkerRuns,
  })
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    packageJson,
    parentPlanSource,
    planSource,
    moduleSource,
    scriptSource,
    sourceCrawlStoreSource,
    devHubSource,
    devHubProofSource,
    publicDevSource,
    buildIntelRoutesSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('docs/process/youtube-creator-god-mode-catchup-001-plan.md'),
    readRepoFile(YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_PLAN_PATH),
    readRepoFile('lib/youtube-creator-god-mode-catchup.js'),
    readRepoFile(YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_SCRIPT_PATH),
    readRepoFile('lib/foundation-source-crawl-store.js'),
    readRepoFile('lib/dev-team-hub.js'),
    readRepoFile('scripts/process-dev-team-hub-v0-check.mjs'),
    readRepoFile('public/dev.js'),
    readRepoFile('lib/foundation-build-intel-routes.js'),
  ])

  await initFoundationDb()
  let snapshot = null
  try {
    snapshot = await loadLiveSnapshot()
  } finally {
    await closeFoundationDb()
  }

  const dogfood = buildYoutubeCreatorGodModeCatchupDogfoodProof()
  const targetItemCount = await countSourceCrawlItemsForTarget(YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY)
  const representedOrBlocked = list(snapshot.creators)
    .filter(row => row.representationStatus === 'represented' || row.blockedReason)

  addCheck(checks, packageJson.scripts?.['process:youtube-creator-god-mode-catchup-check'] === `node --env-file-if-exists=.env ${YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_SCRIPT_PATH}`, 'package exposes focused catch-up readback proof', packageJson.scripts?.['process:youtube-creator-god-mode-catchup-check'] || 'missing')
  addCheck(checks, parentPlanSource.includes('The watchlist coverage report shows every approved public creator') && parentPlanSource.includes('comment status as `operator_excluded`'), 'parent catch-up plan requires all-creator coverage and comment exclusion', YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID)
  addCheck(checks, planSource.includes('baseline is incomplete') && planSource.includes('no live Gemini spend'), 'readback plan is no-spend and honest about incomplete baseline', YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_PLAN_PATH)
  addCheck(
    checks,
    moduleSource.includes('approvedResourceFollowStatus') &&
      moduleSource.includes('sourcePacketWorkerStatus') &&
      moduleSource.includes('browserHandsStatus') &&
      moduleSource.includes('fullPageExtractionStatus') &&
      moduleSource.includes('freeResourceCaptureStatus') &&
      moduleSource.includes('paidGateEvaluationStatus') &&
      moduleSource.includes('youtubeSopStatus') &&
      moduleSource.includes('buildYoutubeCreatorSourceSopEvidence') &&
      moduleSource.includes('buildSourcePacketPreview') &&
      moduleSource.includes('sourcePacketReviewQueue'),
    'module reports full YouTube source SOP status per creator',
    'lib/youtube-creator-god-mode-catchup.js',
  )
  addCheck(checks, moduleSource.includes('majorBuildPromotionAllowed') && moduleSource.includes('blocked_source_sop_incomplete'), 'module exposes Scoper/build-promotion baseline plus SOP gate', 'buildPromotionReadiness')
  addCheck(checks, devHubSource.includes('youtubeCreatorGodModeCatchup') && devHubSource.includes('buildYoutubeCreatorGodModeCatchupSnapshot'), 'Dev Hub API consumes catch-up readback payload', 'lib/dev-team-hub.js')
  addCheck(checks, devHubProofSource.includes('youtubeCreatorGodModeCatchup'), 'Dev Hub focused proof checks catch-up readback visibility', 'scripts/process-dev-team-hub-v0-check.mjs')
  addCheck(checks, publicDevSource.includes('youtubeCreatorGodModeCatchup') && publicDevSource.includes('baseline'), 'Dev page can render catch-up baseline state in the source leaderboard/card', 'public/dev.js')
  addCheck(
    checks,
    publicDevSource.includes('SOP incomplete') &&
      publicDevSource.includes('freeResourceCaptureStatus') &&
      publicDevSource.includes('paidGateEvaluationStatus') &&
      publicDevSource.includes('sourceSopEvidence'),
    'Dev page distinguishes video baseline from full YouTube source SOP completion',
    'public/dev.js',
  )
  addCheck(checks, sourceDoesNotWriteOrExtract(`${moduleSource}\n${scriptSource}`), 'catch-up readback proof has no write, live extraction, or provider-call path', YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_SCRIPT_PATH)
  addCheck(checks, dogfood.ok === true, 'dogfood proves comments excluded, blocked creator reason, S/A deep target, C/D throttle, long-course routing, and promotion block', JSON.stringify(dogfood.cases))
  addCheck(checks, snapshot.ok === true, 'live catch-up snapshot is healthy', snapshot.failed.map(item => item.check).join(', ') || snapshot.status)
  addCheck(checks, list(snapshot.creators).length >= 3, 'live snapshot covers multiple approved public creators', `${list(snapshot.creators).length}`)
  addCheck(checks, representedOrBlocked.length === list(snapshot.creators).length, 'all approved public creators are represented or have a blocked reason', `${representedOrBlocked.length}/${list(snapshot.creators).length}`)
  addCheck(checks, list(snapshot.creators).every(row => row.commentStatus === 'operator_excluded'), 'comments are operator-excluded, not parked', 'operator_excluded')
  addCheck(
    checks,
    list(snapshot.creators).every(row =>
      row.fullPageExtractionStatus &&
      row.approvedResourceFollowStatus &&
      row.sourcePacketWorkerStatus &&
      row.browserHandsStatus &&
      row.freeResourceCaptureStatus &&
      row.freeCommunityPacketStatus &&
      row.paidGateEvaluationStatus &&
      row.autopilotDispositionStatus &&
      row.youtubeSopStatus
    ),
    'every creator exposes full source SOP status',
    'page/resource/worker/Hands/free-resource/community/paid-gate/autopilot explicit',
  )
  addCheck(checks, Number(snapshot.summary?.trackedMetadataCount || 0) >= list(snapshot.creators).length, 'tracked YouTube metadata is visible for catch-up planning', `${snapshot.summary?.trackedMetadataCount || 0} rows`)
  addCheck(
    checks,
    buildIntelRoutesSource.includes('YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT') &&
      !/targetKey:\s*['"]youtube-creator-daily-watch['"][\s\S]{0,120}limit:\s*200/.test(buildIntelRoutesSource),
    'daily watch API route uses the full creator readback limit',
    `limit=${YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT}`,
  )
  addCheck(
    checks,
    sourceCrawlStoreSource.includes('async function listSourceCrawlItems') &&
      sourceCrawlStoreSource.includes('const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 50))'),
    'source crawl item readback supports 1000-row daily watch baselines',
    'lib/foundation-source-crawl-store.js',
  )
  addCheck(
    checks,
    targetItemCount <= 200 || Number(snapshot.summary?.trackedMetadataCount || 0) > 200,
    'catch-up readback is not capped at the old 200-row source-crawl limit',
    `targetRows=${targetItemCount}; trackedMetadata=${snapshot.summary?.trackedMetadataCount || 0}`,
  )
  addCheck(checks, Number(snapshot.summary?.videoAudioVisualWatchedCount || 0) >= 1, 'video/audio/visual watched count is visible', `${snapshot.summary?.videoAudioVisualWatchedCount || 0}`)
  addCheck(
    checks,
    Number(snapshot.summary?.fullWatchReportCount || 0) >= 1 &&
      Number(snapshot.summary?.sourceSopEvidenceVideoCount || 0) >= 1 &&
      Number(snapshot.summary?.fullPageEvidenceCount || 0) >= 1,
    'catch-up source SOP status reads real full-watch/page-evidence reports',
    `reports=${snapshot.summary?.fullWatchReportCount || 0}; videos=${snapshot.summary?.sourceSopEvidenceVideoCount || 0}; pages=${snapshot.summary?.fullPageEvidenceCount || 0}`,
  )
  addCheck(
    checks,
    list(snapshot.creators).some(row => Number(row.sourceSopEvidence?.evidenceVideoCount || 0) >= 1) &&
      list(snapshot.creators).some(row => String(row.fullPageExtractionStatus || '').startsWith('partial_') || row.fullPageExtractionStatus === 'complete'),
    'creator rows expose evidence-backed SOP progress instead of watched-count placeholders',
    'sourceSopEvidence + fullPageExtractionStatus',
  )
  addCheck(
    checks,
    Number(snapshot.summary?.sourcePacketActionCount || 0) >= 1 &&
      list(snapshot.sourcePacketReviewQueue).length >= 1,
    'catch-up source SOP turns watched-page links into source-packet review actions',
    `actions=${snapshot.summary?.sourcePacketActionCount || 0}; queue=${list(snapshot.sourcePacketReviewQueue).length}`,
  )
  addCheck(
    checks,
    list(snapshot.sourcePacketReviewQueue).every(item =>
      /^https?:\/\//i.test(text(item.url)) &&
      item.sourcePacketPreview?.sourcePacketId &&
      item.sourcePacketValidation?.ok === true &&
      item.sourcePacketPreview?.startsCrawler === false &&
      item.sourcePacketPreview?.externalWrites === false &&
      item.sourcePacketPreview?.writesBacklog === false &&
      item.sourcePacketPreview?.runtimePlan?.startsImmediately === false &&
      item.sourcePacketPreview?.runtimePlan?.startsFromApprovalAction === false
    ),
    'source-packet review queue is validated and cannot start crawl/write work from approval',
    `${list(snapshot.sourcePacketReviewQueue).length} packet previews`,
  )
  addCheck(
    checks,
    list(snapshot.creators).some(row => Number(row.sourceSopEvidence?.sourcePacketActionCount || 0) >= 1) &&
      list(snapshot.creators).every(row => row.sourceSopEvidence && Number(row.sourceSopEvidence.sourcePacketActionCount || 0) >= 0),
    'creator rows expose source-packet counts for YouTube SOP follow-up',
    'sourcePacketActionCount per creator',
  )
  addCheck(
    checks,
    snapshot.buildPromotionReadiness?.visibleToScoper === true &&
      snapshot.buildPromotionReadiness?.majorBuildPromotionAllowed === (
        Number(snapshot.summary?.baselineIncompleteCount || 0) === 0 &&
        Number(snapshot.summary?.sourceSopIncompleteCount || 0) === 0
      ),
    'Scoper/build-promotion gate reflects baseline and source SOP completion',
    snapshot.buildPromotionReadiness?.status || 'missing',
  )
  addCheck(checks, snapshot.reportOnly === true && snapshot.liveExtractionStarted === false && snapshot.writesBacklog === false && snapshot.writesExternalSystems === false, 'live proof is report-only and no-spend', `${snapshot.reportOnly}/${snapshot.liveExtractionStarted}/${snapshot.writesBacklog}/${snapshot.writesExternalSystems}`)
  addCheck(checks, list(snapshot.sourceIds).includes(YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID), 'snapshot keeps YouTube source ID lineage', list(snapshot.sourceIds).join(', ') || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : snapshot.status,
    cardId: YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_CARD_ID,
    parentCardId: YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID,
    sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    checks,
    failed,
    snapshot: {
      status: snapshot.status,
      summary: snapshot.summary,
      targetItemCount,
      buildPromotionReadiness: snapshot.buildPromotionReadiness,
      nextWatchRows: list(snapshot.creators)
        .filter(row => row.baselineGap > 0 || row.deepBaselineGap > 0 || row.pendingStandardVideoCount > 0)
        .slice(0, 12)
        .map(row => ({
          creatorId: row.creatorId,
          creator: row.creator,
          devBuildGrade: row.devBuildGrade,
          trackedMetadataCount: row.trackedMetadataCount,
          videoAudioVisualWatchedCount: row.videoAudioVisualWatchedCount,
          baselineGap: row.baselineGap,
          deepBaselineGap: row.deepBaselineGap,
          pendingStandardVideoCount: row.pendingStandardVideoCount,
          longCoursePendingCount: row.longCoursePendingCount,
          nextWatchAction: row.nextWatchAction,
        })),
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`YouTube Creator God Mode Catch-Up Readback: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
