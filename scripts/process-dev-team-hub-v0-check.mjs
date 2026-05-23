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
    'id="source-status"',
    'id="research-pool"',
    'id="scout-report"',
    'id="ranked-opportunities"',
    'id="atoms-evidence"',
    'id="approval-links"',
  ].every(marker => html.includes(marker))
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
  ]
}

async function loadLiveSnapshot() {
  const [
    foundationSnapshot,
    activeFoundationSprint,
    extractionControl,
    items,
    scoutBundle,
  ] = await Promise.all([
    getFoundationSnapshot(),
    getActiveFoundationCurrentSprint(),
    getExtractionControlSnapshot({ limit: 200 }),
    listSourceCrawlItems({ targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, limit: 200, order: 'desc' }),
    getIntelligenceReportBundle(YOUTUBE_SCOUT_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
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
    sourceContracts: getSourceContracts(),
    creatorWatchlist: buildCreatorWatchlistSnapshot(),
    dailyWatch,
    scoutBundle,
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
  addCheck(checks, htmlSource.includes('/dev.css') && htmlSource.includes('/dev.js') && pageHasRequiredSections(htmlSource), 'Dev page has required read sections', 'source, pool, scout, opportunities, atoms, evidence, approval links')
  addCheck(checks, jsSource.includes(DEV_TEAM_HUB_V0_API_ROUTE) && jsSource.includes('Needs source') && jsSource.includes("cache: 'no-store'"), 'frontend consumes API and renders missing-source state', DEV_TEAM_HUB_V0_API_ROUTE)
  addCheck(checks, cssSource.includes("font-family: 'Stratum1'") && cssSource.includes('--dev-blue'), 'page-scoped CSS uses BCrew type and color tokens', 'public/dev.css')
  addCheck(checks, sourceDoesNotWriteOrExtract(readOnlyBundle), 'Dev Hub code has no extraction runner, external write, approval apply, or backlog writer path', 'read-only bundle scan')
  addCheck(checks, sourceDoesNotWriteOrExtract(scriptSource), 'focused proof stays read-only', SCRIPT_PATH)
  addCheck(checks, dogfood.ok === true, 'dogfood proves source-backed counts and missing-source fallback', JSON.stringify(dogfood.cases))
  addCheck(checks, payload?.cardId === DEV_TEAM_HUB_V0_CARD_ID && payload?.readOnly === true, 'live snapshot identifies read-only active card', payload?.cardId || 'missing')
  addCheck(checks, DEV_TEAM_HUB_V0_SOURCE_IDS.every(sourceId => list(payload?.sourceIds).includes(sourceId)), 'live snapshot includes required source IDs', list(payload?.sourceIds).join(', ') || 'missing')
  addCheck(checks, payload?.dailyWatch?.sourceRoute === '/api/foundation/build-intel/youtube-creator-daily-watch', 'daily watch source route is preserved', payload?.dailyWatch?.sourceRoute || 'missing')
  addCheck(checks, payload?.scout?.sourceRoute?.includes('getIntelligenceReportBundle'), 'scout source route is report-bundle backed', payload?.scout?.sourceRoute || 'missing')
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
