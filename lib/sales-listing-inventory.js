import { clickUpGet, getClickUpFieldMap, listClickUpTasks, normalizeClickUpText } from './clickup.js'
import { listSalesListingAssignments, listSalesListingCases } from './foundation-db.js'
import { buildKpiShoppingListMatchContext, findShoppingListMatch } from './kpi-shopping-list.js'
import {
  buildSalesListingCaseSummary,
  buildSalesListingAssignmentSummary,
  getSalesListingCaseStatusOptions,
  getSalesListingOutcomeStatusOptions,
  getSafeSalesLeaderOptions,
  mergeSalesListingAssignments,
  sanitizeSalesListingCase,
} from './sales-listing-assignments.js'

export const SALES_LISTING_SOURCE = {
  sourceId: 'SRC-CLICKUP-001',
  sourceName: 'ClickUp Deal Data Entry',
  listId: process.env.CLICKUP_DEAL_DATA_ENTRY_LIST_ID || '901112153939',
  viewId: '8chw3b6-33791',
  viewName: 'Full Deal List',
  resetDateField: 'List Date / Date of Last Price Adjustment',
  activeStageField: '❗ Deal Status',
  activeStageValue: 'Active',
  agentField: '👤 Agent',
  staleDays: 30,
}

const AGENT_FALLBACK_FIELDS = [
  '👤 Agent',
  'Agent Assigned',
  'Requestor (Agent)',
  'Seller Agent',
  'Agents',
]

const PRICE_FIELDS = [
  'Listing Price',
  'List Price',
  'Sale Price',
]

const ACTION_PLAN_FIELDS = [
  'Stale Listing Action Plan Status',
  'Listing Action Plan Status',
  'Action Plan Status',
  'Price Adjustment Action Plan',
  'Listing Action Plan',
]

function normalizeKey(value) {
  return normalizeClickUpText(value).toLowerCase()
}

function getTorontoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value
    return acc
  }, {})
  return `${parts.year}-${parts.month}-${parts.day}`
}

function parseDateKey(value) {
  const raw = normalizeClickUpText(value)
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || !month || !day) return null
  return { key: raw, utcMs: Date.UTC(year, month - 1, day) }
}

function daysSinceDateKey(dateKey, todayKey) {
  const reset = parseDateKey(dateKey)
  const today = parseDateKey(todayKey)
  if (!reset || !today) return null
  return Math.floor((today.utcMs - reset.utcMs) / 86400000)
}

function firstFieldValue(fieldMap, names) {
  for (const name of names) {
    const value = normalizeClickUpText(fieldMap.get(name))
    if (value) return { name, value }
  }
  return { name: names[0] || '', value: '' }
}

function taskUrl(task) {
  return task.url || (task.id ? `https://app.clickup.com/t/${task.id}` : '')
}

function isOpenTaskStatus(task) {
  const status = normalizeKey(task?.status?.status)
  const type = normalizeKey(task?.status?.type)
  if (['closed', 'done'].includes(type)) return false
  if (/(closed|firm|sold|cancel|complete|inactive|non-relevent|non-relevant)/.test(status)) return false
  return true
}

function isActiveListing(fieldMap, task) {
  const stage = normalizeClickUpText(fieldMap.get(SALES_LISTING_SOURCE.activeStageField))
  return normalizeKey(stage) === normalizeKey(SALES_LISTING_SOURCE.activeStageValue) && isOpenTaskStatus(task)
}

function toListingRecord(task, todayKey) {
  const fieldMap = getClickUpFieldMap(task)
  const resetDate = normalizeClickUpText(fieldMap.get(SALES_LISTING_SOURCE.resetDateField))
  const stage = normalizeClickUpText(fieldMap.get(SALES_LISTING_SOURCE.activeStageField))
  const agent = firstFieldValue(fieldMap, AGENT_FALLBACK_FIELDS)
  const price = firstFieldValue(fieldMap, PRICE_FIELDS)
  const actionPlan = firstFieldValue(fieldMap, ACTION_PLAN_FIELDS)
  const daysSinceReset = daysSinceDateKey(resetDate, todayKey)
  const active = isActiveListing(fieldMap, task)
  const stale = active && Number.isFinite(daysSinceReset) && daysSinceReset >= SALES_LISTING_SOURCE.staleDays

  return {
    taskId: task.id || '',
    title: task.name || 'Untitled listing',
    url: taskUrl(task),
    clickUpStatus: task.status?.status || '',
    activeStage: stage,
    isActiveListing: active,
    resetDate,
    daysSinceReset,
    agent: agent.value || 'Unassigned',
    agentField: agent.name,
    price: price.value,
    priceField: price.value ? price.name : '',
    actionPlanStatus: actionPlan.value,
    actionPlanField: actionPlan.value ? actionPlan.name : '',
    stale,
    classification: stale
      ? 'stale_needs_action'
      : active
        ? 'active_current_or_recently_adjusted'
        : 'not_active_market_listing',
    warnings: [
      !resetDate ? 'missing_reset_date' : '',
      !agent.value ? 'missing_agent' : '',
      actionPlan.value ? '' : 'action_plan_status_not_tracked',
    ].filter(Boolean),
  }
}

function groupStaleListings(listings) {
  const map = new Map()
  listings
    .filter(item => item.stale)
    .forEach(item => {
      if (!map.has(item.agent)) {
        map.set(item.agent, {
          agent: item.agent,
          staleCount: 0,
          oldestDays: 0,
          listings: [],
        })
      }
      const group = map.get(item.agent)
      group.staleCount += 1
      group.oldestDays = Math.max(group.oldestDays, item.daysSinceReset || 0)
      group.listings.push(item)
    })

  return Array.from(map.values())
    .map(group => ({
      ...group,
      listings: group.listings.sort((left, right) => (right.daysSinceReset || 0) - (left.daysSinceReset || 0)),
    }))
    .sort((left, right) => right.staleCount - left.staleCount || right.oldestDays - left.oldestDays || left.agent.localeCompare(right.agent))
}

function buildFieldTracking(snapshot) {
  const fieldNames = new Set((snapshot.fields || []).map(field => field.name))
  return {
    resetDate: fieldNames.has(SALES_LISTING_SOURCE.resetDateField),
    activeStage: fieldNames.has(SALES_LISTING_SOURCE.activeStageField),
    agent: fieldNames.has(SALES_LISTING_SOURCE.agentField),
    actionPlan: ACTION_PLAN_FIELDS.find(name => fieldNames.has(name)) || null,
    recommendedFields: [
      'Stale Listing Action Plan Status',
      'Stale Listing Action Plan Link',
      'Last Sales Leader Review Date',
      'Price Adjustment Outcome',
      'Moved / Sold Outcome',
    ],
  }
}

async function getSalesListingSnapshot() {
  const [list, fieldsPayload, tasks] = await Promise.all([
    clickUpGet(`/list/${SALES_LISTING_SOURCE.listId}`),
    clickUpGet(`/list/${SALES_LISTING_SOURCE.listId}/field`),
    listClickUpTasks(SALES_LISTING_SOURCE.listId, { includeClosed: false }),
  ])

  return {
    list,
    fields: fieldsPayload.fields || [],
    tasks,
  }
}

export async function buildSalesListingInventory(options = {}) {
  const todayKey = options.todayKey || getTorontoDateKey(options.now || new Date())
  const snapshot = options.snapshot || await getSalesListingSnapshot()
  const listings = (snapshot.tasks || []).map(task => toListingRecord(task, todayKey))
  const activeListings = listings.filter(item => item.isActiveListing)
  const staleListings = activeListings.filter(item => item.stale)
  let shoppingList = null
  try {
    const context = await buildKpiShoppingListMatchContext(staleListings)
    staleListings.forEach(listing => {
      listing.shoppingListMatch = findShoppingListMatch(listing, context.rows)
    })
    shoppingList = {
      available: true,
      sourceId: context.sourceId,
      table: context.table,
      activeRows: context.activeRows,
      matchingRule: context.matchingRule,
      matched: staleListings.filter(item => item.shoppingListMatch?.status !== 'unmatched').length,
      withActionPlan: staleListings.filter(item => item.shoppingListMatch?.status === 'matched_action_plan').length,
      missingActionPlan: staleListings.filter(item => item.shoppingListMatch?.status === 'matched_missing_action_plan').length,
      unmatched: staleListings.filter(item => item.shoppingListMatch?.status === 'unmatched').length,
    }
  } catch (error) {
    staleListings.forEach(listing => {
      listing.shoppingListMatch = {
        status: 'source_unavailable',
        confidence: 0,
        reason: error instanceof Error ? error.message : 'KPI Shopping List could not be read.',
      }
    })
    shoppingList = {
      available: false,
      sourceId: 'SRC-SUPABASE-001',
      table: 'leads',
      activeRows: 0,
      matched: 0,
      withActionPlan: 0,
      missingActionPlan: 0,
      unmatched: staleListings.length,
      error: error instanceof Error ? error.message : 'KPI Shopping List could not be read.',
    }
  }
  const assignmentRecords = await listSalesListingAssignments(staleListings.map(item => item.taskId))
  const trackedCasesRaw = await listSalesListingCases()
  const staleListingsWithAssignments = mergeSalesListingAssignments(staleListings, assignmentRecords)
  const assignmentSummary = buildSalesListingAssignmentSummary(staleListingsWithAssignments)
  const trackedCases = trackedCasesRaw.map(sanitizeSalesListingCase)
  const caseSummary = buildSalesListingCaseSummary(trackedCases)
  const recentResets = activeListings.filter(item => Number.isFinite(item.daysSinceReset) && item.daysSinceReset >= 0 && item.daysSinceReset < SALES_LISTING_SOURCE.staleDays)
  const missingResetDate = activeListings.filter(item => !item.resetDate)
  const missingAgent = activeListings.filter(item => !item.agent || item.agent === 'Unassigned')
  const groups = groupStaleListings(staleListingsWithAssignments)
  const fieldTracking = buildFieldTracking(snapshot)

  return {
    generatedAt: new Date().toISOString(),
    today: todayKey,
    thresholdDays: SALES_LISTING_SOURCE.staleDays,
    source: {
      ...SALES_LISTING_SOURCE,
      listName: snapshot.list?.name || 'Deal Data Entry',
      clickUpViewUrl: `https://app.clickup.com/9011334502/v/l/${SALES_LISTING_SOURCE.viewId}`,
    },
    summary: {
      totalTasksRead: listings.length,
      activeListings: activeListings.length,
      staleActiveListings: staleListings.length,
      agentsWithStaleListings: groups.length,
      recentlyResetActiveListings: recentResets.length,
      missingResetDate: missingResetDate.length,
      missingAgent: missingAgent.length,
      kpiShoppingListMatches: shoppingList.matched,
      actionPlanFound: shoppingList.withActionPlan,
      actionPlanMissing: shoppingList.missingActionPlan,
      actionPlanUnmatched: shoppingList.unmatched,
      assignedSalesLeader: assignmentSummary.assigned,
      unassignedSalesLeader: assignmentSummary.unassigned,
      trackedCases: caseSummary.total,
      openCases: caseSummary.open,
      caseActionPlansCreated: caseSummary.actionPlanCreated,
      caseAdjustedOrMoved: caseSummary.adjusted,
      caseMoved: caseSummary.moved,
    },
    rule: {
      plainEnglish: 'Only ClickUp Deal Data Entry rows with ❗ Deal Status = Active are audited. A listing is stale when List Date / Date of Last Price Adjustment is 30 or more days ago.',
      excluded: ['Coming Soon', 'Conditional', 'Firm', 'Closed', 'Closed - Cash Collected', 'Inactive', 'pre-marketing', 'onboarding'],
    },
    groups,
    staleListings: staleListingsWithAssignments,
    recentResets,
    shoppingList,
    salesLeaders: getSafeSalesLeaderOptions(),
    caseStatusOptions: getSalesListingCaseStatusOptions(),
    outcomeStatusOptions: getSalesListingOutcomeStatusOptions(),
    assignmentSummary,
    caseSummary,
    trackedCases,
    fieldGaps: {
      missingResetDate,
      missingAgent,
      actionPlanTracking: {
        available: Boolean(fieldTracking.actionPlan),
        field: fieldTracking.actionPlan,
        recommendedFields: fieldTracking.recommendedFields,
        note: fieldTracking.actionPlan
          ? 'Action-plan progress can be read from ClickUp.'
          : 'Action-plan progress needs a governed ClickUp field or snapshot table before the hub can report plans created, adjusted, and moved/sold.',
      },
    },
  }
}
