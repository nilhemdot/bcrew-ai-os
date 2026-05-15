export const VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID = 'VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001'
export const VERIFIER_HEALTH_SCRIPT_MODULE_SPRINT_ID = 'verifier-health-script-module-split-2026-05-15'
export const VERIFIER_HEALTH_SCRIPT_MODULE_CLOSEOUT_KEY = 'verifier-health-script-module-split-v1'
export const VERIFIER_HEALTH_SCRIPT_MODULE_PLAN_PATH = 'docs/process/verifier-health-script-module-split-001-plan.md'
export const VERIFIER_HEALTH_SCRIPT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001.json'
export const VERIFIER_HEALTH_SCRIPT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-health-script-module-check.mjs'
export const VERIFIER_HEALTH_SCRIPT_MODULE_HANDOFF_PATH = 'docs/handoffs/2026-05-15-verifier-health-script-module-split-closeout.md'
export const VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES = 15517

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function parseSummaryLine(output = '', marker = '') {
  const line = String(output || '').split('\n').find(lineValue => lineValue.startsWith(`${marker} `))
  if (!line) return null
  try {
    return JSON.parse(line.replace(`${marker} `, ''))
  } catch {
    return null
  }
}

function lastLines(output = '', count = 2) {
  return String(output || '').split('\n').filter(Boolean).slice(-count).join(' | ')
}

function filterLines(output = '', pattern) {
  return String(output || '').split('\n').filter(lineValue => pattern.test(lineValue)).join(' | ')
}

export function evaluateFoundationHealthScriptVerifier({
  outputs = {},
  foundationHub = {},
  foundationHubFull = {},
  expectedKpiTables = [],
  expectedKpiRpcs = [],
} = {}) {
  const checks = []
  const googleHealth = String(outputs.googleHealth || '')
  const fubHealth = String(outputs.fubHealth || '')
  const kpiHealth = String(outputs.kpiHealth || '')
  const backlogHygieneOutput = String(outputs.backlogHygieneOutput || '')
  const clickUpVerifyResult = outputs.clickUpVerifyResult || {}
  const clickUpVerify = String(clickUpVerifyResult.output || '')
  const sheetVerify = String(outputs.sheetVerify || '')

  const kpiHealthSummary = parseSummaryLine(kpiHealth, 'KPI_HEALTH_SUMMARY')
  const backlogHygieneSummary = parseSummaryLine(backlogHygieneOutput, 'BACKLOG_HYGIENE_SUMMARY')
  const clickUpVerifyHealthy = clickUpVerifyResult.ok === true &&
    clickUpVerify.includes('ClickUp source verification') &&
    clickUpVerify.includes('dealDataEntry:') &&
    clickUpVerify.includes('agentRoster:') &&
    clickUpVerify.includes('agentPipeline:') &&
    clickUpVerify.includes('Summary: 12/12 checks passed')
  const clickUpExternalOutage = clickUpVerifyResult.ok !== true &&
    /(returned 5\d\d|returned 429|rate limit|timed out|timeout|Internal Server Error|ACCESS_991|DB_003|ECODE|CLICKUP_SOURCE_VERIFY_SUMMARY)/i.test(clickUpVerify)
  const clickUpDegradedAccepted = clickUpExternalOutage &&
    Boolean(foundationHub.sourceOutageBoundary?.status) &&
    Number(foundationHubFull.foundationOperatingReliability?.connectorUptime?.summary?.degradedCount || 0) >= 1

  addCheck(
    checks,
    googleHealth.includes('Spreadsheet access: OK') && googleHealth.includes('Delegated access is ready'),
    'google:health passes',
    lastLines(googleHealth),
  )
  addCheck(
    checks,
    fubHealth.includes('Context: Support / Owner account (owner)') &&
      fubHealth.includes('Context: Steve account (steve)') &&
      fubHealth.includes('Status: ok'),
    'fub:health passes for both configured contexts',
    filterLines(fubHealth, /Context:|Status:/),
  )
  addCheck(
    checks,
    kpiHealth.includes('KPI Supabase health') &&
      kpiHealth.includes('Status:') &&
      kpiHealth.includes('KPI_HEALTH_SUMMARY') &&
      kpiHealthSummary?.tableCount === expectedKpiTables.length &&
      kpiHealthSummary?.rpcCount === expectedKpiRpcs.length &&
      kpiHealthSummary?.probeSilent === false &&
      kpiHealthSummary?.schemaDriftStatus === 'healthy' &&
      kpiHealthSummary?.status !== 'risk',
    'kpi:health passes for load-bearing KPI tables/RPCs',
    filterLines(kpiHealth, /^(  Status|  Tables|  RPCs|KPI_HEALTH_SUMMARY)/),
  )
  addCheck(
    checks,
    backlogHygieneOutput.includes('Backlog hygiene') &&
      backlogHygieneOutput.includes('SYNTHETIC-STALE-EXECUTING-001') &&
      backlogHygieneOutput.includes('stale_executing_card') &&
      backlogHygieneOutput.includes('BACKLOG_HYGIENE_SUMMARY') &&
      backlogHygieneSummary?.syntheticFindings >= 1 &&
      backlogHygieneSummary?.criticalFindings === 0 &&
      backlogHygieneSummary?.staleExecutingDays === 3,
    'backlog:hygiene proves the synthetic stale-card detector',
    backlogHygieneSummary
      ? `status=${backlogHygieneSummary.status} / synthetic=${backlogHygieneSummary.syntheticFindings} / critical=${backlogHygieneSummary.criticalFindings} / threshold=${backlogHygieneSummary.staleExecutingDays}`
      : 'missing BACKLOG_HYGIENE_SUMMARY',
  )
  addCheck(
    checks,
    clickUpVerifyHealthy || clickUpDegradedAccepted,
    'clickup:verify passes or reports a governed ClickUp vendor outage as degraded source health',
    clickUpVerifyHealthy
      ? filterLines(clickUpVerify, /^(dealDataEntry|agentRoster|agentPipeline|Summary):/)
      : `degraded=${clickUpExternalOutage ? 'yes' : 'no'} sourceBoundary=${foundationHub.sourceOutageBoundary?.status || 'missing'} output=${lastLines(clickUpVerify)}`,
  )
  addCheck(
    checks,
    sheetVerify.includes('Sheet structure verification passed.'),
    'sheets:verify passes',
    lastLines(sheetVerify),
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      clickUpVerifyHealthy,
      clickUpExternalOutage,
      clickUpDegradedAccepted,
    },
    checks,
    failed,
    artifacts: {
      kpiHealthSummary,
      backlogHygieneSummary,
    },
  }
}

function healthyOutputs() {
  return {
    googleHealth: 'Google delegated health\nSpreadsheet access: OK\nDelegated access is ready\n',
    fubHealth: 'Context: Support / Owner account (owner)\nStatus: ok\nContext: Steve account (steve)\nStatus: ok\n',
    kpiHealth: [
      'KPI Supabase health',
      '  Status: healthy',
      '  Tables: 2',
      '  RPCs: 1',
      'KPI_HEALTH_SUMMARY {"status":"healthy","tableCount":2,"rpcCount":1,"probeSilent":false,"schemaDriftStatus":"healthy"}',
    ].join('\n'),
    backlogHygieneOutput: [
      'Backlog hygiene',
      'SYNTHETIC-STALE-EXECUTING-001 stale_executing_card',
      'BACKLOG_HYGIENE_SUMMARY {"status":"healthy","syntheticFindings":1,"criticalFindings":0,"staleExecutingDays":3}',
    ].join('\n'),
    clickUpVerifyResult: {
      ok: true,
      output: 'ClickUp source verification\ndealDataEntry: ok\nagentRoster: ok\nagentPipeline: ok\nSummary: 12/12 checks passed\n',
    },
    sheetVerify: 'Sheet structure verification passed.\n',
  }
}

export function buildFoundationHealthScriptVerifierDogfoodProof() {
  const expectedKpiTables = [{ table: 'agent_activity' }, { table: 'agent_scorecard' }]
  const expectedKpiRpcs = [{ rpc: 'get_agent_activity' }]
  const foundationHub = { sourceOutageBoundary: { status: 'healthy' } }
  const foundationHubFull = {
    foundationOperatingReliability: {
      connectorUptime: {
        summary: { degradedCount: 0 },
      },
    },
  }
  const healthy = evaluateFoundationHealthScriptVerifier({
    outputs: healthyOutputs(),
    foundationHub,
    foundationHubFull,
    expectedKpiTables,
    expectedKpiRpcs,
  })
  const missingGoogleDelegated = evaluateFoundationHealthScriptVerifier({
    outputs: { ...healthyOutputs(), googleHealth: 'Google delegated health\nSpreadsheet access: OK\n' },
    foundationHub,
    foundationHubFull,
    expectedKpiTables,
    expectedKpiRpcs,
  })
  const riskyKpi = evaluateFoundationHealthScriptVerifier({
    outputs: {
      ...healthyOutputs(),
      kpiHealth: 'KPI Supabase health\n  Status: risk\nKPI_HEALTH_SUMMARY {"status":"risk","tableCount":2,"rpcCount":1,"probeSilent":false,"schemaDriftStatus":"healthy"}',
    },
    foundationHub,
    foundationHubFull,
    expectedKpiTables,
    expectedKpiRpcs,
  })
  const missingBacklogSynthetic = evaluateFoundationHealthScriptVerifier({
    outputs: {
      ...healthyOutputs(),
      backlogHygieneOutput: 'Backlog hygiene\nBACKLOG_HYGIENE_SUMMARY {"status":"healthy","syntheticFindings":0,"criticalFindings":0,"staleExecutingDays":3}',
    },
    foundationHub,
    foundationHubFull,
    expectedKpiTables,
    expectedKpiRpcs,
  })
  const clickUpVendorOutageAccepted = evaluateFoundationHealthScriptVerifier({
    outputs: {
      ...healthyOutputs(),
      clickUpVerifyResult: {
        ok: false,
        output: 'ClickUp source verification returned 500 Internal Server Error\n',
      },
    },
    foundationHub: { sourceOutageBoundary: { status: 'degraded' } },
    foundationHubFull: {
      foundationOperatingReliability: {
        connectorUptime: {
          summary: { degradedCount: 1 },
        },
      },
    },
    expectedKpiTables,
    expectedKpiRpcs,
  })
  const clickUpHardFailure = evaluateFoundationHealthScriptVerifier({
    outputs: {
      ...healthyOutputs(),
      clickUpVerifyResult: {
        ok: false,
        output: 'ClickUp source verification failed because parser broke without vendor outage markers\n',
      },
    },
    foundationHub,
    foundationHubFull,
    expectedKpiTables,
    expectedKpiRpcs,
  })
  const brokenSheets = evaluateFoundationHealthScriptVerifier({
    outputs: { ...healthyOutputs(), sheetVerify: 'Sheet structure verification failed.\n' },
    foundationHub,
    foundationHubFull,
    expectedKpiTables,
    expectedKpiRpcs,
  })
  const ok = healthy.ok === true &&
    missingGoogleDelegated.ok === false &&
    riskyKpi.ok === false &&
    missingBacklogSynthetic.ok === false &&
    clickUpVendorOutageAccepted.ok === true &&
    clickUpHardFailure.ok === false &&
    brokenSheets.ok === false
  return {
    ok,
    invariant: 'Health-script verifier module accepts healthy outputs and governed ClickUp vendor outages, while rejecting missing delegated Google health, risky KPI, missing backlog dogfood, hard ClickUp failure, and broken Sheets output.',
    healthy,
    missingGoogleDelegated,
    riskyKpi,
    missingBacklogSynthetic,
    clickUpVendorOutageAccepted,
    clickUpHardFailure,
    brokenSheets,
  }
}
