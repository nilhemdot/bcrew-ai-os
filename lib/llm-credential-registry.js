import { LLM_HUB_CAPACITY_LANE_DEFINITIONS } from './llm-hub-capacity.js'

export const LLM_CREDENTIAL_REGISTRY_CARD_ID = 'LLM-CREDENTIAL-REGISTRY-001'
export const LLM_CREDENTIAL_REGISTRY_SPRINT_ID = 'llm-credential-registry-2026-05-17'
export const LLM_CREDENTIAL_REGISTRY_CLOSEOUT_KEY = 'llm-credential-registry-v1'
export const LLM_CREDENTIAL_REGISTRY_PLAN_PATH = 'docs/process/llm-credential-registry-001-plan.md'
export const LLM_CREDENTIAL_REGISTRY_APPROVAL_PATH = 'docs/process/approvals/LLM-CREDENTIAL-REGISTRY-001.json'
export const LLM_CREDENTIAL_REGISTRY_SCRIPT_PATH = 'scripts/process-llm-credential-registry-check.mjs'

export const LLM_CAPACITY_POLICY_VERSION = 1
export const LLM_CAPACITY_POLICY_METADATA_KEY = 'capacityPolicy'

function asList(value) {
  return Array.isArray(value) ? value : []
}

function normalizeText(value) {
  return String(value || '').trim()
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

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableJson(value) {
  return JSON.stringify(stableValue(value))
}

function stopControlsFor(lanes = []) {
  return lanes
    .map(lane => lane.stopControl || {})
    .filter(control => normalizeText(control.owner) || normalizeText(control.action))
    .map(control => ({
      owner: normalizeText(control.owner),
      action: normalizeText(control.action),
    }))
}

function budgetFor(lanes = [], routes = []) {
  const routeCaps = routes
    .map(route => route?.costCapUsd)
    .filter(value => value !== null && value !== undefined && Number.isFinite(Number(value)))
    .map(Number)
  const monthlyUsd = lanes
    .map(lane => lane.monthlyBudgetUsd)
    .filter(value => value !== null && value !== undefined && Number.isFinite(Number(value)))
    .reduce((sum, value) => sum + Number(value), 0)
  return compactObject({
    monthlyUsd,
    routeCostCapsUsd: routeCaps,
  })
}

function lanePolicyBase(lanes = [], relatedRoutes = []) {
  return compactObject({
    version: LLM_CAPACITY_POLICY_VERSION,
    source: 'LLM_HUB_CAPACITY_LANE_DEFINITIONS',
    laneKeys: unique(lanes.map(lane => lane.laneKey)),
    labels: unique(lanes.map(lane => lane.label)),
    owners: unique(lanes.map(lane => lane.owner)),
    hubKeys: unique(lanes.map(lane => lane.hubKey)),
    workloads: unique(lanes.map(lane => lane.workload)),
    providers: unique(lanes.map(lane => lane.provider)),
    authPaths: unique(lanes.map(lane => lane.authPath)),
    primaryRouteKeys: unique(lanes.map(lane => lane.primaryRouteKey)),
    fallbackRouteKeys: unique(lanes.map(lane => lane.fallbackRouteKey)),
    allowedWorkloads: unique(lanes.flatMap(lane => asList(lane.allowedWorkloads))),
    policyPostures: unique(lanes.map(lane => lane.policyPosture)),
    pacing: unique(lanes.map(lane => lane.pacing)),
    accountWindows: unique(lanes.map(lane => lane.accountWindow)),
    budget: budgetFor(lanes, relatedRoutes),
    stopControls: stopControlsFor(lanes),
  })
}

function findSecretLeak(value, path = []) {
  if (value === null || value === undefined) return null
  const key = path[path.length - 1] || ''
  if (/(api[_-]?key|secret[_-]?value|refresh[_-]?token|access[_-]?token|password|private[_-]?key)/i.test(key)) {
    return path.join('.')
  }
  if (typeof value === 'string' && /(sk-[A-Za-z0-9_-]{12,}|xox[baprs]-|UC0yN|AIza[0-9A-Za-z_-]{20,})/.test(value)) {
    return path.join('.') || 'value'
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const leak = findSecretLeak(value[index], path.concat(String(index)))
      if (leak) return leak
    }
  } else if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      const leak = findSecretLeak(childValue, path.concat(childKey))
      if (leak) return leak
    }
  }
  return null
}

function requiredPolicyFindings(policy = {}, label = 'policy') {
  const findings = []
  if (!Number.isFinite(Number(policy.version))) findings.push(`${label} missing version`)
  if (!asList(policy.laneKeys).length) findings.push(`${label} missing lane keys`)
  if (!asList(policy.owners).length) findings.push(`${label} missing owner`)
  if (!asList(policy.workloads).length) findings.push(`${label} missing workloads`)
  if (!asList(policy.stopControls).some(control => normalizeText(control.owner) && normalizeText(control.action))) findings.push(`${label} missing stop control`)
  const hasBudget = Number(policy.budget?.monthlyUsd) >= 0 || asList(policy.budget?.routeCostCapsUsd).length > 0
  if (!hasBudget) findings.push(`${label} missing budget/cap`)
  const secretLeak = findSecretLeak(policy)
  if (secretLeak) findings.push(`${label} contains secret-shaped value at ${secretLeak}`)
  return findings
}

function desiredCredentialPolicy(credential = {}, lanes = [], routesByKey = new Map()) {
  const relatedLanes = lanes.filter(lane => normalizeText(lane.credentialKey) === normalizeText(credential.credentialKey))
  if (!relatedLanes.length) return null
  const relatedRoutes = relatedLanes
    .flatMap(lane => [lane.primaryRouteKey, lane.fallbackRouteKey])
    .map(key => routesByKey.get(key))
    .filter(Boolean)
  return compactObject({
    ...lanePolicyBase(relatedLanes, relatedRoutes),
    credentialKey: credential.credentialKey,
  })
}

function desiredRoutePolicy(route = {}, lanes = [], routesByKey = new Map()) {
  const relatedLanes = lanes.filter(lane =>
    normalizeText(lane.primaryRouteKey) === normalizeText(route.routeKey) ||
      normalizeText(lane.fallbackRouteKey) === normalizeText(route.routeKey)
  )
  if (!relatedLanes.length) return null
  const primaryFor = unique(relatedLanes
    .filter(lane => normalizeText(lane.primaryRouteKey) === normalizeText(route.routeKey))
    .map(lane => lane.laneKey))
  const fallbackFor = unique(relatedLanes
    .filter(lane => normalizeText(lane.fallbackRouteKey) === normalizeText(route.routeKey))
    .map(lane => lane.laneKey))
  return compactObject({
    ...lanePolicyBase(relatedLanes, [route, ...relatedLanes.map(lane => routesByKey.get(lane.fallbackRouteKey)).filter(Boolean)]),
    routeKey: route.routeKey,
    primaryFor,
    fallbackFor,
  })
}

function buildPolicyStatus({ currentPolicy, desiredPolicy, label }) {
  if (!desiredPolicy) {
    return {
      status: 'not_required',
      findings: [],
    }
  }
  const findings = []
  if (!currentPolicy || typeof currentPolicy !== 'object') {
    findings.push(`${label} capacity policy missing from metadata`)
  } else {
    findings.push(...requiredPolicyFindings(currentPolicy, label))
    if (stableJson(currentPolicy) !== stableJson(desiredPolicy)) {
      findings.push(`${label} capacity policy drifted from desired lane policy`)
    }
  }
  const desiredFindings = requiredPolicyFindings(desiredPolicy, `${label} desired policy`)
  findings.push(...desiredFindings)
  return {
    status: findings.length ? 'missing_or_drifted' : 'complete',
    findings,
  }
}

export function buildLlmCapacityPolicyMetadataUpdates({
  credentials = [],
  routes = [],
  lanes = LLM_HUB_CAPACITY_LANE_DEFINITIONS,
} = {}) {
  const routesByKey = new Map(asList(routes).map(route => [route.routeKey, route]))
  const credentialPolicies = new Map()
  const routePolicies = new Map()
  for (const credential of asList(credentials)) {
    const policy = desiredCredentialPolicy(credential, asList(lanes), routesByKey)
    if (policy) credentialPolicies.set(credential.credentialKey, policy)
  }
  for (const route of asList(routes)) {
    const policy = desiredRoutePolicy(route, asList(lanes), routesByKey)
    if (policy) routePolicies.set(route.routeKey, policy)
  }
  return { credentialPolicies, routePolicies }
}

export function buildLlmCredentialRegistryPolicySnapshot({
  credentials = [],
  routes = [],
  recentProbes = [],
  lanes = LLM_HUB_CAPACITY_LANE_DEFINITIONS,
} = {}) {
  const { credentialPolicies, routePolicies } = buildLlmCapacityPolicyMetadataUpdates({
    credentials,
    routes,
    recentProbes,
    lanes,
  })
  const credentialRows = asList(credentials).map(credential => {
    const desiredPolicy = credentialPolicies.get(credential.credentialKey) || null
    const currentPolicy = credential.metadata?.[LLM_CAPACITY_POLICY_METADATA_KEY] || null
    const status = buildPolicyStatus({
      currentPolicy,
      desiredPolicy,
      label: `credential ${credential.credentialKey}`,
    })
    return {
      credentialKey: credential.credentialKey,
      provider: credential.provider,
      authPath: credential.authPath,
      status: status.status,
      laneBacked: Boolean(desiredPolicy),
      currentPolicy,
      desiredPolicy,
      findings: status.findings,
    }
  })
  const routeRows = asList(routes).map(route => {
    const desiredPolicy = routePolicies.get(route.routeKey) || null
    const currentPolicy = route.metadata?.[LLM_CAPACITY_POLICY_METADATA_KEY] || null
    const status = buildPolicyStatus({
      currentPolicy,
      desiredPolicy,
      label: `route ${route.routeKey}`,
    })
    return {
      routeKey: route.routeKey,
      provider: route.provider,
      authPath: route.authPath,
      status: status.status,
      laneBacked: Boolean(desiredPolicy),
      currentPolicy,
      desiredPolicy,
      findings: status.findings,
    }
  })
  const findings = [
    ...credentialRows.flatMap(row => row.findings.map(detail => ({
      type: 'credential_policy',
      key: row.credentialKey,
      detail,
    }))),
    ...routeRows.flatMap(row => row.findings.map(detail => ({
      type: 'route_policy',
      key: row.routeKey,
      detail,
    }))),
  ]
  const summary = {
    credentialPolicyRows: credentialRows.filter(row => row.laneBacked).length,
    credentialPoliciesComplete: credentialRows.filter(row => row.laneBacked && row.status === 'complete').length,
    routePolicyRows: routeRows.filter(row => row.laneBacked).length,
    routePoliciesComplete: routeRows.filter(row => row.laneBacked && row.status === 'complete').length,
    unmappedCredentials: credentialRows.filter(row => !row.laneBacked).length,
    unmappedRoutes: routeRows.filter(row => !row.laneBacked).length,
    findings: findings.length,
  }
  return {
    ok: findings.length === 0,
    summary,
    credentials: credentialRows,
    routes: routeRows,
    findings,
  }
}

export function buildLlmCredentialRegistryDogfoodProof() {
  const lane = LLM_HUB_CAPACITY_LANE_DEFINITIONS.find(item => item.laneKey === 'foundation-system-worker-extraction')
  const route = {
    routeKey: lane.primaryRouteKey,
    provider: lane.provider,
    authPath: lane.authPath,
    credentialKey: lane.credentialKey,
    fallbackRouteKey: lane.fallbackRouteKey,
    status: 'available',
    policyClassification: 'allowed',
    riskClass: 'low',
    metadata: {},
  }
  const fallbackRoute = {
    routeKey: lane.fallbackRouteKey,
    provider: 'openai',
    authPath: 'api_direct',
    credentialKey: 'openai-api-default',
    status: 'available',
    policyClassification: 'api_fallback',
    riskClass: 'low',
    metadata: {},
  }
  const credential = {
    credentialKey: lane.credentialKey,
    provider: lane.provider,
    authPath: lane.authPath,
    metadata: {},
  }
  const probe = {
    credentialKey: lane.credentialKey,
    provider: lane.provider,
    authPath: lane.authPath,
    status: 'passed',
    probedAt: '2026-05-17T00:00:00.000Z',
  }
  const updates = buildLlmCapacityPolicyMetadataUpdates({
    credentials: [credential],
    routes: [route, fallbackRoute],
    recentProbes: [probe],
    lanes: [lane],
  })
  const healthyCredential = {
    ...credential,
    metadata: { capacityPolicy: updates.credentialPolicies.get(lane.credentialKey) },
  }
  const healthyRoute = {
    ...route,
    metadata: { capacityPolicy: updates.routePolicies.get(lane.primaryRouteKey) },
  }
  const healthyFallback = {
    ...fallbackRoute,
    metadata: { capacityPolicy: updates.routePolicies.get(lane.fallbackRouteKey) },
  }
  const healthy = buildLlmCredentialRegistryPolicySnapshot({
    credentials: [healthyCredential],
    routes: [healthyRoute, healthyFallback],
    recentProbes: [probe],
    lanes: [lane],
  })
  const missingMetadata = buildLlmCredentialRegistryPolicySnapshot({
    credentials: [credential],
    routes: [route, fallbackRoute],
    recentProbes: [probe],
    lanes: [lane],
  })
  const weakPolicy = {
    ...updates.credentialPolicies.get(lane.credentialKey),
    owners: [],
    stopControls: [],
    budget: {},
  }
  const missingFields = buildLlmCredentialRegistryPolicySnapshot({
    credentials: [{ ...credential, metadata: { capacityPolicy: weakPolicy } }],
    routes: [healthyRoute, healthyFallback],
    recentProbes: [probe],
    lanes: [lane],
  })
  const secretLeak = buildLlmCredentialRegistryPolicySnapshot({
    credentials: [{
      ...credential,
      metadata: {
        capacityPolicy: {
          ...updates.credentialPolicies.get(lane.credentialKey),
          apiKey: 'sk-synthetic-secret-value',
        },
      },
    }],
    routes: [healthyRoute, healthyFallback],
    recentProbes: [probe],
    lanes: [lane],
  })
  return {
    ok: healthy.ok && !missingMetadata.ok && !missingFields.ok && !secretLeak.ok,
    healthySummary: healthy.summary,
    rejected: {
      missingMetadata: !missingMetadata.ok,
      missingOwnerStopBudget: !missingFields.ok,
      secretLeak: !secretLeak.ok,
    },
    invariant: 'Capacity-lane-backed credentials/routes are trusted only when DB metadata carries owner, budget/cap, stop control, fallback/lane coverage, and no secret-shaped values.',
  }
}
