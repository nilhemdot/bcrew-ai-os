#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildFoundationVerifyReporterDogfoodProof,
} from '../lib/foundation-verify-reporter.js'
import {
  buildSyntheticBuildLogCloseoutValidationProof,
} from '../lib/foundation-build-log.js'
import {
  buildFoundationRouteBudgetVerifierDogfoodProof,
} from '../lib/foundation-route-budget-verifier.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'foundation-ship-gate-verifier-tightening-2026-05-15'

const CARDS = [
  {
    cardId: 'VERIFY-FAILURE-REPORTER-001',
    planRef: 'docs/process/verify-failure-reporter-001-plan.md',
    approvalRef: 'docs/process/approvals/VERIFY-FAILURE-REPORTER-001.json',
  },
  {
    cardId: 'CLOSEOUT-OWNERSHIP-GUARD-001',
    planRef: 'docs/process/closeout-ownership-guard-001-plan.md',
    approvalRef: 'docs/process/approvals/CLOSEOUT-OWNERSHIP-GUARD-001.json',
  },
  {
    cardId: 'VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001',
    planRef: 'docs/process/verifier-route-budget-module-split-001-plan.md',
    approvalRef: 'docs/process/approvals/VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001.json',
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, card: null }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--card=')) args.card = arg.slice('--card='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function summarizePlanCriticRuns(runs = []) {
  return runs.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing'
}

async function main() {
  const args = parseArgs()
  const selectedCards = args.card
    ? CARDS.filter(card => card.cardId === args.card)
    : CARDS
  if (!selectedCards.length) throw new Error(`Unknown card: ${args.card}`)

  const selectedCardIds = selectedCards.map(card => card.cardId)
  const checks = []

  const [
    approvals,
    sprint,
    planCriticRuns,
    backlogCards,
    packageSource,
    verifierSource,
    reporterSource,
    buildLogSource,
    routeBudgetVerifierSource,
  ] = await Promise.all([
    Promise.all(selectedCards.map(card => validatePlanApprovalFile({
      repoRoot,
      approvalRef: card.approvalRef,
      cardId: card.cardId,
    }))),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds(selectedCardIds),
    getBacklogItemsByIds(selectedCardIds),
    readRepoFile('package.json'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-reporter.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('lib/foundation-route-budget-verifier.js'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)

  addCheck(
    checks,
    approvals.every(result => result.ok && Number(result.approval?.score) >= 9.8),
    'selected approval files validate at 9.8+',
    approvals.filter(result => !result.ok).map(result => result.approvalRef).join(', ') || 'all valid',
  )
  addCheck(
    checks,
    selectedCardIds.every(cardId => planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8)),
    'selected durable Plan Critic rows pass',
    summarizePlanCriticRuns(planCriticRuns),
  )
  addCheck(
    checks,
    backlogCards.length === selectedCards.length &&
      backlogCards.every(card => ['scoped', 'executing', 'done'].includes(card.lane)),
    'selected backlog cards exist in active lanes',
    backlogCards.map(card => `${card.id}:${card.lane}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    sprint.sprint?.sprintId === SPRINT_ID &&
      selectedCardIds.every(cardId => sprint.items.some(item => item.cardId === cardId && ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(item.stage))),
    'Current Sprint contains selected cards with visible stage truth',
    sprint.sprint ? `${sprint.sprint.sprintId} ${sprint.items.map(item => `${item.cardId}:${item.stage}`).join(', ')}` : 'missing sprint',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-ship-gate-tightening-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-ship-gate-tightening-check.mjs',
    'focused proof script is registered',
    packageJson.scripts?.['process:foundation-ship-gate-tightening-check'] || 'missing',
  )

  if (selectedCardIds.includes('VERIFY-FAILURE-REPORTER-001')) {
    const reporterDogfood = buildFoundationVerifyReporterDogfoodProof()
    addCheck(
      checks,
      reporterDogfood.ok,
      'VERIFY-FAILURE-REPORTER-001 dogfood rejects noisy failure output',
      reporterDogfood.invariant,
    )
    addCheck(
      checks,
      verifierSource.includes('buildFoundationVerifyCheckOutput') &&
        verifierSource.includes("args['failures-only']") &&
        verifierSource.includes("args['json-summary']") &&
        reporterSource.includes('buildFoundationVerifyReporterDogfoodProof'),
      'foundation:verify delegates additive reporting modes to reporter module',
      'failure-only and json-summary wiring present',
    )
  }

  if (selectedCardIds.includes('CLOSEOUT-OWNERSHIP-GUARD-001')) {
    const closeoutGuardProof = buildSyntheticBuildLogCloseoutValidationProof()
    addCheck(
      checks,
      closeoutGuardProof.ok,
      'CLOSEOUT-OWNERSHIP-GUARD-001 dogfood rejects ownership/context overlap',
      closeoutGuardProof.invariant,
    )
    addCheck(
      checks,
      buildLogSource.includes('validateFoundationBuildCloseouts') &&
        buildLogSource.includes('ownershipOverlapViolations') &&
        verifierSource.includes('buildSyntheticBuildLogCloseoutValidationProof') &&
        verifierSource.includes('CLOSEOUT-OWNERSHIP-GUARD-001'),
      'foundation verifier covers closeout ownership guard behavior',
      'validation function, dogfood proof, and ID-named verifier coverage present',
    )
  }

  if (selectedCardIds.includes('VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001')) {
    const routeBudgetDogfood = buildFoundationRouteBudgetVerifierDogfoodProof()
    addCheck(
      checks,
      routeBudgetDogfood.ok,
      'VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001 dogfood rejects old route-budget failures',
      routeBudgetDogfood.invariant,
    )
    addCheck(
      checks,
      routeBudgetVerifierSource.includes('evaluateFoundationRouteBudgetVerifier') &&
        routeBudgetVerifierSource.includes('sourceDurationMs: 2_489') &&
        routeBudgetVerifierSource.includes('foundationHubPayloadBytes: 872_726') &&
        verifierSource.includes('evaluateFoundationRouteBudgetVerifier') &&
        verifierSource.includes('VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001'),
      'foundation verifier delegates route-budget checks to focused module',
      'module owns evaluator and old-failure dogfood; verifier keeps ID-named coverage',
    )
  }

  const summary = {
    ok: checks.every(check => check.ok),
    sprintId: SPRINT_ID,
    selectedCardIds,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.filter(check => check.ok).length}/${checks.length} checks passed`)
  }

  if (!summary.ok) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
