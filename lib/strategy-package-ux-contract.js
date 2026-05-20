export const STRATEGY_009_CARD_ID = 'STRATEGY-009'
export const STRATEGY_009_CLOSEOUT_KEY = 'strategy-009-package-ux-v1'
export const STRATEGY_009_PLAN_PATH = 'docs/process/strategy-009-package-ux-plan.md'
export const STRATEGY_009_APPROVAL_PATH = 'docs/process/approvals/STRATEGY-009.json'
export const STRATEGY_009_SCRIPT_PATH = 'scripts/process-strategy-009-check.mjs'
export const STRATEGY_009_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-strategy-009-package-ux-closeout.md'
export const STRATEGY_009_NEXT_CARD_ID = 'KPI-APPT-QUALITY-001'
export const STRATEGY_009_SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'

export const STRATEGY_009_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    job: 'Command cockpit',
    owns: ['pace readout', 'planning preview', 'meeting preview', 'source status preview'],
    forbidden: ['route actions', 'full route board', 'full planning queues', 'advisor chat'],
  },
  {
    id: 'planning',
    label: 'Planning Workflow',
    job: 'Planning queues',
    owns: ['priority candidates', 'carry-forward candidates', 'stop candidates', 'missing-data gaps'],
    forbidden: ['route actions', 'source card grid', 'advisor chat'],
  },
  {
    id: 'meeting',
    label: 'Meeting Packet',
    job: 'Ownership meeting packet',
    owns: ['agenda', 'pressure cards', 'meeting proof', 'meeting-safe review readout'],
    forbidden: ['route actions', 'full source grid', 'advisor chat'],
  },
  {
    id: 'source-to-gap',
    label: 'Source Truth',
    job: 'Source-to-gap truth',
    owns: ['goal truth', 'operating inputs', 'source proof'],
    forbidden: ['route actions', 'planning queues', 'advisor chat'],
  },
  {
    id: 'route-review',
    label: 'Review Queue',
    job: 'Strategy route decisions',
    owns: ['owner decision controls', 'approve/snooze/ignore/reject controls', 'source proof cards'],
    forbidden: ['planning queues', 'goal card grid as primary content', 'advisor chat'],
  },
]

export const STRATEGY_009_NOT_NEXT_BOUNDARIES = [
  'Do not revive the old Strategy Advisor chat.',
  'Do not add model/provider/browser/auth/private extraction lanes.',
  'Do not auto-apply decisions, auto-create backlog cards, send messages, or mutate external systems.',
  'Do not create new Strategy data products beyond the package UX cleanup.',
  'Do not move route action controls outside Route Review.',
  'Do not work MEETING-VAULT-ACL-001 Phase B from this card.',
  'Do not mutate Google Drive permissions.',
  'Do not work KPI quality cards until this UX card closes cleanly.',
]

export const STRATEGY_009_PROOF_COMMANDS = [
  'node --check lib/strategy-package-ux-contract.js public/strategic-execution.js scripts/process-strategy-009-check.mjs',
  'npm run process:strategy-009-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${STRATEGY_009_CARD_ID} --planApprovalRef=${STRATEGY_009_APPROVAL_PATH} --closeoutKey=${STRATEGY_009_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${STRATEGY_009_CARD_ID} --closeoutKey=${STRATEGY_009_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${STRATEGY_009_CARD_ID} --planApprovalRef=${STRATEGY_009_APPROVAL_PATH} --closeoutKey=${STRATEGY_009_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const STRATEGY_009_CHANGED_FILES = [
  'lib/strategy-package-ux-contract.js',
  'public/strategic-execution.html',
  'public/strategic-execution.js',
  STRATEGY_009_SCRIPT_PATH,
  STRATEGY_009_PLAN_PATH,
  STRATEGY_009_APPROVAL_PATH,
  STRATEGY_009_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

function text(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim()
  return normalized || fallback
}

function includesAll(textValue = '', patterns = []) {
  return patterns.every(pattern => String(textValue || '').includes(pattern))
}

function countMatches(textValue = '', pattern = '') {
  if (!pattern) return 0
  return String(textValue || '').split(pattern).length - 1
}

function extractFunctionSource(source = '', functionName = '') {
  const marker = `function ${functionName}`
  const start = String(source || '').indexOf(marker)
  if (start === -1) return ''
  const next = String(source || '').indexOf('\n  function ', start + marker.length)
  return String(source || '').slice(start, next === -1 ? undefined : next)
}

export function buildStrategyPackageUxContractSnapshot({ htmlSource = '', uiSource = '' } = {}) {
  const navSections = STRATEGY_009_SECTIONS.map(section => ({
    ...section,
    inHtml: String(htmlSource || '').includes(`data-section="${section.id}"`),
    inSectionHash: String(uiSource || '').includes(`'${section.id}'`),
  }))
  const renderAppSource = extractFunctionSource(uiSource, 'renderApp')
  const overviewSource = extractFunctionSource(uiSource, 'renderOverview')
  const planningSource = extractFunctionSource(uiSource, 'renderPlanningWorkflow')
  const meetingSource = extractFunctionSource(uiSource, 'renderMeetingReady')
  const sourceToGapSource = extractFunctionSource(uiSource, 'renderSourceToGap')
  const operatingTruthSource = extractFunctionSource(uiSource, 'renderOperatingTruth')
  const routeReviewSource = extractFunctionSource(uiSource, 'renderRouteReview')
  const routeCardSource = extractFunctionSource(uiSource, 'renderRouteCard')
  const routeControlsSource = extractFunctionSource(uiSource, 'renderRouteControls')

  return {
    sections: navSections,
    sectionIds: STRATEGY_009_SECTIONS.map(section => section.id),
    renderAppSource,
    overviewSource,
    planningSource,
    meetingSource,
    sourceToGapSource,
    operatingTruthSource,
    routeReviewSource,
    routeCardSource,
    routeControlsSource,
    overviewHasFullRoutePreview: overviewSource.includes('renderStrategyQueuePreview('),
    overviewHasRouteActions: overviewSource.includes('renderRouteControls(') || overviewSource.includes('renderRouteCard('),
    planningHasRouteActions: planningSource.includes('renderRouteControls(') || planningSource.includes('renderRouteCard('),
    meetingHasRouteActions: meetingSource.includes('renderRouteControls(') || meetingSource.includes('renderRouteCard('),
    sourceTruthHasRouteActions: sourceToGapSource.includes('renderRouteControls(') ||
      operatingTruthSource.includes('renderRouteControls(') ||
      sourceToGapSource.includes('renderRouteCard(') ||
      operatingTruthSource.includes('renderRouteCard('),
    routeReviewOwnsRouteActions: routeReviewSource.includes('renderRouteCard(route)') &&
      routeCardSource.includes('renderRouteControls(card, route)') &&
      routeControlsSource.includes('Owner decision'),
    oldAdvisorRevived: includesAll(uiSource, [
      '/api/strategic-execution/advisor',
      'renderStrategyAdvisorWorkspace',
    ]) ||
      String(uiSource || '').includes('AI-Suggested 90-Day Priorities') ||
      String(uiSource || '').includes('renderRecommendedPriorities'),
    oldSectionNamesVisible: [
      'Strategy Advisor',
      'Evidence Packet',
      'Supporting Docs',
      'Quarterly Priorities',
      'Strategic Issues',
    ].filter(label => String(htmlSource || '').includes(`>${label}<`)),
    renderAppSectionCount: countMatches(renderAppSource, 'state.section ==='),
    copyContract: {
      strategyCommand: String(uiSource || '').includes('Strategy Command'),
      planningWorkflow: String(uiSource || '').includes('Planning Workflow'),
      meetingPacket: String(uiSource || '').includes('Meeting Packet'),
      sourceToGapManifest: String(uiSource || '').includes('source-to-gap manifest'),
      strategicReview: String(uiSource || '').includes('Strategic review'),
      advisorBlocked: String(uiSource || '').includes('Advisor remains blocked'),
      operatingTasksHidden: String(uiSource || '').includes('Operating tasks stay out of Strategy'),
    },
  }
}

export function evaluateStrategyPackageUxContract(snapshot = {}) {
  const findings = []
  const sections = Array.isArray(snapshot.sections) ? snapshot.sections : []
  const missingHtml = sections.filter(section => !section.inHtml).map(section => section.id)
  const missingHash = sections.filter(section => !section.inSectionHash).map(section => section.id)

  if (missingHtml.length) findings.push(`missing_html_nav:${missingHtml.join(',')}`)
  if (missingHash.length) findings.push(`missing_section_hash:${missingHash.join(',')}`)
  if (!snapshot.renderAppSource || Number(snapshot.renderAppSectionCount || 0) < 4) findings.push('render_app_section_router_incomplete')
  if (snapshot.overviewHasFullRoutePreview) findings.push('overview_duplicates_route_review_board')
  if (snapshot.overviewHasRouteActions) findings.push('overview_has_route_actions')
  if (snapshot.planningHasRouteActions) findings.push('planning_has_route_actions')
  if (snapshot.meetingHasRouteActions) findings.push('meeting_has_route_actions')
  if (snapshot.sourceTruthHasRouteActions) findings.push('source_truth_has_route_actions')
  if (!snapshot.routeReviewOwnsRouteActions) findings.push('route_review_does_not_own_actions')
  if (snapshot.oldAdvisorRevived) findings.push('old_advisor_or_recommendation_surface_revived')
  if ((snapshot.oldSectionNamesVisible || []).length) findings.push(`old_strategy_package_nav_visible:${snapshot.oldSectionNamesVisible.join(',')}`)

  const copy = snapshot.copyContract || {}
  for (const key of [
    'strategyCommand',
    'planningWorkflow',
    'meetingPacket',
    'sourceToGapManifest',
    'strategicReview',
    'advisorBlocked',
    'operatingTasksHidden',
  ]) {
    if (copy[key] !== true) findings.push(`missing_copy_contract:${key}`)
  }

  return {
    ok: findings.length === 0,
    status: findings.length ? 'fail' : 'pass',
    findings,
    summary: {
      sectionCount: sections.length,
      missingHtmlCount: missingHtml.length,
      missingHashCount: missingHash.length,
      overviewHasFullRoutePreview: Boolean(snapshot.overviewHasFullRoutePreview),
      routeReviewOwnsRouteActions: Boolean(snapshot.routeReviewOwnsRouteActions),
      oldAdvisorRevived: Boolean(snapshot.oldAdvisorRevived),
      oldSectionNameCount: (snapshot.oldSectionNamesVisible || []).length,
    },
  }
}

function evaluateStrategyPackageUxFixture(fixture = {}) {
  return evaluateStrategyPackageUxContract({
    sections: fixture.sections || STRATEGY_009_SECTIONS.map(section => ({ ...section, inHtml: true, inSectionHash: true })),
    renderAppSource: fixture.renderAppSource ?? 'if (state.section === source-to-gap) {} state.section === planning state.section === meeting state.section === route-review',
    renderAppSectionCount: fixture.renderAppSectionCount ?? 4,
    overviewHasFullRoutePreview: Boolean(fixture.overviewHasFullRoutePreview),
    overviewHasRouteActions: Boolean(fixture.overviewHasRouteActions),
    planningHasRouteActions: Boolean(fixture.planningHasRouteActions),
    meetingHasRouteActions: Boolean(fixture.meetingHasRouteActions),
    sourceTruthHasRouteActions: Boolean(fixture.sourceTruthHasRouteActions),
    routeReviewOwnsRouteActions: fixture.routeReviewOwnsRouteActions !== false,
    oldAdvisorRevived: Boolean(fixture.oldAdvisorRevived),
    oldSectionNamesVisible: fixture.oldSectionNamesVisible || [],
    copyContract: {
      strategyCommand: fixture.copyContract?.strategyCommand !== false,
      planningWorkflow: fixture.copyContract?.planningWorkflow !== false,
      meetingPacket: fixture.copyContract?.meetingPacket !== false,
      sourceToGapManifest: fixture.copyContract?.sourceToGapManifest !== false,
      strategicReview: fixture.copyContract?.strategicReview !== false,
      advisorBlocked: fixture.copyContract?.advisorBlocked !== false,
      operatingTasksHidden: fixture.copyContract?.operatingTasksHidden !== false,
    },
  })
}

export function buildStrategyPackageUxDogfoodProof() {
  const healthy = evaluateStrategyPackageUxFixture()
  const rejected = {
    duplicateOverviewRouteBoard: evaluateStrategyPackageUxFixture({ overviewHasFullRoutePreview: true }),
    overviewRouteActions: evaluateStrategyPackageUxFixture({ overviewHasRouteActions: true }),
    planningRouteActions: evaluateStrategyPackageUxFixture({ planningHasRouteActions: true }),
    missingNavSection: evaluateStrategyPackageUxFixture({
      sections: STRATEGY_009_SECTIONS.map(section => ({
        ...section,
        inHtml: section.id !== 'planning',
        inSectionHash: true,
      })),
    }),
    advisorRevived: evaluateStrategyPackageUxFixture({ oldAdvisorRevived: true }),
    routeReviewMissingControls: evaluateStrategyPackageUxFixture({ routeReviewOwnsRouteActions: false }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    summary: {
      sectionCount: STRATEGY_009_SECTIONS.length,
      rejectedCount: Object.values(rejected).filter(result => result.ok === false).length,
      duplicateOverviewRejected: rejected.duplicateOverviewRouteBoard.ok === false,
      advisorRevivalRejected: rejected.advisorRevived.ok === false,
      routeControlLeakRejected: rejected.overviewRouteActions.ok === false && rejected.planningRouteActions.ok === false,
    },
    dogfoodInvariant: ok
      ? 'healthy Strategy package UX passes; duplicate overview route board, route-control leaks, missing nav sections, revived advisor, and missing Route Review controls fail closed'
      : 'Strategy package UX dogfood did not reject every known package drift fixture',
  }
}

export function buildStrategyPackageSectionReadout() {
  return STRATEGY_009_SECTIONS.map(section => ({
    id: section.id,
    label: section.label,
    job: section.job,
    owns: section.owns.map(item => text(item)),
    forbidden: section.forbidden.map(item => text(item)),
  }))
}
