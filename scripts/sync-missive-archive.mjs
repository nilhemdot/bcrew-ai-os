#!/usr/bin/env node

import process from 'node:process';
import { getMissiveThread, listMissiveInbox } from '../lib/missive.js';
import {
  closeFoundationDb,
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(25, Math.max(1, Number(args.limit || 5)));

  console.log('Sync Missive threads into shared communications archive');
  console.log(`  Limit: ${limit}`);

  await initFoundationDb();

  const conversations = await listMissiveInbox(limit);
  console.log(`  Conversations selected: ${conversations.length}`);

  let archived = 0;

  for (const conversation of conversations) {
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
        sourceContainer: 'Missive / Inbox',
        sourceUrl: conversation.webUrl || null,
        participants: collectParticipants(thread),
        contentText,
        contentHash: transcriptTextHash(contentText),
        artifactUpdatedAt: conversation.lastActivityAt || null,
        metadata: {
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
