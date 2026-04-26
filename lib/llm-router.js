import { spawn } from 'node:child_process'
import {
  createLlmCall,
  finishLlmCall,
  getLlmRuntimeSnapshot,
  upsertLlmCredential,
  upsertLlmRoute,
} from './foundation-db.js'
import { assertDirectOpenAiResponsesAllowed } from './llm-spend-policy.js'

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

const DEFAULT_OPENCLAW_MODEL = process.env.LLM_OPENCLAW_MODEL || 'openai-codex/gpt-5.4'
const OPENCLAW_EXTRACTION_ALLOWED = process.env.LLM_OPENCLAW_ALLOW_EXTRACTION === 'true'

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
    policyClassification: OPENCLAW_EXTRACTION_ALLOWED ? 'allowed' : 'experimental',
    allowedWorkloads: OPENCLAW_EXTRACTION_ALLOWED
      ? ['extraction', 'extraction_probe', 'classification_probe', 'synthesis_probe']
      : ['extraction_probe', 'classification_probe', 'synthesis_probe'],
    notes: OPENCLAW_EXTRACTION_ALLOWED
      ? 'Gateway/subscription route allowed for bounded extraction after local operator opt-in and model probe.'
      : 'Gateway/subscription route. Treat as experimental until capability and policy probes pass.',
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
    priority: 90,
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
    priority: 10,
    provider: 'openclaw',
    model: process.env.LLM_OPENCLAW_EXTRACTION_MODEL || DEFAULT_OPENCLAW_MODEL,
    authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
    credentialKey: 'openclaw-chatgpt-pro',
    fallbackRouteKey: 'foundation-extraction-openai-api',
    status: 'probe_required',
    policyClassification: OPENCLAW_EXTRACTION_ALLOWED ? 'allowed' : 'experimental',
    riskClass: OPENCLAW_EXTRACTION_ALLOWED ? 'low' : 'untested',
    notes: OPENCLAW_EXTRACTION_ALLOWED
      ? 'Subscription route for bounded extraction after local operator opt-in and model probe.'
      : 'Candidate subscription route for high-volume extraction. Do not schedule until probes classify it.',
  },
  {
    routeKey: 'foundation-synthesis-openai-api',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 90,
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
    routeKey: 'foundation-synthesis-openclaw-chatgpt',
    workload: 'synthesis',
    hubKey: 'foundation',
    priority: 10,
    provider: 'openclaw',
    model: process.env.LLM_OPENCLAW_SYNTHESIS_MODEL || DEFAULT_OPENCLAW_MODEL,
    authPath: LLM_AUTH_PATHS.CHATGPT_SUBSCRIPTION_GATEWAY,
    credentialKey: 'openclaw-chatgpt-pro',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    status: 'probe_required',
    policyClassification: 'experimental',
    riskClass: 'untested',
    notes: 'Candidate subscription route for shared-comms synthesis. Requires an actual workload probe before scheduling.',
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

function renderMessageContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part
        if (part?.text) return part.text
        return JSON.stringify(part)
      })
      .join('\n')
  }
  return JSON.stringify(content || '')
}

function renderPrompt({ messages = [], inputText = '', responseFormat = null } = {}) {
  const lines = []
  if (inputText) lines.push(String(inputText))

  for (const message of messages || []) {
    lines.push(`\n[${String(message.role || 'user').toUpperCase()}]`)
    lines.push(renderMessageContent(message.content))
  }

  if (responseFormat?.schema) {
    lines.push('\n[OUTPUT CONTRACT]')
    lines.push('Return exactly one valid JSON object. Do not wrap it in markdown. Do not include commentary.')
    lines.push(`Schema name: ${responseFormat.name || 'response'}`)
    lines.push(JSON.stringify(responseFormat.schema))
  }

  return lines.join('\n').trim()
}

function getOpenAiResponsesOutputText(responseJson) {
  return responseJson.output
    ?.flatMap(item => item.content || [])
    ?.find(item => item.type === 'output_text')
    ?.text || ''
}

function killProcessGroup(child, signal) {
  if (!child?.pid) return
  try {
    process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // The process may have already exited between timeout and cleanup.
    }
  }
}

async function callOpenClawModelRun({ model, prompt, timeoutMs = 120000 } = {}) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      'openclaw',
      ['infer', 'model', 'run', '--local', '--model', model, '--prompt', prompt, '--json'],
      {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      },
    )
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    let killEscalation = null
    const maxBuffer = 16 * 1024 * 1024
    const timeout = setTimeout(() => {
      timedOut = true
      killProcessGroup(child, 'SIGTERM')
      killEscalation = setTimeout(() => {
        killProcessGroup(child, 'SIGKILL')
      }, 5000)
    }, timeoutMs)

    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
      if (stdout.length > maxBuffer) {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (killEscalation) clearTimeout(killEscalation)
        reject(new Error('OpenClaw model run exceeded stdout buffer.'))
        killProcessGroup(child, 'SIGKILL')
      }
    })
    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
      if (stderr.length > maxBuffer) {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (killEscalation) clearTimeout(killEscalation)
        reject(new Error('OpenClaw model run exceeded stderr buffer.'))
        killProcessGroup(child, 'SIGKILL')
      }
    })
    child.on('error', error => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (killEscalation) clearTimeout(killEscalation)
      reject(error)
    })
    child.on('close', (exitCode, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (killEscalation) clearTimeout(killEscalation)
      if (timedOut) {
        reject(new Error(`OpenClaw model run timed out after ${timeoutMs}ms.`))
        return
      }
      if (exitCode !== 0) {
        reject(new Error(`OpenClaw model run failed with ${signal || `exit ${exitCode}`}: ${String(stderr || stdout).slice(0, 500)}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })

  const parsed = JSON.parse(result.stdout)
  const outputText = parsed.outputs?.map(item => item.text || '').join('\n').trim()
  if (!parsed.ok || !outputText) {
    throw new Error(`OpenClaw model run failed or returned no text: ${String(result.stdout || result.stderr).slice(0, 500)}`)
  }
  return { outputText, raw: parsed }
}

async function callOpenAiResponsesApi({ model, messages, inputText, responseFormat, maxOutputTokens = 3000, timeoutMs = 120000 } = {}) {
  assertDirectOpenAiResponsesAllowed({ workload: 'router OpenAI API fallback' })
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for router OpenAI API fallback.')
  }

  const cappedMaxOutputTokens = Math.min(
    Math.max(1, Number(maxOutputTokens) || 3000),
    Math.max(1, Number(process.env.LLM_ROUTER_MAX_OUTPUT_TOKENS) || 6000)
  )
  const input = messages?.length
    ? messages
    : [{ role: 'user', content: inputText || '' }]
  const body = {
    model,
    store: false,
    input,
    max_output_tokens: cappedMaxOutputTokens,
  }
  if (responseFormat) {
    body.text = { format: responseFormat }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 120000))
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI router fallback failed (${response.status}): ${errorText.slice(0, 500)}`)
  }

  const responseJson = await response.json()
  const outputText = getOpenAiResponsesOutputText(responseJson)
  if (!outputText) throw new Error('OpenAI router fallback returned no output text.')
  return { outputText, raw: responseJson }
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
  function getRouteBlockReason(route) {
    const credential = route.credentialKey ? credentialsByKey.get(route.credentialKey) : null
    if (route.status !== 'available') return `route status is ${route.status}`
    if (route.riskClass === 'blocked' || route.riskClass === 'untested') return `route risk class is ${route.riskClass}`
    if (!['allowed', 'api_fallback'].includes(route.policyClassification)) {
      return `route policy is ${route.policyClassification}`
    }
    if (!credential) return null
    if (credential.status !== 'available') return `credential status is ${credential.status}`
    if (!['allowed', 'api_fallback'].includes(credential.policyClassification)) {
      return `credential policy is ${credential.policyClassification}`
    }
    if (Array.isArray(credential.allowedWorkloads) && credential.allowedWorkloads.length && !credential.allowedWorkloads.includes(normalizedWorkload)) {
      return `credential does not allow workload ${normalizedWorkload}`
    }
    return null
  }

  const routeReadiness = routes.map(route => {
    const credential = route.credentialKey ? credentialsByKey.get(route.credentialKey) || null : null
    const blockReason = getRouteBlockReason(route)
    return {
      routeKey: route.routeKey,
      credentialKey: route.credentialKey || null,
      credentialStatus: credential?.status || null,
      credentialPolicyClassification: credential?.policyClassification || null,
      runnable: !blockReason,
      blockReason,
    }
  })
  const runnable = routes.find(route => !getRouteBlockReason(route))
  const selected = runnable || routes[0]
  const selectedReadiness = routeReadiness.find(item => item.routeKey === selected.routeKey) || null

  return {
    selectedRoute: selected,
    selectedCredential: selected.credentialKey ? credentialsByKey.get(selected.credentialKey) || null : null,
    fallbackRoute: selected.fallbackRouteKey ? routes.find(route => route.routeKey === selected.fallbackRouteKey) || null : null,
    fallbackMode: selected.fallbackRouteKey ? 'manual_explicit' : 'none',
    routeCount: routes.length,
    runnable: Boolean(runnable),
    blockReason: selectedReadiness?.blockReason || null,
    routeReadiness,
  }
}

export async function callLlm({
  workload,
  hubKey = 'foundation',
  inputText = '',
  messages = [],
  responseFormat = null,
  maxOutputTokens = 3000,
  dryRun = true,
  metadata = {},
} = {}) {
  const plan = await planLlmRoute({ workload, hubKey })
  const promptText = renderPrompt({ inputText, messages, responseFormat })
  const blockedReason = !dryRun && !plan.runnable
    ? `No runnable LLM route available. LLM route ${plan.selectedRoute.routeKey} is not runnable: ${plan.blockReason || 'no available route passed policy checks'}.`
    : ''
  const call = await createLlmCall({
    workload,
    hubKey,
    provider: plan.selectedRoute.provider,
    model: plan.selectedRoute.model,
    authPath: plan.selectedRoute.authPath,
    credentialKey: plan.selectedRoute.credentialKey,
    routeKey: plan.selectedRoute.routeKey,
    status: dryRun || blockedReason ? 'skipped' : 'planned',
    estimatedInputTokens: estimateTokenCount(promptText),
    errorMessage: blockedReason || null,
    finishedAt: dryRun || blockedReason ? new Date().toISOString() : null,
    metadata: {
      ...metadata,
      dryRun,
      reason: dryRun
        ? 'Router MVP records route selection only; no provider call made.'
        : blockedReason || 'Router provider adapter selected by policy-aware route.',
      fallbackMode: plan.fallbackMode,
      fallbackRouteKey: plan.fallbackRoute?.routeKey || null,
      routeRunnable: plan.runnable,
      routeReadiness: plan.routeReadiness,
    },
  }, 'llm-router')

  if (blockedReason) {
    const error = new Error(blockedReason)
    error.llmProvenance = {
      requestedModel: plan.selectedRoute.model,
      model: plan.selectedRoute.model,
      provider: plan.selectedRoute.provider,
      authPath: plan.selectedRoute.authPath,
      routeKey: plan.selectedRoute.routeKey,
      credentialKey: plan.selectedRoute.credentialKey,
      callId: call.callId,
      blockedReason,
    }
    throw error
  }

  if (dryRun) {
    return {
      plan,
      call,
      outputText: '',
      provider: plan.selectedRoute.provider,
      authPath: plan.selectedRoute.authPath,
      routeKey: plan.selectedRoute.routeKey,
      credentialKey: plan.selectedRoute.credentialKey,
      model: plan.selectedRoute.model,
    }
  }

  try {
    const model = plan.selectedRoute.model
    let result
    if (plan.selectedRoute.provider === 'openclaw') {
      result = await callOpenClawModelRun({
        model,
        prompt: promptText,
        timeoutMs: Number(metadata.timeoutMs || 240000),
      })
    } else if (plan.selectedRoute.provider === 'openai' && plan.selectedRoute.authPath === LLM_AUTH_PATHS.API_DIRECT) {
      result = await callOpenAiResponsesApi({
        model,
        messages,
        inputText,
        responseFormat,
        maxOutputTokens,
        timeoutMs: Number(metadata.timeoutMs || 120000),
      })
    } else {
      throw new Error(`No provider adapter for ${plan.selectedRoute.provider}/${plan.selectedRoute.authPath}.`)
    }

    const finishedCall = await finishLlmCall(call.callId, {
      status: 'succeeded',
      estimatedOutputTokens: estimateTokenCount(result.outputText),
      estimatedCostUsd: plan.selectedRoute.authPath === LLM_AUTH_PATHS.API_DIRECT ? null : 0,
      metadata: {
        providerResponse: {
          transport: result.raw?.transport || null,
          provider: result.raw?.provider || plan.selectedRoute.provider,
          model: result.raw?.model || model,
        },
      },
    })

    return {
      plan,
      call: finishedCall,
      outputText: result.outputText,
      raw: result.raw,
      provider: plan.selectedRoute.provider,
      authPath: plan.selectedRoute.authPath,
      routeKey: plan.selectedRoute.routeKey,
      credentialKey: plan.selectedRoute.credentialKey,
      model,
    }
  } catch (error) {
    const finishedCall = await finishLlmCall(call.callId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    if (error && typeof error === 'object') {
      error.llmProvenance = {
        requestedModel: plan.selectedRoute.model,
        model: plan.selectedRoute.model,
        provider: plan.selectedRoute.provider,
        authPath: plan.selectedRoute.authPath,
        routeKey: plan.selectedRoute.routeKey,
        credentialKey: plan.selectedRoute.credentialKey,
        callId: finishedCall.callId,
      }
    }
    throw error
  }
}
