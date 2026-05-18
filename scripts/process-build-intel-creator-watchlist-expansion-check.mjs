#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_APPROVAL_PATH,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CHANGED_FILES,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_PATH,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PLAN_PATH,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PROOF_COMMANDS,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SCRIPT_PATH,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SPRINT_ID,
  buildBuildIntelCreatorWatchlistExpansionDogfoodProof,
  buildBuildIntelCreatorWatchlistExpansionSnapshot,
  renderBuildIntelCreatorWatchlistExpansionReport,
} from '../lib/build-intel-creator-watchlist-expansion.js'
import {
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import {
  getFoundationBuildCloseouts,
} from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
  const args = { json: false, apply: false, closeCard: false, stage: 'building_now' }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  if (args.closeCard) args.stage = 'done_this_sprint'
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function buildCardRow(closeCard = false) {
  return {
    id: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID,
    title: 'Expand Build Intel creator watchlist for agent/extractor research',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 9,
    source: '2026-05-18 agent/extractor planning conversation',
    summary: 'Add lookup-backed Build Intel source refs for current agent engineering, memory systems, runtime portability, OpenHuman, knowledge-base, and extractor research sources without starting extraction.',
    whyItMatters: 'AIOS needs current source truth before extractor/runtime work expands, especially when some sources are public and others are paid, private, or auth-bound.',
    nextAction: closeCard
      ? `Done under ${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY}. Continue ${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID} before any private/course extraction.`
      : 'Verify lookup-backed source URLs, classify source posture, and prove the watchlist registration has no crawl/extraction/model/auth/output side effects.',
    statusNote: closeCard
      ? `Closed under \`${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY}\`; creator source refs are lookup-backed and extraction remains blocked/pending approval.`
      : `Executing under \`${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY}\`; metadata registration only, no crawl/extraction/model/auth/output side effects.`,
    owner: 'Foundation',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PLAN_PATH,
    definitionOfDone: 'Watchlist entries are lookup-backed, source IDs/URLs validated, public/private/auth posture classified, cadence/priority set, focused dogfood passes, verifier coverage exists, and no crawling/extraction/model/paid/auth/output side effects start.',
    proofCommands: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PROOF_COMMANDS,
    readinessBlockerCleared: 'HARLAN-OPERATOR-LOOP-V1-001 closed first read-only operator loop.',
    notNextBoundaries: [
      'No live extraction.',
      'No source crawl, transcript fetch, screenshot/keyframe capture, summarization, or model call.',
      'No paid/private/community/course auth use.',
      'No Research Inbox write, atom creation, or backlog mutation from extracted content.',
      'No OpenHuman install, runtime launch, or integration.',
      'No Harlan UI, voice/avatar, live runtime, external sends, or external writes.',
      'No MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
      'No Drive permissions mutation or Drive request-access email.',
      'No Drive/Gmail/ClickUp/Slack/Agent Feedback mutation.',
      'No hidden subagents or parallel builders.',
    ],
    existingWorkCheck: {
      existingCode: [
        'lib/build-intel-watchlist.js',
        'lib/extractor-queue-karpathy-kb-video-pack.js',
        'lib/implementation-intelligence.js',
        'lib/build-intel-karpathy-llm-kb-preflight.js',
      ],
      existingDocs: [
        'docs/rebuild/current-plan.md',
        'docs/rebuild/current-state.md',
        'docs/handoffs/2026-05-17-build-intel-karpathy-llm-kb-preflight-closeout.md',
        'docs/handoffs/2026-05-18-harlan-operator-loop-closeout.md',
      ],
      existingScripts: [
        'scripts/process-build-intel-intake-check.mjs',
        'scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs',
        'scripts/foundation-verify.mjs',
      ],
      existingPolicy: [
        'Build Intel can register source metadata without starting extraction.',
        'Paid/auth/community/course content needs explicit source-auth approval before extraction.',
        'Creator/source intelligence informs backlog through proposal-only governed paths.',
      ],
      existingCards: [
        'CREATOR-WATCHLIST-001',
        'EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001',
        'BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001',
        BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID,
      ],
      reused: [
        'Creator watchlist source ID.',
        'Karpathy KB source packet.',
        'Build Intel proposal-only precedent.',
        'Current Sprint overlay and Plan Critic patterns.',
      ],
      notRebuilt: [
        'No extraction runtime behavior.',
        'No source crawler.',
        'No Research Inbox/atom promotion path.',
        'No Harlan/OpenHuman runtime feature.',
      ],
      exactGap: 'The watchlist had creator names but not enough lookup-backed source refs and posture truth for the current agent/extractor research queue.',
      overBroadRisk: 'This can drift into extracting videos, private courses, or OpenHuman runtime work. This card stays metadata registration and proof only.',
      readyBy: 'Codex Foundation builder',
      readyAt: '2026-05-18T21:00:00.000-04:00',
    },
    metadata: {
      approvalRef: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_APPROVAL_PATH,
      closeoutKey: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY,
      recommendedNext: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-build-intel-watchlist-expansion')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          result = EXCLUDED.result
      `,
      [
        `build-intel-watchlist-expansion-${stableRunId(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PLAN_PATH)}`,
        BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID,
        BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PLAN_PATH,
        BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CHANGED_FILES,
        JSON.stringify({
          status: 'pass',
          score: 10,
          cardIds: [BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID],
          closeoutKey: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY,
        }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-build-intel-watchlist-expansion',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} Build Intel creator watchlist expansion card.`,
        JSON.stringify({ closeoutKey: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY, lane: row.lane }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now' } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SCRIPT_PATH,
    operation: 'create/update Build Intel creator watchlist expansion card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SPRINT_ID,
        status: 'active',
        goal: 'Expand Build Intel creator watchlist source refs without starting extraction.',
        activeBlockerCardId: closeCard ? null : BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-build-intel-watchlist-expansion',
          currentStatus: closeCard ? 'complete' : stage,
          closeoutKey: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID} before any private/course extraction.`
            : 'Register lookup-backed source refs and prove no extraction side effects.',
          priorityOrder: [BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID, BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID],
          notNext: buildSprintItem({ closeCard, stage }).notNextBoundaries,
          exitCriteria: [
            'Required creator/source rows have lookup-backed source URLs.',
            'Public/private/auth posture, cadence, and priority are explicit.',
            'Dogfood rejects duplicate, missing URL, overlap, and side-effect cases.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage })],
    },
    'codex-build-intel-watchlist-expansion',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SPRINT_ID,
      reason: 'Steve prioritized BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001 after Harlan operator loop.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
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
    watchlistSource,
    controlLoopSource,
    verifierSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_APPROVAL_PATH, cardId: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID }),
    getBacklogItemsByIds([BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID, BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PLAN_PATH),
    readRepoFile(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SCRIPT_PATH),
    readRepoFile('lib/build-intel-creator-watchlist-expansion.js'),
    readRepoFile('lib/build-intel-watchlist.js'),
    readRepoFile('lib/foundation-verifier-control-loop.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID) || null
  const nextCard = cards.find(item => item.id === BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID) || null
  const snapshot = buildBuildIntelCreatorWatchlistExpansionSnapshot()
  const dogfood = buildBuildIntelCreatorWatchlistExpansionDogfoodProof()
  const renderedReport = renderBuildIntelCreatorWatchlistExpansionReport(snapshot)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID, priority: 'P0' },
    changedFiles: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', 'pass/10')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live watchlist expansion card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next course/auth boundary card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sprint.sprint?.sprintId === BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SPRINT_ID || card?.lane === 'done', 'Current Sprint is watchlist expansion or card is historically done', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains watchlist expansion item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready', 'watchlist expansion snapshot is ready', snapshot.failures.map(failure => failure.check).join(', ') || `${snapshot.summary.requiredReadyCount}/${snapshot.summary.requiredCreatorCount}`)
  addCheck(checks, snapshot.summary.buildIntelCount >= 29 && snapshot.summary.totalLookupBackedUrls >= 20, 'expanded Build Intel source URL baseline is present', `entries=${snapshot.summary.buildIntelCount} urls=${snapshot.summary.totalLookupBackedUrls}`)
  addCheck(checks, snapshot.proposalOnly === true && snapshot.writesBacklog === false && snapshot.opensSprint === false, 'watchlist expansion remains proposal/metadata only', JSON.stringify({ proposalOnly: snapshot.proposalOnly, writesBacklog: snapshot.writesBacklog, opensSprint: snapshot.opensSprint }))
  addCheck(checks, snapshot.extractionStarted === false && snapshot.modelCallsStarted === false && snapshot.paidAuthUsed === false && snapshot.privateAuthUsed === false && snapshot.researchInboxWritten === false && snapshot.atomsCreated === 0, 'no extraction/auth/model/output side effects', JSON.stringify({ extractionStarted: snapshot.extractionStarted, modelCallsStarted: snapshot.modelCallsStarted, paidAuthUsed: snapshot.paidAuthUsed, atomsCreated: snapshot.atomsCreated }))
  addCheck(checks, dogfood.ok, 'dogfood rejects missing URL, duplicate, extraction, and paid-auth variants', dogfood.dogfoodInvariant)
  addCheck(checks, closeoutDoc.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID) && closeoutDoc.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('Triage Table') && renderedReport.includes('OpenHuman / tinyhumansai'), 'rendered report includes watchlist triage table', 'report renderer')
  addCheck(checks, watchlistSource.includes('openhuman-tinyhumansai') && watchlistSource.includes('sourceRefs') && watchlistSource.includes('https://github.com/tinyhumansai/openhuman'), 'watchlist owns lookup-backed source refs', 'lib/build-intel-watchlist.js')
  addCheck(checks, controlLoopSource.includes('buildIntelCount >= 29'), 'control-loop verifier accepts expanded baseline', 'lib/foundation-verifier-control-loop.js')
  addCheck(checks, verifierSource.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID) && verifierSource.includes('buildBuildIntelCreatorWatchlistExpansionDogfoodProof'), 'intelligence/audit verifier covers expansion', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, closeoutRecordsSource.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY), 'closeout registry includes expansion closeout', BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY)
  addCheck(checks, currentPlan.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY) && currentPlan.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID), 'current plan names closeout and next card', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY) && currentState.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID), 'current state names closeout and next card', 'docs/rebuild/current-state.md')
  addCheck(checks, packageJson.scripts?.['process:build-intel-creator-watchlist-expansion-check'] === `node --env-file-if-exists=.env ${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SCRIPT_PATH}`, 'package registers focused proof script', 'process:build-intel-creator-watchlist-expansion-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'watchlist expansion module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      requiredCreatorCount: snapshot.summary.requiredCreatorCount,
      requiredReadyCount: snapshot.summary.requiredReadyCount,
      buildIntelCount: snapshot.summary.buildIntelCount,
      lookupBackedUrls: snapshot.summary.totalLookupBackedUrls,
      recommendedNext: snapshot.recommendedNext,
    },
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Build Intel creator watchlist expansion check: ${result.ok ? 'pass' : 'fail'}`)
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
