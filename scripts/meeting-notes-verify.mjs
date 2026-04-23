#!/usr/bin/env node

import process from 'node:process';
import {
  driveExportDoc,
  driveSearch,
  GOOGLE_SA_KEY_FILE,
  getServiceAccountSummary,
} from '../lib/google-delegated.js';
import { closeFoundationDb, initFoundationDb, listFoundationUsers } from '../lib/foundation-db.js';
import { extractTranscriptSection } from '../lib/meeting-transcripts.js';

const DEFAULT_SOURCE_USER = process.env.GOOGLE_MEETING_SOURCE_USER || 'ai@bensoncrew.ca';
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

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function sortNewestFirst(items) {
  return [...items].sort((left, right) =>
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

async function resolveScanUsers(args) {
  const argUsers = splitCsv(args.users || '');
  const envUsers = splitCsv(process.env.GOOGLE_MEETING_SOURCE_USERS || '');

  if (args.user || args.sourceUser) {
    return [String(args.user || args.sourceUser).trim()].filter(Boolean);
  }

  if (argUsers.length) return argUsers;
  if (envUsers.length) return envUsers;

  const users = await listFoundationUsers({ meetingSyncEnabled: true });
  const emails = users.map(user => user.email).filter(Boolean);
  return emails.length ? emails : [DEFAULT_SOURCE_USER];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const searchLimit = Math.max(1, Number(args.searchLimit || 5));
  const checkUsers = Math.max(1, Number(args.checkUsers || 3));

  await initFoundationDb();

  const allScanUsers = await resolveScanUsers(args);
  const scanUsers = allScanUsers.slice(0, checkUsers);

  console.log('Google meeting-notes verification');
  console.log(`  Service account file: ${GOOGLE_SA_KEY_FILE}`);
  console.log(`  Scan users configured: ${allScanUsers.length}`);
  console.log(`  Scan users checked: ${scanUsers.join(', ')}`);
  console.log(`  Gemini query: ${GEMINI_NOTES_QUERY}`);
  console.log(`  Transcript query: ${TRANSCRIPT_DOC_QUERY}`);

  const summary = getServiceAccountSummary();
  console.log(`  Service account: ${summary.clientEmail}`);
  console.log(`  Project: ${summary.projectId}`);

  let totalGeminiDocs = 0;
  let totalTranscriptDocs = 0;
  let exportTarget = null;

  for (const userEmail of scanUsers) {
    const sourceNotes = await driveSearch(
      userEmail,
      GEMINI_NOTES_QUERY,
      'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
      searchLimit,
    );
    const transcriptDocs = await driveSearch(
      userEmail,
      TRANSCRIPT_DOC_QUERY,
      'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
      searchLimit,
    );

    const docs = sortNewestFirst(
      sourceNotes.filter(file => file?.mimeType === 'application/vnd.google-apps.document'),
    );
    const transcripts = sortNewestFirst(
      transcriptDocs.filter(file => file?.mimeType === 'application/vnd.google-apps.document'),
    );

    totalGeminiDocs += docs.length;
    totalTranscriptDocs += transcripts.length;

    const userExportTarget = docs[0] || transcripts[0] || null;
    if (
      userExportTarget &&
      (!exportTarget ||
        String(userExportTarget.modifiedTime || '').localeCompare(
          String(exportTarget.file?.modifiedTime || ''),
        ) > 0)
    ) {
      exportTarget = { userEmail, file: userExportTarget };
    }

    console.log(
      `  ${userEmail}: ${docs.length} Gemini-note docs, ${transcripts.length} standalone transcript docs`,
    );
  }

  if (!exportTarget?.file?.id) {
    throw new Error('No meeting-note or transcript document found to export.');
  }

  const text = await driveExportDoc(exportTarget.userEmail, exportTarget.file.id);
  const textSummary = summarizeText(text);
  const transcriptSection = extractTranscriptSection(text);

  console.log(`  Gemini-note docs found: ${totalGeminiDocs}`);
  console.log(`  Standalone transcript docs found: ${totalTranscriptDocs}`);
  console.log(
    `  Export sample: OK -> ${exportTarget.userEmail} / ${exportTarget.file.id}, modified ${exportTarget.file.modifiedTime || 'unknown'}, ${textSummary.characters} chars, ${textSummary.lines} lines`,
  );
  if (!transcriptSection && !totalTranscriptDocs) {
    throw new Error('No transcript path detected in current meeting artifacts.');
  }
  console.log(
    `  Transcript sample: ${
      transcriptSection
        ? `OK -> ${transcriptSection.transcriptLineCount} transcript lines, ${transcriptSection.speakerNames.length} speakers`
        : 'OK -> standalone transcript docs present'
    }`,
  );
  console.log('Team meeting-note and transcript reads are ready for shared-communications verification.');
}

main()
  .catch(error => {
    console.error('Meeting-notes verification failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(async () => {
    await closeFoundationDb();
  });
