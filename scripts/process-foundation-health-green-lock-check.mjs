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
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationJobRunSnapshot,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { loadLatestFoundationEndpointBudgetSnapshot } from '../lib/foundation-endpoint-budgets.js'
import {
  buildFoundationHealthGreenLockDogfoodProof,
  FOUNDATION_HEALTH_GREEN_LOCK_APPROVAL_PATH,
  FOUNDATION_HEALTH_GREEN_LOCK_CARD_ID,
  FOUNDATION_HEALTH_GREEN_LOCK_CLOSEOUT_KEY,
  FOUNDATION_HEALTH_GREEN_LOCK_CLOSEOUT_PATH,
  FOUNDATION_HEALTH_GREEN_LOCK_PLAN_PATH,
  FOUNDATION_HEALTH_GREEN_LOCK_SCRIPT_PATH,
} from '../lib/foundation-health-green-lock.js'
import { buildFoundationOperatingReliabilitySnapshot } from '../lib/connector-uptime-monitor.js'
import { buildFoundationSystemHealthSnapshot } from '../lib/foundation-system-health.js'
import { buildDocArtifactBloatSnapshot } from '../lib/doc-artifact-bloat-guard.js'
import { getSourceConnectors, getSourceContracts } from '../lib/source-contracts.js'
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

const CARD_ID = FOUNDATION_HEALTH_GREEN_LOCK_CARD_ID
const CLOSEOUT_KEY = FOUNDATION_HEALTH_GREEN_LOCK_CLOSEOUT_KEY
const PLAN_PATH = FOUNDATION_HEALTH_GREEN_LOCK_PLAN_PATH
const APPROVAL_PATH = FOUNDATION_HEALTH_GREEN_LOCK_APPROVAL_PATH
const SCRIPT_PATH = FOUNDATION_HEALTH_GREEN_LOCK_SCRIPT_PATH
const CLOSEOUT_PATH = FOUNDATION_HEALTH_GREEN_LOCK_CLOSEOUT_PATH
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
const NEXT_CARD_ID = 'FOUNDATION-LESSONS-LEARNED-LOOP-001'

const APPROVED_RUN_ORDER = [
  'FOUNDATION-LESSONS-LEARNED-LOOP-001',
  'FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001',
  'SYSTEM-010',
  'SOURCE-012',
  'SOURCE-018',
  'EXTRACT-CURRENT-001',
  'EXTRACT-BACKFILL-001',
  'DRIVE-CONTENT-001',
  'EMAIL-ATTACHMENTS-001',
  'FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001',
]

const CHANGED_FILES = [
  'lib/foundation-health-green-lock.js',
  'lib/foundation-system-health.js',
  'lib/foundation-current-sprint.js',
  SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
]

const PROOF_COMMANDS = [
  `node --check lib/foundation-health-green-lock.js lib/foundation-system-health.js lib/foundation-current-sprint.js ${SCRIPT_PATH}`,
  'npm run process:foundation-health-green-lock-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:current-sprint-dynamic-truth-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${CARD_ID} --closeoutKey=${CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --commitRef=HEAD`,
]

const FUTURE_CARD_ROWS = {
  'FOUNDATION-LESSONS-LEARNED-LOOP-001': {
    title: 'Build nightly lessons-learned self-improvement loop',
    priority: 'P0',
    summary: 'Turn nightly audits, repeated failures, builder mistakes, and local conversation lessons into backlog cards, verifier rules, Plan Critic rules, Current Sprint gates, or durable doctrine.',
    whyItMatters: 'The system should learn from repeated waste and close the loop with behavior changes instead of writing lessons that do not change future runs.',
    nextAction: 'Scope/build the nightly lessons loop with local/private conversation boundaries and behavior-change outputs.',
  },
  'FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001': {
    title: 'Clean live backlog P0 reality',
    priority: 'P0',
    summary: 'Separate real active P0 blockers from scary deferred/provider/approval/security-rotation cards so the operator queue reflects current reality.',
    whyItMatters: 'P0 must mean active operational priority, not a pile of scary parked work that hides the real next blocker.',
    nextAction: 'Review live P0/P1 backlog truth, keep real exposure work, and move deferred/provider-approval items out of active blocker posture.',
  },
  'FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001': {
    title: 'Close Foundation sprint and decide continuous-work readiness',
    priority: 'P0',
    summary: 'Run final sprint audit after guardrails and source/extract slices to decide whether continuous Foundation Builder / Value Builder split is safe.',
    whyItMatters: 'Parallel velocity should restart only after Foundation proves it can stay green, route failures, keep main clean, and avoid false-green drift.',
    nextAction: 'Audit raw health, repeated failures, backlog truth, lessons loop, source/extract readiness, and make an explicit continuous-work recommendation.',
  },
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
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

function parseJsonFromCommand(text = '') {
  const starts = [...String(text).matchAll(/\n\{/g)].map(match => match.index + 1)
  starts.unshift(String(text).indexOf('{'))
  for (const start of starts.filter(index => index >= 0).reverse()) {
    try {
      return JSON.parse(String(text).slice(start))
    } catch {}
  }
  return null
}

function runNpmScript(script, args = []) {
  const output = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 60 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Prevent false-green Foundation health',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 1,
    source: 'Steve 2026-05-19 Foundation-only sprint: green means raw green; classification is not repair.',
    summary: 'Lock System Health so raw red/yellow rows cannot report green unless a Steve-approved sprint exception names owner, threshold, repair card, and next action.',
    whyItMatters: 'Foundation should stop wasting runs on broken workflows hidden by classification. The operator surface must tell the truth before source/value work resumes.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue ${NEXT_CARD_ID}.`
      : 'Wire green-lock semantics into System Health and prove false-green, thresholdless exceptions, hidden raw counts, and stale sprint health fail closed.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; green-lock semantics are live and Current Sprint advances to ${NEXT_CARD_ID}.`
      : `Executing \`${CLOSEOUT_KEY}\`; false-green health lock blocks the Foundation queue.`,
    owner: 'Foundation Process',
  }
}

function genericExistingWorkCheck(cardId) {
  return {
    existingCode: [
      'lib/foundation-system-health.js',
      'lib/foundation-current-sprint.js',
      'lib/foundation-db.js',
    ],
    existingDocs: [
      'docs/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md',
      'docs/handoffs/2026-05-19-foundation-health-green-lock-closeout.md',
    ],
    existingScripts: [
      'scripts/process-system-health-nightly-audit-check.mjs',
      'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
      'scripts/process-foundation-ship.mjs',
    ],
    existingPolicy: [
      'Foundation-only until final closeout says continuous split is safe.',
      'Green means raw green; classification is not repair.',
      'External writes and Drive permission mutation require explicit Steve approval.',
    ],
    reused: [
      'live backlog truth',
      'live Current Sprint truth',
      'existing source/extract contracts where applicable',
    ],
    notRebuilt: [
      'No replacement backlog.',
      'No replacement sprint system.',
      'No hidden parallel builder lane.',
    ],
    exactGap: `${cardId} is in the approved unattended Foundation run order and needs scoped live truth before work starts.`,
    overBroadRisk: 'This can drift into value/source/agent expansion before Foundation is stable. Keep work to the named card and proof.',
    readyBy: 'Steve approved card-by-card Foundation-only continuation on 2026-05-19.',
    readyAt: '2026-05-19T12:50:00-04:00',
  }
}

function notNextBoundaries() {
  return [
    'Do not start Value Builder split.',
    'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
    'Do not mutate Drive permissions.',
    'Do not send email, Agent Feedback, request-access messages, public posts, or external writes.',
    'Do not rotate provider keys unless real exposure/suspicious access/public sharing exists or Steve explicitly approves.',
    'Do not run paid/provider/model-spend, credential mutation, or private broad extraction without explicit Steve approval.',
    'Do not classify broken workflow failures as green.',
  ]
}

function futureSprintItem(cardId, { order, stage = 'scoping', existing = {} } = {}) {
  const row = FUTURE_CARD_ROWS[cardId] || {}
  return {
    ...existing,
    cardId,
    order,
    stage,
    planRef: existing.planRef || `docs/process/${cardId.toLowerCase()}.md`,
    definitionOfDone: existing.definitionOfDone || row.summary || 'Card closes only with focused proof and full Foundation closeout gates.',
    proofCommands: existing.proofCommands?.length ? existing.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:foundation-ship -- --card=<card> --closeoutKey=<closeout-key> --commitRef=HEAD',
    ],
    notNextBoundaries: Array.from(new Set([...(existing.notNextBoundaries || []), ...notNextBoundaries()])),
    existingWorkCheck: Object.keys(existing.existingWorkCheck || {}).length ? existing.existingWorkCheck : genericExistingWorkCheck(cardId),
  }
}

function greenLockSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'System Health cannot report green from classification alone; raw non-green rows need explicit Steve-approved sprint exceptions; stale embedded sprint health fails proof.',
    proofCommands: PROOF_COMMANDS,
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...notNextBoundaries()])),
    existingWorkCheck: {
      existingCode: [
        'lib/foundation-system-health.js',
        'lib/foundation-health-watch-to-green.js',
        'lib/foundation-current-sprint.js',
        'scripts/process-system-health-nightly-audit-check.mjs',
      ],
      existingDocs: [
        'docs/process/foundation-raw-green-repair-and-lock-001-plan.md',
        PLAN_PATH,
        APPROVAL_PATH,
        CLOSEOUT_PATH,
      ],
      existingScripts: [
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-current-sprint-dynamic-truth-check.mjs',
        'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
        'scripts/process-foundation-ship.mjs',
      ],
      existingPolicy: [
        'Green means raw green.',
        'Classification is not repair.',
        'Exceptions require explicit Steve approval in sprint truth.',
        'Stale sprint health summaries cannot pretend to be live truth.',
      ],
      newCode: [
        'lib/foundation-health-green-lock.js',
        SCRIPT_PATH,
      ],
      reused: [
        'existing System Health rollup',
        'existing Current Sprint live overlay',
        'existing process write guard',
        'existing ship gate',
      ],
      notRebuilt: [
        'No new health system.',
        'No new sprint system.',
        'No source/value/agent feature work.',
      ],
      notNew: [
        'No replacement health surface.',
        'No replacement backlog.',
        'No hidden parallel lane.',
      ],
      exactGap: 'The previous watch-to-green layer could make classified raw rows look operationally green; this card locks raw green semantics and approved exceptions.',
      overBroadRisk: 'This can drift into raw-health repairs or source activation. V1 only locks false-green semantics and refreshes sprint ordering.',
      readyBy: 'Steve approved this as the next Foundation-only card after file-size health cleanup.',
      readyAt: '2026-05-19T12:50:00-04:00',
    },
  }
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update health green-lock backlog card, Plan Critic row, next cards, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const row = buildCardRow({ closeCard })
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
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
    for (const [cardId, future] of Object.entries(FUTURE_CARD_ROWS)) {
      await client.query(
        `
          INSERT INTO backlog_items (
            id, title, team, lane, priority, rank, source, summary,
            why_it_matters, next_action, status_note, owner
          )
          VALUES ($1,$2,'foundation','scoped',$3,2,'Steve-approved May 19 Foundation-only unattended sprint',$4,$5,$6,$7,'Foundation Process')
          ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              team = EXCLUDED.team,
              lane = CASE WHEN backlog_items.lane = 'done' THEN backlog_items.lane ELSE EXCLUDED.lane END,
              priority = EXCLUDED.priority,
              summary = EXCLUDED.summary,
              why_it_matters = EXCLUDED.why_it_matters,
              next_action = EXCLUDED.next_action,
              status_note = EXCLUDED.status_note,
              owner = EXCLUDED.owner,
              updated_at = NOW()
        `,
        [
          cardId,
          future.title,
          future.priority,
          future.summary,
          future.whyItMatters,
          future.nextAction,
          `Scoped by ${CLOSEOUT_KEY}; proof/acceptance scope is required before build and this is not active until it becomes the Current Sprint blocker.`,
        ],
      )
    }
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-health-green-lock')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-health-green-lock-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-foundation-health-green-lock',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID }),
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

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  const byId = new Map((previous.items || []).map(item => [item.cardId, item]))
  const doneItems = (previous.items || [])
    .filter(item => item.stage === 'done_this_sprint' && item.cardId !== CARD_ID)
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
  const items = [
    ...doneItems,
    greenLockSprintItem(byId.get(CARD_ID) || {}, { closeCard }),
    ...APPROVED_RUN_ORDER.map(cardId => futureSprintItem(cardId, {
      existing: byId.get(cardId) || {},
    })),
  ].map((item, index) => ({ ...item, order: index + 1 }))

  const nextMetadata = {
    ...(previous.sprint?.metadata || {}),
    currentStatus: closeCard ? 'health_green_lock_closed' : 'health_green_lock_active',
    nextAction: closeCard
      ? `Continue ${NEXT_CARD_ID}; System Health green-lock semantics are live.`
      : `${CARD_ID} blocks the Foundation queue until false-green proof passes.`,
    lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
    priorityOrder: [
      ...doneItems.map(item => item.cardId),
      CARD_ID,
      ...APPROVED_RUN_ORDER,
    ],
    healthGreenLockSummary: {
      status: closeCard ? 'healthy' : 'active',
      rawGreenRequired: true,
      explicitSteveExceptionRequired: true,
      staleSprintHealthRejected: true,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
  delete nextMetadata.systemHealthSummary
  delete nextMetadata.embeddedSystemHealth

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Make Foundation raw-green, self-improving, backlog-clean, operationally controlled, and ready to resume source/extract work without rebuilding tech debt.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: nextMetadata,
      },
      items,
    },
    'codex-foundation-health-green-lock',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: 'FOUNDATION-HEALTH-GREEN-LOCK-001 closes false-green semantics and refreshes the approved unattended Foundation-only run order.',
    },
  )
}

async function buildLiveSystemHealth() {
  const [
    foundationJobs,
    foundationSnapshot,
    endpointBudgets,
    activeSprint,
    docArtifactBloat,
  ] = await Promise.all([
    getFoundationJobRunSnapshot({ limit: 100, includeOutput: false }),
    getFoundationSnapshot(),
    loadLatestFoundationEndpointBudgetSnapshot({ repoRoot }),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    buildDocArtifactBloatSnapshot({ repoRoot }),
  ])
  const closeouts = getFoundationBuildCloseouts()
  const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
  const sprintPlanCriticRuns = sprintCardIds.length ? await getPlanCriticRunsByCardIds(sprintCardIds) : []
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items || [],
    backlogItems: foundationSnapshot.backlogItems || [],
    closeouts,
    planCriticRuns: sprintPlanCriticRuns,
  })
  const operatingReliability = buildFoundationOperatingReliabilitySnapshot({
    sourceContracts: getSourceContracts(),
    sourceConnectors: getSourceConnectors(),
    foundationJobs,
    endpointBudgets,
    currentSprintStatus,
    backlogItems: foundationSnapshot.backlogItems || [],
    closeouts,
    docArtifactBloat,
  })
  return buildFoundationSystemHealthSnapshot({
    foundationJobs,
    foundationOperatingReliability: operatingReliability,
    endpointBudgets,
    currentSprintStatus,
    sourceContracts: getSourceContracts(),
    docArtifactBloat,
  })
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    activeSprint,
    cards,
    packageJsonSource,
    moduleSource,
    healthSource,
    currentSprintSource,
    scriptSource,
    coverageSource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, ...APPROVED_RUN_ORDER]),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-health-green-lock.js'),
    readRepoFile('lib/foundation-system-health.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-build-lane-records.js'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'system health rollup semantics, raw green lock, Current Sprint metadata, false-green proof, backlog/current-sprint card creation, and full Foundation ship gate',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let workingCards = cards
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
    workingCards = await getBacklogItemsByIds([CARD_ID, ...APPROVED_RUN_ORDER])
  }

  const packageJson = JSON.parse(packageJsonSource)
  const liveSystemHealth = await buildLiveSystemHealth()
  const systemHealthProcess = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const currentSprintProcess = runNpmScript('process:current-sprint-dynamic-truth-check', ['--json'])
  const repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const dogfood = buildFoundationHealthGreenLockDogfoodProof()
  const card = workingCards.find(item => item.id === CARD_ID) || null
  const nextCard = workingCards.find(item => item.id === NEXT_CARD_ID) || null
  const missingFutureCardIds = APPROVED_RUN_ORDER.filter(cardId => !workingCards.some(item => item.id === cardId))
  const sprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || null
  const staleSprintSummaryPresent = Boolean(workingActiveSprint.sprint?.metadata?.systemHealthSummary || workingActiveSprint.sprint?.metadata?.embeddedSystemHealth)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const unsafeRuntimeHits = [
    /\bfetch\s*\(/,
    /\bsendEmail\s*\(/,
    /\bspawn_agent\s*\(/,
    /\bupdatePermission\b/,
    /\bcreatePermission\b/,
  ].filter(pattern => pattern.test(scriptSource) || pattern.test(moduleSource)).map(pattern => pattern.source)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for health green lock', buildPlanCriticResultSummary(planReview))
  addCheck(checks, card?.priority === 'P0' && (args.closeCard ? card.lane === 'done' : ['executing', 'done', 'scoped'].includes(card?.lane)), 'live green-lock backlog card exists as P0', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, !args.closeCard || nextCard?.lane === 'scoped', 'next lessons loop card exists and is scoped after close', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, missingFutureCardIds.length === 0 || !args.closeCard, 'approved future cards are scoped before close', missingFutureCardIds.join(', ') || 'all present')
  addCheck(checks, dogfood.ok === true, 'green-lock dogfood rejects false green and stale sprint health', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'pass')
  addCheck(checks, liveSystemHealth.status === 'healthy' && Number(liveSystemHealth.summary?.rawRiskCount || 0) === 0 && Number(liveSystemHealth.summary?.rawWatchCount || 0) === 0, 'live System Health is raw green', `status=${liveSystemHealth.status} raw=${liveSystemHealth.summary?.rawRiskCount || 0}/${liveSystemHealth.summary?.rawWatchCount || 0}`)
  addCheck(checks, liveSystemHealth.summary?.greenLockStatus === 'healthy' && liveSystemHealth.summary?.greenLockBlocksGreen === false, 'live System Health uses green-lock status', JSON.stringify({ greenLockStatus: liveSystemHealth.summary?.greenLockStatus, blocks: liveSystemHealth.summary?.greenLockBlocksGreen }))
  addCheck(checks, liveSystemHealth.currentSprintHealthTruthLock?.ok === true, 'Current Sprint health truth lock is healthy', liveSystemHealth.currentSprintHealthTruthLock?.plainEnglish || 'missing')
  addCheck(checks, !args.closeCard || staleSprintSummaryPresent === false, 'stale embedded sprint health summary removed on close', staleSprintSummaryPresent ? 'stale summary still present' : 'clean')
  addCheck(checks, systemHealthProcess.exitStatus === 0 && systemHealthProcess.json?.systemHealth?.status === 'healthy', 'system-health process exits healthy only with embedded health healthy', `exit=${systemHealthProcess.exitStatus} status=${systemHealthProcess.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, currentSprintProcess.exitStatus === 0 && currentSprintProcess.json?.status === 'healthy', 'Current Sprint dynamic truth remains healthy', `exit=${currentSprintProcess.exitStatus} status=${currentSprintProcess.json?.status || 'missing'}`)
  addCheck(checks, repeatedFailureGate.exitStatus === 0 && repeatedFailureGate.json?.status === 'healthy', 'repeated-failure action gate remains healthy', `exit=${repeatedFailureGate.exitStatus} status=${repeatedFailureGate.json?.status || 'missing'}`)
  addCheck(checks, packageJson.scripts?.['process:foundation-health-green-lock-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes green-lock focused proof', packageJson.scripts?.['process:foundation-health-green-lock-check'] || 'missing')
  addCheck(checks, healthSource.includes('buildFoundationHealthGreenLockStatus') && healthSource.includes('greenLockBlocksGreen') && healthSource.includes('currentSprintHealthTruthLock'), 'system-health rollup wires green-lock semantics', 'lib/foundation-system-health.js')
  addCheck(checks, currentSprintSource.includes('metadata: sprintMetadata'), 'Current Sprint status exposes sprint metadata for exception proof', 'lib/foundation-current-sprint.js')
  addCheck(checks, moduleSource.includes('buildFoundationHealthGreenLockDogfoodProof') && moduleSource.includes('validateHealthGreenException'), 'green-lock helper owns reusable dogfood and exception validation', 'lib/foundation-health-green-lock.js')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes health green-lock card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves health green-lock', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes('green means raw green'), 'closeout handoff exists and states raw-green rule', CLOSEOUT_PATH)
  addCheck(checks, unsafeRuntimeHits.length === 0, 'green-lock code has no extraction/model/action/external-write calls', unsafeRuntimeHits.join(', ') || 'clean')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records green-lock closeout', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'Current Sprint exposes lessons loop next', nextSprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || activeBlockerCardId === NEXT_CARD_ID || args.apply, 'Current Sprint active blocker advances to lessons loop after close', activeBlockerCardId || 'missing')

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
  }

  if (args.closeCard) {
    const refreshedCards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID])
    const refreshedPlanCritic = await getPlanCriticRunsByCardIds([CARD_ID])
    const refreshedSprint = await getActiveFoundationCurrentSprint()
    addCheck(checks, refreshedCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', refreshedCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is lessons loop after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
    addCheck(checks, !refreshedSprint.sprint?.metadata?.systemHealthSummary && !refreshedSprint.sprint?.metadata?.embeddedSystemHealth, 'stale sprint health metadata stays removed after close', 'clean')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    systemHealth: {
      status: liveSystemHealth.status,
      summary: liveSystemHealth.summary,
      greenLock: liveSystemHealth.greenLock,
      currentSprintHealthTruthLock: liveSystemHealth.currentSprintHealthTruthLock,
    },
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation health green-lock check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation health green-lock check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
