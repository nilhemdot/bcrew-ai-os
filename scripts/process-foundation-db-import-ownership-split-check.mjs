#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SCRIPT_PATH = 'scripts/process-foundation-db-import-ownership-split-check.mjs'
const PACKAGE_SCRIPT = 'process:foundation-db-import-ownership-split-check'
const DIRECT_IMPORT_LIMIT = 549

const DOMAIN_MODULES = [
  {
    path: 'lib/foundation-db-session.js',
    expectedExports: [
      'initFoundationDb',
      'closeFoundationDb',
      'assertFoundationDbReadyForReadOnlyGate',
      'withFoundationAdvisoryLock',
    ],
  },
  {
    path: 'lib/foundation-backlog-sprint-db.js',
    expectedExports: [
      'getActiveFoundationCurrentSprint',
      'getBacklogItemsByIds',
      'getPlanCriticRunsByCardIds',
      'upsertFoundationCurrentSprintOverlay',
    ],
  },
  {
    path: 'lib/foundation-intelligence-db.js',
    expectedExports: [
      'upsertIntelligenceReportArtifact',
      'getIntelligenceJobLedgerSnapshot',
      'searchIntelligenceEvidenceHybrid',
      'proposeActionRoutes',
    ],
  },
]

const MIGRATED_IMPORTERS = [
  {
    path: 'scripts/process-builder-memory-system-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-intelligence-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-tuneup-roadmap-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-db-store-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-backlog-store-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-current-sprint-split-module-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function listCodeFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.openclaw') continue
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await listCodeFiles(absolutePath, files)
      continue
    }
    if (/\.(m?js)$/.test(entry.name)) {
      files.push(path.relative(repoRoot, absolutePath))
    }
  }
  return files
}

async function directFoundationDbImportLines() {
  const files = [
    ...await listCodeFiles(path.join(repoRoot, 'lib')),
    ...await listCodeFiles(path.join(repoRoot, 'scripts')),
  ]
  const matches = []
  for (const file of files) {
    const source = await readRepoFile(file)
    const lines = source.split('\n')
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (
        !trimmed.includes('source.includes(') &&
        /from\s+['"](?:\.\.\/lib\/|\.\/)foundation-db\.js['"]/.test(trimmed)
      ) {
        matches.push({ file, line: index + 1, source: line.trim() })
      }
    })
  }
  return matches
}

async function importDomainModule(relativePath) {
  const moduleUrl = pathToFileURL(path.join(repoRoot, relativePath)).href
  return import(moduleUrl)
}

async function main() {
  const args = parseArgs()
  const checks = []
  let directImports = []
  const exportedByModule = {}

  try {
    const [packageJson, roadmapSource] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile('scripts/process-foundation-tuneup-roadmap-check.mjs'),
    ])

    addCheck(
      checks,
      packageJson.scripts?.[PACKAGE_SCRIPT] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`,
      'package exposes foundation-db import ownership proof',
      packageJson.scripts?.[PACKAGE_SCRIPT] || 'missing',
    )

    for (const domain of DOMAIN_MODULES) {
      const source = await readRepoFile(domain.path)
      const moduleExports = Object.keys(await importDomainModule(domain.path)).sort()
      exportedByModule[domain.path] = moduleExports
      addCheck(
        checks,
        source.includes("from './foundation-db.js'"),
        `${domain.path} is a transitional facade-backed domain target`,
        'keeps old facade stable while moving consumers',
      )
      addCheck(
        checks,
        domain.expectedExports.every(name => moduleExports.includes(name)),
        `${domain.path} exports required domain functions`,
        domain.expectedExports.join(', '),
      )
    }

    for (const importer of MIGRATED_IMPORTERS) {
      const source = await readRepoFile(importer.path)
      addCheck(
        checks,
        !source.includes("../lib/foundation-db.js") && !source.includes('"../lib/foundation-db.js"'),
        `${importer.path} no longer imports the foundation-db facade directly`,
        importer.expectedImports.join(', '),
      )
      addCheck(
        checks,
        importer.expectedImports.every(importPath => source.includes(importPath)),
        `${importer.path} imports the new domain target(s)`,
        importer.expectedImports.join(', '),
      )
    }

    directImports = await directFoundationDbImportLines()
    addCheck(
      checks,
      directImports.length <= DIRECT_IMPORT_LIMIT,
      'direct foundation-db facade import count did not grow',
      `${directImports.length} <= ${DIRECT_IMPORT_LIMIT}`,
    )
    addCheck(
      checks,
      MIGRATED_IMPORTERS.length >= 5,
      'first migration cluster covers at least five existing importers',
      `${MIGRATED_IMPORTERS.length} importers`,
    )
    addCheck(
      checks,
      await repoFileExists('scripts/codex-status.mjs'),
      'codex status live tool still exists',
      'scripts/codex-status.mjs',
    )
    addCheck(
      checks,
      roadmapSource.includes('Keep the foundation-db.js facade as a stable pass-through') &&
        roadmapSource.includes('MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001') &&
        roadmapSource.includes('/api/foundation/dev-team-hub'),
      'roadmap preserves facade, proof-lane, and dashboard guardrails',
      'scripts/process-foundation-tuneup-roadmap-check.mjs',
    )

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      directFoundationDbImportCount: directImports.length,
      directFoundationDbImportLimit: DIRECT_IMPORT_LIMIT,
      domainModules: DOMAIN_MODULES.map(domain => domain.path),
      migratedImporters: MIGRATED_IMPORTERS.map(importer => importer.path),
      exportedByModule,
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Foundation DB import ownership proof: ${result.status}`)
      console.log(`Direct facade imports: ${directImports.length}/${DIRECT_IMPORT_LIMIT}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error('Foundation DB import ownership proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
