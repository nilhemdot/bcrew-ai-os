#!/usr/bin/env node

import process from 'node:process'

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  upsertSourceCrawlItem,
  upsertSourceCrawlTarget,
} from '../lib/foundation-source-crawl-db.js'
import {
  executeSourceBrowserAgentRun,
  persistSourceBrowserAgentExecution,
} from '../lib/source-browser-agent-executor.js'
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
    execute: argv.includes('--execute'),
    persist: argv.includes('--persist'),
    allowLocalFixture: argv.includes('--allowLocalFixture') || argv.includes('--allow-local-fixture'),
    allowSourceSessionRun: argv.includes('--allowSourceSessionRun') || argv.includes('--allow-source-session-run'),
    headed: argv.includes('--headed'),
    mode: 'live_browser',
    maxPages: 4,
    maxDepth: 1,
    actor: process.env.FOUNDATION_JOB_ACTOR || 'source-browser-agent-cli',
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
    if (key === 'mode') args.mode = value
    if (key === 'maxPages') args.maxPages = Number(value)
    if (key === 'maxDepth') args.maxDepth = Number(value)
    if (key === 'actor') args.actor = value
  }
  args.maxPages = Number.isFinite(args.maxPages) ? Math.max(1, Math.min(20, args.maxPages)) : 4
  args.maxDepth = Number.isFinite(args.maxDepth) ? Math.max(0, Math.min(4, args.maxDepth)) : 1
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

  if (args.execute) {
    const execution = await executeSourceBrowserAgentRun({
      packet: args.packet,
      observation: Object.keys(args.observation).length ? args.observation : undefined,
      mode: args.mode,
      maxPages: args.maxPages,
      maxDepth: args.maxDepth,
      headed: args.headed,
      allowLocalFixture: args.allowLocalFixture,
      allowSourceSessionRun: args.allowSourceSessionRun,
    })
    let persistence = null
    if (args.persist) {
      await initFoundationDb()
      try {
        persistence = await persistSourceBrowserAgentExecution(execution, {
          actor: args.actor,
          upsertSourceCrawlTarget,
          upsertSourceCrawlItem,
        })
      } finally {
        await closeFoundationDb().catch(() => {})
      }
    }
    const output = { execution, persistence }
    if (args.json) {
      console.log(JSON.stringify(output, null, 2))
      return
    }
    console.log(`Source Browser Agent execution: ${execution.status}`)
    console.log(`Agent: ${SOURCE_BROWSER_AGENT_ID}`)
    console.log(`Source: ${execution.plan?.sourcePacket?.url}`)
    console.log(`Tool: ${execution.runner || execution.plan?.toolRoute?.toolId || 'none'}`)
    console.log(`Pages: ${execution.crawlItem?.metadata?.pagesRead || 0}`)
    console.log(`Unsafe side effects: ${Boolean(execution.unsafeSideEffectDetected)}`)
    if (persistence) console.log(`Persisted: ${persistence.status}`)
    console.log(`Next: ${execution.plan?.nextAction || execution.plainEnglish || ''}`)
    if (execution.ok !== true) process.exitCode = 1
    return
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
