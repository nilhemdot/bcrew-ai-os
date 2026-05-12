export const MARKETING_SOURCE_MAP_CARD_ID = 'MARKETING-SOURCE-MAP-001'
export const MARKETING_SOURCE_MAP_CLOSEOUT_KEY = 'marketing-source-map-v1'
export const MARKETING_SOURCE_MAP_PLAN_PATH = 'docs/process/marketing-source-map-001-plan.md'
export const MARKETING_SOURCE_MAP_APPROVAL_PATH = 'docs/process/approvals/MARKETING-SOURCE-MAP-001.json'
export const MARKETING_SOURCE_MAP_SCRIPT_PATH = 'scripts/process-marketing-source-map-check.mjs'
export const MARKETING_SOURCE_MAP_SUMMARY_MARKER = 'MARKETING_SOURCE_MAP_SUMMARY'
export const MARKETING_SOURCE_MAP_NOTE_PATH = 'docs/source-notes/freedom-marketing.md'

export const MARKETING_BRAND_LANES = [
  {
    laneId: 'benson-crew',
    label: 'Benson Crew',
    status: 'active',
    purpose: 'Residential team growth, client trust, past-client retention, agent attraction, and proof for the team engine.',
    avatarTracks: ['retain', 'attract'],
    sourceIds: [
      'SRC-META-001',
      'SRC-GADS-001',
      'SRC-DATAFORSEO-001',
      'SRC-GDRIVE-001',
      'SRC-FUB-001',
      'SRC-SUPABASE-001',
      'SRC-PUBLISH-001',
      'SRC-REVIEWS-001',
      'SRC-CONTENT-001',
    ],
  },
  {
    laneId: 'zahnd-team-ag',
    label: 'Zahnd Team Ag',
    status: 'split-required',
    purpose: 'Agricultural/farm demand generation and reputation lane that must not be blurred into general residential marketing.',
    avatarTracks: [],
    sourceIds: [
      'SRC-META-001',
      'SRC-GADS-001',
      'SRC-DATAFORSEO-001',
      'SRC-YOUTUBE-INTEL-001',
      'SRC-GDRIVE-001',
      'SRC-PUBLISH-001',
      'SRC-FUB-001',
      'SRC-GHL-001',
      'SRC-CONTENT-001',
    ],
  },
  {
    laneId: 'steve-zahnd',
    label: 'Steve Zahnd',
    status: 'active',
    purpose: 'Steve personal brand, recruiting proof, thought leadership, AI OS teaching, and owner-led content.',
    avatarTracks: ['attract'],
    sourceIds: [
      'SRC-META-001',
      'SRC-YOUTUBE-INTEL-001',
      'SRC-GHL-001',
      'SRC-GDRIVE-001',
      'SRC-CREATOR-WATCHLIST-001',
      'SRC-VIDEO-001',
      'SRC-PUBLISH-001',
      'SRC-CONTENT-001',
    ],
  },
  {
    laneId: 'marketmasters',
    label: 'MarketMasters',
    status: 'active',
    purpose: 'Education, trust platform, training/course assets, and event/content engagement that support Steve and future product lanes.',
    avatarTracks: [],
    sourceIds: [
      'SRC-GDRIVE-001',
      'SRC-VIDEO-001',
      'SRC-YOUTUBE-INTEL-001',
      'SRC-DATAFORSEO-001',
      'SRC-CREATOR-WATCHLIST-001',
      'SRC-PUBLISH-001',
      'SRC-GHL-001',
      'SRC-CONTENT-001',
    ],
  },
  {
    laneId: 'unchained',
    label: 'Unchained',
    status: 'future-boundary',
    purpose: 'Future Steve-owned recruiting/education capture-forward lane; not a separate CRM or marketing production system in this sprint.',
    avatarTracks: ['attract'],
    sourceIds: [
      'SRC-REAL-001',
      'SRC-GHL-001',
      'SRC-CREATOR-WATCHLIST-001',
      'SRC-YOUTUBE-INTEL-001',
      'SRC-GDRIVE-001',
      'SRC-PUBLISH-001',
      'SRC-CONTENT-001',
      'SRC-EMAIL-TEAM-001',
    ],
  },
]

export const MARKETING_SOURCE_MAP_BOUNDARY = [
  'This is Foundation source mapping only, not marketing production.',
  'It does not build writer, editor, designer, video, repurposer, scheduler, or Brand Guardian enforcement.',
  'It does not fix Google Ads auth, validate SocialPilot, connect Real Broker, or create campaigns.',
  'Brand entity doctrine moves next to BRAND-STACK-001.',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function bySourceId(sources = []) {
  return new Map(normalizeList(sources).map(source => [source.sourceId, source]).filter(([sourceId]) => Boolean(sourceId)))
}

function sourceState(source) {
  if (!source) return 'missing'
  const status = normalizeLower(source.status)
  const group = normalizeLower(source.group)
  if (group === 'gap' || status === 'gap' || status.includes('not connected')) return 'gap'
  if (status.includes('pending') || group === 'pending') return 'pending'
  return 'mapped'
}

function laneTone(lane) {
  if (lane.missingSourceCount > 0 || lane.gapSourceCount > 0) return 'missing'
  if (lane.pendingSourceCount > 0 || lane.status !== 'active') return 'pending'
  return 'connected'
}

function avatarIdsForLane(avatars = [], lane = {}) {
  const tracks = new Set(normalizeList(lane.avatarTracks))
  return normalizeList(avatars)
    .filter(avatar => tracks.has(avatar.track))
    .map(avatar => avatar.id)
}

function noteMentionsForLane(sourceNoteText = '', lane = {}) {
  const text = String(sourceNoteText || '')
  return {
    laneMentioned: text.includes(lane.label),
    metaMentioned: text.includes('Meta'),
    ga4Mentioned: text.includes('GA4'),
    searchMentioned: text.includes('Search Console'),
    youtubeMentioned: text.includes('YouTube'),
    socialPilotMentioned: text.includes('SocialPilot'),
  }
}

function buildLane({ lane, sourceMap, avatars, sourceNoteText }) {
  const sourceRefs = lane.sourceIds.map(sourceId => {
    const source = sourceMap.get(sourceId)
    const state = sourceState(source)
    return {
      sourceId,
      title: source?.title || sourceId,
      status: source?.status || 'Missing source contract',
      validation: source?.validation || '',
      state,
      owner: source?.owner || '',
    }
  })
  const avatarIds = avatarIdsForLane(avatars, lane)
  const laneRow = {
    laneId: lane.laneId,
    label: lane.label,
    status: lane.status,
    purpose: lane.purpose,
    avatarTracks: lane.avatarTracks,
    avatarIds,
    avatarCount: avatarIds.length,
    sourceRefs,
    mappedSourceCount: sourceRefs.filter(ref => ref.state === 'mapped').length,
    pendingSourceCount: sourceRefs.filter(ref => ref.state === 'pending').length,
    gapSourceCount: sourceRefs.filter(ref => ref.state === 'gap').length,
    missingSourceCount: sourceRefs.filter(ref => ref.state === 'missing').length,
    noteEvidence: noteMentionsForLane(sourceNoteText, lane),
  }
  return {
    ...laneRow,
    tone: laneTone(laneRow),
  }
}

export function buildMarketingSourceMapSnapshot({
  sourceContracts = [],
  avatarRegistry = {},
  sourceNoteText = '',
  generatedAt = new Date().toISOString(),
} = {}) {
  const sources = normalizeList(sourceContracts)
  const sourceMap = bySourceId(sources)
  const avatars = normalizeList(avatarRegistry.avatars)
  const lanes = MARKETING_BRAND_LANES.map(lane => buildLane({
    lane,
    sourceMap,
    avatars,
    sourceNoteText,
  }))
  const sourceIds = Array.from(new Set(lanes.flatMap(lane => lane.sourceRefs.map(ref => ref.sourceId))))
  const avatarAssignments = lanes.flatMap(lane => lane.avatarIds.map(avatarId => ({
    avatarId,
    laneId: lane.laneId,
    laneLabel: lane.label,
  })))
  const findings = []

  if (lanes.length !== 5) {
    findings.push({
      severity: 'critical',
      key: 'brand_lane_count',
      detail: `Expected 5 brand lanes; found ${lanes.length}.`,
    })
  }
  if (avatars.length !== 15) {
    findings.push({
      severity: 'critical',
      key: 'avatar_registry_count',
      detail: `Expected 15 imported avatars; found ${avatars.length}.`,
    })
  }
  for (const lane of lanes) {
    if (!lane.noteEvidence.laneMentioned && lane.laneId !== 'unchained') {
      findings.push({
        severity: 'warning',
        key: 'source_note_lane_mention',
        detail: `${lane.label} is not mentioned in ${MARKETING_SOURCE_MAP_NOTE_PATH}.`,
      })
    }
    if (lane.missingSourceCount > 0) {
      findings.push({
        severity: 'critical',
        key: 'missing_source_contract',
        detail: `${lane.label} has ${lane.missingSourceCount} missing source contract reference(s).`,
      })
    }
  }

  return {
    status: findings.some(finding => finding.severity === 'critical') ? 'risk' : 'healthy',
    cardId: MARKETING_SOURCE_MAP_CARD_ID,
    closeoutKey: MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
    generatedAt,
    summary: {
      laneCount: lanes.length,
      activeLaneCount: lanes.filter(lane => lane.status === 'active').length,
      sourceRefCount: lanes.reduce((sum, lane) => sum + lane.sourceRefs.length, 0),
      uniqueSourceCount: sourceIds.length,
      mappedSourceRefs: lanes.reduce((sum, lane) => sum + lane.mappedSourceCount, 0),
      pendingSourceRefs: lanes.reduce((sum, lane) => sum + lane.pendingSourceCount, 0),
      gapSourceRefs: lanes.reduce((sum, lane) => sum + lane.gapSourceCount, 0),
      missingSourceRefs: lanes.reduce((sum, lane) => sum + lane.missingSourceCount, 0),
      avatarCount: avatars.length,
      avatarAssignmentCount: avatarAssignments.length,
      marketingProductionBuilt: false,
      brandStackBuilt: false,
    },
    lanes,
    avatarAssignments,
    sourceIds,
    boundary: MARKETING_SOURCE_MAP_BOUNDARY,
    findings,
  }
}

export function buildSyntheticMarketingSourceMapProof() {
  const sourceContracts = [
    { sourceId: 'SRC-META-001', title: 'Meta', status: 'Verified Readable', group: 'verified', validation: 'Readable Only' },
    { sourceId: 'SRC-GADS-001', title: 'Google Ads', status: 'Pending Revalidation', group: 'pending', validation: 'Not Signed Off' },
    { sourceId: 'SRC-DATAFORSEO-001', title: 'DataForSEO', status: 'Verified Readable', group: 'verified', validation: 'Readable Only' },
    { sourceId: 'SRC-GDRIVE-001', title: 'Drive', status: 'Pending Revalidation', group: 'pending', validation: 'Not Signed Off' },
    { sourceId: 'SRC-FUB-001', title: 'FUB', status: 'Verified Readable', group: 'verified', validation: 'Readable Only' },
    { sourceId: 'SRC-SUPABASE-001', title: 'Supabase', status: 'Verified Readable', group: 'verified', validation: 'Readable Only' },
    { sourceId: 'SRC-PUBLISH-001', title: 'Social Publishing', status: 'Gap', group: 'gap', validation: 'Not Signed Off' },
    { sourceId: 'SRC-REVIEWS-001', title: 'Reviews', status: 'Gap', group: 'gap', validation: 'Not Signed Off' },
    { sourceId: 'SRC-CONTENT-001', title: 'Content', status: 'Gap', group: 'gap', validation: 'Not Signed Off' },
    { sourceId: 'SRC-YOUTUBE-INTEL-001', title: 'YouTube', status: 'Pending Revalidation', group: 'pending', validation: 'Not Signed Off' },
    { sourceId: 'SRC-GHL-001', title: 'GHL', status: 'Verified Readable', group: 'verified', validation: 'Readable Only' },
    { sourceId: 'SRC-CREATOR-WATCHLIST-001', title: 'Creators', status: 'Pending Revalidation', group: 'pending', validation: 'Not Signed Off' },
    { sourceId: 'SRC-VIDEO-001', title: 'Video', status: 'Pending Revalidation', group: 'pending', validation: 'Not Signed Off' },
    { sourceId: 'SRC-REAL-001', title: 'Real', status: 'Gap', group: 'gap', validation: 'Not Signed Off' },
    { sourceId: 'SRC-EMAIL-TEAM-001', title: 'Team Email', status: 'Gap', group: 'gap', validation: 'Not Signed Off' },
  ]
  const avatars = Array.from({ length: 15 }, (_, index) => ({
    id: index < 10 ? `RETAIN-${index + 1}` : `ATTRACT-${index - 9}`,
    track: index < 10 ? 'retain' : 'attract',
  }))
  const snapshot = buildMarketingSourceMapSnapshot({
    sourceContracts,
    avatarRegistry: { avatars },
    sourceNoteText: 'Benson Crew Zahnd Team Ag Steve Zahnd MarketMasters Meta GA4 Search Console YouTube SocialPilot',
  })
  const laneMap = new Map(snapshot.lanes.map(lane => [lane.laneId, lane]))

  return {
    ok: snapshot.status === 'healthy' &&
      snapshot.summary.laneCount === 5 &&
      snapshot.summary.avatarCount === 15 &&
      laneMap.get('benson-crew')?.avatarCount === 15 &&
      laneMap.get('steve-zahnd')?.avatarCount === 5 &&
      laneMap.get('marketmasters')?.avatarCount === 0 &&
      snapshot.summary.marketingProductionBuilt === false &&
      snapshot.summary.brandStackBuilt === false,
    summary: snapshot.summary,
    lanes: snapshot.lanes,
  }
}
