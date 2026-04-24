#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { getSourceContracts } from '../lib/source-contracts.js';
import { shorten } from '../lib/shared-candidate-extraction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_MODEL = process.env.OPENAI_SYNTHESIS_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4';

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    executive_summary: { type: 'string' },
    source_coverage: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source_id: { type: 'string' },
          read: { type: 'integer' },
          useful_signal: { type: 'string' },
          caveat: { type: 'string' },
        },
        required: ['source_id', 'read', 'useful_signal', 'caveat'],
        additionalProperties: false,
      },
    },
    ranked_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rank: { type: 'integer' },
          item_type: {
            type: 'string',
            enum: [
              'decision',
              'blocker',
              'action_item',
              'strategic_issue',
              'pattern',
              'content_atom',
              'source_trust_issue',
            ],
          },
          title: { type: 'string' },
          one_line: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'new',
              'active',
              'needs_decision',
              'needs_owner',
              'stale_watch',
              'historical_context',
              'likely_resolved',
            ],
          },
          why_it_matters: { type: 'string' },
          recommended_next_action: { type: 'string' },
          suggested_owner: { type: 'string' },
          source_count: { type: 'integer' },
          candidate_keys: {
            type: 'array',
            items: { type: 'string' },
          },
          source_ids: {
            type: 'array',
            items: { type: 'string' },
          },
          evidence_summary: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sensitivity: {
            type: 'string',
            enum: [
              'neutral',
              'positive',
              'performance_concern',
              'termination_risk',
              'comp_discussion',
              'undisclosed_feedback',
            ],
          },
        },
        required: [
          'rank',
          'item_type',
          'title',
          'one_line',
          'status',
          'why_it_matters',
          'recommended_next_action',
          'suggested_owner',
          'source_count',
          'candidate_keys',
          'source_ids',
          'evidence_summary',
          'confidence',
          'sensitivity',
        ],
        additionalProperties: false,
      },
    },
    suppressed_patterns: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['pattern', 'reason'],
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
        },
        required: ['question', 'why_it_matters'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'executive_summary', 'source_coverage', 'ranked_items', 'suppressed_patterns', 'open_questions'],
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

function getPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  });
}

function normalizeCandidateRow(row) {
  const metadata = row.metadata || {};
  const links = metadata.links || {};
  return {
    candidate_key: row.candidate_key,
    candidate_type: row.candidate_type,
    source_id: row.source_id,
    title: shorten(row.title || '', 160),
    summary: shorten(row.summary || '', 500),
    owner_hint: shorten(row.owner_hint || '', 100),
    evidence_excerpt: shorten(row.evidence_excerpt || '', 360),
    confidence: row.confidence == null ? null : Number(row.confidence),
    sensitivity: metadata.sensitivity || 'neutral',
    subject_people: metadata.subjectPeople || metadata.subject_people || [],
    artifact_title: shorten(row.artifact_title || '', 160),
    artifact_updated_at: row.artifact_updated_at,
    participants: Array.isArray(row.participants) ? row.participants.slice(0, 10) : [],
    pillar: links.pillar || '',
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
      SELECT c.candidate_key, c.source_id, c.candidate_type, c.title, c.summary,
             c.owner_hint, c.evidence_excerpt, c.confidence, c.metadata,
             a.title AS artifact_title, a.artifact_updated_at, a.participants
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
      SELECT source_id, candidate_type, count(*)::int total
      FROM shared_communication_candidates
      WHERE status = 'pending'
      GROUP BY source_id, candidate_type
      ORDER BY source_id, candidate_type
    `,
  );
  return result.rows;
}

async function fetchArchiveSummary(pool) {
  const result = await pool.query(
    `
      SELECT source_id, artifact_type, count(*)::int total,
             min(artifact_updated_at) oldest,
             max(artifact_updated_at) newest
      FROM shared_communication_artifacts
      GROUP BY source_id, artifact_type
      ORDER BY source_id, artifact_type
    `,
  );
  return result.rows;
}

async function runSynthesis({ candidates, candidateSummary, archiveSummary, model, maxItems }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for synthesis generation.');
  }

  const sourceContracts = getSourceContracts().map(source => ({
    source_id: source.sourceId,
    title: source.title,
    status: source.status,
    validation: source.validation,
    owner: source.owner || '',
  }));

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
          content: [
            'You synthesize Benson Crew shared-communications candidates into live intelligence.',
            'Do not dump raw candidates. Group, dedupe, rank, and suppress noise.',
            'Prefer items that are current, unresolved, strategic, multi-source, or require a leader decision.',
            'Use old Director of Intelligence patterns only as output inspiration: decisions, action items, bottlenecks, escalation-worthy issues, suggested owner, suggested next action, ranked findings with evidence.',
            'Do not invent source facts. Use only supplied candidates and summaries.',
            'For source_coverage.read, use selected_candidate_source_counts exactly for each source id.',
            'Treat Zoom chat artifacts as partial historical context, not authoritative full transcripts.',
            'Do not quote passwords, tokens, private credentials, or secret-looking strings.',
            'If a candidate appears old and not repeated recently, mark it historical_context or stale_watch instead of active.',
            `Return at most ${maxItems} ranked items.`,
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              generated_at: new Date().toISOString(),
              source_contracts: sourceContracts,
              archive_summary: archiveSummary,
              candidate_summary: candidateSummary,
              selected_candidate_source_counts: candidates.reduce((counts, candidate) => {
                counts[candidate.source_id] = (counts[candidate.source_id] || 0) + 1;
                return counts;
              }, {}),
              candidates,
            },
            null,
            2,
          ),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'shared_comms_synthesis_v1',
          strict: true,
          schema: OUTPUT_SCHEMA,
        },
      },
      max_output_tokens: 6000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI synthesis failed (${response.status}): ${errorText.slice(0, 800)}`);
  }

  const responseJson = await response.json();
  const text = responseJson.output
    ?.flatMap(item => item.content || [])
    ?.find(item => item.type === 'output_text')
    ?.text;
  if (!text) throw new Error('OpenAI synthesis returned no output text.');
  return JSON.parse(text);
}

function renderMarkdown(synthesis, { candidatesRead, model }) {
  const lines = [
    `# ${synthesis.title || 'Shared Communications Synthesis'}`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Model: ${model}`,
    `Candidates read: ${candidatesRead}`,
    '',
    '## Executive Summary',
    '',
    synthesis.executive_summary || '',
    '',
    '## Ranked Live Intelligence',
    '',
  ];

  for (const item of synthesis.ranked_items || []) {
    lines.push(`### ${item.rank}. ${item.title}`);
    lines.push('');
    lines.push(`- Type: ${item.item_type}`);
    lines.push(`- Status: ${item.status}`);
    lines.push(`- Owner: ${item.suggested_owner || 'unassigned'}`);
    lines.push(`- Confidence: ${Math.round(Number(item.confidence || 0) * 100)}%`);
    lines.push(`- Sensitivity: ${item.sensitivity}`);
    lines.push(`- Sources: ${(item.source_ids || []).join(', ') || 'none'}`);
    lines.push(`- Candidate keys: ${(item.candidate_keys || []).join(', ') || 'none'}`);
    lines.push('');
    lines.push(item.one_line || '');
    lines.push('');
    lines.push(`Why it matters: ${item.why_it_matters}`);
    lines.push('');
    lines.push(`Recommended next action: ${item.recommended_next_action}`);
    lines.push('');
    lines.push(`Evidence summary: ${item.evidence_summary}`);
    lines.push('');
  }

  lines.push('## Source Coverage');
  lines.push('');
  for (const source of synthesis.source_coverage || []) {
    lines.push(`- ${source.source_id}: ${source.read} read. ${source.useful_signal} Caveat: ${source.caveat}`);
  }

  lines.push('');
  lines.push('## Suppressed Patterns');
  lines.push('');
  for (const item of synthesis.suppressed_patterns || []) {
    lines.push(`- ${item.pattern}: ${item.reason}`);
  }

  lines.push('');
  lines.push('## Open Questions');
  lines.push('');
  for (const item of synthesis.open_questions || []) {
    lines.push(`- ${item.question} Why it matters: ${item.why_it_matters}`);
  }

  return `${lines.join('\n').trim()}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(600, Math.max(20, Number(args.limit || 220)));
  const days = args.days ? Math.max(1, Number(args.days) || 30) : null;
  const maxItems = Math.min(30, Math.max(5, Number(args.maxItems || 20)));
  const model = String(args.model || DEFAULT_MODEL).trim();
  const outPath = args.out ? path.resolve(REPO_ROOT, String(args.out)) : '';

  console.log('Generate shared communications synthesis');
  console.log(`  Candidate limit: ${limit}`);
  console.log(`  Days: ${days || 'all pending'}`);
  console.log(`  Max items: ${maxItems}`);
  console.log(`  Model: ${model}`);

  const pool = getPool();
  try {
    const [candidates, candidateSummary, archiveSummary] = await Promise.all([
      fetchCandidates(pool, { limit, days }),
      fetchCandidateSummary(pool),
      fetchArchiveSummary(pool),
    ]);

    console.log(`  Candidates read: ${candidates.length}`);
    const synthesis = await runSynthesis({ candidates, candidateSummary, archiveSummary, model, maxItems });
    const markdown = renderMarkdown(synthesis, { candidatesRead: candidates.length, model });

    if (outPath) {
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, markdown, 'utf8');
      console.log(`  Wrote: ${path.relative(REPO_ROOT, outPath)}`);
    } else {
      console.log(markdown);
    }
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error('Shared communications synthesis failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
