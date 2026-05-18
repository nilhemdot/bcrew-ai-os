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
    lookupEvidence: extra.lookupEvidence || [],
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
      platform('youtube', 'YouTube', {
        url: 'https://www.youtube.com/@Mark_Kashef',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Microsoft Learn creator page links Mark Kashef to this YouTube channel.'],
      }),
      platform('web', 'Prompt Advisers', {
        url: 'https://www.promptadvisers.com/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Microsoft Learn links Mark Kashef to Prompt Advisers; site describes AI strategy consulting.'],
      }),
      platform('skool', 'Mark Kashef Skool', {
        url: 'https://www.skool.com/earlyaidopters',
        lookupStatus: 'known_paid_or_auth_url_pending_operator_review',
        accessBoundary: 'paid_authorized_required',
        lookupEvidence: ['Prompt Advisers links an Early AI-dopters Skool community.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'mark-kashef-youtube', url: 'https://www.youtube.com/@Mark_Kashef', sourceType: 'public_youtube_channel', lookupStatus: 'known_public_url' },
      { sourceKey: 'mark-kashef-microsoft-learn', url: 'https://learn.microsoft.com/en-us/community/learn-with/mark-kashef/', sourceType: 'public_profile', lookupStatus: 'known_public_url' },
      { sourceKey: 'mark-kashef-prompt-advisers', url: 'https://www.promptadvisers.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
      { sourceKey: 'mark-kashef-skool', url: 'https://www.skool.com/earlyaidopters', sourceType: 'paid_or_auth_community', lookupStatus: 'known_paid_or_auth_url_pending_operator_review' },
    ],
    active: true,
  },
  {
    creatorId: 'nate-herk',
    displayName: 'Nate Herk',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'mixed_public_and_paid_authorized_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: buildIntelWhy,
    platforms: [
      platform('youtube', 'YouTube', {
        url: 'https://www.youtube.com/@nateherk',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Nate Herk official site links to the @nateherk YouTube channel.'],
      }),
      platform('web', 'Nate Herk site', {
        url: 'https://www.nateherk.com/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Official Nate Herk site describes AI automation and n8n education.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'nate-herk-youtube', url: 'https://www.youtube.com/@nateherk', sourceType: 'public_youtube_channel', lookupStatus: 'known_public_url' },
      { sourceKey: 'nate-herk-site', url: 'https://www.nateherk.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
    ],
    active: true,
  },
  {
    creatorId: 'dream-labs-ai',
    displayName: 'Dream Labs AI',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'Karpathy-style LLM knowledge-base and business wiki patterns that can inform Foundation-owned knowledge compiler design.',
    platforms: [
      platform('web', 'Dream Labs AI site', {
        url: 'https://www.dreamlabsai.co/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Dream Labs public site says its projects include Instagram and YouTube experiments.'],
      }),
      platform('youtube', 'Dream Labs AI Karpathy KB video', {
        url: 'https://www.youtube.com/watch?v=FAWm7DuFSPc',
        lookupStatus: 'known_public_video_pending_operator_review',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Existing Karpathy KB source packet names this Dream Labs AI public video.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'dream-labs-ai-site', url: 'https://www.dreamlabsai.co/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
      { sourceKey: 'dream-labs-karpathy-kb-businesses', url: 'https://www.youtube.com/watch?v=FAWm7DuFSPc', sourceType: 'public_youtube_video', lookupStatus: 'known_public_video_pending_operator_review' },
    ],
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
    platforms: [
      platform('youtube', 'YouTube', {
        url: 'https://www.youtube.com/@chase-h-ai',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Public channel analytics identify Chase AI custom URL as @chase-h-ai.'],
      }),
      platform('web', 'Chase AI socials', {
        url: 'https://www.chasehannegan.com/socials',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Chase Hannegan socials page links Chase AI public profiles.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'chase-ai-youtube', url: 'https://www.youtube.com/@chase-h-ai', sourceType: 'public_youtube_channel', lookupStatus: 'known_public_url' },
      { sourceKey: 'chase-ai-socials', url: 'https://www.chasehannegan.com/socials', sourceType: 'public_site', lookupStatus: 'known_public_url' },
    ],
    active: true,
  },
  {
    creatorId: 'everyday-ai-jordan-wilson',
    displayName: 'Everyday AI / Jordan Wilson',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'daily',
    whySteveCares: 'Daily AI workplace, agent, and tool-release signal useful for Build Intel triage and operator education.',
    platforms: [
      platform('web', 'Everyday AI site', {
        url: 'https://www.youreverydayai.com/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Everyday AI site describes its daily AI newsletter and podcast.'],
      }),
      platform('youtube', 'Everyday AI YouTube', {
        url: 'https://www.youtube.com/@EverydayAI',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Everyday AI podcast follow page links a public YouTube channel.'],
      }),
      platform('podcast', 'Everyday AI Podcast', {
        url: 'https://www.buzzsprout.com/2175779/follow',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Buzzsprout page names Everyday AI Podcast and host Jordan Wilson.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'everyday-ai-site', url: 'https://www.youreverydayai.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
      { sourceKey: 'everyday-ai-youtube', url: 'https://www.youtube.com/@EverydayAI', sourceType: 'public_youtube_channel', lookupStatus: 'known_public_url' },
      { sourceKey: 'everyday-ai-podcast', url: 'https://www.buzzsprout.com/2175779/follow', sourceType: 'public_podcast', lookupStatus: 'known_public_url' },
    ],
    active: true,
  },
  {
    creatorId: 'matt-pocock-total-typescript',
    displayName: 'Matt Pocock / Total TypeScript',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'mixed_public_and_paid_authorized_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'TypeScript, agent coding workflow, and coding-agent portability source; paid course content remains approval-bound.',
    platforms: [
      platform('web', 'Total TypeScript', {
        url: 'https://www.totaltypescript.com/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Total TypeScript site identifies Matt Pocock and the TypeScript training surface.'],
      }),
      platform('github', 'Matt Pocock GitHub', {
        url: 'https://github.com/mattpocock',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['GitHub profile links Total TypeScript and public coding-agent adjacent repos.'],
      }),
      platform('youtube', 'Matt Pocock YouTube', {
        url: 'https://www.youtube.com/@mattpocockuk',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Public YouTube channel resolves for @mattpocockuk.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'total-typescript-site', url: 'https://www.totaltypescript.com/', sourceType: 'public_site_with_paid_course_boundary', lookupStatus: 'known_public_url' },
      { sourceKey: 'matt-pocock-github', url: 'https://github.com/mattpocock', sourceType: 'public_github_profile', lookupStatus: 'known_public_url' },
      { sourceKey: 'matt-pocock-youtube', url: 'https://www.youtube.com/@mattpocockuk', sourceType: 'public_youtube_channel', lookupStatus: 'known_public_url' },
    ],
    active: true,
  },
  {
    creatorId: 'andrej-karpathy',
    displayName: 'Andrej Karpathy',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'monthly',
    whySteveCares: 'Original LLM Wiki / knowledge-base pattern source and broader AI engineering context for Foundation compiler design.',
    platforms: [
      platform('gist', 'LLM Wiki gist', {
        url: 'https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Existing Karpathy KB source packet names this public gist as original source note.'],
      }),
      platform('github', 'Karpathy GitHub', {
        url: 'https://github.com/karpathy',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Public GitHub profile for Karpathy source material.'],
      }),
      platform('youtube', 'Karpathy YouTube', {
        url: 'https://www.youtube.com/@karpathy',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Public YouTube channel resolves for @karpathy.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'karpathy-llm-wiki-original', url: 'https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f', sourceType: 'public_gist', lookupStatus: 'known_public_url' },
      { sourceKey: 'karpathy-github', url: 'https://github.com/karpathy', sourceType: 'public_github_profile', lookupStatus: 'known_public_url' },
      { sourceKey: 'karpathy-youtube', url: 'https://www.youtube.com/@karpathy', sourceType: 'public_youtube_channel', lookupStatus: 'known_public_url' },
    ],
    active: true,
  },
  {
    creatorId: 'aaron-bitwise',
    displayName: 'Aaron Bitwise',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'Non-coder/business AI workflow source for practical agent and operator-use examples.',
    platforms: [
      platform('youtube', 'Aaron Bitwise YouTube', {
        url: 'https://www.youtube.com/@AaronBitwise',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Public YouTube channel resolves for @AaronBitwise.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'aaron-bitwise-youtube', url: 'https://www.youtube.com/@AaronBitwise', sourceType: 'public_youtube_channel', lookupStatus: 'known_public_url' },
    ],
    active: true,
  },
  {
    creatorId: 'openhuman-tinyhumansai',
    displayName: 'OpenHuman / tinyhumansai',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'Open-source agent harness, memory tree, auto-fetch, integrations, and local-first assistant patterns relevant to Harlan/Foundation runtime design.',
    platforms: [
      platform('github', 'tinyhumansai/openhuman', {
        url: 'https://github.com/tinyhumansai/openhuman',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['GitHub README describes OpenHuman as a personal AI agent with memory tree and integrations.'],
      }),
      platform('web', 'OpenHuman site', {
        url: 'https://tinyhumans.ai/openhuman',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['OpenHuman README links the TinyHumans OpenHuman website.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'openhuman-github', url: 'https://github.com/tinyhumansai/openhuman', sourceType: 'public_github_repo', lookupStatus: 'known_public_url' },
      { sourceKey: 'openhuman-site', url: 'https://tinyhumans.ai/openhuman', sourceType: 'public_site', lookupStatus: 'known_public_url' },
    ],
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
      sourceRefs: (entry.sourceRefs || []).map(item => ({ ...item })),
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
