#!/usr/bin/env node

import process from 'node:process'

import {
  closeFoundationDb,
  getLlmRuntimeSnapshot,
  initFoundationDb,
  upsertLlmCredential,
  upsertLlmRoute,
} from '../lib/foundation-db.js'
import {
  DEFAULT_LLM_CREDENTIALS,
  DEFAULT_LLM_ROUTES,
  LLM_AUTH_PATHS,
} from '../lib/llm-router.js'

const ACTOR = 'llm-route-control'

const CORE_INTELLIGENCE_ROUTE_KEYS = [
  'foundation-extraction-openai-api',
  'foundation-synthesis-openai-api',
  'foundation-deep-audit-openai-api',
]

const OPENCLAW_PROVIDER = 'openclaw'

const PROFILES = {
  cheap: {
    speedMode: 'cheap',
    reasoningPosture: 'standard',
    description: 'Lower-cost work. Use only on non-critical lanes unless Steve explicitly approves it.',
  },
  fast: {
    speedMode: 'fast',
    reasoningPosture: 'high',
    description: 'Fast operator-facing work where speed matters more than maximum reasoning.',
  },
  interactive: {
    speedMode: 'fast',
    reasoningPosture: 'extra_high_required',
    description: 'High-intelligence interactive work where Steve is waiting.',
  },
  quality: {
    speedMode: 'quality',
    reasoningPosture: 'extra_high_required',
    description: 'High-intelligence work where quality matters more than speed.',
  },
  overnight: {
    speedMode: 'quality',
    reasoningPosture: 'extra_high_required',
    description: 'High-intelligence overnight work. Do not pay extra for fast mode unless explicitly needed.',
  },
  max: {
    speedMode: 'max',
    reasoningPosture: 'extra_high_required',
    description: 'Highest-intelligence route posture. Use for critical synthesis, Director, scoping, and deep audit.',
  },
}

const PROVIDER_DEFAULTS = {
  openai: {
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'openai-api-default',
    policyClassification: 'api_fallback',
    riskClass: 'low',
  },
  anthropic: {
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'anthropic-api-default',
    policyClassification: 'api_fallback',
    riskClass: 'low',
  },
  gemini: {
    authPath: LLM_AUTH_PATHS.GEMINI_API_DIRECT,
    credentialKey: 'gemini-api-default',
    policyClassification: 'api_fallback',
    riskClass: 'low',
  },
  claude_code: {
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    credentialKey: 'claude-code-local-max',
    policyClassification: 'experimental',
    riskClass: 'untested',
  },
  codex: {
    authPath: LLM_AUTH_PATHS.CODEX_SUBSCRIPTION,
    credentialKey: 'codex-direct-chatgpt-local',
    policyClassification: 'experimental',
    riskClass: 'untested',
  },
  openclaw: {
    authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
    credentialKey: 'openclaw-chatgpt-pro',
    policyClassification: 'blocked',
    riskClass: 'blocked',
  },
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    apply: false,
    show: false,
    allIntelligence: false,
    allMatching: false,
    allowOpenClaw: false,
    blockOpenClaw: true,
    primary: false,
  }

  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--apply' || arg === '--apply=true') args.apply = true
    else if (arg === '--show' || arg === '--show=true') args.show = true
    else if (arg === '--all-intelligence' || arg === '--all-intelligence=true') args.allIntelligence = true
    else if (arg === '--all-matching' || arg === '--all-matching=true') args.allMatching = true
    else if (arg === '--allow-openclaw' || arg === '--allow-openclaw=true') args.allowOpenClaw = true
    else if (arg === '--no-block-openclaw') args.blockOpenClaw = false
    else if (arg === '--primary' || arg === '--primary=true') args.primary = true
    else if (arg.startsWith('--route=')) args.routeKey = arg.slice('--route='.length)
    else if (arg.startsWith('--routeKey=')) args.routeKey = arg.slice('--routeKey='.length)
    else if (arg.startsWith('--workload=')) args.workload = arg.slice('--workload='.length)
    else if (arg.startsWith('--hub=')) args.hubKey = arg.slice('--hub='.length)
    else if (arg.startsWith('--provider=')) args.provider = arg.slice('--provider='.length)
    else if (arg.startsWith('--model=')) args.model = arg.slice('--model='.length)
    else if (arg.startsWith('--profile=')) args.profile = arg.slice('--profile='.length)
    else if (arg.startsWith('--speed=')) args.speedMode = arg.slice('--speed='.length)
    else if (arg.startsWith('--effort=')) args.speedMode = arg.slice('--effort='.length)
    else if (arg.startsWith('--reasoning=')) args.reasoningPosture = arg.slice('--reasoning='.length)
    else if (arg.startsWith('--status=')) args.status = arg.slice('--status='.length)
    else if (arg.startsWith('--policy=')) args.policyClassification = arg.slice('--policy='.length)
    else if (arg.startsWith('--risk=')) args.riskClass = arg.slice('--risk='.length)
    else if (arg.startsWith('--priority=')) args.priority = Number(arg.slice('--priority='.length))
    else if (arg.startsWith('--fallback=')) args.fallbackRouteKey = arg.slice('--fallback='.length)
    else if (arg.startsWith('--cost-cap=')) args.costCapUsd = Number(arg.slice('--cost-cap='.length))
  }

  if (args.routeKey === 'all-intelligence') {
    args.allIntelligence = true
    delete args.routeKey
  }

  return args
}

function normalizeText(value) {
  return String(value || '').trim()
}

function uniqueByRouteKey(routes = []) {
  const byKey = new Map()
  for (const route of routes) {
    if (route?.routeKey && !byKey.has(route.routeKey)) byKey.set(route.routeKey, route)
  }
  return [...byKey.values()]
}

function getProfile(name) {
  const key = normalizeText(name || '').toLowerCase()
  if (!key) return null
  const profile = PROFILES[key]
  if (!profile) throw new Error(`Unknown profile "${name}". Use one of: ${Object.keys(PROFILES).join(', ')}.`)
  return { key, ...profile }
}

function compactPosturePart(value) {
  return normalizeText(value)
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

function routeSummary(route) {
  return {
    routeKey: route.routeKey,
    workload: route.workload,
    hubKey: route.hubKey,
    priority: route.priority,
    provider: route.provider,
    model: route.model,
    status: route.status,
    policyClassification: route.policyClassification,
    riskClass: route.riskClass,
    speedMode: route.metadata?.brainFleetCapability?.speedMode || null,
    reasoningPosture: route.metadata?.brainFleetCapability?.reasoningPosture || null,
    requiredPosture: route.metadata?.intelligenceSpinePolicy?.requiredPosture || null,
    credentialKey: route.credentialKey || null,
  }
}

function resolveTargets({ args, snapshotRoutes }) {
  const routes = uniqueByRouteKey([...snapshotRoutes, ...DEFAULT_LLM_ROUTES])
  if (args.allIntelligence || (!args.routeKey && !args.workload && ['overnight', 'interactive', 'quality', 'max'].includes(normalizeText(args.profile).toLowerCase()))) {
    const targets = CORE_INTELLIGENCE_ROUTE_KEYS.map(routeKey => routes.find(route => route.routeKey === routeKey)).filter(Boolean)
    if (targets.length !== CORE_INTELLIGENCE_ROUTE_KEYS.length) {
      throw new Error(`Missing core intelligence route(s): ${CORE_INTELLIGENCE_ROUTE_KEYS.filter(routeKey => !targets.find(route => route.routeKey === routeKey)).join(', ')}`)
    }
    return targets
  }

  if (args.routeKey) {
    const target = routes.find(route => route.routeKey === args.routeKey)
    if (!target) throw new Error(`Route not found: ${args.routeKey}`)
    return [target]
  }

  if (args.workload) {
    const hubKey = normalizeText(args.hubKey || 'foundation')
    const matches = routes
      .filter(route => route.workload === args.workload)
      .filter(route => route.hubKey === hubKey || route.hubKey === 'foundation')
      .filter(route => !args.provider || route.provider === args.provider)
      .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999))

    if (!matches.length) throw new Error(`No routes found for workload=${args.workload}${args.provider ? ` provider=${args.provider}` : ''}.`)
    if (args.allMatching) return matches
    if (args.provider) return [matches[0]]
    throw new Error(`Workload ${args.workload} has ${matches.length} routes. Add --provider=<provider>, --route=<routeKey>, or --all-matching.`)
  }

  return []
}

function buildUpdatedRoute({ route, args, profile }) {
  const provider = normalizeText(args.provider || route.provider)
  const providerDefaults = PROVIDER_DEFAULTS[provider] || {}
  const model = normalizeText(args.model || route.model)
  const speedMode = normalizeText(args.speedMode || profile?.speedMode || route.metadata?.brainFleetCapability?.speedMode || 'standard')
  const reasoningPosture = normalizeText(args.reasoningPosture || profile?.reasoningPosture || route.metadata?.brainFleetCapability?.reasoningPosture || 'standard')

  if (provider === OPENCLAW_PROVIDER && !args.allowOpenClaw) {
    throw new Error('OpenClaw is blocked for system routes. Refusing to promote it without --allow-openclaw and explicit future approval.')
  }

  const routeChangedProvider = provider !== route.provider
  const existingBrain = route.metadata?.brainFleetCapability || {}
  const existingPolicy = route.metadata?.intelligenceSpinePolicy || {}
  const isCoreIntelligence = CORE_INTELLIGENCE_ROUTE_KEYS.includes(route.routeKey)
  const requiredPosture = buildRequiredPosture({ model, reasoningPosture, speedMode })

  return {
    ...route,
    provider,
    model,
    authPath: normalizeText(args.authPath || (routeChangedProvider ? providerDefaults.authPath : route.authPath) || providerDefaults.authPath),
    credentialKey: normalizeText(args.credentialKey || (routeChangedProvider ? providerDefaults.credentialKey : route.credentialKey) || providerDefaults.credentialKey),
    priority: Number.isFinite(args.priority) ? args.priority : (args.primary ? 5 : Number(route.priority || 50)),
    status: normalizeText(args.status || route.status || 'probe_required'),
    policyClassification: normalizeText(args.policyClassification || (routeChangedProvider ? providerDefaults.policyClassification : route.policyClassification) || providerDefaults.policyClassification || 'untested'),
    riskClass: normalizeText(args.riskClass || (routeChangedProvider ? providerDefaults.riskClass : route.riskClass) || providerDefaults.riskClass || 'untested'),
    fallbackRouteKey: args.fallbackRouteKey === '' ? null : (args.fallbackRouteKey || route.fallbackRouteKey || null),
    costCapUsd: Number.isFinite(args.costCapUsd) ? args.costCapUsd : route.costCapUsd,
    metadata: {
      ...(route.metadata || {}),
      brainFleetCapability: {
        ...existingBrain,
        speedMode,
        reasoningPosture,
      },
      intelligenceSpinePolicy: isCoreIntelligence ? {
        ...existingPolicy,
        lane: existingPolicy.lane || 'core_intelligence',
        requiredPosture,
        openClawPrimaryAllowed: false,
        operatorConfigured: true,
      } : existingPolicy,
      modelRouteControl: {
        operatorConfigured: true,
        profile: profile?.key || null,
        speedMode,
        reasoningPosture,
        updatedAt: new Date().toISOString(),
        command: 'npm run llm:route',
      },
    },
    notes: route.notes || `Controlled by ${ACTOR}.`,
  }
}

function buildOpenClawBlockedRoute(route) {
  return {
    ...route,
    priority: Math.max(Number(route.priority || 95), 95),
    status: 'blocked',
    policyClassification: 'blocked',
    riskClass: 'blocked',
    metadata: {
      ...(route.metadata || {}),
      modelRouteControl: {
        operatorConfigured: true,
        blockedBy: ACTOR,
        updatedAt: new Date().toISOString(),
      },
    },
    notes: route.notes || 'OpenClaw blocked as a system route.',
  }
}

function buildOpenClawBlockedCredential(credential) {
  return {
    ...credential,
    status: 'blocked',
    policyClassification: 'blocked',
    allowedWorkloads: [],
    metadata: {
      ...(credential.metadata || {}),
      modelRouteControl: {
        operatorConfigured: true,
        blockedBy: ACTOR,
        updatedAt: new Date().toISOString(),
      },
    },
  }
}

function evaluateSnapshot({ routes, credentials }) {
  const openClawRoutes = routes.filter(route => route.provider === OPENCLAW_PROVIDER)
  const runnableOpenClaw = openClawRoutes.filter(route => route.status !== 'blocked' || route.policyClassification !== 'blocked' || route.riskClass !== 'blocked')
  const openClawCredential = credentials.find(credential => credential.credentialKey === 'openclaw-chatgpt-pro')
  const configuredPlaceholders = routes.filter(route => /configured-|default-.*model/i.test(route.model || '') && route.status === 'available')
  return {
    ok: runnableOpenClaw.length === 0,
    runnableOpenClaw: runnableOpenClaw.map(routeSummary),
    configuredPlaceholders: configuredPlaceholders.map(routeSummary),
    openClawCredential: openClawCredential ? {
      credentialKey: openClawCredential.credentialKey,
      status: openClawCredential.status,
      policyClassification: openClawCredential.policyClassification,
      allowedWorkloads: openClawCredential.allowedWorkloads || [],
    } : null,
  }
}

function renderText(result) {
  const lines = []
  lines.push(`LLM route control: ${result.ok ? 'PASS' : 'CHECK'}`)
  lines.push(`Profile: ${result.profile?.key || 'none'}${result.profile?.description ? ` - ${result.profile.description}` : ''}`)
  lines.push(`Applied: ${result.applied ? 'yes' : 'no'}`)
  lines.push('')

  if (result.targets.length) {
    lines.push('Target routes:')
    for (const route of result.targets) {
      lines.push(`- ${route.routeKey}: ${route.provider} ${route.model} · ${route.speedMode || 'standard'} · ${route.reasoningPosture || 'standard'} · ${route.status}`)
    }
    lines.push('')
  }

  lines.push('Current routes:')
  for (const route of result.routes) {
    lines.push(`- ${route.routeKey}: ${route.workload} · ${route.provider} ${route.model} · ${route.status} · ${route.policyClassification} · priority ${route.priority}`)
  }

  if (result.evaluation.runnableOpenClaw.length) {
    lines.push('')
    lines.push('Blocked: OpenClaw route is runnable. Run with --block-openclaw --apply.')
  }
  if (result.evaluation.configuredPlaceholders.length) {
    lines.push('')
    lines.push('Warning: available routes still use configured/default placeholder model names.')
  }
  return `${lines.join('\n')}\n`
}

async function main() {
  const args = parseArgs()
  const profile = getProfile(args.profile)

  await initFoundationDb()
  try {
    const before = await getLlmRuntimeSnapshot({ limit: 200 })
    const targets = resolveTargets({ args, snapshotRoutes: before.routes })
    const updatedTargets = targets.map(route => buildUpdatedRoute({ route, args, profile }))
    const appliedRoutes = []
    const appliedCredentials = []

    if (args.apply) {
      for (const route of updatedTargets) {
        appliedRoutes.push(await upsertLlmRoute(route, ACTOR))
      }

      if (args.primary) {
        const refreshed = await getLlmRuntimeSnapshot({ limit: 200 })
        for (const target of updatedTargets) {
          const siblings = refreshed.routes
            .filter(route => route.routeKey !== target.routeKey)
            .filter(route => route.workload === target.workload)
            .filter(route => route.hubKey === target.hubKey || route.hubKey === 'foundation')
            .filter(route => route.status === 'available')
            .filter(route => route.provider !== OPENCLAW_PROVIDER)
          for (const sibling of siblings) {
            appliedRoutes.push(await upsertLlmRoute({
              ...sibling,
              priority: Math.max(Number(sibling.priority || 50), 50),
              metadata: {
                ...(sibling.metadata || {}),
                modelRouteControl: {
                  ...(sibling.metadata?.modelRouteControl || {}),
                  demotedByPrimaryRoute: target.routeKey,
                  updatedAt: new Date().toISOString(),
                },
              },
            }, ACTOR))
          }
        }
      }

      if (args.blockOpenClaw) {
        const refreshed = await getLlmRuntimeSnapshot({ limit: 200 })
        const openClawRoutes = uniqueByRouteKey([
          ...refreshed.routes.filter(route => route.provider === OPENCLAW_PROVIDER),
          ...DEFAULT_LLM_ROUTES.filter(route => route.provider === OPENCLAW_PROVIDER),
        ])
        for (const route of openClawRoutes) {
          appliedRoutes.push(await upsertLlmRoute(buildOpenClawBlockedRoute(route), ACTOR))
        }
        const openClawCredential = refreshed.credentials.find(credential => credential.credentialKey === 'openclaw-chatgpt-pro') ||
          DEFAULT_LLM_CREDENTIALS.find(credential => credential.credentialKey === 'openclaw-chatgpt-pro')
        if (openClawCredential) {
          appliedCredentials.push(await upsertLlmCredential(buildOpenClawBlockedCredential(openClawCredential), ACTOR))
        }
      }
    }

    const after = await getLlmRuntimeSnapshot({ limit: 200 })
    const interestingRoutes = after.routes
      .filter(route => targets.length ? targets.some(target => target.routeKey === route.routeKey) || route.provider === OPENCLAW_PROVIDER : true)
      .sort((a, b) => String(a.workload).localeCompare(String(b.workload)) || Number(a.priority || 999) - Number(b.priority || 999))
      .map(routeSummary)
    const evaluation = evaluateSnapshot(after)
    const result = {
      ok: evaluation.ok,
      applied: args.apply,
      profile: profile ? {
        key: profile.key,
        speedMode: profile.speedMode,
        reasoningPosture: profile.reasoningPosture,
        description: profile.description,
      } : null,
      targets: (args.apply ? appliedRoutes.filter(route => targets.some(target => target.routeKey === route.routeKey)) : updatedTargets).map(routeSummary),
      appliedRoutes: appliedRoutes.map(routeSummary),
      appliedCredentials: appliedCredentials.map(credential => ({
        credentialKey: credential.credentialKey,
        provider: credential.provider,
        status: credential.status,
        policyClassification: credential.policyClassification,
      })),
      routes: interestingRoutes,
      evaluation,
      examples: [
        'npm run llm:route -- --show',
        'npm run llm:route -- --profile=overnight --apply',
        'npm run llm:route -- --route=foundation-video-gemini-api --model=gemini-3.5-flash --effort=quality --apply',
        'npm run llm:route -- --workload=extraction --provider=openai --model=<cheap-model> --profile=cheap --apply',
        'npm run llm:route -- --route=foundation-synthesis-claude-code --model=opus-4.7 --effort=max --status=probe_required --apply',
      ],
    }

    if (args.json) console.log(JSON.stringify(result, null, 2))
    else process.stdout.write(renderText(result))
    if (!result.ok) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
