#!/usr/bin/env node

import { createHash } from 'node:crypto'
import {
  buildRetrievalEmbeddingInput,
  closeFoundationDb,
  collectSourceBackedSynthesisFacts,
  getIntelligenceRetrievalSnapshot,
  getSynthesisEngineSnapshot,
  initFoundationDb,
  promoteSharedCommunicationCandidatesToAtoms,
  runGovernedSynthesis,
  selectRetrievalChunksForEmbedding,
  updateBacklogItem,
  upsertRetrievalChunkEmbedding,
  upsertSynthesisFactsBundle,
} from '../lib/foundation-db.js'
import { callEmbedding } from '../lib/llm-router.js'

const EMBEDDING_DIMENSIONS = 1536
const EMBEDDING_MODEL = process.env.LLM_EMBEDDING_MODEL || 'text-embedding-3-large'
const DIVERSITY_SOURCE_ID = 'SRC-GMAIL-001'
const SAFE_QUERY_PATTERNS = [
  /marketing.*source map/i,
  /source map/i,
  /seller approval/i,
  /referral/i,
  /listing support/i,
  /video content/i,
]
const BLOCKED_QUERY_PATTERN = /(password|verification|code|api key|otp|login|reset|statement|stubhub|ticket|promo|unsubscribe|receipt|invoice)/i

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function safeQueryScore(item = {}) {
  const text = `${item.title || ''} ${item.body || ''}`
  if (BLOCKED_QUERY_PATTERN.test(text)) return -1
  if (/marketing.*source map|source map/i.test(text)) return 100
  if (/video content|listing support|seller approval/i.test(text)) return 80
  if (/referral/i.test(text)) return 50
  return SAFE_QUERY_PATTERNS.some(pattern => pattern.test(text)) ? 10 : 0
}

function pickSynthesisQuery(promotion, snapshot) {
  const candidates = [
    ...(promotion.promoted || []),
    ...(snapshot.recentChunks || []),
  ]
  const scored = candidates
    .map(item => ({ item, score: safeQueryScore(item) + (item.sourceId === DIVERSITY_SOURCE_ID ? 5 : 0) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
  const chunk = scored[0]?.item || snapshot.recentChunks?.find(item => !BLOCKED_QUERY_PATTERN.test(`${item.title || ''} ${item.body || ''}`)) || snapshot.recentChunks?.[0]
  const text = `${chunk?.title || ''} ${chunk?.body || ''}`
  const words = text
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length >= 4)
    .filter(word => !['candidate', 'artifact', 'with', 'that', 'this', 'from', 'should', 'retrieval'].includes(word.toLowerCase()))
  return words.slice(0, 5).join(' ') || snapshot.latestHybridProofRun?.searchQuery || 'Steve rebuilding system'
}

async function embedChunks(chunks) {
  if (!chunks.length) return []
  const inputs = chunks.map(chunk => buildRetrievalEmbeddingInput(chunk))
  const embeddingResult = await callEmbedding({
    input: inputs,
    dimensions: EMBEDDING_DIMENSIONS,
    metadata: {
      backlogCardId: 'SYNTHESIS-ENGINE-001',
      purpose: 'corpus_diversity_chunk_embedding',
      sourceId: DIVERSITY_SOURCE_ID,
      chunkIds: chunks.map(chunk => chunk.chunkId),
    },
  })

  const embedded = []
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    const inputText = inputs[index]
    embedded.push(await upsertRetrievalChunkEmbedding({
      chunkId: chunk.chunkId,
      embedding: embeddingResult.embeddings[index],
      embeddingModel: embeddingResult.model,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      embeddingInputHash: stableHash(inputText),
      embeddingLlmCallId: embeddingResult.call.callId,
    }, 'synthesis-engine-proof'))
  }
  return embedded
}

async function main() {
  await initFoundationDb()

  const beforeRetrievalSnapshot = await getIntelligenceRetrievalSnapshot({ limit: 50 })
  const existingDiversitySourceChunks = beforeRetrievalSnapshot.bySource.find(source => source.sourceId === DIVERSITY_SOURCE_ID)?.count || 0
  const diversityPromotion = existingDiversitySourceChunks >= 20
    ? {
        candidatesRead: 0,
        atomsPromoted: 0,
        chunksUpserted: 0,
        promoted: [],
      }
    : await promoteSharedCommunicationCandidatesToAtoms({
        runId: `retrieval-corpus-diversity-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
        reportArtifactId: 'report-artifact:synthesis-engine-corpus-diversity',
        sourceIds: [DIVERSITY_SOURCE_ID],
        maxTier: 1,
        limit: 10,
      }, 'synthesis-engine-proof')

  const chunksForEmbedding = await selectRetrievalChunksForEmbedding({
    sourceIds: [DIVERSITY_SOURCE_ID],
    maxTier: 1,
    limit: 10,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIMENSIONS,
  })
  const embedded = await embedChunks(chunksForEmbedding)

  const retrievalSnapshot = await getIntelligenceRetrievalSnapshot({ limit: 50 })
  const activeSourceCount = retrievalSnapshot.bySource.filter(source => source.count > 0).length
  const diversitySourceChunks = retrievalSnapshot.bySource.find(source => source.sourceId === DIVERSITY_SOURCE_ID)?.count || 0
  if (activeSourceCount < 2 || diversitySourceChunks < 1) {
    throw new Error('SYNTHESIS-ENGINE-001 requires a multi-source retrieval corpus before proof synthesis.')
  }

  const query = pickSynthesisQuery(diversityPromotion, retrievalSnapshot)
  const secondaryQuery = retrievalSnapshot.latestHybridProofRun?.searchQuery &&
    retrievalSnapshot.latestHybridProofRun.searchQuery !== query
    ? retrievalSnapshot.latestHybridProofRun.searchQuery
    : 'Steve rebuilding system'
  const queries = Array.from(new Set([query, secondaryQuery].filter(Boolean)))
  const queryEmbeddingResult = await callEmbedding({
    input: queries,
    dimensions: EMBEDDING_DIMENSIONS,
    metadata: {
      backlogCardId: 'SYNTHESIS-ENGINE-001',
      purpose: 'governed_synthesis_hybrid_evidence',
      queries,
    },
  })

  const bundles = []
  for (let index = 0; index < queries.length; index += 1) {
    bundles.push(await collectSourceBackedSynthesisFacts({
      query: queries[index],
      queryEmbedding: queryEmbeddingResult.embeddings[index],
      maxTier: 1,
      limit: 120,
      evidenceLimit: 8,
    }))
  }
  const factsByKey = new Map()
  const evidenceResultsById = new Map()
  for (const bundle of bundles) {
    for (const fact of bundle.facts) factsByKey.set(fact.naturalKey || fact.factId, fact)
    for (const result of bundle.evidence?.results || []) evidenceResultsById.set(result.evidenceId, result)
  }
  const factBundle = {
    generatedAt: new Date().toISOString(),
    maxTier: 1,
    query: queries.join(' | '),
    sourceIds: Array.from(new Set(bundles.flatMap(bundle => bundle.sourceIds || []))),
    facts: Array.from(factsByKey.values()),
    evidence: {
      query: queries.join(' | '),
      resultCount: evidenceResultsById.size,
      laneCounts: bundles.reduce((acc, bundle) => {
        for (const [lane, count] of Object.entries(bundle.evidence?.laneCounts || {})) {
          acc[lane] = (acc[lane] || 0) + Number(count || 0)
        }
        return acc
      }, {}),
      evidenceIds: Array.from(evidenceResultsById.keys()),
      results: Array.from(evidenceResultsById.values()),
    },
  }
  const savedFacts = await upsertSynthesisFactsBundle({
    runId: `synthesis-engine-fact-refresh-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    runType: 'fact_refresh',
    status: 'succeeded',
    requestedBy: 'synthesis-engine-proof',
    sourceIds: factBundle.sourceIds,
    facts: factBundle.facts,
    maxTier: 1,
    metadata: {
      backlogCardId: 'SYNTHESIS-ENGINE-001',
      proofCommand: 'npm run intelligence:synthesis-proof',
      queries,
      queryEmbeddingCallId: queryEmbeddingResult.call.callId,
      evidence: factBundle.evidence,
      corpusDiversitySourceId: DIVERSITY_SOURCE_ID,
    },
  }, 'synthesis-engine-proof')

  const synthesis = await runGovernedSynthesis({
    runId: `synthesis-engine-proof-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    runType: 'governed_synthesis_proof',
    status: 'succeeded',
    requestedBy: 'synthesis-engine-proof',
    sourceIds: factBundle.sourceIds,
    facts: savedFacts.facts,
    evidence: factBundle.evidence,
    maxTier: 1,
    itemLimit: 8,
    synthesisScopeKey: 'foundation-spine-proof',
    metadata: {
      backlogCardId: 'SYNTHESIS-ENGINE-001',
      proofCommand: 'npm run intelligence:synthesis-proof',
      synthesisScopeKey: 'foundation-spine-proof',
      queries,
      queryEmbeddingCallId: queryEmbeddingResult.call.callId,
      corpusDiversity: {
        sourceId: DIVERSITY_SOURCE_ID,
        activeSourceCount,
        diversitySourceChunks,
        promoted: diversityPromotion.chunksUpserted,
        embedded: embedded.length,
      },
    },
  }, 'synthesis-engine-proof')

  if (!synthesis.items.length) throw new Error('SYNTHESIS-ENGINE-001 proof produced no synthesized items.')
  const invalidItem = synthesis.items.find(item =>
    !item.runId ||
    !item.naturalKey ||
    item.synthesizedItemId.includes(synthesis.run.runId) ||
    item.minTier > 1 ||
    !item.factRefs?.length ||
    !item.evidenceRefs?.length ||
    !item.evidenceChunkRefs?.length
  )
  if (invalidItem) {
    throw new Error(`SYNTHESIS-ENGINE-001 synthesized item is missing governed provenance: ${invalidItem.synthesizedItemId}`)
  }
  const activeItemSourceCount = new Set(synthesis.items.flatMap(item => item.sourceIds || [])).size
  if (activeItemSourceCount < 2) {
    throw new Error('SYNTHESIS-ENGINE-001 proof must synthesize items from at least two active evidence sources.')
  }

  const snapshot = await getSynthesisEngineSnapshot({ limit: 20 })
  if (
    snapshot.totalItems < synthesis.items.length ||
    snapshot.itemsWithFactRefs < synthesis.items.length ||
    snapshot.itemsWithEvidenceRefs < synthesis.items.length ||
    snapshot.itemsWithEvidenceChunkRefs < synthesis.items.length ||
    snapshot.tierOneItems < synthesis.items.length ||
    snapshot.latestRun?.runId !== synthesis.run.runId
  ) {
    throw new Error('SYNTHESIS-ENGINE-001 snapshot did not retain synthesized items with fact and evidence provenance.')
  }

  const updatedSynthesisCard = await updateBacklogItem('SYNTHESIS-ENGINE-001', {
    lane: 'done',
    nextAction: 'Build ACTION-ROUTER-001 so synthesized items route into governed decisions, backlog, open questions, contradictions, ignore/snooze records, or owner-bound actions. Keep Strategy Hub UI/advisor/recommendations blocked until Action Router is live.',
    statusNote: 'Done v1 on 2026-04-27. Governed synthesis persists owner-suggested synthesized items with source fact refs, hybrid evidence refs, evidence chunk refs, maxTier, structured attributes, and corpus-diversity proof.',
  }, 'synthesis-engine-proof')

  const updatedActionRouterCard = await updateBacklogItem('ACTION-ROUTER-001', {
    lane: 'scoped',
    nextAction: 'Build Action Router v1 from intelligence_synthesized_items into decision/backlog/open-question/contradiction/ignore/snooze/action ledgers with approval gates and source-proof links.',
    statusNote: 'Next Foundation spine gate after SYNTHESIS-ENGINE-001. Do not resume Strategy Hub UI/advisor work until synthesized items can route into governed action ledgers.',
  }, 'synthesis-engine-proof')

  console.log(JSON.stringify({
    corpusDiversity: {
      sourceId: DIVERSITY_SOURCE_ID,
      activeSourceCount,
      diversitySourceChunks,
      promoted: diversityPromotion.chunksUpserted,
      embedded: embedded.length,
      bySource: retrievalSnapshot.bySource,
    },
    facts: {
      saved: savedFacts.facts.length,
      archivedStaleFacts: savedFacts.archivedStaleFacts,
      evidenceResults: factBundle.evidence?.resultCount || 0,
      queries,
    },
    synthesis: {
      run: synthesis.run,
      itemCount: synthesis.items.length,
      firstItem: synthesis.items[0],
      snapshot,
    },
    cards: {
      synthesis: updatedSynthesisCard,
      actionRouter: updatedActionRouterCard,
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
