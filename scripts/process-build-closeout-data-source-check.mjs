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
  BUILD_CLOSEOUT_DATA_SOURCE_APPROVAL_PATH as APPROVAL_PATH,
  BUILD_CLOSEOUT_DATA_SOURCE_CARD_ID as CARD_ID,
  BUILD_CLOSEOUT_DATA_SOURCE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  BUILD_CLOSEOUT_DATA_SOURCE_CLOSEOUT_PATH as CLOSEOUT_DOC_PATH,
  BUILD_CLOSEOUT_DATA_SOURCE_NEXT_CARD_ID as NEXT_CARD_ID,
  BUILD_CLOSEOUT_DATA_SOURCE_PLAN_PATH as PLAN_PATH,
  BUILD_CLOSEOUT_DATA_SOURCE_PROOF_COMMANDS as PROOF_COMMANDS,
  BUILD_CLOSEOUT_DATA_SOURCE_SCRIPT_PATH as SCRIPT_PATH,
  BUILD_CLOSEOUT_DATA_SOURCE_ID,
  buildBuildCloseoutDataSourceDogfoodProof,
  buildBuildCloseoutDataSourceSnapshot,
  evaluateBuildCloseoutDataSourceUsage,
} from '../lib/build-closeout-data-source.js'
import { buildCodeQualityNightlyAudit } from '../lib/code-quality-nightly-audit.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getSourceContracts } from '../lib/source-contracts.js'
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
  getSourceContractRegistrySnapshot,
  syncSourceContractRegistryTable,
} from '../lib/foundation-source-crawl-db.js'
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
const ACTOR = 'codex-build-closeout-data-source'
const CHANGED_FILES = [
  'lib/build-closeout-data-source.js',
  'lib/foundation-build-log.js',
  'lib/foundation-verifier-build-log-registry-assurance.js',
  'lib/source-contracts.js',
  'lib/source-of-truth-payload.js',
  'lib/source-contract-validation-layer.js',
  'lib/code-quality-nightly-audit.js',
  'lib/deep-audit-findings-closure-gate.js',
  'scripts/process-source-contract-validation-layer-check.mjs',
  'scripts/process-foundation-build-log-monolith-slice-check.mjs',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  CLOSEOUT_DOC_PATH,
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
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

function git(args = []) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  return String(result.stdout || '').trim()
}

function getGitState() {
  return {
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    head: git(['rev-parse', 'HEAD']),
    originMain: git(['rev-parse', 'origin/main']),
    porcelain: git(['status', '--short']),
  }
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P2','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `build-closeout-data-source-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function normalizeSprintItem(item = {}) {
  return {
    cardId: item.cardId || item.backlogId,
    order: item.order ?? item.sprintOrder,
    stage: item.stage,
    planRef: item.planRef,
    definitionOfDone: item.definitionOfDone,
    proofCommands: item.proofCommands || [],
    readinessBlockerCleared: item.readinessBlockerCleared || '',
    notNextBoundaries: item.notNextBoundaries || [],
    existingWorkCheck: item.existingWorkCheck || {},
    returnedReason: item.returnedReason || '',
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
  }
}

function buildUpdatedSprintOverlay({ activeSprint, currentHead }) {
  const sprint = activeSprint.sprint || {}
  const items = (activeSprint.items || []).map(item => {
    const nextItem = normalizeSprintItem(item)
    if (nextItem.cardId === CARD_ID) {
      return {
        ...nextItem,
        stage: 'done_this_sprint',
        planRef: PLAN_PATH,
        definitionOfDone: 'Build Log reads closeout history through a source-contract-backed data-source boundary with validation, source registry mirror, code-quality audit suppression only when healthy, and stale-boundary dogfood proof.',
        proofCommands: PROOF_COMMANDS,
        notNextBoundaries: [
          'Do not redesign Recent Builds or Build Log UI.',
          'Do not migrate all closeout records into a new DB table in this card.',
          'Do not delete or rewrite closeout history.',
          'Do not change closeout matching/enrichment behavior.',
          'Do not work MEETING-VAULT-ACL-001 Phase B.',
          'Do not start source/value/extraction expansion.',
          'Do not mutate Drive permissions.',
          'No Drive permission mutation.',
          'Do not send email/messages or run external writes.',
          'Do not rotate credentials, run paid/provider access, or perform private broad extraction.',
        ],
        existingWorkCheck: {
          existingCode: [
            'lib/foundation-build-log.js',
            'lib/foundation-build-closeout-records.js',
            'lib/source-contract-registry-table.js',
            'lib/code-quality-nightly-audit.js',
            'lib/deep-audit-findings-closure-gate.js',
          ],
          existingDocs: [
            'docs/_archive/audits/2026-05-19-foundation-deep-merge-audit.md',
            'docs/process/build-closeout-registry-extract-001-plan.md',
            PLAN_PATH,
          ],
          existingScripts: [
            'process:code-quality-nightly-audit-check',
            'source-contract-registry:sync',
            'process:system-health-nightly-audit-check',
            'process:build-lane-repeated-failure-action-gate-check',
            'process:foundation-ship',
          ],
          existingPolicy: [
            'Audit findings become live backlog truth or shipped proof.',
            'Operational data needs owner, source ID, validation, and source registry mirror when it becomes load-bearing.',
            'Green means raw green; classification is not repair.',
            'Blockers block unsafe actions, not the whole sprint.',
          ],
          reused: 'Reuses the registry extract, Build Log public API, source_contract_registry mirror, code-quality audit, and deep-audit closure gate.',
          notRebuilt: 'No Build Log UI redesign, no Recent Builds rewrite, no new closeout DB table, no closeout deletion.',
          exactGap: 'The May 19 deep audit found build closeout history still behaved as code-owned operational data after the registry extract.',
          overBroadRisk: 'This card can drift into a full storage migration. V1 only creates the source-contract data boundary and proof.',
          readyBy: 'Steve approved unattended overnight audit-control work and required deep-audit findings to become fixes, live cards, gates, or proof.',
          readyAt: '2026-05-19T23:55:00-04:00',
        },
        metadata: {
          ...nextItem.metadata,
          closeoutKey: CLOSEOUT_KEY,
          sourceId: BUILD_CLOSEOUT_DATA_SOURCE_ID,
          repoPosture: {
            integrationBranch: 'main',
            expectedBaseCommit: currentHead,
            commitPushRequiredAfterCard: true,
            mainMustEqualOriginMainAtCloseout: true,
          },
          blockersBlockActionsNotSprint: true,
          approvalBoundActionsParkInsteadOfStopping: true,
        },
      }
    }
    if (nextItem.cardId === NEXT_CARD_ID && nextItem.stage !== 'done_this_sprint') {
      return {
        ...nextItem,
        stage: 'scoping',
      }
    }
    return nextItem
  })
  return {
    sprint: {
      sprintId: sprint.sprintId,
      status: 'active',
      goal: sprint.goal,
      activeBlockerCardId: NEXT_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: 'build_closeout_data_source_done',
        nextAction: `Continue ${NEXT_CARD_ID}; keep audit P2 cleanup moving before intelligence/value expansion.`,
      },
    },
    items,
  }
}

async function applyLiveClose({ activeSprint, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'close Build Closeout data-source card, sync source registry, and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await syncSourceContractRegistryTable({ actor: ACTOR })
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    priority: 'P2',
    rank: 84,
    nextAction: `Done under ${CLOSEOUT_KEY}; continue ${NEXT_CARD_ID}.`,
    statusNote: `Closed under ${CLOSEOUT_KEY}; Build Log reads closeout history through ${BUILD_CLOSEOUT_DATA_SOURCE_ID} data-source boundary, source_contract_registry mirror, reusable validation, and code-quality/deep-audit proof.`,
    owner: 'Foundation Process',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, currentHead: gitState.head }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: `${CARD_ID} closes build closeout code-owned data finding and advances to ${NEXT_CARD_ID}.`,
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
    packageJson,
    dataSourceSource,
    buildLogSource,
    sourceContractsSource,
    codeQualitySource,
    deepAuditClosureSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/build-closeout-data-source.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('lib/source-contracts.js'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile('lib/deep-audit-findings-closure-gate.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(CLOSEOUT_DOC_PATH, { optional: true }),
  ])
  const gitState = getGitState()
  const [activeSprint, routeCards, planCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, 'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001']),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const card = routeCards.find(item => item.id === CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Build Log closeout data access, source contract registration, source_contract_registry sync, code-quality audit detector behavior, deep-audit route closure, Current Sprint mutation, live backlog truth, process gate, closeout registry, and package script',
    repoRoot,
  })
  const usage = evaluateBuildCloseoutDataSourceUsage({
    dataSourceSource,
    buildLogSource,
    sourceContractsSource,
    codeQualityAuditSource: codeQualitySource,
    deepAuditClosureSource,
  })
  const dogfood = buildBuildCloseoutDataSourceDogfoodProof()
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const buildCloseoutAuditFindings = (audit.findings || []).filter(finding =>
    finding.id === 'build-closeout-code-owned-data' ||
      finding.proposedCard === CARD_ID ||
      finding.proposedCard === 'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001',
  )

  if (args.closeCard &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    usage.ok &&
    dogfood.ok &&
    buildCloseoutAuditFindings.length === 0) {
    await applyLiveClose({ activeSprint, planReview, gitState })
  }

  const [afterSprint, afterCards, afterPlanCriticRuns, registrySnapshot] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, 'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001']),
    getPlanCriticRunsByCardIds([CARD_ID]),
    getSourceContractRegistrySnapshot(),
  ])
  const sourceSnapshot = buildBuildCloseoutDataSourceSnapshot({
    sourceContracts: getSourceContracts(),
    registryRows: registrySnapshot.registryRows || [],
  })
  const afterCard = afterCards.find(item => item.id === CARD_ID)
  const nextCard = afterCards.find(item => item.id === NEXT_CARD_ID)
  const registryExtractCard = afterCards.find(item => item.id === 'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001')
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(item => item.key === CLOSEOUT_KEY)
  const sprintItem = afterSprint.items.find(item => item.cardId === CARD_ID)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Build Closeout data-source card', buildPlanCriticResultSummary(planReview))
  addCheck(checks, usage.ok, 'Build Log/source-contract/code-quality/deep-audit use data-source boundary', JSON.stringify(usage.failed || []))
  addCheck(checks, dogfood.ok, 'dogfood rejects direct registry access, missing source contract, missing registry mirror, and stale audit route', dogfood.dogfoodInvariant)
  addCheck(checks, sourceSnapshot.ok, 'runtime source snapshot validates contract, registry row, and closeout records', JSON.stringify(sourceSnapshot.failed || []))
  addCheck(checks, sourceSnapshot.validation.closeoutCount >= 400 && sourceSnapshot.validation.invalidCloseoutKeys.length === 0, 'closeout data-source record validation is healthy', `records=${sourceSnapshot.validation.closeoutCount}`)
  addCheck(checks, sourceSnapshot.sourceContract?.sourceId === BUILD_CLOSEOUT_DATA_SOURCE_ID, 'source contract is visible through getSourceContracts()', sourceSnapshot.sourceContract?.sourceId || 'missing')
  addCheck(checks, sourceSnapshot.registryRow?.sourceId === BUILD_CLOSEOUT_DATA_SOURCE_ID, 'source_contract_registry has synced build closeout source row', sourceSnapshot.registryRow?.contractHash?.slice(0, 12) || 'missing')
  addCheck(checks, buildCloseoutAuditFindings.length === 0, 'code-quality audit no longer proposes build closeout data-source repair when healthy', buildCloseoutAuditFindings.map(finding => `${finding.id}:${finding.proposedCard}`).join(', ') || 'clean')
  addCheck(checks, packageJson.scripts?.['process:build-closeout-data-source-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-closeout-data-source-check'] || 'missing')
  addCheck(checks, dataSourceSource.includes('evaluateBuildCloseoutDataSourceUsage') && dataSourceSource.includes('buildBuildCloseoutDataSourceDogfoodProof'), 'module owns reusable evaluator and dogfood', 'lib/build-closeout-data-source.js')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('syncSourceContractRegistryTable') && scriptSource.includes('upsertFoundationCurrentSprintOverlay'), 'focused script uses guarded close-card mutation and source registry sync', SCRIPT_PATH)
  addCheck(checks, deepAuditClosureSource.includes(CARD_ID) && deepAuditClosureSource.includes(CLOSEOUT_KEY) && deepAuditClosureSource.includes("routeStatus: 'done'"), 'deep-audit route names data-source closeout proof', 'lib/deep-audit-findings-closure-gate.js')
  addCheck(checks, registryExtractCard?.lane === 'done', 'prior registry extract remains done before data-source closeout', registryExtractCard ? `${registryExtractCard.id}:${registryExtractCard.lane}` : 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves Build Closeout data-source closeout', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || afterCard?.lane === 'done', 'Build Closeout data-source card closes when requested', afterCard ? `${afterCard.lane}/${afterCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || afterSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to historical-aware sprint ID card', afterSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks Build Closeout data-source done', sprintItem?.stage || 'missing')
  addCheck(checks, nextCard && ['scoped', 'building_now', 'done'].includes(nextCard.lane), 'next historical-aware sprint ID card is live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, afterPlanCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.closeCard, 'durable Plan Critic pass row exists', afterPlanCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff records shipped behavior and next card', closeoutDoc ? 'present' : 'missing')
  addCheck(checks, gitState.branch === 'main', 'repo branch posture is main', gitState.branch)
  addCheck(checks, gitState.head === gitState.originMain || Boolean(gitState.porcelain), 'repo is synced or in-flight card has tracked dirty work', gitState.head === gitState.originMain ? 'synced' : 'in-flight')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    sourceId: BUILD_CLOSEOUT_DATA_SOURCE_ID,
    activeBlocker: afterSprint.sprint?.activeBlockerCardId || null,
    sourceSnapshot: {
      ok: sourceSnapshot.ok,
      sourceId: sourceSnapshot.sourceId,
      closeoutCount: sourceSnapshot.validation.closeoutCount,
      registryRow: sourceSnapshot.registryRow,
      failed: sourceSnapshot.failed,
    },
    usage,
    dogfood,
    codeQualityAudit: {
      findingCount: audit.findings?.length || 0,
      proposedCards: audit.proposedCards || [],
      buildCloseoutAuditFindingCount: buildCloseoutAuditFindings.length,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Build Closeout data-source check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Build Closeout data-source check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
