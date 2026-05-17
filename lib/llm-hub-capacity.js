export const LLM_HUB_CAPACITY_CARD_ID = 'LLM-HUB-CAPACITY-001'
export const LLM_HUB_CAPACITY_SPRINT_ID = 'llm-hub-capacity-2026-05-17'
export const LLM_HUB_CAPACITY_CLOSEOUT_KEY = 'llm-hub-capacity-v1'
export const LLM_HUB_CAPACITY_PLAN_PATH = 'docs/process/llm-hub-capacity-001-plan.md'
export const LLM_HUB_CAPACITY_APPROVAL_PATH = 'docs/process/approvals/LLM-HUB-CAPACITY-001.json'
export const LLM_HUB_CAPACITY_SCRIPT_PATH = 'scripts/process-llm-hub-capacity-check.mjs'

const HEALTHY_ROUTE_STATUSES = new Set(['available'])
const WARNING_ROUTE_STATUSES = new Set(['planned', 'probe_required'])
const BLOCKED_ROUTE_STATUSES = new Set(['blocked', 'disabled'])
const HEALTHY_CREDENTIAL_STATUSES = new Set(['available'])
const WARNING_CREDENTIAL_STATUSES = new Set(['unknown'])
const BLOCKED_CREDENTIAL_STATUSES = new Set(['missing', 'blocked', 'exhausted', 'disabled'])
const WARNING_POLICIES = new Set(['untested', 'experimental'])
const BLOCKED_POLICIES = new Set(['blocked'])

export const LLM_HUB_CAPACITY_LANE_DEFINITIONS = [
  {
    laneKey: 'builder-chat-manual-review',
    label: 'Builder Chat / Manual Review',
    hubKey: 'foundation',
    workload: 'coding_review',
    owner: 'Steve + main builder session',
    provider: 'manual',
    authPath: 'manual_interactive',
    credentialKey: 'manual-interactive-builder',
    primaryRouteKey: null,
    fallbackRouteKey: null,
    allowedWorkloads: ['coding_review', 'manual_strategy_review'],
    manualOnly: true,
    monthlyBudgetUsd: 0,
    pacing: 'human-paced',
    accountWindow: 'interactive-builder-session',
    stopControl: {
      owner: 'Steve',
      action: 'stop current chat or do not approve commit/push',
    },
    policyPosture: 'manual_only',
    notes: 'Human-reviewed coding and strategy sessions are capacity, but not backend automation.',
  },
  {
    laneKey: 'foundation-system-worker-extraction',
    label: 'Foundation System Worker Extraction',
    hubKey: 'foundation',
    workload: 'extraction',
    owner: 'Foundation Runtime',
    provider: 'openclaw',
    authPath: 'chatgpt_subscription_gateway',
    credentialKey: 'openclaw-chatgpt-pro',
    primaryRouteKey: 'foundation-extraction-openclaw-chatgpt',
    fallbackRouteKey: 'foundation-extraction-openai-api',
    allowedWorkloads: ['extraction', 'extraction_probe'],
    monthlyBudgetUsd: 50,
    pacing: 'scheduled jobs with runtime health and stale-call reaper',
    accountWindow: 'local OpenClaw ChatGPT subscription gateway',
    stopControl: {
      owner: 'Foundation Runtime',
      action: 'pause job, disable route, or stop OpenClaw gateway',
    },
    policyPosture: 'internal_capacity_only',
    notes: 'High-volume internal extraction route. Must stay logged, paced, and fallback-backed.',
  },
  {
    laneKey: 'strategy-advisor-fast',
    label: 'Strategy Advisor Fast',
    hubKey: 'strategy',
    workload: 'synthesis',
    owner: 'Strategy Hub',
    provider: 'openclaw',
    authPath: 'chatgpt_subscription_gateway',
    credentialKey: 'openclaw-chatgpt-pro',
    primaryRouteKey: 'foundation-synthesis-openclaw-chatgpt',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    allowedWorkloads: ['synthesis', 'synthesis_probe'],
    monthlyBudgetUsd: 40,
    pacing: 'operator-triggered short synthesis',
    accountWindow: 'local OpenClaw ChatGPT subscription gateway',
    stopControl: {
      owner: 'Strategy Hub Owner',
      action: 'disable fast route or force API fallback',
    },
    policyPosture: 'internal_capacity_only',
    notes: 'Fast internal synthesis lane. Not a customer-facing product backend.',
  },
  {
    laneKey: 'strategy-advisor-deep',
    label: 'Strategy Advisor Deep',
    hubKey: 'strategy',
    workload: 'synthesis',
    owner: 'Strategy Hub',
    provider: 'claude_code',
    authPath: 'claude_code_subscription',
    credentialKey: 'claude-code-local-max',
    primaryRouteKey: 'foundation-synthesis-claude-code',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    allowedWorkloads: ['synthesis_probe', 'agent_probe'],
    monthlyBudgetUsd: 60,
    pacing: 'operator-approved deep run only',
    accountWindow: 'local Claude Code login window',
    stopControl: {
      owner: 'Steve',
      action: 'stop deep run, disable route, or require manual approval',
    },
    policyPosture: 'experimental_until_probe',
    notes: 'Deep internal reasoning lane. Remains warning until policy and probe status are promoted.',
  },
  {
    laneKey: 'coding-claude-code-agent',
    label: 'Claude Code / Coding Agent',
    hubKey: 'foundation',
    workload: 'agent',
    owner: 'Foundation Build Process',
    provider: 'claude_code',
    authPath: 'claude_code_subscription',
    credentialKey: 'claude-code-local-max',
    primaryRouteKey: 'foundation-agent-claude-code',
    fallbackRouteKey: 'foundation-synthesis-openai-api',
    allowedWorkloads: ['agent_probe', 'manual_interactive'],
    monthlyBudgetUsd: 0,
    pacing: 'human-approved coding sprint',
    accountWindow: 'local Claude Code login window',
    stopControl: {
      owner: 'Steve',
      action: 'stop coding session or reject ship gate',
    },
    policyPosture: 'human_supervised',
    notes: 'Coding assistant capacity is implementation tooling, not an autonomous business agent.',
  },
  {
    laneKey: 'video-vision-gemini-api',
    label: 'Video / Vision API',
    hubKey: 'foundation',
    workload: 'video_vision',
    owner: 'Build Intel / Vision Extraction',
    provider: 'gemini',
    authPath: 'gemini_api_direct',
    credentialKey: 'gemini-api-default',
    primaryRouteKey: 'foundation-video-gemini-api',
    fallbackRouteKey: null,
    allowedWorkloads: ['video_vision', 'long_context_probe'],
    monthlyBudgetUsd: 75,
    pacing: 'queued extraction with per-run cap',
    accountWindow: 'Google/Gemini API billing account',
    stopControl: {
      owner: 'Foundation Runtime',
      action: 'pause vision extraction target or disable Gemini route',
    },
    policyPosture: 'api_fallback',
    notes: 'Official API lane for video and visual extraction. No consumer subscription replacement assumed.',
  },
  {
    laneKey: 'direct-api-fallback-openai',
    label: 'Direct API Fallback',
    hubKey: 'foundation',
    workload: 'synthesis',
    owner: 'Foundation Runtime',
    provider: 'openai',
    authPath: 'api_direct',
    credentialKey: 'openai-api-default',
    primaryRouteKey: 'foundation-synthesis-openai-api',
    fallbackRouteKey: null,
    allowedWorkloads: ['synthesis', 'extraction', 'embedding', 'transcription', 'image_generation'],
    monthlyBudgetUsd: 100,
    pacing: 'fallback only unless explicitly selected',
    accountWindow: 'official OpenAI API billing account',
    stopControl: {
      owner: 'Foundation Runtime',
      action: 'unset API fallback or lower route priority',
    },
    policyPosture: 'api_fallback',
    notes: 'Official API route for production-safe fallback when subscription/native lanes are missing or blocked.',
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

function makeFinding(laneKey, severity, check, detail) {
  return {
    laneKey,
    severity,
    check,
    detail,
  }
}

function statusFromFindings(findings = []) {
  if (findings.some(finding => finding.severity === 'red')) return 'red'
  if (findings.some(finding => finding.severity === 'yellow')) return 'yellow'
  return 'green'
}

function findProbeForLane(lane = {}, recentProbes = []) {
  const credentialKey = normalizeText(lane.credentialKey)
  return asList(recentProbes).find(probe =>
    normalizeText(probe.credentialKey) === credentialKey ||
      (
        normalizeText(probe.provider) === normalizeText(lane.provider) &&
        normalizeText(probe.authPath) === normalizeText(lane.authPath)
      )
  ) || null
}

function routeRequired(lane = {}) {
  return !lane.manualOnly && Boolean(lane.primaryRouteKey)
}

function fallbackRequired(lane = {}) {
  return !lane.manualOnly &&
    lane.policyPosture !== 'api_fallback' &&
    lane.policyPosture !== 'manual_only' &&
    Boolean(lane.primaryRouteKey)
}

function hasBudgetOrCap(lane = {}, route = null) {
  if (lane.manualOnly) return true
  if (lane.monthlyBudgetUsd != null && Number(lane.monthlyBudgetUsd) >= 0) return true
  if (lane.weeklyBudgetUsd != null && Number(lane.weeklyBudgetUsd) > 0) return true
  return route?.costCapUsd != null && Number(route.costCapUsd) >= 0
}

function evaluateLane(lane = {}, context = {}) {
  const credentialsByKey = context.credentialsByKey || new Map()
  const routesByKey = context.routesByKey || new Map()
  const recentProbes = asList(context.recentProbes)
  const findings = []
  const laneKey = normalizeText(lane.laneKey) || 'missing-lane-key'
  const credential = normalizeText(lane.credentialKey) ? credentialsByKey.get(lane.credentialKey) : null
  const route = normalizeText(lane.primaryRouteKey) ? routesByKey.get(lane.primaryRouteKey) : null
  const fallbackRoute = normalizeText(lane.fallbackRouteKey) ? routesByKey.get(lane.fallbackRouteKey) : null
  const latestProbe = findProbeForLane(lane, recentProbes)

  if (!normalizeText(lane.owner)) findings.push(makeFinding(laneKey, 'red', 'owner is named', 'lane owner missing'))
  if (!normalizeText(lane.provider) || !normalizeText(lane.authPath)) findings.push(makeFinding(laneKey, 'red', 'provider and auth path are named', 'provider/auth path missing'))
  if (!normalizeText(lane.accountWindow)) findings.push(makeFinding(laneKey, 'red', 'account window is named', 'account window missing'))
  if (!normalizeText(lane.pacing)) findings.push(makeFinding(laneKey, 'red', 'pacing rule is named', 'pacing rule missing'))
  if (!normalizeText(lane.stopControl?.owner) || !normalizeText(lane.stopControl?.action)) {
    findings.push(makeFinding(laneKey, 'red', 'stop control is named', 'stop-control owner/action missing'))
  }
  if (!hasBudgetOrCap(lane, route)) findings.push(makeFinding(laneKey, 'red', 'budget or cap exists', 'budget/cap missing'))

  if (normalizeText(lane.credentialKey) && !credential) {
    findings.push(makeFinding(laneKey, 'red', 'credential exists', `${lane.credentialKey} missing from llm_credentials`))
  }
  if (credential) {
    if (BLOCKED_CREDENTIAL_STATUSES.has(credential.status)) findings.push(makeFinding(laneKey, 'red', 'credential is usable', `credential ${credential.credentialKey} is ${credential.status}`))
    else if (WARNING_CREDENTIAL_STATUSES.has(credential.status) || !HEALTHY_CREDENTIAL_STATUSES.has(credential.status)) findings.push(makeFinding(laneKey, 'yellow', 'credential status is known', `credential ${credential.credentialKey} is ${credential.status || 'unknown'}`))
    if (BLOCKED_POLICIES.has(credential.policyClassification)) findings.push(makeFinding(laneKey, 'red', 'credential policy allows workload', `credential policy is ${credential.policyClassification}`))
    else if (WARNING_POLICIES.has(credential.policyClassification)) findings.push(makeFinding(laneKey, 'yellow', 'credential policy is promoted or explicitly experimental', `credential policy is ${credential.policyClassification}`))
  }

  if (routeRequired(lane) && !route) {
    findings.push(makeFinding(laneKey, 'red', 'primary route exists', `${lane.primaryRouteKey} missing from llm_routes`))
  }
  if (route) {
    if (normalizeText(route.credentialKey) !== normalizeText(lane.credentialKey)) {
      findings.push(makeFinding(laneKey, 'red', 'route uses expected credential', `route credential ${route.credentialKey || 'missing'} does not match ${lane.credentialKey}`))
    }
    if (normalizeText(route.provider) !== normalizeText(lane.provider) || normalizeText(route.authPath) !== normalizeText(lane.authPath)) {
      findings.push(makeFinding(laneKey, 'red', 'route uses expected provider/auth path', `${route.provider}/${route.authPath} does not match ${lane.provider}/${lane.authPath}`))
    }
    if (BLOCKED_ROUTE_STATUSES.has(route.status)) findings.push(makeFinding(laneKey, 'red', 'route is usable', `route ${route.routeKey} is ${route.status}`))
    else if (WARNING_ROUTE_STATUSES.has(route.status) || !HEALTHY_ROUTE_STATUSES.has(route.status)) findings.push(makeFinding(laneKey, 'yellow', 'route status is promoted', `route ${route.routeKey} is ${route.status || 'unknown'}`))
    if (BLOCKED_POLICIES.has(route.policyClassification)) findings.push(makeFinding(laneKey, 'red', 'route policy allows workload', `route policy is ${route.policyClassification}`))
    else if (WARNING_POLICIES.has(route.policyClassification)) findings.push(makeFinding(laneKey, 'yellow', 'route policy is promoted or explicitly experimental', `route policy is ${route.policyClassification}`))
    if (route.riskClass === 'blocked' || route.riskClass === 'high') findings.push(makeFinding(laneKey, 'red', 'route risk is acceptable', `route risk is ${route.riskClass}`))
    else if (route.riskClass === 'untested' || route.riskClass === 'medium') findings.push(makeFinding(laneKey, 'yellow', 'route risk is known', `route risk is ${route.riskClass}`))
  }

  if (fallbackRequired(lane) && !normalizeText(lane.fallbackRouteKey)) {
    findings.push(makeFinding(laneKey, 'red', 'fallback route is named', 'fallback route missing'))
  } else if (fallbackRequired(lane) && !fallbackRoute) {
    findings.push(makeFinding(laneKey, 'red', 'fallback route exists', `${lane.fallbackRouteKey} missing from llm_routes`))
  }
  if (fallbackRoute && BLOCKED_ROUTE_STATUSES.has(fallbackRoute.status)) {
    findings.push(makeFinding(laneKey, 'yellow', 'fallback route is not blocked', `fallback ${fallbackRoute.routeKey} is ${fallbackRoute.status}`))
  }

  if (!lane.manualOnly && !latestProbe) {
    findings.push(makeFinding(laneKey, 'yellow', 'recent probe evidence exists', 'no recent probe found for lane credential/provider'))
  } else if (latestProbe && latestProbe.status === 'failed') {
    findings.push(makeFinding(laneKey, 'yellow', 'latest probe did not fail', `latest probe ${latestProbe.probeId || ''} failed`))
  }

  const status = statusFromFindings(findings)
  return {
    ...lane,
    status,
    statusLabel: status === 'green' ? 'Ready' : status === 'yellow' ? 'Needs review' : 'Blocked',
    credentialStatus: credential?.status || null,
    routeStatus: route?.status || null,
    fallbackRouteStatus: fallbackRoute?.status || null,
    latestProbeStatus: latestProbe?.status || null,
    latestProbeAt: latestProbe?.probedAt || null,
    findings,
  }
}

export function evaluateLlmHubCapacityLanes({
  lanes = LLM_HUB_CAPACITY_LANE_DEFINITIONS,
  credentials = [],
  routes = [],
  recentProbes = [],
} = {}) {
  const credentialsByKey = new Map(asList(credentials).map(item => [item.credentialKey, item]))
  const routesByKey = new Map(asList(routes).map(item => [item.routeKey, item]))
  const evaluated = asList(lanes).map(lane => evaluateLane(lane, { credentialsByKey, routesByKey, recentProbes }))
  const findings = evaluated.flatMap(lane => lane.findings)
  const summary = {
    laneCount: evaluated.length,
    greenLanes: evaluated.filter(lane => lane.status === 'green').length,
    yellowLanes: evaluated.filter(lane => lane.status === 'yellow').length,
    redLanes: evaluated.filter(lane => lane.status === 'red').length,
    policyReady: evaluated.filter(lane => lane.status !== 'red').length,
    blockedFindings: findings.filter(finding => finding.severity === 'red').length,
    reviewFindings: findings.filter(finding => finding.severity === 'yellow').length,
  }
  return {
    ok: summary.redLanes === 0,
    summary,
    lanes: evaluated,
    findings,
  }
}

export function buildLlmHubCapacitySnapshot(llmRuntime = {}) {
  return evaluateLlmHubCapacityLanes({
    credentials: llmRuntime.credentials,
    routes: llmRuntime.routes,
    recentProbes: llmRuntime.recentProbes,
  })
}

function makeHealthyFixtureFromDefinitions() {
  const credentialsByKey = new Map()
  const routesByKey = new Map()
  for (const lane of LLM_HUB_CAPACITY_LANE_DEFINITIONS) {
    if (lane.credentialKey && !credentialsByKey.has(lane.credentialKey)) {
      credentialsByKey.set(lane.credentialKey, {
        credentialKey: lane.credentialKey,
        provider: lane.provider,
        authPath: lane.authPath,
        hubKey: lane.hubKey,
        workloadLane: lane.workload,
        status: 'available',
        policyClassification: lane.manualOnly ? 'manual_only' : lane.policyPosture === 'api_fallback' ? 'api_fallback' : 'allowed',
        allowedWorkloads: lane.allowedWorkloads,
      })
    }
    if (lane.primaryRouteKey) {
      routesByKey.set(lane.primaryRouteKey, {
        routeKey: lane.primaryRouteKey,
        workload: lane.workload,
        hubKey: lane.hubKey,
        provider: lane.provider,
        authPath: lane.authPath,
        credentialKey: lane.credentialKey,
        fallbackRouteKey: lane.fallbackRouteKey,
        status: 'available',
        policyClassification: lane.policyPosture === 'api_fallback' ? 'api_fallback' : 'allowed',
        riskClass: 'low',
      })
    }
    if (lane.fallbackRouteKey && !routesByKey.has(lane.fallbackRouteKey)) {
      routesByKey.set(lane.fallbackRouteKey, {
        routeKey: lane.fallbackRouteKey,
        workload: lane.workload,
        hubKey: 'foundation',
        provider: 'openai',
        authPath: 'api_direct',
        credentialKey: 'openai-api-default',
        fallbackRouteKey: null,
        status: 'available',
        policyClassification: 'api_fallback',
        riskClass: 'low',
      })
    }
  }
  return {
    credentials: [...credentialsByKey.values()],
    routes: [...routesByKey.values()],
    recentProbes: LLM_HUB_CAPACITY_LANE_DEFINITIONS
      .filter(lane => !lane.manualOnly)
      .map(lane => ({
        probeId: `probe-${lane.laneKey}`,
        credentialKey: lane.credentialKey,
        provider: lane.provider,
        authPath: lane.authPath,
        probeType: `${lane.workload}_probe`,
        status: 'passed',
        probedAt: '2026-05-17T01:00:00.000Z',
      })),
  }
}

export function buildLlmHubCapacityDogfoodProof() {
  const healthyFixture = makeHealthyFixtureFromDefinitions()
  const healthy = evaluateLlmHubCapacityLanes(healthyFixture)
  const baseLane = LLM_HUB_CAPACITY_LANE_DEFINITIONS.find(lane => lane.laneKey === 'foundation-system-worker-extraction')
  const breakLane = patch => [{ ...baseLane, ...patch }]
  const rejected = {
    missingOwner: evaluateLlmHubCapacityLanes({ ...healthyFixture, lanes: breakLane({ owner: '' }) }).ok === false,
    missingBudget: evaluateLlmHubCapacityLanes({ ...healthyFixture, lanes: breakLane({ monthlyBudgetUsd: null, weeklyBudgetUsd: null }) }).ok === false,
    missingStopControl: evaluateLlmHubCapacityLanes({ ...healthyFixture, lanes: breakLane({ stopControl: { owner: '', action: '' } }) }).ok === false,
    missingRoute: evaluateLlmHubCapacityLanes({ ...healthyFixture, lanes: breakLane({ primaryRouteKey: 'missing-route' }) }).ok === false,
    missingCredential: evaluateLlmHubCapacityLanes({ ...healthyFixture, lanes: breakLane({ credentialKey: 'missing-credential' }) }).ok === false,
    missingFallback: evaluateLlmHubCapacityLanes({ ...healthyFixture, lanes: breakLane({ fallbackRouteKey: '' }) }).ok === false,
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(Boolean),
    healthySummary: healthy.summary,
    rejected,
    invariant: 'Capacity lanes pass only when owner, budget/cap, stop control, credential/route linkage, and fallback policy are present.',
  }
}
