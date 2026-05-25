import crypto from 'node:crypto'

import {
  BUILD_PORTFOLIO_DECISIONS,
  buildPortfolioReview,
  getBuildPortfolioCompleteness,
} from './build-portfolio-scrum-master.js'

export const DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID = 'DEV-BUILD-OPPORTUNITY-SCOPER-001'
export const DEV_BUILD_OPPORTUNITY_SCOPER_PLAN_PATH = 'docs/process/dev-build-opportunity-scoper-001-plan.md'
export const DEV_BUILD_OPPORTUNITY_SCOPER_APPROVAL_PATH = 'docs/process/approvals/DEV-BUILD-OPPORTUNITY-SCOPER-001.json'
export const DEV_BUILD_OPPORTUNITY_SCOPER_SCRIPT_PATH = 'scripts/process-dev-build-opportunity-scoper-check.mjs'

export const DEV_BUILD_SCOPER_STATUS = {
  readyForPortfolio: 'ready_for_portfolio_review',
  needsResearch: 'needs_deeper_research_before_scoping',
  blockedSourceOrAuth: 'blocked_source_or_auth_boundary',
}

const REQUIRED_SCOPER_RESEARCH = {
  sourceLineage: 2,
  codebaseRefs: 2,
  proofRefs: 1,
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value.map(item => text(item)).filter(Boolean) : []
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12)
}

function slug(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'build-opportunity'
}

function sourceLineageFromDirectorCandidate(candidate = {}) {
  return [...new Set([
    candidate.sourceReportArtifactId,
    candidate.sourceVideoId ? `youtube:${candidate.sourceVideoId}` : '',
    candidate.sourceAtomId,
    ...(list(candidate.evidenceRefs)),
    ...(list(candidate.evidenceTimestamps).map(item => `timestamp:${item}`)),
  ].filter(Boolean))]
}

function hasRawEvidenceTrace(sourceLineage = []) {
  return sourceLineage.some(ref => /^(atom|hit):/i.test(ref) || /\bintelligence_atom(s|_hits)\b/i.test(ref))
}

function sourceLineageForScoper(directorCandidate = {}, researchContext = {}) {
  return [...new Set([
    ...sourceLineageFromDirectorCandidate(directorCandidate),
    ...list(researchContext.sourceRefs),
    ...list(researchContext.evidenceRefs),
  ].filter(Boolean))]
}

function hasSourceOrAuthBlocker(candidate = {}, researchContext = {}) {
  const blockerText = [
    candidate.status,
    candidate.statusNote,
    candidate.blockedOn,
    candidate.blocker,
    candidate.title,
    candidate.recommendedNextStep,
    researchContext.status,
    researchContext.statusNote,
    researchContext.blockedOn,
    ...(list(candidate.blockers)),
    ...(list(researchContext.blockers)),
  ].join(' ')
  return /\b(auth|credential|login|paid|private|skool|myicor|source packet|permission)\b/i.test(blockerText)
}

function needsResourceLinkDisposition(candidate = {}, researchContext = {}) {
  return Boolean(
    candidate.resourceLinkCount ||
      researchContext.resourceLinksFound ||
      list(candidate.resourceLinks).length ||
      list(researchContext.resourceLinks).length ||
      list(researchContext.unresolvedResourceLinks).length ||
      list(researchContext.approvalRequiredResourceLinks).length
  )
}

function scoperMissingPieces({ directorCandidate = {}, researchContext = {} } = {}) {
  const sourceLineage = sourceLineageForScoper(directorCandidate, researchContext)
  const codebaseRefs = list(researchContext.codebaseRefs)
  const proofRefs = list(researchContext.proofRefs)
  const risks = list(researchContext.risks)
  const acceptanceCriteria = list(researchContext.acceptanceCriteria)
  const definitionOfDone = list(researchContext.definitionOfDone)
  const notNext = list(researchContext.notNext)
  const resourceLinkDispositions = list(researchContext.resourceLinkDispositions)

  const missing = []
  if (sourceLineage.length < REQUIRED_SCOPER_RESEARCH.sourceLineage) missing.push('source_lineage')
  if (!hasRawEvidenceTrace(sourceLineage)) missing.push('raw_evidence_atom_or_hit')
  if (codebaseRefs.length < REQUIRED_SCOPER_RESEARCH.codebaseRefs) missing.push('codebase_research_refs')
  if (proofRefs.length < REQUIRED_SCOPER_RESEARCH.proofRefs) missing.push('proof_refs')
  if (!acceptanceCriteria.length) missing.push('acceptance_criteria')
  if (!definitionOfDone.length) missing.push('definition_of_done')
  if (!risks.length) missing.push('risks')
  if (!notNext.length) missing.push('not_next_boundaries')
  if (!text(researchContext.buildApproach)) missing.push('build_approach')
  if (needsResourceLinkDisposition(directorCandidate, researchContext) && !resourceLinkDispositions.length) {
    missing.push('resource_link_disposition')
  }
  return missing
}

function getLane(candidate = {}) {
  const haystack = [
    candidate.title,
    candidate.why,
    candidate.recommendedNextStep,
  ].join(' ')
  if (/\b(extract|video|audio|visual|youtube|gemini|transcript|comments?)\b/i.test(haystack)) return 'god-mode-extractor'
  if (/\b(synthesis|router|dedupe|atom|evidence)\b/i.test(haystack)) return 'intelligence-spine'
  if (/\b(agent|runtime|handoff|context|memory|skill|orchestrator)\b/i.test(haystack)) return 'agent-runtime'
  if (/\b(source|registry|auth|connector|github|skool|myicor)\b/i.test(haystack)) return 'source-registry'
  if (/\b(ui|page|hub|dashboard|frontend|design)\b/i.test(haystack)) return 'ui-workflow'
  return 'general-aios'
}

function buildPartialPortfolioCandidate({ directorCandidate = {}, researchContext = {}, status, missing = [] } = {}) {
  const sourceLineage = sourceLineageForScoper(directorCandidate, researchContext)
  return {
    id: `SCOPED-${slug(directorCandidate.title).toUpperCase()}-${stableHash({ title: directorCandidate.title, sourceLineage })}`,
    title: directorCandidate.title || 'Untitled build opportunity',
    summary: directorCandidate.why || directorCandidate.summary || directorCandidate.recommendedNextStep || '',
    recommendedNextStep: directorCandidate.recommendedNextStep || '',
    lane: researchContext.lane || getLane(directorCandidate),
    status,
    statusNote: status === DEV_BUILD_SCOPER_STATUS.blockedSourceOrAuth
      ? 'Blocked by source/auth approval boundary; do not promote until the source packet or login permission is approved.'
      : missing.length
        ? `Scoper cannot call this build-ready yet. Missing: ${missing.join(', ')}.`
        : 'Scoper output is proposal-only.',
    scope: {
      what: text(researchContext.buildApproach),
      why: directorCandidate.why || directorCandidate.summary || '',
      details: text(researchContext.details || directorCandidate.recommendedNextStep),
      acceptanceCriteria: list(researchContext.acceptanceCriteria),
      definitionOfDone: list(researchContext.definitionOfDone),
      tests: list(researchContext.tests),
      proofPlan: list(researchContext.proofPlan),
      risks: list(researchContext.risks),
      notNext: list(researchContext.notNext),
      existingWorkToReuse: [
        ...list(researchContext.codebaseRefs),
        ...list(researchContext.oldSystemRefs),
      ],
      resourceLinkDispositions: list(researchContext.resourceLinkDispositions),
    },
    sourceRefs: [
      ...sourceLineage,
      ...list(researchContext.sourceRefs),
      ...list(researchContext.externalRefs),
      ...list(researchContext.proofRefs),
      ...list(researchContext.resourceLinkRefs),
    ],
    sourceIds: list(researchContext.sourceIds),
    director: {
      rank: directorCandidate.rank,
      missionScore: directorCandidate.missionScore?.total || directorCandidate.missionScore || null,
      sourceTrustLabel: directorCandidate.sourceTrustLabel || '',
      sourceReportArtifactId: directorCandidate.sourceReportArtifactId || '',
      sourceVideoId: directorCandidate.sourceVideoId || '',
      resourceLinkCount: directorCandidate.resourceLinkCount || list(directorCandidate.resourceLinks).length || null,
    },
    scoper: {
      cardId: DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
      missing,
      researchDigest: stableHash({
        codebaseRefs: researchContext.codebaseRefs,
        proofRefs: researchContext.proofRefs,
        buildApproach: researchContext.buildApproach,
      }),
    },
    tags: ['dev-build-scoper', 'proposal-only'],
  }
}

export function buildDevBuildOpportunityScope({
  directorCandidate = {},
  researchContext = {},
} = {}) {
  const blocked = hasSourceOrAuthBlocker(directorCandidate, researchContext)
  const missing = scoperMissingPieces({ directorCandidate, researchContext })
  const status = blocked
    ? DEV_BUILD_SCOPER_STATUS.blockedSourceOrAuth
    : missing.length
      ? DEV_BUILD_SCOPER_STATUS.needsResearch
      : DEV_BUILD_SCOPER_STATUS.readyForPortfolio
  const portfolioCandidate = buildPartialPortfolioCandidate({
    directorCandidate,
    researchContext,
    status,
    missing,
  })
  const completeness = getBuildPortfolioCompleteness(portfolioCandidate)

  return {
    ok: status === DEV_BUILD_SCOPER_STATUS.readyForPortfolio && completeness.ok,
    cardId: DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
    status,
    missing,
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    autoApproved: false,
    externalWrites: false,
    portfolioCandidate,
    portfolioCompleteness: completeness,
  }
}

export function buildDevBuildOpportunityScoperDogfoodProof() {
  const directorCandidate = {
    rank: 1,
    title: 'Video-to-SOP Agentic Pipeline',
    why: 'Allows Steve and the team to turn screen-recorded workflows into structured AIOS operating skills and training notes.',
    recommendedNextStep: 'Scope a local CLI that accepts an approved video file or URL, extracts transcript/visual/audio evidence, and writes a governed SOP markdown packet.',
    sourceReportArtifactId: 'batch:mark-kashef-last-50:api-full-watch-small-batch-v1',
    sourceVideoId: 'hTWxGSsGDZU',
    sourceTrustLabel: 'api_full_watch',
    missionScore: { total: 87 },
    resourceLinkCount: 2,
  }
  const researched = buildDevBuildOpportunityScope({
    directorCandidate,
    researchContext: {
      sourceIds: ['SRC-YOUTUBE-INTEL-001'],
      sourceRefs: [
        'atom:mark-kashef-last-50-baseline-001:api-batch:htwxgssgdzu:video-to-sop-agentic-pipeline',
        'hit:atom:mark-kashef-last-50-baseline-001:api-batch:htwxgssgdzu:video-to-sop-agentic-pipeline',
      ],
      codebaseRefs: [
        'lib/intelligence-spine-god-mode.js',
        'lib/dev-team-intelligence-director.js',
        'scripts/process-extractor-overnight-run-guard-check.mjs',
      ],
      oldSystemRefs: ['/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-implementation-scoper/SKILL.md'],
      proofRefs: ['npm run intelligence:spine-god-mode-check -- --json'],
      buildApproach: 'Add a proposal-only SOP packet generator path that reuses governed video evidence and writes no backlog or external content.',
      details: 'The first slice should accept existing approved extractor artifacts, group transcript/audio/visual evidence by timestamp, and render a markdown SOP packet for human review.',
      resourceLinkDispositions: [
        'Public docs/repo links may be resolved by the approved resource-link resolver before final scoping.',
        'Skool, Gumroad, download, short-link, paid, login, and opt-in links remain blocked until source packet approval.',
      ],
      acceptanceCriteria: [
        'Uses existing approved video artifacts instead of starting a new crawl.',
        'Every generated SOP section links back to source report/video/timestamp evidence.',
        'Output remains proposal-only and does not create backlog cards.',
      ],
      definitionOfDone: [
        'Synthetic video artifact fixture renders a complete SOP packet.',
        'Missing visual/audio evidence is shown as a gap, not invented.',
        'Portfolio review accepts the scoped candidate as complete.',
      ],
      proofPlan: [
        'node --check lib/dev-build-opportunity-scoper.js',
        'npm run process:dev-build-scoper-check -- --json',
      ],
      tests: ['fixture proves source lineage, not-next boundaries, and proof commands survive portfolio review'],
      risks: ['Generated SOP text can look authoritative even when evidence is incomplete.'],
      notNext: [
        'Do not publish SOPs automatically.',
        'Do not start a new video crawl from the Scoper.',
        'Do not create sprint/backlog cards without Steve approval.',
      ],
    },
  })
  const researchedWithoutRawEvidence = buildDevBuildOpportunityScope({
    directorCandidate,
    researchContext: {
      sourceIds: ['SRC-YOUTUBE-INTEL-001'],
      codebaseRefs: [
        'lib/intelligence-spine-god-mode.js',
        'lib/dev-team-intelligence-director.js',
      ],
      proofRefs: ['npm run intelligence:spine-god-mode-check -- --json'],
      buildApproach: 'Scope the feature from the Director recommendation.',
      resourceLinkDispositions: ['resource links not checked in this synthetic case'],
      acceptanceCriteria: ['candidate has a build target'],
      definitionOfDone: ['candidate has a proof path'],
      risks: ['Director summary can drift from raw extraction evidence.'],
      notNext: ['do not approve from Director summary only'],
    },
  })
  const researchedWithoutResourceLinks = buildDevBuildOpportunityScope({
    directorCandidate,
    researchContext: {
      sourceIds: ['SRC-YOUTUBE-INTEL-001'],
      sourceRefs: [
        'atom:mark-kashef-last-50-baseline-001:api-batch:htwxgssgdzu:video-to-sop-agentic-pipeline',
        'hit:atom:mark-kashef-last-50-baseline-001:api-batch:htwxgssgdzu:video-to-sop-agentic-pipeline',
      ],
      codebaseRefs: [
        'lib/intelligence-spine-god-mode.js',
        'lib/dev-team-intelligence-director.js',
      ],
      proofRefs: ['npm run intelligence:spine-god-mode-check -- --json'],
      buildApproach: 'Scope the feature from source evidence.',
      acceptanceCriteria: ['candidate has a build target'],
      definitionOfDone: ['candidate has a proof path'],
      risks: ['resource links can hide the actual code or skill package being discussed'],
      notNext: ['do not manually chase links outside source policy'],
    },
  })
  const unresearched = buildDevBuildOpportunityScope({ directorCandidate, researchContext: {} })
  const blocked = buildDevBuildOpportunityScope({
    directorCandidate: {
      ...directorCandidate,
      title: 'Crawl paid Skool course workflows',
      sourceReportArtifactId: 'skool:mark-paid',
    },
    researchContext: {
      status: 'blocked by paid source packet and login approval required',
      sourceIds: ['SRC-SKOOL-PAID-PENDING'],
      codebaseRefs: ['lib/dev-team-hub.js', 'docs/source-registry.md'],
      proofRefs: ['source packet approval required'],
      buildApproach: 'Wait for source packet approval before scoping paid course crawl behavior.',
      acceptanceCriteria: ['source packet approved first'],
      definitionOfDone: ['auth boundary recorded'],
      risks: ['paid course extraction can cross auth/content boundaries'],
      notNext: ['do not log in or crawl paid source'],
    },
  })
  const researchedPortfolio = buildPortfolioReview({ candidates: [researched.portfolioCandidate] })
  const unresearchedPortfolio = buildPortfolioReview({ candidates: [unresearched.portfolioCandidate] })
  const blockedPortfolio = buildPortfolioReview({ candidates: [blocked.portfolioCandidate] })

  const checks = [
    {
      ok: researched.ok === true && researched.portfolioCompleteness.ok === true,
      check: 'researched Director candidate becomes a complete scoped portfolio candidate',
      detail: researched.status,
    },
    {
      ok: researchedPortfolio.groups[0]?.decision === BUILD_PORTFOLIO_DECISIONS.standaloneCandidate,
      check: 'complete Scoper output can enter portfolio review as a scoped candidate',
      detail: researchedPortfolio.groups[0]?.decision || 'missing',
    },
    {
      ok: researchedWithoutRawEvidence.ok === false &&
        researchedWithoutRawEvidence.status === DEV_BUILD_SCOPER_STATUS.needsResearch &&
        researchedWithoutRawEvidence.missing.includes('raw_evidence_atom_or_hit'),
      check: 'Scoper rejects Director-only scope that lacks a raw atom or evidence hit',
      detail: researchedWithoutRawEvidence.missing.join(', '),
    },
    {
      ok: researchedWithoutResourceLinks.ok === false &&
        researchedWithoutResourceLinks.status === DEV_BUILD_SCOPER_STATUS.needsResearch &&
        researchedWithoutResourceLinks.missing.includes('resource_link_disposition'),
      check: 'Scoper rejects YouTube scope that ignores description/resource links',
      detail: researchedWithoutResourceLinks.missing.join(', '),
    },
    {
      ok: unresearched.ok === false &&
        unresearched.status === DEV_BUILD_SCOPER_STATUS.needsResearch &&
        unresearchedPortfolio.groups[0]?.decision === BUILD_PORTFOLIO_DECISIONS.returnToScoper,
      check: 'unresearched Director candidate returns to Scoper/research',
      detail: unresearched.missing.join(', '),
    },
    {
      ok: blocked.status === DEV_BUILD_SCOPER_STATUS.blockedSourceOrAuth &&
        blockedPortfolio.groups[0]?.decision === BUILD_PORTFOLIO_DECISIONS.parkBlocked,
      check: 'paid/auth source candidate parks before portfolio promotion',
      detail: blockedPortfolio.groups[0]?.decision || 'missing',
    },
    {
      ok: [researched, unresearched, blocked].every(result =>
        result.proposalOnly === true &&
        result.writesBacklog === false &&
        result.opensSprint === false &&
        result.autoApproved === false &&
        result.externalWrites === false
      ),
      check: 'Scoper outputs stay proposal-only with no backlog, sprint, approval, or external writes',
      detail: 'proposal-only',
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    researched,
    researchedWithoutRawEvidence,
    researchedWithoutResourceLinks,
    unresearched,
    blocked,
    researchedPortfolio,
    unresearchedPortfolio,
    blockedPortfolio,
  }
}
