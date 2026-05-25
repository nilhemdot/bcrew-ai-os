#!/usr/bin/env node

import process from 'node:process'

import {
  closeFoundationDb,
  getIntelligenceReportBundle,
  queryIntelligenceAtomsForScoper,
} from '../lib/foundation-db.js'
import {
  DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
  DEV_BUILD_SCOPER_STATUS,
  buildDevBuildOpportunityScope,
} from '../lib/dev-build-opportunity-scoper.js'
import { buildPortfolioReview } from '../lib/build-portfolio-scrum-master.js'

const RAW_REPORT_ARTIFACT_ID = 'batch:mark-kashef-last-50:api-full-watch-small-batch-v1'
const TARGET_TITLE = 'Video-to-SOP Agentic Pipeline'
const SOURCE_VIDEO_ID = 'hTWxGSsGDZU'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function sourceVideoId(atom = {}) {
  return atom.metadata?.sourceVideoId || atom.metadata?.videoId || atom.metadata?.youtubeVideoId || ''
}

async function main() {
  const args = parseArgs()
  const checks = []
  const atoms = await queryIntelligenceAtomsForScoper({
    query: TARGET_TITLE,
    statuses: ['detected', 'accepted', 'confirmed', 'recurring', 'structural', 'winner'],
    maxTier: 1,
    limit: 20,
  })
  const rawAtom = atoms.find(atom =>
    atom.reportArtifactId === RAW_REPORT_ARTIFACT_ID &&
    atom.title === TARGET_TITLE &&
    sourceVideoId(atom) === SOURCE_VIDEO_ID
  )
  const directorAtom = atoms.find(atom =>
    atom.reportArtifactId === 'director:dev-team-intelligence-director-001:aios-mission-v0' &&
    atom.title === TARGET_TITLE
  )
  const bundle = await getIntelligenceReportBundle(RAW_REPORT_ARTIFACT_ID, {
    atomLimit: 100,
    hitLimit: 200,
  })
  const rawHit = bundle.hits.find(hit => hit.atomId === rawAtom?.atomId)

  const directorCandidate = {
    rank: 1,
    title: TARGET_TITLE,
    why: rawAtom?.content || directorAtom?.content || '',
    recommendedNextStep: rawAtom?.suggestedAction || directorAtom?.suggestedAction || '',
    sourceReportArtifactId: RAW_REPORT_ARTIFACT_ID,
    sourceVideoId: SOURCE_VIDEO_ID,
    sourceAtomId: rawAtom?.atomId,
    evidenceRefs: [
      rawHit?.hitId,
      directorAtom?.atomId,
    ].filter(Boolean),
    evidenceTimestamps: rawHit?.metadata?.evidenceTimestamps || [],
    sourceTrustLabel: 'api_full_watch',
    missionScore: { total: 87 },
    resourceLinkCount: 2,
  }

  const scoped = buildDevBuildOpportunityScope({
    directorCandidate,
    researchContext: {
      sourceIds: ['SRC-YOUTUBE-INTEL-001'],
      sourceRefs: [
        rawAtom?.atomId,
        rawHit?.hitId,
        rawAtom?.anchorValue,
      ].filter(Boolean),
      codebaseRefs: [
        'lib/intelligence-spine-god-mode.js',
        'lib/dev-team-intelligence-director.js',
        'lib/dev-build-opportunity-scoper.js',
        'scripts/process-extractor-overnight-run-guard-check.mjs',
      ],
      proofRefs: [
        'npm run process:dev-build-scoper-check -- --json',
        'npm run process:build-portfolio-scrum-master-check -- --json',
      ],
      buildApproach: 'Scope a proposal-only Video-to-SOP packet generator that reuses existing approved video/audio/visual extraction artifacts instead of starting a new crawl.',
      details: 'Use the raw Mark full-watch atom and supporting hit as source evidence, group transcript/audio/visual observations by timestamp, and render a human-review SOP packet with explicit gaps when evidence is missing.',
      resourceLinkDispositions: [
        'Resolve approved public repo/docs/source links through the resource-link resolver before final build promotion.',
        'Keep Skool, Gumroad, short-link, download, paid, login, opt-in, and private links blocked until source-packet approval.',
      ],
      acceptanceCriteria: [
        'The scope cites at least one raw intelligence atom or evidence hit, not only a Director summary.',
        'YouTube description/resource links are either resolved as approved public evidence or listed as blocked approval items.',
        'Generated SOP sections keep source video, report artifact, atom, hit, and timestamp references visible.',
        'The Scoper does not create backlog cards, open sprint work, start extraction, call a provider, or write externally.',
      ],
      definitionOfDone: [
        'A fixture from the Mark full-watch atom renders a complete review-only SOP packet.',
        'Missing transcript, visual, or audio evidence is shown as a gap instead of invented.',
        'Build Portfolio accepts the scoped candidate as complete and distinct or merges it with overlapping scoped candidates.',
      ],
      proofPlan: [
        'node --check lib/dev-build-opportunity-scoper.js',
        'node --check scripts/process-dev-build-scoper-evidence-trace-check.mjs',
        'npm run process:dev-build-scoper-evidence-trace-check -- --json',
      ],
      tests: [
        'Live evidence trace check proves the top Director candidate links back to a raw source atom and evidence hit.',
      ],
      risks: [
        'SOP output can sound authoritative when source evidence is thin; require visible gaps and source refs.',
        'A reusable SOP generator can drift into auto-backlog creation; keep V1 review-only.',
      ],
      notNext: [
        'Do not publish or apply SOPs automatically.',
        'Do not start new video extraction from the Scoper.',
        'Do not create sprint or backlog cards without Steve approval after Portfolio review.',
      ],
    },
  })
  const portfolio = buildPortfolioReview({ candidates: [scoped.portfolioCandidate] })

  addCheck(checks, Boolean(rawAtom), 'raw Mark full-watch atom exists for top Director candidate', rawAtom?.atomId || 'missing')
  addCheck(checks, Boolean(directorAtom), 'Director atom exists for the same candidate', directorAtom?.atomId || 'missing')
  addCheck(checks, Boolean(rawHit), 'raw evidence hit exists for the source atom', rawHit?.hitId || 'missing')
  addCheck(
    checks,
    scoped.status === DEV_BUILD_SCOPER_STATUS.readyForPortfolio && scoped.ok === true,
    'Scoper accepts the candidate only after raw evidence trace and build research are present',
    scoped.missing.join(', ') || scoped.status
  )
  addCheck(
    checks,
    scoped.portfolioCandidate.sourceRefs.some(ref => String(ref).startsWith('atom:')) &&
      scoped.portfolioCandidate.sourceRefs.some(ref => String(ref).startsWith('hit:')),
    'portfolio candidate preserves raw atom and hit lineage',
    scoped.portfolioCandidate.sourceRefs.join(' | ')
  )
  addCheck(
    checks,
    portfolio.groups[0]?.decision === 'standalone_scoped_candidate',
    'Portfolio can compare the real scoped candidate after Scoper proof',
    portfolio.groups[0]?.decision || 'missing'
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
    target: {
      title: TARGET_TITLE,
      sourceVideoId: SOURCE_VIDEO_ID,
      rawReportArtifactId: RAW_REPORT_ARTIFACT_ID,
      rawAtomId: rawAtom?.atomId || null,
      rawHitId: rawHit?.hitId || null,
      directorAtomId: directorAtom?.atomId || null,
    },
    checks,
    failures,
    scoperStatus: scoped.status,
    portfolioDecision: portfolio.groups[0]?.decision || null,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Dev Build Scoper evidence trace check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
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
