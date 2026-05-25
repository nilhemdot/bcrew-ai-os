import { buildDevTeamDirectorOperatorDogfood } from './dev-team-intelligence-director.js'
import { buildActionRouterOperatorDogfood } from './intelligence-action-router.js'
import { buildIntelligenceSynthesisOperatorDogfood } from './intelligence-synthesis.js'
import { DEFAULT_LLM_ROUTES, LLM_WORKLOADS } from './llm-router.js'

export const INTELLIGENCE_SPINE_GOD_MODE_CARD_ID = 'INTELLIGENCE-SPINE-GOD-MODE-001'
export const INTELLIGENCE_SPINE_GOD_MODE_PLAN_PATH = 'docs/process/intelligence-spine-god-mode-001-plan.md'
export const INTELLIGENCE_SPINE_GOD_MODE_SCRIPT_PATH = 'scripts/process-intelligence-spine-god-mode-check.mjs'

const DISALLOWED_CORE_MODEL_PATTERN = /\b5\.4\b|medium|configured-/i

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function routeByKey(routeKey, routes = DEFAULT_LLM_ROUTES) {
  return routes.find(route => route.routeKey === routeKey) || null
}

function validateCoreIntelligenceRoute({ routeKey, openClawRouteKey, workload, routes = DEFAULT_LLM_ROUTES, label = 'code' }) {
  const checks = []
  const route = routeByKey(routeKey, routes)
  const openClawRoute = routeByKey(openClawRouteKey, routes)

  addCheck(checks, Boolean(route), `${label}: ${routeKey} route exists`)
  addCheck(checks, route?.provider !== 'openclaw', `${label}: ${routeKey} is not OpenClaw`, route?.provider || 'missing')
  addCheck(checks, route?.workload === workload, `${label}: ${routeKey} has expected workload`, route?.workload || 'missing')
  addCheck(checks, /\bgpt-5\.5\b/i.test(route?.model || ''), `${label}: ${routeKey} uses GPT-5.5 for core intelligence`, route?.model || 'missing')
  addCheck(checks, route && !DISALLOWED_CORE_MODEL_PATTERN.test(route.model), `${label}: ${routeKey} does not use 5.4/medium/configured placeholder`, route?.model || 'missing')
  addCheck(checks, route?.metadata?.brainFleetCapability?.speedMode === 'fast', `${label}: ${routeKey} uses fast speed mode`, route?.metadata?.brainFleetCapability?.speedMode || 'missing')
  addCheck(checks, route?.metadata?.brainFleetCapability?.reasoningPosture === 'extra_high_required', `${label}: ${routeKey} requires extra-high reasoning`, route?.metadata?.brainFleetCapability?.reasoningPosture || 'missing')
  addCheck(checks, route?.metadata?.intelligenceSpinePolicy?.requiredPosture === 'gpt-5.5_extra_high_fast', `${label}: ${routeKey} declares GPT-5.5 extra-high fast posture`, route?.metadata?.intelligenceSpinePolicy?.requiredPosture || 'missing')
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

export function buildIntelligenceSpineGodModeDogfood({ runtimeRoutes = null } = {}) {
  const synthesis = buildIntelligenceSynthesisOperatorDogfood()
  const router = buildActionRouterOperatorDogfood()
  const director = buildDevTeamDirectorOperatorDogfood()
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
  const codeOpenClawBlock = validateNoRunnableOpenClawRoutes({ routes: DEFAULT_LLM_ROUTES })
  const runtimeOpenClawBlock = Array.isArray(runtimeRoutes) ? validateNoRunnableOpenClawRoutes({ routes: runtimeRoutes, label: 'runtime' }) : { ok: true, routes: [], checks: [] }
  const checks = [
    ...synthesis.checks.map(check => ({ ...check, area: 'synthesis' })),
    ...router.checks.map(check => ({ ...check, area: 'router' })),
    ...director.checks.map(check => ({ ...check, area: 'director' })),
    ...synthesisRoute.checks.map(check => ({ ...check, area: 'model-route' })),
    ...deepAuditRoute.checks.map(check => ({ ...check, area: 'model-route' })),
    ...runtimeSynthesisRoute.checks.map(check => ({ ...check, area: 'runtime-route' })),
    ...runtimeDeepAuditRoute.checks.map(check => ({ ...check, area: 'runtime-route' })),
    ...codeOpenClawBlock.checks.map(check => ({ ...check, area: 'openclaw-block' })),
    ...runtimeOpenClawBlock.checks.map(check => ({ ...check, area: 'openclaw-block' })),
  ]
  return {
    ok: synthesis.ok && router.ok && director.ok && synthesisRoute.ok && deepAuditRoute.ok && runtimeSynthesisRoute.ok && runtimeDeepAuditRoute.ok && codeOpenClawBlock.ok && runtimeOpenClawBlock.ok && checks.every(check => check.ok),
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
        synthesis: synthesisRoute.route,
        deepAudit: deepAuditRoute.route,
        runtimeSynthesis: runtimeSynthesisRoute.route,
        runtimeDeepAudit: runtimeDeepAuditRoute.route,
        blockedOpenClaw: codeOpenClawBlock.routes,
        runtimeBlockedOpenClaw: runtimeOpenClawBlock.routes,
      },
    },
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
