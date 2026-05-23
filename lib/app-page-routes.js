import path from 'node:path'

export const APP_PAGE_ROUTES_SPLIT_CARD_ID = 'APP-PAGE-ROUTES-SPLIT-001'
export const APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY = 'app-page-routes-split-v1'
export const APP_PAGE_ROUTES_SPLIT_PLAN_PATH = 'docs/process/app-page-routes-split-001-plan.md'
export const APP_PAGE_ROUTES_SPLIT_APPROVAL_PATH = 'docs/process/approvals/APP-PAGE-ROUTES-SPLIT-001.json'
export const APP_PAGE_ROUTES_SPLIT_SCRIPT_PATH = 'scripts/process-app-page-routes-split-check.mjs'
export const APP_PAGE_ROUTES_SPLIT_SPRINT_ID = 'app-page-routes-split-2026-05-15'
export const APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES = 6779
export const APP_PAGE_ROUTES_SPLIT_ROUTE_BUDGET_MS = 5000
export const APP_PAGE_ROUTES_SPLIT_ROUTE_BUDGET_BYTES = 1_000_000

function sendNoStorePublicFile(res, publicDir, fileName) {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(publicDir, fileName))
}

export function buildAppPageRoutesSplitDogfoodProof({
  serverSource = '',
  moduleSource = '',
  proofScriptSource = '',
} = {}) {
  const healthy = {
    serverSource: "import { registerAppPageRoutes } from './lib/app-page-routes.js'\nregisterAppPageRoutes(app, {})\napp.get('/foundation/export/strategy." + "pdf', requireAdminToken, async () => {})",
    moduleSource: "export function registerAppPageRoutes(app) { app.get('/doc', requirePageAccess('owner'), () => {}); app.get('/foundation', requirePageAccess('owner'), () => {}); app.get('/foundation/export/strategy', requirePageAccess('owner'), () => {}); app.get('/strategic-execution', requirePageAccess('owner'), () => {}); app.get('/sales', requirePageAccess('sales'), () => {}); app.get('/ops', requirePageAccess('ops'), () => {}); app.get('/agent-feedback', () => {}); app.use('/api', () => {}); app.get('/', requirePageAccess('home'), () => {}); app.get('*', requirePageAccess('owner'), () => {}) }",
    proofScriptSource: 'moved page and fallback routes return expected HTML/API fallback payloads',
  }

  const evaluate = fixture => {
    const nextServerSource = String(fixture.serverSource ?? serverSource)
    const nextModuleSource = String(fixture.moduleSource ?? moduleSource)
    const nextProofScriptSource = String(fixture.proofScriptSource ?? proofScriptSource)
    const pageMarkers = [
      "app.get('/doc'",
      "app.get('/foundation'",
      "app.get('/foundation/export/strategy'",
      "app.get('/strategic-execution'",
      "app.get('/sales'",
      "app.get('/ops'",
      "app.get('/agent-feedback'",
      "app.get('/'",
      "app.get('*'",
      "app.use('/api'",
    ]
    return pageMarkers.every(marker => nextModuleSource.includes(marker)) &&
      pageMarkers.every(marker => !nextServerSource.includes(marker)) &&
      nextServerSource.includes('registerAppPageRoutes(app') &&
      nextServerSource.includes("app.get('/foundation/export/strategy." + "pdf'") &&
      !nextModuleSource.includes("app.get('/foundation/export/strategy." + "pdf'") &&
      nextProofScriptSource.includes('expected HTML/API fallback payloads')
  }

  const passing = evaluate(healthy)
  const rejected = {
    missingModule: evaluate({ ...healthy, moduleSource: '' }) === false,
    oldInlineServerPage: evaluate({ ...healthy, serverSource: `${healthy.serverSource}\napp.get('/foundation', requirePageAccess('owner'), () => {})` }) === false,
    missingRegistrar: evaluate({ ...healthy, serverSource: "app.get('/foundation/export/strategy." + "pdf', requireAdminToken, async () => {})" }) === false,
    missingApiFallback: evaluate({ ...healthy, moduleSource: healthy.moduleSource.replace("app.use('/api', () => {}); ", '') }) === false,
    movedPdfExport: evaluate({ ...healthy, moduleSource: `${healthy.moduleSource}\napp.get('/foundation/export/strategy.${'pdf'}', requireAdminToken, async () => {})` }) === false,
  }

  return {
    ok: passing && Object.values(rejected).every(Boolean),
    passing,
    rejected,
    summary: 'App page route split dogfood accepts healthy page/fallback route module ownership and rejects missing module, old inline page route, missing registrar, missing API fallback, and moved Strategy PDF export.',
  }
}

export function registerAppPageRoutes(app, deps = {}) {
  const {
    requirePageAccess,
    sendApiError,
    getRequestAuthUser,
    getLocalDevUser,
    publicDir,
  } = deps

  app.get('/doc', requirePageAccess('owner'), (_req, res) => {
    sendNoStorePublicFile(res, publicDir, 'doc.html')
  })

  app.get('/foundation', requirePageAccess('owner'), (_req, res) => {
    sendNoStorePublicFile(res, publicDir, 'foundation.html')
  })

  app.get('/foundation/export/strategy', requirePageAccess('owner'), (_req, res) => {
    sendNoStorePublicFile(res, publicDir, 'strategy-export.html')
  })

  app.get('/strategic-execution', requirePageAccess('owner'), (_req, res) => {
    sendNoStorePublicFile(res, publicDir, 'strategic-execution.html')
  })

  app.get('/sales', requirePageAccess('sales'), (_req, res) => {
    sendNoStorePublicFile(res, publicDir, 'sales.html')
  })

  app.get('/ops', requirePageAccess('ops'), (_req, res) => {
    sendNoStorePublicFile(res, publicDir, 'ops.html')
  })

  app.get('/dev', requirePageAccess('owner'), (_req, res) => {
    sendNoStorePublicFile(res, publicDir, 'dev.html')
  })

  app.get('/agent-feedback', (_req, res) => {
    sendNoStorePublicFile(res, publicDir, 'agent-feedback.html')
  })

  app.use('/api', (_req, res) => {
    sendApiError(res, 404, 'api_not_found', 'API endpoint not found.')
  })

  app.get('/', requirePageAccess('home'), (req, res) => {
    const user = getRequestAuthUser(req) || getLocalDevUser(req)
    if (user?.role === 'ops') {
      res.redirect('/ops')
      return
    }
    sendNoStorePublicFile(res, publicDir, 'index.html')
  })

  app.get('*', requirePageAccess('owner'), (_req, res) => {
    sendNoStorePublicFile(res, publicDir, 'index.html')
  })
}
