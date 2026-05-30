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
  syncSourceContractRegistryTable,
} from '../lib/foundation-source-crawl-db.js'
import {
  upsertSynthesisFactsBundle,
} from '../lib/foundation-intelligence-db.js'
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
  STRATEGY_QUARTER_APPROVAL_PATH,
  STRATEGY_QUARTER_CARD_ID,
  STRATEGY_QUARTER_CHANGED_FILES,
  STRATEGY_QUARTER_CLOSEOUT_KEY,
  STRATEGY_QUARTER_CLOSEOUT_PATH,
  STRATEGY_QUARTER_NEXT_CARD_ID,
  STRATEGY_QUARTER_NOT_NEXT_BOUNDARIES,
  STRATEGY_QUARTER_PLAN_PATH,
  STRATEGY_QUARTER_PROOF_COMMANDS,
  STRATEGY_QUARTER_SCRIPT_PATH,
  STRATEGY_QUARTER_SOURCE_ID,
  buildStrategyQuarterDogfoodProof,
  buildStrategyQuarterSourceFacts,
  evaluateStrategyQuarterSnapshot,
  getStrategyQuarterSnapshot,
  upsertStrategyQuarterSeed,
} from '../lib/strategy-quarter-input-layer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-strategy-quarter'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function text(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim()
  return normalized || fallback
}

function ensureIncludes(value = '', required = '') {
  const normalized = text(value)
  if (!required || normalized.includes(required)) return normalized
  return `${normalized}${normalized ? ' ' : ''}${required}`.trim()
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

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: STRATEGY_QUARTER_CARD_ID,
    title: 'Create the source-backed Strategy Quarter input layer',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 17,
    source: 'Strategic Execution, Strategic Intelligence, DECISION-008, INTEL-SCOPER-001, and Steve direction to turn planning truth into source-backed records.',
    summary: 'Create the canonical source-backed quarter strategy layer that stores quarter theme, critical number, unresolved strategic issues, department targets, open decisions, prework outputs, weekly ownership review outputs, and follow-up routing.',
    whyItMatters: 'Strategic Execution needs one current-quarter input layer before the quarterly workspace deepens. Otherwise Strategy pages keep relying on stale markdown and disconnected planning readouts.',
    nextAction: closeCard
      ? `Done under ${STRATEGY_QUARTER_CLOSEOUT_KEY}; continue ${STRATEGY_QUARTER_NEXT_CARD_ID}.`
      : 'Build the PostgreSQL-backed Strategy Quarter context, Strategy Hub read/write surface, and source-fact export without external writes or extraction.',
    statusNote: closeCard
      ? `Closed v1 under ${STRATEGY_QUARTER_CLOSEOUT_KEY}; SRC-STRATEGY-QUARTER-001 now has local DB records, Strategy Hub read/write path, and source-backed quarter facts.`
      : 'Executing v1: local DB records, Strategy Hub read/write path, source contract update, and source facts only.',
    owner: 'Strategy',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: STRATEGY_QUARTER_NEXT_CARD_ID,
    title: existing.title || 'Deepen Strategic Execution into a live quarterly priorities workspace',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 16,
    nextAction: ensureIncludes(
      existing.nextAction || 'Use the Strategy Quarter input layer as the source of current-quarter context before deepening the workspace.',
      `Start from ${STRATEGY_QUARTER_CLOSEOUT_KEY}, not stale quarterly-priorities markdown.`
    ),
    statusNote: ensureIncludes(
      existing.statusNote || '',
      `Unblocked by ${STRATEGY_QUARTER_CLOSEOUT_KEY}; STRATEGY-003 should consume strategy_quarter_* records and SRC-STRATEGY-QUARTER-001 source facts.`
    ),
    owner: existing.owner || 'Strategy',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/strategy-shared-comms-routes.js',
      'public/strategic-execution.js',
      'lib/strategy-planning-workflow.js',
      'lib/strategic-intel-loop.js',
      'lib/decision-008-accountability-doctrine.js',
      'lib/intelligence-synthesis-facts.js',
      'lib/source-contract-registry-table.js',
    ],
    existingScripts: [
      'scripts/process-strategy-004-check.mjs',
      'scripts/process-strategy-009-check.mjs',
      'scripts/process-decision-008-check.mjs',
      'scripts/process-intel-scoper-check.mjs',
      'scripts/process-data-003-check.mjs',
    ],
    existingTables: [
      'intelligence_strategic_issues',
      'intelligence_action_routes',
      'decisions',
      'open_questions',
      'intelligence_synthesis_facts',
      'source_contract_registry',
    ],
    existingDocs: [
      'docs/strategy/quarterly-priorities.md',
      'docs/strategy/strategic-issues.md',
      'docs/process/strategic-intel-001-plan.md',
      'docs/process/decision-008-plan.md',
      'docs/process/intel-scoper-001-plan.md',
      'docs/process/strategy-004-planning-workflow-plan.md',
      'docs/process/strategy-009-package-ux-plan.md',
    ],
    existingPolicy: [
      'Strategy Hub route writes remain human-approved.',
      'Stale quarter docs are evidence, not canonical current quarter truth.',
      'Process checks write local DB only with explicit close-card.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    exactGap: 'STRATEGY-QUARTER-001 had a source ID and backlog scope, but no live DB records, no Strategy Hub quarter write path, and no source-fact export.',
    overBroadRisk: 'The card can drift into full Strategic Execution workspace expansion, extraction, provider calls, or decision application. V1 is only the input layer.',
    reused: 'Reuses Strategy Hub v2, Strategic Intelligence issues, Action Router, Decision/Open Question stores, source contract registry sync, source fact ledger, and Current Sprint gates.',
    notRebuilt: 'No external writes, no extraction, no provider calls, no full STRATEGY-003 workspace, no auto-applied decisions.',
    readyBy: 'Steve approved continuous unattended Foundation execution.',
    readyAt: '2026-05-20T08:08:00-04:00',
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
        `strategy-quarter-${stableRunId(STRATEGY_QUARTER_PLAN_PATH)}`,
        STRATEGY_QUARTER_CARD_ID,
        STRATEGY_QUARTER_PLAN_PATH,
        planReview.status,
        planReview.score,
        STRATEGY_QUARTER_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: STRATEGY_QUARTER_CARD_ID,
          closeoutKey: STRATEGY_QUARTER_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function upsertBacklogRows({ closeCard = false, nextCard = {} } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const rows = [buildCardRow({ closeCard }), buildNextCardRow(nextCard)]
  try {
    await client.query('BEGIN')
    for (const row of rows) {
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
        STRATEGY_QUARTER_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${STRATEGY_QUARTER_CARD_ID}.`,
        JSON.stringify({
          closeoutKey: STRATEGY_QUARTER_CLOSEOUT_KEY,
          activeBlockerCardId: closeCard ? STRATEGY_QUARTER_NEXT_CARD_ID : STRATEGY_QUARTER_CARD_ID,
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

async function closeCardAndAdvanceSprint({ activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: STRATEGY_QUARTER_SCRIPT_PATH,
    operation: 'close STRATEGY-QUARTER-001 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = existing.map((item, index) => {
    if (item.cardId === STRATEGY_QUARTER_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: STRATEGY_QUARTER_PLAN_PATH,
        definitionOfDone: 'Strategy Quarter context is DB-backed, visible in Strategy Hub, editable by owner/admin, exported as source facts, and tied to SRC-STRATEGY-QUARTER-001.',
        proofCommands: STRATEGY_QUARTER_PROOF_COMMANDS,
        nextAction: `Continue ${STRATEGY_QUARTER_NEXT_CARD_ID}; Strategy Quarter input truth is live.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...STRATEGY_QUARTER_NOT_NEXT_BOUNDARIES])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: STRATEGY_QUARTER_CLOSEOUT_KEY,
          approvalRef: STRATEGY_QUARTER_APPROVAL_PATH,
          sourceId: STRATEGY_QUARTER_SOURCE_ID,
          outputTables: ['strategy_quarter_contexts', 'strategy_quarter_targets', 'strategy_quarter_review_outputs', 'intelligence_synthesis_facts'],
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === STRATEGY_QUARTER_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        nextAction: ensureIncludes(item.nextAction || '', `Consume ${STRATEGY_QUARTER_SOURCE_ID} source facts and strategy_quarter_* tables.`),
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: STRATEGY_QUARTER_CARD_ID,
          inputSourceId: STRATEGY_QUARTER_SOURCE_ID,
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        status: 'active',
        activeBlockerCardId: STRATEGY_QUARTER_NEXT_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: 'strategy_quarter_closed_next_strategy_003_scoping',
          lastClosedCardId: STRATEGY_QUARTER_CARD_ID,
          lastCloseoutKey: STRATEGY_QUARTER_CLOSEOUT_KEY,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'STRATEGY-QUARTER-001 closes and advances to STRATEGY-003.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || null,
      reason: 'STRATEGY-QUARTER-001 closes and advances the active blocker.',
    },
  )
}

async function writeCloseout(snapshot) {
  const context = snapshot.context || {}
  const content = `# STRATEGY-QUARTER-001 Closeout

Date: 2026-05-20

## What Changed

- Created the PostgreSQL-backed Strategy Quarter input layer.
- Promoted \`${STRATEGY_QUARTER_SOURCE_ID}\` from proposed source identity to current-reality source contract.
- Added Strategy Hub v2 quarter context read/write path.
- Seeded current-quarter context, department targets, review/follow-up outputs, and source-backed quarter facts.
- Preserved stale/prior-quarter quarterly-priorities markdown as evidence, not signed-off current-quarter truth.

## Proof

- Quarter: ${context.label || 'missing'}
- Planning status: ${context.planningStatus || 'missing'}
- Targets: ${snapshot.summary?.targetCount ?? 0}
- Review outputs: ${snapshot.summary?.reviewOutputCount ?? 0}
- Source facts: ${snapshot.summary?.factCount ?? 0}

## Commands

${STRATEGY_QUARTER_PROOF_COMMANDS.map(command => `- \`${command}\``).join('\n')}

## Known Limits

- This does not build the full quarterly priorities workspace; \`${STRATEGY_QUARTER_NEXT_CARD_ID}\` owns that.
- This does not run Drive extraction, browser automation, provider calls, paid-source work, or broad private extraction.
- This does not send messages, mutate external systems, mutate Drive permissions, rotate credentials, or change provider config.
- This does not auto-apply decisions or action routes.

## Next

Continue \`${STRATEGY_QUARTER_NEXT_CARD_ID}\` using \`${STRATEGY_QUARTER_SOURCE_ID}\`, \`strategy_quarter_contexts\`, \`strategy_quarter_targets\`, \`strategy_quarter_review_outputs\`, and Strategy Quarter source facts as the input layer.
`
  await fs.writeFile(path.join(repoRoot, STRATEGY_QUARTER_CLOSEOUT_PATH), content)
}

async function runCloseCardWrites({ planReview, activeSprint, nextCard } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: STRATEGY_QUARTER_SCRIPT_PATH,
    operation: 'create Strategy Quarter local DB records and source facts',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await syncSourceContractRegistryTable({ actor: ACTOR })
  let snapshot = await upsertStrategyQuarterSeed({ actor: ACTOR, repoRoot })
  const facts = buildStrategyQuarterSourceFacts(snapshot)
  await upsertSynthesisFactsBundle({
    runId: `strategy-quarter-facts-${stableRunId(`${Date.now()}:${STRATEGY_QUARTER_CLOSEOUT_KEY}`)}`,
    runType: 'fact_refresh',
    status: 'succeeded',
    requestedBy: ACTOR,
    sourceIds: [STRATEGY_QUARTER_SOURCE_ID],
    facts,
    metadata: {
      cardId: STRATEGY_QUARTER_CARD_ID,
      closeoutKey: STRATEGY_QUARTER_CLOSEOUT_KEY,
      factSubtypes: facts.map(fact => fact.metadata?.factSubtype).filter(Boolean),
    },
  }, ACTOR)
  snapshot = await getStrategyQuarterSnapshot()
  await upsertBacklogRows({ closeCard: true, nextCard })
  await upsertPlanCriticRun(planReview)
  await closeCardAndAdvanceSprint({ activeSprint })
  await writeCloseout(snapshot)
  return snapshot
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    packageJson,
    planText,
    moduleSource,
    routeSource,
    frontendSource,
    scriptSource,
    sourceContractsSource,
    sourceValidationSource,
    sourceLifecycleSource,
    registrySource,
    approval,
    initialCards,
    activeSprint,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(STRATEGY_QUARTER_PLAN_PATH),
    readRepoFile('lib/strategy-quarter-input-layer.js'),
    readRepoFile('lib/strategy-shared-comms-routes.js'),
    readRepoFile('public/strategic-execution.js'),
    readRepoFile(STRATEGY_QUARTER_SCRIPT_PATH),
    readRepoFile('lib/source-contracts.js'),
    readRepoFile('lib/source-contract-validation-layer.js'),
    readRepoFile('lib/source-lifecycle-completion.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    validatePlanApprovalFile({ repoRoot, approvalRef: STRATEGY_QUARTER_APPROVAL_PATH, cardId: STRATEGY_QUARTER_CARD_ID }),
    getBacklogItemsByIds([STRATEGY_QUARTER_CARD_ID, STRATEGY_QUARTER_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])

  const nextCardBefore = initialCards.find(card => card.id === STRATEGY_QUARTER_NEXT_CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: STRATEGY_QUARTER_CHANGED_FILES,
    declaredRisk: 'local DB schema/rows, Strategy Hub API/UI, source contract status, source fact ledger, Current Sprint advancement',
    repoRoot,
  })

  let snapshot = null
  if (args.closeCard && approval.ok && planReview.status === 'pass') {
    snapshot = await runCloseCardWrites({ planReview, activeSprint, nextCard: nextCardBefore })
  } else {
    snapshot = await getStrategyQuarterSnapshot()
  }

  const evaluation = evaluateStrategyQuarterSnapshot(snapshot)
  const dogfood = buildStrategyQuarterDogfoodProof()
  const cards = await getBacklogItemsByIds([STRATEGY_QUARTER_CARD_ID, STRATEGY_QUARTER_NEXT_CARD_ID])
  const refreshedSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([STRATEGY_QUARTER_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const closeoutDoc = await readRepoFile(STRATEGY_QUARTER_CLOSEOUT_PATH, { optional: true })
  await closeFoundationDb()

  const card = cards.find(item => item.id === STRATEGY_QUARTER_CARD_ID) || null
  const nextCard = cards.find(item => item.id === STRATEGY_QUARTER_NEXT_CARD_ID) || null
  const sprintItem = (refreshedSprint.items || []).find(item => item.cardId === STRATEGY_QUARTER_CARD_ID) || null
  const nextSprintItem = (refreshedSprint.items || []).find(item => item.cardId === STRATEGY_QUARTER_NEXT_CARD_ID) || null
  const activeBlocker = refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || null
  const closeout = closeouts.find(record => record.key === STRATEGY_QUARTER_CLOSEOUT_KEY) || null
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === STRATEGY_QUARTER_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || STRATEGY_QUARTER_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for STRATEGY-QUARTER-001 plan', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || !args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, packageJson.scripts?.['process:strategy-quarter-check'] === `node --env-file-if-exists=.env ${STRATEGY_QUARTER_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:strategy-quarter-check'] || 'missing')
  addCheck(checks, moduleSource.includes('strategyQuarterSchemaSql') && moduleSource.includes('buildStrategyQuarterSourceFacts'), 'module owns schema and source fact export', 'markers present')
  addCheck(checks, routeSource.includes('/api/strategic-execution/quarter-context') && routeSource.includes('quarterContext'), 'Strategy Hub API exposes quarter context read/write path', 'route markers present')
  addCheck(checks, frontendSource.includes('renderQuarterContextPanel') && frontendSource.includes('saveQuarterContext'), 'Strategy Hub UI renders and saves quarter context', 'UI markers present')
  addCheck(checks, sourceContractsSource.includes('V1 Source Boundary Locked') && sourceContractsSource.includes(STRATEGY_QUARTER_SOURCE_ID), 'source contract is current-reality signed off', STRATEGY_QUARTER_SOURCE_ID)
  addCheck(checks, sourceValidationSource.includes("atomFlowExpectation: 'eligible_now'"), 'source validation layer marks quarter source eligible now', STRATEGY_QUARTER_SOURCE_ID)
  addCheck(checks, !sourceLifecycleSource.includes("'SRC-STRATEGY-QUARTER-001':"), 'source lifecycle no longer blocks Strategy Quarter source', STRATEGY_QUARTER_SOURCE_ID)
  addCheck(checks, evaluation.ok || !args.closeCard, 'Strategy Quarter snapshot is healthy after close-card', evaluation.checks.filter(item => !item.ok).map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects weak Strategy Quarter fixtures', JSON.stringify(dogfood.rejected))
  addCheck(checks, registrySource.includes(STRATEGY_QUARTER_CLOSEOUT_KEY), 'closeout registry includes STRATEGY-QUARTER-001', STRATEGY_QUARTER_CLOSEOUT_KEY)
  addCheck(checks, closeout && closeout.backlogIds?.includes(STRATEGY_QUARTER_CARD_ID), 'closeout record links STRATEGY-QUARTER-001', closeout ? closeout.key : 'missing')
  addCheck(checks, !args.closeCard || closeoutDoc.includes(STRATEGY_QUARTER_CLOSEOUT_KEY), 'closeout handoff exists after close-card', closeoutDoc ? STRATEGY_QUARTER_CLOSEOUT_PATH : 'missing')
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live STRATEGY-QUARTER-001 backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && ['research', 'scoped', 'done'].includes(nextCard.lane), 'next STRATEGY-003 backlog card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks STRATEGY-QUARTER-001 done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeBlocker === STRATEGY_QUARTER_NEXT_CARD_ID, 'close-card advances active blocker to STRATEGY-003', activeBlocker || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped for its own plan', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: STRATEGY_QUARTER_CARD_ID,
    closeoutKey: STRATEGY_QUARTER_CLOSEOUT_KEY,
    strategyQuarter: snapshot.summary || {},
    dogfood,
    currentSprint: {
      sprintId: refreshedSprint.sprint?.sprintId || null,
      activeBlockerCardId: activeBlocker,
      strategyQuarterStage: sprintItem?.stage || null,
      nextStage: nextSprintItem?.stage || null,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`STRATEGY-QUARTER-001 proof: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
  }
  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  console.error('STRATEGY-QUARTER-001 proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
}).finally(async () => {
  await closeFoundationDb().catch(() => {})
})
