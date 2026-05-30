#!/usr/bin/env node

import process from 'node:process'

import {
  bootstrapFoundationDb,
  closeFoundationDb,
} from '../lib/foundation-db-session.js'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes('--apply'),
  }
}

async function main() {
  const args = parseArgs()
  if (!args.apply) {
    throw new Error('Refusing to run Foundation DB bootstrap without --apply.')
  }

  await bootstrapFoundationDb()
  console.log('Foundation DB bootstrap completed through explicit --apply path.')
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
}).finally(async () => {
  await closeFoundationDb().catch(() => {})
})
