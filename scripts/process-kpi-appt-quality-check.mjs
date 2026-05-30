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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  KPI_APPT_QUALITY_APPROVAL_PATH,
  KPI_APPT_QUALITY_CARD_ID,
  KPI_APPT_QUALITY_CHANGED_FILES,
  KPI_APPT_QUALITY_CLOSEOUT_KEY,
  KPI_APPT_QUALITY_CLOSEOUT_PATH,
  KPI_APPT_QUALITY_NEXT_CARD_ID,
  KPI_APPT_QUALITY_NOT_NEXT_BOUNDARIES,
  KPI_APPT_QUALITY_PLAN_PATH,
  KPI_APPT_QUALITY_PROOF_COMMANDS,
  KPI_APPT_QUALITY_SCRIPT_PATH,
  KPI_APPT_QUALITY_SPRINT_ID,
  buildKpiAppointmentQualityDogfoodProof,
  evaluateKpiAppointmentQualityAudit,
  fetchLiveKpiAppointmentQualityAudit,
} from '../lib/kpi-appointment-quality-audit.js'
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
const ACTOR = 'codex-kpi-appt-quality'

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
    id: KPI_APPT_QUALITY_CARD_ID,
    title: 'Build KPI appointment quality audit for stacking and outcomes',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 21,
    source: 'Current Sprint active blocker after STRATEGY-009, 2026-04-26 KPI data-quality audit, and SRC-SUPABASE-001 read rules.',
    summary: 'Build a governed read-only KPI appointment quality audit that measures missing outcomes, non-standard outcome labels, known outcome labels used in the wrong appointment-type context, likely same-person same-type appointment stacks, and buy/sell exception context.',
    whyItMatters: 'Sales leadership needs reliable appointment hygiene signals before coaching or apply workflows. The system must prove the raw KPI/Supabase read and classify data-quality risk without mutating KPI, FUB, or tracked person-level artifacts.',
    nextAction: closeCard
      ? `Done under ${KPI_APPT_QUALITY_CLOSEOUT_KEY}; continue ${KPI_APPT_QUALITY_NEXT_CARD_ID}.`
      : 'Build and prove the read-only aggregate KPI appointment quality audit from live KPI/Supabase appointment truth.',
    statusNote: closeCard
      ? `Closed v1 under ${KPI_APPT_QUALITY_CLOSEOUT_KEY}; aggregate appointment-quality audit is governed, source-backed, dogfooded, and read-only.`
      : 'Executing v1: read-only aggregate appointment-quality audit only; no KPI/FUB writes and no person-level tracked report artifacts.',
    owner: 'Sales Data Quality',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: KPI_APPT_QUALITY_NEXT_CARD_ID,
    title: existing.title || 'Surface KPI fake-lead and lead-source validation problems',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P0',
    rank: existing.rank || 22,
    nextAction: text(existing.nextAction, 'Build the read-only KPI/FUB lead-source validation surface after appointment quality closes.'),
    statusNote: `${text(existing.statusNote)} Unblocked by ${KPI_APPT_QUALITY_CLOSEOUT_KEY}; scope/proof required before build; keep lead-source validation separate from appointment-quality audit.`.trim(),
    owner: existing.owner || 'Sales Data Quality',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'scripts/audit-kpi-agent-data-quality.mjs',
      'lib/kpi-health.js',
      'scripts/kpi-supabase-health.mjs',
      'docs/source-notes/kpi-dashboard.md',
      'docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md',
    ],
    existingDocs: [
      'docs/source-notes/kpi-dashboard.md',
      'docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md',
      'docs/source-notes/fub-kpi-deal-connection-map.md',
    ],
    existingScripts: [
      'kpi:data-quality',
      'kpi:health',
      'process:kpi-health-api-cache-check',
      'process:kpi-health-dynamic-year-contract-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
    ],
    existingPolicy: [
      'KPI is read, verified, and built around; AI OS does not rebuild KPI.',
      'Pipeline / CRM lead flow truth comes from persons + appointments + users.',
      'Appointment cleanup starts as read-only coaching signal before any suggested fix or apply workflow.',
      'Person-level samples stay out of tracked repo artifacts unless separately approved.',
    ],
    exactGap: 'The prior KPI data-quality audit existed as a useful raw script and archived report, but the appointment-quality slice was not governed as a card with focused proof, dogfood, closeout, and live sprint/backlog truth.',
    overBroadRisk: 'The card can drift into source-system writes, person-level tracked reports, lead-source validation, coaching/apply workflows, or a broad KPI dashboard rebuild. V1 is only aggregate read-only appointment outcomes/stacks plus proof.',
    reused: [
      'SRC-SUPABASE-001 read model and KPI health credential/env loading.',
      '2026-04-26 appointment-quality audit logic and founder interpretation.',
      'Existing Current Sprint, Plan Critic, process write guard, backlog hygiene, repeated-failure gate, and Foundation ship gates.',
    ],
    notRebuilt: [
      'No KPI dashboard rebuild.',
      'No lead-source validation implementation.',
      'No coaching/apply workflow.',
      'No external or source-system writes.',
    ],
    readyBy: 'Steve unattended Foundation sprint approval',
    readyAt: '2026-05-20T02:20:00-04:00',
  }
}

function buildSprintItemFromExisting(item = {}, { closeCard = false } = {}) {
  if (item.cardId !== KPI_APPT_QUALITY_CARD_ID) return item
  return {
    ...item,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: KPI_APPT_QUALITY_PLAN_PATH,
    definitionOfDone: 'KPI appointment quality has a governed read-only aggregate audit for outcomes and likely stacks; live KPI/Supabase proof runs; dogfood catches missing/non-standard/wrong-context outcomes and stack/exception handling; full gates pass.',
    proofCommands: KPI_APPT_QUALITY_PROOF_COMMANDS,
    readinessBlockerCleared: 'STRATEGY-009 shipped and Current Sprint advanced to KPI-APPT-QUALITY-001.',
    notNextBoundaries: KPI_APPT_QUALITY_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      owner: 'Sales Data Quality',
      closeoutKey: KPI_APPT_QUALITY_CLOSEOUT_KEY,
      approvalRef: KPI_APPT_QUALITY_APPROVAL_PATH,
      sourceId: 'SRC-SUPABASE-001',
    },
  }
}

function ensureSprintHasTarget(items = []) {
  if (items.some(item => item.cardId === KPI_APPT_QUALITY_CARD_ID)) return items
  return [
    ...items,
    {
      cardId: KPI_APPT_QUALITY_CARD_ID,
      order: items.length + 1,
      stage: 'building_now',
      title: 'Build KPI appointment quality audit for stacking and outcomes',
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
    const nextExisting = await client.query('SELECT * FROM backlog_items WHERE id = $1', [KPI_APPT_QUALITY_NEXT_CARD_ID])
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `kpi-appt-quality-${stableRunId(KPI_APPT_QUALITY_PLAN_PATH)}`,
        KPI_APPT_QUALITY_CARD_ID,
        KPI_APPT_QUALITY_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        KPI_APPT_QUALITY_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: KPI_APPT_QUALITY_CARD_ID }),
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
        KPI_APPT_QUALITY_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${KPI_APPT_QUALITY_CARD_ID}.`,
        JSON.stringify({ closeoutKey: KPI_APPT_QUALITY_CLOSEOUT_KEY, nextCardId: KPI_APPT_QUALITY_NEXT_CARD_ID }),
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
    scriptPath: KPI_APPT_QUALITY_SCRIPT_PATH,
    operation: `create/update ${KPI_APPT_QUALITY_CARD_ID} card, Plan Critic row, and Current Sprint overlay`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveRows({ closeCard, planReview })
  const baseItems = ensureSprintHasTarget(previous.items || [])
  const items = baseItems.map(item => {
    if (item.cardId === KPI_APPT_QUALITY_NEXT_CARD_ID && closeCard) {
      return { ...item, stage: 'scoping' }
    }
    return buildSprintItemFromExisting(item, { closeCard })
  })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || KPI_APPT_QUALITY_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? KPI_APPT_QUALITY_NEXT_CARD_ID : KPI_APPT_QUALITY_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'next_scoping' : 'building_now',
          closeoutKey: KPI_APPT_QUALITY_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue ${KPI_APPT_QUALITY_NEXT_CARD_ID}.`
            : 'Ship read-only KPI appointment quality audit.',
          notNext: KPI_APPT_QUALITY_NOT_NEXT_BOUNDARIES,
        },
      },
      items,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve approved unattended Foundation execution; build KPI appointment quality audit and continue next safe card.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(KPI_APPT_QUALITY_PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: KPI_APPT_QUALITY_CHANGED_FILES,
    declaredRisk: 'KPI appointment quality audit can drift into source writes, person-level tracked reports, coaching/apply workflows, or broad KPI rebuild.',
    repoRoot,
  })
  if (args.closeCard) await ensureLiveState({ closeCard: true, planReview })

  const [
    approval,
    packageJson,
    moduleSource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    scriptSource,
    legacyAuditDoc,
    sourceNote,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: KPI_APPT_QUALITY_APPROVAL_PATH, cardId: KPI_APPT_QUALITY_CARD_ID }),
    readRepoJson('package.json'),
    readRepoFile('lib/kpi-appointment-quality-audit.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(KPI_APPT_QUALITY_CLOSEOUT_PATH, { optional: true }),
    readRepoFile(KPI_APPT_QUALITY_SCRIPT_PATH),
    readRepoFile('docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md'),
    readRepoFile('docs/source-notes/kpi-dashboard.md'),
  ])

  const dogfood = buildKpiAppointmentQualityDogfoodProof()
  const liveAudit = await fetchLiveKpiAppointmentQualityAudit({
    windowDays: 90,
    topLimit: 5,
    sampleLimit: 0,
  })
  const liveEvaluation = evaluateKpiAppointmentQualityAudit(liveAudit)

  await initFoundationDb()
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (sprint.items || []).map(item => item.cardId).filter(Boolean)
  const cardIds = Array.from(new Set([KPI_APPT_QUALITY_CARD_ID, KPI_APPT_QUALITY_NEXT_CARD_ID, ...sprintCardIds]))
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds(cardIds),
    getPlanCriticRunsByCardIds(cardIds),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === KPI_APPT_QUALITY_CARD_ID) || null
  const nextCard = cards.find(item => item.id === KPI_APPT_QUALITY_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === KPI_APPT_QUALITY_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === KPI_APPT_QUALITY_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === KPI_APPT_QUALITY_CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    backlogItems: cards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const sourceWriteTokens = ['method: \'POST\'', 'method: "POST"', 'method: \'PATCH\'', 'method: "PATCH"', 'method: \'PUT\'', 'method: "PUT"', 'method: \'DELETE\'', 'method: "DELETE"']
  const noSourceWrites = !sourceWriteTokens.some(token => moduleSource.includes(token))

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || KPI_APPT_QUALITY_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === KPI_APPT_QUALITY_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.activeBlockerCardId === (args.closeCard ? KPI_APPT_QUALITY_NEXT_CARD_ID : KPI_APPT_QUALITY_CARD_ID), 'Current Sprint active blocker matches expected card', sprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, args.closeCard ? sprintItem?.stage === 'done_this_sprint' : Boolean(sprintItem), 'Current Sprint target item is present/closed', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, args.closeCard ? nextSprintItem?.stage === 'scoping' : true, 'next card remains scoped after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'not closing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next safe card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, dogfood.ok, 'KPI appointment quality dogfood passes', JSON.stringify(dogfood.summary))
  addCheck(checks, dogfood.summary?.missingOutcomeDetected === true, 'dogfood catches missing outcomes', 'missing outcome detected')
  addCheck(checks, dogfood.summary?.nonStandardDetected === true, 'dogfood catches non-standard outcomes', 'non-standard outcome detected')
  addCheck(checks, dogfood.summary?.mismatchDetected === true, 'dogfood catches wrong-context outcomes', 'outcome/type mismatch detected')
  addCheck(checks, dogfood.summary?.sameTypeStackDetected === true, 'dogfood catches likely same-type appointment stacks', 'stack detected')
  addCheck(checks, dogfood.summary?.buySellExceptionDetected === true, 'dogfood preserves buy/sell exception context', 'exception detected')
  addCheck(checks, liveEvaluation.ok, 'live KPI appointment audit evaluates healthy', JSON.stringify(liveEvaluation.summary))
  addCheck(checks, liveEvaluation.summary.activeAppointments >= 3000, 'live audit reads real active appointment rows', String(liveEvaluation.summary.activeAppointments))
  addCheck(checks, liveEvaluation.summary.missingAppointmentOutcomes > 0 && liveEvaluation.summary.likelySameTypeStackClusters > 0, 'live audit surfaces outcome and stack signals', JSON.stringify(liveEvaluation.summary))
  addCheck(checks, liveAudit.readOnly === true && liveAudit.writesSourceSystems === false && noSourceWrites, 'audit is read-only and has no source write methods', `readOnly=${liveAudit.readOnly}`)
  addCheck(checks, (liveAudit.sampleSignals?.likelyAppointmentStacks || []).length === 0 && (liveAudit.sampleSignals?.buySellContext || []).length === 0, 'closeout proof uses aggregate-only live output', 'sampleLimit=0')
  addCheck(checks, packageJson.scripts?.['process:kpi-appt-quality-check'] === `node --env-file-if-exists=.env ${KPI_APPT_QUALITY_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:kpi-appt-quality-check'] || 'missing')
  addCheck(checks, moduleSource.includes('fetchLiveKpiAppointmentQualityAudit') && moduleSource.includes('buildKpiAppointmentQualityDogfoodProof'), 'KPI appointment quality module owns live audit and dogfood', 'lib/kpi-appointment-quality-audit.js')
  addCheck(checks, coverageSource.includes('KPI_APPT_QUALITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(KPI_APPT_QUALITY_CARD_ID), 'verifier coverage IDs include KPI-APPT-QUALITY-001', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(KPI_APPT_QUALITY_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(KPI_APPT_QUALITY_CLOSEOUT_KEY) && closeoutRecordsSource.includes(KPI_APPT_QUALITY_CARD_ID), 'closeout registry source contains card and key', KPI_APPT_QUALITY_CLOSEOUT_KEY)
  addCheck(checks, closeoutDoc.includes('KPI appointment quality') && closeoutDoc.includes('aggregate-only'), 'closeout documents scope and privacy boundary', KPI_APPT_QUALITY_CLOSEOUT_PATH)
  addCheck(checks, legacyAuditDoc.includes('missing appointment outcomes') && legacyAuditDoc.includes(KPI_APPT_QUALITY_CARD_ID), 'legacy audit context is preserved', 'docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md')
  addCheck(checks, sourceNote.includes('appointments') && sourceNote.includes('Pipeline truth'), 'KPI source note preserves appointment read rule', 'docs/source-notes/kpi-dashboard.md')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: KPI_APPT_QUALITY_CARD_ID,
    closeoutKey: KPI_APPT_QUALITY_CLOSEOUT_KEY,
    sprintId: sprint.sprint?.sprintId || null,
    liveSummary: liveEvaluation.summary,
    dogfood: dogfood.summary,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${KPI_APPT_QUALITY_CARD_ID} check: ${result.status}`)
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
