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
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
  getSourceContractRegistrySnapshot,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { evaluateSourceContractValidationLayer } from '../lib/source-contract-validation-layer.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
import { PLAN_CRITIC_MIN_PASS_SCORE, evaluatePlanCriticPlan } from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CHANGED_FILES,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_PATH,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PROOF_COMMANDS,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_SCRIPT_PATH,
  SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_SPRINT_ID,
  buildSourceMaturityGithubBuildIntelMonitoringGapRepairSnapshot,
  buildSyntheticGithubBuildIntelMonitoringGapRepairProof,
  renderGithubBuildIntelMonitoringGapRepairCloseout,
} from '../lib/source-maturity-github-build-intel-monitoring-gap-repair.js'

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

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
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
      'lib/gstack-build-intel.js',
    ],
    existingDocs: [
      'docs/source-registry.md',
      'docs/source-notes/github-build-intel.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-13-gstack-build-intel-extraction.md',
      'docs/handoffs/2026-05-18-source-maturity-github-build-intel-trust-gap-repair-closeout.md',
    ],
    existingScripts: [
      'scripts/sync-source-contract-registry.mjs',
      'scripts/process-source-maturity-github-build-intel-trust-gap-repair-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'SRC-GITHUB-BUILD-INTEL-001 is a public read-only, proposal-only source.',
      'Public GitHub Build Intel cannot auto-create trusted backlog work.',
      'Monitoring can be manual/on-demand only until a separate approved public GitHub monitoring card exists.',
    ],
    reused: [
      'Existing GitHub Build Intel source contract and source note.',
      'Existing GStack Build Intel proof and API.',
      'Existing Source Contract Validation Layer and source maturity grid.',
    ],
    notRebuilt: [
      'No live GitHub fetch.',
      'No repo clone or code import.',
      'No source extraction run.',
      'No atom generation or action-route creation.',
    ],
    exactGap: 'SRC-GITHUB-BUILD-INTEL-001 is trusted but source maturity blocks at monitored because no refresh method or manual review boundary is visible.',
    overBroadRisk: 'The repair must not imply public GitHub extraction, atom-flow, routing, provider/model spend, or automatic backlog mutation are complete.',
    readyBy: 'Steve approved continuous safe overnight Foundation source work; live source maturity shows SRC-GITHUB-BUILD-INTEL-001 at monitored after the trust repair.',
    readyAt: '2026-05-18T12:20:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID,
    title: 'Repair GitHub Build Intel source maturity monitoring gap',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P1',
    rank: 40,
    source: 'Live source maturity grid',
    summary: 'Add a truthful manual/on-demand monitoring boundary for the public GitHub Build Intel source without running GitHub extraction.',
    whyItMatters: 'Foundation can distinguish a monitored public read-only source contract from unapproved extraction, atoms, routes, or backlog mutation.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\`. Continue safe Foundation source work from live truth.`
      : 'Patch the source contract and docs with a manual/on-demand monitoring boundary, sync the source contract registry, and prove the next real gap remains extracted.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\`; monitored gap is repaired and extracted remains the next visible gap.`
      : `Scope/proof: \`${SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\`; no live GitHub call, extraction, atom, route, provider, or external-write work.`,
    owner: 'Foundation Source',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH,
    definitionOfDone: 'SRC-GITHUB-BUILD-INTEL-001 has an explicit manual/on-demand monitoring boundary in repo source contracts, docs, and synced DB registry; source maturity clears monitored only and exposes extracted as the next real gap; no live GitHub call, extraction, atom-flow, action route, provider/model call, code import, external write, or automatic backlog mutation occurs; focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PROOF_COMMANDS,
    readinessBlockerCleared: 'Live source maturity shows SRC-GITHUB-BUILD-INTEL-001 at monitored and existing source notes prove a bounded public read-only/proposal-only contract.',
    notNextBoundaries: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_APPROVAL_PATH,
      closeoutKey: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const planSource = await readRepoFile(SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH)
  const card = buildCardRow({ closeCard, stage })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'shared Foundation source contract, DB registry, and source maturity verification surface',
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
      [card.id, card.title, card.scope, card.lane, card.priority, card.rank, card.source, card.summary, card.whyItMatters, card.nextAction, card.statusNote, card.owner],
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
        `source-maturity-github-build-intel-monitoring-${stableRunId(SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH)}`,
        SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID,
        SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH,
        planReview.status,
        planReview.score,
        planReview.maxScore,
        planReview.passThreshold,
        card.priority,
        'full',
        true,
        SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID }),
        'codex-source-maturity-github-build-intel-monitoring-gap-repair',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-maturity-github-build-intel-monitoring-gap-repair',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        card.id,
        `${closeCard ? 'Closed' : 'Updated'} ${SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY, stage }),
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
    scriptPath: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update GitHub Build Intel monitoring-gap repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the public GitHub Build Intel monitored-stage source maturity gap without live GitHub or extraction work.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-github-build-intel-monitoring-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from live truth.'
            : 'Add the manual/on-demand monitoring boundary and keep extraction/atom/route gaps visible.',
          priorityOrder: [SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-GITHUB-BUILD-INTEL-001 has an explicit manual/on-demand monitoring boundary.',
            'The source contract registry is synced to DB truth.',
            'Source maturity clears monitored and exposes extracted as the next real gap.',
            'No live GitHub call, extraction, atom-flow, or action-route creation occurs.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-github-build-intel-monitoring-gap-repair',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close GitHub Build Intel monitoring-gap repair sprint item after focused proof.'
        : 'Start GitHub Build Intel monitoring-gap repair sprint item with complete scaffold metadata.',
    },
  )
  return upsert
}

async function buildLiveSnapshot() {
  const foundationSnapshot = await getFoundationSnapshot()
  const sources = getSourceContracts()
  const sourceContractValidation = evaluateSourceContractValidationLayer({ contracts: sources })
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
  const [sourceContractRegistry, sourceRegistryMarkdown, sourceNoteMarkdown] = await Promise.all([
    getSourceContractRegistrySnapshot(),
    readRepoFile('docs/source-registry.md'),
    readRepoFile('docs/source-notes/github-build-intel.md'),
  ])
  return buildSourceMaturityGithubBuildIntelMonitoringGapRepairSnapshot({
    sources,
    sourceMaturityGrid,
    sourceContractValidation,
    extractionControl: foundationSnapshot.extractionControl,
    sourceContractRegistry,
    sourceRegistryMarkdown,
    sourceNoteMarkdown,
  })
}

async function writeCloseout(snapshot) {
  await fs.writeFile(
    path.join(repoRoot, SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_PATH),
    renderGithubBuildIntelMonitoringGapRepairCloseout(snapshot),
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
  if (writeRequested) upsert = await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })

  const planSource = await readRepoFile(SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH)
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_APPROVAL_PATH,
    cardId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID,
  })
  const planReview = upsert?.planReview || evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'shared Foundation source contract, DB registry, and source maturity verification surface',
    repoRoot,
  })
  const live = await buildLiveSnapshot()
  const synthetic = buildSyntheticGithubBuildIntelMonitoringGapRepairProof()
  const cards = await getBacklogItemsByIds([SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint?.sprint,
    items: activeSprint?.items || [],
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const activeItem = list(activeSprint?.items).find(item => item.cardId === SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID) || null
  const card = cards[0] || buildCardRow({ closeCard: args.closeCard, stage: args.stage })
  const cardLane = text(card.lane)

  addCheck(checks, packageJson.scripts?.['process:source-maturity-github-build-intel-monitoring-gap-repair-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:source-maturity-github-build-intel-monitoring-gap-repair-check'] || 'missing')
  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval file is valid v2', approvalValidation.failures?.map(failure => failure.check).join(', ') || 'ok')
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes', `score=${planReview.score}`)
  addCheck(checks, Boolean(cards[0]), 'live backlog card exists', card.id || card.cardId || 'missing')
  addCheck(checks, args.closeCard ? cardLane === 'done' : ['scoped', 'executing'].includes(cardLane), 'live backlog card is in expected lane', cardLane || 'missing')
  addCheck(checks, Boolean(activeItem), 'Current Sprint includes GitHub Build Intel monitoring repair item', activeItem?.stage || 'missing')
  addCheck(checks, activeItem ? activeItem.planRef === SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH : false, 'Current Sprint item has plan ref', activeItem?.planRef || 'missing')
  addCheck(checks, activeItem ? list(activeItem.proofCommands).includes('npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-github-build-intel-monitoring-gap-repair --json') : false, 'Current Sprint proof commands include registry sync', list(activeItem?.proofCommands).join('; ') || 'missing')
  addCheck(checks, activeItem ? list(activeItem.proofCommands).includes('npm run process:source-maturity-github-build-intel-monitoring-gap-repair-check -- --close-card --json') : false, 'Current Sprint proof commands include close-card proof', list(activeItem?.proofCommands).join('; ') || 'missing')

  const onlyPreShipCloseoutFinding = args.closeCard &&
    list(currentSprintStatus.findings).length === 1 &&
    currentSprintStatus.findings[0]?.check === 'done_this_sprint_requires_recent_work_closeout'
  addCheck(
    checks,
    currentSprintStatus.status === 'healthy' || onlyPreShipCloseoutFinding,
    'Current Sprint status is not risk except pre-ship Recent Work closeout sync',
    onlyPreShipCloseoutFinding ? 'pre-ship closeout sync is proven by process:foundation-ship' : currentSprintStatus.findings?.map(finding => finding.detail).join('; ') || 'healthy',
  )
  addCheck(checks, synthetic.ok, 'synthetic GitHub Build Intel monitoring-gap dogfood passes', `before=${synthetic.before?.nextGap || 'missing'} after=${synthetic.after?.nextGap || 'missing'}`)
  for (const check of live.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(checks, live.status === 'healthy', 'live GitHub Build Intel monitoring-gap repair snapshot is healthy', live.failures.map(failure => failure.check).join(', ') || 'healthy')
  addCheck(checks, planSource.includes('manual/on-demand monitoring boundary') && planSource.includes('next real gap remains `extracted`') && planSource.includes('full `process:foundation-ship`'), 'plan names real behavior proof and full ship gate', SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_PLAN_PATH)
  addCheck(checks, (await readRepoFile('lib/foundation-build-closeout-source-records.js')).includes(SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY), 'closeout registry includes GitHub Build Intel monitoring repair record', SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY)
  addCheck(checks, (await readRepoFile('lib/foundation-verify-coverage-card-ids.js')).includes(SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID), 'verifier coverage card list includes GitHub Build Intel monitoring repair card', SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID)
  addCheck(checks, closeouts.some(record => record.key === SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY), 'build closeout registry exposes GitHub Build Intel monitoring repair closeout', SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY)

  if (args.closeCard) {
    await writeCloseout(live)
    const closeoutSource = await readRepoFile(SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_PATH)
    addCheck(checks, closeoutSource.includes(SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY) && closeoutSource.includes('No live GitHub calls'), 'closeout file is written', SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_PATH)
  }

  const findings = checks.filter(check => !check.ok)
  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_GAP_REPAIR_CLOSEOUT_KEY,
    stage: args.closeCard ? 'done_this_sprint' : normalizeStage(args.stage),
    planCritic: { status: planReview.status, score: planReview.score },
    synthetic: { ok: synthetic.ok, beforeNextGap: synthetic.before?.nextGap || null, afterNextGap: synthetic.after?.nextGap || null },
    repair: live.summary,
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source maturity GitHub Build Intel monitoring-gap repair check: ${result.status}`)
    console.log(`SOURCE_MATURITY_GITHUB_BUILD_INTEL_MONITORING_REPAIR_SUMMARY ${JSON.stringify(result.repair)}`)
    for (const finding of findings) console.log(`- ${finding.check}: ${finding.detail}`)
  }

  await closeFoundationDb()
  if (findings.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
