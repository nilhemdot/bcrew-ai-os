#!/usr/bin/env node

import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  searchSharedCommunicationArtifactsForContext,
} from '../lib/foundation-shared-comms-db.js'
import {
  buildCreatorNewsletterConfirmationReadback,
} from '../lib/creator-newsletter-intake-runner.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} from '../lib/source-session-broker.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    url: '',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    submittedAt: '',
    json: argv.includes('--json'),
    limit: 12,
  }
  for (const arg of argv) {
    if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
    if (arg.startsWith('--account=')) args.account = arg.slice('--account='.length)
    if (arg.startsWith('--submittedAt=')) args.submittedAt = arg.slice('--submittedAt='.length)
    if (arg.startsWith('--submitted-at=')) args.submittedAt = arg.slice('--submitted-at='.length)
    if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length))
  }
  return args
}

function hostOf(value = '') {
  try {
    return new URL(String(value || '').trim()).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

async function main() {
  const args = parseArgs()
  if (!args.url) {
    throw new Error('Usage: npm run newsletter:confirmation-readback -- --url=https://creator.example/newsletter --account=ai@bensoncrew.ca')
  }

  const host = hostOf(args.url)
  const query = [
    host,
    'newsletter',
    'confirm',
    'confirmation',
    'verify',
    'subscribed',
  ].filter(Boolean).join(' ')

  const searchResults = await searchSharedCommunicationArtifactsForContext({
    query,
    sourceIds: ['SRC-GMAIL-001'],
    artifactTypes: ['email_thread'],
    limit: Number.isFinite(args.limit) ? args.limit : 12,
    excerptChars: 3000,
  })

  const readback = buildCreatorNewsletterConfirmationReadback({
    url: args.url,
    account: args.account,
    submittedAt: args.submittedAt,
    searchResults,
  })

  if (args.json) {
    console.log(JSON.stringify({ readback }, null, 2))
    return
  }

  console.log(`Newsletter confirmation readback: ${readback.status}`)
  console.log(`Target: ${readback.sourceUrl}`)
  console.log(`Account: ${readback.account}`)
  console.log(`Inbox: ${readback.inboxLabel}`)
  console.log(`Candidates scanned: ${readback.candidateCount}`)
  console.log(`Confirmation email read: ${Boolean(readback.confirmationEmailRead)}`)
  console.log(`Subscribed status: ${readback.subscribedStatus}`)
  if (readback.bestMatch) {
    console.log(`Best match: ${readback.bestMatch.title} (${readback.bestMatch.score})`)
  }
  console.log(readback.nextAction)

  if (readback.ok !== true) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
}).finally(async () => {
  await closeFoundationDb()
})
