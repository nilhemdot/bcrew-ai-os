#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildCodeQualityNightlyAudit } from '../lib/code-quality-nightly-audit.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID,
  buildFoundationDbInitSeedSplitDogfoodProof,
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_APPROVAL_PATH,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_PLAN_PATH,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_PRE_SPLIT_LINES,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_SCRIPT_PATH,
  FOUNDATION_DB_SCHEMA_SEED_SPLIT_SPRINT_ID,
  buildFoundationDbSchemaSeedSplitDogfoodProof,
  evaluateFoundationDbSchemaSeedSplit,
} from '../lib/foundation-db-schema-seed-store.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const handoffPath = 'docs/handoffs/2026-05-18-foundation-db-schema-seed-split-closeout.md'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.some(arg => arg === '--json' || arg === '--json=true'),
  }
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
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

function lineCount(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function scriptIsReadOnly(source = '') {
  const banned = [
    ['create', 'BacklogItem('].join(''),
    ['update', 'BacklogItem('].join(''),
    ['upsert', 'FoundationCurrentSprintOverlay('].join(''),
    ['INSERT', ' INTO'].join(''),
    ['UPDATE', ' '].join(''),
    ['DELETE', ' FROM'].join(''),
    ['fs.', 'writeFile'].join(''),
    ['write', 'File('].join(''),
  ]
  return banned.every(token => !source.includes(token))
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    foundationDbSource,
    schemaSeedSource,
    processScriptSource,
    planSource,
    packageSource,
    codeQualitySource,
    closeoutRegistrySource,
    coverageSource,
    verifierSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-db-schema-seed-store.js'),
    readRepoFile(FOUNDATION_DB_SCHEMA_SEED_SPLIT_SCRIPT_PATH),
    readRepoFile(FOUNDATION_DB_SCHEMA_SEED_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile('lib/foundation-build-closeout-tightening-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_DB_SCHEMA_SEED_SPLIT_APPROVAL_PATH,
    cardId: FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: {
      id: FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID,
      priority: 'P0',
      summary: 'Extract Foundation DB schema/bootstrap initialization into a focused module.',
      whyItMatters: 'The root DB file should not own schema initialization, seed/bootstrap posture, stores, and query APIs in one mixed-responsibility surface.',
    },
    changedFiles: [
      'lib/foundation-db-schema-seed-store.js',
      'lib/foundation-db.js',
      'lib/foundation-core-seed.js',
      'lib/foundation-db-split-verifier.js',
      'lib/foundation-process-hardening-verifier.js',
      'lib/foundation-verifier-module-assurance.js',
      'lib/code-quality-nightly-audit.js',
      'scripts/process-foundation-db-schema-seed-split-check.mjs',
      'scripts/foundation-verify.mjs',
      'package.json',
    ],
    declaredRisk: 'Foundation DB initializer extraction, schema/bootstrap proof, verifier coverage, nightly audit detector, and ship-gate closeout.',
    repoRoot,
  })
  const [[card], activeSprint, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID]),
  ])

  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(item => item.key === FOUNDATION_DB_SCHEMA_SEED_SPLIT_CLOSEOUT_KEY) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID) || null
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const historicalCloseoutOwnsCard = card?.lane === 'done' &&
    String(card?.statusNote || '').includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID)

  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const staleAuditFindings = (audit.findings || []).filter(finding =>
    ['foundation-db-schema-seed-store-monolith', 'init-foundation-db-seed-mutation-risk'].includes(finding.id)
  )
  const splitEvaluation = evaluateFoundationDbSchemaSeedSplit({
    foundationDbSource,
    schemaSeedSource,
    foundationDbLineCount: lineCount(foundationDbSource),
    preSplitFoundationDbLineCount: FOUNDATION_DB_SCHEMA_SEED_SPLIT_PRE_SPLIT_LINES,
    auditFindingIds: staleAuditFindings.map(finding => finding.id),
  })
  const splitDogfood = buildFoundationDbSchemaSeedSplitDogfoodProof({
    foundationDbSource,
    schemaSeedSource,
    foundationDbLineCount: lineCount(foundationDbSource),
    preSplitFoundationDbLineCount: FOUNDATION_DB_SCHEMA_SEED_SPLIT_PRE_SPLIT_LINES,
    auditFindingIds: staleAuditFindings.map(finding => finding.id),
  })
  const initDogfood = await buildFoundationDbInitSeedSplitDogfoodProof()

  ensure(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FOUNDATION_DB_SCHEMA_SEED_SPLIT_APPROVAL_PATH)
  ensure(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `score=${planReview.score}`)
  ensure(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === FOUNDATION_DB_SCHEMA_SEED_SPLIT_SPRINT_ID || historicalCloseoutOwnsCard, 'Current Sprint is active for this card or verified historical closeout owns it', historicalCloseoutOwnsCard ? 'historical closeout' : activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)) || historicalCloseoutOwnsCard, 'Current Sprint item is Building Now/Done or card has verified historical closeout', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : historicalCloseoutOwnsCard ? 'historical closeout' : 'missing')
  ensure(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID), 'closeout registry owns this card', closeout ? closeout.key : 'missing')
  ensure(checks, packageJson.scripts?.['process:foundation-db-schema-seed-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_DB_SCHEMA_SEED_SPLIT_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:foundation-db-schema-seed-split-check'] || 'missing')
  ensure(checks, await repoFileExists('lib/foundation-db-schema-seed-store.js'), 'schema/seed module exists', 'lib/foundation-db-schema-seed-store.js')
  ensure(checks, splitEvaluation.ok === true, 'DB schema/seed split evaluator passes current repo state', splitEvaluation.failed.map(item => item.check).join(', ') || 'ok')
  ensure(checks, splitDogfood.ok === true, 'dogfood rejects old root-owned initializer shapes', splitDogfood.dogfoodInvariant)
  ensure(checks, initDogfood.ok === true && (initDogfood.changedTables || []).length === 0, `real ${FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID} dogfood leaves watched live truth unchanged`, `${initDogfood.watchedTables?.length || 0} watched tables`)
  ensure(checks, staleAuditFindings.length === 0, 'real code-quality audit no longer reports stale DB findings', staleAuditFindings.map(finding => finding.id).join(', ') || 'resolved')
  ensure(checks, codeQualitySource.includes("surface.id === 'foundation-db-schema-seed-store-monolith'") && codeQualitySource.includes('surface.pattern.test'), 'nightly audit detector is pattern-gated for DB initializer finding', 'lib/code-quality-nightly-audit.js')
  ensure(checks, scriptIsReadOnly(processScriptSource), 'focused proof script has no live-state write path', 'no write/mutation tokens')
  ensure(checks, lineCount(foundationDbSource) < FOUNDATION_DB_SCHEMA_SEED_SPLIT_PRE_SPLIT_LINES && lineCount(foundationDbSource) < 3000, 'foundation-db root is smaller and under 3,000 lines after extraction', `${lineCount(foundationDbSource)} < ${FOUNDATION_DB_SCHEMA_SEED_SPLIT_PRE_SPLIT_LINES}`)
  ensure(checks, !/export\s+async\s+function\s+initFoundationDb\s*\(|async\s+function\s+initFoundationDb\s*\(|async\s+function\s+seedTable\s*\(/.test(foundationDbSource), 'foundation-db root no longer owns initFoundationDb or seedTable implementations', 'root delegates only')
  ensure(checks, schemaSeedSource.includes('async function initFoundationDb(options = {})') && schemaSeedSource.includes('includeBootstrapSeed') && schemaSeedSource.includes('async function seedTable('), 'schema/seed module owns init, bootstrap posture, and seed helper', 'module markers present')
  ensure(checks, closeoutRegistrySource.includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CLOSEOUT_KEY) && closeoutRegistrySource.includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID), 'closeout registry source includes card and key', 'lib/foundation-build-closeout-tightening-records.js')
  ensure(checks, coverageSource.includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID), 'verifier coverage source includes card ID', 'lib/foundation-verify-coverage-card-ids.js')
  ensure(checks, verifierSource.includes('foundationDbSchemaSeedStoreSource') && coverageSource.includes(FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID), 'foundation verifier reads schema/seed module and coverage source covers this card', 'scripts/foundation-verify.mjs')
  ensure(checks, await repoFileExists(handoffPath), 'closeout handoff exists', handoffPath)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: FOUNDATION_DB_SCHEMA_SEED_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_DB_SCHEMA_SEED_SPLIT_CLOSEOUT_KEY,
    checkCount: checks.length,
    failedCount: failed.length,
    lineCounts: {
      before: FOUNDATION_DB_SCHEMA_SEED_SPLIT_PRE_SPLIT_LINES,
      foundationDbAfter: lineCount(foundationDbSource),
      schemaSeedModule: lineCount(schemaSeedSource),
    },
    auditFindingCount: audit.summary?.findingCount || 0,
    staleAuditFindingIds: staleAuditFindings.map(finding => finding.id),
    initDogfood: {
      ok: initDogfood.ok,
      watchedTables: initDogfood.watchedTables,
      changedTables: initDogfood.changedTables,
    },
    failed,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation DB schema/seed split check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
