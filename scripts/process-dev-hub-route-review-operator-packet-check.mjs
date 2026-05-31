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
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  buildDevHubActionRouteReadback,
} from '../lib/dev-hub-action-route-readback.js'
import {
  buildDevHubRouteReviewTriage,
} from '../lib/dev-hub-route-review-triage.js'
import {
  DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_APPROVAL_PATH,
  DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID,
  DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CLOSEOUT_KEY,
  DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CONTRACT_VERSION,
  DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_PLAN_PATH,
  DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_SCRIPT_PATH,
  buildDevHubRouteReviewOperatorPacket,
  buildDevHubRouteReviewOperatorPacketDogfoodProof,
  validateDevHubRouteReviewOperatorPacket,
} from '../lib/dev-hub-route-review-operator-packet.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-route-review-operator-packet.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_PACKET_JS_PATH = 'public/dev-route-review-operator-packet.js'
const DEV_PACKET_CSS_PATH = 'public/dev-route-review-operator-packet.css'
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
  return htmlSource.includes('id="route-review-operator-packet"') &&
    htmlSource.includes('id="route-review-operator-packet-head-stats"') &&
    htmlSource.includes('/dev-route-review-operator-packet.css') &&
    htmlSource.includes('/dev-route-review-operator-packet.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('routeReviewOperatorPacket') &&
    uiSource.includes('Review-only route packet') &&
    uiSource.includes('routesMutatedByReadback') &&
    cssSource.includes('.route-review-operator-packet') &&
    cssSource.includes('.route-packet-summary') &&
    cssSource.includes('.route-packet-row')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_SCRIPT_PATH,
    operation: `close ${DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub route review operator packet',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 60,
    source: 'Steve overnight approval: prepare exact route-review decisions while keeping live route mutation parked.',
    summary: 'Added a read-only Dev Hub Route Review Operator Packet that groups exact route IDs by owner-required, sensitive, duplicate/stale, ready-confirmed-apply, and oldest-review decisions.',
    whyItMatters: 'The Dev Hub can now hand Steve/Codex an exact route-ID review packet instead of a raw route count, without approving, applying, rejecting, snoozing, rerouting, or writing destinations.',
    nextAction: 'Done under dev-hub-route-review-operator-packet-v1. Next safe slice: either build an approval-bound route-action batch with exact route IDs, or continue read-only source-flow repair prep.',
    statusNote: `Closed with proof: npm run process:dev-hub-route-review-operator-packet-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live route packet summary: rows=${readback.summary?.packetItemCount || 0}, exactRouteIds=${readback.summary?.exactRouteIdCount || 0}, owner=${readback.summary?.ownerRequiredItems || 0}, sensitive=${readback.summary?.sensitiveReviewItems || 0}, duplicateStale=${readback.summary?.duplicateOrStaleItems || 0}, routesMutated=${readback.summary?.routesMutatedByReadback || 0}, destinationWrites=${readback.summary?.destinationsMutatedByReadback || 0}, harlanSends=${readback.summary?.harlanSendsByReadback || 0}. All rows remain review-only and no approve/apply/reject/snooze/reroute, destination write, backlog write, Scoper/Portfolio write, Harlan send, extraction, connector probe, model call, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-ROUTE-REVIEW-OPERATOR-PACKET' }, ACTOR)
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
  return buildDevHubRouteReviewOperatorPacket({
    generatedAt,
    routeReviewTriage,
    actionRouteReadback,
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
    readRepoFile(DEV_PACKET_JS_PATH),
    readRepoFile(DEV_PACKET_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_APPROVAL_PATH,
    cardId: DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubRouteReviewOperatorPacketDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubRouteReviewOperatorPacket(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-route-review-operator-packet-check'] === `node --env-file-if-exists=.env ${DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_SCRIPT_PATH}`, 'package exposes focused Route Review Operator Packet proof', packageJson.scripts?.['process:dev-hub-route-review-operator-packet-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves review-only route packet and rejects mutation or missing route IDs', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Route Review Operator Packet validates', liveValidation.failures.join(', ') || DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'packet_ready' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.packetItemCount) >= 1, 'live readback exposes exact route review rows', `${liveReadback.summary?.packetItemCount || 0} rows`)
    addCheck(checks, count(liveReadback.summary?.missingRouteIdCount) === 0 && count(liveReadback.summary?.exactRouteIdCount) === count(liveReadback.summary?.packetItemCount), 'all live packet rows have exact route IDs', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.packetRows).every(item => item.status === 'review_only' && item.routeMutatedNow === false && item.destinationMutatedNow === false && item.appliedNow === false), 'all live packet rows remain review-only', list(liveReadback.packetRows).map(item => `${item.rank}:${item.routeId}:${item.groupId}`).join(', '))
    addCheck(checks, count(liveReadback.summary?.routesApprovedByReadback) === 0 && count(liveReadback.summary?.routesAppliedByReadback) === 0 && count(liveReadback.summary?.routesRejectedByReadback) === 0 && count(liveReadback.summary?.routesSnoozedByReadback) === 0 && count(liveReadback.summary?.routesReroutedByReadback) === 0 && count(liveReadback.summary?.routesMutatedByReadback) === 0, 'live readback performs zero route mutations', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.destinationsMutatedByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.currentSprintMutationsByReadback) === 0 && count(liveReadback.summary?.approvalRecordsWrittenByReadback) === 0, 'live readback performs zero destination/backlog/Scoper/Portfolio/approval writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0 && count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero Harlan/source/model/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.packetRows).length <= 12 && list(liveReadback.groups).length <= 5, 'Route Review Operator Packet rows are bounded', JSON.stringify({
      rows: list(liveReadback.packetRows).length,
      groups: list(liveReadback.groups).length,
    }))
    addCheck(checks, moduleSource.includes(DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_PLAN_PATH) && moduleSource.includes(DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_PLAN_PATH} + ${DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubRouteReviewOperatorPacket') && devTeamHubSource.includes('routeReviewOperatorPacket'), 'Dev Hub payload includes routeReviewOperatorPacket from existing readbacks', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Route Review Operator Packet from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveRouteMutation(`${moduleSource}\n${uiSource}`), 'Route Review Operator Packet implementation has no route, destination, backlog, Harlan, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID), 'closeout registry contains Route Review Operator Packet closeout', DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID), 'verifier coverage source lists Route Review Operator Packet card', DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID)

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
      cardId: DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID,
      closeoutKey: DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        packetRows: list(liveReadback.packetRows).map(item => ({
          rank: item.rank,
          routeId: item.routeId,
          groupId: item.groupId,
          title: item.title,
          status: item.status,
        })),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Route Review Operator Packet proof: ${result.status}`)
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
  console.error('Dev Hub Route Review Operator Packet proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
