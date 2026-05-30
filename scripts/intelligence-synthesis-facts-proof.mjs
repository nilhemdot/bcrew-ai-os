#!/usr/bin/env node

import { createHash } from 'node:crypto'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import { updateBacklogItem } from '../lib/foundation-backlog-sprint-db.js'
import {
  collectSourceBackedSynthesisFacts,
  getIntelligenceRetrievalSnapshot,
  getSynthesisEngineSnapshot,
  getSynthesisFactsSnapshot,
  querySynthesisFacts,
  runGovernedSynthesis,
  upsertSynthesisFactsBundle,
} from '../lib/foundation-intelligence-db.js'
import { callEmbedding } from '../lib/llm-router.js'

const EMBEDDING_DIMENSIONS = 1536

function safeRunSummary(run = {}) {
  return {
    runId: run.runId,
    runType: run.runType,
    status: run.status,
    requestedBy: run.requestedBy,
    sourceIds: run.sourceIds || [],
    factCount: run.factCount,
    evidenceCount: run.evidenceCount,
    itemCount: run.itemCount,
    maxTier: run.maxTier,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  }
}

function safeEvidenceFactSummary(fact = {}) {
  return {
    factId: fact.factId,
    factType: fact.factType,
    sourceId: fact.sourceId,
    sourceIds: fact.sourceIds || [],
    evidenceId: fact.evidenceId || null,
    atomId: fact.atomId || null,
    candidateKeyHash: fact.candidateKey ? `sha256:${stableHash(fact.candidateKey).slice(0, 24)}` : null,
    artifactIdHash: fact.artifactId ? `sha256:${stableHash(fact.artifactId).slice(0, 24)}` : null,
    sensitivity: fact.sensitivity,
    minTier: fact.minTier,
    status: fact.status,
  }
}

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function safeCardSummary(card = null) {
  if (!card) return null
  return {
    id: card.id,
    lane: card.lane,
    priority: card.priority,
    statusNoteHasDoneV1: /done v1|closed/i.test(String(card.statusNote || '')),
  }
}

function requireFactType(facts, factType) {
  const found = facts.find(fact => fact.factType === factType)
  if (!found) throw new Error(`SYNTHESIS-FACTS-001 proof is missing fact type ${factType}.`)
  return found
}

function requireSource(facts, sourceId) {
  const found = facts.find(fact => Array.isArray(fact.sourceIds) && fact.sourceIds.includes(sourceId))
  if (!found) throw new Error(`SYNTHESIS-FACTS-001 proof is missing source ${sourceId}.`)
  return found
}

async function main() {
  await initFoundationDb()

  const retrievalSnapshot = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  const query = retrievalSnapshot.latestHybridProofRun?.searchQuery || 'Steve rebuilding system'
  const queryEmbeddingResult = await callEmbedding({
    input: query,
    dimensions: EMBEDDING_DIMENSIONS,
    metadata: {
      backlogCardId: 'SYNTHESIS-FACTS-001',
      purpose: 'source_fact_grounding_hybrid_evidence',
      query,
    },
  })

  const factBundle = await collectSourceBackedSynthesisFacts({
    query,
    queryEmbedding: queryEmbeddingResult.embeddings[0],
    maxTier: 1,
    limit: 120,
    evidenceLimit: 5,
  })

  const requiredTypes = [
    'source_contract',
    'goal_truth',
    'operating_truth',
    'kpi_truth',
    'source_snapshot',
    'source_health',
    'retrieved_evidence',
  ]
  for (const factType of requiredTypes) requireFactType(factBundle.facts, factType)

  const requiredSources = [
    'SRC-STRATEGY-001',
    'SRC-FINANCE-001',
    'SRC-OWNERS-001',
    'SRC-FUB-001',
    'SRC-SUPABASE-001',
    'SRC-FREEDOM-BHAG-001',
    'SRC-MEETINGS-001',
  ]
  for (const sourceId of requiredSources) requireSource(factBundle.facts, sourceId)

  const evidenceFact = factBundle.facts.find(fact =>
    fact.factType === 'retrieved_evidence' &&
    fact.evidenceId &&
    fact.atomId &&
    fact.candidateKey &&
    fact.minTier <= 1
  )
  if (!evidenceFact) {
    throw new Error('SYNTHESIS-FACTS-001 proof needs at least one tier-1 retrieved evidence fact linked to an atom and candidate.')
  }

  const saved = await upsertSynthesisFactsBundle({
    runId: `synthesis-facts-proof-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    runType: 'source_fact_proof',
    status: 'succeeded',
    requestedBy: 'synthesis-facts-proof',
    sourceIds: factBundle.sourceIds,
    facts: factBundle.facts,
    maxTier: 1,
    metadata: {
      backlogCardId: 'SYNTHESIS-FACTS-001',
      proofCommand: 'npm run intelligence:synthesis-facts-proof',
      query,
      queryEmbeddingCallId: queryEmbeddingResult.call.callId,
      evidence: factBundle.evidence,
      requiredTypes,
      requiredSources,
    },
  }, 'synthesis-facts-proof')

  const savedEvidenceFact = saved.facts.find(fact => fact.factId === evidenceFact.factId) || evidenceFact
  const ownerSourceFacts = await querySynthesisFacts({
    sourceIds: ['SRC-OWNERS-001'],
    factTypes: ['goal_truth'],
    maxTier: 1,
    limit: 50,
  })
  const sourceOverlapProof = ownerSourceFacts.some(fact =>
    fact.sourceId !== 'SRC-OWNERS-001' &&
    Array.isArray(fact.sourceIds) &&
    fact.sourceIds.includes('SRC-OWNERS-001')
  )
  if (!sourceOverlapProof) {
    throw new Error('SYNTHESIS-FACTS-001 source filter did not match facts where the requested source is secondary in source_ids.')
  }
  const snapshot = await getSynthesisFactsSnapshot({ limit: 20 })
  if (
    snapshot.totalActiveFacts < saved.facts.length ||
    snapshot.factsWithEvidence < 1 ||
    snapshot.distinctSources < requiredSources.length ||
    snapshot.activeFactsWithoutNaturalKey !== 0 ||
    snapshot.duplicateActiveNaturalKeys !== 0 ||
    snapshot.secondarySourceFacts < 1
  ) {
    throw new Error('SYNTHESIS-FACTS-001 snapshot did not retain the saved source-backed fact proof.')
  }

  const synthesis = await runGovernedSynthesis({
    runId: `synthesis-facts-proof-refresh-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    runType: 'governed_synthesis_proof',
    status: 'succeeded',
    requestedBy: 'synthesis-facts-proof',
    sourceIds: factBundle.sourceIds,
    facts: saved.facts,
    evidence: factBundle.evidence,
    maxTier: 1,
    itemLimit: 5,
    metadata: {
      backlogCardId: 'SYNTHESIS-FACTS-001',
      proofCommand: 'npm run intelligence:synthesis-facts-proof',
      synthesisScopeKey: 'foundation-spine-proof',
      refreshedAfterFactRunId: saved.run.runId,
    },
  }, 'synthesis-facts-proof')
  const synthesisSnapshot = await getSynthesisEngineSnapshot({ limit: 20 })
  if (
    !synthesis.items.length ||
    synthesisSnapshot.itemsWithActiveFactRefs < synthesisSnapshot.activeItems ||
    synthesisSnapshot.itemsWithActiveEvidenceRefs < synthesisSnapshot.activeItems ||
    synthesisSnapshot.itemsWithActiveEvidenceChunkRefs < synthesisSnapshot.activeItems
  ) {
    throw new Error('SYNTHESIS-FACTS-001 proof did not leave active synthesized items pointing at active facts/evidence/chunks.')
  }

  const updatedFactsCard = await updateBacklogItem('SYNTHESIS-FACTS-001', {
    lane: 'done',
    nextAction: 'Keep SYNTHESIS-FACTS-001 closed and stable as the source-backed fact ledger for synthesis and Strategy Hub v2. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; no advisor chat or recommendation surface.',
    statusNote: 'Done v1 on 2026-04-27. Source-backed synthesis fact ledger persists strategy/source-contract, goal, operating, KPI, source-snapshot, source-health, and retrieved-evidence facts with maxTier, stable natural keys, stale-run archival, and source-overlap filtering.',
  }, 'synthesis-facts-proof')

  const updatedSynthesisCard = await updateBacklogItem('SYNTHESIS-ENGINE-001', {
    lane: 'done',
    nextAction: 'Keep governed synthesis v1 operating as the source-backed item layer feeding Action Router and Strategy Hub v2. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; no advisor chat or recommendation surface.',
    statusNote: 'Done v1 on 2026-04-27. Governed synthesis persists owner-suggested synthesized items with source fact refs, hybrid evidence refs, evidence chunk refs, maxTier, structured attributes, and corpus-diversity proof.',
  }, 'synthesis-facts-proof')

  console.log(JSON.stringify({
    run: safeRunSummary(saved.run),
    facts: {
      saved: saved.facts.length,
      sourceIds: factBundle.sourceIds,
      factsByType: snapshot.factsByType,
      factsBySource: snapshot.factsBySource.slice(0, 12),
      archivedStaleFacts: saved.archivedStaleFacts,
      archivedSynthesizedItemsWithStaleFacts: saved.archivedSynthesizedItemsWithStaleFacts,
      sourceOverlapProof,
      evidenceFact: safeEvidenceFactSummary(savedEvidenceFact),
    },
    synthesis: {
      refreshedRun: safeRunSummary(synthesis.run),
      itemCount: synthesis.items.length,
      activeItems: synthesisSnapshot.activeItems,
      itemsWithActiveFactRefs: synthesisSnapshot.itemsWithActiveFactRefs,
      itemsWithActiveEvidenceRefs: synthesisSnapshot.itemsWithActiveEvidenceRefs,
      itemsWithActiveEvidenceChunkRefs: synthesisSnapshot.itemsWithActiveEvidenceChunkRefs,
    },
    cards: {
      facts: safeCardSummary(updatedFactsCard),
      synthesis: safeCardSummary(updatedSynthesisCard),
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
