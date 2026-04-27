#!/usr/bin/env node

import {
  closeFoundationDb,
  getIntelligenceRetrievalSnapshot,
  initFoundationDb,
  recordRetrievalRun,
  searchIntelligenceEvidenceHybrid,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import { callEmbedding } from '../lib/llm-router.js'

const EMBEDDING_DIMENSIONS = 1536

function pickHybridQuery(snapshot) {
  return snapshot.latestLexicalProofQuery || 'Steve rebuilding system'
}

async function main() {
  await initFoundationDb()

  const snapshot = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  if (snapshot.chunksFromCandidates < 1 || snapshot.chunksWithAtoms < 1 || snapshot.candidateAtomChunksWithEmbeddings < 1) {
    throw new Error('RETRIEVAL-003 requires candidate-backed lexical and semantic retrieval chunks.')
  }

  const query = pickHybridQuery(snapshot)
  const queryEmbeddingResult = await callEmbedding({
    input: query,
    dimensions: EMBEDDING_DIMENSIONS,
    metadata: {
      backlogCardId: 'RETRIEVAL-003',
      purpose: 'hybrid_query_proof',
      query,
    },
  })

  const evidence = await searchIntelligenceEvidenceHybrid({
    query,
    queryEmbedding: queryEmbeddingResult.embeddings[0],
    maxTier: 1,
    limit: 10,
  })

  const fusedProof = evidence.results.find(result =>
    result.candidateKey &&
    result.atomId &&
    result.minTier <= 1 &&
    result.matchedBy.includes('lexical') &&
    result.matchedBy.includes('semantic') &&
    result.matchedBy.includes('atom')
  )

  if (!fusedProof) {
    throw new Error(`RETRIEVAL-003 hybrid search did not return a lexical+semantic+atom fused result for query "${query}".`)
  }

  let tierGuardProof = false
  try {
    await searchIntelligenceEvidenceHybrid({
      query,
      queryEmbedding: queryEmbeddingResult.embeddings[0],
      limit: 1,
    })
  } catch (error) {
    tierGuardProof = /maxTier/.test(error instanceof Error ? error.message : String(error))
  }

  if (!tierGuardProof) {
    throw new Error('RETRIEVAL-003 hybrid search did not enforce explicit maxTier.')
  }

  const proofRun = await recordRetrievalRun({
    runId: `retrieval-hybrid-proof-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    runType: 'hybrid_proof',
    status: 'succeeded',
    requestedBy: 'hybrid-retrieval-proof',
    sourceIds: Array.from(new Set(evidence.results.map(result => result.sourceId).filter(Boolean))),
    searchQuery: query,
    searchResultCount: evidence.resultCount,
    maxTier: 1,
    metadata: {
      backlogCardId: 'RETRIEVAL-003',
      proofCommand: 'npm run intelligence:hybrid-proof',
      tierGuardProof,
      laneCounts: evidence.laneCounts,
      firstEvidenceId: evidence.results[0]?.evidenceId || null,
      fusedEvidenceId: fusedProof.evidenceId,
      queryEmbeddingCallId: queryEmbeddingResult.call.callId,
    },
  }, 'hybrid-retrieval-proof')

  const updatedHybridCard = await updateBacklogItem('RETRIEVAL-003', {
    lane: 'done',
    summary: 'Combine lexical search, semantic vector search, direct atom search, source filters, and sensitivity/tier rules into one evidence API for synthesis and future chat recall.',
    nextAction: 'Keep RETRIEVAL-003 closed and stable as the governed hybrid evidence API. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; run retrieval eval before major retrieval/synthesis changes.',
    statusNote: 'Done v1 on 2026-04-27. Hybrid evidence search fuses lexical, semantic, and atom matches with explicit maxTier and source-backed result payloads. Retrieval eval baseline now guards 20 expected matches across Gmail, Meetings, and Missive.',
  }, 'hybrid-retrieval-proof')

  const updatedFactsCard = await updateBacklogItem('SYNTHESIS-FACTS-001', {
    lane: 'done',
    nextAction: 'Keep SYNTHESIS-FACTS-001 closed and stable as the source-backed fact ledger for synthesis and Strategy Hub v2. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; no advisor chat or recommendation surface.',
    statusNote: 'Done v1 on 2026-04-27. Source-backed synthesis fact ledger persists strategy/source-contract, goal, operating, KPI, source-snapshot, source-health, and retrieved-evidence facts with maxTier, stable natural keys, stale-run archival, and source-overlap filtering.',
  }, 'hybrid-retrieval-proof')

  console.log(JSON.stringify({
    evidence: {
      query,
      resultCount: evidence.resultCount,
      laneCounts: evidence.laneCounts,
      firstResult: evidence.results[0] || null,
      fusedProof,
      tierGuardProof,
      proofRun,
    },
    cards: {
      hybrid: updatedHybridCard,
      facts: updatedFactsCard,
    },
  }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
