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
  buildDevHubBusinessSourcePipelineTriage,
} from '../lib/dev-hub-business-source-pipeline-triage.js'
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
  buildSourceFamilyGodModeMaturitySnapshot,
  evaluateSourceFamilyGodModeMaturity,
} from '../lib/source-family-god-mode-extractors.js'
import {
  buildDevHubIntelligenceHygieneReadback,
} from '../lib/dev-hub-intelligence-hygiene-readback.js'
import {
  buildDevHubAuditorFlowReadback,
} from '../lib/dev-hub-auditor-flow-readback.js'
import {
  buildDevHubNextRepairQueue,
} from '../lib/dev-hub-next-repair-queue.js'
import {
  DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_APPROVAL_PATH,
  DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID,
  DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY,
  DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CONTRACT_VERSION,
  DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_PLAN_PATH,
  DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_SCRIPT_PATH,
  buildDevHubAuditorPromotionBoundaryPreflight,
  buildDevHubAuditorPromotionBoundaryPreflightDogfoodProof,
  validateDevHubAuditorPromotionBoundaryPreflight,
} from '../lib/dev-hub-auditor-promotion-boundary-preflight.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-auditor-promotion-boundary-preflight.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_AUDITOR_PROMOTION_JS_PATH = 'public/dev-auditor-promotion-boundary-preflight.js'
const DEV_AUDITOR_PROMOTION_CSS_PATH = 'public/dev-auditor-promotion-boundary-preflight.css'
const CLOSEOUT_DATA_PATH = 'data/foundation-build-closeouts/source-youtube-pipeline-records.json'
const COVERAGE_PATH = 'lib/foundation-verify-coverage-card-ids.js'
const TARGET_REPAIR_ID = 'auditor-report-to-work-boundary'
const PROPOSED_GATE_ID = 'auditor-report-to-work-approval-gate-v1'

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
    /\brunNightly/i,
    /\bwriteAudit/i,
    /\bwriteReport/i,
    /\bupsertIntelligenceAtom\s*\(/,
    /\brecordIntelligenceAtomHit\s*\(/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\bsnoozeActionRoute\s*\(/,
    /\brerouteActionRoute\s*\(/,
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bupsertFoundationCurrentSprintOverlay\s*\(/,
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
    /\bpersistSourceCrawlItem\s*\(/,
    /\bupsertSourceCrawlItem\s*\(/,
    /\bwriteFile\s*\(/,
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
  return htmlSource.includes('id="auditor-promotion-boundary-preflight"') &&
    htmlSource.includes('id="auditor-promotion-boundary-preflight-head-stats"') &&
    htmlSource.includes('/dev-auditor-promotion-boundary-preflight.css') &&
    htmlSource.includes('/dev-auditor-promotion-boundary-preflight.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('auditorPromotionBoundaryPreflight') &&
    uiSource.includes('approval_required_internal_write_later') &&
    uiSource.includes('Forbidden') &&
    cssSource.includes('.auditor-promotion-boundary-preflight') &&
    cssSource.includes('.auditor-promotion-summary') &&
    cssSource.includes('.auditor-promotion-contract')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_SCRIPT_PATH,
    operation: `close ${DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub auditor promotion boundary preflight',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 58,
    source: 'Steve overnight approval: keep building safe Dev-Hub intelligence visibility, park approval-bound audit promotion, and prepare exact approval packets.',
    summary: 'Added a read-only Dev Hub Auditor Promotion Boundary preflight that turns report-only auditor output into an exact approval-required internal-write-later contract.',
    whyItMatters: 'The Dev Hub now makes the auditor report-to-work seam explicit without letting scheduled audits silently create cards, mutate routes, run Scoper, or send notifications.',
    nextAction: 'Done under dev-hub-auditor-promotion-boundary-preflight-v1. If Steve approves later, build a separate audit-finding promotion card with exact source report IDs and candidate card IDs.',
    statusNote: `Closed with proof: npm run process:dev-hub-auditor-promotion-boundary-preflight-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live auditor promotion preflight summary: contracts=${readback.summary?.promotionContractCount || 0}, reportLanes=${readback.summary?.reportOnlyOutputLanes || 0}, autoPromote=${readback.summary?.autoFindingPromotionCount || 0}, findingsPromoted=${readback.summary?.findingsPromotedByReadback || 0}, backlogWrites=${readback.summary?.backlogRecordsWrittenByReadback || 0}, routeMutations=${readback.summary?.routeMutationsByReadback || 0}, auditRuns=${readback.summary?.auditRunsStartedByReadback || 0}, reportsWritten=${readback.summary?.reportsWrittenByReadback || 0}, Harlan=${readback.summary?.harlanSendsByReadback || 0}, externalWrites=${readback.summary?.externalWritesByReadback || 0}. No audit run, report write, finding promotion, backlog write, route mutation, Scoper/Portfolio/Current Sprint write, Harlan send, model call, extraction, or external write is performed by this preflight path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-AUDITOR-PROMOTION-BOUNDARY-PREFLIGHT' }, ACTOR)
}

async function buildLiveReadback() {
  const foundationSnapshot = await getFoundationSnapshot()
  const extractionControl = await getExtractionControlSnapshot({ limit: 200 })
  const sourceContracts = getSourceContracts()
  const foundationDoneBar = buildDevHubFoundationDoneBarFromInputs({
    foundationSnapshot,
    extractionControl,
    sourceContracts,
    generatedAt: new Date().toISOString(),
  })
  const businessSourcePipelineTriage = buildDevHubBusinessSourcePipelineTriage({
    generatedAt: new Date().toISOString(),
    foundationDoneBar,
  })
  const actionRouteReadback = buildDevHubActionRouteReadback({
    generatedAt: new Date().toISOString(),
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    backlogItems: foundationSnapshot.backlogItems || [],
  })
  const routeReviewTriage = buildDevHubRouteReviewTriage({
    generatedAt: new Date().toISOString(),
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    backlogItems: foundationSnapshot.backlogItems || [],
  })
  const scoperEvidenceTraceReadback = buildDevHubScoperEvidenceTraceReadback({
    traceResult: await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 }),
    candidateLimit: 5,
    generatedAt: new Date().toISOString(),
  })
  const scoperRuntimeReadback = buildDevHubScoperRuntimeReadback({
    generatedAt: new Date().toISOString(),
    foundationJobs: foundationSnapshot.foundationJobs || {},
    scoperEvidenceTraceReadback,
  })
  const synthesisScopeReadback = buildDevHubSynthesisScopeReadback({
    generatedAt: new Date().toISOString(),
    foundationJobs: foundationSnapshot.foundationJobs || {},
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
  const auditorFlowReadback = buildDevHubAuditorFlowReadback({
    generatedAt: new Date().toISOString(),
    foundationJobs: foundationSnapshot.foundationJobs || {},
    actionRouteReadback,
    intelligenceHygieneReadback,
  })
  const nextRepairQueue = buildDevHubNextRepairQueue({
    generatedAt: new Date().toISOString(),
    foundationDoneBar,
    businessSourcePipelineTriage,
    routeReviewTriage,
    scoperRuntimeReadback,
    synthesisScopeReadback,
    auditorFlowReadback,
    intelligenceHygieneReadback,
  })
  return buildDevHubAuditorPromotionBoundaryPreflight({
    generatedAt: new Date().toISOString(),
    auditorFlowReadback,
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
    readRepoFile(DEV_AUDITOR_PROMOTION_JS_PATH),
    readRepoFile(DEV_AUDITOR_PROMOTION_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_APPROVAL_PATH,
    cardId: DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubAuditorPromotionBoundaryPreflightDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubAuditorPromotionBoundaryPreflight(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'will create on close-card')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-auditor-promotion-boundary-preflight-check'] === `node --env-file-if-exists=.env ${DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_SCRIPT_PATH}`, 'package exposes focused Auditor Promotion Boundary proof', packageJson.scripts?.['process:dev-hub-auditor-promotion-boundary-preflight-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves approval-required promotion gate and rejects finding/backlog promotion', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Auditor Promotion Boundary preflight validates', liveValidation.failures.join(', ') || DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CONTRACT_VERSION)
    addCheck(checks, ['approval_ready', 'no_promotion_contract'].includes(liveReadback.status), 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.auditRunsStartedByReadback) === 0 && count(liveReadback.summary?.reportsWrittenByReadback) === 0, 'live readback starts zero audit/report work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.findingsPromotedByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.routeMutationsByReadback) === 0 && count(liveReadback.summary?.routeAppliesByReadback) === 0, 'live readback performs zero finding/backlog/route writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.currentSprintMutationsByReadback) === 0 && count(liveReadback.summary?.approvalRecordsWrittenByReadback) === 0, 'live readback performs zero destination/control writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero model/extraction/Harlan/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.promotionContracts).length <= 1, 'promotion contract rows are bounded', `${list(liveReadback.promotionContracts).length} contract row(s)`)
    addCheck(checks, list(liveReadback.promotionContracts).every(item => item.gateId === PROPOSED_GATE_ID && item.targetRepairId === TARGET_REPAIR_ID && item.status === 'approval_required' && item.approvalRequired === true && item.mutationPosture === 'approval_required_internal_write_later' && item.promotedNow === false && item.backlogRecordsWrittenNow === false && item.routeMutatedNow === false), 'all promotion contracts stay approval-required and unwritten', list(liveReadback.promotionContracts).map(item => `${item.gateId}:${item.status}:${item.mutationPosture}`).join(', ') || 'none')
    addCheck(checks, count(liveReadback.summary?.reportOnlyOutputLanes) >= 1, 'report-only/read-only auditor lanes are visible from Auditor Flow', String(liveReadback.summary?.reportOnlyOutputLanes || 0))
    addCheck(checks, moduleSource.includes(DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_PLAN_PATH) && moduleSource.includes(DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_PLAN_PATH} + ${DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubAuditorPromotionBoundaryPreflight') && devTeamHubSource.includes('auditorPromotionBoundaryPreflight'), 'Dev Hub payload includes auditorPromotionBoundaryPreflight from existing readbacks', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Auditor Promotion Boundary from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Auditor Promotion Boundary implementation has no audit, report, finding, route, backlog, Scoper, Harlan, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID), 'closeout registry contains Auditor Promotion Boundary closeout', DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID), 'verifier coverage source lists Auditor Promotion Boundary card', DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID)

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
      cardId: DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CARD_ID,
      closeoutKey: DEV_HUB_AUDITOR_PROMOTION_BOUNDARY_PREFLIGHT_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        promotionContracts: list(liveReadback.promotionContracts).map(item => ({
          gateId: item.gateId,
          status: item.status,
          mutationPosture: item.mutationPosture,
          reportOnlyOutputCount: item.reportOnlyOutputCount,
          promotedNow: item.promotedNow,
          backlogRecordsWrittenNow: item.backlogRecordsWrittenNow,
          routeMutatedNow: item.routeMutatedNow,
        })),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Auditor Promotion Boundary preflight proof: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    if (!result.ok) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Dev Hub Auditor Promotion Boundary preflight proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
