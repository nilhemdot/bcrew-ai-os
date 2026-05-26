import { buildLlmCredentialRegistryPolicySnapshot } from './llm-credential-registry.js'
import { LLM_WORKLOADS, planLlmRoute } from './llm-router.js'

export const BRAIN_FLEET_FOUNDATION_CARD_ID = 'BRAIN-FLEET-FOUNDATION-001'
export const BRAIN_FLEET_FOUNDATION_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const BRAIN_FLEET_FOUNDATION_CLOSEOUT_KEY = 'brain-fleet-foundation-v1'
export const BRAIN_FLEET_FOUNDATION_PLAN_PATH = 'docs/process/brain-fleet-foundation-001-plan.md'
export const BRAIN_FLEET_FOUNDATION_APPROVAL_PATH = 'docs/process/approvals/BRAIN-FLEET-FOUNDATION-001.json'
export const BRAIN_FLEET_FOUNDATION_SCRIPT_PATH = 'scripts/process-brain-fleet-foundation-check.mjs'
export const BRAIN_FLEET_FOUNDATION_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-foundation-closeout.md'
export const BRAIN_FLEET_FOUNDATION_NEXT_CARD_ID = 'HARLAN-AUTH-ESCALATION-LOOP-001'

export const BRAIN_FLEET_CONTRACT_VERSION = 1
export const BRAIN_FLEET_REQUIRED_FOLLOW_ON_CARD_IDS = [
  'HARLAN-AUTH-ESCALATION-LOOP-001',
  'BRAIN-FLEET-QUOTA-LEDGER-001',
  'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001',
]

export const BRAIN_FLEET_ALLOWED_WORKLOADS = Object.freeze([
  ...Object.values(LLM_WORKLOADS),
  'extraction_probe',
  'classification_probe',
  'synthesis_probe',
  'agent_probe',
  'deep_audit_probe',
  'long_context_probe',
])

export const BRAIN_FLEET_NO_AUTH_NOT_NEXT = [
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions from Brain Fleet foundation v1.',
  'Do not execute provider calls from Brain Fleet foundation v1.',
  'Do not run live provider probes from Brain Fleet foundation v1.',
  'Do not mutate llm_credentials, llm_routes, llm_route_probes, llm_calls, source systems, credentials, or provider config from the contract proof.',
  'Do not accept raw prompt/messages/transcript content in the v1 route contract; pass artifact refs only.',
  'Do not continue to paid/private extraction until Harlan auth escalation, quota ledger, and capability registry are shipped.',
]

const RAW_CONTENT_KEYS = [
  'prompt',
  'messages',
  'inputText',
  'content',
  'rawContent',
  'rawText',
  'sourceContent',
  'transcriptText',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => {
    if (Array.isArray(entry)) return entry.length > 0
    if (entry && typeof entry === 'object') return Object.keys(entry).length > 0
    return entry !== null && entry !== undefined && entry !== ''
  }))
}

function includesToken(source = '', token = '') {
  return String(source || '').includes(token)
}

function hasUnsafeContentField(input = {}) {
  return RAW_CONTENT_KEYS.find(key => input[key] !== undefined && input[key] !== null && String(input[key]).length > 0) || null
}

export function normalizeBrainFleetRequest(input = {}) {
  const workload = normalizeText(input.workload)
  if (!workload) throw new Error('Brain Fleet request requires workload.')
  if (!BRAIN_FLEET_ALLOWED_WORKLOADS.includes(workload)) {
    throw new Error(`Brain Fleet workload is not in the v1 contract allowlist: ${workload}.`)
  }
  const unsafeContentField = hasUnsafeContentField(input)
  if (unsafeContentField) {
    throw new Error(`Brain Fleet foundation v1 is no-auth contract-only; pass an artifact ref instead of ${unsafeContentField}.`)
  }
  const inputArtifactRef = normalizeText(input.inputArtifactRef || input.artifactRef)
  if (!inputArtifactRef) throw new Error('Brain Fleet request requires inputArtifactRef for no-auth contract planning.')

  return {
    contractVersion: BRAIN_FLEET_CONTRACT_VERSION,
    workload,
    hubKey: normalizeText(input.hubKey) || 'foundation',
    caller: normalizeText(input.caller) || 'unknown',
    inputArtifactRef,
    outputArtifactRef: normalizeText(input.outputArtifactRef) || null,
    purpose: normalizeText(input.purpose) || null,
    sourceId: normalizeText(input.sourceId) || null,
    executionMode: 'plan_only',
    providerExecutionAllowed: false,
  }
}

export function buildBrainFleetRouteContract({
  request = {},
  route = {},
  credential = null,
  readiness = null,
  fallbackRoute = null,
} = {}) {
  const credentialQuotaState = credential?.quotaState && typeof credential.quotaState === 'object'
    ? credential.quotaState
    : {}
  const stopConditions = [
    'harlan_auth_escalation_not_shipped',
    'brain_fleet_quota_ledger_not_shipped',
    'brain_fleet_model_capability_registry_not_shipped',
    'provider_execution_disabled_for_contract_v1',
  ]
  if (readiness?.blockReason) stopConditions.push('llm_router_not_runnable')

  return {
    contractVersion: BRAIN_FLEET_CONTRACT_VERSION,
    status: 'planned_contract_only',
    workload: route.workload || request.workload || null,
    hubKey: route.hubKey || request.hubKey || 'foundation',
    routeKey: route.routeKey || null,
    provider: route.provider || null,
    model: route.model || null,
    authPath: route.authPath || null,
    credentialKey: route.credentialKey || credential?.credentialKey || null,
    accountLabel: credential?.accountLabel || null,
    fallbackRouteKey: route.fallbackRouteKey || fallbackRoute?.routeKey || null,
    routeStatus: route.status || null,
    routePolicyClassification: route.policyClassification || null,
    routeRiskClass: route.riskClass || null,
    credentialStatus: credential?.status || null,
    credentialPolicyClassification: credential?.policyClassification || null,
    allowedWorkloads: asList(credential?.allowedWorkloads),
    quota: {
      posture: Object.keys(credentialQuotaState).length ? 'recorded' : 'unknown',
      state: credentialQuotaState,
    },
    readiness: {
      llmRouterRunnable: readiness?.runnable === true,
      llmRouterBlockReason: readiness?.blockReason || null,
      authEscalationReady: false,
      quotaLedgerReady: false,
      capabilityRegistryReady: false,
      providerExecutionAllowed: false,
      canExecute: false,
      stopConditions,
    },
    requiredBeforeExecution: {
      authEscalation: 'HARLAN-AUTH-ESCALATION-LOOP-001',
      quotaLedger: 'BRAIN-FLEET-QUOTA-LEDGER-001',
      capabilityRegistry: 'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001',
    },
    proofBoundary: 'no_auth_no_probe_no_provider_execution',
  }
}

export function buildBrainFleetFoundationSnapshot({
  llmRuntime = {},
} = {}) {
  const credentials = asList(llmRuntime.credentials)
  const routes = asList(llmRuntime.routes)
  const credentialRegistry = llmRuntime.credentialRegistry || buildLlmCredentialRegistryPolicySnapshot({
    credentials,
    routes,
    recentProbes: asList(llmRuntime.recentProbes),
  })
  const credentialsByKey = new Map(credentials.map(credential => [credential.credentialKey, credential]))
  const findings = []
  if (!credentials.length) findings.push('llm_credentials has no rows for Brain Fleet to read')
  if (!routes.length) findings.push('llm_routes has no rows for Brain Fleet to read')
  if (!credentialRegistry?.summary) findings.push('credential registry snapshot is missing')

  const routeContracts = routes.map(route => {
    const credential = route.credentialKey ? credentialsByKey.get(route.credentialKey) || null : null
    return buildBrainFleetRouteContract({
      route,
      credential,
      readiness: {
        runnable: route.status === 'available' && !['blocked', 'high'].includes(route.riskClass),
        blockReason: route.status === 'available' ? null : `route status is ${route.status || 'missing'}`,
      },
    })
  })

  return {
    contractVersion: BRAIN_FLEET_CONTRACT_VERSION,
    status: findings.length ? 'blocked' : 'ready_for_contract',
    sourceTables: ['llm_credentials', 'llm_routes'],
    reusedModules: ['lib/llm-router.js', 'lib/llm-credential-registry.js', 'lib/foundation-llm-runtime-store.js'],
    reportOnly: true,
    providerExecutionAllowed: false,
    liveProviderProbesAllowed: false,
    writesCredentials: false,
    writesRoutes: false,
    writesCalls: false,
    writesSourceSystems: false,
    followOnCardsRequiredBeforeExecution: BRAIN_FLEET_REQUIRED_FOLLOW_ON_CARD_IDS,
    summary: {
      credentialCount: credentials.length,
      routeCount: routes.length,
      routeContractCount: routeContracts.length,
      credentialRegistryFindings: Number(credentialRegistry?.summary?.findings || 0),
      executableNow: 0,
    },
    routeContracts,
    credentialRegistry: {
      status: credentialRegistry?.summary?.findings ? 'review' : 'present',
      summary: credentialRegistry?.summary || {},
    },
    findings,
  }
}

export async function planBrainFleetRoute({
  request,
  routePlanner = planLlmRoute,
} = {}) {
  const normalizedRequest = normalizeBrainFleetRequest(request)
  const plan = await routePlanner({
    workload: normalizedRequest.workload,
    hubKey: normalizedRequest.hubKey,
  })
  return {
    request: normalizedRequest,
    routeContract: buildBrainFleetRouteContract({
      request: normalizedRequest,
      route: plan.selectedRoute,
      credential: plan.selectedCredential,
      readiness: {
        runnable: plan.runnable,
        blockReason: plan.blockReason,
      },
      fallbackRoute: plan.fallbackRoute,
    }),
    routerPlan: {
      routeCount: plan.routeCount,
      fallbackMode: plan.fallbackMode,
      routeReadiness: plan.routeReadiness,
    },
  }
}

export function evaluateBrainFleetFoundation({
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  packageJson = {},
  llmRouterSource = '',
  credentialRegistrySource = '',
  snapshot = {},
  syntheticProof = {},
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const source = `${moduleSource}\n${scriptSource}`
  const normalizedPlan = String(planSource || '').toLowerCase()
  const packageScript = packageJson.scripts?.['process:brain-fleet-foundation-check']

  add(includesToken(moduleSource, 'planLlmRoute'), 'Brain Fleet contract uses existing LLM router planner', 'planLlmRoute')
  add(includesToken(moduleSource, 'buildLlmCredentialRegistryPolicySnapshot'), 'Brain Fleet contract uses existing credential registry policy snapshot', 'buildLlmCredentialRegistryPolicySnapshot')
  add(!/\bcallLlm\s*\(/.test(moduleSource), 'Brain Fleet foundation module does not execute LLM provider calls', 'no callLlm invocation')
  add(!/\bcallEmbedding\s*\(/.test(moduleSource), 'Brain Fleet foundation module does not execute embedding calls', 'no callEmbedding invocation')
  add(!/(upsertLlmCredential|upsertLlmRoute|recordLlmRouteProbe|createLlmCall|finishLlmCall)\s*\(/.test(moduleSource), 'Brain Fleet foundation module does not mutate LLM runtime tables', 'no runtime write helpers')
  add(!/\bfetch\s*\(|\bspawn\s*\(/.test(moduleSource), 'Brain Fleet foundation module does not call external providers or spawn provider CLIs', 'no fetch/spawn')
  add(!/recordLlmRouteProbe|live provider probe|probe provider/i.test(scriptSource.replace(/['"`][\s\S]*?['"`]/g, '')), 'focused proof does not run live provider probes', BRAIN_FLEET_FOUNDATION_SCRIPT_PATH)
  add(snapshot.status === 'ready_for_contract', 'live LLM runtime snapshot is available for Brain Fleet contract', `credentials=${snapshot.summary?.credentialCount || 0} routes=${snapshot.summary?.routeCount || 0}`)
  add(snapshot.providerExecutionAllowed === false && snapshot.liveProviderProbesAllowed === false, 'snapshot keeps provider execution and probes disabled', JSON.stringify({
    providerExecutionAllowed: snapshot.providerExecutionAllowed,
    liveProviderProbesAllowed: snapshot.liveProviderProbesAllowed,
  }))
  add(syntheticProof.ok === true, 'synthetic proof exercises contract behavior instead of substring-only proof', syntheticProof.mode || 'missing')
  add(includesToken(llmRouterSource, 'export async function planLlmRoute'), 'existing LLM router exposes planLlmRoute', 'lib/llm-router.js')
  add(includesToken(credentialRegistrySource, 'buildLlmCredentialRegistryPolicySnapshot'), 'existing credential registry exposes policy snapshot', 'lib/llm-credential-registry.js')
  add(packageScript === `node --env-file-if-exists=.env ${BRAIN_FLEET_FOUNDATION_SCRIPT_PATH}`, 'package exposes focused Brain Fleet foundation proof', packageScript || 'missing')
  add(
    normalizedPlan.includes('no-auth') &&
      normalizedPlan.includes('llm_credentials') &&
      normalizedPlan.includes('llm_routes') &&
      normalizedPlan.includes('do not run live provider probes') &&
      normalizedPlan.includes('process:foundation-ship'),
    'plan documents no-auth scope, existing route tables, probe ban, and full ship gate',
    BRAIN_FLEET_FOUNDATION_PLAN_PATH,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}

export async function buildSyntheticBrainFleetFoundationProof() {
  const fakeRuntime = {
    credentials: [
      {
        credentialKey: 'openai-api-default',
        provider: 'openai',
        authPath: 'api_direct',
        accountLabel: 'OPENAI_API_KEY',
        status: 'available',
        policyClassification: 'api_fallback',
        allowedWorkloads: ['extraction'],
        quotaState: { remaining: 'unknown' },
        metadata: {},
      },
    ],
    routes: [
      {
        routeKey: 'foundation-extraction-openai-api',
        workload: 'extraction',
        hubKey: 'foundation',
        priority: 90,
        provider: 'openai',
        model: 'configured-cheap-extraction-model',
        authPath: 'api_direct',
        credentialKey: 'openai-api-default',
        fallbackRouteKey: null,
        status: 'available',
        policyClassification: 'api_fallback',
        riskClass: 'low',
        metadata: {},
      },
    ],
    recentProbes: [],
  }
  let routePlannerCalls = 0
  let providerExecutionCalls = 0
  const routePlanner = async ({ workload, hubKey }) => {
    routePlannerCalls += 1
    return {
      selectedRoute: fakeRuntime.routes[0],
      selectedCredential: fakeRuntime.credentials[0],
      fallbackRoute: null,
      fallbackMode: 'none',
      routeCount: 1,
      runnable: true,
      blockReason: null,
      routeReadiness: [{ routeKey: 'foundation-extraction-openai-api', runnable: true }],
      workload,
      hubKey,
    }
  }
  const snapshot = buildBrainFleetFoundationSnapshot({ llmRuntime: fakeRuntime })
  const planned = await planBrainFleetRoute({
    request: {
      workload: 'extraction',
      hubKey: 'foundation',
      caller: 'synthetic-proof',
      inputArtifactRef: 'artifact://synthetic/build-intel-item',
    },
    routePlanner,
  })
  const rawPromptRejected = await (async () => {
    try {
      await planBrainFleetRoute({
        request: {
          workload: 'extraction',
          hubKey: 'foundation',
          caller: 'synthetic-proof',
          inputArtifactRef: 'artifact://synthetic/build-intel-item',
          prompt: 'raw prompt should be rejected',
        },
        routePlanner,
      })
      return false
    } catch (error) {
      return /contract-only|artifact ref/i.test(error instanceof Error ? error.message : String(error))
    }
  })()
  const missingWorkloadRejected = await (async () => {
    try {
      normalizeBrainFleetRequest({ inputArtifactRef: 'artifact://synthetic/build-intel-item' })
      return false
    } catch (error) {
      return /workload/i.test(error instanceof Error ? error.message : String(error))
    }
  })()

  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  add(snapshot.status === 'ready_for_contract' && snapshot.summary.routeContractCount === 1, 'snapshot maps existing LLM route rows into Brain Fleet contracts', JSON.stringify(snapshot.summary))
  add(planned.routeContract.provider === 'openai' && planned.routeContract.model === 'configured-cheap-extraction-model', 'route contract preserves provider and model truth', `${planned.routeContract.provider}/${planned.routeContract.model}`)
  add(planned.routeContract.accountLabel === 'OPENAI_API_KEY', 'route contract preserves account label without secret value', planned.routeContract.accountLabel)
  add(planned.routeContract.readiness.canExecute === false && planned.routeContract.readiness.providerExecutionAllowed === false, 'contract blocks execution before auth/ledger/capability follow-ons', planned.routeContract.readiness.stopConditions.join(', '))
  add(rawPromptRejected, 'contract rejects raw prompt/message content in no-auth v1', 'raw prompt rejected')
  add(missingWorkloadRejected, 'contract rejects missing workload', 'missing workload rejected')
  add(routePlannerCalls === 1 && providerExecutionCalls === 0, 'proof uses planner only and makes no provider execution call', `planner=${routePlannerCalls} provider=${providerExecutionCalls}`)

  return {
    ok: checks.every(check => check.ok),
    mode: 'brain-fleet-foundation-synthetic-contract',
    checks,
    failed: checks.filter(check => !check.ok),
    planned: {
      request: planned.request,
      routeContract: compactObject(planned.routeContract),
      routerPlan: planned.routerPlan,
    },
    snapshotSummary: snapshot.summary,
  }
}
