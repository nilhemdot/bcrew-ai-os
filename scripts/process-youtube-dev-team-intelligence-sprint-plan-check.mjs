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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const ACTOR = 'youtube-dev-team-intelligence-sprint-plan'
const CARD_ID = 'YOUTUBE-DEV-TEAM-SPRINT-PLAN-001'
const CLOSEOUT_KEY = 'youtube-dev-team-intelligence-sprint-plan-v1'
const SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
const PLAN_PATH = 'docs/process/youtube-dev-team-intelligence-sprint-plan-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-DEV-TEAM-SPRINT-PLAN-001.json'
const CLOSEOUT_PATH = 'docs/handoffs/2026-05-21-youtube-dev-team-intelligence-sprint-plan-closeout.md'
const SCRIPT_PATH = 'scripts/process-youtube-dev-team-intelligence-sprint-plan-check.mjs'
const CHECKPOINT_PATH = 'docs/handoffs/2026-05-21-youtube-dev-team-intelligence-sprint-checkpoint.md'
const ACTIVE_CARD_ID = 'DEV-TEAM-HUB-V0-001'

const CHANGED_FILES = [
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

const STANDARD_NOT_NEXT = [
  'Do not run Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment extraction from this sprint.',
  'Do not purchase, download, opt in, book, submit forms, send external messages, mutate credentials, or mutate browser profiles.',
  'Do not create backlog cards automatically from scout findings; use the promotion gate.',
  'Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions from this sprint.',
]

const PARKED_OUTSIDE_SPRINT = [
  'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001',
  'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
  'STRATEGY-003',
  'AGENT-BRAIN-FOUNDATION-SEPARATION-001',
]

const SPRINT_CARDS = [
  {
    id: CARD_ID,
    title: 'Promote YouTube to Dev Team Intelligence sprint plan',
    lane: 'done',
    priority: 'P0',
    rank: 1,
    owner: 'Orchestrator',
    source: CHECKPOINT_PATH,
    summary: 'Promote the YouTube To Dev Team Intelligence V1 checkpoint into live backlog and Current Sprint truth.',
    whyItMatters: 'The sprint plan must be executable system truth so Steve does not have to restate the plan to every Builder.',
    nextAction: `Done under ${CLOSEOUT_KEY}. Continue ${ACTIVE_CARD_ID}.`,
    statusNote: `Closed 2026-05-21 under ${CLOSEOUT_KEY}; live sprint order, backlog cards, parked-card boundaries, docs, closeout registry, and proof script now encode YouTube To Dev Team Intelligence V1. See ${CLOSEOUT_PATH}.`,
    planRef: PLAN_PATH,
    definitionOfDone: `The YouTube To Dev Team Intelligence V1 plan is live Current Sprint/backlog truth, missing slice cards exist, unrelated scoped cards are parked outside sprint order, and ${ACTIVE_CARD_ID} is the active next card.`,
    proofCommands: [
      'npm run process:youtube-dev-team-intelligence-sprint-plan-check -- --json',
      'npm run process:current-sprint-active-card-gate-check -- --json',
      'npm run process:system-health-nightly-audit-check -- --json',
    ],
    stage: 'done_this_sprint',
  },
  {
    id: ACTIVE_CARD_ID,
    title: 'Define Dev Team Hub V0 over Foundation intelligence',
    lane: 'scoped',
    priority: 'P0',
    rank: 2,
    owner: 'Foundation / Dev Team',
    source: CHECKPOINT_PATH,
    summary: 'Build a read-only Dev Team Hub V0 that shows Build Intel sources, reports, atoms/candidates, ranked opportunities, approval-required links, and review queue from Foundation truth.',
    whyItMatters: 'The scout report has value only if Steve can see and review it without reading raw DB artifacts or chat transcripts.',
    nextAction: 'Build the read-only Dev Team Hub V0 over the persisted YouTube scout report, atoms, evidence hits, approval-required links, and review routes.',
    statusNote: 'Scope/proof: first remaining sprint slice after the Mark YouTube scout. No writes except explicit proposal/review actions; close only with a focused Dev Team Hub proof and Foundation gates.',
    planRef: 'docs/process/dev-team-hub-v0-001-plan.md',
    definitionOfDone: 'Steve can open a simple Dev Team Hub read surface and see Mark YouTube source status, scout report, atoms/candidates, ranked opportunities, approval-required links, and review queue from Foundation-backed data.',
    proofCommands: [
      'npm run process:dev-team-hub-v0-check -- --json',
      'npm run process:current-sprint-active-card-gate-check -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    stage: 'scoping',
  },
  {
    id: 'YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002',
    title: 'Extract YouTube descriptions, links, downloads, and resources',
    lane: 'scoped',
    priority: 'P0',
    rank: 3,
    owner: 'Build Intel / Foundation Extractor',
    source: 'Steve correction on YouTube extraction missing descriptions and linked resources',
    summary: 'Turn observed YouTube description/resource links into an approval queue with classifications, source-use boundaries, and evidence handling.',
    whyItMatters: 'The valuable implementation material is often in the video description or linked resources, not only the transcript.',
    nextAction: 'For approved public YouTube items, classify description links, resource/download/purchase/opt-in links, and ask for approval before following anything outside public no-auth YouTube.',
    statusNote: 'Scope/proof: continuation card. The scout classified links but did not follow Skool, Gumroad, Calendly, purchase, opt-in, download, private, or paid resources; close only with link classification/readback proof.',
    planRef: 'docs/process/youtube-build-intel-link-resource-002-plan.md',
    definitionOfDone: 'YouTube description/resource links are captured, classified, deduped, shown for review, and approval-bound before any external follow/download/purchase/opt-in action.',
    proofCommands: [
      'npm run process:youtube-build-intel-link-resource-check -- --json',
      'npm run process:current-sprint-active-card-gate-check -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    stage: 'scoping',
  },
  {
    id: 'EXTRACTOR-OVERNIGHT-RUN-GUARD-001',
    title: 'Guard overnight extractor scale-up',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    owner: 'Foundation Extraction',
    source: '2026-05-20 extractor strategy',
    summary: 'Define and enforce source approvals, quotas, stop conditions, artifact paths, route budgets, duplicate guards, retry limits, and morning review before larger extraction runs.',
    whyItMatters: 'Broader video extraction should not turn into account burn, duplicate sludge, or unreviewed private/paid crawling.',
    nextAction: 'Build the guardrails required before any latest-20/deeper run: allowed source packets, quota/stop controls, artifact/provenance handling, stale-run prevention, and morning review.',
    statusNote: 'Scope/proof: runs before deeper latest-20 processing. This is not approval to crawl private, paid, Skool, MyICOR, Gumroad, Calendly, comments, or member surfaces; close only with guard enforcement proof.',
    planRef: 'docs/process/extractor-overnight-run-guard-001-plan.md',
    definitionOfDone: 'The system can enforce approved source packets, per-source quotas, max items, route budgets, duplicate/stale-run guards, artifact paths, retry limits, auth/content-boundary stops, and a morning review report before broader extraction.',
    proofCommands: [
      'npm run process:extractor-overnight-run-guard-check -- --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    stage: 'scoping',
  },
  {
    id: 'YOUTUBE-LATEST-20-INTEL-RUN-001',
    title: 'Run deeper Mark YouTube latest-20 intelligence extraction',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    owner: 'Build Intel / Foundation Extractor',
    source: CHECKPOINT_PATH,
    summary: 'Process approved Mark Kashef public YouTube videos beyond title metadata into source-backed transcript, description, visual notes, observations, atoms, and ranked build opportunities.',
    whyItMatters: 'The scout only scanned 20 titles and deeply captured one seed video. The sprint needs selected videos processed into real intelligence.',
    nextAction: 'After hub/resource/guard work, run bounded public no-auth extraction for approved Mark videos, starting with the newest `tjjX43FoAUg` unless Steve picks a different exact video.',
    statusNote: 'Scope/proof: no broad crawl. Public YouTube only. Exact source items and quotas must be approved through the guard; close only with bounded extraction/readback proof.',
    planRef: 'docs/process/youtube-latest-20-intel-run-001-plan.md',
    definitionOfDone: 'Approved Mark public videos are processed beyond title metadata into transcript, description/resource evidence, visual notes where allowed, observations, atoms/hits, ranked opportunities, and a reviewable report.',
    proofCommands: [
      'npm run process:youtube-latest-20-intel-run-check -- --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    stage: 'scoping',
  },
  {
    id: 'DEV-TEAM-INTELLIGENCE-DIRECTOR-001',
    title: 'Generate Dev Team Intelligence Director output',
    lane: 'scoped',
    priority: 'P0',
    rank: 6,
    owner: 'Dev Team Intelligence',
    source: CHECKPOINT_PATH,
    summary: 'Create the generated Director report/view that explains what was learned, why it matters, evidence, scores, suggested card, blockers, duplicates, stale checks, and next action.',
    whyItMatters: 'Raw scout reports and atoms are not enough; Steve needs an operator-grade decision output.',
    nextAction: 'Build the Director output over Foundation reports/atoms/review routes after the hub can read the data.',
    statusNote: 'Scope/proof: generated report/view only; not a free-roaming autonomous agent. Close only with Director output proof over Foundation evidence.',
    planRef: 'docs/process/dev-team-intelligence-director-001-plan.md',
    definitionOfDone: 'A generated Director output answers what was learned, why it matters, evidence/source links, opportunity score, suggested card, approval blockers, duplicate/stale checks, and next action.',
    proofCommands: [
      'npm run process:dev-team-intelligence-director-check -- --json',
      'npm run process:current-sprint-active-card-gate-check -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    stage: 'scoping',
  },
  {
    id: 'BUILD-OPPORTUNITY-PROMOTION-GATE-001',
    title: 'Approve Build Intel opportunities into backlog',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    owner: 'Foundation / Dev Team',
    source: CHECKPOINT_PATH,
    summary: 'Add the human review gate that turns approved source-backed build opportunities into backlog cards or attaches them to existing cards while logging rejects, duplicates, and stale ideas.',
    whyItMatters: 'The system must not auto-create work from content, but approved intelligence should not be lost.',
    nextAction: 'Build approval-gated promotion from Dev Team review routes into backlog card creation/attachment with evidence.',
    statusNote: 'Scope/proof: no auto-created backlog cards. Promotion requires explicit approval and closeout proof showing rejected/duplicate/stale outcomes are logged.',
    planRef: 'docs/process/build-opportunity-promotion-gate-001-plan.md',
    definitionOfDone: 'Steve can approve one source-backed build opportunity into a backlog card or existing-card attachment; rejected, duplicate, and stale items are logged with evidence.',
    proofCommands: [
      'npm run process:build-opportunity-promotion-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    stage: 'scoping',
  },
  {
    id: 'BUILD-INTEL-EXTRACTION-IMPLEMENTATION',
    title: 'Implement Build Intel extraction after Steve auth',
    lane: 'scoped',
    priority: 'P0',
    rank: 8,
    owner: 'Build Intel',
    source: 'connector-completion-prep-v1',
    summary: 'Close the YouTube to Dev Team Intelligence V1 implementation loop once hub, link-resource, guard, deeper run, Director, and promotion gate exist.',
    whyItMatters: 'This is the umbrella completion card for using source-backed Build Intel to improve how AIOS gets built.',
    nextAction: 'Close the full Build Intel extraction implementation only after the sprint slices prove source-backed artifacts, atoms, review queue, Director output, and approval-gated promotion.',
    statusNote: 'Scope/proof: umbrella card. Do not use it to bypass the specific sprint cards; close only after hub, resource, guard, latest-20, Director, and promotion-gate proof exists.',
    planRef: 'docs/process/build-intel-extraction-implementation-plan.md',
    definitionOfDone: 'The Build Intel extraction loop consumes source-backed artifacts/atoms/reports, exposes reviewable intelligence in the Dev Team Hub, generates Director output, and promotes approved opportunities through the gate.',
    proofCommands: [
      'npm run process:build-intel-extraction-implementation-check -- --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    stage: 'scoping',
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
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

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function existingWorkCheck(card = {}) {
  return {
    existingCode: 'Reuse Foundation DB, Current Sprint overlay, scout report artifacts, intelligence atoms, review routes, and existing process checks.',
    existingDocs: `${CHECKPOINT_PATH}, docs/rebuild/current-plan.md, docs/rebuild/current-state.md`,
    existingScripts: SCRIPT_PATH,
    existingPolicy: 'Live Backlog is task truth; no automatic backlog cards; private/paid/external source work remains approval-bound.',
    reused: 'Existing YouTube scout closeout and Foundation sprint/backlog gates.',
    notRebuilt: 'Does not rebuild extractor, source contracts, Brain Fleet, Strategy, People, Skool, MyICOR, or UI foundations.',
    exactGap: `${card.id || 'card'} needs explicit sprint/card truth for YouTube To Dev Team Intelligence V1.`,
    overBroadRisk: 'Broad extraction, private/paid/auth crawling, auto backlog creation, and unrelated sprint drift.',
    readyBy: ACTOR,
    readyAt: '2026-05-21T15:15:00-04:00',
  }
}

function sprintItem(card = {}, { order, currentHead }) {
  return {
    cardId: card.id,
    order,
    stage: card.stage,
    planRef: card.planRef,
    definitionOfDone: card.definitionOfDone,
    proofCommands: card.proofCommands,
    readinessBlockerCleared: card.id === CARD_ID
      ? 'Steve confirmed the handoff plan is the active sprint and must be promoted into live card order.'
      : `${CARD_ID} closes the sprint/card ordering gap before this card starts.`,
    notNextBoundaries: STANDARD_NOT_NEXT,
    existingWorkCheck: existingWorkCheck(card),
    metadata: {
      closeoutKey: card.id === CARD_ID ? CLOSEOUT_KEY : undefined,
      sprintPlanCardId: CARD_ID,
      sourceId: 'SRC-YOUTUBE-INTEL-001',
      checkpointPath: CHECKPOINT_PATH,
      reportArtifactId: 'scout:youtube-scout-latest-video-vision-002:mark-kashef-latest-20',
      blockersBlockActionsNotSprint: true,
      createsBacklogCardsAutomatically: false,
      noExternalWrites: true,
      noPrivatePaidAuthExtraction: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
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
        `youtube-dev-team-sprint-plan-${stableRunId(PLAN_PATH)}`,
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

async function upsertBacklogRows() {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const card of SPRINT_CARDS) {
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
          `Updated ${card.id} for YouTube To Dev Team Intelligence V1 sprint plan.`,
          JSON.stringify({ closeoutKey: CLOSEOUT_KEY, sprintId: SPRINT_ID, rank: card.rank }),
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

async function applyLiveState({ planReview }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'promote YouTube To Dev Team Intelligence V1 cards into live backlog and Current Sprint order',
    allowedFlags: [
      PROCESS_CHECK_WRITE_FLAGS.apply,
      PROCESS_CHECK_WRITE_FLAGS.closeCard,
      PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
    ],
  })

  const currentHead = git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await upsertBacklogRows()
  await upsertPlanCriticRun(planReview)

  const existingDone = (previous.items || [])
    .filter(item => item.stage === 'done_this_sprint')
    .filter(item => !SPRINT_CARDS.some(card => card.id === item.cardId))
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))

  const nextItems = [
    ...existingDone,
    ...SPRINT_CARDS.map((card, index) => sprintItem(card, {
      order: existingDone.length + index + 1,
      currentHead,
    })),
  ].map((item, index) => ({ ...item, order: index + 1 }))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'YouTube To Dev Team Intelligence V1: connect Mark Kashef public YouTube intelligence into a Dev Team Hub, Director output, and approval-gated build promotion path.',
        activeBlockerCardId: ACTIVE_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          closeoutKey: CLOSEOUT_KEY,
          sprintPlanCardId: CARD_ID,
          checkpointPath: CHECKPOINT_PATH,
          sourceId: 'SRC-YOUTUBE-INTEL-001',
          activeBlockerCardId: ACTIVE_CARD_ID,
          currentStatus: 'youtube_to_dev_team_intelligence_v1_carded',
          nextAction: `${ACTIVE_CARD_ID}: build the read-only Dev Team Hub V0 over Foundation report/atom/review-route truth.`,
          approvalPolicy: 'Park blocked or approval-bound actions and continue only safe Foundation work.',
          runOrder: SPRINT_CARDS.filter(card => card.id !== CARD_ID).map(card => card.id),
          parkedOutsideSprint: PARKED_OUTSIDE_SPRINT,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
          noAutoBacklogCards: true,
          publicYoutubeFirst: true,
          strategyPeopleParked: true,
        },
      },
      items: nextItems,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve confirmed YouTube To Dev Team Intelligence V1 is the active sprint and must be represented in live backlog/card order.',
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
      planText,
      packageJsonText,
      scriptSource,
      closeoutRegistrySource,
      coverageSource,
      currentPlanSource,
      currentStateSource,
      closeoutSource,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
      readRepoFile(PLAN_PATH),
      readRepoFile('package.json'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile('docs/rebuild/current-plan.md'),
      readRepoFile('docs/rebuild/current-state.md'),
      readRepoFile(CLOSEOUT_PATH),
    ])

    const planReview = evaluatePlanCriticPlan({
      planText,
      card: { id: CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'Live sprint/backlog mutation, sprint sequencing, control-plane docs, closeout registry, verifier coverage, and future Builder execution order.',
      repoRoot,
    })

    if (args.apply) {
      if (!approval.ok || Number(approval.approval?.score) < PLAN_CRITIC_MIN_PASS_SCORE) {
        throw new Error(`Approval is not valid for ${CARD_ID}.`)
      }
      if (planReview.status !== 'pass' || Number(planReview.score) < PLAN_CRITIC_MIN_PASS_SCORE) {
        throw new Error(`Plan Critic did not pass: ${buildPlanCriticResultSummary(planReview)}`)
      }
      await applyLiveState({ planReview })
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const expectedIds = SPRINT_CARDS.map(card => card.id)
    const sprintIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
    const cards = await getBacklogItemsByIds([
      ...expectedIds,
      ...PARKED_OUTSIDE_SPRINT,
      ...sprintIds,
    ])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID])
    const cardMap = new Map(cards.map(card => [card.id, card]))
    const sprintFuture = (activeSprint.items || [])
      .filter(item => expectedIds.includes(item.cardId))
      .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
      .map(item => item.cardId)
    const expectedFuture = expectedIds
    const activeItem = (activeSprint.items || []).find(item => item.cardId === ACTIVE_CARD_ID) || null
    const activeMetadata = activeItem?.metadata || {}
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
    const packageJson = JSON.parse(packageJsonText)

    addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for sprint-plan card', buildPlanCriticResultSummary(planReview))
    addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID, 'live Current Sprint uses YouTube To Dev Team sprint id', activeSprint.sprint?.sprintId || 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === ACTIVE_CARD_ID, 'active blocker is first remaining sprint slice', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, JSON.stringify(sprintFuture) === JSON.stringify(expectedFuture), 'sprint contains exact plan card order', sprintFuture.join(', '))
    addCheck(checks, expectedIds.every(id => cardMap.has(id)), 'all sprint cards exist in live backlog', expectedIds.filter(id => !cardMap.has(id)).join(', ') || 'present')
    addCheck(checks, PARKED_OUTSIDE_SPRINT.every(id => cardMap.has(id)) && PARKED_OUTSIDE_SPRINT.every(id => !sprintIds.includes(id)), 'non-plan cards remain live but parked outside sprint', PARKED_OUTSIDE_SPRINT.filter(id => sprintIds.includes(id) || !cardMap.has(id)).join(', ') || 'parked')
    addCheck(checks, SPRINT_CARDS.every(card => cardMap.get(card.id)?.priority === card.priority), 'sprint cards have expected priority', 'checked')
    addCheck(checks, activeItem?.definitionOfDone && activeItem?.proofCommands?.length && activeItem?.notNextBoundaries?.length, 'active item has sprint doctrine fields', ACTIVE_CARD_ID)
    addCheck(checks, activeMetadata.blockersBlockActionsNotSprint === true && activeMetadata.repoPosture?.integrationBranch === 'main', 'active item has blocker/repo posture metadata', JSON.stringify(activeMetadata.repoPosture || {}))
    addCheck(checks, packageJson.scripts?.['process:youtube-dev-team-intelligence-sprint-plan-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:youtube-dev-team-intelligence-sprint-plan-check'] || 'missing')
    addCheck(checks, scriptSource.includes('upsertFoundationCurrentSprintOverlay') && scriptSource.includes('PARKED_OUTSIDE_SPRINT'), 'focused script owns sprint/card promotion behavior', SCRIPT_PATH)
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves sprint-plan card', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes sprint-plan card', CARD_ID)
    addCheck(checks, currentPlanSource.includes(SPRINT_ID) && currentPlanSource.includes(ACTIVE_CARD_ID), 'current plan references live sprint order', 'docs/rebuild/current-plan.md')
    addCheck(checks, currentStateSource.includes(SPRINT_ID) && currentStateSource.includes(ACTIVE_CARD_ID), 'current state references live sprint order', 'docs/rebuild/current-state.md')
    addCheck(checks, closeoutSource.includes(CLOSEOUT_KEY) && closeoutSource.includes(ACTIVE_CARD_ID), 'closeout handoff records next card', CLOSEOUT_PATH)

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      sprintId: SPRINT_ID,
      activeBlocker: activeSprint.sprint?.activeBlockerCardId || '',
      planOrder: expectedFuture,
      parkedOutsideSprint: PARKED_OUTSIDE_SPRINT,
      checks,
      failed,
    }

    if (args.json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`YouTube Dev Team Intelligence sprint plan proof: ${result.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('YouTube Dev Team Intelligence sprint plan proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
