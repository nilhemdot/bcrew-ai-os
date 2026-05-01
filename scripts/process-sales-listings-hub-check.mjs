#!/usr/bin/env node
import {
  SALES_LISTING_SOURCE,
  buildSalesListingInventory,
} from '../lib/sales-listing-inventory.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const report = await buildSalesListingInventory()

assert(report.source.sourceId === 'SRC-CLICKUP-001', 'Sales listing inventory must be source-backed by SRC-CLICKUP-001.')
assert(report.source.listId === SALES_LISTING_SOURCE.listId, 'Sales listing inventory used the wrong ClickUp list.')
assert(report.source.viewId === SALES_LISTING_SOURCE.viewId, 'Sales listing inventory must point to the Full Deal List view.')
assert(report.thresholdDays === 30, 'Stale listing threshold must be 30 days.')
assert(report.rule.plainEnglish.includes('Deal Status = Active'), 'Active-stage rule must be visible in the report.')
assert(report.summary.totalTasksRead > 0, 'ClickUp Deal Data Entry returned no tasks.')
assert(report.summary.activeListings >= 0, 'Active listing count is invalid.')

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

const duplicatePrimaryRows = new Set()
for (const group of report.groups) {
  assert(group.agent, 'Every stale group needs an agent label.')
  for (const listing of group.listings) {
    assert(!duplicatePrimaryRows.has(listing.taskId), `Listing ${listing.taskId} appears in more than one primary group.`)
    duplicatePrimaryRows.add(listing.taskId)
  }
}

console.log(JSON.stringify({
  status: 'healthy',
  sourceId: report.source.sourceId,
  listId: report.source.listId,
  viewId: report.source.viewId,
  thresholdDays: report.thresholdDays,
  activeListings: report.summary.activeListings,
  staleActiveListings: report.summary.staleActiveListings,
  agentsWithStaleListings: report.summary.agentsWithStaleListings,
  missingResetDate: report.summary.missingResetDate,
  missingAgent: report.summary.missingAgent,
  kpiShoppingListActiveRows: report.shoppingList.activeRows,
  kpiShoppingListMatches: report.shoppingList.matched,
  actionPlanFound: report.shoppingList.withActionPlan,
  actionPlanMissing: report.shoppingList.missingActionPlan,
  actionPlanUnmatched: report.shoppingList.unmatched,
}, null, 2))
