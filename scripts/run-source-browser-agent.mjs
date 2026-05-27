#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'

import {
  SKOOL_FREE_PUBLIC_READ_DEFAULT_URL,
  SKOOL_FREE_PUBLIC_READ_POST_URL,
  runSkoolFreePublicReadCheck,
} from '../lib/skool-free-public-read-runner.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    target: 'kia-skool-community',
    url: '',
    liveGemini: argv.includes('--live-gemini'),
    headed: argv.includes('--headed'),
    json: argv.includes('--json'),
  }
  for (const arg of argv) {
    if (arg.startsWith('--target=')) args.target = arg.slice('--target='.length)
    if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
    if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length)
    if (arg.startsWith('--model=')) args.model = arg.slice('--model='.length)
    if (arg.startsWith('--maxPages=')) args.maxPages = Number(arg.slice('--maxPages='.length))
    if (arg.startsWith('--maxDepth=')) args.maxDepth = Number(arg.slice('--maxDepth='.length))
    if (arg.startsWith('--maxClicks=')) args.maxClicks = Number(arg.slice('--maxClicks='.length))
    if (arg.startsWith('--lookbackDays=')) args.lookbackDays = Number(arg.slice('--lookbackDays='.length))
  }
  return args
}

function urlForTarget(args = {}) {
  if (args.url) return args.url
  if (args.target === 'kia-skool-post') return SKOOL_FREE_PUBLIC_READ_POST_URL
  return SKOOL_FREE_PUBLIC_READ_DEFAULT_URL
}

async function main() {
  const args = parseArgs()
  const report = await runSkoolFreePublicReadCheck({
    url: urlForTarget(args),
    rootDir: args.root ? path.resolve(args.root) : undefined,
    liveGemini: args.liveGemini,
    headed: args.headed,
    model: args.model,
    maxPages: Number.isFinite(args.maxPages) ? args.maxPages : undefined,
    maxDepth: Number.isFinite(args.maxDepth) ? args.maxDepth : undefined,
    maxClicks: Number.isFinite(args.maxClicks) ? args.maxClicks : undefined,
    lookbackDays: Number.isFinite(args.lookbackDays) ? args.lookbackDays : undefined,
  })

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`Source browser agent run: ${report.status}`)
  console.log(`Target: ${report.targetUrl}`)
  console.log(`Final: ${report.finalUrl}`)
  console.log(`Public readable: ${report.publicReadable}`)
  console.log(`Eyes: DOM=true screenshot=${Boolean(report.artifacts?.screenshotPath)} Gemini=${report.vision?.status || 'unknown'}`)
  console.log(`Manual clicks: ${report.sideEffects?.manualClicks}`)
  console.log(`Clicked: ${report.sideEffects?.clicked}`)
  console.log(`Browser profile: ${report.runner?.browserProfileMode || report.sideEffects?.browserProfileMode || 'unknown'}`)
  console.log(`Report: ${report.artifacts?.reportPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
