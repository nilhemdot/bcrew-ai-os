#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  FILE_SIZE_ENGINEERING_STANDARD_APPROVAL_PATH,
  FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
  FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY,
  FILE_SIZE_ENGINEERING_STANDARD_PLAN_PATH,
  FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH,
  buildFoundationFileSizeStandardDogfoodProof,
  validateFoundationFileSizeStandardConfig,
} from '../lib/foundation-file-size-standard.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planText,
    packageSource,
    fileSizeSource,
    architectureRulesSource,
    systemHealthSource,
    shipPreflightSource,
    runtimeReliabilityVerifierSource,
    coverageIdsSource,
    scriptSource,
  ] = await Promise.all([
    readRepoFile(FILE_SIZE_ENGINEERING_STANDARD_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-file-size-standard.js'),
    readRepoFile('lib/plan-critic-architectural-rules.js'),
    readRepoFile('lib/foundation-system-health.js'),
    readRepoFile('lib/foundation-ship-preflight.js'),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FILE_SIZE_ENGINEERING_STANDARD_APPROVAL_PATH,
    cardId: FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
  })
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([FILE_SIZE_ENGINEERING_STANDARD_CARD_ID]),
    getPlanCriticRunsByCardIds([FILE_SIZE_ENGINEERING_STANDARD_CARD_ID]),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === FILE_SIZE_ENGINEERING_STANDARD_CARD_ID) || null
  const config = validateFoundationFileSizeStandardConfig()
  const dogfood = buildFoundationFileSizeStandardDogfoodProof()
  const selfReview = evaluatePlanCriticPlan({
    planText,
    card: card || { id: FILE_SIZE_ENGINEERING_STANDARD_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/foundation-file-size-standard.js',
      'lib/plan-critic-architectural-rules.js',
      'lib/process-plan-critic.js',
      'lib/foundation-system-health.js',
      'lib/foundation-ship-preflight.js',
      'lib/foundation-runtime-reliability-verifier.js',
      FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH,
      'scripts/process-plan-critic-architectural-rules-check.mjs',
      'scripts/process-system-health-nightly-audit-check.mjs',
      'scripts/process-foundation-ship-preflight.mjs',
      'scripts/foundation-verify.mjs',
      'lib/foundation-verify-coverage-card-ids.js',
      'lib/foundation-build-closeout-size-records.js',
      'package.json',
      FILE_SIZE_ENGINEERING_STANDARD_PLAN_PATH,
      FILE_SIZE_ENGINEERING_STANDARD_APPROVAL_PATH,
    ],
    declaredRisk: planText,
    architecturalRules: true,
  })
  const closeout = getFoundationBuildCloseouts()
    .find(record => record.key === FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY)

  addCheck(checks, config.ok, 'file-size standard config encodes approved thresholds', config.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'ok')
  addCheck(checks, dogfood.ok, 'dogfood rejects over-budget/no-split and artifact/no-budget plans', dogfood.dogfoodInvariant)
  addCheck(checks, dogfood.systemHealthRisk?.status === 'risk', 'dogfood surfaces file-size risk in System Health', dogfood.systemHealthRisk?.plainEnglish || 'missing')
  addCheck(checks, dogfood.shipGateDanger?.ok === false, 'dogfood ship gate blocks red/danger file-size rows', dogfood.shipGateDanger?.status || 'missing')
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= 9.8, 'approved plan passes Plan Critic with file-size rules enabled', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval file is valid at 9.8+', approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`)
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.lane} / ${card.priority}` : 'missing')
  addCheck(checks, planCriticRuns.some(run => run.cardId === FILE_SIZE_ENGINEERING_STANDARD_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, packageJson.scripts?.['process:file-size-engineering-standard-check'] === `node --env-file-if-exists=.env ${FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH}`, 'package exposes focused file-size proof', packageJson.scripts?.['process:file-size-engineering-standard-check'] || 'missing')
  addCheck(checks, fileSizeSource.includes('preferredMaxLines: 1500') && fileSizeSource.includes('dangerAboveLines: 10000') && fileSizeSource.includes('explicitBudgetRequired: true'), 'file-size module owns approved standards', 'lib/foundation-file-size-standard.js')
  addCheck(checks, architectureRulesSource.includes('evaluatePlanFileSizeStandard') && architectureRulesSource.includes('FILE_SIZE_FINDING_KEYS'), 'Plan Critic architecture rules call file-size evaluator', 'lib/plan-critic-architectural-rules.js')
  addCheck(checks, systemHealthSource.includes('fileSizeStandard') && systemHealthSource.includes('fileSizeRiskCount'), 'System Health includes file-size rollup', 'lib/foundation-system-health.js')
  addCheck(checks, shipPreflightSource.includes('buildFoundationFileSizeShipGateStatus') && shipPreflightSource.includes('fileSizeDanger'), 'ship preflight blocks missing/red file-size standards', 'lib/foundation-ship-preflight.js')
  addCheck(checks, runtimeReliabilityVerifierSource.includes(FILE_SIZE_ENGINEERING_STANDARD_CARD_ID) && runtimeReliabilityVerifierSource.includes('buildFoundationFileSizeStandardDogfoodProof'), 'foundation verifier covers file-size standard through runtime reliability module', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageIdsSource.includes(FILE_SIZE_ENGINEERING_STANDARD_CARD_ID), 'coverage ID source names file-size card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, scriptSource.includes('dogfood rejects over-budget/no-split') && scriptSource.includes('approved plan passes Plan Critic with file-size rules enabled'), 'focused proof script calls real function behavior', FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH)
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(FILE_SIZE_ENGINEERING_STANDARD_CARD_ID), 'closeout registry record exists', closeout?.key || 'missing')

  const findings = checks.filter(check => !check.ok)
  const summary = {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardId: FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
    closeoutKey: FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY,
    selfReview: {
      status: selfReview.status,
      score: selfReview.score,
      findings: selfReview.findings,
    },
    dogfood: {
      ok: dogfood.ok,
      overBudgetNoSplit: dogfood.overBudgetNoSplit?.ok,
      reportArtifactNoBudget: dogfood.reportArtifactNoBudget?.ok,
      systemHealthRisk: dogfood.systemHealthRisk?.status,
      shipGateDanger: dogfood.shipGateDanger?.ok,
    },
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('File-size engineering standard proof')
    console.log(`  Card: ${FILE_SIZE_ENGINEERING_STANDARD_CARD_ID}`)
    console.log(`  Status: ${summary.status}`)
    console.log(`  Self review: ${buildPlanCriticResultSummary(selfReview)}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (findings.length) process.exitCode = 1
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  const args = parseArgs()
  if (args.json) {
    console.log(JSON.stringify({
      ok: false,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error instanceof Error ? error.message : String(error))
  }
  process.exitCode = 1
})
