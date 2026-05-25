#!/usr/bin/env node

import {
  closeFoundationDb,
  getLlmRuntimeSnapshot,
  initFoundationDb,
  upsertLlmRoute,
} from '../lib/foundation-db.js'
import {
  INTELLIGENCE_SPINE_GOD_MODE_CARD_ID,
  buildIntelligenceSpineGodModeDogfood,
} from '../lib/intelligence-spine-god-mode.js'
import { DEFAULT_LLM_ROUTES } from '../lib/llm-router.js'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: argv.includes('--apply') || argv.includes('--apply=true'),
  }
}

const CORE_ROUTE_KEYS = new Set([
  'foundation-extraction-openclaw-chatgpt',
  'foundation-synthesis-openai-api',
  'foundation-synthesis-openclaw-chatgpt',
  'foundation-deep-audit-openai-api',
  'foundation-deep-audit-openclaw-chatgpt',
])

async function readRuntimeRoutes() {
  const snapshot = await getLlmRuntimeSnapshot({ limit: 200 })
  return snapshot.routes.filter(route => CORE_ROUTE_KEYS.has(route.routeKey) || route.provider === 'openclaw')
}

async function syncCoreRoutes(actor = 'intelligence-spine-god-mode-check') {
  const before = await readRuntimeRoutes()
  const byKey = new Map(before.map(route => [route.routeKey, route]))
  const synced = []
  for (const route of DEFAULT_LLM_ROUTES.filter(item => CORE_ROUTE_KEYS.has(item.routeKey))) {
    const existing = byKey.get(route.routeKey)
    const operatorConfigured = route.provider !== 'openclaw' && (
      existing?.metadata?.modelRouteControl?.operatorConfigured === true ||
      existing?.metadata?.intelligenceSpinePolicy?.operatorConfigured === true
    )
    const existingBrain = existing?.metadata?.brainFleetCapability || {}
    const routeBrain = route.metadata?.brainFleetCapability || {}
    const existingPolicy = existing?.metadata?.intelligenceSpinePolicy || {}
    const routePolicy = route.metadata?.intelligenceSpinePolicy || {}
    synced.push(await upsertLlmRoute({
      ...route,
      provider: operatorConfigured ? existing.provider : route.provider,
      model: operatorConfigured ? existing.model : route.model,
      authPath: operatorConfigured ? existing.authPath : route.authPath,
      credentialKey: operatorConfigured ? existing.credentialKey : route.credentialKey,
      fallbackRouteKey: operatorConfigured ? existing.fallbackRouteKey : route.fallbackRouteKey,
      priority: operatorConfigured ? existing.priority : route.priority,
      status: route.provider === 'openclaw' ? route.status : (existing?.status || route.status),
      policyClassification: route.provider === 'openclaw' ? route.policyClassification : (existing?.policyClassification || route.policyClassification),
      riskClass: route.provider === 'openclaw' ? route.riskClass : (existing?.riskClass || route.riskClass),
      metadata: {
        ...(route.metadata || {}),
        ...(operatorConfigured ? (existing.metadata || {}) : {}),
        brainFleetCapability: {
          ...routeBrain,
          ...(operatorConfigured ? existingBrain : {}),
        },
        intelligenceSpinePolicy: {
          ...routePolicy,
          ...(operatorConfigured ? existingPolicy : {}),
        },
        syncedBy: 'INTELLIGENCE-SPINE-GOD-MODE-001',
        syncedAt: new Date().toISOString(),
        preservedStatus: existing?.status || null,
        preservedOperatorModelRoute: operatorConfigured,
      },
    }, actor))
  }
  return synced
}

function renderText(result) {
  const lines = []
  lines.push(`${INTELLIGENCE_SPINE_GOD_MODE_CARD_ID}: ${result.ok ? 'PASS' : 'FAIL'}`)
  lines.push('')
  lines.push('Proof:')
  lines.push(`- Synthesis: ${result.proof.synthesis.title || 'missing'} (${result.proof.synthesis.actionReadiness || 'missing readiness'})`)
  lines.push(`- Router: ${result.proof.router.routeType || 'missing'} - ${result.proof.router.routingReason || 'missing reason'}`)
  lines.push(`- Director: ${result.proof.director.topTitle || 'missing'} (${result.proof.director.topReadiness || 'missing readiness'})`)
  lines.push(`- Synthesis model route: ${result.proof.routes.synthesis?.provider || 'missing'} ${result.proof.routes.synthesis?.model || ''}`)
  lines.push(`- Deep review model route: ${result.proof.routes.deepAudit?.provider || 'missing'} ${result.proof.routes.deepAudit?.model || ''}`)
  lines.push('')
  for (const check of result.checks) {
    lines.push(`${check.ok ? 'PASS' : 'FAIL'} [${check.area}] ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }
  return `${lines.join('\n')}\n`
}

async function main() {
  const args = parseArgs()
  await initFoundationDb()
  try {
    const syncedRoutes = args.apply ? await syncCoreRoutes() : []
    const runtimeRoutes = await readRuntimeRoutes()
    const result = {
      ...buildIntelligenceSpineGodModeDogfood({ runtimeRoutes }),
      applied: args.apply,
      syncedRoutes: syncedRoutes.map(route => ({
        routeKey: route.routeKey,
        provider: route.provider,
        model: route.model,
        priority: route.priority,
        speedMode: route.metadata?.brainFleetCapability?.speedMode || null,
        status: route.status,
        reasoningPosture: route.metadata?.brainFleetCapability?.reasoningPosture || null,
        requiredPosture: route.metadata?.intelligenceSpinePolicy?.requiredPosture || null,
      })),
    }
    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      process.stdout.write(renderText(result))
    }
    if (!result.ok) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
