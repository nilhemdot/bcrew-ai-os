import { createHash } from 'node:crypto';
import { callLlm } from './llm-router.js';

export const VALID_CANDIDATE_TYPES = new Set([
  'task_candidate',
  'decision_candidate',
  'blocker',
  'feedback_signal',
  'atom_candidate',
]);

export const VALID_SENSITIVITIES = new Set([
  'neutral',
  'positive',
  'performance_concern',
  'termination_risk',
  'comp_discussion',
  'undisclosed_feedback',
]);

export const SHARED_CANDIDATE_OUTPUT_SCHEMA = {
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
          subject_people: {
            type: 'array',
            items: { type: 'string' },
          },
          sensitivity: {
            type: 'string',
            enum: [...VALID_SENSITIVITIES],
          },
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
          'subject_people',
          'sensitivity',
          'links',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['candidates'],
  additionalProperties: false,
};

export function clampConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.max(0, Math.min(1, numeric));
}

export function shorten(text, maxLength) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength - 1).trimEnd() + '…';
}

export function buildFoundationExtractionContext(snapshot, strategyMarkdown, sourceContracts) {
  return {
    strategy: strategyMarkdown.trim(),
    users: (snapshot.users || []).map(user => ({
      email: user.email,
      name: user.name,
      tier: user.tier,
      userType: user.userType,
      meetingSyncEnabled: user.meetingSyncEnabled,
    })),
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
    sources: (Array.isArray(sourceContracts) ? sourceContracts : []).map(source => ({
      id: source.id || source.sourceId,
      status: source.status,
      validation: source.validation,
      owner: source.owner || '',
    })),
  };
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

function buildUserDirectory(foundationContext) {
  const byEmail = new Map();
  const byName = new Map();

  for (const user of foundationContext.users || []) {
    const email = String(user?.email || '').trim().toLowerCase();
    const name = String(user?.name || '').trim().toLowerCase();
    if (email) byEmail.set(email, email);
    if (name && email) byName.set(name, email);
  }

  return { byEmail, byName };
}

function sanitizeSubjectPeople(rawSubjectPeople, userDirectory) {
  const normalized = [];
  const seen = new Set();

  for (const value of Array.isArray(rawSubjectPeople) ? rawSubjectPeople : []) {
    const raw = String(value || '').trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();
    const resolvedEmail = userDirectory.byEmail.get(lower) || userDirectory.byName.get(lower) || '';
    if (!resolvedEmail || seen.has(resolvedEmail)) continue;
    seen.add(resolvedEmail);
    normalized.push(resolvedEmail);
  }

  return normalized.slice(0, 12);
}

function normalizeSensitivity(rawSensitivity) {
  const normalized = String(rawSensitivity || '').trim().toLowerCase();
  return VALID_SENSITIVITIES.has(normalized) ? normalized : 'neutral';
}

function clampMinTierForSensitivity(minTier, sensitivity) {
  if (sensitivity === 'termination_risk' || sensitivity === 'comp_discussion' || sensitivity === 'undisclosed_feedback') {
    return 1;
  }
  if (sensitivity === 'performance_concern') {
    return Math.min(Number(minTier || 3), 2);
  }
  return Number(minTier || 3);
}

function buildCandidateKey(artifactId, candidateType, title, ownerHint, evidenceExcerpt, sensitivity, subjectPeople) {
  const seed = JSON.stringify([
    artifactId,
    candidateType,
    shorten(title, 160),
    shorten(ownerHint, 120),
    shorten(evidenceExcerpt, 280),
    sensitivity,
    [...subjectPeople].sort(),
  ]);

  return `${artifactId}:${candidateType}:${createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 16)}`;
}

export function sanitizeExtractedCandidates(rawCandidates, artifact, foundationContext, { extractionMethod, model }) {
  const validBacklogIds = new Set((foundationContext.backlog || []).map(item => item.id));
  const validDecisionIds = new Set((foundationContext.decisions || []).map(item => item.id));
  const userDirectory = buildUserDirectory(foundationContext);

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
      const requestedMinTier = [1, 2, 3].includes(Number(rawCandidate.min_tier)) ? Number(rawCandidate.min_tier) : 3;
      const sensitivity = normalizeSensitivity(rawCandidate.sensitivity);
      const minTier = clampMinTierForSensitivity(requestedMinTier, sensitivity);
      const subjectPeople = sanitizeSubjectPeople(rawCandidate.subject_people, userDirectory);
      const links = sanitizeLinks(rawCandidate.links, validBacklogIds, validDecisionIds);
      const candidateKey = buildCandidateKey(
        artifact.artifactId,
        candidateType,
        title,
        ownerHint,
        evidenceExcerpt,
        sensitivity,
        subjectPeople,
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
          extractionMethod,
          model,
          minTier,
          subjectPeople,
          sensitivity,
          links,
          contentSource: artifact.metadata?.transcriptSource || artifact.artifactType || 'unknown',
          artifactTitle: artifact.title,
          artifactUpdatedAt: artifact.artifactUpdatedAt,
          foundationContextSummary: {
            users: foundationContext.users.length,
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

export async function extractSharedCandidatesWithOpenAi({
  artifact,
  foundationContext,
  model,
  systemPromptLines,
  contentLabel,
  contentText,
  maxChars = 24000,
  maxOutputTokens = 3000,
  schemaName = 'shared_communication_candidates',
}) {
  const normalizedPrompt = (Array.isArray(systemPromptLines) ? systemPromptLines : [])
    .map(line => String(line || '').trim())
    .filter(Boolean)
    .join(' ');

  const trimmedContent = shorten(contentText || '', maxChars);
  const llmResult = await callLlm({
    workload: 'extraction',
    hubKey: 'foundation',
    messages: [
      {
        role: 'system',
        content: normalizedPrompt,
      },
      {
        role: 'user',
        content: [
          `Artifact: ${artifact.title}`,
          `Artifact type: ${artifact.artifactType}`,
          `Source id: ${artifact.sourceId}`,
          `Privacy/source metadata: ${JSON.stringify(artifact.metadata || {})}`,
          '',
          'Foundation context:',
          JSON.stringify(foundationContext, null, 2),
          '',
          `${contentLabel}:`,
          trimmedContent,
        ].join('\n'),
      },
    ],
    responseFormat: {
      type: 'json_schema',
      name: schemaName,
      strict: true,
      schema: SHARED_CANDIDATE_OUTPUT_SCHEMA,
    },
    maxOutputTokens,
    dryRun: false,
    metadata: {
      requestedModel: model,
      artifactId: artifact.artifactId,
      sourceId: artifact.sourceId,
      artifactType: artifact.artifactType,
      schemaName,
    },
  });
  const outputText = llmResult.outputText;
  if (!outputText) {
    throw new Error('LLM extraction returned no output text.');
  }

  return JSON.parse(outputText);
}
