#!/usr/bin/env node

import process from 'node:process'
import {
  BUILD_INTEL_INTAKE_CLOSEOUT_KEY,
  CREATOR_WATCHLIST_CARD_ID,
  buildCreatorWatchlistSnapshot,
  validateCreatorWatchlistEntry,
} from '../lib/build-intel-watchlist.js'
import {
  MULTIMODAL_EXTRACTOR_CARD_ID,
  buildMultimodalExtractorContractSnapshot,
  validateMultimodalExtractionEnvelope,
} from '../lib/multimodal-extractor-contract.js'
import {
  RESEARCH_INBOX_CARD_ID,
  buildResearchInboxContractSnapshot,
  buildResearchInboxPromotionProposal,
  validateResearchInboxItem,
} from '../lib/research-inbox.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'

const CARD_IDS = [
  CREATOR_WATCHLIST_CARD_ID,
  MULTIMODAL_EXTRACTOR_CARD_ID,
  RESEARCH_INBOX_CARD_ID,
]

const PLAN_REFS = {
  [CREATOR_WATCHLIST_CARD_ID]: 'docs/process/creator-watchlist-001-plan.md',
  [MULTIMODAL_EXTRACTOR_CARD_ID]: 'docs/process/multimodal-extractor-001-plan.md',
  [RESEARCH_INBOX_CARD_ID]: 'docs/process/research-inbox-001-plan.md',
}

const APPROVAL_REFS = {
  [CREATOR_WATCHLIST_CARD_ID]: 'docs/process/approvals/CREATOR-WATCHLIST-001.json',
  [MULTIMODAL_EXTRACTOR_CARD_ID]: 'docs/process/approvals/MULTIMODAL-EXTRACTOR-001.json',
  [RESEARCH_INBOX_CARD_ID]: 'docs/process/approvals/RESEARCH-INBOX-001.json',
}

function parseArgs(argv) {
  return argv.reduce((acc, arg) => {
    if (!arg.startsWith('--')) return acc
    const [key, value] = arg.slice(2).split('=')
    acc[key] = value ?? true
    return acc
  }, {})
}

function addFinding(findings, ok, label, detail = '') {
  if (ok) return
  findings.push({ label, detail })
}

function makeValidEnvelope(overrides = {}) {
  return {
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    sourceType: 'public_youtube_video',
    sourceUrl: 'https://www.youtube.com/watch?v=-WCNwxz3uoM',
    accessClass: 'public_permitted',
    rightsClass: 'public_reference_internal_learning',
    contentUseBoundary: 'internal Build Intel learning only',
    evidenceLevels: ['transcript_text', 'visual_model_observation'],
    route: {
      provider: 'gemini',
      model: 'video-understanding-route',
      authPath: 'api_route',
      estimatedCostUsd: 0.05,
    },
    observations: [{ timestamp: '00:01:00', text: 'Builder demonstrates a workflow.' }],
    sourceAnchors: [{ type: 'timestamp', value: '00:01:00' }],
    recommendation: 'adapt',
    confidence: 0.8,
    captureMethod: 'official_or_video_model_first',
    autoBacklogMutation: false,
    ...overrides,
  }
}

function makeValidInboxItem(overrides = {}) {
  return {
    sourceRef: 'https://www.youtube.com/watch?v=-WCNwxz3uoM',
    sourceType: 'youtube',
    whySteveCared: 'Builder showed an AIOS workflow pattern.',
    plainEnglishTakeaway: 'The workflow can improve how AIOS scopes Build Intel ideas.',
    systemFit: 'Foundation intake and future Build Scoper proposal flow.',
    relatedCards: [CREATOR_WATCHLIST_CARD_ID, MULTIMODAL_EXTRACTOR_CARD_ID],
    recommendation: 'Consider adding a bounded extraction proof.',
    evidenceLinks: ['https://www.youtube.com/watch?v=-WCNwxz3uoM&t=60s'],
    owner: 'Steve+Codex',
    proposedDisposition: 'enrich_existing_card',
    status: 'proposal_ready',
    autoCreateBacklogCard: false,
    ...overrides,
  }
}

function cardFilter(args) {
  const requested = String(args.card || '').trim()
  if (!requested) return new Set(CARD_IDS)
  return new Set([requested])
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const requestedCards = cardFilter(args)
  const findings = []
  const snapshot = await getFoundationSnapshot()
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds(CARD_IDS)
  const backlogById = new Map((snapshot.backlogItems || []).map(item => [item.id, item]))
  const sprintItemById = new Map((activeSprint.items || []).map(item => [item.cardId, item]))

  for (const cardId of CARD_IDS) {
    if (!requestedCards.has(cardId)) continue
    const approval = await validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: APPROVAL_REFS[cardId],
      cardId,
    })
    const latestPass = planCriticRuns.find(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8)
    const backlogCard = backlogById.get(cardId)
    const sprintItem = sprintItemById.get(cardId)
    addFinding(findings, approval.ok && approval.mode === 'v2', `${cardId} approval file is valid`, approval.failures?.map(item => item.check).join(', ') || '')
    addFinding(findings, latestPass, `${cardId} has a Plan Critic pass row`, latestPass ? `${latestPass.score}` : 'missing')
    addFinding(findings, backlogCard, `${cardId} exists in live backlog`)
    addFinding(findings, sprintItem && PLAN_REFS[cardId] === sprintItem.planRef, `${cardId} sprint item carries plan ref`, sprintItem?.planRef || 'missing')
  }

  if (requestedCards.has(CREATOR_WATCHLIST_CARD_ID)) {
    const watchlist = buildCreatorWatchlistSnapshot()
    const byName = new Set(watchlist.entries.map(entry => entry.displayName))
    const allValid = watchlist.entries.every(entry => validateCreatorWatchlistEntry(entry).ok)
    addFinding(findings, watchlist.status === 'ready', 'creator watchlist status is ready', watchlist.status)
    addFinding(findings, watchlist.summary.buildIntelCount >= 29, 'creator watchlist has expanded Build Intel entries', String(watchlist.summary.buildIntelCount))
    addFinding(findings, watchlist.summary.marketingContentLaterCount === 4, 'creator watchlist has 4 marketing-content-later entries', String(watchlist.summary.marketingContentLaterCount))
    addFinding(findings, allValid, 'creator watchlist entries validate')
    addFinding(findings, byName.has('Mark Kashef') && byName.has('ICOR with Tom | AI Productivity') && byName.has('Nick Saraev') && byName.has('Alex Finn') && byName.has('OpenHuman / tinyhumansai'), 'priority Build Intel names are present')
    addFinding(findings, watchlist.entries.every(entry => entry.approvedForExtractionThisSprint === false), 'watchlist does not approve extraction this sprint')
    addFinding(findings, watchlist.extractionStarted === false, 'watchlist proof starts no extraction')
  }

  if (requestedCards.has(MULTIMODAL_EXTRACTOR_CARD_ID)) {
    const contract = buildMultimodalExtractorContractSnapshot()
    const validPublic = validateMultimodalExtractionEnvelope(makeValidEnvelope())
    const rejectedScreenshot = validateMultimodalExtractionEnvelope(makeValidEnvelope({
      evidenceLevels: ['transcript_text', 'screenshot_keyframe_reference'],
      screenshotStoragePolicy: '',
      visualEvidenceUseBoundary: '',
    }))
    const rejectedPaidNoPreflight = validateMultimodalExtractionEnvelope(makeValidEnvelope({
      sourceId: 'SRC-SKOOL-001',
      sourceType: 'authorized_skool_lesson',
      sourceUrl: 'https://www.skool.com/earlyaidopters',
      accessClass: 'authorized_paid_private',
      accountPreflight: { approved: false },
    }))
    const rejectedMutation = validateMultimodalExtractionEnvelope(makeValidEnvelope({ autoBacklogMutation: true }))
    addFinding(findings, contract.status === 'ready' && contract.contractOnly === true, 'multimodal extractor contract is ready and contract-only')
    addFinding(findings, contract.publicYouTubePolicy.bulkBrowserScreenshot === 'blocked', 'public YouTube bulk browser screenshot is blocked')
    addFinding(findings, contract.paidPrivatePolicy.requiresAccountPreflight === true, 'paid/private policy requires account preflight')
    addFinding(findings, validPublic.ok, 'valid public video envelope passes', validPublic.findings.join(', '))
    addFinding(findings, !rejectedScreenshot.ok && rejectedScreenshot.findings.includes('screenshot_storage_policy_missing'), 'screenshot storage without policy is rejected')
    addFinding(findings, !rejectedPaidNoPreflight.ok && rejectedPaidNoPreflight.findings.includes('account_preflight_required'), 'paid source without preflight is rejected')
    addFinding(findings, !rejectedMutation.ok && rejectedMutation.findings.includes('auto_backlog_mutation_forbidden'), 'auto backlog mutation is rejected by extractor contract')
  }

  if (requestedCards.has(RESEARCH_INBOX_CARD_ID)) {
    const contract = buildResearchInboxContractSnapshot()
    const beforeBacklogCount = (snapshot.backlogItems || []).length
    const validItem = validateResearchInboxItem(makeValidInboxItem())
    const invalidItem = validateResearchInboxItem(makeValidInboxItem({ sourceRef: '', evidenceLinks: [], autoCreateBacklogCard: true }))
    const proposal = buildResearchInboxPromotionProposal(makeValidInboxItem())
    const afterBacklogCount = (await getFoundationSnapshot()).backlogItems.length
    addFinding(findings, contract.status === 'ready' && contract.proposalOnly === true, 'research inbox contract is proposal-only')
    addFinding(findings, contract.autoMutationAllowed === false, 'research inbox auto mutation is disabled')
    addFinding(findings, contract.buildScoperOutputTarget === RESEARCH_INBOX_CARD_ID, 'Build Scoper output target is Research Inbox')
    addFinding(findings, validItem.ok, 'valid research inbox item passes', validItem.findings.join(', '))
    addFinding(findings, !invalidItem.ok && invalidItem.findings.includes('auto_create_backlog_forbidden'), 'invalid auto-create inbox item is rejected')
    addFinding(findings, proposal.ok && proposal.proposalOnly === true && proposal.writesBacklog === false, 'promotion returns proposal without backlog write')
    addFinding(findings, beforeBacklogCount === afterBacklogCount, 'research inbox proof does not mutate backlog count', `${beforeBacklogCount}->${afterBacklogCount}`)
  }

  const output = {
    status: findings.length ? 'risk' : 'healthy',
    closeoutKey: BUILD_INTEL_INTAKE_CLOSEOUT_KEY,
    requestedCards: Array.from(requestedCards),
    summary: {
      cardsChecked: Array.from(requestedCards).length,
      backlogCount: (snapshot.backlogItems || []).length,
      sprintId: activeSprint.sprint?.sprintId || null,
      currentStages: Object.fromEntries(CARD_IDS.map(cardId => [cardId, sprintItemById.get(cardId)?.stage || 'missing'])),
    },
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Build Intel intake proof: ${output.status}`)
    console.log(`Closeout: ${output.closeoutKey}`)
    for (const finding of findings) console.log(`- ${finding.label}: ${finding.detail}`)
  }

  await closeFoundationDb()
  if (findings.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
})
