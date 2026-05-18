#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_APPROVAL_PATH,
  BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_CARD_ID as CARD_ID,
  BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_CLOSEOUT_KEY as CLOSEOUT_KEY,
  BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_CLOSEOUT_PATH as CLOSEOUT_PATH,
  BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_PLAN_PATH as PLAN_PATH,
  BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_SCRIPT_PATH as SCRIPT_PATH,
  BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_SPRINT_ID as SPRINT_ID,
  buildVerifierSnapshotWiringDogfoodProof,
  classifyFoundationVerifyFailures,
} from '../lib/foundation-verifier-snapshot-wiring-repair.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
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
import { readFoundationBacklogSeedSourceBundle } from '../lib/foundation-backlog-seed-source.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CHANGED_FILES = [
  'lib/foundation-verifier-snapshot-wiring-repair.js',
  'scripts/foundation-verify.mjs',
  SCRIPT_PATH,
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  PLAN_PATH,
  BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_APPROVAL_PATH,
  CLOSEOUT_PATH,
]

const PROOF_COMMANDS = [
  'node --check lib/foundation-verifier-snapshot-wiring-repair.js scripts/foundation-verify.mjs scripts/process-build-lane-verifier-snapshot-wiring-repair-check.mjs',
  'npm run process:build-lane-verifier-snapshot-wiring-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:foundation-ship -- --card=${CARD_ID} --planApprovalRef=${BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --commitRef=HEAD`,
]

const NOT_NEXT = [
  'Do not use hidden subagents.',
  'Do not launch parallel builders.',
  'Do not weaken, skip, bypass, or demote real verifier failures.',
  'Do not rerun live external-write jobs.',
  'Do not run live extraction.',
  'Do not mutate Google Drive permissions.',
  'No live Agent Feedback auto-send or reminder send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
]

const FAILURE_FIXTURE = [
  { check: 'source crawl ledger is run-id, lease-owner, and item-key safe' },
  { check: 'VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001 extracts core governance/security verifier checks into a focused module' },
  { check: 'INTEL-JOBS-001 intelligence job ledger is schema-backed and wired into governed extraction' },
  { check: 'INTEL-ATOM-001 stores governed report artifacts, atoms, hits, and Scoper-queryable proof' },
  { check: 'RETRIEVAL-001 promotes real candidates into atom-backed lexical chunks with tier guard' },
  { check: 'SYNTHESIS-FACTS-001 persists source-backed facts and hybrid evidence for governed synthesis' },
  { check: 'SYNTHESIS-ENGINE-001 clusters and classifies synthesized items instead of atom-thread spam' },
  { check: 'ACTION-ROUTER-001 creates approval-gated routes with owner and provenance before Strategy Hub resumes' },
  { check: 'Drive content extraction target supports governed Docs/Sheets/PDF/text/markdown/OCR/link inventory' },
  { check: 'Gmail attachment extraction target is governed and source-ledgered' },
  { check: 'video content extraction target is governed and source-ledgered' },
  { check: 'shared-comms processing selector is content-hash scoped' },
  { check: 'Foundation worker startup code matches current repo HEAD' },
  { check: 'Strategy Hub v2 renders source-to-gap and route review while advisor remains offline' },
  { check: 'agent onboarding feedback form is source-backed and replay-hardened' },
  { check: 'AGENT-FEEDBACK-SEND-001 builds Stage 1 send infrastructure with dry-run proof only' },
  { check: 'AGENT-FEEDBACK-REMINDER-CADENCE-001 remains the proven reminder cadence foundation' },
  { check: 'AGENT-FEEDBACK-LIVE-REMINDERS-001 live reminders are enabled and visible' },
  { check: 'SYSTEM-010-GHOST-CLOSEOUT-001 closes runtime/process-control readiness blocker' },
  { check: 'RUNTIME-SUPERVISOR-001 exposes dashboard/worker service supervision without claiming auto-restart' },
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

function list(value) {
  return Array.isArray(value) ? value : []
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
    existingCode: 'Reuse foundation:verify module orchestration, DB split module, source stores, live API snapshots, build-lane telemetry, Current Sprint overlay, Plan Critic, and closeout registry.',
    existingDocs: 'Reuse May 18 DB split closeout, build-lane reliability docs, verifier split plans, and Foundation ship gate docs.',
    existingScripts: 'Reuse foundation:verify, process:foundation-ship, backlog hygiene, approval integrity, and build-lane focused proof patterns.',
    existingPolicy: 'Full foundation:verify must pass honestly; approval-bound or pending live state must be classified without rerunning live external-write jobs.',
    reused: 'Existing source files and live snapshots are re-bundled; no new verifier bypass lane is introduced.',
    notRebuilt: 'No verifier rewrite, no extraction run, no external writes, no hidden subagent worker model, and no UI redesign.',
    exactGap: 'Verifier DB source snapshots still assumed schema/seed/store tokens lived in lib/foundation-db.js after the DB split moved them.',
    overBroadRisk: 'This could drift into fixing every historical source lane; this card only fixes stale verifier wiring and safe false-red handling.',
    readyBy: 'Steve pulled BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001 after full foundation:verify went red across unrelated verifier lanes.',
    readyAt: '2026-05-18T15:15:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Build Lane Verifier Snapshot Wiring Repair',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 25,
    source: 'Steve 2026-05-18 build-lane reliability queue plus full foundation:verify red snapshot after DB schema/seed split.',
    summary: 'Repair stale verifier source snapshot wiring so full foundation:verify reads the split DB schema/seed/store sources and classifies approval-bound live state instead of reporting unrelated false reds.',
    whyItMatters: 'Builders cannot ship safely if full foundation:verify goes red because baseline inputs point at old file ownership instead of current repo truth.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue the reliability queue from live backlog truth.`
      : 'Patch verifier source bundle wiring, classify every red row, repair safe runtime drift, and pass full Foundation ship gates.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; foundation:verify passes without live extraction, external writes, hidden subagents, or bypassed ship.`
      : `Executing ${CLOSEOUT_KEY}; verifier snapshot wiring repair only.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'Exact verifier failures are classified, split DB source snapshots are wired, approval-bound states are explicit, focused proof passes, foundation:verify passes, process:foundation-ship passes, and commit/push is clean.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Full foundation:verify red across unrelated lanes after the DB split exposed stale verifier source snapshot assumptions.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_APPROVAL_PATH,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-verifier-snapshot-wiring-repair')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `build-lane-verifier-snapshot-wiring-repair-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-verifier-snapshot-wiring-repair',$3,$4::jsonb)
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
    operation: 'create/update verifier snapshot wiring repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Repair verifier snapshot wiring so full foundation:verify passes honestly again.',
        activeBlockerCardId: closeCard ? null : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-verifier-snapshot-wiring-repair',
          currentStatus: closeCard ? 'complete' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the reliability queue from live backlog truth.'
            : 'Repair verifier source bundle wiring, prove classification, and run full gates.',
          priorityOrder: [CARD_ID, 'SPRINT-STATE-MUTATION-AUDIT-001', 'PROCESS-CHECK-READONLY-MODE-001'],
          notNext: NOT_NEXT,
          exitCriteria: [
            'Every reproduced verifier failure is classified as stale wiring, real runtime/system-health, or approval-bound.',
            'Split DB schema/seed/store sources are included in the verifier source snapshot.',
            'No live extraction or external-write job runs.',
            'foundation:verify and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage })],
    },
    'codex-verifier-snapshot-wiring-repair',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized verifier snapshot wiring repair after full foundation:verify went red across unrelated lanes.',
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
    declaredRisk: 'canonical foundation:verify baseline and live verifier result semantics',
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
    foundationDbSource,
    foundationDbSchemaSeedStoreSource,
    foundationBacklogSeedSource,
    foundationBacklogStoreSource,
    foundationDecisionStoreSource,
    foundationCoreSeedSource,
    foundationSharedCommsStoreSource,
    foundationSourceCrawlStoreSource,
    foundationDriveMeetingVaultStoreSource,
    foundationAgentFeedbackStoreSource,
    foundationRuntimeJobStoreSource,
    foundationLlmRuntimeStoreSource,
    intelligenceAtomsSource,
    intelligenceRetrievalSource,
    intelligenceSynthesisFactsSource,
    intelligenceSynthesisSource,
    intelligenceActionRouterSource,
    foundationVerifySource,
    moduleSource,
    agentFeedbackSendSource,
    agentFeedbackReminderSource,
    closeoutRegistrySource,
    coverageSource,
    closeoutDocExists,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: BUILD_LANE_VERIFIER_SNAPSHOT_WIRING_REPAIR_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-db-schema-seed-store.js'),
    readFoundationBacklogSeedSourceBundle({ readRepoFile }),
    readRepoFile('lib/foundation-backlog-store.js'),
    readRepoFile('lib/foundation-decision-store.js'),
    readRepoFile('lib/foundation-core-seed.js'),
    readRepoFile('lib/foundation-shared-comms-store.js'),
    readRepoFile('lib/foundation-source-crawl-store.js'),
    readRepoFile('lib/foundation-drive-meeting-vault-store.js'),
    readRepoFile('lib/foundation-agent-feedback-store.js'),
    readRepoFile('lib/foundation-runtime-job-store.js'),
    readRepoFile('lib/foundation-llm-runtime-store.js'),
    readRepoFile('lib/intelligence-atoms.js'),
    readRepoFile('lib/intelligence-retrieval.js'),
    readRepoFile('lib/intelligence-synthesis-facts.js'),
    readRepoFile('lib/intelligence-synthesis.js'),
    readRepoFile('lib/intelligence-action-router.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verifier-snapshot-wiring-repair.js'),
    readRepoFile('lib/agent-feedback-send.js'),
    readRepoFile('lib/agent-feedback-reminders.js'),
    readRepoFile('lib/foundation-build-closeout-build-lane-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    repoFileExists(CLOSEOUT_PATH),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])

  const card = cards[0] || null
  const sprintItem = list(sprint?.items).find(item => item.cardId === CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const planCriticPass = list(planCriticRuns).some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)
  const dogfood = buildVerifierSnapshotWiringDogfoodProof({
    foundationDbSource,
    foundationDbSchemaSeedStoreSource,
    foundationBacklogSeedSource,
    foundationBacklogStoreSource,
    foundationDecisionStoreSource,
    foundationCoreSeedSource,
    foundationSharedCommsStoreSource,
    foundationSourceCrawlStoreSource,
    foundationDriveMeetingVaultStoreSource,
    foundationAgentFeedbackStoreSource,
    foundationRuntimeJobStoreSource,
    foundationLlmRuntimeStoreSource,
    intelligenceAtomsSource,
    intelligenceRetrievalSource,
    intelligenceSynthesisFactsSource,
    intelligenceSynthesisSource,
    intelligenceActionRouterSource,
    foundationVerifySource,
  })
  const classification = classifyFoundationVerifyFailures(FAILURE_FIXTURE)
  const scaffold = validateBuildLaneCardScaffold(card || buildCardRow({ closeCard: args.closeCard, stage: args.stage }))
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || buildSprintItem({ closeCard: args.closeCard, stage: args.stage }))

  addCheck(checks, approval.ok, 'plan approval validates', approval.ok ? approval.approval?.approvedPlanRef : approval.error)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic score is 9.8+', `${planReview.status} ${planReview.score}`)
  addCheck(checks, planCriticPass || !writeRequested, 'durable Plan Critic run exists after apply', planCriticPass ? 'pass row present' : 'not yet applied')
  addCheck(checks, scaffold.ok, 'live backlog card scaffold is rich enough', scaffold.missing.join(', ') || CARD_ID)
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || SPRINT_ID)
  addCheck(checks, dogfood.ok, 'dogfood rejects stale root-only verifier source wiring', dogfood.invariant)
  addCheck(checks, classification.ok, 'current verifier failures classify without unknown rows', JSON.stringify(classification.summary))
  addCheck(checks, packageJson.scripts?.['process:build-lane-verifier-snapshot-wiring-repair-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:build-lane-verifier-snapshot-wiring-repair-check'] || 'missing')
  addCheck(checks, closeout?.operatorCloseout === true, 'closeout registry contains operator closeout', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || closeoutDocExists, 'closeout handoff exists before closing card', closeoutDocExists ? CLOSEOUT_PATH : 'missing')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage references repair card', CARD_ID)
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY), 'closeout registry references closeout key', CLOSEOUT_KEY)
  addCheck(
    checks,
    agentFeedbackSendSource.includes('readFoundationDbVerifierSource') &&
      agentFeedbackReminderSource.includes('readFoundationDbVerifierSource') &&
      agentFeedbackSendSource.includes('lib/foundation-db-schema-seed-store.js') &&
      agentFeedbackReminderSource.includes('lib/foundation-agent-feedback-store.js'),
    'Agent Feedback status helpers read split DB verifier source',
    'send/reminder aggregate source readers',
  )
  addCheck(checks, moduleSource.includes('approval_bound_side_effect') && moduleSource.includes('real_runtime_system_health'), 'classifier distinguishes approval-bound from broken', 'classification vocabulary present')
  addCheck(checks, !foundationVerifySource.includes('spawn_agent') && !foundationVerifySource.includes('hidden subagent'), 'foundation verify path does not use hidden subagents', 'no hidden worker tokens')

  const result = {
    ok: checks.every(check => check.ok),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    checks,
    dogfood,
    classification,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(result.ok ? 'PASS build-lane verifier snapshot wiring repair check' : 'FAIL build-lane verifier snapshot wiring repair check')
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
  }

  await closeFoundationDb()
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
