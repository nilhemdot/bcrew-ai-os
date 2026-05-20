#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_LANE_FAILURE_CLASS_REPAIR_CARD_IDS,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_APPROVAL_PATH,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CARD_ID as CARD_ID,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CHANGED_FILES,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CLOSEOUT_PATH as CLOSEOUT_PATH,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_NEXT_CARD_ID as NEXT_CARD_ID,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_NOT_NEXT,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_PLAN_PATH as PLAN_PATH,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_PROOF_COMMANDS,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_SCRIPT_PATH as SCRIPT_PATH,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_SPRINT_ID as SPRINT_ID,
  FOUNDATION_JOB_REPEATED_FAILURE_REPAIR_CARD_IDS,
  buildBuildLaneRepeatedFailureActionGateDogfoodProof,
  buildBuildLaneRepeatedFailureActionGateStatus,
} from '../lib/build-lane-repeated-failure-action-gate.js'
import {
  readBuildLaneFailureTelemetryEvents,
  readBuildLaneFailureTelemetryShipProofs,
  readBuildLaneFailureTelemetrySnapshot,
  writeBuildLaneFailureTelemetrySummary,
} from '../lib/build-lane-failure-telemetry.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
import { runSerializedFoundationGateCheck } from '../lib/foundation-gate-check-serialization.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

async function readRecentFoundationJobRuns() {
  const pool = createPool()
  try {
    const result = await pool.query(`
      SELECT run_id AS "runId",
             job_key AS "jobKey",
             title,
             job_type AS "jobType",
             status,
             started_at AS "startedAt",
             finished_at AS "finishedAt",
             duration_ms AS "durationMs",
             exit_code AS "exitCode",
             signal,
             output_tail AS "outputTail",
             error_message AS "errorMessage",
             metadata,
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM foundation_job_runs
      WHERE COALESCE(finished_at, started_at, created_at) > NOW() - INTERVAL '24 hours'
      ORDER BY COALESCE(finished_at, started_at, created_at) DESC
    `)
    return result.rows || []
  } finally {
    await pool.end()
  }
}

function repairCardIds() {
  return Array.from(new Set([
    CARD_ID,
    NEXT_CARD_ID,
    ...Object.values(BUILD_LANE_FAILURE_CLASS_REPAIR_CARD_IDS),
    ...Object.values(FOUNDATION_JOB_REPEATED_FAILURE_REPAIR_CARD_IDS),
  ].filter(Boolean)))
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/build-lane-failure-telemetry.js',
      'lib/build-lane-repeated-failure-action-gate.js',
      'lib/process-git-hooks.js',
      'scripts/process-build-lane-failure-telemetry-check.mjs',
      'scripts/process-foundation-ship.mjs',
    ],
    existingDocs: [
      'docs/process/build-lane-failure-telemetry-001-plan.md',
      'docs/process/build-lane-telemetry-resolution-repair-001-plan.md',
      'docs/handoffs/2026-05-18-build-lane-failure-telemetry-closeout.md',
      'docs/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md',
    ],
    existingScripts: [
      'scripts/process-build-lane-failure-telemetry-check.mjs',
      'scripts/process-build-lane-telemetry-resolution-repair-check.mjs',
      'scripts/process-foundation-ship.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Build-lane telemetry reports repeated fingerprints.',
      'Later successful ship proof can retire old failure fingerprints.',
      'Process checks are read-only unless an explicit write flag is supplied.',
      'No parallel builders until this P0 gate closes or routes a higher-priority repair.',
    ],
    reused: [
      'Existing local .git telemetry log and ship proof.',
      'Existing live Backlog, Plan Critic, Current Sprint, and closeout registry paths.',
      'Existing Foundation job run ledger.',
    ],
    notRebuilt: [
      'No new CI system.',
      'No automatic repair executor.',
      'No external telemetry sink.',
      'No live extraction lane.',
    ],
    exactGap: 'Repeated failures were visible as telemetry, but the sprint could keep moving without owner, repair card, or blocking decision.',
    overBroadRisk: 'This card can drift into broad parallel-builder work or feature work. It only gates repeated failure action routing.',
    readyBy: 'Steve',
    readyAt: '2026-05-19T09:05:00-04:00',
  }
}

function buildCardRow({ closeCard = false, actionGate } = {}) {
  const actionSummary = actionGate?.plainEnglish || 'Repeated failures must resolve or route before sprint progression.'
  return {
    id: CARD_ID,
    title: 'Build Lane Repeated Failure Action Gate',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 1,
    source: 'Steve 2026-05-19 P0 pivot after repeated connector-uptime-monitor and foundation-verify failures.',
    summary: 'Upgrade repeated build-lane and Foundation job failures from passive telemetry into a blocking action gate with owner, repair card, and sprint decision.',
    whyItMatters: 'A system that fails dozens of times before getting green is wasting builder time. Repeated failures need a repair route before the sprint continues.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`. ${actionGate?.status === 'action_required' ? 'Continue the attached repair card before normal sprint work.' : `Resume ${NEXT_CARD_ID}.`}`
      : 'Run the repeated-failure action gate, refresh failure summary, update live sprint truth, and do not start parallel builders.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; ${actionSummary}`
      : `Executing \`${CLOSEOUT_KEY}\`; repeated red failures must block or attach to repair work before Card 2.`,
    owner: 'Foundation Process',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `build-lane-repeated-failure-action-gate-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview, actionGate } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, actionGate })
  const planRun = buildPlanCriticRun(planReview)
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-build-lane-repeated-failure-action-gate')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-build-lane-repeated-failure-action-gate',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({
          closeoutKey: CLOSEOUT_KEY,
          actionGateStatus: actionGate?.status || 'unknown',
          blocksCurrentSprint: actionGate?.blocksCurrentSprint === true,
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

function withActionGateMetadata(item = {}, { closeCard = false, actionGate } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Repeated build-lane telemetry and Foundation job run failures have owner, repair card, blocking decision, refreshed local summary, live backlog card, Current Sprint route, dogfood proof, and full Foundation verification.',
    proofCommands: BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_PROOF_COMMANDS,
    nextAction: closeCard
      ? actionGate?.status === 'action_required'
        ? 'Continue the attached P0 repair card before normal sprint work.'
        : `Resume ${NEXT_CARD_ID}.`
      : 'Close the repeated-failure action gate before parallel-builder work.',
    notNextBoundaries: [
      ...BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_NOT_NEXT,
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Drive permissions.',
    ],
    existingWorkCheck: {
      ...(item.existingWorkCheck || {}),
      ...buildExistingWorkCheck(),
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_APPROVAL_PATH,
      actionGateStatus: actionGate?.status || 'unknown',
      actionGatePlainEnglish: actionGate?.plainEnglish || '',
    },
  }
}

function withNextCardMetadata(item = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    stage: item.stage && item.stage !== 'done_this_sprint' ? item.stage : 'scoping',
    definitionOfDone: item.definitionOfDone || 'Parallel/dual builder lanes require visible worktrees, file ownership, merge queue entry, serialized main merges, post-merge verification, and blocker handoff rules.',
    proofCommands: item.proofCommands?.length ? item.proofCommands : [
      'npm run process:parallel-builder-operating-system-check -- --json',
      'npm run process:foundation-main-integration-lock-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    nextAction: item.nextAction || 'Build dual/parallel merge-lane enforcement only after repeated-failure P0 gate is closed.',
    notNextBoundaries: item.notNextBoundaries?.length ? item.notNextBoundaries : [
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Drive permissions.',
      'Do not start source/extraction feature work before merge-lane enforcement, health green/classification, and audit routing.',
      'Do not launch hidden workers or untracked parallel builders.',
      'Do not run live extraction, provider probes, credential repair, sends, or external writes.',
    ],
    existingWorkCheck: item.existingWorkCheck || buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      requiredBeforeSourceActivation: true,
    },
  }
}

function activeBlockerAfterGate({ closeCard = false, actionGate } = {}) {
  if (!closeCard) return CARD_ID
  const attached = actionGate?.attachedRepairItems || []
  if (attached.length) return attached[0].repairCardId || CARD_ID
  return NEXT_CARD_ID
}

function buildSprintItems(previous = {}, { closeCard = false, actionGate } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const seen = new Set()
  const items = []
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(withActionGateMetadata(item, { closeCard, actionGate }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(withActionGateMetadata({ order: item.order || items.length + 1 }, { closeCard, actionGate }))
        seen.add(CARD_ID)
      }
      items.push(withNextCardMetadata(item))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(withActionGateMetadata({ order: items.length + 1 }, { closeCard, actionGate }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(withNextCardMetadata({ order: items.length + 1 }))
  return items.map((item, index) => ({ ...item, order: index + 1 }))
}

async function ensureLiveState({ closeCard = false, planReview, actionGate } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update repeated-failure action gate backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  if (closeCard && actionGate?.status === 'blocked') {
    throw new Error(`Cannot close ${CARD_ID}: repeated red failures still lack a repair route.`)
  }
  await upsertLiveCardAndPlanCritic({ closeCard, planReview, actionGate })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation fully green, lock main integration discipline, upgrade dual/parallel work lanes, upgrade auditor routing, then resume source/extraction activation.',
        activeBlockerCardId: activeBlockerAfterGate({ closeCard, actionGate }),
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'repeated_failure_gate_closed' : 'repeated_failure_gate_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? actionGate?.status === 'action_required'
              ? 'Run the attached repeated-failure repair card before normal sprint work.'
              : `Run ${NEXT_CARD_ID} next; no parallel builders were allowed before this P0 gate.`
            : `Finish ${CARD_ID} before ${NEXT_CARD_ID}.`,
          repeatedFailureActionGateStatus: actionGate?.status || 'unknown',
          exitCriteria: [
            'Main integration lock is closed and pushed.',
            'Repeated failures are resolved, blocked, or attached to live repair cards.',
            'Parallel builder merge-lane enforcement runs only after this P0 gate.',
            'Health/audit cleanup runs before source/extraction activation.',
          ],
        },
      },
      items: buildSprintItems(previous, { closeCard, actionGate }),
    },
    'codex-build-lane-repeated-failure-action-gate',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve made repeated build-lane failures P0 before parallel-builder work.',
    },
  )
}

function containsUnsafeRuntimeCall(source = '') {
  const executableSource = String(source || '').replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, '')
  const patterns = [
    /\bstartExtractionRun\s*\(/,
    /\bfetchTranscript\s*\(/,
    /\bcreateChatCompletion\s*\(/,
    /\bresponses\.create\s*\(/,
    /\bsendGmail\b/,
    /\bwriteClickUp\b/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\brerouteActionRoute\s*\(/,
    /\bspawn_agent\s*\(/,
  ]
  return patterns
    .filter(pattern => pattern.test(executableSource))
    .map(pattern => pattern.source)
}

function summarizeActionItem(item = {}) {
  return {
    source: item.source,
    key: item.fingerprint || item.jobKey || item.checkName,
    severity: item.severity,
    count24h: item.repeatCount24h,
    latestSeenAt: item.latestSeenAt || null,
    latestSuccessAt: item.latestSuccessAt || null,
    owner: item.owner,
    repairCardId: item.repairCardId,
    repairCardLane: item.repairCardLane,
    decision: item.decision,
    latestAffectedCardId: item.latestAffectedCardId || '',
    latestDetail: String(item.latestDetail || '').slice(0, 500),
    nextAction: item.nextAction || '',
    blocks: item.severity === 'red' && item.decision !== 'repair_card_attached' && !item.resolved,
  }
}

function summarizeActionItems(items = [], { limit = 8 } = {}) {
  const source = Array.isArray(items) ? items : []
  return source.slice(0, limit).map(summarizeActionItem)
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    planSource,
    approval,
    jobRuns,
    repairCards,
  ] = await Promise.all([
    readRepoFile(PLAN_PATH),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_APPROVAL_PATH,
      cardId: CARD_ID,
    }),
    readRecentFoundationJobRuns(),
    getBacklogItemsByIds(repairCardIds()),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CHANGED_FILES,
    declaredRisk: 'repeated build-lane failure action routing, sprint blocker decisions, and live backlog truth',
    repoRoot,
  })
  const telemetrySnapshot = readBuildLaneFailureTelemetrySnapshot({ repoRoot })
  const actionGate = buildBuildLaneRepeatedFailureActionGateStatus({
    telemetrySnapshot,
    jobRuns,
    repairCards,
  })

  if (args.apply || args.closeCard) {
    writeBuildLaneFailureTelemetrySummary({
      repoRoot,
      snapshot: { ...telemetrySnapshot, actionGate },
    })
    await ensureLiveState({ closeCard: args.closeCard, planReview, actionGate })
  }

  const [
    activeSprint,
    cards,
    planCriticRuns,
    packageJson,
    closeoutDoc,
    gateModuleSource,
    telemetryModuleSource,
    scriptSource,
    processGitHooksSource,
    verifierHealthSource,
    coverageSource,
    closeoutRecordsSource,
    summaryFile,
  ] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds(repairCardIds()),
    getPlanCriticRunsByCardIds(repairCardIds()),
    readRepoJson('package.json'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('lib/build-lane-repeated-failure-action-gate.js'),
    readRepoFile('lib/build-lane-failure-telemetry.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/process-git-hooks.js'),
    readRepoFile('lib/foundation-verifier-health-live-summary.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-build-lane-records.js'),
    readRepoFile('.git/foundation-build-lane-failure-summary.json', { optional: true }),
  ])

  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const activeSprintId = activeSprint.sprint?.sprintId || ''
  const activeBlockerCardId = activeSprint.sprint?.activeBlockerCardId || ''
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const dogfood = buildBuildLaneRepeatedFailureActionGateDogfoodProof()
  const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
  const sprintCards = await getBacklogItemsByIds(sprintCardIds)
  const sprintPlanCriticRuns = await getPlanCriticRunsByCardIds(sprintCardIds)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems: sprintCards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: sprintPlanCriticRuns,
  })
  const parsedSummary = summaryFile ? JSON.parse(summaryFile) : null
  const unsafeRuntimeHits = [
    ...containsUnsafeRuntimeCall(gateModuleSource),
    ...containsUnsafeRuntimeCall(scriptSource),
  ]
  const currentFailuresResolved = actionGate.status !== 'blocked'
  const gateClosedAndHealthy = card?.lane === 'done'
    && actionGate.status === 'healthy'
    && Number(actionGate.summary?.unsatisfiedRedCount || 0) === 0
    && Number(actionGate.summary?.blockingItemCount || 0) === 0
  const gateSprintIsActive = activeSprintId === SPRINT_ID
  const postGateSprintIsActive = gateClosedAndHealthy
    && Boolean(activeSprintId)
    && activeSprintId !== SPRINT_ID
    && activeBlockerCardId !== CARD_ID
  const gateSprintItemIsExpected = sprintItem
    && (args.closeCard ? sprintItem.stage === 'done_this_sprint' : ['building_now', 'done_this_sprint'].includes(sprintItem.stage))
  const gateSprintItemOrClosed = gateSprintItemIsExpected || (!sprintItem && gateClosedAndHealthy)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for P0 action gate', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && (args.closeCard ? card.lane === 'done' : ['executing', 'done'].includes(card?.lane)), 'live backlog card exists and is P0', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'parallel merge-lane card remains live but gated', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, gateSprintIsActive || postGateSprintIsActive, 'Current Sprint is either the active P0 gate sprint or a healthy post-gate sprint', `${activeSprintId || 'missing'} activeBlocker=${activeBlockerCardId || 'missing'}`)
  addCheck(checks, gateSprintItemOrClosed, 'Current Sprint includes the active P0 gate or the gate is closed healthy', sprintItem?.stage || `closed=${gateClosedAndHealthy}`)
  addCheck(checks, !args.closeCard || (activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID || actionGate.status === 'action_required'), 'Current Sprint does not proceed past unresolved repeated failures', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem, 'next card remains visible after P0 gate closes', nextSprintItem?.stage || 'missing')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status remains healthy after gate update', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')
  addCheck(checks, dogfood.ok, 'dogfood forces repeated red failures to block or attach repair work', dogfood.invariant)
  addCheck(checks, dogfood.routed.status === 'action_required' && dogfood.unrouted.status === 'blocked', 'dogfood distinguishes attached repair from missing repair', `${dogfood.routed.status}/${dogfood.unrouted.status}`)
  addCheck(checks, dogfood.resolvedJobRuns.status === 'healthy' && dogfood.unresolvedJobRuns.status === 'blocked', 'dogfood handles repeated job failures by later-success proof', `${dogfood.resolvedJobRuns.status}/${dogfood.unresolvedJobRuns.status}`)
  addCheck(checks, currentFailuresResolved, 'live repeated red failures are resolved or attached before close', actionGate.plainEnglish)
  addCheck(checks, actionGate.summary?.resolvedHistoricalFailureCount >= 1 || actionGate.summary?.actionItemCount === 0, 'live gate keeps resolved historical failures visible', JSON.stringify(actionGate.summary || {}))
  addCheck(checks, actionGate.actionItems.every(item => item.owner && item.nextAction && item.decision), 'every action item has owner, next action, and decision', JSON.stringify(summarizeActionItems(actionGate.actionItems)))
  addCheck(checks, packageJson.scripts?.['process:build-lane-repeated-failure-action-gate-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-lane-repeated-failure-action-gate-check'] || 'missing')
  addCheck(checks, processGitHooksSource.includes('refreshBuildLaneFailureSummaryAfterShipProof') && processGitHooksSource.includes('writeBuildLaneFailureTelemetrySummary'), 'ship proof refreshes failure summary after success', 'lib/process-git-hooks.js')
  addCheck(checks, telemetryModuleSource.includes('readBuildLaneFailureTelemetryShipProofs') && telemetryModuleSource.includes('later_successful_foundation_ship'), 'telemetry still retires stale fingerprints only by later ship proof', 'lib/build-lane-failure-telemetry.js')
  addCheck(checks, parsedSummary?.actionGate?.cardId === CARD_ID && parsedSummary.actionGate.summary, 'local failure summary includes action gate decision', parsedSummary?.actionGate?.status || 'missing')
  addCheck(checks, verifierHealthSource.includes('buildBuildLaneRepeatedFailureActionGateDogfoodProof') && verifierHealthSource.includes(CARD_ID), 'verifier health summary covers repeated-failure action gate', 'lib/foundation-verifier-health-live-summary.js')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes P0 action gate card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout registry source includes P0 action gate', 'lib/foundation-build-closeout-build-lane-records.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves P0 action gate', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('No parallel builders') && closeoutDoc.includes(NEXT_CARD_ID), 'closeout states no parallel builders and next card', CLOSEOUT_PATH)
  addCheck(checks, gateModuleSource.split('\n').length < 700, 'action gate module stays under preferred size', `${gateModuleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 700, 'focused proof script stays under preferred size', `${scriptSource.split('\n').length} lines`)
  addCheck(checks, unsafeRuntimeHits.length === 0, 'gate code has no extraction/model/action/external-write calls', unsafeRuntimeHits.join(', ') || 'clean')
  addCheck(checks, !/spawn_agent|parallel builders are now approved/i.test(planSource + closeoutDoc), 'card does not approve hidden or parallel workers', 'P0 gate only')
  addCheck(checks, readBuildLaneFailureTelemetryEvents({ repoRoot }).length >= 0 && readBuildLaneFailureTelemetryShipProofs({ repoRoot }).length >= 1, 'local telemetry and ship proof are readable', 'local .git telemetry')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    actionGate: {
      status: actionGate.status,
      blocksCurrentSprint: actionGate.blocksCurrentSprint,
      summary: actionGate.summary,
      plainEnglish: actionGate.plainEnglish,
      unsatisfiedRedItems: summarizeActionItems(actionGate.unsatisfiedRedItems, { limit: 20 }),
      blockingItems: summarizeActionItems(actionGate.blockingItems, { limit: 20 }),
      actionItems: summarizeActionItems(actionGate.actionItems),
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Build Lane Repeated Failure Action Gate check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

runSerializedFoundationGateCheck('process:build-lane-repeated-failure-action-gate-check', () => main())
  .catch(error => {
    console.error('Build Lane Repeated Failure Action Gate check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
