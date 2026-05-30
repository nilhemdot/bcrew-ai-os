#!/usr/bin/env node

import { spawn } from 'node:child_process'
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
  listSourceCrawlItems,
} from '../lib/foundation-source-crawl-db.js'
import {
  getIntelligenceReportBundle,
} from '../lib/foundation-intelligence-db.js'
import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
} from '../lib/build-intel-source-value-grader.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
  buildYoutubeCreatorDailyWatchPlan,
} from '../lib/youtube-creator-daily-watch.js'
import {
  buildYoutubeCreatorGodModeCatchupSnapshot,
} from '../lib/youtube-creator-god-mode-catchup.js'
import {
  SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY,
} from '../lib/source-packet-worker-runner.js'
import {
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT,
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
} from '../lib/source-god-mode-youtube-handoff.js'
import {
  SOURCE_BROWSER_AGENT_TARGET_KEY,
} from '../lib/source-browser-agent-harness.js'
import {
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_CARD_ID,
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_JOB_KEY,
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_PLAN_PATH,
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_SCRIPT_PATH,
  YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG,
  buildYoutubeGodModeCandidateVideosFromCatchupSnapshot,
  buildYoutubeGodModeAutonomousWatchPlan,
  buildYoutubeGodModeAutonomousWatchSchedulerDogfoodProof,
} from '../lib/youtube-god-mode-autonomous-watch-scheduler.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import {
  GEMINI_STANDARD_PRICING_DEFAULT_MODEL,
  estimateGeminiStandardTokenCostUsd,
} from '../lib/llm-provider-pricing.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const DEFAULT_COMMAND_TIMEOUT_MS = 60 * 60 * 1000

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function youtubeVideoIdFromUrl(value = '') {
  const raw = text(value)
  if (!raw) return ''
  const watch = raw.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  if (watch) return watch[1]
  const short = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (short) return short[1]
  const shorts = raw.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/)
  if (shorts) return shorts[1]
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

function flag(argv = [], name = '') {
  return argv.includes(name) || argv.includes(`${name}=true`)
}

function hasArg(argv = [], prefix = '') {
  return argv.some(arg => String(arg || '').startsWith(prefix))
}

function numberArg(argv = [], prefix = '', fallback = null) {
  const raw = readArgValue(argv, prefix)
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseArgs(argv = process.argv.slice(2)) {
  const explicitMode = readArgValue(argv, '--mode=')
  const mode = explicitMode ||
    (flag(argv, '--live-bounded') ? 'live-bounded' : '') ||
    (flag(argv, '--catch-up') ? 'catch-up' : '') ||
    (flag(argv, '--steady-state') ? 'steady-state' : '') ||
    YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.mode
  return {
    json: flag(argv, '--json'),
    mode,
    runLiveBatch: flag(argv, '--run-live-batch') || flag(argv, '--apply'),
    approveLiveBudget: flag(argv, '--approve-live-budget'),
    skipPostRefresh: flag(argv, '--skip-post-refresh'),
    skipDeepVisual: flag(argv, '--skip-deep-visual'),
    deepVisualBatchSize: numberArg(argv, '--deep-visual-batch-size=', null),
    batchSize: numberArg(argv, '--batch-size=', YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.maxVideosPerRun),
    maxPerCreator: numberArg(argv, '--max-per-creator=', 3),
    finishPublicBacklog: flag(argv, '--finish-public-backlog') || flag(argv, '--finish-public-catchup'),
    creatorIds: readArgValues(argv, '--creator-id='),
    estimatedSpendTodayUsdProvided: hasArg(argv, '--estimated-spend-today-usd='),
    estimatedSpendTodayUsd: numberArg(argv, '--estimated-spend-today-usd=', 0),
    maxEstimatedUsdPerRun: numberArg(argv, '--max-estimated-usd-per-run=', YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.maxEstimatedUsdPerRun),
    maxEstimatedUsdPerDay: numberArg(argv, '--max-estimated-usd-per-day=', YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.maxEstimatedUsdPerDay),
    estimatedUsdPerVideo: numberArg(argv, '--estimated-usd-per-video=', YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.estimatedUsdPerVideo),
    maxBSourceVideosPerRun: numberArg(argv, '--max-b-source-videos-per-run=', YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.maxBSourceVideosPerRun),
    maxUngradedSourceVideosPerRun: numberArg(argv, '--max-ungraded-source-videos-per-run=', YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.maxUngradedSourceVideosPerRun),
    allowBSourceSampling: !flag(argv, '--no-b-source-sampling'),
    allowUngradedSourceSampling: !flag(argv, '--no-ungraded-source-sampling'),
    retryLimit: numberArg(argv, '--retry-limit=', YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.retryLimit),
    model: readArgValue(argv, '--model='),
    geminiTimeoutMs: numberArg(argv, '--gemini-timeout-ms=', null),
    commandTimeoutMs: numberArg(argv, '--command-timeout-ms=', DEFAULT_COMMAND_TIMEOUT_MS),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function extractJson(stdout = '') {
  const raw = String(stdout || '').trim()
  if (!raw) throw new Error('Command did not print JSON.')
  try {
    return JSON.parse(raw)
  } catch {
    const first = raw.indexOf('{')
    const last = raw.lastIndexOf('}')
    if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1))
    throw new Error(`Could not parse JSON from command output: ${raw.slice(0, 500)}`)
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function usageFromCall(call = {}) {
  const metadata = call.metadata || {}
  return metadata.usageMetadata ||
    metadata.quota?.state?.usageMetadata ||
    metadata.brainFleetLedger?.quota?.state?.usageMetadata ||
    {}
}

function devVideoReviewCall(call = {}) {
  if (call.provider !== 'gemini' || call.workload !== 'video_vision' || call.status !== 'succeeded') return false
  const metadata = call.metadata || {}
  const routeText = [
    metadata.extractionMode,
    metadata.batchReportArtifactId,
    metadata.parentCardId,
    metadata.cardId,
    metadata.requestedBy,
  ].map(text).join(' ').toLowerCase()
  return Boolean(metadata.videoId) && (
    routeText.includes('full_watch') ||
    routeText.includes('god_mode') ||
    routeText.includes('youtube-latest-20') ||
    routeText.includes('mark-kashef-last-50') ||
    routeText.includes('youtube_latest_20')
  )
}

function estimatedGeminiCostUsd(call = {}) {
  const usage = usageFromCall(call)
  const model = text(call.model || call.metadata?.model) || GEMINI_STANDARD_PRICING_DEFAULT_MODEL
  const input = Number(usage.promptTokenCount ?? call.estimated_input_tokens ?? call.estimatedInputTokens) || 0
  const thinking = Number(usage.thoughtsTokenCount) || 0
  const candidateOutput = Number(usage.candidatesTokenCount ?? call.estimated_output_tokens ?? call.estimatedOutputTokens) || 0
  const output = candidateOutput + thinking
  const storedCost = Number(call.estimated_cost_usd ?? call.estimatedCostUsd)
  if (Number.isFinite(storedCost) && storedCost > 0) return storedCost
  return estimateGeminiStandardTokenCostUsd({ model, inputTokens: input, outputTokens: output })
}

function normalizeSourceValueGraderReport(bundle = {}) {
  const report = bundle.report || null
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}
  return {
    status: report?.status || structured.status || 'needs_source',
    sourceGrades: list(structured.sourceGrades),
    topDevBuildSources: list(structured.topDevBuildSources),
    topByLane: list(structured.topByLane),
    noAutoBacklogPromotion: structured.noAutoBacklogPromotion !== false,
    externalWrites: structured.externalWrites === true,
    reportArtifactId: report?.reportArtifactId || report?.report_artifact_id || BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
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

async function loadPersistedFullWatchedVideoIds() {
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

async function loadTodayGeminiVideoSpend() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT call_id, workload, provider, model, status, estimated_input_tokens, estimated_output_tokens,
               estimated_cost_usd, metadata, started_at, finished_at, created_at, updated_at
        FROM llm_calls
        WHERE provider = 'gemini'
          AND workload = 'video_vision'
          AND status = 'succeeded'
          AND (timezone('America/Toronto', COALESCE(finished_at, updated_at, started_at, created_at)))::date =
              (timezone('America/Toronto', NOW()))::date
      `,
    )
    const calls = result.rows.filter(devVideoReviewCall)
    const videoIds = new Set()
    const batchIds = new Set()
    let estimatedSpendUsd = 0
    let totalTokens = 0
    for (const call of calls) {
      const metadata = call.metadata || {}
      const usage = usageFromCall(call)
      if (metadata.videoId) videoIds.add(metadata.videoId)
      if (metadata.batchReportArtifactId) batchIds.add(metadata.batchReportArtifactId)
      totalTokens += Number(usage.totalTokenCount) || 0
      estimatedSpendUsd += estimatedGeminiCostUsd(call)
    }
    return {
      sourceRoute: 'llm_calls today in America/Toronto, filtered to Gemini video full-watch calls',
      callCount: calls.length,
      videoCount: videoIds.size,
      batchCount: batchIds.size,
      totalTokens,
      estimatedSpendUsd: Number(estimatedSpendUsd.toFixed(6)),
    }
  } finally {
    await pool.end().catch(() => {})
  }
}

function runCommand(command, args = [], { timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`))
    }, Math.max(1000, Number(timeoutMs) || DEFAULT_COMMAND_TIMEOUT_MS))
    child.stdout.on('data', chunk => { stdout += chunk.toString() })
    child.stderr.on('data', chunk => { stderr += chunk.toString() })
    child.on('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', code => {
      clearTimeout(timer)
      const durationMs = Date.now() - startedAt
      const result = { command, args, code, stdout, stderr, durationMs }
      if (code === 0) resolve(result)
      else {
        const error = new Error(`Command failed (${code}): ${command} ${args.join(' ')}\n${stderr || stdout}`)
        error.result = result
        reject(error)
      }
    })
  })
}

async function runJsonCommand(command, args = [], options = {}) {
  const result = await runCommand(command, args, options)
  return {
    ...result,
    json: extractJson(result.stdout),
  }
}

function sanitizeVideo(video = {}) {
  return {
    videoId: text(video.videoId),
    title: text(video.title),
    creatorId: text(video.creatorId),
    creator: text(video.creator),
    url: text(video.url),
    rank: Number(video.rank) || 9999,
    relevanceScore: Number(video.relevanceScore) || 0,
    publicNoAuth: true,
    privateOrPaidAccess: false,
    standardFullWatchRisk: false,
    sourceSopStatus: text(video.sourceSopStatus),
    nextWatchAction: text(video.nextWatchAction),
    trackedMetadataCount: Number(video.trackedMetadataCount) || 0,
    videoAudioVisualWatchedCount: Number(video.videoAudioVisualWatchedCount) || 0,
    baselineTargetVideos: Number(video.baselineTargetVideos) || 0,
    baselineGap: Number(video.baselineGap) || 0,
    deepBaselineGap: Number(video.deepBaselineGap) || 0,
    pendingStandardVideoCount: Number(video.pendingStandardVideoCount) || 0,
    longCoursePendingCount: Number(video.longCoursePendingCount) || 0,
    fullPageExtractionStatus: text(video.fullPageExtractionStatus),
    approvedResourceFollowStatus: text(video.approvedResourceFollowStatus),
    sourcePacketWorkerStatus: text(video.sourcePacketWorkerStatus),
    browserHandsStatus: text(video.browserHandsStatus),
    freeResourceCaptureStatus: text(video.freeResourceCaptureStatus),
    freeCommunityPacketStatus: text(video.freeCommunityPacketStatus),
    paidGateEvaluationStatus: text(video.paidGateEvaluationStatus),
    autopilotDispositionStatus: text(video.autopilotDispositionStatus),
  }
}

async function loadLiveSchedulerInputs(args = {}) {
  await initFoundationDb()
  let catchupSnapshot = null
  let sourceValueGrader = null
  let commandStartedAt = Date.now()
  try {
	    const [
	      poolItems,
	      persistedFullWatchedVideoIds,
	      sourceValueGraderBundle,
	      youtubeFullWatchReports,
	      sourcePacketWorkerRuns,
	      sourceGodModeHandoffRunItems,
	      sourceBrowserAgentRunItems,
	    ] = await Promise.all([
      listSourceCrawlItems({
        targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
        limit: YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
        order: 'desc',
      }),
	      loadPersistedFullWatchedVideoIds(),
	      getIntelligenceReportBundle(BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
	      loadYoutubeFullWatchReports(),
      listSourceCrawlItems({
        targetKey: SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY,
        limit: 500,
        order: 'desc',
      }),
      listSourceCrawlItems({
        targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
        limit: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT,
        order: 'desc',
      }),
      listSourceCrawlItems({
        targetKey: SOURCE_BROWSER_AGENT_TARGET_KEY,
        limit: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT,
        order: 'desc',
      }),
    ])
    sourceValueGrader = normalizeSourceValueGraderReport(sourceValueGraderBundle)
    catchupSnapshot = buildYoutubeCreatorGodModeCatchupSnapshot({
	      watchPlan: buildYoutubeCreatorDailyWatchPlan(),
	      poolItems,
	      fullWatchedVideoIds: persistedFullWatchedVideoIds,
      sourceValueGrader,
      youtubeFullWatchReports,
      sourcePacketWorkerRuns,
      sourceFollowupRuns: [
        ...list(sourceGodModeHandoffRunItems),
        ...list(sourceBrowserAgentRunItems),
      ],
    })
  } finally {
    await closeFoundationDb()
  }

  const candidateVideos = buildYoutubeGodModeCandidateVideosFromCatchupSnapshot({
    catchupSnapshot,
    maxPerCreator: args.maxPerCreator,
  }).map(sanitizeVideo)
  const selectedVideos = args.creatorIds.length
    ? candidateVideos.filter(video => args.creatorIds.includes(video.creatorId))
    : candidateVideos
  const sourceGrades = sourceValueGrader?.sourceGrades || sourceValueGrader?.topDevBuildSources || []
  const todaySpend = await loadTodayGeminiVideoSpend()
  const selectedByCreator = selectedVideos.reduce((acc, video) => {
    acc[video.creatorId] = (acc[video.creatorId] || 0) + 1
    return acc
  }, {})
  return {
    manifest: {
      status: catchupSnapshot?.status,
      selectedVideos,
      selectedByCreator,
      standardFullWatchRiskRoutedOut: list(catchupSnapshot?.creators).flatMap(row =>
        list(row.longCourseCandidates).map(video => ({
          ...video,
          creatorId: row.creatorId,
          creator: row.creator,
        }))
      ),
      catchupSummary: catchupSnapshot?.summary || {},
      sourceRoute: 'youtubeCreatorGodModeCatchup.nextWatchCandidates + sourceValueGrader.sourceGrades',
    },
    sourceGrader: {
      status: sourceValueGrader?.status || 'needs_source',
      sourceCount: sourceGrades.length,
      sourceGrades,
      topDevBuildSources: sourceValueGrader?.topDevBuildSources || [],
    },
    todaySpend,
    commandDurationsMs: {
      catchupSnapshot: Date.now() - commandStartedAt,
      sourceGrader: 0,
    },
  }
}

function buildSchedulerPlan(args = {}, liveInputs = {}) {
  const batchSize = Math.max(1, Math.min(9, Number(args.batchSize) || YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.maxVideosPerRun))
  const liveApproval = args.approveLiveBudget
    ? {
      approved: true,
      liveBoundedRunApproved: true,
      maxEstimatedUsdPerRun: args.maxEstimatedUsdPerRun,
      maxEstimatedUsdPerDay: args.maxEstimatedUsdPerDay,
    }
    : null
  return buildYoutubeGodModeAutonomousWatchPlan({
    mode: args.mode,
    candidateVideos: liveInputs.manifest?.selectedVideos || [],
    sourceGrades: liveInputs.sourceGrader?.sourceGrades || [],
    estimatedSpendTodayUsd: args.estimatedSpendTodayUsdProvided
      ? args.estimatedSpendTodayUsd
      : liveInputs.todaySpend?.estimatedSpendUsd || 0,
    liveApproval,
    config: {
      maxVideosPerRun: batchSize,
      maxEstimatedUsdPerRun: args.maxEstimatedUsdPerRun,
      maxEstimatedUsdPerDay: args.maxEstimatedUsdPerDay,
      estimatedUsdPerVideo: args.estimatedUsdPerVideo,
      retryLimit: args.retryLimit,
      allowBSourceSampling: args.allowBSourceSampling,
      maxBSourceVideosPerRun: args.maxBSourceVideosPerRun,
      allowUngradedSourceSampling: args.allowUngradedSourceSampling,
      maxUngradedSourceVideosPerRun: args.maxUngradedSourceVideosPerRun,
      finishPublicBacklog: args.finishPublicBacklog,
    },
  })
}

function runnerCommandFromPlan(plan = {}, args = {}) {
  const command = [...(plan.runnerCommand || [])]
  if (args.model) command.push(`--model=${args.model}`)
  if (args.geminiTimeoutMs) command.push(`--gemini-timeout-ms=${args.geminiTimeoutMs}`)
  return command
}

async function runLiveBatchAndRefresh(plan = {}, args = {}) {
  const execution = {
    requested: Boolean(args.runLiveBatch),
    started: false,
    status: 'not_requested',
    runner: null,
    deepVisualReview: null,
    refreshes: [],
    errors: [],
  }
  if (!args.runLiveBatch) return execution

  if (plan.status !== 'ready_for_live_bounded_run') {
    execution.status = 'blocked_before_provider_call'
    execution.errors.push(`Scheduler plan was not live-ready: ${plan.blockers.join(', ') || plan.status}`)
    return execution
  }

  const runnerCommand = runnerCommandFromPlan(plan, args)
  execution.started = true
  execution.status = 'runner_started'
  const runnerResult = await runJsonCommand(runnerCommand[0], runnerCommand.slice(1), {
    timeoutMs: args.commandTimeoutMs,
  })
  execution.runner = {
    command: runnerCommand,
    durationMs: runnerResult.durationMs,
    status: runnerResult.json?.status,
    reportArtifactId: runnerResult.json?.reportArtifactId,
    selectedVideos: runnerResult.json?.selectedVideos || [],
    snapshot: runnerResult.json?.snapshot || null,
  }

  const runnerVideoIds = list(runnerResult.json?.selectedVideos)
    .map(video => text(video.videoId))
    .filter(Boolean)
  if (!args.skipDeepVisual && runnerVideoIds.length) {
    const deepBatchSize = Math.max(1, Math.min(
      runnerVideoIds.length,
      Number(args.deepVisualBatchSize) || runnerVideoIds.length,
      10,
    ))
    const deepArgs = [
      'run',
      'process:youtube-deep-visual-review-lane-check',
      '--',
      '--apply',
      '--live-gemini-api',
      '--json',
      '--allow-empty',
      '--target-count=100',
      `--batch-size=${deepBatchSize}`,
      `--video-id=${runnerVideoIds.join(',')}`,
    ]
    if (args.model) deepArgs.push(`--model=${args.model}`)
    const deepCommand = ['npm', ...deepArgs]
    try {
      const deep = await runJsonCommand('npm', deepArgs, {
        timeoutMs: args.commandTimeoutMs,
      })
      execution.deepVisualReview = {
        command: deepCommand,
        durationMs: deep.durationMs,
        status: deep.json?.status,
        reportArtifactId: deep.json?.reportArtifactId,
        selectedCandidates: deep.json?.selectedCandidates || [],
        snapshot: deep.json?.snapshot || null,
      }
    } catch (error) {
      execution.deepVisualReview = {
        command: deepCommand,
        durationMs: 0,
        status: 'parked_after_standard_watch',
        reportArtifactId: null,
        selectedCandidates: [],
        snapshot: null,
        errors: [error instanceof Error ? error.message : String(error)],
      }
      execution.errors.push(`Deep visual parked after standard watch: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (!args.skipPostRefresh) {
    const refreshCommands = [
      ['npm', ['run', 'process:dev-team-intelligence-director-check', '--', '--apply', '--json']],
      ['npm', ['run', 'process:build-intel-source-value-grader-check', '--', '--apply', '--json']],
      ['npm', ['run', 'process:dev-team-hub-v0-check', '--', '--json']],
    ]
    for (const [command, commandArgs] of refreshCommands) {
      const refresh = await runJsonCommand(command, commandArgs, { timeoutMs: 12 * 60 * 1000 })
      execution.refreshes.push({
        command: [command, ...commandArgs],
        durationMs: refresh.durationMs,
        status: refresh.json?.status || refresh.json?.snapshot?.status,
        ok: refresh.json?.ok !== false,
      })
    }
  }
  execution.status = execution.errors.some(error => String(error || '').startsWith('Deep visual parked after standard watch:'))
    ? 'completed_with_deep_visual_parked'
    : 'completed'
  return execution
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageSource, planSource, moduleSource, runnerScriptSource, schedulerScriptSource, jobsSource, jobRunnerSource] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile(YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_PLAN_PATH),
    readRepoFile('lib/youtube-god-mode-autonomous-watch-scheduler.js'),
    readRepoFile('scripts/process-youtube-latest-20-full-watch-runner-check.mjs'),
    readRepoFile(YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_SCRIPT_PATH),
    readRepoFile('lib/foundation-jobs.js'),
    readRepoFile('scripts/run-foundation-job.mjs'),
  ])
  const packageJson = JSON.parse(packageSource)
  const dogfood = buildYoutubeGodModeAutonomousWatchSchedulerDogfoodProof()
  const job = getFoundationJobDefinitions().find(item => item.key === YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_JOB_KEY)
  const dryRun = buildYoutubeGodModeAutonomousWatchPlan({
    candidateVideos: [
      { videoId: 'dry-1', creatorId: 'mark-kashef', creator: 'Mark Kashef', title: 'AIOS skill', relevanceScore: 80, publicNoAuth: true },
    ],
    sourceGrades: [
      { creatorId: 'mark-kashef', creator: 'Mark Kashef', grade: 'S', bestDirectorRank: 1 },
    ],
  })

  let liveInputs = null
  let livePlan = null
  let execution = null
  try {
    liveInputs = await loadLiveSchedulerInputs(args)
    livePlan = buildSchedulerPlan(args, liveInputs)
    execution = await runLiveBatchAndRefresh(livePlan, args)
  } catch (error) {
    execution = {
      requested: Boolean(args.runLiveBatch),
      started: false,
      status: 'failed',
      runner: null,
      deepVisualReview: null,
      refreshes: [],
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }

  addCheck(
    checks,
    packageJson.scripts?.['process:youtube-god-mode-autonomous-watch-scheduler-check'] === `node --env-file-if-exists=.env ${YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_SCRIPT_PATH}`,
    'package exposes focused scheduler proof',
    packageJson.scripts?.['process:youtube-god-mode-autonomous-watch-scheduler-check'] || 'missing',
  )
  addCheck(checks, dogfood.ok, 'dogfood proves source grades, ungraded baseline sampling, budgets, retries, long-course routing, and live approval', JSON.stringify(dogfood.cases))
  addCheck(
    checks,
    dryRun.status === 'ready_for_dry_run_report' &&
      dryRun.reportOnly === true &&
      dryRun.writesBacklog === false &&
      dryRun.writesExternalSystems === false,
    'dry-run plan is report-only and does not call Gemini',
    `${dryRun.status} / videos=${dryRun.selectedVideos.length}`,
  )
  addCheck(
    checks,
    moduleSource.includes('process:youtube-latest-20-full-watch-runner-check') &&
      schedulerScriptSource.includes('process:youtube-deep-visual-review-lane-check') &&
      moduleSource.includes('process:dev-team-intelligence-director-check') &&
      moduleSource.includes('process:build-intel-source-value-grader-check') &&
      moduleSource.includes('live_mode_requires_explicit_budget_approval') &&
      moduleSource.includes('finishPublicBacklog') &&
      schedulerScriptSource.includes('--finish-public-backlog') &&
      schedulerScriptSource.includes('--max-per-creator=') &&
      moduleSource.includes('sourceSopReadiness') &&
      moduleSource.includes('--video-id='),
    'scheduler uses exact-video guarded runner, immediate deep visual handoff, catch-up override, SOP readiness, and post-run refresh commands',
    'lib/youtube-god-mode-autonomous-watch-scheduler.js + scheduler script',
  )
  addCheck(
    checks,
    runnerScriptSource.includes('videoIds: readArgValues') &&
      runnerScriptSource.includes('videoIds: args.videoIds'),
    'full-watch runner accepts exact video-id targeting',
    'scripts/process-youtube-latest-20-full-watch-runner-check.mjs',
  )
  addCheck(
    checks,
    Boolean(job) &&
      job.enabled === true &&
      job.runtimeMode === 'scheduled' &&
      job.scheduleEveryMinutes === 1440 &&
      job.scheduleLocalTime === '07:00' &&
      job.mutationPosture === 'operational_write' &&
      job.scheduleMutationGuard?.ok === true &&
      job.budget === 'gemini_api_live_bounded_public_youtube_max_5_run_150_day' &&
      (job.args || []).includes('process:youtube-god-mode-autonomous-watch-scheduler-check'),
    'job registry has scheduled live-bounded YouTube watcher row',
    job ? `${job.enabled}/${job.runtimeMode}/${job.scheduleLocalTime}/${job.mutationPosture}/${job.scheduleMutationGuard?.ok}/${job.budget}` : 'missing',
  )
  addCheck(
    checks,
    jobsSource.includes(YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_JOB_KEY) &&
      jobsSource.includes('Steve approved the public YouTube live-bounded watcher operating posture on 2026-05-26') &&
      jobsSource.includes('--run-live-batch') &&
      jobsSource.includes('--max-estimated-usd-per-day=150'),
    'job row documents approved scheduled live-bounded posture',
    'lib/foundation-jobs.js',
  )
  addCheck(
    checks,
    jobsSource.includes("budget: 'gemini_api_live_bounded_public_youtube_max_5_run_150_day'") &&
      jobsSource.includes('--max-estimated-usd-per-run=5') &&
      jobsSource.includes('--max-estimated-usd-per-day=150'),
    'scheduled YouTube watcher budget matches Steve-approved live catch-up cap',
    job?.budget || 'missing',
  )
  addCheck(
    checks,
    jobRunnerSource.includes('runWithFoundationGateRetry') &&
      jobRunnerSource.includes('formatFoundationGateRetryMessage') &&
      jobRunnerSource.includes('foundation job process metadata') &&
      jobRunnerSource.includes('terminateChildForLedgerFailure') &&
      jobRunnerSource.includes('processMetadataWriteFailed') &&
      jobRunnerSource.includes('foundation job finish'),
    'Foundation job runner retries transient ledger writes and kills child if process ownership metadata cannot persist',
    'scripts/run-foundation-job.mjs',
  )
  addCheck(
    checks,
    planSource.includes('does not auto-create backlog cards') &&
      planSource.includes('max Gemini spend per run') &&
      planSource.includes('max Gemini spend per day'),
    'plan preserves automation boundaries and budgets',
    YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_PLAN_PATH,
  )
  addCheck(
    checks,
    Boolean(liveInputs?.manifest) && Boolean(liveInputs?.sourceGrader),
    'scheduler reads live catch-up candidates and source grades',
    liveInputs ? `${liveInputs.manifest?.selectedVideos?.length || 0} candidates / ${liveInputs.sourceGrader?.sourceCount || 0} sources` : 'missing',
  )
  if (args.runLiveBatch) {
	    addCheck(
	      checks,
	      execution?.status === 'completed' ||
	        execution?.status === 'completed_with_deep_visual_parked' ||
	        (execution?.status === 'blocked_before_provider_call' && livePlan?.blockers?.includes('no_eligible_videos_selected')),
	      'requested live-bounded run completed, parked deep visual after standard watch, or stopped before provider call with no eligible videos',
	      execution?.errors?.join('; ') || execution?.status || 'missing',
	    )
  }

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : args.runLiveBatch ? execution.status : 'healthy',
    cardId: YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_CARD_ID,
    reportOnly: !args.runLiveBatch,
    liveRunStarted: Boolean(execution?.started),
    writesBacklog: false,
    writesExternalSystems: false,
    args: {
      mode: args.mode,
      runLiveBatch: args.runLiveBatch,
      approveLiveBudget: args.approveLiveBudget,
      batchSize: args.batchSize,
      maxPerCreator: args.maxPerCreator,
      finishPublicBacklog: args.finishPublicBacklog,
      maxEstimatedUsdPerRun: args.maxEstimatedUsdPerRun,
      maxEstimatedUsdPerDay: args.maxEstimatedUsdPerDay,
      estimatedSpendTodayUsd: args.estimatedSpendTodayUsd,
      estimatedSpendTodayUsdProvided: args.estimatedSpendTodayUsdProvided,
      effectiveEstimatedSpendTodayUsd: livePlan?.budget?.estimatedSpendTodayUsd ?? null,
    },
    dryRun,
    liveInputs,
    livePlan,
    execution,
    dogfood,
    checks,
    failed,
  }
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`YouTube God Mode Autonomous Watch Scheduler check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (failed.length || execution?.status === 'failed') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
