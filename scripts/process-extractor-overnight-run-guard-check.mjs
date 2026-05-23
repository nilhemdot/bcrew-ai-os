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
  getExtractionControlSnapshot,
  getIntelligenceReportBundle,
  getLlmRuntimeSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  recordIntelligenceAtomHit,
  upsertFoundationCurrentSprintOverlay,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  buildExtractorOvernightGuardSnapshot,
  buildExtractorOvernightGuardWriteSet,
  EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID as CARD_ID,
  EXTRACTOR_OVERNIGHT_RUN_GUARD_CLOSEOUT_KEY as CLOSEOUT_KEY,
  EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID as NEXT_CARD_ID,
  EXTRACTOR_OVERNIGHT_RUN_GUARD_REPORT_ARTIFACT_ID as REPORT_ARTIFACT_ID,
  EXTRACTOR_OVERNIGHT_RUN_GUARD_TARGET_KEY as TARGET_KEY,
  renderExtractorOvernightGuardCloseout,
  verifyExtractorOvernightGuardPersistedProof,
} from '../lib/extractor-overnight-run-guard.js'
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

const ACTOR = 'extractor-overnight-run-guard'
const SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
const PLAN_PATH = 'docs/process/extractor-overnight-run-guard-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/EXTRACTOR-OVERNIGHT-RUN-GUARD-001.json'
const CLOSEOUT_PATH = 'docs/handoffs/2026-05-23-extractor-overnight-run-guard-closeout.md'
const SCRIPT_PATH = 'scripts/process-extractor-overnight-run-guard-check.mjs'

const CHANGED_FILES = [
  'lib/extractor-overnight-run-guard.js',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

const STANDARD_NOT_NEXT = [
  'Do not run Mark last-50 or broad creator latest-20 extraction until subscription mini-brain adapter proof closes.',
  'Do not crawl Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment extraction from this sprint.',
  'Do not purchase, download, opt in, book, submit forms, send external messages, mutate credentials, or mutate browser profiles.',
  'Do not create backlog cards automatically from extractor findings; use the promotion gate.',
  'Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions from this sprint.',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: argv.includes('--close-card') || argv.includes('--close-card=true'),
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
    existingCode: 'Reuse source_crawl_targets/runs/items, extraction control snapshots, Brain Fleet runtime ledger, Foundation intelligence reports/atoms/hits, and Current Sprint overlay.',
    existingDocs: 'docs/rebuild/current-plan.md, docs/rebuild/current-state.md, God Mode Extractor research/eyes closeouts, and the YouTube To Dev Team Intelligence sprint plan.',
    existingScripts: 'scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs and existing Foundation health gates.',
    existingPolicy: 'Public/no-auth YouTube first, proposal-only Build Intel, no automatic backlog cards, and private/paid/auth work approval-bound.',
    reused: 'Extraction control ledger, stale-run detection, retry/hardening summary, report/atom persistence, Plan Critic, and Current Sprint mutation guards.',
    notRebuilt: 'Does not rebuild the extractor, daily creator watch, Dev Hub UI, provider router, Skool/MyICOR auth, or private source crawler.',
    exactGap: `${cardId} needs a reusable fail-closed run envelope before any broader extraction.`,
    overBroadRisk: 'Account burn, duplicate sludge, stale active runs, weak transcript-only scale-up, private/auth drift, and unreviewed external actions.',
    readyBy: ACTOR,
    readyAt: '2026-05-23T14:00:00-04:00',
  }
}

function buildBacklogRows({ closeCard = false } = {}) {
  return [
    {
      id: CARD_ID,
      title: 'Guard overnight extractor scale-up',
      lane: closeCard ? 'done' : 'executing',
      priority: 'P0',
      rank: 7,
      owner: 'Foundation Extraction',
      source: PLAN_PATH,
      summary: 'Define and enforce source approvals, quotas, stop conditions, artifact paths, route budgets, duplicate guards, retry limits, and morning review before larger extraction runs.',
      whyItMatters: 'Broader video extraction should not turn into account burn, duplicate sludge, weak transcript-only noise, or unreviewed private/paid crawling.',
      nextAction: closeCard
        ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} before any Mark last-50 or broader latest-20 extraction.`
        : 'Build the guarded extraction run envelope and prove it blocks broad/private/duplicate/stale/external drift.',
      statusNote: closeCard
        ? `Closed 2026-05-23 under ${CLOSEOUT_KEY}; guard policy report ${REPORT_ARTIFACT_ID}, dogfood failures, and morning review are live. No new source-crawl target is created until the adapter card approves one.`
        : 'Executing guardrails only. This is not approval to run Mark last-50, creator latest-20, Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, or auth-required extraction.',
    },
    {
      id: NEXT_CARD_ID,
      title: 'Test subscription mini-brain extractor adapter',
      lane: 'scoped',
      priority: 'P0',
      rank: 8,
      owner: 'Brain Fleet / Foundation Extraction',
      source: 'Steve May 23 direction: test subscription mini-brain path before broad API-token extraction.',
      summary: 'Prove whether the extractor can call a logged-in subscription mini-brain route for bounded video/page reasoning before Mark-scale extraction.',
      whyItMatters: 'Steve pays for subscription brains and wants to test that route before spending API tokens on broad video intelligence.',
      nextAction: 'Build one focused adapter proof over an exact approved public video/page item; compare subscription route output, cost/ledger posture, and fallback behavior against the Gemini API Eyes route.',
      statusNote: 'Scope/proof: no broad extraction. No credential mutation. No private/paid/auth source crawling. The adapter may use only already-approved local subscription route infrastructure and must fail closed if unavailable.',
    },
    {
      id: 'MARK-KASHEF-LAST-50-BASELINE-001',
      title: 'Build Mark Kashef last-50 public video baseline',
      lane: 'scoped',
      priority: 'P0',
      rank: 9,
      owner: 'Build Intel / Foundation Extraction',
      source: 'Steve May 21 direction: Mark is the first deeper source, use last 50 videos as first test.',
      summary: 'Use the daily watch queue to build the first Mark Kashef last-50 public-video baseline for research-pool evaluation.',
      whyItMatters: 'Mark is Steve’s highest-value Build Intel source, and the system needs enough history to make good build choices rather than reacting to one video.',
      nextAction: `Do not run Mark last-50 until ${NEXT_CARD_ID} proves or rejects the subscription mini-brain path under the overnight guard.`,
      statusNote: 'Scope/proof: Mark public YouTube only. Blocked from scale-up until guard and subscription adapter proof close. Do not expand to Skool/private/paid.',
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
    stage: isCurrent && closeCard ? 'done_this_sprint' : previous.stage || (isNext ? 'scoping' : 'scoping'),
    planRef: isNext
      ? 'docs/process/subscription-brain-extractor-adapter-001-plan.md'
      : previous.planRef || (card.id === CARD_ID ? PLAN_PATH : previous.planRef),
    definitionOfDone: isCurrent
      ? 'The system enforces approved source packets, per-source quotas, max items, route budgets, duplicate/stale-run guards, artifact paths, retry limits, auth/content-boundary stops, and a morning review report before broader extraction.'
      : isNext
        ? 'A bounded exact public source item proves whether a logged-in subscription mini-brain route can be used by the extractor without credential mutation, external writes, private/auth crawling, or hidden API-token burn.'
        : previous.definitionOfDone || card.summary,
    proofCommands: isCurrent
      ? [
        'npm run process:extractor-overnight-run-guard-check -- --json',
        'npm run process:current-sprint-active-card-gate-check -- --json',
        'npm run backlog:hygiene -- --json',
        'npm run foundation:verify -- --json-summary',
      ]
      : isNext
        ? [
          'npm run process:subscription-brain-extractor-adapter-check -- --json',
          'npm run process:current-sprint-active-card-gate-check -- --json',
          'npm run foundation:verify -- --json-summary',
        ]
        : previous.proofCommands || [],
    readinessBlockerCleared: isCurrent
      ? 'God Mode Extractor Eyes Quality Loop proved Eyes V0 adds value; this card guards any scale-up.'
      : isNext
        ? `${CARD_ID} closes the run envelope gap and makes subscription adapter test the next required proof.`
        : previous.readinessBlockerCleared || `${CARD_ID} keeps broad extraction guarded before this card starts.`,
    notNextBoundaries: Array.from(new Set([...(previous.notNextBoundaries || []), ...STANDARD_NOT_NEXT])),
    existingWorkCheck: {
      ...(previous.existingWorkCheck || {}),
      ...existingWorkCheck(card.id),
    },
    metadata: {
      ...(previous.metadata || {}),
      closeoutKey: isCurrent ? CLOSEOUT_KEY : previous.metadata?.closeoutKey,
      guardTargetKey: TARGET_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      nextRequiredProofCardId: NEXT_CARD_ID,
      sourceId: 'SRC-YOUTUBE-INTEL-001',
      blockersBlockActionsNotSprint: true,
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
  const currentDoneCards = existing
    .filter(item => item.stage === 'done_this_sprint')
    .filter(item => item.cardId !== CARD_ID)
    .filter(item => !cards.some(card => card.id === item.cardId))
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
          notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...STANDARD_NOT_NEXT])),
          metadata: {
            ...(item.metadata || {}),
            guardTargetKey: TARGET_KEY,
            nextRequiredProofCardId: NEXT_CARD_ID,
            repoPosture: repoPosture(currentHead),
          },
        }
      }),
  ]

  return [...currentDoneCards, ...activeRun]
    .map((item, index) => ({ ...item, order: index + 1 }))
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
        `extractor-overnight-run-guard-${stableRunId(PLAN_PATH)}`,
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
          `Updated ${card.id} for extractor overnight guard sprint order.`,
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

async function persistProof(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'persist extractor overnight guard report, atoms, hits, and sprint order',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  await removeGeneratedGuardTargetIfPresent()
  const writeSet = buildExtractorOvernightGuardWriteSet(snapshot)
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

async function removeGeneratedGuardTargetIfPresent() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'remove generated guard crawl target because guard policy must not change source lifecycle target counts',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const countResult = await client.query(
      `
        SELECT
          (SELECT COUNT(*)::integer FROM source_crawl_items WHERE target_key = $1) AS item_count,
          (SELECT COUNT(*)::integer FROM source_crawl_target_runs WHERE target_key = $1) AS run_count
      `,
      [TARGET_KEY],
    )
    const counts = countResult.rows[0] || {}
    if (Number(counts.item_count || 0) > 0 || Number(counts.run_count || 0) > 0) {
      throw new Error(`Cannot remove ${TARGET_KEY}; it already has crawl items or runs.`)
    }
    const deleted = await client.query(
      `DELETE FROM source_crawl_targets WHERE target_key = $1 RETURNING target_key`,
      [TARGET_KEY],
    )
    if (deleted.rowCount > 0) {
      await client.query(
        `
          INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
          VALUES ('source_crawl_target_updated','source_crawl_targets',$1,$2,$3,$4::jsonb)
        `,
        [
          TARGET_KEY,
          ACTOR,
          `${TARGET_KEY} removed; overnight guard is policy/report only until adapter target is approved.`,
          JSON.stringify({ closeoutKey: CLOSEOUT_KEY, cardId: CARD_ID }),
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
    operation: 'update extractor guard backlog rows, Plan Critic row, and Current Sprint overlay',
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
          currentStatus: closeCard ? 'extractor_overnight_guard_closed' : 'extractor_overnight_guard_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: prove subscription mini-brain extractor adapter before Mark last-50 or broader latest-20 extraction.`
            : `${CARD_ID}: enforce quotas, stop conditions, artifact/provenance, duplicate/stale guards, and morning review.`,
          guardTargetKey: TARGET_KEY,
          guardReportArtifactId: REPORT_ARTIFACT_ID,
          nextRequiredProofCardId: NEXT_CARD_ID,
          runOrder: buildSprintItems(previous, { closeCard, currentHead })
            .filter(item => item.stage !== 'done_this_sprint')
            .map(item => item.cardId),
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
      reason: 'Steve ordered guarded extraction before scale-up and subscription mini-brain adapter test before Mark last-50.',
    },
  )
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
      extractionControl,
      llmRuntime,
      currentSprint,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile('lib/extractor-overnight-run-guard.js'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile(PLAN_PATH),
      validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile('docs/rebuild/current-plan.md'),
      readRepoFile('docs/rebuild/current-state.md'),
      getExtractionControlSnapshot({ limit: 100 }),
      getLlmRuntimeSnapshot({ limit: 20 }),
      getActiveFoundationCurrentSprint(),
    ])

    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: { id: CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'Full ship gate because this card adds extraction run guard policy, writes a guard report/atoms/hits, cleans up the generated target placeholder, and changes live Current Sprint order before broad extraction.',
      repoRoot,
    })

    snapshot = buildExtractorOvernightGuardSnapshot({
      generatedAt: now,
      extractionControl,
      llmRuntime,
      currentSprint,
    })
    const writeSet = buildExtractorOvernightGuardWriteSet(snapshot)

    if (args.closeCard || args.apply) {
      if (!snapshot.ok) throw new Error(`Extractor overnight guard snapshot blocked: ${snapshot.failures.join(', ')}`)
      const persistedWrite = await persistProof(snapshot)
      persisted = {
        report: persistedWrite.report,
        atoms: persistedWrite.atoms,
        hits: persistedWrite.hits,
      }
      persistence = verifyExtractorOvernightGuardPersistedProof({
        snapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
      if (args.closeCard) {
        await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderExtractorOvernightGuardCloseout(snapshot), 'utf8')
        await ensureLiveState({ closeCard: true, planReview })
      } else {
        await ensureLiveState({ closeCard: false, planReview })
      }
    } else {
      persisted = await loadPersistedProof(writeSet)
      persistence = verifyExtractorOvernightGuardPersistedProof({
        snapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
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
    const guardClosed = card?.lane === 'done' || activeItem?.stage === 'done_this_sprint'
    const expectClosedState = args.closeCard || guardClosed

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for extractor guard', buildPlanCriticResultSummary(planReview))
    addCheck(checks, expectClosedState ? planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) : true, 'durable Plan Critic pass row exists after close', expectClosedState ? planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing' : 'not closing')
    addCheck(checks, card && (expectClosedState ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card.lane)), 'live backlog card exists with expected lane', card ? `${card.id}:${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, !expectClosedState || nextCard?.id === NEXT_CARD_ID, 'subscription adapter next backlog card exists after close', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'not closing')
    addCheck(checks, refreshedSprint.sprint?.activeBlockerCardId === (expectClosedState ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker is reconciled', refreshedSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, !expectClosedState || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks guard done after close', activeItem?.stage || 'not closing')
    addCheck(checks, !expectClosedState || nextItem?.stage === 'scoping', 'Current Sprint advances to subscription adapter after close', nextItem?.stage || 'not closing')
    addCheck(checks, snapshot.ok === true, 'guard snapshot is healthy', snapshot.failures.join(', ') || 'healthy')
    addCheck(checks, snapshot.dailyWatchTarget?.targetKey === 'youtube-creator-daily-watch', 'daily creator watch remains separate and visible', snapshot.dailyWatchTarget ? `${snapshot.dailyWatchTarget.status}/${snapshot.dailyWatchTarget.runtimeMode}` : 'missing')
    addCheck(checks, snapshot.liveEvaluation?.ok === true, 'allowed pilot request passes live stale/duplicate gate', snapshot.liveEvaluation?.failed?.map(item => item.check).join(', ') || 'ok')
    addCheck(checks, snapshot.dogfood?.ok === true && snapshot.dogfood.cases.length >= 7, 'dogfood rejects broad/private/stale/duplicate/external drift', JSON.stringify(snapshot.dogfood?.cases?.map(item => ({ name: item.name, ok: item.result.ok }))))
    addCheck(checks, snapshot.morningReview?.status === 'ready_for_subscription_brain_adapter_test', 'morning review points to subscription adapter next', snapshot.morningReview?.nextAction || 'missing')
    addCheck(checks, expectClosedState ? persistence?.ok === true : true, 'persisted guard report, atoms, and hits read back after close', expectClosedState ? persistence?.failed?.map(item => item.check).join(', ') || 'ok' : 'not closing')
    addCheck(checks, packageJson.scripts?.['process:extractor-overnight-run-guard-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:extractor-overnight-run-guard-check'] || 'missing')
    addCheck(checks, moduleSource.includes('evaluateExtractorOvernightRunRequest') && moduleSource.includes('buildExtractorOvernightGuardDogfoodProof') && moduleSource.includes('buildExtractorOvernightGuardWriteSet'), 'module exposes guard evaluator, dogfood, and report writer', 'module markers present')
    addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('removeGeneratedGuardTargetIfPresent') && scriptSource.includes('upsertFoundationCurrentSprintOverlay'), 'focused script uses guarded live writes', SCRIPT_PATH)
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes guard card', 'lib/foundation-build-closeout-intelligence-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && list(closeout.backlogIds).includes(CARD_ID), 'build closeout lookup resolves guard card', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes guard card ID', 'coverage card ID present')
    addCheck(checks, currentPlanSource.includes(NEXT_CARD_ID) && currentStateSource.includes(NEXT_CARD_ID), 'rebuild docs record subscription adapter before scale-up', NEXT_CARD_ID)
    addCheck(checks, !expectClosedState || await fs.stat(path.join(repoRoot, CLOSEOUT_PATH)).then(() => true).catch(() => false), 'closeout handoff exists after close', CLOSEOUT_PATH)
    const externalWritePattern = /\b(sendTelegram|sendMail|sendEmail|submitForm|completePurchase|runPurchase|createBacklogItem)\s*\(/
    addCheck(checks, !externalWritePattern.test(`${moduleSource}\n${scriptSource}`), 'guard has no external notification/purchase/form/backlog writer', 'external write helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      targetKey: TARGET_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      nextCardId: NEXT_CARD_ID,
      snapshot: {
        status: snapshot.status,
        safePilotMaxVideos: snapshot.policy.maxVideosPerRun,
        staleActiveRuns: snapshot.morningReview?.staleActiveRuns,
        dogfoodCases: snapshot.dogfood?.cases?.length || 0,
        nextAction: snapshot.morningReview?.nextAction,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Extractor overnight run guard proof: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Extractor overnight run guard proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
