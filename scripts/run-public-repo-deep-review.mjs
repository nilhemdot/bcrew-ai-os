#!/usr/bin/env node

import {
  buildPublicRepoDeepReviewPacket,
  runPublicRepoDeepReview,
} from '../lib/public-repo-deep-review-runner.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

async function main() {
  const args = parseArgs()
  const url = String(args.url || '').trim()
  if (!url) throw new Error('Usage: npm run repo:deep-review -- --url=https://github.com/owner/repo')

  const report = await runPublicRepoDeepReview({
    url,
    allowLocalFixture: boolArg(args.allowLocalFixture || args.allow_local_fixture),
    maxPages: Number(args.maxPages || args.max_pages || 8),
    maxDepth: Number(args.maxDepth || args.max_depth || 2),
  })
  const packet = buildPublicRepoDeepReviewPacket(report)

  console.log(JSON.stringify({ report, packet }, null, 2))
  if (report.ok !== true) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
