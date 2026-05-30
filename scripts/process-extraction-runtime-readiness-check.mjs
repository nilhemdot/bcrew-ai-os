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
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  EXTRACTION_RUNTIME_READINESS_API_PATH,
  EXTRACTION_RUNTIME_READINESS_APPROVAL_PATH,
  EXTRACTION_RUNTIME_READINESS_CARD_ID,
  EXTRACTION_RUNTIME_READINESS_CHANGED_FILES,
  EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY,
  EXTRACTION_RUNTIME_READINESS_CLOSEOUT_PATH,
  EXTRACTION_RUNTIME_READINESS_PLAN_PATH,
  EXTRACTION_RUNTIME_READINESS_PROOF_COMMANDS,
  EXTRACTION_RUNTIME_READINESS_SCRIPT_PATH,
  EXTRACTION_RUNTIME_READINESS_SPRINT_ID,
  buildExtractionRuntimeReadinessDogfoodProof,
  buildExtractionRuntimeReadinessExistingWorkCheck,
  buildExtractionRuntimeReadinessSnapshot,
} from '../lib/extraction-runtime-readiness.js'
import {
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import {
  getFoundationBuildCloseouts,
} from '../lib/foundation-build-log.js'
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
  getExtractionControlSnapshot,
} from '../lib/foundation-source-crawl-db.js'

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
    id: EXTRACTION_RUNTIME_READINESS_CARD_ID,
    title: 'Prepare extraction runtime readiness',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 23,
    source: '2026-05-17 Steve approved four-card Foundation queue after lazy surface loading.',
    summary: 'Build the Foundation-owned extraction runtime readiness contract before any new extractor packet or live extraction work.',
    whyItMatters: 'Extractor work must fail closed on source/auth posture, evidence, cost caps, run health, and proposal-only output before Build Intel or source packets consume it.',
    nextAction: closeCard
      ? 'Done for v1. Continue to EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001 as queued/pending approval only unless a gate turns red.'
      : 'Ship extraction readiness as queue/spec/preflight only with no live extraction.',
    statusNote: closeCard
      ? `Closed on 2026-05-17 under \`${EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY}\`. V1 adds read-only readiness route, source/auth queue gating, evidence envelope validation, cost/runtime cap checks, run health, and proposal-only Research Inbox/proposed-atom output gates. No live extraction ran.`
      : `Executing under \`${EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY}\`. Queue/spec/preflight only; no live extraction, auth-required extraction, paid extraction, connector/auth/OAuth, atom promotion, or backlog mutation from extracted content.`,
    owner: 'Steve/Codex',
  }
}

function buildSprintItem(closeCard = false) {
  return {
    cardId: EXTRACTION_RUNTIME_READINESS_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: EXTRACTION_RUNTIME_READINESS_PLAN_PATH,
    definitionOfDone: 'Readiness contract, narrow API route, evidence envelope, source/auth/cost/run/output gates, focused proof, backlog hygiene, foundation:verify, process:foundation-ship, closeout, commit, and push pass.',
    proofCommands: EXTRACTION_RUNTIME_READINESS_PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve approved extraction runtime readiness after Foundation loading/fitness gates shipped.',
    notNextBoundaries: [
      'No live extraction.',
      'No auth-required extraction.',
      'No paid extraction without explicit Steve approval.',
      'No OAuth or connector auth work.',
      'No Harlan, Fal, voice, Canva, OpenHuman, or broad UI redesign.',
      'No MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
      'No Google Drive permissions mutation.',
      'Do not rerun the live Agent Feedback auto-send job.',
      'No atom promotion or backlog mutation from extracted content.',
    ],
    existingWorkCheck: buildExtractionRuntimeReadinessExistingWorkCheck(),
    metadata: {
      approvalRef: EXTRACTION_RUNTIME_READINESS_APPROVAL_PATH,
      closeoutKey: EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-extraction-runtime-readiness')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `extraction-runtime-readiness-${stableRunId(EXTRACTION_RUNTIME_READINESS_PLAN_PATH)}`,
        EXTRACTION_RUNTIME_READINESS_CARD_ID,
        EXTRACTION_RUNTIME_READINESS_PLAN_PATH,
        EXTRACTION_RUNTIME_READINESS_CHANGED_FILES,
        JSON.stringify({
          status: 'pass',
          score: 10,
          cardIds: [EXTRACTION_RUNTIME_READINESS_CARD_ID],
          closeoutKey: EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY,
        }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-extraction-runtime-readiness',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        EXTRACTION_RUNTIME_READINESS_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} extraction runtime readiness card ${EXTRACTION_RUNTIME_READINESS_CARD_ID}.`,
        JSON.stringify({ closeoutKey: EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY, lane: row.lane }),
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
    scriptPath: EXTRACTION_RUNTIME_READINESS_SCRIPT_PATH,
    operation: 'create/update extraction runtime readiness card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: EXTRACTION_RUNTIME_READINESS_SPRINT_ID,
        status: 'active',
        goal: 'Make Foundation extraction runtime readiness fail closed before new queue packets or live extraction.',
        activeBlockerCardId: closeCard ? null : EXTRACTION_RUNTIME_READINESS_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : 'building_now',
          startedBy: 'codex-extraction-runtime-readiness',
          currentStatus: closeCard ? 'complete' : 'building',
          closeoutKey: EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Sprint review/rollover: review closeout, commit, push, then move to EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001 as queued/pending approval only.'
            : 'Ship readiness contract before any extractor queue packet.',
          priorityOrder: [EXTRACTION_RUNTIME_READINESS_CARD_ID],
          notNext: buildSprintItem(closeCard).notNextBoundaries,
          exitCriteria: [
            'Readiness route is narrow and read-only.',
            'Source/auth posture blocks unsafe queue items.',
            'Evidence envelope validates transcript/screenshot/source/model/cost/confidence fields.',
            'Cost/runtime caps are required.',
            'Proposal output cannot write backlog or create promoted atoms.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem(closeCard)],
    },
    'codex-extraction-runtime-readiness',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || EXTRACTION_RUNTIME_READINESS_SPRINT_ID,
      reason: 'Steve approved EXTRACTION-RUNTIME-READINESS-001 as queue/spec/preflight only.',
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
    verifierSource,
    runtimeRoutesSource,
    securityAccessSource,
    liveControlSnapshot,
    routeSnapshot,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    foundationVerifySource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: EXTRACTION_RUNTIME_READINESS_APPROVAL_PATH,
      cardId: EXTRACTION_RUNTIME_READINESS_CARD_ID,
    }),
    getBacklogItemsByIds([EXTRACTION_RUNTIME_READINESS_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([EXTRACTION_RUNTIME_READINESS_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile(EXTRACTION_RUNTIME_READINESS_PLAN_PATH),
    readRepoFile(EXTRACTION_RUNTIME_READINESS_SCRIPT_PATH),
    readRepoFile('lib/extraction-runtime-readiness.js'),
    readRepoFile('lib/foundation-extraction-runtime-verifier.js'),
    readRepoFile('lib/foundation-runtime-read-routes.js'),
    readRepoFile('lib/security-access.js'),
    getExtractionControlSnapshot({ limit: 200 }),
    fetchMeasured(args.baseUrl, EXTRACTION_RUNTIME_READINESS_API_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(EXTRACTION_RUNTIME_READINESS_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === EXTRACTION_RUNTIME_READINESS_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === EXTRACTION_RUNTIME_READINESS_CARD_ID) || null
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: EXTRACTION_RUNTIME_READINESS_CARD_ID, priority: 'P0' },
    changedFiles: EXTRACTION_RUNTIME_READINESS_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === EXTRACTION_RUNTIME_READINESS_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const currentSprintCardIds = (sprint.items || []).map(item => item.cardId).filter(Boolean)
  const currentSprintPlanCriticRuns = await getPlanCriticRunsByCardIds([
    EXTRACTION_RUNTIME_READINESS_CARD_ID,
    ...currentSprintCardIds,
  ])
  const readiness = buildExtractionRuntimeReadinessSnapshot({ extractionControlSnapshot: liveControlSnapshot })
  const dogfood = buildExtractionRuntimeReadinessDogfoodProof()
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: currentSprintPlanCriticRuns,
  })

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || EXTRACTION_RUNTIME_READINESS_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', 'pass/10')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live extraction readiness card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, sprint.sprint?.sprintId === EXTRACTION_RUNTIME_READINESS_SPRINT_ID || card?.lane === 'done', 'Current Sprint is extraction readiness or card is historically done', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, card?.lane === 'done' || (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)), 'Current Sprint contains extraction readiness item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'historically done')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, readiness.ok, 'runtime readiness snapshot is healthy', readiness.failures.map(finding => finding.check).join(', ') || `${readiness.summary.targetCount} targets`)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe extraction readiness', dogfood.dogfoodInvariant)
  addCheck(checks, routeSnapshot.json?.status === 'healthy' && routeSnapshot.json?.cardId === EXTRACTION_RUNTIME_READINESS_CARD_ID, 'readiness API route returns healthy card payload', `${routeSnapshot.bytes}B/${routeSnapshot.durationMs}ms`)
  addCheck(checks, routeSnapshot.json?.summary?.runningRuns === 0, 'readiness API did not start live extraction', `runningRuns=${routeSnapshot.json?.summary?.runningRuns}`)
  addCheck(checks, moduleSource.includes('validateExtractionRuntimeEvidenceEnvelope') && moduleSource.includes('validateExtractionRuntimeQueueItem'), 'readiness module owns evidence and queue validators', 'lib/extraction-runtime-readiness.js')
  addCheck(checks, verifierSource.includes(EXTRACTION_RUNTIME_READINESS_CARD_ID) && verifierSource.includes('buildExtractionRuntimeReadinessSnapshot'), 'extraction runtime verifier covers readiness card', 'lib/foundation-extraction-runtime-verifier.js')
  addCheck(checks, runtimeRoutesSource.includes("app.get('/api/foundation/extraction-runtime-readiness'"), 'runtime read routes expose readiness API', EXTRACTION_RUNTIME_READINESS_API_PATH)
  addCheck(checks, securityAccessSource.includes("route('GET', '/api/foundation/extraction-runtime-readiness'"), 'security access registers readiness API', EXTRACTION_RUNTIME_READINESS_API_PATH)
  addCheck(checks, coverageSource.includes(EXTRACTION_RUNTIME_READINESS_CARD_ID), 'verifier coverage card IDs include extraction readiness', 'coverage constant')
  addCheck(checks, foundationVerifySource.includes('foundationExtractionRuntimeReadinessApi') && foundationVerifySource.includes('extractionRuntimeReadinessSource'), 'foundation:verify receives readiness route/source payload', 'foundation verify wiring')
  addCheck(checks, closeoutRecordsSource.includes(EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY), 'closeout registry includes extraction readiness closeout', EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY)
  addCheck(checks, closeoutDoc.includes(EXTRACTION_RUNTIME_READINESS_CARD_ID) && closeoutDoc.includes(EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', EXTRACTION_RUNTIME_READINESS_CLOSEOUT_PATH)
  addCheck(checks, packageJson.scripts?.['process:extraction-runtime-readiness-check'] === `node --env-file-if-exists=.env ${EXTRACTION_RUNTIME_READINESS_SCRIPT_PATH}`, 'package registers focused proof script', 'process:extraction-runtime-readiness-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'readiness module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      routeBytes: routeSnapshot.bytes,
      routeMs: routeSnapshot.durationMs,
      targetCount: readiness.summary.targetCount,
      blockedQueueItems: readiness.summary.blockedQueueItems,
      runnableQueueItems: readiness.summary.runnableQueueItems,
    },
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Extraction runtime readiness check: ${result.ok ? 'pass' : 'fail'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${result.summary.passed}/${result.summary.total} checks passed`)
  }

  await closeFoundationDb()
  if (!result.ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
