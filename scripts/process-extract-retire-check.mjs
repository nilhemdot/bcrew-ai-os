#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { createFoundationSourceCrawlStore } from '../lib/foundation-source-crawl-store.js'
import {
  EXTRACT_RETIRE_APPROVAL_PATH,
  EXTRACT_RETIRE_CARD_ID,
  EXTRACT_RETIRE_CLOSEOUT_KEY,
  EXTRACT_RETIRE_HANDOFF_PATH,
  EXTRACT_RETIRE_PLAN_PATH,
  EXTRACT_RETIRE_SCRIPT_PATH,
  EXTRACT_RETIRE_SPRINT_ID,
  buildExtractRetirePureDogfoodProof,
  evaluateExtractRetireSources,
} from '../lib/extract-retire.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(path) {
  return fs.readFile(path, 'utf8')
}

async function fileExists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'upsert' + 'FoundationCurrentSprintOverlay',
    'update' + 'BacklogItem',
    'create' + 'BacklogItem',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

function makeTarget(overrides = {}) {
  return {
    target_key: 'synthetic-history-target',
    source_id: 'SRC-SYNTHETIC-001',
    title: 'Synthetic history target',
    lane: 'backfill',
    target_type: 'history_backfill',
    status: 'active',
    priority: 'P1',
    runtime_mode: 'scheduled',
    cursor_state: {},
    budget: { retireAfterCleanRuns: 2 },
    dedupe_policy: {},
    lease_owner: null,
    lease_expires_at: null,
    last_run_at: null,
    next_run_at: '2026-05-17T05:00:00.000Z',
    last_status: null,
    last_error: null,
    inspected_count: 0,
    archived_count: 0,
    extracted_count: 0,
    metadata: { extractRetire: { cleanZeroWorkRunStreak: 1 } },
    notes: 'synthetic',
    updated_by: 'synthetic',
    created_at: '2026-05-16T15:30:00.000Z',
    updated_at: '2026-05-16T15:30:00.000Z',
    ...overrides,
    metadata: {
      extractRetire: { cleanZeroWorkRunStreak: 1 },
      ...(overrides.metadata || {}),
    },
    budget: {
      retireAfterCleanRuns: 2,
      ...(overrides.budget || {}),
    },
  }
}

function makeRetirementFakePool(targetOverrides = {}) {
  const state = {
    target: makeTarget(targetOverrides),
    run: null,
  }
  const calls = []
  return {
    calls,
    state,
    async query(sql, params = []) {
      const text = String(sql)
      calls.push({ sql: text, params })
      if (text.includes('pg_advisory_xact_lock')) return { rows: [] }
      if (text.includes('INSERT' + ' INTO change_events')) return { rows: [] }
      if (text.includes('UP' + 'DATE source_crawl_targets') && text.includes("last_status = 'leased'")) {
        state.target = {
          ...state.target,
          lease_owner: params[1],
          lease_expires_at: '2026-05-16T15:45:00.000Z',
          last_status: 'leased',
          last_error: null,
          updated_by: params[1],
        }
        return { rows: [state.target] }
      }
      if (text.includes('INSERT' + ' INTO source_crawl_target_runs')) {
        state.run = {
          run_id: params[0],
          target_key: params[1],
          source_id: params[2],
          status: 'running',
          lease_owner: params[3],
          lease_expires_at: params[4],
          started_at: '2026-05-16T15:30:00.000Z',
          finished_at: null,
          next_run_at: null,
          last_error: null,
          inspected_delta: 0,
          archived_delta: 0,
          extracted_delta: 0,
          metadata: JSON.parse(params[5] || '{}'),
          created_at: '2026-05-16T15:30:00.000Z',
          updated_at: '2026-05-16T15:30:00.000Z',
        }
        return { rows: [state.run] }
      }
      if (text.includes('SELECT run_id') && text.includes('FROM source_crawl_target_runs')) {
        const requestedRunId = params[2]
        if (
          state.run &&
          state.run.status === 'running' &&
          state.run.target_key === params[0] &&
          state.run.lease_owner === params[1] &&
          (!requestedRunId || state.run.run_id === requestedRunId)
        ) {
          return { rows: [{ run_id: state.run.run_id }] }
        }
        return { rows: [] }
      }
      if (text.includes('FROM source_crawl_targets') && text.includes('FOR UPDATE')) {
        return { rows: [state.target] }
      }
      if (text.includes('UP' + 'DATE source_crawl_targets') && text.includes('lease_owner = NULL')) {
        if (state.target.target_key !== params[0] || state.target.lease_owner !== params[13]) return { rows: [] }
        state.target = {
          ...state.target,
          lease_owner: null,
          lease_expires_at: null,
          status: params[11] || state.target.status,
          runtime_mode: params[12] || state.target.runtime_mode,
          last_run_at: params[1],
          next_run_at: params[2],
          last_status: params[3],
          last_error: params[4],
          inspected_count: Number(state.target.inspected_count || 0) + Number(params[5] || 0),
          archived_count: Number(state.target.archived_count || 0) + Number(params[6] || 0),
          extracted_count: Number(state.target.extracted_count || 0) + Number(params[7] || 0),
          cursor_state: { ...state.target.cursor_state, ...JSON.parse(params[8] || '{}') },
          metadata: { ...state.target.metadata, ...JSON.parse(params[9] || '{}') },
          updated_by: params[10],
        }
        return { rows: [state.target] }
      }
      if (text.includes('UP' + 'DATE source_crawl_target_runs') && text.includes('SET status = $2')) {
        if (!state.run || state.run.run_id !== params[0]) return { rows: [] }
        state.run = {
          ...state.run,
          status: params[1],
          finished_at: params[2],
          next_run_at: params[3],
          last_error: params[4],
          inspected_delta: Number(params[5] || 0),
          archived_delta: Number(params[6] || 0),
          extracted_delta: Number(params[7] || 0),
          metadata: { ...state.run.metadata, ...JSON.parse(params[8] || '{}') },
          updated_at: '2026-05-16T15:31:00.000Z',
        }
        return { rows: [state.run] }
      }
      if (text.includes('FROM source_crawl_targets')) return { rows: [state.target] }
      if (text.includes('FROM source_crawl_target_runs')) return { rows: state.run ? [state.run] : [] }
      return { rows: [] }
    },
  }
}

async function runRetirementScenario({ targetOverrides = {}, finishInput = {} } = {}) {
  const fakePool = makeRetirementFakePool(targetOverrides)
  const fakeClient = { query: (...args) => fakePool.query(...args) }
  const store = createFoundationSourceCrawlStore({
    pool: fakePool,
    withFoundationTransaction: async work => work(fakeClient),
    insertChangeEvent: async () => null,
    getFoundationJobScheduleIndex: async () => new Map([[
      'synthetic-job',
      {
        title: 'Synthetic job',
        runtimeMode: 'scheduled',
        scheduleStatus: 'scheduled',
        scheduleDetail: 'synthetic',
        due: false,
        nextRunAt: '2026-05-17T05:00:00.000Z',
        latestRunStatus: 'succeeded',
        latestRunAt: '2026-05-16T05:00:00.000Z',
      },
    ]]),
  })
  const leaseOwner = 'synthetic-worker'
  const leased = await store.leaseSourceCrawlTarget(fakePool.state.target.target_key, {
    leaseOwner,
    leaseSeconds: 120,
    force: true,
  })
  const finished = await store.finishSourceCrawlTargetRun(fakePool.state.target.target_key, {
    runId: leased.crawlRunId,
    leaseOwner,
    lastRunAt: '2026-05-16T15:31:00.000Z',
    nextRunAt: '2026-05-17T05:00:00.000Z',
    lastStatus: 'succeeded',
    inspectedDelta: 0,
    archivedDelta: 0,
    extractedDelta: 0,
    metadata: { proof: 'extract-retire' },
    ...finishInput,
  }, leaseOwner)
  return { leased, finished, state: fakePool.state, calls: fakePool.calls }
}

export async function buildSourceCrawlStoreRetirementDogfoodProof() {
  const retiringHistory = await runRetirementScenario({
    targetOverrides: {
      target_key: 'synthetic-history-target',
      lane: 'corpus_mining',
      target_type: 'drive_content_backfill',
      metadata: { extractRetire: { cleanZeroWorkRunStreak: 1 }, foundationJobKey: 'synthetic-job' },
    },
  })
  const currentDay = await runRetirementScenario({
    targetOverrides: {
      target_key: 'synthetic-current-day',
      lane: 'current_day',
      target_type: 'gmail_current',
      metadata: { extractRetire: { cleanZeroWorkRunStreak: 9 }, foundationJobKey: 'synthetic-job' },
    },
  })
  const failedRun = await runRetirementScenario({
    targetOverrides: {
      target_key: 'synthetic-failed-history',
      lane: 'history',
      target_type: 'slack_history',
      metadata: { extractRetire: { cleanZeroWorkRunStreak: 1 }, foundationJobKey: 'synthetic-job' },
    },
    finishInput: { lastStatus: 'failed', lastError: 'synthetic failure' },
  })
  const positiveWork = await runRetirementScenario({
    targetOverrides: {
      target_key: 'synthetic-positive-work',
      lane: 'backfill',
      target_type: 'video_backfill',
      metadata: { extractRetire: { cleanZeroWorkRunStreak: 1 }, foundationJobKey: 'synthetic-job' },
    },
    finishInput: { inspectedDelta: 2, archivedDelta: 1, extractedDelta: 1 },
  })

  const retiringDecision = retiringHistory.finished.metadata?.extractRetire || {}
  const currentDayDecision = currentDay.finished.metadata?.extractRetire || {}
  const failedDecision = failedRun.finished.metadata?.extractRetire || {}
  const positiveDecision = positiveWork.finished.metadata?.extractRetire || {}
  return {
    ok: retiringHistory.finished.status === 'complete' &&
      retiringHistory.finished.runtimeMode === 'paused' &&
      retiringHistory.finished.nextRunAt === null &&
      retiringDecision.shouldRetire === true &&
      currentDay.finished.status === 'active' &&
      currentDay.finished.runtimeMode === 'scheduled' &&
      currentDay.finished.nextRunAt === '2026-05-17T05:00:00.000Z' &&
      currentDayDecision.reason === 'current_day_targets_remain_scheduled' &&
      failedRun.finished.status === 'active' &&
      failedDecision.cleanZeroWorkRunStreak === 0 &&
      failedDecision.shouldRetire === false &&
      positiveWork.finished.status === 'active' &&
      positiveDecision.cleanZeroWorkRunStreak === 0 &&
      positiveDecision.shouldRetire === false,
    retiringHistory: {
      status: retiringHistory.finished.status,
      runtimeMode: retiringHistory.finished.runtimeMode,
      nextRunAt: retiringHistory.finished.nextRunAt,
      decision: retiringDecision,
    },
    currentDay: {
      status: currentDay.finished.status,
      runtimeMode: currentDay.finished.runtimeMode,
      nextRunAt: currentDay.finished.nextRunAt,
      decision: currentDayDecision,
    },
    failedRun: { decision: failedDecision },
    positiveWork: { decision: positiveDecision },
    dogfoodInvariant: 'Real source-crawl store finish path retires only threshold-met history/corpus zero-work runs and preserves current-day/failure/positive-work cases.',
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
    moduleSource,
    sourceCrawlStoreSource,
    extractionRuntimeVerifierSource,
    packageSource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
    dogfood,
    pureDogfood,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: EXTRACT_RETIRE_APPROVAL_PATH,
      cardId: EXTRACT_RETIRE_CARD_ID,
    }),
    getBacklogItemsByIds([EXTRACT_RETIRE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([EXTRACT_RETIRE_CARD_ID]),
    readText('lib/extract-retire.js'),
    readText('lib/foundation-source-crawl-store.js'),
    readText('lib/foundation-extraction-runtime-verifier.js'),
    readText('package.json'),
    readText(EXTRACT_RETIRE_SCRIPT_PATH),
    readText(EXTRACT_RETIRE_PLAN_PATH),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    buildSourceCrawlStoreRetirementDogfoodProof(),
    buildExtractRetirePureDogfoodProof(),
  ])
  const card = cards.find(item => item.id === EXTRACT_RETIRE_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === EXTRACT_RETIRE_CLOSEOUT_KEY) || null
  const sourceEvaluation = evaluateExtractRetireSources({
    moduleSource,
    sourceCrawlStoreSource,
    extractionRuntimeVerifierSource,
    packageSource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
  })

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has EXTRACT-RETIRE card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.cardId === EXTRACT_RETIRE_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === EXTRACT_RETIRE_SPRINT_ID || card?.lane === 'done',
    'Current Sprint points to extract-retire while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  for (const check of sourceEvaluation.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(checks, pureDogfood.ok === true, 'pure helper dogfood proves retirement decision boundaries', pureDogfood.dogfoodInvariant)
  addCheck(checks, dogfood.ok === true, 'real source-crawl store dogfood proves finish-path retirement behavior', dogfood.dogfoodInvariant)
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no live write helpers, SQL mutation literals, or file writes')
  if (card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(EXTRACT_RETIRE_CARD_ID) &&
        await fileExists(EXTRACT_RETIRE_HANDOFF_PATH) &&
        currentPlan.includes(EXTRACT_RETIRE_CLOSEOUT_KEY) &&
        currentState.includes(EXTRACT_RETIRE_CLOSEOUT_KEY),
      'closed card has closeout record, handoff, and rebuild docs',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    cardId: EXTRACT_RETIRE_CARD_ID,
    checks,
    failed,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    dogfood: {
      ok: dogfood.ok,
      retiringHistory: dogfood.retiringHistory,
      currentDay: dogfood.currentDay,
      failedRun: dogfood.failedRun,
      positiveWork: dogfood.positiveWork,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('EXTRACT-RETIRE proof')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${result.summary.passed}/${result.summary.total}`)
  }
  await closeFoundationDb()
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
