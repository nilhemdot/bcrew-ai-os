#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  IMPLEMENTATION_INTELLIGENCE_CARD_IDS,
  IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY,
  IMPLEMENTATION_INTELLIGENCE_EXIT_CRITERIA,
  IMPLEMENTATION_INTELLIGENCE_NEXT_ACTION,
  IMPLEMENTATION_INTELLIGENCE_SPRINT_ID,
  analyzeBacklogCardReadiness,
  buildBuilderLessonLinkerSnapshot,
  buildImplementationIntelligenceSnapshot,
  buildInternalScoperProposal,
  buildPublicYouTubePreflightSnapshot,
  buildResearchDispositionQueue,
  buildSyntheticImplementationIntelligenceFixtures,
  buildThinCardDetectorSnapshot,
} from '../lib/implementation-intelligence.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import { getActiveFoundationCurrentSprint } from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationSnapshot } from '../lib/foundation-strategy-docs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { RESEARCH_INBOX_CARD_ID } from '../lib/research-inbox.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, card: null }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--card=')) args.card = arg.slice('--card='.length)
  }
  return args
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function activeCardIds(args) {
  if (!args.card) return IMPLEMENTATION_INTELLIGENCE_CARD_IDS
  if (!IMPLEMENTATION_INTELLIGENCE_CARD_IDS.includes(args.card)) {
    throw new Error(`Unknown Implementation Intelligence card: ${args.card}`)
  }
  return [args.card]
}

function laneCounts(backlogItems = []) {
  return backlogItems.reduce((acc, item) => {
    const lane = item.lane || 'unknown'
    acc[lane] = (acc[lane] || 0) + 1
    return acc
  }, {})
}

function sameCounts(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if ((a[key] || 0) !== (b[key] || 0)) return false
  }
  return true
}

async function validateApprovals(findings, cardIds) {
  for (const cardId of cardIds) {
    const approvalRef = `docs/process/approvals/${cardId}.json`
    const validation = await validatePlanApprovalFile({ repoRoot, approvalRef, cardId })
    addFinding(
      findings,
      validation.ok && Number(validation.approval?.score) >= 9.8,
      `${cardId} approval file is valid at 9.8+`,
      validation.failures?.map(item => item.check).join(', ') || approvalRef
    )
  }
}

function syntheticResearchRows() {
  return [
    {
      id: 'SYNTHETIC-RESEARCH-P0-001',
      title: 'Critical research card',
      lane: 'research',
      priority: 'P0',
      rank: 1,
      source: 'synthetic source',
      summary: 'Critical Foundation research card.',
    },
    {
      id: 'SYNTHETIC-FUTURE-IDEA-001',
      title: 'Future avatar content idea',
      lane: 'research',
      priority: 'P2',
      rank: 2,
      source: 'synthetic source',
      summary: 'Later future concept for avatar content.',
    },
    {
      id: 'SYNTHETIC-KEEP-001',
      title: 'Keep research context',
      lane: 'research',
      priority: 'P2',
      rank: 3,
      source: 'synthetic source',
      summary: 'Useful research with source context.',
    },
    {
      id: 'SYNTHETIC-KILL-REVIEW-001',
      title: 'Unclear row',
      lane: 'research',
      priority: 'P3',
      rank: 4,
    },
  ]
}

async function main() {
  const args = parseArgs()
  const requestedCards = activeCardIds(args)
  const findings = []

  await initFoundationDb()
  await validateApprovals(findings, requestedCards)

  const beforeSnapshot = await getFoundationSnapshot()
  const beforeBacklogCount = beforeSnapshot.backlogItems?.length || 0
  const beforeLaneCounts = laneCounts(beforeSnapshot.backlogItems || [])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const fixtures = buildSyntheticImplementationIntelligenceFixtures()

  const weakProfile = analyzeBacklogCardReadiness(fixtures.thinCard)
  const completeProfile = analyzeBacklogCardReadiness(fixtures.completeCard)
  const thinDetector = buildThinCardDetectorSnapshot({ backlogItems: beforeSnapshot.backlogItems || [] })
  const thinProposal = buildInternalScoperProposal({ card: fixtures.thinCard, lessons: fixtures.builderLessons })
  const completeNoop = buildInternalScoperProposal({ card: fixtures.completeCard, lessons: fixtures.builderLessons })
  const syntheticDisposition = buildResearchDispositionQueue({ backlogItems: syntheticResearchRows() })
  const liveDisposition = buildResearchDispositionQueue({ backlogItems: beforeSnapshot.backlogItems || [] })
  const builderLinker = buildBuilderLessonLinkerSnapshot({
    lessons: fixtures.builderLessons,
    backlogItems: [...(beforeSnapshot.backlogItems || []), fixtures.completeCard],
  })
  const youtubePreflight = buildPublicYouTubePreflightSnapshot()
  const implementationSnapshot = buildImplementationIntelligenceSnapshot({
    backlogItems: beforeSnapshot.backlogItems || [],
    currentSprint: activeSprint,
  })
  const afterSnapshot = await getFoundationSnapshot()
  const afterBacklogCount = afterSnapshot.backlogItems?.length || 0
  const afterLaneCounts = laneCounts(afterSnapshot.backlogItems || [])
  const closeouts = getFoundationBuildCloseouts()

  addFinding(findings, activeSprint.sprint?.sprintId === IMPLEMENTATION_INTELLIGENCE_SPRINT_ID, 'Current Sprint is Implementation Intelligence', activeSprint.sprint?.sprintId || 'missing')
  addFinding(findings, requestedCards.every(cardId => activeSprint.planCriticRuns?.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8)), 'Requested cards have Plan Critic pass rows', requestedCards.join(', '))
  addFinding(findings, weakProfile.needsInternalScoper && weakProfile.missing.length >= 4, 'THIN-CARD-DETECTOR-001 flags synthetic weak card', weakProfile.missing.join(', '))
  addFinding(findings, !completeProfile.needsInternalScoper && completeProfile.readinessScore >= 0.75, 'THIN-CARD-DETECTOR-001 preserves build-ready synthetic card', String(completeProfile.readinessScore))
  addFinding(findings, thinDetector.totalCards >= 300 && thinDetector.thinCards > 0 && thinDetector.writesBacklog === false, 'THIN-CARD-DETECTOR-001 reports live backlog readiness without mutation', `${thinDetector.thinCards}/${thinDetector.totalCards}`)
  addFinding(findings, thinProposal.proposalOnly && thinProposal.writesBacklog === false && thinProposal.opensSprint === false && thinProposal.proposedDoctrine?.acceptanceCriteria?.length >= 3, 'INTERNAL-SCOPER-001 creates 7-section proposal without writes', thinProposal.proposalId)
  addFinding(findings, completeNoop.action === 'no_enrichment_needed' && completeNoop.writesBacklog === false, 'INTERNAL-SCOPER-001 leaves build-ready card alone', completeNoop.action)
  addFinding(findings, ['promote_review', 'future_concepts_review', 'keep_review', 'kill_review'].every(disposition => syntheticDisposition.rows.some(row => row.proposedDisposition === disposition)), 'RESEARCH-DISPOSITION-QUEUE-001 covers all synthetic dispositions', JSON.stringify(syntheticDisposition.counts))
  addFinding(findings, liveDisposition.totalResearchCards >= 100 && liveDisposition.writesBacklog === false && liveDisposition.movesCards === false && liveDisposition.deletesCards === false, 'RESEARCH-DISPOSITION-QUEUE-001 reports live research queue without mutation', String(liveDisposition.totalResearchCards))
  addFinding(findings, builderLinker.enrichExistingCount >= 1 && builderLinker.proposeNewCardCount >= 1 && builderLinker.writesBacklog === false, 'BUILDER-LESSON-LINKER-001 enriches existing cards before proposing new work', `enrich=${builderLinker.enrichExistingCount} new=${builderLinker.proposeNewCardCount}`)
  addFinding(findings, builderLinker.linked.every(item => item.researchInboxProposal?.proposalOnly === true && item.autoCreatesBacklog === false), 'BUILDER-LESSON-LINKER-001 routes through Research Inbox proposal path', RESEARCH_INBOX_CARD_ID)
  addFinding(findings, youtubePreflight.publicCandidateCount >= 20 && youtubePreflight.paidOrAuthBlockedCount >= 1, 'PUBLIC-YOUTUBE-PREFLIGHT-001 separates public candidates from paid blockers', `public=${youtubePreflight.publicCandidateCount} paid=${youtubePreflight.paidOrAuthBlockedCount}`)
  addFinding(findings, youtubePreflight.envelopeValidation.ok && youtubePreflight.extractionStarted === false && youtubePreflight.atomsCreated === 0 && youtubePreflight.paidAuthUsed === false, 'PUBLIC-YOUTUBE-PREFLIGHT-001 validates public envelope without extraction', youtubePreflight.envelopeValidation.findings.join(', ') || 'valid')
  addFinding(findings, beforeBacklogCount === afterBacklogCount && sameCounts(beforeLaneCounts, afterLaneCounts), 'Implementation Intelligence proof does not mutate live backlog count or lanes', `${beforeBacklogCount} -> ${afterBacklogCount}`)
  addFinding(findings, implementationSnapshot.proposalOnly && implementationSnapshot.writesBacklog === false && implementationSnapshot.extractionStarted === false && implementationSnapshot.atomsCreated === 0, 'Implementation Intelligence snapshot is proposal-only and no-extraction', implementationSnapshot.closeoutKey)
  addFinding(findings, closeouts.some(closeout => closeout.key === IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY), 'Closeout record exists for Implementation Intelligence', IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY)

  if (activeSprint.sprint?.metadata?.exitCriteria?.length) {
    addFinding(
      findings,
      IMPLEMENTATION_INTELLIGENCE_EXIT_CRITERIA.every(criterion => (activeSprint.sprint.metadata.exitCriteria || []).includes(criterion)) &&
        activeSprint.sprint.metadata.nextAction === IMPLEMENTATION_INTELLIGENCE_NEXT_ACTION,
      'Current Sprint metadata carries exit criteria and sprint-review rollover action',
      `exitCriteria=${activeSprint.sprint.metadata.exitCriteria?.length || 0}`,
    )
  }

  const failures = findings.filter(finding => !finding.ok)
  const result = {
    status: failures.length ? 'unhealthy' : 'healthy',
    closeoutKey: IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY,
    requestedCards,
    summary: {
      backlogCount: afterBacklogCount,
      thinCards: thinDetector.thinCards,
      researchCards: liveDisposition.totalResearchCards,
      builderLessons: builderLinker.lessonsProcessed,
      publicYoutubeCandidates: youtubePreflight.publicCandidateCount,
      paidBlocked: youtubePreflight.paidOrAuthBlockedCount,
    },
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Implementation Intelligence check: ${result.status}`)
    for (const finding of findings) {
      console.log(`${finding.ok ? 'PASS' : 'FAIL'} ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
