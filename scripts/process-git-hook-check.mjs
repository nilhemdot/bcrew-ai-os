#!/usr/bin/env node

import process from 'node:process'
import {
  runPreCommitHook,
  runPrePushHook,
} from '../lib/process-git-hooks.js'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

async function readStdin() {
  if (process.stdin.isTTY) return ''
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const mode = String(args.mode || '').trim()
  let status = null

  if (mode === 'pre-commit') {
    status = await runPreCommitHook()
  } else if (mode === 'pre-push') {
    status = await runPrePushHook({ stdinText: await readStdin() })
  } else {
    console.error('Usage: node scripts/process-git-hook-check.mjs --mode=pre-commit|pre-push')
    process.exitCode = 1
    return
  }

  console.log(`Foundation Git hook check: ${mode}`)
  console.log(status.message)
  if (status.protectedFiles?.length) {
    console.log(`Protected Foundation files: ${status.protectedFiles.join(', ')}`)
  }
  if (status.checkedFiles?.length) {
    console.log(`Static checked files: ${status.checkedFiles.join(', ')}`)
  }
  if (status.bypass) {
    console.log('Bypass recorded locally in .git/foundation-hook-bypass.log.')
  }
  if (!status.ok) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
