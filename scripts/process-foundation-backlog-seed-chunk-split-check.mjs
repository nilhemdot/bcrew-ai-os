#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_APPROVAL_PATH,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_CARD_ID as CARD_ID,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_CHANGED_FILES as CHANGED_FILES,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_CLOSEOUT_PATH as CLOSEOUT_PATH,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_NEXT_CARD_ID as NEXT_CARD_ID,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_PLAN_PATH as PLAN_PATH,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_PROOF_COMMANDS as PROOF_COMMANDS,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_SCRIPT_PATH as SCRIPT_PATH,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_SPRINT_ID as SPRINT_ID,
  buildFoundationBacklogSeedChunkSplitDogfoodProof,
  buildFoundationBacklogSeedChunkSplitSnapshot,
} from '../lib/foundation-backlog-seed-chunk-split.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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

const NOT_NEXT = [
  'Do not change backlog card semantics or seed row content.',
  'Do not bootstrap, repair, or overwrite live Postgres backlog truth.',
  'Do not run live extraction.',
  'Do not run auth-required or paid jobs.',
  'No external sends.',
  'No Drive permission mutation.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Gmail/ClickUp sends.',
  'No Agent Feedback auto-send.',
  'Do not launch parallel builders or hidden subagents.',
  'Do not build Harlan/Fal/voice/Canva/OpenHuman features.',
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

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Foundation Backlog Seed Chunk Split',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 26,
    source: 'Steve 2026-05-18 continuous-builder priority: root file and closeout registry cleanup over 3K/5K before agent gates.',
    summary: 'Split the static Foundation backlog seed root into bounded chunks while preserving the exported backlogSeed contract and verifier source-bundle truth.',
    whyItMatters: 'The seed module was still above the 3,000-line architecture-risk threshold. Chunking it reduces shared-file collision risk without touching live backlog truth.',
    nextAction: closeCard
      ? `Done under foundation-backlog-seed-chunk-split-v1. Continue root cleanup from repo truth, then ${NEXT_CARD_ID}.`
      : 'Chunk the static seed, wire verifier source bundle reads through the chunks, and prove no live backlog repair or bootstrap write occurs.',
    statusNote: closeCard
      ? 'Closed under foundation-backlog-seed-chunk-split-v1; lib/foundation-backlog-seed.js is below 3,000 lines and static seed chunks are bounded.'
      : 'Executing foundation-backlog-seed-chunk-split-v1; static code ownership only, no live backlog mutation beyond card/sprint metadata.',
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'lib/foundation-backlog-seed.js is below 3,000 lines; seed chunks are below 1,500 lines; exported backlogSeed count and IDs are preserved; verifier source bundle reads the chunks; dogfood rejects monolithic seed roots, missing source chunks, and duplicate seed IDs; backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Build-lane verifier/telemetry reliability is green and the prior server/root cleanup phase shipped.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: {
      existingCode: 'Reuse backlogSeed import contract, DB seed governance, verifier source bundle, Foundation ship gate, and prior critical-root split patterns.',
      existingDocs: 'Reuse critical roots Phase 1-4 and DB seed split docs.',
      existingScripts: 'Reuse process:foundation-ship, backlog:hygiene, foundation:verify, Plan Critic, approval integrity, and process write guard.',
      existingPolicy: 'Live Postgres/API remains operational truth; backlogSeed remains bootstrap/default doctrine only.',
      exactGap: 'lib/foundation-backlog-seed.js remained over 3,000 lines after the DB/schema/store splits.',
      reused: 'Existing seed rows are mechanically preserved in chunk modules; runtime consumers keep importing backlogSeed from the same module path.',
      notRebuilt: 'No backlog rewrite, no semantic seed edits, no live extraction, no external write, no UI redesign.',
      overBroadRisk: 'This could drift into live backlog repair or seed promotion; this card only changes code ownership for static seed data.',
      readyBy: 'Steve prioritized root file cleanup over 3K/5K before agent gates.',
      readyAt: '2026-05-18T17:40:00-04:00',
    },
    metadata: {
      approvalRef: FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_APPROVAL_PATH,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'Agent usefulness runtime gates are scoped with live-answer preflight, capability registry, action permission contract, stale-data warning, source-backed status claim guard, failure visibility, and proof that prompt-only rules are rejected.',
    proofCommands: [
      'scope-first: create plan/approval/proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:foundation-ship -- --card=FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001 --commitRef=HEAD',
    ],
    readinessBlockerCleared: 'Backlog seed root cleanup shipped and build-lane verifier reliability is green.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: {
      existingCode: 'Reuse agent feedback runtime lessons, source-contract trust, verifier gates, and process write guards.',
      existingDocs: 'Reuse Steve May 18 agent/extractor planning context and live backlog card context.',
      existingScripts: 'Reuse foundation:verify, backlog:hygiene, process:foundation-ship, and focused process proof patterns.',
      existingPolicy: 'Prompt-only rules are not enough; important agent behavior must be enforced by runtime gates.',
      exactGap: 'Agents can still sound current or capable without code-enforced live checks, capability truth, and failure visibility.',
      reused: 'Existing cards AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001, AGENT-CAPABILITY-REGISTRY-001, and AGENT-TEMPLATE-RUNTIME-CONTRACT-001 inform the gate bundle.',
      notRebuilt: 'No Harlan UI, no feature work, no live extraction, no external writes, and no hidden subagents.',
      overBroadRisk: 'This can sprawl into Harlan/product work; keep the next card scoped to runtime gates and proof.',
      readyBy: 'Steve made agent usefulness gates the next priority after reliability and root cleanup.',
      readyAt: '2026-05-18T17:55:00-04:00',
    },
    metadata: {
      inheritedFrom: CARD_ID,
      nextAfterCloseoutKey: CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-backlog-seed-chunk-split')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `backlog-seed-chunk-split-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-backlog-seed-chunk-split',$3,$4::jsonb)
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
    operation: 'create/update backlog seed chunk split card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Split the static Foundation backlog seed root into bounded chunks while preserving runtime and verifier contracts.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-backlog-seed-chunk-split',
          currentStatus: closeCard ? 'next_scoping' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue ${NEXT_CARD_ID} from repo truth unless another root cleanup card is safer.`
            : 'Finish static seed chunk split, prove source-bundle compatibility, then run full ship gates.',
          priorityOrder: [CARD_ID, NEXT_CARD_ID],
          notNext: NOT_NEXT,
          exitCriteria: [
            'lib/foundation-backlog-seed.js is below 3,000 lines.',
            'Seed chunks are below 1,500 lines.',
            'backlogSeed export preserves row count and unique IDs.',
            'Verifier source bundle reads chunk sources.',
            'foundation:verify and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()] : [buildSprintItem({ closeCard, stage })],
    },
    'codex-backlog-seed-chunk-split',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized root file cleanup over 3K/5K before agent gates.',
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
    declaredRisk: 'static backlog seed chunk split under root-file size discipline',
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
    sizeRecordsSource,
    foundationVerifySource,
    closeoutDocExists,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-size-records.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    repoFileExists(CLOSEOUT_PATH),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])

  const snapshot = buildFoundationBacklogSeedChunkSplitSnapshot({ repoRoot })
  const dogfood = buildFoundationBacklogSeedChunkSplitDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const card = cards[0] || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const planCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const scriptSourceWithoutSelfCheck = scriptSource
    .replaceAll("'spawn_agent'", '')
    .replaceAll("'send_input'", '')

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `score=${planReview.score}`)
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticPass ? 'pass row' : 'missing')
  addCheck(checks, Boolean(card), 'live backlog card exists', card ? `${card.id}/${card.lane}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.ok ? 'complete' : scaffold.missing.join(', '))
  addCheck(checks, sprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint includes backlog seed chunk split card', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.ok ? 'complete' : sprintMetadata.missing.join(', '))
  addCheck(checks, packageJson.scripts?.['process:foundation-backlog-seed-chunk-split-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-backlog-seed-chunk-split-check'] || 'missing')
  addCheck(checks, snapshot.ok, 'backlog seed chunk split snapshot passes', JSON.stringify({ root: snapshot.root, chunks: snapshot.chunks, seedRows: snapshot.seedRows }))
  addCheck(checks, dogfood.ok, 'dogfood rejects monolithic seed root and weak chunk proof', dogfood.dogfoodInvariant)
  addCheck(checks, Boolean(closeout), 'closeout registry exposes backlog seed chunk split closeout', closeout ? closeout.key : 'missing')
  addCheck(checks, sizeRecordsSource.includes(CLOSEOUT_KEY) && sizeRecordsSource.includes(CARD_ID), 'size closeout records include this card', 'lib/foundation-build-closeout-size-records.js')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage source includes this card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, foundationVerifySource.includes(CARD_ID) && foundationVerifySource.includes('readFoundationBacklogSeedSourceBundle'), 'foundation verifier recognizes seed chunks and progression', 'scripts/foundation-verify.mjs')
  addCheck(checks, closeoutDocExists, 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, scriptSource.includes('Do not bootstrap, repair, or overwrite live Postgres backlog truth'), 'proof records live-truth no-repair boundary', 'safe static split only')
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
    console.log(`Foundation backlog seed chunk split check: ${result.status}`)
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
