#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const MANIFEST_PATH = 'data/source-maturity-repair-collapse-manifest.json'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: argv.includes('--json') || argv.includes('--json=true'),
    legacy: '',
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg.startsWith('--legacy=')) args.legacy = arg.slice('--legacy='.length)
  }
  return args
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'))
}

function normalize(value = '') {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

async function fileExists(relativePath = '') {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function findMove(manifest, legacyPath) {
  const normalized = normalize(legacyPath)
  return (manifest.movedFiles || []).find(move =>
    normalize(move.from) === normalized ||
      normalize(move.from).endsWith(`/${normalized}`) ||
      normalize(move.from).split('/').pop() === normalized,
  ) || null
}

async function main() {
  const args = parseArgs()
  const manifest = await readJson(MANIFEST_PATH)
  const move = findMove(manifest, args.legacy)
  const targetExists = move ? await fileExists(move.to) : false
  const ok = Boolean(move && targetExists && manifest.reduction?.afterActiveRepairFileCount < manifest.reduction?.beforeActiveRepairFileCount)
  const result = {
    ok,
    status: ok ? 'healthy' : 'blocked',
    legacy: args.legacy || null,
    archivedTo: move?.to || null,
    manifestPath: MANIFEST_PATH,
    reduction: manifest.reduction || null,
    checks: [
      {
        ok: Boolean(move),
        check: 'legacy source-maturity repair check is recorded in the archive manifest',
        detail: args.legacy || 'missing --legacy',
      },
      {
        ok: targetExists,
        check: 'archived legacy source-maturity repair file exists',
        detail: move?.to || 'missing target',
      },
      {
        ok: manifest.reduction?.afterActiveRepairFileCount < manifest.reduction?.beforeActiveRepairFileCount,
        check: 'source-maturity active repair surface went down',
        detail: `${manifest.reduction?.beforeActiveRepairFileCount ?? 'unknown'} -> ${manifest.reduction?.afterActiveRepairFileCount ?? 'unknown'}`,
      },
    ],
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else console.log(`source-maturity archived repair check: ${result.status} ${args.legacy || ''}`)
  process.exitCode = ok ? 0 : 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
