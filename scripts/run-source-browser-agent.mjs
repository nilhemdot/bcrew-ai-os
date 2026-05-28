#!/usr/bin/env node

import process from 'node:process'

import {
  SOURCE_BROWSER_AGENT_ID,
  buildSourceBrowserAgentCrawlItemInput,
  buildSourceBrowserAgentHarnessSnapshot,
  planSourceBrowserAgentRun,
} from '../lib/source-browser-agent-harness.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: argv.includes('--json'),
    snapshot: argv.includes('--snapshot'),
    crawlItem: argv.includes('--crawlItem') || argv.includes('--crawl-item'),
    packet: {},
    observation: {},
  }
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    const key = rawKey.trim()
    const value = rawValue.length ? rawValue.join('=') : 'true'
    if (key === 'url') args.packet.url = value
    if (key === 'sourceId') args.packet.sourceId = value
    if (key === 'sourceType') args.packet.sourceType = value
    if (key === 'sourceFamily') args.packet.sourceFamily = value
    if (key === 'title') args.packet.title = value
    if (key === 'preview') args.packet.preview = value
    if (key === 'action' || key === 'requestedAction') args.packet.action = value
    if (key === 'account') args.packet.account = value
    if (key === 'authMethod') args.packet.authMethod = value
    if (key === 'sourceBoundaryApproved') args.packet.sourceBoundaryApproved = value
    if (key === 'keychainPresent') args.packet.keychainPresent = value
    if (key === 'persistentProfilePresent') args.packet.persistentProfilePresent = value
    if (key === 'sessionHealthy') args.packet.sessionHealthy = value
    if (key === 'loginRecipePresent') args.packet.loginRecipePresent = value
    if (key === 'mfaChallenge') args.packet.mfaChallenge = value
    if (key === 'requiresAccountCreation') args.packet.requiresAccountCreation = value
    if (key === 'signupSurfaceDetected') args.packet.signupSurfaceDetected = value
    if (key === 'allowExternalSignup') args.packet.allowExternalSignup = value
    if (key === 'nativeReadonlyConnectorPresent') args.packet.nativeReadonlyConnectorPresent = value
    if (key === 'nativeReadonlyConnectorApproved') args.packet.nativeReadonlyConnectorApproved = value
    if (key === 'observedUrl') args.observation.url = value
    if (key === 'observedTitle') args.observation.title = value
    if (key === 'observedText') {
      args.observation.bodyTextPreview = value
      args.observation.textChars = value.length
    }
  }
  return args
}

async function main() {
  const args = parseArgs()
  if (args.snapshot) {
    const snapshot = buildSourceBrowserAgentHarnessSnapshot()
    console.log(JSON.stringify(snapshot, null, 2))
    return
  }
  if (!args.packet.url) {
    throw new Error('Usage: npm run source:browser-agent -- --url=https://source.example --sourceType=public_or_free_source --json')
  }

  const report = planSourceBrowserAgentRun({
    packet: args.packet,
    observation: Object.keys(args.observation).length ? args.observation : undefined,
  })
  const output = args.crawlItem ? buildSourceBrowserAgentCrawlItemInput(report) : report

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
    return
  }

  console.log(`Source Browser Agent: ${report.status}`)
  console.log(`Agent: ${SOURCE_BROWSER_AGENT_ID}`)
  console.log(`Source: ${report.sourcePacket?.url}`)
  console.log(`Family: ${report.sourcePacket?.sourceFamily}`)
  console.log(`Tool: ${report.toolRoute?.toolId}`)
  console.log(`State: ${report.terminalState}`)
  console.log(`Runner: ${report.runnerCommand?.displayCommand || 'none'}`)
  if (args.crawlItem) console.log(`Readback item: ${output.itemKey}`)
  console.log(`Next: ${report.nextAction}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
