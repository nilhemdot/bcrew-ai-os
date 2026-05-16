#!/usr/bin/env node

import process from 'node:process'
import { Pool } from 'pg'

import {
  applySourceIdScalarFksWithClient,
} from '../lib/source-id-scalar-fk-migration.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    json: false,
    actor: 'source-id-scalar-fk-migration',
  }
  for (const arg of argv) {
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    else if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--actor=')) args.actor = arg.slice('--actor='.length).trim() || args.actor
  }
  return args
}

function summarize(result) {
  return [
    `mode=${result.mode}`,
    `ok=${result.ok}`,
    `relations=${result.before?.relations?.length || 0}`,
    `invalidRefs=${result.before?.invalidReferenceCount || 0}`,
    `constraints=${result.after?.constraints?.validatedCount || 0}/${result.after?.constraints?.expectedCount || 0}`,
    `blockers=${(result.blockers || []).length}`,
  ].join(' ')
}

async function main() {
  const args = parseArgs()
  const pool = new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
  const client = await pool.connect()
  let result = null
  try {
    await client.query('BEGIN')
    result = await applySourceIdScalarFksWithClient(client, {
      actor: args.actor,
      apply: args.apply,
    })
    if (args.apply) {
      if (!result.ok) throw new Error(`source-ID scalar FK migration blocked: ${(result.blockers || []).join('; ')}`)
      await client.query('COMMIT')
    } else {
      await client.query('ROLLBACK')
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (result && args.json) {
      console.log(JSON.stringify({ ...result, ok: false, error: error.message }, null, 2))
    }
    throw error
  } finally {
    client.release()
    await pool.end()
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source ID scalar FK migration: ${summarize(result)}`)
    if (!args.apply) console.log('Dry-run only. Re-run with --apply to add/validate constraints.')
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
