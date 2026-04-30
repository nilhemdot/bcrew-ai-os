import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const UI_MENU_LAYOUT_POLISH_CARD_ID = 'UI-MENU-LAYOUT-POLISH-001'
export const UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY = 'ui-menu-layout-polish-v1'
export const UI_MENU_LAYOUT_POLISH_APPROVED_PLAN_PATH = 'docs/process/approved-plans/ui-menu-layout-polish-v1.md'
export const UI_MENU_LAYOUT_POLISH_APPROVAL_PATH = 'docs/process/approvals/UI-MENU-LAYOUT-POLISH-001.json'
export const UI_MENU_LAYOUT_POLISH_BASELINE_PATH = 'docs/audits/2026-04-30-ui-menu-layout-polish-baseline.md'
export const UI_MENU_LAYOUT_POLISH_MANUAL_REVIEW_PATH = 'docs/audits/2026-04-30-ui-menu-layout-polish-manual-review.md'

export const UI_MENU_CURRENT_DOC_CATEGORIES = [
  'Active doctrine',
  'Process & runbooks',
  'Source notes',
  'Specs',
  'Strategy reference',
  'Agent personas',
  'User profile',
]

export const UI_MENU_ARCHIVE_HISTORY_CATEGORIES = [
  'Archive',
  'Plan history',
  'Recent audits - active',
  'Recent handoffs - active',
]

export const UI_MENU_LAYOUT_REQUIRED_ROUTES = [
  '/foundation#current-state',
  '/foundation#systems',
  '/foundation#backlog',
  '/foundation#build-log',
  '/foundation#system-health',
  '/foundation#source-overview',
  '/foundation#source-docs',
  '/foundation#source-sheets',
  '/foundation#source-apis',
  '/foundation#source-connectors',
  '/foundation#inventory-docs',
  '/foundation#inventory-archive-history',
  '/foundation#capabilities-skills',
  '/foundation#capabilities-plugins',
  '/foundation#capabilities-agents',
]

export const UI_MENU_LAYOUT_REQUIRED_VIEWPORTS = ['desktop 1440x900', 'mobile 390x844']

export const UI_MENU_LAYOUT_FORBIDDEN_PHASE_G_CARD_IDS = [
  'CHANGE-LOG-COMPREHENSIVE-001',
  'DAILY-EXEC-SUMMARY-001',
  'SOURCE-LIFECYCLE-EXPANSION-001',
]

export const UI_MENU_LAYOUT_ALLOWED_NEXT_CARD_IDS = [
  'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
  'CHANGE-LOG-COMPREHENSIVE-001',
  'DAILY-EXEC-SUMMARY-001',
  'SOURCE-LIFECYCLE-EXPANSION-001',
]

function normalizeText(value) {
  return String(value || '').trim()
}

async function readText(repoRoot, relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readOptionalText(repoRoot, relativePath) {
  try {
    return await readText(repoRoot, relativePath)
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

function addFinding(findings, ok, check, detail = '', severity = 'critical') {
  if (!ok) findings.push({ severity, check, detail })
}

export function isUiMenuArchiveHistoryDoc(doc) {
  const category = normalizeText(doc?.category)
  const docPath = normalizeText(doc?.path)
  if (UI_MENU_ARCHIVE_HISTORY_CATEGORIES.includes(category)) return true
  if (docPath.startsWith('docs/_archive/')) return true
  if (docPath.startsWith('docs/rebuild/plan-history/')) return true
  return /\b(retired|superseded|history|archive)\b/i.test(docPath)
}

export function isUiMenuCurrentDoc(doc) {
  return UI_MENU_CURRENT_DOC_CATEGORIES.includes(normalizeText(doc?.category)) && !isUiMenuArchiveHistoryDoc(doc)
}

export function splitUiMenuInventoryDocs(trackedDocs = []) {
  return trackedDocs.reduce((acc, doc) => {
    if (isUiMenuArchiveHistoryDoc(doc)) acc.archiveHistoryDocs.push(doc)
    else if (isUiMenuCurrentDoc(doc)) acc.currentDocs.push(doc)
    else acc.uncategorizedDocs.push(doc)
    return acc
  }, {
    currentDocs: [],
    archiveHistoryDocs: [],
    uncategorizedDocs: [],
  })
}

function routeToHash(route) {
  return route.replace('/foundation#', '')
}

function routeTextPresent(source, route) {
  const hash = routeToHash(route)
  return source.includes(hash) || source.includes(route)
}

function buildRouteViewportKey(route, viewport) {
  return `${route} | ${viewport}`
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function manualPassRecorded(manualReview, route, viewport) {
  const pattern = new RegExp(
    `\\|\\s*${escapeRegExp(route)}\\s*\\|\\s*${escapeRegExp(viewport)}\\s*\\|\\s*pass\\s*\\|`,
    'i',
  )
  return pattern.test(manualReview)
}

export async function buildUiMenuLayoutPolishStatus({
  repoRoot = defaultRepoRoot,
  systemInventory = null,
  foundationHub = null,
  foundationBuildLog = null,
} = {}) {
  const findings = []
  const foundationHtml = await readOptionalText(repoRoot, 'public/foundation.html')
  const foundationJs = await readOptionalText(repoRoot, 'public/foundation.js')
  const foundationStyles = await readOptionalText(repoRoot, 'public/styles.css')
  const foundationReviewSprint = await readOptionalText(repoRoot, 'lib/foundation-review-sprint.js')
  const approvedPlan = await readOptionalText(repoRoot, UI_MENU_LAYOUT_POLISH_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, UI_MENU_LAYOUT_POLISH_APPROVAL_PATH)
  const baseline = await readOptionalText(repoRoot, UI_MENU_LAYOUT_POLISH_BASELINE_PATH)
  const manualReview = await readOptionalText(repoRoot, UI_MENU_LAYOUT_POLISH_MANUAL_REVIEW_PATH)

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', UI_MENU_LAYOUT_POLISH_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', UI_MENU_LAYOUT_POLISH_APPROVAL_PATH)
  addFinding(findings, Boolean(baseline), 'baseline audit artifact exists', UI_MENU_LAYOUT_POLISH_BASELINE_PATH)
  addFinding(findings, Boolean(manualReview), 'manual review artifact exists', UI_MENU_LAYOUT_POLISH_MANUAL_REVIEW_PATH)

  addFinding(findings, foundationHtml.includes('Archive / History'), 'Foundation nav exposes Archive / History', 'public/foundation.html')
  addFinding(findings, foundationHtml.indexOf('Overview</a>') < foundationHtml.indexOf('Strategy Packet'), 'daily operator nav appears before strategy docs', 'Overview before Strategy Packet')
  addFinding(findings, foundationJs.includes('renderInventoryArchiveHistory'), 'archive/history renderer exists', 'renderInventoryArchiveHistory')
  addFinding(findings, foundationJs.includes("'inventory-archive-history'"), 'archive/history route is registered', 'inventory-archive-history')
  addFinding(findings, foundationJs.includes('splitInventoryDocs'), 'current/archive split helper exists in UI', 'splitInventoryDocs')
  addFinding(findings, foundationStyles.includes('overflow-x: hidden'), 'layout includes horizontal overflow guard', 'overflow-x: hidden')
  addFinding(findings, foundationStyles.includes('found-nav.found-nav-open'), 'mobile nav open state is styled', 'found-nav-open')
  addFinding(findings, foundationReviewSprint.includes(`'${UI_MENU_LAYOUT_POLISH_CARD_ID}': '${UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY}'`), 'Phase G readiness accepts reviewed UI closeout', UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY)

  for (const category of UI_MENU_CURRENT_DOC_CATEGORIES) {
    addFinding(findings, foundationJs.includes(category), `current-doc category listed: ${category}`, category)
  }
  for (const category of UI_MENU_ARCHIVE_HISTORY_CATEGORIES) {
    addFinding(findings, foundationJs.includes(category), `archive/history category listed: ${category}`, category)
  }
  for (const route of UI_MENU_LAYOUT_REQUIRED_ROUTES) {
    addFinding(findings, routeTextPresent(foundationHtml + foundationJs, route), `route exists: ${route}`, route)
  }

  const trackedDocs = Array.isArray(systemInventory?.docs?.tracked) ? systemInventory.docs.tracked : []
  const privateLocalDocs = Array.isArray(systemInventory?.docs?.privateLocal) ? systemInventory.docs.privateLocal : []
  const split = splitUiMenuInventoryDocs(trackedDocs)
  const currentArchiveLeaks = split.currentDocs.filter(doc => isUiMenuArchiveHistoryDoc(doc))
  const archiveExamples = split.archiveHistoryDocs.filter(doc =>
    UI_MENU_ARCHIVE_HISTORY_CATEGORIES.includes(doc.category) ||
      normalizeText(doc.path).startsWith('docs/_archive/') ||
      normalizeText(doc.path).startsWith('docs/rebuild/plan-history/')
  )

  if (systemInventory) {
    addFinding(findings, split.currentDocs.length > 0, 'current-doc split has docs', `${split.currentDocs.length} current`)
    addFinding(findings, split.archiveHistoryDocs.length > 0, 'archive/history split has docs', `${split.archiveHistoryDocs.length} archive/history`)
    addFinding(findings, currentArchiveLeaks.length === 0, 'current-doc split excludes archive/history docs', `${currentArchiveLeaks.length} leaks`)
    addFinding(findings, archiveExamples.length > 0, 'archive/history split includes preserved history docs', `${archiveExamples.length} preserved examples`)
    addFinding(findings, privateLocalDocs.every(doc => doc.usage === 'private-local' && !Object.prototype.hasOwnProperty.call(doc, 'content')), 'private/local docs remain metadata-only', `${privateLocalDocs.length} private local metadata rows`)
  }

  addFinding(findings, baseline.includes('Before build'), 'baseline records before-build state', 'Before build')
  addFinding(findings, baseline.includes('Current docs after split') && baseline.includes('Archive/history docs after split'), 'baseline records split counts', 'current/archive counts')
  addFinding(findings, manualReview.includes('Failures: 0'), 'manual review records zero failures', 'Failures: 0')
  addFinding(findings, manualReview.includes('1440x900') && manualReview.includes('390x844'), 'manual review records required viewports', '1440x900 and 390x844')
  for (const phrase of [
    'no horizontal overflow',
    'no overlapping text',
    'mobile nav usable',
    'active route visible',
    'target route reachable by hash',
    'current truth / next card visible without digging',
    'cards and panels are not awkwardly nested',
  ]) {
    addFinding(findings, manualReview.toLowerCase().includes(phrase), `manual review covers ${phrase}`, phrase)
  }

  for (const route of UI_MENU_LAYOUT_REQUIRED_ROUTES) {
    for (const viewport of UI_MENU_LAYOUT_REQUIRED_VIEWPORTS) {
      const key = buildRouteViewportKey(route, viewport)
      addFinding(
        findings,
        manualPassRecorded(manualReview, route, viewport),
        `manual pass recorded for ${key}`,
        key,
      )
    }
  }

  const phaseGReadiness = foundationHub?.foundation1100Review?.phaseGReadiness || {}
  if (foundationHub) {
    addFinding(findings, UI_MENU_LAYOUT_ALLOWED_NEXT_CARD_IDS.includes(phaseGReadiness.nextPlanCard), 'live current-truth next card advanced after closeout', phaseGReadiness.nextPlanCard || 'missing')
    const uiCard = (foundationHub.backlogItems || []).find(card => card.id === UI_MENU_LAYOUT_POLISH_CARD_ID)
    addFinding(findings, uiCard?.lane === 'done' && /ui-menu-layout-polish-v1/.test(uiCard?.statusNote || ''), 'UI menu layout card is done with closeout key', `${uiCard?.lane || 'missing'} / ${uiCard?.statusNote || ''}`)
    for (const cardId of UI_MENU_LAYOUT_FORBIDDEN_PHASE_G_CARD_IDS) {
      const card = (foundationHub.backlogItems || []).find(item => item.id === cardId)
      addFinding(findings, card?.lane !== 'done', `future Phase G card not implemented: ${cardId}`, card?.lane || 'missing')
    }
  }

  const build = (foundationBuildLog?.builds || []).find(item => item.closeoutKey === UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY)
  if (foundationBuildLog) {
    addFinding(findings, Boolean(build), 'build log exposes UI menu layout closeout', UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY)
    addFinding(findings, build?.backlogIds?.length === 1 && build.backlogIds.includes(UI_MENU_LAYOUT_POLISH_CARD_ID), 'build log closeout owns only UI menu layout card', (build?.backlogIds || []).join(', ') || 'missing')
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: UI_MENU_LAYOUT_POLISH_CARD_ID,
    closeoutKey: UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY,
    artifactPaths: {
      approvedPlan: UI_MENU_LAYOUT_POLISH_APPROVED_PLAN_PATH,
      approval: UI_MENU_LAYOUT_POLISH_APPROVAL_PATH,
      baseline: UI_MENU_LAYOUT_POLISH_BASELINE_PATH,
      manualReview: UI_MENU_LAYOUT_POLISH_MANUAL_REVIEW_PATH,
    },
    summary: {
      requiredRoutes: UI_MENU_LAYOUT_REQUIRED_ROUTES.length,
      routeViewportChecks: UI_MENU_LAYOUT_REQUIRED_ROUTES.length * UI_MENU_LAYOUT_REQUIRED_VIEWPORTS.length,
      currentDocCount: split.currentDocs.length,
      archiveHistoryDocCount: split.archiveHistoryDocs.length,
      privateLocalDocCount: privateLocalDocs.length,
      uncategorizedDocCount: split.uncategorizedDocs.length,
      currentArchiveLeakCount: currentArchiveLeaks.length,
      nextPlanCard: phaseGReadiness.nextPlanCard || null,
      nextPlanCardStillAfterUiMenu: UI_MENU_LAYOUT_ALLOWED_NEXT_CARD_IDS.includes(phaseGReadiness.nextPlanCard),
    },
    findings,
  }
}
