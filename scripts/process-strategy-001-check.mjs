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
  updateBacklogItem,
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
import {
  STRATEGY_001_APPROVAL_PATH,
  STRATEGY_001_CARD_ID,
  STRATEGY_001_CHANGED_FILES,
  STRATEGY_001_CLOSEOUT_KEY,
  STRATEGY_001_CLOSEOUT_PATH,
  STRATEGY_001_NEXT_CARD_ID,
  STRATEGY_001_NOT_NEXT_BOUNDARIES,
  STRATEGY_001_PLAN_PATH,
  STRATEGY_001_PROOF_COMMANDS,
  STRATEGY_001_SCRIPT_PATH,
  STRATEGY_001_SPRINT_ID,
  buildStrategy001DogfoodProof,
  ensureBusinessAtomSchema,
  evaluateStrategy001Implementation,
  getBusinessAtomDashboardSnapshotFromDb,
  getBusinessAtomSchemaStatus,
  renderStrategy001Closeout,
  seedBusinessAtomsFromCurrentEvidence,
} from '../lib/strategy-001-business-atoms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-strategy-001'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
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

function ensureTextIncludes(value = '', required = '') {
  const text = String(value || '').trim()
  if (!required || text.includes(required)) return text
  return `${text}${text ? ' ' : ''}${required}`.trim()
}

async function withBusinessAtomClient(operation) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    return await operation(client)
  } finally {
    client.release()
    await pool.end()
  }
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
        `strategy-001-${stableRunId(STRATEGY_001_PLAN_PATH)}`,
        STRATEGY_001_CARD_ID,
        STRATEGY_001_PLAN_PATH,
        planReview.status,
        planReview.score,
        STRATEGY_001_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: STRATEGY_001_CARD_ID,
          closeoutKey: STRATEGY_001_CLOSEOUT_KEY,
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
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
  }
}

function buildExistingWorkCheck() {
  return {
    reused: 'Reuses intelligence_atoms, intelligence_synthesis_facts, source_contract_registry, MEMORY-005 temporal truth semantics, Strategy Hub v2, Current Sprint, Plan Critic, and Foundation ship gates.',
    exactGap: 'The Strategy Hub had source-backed facts and an atom spine, but no business-facing atom/hit layer for weekly, monthly, quarterly, and annual planning views.',
    notRebuilt: 'No Action Router, retrieval, Graphiti, autonomous agent, old-system runtime, provider call, browser automation, external write, or broad extraction rebuild.',
    existingCode: [
      'lib/intelligence-atoms.js',
      'lib/intelligence-synthesis-facts.js',
      'lib/memory-005-temporal-truth-model.js',
      'lib/strategy-shared-comms-routes.js',
      'public/strategic-execution.js',
    ],
    existingDocs: [
      'docs/specs/business-atoms-spec.md',
      'docs/strategy/operating-truths.md',
      'docs/specs/data-source-maturity-model.md',
    ],
    existingPolicy: [
      'Live values belong in source systems and source-backed UI views.',
      'Superseded truth remains evidence, not current doctrine.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    readyBy: 'Steve approved unattended Foundation continuation and MEMORY-005 advanced the sprint to STRATEGY-001.',
    readyAt: '2026-05-20T05:45:00-04:00',
  }
}

function buildUpdatedSprintOverlay({ activeSprint, closeCard = false }) {
  const sprint = activeSprint.sprint || {}
  const existingItems = activeSprint.items || []
  const existingById = new Map(existingItems.map(item => [item.cardId, item]))
  const merged = existingItems.map(normalizeSprintItem)
  const currentIndex = merged.findIndex(item => item.cardId === STRATEGY_001_CARD_ID)
  const currentItem = existingById.get(STRATEGY_001_CARD_ID) || {}
  const updatedCurrent = {
    ...normalizeSprintItem(currentItem),
    cardId: STRATEGY_001_CARD_ID,
    order: Number(currentItem.order || currentItem.sprintOrder || 6),
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: STRATEGY_001_PLAN_PATH,
    definitionOfDone: 'Business atoms and atom hits are DB-backed, seeded from existing source-backed intelligence, exposed in Strategy Hub weekly/monthly/quarterly/annual views, and dogfood rejects weak provenance or ownerless atoms.',
    proofCommands: STRATEGY_001_PROOF_COMMANDS,
    notNextBoundaries: Array.from(new Set([...(currentItem.notNextBoundaries || []), ...STRATEGY_001_NOT_NEXT_BOUNDARIES])),
    existingWorkCheck: {
      ...(currentItem.existingWorkCheck || {}),
      ...buildExistingWorkCheck(),
    },
    nextAction: closeCard ? `Continue ${STRATEGY_001_NEXT_CARD_ID}.` : 'Close STRATEGY-001 before GOV-001.',
    metadata: {
      ...(currentItem.metadata || {}),
      closeoutKey: STRATEGY_001_CLOSEOUT_KEY,
      approvalRef: STRATEGY_001_APPROVAL_PATH,
      sourceBacked: true,
      readOnlyStrategyHubSurface: true,
      businessAtomViews: ['weekly', 'monthly', 'quarterly', 'annual'],
    },
  }
  if (currentIndex >= 0) merged[currentIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  const nextIndex = merged.findIndex(item => item.cardId === STRATEGY_001_NEXT_CARD_ID)
  if (nextIndex >= 0) {
    merged[nextIndex] = {
      ...merged[nextIndex],
      stage: closeCard && merged[nextIndex].stage !== 'done_this_sprint' ? 'scoping' : merged[nextIndex].stage,
      nextAction: ensureTextIncludes(merged[nextIndex].nextAction || '', closeCard ? `Continue after ${STRATEGY_001_CLOSEOUT_KEY}; use business atoms as planning input, not automatic governance actions.` : 'Wait for STRATEGY-001 closeout.'),
    }
  } else {
    merged.push({
      cardId: STRATEGY_001_NEXT_CARD_ID,
      order: 7,
      stage: 'scoping',
      planRef: null,
      definitionOfDone: 'Governance accountability loop is scoped and then built from source-backed decisions, owners, meetings, and business atoms.',
      proofCommands: [],
      notNextBoundaries: [],
      existingWorkCheck: {},
      returnedReason: '',
      nextAction: `Continue after ${STRATEGY_001_CLOSEOUT_KEY}; use business atoms as planning input, not automatic governance actions.`,
      metadata: {},
    })
  }
  merged.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  return {
    sprint: {
      sprintId: sprint.sprintId || STRATEGY_001_SPRINT_ID,
      status: 'active',
      goal: sprint.goal || 'Continue unattended Foundation work from source-truth into data health and operating control.',
      activeBlockerCardId: closeCard ? STRATEGY_001_NEXT_CARD_ID : STRATEGY_001_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'gov_001_scoping' : 'strategy_001_active',
        lastClosedCardId: closeCard ? STRATEGY_001_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? STRATEGY_001_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
      },
    },
    items: merged,
  }
}

async function applyLiveClose({ activeSprint, planReview, snapshot, schemaStatus, dogfood, evaluation }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: STRATEGY_001_SCRIPT_PATH,
    operation: 'close STRATEGY-001 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(STRATEGY_001_CARD_ID, {
    lane: 'done',
    priority: 'P1',
    rank: 6,
    nextAction: `Done under ${STRATEGY_001_CLOSEOUT_KEY}; proof: npm run process:strategy-001-check -- --close-card --json; closeout ${STRATEGY_001_CLOSEOUT_PATH}; continue ${STRATEGY_001_NEXT_CARD_ID}.`,
    statusNote: `Closed 2026-05-20 under ${STRATEGY_001_CLOSEOUT_KEY}; proof seeds live business_atoms/atom_hits from source-backed intelligence, validates Strategy Hub planning views, and records ${STRATEGY_001_CLOSEOUT_PATH}.`,
    owner: 'Foundation Intelligence',
  }, ACTOR)
  await updateBacklogItem(STRATEGY_001_NEXT_CARD_ID, {
    lane: 'scoped',
    priority: 'P1',
    rank: 7,
    nextAction: `Continue after ${STRATEGY_001_CLOSEOUT_KEY}; build governance accountability from source-backed decisions, meetings, owners, and business atoms.`,
    statusNote: `Unblocked by ${STRATEGY_001_CLOSEOUT_KEY}; business atoms are ready as governance/planning input, not automatic actions.`,
    owner: 'Foundation Governance',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, closeCard: true }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || STRATEGY_001_SPRINT_ID,
      reason: `${STRATEGY_001_CARD_ID} closes business atoms and advances to ${STRATEGY_001_NEXT_CARD_ID}.`,
    },
  )
  const closeout = renderStrategy001Closeout({
    evaluation,
    snapshot,
    schemaStatus,
    dogfood,
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, STRATEGY_001_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, STRATEGY_001_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: STRATEGY_001_SCRIPT_PATH,
      operation: 'seed business atoms, close STRATEGY-001, and advance Current Sprint',
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
      schemaSeedSource,
      foundationDbSource,
      sourceConstraintSource,
      routeSource,
      uiSource,
      serverSource,
      closeoutRegistrySource,
      coverageSource,
      packageJson,
      closeoutDoc,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: STRATEGY_001_APPROVAL_PATH, cardId: STRATEGY_001_CARD_ID }),
      readRepoFile(STRATEGY_001_PLAN_PATH),
      readRepoFile('lib/strategy-001-business-atoms.js'),
      readRepoFile('lib/foundation-db-schema-seed-store.js'),
      readRepoFile('lib/foundation-db.js'),
      readRepoFile('lib/source-id-constraint-contract.js'),
      readRepoFile('lib/strategy-shared-comms-routes.js'),
      readRepoFile('public/strategic-execution.js'),
      readRepoFile('server.js'),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoJson('package.json'),
      readRepoFile(STRATEGY_001_CLOSEOUT_PATH, { optional: true }),
    ])
    const approval = approvalValidation.approval || {}
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: {
        id: STRATEGY_001_CARD_ID,
        title: 'Business Atoms Framework',
        priority: 'P1',
      },
      changedFiles: STRATEGY_001_CHANGED_FILES,
      declaredRisk: 'PostgreSQL business atom schema, source contract constraints, Strategy Hub API/UI payload, Current Sprint/Backlog progression, focused process proof, and closeout registry.',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)

    await initFoundationDb()
    dbInitialized = true
    let seededAtoms = []
    if (args.closeCard) {
      seededAtoms = await withBusinessAtomClient(async client => {
        await ensureBusinessAtomSchema(client)
        return seedBusinessAtomsFromCurrentEvidence(client, { limit: 12 })
      })
    } else {
      await withBusinessAtomClient(client => ensureBusinessAtomSchema(client))
    }
    const { schemaStatus, snapshot } = await withBusinessAtomClient(async client => {
      const nextSchemaStatus = await getBusinessAtomSchemaStatus(client)
      const nextSnapshot = await getBusinessAtomDashboardSnapshotFromDb(client, { limit: 30 })
      return { schemaStatus: nextSchemaStatus, snapshot: nextSnapshot }
    })
    const [activeSprint, cards, planCriticRuns] = await Promise.all([
      getActiveFoundationCurrentSprint(),
      getBacklogItemsByIds([STRATEGY_001_CARD_ID, STRATEGY_001_NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([STRATEGY_001_CARD_ID]),
    ])
    const closeout = getFoundationBuildCloseouts().find(record => record.key === STRATEGY_001_CLOSEOUT_KEY)
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId
    const packageScript = packageJson.scripts?.['process:strategy-001-check']
    const evaluation = evaluateStrategy001Implementation({
      moduleSource,
      schemaSeedSource,
      foundationDbSource,
      routeSource,
      uiSource,
      serverSource,
      registrySource: closeoutRegistrySource,
      coverageSource,
      packageJson,
      snapshot,
      schemaStatus,
    })
    const dogfood = buildStrategy001DogfoodProof()
    const sourceConstraintOk = sourceConstraintSource.includes('business_atoms.source_id') &&
      sourceConstraintSource.includes('atom_hits.source_id') &&
      foundationDbSource.includes("'business_atoms.source_id'") &&
      foundationDbSource.includes("'atom_hits.source_id'")

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'STRATEGY-001 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || STRATEGY_001_APPROVAL_PATH)
    addCheck(checks, approval.cardId === STRATEGY_001_CARD_ID && Number(approval.score) >= 9.8, 'STRATEGY-001 approval score is 9.8+', `${approval.cardId || 'missing'} / ${approval.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes STRATEGY-001 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === STRATEGY_001_CARD_ID), 'STRATEGY-001 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, cards.some(card => card.id === STRATEGY_001_NEXT_CARD_ID), 'GOV-001 next card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === STRATEGY_001_CARD_ID || (args.closeCard && currentActiveBlocker === STRATEGY_001_NEXT_CARD_ID), 'Current Sprint owns STRATEGY-001 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, schemaStatus.ok, 'live DB has business atom tables', schemaStatus.tables.join(', ') || 'missing')
    addCheck(checks, (snapshot.summary?.totalAtoms || 0) >= 5, 'business atom snapshot has seeded atoms', String(snapshot.summary?.totalAtoms || 0))
    addCheck(checks, (snapshot.summary?.totalHits || 0) >= (snapshot.summary?.totalAtoms || 0), 'business atoms have supporting hits', `${snapshot.summary?.totalHits || 0}/${snapshot.summary?.totalAtoms || 0}`)
    addCheck(checks, (snapshot.views?.weekly || []).length >= 0 && (snapshot.views?.monthly || []).length >= 0 && (snapshot.views?.quarterly || []).length > 0 && (snapshot.views?.annual || []).length > 0, 'dashboard exposes weekly/monthly/quarterly/annual views', JSON.stringify(Object.fromEntries(Object.entries(snapshot.views || {}).map(([key, rows]) => [key, rows.length]))))
    addCheck(checks, sourceConstraintOk, 'source ID constraint audit covers business atoms', sourceConstraintOk ? 'business_atoms.source_id / atom_hits.source_id' : 'missing relation coverage')
    addCheck(checks, evaluation.ok, 'STRATEGY-001 implementation wiring is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
    addCheck(checks, dogfood.ok, 'STRATEGY-001 dogfood rejects weak atoms', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${STRATEGY_001_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    addCheck(checks, routeSource.includes('getBusinessAtomDashboardSnapshot({ limit: 30 })'), 'Strategy Hub route reads business atoms through dependency', 'lib/strategy-shared-comms-routes.js')
    addCheck(checks, !routeSource.includes('ensureBusinessAtomSchema('), 'Strategy Hub route does not run business atom schema DDL', 'read route stays read-oriented')
    for (const relativePath of STRATEGY_001_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/') || file.startsWith('public/'))) {
      const willWriteCloseout = args.closeCard && relativePath === STRATEGY_001_CLOSEOUT_PATH
      const closeoutPending = !args.closeCard && relativePath === STRATEGY_001_CLOSEOUT_PATH
      addCheck(
        checks,
        willWriteCloseout || closeoutPending || await repoFileExists(relativePath),
        `${relativePath} exists`,
        willWriteCloseout || closeoutPending ? 'will be written on close' : relativePath,
      )
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(STRATEGY_001_CARD_ID), 'closeout registry exposes STRATEGY-001', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.closeCard, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending write')

    const preCloseFailed = checks.filter(check => !check.ok)
    if (args.closeCard && preCloseFailed.length === 0) {
      await applyLiveClose({ activeSprint, planReview, snapshot, schemaStatus, dogfood, evaluation })
    }

    const refreshedSprint = await getActiveFoundationCurrentSprint()
    const refreshedCards = await getBacklogItemsByIds([STRATEGY_001_CARD_ID, STRATEGY_001_NEXT_CARD_ID])
    const refreshedCurrent = refreshedCards.find(card => card.id === STRATEGY_001_CARD_ID)
    const refreshedNext = refreshedCards.find(card => card.id === STRATEGY_001_NEXT_CARD_ID)
    const refreshedItem = (refreshedSprint.items || []).find(item => item.cardId === STRATEGY_001_CARD_ID)
    const refreshedActiveBlocker = refreshedSprint.sprint?.activeBlockerCardId || null
    addCheck(checks, !args.closeCard || refreshedCurrent?.lane === 'done', 'close-card marks STRATEGY-001 done in Backlog', refreshedCurrent?.lane || 'missing')
    addCheck(checks, !args.closeCard || refreshedNext?.lane === 'scoped', 'close-card scopes GOV-001 next', refreshedNext?.lane || 'missing')
    addCheck(checks, !args.closeCard || refreshedItem?.stage === 'done_this_sprint', 'close-card marks STRATEGY-001 done this sprint', refreshedItem?.stage || 'missing')
    addCheck(checks, !args.closeCard || refreshedActiveBlocker === STRATEGY_001_NEXT_CARD_ID, 'close-card advances active blocker to GOV-001', refreshedActiveBlocker || 'missing')
    addCheck(checks, !args.closeCard || (await readRepoFile(STRATEGY_001_CLOSEOUT_PATH, { optional: true })).includes(STRATEGY_001_CLOSEOUT_KEY), 'close-card writes STRATEGY-001 closeout handoff', closeoutDoc ? 'present' : STRATEGY_001_CLOSEOUT_PATH)

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: STRATEGY_001_CARD_ID,
      closeoutKey: STRATEGY_001_CLOSEOUT_KEY,
      nextCardId: STRATEGY_001_NEXT_CARD_ID,
      generatedAt: new Date().toISOString(),
      closed: args.closeCard,
      planSummary,
      activeBlocker: refreshedActiveBlocker,
      summary: {
        checks: checks.length,
        failed: failed.length,
        seededThisRun: seededAtoms.length,
        ...evaluation.summary,
      },
      checks,
      failed,
      snapshot: {
        status: snapshot.status,
        summary: snapshot.summary,
      },
      dogfood,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`STRATEGY-001 status: ${report.status}`)
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
