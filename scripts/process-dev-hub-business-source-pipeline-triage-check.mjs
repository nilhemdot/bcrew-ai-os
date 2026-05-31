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
  buildDevHubFoundationDoneBarFromInputs,
} from '../lib/dev-hub-foundation-done-bar.js'
import {
  DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_APPROVAL_PATH,
  DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID,
  DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CLOSEOUT_KEY,
  DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CONTRACT_VERSION,
  DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_PLAN_PATH,
  DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_SCRIPT_PATH,
  buildDevHubBusinessSourcePipelineTriage,
  buildDevHubBusinessSourcePipelineTriageDogfoodProof,
  validateDevHubBusinessSourcePipelineTriage,
} from '../lib/dev-hub-business-source-pipeline-triage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-business-source-pipeline-triage.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_BUSINESS_SOURCE_JS_PATH = 'public/dev-business-source-pipeline-triage.js'
const DEV_BUSINESS_SOURCE_CSS_PATH = 'public/dev-business-source-pipeline-triage.css'
const CLOSEOUT_DATA_PATH = 'data/foundation-build-closeouts/source-maturity-core-records.json'
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
    /\brun.*(Fub|FUB|ClickUp|Sheets|Drive|SourceSync|Extraction)/,
    /\b(runConnectorProbe|startConnectorProbe|connectorProbe\s*\()/i,
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bupsertFoundationCurrentSprintOverlay\s*\(/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\bsnoozeActionRoute\s*\(/,
    /\brerouteActionRoute\s*\(/,
    /\bproposeActionRoutes\s*\(/,
    /\bcreateScoper/i,
    /\bupsertScoper/i,
    /\bcreatePortfolio/i,
    /\bupsertPortfolio/i,
    /\bsendTelegramMessage\s*\(/,
    /\bsendMail\s*\(/,
    /\bsendEmail\s*\(/,
    /\bfetch\s*\([^)]*,\s*\{[\s\S]*?method:\s*['"]POST['"]/,
    /\bcallLlm\s*\(/,
    /\brunGovernedSynthesis\s*\(/,
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
  return htmlSource.includes('id="business-source-triage"') &&
    htmlSource.includes('id="business-source-head-stats"') &&
    htmlSource.includes('/dev-business-source-pipeline-triage.css') &&
    htmlSource.includes('/dev-business-source-pipeline-triage.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('businessSourcePipelineTriage') &&
    uiSource.includes('Read-only business source triage') &&
    uiSource.includes('staleAtomFlowCount') &&
    cssSource.includes('.business-source-triage') &&
    cssSource.includes('.business-source-summary') &&
    cssSource.includes('.business-source-family') &&
    cssSource.includes('.business-source-grid')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_SCRIPT_PATH,
    operation: `close ${DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub business source pipeline triage',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 57,
    source: 'Steve overnight approval: keep building safe Dev-Hub intelligence visibility while showing which business sources actually flow through the pipe.',
    summary: 'Added a read-only Dev Hub Business Sources panel that groups FUB/CRM, KPI/Supabase, Sheets/Owners, ClickUp, and Drive/Docs by extraction, atom flow, synthesis, route, and resolved proof.',
    whyItMatters: 'The Dev Hub can now tell the difference between connected dashboards and source families that truly feed current intelligence before more hub or Director work depends on them.',
    nextAction: 'Done under dev-hub-business-source-pipeline-triage-v1. Next safe slice: choose one stale business source family repair or park approval-bound connector/extraction work until Steve is awake.',
    statusNote: `Closed with proof: npm run process:dev-hub-business-source-pipeline-triage-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live business-source summary: sources=${readback.summary?.businessSourceCount || 0}, families=${readback.summary?.familyCount || 0}, staleAtomFlow=${readback.summary?.staleAtomFlowCount || 0}, extractedOnly=${readback.summary?.extractedNotAtomizedCount || 0}, waitingRoutes=${readback.summary?.waitingRoutes || 0}, resolved=${readback.summary?.resolvedCount || 0}, sourceRunsStarted=${readback.summary?.extractionRunsStarted || 0}, connectorProbes=${readback.summary?.connectorProbesStarted || 0}, mutations=${readback.summary?.autoMutationCount || 0}. No FUB/KPI/Sheets/ClickUp/Drive sync, connector probe, extraction, atom/fact/synthesis/route/destination/backlog/Scoper/Portfolio write, model call, Harlan send, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-BUSINESS-SOURCE-PIPELINE-TRIAGE' }, ACTOR)
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
  return buildDevHubBusinessSourcePipelineTriage({
    generatedAt: new Date().toISOString(),
    foundationDoneBar,
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
    readRepoFile(DEV_BUSINESS_SOURCE_JS_PATH),
    readRepoFile(DEV_BUSINESS_SOURCE_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_APPROVAL_PATH,
    cardId: DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubBusinessSourcePipelineTriageDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubBusinessSourcePipelineTriage(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-business-source-pipeline-triage-check'] === `node --env-file-if-exists=.env ${DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_SCRIPT_PATH}`, 'package exposes focused Business Source Pipeline proof', packageJson.scripts?.['process:dev-hub-business-source-pipeline-triage-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves stale/extracted-only business sources and rejects false complete or mutation', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Business Source Pipeline readback validates', liveValidation.failures.join(', ') || DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'needs_source_flow' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.businessSourceCount) >= 5, 'live readback covers business source families', `${liveReadback.summary?.businessSourceCount || 0} sources / ${liveReadback.summary?.familyCount || 0} families`)
    addCheck(checks, count(liveReadback.summary?.staleAtomFlowCount) + count(liveReadback.summary?.extractedNotAtomizedCount) >= 1, 'live readback exposes stale or extracted-only business flow instead of false green', JSON.stringify({
      staleAtomFlow: liveReadback.summary?.staleAtomFlowCount,
      extractedOnly: liveReadback.summary?.extractedNotAtomizedCount,
      dashboardOnlyOrStale: liveReadback.summary?.dashboardOnlyOrStaleCount,
    }))
    addCheck(checks, count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0, 'live readback starts zero extraction/sync/probe work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.autoMutationCount) === 0 && count(liveReadback.summary?.atomRowsWrittenByReadback) === 0 && count(liveReadback.summary?.factRowsWrittenByReadback) === 0 && count(liveReadback.summary?.synthesisRowsWrittenByReadback) === 0, 'live readback writes zero intelligence rows', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routeMutationsByReadback) === 0 && count(liveReadback.summary?.destinationWritesByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0, 'live readback performs zero route/destination/backlog/Scoper/Portfolio writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback performs zero Harlan/external writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.rows).length <= 16 && list(liveReadback.familyBuckets).length <= 6 && list(liveReadback.queues?.staleAtomFlow).length <= 8 && list(liveReadback.queues?.extractedNotAtomized).length <= 6 && list(liveReadback.queues?.waitingRoutes).length <= 8 && list(liveReadback.queues?.nextFamilies).length <= 6, 'Business Source Pipeline rows are bounded', JSON.stringify({
      rows: list(liveReadback.rows).length,
      families: list(liveReadback.familyBuckets).length,
      stale: list(liveReadback.queues?.staleAtomFlow).length,
      extractedOnly: list(liveReadback.queues?.extractedNotAtomized).length,
      waitingRoutes: list(liveReadback.queues?.waitingRoutes).length,
      nextFamilies: list(liveReadback.queues?.nextFamilies).length,
    }))
    addCheck(checks, moduleSource.includes(DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_PLAN_PATH) && moduleSource.includes(DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_PLAN_PATH} + ${DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubBusinessSourcePipelineTriage') && devTeamHubSource.includes('businessSourcePipelineTriage'), 'Dev Hub payload includes businessSourcePipelineTriage from Foundation Done truth', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Business Source Pipeline from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Business Source Pipeline implementation has no source sync, extraction, connector, intelligence, route, destination, Harlan, model, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID), 'closeout registry contains Business Source Pipeline closeout', DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID), 'verifier coverage source lists Business Source Pipeline card', DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID)

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
      cardId: DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CARD_ID,
      closeoutKey: DEV_HUB_BUSINESS_SOURCE_PIPELINE_TRIAGE_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        familyBuckets: liveReadback.familyBuckets,
        queueCounts: Object.fromEntries(Object.entries(liveReadback.queues || {}).map(([key, value]) => [key, list(value).length])),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Business Source Pipeline proof: ${result.status}`)
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
  console.error('Dev Hub Business Source Pipeline proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
