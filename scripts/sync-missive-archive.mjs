#!/usr/bin/env node

import process from 'node:process';
import { getMissiveThread, listMissiveInbox } from '../lib/missive.js';
import {
  closeFoundationDb,
  getSharedCommunicationExistingArtifactsByExternalId,
  getSharedCommunicationArchiveSnapshot,
  initFoundationDb,
  upsertSharedCommunicationArtifact,
} from '../lib/foundation-db.js';
import { transcriptTextHash } from '../lib/meeting-transcripts.js';

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(500, Math.max(1, Number(args.limit || 25)));
  const pageSize = Math.min(50, Math.max(1, Number(args.pageSize || Math.min(limit, 50))));
  const all = args.all === true || args.all === 'true';
  const search = String(args.search || '').trim();
  const skipExisting = args.skipExisting !== 'false';
  const inboxOnly = !all && !search;
  const sourceLabel = search ? `Missive / Search / ${search}` : all ? 'Missive / All conversations' : 'Missive / Inbox';

  console.log('Sync Missive threads into shared communications archive');
  console.log(`  Limit: ${limit}`);
  console.log(`  Page size: ${pageSize}`);
  console.log(`  Mode: ${search ? 'search' : all ? 'all' : 'inbox'}`);
  console.log(`  Skip existing: ${skipExisting ? 'yes' : 'no'}`);
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
  if (skipExisting) {
    const existingArtifacts = await getSharedCommunicationExistingArtifactsByExternalId({
      sourceId: 'SRC-MISSIVE-001',
      artifactType: 'missive_thread',
      externalIds: conversations.map(conversation => conversation.id),
    });
    conversationsToArchive = conversations.filter(conversation => {
      const existing = existingArtifacts.get(conversation.id);
      if (!existing) return true;
      return timestampMs(conversation.lastActivityAt) > timestampMs(existing.artifactUpdatedAt);
    });
    console.log(`  Already archived/current in selected window: ${conversations.length - conversationsToArchive.length}`);
  }
  console.log(`  Conversations to archive: ${conversationsToArchive.length}`);

  let archived = 0;

  for (const conversation of conversationsToArchive) {
    const thread = await getMissiveThread(conversation.id);
    const contentText = formatMissiveThread(thread);
    if (!contentText) continue;

    await upsertSharedCommunicationArtifact(
      {
        sourceId: 'SRC-MISSIVE-001',
        artifactType: 'missive_thread',
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

    archived += 1;
  }

  const snapshot = await getSharedCommunicationArchiveSnapshot({
    sourceId: 'SRC-MISSIVE-001',
    artifactType: 'missive_thread',
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
    console.error('Missive archive sync failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
