import {
  MARKETING_SOURCE_MAP_CARD_ID,
  MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
  buildSyntheticMarketingSourceMapProof,
} from './marketing-source-map.js'

export const BRAND_STACK_CARD_ID = 'BRAND-STACK-001'
export const BRAND_STACK_CLOSEOUT_KEY = 'brand-stack-v1'
export const BRAND_STACK_PLAN_PATH = 'docs/process/brand-stack-001-plan.md'
export const BRAND_STACK_APPROVAL_PATH = 'docs/process/approvals/BRAND-STACK-001.json'
export const BRAND_STACK_SCRIPT_PATH = 'scripts/process-brand-stack-check.mjs'
export const BRAND_STACK_SUMMARY_MARKER = 'BRAND_STACK_SUMMARY'

export const BRAND_STACK_EVIDENCE_PATHS = [
  'docs/source-notes/freedom-marketing.md',
  'docs/strategy/marketmasters.md',
  'docs/system-strategy.md',
  'docs/rebuild/current-plan.md',
]

export const BRAND_STACK_BOUNDARY = [
  'This is a Foundation brand registry, not marketing production.',
  'It does not build writer, editor, designer, video, repurposer, scheduler, or publishing operators.',
  'It defines Brand Guardian boundaries but does not enforce generated content yet.',
  'Connector repairs stay with source-specific cards such as Google Ads, SocialPilot, and Real Broker.',
]

export const BRAND_STACK_ENTITIES = [
  {
    brandId: 'brand-benson-crew',
    label: 'Benson Crew',
    laneId: 'benson-crew',
    status: 'active',
    role: 'Primary operating team brand and proof-of-execution engine.',
    audienceBoundary: 'Residential clients, past clients, local community, recruiting proof, and team execution proof.',
    offerBoundary: 'Team service, client trust, agent attraction, and operating proof.',
    toneBoundary: 'Direct, useful, local, practical, and proof-led.',
    approvalBoundary: 'Owner-approved public brand. Sensitive people, compensation, performance, and legal claims require restricted review.',
    guardianRules: [
      'Do not blur client-facing service with agent education unless the content clearly says which audience it serves.',
      'Do not publish claims that imply Real Broker is the same entity as Benson Crew.',
      'Use avatar evidence only as audience context; do not invent client results or agent performance.',
    ],
    evidenceRefs: ['docs/source-notes/freedom-marketing.md', 'docs/system-strategy.md'],
  },
  {
    brandId: 'brand-zahnd-team-ag',
    label: 'Zahnd Team Ag',
    laneId: 'zahnd-team-ag',
    status: 'split-required',
    role: 'Agricultural/farm demand and reputation lane that must stay separate from general residential marketing.',
    audienceBoundary: 'Farm, land, agricultural, and rural real-estate clients plus related partner networks.',
    offerBoundary: 'Agricultural real-estate expertise, farm-market trust, and rural listing/lead generation.',
    toneBoundary: 'Specialist, practical, grounded, rural-market fluent, and not generic residential.',
    approvalBoundary: 'Needs explicit owner review until source contracts and audience splits are stronger.',
    guardianRules: [
      'Do not fold farm/land claims into generic Benson Crew residential content.',
      'Do not use agricultural lane sources as proof for residential buyer/seller claims.',
      'Keep agricultural lead paths visibly separate until SOURCE-016 and related connectors are repaired.',
    ],
    evidenceRefs: ['docs/source-notes/freedom-marketing.md'],
  },
  {
    brandId: 'brand-steve-zahnd',
    label: 'Steve Zahnd',
    laneId: 'steve-zahnd',
    status: 'active',
    role: 'Owner personal brand, recruiting trust, AI OS teaching, and thought-leadership lane.',
    audienceBoundary: 'Agents, operators, founders, recruiting prospects, and people following Steve-led AI/real-estate operating ideas.',
    offerBoundary: 'Owner perspective, recruiting trust, leadership proof, AI OS lessons, and education.',
    toneBoundary: 'Plain-spoken, experimental, reflective, direct, and operator-led.',
    approvalBoundary: 'Owner voice requires Steve approval for public-facing claims; system may prepare drafts only after future Brand Guardian enforcement.',
    guardianRules: [
      'Do not write as Steve unless an approved publishing workflow exists.',
      'Do not turn personal-brand education into direct recruiting pressure unless the lane is explicitly Benson Crew recruiting.',
      'Keep AI OS claims tied to real system proof, not hype.',
    ],
    evidenceRefs: ['docs/source-notes/freedom-marketing.md', 'docs/system-strategy.md'],
  },
  {
    brandId: 'brand-marketmasters',
    label: 'MarketMasters',
    laneId: 'marketmasters',
    status: 'active',
    role: 'Education and trust platform that warms agent attention without leading with a recruiting pitch.',
    audienceBoundary: 'Agents outside Benson Crew who need education, events, trust-building, and opt-in conversations.',
    offerBoundary: 'Training, events, seminars, education, community content, and trust-building handoff.',
    toneBoundary: 'Educational, trust-first, opt-in, and never high-pressure.',
    approvalBoundary: 'Content must pass the MarketMasters decision test before it uses this brand lane.',
    guardianRules: [
      'If the point is direct recruiting or execution proof, route to Benson Crew instead.',
      'Do not turn MarketMasters into Benson Crew content under a different name.',
      'Keep the handoff to Benson Crew or Real Broker clear when the conversation becomes recruiting or brokerage-specific.',
    ],
    evidenceRefs: ['docs/strategy/marketmasters.md', 'docs/source-notes/freedom-marketing.md'],
  },
  {
    brandId: 'brand-unchained',
    label: 'Unchained',
    laneId: 'unchained',
    status: 'future-boundary',
    role: 'Future Steve-owned recruiting/education capture-forward lane, preserved as a boundary before production starts.',
    audienceBoundary: 'Future recruiting, education, and agent-community audiences that are not yet active production lanes.',
    offerBoundary: 'Future offer language only; no live campaign, CRM, or publishing behavior in this sprint.',
    toneBoundary: 'Undefined for production; must be explicitly approved before generated public content.',
    approvalBoundary: 'Future-boundary only. Requires a separate approved card before use in campaigns or generated content.',
    guardianRules: [
      'Do not treat Unchained as live marketing production.',
      'Do not blend Unchained with MarketMasters or Steve personal-brand content until its source truth is approved.',
      'Keep Real Broker and Benson Crew entity boundaries explicit in any future Unchained doctrine.',
    ],
    evidenceRefs: ['docs/rebuild/current-plan.md', 'docs/source-notes/freedom-marketing.md'],
  },
]

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function byLaneId(marketingSourceMap = {}) {
  return new Map(normalizeList(marketingSourceMap.lanes).map(lane => [lane.laneId, lane]))
}

function buildBrandEntity(entity, laneMap) {
  const lane = laneMap.get(entity.laneId) || null
  const sourceRefs = normalizeList(lane?.sourceRefs)
  const avatarIds = normalizeList(lane?.avatarIds)
  const gapSourceCount = sourceRefs.filter(ref => ref.state === 'gap').length
  const pendingSourceCount = sourceRefs.filter(ref => ref.state === 'pending').length
  const missingSourceCount = sourceRefs.filter(ref => ref.state === 'missing').length

  return {
    ...entity,
    sourceMapLaneStatus: lane?.status || 'missing',
    avatarIds,
    avatarCount: avatarIds.length,
    sourceIds: sourceRefs.map(ref => ref.sourceId),
    sourceRefs,
    sourceRefCount: sourceRefs.length,
    pendingSourceCount,
    gapSourceCount,
    missingSourceCount,
    guardianBoundaryDefined: normalizeList(entity.guardianRules).length >= 3 && Boolean(entity.approvalBoundary),
    enforcementStatus: 'boundary_defined_not_enforced',
  }
}

export function buildBrandStackSnapshot({
  marketingSourceMap = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const laneMap = byLaneId(marketingSourceMap)
  const brands = BRAND_STACK_ENTITIES.map(entity => buildBrandEntity(entity, laneMap))
  const findings = []

  if (brands.length !== 5) {
    findings.push({
      severity: 'critical',
      key: 'brand_count',
      detail: `Expected 5 brand entities; found ${brands.length}.`,
    })
  }
  for (const brand of brands) {
    if (!laneMap.has(brand.laneId)) {
      findings.push({
        severity: 'critical',
        key: 'missing_marketing_lane',
        detail: `${brand.label} does not resolve to a marketing source-map lane.`,
      })
    }
    if (!brand.guardianBoundaryDefined) {
      findings.push({
        severity: 'critical',
        key: 'missing_guardian_boundary',
        detail: `${brand.label} is missing Brand Guardian boundary rules.`,
      })
    }
    if (brand.sourceRefCount === 0) {
      findings.push({
        severity: 'critical',
        key: 'missing_source_refs',
        detail: `${brand.label} has no source references.`,
      })
    }
  }

  return {
    status: findings.some(finding => finding.severity === 'critical') ? 'risk' : 'healthy',
    cardId: BRAND_STACK_CARD_ID,
    closeoutKey: BRAND_STACK_CLOSEOUT_KEY,
    dependsOnCloseoutKey: MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
    generatedAt,
    summary: {
      brandCount: brands.length,
      activeBrandCount: brands.filter(brand => brand.status === 'active').length,
      reviewRequiredBrandCount: brands.filter(brand => brand.status !== 'active').length,
      sourceRefCount: brands.reduce((sum, brand) => sum + brand.sourceRefCount, 0),
      avatarAssignmentCount: brands.reduce((sum, brand) => sum + brand.avatarCount, 0),
      missingMarketingLaneCount: brands.filter(brand => brand.sourceMapLaneStatus === 'missing').length,
      missingSourceRefCount: brands.reduce((sum, brand) => sum + brand.missingSourceCount, 0),
      guardianBoundaryCount: brands.filter(brand => brand.guardianBoundaryDefined).length,
      brandGuardianEnforcementBuilt: false,
      marketingProductionBuilt: false,
    },
    brands,
    boundary: BRAND_STACK_BOUNDARY,
    sourceEvidencePaths: BRAND_STACK_EVIDENCE_PATHS,
    dependencyCards: [MARKETING_SOURCE_MAP_CARD_ID],
    findings,
  }
}

export function buildSyntheticBrandStackProof() {
  const marketingSourceMap = buildSyntheticMarketingSourceMapProof()
  const snapshot = buildBrandStackSnapshot({ marketingSourceMap })
  const brandMap = new Map(snapshot.brands.map(brand => [brand.label, brand]))

  return {
    ok: snapshot.status === 'healthy' &&
      snapshot.summary.brandCount === 5 &&
      snapshot.summary.guardianBoundaryCount === 5 &&
      snapshot.summary.brandGuardianEnforcementBuilt === false &&
      snapshot.summary.marketingProductionBuilt === false &&
      brandMap.get('Benson Crew')?.avatarCount === 15 &&
      brandMap.get('Steve Zahnd')?.avatarCount === 5 &&
      brandMap.get('MarketMasters')?.guardianRules.some(rule => rule.includes('direct recruiting')),
    summary: snapshot.summary,
    brands: snapshot.brands,
  }
}
