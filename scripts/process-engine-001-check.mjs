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
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getDocSourceSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  ENGINE_001_APPROVAL_PATH,
  ENGINE_001_CARD_ID,
  ENGINE_001_CHANGED_FILES,
  ENGINE_001_CLOSEOUT_KEY,
  ENGINE_001_CLOSEOUT_PATH,
  ENGINE_001_NEXT_CARD_ID,
  ENGINE_001_NOT_NEXT_BOUNDARIES,
  ENGINE_001_PLAN_PATH,
  ENGINE_001_PROOF_COMMANDS,
  ENGINE_001_SCRIPT_PATH,
  buildEngine001DogfoodProof,
  evaluateEngine001PlanningAttrition,
  renderEngine001Closeout,
} from '../lib/engine-001-planning-attrition-input.js'
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
const ACTOR = 'codex-engine-001'

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
    reused: 'Reuses the existing Agent Engine source snapshot, BHAG Builder source contract, doc renderers, DATA-001 Freedom boundary, OPS-003 source discipline, Current Sprint, Plan Critic, and ship gates.',
    readyAt: '2026-05-20T04:39:00-04:00',
    readyBy: 'Steve approved unattended Foundation continuation and OPS-003 advanced the sprint to ENGINE-001.',
    exactGap: 'Planning attrition was read from the BHAG builder but was not first-class in the Engine Inputs card; this made it too easy to confuse planning attrition with live attrition pressure.',
    notRebuilt: 'No spreadsheet mutation, Drive permission mutation, ClickUp/FUB/finance write, full Agent Engine rebuild, live extraction, provider call, or browser automation.',
    existingCode: [
      'lib/foundation-strategy-source-snapshots.js',
      'public/doc.js',
      'public/foundation-doc-markdown-renderers.js',
      'lib/process-plan-critic.js',
    ],
    existingDocs: [
      'docs/strategy/agent-engine.md',
      'docs/rebuild/freedom-rebuild-blueprint.md',
      'docs/source-notes/freedom-sheet.md',
    ],
    existingPolicy: [
      'Live values belong in source systems and source-backed UI views, not markdown snapshots.',
      'Freedom remains spreadsheet-era planning logic until the source-owned replacement is built.',
      'Planning attrition and live attrition pressure are different metrics.',
      'Blockers block unsafe actions, not the whole sprint when safe work remains.',
    ],
    overBroadRisk: 'ENGINE-001 can drift into rebuilding the Agent Engine. V1 only promotes planning attrition into first-class source snapshot and doc-renderer proof.',
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: ENGINE_001_CARD_ID,
    title: 'Make planning attrition a first-class engine input',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 5,
    source: 'Freedom Sheet / Agent Engine foundation work',
    summary: 'Promote planning attrition into the Agent Engine input surface while preserving source provenance and live attrition separation.',
    whyItMatters: 'Recruiting pace changes when planning attrition changes; the assumption needs to be visible and reviewable instead of buried in requirement math.',
    nextAction: closeCard
      ? `Done under \`${ENGINE_001_CLOSEOUT_KEY}\`; continue \`${ENGINE_001_NEXT_CARD_ID}\`.`
      : 'Ship first-class planning attrition input proof without mutating the spreadsheet.',
    statusNote: closeCard
      ? `Closed under \`${ENGINE_001_CLOSEOUT_KEY}\`; planning attrition is visible as a BHAG-backed Agent Engine input.`
      : `Executing \`${ENGINE_001_CLOSEOUT_KEY}\`; no spreadsheet mutation or broad engine rebuild.`,
    owner: 'Foundation Data',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: ENGINE_001_NEXT_CARD_ID,
    title: existing.title || 'Implement a temporal truth model for strategy and decisions',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 5,
    nextAction: ensureTextIncludes(existing.nextAction || '', `Run after ${ENGINE_001_CLOSEOUT_KEY}; keep temporal truth scoped before building broad memory features.`),
    statusNote: ensureTextIncludes(existing.statusNote || '', `Unblocked by ${ENGINE_001_CLOSEOUT_KEY}; next safe Foundation data/control card.`),
    owner: existing.owner || 'Foundation Data',
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
        ENGINE_001_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${ENGINE_001_CARD_ID}.`,
        JSON.stringify({
          closeoutKey: ENGINE_001_CLOSEOUT_KEY,
          activeBlockerCardId: closeCard ? ENGINE_001_NEXT_CARD_ID : ENGINE_001_CARD_ID,
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
        `engine-001-${stableRunId(ENGINE_001_PLAN_PATH)}`,
        ENGINE_001_CARD_ID,
        ENGINE_001_PLAN_PATH,
        planReview.status,
        planReview.score,
        ENGINE_001_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: ENGINE_001_CARD_ID,
          closeoutKey: ENGINE_001_CLOSEOUT_KEY,
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
    notNextBoundaries: Array.from(new Set([...(existing.notNextBoundaries || []), ...ENGINE_001_NOT_NEXT_BOUNDARIES])),
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
  const cardIndex = merged.findIndex(item => item.cardId === ENGINE_001_CARD_ID)
  const currentItem = existingById.get(ENGINE_001_CARD_ID) || {}
  const currentOrder = currentItem.order || currentItem.sprintOrder || 4
  const updatedCurrent = buildSprintItem({
    existing: currentItem,
    cardId: ENGINE_001_CARD_ID,
    order: currentOrder,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: ENGINE_001_PLAN_PATH,
    definitionOfDone: 'Planning attrition is first-class in Engine Inputs, remains visible beside recruiting pace, keeps BHAG provenance, stays separate from live attrition, and all ship gates pass.',
    proofCommands: ENGINE_001_PROOF_COMMANDS,
    nextAction: closeCard ? `Continue ${ENGINE_001_NEXT_CARD_ID}.` : 'Close ENGINE-001 before MEMORY-005.',
    closeoutKey: ENGINE_001_CLOSEOUT_KEY,
    approvalRef: ENGINE_001_APPROVAL_PATH,
  })
  if (cardIndex >= 0) merged[cardIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  const nextIndex = merged.findIndex(item => item.cardId === ENGINE_001_NEXT_CARD_ID)
  if (nextIndex >= 0) {
    merged[nextIndex] = {
      ...merged[nextIndex],
      stage: closeCard && merged[nextIndex].stage !== 'done_this_sprint' ? 'scoping' : merged[nextIndex].stage,
      nextAction: ensureTextIncludes(merged[nextIndex].nextAction || '', closeCard ? `Continue after ${ENGINE_001_CLOSEOUT_KEY}.` : 'Wait for ENGINE-001 closeout.'),
    }
  }
  merged.sort((a, b) => Number(a.order || a.sprintOrder || 0) - Number(b.order || b.sprintOrder || 0))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
        status: 'active',
        goal: sprintRecord?.goal || 'Continue unattended Foundation work from source-truth into data health and operating control.',
        activeBlockerCardId: closeCard ? ENGINE_001_NEXT_CARD_ID : ENGINE_001_CARD_ID,
        metadata: {
          ...(sprintRecord?.metadata || {}),
          currentStatus: closeCard ? 'memory_005_scoping' : 'engine_001_active',
          lastClosedCardId: closeCard ? ENGINE_001_CARD_ID : sprintRecord?.metadata?.lastClosedCardId,
          lastCloseoutKey: closeCard ? ENGINE_001_CLOSEOUT_KEY : sprintRecord?.metadata?.lastCloseoutKey,
        },
      },
      items: merged,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
      reason: `${ENGINE_001_CARD_ID} ${closeCard ? 'closes planning attrition input and advances to MEMORY-005' : 'owns the active blocker'}.`,
    },
  )
}

async function writeCloseout({ snapshot = [], evaluation = {} }) {
  const closeout = renderEngine001Closeout({
    snapshot: {
      planningAttritionValue: evaluation.summary?.planningAttritionValue,
    },
    evaluation,
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, ENGINE_001_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, ENGINE_001_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: ENGINE_001_SCRIPT_PATH,
      operation: 'close ENGINE-001 and advance Current Sprint',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
  }

  let dbInitialized = false
  try {
    const checks = []
    const [
      planSource,
      sourceSnapshotSource,
      docRendererSource,
      foundationDocRendererSource,
      agentEngineDocSource,
      freedomBlueprintSource,
      closeoutRegistrySource,
      packageJson,
      approvalValidation,
    ] = await Promise.all([
      readRepoFile(ENGINE_001_PLAN_PATH),
      readRepoFile('lib/foundation-strategy-source-snapshots.js'),
      readRepoFile('public/doc.js'),
      readRepoFile('public/foundation-doc-markdown-renderers.js'),
      readRepoFile('docs/strategy/agent-engine.md'),
      readRepoFile('docs/rebuild/freedom-rebuild-blueprint.md'),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoJson('package.json'),
      validatePlanApprovalFile({ repoRoot, approvalRef: ENGINE_001_APPROVAL_PATH, cardId: ENGINE_001_CARD_ID }),
    ])
    const approval = approvalValidation.approval || {}
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: buildCardRow({ closeCard: args.closeCard }),
      changedFiles: ENGINE_001_CHANGED_FILES,
      declaredRisk: 'Agent Engine source snapshot, frontend doc rendering, Current Sprint progression, package scripts, closeout registry',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)

    await initFoundationDb()
    dbInitialized = true
    const sourceSnapshot = await getDocSourceSnapshot('docs/strategy/agent-engine.md')
    const activeSprint = await getActiveFoundationCurrentSprint()
    const cards = await getBacklogItemsByIds([ENGINE_001_CARD_ID, ENGINE_001_NEXT_CARD_ID])
    const planCriticRuns = await getPlanCriticRunsByCardIds([ENGINE_001_CARD_ID])
    const closeout = getFoundationBuildCloseouts().find(record => record.key === ENGINE_001_CLOSEOUT_KEY)
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId
    const packageScript = packageJson.scripts?.['process:engine-001-check']
    const evaluation = evaluateEngine001PlanningAttrition({
      sourceSnapshot,
      sourceSnapshotSource,
      docRendererSource,
      foundationDocRendererSource,
      agentEngineDocSource,
      freedomBlueprintSource,
      closeoutRegistrySource,
    })
    const dogfood = buildEngine001DogfoodProof()

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'ENGINE-001 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || ENGINE_001_APPROVAL_PATH)
    addCheck(checks, approval.cardId === ENGINE_001_CARD_ID && Number(approval.score) >= 9.8, 'ENGINE-001 approval score is 9.8+', `${approval.cardId || 'missing'} / ${approval.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes ENGINE-001 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === ENGINE_001_CARD_ID), 'ENGINE-001 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, cards.some(card => card.id === ENGINE_001_NEXT_CARD_ID), 'MEMORY-005 next card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === ENGINE_001_CARD_ID || (args.closeCard && currentActiveBlocker === ENGINE_001_NEXT_CARD_ID), 'Current Sprint owns ENGINE-001 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, evaluation.ok, 'ENGINE-001 planning attrition source snapshot is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
    addCheck(checks, dogfood.ok, 'ENGINE-001 dogfood rejects false-greens', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${ENGINE_001_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    for (const relativePath of ENGINE_001_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/') || file.startsWith('public/'))) {
      const willWriteCloseout = args.closeCard && relativePath === ENGINE_001_CLOSEOUT_PATH
      const closeoutPending = !args.closeCard && relativePath === ENGINE_001_CLOSEOUT_PATH
      addCheck(
        checks,
        willWriteCloseout || closeoutPending || await repoFileExists(relativePath),
        `${relativePath} exists`,
        willWriteCloseout || closeoutPending ? 'will be written on close' : relativePath,
      )
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(ENGINE_001_CARD_ID), 'closeout registry exposes ENGINE-001', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.closeCard, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending write')

    if (args.closeCard) {
      const nextCard = cards.find(card => card.id === ENGINE_001_NEXT_CARD_ID) || {}
      await upsertPlanCriticRun(planReview)
      await upsertBacklogRows({ closeCard: true, nextCard })
      await upsertCurrentSprint({ closeCard: true, activeSprint })
      await writeCloseout({ sourceSnapshot, evaluation })
    }

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: ENGINE_001_CARD_ID,
      closeoutKey: ENGINE_001_CLOSEOUT_KEY,
      nextCardId: ENGINE_001_NEXT_CARD_ID,
      generatedAt: new Date().toISOString(),
      closed: args.closeCard,
      planSummary,
      summary: {
        checks: checks.length,
        failed: failed.length,
        ...evaluation.summary,
      },
      checks,
      failed,
      dogfood,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`ENGINE-001 status: ${report.status}`)
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
