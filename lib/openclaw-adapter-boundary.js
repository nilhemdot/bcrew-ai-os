export const OPENCLAW_ADAPTER_BOUNDARY_CARD_ID = 'OPENCLAW-ADAPTER-BOUNDARY-001'
export const OPENCLAW_ADAPTER_BOUNDARY_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const OPENCLAW_ADAPTER_BOUNDARY_CLOSEOUT_KEY = 'openclaw-adapter-boundary-v1'
export const OPENCLAW_ADAPTER_BOUNDARY_PLAN_PATH = 'docs/process/openclaw-adapter-boundary-001-plan.md'
export const OPENCLAW_ADAPTER_BOUNDARY_APPROVAL_PATH = 'docs/process/approvals/OPENCLAW-ADAPTER-BOUNDARY-001.json'
export const OPENCLAW_ADAPTER_BOUNDARY_SCRIPT_PATH = 'scripts/process-openclaw-adapter-boundary-check.mjs'
export const OPENCLAW_ADAPTER_BOUNDARY_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-openclaw-adapter-boundary-closeout.md'
export const OPENCLAW_ADAPTER_BOUNDARY_NEXT_CARD_ID = 'EXTRACTOR-BRAIN-FLEET-PROOF-001'

export const OPENCLAW_CREDENTIAL_KEY = 'openclaw-chatgpt-pro'
export const OPENCLAW_ADAPTER_ROUTE_KEYS = [
  'foundation-extraction-openclaw-chatgpt',
  'foundation-synthesis-openclaw-chatgpt',
  'foundation-deep-audit-openclaw-chatgpt',
]

export const OPENCLAW_ADAPTER_NOT_NEXT = [
  'Do not make OpenClaw the Foundation architecture owner or a required core dependency.',
  'Do not run an OpenClaw provider/model probe, live extraction, browser automation, broad crawl, Strategy, or People work from this card.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions from this card.',
  'Do not mutate credentials, OAuth tokens, browser profiles, provider config, source systems, Drive permissions, or public exposure settings.',
  'Do not send emails, Telegram, Slack, public posts, Drive writes, or other external writes.',
  'Do not hide OpenClaw model, auth, quota, route, fallback, or hard-dependency ambiguity by classification.',
  'Do not continue to extractor proof until OpenClaw is explicitly labeled adapter-only and core workloads have non-OpenClaw fallback truth.',
]

export const OPENCLAW_ADAPTER_BOUNDARY_METADATA = Object.freeze({
  architectureRole: 'provider_adapter',
  architectureOwner: false,
  adapterOnly: true,
  coreDependencyAllowed: false,
  provider: 'openclaw',
  authPath: 'chatgpt_subscription_gateway',
  boundary: 'Foundation OS -> Brain Fleet / LLM Router -> Provider Adapters -> Agents / Workers',
  requiredPosture: 'useful_when_proven_not_architecture_owner',
  knownLimitations: [
    'openclaw_gateway_currently_limits_model_selection',
    'chatgpt_subscription_gateway_is_local_operator_tooling_not_generic_backend_api',
    'quota_reset_state_not_proven_by_openclaw_adapter_boundary',
    'exact_source_approval_and_brain_fleet_ledger_required_before_extractor_use',
    'non_openclaw_fallback_required_for_core_workloads',
  ],
})

function normalizeText(value) {
  return String(value || '').trim()
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

function unique(values = []) {
  const seen = new Set()
  const output = []
  for (const value of values.map(normalizeText).filter(Boolean)) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(value)
  }
  return output
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value || {}))
}

function routeMap(routes = []) {
  return new Map(asList(routes).map(route => [route.routeKey, route]))
}

function credentialMap(credentials = []) {
  return new Map(asList(credentials).map(credential => [credential.credentialKey, credential]))
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function buildOpenClawAdapterBoundaryMetadata(route = {}) {
  const workload = normalizeText(route.workload)
  return {
    openclawAdapterBoundary: {
      ...deepClone(OPENCLAW_ADAPTER_BOUNDARY_METADATA),
      routeKey: normalizeText(route.routeKey),
      workload,
      fallbackRouteKey: normalizeText(route.fallbackRouteKey),
    },
    brainFleetCapability: {
      speedMode: 'standard',
      reasoningPosture: workload === 'synthesis' || workload === 'deep_audit_senior_review' ? 'high' : 'standard',
      supports: {
        video: 'unsupported',
        vision: 'unsupported',
        longContext: 'probe_required',
      },
      authPosture: route.status === 'available' ? 'available' : 'probe_required',
      allowedWorkloads: unique([workload, 'extraction_probe', 'classification_probe', 'synthesis_probe', 'deep_audit_probe']),
      knownLimitations: OPENCLAW_ADAPTER_BOUNDARY_METADATA.knownLimitations,
    },
    knownLimitations: OPENCLAW_ADAPTER_BOUNDARY_METADATA.knownLimitations,
  }
}

export function buildOpenClawAdapterRouteUpdate(route = {}) {
  const metadata = {
    ...(route.metadata || {}),
    ...buildOpenClawAdapterBoundaryMetadata(route),
  }
  const notes = normalizeText(route.notes)
  const boundaryNote = 'OpenClaw is adapter-only: useful when proven, never the Foundation architecture owner, and always requires non-OpenClaw fallback truth for core workloads.'
  return {
    ...route,
    metadata,
    notes: notes.includes('adapter-only') ? notes : [notes, boundaryNote].filter(Boolean).join(' '),
  }
}

export function buildOpenClawAdapterRouteUpdates(routes = []) {
  const byRoute = routeMap(routes)
  return OPENCLAW_ADAPTER_ROUTE_KEYS
    .map(routeKey => byRoute.get(routeKey))
    .filter(Boolean)
    .map(buildOpenClawAdapterRouteUpdate)
}

function openClawRoutes(routes = []) {
  return asList(routes).filter(route => route.provider === 'openclaw')
}

function openClawCoreRoutes(routes = []) {
  const expected = new Set(OPENCLAW_ADAPTER_ROUTE_KEYS)
  return openClawRoutes(routes).filter(route => expected.has(route.routeKey))
}

function hasAdapterBoundary(route = {}) {
  const boundary = route.metadata?.openclawAdapterBoundary || {}
  return boundary.architectureRole === 'provider_adapter' &&
    boundary.adapterOnly === true &&
    boundary.architectureOwner === false &&
    boundary.coreDependencyAllowed === false
}

function nonOpenClawFallbackOk(route = {}, byRoute = new Map()) {
  const fallbackKey = normalizeText(route.fallbackRouteKey)
  if (!fallbackKey) return false
  const fallback = byRoute.get(fallbackKey)
  return Boolean(fallback) &&
    fallback.provider !== 'openclaw' &&
    fallback.workload === route.workload
}

function workloadHasNonOpenClawAlternative(route = {}, routes = []) {
  return asList(routes).some(candidate =>
    candidate.routeKey !== route.routeKey &&
    candidate.workload === route.workload &&
    candidate.provider !== 'openclaw'
  )
}

export function evaluateOpenClawAdapterBoundary({
  routes = [],
  credentials = [],
  moduleSource = '',
  routerSource = '',
  capabilityRegistrySource = '',
  planSource = '',
  scriptSource = '',
  packageJson = {},
  closeout = null,
  syntheticProof = null,
} = {}) {
  const checks = []
  const byRoute = routeMap(routes)
  const byCredential = credentialMap(credentials)
  const coreRoutes = openClawCoreRoutes(routes)
  const expectedRouteKeys = new Set(OPENCLAW_ADAPTER_ROUTE_KEYS)
  const presentRouteKeys = new Set(coreRoutes.map(route => route.routeKey))

  addCheck(
    checks,
    expectedRouteKeys.size === presentRouteKeys.size && [...expectedRouteKeys].every(routeKey => presentRouteKeys.has(routeKey)),
    'OpenClaw core adapter routes are present',
    [...presentRouteKeys].join(', ') || 'missing',
  )
  addCheck(
    checks,
    byCredential.get(OPENCLAW_CREDENTIAL_KEY)?.provider === 'openclaw',
    'OpenClaw credential remains represented without mutation requirement',
    byCredential.get(OPENCLAW_CREDENTIAL_KEY) ? OPENCLAW_CREDENTIAL_KEY : 'missing',
  )
  addCheck(
    checks,
    coreRoutes.length > 0 && coreRoutes.every(hasAdapterBoundary),
    'OpenClaw routes are labeled adapter-only, not architecture owner',
    coreRoutes.filter(route => !hasAdapterBoundary(route)).map(route => route.routeKey).join(', ') || 'all labeled',
  )
  addCheck(
    checks,
    coreRoutes.length > 0 && coreRoutes.every(route => nonOpenClawFallbackOk(route, byRoute)),
    'OpenClaw core routes have same-workload non-OpenClaw fallbacks',
    coreRoutes.map(route => `${route.routeKey}->${route.fallbackRouteKey || 'missing'}`).join(', '),
  )
  addCheck(
    checks,
    coreRoutes.length > 0 && coreRoutes.every(route => workloadHasNonOpenClawAlternative(route, routes)),
    'Core workloads have non-OpenClaw route alternatives',
    coreRoutes.map(route => route.workload).join(', '),
  )
  addCheck(
    checks,
    asList(routes).filter(route => route.provider !== 'openclaw').every(route => {
      const fallback = byRoute.get(normalizeText(route.fallbackRouteKey))
      return !fallback || fallback.provider !== 'openclaw'
    }),
    'Non-OpenClaw routes do not fall back into OpenClaw',
    'fallback graph checked',
  )
  addCheck(
    checks,
    moduleSource.includes('OPENCLAW_ADAPTER_BOUNDARY_METADATA') &&
      moduleSource.includes('coreDependencyAllowed: false') &&
      moduleSource.includes('buildOpenClawAdapterRouteUpdate'),
    'module owns adapter-boundary metadata and route patch behavior',
    'lib/openclaw-adapter-boundary.js',
  )
  addCheck(
    checks,
    routerSource.includes('openclawAdapterBoundary') &&
      routerSource.includes('adapter-only') &&
      routerSource.includes('non-OpenClaw fallback truth'),
    'LLM router defaults label OpenClaw as adapter-only',
    'lib/llm-router.js',
  )
  addCheck(
    checks,
    capabilityRegistrySource.includes('openclaw_adapter_scoped_route') &&
      capabilityRegistrySource.includes('direct_codex_route_must_probe_native_model_and_speed_truth'),
    'Brain Fleet capability registry keeps OpenClaw limitations visible',
    'lib/brain-fleet-model-capability-registry.js',
  )
  addCheck(
    checks,
    scriptSource.includes('upsertLlmRoute') &&
      !scriptSource.includes('upsertLlmCredential(') &&
      !scriptSource.includes('callLlm(') &&
      !scriptSource.includes('callOpenClawModelRun'),
    'focused proof updates route metadata only and does not call providers or mutate credentials',
    OPENCLAW_ADAPTER_BOUNDARY_SCRIPT_PATH,
  )
  addCheck(
    checks,
    planSource.includes('Foundation OS -> Brain Fleet / LLM Router -> Provider Adapters -> Agents / Workers') &&
      planSource.includes('not the Foundation architecture owner') &&
      planSource.includes('No provider probe'),
    'plan states adapter doctrine and no-provider-probe boundary',
    OPENCLAW_ADAPTER_BOUNDARY_PLAN_PATH,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:openclaw-adapter-boundary-check'] === `node --env-file-if-exists=.env ${OPENCLAW_ADAPTER_BOUNDARY_SCRIPT_PATH}`,
    'package exposes focused OpenClaw adapter-boundary proof',
    packageJson.scripts?.['process:openclaw-adapter-boundary-check'] || 'missing',
  )
  addCheck(
    checks,
    closeout && asList(closeout.backlogIds).includes(OPENCLAW_ADAPTER_BOUNDARY_CARD_ID),
    'closeout registry links OpenClaw adapter-boundary card',
    closeout?.key || 'missing',
  )
  addCheck(
    checks,
    syntheticProof?.ok === true,
    'synthetic dogfood proves OpenClaw hard-dependency failures fail closed',
    syntheticProof?.mode || 'missing',
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    routeKeys: coreRoutes.map(route => route.routeKey),
  }
}

export function buildSyntheticOpenClawAdapterBoundaryProof() {
  const credential = {
    credentialKey: OPENCLAW_CREDENTIAL_KEY,
    provider: 'openclaw',
    status: 'available',
    policyClassification: 'experimental',
  }
  const fallbackRoutes = [
    { routeKey: 'foundation-extraction-openai-api', workload: 'extraction', provider: 'openai' },
    { routeKey: 'foundation-synthesis-openai-api', workload: 'synthesis', provider: 'openai' },
    { routeKey: 'foundation-deep-audit-openai-api', workload: 'deep_audit_senior_review', provider: 'openai' },
  ]
  const openClawRoutesWithBoundary = [
    {
      routeKey: 'foundation-extraction-openclaw-chatgpt',
      workload: 'extraction',
      provider: 'openclaw',
      status: 'available',
      fallbackRouteKey: 'foundation-extraction-openai-api',
      metadata: buildOpenClawAdapterBoundaryMetadata({ routeKey: 'foundation-extraction-openclaw-chatgpt', workload: 'extraction', fallbackRouteKey: 'foundation-extraction-openai-api', status: 'available' }),
    },
    {
      routeKey: 'foundation-synthesis-openclaw-chatgpt',
      workload: 'synthesis',
      provider: 'openclaw',
      status: 'available',
      fallbackRouteKey: 'foundation-synthesis-openai-api',
      metadata: buildOpenClawAdapterBoundaryMetadata({ routeKey: 'foundation-synthesis-openclaw-chatgpt', workload: 'synthesis', fallbackRouteKey: 'foundation-synthesis-openai-api', status: 'available' }),
    },
    {
      routeKey: 'foundation-deep-audit-openclaw-chatgpt',
      workload: 'deep_audit_senior_review',
      provider: 'openclaw',
      status: 'available',
      fallbackRouteKey: 'foundation-deep-audit-openai-api',
      metadata: buildOpenClawAdapterBoundaryMetadata({ routeKey: 'foundation-deep-audit-openclaw-chatgpt', workload: 'deep_audit_senior_review', fallbackRouteKey: 'foundation-deep-audit-openai-api', status: 'available' }),
    },
  ]
  const healthyContext = {
    routes: [...fallbackRoutes, ...openClawRoutesWithBoundary],
    credentials: [credential],
    moduleSource: 'OPENCLAW_ADAPTER_BOUNDARY_METADATA coreDependencyAllowed: false buildOpenClawAdapterRouteUpdate',
    routerSource: 'openclawAdapterBoundary adapter-only non-OpenClaw fallback truth',
    capabilityRegistrySource: 'openclaw_adapter_scoped_route direct_codex_route_must_probe_native_model_and_speed_truth',
    planSource: 'Foundation OS -> Brain Fleet / LLM Router -> Provider Adapters -> Agents / Workers not the Foundation architecture owner No provider probe',
    scriptSource: 'upsertLlmRoute',
    packageJson: { scripts: { 'process:openclaw-adapter-boundary-check': `node --env-file-if-exists=.env ${OPENCLAW_ADAPTER_BOUNDARY_SCRIPT_PATH}` } },
    closeout: { key: OPENCLAW_ADAPTER_BOUNDARY_CLOSEOUT_KEY, backlogIds: [OPENCLAW_ADAPTER_BOUNDARY_CARD_ID] },
  }
  const healthy = evaluateOpenClawAdapterBoundary({ ...healthyContext, syntheticProof: { ok: true, mode: 'nested' } })
  const missingFallback = evaluateOpenClawAdapterBoundary({
    ...healthyContext,
    routes: healthyContext.routes.map(route => route.routeKey === 'foundation-extraction-openclaw-chatgpt' ? { ...route, fallbackRouteKey: '' } : route),
    syntheticProof: { ok: true, mode: 'nested' },
  })
  const architectureOwner = evaluateOpenClawAdapterBoundary({
    ...healthyContext,
    routes: healthyContext.routes.map(route => route.provider === 'openclaw' ? { ...route, metadata: { openclawAdapterBoundary: { architectureRole: 'system_architecture', adapterOnly: false, architectureOwner: true, coreDependencyAllowed: true } } } : route),
    syntheticProof: { ok: true, mode: 'nested' },
  })
  const onlyOpenClaw = evaluateOpenClawAdapterBoundary({
    ...healthyContext,
    routes: openClawRoutesWithBoundary,
    syntheticProof: { ok: true, mode: 'nested' },
  })
  const reverseFallback = evaluateOpenClawAdapterBoundary({
    ...healthyContext,
    routes: healthyContext.routes.map(route => route.routeKey === 'foundation-extraction-openai-api' ? { ...route, fallbackRouteKey: 'foundation-extraction-openclaw-chatgpt' } : route),
    syntheticProof: { ok: true, mode: 'nested' },
  })
  return {
    ok: healthy.ok && !missingFallback.ok && !architectureOwner.ok && !onlyOpenClaw.ok && !reverseFallback.ok,
    mode: 'openclaw-adapter-boundary-synthetic-proof',
    healthy: { ok: healthy.ok, checks: healthy.checks.length },
    missingFallback: { ok: missingFallback.ok, failed: missingFallback.failed.map(item => item.check) },
    architectureOwner: { ok: architectureOwner.ok, failed: architectureOwner.failed.map(item => item.check) },
    onlyOpenClaw: { ok: onlyOpenClaw.ok, failed: onlyOpenClaw.failed.map(item => item.check) },
    reverseFallback: { ok: reverseFallback.ok, failed: reverseFallback.failed.map(item => item.check) },
  }
}
