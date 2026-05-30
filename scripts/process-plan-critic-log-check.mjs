#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { Pool } from 'pg'
import {
  buildPlanCriticResultSummary,
  buildSyntheticPlanCriticProof,
  evaluatePlanCriticPlan,
  PLAN_CRITIC_MIN_PASS_SCORE,
} from '../lib/process-plan-critic.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import { updateBacklogItem } from '../lib/foundation-backlog-sprint-db.js'

const args = new Set(process.argv.slice(2))
const jsonMode = args.has('--json') || args.has('--json=true')
const CARD_ID = 'PLAN-CRITIC-LOG-001'
const CLOSEOUT_KEY = 'plan-critic-log-v1'

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function planForLogCard() {
  return `
# PLAN-CRITIC-LOG-001 Plan

## What
Build a narrow V1 durable Plan Critic run ledger for card PLAN-CRITIC-LOG-001. This is a fast dogfood log, not a new agent or reviewer framework.

## Why
Steve needs operator confidence that Plan Critic is actually critiquing plans and rejecting weak ones instead of rubber-stamping fast build velocity.
The operator value is a queryable audit trail Steve can inspect before trusting the next sprint plan; it unlocks a real workflow for reviewing plan quality without rereading chat transcripts.

## Acceptance Criteria
- The system writes a durable plan_critic_runs row for a passing plan and a rejected weak plan.
- Each row records score, status, changed files, gate decision, and findings.
- The proof uses the actual function path evaluatePlanCriticPlan and rejects substring-only proof.
- The proof uses real database round-trip behavior, not marker checks: write rows, query rows, and verify pass/revise behavior from persisted data.
- Proof command is npm run process:plan-critic-log-check -- --json.

## Definition Of Done
- Existing code from lib/process-plan-critic.js is reused.
- Existing backlog, Current Sprint, and process proof patterns are reused.
- The checker queries the real Postgres table after writes.
- The active sprint advances to SOURCE-CONNECTOR-MATRIX-001 after the log proof passes.

## Details
Reuse existing code, existing docs, existing scripts, live backlog, and Current Sprint truth. Gate decision tree uses static, focused, or full based on blast radius; this card uses full proof when schema/package surfaces change and focused proof for the process checker itself.
The behavior proof calls the real function path evaluatePlanCriticPlan, writes pass/revise results to Postgres, then queries those same rows so Steve and future operators can audit score, status, changed files, gate level, and rejection reasons.

## Risks
Risk is adding process drag or fake logging. Repair path is fail closed, reopen PLAN-CRITIC-LOG-001, and keep matrix work blocked until a real rejected row exists.

## Tests
Run npm run process:plan-critic-log-check -- --json, npm run process:plan-critic-check -- --json=true, and npm run backlog:hygiene -- --json.

## Not Next
Do not build Agent Factory, Strategy Hub, Telegram bots, broad verifier rewrites, or the connector matrix inside this logging card.
`
}

async function insertRun(pool, { runId, cardId, planRef, result, changedFiles, requestedBy = 'process-plan-critic-log-check' }) {
  await pool.query(
    `
      INSERT INTO plan_critic_runs (
        run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
        priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::text[],$12::jsonb,$13::jsonb,$14)
      ON CONFLICT (run_id) DO UPDATE
      SET status = EXCLUDED.status,
          score = EXCLUDED.score,
          max_score = EXCLUDED.max_score,
          pass_threshold = EXCLUDED.pass_threshold,
          priority = EXCLUDED.priority,
          gate_level = EXCLUDED.gate_level,
          full_verify_required = EXCLUDED.full_verify_required,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result,
          requested_by = EXCLUDED.requested_by
    `,
    [
      runId,
      cardId,
      planRef,
      result.status,
      result.score,
      result.maxScore,
      result.passThreshold,
      result.priority,
      result.gateDecision?.level || null,
      result.gateDecision?.fullVerifyRequired === true,
      changedFiles,
      JSON.stringify(result.findings || []),
      JSON.stringify(result),
      requestedBy,
    ],
  )
}

async function closeSprintCard() {
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Use plan_critic_runs to audit whether future plans are passing or being sent back for revision.',
    statusNote: 'Closed on 2026-05-12 under `plan-critic-log-v1`. V1 adds the `plan_critic_runs` table and `scripts/process-plan-critic-log-check.mjs`; proof writes and queries both a passing PLAN-CRITIC-LOG-001 plan row and a rejected synthetic weak-plan row with score, gate level, changed files, and findings. Proof: `npm run process:plan-critic-log-check -- --json`.',
  }, 'codex')

  const pool = createPool()
  try {
    await pool.query(
      `
        UPDATE foundation_sprint_items
        SET stage = 'done_this_sprint',
            updated_at = NOW()
        WHERE sprint_id = 'connector-routing-truth-2026-05-12'
          AND backlog_id = $1
      `,
      [CARD_ID],
    )
    await pool.query(
      `
        UPDATE foundation_sprints
        SET active_blocker_card_id = 'SOURCE-CONNECTOR-MATRIX-001',
            metadata = metadata || $1::jsonb,
            updated_at = NOW()
        WHERE sprint_id = 'connector-routing-truth-2026-05-12'
          AND status = 'active'
      `,
      [JSON.stringify({
        currentStatus: 'plan_critic_log_done_next_connector_matrix',
        nextAction: 'Build SOURCE-CONNECTOR-MATRIX-001 next with atom-flow columns and missing connector rows.',
      })],
    )
  } finally {
    await pool.end()
  }
}

async function main() {
  await initFoundationDb()
  const changedFiles = [
    'lib/foundation-db.js',
    'lib/process-plan-critic.js',
    'scripts/process-plan-critic-log-check.mjs',
    'package.json',
  ]
  const logPlan = evaluatePlanCriticPlan({
    planText: planForLogCard(),
    card: { id: CARD_ID, priority: 'P0' },
    changedFiles,
    declaredRisk: 'focused process ledger; no server, auth, external mutation, or product work',
  })
  const synthetic = buildSyntheticPlanCriticProof()
  const weak = synthetic.weak
  const broad = synthetic.broad

  assert(logPlan.status === 'pass' && logPlan.score >= PLAN_CRITIC_MIN_PASS_SCORE, `Log-card plan should pass: ${buildPlanCriticResultSummary(logPlan)}`)
  assert(weak.status === 'revise' && weak.score < PLAN_CRITIC_MIN_PASS_SCORE, 'Synthetic weak plan must be rejected before logging.')
  assert(broad.status === 'revise' && broad.score < PLAN_CRITIC_MIN_PASS_SCORE, 'Synthetic broad plan must be rejected before logging.')

  const pool = createPool()
  const suffix = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${stableHash(JSON.stringify({ changedFiles, score: logPlan.score }))}`
  const passingRunId = `plan-critic-log-${suffix}`
  const weakRunId = `plan-critic-log-weak-${suffix}`
  const broadRunId = `plan-critic-log-broad-${suffix}`
  try {
    await insertRun(pool, {
      runId: passingRunId,
      cardId: CARD_ID,
      planRef: 'inline:PLAN-CRITIC-LOG-001',
      result: logPlan,
      changedFiles,
    })
    await insertRun(pool, {
      runId: weakRunId,
      cardId: 'SYNTHETIC-WEAK-P0',
      planRef: 'synthetic:weak-plan',
      result: weak,
      changedFiles: ['scripts/foundation-verify.mjs'],
    })
    await insertRun(pool, {
      runId: broadRunId,
      cardId: 'SYNTHETIC-BROAD-P0',
      planRef: 'synthetic:broad-plan',
      result: broad,
      changedFiles: ['server.js', 'lib/foundation-db.js'],
    })

    const recentResult = await pool.query(
      `
        SELECT run_id, card_id, status, score::float AS score, gate_level, full_verify_required, changed_files, findings, created_at
        FROM plan_critic_runs
        WHERE run_id = ANY($1::text[])
        ORDER BY created_at DESC, run_id ASC
      `,
      [[passingRunId, weakRunId, broadRunId]],
    )
    const runMap = new Map(recentResult.rows.map(row => [row.run_id, row]))
    assert(runMap.get(passingRunId)?.status === 'pass', 'Passing Plan Critic run was not persisted.')
    assert(runMap.get(weakRunId)?.status === 'revise', 'Rejected weak Plan Critic run was not persisted.')
    assert(Array.isArray(runMap.get(weakRunId)?.findings) && runMap.get(weakRunId).findings.length > 0, 'Rejected weak run needs persisted findings.')
    assert(runMap.get(broadRunId)?.status === 'revise', 'Rejected broad Plan Critic run was not persisted.')

    await pool.end()
    await closeSprintCard()
    await closeFoundationDb()

    const report = {
      ok: true,
      card: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      passingRunId,
      weakRunId,
      broadRunId,
      passingScore: logPlan.score,
      weakScore: weak.score,
      broadScore: broad.score,
      persistedRuns: recentResult.rows,
    }
    if (jsonMode) console.log(JSON.stringify(report, null, 2))
    else {
      console.log('PLAN-CRITIC-LOG-001 OK')
      console.log(`passing=${passingRunId} weak=${weakRunId} broad=${broadRunId}`)
    }
  } catch (error) {
    await pool.end().catch(() => {})
    throw error
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  if (jsonMode) console.log(JSON.stringify({ ok: false, card: CARD_ID, error: error.message }, null, 2))
  else console.error(error)
  process.exitCode = 1
})
