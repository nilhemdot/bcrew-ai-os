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
  buildDevHubScoperRuntimeReadback,
} from '../lib/dev-hub-scoper-runtime-readback.js'
import {
  buildDevHubNextRepairQueue,
} from '../lib/dev-hub-next-repair-queue.js'
import {
  DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_APPROVAL_PATH,
  DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID,
  DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY,
  DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CONTRACT_VERSION,
  DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_PLAN_PATH,
  DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_SCRIPT_PATH,
  buildDevHubScoperScheduleBoundaryPreflight,
  buildDevHubScoperScheduleBoundaryPreflightDogfoodProof,
  validateDevHubScoperScheduleBoundaryPreflight,
} from '../lib/dev-hub-scoper-schedule-boundary-preflight.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-scoper-schedule-boundary-preflight.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_SCOPER_SCHEDULE_JS_PATH = 'public/dev-scoper-schedule-boundary-preflight.js'
const DEV_SCOPER_SCHEDULE_CSS_PATH = 'public/dev-scoper-schedule-boundary-preflight.css'
const CLOSEOUT_DATA_PATH = 'data/foundation-build-closeouts/source-youtube-pipeline-records.json'
const COVERAGE_PATH = 'lib/foundation-verify-coverage-card-ids.js'
const PROPOSED_JOB_KEY = 'dev-build-scoper-evidence-trace-readonly'
const PROPOSED_COMMAND = 'npm run process:dev-build-scoper-evidence-trace-check -- --json --limit=5'

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
    /\bupdateFoundationJobControl\s*\(/,
    /\bcreateFoundationJobRun\s*\(/,
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
  return htmlSource.includes('id="scoper-schedule-boundary-preflight"') &&
    htmlSource.includes('id="scoper-schedule-boundary-preflight-head-stats"') &&
    htmlSource.includes('/dev-scoper-schedule-boundary-preflight.css') &&
    htmlSource.includes('/dev-scoper-schedule-boundary-preflight.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('scoperScheduleBoundaryPreflight') &&
    uiSource.includes('schedule writes') &&
    uiSource.includes('approval_required') &&
    cssSource.includes('.scoper-schedule-boundary-preflight') &&
    cssSource.includes('.scoper-schedule-summary') &&
    cssSource.includes('.scoper-schedule-card')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_SCRIPT_PATH,
    operation: `close ${DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub Scoper schedule boundary preflight',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 57,
    source: 'Steve overnight approval: keep building safe Dev-Hub intelligence visibility, park approval-bound Scoper scheduling, and prepare exact approval packets.',
    summary: 'Added a read-only Dev Hub Scoper Schedule Boundary preflight with the exact proposed read-only job key, command, cadence, mutation posture, and approval text.',
    whyItMatters: 'The Dev Hub now turns the frozen Scoper schedule seam into an exact approval decision without waking Scoper or auto-promoting build recommendations.',
    nextAction: 'Done under dev-hub-scoper-schedule-boundary-preflight-v1. If Steve approves scheduling later, add only the named read-only job contract as a separate card; no auto-promotion.',
    statusNote: `Closed with proof: npm run process:dev-hub-scoper-schedule-boundary-preflight-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live schedule preflight summary: proposals=${readback.summary?.proposedScheduleCount || 0}, ready=${readback.summary?.readyForPortfolioCount || 0}, parked=${readback.summary?.parkedCount || 0}, scheduleMutations=${readback.summary?.scheduleMutationsByReadback || 0}, jobRegistryWrites=${readback.summary?.jobRegistryWritesByReadback || 0}, scoperRunsStarted=${readback.summary?.scoperRunsStartedByReadback || 0}, scoperWrites=${readback.summary?.scoperRecordsWrittenByReadback || 0}, backlogWrites=${readback.summary?.backlogRecordsWrittenByReadback || 0}, harlanSends=${readback.summary?.harlanSendsByReadback || 0}, externalWrites=${readback.summary?.externalWritesByReadback || 0}. No job registry write, schedule mutation, Scoper run, Scoper/backlog/Portfolio write, route mutation, approval mutation, Harlan send, extraction, model call, or external write is performed by this preflight path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-SCOPER-SCHEDULE-BOUNDARY-PREFLIGHT' }, ACTOR)
}

async function buildLiveReadback() {
  const foundationSnapshot = await getFoundationSnapshot()
  const traceResult = await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })
  const scoperEvidenceTraceReadback = buildDevHubScoperEvidenceTraceReadback({
    generatedAt: new Date().toISOString(),
    traceResult,
    candidateLimit: 5,
  })
  const scoperRuntimeReadback = buildDevHubScoperRuntimeReadback({
    generatedAt: new Date().toISOString(),
    foundationJobs: foundationSnapshot.foundationJobs || {},
    scoperEvidenceTraceReadback,
  })
  const nextRepairQueue = buildDevHubNextRepairQueue({
    generatedAt: new Date().toISOString(),
    foundationDoneBar: { ok: true },
    businessSourcePipelineTriage: { ok: true, summary: {} },
    routeReviewTriage: { ok: true, summary: {} },
    scoperRuntimeReadback,
    synthesisScopeReadback: {
      ok: true,
      summary: {
        refreshConfiguredForRealCorpus: true,
        proofAndRefreshSeparated: true,
        scheduledRefreshJobPresent: true,
        scheduledRefreshLatestStatus: 'succeeded',
      },
    },
    auditorFlowReadback: { ok: true, summary: {} },
    intelligenceHygieneReadback: { ok: true, summary: {} },
  })
  return buildDevHubScoperScheduleBoundaryPreflight({
    generatedAt: new Date().toISOString(),
    scoperRuntimeReadback,
    nextRepairQueue,
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
    readRepoFile(DEV_SCOPER_SCHEDULE_JS_PATH),
    readRepoFile(DEV_SCOPER_SCHEDULE_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_APPROVAL_PATH,
    cardId: DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubScoperScheduleBoundaryPreflightDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubScoperScheduleBoundaryPreflight(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'will create on close-card')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-scoper-schedule-boundary-preflight-check'] === `node --env-file-if-exists=.env ${DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_SCRIPT_PATH}`, 'package exposes focused Scoper Schedule Boundary proof', packageJson.scripts?.['process:dev-hub-scoper-schedule-boundary-preflight-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves read-only approval-required schedule contract and rejects schedule/run mutation', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Scoper Schedule Boundary preflight validates', liveValidation.failures.join(', ') || DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CONTRACT_VERSION)
    addCheck(checks, ['approval_ready', 'already_scheduled', 'no_schedule_proposal'].includes(liveReadback.status), 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.scheduleMutationsByReadback) === 0 && count(liveReadback.summary?.jobRegistryWritesByReadback) === 0 && count(liveReadback.summary?.scoperRunsStartedByReadback) === 0, 'live readback starts zero schedule/job/run work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.routeMutationsByReadback) === 0 && count(liveReadback.summary?.approvalRecordsWrittenByReadback) === 0, 'live readback performs zero Scoper/Portfolio/backlog/route/approval writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero model/extraction/Harlan/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.proposedSchedules).length <= 1, 'schedule rows are bounded', `${list(liveReadback.proposedSchedules).length} schedule row(s)`)
    addCheck(checks, list(liveReadback.proposedSchedules).every(item => item.proposedJobKey === PROPOSED_JOB_KEY && item.command === PROPOSED_COMMAND && item.status === 'approval_required' && item.approvalRequired === true && item.mutationPosture === 'read_only' && item.scheduledNow === false && item.jobRegisteredNow === false && item.scoperRunStartedNow === false), 'all proposed schedules stay approval-required read-only and not scheduled', list(liveReadback.proposedSchedules).map(item => `${item.proposedJobKey}:${item.status}:${item.mutationPosture}`).join(', ') || 'none')
    addCheck(checks, moduleSource.includes(DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_PLAN_PATH) && moduleSource.includes(DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_PLAN_PATH} + ${DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubScoperScheduleBoundaryPreflight') && devTeamHubSource.includes('scoperScheduleBoundaryPreflight'), 'Dev Hub payload includes scoperScheduleBoundaryPreflight from existing readbacks', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Scoper Schedule Boundary from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Scoper Schedule Boundary implementation has no schedule, run, Scoper/backlog/Portfolio, Harlan, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID), 'closeout registry contains Scoper Schedule Boundary closeout', DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID), 'verifier coverage source lists Scoper Schedule Boundary card', DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID)

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
      cardId: DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CARD_ID,
      closeoutKey: DEV_HUB_SCOPER_SCHEDULE_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        proposedSchedules: list(liveReadback.proposedSchedules).map(item => ({
          proposalId: item.proposalId,
          proposedJobKey: item.proposedJobKey,
          command: item.command,
          status: item.status,
          mutationPosture: item.mutationPosture,
          scheduledNow: item.scheduledNow,
        })),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Scoper Schedule Boundary preflight proof: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    if (!result.ok) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Dev Hub Scoper Schedule Boundary preflight proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
