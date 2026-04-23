#!/usr/bin/env node

import process from 'node:process';
import {
  getSlackChannelHistory,
  getSlackHealth,
  listSlackChannels,
} from '../lib/slack.js';

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

function findMatchingChannels(channels, requiredName) {
  const normalizedRequired = String(requiredName || '').trim().toLowerCase();
  if (!normalizedRequired) return [];

  return channels.filter(channel => {
    const channelName = String(channel.name || '').trim().toLowerCase();
    return channelName === normalizedRequired || channelName.includes(normalizedRequired);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const requiredChannels = splitCsv(args.channels || args.required || process.env.SLACK_REQUIRED_CHANNELS || 'accountability');
  const sampleLimit = Math.max(1, Number(args.limit || 5));

  console.log('Slack shared-communications check');

  const health = await getSlackHealth();
  console.log(`  Slack auth: OK -> ${JSON.stringify(health)}`);

  const channels = await listSlackChannels();
  console.log(`  Channels visible to bot: ${channels.length}`);
  console.log(`  Channels bot is a member of: ${channels.filter(channel => channel.isMember).length}`);
  if (!channels.length) {
    console.log('Slack auth works, but no channels are visible to the bot.');
    return;
  }

  const matchedRequiredChannels = requiredChannels.map(name => ({
    name,
    matches: findMatchingChannels(channels, name),
  }));
  const missingRequiredChannels = matchedRequiredChannels
    .filter(entry => !entry.matches.length)
    .map(entry => entry.name);
  console.log(
    `  Channel sample: ${channels
      .slice(0, 10)
      .map(channel => `#${channel.name}${channel.isPrivate ? ' (private)' : ''}`)
      .join(', ')}`,
  );
  if (requiredChannels.length) {
    console.log(
      `  Required channels present: ${
        matchedRequiredChannels
          .filter(entry => entry.matches.length)
          .map(entry => `${entry.name} -> ${entry.matches.map(match => `#${match.name}`).join(', ')}`)
          .join(' | ') || '(none)'
      }`,
    );
    if (missingRequiredChannels.length) {
      console.log(`  Missing required channels: ${missingRequiredChannels.join(', ')}`);
    }
  }

  const sampleChannel = channels[0];
  const history = await getSlackChannelHistory(sampleChannel.id, sampleLimit);
  console.log(`  Channel read: OK -> #${sampleChannel.name} / ${history.length} messages`);
  if (history[0]) {
    console.log(
      `  Message sample: ${JSON.stringify({
        channel: sampleChannel.name,
        userName: history[0].userName,
        createdAt: history[0].createdAt,
        text: history[0].text.slice(0, 120),
      })}`,
    );
  }

  console.log('Slack shared-communications reads are ready for source verification.');
}

main().catch(error => {
  console.error('Slack shared-communications verification failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
