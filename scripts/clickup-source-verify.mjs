#!/usr/bin/env node

import {
  formatClickUpSourceVerificationReport,
  getClickUpVerifyMaxTaskPages,
  getClickUpVerifyTimeoutMs,
  runClickUpSourceVerification,
} from '../lib/clickup-source-verifier.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    timeoutMs: getClickUpVerifyTimeoutMs(),
    maxTaskPages: getClickUpVerifyMaxTaskPages(),
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--timeoutMs=')) args.timeoutMs = Number(arg.slice('--timeoutMs='.length))
    else if (arg.startsWith('--maxTaskPages=')) args.maxTaskPages = Number(arg.slice('--maxTaskPages='.length))
  }
  return args
}

async function main() {
  const args = parseArgs()
  const result = await runClickUpSourceVerification({
    timeoutMs: args.timeoutMs,
    maxTaskPages: args.maxTaskPages,
  })
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    process.stdout.write(formatClickUpSourceVerificationReport(result))
  }
  if (!result.ok) process.exitCode = 1
}

main().catch(error => {
  console.error('ClickUp source verification failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
