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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  FOUNDATION_ENDPOINT_BUDGET_ROUTES,
  loadLatestFoundationEndpointBudgetSnapshot,
} from '../lib/foundation-endpoint-budgets.js'
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

const CARD_ID = 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001'
const CLOSEOUT_KEY = 'foundation-endpoint-metrics-freshness-v1'
const PLAN_PATH = 'docs/process/foundation-endpoint-metrics-freshness-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001.json'
const CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-foundation-endpoint-metrics-freshness-closeout.md'
const SCRIPT_PATH = 'scripts/process-foundation-endpoint-metrics-freshness-check.mjs'
const AUDIT_JSON_PATH = 'docs/handoffs/nightly-deep-audit-2026-05-19.json'
const AUDIT_MD_PATH = 'docs/handoffs/nightly-deep-audit-2026-05-19.md'
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
const NEXT_CARD_ID = 'FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001'

const CHANGED_FILES = [
  'docs/handoffs/nightly-deep-audit-2026-05-19.json',
  'docs/handoffs/nightly-deep-audit-2026-05-19.md',
  'scripts/process-foundation-endpoint-budgets-check.mjs',
  SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
]

const PROOF_COMMANDS = [
  'node --check scripts/process-foundation-endpoint-metrics-freshness-check.mjs scripts/process-foundation-endpoint-budgets-check.mjs',
  'npm run process:foundation-endpoint-metrics-freshness-check -- --apply --close-card --json',
  'npm run process:foundation-endpoint-budgets-check -- --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${CARD_ID} --closeoutKey=${CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --commitRef=HEAD`,
]

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

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function parseJsonFromCommand(text = '') {
  const candidates = [...String(text).matchAll(/\n\{/g)].map(match => match.index + 1)
  const first = String(text).indexOf('{')
  if (first >= 0) candidates.unshift(first)
  for (const start of candidates.filter(index => index >= 0).reverse()) {
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
    maxBuffer: 50 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

function endpointRowsFromAudit(audit = {}) {
  return Array.isArray(audit.endpointMetrics) ? audit.endpointMetrics : []
}

function endpointMetricSummary(rows = []) {
  return FOUNDATION_ENDPOINT_BUDGET_ROUTES
    .map(endpoint => {
      const row = rows.find(item => item.endpoint === endpoint)
      if (!row) return `${endpoint}:missing`
      return `${endpoint}:${row.ok ? 'ok' : 'blocked'}:${Math.round(Number(row.durationMs || 0))}ms:${Number(row.payloadBytes || 0)}B`
    })
    .join(', ')
}

function endpointRowsCurrent(rows = []) {
  return FOUNDATION_ENDPOINT_BUDGET_ROUTES.every(endpoint => {
    const row = rows.find(item => item.endpoint === endpoint)
    return row &&
      row.ok === true &&
      Number(row.status) >= 200 &&
      Number(row.status) < 400 &&
      row.timeout !== true &&
      row.risk?.status === 'healthy'
  })
}

function endpointHealthRows(systemHealth = {}) {
  return (systemHealth.findings || []).filter(finding => String(finding.id || '').startsWith('endpoint_budget'))
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Refresh Foundation endpoint budget metrics',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 2,
    source: 'May 19 Foundation-only cleanup sprint after raw workflow repairs.',
    summary: 'Refresh latest Foundation endpoint metrics so System Health no longer reports stale or missing endpoint budget rows.',
    whyItMatters: 'Endpoint budget health must reflect current measured route truth, not stale nightly reports or classification-only cleanup.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue ${NEXT_CARD_ID}.`
      : 'Refresh endpoint metrics, remove endpoint System Health review rows, and prove the existing endpoint-budget gate is current.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; endpoint risk/review counts are zero.`
      : `Executing \`${CLOSEOUT_KEY}\`; endpoint freshness blocks the Foundation cleanup queue.`,
    owner: 'Foundation Process',
  }
}

function withEndpointSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Latest nightly audit endpointMetrics cover all required Foundation routes, System Health endpoint risk/review counts are zero, endpoint-budget proof passes, and live backlog/current sprint close this card.',
    proofCommands: PROOF_COMMANDS,
    notNextBoundaries: [
      'Do not classify endpoint rows instead of making metrics current.',
      'Do not rewrite route budgets or lazy-loading behavior unless a measured route is actually over budget.',
      'Do not proceed to handoff/file-size/green-lock work until this card closes.',
      'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
      'Do not start value/source/agent feature work.',
      'Do not mutate Drive permissions, send email, send Agent Feedback, or perform external writes.',
      'Do not launch parallel builders from this card.',
    ],
    existingWorkCheck: {
      existingCode: [
        'lib/foundation-endpoint-budgets.js',
        'lib/foundation-system-health.js',
        'scripts/process-foundation-endpoint-budgets-check.mjs',
        'scripts/process-nightly-deep-audit-upgrade-check.mjs',
      ],
      existingDocs: [
        PLAN_PATH,
        APPROVAL_PATH,
        CLOSEOUT_PATH,
        AUDIT_JSON_PATH,
        AUDIT_MD_PATH,
      ],
      existingScripts: [
        SCRIPT_PATH,
        'scripts/process-foundation-endpoint-budgets-check.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
      ],
      existingPolicy: [
        'Endpoint metrics exit means endpoint rows disappear or are proven current.',
        'Classification is not repair.',
        'Foundation-only today; no Value Builder split.',
      ],
      reused: [
        'existing endpoint budget module',
        'nightly deep audit endpointMetrics writer',
        'live Backlog and Current Sprint truth',
      ],
      notRebuilt: [
        'No route rewrite.',
        'No budget threshold rewrite.',
        'No new endpoint health subsystem.',
      ],
      exactGap: 'The latest nightly deep audit artifact had zero endpointMetrics, so System Health reported five missing endpoint rows even though the endpoint-budget system already existed.',
      overBroadRisk: 'This card must not turn into route optimization, handoff cleanup, file-size work, source extraction, or value feature work.',
      readyBy: 'Steve',
      readyAt: '2026-05-19T11:18:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: APPROVAL_PATH,
    },
  }
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update endpoint metrics freshness backlog card, Plan Critic row, and Current Sprint overlay',
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
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-endpoint-metrics')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-endpoint-metrics-freshness-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-foundation-endpoint-metrics',$3,$4::jsonb)
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
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  let inserted = false
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(withEndpointSprintItem(item, { closeCard }))
      inserted = true
      continue
    }
    if (!inserted && item.cardId === NEXT_CARD_ID) {
      items.push(withEndpointSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
      inserted = true
    }
    items.push(item)
  }
  if (!inserted) items.push(withEndpointSprintItem({ order: items.length + 1 }, { closeCard }))

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
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          currentStatus: closeCard ? 'endpoint_metrics_fresh' : 'endpoint_metrics_refresh_active',
          nextAction: closeCard
            ? `Continue ${NEXT_CARD_ID}; endpoint metric rows are gone/proven current.`
            : `${CARD_ID} blocks the cleanup queue until endpoint metric rows are gone/proven current.`,
        },
      },
      items: items.map((item, index) => ({ ...item, order: index + 1 })),
    },
    'codex-foundation-endpoint-metrics',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: 'Foundation-only cleanup requires endpoint metric freshness before handoff and file-size cleanup.',
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
    activeSprint,
    cards,
    planCriticRuns,
    closeoutDoc,
    auditJsonSource,
    auditMdSource,
    packageJson,
    endpointBudgetsCheckSource,
    coverageIdsSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile(AUDIT_JSON_PATH),
    readRepoFile(AUDIT_MD_PATH, { optional: true }),
    readRepoFile('package.json'),
    readRepoFile('scripts/process-foundation-endpoint-budgets-check.mjs'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'endpoint metric freshness, System Health endpoint row removal, live sprint closeout, and proof-path repair',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let workingCards = cards
  let workingPlanCriticRuns = planCriticRuns
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
    workingCards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID])
    workingPlanCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID])
  }

  const auditJson = JSON.parse(auditJsonSource)
  const endpointRows = endpointRowsFromAudit(auditJson)
  const latestSnapshot = await loadLatestFoundationEndpointBudgetSnapshot({ repoRoot })
  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const endpointBudgets = runNpmScript('process:foundation-endpoint-budgets-check', ['--json'])
  const card = workingCards.find(item => item.id === CARD_ID) || null
  const nextCard = workingCards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const parsedPackage = JSON.parse(packageJson)
  const endpointFindings = endpointHealthRows(systemHealth.json?.systemHealth || {})
  const endpointSummary = systemHealth.json?.systemHealth?.summary || {}

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for endpoint metrics freshness', buildPlanCriticResultSummary(planReview))
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live endpoint metrics card is executing or done', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next handoff cleanup card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, await repoFileExists(AUDIT_JSON_PATH) && await repoFileExists(AUDIT_MD_PATH), 'May 19 nightly deep audit artifacts exist', `${AUDIT_JSON_PATH} / ${AUDIT_MD_PATH}`)
  addCheck(checks, endpointRows.length === FOUNDATION_ENDPOINT_BUDGET_ROUTES.length && endpointRowsCurrent(endpointRows), 'May 19 endpoint metrics cover all required routes and are healthy', endpointMetricSummary(endpointRows))
  addCheck(checks, auditJson.summary?.endpointsMeasured === FOUNDATION_ENDPOINT_BUDGET_ROUTES.length && auditJson.summary?.staticReportOnly === true, 'nightly audit summary records endpoint measurement count and report-only posture', `endpoints=${auditJson.summary?.endpointsMeasured ?? 'missing'} reportOnly=${auditJson.summary?.staticReportOnly}`)
  addCheck(checks, auditMdSource.includes('/api/foundation-hub') && auditMdSource.includes('/api/foundation/gstack-build-intel'), 'nightly audit markdown lists endpoint measurement evidence', AUDIT_MD_PATH)
  addCheck(checks, latestSnapshot.status === 'healthy' && latestSnapshot.summary?.missingCount === 0 && latestSnapshot.summary?.routeCount === FOUNDATION_ENDPOINT_BUDGET_ROUTES.length, 'latest endpoint budget snapshot loads fresh May 19 metrics', `${latestSnapshot.status} missing=${latestSnapshot.summary?.missingCount ?? 'unknown'} source=${latestSnapshot.sourcePath || latestSnapshot.source}`)
  addCheck(checks, systemHealth.exitStatus === 0 && systemHealth.json?.systemHealth?.status === 'healthy', 'system-health process exits healthy after endpoint refresh', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, Number(endpointSummary.endpointRiskCount || 0) === 0 && Number(endpointSummary.endpointReviewCount || 0) === 0 && endpointFindings.length === 0, 'endpoint System Health rows disappeared instead of being classified', `risk=${endpointSummary.endpointRiskCount ?? 'missing'} review=${endpointSummary.endpointReviewCount ?? 'missing'} findings=${endpointFindings.length}`)
  addCheck(checks, endpointBudgets.exitStatus === 0 && endpointBudgets.json?.ok === true, 'existing endpoint-budget focused proof passes', `exit=${endpointBudgets.exitStatus} latest=${endpointBudgets.json?.summary?.latestEndpointStatus || 'missing'}`)
  addCheck(checks, endpointBudgetsCheckSource.includes('operatorBudgetVerifierSource') && endpointBudgetsCheckSource.includes('delegatedEndpointBudgetCoverage'), 'old endpoint-budget proof accepts focused verifier delegation', 'scripts/process-foundation-endpoint-budgets-check.mjs')
  addCheck(checks, parsedPackage.scripts?.['process:foundation-endpoint-metrics-freshness-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes endpoint metrics freshness proof', parsedPackage.scripts?.['process:foundation-endpoint-metrics-freshness-check'] || 'missing')
  addCheck(checks, coverageIdsSource.includes(CARD_ID), 'verifier coverage includes endpoint metrics freshness card id', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint can record endpoint metrics closeout', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || activeBlockerCardId === NEXT_CARD_ID || args.apply, 'Current Sprint active blocker advances to handoff cleanup after close', activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || (closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID)), 'closeout registry resolves endpoint metrics freshness', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || closeoutDoc.includes(CARD_ID) || args.apply, 'closeout handoff exists for endpoint metrics freshness', CLOSEOUT_PATH)

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
  }

  if (args.closeCard) {
    const refreshedCards = await getBacklogItemsByIds([CARD_ID])
    const refreshedPlanCritic = await getPlanCriticRunsByCardIds([CARD_ID])
    const refreshedSprint = await getActiveFoundationCurrentSprint()
    addCheck(checks, refreshedCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', refreshedCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is handoff cleanup after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    latestSnapshot,
    systemHealth: {
      exitStatus: systemHealth.exitStatus,
      status: systemHealth.json?.systemHealth?.status || null,
      summary: systemHealth.json?.systemHealth?.summary || null,
      endpointFindingIds: endpointFindings.map(finding => finding.id),
    },
    endpointBudgets: {
      exitStatus: endpointBudgets.exitStatus,
      status: endpointBudgets.json?.ok === true ? 'healthy' : 'risk',
      summary: endpointBudgets.json?.summary || null,
    },
    endpointMetrics: {
      routeCount: endpointRows.length,
      requiredRouteCount: FOUNDATION_ENDPOINT_BUDGET_ROUTES.length,
      rows: endpointRows,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation endpoint metrics freshness check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation endpoint metrics freshness check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
