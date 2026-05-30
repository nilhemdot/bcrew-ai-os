#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: argv.includes('--json') || argv.includes('--json=true'),
    manifest: '',
    legacy: '',
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg.startsWith('--manifest=')) args.manifest = arg.slice('--manifest='.length)
    if (arg.startsWith('--legacy=')) args.legacy = arg.slice('--legacy='.length)
  }
  return args
}

function normalize(value = '') {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'))
}

async function fileExists(relativePath = '') {
  try {
    const stat = await fs.stat(path.join(repoRoot, normalize(relativePath)))
    return stat.isFile()
  } catch {
    return false
  }
}

function findMove(manifest, legacyPath) {
  const normalized = normalize(legacyPath)
  return (manifest.movedFiles || []).find(move => normalize(move.from) === normalized) || null
}

async function main() {
  const args = parseArgs()
  const manifestPath = normalize(args.manifest)
  const manifest = manifestPath ? await readJson(manifestPath) : null
  const move = manifest ? findMove(manifest, args.legacy) : null
  const archivedExists = move ? await fileExists(move.to) : false
  const before = Number(manifest?.reduction?.beforeCount || 0)
  const after = Number(manifest?.reduction?.afterCount || 0)
  const ok = Boolean(manifest && move && archivedExists && after > 0 && after < before)
  const result = {
    ok,
    status: ok ? 'healthy' : 'blocked',
    manifestPath: manifestPath || null,
    legacy: args.legacy || null,
    archivedTo: move?.to || null,
    reduction: manifest?.reduction || null,
    checks: [
      {
        ok: Boolean(manifest),
        check: 'archive manifest is readable',
        detail: manifestPath || 'missing --manifest',
      },
      {
        ok: Boolean(move),
        check: 'legacy process check is recorded in archive manifest',
        detail: args.legacy || 'missing --legacy',
      },
      {
        ok: archivedExists,
        check: 'archived legacy process check exists',
        detail: move?.to || 'missing target',
      },
      {
        ok: after > 0 && after < before,
        check: 'active process check count went down',
        detail: `${before || 'unknown'} -> ${after || 'unknown'}`,
      },
    ],
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else console.log(`archived process check: ${result.status} ${args.legacy || ''}`)
  process.exitCode = ok ? 0 : 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
