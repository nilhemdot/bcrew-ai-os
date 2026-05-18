import crypto from 'node:crypto'

import { buildAgentRosterReviewQueue, CLICKUP_AGENT_ROSTER_LIST_ID } from './agent-roster-review.js'
import { getClickUpListSnapshotSafe } from './clickup.js'
import { getFubContextsSummary } from './fub.js'
import {
  getFubLeadSourceSnapshot,
  getLatestChangeEventForEntity,
  listFubLeadSourceRules,
  recordSourceDriftChange,
} from './foundation-db.js'
import { getDriveFileMetadata, getSheetValues } from './google-delegated.js'
import {
  GOVERNED_STALE_HOURS,
  GOVERNED_WARNING_HOURS,
  buildFubLeadSourcePayload,
  buildSourceWatchFreshness,
  getDefaultFubFlagState,
  getDefaultFubLeadSourceGroup,
  getDefaultFubMarketingType,
  syncFubLeadSourceDriftEvent,
  syncReviewQueueEvent,
} from './fub-lead-source-governance.js'

const FOUNDATION_GOOGLE_USER = 'ai@bensoncrew.ca'
const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const OWNERS_LEAD_SOURCE_LIST_RANGE = "'Lists'!J3:J120"
const OWNERS_ADMIN_REVIEW_RANGE = "'ADMIN ONLY - Deal Data Entry'!A1:CE2000"
const OWNERS_CONDITIONAL_REVIEW_RANGE = "'Listings and Conditional Deals'!A1:U500"
const GOVERNED_OWNERS_LEAD_SOURCE_VALUES = [
  '<unspecified>',
  'No Extra Lead Source',
  'AG - Ontario Farmer',
  'Agent Attraction',
  'Agent Flyer - Home Value Hub',
  'Agent Flyer - Home Value Hub – Geo Flyer',
  'Agent HVH – Agent Home Value Site',
  'Agent HVH – Generic Flyer',
  'Agent/Other Referral',
  'Agri - ZTeam.ca Call',
  'Agri For Sale Sign Call',
  'Apex - Brantford',
  'BCrew - YouTube',
  'BCrew Assistant Pond Lead Call',
  'BCrew Google Ads',
  'BCrew Google Search Call Brantfo',
  'BCrew Google Search Call Burling',
  'BCrew Google Search Call Guelph',
  'BCrew Info Email',
  'BCrew Investor Flyer Blasts',
  'BCrew Outdoor Media',
  'BCrew Realtor.ca',
  'BCrew Social Media Call',
  'BensonCrew.ca Call',
  'BensonCrew.ca Lead Capture',
  'BensonCrew.ca/careers Agent Application',
  'Bought Through Sign Call',
  'Branded Website',
  'Builder/Development Projects',
  'Cold Call',
  'Company Main Call',
  'Company Website – Home Value Hub',
  'Company Website – Sign Up',
  'Events & Contests',
  'Expired Listings',
  'Facebook',
  'Family',
  'For Sale Sign Call - Brantford S',
  'For Sale Sign Call - Guelph Surr',
  'FSBO',
  'Introduced',
  'Jeff Thibodeau - Crew Website Newsletter',
  'Jeff Thibodeau - Facebook',
  'Jeff Thibodeau - YouTube Viewer',
  'Luxury Presence',
  'Met - In Person',
  'Met - Social Media',
  'Non Lead Non Contact (Realtors Too)',
  'Ontario Farmer Ad Call',
  'Open House',
  'Open House – Agent',
  'Personal Referral',
  'Powerlink Residential Lead Form',
  'Realtor.ca',
  'ScottBensonTeam.ca',
  'Seller Onboarding - MattAllman.com',
  'Social Media Call',
  'Songbird Laning Lead Capture',
  'Ylopo',
  'Youtube Ad - Chris Amond',
  'zahndteam.ca',
  'Zahndteam.ca Call',
]

function hashText(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function normalizeSheetValue(value) {
  return value == null ? '' : String(value).trim()
}

function normalizeSheetDate(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'number') {
    const ms = Math.round((value - 25569) * 86400 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric) && /^\d+(\.\d+)?$/.test(String(value).trim())) {
    const ms = Math.round((numeric - 25569) * 86400 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return normalizeSheetValue(value)
  return date.toISOString().slice(0, 10)
}

function normalizeLowerSheetValue(value) {
  return normalizeSheetValue(value).toLowerCase()
}

function findSheetHeaderIndex(header, name) {
  return header.findIndex(value => normalizeSheetValue(value) === name)
}

function getGovernedOwnersLeadSourceValues() {
  return GOVERNED_OWNERS_LEAD_SOURCE_VALUES.slice()
}

function isAdminReviewTrigger(value) {
  const normalized = normalizeLowerSheetValue(value)
  return normalized === 'review this deal' || normalized === 'review' || normalized === 'rerun'
}

function isConditionalReviewTrigger(value) {
  const normalized = normalizeLowerSheetValue(value)
  return (
    normalized === 'review this conditional' ||
    normalized === 'review this deal' ||
    normalized === 'review' ||
    normalized === 'rerun'
  )
}

function hasOpenReviewStatus(value) {
  const normalized = normalizeLowerSheetValue(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized === 'issues found' || normalized === 'needs re review' || normalized === 'need re review' || normalized === 'not reviewed'
}

function hasOpenReviewAction(value) {
  const normalized = normalizeLowerSheetValue(value)
  return Boolean(normalized) && normalized !== 'no action'
}

const FINDING_SUMMARY_LINE_LIMIT = 24

function summarizeFindings(value, limit = FINDING_SUMMARY_LINE_LIMIT) {
  const text = normalizeSheetValue(value)
  if (!text) return ''
  return text
    .split('\n')
    .map(lineValue => normalizeSheetValue(lineValue))
    .filter(Boolean)
    .slice(0, limit)
    .join(' | ')
}

function classifyAdminIssueLanes(value) {
  const text = normalizeSheetValue(value)
  const lanes = new Set()
  let currentSection = ''

  function addLaneForIssueLine(line, section) {
    const lower = normalizeLowerSheetValue(line)
    if (!lower) return
    if (section === 'result') return

    if (
      section === 'owners' ||
      lower.includes('gross to team') ||
      lower.includes('split deal') ||
      lower.includes('required b:t') ||
      lower.includes('core ag+') ||
      lower.includes('company or agent') ||
      lower.includes('lead source') ||
      lower.includes('source row')
    ) {
      lanes.add('dealData')
    }

    if (
      section === 'fub' ||
      lower.includes('follow up boss') ||
      lower.includes('linked fub') ||
      lower.includes('crm') ||
      lower.includes('past client') ||
      lower.includes('firm deal') ||
      lower.includes('fub stage') ||
      lower.includes('fub source')
    ) {
      lanes.add('crmFub')
    }

    if (
      lower.includes('clickup task') ||
      lower.includes('deal # / trade number') ||
      lower.includes('multiple clickup') ||
      lower.includes('aios admin deal row link') ||
      lower.includes('review evidence link') ||
      lower.includes('fub call / review evidence') ||
      lower.includes('no clickup deal data entry task')
    ) {
      lanes.add('dealWorkflow')
    }

    if (lower.includes('internal onboarding') || lower.includes('internal deal')) {
      lanes.add('internalReview')
    }

    if (lower.includes('nps')) {
      lanes.add('clientNps')
    }

    if (lower.includes('google review')) {
      lanes.add('googleReview')
    }
  }

  text
    .split('\n')
    .map(lineValue => normalizeSheetValue(lineValue))
    .filter(Boolean)
    .forEach(line => {
      const lower = normalizeLowerSheetValue(line)
      const score = line.match(/^(.+?)\s+\((\d+)\/(\d+)\s+passed\)$/i)
      if (score) {
        const label = normalizeLowerSheetValue(score[1])
        currentSection = label.includes('owners')
          ? 'owners'
          : label.includes('fub')
            ? 'fub'
            : label.includes('clickup') || label.includes('freedom')
              ? 'workflow'
              : ''
        const passed = Number(score[2])
        const total = Number(score[3])
        if (Number.isFinite(passed) && Number.isFinite(total) && passed < total) {
          if (currentSection === 'owners') lanes.add('dealData')
          if (currentSection === 'fub') lanes.add('crmFub')
        }
        return
      }

      if (lower === 'result') {
        currentSection = 'result'
        return
      }

      addLaneForIssueLine(line, currentSection)
    })

  if (!lanes.size) lanes.add('dealData')
  return Array.from(lanes)
}

function mergeIssueLanes(base, next) {
  return Array.from(new Set([].concat(base || []).concat(next || []).filter(Boolean)))
}

function buildAdminReviewQueue(rows) {
  const header = rows[0] || []
  const cols = {
    deal: findSheetHeaderIndex(header, 'Deal #'),
    client: findSheetHeaderIndex(header, 'Client Name'),
    realtor: findSheetHeaderIndex(header, 'Realtor'),
    executed: findSheetHeaderIndex(header, 'Date Firm (Executed)'),
    reviewStatus: findSheetHeaderIndex(header, 'AI Review Status'),
    reviewAction: findSheetHeaderIndex(header, 'THIS ROW ONLY: REVIEW ACTION'),
    findings: findSheetHeaderIndex(header, 'AI Findings By System / Suggestions'),
  }

  const rowItems = rows
    .slice(1)
    .map((row, index) => {
      const deal = normalizeSheetValue(row[cols.deal])
      if (!deal) return null

      const reviewStatus = normalizeSheetValue(row[cols.reviewStatus])
      const reviewAction = normalizeSheetValue(row[cols.reviewAction])
      const open = hasOpenReviewStatus(reviewStatus) || hasOpenReviewAction(reviewAction)
      if (!open) return null
      const findings = row[cols.findings]

      return {
        queue: 'admin',
        rowNumber: index + 2,
        id: deal,
        title: deal,
        subtitle: normalizeSheetValue(row[cols.client]) || 'Client missing',
        owner: normalizeSheetValue(row[cols.realtor]) || 'Agent missing',
        executedDate: normalizeSheetDate(row[cols.executed]),
        reviewStatus: reviewStatus || 'Not Reviewed',
        reviewAction: reviewAction || 'No Action',
        queuedForReview: isAdminReviewTrigger(reviewAction),
        needsFixing: normalizeLowerSheetValue(reviewAction) === 'needs fixing' || normalizeLowerSheetValue(reviewStatus) === 'issues found',
        findingsPreview: summarizeFindings(findings),
        issueLanes: classifyAdminIssueLanes(findings),
      }
    })
    .filter(Boolean)
  const itemsByDeal = new Map()

  rowItems.forEach(item => {
    if (!itemsByDeal.has(item.id)) {
      itemsByDeal.set(item.id, {
        ...item,
        rowNumbers: [item.rowNumber],
        owners: item.owner && item.owner !== 'Agent missing' ? [item.owner] : [],
      })
      return
    }

    const existing = itemsByDeal.get(item.id)
    existing.rowNumbers.push(item.rowNumber)
    if (item.owner && item.owner !== 'Agent missing' && !existing.owners.includes(item.owner)) {
      existing.owners.push(item.owner)
    }
    existing.queuedForReview = existing.queuedForReview || item.queuedForReview
    existing.needsFixing = existing.needsFixing || item.needsFixing
    existing.issueLanes = mergeIssueLanes(existing.issueLanes, item.issueLanes)
    if (!existing.findingsPreview && item.findingsPreview) existing.findingsPreview = item.findingsPreview
    if (!existing.subtitle || existing.subtitle === 'Client missing') existing.subtitle = item.subtitle
    if (!existing.executedDate && item.executedDate) existing.executedDate = item.executedDate
  })

  const items = Array.from(itemsByDeal.values()).map(item => {
    const owners = Array.isArray(item.owners) ? item.owners : []
    return {
      ...item,
      owner: owners.length ? owners.join(', ') : item.owner,
      splitRowCount: item.rowNumbers.length,
    }
  })

  return {
    totalTrackedRows: rows.slice(1).filter(row => normalizeSheetValue(row[cols.deal])).length,
    openItems: items.length,
    queuedReview: items.filter(item => item.queuedForReview).length,
    needsFixing: items.filter(item => item.needsFixing).length,
    items,
  }
}

function buildConditionalReviewQueue(rows) {
  if (normalizeSheetValue(rows[0] && rows[0][0]) === 'Conditional Pipeline Forecast - ClickUp Generated') {
    return buildClickUpConditionalForecastQueue(rows)
  }

  const header = rows[1] || []
  const cols = {
    type: findSheetHeaderIndex(header, 'Type'),
    agent: findSheetHeaderIndex(header, 'Agent'),
    address: findSheetHeaderIndex(header, 'Address'),
    status: findSheetHeaderIndex(header, 'Status'),
    clientName: findSheetHeaderIndex(header, 'Client Name'),
    fubLink: findSheetHeaderIndex(header, 'FUB Person URL / ID'),
    reviewStatus: findSheetHeaderIndex(header, 'AI Conditional Review Status'),
    reviewAction: findSheetHeaderIndex(header, 'THIS ROW ONLY: CONDITIONAL REVIEW ACTION'),
    findings: findSheetHeaderIndex(header, 'AI Conditional Findings / Suggestions'),
  }

  const items = rows
    .slice(2)
    .map((row, index) => {
      const type = normalizeSheetValue(row[cols.type])
      const agent = normalizeSheetValue(row[cols.agent])
      if (!type || !agent) return null

      const reviewStatus = normalizeSheetValue(row[cols.reviewStatus])
      const reviewAction = normalizeSheetValue(row[cols.reviewAction])
      const open = hasOpenReviewStatus(reviewStatus) || hasOpenReviewAction(reviewAction)
      if (!open) return null

      return {
        queue: 'conditional',
        rowNumber: index + 3,
        id: `conditional-row-${index + 3}`,
        title: normalizeSheetValue(row[cols.address]) || normalizeSheetValue(row[cols.clientName]) || `Conditional row ${index + 3}`,
        subtitle: normalizeSheetValue(row[cols.clientName]) || 'Client missing',
        owner: agent,
        conditionalStatus: normalizeSheetValue(row[cols.status]) || 'Status missing',
        reviewStatus: reviewStatus || 'Not Reviewed',
        reviewAction: reviewAction || 'No Action',
        hasFubLink: Boolean(normalizeSheetValue(row[cols.fubLink])),
        queuedForReview: isConditionalReviewTrigger(reviewAction),
        needsFixing: normalizeLowerSheetValue(reviewAction) === 'needs fixing' || normalizeLowerSheetValue(reviewStatus) === 'issues found',
        findingsPreview: summarizeFindings(row[cols.findings]),
        issueLanes: ['conditional'],
      }
    })
    .filter(Boolean)

  return {
    totalTrackedRows: rows.slice(2).filter(row => normalizeSheetValue(row[cols.type]) && normalizeSheetValue(row[cols.agent])).length,
    openItems: items.length,
    queuedReview: items.filter(item => item.queuedForReview).length,
    needsFixing: items.filter(item => item.needsFixing).length,
    items,
  }
}

function buildClickUpConditionalForecastQueue(rows) {
  const headerIndex = rows.findIndex(row => normalizeSheetValue(row && row[0]) === 'Conditional Deal')
  const header = headerIndex >= 0 ? rows[headerIndex] || [] : []
  const cols = {
    deal: findSheetHeaderIndex(header, 'Conditional Deal'),
    side: findSheetHeaderIndex(header, 'Side'),
    agent: findSheetHeaderIndex(header, 'Agent'),
    acceptedOfferDate: findSheetHeaderIndex(header, 'Accepted Offer Date'),
    conditionalDeadline: findSheetHeaderIndex(header, 'Conditional Deadline'),
    closingDate: findSheetHeaderIndex(header, 'Closing Date'),
    expectedTeam: findSheetHeaderIndex(header, 'Expected Team $'),
    depositStatus: findSheetHeaderIndex(header, 'Deposit Status'),
    depositReceivedDate: findSheetHeaderIndex(header, 'Deposit Received Date'),
    tradeNumber: findSheetHeaderIndex(header, 'Trade Number'),
    fubLink: findSheetHeaderIndex(header, 'FUB Link'),
    clickUpUrl: findSheetHeaderIndex(header, 'ClickUp URL'),
    missingData: findSheetHeaderIndex(header, 'Missing / Action Needed'),
    reviewAction: findSheetHeaderIndex(header, 'THIS ROW ONLY: CONDITIONAL REVIEW ACTION'),
    findings: findSheetHeaderIndex(header, 'AI Conditional Findings / Suggestions'),
  }

  const dataStart = headerIndex >= 0 ? headerIndex + 1 : rows.length
  const allItems = rows
    .slice(dataStart)
    .map((row, index) => {
      const title = normalizeSheetValue(row[cols.deal])
      const agent = normalizeSheetValue(row[cols.agent])
      if (!title || !agent) return null

      const missingData = summarizeFindings(row[cols.missingData])
      const conditionalDeadline = normalizeSheetDate(row[cols.conditionalDeadline])
      const closingDate = normalizeSheetDate(row[cols.closingDate])
      const expectedTeam = normalizeSheetValue(row[cols.expectedTeam])
      const tradeNumber = normalizeSheetValue(row[cols.tradeNumber])
      const fubLink = normalizeSheetValue(row[cols.fubLink])
      const missingPieces = []
      if (!closingDate) missingPieces.push('closing date')
      if (!expectedTeam) missingPieces.push('expected team $')
      if (!tradeNumber) missingPieces.push('trade number')
      if (!fubLink) missingPieces.push('FUB link')
      const reviewAction = normalizeSheetValue(row[cols.reviewAction])
      const queuedForReview = isConditionalReviewTrigger(reviewAction)
      const findingsFromSheet = summarizeFindings(row[cols.findings])
      const findings = findingsFromSheet || missingData || (missingPieces.length ? 'Missing: ' + missingPieces.join(', ') : 'Conditional forecast row is complete.')
      const needsFixing = missingPieces.length > 0 || queuedForReview

      return {
        queue: 'conditional',
        rowNumber: dataStart + index + 1,
        id: `conditional-forecast-${dataStart + index + 1}`,
        title,
        subtitle: normalizeSheetValue(row[cols.side]) || 'Conditional',
        owner: agent,
        conditionalDeadline,
        closingDate,
        depositStatus: normalizeSheetValue(row[cols.depositStatus]),
        depositReceivedDate: normalizeSheetDate(row[cols.depositReceivedDate]),
        tradeNumber,
        hasFubLink: Boolean(fubLink),
        clickUpUrl: normalizeSheetValue(row[cols.clickUpUrl]),
        reviewStatus: missingPieces.length ? (queuedForReview ? 'Re-review Still Failing' : 'Missing Data') : (queuedForReview ? 'Ready For Re-review' : 'Ready'),
        reviewAction: queuedForReview ? reviewAction : (missingPieces.length ? 'Needs Fixing' : 'No Action'),
        queuedForReview,
        needsFixing,
        findingsPreview: findings,
        issueLanes: ['conditional'],
      }
    })
    .filter(Boolean)

  const items = allItems.filter(item => item.needsFixing || item.queuedForReview)

  return {
    totalTrackedRows: allItems.length,
    openItems: items.length,
    queuedReview: 0,
    needsFixing: items.length,
    items,
  }
}

function buildFubLeadSourceReviewQueue(payload) {
  const drift = payload && payload.drift ? payload.drift : null
  const stats = payload && payload.stats ? payload.stats : {}
  const items = []

  if (drift && drift.buckets) {
    ;(drift.buckets.needsRules || []).forEach(function(item) {
      items.push({
        queue: 'fub-drift',
        rowNumber: null,
        id: 'fub-needs-rule:' + item.source,
        title: item.source,
        subtitle: (item.count || 0) + ' contact' + ((item.count || 0) === 1 ? '' : 's'),
        owner: 'FUB taxonomy',
        reviewStatus: 'Needs Rule',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'New raw FUB source with no governed rule yet.',
        issueLanes: ['fubRules'],
      })
    })

    ;(drift.buckets.openClassification || []).forEach(function(item) {
      const openParts = []
      if (item.openMarketing) openParts.push('marketing open')
      if (item.openOwnership) openParts.push('ownership open')
      items.push({
        queue: 'fub-drift',
        rowNumber: null,
        id: 'fub-open-classification:' + item.source,
        title: item.source,
        subtitle: (item.count || 0) + ' contact' + ((item.count || 0) === 1 ? '' : 's'),
        owner: 'FUB taxonomy',
        reviewStatus: 'Open Classification',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'Governed rule still leaves ' + openParts.join(' + ') + '.',
        issueLanes: ['fubRules'],
      })
    })

    ;(drift.buckets.legacyPresent || []).forEach(function(item) {
      items.push({
        queue: 'fub-drift',
        rowNumber: null,
        id: 'fub-legacy:' + item.source,
        title: item.source,
        subtitle: (item.count || 0) + ' contact' + ((item.count || 0) === 1 ? '' : 's'),
        owner: 'FUB taxonomy',
        reviewStatus: 'Legacy Still Live',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'Legacy / invalid source is still present in live FUB data.',
        issueLanes: ['fubRules'],
      })
    })

    if (drift.stale && drift.stale.isStale) {
      items.push({
        queue: 'fub-drift',
        rowNumber: null,
        id: 'fub-stale:owner',
        title: 'FUB source snapshot is stale',
        subtitle: Math.floor(drift.stale.ageHours || 0) + ' hour' + (Math.floor(drift.stale.ageHours || 0) === 1 ? '' : 's') + ' old',
        owner: 'FUB taxonomy',
        reviewStatus: 'Stale',
        reviewAction: 'Needs Refresh',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'Refresh the owner-context FUB source snapshot before trusting the queue.',
        issueLanes: ['fubRules'],
      })
    }
  }

  return {
    totalTrackedRows: stats.totalSources || 0,
    openItems: items.length,
    queuedReview: items.filter(item => item.queuedForReview).length,
    needsFixing: items.filter(item => item.needsFixing).length,
    items,
  }
}

function buildOwnersGovernanceReviewQueue(payload) {
  const drift = payload && payload.drift ? payload.drift : null
  const items = []

  if (drift && drift.buckets) {
    ;(drift.buckets.unexpectedInOwnersList || []).forEach(function(item) {
      items.push({
        queue: 'owners-governance',
        rowNumber: null,
        id: 'owners-unexpected:' + item.value,
        title: item.value,
        subtitle: 'Unexpected dropdown value',
        owner: 'Owners governed list',
        reviewStatus: 'Unexpected',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'This value is live in the Owners dropdown but not in the governed approved list.',
        issueLanes: ['ownersLists'],
      })
    })

    ;(drift.buckets.missingFromOwnersList || []).forEach(function(item) {
      items.push({
        queue: 'owners-governance',
        rowNumber: null,
        id: 'owners-missing:' + item.value,
        title: item.value,
        subtitle: 'Missing approved dropdown value',
        owner: 'Owners governed list',
        reviewStatus: 'Missing',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'This approved source is missing from the governed Owners dropdown.',
        issueLanes: ['ownersLists'],
      })
    })

    ;(drift.buckets.duplicates || []).forEach(function(item) {
      items.push({
        queue: 'owners-governance',
        rowNumber: null,
        id: 'owners-duplicate:' + item.value,
        title: item.value,
        subtitle: (item.count || 0) + ' duplicate entries',
        owner: 'Owners governed list',
        reviewStatus: 'Duplicate',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'This approved dropdown value appears more than once in the Owners list.',
        issueLanes: ['ownersLists'],
      })
    })
  }

  return {
    totalTrackedRows: drift && drift.stats ? drift.stats.currentValues || 0 : 0,
    openItems: items.length,
    queuedReview: items.filter(item => item.queuedForReview).length,
    needsFixing: items.filter(item => item.needsFixing).length,
    items,
  }
}

function buildOwnersLeadSourceGovernance(listValues, _rules, sheetMeta) {
  const currentValues = (listValues || [])
    .flat()
    .map(normalizeSheetValue)
    .filter(Boolean)

  const currentCounts = new Map()
  currentValues.forEach(function(value) {
    currentCounts.set(value, (currentCounts.get(value) || 0) + 1)
  })

  const currentUnique = Array.from(currentCounts.keys()).sort(function(a, b) {
    return a.localeCompare(b)
  })

  const governedValues = getGovernedOwnersLeadSourceValues()
  const governedSet = new Set(governedValues)
  const currentSet = new Set(currentUnique)

  const unexpectedInOwnersList = currentUnique
    .filter(function(value) {
      return !governedSet.has(value)
    })
    .map(function(value) {
      return {
        value,
        count: currentCounts.get(value) || 1,
      }
    })

  const missingFromOwnersList = governedValues
    .filter(function(value) {
      return !currentSet.has(value)
    })
    .map(function(value) {
      return { value }
    })

  const duplicates = currentUnique
    .filter(function(value) {
      return (currentCounts.get(value) || 0) > 1
    })
    .map(function(value) {
      return {
        value,
        count: currentCounts.get(value) || 0,
      }
    })

  const stats = {
    currentValues: currentValues.length,
    uniqueCurrentValues: currentUnique.length,
    governedValues: governedValues.length,
    unexpected: unexpectedInOwnersList.length,
    missing: missingFromOwnersList.length,
    duplicates: duplicates.length,
    reviewNow: unexpectedInOwnersList.length + missingFromOwnersList.length + duplicates.length,
  }

  const status = !currentValues.length
    ? 'no_data'
    : stats.reviewNow
      ? 'review'
      : 'clean'

  const fingerprint = hashText(JSON.stringify({
    status,
    currentUnique,
    unexpected: unexpectedInOwnersList.map(function(item) {
      return [item.value, item.count]
    }),
    missing: missingFromOwnersList.map(function(item) {
      return item.value
    }),
    duplicates: duplicates.map(function(item) {
      return [item.value, item.count]
    }),
  }))

  return {
    status,
    fingerprint,
    stats,
    ownersList: {
      available: currentValues.length > 0,
      modifiedTime: sheetMeta && sheetMeta.modifiedTime ? sheetMeta.modifiedTime : null,
      webViewLink: sheetMeta && sheetMeta.webViewLink ? sheetMeta.webViewLink : null,
    },
    buckets: {
      unexpectedInOwnersList,
      missingFromOwnersList,
      duplicates,
    },
  }
}

function buildOwnersLeadSourceGovernanceSummary(payload) {
  const drift = payload && payload.drift ? payload.drift : null
  if (!drift || drift.status === 'no_data') {
    return 'Owners governed lead-source list drift waiting on readable list data'
  }
  if (drift.status === 'clean') {
    return 'Owners governed lead-source list drift cleared'
  }

  const parts = []
  if (drift.stats.unexpected) parts.push(drift.stats.unexpected + ' unexpected value' + (drift.stats.unexpected === 1 ? '' : 's'))
  if (drift.stats.missing) parts.push(drift.stats.missing + ' missing approved value' + (drift.stats.missing === 1 ? '' : 's'))
  if (drift.stats.duplicates) parts.push(drift.stats.duplicates + ' duplicate value' + (drift.stats.duplicates === 1 ? '' : 's'))
  return 'Owners governed lead-source list drift: ' + parts.join(', ')
}

function buildOwnersLeadSourceGovernanceMetadata(payload) {
  const drift = payload && payload.drift ? payload.drift : null
  return {
    fingerprint: drift ? drift.fingerprint : '',
    status: drift ? drift.status : 'no_data',
    stats: drift ? drift.stats : {},
    ownersList: payload && payload.ownersList ? payload.ownersList : {},
    samples: {
      unexpectedInOwnersList: (drift && drift.buckets ? drift.buckets.unexpectedInOwnersList : []).slice(0, 5).map(function(item) {
        return item.value
      }),
      missingFromOwnersList: (drift && drift.buckets ? drift.buckets.missingFromOwnersList : []).slice(0, 5).map(function(item) {
        return item.value
      }),
      duplicates: (drift && drift.buckets ? drift.buckets.duplicates : []).slice(0, 5).map(function(item) {
        return item.value
      }),
    },
  }
}

async function syncOwnersLeadSourceGovernanceEvent(payload, actor) {
  if (!payload || !payload.drift) return null

  const eventType = payload.drift.status === 'review'
    ? 'source_drift_detected'
    : 'source_drift_cleared'

  return recordSourceDriftChange({
    eventType,
    entityTable: 'owners_sheet_lists',
    entityId: 'SRC-OWNERS-001:lead-source-dropdown',
    summary: buildOwnersLeadSourceGovernanceSummary(payload),
    metadata: buildOwnersLeadSourceGovernanceMetadata(payload),
  }, actor)
}

export function registerOwnersGovernanceRoutes(app, deps = {}) {
  const { requireAdminToken, sendApiError, cacheHeadersNoStore } = deps

  app.get('/api/owners/lead-source-governance', requireAdminToken, async (_req, res) => {
    try {
      const [listResponse, fileMeta, rules] = await Promise.all([
        getSheetValues(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID, OWNERS_LEAD_SOURCE_LIST_RANGE),
        getDriveFileMetadata(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID),
        listFubLeadSourceRules(),
      ])

      const drift = buildOwnersLeadSourceGovernance(listResponse.values || [], rules, fileMeta)
      const payload = {
        sourceId: 'SRC-OWNERS-001',
        ownersList: {
          sheetId: OWNERS_SHEET_ID,
          range: OWNERS_LEAD_SOURCE_LIST_RANGE,
          modifiedTime: fileMeta && fileMeta.modifiedTime ? fileMeta.modifiedTime : null,
          webViewLink: fileMeta && fileMeta.webViewLink ? fileMeta.webViewLink : null,
        },
        drift,
      }

      const syncResult = await syncOwnersLeadSourceGovernanceEvent(payload, 'system')
      const latestEvent = syncResult && syncResult.event
        ? syncResult.event
        : await getLatestChangeEventForEntity('owners_sheet_lists', 'SRC-OWNERS-001:lead-source-dropdown', ['source_drift_detected', 'source_drift_cleared'])
      payload.freshness = buildSourceWatchFreshness(latestEvent, payload.drift.status === 'review', {
        reason: 'Governed Owners dropdown drift has been sitting unchanged.',
      })

      cacheHeadersNoStore(res)
      res.json(payload)
    } catch (error) {
      const statusCode = error && typeof error === 'object' && 'status' in error && error.status ? error.status : 500
      sendApiError(
        res,
        statusCode,
        'owners_lead_source_governance_failed',
        error instanceof Error ? error.message : 'Failed to load Owners lead-source governance.'
      )
    }
  })

  app.get('/api/owners/review-queue', requireAdminToken, async (_req, res) => {
    try {
      const fubContexts = getFubContextsSummary()
      const ownerFubContext = fubContexts.find(function(item) { return item.key === 'owner' }) || { key: 'owner', label: 'Support / Owner account' }

      const [adminResponse, conditionalResponse, fileMeta, fubSnapshot, rules, ownersListResponse, agentRosterSnapshot] = await Promise.all([
        getSheetValues(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID, OWNERS_ADMIN_REVIEW_RANGE),
        getSheetValues(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID, OWNERS_CONDITIONAL_REVIEW_RANGE),
        getDriveFileMetadata(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID),
        getFubLeadSourceSnapshot('owner'),
        listFubLeadSourceRules(),
        getSheetValues(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID, OWNERS_LEAD_SOURCE_LIST_RANGE),
        getClickUpListSnapshotSafe(CLICKUP_AGENT_ROSTER_LIST_ID, { listName: 'Agent Roster' }),
      ])

      const admin = buildAdminReviewQueue(adminResponse.values || [])
      const conditional = buildConditionalReviewQueue(conditionalResponse.values || [])
      const fubLeadSources = buildFubLeadSourcePayload(fubSnapshot, rules, ownerFubContext)
      const ownersGovernancePayload = {
        sourceId: 'SRC-OWNERS-001',
        ownersList: {
          sheetId: OWNERS_SHEET_ID,
          range: OWNERS_LEAD_SOURCE_LIST_RANGE,
          modifiedTime: fileMeta && fileMeta.modifiedTime ? fileMeta.modifiedTime : null,
          webViewLink: fileMeta && fileMeta.webViewLink ? fileMeta.webViewLink : null,
        },
        drift: buildOwnersLeadSourceGovernance(ownersListResponse.values || [], rules, fileMeta),
      }
      const fubDrift = buildFubLeadSourceReviewQueue(fubLeadSources)
      const ownersGovernance = buildOwnersGovernanceReviewQueue(ownersGovernancePayload)
      const agentRoster = buildAgentRosterReviewQueue(agentRosterSnapshot)
      agentRoster.items = (agentRoster.items || []).map(function(item) {
        return {
          ...item,
          issueLanes: mergeIssueLanes(item.issueLanes, ['agentOnboarding']),
        }
      })
      const combinedQueue = {
        totalTrackedRows: admin.totalTrackedRows + conditional.totalTrackedRows + fubDrift.totalTrackedRows + ownersGovernance.totalTrackedRows + agentRoster.totalTrackedRows,
        openItems: admin.openItems + conditional.openItems + fubDrift.openItems + ownersGovernance.openItems + agentRoster.openItems,
        queuedReview: admin.queuedReview + conditional.queuedReview + fubDrift.queuedReview + ownersGovernance.queuedReview + agentRoster.queuedReview,
        needsFixing: admin.needsFixing + conditional.needsFixing + fubDrift.needsFixing + ownersGovernance.needsFixing + agentRoster.needsFixing,
        items: []
          .concat(admin.items || [])
          .concat(conditional.items || [])
          .concat(fubDrift.items || [])
          .concat(ownersGovernance.items || [])
          .concat(agentRoster.items || []),
      }

      const [adminSync, conditionalSync, combinedSync, fubSync, ownersGovernanceSync, agentRosterSync] = await Promise.all([
        syncReviewQueueEvent({
          entityTable: 'owners_review_queue',
          entityId: 'SRC-OWNERS-001:admin',
          label: 'Owners admin lane',
          queue: admin,
        }, 'system'),
        syncReviewQueueEvent({
          entityTable: 'owners_review_queue',
          entityId: 'SRC-OWNERS-001:conditional',
          label: 'Owners conditional lane',
          queue: conditional,
        }, 'system'),
        syncReviewQueueEvent({
          entityTable: 'owners_review_queue',
          entityId: 'SRC-OWNERS-001:combined',
          label: 'Owners combined governed inbox',
          queue: combinedQueue,
          extra: {
            sectionCounts: {
              admin: admin.openItems,
              conditional: conditional.openItems,
              fubDrift: fubDrift.openItems,
              ownersGovernance: ownersGovernance.openItems,
              agentRoster: agentRoster.openItems,
            },
          },
        }, 'system'),
        syncFubLeadSourceDriftEvent(fubLeadSources, 'system'),
        syncOwnersLeadSourceGovernanceEvent(ownersGovernancePayload, 'system'),
        syncReviewQueueEvent({
          entityTable: 'clickup_review_queue',
          entityId: 'SRC-CLICKUP-001:agent-roster',
          label: 'ClickUp Agent Roster lane',
          queue: agentRoster,
        }, 'system'),
      ])

      admin.freshness = buildSourceWatchFreshness(
        adminSync && adminSync.event
          ? adminSync.event
          : await getLatestChangeEventForEntity('owners_review_queue', 'SRC-OWNERS-001:admin', ['review_queue_changed', 'review_queue_cleared']),
        admin.openItems > 0,
        { reason: 'Admin deal review findings have been sitting unchanged.' }
      )

      conditional.freshness = buildSourceWatchFreshness(
        conditionalSync && conditionalSync.event
          ? conditionalSync.event
          : await getLatestChangeEventForEntity('owners_review_queue', 'SRC-OWNERS-001:conditional', ['review_queue_changed', 'review_queue_cleared']),
        conditional.openItems > 0,
        { reason: 'Conditional forecast missing-data items have been sitting unchanged.' }
      )

      fubDrift.freshness = !fubLeadSources.snapshot.available
        ? buildSourceWatchFreshness(
            fubSync && fubSync.event
              ? fubSync.event
              : await getLatestChangeEventForEntity('fub_lead_source_snapshots', ownerFubContext.key, ['source_drift_detected', 'source_drift_cleared']),
            false,
            {
              missing: true,
              reason: 'No saved owner-context FUB snapshot exists yet.',
            }
          )
        : buildSourceWatchFreshness(
            fubSync && fubSync.event
              ? fubSync.event
              : await getLatestChangeEventForEntity('fub_lead_source_snapshots', ownerFubContext.key, ['source_drift_detected', 'source_drift_cleared']),
            fubDrift.openItems > 0,
            {
              forcedStatus: fubLeadSources.drift && fubLeadSources.drift.stale && fubLeadSources.drift.stale.isStale ? 'stale' : '',
              forcedReason: fubLeadSources.drift && fubLeadSources.drift.stale && fubLeadSources.drift.stale.isStale
                ? 'Saved FUB source snapshot is older than 24 hours.'
                : 'FUB taxonomy drift has been sitting unchanged.',
            }
          )
      fubDrift.freshness.snapshotAgeHours = fubLeadSources.drift && fubLeadSources.drift.stale ? fubLeadSources.drift.stale.ageHours : null

      ownersGovernance.freshness = buildSourceWatchFreshness(
        ownersGovernanceSync && ownersGovernanceSync.event
          ? ownersGovernanceSync.event
          : await getLatestChangeEventForEntity('owners_sheet_lists', 'SRC-OWNERS-001:lead-source-dropdown', ['source_drift_detected', 'source_drift_cleared']),
        ownersGovernance.openItems > 0,
        { reason: 'Governed Owners dropdown drift has been sitting unchanged.' }
      )

      agentRoster.freshness = buildSourceWatchFreshness(
        agentRosterSync && agentRosterSync.event
          ? agentRosterSync.event
          : await getLatestChangeEventForEntity('clickup_review_queue', 'SRC-CLICKUP-001:agent-roster', ['review_queue_changed', 'review_queue_cleared']),
        agentRoster.openItems > 0,
        { reason: 'Agent roster accountability findings have been sitting unchanged.' }
      )

      const reviewQueueFreshness = buildSourceWatchFreshness(
        combinedSync && combinedSync.event
          ? combinedSync.event
          : await getLatestChangeEventForEntity('owners_review_queue', 'SRC-OWNERS-001:combined', ['review_queue_changed', 'review_queue_cleared']),
        combinedQueue.openItems > 0,
        { reason: 'The combined Owners governed inbox has been sitting unchanged.' }
      )

      cacheHeadersNoStore(res)
      res.json({
        sourceId: 'SRC-OWNERS-001',
        reviewQueue: {
          status: combinedQueue.openItems ? 'open' : 'clear',
          stats: {
            openItems: combinedQueue.openItems,
            queuedReview: combinedQueue.queuedReview,
            needsFixing: combinedQueue.needsFixing,
          },
          freshness: reviewQueueFreshness,
          freshnessRules: {
            warningHours: GOVERNED_WARNING_HOURS,
            staleHours: GOVERNED_STALE_HOURS,
            fubSnapshotStaleHours: 24,
          },
          ownersSheet: {
            sheetId: OWNERS_SHEET_ID,
            modifiedTime: fileMeta && fileMeta.modifiedTime ? fileMeta.modifiedTime : null,
            webViewLink: fileMeta && fileMeta.webViewLink ? fileMeta.webViewLink : null,
          },
          sections: {
            admin,
            conditional,
            fubDrift,
            ownersGovernance,
            agentRoster,
          },
        },
      })
    } catch (error) {
      const statusCode = error && typeof error === 'object' && 'status' in error && error.status ? error.status : 500
      sendApiError(
        res,
        statusCode,
        'owners_review_queue_failed',
        error instanceof Error ? error.message : 'Failed to load Owners review queue.'
      )
    }
  })

}

function evaluateOwnersGovernanceRoutesSplit({ serverSource = '', moduleSource = '', proofScriptSource = '' } = {}) {
  const routeMarkers = ["app.get('/api/owners/lead-source-governance'", "app.get('/api/owners/review-queue'"]
  return {
    moduleOwnsRoutes: moduleSource.includes('registerOwnersGovernanceRoutes') && routeMarkers.every(marker => moduleSource.includes(marker)),
    serverDelegates: serverSource.includes('registerOwnersGovernanceRoutes(app'),
    oldInlineRemoved: routeMarkers.every(marker => !serverSource.includes(marker)),
    proofRejectsLiveReads: proofScriptSource.includes('does not call Owners success-path live reads'),
  }
}

export function buildOwnersGovernanceRoutesSplitDogfoodProof(input = {}) {
  const evaluate = fixture => Object.values(evaluateOwnersGovernanceRoutesSplit(fixture)).every(Boolean)
  const routeMarkers = ["app.get('/api/owners/lead-source-governance'", "app.get('/api/owners/review-queue'"]
  const healthy = evaluate(input)
  const missingModule = !evaluate({ ...input, moduleSource: '' })
  const oldInlineServer = !evaluate({ ...input, serverSource: String(input.serverSource || '') + '\n' + routeMarkers.join('\n') })
  const missingRegistrar = !evaluate({ ...input, serverSource: String(input.serverSource || '').replace('registerOwnersGovernanceRoutes(app', 'registerOwnersGovernanceRoutesMissing(app') })
  const weakProof = !evaluate({ ...input, proofScriptSource: 'substring-only proof' })
  return {
    ok: healthy && missingModule && oldInlineServer && missingRegistrar && weakProof,
    passing: healthy,
    rejected: { missingModule, oldInlineServer, missingRegistrar, weakProof },
    summary: 'Owners governance route split accepts registrar/module ownership and rejects missing module, old inline route ownership, missing registrar, and proof that might call success-path live reads.',
  }
}
