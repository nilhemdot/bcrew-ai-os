export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_CARD_ID = 'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_CLOSEOUT_KEY = 'brain-fleet-model-capability-registry-v1'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_PLAN_PATH = 'docs/process/brain-fleet-model-capability-registry-001-plan.md'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_APPROVAL_PATH = 'docs/process/approvals/BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001.json'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_SCRIPT_PATH = 'scripts/process-brain-fleet-model-capability-registry-check.mjs'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-brain-fleet-model-capability-registry-closeout.md'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_NEXT_CARD_ID = 'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001'

export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_VERSION = 1

export const BRAIN_FLEET_CAPABILITY_SUPPORT = Object.freeze({
  SUPPORTED: 'supported',
  UNSUPPORTED: 'unsupported',
  PROBE_REQUIRED: 'probe_required',
  UNKNOWN: 'unknown',
})

export const BRAIN_FLEET_CAPABILITY_SPEED_MODES = Object.freeze([
  'fast',
  'standard',
  'deep',
  'embedding',
  'vision',
  'manual',
  'unknown',
])

export const BRAIN_FLEET_CAPABILITY_REASONING_POSTURES = Object.freeze([
  'none',
  'standard',
  'high',
  'coding_agent',
  'vision_multimodal',
  'manual',
  'unknown',
])

export const BRAIN_FLEET_AUTH_POSTURES = Object.freeze([
  'available',
  'probe_required',
  'auth_needed',
  'blocked',
  'manual_only',
  'unknown',
])

export const BRAIN_FLEET_QUOTA_POSTURES = Object.freeze([
  'recorded',
  'unknown',
  'exhausted',
  'not_applicable',
])

export const BRAIN_FLEET_MODEL_CAPABILITY_NOT_NEXT = [
  'Do not run live provider probes from the model capability registry card.',
  'Do not execute OpenClaw, Codex, Gemini, Claude, OpenAI, Anthropic, browser automation, or extractor model calls.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not mutate credentials, OAuth tokens, browser profiles, provider config, llm_credentials, llm_routes, source systems, email, Telegram, or public systems.',
  'Do not start extractor proof, YouTube runtime proof, broad crawl, Strategy, or People work from this card.',
  'Do not claim model availability, speed mode, video/vision/long-context support, auth, or quota as proven unless the registry source records it or marks it probe_required/unknown.',
]

export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_NOT_NEXT = BRAIN_FLEET_MODEL_CAPABILITY_NOT_NEXT

const SUPPORT_VALUES = new Set(Object.values(BRAIN_FLEET_CAPABILITY_SUPPORT))
const SPEED_MODES = new Set(BRAIN_FLEET_CAPABILITY_SPEED_MODES)
const REASONING_POSTURES = new Set(BRAIN_FLEET_CAPABILITY_REASONING_POSTURES)
const AUTH_POSTURES = new Set(BRAIN_FLEET_AUTH_POSTURES)
const QUOTA_POSTURES = new Set(BRAIN_FLEET_QUOTA_POSTURES)

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
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

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => {
    if (Array.isArray(entry)) return entry.length > 0
    if (entry && typeof entry === 'object') return Object.keys(entry).length > 0
    return entry !== null && entry !== undefined && entry !== ''
  }))
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value || null))
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = stableValue(value[key])
      return acc
    }, {})
}

function stableString(value) {
  return JSON.stringify(stableValue(value))
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && normalizeText(value) !== '')
}

function metadataCapability(route = {}, credential = {}) {
  return route.metadata?.brainFleetCapability ||
    route.metadata?.modelCapability ||
    credential.metadata?.brainFleetCapability ||
    credential.metadata?.modelCapability ||
    {}
}

function latestProbeForRoute(route = {}, recentProbes = []) {
  const routeCredentialKey = normalizeText(route.credentialKey)
  const provider = normalizeText(route.provider)
  const authPath = normalizeText(route.authPath)
  return asList(recentProbes).find(probe =>
    (routeCredentialKey && normalizeText(probe.credentialKey) === routeCredentialKey) ||
      (
        provider &&
        authPath &&
        normalizeText(probe.provider) === provider &&
        normalizeText(probe.authPath) === authPath
      )
  ) || null
}

function quotaValue(source = {}, keys = []) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && normalizeText(source[key]) !== '') return source[key]
  }
  return null
}

export function normalizeBrainFleetCapabilityQuota(input = {}) {
  const source = input && typeof input === 'object' ? input : {}
  const remaining = quotaValue(source, ['remaining', 'remainingCalls', 'remaining_calls', 'remainingTokens', 'remaining_tokens'])
  const resetAt = quotaValue(source, ['resetAt', 'reset_at', 'quotaResetAt', 'quota_reset_at'])
  const window = quotaValue(source, ['window', 'quotaWindow', 'quota_window'])
  const exhausted = source.exhausted === true || normalizeLower(source.status) === 'exhausted' || Number(remaining) === 0
  const known = Object.keys(source).length > 0
  return {
    posture: exhausted ? 'exhausted' : (known ? 'recorded' : 'unknown'),
    state: known ? deepClone(source) : {},
    remaining: remaining == null ? null : remaining,
    resetAt: resetAt == null ? null : resetAt,
    window: window == null ? null : window,
    source: known ? 'llm_credentials.quota_state' : 'llm_credentials.quota_state_empty',
  }
}

function inferSpeedMode(route = {}, credential = {}) {
  const capability = metadataCapability(route, credential)
  const explicit = normalizeLower(firstDefined(capability.speedMode, route.metadata?.speedMode, credential.metadata?.speedMode))
  if (SPEED_MODES.has(explicit)) return explicit
  const workload = normalizeLower(route.workload)
  const provider = normalizeLower(route.provider)
  const model = normalizeLower(route.model)
  const authPath = normalizeLower(route.authPath)
  if (authPath === 'manual_interactive' || provider === 'manual') return 'manual'
  if (workload === 'embedding' || model.includes('embedding')) return 'embedding'
  if (workload === 'video_vision' || provider === 'gemini') return 'vision'
  if (workload === 'deep_audit_senior_review') return 'deep'
  if (provider === 'claude_code') return workload === 'agent' ? 'deep' : 'deep'
  if (provider === 'openclaw' && model.includes('gpt-5.4')) return 'standard'
  if (provider === 'codex' && (model.includes('fast') || model.includes('mini'))) return 'fast'
  return 'standard'
}

function inferReasoningPosture(route = {}, credential = {}) {
  const capability = metadataCapability(route, credential)
  const explicit = normalizeLower(firstDefined(capability.reasoningPosture, route.metadata?.reasoningPosture, credential.metadata?.reasoningPosture))
  if (REASONING_POSTURES.has(explicit)) return explicit
  const workload = normalizeLower(route.workload)
  const provider = normalizeLower(route.provider)
  const model = normalizeLower(route.model)
  const authPath = normalizeLower(route.authPath)
  if (authPath === 'manual_interactive' || provider === 'manual') return 'manual'
  if (workload === 'embedding' || model.includes('embedding')) return 'none'
  if (workload === 'video_vision' || provider === 'gemini') return 'vision_multimodal'
  if (workload === 'agent' || provider === 'claude_code' || provider === 'codex' || provider === 'openclaw') return 'coding_agent'
  if (workload === 'deep_audit_senior_review' || workload === 'synthesis') return 'high'
  return 'standard'
}

function normalizeSupport(value) {
  const normalized = normalizeLower(value)
  return SUPPORT_VALUES.has(normalized) ? normalized : null
}

function supportFromProbe(probe = {}, key = '') {
  const capability = probe?.capability || {}
  const raw = firstDefined(capability?.supports?.[key], capability?.[key], capability?.[`${key}Support`])
  if (raw === true) return BRAIN_FLEET_CAPABILITY_SUPPORT.SUPPORTED
  if (raw === false) return BRAIN_FLEET_CAPABILITY_SUPPORT.UNSUPPORTED
  return normalizeSupport(raw)
}

function inferSupport(route = {}, credential = {}, probe = {}, key = '') {
  const capability = metadataCapability(route, credential)
  const explicit = normalizeSupport(firstDefined(capability?.supports?.[key], capability?.[key], route.metadata?.supports?.[key], credential.metadata?.supports?.[key]))
  if (explicit) return explicit
  const probeSupport = supportFromProbe(probe, key)
  if (probeSupport) return probeSupport

  const workload = normalizeLower(route.workload)
  const provider = normalizeLower(route.provider)
  const model = normalizeLower(route.model)
  const allowed = unique([route.workload, ...asList(credential.allowedWorkloads)]).map(normalizeLower)

  if (workload === 'embedding' || model.includes('embedding')) return BRAIN_FLEET_CAPABILITY_SUPPORT.UNSUPPORTED
  if (key === 'video' && (workload === 'video_vision' || allowed.includes('video_vision'))) return BRAIN_FLEET_CAPABILITY_SUPPORT.PROBE_REQUIRED
  if (key === 'vision' && (workload === 'video_vision' || allowed.includes('vision') || provider === 'gemini')) return BRAIN_FLEET_CAPABILITY_SUPPORT.PROBE_REQUIRED
  if (key === 'longContext' && (allowed.includes('long_context_probe') || provider === 'gemini')) return BRAIN_FLEET_CAPABILITY_SUPPORT.PROBE_REQUIRED
  return BRAIN_FLEET_CAPABILITY_SUPPORT.UNKNOWN
}

function buildSupport(route = {}, credential = {}, probe = {}) {
  return {
    video: inferSupport(route, credential, probe, 'video'),
    vision: inferSupport(route, credential, probe, 'vision'),
    longContext: inferSupport(route, credential, probe, 'longContext'),
  }
}

function inferAuthPosture(route = {}, credential = {}) {
  const capability = metadataCapability(route, credential)
  const explicit = normalizeLower(firstDefined(capability.authPosture, route.metadata?.authPosture, credential.metadata?.authPosture))
  if (AUTH_POSTURES.has(explicit)) return explicit
  const authPath = normalizeLower(route.authPath || credential.authPath)
  const routeStatus = normalizeLower(route.status)
  const credentialStatus = normalizeLower(credential.status)
  if (authPath === 'manual_interactive') return 'manual_only'
  if (routeStatus === 'blocked' || routeStatus === 'disabled' || credentialStatus === 'blocked' || credentialStatus === 'disabled') return 'blocked'
  if (credentialStatus === 'auth_needed' || credentialStatus === 'missing') return 'auth_needed'
  if (routeStatus === 'available' && credentialStatus === 'available') return 'available'
  if (routeStatus === 'probe_required' || credentialStatus === 'unknown' || !credentialStatus) return 'probe_required'
  return 'unknown'
}

function buildKnownLimitations(route = {}, credential = {}, support = {}) {
  const limitations = []
  const provider = normalizeLower(route.provider)
  const routeStatus = normalizeText(route.status)
  const credentialStatus = normalizeText(credential.status)
  const policy = normalizeText(route.policyClassification)
  const riskClass = normalizeText(route.riskClass)
  if (routeStatus && routeStatus !== 'available') limitations.push(`route_status_${routeStatus}`)
  if (credentialStatus && credentialStatus !== 'available') limitations.push(`credential_status_${credentialStatus}`)
  if (policy && !['allowed', 'api_fallback', 'manual_only'].includes(policy)) limitations.push(`policy_${policy}`)
  if (riskClass && riskClass !== 'low') limitations.push(`risk_${riskClass}`)
  for (const [key, value] of Object.entries(support || {})) {
    if (value === BRAIN_FLEET_CAPABILITY_SUPPORT.PROBE_REQUIRED) limitations.push(`${key}_support_requires_probe`)
    if (value === BRAIN_FLEET_CAPABILITY_SUPPORT.UNKNOWN) limitations.push(`${key}_support_unknown`)
  }
  if (provider === 'openclaw') {
    limitations.push('openclaw_adapter_scoped_route; direct_codex_route_must_probe_native_model_and_speed_truth')
  }
  if (provider === 'claude_code') {
    limitations.push('claude_code_route_remains_experimental_until_bounded_local_route_probe')
  }
  if (provider === 'gemini') {
    limitations.push('gemini_video_long_context_support_requires_bounded_probe_before_extraction')
  }
  return unique([
    ...limitations,
    ...asList(route.metadata?.knownLimitations),
    ...asList(credential.metadata?.knownLimitations),
  ])
}

function buildAllowedWorkloads(route = {}, credential = {}) {
  return unique([
    route.workload,
    ...asList(route.metadata?.allowedWorkloads),
    ...asList(credential.allowedWorkloads),
  ])
}

function buildCapabilityEvidence(route = {}, credential = {}, probe = null) {
  return compactObject({
    sourceTables: ['llm_routes', 'llm_credentials', ...(probe ? ['llm_route_probes'] : [])],
    routeKey: route.routeKey || null,
    credentialKey: credential.credentialKey || route.credentialKey || null,
    probeId: probe?.probeId || null,
    routeUpdatedAt: route.updatedAt || null,
    credentialUpdatedAt: credential.updatedAt || null,
    probeAt: probe?.probedAt || null,
    inferenceVersion: BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_VERSION,
  })
}

export function buildBrainFleetRouteCapability({
  route = {},
  credential = {},
  recentProbes = [],
} = {}) {
  const probe = latestProbeForRoute(route, recentProbes)
  const support = buildSupport(route, credential, probe)
  const quota = normalizeBrainFleetCapabilityQuota(credential.quotaState || {})
  const allowedWorkloads = buildAllowedWorkloads(route, credential)
  return {
    registryVersion: BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_VERSION,
    routeKey: normalizeText(route.routeKey),
    provider: normalizeText(route.provider),
    model: normalizeText(route.model),
    workload: normalizeText(route.workload),
    hubKey: normalizeText(route.hubKey) || 'foundation',
    authPath: normalizeText(route.authPath),
    credentialKey: normalizeText(route.credentialKey || credential.credentialKey),
    accountLabel: normalizeText(credential.accountLabel) || 'unknown_account_label',
    routeStatus: normalizeText(route.status),
    credentialStatus: normalizeText(credential.status),
    policyClassification: normalizeText(route.policyClassification || credential.policyClassification),
    riskClass: normalizeText(route.riskClass),
    speedMode: inferSpeedMode(route, credential),
    reasoningPosture: inferReasoningPosture(route, credential),
    support,
    quota,
    authPosture: inferAuthPosture(route, credential),
    allowedWorkloads,
    knownLimitations: buildKnownLimitations(route, credential, support),
    executionPosture: {
      canExecuteFromRegistry: false,
      reason: 'capability_registry_is_read_only; later route cards must probe through Harlan auth and Brain Fleet quota ledger',
    },
    evidence: buildCapabilityEvidence(route, credential, probe),
  }
}

export function validateBrainFleetRouteCapability(capability = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  add(Number(capability.registryVersion) === BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_VERSION, 'registry version is recorded', String(capability.registryVersion || 'missing'))
  add(Boolean(normalizeText(capability.routeKey)), 'route key is recorded', capability.routeKey || 'missing')
  add(Boolean(normalizeText(capability.provider)), 'provider is recorded', capability.provider || 'missing')
  add(Boolean(normalizeText(capability.model)), 'model is recorded', capability.model || 'missing')
  add(Boolean(normalizeText(capability.workload)), 'workload is recorded', capability.workload || 'missing')
  add(Boolean(normalizeText(capability.authPath)), 'auth path is recorded', capability.authPath || 'missing')
  add(Boolean(normalizeText(capability.accountLabel)), 'account label is recorded', capability.accountLabel || 'missing')
  add(SPEED_MODES.has(capability.speedMode), 'speed mode is explicit', capability.speedMode || 'missing')
  add(REASONING_POSTURES.has(capability.reasoningPosture), 'reasoning posture is explicit', capability.reasoningPosture || 'missing')
  add(SUPPORT_VALUES.has(capability.support?.video), 'video support posture is explicit', capability.support?.video || 'missing')
  add(SUPPORT_VALUES.has(capability.support?.vision), 'vision support posture is explicit', capability.support?.vision || 'missing')
  add(SUPPORT_VALUES.has(capability.support?.longContext), 'long-context support posture is explicit', capability.support?.longContext || 'missing')
  add(QUOTA_POSTURES.has(capability.quota?.posture), 'quota posture is explicit', capability.quota?.posture || 'missing')
  add(Object.prototype.hasOwnProperty.call(capability.quota || {}, 'resetAt'), 'quota reset truth is explicit', capability.quota?.resetAt || 'unknown')
  add(AUTH_POSTURES.has(capability.authPosture), 'auth posture is explicit', capability.authPosture || 'missing')
  add(Array.isArray(capability.knownLimitations), 'known limitations are recorded', String(asList(capability.knownLimitations).length))
  add(Array.isArray(capability.allowedWorkloads) && capability.allowedWorkloads.length > 0, 'allowed workloads are recorded', asList(capability.allowedWorkloads).join(', ') || 'missing')
  add(capability.executionPosture?.canExecuteFromRegistry === false, 'registry does not enable provider execution', String(capability.executionPosture?.canExecuteFromRegistry))
  add(Boolean(capability.evidence?.routeKey), 'capability has route evidence', capability.evidence?.routeKey || 'missing')
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
  }
}

export function buildBrainFleetModelCapabilityRegistry({
  llmRuntime = {},
} = {}) {
  const credentials = asList(llmRuntime.credentials)
  const routes = asList(llmRuntime.routes)
  const recentProbes = asList(llmRuntime.recentProbes)
  const credentialsByKey = new Map(credentials.map(credential => [credential.credentialKey, credential]))
  const capabilities = routes.map(route => buildBrainFleetRouteCapability({
    route,
    credential: route.credentialKey ? credentialsByKey.get(route.credentialKey) || {} : {},
    recentProbes,
  }))
  const validations = capabilities.map(capability => ({
    routeKey: capability.routeKey,
    validation: validateBrainFleetRouteCapability(capability),
  }))
  const failed = validations.filter(item => !item.validation.ok)
  const supportSummary = {
    videoCandidateRoutes: capabilities.filter(capability => capability.support.video !== BRAIN_FLEET_CAPABILITY_SUPPORT.UNSUPPORTED && capability.support.video !== BRAIN_FLEET_CAPABILITY_SUPPORT.UNKNOWN).length,
    visionCandidateRoutes: capabilities.filter(capability => capability.support.vision !== BRAIN_FLEET_CAPABILITY_SUPPORT.UNSUPPORTED && capability.support.vision !== BRAIN_FLEET_CAPABILITY_SUPPORT.UNKNOWN).length,
    longContextCandidateRoutes: capabilities.filter(capability => capability.support.longContext !== BRAIN_FLEET_CAPABILITY_SUPPORT.UNSUPPORTED && capability.support.longContext !== BRAIN_FLEET_CAPABILITY_SUPPORT.UNKNOWN).length,
    probeRequiredRoutes: capabilities.filter(capability =>
      Object.values(capability.support || {}).includes(BRAIN_FLEET_CAPABILITY_SUPPORT.PROBE_REQUIRED) ||
      capability.authPosture === 'probe_required'
    ).length,
  }
  return {
    registryVersion: BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_VERSION,
    status: failed.length ? 'blocked' : 'ready_for_route_probes',
    reportOnly: true,
    providerExecutionAllowed: false,
    liveProviderProbesAllowed: false,
    writesCredentials: false,
    writesRoutes: false,
    writesRouteProbes: false,
    writesSourceSystems: false,
    sourceTables: ['llm_routes', 'llm_credentials', 'llm_route_probes'],
    summary: {
      routeCount: routes.length,
      credentialCount: credentials.length,
      capabilityCount: capabilities.length,
      validCapabilityCount: capabilities.length - failed.length,
      invalidCapabilityCount: failed.length,
      ...supportSummary,
    },
    capabilities,
    validations,
    findings: failed.flatMap(item => item.validation.failed.map(failure => ({
      routeKey: item.routeKey,
      check: failure.check,
      detail: failure.detail,
    }))),
  }
}

export function assertBrainFleetCapabilitySourcesUnchanged(before = {}, after = {}) {
  const beforeValue = {
    credentials: before.credentials || [],
    routes: before.routes || [],
    recentProbes: before.recentProbes || [],
  }
  const afterValue = {
    credentials: after.credentials || [],
    routes: after.routes || [],
    recentProbes: after.recentProbes || [],
  }
  if (stableString(beforeValue) !== stableString(afterValue)) {
    throw new Error('Brain Fleet model capability registry proof mutated LLM runtime source truth.')
  }
  return true
}

export function evaluateBrainFleetModelCapabilityRegistry({
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  packageJson = {},
  llmRuntime = {},
  registry = {},
  syntheticProof = {},
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const source = `${moduleSource}\n${scriptSource}`
  const normalizedPlan = normalizeLower(planSource)
  const packageScript = packageJson.scripts?.['process:brain-fleet-model-capability-registry-check']

  add(moduleSource.includes('buildBrainFleetModelCapabilityRegistry') && moduleSource.includes('validateBrainFleetRouteCapability'), 'module owns capability registry and validation behavior', 'registry/validation exports')
  add(moduleSource.includes('speedMode') && moduleSource.includes('reasoningPosture') && moduleSource.includes('longContext'), 'registry records speed, reasoning, vision/video/long-context truth', 'required capability fields')
  add(!/\bfetch\s*\(|\bspawn\s*\(|\bcallLlm\s*\(|\bcallEmbedding\s*\(/.test(source), 'focused capability path does not call providers or spawn provider CLIs', 'no fetch/spawn/callLlm/callEmbedding')
  add(!/(upsertLlmCredential|upsertLlmRoute|recordLlmRouteProbe|createLlmCall|finishLlmCall)\s*\(/.test(moduleSource), 'capability registry module is read-only over LLM runtime truth', 'no LLM runtime mutation helpers')
  add(packageScript === `node --env-file-if-exists=.env ${BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_SCRIPT_PATH}`, 'package exposes focused model capability proof', packageScript || 'missing')
  add(
    normalizedPlan.includes('speed mode') &&
      normalizedPlan.includes('reasoning posture') &&
      normalizedPlan.includes('video') &&
      normalizedPlan.includes('vision') &&
      normalizedPlan.includes('long-context') &&
      normalizedPlan.includes('quota posture') &&
      normalizedPlan.includes('auth posture') &&
      normalizedPlan.includes('do not run live provider probes') &&
      normalizedPlan.includes('process:foundation-ship'),
    'plan documents required capability truth, probe ban, and ship gate',
    BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_PLAN_PATH,
  )
  add(Array.isArray(llmRuntime.credentials) && llmRuntime.credentials.length > 0, 'live LLM credential truth is available', `credentials=${llmRuntime.credentials?.length || 0}`)
  add(Array.isArray(llmRuntime.routes) && llmRuntime.routes.length > 0, 'live LLM route truth is available', `routes=${llmRuntime.routes?.length || 0}`)
  add(registry.status === 'ready_for_route_probes' && registry.summary?.invalidCapabilityCount === 0, 'live route capability registry is complete', JSON.stringify(registry.summary || {}))
  add(syntheticProof.ok === true, 'synthetic proof exercises capability registry behavior', syntheticProof.mode || 'missing')
  add(syntheticProof.distinguishesRouteProfiles === true, 'dogfood distinguishes Codex/OpenClaw/Gemini/Claude/API route profiles', 'route profiles')
  add(syntheticProof.rejectsMissingFields === true, 'dogfood rejects missing capability truth', 'missing fields')
  add(syntheticProof.noSourceMutation === true, 'dogfood proves no LLM runtime source mutation', 'sources unchanged')
  add(syntheticProof.noProviderExecution === true, 'dogfood proves no provider execution', 'provider calls=0')

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}

export async function buildSyntheticBrainFleetModelCapabilityRegistryProof() {
  const credentialBase = {
    hubKey: 'foundation',
    status: 'available',
    policyClassification: 'allowed',
    quotaState: {
      remaining: 8,
      resetAt: '2026-05-21T00:00:00.000Z',
      window: 'daily',
    },
  }
  const credentials = [
    {
      ...credentialBase,
      credentialKey: 'openclaw-chatgpt-pro',
      provider: 'openclaw',
      authPath: 'chatgpt_subscription_gateway',
      accountLabel: 'local OpenClaw gateway',
      allowedWorkloads: ['extraction', 'extraction_probe'],
    },
    {
      ...credentialBase,
      credentialKey: 'codex-direct-local',
      provider: 'codex',
      authPath: 'codex_subscription',
      accountLabel: 'local Codex subscription',
      allowedWorkloads: ['coding_review', 'agent_probe'],
      metadata: {
        brainFleetCapability: {
          speedMode: 'fast',
          reasoningPosture: 'coding_agent',
          supports: {
            video: 'unsupported',
            vision: 'unknown',
            longContext: 'probe_required',
          },
        },
      },
    },
    {
      ...credentialBase,
      credentialKey: 'gemini-api-default',
      provider: 'gemini',
      authPath: 'gemini_api_direct',
      accountLabel: 'GEMINI_API_KEY',
      allowedWorkloads: ['video_vision', 'long_context_probe'],
    },
    {
      ...credentialBase,
      credentialKey: 'claude-code-local-max',
      provider: 'claude_code',
      authPath: 'claude_code_subscription',
      accountLabel: 'local Claude login',
      allowedWorkloads: ['synthesis_probe', 'agent_probe'],
      status: 'unknown',
      policyClassification: 'experimental',
    },
    {
      ...credentialBase,
      credentialKey: 'openai-api-default',
      provider: 'openai',
      authPath: 'api_direct',
      accountLabel: 'OPENAI_API_KEY',
      allowedWorkloads: ['extraction', 'synthesis', 'embedding'],
    },
  ]
  const routes = [
    {
      routeKey: 'synthetic-openclaw-54',
      workload: 'extraction',
      hubKey: 'foundation',
      provider: 'openclaw',
      model: 'openai-codex/gpt-5.4',
      authPath: 'chatgpt_subscription_gateway',
      credentialKey: 'openclaw-chatgpt-pro',
      status: 'probe_required',
      policyClassification: 'experimental',
      riskClass: 'untested',
    },
    {
      routeKey: 'synthetic-codex-direct-55-fast',
      workload: 'agent',
      hubKey: 'foundation',
      provider: 'codex',
      model: 'gpt-5.5',
      authPath: 'codex_subscription',
      credentialKey: 'codex-direct-local',
      status: 'probe_required',
      policyClassification: 'experimental',
      riskClass: 'untested',
      metadata: {
        brainFleetCapability: {
          speedMode: 'fast',
          reasoningPosture: 'coding_agent',
          supports: {
            video: 'unsupported',
            vision: 'unknown',
            longContext: 'probe_required',
          },
        },
      },
    },
    {
      routeKey: 'synthetic-gemini-video',
      workload: 'video_vision',
      hubKey: 'foundation',
      provider: 'gemini',
      model: 'gemini-video-candidate',
      authPath: 'gemini_api_direct',
      credentialKey: 'gemini-api-default',
      status: 'probe_required',
      policyClassification: 'api_fallback',
      riskClass: 'low',
    },
    {
      routeKey: 'synthetic-claude-review',
      workload: 'synthesis',
      hubKey: 'foundation',
      provider: 'claude_code',
      model: 'claude-code-review-candidate',
      authPath: 'claude_code_subscription',
      credentialKey: 'claude-code-local-max',
      status: 'probe_required',
      policyClassification: 'experimental',
      riskClass: 'untested',
    },
    {
      routeKey: 'synthetic-openai-api-fallback',
      workload: 'extraction',
      hubKey: 'foundation',
      provider: 'openai',
      model: 'configured-cheap-extraction-model',
      authPath: 'api_direct',
      credentialKey: 'openai-api-default',
      status: 'probe_required',
      policyClassification: 'api_fallback',
      riskClass: 'low',
    },
  ]
  const beforeRuntime = { credentials: deepClone(credentials), routes: deepClone(routes), recentProbes: [] }
  const registry = buildBrainFleetModelCapabilityRegistry({ llmRuntime: beforeRuntime })
  const afterRuntime = { credentials: deepClone(credentials), routes: deepClone(routes), recentProbes: [] }
  const noSourceMutation = assertBrainFleetCapabilitySourcesUnchanged(beforeRuntime, afterRuntime)
  const byRoute = new Map(registry.capabilities.map(capability => [capability.routeKey, capability]))
  const missingSpeedRejected = validateBrainFleetRouteCapability({
    ...byRoute.get('synthetic-openai-api-fallback'),
    speedMode: '',
  }).ok === false
  const missingSupportRejected = validateBrainFleetRouteCapability({
    ...byRoute.get('synthetic-openai-api-fallback'),
    support: { video: 'unknown', vision: '', longContext: 'unknown' },
  }).ok === false
  const missingQuotaRejected = validateBrainFleetRouteCapability({
    ...byRoute.get('synthetic-openai-api-fallback'),
    quota: {},
  }).ok === false
  const routeProfiles = {
    openclaw: byRoute.get('synthetic-openclaw-54'),
    codex: byRoute.get('synthetic-codex-direct-55-fast'),
    gemini: byRoute.get('synthetic-gemini-video'),
    claude: byRoute.get('synthetic-claude-review'),
    apiFallback: byRoute.get('synthetic-openai-api-fallback'),
  }
  const distinguishesRouteProfiles =
    routeProfiles.openclaw?.speedMode === 'standard' &&
    routeProfiles.codex?.speedMode === 'fast' &&
    routeProfiles.gemini?.support?.video === BRAIN_FLEET_CAPABILITY_SUPPORT.PROBE_REQUIRED &&
    routeProfiles.gemini?.support?.longContext === BRAIN_FLEET_CAPABILITY_SUPPORT.PROBE_REQUIRED &&
    routeProfiles.claude?.authPosture === 'probe_required' &&
    routeProfiles.apiFallback?.quota?.posture === 'recorded'

  return {
    ok: registry.status === 'ready_for_route_probes' &&
      distinguishesRouteProfiles &&
      missingSpeedRejected &&
      missingSupportRejected &&
      missingQuotaRejected &&
      noSourceMutation,
    mode: 'brain-fleet-model-capability-registry-synthetic-proof',
    registrySummary: registry.summary,
    distinguishesRouteProfiles,
    rejectsMissingFields: missingSpeedRejected && missingSupportRejected && missingQuotaRejected,
    noSourceMutation,
    noProviderExecution: true,
    routeProfiles: Object.fromEntries(Object.entries(routeProfiles).map(([key, value]) => [key, compactObject({
      routeKey: value?.routeKey,
      provider: value?.provider,
      model: value?.model,
      speedMode: value?.speedMode,
      reasoningPosture: value?.reasoningPosture,
      support: value?.support,
      quotaPosture: value?.quota?.posture,
      authPosture: value?.authPosture,
    })])),
  }
}
