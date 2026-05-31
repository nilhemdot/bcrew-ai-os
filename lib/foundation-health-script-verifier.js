export const VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID = 'VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001'
export const VERIFIER_HEALTH_SCRIPT_MODULE_SPRINT_ID = 'verifier-health-script-module-split-2026-05-15'
export const VERIFIER_HEALTH_SCRIPT_MODULE_CLOSEOUT_KEY = 'verifier-health-script-module-split-v1'
export const VERIFIER_HEALTH_SCRIPT_MODULE_PLAN_PATH = 'docs/process/verifier-health-script-module-split-001-plan.md'
export const VERIFIER_HEALTH_SCRIPT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001.json'
export const VERIFIER_HEALTH_SCRIPT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-health-script-module-check.mjs'
export const VERIFIER_HEALTH_SCRIPT_MODULE_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-verifier-health-script-module-split-closeout.md'
export const VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES = 15517
export const GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_CLOSEOUT_KEY = 'google-delegated-health-gate-degrade-v1'
export const GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_PLAN_PATH = 'docs/process/google-delegated-health-gate-degrade-001-plan.md'
export const GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_APPROVAL_PATH = 'docs/process/approvals/GOOGLE-DELEGATED-HEALTH-GATE-DEGRADE-001.json'
export const GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_SCRIPT_PATH = 'scripts/process-google-delegated-health-gate-degrade-check.mjs'

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

function normalizeHealthResult(value, defaultOk = true) {
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'ok')) {
    return {
      ok: value.ok === true,
      output: String(value.output || ''),
    }
  }
  return {
    ok: Boolean(defaultOk),
    output: String(value || ''),
  }
}

function findConnectorUptimeRow(foundationHubFull = {}, key = '') {
  return (foundationHubFull.foundationOperatingReliability?.connectorUptime?.rows || [])
    .find(row => row?.key === key) || null
}

export function evaluateFoundationHealthScriptVerifier({
  outputs = {},
  foundationHub = {},
  foundationHubFull = {},
  expectedKpiTables = [],
  expectedKpiRpcs = [],
} = {}) {
  const checks = []
  const googleHealthResult = normalizeHealthResult(outputs.googleHealthResult || outputs.googleHealth)
  const googleHealth = googleHealthResult.output
  const googleServiceAccountHealthResult = normalizeHealthResult(
    outputs.googleServiceAccountHealthResult || outputs.googleServiceAccountHealth,
    false,
  )
  const googleServiceAccountHealth = googleServiceAccountHealthResult.output
  const fubHealth = String(outputs.fubHealth || '')
  const kpiHealth = String(outputs.kpiHealth || '')
  const backlogHygieneOutput = String(outputs.backlogHygieneOutput || '')
  const clickUpVerifyResult = outputs.clickUpVerifyResult || {}
  const clickUpVerify = String(clickUpVerifyResult.output || '')
  const sheetVerify = String(outputs.sheetVerify || '')

  const googleWorkspaceConnector = findConnectorUptimeRow(foundationHubFull, 'google-workspace')
  const googleDelegatedHealthy = googleHealthResult.ok === true &&
    googleHealth.includes('Spreadsheet access: OK') &&
    googleHealth.includes('Delegated access is ready')
  const googleDelegatedAuthFailure = googleHealthResult.ok !== true &&
    /invalid_grant|No valid verifier|Delegated health check failed/i.test(googleHealth)
  const googleServiceAccountDirectHealthy = googleServiceAccountHealthResult.ok === true &&
    googleServiceAccountHealth.includes('Access mode: service account direct') &&
    googleServiceAccountHealth.includes('Spreadsheet access: OK') &&
    googleServiceAccountHealth.includes('Delegated access is ready')
  const googleWorkspaceGovernedDegraded = ['degraded', 'down'].includes(googleWorkspaceConnector?.status) &&
    googleWorkspaceConnector?.safeToUse === false
  const googleDelegatedAuthDegradedAccepted = googleDelegatedAuthFailure &&
    googleServiceAccountDirectHealthy &&
    googleWorkspaceGovernedDegraded
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
    googleDelegatedHealthy || googleDelegatedAuthDegradedAccepted,
    'google:health passes or delegated-auth outage is governed with service-account direct read proof',
    googleDelegatedHealthy
      ? lastLines(googleHealth)
      : `delegatedAuthFailure=${googleDelegatedAuthFailure ? 'yes' : 'no'} serviceAccountDirect=${googleServiceAccountDirectHealthy ? 'yes' : 'no'} googleWorkspace=${googleWorkspaceConnector?.status || 'missing'} safeToUse=${googleWorkspaceConnector?.safeToUse === false ? 'no' : 'yes'} output=${lastLines(googleHealth)}`,
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
      googleDelegatedHealthy,
      googleDelegatedAuthFailure,
      googleServiceAccountDirectHealthy,
      googleDelegatedAuthDegradedAccepted,
      clickUpVerifyHealthy,
      clickUpExternalOutage,
      clickUpDegradedAccepted,
    },
    checks,
    failed,
    artifacts: {
      kpiHealthSummary,
      backlogHygieneSummary,
      googleWorkspaceConnector: googleWorkspaceConnector
        ? {
            key: googleWorkspaceConnector.key,
            status: googleWorkspaceConnector.status,
            safeToUse: googleWorkspaceConnector.safeToUse,
          }
        : null,
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
        rows: [
          {
            key: 'google-workspace',
            status: 'healthy',
            safeToUse: true,
          },
        ],
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
  const googleDelegatedAuthOutageAccepted = evaluateFoundationHealthScriptVerifier({
    outputs: {
      ...healthyOutputs(),
      googleHealthResult: {
        ok: false,
        output: [
          'Google delegated health check',
          'Delegated health check failed.',
          'invalid_grant: No valid verifier for issuer: crewbert-delegation@crewbert.iam.gserviceaccount.com',
        ].join('\n'),
      },
      googleServiceAccountHealthResult: {
        ok: true,
        output: [
          'Google delegated health check',
          '  Access mode: service account direct',
          '  Spreadsheet access: OK -> Freedom Sheet',
          'Delegated access is ready for sheet reads and writes.',
        ].join('\n'),
      },
    },
    foundationHub,
    foundationHubFull: {
      foundationOperatingReliability: {
        connectorUptime: {
          summary: { degradedCount: 1 },
          rows: [
            {
              key: 'google-workspace',
              status: 'degraded',
              safeToUse: false,
            },
          ],
        },
      },
    },
    expectedKpiTables,
    expectedKpiRpcs,
  })
  const googleDelegatedAuthOutageRejectedWithoutGovernedConnector = evaluateFoundationHealthScriptVerifier({
    outputs: {
      ...healthyOutputs(),
      googleHealthResult: {
        ok: false,
        output: 'Delegated health check failed.\ninvalid_grant: No valid verifier for issuer: crewbert-delegation@crewbert.iam.gserviceaccount.com',
      },
      googleServiceAccountHealthResult: {
        ok: true,
        output: 'Google delegated health check\n  Access mode: service account direct\n  Spreadsheet access: OK -> Freedom Sheet\nDelegated access is ready for sheet reads and writes.',
      },
    },
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
          rows: foundationHubFull.foundationOperatingReliability.connectorUptime.rows,
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
    googleDelegatedAuthOutageAccepted.ok === true &&
    googleDelegatedAuthOutageRejectedWithoutGovernedConnector.ok === false &&
    riskyKpi.ok === false &&
    missingBacklogSynthetic.ok === false &&
    clickUpVendorOutageAccepted.ok === true &&
    clickUpHardFailure.ok === false &&
    brokenSheets.ok === false
  return {
    ok,
    invariant: 'Health-script verifier module accepts healthy outputs, governed Google delegated-auth degradation with service-account direct read proof, and governed ClickUp vendor outages, while rejecting missing delegated Google health, ungoverned Google auth degradation, risky KPI, missing backlog dogfood, hard ClickUp failure, and broken Sheets output.',
    healthy,
    missingGoogleDelegated,
    googleDelegatedAuthOutageAccepted,
    googleDelegatedAuthOutageRejectedWithoutGovernedConnector,
    riskyKpi,
    missingBacklogSynthetic,
    clickUpVendorOutageAccepted,
    clickUpHardFailure,
    brokenSheets,
  }
}
