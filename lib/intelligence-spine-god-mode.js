import { buildDevTeamDirectorOperatorDogfood } from './dev-team-intelligence-director.js'
import { buildActionRouterOperatorDogfood } from './intelligence-action-router.js'
import { buildIntelligenceSynthesisOperatorDogfood } from './intelligence-synthesis.js'
import { DEFAULT_LLM_ROUTES, LLM_WORKLOADS } from './llm-router.js'

export const INTELLIGENCE_SPINE_GOD_MODE_CARD_ID = 'INTELLIGENCE-SPINE-GOD-MODE-001'
export const INTELLIGENCE_SPINE_GOD_MODE_PLAN_PATH = 'docs/process/intelligence-spine-god-mode-001-plan.md'
export const INTELLIGENCE_SPINE_GOD_MODE_SCRIPT_PATH = 'scripts/process-intelligence-spine-god-mode-check.mjs'

const DISALLOWED_CORE_MODEL_PATTERN = /\b5\.4\b|medium|configured-/i
const DISALLOWED_AVAILABLE_MODEL_PATTERN = /\b5\.4\b|medium|configured-|default-.*model/i
const APPROVED_HIGH_INTELLIGENCE_MODEL_PATTERN = /\bgpt-5\.[5-9]\b|opus|claude.*opus|sonnet|gemini.*pro/i
const APPROVED_VIDEO_MODEL_PATTERN = /\bgemini-[3-9]\.[0-9]+.*flash\b|gemini.*pro/i
const ALLOWED_CORE_SPEED_MODES = new Set(['quality', 'max'])

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function routeByKey(routeKey, routes = DEFAULT_LLM_ROUTES) {
  return routes.find(route => route.routeKey === routeKey) || null
}

function compactPosturePart(value) {
  return String(value || '')
    .trim()
    .replace(/_required$/i, '')
    .replace(/[^a-z0-9.-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
}

function buildRequiredPosture({ model, reasoningPosture, speedMode }) {
  return [
    compactPosturePart(model),
    compactPosturePart(reasoningPosture),
    compactPosturePart(speedMode),
  ].filter(Boolean).join('_')
}

function validateCoreIntelligenceRoute({ routeKey, openClawRouteKey, workload, routes = DEFAULT_LLM_ROUTES, label = 'code' }) {
  const checks = []
  const route = routeByKey(routeKey, routes)
  const openClawRoute = routeByKey(openClawRouteKey, routes)
  const speedMode = route?.metadata?.brainFleetCapability?.speedMode || ''
  const reasoningPosture = route?.metadata?.brainFleetCapability?.reasoningPosture || ''
  const expectedPosture = buildRequiredPosture({
    model: route?.model || '',
    reasoningPosture,
    speedMode,
  })

  addCheck(checks, Boolean(route), `${label}: ${routeKey} route exists`)
  addCheck(checks, route?.provider !== 'openclaw', `${label}: ${routeKey} is not OpenClaw`, route?.provider || 'missing')
  addCheck(checks, route?.workload === workload, `${label}: ${routeKey} has expected workload`, route?.workload || 'missing')
  addCheck(checks, APPROVED_HIGH_INTELLIGENCE_MODEL_PATTERN.test(route?.model || ''), `${label}: ${routeKey} uses an approved high-intelligence model`, route?.model || 'missing')
  addCheck(checks, route && !DISALLOWED_CORE_MODEL_PATTERN.test(route.model), `${label}: ${routeKey} does not use 5.4/medium/configured placeholder`, route?.model || 'missing')
  addCheck(checks, ALLOWED_CORE_SPEED_MODES.has(speedMode), `${label}: ${routeKey} uses an approved core speed mode`, speedMode || 'missing')
  addCheck(checks, reasoningPosture === 'extra_high_required', `${label}: ${routeKey} requires extra-high reasoning`, reasoningPosture || 'missing')
  addCheck(checks, route?.metadata?.intelligenceSpinePolicy?.requiredPosture === expectedPosture, `${label}: ${routeKey} declares its active high-intelligence posture`, route?.metadata?.intelligenceSpinePolicy?.requiredPosture || 'missing')
  addCheck(checks, route?.metadata?.intelligenceSpinePolicy?.openClawPrimaryAllowed === false, `${label}: ${routeKey} blocks OpenClaw as primary Intelligence Spine brain`)
  addCheck(checks, Boolean(openClawRoute), `${label}: ${openClawRouteKey} fallback/candidate route exists`)
  addCheck(checks, openClawRoute && Number(openClawRoute.priority) > Number(route?.priority ?? 9999), `${label}: ${openClawRouteKey} is lower priority than official high-intelligence route`, `${openClawRoute?.priority ?? 'missing'} > ${route?.priority ?? 'missing'}`)
  addCheck(checks, openClawRoute && openClawRoute.status === 'blocked' && openClawRoute.policyClassification === 'blocked', `${label}: ${openClawRouteKey} is blocked for core Intelligence Spine work`, `${openClawRoute?.status || 'missing'} / ${openClawRoute?.policyClassification || 'missing'}`)

  return {
    ok: checks.every(check => check.ok),
    route: route ? {
      routeKey: route.routeKey,
      workload: route.workload,
      provider: route.provider,
      model: route.model,
      priority: route.priority,
      speedMode: route.metadata?.brainFleetCapability?.speedMode || null,
      reasoningPosture: route.metadata?.brainFleetCapability?.reasoningPosture || null,
      requiredPosture: route.metadata?.intelligenceSpinePolicy?.requiredPosture || null,
    } : null,
    checks,
  }
}

function validateNoRunnableOpenClawRoutes({ routes = DEFAULT_LLM_ROUTES, label = 'code' } = {}) {
  const checks = []
  const openClawRoutes = routes.filter(route => route.provider === 'openclaw')
  const runnable = openClawRoutes.filter(route => route.status !== 'blocked' || route.policyClassification !== 'blocked' || route.riskClass !== 'blocked')
  addCheck(checks, openClawRoutes.length > 0, `${label}: OpenClaw routes are visible for policy proof`, String(openClawRoutes.length))
  addCheck(checks, runnable.length === 0, `${label}: no OpenClaw route is runnable for Foundation workloads`, runnable.map(route => `${route.routeKey}:${route.status}/${route.policyClassification}/${route.riskClass}`).join(', '))
  addCheck(checks, openClawRoutes.every(route => Number(route.priority) >= 95), `${label}: OpenClaw routes stay at lowest priority`, openClawRoutes.map(route => `${route.routeKey}:${route.priority}`).join(', '))
  return {
    ok: checks.every(check => check.ok),
    routes: openClawRoutes.map(route => ({
      routeKey: route.routeKey,
      workload: route.workload,
      provider: route.provider,
      model: route.model,
      priority: route.priority,
      status: route.status,
      policyClassification: route.policyClassification,
      riskClass: route.riskClass,
    })),
    checks,
  }
}

function validateFoundationExtractionRoute({ routeKey, openClawRouteKey, routes = DEFAULT_LLM_ROUTES, label = 'code' }) {
  const checks = []
  const route = routeByKey(routeKey, routes)
  const openClawRoute = routeByKey(openClawRouteKey, routes)
  const speedMode = route?.metadata?.brainFleetCapability?.speedMode || ''
  const reasoningPosture = route?.metadata?.brainFleetCapability?.reasoningPosture || ''

  addCheck(checks, Boolean(route), `${label}: ${routeKey} extraction route exists`)
  addCheck(checks, route?.provider !== 'openclaw', `${label}: ${routeKey} is not OpenClaw`, route?.provider || 'missing')
  addCheck(checks, route?.workload === LLM_WORKLOADS.EXTRACTION, `${label}: ${routeKey} has extraction workload`, route?.workload || 'missing')
  addCheck(checks, APPROVED_HIGH_INTELLIGENCE_MODEL_PATTERN.test(route?.model || ''), `${label}: ${routeKey} uses a high-intelligence extraction model`, route?.model || 'missing')
  addCheck(checks, route && !DISALLOWED_CORE_MODEL_PATTERN.test(route.model), `${label}: ${routeKey} does not use 5.4/medium/configured placeholder`, route?.model || 'missing')
  addCheck(checks, ALLOWED_CORE_SPEED_MODES.has(speedMode), `${label}: ${routeKey} uses an approved extraction speed mode`, speedMode || 'missing')
  addCheck(checks, reasoningPosture === 'extra_high_required', `${label}: ${routeKey} requires extra-high extraction reasoning`, reasoningPosture || 'missing')
  addCheck(checks, Boolean(openClawRoute), `${label}: ${openClawRouteKey} extraction fallback/candidate route exists`)
  addCheck(checks, openClawRoute && Number(openClawRoute.priority) > Number(route?.priority ?? 9999), `${label}: ${openClawRouteKey} is lower priority than official extraction route`, `${openClawRoute?.priority ?? 'missing'} > ${route?.priority ?? 'missing'}`)
  addCheck(checks, openClawRoute && openClawRoute.status === 'blocked' && openClawRoute.policyClassification === 'blocked', `${label}: ${openClawRouteKey} is blocked for automated extraction`, `${openClawRoute?.status || 'missing'} / ${openClawRoute?.policyClassification || 'missing'}`)

  return {
    ok: checks.every(check => check.ok),
    route: route ? {
      routeKey: route.routeKey,
      workload: route.workload,
      provider: route.provider,
      model: route.model,
      priority: route.priority,
      speedMode,
      reasoningPosture,
      status: route.status || null,
      policyClassification: route.policyClassification || null,
    } : null,
    checks,
  }
}

function validateVideoVisionRoute({ routeKey, routes = DEFAULT_LLM_ROUTES, label = 'code' }) {
  const checks = []
  const route = routeByKey(routeKey, routes)
  const speedMode = route?.metadata?.brainFleetCapability?.speedMode || ''
  const reasoningPosture = route?.metadata?.brainFleetCapability?.reasoningPosture || ''

  addCheck(checks, Boolean(route), `${label}: ${routeKey} video/eyes route exists`)
  addCheck(checks, route?.provider === 'gemini', `${label}: ${routeKey} uses Gemini API for video eyes`, route?.provider || 'missing')
  addCheck(checks, route?.workload === LLM_WORKLOADS.VIDEO_VISION, `${label}: ${routeKey} has video vision workload`, route?.workload || 'missing')
  addCheck(checks, APPROVED_VIDEO_MODEL_PATTERN.test(route?.model || ''), `${label}: ${routeKey} uses approved video-understanding model`, route?.model || 'missing')
  addCheck(checks, speedMode === 'quality' || speedMode === 'vision', `${label}: ${routeKey} uses quality/vision posture`, speedMode || 'missing')
  addCheck(checks, reasoningPosture === 'vision_multimodal', `${label}: ${routeKey} is explicitly multimodal`, reasoningPosture || 'missing')
  addCheck(checks, route?.authPath === 'gemini_api_direct', `${label}: ${routeKey} uses Gemini API direct, not browser/subscription guessing`, route?.authPath || 'missing')

  return {
    ok: checks.every(check => check.ok),
    route: route ? {
      routeKey: route.routeKey,
      workload: route.workload,
      provider: route.provider,
      model: route.model,
      priority: route.priority,
      speedMode,
      reasoningPosture,
      status: route.status || null,
      policyClassification: route.policyClassification || null,
    } : null,
    checks,
  }
}

function validateNoAvailablePlaceholderRoutes({ routes = DEFAULT_LLM_ROUTES, label = 'code' } = {}) {
  const criticalWorkloads = new Set([
    LLM_WORKLOADS.EXTRACTION,
    LLM_WORKLOADS.SYNTHESIS,
    LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
    LLM_WORKLOADS.VIDEO_VISION,
  ])
  const offenders = routes
    .filter(route => criticalWorkloads.has(route.workload))
    .filter(route => route.status === 'available')
    .filter(route => DISALLOWED_AVAILABLE_MODEL_PATTERN.test(route.model || ''))
  const checks = []
  addCheck(checks, offenders.length === 0, `${label}: no available critical route uses weak/default/configured model labels`, offenders.map(route => `${route.routeKey}:${route.model}`).join(', '))
  return {
    ok: checks.every(check => check.ok),
    routes: offenders.map(route => ({
      routeKey: route.routeKey,
      workload: route.workload,
      provider: route.provider,
      model: route.model,
      status: route.status,
      policyClassification: route.policyClassification,
      riskClass: route.riskClass,
    })),
    checks,
  }
}

export function buildIntelligenceSpineGodModeDogfood({ runtimeRoutes = null } = {}) {
  const synthesis = buildIntelligenceSynthesisOperatorDogfood()
  const router = buildActionRouterOperatorDogfood()
  const director = buildDevTeamDirectorOperatorDogfood()
  const extractionRoute = validateFoundationExtractionRoute({
    routeKey: 'foundation-extraction-openai-api',
    openClawRouteKey: 'foundation-extraction-openclaw-chatgpt',
  })
  const synthesisRoute = validateCoreIntelligenceRoute({
    routeKey: 'foundation-synthesis-openai-api',
    openClawRouteKey: 'foundation-synthesis-openclaw-chatgpt',
    workload: LLM_WORKLOADS.SYNTHESIS,
  })
  const deepAuditRoute = validateCoreIntelligenceRoute({
    routeKey: 'foundation-deep-audit-openai-api',
    openClawRouteKey: 'foundation-deep-audit-openclaw-chatgpt',
    workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
  })
  const videoRoute = validateVideoVisionRoute({
    routeKey: 'foundation-video-gemini-api',
  })
  const runtimeExtractionRoute = Array.isArray(runtimeRoutes) ? validateFoundationExtractionRoute({
    routeKey: 'foundation-extraction-openai-api',
    openClawRouteKey: 'foundation-extraction-openclaw-chatgpt',
    routes: runtimeRoutes,
    label: 'runtime',
  }) : { ok: true, route: null, checks: [] }
  const runtimeSynthesisRoute = Array.isArray(runtimeRoutes) ? validateCoreIntelligenceRoute({
    routeKey: 'foundation-synthesis-openai-api',
    openClawRouteKey: 'foundation-synthesis-openclaw-chatgpt',
    workload: LLM_WORKLOADS.SYNTHESIS,
    routes: runtimeRoutes,
    label: 'runtime',
  }) : { ok: true, route: null, checks: [] }
  const runtimeDeepAuditRoute = Array.isArray(runtimeRoutes) ? validateCoreIntelligenceRoute({
    routeKey: 'foundation-deep-audit-openai-api',
    openClawRouteKey: 'foundation-deep-audit-openclaw-chatgpt',
    workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
    routes: runtimeRoutes,
    label: 'runtime',
  }) : { ok: true, route: null, checks: [] }
  const runtimeVideoRoute = Array.isArray(runtimeRoutes) ? validateVideoVisionRoute({
    routeKey: 'foundation-video-gemini-api',
    routes: runtimeRoutes,
    label: 'runtime',
  }) : { ok: true, route: null, checks: [] }
  const codeOpenClawBlock = validateNoRunnableOpenClawRoutes({ routes: DEFAULT_LLM_ROUTES })
  const runtimeOpenClawBlock = Array.isArray(runtimeRoutes) ? validateNoRunnableOpenClawRoutes({ routes: runtimeRoutes, label: 'runtime' }) : { ok: true, routes: [], checks: [] }
  const codePlaceholderBlock = validateNoAvailablePlaceholderRoutes({ routes: DEFAULT_LLM_ROUTES })
  const runtimePlaceholderBlock = Array.isArray(runtimeRoutes) ? validateNoAvailablePlaceholderRoutes({ routes: runtimeRoutes, label: 'runtime' }) : { ok: true, routes: [], checks: [] }
  const checks = [
    ...synthesis.checks.map(check => ({ ...check, area: 'synthesis' })),
    ...router.checks.map(check => ({ ...check, area: 'router' })),
    ...director.checks.map(check => ({ ...check, area: 'director' })),
    ...extractionRoute.checks.map(check => ({ ...check, area: 'model-route' })),
    ...synthesisRoute.checks.map(check => ({ ...check, area: 'model-route' })),
    ...deepAuditRoute.checks.map(check => ({ ...check, area: 'model-route' })),
    ...videoRoute.checks.map(check => ({ ...check, area: 'model-route' })),
    ...runtimeExtractionRoute.checks.map(check => ({ ...check, area: 'runtime-route' })),
    ...runtimeSynthesisRoute.checks.map(check => ({ ...check, area: 'runtime-route' })),
    ...runtimeDeepAuditRoute.checks.map(check => ({ ...check, area: 'runtime-route' })),
    ...runtimeVideoRoute.checks.map(check => ({ ...check, area: 'runtime-route' })),
    ...codeOpenClawBlock.checks.map(check => ({ ...check, area: 'openclaw-block' })),
    ...runtimeOpenClawBlock.checks.map(check => ({ ...check, area: 'openclaw-block' })),
    ...codePlaceholderBlock.checks.map(check => ({ ...check, area: 'placeholder-block' })),
    ...runtimePlaceholderBlock.checks.map(check => ({ ...check, area: 'placeholder-block' })),
  ]
  return {
    ok: synthesis.ok &&
      router.ok &&
      director.ok &&
      extractionRoute.ok &&
      synthesisRoute.ok &&
      deepAuditRoute.ok &&
      videoRoute.ok &&
      runtimeExtractionRoute.ok &&
      runtimeSynthesisRoute.ok &&
      runtimeDeepAuditRoute.ok &&
      runtimeVideoRoute.ok &&
      codeOpenClawBlock.ok &&
      runtimeOpenClawBlock.ok &&
      codePlaceholderBlock.ok &&
      runtimePlaceholderBlock.ok &&
      checks.every(check => check.ok),
    cardId: INTELLIGENCE_SPINE_GOD_MODE_CARD_ID,
    status: checks.every(check => check.ok) ? 'healthy' : 'blocked',
    proof: {
      synthesis: {
        title: synthesis.item?.title || null,
        summary: synthesis.item?.summary || null,
        actionReadiness: synthesis.item?.attributes?.actionReadiness || null,
      },
      router: {
        routeType: router.route?.routeType || null,
        routingReason: router.route?.routingReason || null,
        whyItMatters: router.route?.proposedPayload?.whyItMatters || null,
      },
      director: {
        topTitle: director.snapshot?.recommendedBuildNow?.[0]?.title || null,
        topReadiness: director.snapshot?.recommendedBuildNow?.[0]?.scopeReadiness?.status || null,
      },
      routes: {
        extraction: extractionRoute.route,
        synthesis: synthesisRoute.route,
        deepAudit: deepAuditRoute.route,
        video: videoRoute.route,
        runtimeExtraction: runtimeExtractionRoute.route,
        runtimeSynthesis: runtimeSynthesisRoute.route,
        runtimeDeepAudit: runtimeDeepAuditRoute.route,
        runtimeVideo: runtimeVideoRoute.route,
        blockedOpenClaw: codeOpenClawBlock.routes,
        runtimeBlockedOpenClaw: runtimeOpenClawBlock.routes,
        availablePlaceholders: codePlaceholderBlock.routes,
        runtimeAvailablePlaceholders: runtimePlaceholderBlock.routes,
      },
    },
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
