#!/usr/bin/env node

import process from 'node:process';
import { getGmailThread, listGmailMessages } from '../lib/google-delegated.js';
import {
  closeFoundationDb,
  getSharedCommunicationExistingArtifactsByExternalId,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  listFoundationUsers,
  upsertSourceCrawlItem,
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

function buildCrawlItemKey(crawlTargetKey, mailbox, threadId) {
  return `${crawlTargetKey}:${mailbox}:${threadId}`;
}

function buildThreadFingerprint(latestMessage) {
  if (!latestMessage) return '';
  return [
    latestMessage.timestamp || 0,
    latestMessage.messageId || '',
    latestMessage.historyId || '',
  ].join(':');
}

async function recordCrawlItem(crawlTargetKey, input) {
  if (!crawlTargetKey) return null;

  return upsertSourceCrawlItem(
    {
      itemKey: buildCrawlItemKey(crawlTargetKey, input.mailbox, input.threadId),
      targetKey: crawlTargetKey,
      sourceId: 'SRC-GMAIL-001',
      externalId: `${input.mailbox}:${input.threadId}`,
      itemType: 'email_thread',
      status: input.status,
      fingerprint: input.fingerprint || '',
      incrementAttempt: true,
      lastError: input.lastError || null,
      artifactId: input.artifactId || null,
      processedAt: input.processedAt || null,
      metadata: {
        query: input.query,
        mailbox: input.mailbox,
        gmailThreadId: input.threadId,
        latestMessageAt: input.latestMessage?.date || null,
        latestMessageId: input.latestMessage?.messageId || null,
        latestHistoryId: input.latestMessage?.historyId || null,
        existingArtifactUpdatedAt: input.existingArtifact?.artifactUpdatedAt || null,
        messageCount: input.messageCount ?? null,
        reason: input.reason || null,
      },
    },
    'gmail-sync',
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const query = args.query || DEFAULT_QUERY;
  const limit = Math.min(100, Math.max(1, Number(args.limit || 5)));
  const teamMode = args.team === true || args.team === 'true';
  const userEmail = args.user || DEFAULT_USER;
  const skipCurrent = args.skipCurrent !== 'false';
  const crawlTargetKey = String(args.crawlTarget || args.targetKey || '').trim();

  console.log('Sync Gmail threads into shared communications archive');
  console.log(`  Query: ${query}`);
  console.log(`  Per-user limit: ${limit}`);
  console.log(`  Skip current: ${skipCurrent ? 'yes' : 'no'}`);
  if (crawlTargetKey) console.log(`  Crawl target: ${crawlTargetKey}`);

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
  let refreshedThreads = 0;
  let netNewThreads = 0;
  let failedThreads = 0;
  let crawlItemsSucceeded = 0;
  let crawlItemsSkipped = 0;
  let crawlItemsFailed = 0;
  const failedThreadSamples = [];

  for (const activeUserEmail of users) {
    const messages = await listGmailMessages(activeUserEmail, {
      query,
      maxResults: Math.min(500, Math.max(limit * 10, limit)),
    });
    const latestMessageByThreadId = new Map();
    for (const message of messages) {
      if (!message.threadId) continue;
      const timestamp = timestampMs(message.date);
      const latestKnown = latestMessageByThreadId.get(message.threadId);
      if (!latestKnown || timestamp >= Number(latestKnown.timestamp || 0)) {
        latestMessageByThreadId.set(message.threadId, {
          timestamp,
          date: message.date || null,
          messageId: message.id || '',
          historyId: message.historyId || '',
        });
      }
    }
    const threadIds = [...latestMessageByThreadId.keys()].slice(0, limit);
    const externalIds = threadIds.map(threadId => `${activeUserEmail}:${threadId}`);
    const existingArtifacts = await getSharedCommunicationExistingArtifactsByExternalId({
      sourceId: 'SRC-GMAIL-001',
      artifactType: 'email_thread',
      externalIds,
    });
    const threadIdsToArchive = [];

    for (const threadId of threadIds) {
      const latestMessage = latestMessageByThreadId.get(threadId);
      const existing = existingArtifacts.get(`${activeUserEmail}:${threadId}`);
      const shouldSkip = Boolean(skipCurrent && existing && latestMessage?.timestamp && latestMessage.timestamp <= timestampMs(existing.artifactUpdatedAt));

      if (shouldSkip) {
        currentThreadsSkipped += 1;
        await recordCrawlItem(crawlTargetKey, {
          status: 'skipped',
          query,
          mailbox: activeUserEmail,
          threadId,
          latestMessage,
          existingArtifact: existing,
          fingerprint: buildThreadFingerprint(latestMessage),
          processedAt: new Date().toISOString(),
          reason: 'already_current',
        });
        if (crawlTargetKey) crawlItemsSkipped += 1;
      } else {
        threadIdsToArchive.push(threadId);
      }
    }

    scannedMessages += messages.length;
    selectedThreads += threadIds.length;

    console.log(`  ${activeUserEmail}: ${messages.length} messages -> ${threadIds.length} threads -> ${threadIdsToArchive.length} to archive`);

    for (const threadId of threadIdsToArchive) {
      const latestMessage = latestMessageByThreadId.get(threadId);
      const existing = existingArtifacts.get(`${activeUserEmail}:${threadId}`);
      try {
        const thread = await getGmailThread(activeUserEmail, threadId);
        if (!thread.length) {
          await recordCrawlItem(crawlTargetKey, {
            status: 'skipped',
            query,
            mailbox: activeUserEmail,
            threadId,
            latestMessage,
            existingArtifact: existing,
            fingerprint: buildThreadFingerprint(latestMessage),
            processedAt: new Date().toISOString(),
            reason: 'empty_thread',
          });
          if (crawlTargetKey) crawlItemsSkipped += 1;
          continue;
        }

        const contentText = formatGmailThread(thread);
        const participants = collectParticipants(thread);
        const firstMessage = thread[0];
        const lastMessage = thread[thread.length - 1];

        const artifact = await upsertSharedCommunicationArtifact(
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
              historyIds: thread.map(message => message.historyId).filter(Boolean),
            },
          },
          'system',
        );

        await recordCrawlItem(crawlTargetKey, {
          status: 'succeeded',
          query,
          mailbox: activeUserEmail,
          threadId,
          latestMessage,
          existingArtifact: existing,
          fingerprint: buildThreadFingerprint(latestMessage),
          artifactId: artifact.artifactId,
          messageCount: thread.length,
          processedAt: new Date().toISOString(),
          reason: existing ? 'refreshed' : 'net_new',
        });
        if (crawlTargetKey) crawlItemsSucceeded += 1;
        if (existing) refreshedThreads += 1;
        else netNewThreads += 1;
        archived += 1;
      } catch (error) {
        failedThreads += 1;
        const errorMessage = error instanceof Error ? error.message : String(error);
        await recordCrawlItem(crawlTargetKey, {
          status: 'failed',
          query,
          mailbox: activeUserEmail,
          threadId,
          latestMessage,
          existingArtifact: existing,
          fingerprint: buildThreadFingerprint(latestMessage),
          lastError: errorMessage,
          reason: 'archive_failed',
        });
        if (crawlTargetKey) crawlItemsFailed += 1;
        if (failedThreadSamples.length < 5) {
          failedThreadSamples.push(`${activeUserEmail}:${threadId}: ${errorMessage}`);
        }
      }
    }
  }

  console.log(`  Messages scanned: ${scannedMessages}`);
  console.log(`  Threads selected: ${selectedThreads}`);
  console.log(`  Already archived/current in selected window: ${currentThreadsSkipped}`);
  console.log(`  Threads refreshed: ${refreshedThreads}`);
  console.log(`  Threads net-new: ${netNewThreads}`);
  console.log(`  Failed threads: ${failedThreads}`);
  if (crawlTargetKey) {
    console.log(`  Crawl items succeeded: ${crawlItemsSucceeded}`);
    console.log(`  Crawl items skipped: ${crawlItemsSkipped}`);
    console.log(`  Crawl items failed: ${crawlItemsFailed}`);
  }

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
  if (failedThreadSamples.length) {
    console.log(`  Failed thread sample: ${failedThreadSamples.join(' | ')}`);
  }
  if (failedThreads > 0) {
    process.exitCode = 1;
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
