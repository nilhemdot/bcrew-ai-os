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
import { getSourceContracts } from '../lib/source-contracts.js'
import {
  DATA_001_APPROVAL_PATH,
  DATA_001_CARD_ID,
  DATA_001_CHANGED_FILES,
  DATA_001_CLOSEOUT_KEY,
  DATA_001_CLOSEOUT_PATH,
  DATA_001_NEXT_CARD_ID,
  DATA_001_NOT_NEXT_BOUNDARIES,
  DATA_001_PLAN_PATH,
  DATA_001_PROOF_COMMANDS,
  DATA_001_SCRIPT_PATH,
  buildData001DogfoodProof,
  evaluateData001LiveStatus,
  renderData001Closeout,
} from '../lib/data-001-freedom-source-adapter.js'
import { runSheetsStructureVerification } from './sheets-structure-verify.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-data-001'

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
    reused: 'Reuses the existing delegated Google Sheets structure verifier, source contracts, Freedom source note, Current State sheet watch, Current Sprint, Plan Critic, and ship gates.',
    readyAt: '2026-05-20T08:25:00-04:00',
    readyBy: 'Steve approved unattended Foundation continuation and FOUNDATION-004 advanced the sprint to DATA-001.',
    exactGap: 'Freedom was signed off for current meaning, but downstream work still lacked a source-ID mapped adapter and schema-drift monitor for the live workbook structure.',
    notRebuilt: 'No spreadsheet mutation, Drive permission mutation, ClickUp/FUB/finance write, OPS rollup repair, Agent Engine rebuild, DATA-003 UI expansion, live extraction, provider call, or browser automation.',
    existingCode: [
      'scripts/sheets-structure-verify.mjs',
      'lib/google-delegated.js',
      'lib/source-contracts.js',
      'server.js /api/sheets/structure-status',
      'public/foundation-current-state-renderers.js',
      'lib/process-plan-critic.js',
    ],
    existingDocs: [
      'docs/source-notes/freedom-sheet.md',
      'docs/rebuild/freedom-rebuild-blueprint.md',
      'docs/strategy/operating-truths.md',
      'docs/source-registry.md',
    ],
    existingPolicy: [
      'Live values belong in source systems and source-backed UI views, not markdown snapshots.',
      'Freedom is current strategy process map and spreadsheet-era planning logic, not final system-owned truth.',
      'Source notes own evidence/current process; backlog owns unresolved gaps.',
      'Blockers block unsafe actions, not the whole sprint when safe work remains.',
    ],
    existingScripts: [
      'sheets:verify',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
      'process:foundation-ship',
    ],
    overBroadRisk: 'DATA-001 can drift into rebuilding Freedom, OPS, Agent Engine, or DATA-003. V1 only creates read-only source-ID schema drift monitoring.',
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: DATA_001_CARD_ID,
    title: 'Build a Freedom Sheet source adapter and schema-drift monitor',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 4,
    source: 'Freedom Sheet foundation work',
    summary: 'Map the signed-off Freedom Sheet source IDs to live workbook structure and expose read-only schema-drift monitoring through the sheet data-health surface.',
    whyItMatters: 'Downstream OPS, Engine, and source-backed dashboard work should not trust blind cell references or stale header assumptions.',
    nextAction: closeCard
      ? `Done under \`${DATA_001_CLOSEOUT_KEY}\`; continue \`${DATA_001_NEXT_CARD_ID}\`.`
      : 'Ship the read-only Freedom source adapter and schema-drift monitor.',
    statusNote: closeCard
      ? `Closed under \`${DATA_001_CLOSEOUT_KEY}\`; Freedom source ID adapter and schema-drift data-health surface are live.`
      : `Executing \`${DATA_001_CLOSEOUT_KEY}\`; no source mutation or broad extraction.`,
    owner: 'Foundation Data',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: DATA_001_NEXT_CARD_ID,
    title: existing.title || 'Repair the ops-improvement rollup and remove the dead NPS Scores & Reviews dependency',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 4,
    nextAction: ensureTextIncludes(existing.nextAction || '', `Run after ${DATA_001_CLOSEOUT_KEY}; use the Freedom adapter/source boundaries instead of blind sheet references.`),
    statusNote: ensureTextIncludes(existing.statusNote || '', `Unblocked by ${DATA_001_CLOSEOUT_KEY}; next repair should fix the ops rollup source path, not repeat Freedom schema discovery.`),
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
        DATA_001_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${DATA_001_CARD_ID}.`,
        JSON.stringify({
          closeoutKey: DATA_001_CLOSEOUT_KEY,
          activeBlockerCardId: closeCard ? DATA_001_NEXT_CARD_ID : DATA_001_CARD_ID,
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
        `data-001-${stableRunId(DATA_001_PLAN_PATH)}`,
        DATA_001_CARD_ID,
        DATA_001_PLAN_PATH,
        planReview.status,
        planReview.score,
        DATA_001_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: DATA_001_CARD_ID,
          closeoutKey: DATA_001_CLOSEOUT_KEY,
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
    notNextBoundaries: Array.from(new Set([...(existing.notNextBoundaries || []), ...DATA_001_NOT_NEXT_BOUNDARIES])),
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
  const cardIndex = merged.findIndex(item => item.cardId === DATA_001_CARD_ID)
  const currentItem = existingById.get(DATA_001_CARD_ID) || {}
  const currentOrder = currentItem.order || currentItem.sprintOrder || 2
  const updatedCurrent = buildSprintItem({
    existing: currentItem,
    cardId: DATA_001_CARD_ID,
    order: currentOrder,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: DATA_001_PLAN_PATH,
    definitionOfDone: 'Freedom source IDs map to live workbook structure, schema drift fails closed, data-health surface exposes the adapter, and no source mutation or live-value hardcoding occurs.',
    proofCommands: DATA_001_PROOF_COMMANDS,
    nextAction: closeCard ? `Continue ${DATA_001_NEXT_CARD_ID}.` : 'Close DATA-001 before OPS-003.',
    closeoutKey: DATA_001_CLOSEOUT_KEY,
    approvalRef: DATA_001_APPROVAL_PATH,
  })
  if (cardIndex >= 0) merged[cardIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  const nextIndex = merged.findIndex(item => item.cardId === DATA_001_NEXT_CARD_ID)
  if (nextIndex >= 0) {
    merged[nextIndex] = {
      ...merged[nextIndex],
      stage: closeCard && merged[nextIndex].stage !== 'done_this_sprint' ? 'scoping' : merged[nextIndex].stage,
      nextAction: ensureTextIncludes(merged[nextIndex].nextAction || '', closeCard ? `Continue after ${DATA_001_CLOSEOUT_KEY}.` : 'Wait for DATA-001 closeout.'),
    }
  }
  merged.sort((a, b) => Number(a.order || a.sprintOrder || 0) - Number(b.order || b.sprintOrder || 0))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
        status: 'active',
        goal: sprintRecord?.goal || 'Continue unattended Foundation work from source-truth into data health and operating control.',
        activeBlockerCardId: closeCard ? DATA_001_NEXT_CARD_ID : DATA_001_CARD_ID,
        metadata: {
          ...(sprintRecord?.metadata || {}),
          currentStatus: closeCard ? 'ops_003_scoping' : 'data_001_active',
          lastClosedCardId: closeCard ? DATA_001_CARD_ID : sprintRecord?.metadata?.lastClosedCardId,
          lastCloseoutKey: closeCard ? DATA_001_CLOSEOUT_KEY : sprintRecord?.metadata?.lastCloseoutKey,
        },
      },
      items: merged,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
      reason: `${DATA_001_CARD_ID} ${closeCard ? 'closes Freedom adapter and advances to OPS-003' : 'owns the active blocker'}.`,
    },
  )
}

async function writeCloseout(status) {
  const closeout = renderData001Closeout({
    status,
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, DATA_001_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, DATA_001_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
      commandName: 'process-data-001-check',
      summary: 'close DATA-001 Freedom source adapter and advance Current Sprint',
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
      sheetStructureStatus,
    ] = await Promise.all([
      readRepoFile(DATA_001_PLAN_PATH),
      readRepoFile('lib/data-001-freedom-source-adapter.js'),
      readRepoFile('scripts/sheets-structure-verify.mjs'),
      readRepoFile('public/foundation-current-state-renderers.js'),
      readRepoFile('docs/source-notes/freedom-sheet.md'),
      readRepoJson('package.json'),
      validatePlanApprovalFile({ repoRoot, approvalRef: DATA_001_APPROVAL_PATH, cardId: DATA_001_CARD_ID }),
      runSheetsStructureVerification(),
    ])
    const approval = approvalValidation.approval || {}
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: buildCardRow({ closeCard: args.closeCard }),
      changedFiles: DATA_001_CHANGED_FILES,
      declaredRisk: 'Freedom source schema drift, live delegated Sheets read path, data-health exposure, Current Sprint progression, and closeout registry',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)
    const status = evaluateData001LiveStatus({
      sheetStructureStatus,
      sourceContracts: getSourceContracts(),
      moduleSource,
      sheetVerifySource,
      rendererSource,
      planSource,
      freedomNote,
    })
    const dogfood = buildData001DogfoodProof()

    await initFoundationDb()
    dbInitialized = true
    const activeSprint = await getActiveFoundationCurrentSprint()
    const cards = await getBacklogItemsByIds([DATA_001_CARD_ID, DATA_001_NEXT_CARD_ID])
    const planCriticRuns = await getPlanCriticRunsByCardIds([DATA_001_CARD_ID])
    const closeout = getFoundationBuildCloseouts().find(record => record.key === DATA_001_CLOSEOUT_KEY)
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId
    const packageScript = packageJson.scripts?.['process:data-001-check']

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'DATA-001 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || DATA_001_APPROVAL_PATH)
    addCheck(checks, approval.cardId === DATA_001_CARD_ID && Number(approval.score) >= 9.8, 'DATA-001 approval score is 9.8+', `${approval.cardId || 'missing'} / ${approval.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes DATA-001 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === DATA_001_CARD_ID), 'DATA-001 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, cards.some(card => card.id === DATA_001_NEXT_CARD_ID), 'OPS-003 next card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === DATA_001_CARD_ID || (args.closeCard && currentActiveBlocker === DATA_001_NEXT_CARD_ID), 'Current Sprint owns DATA-001 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, status.ok, 'DATA-001 live Freedom adapter status is healthy', status.failed.map(item => item.check).join('; ') || `${status.checks.length}/${status.checks.length}`)
    addCheck(checks, dogfood.ok, 'DATA-001 dogfood rejects false-greens', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${DATA_001_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    addCheck(checks, sheetStructureStatus.freedomSheetAdapter?.status === 'healthy' && sheetStructureStatus.dataHealth?.freedomSheetAdapter?.status === 'healthy', 'sheet structure result exposes Freedom data-health adapter', sheetStructureStatus.freedomSheetAdapter?.status || 'missing')
    for (const relativePath of DATA_001_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/') || file.startsWith('public/'))) {
      const willWriteCloseout = args.closeCard && relativePath === DATA_001_CLOSEOUT_PATH
      addCheck(checks, willWriteCloseout || await repoFileExists(relativePath), `${relativePath} exists`, willWriteCloseout ? 'will be written on close' : relativePath)
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(DATA_001_CARD_ID), 'closeout registry exposes DATA-001', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.closeCard, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending close')

    if (args.closeCard) {
      const nextCard = cards.find(card => card.id === DATA_001_NEXT_CARD_ID) || {}
      await upsertPlanCriticRun(planReview)
      await upsertBacklogRows({ closeCard: true, nextCard })
      await upsertCurrentSprint({ closeCard: true, activeSprint })
      await writeCloseout(status)
    }

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: DATA_001_CARD_ID,
      closeoutKey: DATA_001_CLOSEOUT_KEY,
      nextCardId: DATA_001_NEXT_CARD_ID,
      generatedAt: new Date().toISOString(),
      closed: args.closeCard,
      planSummary,
      summary: {
        checks: checks.length,
        failed: failed.length,
        freedomAdapterStatus: status.snapshot?.status || null,
        freedomSources: status.snapshot?.summary?.sourceCount || 0,
        healthyFreedomSources: status.snapshot?.summary?.healthySourceCount || 0,
      },
      freedomSheetAdapter: status.snapshot,
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`DATA-001 status: ${report.status}`)
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
