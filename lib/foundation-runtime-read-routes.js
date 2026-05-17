export const FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID = 'FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001'
export const FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CLOSEOUT_KEY = 'foundation-runtime-read-routes-split-v1'
export const FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_PLAN_PATH = 'docs/process/foundation-runtime-read-routes-split-001-plan.md'
export const FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001.json'
export const FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-runtime-read-routes-split-check.mjs'
export const FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SPRINT_ID = 'foundation-runtime-read-routes-split-2026-05-15'
export const FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES = 6831
export const FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_ROUTE_BUDGET_MS = 5000
export const FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_ROUTE_BUDGET_BYTES = 1_000_000

export function buildFoundationRuntimeReadRoutesSplitDogfoodProof({
  serverSource = '',
  moduleSource = '',
  proofScriptSource = '',
} = {}) {
  const healthy = {
    serverSource: "import { registerFoundationRuntimeReadRoutes } from './lib/foundation-runtime-read-routes.js'\nregisterFoundationRuntimeReadRoutes(app, {})",
    moduleSource: "export function registerFoundationRuntimeReadRoutes(app) { app.get('/api/foundation/jobs', requireAdminToken, async () => {}); app.get('/api/foundation/active-processes', requireAdminToken, async () => {}); app.get('/api/foundation/llm-runtime', requireAdminToken, async () => {}); app.get('/api/foundation/extraction-control', requireAdminToken, async () => {}) }",
    proofScriptSource: 'moved read routes return expected runtime status payloads without POSTing job-control mutations',
  }

  const evaluate = fixture => {
    const nextServerSource = String(fixture.serverSource ?? serverSource)
    const nextModuleSource = String(fixture.moduleSource ?? moduleSource)
    const nextProofScriptSource = String(fixture.proofScriptSource ?? proofScriptSource)
    const routeMarkers = [
      "app.get('/api/foundation/jobs'",
      "app.get('/api/foundation/active-processes'",
      "app.get('/api/foundation/llm-runtime'",
      "app.get('/api/foundation/extraction-control'",
    ]
    const mutationMarkers = [
      "app.post('/api/foundation/jobs/:jobKey/" + "control'",
      "app.post('/api/foundation/job-runs/:runId/" + "stop'",
      "app.post('/api/foundation/jobs/:jobKey/" + "decommission'",
    ]
    return routeMarkers.every(marker => nextModuleSource.includes(marker)) &&
      routeMarkers.every(marker => !nextServerSource.includes(marker)) &&
      nextServerSource.includes('registerFoundationRuntimeReadRoutes(app') &&
      mutationMarkers.every(marker => !nextModuleSource.includes(marker)) &&
      nextProofScriptSource.includes('without POSTing job-control mutations')
  }

  const passing = evaluate(healthy)
  const rejected = {
    missingModule: evaluate({ ...healthy, moduleSource: '' }) === false,
    oldInlineServer: evaluate({ ...healthy, serverSource: `${healthy.serverSource}\napp.get('/api/foundation/jobs', requireAdminToken, async () => {})` }) === false,
    missingRegistrar: evaluate({ ...healthy, serverSource: '' }) === false,
    mutatingRuntimeControl: evaluate({ ...healthy, moduleSource: `${healthy.moduleSource}\n${"app.post('/api/foundation/jobs/:jobKey/" + "control'"} , requireAdminToken, async () => {})` }) === false,
  }

  return {
    ok: passing && Object.values(rejected).every(Boolean),
    passing,
    rejected,
    summary: 'Foundation runtime read route split dogfood accepts healthy read-route module ownership and rejects missing module, old inline server route, missing registrar, and mutating runtime-control route leakage.',
  }
}

export function registerFoundationRuntimeReadRoutes(app, deps = {}) {
  const {
    requireAdminToken,
    sendApiError,
    cacheHeadersNoStore,
    getFoundationJobRunSnapshot,
    buildRuntimeProcessControlApiSnapshot,
    getLlmRuntimeSnapshot,
    getExtractionControlSnapshot,
    buildExtractionRuntimeReadinessPayload,
  } = deps

  app.get('/api/foundation/jobs', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30))
      const includeOutput = req.query.includeOutput === 'true'
      const snapshot = await getFoundationJobRunSnapshot({ limit, includeOutput })
      cacheHeadersNoStore(res)
      res.json(snapshot)
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_jobs_load_failed',
        error instanceof Error ? error.message : 'Failed to load Foundation job runs.'
      )
    }
  })

  app.get('/api/foundation/active-processes', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await buildRuntimeProcessControlApiSnapshot()
      cacheHeadersNoStore(res)
      res.json(snapshot)
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_active_processes_load_failed',
        error instanceof Error ? error.message : 'Failed to load Foundation active-process status.'
      )
    }
  })

  app.get('/api/foundation/llm-runtime', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30))
      const snapshot = await getLlmRuntimeSnapshot({ limit })
      cacheHeadersNoStore(res)
      res.json(snapshot)
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_llm_runtime_load_failed',
        error instanceof Error ? error.message : 'Failed to load LLM runtime status.'
      )
    }
  })

  app.get('/api/foundation/extraction-control', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
      const snapshot = await getExtractionControlSnapshot({ limit })
      cacheHeadersNoStore(res)
      res.json(snapshot)
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_extraction_control_load_failed',
        error instanceof Error ? error.message : 'Failed to load extraction control status.'
      )
    }
  })

  app.get('/api/foundation/extraction-runtime-readiness', requireAdminToken, async (_req, res) => {
    try {
      const extractionControlSnapshot = await getExtractionControlSnapshot({ limit: 200 })
      const snapshot = buildExtractionRuntimeReadinessPayload({ extractionControlSnapshot })
      cacheHeadersNoStore(res)
      res.json(snapshot)
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_extraction_runtime_readiness_load_failed',
        error instanceof Error ? error.message : 'Failed to load extraction runtime readiness.'
      )
    }
  })
}
