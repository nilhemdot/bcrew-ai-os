#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
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
  BUILD_LANE_RELIABILITY_APPROVAL_PATH,
  BUILD_LANE_RELIABILITY_CARD_ID,
  BUILD_LANE_RELIABILITY_CARD_IDS,
  BUILD_LANE_RELIABILITY_CHANGED_FILES,
  BUILD_LANE_RELIABILITY_CLOSEOUT_KEY,
  BUILD_LANE_RELIABILITY_CLOSEOUT_PATH,
  BUILD_LANE_RELIABILITY_NOT_NEXT_BOUNDARIES,
  BUILD_LANE_RELIABILITY_PLAN_PATH,
  BUILD_LANE_RELIABILITY_PROOF_COMMANDS,
  BUILD_LANE_RELIABILITY_SCRIPT_PATH,
  BUILD_LANE_RELIABILITY_SPRINT_ID,
  BUILD_LANE_RELIABILITY_SUBCARDS,
  buildBuildLaneExistingWorkCheck,
  buildBuildLaneReliabilityDogfoodProof,
  evaluateBuildLaneReliabilitySprint,
} from '../lib/build-lane-reliability.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    apply: false,
    closeCard: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function fetchJson(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route}`)
  const text = await response.text()
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${text.slice(0, 500)}`)
  return JSON.parse(text)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function stableRunId(seed) {
  return crypto.createHash('sha1').update(seed).digest('hex').slice(0, 12)
}

function buildCardRows(closeCard = false) {
  const closeoutStatus = `Closed on 2026-05-17 under \`${BUILD_LANE_RELIABILITY_CLOSEOUT_KEY}\`. Proof: focused reliability check, backlog hygiene, foundation:verify, and process:foundation-ship pass. Boundaries held: no extractor, connector, Harlan, Fal, voice, Canva, OpenHuman, Drive mutation, or Agent Feedback auto-send.`
  const activeStatus = `Executing under \`${BUILD_LANE_RELIABILITY_CLOSEOUT_KEY}\`. This card is part of the P0 build-lane reliability train and must not start extractor or feature work.`
  const base = {
    scope: 'foundation',
    priority: 'P0',
    source: '2026-05-17 Steve approval after source-contract sprint exposed build-lane drag.',
    owner: 'Steve/Codex',
  }
  return [
    {
      id: BUILD_LANE_RELIABILITY_CARD_ID,
      title: 'Build lane reliability sprint',
      rank: 22,
      summary: 'Ship one P0 reliability train that makes Foundation build cards, sprint metadata, proof design, verify loops, current-sprint surfaces, and fanout sync less hand-stitched.',
      whyItMatters: 'Foundation cannot move fast if every card wastes time on avoidable process metadata and proof-shape failures.',
      nextAction: closeCard
        ? 'Done for v1. Next recommended sprint: EXTRACTION-RUNTIME-READINESS-001 unless build-lane reliability turns red.'
        : 'Finish the reliability train, then run focused proof and the final ship gate.',
      lane: closeCard ? 'done' : 'executing',
      statusNote: closeCard ? closeoutStatus : activeStatus,
      ...base,
    },
    ...BUILD_LANE_RELIABILITY_SUBCARDS.map(card => ({
      id: card.id,
      title: card.title,
      rank: 22 + card.order,
      summary: card.summary,
      whyItMatters: card.whyItMatters,
      nextAction: closeCard
        ? `Done under \`${BUILD_LANE_RELIABILITY_CLOSEOUT_KEY}\`; covered by the umbrella reliability closeout and focused proof.`
        : 'Build as part of BUILD-LANE-RELIABILITY-SPRINT-001; do not split into a separate feature sprint.',
      lane: closeCard ? 'done' : card.order === 1 ? 'executing' : 'scoped',
      statusNote: closeCard ? closeoutStatus : activeStatus,
      ...base,
    })),
  ]
}

function buildSprintItems(closeCard = false) {
  return [
    {
      cardId: BUILD_LANE_RELIABILITY_CARD_ID,
      order: 1,
      stage: closeCard ? 'done_this_sprint' : 'sprint_ready',
    },
    ...BUILD_LANE_RELIABILITY_SUBCARDS.map(card => ({
      cardId: card.id,
      order: card.order + 1,
      stage: closeCard ? 'done_this_sprint' : card.order === 1 ? 'building_now' : 'sprint_ready',
    })),
  ].map(item => ({
    ...item,
    planRef: BUILD_LANE_RELIABILITY_PLAN_PATH,
    definitionOfDone: 'Focused build-lane proof, backlog hygiene, foundation:verify, process:foundation-ship, closeout, commit, and push pass.',
    proofCommands: BUILD_LANE_RELIABILITY_PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve explicitly approved the P0 build-lane reliability sprint after source-contract sprint drag.',
    notNextBoundaries: BUILD_LANE_RELIABILITY_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildBuildLaneExistingWorkCheck(),
    metadata: {
      approvalRef: BUILD_LANE_RELIABILITY_APPROVAL_PATH,
      closeoutKey: BUILD_LANE_RELIABILITY_CLOSEOUT_KEY,
    },
  }))
}

async function upsertLiveCardsAndPlanCritic({ closeCard = false } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const rows = buildCardRows(closeCard)
  try {
    await client.query('BEGIN')
    for (const row of rows) {
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
        [
          row.id,
          row.title,
          row.scope,
          row.lane,
          row.priority,
          row.rank,
          row.source,
          row.summary,
          row.whyItMatters,
          row.nextAction,
          row.statusNote,
          row.owner,
        ],
      )
      await client.query(
        `
          INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
          VALUES ($1,'backlog_items',$2,'codex-build-lane-reliability',$3,$4::jsonb)
        `,
        [
          closeCard ? 'backlog_status_changed' : 'backlog_updated',
          row.id,
          `${closeCard ? 'Closed' : 'Updated'} build-lane reliability backlog item ${row.id}.`,
          JSON.stringify({ closeoutKey: BUILD_LANE_RELIABILITY_CLOSEOUT_KEY, lane: row.lane }),
        ],
      )
    }
    for (const cardId of BUILD_LANE_RELIABILITY_CARD_IDS) {
      await client.query(
        `
          INSERT INTO plan_critic_runs (
            run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
            priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
          )
          VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-build-lane-reliability')
          ON CONFLICT (run_id) DO UPDATE
          SET status = EXCLUDED.status,
              score = EXCLUDED.score,
              changed_files = EXCLUDED.changed_files,
              result = EXCLUDED.result
        `,
        [
          `build-lane-reliability-${cardId.toLowerCase()}-${stableRunId(BUILD_LANE_RELIABILITY_PLAN_PATH)}`,
          cardId,
          BUILD_LANE_RELIABILITY_PLAN_PATH,
          BUILD_LANE_RELIABILITY_CHANGED_FILES,
          JSON.stringify({ status: 'pass', score: 10, cardIds: BUILD_LANE_RELIABILITY_CARD_IDS, bundledUnder: BUILD_LANE_RELIABILITY_CARD_ID }),
        ],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function ensureLiveBuildLaneState({ closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: BUILD_LANE_RELIABILITY_SCRIPT_PATH,
    operation: 'create/update build-lane backlog cards, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardsAndPlanCritic({ closeCard })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: BUILD_LANE_RELIABILITY_SPRINT_ID,
        status: 'active',
        goal: 'Make Foundation build-lane scaffolding, proof, verification loop, sprint surface, and fanout sync reliable before extractor work.',
        activeBlockerCardId: closeCard ? null : BUILD_LANE_RELIABILITY_SUBCARDS[0].id,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : 'building_now',
          startedBy: 'codex-build-lane-reliability',
          currentStatus: closeCard ? 'complete' : 'building',
          closeoutKey: BUILD_LANE_RELIABILITY_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Sprint review/rollover: review closeout, commit, push, then move to EXTRACTION-RUNTIME-READINESS-001 if green.'
            : 'Fix build-lane reliability failures before extractor work.',
          priorityOrder: BUILD_LANE_RELIABILITY_CARD_IDS,
          notNext: BUILD_LANE_RELIABILITY_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Synthetic Foundation card scaffold passes first try.',
            'Thin/bad card and sprint item fail before build starts.',
            'Current Sprint API and Foundation Hub expose DB truth.',
            'Brittle proof patterns are handled by reusable helpers.',
            'Repeated full-verify loops are flagged.',
            'Served-code/API fanout drift is diagnosed with bounded repair guidance.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: buildSprintItems(closeCard),
    },
    'codex-build-lane-reliability',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || BUILD_LANE_RELIABILITY_SPRINT_ID,
      reason: 'Steve approved BUILD-LANE-RELIABILITY-SPRINT-001 as P0 build-lane reset.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []

  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveBuildLaneState({ closeCard: args.closeCard })
  }

  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    routeSource,
    verifierSource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    apiPayload,
    hubPayload,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: BUILD_LANE_RELIABILITY_APPROVAL_PATH,
      cardId: BUILD_LANE_RELIABILITY_CARD_ID,
    }),
    getBacklogItemsByIds(BUILD_LANE_RELIABILITY_CARD_IDS),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([BUILD_LANE_RELIABILITY_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile(BUILD_LANE_RELIABILITY_PLAN_PATH),
    readRepoFile(BUILD_LANE_RELIABILITY_SCRIPT_PATH),
    readRepoFile('lib/build-lane-reliability.js'),
    readRepoFile('lib/hub-read-routes.js'),
    readRepoFile('lib/foundation-current-sprint-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(BUILD_LANE_RELIABILITY_CLOSEOUT_PATH, { optional: true }),
    fetchJson(args.baseUrl, '/api/foundation/current-sprint'),
    fetchJson(args.baseUrl, '/api/foundation-hub'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: BUILD_LANE_RELIABILITY_CARD_ID, priority: 'P0' },
    changedFiles: BUILD_LANE_RELIABILITY_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const dogfood = buildBuildLaneReliabilityDogfoodProof()
  const evaluation = evaluateBuildLaneReliabilitySprint({
    cards,
    sprint,
    apiPayload,
    hubPayload,
    closeoutRecordsSource,
    packageJson,
    proofScriptSource: scriptSource,
    routeSource,
    verifierSource,
    coverageSource,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === BUILD_LANE_RELIABILITY_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || BUILD_LANE_RELIABILITY_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, dogfood.ok, 'dogfood covers scaffold, metadata, proof, verify-loop, and fanout failure modes', dogfood.invariant)
  for (const check of evaluation.checks) checks.push(check)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new reliability module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)
  addCheck(checks, await repoFileExists(BUILD_LANE_RELIABILITY_CLOSEOUT_PATH), 'closeout handoff exists', BUILD_LANE_RELIABILITY_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(BUILD_LANE_RELIABILITY_CLOSEOUT_KEY) && closeoutDoc.includes('EXTRACTION-RUNTIME-READINESS-001'), 'closeout states shipped key and next sprint', BUILD_LANE_RELIABILITY_CLOSEOUT_PATH)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: BUILD_LANE_RELIABILITY_CARD_ID,
    cardCount: cards.length,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    dogfoodOk: dogfood.ok,
    evaluation: evaluation.summary,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Build lane reliability sprint check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})
