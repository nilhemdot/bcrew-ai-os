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
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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

const ACTOR = 'youtube-current-sprint-workspace-cleanup'
const CARD_ID = 'YOUTUBE-CURRENT-SPRINT-WORKSPACE-CLEANUP-001'
const CLOSEOUT_KEY = 'youtube-current-sprint-workspace-cleanup-v1'
const SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
const ACTIVE_CARD_ID = 'YOUTUBE-CREATOR-DAILY-WATCH-001'
const PLAN_PATH = 'docs/process/youtube-current-sprint-workspace-cleanup-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-CURRENT-SPRINT-WORKSPACE-CLEANUP-001.json'
const CLOSEOUT_PATH = 'docs/handoffs/2026-05-21-youtube-current-sprint-workspace-cleanup-closeout.md'
const SCRIPT_PATH = 'scripts/process-youtube-current-sprint-workspace-cleanup-check.mjs'
const CURRENT_PLAN_PATH = 'docs/rebuild/current-plan.md'
const CURRENT_STATE_PATH = 'docs/rebuild/current-state.md'
const PRIMARY_SPRINT_PLAN_REF = CURRENT_PLAN_PATH
const PROCESS_SPRINT_PLAN_REF = 'docs/process/youtube-dev-team-intelligence-sprint-plan-001-plan.md'
const DAILY_WATCH_CORRECTION_PLAN_REF = 'docs/process/youtube-creator-daily-watch-sprint-update-001-plan.md'

const EXPECTED_ACTIVE_IDS = [
  'YOUTUBE-CREATOR-DAILY-WATCH-001',
  'DEV-TEAM-HUB-V0-001',
  'YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002',
  'EXTRACTOR-OVERNIGHT-RUN-GUARD-001',
  'MARK-KASHEF-LAST-50-BASELINE-001',
  'YOUTUBE-LATEST-20-INTEL-RUN-001',
  'DEV-TEAM-INTELLIGENCE-DIRECTOR-001',
  'BUILD-OPPORTUNITY-PROMOTION-GATE-001',
  'BUILD-INTEL-EXTRACTION-IMPLEMENTATION',
]

const HISTORICAL_DONE_IDS = [
  'FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001',
  'FOUNDATION-GATE-CHECK-SERIALIZATION-001',
  'BRAIN-FLEET-FOUNDATION-001',
  'HARLAN-AUTH-ESCALATION-LOOP-001',
  'BRAIN-FLEET-QUOTA-LEDGER-001',
  'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001',
  'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001',
  'GEMINI-VIDEO-BRAIN-ROUTE-001',
  'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001',
  'OPENCLAW-ADAPTER-BOUNDARY-001',
  'EXTRACTOR-BRAIN-FLEET-PROOF-001',
  'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001',
  'WEB-GODMODE-LIVE-OPERATOR-002',
  'YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002',
  'YOUTUBE-DEV-TEAM-SPRINT-PLAN-001',
  'YOUTUBE-CREATOR-DAILY-WATCH-SPRINT-UPDATE-001',
]

const PARKED_OUTSIDE_SPRINT = [
  ...HISTORICAL_DONE_IDS,
  'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001',
  'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
  'STRATEGY-003',
  'AGENT-BRAIN-FOUNDATION-SEPARATION-001',
]

const CHANGED_FILES = [
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
  'scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs',
  'public/foundation-operations-renderers.js',
  CURRENT_PLAN_PATH,
  CURRENT_STATE_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

const EXIT_CRITERIA = [
  'Current Sprint shows only the active YouTube To Dev Team Intelligence V1 cards.',
  'Old shipped Foundation/Brain Fleet/scout cards live in Backlog done and Recent Work, not Done This Sprint.',
  'Sprint plan link is visible in the Current Sprint panel in Recent Work.',
  'Active blocker remains YOUTUBE-CREATOR-DAILY-WATCH-001.',
  'Daily public creator watch is built before deeper extraction.',
  'No private/paid/auth/external-source work is approved by this sprint cleanup.',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({
      argv,
      allowedFlags: [
        PROCESS_CHECK_WRITE_FLAGS.apply,
        PROCESS_CHECK_WRITE_FLAGS.closeCard,
        PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
      ],
    }),
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function git(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function upsertPlanCriticRun(planReview) {
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
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0',$7,true,$8::text[],$9::jsonb,$10::jsonb,$11)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            requested_by = EXCLUDED.requested_by,
            created_at = NOW()
      `,
      [
        `youtube-current-sprint-workspace-cleanup-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        planReview.gateDecision?.level || 'full',
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: CARD_ID,
          closeoutKey: CLOSEOUT_KEY,
          summary: buildPlanCriticResultSummary(planReview),
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function upsertCleanupBacklogRow() {
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
        VALUES ($1,$2,'foundation','done','P0',1,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            team = EXCLUDED.team,
            lane = 'done',
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
      [
        CARD_ID,
        'Clean current sprint workspace for YouTube Dev Team sprint',
        'Steve May 21 correction: old done sprint rows should leave the new sprint board and the sprint plan should be visible in Recent Work.',
        'Reset the active Current Sprint overlay to the nine active YouTube sprint cards only, keeping old shipped cards in Backlog done and Recent Work.',
        'A clean sprint board lets Steve and Builders see the actual plan without mistaking prior shipped work for current sprint progress.',
        `Done under ${CLOSEOUT_KEY}. Continue ${ACTIVE_CARD_ID}.`,
        `Closed 2026-05-21 under ${CLOSEOUT_KEY}; old done sprint rows were cleared from the active sprint overlay, the sprint plan reference is visible in Current Sprint metadata/UI, and ${ACTIVE_CARD_ID} remains active. See ${CLOSEOUT_PATH}.`,
        'Orchestrator',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ('backlog_updated','backlog_items',$1,$2,$3,$4::jsonb)
      `,
      [
        CARD_ID,
        ACTOR,
        `Closed ${CARD_ID} under ${CLOSEOUT_KEY}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, sprintId: SPRINT_ID }),
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

function cleanSprintItem(item = {}, index = 0, currentHead = '') {
  return {
    ...item,
    order: index + 1,
    stage: item.stage === 'building_now' || item.stage === 'sprint_ready' || item.stage === 'returned'
      ? item.stage
      : 'scoping',
    metadata: {
      ...(item.metadata || {}),
      sprintPlanRef: PRIMARY_SPRINT_PLAN_REF,
      sprintProcessPlanRef: PROCESS_SPRINT_PLAN_REF,
      sprintCorrectionPlanRef: DAILY_WATCH_CORRECTION_PLAN_REF,
      cleanSprintOverlay: true,
      oldDoneMovedToRecentWork: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

async function applyLiveState({ planReview }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'clear historical done rows from Current Sprint and expose sprint plan metadata',
    allowedFlags: [
      PROCESS_CHECK_WRITE_FLAGS.apply,
      PROCESS_CHECK_WRITE_FLAGS.closeCard,
      PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
    ],
  })

  const previous = await getActiveFoundationCurrentSprint()
  const currentHead = git(['rev-parse', 'HEAD'])
  const byId = new Map((previous.items || []).map(item => [item.cardId, item]))
  const missing = EXPECTED_ACTIVE_IDS.filter(id => !byId.has(id))
  if (missing.length) {
    throw new Error(`Cannot clean sprint; missing active sprint item(s): ${missing.join(', ')}`)
  }

  await upsertCleanupBacklogRow()
  await upsertPlanCriticRun(planReview)

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'YouTube To Dev Team Intelligence V1: daily public creator watch, Mark last-50 baseline, Dev Team Hub, Director output, and approval-gated build promotion.',
        activeBlockerCardId: ACTIVE_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          sprintWorkspaceCleanupCardId: CARD_ID,
          sprintPlanRef: PRIMARY_SPRINT_PLAN_REF,
          sprintProcessPlanRef: PROCESS_SPRINT_PLAN_REF,
          sprintCorrectionPlanRef: DAILY_WATCH_CORRECTION_PLAN_REF,
          sprintPlanCloseoutKey: 'youtube-dev-team-intelligence-sprint-plan-v1',
          sprintCorrectionCloseoutKey: 'youtube-creator-daily-watch-sprint-update-v1',
          currentStatus: 'youtube_sprint_workspace_clean',
          executiveSummary: 'Current sprint is clean: old shipped cards live in Backlog done and Recent Work; this board shows only the YouTube To Dev Team Intelligence V1 execution cards.',
          nextAction: `${ACTIVE_CARD_ID}: build scheduled public creator watch with Mark last-50 and other creator last-20 baseline rules.`,
          activeBlockerCardId: ACTIVE_CARD_ID,
          runOrder: EXPECTED_ACTIVE_IDS,
          previousDoneRowsMovedToRecentWork: HISTORICAL_DONE_IDS,
          parkedOutsideSprint: PARKED_OUTSIDE_SPRINT,
          exitCriteria: EXIT_CRITERIA,
          cleanSprintOverlay: true,
          doneThisSprintClearedForNewSprint: true,
          oldDoneMovedToRecentWork: true,
          dailyWatchRequired: true,
          markKashefBaselineDepth: 50,
          defaultCreatorBaselineDepth: 20,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
          noAutoBacklogCards: true,
          publicYoutubeFirst: true,
          strategyPeopleParked: true,
          approvalPolicy: 'Approval-bound private/external actions park the exact source item and continue safe sprint work; daily watch may inspect public no-auth metadata only; deeper extraction and external/private follows stay approval-bound.',
        },
      },
      items: EXPECTED_ACTIVE_IDS.map((id, index) => cleanSprintItem(byId.get(id), index, currentHead)),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve corrected that a new sprint must not carry old Done This Sprint rows, and the sprint plan must be visible in the Current Sprint workspace.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []

  await initFoundationDb()
  try {
    const [
      approval,
      planText,
      packageJsonText,
      scriptSource,
      priorSprintWriterSource,
      rendererSource,
      closeoutRegistrySource,
      coverageSource,
      currentPlanSource,
      currentStateSource,
      closeoutSource,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
      readRepoFile(PLAN_PATH),
      readRepoFile('package.json'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs'),
      readRepoFile('public/foundation-operations-renderers.js'),
      readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile(CURRENT_PLAN_PATH),
      readRepoFile(CURRENT_STATE_PATH),
      readRepoFile(CLOSEOUT_PATH),
    ])

    const planReview = evaluatePlanCriticPlan({
      planText,
      card: { id: CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'Live Current Sprint overlay mutation, active sprint UI, control-plane docs, closeout registry, verifier coverage, and operator sprint command clarity.',
      repoRoot,
    })

    if (args.apply) {
      if (!approval.ok || Number(approval.approval?.score) < PLAN_CRITIC_MIN_PASS_SCORE) {
        throw new Error(`Approval is not valid for ${CARD_ID}.`)
      }
      if (planReview.status !== 'pass' || Number(planReview.score) < PLAN_CRITIC_MIN_PASS_SCORE) {
        throw new Error(`Plan Critic did not pass: ${buildPlanCriticResultSummary(planReview)}`)
      }
      await applyLiveState({ planReview })
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const sprintIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
    const cards = await getBacklogItemsByIds([CARD_ID, ...EXPECTED_ACTIVE_IDS, ...PARKED_OUTSIDE_SPRINT])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID])
    const cardMap = new Map(cards.map(card => [card.id, card]))
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
    const packageJson = JSON.parse(packageJsonText)
    const doneRows = (activeSprint.items || []).filter(item => item.stage === 'done_this_sprint')
    const activeOrder = (activeSprint.items || [])
      .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
      .map(item => item.cardId)
    const activeItem = (activeSprint.items || []).find(item => item.cardId === ACTIVE_CARD_ID) || null
    const metadata = activeSprint.sprint?.metadata || {}

    addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for sprint workspace cleanup', buildPlanCriticResultSummary(planReview))
    addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, cardMap.get(CARD_ID)?.lane === 'done', 'cleanup backlog card is done', cardMap.get(CARD_ID) ? `${cardMap.get(CARD_ID).id}:${cardMap.get(CARD_ID).lane}` : 'missing')
    addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID, 'live Current Sprint uses YouTube sprint id', activeSprint.sprint?.sprintId || 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === ACTIVE_CARD_ID, 'active blocker remains daily creator watch', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, JSON.stringify(activeOrder) === JSON.stringify(EXPECTED_ACTIVE_IDS), 'sprint contains exact clean active order', activeOrder.join(', '))
    addCheck(checks, doneRows.length === 0, 'Done This Sprint is empty for the new sprint workspace', doneRows.map(item => item.cardId).join(', ') || 'empty')
    addCheck(checks, HISTORICAL_DONE_IDS.every(id => !sprintIds.includes(id)), 'historical done cards are outside the active sprint overlay', HISTORICAL_DONE_IDS.filter(id => sprintIds.includes(id)).join(', ') || 'cleared')
    addCheck(checks, EXPECTED_ACTIVE_IDS.every(id => cardMap.has(id)), 'all active sprint cards exist in live backlog', EXPECTED_ACTIVE_IDS.filter(id => !cardMap.has(id)).join(', ') || 'present')
    addCheck(checks, PARKED_OUTSIDE_SPRINT.every(id => cardMap.has(id)) && PARKED_OUTSIDE_SPRINT.every(id => !sprintIds.includes(id)), 'old and parked cards remain live but outside sprint', PARKED_OUTSIDE_SPRINT.filter(id => sprintIds.includes(id) || !cardMap.has(id)).join(', ') || 'parked')
    addCheck(checks, activeItem?.order === 1 && activeItem?.stage === 'scoping', 'daily watch is first scoped item', activeItem ? `${activeItem.order}/${activeItem.stage}` : 'missing')
    addCheck(checks, (activeSprint.items || []).every(item => item.definitionOfDone && item.proofCommands?.length && item.notNextBoundaries?.length && item.existingWorkCheck), 'every active sprint item keeps doctrine/proof fields', (activeSprint.items || []).filter(item => !(item.definitionOfDone && item.proofCommands?.length && item.notNextBoundaries?.length && item.existingWorkCheck)).map(item => item.cardId).join(', ') || 'complete')
    addCheck(checks, metadata.sprintPlanRef === PRIMARY_SPRINT_PLAN_REF && metadata.sprintProcessPlanRef === PROCESS_SPRINT_PLAN_REF && metadata.sprintCorrectionPlanRef === DAILY_WATCH_CORRECTION_PLAN_REF, 'sprint metadata carries plan refs', JSON.stringify({ sprintPlanRef: metadata.sprintPlanRef, sprintProcessPlanRef: metadata.sprintProcessPlanRef, sprintCorrectionPlanRef: metadata.sprintCorrectionPlanRef }))
    addCheck(checks, metadata.doneThisSprintClearedForNewSprint === true && metadata.oldDoneMovedToRecentWork === true, 'sprint metadata records done-row cleanup posture', JSON.stringify({ doneThisSprintClearedForNewSprint: metadata.doneThisSprintClearedForNewSprint, oldDoneMovedToRecentWork: metadata.oldDoneMovedToRecentWork }))
    addCheck(checks, !priorSprintWriterSource.includes('const existingDone =') && !priorSprintWriterSource.includes('...existingDone'), 'prior daily-watch sprint writer no longer preserves old done rows', 'scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs')
    addCheck(checks, rendererSource.includes('Sprint plan') && rendererSource.includes('sprintPlanRef') && rendererSource.includes('/doc?path='), 'Recent Work Current Sprint panel renders sprint plan link', 'public/foundation-operations-renderers.js')
    addCheck(checks, packageJson.scripts?.['process:youtube-current-sprint-workspace-cleanup-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused cleanup proof', packageJson.scripts?.['process:youtube-current-sprint-workspace-cleanup-check'] || 'missing')
    addCheck(checks, scriptSource.includes('doneThisSprintClearedForNewSprint') && scriptSource.includes('EXPECTED_ACTIVE_IDS'), 'focused script owns cleanup behavior', SCRIPT_PATH)
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves sprint workspace cleanup', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes cleanup card', CARD_ID)
    addCheck(checks, currentPlanSource.includes(CARD_ID) && currentPlanSource.includes('Done This Sprint') && currentPlanSource.includes('old shipped cards'), 'current plan documents clean sprint workspace', CURRENT_PLAN_PATH)
    addCheck(checks, currentStateSource.includes(CARD_ID) && currentStateSource.includes('Done This Sprint') && currentStateSource.includes('old shipped cards'), 'current state documents clean sprint workspace', CURRENT_STATE_PATH)
    addCheck(checks, closeoutSource.includes(CLOSEOUT_KEY) && closeoutSource.includes(PRIMARY_SPRINT_PLAN_REF), 'closeout handoff records sprint plan reference', CLOSEOUT_PATH)

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      sprintId: SPRINT_ID,
      activeBlocker: activeSprint.sprint?.activeBlockerCardId || '',
      activeOrder,
      doneThisSprintCount: doneRows.length,
      checks,
      failed,
    }

    if (args.json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`YouTube current sprint workspace cleanup proof: ${result.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('YouTube current sprint workspace cleanup proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
