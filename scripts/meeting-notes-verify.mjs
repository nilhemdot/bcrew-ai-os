#!/usr/bin/env node

import process from 'node:process';
import {
  driveExportDoc,
  driveListFolder,
  driveSearch,
  GOOGLE_SA_KEY_FILE,
  getServiceAccountSummary,
} from '../lib/google-delegated.js';
import { extractTranscriptSection } from '../lib/meeting-transcripts.js';

const DEFAULT_SOURCE_USER = process.env.GOOGLE_MEETING_SOURCE_USER || 'ai@bensoncrew.ca';
const DEFAULT_ARCHIVE_USER = process.env.GOOGLE_MEETING_ARCHIVE_USER || 'crewbert@bensoncrew.ca';
const DEFAULT_MEETING_ROOT_FOLDER =
  process.env.MEETING_NOTES_ROOT_FOLDER || '1HoWP-kHv8SL0hYMdurg3hmtqCq1XFnPD';
const GEMINI_NOTES_QUERY =
  "name contains 'Notes by Gemini' and mimeType = 'application/vnd.google-apps.document' and trashed = false";
const TRANSCRIPT_DOC_QUERY =
  "name contains 'Transcript' and mimeType = 'application/vnd.google-apps.document' and trashed = false";

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

function summarizeText(text) {
  const normalized = String(text || '').trim();
  return {
    characters: normalized.length,
    lines: normalized ? normalized.split(/\r?\n/).filter(Boolean).length : 0,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUser = args.sourceUser || DEFAULT_SOURCE_USER;
  const archiveUser = args.archiveUser || DEFAULT_ARCHIVE_USER;
  const folderId = args.folder || DEFAULT_MEETING_ROOT_FOLDER;
  const searchLimit = Math.max(1, Number(args.searchLimit || 5));
  const folderLimit = Math.max(1, Number(args.folderLimit || 20));

  console.log('Google meeting-notes verification');
  console.log(`  Service account file: ${GOOGLE_SA_KEY_FILE}`);
  console.log(`  Source user: ${sourceUser}`);
  console.log(`  Archive user: ${archiveUser}`);
  console.log(`  Meeting root folder: ${folderId}`);
  console.log(`  Gemini query: ${GEMINI_NOTES_QUERY}`);
  console.log(`  Transcript query: ${TRANSCRIPT_DOC_QUERY}`);

  const summary = getServiceAccountSummary();
  console.log(`  Service account: ${summary.clientEmail}`);
  console.log(`  Project: ${summary.projectId}`);

  const sourceNotes = await driveSearch(
    sourceUser,
    GEMINI_NOTES_QUERY,
    'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
    searchLimit,
  );
  console.log(`  Source search: OK -> ${sourceNotes.length} Gemini-note docs`);

  const transcriptDocs = await driveSearch(
    sourceUser,
    TRANSCRIPT_DOC_QUERY,
    'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
    searchLimit,
  );
  console.log(`  Transcript search: OK -> ${transcriptDocs.length} standalone transcript docs`);

  const archivedNotes = await driveListFolder(archiveUser, folderId, folderLimit);
  const archiveDocs = archivedNotes.filter(
    file => file?.mimeType === 'application/vnd.google-apps.document',
  );
  console.log(
    `  Archive folder: OK -> ${archivedNotes.length} items, ${archiveDocs.length} Google Docs`,
  );

  const exportTarget =
    sortNewestFirst(archiveDocs)[0] ||
    sortNewestFirst(
      sourceNotes.filter(file => file?.mimeType === 'application/vnd.google-apps.document'),
    )[0];

  if (!exportTarget?.id) {
    throw new Error('No meeting-note document found to export.');
  }

  const text = await driveExportDoc(
    archiveDocs.some(file => file.id === exportTarget.id) ? archiveUser : sourceUser,
    exportTarget.id,
  );
  const textSummary = summarizeText(text);
  const transcriptSection = extractTranscriptSection(text);

  console.log(
    `  Export sample: OK -> file ${exportTarget.id}, modified ${exportTarget.modifiedTime || 'unknown'}, ${textSummary.characters} chars, ${textSummary.lines} lines`,
  );
  if (!transcriptSection && !transcriptDocs.length) {
    throw new Error('No transcript path detected in current meeting artifacts.');
  }
  console.log(
    `  Transcript sample: ${
      transcriptSection
        ? `OK -> ${transcriptSection.transcriptLineCount} transcript lines, ${transcriptSection.speakerNames.length} speakers`
        : 'OK -> standalone transcript docs present'
    }`,
  );
  console.log('Meeting-note and transcript reads are ready for shared-communications source verification.');
}

main().catch((error) => {
  console.error('Meeting-notes verification failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
