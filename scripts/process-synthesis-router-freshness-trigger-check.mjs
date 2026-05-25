#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  ACTION_ROUTER_PROPOSALS_JOB_KEY,
  SYNTHESIS_FRESHNESS_TRIGGER_ENV,
  SYNTHESIS_REFRESH_JOB_KEY,
  SYNTHESIS_ROUTER_FRESHNESS_TRIGGER_CARD_ID,
  buildSynthesisFreshnessMetadataForJobRun,
  buildSynthesisRouterFreshnessSnapshot,
  classifySynthesisFreshnessJob,
  handleSynthesisFreshnessAfterFoundationJobRun,
} from '../lib/synthesis-router-freshness-trigger.js'
import {
  closeFoundationDb,
  getFoundationJobRunSnapshot,
} from '../lib/foundation-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const SCRIPT_PATH = 'scripts/process-synthesis-router-freshness-trigger-check.mjs'
const MODULE_PATH = 'lib/synthesis-router-freshness-trigger.js'
const RUNNER_PATH = 'scripts/run-foundation-job.mjs'
const PLAN_PATH = 'docs/process/synthesis-router-freshness-trigger-001-plan.md'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
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

function run({
  jobKey,
  status = 'succeeded',
  at,
  runId = `${jobKey}-${at}`,
  errorMessage = '',
}) {
  return {
    runId,
    jobKey,
    title: jobKey,
    jobType: jobKey.includes('sync') ? 'current_sync' : 'extraction',
    status,
    startedAt: at,
    finishedAt: at,
    createdAt: at,
    errorMessage,
    metadata: {},
  }
}

function buildStaleFixture() {
  return [
    run({ jobKey: SYNTHESIS_REFRESH_JOB_KEY, at: '2026-05-25T14:00:00.000Z' }),
    run({ jobKey: ACTION_ROUTER_PROPOSALS_JOB_KEY, at: '2026-05-25T14:05:00.000Z' }),
    run({ jobKey: 'missive-sync-current', at: '2026-05-25T15:00:00.000Z' }),
    run({ jobKey: 'missive-extract-latest', at: '2026-05-25T15:10:00.000Z' }),
  ]
}

function buildBlockedFixture() {
  return [
    run({ jobKey: SYNTHESIS_REFRESH_JOB_KEY, at: '2026-05-25T14:00:00.000Z' }),
    run({ jobKey: ACTION_ROUTER_PROPOSALS_JOB_KEY, at: '2026-05-25T14:05:00.000Z' }),
    run({ jobKey: 'gmail-sync-current', at: '2026-05-25T16:00:00.000Z' }),
    run({
      jobKey: 'gmail-extract-latest',
      status: 'failed',
      at: '2026-05-25T16:05:00.000Z',
      errorMessage: 'Direct OpenAI Responses fallback blocked by spend policy.',
    }),
  ]
}

function buildFreshAfterSynthesisFixture() {
  return [
    run({ jobKey: 'missive-sync-current', at: '2026-05-25T15:00:00.000Z' }),
    run({ jobKey: 'missive-extract-latest', at: '2026-05-25T15:10:00.000Z' }),
    run({ jobKey: SYNTHESIS_REFRESH_JOB_KEY, at: '2026-05-25T15:30:00.000Z' }),
    run({ jobKey: ACTION_ROUTER_PROPOSALS_JOB_KEY, at: '2026-05-25T14:05:00.000Z' }),
  ]
}

function buildFreshAfterActionRouterFixture() {
  return [
    run({ jobKey: 'missive-sync-current', at: '2026-05-25T15:00:00.000Z' }),
    run({ jobKey: 'missive-extract-latest', at: '2026-05-25T15:10:00.000Z' }),
    run({ jobKey: SYNTHESIS_REFRESH_JOB_KEY, at: '2026-05-25T15:30:00.000Z' }),
    run({ jobKey: ACTION_ROUTER_PROPOSALS_JOB_KEY, at: '2026-05-25T15:35:00.000Z' }),
  ]
}

function sourceHasForbiddenDestinationWrites(source = '') {
  return /createBacklogItem\s*\(|updateBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|approveActionRoute\s*\(|applyApprovedActionRoute\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|INSERT\s+INTO\s+decisions|UPDATE\s+decisions|fetch\s*\(|sendEmail|writeFile\s*\(|fs\.writeFile/i.test(String(source || ''))
}

function liveTrackedRunsWithFreshness(latestRuns = []) {
  return latestRuns
    .filter(run => classifySynthesisFreshnessJob(run.jobKey))
    .filter(run => run.metadata?.synthesisFreshness)
}

async function buildSyntheticRuntimeHookProof() {
  const metadataPatches = []
  const triggeredJobs = []
  const completedRun = run({ jobKey: 'missive-extract-latest', at: '2026-05-25T15:10:00.000Z' })
  const result = await handleSynthesisFreshnessAfterFoundationJobRun(completedRun, {
    actor: 'synthetic-proof',
    autorun: true,
    now: '2026-05-25T15:12:00.000Z',
    getJobRunSnapshot: async () => ({
      latestRuns: buildStaleFixture(),
      jobs: [],
    }),
    updateJobRunMetadata: async (runId, patch, actor) => {
      metadataPatches.push({ runId, patch, actor })
      return { runId, metadata: patch }
    },
    runFollowupJob: async (jobKey, options) => {
      triggeredJobs.push({ jobKey, options })
      return 0
    },
  })

  return {
    result,
    metadataPatches,
    triggeredJobs,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    moduleSource,
    runnerSource,
    planSource,
    scriptSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(MODULE_PATH),
    readRepoFile(RUNNER_PATH),
    readRepoFile(PLAN_PATH),
    readRepoFile(SCRIPT_PATH),
  ])

  const stale = buildSynthesisRouterFreshnessSnapshot({
    runs: buildStaleFixture(),
    now: '2026-05-25T15:12:00.000Z',
    debounceMinutes: 0,
  })
  const blocked = buildSynthesisRouterFreshnessSnapshot({
    runs: buildBlockedFixture(),
    now: '2026-05-25T16:10:00.000Z',
    debounceMinutes: 0,
  })
  const afterSynthesis = buildSynthesisRouterFreshnessSnapshot({
    runs: buildFreshAfterSynthesisFixture(),
    now: '2026-05-25T15:40:00.000Z',
    debounceMinutes: 0,
  })
  const afterActionRouter = buildSynthesisRouterFreshnessSnapshot({
    runs: buildFreshAfterActionRouterFixture(),
    now: '2026-05-25T15:40:00.000Z',
    debounceMinutes: 0,
  })
  const blockedMetadata = buildSynthesisFreshnessMetadataForJobRun(
    run({
      jobKey: 'gmail-extract-latest',
      status: 'failed',
      at: '2026-05-25T16:05:00.000Z',
      errorMessage: 'Direct OpenAI Responses fallback blocked by spend policy.',
    }),
    blocked,
  )
  const runtimeHookProof = await buildSyntheticRuntimeHookProof()
  const liveJobSnapshot = await getFoundationJobRunSnapshot({ limit: 120 })
  const liveFreshness = buildSynthesisRouterFreshnessSnapshot({
    jobs: liveJobSnapshot.jobs || [],
    runs: liveJobSnapshot.latestRuns || [],
    now: new Date().toISOString(),
  })
  const liveFreshnessMetadataRuns = liveTrackedRunsWithFreshness(liveJobSnapshot.latestRuns || [])
  const liveFailedExtractorJobKeys = liveFreshness.failedExtractorJobKeys || []

  addCheck(
    checks,
    stale.status === 'needs_synthesis_refresh' &&
      stale.shouldTriggerSynthesis === true &&
      stale.nextJobKey === SYNTHESIS_REFRESH_JOB_KEY &&
      stale.readyFamilies.includes('missive'),
    'newer successful extractor and older synthesis triggers synthesis refresh',
    `${stale.status} next=${stale.nextJobKey}`,
  )
  addCheck(
    checks,
    blocked.status === 'blocked_by_extractor' &&
      blocked.blockedByExtractor === true &&
      blocked.shouldTriggerSynthesis === false &&
      blocked.failedExtractorJobKeys.includes('gmail-extract-latest'),
    'failed extractor blocks synthesis freshness claim',
    `${blocked.status} failed=${blocked.failedExtractorJobKeys.join(',')}`,
  )
  addCheck(
    checks,
    afterSynthesis.status === 'action_router_due' &&
      afterSynthesis.shouldTriggerSynthesis === false &&
      afterSynthesis.shouldTriggerActionRouter === true &&
      afterSynthesis.nextJobKey === ACTION_ROUTER_PROPOSALS_JOB_KEY,
    'successful synthesis clears source staleness and queues action-router proposal follow-up',
    `${afterSynthesis.status} next=${afterSynthesis.nextJobKey}`,
  )
  addCheck(
    checks,
    afterActionRouter.status === 'fresh' &&
      afterActionRouter.shouldTriggerSynthesis === false &&
      afterActionRouter.shouldTriggerActionRouter === false,
    'action-router proposal success clears follow-up due state',
    afterActionRouter.status,
  )
  addCheck(
    checks,
    blockedMetadata?.synthesisFreshness?.blockedByExtractor === true &&
      blockedMetadata?.synthesisFreshness?.marksSynthesisDirty === false &&
      blockedMetadata?.synthesisFreshness?.failedExtractorJobKeys.includes('gmail-extract-latest'),
    'job metadata records blocked-by-extractor instead of fake freshness',
    blockedMetadata?.synthesisFreshness?.freshnessStatus || 'missing',
  )
  addCheck(
    checks,
    classifySynthesisFreshnessJob('gmail-sync-current')?.role === 'archive' &&
      classifySynthesisFreshnessJob('gmail-extract-latest')?.role === 'extractor' &&
      classifySynthesisFreshnessJob(SYNTHESIS_REFRESH_JOB_KEY)?.kind === 'synthesis' &&
      classifySynthesisFreshnessJob(ACTION_ROUTER_PROPOSALS_JOB_KEY)?.kind === 'action_router',
    'runtime job classifier covers archive, extractor, synthesis, and action router jobs',
    'classifier coverage',
  )
  addCheck(
    checks,
    runtimeHookProof.result?.triggeredJobKey === SYNTHESIS_REFRESH_JOB_KEY &&
      runtimeHookProof.triggeredJobs.length === 1 &&
      runtimeHookProof.metadataPatches[0]?.patch?.synthesisFreshness?.marksSynthesisDirty === true,
    'synthetic runtime hook patches metadata and can trigger synthesis when autorun is explicitly enabled',
    JSON.stringify({
      triggered: runtimeHookProof.result?.triggeredJobKey,
      patches: runtimeHookProof.metadataPatches.length,
    }),
  )
  addCheck(
    checks,
    runnerSource.includes('handleSynthesisFreshnessAfterFoundationJobRun') &&
      runnerSource.includes('updateFoundationJobRunMetadata') &&
      runnerSource.includes('runFollowupJob: runFoundationJob'),
    'Foundation job runner invokes synthesis freshness hook after job completion',
    RUNNER_PATH,
  )
  addCheck(
    checks,
    liveFreshnessMetadataRuns.length >= 1,
    'live Foundation job ledger has runtime-patched synthesis freshness metadata',
    liveFreshnessMetadataRuns.slice(0, 4).map(run => `${run.jobKey}:${run.metadata.synthesisFreshness.freshnessStatus}`).join(', ') || 'none',
  )
  addCheck(
    checks,
    liveFailedExtractorJobKeys.length > 0
      ? liveFreshness.blockedByExtractor === true && liveFreshness.failedExtractorJobKeys.length >= 1
      : liveFreshness.blockedByExtractor === false && liveFreshness.status !== 'blocked_by_extractor',
    liveFailedExtractorJobKeys.length > 0
      ? 'live freshness snapshot blocks on failed extractors instead of claiming fresh'
      : 'live freshness snapshot advances after extractor failures are repaired',
    `${liveFreshness.status} failed=${liveFreshness.failedExtractorJobKeys.join(',') || 'none'} next=${liveFreshness.nextJobKey || 'none'}`,
  )
  addCheck(
    checks,
    moduleSource.includes(SYNTHESIS_FRESHNESS_TRIGGER_ENV) &&
      moduleSource.includes('shouldAutorunSynthesisFreshnessTrigger') &&
      process.env[SYNTHESIS_FRESHNESS_TRIGGER_ENV] !== 'true',
    'live follow-up execution is explicit opt-in for no-spend proof runs',
    `${SYNTHESIS_FRESHNESS_TRIGGER_ENV}=${process.env[SYNTHESIS_FRESHNESS_TRIGGER_ENV] || ''}`,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:synthesis-router-freshness-trigger-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`,
    'package exposes focused synthesis freshness trigger proof',
    packageJson.scripts?.['process:synthesis-router-freshness-trigger-check'] || 'missing',
  )
  addCheck(
    checks,
    planSource.includes('newer upstream source run + older synthesis run') &&
      planSource.includes('failed extractor + newer archive sync') &&
      planSource.includes('No destination ledger writes happen without human approval'),
    'approved plan records dogfood cases and destination-write boundary',
    PLAN_PATH,
  )
  addCheck(
    checks,
    !sourceHasForbiddenDestinationWrites(moduleSource) &&
      !sourceHasForbiddenDestinationWrites(runnerSource),
    'freshness trigger module/runner do not write backlog, decisions, external systems, or Git reports',
    'no destination writes in trigger/check source',
  )

  const result = {
    cardId: SYNTHESIS_ROUTER_FRESHNESS_TRIGGER_CARD_ID,
    status: checks.every(check => check.ok) ? 'pass' : 'fail',
    checks,
    dogfood: {
      stale,
      blocked,
      afterSynthesis,
      afterActionRouter,
      runtimeHookProof,
      liveFreshness: {
        status: liveFreshness.status,
        nextJobKey: liveFreshness.nextJobKey,
        blockedByExtractor: liveFreshness.blockedByExtractor,
        failedExtractorJobKeys: liveFreshness.failedExtractorJobKeys,
        metadataPatchedRuns: liveFreshnessMetadataRuns.length,
      },
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Synthesis router freshness trigger check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
    }
  }

  if (result.status !== 'pass') {
    process.exitCode = 1
  }
}

main()
  .catch(error => {
    console.error('Synthesis router freshness trigger check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
