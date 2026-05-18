import {
  CREATOR_WATCHLIST_SOURCE_ID,
  buildCreatorWatchlistSnapshot,
  validateCreatorWatchlistEntry,
} from './build-intel-watchlist.js'

export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID = 'BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001'
export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY = 'build-intel-creator-watchlist-expansion-v1'
export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PLAN_PATH = 'docs/process/build-intel-creator-watchlist-expansion-001-plan.md'
export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_APPROVAL_PATH = 'docs/process/approvals/BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001.json'
export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SCRIPT_PATH = 'scripts/process-build-intel-creator-watchlist-expansion-check.mjs'
export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-build-intel-creator-watchlist-expansion-closeout.md'
export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_SPRINT_ID = 'build-intel-creator-watchlist-expansion-2026-05-18'
export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID = 'COURSE-SOURCE-AUTH-BOUNDARY-001'

export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CHANGED_FILES = [
  'lib/build-intel-watchlist.js',
  'lib/build-intel-creator-watchlist-expansion.js',
  'scripts/process-build-intel-creator-watchlist-expansion-check.mjs',
  'scripts/process-build-intel-intake-check.mjs',
  'lib/foundation-verifier-control-loop.js',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PLAN_PATH,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_APPROVAL_PATH,
  BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_PATH,
  'package.json',
]

export const BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_PROOF_COMMANDS = [
  'node --check lib/build-intel-watchlist.js lib/build-intel-creator-watchlist-expansion.js lib/foundation-verifier-control-loop.js lib/foundation-intelligence-audit-verifier.js scripts/process-build-intel-creator-watchlist-expansion-check.mjs scripts/foundation-verify.mjs',
  'npm run process:build-intel-creator-watchlist-expansion-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001.json --closeoutKey=build-intel-creator-watchlist-expansion-v1 --commitRef=HEAD',
]

export const REQUIRED_BUILD_INTEL_CREATOR_SOURCE_IDS = [
  'dream-labs-ai',
  'nate-herk',
  'chase-ai',
  'everyday-ai-jordan-wilson',
  'mark-kashef',
  'matt-pocock-total-typescript',
  'andrej-karpathy',
  'aaron-bitwise',
  'openhuman-tinyhumansai',
]

export const BUILD_INTEL_CREATOR_WATCHLIST_SOURCE_BOUNDARIES = [
  {
    creatorId: 'dream-labs-ai',
    requiredSourceTypes: ['public_site', 'public_youtube_video'],
    posture: 'public lookup-backed; extraction still pending operator approval',
  },
  {
    creatorId: 'nate-herk',
    requiredSourceTypes: ['public_youtube_channel', 'public_site'],
    posture: 'mixed public and paid/community; only public metadata is in scope',
  },
  {
    creatorId: 'chase-ai',
    requiredSourceTypes: ['public_youtube_channel', 'public_site'],
    posture: 'public lookup-backed; extraction still pending operator approval',
  },
  {
    creatorId: 'everyday-ai-jordan-wilson',
    requiredSourceTypes: ['public_site', 'public_youtube_channel', 'public_podcast'],
    posture: 'public lookup-backed news and operator education source',
  },
  {
    creatorId: 'mark-kashef',
    requiredSourceTypes: ['public_youtube_channel', 'public_profile', 'public_site', 'paid_or_auth_community'],
    posture: 'mixed public and paid Skool/community; paid/auth content blocked until approval',
  },
  {
    creatorId: 'matt-pocock-total-typescript',
    requiredSourceTypes: ['public_site_with_paid_course_boundary', 'public_github_profile', 'public_youtube_channel'],
    posture: 'mixed public and paid course; paid course extraction blocked until approval',
  },
  {
    creatorId: 'andrej-karpathy',
    requiredSourceTypes: ['public_gist', 'public_github_profile', 'public_youtube_channel'],
    posture: 'public original-source material for LLM Wiki and AI engineering',
  },
  {
    creatorId: 'aaron-bitwise',
    requiredSourceTypes: ['public_youtube_channel'],
    posture: 'public lookup-backed; low-code/business AI workflow source',
  },
  {
    creatorId: 'openhuman-tinyhumansai',
    requiredSourceTypes: ['public_github_repo', 'public_site'],
    posture: 'public open-source agent/runtime source; no install or execution in this card',
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeUrl(value) {
  return normalizeText(value).replace(/\/$/, '')
}

function validUrl(value) {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function listSourceRefs(entry = {}) {
  return entry && Array.isArray(entry.sourceRefs) ? entry.sourceRefs : []
}

function buildDuplicateSummary(entries = []) {
  const creatorIds = new Map()
  const sourceKeys = new Map()
  const urls = new Map()
  for (const entry of entries) {
    const creatorId = normalizeText(entry.creatorId)
    if (creatorId) creatorIds.set(creatorId, (creatorIds.get(creatorId) || 0) + 1)
    for (const sourceRef of listSourceRefs(entry)) {
      const sourceKey = normalizeText(sourceRef.sourceKey)
      const url = normalizeUrl(sourceRef.url)
      if (sourceKey) sourceKeys.set(sourceKey, (sourceKeys.get(sourceKey) || 0) + 1)
      if (url) urls.set(url, (urls.get(url) || 0) + 1)
    }
  }
  const duplicates = map => Array.from(map.entries()).filter(([, count]) => count > 1).map(([key]) => key)
  return {
    duplicateCreatorIds: duplicates(creatorIds),
    duplicateSourceKeys: duplicates(sourceKeys),
    duplicateUrls: duplicates(urls),
  }
}

function findEntry(entries = [], creatorId) {
  return entries.find(entry => entry.creatorId === creatorId) || null
}

function missingSourceTypes(entry = {}, requiredSourceTypes = []) {
  const presentTypes = new Set(listSourceRefs(entry).map(sourceRef => sourceRef.sourceType))
  return requiredSourceTypes.filter(sourceType => !presentTypes.has(sourceType))
}

function allLookupBacked(sourceRefs = []) {
  return sourceRefs.length > 0 &&
    sourceRefs.every(sourceRef =>
      normalizeText(sourceRef.sourceKey) &&
      validUrl(sourceRef.url) &&
      /^known/i.test(normalizeText(sourceRef.lookupStatus))
    )
}

export function buildBuildIntelCreatorWatchlistExpansionSnapshot({
  entries = buildCreatorWatchlistSnapshot().entries,
  sideEffects = {},
} = {}) {
  const findings = []
  const requiredRows = REQUIRED_BUILD_INTEL_CREATOR_SOURCE_IDS.map(creatorId => {
    const boundary = BUILD_INTEL_CREATOR_WATCHLIST_SOURCE_BOUNDARIES.find(item => item.creatorId === creatorId)
    const entry = findEntry(entries, creatorId)
    const sourceRefs = listSourceRefs(entry)
    const missingTypes = entry ? missingSourceTypes(entry, boundary?.requiredSourceTypes || []) : []
    return {
      creatorId,
      displayName: entry?.displayName || null,
      priority: entry?.priority || null,
      cadence: entry?.cadence || null,
      accessBoundary: entry?.accessBoundary || null,
      posture: boundary?.posture || null,
      sourceRefCount: sourceRefs.length,
      sourceUrls: sourceRefs.map(sourceRef => sourceRef.url),
      missingTypes,
      ok: Boolean(entry) &&
        validateCreatorWatchlistEntry(entry).ok &&
        entry.sourceCategory === 'build_intel' &&
        entry.consumerLane === 'build_intel' &&
        allLookupBacked(sourceRefs) &&
        missingTypes.length === 0,
    }
  })
  const duplicateSummary = buildDuplicateSummary(entries)
  const requiredEntries = requiredRows
    .map(row => findEntry(entries, row.creatorId))
    .filter(Boolean)
  const noExtractionSideEffects = sideEffects.liveExtractionStarted !== true &&
    sideEffects.crawlStarted !== true &&
    sideEffects.transcriptsFetched !== true &&
    sideEffects.screenshotsCaptured !== true &&
    sideEffects.keyframesCaptured !== true &&
    sideEffects.modelCallsStarted !== true &&
    sideEffects.paidAuthUsed !== true &&
    sideEffects.privateAuthUsed !== true &&
    sideEffects.researchInboxWritten !== true &&
    sideEffects.atomsCreated !== true &&
    sideEffects.backlogMutatedFromExtractedContent !== true

  addFinding(findings, requiredRows.every(row => row.ok), 'required creator source rows are present and lookup-backed', requiredRows.filter(row => !row.ok).map(row => `${row.creatorId}:${row.missingTypes.join(',') || 'missing_or_unbacked'}`).join('; ') || `${requiredRows.length} rows`)
  addFinding(findings, entries.filter(entry => entry.sourceCategory === 'build_intel').length >= 29, 'Build Intel watchlist has expanded baseline', `${entries.filter(entry => entry.sourceCategory === 'build_intel').length} entries`)
  addFinding(findings, duplicateSummary.duplicateCreatorIds.length === 0, 'creator IDs are unique', duplicateSummary.duplicateCreatorIds.join(', ') || 'unique')
  addFinding(findings, duplicateSummary.duplicateSourceKeys.length === 0, 'source keys are unique', duplicateSummary.duplicateSourceKeys.join(', ') || 'unique')
  addFinding(findings, duplicateSummary.duplicateUrls.length === 0, 'source URLs are unique across source refs', duplicateSummary.duplicateUrls.join(', ') || 'unique')
  addFinding(findings, requiredEntries.every(entry => ['P0', 'P1'].includes(entry.priority) && normalizeText(entry.cadence)), 'required creators have priority and cadence', requiredEntries.map(entry => `${entry.creatorId}:${entry.priority}/${entry.cadence}`).join(', '))
  addFinding(findings, requiredEntries.every(entry => normalizeText(entry.accessBoundary)), 'required creators classify public/private/auth posture', requiredEntries.map(entry => `${entry.creatorId}:${entry.accessBoundary}`).join(', '))
  addFinding(findings, requiredEntries.every(entry => entry.approvedForExtractionThisSprint === false), 'required creators are not extraction-approved this sprint', requiredEntries.filter(entry => entry.approvedForExtractionThisSprint !== false).map(entry => entry.creatorId).join(', ') || 'blocked')
  addFinding(findings, noExtractionSideEffects, 'no crawl/extraction/model/output side effects started', JSON.stringify(sideEffects))

  return {
    ok: findings.every(finding => finding.ok),
    status: findings.every(finding => finding.ok) ? 'ready' : 'risk',
    cardId: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID,
    closeoutKey: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY,
    sourceId: CREATOR_WATCHLIST_SOURCE_ID,
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    extractionStarted: sideEffects.liveExtractionStarted === true || sideEffects.crawlStarted === true,
    modelCallsStarted: sideEffects.modelCallsStarted === true,
    paidAuthUsed: sideEffects.paidAuthUsed === true,
    privateAuthUsed: sideEffects.privateAuthUsed === true,
    researchInboxWritten: sideEffects.researchInboxWritten === true,
    atomsCreated: sideEffects.atomsCreated === true ? 1 : 0,
    requiredRows,
    duplicateSummary,
    sourceBoundaries: BUILD_INTEL_CREATOR_WATCHLIST_SOURCE_BOUNDARIES,
    summary: {
      requiredCreatorCount: REQUIRED_BUILD_INTEL_CREATOR_SOURCE_IDS.length,
      requiredReadyCount: requiredRows.filter(row => row.ok).length,
      buildIntelCount: entries.filter(entry => entry.sourceCategory === 'build_intel').length,
      mixedOrPaidBoundaryCount: entries.filter(entry => normalizeText(entry.accessBoundary).includes('paid_authorized_required')).length,
      totalLookupBackedUrls: requiredRows.reduce((sum, row) => sum + row.sourceUrls.length, 0),
    },
    recommendedNext: BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID,
    findings,
    failures: findings.filter(finding => !finding.ok),
  }
}

function cloneEntries(entries = buildCreatorWatchlistSnapshot().entries) {
  return entries.map(entry => ({
    ...entry,
    platforms: (entry.platforms || []).map(platform => ({ ...platform })),
    sourceRefs: listSourceRefs(entry).map(sourceRef => ({ ...sourceRef })),
  }))
}

export function buildBuildIntelCreatorWatchlistExpansionDogfoodProof() {
  const baseEntries = cloneEntries()
  const healthy = buildBuildIntelCreatorWatchlistExpansionSnapshot({ entries: baseEntries })
  const missingRequired = buildBuildIntelCreatorWatchlistExpansionSnapshot({
    entries: baseEntries.filter(entry => entry.creatorId !== 'openhuman-tinyhumansai'),
  })
  const missingUrlEntries = cloneEntries(baseEntries)
  const everydayAi = findEntry(missingUrlEntries, 'everyday-ai-jordan-wilson')
  everydayAi.sourceRefs[0].url = ''
  const missingUrl = buildBuildIntelCreatorWatchlistExpansionSnapshot({ entries: missingUrlEntries })
  const duplicateCreator = buildBuildIntelCreatorWatchlistExpansionSnapshot({
    entries: [...cloneEntries(baseEntries), { ...findEntry(baseEntries, 'nate-herk') }],
  })
  const duplicateUrlEntries = cloneEntries(baseEntries)
  findEntry(duplicateUrlEntries, 'aaron-bitwise').sourceRefs[0].url = 'https://www.youtube.com/@nateherk'
  const duplicateUrl = buildBuildIntelCreatorWatchlistExpansionSnapshot({ entries: duplicateUrlEntries })
  const extractionApprovalEntries = cloneEntries(baseEntries)
  findEntry(extractionApprovalEntries, 'mark-kashef').approvedForExtractionThisSprint = true
  const extractionApproval = buildBuildIntelCreatorWatchlistExpansionSnapshot({ entries: extractionApprovalEntries })
  const liveExtraction = buildBuildIntelCreatorWatchlistExpansionSnapshot({
    entries: cloneEntries(baseEntries),
    sideEffects: { liveExtractionStarted: true },
  })
  const paidAuth = buildBuildIntelCreatorWatchlistExpansionSnapshot({
    entries: cloneEntries(baseEntries),
    sideEffects: { paidAuthUsed: true },
  })

  return {
    ok: healthy.ok === true &&
      missingRequired.ok === false &&
      missingUrl.ok === false &&
      duplicateCreator.ok === false &&
      duplicateUrl.ok === false &&
      extractionApproval.ok === false &&
      liveExtraction.ok === false &&
      paidAuth.ok === false,
    healthy,
    rejected: {
      missingRequired,
      missingUrl,
      duplicateCreator,
      duplicateUrl,
      extractionApproval,
      liveExtraction,
      paidAuth,
    },
    dogfoodInvariant: 'Build Intel creator watchlist expansion passes only when required sources have lookup-backed URLs, unique source identity, explicit posture, no extraction approval, and no crawl/auth/model/output side effects.',
  }
}

export function renderBuildIntelCreatorWatchlistExpansionReport(snapshot = buildBuildIntelCreatorWatchlistExpansionSnapshot()) {
  const rows = snapshot.requiredRows
    .map(row => `| ${row.displayName || row.creatorId} | ${row.priority || 'missing'} | ${row.cadence || 'missing'} | ${row.accessBoundary || 'missing'} | ${row.sourceRefCount} | ${row.ok ? 'ready' : 'risk'} |`)
    .join('\n')
  const failureRows = snapshot.failures.length
    ? snapshot.failures.map(failure => `- ${failure.check}: ${failure.detail}`).join('\n')
    : '- none'
  return `# Build Intel Creator Watchlist Expansion Closeout

Card: \`${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CARD_ID}\`
Closeout key: \`${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_CLOSEOUT_KEY}\`
Source ID: \`${snapshot.sourceId}\`

## What Changed

Expanded the Build Intel creator watchlist with lookup-backed source refs for current agent engineering, memory-system, TypeScript/coding-agent, LLM Wiki, OpenHuman, and business AI workflow sources.

## Triage Table

| Creator/source | Priority | Cadence | Boundary | Source URLs | Status |
| --- | --- | --- | --- | ---: | --- |
${rows}

## Guardrails

- No crawl, transcript fetch, screenshot/keyframe capture, live extraction, model call, paid/private auth, Research Inbox write, atom creation, or backlog mutation from extracted content.
- Paid/community/course surfaces are metadata-only until \`${BUILD_INTEL_CREATOR_WATCHLIST_EXPANSION_NEXT_CARD_ID}\` defines the course/source auth boundary.
- OpenHuman is registered as a public source only; this card does not install, run, or integrate it.

## Proof Summary

- Required creators ready: ${snapshot.summary.requiredReadyCount}/${snapshot.summary.requiredCreatorCount}
- Build Intel entries: ${snapshot.summary.buildIntelCount}
- Lookup-backed source URLs: ${snapshot.summary.totalLookupBackedUrls}
- Recommended next: \`${snapshot.recommendedNext}\`

## Failures

${failureRows}
`
}
