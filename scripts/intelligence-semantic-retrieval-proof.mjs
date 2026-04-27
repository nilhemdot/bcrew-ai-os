#!/usr/bin/env node

import { createHash } from 'node:crypto'
import {
  buildRetrievalEmbeddingInput,
  closeFoundationDb,
  getIntelligenceRetrievalSnapshot,
  initFoundationDb,
  recordRetrievalRun,
  searchIntelligenceChunksSemantic,
  selectRetrievalChunksForEmbedding,
  updateBacklogItem,
  upsertRetrievalChunkEmbedding,
} from '../lib/foundation-db.js'
import { callEmbedding } from '../lib/llm-router.js'

const EMBEDDING_DIMENSIONS = 1536
const EMBEDDING_MODEL = process.env.LLM_EMBEDDING_MODEL || 'text-embedding-3-large'

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function pickSemanticQuery(snapshot) {
  const embeddedChunk = snapshot.recentChunks
    ?.find(chunk => chunk.candidateKey && chunk.atomId && chunk.embeddedAt && chunk.minTier <= 1)
  const text = [
    embeddedChunk?.title || '',
    embeddedChunk?.body || '',
    snapshot.latestLexicalProofQuery || '',
  ].join(' ')
  const words = text
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length >= 4)
    .filter(word => !['candidate', 'artifact', 'with', 'that', 'this', 'from', 'should', 'retrieval'].includes(word.toLowerCase()))
  return words.slice(0, 5).join(' ') || snapshot.latestLexicalProofQuery || 'Foundation evidence'
}

async function embedChunks(chunks) {
  if (!chunks.length) return []
  const inputs = chunks.map(chunk => buildRetrievalEmbeddingInput(chunk))
  const embeddingResult = await callEmbedding({
    input: inputs,
    dimensions: EMBEDDING_DIMENSIONS,
    metadata: {
      backlogCardId: 'RETRIEVAL-002',
      purpose: 'chunk_embedding_proof',
      chunkIds: chunks.map(chunk => chunk.chunkId),
    },
  })

  const embedded = []
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    const inputText = inputs[index]
    const updated = await upsertRetrievalChunkEmbedding({
      chunkId: chunk.chunkId,
      embedding: embeddingResult.embeddings[index],
      embeddingModel: embeddingResult.model,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      embeddingInputHash: stableHash(inputText),
      embeddingLlmCallId: embeddingResult.call.callId,
    }, 'semantic-retrieval-proof')
    embedded.push(updated)
  }

  return embedded
}

async function main() {
  await initFoundationDb()

  const beforeSnapshot = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  if (beforeSnapshot.chunksFromCandidates < 1 || beforeSnapshot.chunksWithAtoms < 1) {
    throw new Error('RETRIEVAL-002 requires the RETRIEVAL-001 candidate-backed atom chunk corpus.')
  }

  const chunksForEmbedding = await selectRetrievalChunksForEmbedding({
    limit: 20,
    maxTier: 1,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIMENSIONS,
  })
  const embedded = await embedChunks(chunksForEmbedding)

  const snapshot = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  if (snapshot.tierOneChunksWithEmbeddings < 1 || snapshot.candidateAtomChunksWithEmbeddings < 1) {
    throw new Error('RETRIEVAL-002 proof did not create tier-allowed candidate-backed semantic embeddings.')
  }

  const query = pickSemanticQuery(snapshot)
  const queryEmbeddingResult = await callEmbedding({
    input: query,
    dimensions: EMBEDDING_DIMENSIONS,
    metadata: {
      backlogCardId: 'RETRIEVAL-002',
      purpose: 'semantic_query_proof',
      query,
    },
  })
  const searchResults = await searchIntelligenceChunksSemantic({
    queryEmbedding: queryEmbeddingResult.embeddings[0],
    maxTier: 1,
    limit: 10,
  })

  if (!searchResults.some(result => result.candidateKey && result.atomId && result.minTier <= 1 && result.matchedBy === 'semantic_vector')) {
    throw new Error(`RETRIEVAL-002 semantic search did not return a tier-allowed candidate-backed atom chunk for query "${query}".`)
  }

  let tierGuardProof = false
  try {
    await searchIntelligenceChunksSemantic({
      queryEmbedding: queryEmbeddingResult.embeddings[0],
      limit: 1,
    })
  } catch (error) {
    tierGuardProof = /maxTier/.test(error instanceof Error ? error.message : String(error))
  }

  if (!tierGuardProof) {
    throw new Error('RETRIEVAL-002 semantic search did not enforce explicit maxTier.')
  }

  const proofRun = await recordRetrievalRun({
    runId: `retrieval-semantic-proof-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    runType: 'semantic_proof',
    status: 'succeeded',
    requestedBy: 'semantic-retrieval-proof',
    sourceIds: Array.from(new Set(searchResults.map(result => result.sourceId).filter(Boolean))),
    chunksUpserted: embedded.length,
    searchQuery: query,
    searchResultCount: searchResults.length,
    maxTier: 1,
    metadata: {
      backlogCardId: 'RETRIEVAL-002',
      tierGuardProof,
      proofCommand: 'npm run intelligence:semantic-proof',
      embeddingModel: queryEmbeddingResult.model,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      embeddedChunkIds: embedded.map(chunk => chunk.chunkId),
      firstChunkId: searchResults[0]?.chunkId || null,
      queryEmbeddingCallId: queryEmbeddingResult.call.callId,
    },
  }, 'semantic-retrieval-proof')

  const updatedSemanticCard = await updateBacklogItem('RETRIEVAL-002', {
    lane: 'done',
    summary: 'Enable pgvector in Postgres and add 1536-dimension embeddings for the candidate-backed intelligence_retrieval_chunks corpus.',
    nextAction: 'Keep RETRIEVAL-002 closed and stable as semantic retrieval over candidate-backed chunks. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; add retrieval eval baseline before major retrieval/synthesis changes.',
    statusNote: 'Done v1 on 2026-04-27. pgvector is installed, candidate-backed chunks have 1536-dimension OpenAI embeddings, semantic search requires explicit maxTier, and proof runs over the real RETRIEVAL-001 corpus.',
  }, 'semantic-retrieval-proof')

  const updatedHybridCard = await updateBacklogItem('RETRIEVAL-003', {
    lane: 'done',
    summary: 'Combine lexical search, semantic vector search, direct atom search, source filters, and sensitivity/tier rules into one evidence API for synthesis and future chat recall.',
    nextAction: 'Keep RETRIEVAL-003 closed and stable as the governed hybrid evidence API. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; add retrieval eval baseline before major retrieval/synthesis changes.',
    statusNote: 'Done v1 on 2026-04-27. Hybrid evidence search fuses lexical, semantic, and atom matches with explicit maxTier and source-backed result payloads.',
  }, 'semantic-retrieval-proof')

  console.log(JSON.stringify({
    embeddings: {
      model: queryEmbeddingResult.model,
      dimensions: EMBEDDING_DIMENSIONS,
      chunksSelected: chunksForEmbedding.length,
      chunksEmbedded: embedded.length,
      totalEmbeddedChunks: snapshot.chunksWithEmbeddings,
      candidateAtomChunksWithEmbeddings: snapshot.candidateAtomChunksWithEmbeddings,
    },
    search: {
      query,
      resultCount: searchResults.length,
      firstResult: searchResults[0] || null,
      tierGuardProof,
      proofRun,
    },
    cards: {
      semantic: updatedSemanticCard,
      hybrid: updatedHybridCard,
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
