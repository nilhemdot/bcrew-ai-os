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
    nextAction: 'Build SYNTHESIS-FACTS-001 and SYNTHESIS-ENGINE-001 on top of the governed hybrid evidence API. Keep Strategy Hub UI/advisor/recommendations blocked until synthesis facts, governed synthesis, and Action Router are live.',
    statusNote: 'Done v1 on 2026-04-27. Hybrid evidence search fuses lexical, semantic, and atom matches with explicit maxTier and source-backed result payloads.',
  }, 'hybrid-retrieval-proof')

  const updatedFactsCard = await updateBacklogItem('SYNTHESIS-FACTS-001', {
    lane: 'scoped',
    nextAction: 'Build source-backed fact grounding on top of the RETRIEVAL-003 hybrid evidence API before any governed synthesis or Strategy Hub work resumes.',
    statusNote: 'Next Foundation spine gate after RETRIEVAL-003 hybrid evidence retrieval.',
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
