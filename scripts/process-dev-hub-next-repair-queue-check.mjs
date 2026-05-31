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
  buildSourceFamilyGodModeMaturitySnapshot,
  evaluateSourceFamilyGodModeMaturity,
} from '../lib/source-family-god-mode-extractors.js'
import {
  buildDevHubActionRouteReadback,
} from '../lib/dev-hub-action-route-readback.js'
import {
  buildDevHubAuditorFlowReadback,
} from '../lib/dev-hub-auditor-flow-readback.js'
import {
  buildDevHubBusinessSourcePipelineTriage,
} from '../lib/dev-hub-business-source-pipeline-triage.js'
import {
  buildDevHubFoundationDoneBarFromInputs,
} from '../lib/dev-hub-foundation-done-bar.js'
import {
  buildDevHubIntelligenceHygieneReadback,
} from '../lib/dev-hub-intelligence-hygiene-readback.js'
import {
  buildDevHubRouteReviewTriage,
} from '../lib/dev-hub-route-review-triage.js'
import {
  buildDevHubScoperEvidenceTraceReadback,
} from '../lib/dev-hub-scoper-evidence-trace-readback.js'
import {
  buildDevHubScoperRuntimeReadback,
} from '../lib/dev-hub-scoper-runtime-readback.js'
import {
  buildDevHubSynthesisScopeReadback,
} from '../lib/dev-hub-synthesis-scope-readback.js'
import {
  DEV_HUB_NEXT_REPAIR_QUEUE_APPROVAL_PATH,
  DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID,
  DEV_HUB_NEXT_REPAIR_QUEUE_CLOSEOUT_KEY,
  DEV_HUB_NEXT_REPAIR_QUEUE_CONTRACT_VERSION,
  DEV_HUB_NEXT_REPAIR_QUEUE_PLAN_PATH,
  DEV_HUB_NEXT_REPAIR_QUEUE_SCRIPT_PATH,
  buildDevHubNextRepairQueue,
  buildDevHubNextRepairQueueDogfoodProof,
  validateDevHubNextRepairQueue,
} from '../lib/dev-hub-next-repair-queue.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-next-repair-queue.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_NEXT_REPAIR_JS_PATH = 'public/dev-next-repair-queue.js'
const DEV_NEXT_REPAIR_CSS_PATH = 'public/dev-next-repair-queue.css'
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
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bupsertFoundationCurrentSprintOverlay\s*\(/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\bsnoozeActionRoute\s*\(/,
    /\brerouteActionRoute\s*\(/,
    /\bproposeActionRoutes\s*\(/,
    /\bupsertIntelligenceAtom\s*\(/,
    /\brecordIntelligenceAtomHit\s*\(/,
    /\brunGovernedSynthesis\s*\(/,
    /\bcreateScoper/i,
    /\bupsertScoper/i,
    /\bcreatePortfolio/i,
    /\bupsertPortfolio/i,
    /\b(runConnectorProbe|startConnectorProbe|connectorProbe\s*\()/i,
    /\brun.*(Fub|FUB|ClickUp|Sheets|Drive|SourceSync|Extraction)/,
    /\bsendTelegramMessage\s*\(/,
    /\bsendMail\s*\(/,
    /\bsendEmail\s*\(/,
    /\bfetch\s*\([^)]*,\s*\{[\s\S]*?method:\s*['"]POST['"]/,
    /\bcallLlm\s*\(/,
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
  return htmlSource.includes('id="next-repair-queue"') &&
    htmlSource.includes('id="next-repair-head-stats"') &&
    htmlSource.includes('/dev-next-repair-queue.css') &&
    htmlSource.includes('/dev-next-repair-queue.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('nextRepairQueue') &&
    uiSource.includes('Proposal-only repair queue') &&
    uiSource.includes('cardsCreatedByReadback') &&
    cssSource.includes('.next-repair-queue') &&
    cssSource.includes('.next-repair-summary') &&
    cssSource.includes('.next-repair-card')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_NEXT_REPAIR_QUEUE_SCRIPT_PATH,
    operation: `close ${DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub next repair queue',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 58,
    source: 'Steve overnight approval: let the Dev Hub recommend the next safe repairs while parking approval-bound mutation work.',
    summary: 'Added a read-only Dev Hub Next Repair Queue that ranks proposal-only repair rows across business source flow, route review, Scoper runtime, synthesis scope, auditor flow, and hygiene pressure.',
    whyItMatters: 'The Dev Hub now tells the builder what to do next from live pipe evidence without creating cards, promoting Scoper work, applying routes, or auto-building.',
    nextAction: 'Done under dev-hub-next-repair-queue-v1. Next safe slice: choose one proposed repair and build it as a separate approved card; keep extraction, connector sync, Scoper scheduling, route apply, and model-backed synthesis approval-bound.',
    statusNote: `Closed with proof: npm run process:dev-hub-next-repair-queue-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live next-repair summary: proposals=${readback.summary?.proposedRepairCount || 0}, approvalBound=${readback.summary?.approvalBoundCount || 0}, internalWriteRequired=${readback.summary?.internalWriteRequiredCount || 0}, cardsCreated=${readback.summary?.cardsCreatedByReadback || 0}, routeMutations=${readback.summary?.routeMutationsByReadback || 0}, atomWrites=${readback.summary?.atomRowsWrittenByReadback || 0}, modelCalls=${readback.summary?.modelCallsStarted || 0}, externalWrites=${readback.summary?.externalWritesByReadback || 0}. All rows remain proposal-only and no backlog, Scoper, Portfolio, Current Sprint, route, atom, fact, synthesis, extraction, connector, Harlan, model, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-NEXT-REPAIR-QUEUE' }, ACTOR)
}

async function buildLiveReadback() {
  const generatedAt = new Date().toISOString()
  const foundationSnapshot = await getFoundationSnapshot()
  const extractionControl = await getExtractionControlSnapshot({ limit: 200 })
  const foundationDoneBar = buildDevHubFoundationDoneBarFromInputs({
    foundationSnapshot,
    extractionControl,
    sourceContracts: getSourceContracts(),
    generatedAt,
  })
  const actionRouteReadback = buildDevHubActionRouteReadback({
    generatedAt,
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    backlogItems: foundationSnapshot.backlogItems || [],
  })
  const routeReviewTriage = buildDevHubRouteReviewTriage({
    generatedAt,
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    backlogItems: foundationSnapshot.backlogItems || [],
  })
  const businessSourcePipelineTriage = buildDevHubBusinessSourcePipelineTriage({
    generatedAt,
    foundationDoneBar,
  })
  const traceResult = await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })
  const scoperEvidenceTraceReadback = buildDevHubScoperEvidenceTraceReadback({
    generatedAt,
    traceResult,
    candidateLimit: 5,
  })
  const scoperRuntimeReadback = buildDevHubScoperRuntimeReadback({
    generatedAt,
    foundationJobs: foundationSnapshot.foundationJobs || {},
    scoperEvidenceTraceReadback,
  })
  const synthesisScopeReadback = buildDevHubSynthesisScopeReadback({
    generatedAt,
    foundationJobs: foundationSnapshot.foundationJobs || {},
  })
  const sourceFamilyGodModeMaturity = buildSourceFamilyGodModeMaturitySnapshot({ generatedAt })
  sourceFamilyGodModeMaturity.evaluation = evaluateSourceFamilyGodModeMaturity(sourceFamilyGodModeMaturity)
  const intelligenceHygieneReadback = buildDevHubIntelligenceHygieneReadback({
    generatedAt,
    foundationDoneBar,
    actionRouteReadback,
    scoperEvidenceTraceReadback,
    sourceFamilyGodModeMaturity,
  })
  const auditorFlowReadback = buildDevHubAuditorFlowReadback({
    generatedAt,
    foundationJobs: foundationSnapshot.foundationJobs || {},
    actionRouteReadback,
    intelligenceHygieneReadback,
  })
  return buildDevHubNextRepairQueue({
    generatedAt,
    foundationDoneBar,
    businessSourcePipelineTriage,
    routeReviewTriage,
    scoperRuntimeReadback,
    synthesisScopeReadback,
    auditorFlowReadback,
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
    readRepoFile(DEV_NEXT_REPAIR_JS_PATH),
    readRepoFile(DEV_NEXT_REPAIR_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_NEXT_REPAIR_QUEUE_APPROVAL_PATH,
    cardId: DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubNextRepairQueueDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubNextRepairQueue(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_NEXT_REPAIR_QUEUE_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_NEXT_REPAIR_QUEUE_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-next-repair-queue-check'] === `node --env-file-if-exists=.env ${DEV_HUB_NEXT_REPAIR_QUEUE_SCRIPT_PATH}`, 'package exposes focused Next Repair Queue proof', packageJson.scripts?.['process:dev-hub-next-repair-queue-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves proposal-only queue and rejects auto-created cards or mutation', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Next Repair Queue validates', liveValidation.failures.join(', ') || DEV_HUB_NEXT_REPAIR_QUEUE_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'proposal_ready' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.proposedRepairCount) >= 3, 'live readback proposes next repairs from existing panels', `${liveReadback.summary?.proposedRepairCount || 0} proposals`)
    addCheck(checks, list(liveReadback.proposedRepairs).every(item => item.status === 'proposal_only' && item.autoCreated === false && item.autoPromoted === false && item.appliedNow === false), 'all live repairs remain proposal-only', list(liveReadback.proposedRepairs).map(item => `${item.rank}:${item.repairId}:${item.status}`).join(', '))
    addCheck(checks, count(liveReadback.summary?.cardsCreatedByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0, 'live readback creates zero cards or destination records', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routeMutationsByReadback) === 0 && count(liveReadback.summary?.atomRowsWrittenByReadback) === 0 && count(liveReadback.summary?.factRowsWrittenByReadback) === 0 && count(liveReadback.summary?.synthesisRowsWrittenByReadback) === 0, 'live readback writes zero route or intelligence rows', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0 && count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero runtime/model/Harlan/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.proposedRepairs).length <= 6 && list(liveReadback.queues?.approvalBound).length <= 6 && list(liveReadback.queues?.sourceFlow).length <= 4 && list(liveReadback.queues?.routeAndRuntime).length <= 4, 'Next Repair Queue rows are bounded', JSON.stringify({
      proposals: list(liveReadback.proposedRepairs).length,
      approvalBound: list(liveReadback.queues?.approvalBound).length,
      sourceFlow: list(liveReadback.queues?.sourceFlow).length,
      routeAndRuntime: list(liveReadback.queues?.routeAndRuntime).length,
    }))
    addCheck(checks, moduleSource.includes(DEV_HUB_NEXT_REPAIR_QUEUE_PLAN_PATH) && moduleSource.includes(DEV_HUB_NEXT_REPAIR_QUEUE_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_NEXT_REPAIR_QUEUE_PLAN_PATH} + ${DEV_HUB_NEXT_REPAIR_QUEUE_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubNextRepairQueue') && devTeamHubSource.includes('nextRepairQueue'), 'Dev Hub payload includes nextRepairQueue from existing readbacks', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Next Repair Queue from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Next Repair Queue implementation has no card, Scoper, Portfolio, Current Sprint, route, atom, fact, synthesis, extraction, connector, Harlan, model, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_NEXT_REPAIR_QUEUE_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID), 'closeout registry contains Next Repair Queue closeout', DEV_HUB_NEXT_REPAIR_QUEUE_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID), 'verifier coverage source lists Next Repair Queue card', DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID)

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
      cardId: DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID,
      closeoutKey: DEV_HUB_NEXT_REPAIR_QUEUE_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        proposals: list(liveReadback.proposedRepairs).map(item => ({
          rank: item.rank,
          repairId: item.repairId,
          title: item.title,
          suggestedCardType: item.suggestedCardType,
          status: item.status,
        })),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Next Repair Queue proof: ${result.status}`)
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
  console.error('Dev Hub Next Repair Queue proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
