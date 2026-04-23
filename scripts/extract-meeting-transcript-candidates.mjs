#!/usr/bin/env node

import { createHash } from 'node:crypto';
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
  rejectSharedCommunicationCandidatesByExtractionMethod,
  upsertSharedCommunicationCandidate,
} from '../lib/foundation-db.js';
import { getSourceContracts } from '../lib/source-contracts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const STRATEGY_DOC_PATH = path.join(REPO_ROOT, 'docs', 'business-strategy.md');

const DEFAULT_MODEL = process.env.OPENAI_EXTRACTION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const EXTRACTION_METHOD = 'meeting_transcript_context_v1';
const SUPSERSEDED_METHODS = ['meeting_next_steps_v1', EXTRACTION_METHOD];
const VALID_CANDIDATE_TYPES = new Set([
  'task_candidate',
  'decision_candidate',
  'blocker',
  'feedback_signal',
  'atom_candidate',
]);
const LOW_SIGNAL_TASK_PATTERNS = [
  /\bopen house\b/i,
  /\bshowings?\b/i,
  /\blisting presentation\b/i,
  /\bphoto shoot\b/i,
  /\baccepted conditional offer\b/i,
];
const MAX_TRANSCRIPT_CHARS = 24000;
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          candidate_type: {
            type: 'string',
            enum: [...VALID_CANDIDATE_TYPES],
          },
          title: { type: 'string' },
          summary: { type: 'string' },
          owner_hint: { type: 'string' },
          evidence_excerpt: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          min_tier: { type: 'integer', enum: [1, 2, 3] },
          links: {
            type: 'object',
            properties: {
              related_backlog_ids: {
                type: 'array',
                items: { type: 'string' },
              },
              related_decision_ids: {
                type: 'array',
                items: { type: 'string' },
              },
              pillar: { type: 'string' },
              participants: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['related_backlog_ids', 'related_decision_ids', 'pillar', 'participants'],
            additionalProperties: false,
          },
        },
        required: [
          'candidate_type',
          'title',
          'summary',
          'owner_hint',
          'evidence_excerpt',
          'confidence',
          'min_tier',
          'links',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['candidates'],
  additionalProperties: false,
};

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function hashText(text) {
  return createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function clampConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.max(0, Math.min(1, numeric));
}

function shorten(text, maxLength) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength - 1).trimEnd() + '…';
}

function compactFoundationContext(snapshot, strategyMarkdown) {
  return {
    strategy: strategyMarkdown.trim(),
    backlog: (snapshot.backlogItems || []).map(item => ({
      id: item.id,
      title: item.title,
      team: item.team,
      lane: item.lane,
      priority: item.priority,
      owner: item.owner || '',
    })),
    decisions: (snapshot.decisions || []).slice(0, 40).map(item => ({
      id: item.id,
      title: item.title,
      category: item.category,
      status: item.status,
      owner: item.decisionOwner || '',
    })),
    openQuestions: (snapshot.openQuestions || []).slice(0, 20).map(item => ({
      id: item.id,
      title: item.title,
      status: item.status,
      owner: item.owner || '',
    })),
    sources: getSourceContracts().map(source => ({
      id: source.id || source.sourceId,
      status: source.status,
      validation: source.validation,
      owner: source.owner || '',
    })),
  };
}

function getOutputText(responseJson) {
  for (const item of responseJson.output || []) {
    for (const contentItem of item.content || []) {
      if (contentItem?.type === 'output_text' && contentItem.text) return contentItem.text;
    }
  }
  return '';
}

function sanitizeLinks(rawLinks, validBacklogIds, validDecisionIds) {
  const links = rawLinks && typeof rawLinks === 'object' ? rawLinks : {};
  return {
    related_backlog_ids: (Array.isArray(links.related_backlog_ids) ? links.related_backlog_ids : [])
      .map(value => String(value || '').trim())
      .filter(value => validBacklogIds.has(value))
      .slice(0, 5),
    related_decision_ids: (Array.isArray(links.related_decision_ids) ? links.related_decision_ids : [])
      .map(value => String(value || '').trim())
      .filter(value => validDecisionIds.has(value))
      .slice(0, 5),
    pillar: shorten(links.pillar || '', 80),
    participants: (Array.isArray(links.participants) ? links.participants : [])
      .map(value => shorten(value || '', 120))
      .filter(Boolean)
      .slice(0, 12),
  };
}

function buildCandidateKey(artifactId, candidateType, title, ownerHint, evidenceExcerpt) {
  const seed = JSON.stringify([
    artifactId,
    candidateType,
    shorten(title, 160),
    shorten(ownerHint, 120),
    shorten(evidenceExcerpt, 280),
  ]);
  return `${artifactId}:${candidateType}:${hashText(seed).slice(0, 16)}`;
}

function sanitizeCandidates(rawCandidates, artifact, foundationContext) {
  const validBacklogIds = new Set((foundationContext.backlog || []).map(item => item.id));
  const validDecisionIds = new Set((foundationContext.decisions || []).map(item => item.id));

  return (Array.isArray(rawCandidates) ? rawCandidates : [])
    .map(rawCandidate => {
      const candidateType = String(rawCandidate?.candidate_type || '').trim();
      if (!VALID_CANDIDATE_TYPES.has(candidateType)) return null;

      const title = shorten(rawCandidate.title || '', 160);
      const summary = shorten(rawCandidate.summary || '', 800);
      const evidenceExcerpt = shorten(rawCandidate.evidence_excerpt || '', 600);
      if (!title || !summary || !evidenceExcerpt) return null;

      const ownerHint = shorten(rawCandidate.owner_hint || '', 120);
      const confidence = clampConfidence(rawCandidate.confidence);
      const minTier = [1, 2, 3].includes(Number(rawCandidate.min_tier)) ? Number(rawCandidate.min_tier) : 3;
      const links = sanitizeLinks(rawCandidate.links, validBacklogIds, validDecisionIds);
      const candidateKey = buildCandidateKey(
        artifact.artifactId,
        candidateType,
        title,
        ownerHint,
        evidenceExcerpt,
      );

      return {
        candidateKey,
        artifactId: artifact.artifactId,
        sourceId: artifact.sourceId,
        candidateType,
        title,
        summary,
        ownerHint,
        evidenceExcerpt,
        confidence,
        metadata: {
          extractionMethod: EXTRACTION_METHOD,
          model: DEFAULT_MODEL,
          minTier,
          links,
          transcriptSource: artifact.metadata?.transcriptSource || 'unknown',
          artifactTitle: artifact.title,
          artifactUpdatedAt: artifact.artifactUpdatedAt,
          foundationContextSummary: {
            backlogItems: foundationContext.backlog.length,
            decisions: foundationContext.decisions.length,
            openQuestions: foundationContext.openQuestions.length,
            sources: foundationContext.sources.length,
          },
        },
      };
    })
    .filter(Boolean);
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for transcript extraction.');
  }

  const transcriptText = shorten(artifact.contentText || '', MAX_TRANSCRIPT_CHARS);
  const systemPrompt = [
    'You extract governed shared-communication candidates for the Benson Crew Foundation system.',
    'Use the transcript plus the supplied Foundation context.',
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
  ].join(' ');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            `Meeting artifact: ${artifact.title}`,
            `Transcript source: ${artifact.metadata?.transcriptSource || 'unknown'}`,
            '',
            'Foundation context:',
            JSON.stringify(foundationContext, null, 2),
            '',
            'Transcript:',
            transcriptText,
          ].join('\n'),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'meeting_transcript_candidates',
          strict: true,
          schema: OUTPUT_SCHEMA,
        },
      },
      max_output_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI extraction failed (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const responseJson = await response.json();
  const outputText = getOutputText(responseJson);
  if (!outputText) {
    throw new Error('OpenAI extraction returned no output text.');
  }

  return JSON.parse(outputText);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(20, Math.max(1, Number(args.limit || 3)));
  const model = args.model || DEFAULT_MODEL;

  console.log('Extract shared communication candidates from archived meeting transcripts');
  console.log(`  Limit: ${limit}`);
  console.log(`  Model: ${model}`);

  await initFoundationDb();

  const foundationSnapshot = await getFoundationSnapshot();
  const strategyMarkdown = await fs.readFile(STRATEGY_DOC_PATH, 'utf8');
  const foundationContext = compactFoundationContext(foundationSnapshot, strategyMarkdown);

  const rejected = await rejectSharedCommunicationCandidatesByExtractionMethod({
    sourceId: 'SRC-MEETINGS-001',
    extractionMethods: SUPSERSEDED_METHODS,
    actor: 'system',
    reason: 'Transcript-first extractor superseded Gemini next-step parsing.',
  });
  console.log(`  Rejected stale pending candidates: ${rejected.rejected}`);

  const artifacts = await getSharedCommunicationArtifactsForProcessing({
    sourceId: 'SRC-MEETINGS-001',
    artifactType: 'meeting_transcript',
    limit,
  });

  console.log(`  Archived transcripts scanned: ${artifacts.length}`);

  let upserted = 0;
  let failed = 0;
  const seenFingerprints = new Set();

  for (const artifact of artifacts) {
    try {
      const extracted = await extractCandidatesFromTranscript(artifact, foundationContext, model);
      const candidates = sanitizeCandidates(extracted.candidates, artifact, foundationContext);

      for (const candidate of candidates) {
        if (isLowSignalTaskCandidate(candidate)) continue;
        const fingerprint = fingerprintCandidate(candidate);
        if (seenFingerprints.has(fingerprint)) continue;
        seenFingerprints.add(fingerprint);
        await upsertSharedCommunicationCandidate(candidate);
        upserted += 1;
      }

      console.log(
        `  ${artifact.artifactId}: ${candidates.length} candidates (${artifact.metadata?.transcriptSource || 'unknown'})`,
      );
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
      `  Latest candidate: ${snapshot.items[0].candidateType} -> ${snapshot.items[0].title} (${snapshot.items[0].ownerHint || 'unassigned'})`,
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
