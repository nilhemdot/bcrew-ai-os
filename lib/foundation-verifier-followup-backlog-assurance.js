export const VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_CARD_ID = 'VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001'
export const VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_CLOSEOUT_KEY = 'verifier-followup-backlog-assurance-split-v1'
export const VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_PLAN_PATH = 'docs/process/verifier-followup-backlog-assurance-split-001-plan.md'
export const VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001.json'
export const VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-followup-backlog-assurance-split-check.mjs'
export const VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-followup-backlog-assurance-split-closeout.md'
export const VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_BEFORE_LINES = 8339

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function backlogItemText(item = null) {
  return [
    item?.title,
    item?.summary,
    item?.whyItMatters,
    item?.nextAction,
    item?.statusNote,
  ].filter(Boolean).join('\n')
}

function evaluateFollowupBacklogAssuranceFixture(fixture = {}) {
  const findings = []
  if (fixture.runtimeHealthFollowupTracked !== true) findings.push('runtime_health_followup_hidden_failure')
  if (fixture.accessFollowupTracked !== true) findings.push('access_followup_hidden_failure')
  if (fixture.deployFreshnessTracked !== true) findings.push('deploy_freshness_hidden_failure')
  if (fixture.extractionFollowupsClosed !== true) findings.push('extraction_followups_hidden_failure')
  if (fixture.strategicIntelligenceFollowupsPinned !== true) findings.push('strategic_intelligence_followups_hidden_failure')
  if (fixture.sourceCloseoutsHonest !== true) findings.push('source_closeout_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_followup_backlog_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierFollowupBacklogAssuranceDogfoodProof() {
  const healthy = evaluateFollowupBacklogAssuranceFixture({
    runtimeHealthFollowupTracked: true,
    accessFollowupTracked: true,
    deployFreshnessTracked: true,
    extractionFollowupsClosed: true,
    strategicIntelligenceFollowupsPinned: true,
    sourceCloseoutsHonest: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenRuntimeHealthFollowup: evaluateFollowupBacklogAssuranceFixture({
      runtimeHealthFollowupTracked: false,
      accessFollowupTracked: true,
      deployFreshnessTracked: true,
      extractionFollowupsClosed: true,
      strategicIntelligenceFollowupsPinned: true,
      sourceCloseoutsHonest: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenAccessFollowup: evaluateFollowupBacklogAssuranceFixture({
      runtimeHealthFollowupTracked: true,
      accessFollowupTracked: false,
      deployFreshnessTracked: true,
      extractionFollowupsClosed: true,
      strategicIntelligenceFollowupsPinned: true,
      sourceCloseoutsHonest: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenDeployFreshness: evaluateFollowupBacklogAssuranceFixture({
      runtimeHealthFollowupTracked: true,
      accessFollowupTracked: true,
      deployFreshnessTracked: false,
      extractionFollowupsClosed: true,
      strategicIntelligenceFollowupsPinned: true,
      sourceCloseoutsHonest: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenExtractionFollowups: evaluateFollowupBacklogAssuranceFixture({
      runtimeHealthFollowupTracked: true,
      accessFollowupTracked: true,
      deployFreshnessTracked: true,
      extractionFollowupsClosed: false,
      strategicIntelligenceFollowupsPinned: true,
      sourceCloseoutsHonest: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenStrategicIntelligenceFollowups: evaluateFollowupBacklogAssuranceFixture({
      runtimeHealthFollowupTracked: true,
      accessFollowupTracked: true,
      deployFreshnessTracked: true,
      extractionFollowupsClosed: true,
      strategicIntelligenceFollowupsPinned: false,
      sourceCloseoutsHonest: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenSourceCloseouts: evaluateFollowupBacklogAssuranceFixture({
      runtimeHealthFollowupTracked: true,
      accessFollowupTracked: true,
      deployFreshnessTracked: true,
      extractionFollowupsClosed: true,
      strategicIntelligenceFollowupsPinned: true,
      sourceCloseoutsHonest: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateFollowupBacklogAssuranceFixture({
      runtimeHealthFollowupTracked: true,
      accessFollowupTracked: true,
      deployFreshnessTracked: true,
      extractionFollowupsClosed: true,
      strategicIntelligenceFollowupsPinned: true,
      sourceCloseoutsHonest: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy follow-up backlog assurance fixture passes; hidden follow-up, extraction, strategy, source-closeout, and old-inline failures fail closed'
      : 'follow-up backlog assurance dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierFollowupBacklogAssurance(input = {}) {
  const {
    currentPlan,
    currentState,
    foundationBuildCloseouts,
    foundationFrontendSource,
    foundationHub,
    foundationVerifierFollowupBacklogAssuranceSource,
    foundationVerifySource,
    packageJson,
    repoFileExists,
    strategyHubMeetingReadyCloseoutKey,
  } = input
  const checks = []
  const runtimeHealthSimplify = (foundationHub.backlogItems || []).find(item => item.id === 'RUNTIME-HEALTH-SIMPLIFY-001') || null
  const runtimeHealthSimplifyText = backlogItemText(runtimeHealthSimplify)
  const runtimeHealthSimplifyParked =
    runtimeHealthSimplify?.lane === 'scoped' &&
    runtimeHealthSimplify?.priority === 'P1' &&
    runtimeHealthSimplifyText.includes('too dense') &&
    runtimeHealthSimplifyText.includes('plain-English top layer') &&
    runtimeHealthSimplifyText.includes('collapsed-by-default diagnostic groups') &&
    runtimeHealthSimplifyText.includes('Parked follow-up, not next') &&
    currentPlan.includes('`RUNTIME-HEALTH-SIMPLIFY-001`') &&
    currentState.includes('`RUNTIME-HEALTH-SIMPLIFY-001` is parked')
  const runtimeHealthSimplifyActiveOrClosed =
    runtimeHealthSimplify &&
    ['executing', 'done'].includes(runtimeHealthSimplify.lane) &&
    runtimeHealthSimplifyText.includes('Runtime Health') &&
    runtimeHealthSimplifyText.includes('plain-English') &&
    runtimeHealthSimplifyText.includes('diagnostic') &&
    currentPlan.includes('`RUNTIME-HEALTH-SIMPLIFY-001`') &&
    currentState.includes('`RUNTIME-HEALTH-SIMPLIFY-001`')
  ensure(
    checks,
    runtimeHealthSimplifyParked || runtimeHealthSimplifyActiveOrClosed,
    'Runtime Health simplification card is tracked',
    runtimeHealthSimplify
      ? `${runtimeHealthSimplify.lane} / ${runtimeHealthSimplify.priority} / ${runtimeHealthSimplify.title}`
      : 'missing RUNTIME-HEALTH-SIMPLIFY-001',
  )

  const foundationUsersAdmin = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-USERS-001') || null
  const foundationUsersAdminText = backlogItemText(foundationUsersAdmin)
  ensure(
    checks,
    foundationUsersAdmin?.lane === 'scoped' &&
      foundationUsersAdmin?.priority === 'P1' &&
      foundationUsersAdminText.includes('owner-only') &&
      foundationUsersAdminText.includes('without editing `.env`') &&
      foundationUsersAdminText.includes('disable') &&
      foundationUsersAdminText.includes('audit') &&
      foundationUsersAdminText.includes('non-owners cannot manage access') &&
      foundationUsersAdminText.includes('SECURITY-002') &&
      currentPlan.includes('FOUNDATION-USERS-001'),
    'Foundation user/access control panel is parked as scoped P1 follow-up',
    foundationUsersAdmin
      ? `${foundationUsersAdmin.lane} / ${foundationUsersAdmin.priority} / ${foundationUsersAdmin.title}`
      : 'missing FOUNDATION-USERS-001',
  )

  const systemProcessControl = (foundationHub.backlogItems || []).find(item => item.id === 'SYSTEM-010') || null
  const runtimeSupervisor = (foundationHub.backlogItems || []).find(item => item.id === 'RUNTIME-SUPERVISOR-001') || null
  const runtimeSupervisorText = [
    systemProcessControl?.nextAction,
    systemProcessControl?.statusNote,
    runtimeSupervisor?.nextAction,
    runtimeSupervisor?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    systemProcessControl?.lane === 'scoped' &&
      systemProcessControl?.priority === 'P0' &&
      ['scoped', 'done'].includes(runtimeSupervisor?.lane) &&
      runtimeSupervisor?.priority === 'P0' &&
      (
        runtimeSupervisor?.lane === 'done' ||
        (runtimeSupervisorText.includes('served-code-equals-HEAD') || runtimeSupervisorText.includes('running commit trust'))
      ) &&
      (runtimeSupervisor?.lane === 'done' || runtimeSupervisorText.includes('auto-restart-on-push')) &&
      (currentPlan.includes('Served-code-equals-HEAD check is live') || currentPlan.includes('Runtime Supervisor service supervision')) &&
      (currentPlan.includes('Add auto-restart-on-push next') || currentPlan.includes('runtime-supervisor-v1')),
    'SYSTEM-010 owns dashboard served-code/deploy freshness follow-up',
    `SYSTEM-010=${systemProcessControl?.lane || 'missing'} / RUNTIME-SUPERVISOR-001=${runtimeSupervisor?.lane || 'missing'}`,
  )

  const extractRetry = (foundationHub.backlogItems || []).find(item => item.id === 'EXTRACT-RETRY-001') || null
  const extractRetryText = [
    extractRetry?.summary,
    extractRetry?.nextAction,
    extractRetry?.statusNote,
  ].filter(Boolean).join('\n')
  const extractRetryParked =
    extractRetry?.lane === 'scoped' &&
    extractRetry?.priority === 'P1' &&
    extractRetryText.includes('retry/backoff') &&
    extractRetryText.includes('failed `source_crawl_items`') &&
    extractRetryText.includes('Partial target runs now exit nonzero') &&
    extractRetryText.includes('Runtime Health shows failed/skipped item summaries')
  const extractRetryActiveOrClosed =
    ['executing', 'done'].includes(extractRetry?.lane) &&
    extractRetry?.priority === 'P1' &&
    extractRetryText.includes('extract-retry-v1') &&
    (
      extractRetryText.includes('retry support honest') ||
      extractRetryText.includes('retry support is now honest') ||
      extractRetryText.includes('failed-item retry support honest')
    )
  ensure(
    checks,
    extractRetryParked || extractRetryActiveOrClosed,
    'failed-item retry/backoff is parked or actively closed through live backlog truth',
    extractRetry
      ? `${extractRetry.lane} / ${extractRetry.priority} / ${extractRetry.title}`
      : 'missing EXTRACT-RETRY-001',
  )

  const extractControl = (foundationHub.backlogItems || []).find(item => item.id === 'EXTRACT-CONTROL-001') || null
  const extractSchedule = (foundationHub.backlogItems || []).find(item => item.id === 'EXTRACT-SCHEDULE-001') || null
  const extractMetrics = (foundationHub.backlogItems || []).find(item => item.id === 'EXTRACT-METRICS-001') || null
  const extractControlText = [
    extractControl?.nextAction,
    extractControl?.statusNote,
  ].filter(Boolean).join('\n')
  const extractScheduleText = [
    extractSchedule?.nextAction,
    extractSchedule?.statusNote,
  ].filter(Boolean).join('\n')
  const extractMetricsText = backlogItemText(extractMetrics)
  ensure(
    checks,
    extractControl?.lane === 'done' &&
      extractControl?.priority === 'P0' &&
      extractControlText.includes('coverage-by-target') &&
      extractControlText.includes('Foundation-job schedule truth') &&
      extractControlText.includes('EXTRACT-RETRY-001') &&
      extractControlText.includes('foundation:verify') &&
      extractSchedule?.lane === 'done' &&
      extractSchedule?.priority === 'P1' &&
      extractScheduleText.includes('crawlCheckpointNextRunAt') &&
      extractScheduleText.includes('job_target_schedule_mismatch') &&
      currentPlan.includes('crawlCheckpointNextRunAt') &&
      currentState.includes('EXTRACT-CONTROL-001 v1 is closed'),
    'extraction schedule truth and control-plane v1 are closed',
    `EXTRACT-CONTROL-001=${extractControl?.lane || 'missing'} / EXTRACT-SCHEDULE-001=${extractSchedule?.lane || 'missing'}`,
  )
  ensure(
    checks,
    extractMetrics?.lane === 'done' &&
      extractMetrics?.priority === 'P1' &&
      extractMetricsText.includes('coverage-by-target') &&
      extractMetricsText.includes('Runtime Health') &&
      extractMetricsText.includes('Missive current-day') &&
      extractMetricsText.includes('missive_conversation') &&
      extractMetricsText.includes('foundation:verify') &&
      extractControlText.includes('Closed on 2026-04-28') &&
      currentState.includes('`EXTRACT-METRICS-001` is done for v1') &&
      currentPlan.includes('docs/audits/2026-04-28-extraction-lane-item-shape.md'),
    'EXTRACT-METRICS-001 closes the coverage-by-target slice with Missive ledger proof',
    extractMetrics
      ? `${extractMetrics.lane} / ${extractMetrics.priority} / ${extractMetrics.title}`
      : 'missing EXTRACT-METRICS-001',
  )

  const strategyLayerCloseout = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-001') || null
  const strategyInputCloseout = (foundationHub.backlogItems || []).find(item => item.id === 'SOURCE-014') || null
  ensure(
    checks,
    strategyLayerCloseout?.lane === 'done' && strategyInputCloseout?.lane === 'done',
    'strategy input package closeout cards match signed-off source reality',
    `FOUNDATION-001=${strategyLayerCloseout?.lane || 'missing'} / SOURCE-014=${strategyInputCloseout?.lane || 'missing'}`,
  )

  const sourceLifecycleContent = (foundationHub.backlogItems || []).find(item => item.id === 'MKT-004') || null
  const systemStrategyReview = (foundationHub.backlogItems || []).find(item => item.id === 'SYSTEM-STRATEGY-REVIEW-001') || null
  const strategyMeetingReady = (foundationHub.backlogItems || []).find(item => item.id === 'STRATEGY-HUB-MEETING-READY-001') || null
  const strategicIntel = (foundationHub.backlogItems || []).find(item => item.id === 'STRATEGIC-INTEL-001') || null
  const intelScoper = (foundationHub.backlogItems || []).find(item => item.id === 'INTEL-SCOPER-001') || null
  const intelThreadContext = (foundationHub.backlogItems || []).find(item => item.id === 'INTEL-THREAD-CONTEXT-001') || null
  const strategyQuarter = (foundationHub.backlogItems || []).find(item => item.id === 'STRATEGY-QUARTER-001') || null
  const modelRouting = (foundationHub.backlogItems || []).find(item => item.id === 'MODEL-ROUTING-001') || null
  const agentFactory = (foundationHub.backlogItems || []).find(item => item.id === 'AGENT-005') || null
  const systemStrategyReviewText = backlogItemText(systemStrategyReview)
  const strategyMeetingReadyText = backlogItemText(strategyMeetingReady)
  const strategicIntelText = backlogItemText(strategicIntel)
  const intelScoperText = backlogItemText(intelScoper)
  const intelThreadContextText = backlogItemText(intelThreadContext)
  const strategyQuarterText = backlogItemText(strategyQuarter)
  const modelRoutingText = backlogItemText(modelRouting)
  const agentFactoryText = backlogItemText(agentFactory)
  ensure(
    checks,
    systemStrategyReview?.lane === 'done' &&
      systemStrategyReviewText.includes('function-vs-form testing') &&
      systemStrategyReviewText.includes('memory-versus-repo-truth discipline') &&
      systemStrategyReviewText.includes('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-04-28-foundation-hard-checkpoint.md') &&
      strategyMeetingReady?.lane === 'done' &&
      strategyMeetingReady?.priority === 'P1' &&
      strategyMeetingReadyText.includes(strategyHubMeetingReadyCloseoutKey) &&
      strategyMeetingReadyText.includes('meeting packet') &&
      strategyMeetingReadyText.includes('source-backed') &&
      strategyMeetingReadyText.includes('AVATAR-IMPORT-001') &&
      strategicIntel?.lane === 'scoped' &&
      strategicIntel?.priority === 'P0' &&
      strategicIntelText.includes('intelligence_strategic_issues') &&
      strategicIntelText.includes('docs/specs/2026-04-28-strategic-intelligence-loop.md') &&
      strategicIntelText.includes('urgency, impact, confidence, and staleness') &&
      strategicIntelText.includes('resolution feedback') &&
      strategicIntelText.includes('blocks `INTEL-SCOPER-001`') &&
      strategicIntelText.includes('>= 5 strategic issues surfaced/week') &&
      strategicIntelText.includes('>= 2 resolved-to-applied/week') &&
      intelScoper?.lane === 'scoped' &&
      intelScoper?.priority === 'P0' &&
      intelScoperText.includes('gap analysis') &&
      intelScoperText.includes('Depends on STRATEGIC-INTEL-001') &&
      intelScoperText.includes('"Scope this"') &&
      intelScoperText.includes('already_answered') &&
      intelScoperText.includes('verified / partial / remaining-gaps sections') &&
      intelScoperText.includes('Every verified claim must cite') &&
      intelScoperText.includes('minimal Agent Spec') &&
      intelThreadContext?.lane === 'scoped' &&
      intelThreadContext?.priority === 'P1' &&
      intelThreadContextText.includes('reply count') &&
      intelThreadContextText.includes('one-message thread') &&
      intelThreadContextText.includes('cross-source corroboration') &&
      strategyQuarter?.lane === 'scoped' &&
      strategyQuarter?.priority === 'P1' &&
      strategyQuarterText.includes('PostgreSQL-backed canonical records') &&
      strategyQuarterText.includes('Strategy Hub owner/admin forms') &&
      strategyQuarterText.includes('strategy-quarter fact types') &&
      strategyQuarterText.includes('quarter context/input layer') &&
      modelRouting?.lane === 'scoped' &&
      modelRouting?.priority === 'P1' &&
      modelRoutingText.includes('docs/rebuild/current-runtime-map.md') &&
      !modelRoutingText.includes('likely in') &&
      modelRoutingText.includes('subscriptions are for humans') &&
      modelRoutingText.includes('official APIs and governed adapters') &&
      agentFactoryText.includes('STRATEGY-QUARTER-001 has been used in production for at least two weekly ownership cycles'),
    'AIOS Strategic Intelligence next-leg cards are pinned with UX, schema, Scoper, quarter-context, model-routing, and agent deferral gates',
    [
      `review=${systemStrategyReview?.lane || 'missing'}`,
      `meeting=${strategyMeetingReady?.lane || 'missing'}`,
      `intel=${strategicIntel?.lane || 'missing'}`,
      `scoper=${intelScoper?.lane || 'missing'}`,
      `thread=${intelThreadContext?.lane || 'missing'}`,
      `quarter=${strategyQuarter?.lane || 'missing'}`,
      `model=${modelRouting?.lane || 'missing'}`,
      `agent=${agentFactory?.lane || 'missing'}`,
    ].join(' / '),
  )
  ensure(
    checks,
    sourceLifecycleContent?.team === 'marketing' &&
      sourceLifecycleContent?.lane === 'research' &&
      /connect, verify, understand, extract, synthesize, route\/action/.test(sourceLifecycleContent?.summary || ''),
    'marketing backlog captures Source Intelligence Lifecycle content idea',
    sourceLifecycleContent ? `${sourceLifecycleContent.lane} / ${sourceLifecycleContent.title}` : 'missing',
  )
  const doneGuardrails = ['DATA-018', 'DATA-019', 'DATA-020'].map(id => (foundationHub.backlogItems || []).find(item => item.id === id))
  ensure(
    checks,
    doneGuardrails.every(item => item?.lane === 'done') &&
      !includesAll(foundationFrontendSource, ['DATA-018, DATA-019']) &&
      includesAll(currentState, ['DATA-018', 'DATA-019', 'DATA-020']),
    'current-state source closeout rows match done Owners/FUB guardrails',
    doneGuardrails.map(item => `${item?.id || 'missing'}=${item?.lane || 'missing'}`).join(' / '),
  )

  const verifierFollowupBacklogAssuranceSplitCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_CARD_ID) || null
  const verifierFollowupBacklogAssuranceSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_CLOSEOUT_KEY) || null
  const verifierFollowupBacklogAssuranceDogfood = buildFoundationVerifierFollowupBacklogAssuranceDogfoodProof()
  const foundationVerifyLineCountAfterFollowupBacklogAssuranceSplit = String(foundationVerifySource || '').split('\n').length
  const followupBacklogDelegationSource = [foundationVerifySource, foundationVerifierFollowupBacklogAssuranceSource].filter(Boolean).join('\n')
  const oldInlineMessages = [
    'Runtime Health simplification card is tracked',
    'Foundation user/access control panel is parked as scoped P1 follow-up',
    'SYSTEM-010 owns dashboard served-code/deploy freshness follow-up',
    'failed-item retry/backoff is parked or actively closed through live backlog truth',
    'AIOS Strategic Intelligence next-leg cards are pinned with UX, schema, Scoper, quarter-context, model-routing, and agent deferral gates',
  ]
  ensure(
    checks,
    verifierFollowupBacklogAssuranceSplitCard &&
      ['executing', 'done'].includes(verifierFollowupBacklogAssuranceSplitCard.lane) &&
      String(verifierFollowupBacklogAssuranceSplitCard.statusNote || '').includes(VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_CLOSEOUT_KEY) &&
      verifierFollowupBacklogAssuranceSplitCloseout?.operatorCloseout === true &&
      (verifierFollowupBacklogAssuranceSplitCloseout.backlogIds || []).includes(VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_CARD_ID) &&
      verifierFollowupBacklogAssuranceDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-followup-backlog-assurance-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_HANDOFF_PATH) &&
      followupBacklogDelegationSource.includes('evaluateFoundationVerifierFollowupBacklogAssurance({') &&
      followupBacklogDelegationSource.includes('followupBacklogAssuranceVerifier.checks') &&
      oldInlineMessages.every(message => !String(foundationVerifySource || '').includes(message)) &&
      foundationVerifyLineCountAfterFollowupBacklogAssuranceSplit < VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_BEFORE_LINES &&
      foundationVerifierFollowupBacklogAssuranceSource.includes('RUNTIME-HEALTH-SIMPLIFY-001') &&
      foundationVerifierFollowupBacklogAssuranceSource.includes('FOUNDATION-USERS-001') &&
      foundationVerifierFollowupBacklogAssuranceSource.includes('EXTRACT-RETRY-001') &&
      foundationVerifierFollowupBacklogAssuranceSource.includes('STRATEGIC-INTEL-001'),
    'VERIFIER-FOLLOWUP-BACKLOG-ASSURANCE-SPLIT-001 extracts follow-up backlog assurance checks into a focused module',
    verifierFollowupBacklogAssuranceSplitCard
      ? `lane=${verifierFollowupBacklogAssuranceSplitCard.lane} dogfood=${verifierFollowupBacklogAssuranceDogfood.ok ? 'pass' : 'blocked'} lines=${VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_BEFORE_LINES}->${foundationVerifyLineCountAfterFollowupBacklogAssuranceSplit}`
      : `missing ${VERIFIER_FOLLOWUP_BACKLOG_ASSURANCE_SPLIT_CARD_ID}`,
  )

  return { checks }
}
