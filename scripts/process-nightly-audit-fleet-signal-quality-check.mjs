#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL,
  meetsApprovalThreshold,
} from '../lib/approval-threshold-registry.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getBacklogItemsByIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_SCRIPT_PATH,
  NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_APPROVAL_PATH,
  NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CARD_ID,
  NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CLOSEOUT_KEY,
  NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_HANDOFF_PATH,
  NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_PLAN_PATH,
  NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_SCRIPT_PATH,
  buildNightlyAuditFleetRuntimeScan,
  buildNightlyAuditFleetSignalQualityProof,
} from '../lib/nightly-audit-fleet-runtime-scan.js'

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
    signalScriptSource,
    runtimeScriptSource,
    baseFleetScriptSource,
    seedSource,
    coverageSource,
    closeoutSource,
    planSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_APPROVAL_PATH,
      cardId: NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CARD_ID,
    }),
    getBacklogItemsByIds([NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CARD_ID]),
    readRepoFile('lib/nightly-audit-fleet-runtime-scan.js'),
    readRepoFile(NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_SCRIPT_PATH),
    readRepoFile(NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_SCRIPT_PATH),
    readRepoFile('scripts/process-nightly-audit-fleet-check.mjs'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-control-plane-records.js'),
    readRepoFile(NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_PLAN_PATH),
  ])

  const scan = await buildNightlyAuditFleetRuntimeScan({ repoRoot })
  const proof = buildNightlyAuditFleetSignalQualityProof()
  const closeout = getFoundationBuildCloseouts().find(item => item.key === NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CLOSEOUT_KEY)
  const card = backlogRows.find(item => item.id === NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CARD_ID)
  const activeFindings = scan.activeFindings || []
  const activeRefs = activeFindings.map(finding => finding.evidenceRefs?.[0] || '')
  const evidenceOnlyActive = activeRefs.filter(ref =>
    ref.startsWith('lib/foundation-backlog-seed-chunks/') ||
      ref.startsWith('lib/foundation-build-closeout-') ||
      ref.startsWith('lib/foundation-verify-coverage-card-ids.js') ||
      ref.startsWith('lib/nightly-audit-fleet-runtime-scan.js')
  )

  addCheck(
    checks,
    approval.ok && meetsApprovalThreshold(approval.approval?.score),
    `approval file is valid at ${APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL}`,
    approval.failures?.map(item => item.check).join(', ') || NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_APPROVAL_PATH,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:nightly-audit-fleet-signal-quality-check'] === `node --env-file-if-exists=.env ${NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_SCRIPT_PATH}`,
    'package exposes focused signal-quality proof',
    packageJson.scripts?.['process:nightly-audit-fleet-signal-quality-check'] || 'missing',
  )
  addCheck(
    checks,
    card?.lane === 'done' && card?.priority === 'P0',
    'live backlog exposes signal-quality continuation card as done P0',
    card ? `${card.lane}/${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      'buildRuntimeModelLiteralPolicyFindingInput',
      'classifyProcessCheckSource',
      'buildProcessCheckReportOutputPolicyFindingInput',
      'isEvidenceOnlyRuntimePath',
      'isAuditProofFixturePath',
      'buildNightlyAuditFleetSignalQualityProof',
    ]),
    'runtime scan reuses shared model/process classifiers and proof-fixture boundaries',
    'lib/nightly-audit-fleet-runtime-scan.js',
  )
  addCheck(
    checks,
    includesAll(runtimeScriptSource, [
      'buildNightlyAuditFleetRuntimeScanDogfoodProof',
      'focused proof does not browse/fetch/write',
    ]),
    'existing runtime-scan proof remains intact',
    NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_SCRIPT_PATH,
  )
  addCheck(
    checks,
    includesAll(baseFleetScriptSource, [
      'buildNightlyAuditFleetRuntimeScan',
      'runtimeScan',
    ]),
    'base nightly audit fleet still consumes runtime scan output',
    'scripts/process-nightly-audit-fleet-check.mjs',
  )
  addCheck(
    checks,
    proof.ok === true,
    'signal-quality dogfood catches evidence-only false positives while preserving real active regressions',
    JSON.stringify(proof.cases || []),
  )
  addCheck(
    checks,
    evidenceOnlyActive.length === 0,
    'real scan does not page seed/closeout/verifier/proof fixtures as active findings',
    evidenceOnlyActive.slice(0, 10).join(', ') || 'none',
  )
  addCheck(
    checks,
    scan.summary?.activeFindingCount < 160 &&
      scan.summary?.ownedSignalCount > scan.summary?.activeFindingCount,
    'real scan is sharper after classifier reuse',
    JSON.stringify(scan.summary || {}),
  )
  addCheck(
    checks,
    scan.reportOnly === true &&
      scan.readOnly === true &&
      scan.autoFix === false &&
      scan.writesBacklog === false &&
      scan.externalWrites === false,
    'signal-quality scan stays report-only/read-only/no-auto',
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
    !/fs\.writeFile|fs\.appendFile|globalThis\.fetch|chromium\.launch/.test(signalScriptSource),
    'focused signal-quality proof does not browse/fetch/write',
    NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_SCRIPT_PATH,
  )
  addCheck(
    checks,
    includesAll(planSource, [
      'signal quality',
      'evidence-only',
      'shared model literal classifier',
      'process-write classifier',
      'report-only',
    ]),
    'plan captures signal-quality scope and no-auto boundaries',
    NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_PLAN_PATH,
  )
  addCheck(
    checks,
    includesAll(seedSource, [
      NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CARD_ID,
      'signal-quality',
      'process:nightly-audit-fleet-signal-quality-check',
    ]),
    'backlog seed includes signal-quality card and proof command',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    coverageSource.includes(NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CARD_ID),
    'verifier coverage card list includes signal-quality card',
    'lib/foundation-verify-coverage-card-ids.js',
  )
  addCheck(
    checks,
    closeout?.operatorCloseout === true &&
      closeoutSource.includes(NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CLOSEOUT_KEY) &&
      closeoutSource.includes(NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_HANDOFF_PATH),
    'closeout registry resolves signal-quality closeout',
    closeout?.key || 'missing',
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CARD_ID,
    closeoutKey: NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CLOSEOUT_KEY,
    scanStatus: scan.scanStatus,
    summary: scan.summary,
    evidenceOnlyActiveCount: evidenceOnlyActive.length,
    activeFindings: activeFindings.slice(0, 20),
    proof,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Nightly audit fleet signal-quality check: ${result.status}`)
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
