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
  getIntelligenceReportBundle,
  getPlanCriticRunsByCardIds,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
  recordIntelligenceAtomHit,
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
  GOD_MODE_EYES_APPROVED_VIDEOS,
  GOD_MODE_EYES_CHANGED_FILES as CHANGED_FILES,
  GOD_MODE_EYES_NOT_NEXT as NOT_NEXT,
  GOD_MODE_EYES_PROOF_COMMANDS as PROOF_COMMANDS,
  GOD_MODE_EYES_SOURCE_ID,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_APPROVAL_PATH as APPROVAL_PATH,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID as CARD_ID,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CLOSEOUT_KEY as CLOSEOUT_KEY,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CLOSEOUT_PATH as CLOSEOUT_PATH,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_NEXT_CARD_ID as NEXT_CARD_ID,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_PLAN_PATH as PLAN_PATH,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID as REPORT_ARTIFACT_ID,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_PATH as REPORT_PATH,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_SCRIPT_PATH as SCRIPT_PATH,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_SPRINT_ID as SPRINT_ID,
  buildGodModeEyesDogfoodProof,
  buildGodModeEyesQualitySnapshot,
  buildGodModeEyesWriteSet,
  buildSnapshotFromEyesReport,
  capturePublicYoutubePageEvidence,
  renderGodModeEyesCloseout,
  renderGodModeEyesQualityReport,
  runGeminiEyesForVideo,
  verifyGodModeEyesPersistedProof,
} from '../lib/god-mode-extractor-eyes-quality-loop.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'god-mode-extractor-eyes-quality-loop'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    liveGemini: argv.includes('--live-gemini') || argv.includes('--live-gemini=true'),
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

function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)))
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
      'lib/gemini-video-brain-route.js',
      'lib/god-mode-extractor-research-swarm.js',
      'lib/youtube-build-intel-link-resource.js',
      'lib/web-godmode-live-operator.js',
      'lib/dev-team-hub.js',
    ],
    existingDocs: [
      'docs/source-notes/god-mode-extractor-research-swarm-2026-05-23.md',
      'docs/process/multimodal-extractor-001-plan.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-gemini-video-brain-route-check.mjs',
      'scripts/process-god-mode-extractor-research-swarm-check.mjs',
      'scripts/process-youtube-build-intel-link-resource-check.mjs',
    ],
    existingPolicy: [
      'Foundation remains source/intelligence truth; Dev Team Hub reads from Foundation instead of creating a Dev-only store.',
      'Current daily YouTube watch rows are metadata only, not watched/analyzed videos.',
      'Eyes V0 must prove quality on 3-5 approved public videos before Mark last-50 or broader creator scale-up.',
      'Bulk screenshot every two seconds is rejected as the default.',
      'Private/auth/paid/community sources require exact approval and content-use boundary.',
    ],
    reused: [
      'Gemini video brain route',
      'Brain Fleet quota ledger',
      'YouTube page/browser evidence capture pattern',
      'intelligence_report_artifacts/intelligence_atoms/intelligence_atom_hits',
      'Dev Team Hub source-backed API',
    ],
    notRebuilt: [
      'No new model provider adapter.',
      'No private source crawler.',
      'No bulk screenshot loop.',
      'No automatic backlog promotion.',
    ],
    exactGap: 'The system needs a real quality comparison proving whether visual/video understanding improves Build Intel before scaling extraction.',
    overBroadRisk: 'This can drift into broad creator extraction, private links, code/package copying, or storing raw video/screenshot bytes.',
    readyBy: 'Steve May 23 correction: test 3-5 videos with current mode, improve, rerun, and compare before extracting 50 videos.',
    readyAt: '2026-05-23T10:30:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `god-mode-extractor-eyes-quality-loop-${stableRunId(PLAN_PATH)}`,
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

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; add quota/stop/morning-review guardrails before any creator scale-up.`
      : 'Run the bounded Eyes V0 quality loop on 3 approved public videos and compare it against current transcript/description mode.',
    statusNote: closeCard
      ? `Closed 2026-05-23 under ${CLOSEOUT_KEY}; report ${REPORT_ARTIFACT_ID} and ${REPORT_PATH} compare current mode vs Gemini video Eyes V0, persist proposal-only build candidates/atoms/hits, and advance to ${NEXT_CARD_ID} before any Mark last-50 or broader latest-20 scale-up.`
      : `Executing ${CLOSEOUT_KEY}; 3 exact public YouTube videos only, Gemini video understanding allowed through Brain Fleet ledger, no private/auth crawl, no bulk screenshot loop, no auto backlog promotion.`,
  }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Three to five exact approved public YouTube videos have current-mode baseline, page/resource evidence, Gemini video-understanding Eyes output, quality comparison, persisted Foundation report/atoms/hits, Dev Team Hub read path, and no auto backlog/external/private actions.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: closeCard ? `Closed under ${CLOSEOUT_KEY}.` : 'Active sprint card is building.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      nextCardId: NEXT_CARD_ID,
      minEyesProofVideos: 3,
      maxEyesProofVideos: 5,
      publicYoutubeOnly: true,
      usesGeminiVideoUnderstanding: true,
      usesBrainFleetLedger: true,
      noBulkScreenshotDefault: true,
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      privateOrPaidAccess: false,
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildNextSprintItem(item = {}, { currentHead = '' } = {}) {
  const cloned = cloneSprintItem(item)
  return {
    ...cloned,
    cardId: NEXT_CARD_ID,
    stage: cloned.stage || 'scoping',
    planRef: cloned.planRef || 'docs/process/extractor-overnight-run-guard-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'Extractor scale-up guard defines source approvals, quotas, stop conditions, artifact/provenance controls, route budgets, duplicate guards, retry limits, and morning review before broader runs.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:current-sprint-active-card-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run process:foundation-plan-reconcile-check -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; scale only through guardrails.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not run Mark last-50 or broader latest-20 until quota, stop, artifact, and morning-review guardrails pass.',
      'Do not crawl private, paid, auth, member, comments, Skool, MyICOR, Gumroad, Calendly, or course sources.',
      'Do not mutate credentials, browser profiles, source systems, provider config, Drive permissions, or external systems.',
    ],
    metadata: {
      ...(cloned.metadata || {}),
      previousCloseoutKey: CLOSEOUT_KEY,
      repoPosture: repoPosture(currentHead),
      blockersBlockActionsNotSprint: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = (previous.items || []).map(cloneSprintItem)
  const byId = new Map(items.map(item => [item.cardId, item]))
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 5 }, { closeCard, currentHead })
  const nextItem = buildNextSprintItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: Number(currentItem.order || 5) + 1 }, { currentHead })
  const nextItems = items.map(item => {
    if (item.cardId === CARD_ID) return currentItem
    if (item.cardId === NEXT_CARD_ID) return nextItem
    return item
  })
  if (!byId.has(CARD_ID)) nextItems.push(currentItem)
  if (!byId.has(NEXT_CARD_ID)) nextItems.push(nextItem)
  return nextItems.sort((a, b) => Number(a.order || 999) - Number(b.order || 999)).map((item, index) => ({ ...item, order: index + 1, sprintOrder: index + 1 }))
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update Eyes quality loop backlog card, Plan Critic row, and Current Sprint overlay',
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
          currentStatus: closeCard ? 'eyes_quality_loop_closed_guard_next' : 'eyes_quality_loop_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: add quota/stop/morning-review guardrails before broader public YouTube extraction.`
            : `${CARD_ID}: compare current mode vs Gemini Eyes V0 on 3 approved public videos.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          eyesQualityLoopReportArtifactId: REPORT_ARTIFACT_ID,
          eyesBeforeLast50: true,
          noWeakExtractionScaleUp: true,
          noBulkScreenshotDefault: true,
          noAutoBacklogPromotion: true,
          noExternalWrites: true,
          publicYoutubeOnly: true,
          buildLaneCount: 1,
          blockersBlockActionsNotSprint: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve ordered Eyes V0 quality proof before creator scale-up.',
    },
  )
}

async function loadTranscriptArtifacts() {
  const archive = await getSharedCommunicationArchiveSnapshot({
    sourceId: GOD_MODE_EYES_SOURCE_ID,
    artifactType: 'video_transcript',
    limit: 500,
    includeSensitive: true,
  })
  return archive.items || []
}

async function buildLiveSnapshot({ now = new Date().toISOString(), liveGemini = false } = {}) {
  if (!liveGemini) throw new Error('Eyes quality loop requires --live-gemini for the first close-card proof.')
  const transcriptArtifacts = await loadTranscriptArtifacts()
  const pageEvidence = []
  const eyesResults = []
  for (const [index, video] of GOD_MODE_EYES_APPROVED_VIDEOS.entries()) {
    const evidence = await capturePublicYoutubePageEvidence({ video, now })
    pageEvidence.push(evidence)
    const interim = buildGodModeEyesQualitySnapshot({
      generatedAt: now,
      transcriptArtifacts,
      pageEvidence,
      eyesResults,
      liveGemini,
    })
    const currentVideo = interim.videoResults.find(item => item.video.videoId === video.videoId)
    const eyes = await runGeminiEyesForVideo({
      video,
      baseline: currentVideo.baseline,
      pageEvidence: evidence,
      actor: ACTOR,
      runId: now,
    })
    eyesResults.push(eyes)
    if (index < GOD_MODE_EYES_APPROVED_VIDEOS.length - 1) {
      await sleep(45000)
    }
  }
  return buildGodModeEyesQualitySnapshot({
    generatedAt: now,
    transcriptArtifacts,
    pageEvidence,
    eyesResults,
    liveGemini,
  })
}

async function persistProof(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'persist Eyes quality loop report, proposal-only atoms, and evidence hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildGodModeEyesWriteSet(snapshot)
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

async function main() {
  const args = parseArgs()
  const checks = []
  let snapshot = null
  let persistence = null
  let persisted = null

  await initFoundationDb()
  try {
    const now = new Date().toISOString()
    const [
      packageJson,
      moduleSource,
      scriptSource,
      devHubSource,
      routeSource,
      closeoutRegistrySource,
      coverageSource,
      planSource,
      currentSprintBefore,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile('lib/god-mode-extractor-eyes-quality-loop.js'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('lib/dev-team-hub.js'),
      readRepoFile('lib/foundation-build-intel-routes.js'),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile(PLAN_PATH),
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
      declaredRisk: 'Full ship gate because this card performs live provider video-understanding calls, writes Foundation reports/atoms/hits, updates Dev Team Hub data contracts, and advances Current Sprint truth.',
      repoRoot,
    })

    if (args.closeCard || args.apply) {
      const existingPersisted = await loadPersistedProof()
      const existingSnapshot = buildSnapshotFromEyesReport(existingPersisted.report)
      const canReusePersistedEyesProof = !args.liveGemini &&
        existingSnapshot?.ok === true &&
        existingPersisted.report?.metadata?.cardId === CARD_ID

      if (canReusePersistedEyesProof) {
        snapshot = existingSnapshot
        persisted = existingPersisted
        persistence = verifyGodModeEyesPersistedProof({ snapshot, ...persisted })
      } else {
        snapshot = await buildLiveSnapshot({ now, liveGemini: args.liveGemini })
        if (!snapshot.ok) throw new Error(`Eyes quality loop blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
        await fs.writeFile(path.join(repoRoot, REPORT_PATH), renderGodModeEyesQualityReport(snapshot), 'utf8')
        const persistedWrite = await persistProof(snapshot)
        persisted = await loadPersistedProof(persistedWrite.writeSet)
        persistence = verifyGodModeEyesPersistedProof({ snapshot, ...persisted })
      }
      if (args.closeCard) {
        await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderGodModeEyesCloseout(snapshot), 'utf8')
        await ensureLiveState({ closeCard: true, planReview })
      } else {
        await ensureLiveState({ closeCard: false, planReview })
      }
    } else {
      persisted = await loadPersistedProof()
      snapshot = buildSnapshotFromEyesReport(persisted.report)
      persistence = verifyGodModeEyesPersistedProof({ snapshot, ...persisted })
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
    const cards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const card = cards.find(item => item.id === CARD_ID) || null
    const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
    const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
    const nextItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
    const dogfood = buildGodModeEyesDogfoodProof()
    const closedPosture = args.closeCard || card?.lane === 'done' || activeItem?.stage === 'done_this_sprint'
    const expectedActiveCardId = closedPosture ? NEXT_CARD_ID : CARD_ID

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Eyes quality loop', buildPlanCriticResultSummary(planReview))
    addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || planReview.status === 'pass', 'durable or in-memory Plan Critic pass exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'pending write')
    addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card.lane)), 'live backlog card exists with expected lane', card ? `${card.id}:${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, nextCard && ['scoped', 'executing', 'done', 'research'].includes(nextCard.lane), 'next guard card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === expectedActiveCardId, 'Current Sprint active blocker is reconciled', `${activeSprint.sprint?.activeBlockerCardId || 'missing'} / expected ${expectedActiveCardId}`)
    addCheck(checks, !closedPosture || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks Eyes loop done after close', activeItem?.stage || 'missing')
    addCheck(checks, !closedPosture || nextItem?.stage === 'scoping', 'Current Sprint advances to guard after close', nextItem?.stage || 'missing')
    addCheck(checks, snapshot?.ok === true, 'Eyes quality snapshot is healthy', snapshot?.failures?.map(failure => failure.check).join(', ') || snapshot?.status || 'missing')
    addCheck(checks, snapshot?.summary?.videoCount >= 3 && snapshot?.summary?.videoCount <= 5, 'bounded Eyes proof used 3-5 videos', `${snapshot?.summary?.videoCount || 0}`)
    addCheck(checks, snapshot?.summary?.totalTimestampedVisual >= 3, 'Eyes proof captured timestamped visual evidence', `${snapshot?.summary?.totalTimestampedVisual || 0}`)
    addCheck(checks, snapshot?.summary?.totalBuildCandidates >= 3, 'Eyes proof emitted build candidates', `${snapshot?.summary?.totalBuildCandidates || 0}`)
    addCheck(checks, snapshot?.summary?.averageQualityDelta >= 15, 'Eyes quality delta beats baseline', `${snapshot?.summary?.averageQualityDelta || 0}`)
    addCheck(checks, list(snapshot?.videoResults).every(item => item.eyes?.provider === 'gemini' && item.eyes?.callId), 'each video has ledgered Gemini Eyes call', list(snapshot?.videoResults).map(item => `${item.video.videoId}:${item.eyes?.callId || 'missing'}`).join(', '))
    addCheck(checks, list(snapshot?.videoResults).every(item => item.pageEvidence?.responseOk === true && item.pageEvidence?.screenshotArtifact?.storageClass === 'local_temp_not_committed'), 'page evidence is public/no-auth and screenshots are local-temp only', list(snapshot?.videoResults).map(item => `${item.video.videoId}:${item.pageEvidence?.responseOk}`).join(', '))
    addCheck(checks, persistence?.ok === true, 'persisted report, atoms, and hits read back', persistence?.failures?.map(failure => failure.check).join(', ') || 'ok')
    addCheck(checks, dogfood.ok === true, 'dogfood rejects transcript-only scale-up and accepts bounded Eyes proof', JSON.stringify(dogfood.cases))
    addCheck(checks, packageJson.scripts?.['process:god-mode-extractor-eyes-quality-loop-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:god-mode-extractor-eyes-quality-loop-check'] || 'missing')
    addCheck(checks, moduleSource.includes('runGeminiEyesForVideo') && moduleSource.includes('buildGodModeEyesQualitySnapshot'), 'module owns Eyes quality loop and Gemini call path', 'module markers present')
    addCheck(checks, scriptSource.includes('liveGemini') && scriptSource.includes('persistProof'), 'focused script requires live Gemini for first proof and persists Foundation truth', 'script markers present')
    addCheck(checks, devHubSource.includes('GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID') && routeSource.includes('eyesBundle'), 'Dev Team Hub reads Eyes report from Foundation truth', 'Dev Hub route markers present')
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes Eyes quality loop card', 'lib/foundation-build-closeout-intelligence-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves Eyes quality loop', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes Eyes quality loop card ID', 'coverage card ID present')
    addCheck(checks, !args.closeCard || await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists after close', CLOSEOUT_PATH)
    addCheck(checks, currentSprintBefore?.sprint?.activeBlockerCardId === CARD_ID || card?.lane === 'done', 'proof started from active card or verified closeout rerun', currentSprintBefore?.sprint?.activeBlockerCardId || 'missing')
    const hasExternalWritePath = /\b(sendTelegram|sendMail|sendEmail|submitForm|completePurchase|runPurchase|externalWrite|createBacklogItem)\s*\(/.test(`${moduleSource}\n${scriptSource}`)
    addCheck(checks, !hasExternalWritePath, 'proof has no external notification/purchase/form/backlog writer', 'external write helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      nextCardId: NEXT_CARD_ID,
      snapshot: {
        status: snapshot?.status,
        videoCount: snapshot?.summary?.videoCount || 0,
        improvedVideoCount: snapshot?.summary?.improvedVideoCount || 0,
        averageQualityDelta: snapshot?.summary?.averageQualityDelta || 0,
        timestampedVisualEvidence: snapshot?.summary?.totalTimestampedVisual || 0,
        buildCandidates: snapshot?.summary?.totalBuildCandidates || 0,
        approvalRequiredLinks: snapshot?.summary?.approvalRequiredLinkCount || 0,
      },
      checks,
      failed,
    }
    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`God Mode Eyes quality loop proof: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('God Mode Eyes quality loop proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
