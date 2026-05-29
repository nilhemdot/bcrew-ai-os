#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  AGENTIC_CODEBASE_MAP_CARD_ID,
  AGENTIC_CODEBASE_MAP_PLAN_PATH,
  AGENTIC_CODEBASE_MAP_SCRIPT_PATH,
  buildAgenticCodebaseMap,
  buildAgenticCodebaseMapDogfoodProof,
  evaluateAgenticCodebaseMap,
} from '../lib/agentic-codebase-map.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

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

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    planSource,
    moduleSource,
    scriptSource,
    understandAnythingNote,
    existingMapHandoff,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(AGENTIC_CODEBASE_MAP_PLAN_PATH),
    readRepoFile('lib/agentic-codebase-map.js'),
    readRepoFile(AGENTIC_CODEBASE_MAP_SCRIPT_PATH),
    readRepoFile('docs/source-notes/understand-anything-repo-eval-2026-05-28.md'),
    readRepoFile('docs/handoffs/2026-05-28-agentic-codebase-map.md'),
  ])
  const map = await buildAgenticCodebaseMap({ repoRoot })
  const evaluation = evaluateAgenticCodebaseMap(map)
  const dogfood = buildAgenticCodebaseMapDogfoodProof()
  const combinedSource = `${moduleSource}\n${scriptSource}`

  addCheck(
    checks,
    packageJson.scripts?.['process:agentic-codebase-map-check'] === `node --env-file-if-exists=.env ${AGENTIC_CODEBASE_MAP_SCRIPT_PATH}`,
    'package exposes agentic codebase map proof',
    packageJson.scripts?.['process:agentic-codebase-map-check'] || 'missing',
  )
  addCheck(checks, evaluation.ok, 'live repo map passes safety/usefulness evaluation', evaluation.failed.map(failure => failure.check).join(', ') || map.summary.fileCount)
  addCheck(checks, dogfood.ok, 'dogfood rejects private/local leaks and missing critical surfaces', dogfood.invariant)
  addCheck(checks, map.privacy?.includedPrivatePathCount === 0 && map.privacy?.archiveIncluded === false, 'map excludes private memory, local runtime, archive, and conversation exports', JSON.stringify(map.privacy))
  addCheck(checks, map.summary?.criticalSurfacePresentCount === map.summary?.criticalSurfaceCount, 'critical source/extractor/runtime surfaces are included', `${map.summary?.criticalSurfacePresentCount}/${map.summary?.criticalSurfaceCount}`)
  addCheck(checks, map.summary?.sizeRiskCount >= 1, 'map exposes oversized files for future split work', `${map.summary?.sizeRiskCount} risks`)
  addCheck(checks, map.scripts?.sourceScripts?.includes('source:browser-agent') && map.scripts?.sourceScripts?.includes('source:local-browser-hands'), 'source-browser commands are visible to future agents', map.scripts?.sourceScripts?.filter(key => key.startsWith('source:')).join(', '))
  addCheck(checks, understandAnythingNote.includes('do not install the plugin directly') && understandAnythingNote.includes('AIOS-owned `repo-map` lane'), 'Understand-Anything eval is adopted as bounded repo-map guidance, not direct install', 'docs/source-notes/understand-anything-repo-eval-2026-05-28.md')
  addCheck(checks, existingMapHandoff.includes('Source Browser Agent') && existingMapHandoff.includes('Common Proof Commands'), 'existing agentic codebase handoff remains the human-readable quick map', 'docs/handoffs/2026-05-28-agentic-codebase-map.md')
  addCheck(checks, planSource.includes('no third-party plugin install') && planSource.includes('private/local files'), 'plan preserves no-install and privacy boundaries', AGENTIC_CODEBASE_MAP_PLAN_PATH)
  addCheck(checks, !/fs\.writeFile|symlink|npm\s+install|pnpm\s+install|child_process|spawn\(/.test(moduleSource), 'repo-map module has no install, symlink, subprocess, or write path', 'read-only scanner')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: AGENTIC_CODEBASE_MAP_CARD_ID,
    reportOnly: true,
    writesBacklog: false,
    writesExternalSystems: false,
    mapSummary: map.summary,
    topSizeRisks: map.sizeRisks.slice(0, 12).map(file => ({
      path: file.path,
      lines: file.lines,
      sizeRisk: file.sizeRisk,
      surface: file.surface,
    })),
    scripts: {
      sourceScripts: map.scripts.sourceScripts,
      extractionScripts: map.scripts.extractionScripts.slice(0, 30),
    },
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Agentic codebase map check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
