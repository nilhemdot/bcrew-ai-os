#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
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
  MEMORY_005_APPROVAL_PATH,
  MEMORY_005_CARD_ID,
  MEMORY_005_CHANGED_FILES,
  MEMORY_005_CLOSEOUT_KEY,
  MEMORY_005_CLOSEOUT_PATH,
  MEMORY_005_NEXT_CARD_ID,
  MEMORY_005_NOT_NEXT_BOUNDARIES,
  MEMORY_005_PLAN_PATH,
  MEMORY_005_PROOF_COMMANDS,
  MEMORY_005_SCRIPT_PATH,
  buildMemory005DogfoodProof,
  evaluateMemory005Implementation,
  renderMemory005Closeout,
} from '../lib/memory-005-temporal-truth-model.js'
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
const ACTOR = 'codex-memory-005'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function ensureTextIncludes(value = '', required = '') {
  const text = String(value || '').trim()
  if (!required || text.includes(required)) return text
  return `${text}${text ? ' ' : ''}${required}`.trim()
}

function buildExistingWorkCheck() {
  return {
    reused: 'Reuses the existing decisions table/store, source-backed strategy snapshots, Operating Truths doctrine, Current Sprint, Plan Critic, backlog hygiene, repeated-failure gate, and ship gates.',
    readyAt: '2026-05-20T05:15:00-04:00',
    readyBy: 'Steve approved unattended Foundation continuation and ENGINE-001 advanced the sprint to MEMORY-005.',
    exactGap: 'Foundation had source-backed current values and decision supersession status, but no explicit temporal query model for what is true now versus historical or future truth.',
    notRebuilt: 'No Graphiti, vector memory rebuild, broad conversation import, Strategy Hub UI rebuild, automatic decision lock/apply, external write, provider call, or browser automation.',
    existingCode: [
      'lib/foundation-decision-store.js',
      'lib/foundation-db-schema-seed-store.js',
      'lib/foundation-db.js',
      'lib/foundation-strategy-source-snapshots.js',
      'lib/process-plan-critic.js',
    ],
    existingDocs: [
      'docs/strategy/operating-truths.md',
      'docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md',
      'docs/specs/data-source-maturity-model.md',
    ],
    existingPolicy: [
      'Live values belong in source systems and source-backed UI views, not markdown snapshots.',
      'Graphiti is deferred; temporal tracking starts through PostgreSQL/current-state query rules.',
      'Superseded truth remains evidence, not current doctrine.',
      'Blockers block unsafe actions, not the whole sprint when safe work remains.',
    ],
    overBroadRisk: 'MEMORY-005 can drift into rebuilding the whole memory layer. V1 only adds temporal schema/query semantics and proof.',
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: MEMORY_005_CARD_ID,
    title: 'Implement a temporal truth model for strategy and decisions',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 5,
    source: 'Foundation memory architecture / operating truth sprint',
    summary: 'Define and prove temporal truth semantics for strategy and decisions using validFrom, validUntil, supersededBy, and computed currentState query rules.',
    whyItMatters: 'The system needs to answer what is true now without deleting history or trusting stale notes.',
    nextAction: closeCard
      ? `Done under \`${MEMORY_005_CLOSEOUT_KEY}\`; continue \`${MEMORY_005_NEXT_CARD_ID}\`.`
      : 'Ship the temporal truth model and dogfood conflict proof before Strategy atoms.',
    statusNote: closeCard
      ? `Closed under \`${MEMORY_005_CLOSEOUT_KEY}\`; temporal truth fields/query helpers are live for decisions and strategy-shaped records.`
      : `Executing \`${MEMORY_005_CLOSEOUT_KEY}\`; no broad memory rebuild or external writes.`,
    owner: 'Foundation Data',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: MEMORY_005_NEXT_CARD_ID,
    title: existing.title || 'Business Atoms Framework',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 6,
    nextAction: ensureTextIncludes(existing.nextAction || '', `Run after ${MEMORY_005_CLOSEOUT_KEY}; use temporal truth rules so atoms distinguish current, historical, superseded, and future claims.`),
    statusNote: ensureTextIncludes(existing.statusNote || '', `Unblocked by ${MEMORY_005_CLOSEOUT_KEY}; next safe Foundation intelligence card.`),
    owner: existing.owner || 'Foundation Intelligence',
  }
}

async function upsertBacklogRows({ closeCard = false, nextCard = {} } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const row of [buildCardRow({ closeCard }), buildNextCardRow(nextCard)]) {
      await client.query(
        `
          INSERT INTO backlog_items (
            id, title, team, lane, priority, rank, source, summary,
            why_it_matters, next_action, status_note, owner
          )
          VALUES ($1,$2,'foundation',$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
        [row.id, row.title, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
      )
    }
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,$3,$4,$5::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        MEMORY_005_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${MEMORY_005_CARD_ID}.`,
        JSON.stringify({
          closeoutKey: MEMORY_005_CLOSEOUT_KEY,
          activeBlockerCardId: closeCard ? MEMORY_005_NEXT_CARD_ID : MEMORY_005_CARD_ID,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `memory-005-${stableRunId(MEMORY_005_PLAN_PATH)}`,
        MEMORY_005_CARD_ID,
        MEMORY_005_PLAN_PATH,
        planReview.status,
        planReview.score,
        MEMORY_005_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: MEMORY_005_CARD_ID,
          closeoutKey: MEMORY_005_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function buildSprintItem({
  existing = {},
  cardId,
  order,
  stage,
  planRef,
  definitionOfDone,
  proofCommands,
  nextAction,
  closeoutKey,
  approvalRef,
} = {}) {
  return {
    ...existing,
    cardId,
    order: Number(existing.order || existing.sprintOrder || order || 1),
    stage,
    planRef: planRef || existing.planRef || null,
    definitionOfDone: definitionOfDone || existing.definitionOfDone || '',
    proofCommands: proofCommands || existing.proofCommands || [],
    nextAction: nextAction || existing.nextAction || '',
    notNextBoundaries: Array.from(new Set([...(existing.notNextBoundaries || []), ...MEMORY_005_NOT_NEXT_BOUNDARIES])),
    existingWorkCheck: {
      ...(existing.existingWorkCheck || {}),
      ...buildExistingWorkCheck(),
    },
    metadata: {
      ...(existing.metadata || {}),
      closeoutKey,
      approvalRef,
    },
  }
}

async function upsertCurrentSprint({ closeCard = false, activeSprint = {} } = {}) {
  const sprintRecord = activeSprint?.sprint || activeSprint || {}
  const sprintItems = activeSprint?.items || sprintRecord?.items || []
  const existingById = new Map(sprintItems.map(item => [item.cardId, item]))
  const merged = sprintItems.map(item => ({ ...item }))
  const cardIndex = merged.findIndex(item => item.cardId === MEMORY_005_CARD_ID)
  const currentItem = existingById.get(MEMORY_005_CARD_ID) || {}
  const currentOrder = currentItem.order || currentItem.sprintOrder || 5
  const updatedCurrent = buildSprintItem({
    existing: currentItem,
    cardId: MEMORY_005_CARD_ID,
    order: currentOrder,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: MEMORY_005_PLAN_PATH,
    definitionOfDone: 'Temporal truth contract exists for decisions and strategy records; decision DB/store temporal fields are live; dogfood rejects overlapping current truth, missing provenance, invalid windows, and future/superseded false-current states; all ship gates pass.',
    proofCommands: MEMORY_005_PROOF_COMMANDS,
    nextAction: closeCard ? `Continue ${MEMORY_005_NEXT_CARD_ID}.` : 'Close MEMORY-005 before STRATEGY-001.',
    closeoutKey: MEMORY_005_CLOSEOUT_KEY,
    approvalRef: MEMORY_005_APPROVAL_PATH,
  })
  if (cardIndex >= 0) merged[cardIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  const nextIndex = merged.findIndex(item => item.cardId === MEMORY_005_NEXT_CARD_ID)
  if (nextIndex >= 0) {
    merged[nextIndex] = {
      ...merged[nextIndex],
      stage: closeCard && merged[nextIndex].stage !== 'done_this_sprint' ? 'scoping' : merged[nextIndex].stage,
      nextAction: ensureTextIncludes(merged[nextIndex].nextAction || '', closeCard ? `Continue after ${MEMORY_005_CLOSEOUT_KEY}.` : 'Wait for MEMORY-005 closeout.'),
    }
  }
  merged.sort((a, b) => Number(a.order || a.sprintOrder || 0) - Number(b.order || b.sprintOrder || 0))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
        status: 'active',
        goal: sprintRecord?.goal || 'Continue unattended Foundation work from source-truth into data health and operating control.',
        activeBlockerCardId: closeCard ? MEMORY_005_NEXT_CARD_ID : MEMORY_005_CARD_ID,
        metadata: {
          ...(sprintRecord?.metadata || {}),
          currentStatus: closeCard ? 'strategy_001_scoping' : 'memory_005_active',
          lastClosedCardId: closeCard ? MEMORY_005_CARD_ID : sprintRecord?.metadata?.lastClosedCardId,
          lastCloseoutKey: closeCard ? MEMORY_005_CLOSEOUT_KEY : sprintRecord?.metadata?.lastCloseoutKey,
        },
      },
      items: merged,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
      reason: `${MEMORY_005_CARD_ID} ${closeCard ? 'closes temporal truth model and advances to STRATEGY-001' : 'owns the active blocker'}.`,
    },
  )
}

async function getLiveDecisionTemporalSchema() {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const result = await client.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decisions'
          AND column_name IN ('valid_from', 'valid_until', 'superseded_by')
        ORDER BY column_name
      `,
    )
    return {
      ok: result.rows.length === 3,
      columns: result.rows.map(row => row.column_name),
    }
  } finally {
    client.release()
    await pool.end()
  }
}

async function writeCloseout({ evaluation = {}, dogfood = {}, liveSchema = {} }) {
  const closeout = renderMemory005Closeout({
    evaluation,
    dogfood,
    liveSchema,
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, MEMORY_005_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, MEMORY_005_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: MEMORY_005_SCRIPT_PATH,
      operation: 'close MEMORY-005 and advance Current Sprint',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
  }

  let dbInitialized = false
  try {
    const checks = []
    const [
      planSource,
      moduleSource,
      schemaSeedSource,
      foundationDbSource,
      decisionStoreSource,
      operatingTruthsSource,
      closeoutRegistrySource,
      coverageSource,
      packageJson,
      approvalValidation,
    ] = await Promise.all([
      readRepoFile(MEMORY_005_PLAN_PATH),
      readRepoFile('lib/memory-005-temporal-truth-model.js'),
      readRepoFile('lib/foundation-db-schema-seed-store.js'),
      readRepoFile('lib/foundation-db.js'),
      readRepoFile('lib/foundation-decision-store.js'),
      readRepoFile('docs/strategy/operating-truths.md'),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoJson('package.json'),
      validatePlanApprovalFile({ repoRoot, approvalRef: MEMORY_005_APPROVAL_PATH, cardId: MEMORY_005_CARD_ID }),
    ])
    const approval = approvalValidation.approval || {}
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: buildCardRow({ closeCard: args.closeCard }),
      changedFiles: MEMORY_005_CHANGED_FILES,
      declaredRisk: 'decision DB schema, decision-store write mapping, Foundation DB snapshots, temporal truth query semantics, Current Sprint progression, package scripts, closeout registry',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)

    await initFoundationDb()
    dbInitialized = true
    const liveSchema = await getLiveDecisionTemporalSchema()
    const activeSprint = await getActiveFoundationCurrentSprint()
    const cards = await getBacklogItemsByIds([MEMORY_005_CARD_ID, MEMORY_005_NEXT_CARD_ID])
    const planCriticRuns = await getPlanCriticRunsByCardIds([MEMORY_005_CARD_ID])
    const closeout = getFoundationBuildCloseouts().find(record => record.key === MEMORY_005_CLOSEOUT_KEY)
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId
    const packageScript = packageJson.scripts?.['process:memory-005-check']
    const evaluation = evaluateMemory005Implementation({
      moduleSource,
      schemaSeedSource,
      foundationDbSource,
      decisionStoreSource,
      operatingTruthsSource,
      closeoutRegistrySource,
      coverageSource,
    })
    const dogfood = buildMemory005DogfoodProof()

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'MEMORY-005 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || MEMORY_005_APPROVAL_PATH)
    addCheck(checks, approval.cardId === MEMORY_005_CARD_ID && Number(approval.score) >= 9.8, 'MEMORY-005 approval score is 9.8+', `${approval.cardId || 'missing'} / ${approval.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes MEMORY-005 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === MEMORY_005_CARD_ID), 'MEMORY-005 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, cards.some(card => card.id === MEMORY_005_NEXT_CARD_ID), 'STRATEGY-001 next card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === MEMORY_005_CARD_ID || (args.closeCard && currentActiveBlocker === MEMORY_005_NEXT_CARD_ID), 'Current Sprint owns MEMORY-005 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, liveSchema.ok, 'live decisions table has temporal columns', liveSchema.columns.join(', ') || 'missing')
    addCheck(checks, evaluation.ok, 'MEMORY-005 implementation wiring is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
    addCheck(checks, dogfood.ok, 'MEMORY-005 dogfood rejects false-greens', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${MEMORY_005_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    for (const relativePath of MEMORY_005_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/'))) {
      const willWriteCloseout = args.closeCard && relativePath === MEMORY_005_CLOSEOUT_PATH
      const closeoutPending = !args.closeCard && relativePath === MEMORY_005_CLOSEOUT_PATH
      addCheck(
        checks,
        willWriteCloseout || closeoutPending || await repoFileExists(relativePath),
        `${relativePath} exists`,
        willWriteCloseout || closeoutPending ? 'will be written on close' : relativePath,
      )
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(MEMORY_005_CARD_ID), 'closeout registry exposes MEMORY-005', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.closeCard, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending write')

    if (args.closeCard) {
      const nextCard = cards.find(card => card.id === MEMORY_005_NEXT_CARD_ID) || {}
      await upsertPlanCriticRun(planReview)
      await upsertBacklogRows({ closeCard: true, nextCard })
      await upsertCurrentSprint({ closeCard: true, activeSprint })
      await writeCloseout({ evaluation, dogfood, liveSchema })
    }

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: MEMORY_005_CARD_ID,
      closeoutKey: MEMORY_005_CLOSEOUT_KEY,
      nextCardId: MEMORY_005_NEXT_CARD_ID,
      generatedAt: new Date().toISOString(),
      closed: args.closeCard,
      planSummary,
      summary: {
        checks: checks.length,
        failed: failed.length,
        liveDecisionTemporalColumns: liveSchema.columns,
        ...evaluation.summary,
      },
      checks,
      failed,
      dogfood,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`MEMORY-005 status: ${report.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    process.exitCode = report.ok ? 0 : 1
  } finally {
    if (dbInitialized) await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
