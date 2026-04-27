#!/usr/bin/env node

import {
  closeFoundationDb,
  getFoundationSnapshot,
  getIntelligenceAtomSpineSnapshot,
  getSharedCommunicationSynthesisSnapshot,
  initFoundationDb,
  queryIntelligenceAtomsForScoper,
  recordIntelligenceAtomHit,
  updateBacklogItem,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-db.js'

function uniqueText(values) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map(value => String(value || '').trim())
      .filter(Boolean)
  ))
}

function buildSourceIds(synthesisItem) {
  const itemSourceIds = Array.isArray(synthesisItem?.sourceIds) ? synthesisItem.sourceIds : []
  return uniqueText([...itemSourceIds, 'SRC-GDRIVE-001', 'SRC-STRATEGY-001'])
}

async function main() {
  await initFoundationDb()

  const foundation = await getFoundationSnapshot()
  const card = foundation.backlogItems.find(item => item.id === 'INTEL-ATOM-001') || null
  const reportMiningCard = foundation.backlogItems.find(item => item.id === 'REPORT-MINING-001') || null
  const synthesis = await getSharedCommunicationSynthesisSnapshot({ limit: 1, itemLimit: 5 })
  const synthesisItem = synthesis.latestItems[0] || null
  const sourceIds = buildSourceIds(synthesisItem)
  const primarySourceId = sourceIds[0]
  const reportArtifactId = 'report-artifact:intel-atom-proof-20260427'
  const atomId = 'atom:intel-atom-proof-foundation-spine'

  const report = await upsertIntelligenceReportArtifact({
    reportArtifactId,
    reportType: 'proof',
    scopeKey: 'foundation:intelligence-spine',
    department: 'foundation',
    title: 'INTEL-ATOM-001 proof report artifact',
    status: 'reviewed',
    sourceIds,
    inputCandidateKeys: synthesisItem?.candidateKeys || [],
    inputFactRefs: [
      { backlogCardId: 'REPORT-MINING-001', status: reportMiningCard?.lane || 'done' },
      { backlogCardId: 'INTEL-ATOM-001', status: card?.lane || 'building' },
      { specPath: 'docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md' },
    ],
    sourceCoverage: [
      {
        sourceIds,
        latestSynthesisRunId: synthesis.latestRun?.runId || null,
        synthesisItemId: synthesisItem?.synthesisItemId || null,
      },
    ],
    dedupSummary: {
      atomDedupKey: atomId,
      rule: 'source + report artifact + derived claim + evidence excerpt',
    },
    topFindings: [
      {
        finding: 'Foundation needs governed report artifacts before retrieval and hub scoping.',
        evidence: 'REPORT-MINING-001 accepted the old Director, Scoper, and Gold Library salvage contract.',
      },
      {
        finding: synthesisItem?.title || 'Shared communication synthesis remains an upstream signal source.',
        evidence: synthesisItem?.oneLine || 'Atom proof can bind source-backed findings to direct Scoper query fields.',
      },
    ],
    actionRequiredItems: [
      {
        backlogCardId: 'RETRIEVAL-003',
        action: 'Continue the spine through hybrid retrieval on top of the proven lexical and semantic corpus.',
      },
    ],
    openQuestions: [
      {
        question: 'Which additional production extractors should promote candidate findings into atoms after the shared-comms path?',
        routedTo: 'extraction hardening / RETRIEVAL-003',
      },
    ],
    structuredOutputJson: {
      contract: 'governed_report_artifact',
      preserves: [
        'old report shape',
        'Gold Library lifecycle fields',
        'direct Scoper atom query',
        'source/access/freshness boundaries',
      ],
    },
    metadata: {
      backlogCardId: 'INTEL-ATOM-001',
      proofCommand: 'npm run intelligence:atoms-proof',
    },
  }, 'intel-atom-proof')

  const atom = await upsertIntelligenceAtom({
    atomId,
    title: 'Foundation spine must preserve report artifacts and direct Scoper atom queries',
    content: 'REPORT-MINING-001 requires durable atoms that preserve old-system report shape, source proof, access boundaries, lifecycle feedback, and direct Scoper query fields before any hub synthesis resumes.',
    atomType: 'proof_point',
    sourceId: primarySourceId,
    reportArtifactId,
    modality: 'text',
    anchorType: 'spec',
    anchorValue: 'docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md#required-changes-to-intel-atom-001',
    evidenceExcerpt: 'A Scoper must query atoms/retrieval directly before producing scoped work.',
    derivedClaim: 'INTEL-ATOM-001 is the required memory layer between source extraction and retrieval/scoping.',
    entityRefs: ['Foundation', 'Strategy Hub v2'],
    metricRefs: ['INTEL-ATOM-001', 'REPORT-MINING-001', 'RETRIEVAL-001'],
    topicRefs: ['old-system-salvage', 'direct-scoper-query', 'governed-report-artifact'],
    department: 'foundation',
    pillar: 'SYSTEM',
    valueRoute: 'strategy_evidence',
    contentUseClass: 'internal_system_design',
    qualityScore: 5,
    relevanceScore: 5,
    sourceConfidence: 1,
    extractionConfidence: 1,
    sensitivity: 'neutral',
    minTier: 1,
    freshness: 'structural',
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
    acceptedBy: 'intel-atom-proof',
    suggestedOwner: 'Foundation',
    suggestedAction: 'Continue to RETRIEVAL-003 on the proven atom/chunk/retrieval substrate, not Strategy Hub chat polish.',
    tags: ['INTEL-ATOM-001', 'REPORT-MINING-001', 'foundation-spine'],
    metadata: {
      backlogCardId: 'INTEL-ATOM-001',
      reportArtifactId,
      salvageSpec: 'docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md',
      proofCommand: 'npm run intelligence:atoms-proof',
    },
  }, 'intel-atom-proof')

  const duplicateAtomProof = await upsertIntelligenceAtom({
    atomId: 'atom:intel-atom-proof-duplicate-id',
    title: atom.title,
    content: atom.content,
    atomType: atom.atomType,
    sourceId: atom.sourceId,
    reportArtifactId,
    modality: atom.modality,
    anchorType: atom.anchorType,
    anchorValue: atom.anchorValue,
    evidenceExcerpt: atom.evidenceExcerpt,
    derivedClaim: atom.derivedClaim,
    entityRefs: atom.entityRefs,
    metricRefs: atom.metricRefs,
    topicRefs: atom.topicRefs,
    department: atom.department,
    pillar: atom.pillar,
    valueRoute: atom.valueRoute,
    contentUseClass: atom.contentUseClass,
    qualityScore: atom.qualityScore,
    relevanceScore: atom.relevanceScore,
    sourceConfidence: atom.sourceConfidence,
    extractionConfidence: atom.extractionConfidence,
    sensitivity: atom.sensitivity,
    minTier: atom.minTier,
    freshness: atom.freshness,
    status: atom.status,
    acceptedAt: atom.acceptedAt,
    acceptedBy: atom.acceptedBy,
    suggestedOwner: atom.suggestedOwner,
    suggestedAction: atom.suggestedAction,
    tags: atom.tags,
    metadata: {
      ...atom.metadata,
      duplicateMergeProof: true,
    },
  }, 'intel-atom-proof')

  if (duplicateAtomProof.atomId !== atom.atomId) {
    throw new Error('Duplicate atom proof did not merge on dedup_hash.')
  }

  const hit = await recordIntelligenceAtomHit({
    hitId: 'atom-hit:intel-atom-proof-foundation-spine',
    atomId: atom.atomId,
    sourceId: primarySourceId,
    reportArtifactId,
    hitType: 'supporting_evidence',
    evidenceExcerpt: 'The accepted salvage spec makes report artifacts and direct Scoper atom queries mandatory before hubs resume.',
    anchorType: 'proof',
    anchorValue: reportArtifactId,
    confidence: 1,
    metadata: {
      backlogCardId: 'INTEL-ATOM-001',
      proofCommand: 'npm run intelligence:atoms-proof',
    },
  }, 'intel-atom-proof')

  let tierGuardProof = false
  try {
    await queryIntelligenceAtomsForScoper({
      reportArtifactIds: [reportArtifactId],
      metricRefs: ['INTEL-ATOM-001'],
      statuses: ['accepted'],
      limit: 1,
    })
  } catch (error) {
    tierGuardProof = /maxTier/.test(error instanceof Error ? error.message : String(error))
  }

  if (!tierGuardProof) {
    throw new Error('Scoper proof query did not enforce an explicit maxTier.')
  }

  const scoperProof = await queryIntelligenceAtomsForScoper({
    reportArtifactIds: [reportArtifactId],
    metricRefs: ['INTEL-ATOM-001'],
    statuses: ['accepted'],
    maxTier: 1,
    limit: 5,
  })

  if (!scoperProof.some(item => item.atomId === atom.atomId)) {
    throw new Error('Scoper proof query did not return the INTEL-ATOM-001 proof atom.')
  }

  const updatedCard = await updateBacklogItem('INTEL-ATOM-001', {
    lane: 'done',
    nextAction: 'INTEL-ATOM-001 remains closed. Continue the Foundation spine through RETRIEVAL-003 hybrid retrieval on top of the candidate-backed lexical and semantic corpus; keep Strategy Hub review/promote UI, advisor chat, and recommendations blocked until hybrid retrieval, synthesis facts, governed synthesis, and Action Router are live.',
    statusNote: 'Done v1 on 2026-04-27. INTEL-ATOM-001 now has DB-backed intelligence_report_artifacts, intelligence_atoms, intelligence_atom_hits, direct Scoper query fields/helpers, Foundation snapshot exposure, and a repeatable proof command.',
  }, 'intel-atom-proof')

  const snapshot = await getIntelligenceAtomSpineSnapshot({ limit: 10 })

  console.log(JSON.stringify({
    card: updatedCard,
    report,
    atom,
    duplicateAtomProof,
    hit,
    tierGuardProof,
    scoperProof,
    atomSpineSummary: {
      totalAtoms: snapshot.totalAtoms,
      activeAtoms: snapshot.activeAtoms,
      totalReports: snapshot.totalReports,
      totalHits: snapshot.totalHits,
      atomsWithReportArtifact: snapshot.atomsWithReportArtifact,
      atomsWithScoperQueryFields: snapshot.atomsWithScoperQueryFields,
      byStatus: snapshot.byStatus,
      byValueRoute: snapshot.byValueRoute,
    },
  }, null, 2))
}

main()
  .catch(error => {
    console.error('Intelligence atom spine proof failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
