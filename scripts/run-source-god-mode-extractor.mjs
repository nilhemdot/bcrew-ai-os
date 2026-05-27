#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'

import {
  runSourceGodModeExtractor,
} from '../lib/source-god-mode-extractor-runtime.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    url: '',
    sourceType: 'public_or_free_source',
    creatorId: '',
    creatorName: '',
    mode: 'live_browser',
    maxPages: 4,
    maxDepth: 1,
    headed: argv.includes('--headed'),
    json: argv.includes('--json'),
  }
  for (const arg of argv) {
    if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
    if (arg.startsWith('--sourceType=')) args.sourceType = arg.slice('--sourceType='.length)
    if (arg.startsWith('--creatorId=')) args.creatorId = arg.slice('--creatorId='.length)
    if (arg.startsWith('--creatorName=')) args.creatorName = arg.slice('--creatorName='.length)
    if (arg.startsWith('--mode=')) args.mode = arg.slice('--mode='.length)
    if (arg.startsWith('--maxPages=')) args.maxPages = Number(arg.slice('--maxPages='.length))
    if (arg.startsWith('--maxDepth=')) args.maxDepth = Number(arg.slice('--maxDepth='.length))
    if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length)
  }
  return args
}

async function main() {
  const args = parseArgs()
  if (!args.url) throw new Error('Missing --url=http(s)://...')

  const report = await runSourceGodModeExtractor({
    url: args.url,
    sourceType: args.sourceType,
    creatorId: args.creatorId,
    creatorName: args.creatorName,
    mode: args.mode,
    maxPages: Number.isFinite(args.maxPages) ? args.maxPages : 4,
    maxDepth: Number.isFinite(args.maxDepth) ? args.maxDepth : 1,
    headed: args.headed,
    rootDir: args.root ? path.resolve(args.root) : undefined,
  })

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`Source God Mode run: ${report.status}`)
  console.log(`Target: ${report.targetUrl}`)
  console.log(`Source type: ${report.sourceType}`)
  console.log(`Pages read: ${report.pages?.length || 0}`)
  console.log(`Hands events: ${report.handsEvents?.length || 0}`)
  console.log(`Capabilities: ${Object.entries(report.capabilities || {}).map(([key, value]) => `${key}=${value}`).join(', ')}`)
  console.log(`Newsletter candidates: ${report.newsletterCandidates?.length || 0}`)
  console.log(`Paid gate evaluations: ${report.paidGateEvaluations?.length || 0}`)
  console.log(`Manual clicks: ${report.sideEffects?.manualClicks}`)
  console.log(`External writes: ${report.sideEffects?.externalWrites}`)
  console.log(`Report: ${report.artifacts?.reportPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
