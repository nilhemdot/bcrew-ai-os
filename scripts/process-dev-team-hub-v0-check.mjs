#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getExtractionControlSnapshot,
  listSourceCrawlItems,
} from '../lib/foundation-source-crawl-db.js'
import {
  getIntelligenceReportBundle,
  listYoutubeFullWatchReportArtifacts,
} from '../lib/foundation-intelligence-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  listLlmCalls,
} from '../lib/foundation-runtime-jobs-db.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildCreatorWatchlistSnapshot } from '../lib/build-intel-watchlist.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
  buildYoutubeCreatorDailyWatchReadSnapshot,
} from '../lib/youtube-creator-daily-watch.js'
import {
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
} from '../lib/youtube-scout-latest-video-vision.js'
import {
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
} from '../lib/youtube-build-intel-link-resource.js'
import {
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
} from '../lib/god-mode-extractor-eyes-quality-loop.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
} from '../lib/mark-kashef-god-mode-small-batch.js'
import {
  MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
} from '../lib/god-mode-youtube-end-to-end-extractor.js'
import {
  isYoutubeLatest20FullWatchReportId,
} from '../lib/youtube-latest-20-full-watch-runner.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
} from '../lib/dev-team-intelligence-director.js'
import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
} from '../lib/build-intel-source-value-grader.js'
import {
  DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
} from '../lib/dev-director-daily-source-review-loop.js'
import {
  SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID,
} from '../lib/source-extraction-state-ledger.js'
import {
  MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID,
} from '../lib/myicor-mcp-catalog-snapshot.js'
import {
  SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
} from '../lib/skool-source-system-map.js'
import {
  DEV_TEAM_HUB_V0_API_ROUTE,
  DEV_TEAM_HUB_V0_CARD_ID,
  DEV_TEAM_HUB_V0_PAGE_ROUTE,
  DEV_TEAM_HUB_V0_SOURCE_IDS,
  buildDevTeamHubV0DogfoodProof,
  buildDevTeamHubV0Snapshot,
  buildYoutubeHandoffEvidenceFromReports,
} from '../lib/dev-team-hub.js'
import {
  buildDevOpportunityVisionLensDogfood,
  buildDevOpportunityVisionLensReview,
} from '../lib/dev-opportunity-vision-lens.js'
import {
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT,
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
} from '../lib/source-god-mode-youtube-handoff.js'
import {
  SOURCE_BROWSER_AGENT_TARGET_KEY,
} from '../lib/source-browser-agent-harness.js'
import {
  buildDevBuildOpportunityEvidenceTrace,
} from '../lib/dev-build-opportunity-evidence-trace.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const SCRIPT_PATH = 'scripts/process-dev-team-hub-v0-check.mjs'
const DEV_ACTION_ROUTE_READBACK_JS_PATH = 'public/dev-action-route-readback.js'
const DEV_FOUNDATION_DONE_BAR_JS_PATH = 'public/dev-foundation-done-bar.js'
const DEV_SCOPER_EVIDENCE_TRACE_JS_PATH = 'public/dev-scoper-evidence-trace.js'
const DEV_INTELLIGENCE_HYGIENE_JS_PATH = 'public/dev-intelligence-hygiene.js'
const DEV_AUDITOR_FLOW_JS_PATH = 'public/dev-auditor-flow.js'
const DEV_SYNTHESIS_SCOPE_JS_PATH = 'public/dev-synthesis-scope.js'
const DEV_ROUTE_REVIEW_TRIAGE_JS_PATH = 'public/dev-route-review-triage.js'
const DEV_CSS_PATHS = [
  'public/dev.css',
  'public/dev-youtube-source.css',
  'public/dev-source-approval.css',
  'public/dev-scoper-evidence-trace.css',
  'public/dev-intelligence-hygiene.css',
  'public/dev-auditor-flow.css',
  'public/dev-synthesis-scope.css',
  'public/dev-route-review-triage.css',
]
const NICK_SARAEV_VIBE_CODING_VIDEO_ID = 'gcuR_-rzlDw'
const NICK_SARAEV_VIBE_CODING_REPORT_ARTIFACT_ID = 'batch:youtube-long-course:api-full-watch-v1:20260527135211'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function reportId(item = {}) {
  return item.reportArtifactId || item.report_artifact_id || ''
}

function reportUpdatedAt(item = {}) {
  return item.updatedAt || item.updated_at || item.createdAt || item.created_at || ''
}

function findLatestApiFullWatchReportId(foundationSnapshot = {}) {
  return list(foundationSnapshot.intelligenceAtomSpine?.recentReports)
    .filter(item => {
      const id = reportId(item)
      return id === MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID || isYoutubeLatest20FullWatchReportId(id)
    })
    .sort((left, right) => text(reportUpdatedAt(right)).localeCompare(text(reportUpdatedAt(left))))
    .map(reportId)
    .find(Boolean) || MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function readDevCssBundle() {
  const sources = await Promise.all(DEV_CSS_PATHS.map(readRepoFile))
  return sources.join('\n')
}

function includesAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

function sourceDoesNotWriteOrExtract(source = '') {
  const text = String(source || '')
    .replace(/fetch\('\/api\/auth\/logout'[\s\S]*?\}\)/g, 'fetch-auth-logout-allowed')
    .replace(/fetch\(LINK_PACKET_DECISION_ROUTE[\s\S]*?\n\s*\}\)/g, 'source-packet-decision-ledger-post-allowed')
  const forbidden = [
    'runYoutubeScout' + 'Latest20Discovery',
    'runYoutubeScout' + 'SeedVideoCapture',
    'runYoutubeCreator' + 'DailyWatch',
    'foundation:' + 'job',
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'approve' + 'ActionRoute(',
    'apply' + 'ApprovedActionRoute(',
    'POST ' + '/api',
    'method:' + " 'POST'",
    'method:' + ' "POST"',
  ]
  return forbidden.every(token => !text.includes(token))
}

function devHubWriteSurfaceIsOnlyApprovedSourcePacketWork(routeSource = '', jsSource = '') {
  const literalPosts = [...String(routeSource || '').matchAll(/app\.post\('([^']+)'/g)].map(match => match[1])
  const constantPosts = [...String(routeSource || '').matchAll(/app\.post\((SOURCE_PACKET_[A-Z_]+_ROUTE)/g)].map(match => match[1])
  const uiFetches = [...String(jsSource || '').matchAll(/fetch\(([^,\n]+),\s*\{([\s\S]*?)\n\s*\}\)/g)]
    .map(match => ({ route: match[1].trim(), options: match[2] || '' }))
  const uiPostRoutes = uiFetches
    .filter(fetchCall => /method:\s*'POST'/.test(fetchCall.options))
    .map(fetchCall => fetchCall.route)
    .filter(route => route !== "'/api/auth/logout'")
  return literalPosts.length === 1 &&
    literalPosts[0] === '/api/foundation/dev-team-hub/link-source-packet-decision' &&
    constantPosts.length === 1 &&
    constantPosts[0] === 'SOURCE_PACKET_WORKER_RUNNER_ROUTE' &&
    routeSource.includes('SOURCE_PACKET_WORKER_QUEUE_ROUTE') &&
    routeSource.includes('persistSourcePacketWorkerRun') &&
    routeSource.includes('upsertIntelligenceReportArtifact') &&
    uiPostRoutes.length === 1 &&
    uiPostRoutes[0] === 'LINK_PACKET_DECISION_ROUTE'
}

function pageHasRequiredSections(html = '') {
	  return [
	    'id="extractor-grid"',
	    'id="god-mode-parity"',
	    'id="evidence-grid"',
	    'id="approval-review"',
	    'id="source-leaderboard"',
	    'id="source-grid"',
	    'id="target-panel"',
	    'id="director-panel"',
	    'id="action-route-readback"',
	    'id="foundation-done-bar"',
	    'id="intelligence-hygiene"',
	    'id="auditor-flow"',
	    'id="synthesis-scope"',
	    'id="route-review-triage"',
  ].every(marker => html.includes(marker))
}

function pageHasYoutubeIntelligenceSystem(html = '') {
  return includesAll(html, [
    'data-view="youtube"',
    'id="view-youtube"',
    'id="youtube-system"',
    'YouTube Source Intelligence',
    'Discover',
    'Hand off',
    'Synthesize',
  ])
}

function pageUsesSharedLauncherTopbar(html = '', css = '') {
  return includesAll(html, [
    '/hub-launcher.css',
    'class="launcher-topbar"',
    'class="launcher-brand"',
    'class="launcher-clock"',
    'class="launcher-live"',
    'class="launcher-user"',
    'id="launcher-account-menu"',
  ])
    && !html.includes('class="topbar"')
    && !html.includes('class="tb-')
    && !css.includes('.topbar {')
    && !css.includes('.tb-')
}

function buildVisibleNumbers(payload = {}) {
  const counts = payload.counts || {}
  return [
    { label: 'Research pool', value: counts.researchPool, route: '/api/foundation/build-intel/youtube-creator-daily-watch', sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'Opportunities', value: counts.rankedOpportunities, route: `getIntelligenceReportBundle(${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID})`, sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'Atoms', value: counts.atoms, route: 'intelligence_atoms.report_artifact_id', sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'Evidence hits', value: counts.evidenceHits, route: 'intelligence_atom_hits.report_artifact_id', sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'Approval-required links', value: counts.approvalRequiredLinks, route: 'intelligence_report_artifacts.action_required_items', sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'Review routes', value: counts.reviewRoutes, route: 'intelligence_report_artifacts.structured_output_json.reviewRoutes', sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'Video/audio/visual candidates', value: counts.eyesBuildCandidates, route: `getIntelligenceReportBundle(${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID})`, sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'Accepted API watched videos', value: counts.apiFullWatchVideos, route: `youtubeCreatorGodModeCatchup.creators[mark-kashef] + getIntelligenceReportBundle(${MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID}) + getIntelligenceReportBundle(${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID})`, sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'API full-watch candidates', value: counts.apiFullWatchBuildCandidates, route: `getIntelligenceReportBundle(${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID})`, sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'Director picks', value: payload.director?.recommendedBuildNow?.length || 0, route: `getIntelligenceReportBundle(${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID})`, sourceId: 'SRC-YOUTUBE-INTEL-001' },
  ]
}

async function loadLiveSnapshot() {
  const [
    foundationSnapshot,
    youtubeFullWatchReports,
    activeFoundationSprint,
    extractionControl,
    items,
    scoutBundle,
    linkResourceBundle,
    eyesBundle,
    markApiFullWatchBundle,
    markBaselineApiFullWatchBundle,
    directorBundle,
    sourceValueGraderBundle,
    devDirectorDailySourceReviewBundle,
    sourceExtractionLedgerBundle,
    myicorCatalogBundle,
    skoolSourceSystemMapBundle,
    geminiVideoReviewCalls,
    sourceGodModeHandoffRunItems,
    sourceBrowserAgentRunItems,
    scoperEvidenceTraceResult,
  ] = await Promise.all([
    getFoundationSnapshot(),
    listYoutubeFullWatchReportArtifacts({ limit: 500 }),
    getActiveFoundationCurrentSprint(),
    getExtractionControlSnapshot({ limit: 200 }),
    listSourceCrawlItems({
      targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
      limit: YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
      order: 'desc',
    }),
    getIntelligenceReportBundle(YOUTUBE_SCOUT_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
    getIntelligenceReportBundle(YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
    getIntelligenceReportBundle(GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
    getIntelligenceReportBundle(MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID, { atomLimit: 300, hitLimit: 300 }),
    getIntelligenceReportBundle(MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID, { atomLimit: 300, hitLimit: 300 }),
    getIntelligenceReportBundle(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
    getIntelligenceReportBundle(BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
    getIntelligenceReportBundle(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
    getIntelligenceReportBundle(SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
    getIntelligenceReportBundle(MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
    getIntelligenceReportBundle(SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
    listLlmCalls({ provider: 'gemini', workload: 'video_vision', status: 'succeeded', limit: 5000 }),
    listSourceCrawlItems({ targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY, limit: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT, order: 'desc' }),
    listSourceCrawlItems({ targetKey: SOURCE_BROWSER_AGENT_TARGET_KEY, limit: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT, order: 'desc' }),
    buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 }),
  ])
  const target = list(extractionControl.targets)
    .find(item => item.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY) || null
  const dailyWatchReport = list(foundationSnapshot.intelligenceAtomSpine?.recentReports)
    .find(item => item.reportArtifactId === YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID) || null
  const latestJobRun = list(foundationSnapshot.runtime?.jobs || foundationSnapshot.foundationJobs?.jobs)
    .find(item => item.key === YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY)?.latestRun || null
  const latestApiFullWatchReportId = findLatestApiFullWatchReportId(foundationSnapshot)
  const latestApiFullWatchBundle = latestApiFullWatchReportId === MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID
    ? markApiFullWatchBundle
    : await getIntelligenceReportBundle(latestApiFullWatchReportId, { atomLimit: 300, hitLimit: 300 })
  const dailyWatch = buildYoutubeCreatorDailyWatchReadSnapshot({
    target,
    items,
    report: dailyWatchReport,
    latestJobRun,
  })
  return buildDevTeamHubV0Snapshot({
    foundationSnapshot,
    sourceContracts: getSourceContracts(),
    creatorWatchlist: buildCreatorWatchlistSnapshot(),
    dailyWatch,
    scoutBundle,
    linkResourceBundle,
    eyesBundle,
    markApiFullWatchBundle,
    markBaselineApiFullWatchBundle,
    latestApiFullWatchBundle,
    directorBundle,
    sourceValueGraderBundle,
    devDirectorDailySourceReviewBundle,
    sourceExtractionLedgerBundle,
    myicorCatalogBundle,
    skoolSourceSystemMapBundle,
    geminiVideoReviewCalls,
    youtubeFullWatchReports,
    sourceGodModeHandoffRunItems: [
      ...list(sourceGodModeHandoffRunItems),
      ...list(sourceBrowserAgentRunItems),
    ],
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    currentSprint: activeFoundationSprint,
    extractionControl,
    scoperEvidenceTraceResult,
  })
}

async function buildNickSaraevVibeCodingLongCourseProof() {
  const bundle = await getIntelligenceReportBundle(NICK_SARAEV_VIBE_CODING_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 })
  const output = bundle.report?.structuredOutputJson || bundle.report?.structured_output_json || {}
  const candidates = list(output.buildCandidates || output.build_candidates)
  const contentReview = buildDevOpportunityVisionLensReview({
    rankedCandidates: candidates,
  })
  const vibeOpportunity = list(contentReview.opportunities)
    .find(item => item.definitionId === 'vibe-coding-system-for-steve') || null
  const vibeLens = list(contentReview.priorityLensRouter?.lenses)
    .find(item => item.lensId === 'vibe-coding-operator') || null
  const provenanceOnlyReview = buildDevOpportunityVisionLensReview({
    rankedCandidates: candidates.map((candidate, index) => ({
      rank: index + 1,
      title: `Neutral provenance readback ${index + 1}`,
      why: 'Neutral metadata readback only.',
      recommendedNextStep: 'Store ID only.',
      sourceTitle: candidate.sourceTitle,
      sourceVideoTitle: candidate.sourceVideoTitle,
      sourceVideoId: candidate.sourceVideoId || NICK_SARAEV_VIBE_CODING_VIDEO_ID,
      evidenceRefs: candidate.evidenceRefs,
      resourceLinkDispositions: candidate.resourceLinkDispositions,
    })),
  })
  return {
    reportFound: Boolean(bundle.report),
    sourceVideoId: NICK_SARAEV_VIBE_CODING_VIDEO_ID,
    reportArtifactId: NICK_SARAEV_VIBE_CODING_REPORT_ARTIFACT_ID,
    inputCandidateCount: candidates.length,
    sourceTitlePreservedCount: candidates.filter(candidate => text(candidate.sourceTitle || candidate.sourceVideoTitle)).length,
    vibeOpportunity,
    vibeLensTopTitle: vibeLens?.opportunities?.[0]?.title || '',
    provenanceOnlyMatchedCandidateCount: provenanceOnlyReview.matchedCandidateCount || 0,
    provenanceOnlyOpportunityCount: provenanceOnlyReview.opportunityCount || 0,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  let payload = null
  let nickSaraevVibeCodingProof = null

  const [
    packageJson,
    routeSource,
    moduleSource,
    sourceRunReadbackSource,
    opportunityLensSource,
    appRoutesSource,
    serverSource,
    htmlSource,
    jsSource,
    actionRouteReadbackJsSource,
    foundationDoneBarJsSource,
    scoperEvidenceTraceJsSource,
    intelligenceHygieneJsSource,
    auditorFlowJsSource,
    synthesisScopeJsSource,
    routeReviewTriageJsSource,
    cssSource,
    scriptSource,
    sourceHandoffRunnerSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-build-intel-routes.js'),
    readRepoFile('lib/dev-team-hub.js'),
    readRepoFile('lib/dev-source-run-readback.js'),
    readRepoFile('lib/dev-opportunity-vision-lens.js'),
    readRepoFile('lib/app-page-routes.js'),
    readRepoFile('server.js'),
    readRepoFile('public/dev.html'),
    readRepoFile('public/dev.js'),
    readRepoFile(DEV_ACTION_ROUTE_READBACK_JS_PATH),
    readRepoFile(DEV_FOUNDATION_DONE_BAR_JS_PATH),
    readRepoFile(DEV_SCOPER_EVIDENCE_TRACE_JS_PATH),
    readRepoFile(DEV_INTELLIGENCE_HYGIENE_JS_PATH),
    readRepoFile(DEV_AUDITOR_FLOW_JS_PATH),
    readRepoFile(DEV_SYNTHESIS_SCOPE_JS_PATH),
    readRepoFile(DEV_ROUTE_REVIEW_TRIAGE_JS_PATH),
    readDevCssBundle(),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('scripts/run-source-god-mode-youtube-handoff.mjs'),
  ])

  await initFoundationDb()
  try {
    payload = await loadLiveSnapshot()
    nickSaraevVibeCodingProof = await buildNickSaraevVibeCodingLongCourseProof()
  } finally {
    await closeFoundationDb()
  }

  const dogfood = buildDevTeamHubV0DogfoodProof()
  const opportunityLensDogfood = buildDevOpportunityVisionLensDogfood()
  const readOnlyBundle = `${moduleSource}\n${sourceRunReadbackSource}\n${jsSource}\n${actionRouteReadbackJsSource}\n${foundationDoneBarJsSource}\n${scoperEvidenceTraceJsSource}\n${intelligenceHygieneJsSource}\n${auditorFlowJsSource}\n${synthesisScopeJsSource}\n${routeReviewTriageJsSource}`

  addCheck(checks, packageJson.scripts?.['process:dev-team-hub-v0-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused Dev Team Hub proof', packageJson.scripts?.['process:dev-team-hub-v0-check'] || 'missing')
  addCheck(checks, includesAll(routeSource, ['DEV_TEAM_HUB_V0_API_ROUTE', 'getIntelligenceReportBundle', 'buildDevTeamHubV0Snapshot']), 'Build Intel routes expose read-only Dev Team Hub API', DEV_TEAM_HUB_V0_API_ROUTE)
  addCheck(checks, includesAll(serverSource, ['getIntelligenceReportBundle', 'registerFoundationBuildIntelRoutes(app']), 'server passes Foundation report bundle dependency', 'server.js')
  addCheck(checks, includesAll(appRoutesSource, ["app.get('/dev'", 'dev.html']), 'app routes serve owner-only Dev page', DEV_TEAM_HUB_V0_PAGE_ROUTE)
  addCheck(checks, htmlSource.includes('/dev.css') && htmlSource.includes('/dev.js') && pageHasRequiredSections(htmlSource), 'Dev page has required Data Pool sections', 'Director lens, extractors, God Mode parity, evidence, approval review, source leaderboard, source systems, selected detail')
	  addCheck(
	    checks,
	    pageHasYoutubeIntelligenceSystem(htmlSource) &&
      jsSource.includes('renderYoutubeSourceIntelligence') &&
      jsSource.includes('renderYoutubeHandoff') &&
      jsSource.includes('renderYoutubeSourceHandoffQueue') &&
      jsSource.includes('renderYoutubeSourceBucketCards') &&
      jsSource.includes('renderSourceSessionPrepQueue') &&
      jsSource.includes('sourceHandoffVisibleRows') &&
      jsSource.includes('renderYoutubeCreatorSourceStacks') &&
      jsSource.includes('const rows = list(stacks)') &&
      !jsSource.includes('const rows = list(stacks).slice(0, 12)') &&
      jsSource.includes('renderSourceSessionBrokerDecision') &&
      jsSource.includes('renderYoutubeExecutiveSummary') &&
      jsSource.includes('setDevView') &&
      cssSource.includes('.youtube-system') &&
      cssSource.includes('.yt-stage-grid') &&
      cssSource.includes('.yt-handoff-grid') &&
      cssSource.includes('.yt-source-bucket-grid') &&
      cssSource.includes('.yt-source-stack-grid') &&
      cssSource.includes('.yt-source-handoff-list') &&
      cssSource.includes('.yt-session-prep-grid') &&
      cssSource.includes('.yt-source-session') &&
      cssSource.includes('.yt-exec-summary'),
	    'Dev page exposes a separate YouTube Intelligence system view',
	    'sidebar view + #view-youtube + #youtube-system + runtime/stage/handoff/source-browser grouped buckets/source-stack/session-broker/executive-summary renderers',
	  )
	  addCheck(
	    checks,
	    htmlSource.includes('id="view-rankings"') &&
	      htmlSource.includes('id="rankings-system"') &&
	      htmlSource.includes('data-view="rankings"') &&
	      jsSource.includes('renderRankings') &&
	      jsSource.includes('candidateDevSourceGrade') &&
	      jsSource.includes('Top 12') &&
	      jsSource.includes('All creators') &&
	      jsSource.includes('Why for AIOS') &&
	      jsSource.includes('VISION OPPORTUNITIES') &&
	      jsSource.includes('renderVisionOpportunities') &&
	      jsSource.includes('renderPriorityLensRouter') &&
	      jsSource.includes('renderDirectorTop3ScoperReview') &&
	      jsSource.includes('renderOperatorPlaybook') &&
	      jsSource.includes('renderRankingProcessVisualizer') &&
	      jsSource.includes('data-priority-lens') &&
	      jsSource.includes('renderCandidateSourceLinks') &&
	      cssSource.includes('.rankings-system') &&
	      cssSource.includes('.ranking-process') &&
	      cssSource.includes('.ranking-process-flow') &&
	      cssSource.includes('.ranking-audit-strip') &&
	      cssSource.includes('.ranking-idea') &&
	      cssSource.includes('.vision-opportunity') &&
	      cssSource.includes('.priority-lens-router') &&
	      cssSource.includes('.priority-lens-button') &&
	      cssSource.includes('.director-scoper-review') &&
	      cssSource.includes('.director-scoper-grid') &&
	      cssSource.includes('.operator-playbook') &&
	      cssSource.includes('.ranking-score-grid') &&
	      cssSource.includes('.ranking-links'),
	    'Dev page exposes a separate Rankings view with evidence-rich ideas, process visualization, and full creator priority',
	    'sidebar view + #view-rankings + ranking process + priority lenses + vision opportunities + top build ideas + full creator ranking + source/evidence details',
	  )
  addCheck(checks, pageUsesSharedLauncherTopbar(htmlSource, cssSource), 'Dev page uses the shared launcher topbar structure/CSS', 'launcher-topbar classes + /hub-launcher.css')
  addCheck(checks, !htmlSource.includes('id="active-card"') && !htmlSource.includes('id="source-proof"') && !htmlSource.includes('id="director-status"'), 'Dev page does not show redundant status-only middle cards', 'active card/source proof/director mini cards removed')
  addCheck(checks, jsSource.includes(DEV_TEAM_HUB_V0_API_ROUTE) && jsSource.includes('Needs source') && jsSource.includes("cache: 'no-store'"), 'frontend consumes API and renders missing-source state', DEV_TEAM_HUB_V0_API_ROUTE)
  addCheck(
    checks,
    jsSource.includes('DEV_DATA_POOL_REFRESH_INTERVAL_MS') &&
      jsSource.includes('refreshDevDataPoolFromBackend') &&
      jsSource.includes('state.dataPoolLoadInFlight') &&
	      jsSource.includes("document.visibilityState === 'hidden'") &&
	      jsSource.includes("window.addEventListener('focus', refreshDevDataPoolFromBackend)") &&
	      htmlSource.includes('/dev-youtube-source.css?v=20260530-oversized-v1') &&
	      htmlSource.includes('/dev-source-approval.css?v=20260530-oversized-v1'),
    'Dev page automatically refetches source-backed dashboard data after extraction writes',
    '30s no-store polling + focus refresh + in-flight guard',
  )
  addCheck(
    checks,
    moduleSource.includes('buildDevHubFoundationDoneBarFromInputs') &&
      Object.prototype.hasOwnProperty.call(payload || {}, 'foundationDoneBar') &&
      payload?.foundationDoneBar?.contractVersion === 'dev-hub-foundation-done-bar.v1' &&
      payload?.foundationDoneBar?.source?.reusedTruthLayer === 'buildSourceMaturityGridSnapshot' &&
      payload?.foundationDoneBar?.boundaries?.noRouteMutation === true &&
      Number(payload?.foundationDoneBar?.summary?.stageCounts?.resolved || 0) <= Number(payload?.foundationDoneBar?.summary?.stageCounts?.routed || 0) &&
      htmlSource.includes('id="foundation-done-bar"') &&
      htmlSource.includes('/dev-foundation-done-bar.js') &&
      jsSource.includes("new CustomEvent('devhub:snapshot'") &&
      foundationDoneBarJsSource.includes('foundationDoneBar') &&
      foundationDoneBarJsSource.includes('Route pending is open') &&
      cssSource.includes('.foundation-done-bar'),
    'Dev Hub exposes Foundation Done source pipeline bar without counting routed-only work as done',
    `sources=${payload?.foundationDoneBar?.summary?.sourceCount || 0}; routed=${payload?.foundationDoneBar?.summary?.stageCounts?.routed || 0}; resolved=${payload?.foundationDoneBar?.summary?.stageCounts?.resolved || 0}; waitingRoutes=${payload?.foundationDoneBar?.summary?.waitingRoutes || 0}`,
  )
  addCheck(
    checks,
    moduleSource.includes('buildDevHubSynthesisScopeReadback') &&
      Object.prototype.hasOwnProperty.call(payload || {}, 'synthesisScopeReadback') &&
      payload?.synthesisScopeReadback?.contractVersion === 'dev-hub-synthesis-scope-readback.v1' &&
      payload?.synthesisScopeReadback?.source?.configOwner === 'buildSynthesisEngineRunConfig' &&
      payload?.synthesisScopeReadback?.source?.noSecondTruthLayer === true &&
      payload?.synthesisScopeReadback?.boundaries?.noRefreshRun === true &&
      payload?.synthesisScopeReadback?.boundaries?.noSynthesisWrite === true &&
      payload?.synthesisScopeReadback?.boundaries?.noModelCalls === true &&
      payload?.synthesisScopeReadback?.boundaries?.noEmbeddings === true &&
      payload?.synthesisScopeReadback?.boundaries?.noActionRouteProposal === true &&
      payload?.synthesisScopeReadback?.boundaries?.noActionRouteMutation === true &&
      payload?.synthesisScopeReadback?.boundaries?.noBacklogMutation === true &&
      payload?.synthesisScopeReadback?.summary?.refreshConfiguredForRealCorpus === true &&
      payload?.synthesisScopeReadback?.summary?.proofAndRefreshSeparated === true &&
      Number(payload?.synthesisScopeReadback?.summary?.refreshItemLimit || 0) > Number(payload?.synthesisScopeReadback?.summary?.proofItemLimit || 0) &&
      payload?.synthesisScopeReadback?.summary?.refreshRunsStartedByReadback === 0 &&
      payload?.synthesisScopeReadback?.summary?.modelOrProviderCallsStarted === 0 &&
      payload?.synthesisScopeReadback?.summary?.actionRoutesProposedByReadback === 0 &&
      list(payload?.synthesisScopeReadback?.flowStages).length <= 4 &&
      list(payload?.synthesisScopeReadback?.reviewBuckets).length <= 5 &&
      htmlSource.includes('id="synthesis-scope"') &&
      htmlSource.includes('/dev-synthesis-scope.css') &&
      htmlSource.includes('/dev-synthesis-scope.js') &&
      synthesisScopeJsSource.includes('synthesisScopeReadback') &&
      synthesisScopeJsSource.includes('No-run scope proof') &&
      cssSource.includes('.synthesis-scope'),
    'Dev Hub exposes Synthesis Scope proof-vs-real-corpus readback without running synthesis',
    `proof=${payload?.synthesisScopeReadback?.summary?.proofScopeKey || 'missing'}/${payload?.synthesisScopeReadback?.summary?.proofItemLimit || 0}; refresh=${payload?.synthesisScopeReadback?.summary?.refreshScopeKey || 'missing'}/${payload?.synthesisScopeReadback?.summary?.refreshItemLimit || 0}; job=${payload?.synthesisScopeReadback?.summary?.scheduledRefreshLatestStatus || 'missing'}`,
  )
  addCheck(
    checks,
    routeSource.includes('buildDevBuildOpportunityEvidenceTrace({ candidateLimit: 5 })') &&
      moduleSource.includes('buildDevHubScoperEvidenceTraceReadback') &&
      Object.prototype.hasOwnProperty.call(payload || {}, 'scoperEvidenceTraceReadback') &&
      payload?.scoperEvidenceTraceReadback?.contractVersion === 'dev-hub-scoper-evidence-trace-readback.v1' &&
      payload?.scoperEvidenceTraceReadback?.source?.reusedTruthLayer === 'buildDevBuildOpportunityEvidenceTrace' &&
      payload?.scoperEvidenceTraceReadback?.boundaries?.noAutoScoperPromotion === true &&
      payload?.scoperEvidenceTraceReadback?.boundaries?.noBacklogMutation === true &&
      Number(payload?.scoperEvidenceTraceReadback?.summary?.readyForPortfolioCount || 0) <= Number(payload?.scoperEvidenceTraceReadback?.summary?.sourceTraceReadyCount || 0) &&
      list(payload?.scoperEvidenceTraceReadback?.candidates).length <= 5 &&
      list(payload?.scoperEvidenceTraceReadback?.candidates).every(candidate => candidate.readyForPortfolio !== true || candidate.rawTraceReady === true) &&
      htmlSource.includes('id="scoper-evidence-trace"') &&
      htmlSource.includes('/dev-scoper-evidence-trace.css') &&
      htmlSource.includes('/dev-scoper-evidence-trace.js') &&
      scoperEvidenceTraceJsSource.includes('scoperEvidenceTraceReadback') &&
      scoperEvidenceTraceJsSource.includes('Proposal-only') &&
      cssSource.includes('.scoper-evidence-trace'),
    'Dev Hub exposes Scoper evidence trace readback without promoting Director candidates',
    `reviewed=${payload?.scoperEvidenceTraceReadback?.summary?.reviewedCount || 0}; ready=${payload?.scoperEvidenceTraceReadback?.summary?.readyForPortfolioCount || 0}; parked=${payload?.scoperEvidenceTraceReadback?.summary?.parkedCount || 0}`,
  )
  addCheck(
    checks,
    moduleSource.includes('buildDevHubIntelligenceHygieneReadback') &&
      Object.prototype.hasOwnProperty.call(payload || {}, 'intelligenceHygieneReadback') &&
      payload?.intelligenceHygieneReadback?.contractVersion === 'dev-hub-intelligence-hygiene-readback.v1' &&
      payload?.intelligenceHygieneReadback?.source?.noSecondTruthLayer === true &&
      payload?.intelligenceHygieneReadback?.boundaries?.noAtomWrites === true &&
      payload?.intelligenceHygieneReadback?.boundaries?.noRouteMutation === true &&
      payload?.intelligenceHygieneReadback?.boundaries?.noBacklogMutation === true &&
      payload?.intelligenceHygieneReadback?.boundaries?.noScoperMutation === true &&
      payload?.intelligenceHygieneReadback?.boundaries?.noExternalWrites === true &&
      payload?.intelligenceHygieneReadback?.summary?.autoMutationCount === 0 &&
      (Number(payload?.intelligenceHygieneReadback?.summary?.atomizedGapSources || 0) === 0 || Boolean(payload?.intelligenceHygieneReadback?.falseFreshnessWarning)) &&
      list(payload?.intelligenceHygieneReadback?.queues?.sourcePipeline).length <= 8 &&
      list(payload?.intelligenceHygieneReadback?.queues?.routeNoise).length <= 6 &&
      list(payload?.intelligenceHygieneReadback?.queues?.scoperParked).length <= 5 &&
      list(payload?.intelligenceHygieneReadback?.queues?.sourceFamilyBlockers).length <= 8 &&
      htmlSource.includes('id="intelligence-hygiene"') &&
      htmlSource.includes('/dev-intelligence-hygiene.css') &&
      htmlSource.includes('/dev-intelligence-hygiene.js') &&
      intelligenceHygieneJsSource.includes('intelligenceHygieneReadback') &&
      intelligenceHygieneJsSource.includes('Read-only cleanup queue') &&
      cssSource.includes('.intelligence-hygiene'),
    'Dev Hub exposes Intelligence Hygiene cleanup pressure without false freshness or mutation',
    `cleanup=${payload?.intelligenceHygieneReadback?.summary?.totalCleanupPressure || 0}; atomized=${payload?.intelligenceHygieneReadback?.summary?.atomizedGapSources || 0}; routes=${payload?.intelligenceHygieneReadback?.summary?.routeReviewItems || 0}; scoper=${payload?.intelligenceHygieneReadback?.summary?.scoperParkedCandidates || 0}`,
  )
  addCheck(
    checks,
    moduleSource.includes('buildDevHubAuditorFlowReadback') &&
      Object.prototype.hasOwnProperty.call(payload || {}, 'auditorFlowReadback') &&
      payload?.auditorFlowReadback?.contractVersion === 'dev-hub-auditor-flow-readback.v1' &&
      payload?.auditorFlowReadback?.source?.registry === 'foundationJobs.jobs' &&
      payload?.auditorFlowReadback?.source?.noSecondTruthLayer === true &&
      payload?.auditorFlowReadback?.boundaries?.noAuditRun === true &&
      payload?.auditorFlowReadback?.boundaries?.noReportWrite === true &&
      payload?.auditorFlowReadback?.boundaries?.noBacklogMutation === true &&
      payload?.auditorFlowReadback?.boundaries?.noRouteMutation === true &&
      payload?.auditorFlowReadback?.boundaries?.noScoperMutation === true &&
      payload?.auditorFlowReadback?.boundaries?.noExternalWrites === true &&
      payload?.auditorFlowReadback?.boundaries?.noAutoFindingPromotion === true &&
      payload?.auditorFlowReadback?.summary?.autoFindingPromotionCount === 0 &&
      payload?.auditorFlowReadback?.summary?.externalWriteCount === 0 &&
      payload?.auditorFlowReadback?.summary?.backlogMutationCount === 0 &&
      payload?.auditorFlowReadback?.summary?.routeMutationCount === 0 &&
      list(payload?.auditorFlowReadback?.auditorJobs).length <= 8 &&
      list(payload?.auditorFlowReadback?.downstreamJobs).length <= 4 &&
      list(payload?.auditorFlowReadback?.flowStages).length <= 4 &&
      list(payload?.auditorFlowReadback?.reviewBuckets).length <= 5 &&
      list(payload?.auditorFlowReadback?.auditorJobs).every(job => job.findingsMoveAutomatically === false && job.writesBacklogNow === false && job.writesRoutesNow === false && job.writesScoperNow === false && job.sendsExternalNow === false) &&
      htmlSource.includes('id="auditor-flow"') &&
      htmlSource.includes('/dev-auditor-flow.css') &&
      htmlSource.includes('/dev-auditor-flow.js') &&
      auditorFlowJsSource.includes('auditorFlowReadback') &&
      auditorFlowJsSource.includes('Report/check output only') &&
      cssSource.includes('.auditor-flow'),
    'Dev Hub exposes Auditor Flow run/report/review gates without running audits or promoting findings',
    `auditors=${payload?.auditorFlowReadback?.summary?.auditorJobCount || 0}; scheduled=${payload?.auditorFlowReadback?.summary?.scheduledAuditorJobs || 0}; reportOnly=${payload?.auditorFlowReadback?.summary?.reportOnlyJobs || 0}; autoPromote=${payload?.auditorFlowReadback?.summary?.autoFindingPromotionCount || 0}`,
  )
  addCheck(
    checks,
    moduleSource.includes('buildDevHubRouteReviewTriage') &&
      Object.prototype.hasOwnProperty.call(payload || {}, 'routeReviewTriage') &&
      payload?.routeReviewTriage?.contractVersion === 'dev-hub-route-review-triage.v1' &&
      payload?.routeReviewTriage?.source?.reviewInboxRoute === '/api/foundation/action-route-review-inbox' &&
      payload?.routeReviewTriage?.source?.noSecondTruthLayer === true &&
      payload?.routeReviewTriage?.boundaries?.noRouteApply === true &&
      payload?.routeReviewTriage?.boundaries?.noRouteApprove === true &&
      payload?.routeReviewTriage?.boundaries?.noRouteReject === true &&
      payload?.routeReviewTriage?.boundaries?.noRouteSnooze === true &&
      payload?.routeReviewTriage?.boundaries?.noRouteReroute === true &&
      payload?.routeReviewTriage?.boundaries?.noBacklogMutation === true &&
      payload?.routeReviewTriage?.boundaries?.noScoperMutation === true &&
      payload?.routeReviewTriage?.boundaries?.noHarlanSend === true &&
      payload?.routeReviewTriage?.boundaries?.noExternalWrites === true &&
      payload?.routeReviewTriage?.boundaries?.noAutoApply === true &&
      payload?.routeReviewTriage?.boundaries?.noAutoClear === true &&
      Number(payload?.routeReviewTriage?.summary?.autoApplyAllowedItems || 0) === 0 &&
      Number(payload?.routeReviewTriage?.summary?.routesMutatedByReadback || 0) === 0 &&
      Number(payload?.routeReviewTriage?.summary?.destinationsMutatedByReadback || 0) === 0 &&
      Number(payload?.routeReviewTriage?.summary?.externalWritesByReadback || 0) === 0 &&
      list(payload?.routeReviewTriage?.triageBuckets).length <= 6 &&
      list(payload?.routeReviewTriage?.queues?.readyForConfirmedApply).length <= 6 &&
      list(payload?.routeReviewTriage?.queues?.ownerRequired).length <= 6 &&
      list(payload?.routeReviewTriage?.queues?.sensitiveReview).length <= 6 &&
      list(payload?.routeReviewTriage?.queues?.duplicateOrStale).length <= 6 &&
      list(payload?.routeReviewTriage?.queues?.oldest).length <= 6 &&
      htmlSource.includes('id="route-review-triage"') &&
      htmlSource.includes('/dev-route-review-triage.css') &&
      htmlSource.includes('/dev-route-review-triage.js') &&
      routeReviewTriageJsSource.includes('routeReviewTriage') &&
      routeReviewTriageJsSource.includes('Read-only review triage') &&
      routeReviewTriageJsSource.includes('autoApplyAllowedItems') &&
      cssSource.includes('.route-review-triage') &&
      cssSource.includes('.route-triage-summary') &&
      cssSource.includes('.route-triage-bucket'),
    'Dev Hub exposes Route Review Triage buckets without approving, applying, auto-clearing, or sending',
    `waiting=${payload?.routeReviewTriage?.summary?.needsReviewItems || 0}; owner=${payload?.routeReviewTriage?.summary?.ownerRequiredItems || 0}; sensitive=${payload?.routeReviewTriage?.summary?.sensitiveReviewItems || 0}; duplicateStale=${payload?.routeReviewTriage?.summary?.duplicateOrStaleReviewItems || 0}; ready=${payload?.routeReviewTriage?.summary?.readyForConfirmedApplyItems || 0}`,
  )
  addCheck(
    checks,
    moduleSource.includes('buildDevHubActionRouteReadback') &&
      Object.prototype.hasOwnProperty.call(payload || {}, 'actionRouteReadback') &&
      payload?.actionRouteReadback?.contractVersion === 'dev-hub-action-route-readback.v1' &&
      payload?.actionRouteReadback?.boundaries?.noAutoApply === true &&
      payload?.actionRouteReadback?.harlanDigest?.sendsMessageNow === false &&
      payload?.actionRouteReadback?.applySafety?.autoApplyAllowed === false &&
      htmlSource.includes('id="action-route-readback"') &&
      htmlSource.includes('/dev-action-route-readback.js') &&
      jsSource.includes("new CustomEvent('devhub:snapshot'") &&
      actionRouteReadbackJsSource.includes('actionRouteReadback') &&
      actionRouteReadbackJsSource.includes('No auto-apply') &&
      actionRouteReadbackJsSource.includes('No Harlan send') &&
      cssSource.includes('.action-route-readback'),
    'Dev Hub exposes action-route waiting/apply-safety/Harlan digest readback without applying or sending',
    `waiting=${payload?.actionRouteReadback?.summary?.needsReviewItems || 0}; ready=${payload?.actionRouteReadback?.summary?.readyForConfirmedApplyItems || 0}; applied=${payload?.actionRouteReadback?.summary?.appliedRoutes || 0}`,
  )
  addCheck(
    checks,
    moduleSource.includes('devOpportunityVisionLens') &&
      opportunityLensSource.includes('Browser Agent That Can Work') &&
      opportunityLensSource.includes('Assistant That Handles Conversations Like Steve') &&
      opportunityLensSource.includes('PRIORITY_LENS_PACKS') &&
      opportunityLensSource.includes('current-sprint') &&
      opportunityLensSource.includes('marketing-recruiting') &&
      opportunityLensSource.includes('vibe-coding-operator') &&
      opportunityLensSource.includes('Vibe Coding System For Steve') &&
      opportunityLensSource.includes('noAutoBacklogPromotion: true') &&
      opportunityLensSource.includes('noAutoScoperPromotion: true') &&
      opportunityLensDogfood.ok,
    'Dev Hub exposes review-only vision opportunity merge and priority lens router with simple operator titles',
    opportunityLensDogfood.checks.map(check => `${check.ok ? 'PASS' : 'FAIL'} ${check.check}`).join(' | '),
  )
  addCheck(
    checks,
    nickSaraevVibeCodingProof?.reportFound === true &&
      nickSaraevVibeCodingProof?.inputCandidateCount >= 20 &&
      nickSaraevVibeCodingProof?.sourceTitlePreservedCount >= 20 &&
      nickSaraevVibeCodingProof?.vibeOpportunity?.title === 'Vibe Coding System For Steve' &&
      nickSaraevVibeCodingProof?.vibeOpportunity?.candidateCount >= 2 &&
      nickSaraevVibeCodingProof?.vibeOpportunity?.operatorPlaybook?.status === 'ready_for_operator_review' &&
      nickSaraevVibeCodingProof?.vibeOpportunity?.operatorPlaybook?.supportedPillarCount >= 4 &&
      nickSaraevVibeCodingProof?.vibeLensTopTitle === 'Vibe Coding System For Steve' &&
      nickSaraevVibeCodingProof?.provenanceOnlyMatchedCandidateCount === 0 &&
      nickSaraevVibeCodingProof?.provenanceOnlyOpportunityCount === 0,
    'Nick Saraev long-course content is caught by the vibe-coding lens without source-title or link-disposition forcing',
    `${nickSaraevVibeCodingProof?.inputCandidateCount || 0} candidates / ${nickSaraevVibeCodingProof?.sourceTitlePreservedCount || 0} source titles preserved / ${nickSaraevVibeCodingProof?.vibeOpportunity?.candidateCount || 0} content vibe signals / ${nickSaraevVibeCodingProof?.vibeOpportunity?.operatorPlaybook?.supportedPillarCount || 0} playbook pillars / provenance-only matched=${nickSaraevVibeCodingProof?.provenanceOnlyMatchedCandidateCount || 0} / top=${nickSaraevVibeCodingProof?.vibeLensTopTitle || 'missing'}`,
  )
  addCheck(checks, jsSource.includes('YouTube Creators') && jsSource.includes('Creator Source Stack') && jsSource.includes('Creator Newsletters') && jsSource.includes('Skool / Free Communities') && jsSource.includes('Paid Courses / Training Platforms') && jsSource.includes('GitHub / Repos') && jsSource.includes('Gmail / Missive / Slack') && jsSource.includes('Meetings / Transcripts') && jsSource.includes("label: 'Visual evidence'") && jsSource.includes("label: 'Links to review'") && !jsSource.includes("name: 'Video Artifacts'") && !jsSource.includes("name: 'Dev Director'") && !jsSource.includes("name: 'God Mode Eyes'"), 'source cards are actual source inputs and evidence is separate output', 'sources: YouTube/source-stack/newsletters/free Skool/paid courses-training/GitHub/internal/meetings; evidence cards carry output counts')
  addCheck(checks, moduleSource.includes('sourceValueGrader') && routeSource.includes('BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID'), 'Dev Hub API exposes source-value grader data to avoid hardcoded creator cards', BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID)
  addCheck(checks, moduleSource.includes('youtubeCreatorGodModeCatchup') && moduleSource.includes('buildYoutubeCreatorGodModeCatchupSnapshot') && jsSource.includes('youtubeCreatorGodModeCatchup'), 'Dev Hub API/page exposes YouTube creator catch-up baseline readback', 'youtubeCreatorGodModeCatchup')
	  addCheck(
	    checks,
	    routeSource.includes('listYoutubeFullWatchReportArtifacts({ limit: 500 })') &&
	      moduleSource.includes('youtubeFullWatchReports') &&
	      moduleSource.includes("fullWatchReportReadbackRoute: 'listYoutubeFullWatchReportArtifacts({ limit: 500 })'") &&
	      scriptSource.includes('listYoutubeFullWatchReportArtifacts({ limit: 500 })') &&
	      routeSource.includes("listLlmCalls({ provider: 'gemini', workload: 'video_vision', status: 'succeeded', limit: 5000 })") &&
	      scriptSource.includes("listLlmCalls({ provider: 'gemini', workload: 'video_vision', status: 'succeeded', limit: 5000 })"),
	    'Dev Hub catch-up readback uses the full YouTube full-watch report set instead of a recent-report slice',
	    'full-watch report helper + 5000-call Gemini watched-id readback feeds youtubeCreatorGodModeCatchup',
	  )
  addCheck(
    checks,
    routeSource.includes('YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT') &&
      !/targetKey:\s*['"]youtube-creator-daily-watch['"][\s\S]{0,120}limit:\s*200/.test(routeSource),
    'daily watch direct API and Dev Hub use the full creator readback limit',
    `limit=${YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT}`,
  )
  addCheck(
    checks,
    jsSource.includes('YOUTUBE_CREATOR_TARGET_FALLBACK_LIMIT') &&
      jsSource.includes('.map(creatorTargetFromCatchup)') &&
      !/catchupRows\(snapshot\)[\s\S]{0,600}\.slice\(0,\s*10\)[\s\S]{0,220}\.map\(creatorTargetFromCatchup\)/.test(jsSource),
    'Dev Hub YouTube source detail does not cap catch-up creators at 10',
    'catch-up rows render all approved creators; fallback graded/daily views keep the compact limit'
  )
  addCheck(
    checks,
    !jsSource.includes('SOURCE_LEADERBOARD_LIMIT') &&
      jsSource.includes('rankedDevSources(snapshot)') &&
      jsSource.includes('Why ranked:') &&
      jsSource.includes('gradeBucketSummary(snapshot)') &&
      jsSource.includes('totalRankedCreators'),
    'Dev Hub creator ranking shows the full creator ranking with grade filters and why-ranked copy',
    'all ranked creators + S/A/B/C/D/ungraded counts + ranking explanation',
  )
  addCheck(
    checks,
    jsSource.includes('EXTRACTOR TRUTH GUARD') &&
      jsSource.includes('Capability audit for the extraction systems above'),
    'Dev Hub separates extraction systems from the false-God-Mode guardrail in plain English',
    'extractor truth guard copy',
  )
  addCheck(
    checks,
    jsSource.includes('creatorRepresentationLabel') &&
      jsSource.includes('Ready for metadata') &&
      jsSource.includes('Needs source URL'),
    'Dev Hub distinguishes missing metadata from missing creator source URLs',
    'ready-for-metadata is not labeled as source missing',
  )
  addCheck(
    checks,
    moduleSource.includes('buildYoutubeGodModeAutopilotPlan') &&
      moduleSource.includes('buildYoutubeGodModeAutonomousWatchPlan') &&
      moduleSource.includes('buildYoutubeGodModeCandidateVideosFromCatchupSnapshot') &&
      moduleSource.includes('startsProviderCall: false') &&
      jsSource.includes('Next dry-run batch') &&
      jsSource.includes('youtubeGodModeAutopilotPlan') &&
      jsSource.includes('renderAutopilotRows') &&
      jsSource.includes('buildYoutubeAutopilotBlockedRows') &&
      jsSource.includes('autopilot-step-list'),
    'Dev Hub exposes YouTube morning autopilot dry-run with SOP steps and filtered-candidate reasons without starting a provider run',
    'catch-up candidates -> dry-run plan -> Dev evidence card/source detail/SOP steps/filtered reasons',
  )
  addCheck(checks, moduleSource.includes('buildExtractionEconomics') && moduleSource.includes('estimateGeminiStandardTokenCostUsd') && routeSource.includes('listLlmCalls'), 'Dev Hub API exposes extraction economics from LLM call usage', 'llm_calls + shared Gemini pricing tokens')
  addCheck(
    checks,
    moduleSource.includes('buildApprovalReviewQueue') &&
      moduleSource.includes('buildApprovalReviewTriage') &&
      jsSource.includes('renderApprovalReview') &&
      jsSource.includes('renderApprovalTriage') &&
      jsSource.includes('renderWorkerQueue') &&
      cssSource.includes('approval-triage-grid'),
    'Dev Hub exposes actual approval links and source-packet triage instead of a blind count',
    'approvalReviewQueue + approvalReviewTriage + worker/Hands queue readback + #approval-review',
  )
  addCheck(checks, moduleSource.includes('buildDevIntelSourceCoverageSnapshot') && jsSource.includes('renderSourceLeaderboard'), 'Dev Hub page exposes source-family leaderboard coverage', 'sourceCoverage + sourceValueGrader')
  addCheck(checks, moduleSource.includes('buildGodModeExtractorParitySnapshot') && moduleSource.includes('evaluateGodModeExtractorParity') && jsSource.includes('renderGodModeParity'), 'Dev Hub API and page render extractor God Mode parity data', 'godModeExtractorParity read model + #god-mode-parity')
  addCheck(
    checks,
      !htmlSource.includes('builder-lane-panel') &&
      !jsSource.includes('renderBuilderLanes') &&
      !moduleSource.includes('buildParallelBuilderLanesSnapshot') &&
      !Object.prototype.hasOwnProperty.call(payload || {}, 'parallelBuilderLanes') &&
      !list(payload?.sourceRoutes).some(route => String(route.visibleValue || '').includes('Parallel builder')),
    'Dev Hub does not expose report-only builder lanes as live operator truth',
    'parallel builder protocol stays out of /dev until backed by real runtime state'
  )
  addCheck(checks, cssSource.includes("font-family: 'Stratum1'") && cssSource.includes('--blue: #0084C9'), 'page-scoped CSS uses BCrew type and color tokens', 'public/dev.css')
  addCheck(checks, cssSource.includes('top: 0;') && !cssSource.includes('top: var(--topbar-h);'), 'Dev sidebar does not double-offset below shared topbar', 'sidebar top 0')
  addCheck(
    checks,
    !htmlSource.includes('class="sb-back"') &&
      !htmlSource.includes('HUB · 07</span>') &&
      cssSource.includes('padding: var(--s-4) 0 var(--s-8);') &&
      cssSource.includes('padding: 0 var(--s-5) var(--s-3);') &&
      cssSource.includes('margin-bottom: var(--s-2);') &&
      cssSource.includes('font-size: var(--t-xl);') &&
      cssSource.includes('padding: 10px 20px;'),
    'Dev sidebar uses locked simplified sidebar values',
    'hub name only, 16px top padding, 12px title padding, 8px nav gap'
  )
  addCheck(checks, devHubWriteSurfaceIsOnlyApprovedSourcePacketWork(routeSource, jsSource), 'Dev Hub write surface is limited to source-packet decision records and the guarded worker route', 'no broad crawler/backlog/external write POST routes')
  addCheck(checks, sourceDoesNotWriteOrExtract(readOnlyBundle), 'Dev Hub page code has no extraction runner, external write, broad approval apply, or backlog writer path', 'safe frontend bundle scan')
  addCheck(checks, sourceDoesNotWriteOrExtract(scriptSource), 'focused proof stays read-only', SCRIPT_PATH)
  addCheck(checks, dogfood.ok === true, 'dogfood proves source-backed counts and missing-source fallback', JSON.stringify(dogfood.cases))
  addCheck(checks, payload?.cardId === DEV_TEAM_HUB_V0_CARD_ID && payload?.readOnly === true, 'live snapshot identifies read-only active card', payload?.cardId || 'missing')
  addCheck(checks, DEV_TEAM_HUB_V0_SOURCE_IDS.every(sourceId => list(payload?.sourceIds).includes(sourceId)), 'live snapshot includes required source IDs', list(payload?.sourceIds).join(', ') || 'missing')
  addCheck(checks, payload?.dailyWatch?.sourceRoute === '/api/foundation/build-intel/youtube-creator-daily-watch', 'daily watch source route is preserved', payload?.dailyWatch?.sourceRoute || 'missing')
  addCheck(
    checks,
    Number(payload?.dailyWatch?.researchPoolCount || 0) >= list(payload?.dailyWatch?.researchPool).length &&
      list(payload?.dailyWatch?.researchPool).length <= 180 &&
      payload?.dailyWatch?.researchPoolArePreview === true,
    'daily watch research pool is a bounded preview with full count preserved',
    `${list(payload?.dailyWatch?.researchPool).length}/${payload?.dailyWatch?.researchPoolCount || 0} rows`,
  )
  addCheck(
    checks,
    Boolean(payload?.markYoutube?.latestVideoId) &&
      Number(payload?.markYoutube?.markResearchPoolCount || 0) >= 50 &&
      Number(payload?.markYoutube?.researchPoolCount || 0) >= Number(payload?.markYoutube?.markResearchPoolCount || 0),
    'Mark latest video/count are mapped from Foundation daily watch',
    `${payload?.markYoutube?.latestVideoId || 'missing'} / ${payload?.markYoutube?.markResearchPoolCount ?? 'missing'} of ${payload?.markYoutube?.researchPoolCount ?? 'missing'}`,
  )
  addCheck(checks, payload?.scout?.sourceRoute?.includes('getIntelligenceReportBundle'), 'scout source route is report-bundle backed', payload?.scout?.sourceRoute || 'missing')
  addCheck(checks, payload?.eyesQualityLoop?.sourceRoute?.includes(GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID) && list(payload?.eyesQualityLoop?.buildCandidates).length >= 1, 'Video/audio/visual candidates are exposed to Dev Hub', `${list(payload?.eyesQualityLoop?.buildCandidates).length} candidates`)
  const markCatchupRow = list(payload?.youtubeCreatorGodModeCatchup?.creators).find(row => row.creatorId === 'mark-kashef') || null
  addCheck(
    checks,
    payload?.markApiFullWatch?.sourceRoute?.includes(MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID) &&
      payload?.markApiFullWatch?.sourceRoute?.includes(MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID) &&
      list(payload?.markApiFullWatch?.buildCandidates).length >= 1 &&
      Number(payload?.counts?.apiFullWatchVideos || 0) === list(payload?.markApiFullWatch?.report?.apiWatchedVideoIds).length &&
      Number(payload?.counts?.apiFullWatchVideos || 0) === 44 &&
      Number(payload?.counts?.apiFullWatchVideos || 0) <= Number(markCatchupRow?.videoAudioVisualWatchedCount || 0),
    'Mark accepted API full-watch count does not overclaim represented catch-up evidence',
    `${payload?.counts?.apiFullWatchVideos || 0} accepted API videos / mark row ${markCatchupRow?.videoAudioVisualWatchedCount || 0} represented`,
  )
  addCheck(checks, payload?.director?.sourceRoute?.includes(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID) && list(payload?.director?.recommendedBuildNow).length >= 1, 'Dev Intelligence Director recommendations are exposed to Dev Hub', `${list(payload?.director?.recommendedBuildNow).length} recommendations`)
  addCheck(
    checks,
    moduleSource.includes('buildRankingProcessExplainer') &&
      payload?.rankingProcess?.status === 'ready' &&
      payload?.rankingProcess?.creatorRanking?.title === 'Creator ranking' &&
      payload?.rankingProcess?.ideaRanking?.title === 'Idea ranking' &&
      list(payload?.rankingProcess?.notScoredAsJudgment).includes('sourceTitle and sourceVideoTitle') &&
      list(payload?.rankingProcess?.notScoredAsJudgment).includes('source URL, host, or link text by itself') &&
      payload?.rankingProcess?.proofPosture?.sourceTitleDogfood?.includes('Provenance-only') &&
      payload?.rankingProcess?.externalWrites === false &&
      payload?.rankingProcess?.noAutoBacklogPromotion === true,
    'live Dev Hub exposes the creator/idea ranking process and no-hidden-metadata guardrails',
    `${payload?.rankingProcess?.currentCounts?.gradedCreators || 0} creators / ${payload?.rankingProcess?.currentCounts?.rankedIdeas || 0} ideas / ${list(payload?.rankingProcess?.notScoredAsJudgment).length} non-judgment fields`,
  )
  addCheck(
    checks,
    payload?.devOpportunityVisionLens?.status === 'ready' &&
      list(payload?.devOpportunityVisionLens?.opportunities).length >= 5 &&
      list(payload?.devOpportunityVisionLens?.opportunities).some(item => item.title === 'Browser Agent That Can Work') &&
      list(payload?.devOpportunityVisionLens?.opportunities).some(item => item.title === 'Extractor That Can Go Anywhere') &&
      list(payload?.devOpportunityVisionLens?.opportunities).some(item => item.title === 'Vibe Coding System For Steve' && Number(item.candidateCount || 0) >= 1 && item.operatorPlaybook?.status === 'ready_for_operator_review') &&
      payload?.devOpportunityVisionLens?.priorityLensRouter?.status === 'ready' &&
      payload?.devOpportunityVisionLens?.priorityLensRouter?.defaultLensId === 'current-sprint' &&
      list(payload?.devOpportunityVisionLens?.priorityLensRouter?.lenses).length >= 5 &&
      list(payload?.devOpportunityVisionLens?.priorityLensRouter?.lenses).some(item => item.lensId === 'marketing-recruiting') &&
      list(payload?.devOpportunityVisionLens?.priorityLensRouter?.lenses).some(item => item.lensId === 'vibe-coding-operator') &&
      list(payload?.devOpportunityVisionLens?.priorityLensRouter?.lenses).every(item => list(item.opportunities).length >= 1) &&
      payload?.devOpportunityVisionLens?.priorityLensRouter?.directorTop3ScoperReview?.status === 'ready' &&
      list(payload?.devOpportunityVisionLens?.priorityLensRouter?.directorTop3ScoperReview?.candidates).length === 3 &&
      list(payload?.devOpportunityVisionLens?.priorityLensRouter?.directorTop3ScoperReview?.candidates).every(item => text(item.whySelectedForScoper) && text(item.whyThisBeatsAlternatives) && item.scoperPromotion?.status === 'draft_candidate_no_auto_promotion') &&
      list(payload?.devOpportunityVisionLens?.opportunities).every(item => item.noAutoBacklogPromotion === true) &&
      payload?.devOpportunityVisionLens?.priorityLensRouter?.noAutoScoperPromotion === true &&
      payload?.devOpportunityVisionLens?.externalWrites === false,
    'live Dev Hub exposes selectable priority lens rankings from raw ranked ideas without promoting anything',
    `${list(payload?.devOpportunityVisionLens?.opportunities).length} opportunities / ${list(payload?.devOpportunityVisionLens?.priorityLensRouter?.lenses).length} lenses / ${payload?.devOpportunityVisionLens?.matchedCandidateCount || 0} matched signals`,
  )
  const priorityLensRows = list(payload?.devOpportunityVisionLens?.priorityLensRouter?.lenses)
  addCheck(
    checks,
    priorityLensRows.length >= 5 &&
      priorityLensRows.every(lens => list(lens.opportunities).length >= 1 && list(lens.opportunities).length <= 4) &&
      priorityLensRows.every(lens => list(lens.opportunities).every(item =>
        list(item.lensScores).length <= 5 &&
        list(item.importantSignals).length <= 3 &&
        !Object.prototype.hasOwnProperty.call(item, 'matchedCandidates') &&
        !Object.prototype.hasOwnProperty.call(item, 'candidateRows')
      )),
    'priority lens rankings use bounded compact opportunity previews',
    `${priorityLensRows.length} lenses / max ${Math.max(0, ...priorityLensRows.map(lens => list(lens.opportunities).length))} rows per lens`,
  )
  addCheck(checks, list(payload?.sourceValueGrader?.sourceGrades).length >= 3 && list(payload?.dailyWatch?.creators).length >= 3, 'live source cards can be built from multiple graded creators', `${list(payload?.sourceValueGrader?.sourceGrades).length} graded / ${list(payload?.dailyWatch?.creators).length} watched`)
  addCheck(
    checks,
    payload?.sourceValueGrader?.compacted === true &&
      list(payload?.sourceValueGrader?.sourceGrades).every(row => list(row.reportIds).length <= 5 && list(row.topCandidates).length <= 3) &&
      list(payload?.sourceValueGrader?.topDevBuildSources).every(row => list(row.reportIds).length <= 5 && list(row.topCandidates).length <= 3),
    'source-value grader rows are compact previews with full source counts preserved',
    `${list(payload?.sourceValueGrader?.sourceGrades).length} graded / ${list(payload?.sourceValueGrader?.topDevBuildSources).length} top sources`,
  )
  const youtubeCreatorLeaderboardCount = list(payload?.youtubeSourceIntelligence?.creatorLeaderboard).length
  const youtubeActiveCreatorCount = Number(payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0)
  const youtubeUngradedCreatorCount = Number(payload?.youtubeCreatorGodModeCatchup?.summary?.ungradedCount || 0)
  const sourceGradeCount = list(payload?.sourceValueGrader?.sourceGrades).length
  addCheck(
    checks,
    youtubeCreatorLeaderboardCount === sourceGradeCount &&
      youtubeCreatorLeaderboardCount <= youtubeActiveCreatorCount &&
      youtubeCreatorLeaderboardCount + youtubeUngradedCreatorCount >= youtubeActiveCreatorCount &&
      youtubeCreatorLeaderboardCount >= list(payload?.youtubeSourceIntelligence?.topCreators).length,
    'live YouTube source intelligence exposes active graded creator ranking plus preview rows',
    `active=${youtubeActiveCreatorCount}; graded=${youtubeCreatorLeaderboardCount}; sourceGrades=${sourceGradeCount}; ungraded=${youtubeUngradedCreatorCount}; preview=${list(payload?.youtubeSourceIntelligence?.topCreators).length}`,
  )
  const creatorSourceStacks = list(payload?.youtubeSourceIntelligence?.creatorSourceStacks)
  const creatorStacksWithSavedEvidence = creatorSourceStacks.filter(row => Number(row.savedEvidenceCount || 0) > 0)
  const creatorStackSurfacesWithSavedEvidence = creatorSourceStacks.flatMap(row =>
    Object.values(row.surfaces || {}).filter(surface => Number(surface.savedEvidenceCount || 0) > 0)
  )
  addCheck(
    checks,
    creatorSourceStacks.length === Number(payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || creatorSourceStacks.length) &&
      creatorSourceStacks.length >= list(payload?.youtubeSourceIntelligence?.topCreators).length &&
      creatorSourceStacks.some(row => Number(row.surfaces?.youtube?.watched || row.surfaces?.youtube?.read || 0) > 0) &&
      creatorSourceStacks.some(row =>
        Number(row.surfaces?.newsletters?.count || 0) > 0 ||
        Number(row.surfaces?.githubRepos?.count || 0) > 0 ||
        Number(row.surfaces?.freeCommunities?.count || 0) > 0
      ) &&
      creatorStacksWithSavedEvidence.length > 0 &&
      creatorStackSurfacesWithSavedEvidence.some(surface => surface.bestEvidence?.runner || Number(surface.pagesRead || 0) > 0) &&
      creatorSourceStacks.every(row => row.sourceStackPersistence?.noRawArtifactPaths === true),
    'live YouTube source intelligence exposes persisted creator source-stack evidence across YouTube, repos, newsletters, and communities',
    `${creatorSourceStacks.length}/${payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0} creator stacks; saved=${creatorStacksWithSavedEvidence.length}`,
  )
  addCheck(
    checks,
    Number(payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0) === list(payload?.youtubeCreatorGodModeCatchup?.creators).length &&
      Number(payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0) >= 30,
    'live YouTube catch-up payload includes all approved creators',
    `${list(payload?.youtubeCreatorGodModeCatchup?.creators).length}/${payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0} creators`
  )
  addCheck(
    checks,
    payload?.youtubeCreatorGodModeCatchup?.compacted === true &&
      Array.isArray(payload?.youtubeCreatorGodModeCatchup?.sourcePacketReviewQueue) &&
      list(payload?.youtubeCreatorGodModeCatchup?.sourcePacketReviewQueue).length === 0 &&
      Number(payload?.youtubeCreatorGodModeCatchup?.sourcePacketReviewQueueCount || 0) >= list(payload?.approvalReviewQueue).length,
    'YouTube catch-up keeps creator rows but removes duplicated source-packet queue payload',
    `${list(payload?.youtubeCreatorGodModeCatchup?.sourcePacketReviewQueue).length}/${payload?.youtubeCreatorGodModeCatchup?.sourcePacketReviewQueueCount || 0} queue rows returned`,
  )
  addCheck(checks, payload?.youtubeCreatorGodModeCatchup?.buildPromotionReadiness?.visibleToScoper === true && Number(payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0) >= 3, 'live Dev Hub exposes catch-up baseline gate for Scoper/build promotion', `${payload?.youtubeCreatorGodModeCatchup?.buildPromotionReadiness?.status || 'missing'} / ${payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0} creators`)
  addCheck(
    checks,
    Number(payload?.youtubeCreatorGodModeCatchup?.summary?.fullWatchReportCount || 0) >= 1 &&
      Number(payload?.youtubeCreatorGodModeCatchup?.summary?.sourceSopEvidenceVideoCount || 0) >= 1 &&
      list(payload?.youtubeCreatorGodModeCatchup?.creators).some(row => Number(row.sourceSopEvidence?.evidenceVideoCount || 0) >= 1),
    'live Dev Hub exposes evidence-backed YouTube SOP progress',
    `reports=${payload?.youtubeCreatorGodModeCatchup?.summary?.fullWatchReportCount || 0}; videos=${payload?.youtubeCreatorGodModeCatchup?.summary?.sourceSopEvidenceVideoCount || 0}`,
  )
  addCheck(
    checks,
    Number(payload?.youtubeCreatorGodModeCatchup?.summary?.fullWatchReportCount || 0) >= 40 &&
      Number(payload?.youtubeCreatorGodModeCatchup?.summary?.videoAudioVisualWatchedCount || 0) >= 350,
    'live Dev Hub catch-up numbers are not capped by the short recent-report feed',
    `reports=${payload?.youtubeCreatorGodModeCatchup?.summary?.fullWatchReportCount || 0}; watched=${payload?.youtubeCreatorGodModeCatchup?.summary?.videoAudioVisualWatchedCount || 0}`,
  )
  addCheck(
    checks,
    Number(payload?.youtubeCreatorGodModeCatchup?.summary?.sourcePacketActionCount || 0) >= list(payload?.approvalReviewQueue).length &&
      list(payload?.approvalReviewQueue).some(item => item.sourcePacketPreview?.sourcePacketId && item.sourcePacketValidation?.ok === true),
    'live Dev Hub exposes YouTube SOP source-packet review queue with validated previews',
    `actions=${payload?.youtubeCreatorGodModeCatchup?.summary?.sourcePacketActionCount || 0}; queue=${list(payload?.approvalReviewQueue).length}`,
  )
	  addCheck(
	    checks,
	    (() => {
	      const publicReviewRows = list(payload?.approvalReviewQueue).filter(item => item?.sourcePacketPreview?.runtimePlan?.runnableAfterPacket === true)
	      const publicReviewRowsAreUnsafe = publicReviewRows.every(item => /download|archive|binary/.test([
	        item?.reason,
	        item?.sourcePacketPreview?.reason,
	        item?.sourcePacketPreview?.currentResolverDisposition,
	        item?.sourcePacketPreview?.currentResolverStatus,
	      ].map(text).join(' ').toLowerCase()))
	      return list(payload?.approvalReviewQueue).length >= 1 &&
	      payload?.approvalReviewTriage?.totalReviewRows === list(payload?.approvalReviewQueue).length &&
	      list(payload?.approvalReviewTriage?.rows).some(row => row.bucketId === 'public_web') &&
	      list(payload?.approvalReviewTriage?.rows).some(row => row.bucketId === 'public_repos') &&
	      list(payload?.approvalReviewTriage?.rows).some(row => row.bucketId === 'paid_or_auth_gate') &&
	      list(payload?.approvalReviewTriage?.rows).some(row => row.bucketId === 'rejected_noise') &&
	      publicReviewRowsAreUnsafe &&
	      Number(payload?.approvalReviewTriage?.summary?.requiresAuthCount || 0) >= 1 &&
	      Number(payload?.approvalReviewTriage?.summary?.startsImmediatelyCount || 0) === 0 &&
	      Number(payload?.approvalReviewTriage?.summary?.startsFromApprovalActionCount || 0) === 0 &&
	      Number(payload?.approvalReviewTriage?.summary?.externalWriteCount || 0) === 0 &&
	      Number(payload?.approvalReviewTriage?.summary?.backlogWriteCount || 0) === 0
	    })(),
	    'live Dev Hub keeps safe public/free auto-read links out of approval review while unsafe public downloads stay approval-bound',
	    `rows=${payload?.approvalReviewTriage?.totalReviewRows || 0}; publicReview=${payload?.approvalReviewTriage?.summary?.runnableAfterPacketCount || 0}; auth=${payload?.approvalReviewTriage?.summary?.requiresAuthCount || 0}`,
	  )
  addCheck(
    checks,
    ['ready', 'not_loaded'].includes(text(payload?.sourcePacketWorkerQueue?.status)) &&
      ['ready', 'not_loaded'].includes(text(payload?.sourcePacketHandsQueue?.status)) &&
      payload?.sourcePacketWorkerQueue?.counts &&
      payload?.sourcePacketHandsQueue?.counts &&
      jsSource.includes('No approved source-packet rows are waiting for the exact public page worker') &&
      jsSource.includes('No approved source-packet rows are waiting for bounded browser Hands'),
    'live Dev Hub exposes empty worker/Hands queues as approval-state readback instead of missing runtime',
    `worker=${payload?.sourcePacketWorkerQueue?.counts?.ready || 0}/${payload?.sourcePacketWorkerQueue?.counts?.total || 0}; hands=${payload?.sourcePacketHandsQueue?.counts?.ready || 0}/${payload?.sourcePacketHandsQueue?.counts?.total || 0}`,
  )
  addCheck(checks, Number(payload?.extractionEconomics?.estimatedSpendUsd || 0) > 0 && Number(payload?.extractionEconomics?.costPerIdeaUsd || 0) > 0, 'live extraction economics calculate API spend and cost per idea', `$${Number(payload?.extractionEconomics?.estimatedSpendUsd || 0).toFixed(2)} / $${Number(payload?.extractionEconomics?.costPerIdeaUsd || 0).toFixed(2)} per idea`)
  const autopilotPlan = payload?.youtubeGodModeAutopilotPlan || {}
  const selectedAutopilotVideos = list(autopilotPlan.selectedVideos)
  const rejectedAutopilotVideos = list(autopilotPlan.rejectedVideos)
  const parkedStandardVideoCount = Number(payload?.youtubeSourceIntelligence?.summary?.parkedStandardVideoCount || 0)
  const selectedAutopilotRowsAreRenderable = selectedAutopilotVideos.every(video =>
    text(video.title) &&
    /^https:\/\/www\.youtube\.com\/watch\?v=/.test(text(video.url)) &&
    list(video.sourceSopReadiness).length === 8 &&
    list(video.sourceSopReadiness).every(step => text(step.label) && text(step.status))
  )
  const autopilotHasTruthfulNoEligibleState = text(autopilotPlan.status) === 'blocked' &&
    selectedAutopilotVideos.length === 0 &&
    (rejectedAutopilotVideos.length > 0 || parkedStandardVideoCount > 0) &&
    list(autopilotPlan.blockers).includes('no_eligible_videos_selected')
  addCheck(
    checks,
    autopilotPlan.reportOnly === true &&
      autopilotPlan.startsProviderCall === false &&
      autopilotPlan.runApprovalRequired === true &&
      (Number(autopilotPlan.candidateVideoCount || 0) >= 1 || parkedStandardVideoCount > 0) &&
      ((selectedAutopilotVideos.length >= 1 && selectedAutopilotRowsAreRenderable) || autopilotHasTruthfulNoEligibleState),
    'live Dev Hub exposes YouTube autopilot dry-run plan from catch-up candidates with SOP step readiness',
    `${selectedAutopilotVideos.length} selected / ${autopilotPlan.candidateVideoCount || 0} candidates / ${autopilotPlan.status || 'missing'}`,
  )
  addCheck(
    checks,
    (rejectedAutopilotVideos.length > selectedAutopilotVideos.length || parkedStandardVideoCount > 0) &&
      rejectedAutopilotVideos.every(video => text(video.reason)) &&
      Object.keys(payload?.youtubeSourceIntelligence?.rejectedReasonCounts || {}).length >= 1,
    'live Dev Hub exposes autopilot filtered candidates with exact rejection reasons',
    `${rejectedAutopilotVideos.length} rejected / ${parkedStandardVideoCount} parked / ${selectedAutopilotVideos.length} selected / reasons=${Object.keys(payload?.youtubeSourceIntelligence?.rejectedReasonCounts || {}).join(', ')}`,
  )
  addCheck(
    checks,
    payload?.youtubeSourceIntelligence?.title === 'YouTube Source Intelligence System' &&
      Number(payload?.youtubeSourceIntelligence?.summary?.creatorCount || 0) >= 30 &&
      Number(payload?.youtubeSourceIntelligence?.summary?.trackedMetadataCount || 0) >= 700 &&
      list(payload?.youtubeSourceIntelligence?.stages).length >= 7 &&
      list(payload?.youtubeSourceIntelligence?.stages).some(stage => stage.stageId === 'deep-visual') &&
      list(payload?.youtubeSourceIntelligence?.topCreators).length >= 3 &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.workingSteps).length >= 5 &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.openGaps).length >= 4 &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.nextBuilds).length >= 4,
    'live Dev Hub exposes YouTube as a full source intelligence system, not only a watcher',
    `${payload?.youtubeSourceIntelligence?.summary?.creatorCount || 0} creators / ${payload?.youtubeSourceIntelligence?.summary?.trackedMetadataCount || 0} videos / ${list(payload?.youtubeSourceIntelligence?.stages).length} stages`,
  )
  addCheck(
    checks,
    list(payload?.youtubeSourceIntelligence?.executiveSummary?.currentState).some(item => text(item).includes('Working now')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.currentState).some(item => text(item).includes('Repo readback')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.currentState).some(item => text(item).includes('Not yet automatic')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.openGaps).some(item => text(item).includes('Director does not yet hand')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.workingSteps).some(item => text(item.label).includes('New Creator Intake')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.openGaps).some(item => text(item).includes('seed video plus latest-10 baseline')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.openGaps).some(item => text(item).includes('long-course/full-training')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.nextBuilds).some(item => text(item).includes('YOUTUBE-LONG-COURSE-FULL-WATCH-LANE-001')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.nextBuilds).some(item => text(item).includes('YOUTUBE-DEEP-VISUAL-REVIEW-LANE-001')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.nextBuilds).some(item => text(item).includes('S/A continue to 20')) &&
      list(payload?.youtubeSourceIntelligence?.executiveSummary?.nextBuilds).some(item => text(item).includes('downstream workers')),
    'YouTube Intelligence includes plain-English current chain and next-build summary',
    payload?.youtubeSourceIntelligence?.executiveSummary?.title || 'missing',
  )
  const youtubeHandoffBucketIds = list(payload?.youtubeSourceIntelligence?.handoffBuckets).map(bucket => bucket.bucketId)
  const youtubeHandoffBucketById = Object.fromEntries(list(payload?.youtubeSourceIntelligence?.handoffBuckets)
    .map(bucket => [bucket.bucketId, bucket]))
  const skoolApprovalBoundaryHandoffEvidence = buildYoutubeHandoffEvidenceFromReports([
    {
      reportArtifactId: 'batch:youtube-latest-20:api-full-watch-v1:fixture-skool-approval-boundary',
      structuredOutputJson: {
        snapshot: {
          videoResults: [
            {
              video: {
                videoId: 'fixture-skool-boundary-video',
                title: 'Fixture Skool source boundary',
                creatorId: 'fixture-creator',
                creator: 'Fixture Creator',
              },
              resourceLinkSnapshot: {
                scoperPacket: {
                  approvalRequiredResourceLinks: [
                    {
                      url: 'https://skool.com/makerschool/about',
                      blocker: 'Community, course, member, paid, or login source needs explicit source-packet approval.',
                      allowedNextDecision: 'Approve exact source packet or reject.',
                      type: 'approval_required_resource_link',
                    },
                  ],
                  unresolvedPublicResourceLinks: [
                    {
                      url: 'https://www.skool.com/chase-ai-community/about',
                      label: 'Free Skool community public about page',
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
  ])
  const skoolApprovalBoundaryPaidRows = list(skoolApprovalBoundaryHandoffEvidence?.buckets?.['paid-auth-gates']?.items)
  const skoolApprovalBoundaryFreeRows = list(skoolApprovalBoundaryHandoffEvidence?.buckets?.['free-communities']?.items)
  addCheck(
    checks,
    [
      'public-web-resources',
      'public-code-repos',
      'free-communities',
      'creator-newsletters',
      'products-tools-to-approve',
      'paid-auth-gates',
      'build-scoper',
    ].every(bucketId => youtubeHandoffBucketIds.includes(bucketId)) &&
      list(payload?.youtubeSourceIntelligence?.handoffBuckets).every(bucket => text(bucket.description) && text(bucket.route)),
    'YouTube Intelligence routes discoveries into downstream handoff buckets',
    youtubeHandoffBucketIds.join(', ') || 'missing',
  )
  addCheck(
    checks,
    skoolApprovalBoundaryPaidRows.some(row =>
      row.url === 'https://skool.com/makerschool/about' &&
      row.disposition === 'approval_required_resource' &&
      row.blocker.includes('explicit source-packet approval')
    ) &&
      skoolApprovalBoundaryFreeRows.some(row =>
        row.url === 'https://www.skool.com/chase-ai-community/about' &&
        row.disposition === 'unresolved_public_resource'
      ) &&
      !skoolApprovalBoundaryFreeRows.some(row => row.url.includes('makerschool')),
    'approval-required Skool/community links route to paid/auth while explicit free community links stay in the free-community lane',
    JSON.stringify({
      paid: skoolApprovalBoundaryPaidRows.map(row => `${row.url}:${row.disposition}`),
      free: skoolApprovalBoundaryFreeRows.map(row => `${row.url}:${row.disposition}`),
    }),
  )
  addCheck(
    checks,
    Number(youtubeHandoffBucketById['public-web-resources']?.count || 0) > 0 &&
      Number(youtubeHandoffBucketById['public-code-repos']?.count || 0) > 0 &&
      Number(youtubeHandoffBucketById['free-communities']?.count || 0) > 0 &&
      Number(youtubeHandoffBucketById['creator-newsletters']?.count || 0) > 0 &&
      Number(payload?.youtubeSourceIntelligence?.handoffEvidence?.scannedReportCount || 0) >= 20,
    'YouTube handoff counts read from the full watched-video evidence spine, not only the approval queue',
    `reports=${payload?.youtubeSourceIntelligence?.handoffEvidence?.scannedReportCount || 0} / public=${youtubeHandoffBucketById['public-web-resources']?.count || 0} / repos=${youtubeHandoffBucketById['public-code-repos']?.count || 0} / free=${youtubeHandoffBucketById['free-communities']?.count || 0} / newsletters=${youtubeHandoffBucketById['creator-newsletters']?.count || 0}`,
  )
  const sourceGodModeHandoffQueue = payload?.youtubeSourceIntelligence?.sourceGodModeHandoffQueue || {}
  const sourceGodModeRows = list(sourceGodModeHandoffQueue.rows)
  const sourceGodModeBucketCounts = sourceGodModeHandoffQueue.bucketCounts || {}
  const sourceGodModeRunnableCount = Number(sourceGodModeHandoffQueue.counts?.runnableRows || 0)
  const sourceGodModeBrowserChallengeFallbackCount = Number(sourceGodModeHandoffQueue.counts?.browserChallengeFallbackRows || 0)
  const sourceGodModeBrowserChallengeFallbackReview = sourceGodModeHandoffQueue.browserChallengeFallbackReview || {}
  const sourceSessionPrepQueue = sourceGodModeHandoffQueue.sourceSessionPrepQueue || {}
  const sourceRunSummary = sourceGodModeHandoffQueue.sourceRunSummary || {}
  const sourceSessionPrepRows = list(sourceSessionPrepQueue.rows)
  const sourceSessionActionGroups = list(sourceSessionPrepQueue.actionGroups)
  const sourceSessionReadinessChecks = sourceSessionActionGroups
    .flatMap(group => list(group.readiness?.checks))
  const sourceSessionPrepFreeCommunityRowCount = Number(sourceSessionPrepQueue.counts?.freeCommunityRows || 0)
  const sourceSessionPrepHasFreeCommunityRows = sourceSessionPrepFreeCommunityRowCount > 0
  const sourceSessionPrepHasCommunityRunnerRows = Number(sourceSessionPrepQueue.phaseCounts?.community_runner_needed || 0) > 0
  const sourceGodModeTotalRows = Number(sourceGodModeHandoffQueue.counts?.totalRows || 0)
  const sourceGodModeEvidenceRows = Number(sourceGodModeHandoffQueue.counts?.evidenceRows || 0)
  const sourceGodModeDuplicateRows = Number(sourceGodModeHandoffQueue.counts?.duplicateRows || 0)
  const sourceGodModeEvidenceAccountedFor = sourceGodModeTotalRows > 0 &&
    sourceGodModeEvidenceRows === sourceGodModeTotalRows + sourceGodModeDuplicateRows
  const sourceGodModeCleared = sourceGodModeRunnableCount === 0 &&
    Number(sourceGodModeHandoffQueue.counts?.publicFreeRuntimeRows || 0) === 0 &&
    Number(sourceGodModeHandoffQueue.counts?.freeCommunityRows || 0) === 0 &&
    Number(sourceGodModeHandoffQueue.counts?.rowsWithRunCommand || 0) === 0 &&
    Number(sourceGodModeHandoffQueue.counts?.alreadyRunRows || 0) > 0
  const sourceGodModeHasRunnableWork = sourceGodModeRunnableCount > 0 &&
    sourceGodModeRows.some(row => ['source:god-mode', 'repo:deep-review'].includes(row.runner) && row.runnable === true) &&
    sourceGodModeRows.filter(row => row.runnable === true).every(row => text(row.runCommand))
  const freeCommunitiesParkedForSessionBroker = sourceGodModeRows
    .filter(row => row.bucketId === 'free-communities')
    .every(row => [
      'already_run_source_evidence_saved',
      'ready_for_public_community_bridge_read',
      'blocked_free_community_session_broker_required',
      'blocked_non_skool_community_bridge',
      'blocked_free_community_form_auth_or_action_surface',
      'blocked_short_link_expansion_needed',
      'previous_source_run_failed_needs_review',
      'previous_source_run_browser_challenge_needs_fallback',
      'previous_clean_retry_operator_escalation_required',
      'previous_clean_retry_hosted_fallback_required',
    ].includes(row.status))
  const freeCommunityRowsRequiringSessionBroker = sourceGodModeRows
    .filter(row => row.bucketId === 'free-communities')
    .filter(row => row.status === 'blocked_free_community_session_broker_required' || row.requiresSessionBroker === true)
  const freeCommunitySessionBrokerDecisionsVisible = freeCommunityRowsRequiringSessionBroker
    .every(row =>
      row.sourceSessionBroker?.account === 'ai@bensoncrew.ca' &&
      row.sourceSessionBroker?.sourceFamily === 'skool_free_community' &&
      row.sourceSessionBroker?.rawSecretPrinted === false
    )
  const freeCommunityBridgeRowsAreSafe = sourceGodModeRows
    .filter(row => row.status === 'ready_for_public_community_bridge_read')
    .every(row =>
      row.runner === 'source:god-mode' &&
      row.sourceType === 'public_community_bridge' &&
      row.requiresSessionBroker !== true &&
      row.runnable === true &&
      text(row.runCommand)
    )
  addCheck(
    checks,
    sourceGodModeHandoffQueue.status === 'ready' &&
      sourceGodModeEvidenceAccountedFor &&
      Number.isFinite(sourceGodModeDuplicateRows) &&
      jsSource.includes('duplicate variants folded') &&
      Object.values(sourceGodModeBucketCounts).every(bucket => bucket.hasMore === false) &&
      Number(sourceGodModeHandoffQueue.counts?.parkedRows || 0) > 0 &&
      sourceGodModeRows.some(row => row.requiresAuth === true && row.runnable === false) &&
      freeCommunitiesParkedForSessionBroker &&
      freeCommunitySessionBrokerDecisionsVisible &&
      freeCommunityBridgeRowsAreSafe &&
      (sourceGodModeCleared || sourceGodModeHasRunnableWork),
    'YouTube handoff exposes source-browser run state honestly while paid/auth and session-bound communities stay parked or routed to safe public bridge reads',
    `ready=${sourceGodModeRunnableCount}; total=${sourceGodModeTotalRows}; evidence=${sourceGodModeEvidenceRows}; duplicates=${sourceGodModeDuplicateRows}; alreadyRun=${sourceGodModeHandoffQueue.counts?.alreadyRunRows || 0}; parked=${sourceGodModeHandoffQueue.counts?.parkedRows || 0}`,
  )
  addCheck(
    checks,
    sourceGodModeHandoffQueue.rowsArePreview === true &&
      sourceGodModeRows.length === Number(sourceGodModeHandoffQueue.counts?.previewRows || 0) &&
      sourceGodModeRows.length < Number(sourceGodModeHandoffQueue.counts?.totalRows || 0) &&
      sourceGodModeRows.some(row => row.status === 'already_run_source_evidence_saved') &&
      sourceGodModeRows.some(row => row.requiresAuth === true),
    'Dev Hub source-browser queue returns bounded preview rows while preserving full counts',
    `preview=${sourceGodModeRows.length}; total=${sourceGodModeHandoffQueue.counts?.totalRows || 0}`,
  )
  addCheck(
    checks,
    Number(sourceGodModeHandoffQueue.counts?.alreadyRunRows || 0) > 0 &&
      sourceGodModeRows.some(row => row.status === 'already_run_source_evidence_saved' && row.runnable === false),
    'YouTube handoff readback marks source-browser rows already persisted',
    `alreadyRun=${sourceGodModeHandoffQueue.counts?.alreadyRunRows || 0}; total=${sourceGodModeHandoffQueue.counts?.totalRows || 0}`,
  )
  addCheck(
    checks,
    sourceGodModeBrowserChallengeFallbackCount > 0,
    'YouTube handoff readback surfaces saved browser challenges as fallback work instead of completed evidence',
    `browserChallengeFallback=${sourceGodModeBrowserChallengeFallbackCount}; alreadyRun=${sourceGodModeHandoffQueue.counts?.alreadyRunRows || 0}; parked=${sourceGodModeHandoffQueue.counts?.parkedRows || 0}`,
  )
  addCheck(
    checks,
    sourceGodModeBrowserChallengeFallbackReview.status === 'needs_source_browser_fallback' &&
      Number(sourceGodModeBrowserChallengeFallbackReview.totalRows || 0) === sourceGodModeBrowserChallengeFallbackCount &&
      Number(sourceGodModeBrowserChallengeFallbackReview.sourceSessionRequiredRows || 0) >= 0 &&
      Object.keys(sourceGodModeBrowserChallengeFallbackReview.fallbackRouteCounts || {}).length > 0 &&
      list(sourceGodModeBrowserChallengeFallbackReview.rows).length > 0 &&
      list(sourceGodModeBrowserChallengeFallbackReview.rows).every(row =>
        row.runnable === false &&
        row.parked === true &&
        text(row.reason) &&
        text(row.nextAction) &&
        row.fallbackPlan?.status === 'browser_challenge_fallback_required' &&
        row.fallbackPlan?.normalChromeProfileAllowed === false &&
        text(row.fallbackPlan?.route) &&
        text(row.fallbackPlan?.firstStep) &&
        row.fallbackPlan?.recoveryPolicy?.mode === 'bounded_self_recovery_then_human_escalation' &&
        row.fallbackPlan?.recoveryPolicy?.humanEscalation?.channel === 'harlan_telegram_operator_lane' &&
        row.fallbackPlan?.operatorEscalation?.status === 'prepared_dry_run' &&
        row.fallbackPlan?.operatorEscalation?.notification?.primaryChannel === 'telegram' &&
        row.fallbackPlan?.operatorEscalation?.sendsMessageNow === false
      ) &&
      list(sourceGodModeBrowserChallengeFallbackReview.topHosts).length > 0 &&
      jsSource.includes('renderBrowserChallengeFallbackReview') &&
      jsSource.includes('fallbackRouteCounts') &&
      /not counted as completed source evidence/i.test(sourceGodModeBrowserChallengeFallbackReview.plainEnglish || ''),
    'Dev Hub shows browser-challenge fallback examples with structured route and next action instead of only a hidden count',
    `fallback=${sourceGodModeBrowserChallengeFallbackReview.totalRows || 0}; examples=${list(sourceGodModeBrowserChallengeFallbackReview.rows).length}; hosts=${list(sourceGodModeBrowserChallengeFallbackReview.topHosts).map(row => row.host).slice(0, 4).join(', ')}`,
  )
  addCheck(
    checks,
    SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT >= 1000 &&
      routeSource.includes('SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT') &&
      scriptSource.includes('SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT') &&
      sourceHandoffRunnerSource.includes('SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT'),
    'Dev Hub and source handoff runner share the same source-run readback limit',
    `limit=${SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT}`,
  )
  addCheck(
    checks,
    [
      'public-web-resources',
      'public-code-repos',
      'creator-newsletters',
      'free-communities',
      'products-tools-to-approve',
      'paid-auth-gates',
    ].every(bucketId => sourceGodModeBucketCounts[bucketId]) &&
      Object.values(sourceGodModeBucketCounts).every(bucket =>
        Number.isFinite(Number(bucket.runnableRows || 0)) &&
        Number.isFinite(Number(bucket.parkedRows || 0)) &&
        Number.isFinite(Number(bucket.alreadyRunRows || 0)) &&
        Number.isFinite(Number(bucket.rowsWithRunCommand || 0))
      ),
    'YouTube source-browser queue exposes per-bucket readiness so communities/repos/newsletters are not hidden behind mixed rows',
    Object.entries(sourceGodModeBucketCounts).map(([bucketId, bucket]) => `${bucketId}:ready=${bucket.runnableRows || 0}/read=${bucket.alreadyRunRows || 0}/parked=${bucket.parkedRows || 0}`).join(' | ') || 'missing',
  )
  addCheck(
    checks,
    sourceSessionPrepQueue.status === 'waiting_for_source_session_or_approval' &&
      sourceSessionPrepFreeCommunityRowCount >= 0 &&
      Number(sourceSessionPrepQueue.counts?.newsletterSignupRows || 0) > 0 &&
      Number(sourceSessionPrepQueue.counts?.paidAuthRows || 0) > 0 &&
      Number(sourceSessionPrepQueue.counts?.clusterCount || 0) > 0 &&
      Number(sourceSessionPrepQueue.counts?.previewClusters || 0) > 0 &&
      Number(sourceSessionPrepQueue.counts?.actionGroupCount || 0) > 0 &&
      Number(sourceSessionPrepQueue.counts?.readinessCheckCount || 0) === sourceSessionReadinessChecks.length &&
      Number(sourceSessionPrepQueue.counts?.credentialReadinessCheckCount || 0) > 0 &&
      Number(sourceSessionPrepQueue.counts?.runAllowedNowRows || 0) === 0 &&
      Number(sourceSessionPrepQueue.counts?.rawSecretPrintedRows || 0) === 0 &&
      (!sourceSessionPrepHasFreeCommunityRows || Number(sourceSessionPrepQueue.phaseCounts?.free_source_identity_session_needed || 0) > 0) &&
      (
        Number(sourceSessionPrepQueue.phaseCounts?.newsletter_signup_lane_needed || 0) > 0 ||
        Number(sourceSessionPrepQueue.phaseCounts?.newsletter_live_signup_approval_needed || 0) > 0 ||
        Number(sourceSessionPrepQueue.phaseCounts?.newsletter_intake_review_needed || 0) > 0
      ) &&
      Number(sourceSessionPrepQueue.phaseCounts?.paid_or_auth_packet_needed || 0) > 0 &&
      list(sourceSessionPrepQueue.clusters).length === Number(sourceSessionPrepQueue.counts?.previewClusters || 0) &&
      list(sourceSessionPrepQueue.clusters).every(cluster => Number(cluster.totalRows || 0) >= 1 && Number(cluster.rawSecretPrintedRows || 0) === 0) &&
      (!sourceSessionPrepHasFreeCommunityRows || list(sourceSessionPrepQueue.clusters).some(cluster => /skool\.com\/[^/]+/.test(cluster.label || ''))) &&
      (!sourceSessionPrepHasCommunityRunnerRows || list(sourceSessionPrepQueue.clusters).some(cluster => cluster.phase === 'community_runner_needed')) &&
      list(sourceSessionPrepQueue.clusters).some(cluster => cluster.phase === 'paid_or_auth_packet_needed') &&
      sourceSessionActionGroups.length === Number(sourceSessionPrepQueue.counts?.actionGroupCount || 0) &&
      (!sourceSessionPrepHasFreeCommunityRows || sourceSessionActionGroups.some(group => group.phase === 'free_source_identity_session_needed' && group.nextAction?.includes('ai@bensoncrew.ca'))) &&
      sourceSessionActionGroups.some(group =>
        (group.phase === 'newsletter_signup_lane_needed' && group.nextAction?.includes('dry-run')) ||
        (group.phase === 'newsletter_live_signup_approval_needed' && group.nextAction?.includes('Steve')) ||
        (group.phase === 'newsletter_intake_review_needed' && group.nextAction?.includes('Review'))
      ) &&
      sourceSessionActionGroups.some(group => group.phase === 'paid_or_auth_packet_needed' && group.nextAction?.includes('Steve')) &&
      sourceSessionActionGroups.every(group => Number(group.rawSecretPrintedRows || 0) === 0 && Number(group.totalRows || 0) >= 1 && list(group.topUrls).length >= 1) &&
      (!sourceSessionPrepHasFreeCommunityRows || sourceSessionReadinessChecks.some(check => /credentials:vault -- source:status/.test(check.statusCommand || ''))) &&
      sourceSessionReadinessChecks.some(check => /newsletter:intake/.test(check.statusCommand || '')) &&
      sourceSessionReadinessChecks.every(check => check.rawSecretPrinted === false && check.externalActionStarted === false) &&
      (!sourceSessionPrepHasFreeCommunityRows || sourceSessionPrepRows.some(row => row.phase === 'free_source_identity_session_needed')) &&
      (!sourceSessionPrepHasCommunityRunnerRows || sourceSessionPrepRows.some(row => row.phase === 'community_runner_needed')) &&
      sourceSessionPrepRows.some(row => [
        'newsletter_signup_lane_needed',
        'newsletter_live_signup_approval_needed',
        'newsletter_intake_review_needed',
      ].includes(row.phase)) &&
      sourceSessionPrepRows.some(row => row.phase === 'paid_or_auth_packet_needed') &&
      sourceSessionPrepQueue.sideEffects?.externalWrites === false &&
      jsSource.includes('actionGroups') &&
      jsSource.includes('primaryNextAction') &&
      jsSource.includes('renderSourceSessionReadiness') &&
      jsSource.includes('yt-session-cluster-grid') &&
      cssSource.includes('.yt-session-readiness') &&
      cssSource.includes('.yt-session-cluster-grid'),
    'YouTube source-browser queue exposes clustered action groups and metadata-only source-session readiness without claiming live signups or auth runs',
    JSON.stringify(sourceSessionPrepQueue.counts || {}),
  )
  const repoReadback = sourceRunSummary.repoReadback || {}
  const repoDeepReviewRows = list(repoReadback.deepReviewQueue?.rows)
  const repoImplementationRows = list(repoReadback.implementationPackets?.rows)
  const repoTopRows = list(repoReadback.topRepos)
  const repoRowsWithImplementationPatterns = [
    ...repoDeepReviewRows,
    ...repoImplementationRows,
    ...repoTopRows,
  ].filter(row => list(row.implementationPatternTitles).length > 0)
  const repoRowsAlreadyDeepReviewed = [
    ...repoDeepReviewRows,
    ...repoImplementationRows,
  ].filter(row => row.alreadyDeepReviewed === true)
  addCheck(
    checks,
    sourceRunSummary.status === 'ready' &&
      Number(sourceRunSummary.totalRuns || 0) > 0 &&
      Number(sourceRunSummary.succeededRuns || 0) > 0 &&
      Number(sourceRunSummary.pagesRead || 0) > 0 &&
      Number(sourceRunSummary.freeResourceCaptures || 0) > 0 &&
      Number(sourceRunSummary.unsafeSideEffectRows || 0) === 0 &&
      list(sourceRunSummary.bucketSummaries).length >= 3 &&
      list(sourceRunSummary.topRuns).some(row => Number(row.score || 0) > 0) &&
      repoReadback.status === 'ready' &&
      Number(repoReadback.uniqueRepoCount || 0) > 0 &&
      Number(repoReadback.runCount || 0) > 0 &&
      Number(repoReadback.unsafeSideEffectRows || 0) === 0 &&
      repoReadback.rawArtifactPathsReturned === false &&
      ['ready', 'pending_next_repo_run'].includes(repoReadback.runtimeProofStatus) &&
      repoReadback.deepReviewQueue?.status === 'ready' &&
      repoReadback.deepReviewQueue?.policy?.includes('no_clone_install_download_import') &&
      repoDeepReviewRows.some(row => row.label && Number(row.priorityScore || 0) > 0) &&
      repoReadback.implementationPackets?.status === 'ready' &&
      repoReadback.implementationPackets?.policy?.includes('no_clone_install_download_import') &&
      repoImplementationRows.some(row => row.packetId && row.completeness && list(row.reviewChecklist).length >= 4) &&
      repoTopRows.some(row => row.label && Number(row.pagesRead || 0) > 0) &&
      repoRowsWithImplementationPatterns.length > 0 &&
      repoRowsAlreadyDeepReviewed.length > 0 &&
      repoReadback.plainEnglish?.includes('repo deep-review evidence') &&
      repoReadback.plainEnglish?.includes('does not clone') &&
      repoReadback.nextAction?.includes('before any Scoper promotion') &&
      sourceRunSummary.fileResourceReadback?.status &&
      sourceRunSummary.fileResourceReadback?.rawArtifactPathsReturned === false &&
      Number(sourceRunSummary.fileResourceReadback?.downloadAllowedCount || 0) === 0 &&
      moduleSource.includes('dev-source-run-readback') &&
      sourceRunReadbackSource.includes('buildRepoRunReadback') &&
      sourceRunReadbackSource.includes('repoReview') &&
      sourceRunReadbackSource.includes('buildRepoDeepReviewQueue') &&
      sourceRunReadbackSource.includes('buildRepoImplementationPackets') &&
      sourceRunReadbackSource.includes('repo:deep-review') &&
      sourceRunReadbackSource.includes('buildFileResourceReadback') &&
      packageJson.scripts?.['repo:deep-review'] === 'node --env-file-if-exists=.env scripts/run-public-repo-deep-review.mjs' &&
      jsSource.includes('renderSourceRunSummary') &&
      jsSource.includes('REPO READBACK') &&
      jsSource.includes('Repo runtime proof') &&
      jsSource.includes('REPO DEEP-REVIEW QUEUE') &&
      jsSource.includes('REPO IMPLEMENTATION PACKETS') &&
      jsSource.includes('FILE RESOURCE CANDIDATES') &&
      cssSource.includes('.yt-source-run-summary') &&
      cssSource.includes('.yt-source-run-grid.compact') &&
      cssSource.includes('.yt-repo-readback') &&
      cssSource.includes('.yt-file-readback'),
    'YouTube source-browser saved-run outputs include repo implementation-pattern and file-resource readback without returning raw artifacts',
    `runs=${sourceRunSummary.totalRuns || 0}; repos=${repoReadback.uniqueRepoCount || 0}; patterns=${repoRowsWithImplementationPatterns.length}; deepReviewed=${repoRowsAlreadyDeepReviewed.length}; pages=${sourceRunSummary.pagesRead || 0}; resources=${sourceRunSummary.freeResourceCaptures || 0}; files=${sourceRunSummary.fileResourceReadback?.uniqueCandidateCount || 0}`,
  )
  addCheck(
    checks,
    sourceGodModeHandoffQueue.devLanePriorityPreview?.status === 'priority_preview' &&
      sourceGodModeHandoffQueue.devLanePriorityPreview?.plainEnglish?.includes('Priority only') &&
      sourceGodModeRows.some(row => row.devLanePriority?.priorityLabel) &&
      sourceGodModeRows.every(row => !row.devLaneCleanup) &&
      jsSource.includes('renderYoutubeDevPriorityPreview') &&
      !jsSource.includes('C/D source suppression preview'),
    'YouTube source handoff ranks links by creator source strength instead of suppressing C/D evidence',
    `${sourceGodModeHandoffQueue.devLanePriorityPreview?.prioritizedRows || 0} prioritized / ${sourceGodModeHandoffQueue.devLanePriorityPreview?.reviewRows || 0} review`,
  )
  addCheck(checks, list(payload?.approvalReviewQueue).length >= 1 && list(payload?.approvalReviewQueue).every(item => /^https?:\/\//i.test(text(item.url)) && item.decisionNeeded), 'live snapshot exposes actionable link review rows', `${list(payload?.approvalReviewQueue).length} approval rows`)
  addCheck(checks, list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'public-builder-communities') && list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'github-public-repos') && list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'creator-newsletters') && list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'skool-free-communities'), 'source coverage includes planned GitHub, newsletters, free Skool, and public builder communities', `${list(payload?.sourceCoverage?.rows).length} families`)
  addCheck(checks, list(payload?.activeExtractionLanes).some(lane => lane.laneId === 'meetings-transcripts') && list(payload?.activeExtractionLanes).some(lane => lane.laneId === 'email-missive-comms') && list(payload?.activeExtractionLanes).some(lane => lane.laneId === 'slack-comms'), 'active extraction lanes expose internal Foundation signals', list(payload?.activeExtractionLanes).map(lane => lane.laneId).join(', ') || 'missing')
  addCheck(checks, payload?.godModeExtractorParity?.evaluation?.ok === true && list(payload?.godModeExtractorParity?.families).length >= 14 && Number(payload?.godModeExtractorParity?.summary?.claimsGodModeCount || 0) === 0, 'live snapshot exposes extractor parity without false full-God-Mode claims', `${list(payload?.godModeExtractorParity?.families).length} families / claims=${payload?.godModeExtractorParity?.summary?.claimsGodModeCount ?? 'missing'}`)
  addCheck(checks, Array.isArray(payload?.sourceRoutes) && payload.sourceRoutes.length >= 5, 'visible value source map is present', `${payload?.sourceRoutes?.length || 0} routes`)
  const payloadBytes = Buffer.byteLength(JSON.stringify(payload || {}))
  addCheck(checks, payloadBytes < 4_000_000, 'Dev Hub payload stays under the 4 MB operator budget', `${payloadBytes} bytes`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: DEV_TEAM_HUB_V0_CARD_ID,
    apiRoute: DEV_TEAM_HUB_V0_API_ROUTE,
    pageRoute: DEV_TEAM_HUB_V0_PAGE_ROUTE,
    visibleNumbers: buildVisibleNumbers(payload || {}),
    snapshot: payload ? {
      status: payload.status,
      sourceNeeds: payload.sourceNeeds || [],
      counts: payload.counts,
      markApiFullWatch: {
        model: payload.markApiFullWatch?.model,
        batchRunId: payload.markApiFullWatch?.batchRunId,
        buildCandidates: list(payload.markApiFullWatch?.buildCandidates).length,
        videoResults: list(payload.markApiFullWatch?.videoResults).length,
      },
      markYoutube: payload.markYoutube,
      director: {
        status: payload.director?.status,
        recommendedBuildNow: list(payload.director?.recommendedBuildNow).length,
      },
      sourceValueGrader: {
        status: payload.sourceValueGrader?.status,
        sourceGrades: list(payload.sourceValueGrader?.sourceGrades).length,
        topDevBuildSources: list(payload.sourceValueGrader?.topDevBuildSources).length,
      },
      youtubeCreatorGodModeCatchup: payload.youtubeCreatorGodModeCatchup ? {
        status: payload.youtubeCreatorGodModeCatchup.status,
        summary: payload.youtubeCreatorGodModeCatchup.summary,
        buildPromotionReadiness: payload.youtubeCreatorGodModeCatchup.buildPromotionReadiness,
      } : null,
      youtubeGodModeAutopilotPlan: payload.youtubeGodModeAutopilotPlan ? {
        status: payload.youtubeGodModeAutopilotPlan.status,
        selectedVideos: list(payload.youtubeGodModeAutopilotPlan.selectedVideos).length,
        rejectedVideos: list(payload.youtubeGodModeAutopilotPlan.rejectedVideos).length,
        candidateVideoCount: payload.youtubeGodModeAutopilotPlan.candidateVideoCount,
        budget: payload.youtubeGodModeAutopilotPlan.budget,
        blockers: payload.youtubeGodModeAutopilotPlan.blockers,
        reportOnly: payload.youtubeGodModeAutopilotPlan.reportOnly,
      } : null,
      youtubeSourceIntelligence: payload.youtubeSourceIntelligence ? {
        status: payload.youtubeSourceIntelligence.status,
        summary: payload.youtubeSourceIntelligence.summary,
        stages: list(payload.youtubeSourceIntelligence.stages).map(stage => ({ stageId: stage.stageId, status: stage.status, summary: stage.summary })),
        handoffBuckets: list(payload.youtubeSourceIntelligence.handoffBuckets).map(bucket => ({ bucketId: bucket.bucketId, count: bucket.count, status: bucket.status })),
        handoffEvidence: payload.youtubeSourceIntelligence.handoffEvidence ? {
          scannedReportCount: payload.youtubeSourceIntelligence.handoffEvidence.scannedReportCount,
          buckets: Object.fromEntries(Object.entries(payload.youtubeSourceIntelligence.handoffEvidence.buckets || {})
            .map(([bucketId, bucket]) => [bucketId, { count: bucket.count, sampleHosts: bucket.sampleHosts }])),
        } : null,
        sourceGodModeHandoffQueue: payload.youtubeSourceIntelligence.sourceGodModeHandoffQueue ? {
          status: payload.youtubeSourceIntelligence.sourceGodModeHandoffQueue.status,
          counts: payload.youtubeSourceIntelligence.sourceGodModeHandoffQueue.counts,
          sourceSessionPrepQueue: payload.youtubeSourceIntelligence.sourceGodModeHandoffQueue.sourceSessionPrepQueue ? {
            status: payload.youtubeSourceIntelligence.sourceGodModeHandoffQueue.sourceSessionPrepQueue.status,
            counts: payload.youtubeSourceIntelligence.sourceGodModeHandoffQueue.sourceSessionPrepQueue.counts,
          } : null,
        } : null,
        selectedVideos: list(payload.youtubeSourceIntelligence.selectedVideos).length,
        creatorLeaderboard: list(payload.youtubeSourceIntelligence.creatorLeaderboard).length,
        topCreators: list(payload.youtubeSourceIntelligence.topCreators).length,
        readbackTruth: payload.youtubeSourceIntelligence.readbackTruth,
        executiveSummary: payload.youtubeSourceIntelligence.executiveSummary ? {
          title: payload.youtubeSourceIntelligence.executiveSummary.title,
          workingSteps: list(payload.youtubeSourceIntelligence.executiveSummary.workingSteps).length,
          openGaps: list(payload.youtubeSourceIntelligence.executiveSummary.openGaps).length,
          nextBuilds: list(payload.youtubeSourceIntelligence.executiveSummary.nextBuilds).length,
        } : null,
      } : null,
      extractionEconomics: payload.extractionEconomics,
      actionRouteReadback: payload.actionRouteReadback ? {
        status: payload.actionRouteReadback.status,
        summary: payload.actionRouteReadback.summary,
        harlanDigest: {
          status: payload.actionRouteReadback.harlanDigest?.status,
          sendsMessageNow: payload.actionRouteReadback.harlanDigest?.sendsMessageNow,
          itemCount: list(payload.actionRouteReadback.harlanDigest?.items).length,
        },
        applySafety: {
          status: payload.actionRouteReadback.applySafety?.status,
          autoApplyAllowed: payload.actionRouteReadback.applySafety?.autoApplyAllowed,
          itemCount: list(payload.actionRouteReadback.applySafety?.items).length,
        },
      } : null,
      foundationDoneBar: payload.foundationDoneBar ? {
        status: payload.foundationDoneBar.status,
        summary: payload.foundationDoneBar.summary,
        topGaps: list(payload.foundationDoneBar.topGaps).slice(0, 5),
      } : null,
      scoperEvidenceTraceReadback: payload.scoperEvidenceTraceReadback ? {
        status: payload.scoperEvidenceTraceReadback.status,
        summary: payload.scoperEvidenceTraceReadback.summary,
        candidates: list(payload.scoperEvidenceTraceReadback.candidates).map(candidate => ({
          rank: candidate.rank,
          title: candidate.title,
          sourceTraceStatus: candidate.sourceTraceStatus,
          scoperStatus: candidate.scoperStatus,
          readyForPortfolio: candidate.readyForPortfolio,
        })),
      } : null,
      intelligenceHygieneReadback: payload.intelligenceHygieneReadback ? {
        status: payload.intelligenceHygieneReadback.status,
        summary: payload.intelligenceHygieneReadback.summary,
        nextBuckets: payload.intelligenceHygieneReadback.nextBuckets,
      } : null,
      approvalReviewQueue: list(payload.approvalReviewQueue).slice(0, 5),
      approvalReviewTriage: payload.approvalReviewTriage ? {
        totalReviewRows: payload.approvalReviewTriage.totalReviewRows,
        summary: payload.approvalReviewTriage.summary,
        rows: list(payload.approvalReviewTriage.rows).map(row => ({ bucketId: row.bucketId, count: row.count })).slice(0, 8),
      } : null,
      sourceCoverage: {
        status: payload.sourceCoverage?.status,
        counts: payload.sourceCoverage?.counts,
      },
      godModeExtractorParity: {
        status: payload.godModeExtractorParity?.evaluation?.status,
        familyCount: list(payload.godModeExtractorParity?.families).length,
        summary: payload.godModeExtractorParity?.summary,
      },
      activeExtractionLanes: list(payload.activeExtractionLanes).map(lane => ({ laneId: lane.laneId, status: lane.status, latestRunAt: lane.latestRunAt })),
      reportArtifactIds: payload.reportArtifactIds,
      sourceIds: payload.sourceIds,
    } : null,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Dev Team Hub V0 proof: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error('Dev Team Hub V0 proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
