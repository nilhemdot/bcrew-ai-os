#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildCodeQualityNightlyAudit, detectHardcodedLiveTruthInText } from '../lib/code-quality-nightly-audit.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_APPROVAL_PATH,
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID,
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY,
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_PLAN_PATH,
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SCRIPT_PATH,
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SPRINT_ID,
  buildFoundationCurrentStateSummaryDogfoodProof,
  buildFoundationCurrentStateSummaryPayload,
  evaluateFoundationCurrentStateSummarySourceContract,
} from '../lib/foundation-current-state-summary.js'
import { getSourceContracts } from '../lib/source-contracts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://localhost:3000',
    timeoutMs: 5000,
    skipServer: false,
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--skipServer' || arg === '--skipServer=true') args.skipServer = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
    else if (arg.startsWith('--timeoutMs=')) args.timeoutMs = Number(arg.slice('--timeoutMs='.length))
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

function stageOk(stage = '') {
  return ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(stage)
}

async function fetchFoundationHubSummary({ baseUrl, timeoutMs }) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const started = performance.now()
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/foundation-hub`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    const text = await response.text()
    const durationMs = performance.now() - started
    const payloadBytes = Buffer.byteLength(text)
    let payload = null
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
    return { ok: response.ok, status: response.status, durationMs, payloadBytes, payload }
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: performance.now() - started,
      payloadBytes: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    packageSource,
    frontendSource,
    moduleSource,
    hubReadRoutesSource,
    serverSource,
    focusedScriptSource,
    foundationVerifySource,
    codeQualityAuditSource,
    currentPlan,
    currentState,
    planSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_UI_LIVE_SUMMARY_SOURCES_APPROVAL_PATH,
      cardId: FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getPlanCriticRunsByCardIds([FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID]),
    readText('package.json'),
    readText('public/foundation-current-state-renderers.js'),
    readText('lib/foundation-current-state-summary.js'),
    readText('lib/hub-read-routes.js'),
    readText('server.js'),
    readText(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SCRIPT_PATH),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/code-quality-nightly-audit.js'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_PLAN_PATH),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID) || null
  const activeItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationCurrentStateSummaryDogfoodProof()
  const sourceContracts = getSourceContracts()
  const dependencyCards = await getBacklogItemsByIds(['FOUNDATION-001', 'SOURCE-014', 'DATA-020'])
  const syntheticPayload = buildFoundationCurrentStateSummaryPayload({
    sourceContracts,
    backlogItems: dependencyCards,
    kpiHealth: { summary: { status: 'degraded', tableCount: 21, rpcCount: 6, staleTables: 2, periodContract: { periodStart: '2027-01-01', periodEnd: '2027-12-31' } } },
    currentSprint: { status: 'healthy', summary: { doneThisSprintCount: 4 }, activeBlocker: { cardId: FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID } },
  })
  const frontendFindings = detectHardcodedLiveTruthInText({
    relativePath: 'public/foundation-current-state-renderers.js',
    text: frontendSource,
  }).filter(finding => finding.id === 'hardcoded-foundation-ui-current-summary')
  const nightlyAudit = await buildCodeQualityNightlyAudit({ repoRoot, skipEndpointFetch: true })
  const nightlyMatchingFindings = (nightlyAudit.findings || []).filter(finding => finding.id === 'hardcoded-foundation-ui-current-summary')
  const sourceContract = evaluateFoundationCurrentStateSummarySourceContract({
    payload: syntheticPayload,
    frontendSource,
    auditFindingIds: frontendFindings.map(finding => finding.id),
  })
  const hubFetch = args.skipServer ? null : await fetchFoundationHubSummary(args)
  const hubSummary = hubFetch?.payload?.currentStateSummary || hubFetch?.payload?.summary?.currentStateSummary || null
  const serverContract = hubSummary
    ? evaluateFoundationCurrentStateSummarySourceContract({
      payload: hubSummary,
      frontendSource,
      auditFindingIds: frontendFindings.map(finding => finding.id),
    })
    : null

  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, activeSprint?.sprint?.sprintId === FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SPRINT_ID || card?.lane === 'done', 'Current Sprint points to live-summary sprint while active or card is historically done', activeSprint?.sprint?.sprintId || 'missing active sprint')
  addCheck(checks, card?.lane === 'done' || (activeItem && stageOk(activeItem.stage)), 'Current Sprint item has active stage truth before closeout', activeItem ? `${activeItem.cardId}:${activeItem.stage}` : `card lane=${card?.lane || 'missing'}`)
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, dogfood.ok, 'dogfood proves source input changes alter UI row copy without frontend edits', dogfood.dogfoodInvariant)
  addCheck(checks, sourceContract.ok, 'source contract accepts payload-driven frontend and rejects stale static summary posture', sourceContract.checks.filter(check => !check.ok).map(check => check.check).join('; ') || `${sourceContract.summary.rowCount} rows`)
  addCheck(checks, frontendFindings.length === 0, 'focused detector no longer flags frontend current summary copy', frontendFindings.map(item => item.title).join(', ') || 'clean')
  addCheck(checks, nightlyMatchingFindings.length === 0, 'nightly audit no longer reports current-state static summary finding', nightlyMatchingFindings.map(item => item.refs?.[0]?.path || item.title).join(', ') || 'clean')
  addCheck(checks, !/var\s+surfaceRows\s*=\s*\[/.test(frontendSource) && frontendSource.includes('currentStateSummary') && frontendSource.includes('renderCurrentStateMissingSummaryPanel'), 'frontend renders currentStateSummary payload with degraded fallback', 'public/foundation-current-state-renderers.js')
  addCheck(checks, moduleSource.includes('buildFoundationCurrentStateSummaryPayload') && moduleSource.includes('evaluateFoundationCurrentStateSummarySourceContract') && moduleSource.includes('buildFoundationCurrentStateSummaryDogfoodProof'), 'summary module owns payload builder, evaluator, and dogfood proof', 'lib/foundation-current-state-summary.js')
  addCheck(checks, hubReadRoutesSource.includes('currentStateSummary') && serverSource.includes('buildFoundationCurrentStateSummaryPayload'), 'Foundation Hub API injects currentStateSummary through route dependencies', 'lib/hub-read-routes.js / server.js')
  addCheck(checks, codeQualityAuditSource.includes('public/foundation-current-state-renderers.js'), 'nightly audit scans the current-state renderer that owned the stale copy', 'lib/code-quality-nightly-audit.js')
  addCheck(checks, packageJson.scripts?.['process:foundation-ui-live-summary-sources-check'] === `node --env-file-if-exists=.env ${FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-ui-live-summary-sources-check'] || 'missing')
  addCheck(checks, scriptIsReadOnly(focusedScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutation statements, or fs write calls')
  addCheck(checks, foundationVerifySource.includes('FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID') && foundationVerifySource.includes('buildFoundationCurrentStateSummaryDogfoodProof') && foundationVerifySource.includes('source-backed Current State summary payload'), 'foundation verifier has thin delegated live-summary coverage', 'scripts/foundation-verify.mjs')
  addCheck(checks, planSource.includes('Dogfood proof') && planSource.includes('public/foundation-current-state-renderers.js') && planSource.includes('hot Foundation route'), 'approved plan preserves dogfood, frontend, and route-budget posture', FOUNDATION_UI_LIVE_SUMMARY_SOURCES_PLAN_PATH)
  if (!args.skipServer) {
    addCheck(checks, hubFetch?.ok === true && hubSummary && serverContract?.ok === true, 'live /api/foundation-hub returns currentStateSummary under source contract', hubFetch ? `status=${hubFetch.status} time=${Math.round(hubFetch.durationMs)}ms bytes=${hubFetch.payloadBytes}` : 'missing fetch')
    addCheck(checks, hubFetch?.durationMs < 2000 && hubFetch?.payloadBytes < 900000, 'live /api/foundation-hub stays inside current route budget', hubFetch ? `time=${Math.round(hubFetch.durationMs)}ms bytes=${hubFetch.payloadBytes}` : 'missing fetch')
  }
  if (closeout || card?.lane === 'done') {
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID) && await repoFileExists('docs/handoffs/2026-05-16-foundation-ui-live-summary-sources-closeout.md') && currentPlan.includes(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY) && currentState.includes(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY), 'closeout is registered when card is done', closeout ? closeout.key : 'missing closeout')
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID,
    closeoutKey: FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY,
    dogfood,
    syntheticSummary: syntheticPayload.summary,
    nightlyFindingCount: nightlyAudit.summary?.findingCount,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`${result.status}: ${checks.length - failures.length}/${checks.length} checks passed`)
    for (const failure of failures) console.log(`- ${failure.check}: ${failure.detail}`)
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
