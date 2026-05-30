#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildSourceLifecycleCompletionStatus } from '../lib/source-lifecycle-completion.js'
import {
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_APPROVAL_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_PLAN_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SCRIPT_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SPRINT_ID,
  buildSourceLifecycleDynamicCountsDogfoodProof,
} from '../lib/source-lifecycle-dynamic-counts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
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

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
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

function stageOk(stage = '') {
  return ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(stage)
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
    dynamicCountsSource,
    completionSource,
    lifecycleSource,
    scriptSource,
    foundationVerifySource,
    currentPlan,
    currentState,
    sourceLifecycle,
    sourceOfTruth,
    foundationHub,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: SOURCE_LIFECYCLE_DYNAMIC_COUNTS_APPROVAL_PATH,
      cardId: SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID,
    }),
    getBacklogItemsByIds([SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID]),
    readText('package.json'),
    readText('lib/source-lifecycle-dynamic-counts.js'),
    readText('lib/source-lifecycle-completion.js'),
    readText('lib/source-lifecycle.js'),
    readText(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SCRIPT_PATH),
    readText('scripts/foundation-verify.mjs'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    fetchJson(args.baseUrl, '/api/foundation/source-lifecycle'),
    fetchJson(args.baseUrl, '/api/source-of-truth'),
    fetchJson(args.baseUrl, '/api/foundation-hub'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID) || null
  const activeItem = (activeSprint.items || []).find(item => item.cardId === SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY) || null
  const dogfood = buildSourceLifecycleDynamicCountsDogfoodProof()
  const completion = buildSourceLifecycleCompletionStatus({
    sourceLifecycle,
    sourceOfTruth,
    foundationHub,
  })

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has dynamic-count card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SPRINT_ID || card?.lane === 'done',
    'Current Sprint points to dynamic-counts while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    card?.lane === 'done' || (activeItem && stageOk(activeItem.stage)),
    'Current Sprint item has active stage truth before closeout',
    activeItem ? `${activeItem.cardId}:${activeItem.stage}` : `card lane=${card?.lane || 'missing'}`,
  )
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.optionalPass.ok === true &&
      dogfood.requiredMissingRule.ok === false &&
      dogfood.missingRequiredContract.ok === false,
    'dogfood proves optional sources pass and missing required coverage fails',
    dogfood.invariant,
  )
  addCheck(
    checks,
    completion.status === 'healthy' &&
      completion.summary.requiredMissingTerminalRuleCount === 0 &&
      completion.summary.terminalRuleMissingContractCount === 0 &&
      completion.summary.requiredMissingLifecycleRowCount === 0,
    'real Source Lifecycle completion uses dynamic required coverage',
    `requiredMissing=${completion.summary.requiredMissingTerminalRuleCount} terminalMissing=${completion.summary.terminalRuleMissingContractCount} lifecycleMissing=${completion.summary.requiredMissingLifecycleRowCount}`,
  )
  addCheck(
    checks,
    sourceLifecycle.summary?.allSourceContractsCovered === true &&
      Array.isArray(sourceOfTruth.sources) &&
      sourceOfTruth.sources.length === sourceLifecycle.summary?.sourceContractCount,
    'Source Lifecycle source rows match current source contracts dynamically',
    `sourceOfTruth=${sourceOfTruth.sources?.length || 0} lifecycle=${sourceLifecycle.summary?.sourceContractCount || 0}`,
  )
  addCheck(
    checks,
    dynamicCountsSource.includes('buildSourceLifecycleDynamicCoverage') &&
      dynamicCountsSource.includes('isOptionalSourceLifecycleContract') &&
      dynamicCountsSource.includes('buildSourceLifecycleDynamicCountsDogfoodProof'),
    'dynamic-count helper owns required/optional source coverage',
    'buildSourceLifecycleDynamicCoverage',
  )
  addCheck(
    checks,
    completionSource.includes('buildSourceLifecycleDynamicCoverage') &&
      !completionSource.includes('SOURCE_LIFECYCLE_COMPLETION_EXPECTED_SOURCE_COUNT') &&
      !completionSource.includes('sourceContracts.length ==='),
    'completion proof no longer depends on exact source-contract counts',
    'exact count invariant removed',
  )
  addCheck(
    checks,
    lifecycleSource.includes('allSourceContractsCovered: sourceLifecycles.length === normalizeList(sources).length') &&
      !lifecycleSource.includes('SOURCE_LIFECYCLE_MIN_SOURCE_CONTRACTS'),
    'Source Lifecycle expansion proof uses row coverage instead of a hardcoded minimum',
    'sourceLifecycles.length === current sources length',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:source-lifecycle-dynamic-counts-check'] === `node --env-file-if-exists=.env ${SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:source-lifecycle-dynamic-counts-check'] || 'missing',
  )
  addCheck(
    checks,
    scriptIsReadOnly(scriptSource),
    'focused proof script is read-only',
    'no DB write helpers, SQL mutation statements, or fs write calls',
  )
  addCheck(
    checks,
    await repoFileExists(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_PLAN_PATH) &&
      await repoFileExists(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_APPROVAL_PATH),
    'plan and approval files exist',
    `${SOURCE_LIFECYCLE_DYNAMIC_COUNTS_PLAN_PATH} / ${SOURCE_LIFECYCLE_DYNAMIC_COUNTS_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    foundationVerifySource.includes('SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID') &&
      foundationVerifySource.includes('buildSourceLifecycleDynamicCountsDogfoodProof') &&
      foundationVerifySource.includes('SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001 replaces exact source-count baselines'),
    'foundation verifier has ID-named dynamic-count coverage',
    'root verifier references dynamic-count constants and dogfood',
  )
  if (closeout || card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-source-lifecycle-dynamic-counts-closeout.md') &&
        currentPlan.includes(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY) &&
        currentState.includes(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY),
      'closeout is registered when card is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      requiredMissingTerminalRuleCount: completion.summary.requiredMissingTerminalRuleCount,
      terminalRuleMissingContractCount: completion.summary.terminalRuleMissingContractCount,
      optionalUnruledSourceCount: completion.summary.optionalUnruledSourceCount,
    },
    dogfood,
    completionSummary: completion.summary,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} - ${check.detail}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
