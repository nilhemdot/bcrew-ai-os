export const VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID = 'VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001'
export const VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-intelligence-spine-split-module-v1'
export const VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-intelligence-spine-split-module-001-plan.md'
export const VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001.json'
export const VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-intelligence-spine-split-module-check.mjs'
export const VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SPRINT_ID = 'verifier-intelligence-spine-split-module-2026-05-16'
export const VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_BEFORE_LINES = 14538
export const VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-INTELLIGENCE-SPINE-ORCHESTRATION-SPLIT-001'
export const VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-intelligence-spine-orchestration-split-v1'
export const VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-intelligence-spine-orchestration-split-001-plan.md'
export const VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-INTELLIGENCE-SPINE-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-intelligence-spine-orchestration-split-check.mjs'
export const VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-intelligence-spine-orchestration-split-closeout.md'
export const VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_BEFORE_LINES = 6528
const OPENAI_EMBEDDINGS_ENDPOINT_PATTERN = 'https://api.open' + 'ai.com/v1/embeddings'

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function summary(checks) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

function getRetrievalEvalCases(fixture = {}) {
  return Array.isArray(fixture.cases) ? fixture.cases : []
}

function buildGovernedExtractionLedgerRuns(snapshot = {}) {
  return (snapshot.recentRuns || []).filter(run =>
    run.provenance?.caller === 'scripts/run-extraction-target.mjs' &&
      run.sourceCrawlRunId &&
      run.sourceId &&
      run.nextRunState?.targetKey &&
      run.itemCounts &&
      Object.prototype.hasOwnProperty.call(run.itemCounts, 'inspected')
  )
}

export function evaluateFoundationIntelligenceSpineVerifier(input = {}) {
  const checks = []
  const foundationDbSource = input.foundationDbSource || ''
  const foundationDbWithBacklogSeedSource = input.foundationDbWithBacklogSeedSource || foundationDbSource
  const extractionTargetSource = input.extractionTargetSource || ''
  const intelligenceJobProofSource = input.intelligenceJobProofSource || ''
  const intelligenceJobLedgerSnapshot = input.intelligenceJobLedgerSnapshot || {}
  const intelligenceSalvageSpecSource = input.intelligenceSalvageSpecSource || ''
  const strategyHubManifestSource = input.strategyHubManifestSource || ''
  const currentPlan = input.currentPlan || ''
  const intelligencePipelineSource = input.intelligencePipelineSource || ''
  const intelligenceAtomsSource = input.intelligenceAtomsSource || ''
  const packageSource = input.packageSource || ''
  const intelligenceAtomProofSource = input.intelligenceAtomProofSource || ''
  const intelligenceAtomSpineSnapshot = input.intelligenceAtomSpineSnapshot || {}
  const intelligenceRetrievalSource = input.intelligenceRetrievalSource || ''
  const intelligenceRetrievalProofSource = input.intelligenceRetrievalProofSource || ''
  const intelligenceRetrievalSnapshot = input.intelligenceRetrievalSnapshot || {}
  const llmRouterSource = input.llmRouterSource || ''
  const intelligenceSemanticRetrievalProofSource = input.intelligenceSemanticRetrievalProofSource || ''
  const intelligenceHybridRetrievalProofSource = input.intelligenceHybridRetrievalProofSource || ''
  const serverSource = input.serverSource || ''
  const intelligenceRetrievalEvalSource = input.intelligenceRetrievalEvalSource || ''
  const intelligenceRetrievalEvalFixture = input.intelligenceRetrievalEvalFixture || {}
  const intelligenceSynthesisFactsSource = input.intelligenceSynthesisFactsSource || ''
  const intelligenceSynthesisFactsProofSource = input.intelligenceSynthesisFactsProofSource || ''
  const synthesisFactsSnapshot = input.synthesisFactsSnapshot || {}
  const intelligenceSynthesisSource = input.intelligenceSynthesisSource || ''
  const intelligenceSynthesisProofSource = input.intelligenceSynthesisProofSource || ''
  const synthesisEngineSnapshot = input.synthesisEngineSnapshot || {}
  const intelligenceActionRouterSource = input.intelligenceActionRouterSource || ''
  const foundationJobsSource = input.foundationJobsSource || ''
  const intelligenceActionRouterProofSource = input.intelligenceActionRouterProofSource || ''
  const actionRouterSnapshot = input.actionRouterSnapshot || {}

  const governedExtractionLedgerRuns = buildGovernedExtractionLedgerRuns(intelligenceJobLedgerSnapshot)
  const atomImplementationPresent = [foundationDbSource, intelligenceAtomsSource].some(source =>
    /CREATE TABLE IF NOT EXISTS\s+(business_atoms|intelligence_atoms|atom_hits|intelligence_atom_hits)/.test(source)
  )
  const intelAtomScoperQueryProof = Array.isArray(intelligenceAtomSpineSnapshot.intelAtomScoperQueryProof)
    ? intelligenceAtomSpineSnapshot.intelAtomScoperQueryProof
    : (intelligenceAtomSpineSnapshot.latestScoperQueryProof || [])
  const retrievalEvalCases = getRetrievalEvalCases(intelligenceRetrievalEvalFixture)
  const retrievalEvalSources = new Set(retrievalEvalCases.map(item => item.sourceId).filter(Boolean))
  const latestRetrievalEvalMetadata = intelligenceRetrievalSnapshot.latestEvalRun?.metadata || {}
  const synthesisFactTypes = new Set((synthesisFactsSnapshot.factsByType || []).map(row => row.factType))
  const synthesisFactSources = new Set((synthesisFactsSnapshot.factsBySource || []).map(row => row.sourceId))
  const retrievalSourcesWithChunks = Array.isArray(intelligenceRetrievalSnapshot.bySource)
    ? intelligenceRetrievalSnapshot.bySource.filter(source => source.count > 0).length
    : 0
  const synthesisActiveItems = Number(synthesisEngineSnapshot.activeItems || 0)
  const synthesisRouteableActiveItems = Number.isFinite(Number(synthesisEngineSnapshot.routeableActiveItems))
    ? Number(synthesisEngineSnapshot.routeableActiveItems)
    : synthesisActiveItems

  addCheck(
    checks,
    includesAll(foundationDbWithBacklogSeedSource, [
      'CREATE TABLE IF NOT EXISTS intelligence_job_runs',
      'CREATE TABLE IF NOT EXISTS intelligence_job_llm_calls',
      'source_id TEXT',
      'cursor_state JSONB',
      'budget JSONB',
      'model TEXT',
      'provider TEXT',
      'auth_path TEXT',
      'cost_usd NUMERIC',
      'item_counts JSONB',
      'failure_count INTEGER',
      'output_artifact_ids TEXT[]',
      'next_run_state JSONB',
      'upsertIntelligenceJobRun',
      'getIntelligenceJobLedgerSnapshot',
    ]) &&
      includesAll(extractionTargetSource, [
        'upsertIntelligenceJobRun',
        'recordExtractionIntelligenceJob',
        'scripts/run-extraction-target.mjs',
        'intel-extraction:',
        'source_crawl_target_runs',
      ]) &&
      packageSource.includes('"intelligence:jobs-proof"') &&
      includesAll(intelligenceJobProofSource, [
        'INTEL-JOBS-001',
        'source_crawl_target_runs',
        'upsertIntelligenceJobRun',
        'getIntelligenceJobLedgerSnapshot',
      ]) &&
      Number(intelligenceJobLedgerSnapshot.totalRuns || 0) >= 1 &&
      governedExtractionLedgerRuns.length >= 1 &&
      (intelligenceJobLedgerSnapshot.recentRuns || []).some(run =>
        run.provenance?.backlogCardId === 'INTEL-JOBS-001' &&
        run.sourceCrawlRunId &&
        run.itemCounts &&
        Object.prototype.hasOwnProperty.call(run.itemCounts, 'inspected')
      ),
    'INTEL-JOBS-001 intelligence job ledger is schema-backed and wired into governed extraction',
    `${intelligenceJobLedgerSnapshot.totalRuns || 0} ledger rows / governed extraction writers=${governedExtractionLedgerRuns.length} / latest=${intelligenceJobLedgerSnapshot.recentRuns?.[0]?.jobId || 'missing'}`,
  )
  addCheck(
    checks,
    includesAll(foundationDbWithBacklogSeedSource, [
      "id: 'REPORT-MINING-001'",
      "lane: 'done'",
      'Accepted on 2026-04-27 in `docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md`',
      "id: 'INTEL-ATOM-001'",
      'Done v1 on 2026-04-27',
      'direct Scoper query fields',
    ]) &&
      includesAll(intelligenceSalvageSpecSource, [
        'Status: Accepted build gate',
        'Report Shapes To Preserve',
        'Old Atom Fields To Preserve',
        'Governed Report Artifact Contract',
        'Required Changes To INTEL-ATOM-001',
        'A Scoper must query atoms/retrieval directly before producing scoped work',
        '`candidate_key` when promoted from extracted candidates',
        '`input_candidate_keys`',
      ]) &&
      !intelligenceSalvageSpecSource.includes('candidate_id') &&
      !intelligenceSalvageSpecSource.includes('input_candidate_ids') &&
      includesAll(strategyHubManifestSource, [
        '`REPORT-MINING-001` - accepted old-system Director/Scoper/Gold Library/report-shape salvage gate',
        '`INTEL-ATOM-001` - done v1: durable source-backed memory atoms plus governed report artifacts and direct Scoper query contract',
      ]) &&
      (!atomImplementationPresent || intelligenceSalvageSpecSource.includes('Status: Accepted build gate')) &&
      includesAll(currentPlan, [
        '`INTEL-JOBS-001` -> `REPORT-MINING-001` -> `INTEL-ATOM-001` -> `RETRIEVAL-001`',
        'intelligence_report_artifacts',
        'intelligence_atoms',
        'intelligence_atom_hits',
        '`INTEL-ATOM-001` done as the v1 report/atom substrate',
        'old-system report-shape salvage',
      ]) &&
      includesAll(intelligencePipelineSource, [
        'department intelligence briefs as governed report artifacts',
        'hub Scopers that query atoms/retrieval directly',
        'The anti-pattern is: Director summarizes research',
        'old-system report-shape salvage gate',
      ]),
    'REPORT-MINING-001 salvage spec gates INTEL-ATOM-001 before atom implementation',
    `old Director/Scoper/Gold Library salvage accepted; atom implementation present=${atomImplementationPresent}`,
  )
  addCheck(
    checks,
    includesAll(foundationDbSource, [
      'createIntelligenceAtomStore',
      'intelligenceAtomSchemaSql',
      'getRegisteredSourceContractIds',
      'intelligenceAtomSpine',
    ]) &&
      includesAll(intelligenceAtomsSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_report_artifacts',
        'CREATE TABLE IF NOT EXISTS intelligence_atoms',
        'CREATE TABLE IF NOT EXISTS intelligence_atom_hits',
        'source_id TEXT NOT NULL',
        'report_artifact_id TEXT',
        'dedup_hash TEXT NOT NULL',
        'min_tier INTEGER NOT NULL DEFAULT 1',
        'assertRegisteredSourceIds',
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        'WHERE dedup_hash = $1',
        'requestedAtomId',
        'queryIntelligenceAtomsForScoper requires maxTier >= 1',
        'ON intelligence_atoms(dedup_hash)',
      ]) &&
      includesAll([foundationDbSource, intelligenceAtomsSource].join('\n'), [
        'upsertIntelligenceReportArtifact',
        'upsertIntelligenceAtom',
        'recordIntelligenceAtomHit',
        'queryIntelligenceAtomsForScoper',
        'getIntelligenceAtomSpineSnapshot',
      ]) &&
      packageSource.includes('"intelligence:atoms-proof"') &&
      includesAll(intelligenceAtomProofSource, [
        'INTEL-ATOM-001',
        'REPORT-MINING-001',
        'upsertIntelligenceReportArtifact',
        'upsertIntelligenceAtom',
        'recordIntelligenceAtomHit',
        'queryIntelligenceAtomsForScoper',
        'getIntelligenceAtomSpineSnapshot',
        'duplicateAtomProof',
        'Duplicate atom proof did not merge on dedup_hash',
        'tierGuardProof',
        'explicit maxTier',
      ]) &&
      Number(intelligenceAtomSpineSnapshot.totalReports || 0) >= 1 &&
      Number(intelligenceAtomSpineSnapshot.totalAtoms || 0) >= 1 &&
      Number(intelligenceAtomSpineSnapshot.totalHits || 0) >= 1 &&
      Number(intelligenceAtomSpineSnapshot.atomsWithReportArtifact || 0) >= 1 &&
      Number(intelligenceAtomSpineSnapshot.atomsWithScoperQueryFields || 0) >= 1 &&
      intelAtomScoperQueryProof.some(atom =>
        atom.reportArtifactId &&
        atom.metricRefs?.includes('INTEL-ATOM-001') &&
        atom.minTier <= 1
      ),
    'INTEL-ATOM-001 stores governed report artifacts, atoms, hits, and Scoper-queryable proof',
    `${intelligenceAtomSpineSnapshot.totalReports || 0} reports / ${intelligenceAtomSpineSnapshot.totalAtoms || 0} atoms / ${intelligenceAtomSpineSnapshot.totalHits || 0} hits`,
  )
  addCheck(
    checks,
    includesAll(foundationDbWithBacklogSeedSource, [
      'createIntelligenceRetrievalStore',
      'intelligenceRetrievalSchemaSql',
      'intelligenceRetrieval',
      "id: 'RETRIEVAL-001'",
      'Done v1 on 2026-04-27',
      "id: 'RETRIEVAL-002'",
      'SYNTHESIS-ENGINE-001',
    ]) &&
      includesAll(intelligenceRetrievalSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_retrieval_runs',
        'CREATE TABLE IF NOT EXISTS intelligence_retrieval_chunks',
        'search_vector TSVECTOR NOT NULL',
        'USING GIN(search_vector)',
        'promoteSharedCommunicationCandidatesToAtoms',
        'searchIntelligenceChunks',
        'intelligence retrieval queries require maxTier >= 1',
        'FROM shared_communication_candidates c',
        'JOIN shared_communication_artifacts artifact',
        'NOT EXISTS (',
        'FROM intelligence_retrieval_chunks chunk',
        'chunk.candidate_key = c.candidate_key',
        'chunk.atom_id IS NOT NULL',
        'upsertIntelligenceAtom',
        'recordIntelligenceAtomHit',
      ]) &&
      packageSource.includes('"intelligence:retrieval-proof"') &&
      includesAll(intelligenceRetrievalProofSource, [
        'promoteSharedCommunicationCandidatesToAtoms',
        'searchIntelligenceChunks',
        'maxTier: 1',
        'tierGuardProof',
        'RETRIEVAL-001',
        'RETRIEVAL-002',
      ]) &&
      Number(intelligenceRetrievalSnapshot.totalChunks || 0) >= 1 &&
      Number(intelligenceRetrievalSnapshot.activeChunks || 0) >= 1 &&
      Number(intelligenceRetrievalSnapshot.chunksWithAtoms || 0) >= 1 &&
      Number(intelligenceRetrievalSnapshot.chunksFromCandidates || 0) >= 1 &&
      Number(intelligenceRetrievalSnapshot.chunksWithReportArtifact || 0) >= 1 &&
      Number(intelligenceRetrievalSnapshot.tierOneChunks || 0) >= 1 &&
      intelligenceRetrievalSnapshot.activeCandidateAtomsMissingRetrievalChunks === 0 &&
      (intelligenceRetrievalSnapshot.latestLexicalProof || []).some(chunk =>
        chunk.candidateKey &&
        chunk.atomId &&
        chunk.minTier <= 1
      ),
    'RETRIEVAL-001 promotes real candidates into atom-backed lexical chunks with tier guard',
    `${intelligenceRetrievalSnapshot.totalChunks || 0} chunks / candidate-backed=${intelligenceRetrievalSnapshot.chunksFromCandidates || 0} / missing chunks=${intelligenceRetrievalSnapshot.activeCandidateAtomsMissingRetrievalChunks ?? 'missing'} / latest query=${intelligenceRetrievalSnapshot.latestLexicalProofQuery || 'missing'}`,
  )
  addCheck(
    checks,
    includesAll(foundationDbWithBacklogSeedSource, [
      "id: 'RETRIEVAL-002'",
      'pgvector is installed',
      'searchIntelligenceChunksSemantic',
      'selectRetrievalChunksForEmbedding',
      'upsertRetrievalChunkEmbedding',
      'buildRetrievalEmbeddingInput',
      'RETRIEVAL-003',
    ]) &&
      includesAll(intelligenceRetrievalSource, [
        'CREATE EXTENSION IF NOT EXISTS vector',
        'embedding vector(1536)',
        'USING hnsw (embedding vector_cosine_ops)',
        'semantic_proof',
        'selectRetrievalChunksForEmbedding',
        'upsertRetrievalChunkEmbedding',
        'searchIntelligenceChunksSemantic',
        'queryEmbedding is required',
        'chunk.embedding <=> $1::vector(1536)',
        'intelligence retrieval queries require maxTier >= 1',
      ]) &&
      includesAll(llmRouterSource, [
        'callEmbedding',
        OPENAI_EMBEDDINGS_ENDPOINT_PATTERN,
        "workload: 'embedding'",
        "encoding_format: 'float'",
        'dimensions',
      ]) &&
      packageSource.includes('"intelligence:semantic-proof"') &&
      includesAll(intelligenceSemanticRetrievalProofSource, [
        'callEmbedding',
        'selectRetrievalChunksForEmbedding',
        'upsertRetrievalChunkEmbedding',
        'searchIntelligenceChunksSemantic',
        'maxTier: 1',
        'tierGuardProof',
        'RETRIEVAL-002',
        'RETRIEVAL-003',
      ]) &&
      Number(intelligenceRetrievalSnapshot.chunksWithEmbeddings || 0) >= 1 &&
      Number(intelligenceRetrievalSnapshot.candidateAtomChunksWithEmbeddings || 0) >= 1 &&
      Number(intelligenceRetrievalSnapshot.tierOneChunksWithEmbeddings || 0) >= 1,
    'RETRIEVAL-002 stores pgvector embeddings and semantic search over real atom chunks',
    `${intelligenceRetrievalSnapshot.chunksWithEmbeddings || 0} embedded chunks / candidate-backed=${intelligenceRetrievalSnapshot.candidateAtomChunksWithEmbeddings || 0}`,
  )
  addCheck(
    checks,
    includesAll(foundationDbWithBacklogSeedSource, [
      "id: 'RETRIEVAL-003'",
      'Hybrid evidence search fuses lexical, semantic, and atom matches',
      'searchIntelligenceEvidenceHybrid',
      'SYNTHESIS-FACTS-001',
    ]) &&
      includesAll(intelligenceRetrievalSource, [
        'hybrid_proof',
        'searchIntelligenceEvidenceHybrid',
        'query is required for hybrid evidence retrieval',
        'queryEmbedding is required for hybrid evidence retrieval',
        'rrfScore',
        'lexicalResults.forEach',
        'semanticResults.forEach',
        'atomResults.forEach',
      ]) &&
      includesAll(serverSource, [
        "app.post('/api/intelligence/evidence', requireAdminToken",
        'searchIntelligenceEvidenceHybrid',
        'callEmbedding',
      ]) &&
      (serverSource.includes("backlogCardId: 'RETRIEVAL-003'") || serverSource.includes("backlogCardId: 'SECURITY-002'")) &&
      packageSource.includes('"intelligence:hybrid-proof"') &&
      includesAll(intelligenceHybridRetrievalProofSource, [
        'callEmbedding',
        'searchIntelligenceEvidenceHybrid',
        'hybrid_proof',
        'maxTier: 1',
        'tierGuardProof',
        'RETRIEVAL-003',
        'SYNTHESIS-FACTS-001',
      ]) &&
      intelligenceRetrievalSnapshot.latestHybridProofRun?.runType === 'hybrid_proof' &&
      Number(intelligenceRetrievalSnapshot.latestHybridProofRun?.searchResultCount || 0) >= 1 &&
      intelligenceRetrievalSnapshot.latestHybridProofRun?.maxTier <= 1,
    'RETRIEVAL-003 exposes governed hybrid evidence retrieval with tier guard',
    `${intelligenceRetrievalSnapshot.latestHybridProofRun?.searchResultCount || 0} hybrid proof results / query=${intelligenceRetrievalSnapshot.latestHybridProofRun?.searchQuery || 'missing'}`,
  )
  addCheck(
    checks,
    packageSource.includes('"intelligence:retrieval-eval"') &&
      includesAll(intelligenceRetrievalSource, [
        'retrieval_eval',
        'latestEvalRun',
        'latestSuccessfulEvalRun',
      ]) &&
      includesAll(intelligenceRetrievalEvalSource, [
        'searchIntelligenceChunks',
        'searchIntelligenceEvidenceHybrid',
        'requiredMatchedBy',
        'expectedAtomId',
        'retrieval_eval',
        'recordRetrievalRun',
        'callEmbedding',
      ]) &&
      retrievalEvalCases.length >= 20 &&
      retrievalEvalSources.size >= Number(intelligenceRetrievalEvalFixture.requiredDistinctSources || 3) &&
      retrievalEvalCases.every(item =>
        item.id &&
        item.query &&
        item.sourceId &&
        item.expectedAtomId &&
        Array.isArray(item.requiredMatchedBy) &&
        item.requiredMatchedBy.includes('lexical') &&
        item.requiredMatchedBy.includes('semantic') &&
        item.requiredMatchedBy.includes('atom')
      ) &&
      intelligenceRetrievalSnapshot.latestEvalRun?.runType === 'retrieval_eval' &&
      intelligenceRetrievalSnapshot.latestEvalRun?.status === 'succeeded' &&
      intelligenceRetrievalSnapshot.latestSuccessfulEvalRun?.runId === intelligenceRetrievalSnapshot.latestEvalRun?.runId &&
      intelligenceRetrievalSnapshot.latestEvalRun?.maxTier <= 1 &&
      latestRetrievalEvalMetadata.fixtureId === intelligenceRetrievalEvalFixture.id &&
      Number(latestRetrievalEvalMetadata.totalCases || 0) >= retrievalEvalCases.length &&
      Number(latestRetrievalEvalMetadata.passedCases || 0) >= retrievalEvalCases.length &&
      Number(latestRetrievalEvalMetadata.distinctSources || 0) >= retrievalEvalSources.size &&
      Array.isArray(latestRetrievalEvalMetadata.failedCases) &&
      latestRetrievalEvalMetadata.failedCases.length === 0,
    'retrieval eval baseline guards hybrid recall before Strategy Hub consumes evidence',
    `${latestRetrievalEvalMetadata.passedCases || 0}/${retrievalEvalCases.length} cases / sources=${latestRetrievalEvalMetadata.distinctSources || 0}`,
  )
  addCheck(
    checks,
    includesAll(foundationDbWithBacklogSeedSource, [
      'createIntelligenceSynthesisFactStore',
      'intelligenceSynthesisFactsSchemaSql',
      'intelligenceSynthesisFacts',
      "id: 'SYNTHESIS-FACTS-001'",
      'Source-backed synthesis fact ledger persists',
      "id: 'SYNTHESIS-ENGINE-001'",
    ]) &&
      includesAll(intelligenceSynthesisFactsSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_synthesis_fact_runs',
        'CREATE TABLE IF NOT EXISTS intelligence_synthesis_facts',
        'natural_key TEXT',
        'idx_intelligence_synthesis_facts_active_natural_key',
        'source_contract',
        'goal_truth',
        'operating_truth',
        'kpi_truth',
        'source_snapshot',
        'source_health',
        'retrieved_evidence',
        'collectSourceBackedSynthesisFacts',
        'buildSourceContractFacts',
        'buildGoalTruthFacts',
        'buildOperatingTruthFacts',
        'buildHybridEvidenceFacts',
        'synthesis fact queries require maxTier >= 1',
        'assertRegisteredSourceIds',
        'stale_after_synthesis_fact_refresh',
        'stale_fact_refs_after_synthesis_fact_refresh',
        'source_ids &&',
      ]) &&
      packageSource.includes('"intelligence:synthesis-facts-proof"') &&
      includesAll(intelligenceSynthesisFactsProofSource, [
        'callEmbedding',
        'collectSourceBackedSynthesisFacts',
        'upsertSynthesisFactsBundle',
        'source_fact_proof',
        'maxTier: 1',
        'SRC-STRATEGY-001',
        'SRC-FINANCE-001',
        'SRC-OWNERS-001',
        'SRC-FUB-001',
        'SRC-SUPABASE-001',
        'SRC-FREEDOM-BHAG-001',
        'SRC-MEETINGS-001',
        'SYNTHESIS-ENGINE-001',
        'querySynthesisFacts',
        'sourceOverlapProof',
      ]) &&
      synthesisFactsSnapshot.latestSourceFactProofRun?.runType === 'source_fact_proof' &&
      Number(synthesisFactsSnapshot.totalActiveFacts || 0) >= 20 &&
      Number(synthesisFactsSnapshot.factsWithEvidence || 0) >= 1 &&
      Number(synthesisFactsSnapshot.distinctSources || 0) >= 7 &&
      synthesisFactsSnapshot.activeFactsWithoutNaturalKey === 0 &&
      synthesisFactsSnapshot.duplicateActiveNaturalKeys === 0 &&
      Number(synthesisFactsSnapshot.secondarySourceFacts || 0) >= 1 &&
      ['source_contract', 'goal_truth', 'operating_truth', 'kpi_truth', 'source_snapshot', 'source_health', 'retrieved_evidence'].every(type => synthesisFactTypes.has(type)) &&
      ['SRC-STRATEGY-001', 'SRC-FINANCE-001', 'SRC-OWNERS-001', 'SRC-FUB-001', 'SRC-SUPABASE-001', 'SRC-FREEDOM-BHAG-001', 'SRC-MEETINGS-001'].every(sourceId => synthesisFactSources.has(sourceId)),
    'SYNTHESIS-FACTS-001 persists source-backed facts and hybrid evidence for governed synthesis',
    `${synthesisFactsSnapshot.totalActiveFacts || 0} facts / ${synthesisFactsSnapshot.distinctSources || 0} sources / evidence-backed=${synthesisFactsSnapshot.factsWithEvidence || 0} / duplicate-natural-keys=${synthesisFactsSnapshot.duplicateActiveNaturalKeys ?? 'missing'}`,
  )
  addCheck(
    checks,
    includesAll(foundationDbWithBacklogSeedSource, [
      'createIntelligenceSynthesisStore',
      'intelligenceSynthesisSchemaSql',
      'intelligenceSynthesis',
      "id: 'SYNTHESIS-ENGINE-001'",
      'Closed on 2026-04-27 after Steve accepted the repaired sample grain',
      "id: 'ACTION-ROUTER-001'",
    ]) &&
      includesAll(intelligenceSynthesisSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_synthesis_runs',
        'CREATE TABLE IF NOT EXISTS intelligence_synthesized_items',
        'natural_key TEXT',
        'synthesis_scope_key TEXT',
        'idx_intelligence_synthesized_items_active_natural_key',
        'fact_refs TEXT[]',
        'evidence_refs TEXT[]',
        'evidence_chunk_refs TEXT[]',
        'owner_confidence TEXT',
        'ownerDecisionForFact',
        'no_clear_owner_signal',
        'synthesized items require evidenceChunkRefs.',
        'intelligence synthesis queries require maxTier >= 1',
        'themeKeyForFact',
        'classifyCluster',
        'strategyHubEligible',
        'legacy_unclustered_replaced_by_clustered_synthesis',
        'Clarify where leads come from',
        'activeUnclusteredUnprotectedItems',
        'routeableUnclusteredItems',
        'humanSampleRowsForItems',
        'latestProofQuality',
        'rankingPolicy',
        'ordered-for-review-without-weighted-score',
        'stale_after_governed_synthesis_refresh',
        'runGovernedSynthesis',
        'getSynthesisEngineSnapshot',
      ]) &&
      packageSource.includes('"intelligence:synthesis-proof"') &&
      includesAll(intelligenceSynthesisProofSource, [
        'promoteSharedCommunicationCandidatesToAtoms',
        'DIVERSITY_SOURCE_ID',
        'SRC-GMAIL-001',
        'synthesisScopeKey',
        'collectSourceBackedSynthesisFacts',
        'upsertSynthesisFactsBundle',
        'runGovernedSynthesis',
        'factRefs',
        'evidenceRefs',
        'evidenceChunkRefs',
        'strategyEligibleItems',
        'strategySingleEvidenceItems',
        'SYNTHESIS HUMAN SAMPLE',
        'humanSampleRows',
        'activeSurfaceQuality',
        'routeableUnclusteredItems',
        'maxTier: 1',
        'STRATEGY_TITLE_JARGON_PATTERN',
      ]) &&
      synthesisEngineSnapshot.latestProofRun?.runType === 'governed_synthesis_proof' &&
      synthesisEngineSnapshot.latestProofRun?.runId &&
      synthesisActiveItems >= 1 &&
      synthesisEngineSnapshot.itemsWithFactRefs >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithEvidenceRefs >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithEvidenceChunkRefs >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithOwnerConfidence >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithActiveFactRefs >= synthesisRouteableActiveItems &&
      synthesisEngineSnapshot.itemsWithActiveEvidenceRefs >= synthesisRouteableActiveItems &&
      synthesisEngineSnapshot.itemsWithActiveEvidenceChunkRefs >= synthesisRouteableActiveItems &&
      synthesisEngineSnapshot.tierOneItems >= synthesisEngineSnapshot.activeItems &&
      Number(synthesisEngineSnapshot.distinctItemSources || 0) >= 2 &&
      synthesisEngineSnapshot.latestProofQuality?.activeItems >= 1 &&
      synthesisEngineSnapshot.latestProofQuality?.clusteredItems >= synthesisEngineSnapshot.latestProofQuality?.activeItems &&
      synthesisEngineSnapshot.latestProofQuality?.itemsWithThemeMetadata >= synthesisEngineSnapshot.latestProofQuality?.activeItems &&
      synthesisEngineSnapshot.latestProofQuality?.strategyEligibleItems >= 1 &&
      synthesisEngineSnapshot.latestProofQuality?.strategyItemsWithMultiEvidence >= synthesisEngineSnapshot.latestProofQuality?.strategyEligibleItems &&
      synthesisEngineSnapshot.latestProofQuality?.strategySingleEvidenceItems === 0 &&
      synthesisEngineSnapshot.latestProofQuality?.duplicateThemeKeys === 0 &&
      synthesisEngineSnapshot.latestProofQuality?.humanSampleRows >= 5 &&
      synthesisEngineSnapshot.activeClusteredItems >= synthesisEngineSnapshot.latestProofQuality?.activeItems &&
      synthesisEngineSnapshot.activeUnclusteredUnprotectedItems === 0 &&
      synthesisEngineSnapshot.routeableUnclusteredItems === 0 &&
      retrievalSourcesWithChunks >= 2,
    'SYNTHESIS-ENGINE-001 clusters and classifies synthesized items instead of atom-thread spam',
    `${synthesisActiveItems} active items / ${synthesisRouteableActiveItems} routeable active items / latestProofQuality=${JSON.stringify(synthesisEngineSnapshot.latestProofQuality || {})} / latestProof=${synthesisEngineSnapshot.latestProofRun?.runId || 'missing'}`,
  )
  addCheck(
    checks,
    includesAll(foundationDbSource, [
      'createIntelligenceActionRouterStore',
      'intelligenceActionRouterSchemaSql',
      'intelligenceActionRouter',
      'proposeActionRoutes',
      'getActionRoute',
      'getActionRouterSnapshot',
    ]) &&
      includesAll(intelligenceActionRouterSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_action_router_runs',
        'CREATE TABLE IF NOT EXISTS intelligence_action_routes',
        'approval_required BOOLEAN NOT NULL DEFAULT TRUE',
        'approval_status TEXT NOT NULL DEFAULT',
        'human_required_before_destination_write',
        'needs-owner-decision',
        'applyApprovedActionRoute',
        'Action route approval requires an explicit human approver.',
        'destination_table TEXT NOT NULL',
        'fact_refs TEXT[]',
        'evidence_refs TEXT[]',
        'evidence_chunk_refs TEXT[]',
        'intelligence action router requires maxTier >= 1',
        'routes_with_active_synthesized_items',
        'applied_routes_with_destination_record',
        "approval_status = 'rejected'",
        "routing_status = 'ignored'",
        'rejected_by_human_review',
        'strategyHubEligible',
        'reviewSurface',
        'synthesizedItemAttributes',
        'routeScopeFilter',
        "attributes->>'synthesisQuality'",
        "metadata->>'legacySynthesisProtected'",
        "COALESCE(item.attributes->>'legacySynthesisProtected', item.metadata->>'legacySynthesisProtected', 'false') != 'true'",
        'itemsVisibleToRouter',
        'strategyItemsVisibleToRouter',
        'strategyRoutes',
      ]) &&
      includesAll(packageSource, [
        '"intelligence:synthesis-refresh"',
        '"intelligence:action-router-proof"',
        '"intelligence:action-router-proposals"',
        '"intelligence:action-router-apply"',
      ]) &&
      includesAll(foundationJobsSource, [
        'intelligence-synthesis-spine-refresh',
        "args: ['run', 'intelligence:synthesis-refresh']",
        'intelligence-action-router-proposals',
        "args: ['run', 'intelligence:action-router-proposals']",
        'human-approval-required routes',
      ]) &&
      includesAll(intelligenceActionRouterProofSource, [
        'proposeActionRoutes',
        'getActionRouterSnapshot',
        'backlog_items',
        'decisions',
        'open_questions',
        'intelligence_synthesized_items',
        'routesWithSourceProvenance',
        'routesRequiringApproval',
        'ACTION-ROUTER-001',
        'STRATEGY-004',
      ]) &&
      actionRouterSnapshot.latestProofRun?.runType === 'router_proof' &&
      Number(actionRouterSnapshot.totalRoutes || 0) >= 1 &&
      actionRouterSnapshot.routesWithSourceProvenance >= actionRouterSnapshot.totalRoutes &&
      actionRouterSnapshot.routesWithOwner >= actionRouterSnapshot.totalRoutes &&
      actionRouterSnapshot.routesRequiringApproval >= actionRouterSnapshot.totalRoutes &&
      actionRouterSnapshot.tierOneRoutes >= actionRouterSnapshot.totalRoutes &&
      actionRouterSnapshot.routesWithActiveSynthesizedItems >= actionRouterSnapshot.guardedRoutes &&
      actionRouterSnapshot.routesWithActiveFactRefs >= actionRouterSnapshot.guardedRoutes &&
      actionRouterSnapshot.routesWithActiveEvidenceRefs >= actionRouterSnapshot.guardedRoutes &&
      actionRouterSnapshot.routesWithActiveEvidenceChunkRefs >= actionRouterSnapshot.guardedRoutes &&
      Number(actionRouterSnapshot.appliedRoutes || 0) >= 1 &&
      actionRouterSnapshot.appliedRoutesWithDestinationRecord >= actionRouterSnapshot.appliedRoutesChecked &&
      actionRouterSnapshot.itemsVisibleToRouter === actionRouterSnapshot.activeClusteredItems &&
      (Number(actionRouterSnapshot.strategyItemsVisibleToRouter || 0) >= 1 || Number(actionRouterSnapshot.strategyRoutes || 0) >= 1) &&
      actionRouterSnapshot.unclusteredItemsVisibleToRouter === 0 &&
      actionRouterSnapshot.legacyProtectedItemsVisibleToRouter === 0 &&
      ['backlog_items', 'decisions', 'open_questions', 'intelligence_synthesized_items'].every(destinationTable =>
        (actionRouterSnapshot.routesByDestination || []).some(row => row.destinationTable === destinationTable && row.count >= 1)
      ),
    'ACTION-ROUTER-001 creates approval-gated routes with owner and provenance before Strategy Hub resumes',
    `${actionRouterSnapshot.totalRoutes || 0} routes / pending=${actionRouterSnapshot.pendingRoutes || 0} / applied=${actionRouterSnapshot.appliedRoutes || 0} / strategyRoutes=${actionRouterSnapshot.strategyRoutes || 0} / routerVisible=${actionRouterSnapshot.itemsVisibleToRouter || 0}/${actionRouterSnapshot.activeClusteredItems || 0} / strategyVisible=${actionRouterSnapshot.strategyItemsVisibleToRouter || 0} / latestProof=${actionRouterSnapshot.latestProofRun?.runId || 'missing'}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summary(checks),
  }
}

function healthyInput() {
  const sourceIds = ['SRC-STRATEGY-001', 'SRC-FINANCE-001', 'SRC-OWNERS-001', 'SRC-FUB-001', 'SRC-SUPABASE-001', 'SRC-FREEDOM-BHAG-001', 'SRC-MEETINGS-001']
  const joinedSourceIds = sourceIds.join('\n')
  return {
    foundationDbSource: [
      'CREATE TABLE IF NOT EXISTS intelligence_job_runs',
      'CREATE TABLE IF NOT EXISTS intelligence_job_llm_calls',
      'source_id TEXT cursor_state JSONB budget JSONB model TEXT provider TEXT auth_path TEXT cost_usd NUMERIC item_counts JSONB failure_count INTEGER output_artifact_ids TEXT[] next_run_state JSONB',
      'upsertIntelligenceJobRun getIntelligenceJobLedgerSnapshot',
      'createIntelligenceAtomStore intelligenceAtomSchemaSql getRegisteredSourceContractIds intelligenceAtomSpine',
      'upsertIntelligenceReportArtifact upsertIntelligenceAtom recordIntelligenceAtomHit queryIntelligenceAtomsForScoper getIntelligenceAtomSpineSnapshot',
      'createIntelligenceRetrievalStore intelligenceRetrievalSchemaSql intelligenceRetrieval',
      "id: 'RETRIEVAL-001' Done v1 on 2026-04-27 id: 'RETRIEVAL-002' SYNTHESIS-ENGINE-001",
      "id: 'RETRIEVAL-002' pgvector is installed searchIntelligenceChunksSemantic selectRetrievalChunksForEmbedding upsertRetrievalChunkEmbedding buildRetrievalEmbeddingInput RETRIEVAL-003",
      "id: 'RETRIEVAL-003' Hybrid evidence search fuses lexical, semantic, and atom matches searchIntelligenceEvidenceHybrid SYNTHESIS-FACTS-001",
      'createIntelligenceSynthesisFactStore intelligenceSynthesisFactsSchemaSql intelligenceSynthesisFacts',
      "id: 'SYNTHESIS-FACTS-001' Source-backed synthesis fact ledger persists id: 'SYNTHESIS-ENGINE-001'",
      'createIntelligenceSynthesisStore intelligenceSynthesisSchemaSql intelligenceSynthesis',
      "id: 'SYNTHESIS-ENGINE-001' Closed on 2026-04-27 after Steve accepted the repaired sample grain id: 'ACTION-ROUTER-001'",
      'createIntelligenceActionRouterStore intelligenceActionRouterSchemaSql intelligenceActionRouter proposeActionRoutes getActionRoute getActionRouterSnapshot',
      "id: 'REPORT-MINING-001' lane: 'done' Accepted on 2026-04-27 in `docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md` id: 'INTEL-ATOM-001' Done v1 on 2026-04-27 direct Scoper query fields",
    ].join('\n'),
    extractionTargetSource: 'upsertIntelligenceJobRun recordExtractionIntelligenceJob scripts/run-extraction-target.mjs intel-extraction: source_crawl_target_runs',
    intelligenceJobProofSource: 'INTEL-JOBS-001 source_crawl_target_runs upsertIntelligenceJobRun getIntelligenceJobLedgerSnapshot',
    intelligenceJobLedgerSnapshot: {
      totalRuns: 1,
      recentRuns: [
        {
          jobId: 'intel-extraction:dogfood',
          sourceId: 'SRC-GMAIL-001',
          sourceCrawlRunId: 'crawl-dogfood',
          provenance: { caller: 'scripts/run-extraction-target.mjs', backlogCardId: 'INTEL-JOBS-001' },
          nextRunState: { targetKey: 'dogfood-target' },
          itemCounts: { inspected: 1 },
        },
      ],
    },
    intelligenceSalvageSpecSource: 'Status: Accepted build gate Report Shapes To Preserve Old Atom Fields To Preserve Governed Report Artifact Contract Required Changes To INTEL-ATOM-001 A Scoper must query atoms/retrieval directly before producing scoped work `candidate_key` when promoted from extracted candidates `input_candidate_keys`',
    strategyHubManifestSource: '`REPORT-MINING-001` - accepted old-system Director/Scoper/Gold Library/report-shape salvage gate\n`INTEL-ATOM-001` - done v1: durable source-backed memory atoms plus governed report artifacts and direct Scoper query contract',
    currentPlan: '`INTEL-JOBS-001` -> `REPORT-MINING-001` -> `INTEL-ATOM-001` -> `RETRIEVAL-001` intelligence_report_artifacts intelligence_atoms intelligence_atom_hits `INTEL-ATOM-001` done as the v1 report/atom substrate old-system report-shape salvage',
    intelligencePipelineSource: 'department intelligence briefs as governed report artifacts hub Scopers that query atoms/retrieval directly The anti-pattern is: Director summarizes research old-system report-shape salvage gate',
    intelligenceAtomsSource: 'CREATE TABLE IF NOT EXISTS intelligence_report_artifacts CREATE TABLE IF NOT EXISTS intelligence_atoms CREATE TABLE IF NOT EXISTS intelligence_atom_hits source_id TEXT NOT NULL report_artifact_id TEXT dedup_hash TEXT NOT NULL min_tier INTEGER NOT NULL DEFAULT 1 assertRegisteredSourceIds SELECT pg_advisory_xact_lock(hashtext($1)) WHERE dedup_hash = $1 requestedAtomId queryIntelligenceAtomsForScoper requires maxTier >= 1 ON intelligence_atoms(dedup_hash) upsertIntelligenceReportArtifact upsertIntelligenceAtom recordIntelligenceAtomHit queryIntelligenceAtomsForScoper getIntelligenceAtomSpineSnapshot',
    packageSource: '"intelligence:jobs-proof" "intelligence:atoms-proof" "intelligence:retrieval-proof" "intelligence:semantic-proof" "intelligence:hybrid-proof" "intelligence:retrieval-eval" "intelligence:synthesis-facts-proof" "intelligence:synthesis-proof" "intelligence:synthesis-refresh" "intelligence:action-router-proof" "intelligence:action-router-proposals" "intelligence:action-router-apply"',
    intelligenceAtomProofSource: 'INTEL-ATOM-001 REPORT-MINING-001 upsertIntelligenceReportArtifact upsertIntelligenceAtom recordIntelligenceAtomHit queryIntelligenceAtomsForScoper getIntelligenceAtomSpineSnapshot duplicateAtomProof Duplicate atom proof did not merge on dedup_hash tierGuardProof explicit maxTier',
    intelligenceAtomSpineSnapshot: { totalReports: 1, totalAtoms: 1, totalHits: 1, atomsWithReportArtifact: 1, atomsWithScoperQueryFields: 1, latestScoperQueryProof: [{ reportArtifactId: 'recent-non-intel', metricRefs: ['SOURCE-MATURITY-ATOM'], minTier: 1 }], intelAtomScoperQueryProof: [{ reportArtifactId: 'r1', metricRefs: ['INTEL-ATOM-001'], minTier: 1 }] },
    intelligenceRetrievalSource: 'CREATE TABLE IF NOT EXISTS intelligence_retrieval_runs CREATE TABLE IF NOT EXISTS intelligence_retrieval_chunks search_vector TSVECTOR NOT NULL USING GIN(search_vector) promoteSharedCommunicationCandidatesToAtoms searchIntelligenceChunks intelligence retrieval queries require maxTier >= 1 FROM shared_communication_candidates c JOIN shared_communication_artifacts artifact NOT EXISTS ( FROM intelligence_retrieval_chunks chunk chunk.candidate_key = c.candidate_key chunk.atom_id IS NOT NULL upsertIntelligenceAtom recordIntelligenceAtomHit CREATE EXTENSION IF NOT EXISTS vector embedding vector(1536) USING hnsw (embedding vector_cosine_ops) semantic_proof selectRetrievalChunksForEmbedding upsertRetrievalChunkEmbedding searchIntelligenceChunksSemantic queryEmbedding is required chunk.embedding <=> $1::vector(1536) hybrid_proof searchIntelligenceEvidenceHybrid query is required for hybrid evidence retrieval queryEmbedding is required for hybrid evidence retrieval rrfScore lexicalResults.forEach semanticResults.forEach atomResults.forEach retrieval_eval latestEvalRun latestSuccessfulEvalRun',
    intelligenceRetrievalProofSource: 'promoteSharedCommunicationCandidatesToAtoms searchIntelligenceChunks maxTier: 1 tierGuardProof RETRIEVAL-001 RETRIEVAL-002',
    intelligenceRetrievalSnapshot: {
      totalChunks: 1,
      activeChunks: 1,
      chunksWithAtoms: 1,
      chunksFromCandidates: 1,
      chunksWithReportArtifact: 1,
      tierOneChunks: 1,
      activeCandidateAtomsMissingRetrievalChunks: 0,
      latestLexicalProof: [{ candidateKey: 'c1', atomId: 'a1', minTier: 1 }],
      latestLexicalProofQuery: 'dogfood',
      chunksWithEmbeddings: 1,
      candidateAtomChunksWithEmbeddings: 1,
      tierOneChunksWithEmbeddings: 1,
      latestHybridProofRun: { runType: 'hybrid_proof', searchResultCount: 1, maxTier: 1, searchQuery: 'dogfood' },
      latestEvalRun: { runType: 'retrieval_eval', status: 'succeeded', runId: 'eval-1', maxTier: 1, metadata: { fixtureId: 'fixture-1', totalCases: 20, passedCases: 20, distinctSources: 3, failedCases: [] } },
      latestSuccessfulEvalRun: { runId: 'eval-1' },
      bySource: [{ count: 1 }, { count: 1 }],
    },
    llmRouterSource: `callEmbedding ${OPENAI_EMBEDDINGS_ENDPOINT_PATTERN} workload: 'embedding' encoding_format: 'float' dimensions`,
    intelligenceSemanticRetrievalProofSource: 'callEmbedding selectRetrievalChunksForEmbedding upsertRetrievalChunkEmbedding searchIntelligenceChunksSemantic maxTier: 1 tierGuardProof RETRIEVAL-002 RETRIEVAL-003',
    intelligenceHybridRetrievalProofSource: 'callEmbedding searchIntelligenceEvidenceHybrid hybrid_proof maxTier: 1 tierGuardProof RETRIEVAL-003 SYNTHESIS-FACTS-001',
    serverSource: "app.post('/api/intelligence/evidence', requireAdminToken searchIntelligenceEvidenceHybrid callEmbedding backlogCardId: 'RETRIEVAL-003'",
    intelligenceRetrievalEvalSource: 'searchIntelligenceChunks searchIntelligenceEvidenceHybrid requiredMatchedBy expectedAtomId retrieval_eval recordRetrievalRun callEmbedding',
    intelligenceRetrievalEvalFixture: { id: 'fixture-1', requiredDistinctSources: 3, cases: Array.from({ length: 20 }, (_, index) => ({ id: `case-${index}`, query: 'q', sourceId: `SRC-${index % 3}`, expectedAtomId: `atom-${index}`, requiredMatchedBy: ['lexical', 'semantic', 'atom'] })) },
    intelligenceSynthesisFactsSource: 'CREATE TABLE IF NOT EXISTS intelligence_synthesis_fact_runs CREATE TABLE IF NOT EXISTS intelligence_synthesis_facts natural_key TEXT idx_intelligence_synthesis_facts_active_natural_key source_contract goal_truth operating_truth kpi_truth source_snapshot source_health retrieved_evidence collectSourceBackedSynthesisFacts buildSourceContractFacts buildGoalTruthFacts buildOperatingTruthFacts buildHybridEvidenceFacts synthesis fact queries require maxTier >= 1 assertRegisteredSourceIds stale_after_synthesis_fact_refresh stale_fact_refs_after_synthesis_fact_refresh source_ids &&',
    intelligenceSynthesisFactsProofSource: `callEmbedding collectSourceBackedSynthesisFacts upsertSynthesisFactsBundle source_fact_proof maxTier: 1 ${joinedSourceIds} SYNTHESIS-ENGINE-001 querySynthesisFacts sourceOverlapProof`,
    synthesisFactsSnapshot: { latestSourceFactProofRun: { runType: 'source_fact_proof' }, totalActiveFacts: 20, factsWithEvidence: 1, distinctSources: 7, activeFactsWithoutNaturalKey: 0, duplicateActiveNaturalKeys: 0, secondarySourceFacts: 1, factsByType: ['source_contract', 'goal_truth', 'operating_truth', 'kpi_truth', 'source_snapshot', 'source_health', 'retrieved_evidence'].map(factType => ({ factType })), factsBySource: sourceIds.map(sourceId => ({ sourceId })) },
    intelligenceSynthesisSource: 'CREATE TABLE IF NOT EXISTS intelligence_synthesis_runs CREATE TABLE IF NOT EXISTS intelligence_synthesized_items natural_key TEXT synthesis_scope_key TEXT idx_intelligence_synthesized_items_active_natural_key fact_refs TEXT[] evidence_refs TEXT[] evidence_chunk_refs TEXT[] owner_confidence TEXT ownerDecisionForFact no_clear_owner_signal synthesized items require evidenceChunkRefs. intelligence synthesis queries require maxTier >= 1 themeKeyForFact classifyCluster strategyHubEligible legacy_unclustered_replaced_by_clustered_synthesis Clarify where leads come from activeUnclusteredUnprotectedItems routeableUnclusteredItems humanSampleRowsForItems latestProofQuality rankingPolicy ordered-for-review-without-weighted-score stale_after_governed_synthesis_refresh runGovernedSynthesis getSynthesisEngineSnapshot',
    intelligenceSynthesisProofSource: 'promoteSharedCommunicationCandidatesToAtoms DIVERSITY_SOURCE_ID SRC-GMAIL-001 synthesisScopeKey collectSourceBackedSynthesisFacts upsertSynthesisFactsBundle runGovernedSynthesis factRefs evidenceRefs evidenceChunkRefs strategyEligibleItems strategySingleEvidenceItems SYNTHESIS HUMAN SAMPLE humanSampleRows activeSurfaceQuality routeableUnclusteredItems maxTier: 1 STRATEGY_TITLE_JARGON_PATTERN',
    synthesisEngineSnapshot: { latestProofRun: { runType: 'governed_synthesis_proof', runId: 'synth-1' }, activeItems: 1, itemsWithFactRefs: 1, itemsWithEvidenceRefs: 1, itemsWithEvidenceChunkRefs: 1, itemsWithOwnerConfidence: 1, itemsWithActiveFactRefs: 1, itemsWithActiveEvidenceRefs: 1, itemsWithActiveEvidenceChunkRefs: 1, tierOneItems: 1, distinctItemSources: 2, latestProofQuality: { activeItems: 1, clusteredItems: 1, itemsWithThemeMetadata: 1, strategyEligibleItems: 1, strategyItemsWithMultiEvidence: 1, strategySingleEvidenceItems: 0, duplicateThemeKeys: 0, humanSampleRows: 5 }, activeClusteredItems: 1, activeUnclusteredUnprotectedItems: 0, routeableUnclusteredItems: 0 },
    intelligenceActionRouterSource: "CREATE TABLE IF NOT EXISTS intelligence_action_router_runs CREATE TABLE IF NOT EXISTS intelligence_action_routes approval_required BOOLEAN NOT NULL DEFAULT TRUE approval_status TEXT NOT NULL DEFAULT human_required_before_destination_write needs-owner-decision applyApprovedActionRoute Action route approval requires an explicit human approver. destination_table TEXT NOT NULL fact_refs TEXT[] evidence_refs TEXT[] evidence_chunk_refs TEXT[] intelligence action router requires maxTier >= 1 routes_with_active_synthesized_items applied_routes_with_destination_record approval_status = 'rejected' routing_status = 'ignored' rejected_by_human_review strategyHubEligible reviewSurface synthesizedItemAttributes routeScopeFilter attributes->>'synthesisQuality' metadata->>'legacySynthesisProtected' COALESCE(item.attributes->>'legacySynthesisProtected', item.metadata->>'legacySynthesisProtected', 'false') != 'true' itemsVisibleToRouter strategyItemsVisibleToRouter strategyRoutes",
    foundationJobsSource: "intelligence-synthesis-spine-refresh args: ['run', 'intelligence:synthesis-refresh'] intelligence-action-router-proposals args: ['run', 'intelligence:action-router-proposals'] human-approval-required routes",
    intelligenceActionRouterProofSource: 'proposeActionRoutes getActionRouterSnapshot backlog_items decisions open_questions intelligence_synthesized_items routesWithSourceProvenance routesRequiringApproval ACTION-ROUTER-001 STRATEGY-004',
    actionRouterSnapshot: { latestProofRun: { runType: 'router_proof', runId: 'router-1' }, totalRoutes: 4, routesWithSourceProvenance: 4, routesWithOwner: 4, routesRequiringApproval: 4, tierOneRoutes: 4, guardedRoutes: 4, routesWithActiveSynthesizedItems: 4, routesWithActiveFactRefs: 4, routesWithActiveEvidenceRefs: 4, routesWithActiveEvidenceChunkRefs: 4, appliedRoutes: 1, appliedRoutesChecked: 1, appliedRoutesWithDestinationRecord: 1, itemsVisibleToRouter: 1, activeClusteredItems: 1, strategyItemsVisibleToRouter: 1, strategyRoutes: 1, unclusteredItemsVisibleToRouter: 0, legacyProtectedItemsVisibleToRouter: 0, routesByDestination: ['backlog_items', 'decisions', 'open_questions', 'intelligence_synthesized_items'].map(destinationTable => ({ destinationTable, count: 1 })) },
  }
}

export function buildFoundationIntelligenceSpineVerifierDogfoodProof() {
  const healthy = evaluateFoundationIntelligenceSpineVerifier(healthyInput())
  const missingLedger = evaluateFoundationIntelligenceSpineVerifier({
    ...healthyInput(),
    intelligenceJobLedgerSnapshot: { totalRuns: 0, recentRuns: [] },
  })
  const missingTierGuard = evaluateFoundationIntelligenceSpineVerifier({
    ...healthyInput(),
    intelligenceRetrievalSource: healthyInput().intelligenceRetrievalSource.replaceAll('intelligence retrieval queries require maxTier >= 1', ''),
  })
  const missingApprovalGate = evaluateFoundationIntelligenceSpineVerifier({
    ...healthyInput(),
    intelligenceActionRouterSource: healthyInput().intelligenceActionRouterSource.replace('approval_required BOOLEAN NOT NULL DEFAULT TRUE', ''),
  })
  const missingSynthesisEvidence = evaluateFoundationIntelligenceSpineVerifier({
    ...healthyInput(),
    synthesisEngineSnapshot: {
      ...healthyInput().synthesisEngineSnapshot,
      itemsWithEvidenceChunkRefs: 0,
    },
  })

  return {
    ok: healthy.ok === true &&
      missingLedger.ok === false &&
      missingTierGuard.ok === false &&
      missingApprovalGate.ok === false &&
      missingSynthesisEvidence.ok === false,
    healthy,
    rejected: {
      missingLedger,
      missingTierGuard,
      missingApprovalGate,
      missingSynthesisEvidence,
    },
    dogfoodInvariant: 'The intelligence spine verifier accepts healthy schema/proof/snapshot state and rejects missing job ledger proof, missing retrieval tier guard, missing router approval gate, and synthesis evidence gaps.',
  }
}

export async function evaluateFoundationIntelligenceSpineVerifierOrchestration(input = {}) {
  const {
    activeFoundationSprint = { sprint: null, items: [] },
    currentPlan = '',
    currentState = '',
    foundationBuildCloseouts = [],
    foundationIntelligenceSpineVerifierSource = '',
    foundationVerifyRootSource = '',
    packageJson = {},
    repoFileExists = async () => false,
    verifierIntelligenceSpineSplitModuleScriptSource = '',
    verifierIntelligenceSpineSplitModulePlanSource = '',
  } = input
  const checks = []
  const intelligenceSpineVerifier = evaluateFoundationIntelligenceSpineVerifier(input)
  checks.push(...intelligenceSpineVerifier.checks)
  const intelligenceSpineDogfood = buildFoundationIntelligenceSpineVerifierDogfoodProof()
  const backlogItems = input.foundationHub?.backlogItems || []
  const item = id => backlogItems.find(backlogItem => backlogItem.id === id) || null
  const activeSprintItem = id =>
    (activeFoundationSprint.items || [])
      .map(sprintItem => sprintItem.backlog)
      .find(backlogItem => backlogItem?.id === id) || null
  const foundationVerifyLineCount = String(foundationVerifyRootSource || '').split('\n').length
  const verifierIntelligenceSpineSplitModuleCard =
    item(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID) ||
    activeSprintItem(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID)
  const verifierIntelligenceSpineSplitModuleCloseout =
    foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierIntelligenceSpineSplitModuleClosed = verifierIntelligenceSpineSplitModuleCard?.lane === 'done'
  const intelligenceSpineOldInlinePatterns = [
    new RegExp("addCheck\\(\\s*checks,[\\s\\S]{0,1200}'INTEL-JOBS-001 intelligence job ledger is schema-backed and wired into governed " + "extraction'"),
    new RegExp("addCheck\\(\\s*checks,[\\s\\S]{0,1200}'ACTION-ROUTER-001 creates approval-gated routes with owner and provenance before Strategy Hub " + "resumes'"),
  ]
  const intelligenceSpineOrchestrationOldRootPatterns = [
    'const intelligenceSpineVerifier = evaluateFoundationIntelligenceSpineVerifier({',
    'const verifierIntelligenceSpineSplitModuleCard =',
    'const verifierIntelligenceSpineSplitModuleDogfood = buildFoundationIntelligenceSpineVerifierDogfoodProof()',
  ]

  addCheck(
    checks,
    verifierIntelligenceSpineSplitModuleCard &&
      ['executing', 'done'].includes(verifierIntelligenceSpineSplitModuleCard.lane) &&
      (!verifierIntelligenceSpineSplitModuleClosed || (
        String(verifierIntelligenceSpineSplitModuleCard.statusNote || '').includes(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY) &&
        verifierIntelligenceSpineSplitModuleCloseout?.operatorCloseout === true &&
        (verifierIntelligenceSpineSplitModuleCloseout.backlogIds || []).includes(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-verifier-intelligence-spine-split-module-closeout.md')
      )) &&
      intelligenceSpineDogfood.ok === true &&
      intelligenceSpineVerifier.summary.passed === intelligenceSpineVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-intelligence-spine-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_APPROVAL_PATH) &&
      foundationIntelligenceSpineVerifierSource.includes('evaluateFoundationIntelligenceSpineVerifier') &&
      foundationIntelligenceSpineVerifierSource.includes('buildFoundationIntelligenceSpineVerifierDogfoodProof') &&
      verifierIntelligenceSpineSplitModuleScriptSource.includes('dogfood rejects intelligence-spine verifier failures') &&
      verifierIntelligenceSpineSplitModulePlanSource.includes('Dogfood proof recreates the failure class') &&
      foundationVerifyRootSource.includes('evaluateFoundationIntelligenceSpineVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('intelligenceSpineOrchestrationVerifier.checks') &&
      intelligenceSpineOldInlinePatterns.every(pattern => !pattern.test(foundationVerifyRootSource)) &&
      currentPlan.includes(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SPRINT_ID ||
        verifierIntelligenceSpineSplitModuleClosed) &&
      foundationIntelligenceSpineVerifierSource.includes(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID),
    'VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001 extracts intelligence spine verifier checks into a focused module',
    verifierIntelligenceSpineSplitModuleCard
      ? `lane=${verifierIntelligenceSpineSplitModuleCard.lane} dogfood=${intelligenceSpineDogfood.ok ? 'pass' : 'blocked'} spineChecks=${intelligenceSpineVerifier.summary.passed}/${intelligenceSpineVerifier.summary.total} lines=${VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID}`,
  )

  const verifierIntelligenceSpineOrchestrationCard =
    item(VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CARD_ID) ||
    activeSprintItem(VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CARD_ID)
  const verifierIntelligenceSpineOrchestrationCloseout =
    foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  addCheck(
    checks,
    verifierIntelligenceSpineOrchestrationCard &&
      ['executing', 'done'].includes(verifierIntelligenceSpineOrchestrationCard.lane) &&
      String(verifierIntelligenceSpineOrchestrationCard.statusNote || '').includes(VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
      verifierIntelligenceSpineOrchestrationCloseout?.operatorCloseout === true &&
      (verifierIntelligenceSpineOrchestrationCloseout.backlogIds || []).includes(VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CARD_ID) &&
      intelligenceSpineDogfood.ok === true &&
      intelligenceSpineVerifier.summary.passed === intelligenceSpineVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-intelligence-spine-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_HANDOFF_PATH) &&
      foundationIntelligenceSpineVerifierSource.includes('evaluateFoundationIntelligenceSpineVerifierOrchestration') &&
      foundationVerifyRootSource.includes('evaluateFoundationIntelligenceSpineVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('intelligenceSpineOrchestrationVerifier.checks') &&
      intelligenceSpineOrchestrationOldRootPatterns.every(pattern => !foundationVerifyRootSource.includes(pattern)) &&
      foundationVerifyLineCount < VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_BEFORE_LINES,
    'VERIFIER-INTELLIGENCE-SPINE-ORCHESTRATION-SPLIT-001 moves intelligence spine orchestration into the focused module',
    verifierIntelligenceSpineOrchestrationCard
      ? `lane=${verifierIntelligenceSpineOrchestrationCard.lane} dogfood=${intelligenceSpineDogfood.ok ? 'pass' : 'blocked'} spineChecks=${intelligenceSpineVerifier.summary.passed}/${intelligenceSpineVerifier.summary.total} lines=${VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    intelligenceSpineVerifier,
    dogfood: intelligenceSpineDogfood,
  }
}
