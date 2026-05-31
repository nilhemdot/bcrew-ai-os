#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
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
  DEV_HUB_BUILD_PORTFOLIO_READBACK_APPROVAL_PATH,
  DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID,
  DEV_HUB_BUILD_PORTFOLIO_READBACK_CLOSEOUT_KEY,
  DEV_HUB_BUILD_PORTFOLIO_READBACK_CONTRACT_VERSION,
  DEV_HUB_BUILD_PORTFOLIO_READBACK_PLAN_PATH,
  DEV_HUB_BUILD_PORTFOLIO_READBACK_SCRIPT_PATH,
  buildDevHubBuildPortfolioReadback,
  buildDevHubBuildPortfolioReadbackDogfoodProof,
  validateDevHubBuildPortfolioReadback,
} from '../lib/dev-hub-build-portfolio-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-build-portfolio-readback.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_PORTFOLIO_JS_PATH = 'public/dev-build-portfolio-readback.js'
const DEV_PORTFOLIO_CSS_PATH = 'public/dev-build-portfolio-readback.css'
const CLOSEOUT_DATA_PATH = 'data/foundation-build-closeouts/action-route-records.json'
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

function sourceHasNoLivePromotion(source = '') {
  const blocked = [
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\bsnoozeActionRoute\s*\(/,
    /\brerouteActionRoute\s*\(/,
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bupsertFoundationCurrentSprintOverlay\s*\(/,
    /\bcreateScoper/i,
    /\bupsertScoper/i,
    /\bcreatePortfolio/i,
    /\bupsertPortfolio/i,
    /\bsendTelegramMessage\s*\(/,
    /\bsendMail\s*\(/,
    /\bsendEmail\s*\(/,
    /\bfetch\s*\([^)]*,\s*\{[\s\S]*?method:\s*['"]POST['"]/,
    /\bcallLlm\s*\(/,
    /\brunYoutube/i,
    /\brunGovernedSynthesis\s*\(/,
    /\bproposeActionRoutes\s*\(/,
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
  return htmlSource.includes('id="build-portfolio-readback"') &&
    htmlSource.includes('id="build-portfolio-readback-head-stats"') &&
    htmlSource.includes('/dev-build-portfolio-readback.css') &&
    htmlSource.includes('/dev-build-portfolio-readback.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('buildPortfolioReadback') &&
    uiSource.includes('Build Portfolio Readback') &&
    uiSource.includes('Proposal-only portfolio') &&
    cssSource.includes('.build-portfolio-readback') &&
    cssSource.includes('.build-portfolio-summary') &&
    cssSource.includes('.build-portfolio-group')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_BUILD_PORTFOLIO_READBACK_SCRIPT_PATH,
    operation: `close ${DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub Build Portfolio readback',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 64,
    source: 'Steve overnight approval: continue safe Dev-Hub intelligence cleanup while parking build promotion and live writes without exact approval.',
    summary: 'Added a read-only Dev Hub Build Portfolio Readback that ranks and merges Scoper-ready source-traced build candidates into proposal-only groups.',
    whyItMatters: 'The Dev Hub now shows the final pre-approval build recommendation layer: which source-backed scoped candidates merge into stronger opportunities and which recommendations stay parked for Scoper repair.',
    nextAction: 'Done under dev-hub-build-portfolio-readback-v1. Next safe slice: prepare a read-only morning proposed-cards packet, or wait for Steve to approve an exact build card promotion.',
    statusNote: `Closed with proof: npm run process:dev-hub-build-portfolio-readback-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live portfolio summary: groups=${readback.summary?.portfolioGroupCount || 0}, merged=${readback.summary?.mergedGroupCount || 0}, ready=${readback.summary?.readyScopedCandidateCount || 0}, parked=${readback.summary?.parkedForScoperCount || 0}, autoPromoted=${readback.summary?.autoPromotedGroupCount || 0}, backlogWrites=${readback.summary?.backlogRecordsWrittenByReadback || 0}, scoperWrites=${readback.summary?.scoperRecordsWrittenByReadback || 0}, portfolioWrites=${readback.summary?.portfolioRecordsPersistedByReadback || 0}, harlanSends=${readback.summary?.harlanSendsByReadback || 0}. Every group remains proposal-only and no backlog, Scoper, Portfolio, Current Sprint, approval, route, destination, Harlan, extraction, connector, browser, model, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-BUILD-PORTFOLIO-READBACK' }, ACTOR)
}

async function buildLiveReadback() {
  const traceResult = await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })
  return buildDevHubBuildPortfolioReadback({
    generatedAt: new Date().toISOString(),
    traceResult,
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
    readRepoFile(DEV_PORTFOLIO_JS_PATH),
    readRepoFile(DEV_PORTFOLIO_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_BUILD_PORTFOLIO_READBACK_APPROVAL_PATH,
    cardId: DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubBuildPortfolioReadbackDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubBuildPortfolioReadback(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_BUILD_PORTFOLIO_READBACK_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_BUILD_PORTFOLIO_READBACK_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-build-portfolio-readback-check'] === `node --env-file-if-exists=.env ${DEV_HUB_BUILD_PORTFOLIO_READBACK_SCRIPT_PATH}`, 'package exposes focused Build Portfolio Readback proof', packageJson.scripts?.['process:dev-hub-build-portfolio-readback-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves merge, parked Scoper repair, proposal-only boundary, and no writes', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Build Portfolio Readback validates', liveValidation.failures.join(', ') || DEV_HUB_BUILD_PORTFOLIO_READBACK_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'portfolio_ready', 'live readback returns portfolio-ready status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.readyScopedCandidateCount) >= 1, 'live readback exposes Scoper-ready source-traced candidates', `${liveReadback.summary?.readyScopedCandidateCount || 0} ready`)
    addCheck(checks, count(liveReadback.summary?.portfolioGroupCount) >= 1, 'live readback exposes ranked portfolio groups', `${liveReadback.summary?.portfolioGroupCount || 0} groups`)
    addCheck(checks, count(liveReadback.summary?.proposalOnlyGroupCount) === count(liveReadback.summary?.portfolioGroupCount), 'all live portfolio groups are proposal-only', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.autoPromotedGroupCount) === 0, 'live portfolio readback has zero auto-promotions', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.sourceLineageRefCount) >= 1, 'live portfolio groups preserve source lineage', `${liveReadback.summary?.sourceLineageRefCount || 0} refs`)
    addCheck(checks, list(liveReadback.groups).length <= 8 && list(liveReadback.candidateRows).length <= 10, 'Build Portfolio payload is bounded', JSON.stringify({
      groups: list(liveReadback.groups).length,
      candidates: list(liveReadback.candidateRows).length,
    }))
    addCheck(checks, list(liveReadback.groups).every(group => group.proposalOnly === true && group.approvalRequired === true && group.sourceLineageCount >= 1 && group.promotionBoundary), 'every live portfolio group is approval-bound with source proof', list(liveReadback.groups).map(group => `#${group.portfolioRank}:${group.decision}:${group.sourceLineageCount}`).join(', '))
    addCheck(checks, list(liveReadback.candidateRows).every(candidate => candidate.readyForPortfolio === true && candidate.rawAtomId && candidate.rawHitId && candidate.portfolioGroupId), 'every live portfolio input row carries raw atom/hit proof and a group', list(liveReadback.candidateRows).map(candidate => `#${candidate.rank}:${candidate.title}`).join(' | '))
    addCheck(checks, count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsPersistedByReadback) === 0 && count(liveReadback.summary?.currentSprintMutationsByReadback) === 0 && count(liveReadback.summary?.approvalRecordsWrittenByReadback) === 0, 'live readback performs zero backlog/Scoper/Portfolio/sprint/approval writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routeRecordsMutatedByReadback) === 0 && count(liveReadback.summary?.destinationRecordsMutatedByReadback) === 0, 'live readback performs zero route or destination mutations', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0 && count(liveReadback.summary?.browserSessionsStarted) === 0 && count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero Harlan/source/browser/model/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, moduleSource.includes(DEV_HUB_BUILD_PORTFOLIO_READBACK_PLAN_PATH) && moduleSource.includes(DEV_HUB_BUILD_PORTFOLIO_READBACK_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_BUILD_PORTFOLIO_READBACK_PLAN_PATH} + ${DEV_HUB_BUILD_PORTFOLIO_READBACK_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubBuildPortfolioReadback') && devTeamHubSource.includes('buildPortfolioReadback'), 'Dev Hub payload includes buildPortfolioReadback from Scoper trace result', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Build Portfolio Readback from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLivePromotion(`${moduleSource}\n${uiSource}`), 'Build Portfolio Readback implementation has no backlog, Scoper, Portfolio, Harlan, route, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_BUILD_PORTFOLIO_READBACK_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID), 'closeout registry contains Build Portfolio Readback closeout', DEV_HUB_BUILD_PORTFOLIO_READBACK_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID), 'verifier coverage source lists Build Portfolio Readback card', DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID)

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
      cardId: DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID,
      closeoutKey: DEV_HUB_BUILD_PORTFOLIO_READBACK_CLOSEOUT_KEY,
      checks,
      failures: failed,
      closedCard,
      dogfood: {
        ok: dogfood.ok,
        invariant: dogfood.invariant,
        unsafeFailures: dogfood.unsafeValidation.failures,
      },
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        groups: list(liveReadback.groups).map(group => ({
          portfolioRank: group.portfolioRank,
          portfolioScore: group.portfolioScore,
          decision: group.decision,
          lane: group.lane,
          title: group.title,
          candidateCount: group.candidateCount,
          sourceLineageCount: group.sourceLineageCount,
        })),
        candidateRows: list(liveReadback.candidateRows).map(candidate => ({
          rank: candidate.rank,
          title: candidate.title,
          sourceTraceStatus: candidate.sourceTraceStatus,
          scoperStatus: candidate.scoperStatus,
          rawAtomId: candidate.rawAtomId,
          rawHitId: candidate.rawHitId,
          portfolioGroupId: candidate.portfolioGroupId,
        })),
      },
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log('Dev Hub Build Portfolio Readback check')
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
      console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }

    if (failed.length) process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})

