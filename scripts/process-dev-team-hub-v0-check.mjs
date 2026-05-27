#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getExtractionControlSnapshot,
  getFoundationSnapshot,
  getIntelligenceReportBundle,
  initFoundationDb,
  listLlmCalls,
  listSourceCrawlItems,
  listYoutubeFullWatchReportArtifacts,
} from '../lib/foundation-db.js'
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
  DEV_TEAM_HUB_V0_API_ROUTE,
  DEV_TEAM_HUB_V0_CARD_ID,
  DEV_TEAM_HUB_V0_PAGE_ROUTE,
  DEV_TEAM_HUB_V0_SOURCE_IDS,
  buildDevTeamHubV0DogfoodProof,
  buildDevTeamHubV0Snapshot,
} from '../lib/dev-team-hub.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const SCRIPT_PATH = 'scripts/process-dev-team-hub-v0-check.mjs'

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
    geminiVideoReviewCalls,
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
    listLlmCalls({ provider: 'gemini', workload: 'video_vision', status: 'succeeded', limit: 5000 }),
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
    geminiVideoReviewCalls,
    youtubeFullWatchReports,
    actionRouter: foundationSnapshot.intelligenceActionRouter || {},
    currentSprint: activeFoundationSprint,
    extractionControl,
  })
}

async function main() {
  const args = parseArgs()
  const checks = []
  let payload = null

  const [
    packageJson,
    routeSource,
    moduleSource,
    appRoutesSource,
    serverSource,
    htmlSource,
    jsSource,
    cssSource,
    scriptSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-build-intel-routes.js'),
    readRepoFile('lib/dev-team-hub.js'),
    readRepoFile('lib/app-page-routes.js'),
    readRepoFile('server.js'),
    readRepoFile('public/dev.html'),
    readRepoFile('public/dev.js'),
    readRepoFile('public/dev.css'),
    readRepoFile(SCRIPT_PATH),
  ])

  await initFoundationDb()
  try {
    payload = await loadLiveSnapshot()
  } finally {
    await closeFoundationDb()
  }

  const dogfood = buildDevTeamHubV0DogfoodProof()
  const readOnlyBundle = `${moduleSource}\n${jsSource}`

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
      jsSource.includes('renderYoutubeExecutiveSummary') &&
      jsSource.includes('setDevView') &&
      cssSource.includes('.youtube-system') &&
      cssSource.includes('.yt-stage-grid') &&
      cssSource.includes('.yt-handoff-grid') &&
      cssSource.includes('.yt-source-handoff-list') &&
      cssSource.includes('.yt-exec-summary'),
    'Dev page exposes a separate YouTube Intelligence system view',
    'sidebar view + #view-youtube + #youtube-system + runtime/stage/handoff/source-browser/executive-summary renderers',
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
      htmlSource.includes('20260527-source-handoff-v1'),
    'Dev page automatically refetches source-backed dashboard data after extraction writes',
    '30s no-store polling + focus refresh + in-flight guard',
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
  addCheck(checks, list(payload?.sourceValueGrader?.sourceGrades).length >= 3 && list(payload?.dailyWatch?.creators).length >= 3, 'live source cards can be built from multiple graded creators', `${list(payload?.sourceValueGrader?.sourceGrades).length} graded / ${list(payload?.dailyWatch?.creators).length} watched`)
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
  addCheck(
    checks,
    Number(payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0) === list(payload?.youtubeCreatorGodModeCatchup?.creators).length &&
      Number(payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0) >= 30,
    'live YouTube catch-up payload includes all approved creators',
    `${list(payload?.youtubeCreatorGodModeCatchup?.creators).length}/${payload?.youtubeCreatorGodModeCatchup?.summary?.creatorCount || 0} creators`
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
  addCheck(
    checks,
    sourceGodModeHandoffQueue.status === 'ready' &&
      Number(sourceGodModeHandoffQueue.counts?.runnableRows || 0) > 0 &&
      Number(sourceGodModeHandoffQueue.counts?.parkedRows || 0) > 0 &&
      sourceGodModeRows.some(row => row.runner === 'source:god-mode' && row.runnable === true) &&
      sourceGodModeRows.some(row => row.runner === 'skool:free-god-mode' && row.runnable === true) &&
      sourceGodModeRows.some(row => row.requiresAuth === true && row.runnable === false) &&
      sourceGodModeRows.filter(row => row.runnable === true).every(row => text(row.runCommand)),
    'YouTube handoff exposes runnable source-browser rows while paid/auth stays parked',
    `ready=${sourceGodModeHandoffQueue.counts?.runnableRows || 0}; parked=${sourceGodModeHandoffQueue.counts?.parkedRows || 0}`,
  )
  addCheck(checks, list(payload?.approvalReviewQueue).length >= 1 && list(payload?.approvalReviewQueue).every(item => /^https?:\/\//i.test(text(item.url)) && item.decisionNeeded), 'live snapshot exposes actionable link review rows', `${list(payload?.approvalReviewQueue).length} approval rows`)
  addCheck(checks, list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'public-builder-communities') && list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'github-public-repos') && list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'creator-newsletters') && list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'skool-free-communities'), 'source coverage includes planned GitHub, newsletters, free Skool, and public builder communities', `${list(payload?.sourceCoverage?.rows).length} families`)
  addCheck(checks, list(payload?.activeExtractionLanes).some(lane => lane.laneId === 'meetings-transcripts') && list(payload?.activeExtractionLanes).some(lane => lane.laneId === 'email-missive-comms') && list(payload?.activeExtractionLanes).some(lane => lane.laneId === 'slack-comms'), 'active extraction lanes expose internal Foundation signals', list(payload?.activeExtractionLanes).map(lane => lane.laneId).join(', ') || 'missing')
  addCheck(checks, payload?.godModeExtractorParity?.evaluation?.ok === true && list(payload?.godModeExtractorParity?.families).length >= 14 && Number(payload?.godModeExtractorParity?.summary?.claimsGodModeCount || 0) === 0, 'live snapshot exposes extractor parity without false full-God-Mode claims', `${list(payload?.godModeExtractorParity?.families).length} families / claims=${payload?.godModeExtractorParity?.summary?.claimsGodModeCount ?? 'missing'}`)
  addCheck(checks, Array.isArray(payload?.sourceRoutes) && payload.sourceRoutes.length >= 5, 'visible value source map is present', `${payload?.sourceRoutes?.length || 0} routes`)

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
