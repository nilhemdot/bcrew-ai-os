import {
  listSalesListingCases,
  upsertSalesListingAssignment,
} from './foundation-people-sales-db.js'

function parseDateKey(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (Number.isNaN(date.getTime())) return null
  return date
}

function dateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function addDays(value, days) {
  const date = parseDateKey(value)
  if (!date) return null
  date.setUTCDate(date.getUTCDate() + days)
  return dateKey(date)
}

function compareDateKeys(left, right) {
  const leftDate = parseDateKey(left)
  const rightDate = parseDateKey(right)
  if (!leftDate || !rightDate) return 0
  return Math.sign(leftDate.getTime() - rightDate.getTime())
}

function inferOutcomeFromListing(listing, existing = {}) {
  const activeStage = String(listing?.activeStage || '').trim().toLowerCase()
  const status = String(listing?.clickUpStatus || '').trim().toLowerCase()
  if (/(conditional)/.test(activeStage) || /(conditional)/.test(status)) return 'conditional'
  if (/(firm)/.test(activeStage) || /(firm)/.test(status)) return 'firm'
  if (/(closed|sold)/.test(activeStage) || /(closed|sold)/.test(status)) return 'closed'

  const originalReset = existing.originalResetDate || existing.resetDate
  const currentReset = listing?.resetDate || existing.currentResetDate
  if (originalReset && currentReset && compareDateKeys(currentReset, originalReset) > 0) return 'adjusted'
  return existing.outcomeStatus || 'open'
}

function inferCaseStatus(existing = {}, outcomeStatus = 'open') {
  if (['conditional', 'firm', 'closed'].includes(outcomeStatus)) return 'closed'
  if (outcomeStatus === 'adjusted') return 'adjusted'
  if (existing.caseStatus) return existing.caseStatus
  if (existing.assignedLeaderKey) return 'assigned'
  return 'identified'
}

function buildCaseInputFromListing(listing, existing = {}, todayKey) {
  const originalResetDate = existing.originalResetDate || listing.resetDate || null
  const currentResetDate = listing.resetDate || existing.currentResetDate || originalResetDate
  const outcomeStatus = inferOutcomeFromListing(listing, existing)
  const adjustedAt = outcomeStatus === 'adjusted' && currentResetDate
    ? currentResetDate
    : existing.adjustedAt || null
  const adjustmentDetectedAt = adjustedAt && !existing.adjustmentDetectedAt
    ? new Date().toISOString()
    : existing.adjustmentDetectedAt || null

  return {
    clickUpTaskId: listing.taskId,
    listingTitle: listing.title,
    listingUrl: listing.url,
    agentName: listing.agent,
    resetDate: listing.resetDate || null,
    daysSinceReset: listing.daysSinceReset,
    assignedLeaderKey: existing.assignedLeaderKey || '',
    assignedLeaderName: existing.assignedLeaderName || '',
    assignedLeaderEmail: existing.assignedLeaderEmail || '',
    caseStatus: inferCaseStatus(existing, outcomeStatus),
    outcomeStatus,
    firstSeenStaleDate: existing.firstSeenStaleDate || todayKey,
    staleSinceDate: existing.staleSinceDate || addDays(originalResetDate, 30),
    originalResetDate,
    currentResetDate,
    adjustedAt,
    adjustmentDetectedAt,
    actionPlanText: existing.actionPlanText || '',
    metadata: {
      source: 'sales-listing-case-sync',
      clickUpStatus: listing.clickUpStatus || '',
      activeStage: listing.activeStage || '',
      price: listing.price || '',
    },
  }
}

export async function syncSalesListingCasesFromInventory(report, options = {}) {
  const actor = options.actor || 'sales-listing-case-sync'
  const todayKey = options.todayKey || report.today || new Date().toISOString().slice(0, 10)
  const existingCases = await listSalesListingCases()
  const existingByTaskId = new Map(existingCases.map(row => [row.clickUpTaskId, row]))
  const listingByTaskId = new Map(([
    ...(report.staleListings || []),
    ...(report.recentResets || []),
    ...(report.fieldGaps?.missingResetDate || []),
    ...(report.trackedSourceListings || []),
  ]).filter(row => row?.taskId).map(row => [row.taskId, row]))

  const staleCreatedOrUpdated = []
  const staleTaskIds = new Set((report.staleListings || []).map(listing => listing.taskId).filter(Boolean))
  for (const listing of report.staleListings || []) {
    const existing = existingByTaskId.get(listing.taskId) || {}
    staleCreatedOrUpdated.push(await upsertSalesListingAssignment(
      buildCaseInputFromListing(listing, existing, todayKey),
      actor
    ))
  }

  const existingUpdated = []
  for (const existing of existingCases) {
    if (staleTaskIds.has(existing.clickUpTaskId)) continue
    const listing = listingByTaskId.get(existing.clickUpTaskId)
    if (!listing) continue
    existingUpdated.push(await upsertSalesListingAssignment(
      buildCaseInputFromListing(listing, existing, todayKey),
      actor
    ))
  }

  return {
    status: 'healthy',
    today: todayKey,
    staleCasesCreatedOrUpdated: staleCreatedOrUpdated.length,
    existingCasesRefreshed: existingUpdated.length,
    totalTouched: staleCreatedOrUpdated.length + existingUpdated.length,
  }
}
