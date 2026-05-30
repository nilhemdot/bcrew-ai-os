#!/usr/bin/env node

import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  RUNTIME_FIRST_JOBS_APPROVAL_PATH,
  RUNTIME_FIRST_JOBS_CARD_ID,
  RUNTIME_FIRST_JOBS_CLOSEOUT_KEY,
  RUNTIME_FIRST_JOBS_PLAN_PATH,
  RUNTIME_FIRST_JOBS_SCRIPT_PATH,
  RUNTIME_FIRST_SAFE_JOB_KEYS,
  RUNTIME_FIRST_SAFE_TARGET_KEYS,
  buildRuntimeFirstJobsDogfoodProof,
} from '../lib/runtime-first-jobs.js'

const execFileAsync = promisify(execFile)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const PROCESS_SCRIPT_NAME = 'process:runtime-first-jobs-check'
const JOBS_ROUTE_MAX_MS = 2_000
const DEFAULT_HUB_MAX_MS = 2_000
const DEFAULT_HUB_MAX_BYTES = 800_000
const DRY_RUN_MAX_MS = 10_000

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://127.0.0.1:3000',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  args.baseUrl = String(args.baseUrl || '').replace(/\/$/, '')
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

async function fetchJsonWithMetrics(baseUrl, routePath) {
  const started = Date.now()
  const response = await fetch(new URL(routePath, baseUrl), { redirect: 'manual' })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return {
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - started,
    bytes: Buffer.byteLength(text, 'utf8'),
    json,
  }
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
    'run' + 'FoundationJob(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

function parseTrailingJson(output = '') {
  const text = String(output || '').trim()
  const match = text.match(/\{[\s\S]*\}\s*$/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

async function runExtractionTargetDryRun(targetKey) {
  const started = Date.now()
  const result = await execFileAsync(
    'npm',
    ['run', 'extraction:target', '--', `--target=${targetKey}`, '--dry-run'],
    {
      cwd: repoRoot,
      env: process.env,
      timeout: DRY_RUN_MAX_MS,
      maxBuffer: 1024 * 1024,
    },
  )
  const durationMs = Date.now() - started
  const stdout = result.stdout || ''
  const stderr = result.stderr || ''
  const json = parseTrailingJson(stdout)
  return {
    targetKey,
    durationMs,
    stdout,
    stderr,
    json,
    leakedLiveRun: /Extraction target leased|Crawl run:|npm run gmail:sync-archive|npm run missive:sync-archive/i.test(stdout + '\n' + stderr),
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    packageSource,
    foundationDbSource,
    foundationSourceCrawlDbSource,
    foundationSourceCrawlStoreSource,
    runExtractionTargetSource,
    foundationJobsSource,
    runtimeFirstJobsSource,
    runtimeReliabilityVerifierSource,
    foundationVerifySource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: RUNTIME_FIRST_JOBS_APPROVAL_PATH,
      cardId: RUNTIME_FIRST_JOBS_CARD_ID,
    }),
    getBacklogItemsByIds([RUNTIME_FIRST_JOBS_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([RUNTIME_FIRST_JOBS_CARD_ID]),
    readText('package.json'),
    readText('lib/foundation-db.js'),
    readText('lib/foundation-source-crawl-db.js'),
    readText('lib/foundation-source-crawl-store.js'),
    readText('scripts/run-extraction-target.mjs'),
    readText('lib/foundation-jobs.js'),
    readText('lib/runtime-first-jobs.js'),
    readText('lib/foundation-runtime-reliability-verifier.js'),
    readText('scripts/foundation-verify.mjs'),
    readText(RUNTIME_FIRST_JOBS_SCRIPT_PATH),
    readText(RUNTIME_FIRST_JOBS_PLAN_PATH),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const dogfood = buildRuntimeFirstJobsDogfoodProof({
    foundationDbSource: `${foundationDbSource}\n${foundationSourceCrawlDbSource}`,
    foundationSourceCrawlStoreSource,
    runExtractionTargetSource,
    foundationJobsSource,
  })
  const card = cards.find(item => item.id === RUNTIME_FIRST_JOBS_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === RUNTIME_FIRST_JOBS_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === RUNTIME_FIRST_JOBS_CLOSEOUT_KEY) || null
  const jobsRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/foundation/jobs')
  const defaultHubRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/foundation-hub')
  const jobs = Array.isArray(jobsRoute.json?.jobs) ? jobsRoute.json.jobs : []
  const jobKeySet = new Set(jobs.map(job => job.key || job.jobKey))
  const firstJobs = jobs.filter(job => RUNTIME_FIRST_SAFE_JOB_KEYS.includes(job.key || job.jobKey))
  const dryRuns = []
  for (const targetKey of RUNTIME_FIRST_SAFE_TARGET_KEYS) {
    dryRuns.push(await runExtractionTargetDryRun(targetKey))
  }

  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog has Runtime First Jobs card', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode}/${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)) ||
      (
        card?.lane === 'done' &&
        String(card?.statusNote || '').includes(RUNTIME_FIRST_JOBS_CLOSEOUT_KEY) &&
        closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(RUNTIME_FIRST_JOBS_CARD_ID)
      ),
    'Current Sprint contains Runtime First Jobs card in Building Now/Done or has verified historical closeout',
    closeout?.operatorCloseout
      ? `historical closeout ${closeout.key}`
      : activeSprint?.sprint ? `${activeSprint.sprint.activeBlockerCardId || 'none'}:${sprintItem?.stage || 'missing'}` : 'missing sprint',
  )
  addCheck(checks, dogfood.ok === true, 'dogfood rejects missing-export and dry-run parser failure modes', dogfood.ok ? 'synthetic failures rejected' : JSON.stringify(dogfood.failed || dogfood))
  addCheck(
    checks,
    dryRuns.every(run =>
      run.json?.targetKey === run.targetKey &&
      RUNTIME_FIRST_SAFE_TARGET_KEYS.includes(run.json?.targetKey) &&
      run.json?.runtimeMode === 'scheduled' &&
      run.leakedLiveRun === false &&
      run.durationMs <= DRY_RUN_MAX_MS
    ),
    'Gmail/Missive current-day target dry-runs load without lease or child command',
    dryRuns.map(run => `${run.targetKey}:${run.durationMs}ms:${run.leakedLiveRun ? 'live-leak' : 'dry'}`).join(', '),
  )
  addCheck(checks, jobsRoute.status === 200 && jobsRoute.durationMs <= JOBS_ROUTE_MAX_MS, '/api/foundation/jobs stays inside route budget', `${jobsRoute.status}/${jobsRoute.durationMs}ms/${jobsRoute.bytes}B`)
  addCheck(checks, defaultHubRoute.status === 200 && defaultHubRoute.durationMs <= DEFAULT_HUB_MAX_MS && defaultHubRoute.bytes <= DEFAULT_HUB_MAX_BYTES, 'default /api/foundation-hub stays inside compact payload budget', `${defaultHubRoute.status}/${defaultHubRoute.durationMs}ms/${defaultHubRoute.bytes}B`)
  addCheck(checks, RUNTIME_FIRST_SAFE_JOB_KEYS.every(jobKey => jobKeySet.has(jobKey)), 'first current-sync jobs are visible in job registry route', firstJobs.map(job => job.key || job.jobKey).join(', ') || 'missing')
  addCheck(
    checks,
    firstJobs.every(job =>
      job.runtimeMode === 'scheduled' &&
      job.command === 'npm' &&
      Array.isArray(job.args) &&
      job.args.includes('extraction:target') &&
      (job.sourceIds || []).length === 1 &&
      Number(job.maxRuntimeSeconds || 0) > 0
    ),
    'first current-sync jobs remain governed scheduled extraction targets',
    firstJobs.map(job => `${job.key}:${job.runtimeMode}:${job.maxRuntimeSeconds}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.[PROCESS_SCRIPT_NAME] === `node --env-file-if-exists=.env ${RUNTIME_FIRST_JOBS_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.[PROCESS_SCRIPT_NAME] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['extraction:target'] === 'node --env-file-if-exists=.env scripts/run-extraction-target.mjs',
    'governed extraction target package script is stable',
    packageJson.scripts?.['extraction:target'] || 'missing',
  )
  addCheck(
    checks,
    runtimeFirstJobsSource.includes('buildRuntimeFirstJobsDogfoodProof') &&
      runtimeFirstJobsSource.includes('oldMissingDbExportRejected') &&
      runtimeFirstJobsSource.includes('oldDryRunParserRejected'),
    'runtime-first-jobs module owns export-seam and dry-run parser dogfood',
    'lib/runtime-first-jobs.js',
  )
  addCheck(
    checks,
    foundationSourceCrawlStoreSource.includes('leaseSourceCrawlTarget,') &&
      foundationSourceCrawlStoreSource.includes('finishSourceCrawlTargetRun,'),
    'source-crawl store returns lease and finish delegates',
    'lib/foundation-source-crawl-store.js',
  )
  addCheck(
    checks,
    (
      foundationDbSource.includes('export const leaseSourceCrawlTarget = foundationSourceCrawlStore.leaseSourceCrawlTarget') ||
      (
        foundationDbSource.includes("} from './foundation-source-crawl-db.js'") &&
        foundationSourceCrawlDbSource.includes('export const leaseSourceCrawlTarget = foundationSourceCrawlStore.leaseSourceCrawlTarget')
      )
    ) &&
      (
        foundationDbSource.includes('export const finishSourceCrawlTargetRun = foundationSourceCrawlStore.finishSourceCrawlTargetRun') ||
        (
          foundationDbSource.includes("} from './foundation-source-crawl-db.js'") &&
          foundationSourceCrawlDbSource.includes('export const finishSourceCrawlTargetRun = foundationSourceCrawlStore.finishSourceCrawlTargetRun')
        )
      ),
    'foundation-db re-exports source-crawl delegates',
    'lib/foundation-db.js -> lib/foundation-source-crawl-db.js',
  )
  addCheck(
    checks,
    runExtractionTargetSource.includes('const normalizedKey') &&
      runExtractionTargetSource.includes('replace(/-([a-z0-9])/g') &&
      runExtractionTargetSource.indexOf('if (dryRun)') < runExtractionTargetSource.indexOf('const leasedTarget = await leaseSourceCrawlTarget'),
    'target runner normalizes --dry-run and checks dry-run before leasing',
    'scripts/run-extraction-target.mjs',
  )
  addCheck(
    checks,
    runtimeReliabilityVerifierSource.includes(RUNTIME_FIRST_JOBS_CARD_ID) &&
      runtimeReliabilityVerifierSource.includes('buildRuntimeFirstJobsDogfoodProof'),
    'runtime reliability verifier covers Runtime First Jobs card',
    'lib/foundation-runtime-reliability-verifier.js',
  )
  addCheck(
    checks,
    foundationVerifySource.includes(RUNTIME_FIRST_JOBS_CARD_ID) &&
      foundationVerifySource.includes('runtimeFirstJobsSource'),
    'foundation verifier passes Runtime First Jobs source text into focused verifier',
    'scripts/foundation-verify.mjs',
  )
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutations, fs writes, or live job execution')
  addCheck(
    checks,
    await repoFileExists(RUNTIME_FIRST_JOBS_PLAN_PATH) &&
      await repoFileExists(RUNTIME_FIRST_JOBS_APPROVAL_PATH),
    'plan and approval files exist',
    `${RUNTIME_FIRST_JOBS_PLAN_PATH} / ${RUNTIME_FIRST_JOBS_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    /--dry-run/i.test(planSource) &&
      /no live extraction/i.test(planSource) &&
      /Check-script apply posture/i.test(planSource),
    'plan preserves dry-run safety, not-next boundaries, and apply posture',
    RUNTIME_FIRST_JOBS_PLAN_PATH,
  )
  addCheck(
    checks,
    currentPlan.includes(RUNTIME_FIRST_JOBS_CARD_ID) &&
      currentState.includes('Runtime First Jobs'),
    'current docs preserve Runtime First Jobs context',
    'docs/rebuild/current-plan.md + current-state.md',
  )
  if (card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(RUNTIME_FIRST_JOBS_CARD_ID),
      'Recent Builds closeout is registered when Runtime First Jobs is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const output = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      dryRuns: dryRuns.map(run => ({
        targetKey: run.targetKey,
        durationMs: run.durationMs,
        leakedLiveRun: run.leakedLiveRun,
        command: run.json?.command || null,
      })),
      jobsRoute: {
        status: jobsRoute.status,
        durationMs: jobsRoute.durationMs,
        bytes: jobsRoute.bytes,
      },
      defaultHubRoute: {
        status: defaultHubRoute.status,
        durationMs: defaultHubRoute.durationMs,
        bytes: defaultHubRoute.bytes,
      },
    },
    checks,
    failed,
  }

  await closeFoundationDb()

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else if (!output.ok) {
    console.error(`Runtime First Jobs check failed (${failed.length}/${checks.length}).`)
    for (const check of failed) console.error(`- ${check.check}: ${check.detail}`)
  } else {
    console.log(`Runtime First Jobs check passed (${checks.length}/${checks.length}).`)
  }

  if (!output.ok) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {
    // Ignore close errors while surfacing the original failure.
  }
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
})
