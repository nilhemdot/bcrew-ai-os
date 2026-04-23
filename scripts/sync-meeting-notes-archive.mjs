#!/usr/bin/env node

import { createHash } from 'node:crypto';
import process from 'node:process';
import { driveExportDoc, driveSearch } from '../lib/google-delegated.js';
import {
  closeFoundationDb,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  upsertSharedCommunicationArtifact,
} from '../lib/foundation-db.js';

const DEFAULT_SOURCE_USER = process.env.GOOGLE_MEETING_SOURCE_USER || 'ai@bensoncrew.ca';
const GEMINI_NOTES_QUERY =
  "name contains 'Notes by Gemini' and mimeType = 'application/vnd.google-apps.document' and trashed = false";

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function sortNewestFirst(files) {
  return [...files].sort((left, right) =>
    String(right?.modifiedTime || '').localeCompare(String(left?.modifiedTime || '')),
  );
}

function hashText(text) {
  return createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUser = args.user || DEFAULT_SOURCE_USER;
  const limit = Math.min(50, Math.max(1, Number(args.limit || 5)));

  console.log('Sync meeting notes into shared communications archive');
  console.log(`  Source user: ${sourceUser}`);
  console.log(`  Query: ${GEMINI_NOTES_QUERY}`);
  console.log(`  Limit: ${limit}`);

  await initFoundationDb();

  const files = sortNewestFirst(
    await driveSearch(
      sourceUser,
      GEMINI_NOTES_QUERY,
      'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
      limit,
    ),
  ).filter(file => file?.mimeType === 'application/vnd.google-apps.document');

  console.log(`  Source docs found: ${files.length}`);

  let archived = 0;

  for (const file of files) {
    const contentText = await driveExportDoc(sourceUser, file.id);
    await upsertSharedCommunicationArtifact(
      {
        sourceId: 'SRC-MEETINGS-001',
        artifactType: 'meeting_note',
        externalId: file.id,
        title: file.name || 'Notes by Gemini',
        sourceAccount: sourceUser,
        sourceContainer: 'Google Drive / Notes by Gemini',
        sourceUrl: file.webViewLink || null,
        participants: [],
        contentText,
        contentHash: hashText(contentText),
        artifactUpdatedAt: file.modifiedTime || null,
        metadata: {
          query: GEMINI_NOTES_QUERY,
          parents: Array.isArray(file.parents) ? file.parents : [],
        },
      },
      'system',
    );
    archived += 1;
  }

  const archive = await getSharedCommunicationArchiveSnapshot({
    sourceId: 'SRC-MEETINGS-001',
    artifactType: 'meeting_note',
    limit: Math.min(5, limit),
  });

  console.log(`  Archived this run: ${archived}`);
  console.log(`  Archive total: ${archive.totalArtifacts}`);
  if (archive.items[0]) {
    console.log(
      `  Latest item: ${archive.items[0].artifactId} (${archive.items[0].contentLength} chars, updated ${archive.items[0].artifactUpdatedAt || 'unknown'})`,
    );
  }
}

main()
  .catch(error => {
    console.error('Meeting-note archive sync failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
