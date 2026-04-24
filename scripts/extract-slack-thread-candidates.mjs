#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  closeFoundationDb,
  getFoundationSnapshot,
  getSharedCommunicationArtifactsForProcessing,
  getSharedCommunicationCandidateSnapshot,
  initFoundationDb,
  recordSharedCommunicationArtifactProcessingRun,
  rejectSharedCommunicationCandidatesForArtifacts,
  upsertSharedCommunicationCandidate,
} from '../lib/foundation-db.js';
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

const DEFAULT_MODEL = process.env.OPENAI_EXTRACTION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const EXTRACTION_METHOD = 'slack_thread_context_v1';
const SUPSERSEDED_METHODS = [EXTRACTION_METHOD];
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

async function extractCandidatesFromSlackThread(artifact, foundationContext, model) {
  const systemPromptLines = [
    'You extract governed shared-communication candidates for the Benson Crew Foundation system.',
    'Use the Slack thread plus the supplied Foundation context.',
    'Use the supplied user roster to resolve people, ownership, and who is being discussed.',
    'For each candidate, tag subject_people using roster email addresses only. Use [] when the item is not about a specific person.',
    'For each candidate, assign sensitivity: neutral, positive, performance_concern, termination_risk, comp_discussion, or undisclosed_feedback.',
    'Prefer precision over recall. If evidence is weak, omit the item.',
    'Return only business-relevant items: task_candidate, decision_candidate, blocker, feedback_signal, atom_candidate.',
    'Read the channelName and isPrivate metadata as operating hints. Leadership, owners, and operations channels often carry more durable signals than social or listing chatter.',
    'Capture wins, objections, feedback loops, blockers, approvals, coordination misses, and durable phrases or lessons that could matter for marketing, training, strategy, or ops.',
    'Ignore emoji-only replies, quick acknowledgements, memes, casual banter, and lightweight chatter unless they reveal a repeated pattern, blocker, or culture signal leadership should keep.',
    'Use task_candidate only for explicit commitments, asks, or follow-through work that changes shared execution or system behavior.',
    'Use decision_candidate only for actual decisions or explicit agreements.',
    'Use blocker only for explicit impediments, missing responses, ownership gaps, or stalled coordination.',
    'Use feedback_signal only for repeated sentiment, objection patterns, or noteworthy cultural/retention signals with operating relevance.',
    'Use atom_candidate only for durable organizational facts, phrasing, proof points, or lessons worth preserving.',
    'Do not emit duplicate candidates for the same evidence.',
    'Return at most 6 candidates for a thread.',
    'The links arrays must only contain IDs already present in the supplied Foundation context.',
  ];

  return extractSharedCandidatesWithOpenAi({
    artifact,
    foundationContext,
    model,
    systemPromptLines,
    contentLabel: 'Slack thread',
    contentText: artifact.contentText || '',
    maxChars: MAX_THREAD_CHARS,
    schemaName: 'slack_thread_candidates',
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(100, Math.max(1, Number(args.limit || 5)));
  const model = args.model || DEFAULT_MODEL;

  console.log('Extract shared communication candidates from archived Slack threads');
  console.log(`  Limit: ${limit}`);
  console.log(`  Model: ${model}`);

  await initFoundationDb();

  const foundationSnapshot = await getFoundationSnapshot();
  const strategyMarkdown = await fs.readFile(STRATEGY_DOC_PATH, 'utf8');
  const foundationContext = buildFoundationExtractionContext(
    foundationSnapshot,
    strategyMarkdown,
    getSourceContracts(),
  );

  const artifacts = await getSharedCommunicationArtifactsForProcessing({
    sourceId: 'SRC-SLACK-001',
    artifactType: 'slack_thread',
    limit,
  });

  console.log(`  Archived threads scanned: ${artifacts.length}`);

  let upserted = 0;
  let failed = 0;
  let rejectedStale = 0;
  const seenFingerprints = new Set();

  for (const artifact of artifacts) {
    let llmForArtifact = null;
    try {
      const extracted = await extractCandidatesFromSlackThread(artifact, foundationContext, model);
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
        sourceId: 'SRC-SLACK-001',
        artifactIds: [artifact.artifactId],
        excludeCandidateKeys: persistedCandidateKeys,
        extractionMethods: SUPSERSEDED_METHODS,
        actor: 'system',
        reason: 'Slack extraction rerun superseded stale pending candidates after successful replacement extraction.',
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
            script: 'extract-slack-thread-candidates',
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
            script: 'extract-slack-thread-candidates',
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
    sourceId: 'SRC-SLACK-001',
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
    console.error('Slack thread candidate extraction failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
