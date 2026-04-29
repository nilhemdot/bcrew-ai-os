#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const GENERATED_AT = new Date().toISOString();
const ACTIVE_DOCS = new Set([
  'docs/README.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-runtime-map.md',
  'docs/rebuild/intelligence-pipeline.md',
  'docs/rebuild/agent-architecture.md',
  'docs/rebuild/doc-cleanup-plan.md',
  'docs/rebuild/owners-closeout.md',
  'docs/system-strategy.md',
  'docs/source-registry.md',
]);

function listMarkdownFiles(dir) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];

  return fs
    .readdirSync(fullDir, { withFileTypes: true })
    .flatMap((entry) => {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) return listMarkdownFiles(rel);
      if (!entry.isFile() || !entry.name.endsWith('.md')) return [];
      if (entry.name === 'INDEX.md') return [];
      return [rel];
    })
    .sort();
}

function readMeta(relPath) {
  const raw = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const lines = raw.split(/\r?\n/);
  const heading = lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, '').trim() || path.basename(relPath);
  const statusLine = lines.find((line) => /^Status:\s*/i.test(line))?.replace(/^Status:\s*/i, '').trim() || '';
  const promotedTo = lines.find((line) => /^Promoted to:\s*/i.test(line))?.replace(/^Promoted to:\s*/i, '').trim() || '';
  const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;
  return { heading, statusLine, promotedTo, words };
}

function inferDate(relPath) {
  return relPath.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
}

function inferCategory(relPath, heading) {
  const text = `${relPath} ${heading}`.toLowerCase();
  if (text.includes('full-convo')) return 'full-convo';
  if (text.includes('shared-comms') || text.includes('communication') || text.includes('email') || text.includes('missive') || text.includes('zoom')) return 'shared-comms';
  if (text.includes('foundation') || text.includes('rebuild') || text.includes('runtime') || text.includes('synthesis')) return 'foundation';
  if (text.includes('marketing') || text.includes('youtube') || text.includes('socialpilot')) return 'marketing';
  if (text.includes('owners') || text.includes('deal') || text.includes('fub') || text.includes('finance') || text.includes('kpi')) return 'source-signoff';
  if (text.includes('unchained') || text.includes('realtor')) return 'unchained-realtor';
  if (text.includes('strategy') || text.includes('decision')) return 'strategy';
  return 'general';
}

function inferStatus(relPath, heading, statusLine, directory) {
  const text = `${relPath} ${heading} ${statusLine}`.toLowerCase();
  const normalizedStatus = statusLine.toLowerCase();
  const evidencePath = relPath.startsWith('docs/handoffs/')
    || relPath.startsWith('docs/audits/')
    || relPath.startsWith('docs/research/')
    || relPath.startsWith('docs/_archive/')
    || relPath.startsWith('docs/rebuild/plan-history/');
  const explicitStatus = ['needs-promotion', 'needs-reconciliation', 'design-reference', 'supporting-truth', 'evidence', 'superseded-evidence', 'duplicate-candidate'].find((status) =>
    statusLine.toLowerCase().includes(status)
  );
  if (explicitStatus) return explicitStatus;
  if (!evidencePath && normalizedStatus === 'active') return 'active';

  if (ACTIVE_DOCS.has(relPath)) {
    return 'active';
  }

  if (relPath.startsWith('docs/audits/')) {
    if (text.includes('nuke-power-rebuild-roadmap')) return 'needs-reconciliation';
    if (text.includes('youtube-extraction-tool-audit')) return 'evidence';
    if (text.includes('foundation-reset') || text.includes('foundation-full') || text.includes('foundation-audit')) return 'superseded-evidence';
    return 'evidence';
  }

  if ([
    'docs/business-strategy.md',
    'docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md',
    'docs/rebuild/plan-history/rebuild-master-plan-2026-04-29-retired.md',
  ].includes(relPath)) {
    return 'supporting-truth';
  }

  if (relPath.startsWith('docs/source-notes/') || relPath.startsWith('docs/specs/') || relPath.startsWith('docs/strategy/')) return 'supporting-truth';
  if (relPath.startsWith('docs/users/')) return 'supporting-truth';
  if (relPath.startsWith('docs/_archive/')) return 'superseded-evidence';
  if (relPath.startsWith('docs/rebuild/plan-history/')) return 'superseded-evidence';
  if (relPath.startsWith('docs/research/')) return 'evidence';
  if (relPath.startsWith('docs/superpowers/')) return 'design-reference';

  if (text.includes('unchained-realtor-split-handoff')) return 'needs-promotion';
  if (text.includes('sunday-strategy-prep-working-brief')) return 'needs-reconciliation';
  if (text.includes('current') || text.includes('checkpoint') || text.includes('proof') || text.includes('closeout')) return 'evidence';
  if (text.includes('full-convo')) return 'evidence';
  if (text.includes('night') || text.includes('end-of-night')) return 'superseded-evidence';
  return 'evidence';
}

function writeIndex(directory, title) {
  const files = listMarkdownFiles(directory);
  const rows = files.map((relPath) => {
    const meta = readMeta(relPath);
    const category = inferCategory(relPath, meta.heading);
    const status = inferStatus(relPath, meta.heading, meta.statusLine, directory);
    const date = inferDate(relPath);
    return { relPath, ...meta, category, status, date };
  });

  const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    `# ${title}`,
    '',
    'Generated by: `node scripts/generate-doc-indexes.mjs`',
    `Generated at: ${GENERATED_AT}`,
    '',
    'Purpose: make historical docs searchable evidence, not competing active doctrine.',
    '',
    'Status meanings:',
    '',
    '- `active` — current doctrine / read-first truth',
    '- `supporting-truth` — source notes, specs, or strategy detail that supports active doctrine',
    '- `design-reference` — build/design reference, not current operating doctrine by itself',
    '- `needs-promotion` — possibly useful evidence that needs an explicit promotion target before use',
    '- `needs-reconciliation` — read and reconcile before trusting',
    '- `evidence` — historical proof / context',
    '- `superseded-evidence` — kept for traceability, not current doctrine',
    '- `duplicate-candidate` — possible later consolidation target',
    '',
    'Summary:',
    '',
    ...Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([status, count]) => `- ${status}: ${count}`),
    '',
    '| File | Date | Category | Status | Promoted To | Words | Value |',
    '|------|------|----------|--------|-------------|-------|-------|',
    ...rows.map((row) => {
      const value = row.heading.replace(/\|/g, '\\|');
      const promotedTo = row.promotedTo ? row.promotedTo.replace(/\|/g, '\\|') : '-';
      return `| [${row.relPath.replace(`${directory}/`, '')}](${row.relPath.replace(`${directory}/`, '')}) | ${row.date || '-'} | ${row.category} | ${row.status} | ${promotedTo} | ${row.words} | ${value} |`;
    }),
    '',
  ];

  fs.writeFileSync(path.join(ROOT, directory, 'INDEX.md'), lines.join('\n'));
}

writeIndex('docs/handoffs', 'Handoff Index');
writeIndex('docs/audits', 'Audit Index');
writeIndex('docs/_archive', 'Archived Evidence Index');
writeIndex('docs', 'Documentation Index');

console.log('Generated docs/INDEX.md, docs/handoffs/INDEX.md, docs/audits/INDEX.md, and docs/_archive/INDEX.md');
