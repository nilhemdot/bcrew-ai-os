import crypto from 'node:crypto'

import {
  buildAgentCapabilityRegistry,
  evaluateAgentCapabilityRegistry,
} from './agent-capability-registry.js'
import { getFoundationJobDefinitions } from './foundation-jobs.js'

export const PILLAR_5_CARD_ID = 'PILLAR-5-AGENT-INVENTORY-001'
export const PILLAR_5_CLOSEOUT_KEY = 'pillar-5-agent-inventory-v1'
export const PILLAR_5_PLAN_PATH = 'docs/process/pillar-5-agent-inventory-001-plan.md'
export const PILLAR_5_APPROVAL_PATH = 'docs/process/approvals/PILLAR-5-AGENT-INVENTORY-001.json'
export const PILLAR_5_SCRIPT_PATH = 'scripts/process-pillar-5-agent-inventory-check.mjs'
export const PILLAR_5_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-pillar-5-agent-inventory-closeout.md'
export const PILLAR_5_JSON_PATH = 'docs/agents/agent-inventory.generated.json'
export const PILLAR_5_MARKDOWN_PATH = 'docs/agents/agent-inventory.generated.md'
export const PILLAR_5_SPRINT_ID = 'FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19'
export const PILLAR_5_NEXT_CARD_ID = 'SYSTEM-004'

export const PILLAR_5_NOT_NEXT_BOUNDARIES = [
  'Do not launch agents, workers, scouts, or hidden subagents.',
  'Do not import old-system agent code or prompts as active runtime truth.',
  'Do not treat old-system WORKING status as current new-system runtime status.',
  'Do not copy private profile content, team emails, chat IDs, tokens, raw memories, or secret values.',
  'Do not call providers, run model calls, start extraction, mutate external systems, or approve sends.',
  'Do not build the System Capabilities UI surface; that is SYSTEM-004.',
  'Do not start Value Builder split.',
]

export const PILLAR_5_PROOF_COMMANDS = [
  'node --check lib/pillar-5-agent-inventory.js scripts/process-pillar-5-agent-inventory-check.mjs',
  'npm run process:pillar-5-agent-inventory-check -- --write-report --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=PILLAR-5-AGENT-INVENTORY-001 --planApprovalRef=docs/process/approvals/PILLAR-5-AGENT-INVENTORY-001.json --closeoutKey=pillar-5-agent-inventory-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=PILLAR-5-AGENT-INVENTORY-001 --closeoutKey=pillar-5-agent-inventory-v1',
  'npm run process:foundation-ship -- --card=PILLAR-5-AGENT-INVENTORY-001 --planApprovalRef=docs/process/approvals/PILLAR-5-AGENT-INVENTORY-001.json --closeoutKey=pillar-5-agent-inventory-v1 --commitRef=HEAD',
]

export const PILLAR_5_CHANGED_FILES = [
  'lib/pillar-5-agent-inventory.js',
  PILLAR_5_SCRIPT_PATH,
  PILLAR_5_JSON_PATH,
  PILLAR_5_MARKDOWN_PATH,
  PILLAR_5_PLAN_PATH,
  PILLAR_5_APPROVAL_PATH,
  PILLAR_5_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

const LEGACY_STATUS_MAP = {
  WORKING: 'legacy_claim_working_evidence_only',
  DEGRADED: 'legacy_degraded_evidence_only',
  PLANNED: 'planned_evidence_only',
  SHELL: 'shell_evidence_only',
  IDLE: 'idle_evidence_only',
}

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

function oldSystemAgentsFromData(oldAgentData = {}) {
  if (Array.isArray(oldAgentData)) return oldAgentData
  if (Array.isArray(oldAgentData.aiAgents)) return oldAgentData.aiAgents
  if (Array.isArray(oldAgentData.agents)) return oldAgentData.agents
  return []
}

function normalizeLegacyAgent(agent = {}) {
  const legacyStatus = text(agent.status).toUpperCase() || 'UNKNOWN'
  return {
    agentId: `legacy:${text(agent.id) || text(agent.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    displayName: text(agent.name) || text(agent.id) || 'Unknown legacy agent',
    sourceKind: 'old_system_evidence',
    sourceStatus: legacyStatus,
    honestStatus: LEGACY_STATUS_MAP[legacyStatus] || 'legacy_unknown_evidence_only',
    owner: text(agent.owner) || 'Unknown old-system owner',
    role: text(agent.role) || text(agent.subtitle) || 'Legacy agent role',
    teamRefs: unique(agent.teams || []),
    capabilitySummary: text(agent.capabilities).slice(0, 240),
    modelClaim: text(agent.model) || null,
    sourceRefs: ['~/bcrew-buddy-reference/dashboard/agent-data.json', 'docs/audits/2026-05-19-old-system-research-team-harvest.json'],
    proofRefs: ['process:pillar-5-agent-inventory-check', 'process:old-system-research-team-harvest-check'],
    runtimeApproved: false,
    evidenceOnly: true,
    nextAction: 'Use as evidence only; promote through a new source contract/capability/runtime card before use.',
  }
}

function normalizeCurrentAgent(agent = {}, capabilities = []) {
  const agentCapabilities = capabilities.filter(capability => capability.agentId === agent.agentId)
  return {
    agentId: `current:${agent.agentId}`,
    displayName: agent.displayName,
    sourceKind: 'current_foundation_registry',
    sourceStatus: agent.status,
    honestStatus: agent.status,
    owner: agent.owner,
    role: agent.role,
    purpose: agent.purpose,
    permissionTier: agent.permissionTier,
    capabilityIds: agentCapabilities.map(capability => capability.capabilityId),
    sourceRefs: ['lib/agent-capability-registry.js:buildAgentCapabilityRegistry'],
    proofRefs: ['process:pillar-5-agent-inventory-check', 'process:agent-capability-registry-check'],
    runtimeApproved: false,
    evidenceOnly: false,
    nextAction: 'Stay guarded until an explicit runtime card approves live agent operation.',
  }
}

function normalizeJob(job = {}) {
  return {
    jobKey: job.key,
    title: job.title,
    jobType: job.jobType,
    lane: job.lane,
    priority: job.priority,
    runtimeMode: job.runtimeMode,
    enabled: job.enabled !== false,
    mutationPosture: job.mutationPosture || 'inferred',
    sourceIds: list(job.sourceIds),
    command: job.command,
    args: list(job.args).join(' '),
    sourceRefs: ['lib/foundation-jobs.js:getFoundationJobDefinitions'],
    proofRefs: ['process:pillar-5-agent-inventory-check', 'process:foundation-operating-reliability-check'],
  }
}

function normalizeSkillHarvest(skill = {}) {
  return {
    skillId: text(skill.name) || text(skill.relativePath),
    relativePath: text(skill.relativePath),
    flags: unique(skill.flags || []),
    disposition: text(skill.disposition) || 'harvest',
    sourceRefs: ['docs/audits/2026-05-19-old-system-research-team-harvest.json'],
    proofRefs: ['process:pillar-5-agent-inventory-check', 'process:old-system-research-team-harvest-check'],
  }
}

export function buildPillar5AgentInventorySnapshot({
  oldAgentData = {},
  oldResearchHarvest = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const agentRegistry = buildAgentCapabilityRegistry()
  const agentRegistryEvaluation = evaluateAgentCapabilityRegistry(agentRegistry)
  const jobs = getFoundationJobDefinitions()
  const currentAgents = list(agentRegistry.agents).map(agent => normalizeCurrentAgent(agent, list(agentRegistry.capabilities)))
  const legacyAgents = oldSystemAgentsFromData(oldAgentData).map(normalizeLegacyAgent)
  const jobRows = jobs.map(normalizeJob)
  const harvestedSkills = list(oldResearchHarvest.skills).map(normalizeSkillHarvest)
  const promotedCards = list(oldResearchHarvest.promotedCards).map(card => ({
    cardId: card.cardId || card.id,
    title: card.title,
    lane: card.lane,
    priority: card.priority,
  })).filter(card => card.cardId)

  return {
    schemaVersion: 1,
    cardId: PILLAR_5_CARD_ID,
    closeoutKey: PILLAR_5_CLOSEOUT_KEY,
    generatedAt,
    sourceMaterial: {
      modules: [
        'lib/agent-capability-registry.js',
        'lib/foundation-jobs.js',
      ],
      evidenceFiles: [
        '~/bcrew-buddy-reference/dashboard/agent-data.json',
        'docs/audits/2026-05-19-old-system-research-team-harvest.json',
        'docs/agents/old-system-agent-onboarding-harvest.md',
        'docs/system-capabilities.generated.json',
      ],
      existingCloseoutKeys: [
        'agent-capability-registry-v1',
        'old-system-agent-onboarding-harvest-v1',
        'old-system-research-team-harvest-v1',
        'pillar-4-system-capabilities-v1',
      ],
    },
    summary: {
      currentAgentCount: currentAgents.length,
      currentCapabilityCount: list(agentRegistry.capabilities).length,
      legacyAgentCount: legacyAgents.length,
      harvestedSkillCount: harvestedSkills.length,
      jobCount: jobRows.length,
      scheduledJobCount: jobRows.filter(job => job.runtimeMode === 'scheduled').length,
      manualJobCount: jobRows.filter(job => job.runtimeMode === 'manual').length,
      legacyStatusCounts: countBy(legacyAgents, agent => agent.sourceStatus),
      currentStatusCounts: countBy(currentAgents, agent => agent.honestStatus),
      jobRuntimeModeCounts: countBy(jobRows, job => job.runtimeMode),
      harvestedSkillFlagCounts: countBy(harvestedSkills.flatMap(skill => skill.flags), flag => flag),
      promotedCardCount: promotedCards.length,
      runtimeApprovedAgentCount: currentAgents.concat(legacyAgents).filter(agent => agent.runtimeApproved === true).length,
    },
    boundaries: {
      generatedFromLiveTruth: true,
      legacyAgentsAreEvidenceOnly: true,
      oldCodeImported: false,
      liveAgentRuntimeApprovedByThisCard: false,
      hiddenWorkersApprovedByThisCard: false,
      modelCallsApprovedByThisCard: false,
      externalWritesApprovedByThisCard: false,
      privateProfileContentCopied: false,
      secretValuesStored: false,
      notNext: PILLAR_5_NOT_NEXT_BOUNDARIES,
    },
    registryEvaluation: {
      ok: agentRegistryEvaluation.ok,
      status: agentRegistryEvaluation.status,
      summary: agentRegistryEvaluation.summary,
    },
    currentAgents,
    legacyAgents,
    jobs: jobRows,
    harvestedSkills,
    promotedCards,
    contentSha256: sha256(JSON.stringify({
      currentAgents: currentAgents.map(agent => [agent.agentId, agent.honestStatus, agent.capabilityIds]),
      legacyAgents: legacyAgents.map(agent => [agent.agentId, agent.sourceStatus, agent.honestStatus]),
      jobs: jobRows.map(job => [job.jobKey, job.runtimeMode, job.mutationPosture]),
      harvestedSkills: harvestedSkills.map(skill => [skill.skillId, skill.flags, skill.disposition]),
    })),
  }
}

export function evaluatePillar5AgentInventorySnapshot(snapshot = {}) {
  const checks = []
  const allAgents = [...list(snapshot.currentAgents), ...list(snapshot.legacyAgents)]
  addCheck(checks, snapshot.schemaVersion === 1, 'schema version is current', String(snapshot.schemaVersion || 'missing'))
  addCheck(checks, snapshot.cardId === PILLAR_5_CARD_ID, 'snapshot card id is PILLAR-5', snapshot.cardId || 'missing')
  addCheck(checks, snapshot.boundaries?.generatedFromLiveTruth === true, 'snapshot declares generated-from-live-truth boundary', '')
  addCheck(checks, snapshot.boundaries?.legacyAgentsAreEvidenceOnly === true, 'legacy agents are evidence-only', '')
  addCheck(checks, snapshot.boundaries?.oldCodeImported === false, 'old code is not imported', '')
  addCheck(checks, snapshot.boundaries?.liveAgentRuntimeApprovedByThisCard === false, 'live agent runtime remains blocked by this card', '')
  addCheck(checks, snapshot.boundaries?.hiddenWorkersApprovedByThisCard === false, 'hidden workers remain blocked by this card', '')
  addCheck(checks, snapshot.boundaries?.modelCallsApprovedByThisCard === false, 'model calls remain blocked by this card', '')
  addCheck(checks, snapshot.boundaries?.externalWritesApprovedByThisCard === false, 'external writes remain blocked by this card', '')
  addCheck(checks, snapshot.boundaries?.privateProfileContentCopied === false, 'private profile content is not copied', '')
  addCheck(checks, snapshot.registryEvaluation?.ok === true, 'agent capability registry evaluates healthy', snapshot.registryEvaluation?.status || 'missing')
  addCheck(checks, snapshot.summary?.currentAgentCount >= 2, 'current registry agents are included', String(snapshot.summary?.currentAgentCount || 0))
  addCheck(checks, snapshot.summary?.legacyAgentCount >= 80, 'old-system agent roster is represented as evidence', String(snapshot.summary?.legacyAgentCount || 0))
  addCheck(checks, snapshot.summary?.harvestedSkillCount >= 100, 'old-system harvested skills are represented', String(snapshot.summary?.harvestedSkillCount || 0))
  addCheck(checks, snapshot.summary?.jobCount >= 10, 'Foundation governed jobs are represented', String(snapshot.summary?.jobCount || 0))
  addCheck(checks, snapshot.summary?.runtimeApprovedAgentCount === 0, 'no generated agent row is runtime-approved by this card', String(snapshot.summary?.runtimeApprovedAgentCount || 0))
  addCheck(checks, list(snapshot.sourceMaterial?.evidenceFiles).some(file => file.includes('agent-data.json')), 'old agent data evidence file is recorded', list(snapshot.sourceMaterial?.evidenceFiles).join(', '))
  addCheck(checks, list(snapshot.sourceMaterial?.existingCloseoutKeys).includes('pillar-4-system-capabilities-v1'), 'Pillar 4 closeout feeds Pillar 5', list(snapshot.sourceMaterial?.existingCloseoutKeys).join(', '))

  for (const agent of allAgents) {
    const subject = agent.agentId || 'missing-agent-id'
    addCheck(checks, Boolean(agent.agentId), `${subject} has agent id`, '')
    addCheck(checks, Boolean(agent.displayName), `${subject} has display name`, '')
    addCheck(checks, Boolean(agent.owner), `${subject} has owner`, '')
    addCheck(checks, Boolean(agent.role), `${subject} has role`, '')
    addCheck(checks, Boolean(agent.honestStatus), `${subject} has honest status`, '')
    addCheck(checks, list(agent.sourceRefs).length > 0, `${subject} has source refs`, list(agent.sourceRefs).join(', '))
    addCheck(checks, list(agent.proofRefs).length > 0, `${subject} has proof refs`, list(agent.proofRefs).join(', '))
    if (agent.sourceKind === 'old_system_evidence') {
      addCheck(checks, agent.evidenceOnly === true && agent.runtimeApproved === false, `${subject} legacy row is evidence-only`, agent.honestStatus)
      addCheck(checks, !/^WORKING$/.test(agent.honestStatus), `${subject} does not present old WORKING as live runtime status`, agent.honestStatus)
    }
    addCheck(checks, !hasSecretValue(agent), `${subject} contains no secret values`, '')
  }

  for (const job of list(snapshot.jobs)) {
    const subject = job.jobKey || 'missing-job-key'
    addCheck(checks, Boolean(job.jobKey), `${subject} has job key`, '')
    addCheck(checks, Boolean(job.runtimeMode), `${subject} has runtime mode`, '')
    addCheck(checks, list(job.sourceRefs).length > 0, `${subject} has source refs`, '')
    addCheck(checks, list(job.proofRefs).length > 0, `${subject} has proof refs`, '')
    addCheck(checks, !hasSecretValue(job), `${subject} contains no secret values`, '')
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
      agentRows: allAgents.length,
      jobs: list(snapshot.jobs).length,
    },
  }
}

export function buildPillar5AgentInventoryDogfoodProof() {
  const oldAgentData = {
    aiAgents: Array.from({ length: 80 }, (_, index) => ({
      id: `legacy-${index}`,
      name: `Legacy Agent ${index}`,
      status: index % 2 ? 'PLANNED' : 'WORKING',
      owner: 'Legacy Owner',
      role: 'Legacy role',
      teams: ['legacy'],
      capabilities: 'Evidence only capability claim.',
      model: 'Legacy model claim',
    })),
  }
  const oldResearchHarvest = {
    skills: Array.from({ length: 100 }, (_, index) => ({
      name: `legacy-skill-${index}`,
      relativePath: `skills/legacy-${index}/SKILL.md`,
      flags: ['research_or_intel'],
      disposition: 'harvest',
    })),
    promotedCards: [{ cardId: 'WEB-GODMODE-001', title: 'Governed web extractor' }],
  }
  const healthy = buildPillar5AgentInventorySnapshot({
    oldAgentData,
    oldResearchHarvest,
    generatedAt: '2026-05-19T00:00:00.000Z',
  })
  const missingSourceRefs = JSON.parse(JSON.stringify(healthy))
  missingSourceRefs.legacyAgents[0].sourceRefs = []
  const liveLegacyClaim = JSON.parse(JSON.stringify(healthy))
  liveLegacyClaim.legacyAgents[0].honestStatus = 'WORKING'
  liveLegacyClaim.legacyAgents[0].runtimeApproved = true
  const runtimeApproved = JSON.parse(JSON.stringify(healthy))
  runtimeApproved.summary.runtimeApprovedAgentCount = 1
  const oldCodeImported = JSON.parse(JSON.stringify(healthy))
  oldCodeImported.boundaries.oldCodeImported = true
  const privateLeak = JSON.parse(JSON.stringify(healthy))
  privateLeak.currentAgents[0].metadata = { token: 'secret_valuetestsynthetic' }

  return {
    ok: evaluatePillar5AgentInventorySnapshot(healthy).ok === true &&
      evaluatePillar5AgentInventorySnapshot(missingSourceRefs).ok === false &&
      evaluatePillar5AgentInventorySnapshot(liveLegacyClaim).ok === false &&
      evaluatePillar5AgentInventorySnapshot(runtimeApproved).ok === false &&
      evaluatePillar5AgentInventorySnapshot(oldCodeImported).ok === false &&
      evaluatePillar5AgentInventorySnapshot(privateLeak).ok === false,
    invariant: 'Generated agent inventory passes; source-less rows, live legacy claims, runtime approval, old-code import, and private/secret leakage fail closed.',
  }
}

export function buildPillar5AgentInventoryJson(snapshot = buildPillar5AgentInventorySnapshot()) {
  return `${JSON.stringify(snapshot, null, 2)}\n`
}

export function buildPillar5AgentInventoryMarkdown(snapshot = buildPillar5AgentInventorySnapshot()) {
  const lines = []
  lines.push('# Agent Inventory')
  lines.push('')
  lines.push('Generated artifact. Do not hand-edit agent truth here; regenerate through `process:pillar-5-agent-inventory-check`.')
  lines.push('')
  lines.push(`Generated at: ${snapshot.generatedAt}`)
  lines.push(`Card: ${snapshot.cardId}`)
  lines.push(`Closeout: ${snapshot.closeoutKey}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Current registry agents: ${snapshot.summary.currentAgentCount}`)
  lines.push(`- Current declared capabilities: ${snapshot.summary.currentCapabilityCount}`)
  lines.push(`- Old-system agent evidence rows: ${snapshot.summary.legacyAgentCount}`)
  lines.push(`- Old-system harvested skills: ${snapshot.summary.harvestedSkillCount}`)
  lines.push(`- Governed Foundation jobs: ${snapshot.summary.jobCount}`)
  lines.push(`- Runtime-approved agents by this card: ${snapshot.summary.runtimeApprovedAgentCount}`)
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  lines.push('- Current Foundation agents remain declared/guarded until a runtime card approves operation.')
  lines.push('- Old-system agents are evidence only; old WORKING status is not current runtime truth.')
  lines.push('- Old code, prompts, private profiles, chat IDs, emails, tokens, and raw memories are not imported.')
  lines.push('- Scheduled jobs are inventoried as governed runtime definitions, not launched by this card.')
  lines.push('')
  lines.push('## Current Foundation Agents')
  lines.push('')
  lines.push('| Agent | Status | Role | Owner | Capabilities | Next Action |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (const agent of snapshot.currentAgents) {
    lines.push(`| ${agent.displayName} | ${agent.honestStatus} | ${agent.role} | ${agent.owner} | ${(agent.capabilityIds || []).join(', ') || 'none'} | ${agent.nextAction} |`)
  }
  lines.push('')
  lines.push('## Old-System Agent Evidence')
  lines.push('')
  lines.push('| Agent | Old Status | Honest Status | Role | Owner | Teams |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (const agent of snapshot.legacyAgents) {
    lines.push(`| ${agent.displayName} | ${agent.sourceStatus} | ${agent.honestStatus} | ${agent.role} | ${agent.owner} | ${(agent.teamRefs || []).join(', ') || 'none'} |`)
  }
  lines.push('')
  lines.push('## Governed Jobs')
  lines.push('')
  lines.push('| Job | Runtime Mode | Type | Lane | Priority |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const job of snapshot.jobs) {
    lines.push(`| ${job.jobKey} | ${job.runtimeMode} | ${job.jobType} | ${job.lane} | ${job.priority} |`)
  }
  lines.push('')
  lines.push('## Not Next')
  lines.push('')
  for (const boundary of PILLAR_5_NOT_NEXT_BOUNDARIES) {
    lines.push(`- ${boundary}`)
  }
  lines.push('')
  return lines.join('\n')
}
