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
  buildDevHubBuildPortfolioReadback,
} from '../lib/dev-hub-build-portfolio-readback.js'
import {
  DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_APPROVAL_PATH,
  DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID,
  DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CLOSEOUT_KEY,
  DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CONTRACT_VERSION,
  DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_PLAN_PATH,
  DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_SCRIPT_PATH,
  buildDevHubMorningProposedCardsReadback,
  buildDevHubMorningProposedCardsReadbackDogfoodProof,
  validateDevHubMorningProposedCardsReadback,
} from '../lib/dev-hub-morning-proposed-cards-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-morning-proposed-cards-readback.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_MORNING_JS_PATH = 'public/dev-morning-proposed-cards-readback.js'
const DEV_MORNING_CSS_PATH = 'public/dev-morning-proposed-cards-readback.css'
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
  return htmlSource.includes('id="morning-proposed-cards-readback"') &&
    htmlSource.includes('id="morning-proposed-cards-readback-head-stats"') &&
    htmlSource.includes('/dev-morning-proposed-cards-readback.css') &&
    htmlSource.includes('/dev-morning-proposed-cards-readback.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('morningProposedCardsReadback') &&
    uiSource.includes('Morning Proposed Cards') &&
    uiSource.includes('Draft cards only') &&
    cssSource.includes('.morning-proposed-cards-readback') &&
    cssSource.includes('.morning-cards-summary') &&
    cssSource.includes('.morning-card-proposal')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_SCRIPT_PATH,
    operation: `close ${DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub morning proposed cards readback',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 65,
    source: 'Steve overnight approval: continue safe Dev-Hub intelligence cleanup while parking card creation, sprint opening, and builds without exact approval.',
    summary: 'Added a read-only Dev Hub Morning Proposed Cards packet that turns Build Portfolio groups into draft proposed-card packets without creating backlog cards.',
    whyItMatters: 'Steve can wake up to card-shaped proposals with source lineage and approval boundaries while the system still refuses to auto-promote recommendations into backlog or builds.',
    nextAction: 'Done under dev-hub-morning-proposed-cards-readback-v1. Next safe slice: either prepare an approval UI/readback for one exact draft card, or wait for Steve to choose which draft to promote.',
    statusNote: `Closed with proof: npm run process:dev-hub-morning-proposed-cards-readback-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live proposed-card summary: drafts=${readback.summary?.proposedCardCount || 0}, reviewReady=${readback.summary?.readyForSteveReviewCount || 0}, created=${readback.summary?.createdCardsByReadback || 0}, promoted=${readback.summary?.promotedCardsByReadback || 0}, sprintOpened=${readback.summary?.currentSprintOpenedByReadback || 0}, buildsAuthorized=${readback.summary?.buildAuthorizationsByReadback || 0}, harlanSends=${readback.summary?.harlanSendsByReadback || 0}. Every proposed card remains draft_requires_steve_approval and no backlog, Scoper, Portfolio, Current Sprint, approval, route, destination, Harlan, extraction, connector, browser, model, build, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-MORNING-PROPOSED-CARDS-READBACK' }, ACTOR)
}

async function buildLiveReadback() {
  const traceResult = await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })
  const buildPortfolioReadback = buildDevHubBuildPortfolioReadback({
    generatedAt: new Date().toISOString(),
    traceResult,
  })
  return buildDevHubMorningProposedCardsReadback({
    generatedAt: new Date().toISOString(),
    buildPortfolioReadback,
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
    readRepoFile(DEV_MORNING_JS_PATH),
    readRepoFile(DEV_MORNING_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_APPROVAL_PATH,
    cardId: DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubMorningProposedCardsReadbackDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubMorningProposedCardsReadback(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-morning-proposed-cards-readback-check'] === `node --env-file-if-exists=.env ${DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_SCRIPT_PATH}`, 'package exposes focused Morning Proposed Cards proof', packageJson.scripts?.['process:dev-hub-morning-proposed-cards-readback-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves draft-only cards fail if created/promoted/authorized', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Morning Proposed Cards readback validates', liveValidation.failures.join(', ') || DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'drafts_ready', 'live readback returns draft-ready status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.proposedCardCount) >= 1, 'live readback exposes proposed draft cards', `${liveReadback.summary?.proposedCardCount || 0} drafts`)
    addCheck(checks, count(liveReadback.summary?.readyForSteveReviewCount) === count(liveReadback.summary?.proposedCardCount), 'all live draft cards require Steve review', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.createdCardsByReadback) === 0 && count(liveReadback.summary?.promotedCardsByReadback) === 0 && count(liveReadback.summary?.currentSprintOpenedByReadback) === 0 && count(liveReadback.summary?.buildAuthorizationsByReadback) === 0, 'live readback creates/promotes/authorizes zero cards or builds', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.proposedCards).length <= 6, 'Morning proposed-card payload is bounded', `${list(liveReadback.proposedCards).length} rows`)
    addCheck(checks, list(liveReadback.proposedCards).every(card => card.approvalStatus === 'draft_requires_steve_approval' && card.status === 'draft_only' && card.createdNow === false && card.promotedNow === false && card.sprintOpenedNow === false && card.buildAuthorizedNow === false && card.sourceLineageCount >= 1), 'every proposed card is draft-only with source lineage', list(liveReadback.proposedCards).map(card => `${card.proposedCardId}:${card.approvalStatus}:${card.sourceLineageCount}`).join(', '))
    addCheck(checks, count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsPersistedByReadback) === 0 && count(liveReadback.summary?.approvalRecordsWrittenByReadback) === 0, 'live readback performs zero backlog/Scoper/Portfolio/approval writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routeRecordsMutatedByReadback) === 0 && count(liveReadback.summary?.destinationRecordsMutatedByReadback) === 0, 'live readback performs zero route or destination mutations', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0 && count(liveReadback.summary?.browserSessionsStarted) === 0 && count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero Harlan/source/browser/model/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, moduleSource.includes(DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_PLAN_PATH) && moduleSource.includes(DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_PLAN_PATH} + ${DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubMorningProposedCardsReadback') && devTeamHubSource.includes('morningProposedCardsReadback'), 'Dev Hub payload includes morningProposedCardsReadback from Build Portfolio readback', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Morning Proposed Cards from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLivePromotion(`${moduleSource}\n${uiSource}`), 'Morning Proposed Cards implementation has no backlog, Scoper, Portfolio, Harlan, route, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID), 'closeout registry contains Morning Proposed Cards closeout', DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID), 'verifier coverage source lists Morning Proposed Cards card', DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID)

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
      cardId: DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID,
      closeoutKey: DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CLOSEOUT_KEY,
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
        proposedCards: list(liveReadback.proposedCards).map(card => ({
          proposedCardId: card.proposedCardId,
          sourcePortfolioGroupId: card.sourcePortfolioGroupId,
          portfolioRank: card.portfolioRank,
          portfolioScore: card.portfolioScore,
          title: card.title,
          proposedPriority: card.proposedPriority,
          approvalStatus: card.approvalStatus,
          sourceLineageCount: card.sourceLineageCount,
        })),
      },
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log('Dev Hub Morning Proposed Cards Readback check')
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

