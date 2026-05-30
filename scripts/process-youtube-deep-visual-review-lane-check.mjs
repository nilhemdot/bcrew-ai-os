#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getIntelligenceReportBundle,
  recordIntelligenceAtomHit,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-intelligence-db.js'
import {
  getSharedCommunicationArchiveSnapshot,
} from '../lib/foundation-shared-comms-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
} from '../lib/dev-team-intelligence-director.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
} from '../lib/youtube-creator-daily-watch.js'
import {
  runYoutubeLatest20FullWatchExtraction,
} from '../lib/youtube-latest-20-full-watch-runner.js'
import {
  YOUTUBE_DEEP_VISUAL_REVIEW_LANE_CARD_ID,
  YOUTUBE_DEEP_VISUAL_REVIEW_LANE_PLAN_PATH,
  YOUTUBE_DEEP_VISUAL_REVIEW_LANE_SCRIPT_PATH,
  YOUTUBE_DEEP_VISUAL_REVIEW_MODEL,
  buildDeepVisualSegmentPlan,
  buildYoutubeDeepVisualReviewDogfoodProof,
  buildYoutubeDeepVisualReviewQueueSnapshot,
  buildYoutubeDeepVisualReviewSnapshot,
  buildYoutubeDeepVisualReviewWriteSet,
  renderYoutubeDeepVisualReviewReport,
  verifyYoutubeDeepVisualReviewPersistedProof,
  youtubeDeepVisualReviewReportArtifactId,
  youtubeDeepVisualReviewReportPath,
} from '../lib/youtube-deep-visual-review-lane.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'youtube-deep-visual-review-lane'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    liveGeminiApi: argv.includes('--live-gemini-api') || argv.includes('--live-gemini-api=true'),
    batchSize: Number(readArgValue(argv, '--batch-size=')) || 3,
    targetCount: Number(readArgValue(argv, '--target-count=')) || 50,
    model: readArgValue(argv, '--model=') || YOUTUBE_DEEP_VISUAL_REVIEW_MODEL,
    videoIds: readArgValues(argv, '--video-id='),
    includeReviewed: argv.includes('--include-reviewed') || argv.includes('--include-reviewed=true'),
    allowEmpty: argv.includes('--allow-empty') || argv.includes('--allow-empty=true'),
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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function loadYoutubeReviewReports() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id AS "reportArtifactId",
               report_type AS "reportType",
               title,
               status,
               source_ids AS "sourceIds",
               input_artifact_ids AS "inputArtifactIds",
               input_atom_ids AS "inputAtomIds",
               action_required_items AS "actionRequiredItems",
               structured_output_json AS "structuredOutputJson",
               metadata,
               created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM intelligence_report_artifacts
        WHERE metadata->>'fullWatchRoute' = 'gemini_api_youtube_url_video_understanding'
           OR metadata->>'proofMode' IN (
             'youtube_latest_20_god_mode_api_full_watch',
             'youtube_long_course_god_mode_api_full_watch',
             'youtube_deep_visual_review_v1'
           )
           OR report_artifact_id LIKE 'batch:youtube-latest-20:api-full-watch-v1%'
           OR report_artifact_id LIKE 'batch:mark-kashef-last-50:api-full-watch%'
           OR report_artifact_id LIKE 'batch:youtube-long-course:api-full-watch-v1%'
           OR report_artifact_id LIKE 'proof:mark-kashef-last-50-baseline%'
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 600
      `,
    )
    return result.rows
  } finally {
    await pool.end().catch(() => {})
  }
}

async function loadTranscriptArtifacts() {
  const archive = await getSharedCommunicationArchiveSnapshot({
    sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
    artifactType: 'video_transcript',
    limit: 1600,
    includeSensitive: true,
  })
  return archive.items || []
}

async function persistBatch(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: YOUTUBE_DEEP_VISUAL_REVIEW_LANE_SCRIPT_PATH,
    operation: 'persist public YouTube deep visual review report, proposal-only atoms, and evidence hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildYoutubeDeepVisualReviewWriteSet(snapshot)
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
  await fs.writeFile(path.join(repoRoot, snapshot.reportPath || youtubeDeepVisualReviewReportPath({ batchRunId: snapshot.batchRunId })), renderYoutubeDeepVisualReviewReport(snapshot), 'utf8')
  return { writeSet, report, atoms, hits }
}

function selectApplyCandidates(queueSnapshot = {}, args = {}) {
  const candidates = list(queueSnapshot.topCandidates)
  if (args.videoIds.length) {
    const wanted = new Set(args.videoIds)
    return candidates.filter(candidate => wanted.has(candidate.videoId)).slice(0, args.batchSize)
  }
  return candidates.slice(0, args.batchSize)
}

async function main() {
  const args = parseArgs()
  const checks = []
  let queueSnapshot = null
  let snapshot = null
  let persistence = null
  let selectedCandidates = []

  if (args.liveGeminiApi && !args.apply) {
    throw new Error('--live-gemini-api is only allowed with --apply so paid provider work is persisted and auditable.')
  }
  if (args.batchSize < 1 || args.batchSize > 10) {
    throw new Error('--batch-size must be between 1 and 10 for deep visual review.')
  }
  if (args.targetCount < 1 || args.targetCount > 100) {
    throw new Error('--target-count must be between 1 and 100.')
  }

  await initFoundationDb()
  try {
    const now = new Date().toISOString()
    const batchRunId = now.replace(/[^0-9]/g, '').slice(0, 14)
    const reportArtifactId = youtubeDeepVisualReviewReportArtifactId({ batchRunId })
    const reportPath = youtubeDeepVisualReviewReportPath({ batchRunId })
    const [
      packageJson,
      planSource,
      moduleSource,
      eyesSource,
      dogfood,
      reports,
      directorBundle,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(YOUTUBE_DEEP_VISUAL_REVIEW_LANE_PLAN_PATH),
      readRepoFile('lib/youtube-deep-visual-review-lane.js'),
      readRepoFile('lib/god-mode-extractor-eyes-quality-loop.js'),
      buildYoutubeDeepVisualReviewDogfoodProof(),
      loadYoutubeReviewReports(),
      getIntelligenceReportBundle(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
    ])

    queueSnapshot = buildYoutubeDeepVisualReviewQueueSnapshot({
      generatedAt: now,
      reports,
      directorReport: directorBundle.report,
      targetCount: args.targetCount,
      includeReviewed: args.includeReviewed,
    })
    selectedCandidates = selectApplyCandidates(queueSnapshot, args)

    if (args.apply) {
      if (!args.liveGeminiApi) {
        throw new Error('--apply requires --live-gemini-api for a fresh deep visual review extraction.')
      }
      if (!queueSnapshot.ok) {
        throw new Error(`Deep visual queue is not ready: ${queueSnapshot.status}`)
      }
      if (!selectedCandidates.length && !args.allowEmpty) {
        throw new Error('No selected deep visual candidates. Pass --allow-empty for conditional scheduler handoff.')
      }
      if (selectedCandidates.length) {
        const transcriptArtifacts = await loadTranscriptArtifacts()
        const segmentPlansByVideoId = Object.fromEntries(selectedCandidates.map(candidate => [
          candidate.videoId,
          list(candidate.segmentPlan).some(segment => segment.fullVideo === true) ? [] : candidate.segmentPlan,
        ]))
        const videoResults = await runYoutubeLatest20FullWatchExtraction({
          videos: selectedCandidates,
          transcriptArtifacts,
          model: args.model,
          now,
          actor: ACTOR,
          reportArtifactId,
          promptProfile: 'deep_visual',
          segmentPlansByVideoId,
        })
        snapshot = buildYoutubeDeepVisualReviewSnapshot({
          generatedAt: now,
          batchRunId,
          reportArtifactId,
          reportPath,
          candidates: selectedCandidates,
          videoResults,
          model: args.model,
          liveGeminiApi: true,
          queueSnapshot,
        })
        if (!snapshot.ok) {
          throw new Error(`Deep visual review batch blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
        }
        const persistedWrite = await persistBatch(snapshot)
        const persisted = await getIntelligenceReportBundle(reportArtifactId, { atomLimit: 120, hitLimit: 180 })
        persistence = verifyYoutubeDeepVisualReviewPersistedProof({
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
    }

    addCheck(checks, packageJson.scripts?.['process:youtube-deep-visual-review-lane-check'] === `node --env-file-if-exists=.env ${YOUTUBE_DEEP_VISUAL_REVIEW_LANE_SCRIPT_PATH}`, 'package exposes deep visual review focused proof', packageJson.scripts?.['process:youtube-deep-visual-review-lane-check'] || 'missing')
    addCheck(checks, /top 50/i.test(planSource) && /screen-visible/i.test(planSource), 'plan captures top-50 screen/code/UI re-review mission', YOUTUBE_DEEP_VISUAL_REVIEW_LANE_PLAN_PATH)
    addCheck(checks, /promptProfile === 'deep_visual'/.test(eyesSource) && /Deep Visual Review Eyes V1/.test(eyesSource), 'Gemini Eyes route includes deep visual prompt profile', 'lib/god-mode-extractor-eyes-quality-loop.js')
    addCheck(checks, /buildYoutubeDeepVisualReviewQueueSnapshot/.test(moduleSource) && /buildDeepVisualSegmentPlan/.test(moduleSource), 'module scores watched videos and builds targeted segment plans', 'lib/youtube-deep-visual-review-lane.js')
    addCheck(checks, dogfood.ok === true, 'dogfood proves queue selection, segment targeting, deep prompt snapshot, and no-write posture', dogfood.checks.map(check => `${check.ok ? 'PASS' : 'FAIL'} ${check.check}`).join('; '))
    addCheck(checks, reports.length >= 20, 'live watched-video reports are available for top-50 selection', `${reports.length}`)
    addCheck(checks, queueSnapshot.ok === true, 'live queue can rank watched videos for deep visual review', queueSnapshot.failures?.map(failure => failure.check).join(', ') || queueSnapshot.status)
    addCheck(checks, list(queueSnapshot.topCandidates).length >= Math.min(50, args.targetCount), 'top-50 deep visual queue is populated', `${list(queueSnapshot.topCandidates).length}/${args.targetCount}`)
    addCheck(checks, selectedCandidates.length >= 1 || args.allowEmpty, 'selected deep visual candidates are ready for apply or conditional handoff can be empty', selectedCandidates.length ? selectedCandidates.map(candidate => `${candidate.deepVisualRank}:${candidate.creatorId}:${candidate.videoId}`).join(', ') : 'none selected')
    const applyHadSelectedCandidates = args.apply && selectedCandidates.length >= 1
    addCheck(checks, applyHadSelectedCandidates ? snapshot?.ok === true : true, 'fresh deep visual snapshot is healthy when applied', snapshot?.failures?.map(failure => failure.check).join(', ') || snapshot?.status || (args.apply && !selectedCandidates.length ? 'empty conditional handoff' : 'not applied'))
    addCheck(checks, applyHadSelectedCandidates ? persistence?.ok === true : true, 'persisted deep visual report, atoms, and hits read back when applied', persistence?.failures?.map(failure => failure.check).join(', ') || (persistence ? 'ok' : (args.apply && !selectedCandidates.length ? 'empty conditional handoff' : 'not applied')))
    addCheck(checks, snapshot ? snapshot.noAutoBacklogPromotion === true && snapshot.externalWrites === false : true, 'deep visual review has no auto backlog or external writes', snapshot ? `noAuto=${snapshot.noAutoBacklogPromotion} external=${snapshot.externalWrites}` : 'not applied')

    const failures = checks.filter(check => !check.ok)
    const result = {
      ok: failures.length === 0,
      status: failures.length
        ? 'blocked'
        : args.apply && !selectedCandidates.length
          ? 'no_deep_visual_candidates_selected'
        : args.apply
          ? 'healthy'
          : 'ready_for_apply',
      cardId: YOUTUBE_DEEP_VISUAL_REVIEW_LANE_CARD_ID,
      reportArtifactId,
      queue: queueSnapshot ? {
        status: queueSnapshot.status,
        summary: queueSnapshot.summary,
        topCandidates: list(queueSnapshot.topCandidates).slice(0, 50).map(candidate => ({
          rank: candidate.deepVisualRank,
          score: candidate.score,
          videoId: candidate.videoId,
          title: candidate.title,
          creator: candidate.creator,
          creatorId: candidate.creatorId,
          url: candidate.url,
          reasons: candidate.reasons,
          standardReportArtifactId: candidate.standardReportArtifactId,
          segmentCount: list(candidate.segmentPlan).length,
        })),
      } : null,
      selectedCandidates: selectedCandidates.map(candidate => ({
        rank: candidate.deepVisualRank,
        score: candidate.score,
        videoId: candidate.videoId,
        title: candidate.title,
        creator: candidate.creator,
        creatorId: candidate.creatorId,
        url: candidate.url,
        reasons: candidate.reasons,
        segmentCount: list(candidate.segmentPlan).length,
      })),
      snapshot: snapshot ? {
        status: snapshot.status,
        batchRunId: snapshot.batchRunId,
        model: snapshot.model,
        videoCount: list(snapshot.videoResults).length,
        totalTimestampedVisualEvidence: snapshot.summary?.totalTimestampedVisualEvidence || 0,
        totalVisibleCodeOrTooling: snapshot.summary?.totalVisibleCodeOrTooling || 0,
        totalWorkflowMoments: snapshot.summary?.totalWorkflowMoments || 0,
        totalBuildCandidates: snapshot.summary?.totalBuildCandidates || 0,
        totalMissedByStandard: snapshot.summary?.totalMissedByStandard || 0,
      } : null,
      checks,
      failures,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`YouTube deep visual review lane: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failures.length}/${checks.length} checks passed`)
    }
    process.exitCode = failures.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('YouTube deep visual review lane proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
