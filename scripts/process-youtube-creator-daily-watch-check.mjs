#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getExtractionControlSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  listSourceCrawlItems,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  getFoundationJobDefinition,
} from '../lib/foundation-jobs.js'
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
  CREATOR_WATCHLIST_SOURCE_ID,
} from '../lib/build-intel-watchlist.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_APPROVAL_PATH as APPROVAL_PATH,
  YOUTUBE_CREATOR_DAILY_WATCH_CARD_ID as CARD_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_CHANGED_FILES as CHANGED_FILES,
  YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_KEY as CLOSEOUT_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_CLOSEOUT_PATH as CLOSEOUT_PATH,
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY as JOB_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_NEXT_CARD_ID as NEXT_CARD_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_NOT_NEXT as NOT_NEXT,
  YOUTUBE_CREATOR_DAILY_WATCH_PLAN_PATH as PLAN_PATH,
  YOUTUBE_CREATOR_DAILY_WATCH_PROOF_COMMANDS as PROOF_COMMANDS,
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID as REPORT_ARTIFACT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_RUNNER_PATH as RUNNER_PATH,
  YOUTUBE_CREATOR_DAILY_WATCH_SCRIPT_PATH as SCRIPT_PATH,
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_SPRINT_ID as SPRINT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY as TARGET_KEY,
  buildYoutubeCreatorDailyWatchDogfoodProof,
  buildYoutubeCreatorDailyWatchPlan,
  buildYoutubeCreatorDailyWatchSnapshot,
  renderYoutubeCreatorDailyWatchCloseout,
} from '../lib/youtube-creator-daily-watch.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'youtube-creator-daily-watch'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
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

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

async function git(args = []) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function cloneSprintItem(item = {}) {
  return JSON.parse(JSON.stringify(item || {}))
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/build-intel-watchlist.js',
      'lib/foundation-source-crawl-store.js',
      'lib/foundation-jobs.js',
      'lib/intelligence-atoms.js',
      'lib/youtube-scout-latest-video-vision.js',
    ],
    existingDocs: [
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'docs/process/youtube-creator-daily-watch-sprint-update-001-plan.md',
      PLAN_PATH,
      APPROVAL_PATH,
    ],
    existingScripts: [
      'scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs',
      RUNNER_PATH,
      SCRIPT_PATH,
      'scripts/run-foundation-job.mjs',
    ],
    existingPolicy: [
      'Foundation remains source/intelligence truth; Dev Team Hub reads Foundation, not a separate silo.',
      'Daily watch is public YouTube metadata only and cannot follow private, paid, auth, member, comment, course, purchase, download, opt-in, booking, or form paths.',
      'Findings enter a proposal-only review pool; backlog promotion requires explicit approval.',
      'No Meeting Vault Phase B or Drive permission mutation is approved by this lane.',
    ],
    reused: [
      'Build Intel creator watchlist source truth',
      'source_crawl_targets/source_crawl_items extraction ledger',
      'Foundation scheduled job runner and mutation allowlist',
      'intelligence_report_artifacts/intelligence_atoms/intelligence_atom_hits review stores',
      'Current Sprint live DB overlay',
    ],
    notRebuilt: [
      'No new credential registry.',
      'No private-source crawler.',
      'No external notification writer.',
      'No automatic backlog card creator.',
      'No parallel extraction worker.',
    ],
    exactGap: 'The sprint had a one-time public YouTube scout but no scheduled daily creator watch with Mark last-50/rest last-20 depth rules, dedupe, first-seen/last-seen provenance, and review-pool persistence.',
    overBroadRisk: 'Can drift into broad extraction, Skool/MyICOR/Gumroad/Calendly, comments/member/community/course data, model calls, credential mutation, or automatic backlog creation.',
    readyBy: 'Steve direct active-card instruction for YOUTUBE-CREATOR-DAILY-WATCH-001.',
    readyAt: '2026-05-21T16:39:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `youtube-creator-daily-watch-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      summary: buildPlanCriticResultSummary(planReview),
    },
  }
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const run = buildPlanCriticRun(planReview)
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0',$7,true,$8::text[],$9::jsonb,$10::jsonb,$11)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            requested_by = EXCLUDED.requested_by,
            created_at = NOW()
      `,
      [
        run.runId,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        planReview.gateDecision?.level || 'full',
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(run.result),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function mapReport(row = null) {
  return row ? {
    reportArtifactId: row.report_artifact_id,
    reportType: row.report_type,
    title: row.title,
    status: row.status,
    sourceIds: row.source_ids || [],
    inputArtifactIds: row.input_artifact_ids || [],
    inputAtomIds: row.input_atom_ids || [],
    actionRequiredItems: row.action_required_items || [],
    structuredOutputJson: row.structured_output_json || {},
    metadata: row.metadata || {},
  } : null
}

async function loadReportProof() {
  const pool = createPool()
  try {
    const [reportResult, atomCountResult, hitCountResult] = await Promise.all([
      pool.query(
        `
          SELECT report_artifact_id, report_type, title, status, source_ids,
                 input_artifact_ids, input_atom_ids, action_required_items,
                 structured_output_json, metadata
          FROM intelligence_report_artifacts
          WHERE report_artifact_id = $1
          LIMIT 1
        `,
        [REPORT_ARTIFACT_ID],
      ),
      pool.query(
        `
          SELECT COUNT(*)::integer AS atom_count
          FROM intelligence_atoms
          WHERE report_artifact_id = $1
        `,
        [REPORT_ARTIFACT_ID],
      ),
      pool.query(
        `
          SELECT COUNT(*)::integer AS hit_count
          FROM intelligence_atom_hits
          WHERE report_artifact_id = $1
        `,
        [REPORT_ARTIFACT_ID],
      ),
    ])
    return {
      report: mapReport(reportResult.rows[0] || null),
      atomCount: Number(atomCountResult.rows[0]?.atom_count || 0),
      hitCount: Number(hitCountResult.rows[0]?.hit_count || 0),
    }
  } finally {
    await pool.end()
  }
}

async function loadLatestJobRun() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT run_id, job_key, status, started_at, finished_at, duration_ms,
               exit_code, error_message, metadata
        FROM foundation_job_runs
        WHERE job_key = $1
        ORDER BY COALESCE(finished_at, started_at, created_at) DESC
        LIMIT 1
      `,
      [JOB_KEY],
    )
    const row = result.rows[0] || null
    return row ? {
      runId: row.run_id,
      jobKey: row.job_key,
      status: row.status,
      startedAt: row.started_at?.toISOString?.() || row.started_at || null,
      finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
      durationMs: Number(row.duration_ms || 0),
      exitCode: row.exit_code,
      errorMessage: row.error_message || null,
      metadata: row.metadata || {},
    } : null
  } finally {
    await pool.end()
  }
}

async function loadTargetSnapshot() {
  const extraction = await getExtractionControlSnapshot({ limit: 200 })
  return list(extraction.targets).find(target => target.targetKey === TARGET_KEY) || null
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  const cloned = cloneSprintItem(item)
  return {
    ...cloned,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Every active known public YouTube creator ref in the Build Intel watchlist is checked by the scheduled daily watch; Mark starts at last 50, other public creators start at last 20; results are deduped into a reviewable research pool with source-linked provenance and no private/auth/external/backlog side effects.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'The daily-watch sprint update made this the active blocker and recorded Mark last-50/rest last-20 requirements.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(cloned.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      targetKey: TARGET_KEY,
      jobKey: JOB_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      sourceIds: [CREATOR_WATCHLIST_SOURCE_ID, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
      publicYoutubeOnly: true,
      noAuth: true,
      markKashefBaselineDepth: 50,
      defaultCreatorBaselineDepth: 20,
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      privateOrPaidAccess: false,
      nextCardId: NEXT_CARD_ID,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildNextSprintItem(item = {}, { currentHead = '' } = {}) {
  const cloned = cloneSprintItem(item)
  return {
    ...cloned,
    cardId: NEXT_CARD_ID,
    stage: cloned.stage === 'done_this_sprint' ? cloned.stage : 'scoping',
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; read the Foundation daily-watch research pool from ${REPORT_ARTIFACT_ID}.`,
    metadata: {
      ...(cloned.metadata || {}),
      previousCloseoutKey: CLOSEOUT_KEY,
      dailyWatchReportArtifactId: REPORT_ARTIFACT_ID,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = list(previous.items).map(cloneSprintItem)
  const nextItems = items.map(item => {
    if (item.cardId === CARD_ID) return buildSprintItem(item, { closeCard, currentHead })
    if (item.cardId === NEXT_CARD_ID) return buildNextSprintItem(item, { currentHead })
    return item
  })
  if (!nextItems.some(item => item.cardId === CARD_ID)) {
    nextItems.push(buildSprintItem({ cardId: CARD_ID, order: 1 }, { closeCard, currentHead }))
  }
  if (!nextItems.some(item => item.cardId === NEXT_CARD_ID)) {
    nextItems.push(buildNextSprintItem({ cardId: NEXT_CARD_ID, order: 2 }, { currentHead }))
  }
  return nextItems
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
    .map((item, index) => ({ ...item, order: index + 1 }))
}

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Next card is ${NEXT_CARD_ID}; do not start it until Steve/Orchestrator explicitly continues.`
      : `Build ${JOB_KEY}: scheduled public no-auth YouTube creator metadata watch with Mark last-50/rest last-20 baseline and proposal-only research pool.`,
    statusNote: closeCard
      ? `Closed 2026-05-21 under ${CLOSEOUT_KEY}; scheduled Foundation job ${JOB_KEY} writes public YouTube creator metadata into source_crawl_items target ${TARGET_KEY}, dedupes by video ID, preserves creator/channel/video/title/visible publish date/URL/discovery/source/first-seen/last-seen provenance, persists report ${REPORT_ARTIFACT_ID}, creates proposal-only title-level atoms/hits, and does not crawl private/auth/member/comment/course/resource-link surfaces or auto-create backlog cards. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; public YouTube metadata only, no external writes or auto backlog promotion.`,
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update YouTube creator daily watch backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = await git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'youtube_creator_daily_watch_closed' : 'youtube_creator_daily_watch_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: build read-only Dev Team Hub V0 over Foundation daily-watch/report/atom truth only after Steve/Orchestrator continues.`
            : `${CARD_ID}: build scheduled public YouTube creator daily watch.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          dailyWatchJobKey: JOB_KEY,
          dailyWatchTargetKey: TARGET_KEY,
          dailyWatchReportArtifactId: REPORT_ARTIFACT_ID,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
          noAutoBacklogCards: true,
          publicYoutubeOnly: true,
          strategyPeopleParked: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Close YOUTUBE-CREATOR-DAILY-WATCH-001 and advance only to the next scoped sprint card after proof.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []

  await initFoundationDb()
  try {
    const [
      approval,
      planSource,
      packageJson,
      moduleSource,
      runnerSource,
      scriptSource,
      jobsSource,
      allowlistSource,
      routesSource,
      serverSource,
      closeoutRegistrySource,
      coverageSource,
      sourceContractsSource,
      sourceContractValidationSource,
      sourceLifecycleSource,
      sourceLifecycleCompletionSource,
      hubReadRoutesSource,
      currentPlanSource,
      currentStateSource,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
      readRepoFile(PLAN_PATH),
      readRepoJson('package.json'),
      readRepoFile('lib/youtube-creator-daily-watch.js'),
      readRepoFile(RUNNER_PATH),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('lib/foundation-jobs.js'),
      readRepoFile('lib/foundation-job-mutation-allowlist.js'),
      readRepoFile('lib/foundation-build-intel-routes.js'),
      readRepoFile('server.js'),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile('lib/source-contracts.js'),
      readRepoFile('lib/source-contract-validation-layer.js'),
      readRepoFile('lib/source-lifecycle.js'),
      readRepoFile('lib/source-lifecycle-completion.js'),
      readRepoFile('lib/hub-read-routes.js'),
      readRepoFile('docs/rebuild/current-plan.md'),
      readRepoFile('docs/rebuild/current-state.md'),
    ])
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: { id: CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'Full ship gate because this card adds a scheduled operational-write Foundation job, source-crawl research pool writes, report/atom/hit persistence, Build Intel route exposure, closeout registry, verifier coverage, and Current Sprint advancement while preserving no-private/no-external/no-auto-backlog boundaries.',
      repoRoot,
    })
    const plan = buildYoutubeCreatorDailyWatchPlan()
    const dogfood = buildYoutubeCreatorDailyWatchDogfoodProof()
    const jobDefinition = getFoundationJobDefinition(JOB_KEY)
    const [target, items, reportProof, latestJobRun] = await Promise.all([
      loadTargetSnapshot(),
      listSourceCrawlItems({ targetKey: TARGET_KEY, limit: 200, order: 'desc' }),
      loadReportProof(),
      loadLatestJobRun(),
    ])
    const snapshot = buildYoutubeCreatorDailyWatchSnapshot({
      plan,
      target,
      items,
      report: reportProof.report,
      jobDefinition,
      latestJobRun,
    })

    if (args.closeCard || args.apply) {
      if (!approval.ok || Number(approval.approval?.score) < PLAN_CRITIC_MIN_PASS_SCORE) {
        throw new Error(`Approval is not valid for ${CARD_ID}.`)
      }
      if (planReview.status !== 'pass' || Number(planReview.score) < PLAN_CRITIC_MIN_PASS_SCORE) {
        throw new Error(`Plan Critic did not pass: ${buildPlanCriticResultSummary(planReview)}`)
      }
      if (!snapshot.ok) {
        throw new Error(`Daily watch snapshot is not healthy: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
      }
      if (args.closeCard) {
        await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderYoutubeCreatorDailyWatchCloseout(snapshot), 'utf8')
      }
      await ensureLiveState({ closeCard: args.closeCard, planReview })
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const sprintCardIds = list(activeSprint.items).map(item => item.cardId).filter(Boolean)
    const cards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const card = cards.find(item => item.id === CARD_ID) || null
    const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
    const activeItem = list(activeSprint.items).find(item => item.cardId === CARD_ID) || null
    const nextItem = list(activeSprint.items).find(item => item.cardId === NEXT_CARD_ID) || null
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
    const closeoutExists = await repoFileExists(CLOSEOUT_PATH)
    const closeCardExpected = args.closeCard

    addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for daily watch', buildPlanCriticResultSummary(planReview))
    addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply || args.closeCard, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, card && (closeCardExpected ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card.lane)), 'live backlog card exists with expected lane', card ? `${card.id}:${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, nextCard && ['scoped', 'executing', 'done', 'research'].includes(nextCard.lane), 'next card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === (closeCardExpected ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker is reconciled', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, !closeCardExpected || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks daily watch done after close', activeItem?.stage || 'missing')
    addCheck(checks, !closeCardExpected || nextItem?.stage === 'scoping', 'Current Sprint advances to next scoped card after close', nextItem?.stage || 'missing')
    addCheck(checks, snapshot.ok === true, 'daily watch persisted snapshot is healthy', snapshot.failures.map(failure => failure.check).join(', ') || 'healthy')
    addCheck(checks, dogfood.ok === true, 'dogfood proves dedupe, baseline depth, daily delta, no-auth boundaries, no external writes, and no auto backlog', JSON.stringify(dogfood.cases))
    addCheck(checks, target?.budget?.llmBudget === 'none' && Number(target?.budget?.maxRuntimeSeconds || 0) > 0 && Number(target?.budget?.maxItemsPerRun || 0) === plan.creators.length, 'daily watch target carries explicit no-LLM runtime caps', JSON.stringify(target?.budget || {}))
    addCheck(checks, reportProof.atomCount >= 1 && reportProof.hitCount >= 1 && reportProof.hitCount === reportProof.atomCount, 'report has proposal-only atoms and evidence hits', `${reportProof.atomCount}/${reportProof.hitCount}`)
    addCheck(checks, packageJson.scripts?.['youtube:creator-daily-watch'] === `node --env-file-if-exists=.env ${RUNNER_PATH}`, 'package exposes scheduled runner', packageJson.scripts?.['youtube:creator-daily-watch'] || 'missing')
    addCheck(checks, packageJson.scripts?.['process:youtube-creator-daily-watch-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:youtube-creator-daily-watch-check'] || 'missing')
    addCheck(checks, moduleSource.includes('buildYoutubeCreatorDailyWatchPoolItems') && runnerSource.includes('leaseSourceCrawlTarget') && runnerSource.includes('upsertSourceCrawlItem'), 'runner reuses source-crawl target/item ledger', 'target lease + item upsert markers')
    addCheck(checks, jobsSource.includes(`key: '${JOB_KEY}'`) && jobsSource.includes('Public YouTube Creator Daily Watch'), 'Foundation job definition is registered', JOB_KEY)
    addCheck(checks, allowlistSource.includes(`'${JOB_KEY}'`) && allowlistSource.includes('operational_write'), 'Foundation job mutation allowlist permits scheduled operational write', JOB_KEY)
    addCheck(checks, routesSource.includes('/api/foundation/build-intel/youtube-creator-daily-watch') && serverSource.includes('buildYoutubeCreatorDailyWatchReadSnapshot'), 'Build Intel route exposes daily watch read snapshot', 'route + server dependency')
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes daily watch', 'lib/foundation-build-closeout-intelligence-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && list(closeout.backlogIds).includes(CARD_ID), 'build closeout lookup resolves daily watch', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes daily watch card ID', 'coverage card ID present')
    addCheck(checks, sourceContractsSource.includes('Public Metadata Watch V1') && sourceContractsSource.includes('Proposal-Only V1; Source Boundary Locked'), 'source contract records proposal-only public YouTube watch truth', 'SRC-YOUTUBE-INTEL-001')
    addCheck(checks, sourceContractValidationSource.includes("'SRC-YOUTUBE-INTEL-001'") && sourceContractValidationSource.includes("extractionPosture: 'proposal_only'"), 'source validation permits proposal-only public YouTube metadata lane', 'SRC-YOUTUBE-INTEL-001 proposal_only')
    addCheck(checks, sourceLifecycleSource.includes('SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT = 15') && sourceLifecycleSource.includes("'youtube-creator-daily-watch'") && sourceLifecycleSource.includes('publicNoAuthOnly'), 'source lifecycle approved target baseline includes daily watch caps', '15 targets')
    addCheck(checks, sourceLifecycleCompletionSource.includes('daily watch review pool') && sourceLifecycleCompletionSource.includes('richer YouTube extraction/scout'), 'source lifecycle completion keeps richer YouTube extraction gated', 'proposal-only watch, richer extraction gated')
    addCheck(checks, hubReadRoutesSource.includes('compactFoundationExtractionControlForHub') && hubReadRoutesSource.includes('extractionControl: compactFoundationExtractionControlForHub'), 'full diagnostics compacts extraction-control payload after adding research pool rows', 'compact extractionControl')
    addCheck(checks, currentPlanSource.includes(CARD_ID) && currentPlanSource.includes('last 50') && currentPlanSource.includes('last 20'), 'current plan keeps daily-watch depth rules visible', 'docs/rebuild/current-plan.md')
    addCheck(checks, currentStateSource.includes(CARD_ID) && currentStateSource.includes('last 50') && currentStateSource.includes('last 20'), 'current state keeps daily-watch depth rules visible', 'docs/rebuild/current-state.md')
    addCheck(checks, !closeCardExpected || closeoutExists, 'closeout handoff exists after close', CLOSEOUT_PATH)
    const externalWritePattern = /\b(sendTelegram|sendMail|sendEmail|submitForm|completePurchase|runPurchase|createBacklogItem)\s*\(/
    addCheck(checks, !externalWritePattern.test(`${moduleSource}\n${runnerSource}\n${scriptSource}`), 'implementation has no external notification/purchase/form/auto-backlog writer', 'external write helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      targetKey: TARGET_KEY,
      jobKey: JOB_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      nextCardId: NEXT_CARD_ID,
      snapshot: snapshot.summary,
      latestJobRun: latestJobRun ? {
        runId: latestJobRun.runId,
        status: latestJobRun.status,
        startedAt: latestJobRun.startedAt,
        finishedAt: latestJobRun.finishedAt,
      } : null,
      checks,
      failed,
    }

    if (args.json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`YouTube creator daily watch proof: ${result.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('YouTube creator daily watch proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
