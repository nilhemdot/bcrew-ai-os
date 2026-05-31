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
import { getFoundationSnapshot } from '../lib/foundation-strategy-docs-db.js'
import { buildDevHubActionRouteReadback } from '../lib/dev-hub-action-route-readback.js'
import { buildDevHubRouteAutoClearPreflight } from '../lib/dev-hub-route-autoclear-preflight.js'
import {
  DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_APPROVAL_PATH,
  DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID,
  DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CLOSEOUT_KEY,
  DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CONTRACT_VERSION,
  DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_PLAN_PATH,
  DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_SCRIPT_PATH,
  buildDevHubRouteBlockerPreflight,
  buildDevHubRouteBlockerPreflightDogfoodProof,
  validateDevHubRouteBlockerPreflight,
} from '../lib/dev-hub-route-blocker-preflight.js'
import { buildDevHubRouteReviewOperatorPacket } from '../lib/dev-hub-route-review-operator-packet.js'
import { buildDevHubRouteReviewTriage } from '../lib/dev-hub-route-review-triage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-route-blocker-preflight.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_BLOCKER_JS_PATH = 'public/dev-route-blocker-preflight.js'
const DEV_BLOCKER_CSS_PATH = 'public/dev-route-blocker-preflight.css'
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

function sourceHasNoLiveRouteMutation(source = '') {
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
  return htmlSource.includes('id="route-blocker-preflight"') &&
    htmlSource.includes('id="route-blocker-preflight-head-stats"') &&
    htmlSource.includes('/dev-route-blocker-preflight.css') &&
    htmlSource.includes('/dev-route-blocker-preflight.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('routeBlockerPreflight') &&
    uiSource.includes('Route blocker preflight') &&
    uiSource.includes('ownersAssignedByReadback') &&
    cssSource.includes('.route-blocker-preflight') &&
    cssSource.includes('.route-blocker-summary') &&
    cssSource.includes('.route-blocker-row')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_SCRIPT_PATH,
    operation: `close ${DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub route blocker preflight',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 63,
    source: 'Steve overnight approval: continue safe Dev-Hub intelligence cleanup while parking owner assignment and live route mutation without exact approval.',
    summary: 'Added a read-only Dev Hub Route Blocker Preflight that turns auto-clear blockers into exact owner-required and sensitive-review route rows.',
    whyItMatters: 'The Dev Hub can now explain why the route pile cannot be auto-cleared yet and what human decision lane is needed next, without assigning owners, completing sensitive review, or mutating routes.',
    nextAction: 'Done under dev-hub-route-blocker-preflight-v1. Next safe slice: continue read-only scoped-build prep, or wait for Steve to approve a single exact route-ID owner/clear/apply action.',
    statusNote: `Closed with proof: npm run process:dev-hub-route-blocker-preflight-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live blocker summary: rows=${readback.summary?.blockerItemCount || 0}, ownerRows=${readback.summary?.ownerResolutionRows || 0}, sensitiveRows=${readback.summary?.sensitiveReviewRows || 0}, ownersAssigned=${readback.summary?.ownersAssignedByReadback || 0}, sensitiveCompleted=${readback.summary?.sensitiveReviewsCompletedByReadback || 0}, routesMutated=${readback.summary?.routesMutatedByReadback || 0}, destinationWrites=${readback.summary?.destinationsMutatedByReadback || 0}, harlanSends=${readback.summary?.harlanSendsByReadback || 0}. Every row remains approval-required and no owner assignment, sensitive review completion, approve/apply/reject/snooze/reroute, destination write, backlog write, Scoper/Portfolio write, Harlan send, extraction, connector probe, model call, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-ROUTE-BLOCKER-PREFLIGHT' }, ACTOR)
}

async function buildLiveReadback() {
  const generatedAt = new Date().toISOString()
  const foundationSnapshot = await getFoundationSnapshot()
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
  const routeReviewOperatorPacket = buildDevHubRouteReviewOperatorPacket({
    generatedAt,
    routeReviewTriage,
    actionRouteReadback,
  })
  const routeAutoClearPreflight = buildDevHubRouteAutoClearPreflight({
    generatedAt,
    routeReviewTriage,
    routeReviewOperatorPacket,
    actionRouteReadback,
  })
  return buildDevHubRouteBlockerPreflight({
    generatedAt,
    routeAutoClearPreflight,
    routeReviewTriage,
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
    readRepoFile(DEV_BLOCKER_JS_PATH),
    readRepoFile(DEV_BLOCKER_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_APPROVAL_PATH,
    cardId: DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubRouteBlockerPreflightDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubRouteBlockerPreflight(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-route-blocker-preflight-check'] === `node --env-file-if-exists=.env ${DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_SCRIPT_PATH}`, 'package exposes focused Route Blocker Preflight proof', packageJson.scripts?.['process:dev-hub-route-blocker-preflight-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves route blocker rows reject owner assignment, sensitive-review completion, route mutation, sends, or missing route IDs', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Route Blocker Preflight validates', liveValidation.failures.join(', ') || DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'blockers_ready' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.blockerItemCount) >= 1, 'live readback exposes exact route blocker rows', `${liveReadback.summary?.blockerItemCount || 0} rows`)
    addCheck(checks, count(liveReadback.summary?.ownerResolutionRows) + count(liveReadback.summary?.sensitiveReviewRows) === count(liveReadback.summary?.blockerItemCount), 'live blocker rows are owner or sensitive decisions', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.missingRouteIdCount) === 0 && count(liveReadback.summary?.exactRouteIdCount) === count(liveReadback.summary?.blockerItemCount), 'all live blocker rows have exact route IDs', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.approvalRequiredRows) === count(liveReadback.summary?.blockerItemCount), 'all live blocker rows remain approval-required', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.blockerRows).every(item => item.status === 'approval_required' && item.approvalRequired === true && item.ownerAssignedNow === false && item.sensitiveReviewedNow === false && item.routeMutatedNow === false && item.destinationMutatedNow === false), 'all live blocker rows remain approval-bound', list(liveReadback.blockerRows).map(item => `${item.rank}:${item.routeId}:${item.decisionType}`).join(', '))
    addCheck(checks, count(liveReadback.summary?.ownersAssignedByReadback) === 0 && count(liveReadback.summary?.sensitiveReviewsCompletedByReadback) === 0, 'live readback performs zero owner assignment or sensitive-review completion', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routesApprovedByReadback) === 0 && count(liveReadback.summary?.routesAppliedByReadback) === 0 && count(liveReadback.summary?.routesRejectedByReadback) === 0 && count(liveReadback.summary?.routesSnoozedByReadback) === 0 && count(liveReadback.summary?.routesReroutedByReadback) === 0 && count(liveReadback.summary?.routesMutatedByReadback) === 0, 'live readback performs zero route mutations', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.destinationsMutatedByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.currentSprintMutationsByReadback) === 0 && count(liveReadback.summary?.approvalRecordsWrittenByReadback) === 0, 'live readback performs zero destination/backlog/Scoper/Portfolio/approval writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0 && count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero Harlan/source/model/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.blockerRows).length <= 16 && list(liveReadback.groups).length <= 4, 'Route Blocker Preflight rows are bounded', JSON.stringify({
      rows: list(liveReadback.blockerRows).length,
      groups: list(liveReadback.groups).length,
    }))
    addCheck(checks, moduleSource.includes(DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_PLAN_PATH) && moduleSource.includes(DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_PLAN_PATH} + ${DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubRouteBlockerPreflight') && devTeamHubSource.includes('routeBlockerPreflight'), 'Dev Hub payload includes routeBlockerPreflight from existing route readbacks', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Route Blocker Preflight from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveRouteMutation(`${moduleSource}\n${uiSource}`), 'Route Blocker Preflight implementation has no route, destination, backlog, Harlan, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID), 'closeout registry contains Route Blocker Preflight closeout', DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID), 'verifier coverage source lists Route Blocker Preflight card', DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID)

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
      cardId: DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID,
      closeoutKey: DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        groups: liveReadback.groups,
        blockerRows: list(liveReadback.blockerRows).map(item => ({
          rank: item.rank,
          routeId: item.routeId,
          decisionType: item.decisionType,
          suggestedDecisionLane: item.suggestedDecisionLane,
          status: item.status,
        })),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Route Blocker Preflight proof: ${result.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
    }
    process.exit(result.ok ? 0 : 1)
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
