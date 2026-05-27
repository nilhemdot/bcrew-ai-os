#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
  getIntelligenceReportBundle,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  recordIntelligenceAtomHit,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from '../lib/youtube-creator-daily-watch.js'
import {
  runYoutubeLatest20FullWatchExtraction,
} from '../lib/youtube-latest-20-full-watch-runner.js'
import {
  YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_APPROVAL_PATH,
  YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID,
  YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_PLAN_PATH,
  YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_SCRIPT_PATH,
  YOUTUBE_LONG_COURSE_FULL_WATCH_MODEL,
  buildLongCourseSegmentPlan,
  buildYoutubeLongCourseFullWatchDogfoodProof,
  buildYoutubeLongCourseFullWatchSnapshot,
  buildYoutubeLongCourseFullWatchWriteSet,
  renderYoutubeLongCourseFullWatchReport,
  selectYoutubeLongCourseVideos,
  verifyYoutubeLongCourseFullWatchPersistedProof,
  youtubeLongCourseFullWatchReportArtifactId,
  youtubeLongCourseFullWatchReportPath,
} from '../lib/youtube-long-course-full-watch-lane.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'youtube-long-course-full-watch-lane'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    liveGeminiApi: argv.includes('--live-gemini-api') || argv.includes('--live-gemini-api=true'),
    batchSize: Number(readArgValue(argv, '--batch-size=')) || 1,
    model: readArgValue(argv, '--model=') || YOUTUBE_LONG_COURSE_FULL_WATCH_MODEL,
    creatorIds: readArgValues(argv, '--creator-id='),
  }
}

function readArgValue(argv = [], prefix = '') {
  const found = argv.find(arg => String(arg || '').startsWith(prefix))
  return found ? String(found).slice(prefix.length).trim() : ''
}

function readArgValues(argv = [], prefix = '') {
  return argv
    .filter(arg => String(arg || '').startsWith(prefix))
    .flatMap(arg => String(arg).slice(prefix.length).split(','))
    .map(text)
    .filter(Boolean)
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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function loadDailyWatchPoolRows() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT external_id, target_key, source_id, status, discovered_at, processed_at, metadata
        FROM source_crawl_items
        WHERE target_key = $1
          AND source_id = $2
          AND COALESCE(metadata->>'creatorId', '') <> 'mark-kashef'
        ORDER BY COALESCE(metadata->>'creatorId', ''), COALESCE((metadata->>'rank')::int, 9999), discovered_at DESC
        LIMIT 800
      `,
      [YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    )
    return result.rows
  } finally {
    await pool.end().catch(() => {})
  }
}

async function loadAlreadyFullWatchedVideoIds() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        WITH watched_reports AS (
          SELECT report_artifact_id
          FROM intelligence_report_artifacts
          WHERE metadata->>'fullWatchRoute' = 'gemini_api_youtube_url_video_understanding'
             OR metadata->>'proofMode' IN (
               'youtube_latest_20_god_mode_api_full_watch',
               'youtube_long_course_god_mode_api_full_watch'
             )
             OR report_artifact_id LIKE 'batch:youtube-latest-20:api-full-watch-v1:%'
             OR report_artifact_id LIKE 'batch:youtube-long-course:api-full-watch-v1:%'
             OR report_artifact_id = 'proof:god-mode-extractor-eyes-quality-loop-001'
        )
        SELECT metadata, NULL::text AS anchor_value
        FROM intelligence_report_artifacts
        WHERE report_artifact_id IN (SELECT report_artifact_id FROM watched_reports)
        UNION ALL
        SELECT metadata, anchor_value
        FROM intelligence_atoms
        WHERE report_artifact_id IN (SELECT report_artifact_id FROM watched_reports)
          AND metadata->>'sourceVideoId' IS NOT NULL
        UNION ALL
        SELECT metadata, anchor_value
        FROM intelligence_atom_hits
        WHERE report_artifact_id IN (SELECT report_artifact_id FROM watched_reports)
          AND metadata->>'sourceVideoId' IS NOT NULL
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

async function loadTranscriptArtifacts() {
  const archive = await getSharedCommunicationArchiveSnapshot({
    sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
    artifactType: 'video_transcript',
    limit: 1200,
    includeSensitive: true,
  })
  return archive.items || []
}

async function persistBatch(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_SCRIPT_PATH,
    operation: 'persist public YouTube long-course deep-watch report, proposal-only atoms, and evidence hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildYoutubeLongCourseFullWatchWriteSet(snapshot)
  let report = await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
  const atoms = []
  const hits = []
  const actualAtomIdByRequested = new Map()
  for (const atomInput of writeSet.atomInputs) {
    const atom = await upsertIntelligenceAtom(atomInput, ACTOR)
    atoms.push(atom)
    actualAtomIdByRequested.set(atomInput.atomId || atomInput.atom_id, atom.atomId || atom.atom_id)
  }
  for (const hitInput of writeSet.hitInputs) {
    hits.push(await recordIntelligenceAtomHit({
      ...hitInput,
      atomId: actualAtomIdByRequested.get(hitInput.atomId || hitInput.atom_id) || hitInput.atomId || hitInput.atom_id,
    }, ACTOR))
  }
  report = await upsertIntelligenceReportArtifact({
    ...writeSet.reportArtifact,
    inputAtomIds: atoms.map(atom => atom.atomId || atom.atom_id),
  }, ACTOR)
  await fs.writeFile(path.join(repoRoot, snapshot.reportPath || youtubeLongCourseFullWatchReportPath({ batchRunId: snapshot.batchRunId })), renderYoutubeLongCourseFullWatchReport(snapshot), 'utf8')
  return { writeSet, report, atoms, hits }
}

async function main() {
  const args = parseArgs()
  const checks = []
  let snapshot = null
  let persistence = null
  let selectedVideos = []

  if (args.liveGeminiApi && !args.apply) {
    throw new Error('--live-gemini-api is only allowed with --apply so paid provider work is persisted and auditable.')
  }
  if (args.batchSize < 1 || args.batchSize > 3) {
    throw new Error('--batch-size must be between 1 and 3 for long-course extraction.')
  }

  await initFoundationDb()
  try {
    const now = new Date().toISOString()
    const batchRunId = now.replace(/[^0-9]/g, '').slice(0, 14)
    const reportArtifactId = youtubeLongCourseFullWatchReportArtifactId({ batchRunId, creatorIds: args.creatorIds })
    const reportPath = youtubeLongCourseFullWatchReportPath({ batchRunId, creatorIds: args.creatorIds })
    const [
      packageJson,
      planSource,
      moduleSource,
      approvalValidation,
      dogfood,
      backlogCards,
      poolRows,
      alreadyFullWatchedVideoIds,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_PLAN_PATH),
      readRepoFile('lib/youtube-long-course-full-watch-lane.js'),
      validatePlanApprovalFile({
        repoRoot,
        approvalRef: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_APPROVAL_PATH,
        cardId: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID,
      }),
      buildYoutubeLongCourseFullWatchDogfoodProof(),
      getBacklogItemsByIds([YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID]),
      loadDailyWatchPoolRows(),
      loadAlreadyFullWatchedVideoIds(),
    ])
    const [liveBacklogCard] = backlogCards || []
    const selection = selectYoutubeLongCourseVideos({
      poolRows,
      alreadyFullWatchedVideoIds,
      creatorIds: args.creatorIds,
      maxVideos: args.batchSize,
    })
    selectedVideos = list(selection.selectedVideos).slice(0, args.batchSize)

    if (args.apply) {
      if (!args.liveGeminiApi) {
        throw new Error('--apply requires --live-gemini-api for a fresh long-course full-watch extraction.')
      }
      if (!selection.ok || !selectedVideos.length) {
        throw new Error(`Long-course selection is not ready: ${selection.status}`)
      }
      const transcriptArtifacts = await loadTranscriptArtifacts()
      const segmentPlansByVideoId = Object.fromEntries(selectedVideos.map(video => [
        video.videoId,
        buildLongCourseSegmentPlan(video),
      ]))
      const videoResults = await runYoutubeLatest20FullWatchExtraction({
        videos: selectedVideos,
        transcriptArtifacts,
        model: args.model,
        now,
        actor: ACTOR,
        reportArtifactId,
        promptProfile: 'long_course',
        segmentPlansByVideoId,
      })
      snapshot = buildYoutubeLongCourseFullWatchSnapshot({
        generatedAt: now,
        batchRunId,
        reportArtifactId,
        reportPath,
        videos: selectedVideos,
        videoResults,
        model: args.model,
        liveGeminiApi: true,
        manifest: selection.manifest,
      })
      if (!snapshot.ok) {
        throw new Error(`Long-course full-watch batch blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
      }
      const persistedWrite = await persistBatch(snapshot)
      const persisted = await getIntelligenceReportBundle(reportArtifactId, { atomLimit: 120, hitLimit: 180 })
      persistence = verifyYoutubeLongCourseFullWatchPersistedProof({
        snapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
      if (!persistence.ok) {
        throw new Error(`Persisted proof failed: ${persistence.failures.map(failure => failure.check).join(', ')}`)
      }
      persistence.writeSet = persistedWrite.writeSet
    }

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_APPROVAL_PATH)
    addCheck(checks, liveBacklogCard && ['scoped', 'executing', 'done'].includes(liveBacklogCard.lane), 'live backlog exposes long-course lane card', liveBacklogCard ? `${liveBacklogCard.id}:${liveBacklogCard.lane}` : 'missing')
    addCheck(checks, packageJson.scripts?.['process:youtube-long-course-full-watch-lane-check'] === `node --env-file-if-exists=.env ${YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_SCRIPT_PATH}`, 'package exposes long-course focused proof', packageJson.scripts?.['process:youtube-long-course-full-watch-lane-check'] || 'missing')
    addCheck(checks, /promptProfile: 'long_course'/.test(moduleSource), 'module uses long-course prompt profile', 'lib/youtube-long-course-full-watch-lane.js')
    addCheck(checks, /course map/i.test(planSource) && /implementation plan/i.test(planSource), 'plan requires course map and implementation plan', YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_PLAN_PATH)
    addCheck(checks, dogfood.ok === true, 'dogfood proves long-course lane, report metadata, and proposal-only atoms', dogfood.ok ? 'ok' : 'failed')
    addCheck(checks, poolRows.length >= 1, 'live daily-watch pool has non-Mark candidate rows', `${poolRows.length}`)
    addCheck(checks, selectedVideos.length >= 1 || selection.status === 'no_long_courses_ready', 'long-course videos selected or none are ready', selection.status === 'no_long_courses_ready' ? 'none ready' : `${selectedVideos.length}`)
    addCheck(checks, args.apply ? snapshot?.ok === true : true, 'fresh long-course snapshot is healthy when applied', snapshot?.failures?.map(failure => failure.check).join(', ') || snapshot?.status || 'not applied')
    addCheck(checks, args.apply ? persistence?.ok === true : true, 'persisted long-course report, atoms, and hits read back when applied', persistence?.failures?.map(failure => failure.check).join(', ') || (persistence ? 'ok' : 'not applied'))
    addCheck(checks, snapshot ? snapshot.noAutoBacklogPromotion === true && snapshot.externalWrites === false : true, 'long-course lane has no auto backlog or external writes', snapshot ? `noAuto=${snapshot.noAutoBacklogPromotion} external=${snapshot.externalWrites}` : 'not applied')

    const failures = checks.filter(check => !check.ok)
    const result = {
      ok: failures.length === 0,
      status: failures.length
        ? 'blocked'
        : args.apply
          ? 'healthy'
          : selectedVideos.length
            ? 'ready_for_apply'
            : 'no_long_courses_ready',
      cardId: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID,
      reportArtifactId,
      selectedVideos: selectedVideos.map(video => ({
        creator: video.creator,
        creatorId: video.creatorId,
        rank: video.rank,
        videoId: video.videoId,
        title: video.title,
        url: video.url,
        duration: video.duration || '',
        segmentCount: buildLongCourseSegmentPlan(video).length,
        reasons: video.standardFullWatchRiskReasons,
      })),
      snapshot: snapshot ? {
        status: snapshot.status,
        batchRunId: snapshot.batchRunId,
        model: snapshot.model,
        videoCount: list(snapshot.videoResults).length,
        totalBuildCandidates: snapshot.summary?.totalBuildCandidates || 0,
        totalTimestampedVisualEvidence: snapshot.summary?.totalTimestampedVisualEvidence || 0,
        totalCourseMapItems: snapshot.summary?.totalCourseMapItems || 0,
        totalImplementationSteps: snapshot.summary?.totalImplementationSteps || 0,
        totalSegments: snapshot.summary?.totalSegments || 0,
        approvalRequiredLinkCount: snapshot.summary?.approvalRequiredLinkCount || 0,
        totalTokens: snapshot.summary?.totalTokens || 0,
      } : null,
      checks,
      failures,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`YouTube long-course full-watch lane: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failures.length}/${checks.length} checks passed`)
    }
    process.exitCode = failures.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('YouTube long-course full-watch lane proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
