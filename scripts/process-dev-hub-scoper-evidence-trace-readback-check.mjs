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
  buildDevBuildOpportunityEvidenceTrace,
} from '../lib/dev-build-opportunity-evidence-trace.js'
import {
  DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_APPROVAL_PATH,
  DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID,
  DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CLOSEOUT_KEY,
  DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CONTRACT_VERSION,
  DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_PLAN_PATH,
  DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_SCRIPT_PATH,
  buildDevHubScoperEvidenceTraceReadback,
  buildDevHubScoperEvidenceTraceReadbackDogfoodProof,
  validateDevHubScoperEvidenceTraceReadback,
} from '../lib/dev-hub-scoper-evidence-trace-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-scoper-evidence-trace-readback.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const ROUTE_PATH = 'lib/foundation-build-intel-routes.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_SCOPER_TRACE_JS_PATH = 'public/dev-scoper-evidence-trace.js'
const DEV_SCOPER_TRACE_CSS_PATH = 'public/dev-scoper-evidence-trace.css'
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
    /\bpersistSourceCrawlItem\s*\(/,
    /\bupsertSourceCrawlItem\s*\(/,
    /\bupsertIntelligenceAtom\s*\(/,
  ]
  return blocked.every(pattern => !pattern.test(source))
}

function sourceHasUiWiring({
  htmlSource = '',
  devJsSource = '',
  uiSource = '',
  cssSource = '',
} = {}) {
  return htmlSource.includes('id="scoper-evidence-trace"') &&
    htmlSource.includes('id="scoper-trace-head-stats"') &&
    htmlSource.includes('/dev-scoper-evidence-trace.css') &&
    htmlSource.includes('/dev-scoper-evidence-trace.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('scoperEvidenceTraceReadback') &&
    uiSource.includes('Proposal-only') &&
    uiSource.includes('No auto-promotion') &&
    cssSource.includes('.scoper-evidence-trace') &&
    cssSource.includes('.scoper-trace-row') &&
    cssSource.includes('.scoper-trace-summary')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_SCRIPT_PATH,
    operation: `close ${DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub Scoper evidence trace readback',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 47,
    source: 'Steve overnight approval: keep building safe Dev-Hub intelligence slices, park approval-bound work, and continue.',
    summary: 'Added a read-only Dev Hub Scoper evidence trace panel showing which Director recommendations have raw atom/hit proof before Scoper/Portfolio review.',
    whyItMatters: 'The Dev Hub now shows build recommendation readiness from source evidence instead of hiding Scoper readiness inside a process check.',
    nextAction: 'Done under dev-hub-scoper-evidence-trace-readback-v1. Next safe slice: use Foundation Done plus Scoper trace to choose a source-family atom-flow repair or Dev Hub self-cleaning readback without auto-promoting recommendations.',
    statusNote: `Closed with proof: npm run process:dev-hub-scoper-evidence-trace-readback-check -- --close-card --json; npm run process:dev-build-scoper-evidence-trace-check -- --json --limit=5; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live Scoper trace summary: reviewed=${readback.summary?.reviewedCount || 0}, ready=${readback.summary?.readyForPortfolioCount || 0}, parked=${readback.summary?.parkedCount || 0}, sourceTraceReady=${readback.summary?.sourceTraceReadyCount || 0}, proposalOnly=${readback.summary?.proposalOnlyCount || 0}. No Director candidate promotion, backlog mutation, route mutation, Harlan send, extraction, model call, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-SCOPER-EVIDENCE-TRACE-READBACK' }, ACTOR)
}

async function buildLiveReadback() {
  const traceResult = await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })
  return buildDevHubScoperEvidenceTraceReadback({
    traceResult,
    candidateLimit: 5,
    generatedAt: new Date().toISOString(),
  })
}

async function main() {
  const args = parseArgs()
  const [
    packageJson,
    moduleSource,
    devTeamHubSource,
    routeSource,
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
    readRepoFile(ROUTE_PATH),
    readRepoFile(DEV_HTML_PATH),
    readRepoFile(DEV_JS_PATH),
    readRepoFile(DEV_SCOPER_TRACE_JS_PATH),
    readRepoFile(DEV_SCOPER_TRACE_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_APPROVAL_PATH,
    cardId: DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubScoperEvidenceTraceReadbackDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubScoperEvidenceTraceReadback(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CLOSEOUT_KEY) || null

    addCheck(checks, liveCard?.id === DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID, 'live backlog card exists', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-scoper-evidence-trace-readback-check'] === `node --env-file-if-exists=.env ${DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_SCRIPT_PATH}`, 'package exposes focused Scoper trace readback proof', packageJson.scripts?.['process:dev-hub-scoper-evidence-trace-readback-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood parks missing raw evidence and rejects auto-promotion', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Scoper trace readback validates', liveValidation.failures.join(', ') || DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CONTRACT_VERSION)
    addCheck(checks, count(liveReadback.summary?.reviewedCount) >= 1, 'live readback covers current Director candidates', `${liveReadback.summary?.reviewedCount || 0} reviewed`)
    addCheck(checks, count(liveReadback.summary?.readyForPortfolioCount) >= 1, 'at least one live candidate is ready after raw evidence trace', `${liveReadback.summary?.readyForPortfolioCount || 0} ready`)
    addCheck(checks, count(liveReadback.summary?.readyForPortfolioCount) <= count(liveReadback.summary?.sourceTraceReadyCount), 'ready count cannot exceed source-trace-ready count', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.autoPromotedCount) === 0 && count(liveReadback.summary?.proposalOnlyCount) === count(liveReadback.summary?.reviewedCount), 'live candidates remain proposal-only', JSON.stringify({
      proposalOnly: liveReadback.summary?.proposalOnlyCount,
      reviewed: liveReadback.summary?.reviewedCount,
      autoPromoted: liveReadback.summary?.autoPromotedCount,
    }))
    addCheck(checks, list(liveReadback.candidates).length <= 5, 'Dev Hub Scoper trace payload is bounded', `${list(liveReadback.candidates).length} candidates`)
    addCheck(checks, list(liveReadback.candidates).every(candidate => candidate.readyForPortfolio !== true || candidate.rawTraceReady === true), 'Portfolio-ready rows require raw atom and raw hit', list(liveReadback.candidates).filter(candidate => candidate.readyForPortfolio && !candidate.rawTraceReady).map(candidate => `${candidate.rank}:${candidate.title}`).join(', ') || 'all ready rows traced')
    addCheck(checks, routeSource.includes('buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })') && devTeamHubSource.includes('scoperEvidenceTraceReadback'), 'Dev Hub API payload includes scoperEvidenceTraceReadback from existing trace builder', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Scoper evidence trace from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLiveMutation(`${moduleSource}\n${uiSource}`), 'Scoper trace readback implementation has no route apply, external send, extraction, model, or backlog write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID), 'closeout registry contains Scoper evidence trace readback closeout', DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID), 'verifier coverage source lists Scoper evidence trace readback card', DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID)
    addCheck(checks, moduleSource.includes(DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_PLAN_PATH) && moduleSource.includes(DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_PLAN_PATH} + ${DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_APPROVAL_PATH}`)

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
      cardId: DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID,
      closeoutKey: DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CLOSEOUT_KEY,
      applied: args.closeCard,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        candidates: list(liveReadback.candidates).map(candidate => ({
          rank: candidate.rank,
          title: candidate.title,
          sourceTraceStatus: candidate.sourceTraceStatus,
          scoperStatus: candidate.scoperStatus,
          readyForPortfolio: candidate.readyForPortfolio,
        })),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Hub Scoper evidence trace readback proof: ${result.status}`)
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
  console.error('Dev Hub Scoper evidence trace readback proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
