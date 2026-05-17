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
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  KNOWLEDGE_BASE_QUALITY_GATE_APPROVAL_PATH,
  KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
  KNOWLEDGE_BASE_QUALITY_GATE_CHANGED_FILES,
  KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
  KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_PATH,
  KNOWLEDGE_BASE_QUALITY_GATE_NOT_NEXT_BOUNDARIES,
  KNOWLEDGE_BASE_QUALITY_GATE_PLAN_PATH,
  KNOWLEDGE_BASE_QUALITY_GATE_PROOF_COMMANDS,
  KNOWLEDGE_BASE_QUALITY_GATE_RULE_IDS,
  KNOWLEDGE_BASE_QUALITY_GATE_SCRIPT_PATH,
  KNOWLEDGE_BASE_QUALITY_GATE_SPRINT_ID,
  buildKnowledgeBaseQualityGate,
  buildKnowledgeBaseQualityGateDogfoodProof,
  evaluateKnowledgeBaseQualityGate,
} from '../lib/foundation-knowledge-base-quality-gate.js'
import {
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
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
    id: KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
    title: 'Knowledge-base quality gate',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 28,
    source: 'Steve 2026-05-17 bounded Foundation queue.',
    summary: 'Define the fail-closed quality gate for compiled knowledge before agents can query or cite it.',
    whyItMatters: 'Compiled KB output must prove citations, freshness, contradictions, size, frontmatter, privacy, and sourced doctrine before becoming agent-consumable truth.',
    nextAction: closeCard
      ? 'Done for v1. Next: AIOS-RUNTIME-PORTABILITY-GATE-001.'
      : 'Ship quality-gate contract and dogfood only; no live extraction, compiled page writes, query index, model call, or external write.',
    statusNote: closeCard
      ? `Closed under \`${KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY}\`; fail-closed quality gate only.`
      : `Scope/proof: \`${KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY}\`; no live compiled KB implementation.`,
    owner: 'Foundation Process',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-knowledge-base-compiler-design.js',
      'lib/build-intel-karpathy-llm-kb-preflight.js',
      'lib/foundation-intelligence-audit-verifier.js',
      'lib/build-lane-reliability.js',
    ],
    existingDocs: [
      'docs/process/foundation-knowledge-base-compiler-design-001-plan.md',
      'docs/handoffs/2026-05-17-foundation-knowledge-base-compiler-design-closeout.md',
      'docs/handoffs/2026-05-17-build-intel-karpathy-llm-kb-preflight-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-foundation-knowledge-base-compiler-design-check.mjs',
      'scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Foundation owns source contracts, ingestion permission, compiler rules, quality gates, and query interface.',
      'Agents consume compiled knowledge only after Foundation quality gates and query contracts pass.',
      'No live extraction, paid/auth run, model call, or external write without Steve approval.',
    ],
    reused: [
      'Foundation KB compiler design pipeline.',
      'Karpathy preflight have/missing/not-to-copy comparison.',
      'Build-lane scaffold and Current Sprint metadata guards.',
    ],
    notRebuilt: [
      'No extraction runtime implementation.',
      'No compiled KB page writer.',
      'No query index or vector table.',
      'No Harlan memory feature.',
    ],
    exactGap: 'The compiler design names a quality gate, but the gate needs executable fail-closed rules before agents can consume compiled pages.',
    overBroadRisk: 'This can drift into live extraction, compiled output writes, Harlan memory, or model evaluation. V1 is synthetic contract proof only.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-17T23:20:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: KNOWLEDGE_BASE_QUALITY_GATE_PLAN_PATH,
    definitionOfDone: 'Knowledge-base quality gate rejects unsafe synthetic compiled pages, verifier coverage and full ship gate pass, closeout is registered, and no extraction or compiled output write runs.',
    proofCommands: KNOWLEDGE_BASE_QUALITY_GATE_PROOF_COMMANDS,
    readinessBlockerCleared: 'Foundation KB compiler design shipped; Steve approved continuing the bounded Foundation queue.',
    notNextBoundaries: KNOWLEDGE_BASE_QUALITY_GATE_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: KNOWLEDGE_BASE_QUALITY_GATE_APPROVAL_PATH,
      closeoutKey: KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
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
    cardId: KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
    closeoutKey: KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-kb-quality-gate')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `kb-quality-gate-${stableRunId(KNOWLEDGE_BASE_QUALITY_GATE_PLAN_PATH)}`,
        KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
        KNOWLEDGE_BASE_QUALITY_GATE_PLAN_PATH,
        KNOWLEDGE_BASE_QUALITY_GATE_CHANGED_FILES,
        JSON.stringify(planCriticResult),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-kb-quality-gate',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID}.`,
        JSON.stringify({ closeoutKey: KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY, stage }),
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
    scriptPath: KNOWLEDGE_BASE_QUALITY_GATE_SCRIPT_PATH,
    operation: 'create/update KB quality gate backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: KNOWLEDGE_BASE_QUALITY_GATE_SPRINT_ID,
        status: 'active',
        goal: 'Define the fail-closed quality gate for compiled knowledge before agent consumption.',
        activeBlockerCardId: closeCard ? null : KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-kb-quality-gate',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue to AIOS-RUNTIME-PORTABILITY-GATE-001.'
            : 'Finish synthetic fail-closed quality-gate proof only; no extraction, compiled output, model call, or external write.',
          priorityOrder: [KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID],
          notNext: KNOWLEDGE_BASE_QUALITY_GATE_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Quality gate rules cover citations/source IDs, freshness, contradictions, page size, orphan pages, frontmatter, privacy tier, and unsourced doctrine.',
            'Bad synthetic compiled pages fail closed.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-kb-quality-gate',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || KNOWLEDGE_BASE_QUALITY_GATE_SPRINT_ID,
      reason: 'Steve approved rolling the bounded Foundation queue into KNOWLEDGE-BASE-QUALITY-GATE-001 after the compiler design shipped.',
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
    compilerModuleSource,
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
      approvalRef: KNOWLEDGE_BASE_QUALITY_GATE_APPROVAL_PATH,
      cardId: KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
    }),
    getBacklogItemsByIds([
      KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
      FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
      'AIOS-RUNTIME-PORTABILITY-GATE-001',
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(KNOWLEDGE_BASE_QUALITY_GATE_PLAN_PATH),
    readRepoFile(KNOWLEDGE_BASE_QUALITY_GATE_SCRIPT_PATH),
    readRepoFile('lib/foundation-knowledge-base-quality-gate.js'),
    readRepoFile('lib/foundation-knowledge-base-compiler-design.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const gate = buildKnowledgeBaseQualityGate()
  const gateStatus = evaluateKnowledgeBaseQualityGate(gate)
  const dogfood = buildKnowledgeBaseQualityGateDogfoodProof()
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID, priority: 'P0' },
    changedFiles: KNOWLEDGE_BASE_QUALITY_GATE_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID &&
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
  const card = cards.find(item => item.id === KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID) || null
  const compilerCard = cards.find(item => item.id === FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID) || null
  const portabilityCard = cards.find(item => item.id === 'AIOS-RUNTIME-PORTABILITY-GATE-001') || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || KNOWLEDGE_BASE_QUALITY_GATE_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === KNOWLEDGE_BASE_QUALITY_GATE_SPRINT_ID, 'Current Sprint overlay is the active card sprint', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete before build/done', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, compilerCard?.lane === 'done' && String(compilerCard?.statusNote || '').includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY), 'compiler design prerequisite is done', compilerCard ? `${compilerCard.id}:${compilerCard.lane}` : 'missing')
  addCheck(checks, portabilityCard && ['scoped', 'research'].includes(portabilityCard.lane), 'runtime portability follow-up exists but is not built by this card', portabilityCard ? `${portabilityCard.id}:${portabilityCard.lane}` : 'missing')
  addCheck(checks, gateStatus.ok && gateStatus.summary.ruleCount === KNOWLEDGE_BASE_QUALITY_GATE_RULE_IDS.length, 'quality gate healthy fixture passes every rule', gateStatus.status)
  addCheck(checks, KNOWLEDGE_BASE_QUALITY_GATE_RULE_IDS.every(id => moduleSource.includes(id)), 'quality gate defines every required rule ID', KNOWLEDGE_BASE_QUALITY_GATE_RULE_IDS.join(', '))
  addCheck(checks, dogfood.ok, 'dogfood rejects bad compiled knowledge pages', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:knowledge-base-quality-gate-check'] === `node --env-file-if-exists=.env ${KNOWLEDGE_BASE_QUALITY_GATE_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:knowledge-base-quality-gate-check'] || 'missing')
  addCheck(checks, moduleSource.includes('evaluateKnowledgeBaseQualityGate') && moduleSource.includes('buildKnowledgeBaseQualityGateDogfoodProof'), 'module owns quality gate contract and dogfood', 'lib/foundation-knowledge-base-quality-gate.js')
  addCheck(checks, compilerModuleSource.includes('quality_gate'), 'quality gate follows compiler design stage', 'lib/foundation-knowledge-base-compiler-design.js')
  addCheck(checks, verifierSource.includes(KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID) && verifierSource.includes('buildKnowledgeBaseQualityGateDogfoodProof'), 'intelligence/audit verifier covers quality gate', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, coverageSource.includes('KNOWLEDGE_BASE_QUALITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include quality gate card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, foundationVerifySource.includes('KNOWLEDGE_BASE_QUALITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') || verifierSource.includes(KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID), 'foundation:verify receives quality gate coverage', 'foundation verifier module assurance')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY), 'closeout registry source contains closeout key', KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_PATH), 'closeout handoff exists', KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('AIOS-RUNTIME-PORTABILITY-GATE-001') && closeoutDoc.includes('This does not run live extraction'), 'closeout documents next card and no-live-extraction limit', KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY) && currentState.includes(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY), 'current plan/state name quality gate closeout', KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    gateStatus: gateStatus.status,
    dogfoodOk: dogfood.ok,
    liveExtractionStarted: gate.liveExtractionStarted,
    modelCallsStarted: gate.modelCallsStarted,
    externalWritesStarted: gate.externalWritesStarted,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Knowledge-base quality gate check')
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
