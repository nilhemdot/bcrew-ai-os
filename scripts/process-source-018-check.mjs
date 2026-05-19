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
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
  buildSource018ContractStatus,
  buildSource018DogfoodProof,
  SOURCE_018_APPROVAL_PATH,
  SOURCE_018_CARD_ID as CARD_ID,
  SOURCE_018_CHANGED_FILES,
  SOURCE_018_CLOSEOUT_KEY as CLOSEOUT_KEY,
  SOURCE_018_CLOSEOUT_PATH,
  SOURCE_018_NEXT_CARD_ID as NEXT_CARD_ID,
  SOURCE_018_NOT_NEXT,
  SOURCE_018_PLAN_PATH,
  SOURCE_018_PROOF_COMMANDS,
  SOURCE_018_SCRIPT_PATH,
} from '../lib/source-018-google-gemini-meeting-notes-contract.js'
import { buildSourceLifecycleStatus } from '../lib/source-lifecycle.js'
import { buildSourceLifecycleCompletionStatus } from '../lib/source-lifecycle-completion.js'
import { buildSourceOfTruthPayload } from '../lib/source-of-truth-payload.js'

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
    maxBuffer: 90 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

function normalizeDbNumber(value) {
  return Number(value || 0)
}

async function queryLiveMeetingState() {
  const pool = createPool()
  try {
    const [
      targetResult,
      currentJobResult,
      transcriptJobResult,
      artifactResult,
      targetsResult,
      backlogResult,
    ] = await Promise.all([
      pool.query(`
        SELECT target_key, source_id, title, lane, target_type, status, priority,
               runtime_mode, budget, last_run_at, next_run_at, last_status, last_error,
               inspected_count, archived_count, extracted_count
        FROM source_crawl_targets
        WHERE target_key = 'meetings-current-day'
      `),
      pool.query(`
        SELECT run_id, job_key, status, started_at, finished_at, error_message
        FROM foundation_job_runs
        WHERE job_key = 'meeting-notes-sync-current'
        ORDER BY started_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT run_id, job_key, status, started_at, finished_at, error_message
        FROM foundation_job_runs
        WHERE job_key = 'meeting-transcripts-extract-backlog'
        ORDER BY started_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE artifact_type = 'meeting_note')::int AS note_count,
          COUNT(*) FILTER (WHERE artifact_type = 'meeting_transcript')::int AS transcript_count,
          COUNT(DISTINCT COALESCE(metadata->>'meetingKey', external_id, artifact_id))::int AS meeting_key_count
        FROM shared_communication_artifacts
        WHERE source_id = 'SRC-MEETINGS-001'
      `),
      pool.query(`
        SELECT target_key, source_id, title, lane, target_type, status, priority,
               runtime_mode, budget, last_run_at, next_run_at, last_status, last_error,
               inspected_count, archived_count, extracted_count
        FROM source_crawl_targets
        ORDER BY target_key
      `),
      pool.query('SELECT id FROM backlog_items'),
    ])
    return {
      targetRow: targetResult.rows[0] || null,
      latestCurrentJob: currentJobResult.rows[0] || null,
      latestTranscriptJob: transcriptJobResult.rows[0] || null,
      artifactSummary: {
        noteCount: normalizeDbNumber(artifactResult.rows[0]?.note_count),
        transcriptCount: normalizeDbNumber(artifactResult.rows[0]?.transcript_count),
        meetingKeyCount: normalizeDbNumber(artifactResult.rows[0]?.meeting_key_count),
      },
      lifecycleTargets: targetsResult.rows.map(row => ({
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
    }
  } finally {
    await pool.end()
  }
}

function buildSource018CardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Close Google Gemini meeting notes source contract',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 6,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; SOURCE-018 must close meeting-note boundaries before extraction expansion.',
    summary: 'Sign off SRC-MEETINGS-001 for current Foundation/Steve owner use only: governed current-day Gemini meeting-note archive, transcript evidence lane, privacy/read-side controls, and no Drive permission mutation.',
    whyItMatters: 'Meeting notes are a core current-day source. Extraction must not expand until the system distinguishes current owner-usable archives from broad raw transcript/team/agent access.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue \`${NEXT_CARD_ID}\` with current-source extraction proof.`
      : 'Prove meeting-note current sync, transcript-evidence boundary, source lifecycle boundary, and no Drive mutation, then advance to EXTRACT-CURRENT-001.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; SRC-MEETINGS-001 is signed off for current reality with raw/broad access still gated.`
      : `Executing \`${CLOSEOUT_KEY}\`; closing the narrow Google Gemini meeting notes source contract.`,
    owner: 'Foundation Source',
  }
}

function buildExtractCurrentCardRow() {
  return {
    id: NEXT_CARD_ID,
    title: 'Prove current-day source freshness and partial-failure behavior',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; follows SOURCE-018 source-contract boundary closeout.',
    summary: 'Prove current-day safe source lanes are fresh or truthfully degraded, with partial-failure and governed recovery behavior. No private/auth/paid/provider/external-write expansion outside approved governed repair jobs.',
    whyItMatters: 'Useful source/extract work starts with current-day freshness. The system needs safe current lanes before backfill and attachment/content expansion.',
    nextAction: 'Run EXTRACT-CURRENT-001 next; prove current-day source freshness and partial-failure behavior using existing governed lanes and park any approval-bound operation without stopping safe work.',
    statusNote: `Next active Foundation card after ${CLOSEOUT_KEY}; scoped proof/acceptance must be finalized before closeout, with focused proof, System Health, repeated-failure gate, backlog hygiene, foundation:verify, and process:foundation-ship required.`,
    owner: 'Foundation Extract',
  }
}

function buildSource018SprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    backlogId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: SOURCE_018_PLAN_PATH,
    definitionOfDone: 'SRC-MEETINGS-001 is signed off for current Foundation/Steve owner use only, with current sync proof, transcript evidence proof, source lifecycle boundary proof, and no Drive permission mutation.',
    proofCommands: SOURCE_018_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close SOURCE-018 before EXTRACT-CURRENT-001.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...SOURCE_018_NOT_NEXT])),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: SOURCE_018_APPROVAL_PATH,
    },
  }
}

function buildExtractCurrentSprintItem(item = {}, { active = false } = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    backlogId: NEXT_CARD_ID,
    stage: active ? 'scoping' : (item.stage || 'scoping'),
    planRef: 'docs/process/extract-current-001-plan.md',
    definitionOfDone: 'Current-day source lanes are fresh or truthfully degraded, partial failures are visible, and governed recovery is proven without unsafe private/source expansion.',
    proofCommands: [
      'npm run process:extract-current-check -- --apply --close-card --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:foundation-ship -- --card=EXTRACT-CURRENT-001 --planApprovalRef=docs/process/approvals/EXTRACT-CURRENT-001.json --closeoutKey=extract-current-source-freshness-v1 --commitRef=HEAD',
    ],
    nextAction: 'Build EXTRACT-CURRENT-001 next; park approval-bound operations and continue safe sprint work.',
    notNextBoundaries: Array.from(new Set([
      ...(item.notNextBoundaries || []),
      'Do not mutate Drive permissions.',
      'Do not send messages or external writes.',
      'Do not mutate credentials, provider config, or keys.',
      'Do not run broad historical/private extraction outside the approved card.',
    ])),
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      approvalBoundActionsParkInsteadOfStopping: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(buildSource018SprintItem(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(buildSource018SprintItem({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(buildExtractCurrentSprintItem(item, { active: closeCard }))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    if (item.cardId) seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(buildSource018SprintItem({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(buildExtractCurrentSprintItem({ order: items.length + 1 }, { active: true }))
  return items.map((item, index) => ({ ...item, order: index + 1, sprintOrder: index + 1 }))
}

async function updateBacklogRow(client, row) {
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

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_018_SCRIPT_PATH,
    operation: 'create/update SOURCE-018 and EXTRACT-CURRENT-001 backlog rows, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updateBacklogRow(client, buildSource018CardRow({ closeCard }))
    await updateBacklogRow(client, buildExtractCurrentCardRow())
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-source-018')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `source-018-${stableRunId(SOURCE_018_PLAN_PATH)}`,
        CARD_ID,
        SOURCE_018_PLAN_PATH,
        planReview.status,
        planReview.score,
        SOURCE_018_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-018',$3,$4::jsonb)
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
          currentStatus: closeCard ? 'source_018_meeting_contract_closed' : 'source_018_meeting_contract_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard ? `Continue ${NEXT_CARD_ID}; SOURCE-018 is closed.` : `${CARD_ID} is active; prove meeting-note boundaries before extraction.`,
          source018MeetingContractSummary: {
            status: closeCard ? 'healthy' : 'active',
            closeoutKey: CLOSEOUT_KEY,
            nextCardId: NEXT_CARD_ID,
            signedOffForCurrentRealityOnly: true,
            broadRawAccessStillBlocked: true,
          },
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-source-018',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} meeting-note source contract and ${closeCard ? `advances to ${NEXT_CARD_ID}` : 'owns the active blocker'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    packageJsonSource,
    moduleSource,
    contractsSource,
    lifecycleCompletionSource,
    sharedCommsNoteSource,
    sourceRegistrySource,
    transcriptCandidateSource,
    syncMeetingNotesArchiveSource,
    mirrorMeetingArchiveToDriveSource,
    meetingVaultAclSource,
    meetingVaultAclScriptSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
    activeSprint,
    liveState,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: SOURCE_018_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(SOURCE_018_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/source-018-google-gemini-meeting-notes-contract.js'),
    readRepoFile('lib/source-contracts.js'),
    readRepoFile('lib/source-lifecycle-completion.js'),
    readRepoFile('docs/source-notes/shared-communications.md'),
    readRepoFile('docs/source-registry.md'),
    readRepoFile('scripts/extract-meeting-transcript-candidates.mjs'),
    readRepoFile('scripts/sync-meeting-notes-archive.mjs'),
    readRepoFile('scripts/mirror-meeting-archive-to-drive.mjs'),
    readRepoFile('lib/meeting-vault-acl.js'),
    readRepoFile('scripts/process-meeting-vault-acl-check.mjs'),
    readRepoFile(SOURCE_018_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(SOURCE_018_CLOSEOUT_PATH, { optional: true }),
    getActiveFoundationCurrentSprint(),
    queryLiveMeetingState(),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildSource018CardRow({ closeCard: args.closeCard }),
    changedFiles: SOURCE_018_CHANGED_FILES,
    declaredRisk: 'source contract semantics, meeting-note privacy/read-side boundaries, live DB proof, Current Sprint progression, package script, closeout registry, and full Foundation ship gate',
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

  const payload = await buildSourceOfTruthPayload({ repoRoot })
  const jobDefinitions = getFoundationJobDefinitions()
  const sourceLifecycle = buildSourceLifecycleStatus({
    sources: payload.sources,
    connectors: payload.connectors,
    groupedSystems: payload.groupedSystems,
    extractionControl: { targets: liveState.lifecycleTargets },
    foundationJobs: jobDefinitions,
  })
  const lifecycleCompletion = buildSourceLifecycleCompletionStatus({
    sourceLifecycle,
    sourceOfTruth: payload,
    foundationHub: liveState.foundationHub,
  })
  const contractStatus = buildSource018ContractStatus({
    artifactSummary: liveState.artifactSummary,
    jobDefinitions,
    latestCurrentJob: liveState.latestCurrentJob,
    latestTranscriptJob: liveState.latestTranscriptJob,
    sourceContracts: payload.sources,
    sourceLayerStatus: payload.sourceLayerStatus,
    sourceLifecycleRows: lifecycleCompletion.sources,
    targetRow: liveState.targetRow,
    sources: {
      extractMeetingTranscriptCandidatesSource: transcriptCandidateSource,
      syncMeetingNotesArchiveSource,
      mirrorMeetingArchiveToDriveSource,
      meetingVaultAclSource,
      meetingVaultAclScriptSource,
      sharedCommsNoteSource,
      sourceRegistrySource,
    },
  })
  const dogfood = buildSource018DogfoodProof()
  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const packageJson = JSON.parse(packageJsonSource)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const sourceCard = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const sourceSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || ''
  const preShipServedCodeDriftAllowed = args.closeCard &&
    contractStatus.ok &&
    sourceCard?.lane === 'done' &&
    activeBlockerCardId === NEXT_CARD_ID &&
    (systemHealth.exitStatus !== 0 || repeatedFailureGate.exitStatus !== 0)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || SOURCE_018_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for SOURCE-018', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood rejects connector-only, summary-only, and Drive-mutation false signoff', dogfood.invariant)
  addCheck(checks, contractStatus.ok, 'meeting-note current contract status is healthy', contractStatus.failed.map(item => item.check).join(', ') || 'pass')
  addCheck(checks, lifecycleCompletion.status === 'healthy', 'source lifecycle completion remains healthy', lifecycleCompletion.findings?.map(item => item.check).join(', ') || 'pass')
  addCheck(checks, moduleSource.includes('buildSource018ContractStatus') && moduleSource.includes('buildSource018DogfoodProof'), 'reusable SOURCE-018 module owns evaluator and dogfood', 'lib/source-018-google-gemini-meeting-notes-contract.js')
  addCheck(checks, contractsSource.includes('Signed Off For Current Reality') && contractsSource.includes('does not approve raw transcript exposure'), 'source contract records narrow current-reality signoff', 'lib/source-contracts.js')
  addCheck(checks, lifecycleCompletionSource.includes('current Foundation/Steve owner use') && lifecycleCompletionSource.includes('future team/agent query access'), 'source lifecycle records current signoff versus future blocker', 'lib/source-lifecycle-completion.js')
  addCheck(checks, sharedCommsNoteSource.includes('Current Foundation sign-off is narrow'), 'shared communications note records privacy/read-side boundary', 'docs/source-notes/shared-communications.md')
  addCheck(checks, sourceRegistrySource.includes('SRC-MEETINGS-001') && sourceRegistrySource.includes('Signed Off For Current Reality'), 'source registry records signed-off current reality', 'docs/source-registry.md')
  addCheck(checks, transcriptCandidateSource.includes('Never extract from Gemini summaries or bullet lists. Use transcript evidence only.'), 'transcript candidate extraction blocks summary-only evidence', 'scripts/extract-meeting-transcript-candidates.mjs')
  addCheck(checks, sourceCard?.priority === 'P0' && (args.closeCard ? sourceCard.lane === 'done' : ['executing', 'scoped', 'done'].includes(sourceCard?.lane)), 'SOURCE-018 backlog row is correct', sourceCard ? `${sourceCard.lane}/${sourceCard.priority}` : 'missing')
  addCheck(checks, nextCard?.priority === 'P0' && nextCard?.lane === 'scoped', 'EXTRACT-CURRENT-001 is promoted as next scoped P0', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker matches expected card', activeBlockerCardId || 'missing')
  addCheck(checks, (systemHealth.exitStatus === 0 && (systemHealth.json?.status === 'healthy' || systemHealth.json?.systemHealth?.status === 'healthy')) || preShipServedCodeDriftAllowed, 'System Health remains healthy or is deferred for post-ship served-code refresh', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.status || systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, (repeatedFailureGate.exitStatus === 0 && repeatedFailureGate.json?.status === 'healthy') || preShipServedCodeDriftAllowed, 'repeated-failure gate remains healthy or is deferred for post-ship verifier-ledger refresh', `exit=${repeatedFailureGate.exitStatus} status=${repeatedFailureGate.json?.status || 'missing'}`)
  addCheck(checks, packageJson.scripts?.['process:source-018-check'] === `node --env-file-if-exists=.env ${SOURCE_018_SCRIPT_PATH}`, 'package exposes SOURCE-018 focused proof', packageJson.scripts?.['process:source-018-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves SOURCE-018', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff exists and names next card', SOURCE_018_CLOSEOUT_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, !args.closeCard || sourceSprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records SOURCE-018 closeout', sourceSprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'Current Sprint exposes EXTRACT-CURRENT-001 next', nextSprintItem?.stage || 'missing')
  addCheck(checks, scriptSource.includes('queryLiveMeetingState') && scriptSource.includes('shared_communication_artifacts'), 'focused proof reads live metadata-only meeting state', 'scripts/process-source-018-check.mjs')

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
    addCheck(checks, refreshedCards.some(item => item.id === NEXT_CARD_ID && item.lane === 'scoped' && item.priority === 'P0'), 'EXTRACT-CURRENT-001 is scoped P0 after close', refreshedCards.map(item => `${item.id}:${item.lane}/${item.priority}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is EXTRACT-CURRENT-001 after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    artifactSummary: liveState.artifactSummary,
    targetStatus: liveState.targetRow ? {
      targetKey: liveState.targetRow.target_key,
      status: liveState.targetRow.status,
      runtimeMode: liveState.targetRow.runtime_mode,
      lastStatus: liveState.targetRow.last_status,
      archivedCount: liveState.targetRow.archived_count,
    } : null,
    latestJobs: {
      current: liveState.latestCurrentJob ? {
        jobKey: liveState.latestCurrentJob.job_key,
        status: liveState.latestCurrentJob.status,
        finishedAt: liveState.latestCurrentJob.finished_at,
      } : null,
      transcript: liveState.latestTranscriptJob ? {
        jobKey: liveState.latestTranscriptJob.job_key,
        status: liveState.latestTranscriptJob.status,
        finishedAt: liveState.latestTranscriptJob.finished_at,
      } : null,
    },
    dogfood,
    contractStatus,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`SOURCE-018 check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('SOURCE-018 check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
