#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  EXTRACTION_TEAM_RUNTIME_APPROVAL_PATH,
  EXTRACTION_TEAM_RUNTIME_CARD_ID,
  EXTRACTION_TEAM_RUNTIME_CHANGED_FILES,
  EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY,
  EXTRACTION_TEAM_RUNTIME_CLOSEOUT_PATH,
  EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID,
  EXTRACTION_TEAM_RUNTIME_NOT_NEXT_BOUNDARIES,
  EXTRACTION_TEAM_RUNTIME_PLAN_PATH,
  EXTRACTION_TEAM_RUNTIME_PROOF_COMMANDS,
  EXTRACTION_TEAM_RUNTIME_SCRIPT_PATH,
  EXTRACTION_TEAM_RUNTIME_SPRINT_ID,
  buildExtractionTeamRuntimeDogfoodProof,
  buildExtractionTeamRuntimeSnapshot,
  renderExtractionTeamRuntimeReport,
} from '../lib/extraction-team-runtime.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: EXTRACTION_TEAM_RUNTIME_CARD_ID,
    title: 'Anchor the supervised Extraction Team runtime',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 7,
    source: '2026-05-18 agent/extractor planning conversation',
    summary: 'Compose the existing source-auth, public queue, runtime readiness, visible worker, proposal-output, and private-source preflight gates into one supervised Extraction Team runtime contract.',
    whyItMatters: 'Foundation needs one clear extraction-team go/no-go surface so safe prep can continue without accidentally launching live extraction, private-source access, hidden workers, or downstream writes.',
    nextAction: closeCard
      ? `Done under ${EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY}. Continue ${EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID}; do not launch live extraction from this card.`
      : 'Build the supervised runtime anchor and prove live runs, hidden workers, private-source approval, and downstream writes fail closed.',
    statusNote: closeCard
      ? `Closed under \`${EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY}\`; Extraction Team runtime is a supervised contract only and no live extraction was approved.`
      : `Executing under \`${EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY}\`; no live extraction, private auth, hidden workers, or downstream writes.`,
    owner: 'Foundation',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/course-source-auth-boundary.js',
      'lib/youtube-build-intel-batch.js',
      'lib/extraction-runtime-readiness.js',
      'lib/extraction-parallel-worker-protocol.js',
      'lib/extraction-to-kb-atom-pipeline.js',
      'lib/myicor-extraction-preflight.js',
      'lib/mark-m-skool-extraction-preflight.js',
    ],
    existingDocs: [
      'docs/process/course-source-auth-boundary-001-plan.md',
      'docs/process/youtube-build-intel-batch-001-plan.md',
      'docs/process/extraction-parallel-worker-protocol-001-plan.md',
      'docs/process/extraction-to-kb-atom-pipeline-001-plan.md',
      'docs/process/myicor-extraction-preflight-001-plan.md',
      'docs/process/mark-m-skool-extraction-preflight-001-plan.md',
    ],
    existingScripts: [
      'scripts/process-course-source-auth-boundary-check.mjs',
      'scripts/process-youtube-build-intel-batch-check.mjs',
      'scripts/process-extraction-runtime-readiness-check.mjs',
      'scripts/process-extraction-parallel-worker-protocol-check.mjs',
      'scripts/process-extraction-to-kb-atom-pipeline-check.mjs',
      'scripts/process-myicor-extraction-preflight-check.mjs',
      'scripts/process-mark-m-skool-extraction-preflight-check.mjs',
    ],
    existingCards: [
      'COURSE-SOURCE-AUTH-BOUNDARY-001',
      'YOUTUBE-BUILD-INTEL-BATCH-001',
      'EXTRACTION-RUNTIME-READINESS-001',
      'EXTRACTION-PARALLEL-WORKER-PROTOCOL-001',
      'EXTRACTION-TO-KB-ATOM-PIPELINE-001',
      'MYICOR-EXTRACTION-PREFLIGHT-001',
      'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001',
      EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID,
    ],
    reused: [
      'Source-auth approval matrix',
      'Public Build Intel queue specs',
      'Runtime readiness gates',
      'Visible worker protocol',
      'Proposal-only output pipeline',
      'Private/paid source preflight blockers',
    ],
    existingPolicy: [
      'Metadata-only source prep is not runtime extraction approval.',
      'Private/paid/community/course sources need source-specific approval packets.',
      'Visible workers require explicit worktree, branch, source-packet, artifact-root, and wrap-report ownership.',
      'Downstream KB/atom/action outputs remain proposal-only until a separate approval path persists them.',
    ],
    exactGap: 'EXTRACTION-TEAM-001 needs a single fail-closed operating contract that ties the shipped extraction prep slices together without turning them into runtime approval.',
    overBroadRisk: 'This card can easily drift into live extraction, private-source access, model calls, hidden workers, or downstream writes. V1 is a read-only supervised contract only.',
    notRebuilt: [
      'No extractor runtime implementation.',
      'No source crawler or transcript fetcher.',
      'No model/summarization path.',
      'No downstream write path.',
    ],
    readyBy: 'Codex Foundation builder',
    readyAt: '2026-05-18T23:55:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: EXTRACTION_TEAM_RUNTIME_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: EXTRACTION_TEAM_RUNTIME_PLAN_PATH,
    definitionOfDone: 'Extraction Team runtime composes prior source-auth, queue, readiness, visible-worker, proposal-output, and private-preflight gates; live runs, private auth, hidden workers, and downstream writes fail closed; verifier and ship gates pass.',
    proofCommands: EXTRACTION_TEAM_RUNTIME_PROOF_COMMANDS,
    readinessBlockerCleared: 'Earlier extraction-prep cards closed as metadata-only/proposal-only gates without runtime launch.',
    notNextBoundaries: EXTRACTION_TEAM_RUNTIME_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: EXTRACTION_TEAM_RUNTIME_APPROVAL_PATH,
      closeoutKey: EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY,
      recommendedNext: EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'Foundation-up capability registry scopes provider/tool capability contracts before agents or workers can claim/use them.',
    proofCommands: [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${EXTRACTION_TEAM_RUNTIME_CARD_ID} closed the supervised extraction-team runtime anchor.`,
    notNextBoundaries: EXTRACTION_TEAM_RUNTIME_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: EXTRACTION_TEAM_RUNTIME_CARD_ID,
      nextAfterCloseoutKey: EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY,
      liveExtractionApproved: false,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview } = {}) {
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
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-extraction-team-runtime')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result
      `,
      [
        `extraction-team-runtime-${stableRunId(EXTRACTION_TEAM_RUNTIME_PLAN_PATH)}`,
        EXTRACTION_TEAM_RUNTIME_CARD_ID,
        EXTRACTION_TEAM_RUNTIME_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        EXTRACTION_TEAM_RUNTIME_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: EXTRACTION_TEAM_RUNTIME_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-extraction-team-runtime',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        EXTRACTION_TEAM_RUNTIME_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${EXTRACTION_TEAM_RUNTIME_CARD_ID}.`,
        JSON.stringify({ closeoutKey: EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY, lane: row.lane }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: EXTRACTION_TEAM_RUNTIME_SCRIPT_PATH,
    operation: 'create/update Extraction Team card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: EXTRACTION_TEAM_RUNTIME_SPRINT_ID,
        status: 'active',
        goal: 'Anchor the supervised Extraction Team runtime without launching live extraction.',
        activeBlockerCardId: closeCard ? EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID : EXTRACTION_TEAM_RUNTIME_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-extraction-team-runtime',
          currentStatus: closeCard ? 'next_scoping' : stage,
          closeoutKey: EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID}; keep extraction runtime and capability use approval-bound.`
            : 'Compose shipped extraction-prep gates into one supervised runtime contract.',
          priorityOrder: [EXTRACTION_TEAM_RUNTIME_CARD_ID, EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID],
          notNext: EXTRACTION_TEAM_RUNTIME_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'All required extraction runtime stages are present.',
            'Live extraction, private auth, hidden workers, and downstream writes fail closed.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()]
        : [buildSprintItem({ closeCard, stage })],
    },
    'codex-extraction-team-runtime',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized the safe extraction team operating anchor before any live extraction work.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(EXTRACTION_TEAM_RUNTIME_PLAN_PATH)
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: EXTRACTION_TEAM_RUNTIME_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  if ((args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) &&
    !(planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE)) {
    throw new Error(`Plan Critic must pass before write. status=${planCritic.status} score=${planCritic.score}`)
  }
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview: planCritic })
  }

  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    packageSource,
    scriptSource,
    moduleSource,
    verifierSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: EXTRACTION_TEAM_RUNTIME_APPROVAL_PATH, cardId: EXTRACTION_TEAM_RUNTIME_CARD_ID }),
    getBacklogItemsByIds([EXTRACTION_TEAM_RUNTIME_CARD_ID, EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([EXTRACTION_TEAM_RUNTIME_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile(EXTRACTION_TEAM_RUNTIME_SCRIPT_PATH),
    readRepoFile('lib/extraction-team-runtime.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(EXTRACTION_TEAM_RUNTIME_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === EXTRACTION_TEAM_RUNTIME_CARD_ID) || null
  const nextCard = cards.find(item => item.id === EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === EXTRACTION_TEAM_RUNTIME_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID) || null
  const snapshot = buildExtractionTeamRuntimeSnapshot()
  const dogfood = buildExtractionTeamRuntimeDogfoodProof()
  const renderedReport = renderExtractionTeamRuntimeReport(snapshot)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const closeout = getFoundationBuildCloseouts().find(record => record.key === EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY)
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === EXTRACTION_TEAM_RUNTIME_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || EXTRACTION_TEAM_RUNTIME_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'pass' : 'missing')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live Extraction Team card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next Foundation-up card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains Extraction Team item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  if (args.closeCard || card?.lane === 'done') {
    addCheck(checks, nextSprintItem?.stage === 'scoping', 'Current Sprint advances next card after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready', 'runtime snapshot is ready', JSON.stringify(snapshot.failures))
  addCheck(checks, snapshot.summary.stageCount >= 6 && snapshot.summary.publicQueueSpecCount >= 6 && snapshot.summary.visibleWorkerCount >= 2, 'runtime composes queue and visible-worker gates', JSON.stringify(snapshot.summary))
  addCheck(checks, snapshot.proposalOnly === true && snapshot.liveExtractionApprovedByThisCard === false && snapshot.extractionWorkersLaunched === false && snapshot.downstreamWritesApprovedByThisCard === false, 'runtime approves no live extraction, worker launch, or downstream writes', JSON.stringify({ live: snapshot.liveExtractionApprovedByThisCard, workers: snapshot.extractionWorkersLaunched, writes: snapshot.downstreamWritesApprovedByThisCard }))
  addCheck(checks, snapshot.summary.privateSourcePreflightsBlocked >= 2 && snapshot.summary.unsafeSideEffectCount === 0 && snapshot.summary.hiddenSubagentCount === 0, 'private sources, unsafe side effects, and hidden workers stay blocked', JSON.stringify(snapshot.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects live run, missing stage, worker launch, direct write, hidden subagent, and premature private approval', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, closeoutDoc.includes(EXTRACTION_TEAM_RUNTIME_CARD_ID) && closeoutDoc.includes(EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', EXTRACTION_TEAM_RUNTIME_CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('Runtime stages') && renderedReport.includes('Not launched'), 'rendered report summarizes supervised runtime', 'report renderer')
  addCheck(checks, verifierSource.includes(EXTRACTION_TEAM_RUNTIME_CARD_ID) && verifierSource.includes('buildExtractionTeamRuntimeDogfoodProof'), 'intelligence/audit verifier covers Extraction Team runtime', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, closeoutRecordsSource.includes(EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY) && closeout?.operatorCloseout === true, 'closeout registry includes Extraction Team closeout', EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY)
  addCheck(checks, currentPlan.includes(EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY) && currentPlan.includes(EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID), 'current plan names closeout and next card', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY) && currentState.includes(EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID), 'current state names closeout and next card', 'docs/rebuild/current-state.md')
  addCheck(checks, packageJson.scripts?.['process:extraction-team-runtime-check'] === `node --env-file-if-exists=.env ${EXTRACTION_TEAM_RUNTIME_SCRIPT_PATH}`, 'package registers focused proof script', 'process:extraction-team-runtime-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'runtime module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      runtimeStages: snapshot.summary.stageCount,
      recommendedNext: snapshot.recommendedNext,
    },
    checks,
    failures: failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Extraction Team runtime proof: ${result.summary.passed}/${result.summary.total}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
  }

  await closeFoundationDb()
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
