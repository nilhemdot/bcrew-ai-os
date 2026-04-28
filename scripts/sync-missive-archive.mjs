#!/usr/bin/env node

import process from 'node:process';
import { getMissiveThread, listMissiveInbox } from '../lib/missive.js';
import {
  closeFoundationDb,
  getSharedCommunicationExistingArtifactsByExternalId,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  upsertSourceCrawlItem,
  upsertSharedCommunicationArtifact,
} from '../lib/foundation-db.js';
import { transcriptTextHash } from '../lib/meeting-transcripts.js';

const MISSIVE_SOURCE_ID = 'SRC-MISSIVE-001';
const MISSIVE_ARTIFACT_TYPE = 'missive_thread';

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function collectParticipants(thread) {
  const participants = new Set(thread.conversation?.authors || []);
  for (const item of thread.items || []) {
    if (item.type === 'message') {
      if (item.from) participants.add(item.from);
      for (const value of item.to || []) {
        if (value) participants.add(value);
      }
      for (const value of item.cc || []) {
        if (value) participants.add(value);
      }
      continue;
    }
    if (item.type === 'comment' && item.author) {
      participants.add(item.author);
    }
  }
  return [...participants];
}

function formatMissiveThread(thread) {
  return (thread.items || [])
    .map(item => {
      if (item.type === 'message') {
        return [
          `[${item.createdAt || 'unknown'}] Message`,
          `From: ${item.from || 'unknown'}`,
          `To: ${(item.to || []).join(', ')}`,
          `CC: ${(item.cc || []).join(', ')}`,
          `Subject: ${item.subject || '(no subject)'}`,
          '',
          item.body || '',
        ].join('\n');
      }

      return [
        `[${item.createdAt || 'unknown'}] Comment`,
        `Author: ${item.author || 'unknown'}`,
        `Mentions: ${(item.mentions || []).join(', ')}`,
        '',
        item.body || '',
      ].join('\n');
    })
    .join('\n\n---\n\n')
    .trim();
}

function timestampMs(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function buildCrawlItemKey(crawlTargetKey, conversationId) {
  return `${crawlTargetKey}:${conversationId}`;
}

function buildConversationFingerprint(conversation) {
  return [
    conversation.lastActivityAt || '',
    conversation.lastActivityAtUnix || '',
    conversation.messageCount || 0,
  ].join(':');
}

async function recordCrawlItem(crawlTargetKey, conversation, input = {}) {
  if (!crawlTargetKey) return null;

  return upsertSourceCrawlItem(
    {
      itemKey: buildCrawlItemKey(crawlTargetKey, conversation.id),
      targetKey: crawlTargetKey,
      sourceId: MISSIVE_SOURCE_ID,
      externalId: conversation.id,
      itemType: 'missive_conversation',
      status: input.status,
      fingerprint: input.fingerprint || buildConversationFingerprint(conversation),
      incrementAttempt: true,
      lastError: input.lastError || null,
      artifactId: input.artifactId || null,
      processedAt: input.processedAt || null,
      metadata: {
        sourceLabel: input.sourceLabel || null,
        conversationId: conversation.id,
        subject: conversation.subject || null,
        all: input.all,
        search: input.search || '',
        lastActivityAt: conversation.lastActivityAt || null,
        lastActivityAtUnix: conversation.lastActivityAtUnix || null,
        webUrl: conversation.webUrl || null,
        existingArtifactUpdatedAt: input.existingArtifact?.artifactUpdatedAt || null,
        messageCount: input.messageCount ?? conversation.messageCount ?? null,
        commentCount: input.commentCount ?? null,
        itemCount: input.itemCount ?? null,
        reason: input.reason || null,
      },
    },
    'missive-sync',
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(500, Math.max(1, Number(args.limit || 25)));
  const pageSize = Math.min(50, Math.max(1, Number(args.pageSize || Math.min(limit, 50))));
  const all = args.all === true || args.all === 'true';
  const search = String(args.search || '').trim();
  const skipExisting = args.skipExisting !== 'false';
  const inboxOnly = !all && !search;
  const sourceLabel = search ? `Missive / Search / ${search}` : all ? 'Missive / All conversations' : 'Missive / Inbox';
  const crawlTargetKey = String(args.crawlTarget || args.targetKey || '').trim();

  console.log('Sync Missive threads into shared communications archive');
  console.log(`  Limit: ${limit}`);
  console.log(`  Page size: ${pageSize}`);
  console.log(`  Mode: ${search ? 'search' : all ? 'all' : 'inbox'}`);
  console.log(`  Skip existing: ${skipExisting ? 'yes' : 'no'}`);
  if (crawlTargetKey) console.log(`  Crawl target: ${crawlTargetKey}`);
  if (search) {
    console.log(`  Search: ${search}`);
  }

  await initFoundationDb();

  const seenConversationIds = new Set();
  const conversations = [];
  let until = args.until ? Math.max(0, Number(args.until) || 0) : null;
  let pageCount = 0;

  while (conversations.length < limit) {
    const remaining = limit - conversations.length;
    const batch = await listMissiveInbox(Math.min(pageSize, remaining), {
      inbox: inboxOnly,
      all,
      search,
      until,
    });

    pageCount += 1;
    if (!batch.length) {
      break;
    }

    for (const conversation of batch) {
      if (seenConversationIds.has(conversation.id)) continue;
      seenConversationIds.add(conversation.id);
      conversations.push(conversation);
      if (conversations.length >= limit) break;
    }

    const oldestActivity = batch.reduce((oldest, conversation) => {
      const value = Number(conversation.lastActivityAtUnix || 0) || 0;
      if (!value) return oldest;
      if (!oldest) return value;
      return Math.min(oldest, value);
    }, 0);

    if (!oldestActivity || batch.length < Math.min(pageSize, remaining)) {
      break;
    }

    const nextUntil = Math.max(0, oldestActivity - 1);
    if (until !== null && nextUntil >= until) {
      break;
    }
    until = nextUntil;
  }

  console.log(`  Pages scanned: ${pageCount}`);
  console.log(`  Conversations selected: ${conversations.length}`);

  let conversationsToArchive = conversations;
  let currentConversationsSkipped = 0;
  let emptyConversationsSkipped = 0;
  let failedConversations = 0;
  let refreshedConversations = 0;
  let netNewConversations = 0;
  let crawlItemsSucceeded = 0;
  let crawlItemsSkipped = 0;
  let crawlItemsFailed = 0;
  const failedConversationSamples = [];
  let existingArtifacts = new Map();

  if (skipExisting || crawlTargetKey) {
    existingArtifacts = await getSharedCommunicationExistingArtifactsByExternalId({
      sourceId: MISSIVE_SOURCE_ID,
      artifactType: MISSIVE_ARTIFACT_TYPE,
      externalIds: conversations.map(conversation => conversation.id),
    });
  }

  if (skipExisting) {
    conversationsToArchive = [];
    for (const conversation of conversations) {
      const existing = existingArtifacts.get(conversation.id);
      if (!existing || timestampMs(conversation.lastActivityAt) > timestampMs(existing.artifactUpdatedAt)) {
        conversationsToArchive.push(conversation);
        continue;
      }

      currentConversationsSkipped += 1;
      await recordCrawlItem(crawlTargetKey, conversation, {
        status: 'skipped',
        sourceLabel,
        all,
        search,
        existingArtifact: existing,
        artifactId: existing.artifactId,
        processedAt: new Date().toISOString(),
        reason: 'already_current',
      });
      if (crawlTargetKey) crawlItemsSkipped += 1;
    }
    console.log(`  Already archived/current in selected window: ${currentConversationsSkipped}`);
  }
  console.log(`  Conversations to archive: ${conversationsToArchive.length}`);

  let archived = 0;

  for (const conversation of conversationsToArchive) {
    const existing = existingArtifacts.get(conversation.id);
    try {
      const thread = await getMissiveThread(conversation.id);
      const contentText = formatMissiveThread(thread);
      if (!contentText) {
        emptyConversationsSkipped += 1;
        await recordCrawlItem(crawlTargetKey, conversation, {
          status: 'skipped',
          sourceLabel,
          all,
          search,
          existingArtifact: existing,
          artifactId: existing?.artifactId || null,
          messageCount: thread.messages?.length || 0,
          commentCount: thread.comments?.length || 0,
          itemCount: thread.items?.length || 0,
          processedAt: new Date().toISOString(),
          reason: 'empty_thread_content',
        });
        if (crawlTargetKey) crawlItemsSkipped += 1;
        continue;
      }

      const artifact = await upsertSharedCommunicationArtifact(
        {
          sourceId: MISSIVE_SOURCE_ID,
          artifactType: MISSIVE_ARTIFACT_TYPE,
          externalId: conversation.id,
          title: conversation.subject || '(no subject)',
          sourceAccount: null,
          sourceContainer: sourceLabel,
          sourceUrl: conversation.webUrl || null,
          participants: collectParticipants(thread),
          contentText,
          contentHash: transcriptTextHash(contentText),
          artifactUpdatedAt: conversation.lastActivityAt || null,
          metadata: {
            all,
            search,
            messageCount: thread.messages?.length || 0,
            commentCount: thread.comments?.length || 0,
            itemCount: thread.items?.length || 0,
          },
        },
        'system',
      );

      await recordCrawlItem(crawlTargetKey, conversation, {
        status: 'succeeded',
        sourceLabel,
        all,
        search,
        existingArtifact: existing,
        artifactId: artifact.artifactId,
        messageCount: thread.messages?.length || 0,
        commentCount: thread.comments?.length || 0,
        itemCount: thread.items?.length || 0,
        processedAt: new Date().toISOString(),
        reason: existing ? 'refreshed' : 'net_new',
      });
      if (crawlTargetKey) crawlItemsSucceeded += 1;
      if (existing) refreshedConversations += 1;
      else netNewConversations += 1;

      archived += 1;
    } catch (error) {
      failedConversations += 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await recordCrawlItem(crawlTargetKey, conversation, {
        status: 'failed',
        sourceLabel,
        all,
        search,
        existingArtifact: existing,
        lastError: errorMessage,
        reason: 'archive_failed',
      });
      if (crawlTargetKey) crawlItemsFailed += 1;
      if (failedConversationSamples.length < 5) {
        failedConversationSamples.push(`${conversation.id}: ${errorMessage}`);
      }
    }
  }

  const snapshot = await getSharedCommunicationArchiveSnapshot({
    sourceId: MISSIVE_SOURCE_ID,
    artifactType: MISSIVE_ARTIFACT_TYPE,
    limit,
  });

  console.log(`  Conversations refreshed: ${refreshedConversations}`);
  console.log(`  Conversations net-new: ${netNewConversations}`);
  console.log(`  Empty conversations skipped: ${emptyConversationsSkipped}`);
  console.log(`  Failed conversations: ${failedConversations}`);
  if (crawlTargetKey) {
    console.log(`  Crawl items succeeded: ${crawlItemsSucceeded}`);
    console.log(`  Crawl items skipped: ${crawlItemsSkipped}`);
    console.log(`  Crawl items failed: ${crawlItemsFailed}`);
  }
  console.log(`  Archived this run: ${archived}`);
  console.log(`  Archive total: ${snapshot.totalArtifacts}`);
  if (snapshot.items[0]) {
    console.log(
      `  Latest thread: ${snapshot.items[0].artifactId} (${snapshot.items[0].contentLength} chars)`,
    );
  }
  if (failedConversationSamples.length) {
    console.log(`  Failed conversation sample: ${failedConversationSamples.join(' | ')}`);
  }
  if (crawlTargetKey) {
    console.log(`EXTRACTION_TARGET_SUMMARY ${JSON.stringify({
      inspected: conversations.length,
      archived: netNewConversations,
      written: archived,
      refreshed: refreshedConversations,
      skipped: currentConversationsSkipped + emptyConversationsSkipped,
      itemFailures: crawlItemsFailed,
      cursorState: {
        missiveSync: {
          lastRunAt: new Date().toISOString(),
          conversationsSelected: conversations.length,
          archivedThisRun: archived,
          refreshedConversations,
          netNewConversations,
          currentConversationsSkipped,
          emptyConversationsSkipped,
          itemFailures: crawlItemsFailed,
        },
      },
      metadata: {
        crawlTargetKey,
        sourceLabel,
        mode: search ? 'search' : all ? 'all' : 'inbox',
        skipExisting,
        failedConversationSamples,
      },
    })}`);
  }
  if (failedConversations > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch(error => {
    console.error('Missive archive sync failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
