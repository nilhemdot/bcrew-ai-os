#!/usr/bin/env node

import process from 'node:process';
import { getGmailThread, listGmailMessages } from '../lib/google-delegated.js';
import {
  closeFoundationDb,
  getSharedCommunicationExistingArtifactsByExternalId,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  listFoundationUsers,
  upsertSharedCommunicationArtifact,
} from '../lib/foundation-db.js';
import { transcriptTextHash } from '../lib/meeting-transcripts.js';

const DEFAULT_USER = process.env.GOOGLE_IMPERSONATE_EMAIL || 'ai@bensoncrew.ca';
const DEFAULT_QUERY = process.env.GMAIL_SHARED_ARCHIVE_QUERY || 'newer_than:30d';

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function collectParticipants(messages) {
  const participants = new Set();
  for (const message of messages) {
    if (message.from) participants.add(message.from);
    for (const value of String(message.to || '').split(',')) {
      const normalized = value.trim();
      if (normalized) participants.add(normalized);
    }
  }
  return [...participants];
}

function formatGmailThread(messages) {
  return messages
    .map(message =>
      [
        `[${message.date || 'unknown'}]`,
        `From: ${message.from || 'unknown'}`,
        `To: ${message.to || ''}`,
        `Subject: ${message.subject || '(no subject)'}`,
        '',
        message.body || message.snippet || '',
      ].join('\n'),
    )
    .join('\n\n---\n\n')
    .trim();
}

function timestampMs(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const query = args.query || DEFAULT_QUERY;
  const limit = Math.min(100, Math.max(1, Number(args.limit || 5)));
  const teamMode = args.team === true || args.team === 'true';
  const userEmail = args.user || DEFAULT_USER;
  const skipCurrent = args.skipCurrent !== 'false';

  console.log('Sync Gmail threads into shared communications archive');
  console.log(`  Query: ${query}`);
  console.log(`  Per-user limit: ${limit}`);
  console.log(`  Skip current: ${skipCurrent ? 'yes' : 'no'}`);

  await initFoundationDb();

  const users = teamMode
    ? (await listFoundationUsers({ meetingSyncEnabled: true })).map(user => user.email).filter(Boolean)
    : [userEmail];

  console.log(`  Mode: ${teamMode ? 'team' : 'single-user'}`);
  console.log(`  Users: ${users.length}`);

  let archived = 0;
  let scannedMessages = 0;
  let selectedThreads = 0;
  let currentThreadsSkipped = 0;

  for (const activeUserEmail of users) {
    const messages = await listGmailMessages(activeUserEmail, {
      query,
      maxResults: Math.min(500, Math.max(limit * 10, limit)),
    });
    const latestMessageAtByThreadId = new Map();
    for (const message of messages) {
      if (!message.threadId) continue;
      const latestKnown = latestMessageAtByThreadId.get(message.threadId) || 0;
      latestMessageAtByThreadId.set(message.threadId, Math.max(latestKnown, timestampMs(message.date)));
    }
    const threadIds = [...latestMessageAtByThreadId.keys()].slice(0, limit);
    let threadIdsToArchive = threadIds;

    if (skipCurrent) {
      const externalIds = threadIds.map(threadId => `${activeUserEmail}:${threadId}`);
      const existingArtifacts = await getSharedCommunicationExistingArtifactsByExternalId({
        sourceId: 'SRC-GMAIL-001',
        artifactType: 'email_thread',
        externalIds,
      });
      threadIdsToArchive = threadIds.filter(threadId => {
        const existing = existingArtifacts.get(`${activeUserEmail}:${threadId}`);
        if (!existing) return true;
        const latestMessageAt = latestMessageAtByThreadId.get(threadId) || 0;
        if (!latestMessageAt) return true;
        return latestMessageAt > timestampMs(existing.artifactUpdatedAt);
      });
      currentThreadsSkipped += threadIds.length - threadIdsToArchive.length;
    }

    scannedMessages += messages.length;
    selectedThreads += threadIds.length;

    console.log(`  ${activeUserEmail}: ${messages.length} messages -> ${threadIds.length} threads -> ${threadIdsToArchive.length} to archive`);

    for (const threadId of threadIdsToArchive) {
      const thread = await getGmailThread(activeUserEmail, threadId);
      if (!thread.length) continue;

      const contentText = formatGmailThread(thread);
      const participants = collectParticipants(thread);
      const firstMessage = thread[0];
      const lastMessage = thread[thread.length - 1];

      await upsertSharedCommunicationArtifact(
        {
          sourceId: 'SRC-GMAIL-001',
          artifactType: 'email_thread',
          externalId: `${activeUserEmail}:${threadId}`,
          title: firstMessage?.subject || '(no subject)',
          sourceAccount: activeUserEmail,
          sourceContainer: `Gmail / ${query}`,
          sourceUrl: null,
          participants,
          contentText,
          contentHash: transcriptTextHash(contentText),
          artifactCreatedAt: firstMessage?.date || null,
          artifactUpdatedAt: lastMessage?.date || null,
          metadata: {
            query,
            mailbox: activeUserEmail,
            gmailThreadId: threadId,
            messageCount: thread.length,
            messageIds: thread.map(message => message.id),
          },
        },
        'system',
      );

      archived += 1;
    }
  }

  console.log(`  Messages scanned: ${scannedMessages}`);
  console.log(`  Threads selected: ${selectedThreads}`);
  console.log(`  Already archived/current in selected window: ${currentThreadsSkipped}`);

  const snapshot = await getSharedCommunicationArchiveSnapshot({
    sourceId: 'SRC-GMAIL-001',
    artifactType: 'email_thread',
    limit,
  });

  console.log(`  Archived this run: ${archived}`);
  console.log(`  Archive total: ${snapshot.totalArtifacts}`);
  if (snapshot.items[0]) {
    console.log(
      `  Latest thread: ${snapshot.items[0].artifactId} (${snapshot.items[0].contentLength} chars)`,
    );
  }
}

main()
  .catch(error => {
    console.error('Gmail archive sync failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
