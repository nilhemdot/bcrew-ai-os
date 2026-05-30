#!/usr/bin/env node

import process from 'node:process'

import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
} from '../lib/dev-team-intelligence-director.js'
import {
  DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
  DEV_BUILD_SCOPER_STATUS,
} from '../lib/dev-build-opportunity-scoper.js'
import {
  DEV_BUILD_EVIDENCE_TRACE_DEFAULT_CANDIDATE_LIMIT,
  buildDevBuildOpportunityEvidenceTrace,
} from '../lib/dev-build-opportunity-evidence-trace.js'

function parseArgs(argv = process.argv.slice(2)) {
  const limitArg = argv.find(arg => arg.startsWith('--limit=')) || argv.find(arg => arg.startsWith('--candidate-limit='))
  const parsedLimit = Number(limitArg?.split('=')[1] || DEV_BUILD_EVIDENCE_TRACE_DEFAULT_CANDIDATE_LIMIT)
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    candidateLimit: Math.min(10, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : DEV_BUILD_EVIDENCE_TRACE_DEFAULT_CANDIDATE_LIMIT)),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function main() {
  const args = parseArgs()
  const checks = []
  const traceResult = await buildDevBuildOpportunityEvidenceTrace({
    directorReportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
    candidateLimit: args.candidateLimit,
  })
  const reviewedCandidates = traceResult.reviewedCandidates
  const apiFullWatchCandidates = reviewedCandidates.filter(candidate => candidate.sourceTrustLabel === 'api_full_watch')
  const readyCandidates = reviewedCandidates.filter(candidate => candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.readyForPortfolio)

  addCheck(
    checks,
    traceResult.ok && traceResult.reviewedCount > 0,
    'live Director report provides current top candidates',
    `${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID}; reviewed=${traceResult.reviewedCount}`
  )
  addCheck(
    checks,
    reviewedCandidates.every(candidate => candidate.directorAtomId && candidate.directorHitId),
    'current Director candidates have persisted Director atom/hit readback',
    reviewedCandidates
      .filter(candidate => !candidate.directorAtomId || !candidate.directorHitId)
      .map(candidate => `${candidate.rank}:${candidate.title}`)
      .join(', ') || 'all traced'
  )
  addCheck(
    checks,
    apiFullWatchCandidates.length > 0 && apiFullWatchCandidates.every(candidate => candidate.rawAtomId && candidate.rawHitId),
    'API full-watch top candidates trace to raw source atom and hit',
    apiFullWatchCandidates
      .filter(candidate => !candidate.rawAtomId || !candidate.rawHitId)
      .map(candidate => `${candidate.rank}:${candidate.title}`)
      .join(', ') || `${apiFullWatchCandidates.length} candidates`
  )
  addCheck(
    checks,
    reviewedCandidates.every(candidate =>
      candidate.sourceTraceStatus === 'source_trace_ready' ||
        candidate.scoperStatus !== DEV_BUILD_SCOPER_STATUS.readyForPortfolio
    ),
    'Scoper readiness is allowed only after source trace is ready',
    reviewedCandidates
      .filter(candidate => candidate.sourceTraceStatus !== 'source_trace_ready' && candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.readyForPortfolio)
      .map(candidate => `${candidate.rank}:${candidate.title}`)
      .join(', ') || 'no raw Director shortcut'
  )
  addCheck(
    checks,
    readyCandidates.length >= 1,
    'at least one current Director candidate is ready for Portfolio after evidence trace',
    readyCandidates.map(candidate => `${candidate.rank}:${candidate.title}`).join(' | ') || 'none'
  )
  addCheck(
    checks,
    readyCandidates.every(candidate => candidate.portfolioDecision),
    'ready candidates get Portfolio decisions after Scoper output',
    readyCandidates.map(candidate => `${candidate.rank}:${candidate.portfolioDecision}`).join(', ') || 'none'
  )
  addCheck(
    checks,
    reviewedCandidates.every(candidate => candidate.promotionStatus.includes('proposal_only')),
    'trace remains proposal-only and does not promote backlog work',
    reviewedCandidates.map(candidate => `${candidate.rank}:${candidate.promotionStatus}`).join(', ')
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
    directorReportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
    candidateLimit: args.candidateLimit,
    checks,
    failures,
    reviewedCandidates,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Dev Build Scoper evidence trace check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log('\nReviewed candidates:')
    for (const candidate of reviewedCandidates) {
      console.log(`${candidate.rank}. ${candidate.title} -> ${candidate.sourceTraceStatus}; scoper=${candidate.scoperStatus}; portfolio=${candidate.portfolioDecision || 'n/a'}`)
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
