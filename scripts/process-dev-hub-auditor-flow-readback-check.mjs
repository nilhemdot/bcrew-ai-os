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
  getExtractionControlSnapshot,
} from '../lib/foundation-source-crawl-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import {
  buildDevBuildOpportunityEvidenceTrace,
} from '../lib/dev-build-opportunity-evidence-trace.js'
import {
  buildDevHubActionRouteReadback,
} from '../lib/dev-hub-action-route-readback.js'
import {
  buildDevHubFoundationDoneBarFromInputs,
} from '../lib/dev-hub-foundation-done-bar.js'
import {
  buildDevHubScoperEvidenceTraceReadback,
} from '../lib/dev-hub-scoper-evidence-trace-readback.js'
import {
  buildSourceFamilyGodModeMaturitySnapshot,
  evaluateSourceFamilyGodModeMaturity,
} from '../lib/source-family-god-mode-extractors.js'
import {
  buildDevHubIntelligenceHygieneReadback,
} from '../lib/dev-hub-intelligence-hygiene-readback.js'
import {
  DEV_HUB_AUDITOR_FLOW_READBACK_APPROVAL_PATH,
  DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID,
  DEV_HUB_AUDITOR_FLOW_READBACK_CLOSEOUT_KEY,
  DEV_HUB_AUDITOR_FLOW_READBACK_CONTRACT_VERSION,
  DEV_HUB_AUDITOR_FLOW_READBACK_PLAN_PATH,
  DEV_HUB_AUDITOR_FLOW_READBACK_SCRIPT_PATH,
  buildDevHubAuditorFlowReadback,
  buildDevHubAuditorFlowReadbackDogfoodProof,
  validateDevHubAuditorFlowReadback,
} from '../lib/dev-hub-auditor-flow-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-auditor-flow-readback.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_AUDITOR_FLOW_JS_PATH = 'public/dev-auditor-flow.js'
const DEV_AUDITOR_FLOW_CSS_PATH = 'public/dev-auditor-flow.css'
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
    /\bupsertIntelligenceAtom\s*\(/,
    /\brecordIntelligenceAtomHit\s*\(/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\bsnoozeActionRoute\s*\(/,
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bupsertFoundationCurrentSprintOverlay\s*\(/,
    /\bsendTelegramMessage\s*\(/,
    /\bsendMail\s*\(/,
    /\bsendEmail\s*\(/,
    /\bfetch\s*\([^)]*,\s*\{[\s\S]*?method:\s*['"]POST['"]/,
    /\bcallLlm\s*\(/,
    /\brunYoutube/i,
    /\bpersistSourceCrawlItem\s*\(/,
    /\bupsertSourceCrawlItem\s*\(/,
    /\bwriteFile\s*\(/,
    /--write-report/,
    /foundation:job/,
  ]
  return blocked.every(pattern => !pattern.test(source))
}

function sourceHasUiWiring({
  htmlSource = '',
  devJsSource = '',
  uiSource = '',
  cssSource = '',
} = {}) {
  return htmlSource.includes('id="auditor-flow"') &&
    htmlSource.includes('id="auditor-flow-head-stats"') &&
    htmlSource.includes('/dev-auditor-flow.css') &&
    htmlSource.includes('/dev-auditor-flow.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('auditorFlowReadback') &&
    uiSource.includes('Report/check output only') &&
    uiSource.includes('autoFindingPromotionCount') &&
    cssSource.includes('.auditor-flow') &&
    cssSource.includes('.auditor-flow-summary') &&
    cssSource.includes('.auditor-flow-stage')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_AUDITOR_FLOW_READBACK_SCRIPT_PATH,
    operation: `close ${DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub auditor flow readback',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 49,
    source: 'Steve overnight approval: make sure auditors and health jobs are not just running reports that sit still.',
    summary: 'Added a read-only Dev Hub Auditor Flow panel across scheduled/manual audit jobs, report-only/read-only output posture, review gates, route review pressure, and hygiene pressure.',
    whyItMatters: 'The Dev Hub now answers where audit output goes: audit reports and checks flow to review, while backlog, routes, Scoper, and external notifications require separate approved actions.',
    nextAction: 'Done under dev-hub-auditor-flow-readback-v1. Next safe slice: pick one report-only finding promotion mechanism only after Steve approves the exact mutation boundary.',
    statusNote: `Closed with proof: npm run process:dev-hub-auditor-flow-readback-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live auditor summary: auditors=${readback.summary?.auditorJobCount || 0}, scheduled=${readback.summary?.scheduledAuditorJobs || 0}, reportOnly=${readback.summary?.reportOnlyJobs || 0}, readOnly=${readback.summary?.readOnlyJobs || 0}, autoFindingPromotions=${readback.summary?.autoFindingPromotionCount || 0}, routeReview=${readback.summary?.waitingRouteReviewItems || 0}, hygiene=${readback.summary?.hygieneCleanupPressure || 0}. No audit run, report write, atom, route, backlog, Scoper, Portfolio, Harlan, extraction, model, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-AUDITOR-FLOW-READBACK' }, ACTOR)
}

async function buildLiveReadback() {
  const foundationSnapshot = await getFoundationSnapshot()
  const extractionControl = await getExtractionControlSnapshot({ limit: 200 })
  const foundationDoneBar = buildDevHubFoundationDoneBarFromInputs({
    foundationSnapshot,
    extractionControl,
    sourceContracts: getSourceContracts(),
    generatedAt: new Date().toISOString(),
  })
  const actionRouteReadback = buildDevHubActionRouteReadback({
    generatedAt: new Date().toISOString(),
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    backlogItems: foundationSnapshot.backlogItems || [],
  })
  const scoperEvidenceTraceReadback = buildDevHubScoperEvidenceTraceReadback({
    traceResult: await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 }),
    candidateLimit: 5,
    generatedAt: new Date().toISOString(),
  })
  const sourceFamilyGodModeMaturity = buildSourceFamilyGodModeMaturitySnapshot({ generatedAt: new Date().toISOString() })
  sourceFamilyGodModeMaturity.evaluation = evaluateSourceFamilyGodModeMaturity(sourceFamilyGodModeMaturity)
  const intelligenceHygieneReadback = buildDevHubIntelligenceHygieneReadback({
    generatedAt: new Date().toISOString(),
    foundationDoneBar,
    actionRouteReadback,
    scoperEvidenceTraceReadback,
    sourceFamilyGodModeMaturity,
  })
  return buildDevHubAuditorFlowReadback({
    generatedAt: new Date().toISOString(),
    foundationJobs: foundationSnapshot.foundationJobs || {},
    actionRouteReadback,
    intelligenceHygieneReadback,
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
    readRepoFile(DEV_AUDITOR_FLOW_JS_PATH),
    readRepoFile(DEV_AUDITOR_FLOW_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_AUDITOR_FLOW_READBACK_APPROVAL_PATH,
    cardId: DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubAuditorFlowReadbackDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubAuditorFlowReadback(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_AUDITOR_FLOW_READBACK_CLOSEOUT_KEY) || null

    addCheck(checks, liveCard?.id === DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID, 'live backlog card exists', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_AUDITOR_FLOW_READBACK_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-auditor-flow-readback-check'] === `node --env-file-if-exists=.env ${DEV_HUB_AUDITOR_FLOW_READBACK_SCRIPT_PATH}`, 'package exposes focused Auditor Flow proof', packageJson.scripts?.['process:dev-hub-auditor-flow-readback-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood shows audit output is report/check-gated and rejects automatic finding promotion', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Auditor Flow readback validates', liveValidation.failures.join(', ') || DEV_HUB_AUDITOR_FLOW_READBACK_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'needs_review' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, liveReadback.summary?.autoFindingPromotionCount === 0, 'live readback has zero automatic finding promotion', String(liveReadback.summary?.autoFindingPromotionCount || 0))
    addCheck(checks, liveReadback.summary?.externalWriteCount === 0 && liveReadback.summary?.backlogMutationCount === 0 && liveReadback.summary?.routeMutationCount === 0 && liveReadback.summary?.scoperMutationCount === 0, 'live readback has zero mutation counters', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.scheduledAuditorJobs) >= 1, 'scheduled auditors are visible from Foundation job registry', String(liveReadback.summary?.scheduledAuditorJobs || 0))
    addCheck(checks, count(liveReadback.summary?.reportOnlyJobs) + count(liveReadback.summary?.readOnlyJobs) >= 1, 'report-only/read-only auditor output posture is visible', JSON.stringify({
      reportOnly: liveReadback.summary?.reportOnlyJobs || 0,
      readOnly: liveReadback.summary?.readOnlyJobs || 0,
    }))
    addCheck(checks, list(liveReadback.auditorJobs).length <= 8 && list(liveReadback.downstreamJobs).length <= 4 && list(liveReadback.flowStages).length <= 4 && list(liveReadback.reviewBuckets).length <= 5, 'Auditor Flow rows are bounded', JSON.stringify({
      auditors: list(liveReadback.auditorJobs).length,
      downstream: list(liveReadback.downstreamJobs).length,
      stages: list(liveReadback.flowStages).length,
      buckets: list(liveReadback.reviewBuckets).length,
    }))
    addCheck(checks, list(liveReadback.auditorJobs).every(job => job.findingsMoveAutomatically === false && job.writesBacklogNow === false && job.writesRoutesNow === false && job.writesScoperNow === false && job.sendsExternalNow === false), 'auditor rows do not represent automatic backlog/route/Scoper/external movement', 'all rows gated')
    addCheck(checks, moduleSource.includes('foundationJobs.jobs') && moduleSource.includes(DEV_HUB_AUDITOR_FLOW_READBACK_PLAN_PATH) && moduleSource.includes(DEV_HUB_AUDITOR_FLOW_READBACK_APPROVAL_PATH), 'module declares source registry, plan, and approval paths', `${DEV_HUB_AUDITOR_FLOW_READBACK_PLAN_PATH} + ${DEV_HUB_AUDITOR_FLOW_READBACK_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubAuditorFlowReadback') && devTeamHubSource.includes('auditorFlowReadback'), 'Dev Hub payload includes auditorFlowReadback from existing read models', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Auditor Flow from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Auditor Flow implementation has no audit run, report write, atom, route, backlog, Scoper, external send, extraction, or model write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_AUDITOR_FLOW_READBACK_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID), 'closeout registry contains Auditor Flow closeout', DEV_HUB_AUDITOR_FLOW_READBACK_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID), 'verifier coverage source lists Auditor Flow card', DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID)

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
      cardId: DEV_HUB_AUDITOR_FLOW_READBACK_CARD_ID,
      closeoutKey: DEV_HUB_AUDITOR_FLOW_READBACK_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        reviewBuckets: liveReadback.reviewBuckets,
        stuckSignals: liveReadback.stuckSignals,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Auditor Flow proof: ${result.status}`)
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
  console.error('Dev Hub Auditor Flow proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
