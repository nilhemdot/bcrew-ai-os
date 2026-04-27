#!/usr/bin/env node

import {
  closeFoundationDb,
  getIntelligenceRetrievalSnapshot,
  initFoundationDb,
  promoteSharedCommunicationCandidatesToAtoms,
  recordRetrievalRun,
  searchIntelligenceChunks,
  updateBacklogItem,
} from '../lib/foundation-db.js'

function pickSearchQuery(promoted, snapshot) {
  const promotedTitle = promoted?.[0]?.title || ''
  const recentTitle = snapshot.recentChunks?.[0]?.title || ''
  const text = `${promotedTitle} ${recentTitle}`.trim()
  const words = text
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length >= 4)
    .filter(word => !['candidate', 'artifact', 'with', 'that', 'this', 'from', 'should'].includes(word.toLowerCase()))
  return words.slice(0, 3).join(' ') || snapshot.latestLexicalProofQuery || 'Foundation'
}

async function main() {
  await initFoundationDb()

  const beforeSnapshot = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  const promotion = beforeSnapshot.chunksFromCandidates >= 1 && beforeSnapshot.chunksWithAtoms >= 1
    ? {
        skipped: true,
        reason: 'candidate-backed lexical corpus already exists',
        promoted: beforeSnapshot.recentChunks
          .filter(chunk => chunk.candidateKey && chunk.atomId)
          .slice(0, 10)
          .map(chunk => ({
            candidateKey: chunk.candidateKey,
            atomId: chunk.atomId,
            chunkId: chunk.chunkId,
            sourceId: chunk.sourceId,
            minTier: chunk.minTier,
            title: chunk.title,
          })),
      }
    : await promoteSharedCommunicationCandidatesToAtoms({
        limit: 10,
        maxTier: 1,
        statuses: ['pending', 'approved'],
      }, 'retrieval-proof')

  const snapshot = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  if (snapshot.totalChunks < 1 || snapshot.chunksFromCandidates < 1 || snapshot.chunksWithAtoms < 1) {
    throw new Error('RETRIEVAL-001 proof did not create candidate-backed atom chunks.')
  }

  const query = pickSearchQuery(promotion.promoted, snapshot)
  const searchResults = await searchIntelligenceChunks({
    query,
    maxTier: 1,
    limit: 10,
  })

  if (!searchResults.some(result => result.candidateKey && result.atomId && result.minTier <= 1)) {
    throw new Error(`RETRIEVAL-001 lexical search did not return a tier-allowed candidate-backed atom chunk for query "${query}".`)
  }

  let tierGuardProof = false
  try {
    await searchIntelligenceChunks({
      query,
      limit: 1,
    })
  } catch (error) {
    tierGuardProof = /maxTier/.test(error instanceof Error ? error.message : String(error))
  }

  if (!tierGuardProof) {
    throw new Error('RETRIEVAL-001 lexical search did not enforce explicit maxTier.')
  }

  const proofRun = await recordRetrievalRun({
    runId: `retrieval-lexical-proof-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    runType: 'lexical_proof',
    status: 'succeeded',
    requestedBy: 'retrieval-proof',
    sourceIds: Array.from(new Set(searchResults.map(result => result.sourceId).filter(Boolean))),
    searchQuery: query,
    searchResultCount: searchResults.length,
    maxTier: 1,
    metadata: {
      backlogCardId: 'RETRIEVAL-001',
      tierGuardProof,
      proofCommand: 'npm run intelligence:retrieval-proof',
      firstChunkId: searchResults[0]?.chunkId || null,
    },
  }, 'retrieval-proof')

  const updatedRetrievalCard = await updateBacklogItem('RETRIEVAL-001', {
    lane: 'done',
    summary: 'Add chunk tables and Postgres full-text lexical search over real shared-communications candidates/artifacts promoted into atoms before relying on vector search.',
    nextAction: 'RETRIEVAL-001 remains closed. Continue the Foundation spine through SYNTHESIS-ENGINE-001 and ACTION-ROUTER-001; keep Strategy Hub review/promote UI, advisor chat, and recommendations blocked until governed synthesis and action routing are live.',
    statusNote: 'Done v1 on 2026-04-27. RETRIEVAL-001 now promotes real shared_communication_candidates into intelligence_atoms, stores candidate-backed chunks in intelligence_retrieval_chunks, and proves lexical search with explicit maxTier enforcement.',
  }, 'retrieval-proof')

  const updatedSemanticCard = await updateBacklogItem('RETRIEVAL-002', {
    lane: 'done',
    nextAction: 'RETRIEVAL-002 remains closed. Continue the Foundation spine through SYNTHESIS-ENGINE-001 and ACTION-ROUTER-001 on top of hybrid evidence and source-backed facts. Keep Strategy Hub UI/advisor/recommendations blocked.',
    statusNote: 'Done v1 on 2026-04-27. pgvector is installed, candidate-backed chunks have 1536-dimension OpenAI embeddings, semantic search requires explicit maxTier, and proof runs over the real RETRIEVAL-001 corpus.',
  }, 'retrieval-proof')

  console.log(JSON.stringify({
    promotion,
    search: {
      query,
      resultCount: searchResults.length,
      firstResult: searchResults[0] || null,
      tierGuardProof,
      proofRun,
    },
    retrievalSummary: {
      totalChunks: snapshot.totalChunks,
      activeChunks: snapshot.activeChunks,
      chunksWithAtoms: snapshot.chunksWithAtoms,
      chunksFromCandidates: snapshot.chunksFromCandidates,
      chunksWithReportArtifact: snapshot.chunksWithReportArtifact,
      tierOneChunks: snapshot.tierOneChunks,
      latestLexicalProofQuery: snapshot.latestLexicalProofQuery,
    },
    cards: {
      retrieval: updatedRetrievalCard,
      semantic: updatedSemanticCard,
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
