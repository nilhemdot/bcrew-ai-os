#!/usr/bin/env node

import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import {
  closeFoundationDb,
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
  initFoundationDb,
  recordSharedCommunicationSynthesisRun,
} from '../lib/foundation-db.js';
import { callLlm } from '../lib/llm-router.js';
import { getSourceContracts } from '../lib/source-contracts.js';
import { shorten } from '../lib/shared-candidate-extraction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_MODEL = process.env.STRATEGY_PACKET_MODEL ||
  process.env.OPENAI_SYNTHESIS_MODEL ||
  process.env.OPENAI_MODEL ||
  'gpt-5.4';
const DEFAULT_TIMEOUT_MS = Number(
  process.env.STRATEGY_PACKET_TIMEOUT_MS ||
    process.env.SHARED_COMMS_SYNTHESIS_TIMEOUT_MS ||
    process.env.LLM_SYNTHESIS_TIMEOUT_MS ||
    process.env.LLM_TIMEOUT_MS ||
    2700000,
);

const STRATEGY_DOC_PATHS = [
  'docs/business-strategy.md',
  'docs/strategy/quarterly-priorities.md',
  'docs/strategy/strategic-issues.md',
  'docs/strategy/agent-engine.md',
  'docs/strategy/governance.md',
  'docs/strategy/department-mandates.md',
  'docs/strategy/core-values.md',
  'docs/system-strategy.md',
];

const STRATEGY_ARTIFACT_SOURCE_IDS = [
  'SRC-GDRIVE-001',
  'SRC-YOUTUBE-INTEL-001',
  'SRC-MEETINGS-001',
  'SRC-GMAIL-001',
];

const OPERATING_TRUTH_SOURCE_IDS = [
  'SRC-OWNERS-001',
  'SRC-FINANCE-001',
  'SRC-FUB-001',
  'SRC-SUPABASE-001',
  'SRC-FREEDOM-BHAG-001',
  'SRC-FREEDOM-ENGINE-001',
];

const EXCERPT_TERMS = [
  'strategic issue',
  'strategy',
  'q2',
  'quarter',
  'priority',
  'goal',
  'sales',
  'pipeline',
  'lead',
  'appointment',
  'shopping list',
  'finance',
  'profit',
  'cash',
  'agent',
  'roster',
  'recruit',
  'retention',
  'marketing',
  'content',
  'system',
  'automation',
  'ai',
  'execution',
  'blocker',
  'risk',
  'decision',
];

const VALID_ITEM_TYPES = new Set([
  'decision',
  'blocker',
  'action_item',
  'strategic_issue',
  'pattern',
  'content_atom',
  'source_trust_issue',
]);

const VALID_STATUSES = new Set([
  'new',
  'active',
  'needs_decision',
  'needs_owner',
  'stale_watch',
  'historical_context',
  'likely_resolved',
]);

const VALID_SENSITIVITIES = new Set([
  'neutral',
  'positive',
  'performance_concern',
  'termination_risk',
  'comp_discussion',
  'undisclosed_feedback',
]);

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    executive_summary: { type: 'string' },
    strategy_readiness: {
      type: 'object',
      properties: {
        ready_to_use: { type: 'boolean' },
        readiness_label: { type: 'string' },
        most_important_gap: { type: 'string' },
        caveats: { type: 'array', items: { type: 'string' } },
      },
      required: ['ready_to_use', 'readiness_label', 'most_important_gap', 'caveats'],
      additionalProperties: false,
    },
    source_coverage: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source_id: { type: 'string' },
          evidence_read: { type: 'integer' },
          useful_signal: { type: 'string' },
          caveat: { type: 'string' },
        },
        required: ['source_id', 'evidence_read', 'useful_signal', 'caveat'],
        additionalProperties: false,
      },
    },
    strategic_issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rank: { type: 'integer' },
          title: { type: 'string' },
          status: {
            type: 'string',
            enum: ['new', 'active', 'needs_decision', 'needs_owner', 'stale_watch', 'historical_context', 'likely_resolved'],
          },
          current_reality: { type: 'string' },
          why_now: { type: 'string' },
          recommended_decision: { type: 'string' },
          next_action: { type: 'string' },
          owner_hint: { type: 'string' },
          evidence_summary: { type: 'string' },
          source_ids: { type: 'array', items: { type: 'string' } },
          candidate_keys: { type: 'array', items: { type: 'string' } },
          artifact_ids: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sensitivity: {
            type: 'string',
            enum: ['neutral', 'positive', 'performance_concern', 'termination_risk', 'comp_discussion', 'undisclosed_feedback'],
          },
        },
        required: [
          'rank',
          'title',
          'status',
          'current_reality',
          'why_now',
          'recommended_decision',
          'next_action',
          'owner_hint',
          'evidence_summary',
          'source_ids',
          'candidate_keys',
          'artifact_ids',
          'confidence',
          'sensitivity',
        ],
        additionalProperties: false,
      },
    },
    decision_candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rank: { type: 'integer' },
          decision_question: { type: 'string' },
          recommended_option: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          evidence_summary: { type: 'string' },
          source_ids: { type: 'array', items: { type: 'string' } },
          candidate_keys: { type: 'array', items: { type: 'string' } },
          artifact_ids: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sensitivity: {
            type: 'string',
            enum: ['neutral', 'positive', 'performance_concern', 'termination_risk', 'comp_discussion', 'undisclosed_feedback'],
          },
        },
        required: [
          'rank',
          'decision_question',
          'recommended_option',
          'options',
          'evidence_summary',
          'source_ids',
          'candidate_keys',
          'artifact_ids',
          'confidence',
          'sensitivity',
        ],
        additionalProperties: false,
      },
    },
    recommended_90_day_priorities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rank: { type: 'integer' },
          priority: { type: 'string' },
          expected_outcome: { type: 'string' },
          leading_metrics: { type: 'array', items: { type: 'string' } },
          owner_hint: { type: 'string' },
          why_this_matters: { type: 'string' },
          evidence_summary: { type: 'string' },
          source_ids: { type: 'array', items: { type: 'string' } },
          candidate_keys: { type: 'array', items: { type: 'string' } },
          artifact_ids: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sensitivity: {
            type: 'string',
            enum: ['neutral', 'positive', 'performance_concern', 'termination_risk', 'comp_discussion', 'undisclosed_feedback'],
          },
        },
        required: [
          'rank',
          'priority',
          'expected_outcome',
          'leading_metrics',
          'owner_hint',
          'why_this_matters',
          'evidence_summary',
          'source_ids',
          'candidate_keys',
          'artifact_ids',
          'confidence',
          'sensitivity',
        ],
        additionalProperties: false,
      },
    },
    open_questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          why_it_matters: { type: 'string' },
          suggested_owner: { type: 'string' },
          source_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['question', 'why_it_matters', 'suggested_owner', 'source_ids'],
        additionalProperties: false,
      },
    },
    suppressed_or_deferred: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['topic', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'title',
    'executive_summary',
    'strategy_readiness',
    'source_coverage',
    'strategic_issues',
    'decision_candidates',
    'recommended_90_day_priorities',
    'open_questions',
    'suppressed_or_deferred',
  ],
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

function boolArg(value) {
  return value === true || value === 'true' || value === '1';
}

function printHelp() {
  console.log(`Generate a Strategy Evidence Packet v1.

Usage:
  npm run strategy:evidence-packet -- [options]

Options:
  --limit=N          Candidate rows to read. Default: 180.
  --days=N           Restrict communication candidates to the last N days. Default: all pending.
  --artifactLimit=N  Direct Drive/video/attachment artifacts to sample. Default: 28.
  --maxItems=N       Maximum ranked strategy items. Default: 18.
  --model=MODEL      Requested model label for routing metadata.
  --out=PATH         Write markdown packet to a file.
  --plan             Print input shape without calling the LLM.
  --dryRun           Alias for --plan.
  --help             Show this help.
`);
}

function getPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  });
}

function compactTimestamp(value) {
  return String(value || new Date().toISOString())
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
}

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 10);
}

function buildRunId({ generatedAt, model, candidatesRead, artifactCount, title }) {
  return `strategy-packet-${compactTimestamp(generatedAt)}-${stableHash(`${model}:${candidatesRead}:${artifactCount}:${title}`)}`;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function excerptAround(text, index, radius) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end);
}

function buildSmartExcerpt(text, maxChars = 2600) {
  const normalized = normalizeText(text);
  if (normalized.length <= maxChars) return normalized;

  const chunks = [normalized.slice(0, Math.floor(maxChars * 0.32))];
  const lower = normalized.toLowerCase();
  const seen = new Set(['start']);

  for (const term of EXCERPT_TERMS) {
    const index = lower.indexOf(term);
    if (index === -1) continue;
    const bucket = Math.floor(index / 700);
    if (seen.has(bucket)) continue;
    seen.add(bucket);
    chunks.push(excerptAround(normalized, index, 520));
    if (chunks.join(' ... ').length >= maxChars) break;
  }

  return shorten(chunks.join(' ... '), maxChars);
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item || '').trim()).filter(Boolean);
}

function normalizeSourceIds(value, allowedSourceIds) {
  const allowed = new Set(allowedSourceIds);
  return [...new Set(normalizeArray(value).filter(sourceId => allowed.has(sourceId)))];
}

function normalizeStatus(value, fallback = 'needs_decision') {
  const normalized = String(value || '').trim();
  return VALID_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizeSensitivity(value) {
  const normalized = String(value || '').trim();
  return VALID_SENSITIVITIES.has(normalized) ? normalized : 'neutral';
}

function normalizeConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.max(0, Math.min(1, numeric));
}

function parseJsonObject(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Strategy packet returned no output text.');

  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    const first = withoutFence.indexOf('{');
    const last = withoutFence.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) throw new Error('Strategy packet output was not valid JSON.');
    return JSON.parse(withoutFence.slice(first, last + 1));
  }
}

function normalizeCandidateRow(row) {
  const metadata = row.metadata || {};
  const links = metadata.links || {};
  return {
    candidate_key: row.candidate_key,
    artifact_id: row.artifact_id,
    candidate_type: row.candidate_type,
    source_id: row.source_id,
    title: shorten(row.title || '', 180),
    summary: shorten(row.summary || '', 540),
    owner_hint: shorten(row.owner_hint || '', 120),
    evidence_excerpt: shorten(row.evidence_excerpt || '', 420),
    confidence: row.confidence == null ? null : Number(row.confidence),
    sensitivity: metadata.sensitivity || 'neutral',
    subject_people: metadata.subjectPeople || metadata.subject_people || [],
    artifact_title: shorten(row.artifact_title || '', 180),
    artifact_type: row.artifact_type || '',
    artifact_updated_at: row.artifact_updated_at,
    participants: Array.isArray(row.participants) ? row.participants.slice(0, 10) : [],
    pillar: links.pillar || '',
  };
}

function normalizeArtifactRow(row, maxExcerptChars) {
  return {
    artifact_id: row.artifact_id,
    source_id: row.source_id,
    artifact_type: row.artifact_type,
    title: shorten(row.title || '', 220),
    source_url: row.source_url || '',
    artifact_updated_at: row.artifact_updated_at,
    content_length: Number(row.content_length || 0),
    metadata: row.metadata || {},
    excerpt: buildSmartExcerpt(row.content_text || '', maxExcerptChars),
  };
}

async function fetchCandidates(pool, { limit, days }) {
  const values = ['pending'];
  const filters = [`c.status = $1`];

  if (days) {
    values.push(`${Math.max(1, Number(days) || 30)} days`);
    filters.push(`COALESCE(a.artifact_updated_at, c.updated_at) >= NOW() - $${values.length}::interval`);
  }

  values.push(limit);
  const result = await pool.query(
    `
      SELECT c.candidate_key, c.artifact_id, c.source_id, c.candidate_type,
             c.title, c.summary, c.owner_hint, c.evidence_excerpt,
             c.confidence, c.metadata, a.title AS artifact_title,
             a.artifact_type, a.artifact_updated_at, a.participants
      FROM shared_communication_candidates c
      JOIN shared_communication_artifacts a ON a.artifact_id = c.artifact_id
      WHERE ${filters.join(' AND ')}
      ORDER BY
        CASE c.candidate_type
          WHEN 'blocker' THEN 1
          WHEN 'decision_candidate' THEN 2
          WHEN 'task_candidate' THEN 3
          WHEN 'feedback_signal' THEN 4
          ELSE 5
        END,
        COALESCE(a.artifact_updated_at, c.updated_at) DESC,
        c.confidence DESC NULLS LAST
      LIMIT $${values.length}
    `,
    values,
  );

  return result.rows.map(normalizeCandidateRow);
}

async function fetchCandidateSummary(pool) {
  const result = await pool.query(
    `
      SELECT source_id, candidate_type, status, count(*)::int total
      FROM shared_communication_candidates
      GROUP BY source_id, candidate_type, status
      ORDER BY source_id, candidate_type, status
    `,
  );
  return result.rows;
}

async function fetchArchiveSummary(pool) {
  const result = await pool.query(
    `
      SELECT source_id, artifact_type, count(*)::int total,
             min(artifact_updated_at) oldest,
             max(artifact_updated_at) newest,
             sum(length(content_text))::int content_chars
      FROM shared_communication_artifacts
      GROUP BY source_id, artifact_type
      ORDER BY source_id, artifact_type
    `,
  );
  return result.rows;
}

async function fetchStrategyArtifacts(pool, { limit, maxExcerptChars }) {
  const driveLimit = Math.max(8, Math.floor(limit * 0.46));
  const gmailLimit = Math.max(5, Math.floor(limit * 0.24));
  const meetingLimit = Math.max(3, Math.floor(limit * 0.16));
  const youtubeLimit = Math.max(3, Math.floor(limit * 0.14));
  const result = await pool.query(
    `
      WITH scored AS (
        SELECT artifact_id, source_id, artifact_type, title, source_url,
               artifact_updated_at, metadata, content_text, length(content_text) AS content_length,
               CASE
                 WHEN lower(title) LIKE '%kt binder%' THEN 1
                 WHEN lower(title) LIKE '%ai team%' THEN 2
                 WHEN lower(title) LIKE '%mycro%' THEN 3
                 WHEN lower(title) LIKE '%prestrat%' THEN 4
                 WHEN lower(title) LIKE '%strategy%' THEN 5
                 WHEN lower(title) LIKE '%vision%' THEN 6
                 WHEN lower(title) LIKE '%core value%' THEN 7
                 WHEN source_id = 'SRC-MEETINGS-001' THEN 8
                 WHEN source_id = 'SRC-YOUTUBE-INTEL-001' THEN 9
                 ELSE 20
               END AS priority_rank,
               row_number() OVER (
                 PARTITION BY source_id
                 ORDER BY
                   CASE
                     WHEN lower(title) LIKE '%kt binder%' THEN 1
                     WHEN lower(title) LIKE '%ai team%' THEN 2
                     WHEN lower(title) LIKE '%mycro%' THEN 3
                     WHEN lower(title) LIKE '%prestrat%' THEN 4
                     WHEN lower(title) LIKE '%strategy%' THEN 5
                     WHEN lower(title) LIKE '%vision%' THEN 6
                     WHEN lower(title) LIKE '%core value%' THEN 7
                     WHEN source_id = 'SRC-MEETINGS-001' THEN 8
                     WHEN source_id = 'SRC-YOUTUBE-INTEL-001' THEN 9
                     ELSE 20
                   END,
                   artifact_updated_at DESC NULLS LAST,
                   ingested_at DESC
               ) AS source_rank
        FROM shared_communication_artifacts
        WHERE source_id = ANY($1::text[])
          AND length(content_text) > 0
      )
      SELECT artifact_id, source_id, artifact_type, title, source_url,
             artifact_updated_at, metadata, content_text, content_length
      FROM scored
      WHERE (source_id = 'SRC-GDRIVE-001' AND source_rank <= $2)
         OR (source_id = 'SRC-GMAIL-001' AND source_rank <= $3)
         OR (source_id = 'SRC-MEETINGS-001' AND source_rank <= $4)
         OR (source_id = 'SRC-YOUTUBE-INTEL-001' AND source_rank <= $5)
      ORDER BY priority_rank, artifact_updated_at DESC NULLS LAST
      LIMIT $6
    `,
    [STRATEGY_ARTIFACT_SOURCE_IDS, driveLimit, gmailLimit, meetingLimit, youtubeLimit, limit],
  );

  return result.rows.map(row => normalizeArtifactRow(row, maxExcerptChars));
}

async function fetchSourceFacts(pool) {
  const [
    docFacts,
    strategyGoalTruth,
    strategyOperatingTruth,
    criticalBacklog,
    decisions,
    openQuestions,
    recentChanges,
    jobRuns,
    crawlTargets,
  ] = await Promise.all([
    pool.query(
      `
        SELECT source_id, group_title, label, value, detail, as_of
        FROM doc_source_snapshots
        ORDER BY doc_path ASC, group_title ASC, sort_order ASC, updated_at DESC
        LIMIT 100
      `,
    ),
    getStrategyGoalTruthSnapshot(),
    getStrategyOperatingTruthSnapshot(),
    pool.query(
      `
        SELECT id, title, team, lane, priority, summary, next_action, status_note
        FROM backlog_items
        WHERE lane <> 'done'
          AND priority IN ('P0', 'P1')
        ORDER BY
          CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END,
          CASE lane WHEN 'executing' THEN 0 WHEN 'ranked' THEN 1 WHEN 'scoped' THEN 2 ELSE 3 END,
          rank NULLS LAST,
          updated_at DESC
        LIMIT 60
      `,
    ),
    pool.query(
      `
        SELECT id, title, category, status, summary, decision_owner,
               source_ref, context_ref, evidence_notes, created_at
        FROM decisions
        ORDER BY
          CASE status WHEN 'locked' THEN 0 WHEN 'proposed' THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT 30
      `,
    ),
    pool.query(
      `
        SELECT id, title, summary, owner, status
        FROM open_questions
        WHERE status = 'open'
        ORDER BY created_at ASC
        LIMIT 30
      `,
    ),
    pool.query(
      `
        SELECT event_type, entity_table, entity_id, summary, created_at
        FROM change_events
        ORDER BY created_at DESC
        LIMIT 35
      `,
    ),
    pool.query(
      `
        SELECT DISTINCT ON (job_key)
               job_key, title, job_type, status, finished_at, started_at,
               duration_ms, error_message
        FROM foundation_job_runs
        ORDER BY job_key, COALESCE(finished_at, started_at, created_at) DESC
      `,
    ),
    pool.query(
      `
        SELECT target_key, source_id, title, lane, status, runtime_mode,
               last_status, last_run_at, inspected_count, archived_count,
               extracted_count, cursor_state
        FROM source_crawl_targets
        ORDER BY priority ASC, target_key ASC
        LIMIT 40
      `,
    ),
  ]);

  return {
    doc_source_facts: docFacts.rows.map(row => ({
      source_id: row.source_id,
      group: row.group_title,
      label: row.label,
      value: row.value,
      detail: shorten(row.detail || '', 240),
      as_of: row.as_of,
    })),
    current_goal_truth: strategyGoalTruth,
    current_operating_truth: strategyOperatingTruth,
    critical_backlog: criticalBacklog.rows.map(row => ({
      id: row.id,
      title: row.title,
      scope: row.team,
      lane: row.lane,
      priority: row.priority,
      summary: shorten(row.summary || '', 300),
      next_action: shorten(row.next_action || '', 300),
      status_note: shorten(row.status_note || '', 300),
    })),
    decisions: decisions.rows.map(row => ({
      id: row.id,
      title: row.title,
      category: row.category,
      status: row.status,
      summary: shorten(row.summary || '', 300),
      owner: row.decision_owner || '',
      source_ref: row.source_ref || '',
      context_ref: row.context_ref || '',
      evidence_notes: shorten(row.evidence_notes || '', 260),
      created_at: row.created_at,
    })),
    open_questions: openQuestions.rows.map(row => ({
      id: row.id,
      title: row.title,
      summary: shorten(row.summary || '', 300),
      owner: row.owner || '',
      status: row.status,
    })),
    recent_changes: recentChanges.rows.map(row => ({
      event_type: row.event_type,
      entity_table: row.entity_table,
      entity_id: row.entity_id,
      summary: shorten(row.summary || '', 240),
      created_at: row.created_at,
    })),
    latest_job_runs: jobRuns.rows.map(row => ({
      job_key: row.job_key,
      title: row.title,
      job_type: row.job_type,
      status: row.status,
      finished_at: row.finished_at,
      started_at: row.started_at,
      duration_ms: row.duration_ms,
      error: shorten(row.error_message || '', 220),
    })),
    crawl_targets: crawlTargets.rows.map(row => ({
      target_key: row.target_key,
      source_id: row.source_id,
      title: row.title,
      lane: row.lane,
      status: row.status,
      runtime_mode: row.runtime_mode,
      last_status: row.last_status,
      last_run_at: row.last_run_at,
      inspected_count: row.inspected_count,
      archived_count: row.archived_count,
      extracted_count: row.extracted_count,
      cursor_state: row.cursor_state || {},
    })),
  };
}

async function readStrategyDocs() {
  const docs = [];
  for (const relativePath of STRATEGY_DOC_PATHS) {
    const fullPath = path.join(REPO_ROOT, relativePath);
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const headings = content
        .split('\n')
        .filter(line => /^#{1,3}\s+/.test(line))
        .map(line => line.replace(/^#{1,3}\s+/, '').trim())
        .slice(0, 18);
      docs.push({
        path: relativePath,
        title: headings[0] || path.basename(relativePath),
        headings,
        excerpt: buildSmartExcerpt(content, 3400),
      });
    } catch (error) {
      docs.push({
        path: relativePath,
        title: path.basename(relativePath),
        headings: [],
        excerpt: `Missing or unreadable: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return docs;
}

function buildInputSummary({ candidates, artifacts, archiveSummary, candidateSummary, sourceFacts, strategyDocs }) {
  return {
    candidate_count: candidates.length,
    direct_artifact_count: artifacts.length,
    strategy_doc_count: strategyDocs.length,
    archive_summary_rows: archiveSummary.length,
    candidate_summary_rows: candidateSummary.length,
    source_fact_counts: {
      doc_source_facts: sourceFacts.doc_source_facts.length,
      current_goal_truth_groups: sourceFacts.current_goal_truth?.groups?.length || 0,
      current_operating_truth_sources: sourceFacts.current_operating_truth?.sourceCards?.length || 0,
      operating_truth_source_ids: OPERATING_TRUTH_SOURCE_IDS.length,
      critical_backlog: sourceFacts.critical_backlog.length,
      decisions: sourceFacts.decisions.length,
      open_questions: sourceFacts.open_questions.length,
      recent_changes: sourceFacts.recent_changes.length,
      latest_job_runs: sourceFacts.latest_job_runs.length,
      crawl_targets: sourceFacts.crawl_targets.length,
    },
  };
}

async function runStrategyPacket({ input, model, maxItems }) {
  const sourceContracts = getSourceContracts().map(source => ({
    source_id: source.sourceId,
    title: source.title,
    status: source.status,
    validation: source.validation,
    owner: source.owner || '',
    maturity: source.maturity || '',
    purpose: source.purpose || '',
  }));

  const llmResult = await callLlm({
    workload: 'synthesis',
    hubKey: 'foundation',
    messages: [
      {
        role: 'system',
        content: [
          'You create an owner-level Strategy Evidence Packet for Benson Crew.',
          'The goal is not to write final strategy. The goal is to turn source-backed evidence into the strategic issues, decision questions, and 90-day priorities Steve should review.',
          'Use the direct Drive/video artifacts as first-class evidence even if they have not yet been mined into candidate rows.',
          'Use source-backed operating facts, backlog state, decisions, runtime coverage, and current strategy docs to rank what matters.',
          'Before recommending any strategic gap, check source_backed_operating_facts.current_operating_truth. Shared-comms candidates and meeting quotes can raise a concern, but live Owners, Finance, FUB, KPI, BHAG, and Agent Engine source truth decides whether the problem is current, already handled, or only a health/freshness/proof gap.',
          'If a live source says a system already exists or is signed off, do not frame the recommendation as building it from scratch. Reframe as a precise health, freshness, reconciliation, collections, coaching, or proof gap only when live source facts support that.',
          'For any $2B, 10,000-agent, BHAG, behind/ahead, recruiting pace, or active-agent capacity claim, use source_backed_operating_facts.current_goal_truth first. Do not confuse the 10,000-agent community path with Agent Engine active productive team-agent capacity.',
          'Do not invent metrics, dates, owners, source IDs, candidate keys, or artifact IDs.',
          'Every important item must cite source_ids and either candidate_keys, artifact_ids, or a source-backed fact.',
          'If evidence is partial, say so as a caveat instead of pretending the system is complete.',
          'Suppress generic advice. Prefer concrete issues that change what leadership should decide or do next.',
          'Keep the output concise enough for an owner strategy session.',
          `Return at most ${maxItems} combined high-signal strategic issues and 90-day priorities.`,
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            generated_at: new Date().toISOString(),
            source_contracts: sourceContracts,
            strategy_docs: input.strategyDocs,
            direct_strategy_artifacts: input.artifacts,
            shared_communication_candidates: input.candidates,
            archive_summary: input.archiveSummary,
            candidate_summary: input.candidateSummary,
            source_backed_operating_facts: input.sourceFacts,
            packet_rules: {
              strategy_folder_rule: 'Drive Strategy Folder is quarterly evidence intake under SRC-GDRIVE-001, not canonical strategy.',
              final_truth_rule: 'Final approved strategy belongs in Strategic Execution / strategy docs / decision ledger, not the raw Drive folder.',
              goal_claim_rule: 'Live goal truth overrides older packet text, old docs, and meeting chatter for behind/ahead claims. The 10,000-agent community path is separate from active productive Benson Crew agent capacity.',
              operating_truth_rule: 'Live operating truth from Owners, Finance, FUB, KPI, BHAG, and Agent Engine overrides shared-comms candidate summaries. Meeting mentions alone are not enough to call something an unresolved strategic gap.',
              current_goal: 'Prepare Steve for a strategy session with source-backed issues, decisions, open questions, and 90-day options.',
            },
          },
          null,
          2,
        ),
      },
    ],
    responseFormat: {
      type: 'json_schema',
      name: 'strategy_evidence_packet_v1',
      strict: true,
      schema: OUTPUT_SCHEMA,
    },
    maxOutputTokens: 7000,
    dryRun: false,
    metadata: {
      requestedModel: model,
      schemaName: 'strategy_evidence_packet_v1',
      timeoutMs: DEFAULT_TIMEOUT_MS,
      candidatesRead: input.candidates.length,
      directArtifactsRead: input.artifacts.length,
    },
  });

  const packet = parseJsonObject(llmResult.outputText);
  return {
    packet,
    llm: {
      requestedModel: model,
      model: llmResult.model,
      provider: llmResult.provider,
      authPath: llmResult.authPath,
      routeKey: llmResult.routeKey,
      credentialKey: llmResult.credentialKey,
      callId: llmResult.call?.callId || llmResult.callId || null,
    },
  };
}

function sanitizePacket(packet, allowedSourceIds) {
  const safe = {
    ...packet,
    strategy_readiness: {
      ready_to_use: Boolean(packet.strategy_readiness?.ready_to_use),
      readiness_label: String(packet.strategy_readiness?.readiness_label || 'Owner review ready').trim(),
      most_important_gap: String(packet.strategy_readiness?.most_important_gap || '').trim(),
      caveats: normalizeArray(packet.strategy_readiness?.caveats),
    },
    source_coverage: Array.isArray(packet.source_coverage) ? packet.source_coverage : [],
    strategic_issues: Array.isArray(packet.strategic_issues) ? packet.strategic_issues : [],
    decision_candidates: Array.isArray(packet.decision_candidates) ? packet.decision_candidates : [],
    recommended_90_day_priorities: Array.isArray(packet.recommended_90_day_priorities) ? packet.recommended_90_day_priorities : [],
    open_questions: Array.isArray(packet.open_questions) ? packet.open_questions : [],
    suppressed_or_deferred: Array.isArray(packet.suppressed_or_deferred) ? packet.suppressed_or_deferred : [],
  };

  safe.source_coverage = safe.source_coverage
    .map(item => ({
      source_id: normalizeSourceIds([item.source_id], allowedSourceIds)[0] || '',
      evidence_read: Math.max(0, Number(item.evidence_read || 0)),
      useful_signal: String(item.useful_signal || '').trim(),
      caveat: String(item.caveat || '').trim(),
    }))
    .filter(item => item.source_id);

  safe.strategic_issues = safe.strategic_issues.map((item, index) => ({
    ...item,
    rank: Number(item.rank || index + 1),
    status: normalizeStatus(item.status, 'needs_decision'),
    source_ids: normalizeSourceIds(item.source_ids, allowedSourceIds),
    candidate_keys: normalizeArray(item.candidate_keys),
    artifact_ids: normalizeArray(item.artifact_ids),
    confidence: normalizeConfidence(item.confidence),
    sensitivity: normalizeSensitivity(item.sensitivity),
  }));

  safe.decision_candidates = safe.decision_candidates.map((item, index) => ({
    ...item,
    rank: Number(item.rank || index + 1),
    options: normalizeArray(item.options),
    source_ids: normalizeSourceIds(item.source_ids, allowedSourceIds),
    candidate_keys: normalizeArray(item.candidate_keys),
    artifact_ids: normalizeArray(item.artifact_ids),
    confidence: normalizeConfidence(item.confidence),
    sensitivity: normalizeSensitivity(item.sensitivity),
  }));

  safe.recommended_90_day_priorities = safe.recommended_90_day_priorities.map((item, index) => ({
    ...item,
    rank: Number(item.rank || index + 1),
    leading_metrics: normalizeArray(item.leading_metrics),
    source_ids: normalizeSourceIds(item.source_ids, allowedSourceIds),
    candidate_keys: normalizeArray(item.candidate_keys),
    artifact_ids: normalizeArray(item.artifact_ids),
    confidence: normalizeConfidence(item.confidence),
    sensitivity: normalizeSensitivity(item.sensitivity),
  }));

  safe.open_questions = safe.open_questions.map(item => ({
    question: String(item.question || '').trim(),
    why_it_matters: String(item.why_it_matters || '').trim(),
    suggested_owner: String(item.suggested_owner || '').trim(),
    source_ids: normalizeSourceIds(item.source_ids, allowedSourceIds),
  })).filter(item => item.question);

  return safe;
}

function toSynthesizedItems(packet, runId) {
  const items = [];

  for (const item of packet.strategic_issues || []) {
    items.push({
      synthesisItemId: `${runId}:issue:${String(items.length + 1).padStart(2, '0')}`,
      rank: items.length + 1,
      itemType: 'strategic_issue',
      status: normalizeStatus(item.status, 'needs_decision'),
      title: item.title,
      oneLine: item.current_reality,
      whyItMatters: item.why_now,
      recommendedNextAction: item.next_action || item.recommended_decision,
      suggestedOwner: item.owner_hint,
      sourceCount: item.source_ids?.length || 0,
      candidateKeys: item.candidate_keys || [],
      sourceIds: item.source_ids || [],
      evidenceSummary: item.evidence_summary,
      confidence: item.confidence,
      sensitivity: item.sensitivity,
      metadata: {
        packetSection: 'strategic_issues',
        artifactIds: item.artifact_ids || [],
        recommendedDecision: item.recommended_decision || '',
      },
    });
  }

  for (const item of packet.decision_candidates || []) {
    items.push({
      synthesisItemId: `${runId}:decision:${String(items.length + 1).padStart(2, '0')}`,
      rank: items.length + 1,
      itemType: 'decision',
      status: 'needs_decision',
      title: item.decision_question,
      oneLine: item.recommended_option,
      whyItMatters: item.evidence_summary,
      recommendedNextAction: item.recommended_option,
      suggestedOwner: 'Steve',
      sourceCount: item.source_ids?.length || 0,
      candidateKeys: item.candidate_keys || [],
      sourceIds: item.source_ids || [],
      evidenceSummary: item.evidence_summary,
      confidence: item.confidence,
      sensitivity: item.sensitivity,
      metadata: {
        packetSection: 'decision_candidates',
        artifactIds: item.artifact_ids || [],
        options: item.options || [],
      },
    });
  }

  for (const item of packet.recommended_90_day_priorities || []) {
    items.push({
      synthesisItemId: `${runId}:priority:${String(items.length + 1).padStart(2, '0')}`,
      rank: items.length + 1,
      itemType: 'action_item',
      status: 'needs_owner',
      title: item.priority,
      oneLine: item.expected_outcome,
      whyItMatters: item.why_this_matters,
      recommendedNextAction: item.expected_outcome,
      suggestedOwner: item.owner_hint,
      sourceCount: item.source_ids?.length || 0,
      candidateKeys: item.candidate_keys || [],
      sourceIds: item.source_ids || [],
      evidenceSummary: item.evidence_summary,
      confidence: item.confidence,
      sensitivity: item.sensitivity,
      metadata: {
        packetSection: 'recommended_90_day_priorities',
        artifactIds: item.artifact_ids || [],
        leadingMetrics: item.leading_metrics || [],
      },
    });
  }

  return items.filter(item => VALID_ITEM_TYPES.has(item.itemType));
}

function renderListItemArray(values) {
  const items = normalizeArray(values);
  return items.length ? items.join('; ') : 'None listed';
}

function renderMarkdown(packet, { generatedAt, model, inputSummary, llm }) {
  const lines = [
    `# ${packet.title || 'Strategy Evidence Packet v1'}`,
    '',
    `Generated: ${generatedAt}`,
    `Model: ${model}`,
    `Route: ${llm.provider || 'unknown'} / ${llm.authPath || 'unknown'} / ${llm.routeKey || 'unknown'}`,
    `Evidence read: ${inputSummary.candidate_count} candidates, ${inputSummary.direct_artifact_count} direct artifacts, ${inputSummary.strategy_doc_count} strategy docs`,
    '',
    '## Executive Summary',
    '',
    packet.executive_summary || '',
    '',
    '## Strategy Readiness',
    '',
    `- Ready to use: ${packet.strategy_readiness?.ready_to_use ? 'Yes' : 'No'}`,
    `- Label: ${packet.strategy_readiness?.readiness_label || ''}`,
    `- Most important gap: ${packet.strategy_readiness?.most_important_gap || ''}`,
    `- Caveats: ${renderListItemArray(packet.strategy_readiness?.caveats || [])}`,
    '',
    '## Strategic Issues',
    '',
  ];

  for (const item of packet.strategic_issues || []) {
    lines.push(`### ${item.rank}. ${item.title}`);
    lines.push('');
    lines.push(`- Status: ${item.status}`);
    lines.push(`- Owner hint: ${item.owner_hint || 'unassigned'}`);
    lines.push(`- Sources: ${renderListItemArray(item.source_ids)}`);
    lines.push(`- Candidate keys: ${renderListItemArray(item.candidate_keys)}`);
    lines.push(`- Artifact IDs: ${renderListItemArray(item.artifact_ids)}`);
    lines.push(`- Confidence: ${Math.round(Number(item.confidence || 0) * 100)}%`);
    lines.push('');
    lines.push(`Current reality: ${item.current_reality}`);
    lines.push('');
    lines.push(`Why now: ${item.why_now}`);
    lines.push('');
    lines.push(`Recommended decision: ${item.recommended_decision}`);
    lines.push('');
    lines.push(`Next action: ${item.next_action}`);
    lines.push('');
    lines.push(`Evidence: ${item.evidence_summary}`);
    lines.push('');
  }

  lines.push('## Decision Candidates');
  lines.push('');
  for (const item of packet.decision_candidates || []) {
    lines.push(`### ${item.rank}. ${item.decision_question}`);
    lines.push('');
    lines.push(`- Recommended option: ${item.recommended_option}`);
    lines.push(`- Options: ${renderListItemArray(item.options)}`);
    lines.push(`- Sources: ${renderListItemArray(item.source_ids)}`);
    lines.push(`- Evidence: ${item.evidence_summary}`);
    lines.push('');
  }

  lines.push('## Recommended 90-Day Priorities');
  lines.push('');
  for (const item of packet.recommended_90_day_priorities || []) {
    lines.push(`### ${item.rank}. ${item.priority}`);
    lines.push('');
    lines.push(`- Expected outcome: ${item.expected_outcome}`);
    lines.push(`- Owner hint: ${item.owner_hint || 'unassigned'}`);
    lines.push(`- Leading metrics: ${renderListItemArray(item.leading_metrics)}`);
    lines.push(`- Sources: ${renderListItemArray(item.source_ids)}`);
    lines.push('');
    lines.push(`Why this matters: ${item.why_this_matters}`);
    lines.push('');
    lines.push(`Evidence: ${item.evidence_summary}`);
    lines.push('');
  }

  lines.push('## Open Questions');
  lines.push('');
  for (const item of packet.open_questions || []) {
    lines.push(`- ${item.question} Owner: ${item.suggested_owner || 'unassigned'}. Why it matters: ${item.why_it_matters}`);
  }

  lines.push('');
  lines.push('## Source Coverage');
  lines.push('');
  for (const source of packet.source_coverage || []) {
    lines.push(`- ${source.source_id}: ${source.evidence_read} evidence items. ${source.useful_signal} Caveat: ${source.caveat}`);
  }

  lines.push('');
  lines.push('## Deferred / Suppressed');
  lines.push('');
  for (const item of packet.suppressed_or_deferred || []) {
    lines.push(`- ${item.topic}: ${item.reason}`);
  }

  return `${lines.join('\n').trim()}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (boolArg(args.help) || boolArg(args.h)) {
    printHelp();
    return;
  }

  const limit = Math.min(500, Math.max(20, Number(args.limit || 180)));
  const days = args.days ? Math.max(1, Number(args.days) || 30) : null;
  const artifactLimit = Math.min(60, Math.max(4, Number(args.artifactLimit || 28)));
  const maxExcerptChars = Math.min(6000, Math.max(900, Number(args.maxExcerptChars || 2600)));
  const maxItems = Math.min(30, Math.max(6, Number(args.maxItems || 18)));
  const model = String(args.model || DEFAULT_MODEL).trim();
  const outPath = args.out ? path.resolve(REPO_ROOT, String(args.out)) : '';
  const dryRun = boolArg(args.dryRun) || boolArg(args.plan);

  console.log('Generate Strategy Evidence Packet v1');
  console.log(`  Candidate limit: ${limit}`);
  console.log(`  Days: ${days || 'all pending'}`);
  console.log(`  Artifact limit: ${artifactLimit}`);
  console.log(`  Max items: ${maxItems}`);
  console.log(`  Model: ${model}`);
  console.log(`  Per-call timeout: ${DEFAULT_TIMEOUT_MS}ms`);
  console.log(`  Plan only: ${dryRun}`);

  const pool = getPool();
  try {
    const [
      candidates,
      candidateSummary,
      archiveSummary,
      artifacts,
      sourceFacts,
      strategyDocs,
    ] = await Promise.all([
      fetchCandidates(pool, { limit, days }),
      fetchCandidateSummary(pool),
      fetchArchiveSummary(pool),
      fetchStrategyArtifacts(pool, { limit: artifactLimit, maxExcerptChars }),
      fetchSourceFacts(pool),
      readStrategyDocs(),
    ]);

    const input = {
      candidates,
      candidateSummary,
      archiveSummary,
      artifacts,
      sourceFacts,
      strategyDocs,
    };
    const inputSummary = buildInputSummary(input);

    console.log(`  Candidates read: ${candidates.length}`);
    console.log(`  Direct artifacts read: ${artifacts.length}`);

    if (dryRun) {
      console.log(JSON.stringify({
        dryRun: true,
        wouldCallLlm: false,
        model,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        inputSummary,
        artifactTitles: artifacts.map(item => ({
          artifactId: item.artifact_id,
          sourceId: item.source_id,
          title: item.title,
          contentLength: item.content_length,
        })),
      }, null, 2));
      return;
    }

    const generatedAt = new Date().toISOString();
    const { packet: rawPacket, llm } = await runStrategyPacket({ input, model, maxItems });
    const allowedSourceIds = getSourceContracts().map(source => source.sourceId).filter(Boolean);
    const packet = sanitizePacket(rawPacket, allowedSourceIds);
    const actualModel = llm.model || model;
    const markdown = renderMarkdown(packet, { generatedAt, model: actualModel, inputSummary, llm });

    if (outPath) {
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, markdown, 'utf8');
      console.log(`  Wrote: ${path.relative(REPO_ROOT, outPath)}`);
    } else {
      console.log(markdown);
    }

    const runId = buildRunId({
      generatedAt,
      model: actualModel,
      candidatesRead: candidates.length,
      artifactCount: artifacts.length,
      title: packet.title || 'Strategy Evidence Packet v1',
    });

    await initFoundationDb();
    const recorded = await recordSharedCommunicationSynthesisRun(
      {
        runId,
        title: packet.title || 'Strategy Evidence Packet v1',
        model: actualModel,
        outputPath: outPath ? path.relative(REPO_ROOT, outPath) : '',
        candidateLimit: limit,
        candidatesRead: candidates.length,
        daysWindow: days,
        maxItems,
        sourceCoverage: packet.source_coverage || [],
        suppressedPatterns: packet.suppressed_or_deferred || [],
        openQuestions: packet.open_questions || [],
        archiveSummary,
        candidateSummary,
        sourceFacts: {
          ...sourceFacts,
          direct_strategy_artifacts: artifacts.map(item => ({
            artifact_id: item.artifact_id,
            source_id: item.source_id,
            artifact_type: item.artifact_type,
            title: item.title,
            source_url: item.source_url,
            artifact_updated_at: item.artifact_updated_at,
            content_length: item.content_length,
          })),
          strategy_docs: strategyDocs.map(item => ({
            path: item.path,
            title: item.title,
            headings: item.headings,
          })),
        },
        generatedAt,
        items: toSynthesizedItems(packet, runId),
        metadata: {
          packetType: 'strategy_evidence_packet_v1',
          script: 'scripts/generate-strategy-evidence-packet.mjs',
          executiveSummary: packet.executive_summary || '',
          strategyReadiness: packet.strategy_readiness || {},
          recommended90DayPriorities: packet.recommended_90_day_priorities || [],
          decisionCandidates: packet.decision_candidates || [],
          packetJson: packet,
          requestedModel: llm.requestedModel || model,
          provider: llm.provider || null,
          authPath: llm.authPath || null,
          routeKey: llm.routeKey || null,
          credentialKey: llm.credentialKey || null,
          llmCallId: llm.callId || null,
          inputSummary,
        },
      },
      'strategy-evidence-packet',
    );

    console.log(`  Recorded strategy packet: ${recorded.run.runId} (${recorded.itemCount} synthesized items)`);
  } finally {
    await pool.end();
    await closeFoundationDb();
  }
}

main().catch(error => {
  console.error('Strategy evidence packet generation failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
