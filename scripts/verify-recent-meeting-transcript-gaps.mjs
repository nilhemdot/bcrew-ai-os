#!/usr/bin/env node

import process from 'node:process';
import { Pool } from 'pg';
import { driveExportDoc, driveSearch, getDriveFileMetadata } from '../lib/google-delegated.js';
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import { upsertSharedCommunicationArtifact } from '../lib/foundation-shared-comms-db.js'
import { listFoundationUsers } from '../lib/foundation-people-sales-db.js'
import { classifyMeetingShape } from '../lib/meeting-classification.js';
import {
  buildEmbeddedTranscriptTitle,
  buildMeetingArtifactExternalId,
  extractTranscriptSection,
  normalizeMeetingArtifactKey,
  transcriptTextHash,
} from '../lib/meeting-transcripts.js';

const pool = new Pool({
  host: process.env.BCREW_DB_HOST || '/tmp',
  database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
  user: process.env.BCREW_DB_USER || process.env.USER,
});

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
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMeetingDateFromTitle(title) {
  const match = String(title || '').match(/(?: - |started )(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}) ([A-Z]{2,4}) - Notes by Gemini$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, timezone] = match;
  const offsetHours = timezone === 'EST' ? 5 : timezone === 'EDT' ? 4 : 0;
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) + offsetHours,
    Number(minute),
  ));
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return 'n/a';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }).formatToParts(date).map(part => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${parts.timeZoneName}`;
}

function daysAgo(days) {
  return new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
}

function parseSince(args) {
  if (args.since) {
    const since = new Date(`${args.since}T00:00:00-04:00`);
    if (!Number.isNaN(since.getTime())) return since;
  }
  return daysAgo(Math.max(1, Number(args.days || 14)));
}

function stripSeriesTitle(title) {
  return String(title || '')
    .replace(/^Notes by Gemini: /, '')
    .replace(/ - \d{4}\/\d{2}\/\d{2}.*$/, '')
    .trim();
}

function tokenizeTitle(title) {
  return new Set(
    stripSeriesTitle(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .map(token => token.trim())
      .filter(token => token.length >= 3 && !['the', 'and', 'with', 'for', 'meeting', 'started'].includes(token)),
  );
}

function tokenOverlap(leftTitle, rightTitle) {
  const left = tokenizeTitle(leftTitle);
  const right = tokenizeTitle(rightTitle);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / Math.max(left.size, right.size);
}

function getMeetingDate(row) {
  return parseMeetingDateFromTitle(row.title) || toDate(row.artifact_updated_at) || toDate(row.ingested_at);
}

function getObservedAccounts(metadata, sourceAccount) {
  return [
    sourceAccount,
    metadata?.primarySourceAccount,
    ...(Array.isArray(metadata?.observedAccounts) ? metadata.observedAccounts : []),
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function getFileIdFromUrl(url) {
  const match = String(url || '').match(/\/document\/d\/([^/]+)/);
  return match?.[1] || '';
}

async function loadRecentMissingNotes(since, limit) {
  const result = await pool.query(`
    WITH grouped AS (
      SELECT
        COALESCE(metadata->>'meetingKey', external_id) AS meeting_key,
        bool_or(artifact_type = 'meeting_transcript') AS has_transcript
      FROM shared_communication_artifacts
      WHERE source_id = 'SRC-MEETINGS-001'
      GROUP BY 1
    ),
    latest_notes AS (
      SELECT DISTINCT ON (COALESCE(metadata->>'meetingKey', external_id))
        artifact_id,
        COALESCE(metadata->>'meetingKey', external_id) AS meeting_key,
        external_id,
        title,
        source_account,
        source_container,
        source_url,
        participants,
        content_text,
        content_hash,
        artifact_created_at,
        artifact_updated_at,
        metadata,
        ingested_at
      FROM shared_communication_artifacts
      WHERE source_id = 'SRC-MEETINGS-001'
        AND artifact_type = 'meeting_note'
      ORDER BY
        COALESCE(metadata->>'meetingKey', external_id),
        artifact_updated_at DESC NULLS LAST,
        ingested_at DESC
    )
    SELECT latest_notes.*
    FROM latest_notes
    JOIN grouped USING (meeting_key)
    WHERE grouped.has_transcript = false
    ORDER BY latest_notes.artifact_updated_at DESC NULLS LAST, latest_notes.title ASC
  `);

  return result.rows
    .map(row => ({ ...row, meetingDate: getMeetingDate(row) }))
    .filter(row => row.meetingDate && row.meetingDate >= since)
    .sort((left, right) => right.meetingDate.getTime() - left.meetingDate.getTime())
    .slice(0, limit);
}

async function resolveScanUsers(args) {
  const argUsers = String(args.users || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (argUsers.length) return argUsers;

  const users = await listFoundationUsers({ meetingSyncEnabled: true });
  const emails = users.map(user => user.email).filter(Boolean);
  return emails.length ? emails : [process.env.GOOGLE_MEETING_SOURCE_USER || 'ai@bensoncrew.ca'];
}

async function exportDocFromAnyAccount(fileId, accounts) {
  let lastError = null;
  for (const account of accounts) {
    try {
      const [file, contentText] = await Promise.all([
        getDriveFileMetadata(account, fileId),
        driveExportDoc(account, fileId),
      ]);
      return { account, file, contentText };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    account: null,
    file: null,
    contentText: '',
    error: lastError instanceof Error ? lastError.message : String(lastError || 'No account could export the doc.'),
  };
}

async function loadRecentStandaloneTranscriptDocs(users, since, perUserLimit) {
  const modifiedAfter = new Date(since.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const docs = [];

  for (const userEmail of users) {
    const files = await driveSearch(
      userEmail,
      [
        "name contains 'Transcript'",
        "mimeType = 'application/vnd.google-apps.document'",
        'trashed = false',
        `modifiedTime >= '${modifiedAfter}'`,
      ].join(' and '),
      'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
      perUserLimit,
      { orderBy: 'modifiedTime desc' },
    );

    for (const file of files) {
      docs.push({
        userEmail,
        file,
        meetingKey: normalizeMeetingArtifactKey(file.name),
        meetingDate: parseMeetingDateFromTitle(`${file.name.replace(/\s+-\s+Transcript$/i, '')} - Notes by Gemini`),
      });
    }
  }

  return docs;
}

function findStandaloneMatch(note, transcriptDocs) {
  const noteKey = normalizeMeetingArtifactKey(note.title);
  const exact = transcriptDocs.find(doc => doc.meetingKey === noteKey);
  if (exact) return { matchType: 'exact', doc: exact };

  const noteDate = note.meetingDate;
  if (!noteDate) return null;

  const sameDayMatches = transcriptDocs
    .map(doc => ({
      doc,
      overlap: tokenOverlap(note.title, doc.file.name),
      sameDay: doc.meetingDate && doc.meetingDate.toISOString().slice(0, 10) === noteDate.toISOString().slice(0, 10),
    }))
    .filter(item => item.sameDay && item.overlap >= 0.5)
    .sort((left, right) => right.overlap - left.overlap);

  if (sameDayMatches[0]) return { matchType: 'similar_date_title', ...sameDayMatches[0] };
  return null;
}

async function repairFromEmbeddedTranscript(note, exported, transcript) {
  const metadata = note.metadata || {};
  const meetingShape = classifyMeetingShape({
    title: note.title,
    observedAccounts: getObservedAccounts(metadata, note.source_account),
    transcriptParticipants: transcript.speakerNames || [],
  });
  const transcriptExternalId = buildMeetingArtifactExternalId(
    metadata.meetingKey || note.meeting_key,
    'meeting_transcript',
    `${exported.file.id}:embedded-transcript`,
  );

  const transcriptArtifact = await upsertSharedCommunicationArtifact(
    {
      sourceId: 'SRC-MEETINGS-001',
      artifactType: 'meeting_transcript',
      externalId: transcriptExternalId,
      title: buildEmbeddedTranscriptTitle(note.title),
      sourceAccount: exported.account,
      sourceContainer: 'Google Drive / Team meeting notes (embedded transcript)',
      sourceUrl: exported.file.webViewLink || note.source_url || null,
      participants: transcript.speakerNames || [],
      contentText: transcript.transcriptText,
      contentHash: transcriptTextHash(transcript.transcriptText),
      artifactUpdatedAt: exported.file.modifiedTime || note.artifact_updated_at || null,
      metadata: {
        query: metadata.query || null,
        meetingKey: metadata.meetingKey || note.meeting_key,
        archiveVersion: 'meeting_archive_v2',
        transcriptSource: 'embedded_in_gemini',
        primaryFileId: exported.file.id,
        primarySourceAccount: exported.account,
        observedAccounts: getObservedAccounts(metadata, note.source_account),
        observedFileIds: Array.isArray(metadata.observedFileIds) ? metadata.observedFileIds : [exported.file.id],
        noteExternalId: exported.file.id,
        transcriptLineCount: transcript.transcriptLineCount,
        speakerCount: transcript.speakerNames?.length || 0,
        meetingClass: meetingShape.meetingClass,
        privacyProfile: meetingShape.privacyProfile,
        attendeeSignalCount: meetingShape.attendeeSignalCount,
        sensitiveMeetingCandidate: meetingShape.sensitiveMeetingCandidate,
        meetingClassReason: meetingShape.classificationReason,
        repairedBy: 'verify-recent-meeting-transcript-gaps',
        repairedAt: new Date().toISOString(),
      },
    },
    'meeting-gap-repair',
  );

  await upsertSharedCommunicationArtifact(
    {
      artifactId: note.artifact_id,
      sourceId: 'SRC-MEETINGS-001',
      artifactType: 'meeting_note',
      externalId: note.external_id,
      title: note.title,
      sourceAccount: exported.account || note.source_account,
      sourceContainer: note.source_container || 'Google Drive / Team meeting notes',
      sourceUrl: exported.file.webViewLink || note.source_url || null,
      participants: transcript.speakerNames || [],
      contentText: exported.contentText || note.content_text || '',
      contentHash: transcriptTextHash(exported.contentText || note.content_text || ''),
      artifactCreatedAt: note.artifact_created_at || null,
      artifactUpdatedAt: exported.file.modifiedTime || note.artifact_updated_at || null,
      metadata: {
        ...metadata,
        transcriptSource: 'embedded_in_gemini',
        transcriptExternalId,
        transcriptMissing: false,
        meetingClass: meetingShape.meetingClass,
        privacyProfile: meetingShape.privacyProfile,
        attendeeSignalCount: meetingShape.attendeeSignalCount,
        sensitiveMeetingCandidate: meetingShape.sensitiveMeetingCandidate,
        meetingClassReason: meetingShape.classificationReason,
        repairedBy: 'verify-recent-meeting-transcript-gaps',
        repairedAt: new Date().toISOString(),
      },
    },
    'meeting-gap-repair',
  );

  return transcriptArtifact.artifactId;
}

async function repairFromStandaloneTranscript(note, match) {
  const contentText = await driveExportDoc(match.doc.userEmail, match.doc.file.id);
  const transcript = extractTranscriptSection(contentText);
  const transcriptText = transcript?.transcriptText || String(contentText || '').trim();
  const speakerNames = transcript?.speakerNames || [];
  const metadata = note.metadata || {};
  const meetingShape = classifyMeetingShape({
    title: match.doc.file.name || note.title,
    observedAccounts: [...new Set([...getObservedAccounts(metadata, note.source_account), match.doc.userEmail])],
    transcriptParticipants: speakerNames,
  });
  const transcriptExternalId = buildMeetingArtifactExternalId(
    metadata.meetingKey || note.meeting_key,
    'meeting_transcript',
    match.doc.file.id,
  );

  const transcriptArtifact = await upsertSharedCommunicationArtifact(
    {
      sourceId: 'SRC-MEETINGS-001',
      artifactType: 'meeting_transcript',
      externalId: transcriptExternalId,
      title: match.doc.file.name || 'Meeting transcript',
      sourceAccount: match.doc.userEmail,
      sourceContainer: 'Google Drive / Team meeting transcripts',
      sourceUrl: match.doc.file.webViewLink || null,
      participants: speakerNames,
      contentText: transcriptText,
      contentHash: transcriptTextHash(transcriptText),
      artifactUpdatedAt: match.doc.file.modifiedTime || null,
      metadata: {
        meetingKey: metadata.meetingKey || note.meeting_key,
        archiveVersion: 'meeting_archive_v2',
        transcriptSource: 'standalone',
        primaryFileId: match.doc.file.id,
        primarySourceAccount: match.doc.userEmail,
        observedAccounts: [...new Set([...getObservedAccounts(metadata, note.source_account), match.doc.userEmail])],
        observedFileIds: [match.doc.file.id],
        transcriptLineCount: transcript?.transcriptLineCount || 0,
        speakerCount: speakerNames.length,
        transcriptSectionDetected: Boolean(transcript),
        meetingClass: meetingShape.meetingClass,
        privacyProfile: meetingShape.privacyProfile,
        attendeeSignalCount: meetingShape.attendeeSignalCount,
        sensitiveMeetingCandidate: meetingShape.sensitiveMeetingCandidate,
        meetingClassReason: meetingShape.classificationReason,
        repairedBy: 'verify-recent-meeting-transcript-gaps',
        repairedAt: new Date().toISOString(),
      },
    },
    'meeting-gap-repair',
  );

  await upsertSharedCommunicationArtifact(
    {
      artifactId: note.artifact_id,
      sourceId: 'SRC-MEETINGS-001',
      artifactType: 'meeting_note',
      externalId: note.external_id,
      title: note.title,
      sourceAccount: note.source_account,
      sourceContainer: note.source_container || 'Google Drive / Team meeting notes',
      sourceUrl: note.source_url || null,
      participants: speakerNames,
      contentText: note.content_text || '',
      contentHash: note.content_hash || transcriptTextHash(note.content_text || ''),
      artifactCreatedAt: note.artifact_created_at || null,
      artifactUpdatedAt: note.artifact_updated_at || null,
      metadata: {
        ...metadata,
        transcriptSource: 'standalone',
        transcriptExternalId,
        transcriptMissing: false,
        repairedBy: 'verify-recent-meeting-transcript-gaps',
        repairedAt: new Date().toISOString(),
      },
    },
    'meeting-gap-repair',
  );

  return transcriptArtifact.artifactId;
}

async function classifyNote(note, transcriptDocs, repair) {
  const metadata = note.metadata || {};
  const noteFileId = metadata.primaryFileId || getFileIdFromUrl(note.source_url);
  const observedAccounts = getObservedAccounts(metadata, note.source_account);
  let exported = null;

  if (noteFileId) {
    exported = await exportDocFromAnyAccount(noteFileId, observedAccounts);
    const transcript = extractTranscriptSection(exported.contentText || '');
    if (transcript?.transcriptText) {
      const repairedArtifactId = repair
        ? await repairFromEmbeddedTranscript(note, exported, transcript)
        : null;
      return {
        classification: exported.account === note.source_account ? 'parser_tab_miss' : 'wrong_owner_account_path',
        action: repair ? 'repaired_embedded_transcript' : 'repairable_embedded_transcript',
        repairedArtifactId,
        detail: `${transcript.transcriptLineCount} transcript lines via ${exported.account}`,
      };
    }
  }

  const standaloneMatch = findStandaloneMatch(note, transcriptDocs);
  if (standaloneMatch?.matchType === 'exact') {
    const repairedArtifactId = repair
      ? await repairFromStandaloneTranscript(note, standaloneMatch)
      : null;
    return {
      classification: 'wrong_owner_account_path',
      action: repair ? 'repaired_standalone_transcript' : 'repairable_standalone_transcript',
      repairedArtifactId,
      detail: `${standaloneMatch.doc.file.name} via ${standaloneMatch.doc.userEmail}`,
    };
  }

  if (standaloneMatch?.matchType === 'similar_date_title') {
    return {
      classification: 'meeting_key_mismatch',
      action: 'manual_review_needed',
      repairedArtifactId: null,
      detail: `${standaloneMatch.doc.file.name} via ${standaloneMatch.doc.userEmail} (${Math.round(standaloneMatch.overlap * 100)}% title overlap)`,
    };
  }

  return {
    classification: noteFileId && exported?.error ? 'export_error_retry' : 'true_missing',
    action: 'no_repair_available',
    repairedArtifactId: null,
    detail: exported?.error || 'No embedded transcript or matching standalone transcript found.',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(100, Math.max(1, Number(args.limit || 50)));
  const perUserTranscriptSearchLimit = Math.min(500, Math.max(20, Number(args.searchLimit || 150)));
  const repair = boolArg(args.repair);
  const since = parseSince(args);

  await initFoundationDb();

  console.log('Verify recent meeting transcript gaps');
  console.log(`  Since: ${formatDateTime(since)}`);
  console.log(`  Limit: ${limit}`);
  console.log(`  Repair: ${repair}`);

  const [notes, users] = await Promise.all([
    loadRecentMissingNotes(since, limit),
    resolveScanUsers(args),
  ]);
  const transcriptDocs = await loadRecentStandaloneTranscriptDocs(users, since, perUserTranscriptSearchLimit);

  console.log(`  Recent missing notes selected: ${notes.length}`);
  console.log(`  Recent standalone transcript docs scanned: ${transcriptDocs.length}`);

  const counts = {};
  let repaired = 0;
  const rows = [];

  for (const note of notes) {
    const result = await classifyNote(note, transcriptDocs, repair);
    counts[result.classification] = (counts[result.classification] || 0) + 1;
    if (result.repairedArtifactId) repaired += 1;
    rows.push({ note, result });
    console.log(
      `  ${result.classification} | ${result.action} | ${formatDateTime(note.meetingDate)} | ${note.title} | ${result.detail}`,
    );
  }

  console.log(`  Classification counts: ${JSON.stringify(counts)}`);
  console.log(`  Repaired: ${repaired}`);

  if (!repair && rows.some(row => String(row.result.action || '').startsWith('repairable'))) {
    console.log('  Run again with --repair=true to write repairable transcript artifacts.');
  }
}

main()
  .catch(error => {
    console.error('Recent meeting transcript gap verification failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([pool.end(), closeFoundationDb()]);
  });
