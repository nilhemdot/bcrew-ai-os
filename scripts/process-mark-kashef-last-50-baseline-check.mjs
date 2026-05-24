#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getIntelligenceReportBundle,
  getPlanCriticRunsByCardIds,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  recordIntelligenceAtomHit,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
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
  MARK_KASHEF_BASELINE_BASE_MODEL,
  MARK_KASHEF_BASELINE_CANDIDATE_MODEL,
  MARK_KASHEF_BASELINE_CHANGED_FILES as CHANGED_FILES,
  MARK_KASHEF_BASELINE_CREATOR_ID,
  MARK_KASHEF_BASELINE_NOT_NEXT as NOT_NEXT,
  MARK_KASHEF_BASELINE_PROOF_COMMANDS as PROOF_COMMANDS,
  MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID as REPORT_ARTIFACT_ID,
  MARK_KASHEF_BASELINE_REPORT_PATH as REPORT_PATH,
  MARK_KASHEF_BASELINE_SOURCE_ID,
  MARK_KASHEF_BASELINE_SPRINT_ID as SPRINT_ID,
  MARK_KASHEF_BASELINE_TARGET_KEY,
  MARK_KASHEF_BASELINE_TARGET_VIDEO_ID,
  MARK_KASHEF_LAST_50_BASELINE_APPROVAL_PATH as APPROVAL_PATH,
  MARK_KASHEF_LAST_50_BASELINE_CARD_ID as CARD_ID,
  MARK_KASHEF_LAST_50_BASELINE_PLAN_PATH as PLAN_PATH,
  MARK_KASHEF_LAST_50_BASELINE_SCRIPT_PATH as SCRIPT_PATH,
  buildGodModeYoutubeEndToEndSnapshot,
  buildMarkGodModeDogfoodProof,
  buildMarkGodModeWriteSet,
  buildSnapshotFromMarkGodModeReport,
  followSafePublicResourceLinks,
  renderMarkGodModeReport,
  runGodModeYoutubeModelComparison,
  verifyMarkGodModePersistedProof,
} from '../lib/god-mode-youtube-end-to-end-extractor.js'
import {
  buildCurrentModeBaseline,
  capturePublicYoutubePageEvidence,
  findTranscriptForVideo,
} from '../lib/god-mode-extractor-eyes-quality-loop.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'mark-kashef-god-mode-youtube-end-to-end'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    liveGeminiApi: argv.includes('--live-gemini-api') || argv.includes('--live-gemini-api=true'),
    baseModel: readArgValue(argv, '--base-model=') || MARK_KASHEF_BASELINE_BASE_MODEL,
    candidateModel: readArgValue(argv, '--candidate-model=') || MARK_KASHEF_BASELINE_CANDIDATE_MODEL,
  }
}

function readArgValue(argv = [], prefix = '') {
  const found = argv.find(arg => String(arg || '').startsWith(prefix))
  return found ? String(found).slice(prefix.length).trim() : ''
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed || '')).digest('hex').slice(0, 12)
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
      'lib/god-mode-extractor-eyes-quality-loop.js',
      'lib/gemini-video-brain-route.js',
      'lib/web-godmode-live-operator.js',
      'lib/youtube-creator-daily-watch.js',
      'lib/dev-team-hub.js',
    ],
    existingDocs: [
      'docs/handoffs/2026-05-23-god-mode-extractor-checkpoint.md',
      'docs/source-notes/god-mode-extractor-eyes-quality-loop-2026-05-23.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs',
      'scripts/process-youtube-creator-daily-watch-check.mjs',
      'scripts/process-mark-kashef-last-50-baseline-check.mjs',
    ],
    existingPolicy: [
      'Gemini API video understanding is the current full-watch route for YouTube URLs.',
      'Gemini Workspace/subscription browser output is scout/reasoning only for YouTube URLs until full-watch parity is proven.',
      'Mark last-50 must not scale from metadata-only, transcript-only, or subscription-scout proof.',
      'All recommendations remain proposal-only until Steve approves promotion.',
    ],
    reused: [
      'Daily creator watch source-crawl rows',
      'Shared communication transcript artifacts',
      'Public YouTube page evidence capture',
      'Gemini video Brain Fleet ledger route',
      'Foundation intelligence reports, atoms, and hits',
    ],
    notRebuilt: [
      'No new source silo.',
      'No broad crawler.',
      'No video download/upload workaround.',
      'No private source session.',
      'No automatic backlog promotion.',
    ],
    exactGap: 'One exact Mark video must prove full video/audio/visual extraction plus model quality/value before the next batch.',
    overBroadRisk: 'This can drift into last-50 scale-up, Skool, paid links, download links, or subscription-scout pretending to be watched video.',
    readyBy: 'Steve May 23 direct correction and GO: use Gemini API for full video watching, compare 2.5 vs latest 3.5, then decide scale-up.',
    readyAt: '2026-05-23T19:00:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `mark-kashef-god-mode-end-to-end-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
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
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0',$7,$8,$9::text[],$10::jsonb,$11::jsonb,$12)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
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
        planReview.gateDecision?.fullVerifyRequired === true,
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

async function loadMarkTargetVideo() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT external_id, metadata
        FROM source_crawl_items
        WHERE target_key = $1
          AND source_id = $2
          AND metadata->>'creatorId' = $3
          AND (external_id = $4 OR metadata->>'videoId' = $4)
        ORDER BY COALESCE((metadata->>'rank')::int, 9999), discovered_at DESC
        LIMIT 1
      `,
      [MARK_KASHEF_BASELINE_TARGET_KEY, MARK_KASHEF_BASELINE_SOURCE_ID, MARK_KASHEF_BASELINE_CREATOR_ID, MARK_KASHEF_BASELINE_TARGET_VIDEO_ID],
    )
    const row = result.rows[0]
    if (!row) {
      return {
        videoId: MARK_KASHEF_BASELINE_TARGET_VIDEO_ID,
        url: `https://www.youtube.com/watch?v=${MARK_KASHEF_BASELINE_TARGET_VIDEO_ID}`,
        title: 'How to Use /goal to Build a Self-Improving OS',
        creator: 'Mark Kashef',
        rank: 9999,
        approvalSource: 'Steve May 21 exact public Mark video; daily watch row missing fallback.',
      }
    }
    return {
      videoId: row.external_id || row.metadata?.videoId,
      url: row.metadata?.url || `https://www.youtube.com/watch?v=${row.external_id || row.metadata?.videoId}`,
      title: row.metadata?.title || row.external_id,
      creator: row.metadata?.creator || 'Mark Kashef',
      rank: Number(row.metadata?.rank || 9999),
      visibleMetadata: row.metadata?.visibleMetadata || '',
      publishVisibleDate: row.metadata?.publishVisibleDate || '',
      approvalSource: 'SRC-YOUTUBE-INTEL-001 daily creator watch Mark queue plus Steve exact seed approval.',
    }
  } finally {
    await pool.end()
  }
}

async function loadTranscriptArtifacts() {
  const archive = await getSharedCommunicationArchiveSnapshot({
    sourceId: MARK_KASHEF_BASELINE_SOURCE_ID,
    artifactType: 'video_transcript',
    limit: 500,
    includeSensitive: true,
  })
  return archive.items || []
}

async function buildLiveSnapshot({ now = new Date().toISOString(), baseModel, candidateModel } = {}) {
  const video = await loadMarkTargetVideo()
  const transcriptArtifacts = await loadTranscriptArtifacts()
  const pageEvidence = await capturePublicYoutubePageEvidence({
    video,
    now,
    screenshotRoot: '/tmp/bcrew-mark-god-mode-youtube-end-to-end',
  })
  const transcript = findTranscriptForVideo(video, transcriptArtifacts)
  const baseline = buildCurrentModeBaseline({ video, transcript, pageEvidence })
  const safeResourceFollowResults = await followSafePublicResourceLinks(pageEvidence.resourceLinks, { maxLinks: 3 })
  const modelResults = await runGodModeYoutubeModelComparison({
    video,
    baseline,
    pageEvidence,
    models: [baseModel, candidateModel],
    actor: ACTOR,
    runId: now,
  })
  return buildGodModeYoutubeEndToEndSnapshot({
    generatedAt: now,
    video,
    transcriptArtifacts,
    pageEvidence,
    safeResourceFollowResults,
    modelResults,
    liveGeminiApi: true,
  })
}

async function persistProof(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'persist Mark God Mode YouTube end-to-end report, proposal-only atoms, and evidence hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildMarkGodModeWriteSet(snapshot)
  let report = await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
  const atoms = []
  const hits = []
  for (const atomInput of writeSet.atomInputs) atoms.push(await upsertIntelligenceAtom(atomInput, ACTOR))
  for (const hitInput of writeSet.hitInputs) hits.push(await recordIntelligenceAtomHit(hitInput, ACTOR))
  report = await upsertIntelligenceReportArtifact({
    ...writeSet.reportArtifact,
    inputAtomIds: atoms.map(atom => atom.atomId || atom.atom_id),
  }, ACTOR)
  return { writeSet, report, atoms, hits }
}

async function loadPersistedProof(writeSet = null) {
  const bundle = await getIntelligenceReportBundle(REPORT_ARTIFACT_ID, { atomLimit: 100, hitLimit: 200 })
  const atomIds = writeSet?.atomInputs?.map(atom => atom.atomId) || []
  const hitIds = writeSet?.hitInputs?.map(hit => hit.hitId) || []
  const atoms = atomIds.length ? list(bundle.atoms).filter(atom => atomIds.includes(atom.atomId || atom.atom_id)) : list(bundle.atoms)
  const hits = hitIds.length ? list(bundle.hits).filter(hit => hitIds.includes(hit.hitId || hit.hit_id)) : list(bundle.hits)
  return { report: bundle.report || null, atoms, hits }
}

function buildBacklogUpdate({ snapshot = null } = {}) {
  const recommendedModel = snapshot?.modelComparison?.recommendation?.recommendedModel || 'pending'
  return {
    lane: 'executing',
    nextAction: `Review report ${REPORT_ARTIFACT_ID}; if quality/value is approved, run the next small Mark API full-watch batch using ${recommendedModel}.`,
    statusNote: 'Active and not done. Current one-video Mark God Mode slice needs review before the next action: Gemini API full video/audio/visual route, transcript/page/resource evidence, 2.5-vs-3.5 model comparison, proposal-only atoms/hits, and no auto backlog/private/external actions. Continue by choosing the next small Mark batch or rerun.',
  }
}

function buildSprintItem(item = {}, { currentHead = '', snapshot = null } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Mark last-50 baseline is not done until guarded full-watch batches are complete or remaining work is explicitly split. Current slice proves one exact Mark video end-to-end with Gemini API full video/audio/visual understanding, transcript/page/resource evidence, model quality/value comparison, and proposal-only Foundation truth.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'One-video end-to-end proof runs first; scale-up requires Steve approval after model/value review.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      activeSlice: 'god_mode_youtube_end_to_end_one_video',
      reportArtifactId: REPORT_ARTIFACT_ID,
      sourceVideoId: MARK_KASHEF_BASELINE_TARGET_VIDEO_ID,
      fullWatchRoute: 'gemini_api_youtube_url_video_understanding',
      subscriptionWorkspaceFullWatch: false,
      recommendedModel: snapshot?.modelComparison?.recommendation?.recommendedModel || null,
      comparedModels: snapshot?.modelComparison?.modelScores?.map(score => score.model) || [MARK_KASHEF_BASELINE_BASE_MODEL, MARK_KASHEF_BASELINE_CANDIDATE_MODEL],
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      privateOrPaidAccess: false,
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { currentHead = '', snapshot = null } = {}) {
  const items = (previous.items || []).map(cloneSprintItem)
  const byId = new Map(items.map(item => [item.cardId, item]))
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 9 }, { currentHead, snapshot })
  const nextItems = items.map(item => item.cardId === CARD_ID ? currentItem : item)
  if (!byId.has(CARD_ID)) nextItems.push(currentItem)
  return nextItems.sort((a, b) => Number(a.order || 999) - Number(b.order || 999)).map((item, index) => ({
    ...item,
    order: index + 1,
    sprintOrder: index + 1,
  }))
}

async function ensureLiveState({ snapshot, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update Mark baseline backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const currentHead = await git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ snapshot }), ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        activeBlockerCardId: CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: 'mark_god_mode_one_video_model_compare_applied',
          nextAction: `Review ${REPORT_ARTIFACT_ID}; then approve rerun or next small Mark full-watch batch.`,
          activeBlockerCardId: CARD_ID,
          markGodModeReportArtifactId: REPORT_ARTIFACT_ID,
          fullWatchRoute: 'gemini_api_youtube_url_video_understanding',
          subscriptionWorkspaceFullWatch: false,
          noWeakExtractionScaleUp: true,
          noAutoBacklogPromotion: true,
          noExternalWrites: true,
          publicYoutubeOnly: true,
          buildLaneCount: 1,
          blockersBlockActionsNotSprint: true,
        },
      },
      items: buildSprintItems(previous, { currentHead, snapshot }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve corrected Mark baseline: one full-watch Gemini API proof with model comparison before scale-up.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let snapshot = null
  let persistence = null
  let persisted = null

  if (args.closeCard) {
    throw new Error(`${CARD_ID} is not closed by this one-video proof. Use --apply, not --close-card.`)
  }

  await initFoundationDb()
  try {
    const now = new Date().toISOString()
    const [
      packageJson,
      planSource,
      moduleSource,
      scriptSource,
      currentPlanSource,
      currentStateSource,
      currentSprintBefore,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(PLAN_PATH),
      readRepoFile('lib/god-mode-youtube-end-to-end-extractor.js'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('docs/rebuild/current-plan.md'),
      readRepoFile('docs/rebuild/current-state.md'),
      getActiveFoundationCurrentSprint(),
    ])

    const approvalValidation = await validatePlanApprovalFile({
      repoRoot,
      approvalRef: APPROVAL_PATH,
      cardId: CARD_ID,
    })
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: { id: CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'Full ship-risk focused slice because it calls live Gemini video understanding, compares models, writes Foundation reports/atoms/hits, and updates Current Sprint truth while keeping Mark baseline active.',
      repoRoot,
    })

    if (args.apply) {
      if (args.liveGeminiApi) {
        snapshot = await buildLiveSnapshot({
          now,
          baseModel: args.baseModel,
          candidateModel: args.candidateModel,
        })
        if (!snapshot.ok) {
          throw new Error(`Mark God Mode proof blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
        }
        await fs.writeFile(path.join(repoRoot, REPORT_PATH), renderMarkGodModeReport(snapshot), 'utf8')
        const persistedWrite = await persistProof(snapshot)
        persisted = await loadPersistedProof(persistedWrite.writeSet)
        persistence = verifyMarkGodModePersistedProof({ snapshot, ...persisted })
      } else {
        persisted = await loadPersistedProof()
        snapshot = buildSnapshotFromMarkGodModeReport(persisted.report)
        persistence = verifyMarkGodModePersistedProof({ snapshot, ...persisted })
        if (!snapshot.ok || !persistence.ok) {
          throw new Error('Applying without --live-gemini-api requires an existing healthy persisted Mark God Mode report.')
        }
      }
      await ensureLiveState({ snapshot, planReview })
    } else {
      persisted = await loadPersistedProof()
      snapshot = buildSnapshotFromMarkGodModeReport(persisted.report)
      persistence = verifyMarkGodModePersistedProof({ snapshot, ...persisted })
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
    const cards = await getBacklogItemsByIds([CARD_ID, ...sprintCardIds])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID, ...sprintCardIds])
    const card = cards.find(item => item.id === CARD_ID) || null
    const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
    const dogfood = buildMarkGodModeDogfoodProof()
    const forbiddenSubscriptionFlag = '--live-' + 'subscription'
    const forbiddenSubscriptionArg = 'live' + 'Subscription'
    const forbiddenWorkspaceRunner = 'runGemini' + 'WorkspaceEyesBrowserProof'
    const hasSubscriptionScoutRuntimePath = scriptSource.includes(forbiddenSubscriptionFlag) ||
      scriptSource.includes(forbiddenSubscriptionArg) ||
      scriptSource.includes(forbiddenWorkspaceRunner)

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Mark God Mode slice', buildPlanCriticResultSummary(planReview))
    addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || planReview.status === 'pass', 'durable or in-memory Plan Critic pass exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'pending write')
    addCheck(checks, card && ['executing', 'scoped', 'research'].includes(card.lane), 'live Mark backlog card remains active', card ? `${card.id}:${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === CARD_ID, 'Current Sprint active blocker remains Mark baseline', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, activeItem?.stage === 'building_now', 'Current Sprint marks Mark baseline building now', activeItem?.stage || 'missing')
    addCheck(checks, snapshot?.ok === true, 'Mark God Mode end-to-end snapshot is healthy', snapshot?.failures?.map(failure => failure.check).join(', ') || snapshot?.status || 'missing')
    addCheck(checks, snapshot?.route?.fullVideoWatchRoute === 'gemini_api_youtube_url_video_understanding', 'full-watch route is Gemini API YouTube URL video understanding', snapshot?.route?.fullVideoWatchRoute || 'missing')
    addCheck(checks, snapshot?.route?.subscriptionWorkspaceFullWatch === false, 'subscription workspace route is not mislabeled as full-watch', String(snapshot?.route?.subscriptionWorkspaceFullWatch))
    addCheck(checks, snapshot?.video?.videoId === MARK_KASHEF_BASELINE_TARGET_VIDEO_ID, 'exact Mark seed video was processed', snapshot?.video?.videoId || 'missing')
    addCheck(checks, snapshot?.sourcePackage?.transcript?.present === true, 'transcript artifact is included', snapshot?.sourcePackage?.transcript?.artifactId || 'missing')
    addCheck(checks, snapshot?.sourcePackage?.pageEvidence?.responseOk === true, 'public page evidence is included', snapshot?.sourcePackage?.pageEvidence?.finalUrl || 'missing')
    addCheck(checks, list(snapshot?.sourcePackage?.resourceLinks).length >= 1, 'resource links were classified', `${list(snapshot?.sourcePackage?.resourceLinks).length}`)
    addCheck(checks, snapshot?.modelComparison?.modelScores?.length >= 2, 'two Gemini models are compared', list(snapshot?.modelComparison?.modelScores).map(score => `${score.model}:${score.ok}`).join(', '))
    addCheck(checks, list(snapshot?.modelComparison?.modelScores).filter(score => score.ok).length >= 2, 'both model calls succeeded', list(snapshot?.modelComparison?.modelScores).map(score => `${score.model}:${score.ok}`).join(', '))
    addCheck(checks, Boolean(snapshot?.modelComparison?.recommendation?.recommendedModel), 'recommended model is selected', snapshot?.modelComparison?.recommendation?.recommendedModel || 'missing')
    addCheck(checks, list(snapshot?.topBuildCandidates).length >= 2, 'top build candidates exist', `${list(snapshot?.topBuildCandidates).length}`)
    addCheck(checks, persistence?.ok === true, 'persisted report, atoms, and hits read back', persistence?.failures?.map(failure => failure.check).join(', ') || 'ok')
    addCheck(checks, dogfood.ok === true, 'dogfood rejects scout/transcript-only proof and accepts full-watch model comparison', JSON.stringify(dogfood.cases))
    addCheck(checks, packageJson.scripts?.['process:mark-kashef-last-50-baseline-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:mark-kashef-last-50-baseline-check'] || 'missing')
    addCheck(checks, moduleSource.includes('gemini_api_youtube_url_video_understanding') && moduleSource.includes('qualityPer1kTokens'), 'module records full-watch route and quality/value compare', 'module markers present')
    addCheck(checks, scriptSource.includes('--live-gemini-api') && !hasSubscriptionScoutRuntimePath, 'focused script uses API route and not subscription scout route', 'script markers present')
    addCheck(checks, currentPlanSource.includes('Gemini API full-watch route') || currentPlanSource.includes('gemini_api_youtube_url_video_understanding'), 'current plan records corrected full-watch route', 'docs/rebuild/current-plan.md')
    addCheck(checks, currentStateSource.includes('Gemini API full-watch route') || currentStateSource.includes('gemini_api_youtube_url_video_understanding'), 'current state records corrected full-watch route', 'docs/rebuild/current-state.md')
    addCheck(checks, currentSprintBefore?.sprint?.activeBlockerCardId === CARD_ID, 'proof started from Mark active card', currentSprintBefore?.sprint?.activeBlockerCardId || 'missing')
    const hasExternalWritePath = /\b(sendTelegram|sendMail|sendEmail|submitForm|completePurchase|runPurchase|externalWrite|createBacklogItem)\s*\(/.test(`${moduleSource}\n${scriptSource}`)
    addCheck(checks, !hasExternalWritePath, 'proof has no external notification/purchase/form/backlog writer', 'external write helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      reportArtifactId: REPORT_ARTIFACT_ID,
      snapshot: {
        status: snapshot?.status || null,
        videoId: snapshot?.video?.videoId || null,
        recommendedModel: snapshot?.modelComparison?.recommendation?.recommendedModel || null,
        modelScores: list(snapshot?.modelComparison?.modelScores).map(score => ({
          model: score.model,
          ok: score.ok,
          eyesScore: score.eyesScore,
          qualityDelta: score.qualityDelta,
          timestampedVisualEvidenceCount: score.timestampedVisualEvidenceCount,
          buildCandidateCount: score.buildCandidateCount,
          usageTotalTokens: score.usageTotalTokens,
          qualityPer1kTokens: score.qualityPer1kTokens,
          error: score.error,
        })),
        buildCandidates: list(snapshot?.topBuildCandidates).length,
        approvalRequiredLinks: list(snapshot?.sourcePackage?.approvalRequiredLinks).length,
        safeResourceFollows: list(snapshot?.sourcePackage?.safeResourceFollowResults).length,
      },
      checks,
      failed,
    }
    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Mark Kashef God Mode proof: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Mark Kashef God Mode proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
