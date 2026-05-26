#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  closeFoundationDb,
} from '../lib/foundation-db.js'
import {
  BUILD_OPPORTUNITY_PROMOTION_GATE_CARD_ID,
  BUILD_OPPORTUNITY_PROMOTION_GATE_APPROVAL_PATH,
  BUILD_OPPORTUNITY_PROMOTION_GATE_PLAN_PATH,
  BUILD_OPPORTUNITY_PROMOTION_GATE_SCRIPT_PATH,
  BUILD_OPPORTUNITY_PROMOTION_STATUS,
  buildBuildOpportunityPromotionGateDogfoodProof,
  evaluateBuildOpportunityPromotionGate,
} from '../lib/build-opportunity-promotion-gate.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildPortfolioDogfoodProof, buildPortfolioReview } from '../lib/build-portfolio-scrum-master.js'
import { DEV_BUILD_SCOPER_STATUS, buildDevBuildOpportunityScoperDogfoodProof } from '../lib/dev-build-opportunity-scoper.js'
import {
  buildDevBuildOpportunityEvidenceTrace,
} from '../lib/dev-build-opportunity-evidence-trace.js'
import { buildDevTeamDirectorOperatorDogfood } from '../lib/dev-team-intelligence-director.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function blockedSourceHits(source = '') {
  const patterns = [
    /\bfrom\s+['"].*foundation-db/i,
    /\bfrom\s+['"]pg['"]/i,
    /\bfetch\s*\(/i,
    /\bwriteFile\b/i,
    /\bappendFile\b/i,
    /\bspawn(?:Sync)?\b/i,
    /\bexec(?:File|Sync)?\b/i,
    /\bplaywright\b/i,
    /\bpuppeteer\b/i,
    /\bgemini\b/i,
    /\bopenai\b/i,
  ]
  return patterns.filter(pattern => pattern.test(source)).map(pattern => String(pattern))
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value.map(item => text(item)).filter(Boolean) : []
}

function unique(values = []) {
  return [...new Set(values.map(item => text(item)).filter(Boolean))]
}

function firstReportRef(sourceRefs = []) {
  return list(sourceRefs).find(ref => /^(batch|proof|report-artifact|director|slice|scout|research|extraction|grader):/i.test(ref)) || ''
}

function firstVideoId(sourceRefs = []) {
  const youtubeRef = list(sourceRefs).find(ref => /^youtube:/i.test(ref))
  if (youtubeRef) return youtubeRef.replace(/^youtube:/i, '')
  const youtubeUrl = list(sourceRefs).find(ref => /youtube\.com\/watch\?v=/i.test(ref))
  return youtubeUrl?.match(/[?&]v=([^&]+)/i)?.[1] || ''
}

function buildLivePromotionCandidateFromPortfolioGroup(group = {}, portfolioCandidatesById = new Map(), now = new Date().toISOString()) {
  const candidates = list(group.candidateIds).map(id => portfolioCandidatesById.get(id)).filter(Boolean)
  const primary = candidates[0] || {}
  const sourceRefs = unique([
    ...list(group.sourceLineage),
    ...candidates.flatMap(candidate => list(candidate.sourceRefs)),
    ...candidates.flatMap(candidate => list(candidate.sourceIds)),
  ])
  const acceptanceCriteria = unique(candidates.flatMap(candidate => list(candidate.scope?.acceptanceCriteria)))
  const definitionOfDone = unique(candidates.flatMap(candidate => list(candidate.scope?.definitionOfDone)))
  const proofCommands = unique([
    ...candidates.flatMap(candidate => [
      ...list(candidate.scope?.proofPlan),
      ...list(candidate.scope?.tests),
    ]),
    'npm run process:dev-build-scoper-evidence-trace-check -- --json',
    'npm run process:build-portfolio-scrum-master-check -- --json',
    'npm run process:build-opportunity-promotion-gate-check -- --json',
  ])
  const risks = unique(candidates.flatMap(candidate => list(candidate.scope?.risks)))
  const notNext = unique([
    ...candidates.flatMap(candidate => list(candidate.scope?.notNext)),
    'Do not create or mutate backlog cards from this preflight.',
    'Do not treat approval-required packet output as Steve approval.',
  ])

  return {
    candidateKey: group.groupId,
    title: group.title,
    summary: group.reason || primary.summary || 'Portfolio-reviewed Build Intel opportunity.',
    recommendedNextStep: primary.recommendedNextStep ||
      primary.scope?.details ||
      `Review Portfolio group #${group.portfolioRank} for Steve approval before any backlog promotion.`,
    lane: group.lane,
    priority: Number(group.portfolioRank) <= 2 ? 'P0' : 'P1',
    rank: group.portfolioRank,
    sourceIds: unique(candidates.flatMap(candidate => list(candidate.sourceIds))),
    sourceRefs,
    sourceReportArtifactId: firstReportRef(sourceRefs),
    sourceVideoId: firstVideoId(sourceRefs),
    sourceTrustLabel: primary.director?.sourceTrustLabel || 'portfolio_scoper_ready',
    portfolioDecision: group.decision,
    portfolioScore: group.portfolioScore,
    latestEvidenceAt: now,
    acceptanceCriteria,
    definitionOfDone,
    proofCommands,
    risks,
    notNext,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planSource,
    packageSource,
    gateSource,
    approval,
  ] = await Promise.all([
    readRepoFile(BUILD_OPPORTUNITY_PROMOTION_GATE_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/build-opportunity-promotion-gate.js'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: BUILD_OPPORTUNITY_PROMOTION_GATE_APPROVAL_PATH,
      cardId: BUILD_OPPORTUNITY_PROMOTION_GATE_CARD_ID,
    }),
  ])
  const packageJson = JSON.parse(packageSource)
  const dogfood = buildBuildOpportunityPromotionGateDogfoodProof()
  const scoperDogfood = buildDevBuildOpportunityScoperDogfoodProof()
  const portfolioDogfood = buildPortfolioDogfoodProof()
  const directorDogfood = buildDevTeamDirectorOperatorDogfood()
  const now = new Date().toISOString()
  const liveTrace = await buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })
  const liveReadyScopedCandidates = liveTrace.scopedCandidates
    .filter(candidate =>
      candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.readyForPortfolio &&
        candidate.sourceTraceStatus === 'source_trace_ready' &&
        candidate.portfolioCandidate
    )
  const livePortfolioCandidates = liveReadyScopedCandidates.map(candidate => candidate.portfolioCandidate)
  const livePortfolio = buildPortfolioReview({ candidates: livePortfolioCandidates })
  const livePortfolioCandidatesById = new Map(livePortfolioCandidates.map(candidate => [candidate.id, candidate]))
  const livePromotionCandidates = livePortfolio.groups.map(group =>
    buildLivePromotionCandidateFromPortfolioGroup(group, livePortfolioCandidatesById, now)
  )
  const livePromotionGateResults = livePromotionCandidates.map(candidate =>
    evaluateBuildOpportunityPromotionGate({ candidate, now })
  )
  const [rawDirectorCandidate] = directorDogfood.snapshot?.recommendedBuildNow || []
  const rawDirectorGate = evaluateBuildOpportunityPromotionGate({
    candidate: {
      ...rawDirectorCandidate,
      latestEvidenceAt: '2026-05-26T03:00:00.000-04:00',
      acceptanceCriteria: ['Scoper must define acceptance criteria before promotion.'],
      definitionOfDone: ['Scoper must define done proof before promotion.'],
      proofCommands: ['Scoper must define proof commands before promotion.'],
      risks: ['Raw Director recommendation can skip implementation research if promoted too early.'],
      notNext: ['Do not promote raw Director output directly.'],
    },
    approval: {
      approved: true,
      approvedBy: 'Steve',
      approvedAt: '2026-05-26T03:00:00.000-04:00',
    },
    now: '2026-05-26T03:00:00.000-04:00',
  })
  const blockedRuntimeHits = blockedSourceHits(gateSource)

  addCheck(
    checks,
    approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8,
    'approval file validates for proposal-only preflight scope',
    approval.failures?.map(item => item.check).join(', ') || BUILD_OPPORTUNITY_PROMOTION_GATE_APPROVAL_PATH
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:build-opportunity-promotion-gate-check'] === `node --env-file-if-exists=.env ${BUILD_OPPORTUNITY_PROMOTION_GATE_SCRIPT_PATH}`,
    'package exposes focused Build Opportunity Promotion Gate proof',
    packageJson.scripts?.['process:build-opportunity-promotion-gate-check'] || 'missing'
  )
  addCheck(
    checks,
    planSource.includes('Steve approval is mandatory') &&
      planSource.includes('proposal-only') &&
      planSource.includes('no automatic backlog creation') &&
      planSource.includes('evidence packet') &&
      planSource.includes('duplicate') &&
      planSource.includes('stale') &&
      planSource.includes('existing-card attachment') &&
      planSource.includes('No live extraction, crawl, click run, login, form submit, download, purchase, model call, provider call, or external write'),
    'plan locks the evidence-packet, approval, duplicate, stale, and no-runtime boundaries',
    BUILD_OPPORTUNITY_PROMOTION_GATE_PLAN_PATH
  )
  addCheck(
    checks,
    blockedRuntimeHits.length === 0,
    'runtime module has no DB/provider/browser/http/write side-effect imports or calls',
    blockedRuntimeHits.join(', ') || 'clean'
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood proof covers approval, duplicate, stale, unsafe, attachment, reject, and no-write cases',
    dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'all pass'
  )
  addCheck(
    checks,
    dogfood.cases.approvalRequired.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.approvalRequired &&
      dogfood.cases.approvalRequired.writesBacklog === false,
    'unapproved source-backed opportunity cannot become backlog work',
    dogfood.cases.approvalRequired.status
  )
  addCheck(
    checks,
    dogfood.cases.approvedCreate.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.backlogCardProposalReady &&
      dogfood.cases.approvedCreate.proposedBacklogCard?.evidencePacketId,
    'approved opportunity produces a backlog-card proposal packet',
    dogfood.cases.approvedCreate.proposedBacklogCard?.id || 'missing'
  )
  addCheck(
    checks,
    dogfood.cases.duplicate.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.duplicateAttachRequired,
    'duplicate opportunity is routed to attachment instead of a new card',
    dogfood.cases.duplicate.duplicateBacklogItems.map(item => item.id).join(', ') || 'missing'
  )
  addCheck(
    checks,
    dogfood.cases.stale.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.staleNeedsRefresh,
    'stale opportunity requires evidence refresh before approval can promote',
    String(dogfood.cases.stale.stale.ageDays)
  )
  addCheck(
    checks,
    dogfood.cases.unsafe.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.blockedUnsafe,
    'unsafe source/runtime flags fail closed',
    dogfood.cases.unsafe.failures.join(', ')
  )
  addCheck(
    checks,
    dogfood.cases.approvedAttachment.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.existingCardAttachmentProposalReady &&
      dogfood.cases.approvedAttachment.proposedAttachment?.writesBacklog === false,
    'existing-card attachment path is approval-gated and no-write',
    dogfood.cases.approvedAttachment.proposedAttachment?.targetCardId || 'missing'
  )
  addCheck(
    checks,
    scoperDogfood.ok && portfolioDogfood.ok,
    'upstream Scoper and Portfolio dogfood still gate raw recommendations before promotion',
    `scoper=${scoperDogfood.ok}; portfolio=${portfolioDogfood.ok}`
  )
  addCheck(
    checks,
    rawDirectorGate.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.needsMoreEvidence &&
      rawDirectorGate.failures.includes('raw_atom_or_hit_evidence_required'),
    'raw Director candidate cannot skip Scoper/raw evidence into promotion gate',
    rawDirectorGate.failures.join(', ')
  )
  addCheck(
    checks,
    dogfood.cases.rejected.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.rejected &&
      dogfood.cases.rejected.decisionLog.sourceRefs.length >= 2,
    'reject path logs decision with source refs instead of losing the evidence',
    dogfood.cases.rejected.decisionLog.note
  )
  addCheck(
    checks,
    Object.values(dogfood.cases).every(item =>
      item.proposalOnly === true &&
      item.writesBacklog === false &&
      item.externalWrites === false
    ),
    'all gate outcomes remain proposal-only with no backlog or external writes',
    'proposal-only'
  )
  addCheck(
    checks,
    liveTrace.ok && livePortfolio.groups.length >= 1,
    'live Promotion Gate preflight reads current Portfolio groups',
    `trace=${liveTrace.reviewedCount}; groups=${livePortfolio.groups.length}`
  )
  addCheck(
    checks,
    livePromotionGateResults.length === livePortfolio.groups.length &&
      livePromotionGateResults.every(result => result.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.approvalRequired),
    'live Portfolio groups become approval-required evidence packets',
    livePromotionGateResults.map(result => `${result.evidencePacket.title}:${result.status}`).join(' | ')
  )
  addCheck(
    checks,
    livePromotionGateResults.every(result =>
      result.proposalOnly === true &&
        result.writesBacklog === false &&
        result.externalWrites === false &&
        result.evidencePacket.rawEvidenceRefs.length >= 1 &&
        result.evidencePacket.sourceRefs.length >= 2
    ),
    'live evidence packets preserve raw evidence and remain no-write',
    livePromotionGateResults.map(result => `${result.evidencePacket.rawEvidenceRefs.length}/${result.evidencePacket.sourceRefs.length}`).join(', ')
  )
  addCheck(
    checks,
    livePromotionGateResults.every(result =>
      result.evidencePacket.proofCommands.includes('npm run process:build-portfolio-scrum-master-check -- --json') &&
        result.evidencePacket.notNext.some(item => /Do not create or mutate backlog cards/i.test(item))
    ),
    'live packets carry proof commands and not-next promotion boundaries',
    livePromotionGateResults.map(result => result.evidencePacket.packetId).join(' | ')
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    cardId: BUILD_OPPORTUNITY_PROMOTION_GATE_CARD_ID,
    checks,
    failures,
    summary: {
      dogfoodCases: Object.fromEntries(Object.entries(dogfood.cases).map(([key, value]) => [key, value.status])),
      rawDirectorStatus: rawDirectorGate.status,
      rawDirectorFailures: rawDirectorGate.failures,
      scoperOk: scoperDogfood.ok,
      portfolioOk: portfolioDogfood.ok,
      livePortfolioGroups: livePortfolio.groups.map(group => ({
        rank: group.portfolioRank,
        title: group.title,
        decision: group.decision,
        score: group.portfolioScore,
      })),
      livePromotionStatuses: livePromotionGateResults.map(result => ({
        title: result.evidencePacket.title,
        status: result.status,
        packetId: result.evidencePacket.packetId,
      })),
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Build Opportunity Promotion Gate check: ${output.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
