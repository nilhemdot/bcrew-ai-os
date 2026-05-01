export const SALES_LISTING_LEADERS = [
  { key: 'ryan', name: 'Ryan Campbell', email: 'ryanc@bensoncrew.ca' },
  { key: 'blake', name: 'Blake Berfelz', email: 'blake.berfelz@bensoncrew.ca' },
  { key: 'nick', name: 'Nick Bergmann', email: 'nick.bergmann@bensoncrew.ca' },
  { key: 'scott', name: 'Scott Benson', email: 'scottb@bensoncrew.ca' },
  { key: 'steve', name: 'Steve Zahnd', email: 'steve.zahnd@bensoncrew.ca' },
]

export const SALES_LISTING_CASE_STATUSES = [
  { key: 'identified', label: 'Identified' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'contacted_agent', label: 'Agent contacted' },
  { key: 'action_plan_created', label: 'Action plan created' },
  { key: 'action_plan_implemented', label: 'Action plan implemented' },
  { key: 'adjusted', label: 'Adjusted / relisted' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'closed', label: 'Closed' },
]

export const SALES_LISTING_OUTCOME_STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'adjusted', label: 'Adjusted / relisted' },
  { key: 'conditional', label: 'Conditional' },
  { key: 'firm', label: 'Firm' },
  { key: 'closed', label: 'Closed / sold' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'expired', label: 'Expired' },
  { key: 'no_action', label: 'No action' },
]

export function getSafeSalesLeaderOptions() {
  return SALES_LISTING_LEADERS.map(leader => ({
    key: leader.key,
    name: leader.name,
  }))
}

export function getSalesListingCaseStatusOptions() {
  return SALES_LISTING_CASE_STATUSES.map(status => ({ ...status }))
}

export function getSalesListingOutcomeStatusOptions() {
  return SALES_LISTING_OUTCOME_STATUSES.map(status => ({ ...status }))
}

export function resolveSalesListingLeader(key) {
  const normalized = String(key || '').trim().toLowerCase()
  if (!normalized) return null
  return SALES_LISTING_LEADERS.find(leader => leader.key === normalized) || null
}

export function resolveSalesListingCaseStatus(key) {
  const normalized = String(key || '').trim().toLowerCase()
  return SALES_LISTING_CASE_STATUSES.find(status => status.key === normalized) || SALES_LISTING_CASE_STATUSES[0]
}

export function resolveSalesListingOutcomeStatus(key) {
  const normalized = String(key || '').trim().toLowerCase()
  return SALES_LISTING_OUTCOME_STATUSES.find(status => status.key === normalized) || SALES_LISTING_OUTCOME_STATUSES[0]
}

export function sanitizeSalesListingAssignment(record) {
  if (!record) {
    return {
      assignedLeaderKey: '',
      assignedLeaderName: '',
      status: 'unassigned',
      caseStatus: 'identified',
      outcomeStatus: 'open',
      actionPlanText: '',
    }
  }

  return {
    assignedLeaderKey: record.assignedLeaderKey || '',
    assignedLeaderName: record.assignedLeaderName || '',
    status: record.assignedLeaderKey ? 'assigned' : 'unassigned',
    caseStatus: record.caseStatus || 'identified',
    outcomeStatus: record.outcomeStatus || 'open',
    firstSeenStaleDate: record.firstSeenStaleDate || null,
    staleSinceDate: record.staleSinceDate || null,
    originalResetDate: record.originalResetDate || null,
    currentResetDate: record.currentResetDate || null,
    adjustedAt: record.adjustedAt || null,
    adjustmentDetectedAt: record.adjustmentDetectedAt || null,
    actionPlanText: record.actionPlanText || '',
    updatedAt: record.updatedAt || null,
    updatedBy: record.updatedBy || '',
  }
}

export function sanitizeSalesListingCase(record) {
  const assignment = sanitizeSalesListingAssignment(record)
  return {
    clickUpTaskId: record.clickUpTaskId || '',
    listingTitle: record.listingTitle || '',
    listingUrl: record.listingUrl || '',
    agentName: record.agentName || '',
    daysSinceReset: record.daysSinceReset == null ? null : Number(record.daysSinceReset),
    ...assignment,
    actionPlanText: record.actionPlanText || '',
  }
}

export function mergeSalesListingAssignments(staleListings, assignments) {
  const assignmentByTaskId = new Map((assignments || []).map(record => [record.clickUpTaskId, record]))
  return (staleListings || []).map(listing => ({
    ...listing,
    salesLeaderAssignment: sanitizeSalesListingAssignment(assignmentByTaskId.get(listing.taskId)),
  }))
}

export function buildSalesListingAssignmentSummary(staleListings) {
  const assignedByLeader = Object.fromEntries(SALES_LISTING_LEADERS.map(leader => [
    leader.key,
    {
      key: leader.key,
      name: leader.name,
      count: 0,
    },
  ]))

  let assigned = 0
  let unassigned = 0
  let actionPlanCreated = 0
  let adjusted = 0
  let moved = 0
  for (const listing of staleListings || []) {
    const key = listing.salesLeaderAssignment?.assignedLeaderKey || ''
    if (key && assignedByLeader[key]) {
      assigned += 1
      assignedByLeader[key].count += 1
    } else {
      unassigned += 1
    }
    const caseStatus = listing.salesLeaderAssignment?.caseStatus || 'identified'
    const outcomeStatus = listing.salesLeaderAssignment?.outcomeStatus || 'open'
    if (['action_plan_created', 'action_plan_implemented', 'adjusted', 'closed'].includes(caseStatus)) {
      actionPlanCreated += 1
    }
    if (['adjusted', 'conditional', 'firm', 'closed'].includes(outcomeStatus)) adjusted += 1
    if (['conditional', 'firm', 'closed'].includes(outcomeStatus)) moved += 1
  }

  return {
    leaders: getSafeSalesLeaderOptions(),
    assigned,
    unassigned,
    actionPlanCreated,
    adjusted,
    moved,
    assignedByLeader: Object.values(assignedByLeader),
  }
}

export function buildSalesListingCaseSummary(cases) {
  const rows = cases || []
  return {
    total: rows.length,
    open: rows.filter(row => !['closed'].includes(row.caseStatus || '')).length,
    assigned: rows.filter(row => row.assignedLeaderKey).length,
    actionPlanCreated: rows.filter(row => ['action_plan_created', 'action_plan_implemented', 'adjusted', 'closed'].includes(row.caseStatus || '')).length,
    adjusted: rows.filter(row => ['adjusted', 'conditional', 'firm', 'closed'].includes(row.outcomeStatus || '')).length,
    moved: rows.filter(row => ['conditional', 'firm', 'closed'].includes(row.outcomeStatus || '')).length,
  }
}
