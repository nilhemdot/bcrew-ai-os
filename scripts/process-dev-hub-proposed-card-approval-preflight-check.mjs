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
  buildDevHubMorningProposedCardsReadback,
} from '../lib/dev-hub-morning-proposed-cards-readback.js'
import {
  DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_APPROVAL_PATH,
  DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID,
  DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CLOSEOUT_KEY,
  DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CONTRACT_VERSION,
  DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_PLAN_PATH,
  DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_SCRIPT_PATH,
  buildDevHubProposedCardApprovalPreflight,
  buildDevHubProposedCardApprovalPreflightDogfoodProof,
  validateDevHubProposedCardApprovalPreflight,
} from '../lib/dev-hub-proposed-card-approval-preflight.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-proposed-card-approval-preflight.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_APPROVAL_JS_PATH = 'public/dev-proposed-card-approval-preflight.js'
const DEV_APPROVAL_CSS_PATH = 'public/dev-proposed-card-approval-preflight.css'
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
  return htmlSource.includes('id="proposed-card-approval-preflight"') &&
    htmlSource.includes('id="proposed-card-approval-preflight-head-stats"') &&
    htmlSource.includes('/dev-proposed-card-approval-preflight.css') &&
    htmlSource.includes('/dev-proposed-card-approval-preflight.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('proposedCardApprovalPreflight') &&
    uiSource.includes('Approval preflight only') &&
    uiSource.includes('cardsCreatedByReadback') &&
    cssSource.includes('.proposed-card-approval-preflight') &&
    cssSource.includes('.proposed-card-approval-summary') &&
    cssSource.includes('.proposed-card-approval-row')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_SCRIPT_PATH,
    operation: `close ${DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub proposed-card approval preflight',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 66,
    source: 'Steve overnight approval: continue safe Dev-Hub intelligence cleanup while parking exact card creation, sprint opening, and builds without approval.',
    summary: 'Added a read-only Dev Hub approval preflight that turns Morning Proposed Cards into exact approval rows without creating backlog cards.',
    whyItMatters: 'Steve can approve or reject exact proposed card creation in the morning while the system proves it did not create cards, open sprint work, or authorize builds overnight.',
    nextAction: 'Done under dev-hub-proposed-card-approval-preflight-v1. Next safe slice: prepare a read-only approval outcome packet or wait for Steve to approve an exact proposed card ID before any backlog creation.',
    statusNote: `Closed with proof: npm run process:dev-hub-proposed-card-approval-preflight-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live approval preflight summary: approvalRows=${readback.summary?.approvalItemCount || 0}, exactApproval=${readback.summary?.exactApprovalRequiredCount || 0}, readyForSteve=${readback.summary?.readyForSteveDecisionCount || 0}, cardsCreated=${readback.summary?.cardsCreatedByReadback || 0}, backlogWrites=${readback.summary?.backlogRecordsWrittenByReadback || 0}, sprintOpened=${readback.summary?.currentSprintOpenedByReadback || 0}, buildsAuthorized=${readback.summary?.buildAuthorizationsByReadback || 0}, harlanSends=${readback.summary?.harlanSendsByReadback || 0}. Every row remains approval_required and no backlog, Scoper, Portfolio, Current Sprint, approval, route, destination, Harlan, extraction, connector, browser, model, build, or external write is performed by this preflight path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-PROPOSED-CARD-APPROVAL-PREFLIGHT' }, ACTOR)
}

async function buildLiveReadback() {
  const traceResult = await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })
  const buildPortfolioReadback = buildDevHubBuildPortfolioReadback({
    generatedAt: new Date().toISOString(),
    traceResult,
  })
  const morningProposedCardsReadback = buildDevHubMorningProposedCardsReadback({
    generatedAt: new Date().toISOString(),
    buildPortfolioReadback,
  })
  return buildDevHubProposedCardApprovalPreflight({
    generatedAt: new Date().toISOString(),
    morningProposedCardsReadback,
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
    readRepoFile(DEV_APPROVAL_JS_PATH),
    readRepoFile(DEV_APPROVAL_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_APPROVAL_PATH,
    cardId: DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubProposedCardApprovalPreflightDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubProposedCardApprovalPreflight(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-proposed-card-approval-preflight-check'] === `node --env-file-if-exists=.env ${DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_SCRIPT_PATH}`, 'package exposes focused Proposed Card Approval Preflight proof', packageJson.scripts?.['process:dev-hub-proposed-card-approval-preflight-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves preflight fails if card creation or build authorization appears', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Proposed Card Approval Preflight validates', liveValidation.failures.join(', ') || DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'approval_preflight_ready', 'live readback returns approval-preflight-ready status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.approvalItemCount) >= 1, 'live readback exposes approval preflight rows', `${liveReadback.summary?.approvalItemCount || 0} rows`)
    addCheck(checks, count(liveReadback.summary?.exactApprovalRequiredCount) === count(liveReadback.summary?.approvalItemCount), 'all live rows require exact Steve approval', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.readyForSteveDecisionCount) === count(liveReadback.summary?.approvalItemCount), 'all live rows are waiting for Steve decision', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.cardsCreatedByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.currentSprintOpenedByReadback) === 0 && count(liveReadback.summary?.buildAuthorizationsByReadback) === 0, 'live readback creates zero cards, backlog records, sprint items, or build authorizations', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.approvalRows).length <= 6, 'approval preflight payload is bounded', `${list(liveReadback.approvalRows).length} rows`)
    addCheck(checks, list(liveReadback.approvalRows).every(row => row.status === 'approval_required' && row.exactApprovalRequired === true && row.requiresSteveDecision === true && row.cardCreatedNow === false && row.backlogWrittenNow === false && row.buildAuthorizedNow === false && row.sourceLineageCount >= 1), 'every approval row is approval-required with source lineage and no mutation flags', list(liveReadback.approvalRows).map(row => `${row.proposedCardId}:${row.status}:${row.sourceLineageCount}`).join(', '))
    addCheck(checks, count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.approvalRecordsWrittenByReadback) === 0, 'live readback performs zero Scoper/Portfolio/approval writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routeRecordsMutatedByReadback) === 0 && count(liveReadback.summary?.destinationRecordsMutatedByReadback) === 0, 'live readback performs zero route or destination mutations', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0 && count(liveReadback.summary?.browserSessionsStarted) === 0 && count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero Harlan/source/browser/model/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, moduleSource.includes(DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_PLAN_PATH) && moduleSource.includes(DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_PLAN_PATH} + ${DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubProposedCardApprovalPreflight') && devTeamHubSource.includes('proposedCardApprovalPreflight'), 'Dev Hub payload includes proposedCardApprovalPreflight from Morning Proposed Cards', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Proposed Card Approval Preflight from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLivePromotion(`${moduleSource}\n${uiSource}`), 'Proposed Card Approval Preflight implementation has no backlog, Scoper, Portfolio, Harlan, route, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID), 'closeout registry contains Proposed Card Approval Preflight closeout', DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID), 'verifier coverage source lists Proposed Card Approval Preflight card', DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID)

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
      cardId: DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID,
      closeoutKey: DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CLOSEOUT_KEY,
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
        approvalRows: list(liveReadback.approvalRows).map(row => ({
          approvalItemId: row.approvalItemId,
          proposedCardId: row.proposedCardId,
          sourcePortfolioGroupId: row.sourcePortfolioGroupId,
          portfolioRank: row.portfolioRank,
          portfolioScore: row.portfolioScore,
          title: row.title,
          status: row.status,
          sourceLineageCount: row.sourceLineageCount,
          approvalPhrase: row.approvalPhrase,
        })),
      },
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? `: ${check.detail}` : ''}`)
      }
    }
    if (!result.ok) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
