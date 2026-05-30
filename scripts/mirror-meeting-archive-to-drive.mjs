#!/usr/bin/env node

import process from 'node:process';
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getSharedCommunicationArchiveSnapshot,
} from '../lib/foundation-shared-comms-db.js'

const DEFAULT_ROOT_FOLDER_ID = process.env.CREWBERT_MEETING_ARCHIVE_ROOT_FOLDER_ID || '';
const DEFAULT_CREWBERT_EMAIL = process.env.CREWBERT_ARCHIVE_EMAIL || 'crewbert@bensoncrew.ca';
const REPORT_ONLY_REASON = 'Drive mirror writes are disabled. Meeting archive/search lives in the database; original Gemini notes remain the source of truth.';

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function sanitizeFileName(value, fallback = 'meeting-artifact') {
  const normalized = String(value || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (normalized || fallback).slice(0, 180);
}

function derivePeriodLabel(artifact) {
  const title = String(artifact.title || '');
  const titleMatch = title.match(/\b(20\d{2})[/-](\d{2})[/-](\d{2})\b/);
  if (titleMatch) {
    return `${titleMatch[1]}-${titleMatch[2]}`;
  }

  const timestamp = Date.parse(String(artifact.artifactUpdatedAt || ''));
  if (Number.isFinite(timestamp)) {
    const date = new Date(timestamp);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}`;
  }

  return 'undated';
}

function getMeetingClass(artifact) {
  return artifact.metadata?.meetingClass === 'broadcast' ? 'broadcast' : 'discussion';
}

function getArtifactFolderName(artifact) {
  return artifact.artifactType === 'meeting_transcript' ? 'transcripts' : 'notes';
}

function buildMirrorFileName(artifact) {
  const base = sanitizeFileName(artifact.title || artifact.artifactId || 'meeting-artifact');
  const suffix = artifact.artifactType === 'meeting_transcript' ? 'transcript' : 'note';
  return `${base} [${suffix}].txt`;
}

function formatMirrorDocument(artifact) {
  const metadata = artifact.metadata || {};
  return [
    `Title: ${artifact.title || ''}`,
    `Artifact ID: ${artifact.artifactId || ''}`,
    `Artifact Type: ${artifact.artifactType || ''}`,
    `Meeting Class: ${metadata.meetingClass || 'discussion'}`,
    `Privacy Profile: ${metadata.privacyProfile || ''}`,
    `Transcript Source: ${metadata.transcriptSource || ''}`,
    `Source Account: ${artifact.sourceAccount || ''}`,
    `Source URL: ${artifact.sourceUrl || ''}`,
    `Artifact Updated At: ${artifact.artifactUpdatedAt || ''}`,
    `Participants: ${(artifact.participants || []).join(', ')}`,
    '',
    '---',
    '',
    artifact.contentText || '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootFolderId = String(args.rootFolderId || DEFAULT_ROOT_FOLDER_ID).trim();
  const crewbertEmail = String(args.user || DEFAULT_CREWBERT_EMAIL).trim();
  const limit = Math.min(1000, Math.max(1, Number(args.limit || 100)));
  if (args.apply === true || args.apply === 'true' || args['dry-run'] === 'false' || args.dryRun === 'false') {
    throw new Error(REPORT_ONLY_REASON);
  }

  console.log('Meeting archive Drive mirror report');
  console.log(`  Crewbert user: ${crewbertEmail}`);
  console.log(`  Root folder id: ${rootFolderId || 'not required in report-only mode'}`);
  console.log(`  Limit: ${limit}`);
  console.log('  Mode: report-only');
  console.log(`  Reason: ${REPORT_ONLY_REASON}`);

  await initFoundationDb();

  const snapshot = await getSharedCommunicationArchiveSnapshot({
    sourceId: 'SRC-MEETINGS-001',
    limit,
    includeSensitive: true,
  });

  const artifacts = snapshot.items.filter(item =>
    item.artifactType === 'meeting_note' || item.artifactType === 'meeting_transcript',
  );

  console.log(`  Meeting artifacts considered: ${artifacts.length}`);

  for (const artifact of artifacts) {
    const periodLabel = derivePeriodLabel(artifact);
    const meetingClass = getMeetingClass(artifact);
    const artifactFolderName = getArtifactFolderName(artifact);
    const fileName = buildMirrorFileName(artifact);

    console.log(`  REPORT ONLY -> ${periodLabel}/${meetingClass}/${artifactFolderName}/${fileName}`);
  }

  console.log('  Drive files created: 0');
}

main()
  .catch(error => {
    console.error('Meeting archive mirror failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
