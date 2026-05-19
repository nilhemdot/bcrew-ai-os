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
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_PATH,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SCRIPT_PATH,
  buildBuildIntelCreatorWatchlistExpansionDogfoodProof,
  buildBuildIntelCreatorWatchlistExpansionSnapshot,
} from './build-intel-creator-watchlist-expansion.js'
import {
  COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID,
  COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY,
  COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_PATH,
  COURSE_SOURCE_AUTH_BOUNDARY_SCRIPT_PATH,
  buildCourseSourceAuthBoundaryDogfoodProof,
  buildCourseSourceAuthBoundarySnapshot,
} from './course-source-auth-boundary.js'
import {
  YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
  YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
  YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_PATH,
  YOUTUBE_BUILD_INTEL_BATCH_SCRIPT_PATH,
  buildYoutubeBuildIntelBatchDogfoodProof,
  buildYoutubeBuildIntelBatchSnapshot,
} from './youtube-build-intel-batch.js'
import {
  EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID,
  EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY,
  EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_PATH,
  EXTRACTION_TO_KB_ATOM_PIPELINE_SCRIPT_PATH,
  buildExtractionToKbAtomPipelineDogfoodProof,
  buildExtractionToKbAtomPipelineSnapshot,
} from './extraction-to-kb-atom-pipeline.js'
import {
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROTOCOL_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_SCRIPT_PATH,
  buildExtractionParallelWorkerProtocolDogfoodProof,
  buildExtractionParallelWorkerProtocolSnapshot,
} from './extraction-parallel-worker-protocol.js'
import {
  MYICOR_EXTRACTION_PREFLIGHT_CARD_ID,
  MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
  MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_PATH,
  MYICOR_EXTRACTION_PREFLIGHT_PACKET_PATH,
  MYICOR_EXTRACTION_PREFLIGHT_SCRIPT_PATH,
  buildMyicorExtractionPreflightDogfoodProof,
  buildMyicorExtractionPreflightSnapshot,
} from './myicor-extraction-preflight.js'
import {
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_PATH,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PACKET_PATH,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SCRIPT_PATH,
  buildMarkMSkoolExtractionPreflightDogfoodProof,
  buildMarkMSkoolExtractionPreflightSnapshot,
} from './mark-m-skool-extraction-preflight.js'
import {
  MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PACKET_PATH,
  MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SCRIPT_PATH,
  MARK_KASHEF_GOAL_VIDEO_ID,
  buildMarkKashefGoalBuildIntelPacketDogfoodProof,
  buildMarkKashefGoalBuildIntelPacketSnapshot,
} from './mark-kashef-goal-build-intel-packet.js'
import {
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_PACKET_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_SCRIPT_PATH,
  MATT_POCOCK_GITHUB_REPO,
  buildMattPocockClaudeFolderEvalDogfoodProof,
  buildMattPocockClaudeFolderEvalSnapshot,
} from './matt-pocock-claude-folder-eval.js'
import {
  EXTRACTION_TEAM_RUNTIME_CARD_ID,
  EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY,
  EXTRACTION_TEAM_RUNTIME_CLOSEOUT_PATH,
  EXTRACTION_TEAM_RUNTIME_SCRIPT_PATH,
  buildExtractionTeamRuntimeDogfoodProof,
  buildExtractionTeamRuntimeSnapshot,
} from './extraction-team-runtime.js'
import {
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_PATH,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SCRIPT_PATH,
  buildFoundationKnowledgeBaseCompilerDesign,
  buildFoundationKnowledgeBaseCompilerDesignDogfoodProof,
  validateFoundationKnowledgeBaseCompilerDesign,
} from './foundation-knowledge-base-compiler-design.js'
import {
  KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
  KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
  KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_PATH,
  KNOWLEDGE_BASE_QUALITY_GATE_SCRIPT_PATH,
  buildKnowledgeBaseQualityGate,
  buildKnowledgeBaseQualityGateDogfoodProof,
  evaluateKnowledgeBaseQualityGate,
} from './foundation-knowledge-base-quality-gate.js'
import {
  FOUNDATION_KB_COMPILER_V1_CARD_ID,
  FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY,
  FOUNDATION_KB_COMPILER_V1_CLOSEOUT_PATH,
  FOUNDATION_KB_COMPILER_V1_SCRIPT_PATH,
  buildFoundationKbCompilerV1DogfoodProof,
  compileFoundationKbDraft,
} from './foundation-kb-compiler-v1.js'
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

function hasNoUnsafeSideEffects(sideEffects = {}) {
  return Object.values(sideEffects || {}).every(value => value === false || value === 0 || value === null || value === undefined)
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

  const creatorWatchlistExpansionCloseout = findCloseout(foundationBuildCloseouts, BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY)
  const creatorWatchlistExpansionCard = findBacklogCard(backlogItems, BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID)
  const creatorWatchlistExpansion = input.creatorWatchlistExpansion || foundationHub.creatorWatchlistExpansion ||
    buildBuildIntelCreatorWatchlistExpansionSnapshot()
  const creatorWatchlistExpansionDogfood = buildBuildIntelCreatorWatchlistExpansionDogfoodProof()
  const creatorWatchlistExpansionReportExists = await reportExists(repoRoot, BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_PATH, input.creatorWatchlistExpansionReportExists)
  addCheck(
    checks,
    creatorWatchlistExpansionCard?.lane === 'done' &&
      String(creatorWatchlistExpansionCard.statusNote || '').includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY) &&
      creatorWatchlistExpansionCloseout?.operatorCloseout === true &&
      (creatorWatchlistExpansionCloseout.backlogIds || []).includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID) &&
      creatorWatchlistExpansion.status === 'ready' &&
      creatorWatchlistExpansion.proposalOnly === true &&
      creatorWatchlistExpansion.writesBacklog === false &&
      creatorWatchlistExpansion.opensSprint === false &&
      creatorWatchlistExpansion.extractionStarted === false &&
      creatorWatchlistExpansion.modelCallsStarted === false &&
      creatorWatchlistExpansion.paidAuthUsed === false &&
      creatorWatchlistExpansion.privateAuthUsed === false &&
      creatorWatchlistExpansion.researchInboxWritten === false &&
      creatorWatchlistExpansion.atomsCreated === 0 &&
      creatorWatchlistExpansion.summary?.requiredReadyCount === creatorWatchlistExpansion.summary?.requiredCreatorCount &&
      creatorWatchlistExpansion.summary?.buildIntelCount >= 29 &&
      creatorWatchlistExpansion.duplicateSummary?.duplicateCreatorIds?.length === 0 &&
      creatorWatchlistExpansion.duplicateSummary?.duplicateSourceKeys?.length === 0 &&
      creatorWatchlistExpansion.duplicateSummary?.duplicateUrls?.length === 0 &&
      creatorWatchlistExpansionDogfood.ok === true &&
      creatorWatchlistExpansionReportExists &&
      packageScripts?.['process:build-intel-creator-watchlist-expansion-check'] === `node --env-file-if-exists=.env ${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SCRIPT_PATH}` &&
      currentPlan.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY) &&
      currentState.includes(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY),
    'BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001 expands lookup-backed creator source truth without extraction',
    creatorWatchlistExpansionCard
      ? `lane=${creatorWatchlistExpansionCard.lane} ready=${creatorWatchlistExpansion.summary?.requiredReadyCount || 0}/${creatorWatchlistExpansion.summary?.requiredCreatorCount || 0} urls=${creatorWatchlistExpansion.summary?.totalLookupBackedUrls || 0}`
      : `missing ${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID}`,
  )

  const courseSourceAuthBoundaryCloseout = findCloseout(foundationBuildCloseouts, COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY)
  const courseSourceAuthBoundaryCard = findBacklogCard(backlogItems, COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID)
  const courseSourceAuthBoundary = input.courseSourceAuthBoundary || foundationHub.courseSourceAuthBoundary ||
    buildCourseSourceAuthBoundarySnapshot()
  const courseSourceAuthBoundaryDogfood = buildCourseSourceAuthBoundaryDogfoodProof()
  const courseSourceAuthBoundaryReportExists = await reportExists(repoRoot, COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_PATH, input.courseSourceAuthBoundaryReportExists)
  addCheck(
    checks,
    courseSourceAuthBoundaryCard?.lane === 'done' &&
      String(courseSourceAuthBoundaryCard.statusNote || '').includes(COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY) &&
      courseSourceAuthBoundaryCloseout?.operatorCloseout === true &&
      (courseSourceAuthBoundaryCloseout.backlogIds || []).includes(COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID) &&
      courseSourceAuthBoundary.status === 'ready' &&
      courseSourceAuthBoundary.metadataOnlyPreflight === true &&
      courseSourceAuthBoundary.extractionApprovedByThisCard === false &&
      courseSourceAuthBoundary.paidPrivateExtractionBlocked === true &&
      courseSourceAuthBoundary.writesBacklog === false &&
      courseSourceAuthBoundary.opensSprint === false &&
      courseSourceAuthBoundary.summary?.privateOrPaidCount >= 3 &&
      courseSourceAuthBoundary.summary?.blockedPrivateOrPaidCount === courseSourceAuthBoundary.summary?.privateOrPaidCount &&
      courseSourceAuthBoundary.summary?.unsafeSideEffectCount === 0 &&
      hasNoUnsafeSideEffects(courseSourceAuthBoundary.sideEffects) &&
      courseSourceAuthBoundaryDogfood.ok === true &&
      courseSourceAuthBoundaryReportExists &&
      packageScripts?.['process:course-source-auth-boundary-check'] === `node --env-file-if-exists=.env ${COURSE_SOURCE_AUTH_BOUNDARY_SCRIPT_PATH}` &&
      currentPlan.includes(COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY) &&
      currentState.includes(COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY),
    'COURSE-SOURCE-AUTH-BOUNDARY-001 blocks private/course extraction behind source-specific approval packets',
    courseSourceAuthBoundaryCard
      ? `lane=${courseSourceAuthBoundaryCard.lane} blocked=${courseSourceAuthBoundary.summary?.blockedPrivateOrPaidCount || 0}/${courseSourceAuthBoundary.summary?.privateOrPaidCount || 0} dogfood=${courseSourceAuthBoundaryDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID}`,
  )

  const youtubeBuildIntelBatchCloseout = findCloseout(foundationBuildCloseouts, YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY)
  const youtubeBuildIntelBatchCard = findBacklogCard(backlogItems, YOUTUBE_BUILD_INTEL_BATCH_CARD_ID)
  const youtubeBuildIntelBatch = input.youtubeBuildIntelBatch || foundationHub.youtubeBuildIntelBatch ||
    buildYoutubeBuildIntelBatchSnapshot()
  const youtubeBuildIntelBatchDogfood = buildYoutubeBuildIntelBatchDogfoodProof()
  const youtubeBuildIntelBatchReportExists = await reportExists(repoRoot, YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_PATH, input.youtubeBuildIntelBatchReportExists)
  addCheck(
    checks,
    youtubeBuildIntelBatchCard?.lane === 'done' &&
      String(youtubeBuildIntelBatchCard.statusNote || '').includes(YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY) &&
      youtubeBuildIntelBatchCloseout?.operatorCloseout === true &&
      (youtubeBuildIntelBatchCloseout.backlogIds || []).includes(YOUTUBE_BUILD_INTEL_BATCH_CARD_ID) &&
      youtubeBuildIntelBatch.status === 'ready' &&
      youtubeBuildIntelBatch.metadataOnlyPreflight === true &&
      youtubeBuildIntelBatch.runtimeApprovalRequired === true &&
      youtubeBuildIntelBatch.liveExtractionApprovedByThisCard === false &&
      youtubeBuildIntelBatch.writesBacklog === false &&
      youtubeBuildIntelBatch.opensSprint === false &&
      youtubeBuildIntelBatch.summary?.queueSpecCount >= 6 &&
      youtubeBuildIntelBatch.summary?.publicChannelSpecCount >= 6 &&
      youtubeBuildIntelBatch.summary?.maxVideosPerChannel <= 20 &&
      youtubeBuildIntelBatch.summary?.plannedVideoCeiling <= youtubeBuildIntelBatch.summary?.queueSpecCount * 20 &&
      youtubeBuildIntelBatch.summary?.privateOrPaidBlockedCount >= 3 &&
      youtubeBuildIntelBatch.summary?.unsafeSideEffectCount === 0 &&
      hasNoUnsafeSideEffects(youtubeBuildIntelBatch.sideEffects) &&
      youtubeBuildIntelBatch.queueSpecs?.every(spec => spec.validation?.ok === true && spec.runtimeApprovalRequired === true && spec.liveExtractionApproved === false && spec.transcriptFetchApproved === false && spec.modelCallApproved === false) &&
      youtubeBuildIntelBatchDogfood.ok === true &&
      youtubeBuildIntelBatchReportExists &&
      packageScripts?.['process:youtube-build-intel-batch-check'] === `node --env-file-if-exists=.env ${YOUTUBE_BUILD_INTEL_BATCH_SCRIPT_PATH}` &&
      currentPlan.includes(YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY) &&
      currentState.includes(YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY),
    'YOUTUBE-BUILD-INTEL-BATCH-001 prepares public last-20 Build Intel queue specs without extraction',
    youtubeBuildIntelBatchCard
      ? `lane=${youtubeBuildIntelBatchCard.lane} specs=${youtubeBuildIntelBatch.summary?.queueSpecCount || 0} channels=${youtubeBuildIntelBatch.summary?.publicChannelSpecCount || 0} dogfood=${youtubeBuildIntelBatchDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${YOUTUBE_BUILD_INTEL_BATCH_CARD_ID}`,
  )

  const extractionToKbAtomPipelineCloseout = findCloseout(foundationBuildCloseouts, EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY)
  const extractionToKbAtomPipelineCard = findBacklogCard(backlogItems, EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID)
  const extractionToKbAtomPipeline = input.extractionToKbAtomPipeline || foundationHub.extractionToKbAtomPipeline ||
    buildExtractionToKbAtomPipelineSnapshot()
  const extractionToKbAtomPipelineDogfood = buildExtractionToKbAtomPipelineDogfoodProof()
  const extractionToKbAtomPipelineReportExists = await reportExists(repoRoot, EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_PATH, input.extractionToKbAtomPipelineReportExists)
  addCheck(
    checks,
    extractionToKbAtomPipelineCard?.lane === 'done' &&
      String(extractionToKbAtomPipelineCard.statusNote || '').includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY) &&
      extractionToKbAtomPipelineCloseout?.operatorCloseout === true &&
      (extractionToKbAtomPipelineCloseout.backlogIds || []).includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID) &&
      extractionToKbAtomPipeline.status === 'ready' &&
      extractionToKbAtomPipeline.ok === true &&
      extractionToKbAtomPipeline.proposalOnly === true &&
      extractionToKbAtomPipeline.runtimeExtractionApprovedByThisCard === false &&
      extractionToKbAtomPipeline.liveExtractionStarted === false &&
      extractionToKbAtomPipeline.modelCallsStarted === false &&
      extractionToKbAtomPipeline.externalWritesStarted === false &&
      Object.values(extractionToKbAtomPipeline.outputWrites || {}).every(value => value === false) &&
      extractionToKbAtomPipeline.summary?.kbDraftStatus === 'draft_ready' &&
      extractionToKbAtomPipeline.summary?.atomCandidateCount >= 1 &&
      extractionToKbAtomPipeline.summary?.synthesisFactCandidateCount >= 1 &&
      extractionToKbAtomPipeline.summary?.reviewInboxCandidateCount >= 1 &&
      extractionToKbAtomPipeline.summary?.actionRouteCandidateCount >= 1 &&
      extractionToKbAtomPipeline.summary?.unsafeWriteCount === 0 &&
      extractionToKbAtomPipeline.summary?.unsafeSideEffectCount === 0 &&
      extractionToKbAtomPipelineDogfood.ok === true &&
      extractionToKbAtomPipelineReportExists &&
      packageScripts?.['process:extraction-to-kb-atom-pipeline-check'] === `node --env-file-if-exists=.env ${EXTRACTION_TO_KB_ATOM_PIPELINE_SCRIPT_PATH}` &&
      currentPlan.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY) &&
      currentState.includes(EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY),
    'EXTRACTION-TO-KB-ATOM-PIPELINE-001 routes extraction artifacts to proposal-only KB/atom/action candidates',
    extractionToKbAtomPipelineCard
      ? `lane=${extractionToKbAtomPipelineCard.lane} kb=${extractionToKbAtomPipeline.summary?.kbDraftStatus || 'missing'} action=${extractionToKbAtomPipeline.summary?.actionRouteCandidateCount || 0} dogfood=${extractionToKbAtomPipelineDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID}`,
  )

  const extractionParallelWorkerProtocolCloseout = findCloseout(foundationBuildCloseouts, EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY)
  const extractionParallelWorkerProtocolCard = findBacklogCard(backlogItems, EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID)
  const extractionParallelWorkerProtocol = input.extractionParallelWorkerProtocol || foundationHub.extractionParallelWorkerProtocol ||
    buildExtractionParallelWorkerProtocolSnapshot()
  const extractionParallelWorkerProtocolDogfood = buildExtractionParallelWorkerProtocolDogfoodProof()
  const extractionParallelWorkerProtocolReportExists = await reportExists(repoRoot, EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_PATH, input.extractionParallelWorkerProtocolReportExists)
  const extractionParallelWorkerProtocolDocExists = await reportExists(repoRoot, EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROTOCOL_PATH, input.extractionParallelWorkerProtocolProtocolExists)
  addCheck(
    checks,
    extractionParallelWorkerProtocolCard?.lane === 'done' &&
      String(extractionParallelWorkerProtocolCard.statusNote || '').includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY) &&
      extractionParallelWorkerProtocolCloseout?.operatorCloseout === true &&
      (extractionParallelWorkerProtocolCloseout.backlogIds || []).includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID) &&
      extractionParallelWorkerProtocol.status === 'ready' &&
      extractionParallelWorkerProtocol.ok === true &&
      extractionParallelWorkerProtocol.proposalOnly === true &&
      extractionParallelWorkerProtocol.liveExtractionApprovedByThisCard === false &&
      extractionParallelWorkerProtocol.extractionWorkersLaunched === false &&
      extractionParallelWorkerProtocol.hiddenSubagentsAllowedByDefault === false &&
      extractionParallelWorkerProtocol.summary?.visibleWorkerCount >= 2 &&
      extractionParallelWorkerProtocol.summary?.uniqueSourcePacketCount >= 2 &&
      extractionParallelWorkerProtocol.summary?.uniqueArtifactRootCount >= 2 &&
      extractionParallelWorkerProtocol.summary?.privateOrPaidAssignmentCount === 0 &&
      extractionParallelWorkerProtocol.summary?.launchedWorkerCount === 0 &&
      extractionParallelWorkerProtocol.summary?.downstreamWriteCount === 0 &&
      extractionParallelWorkerProtocolDogfood.ok === true &&
      extractionParallelWorkerProtocolReportExists &&
      extractionParallelWorkerProtocolDocExists &&
      packageScripts?.['process:extraction-parallel-worker-protocol-check'] === `node --env-file-if-exists=.env ${EXTRACTION_PARALLEL_WORKER_PROTOCOL_SCRIPT_PATH}` &&
      currentPlan.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY) &&
      currentState.includes(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY),
    'EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 gates visible extraction workers before launch',
    extractionParallelWorkerProtocolCard
      ? `lane=${extractionParallelWorkerProtocolCard.lane} workers=${extractionParallelWorkerProtocol.summary?.visibleWorkerCount || 0} packets=${extractionParallelWorkerProtocol.summary?.uniqueSourcePacketCount || 0} dogfood=${extractionParallelWorkerProtocolDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID}`,
  )

  const myicorExtractionPreflightCloseout = findCloseout(foundationBuildCloseouts, MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY)
  const myicorExtractionPreflightCard = findBacklogCard(backlogItems, MYICOR_EXTRACTION_PREFLIGHT_CARD_ID)
  const myicorExtractionPreflight = input.myicorExtractionPreflight || foundationHub.myicorExtractionPreflight ||
    buildMyicorExtractionPreflightSnapshot()
  const myicorExtractionPreflightDogfood = buildMyicorExtractionPreflightDogfoodProof()
  const myicorExtractionPreflightReportExists = await reportExists(repoRoot, MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_PATH, input.myicorExtractionPreflightReportExists)
  const myicorExtractionPreflightPacketExists = await reportExists(repoRoot, MYICOR_EXTRACTION_PREFLIGHT_PACKET_PATH, input.myicorExtractionPreflightPacketExists)
  addCheck(
    checks,
    myicorExtractionPreflightCard?.lane === 'done' &&
      String(myicorExtractionPreflightCard.statusNote || '').includes(MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY) &&
      myicorExtractionPreflightCloseout?.operatorCloseout === true &&
      (myicorExtractionPreflightCloseout.backlogIds || []).includes(MYICOR_EXTRACTION_PREFLIGHT_CARD_ID) &&
      myicorExtractionPreflight.status === 'ready' &&
      myicorExtractionPreflight.ok === true &&
      myicorExtractionPreflight.preflightOnly === true &&
      myicorExtractionPreflight.metadataOnly === true &&
      myicorExtractionPreflight.privateOrPaid === true &&
      myicorExtractionPreflight.approvalRequired === true &&
      myicorExtractionPreflight.approvedExtraction === false &&
      myicorExtractionPreflight.connectorCredential?.status === 'blocked' &&
      myicorExtractionPreflight.connectorCredential?.safeToUse === false &&
      myicorExtractionPreflight.extractionGate?.ok === false &&
      myicorExtractionPreflight.approvalPacketDraft?.sourceSpecificApprovalGranted === false &&
      myicorExtractionPreflight.summary?.approvalFieldGapCount === 0 &&
      myicorExtractionPreflight.summary?.courseMapInspected === false &&
      myicorExtractionPreflight.summary?.privateContentViolationCount === 0 &&
      myicorExtractionPreflight.summary?.unsafeSideEffectCount === 0 &&
      hasNoUnsafeSideEffects(myicorExtractionPreflight.sideEffects) &&
      myicorExtractionPreflightDogfood.ok === true &&
      myicorExtractionPreflightReportExists &&
      myicorExtractionPreflightPacketExists &&
      packageScripts?.['process:myicor-extraction-preflight-check'] === `node --env-file-if-exists=.env ${MYICOR_EXTRACTION_PREFLIGHT_SCRIPT_PATH}` &&
      currentPlan.includes(MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY) &&
      currentState.includes(MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY),
    'MYICOR-EXTRACTION-PREFLIGHT-001 keeps paid course source metadata-only pending approval',
    myicorExtractionPreflightCard
      ? `lane=${myicorExtractionPreflightCard.lane} connector=${myicorExtractionPreflight.connectorCredential?.status || 'missing'} approvalGaps=${myicorExtractionPreflight.summary?.approvalFieldGapCount || 0} dogfood=${myicorExtractionPreflightDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${MYICOR_EXTRACTION_PREFLIGHT_CARD_ID}`,
  )

  const markMSkoolExtractionPreflightCloseout = findCloseout(foundationBuildCloseouts, MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY)
  const markMSkoolExtractionPreflightCard = findBacklogCard(backlogItems, MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID)
  const markMSkoolExtractionPreflight = input.markMSkoolExtractionPreflight || foundationHub.markMSkoolExtractionPreflight ||
    buildMarkMSkoolExtractionPreflightSnapshot()
  const markMSkoolExtractionPreflightDogfood = buildMarkMSkoolExtractionPreflightDogfoodProof()
  const markMSkoolExtractionPreflightReportExists = await reportExists(repoRoot, MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_PATH, input.markMSkoolExtractionPreflightReportExists)
  const markMSkoolExtractionPreflightPacketExists = await reportExists(repoRoot, MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PACKET_PATH, input.markMSkoolExtractionPreflightPacketExists)
  addCheck(
    checks,
    markMSkoolExtractionPreflightCard?.lane === 'done' &&
      String(markMSkoolExtractionPreflightCard.statusNote || '').includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY) &&
      markMSkoolExtractionPreflightCloseout?.operatorCloseout === true &&
      (markMSkoolExtractionPreflightCloseout.backlogIds || []).includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID) &&
      markMSkoolExtractionPreflight.status === 'ready' &&
      markMSkoolExtractionPreflight.ok === true &&
      markMSkoolExtractionPreflight.preflightOnly === true &&
      markMSkoolExtractionPreflight.metadataOnly === true &&
      markMSkoolExtractionPreflight.privateOrPaid === true &&
      markMSkoolExtractionPreflight.approvalRequired === true &&
      markMSkoolExtractionPreflight.approvedExtraction === false &&
      markMSkoolExtractionPreflight.connectorCredential?.status === 'blocked' &&
      markMSkoolExtractionPreflight.connectorCredential?.safeToUse === false &&
      markMSkoolExtractionPreflight.extractionGate?.ok === false &&
      markMSkoolExtractionPreflight.approvalPacketDraft?.sourceSpecificApprovalGranted === false &&
      markMSkoolExtractionPreflight.summary?.approvalFieldGapCount === 0 &&
      markMSkoolExtractionPreflight.summary?.communityMapInspected === false &&
      markMSkoolExtractionPreflight.summary?.privateContentViolationCount === 0 &&
      markMSkoolExtractionPreflight.summary?.unsafeSideEffectCount === 0 &&
      hasNoUnsafeSideEffects(markMSkoolExtractionPreflight.sideEffects) &&
      markMSkoolExtractionPreflightDogfood.ok === true &&
      markMSkoolExtractionPreflightReportExists &&
      markMSkoolExtractionPreflightPacketExists &&
      packageScripts?.['process:mark-m-skool-extraction-preflight-check'] === `node --env-file-if-exists=.env ${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SCRIPT_PATH}` &&
      currentPlan.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY) &&
      currentState.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY),
    'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001 keeps private community source metadata-only pending approval',
    markMSkoolExtractionPreflightCard
      ? `lane=${markMSkoolExtractionPreflightCard.lane} connector=${markMSkoolExtractionPreflight.connectorCredential?.status || 'missing'} approvalGaps=${markMSkoolExtractionPreflight.summary?.approvalFieldGapCount || 0} dogfood=${markMSkoolExtractionPreflightDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID}`,
  )

  const markKashefGoalPacketCloseout = findCloseout(foundationBuildCloseouts, MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY)
  const markKashefGoalPacketCard = findBacklogCard(backlogItems, MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID)
  const markKashefGoalFollowUpCard = findBacklogCard(backlogItems, MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID)
  const markKashefGoalPacket = input.markKashefGoalBuildIntelPacket || foundationHub.markKashefGoalBuildIntelPacket ||
    buildMarkKashefGoalBuildIntelPacketSnapshot()
  const markKashefGoalPacketDogfood = buildMarkKashefGoalBuildIntelPacketDogfoodProof()
  const markKashefGoalPacketReportExists = await reportExists(repoRoot, MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_PATH, input.markKashefGoalBuildIntelPacketReportExists)
  const markKashefGoalPacketDocExists = await reportExists(repoRoot, MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_PACKET_PATH, input.markKashefGoalBuildIntelPacketDocExists)
  addCheck(
    checks,
    markKashefGoalPacketCard?.lane === 'done' &&
      String(markKashefGoalPacketCard.statusNote || '').includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY) &&
      markKashefGoalPacketCloseout?.operatorCloseout === true &&
      (markKashefGoalPacketCloseout.backlogIds || []).includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID) &&
      markKashefGoalFollowUpCard &&
      ['scoped', 'research', 'done'].includes(markKashefGoalFollowUpCard.lane) &&
      markKashefGoalPacket.status === 'ready' &&
      markKashefGoalPacket.ok === true &&
      markKashefGoalPacket.metadataOnlyPublicLookup === true &&
      markKashefGoalPacket.runtimeExtractionApprovalRequired === true &&
      markKashefGoalPacket.liveExtractionStarted === false &&
      markKashefGoalPacket.sourcePacket?.video?.videoId === MARK_KASHEF_GOAL_VIDEO_ID &&
      markKashefGoalPacket.sourcePacket?.officialGoalDocs?.url === 'https://code.claude.com/docs/en/goal' &&
      markKashefGoalPacket.sourcePacket?.sourceClaims?.transcriptExtracted === false &&
      markKashefGoalPacket.sourcePacket?.sourceClaims?.visualWorkflowExtracted === false &&
      markKashefGoalPacket.sourcePacket?.sourceClaims?.contentClaimsVerified === false &&
      markKashefGoalPacket.aiosEvaluationFollowUp === MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID &&
      markKashefGoalPacket.summary?.unsafeSideEffectCount === 0 &&
      markKashefGoalPacket.summary?.copiedContentViolationCount === 0 &&
      hasNoUnsafeSideEffects(markKashefGoalPacket.sideEffects) &&
      markKashefGoalPacketDogfood.ok === true &&
      markKashefGoalPacketReportExists &&
      markKashefGoalPacketDocExists &&
      packageScripts?.['process:mark-kashef-goal-build-intel-packet-check'] === `node --env-file-if-exists=.env ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SCRIPT_PATH}` &&
      currentPlan.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY) &&
      currentState.includes(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY),
    'MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001 captures /goal source truth without extraction or implementation',
    markKashefGoalPacketCard
      ? `lane=${markKashefGoalPacketCard.lane} video=${markKashefGoalPacket.sourcePacket?.video?.videoId || 'missing'} followUp=${markKashefGoalFollowUpCard?.lane || 'missing'} dogfood=${markKashefGoalPacketDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID}`,
  )

  const mattPocockEvalCloseout = findCloseout(foundationBuildCloseouts, MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY)
  const mattPocockEvalCard = findBacklogCard(backlogItems, MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID)
  const mattPocockEval = input.mattPocockClaudeFolderEval || foundationHub.mattPocockClaudeFolderEval ||
    buildMattPocockClaudeFolderEvalSnapshot()
  const mattPocockEvalDogfood = buildMattPocockClaudeFolderEvalDogfoodProof()
  const mattPocockEvalReportExists = await reportExists(repoRoot, MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_PATH, input.mattPocockClaudeFolderEvalReportExists)
  const mattPocockEvalPacketExists = await reportExists(repoRoot, MATT_POCOCK_CLAUDE_FOLDER_EVAL_PACKET_PATH, input.mattPocockClaudeFolderEvalPacketExists)
  addCheck(
    checks,
    mattPocockEvalCard?.lane === 'done' &&
      String(mattPocockEvalCard.statusNote || '').includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY) &&
      mattPocockEvalCloseout?.operatorCloseout === true &&
      (mattPocockEvalCloseout.backlogIds || []).includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID) &&
      mattPocockEval.status === 'ready' &&
      mattPocockEval.ok === true &&
      mattPocockEval.proposalOnly === true &&
      mattPocockEval.publicSourceEvalOnly === true &&
      mattPocockEval.installApprovedByThisCard === false &&
      mattPocockEval.runtimeExtractionApprovedByThisCard === false &&
      mattPocockEval.writesBacklogFromSourceContent === false &&
      mattPocockEval.sourcePacket?.repo?.fullName === MATT_POCOCK_GITHUB_REPO &&
      mattPocockEval.sourcePacket?.repo?.license === 'MIT' &&
      /^[0-9a-f]{40}$/i.test(mattPocockEval.sourcePacket?.repo?.commit || '') &&
      mattPocockEval.sourcePacket?.plugin?.exposedSkillCount === 14 &&
      mattPocockEval.sourcePacket?.sourceClaims?.repoInstalled === false &&
      mattPocockEval.sourcePacket?.sourceClaims?.codeImported === false &&
      mattPocockEval.sourcePacket?.sourceClaims?.ninetyDayContextHandlingVerified === false &&
      mattPocockEval.sourcePacket?.sourceClaims?.noNinetyDayContextPatternFound === true &&
      mattPocockEval.summary?.unsafeSideEffectCount === 0 &&
      mattPocockEval.summary?.copiedContentViolationCount === 0 &&
      mattPocockEval.summary?.unsafeWriteCount === 0 &&
      hasNoUnsafeSideEffects(mattPocockEval.sideEffects) &&
      mattPocockEvalDogfood.ok === true &&
      mattPocockEvalReportExists &&
      mattPocockEvalPacketExists &&
      packageScripts?.['process:matt-pocock-claude-folder-eval-check'] === `node --env-file-if-exists=.env ${MATT_POCOCK_CLAUDE_FOLDER_EVAL_SCRIPT_PATH}` &&
      currentPlan.includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY) &&
      currentState.includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY),
    'MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 captures public skills repo truth without install/import/extraction',
    mattPocockEvalCard
      ? `lane=${mattPocockEvalCard.lane} repo=${mattPocockEval.sourcePacket?.repo?.fullName || 'missing'} skills=${mattPocockEval.sourcePacket?.plugin?.exposedSkillCount || 0} dogfood=${mattPocockEvalDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID}`,
  )

  const extractionTeamRuntimeCloseout = findCloseout(foundationBuildCloseouts, EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY)
  const extractionTeamRuntimeCard = findBacklogCard(backlogItems, EXTRACTION_TEAM_RUNTIME_CARD_ID)
  const extractionTeamRuntime = input.extractionTeamRuntime || foundationHub.extractionTeamRuntime ||
    buildExtractionTeamRuntimeSnapshot()
  const extractionTeamRuntimeDogfood = buildExtractionTeamRuntimeDogfoodProof()
  const extractionTeamRuntimeReportExists = await reportExists(repoRoot, EXTRACTION_TEAM_RUNTIME_CLOSEOUT_PATH, input.extractionTeamRuntimeReportExists)
  addCheck(
    checks,
    extractionTeamRuntimeCard?.lane === 'done' &&
      String(extractionTeamRuntimeCard.statusNote || '').includes(EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY) &&
      extractionTeamRuntimeCloseout?.operatorCloseout === true &&
      (extractionTeamRuntimeCloseout.backlogIds || []).includes(EXTRACTION_TEAM_RUNTIME_CARD_ID) &&
      extractionTeamRuntime.status === 'ready' &&
      extractionTeamRuntime.ok === true &&
      extractionTeamRuntime.proposalOnly === true &&
      extractionTeamRuntime.liveExtractionApprovedByThisCard === false &&
      extractionTeamRuntime.extractionWorkersLaunched === false &&
      extractionTeamRuntime.downstreamWritesApprovedByThisCard === false &&
      extractionTeamRuntime.summary?.stageCount >= 6 &&
      extractionTeamRuntime.summary?.publicQueueSpecCount >= 6 &&
      extractionTeamRuntime.summary?.visibleWorkerCount >= 2 &&
      extractionTeamRuntime.summary?.outputCandidateTypes?.length >= 5 &&
      extractionTeamRuntime.summary?.privateSourcePreflightsBlocked >= 2 &&
      extractionTeamRuntime.summary?.unsafeSideEffectCount === 0 &&
      extractionTeamRuntime.summary?.hiddenSubagentCount === 0 &&
      extractionTeamRuntimeDogfood.ok === true &&
      extractionTeamRuntimeReportExists &&
      packageScripts?.['process:extraction-team-runtime-check'] === `node --env-file-if-exists=.env ${EXTRACTION_TEAM_RUNTIME_SCRIPT_PATH}` &&
      currentPlan.includes(EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY) &&
      currentState.includes(EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY),
    'EXTRACTION-TEAM-001 anchors supervised extraction runtime without live extraction launch',
    extractionTeamRuntimeCard
      ? `lane=${extractionTeamRuntimeCard.lane} stages=${extractionTeamRuntime.summary?.stageCount || 0} publicQueues=${extractionTeamRuntime.summary?.publicQueueSpecCount || 0} dogfood=${extractionTeamRuntimeDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${EXTRACTION_TEAM_RUNTIME_CARD_ID}`,
  )

  const knowledgeBaseCompilerCloseout = findCloseout(foundationBuildCloseouts, FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY)
  const knowledgeBaseCompilerCard = findBacklogCard(backlogItems, FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID)
  const knowledgeBaseQualityGateCard = findBacklogCard(backlogItems, 'KNOWLEDGE-BASE-QUALITY-GATE-001')
  const knowledgeBaseCompilerDesign = input.foundationKnowledgeBaseCompilerDesign || foundationHub.foundationKnowledgeBaseCompilerDesign ||
    buildFoundationKnowledgeBaseCompilerDesign()
  const knowledgeBaseCompilerStatus = validateFoundationKnowledgeBaseCompilerDesign(knowledgeBaseCompilerDesign)
  const knowledgeBaseCompilerDogfood = buildFoundationKnowledgeBaseCompilerDesignDogfoodProof()
  const knowledgeBaseCompilerReportExists = await reportExists(repoRoot, FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_PATH, input.foundationKnowledgeBaseCompilerDesignReportExists)
  addCheck(
    checks,
    knowledgeBaseCompilerCard?.lane === 'done' &&
      String(knowledgeBaseCompilerCard.statusNote || '').includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY) &&
      knowledgeBaseCompilerCloseout?.operatorCloseout === true &&
      (knowledgeBaseCompilerCloseout.backlogIds || []).includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID) &&
      knowledgeBaseQualityGateCard &&
      ['research', 'scoped', 'done'].includes(knowledgeBaseQualityGateCard.lane) &&
      knowledgeBaseCompilerStatus.ok === true &&
      knowledgeBaseCompilerDogfood.ok === true &&
      packageScripts?.['process:foundation-knowledge-base-compiler-design-check'] === `node --env-file-if-exists=.env ${FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SCRIPT_PATH}` &&
      knowledgeBaseCompilerReportExists &&
      currentPlan.includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY) &&
      currentState.includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY) &&
      moduleSource.includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID),
    'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 defines Foundation-owned KB compiler contract without extraction',
    knowledgeBaseCompilerCard
      ? `lane=${knowledgeBaseCompilerCard.lane} status=${knowledgeBaseCompilerStatus.status} stages=${knowledgeBaseCompilerStatus.summary.stageCount} dogfood=${knowledgeBaseCompilerDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID}`,
  )

  const knowledgeBaseQualityGateCloseout = findCloseout(foundationBuildCloseouts, KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY)
  const knowledgeBaseQualityGate = input.knowledgeBaseQualityGate || foundationHub.knowledgeBaseQualityGate ||
    buildKnowledgeBaseQualityGate()
  const knowledgeBaseQualityGateStatus = evaluateKnowledgeBaseQualityGate(knowledgeBaseQualityGate)
  const knowledgeBaseQualityGateDogfood = buildKnowledgeBaseQualityGateDogfoodProof()
  const knowledgeBaseQualityGateReportExists = await reportExists(repoRoot, KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_PATH, input.knowledgeBaseQualityGateReportExists)
  addCheck(
    checks,
    knowledgeBaseQualityGateCard?.lane === 'done' &&
      String(knowledgeBaseQualityGateCard.statusNote || '').includes(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY) &&
      knowledgeBaseQualityGateCloseout?.operatorCloseout === true &&
      (knowledgeBaseQualityGateCloseout.backlogIds || []).includes(KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID) &&
      knowledgeBaseCompilerCard?.lane === 'done' &&
      knowledgeBaseQualityGateStatus.ok === true &&
      knowledgeBaseQualityGateDogfood.ok === true &&
      packageScripts?.['process:knowledge-base-quality-gate-check'] === `node --env-file-if-exists=.env ${KNOWLEDGE_BASE_QUALITY_GATE_SCRIPT_PATH}` &&
      knowledgeBaseQualityGateReportExists &&
      currentPlan.includes(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY) &&
      currentState.includes(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY) &&
      moduleSource.includes(KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID),
    'KNOWLEDGE-BASE-QUALITY-GATE-001 blocks unsafe compiled knowledge before agent consumption',
    knowledgeBaseQualityGateCard
      ? `lane=${knowledgeBaseQualityGateCard.lane} status=${knowledgeBaseQualityGateStatus.status} violations=${knowledgeBaseQualityGateStatus.summary.violationCount} dogfood=${knowledgeBaseQualityGateDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID}`,
  )

  const foundationKbCompilerV1Closeout = findCloseout(foundationBuildCloseouts, FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY)
  const foundationKbCompilerV1Card = findBacklogCard(backlogItems, FOUNDATION_KB_COMPILER_V1_CARD_ID)
  const foundationKbCompilerV1Draft = input.foundationKbCompilerV1Draft || foundationHub.foundationKbCompilerV1Draft ||
    compileFoundationKbDraft()
  const foundationKbCompilerV1Dogfood = buildFoundationKbCompilerV1DogfoodProof()
  const foundationKbCompilerV1ReportExists = await reportExists(repoRoot, FOUNDATION_KB_COMPILER_V1_CLOSEOUT_PATH, input.foundationKbCompilerV1ReportExists)
  addCheck(
    checks,
    foundationKbCompilerV1Card?.lane === 'done' &&
      String(foundationKbCompilerV1Card.statusNote || '').includes(FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY) &&
      foundationKbCompilerV1Closeout?.operatorCloseout === true &&
      (foundationKbCompilerV1Closeout.backlogIds || []).includes(FOUNDATION_KB_COMPILER_V1_CARD_ID) &&
      knowledgeBaseCompilerCard?.lane === 'done' &&
      knowledgeBaseQualityGateCard?.lane === 'done' &&
      foundationKbCompilerV1Draft.status === 'draft_ready' &&
      foundationKbCompilerV1Draft.proposalOnly === true &&
      foundationKbCompilerV1Draft.writesCompiledPage === false &&
      foundationKbCompilerV1Draft.writesResearchInbox === false &&
      foundationKbCompilerV1Draft.writesAtoms === false &&
      foundationKbCompilerV1Draft.writesBacklog === false &&
      foundationKbCompilerV1Draft.liveExtractionStarted === false &&
      foundationKbCompilerV1Draft.modelCallsStarted === false &&
      foundationKbCompilerV1Draft.externalWritesStarted === false &&
      foundationKbCompilerV1Draft.qualityGate.ok === true &&
      foundationKbCompilerV1Dogfood.ok === true &&
      packageScripts?.['process:foundation-kb-compiler-v1-check'] === `node --env-file-if-exists=.env ${FOUNDATION_KB_COMPILER_V1_SCRIPT_PATH}` &&
      foundationKbCompilerV1ReportExists &&
      currentPlan.includes(FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY) &&
      currentState.includes(FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY) &&
      moduleSource.includes(FOUNDATION_KB_COMPILER_V1_CARD_ID),
    'FOUNDATION-KB-COMPILER-V1-001 compiles existing source-backed records into proposal-only KB drafts',
    foundationKbCompilerV1Card
      ? `lane=${foundationKbCompilerV1Card.lane} status=${foundationKbCompilerV1Draft.status} sources=${foundationKbCompilerV1Draft.summary.sourceIds.length} dogfood=${foundationKbCompilerV1Dogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${FOUNDATION_KB_COMPILER_V1_CARD_ID}`,
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
      await fileExists(repoRoot, 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/nightly-deep-audit-2026-05-14.md', repoFiles) &&
      await fileExists(repoRoot, 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/nightly-deep-audit-2026-05-14.json', repoFiles) &&
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
      creatorWatchlistExpansion,
      courseSourceAuthBoundary,
      myicorExtractionPreflight,
      markMSkoolExtractionPreflight,
      markKashefGoalBuildIntelPacket: markKashefGoalPacket,
      mattPocockClaudeFolderEval: mattPocockEval,
      extractionTeamRuntime,
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
    doneCard(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID, BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY),
    doneCard(COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID, COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY),
    doneCard(YOUTUBE_BUILD_INTEL_BATCH_CARD_ID, YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY),
    doneCard(EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID, EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY),
    doneCard(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID, EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY),
    doneCard(MYICOR_EXTRACTION_PREFLIGHT_CARD_ID, MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY),
    doneCard(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID, MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY),
    doneCard(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID, MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY),
    doneCard(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID, MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY),
    doneCard(EXTRACTION_TEAM_RUNTIME_CARD_ID, EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY),
    { id: MARK_KASHEF_GOAL_AI_OS_FOLLOW_UP_CARD_ID, lane: 'scoped', statusNote: 'Scoped follow-up for AIOS goal-runner evaluation.' },
    doneCard(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID, FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY),
    doneCard(KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID, KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY),
    doneCard(FOUNDATION_KB_COMPILER_V1_CARD_ID, FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY),
    ...GSTACK_BUILD_INTEL_CARD_IDS.map(id => doneCard(id, GSTACK_BUILD_INTEL_CLOSEOUT_KEY)),
    ...CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS.map(id => doneCard(id, CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY)),
    doneCard(NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID, NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY),
    doneCard(NIGHTLY_AUDIT_RUN_PROOF_CARD_ID, 'nightly-audit-run-proof-v1'),
  ]
  const foundationBuildCloseouts = [
    closeout(IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY, IMPLEMENTATION_INTELLIGENCE_CARD_IDS),
    closeout(BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY, BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS),
    closeout(BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY, [BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID]),
    closeout(BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY, [BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID]),
    closeout(COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY, [COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID]),
    closeout(YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY, [YOUTUBE_BUILD_INTEL_BATCH_CARD_ID]),
    closeout(EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY, [EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID]),
    closeout(EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY, [EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID]),
    closeout(MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY, [MYICOR_EXTRACTION_PREFLIGHT_CARD_ID]),
    closeout(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY, [MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID]),
    closeout(MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY, [MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID]),
    closeout(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY, [MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID]),
    closeout(EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY, [EXTRACTION_TEAM_RUNTIME_CARD_ID]),
    closeout(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY, [FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID]),
    closeout(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY, [KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID]),
    closeout(FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY, [FOUNDATION_KB_COMPILER_V1_CARD_ID]),
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
  const creatorWatchlistExpansion = buildBuildIntelCreatorWatchlistExpansionSnapshot()
  const courseSourceAuthBoundary = buildCourseSourceAuthBoundarySnapshot()
  const youtubeBuildIntelBatch = buildYoutubeBuildIntelBatchSnapshot()
  const extractionToKbAtomPipeline = buildExtractionToKbAtomPipelineSnapshot()
  const extractionParallelWorkerProtocol = buildExtractionParallelWorkerProtocolSnapshot()
  const myicorExtractionPreflight = buildMyicorExtractionPreflightSnapshot()
  const markMSkoolExtractionPreflight = buildMarkMSkoolExtractionPreflightSnapshot()
  const markKashefGoalBuildIntelPacket = buildMarkKashefGoalBuildIntelPacketSnapshot()
  const mattPocockClaudeFolderEval = buildMattPocockClaudeFolderEvalSnapshot()
  const foundationKnowledgeBaseCompilerDesign = buildFoundationKnowledgeBaseCompilerDesign()
  const knowledgeBaseQualityGate = buildKnowledgeBaseQualityGate()
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
  const extractionTeamRuntime = buildExtractionTeamRuntimeSnapshot()
  return {
    repoRoot: process.cwd(),
    repoFiles: {
      [NIGHTLY_DEEP_AUDIT_PLAN_PATH]: true,
      [NIGHTLY_DEEP_AUDIT_APPROVAL_PATH]: true,
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/nightly-deep-audit-2026-05-14.md': true,
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/nightly-deep-audit-2026-05-14.json': true,
    },
    foundationHub: { backlogItems, implementationIntelligence, buildIntelExtraction, karpathyKbPreflight, creatorWatchlistExpansion, courseSourceAuthBoundary, youtubeBuildIntelBatch, extractionToKbAtomPipeline, extractionParallelWorkerProtocol, myicorExtractionPreflight, markMSkoolExtractionPreflight, markKashefGoalBuildIntelPacket, mattPocockClaudeFolderEval, extractionTeamRuntime, foundationKnowledgeBaseCompilerDesign, knowledgeBaseQualityGate, gstackBuildIntel },
    backlogItems,
    foundationBuildCloseouts,
    foundationBuildLog: { builds: foundationBuildCloseouts },
    packageJson: {
      scripts: {
        'process:implementation-intelligence-check': 'node --env-file-if-exists=.env scripts/process-implementation-intelligence-check.mjs',
        'process:build-intel-extraction-check': `node --env-file-if-exists=.env ${BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SCRIPT_PATH}`,
        'process:build-intel-karpathy-llm-kb-preflight-check': `node --env-file-if-exists=.env ${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SCRIPT_PATH}`,
        'process:build-intel-creator-watchlist-expansion-check': `node --env-file-if-exists=.env ${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SCRIPT_PATH}`,
        'process:course-source-auth-boundary-check': `node --env-file-if-exists=.env ${COURSE_SOURCE_AUTH_BOUNDARY_SCRIPT_PATH}`,
        'process:youtube-build-intel-batch-check': `node --env-file-if-exists=.env ${YOUTUBE_BUILD_INTEL_BATCH_SCRIPT_PATH}`,
        'process:extraction-to-kb-atom-pipeline-check': `node --env-file-if-exists=.env ${EXTRACTION_TO_KB_ATOM_PIPELINE_SCRIPT_PATH}`,
        'process:extraction-parallel-worker-protocol-check': `node --env-file-if-exists=.env ${EXTRACTION_PARALLEL_WORKER_PROTOCOL_SCRIPT_PATH}`,
        'process:myicor-extraction-preflight-check': `node --env-file-if-exists=.env ${MYICOR_EXTRACTION_PREFLIGHT_SCRIPT_PATH}`,
        'process:mark-m-skool-extraction-preflight-check': `node --env-file-if-exists=.env ${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SCRIPT_PATH}`,
        'process:mark-kashef-goal-build-intel-packet-check': `node --env-file-if-exists=.env ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SCRIPT_PATH}`,
        'process:matt-pocock-claude-folder-eval-check': `node --env-file-if-exists=.env ${MATT_POCOCK_CLAUDE_FOLDER_EVAL_SCRIPT_PATH}`,
        'process:extraction-team-runtime-check': `node --env-file-if-exists=.env ${EXTRACTION_TEAM_RUNTIME_SCRIPT_PATH}`,
        'process:foundation-knowledge-base-compiler-design-check': `node --env-file-if-exists=.env ${FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SCRIPT_PATH}`,
        'process:knowledge-base-quality-gate-check': `node --env-file-if-exists=.env ${KNOWLEDGE_BASE_QUALITY_GATE_SCRIPT_PATH}`,
        'process:foundation-kb-compiler-v1-check': `node --env-file-if-exists=.env ${FOUNDATION_KB_COMPILER_V1_SCRIPT_PATH}`,
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
      BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY,
      COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY,
      YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
      EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY,
      EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY,
      MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
      MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
      MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY,
      MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
      EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY,
      FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
      KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
      FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY,
      GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
      CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
    ].join('\n'),
    currentState: [
      IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY,
      BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
      BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY,
      BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY,
      COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY,
      YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
      EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY,
      EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY,
      MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
      MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
      MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY,
      MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
      EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY,
      FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
      KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
      FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY,
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
      FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
      'FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
      KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
      'KNOWLEDGE_BASE_QUALITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
      FOUNDATION_KB_COMPILER_V1_CARD_ID,
      'FOUNDATION_KB_COMPILER_V1_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    ].join('\n'),
    moduleSource: [
      FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
      'buildFoundationKnowledgeBaseCompilerDesignDogfoodProof',
      KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
      'buildKnowledgeBaseQualityGateDogfoodProof',
      FOUNDATION_KB_COMPILER_V1_CARD_ID,
      'buildFoundationKbCompilerV1DogfoodProof',
    ].join('\n'),
    buildIntelExtractionReportExists: true,
    karpathyKbPreflightReportExists: true,
    creatorWatchlistExpansionReportExists: true,
    courseSourceAuthBoundaryReportExists: true,
    youtubeBuildIntelBatchReportExists: true,
    extractionToKbAtomPipelineReportExists: true,
    extractionParallelWorkerProtocolReportExists: true,
    extractionParallelWorkerProtocolProtocolExists: true,
    markKashefGoalBuildIntelPacketReportExists: true,
    markKashefGoalBuildIntelPacketDocExists: true,
    mattPocockClaudeFolderEvalReportExists: true,
    mattPocockClaudeFolderEvalPacketExists: true,
    extractionTeamRuntimeReportExists: true,
    foundationKnowledgeBaseCompilerDesignReportExists: true,
    knowledgeBaseQualityGateReportExists: true,
    foundationKbCompilerV1ReportExists: true,
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
  const creatorWatchlistMissingUrl = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.creatorWatchlistExpansion = clone(input.foundationHub.creatorWatchlistExpansion)
    input.foundationHub.creatorWatchlistExpansion.requiredRows[0].ok = false
    input.foundationHub.creatorWatchlistExpansion.summary.requiredReadyCount -= 1
  }))
  const courseSourceAuthPaidAuth = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.courseSourceAuthBoundary = clone(input.foundationHub.courseSourceAuthBoundary)
    input.foundationHub.courseSourceAuthBoundary.sideEffects.paidAuthUsed = true
    input.foundationHub.courseSourceAuthBoundary.summary.unsafeSideEffectCount = 1
  }))
  const youtubeBatchLiveExtraction = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.youtubeBuildIntelBatch = clone(input.foundationHub.youtubeBuildIntelBatch)
    input.foundationHub.youtubeBuildIntelBatch.sideEffects.liveExtractionStarted = true
    input.foundationHub.youtubeBuildIntelBatch.summary.unsafeSideEffectCount = 1
  }))
  const extractionPipelineDirectWrite = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.extractionToKbAtomPipeline = clone(input.foundationHub.extractionToKbAtomPipeline)
    input.foundationHub.extractionToKbAtomPipeline.outputWrites.atomWrite = true
    input.foundationHub.extractionToKbAtomPipeline.summary.unsafeWriteCount = 1
  }))
  const extractionWorkerLaunch = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.extractionParallelWorkerProtocol = clone(input.foundationHub.extractionParallelWorkerProtocol)
    input.foundationHub.extractionParallelWorkerProtocol.extractionWorkersLaunched = true
    input.foundationHub.extractionParallelWorkerProtocol.summary.launchedWorkerCount = 1
  }))
  const extractionWorkerDirectWrite = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.extractionParallelWorkerProtocol = clone(input.foundationHub.extractionParallelWorkerProtocol)
    input.foundationHub.extractionParallelWorkerProtocol.summary.downstreamWriteCount = 1
  }))
  const markMSkoolPrivateAuth = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.markMSkoolExtractionPreflight = clone(input.foundationHub.markMSkoolExtractionPreflight)
    input.foundationHub.markMSkoolExtractionPreflight.sideEffects.privateAuthUsed = true
    input.foundationHub.markMSkoolExtractionPreflight.summary.unsafeSideEffectCount = 1
  }))
  const markKashefTranscriptFetched = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.markKashefGoalBuildIntelPacket = clone(input.foundationHub.markKashefGoalBuildIntelPacket)
    input.foundationHub.markKashefGoalBuildIntelPacket.sideEffects.transcriptFetched = true
    input.foundationHub.markKashefGoalBuildIntelPacket.summary.unsafeSideEffectCount = 1
  }))
  const mattPocockInstallStarted = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.mattPocockClaudeFolderEval = clone(input.foundationHub.mattPocockClaudeFolderEval)
    input.foundationHub.mattPocockClaudeFolderEval.sideEffects.npxInstallerRun = true
    input.foundationHub.mattPocockClaudeFolderEval.summary.unsafeSideEffectCount = 1
  }))
  const mattPocockFalseNinetyDayClaim = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.mattPocockClaudeFolderEval = clone(input.foundationHub.mattPocockClaudeFolderEval)
    input.foundationHub.mattPocockClaudeFolderEval.sourcePacket.sourceClaims.ninetyDayContextHandlingVerified = true
    input.foundationHub.mattPocockClaudeFolderEval.sourcePacket.sourceClaims.noNinetyDayContextPatternFound = false
  }))
  const extractionTeamLiveRun = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.extractionTeamRuntime = clone(input.foundationHub.extractionTeamRuntime)
    input.foundationHub.extractionTeamRuntime.sideEffects.liveExtractionWorkerLaunched = true
    input.foundationHub.extractionTeamRuntime.summary.unsafeSideEffectCount = 1
  }))
  const extractionTeamHiddenSubagent = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.extractionTeamRuntime = clone(input.foundationHub.extractionTeamRuntime)
    input.foundationHub.extractionTeamRuntime.summary.hiddenSubagentCount = 1
  }))
  const knowledgeBaseDirectAgent = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.foundationKnowledgeBaseCompilerDesign = clone(input.foundationHub.foundationKnowledgeBaseCompilerDesign)
    input.foundationHub.foundationKnowledgeBaseCompilerDesign.consumers = [
      { id: 'codex', consumptionState: 'can_query_now' },
      { id: 'harlan', consumptionState: 'can_query_now' },
    ]
  }))
  const knowledgeBaseMissingCitation = await evaluateFoundationIntelligenceAuditVerifier(mutateBase(input => {
    input.foundationHub.knowledgeBaseQualityGate = clone(input.foundationHub.knowledgeBaseQualityGate)
    input.foundationHub.knowledgeBaseQualityGate.pages[0].citations = []
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

  const rejected = [implementationMutation, buildIntelPaidAuth, karpathyLiveExtraction, creatorWatchlistMissingUrl, courseSourceAuthPaidAuth, youtubeBatchLiveExtraction, extractionPipelineDirectWrite, extractionWorkerLaunch, extractionWorkerDirectWrite, markMSkoolPrivateAuth, markKashefTranscriptFetched, mattPocockInstallStarted, mattPocockFalseNinetyDayClaim, extractionTeamLiveRun, extractionTeamHiddenSubagent, knowledgeBaseDirectAgent, knowledgeBaseMissingCitation, gstackImport, auditAutoFix, nightlyWrite, nightlyScheduleDogfoodMissing, nightlyRunFreshnessMissing]
    .every(result => result.ok === false)
  return {
    ok: healthy.ok === true && rejected,
    mode: 'foundation-intelligence-audit-verifier-dogfood',
    healthy: { ok: healthy.ok, passed: healthy.summary.passed, total: healthy.summary.total },
    rejectedCases: {
      implementationMutation: implementationMutation.ok === false,
      buildIntelPaidAuth: buildIntelPaidAuth.ok === false,
      karpathyLiveExtraction: karpathyLiveExtraction.ok === false,
      creatorWatchlistMissingUrl: creatorWatchlistMissingUrl.ok === false,
      courseSourceAuthPaidAuth: courseSourceAuthPaidAuth.ok === false,
      youtubeBatchLiveExtraction: youtubeBatchLiveExtraction.ok === false,
      extractionPipelineDirectWrite: extractionPipelineDirectWrite.ok === false,
      extractionWorkerLaunch: extractionWorkerLaunch.ok === false,
      extractionWorkerDirectWrite: extractionWorkerDirectWrite.ok === false,
      markMSkoolPrivateAuth: markMSkoolPrivateAuth.ok === false,
      markKashefTranscriptFetched: markKashefTranscriptFetched.ok === false,
      mattPocockInstallStarted: mattPocockInstallStarted.ok === false,
      mattPocockFalseNinetyDayClaim: mattPocockFalseNinetyDayClaim.ok === false,
      extractionTeamLiveRun: extractionTeamLiveRun.ok === false,
      extractionTeamHiddenSubagent: extractionTeamHiddenSubagent.ok === false,
      knowledgeBaseDirectAgent: knowledgeBaseDirectAgent.ok === false,
      knowledgeBaseMissingCitation: knowledgeBaseMissingCitation.ok === false,
      gstackImport: gstackImport.ok === false,
      auditAutoFix: auditAutoFix.ok === false,
      nightlyWrite: nightlyWrite.ok === false,
      nightlyScheduleDogfoodMissing: nightlyScheduleDogfoodMissing.ok === false,
      nightlyRunFreshnessMissing: nightlyRunFreshnessMissing.ok === false,
    },
  }
}
