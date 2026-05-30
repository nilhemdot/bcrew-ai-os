#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getSharedCommunicationArtifactsForProcessing,
  getSharedCommunicationArtifactsWithoutCandidatesForProcessing,
  getSharedCommunicationCandidateSnapshot,
  recordSharedCommunicationArtifactProcessingRun,
  rejectSharedCommunicationCandidatesForArtifacts,
  upsertSharedCommunicationCandidate,
} from '../lib/foundation-shared-comms-db.js'
import { getFoundationSnapshot } from '../lib/foundation-strategy-docs-db.js'
import {
  buildFoundationExtractionContext,
  extractSharedCandidatesWithOpenAi,
  getErrorLlmProvenance,
  sanitizeExtractedCandidates,
} from '../lib/shared-candidate-extraction.js';
import { getSourceContracts } from '../lib/source-contracts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const STRATEGY_DOC_PATH = path.join(REPO_ROOT, 'docs', 'business-strategy.md');

const DEFAULT_MODEL = process.env.OPENAI_EXTRACTION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.5';
const DEFAULT_TIMEOUT_MS = Number(
  process.env.MISSIVE_EXTRACTION_TIMEOUT_MS ||
    process.env.SHARED_COMMS_EXTRACTION_TIMEOUT_MS ||
    process.env.LLM_EXTRACTION_TIMEOUT_MS ||
    600000,
);
const EXTRACTION_METHOD = 'missive_thread_context_v1';
const SUPERSEDED_METHODS = [EXTRACTION_METHOD];
const MAX_THREAD_CHARS = 18000;

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function fingerprintCandidate(candidate) {
  const normalizedEvidence = String(candidate.evidenceExcerpt || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return [
    candidate.candidateType,
    String(candidate.ownerHint || '').toLowerCase().trim(),
    normalizedEvidence,
  ].join('|');
}

async function extractCandidatesFromMissiveThread(artifact, foundationContext, model) {
  const systemPromptLines = [
    'You extract governed shared-communication candidates for the Benson Crew Foundation system.',
    'Use the Missive thread plus the supplied Foundation context.',
    'Use the supplied user roster to resolve people, ownership, and who is being discussed.',
    'For each candidate, tag subject_people using roster email addresses only. Use [] when the item is not about a specific person.',
    'For each candidate, assign sensitivity: neutral, positive, performance_concern, termination_risk, comp_discussion, or undisclosed_feedback.',
    'Prefer precision over recall. If evidence is weak, omit the item.',
    'Return only business-relevant items: task_candidate, decision_candidate, blocker, feedback_signal, atom_candidate.',
    'Prioritize internal coordination, real asks, integration work, operating blockers, decisions, routing issues, and durable process facts.',
    'Ignore newsletters, promos, marketing-package notifications, generic vendor blasts, pleasantries, and AI-generated digest emails unless they create a real blocker, decision, or follow-through item.',
    'If a thread is mainly promotional, personal, vendor marketing, auction/newsletter content, or otherwise not relevant to shared team execution, return zero candidates.',
    'Do not create atoms or any other candidates whose only purpose is to say a thread is irrelevant, promotional, or not business-relevant.',
    'Use task_candidate only for explicit commitments, asks, or follow-through work that changes shared execution or system behavior.',
    'Use decision_candidate only for actual decisions or explicit agreements.',
    'Use blocker only for explicit impediments, missing access, unresolved dependencies, or stalled threads.',
    'Use feedback_signal only for repeated feedback or stakeholder sentiment with operating relevance.',
    'Use atom_candidate only for durable organizational facts worth preserving.',
    'Do not emit duplicate candidates for the same evidence.',
    'Return at most 6 candidates for a thread.',
    'The links arrays must only contain IDs already present in the supplied Foundation context.',
  ];

  return extractSharedCandidatesWithOpenAi({
    artifact,
    foundationContext,
    model,
    systemPromptLines,
    contentLabel: 'Missive thread',
    contentText: artifact.contentText || '',
    maxChars: MAX_THREAD_CHARS,
    schemaName: 'missive_thread_candidates',
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(100, Math.max(1, Number(args.limit || 20)));
  const offset = Math.max(0, Number(args.offset || 0) || 0);
  const model = args.model || DEFAULT_MODEL;
  const onlyWithoutCandidates = args.onlyWithoutCandidates === true || args.onlyWithoutCandidates === 'true';

  console.log('Extract shared communication candidates from archived Missive threads');
  console.log(`  Limit: ${limit}`);
  console.log(`  Offset: ${offset}`);
  console.log(`  Model: ${model}`);
  console.log(`  Per-call timeout: ${DEFAULT_TIMEOUT_MS}ms`);
  console.log(`  Only without successful current-content processing: ${onlyWithoutCandidates}`);

  await initFoundationDb();

  const foundationSnapshot = await getFoundationSnapshot();
  const strategyMarkdown = await fs.readFile(STRATEGY_DOC_PATH, 'utf8');
  const foundationContext = buildFoundationExtractionContext(
    foundationSnapshot,
    strategyMarkdown,
    getSourceContracts(),
  );

  const artifactReader = onlyWithoutCandidates
    ? getSharedCommunicationArtifactsWithoutCandidatesForProcessing
    : getSharedCommunicationArtifactsForProcessing;
  const artifacts = await artifactReader({
    sourceId: 'SRC-MISSIVE-001',
    artifactType: 'missive_thread',
    limit,
    offset,
    processingType: 'candidate_extraction',
    extractionMethod: EXTRACTION_METHOD,
  });

  console.log(`  Archived threads scanned: ${artifacts.length}`);

  let upserted = 0;
  let failed = 0;
  let rejectedStale = 0;
  const seenFingerprints = new Set();

  for (const artifact of artifacts) {
    let llmForArtifact = null;
    try {
      const extracted = await extractCandidatesFromMissiveThread(artifact, foundationContext, model);
      const llm = extracted.llm;
      llmForArtifact = llm;
      const candidates = sanitizeExtractedCandidates(extracted.candidates, artifact, foundationContext, {
        extractionMethod: EXTRACTION_METHOD,
        model: llm.model || model,
        llm,
      });

      let persistedForArtifact = 0;
      const persistedCandidateKeys = [];
      for (const candidate of candidates) {
        const fingerprint = fingerprintCandidate(candidate);
        persistedCandidateKeys.push(candidate.candidateKey);
        if (seenFingerprints.has(fingerprint)) continue;
        seenFingerprints.add(fingerprint);
        await upsertSharedCommunicationCandidate(candidate);
        upserted += 1;
        persistedForArtifact += 1;
      }

      const rejected = await rejectSharedCommunicationCandidatesForArtifacts({
        sourceId: 'SRC-MISSIVE-001',
        artifactIds: [artifact.artifactId],
        excludeCandidateKeys: persistedCandidateKeys,
        extractionMethods: SUPERSEDED_METHODS,
        actor: 'system',
        reason: 'Missive extraction rerun superseded stale pending candidates after successful replacement extraction.',
      });
      rejectedStale += rejected.rejected;

      await recordSharedCommunicationArtifactProcessingRun(
        {
          artifactId: artifact.artifactId,
          sourceId: artifact.sourceId,
          artifactType: artifact.artifactType,
          artifactContentHash: artifact.contentHash || '',
          processingType: 'candidate_extraction',
          extractionMethod: EXTRACTION_METHOD,
          provider: llm.provider,
          authPath: llm.authPath,
          routeKey: llm.routeKey,
          model: llm.model || model,
          status: 'succeeded',
          candidateCount: persistedForArtifact,
          metadata: {
            script: 'extract-missive-thread-candidates',
            requestedModel: llm.requestedModel || model,
            llmCallId: llm.callId || null,
          },
        },
        'system',
      );

      console.log(`  ${artifact.artifactId}: ${candidates.length} candidates`);
    } catch (error) {
      failed += 1;
      const llm = getErrorLlmProvenance(error) || llmForArtifact;
      await recordSharedCommunicationArtifactProcessingRun(
        {
          artifactId: artifact.artifactId,
          sourceId: artifact.sourceId,
          artifactType: artifact.artifactType,
          artifactContentHash: artifact.contentHash || '',
          processingType: 'candidate_extraction',
          extractionMethod: EXTRACTION_METHOD,
          provider: llm?.provider,
          authPath: llm?.authPath,
          routeKey: llm?.routeKey,
          model: llm?.model || model,
          status: 'failed',
          candidateCount: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
          metadata: {
            script: 'extract-missive-thread-candidates',
            requestedModel: llm?.requestedModel || model,
            llmCallId: llm?.callId || null,
          },
        },
        'system',
      );
      console.error(
        `  ${artifact.artifactId}: extraction failed -> ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const snapshot = await getSharedCommunicationCandidateSnapshot({
    sourceId: 'SRC-MISSIVE-001',
    status: 'pending',
    limit: 20,
    includeItems: true,
  });

  console.log(`  Candidates upserted this run: ${upserted}`);
  console.log(`  Rejected stale pending candidates: ${rejectedStale}`);
  console.log(`  Pending candidates total: ${snapshot.totalCandidates}`);
  console.log(`  Pending by type: ${JSON.stringify(snapshot.byType)}`);
  if (snapshot.items[0]) {
    console.log(
      `  Latest candidate: ${snapshot.items[0].candidateType} -> ${snapshot.items[0].title} (${snapshot.items[0].ownerHint || 'unassigned'}) [${snapshot.items[0].metadata?.sensitivity || 'neutral'}]`,
    );
  }

  if (failed) {
    process.exitCode = 1;
  }
}

main()
  .catch(error => {
    console.error('Missive thread candidate extraction failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
