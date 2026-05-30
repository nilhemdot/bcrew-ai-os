#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
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
  upsertSynthesisFactsBundle,
} from '../lib/foundation-intelligence-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CHANGED_FILES,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PROOF_COMMANDS,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_SCRIPT_PATH,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_SPRINT_ID,
  SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID,
  buildSourceMaturityEvidenceFact,
  buildSyntheticSourceMaturityEvidenceGapRepairProof,
  evaluateSourceMaturityEvidenceGapRepair,
  renderSourceMaturityEvidenceGapRepairCloseout,
  selectSourceMaturityEvidenceRepairCandidate,
} from '../lib/source-maturity-evidence-gap-repair.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false, closeCard: false, stage: 'building_now' }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  return args
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-maturity-grid.js',
      'lib/source-maturity-gap-followup.js',
      'lib/intelligence-synthesis-facts.js',
      'lib/source-contracts.js',
    ],
    existingDocs: [
      'docs/source-notes/bhag-builder-lists.md',
      'docs/source-registry.md',
      'docs/rebuild/current-state.md',
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-gap-followup-triage.md',
    ],
    existingScripts: [
      'scripts/process-source-maturity-gap-followup-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'SOURCE-MATURITY-GAP-FOLLOWUP-001 routes extracted-stage maturity gaps to SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001.',
      'Evidence repair may attach existing source-backed facts; it must not start live extraction.',
      'Owners Dashboard Lists is an IMPORTRANGE mirror; governed writes belong to SRC-OWNERS-LISTS-001.',
    ],
    reused: [
      'Existing source contract and source-registry truth for SRC-OWNERS-LISTS-001.',
      'Existing BHAG Builder Lists source note.',
      'Existing synthesis facts store and source maturity grid.',
    ],
    notRebuilt: [
      'No Google Sheets read/write.',
      'No extraction target creation.',
      'No atom creation.',
      'No external destination apply.',
    ],
    exactGap: 'SRC-OWNERS-LISTS-001 has a signed-off source boundary but no extracted artifact or source fact signal, so the source maturity grid blocks at extracted.',
    overBroadRisk: 'Evidence repair must not fabricate atoms or imply the source is atomized/synthesized/routed.',
    readyBy: 'Steve approved continuous safe overnight Foundation source work, and SOURCE-MATURITY-GAP-FOLLOWUP-001 scoped evidence repair as a child queue.',
    readyAt: '2026-05-18T00:42:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
    title: 'Repair source maturity evidence gaps',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P1',
    rank: 35,
    source: 'SOURCE-MATURITY-GAP-FOLLOWUP-001 triage',
    summary: 'Attach existing source-backed Owners Lists source fact evidence without live extraction or Google Sheets mutation.',
    whyItMatters: 'Foundation source maturity should not stay red when current-reality source truth already exists in governed source contracts and docs.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY}\`. Continue the next safe source-maturity repair from live truth.`
      : 'Persist a governed source fact for SRC-OWNERS-LISTS-001 from existing source contract and source note evidence only.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY}\`; SRC-OWNERS-LISTS-001 now has source fact evidence and no longer blocks at extracted.`
      : `Scope/proof: \`${SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY}\`; no live extraction/auth/provider/external-write work.`,
    owner: 'Foundation Source',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH,
    definitionOfDone: 'SRC-OWNERS-LISTS-001 has an active governed source fact backed by source-contract/source-registry/source-note evidence; source maturity no longer blocks at extracted for that source; no live extraction, Sheets read/write, atom fabrication, or external write occurs; focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PROOF_COMMANDS,
    readinessBlockerCleared: 'SOURCE-MATURITY-GAP-FOLLOWUP-001 scoped evidence repair and repo truth has a signed-off Owners Lists source boundary.',
    notNextBoundaries: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_APPROVAL_PATH,
      closeoutKey: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const planSource = await readRepoFile(SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH)
  const card = buildCardRow({ closeCard, stage })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'internal source fact row and source maturity verification surface',
    repoRoot,
  })
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
      [
        card.id,
        card.title,
        card.scope,
        card.lane,
        card.priority,
        card.rank,
        card.source,
        card.summary,
        card.whyItMatters,
        card.nextAction,
        card.statusNote,
        card.owner,
      ],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `source-maturity-evidence-gap-${stableRunId(SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH)}`,
        SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
        SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH,
        planReview.status,
        planReview.score,
        planReview.maxScore,
        planReview.passThreshold,
        card.priority,
        'full',
        true,
        SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID }),
        'codex-source-maturity-evidence-gap-repair',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-maturity-evidence-gap-repair',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        card.id,
        `${closeCard ? 'Closed' : 'Updated'} ${SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY, stage }),
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
  return { card, planReview }
}

async function ensureLiveState({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update source maturity evidence repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair a source maturity extracted-stage evidence gap with existing governed source facts only.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-evidence-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Persist a governed source fact from existing Owners Lists source evidence only.',
          priorityOrder: [SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-OWNERS-LISTS-001 receives an active source fact backed by source-contract docs.',
            'No live extraction, Sheets read/write, Drive mutation, or external write occurs.',
            'Source maturity no longer blocks at extracted for SRC-OWNERS-LISTS-001.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-evidence-gap-repair',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close source maturity evidence gap repair sprint item after focused proof.'
        : 'Start source maturity evidence gap repair sprint item with complete scaffold metadata.',
    },
  )
  return upsert
}

async function buildSourceMaturityGrid() {
  const foundationSnapshot = await getFoundationSnapshot()
  return buildSourceMaturityGridSnapshot({
    sources: getSourceContracts(),
    extractionControl: foundationSnapshot.extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    lifecycle: foundationSnapshot.sourceLifecycle,
  })
}

async function loadSavedFact(factId) {
  if (!factId) return []
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT fact_id AS "factId", natural_key AS "naturalKey", fact_type AS "factType",
               source_id AS "sourceId", source_ids AS "sourceIds", title, claim, value,
               detail, source_ref AS "sourceRef", source_url AS "sourceUrl", as_of AS "asOf",
               sensitivity, min_tier AS "minTier", status, metadata, updated_at AS "updatedAt"
        FROM intelligence_synthesis_facts
        WHERE fact_id = $1
      `,
      [factId],
    )
    return result.rows
  } finally {
    await pool.end()
  }
}

async function runRepair({ apply = false } = {}) {
  const beforeGrid = await buildSourceMaturityGrid()
  const beforeRow = beforeGrid.rows.find(row => row.sourceId === SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID) || {}
  const candidate = selectSourceMaturityEvidenceRepairCandidate({
    sourceContracts: getSourceContracts(),
    sourceNote: await readRepoFile('docs/source-notes/bhag-builder-lists.md'),
    sourceRegistry: await readRepoFile('docs/source-registry.md'),
    currentState: await readRepoFile('docs/rebuild/current-state.md'),
  })
  const factBuild = buildSourceMaturityEvidenceFact(candidate)
  let savedFacts = []
  if (apply) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_SCRIPT_PATH,
      operation: 'persist source maturity evidence source fact',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
    const saved = await upsertSynthesisFactsBundle(factBuild.bundle, 'codex-source-maturity-evidence-gap-repair')
    savedFacts = saved.savedFacts || saved.facts || []
  } else {
    savedFacts = await loadSavedFact(factBuild.fact?.factId)
  }
  const afterGrid = await buildSourceMaturityGrid()
  const afterRow = afterGrid.rows.find(row => row.sourceId === SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID) || {}
  const evaluation = evaluateSourceMaturityEvidenceGapRepair({
    beforeRow,
    afterRow,
    candidate,
    factBuild,
    savedFacts,
  })
  return {
    candidate,
    factBuild,
    beforeRow,
    afterRow,
    savedFacts,
    evaluation,
    summary: evaluation.summary,
  }
}

async function writeCloseout(snapshot) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_SCRIPT_PATH,
    operation: 'write source maturity evidence gap closeout',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await fs.writeFile(
    path.join(repoRoot, SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH),
    renderSourceMaturityEvidenceGapRepairCloseout(snapshot),
    'utf8',
  )
}

async function buildStatus({ closeCard = false, stage = 'building_now' } = {}) {
  const checks = []
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const planSource = await readRepoFile(SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_APPROVAL_PATH,
    cardId: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard, stage }),
    changedFiles: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'internal source fact row and source maturity verification surface',
    repoRoot,
  })
  const cards = await getBacklogItemsByIds([SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID])
  const card = cards[0] || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const foundationSnapshot = await getFoundationSnapshot()
  const activeItem = list(activeSprint?.items).find(item => item.cardId === SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID) || null
  const synthetic = buildSyntheticSourceMaturityEvidenceGapRepairProof()
  const closeoutRecords = getFoundationBuildCloseouts()
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint?.sprint,
    items: activeSprint?.items || [],
    backlogItems: cards,
    closeouts: closeoutRecords,
    planCriticRuns,
  })
  const applyRepairNow = closeCard || (
    normalizeStage(stage) === 'building_now' &&
      isProcessCheckWriteRequested({ argv: process.argv.slice(2), allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] })
  )
  const repair = await runRepair({ apply: applyRepairNow })
  const repairRequired = applyRepairNow || Boolean(repair.savedFacts?.length)

  addCheck(checks, packageJson.scripts?.['process:source-maturity-evidence-gap-repair-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:source-maturity-evidence-gap-repair-check'] || 'missing')
  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval file is valid v2', approvalValidation.failures?.map(failure => failure.check).join(', ') || 'ok')
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes', `score=${planReview.score}`)
  addCheck(checks, Boolean(card), 'live backlog card exists', card?.id || 'missing')
  addCheck(checks, card ? card.lane === (closeCard ? 'done' : normalizeStage(stage) === 'building_now' ? 'executing' : 'scoped') : false, 'live backlog card is in expected lane', card?.lane || 'missing')
  addCheck(checks, Boolean(activeItem), 'Current Sprint includes repair item', activeItem?.stage || 'missing')
  addCheck(checks, activeItem ? activeItem.planRef === SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH : false, 'Current Sprint item has plan ref', activeItem?.planRef || 'missing')
  addCheck(checks, activeItem ? list(activeItem.proofCommands).includes('npm run process:source-maturity-evidence-gap-repair-check -- --close-card --json') : false, 'Current Sprint proof commands include close-card proof', list(activeItem?.proofCommands).join('; '))
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.status)
  addCheck(checks, synthetic.ok, 'synthetic evidence-gap dogfood passes', synthetic.ok ? 'ok' : JSON.stringify(synthetic))
  if (repairRequired) {
    for (const check of repair.evaluation.checks) addCheck(checks, check.ok, check.check, check.detail)
    addCheck(checks, repair.evaluation.status === 'healthy', 'live repair snapshot is healthy', repair.evaluation.failures.map(failure => failure.check).join(', ') || 'healthy')
  } else {
    addCheck(checks, repair.beforeRow.nextGap === 'extracted', 'target source starts at extracted gap before apply', `${repair.beforeRow.sourceId || 'missing'}:${repair.beforeRow.nextGap || 'missing'}`)
    addCheck(checks, repair.candidate.ok, 'source-backed evidence candidate exists before apply', list(repair.candidate.failures).join(', ') || repair.candidate.sourceId)
    addCheck(checks, repair.factBuild.ok, 'source fact build is valid before apply', list(repair.factBuild.failures).join(', ') || repair.factBuild.fact?.factId)
  }
  addCheck(checks, planSource.includes('intelligence_synthesis_facts') && planSource.includes('reject substring-only') && planSource.includes('full `process:foundation-ship`'), 'plan names real behavior proof and full ship gate', SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_PLAN_PATH)
  addCheck(checks, (await readRepoFile('lib/foundation-build-closeout-source-records.js')).includes(SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY), 'closeout registry includes repair record', SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY)
  addCheck(checks, (await readRepoFile('lib/foundation-verify-coverage-card-ids.js')).includes(SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID), 'verifier coverage card list includes repair card', SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID)
  addCheck(checks, closeoutRecords.some(record => record.key === SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY), 'build closeout registry exposes repair closeout', SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY)
  if (closeCard) {
    const closeoutSource = await readRepoFile(SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH)
    addCheck(checks, closeoutSource.includes(SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY) && closeoutSource.includes('No live extraction'), 'closeout file is written', SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_PATH)
  }

  const findings = checks.filter(check => !check.ok)
  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CLOSEOUT_KEY,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planCritic: { status: planReview.status, score: planReview.score },
    synthetic: { ok: synthetic.ok, factId: synthetic.factBuild?.fact?.factId },
    repair: repair.summary,
    checks,
    findings,
    planCriticRuns: planCriticRuns.length,
  }
}

async function main() {
  const args = parseArgs()
  await initFoundationDb()
  try {
    if (args.apply || args.closeCard) {
      await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
    }
    if (args.closeCard) {
      const closeoutSnapshot = await runRepair({ apply: true })
      await writeCloseout({ summary: closeoutSnapshot.summary })
    }
    const status = await buildStatus({ closeCard: args.closeCard, stage: args.stage })
    if (args.json) {
      console.log(JSON.stringify(status, null, 2))
    } else {
      console.log(`Source maturity evidence gap repair check: ${status.status}`)
      console.log(`  Card: ${SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID}`)
      console.log(`  Source: ${SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_TARGET_SOURCE_ID}`)
      console.log(`  Fact: ${status.repair.factId || 'missing'}`)
      console.log(`  Gap: ${status.repair.beforeNextGap || 'unknown'} -> ${status.repair.afterNextGap || 'unknown'}`)
      for (const finding of status.findings) {
        console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
      }
    }
    if (status.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
      status: 'error',
      cardId: SOURCE_MATURITY_EVIDENCE_GAP_REPAIR_CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
