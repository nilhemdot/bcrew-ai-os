#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import {
  SALES_LISTING_SOURCE,
  buildGlsScoreboard,
  buildSalesListingInventory,
} from '../lib/sales-listing-inventory.js'
import { syncSalesListingCasesFromInventory } from '../lib/sales-listing-cases.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

let report = await buildSalesListingInventory()
const caseSync = await syncSalesListingCasesFromInventory(report, {
  actor: 'process:sales-listings-hub-check',
})
if (caseSync.totalTouched > 0) {
  report = await buildSalesListingInventory()
}
const salesHtml = await readFile(new URL('../public/sales.html', import.meta.url), 'utf8')
const salesJs = await readFile(new URL('../public/sales.js', import.meta.url), 'utf8')

assert(report.source.sourceId === 'SRC-CLICKUP-001', 'Sales listing inventory must be source-backed by SRC-CLICKUP-001.')
assert(report.source.listId === SALES_LISTING_SOURCE.listId, 'Sales listing inventory used the wrong ClickUp list.')
assert(report.source.viewId === SALES_LISTING_SOURCE.viewId, 'Sales listing inventory must point to the Full Deal List view.')
assert(report.thresholdDays === 30, 'Stale listing threshold must be 30 days.')
assert(report.system?.key === 'gls', 'Sales Hub listing workflow must be grouped as the GLS System.')
assert(report.system?.fullName === 'Get Listings Sold', 'GLS System must expose its plain-English name.')
assert(Array.isArray(report.system?.workflow) && report.system.workflow.length >= 6, 'GLS System must expose the workflow stages.')
assert(Array.isArray(report.system?.playbooks) && report.system.playbooks.some(item => item.key === 'aggressive-underlisting'), 'GLS System must expose the Aggressive Underlisting Playbook.')
assert((salesHtml.match(/class="found-nav-item"/g) || []).length === 2, 'Sales Hub sidebar should stay tight: Dashboard and GLS System only.')
assert(salesHtml.includes('href="#gls-system"'), 'Sales Hub sidebar must link to the grouped GLS System work surface.')
assert(salesJs.includes('/api/sales-hub?refresh=1'), 'Sales Hub saves must force a fresh post-write reload instead of showing stale cached data.')
assert(salesJs.includes('sales-save-status'), 'Sales Hub must show explicit save/failure status for GLS writes.')
assert(salesJs.includes('Outcome: '), 'Sales Hub listings and projects must expose outcome/sold state in the work surface.')
assert(salesJs.includes('Moved / sold cases'), 'Sales Hub dashboard must expose tracked moved/sold GLS cases without adding another menu item.')
assert(salesJs.includes('Active GLS pipeline'), 'GLS dashboard must expose unresolved active GLS pipeline counts.')
assert(salesJs.includes('Resolved GLS results'), 'GLS dashboard must expose resolved GLS result counts.')
assert(salesJs.includes('Sales leader scoreboard'), 'GLS dashboard must expose sales leader performance.')
assert(salesJs.includes('All-time conversion funnel'), 'GLS dashboard must expose the all-time conversion funnel.')
assert(salesJs.includes('Weekly cohort view'), 'GLS dashboard must expose weekly cohort progress.')
assert(salesJs.includes('formatDualCount'), 'GLS scoreboard must show listing count and grouped case count together.')
assert(salesJs.includes('Adjusted') && salesJs.includes('Sold'), 'GLS top scoreboard must split adjusted and sold counts.')
assert(report.rule.plainEnglish.includes('Deal Status = Active'), 'Active-stage rule must be visible in the report.')
assert(report.summary.totalTasksRead > 0, 'ClickUp Deal Data Entry returned no tasks.')
assert(report.summary.activeListings >= 0, 'Active listing count is invalid.')
assert(report.summary.totalTasksRead >= report.summary.activeListings, 'ClickUp read must cover the current active listing list.')

const nonActiveStale = report.staleListings.filter(item => item.activeStage !== SALES_LISTING_SOURCE.activeStageValue || !item.isActiveListing)
assert(nonActiveStale.length === 0, 'Stale listings must include only active-market listings.')

const tooYoung = report.staleListings.filter(item => !Number.isFinite(item.daysSinceReset) || item.daysSinceReset < 30)
assert(tooYoung.length === 0, 'Stale listings must be 30+ days since list date / last price adjustment.')

const groupTotal = report.groups.reduce((sum, group) => sum + group.staleCount, 0)
assert(groupTotal === report.summary.staleActiveListings, 'Agent group stale counts do not match the summary.')
assert(report.shoppingList?.available === true, 'KPI Shopping List match source must be available.')
assert(report.shoppingList.activeRows > 0, 'KPI Shopping List active rows were not read.')
assert(
  report.shoppingList.matched + report.shoppingList.unmatched === report.summary.staleActiveListings,
  'KPI Shopping List match counts must cover every stale active listing.'
)
assert(
  report.shoppingList.withActionPlan + report.shoppingList.missingActionPlan === report.shoppingList.matched,
  'KPI Shopping List action-plan counts must equal matched stale listings.'
)
assert(Array.isArray(report.salesLeaders), 'Sales leader options must be present.')
assert(report.salesLeaders.length === 5, 'Sales Hub must expose the five approved sales leaders.')
for (const leader of ['ryan', 'blake', 'nick', 'scott', 'steve']) {
  assert(report.salesLeaders.some(item => item.key === leader), `Missing sales leader option: ${leader}.`)
}
assert(report.assignmentSummary, 'Sales leader assignment summary must be present.')
assert(
  report.assignmentSummary.assigned + report.assignmentSummary.unassigned === report.summary.staleActiveListings,
  'Assigned and unassigned stale listings must equal the stale active listing count.'
)
assert(
  Array.isArray(report.assignmentSummary.assignedByLeader) && report.assignmentSummary.assignedByLeader.length === 5,
  'Assignment summary must include counts for all five sales leaders.'
)
assert(Array.isArray(report.caseStatusOptions) && report.caseStatusOptions.length >= 6, 'Sales listing case status options must be present.')
assert(Array.isArray(report.outcomeStatusOptions) && report.outcomeStatusOptions.length >= 6, 'Sales listing outcome status options must be present.')
assert(Array.isArray(report.actionPlanStateOptions) && report.actionPlanStateOptions.length === 3, 'Sales listing action-plan yes/no options must be present.')
for (const state of ['unknown', 'yes', 'no']) {
  assert(report.actionPlanStateOptions.some(item => item.key === state), `Missing action-plan state option: ${state}.`)
}
assert(Array.isArray(report.trackedCases), 'Tracked sales listing cases must be present.')
assert(Array.isArray(report.projectSuggestions), 'GLS project merge suggestions must be present.')
assert(report.summary.projectMergeSuggestions === report.projectSuggestions.length, 'GLS project suggestion count must match the summary.')
for (const project of report.projectSuggestions) {
  assert(project.key && project.baseAddress && project.agent, 'Every GLS project suggestion needs a stable key, base address, and agent.')
  assert(project.listingCount >= 2, 'Every GLS project suggestion must include at least two listings.')
  assert(Array.isArray(project.taskIds) && project.taskIds.length === project.listingCount, 'Every GLS project suggestion must expose all task IDs.')
  assert(Array.isArray(project.listings) && project.listings.length === project.listingCount, 'Every GLS project suggestion must expose member listings.')
}
assert(report.summary.trackedCases >= report.summary.staleActiveListings, 'Tracked cases must cover current stale active listings after case sync.')
assert(
  report.summary.caseActionPlanYes + report.summary.caseActionPlanNo + report.summary.caseActionPlanUnknown === report.summary.trackedCases,
  'Action-plan yes/no/unknown counts must equal tracked cases.'
)
assert(report.summary.caseAgentConnected >= 0, 'GLS agent-connected count must be present.')
assert(report.summary.caseImplemented >= 0, 'GLS implemented count must be present.')
assert(report.scoreboard, 'GLS scoreboard must be present in the Sales Hub report.')
assert(report.scoreboard.currentActive.listingCount === report.summary.staleActiveListings, 'Current active GLS listing count must match current stale active listings.')
assert(report.scoreboard.currentActive.caseCount <= report.scoreboard.currentActive.listingCount, 'Grouped GLS case count must not exceed raw listing count.')
assert(report.scoreboard.allTimeFunnel.identified.listingCount === report.summary.trackedCases, 'All-time identified listing count must come from persisted GLS cases.')
assert(report.scoreboard.allTimeFunnel.identified.caseCount <= report.scoreboard.allTimeFunnel.identified.listingCount, 'All-time identified case count must be grouped, not inflated by listing units.')
assert(report.scoreboard.activePipeline.total.caseCount + report.scoreboard.resolvedResults.total.caseCount === report.scoreboard.allTimeFunnel.identified.caseCount, 'Active plus resolved GLS cases must equal all-time identified cases.')
assert(report.scoreboard.activePipeline.total.caseCount === report.summary.activePipelineCases, 'Active pipeline case summary must match scoreboard.')
assert(report.scoreboard.resolvedResults.total.caseCount === report.summary.resolvedGlsCases, 'Resolved GLS case summary must match scoreboard.')
assert(Array.isArray(report.scoreboard.activePipeline.stages) && report.scoreboard.activePipeline.stages.length >= 5, 'Active pipeline stages must be present.')
assert(Array.isArray(report.scoreboard.leaderPerformance) && report.scoreboard.leaderPerformance.length >= 5, 'Sales leader performance rows must be present.')
assert(Array.isArray(report.scoreboard.weeklyCohorts), 'GLS weekly cohort rows must be present.')
assert(Array.isArray(report.scoreboard.movedSoldCases), 'GLS moved/sold case list must be present.')

const currentProjectListingCount = (report.scoreboard.currentActive.groupedProjectCases || []).reduce((sum, project) => sum + project.listingCount, 0)
const currentProjectCaseCount = (report.scoreboard.currentActive.groupedProjectCases || []).reduce((sum, project) => sum + project.caseCount, 0)
assert(currentProjectCaseCount <= currentProjectListingCount, 'Grouped project cases must collapse multiple listings into fewer cases.')

const nickProject = (report.scoreboard.currentActive.groupedProjectCases || []).find(project => /nick/i.test(project.agent) && project.listingCount >= 7)
if (nickProject) {
  assert(nickProject.caseCount === 1, 'Nick grouped project must count as one GLS case.')
}

const syntheticNickListings = Array.from({ length: 7 }, (_item, index) => ({
  taskId: `synthetic-nick-${index + 1}`,
  title: `${index + 1}-1020 Goderich St`,
  agent: 'Nick Bergmann',
  resetDate: '2026-03-01',
  daysSinceReset: 61,
  salesLeaderAssignment: {
    assignedLeaderKey: 'nick',
    assignedLeaderName: 'Nick Bergmann',
    caseStatus: 'assigned',
    outcomeStatus: 'open',
    actionPlanState: 'unknown',
    firstSeenStaleDate: '2026-04-01',
    staleSinceDate: '2026-03-31',
    originalResetDate: '2026-03-01',
    currentResetDate: '2026-03-01',
  },
}))
const syntheticClosedCase = {
  clickUpTaskId: 'synthetic-closed-1',
  listingTitle: '18 Closed Example Ave',
  agentName: 'Closed Agent',
  assignedLeaderKey: 'ryan',
  assignedLeaderName: 'Ryan Campbell',
  caseStatus: 'closed',
  outcomeStatus: 'closed',
  firstSeenStaleDate: '2026-03-15',
  staleSinceDate: '2026-03-14',
  originalResetDate: '2026-02-12',
  currentResetDate: '2026-02-12',
  updatedAt: '2026-04-20T12:00:00.000Z',
  metadata: { clickUpStatus: 'Closed', activeStage: 'Closed' },
}
const syntheticAdjustedCase = {
  clickUpTaskId: 'synthetic-adjusted-1',
  listingTitle: '44 Adjusted Example Rd',
  agentName: 'Adjusted Agent',
  assignedLeaderKey: 'blake',
  assignedLeaderName: 'Blake Berfelz',
  caseStatus: 'adjusted',
  outcomeStatus: 'adjusted',
  firstSeenStaleDate: '2026-03-20',
  staleSinceDate: '2026-03-19',
  originalResetDate: '2026-02-17',
  currentResetDate: '2026-04-05',
  adjustedAt: '2026-04-05',
  adjustmentDetectedAt: '2026-04-05T12:00:00.000Z',
  updatedAt: '2026-04-05T12:00:00.000Z',
  metadata: { clickUpStatus: 'Open', activeStage: 'Active' },
}
const syntheticScoreboard = buildGlsScoreboard({
  staleListings: syntheticNickListings,
  trackedCases: [
    ...syntheticNickListings.map(listing => ({
      clickUpTaskId: listing.taskId,
      listingTitle: listing.title,
      agentName: listing.agent,
      ...listing.salesLeaderAssignment,
    })),
    syntheticClosedCase,
    syntheticAdjustedCase,
  ],
  salesLeaders: report.salesLeaders,
  todayKey: '2026-05-01',
})
assert(syntheticScoreboard.currentActive.listingCount === 7, 'Synthetic Nick proof must start with seven listing opportunities.')
assert(syntheticScoreboard.currentActive.caseCount === 1, 'Synthetic Nick proof must collapse seven units into one grouped GLS case.')
assert(syntheticScoreboard.activePipeline.total.caseCount === 1, 'Synthetic active pipeline must include only unresolved grouped cases.')
assert(syntheticScoreboard.resolvedResults.total.caseCount === 2, 'Synthetic resolved results must include adjusted and sold/closed cases.')
assert(syntheticScoreboard.resolvedResults.adjustedRelisted.caseCount === 1, 'Synthetic adjusted case must move into resolved results.')
assert(syntheticScoreboard.allTimeFunnel.soldClosed.listingCount === 1, 'Synthetic sold proof must count the sold listing.')
assert(syntheticScoreboard.allTimeFunnel.soldClosed.caseCount === 1, 'Synthetic sold proof must count the sold case.')
assert(syntheticScoreboard.movedSoldCases.some(item => item.key.includes('closed agent') && item.currentOutcome === 'closed'), 'Synthetic sold/closed case must remain visible from persisted history.')
assert(syntheticScoreboard.leaderPerformance.some(item => item.key === 'blake' && item.adjustedCases === 1 && item.resolvedCases === 1), 'Sales leader scoreboard must credit resolved adjusted cases to the leader.')

const duplicatePrimaryRows = new Set()
for (const group of report.groups) {
  assert(group.agent, 'Every stale group needs an agent label.')
  for (const listing of group.listings) {
    assert(!duplicatePrimaryRows.has(listing.taskId), `Listing ${listing.taskId} appears in more than one primary group.`)
    duplicatePrimaryRows.add(listing.taskId)
    assert(listing.salesLeaderAssignment, `Listing ${listing.taskId} is missing sales leader assignment state.`)
  }
}

console.log(JSON.stringify({
  status: 'healthy',
  sourceId: report.source.sourceId,
  listId: report.source.listId,
  viewId: report.source.viewId,
  caseSync,
  thresholdDays: report.thresholdDays,
  activeListings: report.summary.activeListings,
  staleActiveListings: report.summary.staleActiveListings,
  agentsWithStaleListings: report.summary.agentsWithStaleListings,
  projectMergeSuggestions: report.summary.projectMergeSuggestions,
  missingResetDate: report.summary.missingResetDate,
  missingAgent: report.summary.missingAgent,
  kpiShoppingListActiveRows: report.shoppingList.activeRows,
  kpiShoppingListMatches: report.shoppingList.matched,
  actionPlanFound: report.shoppingList.withActionPlan,
  actionPlanMissing: report.shoppingList.missingActionPlan,
  actionPlanUnmatched: report.shoppingList.unmatched,
  salesLeaders: report.salesLeaders.map(leader => leader.key),
  assignedSalesLeader: report.assignmentSummary.assigned,
  unassignedSalesLeader: report.assignmentSummary.unassigned,
  currentActiveGlsCases: report.scoreboard.currentActive.caseCount,
  groupedProjectCases: report.scoreboard.currentActive.groupedProjectCases,
  trackedCases: report.summary.trackedCases,
  allTimeIdentifiedListings: report.scoreboard.allTimeFunnel.identified.listingCount,
  allTimeIdentifiedCases: report.scoreboard.allTimeFunnel.identified.caseCount,
  allTimeTakenOnCases: report.scoreboard.allTimeFunnel.takenOn.caseCount,
  activePipelineCases: report.scoreboard.activePipeline.total.caseCount,
  resolvedGlsCases: report.scoreboard.resolvedResults.total.caseCount,
  allTimeAdjustedCases: report.scoreboard.allTimeFunnel.adjustedRelisted.caseCount,
  allTimeSoldCases: report.scoreboard.allTimeFunnel.soldClosed.caseCount,
  leaderPerformance: report.scoreboard.leaderPerformance.map(row => ({
    key: row.key,
    activeCases: row.activeCases,
    resolvedCases: row.resolvedCases,
    adjustedCases: row.adjustedCases,
    soldCases: row.soldCases,
    resolutionRate: row.resolutionRate,
  })),
  weeklyCohorts: report.scoreboard.weeklyCohorts.slice(0, 4),
  movedSoldCases: report.scoreboard.movedSoldCases.length,
  syntheticNickSevenListingsOneCase: syntheticScoreboard.currentActive.caseCount,
  syntheticSoldClosedVisibleAfterLeavingActive: syntheticScoreboard.movedSoldCases.length,
  caseAgentConnected: report.summary.caseAgentConnected,
  caseActionPlansCreated: report.summary.caseActionPlansCreated,
  caseActionPlanYes: report.summary.caseActionPlanYes,
  caseActionPlanNo: report.summary.caseActionPlanNo,
  caseActionPlanUnknown: report.summary.caseActionPlanUnknown,
  caseImplemented: report.summary.caseImplemented,
  caseAdjustedOrMoved: report.summary.caseAdjustedOrMoved,
}, null, 2))
