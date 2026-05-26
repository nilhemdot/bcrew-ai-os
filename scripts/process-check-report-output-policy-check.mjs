#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PROCESS_CHECK_REPORT_OUTPUT_POLICY_CARD_ID,
  PROCESS_CHECK_REPORT_OUTPUT_POLICY_SCRIPT_PATH,
  buildSyntheticProcessCheckReportOutputPolicyProof,
  scanProcessCheckReportOutputPolicy,
} from '../lib/process-check-report-output-policy.js'
import {
  buildCodeQualityNightlyAudit,
} from '../lib/code-quality-nightly-audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const EXPECTED_RISK_PATHS = [
  'scripts/process-build-intel-extraction-check.mjs',
  'scripts/process-code-quality-nightly-audit-check.mjs',
  'scripts/process-foundation-deep-merge-audit-check.mjs',
  'scripts/process-gstack-build-intel-check.mjs',
  'scripts/process-nightly-deep-audit-upgrade-check.mjs',
  'scripts/process-old-system-research-team-harvest-check.mjs',
  'scripts/process-research-lane-purge-check.mjs',
]

const EXPECTED_PROTECTED_PATHS = [
  'scripts/process-build-intel-source-value-grader-check.mjs',
  'scripts/process-source-maturity-atom-flow-repair-check.mjs',
  'scripts/process-youtube-latest-20-full-watch-runner-check.mjs',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function findingPaths(findings = []) {
  return new Set(findings.flatMap(finding =>
    (finding.refs || []).map(ref => ref.path).filter(Boolean)
  ))
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []
  const synthetic = buildSyntheticProcessCheckReportOutputPolicyProof()
  const scan = await scanProcessCheckReportOutputPolicy({ repoRoot })
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const auditSource = await readRepoFile('lib/code-quality-nightly-audit.js')
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const reportPolicyFindings = (audit.findings || []).filter(finding =>
    finding.proposedCard === PROCESS_CHECK_REPORT_OUTPUT_POLICY_CARD_ID
  )
  const reportPolicyFindingPaths = findingPaths(reportPolicyFindings)
  const protectedPathSet = new Set((scan.protectedRows || []).map(row => row.relativePath))
  const protectedFalsePositives = reportPolicyFindings.filter(finding =>
    (finding.refs || []).some(ref => protectedPathSet.has(ref.path))
  )
  const riskPathSet = new Set((scan.riskRows || []).map(row => row.relativePath))
  const missingExpectedRiskPaths = EXPECTED_RISK_PATHS.filter(relativePath => !riskPathSet.has(relativePath))
  const missingExpectedProtectedPaths = EXPECTED_PROTECTED_PATHS.filter(relativePath => !protectedPathSet.has(relativePath))
  const missingAuditRiskRows = (scan.riskRows || []).filter(row => !reportPolicyFindingPaths.has(row.relativePath))

  addCheck(checks, synthetic.ok === true, 'synthetic classifier proof catches guarded and unguarded fixtures', JSON.stringify({
    unguarded: synthetic.fixtures?.unguarded?.classification,
    guardedReportOutput: synthetic.fixtures?.guardedReportOutput?.classification,
    guardedProcessWrite: synthetic.fixtures?.guardedProcessWrite?.classification,
    defaultNoWriteOptout: synthetic.fixtures?.defaultNoWriteOptout?.classification,
    legacyApplyGate: synthetic.fixtures?.legacyApplyGate?.classification,
  }))
  addCheck(checks, packageJson.scripts?.['process:process-check-report-output-policy-check']?.includes(PROCESS_CHECK_REPORT_OUTPUT_POLICY_SCRIPT_PATH), 'package script exposes focused report-output policy proof', packageJson.scripts?.['process:process-check-report-output-policy-check'] || 'missing')
  addCheck(checks, auditSource.includes('buildProcessCheckReportOutputPolicyFindingInput') && auditSource.includes('PROCESS_CHECK_REPORT_OUTPUT_POLICY_CARD_ID'), 'code-quality audit delegates report-output classification to shared policy module', 'lib/code-quality-nightly-audit.js')
  addCheck(checks, scan.fileWriterCount >= 70, 'scanner covers the broad process-check report writer surface', `${scan.fileWriterCount} file-writing process checks`)
  addCheck(checks, scan.protectedWriterCount >= 50, 'classifier preserves already-guarded process-check writers', `${scan.protectedWriterCount} protected writers`)
  addCheck(checks, scan.riskCount >= EXPECTED_RISK_PATHS.length && scan.riskCount <= 12, 'classifier reduces report-output risk list to a focused actionable set', `${scan.riskCount} risk rows`)
  addCheck(checks, missingExpectedRiskPaths.length === 0, 'known risky report writers remain red', missingExpectedRiskPaths.join(', ') || 'all expected risky writers red')
  addCheck(checks, missingExpectedProtectedPaths.length === 0, 'known guarded writers stay green', missingExpectedProtectedPaths.join(', ') || 'all expected protected writers green')
  addCheck(checks, protectedFalsePositives.length === 0, 'code-quality audit does not flag protected report writers', protectedFalsePositives.map(finding => finding.refs?.[0]?.path).join(', ') || 'none')
  addCheck(checks, missingAuditRiskRows.length === 0, 'code-quality audit reports every classifier risk row', missingAuditRiskRows.map(row => row.relativePath).join(', ') || 'all risk rows surfaced')
  addCheck(checks, reportPolicyFindings.length === scan.riskCount, 'code-quality report-output findings match classifier risk count', `${reportPolicyFindings.length}/${scan.riskCount}`)
  addCheck(checks, audit.reportOnly === true && audit.writesBacklog === false && audit.autoFixes === false, 'code-quality audit remains report-only', `reportOnly=${audit.reportOnly} writesBacklog=${audit.writesBacklog} autoFixes=${audit.autoFixes}`)

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: PROCESS_CHECK_REPORT_OUTPUT_POLICY_CARD_ID,
    scriptPath: PROCESS_CHECK_REPORT_OUTPUT_POLICY_SCRIPT_PATH,
    summary: {
      totalProcessCheckScripts: scan.totalProcessCheckScripts,
      fileWriterCount: scan.fileWriterCount,
      protectedWriterCount: scan.protectedWriterCount,
      riskCount: scan.riskCount,
      auditReportPolicyFindingCount: reportPolicyFindings.length,
      byClassification: scan.byClassification,
    },
    riskRows: scan.riskRows.map(row => ({
      relativePath: row.relativePath,
      classification: row.classification,
      writeLines: row.writeLines,
      reason: row.reason,
    })),
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Process-check report-output policy check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  process.exitCode = failures.length ? 1 : 0
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
