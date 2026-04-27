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

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

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

async function embedChunks(chunks, actor = 'synthesis-engine-proof') {
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
    }, actor))
  }
  return embedded
}

async function main() {
  const args = parseArgs()
  const refreshMode = args.refresh === 'true' || args.refreshMode === 'true' || args.refresh_mode === 'true'
  const actor = refreshMode ? 'synthesis-engine-refresh' : 'synthesis-engine-proof'
  const commandName = refreshMode ? 'npm run intelligence:synthesis-refresh' : 'npm run intelligence:synthesis-proof'
  const runSuffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

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
        runId: `retrieval-corpus-diversity-${runSuffix}`,
        reportArtifactId: 'report-artifact:synthesis-engine-corpus-diversity',
        sourceIds: [DIVERSITY_SOURCE_ID],
        maxTier: 1,
        limit: 10,
      }, actor)

  const chunksForEmbedding = await selectRetrievalChunksForEmbedding({
    sourceIds: [DIVERSITY_SOURCE_ID],
    maxTier: 1,
    limit: 10,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIMENSIONS,
  })
  const embedded = await embedChunks(chunksForEmbedding, actor)

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
    runId: `synthesis-engine-fact-refresh-${runSuffix}`,
    runType: 'fact_refresh',
    status: 'succeeded',
    requestedBy: actor,
    sourceIds: factBundle.sourceIds,
    facts: factBundle.facts,
    maxTier: 1,
    metadata: {
      backlogCardId: 'SYNTHESIS-ENGINE-001',
      [refreshMode ? 'scheduledCommand' : 'proofCommand']: commandName,
      queries,
      queryEmbeddingCallId: queryEmbeddingResult.call.callId,
      evidence: factBundle.evidence,
      corpusDiversitySourceId: DIVERSITY_SOURCE_ID,
    },
  }, actor)

  const synthesis = await runGovernedSynthesis({
    runId: `${refreshMode ? 'synthesis-engine-refresh' : 'synthesis-engine-proof'}-${runSuffix}`,
    runType: refreshMode ? 'governed_synthesis' : 'governed_synthesis_proof',
    status: 'succeeded',
    requestedBy: actor,
    sourceIds: factBundle.sourceIds,
    facts: savedFacts.facts,
    evidence: factBundle.evidence,
    maxTier: 1,
    itemLimit: 8,
    synthesisScopeKey: 'foundation-spine-proof',
    metadata: {
      backlogCardId: 'SYNTHESIS-ENGINE-001',
      [refreshMode ? 'scheduledCommand' : 'proofCommand']: commandName,
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
  }, actor)

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
  const itemsMissingThemeMetadata = synthesis.items.filter(item =>
    !item.attributes?.themeKey ||
    item.attributes?.synthesisQuality !== 'clustered' ||
    !item.attributes?.routeScope
  )
  if (itemsMissingThemeMetadata.length) {
    throw new Error(`SYNTHESIS-ENGINE-001 produced items without cluster/theme metadata: ${itemsMissingThemeMetadata.map(item => item.synthesizedItemId).join(', ')}`)
  }
  const duplicateThemeKeys = synthesis.items
    .map(item => item.attributes?.themeKey)
    .filter(Boolean)
    .filter((themeKey, index, list) => list.indexOf(themeKey) !== index)
  if (duplicateThemeKeys.length) {
    throw new Error(`SYNTHESIS-ENGINE-001 did not collapse duplicate theme keys: ${Array.from(new Set(duplicateThemeKeys)).join(', ')}`)
  }
  const strategyEligibleItems = synthesis.items.filter(item =>
    item.metadata?.strategyHubEligible === true ||
    item.attributes?.strategyHubEligible === true
  )
  if (!strategyEligibleItems.length) {
    throw new Error('SYNTHESIS-ENGINE-001 proof produced no Strategy-eligible clustered item.')
  }
  const strategySingleEvidenceItems = strategyEligibleItems.filter(item =>
    (item.evidenceRefs?.length || 0) < 2 ||
    (item.evidenceChunkRefs?.length || 0) < 2
  )
  if (strategySingleEvidenceItems.length) {
    throw new Error(`SYNTHESIS-ENGINE-001 marked single-evidence items as Strategy-eligible: ${strategySingleEvidenceItems.map(item => item.synthesizedItemId).join(', ')}`)
  }
  const activeItemSourceCount = new Set(synthesis.items.flatMap(item => item.sourceIds || [])).size
  if (activeItemSourceCount < 2) {
    throw new Error('SYNTHESIS-ENGINE-001 proof must synthesize items from at least two active evidence sources.')
  }
  const humanSampleRows = synthesis.run.metadata?.humanSample?.rows || []
  if (humanSampleRows.length < Math.min(5, synthesis.items.length)) {
    throw new Error('SYNTHESIS-ENGINE-001 proof must persist a 5-row human-readable sample in run metadata.')
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
  const quality = snapshot.latestProofQuality || {}
  if (
    quality.activeItems < synthesis.items.length ||
    quality.clusteredItems < quality.activeItems ||
    quality.itemsWithThemeMetadata < quality.activeItems ||
    quality.strategyEligibleItems < 1 ||
    quality.strategyItemsWithMultiEvidence < quality.strategyEligibleItems ||
    quality.strategySingleEvidenceItems !== 0 ||
    quality.duplicateThemeKeys !== 0 ||
    quality.humanSampleRows < Math.min(5, synthesis.items.length)
  ) {
    throw new Error(`SYNTHESIS-ENGINE-001 quality snapshot failed clustered-output gates: ${JSON.stringify(quality)}`)
  }
  if (
    snapshot.activeUnclusteredUnprotectedItems !== 0 ||
    snapshot.routeableUnclusteredItems !== 0 ||
    snapshot.activeClusteredItems < quality.activeItems
  ) {
    throw new Error(`SYNTHESIS-ENGINE-001 active surface still contains unclustered routeable output: ${JSON.stringify({
      activeClusteredItems: snapshot.activeClusteredItems,
      activeLegacyProtectedItems: snapshot.activeLegacyProtectedItems,
      activeUnclusteredUnprotectedItems: snapshot.activeUnclusteredUnprotectedItems,
      routeableUnclusteredItems: snapshot.routeableUnclusteredItems,
    })}`)
  }

  const updatedSynthesisCard = refreshMode ? null : await updateBacklogItem('SYNTHESIS-ENGINE-001', {
    lane: 'executing',
    nextAction: 'Steve must review the 5-row synthesis sample before SYNTHESIS-ENGINE-001 can close again. Passing code gates now require clustered themes, duplicate collapse, Strategy/operational classification, and multi-evidence Strategy items.',
    statusNote: 'Repair build landed on 2026-04-27 and proof gates now check output quality, not just provenance form. Keep the card executing until Steve accepts the human-readable sample as strategy-grade.',
  }, actor)

  const updatedActionRouterCard = null

  console.log('SYNTHESIS HUMAN SAMPLE')
  for (const row of humanSampleRows) {
    console.log(`${row.n}. [${row.scope}${row.strategyHubEligible ? ' strategy' : ''}] ${row.title} (facts=${row.facts}, atoms=${row.atoms}, chunks=${row.chunks})`)
  }

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
      strategyEligibleItems: strategyEligibleItems.length,
      humanSample: humanSampleRows,
      quality,
      activeSurfaceQuality: {
        activeClusteredItems: snapshot.activeClusteredItems,
        activeLegacyProtectedItems: snapshot.activeLegacyProtectedItems,
        activeUnclusteredUnprotectedItems: snapshot.activeUnclusteredUnprotectedItems,
        routeableActiveItems: snapshot.routeableActiveItems,
        routeableUnclusteredItems: snapshot.routeableUnclusteredItems,
      },
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
