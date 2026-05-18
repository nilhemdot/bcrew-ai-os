import crypto from 'node:crypto'
import { recordReviewQueueChange, recordSourceDriftChange } from './foundation-db.js'

function hashText(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

const DEFAULT_FUB_LEAD_SOURCE_GROUPS = {
  'Web Leads': [
    'BensonCrew.ca Lead Capture',
    'Company Website – Home Value Hub',
    'Company Website – Home Value Site',
    'Company Website – Sign Up',
    'Luxury Presence',
    'zahndteam.ca',
    'ScottBensonTeam.ca',
    'BCrew Realtor.ca',
    'Realtor.ca',
    'Songbird Laning Lead Capture',
    'Songbird Landing',
    'Brick and Oak Lead Capture',
    'Powerlink Residential Lead Form',
    'Branded Website',
    'Website',
  ],
  'Ads Leads': [
    'BCrew Google Ads',
    'Facebook',
  ],
  'Offline Leads': [
    'BCrew Investor Flyer Blasts',
    'BCrew Info Email',
    'Ontario Farmer Ad Call',
    'BCrew Outdoor Media',
    'Agent HVH – Generic Flyer',
    'Agent Flyer - Home Value Hub – Geo Flyer',
    'Agent Flyer - Home Value Hub',
  ],
  'Phone Leads': [
    'BensonCrew.ca Call',
    'Company Main Call',
    'Zahndteam.ca Call',
    'BCrew Google Search Call Guelph',
    'BCrew Google Search Call Guelph ',
    'BCrew Google Search Call Brantfo',
    'BCrew Brick & Oak Dev Call',
    'BCrew Social Media Call',
    'Social Media Call',
    'For Sale Sign Call - Guelph Surr',
    'For Sale Sign Call - Brantford S',
    'Agri For Sale Sign Call',
  ],
}
const DEFAULT_FUB_LEAD_SOURCE_GROUP_MAP = Object.entries(DEFAULT_FUB_LEAD_SOURCE_GROUPS).reduce((acc, entry) => {
  const group = entry[0]
  const names = entry[1]
  names.forEach(name => {
    acc[name] = group
  })
  return acc
}, {})

function getDefaultFubLeadSourceGroup(sourceName) {
  const source = String(sourceName || '').trim()
  if (!source) return null
  if (DEFAULT_FUB_LEAD_SOURCE_GROUP_MAP[source]) return DEFAULT_FUB_LEAD_SOURCE_GROUP_MAP[source]

  const lower = source.toLowerCase()
  if (lower.includes('meta lead ad') || lower.includes('google ads') || lower === 'facebook') return 'Ads Leads'
  if (lower.includes(' call')) return 'Phone Leads'
  if (lower.includes('website') || lower.includes('lead capture') || lower.includes('lead form') || lower.includes('realtor.ca')) return 'Web Leads'
  if (lower.includes('flyer') || lower.includes('outdoor media') || lower.includes('info email')) return 'Offline Leads'
  return null
}

function getDefaultFubMarketingType(sourceName) {
  return getDefaultFubLeadSourceGroup(sourceName) ? 'marketing' : 'unclassified'
}

function getDefaultFubFlagState(sourceName) {
  const lower = String(sourceName || '').trim().toLowerCase()
  if (!lower) return 'none'
  if (lower === '<unspecified>' || lower === 'import') return 'not_canonical'
  if (lower === 'sphere' || lower === 'soi') return 'not_canonical'
  return 'none'
}

function sampleSourceNames(items, limit = 5) {
  return (items || []).slice(0, limit).map(function(item) {
    return item.source
  })
}

function getHoursSince(timestamp) {
  if (!timestamp) return null
  const time = new Date(timestamp).getTime()
  if (!Number.isFinite(time)) return null
  return Math.max(0, (Date.now() - time) / (1000 * 60 * 60))
}

const GOVERNED_WARNING_HOURS = 72
const GOVERNED_STALE_HOURS = 168

function buildGovernedFreshness(event, active, options = {}) {
  const warningHours = options.warningHours || GOVERNED_WARNING_HOURS
  const staleHours = options.staleHours || GOVERNED_STALE_HOURS
  const forcedStatus = options.forcedStatus || ''
  const forcedReason = options.forcedReason || ''
  const ageHours = getHoursSince(event && event.createdAt ? event.createdAt : null)

  let status = active ? 'fresh' : 'clear'
  if (active && ageHours != null && ageHours >= staleHours) status = 'stale'
  else if (active && ageHours != null && ageHours >= warningHours) status = 'warning'

  if (forcedStatus === 'stale') status = 'stale'
  else if (forcedStatus === 'warning' && status !== 'stale') status = 'warning'

  return {
    status,
    label: status === 'clear' ? 'Clear' : status === 'fresh' ? 'Fresh' : status === 'warning' ? 'Warning' : 'Stale',
    lastChangedAt: event && event.createdAt ? event.createdAt : null,
    ageHours,
    warningHours,
    staleHours,
    founderAlert: status === 'stale',
    reason: forcedReason || '',
  }
}

function hashReviewQueueFingerprint(items, stats, extra) {
  return hashText(JSON.stringify({
    stats: stats || {},
    items: (items || []).map(function(item) {
      return [
        item.id,
        item.rowNumber,
        item.reviewStatus,
        item.reviewAction,
        item.findingsPreview,
      ]
    }),
    extra: extra || {},
  }))
}

function buildReviewQueueChangeSummary(label, queue) {
  const openItems = queue && queue.openItems ? queue.openItems : 0
  if (!openItems) return `${label} review queue is clear`
  return `${label} review queue has ${openItems} open item${openItems === 1 ? '' : 's'}`
}

function buildReviewQueueChangeMetadata(label, queue, fingerprint) {
  return {
    fingerprint,
    label,
    stats: {
      totalTrackedRows: queue && queue.totalTrackedRows ? queue.totalTrackedRows : 0,
      openItems: queue && queue.openItems ? queue.openItems : 0,
      queuedReview: queue && queue.queuedReview ? queue.queuedReview : 0,
      needsFixing: queue && queue.needsFixing ? queue.needsFixing : 0,
    },
    samples: (queue && Array.isArray(queue.items) ? queue.items : []).slice(0, 8).map(function(item) {
      return {
        id: item.id,
        title: item.title,
        status: item.reviewStatus,
        action: item.reviewAction,
      }
    }),
  }
}

async function syncReviewQueueEvent(input, actor = 'system') {
  const queue = input && input.queue ? input.queue : null
  if (!queue) return null

  const openItems = queue.openItems || 0
  const fingerprint = hashReviewQueueFingerprint(queue.items || [], {
    totalTrackedRows: queue.totalTrackedRows || 0,
    openItems,
    queuedReview: queue.queuedReview || 0,
    needsFixing: queue.needsFixing || 0,
  }, input.extra || {})

  const eventType = openItems ? 'review_queue_changed' : 'review_queue_cleared'
  return recordReviewQueueChange({
    eventType,
    entityTable: input.entityTable,
    entityId: input.entityId,
    summary: buildReviewQueueChangeSummary(input.label, queue),
    metadata: buildReviewQueueChangeMetadata(input.label, queue, fingerprint),
  }, actor)
}

function buildSourceWatchFreshness(event, active, options = {}) {
  if (options.missing) {
    return {
      status: 'missing',
      label: 'Needs Refresh',
      lastChangedAt: event && event.createdAt ? event.createdAt : null,
      ageHours: getHoursSince(event && event.createdAt ? event.createdAt : null),
      warningHours: options.warningHours || GOVERNED_WARNING_HOURS,
      staleHours: options.staleHours || GOVERNED_STALE_HOURS,
      founderAlert: true,
      reason: options.reason || 'No readable source state is available yet.',
    }
  }

  return buildGovernedFreshness(event, active, options)
}

function buildFubLeadSourceDrift(snapshot, rules) {
  const snapshotSources = snapshot && Array.isArray(snapshot.sources) ? snapshot.sources : []
  const snapshotMap = new Map()
  snapshotSources.forEach(function(item) {
    const source = String(item && item.source || '').trim()
    if (!source) return
    snapshotMap.set(source, {
      source,
      count: Math.max(0, Number(item.count) || 0),
    })
  })

  const ruleMap = new Map()
  ;(rules || []).forEach(function(rule) {
    if (!rule || !rule.source) return
    ruleMap.set(rule.source, rule)
  })

  const needsRules = Array.from(snapshotMap.values())
    .filter(function(item) {
      return !ruleMap.has(item.source)
    })
    .map(function(item) {
      return {
        source: item.source,
        count: item.count,
        defaultFlagState: getDefaultFubFlagState(item.source),
      }
    })
    .sort(function(a, b) {
      if (b.count !== a.count) return b.count - a.count
      return a.source.localeCompare(b.source)
    })

  const openClassification = Array.from(snapshotMap.values())
    .map(function(item) {
      const rule = ruleMap.get(item.source)
      if (!rule) return null
      const openMarketing = rule.marketingType === 'unclassified'
      const openOwnership = rule.ownershipType === 'unclassified'
      if (!openMarketing && !openOwnership) return null
      return {
        source: item.source,
        count: item.count,
        openMarketing,
        openOwnership,
      }
    })
    .filter(Boolean)
    .sort(function(a, b) {
      if (b.count !== a.count) return b.count - a.count
      return a.source.localeCompare(b.source)
    })

  const legacyPresent = Array.from(snapshotMap.values())
    .map(function(item) {
      const rule = ruleMap.get(item.source)
      const flagState = rule ? rule.flagState : getDefaultFubFlagState(item.source)
      if (!flagState || flagState === 'none') return null
      return {
        source: item.source,
        count: item.count,
        flagState,
      }
    })
    .filter(Boolean)
    .sort(function(a, b) {
      if (b.count !== a.count) return b.count - a.count
      return a.source.localeCompare(b.source)
    })

  const governedMissing = (rules || [])
    .filter(function(rule) {
      if (!rule || !rule.source) return false
      if (rule.flagState && rule.flagState !== 'none') return false
      if (rule.marketingType === 'unclassified' || rule.ownershipType === 'unclassified') return false
      return !snapshotMap.has(rule.source)
    })
    .map(function(rule) {
      return {
        source: rule.source,
        sourceGroup: rule.sourceGroup || null,
      }
    })
    .sort(function(a, b) {
      return a.source.localeCompare(b.source)
    })

  const staleThresholdHours = 24
  const ageHours = getHoursSince(snapshot ? snapshot.refreshedAt : null)
  const stale = {
    available: Boolean(snapshot && snapshot.refreshedAt),
    thresholdHours: staleThresholdHours,
    ageHours,
    isStale: ageHours != null && ageHours >= staleThresholdHours,
  }

  const stats = {
    needsRules: needsRules.length,
    openClassification: openClassification.length,
    legacyPresent: legacyPresent.length,
    governedMissing: governedMissing.length,
    stale: stale.isStale ? 1 : 0,
    reviewNow: needsRules.length + openClassification.length + legacyPresent.length + (stale.isStale ? 1 : 0),
  }

  const status = !snapshot
    ? 'no_snapshot'
    : stats.reviewNow
      ? 'review'
      : 'clean'

  const fingerprint = hashText(JSON.stringify({
    contextKey: snapshot ? snapshot.contextKey : 'none',
    status,
    staleBucket: stale.ageHours == null ? null : Math.floor(stale.ageHours / staleThresholdHours),
    needsRules: needsRules.map(function(item) {
      return [item.source, item.count, item.defaultFlagState]
    }),
    openClassification: openClassification.map(function(item) {
      return [item.source, item.count, item.openMarketing, item.openOwnership]
    }),
    legacyPresent: legacyPresent.map(function(item) {
      return [item.source, item.count, item.flagState]
    }),
    governedMissing: governedMissing.map(function(item) {
      return item.source
    }),
  }))

  return {
    status,
    fingerprint,
    stats,
    stale,
    buckets: {
      needsRules,
      openClassification,
      legacyPresent,
      governedMissing,
    },
  }
}

function buildFubLeadSourceDriftSummary(context, drift) {
  const label = context && context.label ? context.label : 'FUB'
  if (!drift || drift.status === 'no_snapshot') {
    return `FUB source drift waiting on the first snapshot for ${label}`
  }
  if (drift.status === 'clean') {
    return `FUB source drift cleared for ${label}`
  }

  const parts = []
  if (drift.stats.needsRules) parts.push(`${drift.stats.needsRules} new name${drift.stats.needsRules === 1 ? '' : 's'}`)
  if (drift.stats.openClassification) parts.push(`${drift.stats.openClassification} open classification${drift.stats.openClassification === 1 ? '' : 's'}`)
  if (drift.stats.legacyPresent) parts.push(`${drift.stats.legacyPresent} legacy / invalid source${drift.stats.legacyPresent === 1 ? '' : 's'}`)
  if (drift.stats.governedMissing) parts.push(`${drift.stats.governedMissing} governed source${drift.stats.governedMissing === 1 ? '' : 's'} not seen now`)
  if (drift.stale && drift.stale.isStale) parts.push('snapshot stale')

  return `FUB source drift on ${label}: ${parts.join(', ')}`
}

function buildFubLeadSourceDriftMetadata(context, drift) {
  return {
    fingerprint: drift.fingerprint,
    context,
    status: drift.status,
    stats: drift.stats,
    stale: drift.stale,
    samples: {
      needsRules: sampleSourceNames(drift.buckets.needsRules),
      openClassification: sampleSourceNames(drift.buckets.openClassification),
      legacyPresent: sampleSourceNames(drift.buckets.legacyPresent),
      governedMissing: sampleSourceNames(drift.buckets.governedMissing),
    },
  }
}

async function syncFubLeadSourceDriftEvent(payload, actor) {
  if (!payload || !payload.snapshot || !payload.snapshot.available || !payload.drift) return null

  const drift = payload.drift
  const statusNeedsReview = drift.status === 'review' || drift.status === 'watch'
  const eventType = statusNeedsReview ? 'source_drift_detected' : 'source_drift_cleared'

  return recordSourceDriftChange({
    eventType,
    entityTable: 'fub_lead_source_snapshots',
    entityId: payload.context && payload.context.key ? payload.context.key : 'unknown',
    summary: buildFubLeadSourceDriftSummary(payload.context, drift),
    metadata: buildFubLeadSourceDriftMetadata(payload.context, drift),
  }, actor)
}

function buildFubLeadSourcePayload(snapshot, rules, fallbackContext) {
  const ruleMap = new Map()
  rules.forEach(function(rule) {
    ruleMap.set(rule.source, rule)
  })

  const merged = new Map()
  const snapshotSources = snapshot && Array.isArray(snapshot.sources) ? snapshot.sources : []
  snapshotSources.forEach(function(item) {
    const source = String(item && item.source || '').trim()
    if (!source) return
    const rule = ruleMap.get(source)
    merged.set(source, {
      source,
      count: Math.max(0, Number(item.count) || 0),
      marketingType: rule ? rule.marketingType : getDefaultFubMarketingType(source),
      ownershipType: rule ? rule.ownershipType : 'unclassified',
      flagState: rule ? rule.flagState : getDefaultFubFlagState(source),
      sourceGroup: rule ? (rule.sourceGroup || '') : getDefaultFubLeadSourceGroup(source),
      notes: rule ? rule.notes : null,
      updatedAt: rule ? rule.updatedAt : null,
      updatedBy: rule ? rule.updatedBy : null,
    })
  })

  const sources = Array.from(merged.values()).sort(function(a, b) {
    if (b.count !== a.count) return b.count - a.count
    return a.source.localeCompare(b.source)
  })

  const context = snapshot
    ? { key: snapshot.contextKey, label: snapshot.contextLabel }
    : fallbackContext

  const drift = buildFubLeadSourceDrift(snapshot, rules)

  return {
    context,
    snapshot: {
      available: Boolean(snapshot),
      refreshedAt: snapshot ? snapshot.refreshedAt : null,
      refreshedBy: snapshot ? snapshot.refreshedBy : null,
    },
    scan: snapshot
      ? snapshot.scan
      : {
          uniqueSources: 0,
          peopleScanned: 0,
          pagesScanned: 0,
          truncated: false,
        },
    stats: {
      totalSources: sources.length,
      marketing: sources.filter(item => item.marketingType === 'marketing').length,
      nonMarketing: sources.filter(item => item.marketingType === 'non_marketing').length,
      unclassified: sources.filter(item => item.marketingType === 'unclassified').length,
      unclassifiedMarketing: sources.filter(item => item.marketingType === 'unclassified').length,
      unclassifiedOwnership: sources.filter(item => item.ownershipType === 'unclassified').length,
      openClassification: sources.filter(item => item.marketingType === 'unclassified' || item.ownershipType === 'unclassified').length,
      company: sources.filter(item => item.ownershipType === 'company').length,
      agent: sources.filter(item => item.ownershipType === 'agent').length,
      referral: sources.filter(item => item.ownershipType === 'referral').length,
      other: sources.filter(item => item.ownershipType === 'other').length,
      invalidCanonical: sources.filter(item => item.flagState === 'not_canonical').length,
      flagged: sources.filter(item => item.flagState && item.flagState !== 'none').length,
    },
    drift,
    sources,
  }
}

export {
  GOVERNED_WARNING_HOURS,
  GOVERNED_STALE_HOURS,
  buildFubLeadSourcePayload,
  buildFubLeadSourceDrift,
  buildSourceWatchFreshness,
  syncFubLeadSourceDriftEvent,
  syncReviewQueueEvent,
  getDefaultFubLeadSourceGroup,
  getDefaultFubMarketingType,
  getDefaultFubFlagState,
}
