#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  DB_CONSTRAINT_APPROVAL_PATH,
  DB_CONSTRAINT_CARD_ID,
  DB_CONSTRAINT_CLOSEOUT_KEY,
  DB_CONSTRAINT_PLAN_PATH,
  DB_CONSTRAINT_SCRIPT_PATH,
  buildDbConstraintDogfoodProof,
  evaluateDbConstraintSources,
} from '../lib/db-constraint-hardening.js'

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...value] = arg.slice(2).split('=')
    args[key] = value.length ? value.join('=') : true
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(relativePath, 'utf8')
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    decisionStoreSource,
    dbConstraintSource,
    coreGovernanceVerifierSource,
    proofScriptSource,
    packageSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: DB_CONSTRAINT_APPROVAL_PATH,
      cardId: DB_CONSTRAINT_CARD_ID,
    }),
    getBacklogItemsByIds([DB_CONSTRAINT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([DB_CONSTRAINT_CARD_ID]),
    readText('lib/foundation-decision-store.js'),
    readText('lib/db-constraint-hardening.js'),
    readText('lib/foundation-core-governance-verifier.js'),
    readText(DB_CONSTRAINT_SCRIPT_PATH),
    readText('package.json'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
  ])
  const card = cards.find(item => item.id === DB_CONSTRAINT_CARD_ID) || null
  const activeItem = (activeSprint.items || []).find(item => item.cardId === DB_CONSTRAINT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.cardId === DB_CONSTRAINT_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = await buildDbConstraintDogfoodProof()
  const sourceEvaluation = evaluateDbConstraintSources({
    decisionStoreSource,
    dbConstraintSource,
    coreGovernanceVerifierSource,
    proofScriptSource,
    packageSource,
    currentPlan,
    currentState,
  })
  const closeout = getFoundationBuildCloseouts().find(record => record.key === DB_CONSTRAINT_CLOSEOUT_KEY) || null

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has DB-CONSTRAINT executing or done', card ? `${card.lane} / ${card.priority}` : 'missing')
  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || `v2 / ${approval.approval?.score}`)
  addCheck(checks, Boolean(planCritic), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeItem?.stage === 'building_now' || activeItem?.stage === 'done_this_sprint' || card?.lane === 'done',
    'Current Sprint points to DB-CONSTRAINT while active or card is historically done',
    activeSprint.sprint?.sprintId || 'missing',
  )
  for (const sourceCheck of sourceEvaluation.checks) checks.push(sourceCheck)
  addCheck(checks, dogfood.ok, 'dogfood proves doc-update apply supersedes old decisions', dogfood.invariant)
  addCheck(
    checks,
    proofScriptSource.includes('buildDbConstraintDogfoodProof') &&
      !/updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+plan_critic_runs|UPDATE\s+foundation_sprints|UPDATE\s+foundation_sprint_items|DELETE\s+FROM\s+foundation_sprint_items|fs\.writeFile|writeFile\s*\(/i.test(proofScriptSource),
    'focused proof script is read-only',
    'no DB write helpers, sprint overlay writes, Plan Critic inserts, or fs writes',
  )
  addCheck(
    checks,
    JSON.parse(packageSource).scripts?.['process:db-constraint-check'] === `node --env-file-if-exists=.env ${DB_CONSTRAINT_SCRIPT_PATH}`,
    'package script is registered',
    JSON.parse(packageSource).scripts?.['process:db-constraint-check'] || 'missing',
  )
  if (card?.lane === 'done') {
    addCheck(checks, Boolean(closeout), 'done closeout is exact when card is closed', closeout?.key || 'missing')
  }

  const failed = checks.filter(check => !check.ok)
  const output = {
    ok: failed.length === 0,
    cardId: DB_CONSTRAINT_CARD_ID,
    closeoutKey: DB_CONSTRAINT_CLOSEOUT_KEY,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      sourceChecks: sourceEvaluation.summary,
    },
    checks,
    failed,
    dogfood,
  }

  if (jsonMode) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`DB constraint check: ${output.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (!output.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
