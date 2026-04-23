#!/usr/bin/env node

import process from 'node:process';
import {
  getSlackChannelHistory,
  getSlackPermalink,
  getSlackThreadReplies,
  listSlackChannels,
} from '../lib/slack.js';
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

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map(entry => entry.trim().toLowerCase())
    .filter(Boolean);
}

function shorten(text, maxLength) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatSlackThread(channel, messages) {
  return messages
    .map(message =>
      [
        `[${message.createdAt || 'unknown'}] #${channel.name}`,
        `User: ${message.userName || 'Unknown'}${message.userEmail ? ` <${message.userEmail}>` : ''}`,
        '',
        message.text || '',
      ].join('\n'),
    )
    .join('\n\n---\n\n')
    .trim();
}

function collectParticipants(messages) {
  const participants = new Set();
  for (const message of messages) {
    if (message.userEmail) {
      participants.add(message.userEmail);
      continue;
    }
    if (message.userName) participants.add(message.userName);
  }
  return [...participants];
}

function buildThreadTitle(channel, rootMessage) {
  const rootText = shorten(rootMessage?.text || '', 120);
  return rootText ? `#${channel.name}: ${rootText}` : `#${channel.name} thread`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(50, Math.max(1, Number(args.limit || 20)));
  const requestedChannelNames = splitCsv(args.channels || process.env.SLACK_ARCHIVE_CHANNELS || '');

  console.log('Sync Slack threads into shared communications archive');
  console.log(`  Limit per channel: ${limit}`);

  await initFoundationDb();

  const allChannels = await listSlackChannels();
  const selectedChannels = requestedChannelNames.length
    ? allChannels.filter(channel => requestedChannelNames.includes(channel.name.toLowerCase()))
    : allChannels;
  const readableChannels = selectedChannels.filter(channel => channel.isMember);
  const unreadableChannels = selectedChannels.filter(channel => !channel.isMember).map(channel => channel.name);

  console.log(`  Channels visible to bot: ${allChannels.length}`);
  console.log(`  Channels selected for archive: ${selectedChannels.length}`);
  console.log(`  Channels readable by bot: ${readableChannels.length}`);
  if (unreadableChannels.length) {
    console.log(`  Channels skipped (bot not a member): ${unreadableChannels.join(', ')}`);
  }

  let archived = 0;
  let skipped = 0;
  let unreadable = unreadableChannels.length;

  for (const channel of readableChannels) {
    let history;
    try {
      history = await getSlackChannelHistory(channel.id, limit);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not_in_channel')) {
        unreadable += 1;
        console.log(`  #${channel.name}: skipped (bot not in channel)`);
        continue;
      }
      throw error;
    }
    const seenThreadTs = new Set();
    console.log(`  #${channel.name}: ${history.length} messages`);

    for (const message of history) {
      const threadTs = message.threadTs || message.ts;
      if (!threadTs || seenThreadTs.has(threadTs)) continue;
      seenThreadTs.add(threadTs);

      const messages =
        message.replyCount > 0
          ? await getSlackThreadReplies(channel.id, threadTs, Math.max(limit, message.replyCount + 1))
          : [message];

      const contentText = formatSlackThread(channel, messages);
      if (!contentText) {
        skipped += 1;
        continue;
      }

      const permalink = await getSlackPermalink(channel.id, threadTs);
      await upsertSharedCommunicationArtifact(
        {
          sourceId: 'SRC-SLACK-001',
          artifactType: 'slack_thread',
          externalId: `${channel.id}:${threadTs}`,
          title: buildThreadTitle(channel, messages[0]),
          sourceAccount: null,
          sourceContainer: `Slack / #${channel.name}`,
          sourceUrl: permalink || null,
          participants: collectParticipants(messages),
          contentText,
          contentHash: transcriptTextHash(contentText),
          artifactUpdatedAt: messages[messages.length - 1]?.createdAt || message.createdAt || null,
          metadata: {
            archiveVersion: 'slack_archive_v1',
            channelId: channel.id,
            channelName: channel.name,
            isPrivate: channel.isPrivate,
            memberCount: channel.memberCount,
            threadTs,
            messageCount: messages.length,
            requiredInvite: false,
          },
        },
        'system',
      );

      archived += 1;
    }
  }

  const snapshot = await getSharedCommunicationArchiveSnapshot({
    sourceId: 'SRC-SLACK-001',
    artifactType: 'slack_thread',
    limit: Math.min(10, limit),
  });

  console.log(`  Archived this run: ${archived}`);
  console.log(`  Skipped empty threads: ${skipped}`);
  console.log(`  Unreadable channels skipped: ${unreadable}`);
  console.log(`  Archive total: ${snapshot.totalArtifacts}`);
  if (snapshot.items[0]) {
    console.log(
      `  Latest thread: ${snapshot.items[0].artifactId} (${snapshot.items[0].contentLength} chars)`,
    );
  }
}

main()
  .catch(error => {
    console.error('Slack archive sync failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
