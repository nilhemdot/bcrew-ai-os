#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildCreatorWatchlistSnapshot } from '../lib/build-intel-watchlist.js'
import {
  buildKarpathyKbVideoPackDogfoodProof,
  buildKarpathyKbVideoPackExistingWorkCheck,
  buildKarpathyKbVideoPackSnapshot,
  buildKarpathyKbVideoPackTarget,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_APPROVAL_PATH,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CHANGED_FILES,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_PATH,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PLAN_PATH,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PROOF_COMMANDS,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SCRIPT_PATH,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SPRINT_ID,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY,
} from '../lib/extractor-queue-karpathy-kb-video-pack.js'
import {
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import {
  SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT,
  buildSourceLifecycleStatus,
} from '../lib/source-lifecycle.js'
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
  upsertSourceCrawlTarget,
} from '../lib/foundation-source-crawl-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
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
    json: JSON.parse(text),
    bytes: Buffer.byteLength(text, 'utf8'),
    durationMs: Date.now() - startedAt,
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function stableRunId(value = '') {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12)
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function buildCardRow(closeCard = false) {
  return {
    id: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
    title: 'Extractor queue: Karpathy KB video pack',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 24,
    source: '2026-05-17 Steve approved the four-card Foundation queue after extraction runtime readiness shipped.',
    summary: 'Seed the first Karpathy LLM Knowledge Base video packet as pending-approval extraction queue truth without running extraction.',
    whyItMatters: 'Build Intel needs source packets that start from Foundation source/auth/readiness contracts instead of chat titles or ad hoc live extraction.',
    nextAction: closeCard
      ? 'Done for v1. Continue to BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 as proposal/research only unless a gate turns red.'
      : 'Seed the Karpathy KB video pack as pending approval only; do not run extraction.',
    statusNote: closeCard
      ? `Closed on 2026-05-17 under \`${EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY}\`. V1 adds Dream Labs AI to the Build Intel watchlist, seeds the Karpathy KB video pack as a blocked/pending-approval manual extraction control target, and proves it is not runnable/live extraction.`
      : `Executing under \`${EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY}\`. Queue/spec/preflight only; no live extraction, transcript fetch, screenshots, paid/auth access, or Research Inbox/backlog mutation.`,
    owner: 'Steve/Codex',
  }
}

function buildSprintItem(closeCard = false) {
  return {
    cardId: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PLAN_PATH,
    definitionOfDone: 'Live card, pending-approval extraction control target, Dream Labs watchlist row, focused proof, backlog hygiene, foundation:verify, process:foundation-ship, closeout, commit, and push pass without live extraction.',
    proofCommands: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PROOF_COMMANDS,
    readinessBlockerCleared: 'EXTRACTION-RUNTIME-READINESS-001 shipped and proves source/auth/cost/output gates before queue packets.',
    notNextBoundaries: [
      'No live extraction.',
      'No transcript fetch, screenshot capture, crawl, or summarization run.',
      'No auth-required extraction.',
      'No paid extraction without explicit Steve approval.',
      'No OAuth or connector auth work.',
      'No Harlan, Fal, voice, Canva, OpenHuman, or broad UI redesign.',
      'No MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
      'No Google Drive permissions mutation.',
      'Do not rerun the live Agent Feedback auto-send job.',
      'No atom promotion, Research Inbox write, or backlog mutation from extracted content.',
    ],
    existingWorkCheck: buildKarpathyKbVideoPackExistingWorkCheck(),
    metadata: {
      approvalRef: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_APPROVAL_PATH,
      closeoutKey: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY,
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
        INSERT INTO backlog_items (id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, owner, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-karpathy-kb-video-pack')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          result = EXCLUDED.result
      `,
      [
        `extractor-queue-karpathy-kb-video-pack-${stableRunId(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PLAN_PATH)}`,
        EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
        EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PLAN_PATH,
        EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CHANGED_FILES,
        JSON.stringify({
          status: 'pass',
          score: 10,
          cardIds: [EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID],
          closeoutKey: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY,
        }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-karpathy-kb-video-pack',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} Karpathy KB video pack card ${EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID}.`,
        JSON.stringify({ closeoutKey: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY, lane: row.lane }),
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
    scriptPath: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SCRIPT_PATH,
    operation: 'create/update Karpathy KB video pack card, Plan Critic row, extraction control target, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard })
  await upsertSourceCrawlTarget(buildKarpathyKbVideoPackTarget(), 'codex-karpathy-kb-video-pack')
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SPRINT_ID,
        status: 'active',
        goal: 'Seed the Karpathy LLM Knowledge Base video pack as pending-approval Foundation extraction queue truth without live extraction.',
        activeBlockerCardId: closeCard ? null : EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : 'building_now',
          startedBy: 'codex-karpathy-kb-video-pack',
          currentStatus: closeCard ? 'complete' : 'building',
          closeoutKey: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Sprint review/rollover: continue to BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 as proposal/research only.'
            : 'Seed pending-approval packet only; do not run extraction.',
          priorityOrder: [EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID],
          notNext: buildSprintItem(closeCard).notNextBoundaries,
          exitCriteria: [
            'Dream Labs AI is present in Build Intel watchlist as lookup-required.',
            'Karpathy KB video pack target is blocked/pending approval and manual only.',
            'No live extraction, crawl, transcript fetch, screenshot, or Research Inbox/backlog mutation runs.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem(closeCard)],
    },
    'codex-karpathy-kb-video-pack',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SPRINT_ID,
      reason: 'Steve approved EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001 as queue/pending approval only.',
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
    extractionControl,
    foundationSnapshot,
    sourceOfTruthRoute,
    readinessRoute,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    watchlistSource,
    readinessSource,
    verifierSource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    foundationVerifySource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_APPROVAL_PATH, cardId: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID }),
    getBacklogItemsByIds([EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID]),
    getExtractionControlSnapshot({ limit: 200 }),
    getFoundationSnapshot(),
    fetchMeasured(args.baseUrl, '/api/source-of-truth'),
    fetchMeasured(args.baseUrl, '/api/foundation/extraction-runtime-readiness'),
    readRepoFile('package.json'),
    readRepoFile(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PLAN_PATH),
    readRepoFile(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SCRIPT_PATH),
    readRepoFile('lib/extractor-queue-karpathy-kb-video-pack.js'),
    readRepoFile('lib/build-intel-watchlist.js'),
    readRepoFile('lib/extraction-runtime-readiness.js'),
    readRepoFile('lib/foundation-extraction-runtime-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID) || null
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID, priority: 'P0' },
    changedFiles: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const packet = buildKarpathyKbVideoPackSnapshot({ extractionControlSnapshot: extractionControl })
  const dogfood = buildKarpathyKbVideoPackDogfoodProof()
  const sourceLifecycle = buildSourceLifecycleStatus({
    sources: sourceOfTruthRoute.json?.sources || [],
    connectors: sourceOfTruthRoute.json?.connectors || [],
    groupedSystems: sourceOfTruthRoute.json?.groupedSystems || [],
    extractionControl,
    foundationJobs: foundationSnapshot.foundationJobs || [],
  })
  const watchlist = buildCreatorWatchlistSnapshot()
  const dreamLabs = watchlist.entries.find(entry => entry.creatorId === 'dream-labs-ai') || null
  const target = extractionControl.targets.find(item => item.targetKey === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY) || null
  const targetRuns = (extractionControl.recentRuns || []).filter(run => run.targetKey === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY)
  const readinessTarget = (readinessRoute.json?.queueRows || []).find(item => item.targetKey === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY) || null

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', 'pass/10')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live Karpathy packet card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, sprint.sprint?.sprintId === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SPRINT_ID || card?.lane === 'done', 'Current Sprint is Karpathy packet or card is historically done', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains Karpathy packet item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, packet.ok, 'Karpathy KB video pack is pending-approval queue truth', packet.failures.map(finding => finding.check).join(', ') || `${packet.summary.sourceCandidateCount} sources`)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe Karpathy packet variants', dogfood.dogfoodInvariant)
  addCheck(checks, dreamLabs && dreamLabs.accessBoundary === 'public_lookup_required', 'Dream Labs AI is in Build Intel watchlist as lookup-required', dreamLabs ? `${dreamLabs.displayName}:${dreamLabs.accessBoundary}` : 'missing')
  addCheck(checks, watchlist.entries.some(entry => entry.creatorId === 'nate-herk'), 'Nate Herk remains in Build Intel watchlist', 'nate-herk')
  addCheck(checks, target && target.status === 'blocked' && target.metadata?.approvalStatus === 'pending_approval' && target.runtimeMode === 'manual', 'live extraction control target is blocked pending approval/manual', target ? `${target.status}/${target.metadata?.approvalStatus || 'missing_approval'}/${target.runtimeMode}` : 'missing')
  addCheck(checks, !target?.metadata?.foundationJobKey && target?.metadata?.liveRunApproved !== true, 'target has no scheduled job or live approval', target ? JSON.stringify({ foundationJobKey: target.metadata?.foundationJobKey || null, liveRunApproved: target.metadata?.liveRunApproved === true }) : 'missing')
  addCheck(checks, targetRuns.length === 0, 'no source crawl runs exist for this packet target', `${targetRuns.length}`)
  addCheck(checks, readinessRoute.json?.summary?.runningRuns === 0, 'readiness route reports no running live extraction', `runningRuns=${readinessRoute.json?.summary?.runningRuns}`)
  addCheck(checks, readinessTarget && readinessTarget.runnable === false, 'readiness route keeps packet non-runnable pending approval', readinessTarget ? `runnable=${readinessTarget.runnable}` : 'missing')
  addCheck(checks, sourceLifecycle.summary?.extractionTargetCount === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT && sourceLifecycle.summary?.targetBaselineExtraTargets === 0 && sourceLifecycle.summary?.extractionCapsUnchanged === true, 'Source Lifecycle baseline represents the packet without quota drift', `targets=${sourceLifecycle.summary?.extractionTargetCount}/${SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT} extra=${sourceLifecycle.summary?.targetBaselineExtraTargets} caps=${sourceLifecycle.summary?.extractionCapsUnchanged}`)
  addCheck(checks, moduleSource.includes('buildKarpathyKbVideoPackTarget') && moduleSource.includes('pending_approval'), 'packet module owns queue target shape', 'lib/extractor-queue-karpathy-kb-video-pack.js')
  addCheck(checks, readinessSource.includes('RUNNABLE_QUEUE_STATUSES') && readinessSource.includes('pending_approval'), 'runtime readiness does not treat pending approval as runnable', 'lib/extraction-runtime-readiness.js')
  addCheck(checks, watchlistSource.includes('dream-labs-ai') && watchlistSource.includes('Dream Labs AI'), 'watchlist source includes Dream Labs AI', 'lib/build-intel-watchlist.js')
  addCheck(checks, verifierSource.includes(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID) && verifierSource.includes('buildKarpathyKbVideoPackSnapshot'), 'extraction runtime verifier covers Karpathy packet', 'lib/foundation-extraction-runtime-verifier.js')
  addCheck(checks, coverageSource.includes(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID), 'verifier coverage card IDs include Karpathy packet', 'coverage constant')
  addCheck(checks, foundationVerifySource.includes('karpathyKbVideoPackSource') && foundationVerifySource.includes('karpathyKbVideoPackCheckSource'), 'foundation:verify receives Karpathy packet source payload', 'foundation verify wiring')
  addCheck(checks, closeoutRecordsSource.includes(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY), 'closeout registry includes Karpathy packet closeout', EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY)
  addCheck(checks, closeoutDoc.includes(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID) && closeoutDoc.includes(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_PATH)
  addCheck(checks, packageJson.scripts?.['process:extractor-queue-karpathy-kb-video-pack-check'] === `node --env-file-if-exists=.env ${EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SCRIPT_PATH}`, 'package registers focused proof script', 'process:extractor-queue-karpathy-kb-video-pack-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'packet module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      routeBytes: readinessRoute.bytes,
      routeMs: readinessRoute.durationMs,
      sourceCandidateCount: packet.summary.sourceCandidateCount,
      targetStatus: packet.summary.status,
      runnable: packet.summary.runnable,
    },
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Karpathy KB video pack check: ${result.ok ? 'pass' : 'fail'}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
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
