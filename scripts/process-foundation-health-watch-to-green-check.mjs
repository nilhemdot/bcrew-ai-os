#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationOperatingReliabilitySnapshot } from '../lib/connector-uptime-monitor.js'
import { buildDocArtifactBloatSnapshot } from '../lib/doc-artifact-bloat-guard.js'
import { loadLatestFoundationEndpointBudgetSnapshot } from '../lib/foundation-endpoint-budgets.js'
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
import {
  buildFoundationSystemHealthDogfoodProof,
  buildFoundationSystemHealthSnapshot,
} from '../lib/foundation-system-health.js'
import {
  FOUNDATION_HEALTH_WATCH_TO_GREEN_APPROVAL_PATH,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_CARD_ID as CARD_ID,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_CHANGED_FILES,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_CLOSEOUT_PATH as CLOSEOUT_PATH,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_NEXT_CARD_ID as NEXT_CARD_ID,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_NOT_NEXT,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_PLAN_PATH as PLAN_PATH,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_PROOF_COMMANDS,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_SCRIPT_PATH as SCRIPT_PATH,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_SPRINT_ID as SPRINT_ID,
  buildFoundationHealthWatchToGreenDogfoodProof,
  summarizeFoundationHealthWatchToGreen,
} from '../lib/foundation-health-watch-to-green.js'
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
import { getSourceConnectors, getSourceContracts } from '../lib/source-contracts.js'

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
  return [
    CARD_ID,
    NEXT_CARD_ID,
    'EXTRACT-CURRENT-001',
    'EXTRACT-BACKFILL-001',
    'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001',
    'FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001',
    'FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001',
    'CONNECTOR-UPTIME-MONITOR-001',
  ]
}

function buildCardRow({ closeCard = false, healthSummary } = {}) {
  return {
    id: CARD_ID,
    title: 'Move Foundation system health watch rows to green',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 3,
    source: 'Steve 2026-05-19: get Foundation fully green before source/extraction activation.',
    summary: 'Clear safe health rows and classify every remaining non-green row with owner, reason, threshold, next action, and repair route.',
    whyItMatters: 'A green build surface cannot hide red/yellow work. It must distinguish unresolved failure from approval-bound or explicitly routed watch rows.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; run \`${NEXT_CARD_ID}\` next.`
      : 'Classify remaining health rows and prove no unclassified red/yellow rows remain.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; system health ${healthSummary?.status || 'unknown'} with ${healthSummary?.unclassifiedRiskCount || 0} unclassified red and ${healthSummary?.unclassifiedWatchCount || 0} unclassified yellow rows.`
      : `Executing \`${CLOSEOUT_KEY}\`; no source/extraction activation until health rows are clear or classified.`,
    owner: 'Foundation Process',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `foundation-health-watch-to-green-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview, healthSummary } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, healthSummary })
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
      [row.id, row.title, row.scope, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-health-watch-to-green')
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
        PLAN_PATH,
        planReview.status,
        planReview.score,
        FOUNDATION_HEALTH_WATCH_TO_GREEN_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-foundation-health-watch-to-green',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, nextCardId: NEXT_CARD_ID, healthSummary }),
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
}

function defaultExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-system-health.js',
      'lib/connector-uptime-monitor.js',
      'scripts/process-system-health-nightly-audit-check.mjs',
    ],
    existingDocs: [
      'docs/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md',
      'docs/handoffs/2026-05-19-build-lane-repeated-failure-action-gate-closeout.md',
      'docs/handoffs/2026-05-19-parallel-builder-merge-lane-enforcement-closeout.md',
    ],
    existingScripts: [
      'process:system-health-nightly-audit-check',
      'process:foundation-operating-reliability-check',
      'backlog:hygiene',
      'foundation:verify',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'System Health must not report green when red/yellow rows are unclassified.',
      'Approval-bound meeting/Gmail extraction lanes require Steve approval before live rerun.',
      'Endpoint, hot-doc, and file-size rows continue as explicit sprint cards.',
    ],
    reused: [
      'Live foundation_job_runs and source_crawl health rows.',
      'Existing endpoint budget, doc artifact, file-size, connector, and current sprint snapshots.',
      'DB-backed Backlog, Plan Critic, Current Sprint, and Recent Work closeout registries.',
    ],
    notRebuilt: [
      'No new scheduler.',
      'No new source extractor.',
      'No replacement dashboard.',
      'No external telemetry sink.',
    ],
    exactGap: 'System Health could show raw red/yellow rows without distinguishing unresolved failure from approval-bound or already routed sprint work.',
    overBroadRisk: 'This card can drift into endpoint repair, hot-doc cleanup, file splitting, or source extraction. It only clears safe rows and classifies/routes the rest.',
    readyBy: 'Steve',
    readyAt: '2026-05-19T09:20:00-04:00',
  }
}

function useExistingWorkCheck(item = {}) {
  const existing = item.existingWorkCheck
  return existing && typeof existing === 'object' && Object.keys(existing).length && existing.overBroadRisk !== 'This card can drift into endpoint repair, hot-doc cleanup, file splitting, or source extraction. It only clears safe rows and classifies/routs the rest.'
    ? existing
    : defaultExistingWorkCheck()
}

function withCardMetadata(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'System health is green because no red/yellow row is unclassified; approval-bound and threshold rows remain visible with owner, reason, threshold, next action, and repair card.',
    proofCommands: FOUNDATION_HEALTH_WATCH_TO_GREEN_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Finish health watch-to-green before audit/source activation.',
    notNextBoundaries: FOUNDATION_HEALTH_WATCH_TO_GREEN_NOT_NEXT,
    existingWorkCheck: useExistingWorkCheck(item),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: FOUNDATION_HEALTH_WATCH_TO_GREEN_APPROVAL_PATH,
      healthGreenRequiresNoUnclassifiedRows: true,
    },
  }
}

function withNextCardMetadata(item = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    stage: item.stage && item.stage !== 'done_this_sprint' ? item.stage : 'scoping',
    definitionOfDone: item.definitionOfDone || 'Audit findings route into live backlog truth: existing card, new scoped card, stale-with-proof, approval-required, or watch-only threshold.',
    nextAction: item.nextAction || 'Upgrade audit finding-to-backlog routing before source/extraction activation.',
    notNextBoundaries: item.notNextBoundaries?.length ? item.notNextBoundaries : [
      'Do not leave card-shaped audit findings only in markdown/json reports.',
      'Do not start broad source/extraction activation before audit routing is upgraded.',
    ],
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      requiredBeforeSourceActivation: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(withCardMetadata(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(withCardMetadata({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(withNextCardMetadata(item))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(withCardMetadata({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(withNextCardMetadata({ order: items.length + 1 }))
  return items.map((item, index) => ({ ...item, order: index + 1 }))
}

async function ensureLiveState({ closeCard = false, planReview, healthSummary } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update health watch-to-green backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertLiveCardAndPlanCritic({ closeCard, planReview, healthSummary })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation fully green, lock main integration discipline, upgrade dual/parallel work lanes, upgrade auditor routing, then resume source/extraction activation.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'foundation_health_watch_to_green_closed' : 'foundation_health_watch_to_green_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `Run ${NEXT_CARD_ID} next.`
            : `Finish ${CARD_ID}; system health cannot be green with unclassified red/yellow rows.`,
          systemHealthSummary: healthSummary,
          exitCriteria: [
            'No unclassified system-health red/yellow rows remain.',
            'Approval-bound rows have owner, reason, threshold, and next action.',
            'Endpoint, hot-doc, and file-size rows are routed to next sprint cards.',
            'Audit finding-to-backlog router runs before source/extraction activation.',
          ],
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-foundation-health-watch-to-green',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve required Foundation health green or explicit non-misleading classification before source activation.',
    },
  )
}

function containsUnsafeRuntimeCall(source = '') {
  const executableSource = String(source || '').replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, '')
  const patterns = [
    /\bstartExtractionRun\s*\(/,
    /\bfetchTranscript\s*\(/,
    /\bcreateChatCompletion\s*\(/,
    /\bresponses\.create\s*\(/,
    /\bsendGmail\b/,
    /\bwriteClickUp\b/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\brerouteActionRoute\s*\(/,
    /\bspawn_agent\s*\(/,
  ]
  return patterns.filter(pattern => pattern.test(executableSource)).map(pattern => pattern.source)
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
    planSource,
    approval,
  ] = await Promise.all([
    readRepoFile(PLAN_PATH),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_HEALTH_WATCH_TO_GREEN_APPROVAL_PATH,
      cardId: CARD_ID,
    }),
  ])
  let liveSystemHealth = await buildLiveSystemHealth()
  let healthSummary = summarizeFoundationHealthWatchToGreen(liveSystemHealth)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, healthSummary }),
    changedFiles: FOUNDATION_HEALTH_WATCH_TO_GREEN_CHANGED_FILES,
    declaredRisk: 'system-health green lock, approval-bound extraction rows, endpoint metrics routing, hot-doc bloat routing, and file-size watch classification',
    repoRoot,
  })

  if (args.apply || args.closeCard) {
    await ensureLiveState({ closeCard: args.closeCard, planReview, healthSummary })
    liveSystemHealth = await buildLiveSystemHealth()
    healthSummary = summarizeFoundationHealthWatchToGreen(liveSystemHealth)
  }

  const [
    activeSprint,
    cards,
    planCriticRuns,
    packageJson,
    closeoutDoc,
    healthModuleSource,
    cardModuleSource,
    scriptSource,
    verifierSource,
    coverageSource,
    closeoutRecordsSource,
  ] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds(cardIds()),
    getPlanCriticRunsByCardIds(cardIds()),
    readRepoJson('package.json'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('lib/foundation-system-health.js'),
    readRepoFile('lib/foundation-health-watch-to-green.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-verifier-health-live-summary.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-build-lane-records.js'),
  ])

  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const systemHealthDogfood = buildFoundationSystemHealthDogfoodProof()
  const watchToGreenDogfood = buildFoundationHealthWatchToGreenDogfoodProof()
  const classifiedFindings = liveSystemHealth.findings.filter(finding => finding.classification)
  const unsafeRuntimeHits = [
    ...containsUnsafeRuntimeCall(healthModuleSource),
    ...containsUnsafeRuntimeCall(cardModuleSource),
    ...containsUnsafeRuntimeCall(scriptSource),
  ]

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FOUNDATION_HEALTH_WATCH_TO_GREEN_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for health watch-to-green', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && (args.closeCard ? card.lane === 'done' : ['executing', 'done'].includes(card?.lane)), 'live backlog card exists and is P0', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'audit router card remains live next', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint remains green/main/audit/source activation sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItem && (args.closeCard ? sprintItem.stage === 'done_this_sprint' : ['building_now', 'done_this_sprint'].includes(sprintItem.stage)), 'Current Sprint includes health card in expected stage', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint active blocker advances to audit router after close', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem, 'next card remains visible after health card closes', nextSprintItem?.stage || 'missing')
  addCheck(checks, healthSummary.ok === true && healthSummary.status === 'healthy', 'live system health has no unclassified red/yellow rows', JSON.stringify(healthSummary))
  addCheck(checks, healthSummary.rawRiskCount > 0 || healthSummary.rawWatchCount > 0, 'raw non-green rows stay visible after classification', `raw=${healthSummary.rawRiskCount}/${healthSummary.rawWatchCount}`)
  addCheck(checks, classifiedFindings.every(finding => finding.classification?.owner && finding.classification?.reason && finding.classification?.threshold && finding.classification?.nextAction), 'classified rows include owner, reason, threshold, and next action', classifiedFindings.map(finding => finding.id).join(', '))
  addCheck(checks, liveSystemHealth.findings.some(finding => finding.id === 'scheduled_job_meeting-notes-sync-current' && finding.classification?.owner === 'Steve' && finding.classification?.repairCardId === 'EXTRACT-CURRENT-001'), 'meeting-notes current sync stays Steve approval-bound', 'scheduled_job_meeting-notes-sync-current')
  addCheck(checks, liveSystemHealth.findings.some(finding => finding.id === 'scheduled_job_gmail-sync-current' && finding.classification?.repairCardId === 'EXTRACT-CURRENT-001'), 'Gmail current sync routes to EXTRACT-CURRENT-001 instead of live rerun', 'scheduled_job_gmail-sync-current')
  addCheck(checks, liveSystemHealth.findings.some(finding => finding.id === 'scheduled_job_meeting-transcripts-extract-backlog' && finding.classification?.repairCardId === 'EXTRACT-BACKFILL-001'), 'meeting transcript backlog routes to EXTRACT-BACKFILL-001', 'scheduled_job_meeting-transcripts-extract-backlog')
  addCheck(checks, liveSystemHealth.findings.filter(finding => String(finding.id || '').startsWith('endpoint_budget_')).every(finding => finding.classification?.repairCardId === 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001'), 'endpoint budget rows route to endpoint freshness card', `${healthSummary.endpointRoutedCount} row(s)`)
  addCheck(checks, liveSystemHealth.findings.filter(finding => String(finding.id || '').startsWith('doc_artifact_handoff_')).every(finding => finding.classification?.repairCardId === 'FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001'), 'hot-doc rows route to handoff cleanup card', `${healthSummary.hotDocRoutedCount} row(s)`)
  addCheck(checks, liveSystemHealth.findings.filter(finding => String(finding.id || '').startsWith('file_size_')).every(finding => finding.classification?.repairCardId === 'FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001'), 'file-size rows route to file-size classifier card', `${healthSummary.fileSizeRoutedCount} row(s)`)
  addCheck(checks, liveSystemHealth.summary?.buildLaneFailureRedCount === 0 && liveSystemHealth.summary?.buildLaneFailureYellowCount === 0, 'build-lane repeated failure telemetry is green before health card closes', `${liveSystemHealth.summary?.buildLaneFailureRedCount || 0}/${liveSystemHealth.summary?.buildLaneFailureYellowCount || 0}`)
  addCheck(checks, systemHealthDogfood.ok === true, 'base system-health dogfood still blocks unclassified red rows', systemHealthDogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'pass')
  addCheck(checks, watchToGreenDogfood.ok === true, 'health watch-to-green dogfood proves classification and false-green prevention', watchToGreenDogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'pass')
  addCheck(checks, packageJson.scripts?.['process:foundation-health-watch-to-green-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-health-watch-to-green-check'] || 'missing')
  addCheck(checks, healthModuleSource.includes('classifyFoundationSystemHealthFindings') && healthModuleSource.includes('unclassifiedRiskCount') && healthModuleSource.includes('classification'), 'system-health module owns classification rollup', 'lib/foundation-system-health.js')
  addCheck(checks, verifierSource.includes('buildFoundationHealthWatchToGreenDogfoodProof') && verifierSource.includes(CARD_ID), 'health live summary verifier covers watch-to-green classification', 'lib/foundation-verifier-health-live-summary.js')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes health watch-to-green card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout registry source includes health closeout', 'lib/foundation-build-closeout-build-lane-records.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves health closeout', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(NEXT_CARD_ID) && closeoutDoc.includes('unclassified'), 'closeout states next card and classification standard', CLOSEOUT_PATH)
  addCheck(checks, unsafeRuntimeHits.length === 0, 'health card code has no extraction/model/action/external-write calls', unsafeRuntimeHits.join(', ') || 'clean')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    healthSummary,
    systemHealthSummary: liveSystemHealth.summary,
    dogfood: {
      systemHealth: systemHealthDogfood.ok,
      watchToGreen: watchToGreenDogfood.ok,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation Health Watch To Green check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation Health Watch To Green check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
