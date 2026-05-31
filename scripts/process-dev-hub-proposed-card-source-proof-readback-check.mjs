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
  buildDevHubProposedCardApprovalPreflight,
} from '../lib/dev-hub-proposed-card-approval-preflight.js'
import {
  DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_APPROVAL_PATH,
  DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID,
  DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CLOSEOUT_KEY,
  DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CONTRACT_VERSION,
  DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_PLAN_PATH,
  DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_SCRIPT_PATH,
  buildDevHubProposedCardSourceProofReadback,
  buildDevHubProposedCardSourceProofReadbackDogfoodProof,
  validateDevHubProposedCardSourceProofReadback,
} from '../lib/dev-hub-proposed-card-source-proof-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const MODULE_PATH = 'lib/dev-hub-proposed-card-source-proof-readback.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
const DEV_JS_PATH = 'public/dev.js'
const DEV_SOURCE_PROOF_JS_PATH = 'public/dev-proposed-card-source-proof-readback.js'
const DEV_SOURCE_PROOF_CSS_PATH = 'public/dev-proposed-card-source-proof-readback.css'
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
  return htmlSource.includes('id="proposed-card-source-proof-readback"') &&
    htmlSource.includes('id="proposed-card-source-proof-readback-head-stats"') &&
    htmlSource.includes('/dev-proposed-card-source-proof-readback.css') &&
    htmlSource.includes('/dev-proposed-card-source-proof-readback.js') &&
    devJsSource.includes("new CustomEvent('devhub:snapshot'") &&
    devJsSource.includes("new CustomEvent('devhub:error'") &&
    uiSource.includes('proposedCardSourceProofReadback') &&
    uiSource.includes('Source proof only') &&
    uiSource.includes('candidateProofRowCount') &&
    cssSource.includes('.proposed-card-source-proof-readback') &&
    cssSource.includes('.proposed-card-source-proof-summary') &&
    cssSource.includes('.proposed-card-source-proof-row')
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_SCRIPT_PATH,
    operation: `close ${DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const update = {
    title: 'Expose Dev Hub proposed-card source proof readback',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 67,
    source: 'Steve overnight approval: continue safe Dev-Hub intelligence cleanup while parking card creation, sprint opening, and builds without exact approval.',
    summary: 'Added a read-only Dev Hub source-proof readback that links proposed-card approval rows to Portfolio groups and raw atom/hit candidate proof.',
    whyItMatters: 'Steve can inspect the evidence behind each proposed build card before approving card creation, instead of trusting a tidy proposal row without source proof.',
    nextAction: 'Done under dev-hub-proposed-card-source-proof-readback-v1. Next safe slice: prepare a read-only approval outcome/no-op packet or wait for Steve to approve an exact proposed card ID before any backlog creation.',
    statusNote: `Closed with proof: npm run process:dev-hub-proposed-card-source-proof-readback-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live source-proof summary: proofRows=${readback.summary?.proofItemCount || 0}, sourceProofReady=${readback.summary?.sourceProofReadyCount || 0}, candidateProofRows=${readback.summary?.candidateProofRowCount || 0}, sourceLineageRefs=${readback.summary?.sourceLineageRefCount || 0}, cardsCreated=${readback.summary?.cardsCreatedByReadback || 0}, backlogWrites=${readback.summary?.backlogRecordsWrittenByReadback || 0}, sprintOpened=${readback.summary?.currentSprintOpenedByReadback || 0}, buildsAuthorized=${readback.summary?.buildAuthorizationsByReadback || 0}, harlanSends=${readback.summary?.harlanSendsByReadback || 0}. No backlog, Scoper, Portfolio, Current Sprint, approval, route, destination, Harlan, extraction, connector, browser, model, build, or external write is performed by this proof readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-PROPOSED-CARD-SOURCE-PROOF-READBACK' }, ACTOR)
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
  const proposedCardApprovalPreflight = buildDevHubProposedCardApprovalPreflight({
    generatedAt: new Date().toISOString(),
    morningProposedCardsReadback,
  })
  return buildDevHubProposedCardSourceProofReadback({
    generatedAt: new Date().toISOString(),
    buildPortfolioReadback,
    morningProposedCardsReadback,
    proposedCardApprovalPreflight,
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
    readRepoFile(DEV_SOURCE_PROOF_JS_PATH),
    readRepoFile(DEV_SOURCE_PROOF_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_APPROVAL_PATH,
    cardId: DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const dogfood = buildDevHubProposedCardSourceProofReadbackDogfoodProof()
    const liveReadback = await buildLiveReadback()
    const liveValidation = validateDevHubProposedCardSourceProofReadback(liveReadback)
    const liveCard = (await getBacklogItemsByIds([DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CLOSEOUT_KEY) || null

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-proposed-card-source-proof-readback-check'] === `node --env-file-if-exists=.env ${DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_SCRIPT_PATH}`, 'package exposes focused Proposed Card Source Proof proof', packageJson.scripts?.['process:dev-hub-proposed-card-source-proof-readback-check'] || 'missing')
    addCheck(checks, dogfood.ok === true, 'dogfood proves source proof fails if raw atom/hit trace disappears', dogfood.invariant)
    addCheck(checks, liveValidation.ok === true, 'live Proposed Card Source Proof readback validates', liveValidation.failures.join(', ') || DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CONTRACT_VERSION)
    addCheck(checks, liveReadback.status === 'source_proof_ready', 'live readback returns source-proof-ready status', liveReadback.status)
    addCheck(checks, count(liveReadback.summary?.proofItemCount) >= 1, 'live readback exposes source-proof rows', `${liveReadback.summary?.proofItemCount || 0} rows`)
    addCheck(checks, count(liveReadback.summary?.sourceProofReadyCount) === count(liveReadback.summary?.proofItemCount) && count(liveReadback.summary?.missingProofCount) === 0, 'all live rows have source proof ready', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.candidateProofRowCount) >= count(liveReadback.summary?.proofItemCount), 'live rows include candidate proof rows', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.sourceLineageRefCount) >= count(liveReadback.summary?.proofItemCount), 'live rows include source lineage refs', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.cardsCreatedByReadback) === 0 && count(liveReadback.summary?.backlogRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.currentSprintOpenedByReadback) === 0 && count(liveReadback.summary?.buildAuthorizationsByReadback) === 0, 'live readback creates zero cards, backlog records, sprint items, or build authorizations', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, list(liveReadback.proofRows).length <= 6, 'source-proof payload is bounded', `${list(liveReadback.proofRows).length} rows`)
    addCheck(checks, list(liveReadback.proofRows).every(row => row.status === 'read_only_source_proof' && row.proofStatus === 'source_proof_ready' && row.cardCreatedNow === false && row.backlogWrittenNow === false && row.buildAuthorizedNow === false && row.candidateProofCount >= 1 && row.sourceLineageCount >= 1), 'every proof row is read-only with candidate proof and no mutation flags', list(liveReadback.proofRows).map(row => `${row.proposedCardId}:${row.candidateProofCount}:${row.sourceLineageCount}`).join(', '))
    addCheck(checks, list(liveReadback.proofRows).flatMap(row => list(row.candidateProofs)).every(candidate => candidate.rawAtomId && candidate.rawHitId && candidate.readyForPortfolio === true), 'every candidate proof has raw atom/hit trace and Portfolio readiness', list(liveReadback.proofRows).flatMap(row => list(row.candidateProofs)).map(candidate => `${candidate.rawAtomId}/${candidate.rawHitId}`).join(', '))
    addCheck(checks, count(liveReadback.summary?.scoperRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.portfolioRecordsWrittenByReadback) === 0 && count(liveReadback.summary?.approvalRecordsWrittenByReadback) === 0, 'live readback performs zero Scoper/Portfolio/approval writes', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.routeRecordsMutatedByReadback) === 0 && count(liveReadback.summary?.destinationRecordsMutatedByReadback) === 0, 'live readback performs zero route or destination mutations', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, count(liveReadback.summary?.harlanSendsByReadback) === 0 && count(liveReadback.summary?.extractionRunsStarted) === 0 && count(liveReadback.summary?.connectorProbesStarted) === 0 && count(liveReadback.summary?.browserSessionsStarted) === 0 && count(liveReadback.summary?.modelCallsStarted) === 0 && count(liveReadback.summary?.externalWritesByReadback) === 0, 'live readback starts zero Harlan/source/browser/model/external work', JSON.stringify(liveReadback.summary || {}))
    addCheck(checks, moduleSource.includes(DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_PLAN_PATH) && moduleSource.includes(DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_APPROVAL_PATH), 'module declares plan and approval paths', `${DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_PLAN_PATH} + ${DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_APPROVAL_PATH}`)
    addCheck(checks, devTeamHubSource.includes('buildDevHubProposedCardSourceProofReadback') && devTeamHubSource.includes('proposedCardSourceProofReadback'), 'Dev Hub payload includes proposedCardSourceProofReadback from Portfolio and approval rows', DEV_TEAM_HUB_PATH)
    addCheck(checks, sourceHasUiWiring({ htmlSource, devJsSource, uiSource, cssSource }), 'Dev Hub UI renders Proposed Card Source Proof from source-backed snapshot events', 'html panel + event dispatch + standalone renderer + standalone CSS')
    addCheck(checks, sourceHasNoLivePromotion(`${moduleSource}\n${uiSource}`), 'Proposed Card Source Proof implementation has no backlog, Scoper, Portfolio, Harlan, route, model, extraction, or external write path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID), 'closeout registry contains Proposed Card Source Proof closeout', DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID), 'verifier coverage source lists Proposed Card Source Proof card', DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID)

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
      cardId: DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID,
      closeoutKey: DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CLOSEOUT_KEY,
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
        proofRows: list(liveReadback.proofRows).map(row => ({
          proofItemId: row.proofItemId,
          proposedCardId: row.proposedCardId,
          sourcePortfolioGroupId: row.sourcePortfolioGroupId,
          portfolioRank: row.portfolioRank,
          portfolioScore: row.portfolioScore,
          portfolioDecision: row.portfolioDecision,
          title: row.title,
          candidateProofCount: row.candidateProofCount,
          sourceLineageCount: row.sourceLineageCount,
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
