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
  DEV_HUB_FOUNDATION_DONE_BAR_APPROVAL_PATH,
  DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID,
  DEV_HUB_FOUNDATION_DONE_BAR_CLOSEOUT_KEY,
  DEV_HUB_FOUNDATION_DONE_BAR_CONTRACT_VERSION,
  DEV_HUB_FOUNDATION_DONE_BAR_PLAN_PATH,
  DEV_HUB_FOUNDATION_DONE_BAR_SCRIPT_PATH,
  buildDevHubFoundationDoneBarDogfoodProof,
  buildDevHubFoundationDoneBarFromInputs,
  validateDevHubFoundationDoneBar,
} from '../lib/dev-hub-foundation-done-bar.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-foundation-done-bar.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_FOUNDATION_DONE_BAR_JS_PATH = 'public/dev-foundation-done-bar.js'
const DEV_CSS_PATH = 'public/dev.css'
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
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\bsnoozeActionRoute\s*\(/,
    /\bsendTelegramMessage\s*\(/,
    /\bsendMail\s*\(/,
    /\bsendEmail\s*\(/,
    /\bfetch\s*\([^)]*,\s*\{[\s\S]*?method:\s*['"]POST['"]/,
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bupsertFoundationCurrentSprintOverlay\s*\(/,
    /\bcallLlm\s*\(/,
    /\brunYoutube/i,
    /\blistLlmCalls\s*\(/,
  ]
  return blocked.every(pattern => !pattern.test(source))
}

function sourceHasUiWiring({
  htmlSource = '',
  devJsSource = '',
  uiSource = '',
  cssSource = '',
} = {}) {
  return htmlSource.includes('id="foundation-done-bar"') &&
    htmlSource.includes('id="foundation-done-head-stats"') &&
    htmlSource.includes('/dev-foundation-done-bar.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('foundationDoneBar') &&
    uiSource.includes('Route pending is open') &&
    uiSource.includes('Applied is resolved') &&
    cssSource.includes('.foundation-done-bar') &&
    cssSource.includes('.foundation-done-summary') &&
    cssSource.includes('.foundation-done-row-stages')
}

async function closeLiveBacklogCard(doneBar = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_FOUNDATION_DONE_BAR_SCRIPT_PATH,
    operation: `close ${DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub Foundation Done bar',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 46,
    source: 'Steve overnight approval: make the Dev intelligence pipeline show whether source output flows or sits before adding more automation.',
    summary: 'Added a read-only Dev Hub Foundation Done bar showing extracted, atomized, synthesized, routed, and resolved/applied source counts from source-maturity truth.',
    whyItMatters: 'The Dev Hub now shows when routed intelligence is still sitting unresolved, so route-only progress cannot be mistaken for Foundation done.',
    nextAction: 'Done under dev-hub-foundation-done-bar-v1. Next safe slice: use this bar to pick the first source-family repair or Scoper readback without mutating live routes while Steve is asleep.',
    statusNote: `Closed with proof: npm run process:dev-hub-foundation-done-bar-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live bar summary: sources=${doneBar.summary?.sourceCount || 0}, extracted=${doneBar.summary?.stageCounts?.extracted || 0}, atomized=${doneBar.summary?.stageCounts?.atomized || 0}, synthesized=${doneBar.summary?.stageCounts?.synthesized || 0}, routed=${doneBar.summary?.stageCounts?.routed || 0}, resolved=${doneBar.summary?.stageCounts?.resolved || 0}, waitingRoutes=${doneBar.summary?.waitingRoutes || 0}. Routed-but-unapplied work is not counted as done; no route, destination, backlog recommendation, Harlan send, extraction, model call, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-FOUNDATION-DONE-BAR' }, ACTOR)
}

async function buildLiveDoneBar() {
  const foundationSnapshot = await getFoundationSnapshot()
  const extractionControl = await getExtractionControlSnapshot({ limit: 200 })
  return buildDevHubFoundationDoneBarFromInputs({
    foundationSnapshot,
    extractionControl,
    sourceContracts: getSourceContracts(),
    generatedAt: new Date().toISOString(),
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
    readRepoFile(DEV_FOUNDATION_DONE_BAR_JS_PATH),
    readRepoFile(DEV_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_FOUNDATION_DONE_BAR_APPROVAL_PATH,
    cardId: DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubFoundationDoneBarDogfoodProof()
    const liveDoneBar = await buildLiveDoneBar()
    const liveValidation = validateDevHubFoundationDoneBar(liveDoneBar)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_FOUNDATION_DONE_BAR_CLOSEOUT_KEY) || null

    addCheck(checks, liveCard?.id === DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID, 'live backlog card exists', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_FOUNDATION_DONE_BAR_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-foundation-done-bar-check'] === `node --env-file-if-exists=.env ${DEV_HUB_FOUNDATION_DONE_BAR_SCRIPT_PATH}`, 'package exposes focused Foundation Done bar proof', packageJson.scripts?.['process:dev-hub-foundation-done-bar-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood rejects routed-but-unapplied work as Foundation done', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Foundation Done bar validates', liveValidation.failures.join(', ') || DEV_HUB_FOUNDATION_DONE_BAR_CONTRACT_VERSION)
    addCheck(checks, count(liveDoneBar.summary?.sourceCount) >= 35, 'live readback covers source contracts', `${liveDoneBar.summary?.sourceCount || 0} sources`)
    addCheck(checks, count(liveDoneBar.summary?.stageCounts?.resolved) <= count(liveDoneBar.summary?.stageCounts?.routed), 'resolved count cannot exceed routed count', JSON.stringify(liveDoneBar.summary?.stageCounts || {}))
    addCheck(checks, count(liveDoneBar.summary?.waitingRoutes) >= count(liveDoneBar.summary?.routeReview?.pendingRoutes), 'waiting route pressure is visible', JSON.stringify({
      waitingRoutes: liveDoneBar.summary?.waitingRoutes,
      pendingRoutes: liveDoneBar.summary?.routeReview?.pendingRoutes,
      routedButUnresolvedSources: liveDoneBar.summary?.routedButUnresolvedSources,
    }))
    addCheck(checks, list(liveDoneBar.rows).length <= 48 && list(liveDoneBar.topGaps).length <= 10, 'Dev Hub Foundation Done bar payload is bounded', `${list(liveDoneBar.rows).length} rows / ${list(liveDoneBar.topGaps).length} gaps`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubFoundationDoneBarFromInputs') && devTeamHubSource.includes('foundationDoneBar'), 'Dev Hub payload includes foundationDoneBar', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Foundation Done bar from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Foundation Done bar implementation has no route apply, external send, model, extraction, or backlog write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_FOUNDATION_DONE_BAR_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID), 'closeout registry contains Dev Hub Foundation Done bar closeout', DEV_HUB_FOUNDATION_DONE_BAR_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID), 'verifier coverage source lists Dev Hub Foundation Done bar card', DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID)
    addCheck(checks, moduleSource.includes(DEV_HUB_FOUNDATION_DONE_BAR_PLAN_PATH) && moduleSource.includes(DEV_HUB_FOUNDATION_DONE_BAR_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_FOUNDATION_DONE_BAR_PLAN_PATH} + ${DEV_HUB_FOUNDATION_DONE_BAR_APPROVAL_PATH}`)

    const failedBeforeClose = checks.filter(check => !check.ok)
    if (args.closeCard && failedBeforeClose.length === 0) {
      closedCard = await closeLiveBacklogCard(liveDoneBar)
      addCheck(checks, closedCard?.lane === 'done', 'close-card wrote guarded done backlog state', closedCard ? `${closedCard.id}/${closedCard.lane}` : 'missing')
    } else if (args.closeCard) {
      addCheck(checks, false, 'close-card skipped because pre-close checks failed', `${failedBeforeClose.length} failed`)
    }

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: DEV_HUB_FOUNDATION_DONE_BAR_CARD_ID,
      closeoutKey: DEV_HUB_FOUNDATION_DONE_BAR_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveDoneBar: {
        status: liveDoneBar.status,
        summary: liveDoneBar.summary,
        topGaps: list(liveDoneBar.topGaps).slice(0, 5),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Foundation Done bar proof: ${result.status}`)
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
  console.error('Dev Hub Foundation Done bar proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
