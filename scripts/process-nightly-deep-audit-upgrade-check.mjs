#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  NIGHTLY_DEEP_AUDIT_APPROVAL_PATH,
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_PLAN_PATH,
  NIGHTLY_DEEP_AUDIT_SCRIPT_PATH,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
  NIGHTLY_DEEP_AUDIT_UPGRADE_SPRINT_ID,
  buildDeepAuditorRealLoopDogfoodProof,
  buildNightlyDeepAuditUpgrade,
  buildNightlyDeepAuditUpgradeDogfoodProof,
  renderNightlyDeepAuditUpgradeReport,
  serializeNightlyDeepAuditUpgradeJson,
} from '../lib/nightly-deep-audit-upgrade.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    noWrite: false,
    skipEndpointFetch: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
    timeoutMs: 8000,
    changedSinceRef: 'HEAD~1',
    runLlmReview: process.env.NIGHTLY_DEEP_AUDIT_RUN_LLM === 'true',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--no-write') args.noWrite = true
    else if (arg === '--skipEndpointFetch' || arg === '--skip-endpoint-fetch') args.skipEndpointFetch = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
    else if (arg.startsWith('--timeoutMs=')) args.timeoutMs = Number(arg.slice('--timeoutMs='.length))
    else if (arg.startsWith('--endpointTimeoutMs=')) args.timeoutMs = Number(arg.slice('--endpointTimeoutMs='.length))
    else if (arg.startsWith('--changedSinceRef=')) args.changedSinceRef = arg.slice('--changedSinceRef='.length)
    else if (arg === '--runLlmReview' || arg === '--run-llm-review') args.runLlmReview = true
    else if (arg === '--no-runLlmReview' || arg === '--no-run-llm-review') args.runLlmReview = false
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function laneCounts(backlogItems = []) {
  return backlogItems.reduce((acc, item) => {
    const lane = item.lane || 'unknown'
    acc[lane] = (acc[lane] || 0) + 1
    return acc
  }, {})
}

function sameCounts(left = {}, right = {}) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if ((left[key] || 0) !== (right[key] || 0)) return false
  }
  return true
}

async function writeReportArtifacts(audit) {
  const markdown = renderNightlyDeepAuditUpgradeReport(audit)
  const reportPath = path.join(repoRoot, audit.reportPath)
  const jsonPath = path.join(repoRoot, audit.jsonPath)
  await fs.mkdir(path.dirname(reportPath), { recursive: true })
  await fs.writeFile(reportPath, markdown, 'utf8')
  await fs.writeFile(jsonPath, JSON.stringify(serializeNightlyDeepAuditUpgradeJson(audit), null, 2), 'utf8')
  return { markdown, reportPath: audit.reportPath, jsonPath: audit.jsonPath }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const before = await getFoundationSnapshot()
  const beforeCounts = laneCounts(before.backlogItems || [])
  const [approval, cards, activeSprint, planCriticRuns] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: NIGHTLY_DEEP_AUDIT_APPROVAL_PATH,
      cardId: NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
    }),
    getBacklogItemsByIds([NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [], planCriticRuns: [] })),
    getPlanCriticRunsByCardIds([NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID]),
  ])
  const job = getFoundationJobDefinitions().find(item => item.key === NIGHTLY_DEEP_AUDIT_JOB_KEY) || null
  const dogfood = buildNightlyDeepAuditUpgradeDogfoodProof()
  const realLoopDogfood = buildDeepAuditorRealLoopDogfoodProof()
  const audit = await buildNightlyDeepAuditUpgrade({
    repoRoot,
    baseUrl: args.baseUrl,
    timeoutMs: Number.isFinite(args.timeoutMs) && args.timeoutMs > 0 ? args.timeoutMs : 8000,
    skipEndpointFetch: args.skipEndpointFetch,
    changedSinceRef: args.changedSinceRef,
    runLlmReview: args.runLlmReview,
  })
  const artifacts = args.noWrite
    ? { markdown: renderNightlyDeepAuditUpgradeReport(audit), reportPath: audit.reportPath, jsonPath: audit.jsonPath }
    : await writeReportArtifacts(audit)

  const after = await getFoundationSnapshot()
  const afterCounts = laneCounts(after.backlogItems || [])
  await closeFoundationDb()

  const card = cards.find(item => item.id === NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID) || null
  const activeSprintHasAuditCard = activeSprint.sprint?.sprintId === NIGHTLY_DEEP_AUDIT_UPGRADE_SPRINT_ID &&
    activeSprint.items?.some(item =>
      item.cardId === NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID &&
      ['sprint_ready', 'building_now', 'done_this_sprint'].includes(item.stage),
    )
  const auditCardAlreadyClosed = card?.lane === 'done' &&
    String(card.statusNote || '').includes(NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY)
  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || NIGHTLY_DEEP_AUDIT_APPROVAL_PATH)
  addCheck(checks, card && ['scoped', 'done'].includes(card.lane), 'live backlog card exists in scoped/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(
    checks,
    activeSprintHasAuditCard || auditCardAlreadyClosed,
    'audit card is active during build or already closed for recurring runs',
    activeSprintHasAuditCard
      ? `${activeSprint.sprint?.sprintId} ${activeSprint.items.map(item => `${item.cardId}:${item.stage}`).join(', ')}`
      : auditCardAlreadyClosed
        ? `${card.id}:${card.lane}:${NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY}`
        : (activeSprint.sprint ? `${activeSprint.sprint.sprintId} ${activeSprint.items.map(item => `${item.cardId}:${item.stage}`).join(', ')}` : 'missing sprint'),
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    job?.runtimeMode === 'scheduled' &&
      job?.scheduleEveryMinutes === 1440 &&
      job?.scheduleLocalTime === NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME &&
      job?.scheduleTimezone === NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE &&
      job?.mutationPosture === 'report_only' &&
      job?.scheduleMutationGuard?.ok === true,
    'nightly deep audit job is scheduled report-only and accepted by schedule mutation guard',
    job ? `${job.runtimeMode}/${job.scheduleEveryMinutes}/${job.scheduleLocalTime}/${job.mutationPosture}/${job.scheduleMutationGuard?.ok}` : 'missing job',
  )
  addCheck(
    checks,
    job?.command === 'npm' &&
      (job.args || []).includes('process:nightly-deep-audit-upgrade-check') &&
      (job.args || []).includes('--json') &&
      (job.args || []).includes('--endpointTimeoutMs=8000') &&
      (job.args || []).includes('--runLlmReview'),
    'job points to the nightly deep audit proof/report command with bounded deep review enabled',
    job?.args?.join(' ') || 'missing job',
  )
  addCheck(
    checks,
    audit.reportOnly === true &&
      audit.autoFixes === false &&
      audit.writesBacklog === false &&
      audit.autonomousDev === false &&
      audit.autoCreatesBacklog === false,
    'audit is report-only with no auto-fixes/backlog/autonomous dev',
    JSON.stringify({
      reportOnly: audit.reportOnly,
      autoFixes: audit.autoFixes,
      writesBacklog: audit.writesBacklog,
      autonomousDev: audit.autonomousDev,
      autoCreatesBacklog: audit.autoCreatesBacklog,
    }),
  )
  addCheck(
    checks,
    audit.coverage?.backend === true && audit.coverage?.frontend === true && audit.coverage?.endpointMetrics === true,
    'audit covers backend, frontend, and required endpoint metrics',
    JSON.stringify(audit.coverage || {}),
  )
  addCheck(
    checks,
    audit.reviewTargets.some(target => target.file === 'scripts/foundation-verify.mjs') &&
      audit.reviewTargets.some(target => target.file === 'public/foundation.js') &&
      audit.reviewTargets.some(target => target.file === 'server.js') &&
      audit.reviewTargets.some(target => target.file === 'lib/foundation-db.js'),
    'high-risk review targets include verifier, frontend, hot route, and DB monolith surfaces',
    audit.reviewTargets.slice(0, 8).map(target => `${target.file}:${target.reasons.join('+')}`).join(', '),
  )
  addCheck(checks, dogfood.ok === true && audit.knownFailureDogfood?.ok === true, 'dogfood catches the May 13 failure modes', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'all dogfood checks passed')
  addCheck(checks, realLoopDogfood.ok === true, 'real-loop dogfood prevents packet-only false deep-review and unrouted P0/P1 findings', realLoopDogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'all real-loop dogfood checks passed')
  addCheck(
    checks,
    args.runLlmReview
      ? audit.llmReview?.providerReviewRequested === true
      : audit.llmReview?.status === 'degraded_packet_only' && audit.llmReview?.executedThisRun === false,
    args.runLlmReview
      ? 'live deep-review mode requests approved router execution or fails closed'
      : 'packet-only mode is explicit degraded, not fake completed review',
    JSON.stringify({
      requested: args.runLlmReview,
      status: audit.llmReview?.status,
      executedThisRun: audit.llmReview?.executedThisRun,
      mode: audit.llmReview?.mode,
    }),
  )
  addCheck(
    checks,
    audit.deepSeniorReviewRollup?.status === (audit.llmReview?.executedThisRun ? 'healthy' : 'degraded'),
    'deep senior review rollup matches actual execution state',
    JSON.stringify(audit.deepSeniorReviewRollup || {}),
  )
  addCheck(
    checks,
    /^docs\/handoffs\/nightly-deep-audit-\d{4}-\d{2}-\d{2}\.md$/.test(audit.reportPath) &&
      /^docs\/handoffs\/nightly-deep-audit-\d{4}-\d{2}-\d{2}\.json$/.test(audit.jsonPath),
    'audit uses date-based report and JSON paths',
    `${audit.reportPath} / ${audit.jsonPath}`,
  )
  addCheck(
    checks,
    artifacts.markdown.includes('No auto-fixes') &&
      artifacts.markdown.includes('High-Risk Review Packets') &&
      (audit.llmReview?.executedThisRun
        ? artifacts.markdown.includes('Deep senior review executed through the approved router')
        : artifacts.markdown.includes('Deep senior review did not execute')) &&
      artifacts.markdown.includes('Doc / Report Artifact Bloat') &&
      artifacts.markdown.includes('Dogfood Proof') &&
      artifacts.markdown.includes(NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY),
    'rendered report contains boundaries, review packets, deep-review execution truth, doc bloat, dogfood, and closeout key',
    artifacts.reportPath,
  )
  addCheck(
    checks,
    audit.docArtifactBloat?.summary?.artifactCount > 0 &&
      Array.isArray(audit.docArtifactBloat?.topFindings) &&
      audit.docArtifactBloat?.reportOnly === true &&
      audit.docArtifactBloat?.autoFixes === false,
    'nightly deep audit includes report-only doc/report bloat rollup',
    `status=${audit.docArtifactBloat?.status || 'missing'} artifacts=${audit.docArtifactBloat?.summary?.artifactCount || 0}`,
  )
  addCheck(checks, sameCounts(beforeCounts, afterCounts), 'backlog lane counts unchanged by audit command', `before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`)
  addCheck(
    checks,
    args.runLlmReview || process.env.NIGHTLY_DEEP_AUDIT_RUN_LLM !== 'true',
    'no live provider spend is triggered by default',
    args.runLlmReview
      ? 'explicit --runLlmReview requested bounded approved-route review'
      : 'LLM route is packet/approved-route planning only unless explicit env/flag enables it',
  )

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
    closeoutKey: NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
    scriptPath: NIGHTLY_DEEP_AUDIT_SCRIPT_PATH,
    planPath: NIGHTLY_DEEP_AUDIT_PLAN_PATH,
    reportPath: artifacts.reportPath,
    jsonPath: artifacts.jsonPath,
    summary: audit.deterministicAudit?.summary || {},
    reviewTargetCount: audit.reviewTargets?.length || 0,
    llmReview: audit.llmReview,
    deepSeniorReviewRollup: audit.deepSeniorReviewRollup,
    docArtifactBloat: audit.docArtifactBloat ? {
      status: audit.docArtifactBloat.status,
      summary: audit.docArtifactBloat.summary,
    } : null,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Nightly Deep Audit Upgrade check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
