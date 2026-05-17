import fs from 'node:fs/promises'
import path from 'node:path'
import {
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SCRIPT_PATH,
  buildBuildIntelExtractionImplementationSnapshot,
} from './build-intel-extraction-implementation.js'
import {
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_PATH,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SCRIPT_PATH,
  buildKarpathyLlmKbPreflightSnapshot,
} from './build-intel-karpathy-llm-kb-preflight.js'
import {
  CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS,
  CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
  CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS,
  CODE_QUALITY_NIGHTLY_AUDIT_SCRIPT_PATH,
  buildCodeQualityNightlyAudit,
  buildSyntheticCodeQualityNightlyAuditProof,
} from './code-quality-nightly-audit.js'
import {
  GSTACK_BUILD_INTEL_CARD_IDS,
  GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
  GSTACK_BUILD_INTEL_EXPECTED_COMMIT,
  GSTACK_BUILD_INTEL_REPORT_PATH,
  GSTACK_BUILD_INTEL_SCRIPT_PATH,
  buildGStackBuildIntelSnapshot,
} from './gstack-build-intel.js'
import {
  IMPLEMENTATION_INTELLIGENCE_CARD_IDS,
  IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY,
  buildImplementationIntelligenceSnapshot,
} from './implementation-intelligence.js'
import {
  buildFoundationJobRuntimeScheduleDogfoodProof,
  getFoundationJobDefinitions,
} from './foundation-jobs.js'
import {
  NIGHTLY_DEEP_AUDIT_APPROVAL_PATH,
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_PLAN_PATH,
  NIGHTLY_DEEP_AUDIT_SCRIPT_PATH,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
  buildNightlyDeepAuditUpgrade,
  buildNightlyDeepAuditUpgradeDogfoodProof,
} from './nightly-deep-audit-upgrade.js'
import {
  NIGHTLY_AUDIT_RUN_PROOF_CARD_ID,
  buildNightlyAuditRunFreshnessStatus,
  buildNightlyAuditRunProofDogfood,
} from './nightly-audit-run-proof.js'

export const VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID = 'VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001'
export const VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-intelligence-audit-split-module-v1'
export const VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-intelligence-audit-split-module-001-plan.md'
export const VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001.json'
export const VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-intelligence-audit-split-module-check.mjs'
export const VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SPRINT_ID = 'verifier-intelligence-audit-split-module-2026-05-15'
export const VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_BEFORE_LINES = 14889

export const GSTACK_BUILD_INTEL_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'PUBLIC-DEV-COMMUNITY-WATCHLIST-001',
  'GSTACK-EXTRACTION-001',
  'BUILD-INTEL-GITHUB-MONITOR-001',
  'SKILL-IMPROVER-GSTACK-ENRICHMENT-001',
  'REVIEW-GATE-UPGRADE-001',
  'BROWSER-QA-PROOF-001',
]

export const CODE_QUALITY_NIGHTLY_AUDIT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'CODEBASE-HARDCODE-AUDIT-001',
  'FOUNDATION-API-PERF-AUDIT-001',
  'FOUNDATION-FRONTEND-PERF-AUDIT-001',
  'FOUNDATION-MONOLITH-RISK-AUDIT-001',
  'VERIFIER-ASSUMPTION-REGISTRY-001',
  'SPRINT-STATE-MUTATION-AUDIT-001',
  'NIGHTLY-AUDIT-REPORT-001',
]

export const AUDIT_RELIABILITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001',
  'NIGHTLY-DEEP-AUDIT-BACKFILL-001',
  'NIGHTLY-AUDIT-RUN-PROOF-001',
]

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function findBacklogCard(backlogItems = [], cardId) {
  return (backlogItems || []).find(item => item.id === cardId) || null
}

function findCloseout(closeouts = [], closeoutKey) {
  return (closeouts || []).find(closeout => closeout?.key === closeoutKey || closeout?.closeoutKey === closeoutKey) || null
}

function findBuildLogCloseout(foundationBuildLog = {}, foundationBuildCloseouts = [], closeoutKey) {
  return findCloseout(foundationBuildLog.builds || [], closeoutKey) || findCloseout(foundationBuildCloseouts, closeoutKey)
}

async function fileExists(repoRoot, relativePath, repoFiles) {
  if (repoFiles && Object.prototype.hasOwnProperty.call(repoFiles, relativePath)) {
    return Boolean(repoFiles[relativePath])
  }
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile() && stat.size >= 0
  } catch {
    return false
  }
}

async function readTextIfAvailable(repoRoot, relativePath, provided) {
  if (provided !== undefined) return String(provided || '')
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch {
    return ''
  }
}

async function reportExists(repoRoot, relativePath, provided) {
  if (provided !== undefined) return Boolean(provided)
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile() && stat.size > 500
  } catch {
    return false
  }
}

function buildSummary(checks) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

export async function evaluateFoundationIntelligenceAuditVerifier(input = {}) {
  const checks = []
  const repoRoot = input.repoRoot || process.cwd()
  const repoFiles = input.repoFiles || null
  const foundationHub = input.foundationHub || {}
  const foundationJobs = input.foundationJobs || foundationHub.fullDiagnostics?.foundationJobs || foundationHub.foundationJobs || {}
  const backlogItems = input.backlogItems || foundationHub.backlogItems || []
  const activeFoundationSprint = input.activeFoundationSprint || {}
  const foundationBuildCloseouts = input.foundationBuildCloseouts || []
  const foundationBuildLog = input.foundationBuildLog || { builds: [] }
  const packageJson = input.packageJson || {}
  const packageScripts = packageJson.scripts || input.packageScripts || {}
  const currentPlan = input.currentPlan || ''
  const currentState = input.currentState || ''
  const foundationBuildIntelRoutesSource = input.foundationBuildIntelRoutesSource || ''
  const securityAccessSource = input.securityAccessSource || ''
  const sourceRegistry = input.sourceRegistry || ''
  const foundationJobsSource = input.foundationJobsSource || ''
  const foundationVerifySource = input.foundationVerifySource || ''
  const moduleSource = input.moduleSource || ''
  const verifierCoverageSource = `${foundationVerifySource}\n${moduleSource}`

  const implementationIntelligenceCloseout = findCloseout(foundationBuildCloseouts, IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY)
  const implementationIntelligenceCards = IMPLEMENTATION_INTELLIGENCE_CARD_IDS
    .map(id => findBacklogCard(backlogItems, id))
  const implementationIntelligence = input.implementationIntelligence || foundationHub.implementationIntelligence ||
    buildImplementationIntelligenceSnapshot({
      backlogItems,
      currentSprint: activeFoundationSprint,
    })
  const implementationIntelligenceVerifierCoverageIds = [
    'INTERNAL-SCOPER-001',
    'THIN-CARD-DETECTOR-001',
    'RESEARCH-DISPOSITION-QUEUE-001',
    'BUILDER-LESSON-LINKER-001',
    'PUBLIC-YOUTUBE-PREFLIGHT-001',
  ]
  addCheck(
    checks,
    implementationIntelligenceCards.every(card => card?.lane === 'done' && String(card?.statusNote || '').includes(IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY)) &&
      implementationIntelligenceCloseout?.operatorCloseout === true &&
      IMPLEMENTATION_INTELLIGENCE_CARD_IDS.every(id => (implementationIntelligenceCloseout.backlogIds || []).includes(id)) &&
      implementationIntelligenceVerifierCoverageIds.every(id => IMPLEMENTATION_INTELLIGENCE_CARD_IDS.includes(id)) &&
      IMPLEMENTATION_INTELLIGENCE_CARD_IDS.every(id => implementationIntelligenceVerifierCoverageIds.includes(id)) &&
      implementationIntelligence.proposalOnly === true &&
      implementationIntelligence.writesBacklog === false &&
      implementationIntelligence.opensSprint === false &&
      implementationIntelligence.extractionStarted === false &&
      implementationIntelligence.atomsCreated === 0 &&
      implementationIntelligence.thinCardDetector?.totalCards >= 300 &&
      implementationIntelligence.thinCardDetector?.thinCards > 0 &&
      implementationIntelligence.internalScoper?.thinProposal?.proposedDoctrine?.acceptanceCriteria?.length >= 3 &&
      implementationIntelligence.internalScoper?.thinProposal?.writesBacklog === false &&
      implementationIntelligence.internalScoper?.buildReadyNoop?.action === 'no_enrichment_needed' &&
      implementationIntelligence.researchDispositionQueue?.totalResearchCards >= 100 &&
      implementationIntelligence.researchDispositionQueue?.writesBacklog === false &&
      implementationIntelligence.researchDispositionQueue?.movesCards === false &&
      implementationIntelligence.builderLessonLinker?.enrichExistingCount >= 1 &&
      implementationIntelligence.builderLessonLinker?.writesBacklog === false &&
      implementationIntelligence.publicYoutubePreflight?.publicCandidateCount >= 20 &&
      implementationIntelligence.publicYoutubePreflight?.paidOrAuthBlockedCount >= 1 &&
      implementationIntelligence.publicYoutubePreflight?.envelopeValidation?.ok === true &&
      implementationIntelligence.publicYoutubePreflight?.extractionStarted === false &&
      implementationIntelligence.publicYoutubePreflight?.paidAuthUsed === false &&
      packageScripts?.['process:implementation-intelligence-check'] === 'node --env-file-if-exists=.env scripts/process-implementation-intelligence-check.mjs' &&
      foundationBuildIntelRoutesSource.includes("app.get('/api/foundation/implementation-intelligence'") &&
      currentPlan.includes(IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY) &&
      currentState.includes(IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY),
    'Implementation Intelligence closes internal scoper, thin-card detector, research queue, builder linker, and public YouTube preflight without mutation',
    `cards=${implementationIntelligenceCards.filter(card => card?.lane === 'done').length}/${IMPLEMENTATION_INTELLIGENCE_CARD_IDS.length} thin=${implementationIntelligence.thinCardDetector?.thinCards || 0} research=${implementationIntelligence.researchDispositionQueue?.totalResearchCards || 0} youtube=${implementationIntelligence.publicYoutubePreflight?.publicCandidateCount || 0}`,
  )

  const buildIntelExtractionCloseout = findCloseout(foundationBuildCloseouts, BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY)
  const buildIntelExtractionCards = BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS
    .map(id => findBacklogCard(backlogItems, id))
  const buildIntelExtraction = input.buildIntelExtraction || foundationHub.buildIntelExtraction ||
    buildBuildIntelExtractionImplementationSnapshot({
      transcriptContexts: [],
      backlogItems,
      currentSprint: activeFoundationSprint,
    })
  const buildIntelExtractionVerifierCoverageIds = [
    'YOUTUBE-SCOUT-001',
    'PUBLIC-YOUTUBE-BUILD-INTEL-001',
    'BUILD-INTEL-OBSERVATION-EXTRACTOR-001',
    'BUILD-INTEL-RESEARCH-INBOX-PROPOSALS-001',
    'BUILD-INTEL-BRIEF-001',
  ]
  const buildIntelExtractionReportExists = await reportExists(repoRoot, BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH, input.buildIntelExtractionReportExists)
  addCheck(
    checks,
    buildIntelExtractionCards.every(card => card?.lane === 'done' && String(card?.statusNote || '').includes(BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY)) &&
      buildIntelExtractionCloseout?.operatorCloseout === true &&
      BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS.every(id => (buildIntelExtractionCloseout.backlogIds || []).includes(id)) &&
      buildIntelExtractionVerifierCoverageIds.every(id => BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS.includes(id)) &&
      BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS.every(id => buildIntelExtractionVerifierCoverageIds.includes(id)) &&
      buildIntelExtraction.status === 'ready' &&
      buildIntelExtraction.proposalOnly === true &&
      buildIntelExtraction.writesBacklog === false &&
      buildIntelExtraction.opensSprint === false &&
      buildIntelExtraction.paidAuthUsed === false &&
      buildIntelExtraction.newExternalCrawlStarted === false &&
      buildIntelExtraction.publicWebSearchStarted === false &&
      buildIntelExtraction.atomsCreated === 0 &&
      buildIntelExtraction.screenshotsCaptured === 0 &&
      buildIntelExtraction.keyFramesCaptured === 0 &&
      buildIntelExtraction.selectedTranscriptArtifacts >= 1 &&
      buildIntelExtraction.selectedInputs?.some(item => item.artifactId === 'SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys') &&
      buildIntelExtraction.observationExtractor?.observationsCount >= 3 &&
      buildIntelExtraction.observationExtractor?.allEnvelopesValid === true &&
      buildIntelExtraction.observationExtractor?.visualEvidenceStatus === 'not_captured_v1' &&
      buildIntelExtraction.researchInboxProposals?.proposalCount >= 3 &&
      buildIntelExtraction.researchInboxProposals?.enrichExistingCount >= 1 &&
      buildIntelExtraction.researchInboxProposals?.writesBacklog === false &&
      buildIntelExtraction.researchInboxProposals?.autoCreatesBacklog === false &&
      buildIntelExtraction.brief?.nextRecommendedSprint === 'Build Intel Extraction Expansion Sprint' &&
      buildIntelExtractionReportExists &&
      packageScripts?.['process:build-intel-extraction-check'] === `node --env-file-if-exists=.env ${BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SCRIPT_PATH}` &&
      foundationBuildIntelRoutesSource.includes("app.get('/api/foundation/build-intel-extraction'") &&
      currentPlan.includes(BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY) &&
      currentState.includes(BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY),
    'Build Intel Extraction Implementation consumes public transcripts into proposal-only observations, Research Inbox proposals, and a brief',
    `cards=${buildIntelExtractionCards.filter(card => card?.lane === 'done').length}/${BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS.length} selected=${buildIntelExtraction.selectedTranscriptArtifacts || 0} observations=${buildIntelExtraction.observationExtractor?.observationsCount || 0} proposals=${buildIntelExtraction.researchInboxProposals?.proposalCount || 0}`,
  )

  const karpathyKbPreflightCloseout = findCloseout(foundationBuildCloseouts, BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY)
  const karpathyKbPreflightCard = findBacklogCard(backlogItems, BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID)
  const karpathyKbPreflight = input.karpathyKbPreflight || foundationHub.karpathyKbPreflight ||
    buildKarpathyLlmKbPreflightSnapshot({ backlogItems })
  const karpathyKbPreflightReportExists = await reportExists(repoRoot, BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_PATH, input.karpathyKbPreflightReportExists)
  addCheck(
    checks,
    karpathyKbPreflightCard?.lane === 'done' &&
      String(karpathyKbPreflightCard.statusNote || '').includes(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY) &&
      karpathyKbPreflightCloseout?.operatorCloseout === true &&
      (karpathyKbPreflightCloseout.backlogIds || []).includes(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID) &&
      karpathyKbPreflight.status === 'ready' &&
      karpathyKbPreflight.proposalOnly === true &&
      karpathyKbPreflight.writesBacklog === false &&
      karpathyKbPreflight.opensSprint === false &&
      karpathyKbPreflight.liveExtractionStarted === false &&
      karpathyKbPreflight.paidExtractionStarted === false &&
      karpathyKbPreflight.authRequiredExtractionStarted === false &&
      karpathyKbPreflight.researchInboxWritten === false &&
      karpathyKbPreflight.atomsCreated === 0 &&
      karpathyKbPreflight.sourceCandidates?.length === 3 &&
      karpathyKbPreflight.stageSummary?.missingDesign >= 2 &&
      karpathyKbPreflight.proposalRows?.some(row => row.proposedCardId === 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001' && row.writesBacklog === false) &&
      karpathyKbPreflight.proposalRows?.some(row => row.proposedCardId === 'KNOWLEDGE-BASE-QUALITY-GATE-001' && row.writesBacklog === false) &&
      karpathyKbPreflight.notToCopy?.some(item => /Harlan-only memory hack/i.test(item)) &&
      karpathyKbPreflight.recommendedNext === 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001' &&
      karpathyKbPreflightReportExists &&
      packageScripts?.['process:build-intel-karpathy-llm-kb-preflight-check'] === `node --env-file-if-exists=.env ${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SCRIPT_PATH}` &&
      currentPlan.includes(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY) &&
      currentState.includes(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY),
    'BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 maps Karpathy KB pattern to Foundation compiler gaps without extraction',
    karpathyKbPreflightCard
      ? `lane=${karpathyKbPreflightCard.lane} status=${karpathyKbPreflight.status} missing=${karpathyKbPreflight.stageSummary?.missingDesign || 0} recommended=${karpathyKbPreflight.recommendedNext || 'missing'}`
      : `missing ${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID}`,
  )

  const gstackBuildIntelCloseout = findCloseout(foundationBuildCloseouts, GSTACK_BUILD_INTEL_CLOSEOUT_KEY)
  const gstackBuildIntelCards = GSTACK_BUILD_INTEL_CARD_IDS
    .map(id => findBacklogCard(backlogItems, id))
  const gstackBuildIntel = input.gstackBuildIntel || foundationHub.gstackBuildIntel ||
    await buildGStackBuildIntelSnapshot({ allowMissingRepo: true })
  const gstackBuildIntelReport = await readTextIfAvailable(repoRoot, GSTACK_BUILD_INTEL_REPORT_PATH, input.gstackBuildIntelReport)
  const gstackBuildIntelReportExists = input.gstackBuildIntelReportExists !== undefined
    ? Boolean(input.gstackBuildIntelReportExists)
    : gstackBuildIntelReport.length > 500
  const gstackPatternIds = Array.isArray(gstackBuildIntel.patternScorecard)
    ? gstackBuildIntel.patternScorecard.map(pattern => pattern.patternId)
    : []
  const gstackWatchlistSourceIds = Array.isArray(gstackBuildIntel.publicDeveloperCommunityWatchlist?.sources)
    ? gstackBuildIntel.publicDeveloperCommunityWatchlist.sources.map(source => source.sourceId)
    : []
  addCheck(
    checks,
    gstackBuildIntelCards.every(card => card?.lane === 'done' && String(card?.statusNote || '').includes(GSTACK_BUILD_INTEL_CLOSEOUT_KEY)) &&
      gstackBuildIntelCloseout?.operatorCloseout === true &&
      GSTACK_BUILD_INTEL_CARD_IDS.every(id => (gstackBuildIntelCloseout.backlogIds || []).includes(id)) &&
      gstackBuildIntel.proposalOnly === true &&
      gstackBuildIntel.writesBacklog === false &&
      gstackBuildIntel.opensSprint === false &&
      gstackBuildIntel.codeImported === false &&
      gstackBuildIntel.installStarted === false &&
      gstackBuildIntel.privateScrapeStarted === false &&
      gstackBuildIntel.paidAuthUsed === false &&
      gstackBuildIntel.autonomousDevEnabled === false &&
      gstackBuildIntel.sourceCommit === GSTACK_BUILD_INTEL_EXPECTED_COMMIT &&
      gstackPatternIds.includes('skill_improver_operating_rules') &&
      gstackPatternIds.includes('review_gate_checklists') &&
      gstackPatternIds.includes('browser_qa_proof_loop') &&
      gstackPatternIds.includes('frontend_design_pipeline') &&
      gstackPatternIds.includes('public_github_monitoring') &&
      gstackWatchlistSourceIds.includes('SRC-GITHUB-BUILD-INTEL-001') &&
      gstackWatchlistSourceIds.includes('SRC-CODEX-COMMUNITY-BUILD-INTEL-001') &&
      gstackWatchlistSourceIds.includes('SRC-CLAUDE-CODE-COMMUNITY-BUILD-INTEL-001') &&
      gstackWatchlistSourceIds.includes('SRC-OPENCLAW-COMMUNITY-BUILD-INTEL-001') &&
      gstackBuildIntel.researchInboxProposals?.proposalCount >= 5 &&
      gstackBuildIntel.researchInboxProposals?.enrichExistingCount >= 1 &&
      gstackBuildIntel.researchInboxProposals?.writesBacklog === false &&
      gstackBuildIntel.researchInboxProposals?.autoCreatesBacklog === false &&
      gstackBuildIntel.skillImproverEnrichment?.writesSkills === false &&
      gstackBuildIntel.skillImproverEnrichment?.defaultToCode === true &&
      gstackBuildIntel.reviewGateUpgrade?.gatesAsCodeFirst === true &&
      gstackBuildIntel.reviewGateUpgrade?.newAgentRequired === false &&
      gstackBuildIntel.browserQaProof?.minimumProof?.length >= 4 &&
      gstackBuildIntelReportExists &&
      gstackBuildIntelReport.includes(GSTACK_BUILD_INTEL_CLOSEOUT_KEY) &&
      gstackBuildIntelReport.includes('Do not install GStack') &&
      packageScripts?.['process:gstack-build-intel-check'] === `node --env-file-if-exists=.env ${GSTACK_BUILD_INTEL_SCRIPT_PATH}` &&
      foundationBuildIntelRoutesSource.includes("app.get('/api/foundation/gstack-build-intel'") &&
      securityAccessSource.includes('/api/foundation/gstack-build-intel') &&
      currentPlan.includes(GSTACK_BUILD_INTEL_CLOSEOUT_KEY) &&
      currentState.includes(GSTACK_BUILD_INTEL_CLOSEOUT_KEY) &&
      sourceRegistry.includes('SRC-GITHUB-BUILD-INTEL-001') &&
      sourceRegistry.includes('/api/foundation/gstack-build-intel') &&
      includesAll(verifierCoverageSource, GSTACK_BUILD_INTEL_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'GStack Build Intel extraction closes public GitHub source mapping, scorecard, proposals, review gates, skill enrichment, and browser QA proof without mutation',
    `cards=${gstackBuildIntelCards.filter(card => card?.lane === 'done').length}/${GSTACK_BUILD_INTEL_CARD_IDS.length} patterns=${gstackPatternIds.length} proposals=${gstackBuildIntel.researchInboxProposals?.proposalCount || 0}`,
  )

  const codeQualityNightlyAuditCloseout = findCloseout(foundationBuildCloseouts, CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY)
  const codeQualityNightlyAuditCards = CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS
    .map(id => findBacklogCard(backlogItems, id))
  const codeQualityNightlyAudit = input.codeQualityNightlyAudit || await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const codeQualityNightlySyntheticProof = input.codeQualityNightlySyntheticProof || buildSyntheticCodeQualityNightlyAuditProof()
  const codeQualityNightlyReport = await readTextIfAvailable(repoRoot, CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH, input.codeQualityNightlyReport)
  const codeQualityNightlyReportExists = input.codeQualityNightlyReportExists !== undefined
    ? Boolean(input.codeQualityNightlyReportExists)
    : codeQualityNightlyReport.length > 500
  const codeQualityNightlyAuditJob = input.codeQualityNightlyAuditJob ||
    getFoundationJobDefinitions().find(job => job.key === CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY) ||
    null
  const codeQualityEndpointIds = Array.isArray(codeQualityNightlyAudit.endpointMetrics)
    ? codeQualityNightlyAudit.endpointMetrics.map(metric => metric.endpoint)
    : []
  addCheck(
    checks,
    codeQualityNightlyAuditCards.every(card => card?.lane === 'done' && String(card?.statusNote || '').includes(CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY)) &&
      codeQualityNightlyAuditCloseout?.operatorCloseout === true &&
      CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS.every(id => (codeQualityNightlyAuditCloseout.backlogIds || []).includes(id)) &&
      codeQualityNightlyAudit.reportOnly === true &&
      codeQualityNightlyAudit.writesBacklog === false &&
      codeQualityNightlyAudit.mutatesDb === false &&
      codeQualityNightlyAudit.autoFixes === false &&
      codeQualityNightlyAudit.autonomousDev === false &&
      codeQualityNightlyAudit.llmDetectionUsed === false &&
      codeQualityNightlySyntheticProof.ok === true &&
      CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS.every(endpoint => codeQualityEndpointIds.includes(endpoint)) &&
      codeQualityNightlyAudit.summary?.findingCount >= 12 &&
      codeQualityNightlyAudit.proposedCards?.length >= 5 &&
      codeQualityNightlyReportExists &&
      codeQualityNightlyReport.includes(CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY) &&
      /no auto-fixes/i.test(codeQualityNightlyReport) &&
      /no auto backlog mutation/i.test(codeQualityNightlyReport) &&
      packageScripts?.['process:code-quality-nightly-audit-check'] === `node --env-file-if-exists=.env ${CODE_QUALITY_NIGHTLY_AUDIT_SCRIPT_PATH}` &&
      codeQualityNightlyAuditJob?.key === CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY &&
      codeQualityNightlyAuditJob?.runtimeMode === 'manual' &&
      codeQualityNightlyAuditJob?.scheduleEveryMinutes === null &&
      codeQualityNightlyAuditJob?.mutationPosture === 'report_only' &&
      currentPlan.includes(CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY) &&
      currentState.includes(CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY) &&
      includesAll(verifierCoverageSource, CODE_QUALITY_NIGHTLY_AUDIT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'Code Quality Nightly Audit closes the deterministic read-only report loop without fixes, backlog writes, scheduling, or LLM detection',
    `cards=${codeQualityNightlyAuditCards.filter(card => card?.lane === 'done').length}/${CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS.length} findings=${codeQualityNightlyAudit.summary?.findingCount || 0} proposed=${codeQualityNightlyAudit.proposedCards?.length || 0}`,
  )

  const nightlyDeepAuditCard = findBacklogCard(backlogItems, NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID)
  const nightlyDeepAuditCloseout = findBuildLogCloseout(foundationBuildLog, foundationBuildCloseouts, NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY)
  const nightlyDeepAuditJob = input.nightlyDeepAuditJob ||
    (foundationJobs.jobs || []).find(job => job.key === NIGHTLY_DEEP_AUDIT_JOB_KEY) ||
    getFoundationJobDefinitions().find(job => job.key === NIGHTLY_DEEP_AUDIT_JOB_KEY) ||
    null
  const nightlyDeepAudit = input.nightlyDeepAudit || await buildNightlyDeepAuditUpgrade({
    repoRoot,
    skipEndpointFetch: true,
  })
  const nightlyDeepAuditDogfood = input.nightlyDeepAuditDogfood || buildNightlyDeepAuditUpgradeDogfoodProof()
  const nightlyAuditScheduleDogfood = input.nightlyAuditScheduleDogfood || buildFoundationJobRuntimeScheduleDogfoodProof()
  const nightlyDeepAuditLatestRun = input.nightlyDeepAuditLatestRun ||
    nightlyDeepAuditJob?.latestRun ||
    (foundationJobs.latestRuns || []).find(run => run.jobKey === NIGHTLY_DEEP_AUDIT_JOB_KEY) ||
    null
  const nightlyAuditRunProofDogfood = input.nightlyAuditRunProofDogfood || buildNightlyAuditRunProofDogfood()
  const nightlyAuditRunFreshness = input.nightlyAuditRunFreshness || buildNightlyAuditRunFreshnessStatus({
    job: nightlyDeepAuditJob,
    latestRun: nightlyDeepAuditLatestRun,
  })
  addCheck(
    checks,
    nightlyDeepAuditCard?.lane === 'done' &&
      String(nightlyDeepAuditCard.statusNote || '').includes(NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY) &&
      nightlyDeepAuditCloseout?.operatorCloseout === true &&
      (nightlyDeepAuditCloseout.backlogIds || []).includes(NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID) &&
      nightlyDeepAudit.reportOnly === true &&
      nightlyDeepAudit.autoFixes === false &&
      nightlyDeepAudit.writesBacklog === false &&
      nightlyDeepAudit.autonomousDev === false &&
      nightlyDeepAudit.autoCreatesBacklog === false &&
      nightlyDeepAudit.coverage?.backend === true &&
      nightlyDeepAudit.coverage?.frontend === true &&
      nightlyDeepAudit.coverage?.endpointMetrics === true &&
      nightlyDeepAudit.reviewTargets?.some(target => target.file === 'scripts/foundation-verify.mjs') &&
      nightlyDeepAudit.reviewTargets?.some(target => target.file === 'public/foundation.js') &&
      nightlyDeepAudit.reviewTargets?.some(target => target.file === 'server.js') &&
      nightlyDeepAudit.reviewTargets?.some(target => target.file === 'lib/foundation-db.js') &&
      nightlyDeepAuditDogfood.ok === true &&
      nightlyAuditScheduleDogfood.ok === true &&
      nightlyAuditRunProofDogfood.ok === true &&
      nightlyAuditRunFreshness.ok === true &&
      nightlyDeepAuditJob?.runtimeMode === 'scheduled' &&
      nightlyDeepAuditJob?.mutationPosture === 'report_only' &&
      packageScripts?.['process:nightly-deep-audit-upgrade-check'] === `node --env-file-if-exists=.env ${NIGHTLY_DEEP_AUDIT_SCRIPT_PATH}` &&
      foundationJobsSource.includes(NIGHTLY_DEEP_AUDIT_JOB_KEY) &&
      foundationJobsSource.includes('scheduleLocalTime: NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME') &&
      await fileExists(repoRoot, NIGHTLY_DEEP_AUDIT_PLAN_PATH, repoFiles) &&
      await fileExists(repoRoot, NIGHTLY_DEEP_AUDIT_APPROVAL_PATH, repoFiles) &&
      await fileExists(repoRoot, 'docs/handoffs/nightly-deep-audit-2026-05-14.md', repoFiles) &&
      await fileExists(repoRoot, 'docs/handoffs/nightly-deep-audit-2026-05-14.json', repoFiles) &&
      includesAll(verifierCoverageSource, [
        'NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID',
        'NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY',
        'buildNightlyDeepAuditUpgradeDogfoodProof',
        'buildFoundationJobRuntimeScheduleDogfoodProof',
        'buildNightlyAuditRunFreshnessStatus',
        'buildNightlyAuditRunProofDogfood',
        'AUDIT_RELIABILITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
      ]),
    'NIGHTLY-DEEP-AUDIT-UPGRADE-001 schedules report-only backend/frontend reviewer loop',
    nightlyDeepAuditCard
      ? `lane=${nightlyDeepAuditCard.lane} findings=${nightlyDeepAudit.deterministicAudit?.summary?.findingCount || 0} targets=${nightlyDeepAudit.reviewTargets?.length || 0} job=${nightlyDeepAuditJob?.runtimeMode || 'missing'} scheduleDogfood=${nightlyAuditScheduleDogfood.ok === true} runFreshness=${nightlyAuditRunFreshness.status}`
      : `missing ${NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID}`,
  )

  const nightlyAuditRunProofCard = findBacklogCard(backlogItems, NIGHTLY_AUDIT_RUN_PROOF_CARD_ID)
  addCheck(
    checks,
    nightlyAuditRunProofCard &&
      ['executing', 'done'].includes(nightlyAuditRunProofCard.lane) &&
      nightlyAuditRunProofDogfood.ok === true &&
      nightlyAuditRunFreshness.ok === true &&
      includesAll(verifierCoverageSource, [
        'NIGHTLY_AUDIT_RUN_PROOF_CARD_ID',
        'buildNightlyAuditRunFreshnessStatus',
        'buildNightlyAuditRunProofDogfood',
      ]),
    'NIGHTLY-AUDIT-RUN-PROOF-001 fails closed on missing, failed, or stale nightly audit runs',
    nightlyAuditRunProofCard
      ? `lane=${nightlyAuditRunProofCard.lane} freshness=${nightlyAuditRunFreshness.status} run=${nightlyDeepAuditLatestRun?.runId || 'missing'} dogfood=${nightlyAuditRunProofDogfood.ok === true}`
      : `missing ${NIGHTLY_AUDIT_RUN_PROOF_CARD_ID}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: buildSummary(checks),
    artifacts: {
      implementationIntelligence,
      buildIntelExtraction,
      karpathyKbPreflight,
      gstackBuildIntel,
      codeQualityNightlyAudit,
      nightlyDeepAudit,
      nightlyDeepAuditJob,
    },
  }
}

function closeout(key, backlogIds) {
  return { key, closeoutKey: key, operatorCloseout: true, backlogIds }
}

function doneCard(id, closeoutKey) {
  return { id, lane: 'done', statusNote: `Closed under ${closeoutKey}.` }
}

function syntheticBaseInput(overrides = {}) {
  const backlogItems = [
    ...IMPLEMENTATION_INTELLIGENCE_CARD_IDS.map(id => doneCard(id, IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY)),
    ...BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS.map(id => doneCard(id, BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY)),
    doneCard(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID, BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY),
    { id: 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001', lane: 'research', statusNote: 'Proposal-only compiler design follow-up.' },
    { id: 'KNOWLEDGE-BASE-QUALITY-GATE-001', lane: 'research', statusNote: 'Proposal-only quality gate follow-up.' },
    ...GSTACK_BUILD_INTEL_CARD_IDS.map(id => doneCard(id, GSTACK_BUILD_INTEL_CLOSEOUT_KEY)),
    ...CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS.map(id => doneCard(id, CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY)),
    doneCard(NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID, NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY),
    doneCard(NIGHTLY_AUDIT_RUN_PROOF_CARD_ID, 'nightly-audit-run-proof-v1'),
  ]
  const foundationBuildCloseouts = [
    closeout(IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY, IMPLEMENTATION_INTELLIGENCE_CARD_IDS),
    closeout(BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY, BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS),
    closeout(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY, [BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID]),
    closeout(GSTACK_BUILD_INTEL_CLOSEOUT_KEY, GSTACK_BUILD_INTEL_CARD_IDS),
    closeout(CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY, CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS),
    closeout(NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY, [NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID]),
  ]
  const implementationIntelligence = {
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    extractionStarted: false,
    atomsCreated: 0,
    thinCardDetector: { totalCards: 300, thinCards: 1 },
    internalScoper: {
      thinProposal: { proposedDoctrine: { acceptanceCriteria: ['one', 'two', 'three'] }, writesBacklog: false },
      buildReadyNoop: { action: 'no_enrichment_needed' },
    },
    researchDispositionQueue: { totalResearchCards: 100, writesBacklog: false, movesCards: false },
    builderLessonLinker: { enrichExistingCount: 1, writesBacklog: false },
    publicYoutubePreflight: {
      publicCandidateCount: 20,
      paidOrAuthBlockedCount: 1,
      envelopeValidation: { ok: true },
      extractionStarted: false,
      paidAuthUsed: false,
    },
  }
  const buildIntelExtraction = {
    status: 'ready',
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    paidAuthUsed: false,
    newExternalCrawlStarted: false,
    publicWebSearchStarted: false,
    atomsCreated: 0,
    screenshotsCaptured: 0,
    keyFramesCaptured: 0,
    selectedTranscriptArtifacts: 1,
    selectedInputs: [{ artifactId: 'SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys' }],
    observationExtractor: { observationsCount: 3, allEnvelopesValid: true, visualEvidenceStatus: 'not_captured_v1' },
    researchInboxProposals: { proposalCount: 3, enrichExistingCount: 1, writesBacklog: false, autoCreatesBacklog: false },
    brief: { nextRecommendedSprint: 'Build Intel Extraction Expansion Sprint' },
  }
  const karpathyKbPreflight = buildKarpathyLlmKbPreflightSnapshot({ backlogItems })
  const gstackBuildIntel = {
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    codeImported: false,
    installStarted: false,
    privateScrapeStarted: false,
    paidAuthUsed: false,
    autonomousDevEnabled: false,
    sourceCommit: GSTACK_BUILD_INTEL_EXPECTED_COMMIT,
    patternScorecard: [
      { patternId: 'skill_improver_operating_rules' },
      { patternId: 'review_gate_checklists' },
      { patternId: 'browser_qa_proof_loop' },
      { patternId: 'frontend_design_pipeline' },
      { patternId: 'public_github_monitoring' },
    ],
    publicDeveloperCommunityWatchlist: {
      sources: [
        { sourceId: 'SRC-GITHUB-BUILD-INTEL-001' },
        { sourceId: 'SRC-CODEX-COMMUNITY-BUILD-INTEL-001' },
        { sourceId: 'SRC-CLAUDE-CODE-COMMUNITY-BUILD-INTEL-001' },
        { sourceId: 'SRC-OPENCLAW-COMMUNITY-BUILD-INTEL-001' },
      ],
    },
    researchInboxProposals: { proposalCount: 5, enrichExistingCount: 1, writesBacklog: false, autoCreatesBacklog: false },
    skillImproverEnrichment: { writesSkills: false, defaultToCode: true },
    reviewGateUpgrade: { gatesAsCodeFirst: true, newAgentRequired: false },
    browserQaProof: { minimumProof: ['desktop', 'mobile', 'console', 'pixels'] },
  }
  const codeQualityNightlyAudit = {
    reportOnly: true,
    writesBacklog: false,
    mutatesDb: false,
    autoFixes: false,
    autonomousDev: false,
    llmDetectionUsed: false,
    endpointMetrics: CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS.map(endpoint => ({ endpoint })),
    summary: { findingCount: 12 },
    proposedCards: ['one', 'two', 'three', 'four', 'five'],
  }
  const nightlyDeepAudit = {
    reportOnly: true,
    autoFixes: false,
    writesBacklog: false,
    autonomousDev: false,
    autoCreatesBacklog: false,
    coverage: { backend: true, frontend: true, endpointMetrics: true },
    reviewTargets: [
      { file: 'scripts/foundation-verify.mjs' },
      { file: 'public/foundation.js' },
      { file: 'server.js' },
      { file: 'lib/foundation-db.js' },
    ],
    deterministicAudit: { summary: { findingCount: 12 } },
  }
  return {
    repoRoot: process.cwd(),
    repoFiles: {
      [NIGHTLY_DEEP_AUDIT_PLAN_PATH]: true,
      [NIGHTLY_DEEP_AUDIT_APPROVAL_PATH]: true,
      'docs/handoffs/nightly-deep-audit-2026-05-14.md': true,
      'docs/handoffs/nightly-deep-audit-2026-05-14.json': true,
    },
    foundationHub: { backlogItems, implementationIntelligence, buildIntelExtraction, karpathyKbPreflight, gstackBuildIntel },
    backlogItems,
    foundationBuildCloseouts,
    foundationBuildLog: { builds: foundationBuildCloseouts },
    packageJson: {
      scripts: {
        'process:implementation-intelligence-check': 'node --env-file-if-exists=.env scripts/process-implementation-intelligence-check.mjs',
        'process:build-intel-extraction-check': `node --env-file-if-exists=.env ${BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SCRIPT_PATH}`,
        'process:build-intel-karpathy-llm-kb-preflight-check': `node --env-file-if-exists=.env ${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SCRIPT_PATH}`,
        'process:gstack-build-intel-check': `node --env-file-if-exists=.env ${GSTACK_BUILD_INTEL_SCRIPT_PATH}`,
        'process:code-quality-nightly-audit-check': `node --env-file-if-exists=.env ${CODE_QUALITY_NIGHTLY_AUDIT_SCRIPT_PATH}`,
        'process:nightly-deep-audit-upgrade-check': `node --env-file-if-exists=.env ${NIGHTLY_DEEP_AUDIT_SCRIPT_PATH}`,
        'process:nightly-audit-run-proof-check': 'node --env-file-if-exists=.env scripts/process-nightly-audit-run-proof-check.mjs',
      },
    },
    currentPlan: [
      IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY,
      BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
      BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY,
      GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
      CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
    ].join('\n'),
    currentState: [
      IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY,
      BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
      BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY,
      GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
      CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
    ].join('\n'),
    foundationBuildIntelRoutesSource: [
      "app.get('/api/foundation/implementation-intelligence'",
      "app.get('/api/foundation/build-intel-extraction'",
      "app.get('/api/foundation/gstack-build-intel'",
    ].join('\n'),
    securityAccessSource: '/api/foundation/gstack-build-intel',
    sourceRegistry: 'SRC-GITHUB-BUILD-INTEL-001 /api/foundation/gstack-build-intel',
    foundationJobsSource: `${CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY}\nruntimeMode: 'manual'\nscheduleEveryMinutes: null\n${NIGHTLY_DEEP_AUDIT_JOB_KEY}\nscheduleLocalTime: NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME`,
    foundationVerifySource: [
      ...GSTACK_BUILD_INTEL_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
      ...CODE_QUALITY_NIGHTLY_AUDIT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
      ...AUDIT_RELIABILITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
      'AUDIT_RELIABILITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
      'NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID',
      'NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY',
      'buildNightlyDeepAuditUpgradeDogfoodProof',
      'buildFoundationJobRuntimeScheduleDogfoodProof',
      'NIGHTLY_AUDIT_RUN_PROOF_CARD_ID',
      'buildNightlyAuditRunFreshnessStatus',
      'buildNightlyAuditRunProofDogfood',
    ].join('\n'),
    buildIntelExtractionReportExists: true,
    karpathyKbPreflightReportExists: true,
    gstackBuildIntelReportExists: true,
    gstackBuildIntelReport: `${GSTACK_BUILD_INTEL_CLOSEOUT_KEY}\nDo not install GStack\n${'x'.repeat(600)}`,
    codeQualityNightlyReportExists: true,
    codeQualityNightlyReport: `${CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY}\nno auto-fixes\nno auto backlog mutation\n${'x'.repeat(600)}`,
    codeQualityNightlyAudit,
    codeQualityNightlyAuditJob: {
      key: CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
      runtimeMode: 'manual',
      scheduleEveryMinutes: null,
      mutationPosture: 'report_only',
    },
    codeQualityNightlySyntheticProof: { ok: true },
    nightlyDeepAudit,
    nightlyDeepAuditJob: {
      key: NIGHTLY_DEEP_AUDIT_JOB_KEY,
      runtimeMode: 'scheduled',
      scheduleEveryMinutes: 1440,
      scheduleLocalTime: '03:00',
      scheduleTimezone: 'America/Toronto',
      mutationPosture: 'report_only',
      latestRun: {
        runId: 'job-nightly-deep-audit-today',
        jobKey: NIGHTLY_DEEP_AUDIT_JOB_KEY,
        status: 'succeeded',
        startedAt: '2026-05-16T07:00:01.000Z',
        finishedAt: '2026-05-16T07:02:00.000Z',
      },
    },
    nightlyDeepAuditDogfood: { ok: true },
    nightlyAuditScheduleDogfood: { ok: true },
    nightlyAuditRunProofDogfood: { ok: true },
    nightlyAuditRunFreshness: { ok: true, status: 'healthy' },
    ...overrides,
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function mutateBase(mutator) {
  const base = syntheticBaseInput()
  mutator(base)
  return base
}

export async function buildFoundationIntelligenceAuditVerifierDogfoodProof() {
  const healthy = await evaluateFoundationIntelligenceAuditVerifier(syntheticBaseInput())
  const implementationMutation = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.implementationIntelligence.writesBacklog = true
  }))
  const buildIntelPaidAuth = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.buildIntelExtraction.paidAuthUsed = true
  }))
  const karpathyLiveExtraction = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.karpathyKbPreflight.liveExtractionStarted = true
  }))
  const gstackImport = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.gstackBuildIntel.codeImported = true
  }))
  const auditAutoFix = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.codeQualityNightlyAudit = clone(input.codeQualityNightlyAudit)
    input.codeQualityNightlyAudit.autoFixes = true
  }))
  const nightlyWrite = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.nightlyDeepAudit = clone(input.nightlyDeepAudit)
    input.nightlyDeepAudit.writesBacklog = true
  }))
  const nightlyScheduleDogfoodMissing = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.nightlyAuditScheduleDogfood = { ok: false }
  }))
  const nightlyRunFreshnessMissing = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.nightlyAuditRunFreshness = { ok: false, status: 'risk' }
  }))

  const rejected = [implementationMutation, buildIntelPaidAuth, karpathyLiveExtraction, gstackImport, auditAutoFix, nightlyWrite, nightlyScheduleDogfoodMissing, nightlyRunFreshnessMissing]
    .every(result => result.ok === false)
  return {
    ok: healthy.ok === true && rejected,
    mode: 'foundation-intelligence-audit-verifier-dogfood',
    healthy: { ok: healthy.ok, passed: healthy.summary.passed, total: healthy.summary.total },
    rejectedCases: {
      implementationMutation: implementationMutation.ok === false,
      buildIntelPaidAuth: buildIntelPaidAuth.ok === false,
      karpathyLiveExtraction: karpathyLiveExtraction.ok === false,
      gstackImport: gstackImport.ok === false,
      auditAutoFix: auditAutoFix.ok === false,
      nightlyWrite: nightlyWrite.ok === false,
      nightlyScheduleDogfoodMissing: nightlyScheduleDogfoodMissing.ok === false,
      nightlyRunFreshnessMissing: nightlyRunFreshnessMissing.ok === false,
    },
  }
}
