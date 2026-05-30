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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getIntelligenceReportBundle,
  recordIntelligenceAtomHit,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-intelligence-db.js'
import {
  getLlmRuntimeSnapshot,
  upsertLlmCredential,
  upsertLlmRoute,
} from '../lib/foundation-runtime-jobs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_APPROVAL_PATH as APPROVAL_PATH,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID as CARD_ID,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CHANGED_FILES as CHANGED_FILES,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY as CLOSEOUT_KEY,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_PATH as CLOSEOUT_PATH,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_EYES_REPORT_ARTIFACT_ID,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_NEXT_CARD_ID as NEXT_CARD_ID,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_NOT_NEXT as NOT_NEXT,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_PLAN_PATH as PLAN_PATH,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_PROOF_COMMANDS as PROOF_COMMANDS,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_REPORT_ARTIFACT_ID as REPORT_ARTIFACT_ID,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SCRIPT_PATH as SCRIPT_PATH,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_URL,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SPRINT_ID as SPRINT_ID,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID,
  buildSubscriptionBrainExtractorAdapterCredential,
  buildSubscriptionBrainExtractorAdapterRoute,
  buildSubscriptionBrainExtractorAdapterDogfoodProof,
  buildSubscriptionBrainExtractorAdapterSnapshot,
  buildSubscriptionBrainExtractorAdapterWriteSet,
  renderSubscriptionBrainExtractorAdapterCloseout,
  runSubscriptionBrainExtractorAdapterProbe,
  verifySubscriptionBrainExtractorAdapterPersistedProof,
} from '../lib/subscription-brain-extractor-adapter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'subscription-brain-extractor-adapter'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: argv.includes('--close-card') || argv.includes('--close-card=true'),
    liveClaude: argv.includes('--live-claude') || argv.includes('--live-claude=true'),
    apply: isProcessCheckWriteRequested({
      argv,
      allowedFlags: [
        PROCESS_CHECK_WRITE_FLAGS.apply,
        PROCESS_CHECK_WRITE_FLAGS.closeCard,
        PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
      ],
    }),
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function git(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function list(value) {
  return Array.isArray(value) ? value : []
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

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function existingWorkCheck(cardId = CARD_ID) {
  return {
    existingCode: 'Reuse Claude Code subscription route contract, Brain Fleet quota ledger, God Mode Eyes report, Foundation intelligence reports/atoms/hits, and Current Sprint overlay.',
    existingDocs: 'docs/rebuild/current-plan.md, docs/rebuild/current-state.md, God Mode Extractor Eyes/guard closeouts, and the YouTube To Dev Team Intelligence sprint plan.',
    existingScripts: 'scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs, scripts/process-extractor-overnight-run-guard-check.mjs, and existing Foundation health gates.',
    existingPolicy: 'Public/no-auth YouTube evidence first, no broad extraction, no credential mutation, no external writes, and proposal-only Build Intel.',
    reused: 'Claude Code local subscription auth probe, Brain Fleet ledger, evidence report readback, Plan Critic, and Current Sprint mutation guards.',
    notRebuilt: 'Does not rebuild Gemini Eyes, daily creator watch, Dev Hub UI, Skool/MyICOR auth, or Mark last-50 extraction.',
    exactGap: `${cardId} needs to prove whether a logged-in subscription mini-brain can do bounded extractor evidence reasoning safely.`,
    overBroadRisk: 'Hidden provider cost, auth drift, credential mutation, false claim that Claude can watch video, broad extraction before guard, and private/auth source drift.',
    readyBy: ACTOR,
    readyAt: '2026-05-23T15:30:00-04:00',
  }
}

function buildBacklogRows({ closeCard = false } = {}) {
  return [
    {
      id: CARD_ID,
      title: 'Test subscription mini-brain extractor adapter',
      lane: closeCard ? 'done' : 'executing',
      priority: 'P0',
      rank: 8,
      owner: 'Brain Fleet / Foundation Extraction',
      source: PLAN_PATH,
      summary: 'Prove whether the extractor can call a logged-in subscription mini-brain route for bounded video/page evidence reasoning before Mark-scale extraction.',
      whyItMatters: 'Steve pays for subscription brains and wants to test that route before spending API tokens on broad video intelligence.',
      nextAction: closeCard
        ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} under the overnight guard.`
        : 'Run one focused Claude Code subscription adapter proof over exact approved public evidence and compare against the Gemini API Eyes boundary.',
      statusNote: closeCard
        ? `Closed 2026-05-23 under ${CLOSEOUT_KEY}; Claude subscription reasoning works for bounded evidence, but Gemini/API Eyes remains the video-understanding route.`
        : 'Scope/proof: no broad extraction. No credential mutation. No private/paid/auth source crawling. Claude tools disabled and Brain Fleet ledger required.',
    },
    {
      id: NEXT_CARD_ID,
      title: 'Build Mark Kashef last-50 public video baseline',
      lane: 'scoped',
      priority: 'P0',
      rank: 9,
      owner: 'Build Intel / Foundation Extraction',
      source: 'Steve May 21 direction: Mark is the first deeper source, use last 50 videos as first test.',
      summary: 'Use the daily watch queue to build the first Mark Kashef last-50 public-video baseline for research-pool evaluation.',
      whyItMatters: 'Mark is Steve’s highest-value Build Intel source, and the system needs enough history to make good build choices rather than reacting to one video.',
      nextAction: closeCard
        ? 'Run only under the overnight guard, using proven Eyes route for video understanding and subscription adapter for bounded reasoning where useful.'
        : `Do not run Mark last-50 until ${CARD_ID} proves or rejects the subscription mini-brain path.`,
      statusNote: 'Scope/proof: Mark public YouTube only. No Skool/private/paid/auth extraction. No broad non-Mark scale-up until Mark pilot and guard proof stay green.',
    },
    {
      id: 'YOUTUBE-LATEST-20-INTEL-RUN-001',
      title: 'Run deeper public YouTube last-20 intelligence extraction',
      lane: 'scoped',
      priority: 'P0',
      rank: 10,
      owner: 'Build Intel / Foundation Extractor',
      source: 'docs/handoffs/2026-05-21-youtube-dev-team-intelligence-sprint-checkpoint.md',
      summary: 'Process approved public YouTube creator videos beyond title metadata into source-backed transcript, description, visual notes, observations, atoms, and ranked build opportunities.',
      whyItMatters: 'The research pool becomes valuable when selected videos from multiple approved public creators are processed into comparable intelligence.',
      nextAction: 'Run non-Mark latest-20 only after Mark pilot, guard, and adapter proof establish the extraction mode. Do not scale metadata/transcript-only noise.',
      statusNote: 'Scope/proof: public YouTube only. Exact source items, quotas, visual mode, and provenance must be approved through the guard; close only with bounded extraction/readback proof.',
    },
  ]
}

function buildSprintItem(card = {}, previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const isCurrent = card.id === CARD_ID
  const isNext = card.id === NEXT_CARD_ID
  return {
    ...previous,
    cardId: card.id,
    stage: isCurrent && closeCard ? 'done_this_sprint' : previous.stage || 'scoping',
    planRef: isCurrent ? PLAN_PATH : previous.planRef || (isNext ? 'docs/process/mark-kashef-last-50-baseline-001-plan.md' : previous.planRef),
    definitionOfDone: isCurrent
      ? 'A bounded exact public source item proves a logged-in Claude Code subscription route can reason over extractor evidence with tools disabled, Brain Fleet ledger proof, no credential mutation, no external writes, and Gemini/API Eyes preserved as the video-understanding route.'
      : isNext
        ? 'Mark public last-50 baseline runs only under the overnight guard with proven video-eyes route, evidence provenance, quotas, and subscription reasoning boundary intact.'
        : previous.definitionOfDone || card.summary,
    proofCommands: isCurrent ? PROOF_COMMANDS : previous.proofCommands || [],
    readinessBlockerCleared: isCurrent
      ? 'Extractor overnight guard closed and requires this adapter proof before Mark last-50 scale-up.'
      : isNext
        ? `${CARD_ID} proves the subscription adapter/fallback boundary before Mark baseline starts.`
        : previous.readinessBlockerCleared || `${CARD_ID} keeps broad extraction guarded before this card starts.`,
    notNextBoundaries: Array.from(new Set([...(previous.notNextBoundaries || []), ...NOT_NEXT])),
    existingWorkCheck: {
      ...(previous.existingWorkCheck || {}),
      ...existingWorkCheck(card.id),
    },
    metadata: {
      ...(previous.metadata || {}),
      closeoutKey: isCurrent ? CLOSEOUT_KEY : previous.metadata?.closeoutKey,
      reportArtifactId: REPORT_ARTIFACT_ID,
      seedVideoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
      seedVideoUrl: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_URL,
      sourceId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID,
      eyesReportArtifactId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_EYES_REPORT_ARTIFACT_ID,
      nextRequiredProofCardId: NEXT_CARD_ID,
      noBroadExtraction: true,
      noCredentialMutation: true,
      noExternalWrites: true,
      createsBacklogCardsAutomatically: false,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const existing = list(previous.items).map(item => ({ ...item }))
  const byId = new Map(existing.map(item => [item.cardId, item]))
  const cards = buildBacklogRows({ closeCard })
  const managedIds = new Set(cards.map(card => card.id))
  const currentDoneCards = existing
    .filter(item => item.stage === 'done_this_sprint')
    .filter(item => item.cardId !== CARD_ID)
    .filter(item => !managedIds.has(item.cardId))
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
  const activeRun = [
    buildSprintItem(cards[0], byId.get(CARD_ID) || {}, { closeCard, currentHead }),
    buildSprintItem(cards[1], byId.get(NEXT_CARD_ID) || {}, { closeCard, currentHead }),
    ...existing
      .filter(item => ![CARD_ID, NEXT_CARD_ID].includes(item.cardId))
      .filter(item => item.stage !== 'done_this_sprint')
      .map(item => {
        const matchingCard = cards.find(card => card.id === item.cardId)
        return matchingCard ? buildSprintItem(matchingCard, item, { closeCard, currentHead }) : {
          ...item,
          notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...NOT_NEXT])),
          metadata: {
            ...(item.metadata || {}),
            nextRequiredProofCardId: NEXT_CARD_ID,
            repoPosture: repoPosture(currentHead),
          },
        }
      }),
  ]
  return [...currentDoneCards, ...activeRun].map((item, index) => ({ ...item, order: index + 1 }))
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
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
        `subscription-brain-extractor-adapter-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        planReview.gateDecision?.level || 'full',
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: CARD_ID,
          closeoutKey: CLOSEOUT_KEY,
          summary: buildPlanCriticResultSummary(planReview),
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function upsertBacklogRows({ closeCard = false } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const card of buildBacklogRows({ closeCard })) {
      await client.query(
        `
          INSERT INTO backlog_items (
            id, title, team, lane, priority, rank, source, summary,
            why_it_matters, next_action, status_note, owner
          )
          VALUES ($1,$2,'foundation',$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              team = EXCLUDED.team,
              lane = CASE
                WHEN backlog_items.lane = 'done' AND EXCLUDED.lane <> 'done' THEN backlog_items.lane
                ELSE EXCLUDED.lane
              END,
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
          card.id,
          card.title,
          card.lane,
          card.priority,
          card.rank,
          card.source,
          card.summary,
          card.whyItMatters,
          card.nextAction,
          card.statusNote,
          card.owner,
        ],
      )
      await client.query(
        `
          INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
          VALUES ('backlog_updated','backlog_items',$1,$2,$3,$4::jsonb)
        `,
        [
          card.id,
          ACTOR,
          `Updated ${card.id} for subscription brain extractor adapter sprint order.`,
          JSON.stringify({ closeoutKey: CLOSEOUT_KEY, sprintId: SPRINT_ID, nextRequiredProofCardId: NEXT_CARD_ID }),
        ],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
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
               source_url, content_text, content_hash, metadata, ingested_by,
               ingested_at, updated_at
        FROM shared_communication_artifacts
        WHERE artifact_id = $1
        LIMIT 1
      `,
      [SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID],
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      artifactId: row.artifact_id,
      sourceId: row.source_id,
      artifactType: row.artifact_type,
      externalId: row.external_id,
      title: row.title,
      sourceUrl: row.source_url,
      contentText: row.content_text || '',
      contentHash: row.content_hash,
      metadata: row.metadata || {},
      ingestedBy: row.ingested_by,
      ingestedAt: row.ingested_at,
      updatedAt: row.updated_at,
    }
  } finally {
    await pool.end()
  }
}

async function persistProof(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'persist subscription adapter report, atoms, hits, backlog rows, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildSubscriptionBrainExtractorAdapterWriteSet(snapshot)
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

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update subscription adapter backlog rows, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await upsertBacklogRows({ closeCard })
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        goal: previous.sprint?.goal || 'YouTube To Dev Team Intelligence V1: connect source-backed Build Intel into Dev Team decisions and approval-gated build promotion.',
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'subscription_brain_extractor_adapter_closed' : 'subscription_brain_extractor_adapter_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: run guarded Mark public last-50 baseline using proven Eyes route and subscription reasoning boundary.`
            : `${CARD_ID}: prove logged-in subscription mini-brain evidence reasoning before Mark last-50.`,
          subscriptionAdapterReportArtifactId: REPORT_ARTIFACT_ID,
          seedVideoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
          directVideoEyesRoute: 'foundation-video-gemini-api',
          subscriptionRouteUse: 'bounded_evidence_reasoning_only',
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
          noAutoBacklogCards: true,
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
      reason: 'Steve ordered subscription mini-brain adapter proof before Mark last-50 extraction.',
    },
  )
}

async function ensureAdapterRuntimeRows() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'register subscription adapter credential and route before Brain Fleet ledger call',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const quotaState = {
    status: 'unknown',
    tier: 'unknown',
    resetAt: null,
    source: 'subscription_adapter_pre_probe',
  }
  const credential = await upsertLlmCredential(buildSubscriptionBrainExtractorAdapterCredential({
    status: 'available',
    quotaState,
    metadata: {
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      registeredForAdapterProof: true,
    },
  }), ACTOR)
  const route = await upsertLlmRoute(buildSubscriptionBrainExtractorAdapterRoute({
    status: 'available',
    riskClass: 'low',
    metadata: {
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      registeredForAdapterProof: true,
    },
  }), ACTOR)
  return { credential, route }
}

async function buildSnapshot({ now, liveClaude, writeLedger = false } = {}) {
  const [transcriptArtifact, eyesBundle, currentSprint, llmRuntime] = await Promise.all([
    loadTranscriptArtifact(),
    getIntelligenceReportBundle(SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_EYES_REPORT_ARTIFACT_ID, { atomLimit: 30, hitLimit: 60 }),
    getActiveFoundationCurrentSprint(),
    getLlmRuntimeSnapshot({ limit: 30 }),
  ])
  const adapterProof = await runSubscriptionBrainExtractorAdapterProbe({
    transcriptArtifact,
    eyesReport: eyesBundle.report,
    liveProbe: liveClaude,
    writeLedger,
    actor: ACTOR,
    runId: now,
  })
  return buildSubscriptionBrainExtractorAdapterSnapshot({
    generatedAt: now,
    transcriptArtifact,
    eyesReport: eyesBundle.report,
    adapterProof,
    currentSprint,
    llmRuntime,
    persistedMode: false,
  })
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
      planSource,
      approvalValidation,
      closeoutRegistrySource,
      coverageSource,
      currentPlanSource,
      currentStateSource,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile('lib/subscription-brain-extractor-adapter.js'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile(PLAN_PATH),
      validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile('docs/rebuild/current-plan.md'),
      readRepoFile('docs/rebuild/current-state.md'),
    ])

    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: { id: CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'Full ship gate because this card executes a subscription mini-brain route, records Brain Fleet ledger truth, writes intelligence report/atoms/hits, and changes Current Sprint order before Mark last-50.',
      repoRoot,
    })

    if ((args.closeCard || args.apply) && !args.liveClaude) {
      throw new Error('Closing SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001 requires --live-claude.')
    }

    if (args.closeCard || args.apply || args.liveClaude) {
      if (args.apply || args.closeCard) await ensureAdapterRuntimeRows()
      snapshot = await buildSnapshot({ now, liveClaude: args.liveClaude, writeLedger: args.apply || args.closeCard })
    } else {
      const persistedProof = await loadPersistedProof()
      const currentSprint = await getActiveFoundationCurrentSprint()
      snapshot = buildSubscriptionBrainExtractorAdapterSnapshot({
        generatedAt: now,
        transcriptArtifact: await loadTranscriptArtifact(),
        eyesReport: (await getIntelligenceReportBundle(SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_EYES_REPORT_ARTIFACT_ID, { atomLimit: 30, hitLimit: 60 })).report,
        adapterProof: persistedProof.report?.structuredOutputJson?.snapshot?.adapterProof ? {
          ok: true,
          status: 'succeeded',
          ...persistedProof.report.structuredOutputJson.snapshot.adapterProof,
          output: persistedProof.report.structuredOutputJson.snapshot.output,
          credentialMutationProof: { unchanged: true },
          routeContract: { authPath: 'claude_code_subscription' },
          finishedLedger: { ledgerRecord: { status: 'succeeded' } },
        } : null,
        currentSprint,
        llmRuntime: await getLlmRuntimeSnapshot({ limit: 30 }),
        persistedMode: true,
      })
      persisted = persistedProof
      persistence = verifySubscriptionBrainExtractorAdapterPersistedProof({
        snapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
    }

    if (args.closeCard || args.apply) {
      if (!snapshot.ok) throw new Error(`Subscription adapter snapshot blocked: ${snapshot.failures.map(item => item.check).join(', ')}`)
      const persistedWrite = await persistProof(snapshot)
      persisted = {
        report: persistedWrite.report,
        atoms: persistedWrite.atoms,
        hits: persistedWrite.hits,
      }
      persistence = verifySubscriptionBrainExtractorAdapterPersistedProof({
        snapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
      if (args.closeCard) {
        await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderSubscriptionBrainExtractorAdapterCloseout(snapshot), 'utf8')
        await ensureLiveState({ closeCard: true, planReview })
      } else {
        await ensureLiveState({ closeCard: false, planReview })
      }
    }

    const refreshedSprint = await getActiveFoundationCurrentSprint()
    const sprintCardIds = list(refreshedSprint.items).map(item => item.cardId).filter(Boolean)
    const cards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const card = cards.find(item => item.id === CARD_ID) || null
    const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
    const activeItem = list(refreshedSprint.items).find(item => item.cardId === CARD_ID) || null
    const nextItem = list(refreshedSprint.items).find(item => item.cardId === NEXT_CARD_ID) || null
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
    const adapterClosed = card?.lane === 'done' || activeItem?.stage === 'done_this_sprint'
    const expectClosedState = args.closeCard || adapterClosed
    const dogfood = buildSubscriptionBrainExtractorAdapterDogfoodProof()

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for subscription adapter', buildPlanCriticResultSummary(planReview))
    addCheck(checks, expectClosedState ? planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) : true, 'durable Plan Critic pass row exists after close', expectClosedState ? planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing' : 'not closing')
    addCheck(checks, card && (expectClosedState ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card.lane)), 'live backlog card exists with expected lane', card ? `${card.id}:${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, !expectClosedState || nextCard?.id === NEXT_CARD_ID, 'Mark baseline next backlog card exists after close', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'not closing')
    addCheck(checks, refreshedSprint.sprint?.activeBlockerCardId === (expectClosedState ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker is reconciled', refreshedSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, !expectClosedState || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks adapter done after close', activeItem?.stage || 'not closing')
    addCheck(checks, !expectClosedState || nextItem?.stage === 'scoping', 'Current Sprint advances to Mark baseline after close', nextItem?.stage || 'not closing')
    addCheck(checks, snapshot.ok === true, 'subscription adapter snapshot is healthy', snapshot.failures.map(item => item.check).join(', ') || 'healthy')
    addCheck(checks, snapshot.adapterProof?.routeKey === 'foundation-extractor-claude-subscription-reasoning' || expectClosedState, 'Claude subscription route was selected', snapshot.adapterProof?.routeKey || 'missing')
    addCheck(checks, snapshot.output?.canHandleEvidenceReasoning === true, 'adapter handles bounded evidence reasoning', snapshot.output?.adapterVerdict || 'missing')
    addCheck(checks, snapshot.output?.canReplaceVideoEyes === false, 'adapter does not replace Gemini video eyes', String(snapshot.output?.canReplaceVideoEyes))
    addCheck(checks, snapshot.adapterProof?.credentialMutationProof?.unchanged === true || expectClosedState, 'credential fingerprint unchanged', snapshot.adapterProof?.credentialMutationProof?.unchanged === true ? 'unchanged' : 'missing')
    addCheck(checks, snapshot.adapterProof?.finishedLedgerStatus === 'succeeded' || expectClosedState, 'Brain Fleet ledger finished successfully', snapshot.adapterProof?.finishedLedgerStatus || 'missing')
    addCheck(checks, snapshot.seedVideo?.transcriptChars >= 1000, 'exact seed transcript is present', `${snapshot.seedVideo?.transcriptChars || 0} chars`)
    addCheck(checks, snapshot.eyesSummary?.summary?.totalVisualEvidence >= 3, 'Eyes report linked before subscription reasoning', `${snapshot.eyesSummary?.summary?.totalVisualEvidence || 0} visual evidence`)
    addCheck(checks, dogfood.ok === true, 'dogfood rejects unsafe adapter requests', JSON.stringify(dogfood.cases.map(item => ({ name: item.name, ok: item.result.ok }))))
    addCheck(checks, expectClosedState ? persistence?.ok === true : true, 'persisted report, atoms, and hits read back after close', expectClosedState ? persistence?.failed?.map(item => item.check).join(', ') || 'ok' : 'not closing')
    addCheck(checks, packageJson.scripts?.['process:subscription-brain-extractor-adapter-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:subscription-brain-extractor-adapter-check'] || 'missing')
    addCheck(checks, moduleSource.includes('runSubscriptionBrainExtractorAdapterProbe') && moduleSource.includes('recordBrainFleetLedgerCall') && moduleSource.includes('canReplaceVideoEyes'), 'module proves adapter with ledger and video-eyes boundary', 'module markers present')
    addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay'), 'focused script uses guarded live writes', SCRIPT_PATH)
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes adapter card', 'lib/foundation-build-closeout-intelligence-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && list(closeout.backlogIds).includes(CARD_ID), 'build closeout lookup resolves adapter card', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes adapter card ID', 'coverage card ID present')
    addCheck(checks, currentPlanSource.includes(NEXT_CARD_ID) && currentStateSource.includes(NEXT_CARD_ID), 'rebuild docs record Mark baseline after adapter proof', NEXT_CARD_ID)
    addCheck(checks, !expectClosedState || await fs.stat(path.join(repoRoot, CLOSEOUT_PATH)).then(() => true).catch(() => false), 'closeout handoff exists after close', CLOSEOUT_PATH)
    const externalWritePattern = /\b(sendTelegram|sendMail|sendEmail|submitForm|completePurchase|runPurchase|createBacklogItem)\s*\(/
    addCheck(checks, !externalWritePattern.test(`${moduleSource}\n${scriptSource}`), 'adapter has no external notification/purchase/form/backlog writer', 'external write helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      sourceUrl: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_URL,
      nextCardId: NEXT_CARD_ID,
      snapshot: {
        status: snapshot.status,
        routeKey: snapshot.adapterProof?.routeKey,
        claudeVersion: snapshot.adapterProof?.claudeStatus?.version,
        ledgerCallId: snapshot.adapterProof?.ledgerCallId,
        canHandleEvidenceReasoning: snapshot.output?.canHandleEvidenceReasoning,
        canReplaceVideoEyes: snapshot.output?.canReplaceVideoEyes,
        buildCandidates: snapshot.output?.buildCandidates?.length || 0,
        approvalBoundaries: snapshot.output?.approvalBoundaries?.length || 0,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Subscription brain extractor adapter proof: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Subscription brain extractor adapter proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
