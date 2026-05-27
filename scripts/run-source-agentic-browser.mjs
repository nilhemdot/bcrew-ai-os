#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'

import {
  SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL,
  runSourceAgenticBrowserProbe,
} from '../lib/source-agentic-browser-runtime.js'
import {
  SKOOL_FREE_PUBLIC_READ_DEFAULT_URL,
  SKOOL_FREE_PUBLIC_READ_POST_URL,
} from '../lib/skool-free-public-read-runner.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    target: 'kia-skool-community',
    url: '',
    sourceType: 'free_skool_community',
    model: SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL,
    env: '',
    headed: argv.includes('--headed'),
    json: argv.includes('--json'),
    noAgent: argv.includes('--no-agent'),
    noClick: argv.includes('--no-click'),
  }
  for (const arg of argv) {
    if (arg.startsWith('--target=')) args.target = arg.slice('--target='.length)
    if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
    if (arg.startsWith('--sourceType=')) args.sourceType = arg.slice('--sourceType='.length)
    if (arg.startsWith('--model=')) args.model = arg.slice('--model='.length)
    if (arg.startsWith('--env=')) args.env = arg.slice('--env='.length)
    if (arg.startsWith('--maxSteps=')) args.maxSteps = Number(arg.slice('--maxSteps='.length))
    if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length)
    if (arg.startsWith('--instruction=')) args.instruction = arg.slice('--instruction='.length)
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
  const report = await runSourceAgenticBrowserProbe({
    url: urlForTarget(args),
    sourceType: args.sourceType,
    instruction: args.instruction,
    model: args.model,
    env: args.env || undefined,
    headed: args.headed,
    maxSteps: Number.isFinite(args.maxSteps) ? args.maxSteps : undefined,
    rootDir: args.root ? path.resolve(args.root) : undefined,
    clickFirstSafeObservedAction: !args.noClick,
    runAgent: !args.noAgent,
  })

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`Agentic browser run: ${report.status}`)
  console.log(`Target: ${report.targetUrl}`)
  console.log(`Final: ${report.finalUrl}`)
  console.log(`Adapter: ${report.runtime?.adapter} ${report.runtime?.env}`)
  console.log(`Model: ${report.runtime?.model}`)
  console.log(`Observed actions: ${report.observations?.length || 0}`)
  console.log(`Safe actions: ${report.safeActions?.length || 0}`)
  console.log(`Actions run: ${report.actionsRun?.length || 0}`)
  console.log(`Manual clicks: ${report.sideEffects?.manualClicks}`)
  console.log(`Normal Chrome profile used: ${report.sideEffects?.normalChromeProfileUsed}`)
  console.log(`Report: ${report.artifacts?.reportPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
