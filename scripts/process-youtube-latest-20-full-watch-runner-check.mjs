#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
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
  buildYoutubeLatest20IntelRunSnapshot,
} from '../lib/youtube-latest-20-intel-run.js'
import {
  YOUTUBE_LATEST_20_FULL_WATCH_MODEL,
  YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_APPROVAL_PATH,
  YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID,
  YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_PLAN_PATH,
  YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_SCRIPT_PATH,
  YOUTUBE_LATEST_20_FULL_WATCH_TIMEOUT_MS,
  buildSnapshotFromYoutubeLatest20FullWatchReport,
  buildYoutubeLatest20FullWatchDogfoodProof,
  buildYoutubeLatest20FullWatchSnapshot,
  buildYoutubeLatest20FullWatchWriteSet,
  renderYoutubeLatest20FullWatchReport,
  runYoutubeLatest20FullWatchExtraction,
  verifyYoutubeLatest20FullWatchPersistedProof,
  youtubeLatest20FullWatchReportArtifactId,
  youtubeLatest20FullWatchReportPath,
} from '../lib/youtube-latest-20-full-watch-runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'youtube-latest-20-full-watch-runner'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    liveGeminiApi: argv.includes('--live-gemini-api') || argv.includes('--live-gemini-api=true'),
    batchSize: Number(readArgValue(argv, '--batch-size=')) || 9,
    model: readArgValue(argv, '--model=') || YOUTUBE_LATEST_20_FULL_WATCH_MODEL,
    geminiTimeoutMs: Number(readArgValue(argv, '--gemini-timeout-ms=')) || YOUTUBE_LATEST_20_FULL_WATCH_TIMEOUT_MS,
    creatorIds: readArgValues(argv, '--creator-id='),
    videoIds: readArgValues(argv, '--video-id='),
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
        LIMIT 600
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
    scriptPath: YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_SCRIPT_PATH,
    operation: 'persist non-Mark YouTube API full-watch batch report, proposal-only atoms, and evidence hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildYoutubeLatest20FullWatchWriteSet(snapshot)
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
  await fs.writeFile(path.join(repoRoot, snapshot.reportPath || youtubeLatest20FullWatchReportPath({ batchRunId: snapshot.batchRunId })), renderYoutubeLatest20FullWatchReport(snapshot), 'utf8')
  return { writeSet, report, atoms, hits }
}

async function loadLatestPersistedReportArtifactId() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = $1
           OR report_artifact_id LIKE $2
           OR metadata->>'proofMode' = 'youtube_latest_20_god_mode_api_full_watch'
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `,
      [YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID, `${YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID}:%`],
    )
    return result.rows[0]?.report_artifact_id || YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID
  } finally {
    await pool.end().catch(() => {})
  }
}

async function loadPersistedBatch() {
  const reportArtifactId = await loadLatestPersistedReportArtifactId()
  const bundle = await getIntelligenceReportBundle(reportArtifactId, { atomLimit: 260, hitLimit: 360 })
  return {
    ...bundle,
    snapshot: buildSnapshotFromYoutubeLatest20FullWatchReport(bundle.report),
  }
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
  if (args.batchSize < 1 || args.batchSize > 9) {
    throw new Error('--batch-size must be between 1 and 9.')
  }

  await initFoundationDb()
  try {
    const now = new Date().toISOString()
    const batchRunId = now.replace(/[^0-9]/g, '').slice(0, 14)
    const reportArtifactId = youtubeLatest20FullWatchReportArtifactId({ batchRunId, creatorIds: args.creatorIds })
    const reportPath = youtubeLatest20FullWatchReportPath({ batchRunId, creatorIds: args.creatorIds })
    const [
      packageJson,
      planSource,
      moduleSource,
      approvalValidation,
      dogfood,
      poolRows,
      alreadyFullWatchedVideoIds,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_PLAN_PATH),
      readRepoFile('lib/youtube-latest-20-full-watch-runner.js'),
      validatePlanApprovalFile({
        repoRoot,
        approvalRef: YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_APPROVAL_PATH,
        cardId: YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID,
      }),
      buildYoutubeLatest20FullWatchDogfoodProof(),
      loadDailyWatchPoolRows(),
      loadAlreadyFullWatchedVideoIds(),
    ])
    const manifest = buildYoutubeLatest20IntelRunSnapshot({
      poolRows,
      alreadyFullWatchedVideoIds,
      creatorIds: args.creatorIds,
      videoIds: args.videoIds,
      maxCreators: args.creatorIds.length ? args.creatorIds.length : args.videoIds.length ? args.batchSize : undefined,
      maxVideosPerCreator: args.creatorIds.length ? args.batchSize : undefined,
      maxRunVideos: args.batchSize,
    })
    selectedVideos = list(manifest.selectedVideos).slice(0, args.batchSize)

    if (args.apply) {
      if (!args.liveGeminiApi) {
        throw new Error('--apply requires --live-gemini-api for a fresh full-watch extraction.')
      }
      if (!manifest.ok || !selectedVideos.length) {
        throw new Error(`Latest-20 manifest is not ready: ${manifest.failures?.map(failure => failure.check).join(', ') || 'no selected videos'}`)
      }
      const transcriptArtifacts = await loadTranscriptArtifacts()
      const videoResults = await runYoutubeLatest20FullWatchExtraction({
        videos: selectedVideos,
        transcriptArtifacts,
        model: args.model,
        now,
        actor: ACTOR,
        geminiTimeoutMs: args.geminiTimeoutMs,
        reportArtifactId,
      })
      snapshot = buildYoutubeLatest20FullWatchSnapshot({
        generatedAt: now,
        batchRunId,
        reportArtifactId,
        reportPath,
        videos: selectedVideos,
        videoResults,
        model: args.model,
        liveGeminiApi: true,
        manifest,
      })
      if (!snapshot.ok) {
        throw new Error(`Latest-20 full-watch batch blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
      }
      const persistedWrite = await persistBatch(snapshot)
      const persisted = await getIntelligenceReportBundle(reportArtifactId, { atomLimit: 260, hitLimit: 360 })
      persistence = verifyYoutubeLatest20FullWatchPersistedProof({
        snapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
      if (!persistence.ok) {
        throw new Error(`Persisted proof failed: ${persistence.failures.map(failure => failure.check).join(', ')}`)
      }
      persistence.writeSet = persistedWrite.writeSet
    } else {
      const persisted = await loadPersistedBatch()
      snapshot = persisted.snapshot?.ok ? persisted.snapshot : null
      persistence = persisted.report
        ? verifyYoutubeLatest20FullWatchPersistedProof({
          snapshot,
          report: persisted.report,
          atoms: persisted.atoms,
          hits: persisted.hits,
        })
        : null
    }

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:youtube-latest-20-full-watch-runner-check'] === `node --env-file-if-exists=.env ${YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_SCRIPT_PATH}`, 'package exposes latest-20 full-watch runner proof', packageJson.scripts?.['process:youtube-latest-20-full-watch-runner-check'] || 'missing')
    addCheck(checks, /safe public resource links are resolved or explicitly blocked/i.test(moduleSource), 'module blocks unresolved public resource links before Scoper', 'lib/youtube-latest-20-full-watch-runner.js')
    addCheck(checks, /full video\/audio\/visual/i.test(planSource) && /resource-link resolver/i.test(planSource), 'plan requires full-watch plus resource-link resolver', YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_PLAN_PATH)
    addCheck(checks, dogfood.ok === true, 'dogfood covers healthy batch, unresolved link rejection, and no-write posture', JSON.stringify(dogfood.checks))
    addCheck(checks, poolRows.length >= 1, 'live daily-watch pool has non-Mark candidate rows', `${poolRows.length}`)
    addCheck(checks, manifest.ok === true, 'latest-20 manifest is ready for guarded full-watch', manifest.failures?.map(failure => failure.check).join(', ') || manifest.status)
    addCheck(checks, selectedVideos.length >= 1, 'selected videos are ready for full-watch runner', selectedVideos.map(video => `${video.creatorId}:${video.videoId}`).join(', '))
    addCheck(checks, args.apply ? snapshot?.ok === true : true, 'fresh full-watch snapshot is healthy when applied', snapshot?.failures?.map(failure => failure.check).join(', ') || snapshot?.status || 'not applied')
    addCheck(checks, args.apply ? persistence?.ok === true : true, 'persisted report, atoms, and hits read back when applied', persistence?.failures?.map(failure => failure.check).join(', ') || (persistence ? 'ok' : 'not applied'))
    addCheck(checks, snapshot ? snapshot.noAutoBacklogPromotion === true && snapshot.externalWrites === false : true, 'runner has no auto backlog or external writes', snapshot ? `noAuto=${snapshot.noAutoBacklogPromotion} external=${snapshot.externalWrites}` : 'not applied')

    const failures = checks.filter(check => !check.ok)
    const result = {
      ok: failures.length === 0,
      status: failures.length
        ? 'blocked'
        : args.apply
          ? 'healthy'
          : snapshot
            ? 'healthy_persisted_batch_ready_for_next_apply'
            : 'ready_for_apply',
      cardId: YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID,
      reportArtifactId: args.apply ? reportArtifactId : (snapshot?.reportArtifactId || YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID),
      selectedVideos: selectedVideos.map(video => ({
        creator: video.creator,
        creatorId: video.creatorId,
        rank: video.rank,
        videoId: video.videoId,
        title: video.title,
        url: video.url,
      })),
      snapshot: snapshot ? {
        status: snapshot.status,
        batchRunId: snapshot.batchRunId,
        model: snapshot.model,
        videoCount: list(snapshot.videoResults).length,
        totalBuildCandidates: snapshot.summary?.totalBuildCandidates || 0,
        totalTimestampedVisualEvidence: snapshot.summary?.totalTimestampedVisualEvidence || 0,
        approvalRequiredLinkCount: snapshot.summary?.approvalRequiredLinkCount || 0,
        resolvedPublicResourceLinkCount: snapshot.summary?.resolvedPublicResourceLinkCount || 0,
        totalTokens: snapshot.summary?.totalTokens || 0,
      } : null,
      checks,
      failures,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`YouTube Latest-20 full-watch runner: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failures.length}/${checks.length} checks passed`)
    }
    process.exitCode = failures.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('YouTube Latest-20 full-watch runner proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
