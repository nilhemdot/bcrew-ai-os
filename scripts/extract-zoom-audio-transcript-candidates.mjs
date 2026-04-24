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
  rejectSharedCommunicationCandidatesForArtifacts,
  upsertSharedCommunicationCandidate,
} from '../lib/foundation-db.js';
import {
  buildFoundationExtractionContext,
  extractSharedCandidatesWithOpenAi,
  sanitizeExtractedCandidates,
} from '../lib/shared-candidate-extraction.js';
import { getSourceContracts } from '../lib/source-contracts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const STRATEGY_DOC_PATH = path.join(REPO_ROOT, 'docs', 'business-strategy.md');

const DEFAULT_MODEL = process.env.OPENAI_EXTRACTION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const EXTRACTION_METHOD = 'zoom_audio_transcript_context_v1';
const SUPERSEDED_METHODS = [EXTRACTION_METHOD];
const MAX_TRANSCRIPT_CHARS = 28000;

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

function isHistoricalZoomAudioTranscript(artifact) {
  const metadata = artifact?.metadata || {};
  return (
    artifact?.artifactType === 'meeting_transcript' &&
    metadata.archiveVersion === 'zoom_audio_transcription_v1' &&
    metadata.importedFromHistoricalZoom === true &&
    metadata.meetingPlatform === 'zoom'
  );
}

async function extractCandidatesFromZoomAudioTranscript(artifact, foundationContext, model) {
  const systemPromptLines = [
    'You extract governed shared-communication candidates for the Benson Crew Foundation system.',
    'This artifact is a historical Zoom audio transcript. Treat it as more complete than saved chat, but still historical.',
    'Use the transcript plus the supplied Foundation context.',
    'Use the supplied user roster to resolve people, ownership, and who is being discussed.',
    'For each candidate, tag subject_people using roster email addresses only. Use [] when the item is not about a specific person.',
    'For each candidate, assign sensitivity: neutral, positive, performance_concern, termination_risk, comp_discussion, or undisclosed_feedback.',
    'Prioritize merger-era operating context, durable strategy, reusable marketing language, course material, training frameworks, leadership decisions, repeated objections, and team-building lessons.',
    'Because these are historical meetings, do not surface old one-off tasks unless they are clearly still strategically useful or define a durable operating pattern.',
    'Prefer precision over recall. If evidence is weak, omit the item.',
    'Do not surface passwords, credentials, private tokens, or secret-looking strings in any title, summary, or evidence excerpt. Omit those entirely.',
    'Return only business-relevant items: task_candidate, decision_candidate, blocker, feedback_signal, atom_candidate.',
    'Use atom_candidate for durable organizational facts, founder story proof, content angles, operating principles, training frameworks, and reusable phrasing worth preserving.',
    'Use decision_candidate only for actual decisions or explicit agreements.',
    'Use blocker only for explicit impediments, unresolved constraints, or risks that matter beyond the meeting.',
    'Use feedback_signal only for repeated feedback or stakeholder sentiment with operating relevance.',
    'Do not emit duplicate candidates for the same evidence.',
    'Return at most 10 candidates for a meeting.',
    'The links arrays must only contain IDs already present in the supplied Foundation context.',
  ];

  return extractSharedCandidatesWithOpenAi({
    artifact,
    foundationContext,
    model,
    systemPromptLines,
    contentLabel: 'Historical Zoom audio transcript',
    contentText: artifact.contentText || '',
    maxChars: MAX_TRANSCRIPT_CHARS,
    maxOutputTokens: 3200,
    schemaName: 'zoom_audio_transcript_candidates',
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(50, Math.max(1, Number(args.limit || 10)));
  const model = args.model || DEFAULT_MODEL;

  console.log('Extract shared communication candidates from historical Zoom audio transcripts');
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

  const artifacts = (
    await getSharedCommunicationArtifactsForProcessing({
      sourceId: 'SRC-MEETINGS-001',
      artifactType: 'meeting_transcript',
      limit: 1000,
    })
  )
    .filter(isHistoricalZoomAudioTranscript)
    .slice(0, limit);

  const rejected = await rejectSharedCommunicationCandidatesForArtifacts({
    sourceId: 'SRC-MEETINGS-001',
    artifactIds: artifacts.map(artifact => artifact.artifactId),
    extractionMethods: SUPERSEDED_METHODS,
    actor: 'system',
    reason: 'Historical Zoom audio transcript extraction rerun superseded earlier pending candidates for these artifacts.',
  });

  console.log(`  Rejected stale pending candidates: ${rejected.rejected}`);
  console.log(`  Archived Zoom audio transcripts scanned: ${artifacts.length}`);

  let upserted = 0;
  let failed = 0;
  const seenFingerprints = new Set();

  for (const artifact of artifacts) {
    try {
      const extracted = await extractCandidatesFromZoomAudioTranscript(artifact, foundationContext, model);
      const candidates = sanitizeExtractedCandidates(extracted.candidates, artifact, foundationContext, {
        extractionMethod: EXTRACTION_METHOD,
        model,
      });

      for (const candidate of candidates) {
        const fingerprint = fingerprintCandidate(candidate);
        if (seenFingerprints.has(fingerprint)) continue;
        seenFingerprints.add(fingerprint);
        await upsertSharedCommunicationCandidate(candidate);
        upserted += 1;
      }

      console.log(`  ${artifact.artifactId}: ${candidates.length} candidates`);
    } catch (error) {
      failed += 1;
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
    console.error('Historical Zoom audio transcript candidate extraction failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
