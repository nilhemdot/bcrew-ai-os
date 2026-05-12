export const AVATAR_IMPORT_CARD_ID = 'AVATAR-IMPORT-001'
export const AVATAR_IMPORT_CLOSEOUT_KEY = 'avatar-import-v1'
export const AVATAR_IMPORT_PLAN_PATH = 'docs/process/avatar-import-001-plan.md'
export const AVATAR_IMPORT_APPROVAL_PATH = 'docs/process/approvals/AVATAR-IMPORT-001.json'
export const AVATAR_IMPORT_SCRIPT_PATH = 'scripts/process-avatar-import-check.mjs'
export const AVATAR_IMPORT_SUMMARY_MARKER = 'AVATAR_IMPORT_SUMMARY'

export const MARKETING_AVATAR_REGISTRY_README_PATH = 'docs/marketing/avatars/README.md'
export const MARKETING_AVATAR_SOURCE_ROOT = 'docs/marketing/avatars/source/old-bcrew-buddy'
export const MARKETING_AVATAR_REFERENCE_BRIEF_PATH = `${MARKETING_AVATAR_SOURCE_ROOT}/avatar-reference-brief.md`
export const MARKETING_AVATAR_RETAIN_SOURCE_PATH = `${MARKETING_AVATAR_SOURCE_ROOT}/retain-avatars.md`
export const MARKETING_AVATAR_ATTRACT_SOURCE_PATH = `${MARKETING_AVATAR_SOURCE_ROOT}/attract-avatars.md`
export const MARKETING_AVATAR_OLD_README_PATH = `${MARKETING_AVATAR_SOURCE_ROOT}/README.md`

export const MARKETING_AVATAR_EXPECTED_COUNTS = {
  total: 15,
  retain: 10,
  attract: 5,
}

export const MARKETING_AVATAR_REQUIRED_FIELDS = [
  'id',
  'track',
  'order',
  'name',
  'who',
  'pain',
  'emotions',
  'triggerWords',
  'contentThatWorks',
  'sourceDocs',
  'marketingUseBoundary',
]

export const MARKETING_AVATAR_USE_BOUNDARY = [
  'Avatars are governed marketing overlays, not mandatory fields on every intelligence atom.',
  'Future marketing atoms and briefs may reference these stable IDs through existing avatar_ids/avatar_names fields.',
  'This registry does not build campaigns, content calendars, writers, editors, schedulers, Brand Guardian, or monthly refresh automation.',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function splitCommaList(value) {
  return normalizeText(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function countMatches(text, regex) {
  return Array.from(String(text || '').matchAll(regex)).length
}

function extractBriefField(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(body || '').match(new RegExp(`\\*\\*${escaped}:\\*\\*[ \\t]*([^\\n]*)`))
  return normalizeText(match?.[1] || '')
}

function sourcePathForTrack(track) {
  return track === 'attract'
    ? MARKETING_AVATAR_ATTRACT_SOURCE_PATH
    : MARKETING_AVATAR_RETAIN_SOURCE_PATH
}

function buildFullProfileHeading(track, order) {
  return track === 'attract'
    ? `## AVATAR ${order}:`
    : `## Avatar ${order}:`
}

export function parseMarketingAvatarReferenceBrief(referenceBriefText = '') {
  const source = String(referenceBriefText || '')
  const entries = []
  const sectionPattern = /^### (ATTRACT|RETAIN)-(\d+): ([^\n]+)/gm
  const headings = Array.from(source.matchAll(sectionPattern))

  headings.forEach((match, index) => {
    const rawTrack = match[1]
    const order = Number(match[2])
    const name = normalizeText(match[3])
    const bodyStart = match.index + match[0].length
    const bodyEnd = headings[index + 1]?.index ?? source.length
    const body = source.slice(bodyStart, bodyEnd)
    const track = rawTrack.toLowerCase()
    const id = `${rawTrack}-${order}`
    const triggerWords = splitCommaList(extractBriefField(body, 'Trigger words'))
    const contentThatWorks = splitCommaList(extractBriefField(body, 'Content that works'))
    const contentDirection = contentThatWorks.length
      ? contentThatWorks
      : ['See full profile source section: Content That Moves Them']

    entries.push({
      id,
      track,
      order,
      name,
      who: extractBriefField(body, 'Who'),
      pain: extractBriefField(body, 'Pain'),
      emotions: extractBriefField(body, 'Emotions'),
      triggerWords,
      contentThatWorks: contentDirection,
      sourceDocs: [
        MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
        sourcePathForTrack(track),
      ],
      fullProfileHeading: buildFullProfileHeading(track, order),
      researchedAt: '2026-04-02',
      syncedFromFullProfileAt: '2026-04-03',
      marketingUseBoundary: MARKETING_AVATAR_USE_BOUNDARY,
    })
  })

  return entries
}

export function analyzeMarketingAvatarProfileSources({
  retainProfilesText = '',
  attractProfilesText = '',
  oldReadmeText = '',
} = {}) {
  const retainAvatarCount = countMatches(retainProfilesText, /^## (?:Avatar|AVATAR) \d+:/gm)
  const attractAvatarCount = countMatches(attractProfilesText, /^## (?:Avatar|AVATAR) \d+:/gm)
  const retainPlatformSections = countMatches(retainProfilesText, /^### 6\. Platform Behavior/gm)
  const attractPlatformSections = countMatches(attractProfilesText, /^### 6\. Platform Behavior/gm)
  const retainObjectionSections = countMatches(retainProfilesText, /^### 7\. Objections/gm)
  const attractObjectionSections = countMatches(attractProfilesText, /^### 7\. Objections/gm)
  const retainBuyingSignalSections = countMatches(retainProfilesText, /^### 8\. Buying Signals/gm)
  const attractBuyingSignalSections = countMatches(attractProfilesText, /^### 8\. Buying Signals/gm)

  return {
    retainAvatarCount,
    attractAvatarCount,
    totalAvatarCount: retainAvatarCount + attractAvatarCount,
    platformBehaviorSectionCount: retainPlatformSections + attractPlatformSections,
    objectionSectionCount: retainObjectionSections + attractObjectionSections,
    buyingSignalSectionCount: retainBuyingSignalSections + attractBuyingSignalSections,
    lastResearchedAt: oldReadmeText.includes('Last Researched: 2026-04-02') ? '2026-04-02' : null,
    fullProfilePaths: [
      MARKETING_AVATAR_RETAIN_SOURCE_PATH,
      MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
      MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
      MARKETING_AVATAR_OLD_README_PATH,
    ],
  }
}

export function buildMarketingAvatarImportSnapshot({
  referenceBriefText = '',
  retainProfilesText = '',
  attractProfilesText = '',
  oldReadmeText = '',
  generatedAt = new Date().toISOString(),
} = {}) {
  const avatars = parseMarketingAvatarReferenceBrief(referenceBriefText)
  const sourceCoverage = analyzeMarketingAvatarProfileSources({
    retainProfilesText,
    attractProfilesText,
    oldReadmeText,
  })
  const retainAvatars = avatars.filter(avatar => avatar.track === 'retain')
  const attractAvatars = avatars.filter(avatar => avatar.track === 'attract')
  const ids = new Set()
  const findings = []

  for (const avatar of avatars) {
    if (ids.has(avatar.id)) {
      findings.push({
        severity: 'critical',
        key: 'duplicate_avatar_id',
        detail: `${avatar.id} appears more than once.`,
      })
    }
    ids.add(avatar.id)

    const missingFields = MARKETING_AVATAR_REQUIRED_FIELDS.filter(field => {
      const value = avatar[field]
      return Array.isArray(value) ? value.length === 0 : !normalizeText(value)
    })
    if (missingFields.length) {
      findings.push({
        severity: 'critical',
        key: 'avatar_required_fields',
        detail: `${avatar.id} is missing ${missingFields.join(', ')}.`,
      })
    }
  }

  if (avatars.length !== MARKETING_AVATAR_EXPECTED_COUNTS.total) {
    findings.push({
      severity: 'critical',
      key: 'avatar_total_count',
      detail: `Expected ${MARKETING_AVATAR_EXPECTED_COUNTS.total} avatars; found ${avatars.length}.`,
    })
  }
  if (retainAvatars.length !== MARKETING_AVATAR_EXPECTED_COUNTS.retain) {
    findings.push({
      severity: 'critical',
      key: 'retain_avatar_count',
      detail: `Expected ${MARKETING_AVATAR_EXPECTED_COUNTS.retain} RETAIN avatars; found ${retainAvatars.length}.`,
    })
  }
  if (attractAvatars.length !== MARKETING_AVATAR_EXPECTED_COUNTS.attract) {
    findings.push({
      severity: 'critical',
      key: 'attract_avatar_count',
      detail: `Expected ${MARKETING_AVATAR_EXPECTED_COUNTS.attract} ATTRACT avatars; found ${attractAvatars.length}.`,
    })
  }

  const requiredSourceSections = [
    ['platform_behavior_sections', sourceCoverage.platformBehaviorSectionCount],
    ['objection_sections', sourceCoverage.objectionSectionCount],
    ['buying_signal_sections', sourceCoverage.buyingSignalSectionCount],
  ]
  for (const [key, count] of requiredSourceSections) {
    if (count !== MARKETING_AVATAR_EXPECTED_COUNTS.total) {
      findings.push({
        severity: 'critical',
        key,
        detail: `Expected ${MARKETING_AVATAR_EXPECTED_COUNTS.total}; found ${count}.`,
      })
    }
  }

  if (!sourceCoverage.lastResearchedAt) {
    findings.push({
      severity: 'warning',
      key: 'source_last_researched_missing',
      detail: 'Old-system README does not preserve Last Researched: 2026-04-02.',
    })
  }

  return {
    status: findings.some(finding => finding.severity === 'critical') ? 'risk' : 'healthy',
    cardId: AVATAR_IMPORT_CARD_ID,
    closeoutKey: AVATAR_IMPORT_CLOSEOUT_KEY,
    generatedAt,
    summary: {
      totalAvatars: avatars.length,
      retainAvatars: retainAvatars.length,
      attractAvatars: attractAvatars.length,
      expected: MARKETING_AVATAR_EXPECTED_COUNTS,
      uniqueAvatarIds: ids.size,
      sourceDocs: sourceCoverage.fullProfilePaths.length,
      platformBehaviorSections: sourceCoverage.platformBehaviorSectionCount,
      objectionSections: sourceCoverage.objectionSectionCount,
      buyingSignalSections: sourceCoverage.buyingSignalSectionCount,
      lastResearchedAt: sourceCoverage.lastResearchedAt,
      marketingPipelineBuilt: false,
    },
    sourceCoverage,
    usageBoundary: MARKETING_AVATAR_USE_BOUNDARY,
    avatars,
    findings,
  }
}

function buildSyntheticReferenceBrief({ missingPainId = '', omitLastAttract = false } = {}) {
  const lines = [
    '# Avatar Reference Brief (Synthetic)',
    '',
    'Last synced from full profiles: 2026-04-03',
    'Full profiles: attract-avatars.md (5) + retain-avatars.md (10) = 15 avatars',
    '',
    '## ATTRACT Avatars (Agent Recruiting)',
    '',
  ]
  const addEntry = (track, order) => {
    const id = `${track}-${order}`
    lines.push(`### ${id}: Synthetic ${track} ${order}`)
    lines.push(`**Who:** Synthetic ${track} operator ${order}`)
    lines.push(`**Pain:** ${id === missingPainId ? '' : `Synthetic pain ${order}`}`)
    lines.push('**Emotions:** frustration, urgency')
    lines.push('**Trigger words:** stuck, no support, proof')
    lines.push('**Content that works:** case study, checklist')
    lines.push('')
  }
  for (let index = 1; index <= 5; index += 1) {
    if (omitLastAttract && index === 5) continue
    addEntry('ATTRACT', index)
  }
  lines.push('## RETAIN Avatars (Client Content)', '')
  for (let index = 1; index <= 10; index += 1) addEntry('RETAIN', index)
  return lines.join('\n')
}

function buildSyntheticFullProfiles({ track, count }) {
  const lines = []
  for (let index = 1; index <= count; index += 1) {
    lines.push(track === 'attract'
      ? `## AVATAR ${index}: SYNTHETIC ATTRACT ${index}`
      : `## Avatar ${index}: Synthetic Retain ${index}`)
    lines.push('')
    lines.push('### 6. Platform Behavior')
    lines.push('- Synthetic platform behavior.')
    lines.push('')
    lines.push('### 7. Objections')
    lines.push('- Synthetic objection.')
    lines.push('')
    lines.push('### 8. Buying Signals')
    lines.push('- Synthetic buying signal.')
    lines.push('')
  }
  return lines.join('\n')
}

export function buildSyntheticAvatarImportProof() {
  const good = buildMarketingAvatarImportSnapshot({
    referenceBriefText: buildSyntheticReferenceBrief(),
    retainProfilesText: buildSyntheticFullProfiles({ track: 'retain', count: 10 }),
    attractProfilesText: buildSyntheticFullProfiles({ track: 'attract', count: 5 }),
    oldReadmeText: '## Last Researched: 2026-04-02',
    generatedAt: '2026-05-12T00:00:00.000Z',
  })
  const wrongCount = buildMarketingAvatarImportSnapshot({
    referenceBriefText: buildSyntheticReferenceBrief({ omitLastAttract: true }),
    retainProfilesText: buildSyntheticFullProfiles({ track: 'retain', count: 10 }),
    attractProfilesText: buildSyntheticFullProfiles({ track: 'attract', count: 5 }),
    oldReadmeText: '## Last Researched: 2026-04-02',
    generatedAt: '2026-05-12T00:00:00.000Z',
  })
  const missingField = buildMarketingAvatarImportSnapshot({
    referenceBriefText: buildSyntheticReferenceBrief({ missingPainId: 'RETAIN-3' }),
    retainProfilesText: buildSyntheticFullProfiles({ track: 'retain', count: 10 }),
    attractProfilesText: buildSyntheticFullProfiles({ track: 'attract', count: 5 }),
    oldReadmeText: '## Last Researched: 2026-04-02',
    generatedAt: '2026-05-12T00:00:00.000Z',
  })
  const missingSourceSections = buildMarketingAvatarImportSnapshot({
    referenceBriefText: buildSyntheticReferenceBrief(),
    retainProfilesText: buildSyntheticFullProfiles({ track: 'retain', count: 9 }),
    attractProfilesText: buildSyntheticFullProfiles({ track: 'attract', count: 5 }),
    oldReadmeText: '## Last Researched: 2026-04-02',
    generatedAt: '2026-05-12T00:00:00.000Z',
  })

  return {
    ok: good.status === 'healthy' &&
      wrongCount.status === 'risk' &&
      missingField.status === 'risk' &&
      missingSourceSections.status === 'risk' &&
      good.summary.totalAvatars === MARKETING_AVATAR_EXPECTED_COUNTS.total &&
      good.summary.platformBehaviorSections === MARKETING_AVATAR_EXPECTED_COUNTS.total &&
      good.summary.objectionSections === MARKETING_AVATAR_EXPECTED_COUNTS.total &&
      good.summary.buyingSignalSections === MARKETING_AVATAR_EXPECTED_COUNTS.total,
    summary: {
      totalAvatars: good.summary.totalAvatars,
      retainAvatars: good.summary.retainAvatars,
      attractAvatars: good.summary.attractAvatars,
      wrongCountRejected: wrongCount.status === 'risk',
      missingFieldRejected: missingField.status === 'risk',
      missingSourceSectionsRejected: missingSourceSections.status === 'risk',
    },
    good,
    wrongCount,
    missingField,
    missingSourceSections,
  }
}
