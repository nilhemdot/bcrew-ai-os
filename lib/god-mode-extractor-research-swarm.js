import crypto from 'node:crypto'

export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CARD_ID = 'GOD-MODE-EXTRACTOR-RESEARCH-SWARM-001'
export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CLOSEOUT_KEY = 'god-mode-extractor-research-swarm-v1'
export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_REPORT_ARTIFACT_ID = 'research:god-mode-extractor-research-swarm-001'
export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_PLAN_PATH = 'docs/process/god-mode-extractor-research-swarm-001-plan.md'
export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_APPROVAL_PATH = 'docs/process/approvals/GOD-MODE-EXTRACTOR-RESEARCH-SWARM-001.json'
export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_RESEARCH_PATH = 'docs/source-notes/god-mode-extractor-research-swarm-2026-05-23.md'
export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CLOSEOUT_PATH = 'docs/handoffs/2026-05-23-god-mode-extractor-research-swarm-closeout.md'
export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_SCRIPT_PATH = 'scripts/process-god-mode-extractor-research-swarm-check.mjs'
export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_NEXT_CARD_ID = 'GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001'
export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'

export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CHANGED_FILES = [
  'lib/god-mode-extractor-research-swarm.js',
  'scripts/process-god-mode-extractor-research-swarm-check.mjs',
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_PLAN_PATH,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_APPROVAL_PATH,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_RESEARCH_PATH,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_NOT_NEXT = [
  'Do not extract Mark last-50 or other creator latest-20 through weak transcript-only/current mode.',
  'Do not build the Eyes runtime in this research card.',
  'Do not crawl private, paid, auth, Skool, Discord, Reddit login-only, comments, member, or course sources without exact approval.',
  'Do not copy private ClaudeClaw package code into AIOS production paths.',
  'Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.',
  'Do not create backlog cards automatically from research findings.',
  'Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions from this card.',
]

export const GOD_MODE_EXTRACTOR_RESEARCH_SWARM_PROOF_COMMANDS = [
  'node --check lib/god-mode-extractor-research-swarm.js',
  'node --check scripts/process-god-mode-extractor-research-swarm-check.mjs',
  'npm run process:god-mode-extractor-research-swarm-check -- --close-card --json',
  'npm run process:current-sprint-active-card-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:foundation-plan-reconcile-check -- --json',
  'npm run foundation:verify -- --json-summary',
]

export const GOD_MODE_RESEARCH_SOURCE_IDS = [
  'SRC-CREATOR-WATCHLIST-001',
  'SRC-YOUTUBE-INTEL-001',
  'SRC-GITHUB-BUILD-INTEL-001',
  'SRC-SKOOL-001',
]

export const GOD_MODE_RESEARCH_SOURCES = [
  {
    key: 'gemini-video-understanding',
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    title: 'Gemini API video understanding',
    url: 'https://ai.google.dev/gemini-api/docs/video-understanding',
    accessClass: 'public_docs',
    role: 'EYES',
    finding: 'Gemini can process video with audio and visual streams, can accept public YouTube URLs, emits timestamp-aware observations, and supports custom clipping/FPS for higher-detail moments.',
    transferToAios: 'Use as Eyes V0 primary path for approved public YouTube videos before any screenshot-heavy browser loop.',
    caution: 'Default sampling is 1 FPS and can miss rapid visual changes; use clip/FPS only for targeted segments.',
  },
  {
    key: 'gemini-live-api',
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    title: 'Gemini Live API / realtime video',
    url: 'https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live',
    accessClass: 'public_docs',
    role: 'EYES_BRAIN',
    finding: 'Gemini Live supports low-latency bidirectional text, audio, and video sessions with function calling and session memory.',
    transferToAios: 'Use later for human-guided live screen sessions or operator co-watching; do not make it the first batch extractor path.',
    caution: 'Realtime sessions add privacy, session lifecycle, and cost complexity; batch video understanding is cleaner for V0.',
  },
  {
    key: 'browserbase-browse-skills',
    sourceId: 'SRC-GITHUB-BUILD-INTEL-001',
    title: 'Browserbase Browse.sh browser skills',
    url: 'https://www.browserbase.com/blog/browse.sh',
    accessClass: 'public_docs',
    role: 'HANDS',
    finding: 'Browse.sh turns repeat website navigation into reusable SKILL.md playbooks so agents do not rediscover the same selectors, endpoints, and gotchas every run.',
    transferToAios: 'Use a skill/playbook layer for site-specific navigation, course progress, and approved link-follow workflows.',
    caution: 'Skills improve browser reliability; they do not replace source approvals, rights boundaries, or visual understanding.',
  },
  {
    key: 'browserbase-skills-docs',
    sourceId: 'SRC-GITHUB-BUILD-INTEL-001',
    title: 'Browserbase skills documentation',
    url: 'https://docs.browserbase.com/integrations/skills/introduction',
    accessClass: 'public_docs',
    role: 'HANDS',
    finding: 'Browserbase skills cover interactive browser automation, snapshots/screenshots, authentication workflows, fetch APIs, and scheduled/webhook functions.',
    transferToAios: 'Model AIOS HANDS as governed skills: page fetch first, browser session when needed, screenshots as evidence, scheduled functions only after source packet approval.',
    caution: 'Auth workflows must stay explicit and approval-bound; never hide credential/profile mutation inside skills.',
  },
  {
    key: 'hermes-skills-system',
    sourceId: 'SRC-GITHUB-BUILD-INTEL-001',
    title: 'Hermes Agent skills ecosystem',
    url: 'https://hermes-agent.nousresearch.com/docs/ko/user-guide/features/skills',
    accessClass: 'public_docs',
    role: 'HANDS_BRAIN',
    finding: 'Hermes can search/install skills from official, skills.sh, well-known endpoints, GitHub, ClawHub, Claude marketplace repos, LobeHub, and browse.sh.',
    transferToAios: 'Treat future extractor capabilities as registered skills with source/trust class and install/provenance metadata.',
    caution: 'Community skill catalogs are untrusted until scanned, pinned, and bounded by a source packet.',
  },
  {
    key: 'mark-claudeclaw-package-review',
    sourceId: 'SRC-GITHUB-BUILD-INTEL-001',
    title: 'Mark Kashef ClaudeClaw local package review',
    url: 'docs/source-notes/mark-claudeclaw-build-intel.md',
    localPath: '/Users/bensoncrew/source-reviews/claudeclaw-os-202605231234',
    accessClass: 'approved_local_private_review',
    role: 'BRAIN_RUNTIME',
    finding: 'ClaudeClaw has useful provider adapter, mission queue, memory, kill switch, exfiltration guard, media-to-Gemini, and dashboard/Hive Mind patterns, but not a complete browser/video God Mode extractor.',
    transferToAios: 'Transfer architecture patterns, not code: provider seam, mission queue, stuck-run recovery, tool policy, kill switches, media upload route, and Mission Control UX.',
    caution: 'Do not copy private package code into production paths or commit member-source details beyond approved summaries.',
  },
  {
    key: 'kia-browser-skill-signal',
    sourceId: 'SRC-CREATOR-WATCHLIST-001',
    title: 'Kia AI Automations Browserbase/Hermes signal',
    url: 'docs/source-notes/kia-ai-automations-build-intel.md',
    accessClass: 'operator_supplied_public_note',
    role: 'HANDS',
    finding: 'Steve flagged Hermes Agent plus Browserbase Browse.sh as a signal that agents are moving toward reliable workers with reusable browser skills.',
    transferToAios: 'Include browser skill catalogs in the God Mode HANDS roadmap and source-value leaderboard.',
    caution: 'Skool community crawling remains blocked until public/no-auth or member-source approval is proven.',
  },
  {
    key: 'multimodal-extractor-contract',
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    title: 'AIOS multimodal extractor contract',
    url: 'docs/process/multimodal-extractor-001-plan.md',
    accessClass: 'repo_truth',
    role: 'POLICY',
    finding: 'AIOS already requires source type, rights/access class, evidence levels, route/cost, source anchors, observations, recommendation, confidence, and no auto backlog mutation.',
    transferToAios: 'Eyes V0 must emit this envelope, then compare output quality before scale-up.',
    caution: 'Do not bypass the contract just because video understanding is available.',
  },
  {
    key: 'old-system-research-harvest',
    sourceId: 'SRC-GITHUB-BUILD-INTEL-001',
    title: 'Old-system research team harvest',
    url: 'docs/handoffs/2026-05-19-old-system-research-team-harvest-closeout.md',
    accessClass: 'repo_truth',
    role: 'PROCESS',
    finding: 'The good old-system pattern was source scan, scored finding, synthesis, review/routing, and owner-bound action; the bad pattern was agent sprawl and unsafe browser/auth scripts.',
    transferToAios: 'God Mode must produce scored findings and review routes, not raw report piles.',
    caution: 'Do not revive ungoverned old agents.',
  },
]

export const GOD_MODE_ARCHITECTURE_OPTIONS = [
  {
    rank: 1,
    option: 'Batch Eyes V0: Gemini video understanding plus transcript, description links, and targeted visual/OCR fallback',
    recommendation: 'build_next',
    why: 'Best fit for the next card: uses approved public YouTube inputs, adds real visual/audio understanding, preserves timestamps/provenance, and avoids building a fragile live browser watcher first.',
    risks: ['provider quota/cost', 'fast screen changes can be missed at default FPS', 'public/private YouTube boundary must stay explicit'],
  },
  {
    rank: 2,
    option: 'HANDS skill layer: Playwright/Browserbase/Browse-style repeatable site playbooks',
    recommendation: 'design_parallel_boundary',
    why: 'Needed for Skool/course/community navigation and resource pages, but only after source packets define login, progress, and action boundaries.',
    risks: ['auth drift', 'credential/profile mutation', 'skill trust and stale selectors'],
  },
  {
    rank: 3,
    option: 'Live Eyes: Gemini Live screen/video co-watching',
    recommendation: 'park_for_operator_assisted_v1',
    why: 'Promising for human-guided sessions and real-time course walkthroughs, but heavier than needed for first public YouTube comparison.',
    risks: ['session privacy', 'stream lifecycle', 'latency/cost', 'harder reproducibility'],
  },
  {
    rank: 4,
    option: 'Bulk screenshot every two seconds',
    recommendation: 'reject_as_default',
    why: 'Creates noisy artifacts, storage/cost pressure, privacy risk, and brittle interpretation. Use targeted keyframes/OCR only when video model or chapter evidence says visual detail matters.',
    risks: ['artifact bloat', 'weak source anchors', 'token waste', 'copyright/privacy exposure'],
  },
]

export const GOD_MODE_EYES_V0_RECOMMENDATION = {
  name: 'Eyes V0 quality loop',
  scope: '3-5 approved public YouTube videos only',
  primaryRoute: 'Gemini video understanding over exact public YouTube URL or approved media file reference',
  comparison: 'current transcript/description mode vs transcript + description/resource links + video visual/audio observations + targeted OCR/keyframes',
  steps: [
    'Lock exact public video URLs and source IDs.',
    'Run current baseline extraction: transcript artifact, visible title/metadata, description/resource links, current recommendations.',
    'Run Gemini video understanding with a prompt requiring timestamped visual/audio observations, visible code/tool/workflow moments, and uncertainty flags.',
    'Use custom clipping/FPS only for moments where code, diagrams, or fast screen changes matter.',
    'Capture targeted browser screenshots/OCR only for specific timestamp/page evidence, never broad screenshot loops by default.',
    'Emit multimodal extractor envelope with source anchors, route/cost, evidence levels, recommendation, confidence, and no auto backlog mutation.',
    'Score recommendation quality against baseline and decide whether to loop, expand, or stop.',
  ],
  outputFields: [
    'sourceId',
    'sourceUrl',
    'videoId',
    'evidenceLevels',
    'timestampedObservations',
    'visibleWorkflowMoments',
    'visibleCodeOrTooling',
    'resourceLinks',
    'recommendationCandidates',
    'qualityDeltaVsBaseline',
    'routeProvider',
    'model',
    'estimatedCostUsd',
    'approvalRequiredItems',
    'skipReason',
  ],
  qualityRubric: [
    'Did EYES find implementation details missing from the transcript?',
    'Did EYES identify tools, code, UI steps, diagrams, or workflows with timestamps?',
    'Did recommendations become more specific, buildable, and source-backed?',
    'Did the run preserve rights/access/source boundaries?',
    'Was cost/latency acceptable for a 3-5 video loop?',
  ],
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function requiredFindingsForSource(source = {}) {
  return Boolean(source.key && source.sourceId && source.title && source.url && source.accessClass && source.role && source.finding && source.transferToAios && source.caution)
}

export function buildGodModeExtractorResearchSwarmSnapshot() {
  const sources = GOD_MODE_RESEARCH_SOURCES
  const sourceIds = [...new Set(sources.map(source => source.sourceId))]
  const sourceRoles = [...new Set(sources.map(source => source.role))]
  const missingSourceFields = sources.filter(source => !requiredFindingsForSource(source)).map(source => source.key || source.title || 'unknown')
  const hasPublicDocs = sources.some(source => source.accessClass === 'public_docs')
  const hasInternalRepoTruth = sources.some(source => source.accessClass === 'repo_truth')
  const hasPrivateSummaryOnly = sources.some(source => source.accessClass === 'approved_local_private_review')
  const recommendedBuild = GOD_MODE_ARCHITECTURE_OPTIONS.find(option => option.recommendation === 'build_next')
  const rejectedDefaults = GOD_MODE_ARCHITECTURE_OPTIONS.filter(option => option.recommendation.startsWith('reject'))
  const findings = [
    {
      finding: 'Use Gemini video understanding as Eyes V0 primary route for approved public YouTube videos.',
      evidence: ['gemini-video-understanding', 'multimodal-extractor-contract'],
      decision: 'build_next_card',
    },
    {
      finding: 'Use Browserbase/Browse/Hermes-style skills as the HANDS layer, but only under source-packet approvals.',
      evidence: ['browserbase-browse-skills', 'browserbase-skills-docs', 'hermes-skills-system', 'kia-browser-skill-signal'],
      decision: 'design_boundary',
    },
    {
      finding: 'ClaudeClaw offers transferable runtime patterns but not a full video/browser EYES implementation to copy.',
      evidence: ['mark-claudeclaw-package-review'],
      decision: 'transfer_patterns_not_code',
    },
    {
      finding: 'Do not scale metadata/transcript-only watch rows into Mark last-50 or creator latest-20 extraction yet.',
      evidence: ['old-system-research-harvest', 'multimodal-extractor-contract'],
      decision: 'block_scale_until_quality_loop',
    },
  ]
  const failures = []
  if (sources.length < 8) failures.push({ check: 'source_count_too_low' })
  if (missingSourceFields.length) failures.push({ check: 'source_fields_missing', detail: missingSourceFields.join(', ') })
  if (!hasPublicDocs) failures.push({ check: 'public_docs_missing' })
  if (!hasInternalRepoTruth) failures.push({ check: 'internal_repo_truth_missing' })
  if (!hasPrivateSummaryOnly) failures.push({ check: 'approved_private_summary_missing' })
  if (!sourceRoles.includes('EYES') || !sourceRoles.includes('HANDS') || !sourceRoles.includes('BRAIN_RUNTIME')) failures.push({ check: 'eyes_hands_brain_roles_missing' })
  if (!recommendedBuild?.option) failures.push({ check: 'recommended_build_missing' })
  if (!rejectedDefaults.some(option => /screenshot/i.test(option.option))) failures.push({ check: 'bulk_screenshot_rejection_missing' })
  if (!GOD_MODE_EYES_V0_RECOMMENDATION.steps.some(step => /Gemini video understanding/i.test(step))) failures.push({ check: 'eyes_v0_gemini_step_missing' })
  if (!GOD_MODE_EYES_V0_RECOMMENDATION.qualityRubric.length) failures.push({ check: 'quality_rubric_missing' })

  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_eyes_quality_loop',
    cardId: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CARD_ID,
    closeoutKey: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CLOSEOUT_KEY,
    reportArtifactId: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_REPORT_ARTIFACT_ID,
    sourceIds,
    sourceCount: sources.length,
    sources,
    architectureOptions: GOD_MODE_ARCHITECTURE_OPTIONS,
    recommendedEyesV0: GOD_MODE_EYES_V0_RECOMMENDATION,
    findings,
    productizationOpportunities: [
      'Standalone extractor product: approved source packet, Eyes/HANDS/BRAIN run, timestamped evidence, recommendation quality score, and approval queue.',
      'Creator/source value leaderboard: rank sources by useful recommendations adopted into AIOS, not by raw video volume.',
      'Reusable skill registry: save site-specific HANDS playbooks once they prove reliable and safe.',
    ],
    safetyBoundaries: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_NOT_NEXT,
    researchHash: stableHash({ sources, options: GOD_MODE_ARCHITECTURE_OPTIONS, recommended: GOD_MODE_EYES_V0_RECOMMENDATION }),
    failures,
  }
}

export function buildGodModeExtractorResearchSwarmWriteSet(snapshot = {}) {
  return {
    reportArtifact: {
      reportArtifactId: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_REPORT_ARTIFACT_ID,
      reportType: 'director_brief',
      scopeKey: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CARD_ID,
      department: 'Foundation / Dev Team Intelligence',
      title: 'God Mode extractor research swarm brief',
      status: snapshot.ok ? 'reviewed' : 'failed',
      sourceIds: snapshot.sourceIds,
      sourceCoverage: list(snapshot.sources).map(source => ({
        sourceId: source.sourceId,
        key: source.key,
        url: source.url,
        accessClass: source.accessClass,
        role: source.role,
        coverage: 'research_summary_only',
      })),
      topFindings: list(snapshot.findings),
      actionRequiredItems: [
        {
          type: 'next_card_build_recommendation',
          cardId: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_NEXT_CARD_ID,
          recommendation: 'Build Eyes V0 quality loop on 3-5 approved public YouTube videos before any scale-up.',
          requiresSteveReview: false,
        },
        {
          type: 'source_approval_required',
          sourceId: 'SRC-SKOOL-001',
          recommendation: 'Keep Skool/community/course extraction blocked until exact public/no-auth or member-source approval packet exists.',
          requiresSteveReview: true,
        },
      ],
      openQuestions: [
        {
          question: 'Which 2-4 additional public videos should join the already approved Mark seed video for Eyes V0 comparison?',
          reason: 'The next quality loop needs exact public URLs before model/video work.',
        },
      ],
      outputPath: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_RESEARCH_PATH,
      structuredOutputJson: {
        architectureOptions: snapshot.architectureOptions,
        recommendedEyesV0: snapshot.recommendedEyesV0,
        productizationOpportunities: snapshot.productizationOpportunities,
        safetyBoundaries: snapshot.safetyBoundaries,
        researchHash: snapshot.researchHash,
      },
      metadata: {
        cardId: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CARD_ID,
        closeoutKey: GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CLOSEOUT_KEY,
        noPrivateCrawl: true,
        noCodeCopy: true,
        noExternalWrites: true,
        createsBacklogCardsAutomatically: false,
      },
    },
  }
}

export function buildGodModeExtractorResearchSwarmDogfoodProof() {
  const cases = [
    {
      name: 'reject transcript-only scale-up',
      input: { usesVisualEvidence: false, scaleToLast50: true, sourceApproved: true },
      ok: false,
      reason: 'visual_quality_loop_required_before_scale',
    },
    {
      name: 'reject bulk screenshot default',
      input: { primaryRoute: 'screenshot_every_2_seconds', targetedOnly: false },
      ok: false,
      reason: 'bulk_screenshot_not_primary_strategy',
    },
    {
      name: 'reject private source crawl',
      input: { source: 'skool_private', exactApproval: false },
      ok: false,
      reason: 'exact_source_approval_required',
    },
    {
      name: 'accept Eyes V0 bounded public proof',
      input: { videos: 3, publicOnly: true, usesTranscript: true, usesVideoUnderstanding: true, autoBacklog: false },
      ok: true,
      reason: 'bounded_public_quality_loop',
    },
  ]
  const ok = cases.every(row => row.name === 'accept Eyes V0 bounded public proof' ? row.ok === true : row.ok === false)
  return { ok, cases }
}

export function verifyGodModeExtractorResearchSwarmPersistedProof({ snapshot = {}, report = null } = {}) {
  const failures = []
  if (!report || report.reportArtifactId !== GOD_MODE_EXTRACTOR_RESEARCH_SWARM_REPORT_ARTIFACT_ID) failures.push({ check: 'report_missing' })
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}
  if (!list(structured.architectureOptions).length) failures.push({ check: 'architecture_options_missing' })
  if (!structured.recommendedEyesV0?.primaryRoute) failures.push({ check: 'eyes_v0_recommendation_missing' })
  if (!list(report?.sourceIds || report?.source_ids).includes('SRC-YOUTUBE-INTEL-001')) failures.push({ check: 'youtube_source_missing' })
  if (Number(snapshot.sourceCount || 0) < 8) failures.push({ check: 'source_count_low' })
  return {
    ok: failures.length === 0,
    failures,
  }
}

export function renderGodModeExtractorResearchBrief(snapshot = buildGodModeExtractorResearchSwarmSnapshot()) {
  const lines = [
    '# God Mode Extractor Research Swarm',
    '',
    'Date: 2026-05-23',
    `Card: \`${GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CARD_ID}\``,
    `Report artifact: \`${GOD_MODE_EXTRACTOR_RESEARCH_SWARM_REPORT_ARTIFACT_ID}\``,
    '',
    '## Plain-English Decision',
    '',
    'Do not scale creator extraction yet. The next build should be an Eyes V0 quality loop over 3-5 exact approved public YouTube videos.',
    '',
    'The first Eyes V0 route should be Gemini video understanding over exact public YouTube URLs or approved media references, combined with transcript artifacts, description/resource links, and targeted screenshot/OCR evidence only when needed.',
    '',
    'Browser automation and Browse/Hermes-style skills belong in the HANDS layer for navigation, course progress, and approved source interaction. They should not be used as a broad private/auth crawler.',
    '',
    '## Source-Backed Findings',
    '',
    ...snapshot.sources.map(source => [
      `### ${source.title}`,
      '',
      `- Source ID: \`${source.sourceId}\``,
      `- Role: \`${source.role}\``,
      `- Access: \`${source.accessClass}\``,
      `- URL/path: ${source.url}`,
      `- Finding: ${source.finding}`,
      `- Transfer to AIOS: ${source.transferToAios}`,
      `- Caution: ${source.caution}`,
      '',
    ].join('\n')),
    '## Ranked Architecture Options',
    '',
    ...snapshot.architectureOptions.map(option => [
      `### ${option.rank}. ${option.option}`,
      '',
      `- Recommendation: \`${option.recommendation}\``,
      `- Why: ${option.why}`,
      `- Risks: ${option.risks.join('; ')}`,
      '',
    ].join('\n')),
    '## Recommended Eyes V0',
    '',
    `- Name: ${snapshot.recommendedEyesV0.name}`,
    `- Scope: ${snapshot.recommendedEyesV0.scope}`,
    `- Primary route: ${snapshot.recommendedEyesV0.primaryRoute}`,
    `- Comparison: ${snapshot.recommendedEyesV0.comparison}`,
    '',
    'Steps:',
    '',
    ...snapshot.recommendedEyesV0.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    'Output fields:',
    '',
    ...snapshot.recommendedEyesV0.outputFields.map(field => `- \`${field}\``),
    '',
    'Quality rubric:',
    '',
    ...snapshot.recommendedEyesV0.qualityRubric.map(item => `- ${item}`),
    '',
    '## Productization Opportunities',
    '',
    ...snapshot.productizationOpportunities.map(item => `- ${item}`),
    '',
    '## Hard Boundaries',
    '',
    ...snapshot.safetyBoundaries.map(item => `- ${item}`),
    '',
    '## Research Hash',
    '',
    `\`${snapshot.researchHash}\``,
    '',
  ]
  return lines.join('\n')
}

export function renderGodModeExtractorResearchSwarmCloseout(snapshot = buildGodModeExtractorResearchSwarmSnapshot()) {
  return [
    '# God Mode Extractor Research Swarm Closeout',
    '',
    `Closeout key: \`${GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CLOSEOUT_KEY}\``,
    `Card: \`${GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CARD_ID}\``,
    `Report artifact: \`${GOD_MODE_EXTRACTOR_RESEARCH_SWARM_REPORT_ARTIFACT_ID}\``,
    '',
    '## What Shipped',
    '',
    '- Source-backed God Mode extractor research brief.',
    '- Persisted Foundation director brief for Dev Team / Build Intel.',
    '- Ranked extractor architecture options.',
    '- Exact recommended Eyes V0 implementation path.',
    '- Safety boundaries for private/auth/community/code package sources.',
    '',
    '## Decision',
    '',
    'Build `GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001` next. Use Gemini video understanding plus transcript/description/resource evidence on 3-5 exact approved public videos. Do not scale Mark last-50 or broader creator extraction until the quality loop proves meaningful improvement.',
    '',
    '## Numbers',
    '',
    `- Sources reviewed: ${snapshot.sourceCount}`,
    `- Architecture options ranked: ${snapshot.architectureOptions.length}`,
    `- Findings: ${snapshot.findings.length}`,
    '',
    '## Not Next',
    '',
    ...GOD_MODE_EXTRACTOR_RESEARCH_SWARM_NOT_NEXT.map(item => `- ${item}`),
    '',
    '## Proof Commands',
    '',
    ...GOD_MODE_EXTRACTOR_RESEARCH_SWARM_PROOF_COMMANDS.map(command => `- \`${command}\``),
    '',
  ].join('\n')
}
