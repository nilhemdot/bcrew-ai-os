import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const indexHtml = fs.readFileSync(path.join(repoRoot, 'public/index.html'), 'utf8')
const loginHtml = fs.readFileSync(path.join(repoRoot, 'public/login.html'), 'utf8')
const homeJs = fs.readFileSync(path.join(repoRoot, 'public/home.js'), 'utf8')
const launcherCss = fs.readFileSync(path.join(repoRoot, 'public/hub-launcher.css'), 'utf8')

const checks = []

function add(ok, name, detail = '') {
  checks.push({ ok: Boolean(ok), name, detail })
}

const requiredRoutes = [
  '/api/doc?path=docs/strategy/bhag-model.md',
  '/api/doc?path=docs/strategy/agent-engine.md',
  '/api/source-of-truth',
  '/api/foundation/source-lifecycle',
  '/api/foundation/source-maturity-grid',
  '/api/foundation/current-sprint',
  '/api/sales-hub',
  '/api/ops-hub',
]

const requiredHooks = [
  'launcher-attract-team-number',
  'launcher-attract-team-pace',
  'launcher-attract-community-number',
  'launcher-attract-community-pace',
  'launcher-grow-number',
  'launcher-grow-pace',
  'launcher-retain-number',
  'launcher-retain-pace',
  'launcher-sales-win',
  'launcher-recruiting-win',
  'launcher-retention-win',
  'launcher-ops-win',
  'launcher-dev-win',
  'launcher-finance-win',
]

const staleValues = [
  'ASI SCORE',
  '8.2',
  '116</b> sold',
  '$73M',
  '47</b> cleanups',
  '22</b> commits',
  '0/5',
  '7 calls waiting',
  'risk flags',
  'departed YTD',
  'Behind 15',
  'Ahead +22',
  '$9.4K',
]

const approvedMotivations = [
  "Let's get after it.",
  'Another day to build.',
  'Make today count.',
  'Every deal matters.',
  'Energy over everything.',
  'Focus wins.',
  'Build. Ship. Win.',
  'Time to go.',
  'We work, it works.',
  'Today = momentum.',
  'Sold signs everywhere.',
  'Show up, suit up, win.',
  'Engine on.',
  'Push the system forward.',
  "One trunk. Eight hubs. Let's roll.",
]

requiredRoutes.forEach(route => {
  add(homeJs.includes(route), `launcher reads ${route}`, route)
})

requiredHooks.forEach(hook => {
  add(indexHtml.includes(`id="${hook}"`), `launcher has ${hook} hook`, hook)
})

staleValues.forEach(value => {
  add(!indexHtml.includes(value) && !homeJs.includes(value), `stale launcher value removed: ${value}`, value)
})

approvedMotivations.forEach(message => {
  add(homeJs.includes(message), `approved motivation restored: ${message}`, message)
})

add(indexHtml.includes('LIVE ATTRITION PRESSURE'), 'Retain card uses live attrition instead of ASI', 'LIVE ATTRITION PRESSURE')
add(indexHtml.includes('Needs source'), 'unsupported values default to Needs source', 'Needs source')
add(homeJs.includes('populateStrategySnapshots') && homeJs.includes('Current Active Agents') && homeJs.includes('Production Gap') && homeJs.includes('Live Attrition Pressure'), 'Agent Engine/BHAG snapshot rows drive KPI cards', 'populateStrategySnapshots')
add(homeJs.includes('populateFoundationStats') && homeJs.includes('sourceLayerStatus.summary.sourceCount') && homeJs.includes('summary.completeSources'), 'Foundation stats use source truth, lifecycle, and maturity summaries', 'populateFoundationStats')
add(homeJs.includes('fetchSalesCardIfAllowed') && homeJs.includes('SRC-CLICKUP-001'), 'Sales card uses Sales Hub payload/source id', 'fetchSalesCardIfAllowed')
add(homeJs.includes('fetchOpsCardIfAllowed') && homeJs.includes('foundationJobs'), 'Ops card uses Ops Hub foundationJobs payload', 'fetchOpsCardIfAllowed')
add(homeJs.includes('fetchDevCardIfAllowed') && homeJs.includes('currentSprint.summary'), 'Dev card uses Current Sprint route', 'fetchDevCardIfAllowed')
add(homeJs.includes("action.innerHTML = 'Open Foundation"), 'owner CTA removes unsourced call count', 'Open Foundation')
add(indexHtml.includes('mascot-6-cutout-v2-900.webp') && indexHtml.includes('mascot-6-cutout-v2-1400.webp'), 'launcher uses cleaned mascot cutout assets', 'mascot-6-cutout-v2')
add(loginHtml.includes('mascot-7-900.webp') && loginHtml.includes('mascot-7-1600.webp') && !loginHtml.includes('mascot-7-cutout'), 'login keeps original transparent mascot asset', 'mascot-7 original')
add(indexHtml.includes('launcher-logout') && homeJs.includes('/api/auth/logout'), 'launcher user menu exposes logout action', 'launcher-logout')
add(!launcherCss.includes('LauncherStratum1') && !indexHtml.includes('LauncherStratum1') && !homeJs.includes('LauncherStratum1'), 'launcher uses canonical Stratum1 font name', 'Stratum1')
add(launcherCss.includes('font-size: 22px;') && launcherCss.includes('font-size: 11px;'), 'launcher type polish uses locked heading/role sizes', '22px h2 / 11px role')
add(indexHtml.includes('launcher-hub-partial') && launcherCss.includes('.launcher-hub::before') && launcherCss.includes('width: 3px;') && launcherCss.includes('height: 100%;'), 'launcher station cards use locked left accent bar', 'launcher-hub::before left rail')
add(!indexHtml.includes('launcher-hub-status') && !launcherCss.includes('launcher-hub-status') && !homeJs.includes('launcher-hub-status'), 'launcher station status pills are removed', 'launcher-hub-status absent')
add(!indexHtml.includes('PARTIAL') && !indexHtml.includes('PLANNED') && !indexHtml.includes('CARVE OUT'), 'launcher station jargon removed', 'PARTIAL/PLANNED/CARVE OUT absent')
add(!indexHtml.includes('launcher-hub-carve') && !launcherCss.includes('launcher-hub-carve'), 'Dev station no longer uses carve-out card state', 'launcher-hub-carve absent')
add(indexHtml.includes('data-hub="dev"') && indexHtml.includes('class="launcher-hub launcher-route-card launcher-hub-live"'), 'Dev station uses running hub state', 'launcher-hub-live')
add(launcherCss.includes('--launcher-green: #16a34a') && launcherCss.includes('.launcher-hub-live::before') && launcherCss.includes('background: var(--launcher-green);'), 'running hub cards use green left rail', 'launcher-hub-live green rail')
add(!indexHtml.includes('launcher-hub-win') && !launcherCss.includes('launcher-hub-win'), 'launcher station win-box class is removed', 'launcher-hub-win absent')
add(indexHtml.includes('launcher-hub-value') && launcherCss.includes('.launcher-hub-value') && launcherCss.includes('background: transparent;'), 'launcher station value line is plain text', 'launcher-hub-value transparent')

const failed = checks.filter(check => !check.ok)
const result = {
  ok: failed.length === 0,
  checkCount: checks.length,
  failed,
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2))
} else if (failed.length) {
  console.error('Hub launcher source-backed values check failed:')
  failed.forEach(check => console.error(`- ${check.name}: ${check.detail}`))
} else {
  console.log(`Hub launcher source-backed values check passed (${checks.length} checks).`)
}

if (failed.length) process.exit(1)
