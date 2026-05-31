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
  buildDevHubBusinessAtomFlowPreflight,
} from '../lib/dev-hub-business-atom-flow-preflight.js'
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
  DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_APPROVAL_PATH,
  DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID,
  DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CLOSEOUT_KEY,
  DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CONTRACT_VERSION,
  DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_PLAN_PATH,
  DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_SCRIPT_PATH,
  buildDevHubSheetsAtomFlowRepairBlueprint,
  buildDevHubSheetsAtomFlowRepairBlueprintDogfoodProof,
  validateDevHubSheetsAtomFlowRepairBlueprint,
} from '../lib/dev-hub-sheets-atom-flow-repair-blueprint.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-sheets-atom-flow-repair-blueprint.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_BLUEPRINT_JS_PATH = 'public/dev-sheets-atom-flow-repair-blueprint.js'
const DEV_BLUEPRINT_CSS_PATH = 'public/dev-sheets-atom-flow-repair-blueprint.css'
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
    /\b(readGoogleSheet|readSheet|sheets\.spreadsheets|runConnectorProbe|startConnectorProbe|connectorProbe\s*\()/i,
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
  return htmlSource.includes('id="sheets-atom-flow-blueprint"') &&
    htmlSource.includes('id="sheets-atom-flow-blueprint-head-stats"') &&
    htmlSource.includes('/dev-sheets-atom-flow-repair-blueprint.css') &&
    htmlSource.includes('/dev-sheets-atom-flow-repair-blueprint.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('sheetsAtomFlowRepairBlueprint') &&
    uiSource.includes('Sheets atom-flow repair blueprint') &&
    uiSource.includes('atomRowsWrittenByReadback') &&
    cssSource.includes('.sheets-atom-flow-blueprint') &&
    cssSource.includes('.sheets-blueprint-summary') &&
    cssSource.includes('.sheets-blueprint-row')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_SCRIPT_PATH,
    operation: `close ${DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub Sheets atom-flow repair blueprint',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 60,
    source: 'Steve overnight approval: keep building safe Dev-Hub intelligence visibility while parking approval-bound source reads and atom/fact writes.',
    summary: 'Added a read-only Dev Hub Sheets Atom Flow Repair Blueprint that turns atom-flow preflight rows into exact source-contract repair rows and approval gates.',
    whyItMatters: 'The Dev Hub can now move from generic stale Sheets/Owners atom-flow candidates to an executable repair blueprint without reading Google Sheets, creating cards, writing atoms/facts, refreshing synthesis, or mutating routes.',
    nextAction: 'Done under dev-hub-sheets-atom-flow-repair-blueprint-v1. Next safe slice: either create another read-only operator packet or, with Steve approval, perform one bounded source-flow repair for a single exact source ID.',
    statusNote: `Closed with proof: npm run process:dev-hub-sheets-atom-flow-repair-blueprint-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live blueprint summary: sources=${readback.summary?.blueprintSourceCount || 0}, contracts=${readback.summary?.sourceContractMatchedCount || 0}, ready=${readback.summary?.readyBlueprintCount || 0}, approvalBound=${readback.summary?.approvalBoundBlueprintCount || 0}, cardsCreated=${readback.summary?.suggestedRepairCardsCreatedByReadback || 0}, sheetReads=${readback.summary?.sheetReadsStarted || 0}, atomWrites=${readback.summary?.atomRowsWrittenByReadback || 0}, sourceSyncs=${readback.summary?.sourceSyncsStarted || 0}, modelCalls=${readback.summary?.modelCallsStarted || 0}, externalWrites=${readback.summary?.externalWritesByReadback || 0}. All blueprint rows remain proposal-only and no backlog, Scoper, Portfolio, Current Sprint, approval, route, atom, fact, synthesis, extraction, connector, source sync, sheet read, Harlan, model, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-SHEETS-ATOM-FLOW-REPAIR-BLUEPRINT' }, ACTOR)
}

async function buildLiveReadback() {
  const generatedAt = new Date().toISOString()
  const foundationSnapshot = await getFoundationSnapshot()
  const extractionControl = await getExtractionControlSnapshot({ limit: 200 })
  const sourceContracts = getSourceContracts()
  const foundationDoneBar = buildDevHubFoundationDoneBarFromInputs({
    foundationSnapshot,
    extractionControl,
    sourceContracts,
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
  const businessAtomFlowPreflight = buildDevHubBusinessAtomFlowPreflight({
    generatedAt,
    businessSourcePipelineTriage,
    nextRepairQueue,
  })
  return buildDevHubSheetsAtomFlowRepairBlueprint({
    generatedAt,
    businessAtomFlowPreflight,
    sourceContracts,
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
    readRepoFile(DEV_BLUEPRINT_JS_PATH),
    readRepoFile(DEV_BLUEPRINT_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_APPROVAL_PATH,
    cardId: DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubSheetsAtomFlowRepairBlueprintDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubSheetsAtomFlowRepairBlueprint(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-sheets-atom-flow-repair-blueprint-check'] === `node --env-file-if-exists=.env ${DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_SCRIPT_PATH}`, 'package exposes focused Sheets Atom Flow Blueprint proof', packageJson.scripts?.['process:dev-hub-sheets-atom-flow-repair-blueprint-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves exact source-contract blueprint and rejects card creation, source reads, or intelligence writes', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Sheets Atom Flow Blueprint validates', liveValidation.failures.join(', ') || DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'blueprint_ready' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.blueprintSourceCount) >= 1, 'live readback exposes Sheets source blueprint rows', `${liveReadback.summary?.blueprintSourceCount || 0} rows`)
    addCheck(checks, count(liveReadback.summary?.sourceContractMatchedCount) === count(liveReadback.summary?.blueprintSourceCount), 'all live blueprint rows have exact source-contract matches', `${liveReadback.summary?.sourceContractMatchedCount || 0}/${liveReadback.summary?.blueprintSourceCount || 0}`)
    addCheck(checks, list(liveReadback.blueprintRows).every(item => item.status === 'proposal_only' && item.autoCreated === false && item.autoPromoted === false && item.appliedNow === false), 'all live blueprint rows remain proposal-only', list(liveReadback.blueprintRows).map(item => `${item.rank}:${item.sourceId}:${item.status}`).join(', '))
    addCheck(checks, count(liveReadback.summary?.suggestedRepairCardsCreatedByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0, 'live readback creates zero cards or destination records', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routeMutationsByReadback) === 0 && count(liveReadback.summary?.actionRoutesProposedByReadback) === 0 && count(liveReadback.summary?.atomRowsWrittenByReadback) === 0 && count(liveReadback.summary?.factRowsWrittenByReadback) === 0 && count(liveReadback.summary?.synthesisRowsWrittenByReadback) === 0, 'live readback writes zero route or intelligence rows', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.sheetReadsStarted) === 0 && count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0 && count(liveReadback.summary?.sourceSyncsStarted) === 0 && count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero source/runtime/model/Harlan/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.blueprintRows).length <= 6 && list(liveReadback.blueprintGates).length <= 6, 'Sheets Atom Flow Blueprint rows are bounded', JSON.stringify({
      rows: list(liveReadback.blueprintRows).length,
      gates: list(liveReadback.blueprintGates).length,
    }))
    addCheck(checks, moduleSource.includes(DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_PLAN_PATH) && moduleSource.includes(DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_PLAN_PATH} + ${DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubSheetsAtomFlowRepairBlueprint') && devTeamHubSource.includes('sheetsAtomFlowRepairBlueprint'), 'Dev Hub payload includes sheetsAtomFlowRepairBlueprint from existing readbacks', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Sheets Atom Flow Blueprint from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Sheets Atom Flow Blueprint implementation has no card, Scoper, Portfolio, Current Sprint, approval, route, atom, fact, synthesis, sheet read, extraction, connector, source sync, Harlan, model, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID), 'closeout registry contains Sheets Atom Flow Blueprint closeout', DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID), 'verifier coverage source lists Sheets Atom Flow Blueprint card', DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID)

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
      cardId: DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CARD_ID,
      closeoutKey: DEV_HUB_SHEETS_ATOM_FLOW_REPAIR_BLUEPRINT_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        blueprintRows: list(liveReadback.blueprintRows).map(item => ({
          rank: item.rank,
          sourceId: item.sourceId,
          title: item.title,
          sourceContractPresent: item.sourceContractPresent,
          readyForBlueprint: item.readyForBlueprint,
          status: item.status,
        })),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Sheets Atom Flow Blueprint proof: ${result.status}`)
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
  console.error('Dev Hub Sheets Atom Flow Blueprint proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
