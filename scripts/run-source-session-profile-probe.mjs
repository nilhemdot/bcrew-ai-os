#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'

import {
  runSourceSessionProfileProbe,
} from '../lib/source-session-profile-probe.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    url: '',
    sourceFamily: 'skool_free_community',
    source: '',
    account: '',
    action: '',
    sourceBoundaryApproved: true,
    loginRecipePresent: false,
    profileMode: 'persistent_isolated',
    headed: argv.includes('--headed'),
    json: argv.includes('--json'),
  }
  for (const arg of argv) {
    if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
    if (arg.startsWith('--sourceFamily=')) args.sourceFamily = arg.slice('--sourceFamily='.length)
    if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length)
    if (arg.startsWith('--account=')) args.account = arg.slice('--account='.length)
    if (arg.startsWith('--action=')) args.action = arg.slice('--action='.length)
    if (arg.startsWith('--sourceBoundaryApproved=')) args.sourceBoundaryApproved = arg.slice('--sourceBoundaryApproved='.length)
    if (arg.startsWith('--keychainPresent=')) args.keychainPresent = arg.slice('--keychainPresent='.length) === 'true'
    if (arg.startsWith('--loginRecipePresent=')) args.loginRecipePresent = arg.slice('--loginRecipePresent='.length) === 'true'
    if (arg.startsWith('--profileMode=')) args.profileMode = arg.slice('--profileMode='.length)
    if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length)
  }
  return args
}

async function main() {
  const args = parseArgs()
  if (!args.url) throw new Error('Usage: npm run source:session-probe -- --url=https://source.example --sourceFamily=skool_free_community --json')
  const report = await runSourceSessionProfileProbe({
    url: args.url,
    sourceFamily: args.sourceFamily,
    source: args.source,
    account: args.account,
    action: args.action,
    sourceBoundaryApproved: args.sourceBoundaryApproved,
    keychainPresent: args.keychainPresent,
    loginRecipePresent: args.loginRecipePresent,
    profileMode: args.profileMode,
    headed: args.headed,
    rootDir: args.root ? path.resolve(args.root) : undefined,
  })
  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  console.log(`Source session profile probe: ${report.status}`)
  console.log(`Target: ${report.targetUrl}`)
  console.log(`Source: ${report.sourceFamily}/${report.source}`)
  console.log(`Account: ${report.account}`)
  console.log(`Broker: ${report.brokerDecision?.status || 'missing'} (${report.brokerDecision?.reason || 'no reason'})`)
  console.log(`Report: ${report.artifacts?.reportPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
