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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
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
  STRATEGIC_INTEL_APPROVAL_PATH,
  STRATEGIC_INTEL_CARD_ID,
  STRATEGIC_INTEL_CHANGED_FILES,
  STRATEGIC_INTEL_CLOSEOUT_KEY,
  STRATEGIC_INTEL_CLOSEOUT_PATH,
  STRATEGIC_INTEL_NEXT_CARD_ID,
  STRATEGIC_INTEL_NOT_NEXT_BOUNDARIES,
  STRATEGIC_INTEL_PLAN_PATH,
  STRATEGIC_INTEL_PROOF_COMMANDS,
  STRATEGIC_INTEL_SCOPER_CARD_ID,
  STRATEGIC_INTEL_SCRIPT_PATH,
  STRATEGIC_INTEL_SPEC_PATH,
  STRATEGIC_INTEL_SPRINT_ID,
  STRATEGIC_INTEL_WEEKLY_TARGETS,
  buildStrategicIntelDogfoodProof,
  buildStrategicIssueRecords,
  ensureStrategicIntelSchema,
  evaluateStrategicIntelSnapshot,
  getStrategicIntelSnapshot,
  upsertStrategicIssues,
} from '../lib/strategic-intel-loop.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-strategic-intel'

function parseArgs(argv = process.argv.slice(2)) {
  const closeCard = isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] })
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard,
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

function ensureTextIncludes(value = '', required = '') {
  const text = String(value || '').trim()
  if (!required || text.includes(required)) return text
  return `${text}${text ? ' ' : ''}${required}`.trim()
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: STRATEGIC_INTEL_CARD_ID,
    title: 'Define the continuous Strategic Intelligence loop',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 15,
    source: '2026-04-28 Strategic Intelligence reframing, legacy-system salvage map, current atom/action-router truth.',
    summary: 'Build the governed strategic issue ledger and loop that turns source-backed synthesized items into strategic issues with lifecycle, scoring, owner, evidence refs, route refs, Scoper dependency, and resolution feedback targets.',
    whyItMatters: 'Steve wants a continuous strategy operating loop, not another dashboard or old-system agent pile. The system needs stable strategic issue identity before Scoper, decision doctrine, and daily operator pulse can work.',
    nextAction: closeCard
      ? `Done under ${STRATEGIC_INTEL_CLOSEOUT_KEY}; continue ${STRATEGIC_INTEL_NEXT_CARD_ID}.`
      : 'Create intelligence_strategic_issues from existing strategy-eligible synthesized items, prove scoring/evidence/lifecycle fields, and keep Scoper blocked until the issue ledger contract is live.',
    statusNote: closeCard
      ? `Closed v1 under ${STRATEGIC_INTEL_CLOSEOUT_KEY}; intelligence_strategic_issues and issue events are live, seeded from source-backed strategy items, weekly targets are encoded, and Current Sprint advances to ${STRATEGIC_INTEL_NEXT_CARD_ID}.`
      : 'Executing v1: no extraction, no provider calls, no old agent runtime, no external writes; only current DB truth and repo specs feed the strategic issue ledger.',
    owner: 'Foundation Intelligence',
  }
}

function buildDecisionNextCardRow(existing = {}) {
  let nextAction = existing.nextAction || 'Scope the v1 flow on the Harlan proof case: atom/synthesis detects issue, routes to owner question, captures one answer, classifies domain and owner, checks existing decisions/doctrine for conflict, creates a pending decision or backlog item, then shows propagation status and assigned follow-through.'
  nextAction = ensureTextIncludes(nextAction, '`DECISION-008` must read from `intelligence_strategic_issues`, preserve issue/route/source refs, and write resolution feedback back to the strategic issue loop before any doctrine/backlog application is considered complete.')
  let statusNote = existing.statusNote || 'Created after Steve challenged whether business answers were preserved or buried in docs.'
  statusNote = ensureTextIncludes(statusNote, `Ready after ${STRATEGIC_INTEL_CLOSEOUT_KEY}; use strategic issue records, action routes, and resolution feedback as the source of accountability truth.`)

  return {
    ...existing,
    id: STRATEGIC_INTEL_NEXT_CARD_ID,
    title: existing.title || 'Promote atom-raised issues into accountability doctrine',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P0',
    rank: existing.rank || 16,
    source: existing.source || 'Strategic Intelligence loop v1 and atom/action-router doctrine backlog.',
    summary: existing.summary || 'Turn strategic issues and routed atom/synthesis signals into owner-bound accountability doctrine, decisions, questions, or backlog proposals with feedback back to source truth.',
    whyItMatters: existing.whyItMatters || 'Strategic issues only matter if they result in accountable decisions, questions, tasks, or deliberate rejection/snooze.',
    nextAction,
    statusNote,
    owner: existing.owner || 'Foundation Intelligence',
  }
}

function buildScoperPinnedRow(existing = {}) {
  let nextAction = existing.nextAction || ''
  nextAction = ensureTextIncludes(nextAction, `Unblocked only after ${STRATEGIC_INTEL_CARD_ID} provides the live strategic issue ledger/schema, scoring fields, issue evidence refs, and resolution feedback contract.`)
  return {
    ...existing,
    id: STRATEGIC_INTEL_SCOPER_CARD_ID,
    title: existing.title || 'Build the gap-resolving Scoper',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P0',
    rank: existing.rank || 16,
    nextAction,
    statusNote: ensureTextIncludes(existing.statusNote || '', `Depends on ${STRATEGIC_INTEL_CLOSEOUT_KEY} and must query intelligence_strategic_issues before creating scoped cards.`),
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/intelligence-synthesis.js',
      'lib/intelligence-action-router.js',
      'lib/intelligence-retrieval.js',
      'lib/strategic-intel-loop.js',
    ],
    existingTables: [
      'intelligence_synthesized_items',
      'intelligence_action_routes',
      'intelligence_atoms',
      'intelligence_synthesis_facts',
      'intelligence_retrieval_chunks',
    ],
    newTables: [
      'intelligence_strategic_issues',
      'intelligence_strategic_issue_events',
    ],
    existingDocs: [
      STRATEGIC_INTEL_SPEC_PATH,
      'docs/audits/2026-05-19-legacy-system-audit.md',
      'docs/audits/2026-05-19-old-system-research-team-harvest.md',
    ],
    existingScripts: [
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'source-backed strategic issue records come from current intelligence tables, not chat claims or old-system docs',
      'weekly targets are encoded as operating metrics; actual resolution counts are measured from issue status, not faked',
      'Scoper and UI work stay out of this card',
      'resolution feedback updates issue status/events and must be consumed by DECISION-008',
    ],
    reused: 'Reuses current atom/synthesis/action-router/retrieval truth plus the 2026-04-28 Strategic Intelligence spec and legacy-system salvage map.',
    exactGap: 'The system had strategy-eligible synthesized items, but no durable strategic issue identity, lifecycle, scoring, Scoper dependency, or resolution feedback ledger.',
    overBroadRisk: 'Strategic Intelligence can become old-system agent sprawl or broad extraction. V1 stays DB-local, source-backed, and does not build UI/Scoper/Director agents.',
    readyBy: 'Steve approved continuing the Foundation gold-capture sprint after all uncarded gold was promoted.',
    readyAt: '2026-05-19T21:35:00-04:00',
    notRebuilt: 'No old agent sprawl, broad extraction, provider/model call, Strategy UI polish, Scoper implementation, or external writes.',
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `strategic-intel-${stableRunId(STRATEGIC_INTEL_PLAN_PATH)}`,
        STRATEGIC_INTEL_CARD_ID,
        STRATEGIC_INTEL_PLAN_PATH,
        planReview.status,
        planReview.score,
        STRATEGIC_INTEL_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: STRATEGIC_INTEL_CARD_ID,
          closeoutKey: STRATEGIC_INTEL_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function updateBacklogRows({ closeCard = false, decisionCard = {}, scoperCard = {} } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const rows = [
    buildCardRow({ closeCard }),
    buildDecisionNextCardRow(decisionCard),
    buildScoperPinnedRow(scoperCard),
  ]
  try {
    await client.query('BEGIN')
    for (const row of rows) {
      await client.query(
        `
          INSERT INTO backlog_items (
            id, title, team, lane, priority, rank, source, summary,
            why_it_matters, next_action, status_note, owner
          )
          VALUES ($1,$2,'foundation',$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
        [row.id, row.title, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
      )
    }
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,$3,$4,$5::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        STRATEGIC_INTEL_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${STRATEGIC_INTEL_CARD_ID}.`,
        JSON.stringify({
          closeoutKey: STRATEGIC_INTEL_CLOSEOUT_KEY,
          activeBlockerCardId: closeCard ? STRATEGIC_INTEL_NEXT_CARD_ID : STRATEGIC_INTEL_CARD_ID,
          scoperBlockedBy: STRATEGIC_INTEL_CARD_ID,
        }),
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

async function seedStrategicIssues() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: STRATEGIC_INTEL_SCRIPT_PATH,
    operation: 'create strategic issue schema and seed source-backed issue records',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await ensureStrategicIntelSchema(client)
    const records = await buildStrategicIssueRecords(client, { limit: 10 })
    const persisted = await upsertStrategicIssues(client, records, { actor: ACTOR })
    void persisted
    await client.query('COMMIT')
    return persisted
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function loadStrategicSnapshot() {
  const pool = createPool()
  const client = await pool.connect()
  try {
    return await getStrategicIntelSnapshot(client)
  } finally {
    client.release()
    await pool.end()
  }
}

async function closeCardAndAdvanceSprint({ planReview, activeSprint, decisionCard, scoperCard } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: STRATEGIC_INTEL_SCRIPT_PATH,
    operation: 'close STRATEGIC-INTEL-001 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await updateBacklogRows({ closeCard: true, decisionCard, scoperCard })
  await upsertPlanCriticRun(planReview)

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = existing.map((item, index) => {
    if (item.cardId === STRATEGIC_INTEL_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: STRATEGIC_INTEL_PLAN_PATH,
        definitionOfDone: 'Strategic issue ledger schema exists, source-backed issues are seeded with scoring/evidence refs, resolution feedback events are recorded, weekly targets are encoded, and Current Sprint advances to DECISION-008.',
        proofCommands: STRATEGIC_INTEL_PROOF_COMMANDS,
        nextAction: `Continue ${STRATEGIC_INTEL_NEXT_CARD_ID}; Strategic Intelligence ledger is live.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...STRATEGIC_INTEL_NOT_NEXT_BOUNDARIES])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: STRATEGIC_INTEL_CLOSEOUT_KEY,
          approvalRef: STRATEGIC_INTEL_APPROVAL_PATH,
          schemaTables: ['intelligence_strategic_issues', 'intelligence_strategic_issue_events'],
          weeklyTargets: STRATEGIC_INTEL_WEEKLY_TARGETS,
          blocksCardId: STRATEGIC_INTEL_SCOPER_CARD_ID,
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === STRATEGIC_INTEL_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        planRef: item.planRef || 'docs/process/decision-008-accountability-doctrine-plan.md',
        nextAction: 'Use intelligence_strategic_issues plus action-route/source refs to promote selected issues into accountable decisions, questions, backlog proposals, or explicit rejection/snooze with feedback back to the issue ledger.',
        notNextBoundaries: Array.from(new Set([
          ...(item.notNextBoundaries || []),
          'Do not write final doctrine/backlog without human-approved apply path.',
          'Do not bypass intelligence_strategic_issues source refs or resolution feedback.',
        ])),
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: STRATEGIC_INTEL_CARD_ID,
          inputLedger: 'intelligence_strategic_issues',
          inputEventLedger: 'intelligence_strategic_issue_events',
        },
      }
    }
    if (item.cardId === STRATEGIC_INTEL_SCOPER_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        metadata: {
          ...(item.metadata || {}),
          waitsFor: STRATEGIC_INTEL_NEXT_CARD_ID,
          strategicIssueLedgerReady: true,
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || STRATEGIC_INTEL_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: STRATEGIC_INTEL_NEXT_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: 'active',
          lastClosedCardId: STRATEGIC_INTEL_CARD_ID,
          nextAction: `Continue ${STRATEGIC_INTEL_NEXT_CARD_ID}; Strategic Intelligence ledger is live.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'STRATEGIC-INTEL-001 closes and advances to DECISION-008.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || null,
      reason: 'STRATEGIC-INTEL-001 closes and advances the active blocker.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    packageJson,
    planText,
    specText,
    moduleSource,
    scriptSource,
    registrySource,
    approval,
    initialCards,
    activeSprint,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(STRATEGIC_INTEL_PLAN_PATH),
    readRepoFile(STRATEGIC_INTEL_SPEC_PATH),
    readRepoFile('lib/strategic-intel-loop.js'),
    readRepoFile(STRATEGIC_INTEL_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    validatePlanApprovalFile({ repoRoot, approvalRef: STRATEGIC_INTEL_APPROVAL_PATH, cardId: STRATEGIC_INTEL_CARD_ID }),
    getBacklogItemsByIds([STRATEGIC_INTEL_CARD_ID, STRATEGIC_INTEL_NEXT_CARD_ID, STRATEGIC_INTEL_SCOPER_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])
  const decisionBefore = initialCards.find(card => card.id === STRATEGIC_INTEL_NEXT_CARD_ID)
  const scoperBefore = initialCards.find(card => card.id === STRATEGIC_INTEL_SCOPER_CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: STRATEGIC_INTEL_CHANGED_FILES,
    declaredRisk: 'new strategic issue DB schema, source-backed issue seeding, resolution feedback contract, Current Sprint advancement',
    repoRoot,
  })

  let seededCount = 0
  if (args.closeCard && approval.ok && planReview.status === 'pass') {
    const seeded = await seedStrategicIssues()
    seededCount = seeded.length
    await closeCardAndAdvanceSprint({ planReview, activeSprint, decisionCard: decisionBefore, scoperCard: scoperBefore })
  }

  const snapshot = await loadStrategicSnapshot()
  const evaluation = evaluateStrategicIntelSnapshot(snapshot)
  const dogfood = buildStrategicIntelDogfoodProof()
  const cards = await getBacklogItemsByIds([STRATEGIC_INTEL_CARD_ID, STRATEGIC_INTEL_NEXT_CARD_ID, STRATEGIC_INTEL_SCOPER_CARD_ID])
  const refreshedSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([STRATEGIC_INTEL_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const closeoutDoc = await readRepoFile(STRATEGIC_INTEL_CLOSEOUT_PATH, { optional: true })
  await closeFoundationDb()

  const card = cards.find(item => item.id === STRATEGIC_INTEL_CARD_ID) || null
  const decisionCard = cards.find(item => item.id === STRATEGIC_INTEL_NEXT_CARD_ID) || null
  const scoperCard = cards.find(item => item.id === STRATEGIC_INTEL_SCOPER_CARD_ID) || null
  const sprintItem = (refreshedSprint.items || []).find(item => item.cardId === STRATEGIC_INTEL_CARD_ID) || null
  const nextSprintItem = (refreshedSprint.items || []).find(item => item.cardId === STRATEGIC_INTEL_NEXT_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === STRATEGIC_INTEL_CLOSEOUT_KEY) || null
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === STRATEGIC_INTEL_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const activeBlocker = refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || null

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || STRATEGIC_INTEL_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Strategic Intelligence plan', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, packageJson.scripts?.['process:strategic-intel-check'] === `node --env-file-if-exists=.env ${STRATEGIC_INTEL_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:strategic-intel-check'] || 'missing')
  addCheck(checks, specText.includes('intelligence_strategic_issues') && specText.includes('Resolution Feedback'), 'design spec names strategic issue ledger and resolution feedback', STRATEGIC_INTEL_SPEC_PATH)
  addCheck(checks, moduleSource.includes('CREATE TABLE IF NOT EXISTS intelligence_strategic_issues') && moduleSource.includes('intelligence_strategic_issue_events'), 'module owns strategic issue schema and feedback events', 'schema markers present')
  addCheck(checks, scriptSource.includes('seedStrategicIssues') && scriptSource.includes('closeCardAndAdvanceSprint'), 'script can seed issues and advance sprint under close-card write guard', 'markers present')
  addCheck(checks, evaluation.ok, 'strategic issue snapshot is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects weak strategic issue fixtures', dogfood.invariant)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live STRATEGIC-INTEL-001 backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, decisionCard && decisionCard.nextAction?.includes('intelligence_strategic_issues'), 'DECISION-008 is pinned to strategic issue ledger', decisionCard?.nextAction || 'missing')
  addCheck(checks, scoperCard && scoperCard.nextAction?.includes(STRATEGIC_INTEL_CARD_ID), 'INTEL-SCOPER-001 remains dependent on Strategic Intelligence ledger', scoperCard?.nextAction || 'missing')
  addCheck(checks, registrySource.includes(STRATEGIC_INTEL_CLOSEOUT_KEY), 'closeout registry includes Strategic Intelligence loop', STRATEGIC_INTEL_CLOSEOUT_KEY)
  addCheck(checks, closeout && closeout.backlogIds?.includes(STRATEGIC_INTEL_CARD_ID), 'closeout record links STRATEGIC-INTEL-001', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(STRATEGIC_INTEL_CLOSEOUT_KEY) && closeoutDoc.includes('intelligence_strategic_issues'), 'closeout handoff exists and names strategic issue ledger', STRATEGIC_INTEL_CLOSEOUT_PATH)
  addCheck(checks, refreshedSprint.sprint?.sprintId === STRATEGIC_INTEL_SPRINT_ID, 'Current Sprint remains the gold-capture sprint', refreshedSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks Strategic Intelligence done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeBlocker === STRATEGIC_INTEL_NEXT_CARD_ID, 'close-card advances active blocker to DECISION-008', activeBlocker || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped for its own build', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: STRATEGIC_INTEL_CARD_ID,
    closeoutKey: STRATEGIC_INTEL_CLOSEOUT_KEY,
    seededCount,
    strategicIntel: evaluation.summary,
    dogfood,
    currentSprint: {
      sprintId: refreshedSprint.sprint?.sprintId || null,
      activeBlockerCardId: activeBlocker,
      strategicIntelStage: sprintItem?.stage || null,
      nextStage: nextSprintItem?.stage || null,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Strategic Intelligence check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  closeFoundationDb()
    .finally(() => {
      process.exit(1)
    })
})
