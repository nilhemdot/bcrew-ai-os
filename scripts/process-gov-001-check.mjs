#!/usr/bin/env node

import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActionRouterSnapshot,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getBusinessAtomDashboardSnapshot,
  getIntelligenceRetrievalSnapshot,
  getPlanCriticRunsByCardIds,
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  buildStrategyMeetingReadySnapshot,
} from '../lib/strategy-hub-meeting-ready.js'
import {
  buildStrategyPlanningWorkflowSnapshot,
  getStrategyPlanningEvidenceSnapshot,
} from '../lib/strategy-planning-workflow.js'
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
import {
  GOV_001_APPROVAL_PATH,
  GOV_001_CARD_ID,
  GOV_001_CHANGED_FILES,
  GOV_001_CLOSEOUT_KEY,
  GOV_001_CLOSEOUT_PATH,
  GOV_001_NEXT_CARD_ID,
  GOV_001_NOT_NEXT_BOUNDARIES,
  GOV_001_PLAN_PATH,
  GOV_001_PROOF_COMMANDS,
  GOV_001_SCRIPT_PATH,
  GOV_001_SPRINT_ID,
  buildGov001DogfoodProof,
  buildGovernanceAccountabilitySnapshot,
  evaluateGov001Implementation,
  renderGov001Closeout,
} from '../lib/gov-001-governance-accountability.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-gov-001'

const DECISION_004_PLAN_PATH = 'docs/process/decision-004-plan.md'
const DECISION_004_PROOF_COMMANDS = [
  'node --check scripts/process-decision-004-check.mjs',
  'npm run process:decision-004-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=DECISION-004 --planApprovalRef=docs/process/approvals/DECISION-004.json --closeoutKey=decision-004-pending-decision-review-v1 --commitRef=HEAD',
]
const DECISION_004_NOT_NEXT_BOUNDARIES = [
  'Do not auto-lock or auto-apply decisions.',
  'Do not send emails, messages, public posts, or external writes.',
  'Do not mutate Drive permissions.',
  'Do not expose restricted shared-comms/person-sensitive material to lower-tier users.',
  'Do not build an autonomous governance agent.',
  'Do not start private broad extraction, paid/provider access, browser-auth work, credential mutation, provider config changes, or new source access.',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function getCurrentHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function text(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim()
  return normalized || fallback
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

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `gov-001-${stableRunId(GOV_001_PLAN_PATH)}`,
        GOV_001_CARD_ID,
        GOV_001_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        GOV_001_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: GOV_001_CARD_ID,
          closeoutKey: GOV_001_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function normalizeSprintItem(item = {}) {
  return {
    cardId: item.cardId || item.backlogId,
    order: item.order ?? item.sprintOrder,
    stage: item.stage,
    planRef: item.planRef,
    definitionOfDone: item.definitionOfDone,
    proofCommands: item.proofCommands || [],
    readinessBlockerCleared: item.readinessBlockerCleared || '',
    notNextBoundaries: item.notNextBoundaries || [],
    existingWorkCheck: item.existingWorkCheck || {},
    returnedReason: item.returnedReason || '',
    nextAction: item.nextAction || '',
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
  }
}

function buildExistingWorkCheck() {
  return {
    reused: 'Reuses STRATEGY-001 Business Atoms, Strategy goal/operating truth, Action Router, meeting-ready packet, planning workflow, Current Sprint, Plan Critic, and Foundation ship gates.',
    exactGap: 'The Strategy Hub had business atoms, route review, and meeting/planning packets, but no governance packet showing room readiness, drift, structured outputs, and follow-through guardrails in one place.',
    notRebuilt: 'No Action Router rebuild, no new write system, no autonomous governance agent, no people scoring, no provider/browser/source expansion.',
    existingCode: [
      'lib/strategy-001-business-atoms.js',
      'lib/strategy-hub-meeting-ready.js',
      'lib/strategy-planning-workflow.js',
      'lib/strategy-shared-comms-routes.js',
      'public/strategic-execution.js',
    ],
    existingPolicy: [
      'Business atoms are governance input, not automatic decisions.',
      'Action Router human approval remains required before routes apply.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    readyBy: 'Steve approved unattended Foundation continuation and STRATEGY-001 advanced the sprint to GOV-001.',
    readyAt: '2026-05-20T05:45:00-04:00',
  }
}

function buildDecision004ExistingWorkCheck() {
  return {
    reused: 'Reuses GOV-001 governance accountability packet, Action Router outputs, Business Atoms, Strategic Intel issues, meeting/planning evidence, and the existing decisions ledger.',
    exactGap: 'Structured decision-like outputs are visible, but they still need a human review and lock-in workflow that keeps proposed decisions separate from locked/applied truth.',
    notRebuilt: 'No Action Router rebuild, no new decision database, no autonomous approval/apply agent, no external writes, no private/source expansion.',
    existingCode: [
      'lib/gov-001-governance-accountability.js',
      'lib/strategy-action-router.js',
      'lib/strategy-001-business-atoms.js',
      'lib/foundation-db.js',
      'public/strategic-execution.js',
    ],
    existingPolicy: [
      'Decision-grade outputs are proposed until a human reviews and locks them.',
      'Business atoms and governance packets are inputs, not automatic decisions.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    readyBy: GOV_001_CLOSEOUT_KEY,
    readyAt: '2026-05-20T06:40:00-04:00',
  }
}

function buildDecision004Item({ existingItem = {}, closeCard = false, currentHead = '' } = {}) {
  const normalized = normalizeSprintItem(existingItem)
  const existingMetadata = normalized.metadata || {}
  return {
    ...normalized,
    cardId: GOV_001_NEXT_CARD_ID,
    order: Number(normalized.order || existingItem.sprintOrder || 8),
    stage: closeCard && normalized.stage !== 'done_this_sprint' ? 'scoping' : normalized.stage || 'scoping',
    planRef: normalized.planRef || DECISION_004_PLAN_PATH,
    definitionOfDone: 'Pending decision review and lock-in workflow is scoped and then built from source-backed governance/action-route outputs; proposed decisions remain human-review only until explicitly locked.',
    proofCommands: DECISION_004_PROOF_COMMANDS,
    notNextBoundaries: Array.from(new Set([
      ...(normalized.notNextBoundaries || []),
      ...DECISION_004_NOT_NEXT_BOUNDARIES,
    ])),
    existingWorkCheck: {
      ...(normalized.existingWorkCheck || {}),
      ...buildDecision004ExistingWorkCheck(),
    },
    returnedReason: normalized.returnedReason || '',
    nextAction: `Continue after ${GOV_001_CLOSEOUT_KEY}; build pending decision review/lock-in workflow using governance outputs.`,
    metadata: {
      ...existingMetadata,
      approvalBoundActionsParkInsteadOfStopping: true,
      blockersBlockActionsNotSprint: true,
      expectedCloseoutKey: 'decision-004-pending-decision-review-v1',
      repoPosture: {
        ...(existingMetadata.repoPosture || {}),
        integrationBranch: 'main',
        expectedBaseCommit: currentHead,
        commitPushRequiredAfterCard: true,
        mainMustEqualOriginMainAtCloseout: true,
      },
    },
  }
}

function buildUpdatedSprintOverlay({ activeSprint, closeCard = false, currentHead = '' }) {
  const sprint = activeSprint.sprint || {}
  const existingItems = activeSprint.items || []
  const existingById = new Map(existingItems.map(item => [item.cardId, item]))
  const merged = existingItems.map(normalizeSprintItem)
  const currentItem = existingById.get(GOV_001_CARD_ID) || {}
  const currentIndex = merged.findIndex(item => item.cardId === GOV_001_CARD_ID)
  const updatedCurrent = {
    ...normalizeSprintItem(currentItem),
    cardId: GOV_001_CARD_ID,
    order: Number(currentItem.order || currentItem.sprintOrder || 7),
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: GOV_001_PLAN_PATH,
    definitionOfDone: 'Strategy Hub v2 renders a read-only governance accountability packet with source readiness, sequence, cadence checks, drift, structured outputs, and no-auto-apply guardrails.',
    proofCommands: GOV_001_PROOF_COMMANDS,
    notNextBoundaries: Array.from(new Set([...(currentItem.notNextBoundaries || []), ...GOV_001_NOT_NEXT_BOUNDARIES])),
    existingWorkCheck: {
      ...(currentItem.existingWorkCheck || {}),
      ...buildExistingWorkCheck(),
    },
    nextAction: closeCard ? `Continue ${GOV_001_NEXT_CARD_ID}.` : 'Close GOV-001 before DECISION-004.',
    metadata: {
      ...(currentItem.metadata || {}),
      closeoutKey: GOV_001_CLOSEOUT_KEY,
      approvalRef: GOV_001_APPROVAL_PATH,
      readOnlyGovernancePacket: true,
      noAutoApply: true,
    },
  }
  if (currentIndex >= 0) merged[currentIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  const nextIndex = merged.findIndex(item => item.cardId === GOV_001_NEXT_CARD_ID)
  if (nextIndex >= 0) {
    merged[nextIndex] = buildDecision004Item({
      existingItem: merged[nextIndex],
      closeCard,
      currentHead,
    })
  } else {
    merged.push(buildDecision004Item({ closeCard, currentHead }))
  }
  merged.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  return {
    sprint: {
      sprintId: sprint.sprintId || GOV_001_SPRINT_ID,
      status: 'active',
      goal: sprint.goal || 'Continue unattended Foundation work from source-truth into data health and operating control.',
      activeBlockerCardId: closeCard ? GOV_001_NEXT_CARD_ID : GOV_001_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'decision_004_scoping' : 'gov_001_active',
        lastClosedCardId: closeCard ? GOV_001_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? GOV_001_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
        approvalPolicy: sprint.metadata?.approvalPolicy || 'Blockers block unsafe actions, not the whole sprint. Park approval-bound operations and continue to the next safe card.',
      },
    },
    items: merged,
  }
}

async function buildLiveGovernanceSnapshot() {
  const [goalTruth, operatingTruth, actionRouter, retrieval, planningEvidence, businessAtoms] = await Promise.all([
    getStrategyGoalTruthSnapshot(),
    getStrategyOperatingTruthSnapshot(),
    getActionRouterSnapshot({ limit: 50 }),
    getIntelligenceRetrievalSnapshot({ limit: 20 }),
    getStrategyPlanningEvidenceSnapshot({ issueLimit: 25, scoperLimit: 25 }),
    getBusinessAtomDashboardSnapshot({ limit: 30 }),
  ])
  const generatedAt = new Date().toISOString()
  const meetingReady = buildStrategyMeetingReadySnapshot({
    goalTruth,
    operatingTruth,
    actionRouter,
    retrieval,
    generatedAt,
  })
  const planningWorkflow = buildStrategyPlanningWorkflowSnapshot({
    goalTruth,
    operatingTruth,
    actionRouter,
    retrieval,
    meetingReady,
    strategicIssues: planningEvidence.strategicIssues || [],
    scoperOutputs: planningEvidence.scoperOutputs || [],
    generatedAt,
  })
  return buildGovernanceAccountabilitySnapshot({
    goalTruth,
    operatingTruth,
    actionRouter,
    businessAtoms,
    meetingReady,
    planningWorkflow,
    generatedAt,
  })
}

async function applyLiveClose({ activeSprint, planReview, snapshot, dogfood, evaluation }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: GOV_001_SCRIPT_PATH,
    operation: 'close GOV-001 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(GOV_001_CARD_ID, {
    lane: 'done',
    priority: 'P1',
    rank: 7,
    nextAction: `Done under ${GOV_001_CLOSEOUT_KEY}; proof: npm run process:gov-001-check -- --close-card --json; closeout ${GOV_001_CLOSEOUT_PATH}; continue ${GOV_001_NEXT_CARD_ID}.`,
    statusNote: `Closed 2026-05-20 under ${GOV_001_CLOSEOUT_KEY}; Strategy Hub now exposes read-only governance accountability packet with source readiness, sequence, drift queue, structured outputs, and no-auto-apply guardrails.`,
    owner: 'Foundation Governance',
  }, ACTOR)
  await updateBacklogItem(GOV_001_NEXT_CARD_ID, {
    lane: 'scoped',
    priority: 'P1',
    rank: 13,
    nextAction: `Continue after ${GOV_001_CLOSEOUT_KEY}; build pending decision review and lock-in workflow from governance/action-route outputs.`,
    statusNote: `Unblocked by ${GOV_001_CLOSEOUT_KEY}; governance packet now exposes structured outputs and owner pressure, but decisions still need explicit human review/lock-in.`,
    owner: 'Foundation Decisions',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, closeCard: true, currentHead: getCurrentHead() }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || GOV_001_SPRINT_ID,
      reason: `${GOV_001_CARD_ID} closes governance accountability and advances to ${GOV_001_NEXT_CARD_ID}.`,
    },
  )
  const closeout = renderGov001Closeout({
    evaluation,
    snapshot,
    dogfood,
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, GOV_001_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, GOV_001_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: GOV_001_SCRIPT_PATH,
      operation: 'close GOV-001 and advance Current Sprint',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
  }

  let dbInitialized = false
  try {
    const checks = []
    const [
      approvalValidation,
      planSource,
      moduleSource,
      routeSource,
      htmlSource,
      uiSource,
      serverSource,
      registrySource,
      coverageSource,
      packageJson,
      closeoutDoc,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: GOV_001_APPROVAL_PATH, cardId: GOV_001_CARD_ID }),
      readRepoFile(GOV_001_PLAN_PATH),
      readRepoFile('lib/gov-001-governance-accountability.js'),
      readRepoFile('lib/strategy-shared-comms-routes.js'),
      readRepoFile('public/strategic-execution.html'),
      readRepoFile('public/strategic-execution.js'),
      readRepoFile('server.js'),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoJson('package.json'),
      readRepoFile(GOV_001_CLOSEOUT_PATH, { optional: true }),
    ])
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: {
        id: GOV_001_CARD_ID,
        title: 'Build governance accountability into the system',
        priority: 'P1',
      },
      changedFiles: GOV_001_CHANGED_FILES,
      declaredRisk: 'Governance accountability can drift into auto-applied decisions, people scoring, external sends, or a new agent runtime.',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)

    await initFoundationDb()
    dbInitialized = true
    const [snapshot, activeSprint, cards, planCriticRuns] = await Promise.all([
      buildLiveGovernanceSnapshot(),
      getActiveFoundationCurrentSprint(),
      getBacklogItemsByIds([GOV_001_CARD_ID, GOV_001_NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([GOV_001_CARD_ID]),
    ])
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId
    const closeout = getFoundationBuildCloseouts().find(record => record.key === GOV_001_CLOSEOUT_KEY)
    const packageScript = packageJson.scripts?.['process:gov-001-check']
    const dogfood = buildGov001DogfoodProof()
    const evaluation = evaluateGov001Implementation({
      moduleSource,
      routeSource,
      uiSource,
      serverSource,
      registrySource,
      coverageSource,
      packageJson,
      snapshot,
    })

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'GOV-001 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || GOV_001_APPROVAL_PATH)
    addCheck(checks, approvalValidation.approval?.cardId === GOV_001_CARD_ID && Number(approvalValidation.approval?.score) >= 9.8, 'GOV-001 approval score is 9.8+', `${approvalValidation.approval?.cardId || 'missing'} / ${approvalValidation.approval?.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes GOV-001 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === GOV_001_CARD_ID), 'GOV-001 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, cards.some(card => card.id === GOV_001_NEXT_CARD_ID), 'DECISION-004 next card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === GOV_001_CARD_ID || (args.closeCard && currentActiveBlocker === GOV_001_NEXT_CARD_ID), 'Current Sprint owns GOV-001 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, snapshot.status === 'ready', 'governance accountability snapshot is ready', snapshot.status)
    addCheck(checks, (snapshot.summary?.sourceCount || 0) >= 3, 'governance snapshot has source proof', String(snapshot.summary?.sourceCount || 0))
    addCheck(checks, (snapshot.summary?.cadenceCheckCount || 0) >= 5, 'governance snapshot has cadence checks', String(snapshot.summary?.cadenceCheckCount || 0))
    addCheck(checks, (snapshot.summary?.structuredOutputCount || 0) > 0, 'governance snapshot has structured outputs', String(snapshot.summary?.structuredOutputCount || 0))
    addCheck(checks, snapshot.guardrails?.noAutoApply === true && snapshot.guardrails?.externalWritesBlocked === true, 'governance snapshot blocks auto-apply and external writes', JSON.stringify(snapshot.guardrails || {}))
    addCheck(checks, evaluation.ok, 'GOV-001 implementation wiring is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
    addCheck(checks, dogfood.ok, 'GOV-001 dogfood rejects unsafe governance packets', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${GOV_001_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    addCheck(checks, htmlSource.includes('data-section="governance"'), 'Strategy Hub nav exposes Governance section', 'public/strategic-execution.html')
    for (const relativePath of GOV_001_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/') || file.startsWith('public/'))) {
      const willWriteCloseout = args.closeCard && relativePath === GOV_001_CLOSEOUT_PATH
      const closeoutPending = !args.closeCard && relativePath === GOV_001_CLOSEOUT_PATH
      addCheck(
        checks,
        willWriteCloseout || closeoutPending || await repoFileExists(relativePath),
        `${relativePath} exists`,
        willWriteCloseout || closeoutPending ? 'will be written on close' : relativePath,
      )
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(GOV_001_CARD_ID), 'closeout registry exposes GOV-001', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.closeCard, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending write')

    const preCloseFailed = checks.filter(check => !check.ok)
    if (args.closeCard && preCloseFailed.length === 0) {
      await applyLiveClose({ activeSprint, planReview, snapshot, dogfood, evaluation })
    }

    const refreshedSprint = await getActiveFoundationCurrentSprint()
    const refreshedCards = await getBacklogItemsByIds([GOV_001_CARD_ID, GOV_001_NEXT_CARD_ID])
    const refreshedCurrent = refreshedCards.find(card => card.id === GOV_001_CARD_ID)
    const refreshedNext = refreshedCards.find(card => card.id === GOV_001_NEXT_CARD_ID)
    const refreshedItem = (refreshedSprint.items || []).find(item => item.cardId === GOV_001_CARD_ID)
    const refreshedActiveBlocker = refreshedSprint.sprint?.activeBlockerCardId || null
    addCheck(checks, !args.closeCard || refreshedCurrent?.lane === 'done', 'close-card marks GOV-001 done in Backlog', refreshedCurrent?.lane || 'missing')
    addCheck(checks, !args.closeCard || ['scoped', 'research', 'executing'].includes(refreshedNext?.lane), 'close-card keeps DECISION-004 live next', refreshedNext?.lane || 'missing')
    addCheck(checks, !args.closeCard || refreshedItem?.stage === 'done_this_sprint', 'close-card marks GOV-001 done this sprint', refreshedItem?.stage || 'missing')
    addCheck(checks, !args.closeCard || refreshedActiveBlocker === GOV_001_NEXT_CARD_ID, 'close-card advances active blocker to DECISION-004', refreshedActiveBlocker || 'missing')
    addCheck(checks, !args.closeCard || (await readRepoFile(GOV_001_CLOSEOUT_PATH, { optional: true })).includes(GOV_001_CLOSEOUT_KEY), 'close-card writes GOV-001 closeout handoff', closeoutDoc ? 'present' : GOV_001_CLOSEOUT_PATH)

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: GOV_001_CARD_ID,
      closeoutKey: GOV_001_CLOSEOUT_KEY,
      nextCardId: GOV_001_NEXT_CARD_ID,
      generatedAt: new Date().toISOString(),
      closed: args.closeCard,
      planSummary,
      activeBlocker: refreshedActiveBlocker,
      summary: {
        checks: checks.length,
        failed: failed.length,
        ...evaluation.summary,
      },
      checks,
      failed,
      snapshot: {
        status: snapshot.status,
        summary: snapshot.summary,
        proof: snapshot.proof,
      },
      dogfood,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`GOV-001 status: ${report.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    process.exitCode = report.ok ? 0 : 1
  } finally {
    if (dbInitialized) await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
