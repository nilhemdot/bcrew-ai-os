#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'

import {
  runLocalVirtualBrowserHandsProbe,
} from '../lib/local-virtual-browser-hands-runtime.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    url: '',
    sourceType: 'public_or_free_source',
    account: '',
    profileMode: 'persistent_isolated',
    headed: argv.includes('--headed'),
    json: argv.includes('--json'),
    clickFirstSafeAction: argv.includes('--clickFirstSafeAction'),
  }
  for (const arg of argv) {
    if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
    if (arg.startsWith('--sourceType=')) args.sourceType = arg.slice('--sourceType='.length)
    if (arg.startsWith('--account=')) args.account = arg.slice('--account='.length)
    if (arg.startsWith('--profileMode=')) args.profileMode = arg.slice('--profileMode='.length)
    if (arg.startsWith('--maxActions=')) args.maxActions = Number(arg.slice('--maxActions='.length))
    if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length)
  }
  return args
}

async function main() {
  const args = parseArgs()
  if (!args.url) throw new Error('Usage: npm run source:local-browser-hands -- --url=https://source.example --json')
  const report = await runLocalVirtualBrowserHandsProbe({
    url: args.url,
    sourceType: args.sourceType,
    sourceAccount: args.account,
    profileMode: args.profileMode,
    headed: args.headed,
    clickFirstSafeAction: args.clickFirstSafeAction,
    maxActions: Number.isFinite(args.maxActions) ? args.maxActions : undefined,
    rootDir: args.root ? path.resolve(args.root) : undefined,
  })

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`Local browser hands run: ${report.status}`)
  console.log(`Target: ${report.targetUrl}`)
  console.log(`Final: ${report.finalUrl}`)
  console.log(`Adapter: ${report.runtime?.adapter}`)
  console.log(`Browserbase used: ${report.runtime?.browserbaseUsed}`)
  console.log(`Model called: ${report.runtime?.modelCalled}`)
  console.log(`Normal Chrome profile used: ${report.runtime?.normalChromeProfileUsed}`)
  console.log(`Observed actions: ${report.observedActions?.length || 0}`)
  console.log(`Safe actions: ${report.safeActions?.length || 0}`)
  console.log(`Actions run: ${report.actionsRun?.length || 0}`)
  console.log(`Report: ${report.artifacts?.reportPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
