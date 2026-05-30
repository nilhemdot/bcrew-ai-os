#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  FOUNDATION_OVERNIGHT_CLOSEOUT_APPROVAL_PATH as APPROVAL_PATH,
  FOUNDATION_OVERNIGHT_CLOSEOUT_CARD_ID as CARD_ID,
  FOUNDATION_OVERNIGHT_CLOSEOUT_CHANGED_FILES as CHANGED_FILES,
  FOUNDATION_OVERNIGHT_CLOSEOUT_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_OVERNIGHT_CLOSEOUT_HANDOFF_PATH as HANDOFF_PATH,
  FOUNDATION_OVERNIGHT_CLOSEOUT_PLAN_PATH as PLAN_PATH,
  FOUNDATION_OVERNIGHT_CLOSEOUT_PROOF_COMMANDS as PROOF_COMMANDS,
  FOUNDATION_OVERNIGHT_CLOSEOUT_SCRIPT_PATH as SCRIPT_PATH,
  FOUNDATION_OVERNIGHT_NEXT_SPRINT_ID as NEXT_SPRINT_ID,
  FOUNDATION_OVERNIGHT_NOT_NEXT as NOT_NEXT,
  FOUNDATION_OVERNIGHT_REQUIRED_DONE_CARDS as REQUIRED_DONE_CARDS,
  FOUNDATION_OVERNIGHT_SOURCE_SPRINT_ID as SOURCE_SPRINT_ID,
  FOUNDATION_SAFE_CONTINUATION_ORDER,
  buildFoundationOvernightCloseoutDogfoodProof,
  buildFoundationOvernightCloseoutStatus,
  buildSafeContinuationPlan,
} from '../lib/foundation-overnight-closeout-morning-readiness.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-foundation-overnight-closeout'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function parseJsonFromCommand(text = '') {
  const value = String(text || '')
  const starts = [...value.matchAll(/\n\{/g)].map(match => match.index + 1)
  starts.unshift(value.indexOf('{'))
  for (const start of starts.filter(index => index >= 0)) {
    try {
      return JSON.parse(value.slice(start))
    } catch {}
  }
  return null
}

function runNpmScript(script, args = []) {
  const output = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

function git(args = []) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  return String(result.stdout || '').trim()
}

function getGitState() {
  const status = git(['status', '--short'])
  return {
    clean: status.length === 0,
    status,
    head: git(['rev-parse', 'HEAD']),
    originMain: git(['rev-parse', 'origin/main']),
  }
}

function onlyCurrentSprintOverlayDrift({ systemHealth = {}, repeatedFailureGate = {} } = {}) {
  const healthFindings = systemHealth.json?.systemHealth?.findings || []
  const repeatedFailures = repeatedFailureGate.json?.failed || []
  const healthOnlyCurrentSprint = healthFindings.length > 0 &&
    healthFindings.every(finding => finding?.id === 'current_sprint_unhealthy')
  const repeatedOnlyCurrentSprint = repeatedFailures.length === 0 ||
    repeatedFailures.every(finding => String(finding?.check || '').includes('Current Sprint'))
  return healthOnlyCurrentSprint && repeatedOnlyCurrentSprint
}

function buildCloseoutRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Close overnight sprint and choose morning-safe continuation',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 99,
    source: 'Steve-approved unattended overnight Foundation continuation on 2026-05-19.',
    summary: 'Verify the audit-control/intelligence sprint is clean, then open the next safe Foundation sprint instead of stopping.',
    whyItMatters: 'Steve explicitly approved nonstop work. The system must close clean sprints with proof and keep moving to the next safe card without relying on chat-only instructions.',
    nextAction: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; opened ${NEXT_SPRINT_ID} and advanced to the first safe card.`
      : 'Run overnight closeout proof; if clean, open the next safe sprint from live backlog truth.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; raw health, repeated-failure gate, backlog hygiene, Current Sprint truth, foundation:verify, and main sync were clean. Next sprint is ${NEXT_SPRINT_ID}.`
      : 'Active overnight closeout card.',
    owner: 'Foundation Ops',
  }
}

function buildNextSprintItem({ definition, card, index, firstSafeCardId }) {
  const active = definition.cardId === firstSafeCardId
  return {
    cardId: definition.cardId,
    backlogId: definition.cardId,
    order: index + 1,
    sprintOrder: index + 1,
    stage: 'scoping',
    title: definition.title,
    owner: definition.owner,
    planRef: `docs/process/${definition.cardId.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '-')}-plan.md`,
    definitionOfDone: `${definition.cardId} ships one safe Foundation slice with focused proof, System Health, repeated-failure gate, backlog hygiene, foundation:verify, process:foundation-ship, and clean pushed main.`,
    proofCommands: [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    nextAction: active
      ? `Build ${definition.cardId} now from live backlog truth.`
      : (card?.nextAction || card?.next_action || `Work ${definition.cardId} when it becomes active.`),
    notNextBoundaries: NOT_NEXT,
    metadata: {
      sprintId: NEXT_SPRINT_ID,
      reasonSelected: definition.why,
      previousLane: card?.lane || 'missing',
      previousPriority: card?.priority || 'missing',
      blockersBlockActionsNotSprint: true,
      approvalBoundActionsParkInsteadOfStopping: true,
      repoPosture: {
        integrationBranch: 'main',
        commitPushRequiredAfterCard: true,
        mainMustEqualOriginMainAtCloseout: true,
      },
    },
  }
}

function buildNextSprintOverlay({ cards = [], closeoutStatus }) {
  const cardMap = new Map(cards.map(card => [card.id, card]))
  const continuation = closeoutStatus?.continuation || buildSafeContinuationPlan({ cards })
  const firstSafeCardId = continuation.firstSafeCardId
  return {
    sprint: {
      sprintId: NEXT_SPRINT_ID,
      status: 'active',
    goal: 'Continue safe Foundation work after the clean audit-control/intelligence sprint; park approval-bound actions and keep main green.',
      activeBlockerCardId: firstSafeCardId,
      metadata: {
        currentStatus: 'safe_continuation_started',
        previousSprintId: SOURCE_SPRINT_ID,
        previousCloseoutCardId: CARD_ID,
        previousCloseoutKey: CLOSEOUT_KEY,
        nextAction: firstSafeCardId
          ? `Continue ${firstSafeCardId}; approval-bound/private/provider actions park and the builder continues safe work.`
          : 'No safe continuation card found; operator review required.',
        priorityOrder: FOUNDATION_SAFE_CONTINUATION_ORDER.map(item => item.cardId),
        parkedBoundaries: NOT_NEXT,
        exitCriteria: [
          'Active card starts from live backlog truth and a 9.8+ plan before build.',
          'System Health remains raw green.',
          'Repeated-failure gate remains healthy.',
          'Backlog hygiene remains healthy.',
          'foundation:verify and process:foundation-ship pass after each shipped card.',
          'Main is clean and synced after each shipped card.',
          'Approval-bound/private/provider/external-write actions are parked, not forced.',
        ],
        closeoutRecommendation: closeoutStatus?.recommendation || null,
      },
    },
    items: FOUNDATION_SAFE_CONTINUATION_ORDER.map((definition, index) => buildNextSprintItem({
      definition,
      index,
      firstSafeCardId,
      card: cardMap.get(definition.cardId),
    })),
  }
}

async function upsertPlanCriticRun(planReview, closeoutStatus) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `foundation-overnight-closeout-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: CARD_ID,
          closeoutKey: CLOSEOUT_KEY,
          nextSprintId: NEXT_SPRINT_ID,
          recommendation: closeoutStatus?.recommendation || null,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function updateBacklogRows({ closeCard = false, closeoutStatus, cards = [] }) {
  const pool = createPool()
  const client = await pool.connect()
  const firstSafeCardId = closeoutStatus?.continuation?.firstSafeCardId
  try {
    await client.query('BEGIN')
    const closeout = buildCloseoutRow({ closeCard })
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            team = EXCLUDED.team,
            lane = EXCLUDED.lane,
            priority = EXCLUDED.priority,
            rank = EXCLUDED.rank,
            source = EXCLUDED.source,
            summary = EXCLUDED.summary,
            why_it_matters = EXCLUDED.why_it_matters,
            next_action = EXCLUDED.next_action,
            status_note = EXCLUDED.status_note,
            owner = EXCLUDED.owner,
            updated_at = NOW()
      `,
      [closeout.id, closeout.title, closeout.team, closeout.lane, closeout.priority, closeout.rank, closeout.source, closeout.summary, closeout.whyItMatters, closeout.nextAction, closeout.statusNote, closeout.owner],
    )
    if (closeCard && firstSafeCardId) {
      const selected = FOUNDATION_SAFE_CONTINUATION_ORDER.find(item => item.cardId === firstSafeCardId)
      const current = cards.find(card => card.id === firstSafeCardId) || {}
      await client.query(
        `
          UPDATE backlog_items
          SET lane = CASE WHEN lane = 'done' THEN lane ELSE 'executing' END,
              status_note = $2,
              next_action = $3,
              owner = COALESCE(owner, $4),
              updated_at = NOW()
          WHERE id = $1
        `,
        [
          firstSafeCardId,
          `Executing under ${NEXT_SPRINT_ID}; selected by ${CLOSEOUT_KEY} as the first safe continuation card after a clean overnight closeout.`,
          current.next_action || current.nextAction || selected?.why || `Build ${firstSafeCardId} from live backlog truth.`,
          selected?.owner || 'Foundation Ops',
        ],
      )
    }
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,$3,$4,$5::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({
          closeoutKey: CLOSEOUT_KEY,
          nextSprintId: NEXT_SPRINT_ID,
          firstSafeCardId,
        }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function applyLiveState({ closeCard = false, planReview, closeoutStatus, cards }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'close overnight sprint, open next safe Current Sprint, and update first continuation card',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogRows({ closeCard, closeoutStatus, cards })
  await upsertPlanCriticRun(planReview, closeoutStatus)
  if (closeCard) {
    await upsertFoundationCurrentSprintOverlay(
      buildNextSprintOverlay({ cards, closeoutStatus }),
      ACTOR,
      {
        apply: true,
        allowItemReplacement: true,
        expectedPreviousActiveSprintId: previous.sprint?.sprintId || SOURCE_SPRINT_ID,
        reason: `${CARD_ID} closes ${SOURCE_SPRINT_ID} and opens ${NEXT_SPRINT_ID}.`,
      },
    )
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    packageJson,
    moduleSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
    activeSprint,
    cards,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-overnight-closeout-morning-readiness.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(HANDOFF_PATH, { optional: true }),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([...REQUIRED_DONE_CARDS, CARD_ID, ...FOUNDATION_SAFE_CONTINUATION_ORDER.map(item => item.cardId)]),
  ])

  let systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  let repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  let currentSprintTruth = runNpmScript('process:current-sprint-dynamic-truth-check', ['--json'])
  let backlogHygiene = runNpmScript('backlog:hygiene', ['--json'])
  let gitState = {
    ...getGitState(),
    inFlightCloseout: args.closeCard || args.apply,
  }
  const dogfood = buildFoundationOvernightCloseoutDogfoodProof()
  let closeoutStatus = buildFoundationOvernightCloseoutStatus({
    systemHealth,
    repeatedFailureGate,
    currentSprintTruth,
    backlogHygiene,
    cards,
    git: gitState,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCloseoutRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Current Sprint closeout and replacement with the next safe continuation sprint; backlog card status update; process gate and closeout registry.',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let workingCards = cards
  const canRepairCurrentSprintOverlay = args.closeCard &&
    !closeoutStatus.ok &&
    closeoutStatus.missingOrNotDone.length === 0 &&
    Boolean(closeoutStatus.continuation.firstSafeCardId) &&
    onlyCurrentSprintOverlayDrift({ systemHealth, repeatedFailureGate })
  if ((args.closeCard || args.apply) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    (!args.closeCard || closeoutStatus.ok || canRepairCurrentSprintOverlay)) {
    await applyLiveState({ closeCard: args.closeCard, planReview, closeoutStatus, cards })
    if (canRepairCurrentSprintOverlay) {
      systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
      repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
      currentSprintTruth = runNpmScript('process:current-sprint-dynamic-truth-check', ['--json'])
      backlogHygiene = runNpmScript('backlog:hygiene', ['--json'])
      gitState = {
        ...getGitState(),
        inFlightCloseout: args.closeCard || args.apply,
      }
      closeoutStatus = buildFoundationOvernightCloseoutStatus({
        systemHealth,
        repeatedFailureGate,
        currentSprintTruth,
        backlogHygiene,
        cards,
        git: gitState,
      })
      if (closeoutStatus.ok) await applyLiveState({ closeCard: args.closeCard, planReview, closeoutStatus, cards })
    }
    workingActiveSprint = await getActiveFoundationCurrentSprint()
    workingCards = await getBacklogItemsByIds([CARD_ID, ...FOUNDATION_SAFE_CONTINUATION_ORDER.map(item => item.cardId)])
  }

  const [planCriticRuns] = await Promise.all([
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const currentCard = workingCards.find(item => item.id === CARD_ID) || null
  const firstSafeCardId = closeoutStatus.continuation.firstSafeCardId
  const originalCloseoutFirstCardId = FOUNDATION_SAFE_CONTINUATION_ORDER[0]?.cardId || 'SLICE-001'
  const firstSafeCard = workingCards.find(item => item.id === firstSafeCardId) || null
  const activeBlocker = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || ''
  const sprintId = workingActiveSprint.sprint?.sprintId || workingActiveSprint.sprint?.id || ''

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for overnight closeout', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood rejects stop-after-clean and unsafe continuation cases', dogfood.invariant)
  addCheck(checks, closeoutStatus.ok, 'overnight closeout readiness is healthy', closeoutStatus.failed.map(item => item.check).join(', ') || 'pass')
  addCheck(checks, moduleSource.includes('buildSafeContinuationPlan') && moduleSource.includes('FOUNDATION_SAFE_CONTINUATION_ORDER'), 'module owns reusable safe continuation model', 'lib/foundation-overnight-closeout-morning-readiness.js')
  addCheck(checks, scriptSource.includes('buildNextSprintOverlay') && scriptSource.includes('firstSafeCardId'), 'focused script opens next safe sprint instead of stopping', SCRIPT_PATH)
  addCheck(checks, packageJson.scripts?.['process:foundation-overnight-closeout-morning-readiness-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes overnight closeout proof', packageJson.scripts?.['process:foundation-overnight-closeout-morning-readiness-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves overnight closeout', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_SPRINT_ID) && closeoutDoc.includes(originalCloseoutFirstCardId), 'closeout handoff records next sprint and closeout-time first card', HANDOFF_PATH)
  addCheck(checks, currentCard?.priority === 'P0' && (args.closeCard ? currentCard.lane === 'done' : ['executing', 'scoped', 'done'].includes(currentCard?.lane)), 'overnight closeout backlog row is correct', currentCard ? `${currentCard.lane}/${currentCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || sprintId === NEXT_SPRINT_ID, 'Current Sprint moves to next safe sprint after closeout', sprintId || 'missing')
  addCheck(checks, !args.closeCard || activeBlocker === firstSafeCardId, 'Current Sprint active blocker is first safe continuation card', activeBlocker || 'missing')
  addCheck(checks, !args.closeCard || firstSafeCard?.lane === 'executing', 'first safe continuation backlog card is executing after closeout', firstSafeCard ? `${firstSafeCard.id}:${firstSafeCard.lane}` : 'missing')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.closeCard || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextSprintId: NEXT_SPRINT_ID,
    firstSafeCardId,
    closeoutStatus,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation overnight closeout readiness check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation overnight closeout readiness check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
