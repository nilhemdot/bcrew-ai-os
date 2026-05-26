#!/usr/bin/env node

import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_CARD_ID,
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_JOB_KEY,
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_PLAN_PATH,
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_SCRIPT_PATH,
  YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG,
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
    batchSize: numberArg(argv, '--batch-size=', YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.maxVideosPerRun),
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
  }
}

async function loadLiveSchedulerInputs(args = {}) {
  const latestArgs = ['run', 'process:youtube-latest-20-intel-run-check', '--', '--json', `--batch-size=${args.batchSize}`]
  for (const creatorId of args.creatorIds) latestArgs.push(`--creator-id=${creatorId}`)
  const [manifestResult, sourceGraderResult, todaySpend] = await Promise.all([
    runJsonCommand('npm', latestArgs, { timeoutMs: 8 * 60 * 1000 }),
    runJsonCommand('npm', ['run', 'process:build-intel-source-value-grader-check', '--', '--json'], { timeoutMs: 8 * 60 * 1000 }),
    loadTodayGeminiVideoSpend(),
  ])
  const selectedVideos = (manifestResult.json?.snapshot?.selectedVideos || []).map(sanitizeVideo)
  const sourceGrades = sourceGraderResult.json?.snapshot?.sourceGrades ||
    sourceGraderResult.json?.snapshot?.topDevBuildSources ||
    []
  return {
    manifest: {
      status: manifestResult.json?.snapshot?.status,
      selectedVideos,
      selectedByCreator: manifestResult.json?.snapshot?.selectedByCreator || {},
      standardFullWatchRiskRoutedOut: manifestResult.json?.snapshot?.standardFullWatchRiskRoutedOut || [],
    },
    sourceGrader: {
      status: sourceGraderResult.json?.snapshot?.status || sourceGraderResult.json?.status,
      sourceCount: sourceGraderResult.json?.snapshot?.sourceCount || sourceGrades.length,
      sourceGrades,
      topDevBuildSources: sourceGraderResult.json?.snapshot?.topDevBuildSources || [],
    },
    todaySpend,
    commandDurationsMs: {
      manifest: manifestResult.durationMs,
      sourceGrader: sourceGraderResult.durationMs,
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
  execution.status = 'completed'
  return execution
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageSource, planSource, moduleSource, runnerScriptSource, jobsSource] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile(YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_PLAN_PATH),
    readRepoFile('lib/youtube-god-mode-autonomous-watch-scheduler.js'),
    readRepoFile('scripts/process-youtube-latest-20-full-watch-runner-check.mjs'),
    readRepoFile('lib/foundation-jobs.js'),
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
      moduleSource.includes('process:dev-team-intelligence-director-check') &&
      moduleSource.includes('process:build-intel-source-value-grader-check') &&
      moduleSource.includes('live_mode_requires_explicit_budget_approval') &&
      moduleSource.includes('--video-id='),
    'module uses exact-video guarded runner and post-run refresh commands',
    'lib/youtube-god-mode-autonomous-watch-scheduler.js',
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
      job.enabled === false &&
      job.runtimeMode === 'manual' &&
      job.budget === 'gemini_api_live_bounded_requires_approval' &&
      (job.args || []).includes('process:youtube-god-mode-autonomous-watch-scheduler-check'),
    'job registry has disabled dry-run scheduler row',
    job ? `${job.enabled}/${job.runtimeMode}/${job.budget}` : 'missing',
  )
  addCheck(
    checks,
    jobsSource.includes(YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_JOB_KEY) &&
      jobsSource.includes('dry-run only until live-bounded approval and budget caps are configured'),
    'job row documents dry-run posture',
    'lib/foundation-jobs.js',
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
    'scheduler reads live manifest and source grades',
    liveInputs ? `${liveInputs.manifest?.selectedVideos?.length || 0} videos / ${liveInputs.sourceGrader?.sourceCount || 0} sources` : 'missing',
  )
  if (args.runLiveBatch) {
    addCheck(
      checks,
      execution?.status === 'completed' || (execution?.status === 'blocked_before_provider_call' && livePlan?.blockers?.includes('no_eligible_videos_selected')),
      'requested live-bounded run either completed or stopped before provider call with no eligible videos',
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
