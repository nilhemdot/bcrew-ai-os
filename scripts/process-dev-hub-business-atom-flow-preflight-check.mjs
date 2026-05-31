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
  buildDevHubNextRepairQueue,
} from '../lib/dev-hub-next-repair-queue.js'
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
  DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_APPROVAL_PATH,
  DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID,
  DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CLOSEOUT_KEY,
  DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CONTRACT_VERSION,
  DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_PLAN_PATH,
  DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_SCRIPT_PATH,
  buildDevHubBusinessAtomFlowPreflight,
  buildDevHubBusinessAtomFlowPreflightDogfoodProof,
  validateDevHubBusinessAtomFlowPreflight,
} from '../lib/dev-hub-business-atom-flow-preflight.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-business-atom-flow-preflight.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_PREFLIGHT_JS_PATH = 'public/dev-business-atom-flow-preflight.js'
const DEV_PREFLIGHT_CSS_PATH = 'public/dev-business-atom-flow-preflight.css'
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
  return htmlSource.includes('id="business-atom-flow-preflight"') &&
    htmlSource.includes('id="business-atom-flow-preflight-head-stats"') &&
    htmlSource.includes('/dev-business-atom-flow-preflight.css') &&
    htmlSource.includes('/dev-business-atom-flow-preflight.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('businessAtomFlowPreflight') &&
    uiSource.includes('Read-only atom-flow repair preflight') &&
    uiSource.includes('atomRowsWrittenByReadback') &&
    cssSource.includes('.business-atom-flow-preflight') &&
    cssSource.includes('.atom-flow-summary') &&
    cssSource.includes('.atom-flow-candidate')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_SCRIPT_PATH,
    operation: `close ${DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub business atom-flow preflight',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 59,
    source: 'Steve overnight approval: keep building safe Dev-Hub intelligence visibility while parking approval-bound atom/fact writes.',
    summary: 'Added a read-only Dev Hub Business Atom Flow Preflight that turns the top business-source atom-flow repair proposal into exact candidate source IDs, gates, and operator boundaries.',
    whyItMatters: 'The Dev Hub can now move from a generic stale business-source warning to a concrete repair packet without starting source sync, extraction, atom writes, synthesis, route mutation, or auto-build behavior.',
    nextAction: 'Done under dev-hub-business-atom-flow-preflight-v1. Next safe slice: either build a route-review operator packet, or create a separate approval-bound source-flow repair card for one candidate family before any atom/fact writes.',
    statusNote: `Closed with proof: npm run process:dev-hub-business-atom-flow-preflight-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live atom-flow preflight summary: target=${readback.summary?.targetFamilyLabel || 'none'}, candidates=${readback.summary?.candidateSourceCount || 0}, ready=${readback.summary?.readyForRepairCardCount || 0}, approvalBound=${readback.summary?.approvalBoundCandidateCount || 0}, cardsCreated=${readback.summary?.cardsCreatedByReadback || 0}, atomWrites=${readback.summary?.atomRowsWrittenByReadback || 0}, sourceSyncs=${readback.summary?.sourceSyncsStarted || 0}, modelCalls=${readback.summary?.modelCallsStarted || 0}, externalWrites=${readback.summary?.externalWritesByReadback || 0}. All candidates remain proposal-only and no backlog, Scoper, Portfolio, Current Sprint, route, atom, fact, synthesis, extraction, connector, source sync, Harlan, model, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-BUSINESS-ATOM-FLOW-PREFLIGHT' }, ACTOR)
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
  const nextRepairQueue = buildDevHubNextRepairQueue({
    generatedAt,
    foundationDoneBar,
    businessSourcePipelineTriage,
    routeReviewTriage,
    scoperRuntimeReadback,
    synthesisScopeReadback,
    auditorFlowReadback,
    intelligenceHygieneReadback,
  })
  return buildDevHubBusinessAtomFlowPreflight({
    generatedAt,
    businessSourcePipelineTriage,
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
    readRepoFile(DEV_PREFLIGHT_JS_PATH),
    readRepoFile(DEV_PREFLIGHT_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_APPROVAL_PATH,
    cardId: DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubBusinessAtomFlowPreflightDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubBusinessAtomFlowPreflight(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-business-atom-flow-preflight-check'] === `node --env-file-if-exists=.env ${DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_SCRIPT_PATH}`, 'package exposes focused Business Atom Flow Preflight proof', packageJson.scripts?.['process:dev-hub-business-atom-flow-preflight-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves candidate preflight and rejects card creation or intelligence writes', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Business Atom Flow Preflight validates', liveValidation.failures.join(', ') || DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'preflight_ready' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.targetRepairProposalVisible) === 1 || liveReadback.status === 'healthy' || liveReadback.summary?.targetRepairProposalVisible === true, 'live readback is tied to the business atom-flow repair proposal', liveReadback.summary?.targetRepairId || 'missing')
    addCheck(checks, count(liveReadback.summary?.candidateSourceCount) >= 1, 'live readback exposes candidate source rows', `${liveReadback.summary?.candidateSourceCount || 0} candidates`)
    addCheck(checks, list(liveReadback.candidates).every(item => item.status === 'proposal_only' && item.autoCreated === false && item.autoPromoted === false && item.appliedNow === false), 'all live candidates remain proposal-only', list(liveReadback.candidates).map(item => `${item.rank}:${item.sourceId}:${item.status}`).join(', '))
    addCheck(checks, count(liveReadback.summary?.cardsCreatedByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0, 'live readback creates zero cards or destination records', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routeMutationsByReadback) === 0 && count(liveReadback.summary?.atomRowsWrittenByReadback) === 0 && count(liveReadback.summary?.factRowsWrittenByReadback) === 0 && count(liveReadback.summary?.synthesisRowsWrittenByReadback) === 0, 'live readback writes zero route or intelligence rows', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0 && count(liveReadback.summary?.sourceSyncsStarted) === 0 && count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero source/runtime/model/Harlan/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.candidates).length <= 6 && list(liveReadback.repairGates).length <= 6, 'Business Atom Flow Preflight rows are bounded', JSON.stringify({
      candidates: list(liveReadback.candidates).length,
      gates: list(liveReadback.repairGates).length,
    }))
    addCheck(checks, moduleSource.includes(DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_PLAN_PATH) && moduleSource.includes(DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_PLAN_PATH} + ${DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubBusinessAtomFlowPreflight') && devTeamHubSource.includes('businessAtomFlowPreflight'), 'Dev Hub payload includes businessAtomFlowPreflight from existing readbacks', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Business Atom Flow Preflight from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Business Atom Flow Preflight implementation has no card, Scoper, Portfolio, Current Sprint, route, atom, fact, synthesis, extraction, connector, source sync, Harlan, model, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID), 'closeout registry contains Business Atom Flow Preflight closeout', DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID), 'verifier coverage source lists Business Atom Flow Preflight card', DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID)

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
      cardId: DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CARD_ID,
      closeoutKey: DEV_HUB_BUSINESS_ATOM_FLOW_PREFLIGHT_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        candidates: list(liveReadback.candidates).map(item => ({
          rank: item.rank,
          sourceId: item.sourceId,
          title: item.title,
          businessStatus: item.businessStatus,
          readyForRepairCard: item.readyForRepairCard,
          status: item.status,
        })),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Business Atom Flow Preflight proof: ${result.status}`)
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
  console.error('Dev Hub Business Atom Flow Preflight proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
