#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'

import {
  buildExtractionRetryFailedCommand,
  targetSupportsRetryExecution,
} from '../lib/extraction-run-hardening-execution.js'
import {
  classifySourceCrawlItemRetries,
  closeFoundationDb,
  getRetryableSourceCrawlItems,
  initFoundationDb,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)
const DRY_RUN_USAGE = '--dryRun=true'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rawValue] = arg.slice(2).split('=')
    args[key] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function normalizeLimit(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 10
  return Math.min(100, Math.max(1, Math.floor(number)))
}

async function main() {
  const args = parseArgs()
  const targetKey = String(args.target || args.targetKey || '').trim()
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'extraction-retry-failed').trim()
  const limit = normalizeLimit(args.limit)
  const dryRun = boolArg(args.dryRun) || boolArg(args['dry-run'])
  const jsonMode = boolArg(args.json)
  if (!targetKey) throw new Error(`Pass --target=<target-key>. Use ${DRY_RUN_USAGE} for no-write proof runs.`)

  await initFoundationDb()
  try {
    const supported = targetSupportsRetryExecution(targetKey)
    await classifySourceCrawlItemRetries({ targetKey, limit: 500 }, actor)
    const eligibleItems = supported
      ? await getRetryableSourceCrawlItems({ targetKey, limit })
      : []
    const command = buildExtractionRetryFailedCommand({ targetKey, actor, force: true })
    const summary = {
      status: supported ? 'ready' : 'blocked',
      targetKey,
      actor,
      dryRun,
      limit,
      supported,
      eligibleItemCount: eligibleItems.length,
      eligibleItemKeys: eligibleItems.map(item => item.itemKey),
      command: command.ok ? [command.command, ...command.args] : null,
      blockedReason: command.blockedReason || '',
      executed: false,
      exitCode: null,
    }

    if (!supported) {
      summary.status = 'blocked'
    } else if (dryRun || eligibleItems.length === 0) {
      summary.status = 'healthy'
    } else {
      const result = await execFile(command.command, command.args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          FOUNDATION_JOB_ACTOR: actor,
        },
        maxBuffer: 1024 * 1024 * 10,
      })
      summary.executed = true
      summary.exitCode = 0
      summary.stdoutTail = String(result.stdout || '').slice(-4000)
      summary.stderrTail = String(result.stderr || '').slice(-4000)
      await classifySourceCrawlItemRetries({ targetKey, limit: 500 }, actor)
      summary.status = 'healthy'
    }

    if (jsonMode) {
      console.log(JSON.stringify(summary, null, 2))
    } else {
      console.log('Extraction failed-item retry')
      console.log(`  Target: ${targetKey}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Eligible items: ${summary.eligibleItemCount}`)
      console.log(`  No-write mode: ${DRY_RUN_USAGE}`)
      if (summary.command) console.log(`  Command: ${summary.command.join(' ')}`)
      if (summary.blockedReason) console.log(`  Blocked: ${summary.blockedReason}`)
    }
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  if (process.argv.includes('--json') || process.argv.includes('--json=true')) {
    console.log(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
  }
  process.exitCode = 1
})
