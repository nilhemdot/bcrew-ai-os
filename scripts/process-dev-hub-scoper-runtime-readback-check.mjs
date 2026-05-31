#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
} from '../lib/process-write-guard.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  createBacklogItem,
  getBacklogItemsByIds,
  updateBacklogItem,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  buildDevBuildOpportunityEvidenceTrace,
} from '../lib/dev-build-opportunity-evidence-trace.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  buildDevHubScoperEvidenceTraceReadback,
} from '../lib/dev-hub-scoper-evidence-trace-readback.js'
import {
  DEV_HUB_SCOPER_RUNTIME_READBACK_APPROVAL_PATH,
  DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID,
  DEV_HUB_SCOPER_RUNTIME_READBACK_CLOSEOUT_KEY,
  DEV_HUB_SCOPER_RUNTIME_READBACK_CONTRACT_VERSION,
  DEV_HUB_SCOPER_RUNTIME_READBACK_PLAN_PATH,
  DEV_HUB_SCOPER_RUNTIME_READBACK_SCRIPT_PATH,
  buildDevHubScoperRuntimeReadback,
  buildDevHubScoperRuntimeReadbackDogfoodProof,
  validateDevHubScoperRuntimeReadback,
} from '../lib/dev-hub-scoper-runtime-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-scoper-runtime-readback.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_SCOPER_RUNTIME_JS_PATH = 'public/dev-scoper-runtime-readback.js'
const DEV_SCOPER_RUNTIME_CSS_PATH = 'public/dev-scoper-runtime-readback.css'
const CLOSEOUT_DATA_PATH = 'data/foundation-build-closeouts/source-youtube-pipeline-records.json'
const COVERAGE_PATH = 'lib/foundation-verify-coverage-card-ids.js'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: argv.includes('--close-card') || argv.includes('--closeCard') || argv.includes('--close-card=true') || argv.includes('--closeCard=true'),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function sourceHasNoLiveMutation(source = '') {
  const blocked = [
    /\bscheduleScoper/i,
    /\brunScoper/i,
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bupsertFoundationCurrentSprintOverlay\s*\(/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\bcreatePortfolio/i,
    /\bupsertPortfolio/i,
    /\bcreateScoper/i,
    /\bupsertScoper/i,
    /\bsendTelegramMessage\s*\(/,
    /\bsendMail\s*\(/,
    /\bsendEmail\s*\(/,
    /\bfetch\s*\([^)]*,\s*\{[\s\S]*?method:\s*['"]POST['"]/,
    /\bcallLlm\s*\(/,
    /\brunYoutube/i,
    /\brunGovernedSynthesis\s*\(/,
    /\bwriteFile\s*\(/,
  ]
  return blocked.every(pattern => !pattern.test(source))
}

function sourceHasUiWiring({
  htmlSource = '',
  devJsSource = '',
  uiSource = '',
  cssSource = '',
} = {}) {
  return htmlSource.includes('id="scoper-runtime-readback"') &&
    htmlSource.includes('id="scoper-runtime-head-stats"') &&
    htmlSource.includes('/dev-scoper-runtime-readback.css') &&
    htmlSource.includes('/dev-scoper-runtime-readback.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('scoperRuntimeReadback') &&
    uiSource.includes('No schedule mutation') &&
    uiSource.includes('scheduleMutationsByReadback') &&
    cssSource.includes('.scoper-runtime-readback') &&
    cssSource.includes('.scoper-runtime-summary') &&
    cssSource.includes('.scoper-runtime-bucket')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_SCOPER_RUNTIME_READBACK_SCRIPT_PATH,
    operation: `close ${DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub Scoper runtime readback',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 56,
    source: 'Steve overnight approval: keep building safe Dev-Hub intelligence visibility while parking approval-bound Scoper schedule/promotion mutation.',
    summary: 'Added a read-only Dev Hub Scoper Runtime panel showing scheduled-job presence, latest run state, ready/parked Director candidates, and no-schedule/no-promotion boundaries.',
    whyItMatters: 'The Dev Hub now shows whether recommendations can actually flow into Scoper instead of hiding a frozen or missing runtime seam.',
    nextAction: 'Done under dev-hub-scoper-runtime-readback-v1. Next safe slice: waking/scheduling Scoper remains approval-bound and must be a separate card with no auto-promotion.',
    statusNote: `Closed with proof: npm run process:dev-hub-scoper-runtime-readback-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live Scoper runtime summary: jobs=${readback.summary?.scoperJobCount || 0}, scheduled=${readback.summary?.scheduledScoperJobCount || 0}, latest=${readback.summary?.latestScoperRunStatus || 'missing'}, ready=${readback.summary?.readyForPortfolioCount || 0}, parked=${readback.summary?.parkedCount || 0}, scheduleMutations=${readback.summary?.scheduleMutationsByReadback || 0}, scoperRunsStarted=${readback.summary?.scoperRunsStartedByReadback || 0}, autoPromoted=${readback.summary?.autoPromotedCount || 0}. No Scoper schedule mutation, Scoper run, Scoper/backlog/Portfolio write, route mutation, Harlan send, extraction, model call, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-SCOPER-RUNTIME-READBACK' }, ACTOR)
}

async function buildLiveReadback() {
  const foundationSnapshot = await getFoundationSnapshot()
  const traceResult = await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })
  const scoperEvidenceTraceReadback = buildDevHubScoperEvidenceTraceReadback({
    generatedAt: new Date().toISOString(),
    traceResult,
    candidateLimit: 5,
  })
  return buildDevHubScoperRuntimeReadback({
    generatedAt: new Date().toISOString(),
    foundationJobs: foundationSnapshot.foundationJobs || {},
    scoperEvidenceTraceReadback,
  })
}

async function main() {
  const args = parseArgs()
  const [
    packageJson,
    moduleSource,
    devTeamHubSource,
    htmlSource,
    devJsSource,
    uiSource,
    cssSource,
    closeoutRecords,
    coverageSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(MODULE_PATH),
    readRepoFile(DEV_TEAM_HUB_PATH),
    readRepoFile(DEV_HTML_PATH),
    readRepoFile(DEV_JS_PATH),
    readRepoFile(DEV_SCOPER_RUNTIME_JS_PATH),
    readRepoFile(DEV_SCOPER_RUNTIME_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_SCOPER_RUNTIME_READBACK_APPROVAL_PATH,
    cardId: DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubScoperRuntimeReadbackDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubScoperRuntimeReadback(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_SCOPER_RUNTIME_READBACK_CLOSEOUT_KEY) || null

    addCheck(checks, liveCard?.id === DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID, 'live backlog card exists', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_SCOPER_RUNTIME_READBACK_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-scoper-runtime-readback-check'] === `node --env-file-if-exists=.env ${DEV_HUB_SCOPER_RUNTIME_READBACK_SCRIPT_PATH}`, 'package exposes focused Scoper Runtime proof', packageJson.scripts?.['process:dev-hub-scoper-runtime-readback-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves missing/scheduled runtime readback and rejects schedule mutation, Scoper writes, and auto-promotion', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Scoper Runtime readback validates', liveValidation.failures.join(', ') || DEV_HUB_SCOPER_RUNTIME_READBACK_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'missing_schedule' || liveReadback.status === 'scheduled_visible', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.scheduleMutationsByReadback) === 0 && count(liveReadback.summary?.scoperRunsStartedByReadback) === 0, 'live readback starts zero schedule/run work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.routeMutationsByReadback) === 0, 'live readback performs zero Scoper/Portfolio/backlog/route writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback performs zero Harlan/external writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.autoPromotedCount) === 0, 'Director candidates remain proposal-only', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.jobs).length <= 5 && list(liveReadback.runtimeBuckets).length <= 5 && list(liveReadback.queues?.readyForPortfolioReview).length <= 5 && list(liveReadback.queues?.parkedByEvidence).length <= 5, 'Scoper Runtime rows are bounded', JSON.stringify({
      jobs: list(liveReadback.jobs).length,
      buckets: list(liveReadback.runtimeBuckets).length,
      ready: list(liveReadback.queues?.readyForPortfolioReview).length,
      parked: list(liveReadback.queues?.parkedByEvidence).length,
    }))
    addCheck(checks, moduleSource.includes(DEV_HUB_SCOPER_RUNTIME_READBACK_PLAN_PATH) && moduleSource.includes(DEV_HUB_SCOPER_RUNTIME_READBACK_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_SCOPER_RUNTIME_READBACK_PLAN_PATH} + ${DEV_HUB_SCOPER_RUNTIME_READBACK_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubScoperRuntimeReadback') && devTeamHubSource.includes('scoperRuntimeReadback'), 'Dev Hub payload includes scoperRuntimeReadback from existing read models', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Scoper Runtime from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Scoper Runtime implementation has no schedule, run, Scoper/backlog/Portfolio, Harlan, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_SCOPER_RUNTIME_READBACK_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID), 'closeout registry contains Scoper Runtime closeout', DEV_HUB_SCOPER_RUNTIME_READBACK_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID), 'verifier coverage source lists Scoper Runtime card', DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID)

    const failedBeforeClose = checks.filter(check => !check.ok)
    if (args.closeCard && failedBeforeClose.length === 0) {
      closedCard = await closeLiveBacklogCard(liveReadback)
      addCheck(checks, closedCard?.lane === 'done', 'close-card wrote guarded done backlog state', closedCard ? `${closedCard.id}/${closedCard.lane}` : 'missing')
    } else if (args.closeCard) {
      addCheck(checks, false, 'close-card skipped because pre-close checks failed', `${failedBeforeClose.length} failed`)
    }

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: DEV_HUB_SCOPER_RUNTIME_READBACK_CARD_ID,
      closeoutKey: DEV_HUB_SCOPER_RUNTIME_READBACK_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        runtimeBuckets: liveReadback.runtimeBuckets,
        queueCounts: Object.fromEntries(Object.entries(liveReadback.queues || {}).map(([key, value]) => [key, list(value).length])),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Scoper Runtime proof: ${result.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Dev Hub Scoper Runtime proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
