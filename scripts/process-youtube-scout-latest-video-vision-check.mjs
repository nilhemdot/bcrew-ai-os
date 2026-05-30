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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  recordIntelligenceAtomHit,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-intelligence-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
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
  YOUTUBE_SCOUT_CHANGED_FILES as CHANGED_FILES,
  YOUTUBE_SCOUT_CHANNEL_URL,
  YOUTUBE_SCOUT_COMMANDS as PROOF_COMMANDS,
  YOUTUBE_SCOUT_DISCOVERY_LIMIT,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_APPROVAL_PATH as APPROVAL_PATH,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID as CARD_ID,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY as CLOSEOUT_KEY,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_PATH as CLOSEOUT_PATH,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_NEXT_CARD_ID as NEXT_CARD_ID,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_PLAN_PATH as PLAN_PATH,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_SCRIPT_PATH as SCRIPT_PATH,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_SPRINT_ID as SPRINT_ID,
  YOUTUBE_SCOUT_NOT_NEXT as NOT_NEXT,
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
  YOUTUBE_SCOUT_SEED_ARTIFACT_ID,
  YOUTUBE_SCOUT_SEED_VIDEO_ID,
  YOUTUBE_SCOUT_SEED_VIDEO_URL,
  buildYoutubeScoutLatestVideoVisionDogfoodProof,
  buildYoutubeScoutLatestVideoVisionSnapshot,
  buildYoutubeScoutLatestVideoVisionWriteSet,
  renderYoutubeScoutLatestVideoVisionCloseout,
  runYoutubeScoutLatest20Discovery,
  runYoutubeScoutSeedVideoCapture,
  verifyYoutubeScoutLatestVideoVisionPersistedProof,
} from '../lib/youtube-scout-latest-video-vision.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'youtube-scout-latest-video-vision'

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

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = stableValue(value[key])
      return acc
    }, {})
}

function stableString(value) {
  return JSON.stringify(stableValue(value))
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
      'lib/web-godmode-live-operator.js',
      'lib/youtube-build-intel-runtime-proof.js',
      'scripts/run-extraction-target.mjs',
      'scripts/extract-video-content.mjs',
      'lib/build-intel-extraction-implementation.js',
      'lib/build-intel-daily-extraction-review.js',
    ],
    existingDocs: [
      'docs/process/web-godmode-live-operator-002-plan.md',
      'docs/process/youtube-build-intel-runtime-proof-001-plan.md',
      PLAN_PATH,
      APPROVAL_PATH,
    ],
    existingScripts: [
      'scripts/process-web-godmode-live-operator-check.mjs',
      'scripts/process-youtube-build-intel-runtime-proof-check.mjs',
      SCRIPT_PATH,
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Foundation remains the source/intelligence truth; Dev Team Hub reads from Foundation instead of creating a separate silo.',
      'Public YouTube scout work is bounded to approved public source items and must not enter paid/private/auth/member/community/comment surfaces.',
      'Resource links are classified and recorded only; purchase, download, opt-in, booking, and form links require Steve approval before follow.',
      'Scout opportunities create proposal-only review routes and atoms; backlog promotion remains approval-gated.',
      'No Meeting Vault Phase B or Drive permission mutation is approved by this lane.',
    ],
    reused: [
      'public YouTube Playwright observation path',
      'seed transcript artifact in shared_communication_artifacts',
      'intelligence report/atom/hit stores',
      'Build Intel deterministic review route builders',
      'Current Sprint live DB truth',
    ],
    notRebuilt: [
      'No new credential registry.',
      'No private-source crawler.',
      'No external notification writer.',
      'No automatic backlog card creator.',
    ],
    exactGap: 'Previous proof opened one seed video; this card discovers Mark Kashef latest/last-20 public videos and converts the seed capture plus discovery into Dev Team review intelligence.',
    overBroadRisk: 'Can drift into Skool/Gumroad/Calendly, private paid/community content, comments/member data, or automatic backlog promotion. This proof records those as approval-bound only.',
    readyBy: 'Steve current-sprint instruction for YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002 plus the approved 9.8+ card plan.',
    readyAt: '2026-05-21T14:30:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `youtube-scout-latest-video-vision-${stableRunId(PLAN_PATH)}`,
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

async function loadTranscriptArtifact() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT artifact_id, source_id, artifact_type, external_id, title,
               source_account, source_container, source_url, participants,
               content_text, content_hash, artifact_created_at, artifact_updated_at,
               metadata, ingested_by, ingested_at, updated_at
        FROM shared_communication_artifacts
        WHERE artifact_id = $1
        LIMIT 1
      `,
      [YOUTUBE_SCOUT_SEED_ARTIFACT_ID],
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      artifactId: row.artifact_id,
      sourceId: row.source_id,
      artifactType: row.artifact_type,
      externalId: row.external_id,
      title: row.title,
      sourceAccount: row.source_account,
      sourceContainer: row.source_container,
      sourceUrl: row.source_url,
      participants: row.participants || [],
      contentText: row.content_text || '',
      contentHash: row.content_hash,
      artifactCreatedAt: row.artifact_created_at,
      artifactUpdatedAt: row.artifact_updated_at,
      metadata: row.metadata || {},
      ingestedBy: row.ingested_by,
      ingestedAt: row.ingested_at,
      updatedAt: row.updated_at,
    }
  } finally {
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

function mapAtom(row = {}) {
  return {
    atomId: row.atom_id,
    sourceId: row.source_id,
    artifactId: row.artifact_id,
    reportArtifactId: row.report_artifact_id,
    status: row.status,
    dedupHash: row.dedup_hash,
    metadata: row.metadata || {},
  }
}

function mapHit(row = {}) {
  return {
    hitId: row.hit_id,
    atomId: row.atom_id,
    sourceId: row.source_id,
    artifactId: row.artifact_id,
    reportArtifactId: row.report_artifact_id,
    metadata: row.metadata || {},
  }
}

async function loadWebGodmodeReport() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, report_type, title, status, source_ids,
               input_artifact_ids, input_atom_ids, action_required_items,
               structured_output_json, metadata
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = 'proof:web-godmode-live-operator-002:mark-kashef-5xrjo38wuyy'
        LIMIT 1
      `,
    )
    return mapReport(result.rows[0] || null)
  } finally {
    await pool.end()
  }
}

async function loadPersistedProof(writeSet = {}) {
  const pool = createPool()
  try {
    const atomIds = list(writeSet.atomInputs).map(atom => atom.atomId)
    const hitIds = list(writeSet.hitInputs).map(hit => hit.hitId)
    const [reportResult, atomResult, hitResult] = await Promise.all([
      pool.query(
        `
          SELECT report_artifact_id, report_type, title, status, source_ids,
                 input_artifact_ids, input_atom_ids, action_required_items,
                 structured_output_json, metadata
          FROM intelligence_report_artifacts
          WHERE report_artifact_id = $1
        `,
        [writeSet.reportArtifact?.reportArtifactId || YOUTUBE_SCOUT_REPORT_ARTIFACT_ID],
      ),
      atomIds.length
        ? pool.query(
          `
            SELECT atom_id, source_id, artifact_id, report_artifact_id, status,
                   dedup_hash, metadata
            FROM intelligence_atoms
            WHERE atom_id = ANY($1::text[])
            ORDER BY atom_id
          `,
          [atomIds],
        )
        : Promise.resolve({ rows: [] }),
      hitIds.length
        ? pool.query(
          `
            SELECT hit_id, atom_id, source_id, artifact_id, report_artifact_id, metadata
            FROM intelligence_atom_hits
            WHERE hit_id = ANY($1::text[])
            ORDER BY hit_id
          `,
          [hitIds],
        )
        : Promise.resolve({ rows: [] }),
    ])
    return {
      report: mapReport(reportResult.rows[0] || null),
      atoms: atomResult.rows.map(mapAtom),
      hits: hitResult.rows.map(mapHit),
    }
  } finally {
    await pool.end()
  }
}

async function persistProof(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'persist YouTube scout report artifact, proposal-only atoms, and evidence hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildYoutubeScoutLatestVideoVisionWriteSet(snapshot)
  let report = await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
  const atoms = []
  const hits = []
  for (const atomInput of writeSet.atomInputs) {
    atoms.push(await upsertIntelligenceAtom(atomInput, ACTOR))
  }
  for (const hitInput of writeSet.hitInputs) {
    hits.push(await recordIntelligenceAtomHit(hitInput, ACTOR))
  }
  report = await upsertIntelligenceReportArtifact({
    ...writeSet.reportArtifact,
    inputAtomIds: atoms.map(atom => atom.atomId || atom.atom_id),
  }, ACTOR)
  return { writeSet, report, atoms, hits }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Mark Kashef public YouTube latest/last-20 videos are discovered bounded; the exact seed video has transcript, description/resource links, visual metadata, scout report, ranked Dev Team opportunities, proposal-only atoms/review routes, and no automatic backlog promotion or external/private-source actions.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'WEB-GODMODE-LIVE-OPERATOR-002 closed under web-godmode-live-operator-v1 with one exact Mark Kashef public video proof.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      channelUrl: YOUTUBE_SCOUT_CHANNEL_URL,
      sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
      seedVideoId: YOUTUBE_SCOUT_SEED_VIDEO_ID,
      reportArtifactId: YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
      publicYoutubeOnly: true,
      discoveryLimit: YOUTUBE_SCOUT_DISCOVERY_LIMIT,
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
    stage: cloned.stage || 'scoping',
    planRef: cloned.planRef || 'docs/process/extractor-overnight-run-guard-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'Overnight extraction guard remains scoped until Foundation approves exact source items, stop conditions, quota controls, and raw health gates.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; continue only with exact source approvals and raw Foundation health green.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not broad crawl Skool, MyICOR, Loom, comments/member, private, paid, or auth-required sources.',
      'Do not mutate credentials or browser profiles.',
      'Stop if exact source approval, quota, artifact, provenance, or raw health proof is missing.',
    ],
    metadata: {
      ...(cloned.metadata || {}),
      previousCloseoutKey: CLOSEOUT_KEY,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = (previous.items || []).map(cloneSprintItem)
  const byId = new Map(items.map(item => [item.cardId, item]))
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 16 }, { closeCard, currentHead })
  const nextItem = buildNextSprintItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: Number(currentItem.order || 16) + 1 }, { currentHead })
  const nextItems = items.map(item => {
    if (item.cardId === CARD_ID) return currentItem
    if (item.cardId === NEXT_CARD_ID) return nextItem
    return item
  })
  if (!byId.has(CARD_ID)) nextItems.push(currentItem)
  if (!byId.has(NEXT_CARD_ID)) nextItems.push(nextItem)
  return nextItems
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
    .map((item, index) => ({ ...item, order: index + 1 }))
}

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; keep private/paid source work approval-bound.`
      : `Build bounded Mark Kashef public YouTube latest/last-20 scout from ${YOUTUBE_SCOUT_CHANNEL_URL} and seed ${YOUTUBE_SCOUT_SEED_VIDEO_URL}.`,
    statusNote: closeCard
      ? `Closed 2026-05-21 under ${CLOSEOUT_KEY}; discovered Mark Kashef public YouTube latest/last-20 videos, reused the exact seed transcript ${YOUTUBE_SCOUT_SEED_ARTIFACT_ID}, captured seed description/resource links and screenshot/visual metadata, persisted scout report ${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID}, proposal-only atoms/review routes, approval-required resource links, and no auto backlog cards or external/private-source actions. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; public YouTube only, seed video plus bounded latest/last-20 discovery, no external writes or auto backlog promotion.`,
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update YouTube scout backlog card, Plan Critic row, and Current Sprint overlay',
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
          currentStatus: closeCard ? 'youtube_scout_latest_video_vision_closed' : 'youtube_scout_latest_video_vision_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: build only if exact source approvals, quota/stop controls, artifact/provenance proof, and raw Foundation health stay green.`
            : `${CARD_ID}: bounded Mark Kashef public YouTube latest/last-20 scout.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
          publicYoutubeOnly: !closeCard,
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
      reason: 'Steve ordered the bounded Mark Kashef public YouTube scout after the live operator proof.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let persistence = null
  let persisted = null

  await initFoundationDb()
  try {
    const now = new Date().toISOString()
    const [discovery, seedCapture] = await Promise.all([
      runYoutubeScoutLatest20Discovery({ now }),
      runYoutubeScoutSeedVideoCapture({ now }),
    ])
    const [
      packageJson,
      moduleSource,
      scriptSource,
      liveOperatorSource,
      runtimeProofSource,
      closeoutRegistrySource,
      coverageSource,
      planSource,
      beforeFoundationSnapshot,
      currentSprint,
      transcriptArtifact,
      webGodmodeReport,
      llmRuntimeBefore,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile('lib/youtube-scout-latest-video-vision.js'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('lib/web-godmode-live-operator.js'),
      readRepoFile('lib/youtube-build-intel-runtime-proof.js'),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile(PLAN_PATH),
      getFoundationSnapshot(),
      getActiveFoundationCurrentSprint(),
      loadTranscriptArtifact(),
      loadWebGodmodeReport(),
      getFoundationSnapshot().then(snapshot => snapshot.llmRuntime || {}),
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
      declaredRisk: 'Full ship gate because this card launches public YouTube browser discovery/capture, writes Foundation intelligence report/atoms/hits, updates Current Sprint truth, and must preserve no-external-write/private-source boundaries.',
      repoRoot,
    })
    const snapshot = buildYoutubeScoutLatestVideoVisionSnapshot({
      discovery,
      seedCapture,
      transcriptArtifact,
      webGodmodeReport,
      backlogItems: beforeFoundationSnapshot.backlogItems || [],
      currentSprint,
      generatedAt: now,
    })
    let effectiveSnapshot = snapshot
    let writeSet = buildYoutubeScoutLatestVideoVisionWriteSet(effectiveSnapshot)
    const dogfood = buildYoutubeScoutLatestVideoVisionDogfoodProof()

    if (args.closeCard || args.apply) {
      if (!snapshot.ok) throw new Error(`Scout snapshot blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
      const persistedWrite = await persistProof(snapshot)
      writeSet = persistedWrite.writeSet
      persisted = await loadPersistedProof(writeSet)
      persistence = verifyYoutubeScoutLatestVideoVisionPersistedProof({
        snapshot: effectiveSnapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
      if (args.closeCard) {
        await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderYoutubeScoutLatestVideoVisionCloseout(effectiveSnapshot), 'utf8')
        await ensureLiveState({ closeCard: true, planReview })
      } else {
        await ensureLiveState({ closeCard: false, planReview })
      }
    } else {
      persisted = await loadPersistedProof(writeSet)
      persistence = verifyYoutubeScoutLatestVideoVisionPersistedProof({
        snapshot: effectiveSnapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
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
    const llmRuntimeAfter = (await getFoundationSnapshot()).llmRuntime || {}

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for YouTube scout', buildPlanCriticResultSummary(planReview))
    addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card.lane)), 'live backlog card exists with expected lane', card ? `${card.id}:${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, nextCard && ['scoped', 'executing', 'done', 'research'].includes(nextCard.lane), 'next card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker is reconciled', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, !args.closeCard || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks YouTube scout done after close', activeItem?.stage || 'missing')
    addCheck(checks, !args.closeCard || nextItem?.stage === 'scoping', 'Current Sprint advances to next scoped card after close', nextItem?.stage || 'missing')
    addCheck(checks, effectiveSnapshot.ok === true, 'scout snapshot is healthy', effectiveSnapshot.failures.map(failure => failure.check).join(', ') || 'healthy')
    addCheck(checks, discovery.channelUrl === YOUTUBE_SCOUT_CHANNEL_URL && discovery.videoCount >= 1 && discovery.videoCount <= YOUTUBE_SCOUT_DISCOVERY_LIMIT, 'bounded latest/last-20 discovery succeeded', `${discovery.videoCount}/${YOUTUBE_SCOUT_DISCOVERY_LIMIT}`)
    addCheck(checks, discovery.latestVideo?.videoId && discovery.seedVideo?.videoId === YOUTUBE_SCOUT_SEED_VIDEO_ID, 'latest and exact seed video are recorded', `${discovery.latestVideo?.videoId || 'missing'} / ${discovery.seedVideo?.videoId || 'missing'}`)
    addCheck(checks, seedCapture.targetUrl === YOUTUBE_SCOUT_SEED_VIDEO_URL && seedCapture.responseOk === true, 'seed video browser capture succeeded', `${seedCapture.responseStatus}/${seedCapture.finalUrl}`)
    addCheck(checks, transcriptArtifact?.artifactId === YOUTUBE_SCOUT_SEED_ARTIFACT_ID && transcriptArtifact?.contentText?.length >= 1000, 'seed transcript artifact is persisted', transcriptArtifact ? `${transcriptArtifact.artifactId}/${transcriptArtifact.contentText.length}` : 'missing')
    addCheck(checks, effectiveSnapshot.resourceLinks.length >= 1 && effectiveSnapshot.resourceLinks.every(link => link.canFollowAutomatically === false), 'resource links were classified and not followed', `${effectiveSnapshot.resourceLinks.length} link(s)`)
    addCheck(checks, effectiveSnapshot.visualMetadata?.channelScreenshot?.bytes > 1000 && list(effectiveSnapshot.visualMetadata?.seedScreenshots).some(item => item.bytes > 1000), 'channel and seed visual metadata captured', 'local temp screenshot hashes')
    addCheck(checks, effectiveSnapshot.opportunities.length >= 1 && effectiveSnapshot.reviewRoutes.every(route => route.proposalOnly && !route.writesBacklog && !route.externalWrites), 'ranked opportunities are proposal-only for Dev Team review', `${effectiveSnapshot.opportunities.length} opportunities`)
    addCheck(checks, effectiveSnapshot.atomInputs.length >= 1 && effectiveSnapshot.hitInputs.length === effectiveSnapshot.atomInputs.length, 'proposal atoms and evidence hits are complete', `${effectiveSnapshot.atomInputs.length}/${effectiveSnapshot.hitInputs.length}`)
    addCheck(checks, !args.closeCard || persistence?.ok === true, 'persisted report, atoms, and hits read back', persistence?.failures?.map(failure => failure.check).join(', ') || 'ok')
    addCheck(checks, webGodmodeReport?.reportArtifactId === 'proof:web-godmode-live-operator-002:mark-kashef-5xrjo38wuyy', 'previous one-video live operator report is linked', webGodmodeReport?.reportArtifactId || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood rejects private/weak/external-follow and proves auto-promotion stays detectable', JSON.stringify(dogfood.cases))
    addCheck(checks, packageJson.scripts?.['process:youtube-scout-latest-video-vision-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:youtube-scout-latest-video-vision-check'] || 'missing')
    addCheck(checks, moduleSource.includes('runYoutubeScoutLatest20Discovery') && liveOperatorSource.includes('runWebGodmodeLiveBrowserObservation') && runtimeProofSource.includes('buildYoutubeBuildIntelRuntimeProofSnapshot'), 'module reuses existing browser/runtime Build Intel paths', 'discovery + seed capture + runtime proof sources present')
    addCheck(checks, scriptSource.includes('createsBacklogCardsAutomatically') && scriptSource.includes('upsertIntelligenceReportArtifact'), 'focused script persists report without auto backlog promotion', 'report persistence markers present')
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes YouTube scout', 'lib/foundation-build-closeout-intelligence-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves YouTube scout', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes YouTube scout card ID', 'coverage card ID present')
    addCheck(checks, !args.closeCard || await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists after close', CLOSEOUT_PATH)
    addCheck(checks, stableString(llmRuntimeBefore.credentials || []) === stableString(llmRuntimeAfter.credentials || []), 'proof does not mutate credential truth', 'credentials unchanged')
    const hasExternalWritePath = /\b(sendTelegram|sendMail|sendEmail|submitForm|completePurchase|runPurchase|externalWrite|createBacklogItem)\s*\(/.test(`${moduleSource}\n${scriptSource}`)
    addCheck(checks, !hasExternalWritePath, 'proof has no external notification/purchase/form/backlog writer', 'external write helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
      channelUrl: YOUTUBE_SCOUT_CHANNEL_URL,
      reportArtifactId: YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
      snapshot: {
        status: effectiveSnapshot.status,
        discoveredVideoCount: discovery.videoCount,
        latestVideo: discovery.latestVideo,
        seedVideo: discovery.seedVideo,
        opportunities: effectiveSnapshot.opportunities.map(item => ({ rank: item.rank, theme: item.theme, title: item.title })),
        atoms: effectiveSnapshot.atomInputs.length,
        hits: effectiveSnapshot.hitInputs.length,
        approvalRequiredLinks: effectiveSnapshot.approvalRequiredLinks.length,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`YouTube scout latest video vision proof: ${result.status}`)
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
  console.error('YouTube scout latest video vision proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
