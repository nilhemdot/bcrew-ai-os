#!/usr/bin/env node

import process from 'node:process'

import {
  closeFoundationDb,
  getIntelligenceReportBundle,
  queryIntelligenceAtomsForScoper,
} from '../lib/foundation-db.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
} from '../lib/dev-team-intelligence-director.js'
import {
  DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
  DEV_BUILD_SCOPER_STATUS,
  buildDevBuildOpportunityScope,
} from '../lib/dev-build-opportunity-scoper.js'
import { buildPortfolioReview } from '../lib/build-portfolio-scrum-master.js'

const DEFAULT_CANDIDATE_LIMIT = 5
const ACTIVE_ATOM_STATUSES = ['detected', 'accepted', 'confirmed', 'recurring', 'structural', 'winner']

function parseArgs(argv = process.argv.slice(2)) {
  const limitArg = argv.find(arg => arg.startsWith('--limit=')) || argv.find(arg => arg.startsWith('--candidate-limit='))
  const parsedLimit = Number(limitArg?.split('=')[1] || DEFAULT_CANDIDATE_LIMIT)
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    candidateLimit: Math.min(10, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_CANDIDATE_LIMIT)),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value.map(item => text(item)).filter(Boolean) : []
}

function records(value) {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
}

function unique(values = []) {
  return [...new Set(values.map(item => text(item)).filter(Boolean))]
}

function normalizeTitle(value = '') {
  return text(value).toLowerCase().replace(/\s+/g, ' ')
}

function isAtomRef(value = '') {
  return /^atom:/i.test(text(value))
}

function isHitRef(value = '') {
  return /^hit:|^atom-hit:/i.test(text(value))
}

function looksLikeReportArtifactId(value = '') {
  return /^(batch|proof|report-artifact|director|slice|scout|research|extraction|grader):/i.test(text(value))
}

function sourceVideoId(record = {}) {
  if (!record) return ''
  return text(
    record.sourceVideoId ||
      record.videoId ||
      record.youtubeVideoId ||
      record.metadata?.sourceVideoId ||
      record.metadata?.videoId ||
      record.metadata?.youtubeVideoId ||
      (record.anchorType === 'youtube_video_id' ? record.anchorValue : '')
  )
}

function sourceReportArtifactId(record = {}) {
  return text(record.sourceReportArtifactId || record.metadata?.sourceReportArtifactId || record.reportArtifactId)
}

function candidateRank(candidate = {}, fallbackIndex = 0) {
  const rank = Number(candidate.rank)
  return Number.isFinite(rank) && rank > 0 ? rank : fallbackIndex + 1
}

function sameCandidateTitle(left = {}, right = {}) {
  return normalizeTitle(left.title) === normalizeTitle(right.title)
}

function matchesCandidateSource(record = {}, candidate = {}) {
  const candidateReport = text(candidate.sourceReportArtifactId)
  const candidateVideo = sourceVideoId(candidate)
  const recordReport = sourceReportArtifactId(record)
  const recordVideo = sourceVideoId(record)
  const reportMatches = !candidateReport || !recordReport || candidateReport === recordReport
  const videoMatches = !candidateVideo || !recordVideo || candidateVideo.toLowerCase() === recordVideo.toLowerCase()
  return reportMatches && videoMatches
}

function getDirectorCandidates(directorBundle = {}, limit = DEFAULT_CANDIDATE_LIMIT) {
  const structured = directorBundle.report?.structuredOutputJson || {}
  const candidates = records(structured.recommendedBuildNow).length
    ? structured.recommendedBuildNow
    : directorBundle.report?.topFindings || []

  return records(candidates)
    .sort((left, right) => candidateRank(left) - candidateRank(right))
    .slice(0, limit)
}

function findDirectorAtom(directorBundle = {}, candidate = {}) {
  const rank = candidateRank(candidate)
  const candidateTitle = normalizeTitle(candidate.title)
  const candidateReport = text(candidate.sourceReportArtifactId)
  const candidateVideo = sourceVideoId(candidate).toLowerCase()

  return directorBundle.atoms.find(atom =>
    sameCandidateTitle(atom, candidate) &&
      matchesCandidateSource(atom, candidate) &&
      Number(atom.metadata?.rank || 0) === rank
  ) || directorBundle.atoms.find(atom =>
    sameCandidateTitle(atom, candidate) &&
      matchesCandidateSource(atom, candidate)
  ) || directorBundle.atoms.find(atom =>
    normalizeTitle(atom.title) === candidateTitle &&
      (!candidateReport || sourceReportArtifactId(atom) === candidateReport) &&
      (!candidateVideo || sourceVideoId(atom).toLowerCase() === candidateVideo)
  ) || null
}

function findDirectorHit(directorBundle = {}, candidate = {}, directorAtom = null) {
  const candidateReport = text(candidate.sourceReportArtifactId)
  const candidateVideo = sourceVideoId(candidate).toLowerCase()
  const rank = candidateRank(candidate)

  return directorBundle.hits.find(hit => directorAtom?.atomId && hit.atomId === directorAtom.atomId) ||
    directorBundle.hits.find(hit =>
      (!candidateReport || sourceReportArtifactId(hit) === candidateReport) &&
        (!candidateVideo || sourceVideoId(hit).toLowerCase() === candidateVideo) &&
        (!hit.metadata?.scopeReadiness || Number(hit.metadata?.rank || rank) === rank)
    ) ||
    directorBundle.hits.find(hit =>
      (!candidateReport || sourceReportArtifactId(hit) === candidateReport) &&
        (!candidateVideo || sourceVideoId(hit).toLowerCase() === candidateVideo)
    ) ||
    null
}

function findAtomInBundles(bundles = [], candidate = {}) {
  const candidateSourceAtomId = text(candidate.sourceAtomId || candidate.metadata?.sourceAtomId)
  const candidateTitle = normalizeTitle(candidate.title)
  const candidateVideo = sourceVideoId(candidate).toLowerCase()

  const atoms = bundles.flatMap(bundle => bundle.atoms || [])
  return atoms.find(atom => candidateSourceAtomId && atom.atomId === candidateSourceAtomId) ||
    atoms.find(atom =>
      sameCandidateTitle(atom, candidate) &&
        (!candidateVideo || sourceVideoId(atom).toLowerCase() === candidateVideo)
    ) ||
    atoms.find(atom => normalizeTitle(atom.title) === candidateTitle) ||
    null
}

function findHitForAtom(bundles = [], rawAtom = null, candidate = {}) {
  if (!rawAtom) return null
  const candidateHitRefs = list(candidate.evidenceRefs).filter(isHitRef)
  const candidateVideo = sourceVideoId(candidate).toLowerCase()
  const hits = bundles.flatMap(bundle => bundle.hits || [])

  return hits.find(hit => candidateHitRefs.includes(hit.hitId)) ||
    hits.find(hit => hit.atomId === rawAtom.atomId) ||
    hits.find(hit =>
      (!candidateVideo || sourceVideoId(hit).toLowerCase() === candidateVideo) &&
        sourceReportArtifactId(hit) === rawAtom.reportArtifactId
    ) ||
    null
}

async function readBundle(reportArtifactId, bundleCache) {
  const normalized = text(reportArtifactId)
  if (!normalized || !looksLikeReportArtifactId(normalized)) return null
  if (bundleCache.has(normalized)) return bundleCache.get(normalized)
  const bundle = await getIntelligenceReportBundle(normalized, { atomLimit: 100, hitLimit: 200 })
  bundleCache.set(normalized, bundle)
  return bundle
}

async function findRawEvidence(candidate = {}, bundleCache) {
  const evidenceRefs = list(candidate.evidenceRefs)
  const evidenceReportRefs = evidenceRefs.filter(looksLikeReportArtifactId)
  const evidenceAtomRefs = unique([
    candidate.sourceAtomId,
    ...evidenceRefs.filter(isAtomRef),
  ])

  const sourceBundleIds = unique([
    candidate.sourceReportArtifactId,
    ...evidenceReportRefs,
  ])
  const candidateBundles = (await Promise.all(sourceBundleIds.map(id => readBundle(id, bundleCache))))
    .filter(bundle => bundle?.report)

  const queriedEvidenceAtoms = evidenceAtomRefs.length
    ? await queryIntelligenceAtomsForScoper({
      atomIds: evidenceAtomRefs,
      statuses: ACTIVE_ATOM_STATUSES,
      maxTier: 1,
      limit: Math.max(1, evidenceAtomRefs.length),
    })
    : []

  let rawAtom = findAtomInBundles(candidateBundles, candidate) ||
    queriedEvidenceAtoms.find(atom => evidenceAtomRefs.includes(atom.atomId)) ||
    null

  let rawAtomBundle = rawAtom?.reportArtifactId
    ? await readBundle(rawAtom.reportArtifactId, bundleCache)
    : null

  const rawBundles = unique([
    ...candidateBundles.map(bundle => bundle.reportArtifactId),
    rawAtomBundle?.reportArtifactId,
  ])
    .map(id => bundleCache.get(id))
    .filter(Boolean)

  if (!rawAtom && rawBundles.length) rawAtom = findAtomInBundles(rawBundles, candidate)
  if (!rawAtomBundle && rawAtom?.reportArtifactId) rawAtomBundle = await readBundle(rawAtom.reportArtifactId, bundleCache)

  const allRawBundles = unique([
    ...rawBundles.map(bundle => bundle.reportArtifactId),
    rawAtomBundle?.reportArtifactId,
  ])
    .map(id => bundleCache.get(id))
    .filter(Boolean)
  const rawHit = findHitForAtom(allRawBundles, rawAtom, candidate)

  return {
    sourceBundleIds,
    sourceBundlesFound: candidateBundles.map(bundle => bundle.reportArtifactId),
    rawReportArtifactId: rawAtom?.reportArtifactId || rawAtomBundle?.reportArtifactId || null,
    rawAtom,
    rawHit,
    evidenceAtomRefs,
    evidenceReportRefs,
  }
}

function evidenceTimestamps(candidate = {}, rawHit = null, rawAtom = null) {
  return unique([
    ...list(candidate.evidenceTimestamps),
    ...list(rawHit?.metadata?.evidenceTimestamps),
    ...list(rawAtom?.metadata?.evidenceTimestamps),
    ...list(rawAtom?.metadata?.timestamps),
  ])
}

function buildDirectorCandidateForScoper(candidate = {}, trace = {}) {
  return {
    rank: candidateRank(candidate),
    title: candidate.title,
    why: candidate.why || candidate.summary || trace.rawAtom?.content || trace.directorAtom?.content || '',
    recommendedNextStep: candidate.recommendedNextStep || candidate.nextStep || trace.rawAtom?.suggestedAction || '',
    sourceReportArtifactId: candidate.sourceReportArtifactId,
    sourceVideoId: sourceVideoId(candidate),
    sourceAtomId: trace.rawAtom?.atomId || candidate.sourceAtomId,
    evidenceRefs: unique([
      trace.rawAtom?.atomId,
      trace.rawHit?.hitId,
      trace.directorAtom?.atomId,
      trace.directorHit?.hitId,
      ...list(candidate.evidenceRefs),
    ]),
    evidenceTimestamps: evidenceTimestamps(candidate, trace.rawHit, trace.rawAtom),
    sourceTrustLabel: candidate.sourceTrustLabel || trace.directorAtom?.metadata?.sourceTrustLabel || 'standard_report',
    missionScore: candidate.missionScore || { total: Number(candidate.missionScore?.total || candidate.qualityScore || 0) },
    resourceLinkCount: Number(candidate.resourceLinkCount || 0),
  }
}

function buildResearchContext(candidate = {}, trace = {}) {
  const title = text(candidate.title) || 'this build opportunity'
  const youtubeSourceId = sourceVideoId(candidate) || candidate.sourceTrustLabel === 'api_full_watch'
    ? 'SRC-YOUTUBE-INTEL-001'
    : ''
  const sourceRefs = unique([
    candidate.sourceReportArtifactId,
    sourceVideoId(candidate) ? `youtube:${sourceVideoId(candidate)}` : '',
    trace.rawReportArtifactId,
    trace.rawAtom?.atomId,
    trace.rawHit?.hitId,
    trace.rawAtom?.anchorValue,
    trace.directorAtom?.atomId,
    trace.directorHit?.hitId,
    ...list(candidate.evidenceRefs),
  ])

  return {
    sourceIds: unique([
      trace.rawAtom?.sourceId,
      youtubeSourceId,
    ]).slice(0, 8),
    sourceRefs,
    codebaseRefs: [
      'lib/dev-team-intelligence-director.js',
      'lib/dev-build-opportunity-scoper.js',
      'lib/build-portfolio-scrum-master.js',
      'scripts/process-dev-build-scoper-evidence-trace-check.mjs',
    ],
    proofRefs: [
      'npm run process:dev-build-scoper-evidence-trace-check -- --json',
      'npm run process:build-portfolio-scrum-master-check -- --json',
    ],
    buildApproach: `Scope a proposal-only ${title} build from the traced raw evidence before any backlog promotion.`,
    details: `Use the Director recommendation only as a pointer; the build packet must cite ${trace.rawAtom?.atomId || 'the raw atom'} and ${trace.rawHit?.hitId || 'the raw evidence hit'} as source evidence.`,
    resourceLinkDispositions: [
      'Only resolver-approved public repo/docs/resource links can support implementation evidence.',
      'Auth, paid, private, download, opt-in, short-link, Skool, Gumroad, and MyICOR links stay blocked unless Steve approves the exact source packet.',
    ],
    acceptanceCriteria: [
      'The scope cites raw source atom and evidence hit IDs, not only a Director summary.',
      'The implementation plan names the existing AIOS files or modules it will reuse or inspect first.',
      'The proof plan is runnable without live provider calls, new extraction, backlog mutation, or external writes.',
      'Any source/resource uncertainty is visible as a blocker instead of being assigned to Steve as hidden homework.',
    ],
    definitionOfDone: [
      'Scoper emits a complete Portfolio-compatible candidate with source lineage, proof, risks, and not-next boundaries.',
      'Portfolio can rank or merge the scoped candidate without reading raw Director output directly.',
      'Promotion remains blocked until Steve approves the evidence packet through the proposal-only promotion gate.',
    ],
    proofPlan: [
      'node --check scripts/process-dev-build-scoper-evidence-trace-check.mjs',
      'npm run process:dev-build-scoper-evidence-trace-check -- --json',
      'npm run process:build-opportunity-promotion-gate-check -- --json',
    ],
    tests: [
      'The live evidence trace proves current top Director candidates resolve back to raw atoms and hits before Scoper readiness.',
    ],
    risks: [
      'A high Director score can hide weak source lineage unless raw atom/hit proof is required.',
      'Scoped candidates can drift into automatic backlog creation; V1 must stay proposal-only.',
    ],
    notNext: [
      'Do not create or mutate backlog cards from this trace.',
      'Do not start new extraction or provider calls from the Scoper.',
      'Do not navigate private/auth sources, forms, downloads, purchases, Skool, or MyICOR.',
      'Do not treat Portfolio readiness as Steve approval.',
    ],
  }
}

function candidateTraceStatus(trace = {}) {
  if (trace.rawAtom?.atomId && trace.rawHit?.hitId) return 'source_trace_ready'
  if (trace.rawAtom?.atomId) return 'source_atom_found_hit_missing'
  if (trace.sourceBundlesFound?.length) return 'source_bundle_found_atom_missing'
  if (trace.evidenceAtomRefs?.length || trace.evidenceReportRefs?.length) return 'evidence_refs_need_resolution'
  return 'raw_source_evidence_missing'
}

function summarizeCandidate(candidate = {}, index = 0, trace = {}, scoped = null, portfolio = null) {
  return {
    rank: candidateRank(candidate, index),
    title: candidate.title,
    sourceTrustLabel: candidate.sourceTrustLabel || 'standard_report',
    sourceReportArtifactId: candidate.sourceReportArtifactId || null,
    sourceVideoId: sourceVideoId(candidate) || null,
    directorAtomId: trace.directorAtom?.atomId || null,
    directorHitId: trace.directorHit?.hitId || null,
    rawReportArtifactId: trace.rawReportArtifactId || null,
    rawAtomId: trace.rawAtom?.atomId || null,
    rawHitId: trace.rawHit?.hitId || null,
    evidenceTimestamps: evidenceTimestamps(candidate, trace.rawHit, trace.rawAtom),
    sourceTraceStatus: candidateTraceStatus(trace),
    scoperStatus: scoped?.status || DEV_BUILD_SCOPER_STATUS.needsResearch,
    portfolioDecision: portfolio?.groups?.[0]?.decision || null,
    promotionStatus: candidate.promotionStatus || 'proposal_only_needs_scoper_before_steve_approval',
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const bundleCache = new Map()
  const directorBundle = await getIntelligenceReportBundle(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, {
    atomLimit: 100,
    hitLimit: 200,
  })
  bundleCache.set(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, directorBundle)

  const candidates = getDirectorCandidates(directorBundle, args.candidateLimit)
  const reviewedCandidates = []

  for (const [index, candidate] of candidates.entries()) {
    const directorAtom = findDirectorAtom(directorBundle, candidate)
    const directorHit = findDirectorHit(directorBundle, candidate, directorAtom)
    const rawEvidence = await findRawEvidence(candidate, bundleCache)
    const trace = {
      ...rawEvidence,
      directorAtom,
      directorHit,
    }
    const hasRawTrace = Boolean(trace.rawAtom?.atomId && trace.rawHit?.hitId)
    const scoped = hasRawTrace
      ? buildDevBuildOpportunityScope({
        directorCandidate: buildDirectorCandidateForScoper(candidate, trace),
        researchContext: buildResearchContext(candidate, trace),
      })
      : buildDevBuildOpportunityScope({
        directorCandidate: buildDirectorCandidateForScoper(candidate, trace),
        researchContext: {
          sourceRefs: unique([
            candidate.sourceReportArtifactId,
            ...list(candidate.evidenceRefs),
          ]),
        },
      })
    const portfolio = scoped.status === DEV_BUILD_SCOPER_STATUS.readyForPortfolio
      ? buildPortfolioReview({ candidates: [scoped.portfolioCandidate] })
      : null

    reviewedCandidates.push(summarizeCandidate(candidate, index, trace, scoped, portfolio))
  }

  const apiFullWatchCandidates = reviewedCandidates.filter(candidate => candidate.sourceTrustLabel === 'api_full_watch')
  const readyCandidates = reviewedCandidates.filter(candidate => candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.readyForPortfolio)

  addCheck(
    checks,
    Boolean(directorBundle.report) && candidates.length > 0,
    'live Director report provides current top candidates',
    `${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID}; reviewed=${candidates.length}`
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
