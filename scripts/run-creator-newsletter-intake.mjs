#!/usr/bin/env node

import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} from '../lib/source-session-broker.js'
import {
  buildCreatorNewsletterIntakePacket,
  runCreatorNewsletterIntake,
} from '../lib/creator-newsletter-intake-runner.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    url: '',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    json: argv.includes('--json'),
    apply: argv.includes('--apply'),
    allowLocalFixture: argv.includes('--allowLocalFixture') || argv.includes('--allow-local-fixture'),
    allowExternalSignup: argv.includes('--allowExternalSignup') || argv.includes('--allow-external-signup'),
  }
  for (const arg of argv) {
    if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
    if (arg.startsWith('--account=')) args.account = arg.slice('--account='.length)
    if (arg.startsWith('--maxBytes=')) args.maxBytes = Number(arg.slice('--maxBytes='.length))
  }
  return args
}

async function main() {
  const args = parseArgs()
  if (!args.url) {
    throw new Error('Usage: npm run newsletter:intake -- --url=https://creator.example/newsletter')
  }

  const report = await runCreatorNewsletterIntake({
    url: args.url,
    account: args.account,
    apply: args.apply,
    allowLocalFixture: args.allowLocalFixture,
    allowExternalSignup: args.allowExternalSignup,
    maxBytes: Number.isFinite(args.maxBytes) ? args.maxBytes : undefined,
  })
  const packet = buildCreatorNewsletterIntakePacket(report)

  if (args.json) {
    console.log(JSON.stringify({ report, packet }, null, 2))
    return
  }

  console.log(`Newsletter intake: ${report.status}`)
  console.log(`Target: ${report.url}`)
  console.log(`Account: ${report.sourceIdentity?.account || args.account}`)
  console.log(`Inbox: ${report.sourceIdentity?.inboxLabel || packet.inboxLabel}`)
  console.log(`Safe form: ${Boolean(report.selectedForm)}`)
  console.log(`Submit allowed now: ${Boolean(report.submitAllowedNow)}`)
  console.log(`External signup submitted: ${Boolean(report.sideEffects?.externalSignupSubmitted)}`)
  console.log(report.plainEnglish || packet.nextAction)

  if (report.ok !== true) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
