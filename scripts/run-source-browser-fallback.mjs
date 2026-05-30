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
  buildSourceBrowserFallbackRetryPacket,
  runSourceBrowserFallbackRetry,
} from '../lib/source-browser-fallback-executor.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: argv.includes('--json'),
    apply: argv.includes('--apply') || argv.includes('--execute'),
    persist: argv.includes('--persist'),
    allowLocalFixture: argv.includes('--allowLocalFixture') || argv.includes('--allow-local-fixture'),
    allowSourceSessionRun: argv.includes('--allowSourceSessionRun') || argv.includes('--allow-source-session-run'),
    mode: 'live_browser',
    maxPages: 4,
    maxDepth: 1,
    actor: process.env.FOUNDATION_JOB_ACTOR || 'source-browser-fallback-cli',
    row: {},
  }
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    const key = rawKey.trim()
    const value = rawValue.length ? rawValue.join('=') : 'true'
    if (key === 'url') args.row.url = value
    if (key === 'rowId' || key === 'sourceId') args.row.rowId = value
    if (key === 'sourceType') args.row.sourceType = value
    if (key === 'sourceFamily') args.row.sourceFamily = value
    if (key === 'bucketId') args.row.bucketId = value
    if (key === 'host') args.row.host = value
    if (key === 'label' || key === 'title') args.row.label = value
    if (key === 'reason') args.row.reason = value
    if (key === 'account') args.row.account = value
    if (key === 'sourceSessionReady' || key === 'sessionHealthy') args.row.sourceSessionReady = value
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
  if (!args.row.url) {
    throw new Error('Usage: npm run source:browser-fallback -- --url=https://source.example --bucketId=public-web-resources --json')
  }
  let deps = {}
  if (args.persist) {
    await initFoundationDb()
    deps = {
      actor: args.actor,
      upsertSourceCrawlTarget,
      upsertSourceCrawlItem,
    }
  }
  try {
    const result = args.apply
      ? await runSourceBrowserFallbackRetry({
          row: args.row,
          apply: true,
          persist: args.persist,
          maxPages: args.maxPages,
          maxDepth: args.maxDepth,
          mode: args.mode,
          allowLocalFixture: args.allowLocalFixture,
          allowSourceSessionRun: args.allowSourceSessionRun,
          deps,
        })
      : {
          ok: true,
          status: 'source_browser_fallback_retry_packet_ready',
          packet: buildSourceBrowserFallbackRetryPacket({
            row: args.row,
            maxPages: args.maxPages,
            maxDepth: args.maxDepth,
            mode: args.mode,
            persist: args.persist,
          }),
        }
    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }
    const packet = result.packet || {}
    console.log(`Source Browser Fallback: ${result.status}`)
    console.log(`Source: ${packet.sourcePacket?.url || args.row.url}`)
    console.log(`Retry: ${packet.cleanRetry?.allowedNow ? 'ready' : 'blocked'}`)
    if (packet.cleanRetry?.command) console.log(`Command: ${packet.cleanRetry.command}`)
    console.log(`Next: ${result.plainEnglish || packet.plainEnglish || ''}`)
    if (result.ok !== true) process.exitCode = 1
  } finally {
    if (args.persist) await closeFoundationDb().catch(() => {})
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
