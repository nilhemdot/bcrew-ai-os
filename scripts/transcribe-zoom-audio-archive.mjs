#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { closeFoundationDb, initFoundationDb, upsertSharedCommunicationArtifact } from '../lib/foundation-db.js';
import { classifyMeetingShape } from '../lib/meeting-classification.js';
import { buildMeetingArtifactExternalId, transcriptTextHash } from '../lib/meeting-transcripts.js';
import {
  GOOGLE_SCOPES,
  driveListFolder,
  driveSearch,
  getDriveFileMetadata,
  googleBufferFetch,
} from '../lib/google-delegated.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_SOURCE_ID = 'SRC-MEETINGS-001';
const DEFAULT_SOURCE_USER = process.env.GOOGLE_MEETING_SOURCE_USER || 'steve.zahnd@bensoncrew.ca';
const DEFAULT_ROOT_FOLDER_ID = '1hVEFoc4KHqTY9i67RP8sMOy9kgwfemdP';
const DEFAULT_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-transcribe';
const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_UPLOAD_BYTES = 24 * 1024 * 1024;
const MAX_TRANSCRIPTION_SECONDS = 1200;
const AUDIO_BITRATES = [24000, 16000, 12000];

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

function isZoomAudioFile(file) {
  const name = String(file?.name || '').trim();
  const mimeType = String(file?.mimeType || '').trim();
  return mimeType.startsWith('audio/') || /\.(m4a|mp3|wav|aac|ogg)$/i.test(name);
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

function safeFilePart(value) {
  return String(value || 'file')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} exited ${code}: ${stderr || stdout}`.slice(0, 1000)));
    });
  });
}

async function fileSize(filePath) {
  const stat = await fs.stat(filePath);
  return stat.size;
}

async function getAudioDurationSeconds(filePath) {
  const { stdout } = await runCommand('afinfo', [filePath]);
  const match = stdout.match(/estimated duration:\s*([0-9.]+)\s*sec/i);
  return match ? Number(match[1]) : 0;
}

async function compressAudioForUpload(sourcePath, workDir, baseName) {
  let currentPath = sourcePath;
  let currentSize = await fileSize(currentPath);
  const attempts = [];

  if (currentSize <= MAX_UPLOAD_BYTES) {
    return { filePath: currentPath, sizeBytes: currentSize, compressed: false, attempts };
  }

  for (const bitrate of AUDIO_BITRATES) {
    const outputPath = path.join(workDir, `${baseName}.${bitrate}.m4a`);
    attempts.push({ bitrate });
    await runCommand('afconvert', [
      currentPath,
      outputPath,
      '-f',
      'm4af',
      '-d',
      'aac',
      '-b',
      String(bitrate),
      '-c',
      '1',
    ]);
    const outputSize = await fileSize(outputPath);
    attempts[attempts.length - 1].sizeBytes = outputSize;
    if (outputSize <= MAX_UPLOAD_BYTES) {
      return { filePath: outputPath, sizeBytes: outputSize, compressed: true, attempts };
    }
    currentSize = outputSize;
  }

  throw new Error(
    `Compressed audio still exceeds ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit. ` +
      `Attempts: ${attempts.map(attempt => `${attempt.bitrate}:${Math.round((attempt.sizeBytes || 0) / 1024 / 1024)}MB`).join(', ')}`,
  );
}

async function trimAudioChunk(sourcePath, outputPath, startSeconds, durationSeconds) {
  await runCommand('avconvert', [
    '--source',
    sourcePath,
    '--preset',
    'PresetAppleM4A',
    '--output',
    outputPath,
    '--start',
    String(startSeconds),
    '--duration',
    String(durationSeconds),
    '--replace',
    '--disableMetadataFilter',
  ]);
}

async function prepareAudioUploadParts(sourcePath, workDir, baseName) {
  const durationSeconds = await getAudioDurationSeconds(sourcePath);
  if (!durationSeconds || durationSeconds <= MAX_TRANSCRIPTION_SECONDS) {
    const upload = await compressAudioForUpload(sourcePath, workDir, baseName);
    return {
      durationSeconds,
      parts: [
        {
          index: 1,
          startSeconds: 0,
          durationSeconds,
          ...upload,
        },
      ],
    };
  }

  const parts = [];
  const partCount = Math.ceil(durationSeconds / MAX_TRANSCRIPTION_SECONDS);
  for (let index = 0; index < partCount; index += 1) {
    const startSeconds = index * MAX_TRANSCRIPTION_SECONDS;
    const remainingSeconds = Math.max(0, durationSeconds - startSeconds);
    const chunkDuration = Math.min(MAX_TRANSCRIPTION_SECONDS, remainingSeconds);
    const chunkBaseName = `${baseName}.part-${String(index + 1).padStart(2, '0')}`;
    const chunkPath = path.join(workDir, `${chunkBaseName}.m4a`);
    await trimAudioChunk(sourcePath, chunkPath, startSeconds, chunkDuration);
    const upload = await compressAudioForUpload(chunkPath, workDir, chunkBaseName);
    parts.push({
      index: index + 1,
      startSeconds,
      durationSeconds: chunkDuration,
      ...upload,
    });
  }

  return { durationSeconds, parts };
}

async function transcribeAudio(filePath, { fileName, model, prompt }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for Zoom audio transcription.');
  }

  const audioBuffer = await fs.readFile(filePath);
  const form = new FormData();
  form.append('model', model);
  form.append('response_format', 'text');
  if (prompt) form.append('prompt', prompt);
  form.append('file', new Blob([audioBuffer], { type: 'audio/mp4' }), fileName);

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI transcription ${response.status}: ${text.slice(0, 500)}`);
  }

  return text.trim();
}

async function listZoomAudioFiles(userEmail, rootFolderId, { startDate, endDate, limit }) {
  const topLevelItems = await driveListFolder(userEmail, rootFolderId, 1000, { orderBy: 'name' });
  const targetFolders = topLevelItems
    .filter(isMeetingFolder)
    .filter(folder => isWithinDateRange(folder.name, startDate, endDate))
    .slice(0, limit);

  const audioFiles = [];
  for (const folder of targetFolders) {
    const files = await driveSearch(
      userEmail,
      `'${folder.id}' in parents and trashed = false`,
      'files(id,name,mimeType,size,modifiedTime,parents,webViewLink),nextPageToken',
      100,
      { orderBy: 'folder,name' },
    );
    for (const file of files.filter(isZoomAudioFile)) {
      audioFiles.push({ folder, file });
    }
  }

  return audioFiles;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUser = String(args.user || args.sourceUser || DEFAULT_SOURCE_USER).trim();
  const rootFolderId = String(args.folderId || args.rootFolderId || DEFAULT_ROOT_FOLDER_ID).trim();
  const limit = Math.min(1000, Math.max(1, Number(args.limit || 250)));
  const startDate = normalizeDateOnly(args.start || args.startDate || '2024-10-01');
  const endDate = normalizeDateOnly(args.end || args.endDate || '2025-03-31');
  const model = String(args.model || DEFAULT_MODEL).trim();
  const dryRun = String(args.dryRun || '').trim() === 'true';
  const workDir = path.join(REPO_ROOT, 'state', 'zoom-audio-transcripts');

  if (!sourceUser) throw new Error('A delegated Google source user is required.');
  if (!rootFolderId) throw new Error('A Drive folder id is required.');

  await fs.mkdir(workDir, { recursive: true });
  await initFoundationDb();

  const rootFolder = await getDriveFileMetadata(sourceUser, rootFolderId);
  const audioFiles = await listZoomAudioFiles(sourceUser, rootFolderId, { startDate, endDate, limit });

  console.log('Transcribe Zoom audio artifacts into shared communications archive');
  console.log(`  Root folder: ${rootFolder?.name || rootFolderId}`);
  console.log(`  Source user: ${sourceUser}`);
  console.log(`  Date range: ${startDate || 'open'} -> ${endDate || 'open'}`);
  console.log(`  Audio files selected: ${audioFiles.length}`);
  console.log(`  Model: ${model}`);
  if (dryRun) console.log('  Mode: dry-run');

  let transcribed = 0;
  let failed = 0;

  for (const { folder, file } of audioFiles) {
    const baseName = safeFilePart(`${folder.name}-${file.id}`);
    const sourcePath = path.join(workDir, `${baseName}-${safeFilePart(file.name)}`);
    const audioSizeBytes = Number(file.size || 0);
    const sizeLabel = audioSizeBytes ? `${(audioSizeBytes / 1024 / 1024).toFixed(2)} MB` : 'unknown size';

    try {
      console.log(`  ${folder.name} -> ${file.name} (${sizeLabel})`);
      if (dryRun) continue;

      const audioBuffer = await googleBufferFetch(sourceUser, buildDriveMediaUrl(file.id), {
        scopes: [GOOGLE_SCOPES.drive],
        accept: file.mimeType || 'application/octet-stream',
      });
      await fs.writeFile(sourcePath, audioBuffer);

      const prepared = await prepareAudioUploadParts(sourcePath, workDir, baseName);
      console.log(
        `    duration ${(prepared.durationSeconds / 60).toFixed(1)} min, ` +
          `${prepared.parts.length} transcription part${prepared.parts.length === 1 ? '' : 's'}`,
      );

      const transcriptParts = [];
      for (const part of prepared.parts) {
        if (part.compressed) {
          console.log(
            `    part ${part.index}: compressed to ${(part.sizeBytes / 1024 / 1024).toFixed(2)} MB`,
          );
        }

        const partText = await transcribeAudio(part.filePath, {
          fileName: path.basename(part.filePath),
          model,
          prompt:
            'This is a historical Zoom meeting for Benson Crew / Zahnd Team real estate operations. ' +
            'Names may include Steve, Tanner, Nick, Blake, Scott, Ryan, Carson, Clare, Georgia, Ahsan, John, and agents.',
        });

        transcriptParts.push(
          [`[Part ${part.index} | starts at ${Math.round(part.startSeconds)}s]`, partText].join('\n'),
        );
      }

      const transcriptText = transcriptParts.join('\n\n').trim();

      if (!transcriptText) {
        throw new Error('OpenAI returned an empty transcript.');
      }

      const meetingShape = classifyMeetingShape({
        title: folder.name,
        observedAccounts: [sourceUser],
        transcriptParticipants: [],
      });
      const externalId = `${buildMeetingArtifactExternalId(folder.name, 'meeting_transcript', file.id)}:zoom-audio:${file.id}`;
      const metadata = {
        archiveVersion: 'zoom_audio_transcription_v1',
        meetingPlatform: 'zoom',
        zoomArtifactKind: 'audio_transcript',
        importedFromHistoricalZoom: true,
        transcriptionModel: model,
        rootFolderId,
        rootFolderName: rootFolder?.name || null,
        meetingFolderId: folder.id,
        meetingFolderName: folder.name,
        fileId: file.id,
        fileName: file.name,
        fileMimeType: file.mimeType || null,
        originalSizeBytes: audioSizeBytes || null,
        durationSeconds: prepared.durationSeconds || null,
        transcriptionPartCount: prepared.parts.length,
        uploadParts: prepared.parts.map(part => ({
          index: part.index,
          startSeconds: part.startSeconds,
          durationSeconds: part.durationSeconds,
          sizeBytes: part.sizeBytes,
          compressed: part.compressed,
          compressionAttempts: part.attempts,
        })),
        meetingFolderStamp: parseMeetingFolderStamp(folder.name)?.stamp || null,
        meetingFolderDate: parseMeetingFolderStamp(folder.name)?.dateOnly || null,
        meetingClass: meetingShape.meetingClass,
        privacyProfile: meetingShape.privacyProfile,
        attendeeSignalCount: meetingShape.attendeeSignalCount,
        sensitiveMeetingCandidate: meetingShape.sensitiveMeetingCandidate,
        meetingClassReason: meetingShape.classificationReason,
      };

      await upsertSharedCommunicationArtifact(
        {
          sourceId: DEFAULT_SOURCE_ID,
          artifactType: 'meeting_transcript',
          externalId,
          title: `${folder.name} - Zoom Audio Transcript`,
          sourceAccount: sourceUser,
          sourceContainer: 'Google Drive / Historical Zoom audio transcription',
          sourceUrl: file.webViewLink || folder.webViewLink || null,
          participants: [],
          contentText: transcriptText,
          contentHash: transcriptTextHash(transcriptText),
          artifactCreatedAt: parseMeetingFolderStamp(folder.name)?.stamp || null,
          artifactUpdatedAt: file.modifiedTime || null,
          metadata,
        },
        'system',
      );

      transcribed += 1;
      console.log(`    archived transcript (${transcriptText.length} chars)`);
    } catch (error) {
      failed += 1;
      console.error(`    failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`  Transcribed and archived: ${transcribed}`);
  console.log(`  Failed: ${failed}`);
  if (failed) process.exitCode = 1;
}

main()
  .catch(error => {
    console.error('Zoom audio transcription failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
