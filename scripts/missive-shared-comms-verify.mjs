#!/usr/bin/env node

import process from 'node:process';
import {
  getMissiveHealth,
  getMissiveThread,
  listMissiveInbox,
} from '../lib/missive.js';

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inboxLimit = Math.max(1, Number(args.limit || 5));

  console.log('Missive shared-communications check');

  const health = await getMissiveHealth();
  console.log(`  Missive health: OK -> ${health.organizations.length} organizations`);
  if (health.organizations[0]) {
    console.log(`  Org sample: ${JSON.stringify(health.organizations[0])}`);
  }

  const inbox = await listMissiveInbox(inboxLimit);
  console.log(`  Inbox read: OK -> ${inbox.length} conversations`);
  if (!inbox.length) {
    console.log('Missive is reachable, but the inbox is empty.');
    return;
  }

  console.log(`  Inbox sample: ${JSON.stringify({
    id: inbox[0].id,
    subject: inbox[0].subject,
    lastActivityAt: inbox[0].lastActivityAt,
  })}`);

  const thread = await getMissiveThread(inbox[0].id);
  console.log(`  Thread read: OK -> ${thread.messages.length} messages, ${thread.comments.length} comments`);
  console.log('Missive shared-communications reads are ready for source verification.');
}

main().catch((error) => {
  console.error('Missive shared-communications verification failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
