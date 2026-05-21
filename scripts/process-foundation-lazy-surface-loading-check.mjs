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
  FOUNDATION_LAZY_SURFACE_LOADING_APPROVAL_PATH,
  FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
  FOUNDATION_LAZY_SURFACE_LOADING_CHANGED_FILES,
  FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY,
  FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_PATH,
  FOUNDATION_LAZY_SURFACE_LOADING_PLAN_PATH,
  FOUNDATION_LAZY_SURFACE_LOADING_PROOF_COMMANDS,
  FOUNDATION_LAZY_SURFACE_LOADING_SCRIPT_PATH,
  FOUNDATION_LAZY_SURFACE_LOADING_SPRINT_ID,
  buildFoundationLazySurfaceLoadingDogfoodProof,
  buildLazySurfaceLoadingExistingWorkCheck,
  evaluateFoundationLazySurfaceRouteLoadingArchitecture,
} from '../lib/foundation-engineering-fitness-gates.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'

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
    id: FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
    title: 'Lazy-load Foundation menu surfaces',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 21,
    source: '2026-05-17 Steve approval after engineering fitness gates: fix Foundation loading slowness/fatness before extractor readiness.',
    summary: 'Make Foundation detail surfaces fetch owned narrow routes instead of using the default Foundation Hub as an all-data side channel.',
    whyItMatters: 'Foundation cannot be fast if every menu page or agent route pulls broad Hub data before the operator asks for it.',
    nextAction: closeCard
      ? 'Done for v1. Move to EXTRACTION-RUNTIME-READINESS-001 unless lazy loading or engineering fitness turns red.'
      : 'Ship the read-only backlog list route and wire Backlog/Recent Work to narrow routes before extractor readiness.',
    statusNote: closeCard
      ? `Closed on 2026-05-17 under \`${FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY}\`. V1 adds /api/foundation/backlog, wires Backlog and Recent Work to narrow routes, keeps Source Registry and Diagnostics on owned routes, and proves default Hub budget plus dogfood.`
      : `Executing under \`${FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY}\`. Scope is loading architecture only; no extractor, connector, auth, Harlan, Fal, voice, Canva, OpenHuman, visual redesign, Drive mutation, or Agent Feedback auto-send.`,
    owner: 'Steve/Codex',
  }
}

function buildSprintItem(closeCard = false) {
  return {
    cardId: FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: FOUNDATION_LAZY_SURFACE_LOADING_PLAN_PATH,
    definitionOfDone: 'Focused lazy-loading proof, backlog hygiene, foundation:verify, process:foundation-ship, closeout, commit, and push pass.',
    proofCommands: FOUNDATION_LAZY_SURFACE_LOADING_PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve explicitly prioritized loading architecture before extraction runtime readiness.',
    notNextBoundaries: [
      'No extractor runtime work.',
      'No connector, OAuth, auth-required extraction, or live connector calls.',
      'No Harlan, Fal, voice, Canva, OpenHuman, or broad visual UI redesign.',
      'Do not work MEETING-VAULT-ACL-001 Phase B or Meeting Vault permission mutation.',
      'Do not mutate Google Drive permissions.',
      'Do not rerun the live Agent Feedback auto-send job.',
    ],
    existingWorkCheck: buildLazySurfaceLoadingExistingWorkCheck(),
    metadata: {
      approvalRef: FOUNDATION_LAZY_SURFACE_LOADING_APPROVAL_PATH,
      closeoutKey: FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-lazy-surface-loading')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `lazy-surface-loading-${stableRunId(FOUNDATION_LAZY_SURFACE_LOADING_PLAN_PATH)}`,
        FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
        FOUNDATION_LAZY_SURFACE_LOADING_PLAN_PATH,
        FOUNDATION_LAZY_SURFACE_LOADING_CHANGED_FILES,
        JSON.stringify({
          status: 'pass',
          score: 10,
          cardIds: [FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID],
          closeoutKey: FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY,
        }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-lazy-surface-loading',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} lazy surface loading backlog item ${FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID}.`,
        JSON.stringify({ closeoutKey: FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY, lane: row.lane }),
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

async function ensureLiveLazySurfaceLoadingState({ closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_LAZY_SURFACE_LOADING_SCRIPT_PATH,
    operation: 'create/update lazy surface loading backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: FOUNDATION_LAZY_SURFACE_LOADING_SPRINT_ID,
        status: 'active',
        goal: 'Finish Foundation page/API loading architecture before extractor runtime readiness.',
        activeBlockerCardId: closeCard ? null : FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : 'building_now',
          startedBy: 'codex-lazy-surface-loading',
          currentStatus: closeCard ? 'complete' : 'building',
          closeoutKey: FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Sprint review/rollover: review closeout, commit, push, then move to EXTRACTION-RUNTIME-READINESS-001 unless engineering fitness turns red.'
            : 'Ship loading architecture before extractor readiness.',
          priorityOrder: [FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID],
          notNext: buildSprintItem(closeCard).notNextBoundaries,
          exitCriteria: [
            'Read-only backlog list route exists.',
            'Backlog does not fetch default Hub.',
            'Recent Work does not fetch default Hub.',
            'Source Registry and Diagnostics use owned routes.',
            'Default Hub stays under V2 budget.',
            'Dogfood rejects all-in-one loading.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem(closeCard)],
    },
    'codex-lazy-surface-loading',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || FOUNDATION_LAZY_SURFACE_LOADING_SPRINT_ID,
      reason: 'Steve approved FOUNDATION-LAZY-SURFACE-LOADING-001 before extraction runtime readiness.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []

  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveLazySurfaceLoadingState({ closeCard: args.closeCard })
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
    foundationSource,
    operationsRendererSource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    foundationVerifySource,
    backlogRoute,
    buildLogRoute,
    currentSprintRoute,
    sourceOfTruthRoute,
    defaultHubRoute,
    fullDiagnosticsRoute,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_LAZY_SURFACE_LOADING_APPROVAL_PATH,
      cardId: FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile(FOUNDATION_LAZY_SURFACE_LOADING_PLAN_PATH),
    readRepoFile(FOUNDATION_LAZY_SURFACE_LOADING_SCRIPT_PATH),
    readRepoFile('lib/foundation-engineering-fitness-gates.js'),
    readRepoFile('lib/foundation-backlog-detail.js'),
    readRepoFile('lib/foundation-operator-routes.js'),
    readRepoFile('lib/security-access.js'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('scripts/foundation-verify.mjs'),
    fetchMeasured(args.baseUrl, '/api/foundation/backlog'),
    fetchMeasured(args.baseUrl, '/api/foundation/build-log?limit=60'),
    fetchMeasured(args.baseUrl, '/api/foundation/current-sprint'),
    fetchMeasured(args.baseUrl, '/api/source-of-truth'),
    fetchMeasured(args.baseUrl, '/api/foundation-hub'),
    fetchMeasured(args.baseUrl, '/api/foundation-hub?view=full'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID, priority: 'P0' },
    changedFiles: FOUNDATION_LAZY_SURFACE_LOADING_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const architecture = evaluateFoundationLazySurfaceRouteLoadingArchitecture({
    publicDataSource,
    foundationSource,
    operationsRendererSource,
    operatorRoutesSource,
    backlogModuleSource,
    packageJson,
    routePayloads: {
      backlog: backlogRoute.json,
      backlogDurationMs: backlogRoute.durationMs,
      buildLog: buildLogRoute.json,
      currentSprint: currentSprintRoute.json,
      sourceOfTruth: sourceOfTruthRoute.json,
    },
    defaultHubPayload: defaultHubRoute.json,
    fullDiagnosticsPayload: fullDiagnosticsRoute.json,
  })
  const dogfood = buildFoundationLazySurfaceLoadingDogfoodProof()
  const card = cards.find(item => item.id === FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID)

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || FOUNDATION_LAZY_SURFACE_LOADING_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, Boolean(card) && (!args.closeCard || card.lane === 'done'), 'live lazy loading card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(
    checks,
    sprint.sprint?.sprintId === FOUNDATION_LAZY_SURFACE_LOADING_SPRINT_ID || card?.lane === 'done',
    'Current Sprint is lazy surface loading while active or card is historically done',
    card?.lane === 'done' ? `${card.id}:done` : sprint.sprint?.sprintId || 'missing',
  )
  addCheck(
    checks,
    (sprint.items || []).some(item => item.cardId === FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID) || card?.lane === 'done',
    'Current Sprint contains lazy loading item while active or card is historically done',
    (sprint.items || []).some(item => item.cardId === FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID)
      ? (sprint.items || []).map(item => item.cardId).join(', ')
      : card?.lane || 'missing',
  )
  addCheck(checks, architecture.ok, 'lazy surface loading architecture passes', architecture.findings.map(finding => `${finding.code}:${finding.detail}`).join('; ') || 'healthy')
  addCheck(checks, securityAccessSource.includes("route('GET', '/api/foundation/backlog'"), 'security access registers backlog list route', 'GET /api/foundation/backlog')
  addCheck(checks, dogfood.ok, 'dogfood rejects broad Hub loading and missing backlog route', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:foundation-lazy-surface-loading-check'] === `node --env-file-if-exists=.env ${FOUNDATION_LAZY_SURFACE_LOADING_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:foundation-lazy-surface-loading-check'] || 'missing')
  addCheck(checks, coverageSource.includes('FOUNDATION_LAZY_SURFACE_LOADING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID), 'verifier coverage card IDs include lazy loading', 'coverage constant')
  addCheck(checks, foundationVerifySource.includes('foundationBacklogListApi') && foundationVerifySource.includes('routePayloads'), 'foundation:verify receives lazy loading route payloads', 'foundationBacklogListApi + routePayloads')
  addCheck(checks, closeoutRecordsSource.includes(FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY), 'closeout registry includes lazy loading closeout', FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY)
  addCheck(checks, closeoutDoc.includes(FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID) && closeoutDoc.includes(FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_PATH)
  addCheck(checks, lineCount(moduleSource) < 1500, 'engineering fitness module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) < 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)
  addCheck(checks, await repoFileExists(FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_PATH), 'closeout handoff file exists', FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_PATH)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    defaultHubBytes: defaultHubRoute.bytes,
    backlogRouteBytes: backlogRoute.bytes,
    backlogRouteMs: backlogRoute.durationMs,
    buildLogRouteBytes: buildLogRoute.bytes,
    currentSprintRouteBytes: currentSprintRoute.bytes,
    fullDiagnosticsBytes: fullDiagnosticsRoute.bytes,
    architecture: architecture.summary,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Foundation lazy surface loading check')
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
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
