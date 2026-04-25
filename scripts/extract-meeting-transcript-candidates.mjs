#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  closeFoundationDb,
  getFoundationSnapshot,
  getSharedCommunicationArtifactsForProcessing,
  getSharedCommunicationArtifactsWithoutCandidatesForProcessing,
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
  shorten,
} from '../lib/shared-candidate-extraction.js';
import { getSourceContracts } from '../lib/source-contracts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const STRATEGY_DOC_PATH = path.join(REPO_ROOT, 'docs', 'business-strategy.md');

const DEFAULT_MODEL = process.env.OPENAI_EXTRACTION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const DEFAULT_TIMEOUT_MS = Number(
  process.env.MEETING_TRANSCRIPT_EXTRACTION_TIMEOUT_MS ||
    process.env.LLM_EXTRACTION_TIMEOUT_MS ||
    2700000,
);
const EXTRACTION_METHOD = 'meeting_transcript_context_v2';
const SUPERSEDED_METHODS = ['meeting_next_steps_v1', 'meeting_transcript_context_v1', EXTRACTION_METHOD];
const LOW_SIGNAL_TASK_PATTERNS = [
  /\bopen house\b/i,
  /\bshowings?\b/i,
  /\blisting presentation\b/i,
  /\bphoto shoot\b/i,
  /\baccepted conditional offer\b/i,
];
const MAX_TRANSCRIPT_CHARS = 24000;

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

function isLowSignalTaskCandidate(candidate) {
  if (candidate.candidateType !== 'task_candidate') return false;

  const relatedBacklogCount = candidate.metadata?.links?.related_backlog_ids?.length || 0;
  const relatedDecisionCount = candidate.metadata?.links?.related_decision_ids?.length || 0;
  if (relatedBacklogCount || relatedDecisionCount) return false;

  const haystack = `${candidate.title} ${candidate.evidenceExcerpt}`;
  return LOW_SIGNAL_TASK_PATTERNS.some(pattern => pattern.test(haystack));
}

async function extractCandidatesFromTranscript(artifact, foundationContext, model) {
  const systemPromptLines = [
    'You extract governed shared-communication candidates for the Benson Crew Foundation system.',
    'Use the transcript plus the supplied Foundation context.',
    'Use the supplied user roster to resolve people, ownership, and who is being discussed.',
    'For each candidate, tag subject_people using roster email addresses only. Use [] when the item is not about a specific person.',
    'For each candidate, assign sensitivity: neutral, positive, performance_concern, termination_risk, comp_discussion, or undisclosed_feedback.',
    'Read the meetingClass and privacyProfile fields from the privacy/source metadata and treat them as a real operating hint, not noise.',
    'Broadcast meetings still matter: capture durable marketing phrasing, training insight, repeated objections, wins, lessons, and reusable atoms when they are genuinely durable.',
    'Training, all-hands, huddles, sales sessions, workshops, and broad team meetings usually stay neutral or positive unless the transcript explicitly contains sensitive people discussion.',
    'Do not mark ordinary coaching, planning, or public praise as performance_concern. Reserve sensitive labels for explicit negative evaluation, comp, termination, or undisclosed feedback about named people.',
    'Prefer precision over recall. If evidence is weak, omit the item.',
    'Never extract from Gemini summaries or bullet lists. Use transcript evidence only.',
    'Only emit items the system should still care about after the meeting ends.',
    'Ignore routine round-robin day plans, ordinary sales hustle updates, showings, listing presentations, open houses, personal errands, and casual chatter unless they create a cross-team dependency, a real blocker, or a decision that leadership should track.',
    'Ignore personal health details, coffee/food chatter, generic attendance logistics, and calendar schedule mentions unless they materially change shared execution.',
    'Return only business-relevant items: task_candidate, decision_candidate, blocker, feedback_signal, atom_candidate.',
    'Use task_candidate only for explicit commitments, assignments, or follow-through work that changes shared execution, systems, governance, or team accountability.',
    'Exclude one-person same-day marketing or sales deliverables unless they create a tracked shared dependency.',
    'Use decision_candidate only for actual decisions or explicit agreements.',
    'Use blocker only for explicit impediments, risks, or unresolved constraints.',
    'Use feedback_signal only for sentiment or repeated feedback with operating relevance.',
    'Use atom_candidate only for durable organizational facts worth preserving. Do not emit one-day priorities as atoms.',
    'Do not emit meeting logistics or future meeting attendance plans as decision candidates.',
    'Task candidates should usually be things the system could route into backlog, review, or accountable follow-through. Exclude ordinary same-day individual appointments unless they create a shared dependency.',
    'Do not emit duplicate candidates for the same evidence.',
    'Return at most 8 candidates for a meeting.',
    'The links arrays must only contain IDs already present in the supplied Foundation context.',
  ];

  return extractSharedCandidatesWithOpenAi({
    artifact,
    foundationContext,
    model,
    systemPromptLines,
    contentLabel: 'Transcript',
    contentText: artifact.contentText || '',
    maxChars: MAX_TRANSCRIPT_CHARS,
    schemaName: 'meeting_transcript_candidates',
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(300, Math.max(1, Number(args.limit || 3)));
  const model = args.model || DEFAULT_MODEL;
  const onlyWithoutCandidates = args.onlyWithoutCandidates === true || args.onlyWithoutCandidates === 'true';

  console.log('Extract shared communication candidates from archived meeting transcripts');
  console.log(`  Limit: ${limit}`);
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
  const artifacts = (
    await artifactReader({
      sourceId: 'SRC-MEETINGS-001',
      artifactType: 'meeting_transcript',
      limit: Math.max(limit * 3, 10),
      processingType: 'candidate_extraction',
      extractionMethod: EXTRACTION_METHOD,
    })
  )
    .filter(
      artifact =>
        artifact?.metadata?.archiveVersion === 'meeting_archive_v2' ||
        String(artifact.externalId || '').startsWith('meeting:'),
    )
    .slice(0, limit);

  console.log(`  Archived transcripts scanned: ${artifacts.length}`);

  let upserted = 0;
  let failed = 0;
  let rejectedStale = 0;
  const seenFingerprints = new Set();

  for (const artifact of artifacts) {
    let llmForArtifact = null;
    try {
      const extracted = await extractCandidatesFromTranscript(artifact, foundationContext, model);
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
        if (isLowSignalTaskCandidate(candidate)) continue;
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
        reason: 'Transcript-first extractor superseded stale meeting candidates after successful replacement extraction.',
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
            script: 'extract-meeting-transcript-candidates',
            requestedModel: llm.requestedModel || model,
            llmCallId: llm.callId || null,
          },
        },
        'system',
      );

      console.log(
        `  ${artifact.artifactId}: ${candidates.length} candidates (${artifact.metadata?.transcriptSource || 'unknown'})`,
      );
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
            script: 'extract-meeting-transcript-candidates',
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
    console.error('Meeting transcript candidate extraction failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
