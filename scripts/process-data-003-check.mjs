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
  DATA_003_APPROVAL_PATH,
  DATA_003_CARD_ID,
  DATA_003_CHANGED_FILES,
  DATA_003_CLOSEOUT_KEY,
  DATA_003_CLOSEOUT_PATH,
  DATA_003_NEXT_CARD_ID,
  DATA_003_NOT_NEXT_BOUNDARIES,
  DATA_003_PLAN_PATH,
  DATA_003_PROOF_COMMANDS,
  DATA_003_SCRIPT_PATH,
  DATA_003_SPRINT_ID,
  buildData003DogfoodProof,
  buildData003LiveSourceBackedValues,
  buildSyntheticData003DocPayloads,
  evaluateData003SourceBackedValues,
} from '../lib/data-003-source-backed-values.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-data-003'

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

function ensureTextIncludes(value = '', required = '') {
  const text = String(value || '').trim()
  if (!required || text.includes(required)) return text
  return `${text}${text ? ' ' : ''}${required}`.trim()
}

function buildExistingWorkCheck() {
  return {
    reused: 'Reuses existing live Strategy doc snapshots, /api/doc, DATA-002 source trust scores, BHAG/Agent Engine supporting docs, and Current Sprint gates.',
    readyAt: '2026-05-20T01:20:00-04:00',
    readyBy: 'Steve approved unattended overnight continuation and asked the builder to keep going through safe Foundation work.',
    exactGap: 'Strategy Overview still explained the model from markdown sections without showing the first live source-backed values from BHAG and Agent Engine source rows.',
    notRebuilt: 'No Strategy Hub redesign, no source extraction, no source sync, no provider call, no browser automation, and no source-data mutation.',
    existingCode: [
      'lib/foundation-strategy-source-snapshots.js',
      'lib/foundation-strategy-goal-truth.js',
      'lib/foundation-strategy-operating-truth.js',
      'server.js /api/doc',
      'public/foundation-doc-markdown-renderers.js',
      'public/foundation-strategy-renderers.js',
    ],
    existingDocs: [
      'docs/business-strategy.md',
      'docs/strategy/bhag-model.md',
      'docs/strategy/agent-engine.md',
      'docs/process/data-002-source-trust-scoring-plan.md',
      'docs/process/intel-scoper-001-plan.md',
    ],
    existingPolicy: [
      'Live values belong in source systems and source-backed UI views, not markdown snapshots.',
      'Markdown explains the model; source rows carry the numbers.',
      'Source badges and source actions must remain visible wherever source-backed values render.',
      'Blockers block unsafe actions, not the whole sprint when safe work remains.',
    ],
    existingScripts: [
      'process:data-002-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
      'process:foundation-ship',
    ],
    overBroadRisk: 'DATA-003 can drift into a full Strategy Hub rebuild. V1 only renders the first four compact Strategy Overview value cards from existing source snapshots.',
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: DATA_003_CARD_ID,
    title: 'Render live source-backed values across the system',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 4,
    source: 'Strategy system principle and Steve instruction that live math must come from source IDs, not markdown snapshots.',
    summary: 'Render the first live source-backed strategy value cards from existing BHAG and Agent Engine source snapshots.',
    whyItMatters: 'If a KPI, milestone path, or assumption changes in the source of truth, Steve should see updated values in the system without manual doc cleanup.',
    nextAction: closeCard
      ? `Done under ${DATA_003_CLOSEOUT_KEY}; continue ${DATA_003_NEXT_CARD_ID}.`
      : 'Ship the Strategy Overview live source-backed values strip using existing BHAG and Agent Engine doc snapshots.',
    statusNote: closeCard
      ? `Closed v1 under ${DATA_003_CLOSEOUT_KEY}; Strategy Overview now renders live source-backed BHAG and Agent Engine value cards.`
      : 'Executing v1: no extraction, source sync, provider calls, external writes, or Strategy Hub redesign.',
    owner: 'Foundation Data',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: DATA_003_NEXT_CARD_ID,
    title: existing.title || 'Close overnight sprint and choose morning-safe continuation',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P0',
    rank: existing.rank || 99,
    nextAction: ensureTextIncludes(existing.nextAction || '', `Run overnight closeout after ${DATA_003_CLOSEOUT_KEY}.`),
    statusNote: ensureTextIncludes(existing.statusNote || '', `Unblocked by ${DATA_003_CLOSEOUT_KEY}; verify raw health, repeated failures, main sync, backlog, and next safe sprint.`),
    owner: existing.owner || 'Foundation Ops',
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
        DATA_003_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${DATA_003_CARD_ID}.`,
        JSON.stringify({
          closeoutKey: DATA_003_CLOSEOUT_KEY,
          activeBlockerCardId: closeCard ? DATA_003_NEXT_CARD_ID : DATA_003_CARD_ID,
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
        `data-003-${stableRunId(DATA_003_PLAN_PATH)}`,
        DATA_003_CARD_ID,
        DATA_003_PLAN_PATH,
        planReview.status,
        planReview.score,
        DATA_003_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: DATA_003_CARD_ID,
          closeoutKey: DATA_003_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function closeCardAndAdvanceSprint({ activeSprint, planReview, nextCard } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DATA_003_SCRIPT_PATH,
    operation: 'close DATA-003 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await upsertBacklogRows({ closeCard: true, nextCard })
  await upsertPlanCriticRun(planReview)

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = existing.map((item, index) => {
    if (item.cardId === DATA_003_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: DATA_003_PLAN_PATH,
        definitionOfDone: 'Strategy Overview renders live source-backed BHAG and Agent Engine value cards with source badges, source actions, as-of dates, and provenance.',
        proofCommands: DATA_003_PROOF_COMMANDS,
        nextAction: `Continue ${DATA_003_NEXT_CARD_ID}; source-backed values are live on Strategy Overview.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...DATA_003_NOT_NEXT_BOUNDARIES])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: DATA_003_CLOSEOUT_KEY,
          approvalRef: DATA_003_APPROVAL_PATH,
          sourceDocPaths: ['docs/strategy/bhag-model.md', 'docs/strategy/agent-engine.md'],
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === DATA_003_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        planRef: item.planRef || 'docs/process/foundation-overnight-closeout-and-morning-readiness-001-plan.md',
        nextAction: ensureTextIncludes(item.nextAction || '', `Verify readiness after ${DATA_003_CLOSEOUT_KEY}.`),
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: DATA_003_CARD_ID,
          previousCloseoutKey: DATA_003_CLOSEOUT_KEY,
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || DATA_003_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: DATA_003_NEXT_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: 'data_003_done',
          lastClosedCardId: DATA_003_CARD_ID,
          nextAction: `Continue ${DATA_003_NEXT_CARD_ID}; DATA-003 source-backed values are live.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'DATA-003 closes and advances to overnight closeout readiness.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || null,
      reason: 'DATA-003 closes and advances the active blocker.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const payloads = buildSyntheticData003DocPayloads()
  const snapshot = buildData003LiveSourceBackedValues(payloads)
  const [
    packageJson,
    planSource,
    moduleSource,
    scriptSource,
    rendererSource,
    docRendererSource,
    sourceOfTruthPayloadSource,
    registrySource,
    approval,
    initialCards,
    activeSprint,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(DATA_003_PLAN_PATH),
    readRepoFile('lib/data-003-source-backed-values.js'),
    readRepoFile(DATA_003_SCRIPT_PATH),
    readRepoFile('public/foundation-strategy-renderers.js'),
    readRepoFile('public/foundation-doc-markdown-renderers.js'),
    readRepoFile('lib/source-of-truth-payload.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    validatePlanApprovalFile({ repoRoot, approvalRef: DATA_003_APPROVAL_PATH, cardId: DATA_003_CARD_ID }),
    getBacklogItemsByIds([DATA_003_CARD_ID, DATA_003_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])

  const nextCardBefore = initialCards.find(card => card.id === DATA_003_NEXT_CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: DATA_003_CHANGED_FILES,
    declaredRisk: 'frontend Strategy Overview rendering, Current Sprint advancement, backlog closeout rows',
    repoRoot,
  })

  if (args.closeCard && approval.ok && planReview.status === 'pass') {
    await closeCardAndAdvanceSprint({ activeSprint, planReview, nextCard: nextCardBefore })
  }

  const evaluation = evaluateData003SourceBackedValues({
    snapshot,
    rendererSource,
    docRendererSource,
    sourceOfTruthPayloadSource,
    planSource,
    closeoutRegistrySource: registrySource,
  })
  const dogfood = buildData003DogfoodProof()
  const cards = await getBacklogItemsByIds([DATA_003_CARD_ID, DATA_003_NEXT_CARD_ID])
  const refreshedSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([DATA_003_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const closeoutDoc = await readRepoFile(DATA_003_CLOSEOUT_PATH, { optional: true })
  await closeFoundationDb()

  const card = cards.find(item => item.id === DATA_003_CARD_ID) || null
  const nextCard = cards.find(item => item.id === DATA_003_NEXT_CARD_ID) || null
  const sprintItem = (refreshedSprint.items || []).find(item => item.cardId === DATA_003_CARD_ID) || null
  const nextSprintItem = (refreshedSprint.items || []).find(item => item.cardId === DATA_003_NEXT_CARD_ID) || null
  const activeBlocker = refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || null
  const closeout = closeouts.find(record => record.key === DATA_003_CLOSEOUT_KEY) || null
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === DATA_003_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || DATA_003_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for DATA-003 plan', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, packageJson.scripts?.['process:data-003-check'] === `node --env-file-if-exists=.env ${DATA_003_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:data-003-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildData003LiveSourceBackedValues') && moduleSource.includes('evaluateData003SourceBackedValues'), 'module owns DATA-003 card model and evaluator', 'markers present')
  addCheck(checks, scriptSource.includes('closeCardAndAdvanceSprint') && scriptSource.includes('DATA_003_NEXT_CARD_ID'), 'script owns guarded close-card advancement', 'markers present')
  addCheck(checks, evaluation.ok, 'DATA-003 source-backed value snapshot is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects source rows without provenance', dogfood.invariant)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live DATA-003 backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && nextCard.nextAction?.includes(DATA_003_CLOSEOUT_KEY), 'next closeout card is pinned to DATA-003', nextCard?.nextAction || 'missing')
  addCheck(checks, closeout && closeout.backlogIds?.includes(DATA_003_CARD_ID), 'closeout record links DATA-003', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(DATA_003_CLOSEOUT_KEY) && closeoutDoc.includes('Strategy Overview'), 'closeout handoff exists and names Strategy Overview', DATA_003_CLOSEOUT_PATH)
  addCheck(checks, refreshedSprint.sprint?.sprintId === DATA_003_SPRINT_ID, 'Current Sprint remains overnight audit-control sprint', refreshedSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks DATA-003 done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeBlocker === DATA_003_NEXT_CARD_ID, 'close-card advances active blocker to overnight closeout readiness', activeBlocker || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped for its own build', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: DATA_003_CARD_ID,
    closeoutKey: DATA_003_CLOSEOUT_KEY,
    sourceBackedValues: evaluation.summary,
    dogfood,
    currentSprint: {
      sprintId: refreshedSprint.sprint?.sprintId || null,
      activeBlockerCardId: activeBlocker,
      data003Stage: sprintItem?.stage || null,
      nextStage: nextSprintItem?.stage || null,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`DATA-003 check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  closeFoundationDb()
    .finally(() => {
      process.exit(1)
    })
})
