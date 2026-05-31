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
  buildDevHubScoperEvidenceTraceReadback,
} from '../lib/dev-hub-scoper-evidence-trace-readback.js'
import {
  buildSourceFamilyGodModeMaturitySnapshot,
  evaluateSourceFamilyGodModeMaturity,
} from '../lib/source-family-god-mode-extractors.js'
import {
  DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_APPROVAL_PATH,
  DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID,
  DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CLOSEOUT_KEY,
  DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CONTRACT_VERSION,
  DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_PLAN_PATH,
  DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_SCRIPT_PATH,
  buildDevHubIntelligenceHygieneReadback,
  buildDevHubIntelligenceHygieneReadbackDogfoodProof,
  validateDevHubIntelligenceHygieneReadback,
} from '../lib/dev-hub-intelligence-hygiene-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-intelligence-hygiene-readback.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_HYGIENE_JS_PATH = 'public/dev-intelligence-hygiene.js'
const DEV_HYGIENE_CSS_PATH = 'public/dev-intelligence-hygiene.css'
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
    /\bupsertIntelligenceAtom\s*\(/,
    /\brecordIntelligenceAtomHit\s*\(/,
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
    /\bpersistSourceCrawlItem\s*\(/,
    /\bupsertSourceCrawlItem\s*\(/,
  ]
  return blocked.every(pattern => !pattern.test(source))
}

function sourceHasUiWiring({
  htmlSource = '',
  devJsSource = '',
  uiSource = '',
  cssSource = '',
} = {}) {
  return htmlSource.includes('id="intelligence-hygiene"') &&
    htmlSource.includes('id="intelligence-hygiene-head-stats"') &&
    htmlSource.includes('/dev-intelligence-hygiene.css') &&
    htmlSource.includes('/dev-intelligence-hygiene.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('intelligenceHygieneReadback') &&
    uiSource.includes('Read-only cleanup queue') &&
    uiSource.includes('falseFreshnessWarning') &&
    cssSource.includes('.intelligence-hygiene') &&
    cssSource.includes('.hygiene-summary') &&
    cssSource.includes('.hygiene-bucket')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_SCRIPT_PATH,
    operation: `close ${DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub intelligence hygiene readback',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 48,
    source: 'Steve overnight approval: make the Dev Hub loop self-cleaning and park blocked work instead of forcing unsafe repairs.',
    summary: 'Added a read-only Dev Hub Intelligence Hygiene panel across source pipeline gaps, action-route stale/duplicate pressure, Scoper parked rows, and source-family blockers.',
    whyItMatters: 'The Dev Hub now shows what to clean, park, or review next without turning cleanup into unsafe atom writes, route applies, or recommendation promotion.',
    nextAction: 'Done under dev-hub-intelligence-hygiene-readback-v1. Next safe slice: choose a specific hygiene bucket for a real repair only when fresh source evidence and approval boundary are clear.',
    statusNote: `Closed with proof: npm run process:dev-hub-intelligence-hygiene-readback-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live hygiene summary: cleanupSignals=${readback.summary?.totalCleanupPressure || 0}, atomizedGaps=${readback.summary?.atomizedGapSources || 0}, routeReviews=${readback.summary?.routeReviewItems || 0}, scoperParked=${readback.summary?.scoperParkedCandidates || 0}, sourceFamilyBlockedOrWaiting=${readback.summary?.sourceFamilyBlockedOrWaiting || 0}. No atom, fact, chunk, route, backlog, Scoper, Portfolio, Harlan, extraction, model, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-INTELLIGENCE-HYGIENE-READBACK' }, ACTOR)
}

async function buildLiveReadback() {
  const foundationSnapshot = await getFoundationSnapshot()
  const extractionControl = await getExtractionControlSnapshot({ limit: 200 })
  const foundationDoneBar = buildDevHubFoundationDoneBarFromInputs({
    foundationSnapshot,
    extractionControl,
    sourceContracts: getSourceContracts(),
    generatedAt: new Date().toISOString(),
  })
  const actionRouteReadback = buildDevHubActionRouteReadback({
    generatedAt: new Date().toISOString(),
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    backlogItems: foundationSnapshot.backlogItems || [],
  })
  const scoperEvidenceTraceReadback = buildDevHubScoperEvidenceTraceReadback({
    traceResult: await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 }),
    candidateLimit: 5,
    generatedAt: new Date().toISOString(),
  })
  const sourceFamilyGodModeMaturity = buildSourceFamilyGodModeMaturitySnapshot({ generatedAt: new Date().toISOString() })
  sourceFamilyGodModeMaturity.evaluation = evaluateSourceFamilyGodModeMaturity(sourceFamilyGodModeMaturity)
  return buildDevHubIntelligenceHygieneReadback({
    generatedAt: new Date().toISOString(),
    foundationDoneBar,
    actionRouteReadback,
    scoperEvidenceTraceReadback,
    sourceFamilyGodModeMaturity,
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
    readRepoFile(DEV_HYGIENE_JS_PATH),
    readRepoFile(DEV_HYGIENE_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_APPROVAL_PATH,
    cardId: DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubIntelligenceHygieneReadbackDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubIntelligenceHygieneReadback(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CLOSEOUT_KEY) || null

    addCheck(checks, liveCard?.id === DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID, 'live backlog card exists', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-intelligence-hygiene-readback-check'] === `node --env-file-if-exists=.env ${DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_SCRIPT_PATH}`, 'package exposes focused Intelligence Hygiene proof', packageJson.scripts?.['process:dev-hub-intelligence-hygiene-readback-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood ranks cleanup pressure and rejects false freshness/mutation', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Intelligence Hygiene readback validates', liveValidation.failures.join(', ') || DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'needs_cleanup' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, liveReadback.summary?.autoMutationCount === 0, 'live readback has zero mutation count', String(liveReadback.summary?.autoMutationCount || 0))
    addCheck(checks, count(liveReadback.summary?.totalCleanupPressure) >= count(liveReadback.summary?.scoperParkedCandidates), 'cleanup pressure includes parked Scoper pressure', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.atomizedGapSources) === 0 || Boolean(liveReadback.falseFreshnessWarning), 'atom-flow gaps carry false-freshness warning', liveReadback.falseFreshnessWarning || 'no atomized gaps')
    addCheck(checks, list(liveReadback.nextBuckets).length <= 6 && list(liveReadback.nextBuckets).length >= 1, 'Dev Hub Intelligence Hygiene next buckets are bounded and present', `${list(liveReadback.nextBuckets).length} buckets`)
    addCheck(checks, list(liveReadback.queues?.sourcePipeline).length <= 8 && list(liveReadback.queues?.routeNoise).length <= 6 && list(liveReadback.queues?.scoperParked).length <= 5 && list(liveReadback.queues?.sourceFamilyBlockers).length <= 8, 'Dev Hub Intelligence Hygiene queues are bounded', JSON.stringify({
      source: list(liveReadback.queues?.sourcePipeline).length,
      route: list(liveReadback.queues?.routeNoise).length,
      scoper: list(liveReadback.queues?.scoperParked).length,
      family: list(liveReadback.queues?.sourceFamilyBlockers).length,
    }))
    addCheck(checks, devTeamHubSource.includes('buildDevHubIntelligenceHygieneReadback') && devTeamHubSource.includes('intelligenceHygieneReadback'), 'Dev Hub payload includes intelligenceHygieneReadback from existing read models', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Intelligence Hygiene from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Intelligence Hygiene implementation has no atom, route, backlog, Scoper, external send, extraction, or model write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID), 'closeout registry contains Intelligence Hygiene closeout', DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID), 'verifier coverage source lists Intelligence Hygiene card', DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID)
    addCheck(checks, moduleSource.includes(DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_PLAN_PATH) && moduleSource.includes(DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_PLAN_PATH} + ${DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_APPROVAL_PATH}`)

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
      cardId: DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CARD_ID,
      closeoutKey: DEV_HUB_INTELLIGENCE_HYGIENE_READBACK_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        nextBuckets: liveReadback.nextBuckets,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Intelligence Hygiene proof: ${result.status}`)
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
  console.error('Dev Hub Intelligence Hygiene proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
