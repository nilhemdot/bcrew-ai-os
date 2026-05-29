#!/usr/bin/env node

import {
  closeFoundationDb,
  searchSharedCommunicationArtifactsForContext,
} from '../lib/foundation-db.js'
import {
  buildCreatorNewsletterIssueExtraction,
} from '../lib/creator-newsletter-intake-runner.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} from '../lib/source-session-broker.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    url: '',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    confirmed: argv.includes('--confirmed') || argv.includes('--confirmed=true'),
    confirmationStatus: '',
    json: argv.includes('--json'),
    limit: 20,
  }
  for (const arg of argv) {
    if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
    if (arg.startsWith('--account=')) args.account = arg.slice('--account='.length)
    if (arg.startsWith('--confirmationStatus=')) args.confirmationStatus = arg.slice('--confirmationStatus='.length)
    if (arg.startsWith('--confirmation-status=')) args.confirmationStatus = arg.slice('--confirmation-status='.length)
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
    throw new Error('Usage: npm run newsletter:issue-extraction -- --url=https://creator.example/newsletter --account=ai@bensoncrew.ca --confirmed')
  }

  const host = hostOf(args.url)
  const query = [
    host,
    'newsletter',
    'issue',
    'update',
    'weekly',
    'resource',
    'github',
    'workflow',
  ].filter(Boolean).join(' ')

  const searchResults = await searchSharedCommunicationArtifactsForContext({
    query,
    sourceIds: ['SRC-GMAIL-001'],
    artifactTypes: ['email_thread'],
    limit: Number.isFinite(args.limit) ? args.limit : 20,
    excerptChars: 6000,
  })

  const extraction = buildCreatorNewsletterIssueExtraction({
    url: args.url,
    account: args.account,
    confirmed: args.confirmed,
    confirmationReadback: args.confirmationStatus
      ? { subscribedStatus: args.confirmationStatus }
      : null,
    searchResults,
  })

  if (args.json) {
    console.log(JSON.stringify({ extraction }, null, 2))
    return
  }

  console.log(`Newsletter issue extraction: ${extraction.status}`)
  console.log(`Target: ${extraction.sourceUrl}`)
  console.log(`Account: ${extraction.account}`)
  console.log(`Inbox: ${extraction.inboxLabel}`)
  console.log(`Candidates scanned: ${extraction.candidateCount || 0}`)
  console.log(`Issues read: ${extraction.issueCount || 0}`)
  console.log(`Implementation ideas: ${extraction.implementationIdeaCount || 0}`)
  console.log(`Resource links: ${extraction.resourceLinkCount || 0}`)
  console.log(extraction.nextAction)

  if (extraction.ok !== true) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
}).finally(async () => {
  await closeFoundationDb()
})
