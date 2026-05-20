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
import {
  FOUNDATION_004_APPROVAL_PATH,
  FOUNDATION_004_BLUEPRINT_PATH,
  FOUNDATION_004_CARD_ID as CARD_ID,
  FOUNDATION_004_CHANGED_FILES,
  FOUNDATION_004_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_004_CLOSEOUT_PATH,
  FOUNDATION_004_NEXT_CARD_ID as NEXT_CARD_ID,
  FOUNDATION_004_NOT_NEXT,
  FOUNDATION_004_PLAN_PATH,
  FOUNDATION_004_PROOF_COMMANDS,
  FOUNDATION_004_SCRIPT_PATH,
  FOUNDATION_004_REQUIRED_SOURCE_IDS,
  buildFoundation004DogfoodProof,
  buildFoundation004Status,
} from '../lib/foundation-004-operating-truth-refinement.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
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

async function readRequiredSources() {
  return {
    planSource: await readRepoFile(FOUNDATION_004_PLAN_PATH),
    operatingTruths: await readRepoFile('docs/strategy/operating-truths.md'),
    blueprint: await readRepoFile(FOUNDATION_004_BLUEPRINT_PATH),
    freedomNote: await readRepoFile('docs/source-notes/freedom-sheet.md'),
    ownersNote: await readRepoFile('docs/source-notes/owners-dashboard.md'),
    clickUpNote: await readRepoFile('docs/source-notes/clickup.md'),
    processSource: await readRepoFile(FOUNDATION_004_SCRIPT_PATH),
    proofSource: await readRepoFile('lib/foundation-004-operating-truth-refinement.js'),
    packageJson: await readRepoJson('package.json'),
  }
}

async function queryLiveState() {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const sourceResult = await client.query(
      `
        SELECT source_id, title, status, validation, owner, location, access_method, last_verified
        FROM source_contract_registry
        WHERE source_id = ANY($1::text[])
        ORDER BY source_id
      `,
      [FOUNDATION_004_REQUIRED_SOURCE_IDS],
    )
    return {
      sourceRows: sourceResult.rows,
    }
  } finally {
    client.release()
    await pool.end()
  }
}

function buildFoundation004CardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Run an operating-truth refinement pass after the core sheet validations',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 3,
    source: 'Freedom / Owners validation closeout',
    summary: 'Promote durable business rules from Freedom, Owners, finance, ClickUp, and FUB validation notes into one operating-truth layer and one Freedom rebuild blueprint while preserving source notes as evidence/current-process records.',
    whyItMatters: 'Roster semantics, source attribution, self-validation risk, company-kept revenue, and source ownership should not be rediscovered from chat history or scattered validation notes every time the system rebuilds a dashboard or data adapter.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue \`${NEXT_CARD_ID}\` in the active Foundation sprint.`
      : 'Refine operating truths, add the Freedom rebuild blueprint, cross-link source notes, prove source boundaries, and close to DATA-001.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; operating truths and rebuild blueprint are now durable repo truth.`
      : `Executing \`${CLOSEOUT_KEY}\`; no live source mutation or broad extraction.`,
    owner: 'Foundation Source',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `foundation-004-${stableRunId(FOUNDATION_004_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

function buildFoundation004ExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-contracts.js',
      'lib/source-contract-registry-table.js',
      'lib/source-of-truth-payload.js',
      'lib/foundation-db.js',
      'lib/process-plan-critic.js',
    ],
    existingDocs: [
      'docs/strategy/operating-truths.md',
      'docs/source-notes/freedom-sheet.md',
      'docs/source-notes/owners-dashboard.md',
      'docs/source-notes/clickup.md',
      'docs/source-notes/follow-up-boss.md',
      'docs/source-notes/bhag-builder-lists.md',
      'docs/source-registry.md',
    ],
    existingScripts: [
      'scripts/process-system-health-nightly-audit-check.mjs',
      'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: 'Foundation-only source-truth refinement. Read local repo and DB source-registry metadata only; do not mutate source systems or run live extraction.',
    reused: 'Reused signed-off source registry rows, Freedom/Owners/ClickUp/FUB source notes, operating-truth doctrine, Current Sprint, Plan Critic, and ship gates.',
    notRebuilt: 'No source connector rebuild, no spreadsheet mutation, no ClickUp writes, no FUB writes, no finance mutation, and no external action.',
    exactGap: 'Durable business rules from the validation passes were still fragmented across source notes and chat handoffs; no single rebuild blueprint existed.',
    overBroadRisk: 'This card can drift into spreadsheet/source repair or live-value hardcoding; the approved work is interpretation and blueprint promotion only.',
    readyBy: 'Steve unattended Foundation sprint approval after SOURCE-003.',
    readyAt: '2026-05-20T04:00:00-04:00',
  }
}

async function upsertBacklogAndSprint({ closeCard = false, planReview, previousSprint } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const cardRow = buildFoundation004CardRow({ closeCard })
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
      [cardRow.id, cardRow.title, cardRow.team, cardRow.lane, cardRow.priority, cardRow.rank, cardRow.source, cardRow.summary, cardRow.whyItMatters, cardRow.nextAction, cardRow.statusNote, cardRow.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-004')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        CARD_ID,
        FOUNDATION_004_PLAN_PATH,
        planReview.status,
        planReview.score,
        FOUNDATION_004_CHANGED_FILES,
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

  const sprintRecord = previousSprint?.sprint || previousSprint || {}
  const sprintItems = previousSprint?.items || sprintRecord?.items || []
  const existingById = new Map(sprintItems.map(item => [item.cardId, item]))
  const sourceOrder = existingById.get(CARD_ID)?.order || existingById.get(CARD_ID)?.sprintOrder || 1
  const merged = sprintItems.map(item => ({ ...item }))
  const cardIndex = merged.findIndex(item => item.cardId === CARD_ID)
  const currentItem = cardIndex >= 0 ? merged[cardIndex] : {}
  const updatedCurrent = {
    ...currentItem,
    cardId: CARD_ID,
    order: sourceOrder,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: FOUNDATION_004_PLAN_PATH,
    definitionOfDone: 'Operating truths and Freedom rebuild blueprint are refined from signed-off Freedom/Owners/finance/ClickUp/FUB source validations, source-note roles are cross-linked, and unresolved gaps route to backlog/source truth rather than loose notes.',
    proofCommands: FOUNDATION_004_PROOF_COMMANDS,
    nextAction: closeCard ? `Continue ${NEXT_CARD_ID}.` : 'Close FOUNDATION-004 before DATA-001.',
    notNextBoundaries: Array.from(new Set([...(currentItem.notNextBoundaries || []), ...FOUNDATION_004_NOT_NEXT])),
    existingWorkCheck: {
      ...(currentItem.existingWorkCheck || {}),
      ...buildFoundation004ExistingWorkCheck(),
    },
    metadata: {
      ...(currentItem.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: FOUNDATION_004_APPROVAL_PATH,
    },
  }
  if (cardIndex >= 0) merged[cardIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  const nextIndex = merged.findIndex(item => item.cardId === NEXT_CARD_ID)
  if (closeCard && nextIndex >= 0) {
    merged[nextIndex] = {
      ...merged[nextIndex],
      stage: merged[nextIndex].stage === 'done_this_sprint' ? 'done_this_sprint' : 'scoping',
      nextAction: merged[nextIndex].nextAction || 'Scope and prove DATA-001 next.',
    }
  }
  merged.sort((a, b) => Number(a.order || a.sprintOrder || 0) - Number(b.order || b.sprintOrder || 0))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
        status: 'active',
        goal: sprintRecord?.goal || 'Continue unattended Foundation work from source-truth into data health and operating control.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(sprintRecord?.metadata || {}),
          currentStatus: closeCard ? 'data_001_scoping' : 'foundation_004_active',
          lastClosedCardId: closeCard ? CARD_ID : sprintRecord?.metadata?.lastClosedCardId,
          lastCloseoutKey: closeCard ? CLOSEOUT_KEY : sprintRecord?.metadata?.lastCloseoutKey,
        },
      },
      items: merged,
    },
    'codex-foundation-004',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20',
      reason: `${CARD_ID} ${closeCard ? 'closes operating truth refinement and advances to DATA-001' : 'owns the active blocker'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
      commandName: 'process-foundation-004-check',
      summary: 'close FOUNDATION-004 operating-truth refinement and advance Current Sprint',
    })
  }

  let dbInitialized = false
  try {
    const checks = []
    const sources = await readRequiredSources()
    const approvalValidation = await validatePlanApprovalFile({ repoRoot, approvalRef: FOUNDATION_004_APPROVAL_PATH, cardId: CARD_ID })
    const approval = approvalValidation.approval || {}
    const planReview = evaluatePlanCriticPlan({
      planText: sources.planSource,
      card: buildFoundation004CardRow({ closeCard: args.closeCard }),
      changedFiles: FOUNDATION_004_CHANGED_FILES,
      declaredRisk: 'operating-truth semantics, source role boundaries, current sprint progression, closeout registry, and source-note cross-linking',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)

    await initFoundationDb()
    dbInitialized = true
    const activeSprint = await getActiveFoundationCurrentSprint()
    const cards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID])
    const liveState = await queryLiveState()
    const status = buildFoundation004Status({ sourceRows: liveState.sourceRows, sources })
    const dogfood = buildFoundation004DogfoodProof()
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY)
    const packageScript = sources.packageJson.scripts?.['process:foundation-004-check']
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'FOUNDATION-004 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || FOUNDATION_004_APPROVAL_PATH)
    addCheck(checks, approval.cardId === CARD_ID && Number(approval.score) >= 9.8, 'FOUNDATION-004 approval score is 9.8+', `${approval.cardId || 'missing'} / ${approval.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes FOUNDATION-004 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === CARD_ID), 'FOUNDATION-004 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, cards.some(card => card.id === NEXT_CARD_ID), 'DATA-001 next card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === CARD_ID || (args.closeCard && currentActiveBlocker === NEXT_CARD_ID), 'Current Sprint owns FOUNDATION-004 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, status.ok, 'operating-truth refinement status is healthy', status.failed.map(item => item.check).join('; ') || `${status.checks.length}/${status.checks.length}`)
    addCheck(checks, dogfood.ok, 'dogfood rejects operating-truth false-greens', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${FOUNDATION_004_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    for (const relativePath of FOUNDATION_004_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/'))) {
      addCheck(checks, await repoFileExists(relativePath), `${relativePath} exists`, relativePath)
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry exposes FOUNDATION-004', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.apply, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending apply')

    if (args.apply || args.closeCard) {
      const latestSprint = await getActiveFoundationCurrentSprint()
      await upsertBacklogAndSprint({
        closeCard: args.closeCard,
        planReview,
        previousSprint: latestSprint,
      })
    }

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      nextCardId: NEXT_CARD_ID,
      generatedAt: new Date().toISOString(),
      applied: args.apply || args.closeCard,
      closed: args.closeCard,
      planSummary,
      summary: {
        checks: checks.length,
        failed: failed.length,
        sourceRows: liveState.sourceRows.length,
      },
      statusProof: status,
      dogfood,
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`FOUNDATION-004 status: ${report.status}`)
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
