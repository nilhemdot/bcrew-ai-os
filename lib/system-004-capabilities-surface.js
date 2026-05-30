import fs from 'node:fs/promises'
import path from 'node:path'

export const SYSTEM_004_CARD_ID = 'SYSTEM-004'
export const SYSTEM_004_CLOSEOUT_KEY = 'system-004-live-capabilities-surface-v1'
export const SYSTEM_004_PLAN_PATH = 'docs/process/system-004-live-capabilities-surface-plan.md'
export const SYSTEM_004_APPROVAL_PATH = 'docs/process/approvals/SYSTEM-004.json'
export const SYSTEM_004_SCRIPT_PATH = 'scripts/process-system-004-capabilities-surface-check.mjs'
export const SYSTEM_004_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-system-004-live-capabilities-surface-closeout.md'
export const SYSTEM_004_SPRINT_ID = 'FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19'
export const SYSTEM_004_NEXT_CARD_ID = 'LEGACY-SYSTEM-AUDIT-001'
export const SYSTEM_004_SYSTEM_CAPABILITIES_PATH = 'docs/system-capabilities.generated.json'
export const SYSTEM_004_AGENT_INVENTORY_PATH = 'docs/agents/agent-inventory.generated.json'

export const SYSTEM_004_NOT_NEXT_BOUNDARIES = [
  'Do not approve provider/tool runtime use.',
  'Do not approve live agent runtime.',
  'Do not import old-system code or prompts.',
  'Do not launch workers, scouts, agents, model calls, extraction, or external writes.',
  'Do not mutate source systems, credentials, provider config, Drive permissions, or public exposure.',
  'Do not start Value Builder split.',
]

export const SYSTEM_004_PROOF_COMMANDS = [
  'node --check lib/system-004-capabilities-surface.js scripts/process-system-004-capabilities-surface-check.mjs public/foundation-system-inventory-renderers.js server.js',
  'npm run process:system-004-capabilities-surface-check -- --close-card --json',
  'curl -fsS http://localhost:3000/api/system-inventory | node -e "let s=\\\"\\\";process.stdin.on(\\\"data\\\",d=>s+=d);process.stdin.on(\\\"end\\\",()=>{const j=JSON.parse(s); if(!j.capabilitySurface) process.exit(1); console.log(JSON.stringify({status:j.capabilitySurface.status, rows:j.capabilitySurface.summary.capabilityRows, agents:j.capabilitySurface.summary.currentAgentCount}))})"',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=SYSTEM-004 --planApprovalRef=docs/process/approvals/SYSTEM-004.json --closeoutKey=system-004-live-capabilities-surface-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=SYSTEM-004 --closeoutKey=system-004-live-capabilities-surface-v1',
  'npm run process:foundation-ship -- --card=SYSTEM-004 --planApprovalRef=docs/process/approvals/SYSTEM-004.json --closeoutKey=system-004-live-capabilities-surface-v1 --commitRef=HEAD',
]

export const SYSTEM_004_CHANGED_FILES = [
  'lib/system-004-capabilities-surface.js',
  SYSTEM_004_SCRIPT_PATH,
  SYSTEM_004_PLAN_PATH,
  SYSTEM_004_APPROVAL_PATH,
  SYSTEM_004_CLOSEOUT_PATH,
  'server.js',
  'public/foundation-system-inventory-renderers.js',
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
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

async function readJson(repoRoot, relativePath) {
  const fullPath = path.join(repoRoot, relativePath)
  return JSON.parse(await fs.readFile(fullPath, 'utf8'))
}

function compactCapability(capability = {}) {
  return {
    capabilityId: capability.capabilityId,
    title: capability.title,
    category: capability.category,
    status: capability.status,
    owner: capability.owner,
    approvedNow: capability.approvalBoundary?.approvedNow === true,
    approvalBoundary: capability.approvalBoundary || {},
    blocking: capability.blocking === true,
    counts: capability.counts || {},
    nextAction: capability.nextAction || '',
    sourceRefs: list(capability.sourceRefs),
    proofRefs: list(capability.proofRefs),
  }
}

function compactCurrentAgent(agent = {}) {
  return {
    agentId: agent.agentId,
    displayName: agent.displayName,
    honestStatus: agent.honestStatus,
    owner: agent.owner,
    role: agent.role,
    permissionTier: agent.permissionTier,
    capabilityIds: list(agent.capabilityIds),
    runtimeApproved: agent.runtimeApproved === true,
    sourceRefs: list(agent.sourceRefs),
    proofRefs: list(agent.proofRefs),
    nextAction: agent.nextAction || '',
  }
}

function compactJob(job = {}) {
  return {
    jobKey: job.jobKey,
    title: job.title,
    runtimeMode: job.runtimeMode,
    jobType: job.jobType,
    lane: job.lane,
    priority: job.priority,
    mutationPosture: job.mutationPosture || 'inferred',
    enabled: job.enabled !== false,
    sourceRefs: list(job.sourceRefs),
    proofRefs: list(job.proofRefs),
  }
}

export function buildSystem004CapabilitiesSurfacePayload({
  systemCapabilities = {},
  agentInventory = {},
  runtimeInventory = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const capabilities = list(systemCapabilities.capabilities).map(compactCapability)
  const currentAgents = list(agentInventory.currentAgents).map(compactCurrentAgent)
  const jobs = list(agentInventory.jobs).map(compactJob)
  const legacyStatusCounts = agentInventory.summary?.legacyStatusCounts || {}
  const runtimeSkills = list(runtimeInventory.skills)
  const runtimePlugins = list(runtimeInventory.plugins)
  const blockedProviderCapabilities = capabilities.filter(row => row.category === 'provider_tool_capability' && row.approvedNow !== true)

  return {
    schemaVersion: 1,
    cardId: SYSTEM_004_CARD_ID,
    closeoutKey: SYSTEM_004_CLOSEOUT_KEY,
    generatedAt,
    status: 'healthy',
    sourceRefs: [
      SYSTEM_004_SYSTEM_CAPABILITIES_PATH,
      SYSTEM_004_AGENT_INVENTORY_PATH,
      '/api/system-inventory',
    ],
    summary: {
      capabilityRows: capabilities.length,
      capabilityCategories: countBy(capabilities, row => row.category),
      runtimeSkillCount: runtimeSkills.length,
      runtimePluginCount: runtimePlugins.length,
      currentAgentCount: currentAgents.length,
      legacyAgentEvidenceCount: Number(agentInventory.summary?.legacyAgentCount || 0),
      governedJobCount: jobs.length,
      runtimeApprovedAgentCount: Number(agentInventory.summary?.runtimeApprovedAgentCount || 0),
      blockedProviderCapabilityCount: blockedProviderCapabilities.length,
    },
    systemCapabilities: {
      cardId: systemCapabilities.cardId || null,
      closeoutKey: systemCapabilities.closeoutKey || null,
      generatedAt: systemCapabilities.generatedAt || null,
      summary: systemCapabilities.summary || {},
      capabilities,
    },
    agentInventory: {
      cardId: agentInventory.cardId || null,
      closeoutKey: agentInventory.closeoutKey || null,
      generatedAt: agentInventory.generatedAt || null,
      summary: agentInventory.summary || {},
      currentAgents,
      legacyStatusCounts,
      legacyEvidenceSample: list(agentInventory.legacyAgents).slice(0, 12).map(agent => ({
        agentId: agent.agentId,
        displayName: agent.displayName,
        sourceStatus: agent.sourceStatus,
        honestStatus: agent.honestStatus,
        role: agent.role,
        owner: agent.owner,
      })),
      jobs,
    },
    runtimeInventory: {
      skillCount: runtimeSkills.length,
      pluginCount: runtimePlugins.length,
    },
    boundaries: {
      generatedFromArtifacts: true,
      legacyAgentsAreEvidenceOnly: agentInventory.boundaries?.legacyAgentsAreEvidenceOnly === true,
      liveAgentRuntimeApprovedByThisCard: false,
      providerToolRuntimeApprovedByThisCard: false,
      externalWritesApprovedByThisCard: false,
      oldCodeImported: false,
      notNext: SYSTEM_004_NOT_NEXT_BOUNDARIES,
    },
  }
}

export async function loadSystem004CapabilitiesSurfacePayload({
  repoRoot = process.cwd(),
  runtimeInventory = {},
  generatedAt,
} = {}) {
  const [systemCapabilities, agentInventory] = await Promise.all([
    readJson(repoRoot, SYSTEM_004_SYSTEM_CAPABILITIES_PATH),
    readJson(repoRoot, SYSTEM_004_AGENT_INVENTORY_PATH),
  ])
  return buildSystem004CapabilitiesSurfacePayload({
    systemCapabilities,
    agentInventory,
    runtimeInventory,
    generatedAt,
  })
}

export function evaluateSystem004CapabilitiesSurfacePayload(payload = {}) {
  const checks = []
  const capabilities = list(payload.systemCapabilities?.capabilities)
  const currentAgents = list(payload.agentInventory?.currentAgents)
  const jobs = list(payload.agentInventory?.jobs)
  addCheck(checks, payload.schemaVersion === 1, 'schema version is current', String(payload.schemaVersion || 'missing'))
  addCheck(checks, payload.cardId === SYSTEM_004_CARD_ID, 'card id is SYSTEM-004', payload.cardId || 'missing')
  addCheck(checks, payload.status === 'healthy', 'surface reports healthy when generated truth is available', payload.status || 'missing')
  addCheck(checks, list(payload.sourceRefs).includes(SYSTEM_004_SYSTEM_CAPABILITIES_PATH), 'System Capabilities artifact is a source ref', list(payload.sourceRefs).join(', '))
  addCheck(checks, list(payload.sourceRefs).includes(SYSTEM_004_AGENT_INVENTORY_PATH), 'Agent Inventory artifact is a source ref', list(payload.sourceRefs).join(', '))
  addCheck(checks, payload.systemCapabilities?.cardId === 'PILLAR-4-SYSTEM-CAPABILITIES-001', 'Pillar 4 artifact backs capability rows', payload.systemCapabilities?.cardId || 'missing')
  addCheck(checks, payload.agentInventory?.cardId === 'PILLAR-5-AGENT-INVENTORY-001', 'Pillar 5 artifact backs agent inventory rows', payload.agentInventory?.cardId || 'missing')
  addCheck(checks, capabilities.length >= 10, 'generated capability rows are visible', String(capabilities.length))
  addCheck(checks, currentAgents.length >= 2, 'current guarded agents are visible', String(currentAgents.length))
  addCheck(checks, jobs.length >= 10, 'governed jobs are visible', String(jobs.length))
  addCheck(checks, Number(payload.summary?.legacyAgentEvidenceCount || 0) >= 80, 'old-system agent evidence is summarized', String(payload.summary?.legacyAgentEvidenceCount || 0))
  addCheck(checks, Number(payload.summary?.runtimeApprovedAgentCount || 0) === 0, 'surface does not approve runtime agents', String(payload.summary?.runtimeApprovedAgentCount || 0))
  addCheck(checks, payload.boundaries?.providerToolRuntimeApprovedByThisCard === false, 'surface does not approve provider/tool runtime', '')
  addCheck(checks, payload.boundaries?.externalWritesApprovedByThisCard === false, 'surface does not approve external writes', '')
  addCheck(checks, payload.boundaries?.legacyAgentsAreEvidenceOnly === true, 'legacy agents stay evidence-only', '')
  addCheck(checks, capabilities.some(row => row.category === 'provider_tool_capability' && row.approvedNow === false), 'blocked provider/tool rows remain visible', '')
  for (const capability of capabilities) {
    addCheck(checks, Boolean(capability.capabilityId), `${capability.title || 'capability'} has id`, '')
    addCheck(checks, list(capability.sourceRefs).length > 0, `${capability.capabilityId || 'capability'} has source refs`, '')
    addCheck(checks, list(capability.proofRefs).length > 0, `${capability.capabilityId || 'capability'} has proof refs`, '')
  }
  for (const agent of currentAgents) {
    addCheck(checks, agent.runtimeApproved !== true, `${agent.displayName || agent.agentId} remains runtime-blocked`, agent.honestStatus || '')
    addCheck(checks, list(agent.sourceRefs).length > 0, `${agent.displayName || agent.agentId} has source refs`, '')
    addCheck(checks, list(agent.proofRefs).length > 0, `${agent.displayName || agent.agentId} has proof refs`, '')
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
      currentAgents: currentAgents.length,
      jobs: jobs.length,
    },
  }
}

export function buildSystem004CapabilitiesSurfaceDogfoodProof() {
  const systemCapabilities = {
    cardId: 'PILLAR-4-SYSTEM-CAPABILITIES-001',
    closeoutKey: 'pillar-4-system-capabilities-v1',
    summary: { capabilityRows: 10 },
    capabilities: Array.from({ length: 10 }, (_, index) => ({
      capabilityId: index === 0 ? 'provider-tool:blocked' : `capability-${index}`,
      title: `Capability ${index}`,
      category: index === 0 ? 'provider_tool_capability' : 'runtime_capabilities',
      status: index === 0 ? 'registered_blocked' : 'healthy',
      owner: 'Foundation',
      approvalBoundary: { approvedNow: index !== 0 },
      sourceRefs: ['source'],
      proofRefs: ['proof'],
    })),
  }
  const agentInventory = {
    cardId: 'PILLAR-5-AGENT-INVENTORY-001',
    closeoutKey: 'pillar-5-agent-inventory-v1',
    summary: { legacyAgentCount: 80, runtimeApprovedAgentCount: 0 },
    boundaries: { legacyAgentsAreEvidenceOnly: true },
    currentAgents: [
      { agentId: 'current:harlan', displayName: 'Harlan', honestStatus: 'planned_guarded', runtimeApproved: false, sourceRefs: ['source'], proofRefs: ['proof'] },
      { agentId: 'current:crewbert', displayName: 'Crewbert', honestStatus: 'planned_guarded', runtimeApproved: false, sourceRefs: ['source'], proofRefs: ['proof'] },
    ],
    legacyAgents: [{ agentId: 'legacy:crewbert', displayName: 'Crewbert', sourceStatus: 'WORKING', honestStatus: 'legacy_claim_working_evidence_only' }],
    jobs: Array.from({ length: 10 }, (_, index) => ({ jobKey: `job-${index}`, runtimeMode: 'scheduled', sourceRefs: ['source'], proofRefs: ['proof'] })),
  }
  const healthy = buildSystem004CapabilitiesSurfacePayload({ systemCapabilities, agentInventory, generatedAt: '2026-05-19T00:00:00.000Z' })
  const missingPillar4 = JSON.parse(JSON.stringify(healthy))
  missingPillar4.systemCapabilities.cardId = 'WRONG'
  const runtimeApproved = JSON.parse(JSON.stringify(healthy))
  runtimeApproved.summary.runtimeApprovedAgentCount = 1
  runtimeApproved.agentInventory.currentAgents[0].runtimeApproved = true
  const providerApproved = JSON.parse(JSON.stringify(healthy))
  providerApproved.systemCapabilities.capabilities[0].approvedNow = true
  const noRefs = JSON.parse(JSON.stringify(healthy))
  noRefs.systemCapabilities.capabilities[0].sourceRefs = []

  return {
    ok: evaluateSystem004CapabilitiesSurfacePayload(healthy).ok === true &&
      evaluateSystem004CapabilitiesSurfacePayload(missingPillar4).ok === false &&
      evaluateSystem004CapabilitiesSurfacePayload(runtimeApproved).ok === false &&
      evaluateSystem004CapabilitiesSurfacePayload(providerApproved).ok === false &&
      evaluateSystem004CapabilitiesSurfacePayload(noRefs).ok === false,
    invariant: 'SYSTEM-004 surface passes only when generated Pillar 4/5 truth is present, runtime/provider approval stays blocked, and rows keep source/proof refs.',
  }
}
