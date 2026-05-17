import {
  buildKarpathyKbVideoPackSnapshot,
  buildKarpathyKbVideoPackTarget,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY,
  KARPATHY_KB_VIDEO_PACK_SOURCES,
} from './extractor-queue-karpathy-kb-video-pack.js'

export const BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID = 'BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001'
export const BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY = 'build-intel-karpathy-llm-kb-preflight-v1'
export const BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PLAN_PATH = 'docs/process/build-intel-karpathy-llm-kb-preflight-001-plan.md'
export const BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001.json'
export const BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SCRIPT_PATH = 'scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs'
export const BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_PATH = 'docs/handoffs/2026-05-17-build-intel-karpathy-llm-kb-preflight-closeout.md'
export const BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_SPRINT_ID = 'build-intel-karpathy-llm-kb-preflight-2026-05-17'

export const BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CHANGED_FILES = [
  'lib/build-intel-karpathy-llm-kb-preflight.js',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs',
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PLAN_PATH,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_APPROVAL_PATH,
  BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_PATH,
  'package.json',
]

export const BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_PROOF_COMMANDS = [
  'node --check lib/build-intel-karpathy-llm-kb-preflight.js lib/foundation-intelligence-audit-verifier.js scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs scripts/foundation-verify.mjs',
  'npm run process:build-intel-karpathy-llm-kb-preflight-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001.json --closeoutKey=build-intel-karpathy-llm-kb-preflight-v1 --commitRef=HEAD',
]

export const KARPATHY_LLM_KB_PATTERN_STAGES = [
  {
    key: 'raw_source_packet',
    label: 'Raw data / source packet',
    currentAiosState: 'present',
    existingProof: [EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID, EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY],
    gap: '',
  },
  {
    key: 'permissioned_ingestion',
    label: 'Source contract and permission gate',
    currentAiosState: 'present',
    existingProof: ['SOURCE-CONTRACT-VALIDATION-LAYER-001', 'EXTRACTION-RUNTIME-READINESS-001'],
    gap: '',
  },
  {
    key: 'compiled_markdown_wiki',
    label: 'Compiled markdown/wiki',
    currentAiosState: 'missing_design',
    existingProof: ['docs/rebuild/current-state.md', 'docs/handoffs/'],
    gap: 'Foundation needs compiler rules for source packets, citations, freshness, chunking, and markdown/wiki output before agents consume this pattern.',
    followUpCardId: 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001',
  },
  {
    key: 'query_qna_interface',
    label: 'Query / Q&A interface',
    currentAiosState: 'partial',
    existingProof: ['RETRIEVAL-003', 'SYNTHESIS-FACTS-001', 'ACTION-ROUTER-001'],
    gap: 'Hybrid evidence exists, but there is no Foundation-owned KB query contract for compiled source packs yet.',
    followUpCardId: 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001',
  },
  {
    key: 'quality_lint_loop',
    label: 'Quality / lint loop',
    currentAiosState: 'missing_design',
    existingProof: ['foundation:verify', 'Plan Critic'],
    gap: 'Compiled knowledge needs provenance lint, stale-source checks, answer-eval fixtures, and citation coverage before agent use.',
    followUpCardId: 'KNOWLEDGE-BASE-QUALITY-GATE-001',
  },
  {
    key: 'agent_consumption',
    label: 'Agent consumption',
    currentAiosState: 'blocked_until_foundation_capability',
    existingProof: ['Foundation owns source contracts, ingestion permission, compiler rules, quality gates, and query interface.'],
    gap: 'Harlan, Codex, and other agents consume only after Foundation owns the capability.',
    followUpCardId: 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001',
  },
]

export const KARPATHY_LLM_KB_NOT_TO_COPY = [
  'Do not turn this into a Harlan-only memory hack.',
  'Do not dump raw transcripts into markdown and call it a knowledge base.',
  'Do not bypass source contracts, freshness, permission, cost, or evidence envelopes.',
  'Do not make vector search the only truth layer; compiled markdown/wiki remains source-backed reviewable output.',
  'Do not let agents query or mutate the KB before Foundation owns compiler rules, quality gates, and query contracts.',
]

const REQUIRED_FOLLOW_UP_CARD_IDS = [
  'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001',
  'KNOWLEDGE-BASE-QUALITY-GATE-001',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function findBacklogCard(backlogItems = [], cardId) {
  return (backlogItems || []).find(item => item?.id === cardId) || null
}

function buildPacketSnapshot(extractionControlSnapshot = {}) {
  const hasLiveTargets = Array.isArray(extractionControlSnapshot.targets)
  if (hasLiveTargets) return buildKarpathyKbVideoPackSnapshot({ extractionControlSnapshot })
  return buildKarpathyKbVideoPackSnapshot({
    extractionControlSnapshot: {
      targets: [buildKarpathyKbVideoPackTarget()],
      recentRuns: [],
    },
  })
}

function summarizeStages(stages = KARPATHY_LLM_KB_PATTERN_STAGES) {
  return {
    total: stages.length,
    present: stages.filter(stage => stage.currentAiosState === 'present').length,
    partial: stages.filter(stage => stage.currentAiosState === 'partial').length,
    missingDesign: stages.filter(stage => stage.currentAiosState === 'missing_design').length,
    blocked: stages.filter(stage => String(stage.currentAiosState || '').includes('blocked')).length,
  }
}

export function buildKarpathyLlmKbPreflightSnapshot({
  backlogItems = [],
  extractionControlSnapshot = {},
  stages = KARPATHY_LLM_KB_PATTERN_STAGES,
  notToCopy = KARPATHY_LLM_KB_NOT_TO_COPY,
  sideEffects = {},
  outputTarget = 'proposal_research_only',
} = {}) {
  const packet = buildPacketSnapshot(extractionControlSnapshot)
  const findings = []
  const followUpCards = REQUIRED_FOLLOW_UP_CARD_IDS.map(cardId => findBacklogCard(backlogItems, cardId))
  const compilerCard = findBacklogCard(backlogItems, 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001')
  const qualityCard = findBacklogCard(backlogItems, 'KNOWLEDGE-BASE-QUALITY-GATE-001')
  const stageKeys = stages.map(stage => stage.key)
  const sourceCreators = KARPATHY_KB_VIDEO_PACK_SOURCES.map(source => source.creatorId)
  const noSideEffects = sideEffects.liveExtractionStarted !== true &&
    sideEffects.paidExtractionStarted !== true &&
    sideEffects.authRequiredExtractionStarted !== true &&
    sideEffects.researchInboxWritten !== true &&
    sideEffects.atomsCreated !== true &&
    sideEffects.backlogMutatedFromExtractedContent !== true

  addFinding(findings, packet.ok === true && packet.summary?.runnable === false, 'Karpathy packet exists and remains non-runnable', `status=${packet.summary?.status} runnable=${packet.summary?.runnable}`)
  addFinding(findings, sourceCreators.includes('dream-labs-ai') && sourceCreators.includes('nate-herk') && sourceCreators.includes('andrej-karpathy'), 'preflight names all queued source candidates', sourceCreators.join(', '))
  addFinding(findings, stageKeys.includes('raw_source_packet') && stageKeys.includes('compiled_markdown_wiki') && stageKeys.includes('query_qna_interface') && stageKeys.includes('quality_lint_loop'), 'pattern stages cover raw, compiled, query, and quality loop', stageKeys.join(', '))
  addFinding(findings, compilerCard && ['research', 'scoped', 'ranked', 'parked', 'executing', 'done'].includes(compilerCard.lane), 'compiler design follow-up card exists', compilerCard ? `${compilerCard.id}:${compilerCard.lane}` : 'missing')
  addFinding(findings, qualityCard && ['research', 'scoped', 'ranked', 'parked', 'executing', 'done'].includes(qualityCard.lane), 'quality gate follow-up card exists', qualityCard ? `${qualityCard.id}:${qualityCard.lane}` : 'missing')
  addFinding(findings, followUpCards.length === REQUIRED_FOLLOW_UP_CARD_IDS.length && followUpCards.every(Boolean), 'preflight maps gaps to existing follow-up cards', followUpCards.map(card => card?.id || 'missing').join(', '))
  addFinding(findings, notToCopy.some(item => /Harlan-only memory hack/i.test(item)) && notToCopy.some(item => /raw transcripts/i.test(item)), 'preflight records what not to copy', `${notToCopy.length} boundaries`)
  addFinding(findings, outputTarget === 'proposal_research_only', 'output stays proposal/research only', outputTarget)
  addFinding(findings, noSideEffects, 'no live extraction or mutation side effects', JSON.stringify(sideEffects))

  const proposalRows = [
    {
      proposedCardId: 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001',
      disposition: 'enrich_existing_card',
      reason: 'Define Foundation-owned compiler rules before any agent consumes a Karpathy-style KB.',
      writesBacklog: false,
    },
    {
      proposedCardId: 'KNOWLEDGE-BASE-QUALITY-GATE-001',
      disposition: 'enrich_existing_card',
      reason: 'Define provenance, freshness, citation, and answer-eval quality gates before compiled KB output is trusted.',
      writesBacklog: false,
    },
  ]

  return {
    ok: findings.every(finding => finding.ok),
    status: findings.every(finding => finding.ok) ? 'ready' : 'risk',
    cardId: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID,
    closeoutKey: BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY,
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    liveExtractionStarted: sideEffects.liveExtractionStarted === true,
    paidExtractionStarted: sideEffects.paidExtractionStarted === true,
    authRequiredExtractionStarted: sideEffects.authRequiredExtractionStarted === true,
    researchInboxWritten: sideEffects.researchInboxWritten === true,
    atomsCreated: sideEffects.atomsCreated === true ? 1 : 0,
    outputTarget,
    sourceCandidates: KARPATHY_KB_VIDEO_PACK_SOURCES,
    stages,
    stageSummary: summarizeStages(stages),
    have: [
      'source contracts and auth/extraction posture validation',
      'pending-approval Karpathy source packet',
      'extraction runtime readiness gates',
      'atoms, retrieval, synthesis, and action-router primitives',
      'Research Inbox/proposal-only precedent',
    ],
    missing: [
      'compiled markdown/wiki schema and source-to-page rules',
      'KB query/Q&A contract over compiled source packs',
      'provenance/freshness/citation lint rules',
      'answer-eval fixtures for compiled knowledge',
      'agent consumption contract after Foundation capability ownership',
    ],
    notToCopy,
    proposalRows,
    recommendedNext: 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001',
    packet,
    findings,
    failures: findings.filter(finding => !finding.ok),
  }
}

export function buildKarpathyLlmKbPreflightDogfoodProof({ backlogItems = [] } = {}) {
  const healthy = buildKarpathyLlmKbPreflightSnapshot({ backlogItems })
  const liveExtraction = buildKarpathyLlmKbPreflightSnapshot({
    backlogItems,
    sideEffects: { liveExtractionStarted: true },
  })
  const missingCompiler = buildKarpathyLlmKbPreflightSnapshot({
    backlogItems: backlogItems.filter(card => card?.id !== 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001'),
  })
  const missingQuality = buildKarpathyLlmKbPreflightSnapshot({
    backlogItems: backlogItems.filter(card => card?.id !== 'KNOWLEDGE-BASE-QUALITY-GATE-001'),
  })
  const harlanOnly = buildKarpathyLlmKbPreflightSnapshot({
    backlogItems,
    notToCopy: KARPATHY_LLM_KB_NOT_TO_COPY.filter(item => !/Harlan-only memory hack/i.test(item)),
  })
  const outputMutation = buildKarpathyLlmKbPreflightSnapshot({
    backlogItems,
    outputTarget: 'direct_agent_memory',
  })

  return {
    ok: healthy.ok === true &&
      liveExtraction.ok === false &&
      missingCompiler.ok === false &&
      missingQuality.ok === false &&
      harlanOnly.ok === false &&
      outputMutation.ok === false,
    healthy,
    rejected: {
      liveExtraction,
      missingCompiler,
      missingQuality,
      harlanOnly,
      outputMutation,
    },
    dogfoodInvariant: 'Karpathy KB preflight passes only as proposal/research with Foundation compiler and quality follow-ups present; live extraction, missing follow-ups, Harlan-only memory, or direct-agent output fail closed.',
  }
}

export function renderKarpathyLlmKbPreflightReport(snapshot = buildKarpathyLlmKbPreflightSnapshot()) {
  const stageRows = (snapshot.stages || []).map(stage =>
    `- ${stage.label}: ${stage.currentAiosState}${stage.gap ? ` - ${stage.gap}` : ''}`
  ).join('\n')
  const haveRows = (snapshot.have || []).map(item => `- ${item}`).join('\n')
  const missingRows = (snapshot.missing || []).map(item => `- ${item}`).join('\n')
  const notToCopyRows = (snapshot.notToCopy || []).map(item => `- ${item}`).join('\n')
  const proposalRows = (snapshot.proposalRows || []).map(row =>
    `- ${row.proposedCardId}: ${row.disposition}. ${row.reason}`
  ).join('\n')

  return `# Build Intel Karpathy LLM KB Preflight Closeout

Card: \`${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CARD_ID}\`

Closeout key: \`${BUILD_INTEL_KARPATHY_LLM_KB_PREFLIGHT_CLOSEOUT_KEY}\`

## What Changed

- Compared current AIOS Foundation primitives against the Karpathy-style raw data -> compiled markdown/wiki -> query/Q&A -> quality/lint loop.
- Kept the output proposal/research only.
- Confirmed the queued Karpathy packet remains pending approval and non-runnable.
- Routed gaps to existing Foundation-owned follow-up cards instead of creating a Harlan-only memory path.

## Source Packet

- Dream Labs AI: ${KARPATHY_KB_VIDEO_PACK_SOURCES[0].title}
- Nate Herk: ${KARPATHY_KB_VIDEO_PACK_SOURCES[1].title}
- Original Karpathy source: ${KARPATHY_KB_VIDEO_PACK_SOURCES[2].sourceUrl}

## Current AIOS Fit

${stageRows}

## What We Already Have

${haveRows}

## Missing Before Build

${missingRows}

## What Not To Copy

${notToCopyRows}

## Proposal Routing

${proposalRows}

Recommended next: \`${snapshot.recommendedNext}\`.

## Known Limits

- This does not run live extraction.
- This does not fetch transcripts, crawl pages, capture screenshots, summarize videos, or call a model.
- This does not write Research Inbox proposals, create atoms, or mutate backlog from extracted content.
- This does not build Harlan/Fal/voice/Canva/OpenHuman work.
`
}
