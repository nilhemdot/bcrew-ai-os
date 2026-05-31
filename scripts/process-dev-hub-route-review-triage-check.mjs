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
  DEV_HUB_ROUTE_REVIEW_TRIAGE_APPROVAL_PATH,
  DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID,
  DEV_HUB_ROUTE_REVIEW_TRIAGE_CLOSEOUT_KEY,
  DEV_HUB_ROUTE_REVIEW_TRIAGE_CONTRACT_VERSION,
  DEV_HUB_ROUTE_REVIEW_TRIAGE_PLAN_PATH,
  DEV_HUB_ROUTE_REVIEW_TRIAGE_SCRIPT_PATH,
  buildDevHubRouteReviewTriage,
  buildDevHubRouteReviewTriageDogfoodProof,
  validateDevHubRouteReviewTriage,
} from '../lib/dev-hub-route-review-triage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-route-review-triage.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_ROUTE_TRIAGE_JS_PATH = 'public/dev-route-review-triage.js'
const DEV_ROUTE_TRIAGE_CSS_PATH = 'public/dev-route-review-triage.css'
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
  return htmlSource.includes('id="route-review-triage"') &&
    htmlSource.includes('id="route-review-triage-head-stats"') &&
    htmlSource.includes('/dev-route-review-triage.css') &&
    htmlSource.includes('/dev-route-review-triage.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('routeReviewTriage') &&
    uiSource.includes('Read-only review triage') &&
    uiSource.includes('autoApplyAllowedItems') &&
    cssSource.includes('.route-review-triage') &&
    cssSource.includes('.route-triage-summary') &&
    cssSource.includes('.route-triage-bucket') &&
    cssSource.includes('.route-triage-grid')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_ROUTE_REVIEW_TRIAGE_SCRIPT_PATH,
    operation: `close ${DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub route review triage',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 55,
    source: 'Steve overnight approval: reduce action-route review overload without unsafe auto-apply or auto-promotion.',
    summary: 'Added a read-only Dev Hub Route Review Triage panel that groups waiting action routes into ready-for-confirmed-apply, owner-required, sensitive, duplicate/stale, and oldest review queues.',
    whyItMatters: 'The Dev Hub can now organize the pending route pile without hiding it behind one raw count or mutating routes while Steve is asleep.',
    nextAction: 'Done under dev-hub-route-review-triage-v1. Next safe slice: route operator-selected review actions still need exact route ID and Steve approval before any live approve/apply/reject/snooze/reroute.',
    statusNote: `Closed with proof: npm run process:dev-hub-route-review-triage-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live triage summary: waiting=${readback.summary?.needsReviewItems || 0}, owner=${readback.summary?.ownerRequiredItems || 0}, sensitive=${readback.summary?.sensitiveReviewItems || 0}, duplicateStale=${readback.summary?.duplicateOrStaleReviewItems || 0}, readyForConfirmedApply=${readback.summary?.readyForConfirmedApplyItems || 0}, autoApply=${readback.summary?.autoApplyAllowedItems || 0}, routesMutated=${readback.summary?.routesMutatedByReadback || 0}. No route approval, apply, reject, snooze, reroute, destination write, backlog write, Scoper/Portfolio write, Harlan send, extraction, model call, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-ROUTE-REVIEW-TRIAGE' }, ACTOR)
}

async function buildLiveReadback() {
  const foundationSnapshot = await getFoundationSnapshot()
  return buildDevHubRouteReviewTriage({
    generatedAt: new Date().toISOString(),
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    backlogItems: foundationSnapshot.backlogItems || [],
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
    readRepoFile(DEV_ROUTE_TRIAGE_JS_PATH),
    readRepoFile(DEV_ROUTE_TRIAGE_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_ROUTE_REVIEW_TRIAGE_APPROVAL_PATH,
    cardId: DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubRouteReviewTriageDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubRouteReviewTriage(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_ROUTE_REVIEW_TRIAGE_CLOSEOUT_KEY) || null

    addCheck(checks, liveCard?.id === DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID, 'live backlog card exists', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_ROUTE_REVIEW_TRIAGE_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-route-review-triage-check'] === `node --env-file-if-exists=.env ${DEV_HUB_ROUTE_REVIEW_TRIAGE_SCRIPT_PATH}`, 'package exposes focused Route Review Triage proof', packageJson.scripts?.['process:dev-hub-route-review-triage-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves bounded route buckets and rejects auto-apply or mutation', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Route Review Triage readback validates', liveValidation.failures.join(', ') || DEV_HUB_ROUTE_REVIEW_TRIAGE_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'needs_review' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.autoApplyAllowedItems) === 0, 'auto-apply remains disabled in live triage', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routesMutatedByReadback) === 0 && count(liveReadback.summary?.destinationsMutatedByReadback) === 0 && count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback performs zero route/destination/Harlan/external writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, liveReadback.summary?.ownerRequiredItems !== undefined && liveReadback.summary?.sensitiveReviewItems !== undefined && liveReadback.summary?.duplicateOrStaleReviewItems !== undefined, 'live triage exposes owner/sensitive/duplicate-stale pressure fields', JSON.stringify({
      owner: liveReadback.summary?.ownerRequiredItems,
      sensitive: liveReadback.summary?.sensitiveReviewItems,
      duplicateStale: liveReadback.summary?.duplicateOrStaleReviewItems,
    }))
    addCheck(checks, list(liveReadback.triageBuckets).length <= 6 && Object.values(liveReadback.queues || {}).every(queue => list(queue).length <= 6), 'Route Review Triage rows are bounded', JSON.stringify({
      buckets: list(liveReadback.triageBuckets).length,
      ready: list(liveReadback.queues?.readyForConfirmedApply).length,
      owner: list(liveReadback.queues?.ownerRequired).length,
      sensitive: list(liveReadback.queues?.sensitiveReview).length,
      duplicateStale: list(liveReadback.queues?.duplicateOrStale).length,
      oldest: list(liveReadback.queues?.oldest).length,
    }))
    addCheck(checks, list(liveReadback.queues?.readyForConfirmedApply).every(item => item.applyAllowedNow === false), 'ready queue is review-only and never directly apply-enabled', `${list(liveReadback.queues?.readyForConfirmedApply).length} ready rows`)
    addCheck(checks, moduleSource.includes(DEV_HUB_ROUTE_REVIEW_TRIAGE_PLAN_PATH) && moduleSource.includes(DEV_HUB_ROUTE_REVIEW_TRIAGE_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_ROUTE_REVIEW_TRIAGE_PLAN_PATH} + ${DEV_HUB_ROUTE_REVIEW_TRIAGE_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubRouteReviewTriage') && devTeamHubSource.includes('routeReviewTriage'), 'Dev Hub payload includes routeReviewTriage from existing read models', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Route Review Triage from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveRouteMutation(`${moduleSource}\n${uiSource}`), 'Route Review Triage implementation has no route, destination, backlog, Harlan, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_ROUTE_REVIEW_TRIAGE_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID), 'closeout registry contains Route Review Triage closeout', DEV_HUB_ROUTE_REVIEW_TRIAGE_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID), 'verifier coverage source lists Route Review Triage card', DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID)

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
      cardId: DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID,
      closeoutKey: DEV_HUB_ROUTE_REVIEW_TRIAGE_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        triageBuckets: liveReadback.triageBuckets,
        queueCounts: Object.fromEntries(Object.entries(liveReadback.queues || {}).map(([key, value]) => [key, list(value).length])),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Route Review Triage proof: ${result.status}`)
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
  console.error('Dev Hub Route Review Triage proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
