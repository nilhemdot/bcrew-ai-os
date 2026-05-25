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
} from '../lib/foundation-db.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildCreatorWatchlistSnapshot } from '../lib/build-intel-watchlist.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
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

function pageHasRequiredSections(html = '') {
	  return [
	    'id="extractor-grid"',
	    'id="evidence-grid"',
	    'id="approval-review"',
	    'id="source-leaderboard"',
	    'id="source-grid"',
	    'id="target-panel"',
	    'id="director-panel"',
  ].every(marker => html.includes(marker))
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
    { label: 'God Mode Eyes candidates', value: counts.eyesBuildCandidates, route: `getIntelligenceReportBundle(${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID})`, sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'API full-watch videos', value: counts.apiFullWatchVideos, route: `getIntelligenceReportBundle(${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID})`, sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'API full-watch candidates', value: counts.apiFullWatchBuildCandidates, route: `getIntelligenceReportBundle(${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID})`, sourceId: 'SRC-YOUTUBE-INTEL-001' },
    { label: 'Director picks', value: payload.director?.recommendedBuildNow?.length || 0, route: `getIntelligenceReportBundle(${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID})`, sourceId: 'SRC-YOUTUBE-INTEL-001' },
  ]
}

async function loadLiveSnapshot() {
  const [
    foundationSnapshot,
    activeFoundationSprint,
    extractionControl,
    items,
    scoutBundle,
    linkResourceBundle,
    eyesBundle,
    markApiFullWatchBundle,
    directorBundle,
    sourceValueGraderBundle,
    geminiVideoReviewCalls,
  ] = await Promise.all([
    getFoundationSnapshot(),
    getActiveFoundationCurrentSprint(),
    getExtractionControlSnapshot({ limit: 200 }),
    listSourceCrawlItems({ targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, limit: 200, order: 'desc' }),
    getIntelligenceReportBundle(YOUTUBE_SCOUT_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
    getIntelligenceReportBundle(YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
    getIntelligenceReportBundle(GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
    getIntelligenceReportBundle(MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID, { atomLimit: 300, hitLimit: 300 }),
    getIntelligenceReportBundle(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
    getIntelligenceReportBundle(BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
    listLlmCalls({ provider: 'gemini', workload: 'video_vision', status: 'succeeded', limit: 500 }),
  ])
  const target = list(extractionControl.targets)
    .find(item => item.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY) || null
  const dailyWatchReport = list(foundationSnapshot.intelligenceAtomSpine?.recentReports)
    .find(item => item.reportArtifactId === YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID) || null
  const latestJobRun = list(foundationSnapshot.runtime?.jobs || foundationSnapshot.foundationJobs?.jobs)
    .find(item => item.key === YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY)?.latestRun || null
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
    directorBundle,
    sourceValueGraderBundle,
    geminiVideoReviewCalls,
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
  const readOnlyBundle = `${routeSource}\n${moduleSource}\n${jsSource}`

  addCheck(checks, packageJson.scripts?.['process:dev-team-hub-v0-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused Dev Team Hub proof', packageJson.scripts?.['process:dev-team-hub-v0-check'] || 'missing')
  addCheck(checks, includesAll(routeSource, ['DEV_TEAM_HUB_V0_API_ROUTE', 'getIntelligenceReportBundle', 'buildDevTeamHubV0Snapshot']), 'Build Intel routes expose read-only Dev Team Hub API', DEV_TEAM_HUB_V0_API_ROUTE)
  addCheck(checks, includesAll(serverSource, ['getIntelligenceReportBundle', 'registerFoundationBuildIntelRoutes(app']), 'server passes Foundation report bundle dependency', 'server.js')
  addCheck(checks, includesAll(appRoutesSource, ["app.get('/dev'", 'dev.html']), 'app routes serve owner-only Dev page', DEV_TEAM_HUB_V0_PAGE_ROUTE)
  addCheck(checks, htmlSource.includes('/dev.css') && htmlSource.includes('/dev.js') && pageHasRequiredSections(htmlSource), 'Dev page has required Data Pool sections', 'Director lens, extractors, evidence, approval review, source leaderboard, source systems, selected detail')
  addCheck(checks, pageUsesSharedLauncherTopbar(htmlSource, cssSource), 'Dev page uses the shared launcher topbar structure/CSS', 'launcher-topbar classes + /hub-launcher.css')
  addCheck(checks, !htmlSource.includes('id="active-card"') && !htmlSource.includes('id="source-proof"') && !htmlSource.includes('id="director-status"'), 'Dev page does not show redundant status-only middle cards', 'active card/source proof/director mini cards removed')
  addCheck(checks, jsSource.includes(DEV_TEAM_HUB_V0_API_ROUTE) && jsSource.includes('Needs source') && jsSource.includes("cache: 'no-store'"), 'frontend consumes API and renders missing-source state', DEV_TEAM_HUB_V0_API_ROUTE)
  addCheck(checks, jsSource.includes('YouTube Creators') && jsSource.includes('Skool / Paid Courses') && jsSource.includes('GitHub / Repos') && jsSource.includes('Gmail / Missive / Slack') && jsSource.includes('Meetings / Transcripts') && jsSource.includes("label: 'Visual evidence'") && jsSource.includes("label: 'Links to review'") && !jsSource.includes("name: 'Video Artifacts'") && !jsSource.includes("name: 'Dev Director'") && !jsSource.includes("name: 'God Mode Eyes'"), 'source cards are actual source inputs and evidence is separate output', 'sources: YouTube/Skool/GitHub/internal/meetings; evidence cards carry output counts')
  addCheck(checks, moduleSource.includes('sourceValueGrader') && routeSource.includes('BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID'), 'Dev Hub API exposes source-value grader data to avoid hardcoded creator cards', BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID)
  addCheck(checks, moduleSource.includes('buildExtractionEconomics') && moduleSource.includes('GEMINI_STANDARD_PRICING_BY_MODEL') && routeSource.includes('listLlmCalls'), 'Dev Hub API exposes extraction economics from LLM call usage', 'llm_calls + Gemini pricing tokens')
  addCheck(checks, moduleSource.includes('buildApprovalReviewQueue') && jsSource.includes('renderApprovalReview'), 'Dev Hub exposes actual approval links instead of a blind count', 'approvalReviewQueue + #approval-review')
  addCheck(checks, moduleSource.includes('buildDevIntelSourceCoverageSnapshot') && jsSource.includes('renderSourceLeaderboard'), 'Dev Hub page exposes source-family leaderboard coverage', 'sourceCoverage + sourceValueGrader')
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
  addCheck(checks, sourceDoesNotWriteOrExtract(readOnlyBundle), 'Dev Hub code has no extraction runner, external write, approval apply, or backlog writer path', 'read-only bundle scan')
  addCheck(checks, sourceDoesNotWriteOrExtract(scriptSource), 'focused proof stays read-only', SCRIPT_PATH)
  addCheck(checks, dogfood.ok === true, 'dogfood proves source-backed counts and missing-source fallback', JSON.stringify(dogfood.cases))
  addCheck(checks, payload?.cardId === DEV_TEAM_HUB_V0_CARD_ID && payload?.readOnly === true, 'live snapshot identifies read-only active card', payload?.cardId || 'missing')
  addCheck(checks, DEV_TEAM_HUB_V0_SOURCE_IDS.every(sourceId => list(payload?.sourceIds).includes(sourceId)), 'live snapshot includes required source IDs', list(payload?.sourceIds).join(', ') || 'missing')
  addCheck(checks, payload?.dailyWatch?.sourceRoute === '/api/foundation/build-intel/youtube-creator-daily-watch', 'daily watch source route is preserved', payload?.dailyWatch?.sourceRoute || 'missing')
  addCheck(checks, payload?.markYoutube?.latestVideoId === 'tjjX43FoAUg' && Number(payload?.markYoutube?.markResearchPoolCount) >= 50, 'Mark latest video/count are mapped from Foundation daily watch', `${payload?.markYoutube?.latestVideoId || 'missing'} / ${payload?.markYoutube?.markResearchPoolCount ?? 'missing'}`)
  addCheck(checks, payload?.scout?.sourceRoute?.includes('getIntelligenceReportBundle'), 'scout source route is report-bundle backed', payload?.scout?.sourceRoute || 'missing')
  addCheck(checks, payload?.eyesQualityLoop?.sourceRoute?.includes(GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID) && list(payload?.eyesQualityLoop?.buildCandidates).length >= 1, 'God Mode Eyes candidates are exposed to Dev Hub', `${list(payload?.eyesQualityLoop?.buildCandidates).length} candidates`)
  addCheck(checks, payload?.markApiFullWatch?.sourceRoute?.includes(MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID) && list(payload?.markApiFullWatch?.buildCandidates).length >= 1 && Number(payload?.counts?.apiFullWatchVideos || 0) >= 3, 'Mark API full-watch small batch is exposed to Dev Hub', `${payload?.counts?.apiFullWatchVideos || 0} videos / ${payload?.counts?.apiFullWatchBuildCandidates || 0} candidates`)
  addCheck(checks, payload?.director?.sourceRoute?.includes(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID) && list(payload?.director?.recommendedBuildNow).length >= 1, 'Dev Intelligence Director recommendations are exposed to Dev Hub', `${list(payload?.director?.recommendedBuildNow).length} recommendations`)
  addCheck(checks, list(payload?.sourceValueGrader?.sourceGrades).length >= 3 && list(payload?.dailyWatch?.creators).length >= 3, 'live source cards can be built from multiple graded creators', `${list(payload?.sourceValueGrader?.sourceGrades).length} graded / ${list(payload?.dailyWatch?.creators).length} watched`)
  addCheck(checks, Number(payload?.extractionEconomics?.estimatedSpendUsd || 0) > 0 && Number(payload?.extractionEconomics?.costPerIdeaUsd || 0) > 0, 'live extraction economics calculate API spend and cost per idea', `$${Number(payload?.extractionEconomics?.estimatedSpendUsd || 0).toFixed(2)} / $${Number(payload?.extractionEconomics?.costPerIdeaUsd || 0).toFixed(2)} per idea`)
  addCheck(checks, list(payload?.approvalReviewQueue).length >= 1 && list(payload?.approvalReviewQueue).every(item => item.url && item.decisionNeeded), 'live snapshot exposes actionable link review rows', `${list(payload?.approvalReviewQueue).length} approval rows`)
  addCheck(checks, list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'public-builder-communities') && list(payload?.sourceCoverage?.rows).some(row => row.familyId === 'github-public-repos'), 'source coverage includes planned GitHub and public builder communities', `${list(payload?.sourceCoverage?.rows).length} families`)
  addCheck(checks, list(payload?.activeExtractionLanes).some(lane => lane.laneId === 'meetings-transcripts') && list(payload?.activeExtractionLanes).some(lane => lane.laneId === 'email-missive-comms') && list(payload?.activeExtractionLanes).some(lane => lane.laneId === 'slack-comms'), 'active extraction lanes expose internal Foundation signals', list(payload?.activeExtractionLanes).map(lane => lane.laneId).join(', ') || 'missing')
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
      extractionEconomics: payload.extractionEconomics,
      approvalReviewQueue: list(payload.approvalReviewQueue).slice(0, 5),
      sourceCoverage: {
        status: payload.sourceCoverage?.status,
        counts: payload.sourceCoverage?.counts,
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
