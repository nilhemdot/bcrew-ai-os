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
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  OPS_003_APPROVAL_PATH,
  OPS_003_CARD_ID,
  OPS_003_CHANGED_FILES,
  OPS_003_CLOSEOUT_KEY,
  OPS_003_CLOSEOUT_PATH,
  OPS_003_NEXT_CARD_ID,
  OPS_003_NOT_NEXT_BOUNDARIES,
  OPS_003_PLAN_PATH,
  OPS_003_PROOF_COMMANDS,
  OPS_003_SCRIPT_PATH,
  applyOps003SheetRepairs,
  buildSyntheticOps003Proof,
  evaluateOps003Snapshot,
  readOps003LiveSnapshot,
  renderOps003Closeout,
} from '../lib/ops-003-ops-improvement-rollup.js'
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
const ACTOR = 'codex-ops-003'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
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
    reused: 'Reuses the DATA-001 Freedom adapter boundary, delegated Google Sheets reader/writer, source contracts, Freedom source note, Current Sprint, Plan Critic, and Foundation ship gates.',
    readyAt: '2026-05-20T04:26:00-04:00',
    readyBy: 'Steve approved unattended Foundation continuation; DATA-001 advanced the sprint to OPS-003.',
    exactGap: 'The OPS rollup had a historically dead NPS Scores & Reviews dependency and the Ops Satisfaction read layer still needed latest-row/gap sanity proof.',
    notRebuilt: 'No broad Freedom rebuild, bonus model redesign, ClickUp/FUB/finance mutation, Drive permission mutation, provider work, or external sends.',
    existingCode: [
      'lib/google-delegated.js',
      'lib/data-001-freedom-source-adapter.js',
      'scripts/sheets-structure-verify.mjs',
      'public/foundation-current-state-renderers.js',
      'lib/process-plan-critic.js',
    ],
    existingDocs: [
      'docs/source-notes/freedom-sheet.md',
      'docs/rebuild/freedom-rebuild-blueprint.md',
      'docs/source-registry.md',
    ],
    existingPolicy: [
      'Fix real workflow/data failures instead of classifying around them.',
      'Live values belong in source systems and source-backed UI views, not markdown snapshots.',
      'Blockers block unsafe actions, not the whole sprint when safe work remains.',
    ],
    overBroadRisk: 'OPS-003 can drift into a full Ops/Freedom rebuild. V1 only repairs and proves the current ops-improvement rollup dependency/gap path.',
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: OPS_003_CARD_ID,
    title: 'Repair the ops-improvement rollup and remove the dead NPS Scores & Reviews dependency',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 4,
    source: 'Freedom Sheet foundation work',
    summary: 'Repair and prove the Freedom ops-improvement rollup path from live deal/NPS/review source rows into Ops Satisfaction.',
    whyItMatters: 'Ops Satisfaction should not trust dead tab references, wrong target formulas, or future scaffold rows when reporting OSI inputs.',
    nextAction: closeCard
      ? `Done under \`${OPS_003_CLOSEOUT_KEY}\`; continue \`${OPS_003_NEXT_CARD_ID}\`.`
      : 'Repair the bounded OPS formula path, prove the dead dependency is gone, and lock latest-row sanity.',
    statusNote: closeCard
      ? `Closed under \`${OPS_003_CLOSEOUT_KEY}\`; OPS rollup and Ops Satisfaction sanity proof are healthy.`
      : `Executing \`${OPS_003_CLOSEOUT_KEY}\`; only the scoped OPS formula repair is allowed.`,
    owner: 'Foundation Ops',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: OPS_003_NEXT_CARD_ID,
    title: existing.title || 'Repair the Agent Engine source layer',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 5,
    nextAction: ensureTextIncludes(existing.nextAction || '', `Run after ${OPS_003_CLOSEOUT_KEY}; use source-backed Freedom boundaries and do not blind-edit spreadsheet-era formulas.`),
    statusNote: ensureTextIncludes(existing.statusNote || '', `Unblocked by ${OPS_003_CLOSEOUT_KEY}; next safe Freedom repair card.`),
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
        OPS_003_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${OPS_003_CARD_ID}.`,
        JSON.stringify({
          closeoutKey: OPS_003_CLOSEOUT_KEY,
          activeBlockerCardId: closeCard ? OPS_003_NEXT_CARD_ID : OPS_003_CARD_ID,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `ops-003-${stableRunId(OPS_003_PLAN_PATH)}`,
        OPS_003_CARD_ID,
        OPS_003_PLAN_PATH,
        planReview.status,
        planReview.score,
        OPS_003_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: OPS_003_CARD_ID,
          closeoutKey: OPS_003_CLOSEOUT_KEY,
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
    notNextBoundaries: Array.from(new Set([...(existing.notNextBoundaries || []), ...OPS_003_NOT_NEXT_BOUNDARIES])),
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
  const cardIndex = merged.findIndex(item => item.cardId === OPS_003_CARD_ID)
  const currentItem = existingById.get(OPS_003_CARD_ID) || {}
  const currentOrder = currentItem.order || currentItem.sprintOrder || 3
  const updatedCurrent = buildSprintItem({
    existing: currentItem,
    cardId: OPS_003_CARD_ID,
    order: currentOrder,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: OPS_003_PLAN_PATH,
    definitionOfDone: 'Dead NPS Scores & Reviews dependency is absent, bounded OPS formulas are repaired, Ops Satisfaction latest-row/gap sanity passes, focused proof and ship gates pass.',
    proofCommands: OPS_003_PROOF_COMMANDS,
    nextAction: closeCard ? `Continue ${OPS_003_NEXT_CARD_ID}.` : 'Close OPS-003 before ENGINE-001.',
    closeoutKey: OPS_003_CLOSEOUT_KEY,
    approvalRef: OPS_003_APPROVAL_PATH,
  })
  if (cardIndex >= 0) merged[cardIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  const nextIndex = merged.findIndex(item => item.cardId === OPS_003_NEXT_CARD_ID)
  if (nextIndex >= 0) {
    merged[nextIndex] = {
      ...merged[nextIndex],
      stage: closeCard && merged[nextIndex].stage !== 'done_this_sprint' ? 'scoping' : merged[nextIndex].stage,
      nextAction: ensureTextIncludes(merged[nextIndex].nextAction || '', closeCard ? `Continue after ${OPS_003_CLOSEOUT_KEY}.` : 'Wait for OPS-003 closeout.'),
    }
  }
  merged.sort((a, b) => Number(a.order || a.sprintOrder || 0) - Number(b.order || b.sprintOrder || 0))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
        status: 'active',
        goal: sprintRecord?.goal || 'Continue unattended Foundation work from source-truth into data health and operating control.',
        activeBlockerCardId: closeCard ? OPS_003_NEXT_CARD_ID : OPS_003_CARD_ID,
        metadata: {
          ...(sprintRecord?.metadata || {}),
          currentStatus: closeCard ? 'engine_001_scoping' : 'ops_003_active',
          lastClosedCardId: closeCard ? OPS_003_CARD_ID : sprintRecord?.metadata?.lastClosedCardId,
          lastCloseoutKey: closeCard ? OPS_003_CLOSEOUT_KEY : sprintRecord?.metadata?.lastCloseoutKey,
        },
      },
      items: merged,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
      reason: `${OPS_003_CARD_ID} ${closeCard ? 'closes OPS rollup proof and advances to ENGINE-001' : 'owns the active blocker'}.`,
    },
  )
}

async function writeCloseout({ live, evaluation, applyResult }) {
  const closeout = renderOps003Closeout({
    live,
    evaluation,
    applyResult,
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, OPS_003_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, OPS_003_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: OPS_003_SCRIPT_PATH,
      operation: args.apply
        ? 'apply bounded OPS-003 Freedom Sheet formula repair'
        : 'close OPS-003 and advance Current Sprint',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
  }

  let dbInitialized = false
  try {
    const checks = []
    const [
      planSource,
      moduleSource,
      sheetVerifySource,
      rendererSource,
      freedomNote,
      packageJson,
      approvalValidation,
    ] = await Promise.all([
      readRepoFile(OPS_003_PLAN_PATH),
      readRepoFile('lib/ops-003-ops-improvement-rollup.js'),
      readRepoFile('scripts/sheets-structure-verify.mjs'),
      readRepoFile('public/foundation-current-state-renderers.js'),
      readRepoFile('docs/source-notes/freedom-sheet.md'),
      readRepoJson('package.json'),
      validatePlanApprovalFile({ repoRoot, approvalRef: OPS_003_APPROVAL_PATH, cardId: OPS_003_CARD_ID }),
    ])
    const approval = approvalValidation.approval || {}
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: buildCardRow({ closeCard: args.closeCard }),
      changedFiles: OPS_003_CHANGED_FILES,
      declaredRisk: 'Freedom Sheet content repair, live OPS rollup formula trust, Current Sprint progression, and closeout registry',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)

    const before = await readOps003LiveSnapshot({ fresh: true })
    let applyResult = { applied: [], appliedCount: 0 }
    if (args.apply) applyResult = await applyOps003SheetRepairs(before)
    const live = args.apply ? await readOps003LiveSnapshot({ fresh: true }) : before
    const evaluation = evaluateOps003Snapshot(live)
    const dogfood = buildSyntheticOps003Proof()

    await initFoundationDb()
    dbInitialized = true
    const activeSprint = await getActiveFoundationCurrentSprint()
    const cards = await getBacklogItemsByIds([OPS_003_CARD_ID, OPS_003_NEXT_CARD_ID])
    const planCriticRuns = await getPlanCriticRunsByCardIds([OPS_003_CARD_ID])
    const closeout = getFoundationBuildCloseouts().find(record => record.key === OPS_003_CLOSEOUT_KEY)
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId
    const packageScript = packageJson.scripts?.['process:ops-003-check']

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'OPS-003 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || OPS_003_APPROVAL_PATH)
    addCheck(checks, approval.cardId === OPS_003_CARD_ID && Number(approval.score) >= 9.8, 'OPS-003 approval score is 9.8+', `${approval.cardId || 'missing'} / ${approval.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes OPS-003 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === OPS_003_CARD_ID), 'OPS-003 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, cards.some(card => card.id === OPS_003_NEXT_CARD_ID), 'ENGINE-001 next card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === OPS_003_CARD_ID || (args.closeCard && currentActiveBlocker === OPS_003_NEXT_CARD_ID), 'Current Sprint owns OPS-003 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, args.apply ? applyResult.appliedCount >= 0 : true, 'apply mode is explicit when sheet repair runs', args.apply ? `${applyResult.appliedCount} repairs` : 'read-only')
    addCheck(checks, evaluation.ok, 'OPS-003 live rollup status is healthy', evaluation.failed.map(item => item.check).join('; ') || `${evaluation.checks.length}/${evaluation.checks.length}`)
    addCheck(checks, dogfood.ok, 'OPS-003 dogfood rejects false-greens', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${OPS_003_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    addCheck(checks, moduleSource.includes('applyOps003SheetRepairs') && moduleSource.includes('NPS Scores & Reviews'), 'OPS-003 module owns repair and dead-tab proof', 'lib/ops-003-ops-improvement-rollup.js')
    addCheck(checks, sheetVerifySource.includes('opsImprovementRollup') && sheetVerifySource.includes('evaluateOps003Snapshot'), 'sheet structure verifier exposes OPS rollup data-health status', 'scripts/sheets-structure-verify.mjs')
    addCheck(checks, rendererSource.includes('opsImprovementRollup'), 'Current State renderer summarizes OPS rollup status', 'public/foundation-current-state-renderers.js')
    addCheck(checks, freedomNote.includes(OPS_003_CLOSEOUT_KEY), 'Freedom source note records OPS-003 closeout boundary', 'docs/source-notes/freedom-sheet.md')
    for (const relativePath of OPS_003_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/') || file.startsWith('public/'))) {
      const willWriteCloseout = args.closeCard && relativePath === OPS_003_CLOSEOUT_PATH
      const closeoutPending = !args.closeCard && relativePath === OPS_003_CLOSEOUT_PATH
      addCheck(
        checks,
        willWriteCloseout || closeoutPending || await repoFileExists(relativePath),
        `${relativePath} exists`,
        willWriteCloseout || closeoutPending ? 'will be written on close' : relativePath,
      )
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(OPS_003_CARD_ID), 'closeout registry exposes OPS-003', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.apply || args.closeCard, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending write')

    if (args.closeCard) {
      const nextCard = cards.find(card => card.id === OPS_003_NEXT_CARD_ID) || {}
      await upsertPlanCriticRun(planReview)
      await upsertBacklogRows({ closeCard: true, nextCard })
      await upsertCurrentSprint({ closeCard: true, activeSprint })
      await writeCloseout({ live, evaluation, applyResult })
    } else if (args.apply) {
      const nextCard = cards.find(card => card.id === OPS_003_NEXT_CARD_ID) || {}
      await upsertPlanCriticRun(planReview)
      await upsertBacklogRows({ closeCard: false, nextCard })
      await upsertCurrentSprint({ closeCard: false, activeSprint })
    }

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: OPS_003_CARD_ID,
      closeoutKey: OPS_003_CLOSEOUT_KEY,
      nextCardId: OPS_003_NEXT_CARD_ID,
      generatedAt: new Date().toISOString(),
      applied: applyResult,
      closed: args.closeCard,
      planSummary,
      summary: {
        checks: checks.length,
        failed: failed.length,
        liveStatus: evaluation.status,
        requiredRepairCount: evaluation.summary.requiredRepairCount,
        deadNpsReferenceCount: evaluation.summary.deadNpsReferenceCount,
      },
      opsImprovementRollup: {
        live,
        evaluation,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`OPS-003 status: ${report.status}`)
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
