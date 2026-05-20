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
  getFoundationJobRunSnapshot,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { getFoundationJobDefinition } from '../lib/foundation-jobs.js'
import {
  FOUNDATION_LESSONS_LEARNED_LOOP_APPROVAL_PATH,
  FOUNDATION_LESSONS_LEARNED_LOOP_CARD_ID as CARD_ID,
  FOUNDATION_LESSONS_LEARNED_LOOP_CHANGED_FILES,
  FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_PATH,
  FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY,
  FOUNDATION_LESSONS_LEARNED_LOOP_NEXT_CARD_ID as NEXT_CARD_ID,
  FOUNDATION_LESSONS_LEARNED_LOOP_NOT_NEXT,
  FOUNDATION_LESSONS_LEARNED_LOOP_PLAN_PATH,
  FOUNDATION_LESSONS_LEARNED_LOOP_PROOF_COMMANDS,
  FOUNDATION_LESSONS_LEARNED_LOOP_SCRIPT_PATH,
  buildFoundationLessonsLearnedLoopDogfoodProof,
  buildFoundationLessonsLearnedLoopStatus,
} from '../lib/foundation-lessons-learned-loop.js'
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
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'

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
  const value = String(text || '')
  const starts = [...value.matchAll(/\n\{/g)].map(match => match.index + 1)
  starts.unshift(value.indexOf('{'))
  for (const start of starts.filter(index => index >= 0).reverse()) {
    try {
      return JSON.parse(value.slice(start))
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

function isNonGreenFinding(finding = {}) {
  return ['risk', 'watch', 'review'].includes(String(finding.status || '').toLowerCase()) ||
    ['risk', 'watch', 'review'].includes(String(finding.rollupLevel || '').toLowerCase())
}

function parseRuntimeFailedJobKeys(detail = '') {
  return String(detail || '')
    .split(/[,;\n]/)
    .map(value => value.trim())
    .filter(Boolean)
}

function buildSystemHealthGate({ args, processResult }) {
  const health = processResult.json?.systemHealth || processResult.json || {}
  const status = health?.status || processResult.json?.status || 'missing'
  if (processResult.exitStatus === 0 && status === 'healthy') {
    return { ok: true, detail: 'healthy' }
  }

  const inSelfScheduledJob = Boolean(process.env.FOUNDATION_JOB_ACTOR) && !args.apply && !args.closeCard
  if (!inSelfScheduledJob) {
    return { ok: false, detail: `exit=${processResult.exitStatus} status=${status}` }
  }

  const allowedIds = new Set([
    `scheduled_job_${FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY}`,
    'runtime_jobs_failed',
  ])
  const findings = Array.isArray(health.findings) ? health.findings.filter(isNonGreenFinding) : []
  const blockingIds = new Set([
    ...(Array.isArray(health.greenLock?.missingExceptionFindingIds) ? health.greenLock.missingExceptionFindingIds : []),
    ...(Array.isArray(health.summary?.unclassifiedFindingIds) ? health.summary.unclassifiedFindingIds : []),
    ...(Array.isArray(health.summary?.blockingClassifiedFindingIds) ? health.summary.blockingClassifiedFindingIds : []),
  ].filter(Boolean))
  const nonGreenIds = new Set([
    ...findings.map(finding => finding.id).filter(Boolean),
    ...blockingIds,
  ])
  const unexpectedIds = [...nonGreenIds].filter(id => !allowedIds.has(id))
  const selfScheduledFinding = findings.find(finding => finding.id === `scheduled_job_${FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY}`)
  const runtimeFailedFinding = findings.find(finding => finding.id === 'runtime_jobs_failed')
  const runtimeFailedKeys = parseRuntimeFailedJobKeys(runtimeFailedFinding?.detail)
  const scheduledOk = !nonGreenIds.has(`scheduled_job_${FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY}`) ||
    selfScheduledFinding?.jobKey === FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY
  const runtimeOk = !nonGreenIds.has('runtime_jobs_failed') ||
    (runtimeFailedKeys.length === 1 && runtimeFailedKeys[0] === FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY)

  if (!unexpectedIds.length && scheduledOk && runtimeOk) {
    return {
      ok: true,
      detail: `self-run transition allowed while ${FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY} proves recovery: ${[...nonGreenIds].join(', ') || 'none'}`,
    }
  }

  return {
    ok: false,
    detail: `exit=${processResult.exitStatus} status=${status} unexpected=${unexpectedIds.join(', ') || 'none'} runtime=${runtimeFailedKeys.join(', ') || 'none'}`,
  }
}

function buildRepeatedFailureGate({ args, processResult }) {
  const status = processResult.json?.status || processResult.json?.actionGate?.status || 'missing'
  if (processResult.exitStatus === 0 && status === 'healthy') {
    return { ok: true, detail: `exit=${processResult.exitStatus} status=${status}` }
  }

  const inSelfScheduledJob = Boolean(process.env.FOUNDATION_JOB_ACTOR) && !args.apply && !args.closeCard
  if (!inSelfScheduledJob) {
    return { ok: false, detail: `exit=${processResult.exitStatus} status=${status}` }
  }

  const actionGate = processResult.json?.actionGate || {}
  const blockingItems = Array.isArray(actionGate.blockingItems) ? actionGate.blockingItems : []
  const selfBlocks = blockingItems.filter(item =>
    item?.source === 'foundation_job_runs' &&
      item?.key === FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY
  )
  if (blockingItems.length > 0 && blockingItems.length === selfBlocks.length) {
    return {
      ok: true,
      detail: `self-run transition allowed while ${FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY} proves repeated-failure recovery`,
    }
  }

  return {
    ok: false,
    detail: `exit=${processResult.exitStatus} status=${status} blockers=${blockingItems.map(item => item.key).join(', ') || 'none'}`,
  }
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

async function loadLocalMemoryFiles() {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const paths = [`memory/${isoDate(today)}.md`, `memory/${isoDate(yesterday)}.md`]
  const entries = await Promise.all(paths.map(async relativePath => {
    try {
      return [relativePath, await readRepoFile(relativePath)]
    } catch (error) {
      if (error?.code === 'ENOENT') return [relativePath, '']
      throw error
    }
  }))
  return Object.fromEntries(entries.filter(([, content]) => content))
}

function foundationJobRows(snapshot = {}) {
  if (Array.isArray(snapshot)) return snapshot
  if (Array.isArray(snapshot.rows)) return snapshot.rows
  if (Array.isArray(snapshot.runs)) return snapshot.runs
  if (Array.isArray(snapshot.recentRuns)) return snapshot.recentRuns
  if (Array.isArray(snapshot.latestRuns)) return snapshot.latestRuns
  return []
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Build nightly lessons-learned self-improvement loop',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 2,
    source: 'Steve 2026-05-19: nightly lessons must turn repeated waste and builder mistakes into behavior-changing repair/card/gate/doctrine outputs.',
    summary: 'Build a read-only scheduled lessons loop that evaluates audit, failure, job, sprint, and local/private conversation signals and fails if lessons are only documented.',
    whyItMatters: 'Foundation should learn from repeated failures without Steve manually noticing every yellow row or builder pattern. Lessons must become gates, cards, verifier/Plan Critic rules, or durable doctrine.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue ${NEXT_CARD_ID}.`
      : 'Wire the lessons loop, scheduled read-only job, dogfood proof, privacy boundary, and live sprint closeout.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; scheduled lessons loop is read-only, privacy-bound, and behavior-action gated.`
      : `Executing \`${CLOSEOUT_KEY}\`; lessons cannot close as documentation-only notes.`,
    owner: 'Foundation Process',
  }
}

function buildNextCardRow() {
  return {
    id: NEXT_CARD_ID,
    title: 'Clean live backlog P0 reality',
    scope: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 3,
    source: 'Steve-approved May 19 Foundation-only unattended sprint.',
    summary: 'Separate active P0 blockers from deferred/provider/approval/security-rotation cards so operator priority truth is honest.',
    whyItMatters: 'P0 must mean active operational priority, not a pile of scary parked work that hides the real next blocker.',
    nextAction: 'Review live P0/P1 backlog truth, keep real exposure work, and move deferred/provider-approval items out of active blocker posture.',
    statusNote: `Scoped by ${CLOSEOUT_KEY}; ready after lessons loop closeout.`,
    owner: 'Foundation Process',
  }
}

function nextSprintItem(item = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    stage: item.stage && item.stage !== 'done_this_sprint' ? item.stage : 'scoping',
    planRef: item.planRef || 'docs/process/foundation-backlog-p0-reality-cleanup-001-plan.md',
    definitionOfDone: item.definitionOfDone || 'Live backlog priority truth separates real active P0 blockers from deferred/provider/approval/scary-but-not-now work.',
    nextAction: item.nextAction || 'Clean live P0/P1 backlog reality before SYSTEM-010.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...FOUNDATION_LESSONS_LEARNED_LOOP_NOT_NEXT])),
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      requiredBeforeContinuousWork: true,
    },
  }
}

function lessonsSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: FOUNDATION_LESSONS_LEARNED_LOOP_PLAN_PATH,
    definitionOfDone: 'Nightly lessons loop routes repeated failures, health/audit drift, builder mistakes, and local/private conversation lessons into behavior-changing card/gate/verifier/Plan Critic/doctrine outputs. Documentation-only lessons fail.',
    proofCommands: FOUNDATION_LESSONS_LEARNED_LOOP_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close the behavior-changing lessons loop before backlog P0 cleanup.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...FOUNDATION_LESSONS_LEARNED_LOOP_NOT_NEXT])),
    existingWorkCheck: {
      existingCode: [
        'lib/code-quality-nightly-audit.js',
        'lib/connector-uptime-monitor.js',
        'lib/foundation-system-health.js',
        'lib/foundation-jobs.js',
      ],
      existingDocs: [
        'docs/process/builder-lesson-linker-001-plan.md',
        'docs/process/recurring-deep-audit-001-plan.md',
        'AGENTS.md',
      ],
      existingScripts: [
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
        'scripts/process-audit-finding-to-backlog-router-check.mjs',
      ],
      existingPolicy: [
        'Live Backlog is task truth.',
        'Green means raw green; classification is not repair.',
        'Repeated failures are repair triggers, not report trivia.',
        'Lessons learned must become behavior-changing cards, gates, rules, doctrine, approval-required exceptions, or no-op proof.',
        'Private conversation review stays local/private unless Steve approves external model use.',
      ],
      newCode: [
        'lib/foundation-lessons-learned-loop.js',
        FOUNDATION_LESSONS_LEARNED_LOOP_SCRIPT_PATH,
      ],
      reused: [
        'live System Health',
        'repeated-failure action gate',
        'foundation_job_runs',
        'local/private memory metadata',
        'DB-backed backlog and Current Sprint truth',
      ],
      notRebuilt: [
        'No new scheduler.',
        'No new backlog system.',
        'No external LLM reviewer.',
        'No autonomous code fixer.',
      ],
      exactGap: 'The system had telemetry and reports, but no reusable proof that lessons become repair/card/gate/doctrine action instead of another note.',
      overBroadRisk: 'This can drift into autonomous review or source/value work. V1 is a read-only routing/evaluation loop plus explicit closeout apply.',
      readyBy: 'Steve',
      readyAt: '2026-05-19T12:50:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: FOUNDATION_LESSONS_LEARNED_LOOP_APPROVAL_PATH,
      scheduledJobKey: FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY,
      privateConversationMode: 'local_private_metadata_only',
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(lessonsSprintItem(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(lessonsSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(nextSprintItem(item))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    if (item.cardId) seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(lessonsSprintItem({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(nextSprintItem({ order: items.length + 1 }))
  return items.map((item, index) => ({ ...item, order: index + 1 }))
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_LESSONS_LEARNED_LOOP_SCRIPT_PATH,
    operation: 'create/update lessons loop backlog card, Plan Critic row, next card, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const row = buildCardRow({ closeCard })
  const nextRow = buildNextCardRow()
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const card of [row, nextRow]) {
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
              lane = CASE
                WHEN backlog_items.id = $13 THEN EXCLUDED.lane
                WHEN backlog_items.lane = 'done' THEN backlog_items.lane
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
        [card.id, card.title, card.scope, card.lane, card.priority, card.rank, card.source, card.summary, card.whyItMatters, card.nextAction, card.statusNote, card.owner, CARD_ID],
      )
    }
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-lessons-learned-loop')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-lessons-loop-${stableRunId(FOUNDATION_LESSONS_LEARNED_LOOP_PLAN_PATH)}`,
        CARD_ID,
        FOUNDATION_LESSONS_LEARNED_LOOP_PLAN_PATH,
        planReview.status,
        planReview.score,
        FOUNDATION_LESSONS_LEARNED_LOOP_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-foundation-lessons-learned-loop',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, nextCardId: NEXT_CARD_ID }),
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
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || SPRINT_ID,
        status: 'active',
        goal: 'Make Foundation raw-green, self-improving, backlog-clean, operationally controlled, and ready to resume source/extract work without rebuilding tech debt.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'lessons_learned_loop_closed' : 'lessons_learned_loop_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `Continue ${NEXT_CARD_ID}; lessons learned loop is live.`
            : `${CARD_ID} blocks the Foundation queue until documentation-only lessons fail and privacy-bound action routing passes.`,
          lessonsLearnedLoopSummary: {
            status: closeCard ? 'healthy' : 'active',
            scheduledJobKey: FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY,
            privacyPosture: 'local_private_metadata_only',
            documentedOnlyRejected: true,
            closeoutKey: CLOSEOUT_KEY,
          },
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-foundation-lessons-learned-loop',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: 'FOUNDATION-LESSONS-LEARNED-LOOP-001 closes the self-improvement loop and advances to P0 backlog reality cleanup.',
    },
  )
}

function containsUnsafeRuntimeCall(source = '') {
  const executableSource = String(source || '').replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, '')
  const patterns = [
    /\bfetch\s*\(/,
    /\bstartExtractionRun\s*\(/,
    /\bcreateChatCompletion\s*\(/,
    /\bresponses\.create\s*\(/,
    /\bsendGmail\b/,
    /\bwriteClickUp\b/,
    /\bcreatePermission\b/,
    /\bupdatePermission\b/,
    /\bspawn_agent\s*\(/,
  ]
  return patterns.filter(pattern => pattern.test(executableSource)).map(pattern => pattern.source)
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    activeSprint,
    foundationSnapshot,
    foundationJobs,
    memoryFiles,
    packageJsonSource,
    moduleSource,
    jobsSource,
    missiveSyncSource,
    driveContentSource,
    sharedCommsStoreSource,
    jobMutationAllowlistSource,
    hubReadRoutesSource,
    scriptSource,
    coverageSource,
    closeoutRegistrySource,
    agentsSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: FOUNDATION_LESSONS_LEARNED_LOOP_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(FOUNDATION_LESSONS_LEARNED_LOOP_PLAN_PATH),
    getActiveFoundationCurrentSprint(),
    getFoundationSnapshot(),
    getFoundationJobRunSnapshot({ limit: 100, includeOutput: false }),
    loadLocalMemoryFiles(),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-lessons-learned-loop.js'),
    readRepoFile('lib/foundation-jobs.js'),
    readRepoFile('scripts/sync-missive-archive.mjs'),
    readRepoFile('scripts/extract-drive-content.mjs'),
    readRepoFile('lib/foundation-shared-comms-store.js'),
    readRepoFile('lib/foundation-job-mutation-allowlist.js'),
    readRepoFile('lib/hub-read-routes.js'),
    readRepoFile(FOUNDATION_LESSONS_LEARNED_LOOP_SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile('AGENTS.md'),
    readRepoFile(FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_PATH, { optional: true }),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: FOUNDATION_LESSONS_LEARNED_LOOP_CHANGED_FILES,
    declaredRisk: 'scheduled Foundation self-improvement loop, local/private conversation metadata boundary, lessons-to-action routing, Current Sprint progression, job registry, and full Foundation ship gate',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
  }

  const systemHealthProcess = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const systemHealthGate = buildSystemHealthGate({ args, processResult: systemHealthProcess })
  const repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const repeatedFailureGateStatus = buildRepeatedFailureGate({ args, processResult: repeatedFailureGate })
  const liveBacklogIds = (foundationSnapshot.backlogItems || []).map(item => item.id).filter(Boolean)
  const currentSprintCardIds = (workingActiveSprint.items || []).map(item => item.cardId).filter(Boolean)
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || ''
  const lessonStatus = buildFoundationLessonsLearnedLoopStatus({
    systemHealth: systemHealthProcess.json?.systemHealth || systemHealthProcess.json || {},
    repeatedFailureGate: repeatedFailureGate.json || {},
    foundationJobRuns: foundationJobRows(foundationJobs),
    memoryFiles,
    liveBacklogIds,
    currentSprintCardIds,
    scopedCardIds: [CARD_ID, NEXT_CARD_ID],
    activeBlockerCardId,
  })
  const dogfood = buildFoundationLessonsLearnedLoopDogfoodProof()
  const packageJson = JSON.parse(packageJsonSource)
  const jobDefinition = getFoundationJobDefinition(FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY)
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprint = (workingActiveSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const unsafeHits = [
    ...containsUnsafeRuntimeCall(moduleSource),
    ...containsUnsafeRuntimeCall(scriptSource),
  ]

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FOUNDATION_LESSONS_LEARNED_LOOP_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for lessons loop', buildPlanCriticResultSummary(planReview))
  addCheck(checks, card?.priority === 'P0' && (args.closeCard ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card?.lane)), 'live lessons loop backlog card exists as P0', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, !args.closeCard || nextCard?.lane === 'scoped', 'next P0 backlog reality card exists after close', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, dogfood.ok === true, 'dogfood rejects documented-only lessons and private external upload', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'pass')
  addCheck(checks, lessonStatus.status === 'healthy' && lessonStatus.summary?.writesBacklog === false && lessonStatus.summary?.externalModelUse === false, 'live lessons loop routes current lessons without writes or external model use', `status=${lessonStatus.status} lessons=${lessonStatus.summary?.lessonCount || 0} failed=${lessonStatus.summary?.failedCount || 0}`)
  addCheck(checks, lessonStatus.summary?.privateConversationLessonCount >= 1 && lessonStatus.summary?.privacyPosture === 'local_private_metadata_only', 'local/private conversation review stays metadata-only', `privateSignals=${lessonStatus.summary?.privateConversationLessonCount || 0}`)
  addCheck(checks, systemHealthGate.ok, 'System Health remains healthy or only this running lessons job is pending success', systemHealthGate.detail)
  addCheck(checks, repeatedFailureGateStatus.ok, 'repeated-failure gate remains healthy or only this running lessons job is proving recovery', repeatedFailureGateStatus.detail)
  addCheck(checks, packageJson.scripts?.['process:foundation-lessons-learned-loop-check'] === `node --env-file-if-exists=.env ${FOUNDATION_LESSONS_LEARNED_LOOP_SCRIPT_PATH}`, 'package exposes lessons loop focused proof', packageJson.scripts?.['process:foundation-lessons-learned-loop-check'] || 'missing')
  addCheck(checks, jobDefinition?.key === FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY && jobDefinition.runtimeMode === 'scheduled' && jobDefinition.mutationPosture === 'read_only' && jobDefinition.scheduleLocalTime === '05:45', 'lessons loop job is scheduled read-only after System Health', jobDefinition ? `${jobDefinition.runtimeMode}/${jobDefinition.scheduleLocalTime}/${jobDefinition.mutationPosture}` : 'missing')
  addCheck(checks, jobsSource.includes(FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY) && jobsSource.includes('local_private_metadata'), 'Foundation job registry contains lessons loop privacy posture', FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY)
  addCheck(checks, moduleSource.includes('buildFoundationLessonsLearnedLoopDogfoodProof') && moduleSource.includes('documented-only action is not allowed'), 'lessons loop module owns reusable action evaluator and dogfood', 'lib/foundation-lessons-learned-loop.js')
  addCheck(checks, missiveSyncSource.includes('runWithFoundationGateRetry') && missiveSyncSource.includes('Transient archive retries'), 'Missive current sync retries transient per-item archive failures', 'scripts/sync-missive-archive.mjs')
  addCheck(checks, driveContentSource.includes('postgresNullBytesRemoved') && driveContentSource.includes('empty_text_after_postgres_sanitization'), 'Drive content extraction strips Postgres NUL bytes before hash/store', 'scripts/extract-drive-content.mjs')
  addCheck(checks, sharedCommsStoreSource.includes('sanitizePostgresJsonValue') && sharedCommsStoreSource.includes('replace(/\\u0000/g'), 'shared communication artifact writes sanitize Postgres text/json payloads', 'lib/foundation-shared-comms-store.js')
  addCheck(checks, jobMutationAllowlistSource.includes(FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY) && jobMutationAllowlistSource.includes('closeout/backlog writes require explicit --apply'), 'lessons loop scheduled job has explicit mutation allowlist posture', 'lib/foundation-job-mutation-allowlist.js')
  addCheck(checks, hubReadRoutesSource.includes('fullDiagnosticsBacklogRowTrimmedFields') && hubReadRoutesSource.includes('createdAt') && hubReadRoutesSource.includes('updatedAt'), 'full diagnostics trims nonessential backlog timestamps to stay inside payload budget', 'lib/hub-read-routes.js')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes lessons loop card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves lessons loop', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes('documentation-only lessons fail'), 'closeout handoff exists and states behavior-change rule', FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_PATH)
  addCheck(checks, agentsSource.includes('Repeated failures are repair triggers') && agentsSource.includes('Lessons learned are not done because they are documented') && agentsSource.includes('Keep lane ownership explicit'), 'AGENTS durable doctrine captures repeated failure, lesson, and lane rules', 'AGENTS.md')
  addCheck(checks, unsafeHits.length === 0, 'lessons loop code has no extraction/model/action/external-write calls', unsafeHits.join(', ') || 'clean')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records lessons loop closeout', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || nextSprint?.stage === 'scoping', 'Current Sprint exposes backlog P0 reality cleanup next', nextSprint?.stage || 'missing')
  addCheck(checks, !args.closeCard || (workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID || args.apply, 'Current Sprint active blocker advances to backlog P0 cleanup after close', workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || 'missing')

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
  }

  if (args.closeCard) {
    const [refreshedCards, refreshedPlanCritic, refreshedSprint] = await Promise.all([
      getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([CARD_ID]),
      getActiveFoundationCurrentSprint(),
    ])
    addCheck(checks, refreshedCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', refreshedCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is backlog P0 cleanup after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    lessonStatus,
    dogfood,
    jobDefinition: jobDefinition ? {
      key: jobDefinition.key,
      runtimeMode: jobDefinition.runtimeMode,
      mutationPosture: jobDefinition.mutationPosture,
      scheduleLocalTime: jobDefinition.scheduleLocalTime,
    } : null,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation lessons learned loop check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation lessons learned loop check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
