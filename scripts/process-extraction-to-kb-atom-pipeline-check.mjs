#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  EXTRACTION_TO_KB_ATOM_PIPELINE_APPROVAL_PATH,
  EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID,
  EXTRACTION_TO_KB_ATOM_PIPELINE_CHANGED_FILES,
  EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY,
  EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_PATH,
  EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID,
  EXTRACTION_TO_KB_ATOM_PIPELINE_NOT_NEXT_BOUNDARIES,
  EXTRACTION_TO_KB_ATOM_PIPELINE_PLAN_PATH,
  EXTRACTION_TO_KB_ATOM_PIPELINE_PROOF_COMMANDS,
  EXTRACTION_TO_KB_ATOM_PIPELINE_SCRIPT_PATH,
  EXTRACTION_TO_KB_ATOM_PIPELINE_SPRINT_ID,
  buildExtractionToKbAtomPipelineDogfoodProof,
  buildExtractionToKbAtomPipelineSnapshot,
  renderExtractionToKbAtomPipelineReport,
} from '../lib/extraction-to-kb-atom-pipeline.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
    id: EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID,
    title: 'Route extraction outputs into KB, atoms, and action routes',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 14,
    source: '2026-05-18 agent/extractor planning conversation',
    summary: 'Define the governed downstream contract that turns source-backed extractor artifacts into proposal-only KB drafts, atom candidates, synthesis fact candidates, review items, and action-route candidates.',
    whyItMatters: 'Extraction is only valuable if it becomes queryable, cited, privacy-aware operating knowledge instead of disconnected notes or automatic unsourced tasks.',
    nextAction: closeCard
      ? `Done under ${EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY}. Continue ${EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID}; do not launch live extraction workers from this card.`
      : 'Build the proposal-only artifact-to-KB/atom/action routing contract and prove missing source, citation, freshness, privacy, contradiction, side-effect, and direct-write cases fail closed.',
    statusNote: closeCard
      ? `Closed under \`${EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY}\`; routing outputs are proposal-only and direct writes remain blocked.`
      : `Executing under \`${EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY}\`; no live extraction or downstream writes.`,
    owner: 'Foundation',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-kb-compiler-v1.js',
      'lib/foundation-knowledge-base-quality-gate.js',
      'lib/intelligence-atoms.js',
      'lib/intelligence-synthesis-facts.js',
      'lib/intelligence-action-router.js',
      'lib/action-route-review-inbox.js',
      'lib/youtube-build-intel-batch.js',
    ],
    existingDocs: [
      'docs/process/foundation-kb-compiler-v1-001-plan.md',
      'docs/process/knowledge-base-quality-gate-001-plan.md',
      'docs/process/action-route-review-inbox-001-plan.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-foundation-kb-compiler-v1-check.mjs',
      'scripts/process-knowledge-base-quality-gate-check.mjs',
      'scripts/process-action-route-review-inbox-check.mjs',
      'scripts/process-youtube-build-intel-batch-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingCards: [
      'FOUNDATION-KB-COMPILER-V1-001',
      'KNOWLEDGE-BASE-QUALITY-GATE-001',
      'ACTION-ROUTE-REVIEW-INBOX-001',
      'YOUTUBE-BUILD-INTEL-BATCH-001',
      EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID,
    ],
    existingPolicy: [
      'KB compiler and quality gate already require source IDs, citations, freshness, privacy tier, and contradiction handling.',
      'Action routes already require human approval before destination writes.',
      'YouTube Build Intel queue prep did not approve runtime extraction.',
    ],
    reused: [
      'Foundation KB compiler draft gate',
      'Knowledge-base quality gate',
      'Intelligence atom/action-route schema contracts',
      'Current Sprint and closeout fanout patterns',
    ],
    notRebuilt: [
      'No extractor runtime.',
      'No transcript or screenshot extractor.',
      'No DB write path for candidates.',
      'No action-route apply path.',
    ],
    exactGap: 'Extractor artifacts need a fail-closed routing contract before any public/private extraction output can become KB, atoms, facts, review items, or action routes.',
    overBroadRisk: 'This can drift into live extraction or automatic writes. V1 stays proposal-only and blocks side effects.',
    readyBy: 'Codex Foundation builder',
    readyAt: '2026-05-18T22:00:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: EXTRACTION_TO_KB_ATOM_PIPELINE_PLAN_PATH,
    definitionOfDone: 'Extractor artifact routing accepts only source-backed, cited, fresh, privacy-classified, contradiction-cleared artifacts and emits proposal-only KB draft, atom, synthesis fact, review, and action-route candidates; unsafe/missing/direct-write variants fail closed; verifier coverage and full ship gate pass.',
    proofCommands: EXTRACTION_TO_KB_ATOM_PIPELINE_PROOF_COMMANDS,
    readinessBlockerCleared: 'YOUTUBE-BUILD-INTEL-BATCH-001 closed metadata-only public YouTube queue specs.',
    notNextBoundaries: EXTRACTION_TO_KB_ATOM_PIPELINE_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: EXTRACTION_TO_KB_ATOM_PIPELINE_APPROVAL_PATH,
      closeoutKey: EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY,
      recommendedNext: EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'Visible extraction workers have source-packet ownership, artifact path, permission class, wrap report, quality gate, and no-private-source default before any parallel extraction starts.',
    proofCommands: [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID} closed proposal-only output routing gates.`,
    notNextBoundaries: EXTRACTION_TO_KB_ATOM_PIPELINE_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID,
      nextAfterCloseoutKey: EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY,
      launchExtractionWorkersApproved: false,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-extraction-to-kb-atom-pipeline')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result
      `,
      [
        `extraction-to-kb-atom-pipeline-${stableRunId(EXTRACTION_TO_KB_ATOM_PIPELINE_PLAN_PATH)}`,
        EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID,
        EXTRACTION_TO_KB_ATOM_PIPELINE_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        EXTRACTION_TO_KB_ATOM_PIPELINE_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-extraction-to-kb-atom-pipeline',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID}.`,
        JSON.stringify({ closeoutKey: EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY, lane: row.lane }),
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
    scriptPath: EXTRACTION_TO_KB_ATOM_PIPELINE_SCRIPT_PATH,
    operation: 'create/update extraction output routing card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: EXTRACTION_TO_KB_ATOM_PIPELINE_SPRINT_ID,
        status: 'active',
        goal: 'Define proposal-only routing from extractor artifacts into KB, atoms, facts, review, and action candidates.',
        activeBlockerCardId: closeCard ? EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID : EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-extraction-to-kb-atom-pipeline',
          currentStatus: closeCard ? 'next_scoping' : stage,
          closeoutKey: EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID}; do not launch extraction workers without a separate card.`
            : 'Build proposal-only artifact routing and dogfood fail-closed gates.',
          priorityOrder: [EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID, EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID],
          notNext: EXTRACTION_TO_KB_ATOM_PIPELINE_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Valid extractor artifact fixture routes to proposal-only KB, atom, synthesis fact, review, and action-route candidates.',
            'Missing source, citation, freshness, privacy, contradiction, side-effect, and direct-write fixtures fail closed.',
            'No live extraction or downstream writes run.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()]
        : [buildSprintItem({ closeCard, stage })],
    },
    'codex-extraction-to-kb-atom-pipeline',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized extraction output routing after public YouTube queue prep.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(EXTRACTION_TO_KB_ATOM_PIPELINE_PLAN_PATH)
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: EXTRACTION_TO_KB_ATOM_PIPELINE_CHANGED_FILES,
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
    validatePlanApprovalFile({ repoRoot, approvalRef: EXTRACTION_TO_KB_ATOM_PIPELINE_APPROVAL_PATH, cardId: EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID }),
    getBacklogItemsByIds([EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID, 'YOUTUBE-BUILD-INTEL-BATCH-001', EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID, 'YOUTUBE-BUILD-INTEL-BATCH-001']),
    readRepoFile('package.json'),
    readRepoFile(EXTRACTION_TO_KB_ATOM_PIPELINE_SCRIPT_PATH),
    readRepoFile('lib/extraction-to-kb-atom-pipeline.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID) || null
  const priorCard = cards.find(item => item.id === 'YOUTUBE-BUILD-INTEL-BATCH-001') || null
  const nextCard = cards.find(item => item.id === EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID) || null
  const snapshot = buildExtractionToKbAtomPipelineSnapshot()
  const dogfood = buildExtractionToKbAtomPipelineDogfoodProof()
  const renderedReport = renderExtractionToKbAtomPipelineReport(snapshot)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || EXTRACTION_TO_KB_ATOM_PIPELINE_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'pass' : 'missing')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live pipeline card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, priorCard?.lane === 'done', 'YouTube batch prerequisite is closed', priorCard ? `${priorCard.id}:${priorCard.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next extraction worker protocol card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains pipeline item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  if (args.closeCard || card?.lane === 'done') {
    addCheck(checks, nextSprintItem?.stage === 'scoping', 'Current Sprint advances next card after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready', 'pipeline snapshot is ready', snapshot.failures.join(', ') || `${snapshot.summary.actionRouteCandidateCount} action candidates`)
  addCheck(checks, snapshot.proposalOnly === true && snapshot.runtimeExtractionApprovedByThisCard === false, 'pipeline remains proposal-only with no extraction approval', JSON.stringify({ proposalOnly: snapshot.proposalOnly, runtimeExtractionApprovedByThisCard: snapshot.runtimeExtractionApprovedByThisCard }))
  addCheck(checks, snapshot.summary.kbDraftStatus === 'draft_ready' && snapshot.summary.atomCandidateCount >= 1 && snapshot.summary.synthesisFactCandidateCount >= 1 && snapshot.summary.reviewInboxCandidateCount >= 1 && snapshot.summary.actionRouteCandidateCount >= 1, 'artifact routes to all proposal candidate types', JSON.stringify(snapshot.summary))
  addCheck(checks, snapshot.summary.unsafeWriteCount === 0 && snapshot.summary.unsafeSideEffectCount === 0, 'no side effects or direct writes are started', JSON.stringify({ writes: snapshot.outputWrites, sideEffects: snapshot.summary.unsafeSideEffectCount }))
  addCheck(checks, dogfood.ok, 'dogfood rejects source/citation/freshness/privacy/contradiction/side-effect/write failures', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, closeoutDoc.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID) && closeoutDoc.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('Proposal Outputs') && renderedReport.includes('Action route candidates'), 'rendered report summarizes proposal outputs', 'report renderer')
  addCheck(checks, verifierSource.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID) && verifierSource.includes('buildExtractionToKbAtomPipelineDogfoodProof'), 'intelligence/audit verifier covers pipeline', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, closeoutRecordsSource.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY), 'closeout registry includes pipeline closeout', EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY)
  addCheck(checks, currentPlan.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY) && currentPlan.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID), 'current plan names closeout and next card', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY) && currentState.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID), 'current state names closeout and next card', 'docs/rebuild/current-state.md')
  addCheck(checks, packageJson.scripts?.['process:extraction-to-kb-atom-pipeline-check'] === `node --env-file-if-exists=.env ${EXTRACTION_TO_KB_ATOM_PIPELINE_SCRIPT_PATH}`, 'package registers focused proof script', 'process:extraction-to-kb-atom-pipeline-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'pipeline module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      actionRouteCandidateCount: snapshot.summary.actionRouteCandidateCount,
      recommendedNext: snapshot.recommendedNext,
    },
    checks,
    failures: failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Extraction-to-KB/atom pipeline proof: ${result.summary.passed}/${result.summary.total}`)
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
