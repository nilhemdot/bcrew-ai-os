#!/usr/bin/env node

import process from 'node:process';
import {
  GOOGLE_SA_KEY_FILE,
  getServiceAccountSummary,
  listCalendarEvents,
  listGmailMessages,
} from '../lib/google-delegated.js';

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
  const userEmail = args.user || process.env.GOOGLE_IMPERSONATE_EMAIL || 'ai@bensoncrew.ca';
  const maxMessages = Math.max(1, Number(args.messages || 5));
  const maxEvents = Math.max(1, Number(args.events || 10));
  const query = args.query || 'newer_than:30d';
  const windowHours = Math.max(1, Number(args.hours || 24));
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  console.log('Google Workspace shared-communications check');
  console.log(`  Service account file: ${GOOGLE_SA_KEY_FILE}`);
  console.log(`  Access mode: impersonate ${userEmail}`);
  console.log(`  Gmail query: ${query}`);
  console.log(`  Calendar window: ${now.toISOString()} -> ${windowEnd.toISOString()}`);

  const summary = getServiceAccountSummary();
  console.log(`  Service account: ${summary.clientEmail}`);
  console.log(`  Project: ${summary.projectId}`);

  let failed = false;

  try {
    const messages = await listGmailMessages(userEmail, { query, maxResults: maxMessages });
    console.log(`  Gmail read: OK -> ${messages.length} messages`);
    if (messages[0]) {
      console.log(`  Gmail sample: ${JSON.stringify({
        subject: messages[0].subject,
        from: messages[0].from,
        date: messages[0].date,
      })}`);
    }
  } catch (error) {
    failed = true;
    console.error(`  Gmail read: FAIL -> ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const events = await listCalendarEvents(userEmail, {
      timeMin: now.toISOString(),
      timeMax: windowEnd.toISOString(),
      maxResults: maxEvents,
    });
    console.log(`  Calendar read: OK -> ${events.length} events`);
    if (events[0]) {
      console.log(`  Calendar sample: ${JSON.stringify({
        summary: events[0].summary,
        start: events[0].start,
        end: events[0].end,
      })}`);
    }
  } catch (error) {
    failed = true;
    console.error(`  Calendar read: FAIL -> ${error instanceof Error ? error.message : String(error)}`);
  }

  if (failed) {
    console.error('Delegated shared-communications verification failed.');
    process.exit(1);
  }

  console.log('Delegated Gmail and Calendar reads are ready for shared-communications source verification.');
}

main().catch((error) => {
  console.error('Shared-communications verification failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
