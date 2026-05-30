#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_PORTFOLIO_STATUS,
  BUILD_PORTFOLIO_SCRUM_MASTER_APPROVAL_PATH,
  BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID,
  BUILD_PORTFOLIO_SCRUM_MASTER_PLAN_PATH,
  BUILD_PORTFOLIO_SCRUM_MASTER_SCRIPT_PATH,
  OLD_DEV_SYSTEM_PORTFOLIO_EVIDENCE,
  buildPortfolioReview,
  buildPortfolioDogfoodProof,
} from '../lib/build-portfolio-scrum-master.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import { DEV_BUILD_SCOPER_STATUS } from '../lib/dev-build-opportunity-scoper.js'
import {
  buildDevBuildOpportunityEvidenceTrace,
} from '../lib/dev-build-opportunity-evidence-trace.js'

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

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planSource,
    packageSource,
    currentPlanSource,
    directorPlanSource,
    handoffSource,
    proofScriptSource,
    approval,
    liveTrace,
  ] = await Promise.all([
    readRepoFile(BUILD_PORTFOLIO_SCRUM_MASTER_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/process/dev-team-intelligence-director-001-plan.md'),
    readRepoFile('docs/handoffs/2026-05-25-intelligence-spine-god-mode-checkpoint.md'),
    readRepoFile(BUILD_PORTFOLIO_SCRUM_MASTER_SCRIPT_PATH),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: BUILD_PORTFOLIO_SCRUM_MASTER_APPROVAL_PATH,
      cardId: BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID,
    }),
    buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 }),
  ])
  const packageJson = JSON.parse(packageSource)
  const dogfood = buildPortfolioDogfoodProof()
  const liveReadyScopedCandidates = liveTrace.scopedCandidates
    .filter(candidate =>
      candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.readyForPortfolio &&
        candidate.sourceTraceStatus === 'source_trace_ready' &&
        candidate.portfolioCandidate
    )
  const livePortfolioCandidates = liveReadyScopedCandidates.map(candidate => candidate.portfolioCandidate)
  const livePortfolio = buildPortfolioReview({ candidates: livePortfolioCandidates })
  const sourceRefsByCandidateId = new Map(livePortfolioCandidates.map(candidate => [
    candidate.id,
    [
      ...(candidate.sourceRefs || []),
      ...(candidate.sourceIds || []),
      ...(candidate.evidenceRefs || []),
    ].filter(Boolean),
  ]))
  const livePortfolioPreservesLineage = livePortfolio.groups.every(group =>
    group.candidateIds.every(candidateId =>
      (sourceRefsByCandidateId.get(candidateId) || []).every(ref => group.sourceLineage.includes(ref))
    )
  )
  const sideEffectPattern = new RegExp([
    '\\bfs\\.(?:write' + 'File|append' + 'File)',
    '\\bwrite' + 'File\\s*\\(',
    '\\bappend' + 'File\\s*\\(',
    '\\bupdate' + 'BacklogItem\\s*\\(',
    '\\bcreate' + 'BacklogItem\\s*\\(',
    '\\bupsert' + 'FoundationCurrentSprintOverlay\\s*\\(',
    '\\bupsert' + 'Intelligence\\w*\\s*\\(',
    'globalThis\\.fetch',
    'chromium\\.launch',
    'puppe' + 'teer',
    'play' + 'wright',
  ].join('|'))
  const oldEvidence = await Promise.all(OLD_DEV_SYSTEM_PORTFOLIO_EVIDENCE.map(async evidencePath => ({
    path: evidencePath,
    exists: await fileExists(evidencePath),
  })))

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'approval validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || BUILD_PORTFOLIO_SCRUM_MASTER_APPROVAL_PATH
  )
  addCheck(
    checks,
    /Director -> Scoper -> Build Portfolio\/Sprint Master -> Steve approval/i.test(planSource) &&
      planSource.includes('source lineage') &&
      /seven (related|overlapping) ideas/i.test(planSource) &&
      planSource.includes('raw Director recommendations as Scoper inputs only'),
    'plan captures post-Scoper portfolio role and source-lineage merge behavior',
    BUILD_PORTFOLIO_SCRUM_MASTER_PLAN_PATH
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:build-portfolio-scrum-master-check'] === `node --env-file-if-exists=.env ${BUILD_PORTFOLIO_SCRUM_MASTER_SCRIPT_PATH}`,
    'package exposes focused portfolio proof',
    packageJson.scripts?.['process:build-portfolio-scrum-master-check'] || 'missing'
  )
  addCheck(
    checks,
    oldEvidence.every(item => item.exists),
    'old-system evidence files used as pattern source still exist',
    oldEvidence.filter(item => !item.exists).map(item => item.path).join(', ') || `${oldEvidence.length} files`
  )
  addCheck(
    checks,
    /not recreate the old system as a swarm/i.test(planSource) &&
      planSource.includes('code-owned contracts'),
    'plan explicitly improves on old agent-swarm shape',
    'new Foundation implementation should be fewer agents, clearer contracts, stronger proof'
  )
  addCheck(
    checks,
    currentPlanSource.includes('Build Portfolio/Sprint Master') &&
      /duplicate\/overlapping scoped cards.*merge/i.test(currentPlanSource),
    'rebuild current plan names the portfolio layer',
    'docs/rebuild/current-plan.md'
  )
  addCheck(
    checks,
    (directorPlanSource.includes('Build Portfolio/Sprint Master') || directorPlanSource.includes('BUILD-PORTFOLIO-SCRUM-MASTER-001')) &&
      directorPlanSource.includes('Director could drift into auto-scrum-master behavior'),
    'Director plan keeps Director separate from portfolio/sprint master behavior',
    'docs/process/dev-team-intelligence-director-001-plan.md'
  )
  addCheck(
    checks,
    handoffSource.includes('BUILD-PORTFOLIO-SCRUM-MASTER-001') &&
      /seven (related|overlapping) ideas.*one stronger source-backed build concept/i.test(handoffSource),
    'checkpoint handoff queues portfolio card with the right job',
    'docs/handoffs/2026-05-25-intelligence-spine-god-mode-checkpoint.md'
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood portfolio review handles merge, thin, blocked, existing-card, and standalone cases',
    JSON.stringify(dogfood.checks.filter(check => !check.ok))
  )
  addCheck(
    checks,
    dogfood.rawDirectorReview?.scoperRequired === true &&
      dogfood.rawDirectorReview.groups?.every(group => group.decision === 'return_to_scoper'),
    'raw Director recommendations are forced through Scoper before portfolio review',
    dogfood.rawDirectorReview?.groups?.map(group => `${group.candidateIds.join('+')}:${group.decision}`).join(', ') || 'missing raw Director proof'
  )
  addCheck(
    checks,
    dogfood.review.groups.every(group => Number.isFinite(Number(group.portfolioScore)) && group.portfolioRank >= 1) &&
      dogfood.review.groups
        .filter(group => ['merged_enhanced_build_opportunity', 'standalone_scoped_candidate'].includes(group.decision))
        .every((group, index, buildableGroups) => index === 0 || Number(buildableGroups[index - 1].portfolioScore) >= Number(group.portfolioScore)),
    'portfolio output keeps ranked scores after scoping and merging',
    dogfood.review.groups.map(group => `#${group.portfolioRank}:${group.portfolioScore}:${group.title}`).join(' | ')
  )
  addCheck(
    checks,
    liveTrace.ok && liveTrace.reviewedCount >= 1,
    'live Portfolio proof reads current Director evidence trace',
    `${liveTrace.directorReportArtifactId}; reviewed=${liveTrace.reviewedCount}`
  )
  addCheck(
    checks,
    liveReadyScopedCandidates.length >= 1 &&
      liveReadyScopedCandidates.every(candidate =>
        candidate.rawAtomId &&
          candidate.rawHitId &&
          candidate.directorAtomId &&
          candidate.directorHitId
      ),
    'live Portfolio inputs come only from Scoper-ready source-traced candidates',
    liveReadyScopedCandidates.map(candidate => `${candidate.rank}:${candidate.title}`).join(' | ') || 'none'
  )
  addCheck(
    checks,
    livePortfolio.candidateCount === liveReadyScopedCandidates.length &&
      livePortfolio.groups.length >= 1 &&
      livePortfolio.groups.every(group => group.status === BUILD_PORTFOLIO_STATUS.proposalOnly),
    'live Portfolio reviews the scoped candidate pile as proposal-only output',
    `candidates=${livePortfolio.candidateCount}; groups=${livePortfolio.groups.length}; statuses=${livePortfolio.groups.map(group => group.status).join(', ')}`
  )
  addCheck(
    checks,
    livePortfolio.groups.every((group, index) =>
      group.portfolioRank === index + 1 &&
        Number.isFinite(Number(group.portfolioScore))
    ),
    'live Portfolio assigns stable ranks and scores',
    livePortfolio.groups.map(group => `#${group.portfolioRank}:${group.portfolioScore}:${group.title}`).join(' | ')
  )
  addCheck(
    checks,
    livePortfolioPreservesLineage,
    'live Portfolio groups preserve source lineage from every scoped candidate',
    livePortfolio.groups.map(group => `${group.groupId}:${group.sourceLineage.length}`).join(' | ')
  )
  addCheck(
    checks,
    livePortfolio.promotionPolicy === 'no_auto_promotion_without_steve_after_portfolio_review',
    'live Portfolio keeps promotion behind Steve approval',
    livePortfolio.promotionPolicy
  )
  addCheck(
    checks,
    !sideEffectPattern.test(proofScriptSource),
    'Portfolio proof has no writer/browser/provider side effects',
    BUILD_PORTFOLIO_SCRUM_MASTER_SCRIPT_PATH
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID,
    checks,
    failures,
    dogfood,
    livePortfolio: {
      directorReportArtifactId: liveTrace.directorReportArtifactId,
      reviewedCandidates: liveTrace.reviewedCandidates,
      readyScopedCandidateCount: liveReadyScopedCandidates.length,
      groups: livePortfolio.groups,
      counts: livePortfolio.counts,
      promotionPolicy: livePortfolio.promotionPolicy,
    },
    oldEvidence,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Build Portfolio / Sprint Master check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log('\nLive portfolio groups:')
    for (const group of livePortfolio.groups) {
      console.log(`#${group.portfolioRank} ${group.portfolioScore} ${group.decision} -> ${group.title}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
