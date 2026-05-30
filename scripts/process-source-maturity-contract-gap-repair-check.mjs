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
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { evaluateSourceContractValidationLayer } from '../lib/source-contract-validation-layer.js'
import { buildSourceCoverageCloseoutSnapshot } from '../lib/source-coverage-closeout.js'
import { buildSourceExtractionCoverageSnapshot } from '../lib/source-extraction-coverage.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
import {
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CHANGED_FILES,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_PATH,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PROOF_COMMANDS,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_SCRIPT_PATH,
  SOURCE_MATURITY_CONTRACT_GAP_REPAIR_SPRINT_ID,
  buildSourceMaturityContractGapRepairSnapshot,
  buildSyntheticSourceMaturityContractGapRepairProof,
  renderSourceMaturityContractGapRepairCloseout,
} from '../lib/source-maturity-contract-gap-repair.js'

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

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
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
      'lib/source-contracts.js',
      'lib/source-contract-validation-layer.js',
      'lib/source-maturity-grid.js',
      'lib/source-extraction-coverage.js',
      'lib/source-coverage-closeout.js',
      'lib/source-maturity-gap-followup.js',
    ],
    existingDocs: [
      'docs/source-notes/video-link-inventory.md',
      'docs/source-registry.md',
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-gap-followup-triage.md',
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-gap-followup-closeout.md',
    ],
    existingScripts: [
      'scripts/process-source-maturity-gap-followup-check.mjs',
      'scripts/process-source-contract-validation-layer-check.mjs',
      'scripts/process-source-maturity-grid-check.mjs',
      'scripts/process-source-extraction-coverage-check.mjs',
      'scripts/process-source-coverage-closeout-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'SOURCE-MATURITY-GAP-FOLLOWUP-001 routed contract-stage maturity gaps to SOURCE-MATURITY-CONTRACT-GAP-REPAIR-001.',
      'Source contract repair can only use existing repo/DB truth and cannot open provider/auth/live extraction work.',
      'SRC-VIDEO-001 can only be signed for its V1 manifest/subtitle boundary; richer video extractors stay blocked/follow-up.',
    ],
    reused: [
      'Existing video source note and source_crawl target proof.',
      'Existing Source Contract Validation Layer profile for SRC-VIDEO-001.',
      'Existing source maturity/extraction/coverage snapshot builders.',
      'Existing build-lane scaffold and Current Sprint guards.',
    ],
    notRebuilt: [
      'No new video extractor.',
      'No extraction runtime execution.',
      'No provider auth/OAuth repair.',
      'No Foundation UI redesign.',
    ],
    exactGap: 'SRC-VIDEO-001 has live manifest/subtitle evidence but remains Pending Revalidation/Not Signed Off, so source maturity still sees connected as the next gap.',
    overBroadRisk: 'This could falsely certify Loom, Drive video, Zoom, Skool, rich-vision, or GOD-mode extraction if the V1 boundary is not explicit.',
    readyBy: 'Steve approved autonomous safe overnight Foundation source work and SOURCE-MATURITY-GAP-FOLLOWUP-001 scoped this child repair card.',
    readyAt: '2026-05-18T04:05:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID,
    title: 'Repair source maturity contract gaps',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P1',
    rank: 33,
    source: 'SOURCE-MATURITY-GAP-FOLLOWUP-001 triage',
    summary: 'Repair the SRC-VIDEO-001 source contract from existing manifest/subtitle proof so source maturity no longer blocks on a stale connected-stage contract gap.',
    whyItMatters: 'Video source truth already has governed manifest and transcript evidence, but the stale contract label keeps downstream Foundation source maturity noisy and slows safe source repair work.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY}\`. Continue the next safe source-maturity child repair without live extraction.`
      : 'Lock the SRC-VIDEO-001 V1 source boundary from existing evidence, prove richer video extractors remain follow-up, and sync the source contract registry.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY}\`; SRC-VIDEO-001 is V1-boundary locked for manifest/subtitle evidence only.`
      : `Scope/proof: \`${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY}\`; no live extraction/auth/provider/external-write work.`,
    owner: 'Foundation Source',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH,
    definitionOfDone: 'SRC-VIDEO-001 is source-boundary locked for the existing video manifest/YouTube subtitle transcript V1 only, source maturity no longer sees connected/trusted/monitored as its next gap, richer video extractors remain explicit follow-ups, registry sync is applied, focused proof is green, and full ship gate passes.',
    proofCommands: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PROOF_COMMANDS,
    readinessBlockerCleared: 'SOURCE-MATURITY-GAP-FOLLOWUP-001 scoped the source-contract repair child card and the existing video note/source_crawl targets prove manifest/subtitle evidence.',
    notNextBoundaries: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_APPROVAL_PATH,
      closeoutKey: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const planSource = await readRepoFile(SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH)
  const card = buildCardRow({ closeCard, stage })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'shared Foundation source contract, source registry, and source maturity verification surface',
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
        `source-maturity-contract-gap-${stableRunId(SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH)}`,
        SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID,
        SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH,
        planReview.status,
        planReview.score,
        planReview.maxScore,
        planReview.passThreshold,
        card.priority,
        'full',
        true,
        SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID }),
        'codex-source-maturity-contract-gap-repair',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-maturity-contract-gap-repair',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        card.id,
        `${closeCard ? 'Closed' : 'Updated'} ${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY, stage }),
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
    scriptPath: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update source maturity contract repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the SRC-VIDEO-001 source maturity contract gap from existing manifest/subtitle proof only.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-contract-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Repair the video V1 source contract boundary without live extraction or provider calls.',
          priorityOrder: [SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-VIDEO-001 connected/trusted/monitored maturity stages are green from existing evidence.',
            'The next maturity gap is not connected/trusted/monitored.',
            'Broader video extractors remain explicit follow-up lanes.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-contract-gap-repair',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close source maturity contract gap repair sprint item after focused proof.'
        : 'Start source maturity contract gap repair sprint item with complete scaffold metadata.',
    },
  )
  return upsert
}

async function buildLiveSnapshots() {
  const foundationSnapshot = await getFoundationSnapshot()
  const sources = getSourceContracts()
  const sourceMaturityGrid = buildSourceMaturityGridSnapshot({
    sources,
    extractionControl: foundationSnapshot.extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    lifecycle: foundationSnapshot.sourceLifecycle,
  })
  const sourceExtractionCoverage = buildSourceExtractionCoverageSnapshot({
    sources,
    extractionControl: foundationSnapshot.extractionControl,
    sourceMaturityGrid,
    lifecycle: foundationSnapshot.sourceLifecycle,
  })
  const sourceCoverageCloseout = buildSourceCoverageCloseoutSnapshot({
    sources,
    sourceMaturityGrid,
    sourceExtractionCoverage,
  })
  const sourceRegistryMarkdown = await readRepoFile('docs/source-registry.md')
  const sourceNoteMarkdown = await readRepoFile('docs/source-notes/video-link-inventory.md')
  const currentStateMarkdown = await readRepoFile('docs/rebuild/current-state.md')
  const sourceContractValidation = evaluateSourceContractValidationLayer({
    sourceContracts: sources,
    extractionTargets: foundationSnapshot.extractionControl?.coverageByTarget || foundationSnapshot.extractionControl?.targets || [],
    sourceRegistryText: sourceRegistryMarkdown,
    currentStateText: currentStateMarkdown,
  })
  const repair = buildSourceMaturityContractGapRepairSnapshot({
    sources,
    sourceMaturityGrid,
    sourceExtractionCoverage,
    sourceCoverageCloseout,
    sourceContractValidation,
    extractionControl: foundationSnapshot.extractionControl,
    sourceRegistryMarkdown,
    sourceNoteMarkdown,
  })
  return {
    foundationSnapshot,
    sources,
    sourceMaturityGrid,
    sourceExtractionCoverage,
    sourceCoverageCloseout,
    sourceContractValidation,
    repair,
  }
}

async function writeCloseout(snapshot) {
  await fs.writeFile(
    path.join(repoRoot, SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_PATH),
    renderSourceMaturityContractGapRepairCloseout(snapshot),
    'utf8',
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  let upsert = null
  if (writeRequested) {
    upsert = await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const planSource = await readRepoFile(SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH)
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_APPROVAL_PATH,
    cardId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID,
  })
  const planReview = upsert?.planReview || evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'shared Foundation source contract, source registry, and source maturity verification surface',
    repoRoot,
  })
  const live = await buildLiveSnapshots()
  const synthetic = buildSyntheticSourceMaturityContractGapRepairProof()
  const cards = await getBacklogItemsByIds([SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint?.sprint,
    items: activeSprint?.items || [],
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const activeItem = list(activeSprint?.items).find(item => item.cardId === SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID) || null
  const card = cards[0] || buildCardRow({ closeCard: args.closeCard, stage: args.stage })
  const cardLane = text(card.lane)

  addCheck(checks, packageJson.scripts?.['process:source-maturity-contract-gap-repair-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_CONTRACT_GAP_REPAIR_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:source-maturity-contract-gap-repair-check'] || 'missing')
  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval file is valid v2', approvalValidation.failures?.map(failure => failure.check).join(', ') || 'ok')
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes', `score=${planReview.score}`)
  addCheck(checks, Boolean(cards[0]), 'live backlog card exists', card.id || card.cardId || 'missing')
  addCheck(checks, args.closeCard ? cardLane === 'done' : ['scoped', 'executing'].includes(cardLane), 'live backlog card is in expected lane', cardLane || 'missing')
  addCheck(checks, Boolean(activeItem), 'Current Sprint includes active repair item', activeItem?.stage || 'missing')
  addCheck(checks, activeItem ? activeItem.planRef === SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH : false, 'Current Sprint item has plan ref', activeItem?.planRef || 'missing')
  addCheck(checks, activeItem ? list(activeItem.proofCommands).includes('npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-contract-gap-repair --json') : false, 'Current Sprint proof commands include registry sync', list(activeItem?.proofCommands).join('; ') || 'missing')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(finding => finding.detail).join('; ') || 'healthy')
  addCheck(checks, synthetic.ok, 'synthetic contract-gap dogfood passes', synthetic.failures.map(failure => failure.check).join(', ') || 'ok')
  for (const check of live.repair.checks) {
    addCheck(checks, check.ok, check.check, check.detail)
  }
  addCheck(checks, live.repair.status === 'healthy', 'live repair snapshot is healthy', live.repair.failures.map(failure => failure.check).join(', ') || 'healthy')
  addCheck(checks, planSource.includes('source_crawl_items') && planSource.includes('reject substring-only') && planSource.includes('full `process:foundation-ship`'), 'plan names real behavior proof and full ship gate', SOURCE_MATURITY_CONTRACT_GAP_REPAIR_PLAN_PATH)
  addCheck(checks, (await readRepoFile('lib/foundation-build-closeout-source-records.js')).includes(SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY), 'closeout registry includes repair record', SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY)
  addCheck(checks, (await readRepoFile('lib/foundation-verify-coverage-card-ids.js')).includes(SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID), 'verifier coverage card list includes repair card', SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID)

  if (args.closeCard) {
    await writeCloseout(live.repair)
    const closeoutSource = await readRepoFile(SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_PATH)
    addCheck(checks, closeoutSource.includes(SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY) && closeoutSource.includes('No live extraction'), 'closeout file is written', SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_PATH)
  }

  const findings = checks.filter(check => !check.ok)
  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_CONTRACT_GAP_REPAIR_CLOSEOUT_KEY,
    stage: args.closeCard ? 'done_this_sprint' : normalizeStage(args.stage),
    planCritic: { status: planReview.status, score: planReview.score },
    synthetic: {
      ok: synthetic.ok,
      before: synthetic.before,
      after: synthetic.after,
    },
    repair: live.repair.summary,
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source maturity contract gap repair check: ${result.status}`)
    console.log(`SRC_VIDEO_REPAIR_SUMMARY ${JSON.stringify(result.repair)}`)
    for (const finding of findings) {
      console.log(`- ${finding.check}: ${finding.detail}`)
    }
  }

  await closeFoundationDb()
  if (findings.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
