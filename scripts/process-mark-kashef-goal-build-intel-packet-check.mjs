#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
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
  MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_APPROVAL_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CHANGED_FILES,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PACKET_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PLAN_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PROOF_COMMANDS,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SCRIPT_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SPRINT_ID,
  MARK_KASHEF_GOAL_NOT_NEXT_BOUNDARIES,
  MARK_KASHEF_GOAL_VIDEO_ID,
  MARK_KASHEF_GOAL_VIDEO_URL,
  buildMarkKashefGoalBuildIntelPacketDogfoodProof,
  buildMarkKashefGoalBuildIntelPacketSnapshot,
  renderMarkKashefGoalBuildIntelPacketReport,
} from '../lib/mark-kashef-goal-build-intel-packet.js'
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
const PRIOR_CARD_ID = 'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001'
const YOUTUBE_BATCH_CARD_ID = 'YOUTUBE-BUILD-INTEL-BATCH-001'

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

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/build-intel-watchlist.js',
      'lib/youtube-build-intel-batch.js',
      'lib/course-source-auth-boundary.js',
      'lib/mark-kashef-goal-build-intel-packet.js',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-runtime-memory-build-intel-stab-capture.md',
      'docs/process/youtube-build-intel-batch-001-plan.md',
      'docs/handoffs/2026-05-18-youtube-build-intel-batch-closeout.md',
      'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-mark-m-skool-extraction-preflight-closeout.md',
    ],
    existingScripts: [
      'scripts/process-youtube-build-intel-batch-check.mjs',
      'scripts/process-mark-m-skool-extraction-preflight-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingCards: [
      YOUTUBE_BATCH_CARD_ID,
      PRIOR_CARD_ID,
      MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
      MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID,
      MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID,
    ],
    existingPolicy: [
      'Public YouTube metadata lookup is allowed; transcript fetch, screenshots/keyframes, downloads, model calls, and downstream writes require a separate runtime approval.',
      'Skool and paid/community Mark Kashef content remain blocked by source-auth approval boundaries.',
      'Build Intel patterns route to Research Inbox/backlog review or follow-up eval cards, not direct implementation.',
    ],
    reused: [
      'Mark Kashef creator watchlist entry',
      'YouTube Build Intel queue spec',
      'Course source-auth public/private boundary',
      'Runtime memory Build Intel stab capture',
    ],
    notRebuilt: [
      'No YouTube extractor.',
      'No transcript fetcher.',
      'No screenshot/keyframe extractor.',
      'No goal-runner runtime.',
      'No Research Inbox/atom/action writer.',
    ],
    exactGap: 'Mark Kashef /goal needs a verified public source packet and AIOS transfer map before extraction or implementation work.',
    overBroadRisk: 'This can drift into transcript extraction, video summaries, private Skool access, goal-runner implementation, or hidden autonomous builders. V1 is source packet and proposal-only transfer map.',
    readyBy: 'Codex Foundation builder',
    readyAt: '2026-05-18T18:45:00.000-04:00',
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
    title: 'Extract Mark Kashef /goal agentic OS pattern',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 15,
    source: '2026-05-18 Build Intel/runtime queue',
    summary: 'Prepare a verified public Build Intel packet for Mark Kashef /goal self-improving OS source metadata, official /goal mechanics, AIOS transfer candidates, and extraction/implementation boundaries.',
    whyItMatters: 'Steve flagged /goal as potentially useful for keeping builders running until measurable completion. Foundation needs the pattern evaluated from source truth without copying Claude-specific behavior blindly.',
    nextAction: closeCard
      ? `Done under ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY}. Continue ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID} from repo truth.`
      : 'Verify public source metadata and official /goal mechanics. Do not fetch transcript, capture visuals, open Skool, summarize video content, call models, write downstream outputs, or implement a goal runner.',
    statusNote: closeCard
      ? `Closed under \`${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY}\`; public metadata packet is ready and runtime extraction/implementation remain approval-bound.`
      : `Executing under \`${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY}\`; public metadata packet only, no transcript/visual extraction.`,
    owner: 'Steve + Foundation',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PLAN_PATH,
    definitionOfDone: 'Verified public Mark Kashef /goal source packet exists, exact video metadata is source-backed, official /goal docs are linked for mechanics, Skool/private access remains blocked, transcript/visual extraction remains unrun, pattern candidates route to AIOS goal-runner eval, dogfood rejects unsafe variants, and ship gate passes.',
    proofCommands: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PROOF_COMMANDS,
    readinessBlockerCleared: `${PRIOR_CARD_ID} closed Skool private-community preflight and ${YOUTUBE_BATCH_CARD_ID} queued Mark Kashef public YouTube metadata-only.`,
    notNextBoundaries: MARK_KASHEF_GOAL_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_APPROVAL_PATH,
      closeoutKey: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY,
      packetRef: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PACKET_PATH,
      sourceUrl: MARK_KASHEF_GOAL_VIDEO_URL,
      videoId: MARK_KASHEF_GOAL_VIDEO_ID,
      recommendedNext: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID,
      aiosFollowUp: MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID,
      liveExtractionApproved: false,
      implementationApproved: false,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'Matt Pocock / Total TypeScript public repo/source eval is scoped from public source truth without installing, copying blindly, or mutating downstream outputs.',
    proofCommands: [
      'scope-first: verify public repo/source/license/source class before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID} closed Mark Kashef /goal public source packet.`,
    notNextBoundaries: MARK_KASHEF_GOAL_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
      nextAfterCloseoutKey: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY,
      publicSourceEvalOnly: true,
      liveExtractionApproved: false,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now', planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard })
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
        INSERT INTO plan_critic_runs (run_id, card_id, plan_ref, status, score, max_score, pass_threshold, priority, gate_level, full_verify_required, changed_files, findings, result, requested_by)
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-mark-kashef-goal-packet')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result
      `,
      [
        `mark-kashef-goal-packet-${stableRunId(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PLAN_PATH)}`,
        MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
        MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PLAN_PATH,
        planReview.status,
        planReview.score,
        MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-mark-kashef-goal-packet',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID}.`,
        JSON.stringify({ closeoutKey: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY, stage }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SCRIPT_PATH,
    operation: 'create/update Mark Kashef goal Build Intel packet card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SPRINT_ID,
        status: 'active',
        goal: 'Close Mark Kashef public /goal Build Intel packet without transcript/visual extraction or implementation drift.',
        activeBlockerCardId: closeCard ? MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID : MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-mark-kashef-goal-packet',
          currentStatus: closeCard ? 'next_scoping' : stage,
          closeoutKey: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID} from repo truth.`
            : 'Write Mark Kashef /goal public metadata packet and keep extraction/implementation blocked.',
          priorityOrder: [
            MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
            MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID,
          ],
          notNext: MARK_KASHEF_GOAL_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Exact public source metadata is verified without transcript or visual extraction.',
            'Official /goal docs are linked for mechanics and Mark-specific workflow claims remain unextracted.',
            'Pattern candidates route to AIOS goal-runner eval rather than direct implementation.',
            'Dogfood rejects missing source proof, title mismatch, missing official docs, transcript fetch, private Skool access, copied transcript, downstream writes, and direct implementation.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()]
        : [buildSprintItem({ closeCard, stage })],
    },
    'codex-mark-kashef-goal-packet',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized Mark Kashef /goal Build Intel packet after Skool preflight.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PLAN_PATH)
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })
  if (writeRequested && !(planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE)) {
    throw new Error(`Plan Critic must pass before write. status=${planCritic.status} score=${planCritic.score}`)
  }
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview: planCritic })

  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    packageSource,
    moduleSource,
    scriptSource,
    verifierSource,
    closeoutRecordsSource,
    packetDoc,
    closeoutDoc,
    currentPlan,
    currentState,
    stabCapture,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_APPROVAL_PATH, cardId: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID }),
    getBacklogItemsByIds([MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID, PRIOR_CARD_ID, YOUTUBE_BATCH_CARD_ID, MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID, MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile('lib/mark-kashef-goal-build-intel-packet.js'),
    readRepoFile(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SCRIPT_PATH),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PACKET_PATH),
    readRepoFile(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-runtime-memory-build-intel-stab-capture.md'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID) || null
  const priorCard = cards.find(item => item.id === PRIOR_CARD_ID) || null
  const youtubeBatchCard = cards.find(item => item.id === YOUTUBE_BATCH_CARD_ID) || null
  const nextCard = cards.find(item => item.id === MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID) || null
  const goalRunnerCard = cards.find(item => item.id === MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const snapshot = buildMarkKashefGoalBuildIntelPacketSnapshot()
  const dogfood = buildMarkKashefGoalBuildIntelPacketDogfoodProof()
  const renderedReport = renderMarkKashefGoalBuildIntelPacketReport(snapshot)

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'pass' : 'missing')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live Mark Kashef goal packet card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, priorCard?.lane === 'done', 'Mark M Skool preflight prerequisite is closed', priorCard ? `${priorCard.id}:${priorCard.lane}` : 'missing')
  addCheck(checks, youtubeBatchCard?.lane === 'done', 'YouTube Build Intel batch prerequisite is closed', youtubeBatchCard ? `${youtubeBatchCard.id}:${youtubeBatchCard.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next Matt Pocock eval card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, goalRunnerCard && ['scoped', 'research', 'done'].includes(goalRunnerCard.lane), 'AIOS goal-runner eval follow-up exists', goalRunnerCard ? `${goalRunnerCard.id}:${goalRunnerCard.lane}` : 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains Mark Kashef goal packet item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  if (args.closeCard || card?.lane === 'done') {
    addCheck(checks, nextSprintItem?.stage === 'scoping', 'Current Sprint advances next Matt Pocock card after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready', 'Mark Kashef goal packet snapshot is ready', JSON.stringify(snapshot.summary))
  addCheck(checks, snapshot.sourcePacket.video.videoId === MARK_KASHEF_GOAL_VIDEO_ID && snapshot.sourcePacket.video.url === MARK_KASHEF_GOAL_VIDEO_URL, 'exact public video metadata is present', `${snapshot.sourcePacket.video.videoId} ${snapshot.sourcePacket.video.url}`)
  addCheck(checks, snapshot.sourcePacket.officialGoalDocs.url === 'https://code.claude.com/docs/en/goal', 'official /goal docs are present', snapshot.sourcePacket.officialGoalDocs.url)
  addCheck(checks, snapshot.sourcePacket.sourceClaims.transcriptExtracted === false && snapshot.sourcePacket.sourceClaims.visualWorkflowExtracted === false && snapshot.sourcePacket.sourceClaims.contentClaimsVerified === false, 'Mark-specific content remains unextracted/unverified', JSON.stringify(snapshot.sourcePacket.sourceClaims))
  addCheck(checks, snapshot.aiosEvaluationFollowUp === MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID && snapshot.outputTarget === 'proposal_packet_only', 'pattern candidates route to AIOS eval, not implementation', `${snapshot.aiosEvaluationFollowUp} / ${snapshot.outputTarget}`)
  addCheck(checks, snapshot.summary?.unsafeSideEffectCount === 0 && snapshot.summary?.copiedContentViolationCount === 0, 'no unsafe side effects or copied content occurred', JSON.stringify(snapshot.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe Mark Kashef packet variants', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, packetDoc.includes(MARK_KASHEF_GOAL_VIDEO_ID) && packetDoc.includes('Official /goal Docs') && packetDoc.includes('Not Extracted'), 'Build Intel packet doc exists and names source/extraction boundary', MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PACKET_PATH)
  addCheck(checks, closeoutDoc.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID) && closeoutDoc.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('Pattern Candidates') && renderedReport.includes(MARK_KASHEF_GOAL_VIDEO_URL), 'rendered report summarizes Mark Kashef packet', 'report renderer')
  addCheck(checks, stabCapture.includes('Claude Code `/goal`') && stabCapture.includes('AIOS-GOAL-DRIVEN-RUNNER-EVAL-001'), 'runtime memory stab capture preserved /goal context', 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-runtime-memory-build-intel-stab-capture.md')
  addCheck(checks, verifierSource.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID) && verifierSource.includes('buildMarkKashefGoalBuildIntelPacketDogfoodProof'), 'intelligence/audit verifier covers Mark Kashef goal packet', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, closeoutRecordsSource.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY), 'closeout registry includes Mark Kashef goal packet closeout', MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY)
  addCheck(checks, currentPlan.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY) && currentPlan.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID), 'current plan names closeout and next card', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY) && currentState.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID), 'current state names closeout and next card', 'docs/rebuild/current-state.md')
  addCheck(checks, packageJson.scripts?.['process:mark-kashef-goal-build-intel-packet-check'] === `node --env-file-if-exists=.env ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SCRIPT_PATH}`, 'package registers focused proof script', 'process:mark-kashef-goal-build-intel-packet-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'Mark Kashef packet module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      videoId: snapshot.sourcePacket.video.videoId,
      recommendedNext: snapshot.recommendedNext,
    },
    checks,
    failures: failed,
  }

  await closeFoundationDb()
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Mark Kashef goal Build Intel packet check: ${result.ok ? 'PASS' : 'FAIL'} (${result.summary.passed}/${result.summary.total})`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
  }
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
