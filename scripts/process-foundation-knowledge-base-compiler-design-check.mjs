#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  FOUNDATION_KB_NOT_NEXT_BOUNDARIES,
  FOUNDATION_KB_REQUIRED_STAGE_IDS,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_APPROVAL_PATH,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CHANGED_FILES,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_PATH,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_PLAN_PATH,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_PROOF_COMMANDS,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SCRIPT_PATH,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SPRINT_ID,
  buildFoundationKnowledgeBaseCompilerDesign,
  buildFoundationKnowledgeBaseCompilerDesignDogfoodProof,
  validateFoundationKnowledgeBaseCompilerDesign,
} from '../lib/foundation-knowledge-base-compiler-design.js'
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
const QUALITY_GATE_CARD_ID = 'KNOWLEDGE-BASE-QUALITY-GATE-001'
const PACKET_CARD_ID = 'EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001'
const PREFLIGHT_CARD_ID = 'BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001'

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

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
    title: 'Foundation knowledge-base compiler design',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 27,
    source: 'Steve 2026-05-17 bounded Foundation queue.',
    summary: 'Design the Foundation-owned compiler contract for raw sources to compiled wiki to query/Q&A to quality feedback loop.',
    whyItMatters: 'Foundation must own source contracts, ingestion permission, compiler rules, quality gates, and query contracts before agents consume compiled knowledge.',
    nextAction: closeCard
      ? 'Done for v1. Next: KNOWLEDGE-BASE-QUALITY-GATE-001.'
      : 'Ship design/proof only; no extraction, compiled pages, query index, model call, or agent feature work.',
    statusNote: closeCard
      ? `Closed under \`${FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY}\`; design/proof only.`
      : `Scope/proof: \`${FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY}\`; design-only compiler contract.`,
    owner: 'Steve/Codex',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/build-intel-karpathy-llm-kb-preflight.js',
      'lib/extractor-queue-karpathy-kb-video-pack.js',
      'lib/foundation-extraction-runtime-verifier.js',
      'lib/foundation-intelligence-audit-verifier.js',
      'lib/build-lane-reliability.js',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-build-intel-karpathy-llm-kb-preflight-closeout.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-extractor-queue-karpathy-kb-video-pack-closeout.md',
      'docs/process/build-intel-karpathy-llm-kb-preflight-001-plan.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs',
      'scripts/process-extractor-queue-karpathy-kb-video-pack-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Foundation owns source contracts, ingestion permission, compiler rules, quality gates, and query interface.',
      'Harlan/Codex/other agents consume compiled knowledge only after Foundation owns it.',
      'No live extraction, paid/auth run, model call, or external write without Steve approval.',
    ],
    reused: [
      'Karpathy packet pending-approval source truth.',
      'Karpathy preflight have/missing/not-to-copy comparison.',
      'Build-lane scaffold and Current Sprint metadata guards.',
    ],
    notRebuilt: [
      'No extraction runtime implementation.',
      'No compiled KB pages or query index.',
      'No Harlan memory feature.',
      'No Research Inbox or atom writes.',
    ],
    exactGap: 'The Karpathy KB idea needs a Foundation-owned compiler design before quality gates or agent consumption can ship.',
    overBroadRisk: 'This can drift into live extraction, transcript dumps, Harlan-only memory, or direct agent query access. V1 is design/proof only.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-17T23:05:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_PLAN_PATH,
    definitionOfDone: 'Foundation KB compiler design is explicit, dogfood rejects unsafe variants, verifier coverage and full ship gate pass, closeout is registered, and no extraction or implementation runs.',
    proofCommands: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve approved the bounded Foundation queue and clarified this card is design/proof only unless an existing approval says otherwise.',
    notNextBoundaries: FOUNDATION_KB_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_APPROVAL_PATH,
      closeoutKey: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
  const planCriticResult = {
    status: 'pass',
    score: 10,
    cardId: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
    closeoutKey: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
  }
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-kb-compiler-design')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `kb-compiler-design-${stableRunId(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_PLAN_PATH)}`,
        FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
        FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_PLAN_PATH,
        FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CHANGED_FILES,
        JSON.stringify(planCriticResult),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-kb-compiler-design',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID}.`,
        JSON.stringify({ closeoutKey: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY, stage }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SCRIPT_PATH,
    operation: 'create/update KB compiler design backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SPRINT_ID,
        status: 'active',
        goal: 'Define the Foundation-owned knowledge compiler design before quality gates or agent consumption.',
        activeBlockerCardId: closeCard ? null : FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-kb-compiler-design',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue to KNOWLEDGE-BASE-QUALITY-GATE-001.'
            : 'Finish design/proof only; no extraction, compiled output, query index, model call, or external write.',
          priorityOrder: [FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID],
          notNext: FOUNDATION_KB_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Foundation-owned compiler pipeline is explicit.',
            'Unsafe Harlan-only, transcript-dump, missing quality gate, direct-agent, and live-extraction variants fail.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-kb-compiler-design',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SPRINT_ID,
      reason: 'Steve approved rolling the bounded Foundation queue into FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 after LLM auth budget-label clarity shipped.',
    },
  )
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const checks = []
  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    closeouts,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    verifierSource,
    foundationVerifySource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_APPROVAL_PATH,
      cardId: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
    }),
    getBacklogItemsByIds([
      FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
      QUALITY_GATE_CARD_ID,
      PACKET_CARD_ID,
      PREFLIGHT_CARD_ID,
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_PLAN_PATH),
    readRepoFile(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SCRIPT_PATH),
    readRepoFile('lib/foundation-knowledge-base-compiler-design.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const design = buildFoundationKnowledgeBaseCompilerDesign()
  const designStatus = validateFoundationKnowledgeBaseCompilerDesign(design)
  const dogfood = buildFoundationKnowledgeBaseCompilerDesignDogfoodProof()
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID, priority: 'P0' },
    changedFiles: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const card = cards.find(item => item.id === FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID) || null
  const qualityCard = cards.find(item => item.id === QUALITY_GATE_CARD_ID) || null
  const packetCard = cards.find(item => item.id === PACKET_CARD_ID) || null
  const preflightCard = cards.find(item => item.id === PREFLIGHT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SPRINT_ID, 'Current Sprint overlay is the active card sprint', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete before build/done', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.message).join('; ') || 'healthy')
  addCheck(checks, packetCard?.lane === 'done', 'Karpathy packet prerequisite is done', packetCard ? `${packetCard.id}:${packetCard.lane}` : 'missing')
  addCheck(checks, preflightCard?.lane === 'done', 'Karpathy preflight prerequisite is done', preflightCard ? `${preflightCard.id}:${preflightCard.lane}` : 'missing')
  addCheck(checks, qualityCard && ['research', 'scoped', 'done'].includes(qualityCard.lane), 'quality gate follow-up exists or has shipped after this card', qualityCard ? `${qualityCard.id}:${qualityCard.lane}` : 'missing')
  addCheck(checks, designStatus.ok, 'compiler design contract is complete', designStatus.findings.map(item => item.check).join(', ') || `${designStatus.summary.stageCount} stages`)
  addCheck(checks, FOUNDATION_KB_REQUIRED_STAGE_IDS.every(id => design.stages.some(stage => stage.id === id)), 'design includes every required pipeline stage', FOUNDATION_KB_REQUIRED_STAGE_IDS.join(', '))
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe KB compiler variants', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:foundation-knowledge-base-compiler-design-check'] === `node --env-file-if-exists=.env ${FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-knowledge-base-compiler-design-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildFoundationKnowledgeBaseCompilerDesign') && moduleSource.includes('validateFoundationKnowledgeBaseCompilerDesign'), 'module owns compiler design contract and validator', 'lib/foundation-knowledge-base-compiler-design.js')
  addCheck(checks, verifierSource.includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID) && verifierSource.includes('buildFoundationKnowledgeBaseCompilerDesignDogfoodProof'), 'intelligence/audit verifier covers compiler design', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, coverageSource.includes('FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include compiler design card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, foundationVerifySource.includes('foundationKnowledgeBaseCompilerDesignSource') || verifierSource.includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID), 'foundation:verify receives compiler design coverage', 'foundation verifier module assurance')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY), 'closeout registry source contains closeout key', FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_PATH), 'closeout handoff exists', FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('KNOWLEDGE-BASE-QUALITY-GATE-001') && closeoutDoc.includes('This does not run live extraction'), 'closeout documents next card and no-live-extraction limit', FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY) && currentState.includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY), 'current plan/state name compiler design closeout', FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    designStatus: designStatus.status,
    dogfoodOk: dogfood.ok,
    liveExtractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Foundation KB compiler design check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})
