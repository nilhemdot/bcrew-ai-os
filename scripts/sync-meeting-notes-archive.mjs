#!/usr/bin/env node

import process from 'node:process';
import { driveExportDoc, driveListFolder, driveSearch } from '../lib/google-delegated.js';
import {
  closeFoundationDb,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  listFoundationUsers,
  upsertSharedCommunicationArtifact,
} from '../lib/foundation-db.js';
import {
  buildEmbeddedTranscriptTitle,
  buildMeetingArtifactExternalId,
  extractTranscriptSection,
  normalizeMeetingArtifactKey,
  transcriptTextHash,
} from '../lib/meeting-transcripts.js';
import { classifyMeetingShape } from '../lib/meeting-classification.js';

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

function buildDriveTimeFilterClause(args) {
  const clauses = [];
  const modifiedAfter = String(args.modifiedAfter || '').trim();
  const modifiedBefore = String(args.modifiedBefore || '').trim();

  if (modifiedAfter) clauses.push(`modifiedTime >= '${modifiedAfter}'`);
  if (modifiedBefore) clauses.push(`modifiedTime < '${modifiedBefore}'`);

  return clauses.length ? ` and ${clauses.join(' and ')}` : '';
}

function sortNewestFirst(items) {
  return [...items].sort((left, right) =>
    String(right?.modifiedTime || '').localeCompare(String(left?.modifiedTime || '')),
  );
}

function toEpoch(value) {
  const epoch = Date.parse(String(value || ''));
  return Number.isFinite(epoch) ? epoch : 0;
}

function normalizeGroupKey(name, fallbackExternalId) {
  return normalizeMeetingArtifactKey(name) || String(fallbackExternalId || '').trim();
}

function buildArtifactCandidate(userEmail, file, variant) {
  return {
    userEmail,
    file,
    variant,
    modifiedEpoch: toEpoch(file?.modifiedTime),
    meetingKey: normalizeGroupKey(file?.name, file?.id),
  };
}

function choosePreferredArtifact(current, candidate, { preferStandalone = false } = {}) {
  if (!current) return candidate;

  if (preferStandalone) {
    const currentStandalone = current.variant === 'standalone_transcript';
    const candidateStandalone = candidate.variant === 'standalone_transcript';
    if (currentStandalone !== candidateStandalone) {
      return candidateStandalone ? candidate : current;
    }
  }

  return candidate.modifiedEpoch > current.modifiedEpoch ? candidate : current;
}

function getOrCreateMeetingGroup(groups, meetingKey) {
  if (!groups.has(meetingKey)) {
    groups.set(meetingKey, {
      meetingKey,
      observedAccounts: new Set(),
      noteObservedAccounts: new Set(),
      transcriptObservedAccounts: new Set(),
      noteFileIds: new Set(),
      transcriptFileIds: new Set(),
      noteCandidate: null,
      transcriptCandidate: null,
      latestModifiedEpoch: 0,
    });
  }

  return groups.get(meetingKey);
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

async function searchMeetingArtifactsForUser(userEmail, searchLimit, queryTimeClause = '') {
  const geminiFiles = sortNewestFirst(
    await driveSearch(
      userEmail,
      `${GEMINI_NOTES_QUERY}${queryTimeClause}`,
      'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
      searchLimit,
      { orderBy: 'modifiedTime desc' },
    ),
  ).filter(file => file?.mimeType === 'application/vnd.google-apps.document');

  const transcriptDocs = sortNewestFirst(
    await driveSearch(
      userEmail,
      `${TRANSCRIPT_DOC_QUERY}${queryTimeClause}`,
      'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
      searchLimit,
      { orderBy: 'modifiedTime desc' },
    ),
  ).filter(file => file?.mimeType === 'application/vnd.google-apps.document');

  return { geminiFiles, transcriptDocs };
}

function isGoogleFolder(file) {
  return file?.mimeType === 'application/vnd.google-apps.folder';
}

function isGoogleDoc(file) {
  return file?.mimeType === 'application/vnd.google-apps.document';
}

function isGeminiNoteDoc(file) {
  return isGoogleDoc(file) && String(file?.name || '').includes('Notes by Gemini');
}

function isTranscriptDoc(file) {
  return isGoogleDoc(file) && String(file?.name || '').includes('Transcript');
}

async function listMeetingArtifactsFromFolders(userEmail, folderIds, searchLimit) {
  const pendingFolderIds = [...new Set(folderIds.filter(Boolean))];
  const visitedFolderIds = new Set();
  const allFiles = [];

  while (pendingFolderIds.length) {
    const folderId = pendingFolderIds.shift();
    if (!folderId || visitedFolderIds.has(folderId)) continue;
    visitedFolderIds.add(folderId);

    const files = await driveListFolder(userEmail, folderId, searchLimit, {
      orderBy: 'modifiedTime desc',
    });

    for (const file of files) {
      allFiles.push(file);
      if (isGoogleFolder(file)) pendingFolderIds.push(file.id);
    }
  }

  const geminiFiles = sortNewestFirst(allFiles.filter(isGeminiNoteDoc));
  const transcriptDocs = sortNewestFirst(allFiles.filter(isTranscriptDoc));

  return { geminiFiles, transcriptDocs };
}

async function archiveStandaloneTranscript(group) {
  const candidate = group.transcriptCandidate;
  if (!candidate || candidate.variant !== 'standalone_transcript') return null;

  const contentText = await driveExportDoc(candidate.userEmail, candidate.file.id);
  const extractedTranscript = extractTranscriptSection(contentText);
  const transcriptText = extractedTranscript?.transcriptText || String(contentText || '').trim();
  const meetingShape = classifyMeetingShape({
    title: candidate.file.name || group.noteCandidate?.file?.name || group.meetingKey,
    observedAccounts: [...group.observedAccounts],
    transcriptParticipants: extractedTranscript?.speakerNames || [],
  });

  const externalId = buildMeetingArtifactExternalId(
    group.meetingKey,
    'meeting_transcript',
    candidate.file.id,
  );

  const artifact = await upsertSharedCommunicationArtifact(
    {
      sourceId: 'SRC-MEETINGS-001',
      artifactType: 'meeting_transcript',
      externalId,
      title: candidate.file.name || 'Meeting transcript',
      sourceAccount: candidate.userEmail,
      sourceContainer: 'Google Drive / Team meeting transcripts',
      sourceUrl: candidate.file.webViewLink || null,
      participants: extractedTranscript?.speakerNames || [],
      contentText: transcriptText,
      contentHash: transcriptTextHash(transcriptText),
      artifactUpdatedAt: candidate.file.modifiedTime || null,
      metadata: {
        query: TRANSCRIPT_DOC_QUERY,
        meetingKey: group.meetingKey,
        archiveVersion: 'meeting_archive_v2',
        transcriptSource: 'standalone',
        primaryFileId: candidate.file.id,
        primarySourceAccount: candidate.userEmail,
        observedAccounts: [...group.transcriptObservedAccounts].sort(),
        observedFileIds: [...group.transcriptFileIds].sort(),
        transcriptLineCount: extractedTranscript?.transcriptLineCount || 0,
        speakerCount: extractedTranscript?.speakerNames?.length || 0,
        transcriptSectionDetected: Boolean(extractedTranscript),
        meetingClass: meetingShape.meetingClass,
        privacyProfile: meetingShape.privacyProfile,
        attendeeSignalCount: meetingShape.attendeeSignalCount,
        sensitiveMeetingCandidate: meetingShape.sensitiveMeetingCandidate,
        meetingClassReason: meetingShape.classificationReason,
      },
    },
    'system',
  );

  return {
    artifact,
    meetingShape,
    transcriptSource: 'standalone',
    participants: extractedTranscript?.speakerNames || [],
    transcriptExternalId: externalId,
  };
}

async function archiveMeetingNoteAndEmbeddedTranscript(group, standaloneTranscriptInfo) {
  const candidate = group.noteCandidate;
  if (!candidate) {
    return {
      noteArchived: false,
      embeddedTranscriptArchived: false,
      transcriptSource: standaloneTranscriptInfo?.transcriptSource || 'missing',
      missingTranscript: !standaloneTranscriptInfo,
    };
  }

  const noteContent = await driveExportDoc(candidate.userEmail, candidate.file.id);
  const embeddedTranscript = extractTranscriptSection(noteContent);
  let transcriptInfo = standaloneTranscriptInfo || null;
  let embeddedTranscriptArchived = false;
  let transcriptSource = standaloneTranscriptInfo?.transcriptSource || 'missing';
  let meetingShape = standaloneTranscriptInfo?.meetingShape || null;

  if (!meetingShape) {
    meetingShape = classifyMeetingShape({
      title: candidate.file.name || group.transcriptCandidate?.file?.name || group.meetingKey,
      observedAccounts: [...group.observedAccounts],
      transcriptParticipants: embeddedTranscript?.speakerNames || [],
    });
  }

  if (!transcriptInfo && embeddedTranscript?.transcriptText) {
    const transcriptExternalId = buildMeetingArtifactExternalId(
      group.meetingKey,
      'meeting_transcript',
      `${candidate.file.id}:embedded-transcript`,
    );

    await upsertSharedCommunicationArtifact(
      {
        sourceId: 'SRC-MEETINGS-001',
        artifactType: 'meeting_transcript',
        externalId: transcriptExternalId,
        title: buildEmbeddedTranscriptTitle(candidate.file.name),
        sourceAccount: candidate.userEmail,
        sourceContainer: 'Google Drive / Team meeting notes (embedded transcript)',
        sourceUrl: candidate.file.webViewLink || null,
        participants: embeddedTranscript.speakerNames,
        contentText: embeddedTranscript.transcriptText,
        contentHash: transcriptTextHash(embeddedTranscript.transcriptText),
        artifactUpdatedAt: candidate.file.modifiedTime || null,
        metadata: {
          query: GEMINI_NOTES_QUERY,
          meetingKey: group.meetingKey,
          archiveVersion: 'meeting_archive_v2',
          transcriptSource: 'embedded_in_gemini',
          primaryFileId: candidate.file.id,
          primarySourceAccount: candidate.userEmail,
          observedAccounts: [...group.noteObservedAccounts].sort(),
          observedFileIds: [...group.noteFileIds].sort(),
          noteExternalId: candidate.file.id,
          transcriptLineCount: embeddedTranscript.transcriptLineCount,
          speakerCount: embeddedTranscript.speakerNames.length,
          meetingClass: meetingShape.meetingClass,
          privacyProfile: meetingShape.privacyProfile,
          attendeeSignalCount: meetingShape.attendeeSignalCount,
          sensitiveMeetingCandidate: meetingShape.sensitiveMeetingCandidate,
          meetingClassReason: meetingShape.classificationReason,
        },
      },
      'system',
    );

    transcriptInfo = {
      meetingShape,
      transcriptSource: 'embedded_in_gemini',
      participants: embeddedTranscript.speakerNames,
      transcriptExternalId,
    };
    transcriptSource = 'embedded_in_gemini';
    embeddedTranscriptArchived = true;
  }

  await upsertSharedCommunicationArtifact(
    {
      sourceId: 'SRC-MEETINGS-001',
      artifactType: 'meeting_note',
      externalId: buildMeetingArtifactExternalId(group.meetingKey, 'meeting_note', candidate.file.id),
      title: candidate.file.name || 'Notes by Gemini',
      sourceAccount: candidate.userEmail,
      sourceContainer: 'Google Drive / Team meeting notes',
      sourceUrl: candidate.file.webViewLink || null,
      participants: transcriptInfo?.participants || [],
      contentText: noteContent,
      contentHash: transcriptTextHash(noteContent),
      artifactUpdatedAt: candidate.file.modifiedTime || null,
      metadata: {
        query: GEMINI_NOTES_QUERY,
        meetingKey: group.meetingKey,
        archiveVersion: 'meeting_archive_v2',
        transcriptSource,
        primaryFileId: candidate.file.id,
        primarySourceAccount: candidate.userEmail,
        observedAccounts: [...group.noteObservedAccounts].sort(),
        observedFileIds: [...group.noteFileIds].sort(),
        transcriptExternalId: transcriptInfo?.transcriptExternalId || null,
        transcriptMissing: !transcriptInfo,
        meetingClass: meetingShape.meetingClass,
        privacyProfile: meetingShape.privacyProfile,
        attendeeSignalCount: meetingShape.attendeeSignalCount,
        sensitiveMeetingCandidate: meetingShape.sensitiveMeetingCandidate,
        meetingClassReason: meetingShape.classificationReason,
      },
    },
    'system',
  );

  return {
    noteArchived: true,
    embeddedTranscriptArchived,
    meetingShape,
    transcriptSource,
    missingTranscript: !transcriptInfo,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(1000, Math.max(1, Number(args.limit || 5)));
  const perUserSearchLimit = Math.min(1000, Math.max(Number(args.searchLimit || limit * 4), 10));
  const queryTimeClause = buildDriveTimeFilterClause(args);
  const folderIds = splitCsv(args.folderIds || args.folderId || '');

  await initFoundationDb();

  const scanUsers = await resolveScanUsers(args);
  const groups = new Map();

  console.log('Sync meeting artifacts into shared communications archive');
  console.log(`  Scan users: ${scanUsers.length}`);
  console.log(`  Gemini query: ${GEMINI_NOTES_QUERY}`);
  console.log(`  Transcript query: ${TRANSCRIPT_DOC_QUERY}`);
  console.log(`  Limit: ${limit}`);
  console.log(`  Search limit per user: ${perUserSearchLimit}`);
  if (queryTimeClause) console.log(`  Drive time filter:${queryTimeClause}`);
  if (folderIds.length) console.log(`  Folder ids: ${folderIds.join(', ')}`);

  for (const userEmail of scanUsers) {
    const { geminiFiles, transcriptDocs } = folderIds.length
      ? await listMeetingArtifactsFromFolders(userEmail, folderIds, perUserSearchLimit)
      : await searchMeetingArtifactsForUser(userEmail, perUserSearchLimit, queryTimeClause);

    console.log(`  ${userEmail}: ${geminiFiles.length} Gemini docs, ${transcriptDocs.length} transcript docs`);

    for (const file of geminiFiles) {
      const candidate = buildArtifactCandidate(userEmail, file, 'meeting_note');
      const group = getOrCreateMeetingGroup(groups, candidate.meetingKey);
      group.observedAccounts.add(userEmail);
      group.noteObservedAccounts.add(userEmail);
      group.noteFileIds.add(file.id);
      group.latestModifiedEpoch = Math.max(group.latestModifiedEpoch, candidate.modifiedEpoch);
      group.noteCandidate = choosePreferredArtifact(group.noteCandidate, candidate);
    }

    for (const file of transcriptDocs) {
      const candidate = buildArtifactCandidate(userEmail, file, 'standalone_transcript');
      const group = getOrCreateMeetingGroup(groups, candidate.meetingKey);
      group.observedAccounts.add(userEmail);
      group.transcriptObservedAccounts.add(userEmail);
      group.transcriptFileIds.add(file.id);
      group.latestModifiedEpoch = Math.max(group.latestModifiedEpoch, candidate.modifiedEpoch);
      group.transcriptCandidate = choosePreferredArtifact(group.transcriptCandidate, candidate, {
        preferStandalone: true,
      });
    }
  }

  const selectedGroups = [...groups.values()]
    .sort((left, right) => right.latestModifiedEpoch - left.latestModifiedEpoch)
    .slice(0, limit);

  console.log(`  Meetings selected for archive: ${selectedGroups.length}`);

  let standaloneTranscriptsArchived = 0;
  let embeddedTranscriptsArchived = 0;
  let meetingNotesArchived = 0;
  let missingTranscriptCount = 0;
  let failedMeetings = 0;
  let broadcastMeetings = 0;
  let discussionMeetings = 0;
  let sensitiveCandidates = 0;
  const missingTranscriptNotes = [];
  const failedMeetingSamples = [];

  for (const group of selectedGroups) {
    try {
      const standaloneTranscriptInfo = await archiveStandaloneTranscript(group);
      if (standaloneTranscriptInfo) standaloneTranscriptsArchived += 1;

      const noteResult = await archiveMeetingNoteAndEmbeddedTranscript(group, standaloneTranscriptInfo);
      if (noteResult.noteArchived) meetingNotesArchived += 1;
      if (noteResult.embeddedTranscriptArchived) embeddedTranscriptsArchived += 1;
      const meetingShape = noteResult.meetingShape || standaloneTranscriptInfo?.meetingShape || null;
      if (meetingShape?.meetingClass === 'broadcast') broadcastMeetings += 1;
      if (meetingShape?.meetingClass === 'discussion') discussionMeetings += 1;
      if (meetingShape?.sensitiveMeetingCandidate) sensitiveCandidates += 1;
      if (noteResult.missingTranscript) {
        missingTranscriptCount += 1;
        if (missingTranscriptNotes.length < 5) {
          missingTranscriptNotes.push(group.noteCandidate?.file?.name || group.transcriptCandidate?.file?.name || group.meetingKey);
        }
      }
    } catch (error) {
      failedMeetings += 1;
      if (failedMeetingSamples.length < 5) {
        failedMeetingSamples.push(
          `${group.noteCandidate?.file?.name || group.transcriptCandidate?.file?.name || group.meetingKey}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  const archive = await getSharedCommunicationArchiveSnapshot({
    sourceId: 'SRC-MEETINGS-001',
    limit: Math.min(10, limit * 2),
  });

  console.log(`  Standalone transcripts archived: ${standaloneTranscriptsArchived}`);
  console.log(`  Embedded transcripts archived: ${embeddedTranscriptsArchived}`);
  console.log(`  Gemini notes archived: ${meetingNotesArchived}`);
  console.log(`  Missing transcript meetings: ${missingTranscriptCount}`);
  console.log(`  Failed meetings: ${failedMeetings}`);
  console.log(`  Meeting classes: ${JSON.stringify({ broadcast: broadcastMeetings, discussion: discussionMeetings })}`);
  console.log(`  Sensitive-candidate meetings: ${sensitiveCandidates}`);
  console.log(`  Archive total: ${archive.totalArtifacts}`);
  if (archive.byType) {
    console.log(`  Archive by type: ${JSON.stringify(archive.byType)}`);
  }
  if (missingTranscriptNotes.length) {
    console.log(`  Missing transcript sample: ${missingTranscriptNotes.join(' | ')}`);
  }
  if (failedMeetingSamples.length) {
    console.log(`  Failed meeting sample: ${failedMeetingSamples.join(' | ')}`);
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
