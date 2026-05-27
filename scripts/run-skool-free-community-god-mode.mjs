#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'

import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} from '../lib/source-session-broker.js'
import {
  runSkoolFreeCommunityGodMode,
} from '../lib/skool-free-community-god-mode-runner.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    url: '',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    headed: argv.includes('--headed'),
    json: argv.includes('--json'),
    allowLocalFixture: argv.includes('--allowLocalFixture'),
    allowFreeJoin: !argv.includes('--noJoin'),
  }
  for (const arg of argv) {
    if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
    if (arg.startsWith('--account=')) args.account = arg.slice('--account='.length)
    if (arg.startsWith('--profileDir=')) args.profileDir = arg.slice('--profileDir='.length)
    if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length)
    if (arg.startsWith('--maxPages=')) args.maxPages = Number(arg.slice('--maxPages='.length))
    if (arg.startsWith('--maxDepth=')) args.maxDepth = Number(arg.slice('--maxDepth='.length))
  }
  return args
}

async function main() {
  const args = parseArgs()
  if (!args.url) throw new Error('Missing --url=https://www.skool.com/<community>/about')

  const report = await runSkoolFreeCommunityGodMode({
    url: args.url,
    account: args.account,
    profileDir: args.profileDir ? path.resolve(args.profileDir) : undefined,
    rootDir: args.root ? path.resolve(args.root) : undefined,
    allowLocalFixture: args.allowLocalFixture,
    allowFreeJoin: args.allowFreeJoin,
    headed: args.headed,
    maxPages: Number.isFinite(args.maxPages) ? args.maxPages : undefined,
    maxDepth: Number.isFinite(args.maxDepth) ? args.maxDepth : undefined,
  })

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`Skool free God Mode run: ${report.status}`)
  console.log(`Target: ${report.targetUrl}`)
  console.log(`Account: ${report.account}`)
  console.log(`Pages read: ${report.counts?.pagesRead || 0}`)
  console.log(`Recent activity items: ${report.counts?.recentActivityItems || 0}`)
  console.log(`Course/resource pages: ${report.counts?.courseOrResourcePages || 0}`)
  console.log(`Join attempted: ${report.sideEffects?.joinAttempted}`)
  console.log(`Auth needed: ${Boolean(report.authNeeded)}`)
  console.log(`Report: ${report.artifacts?.reportPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
