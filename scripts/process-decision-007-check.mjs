#!/usr/bin/env node

import { Pool } from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationCoreSnapshot,
  initFoundationDb,
  updateBacklogItem,
  updateDecision,
  updateOpenQuestion,
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
import {
  DECISION_007_ACTOR,
  DECISION_007_APPROVAL_PATH,
  DECISION_007_CARD_ID,
  DECISION_007_CLOSEOUT_KEY,
  DECISION_007_HANDOFF_PATH,
  DECISION_007_NEXT_CARD_ID,
  DECISION_007_PLAN_PATH,
  DECISION_007_SCRIPT_PATH,
  OLD_REBUILD_DECISIONS_PATH,
  applyDecision007Reconciliation,
  buildDecision007DogfoodProof,
  buildDecision007ReconciliationSnapshot,
} from '../lib/decision-007-reconciliation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const CHANGED_FILES = [
  'lib/decision-007-reconciliation.js',
  'scripts/process-decision-007-check.mjs',
  'docs/process/decision-007-plan.md',
  'docs/process/approvals/DECISION-007.json',
  'docs/handoffs/2026-05-20-decision-007-closeout.md',
  'lib/foundation-build-closeout-intelligence-records.js',
  'package.json',
]
const PROOF_COMMANDS = [
  'node --check lib/decision-007-reconciliation.js scripts/process-decision-007-check.mjs',
  'npm run process:decision-007-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=DECISION-007 --planApprovalRef=docs/process/approvals/DECISION-007.json --closeoutKey=decision-007-reconciliation-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=DECISION-007 --closeoutKey=decision-007-reconciliation-v1',
  'npm run process:foundation-ship -- --card=DECISION-007 --planApprovalRef=docs/process/approvals/DECISION-007.json --closeoutKey=decision-007-reconciliation-v1 --commitRef=HEAD',
]
const PRIOR_DONE_THIS_SPRINT_CARD_IDS = new Set([
  'MODEL-ROUTING-001',
  'LLM-ROUTER-001',
  'FOUNDATION-USERS-001',
])

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    mutateSprint: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.mutateSprint] }) ||
      argv.includes('--sync-sprint'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
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

function stableRunId(value) {
  return String(value || '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
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
        `decision-007-${stableRunId(DECISION_007_PLAN_PATH)}`,
        DECISION_007_CARD_ID,
        DECISION_007_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: DECISION_007_CARD_ID,
          closeoutKey: DECISION_007_CLOSEOUT_KEY,
        }),
        DECISION_007_ACTOR,
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
    returnedReason: item.returnedReason,
    metadata: item.metadata || {},
  }
}

function buildSprintOverlay(activeSprint, { closeCard = false } = {}) {
  const sprint = activeSprint.sprint || {}
  const items = (activeSprint.items || []).map(normalizeSprintItem).map(item => {
    const isCurrent = item.cardId === DECISION_007_CARD_ID
    const priorDone = closeCard && PRIOR_DONE_THIS_SPRINT_CARD_IDS.has(item.cardId)
    return {
      ...item,
      stage: isCurrent ? (closeCard ? 'done_this_sprint' : 'building_now') : priorDone ? 'done_this_sprint' : item.stage,
      planRef: isCurrent ? DECISION_007_PLAN_PATH : item.planRef,
      definitionOfDone: isCurrent
        ? 'Old rebuild decision artifact, live DB decisions, and open questions are reconciled with source-linked provenance, stale runtime claims excluded, stale questions resolved, current DECISION-008 issue preserved, focused proof, and ship gate.'
        : item.definitionOfDone,
      proofCommands: isCurrent ? PROOF_COMMANDS : item.proofCommands,
      notNextBoundaries: Array.from(new Set([
        ...(item.notNextBoundaries || []),
        'Do not bulk-import stale OpenClaw/subscription/provider runtime claims as locked truth.',
        'Do not lock, approve, reject, or apply DECISION-008 from this card.',
        'Do not send messages, mutate external systems, rotate credentials, change provider config, mutate Drive permissions, or expose public routes.',
        'Do not start Strategy Hub, People, Harlan, Crewbert, source/extraction, paid/provider, browser-auth, or broad private extraction work.',
      ])),
      existingWorkCheck: isCurrent ? {
        existingCode: ['lib/foundation-decision-store.js', 'lib/foundation-db.js', 'lib/decision-007-reconciliation.js'],
        existingDocs: [OLD_REBUILD_DECISIONS_PATH, DECISION_007_PLAN_PATH, 'docs/audits/2026-04-26-foundation-menu-and-systems-audit.md'],
        existingScripts: [DECISION_007_SCRIPT_PATH, 'scripts/process-decision-004-check.mjs', 'scripts/process-decision-005-check.mjs'],
        existingPolicy: [
          'Old-system notes and historical audits are not active truth until promoted into DB-backed decisions, source contracts, backlog, or verifier proof.',
          'Decision cleanup may strengthen provenance and resolve stale questions, but real business decisions remain proposed until explicitly approved.',
          'Blockers block unsafe actions, not the whole sprint; park approval-bound operations and continue safe work.',
        ],
        reused: 'Reuses the DB-backed decisions and open_questions ledger, existing decision provenance fields, and Current Sprint gate.',
        notRebuilt: 'Does not build a second decision list, Strategy Hub UI, auto-decision approval, source extraction, or agent runtime.',
        exactGap: 'The retired old strategy/rebuild decision artifact had useful durable decisions mixed with stale runtime/provider claims and checklist state.',
        overBroadRisk: 'A blind import would revive stale OpenClaw/subscription-era doctrine and make the Decisions page less trustworthy.',
        readyBy: 'Steve approved unattended Foundation sprint; unsafe actions remain parked.',
        readyAt: '2026-05-20T07:50:30-04:00',
      } : item.existingWorkCheck,
      metadata: {
        ...(item.metadata || {}),
        approvalRef: isCurrent ? DECISION_007_APPROVAL_PATH : item.metadata?.approvalRef,
        closeoutKey: isCurrent ? DECISION_007_CLOSEOUT_KEY : item.metadata?.closeoutKey,
      },
    }
  })
  return {
    sprint: {
      ...sprint,
      status: 'active',
      activeBlockerCardId: closeCard ? DECISION_007_NEXT_CARD_ID : DECISION_007_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'decision_007_closed_next_card_scoping' : 'decision_007_active',
        lastClosedCardId: closeCard ? DECISION_007_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? DECISION_007_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
      },
    },
    items,
  }
}

async function syncSprint(activeSprint, { closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DECISION_007_SCRIPT_PATH,
    operation: closeCard ? 'close DECISION-007 and advance REPLY-WATCHING-LOOP-001 to scoping' : 'sync DECISION-007 sprint truth',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertFoundationCurrentSprintOverlay(
    buildSprintOverlay(activeSprint, { closeCard }),
    DECISION_007_ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: closeCard
        ? 'DECISION-007 closed; REPLY-WATCHING-LOOP-001 remains scoping until its own plan and proof pass.'
        : 'Promote DECISION-007 to building with complete sprint truth.',
    },
  )
}

function renderCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  return `# DECISION-007 Closeout

Date: 2026-05-20

## What Changed

- Reconciled the retired old rebuild-decision artifact against live DB decisions and open questions.
- Strengthened provenance on the seven historical locked decisions with source/artifact refs.
- Kept stale OpenClaw/subscription/provider runtime claims out of locked decision truth.
- Confirmed stale carry-forward open questions are resolved.
- Preserved the current DECISION-008 route-derived proposed decision/open question.

## Proof

- Reconciliation rows: ${summary.reconciliationRowCount || 0}
- Historical decisions source-linked: ${summary.historicalDecisionSourceLinkedCount || 0}/${summary.historicalDecisionCount || 0}
- Stale open questions resolved: ${summary.staleQuestionResolvedCount || 0}/${summary.staleQuestionCount || 0}
- Current route-derived open questions preserved: ${summary.currentRouteOpenQuestionCount || 0}
- Route-derived proposed decision present: ${summary.routeDerivedDecisionPresent ? 'yes' : 'no'}
- Stale runtime claims imported as locked truth: ${summary.staleRuntimeImportedAsLocked ? 'yes' : 'no'}

## Commands

${PROOF_COMMANDS.map(command => `- \`${command}\``).join('\n')}

## Known Limits

- This does not approve or reject DECISION-008.
- This does not build Strategy Hub, People, agent runtime, or extraction features.
- This does not mutate external systems, send messages, rotate credentials, change provider config, or mutate Drive permissions.

## Next

Continue \`${DECISION_007_NEXT_CARD_ID}\` only after its own plan and proof pass.
`
}

async function writeCloseout(snapshot) {
  await fs.writeFile(path.join(repoRoot, DECISION_007_HANDOFF_PATH), renderCloseout(snapshot))
}

async function main() {
  const args = parseArgs()
  const checks = []
  let exitCode = 0
  await initFoundationDb()
  try {
    const [planSource, oldDecisionSource] = await Promise.all([
      readRepoFile(DECISION_007_PLAN_PATH),
      readRepoFile(OLD_REBUILD_DECISIONS_PATH),
    ])
    const approval = await validatePlanApprovalFile({
      repoRoot,
      approvalRef: DECISION_007_APPROVAL_PATH,
      cardId: DECISION_007_CARD_ID,
    })
    addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.ok ? DECISION_007_APPROVAL_PATH : JSON.stringify(approval.findings || []))
    const planReview = evaluatePlanCriticPlan({
      card: { id: DECISION_007_CARD_ID, priority: 'P1' },
      planText: planSource,
      changedFiles: CHANGED_FILES,
      currentPatch: '',
      repoRoot,
    })
    await upsertPlanCriticRun(planReview)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for DECISION-007 plan', `${planReview.status}/${planReview.score}`)

    let core = await getFoundationCoreSnapshot({ decisionLimit: 500, questionLimit: 500 })
    if (args.closeCard) {
      await applyDecision007Reconciliation({
        decisions: core.decisions,
        openQuestions: core.openQuestions,
        updateDecision,
        updateOpenQuestion,
        actor: DECISION_007_ACTOR,
      })
      await updateBacklogItem(DECISION_007_CARD_ID, {
        lane: 'done',
        statusNote: 'Closed 2026-05-20 under decision-007-reconciliation-v1; old rebuild decisions, live decision rows, and open questions are reconciled with source-linked provenance and stale runtime/provider claims kept out of locked truth.',
        nextAction: 'Done under decision-007-reconciliation-v1; continue REPLY-WATCHING-LOOP-001 only after its own plan and proof pass.',
      }, DECISION_007_ACTOR)
      const activeSprint = await getActiveFoundationCurrentSprint()
      await syncSprint(activeSprint, { closeCard: true })
      core = await getFoundationCoreSnapshot({ decisionLimit: 500, questionLimit: 500 })
    } else if (args.mutateSprint) {
      const activeSprint = await getActiveFoundationCurrentSprint()
      await syncSprint(activeSprint, { closeCard: false })
      core = await getFoundationCoreSnapshot({ decisionLimit: 500, questionLimit: 500 })
    }

    const snapshot = buildDecision007ReconciliationSnapshot({
      oldDecisionSource,
      decisions: core.decisions,
      openQuestions: core.openQuestions,
    })
    if (args.closeCard) await writeCloseout(snapshot)
    const dogfood = buildDecision007DogfoodProof()
    const closeouts = getFoundationBuildCloseouts()
    const closeoutExists = closeouts.some(closeout => closeout.key === DECISION_007_CLOSEOUT_KEY)
    const backlogCards = await getBacklogItemsByIds([DECISION_007_CARD_ID, DECISION_007_NEXT_CARD_ID])
    const backlogCardById = new Map(backlogCards.map(card => [card.id, card]))
    const currentCard = backlogCardById.get(DECISION_007_CARD_ID)
    const nextCard = backlogCardById.get(DECISION_007_NEXT_CARD_ID)

    addCheck(checks, dogfood.ok, 'dogfood rejects unsafe decision reconciliation fixtures', dogfood.dogfoodInvariant)
    addCheck(checks, snapshot.summary.oldSourceFound, 'old rebuild-decision artifact is mapped', `${snapshot.summary.reconciliationRowCount} rows`)
    addCheck(checks, snapshot.summary.historicalDecisionSourceLinkedCount === snapshot.summary.historicalDecisionCount, 'historical locked decisions are source/artifact linked', `${snapshot.summary.historicalDecisionSourceLinkedCount}/${snapshot.summary.historicalDecisionCount}`)
    addCheck(checks, snapshot.summary.staleQuestionResolvedCount === snapshot.summary.staleQuestionCount, 'stale carry-forward open questions are resolved', `${snapshot.summary.staleQuestionResolvedCount}/${snapshot.summary.staleQuestionCount}`)
    addCheck(checks, snapshot.summary.currentRouteOpenQuestionCount >= 1 && snapshot.summary.routeDerivedDecisionPresent, 'current DECISION-008 route-derived issue is preserved', `questions=${snapshot.summary.currentRouteOpenQuestionCount} decision=${snapshot.summary.routeDerivedDecisionPresent}`)
    addCheck(checks, snapshot.summary.staleRuntimeImportedAsLocked === false, 'stale runtime/provider claims are not imported as locked decisions', 'runtime/model doctrine stays with MODEL-ROUTING-001 and LLM-ROUTER-001')
    addCheck(checks, closeoutExists, 'closeout registry includes decision-007-reconciliation-v1', DECISION_007_CLOSEOUT_KEY)
    addCheck(checks, await fileExists(DECISION_007_PLAN_PATH) && await fileExists(DECISION_007_APPROVAL_PATH), 'plan and approval files exist', DECISION_007_PLAN_PATH)
    addCheck(checks, await fileExists(DECISION_007_HANDOFF_PATH) || !args.closeCard, 'closeout handoff exists after close-card', args.closeCard ? DECISION_007_HANDOFF_PATH : 'not closing')
    addCheck(checks, currentCard?.lane === 'done' || !args.closeCard, 'DECISION-007 is done after close-card', currentCard ? `${currentCard.id}:${currentCard.lane}` : 'missing')
    addCheck(checks, Boolean(nextCard), 'next backlog card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')

    const failures = checks.filter(check => !check.ok)
    if (failures.length) exitCode = 1
    const result = {
      ok: failures.length === 0,
      status: failures.length ? 'risk' : 'healthy',
      cardId: DECISION_007_CARD_ID,
      closeoutKey: DECISION_007_CLOSEOUT_KEY,
      snapshot,
      checks,
      failures,
    }
    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`DECISION-007 ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
  } catch (error) {
    exitCode = 1
    const result = {
      ok: false,
      status: 'error',
      error: error?.stack || String(error),
      checks,
      failures: checks.filter(check => !check.ok),
    }
    if (args.json) console.log(JSON.stringify(result, null, 2))
    else console.error(result.error)
  } finally {
    await closeFoundationDb()
  }
  process.exit(exitCode)
}

main()
