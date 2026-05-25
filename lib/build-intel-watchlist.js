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

function publicYoutubePlatform(url, lookupEvidence = [], label = 'YouTube') {
  return platform('youtube', label, {
    url,
    lookupStatus: 'known_public_url',
    accessBoundary: 'public_lookup_required',
    lookupEvidence,
  })
}

function publicYoutubeRef(sourceKey, url) {
  return {
    sourceKey,
    url,
    sourceType: 'public_youtube_channel',
    lookupStatus: 'known_public_url',
  }
}

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
    platforms: [
      publicYoutubePlatform('https://www.youtube.com/@myicor', ['Social Blade and myICOR public site identify ICOR with Tom | AI Productivity as @myicor.']),
      platform('web', 'myICOR public site', {
        url: 'https://myicor.com/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Steve pays for ICOR training; public myICOR page describes Tom Solid, ICOR, weekly coaching, searchable content, and the AI productivity system.'],
      }),
      platform('myicor', 'myICOR / ICOR paid training', { accessBoundary: 'paid_authorized_required' }),
    ],
    sourceRefs: [
      publicYoutubeRef('icor-tom-youtube', 'https://www.youtube.com/@myicor'),
      { sourceKey: 'icor-public-site', url: 'https://myicor.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
    ],
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
      platform('web', 'Early AI-dopters Claude Code Living Course', {
        url: 'https://ea-claudecodelivingcourse.vercel.app/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Steve supplied the public Living Course page on 2026-05-23 as a Mark/ClaudeClaw Build Intel source.'],
      }),
      platform('web', 'Early AI-dopters ClaudeClaw Roadmap', {
        url: 'https://ea-roadmap.vercel.app/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Steve supplied the public roadmap on 2026-05-23; ClaudeClaw OS board data is public read-only.'],
      }),
      platform('github', 'ClaudeClaw OS private package', {
        url: 'https://github.com/earlyaidopters/claudeclaw-os',
        lookupStatus: 'known_paid_or_auth_url_pending_operator_review',
        accessBoundary: 'paid_authorized_required',
        lookupEvidence: ['Steve supplied a temporary member clone path on 2026-05-23; token must never be stored in repo truth.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'mark-kashef-youtube', url: 'https://www.youtube.com/@Mark_Kashef', sourceType: 'public_youtube_channel', lookupStatus: 'known_public_url' },
      { sourceKey: 'mark-kashef-microsoft-learn', url: 'https://learn.microsoft.com/en-us/community/learn-with/mark-kashef/', sourceType: 'public_profile', lookupStatus: 'known_public_url' },
      { sourceKey: 'mark-kashef-prompt-advisers', url: 'https://www.promptadvisers.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
      { sourceKey: 'mark-earlyaidopters-living-course', url: 'https://ea-claudecodelivingcourse.vercel.app/', sourceType: 'public_course_sales_page', lookupStatus: 'known_public_url' },
      { sourceKey: 'mark-earlyaidopters-roadmap', url: 'https://ea-roadmap.vercel.app/', sourceType: 'public_roadmap_api', lookupStatus: 'known_public_url' },
      { sourceKey: 'mark-kashef-skool', url: 'https://www.skool.com/earlyaidopters', sourceType: 'paid_or_auth_community', lookupStatus: 'known_paid_or_auth_url_pending_operator_review' },
      { sourceKey: 'mark-skool-premium-recordings', url: 'https://www.skool.com/earlyaidopters/classroom/26269254?md=40b2005716c94833a5f4563d0f3c40f0', sourceType: 'paid_or_auth_classroom', lookupStatus: 'known_paid_or_auth_url_pending_operator_review' },
      { sourceKey: 'mark-skool-claudeclaw-classroom', url: 'https://www.skool.com/earlyaidopters/classroom/f1a72e71?md=e02d48da3b644170a9a8ab0624804102', sourceType: 'paid_or_auth_classroom', lookupStatus: 'known_paid_or_auth_url_pending_operator_review' },
      { sourceKey: 'mark-claudeclaw-os-private-github', url: 'https://github.com/earlyaidopters/claudeclaw-os', sourceType: 'paid_authorized_private_github_repo', lookupStatus: 'known_paid_or_auth_url_pending_operator_review' },
    ],
    active: true,
  },
  {
    creatorId: 'kia-ghasem-ai-automations',
    displayName: 'Kia Ghasem / AI Automations',
    sourceCategory: 'build_intel',
    priority: 'P0',
    accessBoundary: 'mixed_public_and_paid_authorized_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: 'AI automation and agent-workflow community signal; Steve flagged Kia community chat as a useful text source for tracking real agent ecosystem updates.',
    platforms: [
      platform('youtube', 'YouTube', {
        url: 'https://www.youtube.com/@KiaGhasem',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Steve supplied the Kia Ghasem YouTube videos page and seed video on 2026-05-23.'],
      }),
      platform('skool', 'AI Automations by Kia Skool community', {
        url: 'https://www.skool.com/ai-automations-by-kia',
        lookupStatus: 'operator_supplied_free_community_pending_public_read_check',
        accessBoundary: 'mixed_public_and_paid_authorized_required',
        lookupEvidence: ['Steve supplied a visible community post about Hermes Agent, Browserbase Browse.sh skills, and Nous Research on 2026-05-23.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'kia-ghasem-youtube', url: 'https://www.youtube.com/@KiaGhasem', sourceType: 'public_youtube_channel', lookupStatus: 'known_public_url' },
      { sourceKey: 'kia-ghasem-seed-video', url: 'https://www.youtube.com/watch?v=yi1JlBnDZgc', sourceType: 'public_youtube_video', lookupStatus: 'known_public_url' },
      { sourceKey: 'kia-ai-automations-skool-community', url: 'https://www.skool.com/ai-automations-by-kia', sourceType: 'free_or_auth_community', lookupStatus: 'operator_supplied_free_community_pending_public_read_check' },
      { sourceKey: 'kia-ai-automations-agent-space-post', url: 'https://www.skool.com/ai-automations-by-kia/big-update-for-the-ai-agent-space?p=64e92338', sourceType: 'free_or_auth_community_post', lookupStatus: 'operator_supplied_free_community_post' },
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
      publicYoutubePlatform('https://www.youtube.com/@DreamLabs_AI', ['YouTube oEmbed for seed video FAWm7DuFSPc identifies author Dream Labs AI and author_url @DreamLabs_AI.']),
      platform('youtube', 'Dream Labs AI Karpathy KB video', {
        url: 'https://www.youtube.com/watch?v=FAWm7DuFSPc',
        lookupStatus: 'known_public_video_pending_operator_review',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Existing Karpathy KB source packet names this Dream Labs AI public video.'],
      }),
    ],
    sourceRefs: [
      { sourceKey: 'dream-labs-ai-site', url: 'https://www.dreamlabsai.co/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
      publicYoutubeRef('dream-labs-ai-youtube', 'https://www.youtube.com/@DreamLabs_AI'),
      { sourceKey: 'dream-labs-karpathy-kb-businesses', url: 'https://www.youtube.com/watch?v=FAWm7DuFSPc', sourceType: 'public_youtube_video', lookupStatus: 'known_public_video_pending_operator_review' },
      { sourceKey: 'dream-labs-karpathy-software-3-business-video', url: 'https://www.youtube.com/watch?v=hJNp9RwK-Uw', sourceType: 'public_youtube_video', lookupStatus: 'known_public_video_pending_god_mode_extraction' },
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
    platforms: [
      publicYoutubePlatform('https://www.youtube.com/@danmartell', ['Dan Martell official site links its YouTube social card to @danmartell.']),
      platform('web', 'Dan Martell site', {
        url: 'https://www.danmartell.com/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Dan Martell official site links YouTube, blog, and other social surfaces.'],
      }),
    ],
    sourceRefs: [
      publicYoutubeRef('dan-martell-youtube', 'https://www.youtube.com/@danmartell'),
      { sourceKey: 'dan-martell-site', url: 'https://www.danmartell.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
    ],
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
    platforms: [
      publicYoutubePlatform('https://www.youtube.com/@nicksaraev', ['Nick Saraev official site links Nick’s YouTube at @nicksaraev.']),
      platform('web', 'Nick Saraev site', {
        url: 'https://nicksaraev.com/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Nick Saraev official site describes his AI, automation, and Maker School work.'],
      }),
    ],
    sourceRefs: [
      publicYoutubeRef('nick-saraev-youtube', 'https://www.youtube.com/@nicksaraev'),
      { sourceKey: 'nick-saraev-site', url: 'https://nicksaraev.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
    ],
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
    platforms: [
      publicYoutubePlatform('https://www.youtube.com/@PaulJLipsky', ['Paul J Lipsky official site links YouTube channel @PaulJLipsky.']),
      platform('web', 'Paul J Lipsky site', {
        url: 'https://pauljlipsky.com/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Paul J Lipsky public site describes his AI tools/tutorial channel and links YouTube.'],
      }),
    ],
    sourceRefs: [
      publicYoutubeRef('paul-j-lipsky-youtube', 'https://www.youtube.com/@PaulJLipsky'),
      { sourceKey: 'paul-j-lipsky-site', url: 'https://pauljlipsky.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
    ],
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
    platforms: [
      publicYoutubePlatform('https://www.youtube.com/@linkingyourthinking', ['Linking Your Thinking newsletter links YouTube channel @linkingyourthinking.']),
      platform('web', 'Linking Your Thinking site', {
        url: 'https://www.linkingyourthinking.com/',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Linking Your Thinking public site identifies Nick Milo and the LYT knowledge-management system.'],
      }),
      platform('newsletter', 'Linking Your Thinking newsletter links', {
        url: 'https://newsletter.linkingyourthinking.com/profile/links',
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: ['Newsletter links page lists YouTube, Twitter, site, Ideaverse, and Substack.'],
      }),
    ],
    sourceRefs: [
      publicYoutubeRef('linking-your-thinking-youtube', 'https://www.youtube.com/@linkingyourthinking'),
      { sourceKey: 'linking-your-thinking-site', url: 'https://www.linkingyourthinking.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
      { sourceKey: 'linking-your-thinking-newsletter-links', url: 'https://newsletter.linkingyourthinking.com/profile/links', sourceType: 'public_links_page', lookupStatus: 'known_public_url' },
    ],
    active: true,
  },
  ...[
    {
      creatorId: 'mansel-scheffel',
      displayName: 'Mansel Scheffel',
      youtubeUrl: 'https://www.youtube.com/@mansel.scheffel',
      evidence: ['Gameznet and direct YouTube page identify Mansel Scheffel as @mansel.scheffel.'],
    },
    {
      creatorId: 'ai-news-strategy-daily',
      displayName: 'AI News & Strategy Daily',
      youtubeUrl: 'https://www.youtube.com/@artificialintelligencenews1373',
      evidence: ['Public channel lookup identifies Artificial Intelligence News Daily at @artificialintelligencenews1373; mapped to Steve’s AI News & Strategy Daily lead.'],
    },
    {
      creatorId: 'ray-amjad',
      displayName: 'Ray Amjad',
      youtubeUrl: 'https://www.youtube.com/@ramjad',
      evidence: ['Developer Educators and direct YouTube page identify Ray Amjad as @ramjad.'],
    },
    {
      creatorId: 'alex-finn',
      displayName: 'Alex Finn',
      youtubeUrl: 'https://www.youtube.com/@AlexFinn',
      evidence: ['Direct YouTube page resolves @AlexFinn to Alex Finn.'],
    },
    {
      creatorId: 'jono-catliff',
      displayName: 'Jono Catliff',
      youtubeUrl: 'https://www.youtube.com/@jonocatliff',
      evidence: ['YouTube oEmbed for the Claude Code SEO seed video 4IyJm1i__ag identifies author Jono Catliff and author_url @jonocatliff.'],
      sourceRefs: [
        { sourceKey: 'jono-catliff-seo-claude-code-video', url: 'https://www.youtube.com/watch?v=4IyJm1i__ag', sourceType: 'public_youtube_video', lookupStatus: 'known_public_url' },
        { sourceKey: 'jono-catliff-site', url: 'https://jonocatliff.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
      ],
    },
    {
      creatorId: 'chris-bradley-mrr',
      displayName: 'Chris Bradley / MRR Official',
      youtubeUrl: 'https://www.youtube.com/@chrisbradleymrrofficial',
      evidence: ['Steve supplied the public Chris Bradley MRR Official videos page on 2026-05-23.'],
    },
    {
      creatorId: 'ambitious-ai',
      displayName: 'Ambitious AI',
      youtubeUrl: 'https://www.youtube.com/@ambitious1z',
      evidence: [
        'Developer Educators identifies ambITious | AI as @ambitious1z.',
        'Steve supplied the GoHighLevel replacement video on 2026-05-24; YouTube oEmbed resolves AfC4DN_1kp0 to ambITious | AI.',
      ],
      sourceRefs: [
        { sourceKey: 'ambitious-ai-claude-code-replaced-ghl-video', url: 'https://www.youtube.com/watch?v=AfC4DN_1kp0', sourceType: 'public_youtube_video', lookupStatus: 'known_public_video_pending_god_mode_extraction' },
      ],
    },
    {
      creatorId: 'brad-bonanno-ai-automation',
      displayName: 'Brad Bonanno / AI & Automation',
      youtubeUrl: 'https://www.youtube.com/@bradbonanno',
      evidence: ['Steve supplied Brad Bonanno as the Brad AI & Automation public YouTube channel on 2026-05-23.'],
    },
    {
      creatorId: 'creator-magic',
      displayName: 'Creator Magic',
      youtubeUrl: 'https://www.youtube.com/@creatormagicai',
      evidence: ['Developer Educators identifies Creator Magic as @creatormagicai.'],
      sourceRefs: [
        { sourceKey: 'creator-magic-apify', url: 'https://apify.com/creatormagic', sourceType: 'public_profile', lookupStatus: 'known_public_url' },
      ],
    },
    {
      creatorId: 'stacked-podcast',
      displayName: 'Stacked Podcast',
      youtubeUrl: 'https://www.youtube.com/@stackedpod',
      evidence: ['Steve supplied the Stacked Podcast public YouTube videos page on 2026-05-23.'],
    },
    {
      creatorId: 'jack-itssssss',
      displayName: 'Jack / Itssssss_Jack',
      youtubeUrl: 'https://www.youtube.com/@Itssssss_Jack',
      evidence: ['Steve supplied the public Itssssss_Jack videos page on 2026-05-23 as a Build Intel source lead.'],
    },
    {
      creatorId: 'zane-cole',
      displayName: 'Zane Cole',
      youtubeUrl: 'https://www.youtube.com/@ZaneCole',
      evidence: ['Direct YouTube page resolves @ZaneCole to Zane Cole; public Skool profile/search snippets tie Zane Cole to Claude Code app/client-building content.'],
      sourceRefs: [
        { sourceKey: 'zane-cole-skool-ai-founders', url: 'https://www.skool.com/aifounders', sourceType: 'free_or_auth_community', lookupStatus: 'known_public_or_free_url_pending_public_read_check' },
      ],
    },
    {
      creatorId: 'jp-middleton',
      displayName: 'JP Middleton',
      youtubeUrl: 'https://www.youtube.com/@OfficialJPMiddleton',
      evidence: ['YouTube oEmbed for seed video pzhbH-T3WEI identifies author JP Middleton and author_url @OfficialJPMiddleton.'],
      sourceRefs: [
        { sourceKey: 'jp-middleton-build-sell-ai-agents-video', url: 'https://www.youtube.com/watch?v=pzhbH-T3WEI', sourceType: 'public_youtube_video', lookupStatus: 'known_public_url' },
      ],
    },
    {
      creatorId: 'next-gen-ai',
      displayName: 'Next Gen AI',
      youtubeUrl: 'https://www.youtube.com/@NextGenAIHQ',
      evidence: ['Linktree/social lookup identifies NextGenAIHQ with a YouTube link; direct YouTube page resolves @NextGenAIHQ to NextGen AI.'],
    },
    {
      creatorId: 'leveling-up-eric-siu',
      displayName: 'Leveling Up / Eric Siu',
      youtubeUrl: 'https://www.youtube.com/@levelingupofficial',
      evidence: ['Social Blade identifies Leveling Up with Eric Siu as @levelingupofficial.'],
      sourceRefs: [
        { sourceKey: 'leveling-up-site', url: 'https://www.levelingup.com/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
      ],
    },
    {
      creatorId: 'simon-scrapes',
      displayName: 'Simon Scrapes',
      youtubeUrl: 'https://www.youtube.com/@simonscrapes',
      evidence: ['Developer Educators and SocialCounts identify Simon Scrapes | AI Automation as @simonscrapes.'],
    },
    {
      creatorId: 'austin-marchese',
      displayName: 'Austin Marchese',
      youtubeUrl: 'https://www.youtube.com/@austin.marchese',
      evidence: ['Steve supplied Austin Marchese as a Build Intel source on 2026-05-24 via the Claude Code project setup video 0TZNQT3Eusc.'],
      sourceRefs: [
        { sourceKey: 'austin-marchese-claude-code-project-video', url: 'https://www.youtube.com/watch?v=0TZNQT3Eusc', sourceType: 'public_youtube_video', lookupStatus: 'known_public_video_pending_god_mode_extraction' },
      ],
    },
    {
      creatorId: 'brock-mesarich-ai-for-non-techies',
      displayName: 'Brock Mesarich / AI for Non Techies',
      youtubeUrl: 'https://www.youtube.com/@BrockMesarich',
      evidence: ['Steve supplied Brock Mesarich / AI for Non Techies as a Build Intel source on 2026-05-24 via the Claude for Small Businesses skills video zzo33HUOfxI.'],
      sourceRefs: [
        { sourceKey: 'brock-mesarich-claude-small-businesses-skills-video', url: 'https://www.youtube.com/watch?v=zzo33HUOfxI', sourceType: 'public_youtube_video', lookupStatus: 'known_public_video_pending_god_mode_extraction' },
      ],
    },
    {
      creatorId: 'david-ondrej',
      displayName: 'David Ondrej',
      youtubeUrl: 'https://www.youtube.com/@davidondrej',
      evidence: [
        'Steve requested David Ondrej as a Build Intel source on 2026-05-23 after the public video "Why This Dev Ships 100x Faster Than 99% of Engineers" matched the context-engineering / agentic-engineering sprint theme.',
        'Steve supplied the agent-harness video lead on 2026-05-24; web lookup resolved the case-sensitive YouTube ID as efRIrLXoOVA and title "Anthropic Just Dropped a Masterclass on Building Agent Harnesses (for Large Codebases)".',
      ],
      sourceRefs: [
        { sourceKey: 'david-ondrej-100x-engineers-video', url: 'https://www.youtube.com/watch?v=PzVV4X37ihg', sourceType: 'public_youtube_video', lookupStatus: 'known_public_url' },
        { sourceKey: 'david-ondrej-agent-harnesses-large-codebases', url: 'https://www.youtube.com/watch?v=efRIrLXoOVA', sourceType: 'public_youtube_video', lookupStatus: 'known_public_video_pending_god_mode_extraction' },
      ],
    },
    {
      creatorId: 'nuno-tavares-automated-marketer',
      displayName: 'Nuno Tavares / Automated Marketer',
      youtubeUrl: 'https://www.youtube.com/channel/UC58LYmAXBma-jx3hhs0lo5w',
      evidence: [
        'Steve requested Nuno Tavares / Automated Marketer as an ungraded Build Intel source on 2026-05-25 after flagging the public video "6 Claude Code GitHub Repos That Change Everything".',
        'YouTube RSS for channel UC58LYmAXBma-jx3hhs0lo5w identifies the channel as Nuno Tavares | Automated Marketer and resolves the video ID L2JKgj7WzU4.',
      ],
      sourceRefs: [
        { sourceKey: 'nuno-tavares-automated-marketer-claude-code-github-repos-video', url: 'https://www.youtube.com/watch?v=L2JKgj7WzU4', sourceType: 'public_youtube_video', lookupStatus: 'known_public_video_pending_god_mode_extraction' },
        { sourceKey: 'nuno-tavares-automated-marketer-site', url: 'https://automatedmarketer.net/', sourceType: 'public_site', lookupStatus: 'known_public_url' },
      ],
    },
  ].map(({ creatorId, displayName, youtubeUrl = '', evidence = [], sourceRefs = [] }) => ({
    creatorId,
    displayName,
    sourceCategory: 'build_intel',
    priority: displayName === 'Alex Finn' ? 'P0' : 'P1',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'build_intel',
    cadence: 'weekly',
    whySteveCares: buildIntelWhy,
    platforms: youtubeUrl
      ? [publicYoutubePlatform(youtubeUrl, evidence)]
      : [platform('youtube', 'YouTube')],
    sourceRefs: youtubeUrl
      ? [
          publicYoutubeRef(`${creatorId}-youtube`, youtubeUrl),
          ...sourceRefs,
        ]
      : sourceRefs,
    active: true,
  })),
  ...[
    {
      creatorId: 'neil-patel',
      displayName: 'Neil Patel',
      youtubeUrl: 'https://www.youtube.com/@NeilPatel',
      siteUrl: 'https://neilpatel.com/',
    },
    {
      creatorId: 'russell-brunson',
      displayName: 'Russell Brunson',
      youtubeUrl: 'https://www.youtube.com/@RussellBrunson',
      siteUrl: 'https://www.russellbrunson.com/',
    },
    {
      creatorId: 'alex-hormozi',
      displayName: 'Alex Hormozi',
      youtubeUrl: 'https://www.youtube.com/@AlexHormozi',
      siteUrl: 'https://www.acquisition.com/',
    },
    {
      creatorId: 'arsh-sanwarwala-thrillx',
      displayName: 'Arsh Sanwarwala / ThrillX',
      youtubeUrl: 'https://www.youtube.com/channel/UCElGI8MBLFcDtMbnyKkK3pA',
      siteUrl: 'https://thrillxdesign.com/',
    },
  ].map(({ creatorId, displayName, youtubeUrl, siteUrl }) => ({
    creatorId,
    displayName,
    sourceCategory: 'marketing_content_later',
    priority: 'P1',
    accessBoundary: 'public_lookup_required',
    consumerLane: 'marketing_content_later',
    cadence: 'weekly',
    whySteveCares: 'Later marketing/content intelligence source. Explicitly not part of this Build Intel extraction sprint.',
    platforms: [
      publicYoutubePlatform(youtubeUrl, [`Operator marketing source reconcile verified the public YouTube surface for ${displayName}.`]),
      platform('web', 'Website or blog', {
        url: siteUrl,
        lookupStatus: 'known_public_url',
        accessBoundary: 'public_lookup_required',
        lookupEvidence: [`Operator marketing source reconcile captured ${displayName} public site/blog lead.`],
      }),
    ],
    sourceRefs: [
      publicYoutubeRef(`${creatorId}-youtube`, youtubeUrl),
      { sourceKey: `${creatorId}-site`, url: siteUrl, sourceType: 'public_site', lookupStatus: 'known_public_url' },
    ],
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
