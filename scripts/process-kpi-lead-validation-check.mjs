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
  KPI_LEAD_VALIDATION_APPROVAL_PATH,
  KPI_LEAD_VALIDATION_CARD_ID,
  KPI_LEAD_VALIDATION_CHANGED_FILES,
  KPI_LEAD_VALIDATION_CLOSEOUT_KEY,
  KPI_LEAD_VALIDATION_CLOSEOUT_PATH,
  KPI_LEAD_VALIDATION_NEXT_CARD_ID,
  KPI_LEAD_VALIDATION_NOT_NEXT_BOUNDARIES,
  KPI_LEAD_VALIDATION_PLAN_PATH,
  KPI_LEAD_VALIDATION_PROOF_COMMANDS,
  KPI_LEAD_VALIDATION_SCRIPT_PATH,
  KPI_LEAD_VALIDATION_SOURCE_ID,
  KPI_LEAD_VALIDATION_SPRINT_ID,
  buildKpiLeadValidationDogfoodProof,
  evaluateKpiLeadValidationAudit,
  fetchLiveKpiLeadValidationAudit,
} from '../lib/kpi-lead-validation-audit.js'
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
const ACTOR = 'codex-kpi-lead-validation'

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
    id: KPI_LEAD_VALIDATION_CARD_ID,
    title: 'Surface KPI fake-lead and lead-source validation problems',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 44,
    source: 'Current Sprint active blocker after KPI-APPT-QUALITY-001, 2026-04-26 KPI data-quality audit, SRC-SUPABASE-001, and SRC-FUB-001 lead-source rules.',
    summary: 'Build a governed read-only KPI/FUB lead-source validation audit that measures active lead-stage people with missing, generic, invalid, ungoverned, or flagged source labels plus unclaimed pond context.',
    whyItMatters: 'Lead counts are not trustworthy if FUB/KPI treats imported contacts, unspecified rows, generic Sphere/SOI, vendors, realtors, support-network contacts, or unclaimed pond records as validated final lead attribution. Foundation needs source-backed aggregate proof before coaching or cleanup workflows.',
    nextAction: closeCard
      ? `Done under ${KPI_LEAD_VALIDATION_CLOSEOUT_KEY}; continue ${KPI_LEAD_VALIDATION_NEXT_CARD_ID}.`
      : 'Build and prove the read-only aggregate KPI/FUB lead-source validation audit from live KPI/Supabase and governed FUB source rules.',
    statusNote: closeCard
      ? `Closed v1 under ${KPI_LEAD_VALIDATION_CLOSEOUT_KEY}; aggregate lead-source validation audit is governed, source-backed, dogfooded, and read-only.`
      : 'Executing v1: read-only aggregate lead-source validation audit only; no KPI/FUB writes, no cleanup/apply workflow, and no person-level tracked report artifacts.',
    owner: 'Sales Data Quality',
  }
}

function buildNextCardRow(existing = {}) {
  const defaultNextAction = 'After Foundation sweep/build visibility work, extend evidence proof to expose full thread context where available: reply count, latest activity, participants, direction/from-to, source account, hit/use counts, linked artifacts, cross-source corroboration, and weak-proof flags such as one-message thread, system-drafted origin, no reply captured, stale date, or no owner response. Feed these signals into Strategic Intelligence confidence/staleness and Scoper first-gate classification.'
  const defaultStatusNote = 'New P1 from the 2026-04-28 hard checkpoint. This can be built as part of `STRATEGIC-INTEL-001` / `INTEL-SCOPER-001` proof hardening, but it is tracked separately so weak source-proof context is not lost.'
  const existingNextAction = text(existing.nextAction ?? existing.next_action, defaultNextAction)
  const existingStatusNote = text(existing.statusNote ?? existing.status_note, defaultStatusNote)
  const nextAction = existingNextAction.includes('reply count') && existingNextAction.includes('cross-source corroboration') && existingNextAction.includes('one-message thread')
    ? existingNextAction
    : defaultNextAction
  const statusNoteBase = existingStatusNote.includes('2026-04-28 hard checkpoint')
    ? existingStatusNote
    : defaultStatusNote
  return {
    ...existing,
    id: KPI_LEAD_VALIDATION_NEXT_CARD_ID,
    title: existing.title || 'Add full thread context to evidence proof',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 46,
    nextAction,
    statusNote: `${statusNoteBase} Unblocked by ${KPI_LEAD_VALIDATION_CLOSEOUT_KEY}; scope/proof required before build.`.trim(),
    owner: existing.owner || 'Foundation Intelligence',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'scripts/audit-kpi-agent-data-quality.mjs',
      'lib/kpi-health.js',
      'lib/foundation-fub-lead-source-store.js',
      'scripts/audit-admin-lead-sources.mjs',
      'docs/source-notes/fub-kpi-deal-connection-map.md',
    ],
    existingDocs: [
      'docs/source-notes/kpi-dashboard.md',
      'docs/source-notes/follow-up-boss.md',
      'docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md',
    ],
    existingScripts: [
      'kpi:data-quality',
      'lead-sources:audit',
      'kpi:health',
      'process:kpi-appt-quality-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
    ],
    existingPolicy: [
      'KPI is read/verified; AI OS does not rebuild KPI.',
      'FUB remains the source for CRM contact and lead-source cleanup writes.',
      'Lead-source validation starts as aggregate read-only audit proof before any guided correction or apply workflow.',
      'Person-level samples stay out of tracked repo artifacts unless separately approved.',
    ],
    exactGap: 'The 2026-04-26 KPI/FUB audit exposed invalid/generic lead-source counts, but the lead-source/fake-lead slice was not governed as a card with focused proof, dogfood, closeout, and live sprint/backlog truth.',
    overBroadRisk: 'The card can drift into FUB source writes, person-level tracked reports, appointment-quality logic, Shopping List discipline, coaching/apply workflows, or a broad KPI dashboard rebuild. V1 is only aggregate read-only lead-source validation plus proof.',
    reused: [
      'SRC-SUPABASE-001 read model and KPI health credential/env loading.',
      'SRC-FUB-001 governed lead-source rule store in AIOS Postgres.',
      '2026-04-26 KPI/FUB data-quality audit logic and founder interpretation of generic source labels.',
      'Existing Current Sprint, Plan Critic, process write guard, backlog hygiene, repeated-failure gate, and Foundation ship gates.',
    ],
    notRebuilt: [
      'No KPI dashboard rebuild.',
      'No FUB cleanup/apply workflow.',
      'No appointment-quality implementation.',
      'No Shopping List discipline implementation.',
      'No external or source-system writes.',
    ],
    readyBy: 'Steve unattended Foundation sprint approval',
    readyAt: '2026-05-20T02:45:00-04:00',
  }
}

function buildSprintItemFromExisting(item = {}, { closeCard = false } = {}) {
  if (item.cardId !== KPI_LEAD_VALIDATION_CARD_ID) return item
  return {
    ...item,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: KPI_LEAD_VALIDATION_PLAN_PATH,
    definitionOfDone: 'KPI lead-source validation has a governed read-only aggregate audit for active lead-stage people with missing/generic/invalid/ungoverned/flagged source labels and unclaimed pond context; live KPI/Supabase + FUB rule proof runs; dogfood catches every invalid source class; full gates pass.',
    proofCommands: KPI_LEAD_VALIDATION_PROOF_COMMANDS,
    readinessBlockerCleared: 'KPI-APPT-QUALITY-001 shipped and Current Sprint advanced to KPI-LEAD-VALIDATION-001.',
    notNextBoundaries: KPI_LEAD_VALIDATION_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      owner: 'Sales Data Quality',
      closeoutKey: KPI_LEAD_VALIDATION_CLOSEOUT_KEY,
      approvalRef: KPI_LEAD_VALIDATION_APPROVAL_PATH,
      sourceId: KPI_LEAD_VALIDATION_SOURCE_ID,
    },
  }
}

function ensureSprintHasTarget(items = []) {
  if (items.some(item => item.cardId === KPI_LEAD_VALIDATION_CARD_ID)) return items
  return [
    ...items,
    {
      cardId: KPI_LEAD_VALIDATION_CARD_ID,
      order: items.length + 1,
      stage: 'building_now',
      title: 'Surface KPI fake-lead and lead-source validation problems',
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
    const nextExisting = await client.query('SELECT * FROM backlog_items WHERE id = $1', [KPI_LEAD_VALIDATION_NEXT_CARD_ID])
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
        `kpi-lead-validation-${stableRunId(KPI_LEAD_VALIDATION_PLAN_PATH)}`,
        KPI_LEAD_VALIDATION_CARD_ID,
        KPI_LEAD_VALIDATION_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        KPI_LEAD_VALIDATION_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: KPI_LEAD_VALIDATION_CARD_ID }),
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
        KPI_LEAD_VALIDATION_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${KPI_LEAD_VALIDATION_CARD_ID}.`,
        JSON.stringify({ closeoutKey: KPI_LEAD_VALIDATION_CLOSEOUT_KEY, nextCardId: KPI_LEAD_VALIDATION_NEXT_CARD_ID }),
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
    scriptPath: KPI_LEAD_VALIDATION_SCRIPT_PATH,
    operation: `create/update ${KPI_LEAD_VALIDATION_CARD_ID} card, Plan Critic row, and Current Sprint overlay`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveRows({ closeCard, planReview })
  const baseItems = ensureSprintHasTarget(previous.items || [])
  const items = baseItems.map(item => {
    if (item.cardId === KPI_LEAD_VALIDATION_NEXT_CARD_ID && closeCard) {
      return { ...item, stage: 'scoping' }
    }
    return buildSprintItemFromExisting(item, { closeCard })
  })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || KPI_LEAD_VALIDATION_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? KPI_LEAD_VALIDATION_NEXT_CARD_ID : KPI_LEAD_VALIDATION_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'next_scoping' : 'building_now',
          closeoutKey: KPI_LEAD_VALIDATION_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue ${KPI_LEAD_VALIDATION_NEXT_CARD_ID}.`
            : 'Ship read-only KPI/FUB lead-source validation audit.',
          notNext: KPI_LEAD_VALIDATION_NOT_NEXT_BOUNDARIES,
        },
      },
      items,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve approved unattended Foundation execution; build KPI lead-source validation audit and continue next safe card.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(KPI_LEAD_VALIDATION_PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: KPI_LEAD_VALIDATION_CHANGED_FILES,
    declaredRisk: 'KPI/FUB lead validation can drift into source writes, person-level tracked reports, appointment quality, Shopping List discipline, or broad KPI rebuild.',
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
    fubNote,
    oldAuditSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: KPI_LEAD_VALIDATION_APPROVAL_PATH, cardId: KPI_LEAD_VALIDATION_CARD_ID }),
    readRepoJson('package.json'),
    readRepoFile('lib/kpi-lead-validation-audit.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(KPI_LEAD_VALIDATION_CLOSEOUT_PATH, { optional: true }),
    readRepoFile(KPI_LEAD_VALIDATION_SCRIPT_PATH),
    readRepoFile('docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md'),
    readRepoFile('docs/source-notes/kpi-dashboard.md'),
    readRepoFile('docs/source-notes/follow-up-boss.md'),
    readRepoFile('scripts/audit-kpi-agent-data-quality.mjs'),
  ])

  const dogfood = buildKpiLeadValidationDogfoodProof()
  const liveAudit = await fetchLiveKpiLeadValidationAudit({
    topLimit: 5,
    sampleLimit: 0,
  })
  const liveEvaluation = evaluateKpiLeadValidationAudit(liveAudit)

  await initFoundationDb()
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (sprint.items || []).map(item => item.cardId).filter(Boolean)
  const cardIds = Array.from(new Set([KPI_LEAD_VALIDATION_CARD_ID, KPI_LEAD_VALIDATION_NEXT_CARD_ID, ...sprintCardIds]))
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds(cardIds),
    getPlanCriticRunsByCardIds(cardIds),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === KPI_LEAD_VALIDATION_CARD_ID) || null
  const nextCard = cards.find(item => item.id === KPI_LEAD_VALIDATION_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === KPI_LEAD_VALIDATION_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === KPI_LEAD_VALIDATION_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === KPI_LEAD_VALIDATION_CLOSEOUT_KEY) || null
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

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || KPI_LEAD_VALIDATION_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === KPI_LEAD_VALIDATION_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.activeBlockerCardId === (args.closeCard ? KPI_LEAD_VALIDATION_NEXT_CARD_ID : KPI_LEAD_VALIDATION_CARD_ID), 'Current Sprint active blocker matches expected card', sprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, args.closeCard ? sprintItem?.stage === 'done_this_sprint' : Boolean(sprintItem), 'Current Sprint target item is present/closed', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, args.closeCard ? nextSprintItem?.stage === 'scoping' : true, 'next card remains scoped after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'not closing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done', 'research'].includes(nextCard.lane), 'next safe card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, dogfood.ok, 'KPI lead validation dogfood passes', JSON.stringify(dogfood.summary))
  addCheck(checks, dogfood.summary?.importDetected === true, 'dogfood catches Import as invalid final source', 'Import detected')
  addCheck(checks, dogfood.summary?.unspecifiedDetected === true, 'dogfood catches unspecified source', 'unspecified detected')
  addCheck(checks, dogfood.summary?.sphereDetected === true, 'dogfood catches generic Sphere source', 'Sphere detected')
  addCheck(checks, dogfood.summary?.missingSourceDetected === true, 'dogfood catches blank source', 'blank detected')
  addCheck(checks, dogfood.summary?.notInRulesDetected === true, 'dogfood catches source not in governed FUB rules', 'not in rules detected')
  addCheck(checks, dogfood.summary?.flaggedRuleDetected === true && dogfood.summary?.invalidGroupDetected === true, 'dogfood catches flagged/invalid governed rules', 'flagged and invalid group detected')
  addCheck(checks, dogfood.summary?.unclaimedPondDetected === true, 'dogfood catches unclaimed pond context', 'pond context detected')
  addCheck(checks, dogfood.summary?.sampleFree === true, 'dogfood supports sample-free tracked output', 'sampleLimit=0')
  addCheck(checks, liveEvaluation.ok, 'live KPI lead validation audit evaluates healthy', JSON.stringify(liveEvaluation.summary))
  addCheck(checks, liveEvaluation.summary.activeLeadStagePersons >= 10000, 'live audit reads real active lead-stage person rows', String(liveEvaluation.summary.activeLeadStagePersons))
  addCheck(checks, liveEvaluation.summary.invalidLeadSourceRows > 1000, 'live audit surfaces material invalid lead-source rows', String(liveEvaluation.summary.invalidLeadSourceRows))
  addCheck(checks, liveEvaluation.summary.importRows > 0 && liveEvaluation.summary.unspecifiedRows > 0 && liveEvaluation.summary.sphereRows > 0, 'live audit catches known generic source classes', JSON.stringify(liveEvaluation.summary))
  addCheck(checks, liveAudit.readOnly === true && liveAudit.writesSourceSystems === false && noSourceWrites, 'audit is read-only and has no source write methods', `readOnly=${liveAudit.readOnly}`)
  addCheck(checks, (liveAudit.sampleSignals?.invalidLeadSources || []).length === 0, 'closeout proof uses aggregate-only live output', 'sampleLimit=0')
  addCheck(checks, packageJson.scripts?.['process:kpi-lead-validation-check'] === `node --env-file-if-exists=.env ${KPI_LEAD_VALIDATION_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:kpi-lead-validation-check'] || 'missing')
  addCheck(checks, moduleSource.includes('fetchLiveKpiLeadValidationAudit') && moduleSource.includes('buildKpiLeadValidationDogfoodProof'), 'KPI lead validation module owns live audit and dogfood', 'lib/kpi-lead-validation-audit.js')
  addCheck(checks, coverageSource.includes('KPI_LEAD_VALIDATION_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(KPI_LEAD_VALIDATION_CARD_ID), 'verifier coverage IDs include KPI-LEAD-VALIDATION-001', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(KPI_LEAD_VALIDATION_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(KPI_LEAD_VALIDATION_CLOSEOUT_KEY) && closeoutRecordsSource.includes(KPI_LEAD_VALIDATION_CARD_ID), 'closeout registry source contains card and key', KPI_LEAD_VALIDATION_CLOSEOUT_KEY)
  addCheck(checks, /KPI\/?FUB lead-source validation/i.test(closeoutDoc) && closeoutDoc.includes('aggregate-only'), 'closeout documents scope and privacy boundary', KPI_LEAD_VALIDATION_CLOSEOUT_PATH)
  addCheck(checks, legacyAuditDoc.includes('invalid/generic lead-source rows') && legacyAuditDoc.includes(KPI_LEAD_VALIDATION_CARD_ID), 'legacy audit context is preserved', 'docs/_archive/audits/2026-04-26-kpi-agent-data-quality-audit.md')
  addCheck(checks, sourceNote.includes('Pipeline truth') && fubNote.includes('lead-source'), 'source notes preserve KPI/FUB read boundaries', 'KPI and FUB source notes')
  addCheck(checks, oldAuditSource.includes('INVALID_FINAL_SOURCE_NAMES') && oldAuditSource.includes('sourceProblem'), 'old data-quality lead-source logic was reused intentionally', 'scripts/audit-kpi-agent-data-quality.mjs')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('sampleLimit: 0'), 'focused proof keeps writes explicit and tracked live output aggregate-only', KPI_LEAD_VALIDATION_SCRIPT_PATH)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: KPI_LEAD_VALIDATION_CARD_ID,
    closeoutKey: KPI_LEAD_VALIDATION_CLOSEOUT_KEY,
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
    console.log(`${KPI_LEAD_VALIDATION_CARD_ID} check: ${result.status}`)
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
