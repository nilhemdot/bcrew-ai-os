#!/usr/bin/env node

import process from 'node:process';
import { closeFoundationDb, initFoundationDb } from '../lib/foundation-db-session.js';
import { upsertSharedCommunicationArtifact } from '../lib/foundation-shared-comms-db.js';
import { classifyMeetingShape } from '../lib/meeting-classification.js';
import {
  buildMeetingArtifactExternalId,
  extractSpeakerNamesFromTranscript,
  transcriptTextHash,
} from '../lib/meeting-transcripts.js';
import {
  GOOGLE_SCOPES,
  driveListFolder,
  getDriveFileMetadata,
  googleTextFetch,
} from '../lib/google-delegated.js';

const DEFAULT_SOURCE_ID = 'SRC-MEETINGS-001';
const DEFAULT_SOURCE_USER = process.env.GOOGLE_MEETING_SOURCE_USER || 'steve.zahnd@bensoncrew.ca';
const DEFAULT_ROOT_FOLDER_ID = '1hVEFoc4KHqTY9i67RP8sMOy9kgwfemdP';

const CHAT_FILE_PATTERNS = [/^meeting_saved_chat\.txt$/i, /^meeting_saved_new_chat\.txt$/i, /^chat\.txt$/i];
const TRANSCRIPT_FILE_PATTERNS = [
  /\.vtt$/i,
  /\.srt$/i,
  /transcript/i,
  /caption/i,
];

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function normalizeDateOnly(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}

function parseMeetingFolderStamp(folderName) {
  const match = String(folderName || '').match(
    /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2})[.:](\d{2})[.:](\d{2}))?/,
  );
  if (!match) return null;

  const [, datePart, hour = '00', minute = '00', second = '00'] = match;
  return {
    dateOnly: datePart,
    stamp: `${datePart}T${hour}:${minute}:${second}`,
  };
}

function isMeetingFolder(item) {
  return item?.mimeType === 'application/vnd.google-apps.folder' && /^\d{4}-\d{2}-\d{2}/.test(String(item?.name || ''));
}

function classifyZoomTextFile(file) {
  const name = String(file?.name || '').trim();
  if (!name) return null;

  if (CHAT_FILE_PATTERNS.some(pattern => pattern.test(name))) {
    return {
      artifactType: 'meeting_note',
      zoomArtifactKind: 'chat',
    };
  }

  if (TRANSCRIPT_FILE_PATTERNS.some(pattern => pattern.test(name))) {
    return {
      artifactType: 'meeting_transcript',
      zoomArtifactKind: /\.vtt$/i.test(name) || /\.srt$/i.test(name) ? 'caption' : 'transcript',
    };
  }

  return null;
}

function isWithinDateRange(folderName, startDate, endDate) {
  const parsed = parseMeetingFolderStamp(folderName);
  if (!parsed?.dateOnly) return false;
  if (startDate && parsed.dateOnly < startDate) return false;
  if (endDate && parsed.dateOnly > endDate) return false;
  return true;
}

function buildDriveMediaUrl(fileId) {
  return (
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    '?alt=media&supportsAllDrives=true'
  );
}

function extractZoomChatParticipants(text) {
  const participants = new Set();
  const pattern = /^\d{1,2}:\d{2}:\d{2}\s+From\s+(.+?)\s+to\s+.+?:\s*$/gm;
  const normalized = String(text || '').replace(/\r/g, '');
  let match = pattern.exec(normalized);
  while (match) {
    const name = String(match[1] || '').trim();
    if (name) participants.add(name);
    match = pattern.exec(normalized);
  }
  return [...participants];
}

async function downloadDriveText(userEmail, fileId) {
  return googleTextFetch(userEmail, buildDriveMediaUrl(fileId), {
    scopes: [GOOGLE_SCOPES.drive],
    accept: 'text/plain',
  });
}

function buildZoomExternalId(folder, file, artifactType) {
  const base = buildMeetingArtifactExternalId(folder.name, artifactType, file.id);
  return `${base}:${file.id}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUser = String(args.user || args.sourceUser || DEFAULT_SOURCE_USER).trim();
  const rootFolderId = String(args.folderId || args.rootFolderId || DEFAULT_ROOT_FOLDER_ID).trim();
  const limit = Math.min(1000, Math.max(1, Number(args.limit || 250)));
  const childLimit = Math.min(100, Math.max(5, Number(args.childLimit || 20)));
  const startDate = normalizeDateOnly(args.start || args.startDate || '2024-10-01');
  const endDate = normalizeDateOnly(args.end || args.endDate || '2025-03-31');
  const dryRun = String(args.dryRun || '').trim() === 'true';

  if (!sourceUser) throw new Error('A delegated Google source user is required.');
  if (!rootFolderId) throw new Error('A Drive folder id is required.');

  await initFoundationDb();

  const rootFolder = await getDriveFileMetadata(sourceUser, rootFolderId);
  const topLevelItems = await driveListFolder(sourceUser, rootFolderId, 1000, { orderBy: 'name' });
  const targetFolders = topLevelItems
    .filter(isMeetingFolder)
    .filter(folder => isWithinDateRange(folder.name, startDate, endDate))
    .slice(0, limit);

  console.log('Sync Zoom text artifacts into shared communications archive');
  console.log(`  Root folder: ${rootFolder?.name || rootFolderId}`);
  console.log(`  Source user: ${sourceUser}`);
  console.log(`  Date range: ${startDate || 'open'} -> ${endDate || 'open'}`);
  console.log(`  Meeting folders selected: ${targetFolders.length}`);
  console.log(`  Child scan limit per meeting: ${childLimit}`);
  if (dryRun) console.log('  Mode: dry-run');

  let foldersScanned = 0;
  let textArtifactsFound = 0;
  let archivedNotes = 0;
  let archivedTranscripts = 0;
  let skippedEmpty = 0;
  let failed = 0;
  const samples = [];
  const failures = [];

  for (const folder of targetFolders) {
    foldersScanned += 1;
    const folderItems = await driveListFolder(sourceUser, folder.id, childLimit, { orderBy: 'folder,name' });
    const textArtifacts = folderItems
      .map(file => ({ file, kind: classifyZoomTextFile(file) }))
      .filter(entry => entry.kind);

    textArtifactsFound += textArtifacts.length;

    for (const entry of textArtifacts) {
      const { file, kind } = entry;

      try {
        const contentText = await downloadDriveText(sourceUser, file.id);
        if (!String(contentText || '').trim()) {
          skippedEmpty += 1;
          continue;
        }

        const participants =
          kind.zoomArtifactKind === 'chat'
            ? extractZoomChatParticipants(contentText)
            : extractSpeakerNamesFromTranscript(contentText);

        const meetingShape = classifyMeetingShape({
          title: folder.name,
          observedAccounts: [sourceUser],
          transcriptParticipants: participants,
        });

        const externalId = buildZoomExternalId(folder, file, kind.artifactType);
        const metadata = {
          archiveVersion: 'zoom_text_archive_v1',
          meetingPlatform: 'zoom',
          zoomArtifactKind: kind.zoomArtifactKind,
          rootFolderId,
          rootFolderName: rootFolder?.name || null,
          meetingFolderId: folder.id,
          meetingFolderName: folder.name,
          fileId: file.id,
          fileName: file.name,
          fileMimeType: file.mimeType || null,
          meetingFolderStamp: parseMeetingFolderStamp(folder.name)?.stamp || null,
          meetingFolderDate: parseMeetingFolderStamp(folder.name)?.dateOnly || null,
          meetingClass: meetingShape.meetingClass,
          privacyProfile: meetingShape.privacyProfile,
          attendeeSignalCount: meetingShape.attendeeSignalCount,
          sensitiveMeetingCandidate: meetingShape.sensitiveMeetingCandidate,
          meetingClassReason: meetingShape.classificationReason,
          importedFromHistoricalZoom: true,
        };

        if (!dryRun) {
          await upsertSharedCommunicationArtifact(
            {
              sourceId: DEFAULT_SOURCE_ID,
              artifactType: kind.artifactType,
              externalId,
              title:
                kind.zoomArtifactKind === 'chat'
                  ? `${folder.name} - Zoom Chat`
                  : `${folder.name} - Zoom Transcript`,
              sourceAccount: sourceUser,
              sourceContainer:
                kind.zoomArtifactKind === 'chat'
                  ? 'Google Drive / Historical Zoom chats'
                  : 'Google Drive / Historical Zoom transcripts',
              sourceUrl: file.webViewLink || folder.webViewLink || null,
              participants,
              contentText,
              contentHash: transcriptTextHash(contentText),
              artifactCreatedAt: null,
              artifactUpdatedAt: file.modifiedTime || null,
              metadata,
            },
            'system',
          );
        }

        if (kind.artifactType === 'meeting_note') archivedNotes += 1;
        if (kind.artifactType === 'meeting_transcript') archivedTranscripts += 1;

        if (samples.length < 8) {
          samples.push(`${folder.name} -> ${file.name} (${kind.zoomArtifactKind})`);
        }
      } catch (error) {
        failed += 1;
        if (failures.length < 8) {
          failures.push(
            `${folder.name} -> ${file.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  console.log(`  Folders scanned: ${foldersScanned}`);
  console.log(`  Zoom text artifacts found: ${textArtifactsFound}`);
  console.log(`  Archived as meeting_note: ${archivedNotes}`);
  console.log(`  Archived as meeting_transcript: ${archivedTranscripts}`);
  console.log(`  Skipped empty text artifacts: ${skippedEmpty}`);
  console.log(`  Failed artifacts: ${failed}`);
  if (samples.length) console.log(`  Sample imports: ${samples.join(' | ')}`);
  if (failures.length) console.log(`  Failures: ${failures.join(' | ')}`);
}

main()
  .catch(error => {
    console.error('Zoom text archive sync failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
