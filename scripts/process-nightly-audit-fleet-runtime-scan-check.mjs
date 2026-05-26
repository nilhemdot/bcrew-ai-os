#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
  initFoundationDb,
} from '../lib/foundation-db.js'
import {
  NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_APPROVAL_PATH,
  NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CARD_ID,
  NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CLOSEOUT_KEY,
  NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_HANDOFF_PATH,
  NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_PLAN_PATH,
  NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_SCRIPT_PATH,
  buildNightlyAuditFleetRuntimeScan,
  buildNightlyAuditFleetRuntimeScanDogfoodProof,
} from '../lib/nightly-audit-fleet-runtime-scan.js'
import {
  APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL,
  meetsApprovalThreshold,
} from '../lib/approval-threshold-registry.js'

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

  await initFoundationDb()

  const [
    packageJson,
    approval,
    backlogRows,
    moduleSource,
    runtimeScriptSource,
    fleetScriptSource,
    seedSource,
    coverageSource,
    closeoutSource,
    planSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_APPROVAL_PATH,
      cardId: NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CARD_ID,
    }),
    getBacklogItemsByIds([NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CARD_ID]),
    readRepoFile('lib/nightly-audit-fleet-runtime-scan.js'),
    readRepoFile(NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_SCRIPT_PATH),
    readRepoFile('scripts/process-nightly-audit-fleet-check.mjs'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-control-plane-records.js'),
    readRepoFile(NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_PLAN_PATH),
  ])

  const scan = await buildNightlyAuditFleetRuntimeScan({ repoRoot })
  const dogfood = buildNightlyAuditFleetRuntimeScanDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(item => item.key === NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CLOSEOUT_KEY)
  const card = backlogRows.find(item => item.id === NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CARD_ID)
  const activeFindings = scan.activeFindings || []

  addCheck(
    checks,
    approval.ok && meetsApprovalThreshold(approval.approval?.score),
    `approval file is valid at ${APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL}`,
    approval.failures?.map(item => item.check).join(', ') || NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_APPROVAL_PATH,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:nightly-audit-fleet-runtime-scan-check'] === `node --env-file-if-exists=.env ${NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_SCRIPT_PATH}`,
    'package exposes focused runtime-scan proof',
    packageJson.scripts?.['process:nightly-audit-fleet-runtime-scan-check'] || 'missing',
  )
  addCheck(
    checks,
    card?.lane === 'done' && card?.priority === 'P0',
    'live backlog exposes runtime-scan continuation card as done P0',
    card ? `${card.lane}/${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      'scanHardcodedTruthRuntimeConfig',
      'scanProcessWriteBoundaries',
      'scanMissionDoctrineAlignment',
      'buildNightlyAuditFleetRuntimeScan',
      'buildNightlyAuditFleetRuntimeScanDogfoodProof',
    ]),
    'runtime scan module owns hardcoded/process/mission scanners and dogfood',
    'lib/nightly-audit-fleet-runtime-scan.js',
  )
  addCheck(
    checks,
    includesAll(fleetScriptSource, [
      'buildNightlyAuditFleetRuntimeScan',
      'runtimeScan',
      'hardcoded runtime scan executes deterministically',
    ]),
    'base nightly audit fleet proof consumes runtime scan output',
    'scripts/process-nightly-audit-fleet-check.mjs',
  )
  addCheck(
    checks,
    scan.reportOnly === true &&
      scan.readOnly === true &&
      scan.autoFix === false &&
      scan.writesBacklog === false &&
      scan.externalWrites === false,
    'runtime scan is report-only/read-only/no-auto',
    JSON.stringify({
      reportOnly: scan.reportOnly,
      readOnly: scan.readOnly,
      autoFix: scan.autoFix,
      writesBacklog: scan.writesBacklog,
      externalWrites: scan.externalWrites,
    }),
  )
  addCheck(
    checks,
    scan.registryOk === true &&
      scan.summary?.laneCount >= 8 &&
      scan.summary?.executedLaneCount >= 4 &&
      scan.lanePackets?.some(lane => lane.laneId === 'hardcoded_truth_runtime_config' && lane.status),
    'runtime scan executes hardcoded/process/mission/extractor lanes and packets the rest',
    JSON.stringify(scan.summary || {}),
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood catches unowned model literal, static UI truth, unguarded writes, and comment regression',
    JSON.stringify(dogfood.cases || []),
  )
  addCheck(
    checks,
    !/fs\.writeFile|fs\.appendFile|globalThis\.fetch|chromium\.launch/.test(runtimeScriptSource),
    'focused proof does not browse/fetch/write',
    NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_SCRIPT_PATH,
  )
  addCheck(
    checks,
    includesAll(planSource, [
      'hardcoded model',
      'static UI',
      'write-boundary',
      'operator-excluded comments',
      'report-only',
    ]),
    'plan captures runtime-scan scope and no-auto boundaries',
    NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_PLAN_PATH,
  )
  addCheck(
    checks,
    includesAll(seedSource, [
      NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CARD_ID,
      'deterministic runtime scan',
      'process:nightly-audit-fleet-runtime-scan-check',
    ]),
    'backlog seed includes runtime-scan card and proof command',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    coverageSource.includes(NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CARD_ID),
    'verifier coverage card list includes runtime-scan card',
    'lib/foundation-verify-coverage-card-ids.js',
  )
  addCheck(
    checks,
    closeout?.operatorCloseout === true &&
      closeoutSource.includes(NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CLOSEOUT_KEY) &&
      closeoutSource.includes(NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_HANDOFF_PATH),
    'closeout registry resolves runtime-scan closeout',
    closeout?.key || 'missing',
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CARD_ID,
    closeoutKey: NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CLOSEOUT_KEY,
    scanStatus: scan.scanStatus,
    summary: scan.summary,
    activeFindingCount: activeFindings.length,
    activeFindings: activeFindings.slice(0, 20),
    dogfood,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Nightly audit fleet runtime scan check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
