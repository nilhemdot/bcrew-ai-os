#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { detectHardcodedLiveTruthInText } from '../lib/code-quality-nightly-audit.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_APPROVAL_PATH,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CLOSEOUT_KEY,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_PLAN_PATH,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SCRIPT_PATH,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SPRINT_ID,
  buildKpiHealthDynamicYearContractDogfoodProof,
  buildKpiHealthPeriodContract,
  evaluateKpiHealthDynamicYearContract,
  getExpectedKpiRpcs,
  getSafeKpiHealthSnapshot,
} from '../lib/kpi-health.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
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

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
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
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
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
    kpiHealthSource,
    kpiHealthScriptSource,
    foundationVerifySource,
    focusedScriptSource,
    planSource,
    dogfood,
    safeSnapshot,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_APPROVAL_PATH,
      cardId: KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID,
    }),
    getBacklogItemsByIds([KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [], planCriticRuns: [] })),
    getPlanCriticRunsByCardIds([KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID]),
    readText('package.json'),
    readText('lib/kpi-health.js'),
    readText('scripts/kpi-supabase-health.mjs'),
    readText('scripts/foundation-verify.mjs'),
    readText(KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SCRIPT_PATH),
    readText(KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_PLAN_PATH),
    buildKpiHealthDynamicYearContractDogfoodProof(),
    getSafeKpiHealthSnapshot(),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.cardId === KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8) || null
  const period2027 = buildKpiHealthPeriodContract({ now: new Date('2027-04-15T12:00:00-04:00') })
  const livePeriod = buildKpiHealthPeriodContract()
  const runtimeEvaluation = evaluateKpiHealthDynamicYearContract({
    rpcDefinitions: getExpectedKpiRpcs({ periodContract: period2027 }),
    periodContract: period2027,
  })
  const hardcodedYearFindings = detectHardcodedLiveTruthInText({
    relativePath: 'lib/kpi-health.js',
    text: kpiHealthSource,
  }).filter(finding => finding.id === 'hardcoded-kpi-health-year')
  const hardcodedKpiYearPattern = new RegExp([
    'target_year:\\s*',
    '2026',
    '|',
    '2026',
    '-01-01|',
    '2026',
    '-12-31',
  ].join(''))

  addCheck(checks, approval.ok, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SPRINT_ID || card?.lane === 'done',
    'Current Sprint points to KPI dynamic-year sprint while active or card is historically done',
    activeSprint.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    card?.lane === 'done' || (sprintItem && ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(sprintItem.stage)),
    'Current Sprint contains the card in a valid stage',
    sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : `card lane=${card?.lane || 'missing'}`,
  )
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, dogfood.ok, 'dogfood rejects frozen prior-year params and passes synthetic future runtime', dogfood.dogfoodInvariant)
  addCheck(checks, runtimeEvaluation.ok, 'real runtime helper builds period-matched KPI rpc params', `year=${runtimeEvaluation.periodContract.year} failures=${runtimeEvaluation.failures.length}`)
  addCheck(checks, hardcodedYearFindings.length === 0, 'live KPI health code no longer triggers hardcoded-year detector', hardcodedYearFindings.map(item => item.title).join(', ') || 'clean')
  addCheck(
    checks,
    safeSnapshot?.periodContract?.year === livePeriod.year &&
      safeSnapshot?.periodContract?.periodStart === livePeriod.periodStart &&
      safeSnapshot?.periodContract?.periodEnd === livePeriod.periodEnd,
    'KPI health snapshot exposes selected period contract metadata',
    safeSnapshot?.periodContract ? `${safeSnapshot.periodContract.periodStart}..${safeSnapshot.periodContract.periodEnd}` : 'missing periodContract',
  )
  addCheck(
    checks,
    kpiHealthSource.includes('buildKpiHealthPeriodContract') &&
      kpiHealthSource.includes('getExpectedKpiRpcs') &&
      kpiHealthSource.includes('buildKpiHealthDynamicYearContractDogfoodProof') &&
      !hardcodedKpiYearPattern.test(kpiHealthSource),
    'KPI health module owns dynamic period contract without live fixed-year windows',
    'lib/kpi-health.js',
  )
  addCheck(
    checks,
    kpiHealthScriptSource.includes('periodContract') &&
      kpiHealthScriptSource.includes('snapshot.rpcs'),
    'KPI health CLI prints period metadata from snapshot truth',
    'scripts/kpi-supabase-health.mjs',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:kpi-health-dynamic-year-contract-check'] === `node --env-file-if-exists=.env ${KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SCRIPT_PATH}`,
    'package exposes KPI dynamic-year process check',
    packageJson.scripts?.['process:kpi-health-dynamic-year-contract-check'] || 'missing',
  )
  addCheck(
    checks,
    scriptIsReadOnly(focusedScriptSource),
    'focused KPI dynamic-year proof script is read-only',
    'no live backlog/sprint/source/provider write tokens',
  )
  addCheck(
    checks,
    foundationVerifySource.includes('KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID') &&
      foundationVerifySource.includes('buildKpiHealthDynamicYearContractDogfoodProof') &&
      foundationVerifySource.includes('KPI health dynamic-year contract rejects frozen params'),
    'foundation verifier has thin delegated dynamic-year coverage',
    'scripts/foundation-verify.mjs',
  )
  addCheck(
    checks,
    planSource.includes('no new responsibility added') &&
      planSource.includes('substring-only checks') &&
      planSource.includes('Dogfood proof'),
    'approved plan preserves large-file and dogfood posture',
    KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_PLAN_PATH,
  )

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID,
    closeoutKey: KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CLOSEOUT_KEY,
    periodContract: livePeriod,
    dogfood,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`${result.status}: ${checks.length - failures.length}/${checks.length} checks passed`)
    for (const failure of failures) {
      console.log(`- ${failure.check}: ${failure.detail}`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
