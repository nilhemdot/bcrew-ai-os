export const SALES_LISTING_LEADERS = [
  { key: 'ryan', name: 'Ryan', email: 'ryanc@bensoncrew.ca' },
  { key: 'blake', name: 'Blake', email: 'blake.berfelz@bensoncrew.ca' },
  { key: 'nick', name: 'Nick', email: 'nick.bergmann@bensoncrew.ca' },
  { key: 'scott', name: 'Scott', email: 'scottb@bensoncrew.ca' },
  { key: 'steve', name: 'Steve', email: 'steve.zahnd@bensoncrew.ca' },
]

export function getSafeSalesLeaderOptions() {
  return SALES_LISTING_LEADERS.map(leader => ({
    key: leader.key,
    name: leader.name,
  }))
}

export function resolveSalesListingLeader(key) {
  const normalized = String(key || '').trim().toLowerCase()
  if (!normalized) return null
  return SALES_LISTING_LEADERS.find(leader => leader.key === normalized) || null
}

export function sanitizeSalesListingAssignment(record) {
  if (!record) {
    return {
      assignedLeaderKey: '',
      assignedLeaderName: '',
      status: 'unassigned',
    }
  }

  return {
    assignedLeaderKey: record.assignedLeaderKey || '',
    assignedLeaderName: record.assignedLeaderName || '',
    status: record.assignedLeaderKey ? 'assigned' : 'unassigned',
    updatedAt: record.updatedAt || null,
    updatedBy: record.updatedBy || '',
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
  for (const listing of staleListings || []) {
    const key = listing.salesLeaderAssignment?.assignedLeaderKey || ''
    if (key && assignedByLeader[key]) {
      assigned += 1
      assignedByLeader[key].count += 1
    } else {
      unassigned += 1
    }
  }

  return {
    leaders: getSafeSalesLeaderOptions(),
    assigned,
    unassigned,
    assignedByLeader: Object.values(assignedByLeader),
  }
}
