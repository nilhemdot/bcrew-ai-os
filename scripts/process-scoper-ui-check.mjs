#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
  SCOPER_UI_APPROVAL_PATH,
  SCOPER_UI_CARD_ID,
  SCOPER_UI_CHANGED_FILES,
  SCOPER_UI_CLOSEOUT_KEY,
  SCOPER_UI_CLOSEOUT_PATH,
  SCOPER_UI_NEXT_CARD_ID,
  SCOPER_UI_NOT_NEXT_BOUNDARIES,
  SCOPER_UI_PLAN_PATH,
  SCOPER_UI_PROOF_COMMANDS,
  SCOPER_UI_SCRIPT_PATH,
  SCOPER_UI_SPRINT_ID,
  buildScoperUiDogfoodProof,
  buildScoperUiSnapshot,
  evaluateScoperUiSnapshot,
} from '../lib/scoper-ui.js'
import { getStrategyPlanningEvidenceSnapshot } from '../lib/strategy-planning-workflow.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-scoper-ui'

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
    id: SCOPER_UI_CARD_ID,
    title: 'Render gap-resolving Scoper output in the Strategy Hub',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 32,
    source: '2026-04-28 deep audit gap, INTEL-SCOPER-001 closeout, INTEL-THREAD-CONTEXT-001 closeout, and Current Sprint active blocker.',
    summary: 'Render existing proposal-only Scoper outputs in Strategy Hub v2 with collapsible sections, evidence links, owner suggestions, next steps, and blocked auto-action boundaries.',
    whyItMatters: 'The Scoper backend is only useful if Steve can read and discuss outputs during Strategy review without digging through raw JSON or DB rows.',
    nextAction: closeCard
      ? `Done under ${SCOPER_UI_CLOSEOUT_KEY}; continue ${SCOPER_UI_NEXT_CARD_ID}.`
      : 'Render Scoper output in Strategy Hub without auto-creating backlog cards, applying routes, running extraction, or changing source systems.',
    statusNote: closeCard
      ? `Closed v1 under ${SCOPER_UI_CLOSEOUT_KEY}; Strategy Hub renders Scoper outputs and route-linked Scoper context without mutating action/backlog/source systems.`
      : 'Executing v1: Strategy Hub Scoper display only; no new source/extract/provider/action apply work.',
    owner: 'Foundation Intelligence',
  }
}

function buildNextCardRow(existing = {}) {
  const existingNextAction = text(existing.nextAction ?? existing.next_action, 'Scope SOURCE-001 before build; preserve existing source-contract proof boundaries.')
  const existingStatusNote = text(existing.statusNote ?? existing.status_note, 'Next safe source-contract card in the live sprint order.')
  return {
    ...existing,
    id: SCOPER_UI_NEXT_CARD_ID,
    title: existing.title || 'Revalidate Gmail source contract',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 33,
    nextAction: existingNextAction,
    statusNote: `${existingStatusNote} Unblocked by ${SCOPER_UI_CLOSEOUT_KEY}; scope/proof required before build.`.trim(),
    owner: existing.owner || 'Foundation Source',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/intel-scoper.js',
      'lib/strategy-planning-workflow.js',
      'lib/strategy-shared-comms-routes.js',
      'public/strategic-execution.js',
      'public/styles-strategy-sales.css',
    ],
    existingTables: [
      'intelligence_scoper_outputs',
      'intelligence_strategic_issues',
      'intelligence_action_routes',
    ],
    existingDocs: [
      SCOPER_UI_PLAN_PATH,
      'docs/process/intel-scoper-001-plan.md',
      'docs/process/intel-thread-context-001-plan.md',
      'docs/process/strategy-004-planning-workflow-plan.md',
      'docs/process/strategy-009-package-ux-plan.md',
    ],
    existingScripts: [
      'process:intel-scoper-check',
      'process:intel-thread-context-check',
      'process:strategy-004-check',
      'process:strategy-009-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
    ],
    existingPolicy: [
      'Scoper output is proposal-only.',
      'Action routing remains human-approved.',
      'No backlog work is auto-created from Scoper output.',
      'Blocked actions must stay visible in the UI.',
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Drive permissions.',
      'Meeting Vault Phase B and Drive permissions remain outside this card.',
    ],
    exactGap: 'INTEL-SCOPER-001 created durable outputs, but Strategy Hub did not render their verified, partial, gap, owner, next-step, and proof sections for live review.',
    overBroadRisk: 'The card can drift into source contracts, extraction, provider calls, route apply workflow, or auto-created backlog work. V1 renders existing outputs only.',
    reused: [
      'Existing Scoper output ledger.',
      'Existing Planning Workflow section.',
      'Existing Strategy route review path.',
      'Existing human approval boundary.',
    ],
    notRebuilt: [
      'No new Scoper backend.',
      'No action-route apply changes.',
      'No backlog auto-create workflow.',
      'No source/extract/provider/browser work.',
    ],
    readyBy: 'Steve unattended Foundation sprint approval',
    readyAt: '2026-05-20T03:20:00-04:00',
  }
}

function buildSprintItemFromExisting(item = {}, { closeCard = false } = {}) {
  if (item.cardId !== SCOPER_UI_CARD_ID) return item
  return {
    ...item,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: SCOPER_UI_PLAN_PATH,
    definitionOfDone: 'Strategy Hub v2 renders Scoper output from existing intelligence_scoper_outputs with collapsible verified/partial/gap/owner/next-step sections, clickable evidence refs, route-linked context, and blocked auto-actions; no backlog card, route apply, extraction, provider, or source-system mutation is introduced.',
    proofCommands: SCOPER_UI_PROOF_COMMANDS,
    readinessBlockerCleared: 'INTEL-SCOPER-001 and INTEL-THREAD-CONTEXT-001 are shipped; Current Sprint advanced to SCOPER-UI-001.',
    notNextBoundaries: SCOPER_UI_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      owner: 'Foundation Intelligence',
      closeoutKey: SCOPER_UI_CLOSEOUT_KEY,
      approvalRef: SCOPER_UI_APPROVAL_PATH,
    },
  }
}

function ensureSprintHasTarget(items = []) {
  if (items.some(item => item.cardId === SCOPER_UI_CARD_ID)) return items
  return [
    ...items,
    {
      cardId: SCOPER_UI_CARD_ID,
      order: items.length + 1,
      stage: 'building_now',
      title: 'Render gap-resolving Scoper output in the Strategy Hub',
    },
  ]
}

async function upsertLiveRows({ closeCard = false, planReview }) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard })
  try {
    await client.query('BEGIN')
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
    const nextExisting = await client.query('SELECT * FROM backlog_items WHERE id = $1', [SCOPER_UI_NEXT_CARD_ID])
    const nextRow = buildNextCardRow(nextExisting.rows[0] || {})
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, next_action, status_note, owner
        )
        VALUES ($1,$2,'foundation',$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE
        SET lane = CASE WHEN backlog_items.lane = 'done' THEN backlog_items.lane ELSE EXCLUDED.lane END,
            priority = EXCLUDED.priority,
            next_action = EXCLUDED.next_action,
            status_note = EXCLUDED.status_note,
            owner = COALESCE(NULLIF(EXCLUDED.owner, ''), backlog_items.owner),
            updated_at = NOW()
      `,
      [nextRow.id, nextRow.title, nextRow.lane, nextRow.priority, nextRow.rank, nextRow.nextAction, nextRow.statusNote, nextRow.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `scoper-ui-${stableRunId(SCOPER_UI_PLAN_PATH)}`,
        SCOPER_UI_CARD_ID,
        SCOPER_UI_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        SCOPER_UI_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: SCOPER_UI_CARD_ID }),
        ACTOR,
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,$3,$4,$5::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        SCOPER_UI_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${SCOPER_UI_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SCOPER_UI_CLOSEOUT_KEY, nextCardId: SCOPER_UI_NEXT_CARD_ID }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function ensureLiveState({ closeCard = false, planReview }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCOPER_UI_SCRIPT_PATH,
    operation: `create/update ${SCOPER_UI_CARD_ID} card, Plan Critic row, and Current Sprint overlay`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveRows({ closeCard, planReview })
  const baseItems = ensureSprintHasTarget(previous.items || [])
  const items = baseItems.map(item => {
    if (item.cardId === SCOPER_UI_NEXT_CARD_ID && closeCard) {
      return { ...item, stage: item.stage === 'done_this_sprint' ? item.stage : 'scoping' }
    }
    return buildSprintItemFromExisting(item, { closeCard })
  })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || SCOPER_UI_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? SCOPER_UI_NEXT_CARD_ID : SCOPER_UI_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'next_scoping' : 'building_now',
          closeoutKey: SCOPER_UI_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue ${SCOPER_UI_NEXT_CARD_ID}.`
            : 'Render Scoper output in Strategy Hub planning workflow.',
          notNext: SCOPER_UI_NOT_NEXT_BOUNDARIES,
        },
      },
      items,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve approved unattended Foundation execution; render Scoper UI and continue next safe card.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(SCOPER_UI_PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: SCOPER_UI_CHANGED_FILES,
    declaredRisk: 'Scoper UI can drift into source/extraction work, route apply mutation, auto-created backlog cards, provider calls, or broad Strategy redesign.',
    repoRoot,
  })
  if (args.closeCard) await ensureLiveState({ closeCard: true, planReview })

  const [
    approval,
    packageJson,
    scoperUiSource,
    planningSource,
    uiSource,
    styleSource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    scriptSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: SCOPER_UI_APPROVAL_PATH, cardId: SCOPER_UI_CARD_ID }),
    readRepoJson('package.json'),
    readRepoFile('lib/scoper-ui.js'),
    readRepoFile('lib/strategy-planning-workflow.js'),
    readRepoFile('public/strategic-execution.js'),
    readRepoFile('public/styles-strategy-sales.css'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(SCOPER_UI_CLOSEOUT_PATH, { optional: true }),
    readRepoFile(SCOPER_UI_SCRIPT_PATH),
  ])

  const dogfood = buildScoperUiDogfoodProof()
  const planningEvidence = await getStrategyPlanningEvidenceSnapshot({ issueLimit: 25, scoperLimit: 25 })
  const liveScoperUi = buildScoperUiSnapshot({
    scoperOutputs: planningEvidence.scoperOutputs || [],
    generatedAt: planningEvidence.generatedAt,
  })
  const liveEvaluation = evaluateScoperUiSnapshot(liveScoperUi)

  await initFoundationDb()
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (sprint.items || []).map(item => item.cardId).filter(Boolean)
  const cardIds = Array.from(new Set([SCOPER_UI_CARD_ID, SCOPER_UI_NEXT_CARD_ID, ...sprintCardIds]))
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds(cardIds),
    getPlanCriticRunsByCardIds(cardIds),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === SCOPER_UI_CARD_ID) || null
  const nextCard = cards.find(item => item.id === SCOPER_UI_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === SCOPER_UI_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === SCOPER_UI_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === SCOPER_UI_CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    backlogItems: cards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || SCOPER_UI_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === SCOPER_UI_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.activeBlockerCardId === (args.closeCard ? SCOPER_UI_NEXT_CARD_ID : SCOPER_UI_CARD_ID), 'Current Sprint active blocker matches expected card', sprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, args.closeCard ? sprintItem?.stage === 'done_this_sprint' : Boolean(sprintItem), 'Current Sprint target item is present/closed', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, args.closeCard ? Boolean(nextSprintItem) : true, 'next card remains visible after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'not closing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done', 'research'].includes(nextCard.lane), 'next safe card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, dogfood.ok && dogfood.weakRejected, 'Scoper UI dogfood accepts source-backed output and rejects weak/mutating output', JSON.stringify(dogfood.evaluation.summary))
  addCheck(checks, planningEvidence.status === 'live' && (planningEvidence.scoperOutputs || []).length >= 1, 'live Scoper rows exist', `${planningEvidence.scoperOutputs?.length || 0} rows`)
  addCheck(checks, liveEvaluation.ok && liveScoperUi.outputCount >= 1, 'live Scoper UI snapshot is healthy', JSON.stringify(liveEvaluation.summary))
  addCheck(checks, liveScoperUi.outputs.every(output => output.sections.length >= 5), 'live outputs include all review sections', liveScoperUi.outputs.map(output => `${output.scoperOutputId}:${output.sections.length}`).join(', '))
  addCheck(checks, packageJson.scripts?.['process:scoper-ui-check'] === `node --env-file-if-exists=.env ${SCOPER_UI_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:scoper-ui-check'] || 'missing')
  addCheck(checks, scoperUiSource.includes('buildScoperUiSnapshot') && scoperUiSource.includes('Verified / Already Answered') && scoperUiSource.includes('noAutoCreatesBacklog'), 'Scoper UI module owns payload model and non-mutation boundary', 'lib/scoper-ui.js')
  addCheck(checks, planningSource.includes('buildScoperUiSnapshot') && planningSource.includes('scoperUi'), 'planning workflow returns scoperUi payload', 'lib/strategy-planning-workflow.js')
  addCheck(checks, uiSource.includes('renderScoperOutputPanel') && uiSource.includes('renderScoperSection') && uiSource.includes('renderRouteScoperOutputs'), 'Strategy Hub renders Scoper panel and route-linked output', 'public/strategic-execution.js')
  addCheck(checks, uiSource.includes('Blocked auto-actions') && uiSource.includes('draftTaskAction') && uiSource.includes('Open review path'), 'Strategy Hub shows blocked auto-actions and review path actions', 'public/strategic-execution.js')
  addCheck(checks, styleSource.includes('strategy-v2-scoper-panel') && styleSource.includes('strategy-v2-scoper-section'), 'Strategy Hub CSS includes Scoper surface selectors', 'public/styles-strategy-sales.css')
  addCheck(checks, coverageSource.includes('SCOPER_UI_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(SCOPER_UI_CARD_ID), 'verifier coverage IDs include SCOPER-UI-001', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(SCOPER_UI_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(SCOPER_UI_CLOSEOUT_KEY) && closeoutRecordsSource.includes(SCOPER_UI_CARD_ID), 'closeout registry source contains card and key', SCOPER_UI_CLOSEOUT_KEY)
  addCheck(checks, closeoutDoc.includes('Scoper output') && closeoutDoc.includes('No backlog cards are auto-created'), 'closeout documents behavior and limits', SCOPER_UI_CLOSEOUT_PATH)
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && !uiSource.includes('/api/strategic-execution/scoper'), 'focused proof keeps writes explicit and UI adds no Scoper mutation endpoint', SCOPER_UI_SCRIPT_PATH)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: SCOPER_UI_CARD_ID,
    closeoutKey: SCOPER_UI_CLOSEOUT_KEY,
    sprintId: sprint.sprint?.sprintId || null,
    dogfood: dogfood.evaluation.summary,
    liveScoperUi: liveEvaluation.summary,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${SCOPER_UI_CARD_ID} check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
