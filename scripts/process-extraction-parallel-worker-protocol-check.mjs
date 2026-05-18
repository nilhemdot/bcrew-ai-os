#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
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
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_APPROVAL_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_CHANGED_FILES,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_NOT_NEXT_BOUNDARIES,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_PLAN_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROOF_COMMANDS,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROTOCOL_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_SCRIPT_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_SPRINT_ID,
  buildExtractionParallelWorkerProtocolDogfoodProof,
  buildExtractionParallelWorkerProtocolSnapshot,
  renderExtractionParallelWorkerProtocolReport,
} from '../lib/extraction-parallel-worker-protocol.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const PRIOR_CARD_ID = 'EXTRACTION-TO-KB-ATOM-PIPELINE-001'
const PREREQ_CARD_ID = 'PARALLEL-BUILDER-OPERATING-SYSTEM-001'

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false, closeCard: false, stage: 'building_now' }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  if (args.closeCard) args.stage = 'done_this_sprint'
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function stableRunId(value = '') {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12)
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/parallel-builder-operating-system.js',
      'lib/extraction-to-kb-atom-pipeline.js',
      'lib/youtube-build-intel-batch.js',
      'lib/course-source-auth-boundary.js',
    ],
    existingDocs: [
      'docs/process/parallel-builder-operating-system-001-protocol.md',
      'docs/process/extraction-to-kb-atom-pipeline-001-plan.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-parallel-builder-operating-system-check.mjs',
      'scripts/process-extraction-to-kb-atom-pipeline-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingCards: [
      PRIOR_CARD_ID,
      PREREQ_CARD_ID,
      'YOUTUBE-BUILD-INTEL-BATCH-001',
      EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID,
    ],
    existingPolicy: [
      'Visible builders are default; hidden subagents require explicit approval.',
      'Extractor outputs must pass source-backed proposal-only routing before downstream persistence.',
      'Private, paid, course, Skool, MyICOR, Loom, and authorized-browser sources are approval-bound.',
    ],
    reused: [
      'Parallel builder visible worktree/branch ownership rules',
      'Extraction-to-KB/atom proposal-only downstream gate',
      'Source-auth approval boundary',
      'Current Sprint write guard and ship/fanout gates',
    ],
    notRebuilt: [
      'No extractor runtime.',
      'No live worker launch.',
      'No source crawler or transcript fetcher.',
      'No artifact importer or downstream writer.',
    ],
    exactGap: 'Parallel extraction workers need source-packet, artifact-path, quality-gate, wrap-report, and stop-condition protocol before any worker can safely run.',
    overBroadRisk: 'This can drift into launching workers or extracting public/private sources. V1 stays protocol/proof only.',
    readyBy: 'Codex Foundation builder',
    readyAt: '2026-05-18T22:20:00.000-04:00',
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
    title: 'Define parallel deep-extraction worker protocol',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 15,
    source: '2026-05-18 agent/extractor planning conversation',
    summary: 'Define the visible parallel extraction worker protocol: source-packet ownership, artifact paths, permission class, quality gate, wrap report, merge/import flow, and stop conditions before any extraction worker can run.',
    whyItMatters: 'Extraction speed only helps if multiple workers cannot collide, touch private sources, write downstream state, or leave Steve with unclear artifact ownership and dirty-state ambiguity.',
    nextAction: closeCard
      ? `Done under ${EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY}. Continue ${EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID} as preflight only; do not launch extraction workers.`
      : 'Build the protocol/proof only. Do not launch workers, fetch transcripts, crawl sources, use private auth, call models, or write downstream systems.',
    statusNote: closeCard
      ? `Closed under \`${EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY}\`; visible extraction workers require unique source packets, artifact paths, permission classes, wrap reports, quality gates, and approval-bound stop conditions.`
      : `Executing under \`${EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY}\`; protocol/proof only, no live extraction.`,
    owner: 'Foundation',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: EXTRACTION_PARALLEL_WORKER_PROTOCOL_PLAN_PATH,
    definitionOfDone: 'Visible extraction workers have source-packet ownership, artifact path, permission class, wrap report, quality gate, and stop conditions before any parallel extraction starts; unsafe/private/live/write fixtures fail closed; verifier coverage and full ship gate pass.',
    proofCommands: EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROOF_COMMANDS,
    readinessBlockerCleared: `${PRIOR_CARD_ID} closed proposal-only output routing gates and ${PREREQ_CARD_ID} closed visible builder ownership rules.`,
    notNextBoundaries: EXTRACTION_PARALLEL_WORKER_PROTOCOL_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: EXTRACTION_PARALLEL_WORKER_PROTOCOL_APPROVAL_PATH,
      closeoutKey: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY,
      protocolRef: EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROTOCOL_PATH,
      recommendedNext: EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'MyICOR source/auth/course extraction preflight exists without scraping, downloading, screenshotting, transcript fetching, summarizing, or private-source extraction.',
    proofCommands: [
      'scope-first: create source-auth preflight plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID} closed worker protocol gates.`,
    notNextBoundaries: EXTRACTION_PARALLEL_WORKER_PROTOCOL_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
      nextAfterCloseoutKey: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY,
      privateSourcePreflightOnly: true,
      liveExtractionApproved: false,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now', planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard })
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, owner, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
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
        INSERT INTO plan_critic_runs (run_id, card_id, plan_ref, status, score, max_score, pass_threshold, priority, gate_level, full_verify_required, changed_files, findings, result, requested_by)
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-extraction-parallel-worker-protocol')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result
      `,
      [
        `extraction-parallel-worker-protocol-${stableRunId(EXTRACTION_PARALLEL_WORKER_PROTOCOL_PLAN_PATH)}`,
        EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
        EXTRACTION_PARALLEL_WORKER_PROTOCOL_PLAN_PATH,
        planReview.status,
        planReview.score,
        EXTRACTION_PARALLEL_WORKER_PROTOCOL_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-extraction-parallel-worker-protocol',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID}.`,
        JSON.stringify({ closeoutKey: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY, stage }),
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
    scriptPath: EXTRACTION_PARALLEL_WORKER_PROTOCOL_SCRIPT_PATH,
    operation: 'create/update extraction worker protocol card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: EXTRACTION_PARALLEL_WORKER_PROTOCOL_SPRINT_ID,
        status: 'active',
        goal: 'Define visible parallel extraction worker protocol without launching extraction.',
        activeBlockerCardId: closeCard ? EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID : EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-extraction-parallel-worker-protocol',
          currentStatus: closeCard ? 'next_scoping' : stage,
          closeoutKey: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID} as source-auth preflight only.`
            : 'Write protocol/proof and keep extraction workers unlaunched.',
          priorityOrder: [
            EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
            EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID,
            'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001',
          ],
          notNext: EXTRACTION_PARALLEL_WORKER_PROTOCOL_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Visible extraction assignments require source packet, artifact path, permission class, quality gate, wrap report, and stop conditions.',
            'Duplicate packet/path, private source without approval, launched worker, missing gate/wrap, direct write, hidden subagent, and shared-file-without-lock fixtures fail closed.',
            'No live extraction, private auth, model call, or downstream write runs.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()]
        : [buildSprintItem({ closeCard, stage })],
    },
    'codex-extraction-parallel-worker-protocol',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized safe parallel extraction worker protocol after extraction output routing.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(EXTRACTION_PARALLEL_WORKER_PROTOCOL_PLAN_PATH)
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })
  if (writeRequested && !(planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE)) {
    throw new Error(`Plan Critic must pass before write. status=${planCritic.status} score=${planCritic.score}`)
  }
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview: planCritic })

  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    packageSource,
    moduleSource,
    scriptSource,
    verifierSource,
    closeoutRecordsSource,
    protocolDoc,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: EXTRACTION_PARALLEL_WORKER_PROTOCOL_APPROVAL_PATH, cardId: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID }),
    getBacklogItemsByIds([EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID, PRIOR_CARD_ID, PREREQ_CARD_ID, EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile('lib/extraction-parallel-worker-protocol.js'),
    readRepoFile(EXTRACTION_PARALLEL_WORKER_PROTOCOL_SCRIPT_PATH),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROTOCOL_PATH),
    readRepoFile(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID) || null
  const priorCard = cards.find(item => item.id === PRIOR_CARD_ID) || null
  const prereqCard = cards.find(item => item.id === PREREQ_CARD_ID) || null
  const nextCard = cards.find(item => item.id === EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const snapshot = buildExtractionParallelWorkerProtocolSnapshot()
  const dogfood = buildExtractionParallelWorkerProtocolDogfoodProof()
  const renderedReport = renderExtractionParallelWorkerProtocolReport(snapshot)

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || EXTRACTION_PARALLEL_WORKER_PROTOCOL_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'pass' : 'missing')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live extraction worker protocol card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, priorCard?.lane === 'done', 'extraction-to-KB pipeline prerequisite is closed', priorCard ? `${priorCard.id}:${priorCard.lane}` : 'missing')
  addCheck(checks, prereqCard?.lane === 'done', 'parallel builder operating-system prerequisite is closed', prereqCard ? `${prereqCard.id}:${prereqCard.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next MyICOR preflight card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains worker protocol item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  if (args.closeCard || card?.lane === 'done') {
    addCheck(checks, nextSprintItem?.stage === 'scoping', 'Current Sprint advances next preflight card after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready', 'worker protocol snapshot is ready', JSON.stringify(snapshot.summary))
  addCheck(checks, snapshot.extractionWorkersLaunched === false && snapshot.liveExtractionApprovedByThisCard === false, 'protocol remains no-launch/no-live-extraction', JSON.stringify({ extractionWorkersLaunched: snapshot.extractionWorkersLaunched, liveExtractionApprovedByThisCard: snapshot.liveExtractionApprovedByThisCard }))
  addCheck(checks, snapshot.summary.visibleWorkerCount >= 2 && snapshot.summary.uniqueSourcePacketCount >= 2 && snapshot.summary.uniqueArtifactRootCount >= 2, 'protocol declares visible unique worker ownership', JSON.stringify(snapshot.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe worker protocol variants', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, protocolDoc.includes('Assignment Format') && protocolDoc.includes('Stop Conditions') && protocolDoc.includes('Wrap Report Format'), 'protocol doc has assignment/stop/wrap formats', EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROTOCOL_PATH)
  addCheck(checks, closeoutDoc.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID) && closeoutDoc.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('Worker assignments') && renderedReport.includes('Dogfood'), 'rendered report summarizes workers and dogfood', 'report renderer')
  addCheck(checks, verifierSource.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID) && verifierSource.includes('buildExtractionParallelWorkerProtocolDogfoodProof'), 'intelligence/audit verifier covers worker protocol', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, closeoutRecordsSource.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY), 'closeout registry includes worker protocol closeout', EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY)
  addCheck(checks, currentPlan.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY) && currentPlan.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID), 'current plan names closeout and next card', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY) && currentState.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID), 'current state names closeout and next card', 'docs/rebuild/current-state.md')
  addCheck(checks, packageJson.scripts?.['process:extraction-parallel-worker-protocol-check'] === `node --env-file-if-exists=.env ${EXTRACTION_PARALLEL_WORKER_PROTOCOL_SCRIPT_PATH}`, 'package registers focused proof script', 'process:extraction-parallel-worker-protocol-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'worker protocol module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      workerAssignmentCount: snapshot.summary.workerAssignmentCount,
      recommendedNext: snapshot.recommendedNext,
    },
    checks,
    failures: failed,
  }

  await closeFoundationDb()
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Extraction parallel worker protocol check: ${result.ok ? 'PASS' : 'FAIL'} (${result.summary.passed}/${result.summary.total})`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
  }
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
