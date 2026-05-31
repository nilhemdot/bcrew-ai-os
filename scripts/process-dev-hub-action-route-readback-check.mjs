#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

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
  DEV_HUB_ACTION_ROUTE_READBACK_APPROVAL_PATH,
  DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID,
  DEV_HUB_ACTION_ROUTE_READBACK_CLOSEOUT_KEY,
  DEV_HUB_ACTION_ROUTE_READBACK_CONTRACT_VERSION,
  DEV_HUB_ACTION_ROUTE_READBACK_PLAN_PATH,
  DEV_HUB_ACTION_ROUTE_READBACK_SCRIPT_PATH,
  buildDevHubActionRouteReadback,
  buildDevHubActionRouteReadbackDogfoodProof,
  validateDevHubActionRouteReadback,
} from '../lib/dev-hub-action-route-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const UI_SCRIPT_PATH = 'public/dev-action-route-readback.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_CSS_PATH = 'public/dev.css'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const BUILD_INTEL_ROUTES_PATH = 'lib/foundation-build-intel-routes.js'
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

function text(value) {
  return String(value || '').trim()
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

function sourceHasNoRouteOrExternalMutation(source = '') {
  const blocked = [
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\bsendTelegramMessage\s*\(/,
    /\bsendMail\s*\(/,
    /\bsendEmail\s*\(/,
    /\bfetch\s*\([^)]*,\s*\{[\s\S]*?method:\s*['"]POST['"]/,
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bcallLlm\s*\(/,
    /\brunYoutube/i,
  ]
  return blocked.every(pattern => !pattern.test(source))
}

function sourceHasUiWiring({ htmlSource = '', devJsSource = '', uiSource = '', cssSource = '' } = {}) {
  return htmlSource.includes('id="action-route-readback"') &&
    htmlSource.includes('id="action-route-head-stats"') &&
    htmlSource.includes('/dev-action-route-readback.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('actionRouteReadback') &&
    uiSource.includes('No auto-apply') &&
    uiSource.includes('No Harlan send') &&
    uiSource.includes('No route mutation') &&
    cssSource.includes('.action-route-readback') &&
    cssSource.includes('.action-route-summary') &&
    cssSource.includes('.action-route-safety-item')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_ACTION_ROUTE_READBACK_SCRIPT_PATH,
    operation: `close ${DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose action-route readback in Dev Hub',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 45,
    source: 'Steve overnight approval: Dev Hub intelligence loop should show whether routes move or sit still before any auto-build or live apply work.',
    summary: 'Added a read-only Dev Hub action-route panel showing pending/approved/applied counts, Harlan digest readiness, apply-safety states, owner/evidence counts, and no-auto-apply boundaries.',
    whyItMatters: 'The system already builds routed decisions; this makes the waiting/applied state visible inside Dev Hub so route intelligence cannot silently stall behind a hidden queue.',
    nextAction: 'Done under dev-hub-action-route-readback-v1. Next safe slice: surface one operator-selected real route for Steve review, but do not approve or apply it without explicit route ID confirmation.',
    statusNote: `Closed with proof: npm run process:dev-hub-action-route-readback-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live readback summary: waiting=${readback.summary?.needsReviewItems || 0}, readyForConfirmedApply=${readback.summary?.readyForConfirmedApplyItems || 0}, applied=${readback.summary?.appliedRoutes || 0}. No route, destination, backlog recommendation, Harlan send, extraction, model call, or external write is performed by the readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-ACTION-ROUTE-READBACK' }, ACTOR)
}

async function buildLiveReadback() {
  const foundationSnapshot = await getFoundationSnapshot()
  return buildDevHubActionRouteReadback({
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    backlogItems: foundationSnapshot.backlogItems || [],
    generatedAt: new Date().toISOString(),
  })
}

async function main() {
  const args = parseArgs()
  const [
    moduleSource,
    devTeamHubSource,
    routeSource,
    htmlSource,
    devJsSource,
    uiSource,
    cssSource,
    packageJson,
    closeoutRecords,
    coverageSource,
  ] = await Promise.all([
    readRepoFile('lib/dev-hub-action-route-readback.js'),
    readRepoFile(DEV_TEAM_HUB_PATH),
    readRepoFile(BUILD_INTEL_ROUTES_PATH),
    readRepoFile(DEV_HTML_PATH),
    readRepoFile(DEV_JS_PATH),
    readRepoFile(UI_SCRIPT_PATH),
    readRepoFile(DEV_CSS_PATH),
    readRepoJson('package.json'),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubActionRouteReadbackDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubActionRouteReadback(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_ACTION_ROUTE_READBACK_CLOSEOUT_KEY) || null

    addCheck(checks, liveCard?.id === DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID, 'live backlog card exists', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing')
    addCheck(checks, packageJson.scripts?.['process:dev-hub-action-route-readback-check'] === `node --env-file-if-exists=.env ${DEV_HUB_ACTION_ROUTE_READBACK_SCRIPT_PATH}`, 'package exposes focused action-route readback proof', packageJson.scripts?.['process:dev-hub-action-route-readback-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves waiting/ready/applied states without send or apply', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live action-route readback validates', liveValidation.failures.join(', ') || DEV_HUB_ACTION_ROUTE_READBACK_CONTRACT_VERSION)
    addCheck(checks, liveReadback.summary?.pendingRoutes >= liveReadback.summary?.appliedRoutes, 'live readback exposes pending/applied route counts', JSON.stringify({
      pendingRoutes: liveReadback.summary?.pendingRoutes,
      appliedRoutes: liveReadback.summary?.appliedRoutes,
      readyForConfirmedApplyItems: liveReadback.summary?.readyForConfirmedApplyItems,
    }))
    addCheck(checks, liveReadback.harlanDigest?.sendsMessageNow === false && liveReadback.harlanDigest?.externalSent === false, 'Harlan digest remains dry-run only', liveReadback.harlanDigest?.status || 'missing')
    addCheck(checks, liveReadback.applySafety?.autoApplyAllowed === false && Number(liveReadback.summary?.autoApplyAllowedItems || 0) === 0, 'apply safety keeps auto-apply disabled', liveReadback.applySafety?.nextHumanAction || 'missing')
    addCheck(checks, list(liveReadback.harlanDigest?.items).length <= 5 && list(liveReadback.applySafety?.items).length <= 8, 'Dev Hub readback payload is bounded', `${list(liveReadback.harlanDigest?.items).length} digest / ${list(liveReadback.applySafety?.items).length} safety`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubActionRouteReadback') && devTeamHubSource.includes('actionRouteReadback'), 'Dev Hub payload includes actionRouteReadback', DEV_TEAM_HUB_PATH)
    addCheck(checks, routeSource.includes('foundationSnapshot.intelligenceActionRouter') && routeSource.includes('buildDevTeamHubV0Snapshot'), 'Dev Hub route passes Foundation action-router snapshot into payload builder', BUILD_INTEL_ROUTES_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders action-route readback panel from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + CSS')
    addCheck(checks, sourceHasNoRouteOrExternalMutation(`${moduleSource}\n${devTeamHubSource}\n${uiSource}`), 'readback implementation has no route apply, external send, model, extraction, or backlog write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_ACTION_ROUTE_READBACK_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID), 'closeout registry contains Dev Hub action-route readback closeout', DEV_HUB_ACTION_ROUTE_READBACK_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID), 'verifier coverage source lists Dev Hub action-route readback card', DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID)
    addCheck(checks, moduleSource.includes(DEV_HUB_ACTION_ROUTE_READBACK_PLAN_PATH) && moduleSource.includes(DEV_HUB_ACTION_ROUTE_READBACK_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_ACTION_ROUTE_READBACK_PLAN_PATH} + ${DEV_HUB_ACTION_ROUTE_READBACK_APPROVAL_PATH}`)

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
      cardId: DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID,
      closeoutKey: DEV_HUB_ACTION_ROUTE_READBACK_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        harlanDigest: {
          status: liveReadback.harlanDigest?.status,
          itemCount: list(liveReadback.harlanDigest?.items).length,
          sendsMessageNow: liveReadback.harlanDigest?.sendsMessageNow,
          externalSent: liveReadback.harlanDigest?.externalSent,
        },
        applySafety: {
          status: liveReadback.applySafety?.status,
          itemCount: list(liveReadback.applySafety?.items).length,
          autoApplyAllowed: liveReadback.applySafety?.autoApplyAllowed,
          nextHumanAction: liveReadback.applySafety?.nextHumanAction,
        },
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub action-route readback proof: ${result.status}`)
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
  console.error('Dev Hub action-route readback proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
