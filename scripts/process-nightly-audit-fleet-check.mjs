#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  NIGHTLY_AUDIT_FLEET_CARD_ID,
  NIGHTLY_AUDIT_FLEET_JOB_KEY,
  NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME,
  NIGHTLY_AUDIT_FLEET_SCRIPT_PATH,
  buildNightlyAuditFleetDogfoodProof,
  buildNightlyAuditFleetRegistry,
  buildNightlyAuditFleetRollupStatus,
  evaluateNightlyAuditFleetRegistry,
} from '../lib/nightly-audit-fleet.js'
import {
  getFoundationJobDefinition,
} from '../lib/foundation-jobs.js'

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
  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    backlogSeedSource,
    currentPlanSource,
    foundationJobsSource,
    allowlistSource,
    systemHealthSource,
    systemHealthScriptSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/nightly-audit-fleet.js'),
    readRepoFile(NIGHTLY_AUDIT_FLEET_SCRIPT_PATH),
    readRepoFile('docs/process/nightly-audit-fleet-001-plan.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('lib/foundation-jobs.js'),
    readRepoFile('lib/foundation-job-mutation-allowlist.js'),
    readRepoFile('lib/foundation-system-health.js'),
    readRepoFile('scripts/process-system-health-nightly-audit-check.mjs'),
  ])
  const registry = buildNightlyAuditFleetRegistry()
  const evaluation = evaluateNightlyAuditFleetRegistry(registry)
  const dogfood = buildNightlyAuditFleetDogfoodProof()
  const jobDefinition = getFoundationJobDefinition(NIGHTLY_AUDIT_FLEET_JOB_KEY)
  const rollup = buildNightlyAuditFleetRollupStatus({ registry, job: jobDefinition })

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
    jobDefinition?.key === NIGHTLY_AUDIT_FLEET_JOB_KEY &&
      jobDefinition.runtimeMode === 'scheduled' &&
      jobDefinition.scheduleLocalTime === NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME &&
      jobDefinition.mutationPosture === 'read_only' &&
      jobDefinition.scheduleMutationGuard?.ok === true,
    'audit fleet is registered as scheduled read-only job before System Health',
    jobDefinition ? `${jobDefinition.runtimeMode}/${jobDefinition.scheduleLocalTime}/${jobDefinition.mutationPosture}/${jobDefinition.scheduleMutationGuard?.ok ? 'guard-ok' : 'guard-blocked'}` : 'missing job',
  )
  addCheck(
    checks,
    includesAll(foundationJobsSource, [
      NIGHTLY_AUDIT_FLEET_JOB_KEY,
      'process:nightly-audit-fleet-check',
      'Scheduled registry proof only',
    ]) &&
      allowlistSource.includes("'nightly-audit-fleet': allowScheduled('read_only'"),
    'job registry and mutation allowlist permit only scheduled read-only audit-fleet proof',
    'lib/foundation-jobs.js + lib/foundation-job-mutation-allowlist.js',
  )
  addCheck(
    checks,
    rollup.ok === true &&
      rollup.laneCount >= 8 &&
      rollup.hardcodedTruthLanePresent === true &&
      rollup.reportOnly === true,
    'rollup status proves scheduled registry, lane coverage, and report-only posture',
    JSON.stringify({ status: rollup.status, lanes: rollup.laneCount, failures: rollup.failures }),
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
      '03:05',
      'System Health',
    ]),
    'plan captures audit fleet boundaries, hardcoded-truth lane, and morning rollup schedule',
    'docs/process/nightly-audit-fleet-001-plan.md',
  )
  addCheck(
    checks,
    includesAll(backlogSeedSource, [
      NIGHTLY_AUDIT_FLEET_CARD_ID,
      'hardcoded truth/runtime config',
      'process:nightly-audit-fleet-check',
      '03:05',
      'system-health',
    ]),
    'backlog seed points nightly audit fleet at focused proof and scheduled rollup',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    currentPlanSource.includes('NIGHTLY-AUDIT-FLEET-001') &&
      currentPlanSource.includes('hardcoded truth/runtime config') &&
      currentPlanSource.includes('03:05'),
    'current plan keeps hardcoded-truth audit fleet in sprint support order with 03:05 rollup',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    includesAll(systemHealthSource, [
      'buildNightlyAuditFleetRollupStatus',
      'auditFleet',
      'nightly_audit_fleet_rollup',
      'auditFleetLaneCount',
    ]) &&
      includesAll(systemHealthScriptSource, [
        NIGHTLY_AUDIT_FLEET_JOB_KEY,
        'systemHealth.auditFleet',
        'hardcodedTruthLanePresent',
      ]),
    'System Health rolls audit fleet into morning JSON/markdown and proof checks',
    'lib/foundation-system-health.js + scripts/process-system-health-nightly-audit-check.mjs',
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
