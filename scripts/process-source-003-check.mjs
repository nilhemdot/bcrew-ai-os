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
  SOURCE_003_APPROVAL_PATH,
  SOURCE_003_CARD_ID as CARD_ID,
  SOURCE_003_CHANGED_FILES,
  SOURCE_003_CLOSEOUT_KEY as CLOSEOUT_KEY,
  SOURCE_003_CLOSEOUT_PATH,
  SOURCE_003_NOT_NEXT,
  SOURCE_003_PLAN_PATH,
  SOURCE_003_PROOF_COMMANDS,
  SOURCE_003_SCRIPT_PATH,
  SOURCE_003_SOURCE_ID as SOURCE_ID,
  buildSource003ContractStatus,
  buildSource003DogfoodProof,
} from '../lib/source-003-drive-source-contract.js'
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

async function readRequiredSources() {
  return {
    planSource: await readRepoFile(SOURCE_003_PLAN_PATH),
    sourceRegistrySource: await readRepoFile('docs/source-registry.md'),
    driveNoteSource: await readRepoFile('docs/source-notes/google-drive-corpus.md'),
    sourceContractsSource: await readRepoFile('lib/source-contracts.js'),
    lifecycleCompletionSource: await readRepoFile('lib/source-lifecycle-completion.js'),
    inventoryDriveCorpusSource: await readRepoFile('scripts/inventory-drive-corpus.mjs'),
    extractDriveContentSource: await readRepoFile('scripts/extract-drive-content.mjs'),
    processSource: await readRepoFile(SOURCE_003_SCRIPT_PATH),
    packageJson: await readRepoJson('package.json'),
  }
}

async function queryLiveDriveState({ syncRegistry = false } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const targetResult = await client.query(`
      SELECT target_key, source_id, title, lane, target_type, status, priority,
             runtime_mode, budget, last_run_at, next_run_at, last_status, last_error,
             inspected_count, archived_count, extracted_count
      FROM source_crawl_targets
      WHERE source_id = 'SRC-GDRIVE-001'
      ORDER BY target_key
    `)
    const allTargetsResult = await client.query(`
      SELECT target_key, source_id, title, lane, target_type, status, priority,
             runtime_mode, budget, last_run_at, next_run_at, last_status, last_error,
             inspected_count, archived_count, extracted_count
      FROM source_crawl_targets
      ORDER BY target_key
    `)
    const artifactResult = await client.query(`
      SELECT artifact_type, COUNT(*)::int AS artifact_count, MAX(ingested_at) AS latest_artifact_at
      FROM shared_communication_artifacts
      WHERE source_id = 'SRC-GDRIVE-001'
      GROUP BY artifact_type
      ORDER BY artifact_type
    `)
    const itemResult = await client.query(`
      SELECT item_key, target_key, source_id, status, retry_reason, metadata
      FROM source_crawl_items
      WHERE target_key IN ('drive-corpus-backfill', 'drive-content-extract-backfill')
      ORDER BY updated_at DESC
      LIMIT 600
    `)
    const backlogResult = await client.query('SELECT id FROM backlog_items')
    const syncResult = syncRegistry
      ? await syncSourceContractRegistryRowsWithClient(client, { actor: 'codex-source-003-process-check' })
      : null
    const artifactCounts = Object.fromEntries(artifactResult.rows.map(row => [row.artifact_type, Number(row.artifact_count || 0)]))
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
      artifactSummary: {
        totalDriveArtifacts: artifactResult.rows.reduce((sum, row) => sum + Number(row.artifact_count || 0), 0),
        artifactCounts,
        latestArtifactAt: artifactResult.rows.reduce((latest, row) => {
          if (!row.latest_artifact_at) return latest
          if (!latest || new Date(row.latest_artifact_at) > new Date(latest)) return row.latest_artifact_at
          return latest
        }, null),
      },
      corpusItems: itemResult.rows.filter(row => row.target_key === 'drive-corpus-backfill'),
      contentItems: itemResult.rows.filter(row => row.target_key === 'drive-content-extract-backfill'),
    }
  } finally {
    client.release()
    await pool.end()
  }
}

function buildSource003CardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Revalidate Google Drive as a rebuild source contract',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 5,
    source: 'Existing SOURCE-003 backlog card, delegated Google Workspace Drive source contract, governed Drive corpus and content lanes.',
    summary: 'Lock SRC-GDRIVE-001 as a signed-off read-side current-reality source for bounded Drive inventory, Drive document/PDF/spreadsheet/text artifacts, and strategy-evidence intake without approving Drive permission mutation, request-access sends, broad sweeps, credential/OAuth changes, media/vision extraction, or canonical strategy rewrite from Drive.',
    whyItMatters: 'Drive is the largest shared-memory source. It needs a precise signed-off boundary so useful evidence can flow into Foundation without turning random readable files into canonical truth or widening Drive permissions.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; close the current sprint and continue the next safe Foundation sprint.`
      : 'Prove Drive source contract sign-off, governed inventory/content targets, Drive artifacts, source registry sync, Strategy Folder evidence boundary, and no permission/file mutation before closing.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; SRC-GDRIVE-001 is signed off for delegated read-side current reality only.`
      : `Executing \`${CLOSEOUT_KEY}\`; closing the Drive read-side source contract without external writes or Drive permission mutation.`,
    owner: 'Foundation Source',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `source-003-${stableRunId(SOURCE_003_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

function buildSource003ExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-contracts.js',
      'lib/source-lifecycle-completion.js',
      'lib/source-contract-registry-table.js',
      'lib/drive-worker-proof.js',
      'lib/drive-content-next-bite.js',
      'scripts/inventory-drive-corpus.mjs',
      'scripts/extract-drive-content.mjs',
      'scripts/run-extraction-target.mjs',
      'source_contract_registry',
      'source_crawl_targets',
      'source_crawl_items',
      'shared_communication_artifacts',
    ],
    existingDocs: [
      'docs/source-registry.md',
      'docs/source-notes/google-drive-corpus.md',
      'docs/process/drive-content-001-plan.md',
      'docs/process/drive-worker-001-plan.md',
      'docs/process/source-012-source-connector-live-layers-plan.md',
    ],
    existingScripts: [
      'scripts/inventory-drive-corpus.mjs',
      'scripts/extract-drive-content.mjs',
      'scripts/process-drive-content-check.mjs',
      'scripts/process-drive-worker-check.mjs',
      'scripts/process-system-health-nightly-audit-check.mjs',
      'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
    ],
    existingPolicy: 'Use the existing delegated Google Workspace Drive read lanes only. Park unsafe actions; do not mutate Drive permissions, sharing, OAuth scopes, provider config, file locations, or broad private Drive extraction from SOURCE-003.',
    reused: 'Reused the existing Drive source contract, Drive corpus note, source lifecycle, Drive worker proof, content extraction bite, source registry, Current Sprint, Plan Critic, and ship-gate surfaces.',
    notRebuilt: 'No new Drive connector, no permission workflow, no OAuth workflow, no broad Drive crawler, no media/vision extractor, no provider/browser-auth worker, and no canonical strategy rewrite from Drive.',
    exactGap: 'SRC-GDRIVE-001 had healthy governed inventory/content lanes and local Drive artifacts, but still lacked a signed-off current-reality source boundary in source contracts, registry, lifecycle, and sprint truth.',
    overBroadRisk: 'A Drive source-contract card can drift into permission mutation, request-access sends, broad private extraction, or treating random readable Drive files as canonical strategy truth.',
    readyBy: 'Steve unattended Foundation sprint approval plus SOURCE-002 closeout handoff.',
    readyAt: '2026-05-20T03:55:00-04:00',
  }
}

async function upsertBacklogAndSprint({ closeCard = false, planReview, previousSprint } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const cardRow = buildSource003CardRow({ closeCard })
  const planRun = buildPlanCriticRun(planReview)
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
      [cardRow.id, cardRow.title, cardRow.team, cardRow.lane, cardRow.priority, cardRow.rank, cardRow.source, cardRow.summary, cardRow.whyItMatters, cardRow.nextAction, cardRow.statusNote, cardRow.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-source-003')
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
        SOURCE_003_PLAN_PATH,
        planReview.status,
        planReview.score,
        SOURCE_003_CHANGED_FILES,
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
  const merged = sprintItems
    .filter(item => item.cardId !== CARD_ID)
    .map(item => ({ ...item }))
  merged.push({
    ...(existingById.get(CARD_ID) || {}),
    cardId: CARD_ID,
    order: sourceOrder,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: SOURCE_003_PLAN_PATH,
    definitionOfDone: 'SRC-GDRIVE-001 is signed off for delegated read-side current reality with governed Drive corpus inventory, bounded Drive content artifacts, source-registry sync, Strategy Folder evidence boundary, and no permission/file mutation.',
    proofCommands: SOURCE_003_PROOF_COMMANDS,
    nextAction: closeCard ? 'Current trusted-loop sprint is complete; select the next safe Foundation sprint.' : 'Close SOURCE-003 before broader source expansion.',
    notNextBoundaries: Array.from(new Set([...(existingById.get(CARD_ID)?.notNextBoundaries || []), ...SOURCE_003_NOT_NEXT])),
    existingWorkCheck: {
      ...(existingById.get(CARD_ID)?.existingWorkCheck || {}),
      ...buildSource003ExistingWorkCheck(),
    },
    metadata: {
      ...(existingById.get(CARD_ID)?.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: SOURCE_003_APPROVAL_PATH,
    },
  })
  merged.sort((a, b) => Number(a.order || a.sprintOrder || 0) - Number(b.order || b.sprintOrder || 0))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20',
        status: closeCard ? 'closed' : 'active',
        goal: sprintRecord?.goal || 'Prove one trusted assistant loop and then continue safe Foundation surfaces without widening too early.',
        activeBlockerCardId: closeCard ? null : CARD_ID,
        metadata: {
          ...(sprintRecord?.metadata || {}),
          currentStatus: closeCard ? 'complete' : 'source_003_active',
          lastClosedCardId: closeCard ? CARD_ID : sprintRecord?.metadata?.lastClosedCardId,
          lastCloseoutKey: closeCard ? CLOSEOUT_KEY : sprintRecord?.metadata?.lastCloseoutKey,
        },
      },
      items: merged,
    },
    'codex-source-003',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintRecord?.sprintId || sprintRecord?.id || 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20',
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} Drive source contract and ${closeCard ? 'completes trusted-loop sprint' : 'owns the active blocker'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
      commandName: 'process-source-003-check',
      summary: 'sync SOURCE-003 source registry truth and close Current Sprint card',
    })
  }

  let dbInitialized = false
  try {
    const checks = []
    const sources = await readRequiredSources()
    const approvalValidation = await validatePlanApprovalFile({ repoRoot, approvalRef: SOURCE_003_APPROVAL_PATH, cardId: CARD_ID })
    const approval = approvalValidation.approval || {}
    const planReview = evaluatePlanCriticPlan({
      planText: sources.planSource,
      card: buildSource003CardRow({ closeCard: args.closeCard }),
      changedFiles: SOURCE_003_CHANGED_FILES,
      declaredRisk: 'source contract semantics, Drive read-side privacy and permission boundaries, DB registry sync, Drive worker ledger proof, Current Sprint progression, package script, closeout registry, and full Foundation ship gate',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)

    await initFoundationDb()
    dbInitialized = true
    const activeSprint = await getActiveFoundationCurrentSprint()
    const cards = await getBacklogItemsByIds([CARD_ID])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID])

    const liveState = await queryLiveDriveState({ syncRegistry: args.apply || args.closeCard })
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
    const status = buildSource003ContractStatus({
      artifactSummary: liveState.artifactSummary,
      registryRows: liveState.registryRows,
      sourceContracts: payload.sources,
      sourceLifecycleRows: lifecycleStatus.sources,
      targetRows: liveState.targetRows,
      corpusItems: liveState.corpusItems,
      contentItems: liveState.contentItems,
      sources,
    })
    const dogfood = buildSource003DogfoodProof()
    const closeouts = getFoundationBuildCloseouts()
    const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY)
    const packageScript = sources.packageJson.scripts?.['process:source-003-check']
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'SOURCE-003 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || SOURCE_003_APPROVAL_PATH)
    addCheck(checks, approval.cardId === CARD_ID && Number(approval.score) >= 9.8, 'SOURCE-003 approval score is 9.8+', `${approval.cardId || 'missing'} / ${approval.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes SOURCE-003 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === CARD_ID), 'SOURCE-003 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === CARD_ID || (args.closeCard && !currentActiveBlocker), 'Current Sprint owns SOURCE-003 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, status.ok, 'Drive source contract status is healthy', status.failed.map(item => item.check).join('; ') || `${status.checks.length}/${status.checks.length}`)
    addCheck(checks, dogfood.ok, 'dogfood rejects unsafe Drive source false-greens', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${SOURCE_003_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    for (const relativePath of SOURCE_003_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/'))) {
      addCheck(checks, await repoFileExists(relativePath), `${relativePath} exists`, relativePath)
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry exposes SOURCE-003', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.apply, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending apply')

    if (args.apply || args.closeCard) {
      const latestSprint = await getActiveFoundationCurrentSprint()
      await upsertBacklogAndSprint({
        closeCard: args.closeCard,
        planReview,
        previousSprint: latestSprint,
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
        totalDriveArtifacts: liveState.artifactSummary.totalDriveArtifacts,
        targetCount: liveState.targetRows.length,
        corpusItemSampleCount: liveState.corpusItems.length,
        contentItemSampleCount: liveState.contentItems.length,
      },
      statusProof: status,
      dogfood,
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`SOURCE-003 status: ${report.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    process.exitCode = report.ok ? 0 : 1
  } finally {
    if (dbInitialized) await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
