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
  DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CONTRACT_VERSION,
  buildDevHubProposedCardSourceProofReadback,
  validateDevHubProposedCardSourceProofReadback,
} from '../lib/dev-hub-proposed-card-source-proof-readback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-overnight-builder'
const CARD_ID = 'DEV-HUB-MORNING-BUILD-REVIEW-SUMMARY-001'
const CLOSEOUT_KEY = 'dev-hub-morning-build-review-summary-v1'
const PLAN_PATH = 'docs/process/dev-hub-morning-build-review-summary-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-MORNING-BUILD-REVIEW-SUMMARY-001.json'
const SCRIPT_PATH = 'scripts/process-dev-hub-morning-build-review-summary-check.mjs'
const MODULE_PATH = 'lib/dev-hub-proposed-card-source-proof-readback.js'
const DEV_TEAM_HUB_PATH = 'lib/dev-team-hub.js'
const DEV_HTML_PATH = 'public/dev.html'
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

function sourceHasNoLiveSendOrPromotion(source = '') {
  const blocked = [
    /\bcreateBacklogItem\s*\(/,
    /\bupdateBacklogItem\s*\(/,
    /\bupsertFoundationCurrentSprintOverlay\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bsendTelegramMessage\s*\(/,
    /\bsendMail\s*\(/,
    /\bsendEmail\s*\(/,
    /\bfetch\s*\([^)]*,\s*\{[\s\S]*?method:\s*['"]POST['"]/,
    /\bcallLlm\s*\(/,
    /\brunYoutube/i,
    /\bwriteFile\s*\(/,
  ]
  return blocked.every(pattern => !pattern.test(source))
}

async function closeLiveBacklogCard(readback = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: `close ${CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  const review = readback.morningBuildReview || {}
  const update = {
    title: 'Expose Dev Hub morning build review summary',
    scope: 'foundation',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 68,
    source: 'Steve overnight approval: continue safe Dev-Hub intelligence cleanup while parking Harlan sends, card creation, sprint opening, and builds without exact approval.',
    summary: 'Added a compact read-only Morning Build Review summary and no-send Harlan digest preview inside the proposed-card source-proof readback.',
    whyItMatters: 'Steve can wake up to one concise build-review state that says what is ready, what has source proof, and what did not mutate overnight.',
    nextAction: 'Done under dev-hub-morning-build-review-summary-v1. Next safe slice: park exact card creation until Steve approves one proposedCardId, or continue with read-only business-source repair handoffs.',
    statusNote: `Closed with proof: npm run process:dev-hub-morning-build-review-summary-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Morning review summary: status=${review.status || 'missing'}, approvals=${review.approvalRequiredCount || 0}, proofReady=${review.sourceProofReadyCount || 0}, candidateProofRows=${review.candidateProofRowCount || 0}, lineageRefs=${review.sourceLineageRefCount || 0}, harlanPreview=${review.harlanDigestPreview?.status || 'missing'}, sendsMessageNow=${review.harlanDigestPreview?.sendsMessageNow === true}, cardsCreated=${review.cardsCreatedByReadback || 0}, buildsAuthorized=${review.buildAuthorizationsByReadback || 0}.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([CARD_ID]))[0]
  if (existing) return updateBacklogItem(CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-MORNING-BUILD-REVIEW-SUMMARY' }, ACTOR)
}

async function buildLiveReadback() {
  const traceResult = await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })
  const buildPortfolioReadback = buildDevHubBuildPortfolioReadback({ generatedAt: new Date().toISOString(), traceResult })
  const morningProposedCardsReadback = buildDevHubMorningProposedCardsReadback({ generatedAt: new Date().toISOString(), buildPortfolioReadback })
  const proposedCardApprovalPreflight = buildDevHubProposedCardApprovalPreflight({ generatedAt: new Date().toISOString(), morningProposedCardsReadback })
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
    uiSource,
    cssSource,
    closeoutRecords,
    coverageSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(MODULE_PATH),
    readRepoFile(DEV_TEAM_HUB_PATH),
    readRepoFile(DEV_HTML_PATH),
    readRepoFile(DEV_SOURCE_PROOF_JS_PATH),
    readRepoFile(DEV_SOURCE_PROOF_CSS_PATH),
    readRepoJson(CLOSEOUT_DATA_PATH),
    readRepoFile(COVERAGE_PATH),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: APPROVAL_PATH,
    cardId: CARD_ID,
  })

  await initFoundationDb()
  let closedCard = null
  try {
    const checks = []
    const liveReadback = await buildLiveReadback()
    const validation = validateDevHubProposedCardSourceProofReadback(liveReadback)
    const review = liveReadback.morningBuildReview || {}
    const liveCard = (await getBacklogItemsByIds([CARD_ID]))[0] || null
    const closeoutRecord = closeoutRecords.find(record => record.key === CLOSEOUT_KEY) || null
    const unsafeReview = {
      ...liveReadback,
      morningBuildReview: {
        ...review,
        harlanDigestPreview: { ...review.harlanDigestPreview, sendsMessageNow: true },
      },
    }
    const unsafeValidation = validateDevHubProposedCardSourceProofReadback(unsafeReview)

    addCheck(checks, Boolean(liveCard) || args.closeCard, 'live backlog card exists or close-card can create it', liveCard ? `${liveCard.id}/${liveCard.lane}` : 'missing; guarded close-card will create')
    addCheck(checks, approval.ok === true && approval.mode === 'v2', '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, packageJson.scripts?.['process:dev-hub-morning-build-review-summary-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused Morning Build Review Summary proof', packageJson.scripts?.['process:dev-hub-morning-build-review-summary-check'] || 'missing')
    addCheck(checks, validation.ok === true && liveReadback.contractVersion === DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CONTRACT_VERSION, 'source-proof readback validates with morning build review', validation.failures.join(', ') || liveReadback.contractVersion)
    addCheck(checks, unsafeValidation.ok === false && unsafeValidation.failures.includes('harlan_digest_preview_sent'), 'dogfood proves Harlan preview cannot send', unsafeValidation.failures.join(', '))
    addCheck(checks, review.status === 'ready_for_steve_review', 'morning build review is ready for Steve review', review.status || 'missing')
    addCheck(checks, count(review.approvalRequiredCount) >= 1 && count(review.approvalRequiredCount) === count(liveReadback.summary?.proofItemCount), 'morning review approval count matches source-proof rows', JSON.stringify(review))
    addCheck(checks, count(review.sourceProofReadyCount) === count(review.approvalRequiredCount), 'morning review all approvals have source proof', JSON.stringify(review))
    addCheck(checks, count(review.candidateProofRowCount) >= count(review.approvalRequiredCount) && count(review.sourceLineageRefCount) >= count(review.approvalRequiredCount), 'morning review carries candidate proof and lineage counts', JSON.stringify(review))
    addCheck(checks, review.harlanDigestPreview?.status === 'preview_only' && review.harlanDigestPreview?.sendsMessageNow === false && text(review.harlanDigestPreview?.messagePreview), 'Harlan digest is preview-only and does not send', JSON.stringify(review.harlanDigestPreview || {}))
    addCheck(checks, count(review.cardsCreatedByReadback) === 0 && count(review.buildAuthorizationsByReadback) === 0, 'morning review creates zero cards and authorizes zero builds', JSON.stringify(review))
    addCheck(checks, list(review.topItems).length >= 1 && list(review.topItems).every(item => item.proposedCardId && item.approvalPhrase), 'morning review exposes top items with approval phrases', list(review.topItems).map(item => item.proposedCardId).join(', '))
    addCheck(checks, moduleSource.includes('morningBuildReview') && moduleSource.includes('harlanDigestPreview') && moduleSource.includes('sendsMessageNow: false'), 'source-proof module owns morning review and no-send Harlan preview', MODULE_PATH)
    addCheck(checks, devTeamHubSource.includes('proposedCardSourceProofReadback'), 'Dev Hub payload still exposes proposedCardSourceProofReadback', DEV_TEAM_HUB_PATH)
    addCheck(checks, htmlSource.includes('id="proposed-card-source-proof-readback"') && uiSource.includes('proposed-card-morning-review') && uiSource.includes('Harlan sends now') && cssSource.includes('.proposed-card-morning-review'), 'Dev Hub UI renders Morning Build Review inside source-proof panel', 'existing source-proof panel')
    addCheck(checks, sourceHasNoLiveSendOrPromotion(`${moduleSource}\n${uiSource}`), 'Morning Build Review implementation has no live send, backlog write, model, extraction, or external path', 'source scan clean')
    addCheck(checks, closeoutRecord?.key === CLOSEOUT_KEY && list(closeoutRecord.backlogIds).includes(CARD_ID), 'closeout registry contains Morning Build Review closeout', CLOSEOUT_KEY)
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage source lists Morning Build Review card', CARD_ID)

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
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      checks,
      failures: failed,
      closedCard,
      liveReadback: {
        status: liveReadback.status,
        summary: liveReadback.summary,
        morningBuildReview: review,
      },
    }

    if (args.json) console.log(JSON.stringify(result, null, 2))
    else checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? `: ${check.detail}` : ''}`))
    if (!result.ok) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
