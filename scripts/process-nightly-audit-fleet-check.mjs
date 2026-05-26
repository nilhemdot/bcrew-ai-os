#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  NIGHTLY_AUDIT_FLEET_CARD_ID,
  NIGHTLY_AUDIT_FLEET_SCRIPT_PATH,
  buildNightlyAuditFleetDogfoodProof,
  buildNightlyAuditFleetRegistry,
  evaluateNightlyAuditFleetRegistry,
} from '../lib/nightly-audit-fleet.js'

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

function includesAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, moduleSource, scriptSource, planSource, backlogSeedSource, currentPlanSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/nightly-audit-fleet.js'),
    readRepoFile(NIGHTLY_AUDIT_FLEET_SCRIPT_PATH),
    readRepoFile('docs/process/nightly-audit-fleet-001-plan.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('docs/rebuild/current-plan.md'),
  ])
  const registry = buildNightlyAuditFleetRegistry()
  const evaluation = evaluateNightlyAuditFleetRegistry(registry)
  const dogfood = buildNightlyAuditFleetDogfoodProof()

  addCheck(
    checks,
    packageJson.scripts?.['process:nightly-audit-fleet-check'] === `node --env-file-if-exists=.env ${NIGHTLY_AUDIT_FLEET_SCRIPT_PATH}`,
    'package exposes nightly audit fleet proof',
    packageJson.scripts?.['process:nightly-audit-fleet-check'] || 'missing',
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      'hardcoded_truth_runtime_config',
      'extractor_god_mode_parity',
      'synthesis_director_quality',
      'process_write_boundary',
      'mission_doctrine_alignment',
      'autoCreateBacklog: false',
      'autoFix: false',
    ]),
    'module defines required specialist lanes and no-auto boundaries',
    'lib/nightly-audit-fleet.js',
  )
  addCheck(
    checks,
    !/fs\.writeFile|fs\.appendFile|globalThis\.fetch|chromium\.launch/.test(scriptSource),
    'focused proof is read-only and does not browse/fetch/write',
    NIGHTLY_AUDIT_FLEET_SCRIPT_PATH,
  )
  addCheck(
    checks,
    evaluation.ok === true && registry.lanes.length >= 8,
    'registry evaluates healthy with at least 8 specialist lanes',
    `${registry.lanes.length} lanes`,
  )
  addCheck(
    checks,
    registry.lanes.some(lane => lane.laneId === 'hardcoded_truth_runtime_config' && lane.severityFloor === 'P1'),
    'hardcoded truth/runtime config auditor is present as P1 lane',
    'hardcoded_truth_runtime_config',
  )
  addCheck(
    checks,
    includesAll(planSource, [
      'Hardcoded Truth / Runtime Config Auditor',
      'report-only',
      'no-auto-fix',
      'no-auto',
      'LLM router',
    ]),
    'plan captures audit fleet boundaries and hardcoded-truth lane',
    'docs/process/nightly-audit-fleet-001-plan.md',
  )
  addCheck(
    checks,
    includesAll(backlogSeedSource, [
      NIGHTLY_AUDIT_FLEET_CARD_ID,
      'hardcoded truth/runtime config',
      'process:nightly-audit-fleet-check',
    ]),
    'backlog seed points nightly audit fleet at focused proof',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    currentPlanSource.includes('NIGHTLY-AUDIT-FLEET-001') &&
      currentPlanSource.includes('hardcoded truth/runtime config'),
    'current plan keeps hardcoded-truth audit fleet in sprint support order',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood proves missing hardcoded lane, auto-fix, unsafe LLM, and comment-regression guard failures',
    JSON.stringify(dogfood.cases.map(item => ({ name: item.name, ok: item.ok }))),
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: NIGHTLY_AUDIT_FLEET_CARD_ID,
    reportOnly: true,
    laneCount: registry.lanes.length,
    laneIds: registry.lanes.map(item => item.laneId),
    externalWrites: false,
    writesBacklog: false,
    autoFix: false,
    dogfood,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Nightly audit fleet check: ${output.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
