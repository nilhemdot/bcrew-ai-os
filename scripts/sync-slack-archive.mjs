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
  initFoundationDb,
} from '../lib/foundation-db-session.js';
import {
  getSharedCommunicationArchiveSnapshot,
  upsertSharedCommunicationArtifact,
} from '../lib/foundation-shared-comms-db.js';
import {
  upsertSourceCrawlItem,
} from '../lib/foundation-source-crawl-db.js';
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

function buildCrawlItemKey(crawlTargetKey, channelId) {
  return `${crawlTargetKey}:${channelId}`;
}

async function recordSlackChannelCrawlItem(crawlTargetKey, channel, input) {
  if (!crawlTargetKey || !channel?.id) return null;

  return upsertSourceCrawlItem(
    {
      itemKey: buildCrawlItemKey(crawlTargetKey, channel.id),
      targetKey: crawlTargetKey,
      sourceId: 'SRC-SLACK-001',
      externalId: channel.id,
      itemType: 'slack_channel',
      status: input.status,
      fingerprint: input.fingerprint || '',
      incrementAttempt: Boolean(input.incrementAttempt),
      lastError: input.lastError || null,
      artifactId: input.artifactId || null,
      processedAt: input.processedAt || null,
      metadata: {
        channelId: channel.id,
        channelName: channel.name,
        isPrivate: channel.isPrivate,
        isMember: channel.isMember,
        memberCount: channel.memberCount,
        reason: input.reason || null,
        messageCount: input.messageCount ?? null,
        archivedThreadCount: input.archivedThreadCount ?? null,
        latestMessageAt: input.latestMessageAt || null,
        latestThreadArtifactId: input.latestThreadArtifactId || null,
      },
    },
    'slack-sync',
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(500, Math.max(1, Number(args.limit || 50)));
  const requestedChannelNames = splitCsv(args.channels || process.env.SLACK_ARCHIVE_CHANNELS || '');
  const crawlTargetKey = String(args.crawlTarget || args.targetKey || '').trim();

  console.log('Sync Slack threads into shared communications archive');
  console.log(`  Limit per channel: ${limit}`);
  if (crawlTargetKey) console.log(`  Crawl target: ${crawlTargetKey}`);

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
  let itemFailures = 0;

  for (const channel of unreadableChannels.map(name => selectedChannels.find(channel => channel.name === name)).filter(Boolean)) {
    await recordSlackChannelCrawlItem(crawlTargetKey, channel, {
      status: 'skipped',
      reason: 'bot_not_in_channel',
      incrementAttempt: false,
      processedAt: new Date().toISOString(),
    });
  }

  for (const channel of readableChannels) {
    let history;
    try {
      history = await getSlackChannelHistory(channel.id, limit);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not_in_channel')) {
        unreadable += 1;
        console.log(`  #${channel.name}: skipped (bot not in channel)`);
        await recordSlackChannelCrawlItem(crawlTargetKey, channel, {
          status: 'skipped',
          reason: 'bot_not_in_channel',
          incrementAttempt: true,
          processedAt: new Date().toISOString(),
        });
        continue;
      }
      itemFailures += 1;
      console.log(`  #${channel.name}: failed (${message})`);
      await recordSlackChannelCrawlItem(crawlTargetKey, channel, {
        status: 'failed',
        reason: 'slack_channel_history_failed',
        incrementAttempt: true,
        lastError: message,
        processedAt: new Date().toISOString(),
      });
      continue;
    }
    const seenThreadTs = new Set();
    console.log(`  #${channel.name}: ${history.length} messages`);
    let channelArchived = 0;
    let latestThreadArtifactId = '';
    let latestMessageAt = '';

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
      const artifactId = `SRC-SLACK-001:${channel.id}:${threadTs}`;
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
      channelArchived += 1;
      latestThreadArtifactId = artifactId;
      latestMessageAt = messages[messages.length - 1]?.createdAt || message.createdAt || latestMessageAt;
    }

    await recordSlackChannelCrawlItem(crawlTargetKey, channel, {
      status: channelArchived ? 'succeeded' : 'skipped',
      reason: channelArchived ? null : 'no_archivable_messages',
      incrementAttempt: true,
      artifactId: latestThreadArtifactId || null,
      fingerprint: latestMessageAt || '',
      messageCount: history.length,
      archivedThreadCount: channelArchived,
      latestMessageAt,
      latestThreadArtifactId,
      processedAt: new Date().toISOString(),
    });
  }

  const snapshot = await getSharedCommunicationArchiveSnapshot({
    sourceId: 'SRC-SLACK-001',
    artifactType: 'slack_thread',
    limit: Math.min(10, limit),
  });

  console.log(`  Archived this run: ${archived}`);
  console.log(`  Skipped empty threads: ${skipped}`);
  console.log(`  Unreadable channels skipped: ${unreadable}`);
  console.log(`  Crawl items failed: ${itemFailures}`);
  console.log(`  Archive total: ${snapshot.totalArtifacts}`);
  if (snapshot.items[0]) {
    console.log(
      `  Latest thread: ${snapshot.items[0].artifactId} (${snapshot.items[0].contentLength} chars)`,
    );
  }
  console.log(`EXTRACTION_TARGET_SUMMARY ${JSON.stringify({
    inspected: readableChannels.length + unreadable,
    archived,
    skipped: skipped + unreadable,
    itemFailures,
    cursorState: {
      slackSync: {
        lastRunAt: new Date().toISOString(),
        channelsVisible: allChannels.length,
        channelsSelected: selectedChannels.length,
        channelsReadable: readableChannels.length,
        channelsUnreadable: unreadable,
        archivedThisRun: archived,
        skippedEmptyThreads: skipped,
        itemFailures,
      },
    },
    metadata: {
      extractorVersion: 'slack_archive_v1',
      crawlTargetKey: crawlTargetKey || null,
      unreadableChannels,
    },
  })}`);
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
