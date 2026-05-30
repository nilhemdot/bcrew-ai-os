import crypto from 'node:crypto'

import {
  buildAgentCapabilityRegistry,
  evaluateAgentCapabilityRegistry,
} from './agent-capability-registry.js'
import { getFoundationJobDefinitions } from './foundation-jobs.js'
import { getFoundationSurfaceMap } from './foundation-surface-map.js'
import {
  buildFoundationUpCapabilityRegistry,
  evaluateFoundationUpCapabilityRegistry,
} from './foundation-up-capability-registry.js'
import {
  getGroupedSourceSystems,
  getSourceConnectors,
  getSourceContracts,
} from './source-contracts.js'

export const PILLAR_4_CARD_ID = 'PILLAR-4-SYSTEM-CAPABILITIES-001'
export const PILLAR_4_CLOSEOUT_KEY = 'pillar-4-system-capabilities-v1'
export const PILLAR_4_PLAN_PATH = 'docs/process/pillar-4-system-capabilities-001-plan.md'
export const PILLAR_4_APPROVAL_PATH = 'docs/process/approvals/PILLAR-4-SYSTEM-CAPABILITIES-001.json'
export const PILLAR_4_SCRIPT_PATH = 'scripts/process-pillar-4-system-capabilities-check.mjs'
export const PILLAR_4_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-pillar-4-system-capabilities-closeout.md'
export const PILLAR_4_JSON_PATH = 'docs/system-capabilities.generated.json'
export const PILLAR_4_MARKDOWN_PATH = 'docs/system-capabilities.generated.md'
export const PILLAR_4_SPRINT_ID = 'FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19'
export const PILLAR_4_NEXT_CARD_ID = 'PILLAR-5-AGENT-INVENTORY-001'

export const PILLAR_4_NOT_NEXT_BOUNDARIES = [
  'Do not hand-maintain capability truth outside the generated artifact.',
  'Do not approve runtime/provider/agent capability use in this card.',
  'Do not call providers, spend credits, launch workers, start live extraction, or mutate external systems.',
  'Do not copy private local memory, secret values, raw credentials, or token values into generated outputs.',
  'Do not build the agent inventory detail surface; that is PILLAR-5.',
  'Do not start Value Builder split.',
]

export const PILLAR_4_PROOF_COMMANDS = [
  'node --check lib/pillar-4-system-capabilities.js scripts/process-pillar-4-system-capabilities-check.mjs',
  'npm run process:pillar-4-system-capabilities-check -- --write-report --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=PILLAR-4-SYSTEM-CAPABILITIES-001 --planApprovalRef=docs/process/approvals/PILLAR-4-SYSTEM-CAPABILITIES-001.json --closeoutKey=pillar-4-system-capabilities-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=PILLAR-4-SYSTEM-CAPABILITIES-001 --closeoutKey=pillar-4-system-capabilities-v1',
  'npm run process:foundation-ship -- --card=PILLAR-4-SYSTEM-CAPABILITIES-001 --planApprovalRef=docs/process/approvals/PILLAR-4-SYSTEM-CAPABILITIES-001.json --closeoutKey=pillar-4-system-capabilities-v1 --commitRef=HEAD',
]

export const PILLAR_4_CHANGED_FILES = [
  'lib/pillar-4-system-capabilities.js',
  PILLAR_4_SCRIPT_PATH,
  PILLAR_4_JSON_PATH,
  PILLAR_4_MARKDOWN_PATH,
  PILLAR_4_PLAN_PATH,
  PILLAR_4_APPROVAL_PATH,
  PILLAR_4_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function unique(values = []) {
  return Array.from(new Set(list(values).map(text).filter(Boolean)))
}

function sha256(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function countBy(items = [], getKey) {
  const counts = {}
  for (const item of list(items)) {
    const key = text(getKey(item)) || 'unknown'
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function hasSecretValue(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed.startsWith('env:')) return false
    return /(sk-[A-Za-z0-9_-]{12,}|secret[_:-]?[A-Za-z0-9]{8,}|token[_:-]?[A-Za-z0-9]{8,}|[A-Za-z0-9+/]{48,}={0,2})/.test(trimmed)
  }
  if (Array.isArray(value)) return value.some(item => hasSecretValue(item))
  if (!value || typeof value !== 'object') return false
  return Object.values(value).some(item => hasSecretValue(item))
}

function capabilityRow(config = {}) {
  return {
    capabilityId: config.capabilityId,
    title: config.title,
    category: config.category,
    status: config.status,
    owner: config.owner || 'Foundation',
    sourceRefs: unique(config.sourceRefs),
    proofRefs: unique(config.proofRefs),
    approvalBoundary: config.approvalBoundary || {
      approvedNow: true,
      requiredBeforeUse: [],
      note: 'Generated from existing live Foundation truth.',
    },
    counts: config.counts || {},
    nextAction: config.nextAction || 'Keep generated from live truth.',
    blocking: Boolean(config.blocking),
    metadata: config.metadata || {},
  }
}

function buildSourceRows({ sourceContracts, sourceConnectors, groupedSourceSystems }) {
  return [
    capabilityRow({
      capabilityId: 'source-contract-registry',
      title: 'Source contract registry',
      category: 'source_truth',
      status: 'generated_from_source_contracts',
      owner: 'Foundation Source Truth',
      sourceRefs: ['lib/source-contracts.js:getSourceContracts'],
      proofRefs: ['process:pillar-4-system-capabilities-check', 'process:source-contract-id-reconcile-check'],
      counts: {
        sourceContracts: sourceContracts.length,
        statusCounts: countBy(sourceContracts, contract => contract.status),
        validationCounts: countBy(sourceContracts, contract => contract.validation),
      },
      nextAction: 'Use source contract IDs as capability provenance; do not treat docs or plugins as source signoff.',
    }),
    capabilityRow({
      capabilityId: 'source-connector-registry',
      title: 'Source connector registry',
      category: 'source_connectors',
      status: 'generated_from_source_contracts',
      owner: 'Foundation Source Truth',
      sourceRefs: ['lib/source-contracts.js:getSourceConnectors'],
      proofRefs: ['process:pillar-4-system-capabilities-check', 'process:source-contract-id-reconcile-check'],
      counts: {
        connectors: sourceConnectors.length,
        statusCounts: countBy(sourceConnectors, connector => connector.status),
      },
      nextAction: 'Keep connector status separate from source contract trust and extraction freshness.',
    }),
    capabilityRow({
      capabilityId: 'system-service-area-map',
      title: 'System service area map',
      category: 'source_truth',
      status: 'generated_from_grouped_source_systems',
      owner: 'Foundation Source Truth',
      sourceRefs: ['lib/source-contracts.js:getGroupedSourceSystems'],
      proofRefs: ['process:pillar-4-system-capabilities-check'],
      counts: {
        groupedSystems: groupedSourceSystems.length,
        withRuntimeJobs: groupedSourceSystems.filter(system => list(system.runtimeJobKeys).length).length,
        withConnectors: groupedSourceSystems.filter(system => list(system.connectorIds).length).length,
      },
      nextAction: 'Use grouped source systems to show which service areas have source, connector, and job coverage.',
    }),
  ]
}

function buildSurfaceRows({ surfaceMap }) {
  const apiRefs = unique(surfaceMap.flatMap(surface => surface.backingApis || []))
  return [
    capabilityRow({
      capabilityId: 'foundation-surface-map',
      title: 'Foundation surface and route inventory',
      category: 'operator_surface',
      status: 'generated_from_surface_map',
      owner: 'Foundation UI / Control Plane',
      sourceRefs: ['lib/foundation-surface-map.js:getFoundationSurfaceMap'],
      proofRefs: ['process:pillar-4-system-capabilities-check', 'process:frontend-system-inventory-renderers-split-check'],
      counts: {
        surfaces: surfaceMap.length,
        topLevelSurfaces: surfaceMap.filter(surface => surface.surfaceType === 'page').length,
        subSurfaces: surfaceMap.filter(surface => surface.surfaceType === 'sub-surface').length,
        backingApis: apiRefs.length,
      },
      nextAction: 'Capabilities must stay tied to served surfaces and backing APIs instead of stale markdown claims.',
    }),
  ]
}

function buildJobRows({ jobs }) {
  return [
    capabilityRow({
      capabilityId: 'foundation-job-definitions',
      title: 'Foundation governed job definitions',
      category: 'runtime_jobs',
      status: 'generated_from_job_definitions',
      owner: 'Foundation Runtime',
      sourceRefs: ['lib/foundation-jobs.js:getFoundationJobDefinitions'],
      proofRefs: ['process:pillar-4-system-capabilities-check', 'process:foundation-operating-reliability-check'],
      counts: {
        jobs: jobs.length,
        runtimeModes: countBy(jobs, job => job.runtimeMode),
        lanes: countBy(jobs, job => job.lane),
        jobTypes: countBy(jobs, job => job.jobType),
      },
      nextAction: 'Use governed job definitions and ledgers for runtime capability truth; do not infer from chat.',
    }),
  ]
}

function buildRuntimeRows({ systemInventory }) {
  const skills = list(systemInventory.skills)
  const plugins = list(systemInventory.plugins)
  const identity = systemInventory.identity || {}
  const docs = systemInventory.docs || {}
  return [
    capabilityRow({
      capabilityId: 'runtime-skills-inventory',
      title: 'Runtime skills inventory',
      category: 'runtime_capabilities',
      status: skills.length ? 'generated_from_system_inventory_api' : 'review',
      owner: 'Foundation Runtime',
      sourceRefs: ['/api/system-inventory:skills'],
      proofRefs: ['process:pillar-4-system-capabilities-check', 'process:foundation-identity-check'],
      counts: {
        skills: skills.length,
        workspaceSkills: skills.filter(skill => skill.scope === 'Workspace skill').length,
        systemSkills: skills.filter(skill => skill.scope === 'System skill').length,
      },
      approvalBoundary: {
        approvedNow: true,
        requiredBeforeUse: [],
        note: 'Skills are runtime guidance capabilities, not source-truth signoff.',
      },
      nextAction: 'Keep skill inventory generated from local runtime discovery.',
    }),
    capabilityRow({
      capabilityId: 'runtime-plugin-inventory',
      title: 'Runtime plugins and MCP inventory',
      category: 'runtime_capabilities',
      status: plugins.length ? 'generated_from_system_inventory_api' : 'review',
      owner: 'Foundation Runtime',
      sourceRefs: ['/api/system-inventory:plugins'],
      proofRefs: ['process:pillar-4-system-capabilities-check', 'process:foundation-identity-check'],
      counts: {
        plugins: plugins.length,
        pluginSkills: plugins.reduce((total, plugin) => total + Number(plugin.skillCount || 0), 0),
      },
      approvalBoundary: {
        approvedNow: true,
        requiredBeforeUse: ['separate source-contract signoff before treating plugin data as business truth'],
        note: 'Installed plugins are runtime capabilities only.',
      },
      nextAction: 'Keep plugin state separated from source-truth and external-write approval.',
    }),
    capabilityRow({
      capabilityId: 'workspace-identity-boundary',
      title: 'Workspace identity and private-memory boundary',
      category: 'privacy_boundary',
      status: identity.status || 'unknown',
      owner: 'Foundation Privacy',
      sourceRefs: ['/api/system-inventory:identity', 'lib/foundation-identity-surface.js'],
      proofRefs: ['process:pillar-4-system-capabilities-check', 'process:foundation-identity-check'],
      counts: {
        trackedDocs: list(docs.tracked).length,
        privateLocalDocs: list(docs.privateLocal).length,
      },
      approvalBoundary: {
        approvedNow: true,
        requiredBeforeUse: [],
        note: 'Private local files stay metadata-only in shared generated outputs.',
      },
      nextAction: 'Preserve metadata-only private boundary while generating operator capability truth.',
    }),
  ]
}

function buildProviderRows({ providerRegistry }) {
  return list(providerRegistry.capabilities).map(capability => capabilityRow({
    capabilityId: `provider-tool:${capability.capabilityId}`,
    title: `${capability.provider} ${capability.toolKind}`,
    category: 'provider_tool_capability',
    status: capability.status || 'registered_blocked',
    owner: capability.owner,
    sourceRefs: ['lib/foundation-up-capability-registry.js:buildFoundationUpCapabilityRegistry', providerRegistry.cardId],
    proofRefs: ['process:pillar-4-system-capabilities-check', 'process:foundation-up-capability-registry-check'],
    counts: {
      envRefs: list(capability.envRefs).length,
      allowedCallModes: list(capability.allowedCallModes).length,
    },
    approvalBoundary: {
      approvedNow: capability.approvalBoundary?.approvedNow === true,
      requiredBeforeUse: list(capability.approvalBoundary?.requiredBeforeUse),
      note: capability.runtimeUseApprovedByThisCard === true
        ? 'Runtime use was approved by source registry.'
        : 'Registered only; runtime use remains blocked pending separate approval.',
    },
    nextAction: 'Do not call provider/tool capability until a separate approval card grants runtime use.',
    metadata: {
      permissionClass: capability.permissionClass,
      externalMutationApproved: capability.externalMutationApproved === true,
      runtimeUseApprovedByThisCard: capability.runtimeUseApprovedByThisCard === true,
      agentUseApprovedByThisCard: capability.agentUseApprovedByThisCard === true,
    },
  }))
}

function buildAgentRows({ agentRegistry }) {
  return [
    capabilityRow({
      capabilityId: 'agent-capability-registry',
      title: 'Agent capability registry',
      category: 'agent_capability',
      status: agentRegistry.readOnlyRegistry === true ? 'read_only_declared' : 'review',
      owner: 'Foundation Agent Runtime',
      sourceRefs: ['lib/agent-capability-registry.js:buildAgentCapabilityRegistry', agentRegistry.cardId],
      proofRefs: ['process:pillar-4-system-capabilities-check', 'process:agent-capability-registry-check'],
      counts: {
        agents: list(agentRegistry.agents).length,
        capabilities: list(agentRegistry.capabilities).length,
        claims: list(agentRegistry.claims).length,
      },
      approvalBoundary: {
        approvedNow: agentRegistry.liveAgentRuntimeStarted === true,
        requiredBeforeUse: ['PILLAR-5 agent inventory', 'agent runtime template', 'explicit runtime approval before side effects'],
        note: 'Agent capability rows are declarations, not live agent runtime approval.',
      },
      nextAction: 'Use PILLAR-5 to generate the detailed agent inventory from this registry and old-system audit truth.',
      metadata: {
        liveAgentRuntimeStarted: agentRegistry.liveAgentRuntimeStarted === true,
        externalWritesStarted: agentRegistry.externalWritesStarted === true,
      },
    }),
  ]
}

export function buildPillar4SystemCapabilitiesSnapshot({
  systemInventory = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const groupedSourceSystems = getGroupedSourceSystems()
  const surfaceMap = getFoundationSurfaceMap()
  const jobs = getFoundationJobDefinitions()
  const providerRegistry = buildFoundationUpCapabilityRegistry()
  const agentRegistry = buildAgentCapabilityRegistry()
  const providerRegistryEvaluation = evaluateFoundationUpCapabilityRegistry(providerRegistry)
  const agentRegistryEvaluation = evaluateAgentCapabilityRegistry(agentRegistry)
  const capabilities = [
    ...buildSourceRows({ sourceContracts, sourceConnectors, groupedSourceSystems }),
    ...buildSurfaceRows({ surfaceMap }),
    ...buildJobRows({ jobs }),
    ...buildRuntimeRows({ systemInventory }),
    ...buildProviderRows({ providerRegistry }),
    ...buildAgentRows({ agentRegistry }),
  ]

  return {
    schemaVersion: 1,
    cardId: PILLAR_4_CARD_ID,
    closeoutKey: PILLAR_4_CLOSEOUT_KEY,
    generatedAt,
    sourceMaterial: {
      apiRoutes: ['/api/system-inventory'],
      modules: [
        'lib/source-contracts.js',
        'lib/foundation-surface-map.js',
        'lib/foundation-jobs.js',
        'lib/foundation-up-capability-registry.js',
        'lib/agent-capability-registry.js',
      ],
      existingCloseoutKeys: [
        'foundation-up-capability-registry-v1',
        'agent-capability-registry-v1',
        'foundation-identity-surface-v1',
      ],
    },
    summary: {
      capabilityRows: capabilities.length,
      sourceContracts: sourceContracts.length,
      sourceConnectors: sourceConnectors.length,
      groupedSourceSystems: groupedSourceSystems.length,
      surfaces: surfaceMap.length,
      backingApis: unique(surfaceMap.flatMap(surface => surface.backingApis || [])).length,
      jobs: jobs.length,
      skills: list(systemInventory.skills).length,
      plugins: list(systemInventory.plugins).length,
      providerToolCapabilities: list(providerRegistry.capabilities).length,
      agentCapabilityRows: list(agentRegistry.capabilities).length,
      blockedProviderRows: capabilities.filter(row => row.category === 'provider_tool_capability' && row.approvalBoundary?.approvedNow !== true).length,
    },
    boundaries: {
      generatedFromLiveTruth: true,
      sourceIdsRequired: true,
      providerUseApprovedByThisCard: false,
      agentRuntimeApprovedByThisCard: false,
      externalMutationApprovedByThisCard: false,
      privateLocalContentCopied: false,
      secretValuesStored: false,
      notNext: PILLAR_4_NOT_NEXT_BOUNDARIES,
    },
    registryEvaluations: {
      providerRegistry: {
        ok: providerRegistryEvaluation.ok,
        status: providerRegistryEvaluation.status,
        summary: providerRegistryEvaluation.summary,
      },
      agentRegistry: {
        ok: agentRegistryEvaluation.ok,
        status: agentRegistryEvaluation.status,
        summary: agentRegistryEvaluation.summary,
      },
    },
    capabilities,
    contentSha256: sha256(JSON.stringify({
      summary: capabilities.map(row => [row.capabilityId, row.status, row.sourceRefs, row.proofRefs]),
      sourceMaterial: [
        sourceContracts.length,
        sourceConnectors.length,
        groupedSourceSystems.length,
        surfaceMap.length,
        jobs.length,
        list(systemInventory.skills).length,
        list(systemInventory.plugins).length,
      ],
    })),
  }
}

export function evaluatePillar4SystemCapabilitiesSnapshot(snapshot = {}) {
  const checks = []
  const capabilities = list(snapshot.capabilities)
  addCheck(checks, snapshot.schemaVersion === 1, 'schema version is current', String(snapshot.schemaVersion || 'missing'))
  addCheck(checks, snapshot.cardId === PILLAR_4_CARD_ID, 'snapshot card id is PILLAR-4', snapshot.cardId || 'missing')
  addCheck(checks, snapshot.boundaries?.generatedFromLiveTruth === true, 'snapshot declares generated-from-live-truth boundary', '')
  addCheck(checks, snapshot.boundaries?.privateLocalContentCopied === false, 'private local content is not copied', '')
  addCheck(checks, snapshot.boundaries?.providerUseApprovedByThisCard === false, 'provider runtime use remains blocked by this card', '')
  addCheck(checks, snapshot.boundaries?.agentRuntimeApprovedByThisCard === false, 'agent runtime use remains blocked by this card', '')
  addCheck(checks, snapshot.boundaries?.externalMutationApprovedByThisCard === false, 'external mutation remains blocked by this card', '')
  addCheck(checks, snapshot.summary?.sourceContracts >= 20, 'source contract count is generated from live registry', String(snapshot.summary?.sourceContracts || 0))
  addCheck(checks, snapshot.summary?.surfaces >= 20, 'surface map count is generated from live registry', String(snapshot.summary?.surfaces || 0))
  addCheck(checks, snapshot.summary?.jobs >= 10, 'job definition count is generated from live registry', String(snapshot.summary?.jobs || 0))
  addCheck(checks, snapshot.summary?.skills >= 1, 'runtime skills are included from /api/system-inventory', String(snapshot.summary?.skills || 0))
  addCheck(checks, snapshot.summary?.plugins >= 1, 'runtime plugins are included from /api/system-inventory', String(snapshot.summary?.plugins || 0))
  addCheck(checks, snapshot.registryEvaluations?.providerRegistry?.ok === true, 'provider/tool registry evaluates healthy', snapshot.registryEvaluations?.providerRegistry?.status || 'missing')
  addCheck(checks, snapshot.registryEvaluations?.agentRegistry?.ok === true, 'agent capability registry evaluates healthy', snapshot.registryEvaluations?.agentRegistry?.status || 'missing')
  addCheck(checks, capabilities.length >= 10, 'capability rows are present', String(capabilities.length))
  for (const row of capabilities) {
    const subject = row.capabilityId || 'missing-capability-id'
    addCheck(checks, Boolean(text(row.capabilityId)), `${subject} has capability id`, '')
    addCheck(checks, Boolean(text(row.title)), `${subject} has title`, '')
    addCheck(checks, Boolean(text(row.category)), `${subject} has category`, '')
    addCheck(checks, Boolean(text(row.status)), `${subject} has status`, '')
    addCheck(checks, Boolean(text(row.owner)), `${subject} has owner`, '')
    addCheck(checks, list(row.sourceRefs).length > 0, `${subject} has source refs`, list(row.sourceRefs).join(', '))
    addCheck(checks, list(row.proofRefs).length > 0, `${subject} has proof refs`, list(row.proofRefs).join(', '))
    addCheck(checks, row.approvalBoundary && typeof row.approvalBoundary === 'object', `${subject} has approval boundary`, '')
    if (row.category === 'provider_tool_capability') {
      addCheck(checks, row.approvalBoundary?.approvedNow !== true, `${subject} does not over-claim provider runtime approval`, row.status)
    }
    addCheck(checks, row.metadata?.externalMutationApproved !== true, `${subject} does not claim external mutation approval`, '')
    addCheck(checks, !hasSecretValue(row), `${subject} contains no secret values`, '')
  }
  const ids = capabilities.map(row => row.capabilityId)
  for (const requiredId of [
    'source-contract-registry',
    'source-connector-registry',
    'foundation-surface-map',
    'foundation-job-definitions',
    'runtime-skills-inventory',
    'runtime-plugin-inventory',
    'workspace-identity-boundary',
    'agent-capability-registry',
  ]) {
    addCheck(checks, ids.includes(requiredId), `required capability row exists: ${requiredId}`, '')
  }
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    checks,
    failed,
    summary: {
      checkCount: checks.length,
      failedCount: failed.length,
      capabilityRows: capabilities.length,
    },
  }
}

export function buildPillar4SystemCapabilitiesDogfoodProof() {
  const healthy = buildPillar4SystemCapabilitiesSnapshot({
    systemInventory: {
      skills: [{ id: 'bcrew-foundation', scope: 'Workspace skill' }],
      plugins: [{ id: 'github', skillCount: 1 }],
      identity: { status: 'healthy' },
      docs: { tracked: [{}], privateLocal: [{}] },
    },
    generatedAt: '2026-05-19T00:00:00.000Z',
  })
  const missingSourceRef = JSON.parse(JSON.stringify(healthy))
  missingSourceRef.capabilities[0].sourceRefs = []
  const providerOverClaim = JSON.parse(JSON.stringify(healthy))
  const providerRow = providerOverClaim.capabilities.find(row => row.category === 'provider_tool_capability')
  providerRow.approvalBoundary.approvedNow = true
  const secretLeak = JSON.parse(JSON.stringify(healthy))
  secretLeak.capabilities[0].metadata.leakedValue = 'secret_valuetestsynthetic'
  const externalMutationClaim = JSON.parse(JSON.stringify(healthy))
  externalMutationClaim.capabilities[0].metadata.externalMutationApproved = true
  const noSkills = JSON.parse(JSON.stringify(healthy))
  noSkills.summary.skills = 0

  return {
    ok: evaluatePillar4SystemCapabilitiesSnapshot(healthy).ok === true &&
      evaluatePillar4SystemCapabilitiesSnapshot(missingSourceRef).ok === false &&
      evaluatePillar4SystemCapabilitiesSnapshot(providerOverClaim).ok === false &&
      evaluatePillar4SystemCapabilitiesSnapshot(secretLeak).ok === false &&
      evaluatePillar4SystemCapabilitiesSnapshot(externalMutationClaim).ok === false &&
      evaluatePillar4SystemCapabilitiesSnapshot(noSkills).ok === false,
    invariant: 'Generated capability truth passes; source-less rows, provider over-claiming, secret leakage, external mutation claims, and missing runtime inventory fail closed.',
  }
}

export function buildPillar4SystemCapabilitiesJson(snapshot = buildPillar4SystemCapabilitiesSnapshot()) {
  return `${JSON.stringify(snapshot, null, 2)}\n`
}

export function buildPillar4SystemCapabilitiesMarkdown(snapshot = buildPillar4SystemCapabilitiesSnapshot()) {
  const lines = []
  lines.push('# System Capabilities')
  lines.push('')
  lines.push('Generated artifact. Do not hand-edit capability truth here; regenerate through `process:pillar-4-system-capabilities-check`.')
  lines.push('')
  lines.push(`Generated at: ${snapshot.generatedAt}`)
  lines.push(`Card: ${snapshot.cardId}`)
  lines.push(`Closeout: ${snapshot.closeoutKey}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Capability rows: ${snapshot.summary.capabilityRows}`)
  lines.push(`- Source contracts: ${snapshot.summary.sourceContracts}`)
  lines.push(`- Source connectors: ${snapshot.summary.sourceConnectors}`)
  lines.push(`- Foundation surfaces: ${snapshot.summary.surfaces}`)
  lines.push(`- Backing APIs: ${snapshot.summary.backingApis}`)
  lines.push(`- Governed jobs: ${snapshot.summary.jobs}`)
  lines.push(`- Runtime skills: ${snapshot.summary.skills}`)
  lines.push(`- Runtime plugins: ${snapshot.summary.plugins}`)
  lines.push(`- Provider/tool capabilities registered but blocked: ${snapshot.summary.blockedProviderRows}`)
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  lines.push('- Generated from source contracts, surface map, job definitions, `/api/system-inventory`, provider/tool registry, and agent capability registry.')
  lines.push('- Provider/tool registration does not approve runtime use.')
  lines.push('- Agent capability declaration does not approve live agent runtime.')
  lines.push('- Runtime plugins are capabilities, not source-truth signoff.')
  lines.push('- Private local memory remains metadata-only and is not copied into this artifact.')
  lines.push('')
  lines.push('## Capability Rows')
  lines.push('')
  lines.push('| Capability | Category | Status | Owner | Source Refs | Next Action |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (const row of snapshot.capabilities) {
    lines.push(`| ${row.title} | ${row.category} | ${row.status} | ${row.owner} | ${row.sourceRefs.join('<br>')} | ${row.nextAction} |`)
  }
  lines.push('')
  lines.push('## Not Next')
  lines.push('')
  for (const boundary of PILLAR_4_NOT_NEXT_BOUNDARIES) {
    lines.push(`- ${boundary}`)
  }
  lines.push('')
  return `${lines.join('\n')}`
}
