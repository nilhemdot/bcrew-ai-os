#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getIntelligenceReportBundle,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  recordIntelligenceAtomHit,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-db.js'
import {
  MARK_KASHEF_BASELINE_SOURCE_ID,
  MARK_KASHEF_BASELINE_TARGET_KEY,
  MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
} from '../lib/god-mode-youtube-end-to-end-extractor.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_DEFAULT_SIZE,
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_MAX_SIZE,
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_MODEL,
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_NOT_NEXT,
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_PATH,
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_SCRIPT_PATH,
  buildMarkGodModeSmallBatchSnapshot,
  buildMarkGodModeSmallBatchWriteSet,
  buildSnapshotFromMarkGodModeSmallBatchReport,
  renderMarkGodModeSmallBatchReport,
  runMarkGodModeSmallBatchExtraction,
  selectMarkGodModeSmallBatchVideos,
  verifyMarkGodModeSmallBatchPersistedProof,
} from '../lib/mark-kashef-god-mode-small-batch.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'mark-kashef-god-mode-small-batch'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    liveGeminiApi: argv.includes('--live-gemini-api') || argv.includes('--live-gemini-api=true'),
    batchSize: Number(readArgValue(argv, '--batch-size=')) || MARK_KASHEF_GOD_MODE_SMALL_BATCH_DEFAULT_SIZE,
    model: readArgValue(argv, '--model=') || MARK_KASHEF_GOD_MODE_SMALL_BATCH_MODEL,
  }
}

function readArgValue(argv = [], prefix = '') {
  const found = argv.find(arg => String(arg || '').startsWith(prefix))
  return found ? String(found).slice(prefix.length).trim() : ''
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

async function readRepoJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'))
}

async function loadMarkPoolRows() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT external_id, target_key, source_id, status, discovered_at, processed_at, metadata
        FROM source_crawl_items
        WHERE target_key = $1
          AND source_id = $2
          AND metadata->>'creatorId' = 'mark-kashef'
        ORDER BY COALESCE((metadata->>'rank')::int, 9999), discovered_at DESC
        LIMIT 50
      `,
      [MARK_KASHEF_BASELINE_TARGET_KEY, MARK_KASHEF_BASELINE_SOURCE_ID],
    )
    return result.rows
  } finally {
    await pool.end()
  }
}

async function loadAlreadyApiWatchedVideoIds() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT metadata
        FROM intelligence_report_artifacts
        WHERE metadata->>'cardId' = $1
          AND metadata->>'fullWatchRoute' = 'gemini_api_youtube_url_video_understanding'
      `,
      [MARK_KASHEF_LAST_50_BASELINE_CARD_ID],
    )
    const ids = new Set()
    for (const row of result.rows) {
      const metadata = row.metadata || {}
      if (metadata.sourceVideoId) ids.add(metadata.sourceVideoId)
      for (const id of list(metadata.videoIds)) ids.add(id)
    }
    return Array.from(ids).filter(Boolean)
  } finally {
    await pool.end()
  }
}

async function loadTranscriptArtifacts() {
  const archive = await getSharedCommunicationArchiveSnapshot({
    sourceId: MARK_KASHEF_BASELINE_SOURCE_ID,
    artifactType: 'video_transcript',
    limit: 1000,
    includeSensitive: true,
  })
  return archive.items || []
}

async function persistBatch(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MARK_KASHEF_GOD_MODE_SMALL_BATCH_SCRIPT_PATH,
    operation: 'persist Mark Kashef API full-watch small-batch report, proposal-only atoms, and evidence hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildMarkGodModeSmallBatchWriteSet(snapshot)
  let report = await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
  const atoms = []
  const hits = []
  for (const atomInput of writeSet.atomInputs) atoms.push(await upsertIntelligenceAtom(atomInput, ACTOR))
  for (const hitInput of writeSet.hitInputs) hits.push(await recordIntelligenceAtomHit(hitInput, ACTOR))
  report = await upsertIntelligenceReportArtifact({
    ...writeSet.reportArtifact,
    inputAtomIds: atoms.map(atom => atom.atomId || atom.atom_id),
  }, ACTOR)
  await fs.writeFile(path.join(repoRoot, MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_PATH), renderMarkGodModeSmallBatchReport(snapshot), 'utf8')
  return { writeSet, report, atoms, hits }
}

function buildSprintOverlayItem(existing = {}, snapshot = {}) {
  return {
    ...existing,
    cardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
    stage: 'building_now',
    nextAction: `Review ${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID}; rerun Dev Intelligence Director, then decide whether to promote a build candidate or run the next small Mark batch.`,
    statusNote: 'Active and not done. API full-watch small batch ran through Foundation pool videos with no private/auth/community crawl and no auto backlog promotion.',
    notNextBoundaries: MARK_KASHEF_GOD_MODE_SMALL_BATCH_NOT_NEXT,
    metadata: {
      ...(existing.metadata || {}),
      latestApiFullWatchBatchReportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
      latestApiFullWatchBatchRunId: snapshot.batchRunId,
      latestApiFullWatchVideoIds: list(snapshot.videoResults).map(result => result.video?.videoId).filter(Boolean),
      latestApiFullWatchModel: snapshot.model,
      noAutoBacklogPromotion: true,
      externalWrites: false,
      privateOrPaidAccess: false,
      fullWatchRoute: 'gemini_api_youtube_url_video_understanding',
      subscriptionWorkspaceFullWatch: false,
    },
  }
}

async function updateLiveSprintAndBacklog(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MARK_KASHEF_GOD_MODE_SMALL_BATCH_SCRIPT_PATH,
    operation: 'update Mark baseline backlog and Current Sprint overlay after small batch',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  await updateBacklogItem(MARK_KASHEF_LAST_50_BASELINE_CARD_ID, {
    lane: 'executing',
    nextAction: `Review ${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID}; rerun Dev Intelligence Director, then decide promote-vs-next-batch.`,
    statusNote: `Active and not done. Latest API full-watch small batch ${snapshot.batchRunId} processed ${snapshot.summary?.videoCount || 0} Mark videos with ${snapshot.summary?.totalBuildCandidates || 0} proposal-only candidates, no auto backlog, and no private/auth/community crawl.`,
  }, ACTOR)
  const previous = await getActiveFoundationCurrentSprint()
  const items = list(previous.items).map(item => item.cardId === MARK_KASHEF_LAST_50_BASELINE_CARD_ID
    ? buildSprintOverlayItem(item, snapshot)
    : item)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        activeBlockerCardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          markGodModeSmallBatchReportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
          markGodModeSmallBatchRunId: snapshot.batchRunId,
          markGodModeSmallBatchModel: snapshot.model,
          markGodModeSmallBatchVideoIds: list(snapshot.videoResults).map(result => result.video?.videoId).filter(Boolean),
          currentStatus: 'mark_god_mode_api_small_batch_applied',
          nextAction: 'Rerun Dev Team Intelligence Director so Steve sees the small-batch candidates ranked against the AIOS mission.',
          noAutoBacklogPromotion: true,
          noExternalWrites: true,
          publicYoutubeOnly: true,
        },
      },
      items,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId,
      reason: 'Mark baseline moved from one-video proof to guarded API full-watch small batch.',
    },
  )
}

async function loadPersistedBatch() {
  const bundle = await getIntelligenceReportBundle(MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID, { atomLimit: 200, hitLimit: 300 })
  return {
    ...bundle,
    snapshot: buildSnapshotFromMarkGodModeSmallBatchReport(bundle.report),
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  let snapshot = null
  let persistence = null

  if (args.liveGeminiApi && !args.apply) {
    throw new Error('--live-gemini-api is only allowed with --apply so paid provider work is persisted and auditable.')
  }
  if (args.batchSize < 3 || args.batchSize > MARK_KASHEF_GOD_MODE_SMALL_BATCH_MAX_SIZE) {
    throw new Error(`--batch-size must be between 3 and ${MARK_KASHEF_GOD_MODE_SMALL_BATCH_MAX_SIZE}.`)
  }

  await initFoundationDb()
  try {
    const now = new Date().toISOString()
    const [packageJson, poolRows, alreadyWatchedVideoIds, currentSprint] = await Promise.all([
      readRepoJson('package.json'),
      loadMarkPoolRows(),
      loadAlreadyApiWatchedVideoIds(),
      getActiveFoundationCurrentSprint(),
    ])
    const selectedVideos = selectMarkGodModeSmallBatchVideos({
      poolRows,
      alreadyApiWatchedVideoIds: alreadyWatchedVideoIds,
      limit: args.batchSize,
    })

    if (args.apply) {
      if (currentSprint.sprint?.activeBlockerCardId !== MARK_KASHEF_LAST_50_BASELINE_CARD_ID) {
        throw new Error(`Active sprint blocker is ${currentSprint.sprint?.activeBlockerCardId || 'missing'}, not ${MARK_KASHEF_LAST_50_BASELINE_CARD_ID}.`)
      }
      if (!args.liveGeminiApi) {
        throw new Error('--apply requires --live-gemini-api for a fresh small-batch extraction.')
      }
      if (selectedVideos.length < 3) {
        throw new Error(`Need at least 3 unwatched Mark videos from Foundation pool; selected ${selectedVideos.length}.`)
      }
      const transcriptArtifacts = await loadTranscriptArtifacts()
      const videoResults = await runMarkGodModeSmallBatchExtraction({
        videos: selectedVideos,
        transcriptArtifacts,
        model: args.model,
        now,
        actor: ACTOR,
      })
      snapshot = buildMarkGodModeSmallBatchSnapshot({
        generatedAt: now,
        batchRunId: now.replace(/[^0-9]/g, '').slice(0, 14),
        videos: selectedVideos,
        videoResults,
        model: args.model,
        liveGeminiApi: true,
      })
      if (!snapshot.ok) {
        throw new Error(`Mark small batch blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
      }
      const persistedWrite = await persistBatch(snapshot)
      const persisted = await getIntelligenceReportBundle(MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID, { atomLimit: 200, hitLimit: 300 })
      persistence = verifyMarkGodModeSmallBatchPersistedProof({
        snapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
      if (!persistence.ok) {
        throw new Error(`Persisted proof failed: ${persistence.failures.map(failure => failure.check).join(', ')}`)
      }
      await updateLiveSprintAndBacklog(snapshot)
      persistence.writeSet = persistedWrite.writeSet
    } else {
      const persisted = await loadPersistedBatch()
      snapshot = persisted.snapshot
      persistence = verifyMarkGodModeSmallBatchPersistedProof({
        snapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
    }

    addCheck(checks, packageJson.scripts?.['process:mark-kashef-god-mode-small-batch-check'] === `node --env-file-if-exists=.env ${MARK_KASHEF_GOD_MODE_SMALL_BATCH_SCRIPT_PATH}`, 'package exposes small-batch focused proof', packageJson.scripts?.['process:mark-kashef-god-mode-small-batch-check'] || 'missing')
    addCheck(checks, currentSprint.sprint?.activeBlockerCardId === MARK_KASHEF_LAST_50_BASELINE_CARD_ID, 'Current Sprint active blocker is Mark baseline', currentSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, selectedVideos.length >= 3 || snapshot?.ok === true, 'Foundation pool has enough next Mark videos or persisted batch exists', selectedVideos.map(video => `${video.rank}:${video.videoId}`).join(', ') || 'none')
    addCheck(checks, snapshot?.ok === true, 'small-batch snapshot is healthy', snapshot?.failures?.map(failure => failure.check).join(', ') || snapshot?.status || 'missing')
    addCheck(checks, snapshot?.route?.fullVideoWatchRoute === 'gemini_api_youtube_url_video_understanding', 'small batch uses Gemini API full-watch route', snapshot?.route?.fullVideoWatchRoute || 'missing')
    addCheck(checks, snapshot?.route?.subscriptionWorkspaceFullWatch === false, 'subscription route is not labeled full-watch', String(snapshot?.route?.subscriptionWorkspaceFullWatch))
    addCheck(checks, snapshot?.model === args.model || !args.apply, 'batch model is explicit', snapshot?.model || 'missing')
    addCheck(checks, list(snapshot?.videoResults).length >= 3 && list(snapshot?.videoResults).length <= MARK_KASHEF_GOD_MODE_SMALL_BATCH_MAX_SIZE, 'persisted video count is guarded', `${list(snapshot?.videoResults).length}`)
    addCheck(checks, list(snapshot?.topBuildCandidates).length >= 6, 'small batch produced proposal candidates', `${list(snapshot?.topBuildCandidates).length}`)
    addCheck(checks, snapshot?.noAutoBacklogPromotion === true && snapshot?.externalWrites === false, 'small batch has no auto backlog or external writes', `noAuto=${snapshot?.noAutoBacklogPromotion} external=${snapshot?.externalWrites}`)
    addCheck(checks, persistence?.ok === true, 'persisted report, atoms, and hits read back', persistence?.failures?.map(failure => failure.check).join(', ') || 'ok')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
      reportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
      selectedVideos: selectedVideos.map(video => ({
        rank: video.rank,
        videoId: video.videoId,
        title: video.title,
        url: video.url,
      })),
      alreadyApiWatchedVideoIds: alreadyWatchedVideoIds,
      snapshot: {
        status: snapshot?.status || null,
        batchRunId: snapshot?.batchRunId || null,
        model: snapshot?.model || null,
        videoCount: list(snapshot?.videoResults).length,
        totalBuildCandidates: snapshot?.summary?.totalBuildCandidates || 0,
        totalTimestampedVisualEvidence: snapshot?.summary?.totalTimestampedVisualEvidence || 0,
        totalTokens: snapshot?.summary?.totalTokens || 0,
        approvalRequiredLinkCount: snapshot?.summary?.approvalRequiredLinkCount || 0,
        videos: list(snapshot?.videoResults).map(result => ({
          videoId: result.video?.videoId,
          title: result.video?.title,
          visualEvidence: result.eyes?.score?.timestampedVisualEvidenceCount,
          candidates: result.eyes?.score?.buildCandidateCount,
          tokens: result.eyes?.score?.usageTotalTokens,
        })),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Mark Kashef God Mode small batch: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Mark Kashef God Mode small-batch proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
