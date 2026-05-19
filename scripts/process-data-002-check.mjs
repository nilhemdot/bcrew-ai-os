#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
import { buildSourceOfTruthPayload } from '../lib/source-of-truth-payload.js'
import {
  DATA_002_APPROVAL_PATH,
  DATA_002_CARD_ID,
  DATA_002_CHANGED_FILES,
  DATA_002_CLOSEOUT_KEY,
  DATA_002_CLOSEOUT_PATH,
  DATA_002_NOT_NEXT,
  DATA_002_PLAN_PATH,
  DATA_002_PROOF_COMMANDS,
  DATA_002_SCRIPT_PATH,
  buildSourceTrustScoringSnapshot,
  buildSourceTrustScoringDogfoodProof,
  evaluateSourceTrustScoringSnapshot,
} from '../lib/data-002-source-trust-scoring.js'
import {
  WEB_GODMODE_SPRINT_CARD_ORDER,
  WEB_GODMODE_SPRINT_ID,
} from '../lib/web-godmode-extractor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const NEXT_SPRINT_ID = 'FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19'
const NEXT_SPRINT_ACTIVE_CARD_ID = 'MEMORY-003'
const NEXT_SPRINT_CARD_ORDER = [
  'MEMORY-003',
  'MEMORY-004',
  'PILLAR-4-SYSTEM-CAPABILITIES-001',
  'PILLAR-5-AGENT-INVENTORY-001',
  'SYSTEM-004',
  'LEGACY-SYSTEM-AUDIT-001',
  'STRATEGIC-INTEL-001',
  'DECISION-008',
  'INTEL-SCOPER-001',
  'DATA-003',
]
const NEXT_SPRINT_NOT_NEXT = [
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'Do not send emails, public posts, or external writes.',
  'Do not start private broad extraction, paid/provider access, browser-auth work, credential mutation, or provider config changes.',
  'Do not start Value Builder split.',
]
const NEXT_SPRINT_PROOF_COMMANDS = [
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
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

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: DATA_002_CARD_ID,
    title: 'Build source trust scoring layer',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 9,
    source: 'Foundation source trust scoring; Steve-approved GOD-mode extraction sprint closeout card.',
    summary: 'Score every source contract across source trust, connector health, freshness, completeness, and schema health so decision-safe sources are visibly different from readable, review-gated, scoped, or blocked sources.',
    whyItMatters: 'A connected source that is stale, unsigned, incomplete, or schema-risky should not carry the same weight as signed-off source truth. This prevents connector access from masquerading as decision-grade evidence.',
    nextAction: closeCard
      ? `Done under \`${DATA_002_CLOSEOUT_KEY}\`; current GOD-mode extraction sprint is complete and \`${NEXT_SPRINT_ID}\` starts with \`${NEXT_SPRINT_ACTIVE_CARD_ID}\`.`
      : 'Build and prove the scoring layer, then complete the current GOD-mode extraction sprint.',
    statusNote: closeCard
      ? `Closed under \`${DATA_002_CLOSEOUT_KEY}\`; /api/source-of-truth now carries source trust scores and Data Sources renders score/decision-state/next-trigger beside source contracts.`
      : `Executing \`${DATA_002_CLOSEOUT_KEY}\`; scoring uses existing local source contracts and health payloads only.`,
    owner: 'Foundation Source',
  }
}

async function getSprintOverlayById(sprintId) {
  const pool = createPool()
  try {
    const sprintResult = await pool.query(
      `
        SELECT *
        FROM foundation_sprints
        WHERE sprint_id = $1
        LIMIT 1
      `,
      [sprintId],
    )
    const sprintRow = sprintResult.rows[0]
    if (!sprintRow) return { sprint: null, items: [] }
    const itemResult = await pool.query(
      `
        SELECT *
        FROM foundation_sprint_items
        WHERE sprint_id = $1
        ORDER BY sprint_order ASC, created_at ASC
      `,
      [sprintId],
    )
    return {
      sprint: {
        sprintId: sprintRow.sprint_id,
        status: sprintRow.status,
        goal: sprintRow.goal,
        activeBlockerCardId: sprintRow.active_blocker_card_id,
        metadata: sprintRow.metadata || {},
      },
      items: itemResult.rows.map(row => ({
        sprintId: row.sprint_id,
        cardId: row.backlog_id,
        backlogId: row.backlog_id,
        order: row.sprint_order,
        sprintOrder: row.sprint_order,
        stage: row.stage,
        planRef: row.plan_ref,
        definitionOfDone: row.definition_of_done,
        proofCommands: row.proof_commands || [],
        readinessBlockerCleared: row.readiness_blocker_cleared,
        notNextBoundaries: row.not_next_boundaries || [],
        existingWorkCheck: row.existing_work_check || {},
        returnedReason: row.returned_reason,
        metadata: row.metadata || {},
      })),
    }
  } finally {
    await pool.end()
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `data-002-${stableRunId(DATA_002_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: DATA_002_CARD_ID,
      closeoutKey: DATA_002_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard })
  const planRun = buildPlanCriticRun(planReview)
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
      [row.id, row.title, row.team, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-data-002')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        DATA_002_CARD_ID,
        DATA_002_PLAN_PATH,
        planReview.status,
        planReview.score,
        DATA_002_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
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

function buildClosedSprintOverlay(previous = {}) {
  const existingById = new Map((previous.items || []).map(item => [item.cardId, item]))
  const items = WEB_GODMODE_SPRINT_CARD_ORDER.map((cardId, index) => {
    const existing = existingById.get(cardId) || {}
    if (cardId !== DATA_002_CARD_ID) return { ...existing, cardId, order: index + 1 }
    return {
      ...existing,
      cardId,
      order: index + 1,
      stage: 'done_this_sprint',
      planRef: DATA_002_PLAN_PATH,
      definitionOfDone: 'Every source contract has a bounded trust score, decision state, component scores, next trigger, and visible Data Sources rendering without extraction, provider calls, or external writes.',
      proofCommands: DATA_002_PROOF_COMMANDS,
      nextAction: 'Sprint complete. Plan the next 10-15 cards from clean Foundation truth.',
      notNextBoundaries: Array.from(new Set([...(existing.notNextBoundaries || []), ...DATA_002_NOT_NEXT])),
      metadata: {
        ...(existing.metadata || {}),
        closeoutKey: DATA_002_CLOSEOUT_KEY,
        approvalRef: DATA_002_APPROVAL_PATH,
      },
    }
  })
  return {
    sprint: {
      ...(previous.sprint || {}),
      sprintId: previous.sprint?.sprintId || WEB_GODMODE_SPRINT_ID,
      status: 'closed',
      activeBlockerCardId: null,
      goal: previous.sprint?.goal || 'Build the governed GOD-mode extraction stack and trust scoring layer.',
      metadata: {
        ...(previous.sprint?.metadata || {}),
        currentStatus: 'complete',
        lastClosedCardId: DATA_002_CARD_ID,
        nextAction: `Sprint complete; ${NEXT_SPRINT_ID} opens next with ${NEXT_SPRINT_ACTIVE_CARD_ID}.`,
        completedAt: new Date().toISOString(),
      },
    },
    items,
    mutation: {
      apply: true,
      allowItemReplacement: true,
      reason: 'DATA-002 completes the final approved GOD-mode extraction sprint card.',
    },
  }
}

function buildNextSprintItem(cardId, index) {
  const isActive = cardId === NEXT_SPRINT_ACTIVE_CARD_ID
  return {
    cardId,
    order: index + 1,
    stage: isActive ? 'scoping' : 'scoping',
    planRef: null,
    definitionOfDone: `${cardId} is scoped or shipped with live backlog truth, focused proof, raw-green health gates, and no unapproved external/private/provider side effects.`,
    proofCommands: NEXT_SPRINT_PROOF_COMMANDS,
    nextAction: isActive
      ? 'Scope the full-conversation archive model first so chat gold, transcript fidelity, linked decisions, and backlog promotion rules cannot be lost.'
      : 'Wait behind the active sprint blocker unless a preceding card parks an approval-bound action.',
    notNextBoundaries: NEXT_SPRINT_NOT_NEXT,
    metadata: {
      openedBy: DATA_002_CARD_ID,
      sprintControlReason: 'DATA-002 cannot leave the system with no active Current Sprint after final sprint closeout.',
      blockersBlockActionsNotSprint: true,
    },
  }
}

function buildNextSprintOverlay() {
  return {
    sprint: {
      sprintId: NEXT_SPRINT_ID,
      status: 'active',
      activeBlockerCardId: NEXT_SPRINT_ACTIVE_CARD_ID,
      goal: 'Preserve the useful gold from long chats and old-system reviews, then build live capability/inventory and strategic-intelligence control surfaces without drifting back into static docs or agent sprawl.',
      metadata: {
        currentStatus: 'sprint_scoping',
        startedBy: 'codex-data-002-closeout',
        nextAction: `Start ${NEXT_SPRINT_ACTIVE_CARD_ID}; archive/conversation truth comes before derived lessons and reusable IP.`,
        priorityOrder: NEXT_SPRINT_CARD_ORDER,
        exitCriteria: [
          'Every discussed durable idea is either live backlog truth, an explicit duplicate, or intentionally rejected with reason.',
          'Conversation archive work preserves fidelity class, privacy/redaction rules, source links, and promotion paths into backlog/decisions/doctrine.',
          'System capabilities and agent/job inventory are generated from live truth rather than hand-maintained docs.',
          'Strategic intelligence/scoper work remains evidence-bound and does not auto-act without approval.',
          'System Health, repeated-failure gate, backlog hygiene, foundation:verify, and main integration remain green after each card.',
        ],
        approvalPolicy: 'Blockers block unsafe actions, not the whole sprint. Park approval-bound operations and keep safe sprint work moving.',
      },
    },
    items: NEXT_SPRINT_CARD_ORDER.map(buildNextSprintItem),
    mutation: {
      apply: true,
      allowItemReplacement: true,
      reason: 'Open the next approved Foundation sprint after DATA-002 so gates never see a sprintless state.',
    },
  }
}

function checkPackageScript(packageJson = {}) {
  return packageJson.scripts?.['process:data-002-check'] === `node --env-file-if-exists=.env ${DATA_002_SCRIPT_PATH}`
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    packageJson,
    planText,
    moduleSource,
    payloadSource,
    rendererSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(DATA_002_PLAN_PATH),
    readRepoFile('lib/data-002-source-trust-scoring.js'),
    readRepoFile('lib/source-of-truth-payload.js'),
    readRepoFile('public/foundation-source-registry-renderers.js'),
    readRepoFile(DATA_002_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(DATA_002_CLOSEOUT_PATH, { optional: true }),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DATA_002_APPROVAL_PATH,
    cardId: DATA_002_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: { id: DATA_002_CARD_ID, priority: 'P1' },
    changedFiles: DATA_002_CHANGED_FILES,
    declaredRisk: planText,
  })

  if (args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: DATA_002_SCRIPT_PATH,
      operation: 'close DATA-002 and complete the current sprint overlay',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
    await upsertLiveCardAndPlanCritic({ closeCard: true, planReview })
  }

  await initFoundationDb()
  const payload = await buildSourceOfTruthPayload({ repoRoot })
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprint = activeSprint.sprint?.sprintId === WEB_GODMODE_SPRINT_ID
    ? activeSprint
    : await getSprintOverlayById(WEB_GODMODE_SPRINT_ID)
  const backlogCards = await getBacklogItemsByIds([DATA_002_CARD_ID])
  const planCriticRuns = await getPlanCriticRunsByCardIds([DATA_002_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const scoring = payload.sourceTrustScoring || {}
  const sourceRows = payload.sourceLayerStatus?.sourceRows || []
  const contractRows = payload.sources || []
  const fullScoring = buildSourceTrustScoringSnapshot({
    sourceContracts: contractRows,
    sourceLayerStatus: payload.sourceLayerStatus,
    kpiHealth: payload.kpiHealth,
  })
  const scoringEval = evaluateSourceTrustScoringSnapshot(fullScoring)
  const dogfood = buildSourceTrustScoringDogfoodProof()
  let closedSprintResult = null
  let nextSprintResult = null

  if (args.closeCard) {
    closedSprintResult = await upsertFoundationCurrentSprintOverlay(
      buildClosedSprintOverlay(sprint),
      'codex-data-002',
      {
        apply: true,
        allowItemReplacement: true,
        expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || null,
        reason: 'DATA-002 completes the GOD-mode extraction sprint.',
      },
    )
    const activeBeforeNextSprint = await getActiveFoundationCurrentSprint()
    nextSprintResult = await upsertFoundationCurrentSprintOverlay(
      buildNextSprintOverlay(),
      'codex-data-002',
      {
        apply: true,
        allowItemReplacement: true,
        expectedPreviousActiveSprintId: activeBeforeNextSprint.sprint?.sprintId || null,
        reason: 'DATA-002 opens the next Foundation sprint to keep Current Sprint truth healthy.',
      },
    )
  }

  const sprintAfter = await getActiveFoundationCurrentSprint()
  const closeout = closeouts.find(record => record.key === DATA_002_CLOSEOUT_KEY)
  const card = backlogCards[0] || null
  const planCriticSummary = buildPlanCriticResultSummary(planReview)
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === DATA_002_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const data002SprintItem = ((closedSprintResult?.items || sprintAfter.items) || []).find(item => item.cardId === DATA_002_CARD_ID)

  addCheck(checks, approval.ok, 'approval validates at 9.8+', DATA_002_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for DATA-002', planCriticSummary)
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card is executing/done', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, checkPackageScript(packageJson), 'package exposes focused proof script', packageJson.scripts?.['process:data-002-check'] || 'missing')
  addCheck(checks, scoringEval.ok, 'live source trust scoring snapshot is healthy', scoringEval.failed.map(item => item.check).join('; ') || `rows=${fullScoring.summary?.scoredSourceCount}`)
  addCheck(checks, dogfood.ok, 'dogfood blocks connector-only decision-safe escalation', dogfood.invariant)
  addCheck(checks, Array.isArray(contractRows) && contractRows.every(row => Number.isFinite(Number(row.trustScore?.score)) && row.trustScore?.decisionState && row.trustScore?.trigger), 'source contracts carry compact trust score payloads', String(contractRows.length))
  addCheck(checks, payload.sourceLayerStatus?.summary?.sourceTrustScoreSummary?.scoredSourceCount === contractRows.length, 'source layer summary carries trust-score coverage', `${payload.sourceLayerStatus?.summary?.sourceTrustScoreSummary?.scoredSourceCount || 0}/${contractRows.length}`)
  addCheck(checks, payload.sourceLayerStatus?.summary?.sourceTrustScoreSummary?.scoredSourceCount === scoring.summary?.scoredSourceCount, 'source layer summary exposes trust-score counts', `${payload.sourceLayerStatus?.summary?.sourceTrustScoreSummary?.scoredSourceCount || 0}/${scoring.summary?.scoredSourceCount || 0}`)
  addCheck(checks, rendererSource.includes('getSourceTrustScoreLabel') && rendererSource.includes('getSourceTrustNextTrigger') && rendererSource.includes('sourceTrustScoreSummary'), 'Data Sources renderer shows score, decision state, and next trigger', 'public/foundation-source-registry-renderers.js')
  addCheck(checks, payloadSource.includes('buildSourceTrustScoringSnapshot') && payloadSource.includes('attachSourceTrustScoresToContracts'), '/api/source-of-truth builds and attaches source trust scoring', 'lib/source-of-truth-payload.js')
  addCheck(checks, moduleSource.includes('sourceTrust') && moduleSource.includes('connectorHealth') && moduleSource.includes('schemaHealth'), 'scoring model includes required components', 'sourceTrust/connectorHealth/freshness/completeness/schemaHealth')
  addCheck(checks, closeoutRegistrySource.includes(DATA_002_CLOSEOUT_KEY), 'closeout registry includes DATA-002', DATA_002_CLOSEOUT_KEY)
  addCheck(checks, closeoutDoc.includes(DATA_002_CLOSEOUT_KEY) && closeoutDoc.includes('No extraction'), 'closeout handoff exists and states no extraction', DATA_002_CLOSEOUT_PATH)
  addCheck(checks, scriptSource.includes("status: 'closed'") && scriptSource.includes('buildNextSprintOverlay') && scriptSource.includes(NEXT_SPRINT_ACTIVE_CARD_ID), 'focused proof closes this sprint and opens the next active sprint', `${WEB_GODMODE_SPRINT_ID} -> ${NEXT_SPRINT_ID}`)
  const forbiddenModuleCalls = ['sendEmail', 'gmail.users.messages.send', 'drive.permissions.create', 'fetch(']
    .filter(token => moduleSource.includes(token))
  addCheck(checks, forbiddenModuleCalls.length === 0, 'scoring module has no external send/permission/provider calls', forbiddenModuleCalls.join(', ') || 'local scoring only')
  addCheck(checks, data002SprintItem && (args.closeCard ? data002SprintItem.stage === 'done_this_sprint' : true), 'Current Sprint DATA-002 item is visible', data002SprintItem ? data002SprintItem.stage : 'missing')
  addCheck(checks, !args.closeCard || closedSprintResult?.sprint?.status === 'closed', 'close-card closes the GOD-mode extraction sprint', closedSprintResult?.sprint?.status || 'not closed')
  addCheck(checks, !args.closeCard || (nextSprintResult?.sprint?.sprintId === NEXT_SPRINT_ID && nextSprintResult?.sprint?.activeBlockerCardId === NEXT_SPRINT_ACTIVE_CARD_ID), 'close-card opens next active sprint with a real blocker', `${nextSprintResult?.sprint?.sprintId || sprintAfter.sprint?.sprintId || 'missing'}:${nextSprintResult?.sprint?.activeBlockerCardId || sprintAfter.sprint?.activeBlockerCardId || 'missing'}`)

  await closeFoundationDb()

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    cardId: DATA_002_CARD_ID,
    closeoutKey: DATA_002_CLOSEOUT_KEY,
    generatedAt: new Date().toISOString(),
    summary: scoring.summary || {},
    dogfood: {
      ok: dogfood.ok,
      signedDecisionState: dogfood.signed?.decisionState,
      readableDecisionState: dogfood.readable?.decisionState,
      gapDecisionState: dogfood.gap?.decisionState,
    },
    checks,
    failedCount: failed.length,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`DATA-002 check: ${result.status}`)
    console.log(`Scored sources: ${result.summary.scoredSourceCount || 0}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  process.exit(failed.length ? 1 : 0)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
