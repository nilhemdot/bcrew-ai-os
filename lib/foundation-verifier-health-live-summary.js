import { detectHardcodedLiveTruthInText } from './code-quality-nightly-audit.js'
import { getSourceContracts } from './source-contracts.js'
import {
  EXPECTED_KPI_RPCS,
  EXPECTED_KPI_TABLES,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_APPROVAL_PATH,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CLOSEOUT_KEY,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_PLAN_PATH,
  KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SCRIPT_PATH,
  buildKpiHealthDynamicYearContractDogfoodProof,
} from './kpi-health.js'
import {
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_APPROVAL_PATH,
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID,
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY,
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_PLAN_PATH,
  FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SCRIPT_PATH,
  buildFoundationCurrentStateSummaryDogfoodProof,
  buildFoundationCurrentStateSummaryPayload,
  evaluateFoundationCurrentStateSummarySourceContract,
} from './foundation-current-state-summary.js'
import {
  SCHEDULED_JOB_STALENESS_DASHBOARD_APPROVAL_PATH,
  SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID,
  SCHEDULED_JOB_STALENESS_DASHBOARD_CLOSEOUT_KEY,
  SCHEDULED_JOB_STALENESS_DASHBOARD_PLAN_PATH,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_APPROVAL_PATH,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_JOB_KEY,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_PLAN_PATH,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_SCHEDULE_LOCAL_TIME,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_SCRIPT_PATH,
  buildFoundationSystemHealthDogfoodProof,
} from './foundation-system-health.js'
import {
  getFoundationJobDefinitions,
  getFoundationJobRuntime,
} from './foundation-jobs.js'
import {
  VERIFIER_HEALTH_SCRIPT_MODULE_APPROVAL_PATH,
  VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES,
  VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID,
  VERIFIER_HEALTH_SCRIPT_MODULE_CLOSEOUT_KEY,
  VERIFIER_HEALTH_SCRIPT_MODULE_HANDOFF_PATH,
  VERIFIER_HEALTH_SCRIPT_MODULE_PLAN_PATH,
  VERIFIER_HEALTH_SCRIPT_MODULE_SCRIPT_PATH,
  VERIFIER_HEALTH_SCRIPT_MODULE_SPRINT_ID,
  buildFoundationHealthScriptVerifierDogfoodProof,
  evaluateFoundationHealthScriptVerifier,
} from './foundation-health-script-verifier.js'
import {
  BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
  BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY,
  BUILD_LANE_FAILURE_TELEMETRY_SCRIPT_PATH,
  buildBuildLaneFailureTelemetryDogfoodProof,
} from './build-lane-failure-telemetry.js'

export const VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID = 'VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001'
export const VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CLOSEOUT_KEY = 'verifier-health-live-summary-split-v1'
export const VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_PLAN_PATH = 'docs/process/verifier-health-live-summary-split-001-plan.md'
export const VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001.json'
export const VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-health-live-summary-split-check.mjs'
export const VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-health-live-summary-split-closeout.md'
export const VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_BEFORE_LINES = 8552

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function evaluateHealthLiveSummaryFixture(fixture = {}) {
  const findings = []
  if (fixture.kpiDynamicYearClosed !== true) findings.push('kpi_dynamic_year_hidden_failure')
  if (fixture.liveSummarySourceBacked !== true) findings.push('live_summary_source_backed_hidden_failure')
  if (fixture.systemHealthScheduled !== true) findings.push('system_health_schedule_hidden_failure')
  if (fixture.healthScriptsDelegated !== true) findings.push('health_scripts_delegation_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_health_live_summary_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierHealthLiveSummaryDogfoodProof() {
  const healthy = evaluateHealthLiveSummaryFixture({
    kpiDynamicYearClosed: true,
    liveSummarySourceBacked: true,
    systemHealthScheduled: true,
    healthScriptsDelegated: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenKpiDynamicYear: evaluateHealthLiveSummaryFixture({
      kpiDynamicYearClosed: false,
      liveSummarySourceBacked: true,
      systemHealthScheduled: true,
      healthScriptsDelegated: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenLiveSummary: evaluateHealthLiveSummaryFixture({
      kpiDynamicYearClosed: true,
      liveSummarySourceBacked: false,
      systemHealthScheduled: true,
      healthScriptsDelegated: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenSystemHealth: evaluateHealthLiveSummaryFixture({
      kpiDynamicYearClosed: true,
      liveSummarySourceBacked: true,
      systemHealthScheduled: false,
      healthScriptsDelegated: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenHealthScripts: evaluateHealthLiveSummaryFixture({
      kpiDynamicYearClosed: true,
      liveSummarySourceBacked: true,
      systemHealthScheduled: true,
      healthScriptsDelegated: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateHealthLiveSummaryFixture({
      kpiDynamicYearClosed: true,
      liveSummarySourceBacked: true,
      systemHealthScheduled: true,
      healthScriptsDelegated: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy health/live-summary fixture passes; KPI dynamic-year, live-summary, system-health, health-script, and old-inline failures fail closed'
      : 'health/live-summary dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierHealthLiveSummary(input = {}) {
  const {
    activeFoundationSprint,
    activeSprintAtOrPast,
    codeQualityNightlyAuditSource,
    currentState,
    foundationBuildCloseouts,
    foundationCurrentStateRendererSource,
    foundationCurrentStateSummarySource,
    foundationHealthScriptVerifierSource,
    foundationHub,
    foundationHubFull,
    foundationHubKpiHealth,
    foundationOperationsRenderersSource,
    foundationRuntimeRenderersSource,
    foundationSystemHealthSource,
    foundationVerifierHealthLiveSummarySource,
    foundationVerifySource,
    hubReadRoutesSource,
    kpiHealthScriptSource,
    kpiHealthSource,
    packageJson,
    readRepoFile,
    repoFileExists,
    runHealthScript,
    runHealthScriptSafe,
    runHealthScriptWithArgs,
  } = input
  const checks = []
  const readSource = typeof readRepoFile === 'function' ? readRepoFile : async () => ''
  const [
    kpiHealthDynamicYearContractScriptSource,
    kpiHealthDynamicYearContractPlanSource,
    foundationUiLiveSummarySourcesScriptSource,
    foundationUiLiveSummarySourcesPlanSource,
    systemHealthNightlyAuditScriptSource,
    systemHealthNightlyAuditPlanSource,
    scheduledJobStalenessDashboardPlanSource,
    verifierHealthScriptModuleScriptSource,
    verifierHealthScriptModulePlanSource,
  ] = await Promise.all([
    readSource(KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SCRIPT_PATH),
    readSource(KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_PLAN_PATH),
    readSource(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SCRIPT_PATH),
    readSource(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_PLAN_PATH),
    readSource(SYSTEM_HEALTH_NIGHTLY_AUDIT_SCRIPT_PATH),
    readSource(SYSTEM_HEALTH_NIGHTLY_AUDIT_PLAN_PATH),
    readSource(SCHEDULED_JOB_STALENESS_DASHBOARD_PLAN_PATH),
    readSource(VERIFIER_HEALTH_SCRIPT_MODULE_SCRIPT_PATH),
    readSource(VERIFIER_HEALTH_SCRIPT_MODULE_PLAN_PATH),
  ])
  const healthLiveSummaryDelegationSource = [foundationVerifySource, foundationVerifierHealthLiveSummarySource].filter(Boolean).join('\n')

  const kpiHealthDynamicYearContractCard = (foundationHub.backlogItems || []).find(item => item.id === KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID) || null
  const kpiHealthDynamicYearContractCloseout = foundationBuildCloseouts.find(closeout => closeout.key === KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CLOSEOUT_KEY) || null
  const kpiHealthDynamicYearContractDogfood = buildKpiHealthDynamicYearContractDogfoodProof()
  const kpiHealthDynamicYearContractClosed = kpiHealthDynamicYearContractCard?.lane === 'done'
  const hardcodedKpiHealthYearPattern = new RegExp([
    'target_year:\\s*',
    '2026',
    '|',
    '2026',
    '-01-01|',
    '2026',
    '-12-31',
  ].join(''))
  ensure(
    checks,
    kpiHealthDynamicYearContractCard &&
      ['executing', 'done'].includes(kpiHealthDynamicYearContractCard.lane) &&
      packageJson.scripts?.['process:kpi-health-dynamic-year-contract-check'] === `node --env-file-if-exists=.env ${KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SCRIPT_PATH}` &&
      kpiHealthDynamicYearContractDogfood.ok === true &&
      kpiHealthSource.includes('buildKpiHealthPeriodContract') &&
      kpiHealthSource.includes('getExpectedKpiRpcs') &&
      !hardcodedKpiHealthYearPattern.test(kpiHealthSource) &&
      kpiHealthScriptSource.includes('periodContract') &&
      kpiHealthDynamicYearContractScriptSource.includes('dogfood rejects frozen prior-year params') &&
      kpiHealthDynamicYearContractPlanSource.includes('no new responsibility added') &&
      await repoFileExists(KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_APPROVAL_PATH) &&
      (!kpiHealthDynamicYearContractClosed || (
        String(kpiHealthDynamicYearContractCard.statusNote || '').includes(KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CLOSEOUT_KEY) &&
        kpiHealthDynamicYearContractCloseout?.operatorCloseout === true &&
        (kpiHealthDynamicYearContractCloseout.backlogIds || []).includes(KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID) &&
        await repoFileExists('docs/handoffs/2026-05-16-kpi-health-dynamic-year-contract-closeout.md')
      )),
    'KPI health dynamic-year contract rejects frozen params and exposes runtime period metadata',
    kpiHealthDynamicYearContractCard
      ? `lane=${kpiHealthDynamicYearContractCard.lane} year=${kpiHealthDynamicYearContractDogfood.runtime2027?.year || 'missing'} frozenRejected=${kpiHealthDynamicYearContractDogfood.frozen2026?.rejected ? 'yes' : 'no'} closeout=${kpiHealthDynamicYearContractCloseout?.key || 'pending'}`
      : `missing ${KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID}`,
  )

  const foundationUiLiveSummarySourcesCard = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID) || null
  const foundationUiLiveSummarySourcesCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY) || null
  const foundationUiLiveSummarySourcesDogfood = buildFoundationCurrentStateSummaryDogfoodProof()
  const foundationUiLiveSummaryPayload = buildFoundationCurrentStateSummaryPayload({
    sourceContracts: getSourceContracts(),
    backlogItems: foundationHub.backlogItems || [],
    kpiHealth: foundationHubKpiHealth,
    currentSprint: activeFoundationSprint || {},
  })
  const foundationUiLiveSummaryAuditFindingIds = detectHardcodedLiveTruthInText({
    relativePath: 'public/foundation-current-state-renderers.js',
    text: foundationCurrentStateRendererSource,
  }).map(finding => finding.id)
  const foundationUiLiveSummaryContract = evaluateFoundationCurrentStateSummarySourceContract({
    payload: foundationUiLiveSummaryPayload,
    frontendSource: foundationCurrentStateRendererSource,
    auditFindingIds: foundationUiLiveSummaryAuditFindingIds,
  })
  const foundationUiLiveSummaryClosed = foundationUiLiveSummarySourcesCard?.lane === 'done'
  ensure(
    checks,
    foundationUiLiveSummarySourcesCard &&
      ['executing', 'done'].includes(foundationUiLiveSummarySourcesCard.lane) &&
      packageJson.scripts?.['process:foundation-ui-live-summary-sources-check'] === `node --env-file-if-exists=.env ${FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SCRIPT_PATH}` &&
      foundationUiLiveSummarySourcesDogfood.ok === true &&
      foundationUiLiveSummaryContract.ok === true &&
      foundationCurrentStateSummarySource.includes('buildFoundationCurrentStateSummaryPayload') &&
      foundationCurrentStateSummarySource.includes('buildFoundationCurrentStateSummaryDogfoodProof') &&
      foundationCurrentStateRendererSource.includes('currentStateSummary') &&
      foundationCurrentStateRendererSource.includes('renderCurrentStateMissingSummaryPanel') &&
      !/var\s+surfaceRows\s*=\s*\[/.test(foundationCurrentStateRendererSource) &&
      codeQualityNightlyAuditSource.includes('public/foundation-current-state-renderers.js') &&
      foundationUiLiveSummarySourcesScriptSource.includes('source input changes alter UI row copy') &&
      foundationUiLiveSummarySourcesPlanSource.includes('public/foundation-current-state-renderers.js') &&
      await repoFileExists(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_APPROVAL_PATH) &&
      (!foundationUiLiveSummaryClosed || (
        String(foundationUiLiveSummarySourcesCard.statusNote || '').includes(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY) &&
        foundationUiLiveSummarySourcesCloseout?.operatorCloseout === true &&
        (foundationUiLiveSummarySourcesCloseout.backlogIds || []).includes(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID) &&
        await repoFileExists('docs/handoffs/2026-05-16-foundation-ui-live-summary-sources-closeout.md')
      )),
    'FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 renders source-backed Current State summary payload',
    foundationUiLiveSummarySourcesCard
      ? `lane=${foundationUiLiveSummarySourcesCard.lane} rows=${foundationUiLiveSummaryPayload.summary?.surfaceRowCount || 0} auditFinding=${foundationUiLiveSummaryAuditFindingIds.includes('hardcoded-foundation-ui-current-summary') ? 'present' : 'clean'} closeout=${foundationUiLiveSummarySourcesCloseout?.key || 'pending'}`
      : `missing ${FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID}`,
  )

  const systemHealthNightlyAuditCard = (foundationHub.backlogItems || []).find(item => item.id === SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID) || null
  const scheduledJobStalenessDashboardCard = (foundationHub.backlogItems || []).find(item => item.id === SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID) || null
  const buildLaneFailureTelemetryCard = (foundationHub.backlogItems || []).find(item => item.id === BUILD_LANE_FAILURE_TELEMETRY_CARD_ID) || null
  const systemHealthNightlyAuditCloseout = foundationBuildCloseouts.find(closeout => closeout.key === SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY) || null
  const scheduledJobStalenessDashboardCloseout = foundationBuildCloseouts.find(closeout => closeout.key === SCHEDULED_JOB_STALENESS_DASHBOARD_CLOSEOUT_KEY) || null
  const buildLaneFailureTelemetryCloseout = foundationBuildCloseouts.find(closeout => closeout.key === BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY) || null
  const systemHealthNightlyAuditClosed = systemHealthNightlyAuditCard?.lane === 'done'
  const scheduledJobStalenessDashboardClosed = scheduledJobStalenessDashboardCard?.lane === 'done'
  const buildLaneFailureTelemetryClosed = buildLaneFailureTelemetryCard?.lane === 'done'
  const systemHealthNightlyAuditDogfood = buildFoundationSystemHealthDogfoodProof()
  const buildLaneFailureTelemetryDogfood = buildBuildLaneFailureTelemetryDogfoodProof()
  const systemHealthNightlyJob = getFoundationJobDefinitions().find(job => job.key === SYSTEM_HEALTH_NIGHTLY_AUDIT_JOB_KEY) || null
  const systemHealthNightlyRuntime = getFoundationJobRuntime(systemHealthNightlyJob || {}, {
    status: 'succeeded',
    finishedAt: new Date().toISOString(),
  })
  ensure(
    checks,
    systemHealthNightlyAuditCard &&
      scheduledJobStalenessDashboardCard &&
      ['executing', 'done'].includes(systemHealthNightlyAuditCard.lane) &&
      ['scoped', 'executing', 'done'].includes(scheduledJobStalenessDashboardCard.lane) &&
      packageJson.scripts?.['process:system-health-nightly-audit-check'] === `node --env-file-if-exists=.env ${SYSTEM_HEALTH_NIGHTLY_AUDIT_SCRIPT_PATH}` &&
      systemHealthNightlyJob?.runtimeMode === 'scheduled' &&
      systemHealthNightlyJob?.mutationPosture === 'report_only' &&
      systemHealthNightlyJob?.scheduleLocalTime === SYSTEM_HEALTH_NIGHTLY_AUDIT_SCHEDULE_LOCAL_TIME &&
      systemHealthNightlyRuntime.scheduleStatus !== 'blocked' &&
      systemHealthNightlyAuditDogfood.ok === true &&
      foundationSystemHealthSource.includes('buildFoundationSystemHealthSnapshot') &&
      foundationSystemHealthSource.includes('buildScheduledJobStalenessSnapshot') &&
      foundationSystemHealthSource.includes('buildFoundationSystemHealthReportMarkdown') &&
      systemHealthNightlyAuditScriptSource.includes('--write-report') &&
      systemHealthNightlyAuditScriptSource.includes('assertCurrentProcessCheckWriteAllowed') &&
      hubReadRoutesSource.includes('foundationSystemHealth') &&
      foundationRuntimeRenderersSource.includes('renderFoundationSystemHealthPanel') &&
      foundationOperationsRenderersSource.includes('runtime-diagnostic-system-health-rollup') &&
      systemHealthNightlyAuditPlanSource.includes('A configured job is not truth') &&
      scheduledJobStalenessDashboardPlanSource.includes('Steve opens the Foundation page and immediately sees red/yellow/green system health') &&
      await repoFileExists(SYSTEM_HEALTH_NIGHTLY_AUDIT_APPROVAL_PATH) &&
      await repoFileExists(SCHEDULED_JOB_STALENESS_DASHBOARD_APPROVAL_PATH) &&
      buildLaneFailureTelemetryDogfood.ok === true &&
      packageJson.scripts?.['process:build-lane-failure-telemetry-check'] === `node --env-file-if-exists=.env ${BUILD_LANE_FAILURE_TELEMETRY_SCRIPT_PATH}` &&
      foundationSystemHealthSource.includes('buildLaneFailureTelemetry') &&
      foundationSystemHealthSource.includes('buildBuildLaneFailureTelemetrySnapshot') &&
      foundationRuntimeRenderersSource.includes('Build lane failures') &&
      await repoFileExists('docs/handoffs/system-health-2026-05-16.md') &&
      await repoFileExists('docs/handoffs/system-health-2026-05-16.json') &&
      (!systemHealthNightlyAuditClosed || (
        String(systemHealthNightlyAuditCard.statusNote || '').includes(SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY) &&
        systemHealthNightlyAuditCloseout?.operatorCloseout === true &&
        (systemHealthNightlyAuditCloseout.backlogIds || []).includes(SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID) &&
        await repoFileExists('docs/handoffs/2026-05-16-system-health-nightly-audit-closeout.md')
      )) &&
      (!scheduledJobStalenessDashboardClosed || (
        String(scheduledJobStalenessDashboardCard.statusNote || '').includes(SCHEDULED_JOB_STALENESS_DASHBOARD_CLOSEOUT_KEY) &&
        scheduledJobStalenessDashboardCloseout?.operatorCloseout === true &&
        (scheduledJobStalenessDashboardCloseout.backlogIds || []).includes(SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID) &&
        await repoFileExists('docs/handoffs/2026-05-16-scheduled-job-staleness-dashboard-closeout.md')
      )) &&
      (!buildLaneFailureTelemetryClosed || (
        String(buildLaneFailureTelemetryCard.statusNote || '').includes(BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY) &&
        buildLaneFailureTelemetryCloseout?.operatorCloseout === true &&
        (buildLaneFailureTelemetryCloseout.backlogIds || []).includes(BUILD_LANE_FAILURE_TELEMETRY_CARD_ID)
      )),
    'SYSTEM-HEALTH-NIGHTLY-AUDIT-001, SCHEDULED-JOB-STALENESS-DASHBOARD-001, and BUILD-LANE-FAILURE-TELEMETRY-001 surface hidden job/source/system/build-lane staleness',
    systemHealthNightlyAuditCard && scheduledJobStalenessDashboardCard
      ? `lanes=${systemHealthNightlyAuditCard.lane}/${scheduledJobStalenessDashboardCard.lane}/${buildLaneFailureTelemetryCard?.lane || 'missing'} job=${systemHealthNightlyJob?.runtimeMode || 'missing'}/${systemHealthNightlyRuntime.scheduleStatus || 'missing'} dogfood=${systemHealthNightlyAuditDogfood.ok ? 'pass' : 'blocked'} telemetry=${buildLaneFailureTelemetryDogfood.ok ? 'pass' : 'blocked'}`
      : 'missing system-health visibility cards',
  )

  const [
    googleHealth,
    fubHealth,
    kpiHealth,
    backlogHygieneOutput,
    clickUpVerifyResult,
    sheetVerify,
  ] = await Promise.all([
    runHealthScript('google:health'),
    runHealthScript('fub:health'),
    runHealthScript('kpi:health'),
    runHealthScriptWithArgs('backlog:hygiene', ['--includeSynthetic=true']),
    runHealthScriptSafe('clickup:verify'),
    runHealthScript('sheets:verify'),
  ])
  const healthScriptVerifier = evaluateFoundationHealthScriptVerifier({
    outputs: {
      googleHealth,
      fubHealth,
      kpiHealth,
      backlogHygieneOutput,
      clickUpVerifyResult,
      sheetVerify,
    },
    foundationHub,
    foundationHubFull,
    expectedKpiTables: EXPECTED_KPI_TABLES,
    expectedKpiRpcs: EXPECTED_KPI_RPCS,
  })
  checks.push(...healthScriptVerifier.checks)
  const verifierHealthScriptModuleCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID) || null
  const verifierHealthScriptModuleCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_HEALTH_SCRIPT_MODULE_CLOSEOUT_KEY) || null
  const verifierHealthScriptModuleDogfood = buildFoundationHealthScriptVerifierDogfoodProof()
  const foundationVerifyLineCountAfterHealthScriptSplit = String(foundationVerifySource || '').split('\n').length
  ensure(
    checks,
    verifierHealthScriptModuleCard &&
      ['executing', 'done'].includes(verifierHealthScriptModuleCard.lane) &&
      String(verifierHealthScriptModuleCard.statusNote || '').includes(VERIFIER_HEALTH_SCRIPT_MODULE_CLOSEOUT_KEY) &&
      verifierHealthScriptModuleCloseout?.operatorCloseout === true &&
      (verifierHealthScriptModuleCloseout.backlogIds || []).includes(VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID) &&
      verifierHealthScriptModuleDogfood.ok === true &&
      healthScriptVerifier.summary.passed === healthScriptVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-health-script-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_HEALTH_SCRIPT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_HEALTH_SCRIPT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_HEALTH_SCRIPT_MODULE_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_HEALTH_SCRIPT_MODULE_HANDOFF_PATH) &&
      foundationHealthScriptVerifierSource.includes('evaluateFoundationHealthScriptVerifier') &&
      foundationHealthScriptVerifierSource.includes('buildFoundationHealthScriptVerifierDogfoodProof') &&
      verifierHealthScriptModuleScriptSource.includes('dogfood rejects health-script verifier failures') &&
      (verifierHealthScriptModulePlanSource.includes('Substring-only proof') ||
        verifierHealthScriptModulePlanSource.includes('substring theatre')) &&
      healthLiveSummaryDelegationSource.includes('evaluateFoundationHealthScriptVerifier({') &&
      healthLiveSummaryDelegationSource.includes('healthScriptVerifier.checks') &&
      !foundationVerifySource.includes('googleHealth.' + "includes('Spreadsheet access: OK')") &&
      !foundationVerifySource.includes('sheetVerify.' + "includes('Sheet structure verification passed.')") &&
      foundationVerifyLineCountAfterHealthScriptSplit < VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_HEALTH_SCRIPT_MODULE_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID])),
    'VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 extracts health-script verifier checks into a focused module',
    verifierHealthScriptModuleCard
      ? `lane=${verifierHealthScriptModuleCard.lane} dogfood=${verifierHealthScriptModuleDogfood.ok ? 'pass' : 'blocked'} healthChecks=${healthScriptVerifier.summary.passed}/${healthScriptVerifier.summary.total} lines=${VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES}->${foundationVerifyLineCountAfterHealthScriptSplit}`
      : `missing ${VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID}`,
  )

  const verifierHealthLiveSummarySplitCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID) || null
  const verifierHealthLiveSummarySplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CLOSEOUT_KEY) || null
  const verifierHealthLiveSummaryDogfood = buildFoundationVerifierHealthLiveSummaryDogfoodProof()
  const foundationVerifyLineCountAfterHealthLiveSummarySplit = String(foundationVerifySource || '').split('\n').length
  const oldInlineMessages = [
    'KPI health dynamic-year contract rejects frozen params and exposes runtime period metadata',
    'FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 renders source-backed Current State summary payload',
    'SYSTEM-HEALTH-NIGHTLY-AUDIT-001 and SCHEDULED-JOB-STALENESS-DASHBOARD-001 surface hidden job/source/system staleness',
    'VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 extracts health-script verifier checks into a focused module',
  ]
  ensure(
    checks,
    verifierHealthLiveSummarySplitCard &&
      ['executing', 'done'].includes(verifierHealthLiveSummarySplitCard.lane) &&
      String(verifierHealthLiveSummarySplitCard.statusNote || '').includes(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CLOSEOUT_KEY) &&
      verifierHealthLiveSummarySplitCloseout?.operatorCloseout === true &&
      (verifierHealthLiveSummarySplitCloseout.backlogIds || []).includes(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID) &&
      verifierHealthLiveSummaryDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-health-live-summary-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_HANDOFF_PATH) &&
      healthLiveSummaryDelegationSource.includes('evaluateFoundationVerifierHealthLiveSummary({') &&
      healthLiveSummaryDelegationSource.includes('healthLiveSummaryVerifier.checks') &&
      oldInlineMessages.every(message => !String(foundationVerifySource || '').includes(message)) &&
      foundationVerifyLineCountAfterHealthLiveSummarySplit < VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_BEFORE_LINES &&
      foundationVerifierHealthLiveSummarySource.includes(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID) &&
      foundationVerifierHealthLiveSummarySource.includes('KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID') &&
      foundationVerifierHealthLiveSummarySource.includes('FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID') &&
      foundationVerifierHealthLiveSummarySource.includes('SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID') &&
      foundationVerifierHealthLiveSummarySource.includes('VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID'),
    'VERIFIER-HEALTH-LIVE-SUMMARY-SPLIT-001 extracts health/live-summary verifier checks into a focused module',
    verifierHealthLiveSummarySplitCard
      ? `lane=${verifierHealthLiveSummarySplitCard.lane} dogfood=${verifierHealthLiveSummaryDogfood.ok ? 'pass' : 'blocked'} lines=${VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_BEFORE_LINES}->${foundationVerifyLineCountAfterHealthLiveSummarySplit}`
      : `missing ${VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID}`,
  )

  return { checks }
}
