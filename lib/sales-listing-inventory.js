import { clickUpGet, getClickUpFieldMap, listClickUpTasks, normalizeClickUpText } from './clickup.js'
import { listSalesListingAssignments, listSalesListingCases } from './foundation-db.js'
import { buildKpiShoppingListMatchContext, findShoppingListMatch } from './kpi-shopping-list.js'
import {
  buildSalesListingCaseSummary,
  buildSalesListingAssignmentSummary,
  getSalesListingActionPlanStateOptions,
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

export const SALES_GLS_SYSTEM = {
  key: 'gls',
  name: 'GLS System',
  fullName: 'Get Listings Sold',
  purpose: 'Identify active listings losing momentum, assign a sales leader, get the agent connected, create a game plan, and track whether the listing gets adjusted or sold.',
  workflow: [
    { key: 'identify', label: 'Identify opportunity', proof: 'Active ClickUp listing with 30+ days since list date or last price adjustment.' },
    { key: 'assign', label: 'Assign sales leader', proof: 'Ryan, Blake, Nick, Scott, or Steve owns the agent conversation.' },
    { key: 'connect', label: 'Connect with agent', proof: 'Case status moves to agent contacted or later.' },
    { key: 'game_plan', label: 'Create game plan', proof: 'Action plan yes/no plus plan or no-plan reason is recorded.' },
    { key: 'implement', label: 'Implement', proof: 'ClickUp reset date changes or case outcome is marked adjusted/relisted.' },
    { key: 'outcome', label: 'Track outcome', proof: 'Outcome moves to conditional, firm, closed, cancelled, expired, or no action.' },
  ],
  threshold: {
    defaultDays: SALES_LISTING_SOURCE.staleDays,
    adjustableLater: true,
    note: 'Current v1 uses 30 days. The Sales Hub can add operator threshold controls after weekly review snapshots are stable.',
  },
  playbooks: [
    {
      key: 'aggressive-underlisting',
      title: 'Aggressive Underlisting Playbook',
      sourceId: 'SRC-GDRIVE-001',
      sourceName: 'TRAINING: FROM NOWHERE to NOW HERE',
      sourceUrl: 'https://docs.google.com/document/d/1_OHan90dkvI9GhDu2-E7fNF5B1zV6m-c5LFSSWIHSso/edit?tab=t.0',
      sourceModifiedAt: '2026-05-01T17:41:38.086Z',
      status: 'available',
      fitRule: 'Use when an active listing has low momentum after the seller-price test and needs a stronger market event, not another small reactive price drop.',
      phases: [
        'Test at the seller price',
        'Underlisting trigger',
        'Four-day market event',
        'Leverage, close, or Day 5 relist',
      ],
      checklist: [
        'Seller conversation completed',
        'Written seller approval captured',
        'Form 244 filed when offer date is used',
        'BrokerBay no-preemptive instructions set',
        'Open-house and marketing push planned',
        'Day 5 relist plan ready if no firm deal',
      ],
      resultFields: [
        'showings generated',
        'offers received',
        'adjusted/relisted price',
        'days from strategy launch to deal',
        'conditional, firm, or closed outcome',
      ],
    },
  ],
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

function normalizeProjectAddress(value) {
  return normalizeClickUpText(value)
    .toLowerCase()
    .replace(/\b(?:unit|suite|apt|apartment|townhome|th|lot)\s*#?\s*[a-z0-9-]+\b/g, ' ')
    .replace(/#\s*[a-z0-9-]+\b/g, ' ')
    .replace(/\b[a-z]?\d+[a-z]?\s*-\s*(\d+\s+)/g, '$1')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function dateKeyFromIso(value) {
  const raw = normalizeClickUpText(value)
  if (!raw) return null
  const direct = parseDateKey(raw.slice(0, 10))
  if (direct) return direct.key
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function daysBetweenDateKeys(startKey, endKey) {
  const start = parseDateKey(startKey)
  const end = parseDateKey(endKey)
  if (!start || !end) return null
  return Math.max(0, Math.floor((end.utcMs - start.utcMs) / 86400000))
}

function compareDateValues(left, right) {
  const leftDate = parseDateKey(dateKeyFromIso(left) || left)
  const rightDate = parseDateKey(dateKeyFromIso(right) || right)
  if (!leftDate || !rightDate) return 0
  return Math.sign(leftDate.utcMs - rightDate.utcMs)
}

function minDateKey(values) {
  return values
    .map(value => dateKeyFromIso(value) || value)
    .filter(value => parseDateKey(value))
    .sort(compareDateValues)[0] || null
}

function maxDateKey(values) {
  const dates = values
    .map(value => dateKeyFromIso(value) || value)
    .filter(value => parseDateKey(value))
    .sort(compareDateValues)
  return dates[dates.length - 1] || null
}

function getWeekStartKey(value) {
  const parsed = parseDateKey(dateKeyFromIso(value) || value)
  if (!parsed) return null
  const date = new Date(parsed.utcMs)
  const day = date.getUTCDay()
  const offset = (day + 6) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  return date.toISOString().slice(0, 10)
}

function statusRank(value) {
  return {
    identified: 0,
    assigned: 1,
    contacted_agent: 2,
    action_plan_created: 3,
    action_plan_implemented: 4,
    adjusted: 5,
    blocked: 5,
    closed: 6,
  }[value || 'identified'] ?? 0
}

function outcomeRank(value) {
  return {
    open: 0,
    no_action: 1,
    cancelled: 1,
    expired: 1,
    adjusted: 2,
    conditional: 3,
    firm: 4,
    closed: 5,
  }[value || 'open'] ?? 0
}

function caseEntryDate(row) {
  return dateKeyFromIso(row.firstSeenStaleDate) ||
    dateKeyFromIso(row.staleSinceDate) ||
    dateKeyFromIso(row.createdAt) ||
    null
}

function getCaseOutcomeDate(row) {
  return dateKeyFromIso(row.adjustedAt) ||
    dateKeyFromIso(row.adjustmentDetectedAt) ||
    dateKeyFromIso(row.updatedAt) ||
    null
}

function caseHasAdjustedReset(row) {
  const original = dateKeyFromIso(row.originalResetDate)
  const current = dateKeyFromIso(row.currentResetDate || row.resetDate)
  return Boolean(original && current && compareDateValues(current, original) > 0)
}

function caseIsTakenOn(row) {
  return Boolean(
    row.assignedLeaderKey ||
    ['assigned', 'contacted_agent', 'action_plan_created', 'action_plan_implemented'].includes(row.caseStatus || '') ||
    ['yes', 'no'].includes(row.actionPlanState || '')
  )
}

function caseIsConnected(row) {
  return ['contacted_agent', 'action_plan_created', 'action_plan_implemented', 'adjusted', 'closed'].includes(row.caseStatus || '')
}

function caseHasGamePlan(row) {
  return row.actionPlanState === 'yes' ||
    ['action_plan_created', 'action_plan_implemented'].includes(row.caseStatus || '')
}

function caseIsImplemented(row) {
  return ['action_plan_implemented', 'adjusted', 'closed'].includes(row.caseStatus || '') ||
    caseIsAdjusted(row) ||
    ['conditional', 'firm', 'closed'].includes(row.outcomeStatus || '')
}

function caseIsAdjustedOrImplemented(row) {
  return caseIsAdjusted(row) || ['action_plan_implemented', 'adjusted'].includes(row.caseStatus || '')
}

function caseIsAdjusted(row) {
  return row.outcomeStatus === 'adjusted' || Boolean(row.adjustedAt) || caseHasAdjustedReset(row)
}

function caseIsMoved(row) {
  return ['conditional', 'firm', 'closed'].includes(row.outcomeStatus || '')
}

function caseIsSold(row) {
  const statusText = [
    row.outcomeStatus,
    row.caseStatus,
    row.metadata?.clickUpStatus,
    row.metadata?.activeStage,
  ].filter(Boolean).join(' ').toLowerCase()
  return ['firm', 'closed'].includes(row.outcomeStatus || '') || /\b(firm|closed|sold)\b/.test(statusText)
}

function caseIsNoActionOrBlocked(row) {
  return row.outcomeStatus === 'no_action' ||
    row.caseStatus === 'blocked' ||
    ['cancelled', 'expired'].includes(row.outcomeStatus || '')
}

function caseIsStillOpen(row) {
  return !caseIsSold(row) && !caseIsNoActionOrBlocked(row)
}

function toScoreboardRow(item) {
  const assignment = item.salesLeaderAssignment || item
  return {
    clickUpTaskId: item.clickUpTaskId || item.taskId || '',
    listingTitle: item.listingTitle || item.title || '',
    listingUrl: item.listingUrl || item.url || '',
    agentName: item.agentName || item.agent || 'Unassigned',
    resetDate: item.resetDate || assignment.currentResetDate || null,
    daysSinceReset: item.daysSinceReset == null ? null : Number(item.daysSinceReset),
    assignedLeaderKey: assignment.assignedLeaderKey || '',
    assignedLeaderName: assignment.assignedLeaderName || '',
    caseStatus: assignment.caseStatus || 'identified',
    outcomeStatus: assignment.outcomeStatus || 'open',
    actionPlanState: assignment.actionPlanState || 'unknown',
    actionPlanNoReason: assignment.actionPlanNoReason || '',
    firstSeenStaleDate: assignment.firstSeenStaleDate || item.firstSeenStaleDate || null,
    staleSinceDate: assignment.staleSinceDate || item.staleSinceDate || null,
    originalResetDate: assignment.originalResetDate || item.originalResetDate || item.resetDate || null,
    currentResetDate: assignment.currentResetDate || item.currentResetDate || item.resetDate || null,
    adjustedAt: assignment.adjustedAt || item.adjustedAt || null,
    adjustmentDetectedAt: assignment.adjustmentDetectedAt || item.adjustmentDetectedAt || null,
    actionPlanText: assignment.actionPlanText || item.actionPlanText || '',
    metadata: assignment.metadata || item.metadata || {},
    createdAt: assignment.createdAt || item.createdAt || null,
    updatedAt: assignment.updatedAt || item.updatedAt || null,
  }
}

function buildScoreboardGroups(rows) {
  const groups = new Map()
  for (const row of rows || []) {
    const baseAddress = normalizeProjectAddress(row.listingTitle)
    const key = baseAddress
      ? `${normalizeKey(row.agentName || 'Unassigned')}::${baseAddress}`
      : `task::${row.clickUpTaskId}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        baseAddress: baseAddress || row.listingTitle || row.clickUpTaskId,
        agent: row.agentName || 'Unassigned',
        listingCount: 0,
        listings: [],
      })
    }
    const group = groups.get(key)
    group.listingCount += 1
    group.listings.push(row)
  }

  return Array.from(groups.values()).map(group => {
    const leaderKeys = Array.from(new Set(group.listings.map(row => row.assignedLeaderKey || '').filter(Boolean)))
    const leaderNames = Array.from(new Set(group.listings.map(row => row.assignedLeaderName || '').filter(Boolean)))
    const entryDate = minDateKey(group.listings.map(caseEntryDate))
    const adjustedAt = minDateKey(group.listings.map(row => row.adjustedAt))
    const outcomeDate = maxDateKey(group.listings.map(getCaseOutcomeDate))
    const strongestOutcome = group.listings
      .map(row => row.outcomeStatus || 'open')
      .sort((left, right) => outcomeRank(right) - outcomeRank(left))[0] || 'open'
    const strongestCaseStatus = group.listings
      .map(row => row.caseStatus || 'identified')
      .sort((left, right) => statusRank(right) - statusRank(left))[0] || 'identified'
    const movementDate = adjustedAt || outcomeDate
    return {
      ...group,
      caseCount: 1,
      isGroupedProject: group.listingCount > 1,
      listingTaskIds: group.listings.map(row => row.clickUpTaskId).filter(Boolean),
      assignedLeaderKey: leaderKeys.length === 1 ? leaderKeys[0] : leaderKeys.length > 1 ? 'mixed' : '',
      assignedLeaderName: leaderNames.length === 1 ? leaderNames[0] : leaderNames.length > 1 ? 'Mixed leaders' : '',
      caseStatus: strongestCaseStatus,
      outcomeStatus: strongestOutcome,
      dateEnteredGls: entryDate,
      adjustedAt,
      movementDate,
      daysToMovementOrSale: entryDate && movementDate ? daysBetweenDateKeys(entryDate, movementDate) : null,
      takenOn: group.listings.some(caseIsTakenOn),
      connected: group.listings.some(caseIsConnected),
      gamePlanCreated: group.listings.some(caseHasGamePlan),
      implemented: group.listings.some(caseIsImplemented),
      adjustedOrImplemented: group.listings.some(caseIsAdjustedOrImplemented),
      adjustedRelisted: group.listings.some(caseIsAdjusted),
      moved: group.listings.some(caseIsMoved),
      soldClosed: group.listings.some(caseIsSold),
      noActionOrBlocked: group.listings.some(caseIsNoActionOrBlocked),
      stillOpen: group.listings.some(caseIsStillOpen),
    }
  }).sort((left, right) =>
    compareDateValues(left.dateEnteredGls || '9999-12-31', right.dateEnteredGls || '9999-12-31') ||
    right.listingCount - left.listingCount ||
    left.agent.localeCompare(right.agent)
  )
}

function metricFromRowsAndGroups(rows, groups, rowPredicate, groupPredicate = null) {
  const groupedPredicate = groupPredicate || (group => group.listings.some(rowPredicate))
  return {
    listingCount: (rows || []).filter(rowPredicate).length,
    caseCount: (groups || []).filter(groupedPredicate).length,
  }
}

function metricFromGroups(groups, predicate = () => true) {
  const matched = (groups || []).filter(predicate)
  return {
    listingCount: matched.reduce((sum, group) => sum + (group.listingCount || 0), 0),
    caseCount: matched.length,
  }
}

function buildLeaderBreakdown(activeRows, activeGroups, salesLeaders = []) {
  const rows = [
    ...salesLeaders.map(leader => ({ key: leader.key, name: leader.name, listingCount: 0, caseCount: 0 })),
    { key: 'unassigned', name: 'Unassigned', listingCount: 0, caseCount: 0 },
    { key: 'mixed', name: 'Mixed leaders', listingCount: 0, caseCount: 0 },
  ]
  const byKey = new Map(rows.map(row => [row.key, row]))
  for (const row of activeRows || []) {
    const key = row.assignedLeaderKey || 'unassigned'
    const bucket = byKey.get(key) || byKey.get('unassigned')
    bucket.listingCount += 1
  }
  for (const group of activeGroups || []) {
    const key = group.assignedLeaderKey || 'unassigned'
    const bucket = byKey.get(key) || byKey.get(key === 'mixed' ? 'mixed' : 'unassigned')
    bucket.caseCount += 1
  }
  return rows.filter(row => row.listingCount || row.caseCount || !['unassigned', 'mixed'].includes(row.key))
}

function percentage(numerator, denominator) {
  const n = Number(numerator) || 0
  const d = Number(denominator) || 0
  if (!d) return null
  return Math.round((n / d) * 1000) / 10
}

function conversionRate(label, numeratorMetric, denominatorMetric) {
  return {
    label,
    listingRate: percentage(numeratorMetric.listingCount, denominatorMetric.listingCount),
    caseRate: percentage(numeratorMetric.caseCount, denominatorMetric.caseCount),
    listingNumerator: numeratorMetric.listingCount,
    listingDenominator: denominatorMetric.listingCount,
    caseNumerator: numeratorMetric.caseCount,
    caseDenominator: denominatorMetric.caseCount,
  }
}

function casePipelineStage(group) {
  if (group.implemented) return 'implemented'
  if (group.gamePlanCreated) return 'game_plan_created'
  if (group.connected) return 'connected'
  if (group.takenOn) return 'assigned'
  return 'identified'
}

function groupDaysOpen(group, todayKey) {
  if (!group?.dateEnteredGls || !todayKey) return null
  return daysBetweenDateKeys(group.dateEnteredGls, todayKey)
}

function averageFinite(values) {
  const finite = values.filter(value => Number.isFinite(value))
  if (!finite.length) return null
  return Math.round((finite.reduce((sum, value) => sum + value, 0) / finite.length) * 10) / 10
}

function buildActivePipeline(allGroups, todayKey) {
  const stuckThresholdDays = 14
  const activeGroups = (allGroups || [])
    .filter(group => group.stillOpen)
    .map(group => ({
      ...group,
      daysOpen: groupDaysOpen(group, todayKey),
      pipelineStage: casePipelineStage(group),
    }))
  const stages = [
    { key: 'identified', label: 'Identified', metric: metricFromGroups(activeGroups, group => group.pipelineStage === 'identified') },
    { key: 'assigned', label: 'Assigned', metric: metricFromGroups(activeGroups, group => group.pipelineStage === 'assigned') },
    { key: 'connected', label: 'Agent contacted', metric: metricFromGroups(activeGroups, group => group.pipelineStage === 'connected') },
    { key: 'game_plan_created', label: 'Game plan', metric: metricFromGroups(activeGroups, group => group.pipelineStage === 'game_plan_created') },
    { key: 'implemented', label: 'Implemented', metric: metricFromGroups(activeGroups, group => group.pipelineStage === 'implemented') },
  ]
  const stuckGroups = activeGroups.filter(group => Number.isFinite(group.daysOpen) && group.daysOpen >= stuckThresholdDays)
  return {
    definition: 'Persisted GLS cases that are still unresolved.',
    total: metricFromGroups(activeGroups),
    takenOn: metricFromGroups(activeGroups, group => group.takenOn),
    assigned: metricFromGroups(activeGroups, group => group.assignedLeaderKey && group.assignedLeaderKey !== 'mixed'),
    connected: metricFromGroups(activeGroups, group => group.connected),
    gamePlanCreated: metricFromGroups(activeGroups, group => group.gamePlanCreated),
    implemented: metricFromGroups(activeGroups, group => group.implemented),
    unassigned: metricFromGroups(activeGroups, group => !group.assignedLeaderKey),
    stages,
    stuck: metricFromGroups(stuckGroups),
    stuckThresholdDays,
    oldestActiveDays: activeGroups.reduce((max, group) => Math.max(max, Number(group.daysOpen) || 0), 0),
  }
}

function buildResolvedResults(allGroups) {
  const resolvedGroups = (allGroups || []).filter(group => !group.stillOpen)
  return {
    definition: 'Persisted GLS cases that moved out of active work.',
    total: metricFromGroups(resolvedGroups),
    adjustedRelisted: metricFromGroups(resolvedGroups, group => group.adjustedRelisted),
    moved: metricFromGroups(resolvedGroups, group => group.moved),
    soldClosed: metricFromGroups(resolvedGroups, group => group.soldClosed),
    noActionOrBlocked: metricFromGroups(resolvedGroups, group => group.noActionOrBlocked),
    averageDaysToResolution: averageFinite(resolvedGroups.map(group => group.daysToMovementOrSale)),
  }
}

function buildOutcomeSummary(allGroups) {
  const stuckThresholdDays = 14
  return {
    adjustedOrImplemented: metricFromGroups(allGroups, group => group.adjustedOrImplemented),
    soldClosed: metricFromGroups(allGroups, group => group.soldClosed),
    failed: metricFromGroups(allGroups, group => group.noActionOrBlocked),
    stuckThresholdDays,
  }
}

function buildLeaderPerformance(allGroups, salesLeaders = [], todayKey) {
  const rows = [
    ...salesLeaders.map(leader => ({
      key: leader.key,
      name: leader.name,
      activeCases: 0,
      activeListings: 0,
      resolvedCases: 0,
      resolvedListings: 0,
      adjustedCases: 0,
      soldCases: 0,
      noActionOrBlockedCases: 0,
      gamePlanCases: 0,
      implementedCases: 0,
      stuckCases: 0,
      oldestActiveDays: 0,
      resolutionDays: [],
    })),
    {
      key: 'unassigned',
      name: 'Unassigned',
      activeCases: 0,
      activeListings: 0,
      resolvedCases: 0,
      resolvedListings: 0,
      adjustedCases: 0,
      soldCases: 0,
      noActionOrBlockedCases: 0,
      gamePlanCases: 0,
      implementedCases: 0,
      stuckCases: 0,
      oldestActiveDays: 0,
      resolutionDays: [],
    },
    {
      key: 'mixed',
      name: 'Mixed leaders',
      activeCases: 0,
      activeListings: 0,
      resolvedCases: 0,
      resolvedListings: 0,
      adjustedCases: 0,
      soldCases: 0,
      noActionOrBlockedCases: 0,
      gamePlanCases: 0,
      implementedCases: 0,
      stuckCases: 0,
      oldestActiveDays: 0,
      resolutionDays: [],
    },
  ]
  const byKey = new Map(rows.map(row => [row.key, row]))
  const stuckThresholdDays = 14
  for (const group of allGroups || []) {
    const key = group.assignedLeaderKey || 'unassigned'
    const bucket = byKey.get(key) || byKey.get(key === 'mixed' ? 'mixed' : 'unassigned')
    const daysOpen = groupDaysOpen(group, todayKey)
    if (group.stillOpen) {
      bucket.activeCases += 1
      bucket.activeListings += group.listingCount || 0
      if (group.gamePlanCreated) bucket.gamePlanCases += 1
      if (group.implemented) bucket.implementedCases += 1
      if (group.adjustedRelisted) bucket.adjustedCases += 1
      if (Number.isFinite(daysOpen)) bucket.oldestActiveDays = Math.max(bucket.oldestActiveDays, daysOpen)
      if (Number.isFinite(daysOpen) && daysOpen >= stuckThresholdDays) bucket.stuckCases += 1
    } else {
      bucket.resolvedCases += 1
      bucket.resolvedListings += group.listingCount || 0
      if (group.adjustedOrImplemented) bucket.implementedCases += 1
      if (group.adjustedRelisted) bucket.adjustedCases += 1
      if (group.soldClosed) bucket.soldCases += 1
      if (group.noActionOrBlocked) bucket.noActionOrBlockedCases += 1
      if (Number.isFinite(group.daysToMovementOrSale)) bucket.resolutionDays.push(group.daysToMovementOrSale)
    }
  }

  return rows
    .map(row => {
      const totalOwnedCases = row.activeCases + row.resolvedCases
      return {
        key: row.key,
        name: row.name,
        activeCases: row.activeCases,
        activeListings: row.activeListings,
        resolvedCases: row.resolvedCases,
        resolvedListings: row.resolvedListings,
        adjustedCases: row.adjustedCases,
        soldCases: row.soldCases,
        noActionOrBlockedCases: row.noActionOrBlockedCases,
        gamePlanCases: row.gamePlanCases,
        implementedCases: row.implementedCases,
        adjustedOrImplementedCases: row.implementedCases,
        stuckCases: row.stuckCases,
        oldestActiveDays: row.oldestActiveDays,
        totalOwnedCases,
        resolutionRate: percentage(row.resolvedCases, totalOwnedCases),
        winRate: percentage(row.adjustedCases + row.soldCases, row.adjustedCases + row.soldCases + row.noActionOrBlockedCases),
        soldRate: percentage(row.soldCases, totalOwnedCases),
        averageDaysToResolution: averageFinite(row.resolutionDays),
      }
    })
    .filter(row => row.totalOwnedCases || !['unassigned', 'mixed'].includes(row.key))
    .sort((left, right) =>
      Number(['unassigned', 'mixed'].includes(left.key)) - Number(['unassigned', 'mixed'].includes(right.key)) ||
      right.resolvedCases - left.resolvedCases ||
      right.soldCases - left.soldCases ||
      right.adjustedCases - left.adjustedCases ||
      right.activeCases - left.activeCases ||
      left.name.localeCompare(right.name)
    )
}

function buildWeeklyCohorts(allRows, allGroups) {
  const rowsByWeek = new Map()
  for (const row of allRows || []) {
    const weekStart = getWeekStartKey(caseEntryDate(row))
    if (!weekStart) continue
    if (!rowsByWeek.has(weekStart)) rowsByWeek.set(weekStart, { weekStart, listingRows: [], caseGroups: [] })
    rowsByWeek.get(weekStart).listingRows.push(row)
  }
  for (const group of allGroups || []) {
    const weekStart = getWeekStartKey(group.dateEnteredGls)
    if (!weekStart) continue
    if (!rowsByWeek.has(weekStart)) rowsByWeek.set(weekStart, { weekStart, listingRows: [], caseGroups: [] })
    rowsByWeek.get(weekStart).caseGroups.push(group)
  }
  return Array.from(rowsByWeek.values())
    .sort((left, right) => compareDateValues(right.weekStart, left.weekStart))
    .map(cohort => ({
      weekStart: cohort.weekStart,
      listingsIdentified: cohort.listingRows.length,
      casesIdentified: cohort.caseGroups.length,
      takenOnListings: cohort.listingRows.filter(caseIsTakenOn).length,
      takenOnCases: cohort.caseGroups.filter(group => group.takenOn).length,
      adjustedListings: cohort.listingRows.filter(caseIsAdjusted).length,
      adjustedCases: cohort.caseGroups.filter(group => group.adjustedRelisted).length,
      soldListings: cohort.listingRows.filter(caseIsSold).length,
      soldCases: cohort.caseGroups.filter(group => group.soldClosed).length,
      stillOpenListings: cohort.listingRows.filter(caseIsStillOpen).length,
      stillOpenCases: cohort.caseGroups.filter(group => group.stillOpen).length,
      listingTaskIds: Array.from(new Set(cohort.listingRows.map(row => row.clickUpTaskId).filter(Boolean))),
      caseTaskIds: Array.from(new Set(cohort.caseGroups.flatMap(group => group.listingTaskIds || []).filter(Boolean))),
    }))
}

export function buildGlsScoreboard({
  staleListings = [],
  trackedCases = [],
  salesLeaders = [],
  todayKey = getTorontoDateKey(),
} = {}) {
  const activeRows = staleListings.map(toScoreboardRow)
  const allRows = trackedCases.map(toScoreboardRow)
  const activeGroups = buildScoreboardGroups(activeRows)
  const allGroups = buildScoreboardGroups(allRows)
  const identified = metricFromRowsAndGroups(allRows, allGroups, () => true, () => true)
  const takenOn = metricFromRowsAndGroups(allRows, allGroups, caseIsTakenOn, group => group.takenOn)
  const connected = metricFromRowsAndGroups(allRows, allGroups, caseIsConnected, group => group.connected)
  const gamePlanCreated = metricFromRowsAndGroups(allRows, allGroups, caseHasGamePlan, group => group.gamePlanCreated)
  const implemented = metricFromRowsAndGroups(allRows, allGroups, caseIsImplemented, group => group.implemented)
  const adjustedRelisted = metricFromRowsAndGroups(allRows, allGroups, caseIsAdjusted, group => group.adjustedRelisted)
  const moved = metricFromRowsAndGroups(allRows, allGroups, caseIsMoved, group => group.moved)
  const soldClosed = metricFromRowsAndGroups(allRows, allGroups, caseIsSold, group => group.soldClosed)
  const adjustedOrSold = metricFromRowsAndGroups(
    allRows,
    allGroups,
    row => caseIsAdjusted(row) || caseIsSold(row),
    group => group.adjustedRelisted || group.soldClosed
  )
  const noActionOrBlocked = metricFromRowsAndGroups(allRows, allGroups, caseIsNoActionOrBlocked, group => group.noActionOrBlocked)
  const notTakenOn = metricFromRowsAndGroups(allRows, allGroups, row => !caseIsTakenOn(row), group => !group.takenOn)
  const movedSoldCases = allGroups
    .filter(group => group.adjustedRelisted || group.moved || group.soldClosed)
    .sort((left, right) => compareDateValues(right.movementDate || right.dateEnteredGls || '', left.movementDate || left.dateEnteredGls || ''))
    .map(group => ({
      key: group.key,
      listingProject: group.isGroupedProject ? group.baseAddress : group.listings[0]?.listingTitle || group.baseAddress,
      agent: group.agent,
      salesLeader: group.assignedLeaderName || 'Unassigned',
      listingCount: group.listingCount,
      caseCount: 1,
      dateEnteredGls: group.dateEnteredGls,
      dateAdjusted: group.adjustedAt,
      currentOutcome: group.outcomeStatus,
      caseStatus: group.caseStatus,
      daysFromEntryToMovementOrSale: group.daysToMovementOrSale,
      listingTaskIds: group.listingTaskIds,
    }))

  return {
    model: {
      listingUnit: 'raw listing opportunity',
      caseUnit: 'grouped GLS case/project',
      groupingRule: 'Listings with the same agent and normalized base address count as one GLS case/project.',
    },
    currentActive: {
      listingCount: activeRows.length,
      caseCount: activeGroups.length,
      assignedListings: activeRows.filter(row => row.assignedLeaderKey).length,
      unassignedListings: activeRows.filter(row => !row.assignedLeaderKey).length,
      assignedCases: activeGroups.filter(group => group.assignedLeaderKey && group.assignedLeaderKey !== 'mixed').length,
      unassignedCases: activeGroups.filter(group => !group.assignedLeaderKey).length,
      groupedProjectCases: activeGroups.filter(group => group.isGroupedProject).map(group => ({
        key: group.key,
        agent: group.agent,
        baseAddress: group.baseAddress,
        listingCount: group.listingCount,
        caseCount: 1,
        assignedLeaderName: group.assignedLeaderName || '',
      })),
      bySalesLeader: buildLeaderBreakdown(activeRows, activeGroups, salesLeaders),
    },
    allTimeFunnel: {
      identified,
      takenOn,
      connected,
      gamePlanCreated,
      implemented,
      adjustedRelisted,
      adjustedOrSold,
      moved,
      soldClosed,
      notTakenOn,
      noActionOrBlocked,
    },
    activePipeline: buildActivePipeline(allGroups, todayKey),
    resolvedResults: buildResolvedResults(allGroups),
    outcomeSummary: buildOutcomeSummary(allGroups),
    leaderPerformance: buildLeaderPerformance(allGroups, salesLeaders, todayKey),
    conversionRates: [
      conversionRate('Taken on / identified', takenOn, identified),
      conversionRate('Game plan / taken on', gamePlanCreated, takenOn),
      conversionRate('Adjusted / taken on', adjustedRelisted, takenOn),
      conversionRate('Sold / taken on', soldClosed, takenOn),
      conversionRate('Sold / adjusted', soldClosed, adjustedRelisted),
    ],
    weeklyCohorts: buildWeeklyCohorts(allRows, allGroups),
    movedSoldCases,
    proof: {
      persistedCaseHistory: true,
      activeCountsExcludeClosedStatuses: true,
      movedSoldCasesComeFromPersistedHistory: true,
      groupedProjectCaseCount: activeGroups.filter(group => group.isGroupedProject).length,
      groupedProjectListingCount: activeGroups.filter(group => group.isGroupedProject).reduce((sum, group) => sum + group.listingCount, 0),
    },
  }
}

function buildProjectSuggestions(staleListings) {
  const groups = new Map()
  for (const listing of staleListings || []) {
    const baseAddress = normalizeProjectAddress(listing.title)
    if (!baseAddress || baseAddress.length < 8) continue
    const key = `${normalizeKey(listing.agent)}::${baseAddress}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        agent: listing.agent || 'Unassigned',
        baseAddress,
        listingCount: 0,
        oldestDays: 0,
        listings: [],
      })
    }
    const group = groups.get(key)
    group.listingCount += 1
    group.oldestDays = Math.max(group.oldestDays, listing.daysSinceReset || 0)
    group.listings.push({
      taskId: listing.taskId,
      title: listing.title,
      url: listing.url,
      daysSinceReset: listing.daysSinceReset,
      assignedLeaderKey: listing.salesLeaderAssignment?.assignedLeaderKey || '',
      assignedLeaderName: listing.salesLeaderAssignment?.assignedLeaderName || '',
      caseStatus: listing.salesLeaderAssignment?.caseStatus || 'identified',
      outcomeStatus: listing.salesLeaderAssignment?.outcomeStatus || 'open',
      actionPlanState: listing.salesLeaderAssignment?.actionPlanState || 'unknown',
      actionPlanNoReason: listing.salesLeaderAssignment?.actionPlanNoReason || '',
      actionPlanText: listing.salesLeaderAssignment?.actionPlanText || '',
      glsSnooze: listing.salesLeaderAssignment?.glsSnooze || null,
      caseHistory: listing.salesLeaderAssignment?.caseHistory || [],
    })
  }

  return Array.from(groups.values())
    .filter(group => group.listingCount >= 2)
    .map(group => {
      const commonValue = key => {
        const values = Array.from(new Set(group.listings.map(item => item[key] || '').filter(Boolean)))
        return values.length === 1 ? values[0] : ''
      }
      return {
        ...group,
        taskIds: group.listings.map(item => item.taskId),
        assignedLeaderKey: commonValue('assignedLeaderKey'),
        assignedLeaderName: commonValue('assignedLeaderName'),
        caseStatus: commonValue('caseStatus') || 'identified',
        outcomeStatus: commonValue('outcomeStatus') || 'open',
        actionPlanState: commonValue('actionPlanState') || 'unknown',
        actionPlanNoReason: commonValue('actionPlanNoReason'),
        actionPlanText: commonValue('actionPlanText'),
        glsSnooze: group.listings.find(item => item.glsSnooze)?.glsSnooze || null,
        caseHistory: compactProjectCaseHistory(group.listings),
        suggestion: 'Likely one project or builder block. Review as a grouped GLS case so one leader can create one project-level game plan.',
      }
    })
    .sort((left, right) => right.listingCount - left.listingCount || right.oldestDays - left.oldestDays || left.agent.localeCompare(right.agent))
}

function compactProjectCaseHistory(listings = []) {
  const eventsByKey = new Map()
  for (const listing of listings || []) {
    for (const event of listing.caseHistory || []) {
      const changeKey = JSON.stringify((event.changes || []).map(change => [change.field, change.from, change.to]))
      const key = [
        String(event.at || '').slice(0, 19),
        event.title || '',
        event.note || '',
        changeKey,
      ].join('::')
      if (!eventsByKey.has(key)) {
        eventsByKey.set(key, {
          ...event,
          listingCount: 0,
          listingTitles: [],
        })
      }
      const existing = eventsByKey.get(key)
      existing.listingCount += 1
      if (existing.listingTitles.length < 3 && listing.title) existing.listingTitles.push(listing.title)
    }
  }
  return Array.from(eventsByKey.values())
    .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')))
    .slice(-8)
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
  const trackedCaseTaskIds = new Set(trackedCases.map(item => item.clickUpTaskId).filter(Boolean))
  const trackedSourceListings = listings.filter(item => trackedCaseTaskIds.has(item.taskId))
  const recentResets = activeListings.filter(item => Number.isFinite(item.daysSinceReset) && item.daysSinceReset >= 0 && item.daysSinceReset < SALES_LISTING_SOURCE.staleDays)
  const missingResetDate = activeListings.filter(item => !item.resetDate)
  const missingAgent = activeListings.filter(item => !item.agent || item.agent === 'Unassigned')
  const groups = groupStaleListings(staleListingsWithAssignments)
  const projectSuggestions = buildProjectSuggestions(staleListingsWithAssignments)
  const scoreboard = buildGlsScoreboard({
    staleListings: staleListingsWithAssignments,
    trackedCases,
    salesLeaders: getSafeSalesLeaderOptions(),
    todayKey,
  })
  const fieldTracking = buildFieldTracking(snapshot)

  return {
    generatedAt: new Date().toISOString(),
    today: todayKey,
    thresholdDays: SALES_LISTING_SOURCE.staleDays,
    system: SALES_GLS_SYSTEM,
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
      projectMergeSuggestions: projectSuggestions.length,
      recentlyResetActiveListings: recentResets.length,
      missingResetDate: missingResetDate.length,
      missingAgent: missingAgent.length,
      kpiShoppingListMatches: shoppingList.matched,
      actionPlanFound: shoppingList.withActionPlan,
      actionPlanMissing: shoppingList.missingActionPlan,
      actionPlanUnmatched: shoppingList.unmatched,
      assignedSalesLeader: assignmentSummary.assigned,
      unassignedSalesLeader: assignmentSummary.unassigned,
      currentActiveGlsCases: scoreboard.currentActive.caseCount,
      currentActiveGroupedProjectCases: scoreboard.currentActive.groupedProjectCases.length,
      activePipelineCases: scoreboard.activePipeline.total.caseCount,
      unresolvedGlsCases: scoreboard.activePipeline.total.caseCount,
      resolvedGlsCases: scoreboard.resolvedResults.total.caseCount,
      trackedCases: caseSummary.total,
      openCases: caseSummary.open,
      caseAgentConnected: caseSummary.agentConnected,
      caseActionPlansCreated: caseSummary.actionPlanCreated,
      caseActionPlanYes: caseSummary.actionPlanYes,
      caseActionPlanNo: caseSummary.actionPlanNo,
      caseActionPlanUnknown: caseSummary.actionPlanUnknown,
      caseActionPlanNoReason: caseSummary.actionPlanNoReason,
      caseImplemented: caseSummary.implemented,
      caseAdjustedOrMoved: caseSummary.adjusted,
      caseMoved: caseSummary.moved,
      allTimeIdentifiedListings: scoreboard.allTimeFunnel.identified.listingCount,
      allTimeIdentifiedCases: scoreboard.allTimeFunnel.identified.caseCount,
      allTimeTakenOnListings: scoreboard.allTimeFunnel.takenOn.listingCount,
      allTimeTakenOnCases: scoreboard.allTimeFunnel.takenOn.caseCount,
      allTimeAdjustedListings: scoreboard.allTimeFunnel.adjustedRelisted.listingCount,
      allTimeAdjustedCases: scoreboard.allTimeFunnel.adjustedRelisted.caseCount,
      allTimeSoldListings: scoreboard.allTimeFunnel.soldClosed.listingCount,
      allTimeSoldCases: scoreboard.allTimeFunnel.soldClosed.caseCount,
    },
    rule: {
      plainEnglish: 'Only ClickUp Deal Data Entry rows with ❗ Deal Status = Active are audited. A listing is stale when List Date / Date of Last Price Adjustment is 30 or more days ago.',
      excluded: ['Coming Soon', 'Conditional', 'Firm', 'Closed', 'Closed - Cash Collected', 'Inactive', 'pre-marketing', 'onboarding'],
    },
    groups,
    projectSuggestions,
    staleListings: staleListingsWithAssignments,
    recentResets,
    shoppingList,
    salesLeaders: getSafeSalesLeaderOptions(),
    actionPlanStateOptions: getSalesListingActionPlanStateOptions(),
    caseStatusOptions: getSalesListingCaseStatusOptions(),
    outcomeStatusOptions: getSalesListingOutcomeStatusOptions(),
    assignmentSummary,
    caseSummary,
    scoreboard,
    trackedCases,
    trackedSourceListings,
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
