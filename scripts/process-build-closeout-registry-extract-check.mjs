#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_APPROVAL_PATH,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_CARD_ID,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_CHANGED_FILES,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_CLOSEOUT_KEY,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_CLOSEOUT_PATH,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_MODULE_PATHS,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_PLAN_PATH,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_PROOF_COMMANDS,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_ROOT_PATHS,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_SCRIPT_PATH,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_SPRINT_ID,
  buildBuildCloseoutRegistryExtractDogfoodProof,
  buildBuildCloseoutRegistryExtractSnapshot,
} from '../lib/build-closeout-registry-extract.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = BUILD_CLOSEOUT_REGISTRY_EXTRACT_CARD_ID
const CLOSEOUT_KEY = BUILD_CLOSEOUT_REGISTRY_EXTRACT_CLOSEOUT_KEY
const PLAN_PATH = BUILD_CLOSEOUT_REGISTRY_EXTRACT_PLAN_PATH
const APPROVAL_PATH = BUILD_CLOSEOUT_REGISTRY_EXTRACT_APPROVAL_PATH
const CLOSEOUT_PATH = BUILD_CLOSEOUT_REGISTRY_EXTRACT_CLOSEOUT_PATH
const SCRIPT_PATH = BUILD_CLOSEOUT_REGISTRY_EXTRACT_SCRIPT_PATH
const SPRINT_ID = BUILD_CLOSEOUT_REGISTRY_EXTRACT_SPRINT_ID
const CHANGED_FILES = BUILD_CLOSEOUT_REGISTRY_EXTRACT_CHANGED_FILES
const PROOF_COMMANDS = BUILD_CLOSEOUT_REGISTRY_EXTRACT_PROOF_COMMANDS

const NOT_NEXT = [
  'Do not redesign Recent Builds.',
  'Do not change closeout matching or build-log enrichment behavior.',
  'Do not delete or rewrite closeout records.',
  'Do not launch parallel builders.',
  'Do not use hidden subagents.',
  'No live extraction.',
  'No auth-required or paid run.',
  'No external write.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Google Drive permissions.',
  'No Drive permission mutation.',
  'No Gmail/ClickUp sends.',
  'No live Agent Feedback auto-send.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
]

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

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: 'Reuse getFoundationBuildCloseouts(), the existing closeout record modules, Foundation verifier source bundling, file-size standard, and ship/fanout gates.',
    existingDocs: 'Reuse critical-files-under-5k, critical-roots-under-3k, file-size standard, and foundation-build-closeout-registry-split closeouts.',
    existingScripts: 'Reuse process:fanout-check, process:ship-check, backlog:hygiene, foundation:verify, and process:foundation-ship.',
    existingPolicy: 'Closeout records stay durable repo truth; large registry roots must become import/spread orchestration instead of absorbing new record groups.',
    reused: 'Existing closeout registry, Recent Builds behavior, Plan Critic, process write guard, Current Sprint overlay, and file-size standard.',
    notRebuilt: 'No second closeout registry, no Recent Builds redesign, no build-log matching rewrite, and no closeout deletion.',
    exactGap: 'The root and overnight closeout registry files were over the 3,000-line architecture-risk threshold even after the first registry split.',
    overBroadRisk: 'This could drift into behavior changes or record deletion. This card only moves literal record ownership while preserving public output.',
    readyBy: 'Steve prioritized root file and closeout registry cleanup after build-lane verifier/telemetry reliability went green.',
    readyAt: '2026-05-18T12:25:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Build Closeout Registry Extract',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 23,
    source: 'Steve 2026-05-18 priority order: root file and closeout registry cleanup over 3K/5K.',
    summary: 'Extract oversized build closeout registry record groups into focused modules without changing Recent Builds behavior.',
    whyItMatters: 'Closeout truth grows every card. Keeping it modular prevents the registry from sliding back into a monolith that is hard to review.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue root-file cleanup from repo truth, then agent usefulness runtime gates.`
      : 'Extract root/overnight registry records into small modules, prove no closeouts disappeared, and ship through full Foundation gates.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; root and overnight closeout registry files are below 3,000 lines with public behavior preserved.`
      : `Executing ${CLOSEOUT_KEY}; record ownership only, no Recent Builds redesign or closeout deletion.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'Closeout registry root and overnight files are below 3,000 lines, extracted modules stay below 1,500 lines, getFoundationBuildCloseouts still exposes moved representative records, focused proof passes, backlog hygiene passes, foundation:verify passes, process:foundation-ship passes, commit/push is clean.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Build-lane telemetry is green; closeout registry file-size cleanup is now the next root-file priority.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: APPROVAL_PATH,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now', planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
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
      [row.id, row.title, row.scope, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-build-closeout-registry-extract')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `build-closeout-registry-extract-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-build-closeout-registry-extract',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, stage }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update build closeout registry extract backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Extract oversized build closeout registry roots into focused modules without behavior drift.',
        activeBlockerCardId: closeCard ? null : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-build-closeout-registry-extract',
          currentStatus: closeCard ? 'complete' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue root-file cleanup from repo truth.'
            : 'Extract closeout registry record groups, prove no records disappeared, then run full ship gates.',
          priorityOrder: [CARD_ID, 'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001'],
          notNext: NOT_NEXT,
          exitCriteria: [
            'Root and overnight closeout registry files are below 3,000 lines.',
            'Extracted record modules stay below 1,500 lines.',
            'getFoundationBuildCloseouts still exposes representative moved records.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage })],
    },
    'codex-build-closeout-registry-extract',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized root file and closeout registry cleanup after build-lane reliability went green.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'closeout registry root-file extraction and verifier source bundling',
    repoRoot,
  })

  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview })

  const [
    approval,
    packageJson,
    scriptSource,
    coverageSource,
    foundationVerifySource,
    closeoutDocExists,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    repoFileExists(CLOSEOUT_PATH),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])

  const snapshot = buildBuildCloseoutRegistryExtractSnapshot({ repoRoot })
  const dogfood = buildBuildCloseoutRegistryExtractDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const card = cards[0] || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const planCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const historicalDoneCard = card?.lane === 'done' && !sprintItem
  const currentSprintOk = (sprint.sprint?.sprintId === SPRINT_ID && Boolean(sprintItem)) || historicalDoneCard
  const sprintMetadataOk = sprintMetadata.ok || historicalDoneCard
  const scriptSourceWithoutSelfCheck = scriptSource
    .replaceAll("'spawn_agent'", '')
    .replaceAll("'send_input'", '')

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `score=${planReview.score}`)
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticPass ? 'pass row' : 'missing')
  addCheck(checks, Boolean(card), 'live backlog card exists', card ? `${card.id}/${card.lane}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.ok ? 'complete' : scaffold.missing.join(', '))
  addCheck(checks, currentSprintOk, 'Current Sprint includes registry extract card or card is historical done', historicalDoneCard ? 'historical done card outside active sprint' : sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadataOk, 'Current Sprint item metadata is complete or historical done card no longer needs active sprint metadata', historicalDoneCard ? 'historical done card outside active sprint' : sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, packageJson.scripts?.['process:build-closeout-registry-extract-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-closeout-registry-extract-check'] || 'missing')
  addCheck(checks, snapshot.ok, 'registry extraction snapshot passes', JSON.stringify({ roots: snapshot.rootRows, modules: snapshot.moduleRows, missingMovedKeys: snapshot.missingMovedKeys }))
  addCheck(checks, dogfood.ok, 'dogfood rejects oversized roots and missing moved keys', JSON.stringify(dogfood))
  addCheck(checks, snapshot.validation.invalidCloseoutKeys.length === 0, 'closeout registry validation stays clean', snapshot.validation.invalidCloseoutKeys.join(', ') || 'clean')
  addCheck(checks, snapshot.validation.ownershipOverlapViolations.length === 0, 'closeout ownership overlap validation stays clean', snapshot.validation.ownershipOverlapViolations.map(row => row.key).join(', ') || 'clean')
  addCheck(checks, Boolean(closeout), 'closeout registry exposes extract closeout', closeout ? closeout.key : 'missing')
  addCheck(
    checks,
    Boolean(closeout) && (closeout.backlogIds || []).includes(CARD_ID),
    'closeout records include this card through registry data source',
    closeout ? `${closeout.key} / ${(closeout.backlogIds || []).join(', ')}` : 'missing',
  )
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage source includes this card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(
    checks,
    foundationVerifySource.includes('foundationBuildCloseoutRegistryRecordSources') &&
      foundationVerifySource.includes('FOUNDATION_BUILD_LOG_REGISTRY_SOURCE_PATHS'),
    'foundation verifier reads closeout record module sources',
    'scripts/foundation-verify.mjs',
  )
  addCheck(checks, closeoutDocExists, 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, BUILD_CLOSEOUT_REGISTRY_EXTRACT_ROOT_PATHS.every(filePath => CHANGED_FILES.includes(filePath)) && BUILD_CLOSEOUT_REGISTRY_EXTRACT_MODULE_PATHS.every(filePath => CHANGED_FILES.includes(filePath)), 'changed-file list names root and extracted modules', 'complete')
  addCheck(checks, !scriptSourceWithoutSelfCheck.includes('spawn_agent') && !scriptSourceWithoutSelfCheck.includes('send_input'), 'focused proof does not invoke hidden worker tooling', 'clean')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'fail' : 'pass',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    sprintId: SPRINT_ID,
    checkCount: checks.length,
    failedCount: failed.length,
    snapshot,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Build closeout registry extract check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error?.stack || error?.message || String(error))
  await closeFoundationDb()
  process.exitCode = 1
})
