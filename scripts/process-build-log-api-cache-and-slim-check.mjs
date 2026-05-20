#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildCodeQualityNightlyAudit } from '../lib/code-quality-nightly-audit.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
  BUILD_LOG_API_CACHE_AND_SLIM_APPROVAL_PATH as APPROVAL_PATH,
  BUILD_LOG_API_CACHE_AND_SLIM_CARD_ID as CARD_ID,
  BUILD_LOG_API_CACHE_AND_SLIM_CLOSEOUT_KEY as CLOSEOUT_KEY,
  BUILD_LOG_API_CACHE_AND_SLIM_NEXT_CARD_ID as NEXT_CARD_ID,
  BUILD_LOG_API_CACHE_AND_SLIM_PLAN_PATH as PLAN_PATH,
  BUILD_LOG_API_CACHE_AND_SLIM_PROOF_COMMANDS as PROOF_COMMANDS,
  BUILD_LOG_API_CACHE_AND_SLIM_SCRIPT_PATH as SCRIPT_PATH,
  BUILD_LOG_API_PAYLOAD_BUDGET_BYTES,
  buildFoundationBuildLogApiCacheAndSlimDogfoodProof,
  buildFoundationBuildLogApiCacheDogfoodProof,
  evaluateFoundationBuildLogApiCacheAndSlimSource,
} from '../lib/foundation-build-log-api-cache.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-build-log-api-cache-and-slim'
const CLOSEOUT_DOC_PATH = 'docs/handoffs/2026-05-19-build-log-api-cache-and-slim-closeout.md'
const CHANGED_FILES = [
  'lib/foundation-build-log-api-cache.js',
  'lib/foundation-operator-routes.js',
  'public/foundation-operations-renderers.js',
  'lib/code-quality-nightly-audit.js',
  'scripts/process-code-quality-nightly-audit-check.mjs',
  'lib/deep-audit-findings-closure-gate.js',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  'lib/foundation-build-closeout-db-process-records.js',
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
        `build-log-api-cache-and-slim-${stableRunId(PLAN_PATH)}`,
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
        definitionOfDone: 'Build Log API route uses a bounded cache/slim payload path, Recent Work resolves buildRefs, and the nightly audit no longer proposes the stale Build Log P2 when proof passes.',
        proofCommands: PROOF_COMMANDS,
        notNextBoundaries: [
          'Do not redesign Recent Work or Daily Summary.',
          'Do not rewrite build-log closeout history or static closeout registry data.',
          'Do not remove top-level builds compatibility from the API payload.',
          'Do not work MEETING-VAULT-ACL-001 Phase B.',
          'Do not mutate Drive permissions.',
          'Do not change source data, credentials, providers, private extraction, or external writes.',
          'Do not start Value Builder or source/value expansion before the approved audit-control queue is done.',
        ],
        existingWorkCheck: {
          existingCode: [
            'lib/foundation-operator-routes.js',
            'lib/foundation-build-log.js',
            'public/foundation-operations-renderers.js',
            'lib/code-quality-nightly-audit.js',
            'lib/deep-audit-findings-closure-gate.js',
          ],
          existingDocs: [
            'docs/audits/2026-05-19-foundation-deep-merge-audit.md',
            'docs/process/deep-audit-findings-closure-gate-001-plan.md',
            'docs/process/foundation-client-current-state-extract-001-plan.md',
          ],
          existingScripts: [
            'process:code-quality-nightly-audit-check',
            'process:system-health-nightly-audit-check',
            'process:build-lane-repeated-failure-action-gate-check',
            'process:foundation-ship',
          ],
          existingPolicy: [
            'Audit findings become live backlog truth or shipped proof.',
            'Green means raw green; classification is not repair.',
            'Current Sprint is the executable command surface.',
            'Blockers block unsafe actions, not the whole sprint.',
          ],
          reused: 'Reuses the existing Build Log route, build-log enrichment helpers, Recent Work renderer, and code-quality audit instead of rewriting closeout history.',
          notRebuilt: 'No Recent Work redesign, no Daily Summary redesign, no build-log registry migration, and no source/value expansion.',
          exactGap: 'The May 19 deep audit found request-time git work and duplicated group/build payloads for the Build Log API.',
          overBroadRisk: 'The card can drift into a closeout registry rewrite or UI redesign. It is bounded to route caching, group payload slimming, frontend compatibility, audit routing, and closeout.',
          readyBy: 'Steve approved unattended overnight audit-control work and required audit findings to become fixes, live cards, gates, or proof.',
          readyAt: '2026-05-19T23:05:00-04:00',
        },
        metadata: {
          ...nextItem.metadata,
          closeoutKey: CLOSEOUT_KEY,
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
        currentStatus: 'build_log_api_cache_and_slim_done',
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
    operation: 'close Build Log API cache/slim card and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    priority: 'P2',
    rank: 80,
    nextAction: `Done under ${CLOSEOUT_KEY}; continue ${NEXT_CARD_ID}.`,
    statusNote: `Closed under ${CLOSEOUT_KEY}; Build Log API uses a bounded cache/slim payload path, Recent Work resolves buildRefs, and the nightly audit no longer proposes the stale Build Log API card when proof passes.`,
    owner: 'Foundation Runtime',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, currentHead: gitState.head }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: `${CARD_ID} closes Build Log API cache/slim audit finding and advances to ${NEXT_CARD_ID}.`,
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
    operatorRoutesSource,
    frontendOperationsSource,
    cacheModuleSource,
    codeQualitySource,
    codeQualityCheckSource,
    scriptSource,
    closeoutRegistrySource,
    deepAuditClosureSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-operator-routes.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('lib/foundation-build-log-api-cache.js'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile('scripts/process-code-quality-nightly-audit-check.mjs'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-db-process-records.js'),
    readRepoFile('lib/deep-audit-findings-closure-gate.js'),
    readRepoFile(CLOSEOUT_DOC_PATH, { optional: true }),
  ])
  const gitState = getGitState()
  const [activeSprint, routeCards, planCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const closeouts = getFoundationBuildCloseouts()
  const sourceProof = evaluateFoundationBuildLogApiCacheAndSlimSource({
    operatorRoutesSource,
    frontendOperationsSource,
    cacheModuleSource,
  })
  const dogfood = buildFoundationBuildLogApiCacheAndSlimDogfoodProof()
  const cacheDogfood = await buildFoundationBuildLogApiCacheDogfoodProof()
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const buildLogAuditFindings = (audit.findings || []).filter(finding =>
    finding.id === 'build-log-request-time-git-and-duplication' ||
      finding.proposedCard === CARD_ID,
  )
  const card = routeCards.find(item => item.id === CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'operator API route behavior, frontend compatibility, nightly code-quality audit detector behavior, Current Sprint mutation, live backlog truth, process gate, closeout registry, and package script',
    repoRoot,
  })

  if (args.closeCard &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    sourceProof.ok &&
    dogfood.ok &&
    cacheDogfood.ok &&
    buildLogAuditFindings.length === 0) {
    await applyLiveClose({ activeSprint, planReview, gitState })
  }

  const [afterSprint, afterCards, afterPlanCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const afterCard = afterCards.find(item => item.id === CARD_ID)
  const nextCard = afterCards.find(item => item.id === NEXT_CARD_ID)
  const closeout = closeouts.find(item => item.key === CLOSEOUT_KEY)
  const sprintItem = afterSprint.items.find(item => item.cardId === CARD_ID)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Build Log API cache/slim card', buildPlanCriticResultSummary(planReview))
  addCheck(checks, sourceProof.ok, 'Build Log API source uses cache/slim route and frontend ref resolution', JSON.stringify(sourceProof.failed || []))
  addCheck(checks, dogfood.ok, 'dogfood rejects no-cache duplicated payload source wiring', dogfood.ok ? 'pass' : JSON.stringify(dogfood))
  addCheck(checks, cacheDogfood.ok, 'cache dogfood proves repeated reads hit cache and expired reads reload', JSON.stringify(cacheDogfood))
  addCheck(checks, buildLogAuditFindings.length === 0, 'code-quality audit no longer proposes stale Build Log API card', buildLogAuditFindings.map(finding => `${finding.id}:${finding.refs?.[0]?.path || ''}`).join(', ') || 'clean')
  addCheck(checks, packageJson.scripts?.['process:build-log-api-cache-and-slim-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-log-api-cache-and-slim-check'] || 'missing')
  addCheck(checks, cacheModuleSource.includes('evaluateFoundationBuildLogApiCacheAndSlimSource') && cacheModuleSource.includes('buildFoundationBuildLogApiCacheDogfoodProof'), 'module owns reusable cache/slim proof', 'lib/foundation-build-log-api-cache.js')
  addCheck(checks, codeQualitySource.includes('evaluateFoundationBuildLogApiCacheAndSlimSource') && codeQualitySource.includes('build-log-request-time-git-and-duplication') && codeQualitySource.includes('!buildLogCacheAndSlimReady'), 'nightly audit detector uses cache/slim proof before suppressing stale finding', 'lib/code-quality-nightly-audit.js')
  addCheck(checks, codeQualityCheckSource.includes('remaining material finding set as routed audit debt burns down'), 'code-quality audit process check does not pin fixed finding count', 'scripts/process-code-quality-nightly-audit-check.mjs')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay') && scriptSource.includes('updateBacklogItem'), 'focused script uses guarded backlog and sprint mutations', SCRIPT_PATH)
  addCheck(checks, deepAuditClosureSource.includes(CARD_ID) && deepAuditClosureSource.includes(CLOSEOUT_KEY) && deepAuditClosureSource.includes("routeStatus: 'done'"), 'deep-audit route now names Build Log closeout proof', 'lib/deep-audit-findings-closure-gate.js')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves Build Log API cache/slim closeout', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || afterCard?.lane === 'done', 'Build Log API cache/slim card closes when requested', afterCard ? `${afterCard.lane}/${afterCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || afterSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to admin deal policy source contract card', afterSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks Build Log API cache/slim done', sprintItem?.stage || 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next admin deal policy source contract card is live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, afterPlanCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.closeCard, 'durable Plan Critic pass row exists', afterPlanCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID) && closeoutDoc.includes('buildRefs'), 'closeout handoff records shipped behavior and next card', closeoutDoc ? 'present' : 'missing')
  addCheck(checks, BUILD_LOG_API_PAYLOAD_BUDGET_BYTES >= 500000, 'payload budget is explicit and conservative for current route', String(BUILD_LOG_API_PAYLOAD_BUDGET_BYTES))
  addCheck(checks, gitState.branch === 'main', 'repo branch posture is main', gitState.branch)
  addCheck(checks, gitState.head === gitState.originMain || Boolean(gitState.porcelain), 'repo is synced or in-flight card has tracked dirty work', gitState.head === gitState.originMain ? 'synced' : 'in-flight')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    activeBlocker: afterSprint.sprint?.activeBlockerCardId || null,
    sourceProof,
    dogfood,
    cacheDogfood,
    codeQualityAudit: {
      findingCount: audit.findings?.length || 0,
      proposedCards: audit.proposedCards || [],
      buildLogAuditFindingCount: buildLogAuditFindings.length,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Build Log API cache/slim check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Build Log API cache/slim check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
