export const CREATOR_WATCHLIST_CARD_ID = 'CREATOR-WATCHLIST-001'
export const CREATOR_WATCHLIST_SOURCE_ID = 'SRC-CREATOR-WATCHLIST-001'
export const BUILD_INTEL_INTAKE_CLOSEOUT_KEY = 'build-intel-intake-foundation-v1'

export const WATCHLIST_SOURCE_CATEGORIES = [
  'build_intel',
  'marketing_content_later',
]

export const WATCHLIST_ACCESS_BOUNDARIES = [
  'public_lookup_required',
  'public_permitted',
  'mixed_public_and_paid_authorized_required',
  'paid_authorized_required',
]

function platform(type, label, extra = {}) {
  return {
    type,
    label,
    url: extra.url || null,
    lookupStatus: extra.lookupStatus || (extra.url ? 'known' : 'lookup_required'),
    accessBoundary: extra.accessBoundary || 'public_lookup_required',
  }
}

const buildIntelWhy = 'Steve follows this source for current AIOS/build intelligence, builder workflows, agentic OS patterns, tooling examples, or operating-system ideas.'

export const CREATOR_WATCHLIST_ENTRIES = [
  {
    creatorId: 'icor-tom-ai-productivity',
    displayName: 'ICOR with Tom | AI Productivity',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'paid_authorized_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'Paid AI Productivity training source; expected to teach practical AI team and productivity system patterns.',
    platforms: [platform('myicor', 'myICOR / ICOR paid training', { accessBoundary: 'paid_authorized_required' })],
    active: true,
  },
  {
    creatorId: 'mark-kashef',
    displayName: 'Mark Kashef',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'mixed_public_and_paid_authorized_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'Paid Skool and public builder content for AI automation and AIOS patterns.',
    platforms: [
      platform('youtube', 'YouTube'),
      platform('skool', 'Mark Kashef Skool', { accessBoundary: 'paid_authorized_required' }),
    ],
    active: true,
  },
  {
    creatorId: 'nate-herk',
    displayName: 'Nate Herk',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: buildIntelWhy,
    platforms: [platform('youtube', 'YouTube')],
    active: true,
  },
  {
    creatorId: 'chase-ai',
    displayName: 'Chase AI',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: buildIntelWhy,
    platforms: [platform('youtube', 'YouTube')],
    active: true,
  },
  {
    creatorId: 'dan-martell',
    displayName: 'Dan Martell',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'Operator and delegation systems that can inform AIOS workflow design.',
    platforms: [platform('youtube', 'YouTube')],
    active: true,
  },
  {
    creatorId: 'nick-saraev',
    displayName: 'Nick Saraev',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: buildIntelWhy,
    platforms: [platform('youtube', 'YouTube')],
    active: true,
  },
  {
    creatorId: 'paul-j-lipsky',
    displayName: 'Paul J Lipsky',
    sourceCategory: 'build_intel',
    priority: 'P1',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'Strong AI voice setup source; useful for later voice/agent workflow design.',
    platforms: [platform('youtube', 'YouTube')],
    active: true,
  },
  {
    creatorId: 'linking-your-thinking-nick-milo',
    displayName: 'Linking Your Thinking / Nick Milo',
    sourceCategory: 'build_intel',
    priority: 'P1',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'Knowledge-management and linked-thinking patterns that can inform AIOS memory and retrieval design.',
    platforms: [platform('youtube', 'YouTube')],
    active: true,
  },
  ...[
    ['mansel-scheffel', 'Mansel Scheffel'],
    ['ai-news-strategy-daily', 'AI News & Strategy Daily'],
    ['ray-amjad', 'Ray Amjad'],
    ['alex-finn', 'Alex Finn'],
    ['jono-catliff', 'Jono Catliff'],
    ['chris-bradley', 'Chris Bradley'],
    ['ambitious-ai', 'Ambitious AI'],
    ['brad-ai-automation', 'Brad | AI & Automation'],
    ['creator-magic', 'Creator Magic'],
    ['stacked-podcast', 'Stacked Podcast'],
    ['zane-cole', 'Zane Cole'],
    ['jp-middleton', 'JP Middleton'],
    ['next-gen-ai', 'Next Gen AI'],
    ['leveling-up-eric-siu', 'Leveling Up / Eric Siu'],
    ['simon-scrapes', 'Simon Scrapes'],
  ].map(([creatorId, displayName]) => ({
    creatorId,
    displayName,
    sourceCategory: 'build_intel',
    priority: displayName === 'Alex Finn' ? 'P0' : 'P1',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: buildIntelWhy,
    platforms: [platform('youtube', 'YouTube')],
    active: true,
  })),
  ...[
    ['neil-patel', 'Neil Patel'],
    ['russell-brunson', 'Russell Brunson'],
    ['alex-hormozi', 'Alex Hormozi'],
    ['arsh-sanwarwala-thrillx', 'Arsh Sanwarwala / ThrillX'],
  ].map(([creatorId, displayName]) => ({
    creatorId,
    displayName,
    sourceCategory: 'marketing_content_later',
    priority: 'P1',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'marketing_content_later',
    cadence: 'weekly',
    whySteveCares: 'Later marketing/content intelligence source. Explicitly not part of this Build Intel extraction sprint.',
    platforms: [platform('youtube', 'YouTube'), platform('web', 'Website or blog')],
    active: true,
  })),
]

export function validateCreatorWatchlistEntry(entry = {}) {
  const findings = []
  const requiredStrings = ['creatorId', 'displayName', 'sourceCategory', 'priority', 'accessBoundary', 'consumerLane', 'cadence', 'whySteveCares']
  for (const field of requiredStrings) {
    if (!String(entry[field] || '').trim()) findings.push(`${field}_missing`)
  }
  if (!WATCHLIST_SOURCE_CATEGORIES.includes(entry.sourceCategory)) findings.push('source_category_invalid')
  if (!WATCHLIST_ACCESS_BOUNDARIES.includes(entry.accessBoundary)) findings.push('access_boundary_invalid')
  if (!Array.isArray(entry.platforms) || !entry.platforms.length) findings.push('platforms_missing')
  for (const item of entry.platforms || []) {
    if (!String(item.type || '').trim()) findings.push('platform_type_missing')
    if (!String(item.label || '').trim()) findings.push('platform_label_missing')
    if (!String(item.accessBoundary || '').trim()) findings.push('platform_access_boundary_missing')
  }
  if (entry.sourceCategory === 'build_intel' && entry.consumerLane !== 'build_intel') findings.push('build_intel_consumer_lane_mismatch')
  if (entry.sourceCategory === 'marketing_content_later' && entry.consumerLane !== 'marketing_content_later') findings.push('marketing_consumer_lane_mismatch')
  return {
    ok: findings.length === 0,
    findings,
  }
}

export function listCreatorWatchlistEntries(options = {}) {
  const sourceCategory = String(options.sourceCategory || '').trim()
  const includeInactive = options.includeInactive === true
  return CREATOR_WATCHLIST_ENTRIES
    .filter(entry => includeInactive || entry.active)
    .filter(entry => !sourceCategory || entry.sourceCategory === sourceCategory)
    .map(entry => ({
      ...entry,
      platforms: entry.platforms.map(item => ({ ...item })),
      sourceId: CREATOR_WATCHLIST_SOURCE_ID,
      approvedForExtractionThisSprint: false,
      extractionGate: 'Build Intel Extraction Implementation Sprint',
    }))
}

export function buildCreatorWatchlistSnapshot() {
  const entries = listCreatorWatchlistEntries()
  const buildIntel = entries.filter(entry => entry.sourceCategory === 'build_intel')
  const marketingLater = entries.filter(entry => entry.sourceCategory === 'marketing_content_later')
  const validation = entries.map(entry => ({
    creatorId: entry.creatorId,
    ...validateCreatorWatchlistEntry(entry),
  }))
  return {
    status: validation.every(item => item.ok) ? 'ready' : 'risk',
    cardId: CREATOR_WATCHLIST_CARD_ID,
    sourceId: CREATOR_WATCHLIST_SOURCE_ID,
    closeoutKey: BUILD_INTEL_INTAKE_CLOSEOUT_KEY,
    extractionStarted: false,
    extractionAllowedThisSprint: false,
    nextSprintName: 'Build Intel Extraction Implementation Sprint',
    summary: {
      totalEntries: entries.length,
      buildIntelCount: buildIntel.length,
      marketingContentLaterCount: marketingLater.length,
      paidAuthorizedRequiredCount: entries.filter(entry => entry.accessBoundary.includes('paid_authorized_required')).length,
      activeCount: entries.filter(entry => entry.active).length,
    },
    entries,
    validation,
  }
}
