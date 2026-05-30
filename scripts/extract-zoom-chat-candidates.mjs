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
  process.env.ZOOM_CHAT_EXTRACTION_TIMEOUT_MS ||
    process.env.ZOOM_EXTRACTION_TIMEOUT_MS ||
    process.env.SHARED_COMMS_EXTRACTION_TIMEOUT_MS ||
    process.env.LLM_EXTRACTION_TIMEOUT_MS ||
    600000,
);
const EXTRACTION_METHOD = 'zoom_chat_context_v1';
const SUPERSEDED_METHODS = [EXTRACTION_METHOD];
const MAX_CHAT_CHARS = 14000;

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

function isHistoricalZoomChat(artifact) {
  const metadata = artifact?.metadata || {};
  return (
    artifact?.artifactType === 'meeting_note' &&
    metadata.importedFromHistoricalZoom === true &&
    metadata.meetingPlatform === 'zoom' &&
    metadata.zoomArtifactKind === 'chat'
  );
}

async function extractCandidatesFromZoomChat(artifact, foundationContext, model) {
  const systemPromptLines = [
    'You extract governed shared-communication candidates for the Benson Crew Foundation system.',
    'This artifact is a historical Zoom saved chat, not a full transcript. Treat it as partial context only.',
    'Use the chat text plus the supplied Foundation context.',
    'Use the supplied user roster to resolve people, ownership, and who is being discussed.',
    'For each candidate, tag subject_people using roster email addresses only. Use [] when the item is not about a specific person.',
    'For each candidate, assign sensitivity: neutral, positive, performance_concern, termination_risk, comp_discussion, or undisclosed_feedback.',
    'Prefer precision over recall. If evidence is weak, omit the item.',
    'Return only business-relevant items: task_candidate, decision_candidate, blocker, feedback_signal, atom_candidate.',
    'Prioritize merger-era operating context, durable strategy, reusable marketing language, positioning, team proof, founder lessons, repeated objections, lead-generation systems, and decisions with long-term value.',
    'Zoom chats often contain recorder notices, notetaker messages, attendance logistics, and random links. Ignore those unless they identify a real project, campaign, source asset, decision, blocker, or follow-through obligation.',
    'Do not surface passwords, credentials, private tokens, or secret-looking strings in any title, summary, or evidence excerpt. Omit those entirely.',
    'Use task_candidate only for explicit commitments, asks, or follow-through work that still matters as historical operating context.',
    'Use decision_candidate only for actual decisions or explicit agreements.',
    'Use blocker only for explicit impediments, unresolved constraints, or risks.',
    'Use feedback_signal only for repeated feedback or stakeholder sentiment with operating relevance.',
    'Use atom_candidate for durable organizational facts, brand proof, content angles, operating principles, and reusable phrasing worth preserving.',
    'Do not emit duplicate candidates for the same evidence.',
    'Return at most 4 candidates for a Zoom chat.',
    'The links arrays must only contain IDs already present in the supplied Foundation context.',
  ];

  return extractSharedCandidatesWithOpenAi({
    artifact,
    foundationContext,
    model,
    systemPromptLines,
    contentLabel: 'Historical Zoom chat',
    contentText: artifact.contentText || '',
    maxChars: MAX_CHAT_CHARS,
    maxOutputTokens: 2400,
    schemaName: 'zoom_chat_candidates',
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(200, Math.max(1, Number(args.limit || 25)));
  const model = args.model || DEFAULT_MODEL;

  console.log('Extract shared communication candidates from historical Zoom chats');
  console.log(`  Limit: ${limit}`);
  console.log(`  Model: ${model}`);
  console.log(`  Per-call timeout: ${DEFAULT_TIMEOUT_MS}ms`);

  await initFoundationDb();

  const foundationSnapshot = await getFoundationSnapshot();
  const strategyMarkdown = await fs.readFile(STRATEGY_DOC_PATH, 'utf8');
  const foundationContext = buildFoundationExtractionContext(
    foundationSnapshot,
    strategyMarkdown,
    getSourceContracts(),
  );

  const artifacts = (
    await getSharedCommunicationArtifactsForProcessing({
      sourceId: 'SRC-MEETINGS-001',
      artifactType: 'meeting_note',
      limit: 1000,
    })
  )
    .filter(isHistoricalZoomChat)
    .slice(0, limit);

  console.log(`  Archived Zoom chats scanned: ${artifacts.length}`);

  let upserted = 0;
  let failed = 0;
  let rejectedStale = 0;
  const seenFingerprints = new Set();

  for (const artifact of artifacts) {
    let llmForArtifact = null;
    try {
      const extracted = await extractCandidatesFromZoomChat(artifact, foundationContext, model);
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
        sourceId: 'SRC-MEETINGS-001',
        artifactIds: [artifact.artifactId],
        excludeCandidateKeys: persistedCandidateKeys,
        extractionMethods: SUPERSEDED_METHODS,
        actor: 'system',
        reason: 'Historical Zoom chat extraction rerun superseded stale pending candidates after successful replacement extraction.',
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
            script: 'extract-zoom-chat-candidates',
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
            script: 'extract-zoom-chat-candidates',
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
    sourceId: 'SRC-MEETINGS-001',
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
    console.error('Historical Zoom chat candidate extraction failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
