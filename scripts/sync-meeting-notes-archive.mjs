#!/usr/bin/env node

import process from 'node:process';
import { driveExportDoc, driveSearch } from '../lib/google-delegated.js';
import {
  closeFoundationDb,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  upsertSharedCommunicationArtifact,
} from '../lib/foundation-db.js';
import {
  buildEmbeddedTranscriptExternalId,
  buildEmbeddedTranscriptTitle,
  extractTranscriptSection,
  normalizeMeetingArtifactKey,
  transcriptTextHash,
} from '../lib/meeting-transcripts.js';

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

function sortNewestFirst(files) {
  return [...files].sort((left, right) =>
    String(right?.modifiedTime || '').localeCompare(String(left?.modifiedTime || '')),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUser = args.user || DEFAULT_SOURCE_USER;
  const limit = Math.min(50, Math.max(1, Number(args.limit || 5)));
  const searchLimit = Math.min(50, Math.max(limit * 4, 10));

  console.log('Sync meeting artifacts into shared communications archive');
  console.log(`  Source user: ${sourceUser}`);
  console.log(`  Gemini query: ${GEMINI_NOTES_QUERY}`);
  console.log(`  Transcript query: ${TRANSCRIPT_DOC_QUERY}`);
  console.log(`  Limit: ${limit}`);

  await initFoundationDb();

  const geminiFiles = sortNewestFirst(
    await driveSearch(
      sourceUser,
      GEMINI_NOTES_QUERY,
      'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
      searchLimit,
    ),
  ).filter(file => file?.mimeType === 'application/vnd.google-apps.document');

  const transcriptDocs = sortNewestFirst(
    await driveSearch(
      sourceUser,
      TRANSCRIPT_DOC_QUERY,
      'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
      searchLimit,
    ),
  ).filter(file => file?.mimeType === 'application/vnd.google-apps.document');

  console.log(`  Gemini docs found: ${geminiFiles.length}`);
  console.log(`  Transcript docs found: ${transcriptDocs.length}`);

  const transcriptByMeetingKey = new Map();
  let standaloneTranscriptsArchived = 0;

  for (const file of transcriptDocs.slice(0, limit)) {
    const contentText = await driveExportDoc(sourceUser, file.id);
    const extractedTranscript = extractTranscriptSection(contentText);
    const transcriptText = extractedTranscript?.transcriptText || String(contentText || '').trim();
    const meetingKey = normalizeMeetingArtifactKey(file.name);

    await upsertSharedCommunicationArtifact(
      {
        sourceId: 'SRC-MEETINGS-001',
        artifactType: 'meeting_transcript',
        externalId: file.id,
        title: file.name || 'Meeting transcript',
        sourceAccount: sourceUser,
        sourceContainer: 'Google Drive / Meeting transcripts',
        sourceUrl: file.webViewLink || null,
        participants: extractedTranscript?.speakerNames || [],
        contentText: transcriptText,
        contentHash: transcriptTextHash(transcriptText),
        artifactUpdatedAt: file.modifiedTime || null,
        metadata: {
          query: TRANSCRIPT_DOC_QUERY,
          meetingKey,
          parents: Array.isArray(file.parents) ? file.parents : [],
          transcriptSource: 'standalone',
          transcriptLineCount: extractedTranscript?.transcriptLineCount || 0,
          speakerCount: extractedTranscript?.speakerNames?.length || 0,
          transcriptSectionDetected: Boolean(extractedTranscript),
        },
      },
      'system',
    );

    standaloneTranscriptsArchived += 1;
    if (meetingKey && !transcriptByMeetingKey.has(meetingKey)) {
      transcriptByMeetingKey.set(meetingKey, {
        artifactId: `SRC-MEETINGS-001:${file.id}`,
        externalId: file.id,
        participants: extractedTranscript?.speakerNames || [],
        transcriptSource: 'standalone',
      });
    }
  }

  let meetingNotesArchived = 0;
  let embeddedTranscriptsArchived = 0;
  let missingTranscriptCount = 0;
  const missingTranscriptNotes = [];

  for (const file of geminiFiles.slice(0, limit)) {
    const contentText = await driveExportDoc(sourceUser, file.id);
    const meetingKey = normalizeMeetingArtifactKey(file.name);
    let transcriptInfo = meetingKey ? transcriptByMeetingKey.get(meetingKey) || null : null;
    let transcriptSource = transcriptInfo?.transcriptSource || 'missing';

    if (!transcriptInfo) {
      const embeddedTranscript = extractTranscriptSection(contentText);
      if (embeddedTranscript?.transcriptText) {
        const transcriptExternalId = buildEmbeddedTranscriptExternalId(file.id);
        await upsertSharedCommunicationArtifact(
          {
            sourceId: 'SRC-MEETINGS-001',
            artifactType: 'meeting_transcript',
            externalId: transcriptExternalId,
            title: buildEmbeddedTranscriptTitle(file.name),
            sourceAccount: sourceUser,
            sourceContainer: 'Google Drive / Notes by Gemini (embedded transcript)',
            sourceUrl: file.webViewLink || null,
            participants: embeddedTranscript.speakerNames,
            contentText: embeddedTranscript.transcriptText,
            contentHash: transcriptTextHash(embeddedTranscript.transcriptText),
            artifactUpdatedAt: file.modifiedTime || null,
            metadata: {
              query: GEMINI_NOTES_QUERY,
              meetingKey,
              parents: Array.isArray(file.parents) ? file.parents : [],
              transcriptSource: 'embedded_in_gemini',
              noteExternalId: file.id,
              transcriptLineCount: embeddedTranscript.transcriptLineCount,
              speakerCount: embeddedTranscript.speakerNames.length,
            },
          },
          'system',
        );

        transcriptInfo = {
          artifactId: `SRC-MEETINGS-001:${transcriptExternalId}`,
          externalId: transcriptExternalId,
          participants: embeddedTranscript.speakerNames,
          transcriptSource: 'embedded_in_gemini',
        };
        embeddedTranscriptsArchived += 1;
        transcriptSource = 'embedded_in_gemini';

        if (meetingKey && !transcriptByMeetingKey.has(meetingKey)) {
          transcriptByMeetingKey.set(meetingKey, transcriptInfo);
        }
      } else {
        missingTranscriptCount += 1;
        transcriptSource = 'missing';
        if (missingTranscriptNotes.length < 5) missingTranscriptNotes.push(file.name);
      }
    }

    await upsertSharedCommunicationArtifact(
      {
        sourceId: 'SRC-MEETINGS-001',
        artifactType: 'meeting_note',
        externalId: file.id,
        title: file.name || 'Notes by Gemini',
        sourceAccount: sourceUser,
        sourceContainer: 'Google Drive / Notes by Gemini',
        sourceUrl: file.webViewLink || null,
        participants: transcriptInfo?.participants || [],
        contentText,
        contentHash: transcriptTextHash(contentText),
        artifactUpdatedAt: file.modifiedTime || null,
        metadata: {
          query: GEMINI_NOTES_QUERY,
          meetingKey,
          parents: Array.isArray(file.parents) ? file.parents : [],
          transcriptSource,
          transcriptArtifactId: transcriptInfo?.artifactId || null,
          transcriptExternalId: transcriptInfo?.externalId || null,
          transcriptMissing: !transcriptInfo,
        },
      },
      'system',
    );

    meetingNotesArchived += 1;
  }

  const archive = await getSharedCommunicationArchiveSnapshot({
    sourceId: 'SRC-MEETINGS-001',
    limit: Math.min(10, searchLimit),
  });

  console.log(`  Standalone transcripts archived: ${standaloneTranscriptsArchived}`);
  console.log(`  Embedded transcripts archived: ${embeddedTranscriptsArchived}`);
  console.log(`  Gemini notes archived: ${meetingNotesArchived}`);
  console.log(`  Missing transcript meetings: ${missingTranscriptCount}`);
  console.log(`  Archive total: ${archive.totalArtifacts}`);
  if (archive.byType) {
    console.log(`  Archive by type: ${JSON.stringify(archive.byType)}`);
  }
  if (missingTranscriptNotes.length) {
    console.log(`  Missing transcript sample: ${missingTranscriptNotes.join(' | ')}`);
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
