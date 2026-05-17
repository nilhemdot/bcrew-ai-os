export const AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID = 'AIOS-RUNTIME-PORTABILITY-GATE-001'
export const AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY = 'aios-runtime-portability-gate-v1'
export const AIOS_RUNTIME_PORTABILITY_GATE_PLAN_PATH = 'docs/process/aios-runtime-portability-gate-001-plan.md'
export const AIOS_RUNTIME_PORTABILITY_GATE_APPROVAL_PATH = 'docs/process/approvals/AIOS-RUNTIME-PORTABILITY-GATE-001.json'
export const AIOS_RUNTIME_PORTABILITY_GATE_SCRIPT_PATH = 'scripts/process-aios-runtime-portability-gate-check.mjs'
export const AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_PATH = 'docs/handoffs/2026-05-17-aios-runtime-portability-gate-closeout.md'
export const AIOS_RUNTIME_PORTABILITY_GATE_SPRINT_ID = 'aios-runtime-portability-gate-2026-05-17'

export const AIOS_RUNTIME_PORTABILITY_GATE_CHANGED_FILES = [
  'lib/aios-runtime-portability-gate.js',
  'scripts/process-aios-runtime-portability-gate-check.mjs',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-hub-backlog-contract.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'docs/process/aios-runtime-portability-gate-001-plan.md',
  'docs/process/approvals/AIOS-RUNTIME-PORTABILITY-GATE-001.json',
  'docs/handoffs/2026-05-17-aios-runtime-portability-gate-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const AIOS_RUNTIME_PORTABILITY_GATE_PROOF_COMMANDS = [
  'node --check lib/aios-runtime-portability-gate.js lib/foundation-runtime-reliability-verifier.js scripts/process-aios-runtime-portability-gate-check.mjs scripts/foundation-verify.mjs',
  'npm run process:aios-runtime-portability-gate-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:ship-check -- --card=AIOS-RUNTIME-PORTABILITY-GATE-001 --planApprovalRef=docs/process/approvals/AIOS-RUNTIME-PORTABILITY-GATE-001.json --closeoutKey=aios-runtime-portability-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=AIOS-RUNTIME-PORTABILITY-GATE-001 --closeoutKey=aios-runtime-portability-gate-v1',
  'npm run process:foundation-ship -- --card=AIOS-RUNTIME-PORTABILITY-GATE-001 --planApprovalRef=docs/process/approvals/AIOS-RUNTIME-PORTABILITY-GATE-001.json --closeoutKey=aios-runtime-portability-gate-v1 --commitRef=HEAD',
]

export const AIOS_RUNTIME_PORTABILITY_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No auth-required or paid run.',
  'No provider/model probe.',
  'No connector/OAuth repair.',
  'No runtime adapter install.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
  'Do not mutate Google Drive permissions.',
  'No live Agent Feedback auto-send.',
]

export const AIOS_RUNTIME_PORTABILITY_REQUIRED_AREAS = [
  'identity',
  'tools',
  'permissions',
  'model_provider_route',
  'auth_posture',
  'cost_policy',
  'logs_transcripts',
  'source_truth_boundary',
  'fallback_brain',
  'adapter_ownership',
]

const REQUIRED_ADAPTER_FAMILIES = [
  'claude',
  'codex',
  'openclaw',
  'openhuman',
  'higgsfield',
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function addViolation(violations, runtimeId, ruleId, detail = '') {
  violations.push({ runtimeId: runtimeId || 'missing-runtime-id', ruleId, detail })
}

function hasNonEmptyString(value) {
  return text(value).length > 0
}

function hasRequiredToolPolicy(tool = {}) {
  return hasNonEmptyString(tool.toolId) &&
    hasNonEmptyString(tool.permissionTier) &&
    ['read_only', 'proposal_only', 'approval_required', 'forbidden'].includes(tool.writePosture) &&
    hasNonEmptyString(tool.owner)
}

function hasRoutePolicy(route = {}) {
  return hasNonEmptyString(route.routeKey) &&
    route.routeOwner === 'Foundation' &&
    hasNonEmptyString(route.providerFamily) &&
    hasNonEmptyString(route.modelClass) &&
    hasNonEmptyString(route.authPosture) &&
    route.directProviderCallAllowed === false
}

function hasCostPolicy(costPolicy = {}) {
  return costPolicy.owner === 'Foundation' &&
    costPolicy.requiresSpendApproval === true &&
    Number.isFinite(Number(costPolicy.defaultMaxUsd)) &&
    Number(costPolicy.defaultMaxUsd) >= 0 &&
    ['none', 'manual_approval_required', 'bounded'].includes(costPolicy.paidRunPolicy)
}

function hasLogExportPolicy(logs = {}) {
  return logs.owner === 'Foundation' &&
    logs.transcriptExportRequired === true &&
    hasNonEmptyString(logs.logRoute) &&
    hasNonEmptyString(logs.retentionTier) &&
    logs.runtimeLocalOnly === false
}

function hasFallbackPolicy(fallback = {}) {
  return fallback.owner === 'Foundation' &&
    fallback.required === true &&
    hasNonEmptyString(fallback.fallbackRouteKey) &&
    hasNonEmptyString(fallback.humanEscalationOwner)
}

function healthyRuntime(runtimeId, adapterFamily, overrides = {}) {
  return {
    runtimeId,
    adapterFamily,
    runtimeRole: 'adapter',
    truthOwner: 'Foundation',
    installsRuntime: false,
    liveRunStarted: false,
    paidRunStarted: false,
    authRequiredRunStarted: false,
    directProviderCallStarted: false,
    identity: {
      owner: 'Foundation',
      agentId: `${runtimeId}-agent`,
      humanOwner: 'Steve',
      role: 'builder_adapter',
      foundationSubjectId: `foundation-agent:${runtimeId}`,
    },
    tools: [
      {
        toolId: `${runtimeId}:filesystem-read`,
        permissionTier: 'internal',
        writePosture: 'read_only',
        owner: 'Foundation',
      },
      {
        toolId: `${runtimeId}:proposal-output`,
        permissionTier: 'internal',
        writePosture: 'proposal_only',
        owner: 'Foundation',
      },
    ],
    permissions: {
      owner: 'Foundation',
      sourceContractRequired: true,
      secretAccessPolicy: 'none_by_default',
      writeRequiresApproval: true,
      externalWriteAllowed: false,
    },
    modelProviderRoute: {
      routeKey: `foundation-${adapterFamily}-adapter-route`,
      routeOwner: 'Foundation',
      providerFamily: adapterFamily,
      modelClass: 'adapter_default',
      authPosture: adapterFamily === 'openhuman' ? 'install_review_required' : 'approved_route_or_probe_required',
      directProviderCallAllowed: false,
    },
    costPolicy: {
      owner: 'Foundation',
      defaultMaxUsd: 0,
      requiresSpendApproval: true,
      paidRunPolicy: 'manual_approval_required',
    },
    logsTranscripts: {
      owner: 'Foundation',
      transcriptExportRequired: true,
      logRoute: `foundation-runtime-logs:${runtimeId}`,
      retentionTier: 'internal',
      runtimeLocalOnly: false,
    },
    sourceTruthBoundary: {
      owner: 'Foundation',
      sourceContractsOwnedByRuntime: false,
      compiledKnowledgeOwnedByRuntime: false,
      mayWriteSourceTruth: false,
      mayAnswerCurrentStatusWithoutLiveTruth: false,
    },
    fallbackBrain: {
      owner: 'Foundation',
      required: true,
      fallbackRouteKey: 'foundation-human-or-safe-model-fallback',
      humanEscalationOwner: 'Steve',
    },
    ...overrides,
  }
}

export function buildAiosRuntimePortabilityGate(overrides = {}) {
  return {
    cardId: AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
    closeoutKey: AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    proposalOnly: true,
    implementationStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    requiredAreas: AIOS_RUNTIME_PORTABILITY_REQUIRED_AREAS,
    adapterFamilies: REQUIRED_ADAPTER_FAMILIES,
    runtimes: REQUIRED_ADAPTER_FAMILIES.map(adapterFamily =>
      healthyRuntime(`aios-${adapterFamily}`, adapterFamily)
    ),
    notNextBoundaries: AIOS_RUNTIME_PORTABILITY_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateAiosRuntimePortabilityGate(gate = buildAiosRuntimePortabilityGate()) {
  const violations = []
  const runtimes = list(gate.runtimes)
  const adapterFamilies = new Set(runtimes.map(runtime => text(runtime.adapterFamily)))

  if (gate.ownerLayer !== 'Foundation') addViolation(violations, gate.cardId, 'foundation_owner_required', gate.ownerLayer || 'missing')
  if (gate.proposalOnly !== true) addViolation(violations, gate.cardId, 'proposal_only_required', String(gate.proposalOnly))
  if (gate.implementationStarted === true) addViolation(violations, gate.cardId, 'implementation_started', 'runtime implementation is not approved')
  if (gate.extractionStarted === true) addViolation(violations, gate.cardId, 'extraction_started', 'live extraction is not approved')
  if (gate.modelCallsStarted === true) addViolation(violations, gate.cardId, 'model_call_started', 'model calls are not approved')
  if (gate.externalWritesStarted === true) addViolation(violations, gate.cardId, 'external_write_started', 'external writes are not approved')
  if (!runtimes.length) addViolation(violations, gate.cardId, 'runtime_adapters_required', 'no runtime adapters declared')

  for (const family of REQUIRED_ADAPTER_FAMILIES) {
    if (!adapterFamilies.has(family)) addViolation(violations, gate.cardId, 'required_adapter_family_missing', family)
  }

  for (const runtime of runtimes) {
    const runtimeId = text(runtime.runtimeId)
    if (!runtimeId || !text(runtime.adapterFamily)) addViolation(violations, runtimeId, 'identity_required', 'missing runtimeId or adapterFamily')
    if (runtime.runtimeRole !== 'adapter') addViolation(violations, runtimeId, 'adapter_role_required', runtime.runtimeRole || 'missing')
    if (runtime.truthOwner !== 'Foundation') addViolation(violations, runtimeId, 'foundation_truth_owner_required', runtime.truthOwner || 'missing')
    if (runtime.installsRuntime === true) addViolation(violations, runtimeId, 'runtime_install_not_approved', 'runtime install attempted')
    if (runtime.liveRunStarted === true || runtime.paidRunStarted === true || runtime.authRequiredRunStarted === true) {
      addViolation(violations, runtimeId, 'unapproved_live_paid_or_auth_run', 'live/auth/paid run attempted')
    }
    if (runtime.directProviderCallStarted === true) addViolation(violations, runtimeId, 'direct_provider_call_started', 'direct provider call attempted')

    const identity = runtime.identity || {}
    if (identity.owner !== 'Foundation' || !text(identity.agentId) || !text(identity.role) || !text(identity.foundationSubjectId)) {
      addViolation(violations, runtimeId, 'identity_required', 'Foundation-owned identity is incomplete')
    }

    const tools = list(runtime.tools)
    if (!tools.length || !tools.every(hasRequiredToolPolicy)) {
      addViolation(violations, runtimeId, 'tool_permission_policy_required', 'tools must declare owner, tier, and write posture')
    }

    const permissions = runtime.permissions || {}
    if (permissions.owner !== 'Foundation' || permissions.sourceContractRequired !== true || permissions.writeRequiresApproval !== true || permissions.externalWriteAllowed !== false) {
      addViolation(violations, runtimeId, 'permission_contract_required', 'Foundation permission contract is incomplete')
    }

    if (!hasRoutePolicy(runtime.modelProviderRoute || {})) {
      addViolation(violations, runtimeId, 'model_provider_route_required', 'Foundation-owned model/provider route is incomplete')
    }

    if (!hasCostPolicy(runtime.costPolicy || {})) {
      addViolation(violations, runtimeId, 'cost_policy_required', 'Foundation cost policy is incomplete')
    }

    if (!hasLogExportPolicy(runtime.logsTranscripts || {})) {
      addViolation(violations, runtimeId, 'logs_transcripts_required', 'logs/transcripts export policy is incomplete')
    }

    const boundary = runtime.sourceTruthBoundary || {}
    if (boundary.owner !== 'Foundation' ||
      boundary.sourceContractsOwnedByRuntime !== false ||
      boundary.compiledKnowledgeOwnedByRuntime !== false ||
      boundary.mayWriteSourceTruth !== false ||
      boundary.mayAnswerCurrentStatusWithoutLiveTruth !== false) {
      addViolation(violations, runtimeId, 'source_truth_boundary_required', 'runtime must not own source/KB truth')
    }

    if (!hasFallbackPolicy(runtime.fallbackBrain || {})) {
      addViolation(violations, runtimeId, 'fallback_brain_required', 'Foundation fallback brain is incomplete')
    }
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: gate.cardId,
    closeoutKey: gate.closeoutKey,
    violations,
    summary: {
      runtimeCount: runtimes.length,
      adapterFamilyCount: adapterFamilies.size,
      requiredAreaCount: list(gate.requiredAreas).length,
      violationCount: violations.length,
    },
  }
}

export function buildAiosRuntimePortabilityGateDogfoodProof() {
  const healthy = evaluateAiosRuntimePortabilityGate(buildAiosRuntimePortabilityGate())
  const missingIdentity = evaluateAiosRuntimePortabilityGate(buildAiosRuntimePortabilityGate({
    runtimes: [healthyRuntime('aios-codex', 'codex', { identity: { owner: 'Foundation' } })],
  }))
  const runtimeOwnsTruth = evaluateAiosRuntimePortabilityGate(buildAiosRuntimePortabilityGate({
    runtimes: [healthyRuntime('aios-openhuman', 'openhuman', {
      truthOwner: 'OpenHuman',
      sourceTruthBoundary: {
        owner: 'OpenHuman',
        sourceContractsOwnedByRuntime: true,
        compiledKnowledgeOwnedByRuntime: true,
        mayWriteSourceTruth: true,
        mayAnswerCurrentStatusWithoutLiveTruth: true,
      },
    })],
  }))
  const missingToolPolicy = evaluateAiosRuntimePortabilityGate(buildAiosRuntimePortabilityGate({
    runtimes: [healthyRuntime('aios-claude', 'claude', { tools: [{ toolId: 'claude:raw-shell' }] })],
  }))
  const directProviderRoute = evaluateAiosRuntimePortabilityGate(buildAiosRuntimePortabilityGate({
    runtimes: [healthyRuntime('aios-codex', 'codex', {
      modelProviderRoute: {
        routeKey: 'raw-openai',
        routeOwner: 'Codex',
        providerFamily: 'openai',
        modelClass: 'frontier',
        authPosture: 'direct',
        directProviderCallAllowed: true,
      },
      directProviderCallStarted: true,
    })],
  }))
  const missingCostPolicy = evaluateAiosRuntimePortabilityGate(buildAiosRuntimePortabilityGate({
    runtimes: [healthyRuntime('aios-higgsfield', 'higgsfield', { costPolicy: { owner: 'Higgsfield' } })],
  }))
  const missingLogs = evaluateAiosRuntimePortabilityGate(buildAiosRuntimePortabilityGate({
    runtimes: [healthyRuntime('aios-openclaw', 'openclaw', { logsTranscripts: { owner: 'Foundation' } })],
  }))
  const missingFallback = evaluateAiosRuntimePortabilityGate(buildAiosRuntimePortabilityGate({
    runtimes: [healthyRuntime('aios-claude', 'claude', { fallbackBrain: { owner: 'Foundation' } })],
  }))
  const livePaidAuthRun = evaluateAiosRuntimePortabilityGate(buildAiosRuntimePortabilityGate({
    runtimes: [healthyRuntime('aios-openhuman', 'openhuman', {
      liveRunStarted: true,
      paidRunStarted: true,
      authRequiredRunStarted: true,
    })],
  }))

  return {
    ok: healthy.ok === true &&
      missingIdentity.ok === false &&
      runtimeOwnsTruth.ok === false &&
      missingToolPolicy.ok === false &&
      directProviderRoute.ok === false &&
      missingCostPolicy.ok === false &&
      missingLogs.ok === false &&
      missingFallback.ok === false &&
      livePaidAuthRun.ok === false,
    invariant: 'Foundation-owned portability passes; missing identity, runtime-owned truth, missing tools/permissions, direct model route, missing cost/log/fallback policy, and unapproved live paid/auth runs fail closed.',
    healthy,
    missingIdentityRejected: missingIdentity.ok === false,
    runtimeOwnedTruthRejected: runtimeOwnsTruth.ok === false,
    missingToolPolicyRejected: missingToolPolicy.ok === false,
    directProviderRouteRejected: directProviderRoute.ok === false,
    missingCostPolicyRejected: missingCostPolicy.ok === false,
    missingLogsRejected: missingLogs.ok === false,
    missingFallbackRejected: missingFallback.ok === false,
    livePaidAuthRunRejected: livePaidAuthRun.ok === false,
  }
}
