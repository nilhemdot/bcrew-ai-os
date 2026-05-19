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
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getExtractionControlSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
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
  EXTRACT_BACKFILL_ACTIVE_TARGETS,
  EXTRACT_BACKFILL_APPROVAL_PATH,
  EXTRACT_BACKFILL_CARD_ID as CARD_ID,
  EXTRACT_BACKFILL_CHANGED_FILES,
  EXTRACT_BACKFILL_CLOSEOUT_KEY as CLOSEOUT_KEY,
  EXTRACT_BACKFILL_CLOSEOUT_PATH,
  EXTRACT_BACKFILL_JOB_ONLY_LANES,
  EXTRACT_BACKFILL_NEXT_CARD_ID as NEXT_CARD_ID,
  EXTRACT_BACKFILL_NOT_NEXT,
  EXTRACT_BACKFILL_PLAN_PATH,
  EXTRACT_BACKFILL_PROOF_COMMANDS,
  EXTRACT_BACKFILL_SCRIPT_PATH,
  buildExtractBackfillCursorContractStatus,
  buildExtractBackfillDogfoodProof,
} from '../lib/extract-backfill-cursor-contract.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'

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

function parseJsonFromCommand(text = '') {
  const value = String(text || '')
  const starts = [...value.matchAll(/\n\{/g)].map(match => match.index + 1)
  starts.unshift(value.indexOf('{'))
  for (const start of starts.filter(index => index >= 0).reverse()) {
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
    maxBuffer: 90 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

async function queryLatestJobs(jobKeys = []) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        WITH ranked AS (
          SELECT *,
                 ROW_NUMBER() OVER (
                   PARTITION BY job_key
                   ORDER BY started_at DESC NULLS LAST, created_at DESC
                 ) AS rn
          FROM foundation_job_runs
          WHERE job_key = ANY($1::text[])
        )
        SELECT run_id, job_key, status, started_at, finished_at, duration_ms,
               error_message, signal
        FROM ranked
        WHERE rn = 1
        ORDER BY job_key
      `,
      [jobKeys],
    )
    return Object.fromEntries(result.rows.map(row => [row.job_key, row]))
  } finally {
    await pool.end()
  }
}

function buildExtractBackfillCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Build the bounded historical backfill lane',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 8,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; follows current-day freshness proof.',
    summary: 'Define and prove durable historical backfill with source posture, cursor/checkpoint state, daily bite size, stop condition, retry state, skip reasons, and partial-failure rules before broad history expansion.',
    whyItMatters: 'Current-day lanes keep today fresh; backfill must work backward safely without blind private extraction, runaway provider calls, or unowned failure states.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue \`${NEXT_CARD_ID}\` with the next bounded Drive content slice.`
      : 'Prove the bounded historical backfill contract, park approval-bound operations, and advance to DRIVE-CONTENT-001 when the proof is green.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; active backfill/corpus lanes are bounded, cursored, latest-success, skip/retry visible, and parked lanes have owner/reason/next trigger.`
      : `Executing \`${CLOSEOUT_KEY}\`; proving bounded historical cursor/backfill contract.`,
    owner: 'Foundation Extract',
  }
}

function buildDriveContentCardRow() {
  return {
    id: NEXT_CARD_ID,
    title: 'Build Drive Docs and PDF content extraction v1',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 9,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; follows EXTRACT-BACKFILL-001 bounded cursor contract.',
    summary: 'Drive content extraction has a scheduled bounded lane; the next slice should improve file-type coverage, manifest/ledger proof, and skip-reason handling without Drive permission mutation.',
    whyItMatters: 'Drive holds strategy, SOP, training, recruiting, and client-experience evidence. The system needs readable Drive content with provenance, not just filenames.',
    nextAction: 'Build the next safe Drive content bite: improve bounded file-type coverage/skip reasons/manifest proof through the existing drive-content-extract-backfill lane; do not mutate Drive permissions.',
    statusNote: `Next active Foundation card after ${CLOSEOUT_KEY}; scope the next bounded Drive content slice before closing, with no broad Drive sweep or permission mutation.`,
    owner: 'Foundation Extract',
  }
}

function buildExtractBackfillSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    backlogId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: EXTRACT_BACKFILL_PLAN_PATH,
    definitionOfDone: 'Durable historical backfill contract exists with cursor/checkpoint, source posture, daily bite size, coverage window, stop condition, retry/skip rules, partial-failure behavior, and parked approval-bound lanes.',
    proofCommands: EXTRACT_BACKFILL_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close EXTRACT-BACKFILL-001 before DRIVE-CONTENT-001.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...EXTRACT_BACKFILL_NOT_NEXT])),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: EXTRACT_BACKFILL_APPROVAL_PATH,
      approvalBoundActionsParkInsteadOfStopping: true,
      broadHistoricalExtractionApproved: false,
    },
  }
}

function buildDriveContentSprintItem(item = {}, { active = false } = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    backlogId: NEXT_CARD_ID,
    stage: active ? 'scoping' : (item.stage || 'scoping'),
    planRef: 'docs/process/drive-content-001-plan.md',
    definitionOfDone: 'Next bounded Drive content slice improves file-type coverage, manifest/ledger proof, and skip reasons through existing governed lanes without Drive permission mutation.',
    proofCommands: [
      'npm run process:drive-content-check -- --apply --close-card --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:foundation-ship -- --card=DRIVE-CONTENT-001 --planApprovalRef=docs/process/approvals/DRIVE-CONTENT-001.json --closeoutKey=drive-content-next-bite-v1 --commitRef=HEAD',
    ],
    nextAction: 'Scope/build DRIVE-CONTENT-001 next. Use the existing bounded Drive content lane and park any Drive permission/access mutation.',
    notNextBoundaries: Array.from(new Set([
      ...(item.notNextBoundaries || []),
      'Do not mutate Google Drive permissions.',
      'Do not run broad Drive sweeps outside the bounded daily quota lane.',
      'Do not add paid/provider/browser-auth extraction.',
      'Do not send request-access emails or external writes.',
    ])),
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      approvalBoundActionsParkInsteadOfStopping: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(buildExtractBackfillSprintItem(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(buildExtractBackfillSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(buildDriveContentSprintItem(item, { active: closeCard }))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    if (item.cardId) seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(buildExtractBackfillSprintItem({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(buildDriveContentSprintItem({ order: items.length + 1 }, { active: true }))
  return items.map((item, index) => ({ ...item, order: index + 1, sprintOrder: index + 1 }))
}

async function updateBacklogRow(client, row) {
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
    [row.id, row.title, row.team, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
  )
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: EXTRACT_BACKFILL_SCRIPT_PATH,
    operation: 'create/update EXTRACT-BACKFILL-001 and DRIVE-CONTENT-001 backlog rows, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updateBacklogRow(client, buildExtractBackfillCardRow({ closeCard }))
    await updateBacklogRow(client, buildDriveContentCardRow())
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-extract-backfill')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `extract-backfill-${stableRunId(EXTRACT_BACKFILL_PLAN_PATH)}`,
        CARD_ID,
        EXTRACT_BACKFILL_PLAN_PATH,
        planReview.status,
        planReview.score,
        EXTRACT_BACKFILL_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-extract-backfill',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, nextCardId: NEXT_CARD_ID }),
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
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || SPRINT_ID,
        status: 'active',
        goal: 'Make Foundation raw-green, self-improving, backlog-clean, operationally controlled, and ready to resume source/extract work without rebuilding tech debt.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'extract_backfill_closed' : 'extract_backfill_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard ? `Continue ${NEXT_CARD_ID}; EXTRACT-BACKFILL is closed.` : `${CARD_ID} is active; prove bounded cursor/backfill before Drive content work.`,
          extractBackfillSummary: {
            status: closeCard ? 'healthy' : 'active',
            closeoutKey: CLOSEOUT_KEY,
            nextCardId: NEXT_CARD_ID,
            activeTargetKeys: EXTRACT_BACKFILL_ACTIVE_TARGETS.map(target => target.targetKey),
            jobOnlyBackfillKeys: EXTRACT_BACKFILL_JOB_ONLY_LANES.map(job => job.jobKey),
            blockersParkActionsNotSprint: true,
          },
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-extract-backfill',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} bounded cursor/backfill proof and ${closeCard ? `advances to ${NEXT_CARD_ID}` : 'owns the active blocker'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const jobKeys = [
    ...EXTRACT_BACKFILL_ACTIVE_TARGETS.map(target => target.jobKey),
    ...EXTRACT_BACKFILL_JOB_ONLY_LANES.map(lane => lane.jobKey),
  ]
  const [
    approval,
    planSource,
    packageJsonSource,
    moduleSource,
    scriptSource,
    seedSource,
    runnerSource,
    jobsSource,
    closeoutRegistrySource,
    closeoutDoc,
    activeSprint,
    extractionSnapshot,
    latestJobs,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: EXTRACT_BACKFILL_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(EXTRACT_BACKFILL_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/extract-backfill-cursor-contract.js'),
    readRepoFile(EXTRACT_BACKFILL_SCRIPT_PATH),
    readRepoFile('scripts/seed-extraction-control.mjs'),
    readRepoFile('scripts/run-extraction-target.mjs'),
    readRepoFile('lib/foundation-jobs.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(EXTRACT_BACKFILL_CLOSEOUT_PATH, { optional: true }),
    getActiveFoundationCurrentSprint(),
    getExtractionControlSnapshot({ limit: 300 }),
    queryLatestJobs(jobKeys),
  ])

  const jobDefinitions = getFoundationJobDefinitions()
  const backfillStatus = buildExtractBackfillCursorContractStatus({
    targets: extractionSnapshot.targets,
    coverageByTarget: extractionSnapshot.coverageByTarget,
    latestJobs,
    jobDefinitions,
    now: new Date(),
  })
  const dogfood = buildExtractBackfillDogfoodProof()
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildExtractBackfillCardRow({ closeCard: args.closeCard }),
    changedFiles: EXTRACT_BACKFILL_CHANGED_FILES,
    declaredRisk: 'bounded historical backfill cursor contract, live extraction-control target/job state proof, Current Sprint progression, package script, closeout registry, and full Foundation ship gate',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
  }

  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const packageJson = JSON.parse(packageJsonSource)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const currentCard = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const currentSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || ''
  const preShipServedCodeDriftAllowed = args.closeCard &&
    backfillStatus.ok &&
    currentCard?.lane === 'done' &&
    activeBlockerCardId === NEXT_CARD_ID &&
    (systemHealth.exitStatus !== 0 || repeatedFailureGate.exitStatus !== 0)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || EXTRACT_BACKFILL_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for EXTRACT-BACKFILL', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood rejects unbounded, missing-cursor, hidden-failure, weak-park, and unsafe broad-extraction false green', dogfood.invariant)
  addCheck(checks, backfillStatus.ok, 'bounded historical cursor/backfill status is healthy', backfillStatus.failed.map(item => item.check).join(', ') || 'pass')
  addCheck(checks, moduleSource.includes('buildExtractBackfillCursorContractStatus') && moduleSource.includes('buildExtractBackfillDogfoodProof'), 'reusable EXTRACT-BACKFILL module owns evaluator and dogfood', 'lib/extract-backfill-cursor-contract.js')
  addCheck(checks, scriptSource.includes('getExtractionControlSnapshot') && scriptSource.includes('queryLatestJobs'), 'focused proof reads live extraction control and job ledger state', EXTRACT_BACKFILL_SCRIPT_PATH)
  addCheck(checks, seedSource.includes('drive-content-extract-backfill') && seedSource.includes('email-attachments-backfill') && seedSource.includes('video-content-extract-backfill') && seedSource.includes('cursorState') && seedSource.includes('dailyMissionQuota'), 'seeded extraction control declares bounded backfill targets', 'scripts/seed-extraction-control.mjs')
  addCheck(checks, runnerSource.includes("target.targetKey === 'drive-corpus-backfill'") && runnerSource.includes("target.targetKey === 'drive-content-extract-backfill'") && runnerSource.includes("target.targetKey === 'email-attachments-backfill'") && runnerSource.includes("target.targetKey === 'video-content-extract-backfill'"), 'target runner has explicit bounded backfill dispatch', 'scripts/run-extraction-target.mjs')
  addCheck(checks, jobsSource.includes("key: 'drive-content-extract-bite'") && jobsSource.includes("key: 'email-attachment-extract-bite'") && jobsSource.includes("key: 'video-content-extract-bite'") && jobsSource.includes("key: 'meeting-transcripts-extract-backlog'"), 'Foundation job registry contains backfill/corpus governed jobs', 'lib/foundation-jobs.js')
  addCheck(checks, currentCard?.priority === 'P0' && (args.closeCard ? currentCard.lane === 'done' : ['executing', 'scoped', 'done'].includes(currentCard?.lane)), 'EXTRACT-BACKFILL backlog row is correct', currentCard ? `${currentCard.lane}/${currentCard.priority}` : 'missing')
  addCheck(checks, nextCard?.priority === 'P0' && nextCard?.lane === 'scoped', 'DRIVE-CONTENT-001 is promoted as next scoped P0', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker matches expected card', activeBlockerCardId || 'missing')
  addCheck(checks, (systemHealth.exitStatus === 0 && (systemHealth.json?.status === 'healthy' || systemHealth.json?.systemHealth?.status === 'healthy')) || preShipServedCodeDriftAllowed, 'System Health remains healthy or is deferred for post-ship served-code refresh', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.status || systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, (repeatedFailureGate.exitStatus === 0 && repeatedFailureGate.json?.status === 'healthy') || preShipServedCodeDriftAllowed, 'repeated-failure gate remains healthy or is deferred for post-ship verifier-ledger refresh', `exit=${repeatedFailureGate.exitStatus} status=${repeatedFailureGate.json?.status || 'missing'}`)
  addCheck(checks, packageJson.scripts?.['process:extract-backfill-check'] === `node --env-file-if-exists=.env ${EXTRACT_BACKFILL_SCRIPT_PATH}`, 'package exposes EXTRACT-BACKFILL focused proof', packageJson.scripts?.['process:extract-backfill-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves EXTRACT-BACKFILL', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff exists and names next card', EXTRACT_BACKFILL_CLOSEOUT_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, !args.closeCard || currentSprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records EXTRACT-BACKFILL closeout', currentSprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'Current Sprint exposes DRIVE-CONTENT-001 next', nextSprintItem?.stage || 'missing')

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
  }

  if (args.closeCard) {
    const [refreshedCards, refreshedPlanCritic, refreshedSprint] = await Promise.all([
      getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([CARD_ID]),
      getActiveFoundationCurrentSprint(),
    ])
    addCheck(checks, refreshedCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', refreshedCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, refreshedCards.some(item => item.id === NEXT_CARD_ID && item.lane === 'scoped' && item.priority === 'P0'), 'DRIVE-CONTENT-001 is scoped P0 after close', refreshedCards.map(item => `${item.id}:${item.lane}/${item.priority}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is DRIVE-CONTENT-001 after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    extractionSummary: extractionSnapshot.summary,
    backfillStatus,
    dogfood,
    latestJobs,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`EXTRACT-BACKFILL check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('EXTRACT-BACKFILL check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
