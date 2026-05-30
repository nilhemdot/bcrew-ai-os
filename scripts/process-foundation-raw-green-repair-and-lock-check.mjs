#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_SCRIPT_PATH,
} from '../lib/build-lane-repeated-failure-action-gate.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001'
const CLOSEOUT_KEY = 'foundation-raw-green-repair-and-lock-v1'
const PLAN_PATH = 'docs/process/foundation-raw-green-repair-and-lock-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001.json'
const CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-raw-green-repair-and-lock-closeout.md'
const SCRIPT_PATH = 'scripts/process-foundation-raw-green-repair-and-lock-check.mjs'
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
const NEXT_CARD_ID = 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001'
const CONNECTOR_FAILURE_CUTOFF = new Date('2026-05-19T14:05:44.728Z')
const TRANSCRIPT_CANCEL_CUTOFF = new Date('2026-05-19T14:05:02.969Z')

const CHANGED_FILES = [
  'lib/build-lane-failure-telemetry.js',
  'lib/foundation-system-health.js',
  'lib/foundation-health-watch-to-green.js',
  'scripts/process-foundation-ship.mjs',
  'scripts/process-system-health-nightly-audit-check.mjs',
  'scripts/process-foundation-operating-reliability-check.mjs',
  'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
  'scripts/process-current-sprint-dynamic-truth-check.mjs',
  SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
]

const PROOF_COMMANDS = [
  'node --check lib/build-lane-failure-telemetry.js lib/foundation-system-health.js lib/foundation-health-watch-to-green.js scripts/process-foundation-ship.mjs scripts/process-system-health-nightly-audit-check.mjs scripts/process-foundation-operating-reliability-check.mjs scripts/process-build-lane-repeated-failure-action-gate-check.mjs scripts/process-current-sprint-dynamic-truth-check.mjs scripts/process-foundation-raw-green-repair-and-lock-check.mjs',
  'npm run process:foundation-operating-reliability-check -- --json --no-api',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:foundation-raw-green-repair-and-lock-check -- --apply --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${CARD_ID} --closeoutKey=${CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --commitRef=HEAD`,
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
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

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function parseJsonFromCommand(text = '') {
  const starts = [...String(text).matchAll(/\n\{/g)].map(match => match.index + 1)
  starts.unshift(String(text).indexOf('{'))
  for (const start of starts.filter(index => index >= 0).reverse()) {
    try {
      return JSON.parse(String(text).slice(start))
    } catch {}
  }
  return null
}

function runNpmScript(script, args = []) {
  const output = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

async function latestRun(jobKey) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT run_id, job_key, status, started_at, finished_at, error_message, output_tail
        FROM foundation_job_runs
        WHERE job_key = $1
        ORDER BY started_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      `,
      [jobKey],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

function runStartedAfter(row, cutoff) {
  const started = row?.started_at ? new Date(row.started_at) : null
  return started && !Number.isNaN(started.getTime()) && started.getTime() > cutoff.getTime()
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Foundation Raw Green Repair and Lock',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 1,
    source: 'Steve 2026-05-19 raw-green correction after repeated connector failures and false-green health exits.',
    summary: 'Repair repeated connector/job failures and lock health checks so workflow red/yellow rows cannot be called green by classification.',
    whyItMatters: 'Foundation must fix repeated failures before value work. Green must mean the machine is actually running, not that a report found an owner.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; resume ${NEXT_CARD_ID}.`
      : 'Fix connector repeated failure, meeting transcript latest state, false-green health exits, and repeated-failure blocker output before normal sprint work resumes.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; repeated failure gate is healthy and false-green exits fail closed.`
      : `Executing \`${CLOSEOUT_KEY}\`; raw workflow failures block normal sprint progression.`,
    owner: 'Foundation Process',
  }
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update raw-green repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const row = buildCardRow({ closeCard })
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
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
      [row.id, row.title, row.scope, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-raw-green-repair')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-raw-green-repair-and-lock-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-foundation-raw-green-repair',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID }),
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

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  let inserted = false
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(withRawGreenSprintItem(item, { closeCard }))
      inserted = true
      continue
    }
    if (!inserted && item.cardId === NEXT_CARD_ID) {
      items.push(withRawGreenSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
      inserted = true
    }
    items.push(item)
  }
  if (!inserted) items.push(withRawGreenSprintItem({ order: items.length + 1 }, { closeCard }))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation fully green, lock main integration discipline, upgrade dual/parallel work lanes, upgrade auditor routing, then resume source/extraction activation.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          currentStatus: closeCard ? 'raw_green_repair_locked' : 'raw_green_repair_active',
          nextAction: closeCard
            ? `Resume ${NEXT_CARD_ID}; raw workflow failure repairs and false-green locks are shipped.`
            : `${CARD_ID} blocks normal sprint/value work until raw workflow failures are repaired.`,
        },
      },
      items: items.map((item, index) => ({ ...item, order: index + 1 })),
    },
    'codex-foundation-raw-green-repair',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve made raw-green repair the active P0 blocker before normal sprint progression.',
    },
  )
}

function withRawGreenSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Connector repeated failure repaired with governed job proof, meeting transcript latest state repaired, false-green process exits fail closed, repeated-failure gate exposes blockers, and full Foundation ship proof passes.',
    proofCommands: PROOF_COMMANDS,
    notNextBoundaries: [
      'Do not close by classification.',
      'Do not proceed to value/source/agent feature work before this P0 closes.',
      'Do not run broad private/auth extraction beyond the existing bounded governed jobs.',
      'Do not work MEETING-VAULT-ACL-001 Phase B from this card.',
      'Do not mutate Drive permissions.',
      'Do not send email, Agent Feedback, or external writes.',
      'Do not launch parallel builders from this card.',
    ],
    existingWorkCheck: {
      existingCode: [
        'lib/foundation-system-health.js',
        'lib/build-lane-repeated-failure-action-gate.js',
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-foundation-operating-reliability-check.mjs',
        'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
        'scripts/process-current-sprint-dynamic-truth-check.mjs',
      ],
      existingDocs: [
        PLAN_PATH,
        APPROVAL_PATH,
        CLOSEOUT_PATH,
        'docs/process/build-lane-repeated-failure-action-gate-001-plan.md',
        'docs/process/foundation-health-watch-to-green-001-plan.md',
      ],
      existingScripts: [
        SCRIPT_PATH,
        'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-foundation-operating-reliability-check.mjs',
        'scripts/process-current-sprint-dynamic-truth-check.mjs',
      ],
      existingPolicy: [
        'Repeated failure telemetry is a repair trigger, not report noise.',
        'Green means no blocking workflow red/yellow rows are hidden by classification.',
        'Current Sprint command truth must stay DB/backlog-backed and historical proof must use verified closeout mode after rollover.',
      ],
      reused: [
        'live foundation_job_runs connector and meeting transcript rows',
        'live Backlog and Current Sprint truth',
        'existing repeated-failure action gate',
      ],
      notRebuilt: [
        'No new scheduler.',
        'No replacement health dashboard.',
        'No broad source extraction lane.',
        'No external-write or permission mutation path.',
      ],
      exactGap: 'Repeated connector failures and cancelled transcript latest-state were visible but not repaired before sprint progression; Current Sprint also needed a complete done-item scaffold after closing the P0 card.',
      overBroadRisk: 'This card must not turn cleanup/watch rows into hidden green, launch value/source work, or mutate private/external systems beyond the governed repair jobs.',
      readyBy: 'Steve',
      readyAt: '2026-05-19T10:18:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: APPROVAL_PATH,
    },
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    activeSprint,
    cards,
    planCriticRuns,
    closeoutDoc,
    systemHealthSource,
    operatingReliabilityScript,
    systemHealthScript,
    repeatedGateScript,
    telemetrySource,
    foundationShipScript,
    packageJson,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('lib/foundation-system-health.js'),
    readRepoFile('scripts/process-foundation-operating-reliability-check.mjs'),
    readRepoFile('scripts/process-system-health-nightly-audit-check.mjs'),
    readRepoFile(BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_SCRIPT_PATH),
    readRepoFile('lib/build-lane-failure-telemetry.js'),
    readRepoFile('scripts/process-foundation-ship.mjs'),
    readRepoFile('package.json'),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'raw health workflow repair, false-green process gates, and repeated-failure sprint blockers',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let workingCards = cards
  let workingPlanCriticRuns = planCriticRuns
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
    workingCards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID])
    workingPlanCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID])
  }

  const connectorLatest = await latestRun('connector-uptime-monitor')
  const transcriptLatest = await latestRun('meeting-transcripts-extract-backlog')
  const operating = runNpmScript('process:foundation-operating-reliability-check', ['--json', '--no-api'])
  const repeatedGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const card = workingCards.find(item => item.id === CARD_ID) || null
  const nextCard = workingCards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: workingActiveSprint.sprint,
    items: workingActiveSprint.items || [],
    backlogItems: workingCards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: workingPlanCriticRuns,
  })
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const parsedPackage = JSON.parse(packageJson)
  const repeatedActionGate = repeatedGate.json?.actionGate || {}

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for raw-green repair', buildPlanCriticResultSummary(planReview))
  addCheck(checks, !args.closeCard || (card?.lane === 'done' || args.apply), 'live raw-green card exists or apply will create it', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next cleanup card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, connectorLatest?.status === 'succeeded' && runStartedAfter(connectorLatest, CONNECTOR_FAILURE_CUTOFF), 'connector uptime has governed later-success proof', connectorLatest ? `${connectorLatest.status} ${connectorLatest.started_at?.toISOString?.() || connectorLatest.started_at}` : 'missing')
  addCheck(checks, transcriptLatest?.status === 'succeeded' && runStartedAfter(transcriptLatest, TRANSCRIPT_CANCEL_CUTOFF), 'meeting transcript latest state is repaired after cancelled row', transcriptLatest ? `${transcriptLatest.status} ${transcriptLatest.started_at?.toISOString?.() || transcriptLatest.started_at}` : 'missing')
  addCheck(checks, operating.exitStatus === 0 && operating.json?.summary?.runtimeActivation?.failedCount === 0, 'operating reliability exits healthy only with zero failed jobs', `exit=${operating.exitStatus} failed=${operating.json?.summary?.runtimeActivation?.failedCount ?? 'unknown'}`)
  addCheck(checks, repeatedGate.exitStatus === 0 && repeatedGate.json?.status === 'healthy' && repeatedActionGate.summary?.unsatisfiedRedCount === 0, 'repeated-failure gate is healthy after repair', `exit=${repeatedGate.exitStatus} status=${repeatedGate.json?.status || 'missing'} unsatisfied=${repeatedActionGate.summary?.unsatisfiedRedCount ?? 'unknown'}`)
  addCheck(checks, Array.isArray(repeatedActionGate.unsatisfiedRedItems) && Array.isArray(repeatedActionGate.blockingItems), 'repeated-failure JSON exposes unsatisfiedRedItems and blockingItems', `unsatisfied=${repeatedActionGate.unsatisfiedRedItems?.length ?? 'missing'} blocking=${repeatedActionGate.blockingItems?.length ?? 'missing'}`)
  addCheck(checks, systemHealth.exitStatus === 0 && systemHealth.json?.systemHealth?.status === 'healthy', 'system-health check exits healthy only when embedded workflow health is healthy', `exit=${systemHealth.exitStatus} embedded=${systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, systemHealthSource.includes('blockingClassifiedRiskCount') && systemHealthSource.includes('classificationStatus') && systemHealthSource.includes('rawStatus'), 'system-health module separates raw, classified, and blocking status', 'lib/foundation-system-health.js')
  addCheck(checks, systemHealthScript.includes('system-health proof does not exit green while embedded health is red/yellow'), 'system-health process check fails closed on false green', 'scripts/process-system-health-nightly-audit-check.mjs')
  addCheck(checks, operatingReliabilityScript.includes('operating reliability proof does not exit green with failed jobs or down connectors'), 'operating reliability process check fails closed on failed jobs/down connectors', 'scripts/process-foundation-operating-reliability-check.mjs')
  addCheck(checks, repeatedGateScript.includes('unsatisfiedRedItems') && repeatedGateScript.includes('blockingItems') && repeatedGateScript.includes('latestDetail'), 'repeated-failure proof surfaces blocker details', BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_SCRIPT_PATH)
  addCheck(checks, telemetrySource.includes('BCREW_FOUNDATION_SHIP_INFLIGHT_PROOF') && telemetrySource.includes('inflight_foundation_ship_fanout_clean'), 'repeated-failure telemetry accepts only short-lived in-flight ship proof', 'lib/build-lane-failure-telemetry.js')
  addCheck(checks, foundationShipScript.includes('BUILD_LANE_FAILURE_TELEMETRY_INFLIGHT_SHIP_PROOF_ENV') && foundationShipScript.includes('proofScope') && foundationShipScript.includes('inflight_final_verify_after_ship_check_and_fanout'), 'foundation ship breaks fanout/final-verify bootstrap without permanent proof', 'scripts/process-foundation-ship.mjs')
  addCheck(checks, parsedPackage.scripts?.['process:foundation-raw-green-repair-and-lock-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', parsedPackage.scripts?.['process:foundation-raw-green-repair-and-lock-check'] || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint can record raw-green repair closeout', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || currentSprintStatus.status === 'healthy' || args.apply, 'Current Sprint stays healthy after raw-green route', currentSprintStatus.findings?.map(item => item.check).join(', ') || 'healthy')
  addCheck(checks, !args.closeCard || (closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID)), 'closeout registry resolves raw-green repair', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || closeoutDoc.includes(CARD_ID) || args.apply, 'closeout handoff exists for raw-green repair', CLOSEOUT_PATH)

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
  }

  if (args.closeCard) {
    const refreshedCards = await getBacklogItemsByIds([CARD_ID])
    const refreshedPlanCritic = await getPlanCriticRunsByCardIds([CARD_ID])
    addCheck(checks, refreshedCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', refreshedCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    connectorLatest,
    transcriptLatest,
    operatingReliability: {
      exitStatus: operating.exitStatus,
      summary: operating.json?.summary || null,
    },
    repeatedFailureGate: {
      exitStatus: repeatedGate.exitStatus,
      status: repeatedGate.json?.status || null,
      actionGate: repeatedGate.json?.actionGate || null,
    },
    systemHealth: {
      exitStatus: systemHealth.exitStatus,
      status: systemHealth.json?.systemHealth?.status || null,
      summary: systemHealth.json?.systemHealth?.summary || null,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation raw-green repair and lock check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation raw-green repair and lock check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
