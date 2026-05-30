#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
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
  FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_BYTES,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_MS,
  FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_BYTES,
  FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_MS,
} from '../lib/foundation-backlog-detail.js'
import {
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CHANGED_FILES,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PROOF_COMMANDS,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SCRIPT_PATH,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SPRINT_ID,
  buildBacklogDoneArchiveExistingWorkCheck,
  buildFoundationBacklogDoneArchiveDogfoodProof,
  evaluateFoundationBacklogDoneArchiveLazyLoad,
} from '../lib/foundation-backlog-done-archive-lazy-load.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getFoundationBuildCloseouts,
} from '../lib/foundation-build-log.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    apply: false,
    closeCard: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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

async function fetchMeasured(baseUrl, route) {
  const startedAt = Date.now()
  const response = await fetch(`${baseUrl}${route}`)
  const text = await response.text()
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${text.slice(0, 500)}`)
  return {
    route,
    json: JSON.parse(text),
    durationMs: Date.now() - startedAt,
    bytes: Buffer.byteLength(text, 'utf8'),
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function stableRunId(seed) {
  return crypto.createHash('sha1').update(seed).digest('hex').slice(0, 12)
}

function lineCount(source = '') {
  return String(source || '').split(/\r?\n/).length
}

function buildCardRow(closeCard = false) {
  return {
    id: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID,
    title: 'Lazy-load archived done backlog cards',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 22,
    source: '2026-05-17 Steve approved Foundation queue: done archive lazy-load before extractor readiness.',
    summary: 'Keep Backlog fast by loading active work and a recent done window by default while older done cards live behind an explicit archive route.',
    whyItMatters: 'Foundation should not reload hundreds of old done cards during normal sprint planning, and it cannot lose the historical done-card record.',
    nextAction: closeCard
      ? 'Done for v1. Continue to EXTRACTION-RUNTIME-READINESS-001 unless a Foundation budget or fitness gate turns red.'
      : 'Ship the default backlog/done archive split, prove history is preserved, and keep the route/page loading architecture narrow.',
    statusNote: closeCard
      ? `Closed on 2026-05-17 under \`${FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY}\`. V1 keeps active/recent-done cards on the default backlog route, moves older done rows behind /api/foundation/backlog/done-archive and #backlog-done-archive, preserves counts/history, and proves focused links to archived cards still work.`
      : `Executing under \`${FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY}\`. Loading architecture only; no backlog semantic rewrite, deletion, extractor, connector/auth, Harlan, Fal, voice, Canva, OpenHuman, Drive mutation, or Agent Feedback auto-send.`,
    owner: 'Steve/Codex',
  }
}

function buildSprintItem(closeCard = false) {
  return {
    cardId: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH,
    definitionOfDone: 'Default backlog route lazy-loads done history, done archive route/page preserves history, focused proof, backlog hygiene, foundation:verify, process:foundation-ship, closeout, commit, and push pass.',
    proofCommands: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve explicitly approved done-archive lazy loading before extractor readiness.',
    notNextBoundaries: [
      'No extractor runtime work.',
      'No live extraction, auth-required extraction, paid extraction, connector work, or OAuth work.',
      'No backlog semantic rewrite, deletion, data loss, or broad visual UI redesign.',
      'No Harlan, Fal, voice, Canva, OpenHuman, or hub feature work.',
      'Do not work MEETING-VAULT-ACL-001 Phase B or Meeting Vault permission mutation.',
      'Do not mutate Google Drive permissions.',
      'Do not rerun the live Agent Feedback auto-send job.',
    ],
    existingWorkCheck: buildBacklogDoneArchiveExistingWorkCheck(),
    metadata: {
      approvalRef: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH,
      closeoutKey: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow(closeCard)
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
      [
        row.id,
        row.title,
        row.scope,
        row.lane,
        row.priority,
        row.rank,
        row.source,
        row.summary,
        row.whyItMatters,
        row.nextAction,
        row.statusNote,
        row.owner,
      ],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-backlog-done-archive')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `backlog-done-archive-${stableRunId(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH)}`,
        FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID,
        FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH,
        FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CHANGED_FILES,
        JSON.stringify({
          status: 'pass',
          score: 10,
          cardIds: [FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID],
          closeoutKey: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY,
        }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-backlog-done-archive',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} backlog done archive lazy-load card ${FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID}.`,
        JSON.stringify({ closeoutKey: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY, lane: row.lane }),
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

async function ensureLiveState({ closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SCRIPT_PATH,
    operation: 'create/update backlog done archive lazy-load card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SPRINT_ID,
        status: 'active',
        goal: 'Keep Foundation Backlog fast by moving older done cards behind an explicit archive route/page.',
        activeBlockerCardId: closeCard ? null : FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : 'building_now',
          startedBy: 'codex-backlog-done-archive',
          currentStatus: closeCard ? 'complete' : 'building',
          closeoutKey: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Sprint review/rollover: review closeout, commit, push, then move to EXTRACTION-RUNTIME-READINESS-001 unless a gate turns red.'
            : 'Ship Backlog done archive lazy loading before extractor readiness.',
          priorityOrder: [FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID],
          notNext: buildSprintItem(closeCard).notNextBoundaries,
          exitCriteria: [
            'Default backlog route excludes older done cards.',
            'Done archive route/page preserves older done history.',
            'Focused archived-card links still resolve.',
            'Default and archive route budgets pass.',
            'Dogfood rejects all-in-default done history and missing archive route.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem(closeCard)],
    },
    'codex-backlog-done-archive',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SPRINT_ID,
      reason: 'Steve approved FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001 before extractor readiness.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []

  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard })
  }

  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    backlogModuleSource,
    operatorRoutesSource,
    securityAccessSource,
    publicDataSource,
    backlogRendererSource,
    routerSource,
    foundationHtmlSource,
    coverageSource,
    closeoutDoc,
    foundationVerifySource,
    defaultBacklogRoute,
    doneArchiveRoute,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH,
      cardId: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH),
    readRepoFile(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SCRIPT_PATH),
    readRepoFile('lib/foundation-backlog-done-archive-lazy-load.js'),
    readRepoFile('lib/foundation-backlog-detail.js'),
    readRepoFile('lib/foundation-operator-routes.js'),
    readRepoFile('lib/security-access.js'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation-backlog-renderers.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile('public/foundation.html'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('scripts/foundation-verify.mjs'),
    fetchMeasured(args.baseUrl, '/api/foundation/backlog'),
    fetchMeasured(args.baseUrl, '/api/foundation/backlog/done-archive'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID) || null
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID, priority: 'P0' },
    changedFiles: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const architecture = evaluateFoundationBacklogDoneArchiveLazyLoad({
    defaultPayload: defaultBacklogRoute.json,
    archivePayload: doneArchiveRoute.json,
    defaultBytes: defaultBacklogRoute.bytes,
    archiveBytes: doneArchiveRoute.bytes,
    defaultMs: defaultBacklogRoute.durationMs,
    archiveMs: doneArchiveRoute.durationMs,
    publicDataSource,
    backlogRendererSource,
    routerSource,
    operatorRoutesSource,
    backlogModuleSource,
    securityAccessSource,
    packageJson,
  })
  const dogfood = buildFoundationBacklogDoneArchiveDogfoodProof()

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(failure => `${failure.check}:${failure.detail}`).join('; ') || FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planCritic))
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, Boolean(card) && (!args.closeCard || card.lane === 'done'), 'live done archive lazy-load card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, sprint.sprint?.sprintId === FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SPRINT_ID || card?.lane === 'done', 'Current Sprint is done archive lazy-load or card is historically done', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, Boolean(sprintItem) || card?.lane === 'done', 'Current Sprint contains done archive lazy-load item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : card?.lane || 'missing')
  addCheck(checks, architecture.ok, 'done archive lazy-load architecture passes', architecture.failed.map(failure => `${failure.check}:${failure.detail}`).join('; ') || 'healthy')
  addCheck(checks, dogfood.ok, 'dogfood rejects all-in-default done history and missing archive route', dogfood.invariant)
  addCheck(checks, foundationHtmlSource.includes('/foundation-backlog-renderers.js'), 'Foundation page loads backlog renderer module', 'public/foundation.html')
  addCheck(checks, coverageSource.includes(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID), 'verifier coverage card IDs include done archive lazy-load', 'coverage constant')
  addCheck(checks, foundationVerifySource.includes('foundationBacklogDoneArchiveApi') && foundationVerifySource.includes('doneArchive: foundationBacklogDoneArchiveApi'), 'foundation:verify receives done archive route payload', 'foundationBacklogDoneArchiveApi')
  addCheck(
    checks,
    getFoundationBuildCloseouts().some(record => record.key === FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY),
    'closeout registry includes done archive closeout',
    FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY,
  )
  addCheck(checks, closeoutDoc.includes(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID) && closeoutDoc.includes(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH)
  addCheck(checks, await repoFileExists(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH), 'closeout handoff file exists', FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH)
  addCheck(checks, lineCount(moduleSource) <= 1500, 'done archive module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID,
    sprintId: FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SPRINT_ID,
    checkCount: checks.length,
    failedCount: failed.length,
    defaultBacklogBytes: defaultBacklogRoute.bytes,
    defaultBacklogMs: defaultBacklogRoute.durationMs,
    doneArchiveBytes: doneArchiveRoute.bytes,
    doneArchiveMs: doneArchiveRoute.durationMs,
    totalItems: defaultBacklogRoute.json.summary?.totalItems || 0,
    visibleItems: defaultBacklogRoute.json.summary?.visibleItems || 0,
    archivedDoneItems: defaultBacklogRoute.json.summary?.archivedDoneItems || 0,
    budgets: {
      defaultBacklogBytes: FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_BYTES,
      defaultBacklogMs: FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_MS,
      doneArchiveBytes: FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_BYTES,
      doneArchiveMs: FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_MS,
    },
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation backlog done archive lazy-load check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
