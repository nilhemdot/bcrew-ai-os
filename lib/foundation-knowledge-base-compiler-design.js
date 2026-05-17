export const FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID = 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001'
export const FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY = 'foundation-knowledge-base-compiler-design-v1'
export const FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_PLAN_PATH = 'docs/process/foundation-knowledge-base-compiler-design-001-plan.md'
export const FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001.json'
export const FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SCRIPT_PATH = 'scripts/process-foundation-knowledge-base-compiler-design-check.mjs'
export const FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_PATH = 'docs/handoffs/2026-05-17-foundation-knowledge-base-compiler-design-closeout.md'
export const FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_SPRINT_ID = 'foundation-knowledge-base-compiler-design-2026-05-17'

export const FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CHANGED_FILES = [
  'lib/foundation-knowledge-base-compiler-design.js',
  'scripts/process-foundation-knowledge-base-compiler-design-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'docs/process/foundation-knowledge-base-compiler-design-001-plan.md',
  'docs/process/approvals/FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001.json',
  'docs/handoffs/2026-05-17-foundation-knowledge-base-compiler-design-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_PROOF_COMMANDS = [
  'node --check lib/foundation-knowledge-base-compiler-design.js lib/foundation-intelligence-audit-verifier.js scripts/process-foundation-knowledge-base-compiler-design-check.mjs scripts/foundation-verify.mjs',
  'npm run process:foundation-knowledge-base-compiler-design-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:ship-check -- --card=FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001.json --closeoutKey=foundation-knowledge-base-compiler-design-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 --closeoutKey=foundation-knowledge-base-compiler-design-v1',
  'npm run process:foundation-ship -- --card=FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001.json --closeoutKey=foundation-knowledge-base-compiler-design-v1 --commitRef=HEAD',
]

export const FOUNDATION_KB_REQUIRED_STAGE_IDS = [
  'source_contracts',
  'ingestion_permission',
  'raw_evidence_envelope',
  'compiler_rules',
  'compiled_markdown_wiki',
  'query_contract',
  'feedback_loop',
  'quality_gate',
]

export const FOUNDATION_KB_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, or model call.',
  'No compiled KB pages, query index, vector table, atom creation, or Research Inbox write in V1.',
  'No auth-required or paid extraction without Steve approval.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
  'Do not mutate Google Drive permissions.',
  'No live Agent Feedback auto-send.',
]

export function buildFoundationKnowledgeBaseCompilerDesign(overrides = {}) {
  return {
    cardId: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
    closeoutKey: FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
    status: 'design_ready',
    proposalOnly: true,
    ownerLayer: 'Foundation',
    runtimeOwner: 'none_v1_design_only',
    implementationStarted: false,
    liveExtractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    sourceContractsRequired: true,
    ingestionPermissionRequired: true,
    qualityGateCardId: 'KNOWLEDGE-BASE-QUALITY-GATE-001',
    sourcePacketCardId: 'EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001',
    preflightCardId: 'BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001',
    stages: [
      {
        id: 'source_contracts',
        owner: 'Foundation',
        requiredFields: ['sourceId', 'owner', 'authPosture', 'extractionPosture', 'freshnessExpectation', 'privacyTier'],
        output: 'eligible source registry rows only',
      },
      {
        id: 'ingestion_permission',
        owner: 'Foundation',
        requiredFields: ['approvalStatus', 'costCap', 'authBoundary', 'externalWriteBoundary'],
        output: 'approved queue packet or blocked operator action',
      },
      {
        id: 'raw_evidence_envelope',
        owner: 'Foundation',
        requiredFields: ['sourceId', 'sourceUrl', 'capturedAt', 'artifactType', 'provider', 'cost', 'confidence', 'provenance'],
        output: 'raw evidence envelope, not doctrine',
      },
      {
        id: 'compiler_rules',
        owner: 'Foundation',
        requiredFields: ['chunkPolicy', 'citationPolicy', 'frontmatterSchema', 'stalenessPolicy', 'privacyPolicy', 'contradictionPolicy'],
        output: 'deterministic markdown/wiki compiler contract',
      },
      {
        id: 'compiled_markdown_wiki',
        owner: 'Foundation',
        requiredFields: ['frontmatter', 'sourceCitations', 'staleAfter', 'privacyTier', 'compilerVersion'],
        output: 'compiled pages behind quality gate',
      },
      {
        id: 'query_contract',
        owner: 'Foundation',
        requiredFields: ['queryInput', 'sourceFilter', 'citationRequirement', 'answerBoundary', 'fallbackBehavior'],
        output: 'Q/A response with citations or fail-closed no-answer',
      },
      {
        id: 'feedback_loop',
        owner: 'Foundation',
        requiredFields: ['operatorFeedback', 'contradictionReport', 'stalePageReport', 'missingSourceReport'],
        output: 'repair queue, not silent doctrine mutation',
      },
      {
        id: 'quality_gate',
        owner: 'Foundation',
        requiredFields: ['citations', 'freshness', 'contradictions', 'pageSize', 'frontmatter', 'privacyTier', 'unsourcedDoctrine'],
        output: 'pass/fail before agents consume compiled knowledge',
      },
    ],
    consumers: [
      { id: 'codex', consumptionState: 'blocked_until_foundation_query_contract' },
      { id: 'harlan', consumptionState: 'blocked_until_foundation_query_contract' },
      { id: 'openclaw', consumptionState: 'blocked_until_foundation_query_contract' },
      { id: 'openhuman', consumptionState: 'blocked_until_foundation_query_contract' },
    ],
    outputWritePolicy: {
      compiledPages: false,
      queryIndex: false,
      researchInbox: false,
      atoms: false,
      backlogMutationFromExtractedContent: false,
    },
    notNextBoundaries: FOUNDATION_KB_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

export function validateFoundationKnowledgeBaseCompilerDesign(design = buildFoundationKnowledgeBaseCompilerDesign()) {
  const findings = []
  const stages = list(design.stages)
  const stageIds = stages.map(stage => stage.id)
  const consumers = list(design.consumers)
  const outputWritePolicy = design.outputWritePolicy || {}

  addFinding(findings, design.proposalOnly === true, 'compiler design remains proposal-only', String(design.proposalOnly))
  addFinding(findings, design.ownerLayer === 'Foundation', 'Foundation owns the compiler contract', design.ownerLayer || 'missing')
  addFinding(findings, design.implementationStarted === false, 'no compiler implementation starts in design sprint', String(design.implementationStarted))
  addFinding(findings, design.liveExtractionStarted === false, 'no live extraction starts in design sprint', String(design.liveExtractionStarted))
  addFinding(findings, design.modelCallsStarted === false, 'no model calls start in design sprint', String(design.modelCallsStarted))
  addFinding(findings, design.externalWritesStarted === false, 'no external writes start in design sprint', String(design.externalWritesStarted))
  addFinding(findings, design.sourceContractsRequired === true, 'source contracts are mandatory before ingestion', String(design.sourceContractsRequired))
  addFinding(findings, design.ingestionPermissionRequired === true, 'ingestion permission is mandatory before compile', String(design.ingestionPermissionRequired))
  addFinding(findings, FOUNDATION_KB_REQUIRED_STAGE_IDS.every(id => stageIds.includes(id)), 'all compiler pipeline stages are defined', stageIds.join(', '))
  addFinding(findings, stages.every(stage => stage.owner === 'Foundation'), 'every compiler stage is Foundation-owned', stages.map(stage => `${stage.id}:${stage.owner}`).join(', '))
  addFinding(findings, stages.every(stage => list(stage.requiredFields).length >= 4), 'every compiler stage has concrete source/proof fields', stages.map(stage => `${stage.id}:${list(stage.requiredFields).length}`).join(', '))
  addFinding(findings, design.qualityGateCardId === 'KNOWLEDGE-BASE-QUALITY-GATE-001', 'quality gate follow-up is explicit', design.qualityGateCardId || 'missing')
  addFinding(findings, consumers.length >= 3 && consumers.every(consumer => consumer.consumptionState === 'blocked_until_foundation_query_contract'), 'agents consume only after Foundation query contract', consumers.map(consumer => `${consumer.id}:${consumer.consumptionState}`).join(', '))
  addFinding(findings, Object.values(outputWritePolicy).every(value => value === false), 'V1 creates no compiled outputs, atoms, Research Inbox writes, or backlog mutations', JSON.stringify(outputWritePolicy))
  addFinding(findings, list(design.notNextBoundaries).some(item => /No live extraction/i.test(item)), 'no-live-extraction boundary is explicit')
  addFinding(findings, list(design.notNextBoundaries).some(item => /No transcript fetch/i.test(item)), 'no transcript/crawl/model-call boundary is explicit')
  addFinding(findings, list(design.notNextBoundaries).some(item => /No Harlan/i.test(item)), 'not a Harlan-only memory hack')

  return {
    ok: findings.length === 0,
    status: findings.length ? 'revise' : 'design_ready',
    findings,
    summary: {
      stageCount: stages.length,
      consumerCount: consumers.length,
      proposalOnly: design.proposalOnly === true,
      implementationStarted: design.implementationStarted === true,
      liveExtractionStarted: design.liveExtractionStarted === true,
      qualityGateCardId: design.qualityGateCardId || null,
    },
  }
}

export function buildFoundationKnowledgeBaseCompilerDesignDogfoodProof() {
  const healthy = validateFoundationKnowledgeBaseCompilerDesign(buildFoundationKnowledgeBaseCompilerDesign())
  const harlanOnly = validateFoundationKnowledgeBaseCompilerDesign(buildFoundationKnowledgeBaseCompilerDesign({
    ownerLayer: 'Harlan',
    consumers: [{ id: 'harlan', consumptionState: 'can_query_now' }],
  }))
  const transcriptDump = validateFoundationKnowledgeBaseCompilerDesign(buildFoundationKnowledgeBaseCompilerDesign({
    stages: buildFoundationKnowledgeBaseCompilerDesign().stages.filter(stage => stage.id !== 'compiler_rules'),
    outputWritePolicy: { compiledPages: true, queryIndex: false, researchInbox: false, atoms: false, backlogMutationFromExtractedContent: false },
  }))
  const missingQualityGate = validateFoundationKnowledgeBaseCompilerDesign(buildFoundationKnowledgeBaseCompilerDesign({
    qualityGateCardId: null,
    stages: buildFoundationKnowledgeBaseCompilerDesign().stages.filter(stage => stage.id !== 'quality_gate'),
  }))
  const directAgentConsumption = validateFoundationKnowledgeBaseCompilerDesign(buildFoundationKnowledgeBaseCompilerDesign({
    consumers: [{ id: 'codex', consumptionState: 'can_query_now' }, { id: 'harlan', consumptionState: 'can_query_now' }],
  }))
  const liveExtraction = validateFoundationKnowledgeBaseCompilerDesign(buildFoundationKnowledgeBaseCompilerDesign({
    liveExtractionStarted: true,
    modelCallsStarted: true,
  }))

  return {
    ok: healthy.ok === true &&
      [harlanOnly, transcriptDump, missingQualityGate, directAgentConsumption, liveExtraction].every(result => result.ok === false),
    healthy,
    rejectedCases: {
      harlanOnly: harlanOnly.ok === false,
      transcriptDump: transcriptDump.ok === false,
      missingQualityGate: missingQualityGate.ok === false,
      directAgentConsumption: directAgentConsumption.ok === false,
      liveExtraction: liveExtraction.ok === false,
    },
    invariant: 'Foundation-owned KB design passes; Harlan-only ownership, raw transcript dumps, missing quality gate, direct agent consumption, and live extraction fail closed.',
  }
}
