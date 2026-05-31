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
  DEV_HUB_SYNTHESIS_SCOPE_READBACK_APPROVAL_PATH,
  DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID,
  DEV_HUB_SYNTHESIS_SCOPE_READBACK_CLOSEOUT_KEY,
  DEV_HUB_SYNTHESIS_SCOPE_READBACK_CONTRACT_VERSION,
  DEV_HUB_SYNTHESIS_SCOPE_READBACK_PLAN_PATH,
  DEV_HUB_SYNTHESIS_SCOPE_READBACK_SCRIPT_PATH,
  buildDevHubSynthesisScopeReadback,
  buildDevHubSynthesisScopeReadbackDogfoodProof,
  validateDevHubSynthesisScopeReadback,
} from '../lib/dev-hub-synthesis-scope-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-synthesis-scope-readback.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_SYNTHESIS_SCOPE_JS_PATH = 'public/dev-synthesis-scope.js'
const DEV_SYNTHESIS_SCOPE_CSS_PATH = 'public/dev-synthesis-scope.css'
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
    /\brunGovernedSynthesis\s*\(/,
    /\bcallEmbedding\s*\(/,
    /\bbuildEmbedding/i,
    /\bproposeActionRoutes\s*\(/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\bsnoozeActionRoute\s*\(/,
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bupsertFoundationCurrentSprintOverlay\s*\(/,
    /\bsendTelegramMessage\s*\(/,
    /\bsendMail\s*\(/,
    /\bsendEmail\s*\(/,
    /\bfetch\s*\([^)]*,\s*\{[\s\S]*?method:\s*['"]POST['"]/,
    /\bcallLlm\s*\(/,
    /\brunYoutube/i,
    /\bupsertSynthesis/i,
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
  return htmlSource.includes('id="synthesis-scope"') &&
    htmlSource.includes('id="synthesis-scope-head-stats"') &&
    htmlSource.includes('/dev-synthesis-scope.css') &&
    htmlSource.includes('/dev-synthesis-scope.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('synthesisScopeReadback') &&
    uiSource.includes('No-run scope proof') &&
    uiSource.includes('refreshRunsStartedByReadback') &&
    cssSource.includes('.synthesis-scope') &&
    cssSource.includes('.synthesis-scope-summary') &&
    cssSource.includes('.synthesis-scope-stage')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_SYNTHESIS_SCOPE_READBACK_SCRIPT_PATH,
    operation: `close ${DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub synthesis scope readback',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 50,
    source: 'Steve overnight approval: make the Dev Hub intelligence pipe prove real-corpus synthesis instead of hidden demo/proof scope.',
    summary: 'Added a read-only Dev Hub Synthesis Scope panel showing proof scope, scheduled real-corpus refresh scope, job status, review buckets, and no-run/no-model boundaries.',
    whyItMatters: 'The Dev Hub now proves whether synthesis refresh is configured beyond the old 8-item proof lane without running synthesis or asking Steve to trust chat claims.',
    nextAction: 'Done under dev-hub-synthesis-scope-readback-v1. Next safe slice: only run or repair model-backed synthesis refresh when provider/model spend and route boundaries are explicitly approved.',
    statusNote: `Closed with proof: npm run process:dev-hub-synthesis-scope-readback-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live synthesis scope summary: proof=${readback.summary?.proofScopeKey || ''}/${readback.summary?.proofItemLimit || 0}, refresh=${readback.summary?.refreshScopeKey || ''}/${readback.summary?.refreshItemLimit || 0}, scheduledJob=${readback.summary?.scheduledRefreshJobPresent ? 'present' : 'missing'}, latest=${readback.summary?.scheduledRefreshLatestStatus || 'missing'}, readbackRuns=${readback.summary?.refreshRunsStartedByReadback || 0}, modelCalls=${readback.summary?.modelOrProviderCallsStarted || 0}. No synthesis refresh, model, embedding, atom, route, backlog, Scoper, Portfolio, Harlan, extraction, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-SYNTHESIS-SCOPE-READBACK' }, ACTOR)
}

async function buildLiveReadback() {
  const foundationSnapshot = await getFoundationSnapshot()
  return buildDevHubSynthesisScopeReadback({
    generatedAt: new Date().toISOString(),
    foundationJobs: foundationSnapshot.foundationJobs || {},
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
    readRepoFile(DEV_SYNTHESIS_SCOPE_JS_PATH),
    readRepoFile(DEV_SYNTHESIS_SCOPE_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_SYNTHESIS_SCOPE_READBACK_APPROVAL_PATH,
    cardId: DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubSynthesisScopeReadbackDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubSynthesisScopeReadback(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_SYNTHESIS_SCOPE_READBACK_CLOSEOUT_KEY) || null

    addCheck(checks, liveCard?.id === DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID, 'live backlog card exists', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_SYNTHESIS_SCOPE_READBACK_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-synthesis-scope-readback-check'] === `node --env-file-if-exists=.env ${DEV_HUB_SYNTHESIS_SCOPE_READBACK_SCRIPT_PATH}`, 'package exposes focused Synthesis Scope proof', packageJson.scripts?.['process:dev-hub-synthesis-scope-readback-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves real-corpus refresh scope and rejects readback-started synthesis/model work', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Synthesis Scope readback validates', liveValidation.failures.join(', ') || DEV_HUB_SYNTHESIS_SCOPE_READBACK_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'needs_review' || liveReadback.status === 'healthy', 'live readback returns an operator-safe status', liveReadback.status)
    addCheck(checks, liveReadback.summary?.refreshConfiguredForRealCorpus === true && liveReadback.summary?.proofAndRefreshSeparated === true, 'refresh scope is separated from proof scope', JSON.stringify({
      proof: `${liveReadback.summary?.proofScopeKey}/${liveReadback.summary?.proofItemLimit}`,
      refresh: `${liveReadback.summary?.refreshScopeKey}/${liveReadback.summary?.refreshItemLimit}`,
    }))
    addCheck(checks, count(liveReadback.summary?.refreshItemLimit) > count(liveReadback.summary?.proofItemLimit), 'refresh item limit is larger than proof item limit', `${liveReadback.summary?.proofItemLimit} -> ${liveReadback.summary?.refreshItemLimit}`)
    addCheck(checks, liveReadback.summary?.scheduledRefreshJobPresent === true, 'scheduled synthesis refresh job is visible from Foundation job registry', liveReadback.summary?.scheduledRefreshLatestStatus || 'missing')
    addCheck(checks, liveReadback.summary?.refreshRunsStartedByReadback === 0 && liveReadback.summary?.modelOrProviderCallsStarted === 0 && liveReadback.summary?.embeddingsStarted === 0, 'live readback starts zero refresh/model/embedding work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, liveReadback.summary?.synthesisRowsWrittenByReadback === 0 && liveReadback.summary?.actionRoutesProposedByReadback === 0 && liveReadback.summary?.destinationWritesByReadback === 0 && liveReadback.summary?.externalWritesByReadback === 0, 'live readback has zero synthesis/route/destination/external writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.flowStages).length <= 4 && list(liveReadback.reviewBuckets).length <= 5 && list(liveReadback.stuckSignals).length <= 5, 'Synthesis Scope rows are bounded', JSON.stringify({
      stages: list(liveReadback.flowStages).length,
      buckets: list(liveReadback.reviewBuckets).length,
      signals: list(liveReadback.stuckSignals).length,
    }))
    addCheck(checks, moduleSource.includes(DEV_HUB_SYNTHESIS_SCOPE_READBACK_PLAN_PATH) && moduleSource.includes(DEV_HUB_SYNTHESIS_SCOPE_READBACK_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_SYNTHESIS_SCOPE_READBACK_PLAN_PATH} + ${DEV_HUB_SYNTHESIS_SCOPE_READBACK_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubSynthesisScopeReadback') && devTeamHubSource.includes('synthesisScopeReadback'), 'Dev Hub payload includes synthesisScopeReadback from existing read models', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Synthesis Scope from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Synthesis Scope implementation has no refresh run, model, embedding, route, backlog, external send, extraction, or write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_SYNTHESIS_SCOPE_READBACK_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID), 'closeout registry contains Synthesis Scope closeout', DEV_HUB_SYNTHESIS_SCOPE_READBACK_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID), 'verifier coverage source lists Synthesis Scope card', DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID)

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
      cardId: DEV_HUB_SYNTHESIS_SCOPE_READBACK_CARD_ID,
      closeoutKey: DEV_HUB_SYNTHESIS_SCOPE_READBACK_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        reviewBuckets: liveReadback.reviewBuckets,
        stuckSignals: liveReadback.stuckSignals,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Synthesis Scope proof: ${result.status}`)
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
  console.error('Dev Hub Synthesis Scope proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
