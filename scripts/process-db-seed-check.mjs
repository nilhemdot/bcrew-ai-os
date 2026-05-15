#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { overnightCloseoutRecords } from '../lib/foundation-build-closeout-overnight-records.js'
import { backlogSeed } from '../lib/foundation-backlog-seed.js'
import {
  BACKLOG_SEED_MUTABLE_FIELDS,
  BACKLOG_SEED_STABLE_FIELDS,
  DB_SEED_APPROVAL_PATH,
  DB_SEED_CARD_ID,
  DB_SEED_CLOSEOUT_KEY,
  DB_SEED_PLAN_PATH,
  DB_SEED_SCRIPT_PATH,
  DB_SEED_SPRINT_ID,
  buildBacklogSeedGovernanceReport,
  buildDbSeedGovernanceDogfoodProof,
  evaluateDbSeedModuleSplit,
} from '../lib/foundation-db-seed-governance.js'
import {
  evaluateSprintCheckHistoricalMode,
} from '../lib/sprint-check-historical-mode.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getBacklogSeedDriftSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function scriptIsReadOnly(source = '') {
  const banned = [
    ['update', 'BacklogItem('].join(''),
    ['create', 'BacklogItem('].join(''),
    ['upsert', 'FoundationCurrentSprintOverlay('].join(''),
    ['INSERT', ' INTO'].join(''),
    ['UPDATE', ' '].join(''),
    ['DELETE', ' FROM'].join(''),
    ['batch', 'UpdateSheetValues'].join(''),
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
    backlogSeedSource,
    governanceSource,
    scriptSource,
    planSource,
    verifierSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-backlog-seed.js'),
    readRepoFile('lib/foundation-db-seed-governance.js'),
    readRepoFile(DB_SEED_SCRIPT_PATH),
    readRepoFile(DB_SEED_PLAN_PATH),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DB_SEED_APPROVAL_PATH,
    cardId: DB_SEED_CARD_ID,
  })
  const seedIds = backlogSeed.map(item => item.id).filter(Boolean)
  const [card] = await getBacklogItemsByIds([DB_SEED_CARD_ID])
  const liveRows = await getBacklogItemsByIds(seedIds)
  const [activeSprint, planCriticRuns, driftSnapshot] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([DB_SEED_CARD_ID]),
    getBacklogSeedDriftSnapshot({ limit: 10 }),
  ])
  await closeFoundationDb()

  const planCritic = planCriticRuns.find(run =>
    run.cardId === DB_SEED_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= 9.8 &&
      run.planRef === DB_SEED_PLAN_PATH
  ) || null
  const sprintMode = evaluateSprintCheckHistoricalMode({
    activeSprint,
    card,
    closeouts: overnightCloseoutRecords,
    cardId: DB_SEED_CARD_ID,
    expectedSprintId: DB_SEED_SPRINT_ID,
    closeoutKey: DB_SEED_CLOSEOUT_KEY,
  })
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === DB_SEED_CARD_ID) || null
  const splitEvaluation = evaluateDbSeedModuleSplit({
    foundationDbSource,
    backlogSeedSource,
  })
  const dogfood = buildDbSeedGovernanceDogfoodProof()
  const governanceReport = buildBacklogSeedGovernanceReport({
    seedRows: backlogSeed,
    liveRows,
    limit: 10,
  })

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || DB_SEED_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, sprintMode.ok === true && ['active_current', 'historical_closeout'].includes(sprintMode.mode), 'card validates against active sprint or verified historical closeout', `${sprintMode.mode}: ${sprintMode.reason}`)
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint item is building or done', sprintItem ? sprintItem.stage : 'missing')
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, splitEvaluation.ok, 'backlog seed is split out of foundation-db', splitEvaluation.checks.filter(check => !check.ok).map(check => check.check).join(', ') || `foundation-db lines=${splitEvaluation.foundationDbLineCount}`)
  addCheck(checks, dogfood.ok === true, 'dogfood proves seed/live drift is report-only', dogfood.dogfoodInvariant)
  addCheck(checks, dogfood.mutableDrift?.status === 'live_mutable_drift_report_only' && dogfood.mutableDrift?.wouldWriteByDefault === false, 'mutable seed/live drift refuses default overwrite', dogfood.mutableDrift?.status || 'missing')
  addCheck(checks, dogfood.missingLive?.status === 'bootstrap_candidate' && dogfood.missingLive?.wouldWriteByDefault === false, 'missing live row is bootstrap candidate only', dogfood.missingLive?.status || 'missing')
  addCheck(checks, governanceReport.defaultMutationPosture === 'report_only' && governanceReport.wouldWriteByDefault === false, 'live governance report is report-only', `${governanceReport.findingCount} findings / ${governanceReport.seedRows} seed rows`)
  addCheck(checks, governanceReport.seedRows >= 180 && governanceReport.liveRows >= 180, 'real backlog seed/live rows are evaluated', `${governanceReport.liveRows}/${governanceReport.seedRows}`)
  addCheck(checks, driftSnapshot.policy && driftSnapshot.mutableFields?.includes('lane') && driftSnapshot.stableFields?.includes('summary'), 'existing seed drift snapshot remains available', `${driftSnapshot.driftItemCount} drift rows`)
  addCheck(checks, foundationDbSource.includes('includeBootstrapSeed') && foundationDbSource.includes('export async function bootstrapFoundationDb'), 'schema init still separates explicit bootstrap seed', 'initFoundationDb + bootstrapFoundationDb')
  addCheck(checks, governanceSource.includes('buildBacklogSeedGovernanceReport') && governanceSource.includes('wouldWriteByDefault: false'), 'governance helper owns report-only behavior', 'lib/foundation-db-seed-governance.js')
  addCheck(checks, verifierSource.includes('buildDbSeedGovernanceDogfoodProof') && verifierSource.includes('DB_SEED_CLOSEOUT_KEY'), 'foundation verifier delegates to focused dogfood proof', 'scripts/foundation-verify.mjs')
  addCheck(checks, packageJson.scripts?.['process:db-seed-check'] === `node --env-file-if-exists=.env ${DB_SEED_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:db-seed-check'] || 'missing')
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  addCheck(checks, planSource.includes('Actual function path') && planSource.includes('Substring-only proof is rejected') && planSource.includes('Useful operator behavior'), 'plan requires behavior proof and operator value', DB_SEED_PLAN_PATH)
  addCheck(checks, BACKLOG_SEED_STABLE_FIELDS.includes('summary') && BACKLOG_SEED_MUTABLE_FIELDS.includes('lane'), 'seed governance field groups are explicit', `stable=${BACKLOG_SEED_STABLE_FIELDS.length} mutable=${BACKLOG_SEED_MUTABLE_FIELDS.length}`)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: DB_SEED_CARD_ID,
    closeoutKey: DB_SEED_CLOSEOUT_KEY,
    checks,
    dogfood,
    governanceReport: {
      seedRows: governanceReport.seedRows,
      liveRows: governanceReport.liveRows,
      findingCount: governanceReport.findingCount,
      mutableDriftCount: governanceReport.mutableDriftCount,
      bootstrapCandidateCount: governanceReport.bootstrapCandidateCount,
      stableReviewCount: governanceReport.stableReviewCount,
      defaultMutationPosture: governanceReport.defaultMutationPosture,
    },
    splitEvaluation,
    sprintMode,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`DB seed proof: ${ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (!ok) process.exit(1)
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
