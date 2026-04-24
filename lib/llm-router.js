import {
  createLlmCall,
  getLlmRuntimeSnapshot,
  upsertLlmCredential,
  upsertLlmRoute,
} from './foundation-db.js'

export const LLM_AUTH_PATHS = {
  API_DIRECT: 'api_direct',
  CLAUDE_CODE_SUBSCRIPTION: 'claude_code_subscription',
  CLAUDE_CODE_OAUTH_TOKEN: 'claude_code_oauth_token',
  CLAUDE_AGENT_SDK: 'claude_agent_sdk',
  CHATGPT_SUBSCRIPTION_GATEWAY: 'chatgpt_subscription_gateway',
  CODEX_SUBSCRIPTION: 'codex_subscription',
  GEMINI_API_DIRECT: 'gemini_api_direct',
  MANUAL_INTERACTIVE: 'manual_interactive',
}

export const DEFAULT_LLM_CREDENTIALS = [
  {
    credentialKey: 'claude-code-local-max',
    provider: 'claude_code',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    displayName: 'Local Claude Code Max Login',
    accountLabel: 'local claude login',
    hubKey: 'foundation',
    workloadLane: 'synthesis',
    secretRef: 'local_claude_code_auth',
    status: 'unknown',
    policyClassification: 'experimental',
    allowedWorkloads: ['manual_interactive', 'synthesis_probe', 'agent_probe'],
    notes: 'Native Claude Code subscription auth. Probe before scheduled automation; do not route through OpenClaw.',
  },
  {
    credentialKey: 'claude-code-oauth-token',
    provider: 'claude_code',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_OAUTH_TOKEN,
    displayName: 'Claude Code OAuth Token',
    accountLabel: 'setup-token route',
    hubKey: 'foundation',
    workloadLane: 'synthesis',
    secretRef: 'CLAUDE_CODE_OAUTH_TOKEN',
    status: 'unknown',
    policyClassification: 'experimental',
    allowedWorkloads: ['synthesis_probe', 'agent_probe'],
    notes: 'Setup-token/OAuth route. Requires explicit policy classification before scheduled jobs use it.',
  },
  {
    credentialKey: 'openclaw-chatgpt-pro',
    provider: 'openclaw',
    authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
    displayName: 'OpenClaw ChatGPT Pro Gateway',
    accountLabel: 'local OpenClaw gateway',
    hubKey: 'foundation',
    workloadLane: 'extraction',
    secretRef: 'OPENCLAW_GATEWAY_URL',
    status: 'unknown',
    policyClassification: 'experimental',
    allowedWorkloads: ['extraction_probe', 'classification_probe'],
    notes: 'Gateway/subscription route. Treat as experimental until capability and policy probes pass.',
  },
  {
    credentialKey: 'openai-api-default',
    provider: 'openai',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    displayName: 'OpenAI API Default',
    accountLabel: 'OPENAI_API_KEY',
    hubKey: 'foundation',
    workloadLane: 'extraction',
    secretRef: 'OPENAI_API_KEY',
    status: 'unknown',
    policyClassification: 'api_fallback',
    allowedWorkloads: ['extraction', 'synthesis', 'embedding', 'transcription', 'image_generation'],
    notes: 'Official API fallback. Current extraction/synthesis scripts use this path until router migration.',
  },
  {
    credentialKey: 'anthropic-api-default',
    provider: 'anthropic',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    displayName: 'Anthropic API Default',
    accountLabel: 'ANTHROPIC_API_KEY',
    hubKey: 'foundation',
    workloadLane: 'synthesis',
    secretRef: 'ANTHROPIC_API_KEY',
    status: 'unknown',
    policyClassification: 'api_fallback',
    allowedWorkloads: ['synthesis', 'agent', 'vision'],
    notes: 'Official production-safe Claude API fallback.',
  },
  {
    credentialKey: 'gemini-api-default',
    provider: 'gemini',
    authPath: LLM_AUTH_PATHS.GEMINI_API_DIRECT,
    displayName: 'Gemini API Default',
    accountLabel: 'GEMINI_API_KEY or GOOGLE_API_KEY',
    hubKey: 'foundation',
    workloadLane: 'vision',
    secretRef: 'GEMINI_API_KEY',
    status: 'unknown',
    policyClassification: 'api_fallback',
    allowedWorkloads: ['video_vision', 'long_context_probe'],
    notes: 'Direct Gemini API route for video/vision workloads where no subscription route exists.',
  },
  {
    credentialKey: 'manual-interactive-builder',
    provider: 'manual',
    authPath: LLM_AUTH_PATHS.MANUAL_INTERACTIVE,
    displayName: 'Manual Interactive Builder Session',
    accountLabel: 'builder-driven',
    hubKey: 'foundation',
    workloadLane: 'manual',
    secretRef: null,
    status: 'available',
    policyClassification: 'manual_only',
    allowedWorkloads: ['coding_review', 'manual_strategy_review'],
    notes: 'Human-driven Codex/Claude/ChatGPT work. Not a backend automation route.',
  },
]

export const DEFAULT_LLM_ROUTES = [
  {
    routeKey: 'foundation-extraction-openai-api',
    workload: 'extraction',
    hubKey: 'foundation',
    priority: 10,
    provider: 'openai',
    model: process.env.LLM_EXTRACTION_MODEL || 'configured-cheap-extraction-model',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'openai-api-default',
    fallbackRouteKey: null,
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    notes: 'Production-safe default for current extraction until subscription routes prove safe.',
  },
  {
    routeKey: 'foundation-extraction-openclaw-chatgpt',
    workload: 'extraction',
    hubKey: 'foundation',
    priority: 20,
    provider: 'openclaw',
    model: process.env.LLM_OPENCLAW_EXTRACTION_MODEL || 'configured-chatgpt-subscription-model',
    authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
    credentialKey: 'openclaw-chatgpt-pro',
    fallbackRouteKey: 'foundation-extraction-openai-api',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    notes: 'Candidate subscription route for high-volume extraction. Do not schedule until probes classify it.',
  },
  {
    routeKey: 'foundation-synthesis-openai-api',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 10,
    provider: 'openai',
    model: process.env.LLM_SYNTHESIS_MODEL || 'configured-high-intelligence-model',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'openai-api-default',
    fallbackRouteKey: null,
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    notes: 'Production-safe synthesis fallback until high-intelligence subscription/API route is selected.',
  },
  {
    routeKey: 'foundation-synthesis-claude-code',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 20,
    provider: 'claude_code',
    model: process.env.LLM_CLAUDE_SYNTHESIS_MODEL || 'configured-claude-code-model',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    credentialKey: 'claude-code-local-max',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    notes: 'Internal subscription-auth synthesis route. Requires workload-level policy classification before scheduling.',
  },
  {
    routeKey: 'foundation-synthesis-claude-oauth',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 25,
    provider: 'claude_code',
    model: process.env.LLM_CLAUDE_SYNTHESIS_MODEL || 'configured-claude-code-model',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_OAUTH_TOKEN,
    credentialKey: 'claude-code-oauth-token',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    notes: 'Setup-token/OAuth candidate route for internal scripts. Requires token and policy classification before scheduling.',
  },
  {
    routeKey: 'foundation-synthesis-anthropic-api',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 30,
    provider: 'anthropic',
    model: process.env.LLM_ANTHROPIC_SYNTHESIS_MODEL || 'configured-anthropic-synthesis-model',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'anthropic-api-default',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    notes: 'Official Anthropic API route. Safe production fallback once ANTHROPIC_API_KEY is configured.',
  },
  {
    routeKey: 'foundation-embedding-openai-api',
    workload: 'embedding',
    hubKey: 'foundation',
    priority: 10,
    provider: 'openai',
    model: process.env.LLM_EMBEDDING_MODEL || 'text-embedding-3-large',
    authPath: LLM_AUTH_PATHS.API_DIRECT,
    credentialKey: 'openai-api-default',
    fallbackRouteKey: null,
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    notes: 'Embeddings stay API-direct; consumer subscriptions do not replace embedding APIs.',
  },
  {
    routeKey: 'foundation-video-gemini-api',
    workload: 'video_vision',
    hubKey: 'foundation',
    priority: 10,
    provider: 'gemini',
    model: process.env.LLM_GEMINI_VIDEO_MODEL || 'configured-gemini-video-model',
    authPath: LLM_AUTH_PATHS.GEMINI_API_DIRECT,
    credentialKey: 'gemini-api-default',
    fallbackRouteKey: null,
    status: 'probe_required',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    notes: 'Default route for public-video and vision understanding.',
  },
  {
    routeKey: 'foundation-agent-claude-code',
    workload: 'agent',
    hubKey: 'foundation',
    priority: 10,
    provider: 'claude_code',
    model: process.env.LLM_AGENT_MODEL || 'configured-claude-agent-model',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    credentialKey: 'claude-code-local-max',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    notes: 'Future Harlan/Crewbert route. Probe and classify before any agent uses it.',
  },
]

export async function seedDefaultLlmRouterConfig(actor = 'system') {
  const credentials = []
  for (const credential of DEFAULT_LLM_CREDENTIALS) {
    credentials.push(await upsertLlmCredential(credential, actor))
  }

  const routes = []
  for (const route of DEFAULT_LLM_ROUTES) {
    routes.push(await upsertLlmRoute(route, actor))
  }

  return { credentials, routes }
}

export function estimateTokenCount(text) {
  const normalized = String(text || '').trim()
  if (!normalized) return 0
  return Math.ceil(normalized.length / 4)
}

export async function planLlmRoute({ workload, hubKey = 'foundation', provider, model, authPath } = {}) {
  const normalizedWorkload = String(workload || '').trim()
  if (!normalizedWorkload) throw new Error('workload is required for LLM route planning.')

  const snapshot = await getLlmRuntimeSnapshot({ limit: 10 })
  const routes = snapshot.routes
    .filter(route => route.workload === normalizedWorkload)
    .filter(route => route.hubKey === hubKey || route.hubKey === 'foundation')
    .filter(route => !provider || route.provider === provider)
    .filter(route => !authPath || route.authPath === authPath)
    .filter(route => !model || route.model === model)
    .sort((a, b) => a.priority - b.priority)

  if (!routes.length) {
    throw new Error(`No LLM route registered for workload=${normalizedWorkload} hub=${hubKey}.`)
  }

  const credentialsByKey = new Map(snapshot.credentials.map(item => [item.credentialKey, item]))
  const runnable = routes.find(route => {
    const credential = route.credentialKey ? credentialsByKey.get(route.credentialKey) : null
    return route.status === 'available' && (!credential || credential.status === 'available')
  })
  const selected = runnable || routes[0]

  return {
    selectedRoute: selected,
    selectedCredential: selected.credentialKey ? credentialsByKey.get(selected.credentialKey) || null : null,
    fallbackRoute: selected.fallbackRouteKey ? routes.find(route => route.routeKey === selected.fallbackRouteKey) || null : null,
    routeCount: routes.length,
    runnable: Boolean(runnable),
  }
}

export async function callLlm({ workload, hubKey = 'foundation', inputText = '', messages = [], dryRun = true, metadata = {} } = {}) {
  const plan = await planLlmRoute({ workload, hubKey })
  const promptText = inputText || JSON.stringify(messages || [])
  const call = await createLlmCall({
    workload,
    hubKey,
    provider: plan.selectedRoute.provider,
    model: plan.selectedRoute.model,
    authPath: plan.selectedRoute.authPath,
    credentialKey: plan.selectedRoute.credentialKey,
    routeKey: plan.selectedRoute.routeKey,
    status: dryRun ? 'skipped' : 'planned',
    estimatedInputTokens: estimateTokenCount(promptText),
    metadata: {
      ...metadata,
      dryRun,
      reason: dryRun
        ? 'Router MVP records route selection only; no provider call made.'
        : 'Provider adapters are intentionally disabled until auth probes are classified.',
    },
  }, 'llm-router')

  if (!dryRun) {
    throw new Error('LLM provider adapters are not enabled yet. Run probes and migrate one script at a time.')
  }

  return { plan, call }
}
