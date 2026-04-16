#!/usr/bin/env node

import process from 'node:process'
import { getFubContextsSummary, getFubHealth } from '../lib/fub.js'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const requestedContext = typeof args.context === 'string' ? args.context.trim().toLowerCase() : ''
  const contexts = getFubContextsSummary()
  const targetKeys = requestedContext
    ? [requestedContext]
    : contexts.filter(context => context.configured).map(context => context.key)

  if (!targetKeys.length) {
    throw new Error('No configured Follow Up Boss contexts found.')
  }

  console.log('Follow Up Boss health check')

  for (const contextKey of targetKeys) {
    const context = contexts.find(item => item.key === contextKey)
    if (!context) {
      throw new Error('Unknown Follow Up Boss context: ' + contextKey)
    }

    console.log(`  Context: ${context.label} (${context.key})`)
    console.log(`  Configured via: ${context.envName}`)

    const result = await getFubHealth(contextKey)
    console.log(`  Status: ${result.status}`)
    console.log(`  Users returned: ${result.usersReturned}`)

    for (const user of result.sampleUsers) {
      console.log(`    - ${user.id}: ${user.name || '(no name)'} <${user.email || 'no-email'}>`)
    }
  }
}

main().catch(error => {
  console.error('Follow Up Boss health check failed.')
  console.error(error.message)
  process.exit(1)
})
