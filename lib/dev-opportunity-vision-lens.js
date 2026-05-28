export const DEV_OPPORTUNITY_VISION_LENS_ID = 'dev-opportunity-vision-lens-v1'

const LENS_LABELS = {
  teamAiosVision: 'Team AIOS vision',
  foundationReliability: 'Foundation reliability',
  godModeExtraction: 'God Mode extraction',
  godModeAutomation: 'God Mode automation',
  memoryContext: 'Memory/context',
  recruitingMarketing: 'Recruiting/marketing',
  devTeamQuality: 'Dev team quality',
  operatorLeverage: 'Steve leverage',
  vibeCodingOperator: 'Vibe coding/operator upgrade',
}

const OPPORTUNITY_DEFINITIONS = [
  {
    id: 'browser-agent-that-can-work',
    title: 'Browser Agent That Can Work',
    plainEnglish: 'Give AIOS a reliable human-style web worker that can see pages, click, type, use approved sessions, and stop when it reaches a real boundary.',
    nextMove: 'Review the strongest browser, hands, session, and computer-use evidence before deciding the runtime path.',
    terms: ['browser', 'agentic browser', 'computer use', 'hands', 'click', 'mouse', 'keyboard', 'dom', 'web', 'website', 'form', 'login', 'session', 'playwright', 'stagehand', 'browserbase', 'openclaw', 'control', 'navigation', 'chrome', 'accessibility'],
    lensBase: { teamAiosVision: 98, foundationReliability: 82, godModeExtraction: 85, godModeAutomation: 98, memoryContext: 62, recruitingMarketing: 88, devTeamQuality: 82, operatorLeverage: 94, vibeCodingOperator: 80 },
    priorityBoost: 14,
  },
  {
    id: 'extractor-that-can-go-anywhere',
    title: 'Extractor That Can Go Anywhere',
    plainEnglish: 'Build the source system that can watch, read, follow useful public/free resources, inspect communities/courses when allowed, and package the gold with proof.',
    nextMove: 'Use this to decide the next source worker: public resources, repos, newsletters, free communities, or paid/auth sessions.',
    terms: ['extractor', 'extraction', 'crawl', 'source', 'resource', 'youtube', 'video', 'transcript', 'skool', 'myicor', 'course', 'community', 'newsletter', 'repo', 'github', 'docs', 'page', 'reader', 'watch', 'visual', 'audio'],
    lensBase: { teamAiosVision: 96, foundationReliability: 90, godModeExtraction: 99, godModeAutomation: 72, memoryContext: 70, recruitingMarketing: 68, devTeamQuality: 86, operatorLeverage: 86, vibeCodingOperator: 86 },
    priorityBoost: 12,
  },
  {
    id: 'assistant-that-handles-conversations-like-steve',
    title: 'Assistant That Handles Conversations Like Steve',
    plainEnglish: 'Turn messages, replies, follow-ups, and human handoffs into an AIOS workflow that knows the person, context, intent, and next best response.',
    nextMove: 'Separate draft/approval behavior from eventual send behavior, then review recruiting and sales use cases.',
    terms: ['message', 'messages', 'dm', 'inbox', 'conversation', 'reply', 'respond', 'follow-up', 'follow up', 'telegram', 'gmail', 'email', 'missive', 'slack', 'linkedin', 'instagram', 'prospect', 'friend', 'classifier', 'outreach', 'personalized', 'human-in-the-loop'],
    lensBase: { teamAiosVision: 94, foundationReliability: 78, godModeExtraction: 48, godModeAutomation: 92, memoryContext: 84, recruitingMarketing: 96, devTeamQuality: 60, operatorLeverage: 98, vibeCodingOperator: 60 },
    priorityBoost: 10,
  },
  {
    id: 'memory-system-that-keeps-agents-sharp',
    title: 'Memory System That Keeps Agents Sharp',
    plainEnglish: 'Give agents durable memory, context, source truth, and handoff state so they stop forgetting, duplicating work, and losing the plot.',
    nextMove: 'Review memory, context, knowledge base, retrieval, and handoff ideas as one Foundation opportunity.',
    terms: ['memory', 'context', 'knowledge', 'knowledge base', 'rag', 'retrieval', 'vector', 'state', 'handoff', 'session', 'checkpoint', 'instructions', 'docs', 'document', 'continuity', 'profile', 'history'],
    lensBase: { teamAiosVision: 95, foundationReliability: 96, godModeExtraction: 64, godModeAutomation: 76, memoryContext: 99, recruitingMarketing: 72, devTeamQuality: 88, operatorLeverage: 92, vibeCodingOperator: 92 },
    priorityBoost: 11,
  },
  {
    id: 'agent-that-sees-what-went-wrong',
    title: 'Agent That Sees What Went Wrong',
    plainEnglish: 'Let builders and agents use screenshots, UI state, visual evidence, and runtime context to diagnose problems instead of guessing.',
    nextMove: 'Review visual debugging, QA, screenshots, and UI-state evidence before deciding the first tool slice.',
    terms: ['debug', 'debugger', 'visual', 'screenshot', 'screen', 'image', 'ui', 'qa', 'error', 'runtime error', 'terminal', 'diagnose', 'trace', 'verification', 'audit', 'layout', 'pixel', 'feedback'],
    lensBase: { teamAiosVision: 86, foundationReliability: 84, godModeExtraction: 70, godModeAutomation: 72, memoryContext: 68, recruitingMarketing: 38, devTeamQuality: 98, operatorLeverage: 78, vibeCodingOperator: 92 },
    priorityBoost: 8,
  },
  {
    id: 'system-that-turns-videos-into-team-playbooks',
    title: 'System That Turns Videos Into Team Playbooks',
    plainEnglish: 'Convert training, demos, screen recordings, and long courses into SOPs, skills, onboarding material, and repeatable team workflows.',
    nextMove: 'Review video-to-SOP, training, course, and workflow-recorder signals as one team-learning opportunity.',
    terms: ['sop', 'playbook', 'training', 'course', 'lesson', 'onboarding', 'video-to-sop', 'screen recording', 'recording', 'tutorial', 'workflow recorder', 'agent handbook', 'skills', 'skill', 'teach', 'classroom'],
    lensBase: { teamAiosVision: 90, foundationReliability: 78, godModeExtraction: 78, godModeAutomation: 64, memoryContext: 88, recruitingMarketing: 76, devTeamQuality: 82, operatorLeverage: 90, vibeCodingOperator: 98 },
    priorityBoost: 7,
  },
  {
    id: 'vibe-coding-system-for-steve',
    title: 'Vibe Coding System For Steve',
    plainEnglish: 'Turn the best AI coding lessons into Steve-facing prompts, workflows, review checks, build rules, and guardrails so Steve can direct Codex/Claude like a high-leverage operator without needing to become the engineer first.',
    nextMove: 'Watch the strongest vibe-coding and AI-coding videos, compare them to the current BCrew build process, then turn the useful parts into operator playbooks, builder instructions, checks, and backlog cards.',
    terms: ['vibe coding', 'vibe coder', 'ai coding workflow', 'coding agent workflow', 'ai-generated code', 'generated code', 'code generation', 'agent tool calls', 'prompt engineering', 'spec', 'requirements', 'development checklist', 'checklist runner', 'test first', 'code review', 'approval gate', 'security audit', 'pull request', 'commit', 'pre-commit', 'post-commit', 'builder workflow', 'operator workflow', 'pair programming', 'context engineering', 'workspace context', 'system rules', 'local files', 'build workflow', 'handoff', 'review loop', 'proof gate'],
    lensBase: { teamAiosVision: 92, foundationReliability: 92, godModeExtraction: 54, godModeAutomation: 78, memoryContext: 90, recruitingMarketing: 42, devTeamQuality: 99, operatorLeverage: 99, vibeCodingOperator: 100 },
    priorityBoost: 13,
  },
  {
    id: 'tool-finder-that-mines-repos-and-resources',
    title: 'Tool Finder That Mines Repos And Resources',
    plainEnglish: 'Mine public repos, docs, tools, templates, and creator resources for patterns AIOS can reuse instead of rebuilding from scratch.',
    nextMove: 'Prioritize repo/resource evidence from S/A Dev sources, then inspect the strongest public code/resources first.',
    terms: ['github', 'repo', 'repository', 'code', 'library', 'sdk', 'api', 'mcp', 'connector', 'template', 'resource', 'docs', 'open source', 'tool', 'package', 'npm', 'python', 'implementation'],
    lensBase: { teamAiosVision: 84, foundationReliability: 82, godModeExtraction: 76, godModeAutomation: 70, memoryContext: 56, recruitingMarketing: 46, devTeamQuality: 94, operatorLeverage: 76, vibeCodingOperator: 82 },
    priorityBoost: 6,
  },
  {
    id: 'team-command-center-that-picks-the-next-build',
    title: 'Team Command Center That Picks The Next Build',
    plainEnglish: 'Help Steve and the Dev team see what matters, why it matters, what is blocked, and what should move to Scoper next.',
    nextMove: 'Review Director, rankings, Scoper, backlog, approval, and dashboard signals as one command-center opportunity.',
    terms: ['dashboard', 'hub', 'director', 'scoper', 'portfolio', 'backlog', 'ranking', 'rank', 'priority', 'command center', 'approval', 'review', 'sprint', 'queue', 'decision', 'operator', 'next build'],
    lensBase: { teamAiosVision: 88, foundationReliability: 94, godModeExtraction: 58, godModeAutomation: 60, memoryContext: 72, recruitingMarketing: 62, devTeamQuality: 84, operatorLeverage: 98, vibeCodingOperator: 96 },
    priorityBoost: 8,
  },
  {
    id: 'quality-guard-that-keeps-builds-clean',
    title: 'Quality Guard That Keeps Builds Clean',
    plainEnglish: 'Protect AIOS from hardcoded truth, bloated files, weak tests, stale dashboards, and false-green proofs as the system grows.',
    nextMove: 'Review audit, verifier, hook, test, and code-quality ideas against the Foundation reliability mission.',
    terms: ['audit', 'verifier', 'verify', 'test', 'tests', 'proof', 'pre-commit', 'post-commit', 'hook', 'quality', 'review', 'ci', 'hardcoded', 'lint', 'health', 'clean', 'bloat', 'foundation verify'],
    lensBase: { teamAiosVision: 82, foundationReliability: 99, godModeExtraction: 44, godModeAutomation: 54, memoryContext: 64, recruitingMarketing: 32, devTeamQuality: 98, operatorLeverage: 84, vibeCodingOperator: 98 },
    priorityBoost: 7,
  },
  {
    id: 'ai-recruiting-and-growth-engine',
    title: 'AI Recruiting And Growth Engine',
    plainEnglish: 'Find, classify, message, follow up with, and nurture the right agents or leads without Steve manually carrying every conversation.',
    nextMove: 'Keep this as a future hub lens while Dev builds the browser, memory, and conversation foundations it needs.',
    terms: ['recruit', 'recruiting', 'lead', 'lead gen', 'prospect', 'outreach', 'linkedin', 'instagram', 'agent attraction', 'downline', 'real broker', 'offer', 'campaign', 'content', 'sales', 'follow-up', 'personalized', 'crm'],
    lensBase: { teamAiosVision: 88, foundationReliability: 74, godModeExtraction: 42, godModeAutomation: 90, memoryContext: 76, recruitingMarketing: 99, devTeamQuality: 54, operatorLeverage: 96, vibeCodingOperator: 44 },
    priorityBoost: 9,
  },
]

const PRIORITY_LENS_PACKS = [
  {
    id: 'current-sprint',
    label: 'Current Sprint',
    question: 'What helps the active Dev/Foundation push right now?',
    plainEnglish: 'Prioritize the opportunities that unlock the current source intelligence, browser runtime, memory, and clean Foundation work.',
    weights: { teamAiosVision: 1.08, foundationReliability: 1.05, godModeExtraction: 1.16, godModeAutomation: 1.18, memoryContext: 0.96, devTeamQuality: 1, operatorLeverage: 1.08 },
    opportunityBoosts: {
      'browser-agent-that-can-work': 16,
      'extractor-that-can-go-anywhere': 14,
      'memory-system-that-keeps-agents-sharp': 8,
      'team-command-center-that-picks-the-next-build': 6,
      'quality-guard-that-keeps-builds-clean': 5,
    },
  },
  {
    id: 'improve-existing-system',
    label: 'Improve Existing System',
    question: 'What makes the system we already have cleaner, safer, faster, or more autonomous?',
    plainEnglish: 'Favor hardening, readback, debugging, memory, dashboard clarity, and quality guards over brand-new surface area.',
    weights: { foundationReliability: 1.28, devTeamQuality: 1.22, memoryContext: 1.08, operatorLeverage: 0.96, teamAiosVision: 0.9 },
    opportunityBoosts: {
      'quality-guard-that-keeps-builds-clean': 16,
      'agent-that-sees-what-went-wrong': 13,
      'memory-system-that-keeps-agents-sharp': 12,
      'team-command-center-that-picks-the-next-build': 10,
      'system-that-turns-videos-into-team-playbooks': 5,
    },
  },
  {
    id: 'vibe-coding-operator',
    label: 'Vibe Coding / Steve',
    question: 'What turns Steve from frustrated vibe coder into a better operator of AI builders?',
    plainEnglish: 'Rank ideas that improve the human-plus-agent coding workflow: better prompts, specs, reviews, hooks, evidence, handoffs, and build discipline.',
    weights: { vibeCodingOperator: 1.5, operatorLeverage: 1.32, devTeamQuality: 1.28, foundationReliability: 1.14, memoryContext: 1.08, teamAiosVision: 1 },
    opportunityBoosts: {
      'vibe-coding-system-for-steve': 22,
      'quality-guard-that-keeps-builds-clean': 14,
      'team-command-center-that-picks-the-next-build': 12,
      'agent-that-sees-what-went-wrong': 10,
      'system-that-turns-videos-into-team-playbooks': 9,
      'memory-system-that-keeps-agents-sharp': 8,
    },
  },
  {
    id: 'new-big-opportunities',
    label: 'New Big Opportunities',
    question: 'What major new capability could move BCrew AIOS forward?',
    plainEnglish: 'Surface large upside ideas that may not be today’s build but could become major platform capabilities.',
    weights: { teamAiosVision: 1.24, godModeAutomation: 1.12, operatorLeverage: 1.16, recruitingMarketing: 1.08, godModeExtraction: 0.9, devTeamQuality: 0.78 },
    opportunityBoosts: {
      'ai-recruiting-and-growth-engine': 14,
      'assistant-that-handles-conversations-like-steve': 12,
      'browser-agent-that-can-work': 10,
      'tool-finder-that-mines-repos-and-resources': 8,
      'system-that-turns-videos-into-team-playbooks': 7,
    },
  },
  {
    id: 'foundation-reliability',
    label: 'Foundation Reliability',
    question: 'What protects Foundation Up from bloat, drift, false green, and stale truth?',
    plainEnglish: 'Rank opportunities by how much they strengthen the shared Foundation and reduce future repair work.',
    weights: { foundationReliability: 1.42, devTeamQuality: 1.22, memoryContext: 1.06, operatorLeverage: 0.94, teamAiosVision: 0.86 },
    opportunityBoosts: {
      'quality-guard-that-keeps-builds-clean': 18,
      'memory-system-that-keeps-agents-sharp': 12,
      'team-command-center-that-picks-the-next-build': 10,
      'agent-that-sees-what-went-wrong': 9,
      'extractor-that-can-go-anywhere': 5,
    },
  },
  {
    id: 'god-mode-extractors',
    label: 'God Mode Extractors',
    question: 'What helps extractors watch, read, click, follow links, respect boundaries, and package value?',
    plainEnglish: 'Focus on source extraction, browser Hands, source sessions, page/resource workers, courses, communities, and proof.',
    weights: { godModeExtraction: 1.44, godModeAutomation: 1.16, foundationReliability: 1.02, devTeamQuality: 0.96, teamAiosVision: 0.92 },
    opportunityBoosts: {
      'extractor-that-can-go-anywhere': 18,
      'browser-agent-that-can-work': 16,
      'tool-finder-that-mines-repos-and-resources': 8,
      'system-that-turns-videos-into-team-playbooks': 7,
      'agent-that-sees-what-went-wrong': 5,
    },
  },
  {
    id: 'memory-agent-quality',
    label: 'Memory / Agent Quality',
    question: 'What keeps agents context-aware, less forgetful, and better at long work?',
    plainEnglish: 'Favor durable memory, context handoff, retrieval, agent instruction quality, and continuity.',
    weights: { memoryContext: 1.48, foundationReliability: 1.1, operatorLeverage: 1.06, teamAiosVision: 1, devTeamQuality: 0.98 },
    opportunityBoosts: {
      'memory-system-that-keeps-agents-sharp': 20,
      'system-that-turns-videos-into-team-playbooks': 8,
      'team-command-center-that-picks-the-next-build': 6,
      'assistant-that-handles-conversations-like-steve': 5,
    },
  },
  {
    id: 'marketing-recruiting',
    label: 'Marketing / Recruiting',
    question: 'What helps BCrew attract, classify, message, and nurture agents or leads?',
    plainEnglish: 'Rank ideas for recruiting, content, outreach, conversation handling, and Steve-style follow-up.',
    weights: { recruitingMarketing: 1.5, godModeAutomation: 1.16, operatorLeverage: 1.18, memoryContext: 0.94, teamAiosVision: 0.94 },
    opportunityBoosts: {
      'ai-recruiting-and-growth-engine': 20,
      'assistant-that-handles-conversations-like-steve': 17,
      'browser-agent-that-can-work': 8,
      'system-that-turns-videos-into-team-playbooks': 5,
    },
  },
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(number(value))))
}

function opportunityDefinitionId(opportunity = {}) {
  return text(opportunity.definitionId || opportunity.opportunityDefinitionId || opportunity.opportunityId).replace(/^vision-opportunity:/, '')
}

function uniqueBy(items = [], keyFn = item => item) {
  const seen = new Set()
  const output = []
  for (const item of list(items)) {
    const key = text(keyFn(item))
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }
  return output
}

function candidateText(candidate = {}) {
  return [
    candidate.title,
    candidate.why,
    candidate.whyItMatters,
    candidate.summary,
    candidate.recommendedNextStep,
    candidate.implementationNotes,
    candidate.workflowSummary,
    candidate.extractedNotes,
    ...list(candidate.evidenceTimestamps),
    ...list(candidate.visualNotes).map(item => typeof item === 'string' ? item : item?.note || item?.summary || item?.text),
  ].map(text).filter(Boolean).join(' ').toLowerCase()
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countTermHits(haystack = '', terms = []) {
  return terms.reduce((score, term) => {
    const normalized = text(term).toLowerCase()
    if (!normalized) return score
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(normalized).replace(/\\ /g, '\\s+')}(?=$|[^a-z0-9])`, 'i')
    return score + (pattern.test(haystack) ? Math.max(1, Math.min(4, normalized.split(/\s+/).length)) : 0)
  }, 0)
}

function candidateMissionScore(candidate = {}) {
  return number(candidate.missionScore?.total ?? candidate.missionScore ?? candidate.score, 0)
}

function candidateLaneScores(candidate = {}) {
  return list(candidate.missionScoreBreakdown?.laneScores || candidate.missionScore?.laneScores)
}

function scoreDefinition(candidate = {}, definition = {}) {
  const haystack = candidateText(candidate)
  const termScore = countTermHits(haystack, definition.terms)
  if (termScore <= 0) return 0
  const laneScores = candidateLaneScores(candidate)
  const laneBonus = laneScores.reduce((sum, lane) => {
    const laneId = text(lane.id)
    const score = number(lane.score)
    if (definition.id === 'extractor-that-can-go-anywhere' && laneId === 'god_mode_extractor') return sum + Math.min(8, score / 3)
    if (definition.id === 'browser-agent-that-can-work' && laneId === 'reliable_agents_execution') return sum + Math.min(7, score / 3)
    if (definition.id === 'memory-system-that-keeps-agents-sharp' && laneId === 'context_continuity') return sum + Math.min(8, score / 2)
    if (definition.id === 'team-command-center-that-picks-the-next-build' && laneId === 'governed_promotion') return sum + Math.min(6, score / 2)
    if (definition.id === 'quality-guard-that-keeps-builds-clean' && laneId === 'foundation_shared_truth') return sum + Math.min(8, score / 3)
    return sum
  }, 0)
  return termScore + laneBonus
}

function bestDefinitionForCandidate(candidate = {}) {
  const scored = OPPORTUNITY_DEFINITIONS
    .map(definition => ({ definition, score: scoreDefinition(candidate, definition) }))
    .sort((left, right) => right.score - left.score)
  return scored[0]?.score > 0 ? scored[0] : null
}

function mergeLensScores(definition = {}, candidates = []) {
  const avgMission = candidates.length
    ? candidates.reduce((sum, candidate) => sum + candidateMissionScore(candidate), 0) / candidates.length
    : 0
  const candidateBoost = Math.min(8, candidates.length)
  const output = Object.entries(LENS_LABELS).map(([lensId, label]) => {
    const base = number(definition.lensBase?.[lensId], 0)
    const score = clampScore(base * 0.84 + avgMission * 0.08 + candidateBoost)
    return { lensId, label, score }
  })
  return output.sort((left, right) => right.score - left.score)
}

function sourceVideoId(candidate = {}) {
  return text(candidate.sourceVideoId || candidate.videoId)
}

function sourceUrl(candidate = {}) {
  return text(candidate.sourceUrl || (sourceVideoId(candidate) ? `https://www.youtube.com/watch?v=${sourceVideoId(candidate)}` : ''))
}

function attachedLinksForCandidates(candidates = [], sourceRows = [], actionRequiredItems = []) {
  const videoIds = new Set(candidates.map(sourceVideoId).filter(Boolean))
  const links = []
  for (const row of list(sourceRows)) {
    const rowVideoIds = [row.sourceVideoId, ...list(row.sourceVideoIds)].map(text).filter(Boolean)
    if (!rowVideoIds.some(videoId => videoIds.has(videoId))) continue
    links.push({
      url: row.url,
      host: row.host,
      label: row.label || row.bucketId || row.sourceType,
      status: row.devLanePriority?.priorityLabel || row.status || row.disposition,
      bucketId: row.bucketId,
      sourceVideoIds: rowVideoIds,
    })
  }
  for (const row of list(actionRequiredItems)) {
    if (!videoIds.has(text(row.sourceVideoId))) continue
    links.push({
      url: row.url,
      host: row.host,
      label: row.type || 'approval_required',
      status: row.allowedNextDecision || row.blocker,
      bucketId: 'approval',
      sourceVideoIds: [text(row.sourceVideoId)].filter(Boolean),
    })
  }
  return uniqueBy(links, link => link.url).slice(0, 12)
}

function sourceSupport(candidates = [], sourceRows = [], actionRequiredItems = []) {
  const creators = uniqueBy(candidates.map(candidate => ({
    creatorId: text(candidate.creatorId),
    creator: text(candidate.creator),
    sourceDevBuildGrade: text(candidate.sourceDevBuildGrade).toUpperCase(),
    sourceDevBuildScore: number(candidate.sourceDevBuildScore),
  })).filter(item => item.creator || item.creatorId), item => item.creatorId || item.creator)
  const videos = uniqueBy(candidates.map(candidate => ({
    videoId: sourceVideoId(candidate),
    url: sourceUrl(candidate),
    title: text(candidate.sourceVideoTitle || candidate.sourceReportTitle || candidate.title),
    creator: text(candidate.creator),
  })).filter(item => item.videoId || item.url), item => item.videoId || item.url)
  const reports = uniqueBy(candidates.map(candidate => candidate.sourceReportArtifactId).filter(Boolean), item => item)
  const links = attachedLinksForCandidates(candidates, sourceRows, actionRequiredItems)
  return {
    creators,
    videos,
    reports,
    links,
    counts: {
      creators: creators.length,
      videos: videos.length,
      reports: reports.length,
      links: links.length,
    },
  }
}

function opportunityScore(definition = {}, candidates = [], support = {}) {
  const scores = candidates.map(candidateMissionScore).filter(score => score > 0)
  const maxScore = scores.length ? Math.max(...scores) : 0
  const avgTop = scores.length ? scores.slice(0, 12).reduce((sum, score) => sum + score, 0) / Math.min(12, scores.length) : 0
  const supportBonus = Math.min(16,
    support.counts.creators * 2 +
      support.counts.videos +
      support.counts.links * 0.75 +
      Math.min(5, candidates.length / 4)
  )
  return clampScore(maxScore * 0.52 + avgTop * 0.22 + supportBonus + number(definition.priorityBoost))
}

function importantSignals(candidates = []) {
  return candidates
    .slice(0, 5)
    .map(candidate => ({
      rank: number(candidate.rank),
      title: text(candidate.title),
      why: text(candidate.why),
      next: text(candidate.recommendedNextStep),
      creator: text(candidate.creator),
      sourceUrl: sourceUrl(candidate),
      sourceVideoId: sourceVideoId(candidate),
      missionScore: candidateMissionScore(candidate),
      sourceDevBuildGrade: text(candidate.sourceDevBuildGrade).toUpperCase(),
      sourceTrustLabel: text(candidate.sourceTrustLabel),
    }))
}

const VIBE_CODING_OPERATOR_PILLARS = [
  {
    id: 'context-pack-first',
    label: 'Context Pack First',
    terms: ['context', 'file', 'directory', 'system rules', '@', 'handoff', 'prompt', 'ai studio payload'],
    operatorRule: 'Before a serious build, give the builder the mission, source evidence, current repo state, constraints, and exact proof target.',
    systemEffect: 'Less guessing, fewer mixed-up plans, and better continuity across Codex/Claude sessions.',
  },
  {
    id: 'sop-checklist-runner',
    label: 'SOP / Checklist Runner',
    terms: ['checklist', 'workflow', 'sop', 'markdown', 'approval gate', 'step-by-step', 'agentic workflow'],
    operatorRule: 'Turn repeatable build/review behavior into runnable checklists instead of relying on chat memory.',
    systemEffect: 'Steve can direct work at the workflow level while the system enforces the steps.',
  },
  {
    id: 'quality-security-gates',
    label: 'Quality / Security Gates',
    terms: ['security', 'audit', 'secrets', 'rls', 'vulnerable', 'dependencies', 'pre-commit', 'sast', 'middleware'],
    operatorRule: 'Every agent-built feature needs focused proof plus security/readback checks before it is trusted.',
    systemEffect: 'Foundation stays clean while AI builders move fast.',
  },
  {
    id: 'visual-feedback-loop',
    label: 'Visual Feedback Loop',
    terms: ['visual', 'screenshot', 'wireframe', 'ui', 'design', 'layout', 'tailwind', 'annotate', 'feedback'],
    operatorRule: 'Use screenshots, references, and visual readback to steer UI work instead of describing every pixel in text.',
    systemEffect: 'Better frontend output with less Steve micromanagement.',
  },
  {
    id: 'parallel-variation-workflow',
    label: 'Parallel Variations',
    terms: ['parallel', 'variation', 'batch', 'orchestrator', 'containers', 'sequential ports', 'multiple agents'],
    operatorRule: 'When the direction is uncertain, run bounded parallel variants and choose from evidence instead of debating in chat.',
    systemEffect: 'More options, faster decisions, and less thrash.',
  },
  {
    id: 'integration-deploy-hygiene',
    label: 'Integration / Deploy Hygiene',
    terms: ['supabase', 'stripe', 'webhook', 'api key', 'deployment', 'redirect', 'migration', 'schema', 'billing'],
    operatorRule: 'Treat integrations, auth, env, billing, and deployment as governed checklists with proof, not “it probably works.”',
    systemEffect: 'Fewer production surprises when AI-generated apps touch real services.',
  },
]

function buildVibeCodingOperatorPlaybook(definition = {}, candidates = []) {
  if (definition.id !== 'vibe-coding-system-for-steve') return null
  const sortedCandidates = list(candidates)
    .sort((left, right) => candidateMissionScore(right) - candidateMissionScore(left) || number(left.rank, 9999) - number(right.rank, 9999))
  const pillars = VIBE_CODING_OPERATOR_PILLARS.map(pillar => {
    const supportingSignals = sortedCandidates
      .map(candidate => ({
        candidate,
        hitScore: countTermHits(candidateText(candidate), pillar.terms),
      }))
      .filter(item => item.hitScore > 0)
      .sort((left, right) => number(right.hitScore) - number(left.hitScore) || candidateMissionScore(right.candidate) - candidateMissionScore(left.candidate))
      .slice(0, 4)
      .map(item => ({
        title: text(item.candidate.title),
        creator: text(item.candidate.creator),
        sourceVideoId: sourceVideoId(item.candidate),
        why: text(item.candidate.whyItMatters || item.candidate.why),
        next: text(item.candidate.recommendedNextStep),
      }))
    return {
      ...pillar,
      status: supportingSignals.length ? 'source_supported' : 'needs_more_source_evidence',
      supportingSignals,
    }
  })
  const supportedPillars = pillars.filter(pillar => pillar.status === 'source_supported')
  return {
    status: supportedPillars.length ? 'ready_for_operator_review' : 'needs_source_evidence',
    title: 'Steve Vibe-Coding Upgrade Playbook',
    plainEnglish: 'This turns vibe-coding videos into a practical Steve + Codex/Claude operating system: context first, checklist-driven builds, proof gates, visual feedback, bounded parallel variants, and clean integration/deploy habits.',
    sourceSignalCount: sortedCandidates.length,
    supportedPillarCount: supportedPillars.length,
    pillars,
    codexRules: [
      'Start durable work from a context pack: mission, source evidence, current repo state, constraints, and proof target.',
      'Convert repeatable prompts into scripts, checks, SOPs, or backlog rules so they do not live only in chat.',
      'Use visual/readback/security proof before closeout when the build touches UI, auth, integrations, extraction, or source truth.',
      'Keep Director Top 3 and Scoper promotion review-only until Steve/Codex explicitly choose the work.',
    ],
    nextReview: 'Compare these source-supported rules against AGENTS.md, Dev Hub checks, and the current Foundation build workflow before making them permanent doctrine.',
  }
}

function buildOpportunity(definition = {}, candidates = [], sourceRows = [], actionRequiredItems = [], index = 0) {
  const sortedCandidates = [...candidates]
    .sort((left, right) =>
      number(right.opportunityMatchScore) - number(left.opportunityMatchScore) ||
      candidateMissionScore(right) - candidateMissionScore(left) ||
      number(left.rank, 9999) - number(right.rank, 9999)
    )
  const support = sourceSupport(sortedCandidates, sourceRows, actionRequiredItems)
  const lensScores = mergeLensScores(definition, sortedCandidates)
  const topSignalTitles = sortedCandidates.slice(0, 3).map(candidate => candidate.title).filter(Boolean)
  const operatorPlaybook = buildVibeCodingOperatorPlaybook(definition, sortedCandidates)
  return {
    opportunityId: `vision-opportunity:${definition.id}`,
    definitionId: definition.id,
    rank: index + 1,
    title: definition.title,
    technicalClusterLabel: topSignalTitles.join(' + '),
    simpleTitle: true,
    status: 'review_packet_only_no_auto_build',
    plainEnglish: definition.plainEnglish,
    whyForAios: definition.plainEnglish,
    nextMove: definition.nextMove,
    score: opportunityScore(definition, sortedCandidates, support),
    lensScores,
    strongestLens: lensScores[0] || null,
    support,
    supportSummary: `${support.counts.creators} creators · ${support.counts.videos} videos · ${sortedCandidates.length} idea signals · ${support.counts.links} links/resources`,
    importantSignals: importantSignals(sortedCandidates),
    operatorPlaybook,
    candidateCount: sortedCandidates.length,
    topCandidateRanks: sortedCandidates.slice(0, 8).map(candidate => number(candidate.rank)).filter(Boolean),
    noAutoBacklogPromotion: true,
  }
}

function lensScoreLookup(opportunity = {}) {
  return new Map(list(opportunity.lensScores).map(item => [text(item.lensId), number(item.score)]))
}

function weightedLensBase(opportunity = {}, lensPack = {}) {
  const scoreByLens = lensScoreLookup(opportunity)
  let weightedTotal = 0
  let weightTotal = 0
  for (const [lensId, weightValue] of Object.entries(lensPack.weights || {})) {
    const weight = number(weightValue)
    const score = scoreByLens.get(lensId)
    if (!weight || !Number.isFinite(score)) continue
    weightedTotal += score * weight
    weightTotal += weight
  }
  return weightTotal ? weightedTotal / weightTotal : number(opportunity.score)
}

function priorityLensSupportBoost(opportunity = {}) {
  const counts = opportunity.support?.counts || {}
  return Math.min(9,
    number(counts.creators) * 0.2 +
      number(counts.videos) * 0.025 +
      number(counts.links) * 0.16 +
      number(opportunity.candidateCount) * 0.02
  )
}

function priorityLensScore(opportunity = {}, lensPack = {}) {
  const definitionId = opportunityDefinitionId(opportunity)
  const opportunityBoost = number(lensPack.opportunityBoosts?.[definitionId])
  return clampScore(
    weightedLensBase(opportunity, lensPack) * 0.72 +
      number(opportunity.score) * 0.16 +
      priorityLensSupportBoost(opportunity) +
      opportunityBoost
  )
}

function strongestWeightedLens(opportunity = {}, lensPack = {}) {
  const weightMap = lensPack.weights || {}
  return list(opportunity.lensScores)
    .filter(item => number(weightMap[item.lensId]) > 0)
    .sort((left, right) => (number(right.score) * number(weightMap[right.lensId])) - (number(left.score) * number(weightMap[left.lensId])))
    .slice(0, 2)
}

function priorityLensReason(opportunity = {}, lensPack = {}) {
  const weighted = strongestWeightedLens(opportunity, lensPack)
  const weightedCopy = weighted.length
    ? weighted.map(item => `${item.label || item.lensId} ${clampScore(item.score)}`).join(' and ')
    : 'the selected lens'
  return `${lensPack.label} ranks this because it is strong for ${weightedCopy}; ${opportunity.supportSummary || 'source support still needs readback'}.`
}

function priorityLensRecommendation(lensPack = {}, rank = 0) {
  if (rank === 1 && ['current-sprint', 'god-mode-extractors', 'foundation-reliability'].includes(lensPack.id)) {
    return {
      status: 'review_for_scoper_packet',
      label: 'Review for Scoper packet',
      plainEnglish: 'Strong enough to prepare a Scoper packet, but still needs Steve/Codex approval.',
    }
  }
  if (rank <= 3) {
    return {
      status: 'strong_review_candidate',
      label: 'Strong review candidate',
      plainEnglish: 'Worth reviewing against current work before any Scoper handoff.',
    }
  }
  return {
    status: 'supporting_evidence_or_watch_later',
    label: 'Supporting evidence / watch later',
    plainEnglish: 'Keep as ranked evidence; do not promote without a more specific operator decision.',
  }
}

function directorLensPoints(rank = 0, score = 0) {
  const normalizedRank = number(rank, 999)
  const rankPoints = normalizedRank === 1
    ? 22
    : normalizedRank <= 3
      ? 16
      : normalizedRank <= 5
        ? 9
        : normalizedRank <= 8
          ? 4
          : 0
  return rankPoints + Math.max(0, Math.min(12, number(score) / 9))
}

function buildDirectorWhySelected(candidate = {}, totalLensCount = 0) {
  const support = candidate.lensSupport || {}
  const top3 = list(support.top3LensLabels)
  const top1 = list(support.top1LensLabels)
  const top5 = list(support.top5LensLabels)
  const lead = top1.length
    ? `It is #1 in ${top1.join(', ')}`
    : `It lands in the top 3 for ${top3.join(', ') || 'multiple lenses'}`
  return `${lead}; it is top 3 in ${top3.length}/${totalLensCount} lenses and top 5 in ${top5.length}/${totalLensCount}. It also has ${candidate.supportSummary || 'source evidence'} behind it, so it is not a single-video hunch.`
}

function buildDirectorWhyBeatAlternatives(candidate = {}, nearMisses = []) {
  const next = nearMisses[0]
  if (!next) {
    return 'No stronger alternative is currently visible across the lens router.'
  }
  const candidateTop3 = list(candidate.lensSupport?.top3LensLabels).length
  const nextTop3 = list(next.lensSupport?.top3LensLabels).length
  const candidateScore = number(candidate.directorScore)
  const nextScore = number(next.directorScore)
  return `${candidate.title} stays ahead because it has stronger combined lens support (${candidateScore} vs ${nextScore}) and top-3 coverage (${candidateTop3} vs ${nextTop3}) while matching the current objective more directly than ${next.title}.`
}

function buildDirectorTop3ScoperReview({
  generatedAt = new Date().toISOString(),
  lenses = [],
  context = {},
} = {}) {
  const totalLensCount = list(lenses).length
  const byOpportunity = new Map()
  for (const lens of list(lenses)) {
    for (const opportunity of list(lens.opportunities)) {
      const opportunityId = text(opportunity.opportunityId)
      if (!opportunityId) continue
      const entry = byOpportunity.get(opportunityId) || {
        ...opportunity,
        lensPlacements: [],
        directorRawPoints: 0,
      }
      const placement = {
        lensId: text(lens.lensId),
        label: text(lens.label),
        rank: number(opportunity.priorityRank || opportunity.rank),
        score: number(opportunity.priorityScore || opportunity.score),
        question: text(lens.question),
      }
      entry.lensPlacements.push(placement)
      entry.directorRawPoints += directorLensPoints(placement.rank, placement.score)
      byOpportunity.set(opportunityId, entry)
    }
  }

  const ranked = [...byOpportunity.values()]
    .map(opportunity => {
      const placements = list(opportunity.lensPlacements)
        .sort((left, right) => number(left.rank) - number(right.rank) || text(left.label).localeCompare(text(right.label)))
      const top1 = placements.filter(item => number(item.rank) === 1)
      const top3 = placements.filter(item => number(item.rank) <= 3)
      const top5 = placements.filter(item => number(item.rank) <= 5)
      const averageScore = placements.length
        ? placements.reduce((sum, item) => sum + number(item.score), 0) / placements.length
        : number(opportunity.score)
      const supportScore = Math.min(100,
        number(opportunity.directorRawPoints) +
          top1.length * 5 +
          top3.length * 3 +
          Math.min(10, number(opportunity.candidateCount) / 8)
      )
      return {
        ...opportunity,
        lensPlacements: placements,
        lensSupport: {
          lensCount: totalLensCount,
          top1Count: top1.length,
          top3Count: top3.length,
          top5Count: top5.length,
          top1LensLabels: top1.map(item => item.label),
          top3LensLabels: top3.map(item => item.label),
          top5LensLabels: top5.map(item => item.label),
        },
        directorScore: clampScore(averageScore * 0.36 + supportScore * 0.48 + number(opportunity.score) * 0.16),
      }
    })
    .sort((left, right) =>
      number(right.directorScore) - number(left.directorScore) ||
      number(right.lensSupport?.top1Count) - number(left.lensSupport?.top1Count) ||
      number(right.lensSupport?.top3Count) - number(left.lensSupport?.top3Count) ||
      number(right.candidateCount) - number(left.candidateCount) ||
      left.title.localeCompare(right.title)
    )

  const candidates = ranked.slice(0, 3).map((candidate, index) => {
    const nearMisses = ranked.filter(item => item.opportunityId !== candidate.opportunityId).slice(index + 1, index + 4)
    return {
      ...candidate,
      directorRank: index + 1,
      whySelectedForScoper: buildDirectorWhySelected(candidate, totalLensCount),
      whyThisBeatsAlternatives: buildDirectorWhyBeatAlternatives(candidate, nearMisses),
      scoperPromotion: {
        status: 'draft_candidate_no_auto_promotion',
        label: 'Draft Scoper candidate',
        ownerNow: context?.scoperOwnership?.now || 'Steve + Codex choose for now.',
        ownerLater: context?.scoperOwnership?.later || 'Dev Director proposes; Portfolio/Scrum Master dedupes; approval gate promotes.',
        boundary: 'Review-only. This does not create a Scoper card, backlog item, worker run, purchase, login, or external action.',
      },
    }
  })
  const nearMisses = ranked.slice(3, 8).map((candidate, index) => ({
    opportunityId: candidate.opportunityId,
    rank: index + 4,
    title: candidate.title,
    directorScore: candidate.directorScore,
    whyMissedTop3: `Strong evidence, but it had less cross-lens support than the Top 3: top 3 in ${candidate.lensSupport?.top3Count || 0}/${totalLensCount} lenses.`,
  }))

  return {
    status: 'ready',
    generatedAt,
    title: 'Director Top 3 Scoper Review',
    plainEnglish: 'The Director-style promotion review compares every priority lens, dedupes by outcome, and drafts the Top 3 Scoper candidates with explicit reasons. Steve/Codex still choose what actually goes to Scoper.',
    selectionRule: 'All lenses vote through rank plus score. Top-1/top-3/top-5 placements matter, raw source support still matters, and overlapping ideas stay merged under one outcome.',
    candidateCount: candidates.length,
    lensCount: totalLensCount,
    candidates,
    nearMisses,
    noAutoScoperPromotion: true,
    noAutoBacklogPromotion: true,
    externalWrites: false,
  }
}

function buildPriorityObjectiveContext({
  activeSprint = {},
  youtubeSourceIntelligence = {},
  youtubeCreatorGodModeCatchup = {},
  godModeExtractorParity = {},
  sourceFamilyGodModeMaturity = {},
} = {}) {
  const activeCard = activeSprint?.activeBlocker || activeSprint?.activeCard || null
  const catchupSummary = youtubeCreatorGodModeCatchup.summary || {}
  const youtubeSummary = youtubeSourceIntelligence.summary || {}
  const handoffCounts = youtubeSourceIntelligence.sourceGodModeHandoffQueue?.counts || {}
  const paritySummary = godModeExtractorParity.summary || {}
  const maturitySummary = sourceFamilyGodModeMaturity.summary || {}
  const knownGaps = []

  if (number(catchupSummary.baselineIncompleteCount) > 0) knownGaps.push(`${catchupSummary.baselineIncompleteCount} creator baseline still needs completion.`)
  if (number(handoffCounts.runnableRows) > 0) knownGaps.push(`${handoffCounts.runnableRows} public/free source-browser rows are ready for a downstream worker.`)
  if (number(youtubeSummary.deepVisualMissedByStandardCount) > 0) knownGaps.push(`${youtubeSummary.deepVisualMissedByStandardCount} deep-visual notes prove richer extraction matters.`)
  if (number(catchupSummary.sourcePacketActionCount) > 0) knownGaps.push(`${catchupSummary.sourcePacketActionCount} YouTube-discovered source actions still need source-specific lanes.`)
  if (number(paritySummary.handsNotProvenCount) > 0) knownGaps.push(`${paritySummary.handsNotProvenCount} source families still lack proven Hands.`)
  if (number(maturitySummary.familyCount) > 0 && number(maturitySummary.claimsGodModeCount) === 0) knownGaps.push('No source family is allowed to claim full God Mode yet.')
  if (!knownGaps.length) knownGaps.push('No live blocker was found; use the selected lens to choose the next improvement.')

  return {
    currentObjective: 'Use source-backed intelligence to choose the next Dev/Foundation move without losing the raw evidence.',
    existingSystemPosture: 'YouTube extraction, deep visual review, source grading, and Dev Director synthesis are working; downstream source-browser/community/repo/newsletter workers are still next-layer work.',
    longTermVision: 'Build an agentic OS for the team: agents that remember context, browse and act with approved boundaries, extract source value, and help Steve/BCrew move faster.',
    activeCardId: text(activeCard?.cardId || activeSprint?.sprint?.activeBlockerCardId),
    activeCardTitle: text(activeCard?.title || activeCard?.summary),
    knownGaps: knownGaps.slice(0, 8),
    scoperOwnership: {
      now: 'Steve + Codex choose Scoper candidates from the ranked review surface.',
      later: 'Dev Director proposes candidates, Portfolio/Scrum Master dedupes and merges them, then an approval gate promotes.',
      boundary: 'No lens auto-creates backlog cards, starts workers, buys tools, logs in, or sends messages.',
    },
  }
}

function buildPriorityLensRouter({
  generatedAt = new Date().toISOString(),
  opportunities = [],
  context = {},
} = {}) {
  const lenses = PRIORITY_LENS_PACKS.map(lensPack => {
    const ranked = list(opportunities)
      .map(opportunity => ({
        ...opportunity,
        selectedPriorityLensId: lensPack.id,
        selectedPriorityLensLabel: lensPack.label,
        priorityScore: priorityLensScore(opportunity, lensPack),
      }))
      .sort((left, right) =>
        number(right.priorityScore) - number(left.priorityScore) ||
        number(right.score) - number(left.score) ||
        number(right.candidateCount) - number(left.candidateCount) ||
        left.title.localeCompare(right.title)
      )
      .map((opportunity, index) => ({
        ...opportunity,
        priorityRank: index + 1,
        priorityReason: priorityLensReason(opportunity, lensPack),
        scoperRecommendation: priorityLensRecommendation(lensPack, index + 1),
      }))

    return {
      lensId: lensPack.id,
      label: lensPack.label,
      question: lensPack.question,
      plainEnglish: lensPack.plainEnglish,
      defaultSelected: lensPack.id === 'current-sprint',
      opportunityCount: ranked.length,
      topOpportunityId: ranked[0]?.opportunityId || '',
      opportunities: ranked,
    }
  })
  const directorTop3ScoperReview = buildDirectorTop3ScoperReview({
    generatedAt,
    lenses,
    context,
  })

  return {
    status: 'ready',
    generatedAt,
    defaultLensId: 'current-sprint',
    title: 'Priority Lens Router',
    plainEnglish: 'Same raw evidence, different ranked views depending on the current objective, system gaps, and long-term AIOS vision.',
    context,
    lenses,
    directorTop3ScoperReview,
    noAutoScoperPromotion: true,
    noAutoBacklogPromotion: true,
    externalWrites: false,
  }
}

export function buildDevOpportunityVisionLensReview({
  generatedAt = new Date().toISOString(),
  rankedCandidates = [],
  sourceRows = [],
  actionRequiredItems = [],
  activeSprint = {},
  youtubeSourceIntelligence = {},
  youtubeCreatorGodModeCatchup = {},
  godModeExtractorParity = {},
  sourceFamilyGodModeMaturity = {},
  maxCandidates = 5000,
} = {}) {
  const buckets = new Map()
  let unmatchedCount = 0
  const inputCandidates = list(rankedCandidates)
    .filter(candidate => candidate && typeof candidate === 'object')
    .sort((left, right) => number(left.rank, 9999) - number(right.rank, 9999))
    .slice(0, maxCandidates)

  for (const candidate of inputCandidates) {
    const best = bestDefinitionForCandidate(candidate)
    if (!best) {
      unmatchedCount += 1
      continue
    }
    const bucket = buckets.get(best.definition.id) || {
      definition: best.definition,
      candidates: [],
      matchScore: 0,
    }
    bucket.candidates.push({ ...candidate, opportunityMatchScore: best.score })
    bucket.matchScore += best.score
    buckets.set(best.definition.id, bucket)
  }

  const opportunities = [...buckets.values()]
    .map((bucket, index) => buildOpportunity(bucket.definition, bucket.candidates, sourceRows, actionRequiredItems, index))
    .filter(opportunity => opportunity.candidateCount > 0)
    .sort((left, right) => number(right.score) - number(left.score) || number(right.candidateCount) - number(left.candidateCount) || left.title.localeCompare(right.title))
    .map((opportunity, index) => ({ ...opportunity, rank: index + 1 }))
  const priorityLensRouter = buildPriorityLensRouter({
    generatedAt,
    opportunities,
    context: buildPriorityObjectiveContext({
      activeSprint,
      youtubeSourceIntelligence,
      youtubeCreatorGodModeCatchup,
      godModeExtractorParity,
      sourceFamilyGodModeMaturity,
    }),
  })

  return {
    status: 'ready',
    generatedAt,
    model: DEV_OPPORTUNITY_VISION_LENS_ID,
    title: 'Vision Opportunity Review',
    plainEnglish: 'Raw idea signals are grouped into simple outcome-based opportunities for Steve/Codex review. Original ideas and source evidence stay intact.',
    inputCandidateCount: inputCandidates.length,
    matchedCandidateCount: inputCandidates.length - unmatchedCount,
    unmatchedCandidateCount: unmatchedCount,
    opportunityCount: opportunities.length,
    opportunities,
    priorityLensRouter,
    lensLabels: LENS_LABELS,
    noAutoBacklogPromotion: true,
    externalWrites: false,
  }
}

export function buildDevOpportunityVisionLensDogfood() {
  const candidates = [
    {
      rank: 1,
      title: 'Agentic Browser Controller',
      why: 'Lets an agent click and navigate web apps with an approved browser session.',
      recommendedNextStep: 'Build a bounded browser session runner.',
      creator: 'Browser Builder',
      creatorId: 'browser-builder',
      sourceVideoId: 'browser123',
      sourceUrl: 'https://www.youtube.com/watch?v=browser123',
      missionScore: 94,
      sourceDevBuildGrade: 'S',
    },
    {
      rank: 2,
      title: 'Persistent Browser Session MCP Connector',
      why: 'Keeps login/session state available for approved source workers.',
      recommendedNextStep: 'Create a session broker with stop rules.',
      creator: 'Session Builder',
      creatorId: 'session-builder',
      sourceVideoId: 'session123',
      sourceUrl: 'https://www.youtube.com/watch?v=session123',
      missionScore: 88,
      sourceDevBuildGrade: 'A',
    },
    {
      rank: 3,
      title: 'Social DM Automation Hub',
      why: 'Classifies contacts, writes outreach, and escalates replies.',
      recommendedNextStep: 'Keep sends approval-gated while drafting like Steve.',
      creator: 'Growth Builder',
      creatorId: 'growth-builder',
      sourceVideoId: 'growth123',
      sourceUrl: 'https://www.youtube.com/watch?v=growth123',
      missionScore: 82,
      sourceDevBuildGrade: 'A',
    },
    {
      rank: 4,
      title: 'Context Memory Registry',
      why: 'Gives agents durable context and handoff memory.',
      recommendedNextStep: 'Design source-backed memory cards.',
      creator: 'Memory Builder',
      creatorId: 'memory-builder',
      sourceVideoId: 'memory123',
      sourceUrl: 'https://www.youtube.com/watch?v=memory123',
      missionScore: 91,
      sourceDevBuildGrade: 'S',
    },
    {
      rank: 5,
      title: 'Vibe Coding Full Course Operator Workflow',
      why: 'Shows how Steve can use Claude Code/Codex-style coding agents with better specs, prompts, reviews, commits, and guardrails instead of guessing.',
      recommendedNextStep: 'Extract the coding workflow into a Steve-facing playbook and builder checks.',
      creator: 'Nick Saraev',
      creatorId: 'nick-saraev',
      sourceVideoId: 'gcuR_-rzlDw',
      sourceUrl: 'https://www.youtube.com/watch?v=gcuR_-rzlDw',
      missionScore: 89,
      sourceDevBuildGrade: 'S',
    },
    {
      rank: 6,
      title: 'Calendar Color Archive',
      why: 'Stores unrelated calendar color metadata for readback.',
      recommendedNextStep: 'Keep as provenance-only readback.',
      creator: 'Provenance Test',
      creatorId: 'provenance-test',
      sourceVideoId: 'provenance-only123',
      sourceUrl: 'https://www.youtube.com/watch?v=provenance-only123',
      sourceTitle: 'VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)',
      resourceLinkDispositions: ['Blocked: source-packet approval required for a login community.'],
      missionScore: 91,
      sourceDevBuildGrade: 'S',
    },
  ]
  const review = buildDevOpportunityVisionLensReview({
    rankedCandidates: candidates,
    sourceRows: [
      { url: 'https://github.com/example/browser-agent', host: 'github.com', label: 'Public code repos', status: 'ready', sourceVideoIds: ['browser123', 'session123'] },
      { url: 'https://linkedin.com', host: 'linkedin.com', label: 'Public pages/resources', status: 'ready', sourceVideoIds: ['growth123'] },
      { url: 'https://www.youtube.com/watch?v=gcuR_-rzlDw', host: 'youtube.com', label: 'Vibe coding course', status: 'watch/deep-review', sourceVideoIds: ['gcuR_-rzlDw'] },
    ],
    actionRequiredItems: [],
  })
  const browserOpportunity = review.opportunities.find(item => item.opportunityId.endsWith('browser-agent-that-can-work'))
  const conversationOpportunity = review.opportunities.find(item => item.opportunityId.endsWith('assistant-that-handles-conversations-like-steve') || item.opportunityId.endsWith('ai-recruiting-and-growth-engine'))
  const memoryOpportunity = review.opportunities.find(item => item.opportunityId.endsWith('memory-system-that-keeps-agents-sharp'))
  const currentSprintLens = review.priorityLensRouter?.lenses?.find(item => item.lensId === 'current-sprint')
  const vibeCodingLens = review.priorityLensRouter?.lenses?.find(item => item.lensId === 'vibe-coding-operator')
  const marketingLens = review.priorityLensRouter?.lenses?.find(item => item.lensId === 'marketing-recruiting')
  const vibeCodingOpportunity = review.opportunities.find(item => item.opportunityId.endsWith('vibe-coding-system-for-steve'))
  const provenanceOnlyMatched = review.opportunities
    .some(opportunity => list(opportunity.support?.videos).some(video => video.videoId === 'provenance-only123'))
  const directorScoperReview = review.priorityLensRouter?.directorTop3ScoperReview
  const checks = [
    {
      ok: Boolean(browserOpportunity) && browserOpportunity.title === 'Browser Agent That Can Work' && browserOpportunity.support.counts.creators >= 2,
      check: 'browser/session ideas merge under a simple outcome title',
      detail: browserOpportunity?.supportSummary || 'missing',
    },
    {
      ok: Boolean(conversationOpportunity),
      check: 'outreach/conversation ideas map to automation/recruiting opportunity',
      detail: conversationOpportunity?.title || 'missing',
    },
    {
      ok: Boolean(memoryOpportunity) && memoryOpportunity.strongestLens?.lensId === 'memoryContext',
      check: 'memory ideas keep the memory/context lens visible',
      detail: memoryOpportunity?.strongestLens?.label || 'missing',
    },
    {
      ok: currentSprintLens?.opportunities?.[0]?.title === 'Browser Agent That Can Work',
      check: 'current sprint lens can rank browser/runtime ahead of generic opportunity order',
      detail: currentSprintLens?.opportunities?.[0]?.title || 'missing',
    },
    {
      ok: vibeCodingLens?.opportunities?.[0]?.title === 'Vibe Coding System For Steve' &&
        Boolean(vibeCodingOpportunity) &&
        vibeCodingOpportunity?.operatorPlaybook?.status === 'ready_for_operator_review' &&
        list(vibeCodingOpportunity?.operatorPlaybook?.pillars).some(pillar => pillar.status === 'source_supported'),
      check: 'vibe coding lens ranks Steve/operator coding workflow as its own opportunity',
      detail: `${vibeCodingLens?.opportunities?.[0]?.title || 'missing'} / ${vibeCodingOpportunity?.operatorPlaybook?.supportedPillarCount || 0} playbook pillars`,
    },
    {
      ok: provenanceOnlyMatched === false,
      check: 'source title and link-disposition provenance do not force opportunity classification',
      detail: provenanceOnlyMatched ? 'provenance-only candidate matched' : 'provenance-only candidate stayed unmatched',
    },
    {
      ok: ['Assistant That Handles Conversations Like Steve', 'AI Recruiting And Growth Engine'].includes(marketingLens?.opportunities?.[0]?.title),
      check: 'marketing lens can rank conversation/recruiting work differently from current sprint',
      detail: marketingLens?.opportunities?.[0]?.title || 'missing',
    },
    {
      ok: directorScoperReview?.status === 'ready' &&
        directorScoperReview?.candidates?.length === 3 &&
        directorScoperReview.candidates.every(candidate => candidate.whySelectedForScoper && candidate.whyThisBeatsAlternatives && candidate.scoperPromotion?.status === 'draft_candidate_no_auto_promotion'),
      check: 'director top three scoper review considers all lenses and explains why candidates got through',
      detail: `${directorScoperReview?.candidates?.length || 0} candidates / ${directorScoperReview?.lensCount || 0} lenses`,
    },
    {
      ok: review.noAutoBacklogPromotion === true && review.priorityLensRouter?.noAutoScoperPromotion === true && review.externalWrites === false,
      check: 'vision lens and priority router are review-only with no external/write action',
      detail: `${review.noAutoBacklogPromotion}/${review.priorityLensRouter?.noAutoScoperPromotion}/${review.externalWrites}`,
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    review,
  }
}
