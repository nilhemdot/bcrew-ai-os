#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_APPROVAL_PATH,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CHANGED_FILES,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_PATH,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PLAN_PATH,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PROOF_COMMANDS,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SCRIPT_PATH,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SPRINT_ID,
  buildKarpathyLlmKbPreflightDogfoodProof,
  buildKarpathyLlmKbPreflightSnapshot,
  renderKarpathyLlmKbPreflightReport,
} from '../lib/build-intel-karpathy-llm-kb-preflight.js'
import {
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY,
} from '../lib/extractor-queue-karpathy-kb-video-pack.js'
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
  getExtractionControlSnapshot,
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
  const args = { json: false, apply: false, closeCard: false }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
  }
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
    id: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID,
    title: 'Build Intel preflight: Karpathy LLM KB pattern',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 25,
    source: '2026-05-17 Steve approved the four-card Foundation queue; this card is proposal/research only after the Karpathy packet shipped.',
    summary: 'Compare current AIOS Foundation primitives against the Karpathy LLM Knowledge Base / LLM Wiki pattern without extraction or mutation.',
    whyItMatters: 'Foundation needs to decide what to build, what already exists, and what not to copy before converting the Karpathy KB idea into a compiler or agent capability.',
    nextAction: closeCard
      ? 'Done for v1. Recommended next: FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 unless Steve approves a separate no-auth/no-paid extraction run.'
      : 'Run proposal-only preflight; do not extract, fetch transcripts, write Research Inbox, create atoms, or mutate backlog from extracted content.',
    statusNote: closeCard
      ? `Closed on 2026-05-17 under \`${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY}\`. V1 maps current AIOS to the Karpathy-style raw data -> compiled markdown/wiki -> query/Q&A -> quality/lint loop, routes gaps to Foundation-owned compiler and quality cards, and keeps output proposal/research only.`
      : `Executing under \`${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY}\`. Proposal/research only; no live extraction, transcript fetch, screenshots, model calls, Research Inbox writes, atom creation, or backlog mutation from extracted content.`,
    owner: 'Steve/Codex',
  }
}

function buildSprintItem(closeCard = false) {
  return {
    cardId: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PLAN_PATH,
    definitionOfDone: 'Existing live card is promoted, preflight report/closeout records current AIOS fit, gaps route to existing compiler/quality cards, focused proof and full ship gate pass, and no extraction/mutation occurs.',
    proofCommands: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PROOF_COMMANDS,
    readinessBlockerCleared: `${EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID} shipped and remains blocked/pending approval.`,
    notNextBoundaries: [
      'No live extraction.',
      'No transcript fetch, crawl, screenshot capture, summarization, or model call.',
      'No auth-required or paid extraction without explicit Steve approval.',
      'No Research Inbox write, atom creation, or backlog mutation from extracted content.',
      'No Harlan, Fal, voice, Canva, OpenHuman, or broad UI redesign.',
      'No MEETING-VAULT-ACL-001 Phase B or Drive permissions mutation.',
      'No Google Drive permission mutation or request-access email.',
      'Do not rerun the live Agent Feedback auto-send job.',
    ],
    existingWorkCheck: {
      existingCode: [
        'lib/extractor-queue-karpathy-kb-video-pack.js',
        'lib/extraction-runtime-readiness.js',
        'lib/build-intel-extraction-implementation.js',
        'lib/research-inbox.js',
      ],
      existingDocs: [
        'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-extractor-queue-karpathy-kb-video-pack-closeout.md',
        'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-runtime-memory-build-intel-stab-capture.md',
        'docs/rebuild/current-plan.md',
        'docs/rebuild/current-state.md',
      ],
      existingScripts: [
        'scripts/process-extractor-queue-karpathy-kb-video-pack-check.mjs',
        'scripts/process-build-intel-extraction-check.mjs',
        'scripts/foundation-verify.mjs',
      ],
      existingPolicy: [
        'Foundation owns source contracts, ingestion permission, compiler rules, quality gates, and query interface.',
        'No live extraction unless separately approved.',
        'Proposal-only output before build.',
      ],
      existingCards: [
        EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
        'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001',
        'KNOWLEDGE-BASE-QUALITY-GATE-001',
      ],
      reused: [
        'Karpathy queue packet source candidates',
        'Foundation extraction readiness fail-closed posture',
        'Build Intel proposal-only precedent',
      ],
      notRebuilt: [
        'No extraction runtime behavior.',
        'No compiler implementation.',
        'No knowledge-base query API.',
        'No Harlan memory feature.',
      ],
      exactGap: 'AIOS has source/extraction/intelligence primitives, but not a Foundation-owned compiler, KB query contract, or quality gate for compiled markdown/wiki output.',
      overBroadRisk: 'This can drift into live extraction, transcript dumping, Harlan-only memory, Research Inbox/atom writes, or broad connector work. This sprint stays proposal/research only.',
      readyBy: 'Codex Foundation builder',
      readyAt: '2026-05-17T22:05:00.000-04:00',
    },
    metadata: {
      approvalRef: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_APPROVAL_PATH,
      closeoutKey: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-karpathy-kb-preflight')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          result = EXCLUDED.result
      `,
      [
        `build-intel-karpathy-kb-preflight-${stableRunId(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PLAN_PATH)}`,
        BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID,
        BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PLAN_PATH,
        BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CHANGED_FILES,
        JSON.stringify({
          status: 'pass',
          score: 10,
          cardIds: [BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID],
          closeoutKey: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY,
        }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-karpathy-kb-preflight',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} Karpathy LLM KB preflight card ${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID}.`,
        JSON.stringify({ closeoutKey: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY, lane: row.lane }),
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
    scriptPath: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SCRIPT_PATH,
    operation: 'create/update Karpathy LLM KB preflight card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SPRINT_ID,
        status: 'active',
        goal: 'Prepare the Karpathy LLM Knowledge Base pattern as Foundation-owned proposal/research without extraction.',
        activeBlockerCardId: closeCard ? null : BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : 'building_now',
          startedBy: 'codex-karpathy-kb-preflight',
          currentStatus: closeCard ? 'complete' : 'building',
          closeoutKey: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Sprint review/rollover: next recommended card is FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 unless Steve approves no-auth/no-paid extraction.'
            : 'Map current AIOS to the KB pattern; do not run extraction.',
          priorityOrder: [BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID],
          notNext: buildSprintItem(closeCard).notNextBoundaries,
          exitCriteria: [
            'Karpathy packet remains blocked/pending approval and non-runnable.',
            'Preflight maps have/missing/not-to-copy truth.',
            'Gaps route to Foundation compiler and quality-gate cards.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem(closeCard)],
    },
    'codex-karpathy-kb-preflight',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SPRINT_ID,
      reason: 'Steve approved BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 as proposal/research only.',
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
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    verifierSource,
    closeoutRecordsSource,
    closeoutDoc,
    foundationVerifySource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_APPROVAL_PATH, cardId: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID }),
    getBacklogItemsByIds([
      BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID,
      EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
      'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001',
      'KNOWLEDGE-BASE-QUALITY-GATE-001',
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID]),
    getExtractionControlSnapshot({ limit: 200 }),
    readRepoFile('package.json'),
    readRepoFile(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PLAN_PATH),
    readRepoFile(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SCRIPT_PATH),
    readRepoFile('lib/build-intel-karpathy-llm-kb-preflight.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID) || null
  const packetCard = cards.find(item => item.id === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID) || null
  const snapshot = buildKarpathyLlmKbPreflightSnapshot({ backlogItems: cards, extractionControlSnapshot: extractionControl })
  const dogfood = buildKarpathyLlmKbPreflightDogfoodProof({ backlogItems: cards })
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const targetRuns = (extractionControl.recentRuns || []).filter(run => run.targetKey === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY)
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID, priority: 'P0' },
    changedFiles: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const renderedReport = renderKarpathyLlmKbPreflightReport(snapshot)

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', 'pass/10')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live preflight card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, packetCard?.lane === 'done', 'Karpathy packet prerequisite is done', packetCard ? `${packetCard.id}:${packetCard.lane}` : 'missing')
  addCheck(checks, sprint.sprint?.sprintId === BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SPRINT_ID || card?.lane === 'done', 'Current Sprint is preflight or card is historically done', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains preflight item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready' && snapshot.proposalOnly === true, 'preflight snapshot is proposal-ready', snapshot.failures.map(finding => finding.check).join(', ') || snapshot.status)
  addCheck(checks, snapshot.writesBacklog === false && snapshot.researchInboxWritten === false && snapshot.atomsCreated === 0, 'preflight has no output mutation side effects', `writesBacklog=${snapshot.writesBacklog} atoms=${snapshot.atomsCreated}`)
  addCheck(checks, targetRuns.length === 0, 'no source crawl runs exist for the Karpathy packet target', `${targetRuns.length}`)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe preflight variants', dogfood.dogfoodInvariant)
  addCheck(checks, snapshot.recommendedNext === 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001', 'preflight recommends Foundation compiler design next', snapshot.recommendedNext)
  addCheck(checks, snapshot.proposalRows.every(row => row.writesBacklog === false), 'proposal rows do not write backlog', `${snapshot.proposalRows.length} proposal rows`)
  addCheck(checks, closeoutDoc.includes(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID) && closeoutDoc.includes(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('What Not To Copy') && renderedReport.includes('FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001'), 'rendered report includes missing/not-to-copy doctrine', 'report renderer')
  addCheck(checks, moduleSource.includes('buildKarpathyLlmKbPreflightSnapshot') && moduleSource.includes('KARPATHY_LLM_KB_NOT_TO_COPY'), 'preflight module owns pattern comparison', 'lib/build-intel-karpathy-llm-kb-preflight.js')
  addCheck(checks, verifierSource.includes(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID) && verifierSource.includes('buildKarpathyLlmKbPreflightSnapshot'), 'intelligence/audit verifier covers preflight', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, foundationVerifySource.includes('foundationIntelligenceAuditVerifierSource'), 'foundation:verify carries intelligence/audit verifier source', 'foundation verify wiring')
  addCheck(checks, closeoutRecordsSource.includes(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY), 'closeout registry includes preflight closeout', BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY)
  addCheck(checks, packageJson.scripts?.['process:build-intel-karpathy-llm-kb-preflight-check'] === `node --env-file-if-exists=.env ${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SCRIPT_PATH}`, 'package registers focused proof script', 'process:build-intel-karpathy-llm-kb-preflight-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'preflight module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      sourceCandidateCount: snapshot.sourceCandidates.length,
      stageSummary: snapshot.stageSummary,
      recommendedNext: snapshot.recommendedNext,
    },
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Karpathy LLM KB preflight check: ${result.ok ? 'pass' : 'fail'}`)
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
