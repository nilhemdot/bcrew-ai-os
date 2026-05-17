#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  CRITICAL_ROOTS_UNDER_3K_PHASE_2_APPROVAL_PATH,
  CRITICAL_ROOTS_UNDER_3K_PHASE_2_CARD_ID,
  CRITICAL_ROOTS_UNDER_3K_PHASE_2_CLOSEOUT_KEY,
  CRITICAL_ROOTS_UNDER_3K_PHASE_2_PLAN_PATH,
  CRITICAL_ROOTS_UNDER_3K_PHASE_2_SCRIPT_PATH,
  FOUNDATION_VERIFY_LIVE_API_SNAPSHOT_MODULE_PATH,
  buildFoundationVerifyLiveApiSnapshotDogfoodProof,
  evaluateFoundationVerifyLiveApiSnapshotSplit,
  loadFoundationVerifyLiveApiSnapshot,
} from '../lib/foundation-verify-live-api-snapshot.js'

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const baseUrl = process.env.FOUNDATION_BASE_URL || 'http://localhost:3000'
const CRITICAL_ROOTS = [
  'scripts/foundation-verify.mjs',
  'server.js',
  'lib/foundation-db.js',
  'public/foundation.js',
]

function parseArgs(argv = process.argv.slice(2)) {
  return { json: argv.includes('--json') || argv.includes('--json=true') }
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function lineCount(source = '') {
  return String(source || '').split(/\r?\n/).length
}

async function changedFiles() {
  const { stdout } = await execFile('git', ['diff', '--name-only', 'HEAD'], {
    cwd: repoRoot,
    maxBuffer: 1024 * 128,
  })
  return String(stdout || '').split('\n').map(line => line.trim()).filter(Boolean)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    rootSource,
    moduleSource,
    packageSource,
    proofScriptSource,
    planSource,
    closeoutRecordsSource,
    coverageSource,
  ] = await Promise.all([
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(FOUNDATION_VERIFY_LIVE_API_SNAPSHOT_MODULE_PATH),
    readRepoFile('package.json'),
    readRepoFile(CRITICAL_ROOTS_UNDER_3K_PHASE_2_SCRIPT_PATH),
    readRepoFile(CRITICAL_ROOTS_UNDER_3K_PHASE_2_PLAN_PATH),
    readRepoFile('lib/foundation-build-closeout-size-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
  ])
  const packageJson = JSON.parse(packageSource)
  const criticalRootCounts = Object.fromEntries(await Promise.all(
    CRITICAL_ROOTS.map(async filePath => [filePath, lineCount(await readRepoFile(filePath))])
  ))
  const splitEvaluation = evaluateFoundationVerifyLiveApiSnapshotSplit({
    rootSource,
    moduleSource,
    rootLineCount: criticalRootCounts['scripts/foundation-verify.mjs'],
    packageJson,
  })
  const dogfood = buildFoundationVerifyLiveApiSnapshotDogfoodProof({
    rootSource,
    moduleSource,
    rootLineCount: splitEvaluation.rootLineCount,
    moduleLineCount: splitEvaluation.moduleLineCount,
    packageJson,
  })
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: CRITICAL_ROOTS_UNDER_3K_PHASE_2_APPROVAL_PATH,
    cardId: CRITICAL_ROOTS_UNDER_3K_PHASE_2_CARD_ID,
  })
  const [cards, planCriticRuns, diffFiles, liveSnapshot] = await Promise.all([
    getBacklogItemsByIds([CRITICAL_ROOTS_UNDER_3K_PHASE_2_CARD_ID]),
    getPlanCriticRunsByCardIds([CRITICAL_ROOTS_UNDER_3K_PHASE_2_CARD_ID]),
    changedFiles(),
    loadFoundationVerifyLiveApiSnapshot({ baseUrl })
      .then(snapshot => ({ ok: true, snapshot }))
      .catch(error => ({ ok: false, error: error instanceof Error ? error.message : String(error) })),
  ])
  const card = cards[0] || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const forbiddenTouched = diffFiles.filter(filePath => /(^|\/)(harlan|fal|voice|mockup)/i.test(filePath))
  const planHasDomainSplit = planSource.includes('live API snapshot') &&
    planSource.includes('without route behavior changes') &&
    ['Harlan', 'Fal', 'voice', 'Canva'].every(token => planSource.includes(token))
  const closeoutRegistryOwnsCard = closeoutRecordsSource.includes(CRITICAL_ROOTS_UNDER_3K_PHASE_2_CLOSEOUT_KEY) &&
    closeoutRecordsSource.includes(CRITICAL_ROOTS_UNDER_3K_PHASE_2_CARD_ID) &&
    closeoutRecordsSource.includes(FOUNDATION_VERIFY_LIVE_API_SNAPSHOT_MODULE_PATH)
  const verifierCoverageOwnsCard = coverageSource.includes('CRITICAL_ROOTS_UNDER_3K_PHASE_2_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') &&
    coverageSource.includes(CRITICAL_ROOTS_UNDER_3K_PHASE_2_CARD_ID)

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || CRITICAL_ROOTS_UNDER_3K_PHASE_2_APPROVAL_PATH)
  ensure(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in an allowed lane', card ? `${card.id}/${card.lane}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, splitEvaluation.ok, 'foundation verifier delegates live API snapshot loading', splitEvaluation.findings.map(item => `${item.code}:${item.detail}`).join(', ') || JSON.stringify({ root: splitEvaluation.rootLineCount, module: splitEvaluation.moduleLineCount }))
  ensure(checks, dogfood.ok, 'dogfood rejects bad live API snapshot split fixtures', dogfood.dogfoodInvariant)
  ensure(checks, criticalRootCounts['scripts/foundation-verify.mjs'] < 5000, 'scripts/foundation-verify.mjs stays below 5,000 lines', String(criticalRootCounts['scripts/foundation-verify.mjs']))
  ensure(checks, criticalRootCounts['public/foundation.js'] < 3000, 'public/foundation.js remains below 3,000 lines', String(criticalRootCounts['public/foundation.js']))
  ensure(checks, splitEvaluation.moduleLineCount <= 1500, 'extracted live API snapshot module stays under 1,500 lines', String(splitEvaluation.moduleLineCount))
  ensure(checks, liveSnapshot.ok && liveSnapshot.snapshot?.foundationHub && liveSnapshot.snapshot?.sourceOfTruth, 'live API snapshot loader returns Foundation Hub and source truth', liveSnapshot.ok ? 'snapshot loaded' : liveSnapshot.error)
  ensure(checks, planHasDomainSplit, 'plan names domain split and not-next boundaries', CRITICAL_ROOTS_UNDER_3K_PHASE_2_PLAN_PATH)
  ensure(checks, closeoutRegistryOwnsCard, 'closeout registry owns Phase 2 closeout key and module', CRITICAL_ROOTS_UNDER_3K_PHASE_2_CLOSEOUT_KEY)
  ensure(checks, verifierCoverageOwnsCard, 'verifier coverage names Phase 2 card', CRITICAL_ROOTS_UNDER_3K_PHASE_2_CARD_ID)
  ensure(checks, proofScriptSource.includes('evaluateFoundationVerifyLiveApiSnapshotSplit') && proofScriptSource.includes('loadFoundationVerifyLiveApiSnapshot'), 'focused proof calls real split evaluator and loader', CRITICAL_ROOTS_UNDER_3K_PHASE_2_SCRIPT_PATH)
  ensure(checks, packageJson.scripts?.['process:critical-roots-under-3k-phase-2-check'] === `node --env-file-if-exists=.env ${CRITICAL_ROOTS_UNDER_3K_PHASE_2_SCRIPT_PATH}`, 'package script is registered', CRITICAL_ROOTS_UNDER_3K_PHASE_2_SCRIPT_PATH)
  ensure(checks, forbiddenTouched.length === 0, 'no Harlan/Fal/voice/mockup paths touched', forbiddenTouched.join(', ') || 'clean')

  const result = {
    ok: checks.every(check => check.ok),
    cardId: CRITICAL_ROOTS_UNDER_3K_PHASE_2_CARD_ID,
    closeoutKey: CRITICAL_ROOTS_UNDER_3K_PHASE_2_CLOSEOUT_KEY,
    checks,
    failures: checks.filter(check => !check.ok),
    splitEvaluation,
    dogfood,
    criticalRootCounts,
    liveSnapshot: liveSnapshot.ok ? { ok: true } : liveSnapshot,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Critical roots under 3K Phase 2 check: ${result.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (!result.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
