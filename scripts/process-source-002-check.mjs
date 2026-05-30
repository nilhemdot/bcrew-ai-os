#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
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
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
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
  getSourceContractRegistryRowsWithClient,
  syncSourceContractRegistryRowsWithClient,
} from '../lib/source-contract-registry-table.js'
import {
  buildSource002ContractStatus,
  buildSource002DogfoodProof,
  SOURCE_002_APPROVAL_PATH,
  SOURCE_002_CARD_ID as CARD_ID,
  SOURCE_002_CHANGED_FILES,
  SOURCE_002_CLOSEOUT_KEY as CLOSEOUT_KEY,
  SOURCE_002_CLOSEOUT_PATH,
  SOURCE_002_NEXT_CARD_ID as NEXT_CARD_ID,
  SOURCE_002_NOT_NEXT,
  SOURCE_002_PLAN_PATH,
  SOURCE_002_PROOF_COMMANDS,
  SOURCE_002_SCRIPT_PATH,
  SOURCE_002_SOURCE_ID as SOURCE_ID,
} from '../lib/source-002-calendar-source-contract.js'
import { buildSourceLifecycleStatus } from '../lib/source-lifecycle.js'
import { buildSourceLifecycleCompletionStatus } from '../lib/source-lifecycle-completion.js'
import { buildSourceOfTruthPayload } from '../lib/source-of-truth-payload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
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
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function cardIds() {
  return Array.from(new Set([CARD_ID, NEXT_CARD_ID]))
}

async function readRequiredSources() {
  return {
    planSource: await readRepoFile(SOURCE_002_PLAN_PATH),
    sourceRegistrySource: await readRepoFile('docs/source-registry.md'),
    sharedCommsNoteSource: await readRepoFile('docs/source-notes/shared-communications.md'),
    syncCalendarEventsSource: await readRepoFile('scripts/sync-calendar-events.mjs'),
    sourceContractsSource: await readRepoFile('lib/source-contracts.js'),
    lifecycleCompletionSource: await readRepoFile('lib/source-lifecycle-completion.js'),
    processSource: await readRepoFile(SOURCE_002_SCRIPT_PATH),
    packageJson: await readRepoJson('package.json'),
  }
}

async function queryLiveCalendarState({ syncRegistry = false } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const targetResult = await client.query(`
      SELECT target_key, source_id, title, lane, target_type, status, priority,
             runtime_mode, budget, last_run_at, next_run_at, last_status, last_error,
             inspected_count, archived_count, extracted_count
      FROM source_crawl_targets
      WHERE source_id = 'SRC-GCAL-001'
      ORDER BY target_key
    `)
    const allTargetsResult = await client.query(`
      SELECT target_key, source_id, title, lane, target_type, status, priority,
             runtime_mode, budget, last_run_at, next_run_at, last_status, last_error,
             inspected_count, archived_count, extracted_count
      FROM source_crawl_targets
      ORDER BY target_key
    `)
    const jobResult = await client.query(`
      SELECT DISTINCT ON (job_key)
             run_id, job_key, status, started_at, finished_at, error_message
      FROM foundation_job_runs
      WHERE job_key IN ('calendar-sync-current')
      ORDER BY job_key, started_at DESC NULLS LAST, created_at DESC
    `)
    const artifactResult = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE artifact_type = 'calendar_event')::int AS calendar_event_count,
        MAX(ingested_at) FILTER (WHERE artifact_type = 'calendar_event') AS latest_calendar_event_at
      FROM shared_communication_artifacts
      WHERE source_id = 'SRC-GCAL-001'
    `)
    const backlogResult = await client.query('SELECT id FROM backlog_items')
    const syncResult = syncRegistry
      ? await syncSourceContractRegistryRowsWithClient(client, { actor: 'codex-source-002-process-check' })
      : null
    return {
      registryRows: await getSourceContractRegistryRowsWithClient(client),
      registrySync: syncResult,
      targetRows: targetResult.rows,
      lifecycleTargets: allTargetsResult.rows.map(row => ({
        targetKey: row.target_key,
        sourceId: row.source_id,
        title: row.title,
        lane: row.lane,
        targetType: row.target_type,
        status: row.status,
        priority: row.priority,
        runtimeMode: row.runtime_mode,
        scheduler: {
          runtimeMode: row.runtime_mode,
          scheduleStatus: row.status === 'active' ? 'scheduled' : row.status,
        },
        budget: row.budget || {},
        lastRunAt: row.last_run_at,
        nextRunAt: row.next_run_at,
        lastStatus: row.last_status,
        lastError: row.last_error,
        inspectedCount: row.inspected_count,
        archivedCount: row.archived_count,
        extractedCount: row.extracted_count,
      })),
      foundationHub: {
        backlogItems: backlogResult.rows,
      },
      latestJobs: Object.fromEntries(jobResult.rows.map(row => [row.job_key, row])),
      artifactSummary: {
        calendarEventCount: Number(artifactResult.rows[0]?.calendar_event_count || 0),
        latestCalendarEventAt: artifactResult.rows[0]?.latest_calendar_event_at || null,
      },
    }
  } finally {
    client.release()
    await pool.end()
  }
}

function buildSource002CardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Revalidate Google Calendar as a rebuild source contract',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 4,
    source: 'Existing SOURCE-002 backlog card, delegated Google Workspace Calendar source contract, governed calendar-current-day lane.',
    summary: 'Lock SRC-GCAL-001 as a signed-off read-side current-reality source for bounded Calendar event/cadence context without approving Calendar writes, invites, RSVP handling, credential mutation, broad calendar extraction, or meeting-note/transcript truth.',
    whyItMatters: 'Calendar is useful operating context only if the system knows its exact boundary. This card lets source-backed cadence and scheduling context participate in Foundation while preserving write/privacy boundaries.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue \`${NEXT_CARD_ID}\`.`
      : 'Prove Calendar source contract sign-off, governed current-window sync, calendar_event artifacts, source registry sync, and no-write/no-meeting-content boundaries before closing.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; SRC-GCAL-001 is signed off for delegated read-side current reality only.`
      : `Executing \`${CLOSEOUT_KEY}\`; closing the Calendar read-side source contract without external writes.`,
    owner: 'Foundation Source',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    id: NEXT_CARD_ID,
    title: existing.title || 'Revalidate Google Drive as a rebuild source contract',
    team: 'foundation',
    lane: existing.lane || 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank ?? 5,
    source: existing.source || 'Existing source-contract validation-layer bundle.',
    summary: existing.summary || 'Prove Drive access in the rebuild, define canonical docs/folders and signed-off scope for strategy, meeting artifacts, training assets, and source-linked supporting material.',
    whyItMatters: existing.whyItMatters || existing.why_it_matters || 'Drive is the largest shared-memory source and needs a signed-off boundary before richer source expansion continues.',
    nextAction: existing.nextAction || existing.next_action || 'Scope and prove SOURCE-003 next.',
    statusNote: existing.statusNote || existing.status_note || `Next active source-contract card after ${CLOSEOUT_KEY}.`,
    owner: existing.owner || 'Foundation Source',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `source-002-${stableRunId(SOURCE_002_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

function buildSource002ExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-contracts.js',
      'lib/source-lifecycle-completion.js',
      'lib/source-contract-registry-table.js',
      'lib/foundation-jobs.js',
      'scripts/sync-calendar-events.mjs',
      'scripts/run-extraction-target.mjs',
      'source_contract_registry',
      'source_crawl_targets',
      'foundation_job_runs',
      'shared_communication_artifacts',
    ],
    existingDocs: [
      'docs/source-registry.md',
      'docs/source-notes/shared-communications.md',
      'docs/process/gcal-atom-schedule-001-plan.md',
      'docs/process/source-012-source-connector-live-layers-plan.md',
      'docs/process/source-018-google-gemini-meeting-notes-contract-plan.md',
    ],
    existingScripts: [
      'scripts/sync-calendar-events.mjs',
      'scripts/run-extraction-target.mjs',
      'scripts/seed-extraction-control.mjs',
      'scripts/process-gcal-atom-schedule-check.mjs',
      'scripts/process-system-health-nightly-audit-check.mjs',
      'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
    ],
    existingPolicy: 'Use existing governed Calendar current-window read lane only. Park unsafe actions; do not write Calendar events, invites, RSVPs, credentials, provider config, Drive permissions, or broad private calendar extraction from SOURCE-002.',
    reused: 'Reused the existing Calendar target, scheduled job, source lifecycle, connector credential registry, source registry, source contract registry, Current Sprint, Plan Critic, and ship-gate surfaces.',
    notRebuilt: 'No new Calendar connector, no new scheduler, no new OAuth workflow, no Calendar write assistant, no meeting transcript/notes replacement, and no broad calendar crawler.',
    exactGap: 'SRC-GCAL-001 had a working governed event archive but still lacked a signed-off current-reality source boundary in source contracts, registry, lifecycle, and sprint truth.',
    overBroadRisk: 'A Calendar source-contract card can drift into event writes, invites, RSVP automation, broad calendar/private extraction, credential mutation, or pretending Calendar contains meeting-note/transcript discussion truth.',
    readyBy: 'Steve unattended Foundation sprint approval plus live local DB/source proof.',
    readyAt: '2026-05-20T03:30:00-04:00',
  }
}

function buildSource003ExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-contracts.js',
      'lib/source-lifecycle-completion.js',
      'lib/source-contract-registry-table.js',
      'lib/foundation-jobs.js',
      'scripts/sync-google-drive-corpus.mjs',
      'scripts/run-extraction-target.mjs',
      'source_contract_registry',
      'source_crawl_targets',
      'foundation_job_runs',
      'shared_communication_artifacts',
    ],
    existingDocs: [
      'docs/source-registry.md',
      'docs/source-notes/google-drive-corpus.md',
      'docs/source-notes/shared-communications.md',
      'docs/process/source-012-source-connector-live-layers-plan.md',
      'docs/process/drive-content-001-plan.md',
    ],
    existingScripts: [
      'scripts/sync-google-drive-corpus.mjs',
      'scripts/extract-drive-content-bite.mjs',
      'scripts/run-extraction-target.mjs',
      'scripts/process-system-health-nightly-audit-check.mjs',
      'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
    ],
    existingPolicy: 'Use the existing delegated Google Workspace Drive read lane only. Park unsafe actions; do not mutate Drive permissions, OAuth scopes, provider config, file sharing, external writes, or broad private Drive extraction from SOURCE-003.',
    reused: 'Reuses the existing Google Drive source contract, Drive corpus notes, Drive content extraction bite, source lifecycle, connector credential registry, Current Sprint, Plan Critic, and ship-gate surfaces.',
    notRebuilt: 'No new Drive connector, no Drive permission workflow, no OAuth scope change, no broad Drive crawler, no canonical strategy rewrite from Drive, and no external file mutations.',
    exactGap: 'SRC-GDRIVE-001 has readable delegated Drive lanes and content bites, but still needs a signed-off current-reality source boundary for canonical folders, strategy evidence intake, meeting artifacts, and non-canonical readable files.',
    overBroadRisk: 'A Drive source-contract card can drift into permission mutation, broad private extraction, treating random readable files as canonical truth, or expanding into full Drive Worker before the source boundary is signed off.',
    readyBy: 'Steve unattended Foundation sprint approval plus SOURCE-002 closeout handoff.',
    readyAt: '2026-05-20T03:45:00-04:00',
  }
}

async function upsertBacklogAndSprint({ closeCard = false, planReview, previousSprint, existingCards = [] } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const cardRow = buildSource002CardRow({ closeCard })
  const nextExisting = existingCards.find(card => card.id === NEXT_CARD_ID) || {}
  const nextRow = buildNextCardRow(nextExisting)
  const planRun = buildPlanCriticRun(planReview)
  try {
    await client.query('BEGIN')
    for (const row of [cardRow, nextRow]) {
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
        [row.id, row.title, row.team, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
      )
    }
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-source-002')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        CARD_ID,
        SOURCE_002_PLAN_PATH,
        planReview.status,
        planReview.score,
        SOURCE_002_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }

  const sprintRecord = previousSprint?.sprint || previousSprint || {}
  const sprintItems = previousSprint?.items || sprintRecord?.items || []
  const existingById = new Map(sprintItems.map(item => [item.cardId, item]))
  const maxOrder = sprintItems.reduce((max, item) => Math.max(max, Number(item.order || item.sprintOrder || 0)), 0)
  const sourceOrder = existingById.get(CARD_ID)?.order || existingById.get(CARD_ID)?.sprintOrder || maxOrder + 1
  const nextOrder = existingById.get(NEXT_CARD_ID)?.order || existingById.get(NEXT_CARD_ID)?.sprintOrder || sourceOrder + 1
  const merged = sprintItems
    .filter(item => item.cardId !== CARD_ID && item.cardId !== NEXT_CARD_ID)
    .map(item => ({ ...item }))
  merged.push({
    ...(existingById.get(CARD_ID) || {}),
    cardId: CARD_ID,
    order: sourceOrder,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: SOURCE_002_PLAN_PATH,
    definitionOfDone: 'SRC-GCAL-001 is signed off for delegated read-side current reality with governed current-window sync, calendar_event artifacts, source-registry sync, and no-write/no-meeting-content boundaries.',
    proofCommands: SOURCE_002_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close SOURCE-002 before SOURCE-003.',
    notNextBoundaries: Array.from(new Set([...(existingById.get(CARD_ID)?.notNextBoundaries || []), ...SOURCE_002_NOT_NEXT])),
    existingWorkCheck: {
      ...(existingById.get(CARD_ID)?.existingWorkCheck || {}),
      ...buildSource002ExistingWorkCheck(),
    },
    metadata: {
      ...(existingById.get(CARD_ID)?.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: SOURCE_002_APPROVAL_PATH,
    },
  })
  merged.push({
    ...(existingById.get(NEXT_CARD_ID) || {}),
    cardId: NEXT_CARD_ID,
    order: nextOrder,
    stage: closeCard ? 'scoping' : (existingById.get(NEXT_CARD_ID)?.stage || 'scoping'),
    planRef: existingById.get(NEXT_CARD_ID)?.planRef || '',
    definitionOfDone: existingById.get(NEXT_CARD_ID)?.definitionOfDone || 'Drive source contract is planned, approved, proven, and closed before broader source expansion.',
    proofCommands: existingById.get(NEXT_CARD_ID)?.proofCommands || [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    nextAction: nextRow.nextAction,
    existingWorkCheck: {
      ...(existingById.get(NEXT_CARD_ID)?.existingWorkCheck || {}),
      ...buildSource003ExistingWorkCheck(),
    },
    metadata: {
      ...(existingById.get(NEXT_CARD_ID)?.metadata || {}),
      owner: 'Source Contracts',
    },
  })
  merged.sort((a, b) => Number(a.order || a.sprintOrder || 0) - Number(b.order || b.sprintOrder || 0))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20',
        status: 'active',
        goal: sprintRecord?.goal || 'Prove one trusted assistant loop and then continue safe Foundation surfaces without widening too early.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(sprintRecord?.metadata || {}),
          lastClosedCardId: closeCard ? CARD_ID : sprintRecord?.metadata?.lastClosedCardId,
          lastCloseoutKey: closeCard ? CLOSEOUT_KEY : sprintRecord?.metadata?.lastCloseoutKey,
        },
      },
      items: merged,
    },
    'codex-source-002',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20',
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} Calendar source contract and ${closeCard ? `advances to ${NEXT_CARD_ID}` : 'owns the active blocker'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
      commandName: 'process-source-002-check',
      summary: 'sync SOURCE-002 source registry truth and close Current Sprint card',
    })
  }

  const checks = []
  const sources = await readRequiredSources()
  const approvalValidation = await validatePlanApprovalFile({ repoRoot, approvalRef: SOURCE_002_APPROVAL_PATH, cardId: CARD_ID })
  const approval = approvalValidation.approval || {}
  const planReview = evaluatePlanCriticPlan({
    planText: sources.planSource,
    card: buildSource002CardRow({ closeCard: args.closeCard }),
    changedFiles: SOURCE_002_CHANGED_FILES,
    declaredRisk: 'source contract semantics, Calendar read-side privacy boundaries, DB registry sync, live DB proof, Current Sprint progression, package script, closeout registry, and full Foundation ship gate',
    repoRoot,
  })
  const planSummary = buildPlanCriticResultSummary(planReview)

  await initFoundationDb()
  const activeSprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds(cardIds())
  const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID])

  const liveState = await queryLiveCalendarState({ syncRegistry: args.apply || args.closeCard })
  const payload = await buildSourceOfTruthPayload({ repoRoot })
  const sourceLifecycle = buildSourceLifecycleStatus({
    sources: payload.sources,
    connectors: payload.connectors,
    groupedSystems: payload.groupedSystems,
    extractionControl: { targets: liveState.lifecycleTargets },
    foundationJobs: getFoundationJobDefinitions(),
  })
  const lifecycleStatus = buildSourceLifecycleCompletionStatus({
    sourceLifecycle,
    sourceOfTruth: payload,
    foundationHub: liveState.foundationHub,
  })
  const status = buildSource002ContractStatus({
    artifactSummary: liveState.artifactSummary,
    jobDefinitions: getFoundationJobDefinitions(),
    latestJobs: liveState.latestJobs,
    registryRows: liveState.registryRows,
    sourceContracts: payload.sources,
    sourceLifecycleRows: lifecycleStatus.sources,
    targetRows: liveState.targetRows,
    sources,
  })
  const dogfood = buildSource002DogfoodProof()
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY)
  const packageScript = sources.packageJson.scripts?.['process:source-002-check']
  const currentActiveBlocker =
    activeSprint?.activeBlocker?.cardId ||
    activeSprint?.activeBlockerCardId ||
    activeSprint?.sprint?.activeBlockerCardId

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'SOURCE-002 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || SOURCE_002_APPROVAL_PATH)
  addCheck(checks, approval.cardId === CARD_ID && Number(approval.score) >= 9.8, 'SOURCE-002 approval score is 9.8+', `${approval.cardId || 'missing'} / ${approval.score || 'missing'}`)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes SOURCE-002 plan', `${planReview.status} ${planReview.score}/10`)
  addCheck(checks, cards.some(card => card.id === CARD_ID), 'SOURCE-002 backlog card exists', cards.map(card => card.id).join(', '))
  addCheck(checks, currentActiveBlocker === CARD_ID || (args.closeCard && currentActiveBlocker === NEXT_CARD_ID), 'Current Sprint owns SOURCE-002 before closeout', currentActiveBlocker || 'missing')
  addCheck(checks, status.ok, 'Calendar source contract status is healthy', status.failed.map(item => item.check).join('; ') || `${status.checks.length}/${status.checks.length}`)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe Calendar source false-greens', dogfood.invariant)
  addCheck(checks, packageScript === `node --env-file-if-exists=.env ${SOURCE_002_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
  for (const relativePath of SOURCE_002_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/'))) {
    addCheck(checks, await repoFileExists(relativePath), `${relativePath} exists`, relativePath)
  }
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry exposes SOURCE-002', closeout?.key || 'missing')
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.apply, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending apply')

  if (args.apply || args.closeCard) {
    const latestSprint = await getActiveFoundationCurrentSprint()
    const latestCards = await getBacklogItemsByIds(cardIds())
    await upsertBacklogAndSprint({
      closeCard: args.closeCard,
      planReview,
      previousSprint: latestSprint,
      existingCards: latestCards,
    })
  }

  const failed = checks.filter(check => !check.ok)
  const report = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: CARD_ID,
    sourceId: SOURCE_ID,
    closeoutKey: CLOSEOUT_KEY,
    generatedAt: new Date().toISOString(),
    applied: args.apply || args.closeCard,
    closed: args.closeCard,
    planSummary,
    registrySync: {
      upsertedCount: liveState.registrySync?.upsertedCount || 0,
      staleHashCount: liveState.registrySync?.snapshot?.evaluation?.summary?.staleHashCount || 0,
    },
    summary: {
      checks: checks.length,
      failed: failed.length,
      calendarEventCount: liveState.artifactSummary.calendarEventCount,
      targetCount: liveState.targetRows.length,
      nextCardId: NEXT_CARD_ID,
    },
    statusProof: status,
    dogfood,
    checks,
    failed,
  }

  await closeFoundationDb()

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`SOURCE-002 status: ${report.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
  }
  process.exitCode = report.ok ? 0 : 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
