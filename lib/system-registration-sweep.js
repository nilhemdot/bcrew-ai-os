import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'
import { readFoundationVerifyCoverageSource } from './foundation-verify-coverage-source.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const SYSTEM_REGISTRATION_SWEEP_CARD_ID = 'SYSTEM-REGISTRATION-SWEEP-001'
export const SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY = 'system-registration-sweep-v1'
export const SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH = 'docs/process/approved-plans/system-registration-sweep-v1.md'
export const SYSTEM_REGISTRATION_SWEEP_APPROVAL_PATH = 'docs/process/approvals/SYSTEM-REGISTRATION-SWEEP-001.json'
export const SYSTEM_REGISTRATION_SWEEP_PROOF_PATH = 'docs/audits/2026-05-02-system-registration-sweep-proof.md'

export const SYSTEM_REGISTRATION_GLS_SYSTEM_ID = 'SYS-SALES-GLS-001'
export const SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID = 'SYS-AGENT-ONBOARDING-FEEDBACK-001'

export const SYSTEM_REGISTRATION_SHIPPED_SYSTEM_REQUIREMENTS = [
  {
    key: 'sales-gls',
    label: 'GLS System / Get Listings Sold',
    systemId: SYSTEM_REGISTRATION_GLS_SYSTEM_ID,
    owningCardId: 'SALES-GLS-SCOREBOARD-V1',
    closeoutKey: 'sales-gls-scoreboard-v1',
    serviceArea: 'Sales',
    implementationState: 'live',
    sourceIds: ['SRC-CLICKUP-001'],
    sourceOfTruthIds: ['SRC-CLICKUP-001'],
    supportingSourceIds: ['SRC-SUPABASE-001'],
    routeHrefs: ['/sales#gls-dashboard', '/sales#gls-system'],
    requiredText: [
      'Source of truth: ClickUp Deal Data Entry / SRC-CLICKUP-001',
      'Supporting source: KPI Shopping List / SRC-SUPABASE-001, supporting evidence only',
      'Trigger: Active listings crossing stale threshold',
      'Owner lane: Sales Leadership',
      'Proof: SALES-GLS-SCOREBOARD-V1 closeout',
    ],
  },
  {
    key: 'agent-onboarding-feedback',
    label: 'Agent Onboarding Feedback System',
    systemId: SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID,
    owningCardId: 'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
    closeoutKey: 'agent-onboarding-feedback-system-v1',
    serviceArea: 'Agent Onboarding',
    implementationState: 'live',
    sourceIds: ['SRC-CLICKUP-001'],
    sourceOfTruthIds: ['SRC-CLICKUP-001'],
    supportingSourceIds: [],
    routeHrefs: ['/ops', '/foundation#source-overview'],
    requiredText: [
      'System name: Agent Onboarding Feedback',
      'Production auto-send is live',
      'live reminders are enabled',
      'ClickUp Agent Roster',
    ],
  },
]

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function normalizeText(value) {
  return String(value || '').trim()
}

async function readOptionalText(repoRoot, relativePath) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

async function readFoundationFrontendBundle(repoRoot) {
  const frontendPaths = [
    'public/foundation.js',
    'public/foundation-source-registry-renderers.js',
    'public/foundation-system-inventory-renderers.js',
    'public/foundation-source-lifecycle-renderers.js',
    'public/foundation-runtime-renderers.js',
    'public/foundation-operations-renderers.js',
    'public/foundation-router.js',
  ]
  const sources = await Promise.all(frontendPaths.map(relativePath =>
    readOptionalText(repoRoot, relativePath)
  ))
  return sources.join('\n')
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

function includesAll(source, phrases) {
  return phrases.every(phrase => String(source || '').includes(phrase))
}

function systemText(system) {
  return [
    system?.name,
    system?.title,
    system?.status,
    system?.serviceArea,
    system?.implementationState,
    system?.trustState,
    system?.purpose,
    system?.currentState,
    system?.nextLevelPlan,
    ...(system?.appliesTo || []),
    ...(system?.backlogIds || []),
  ].map(normalizeText).join('\n')
}

function findCloseout(foundationBuildLog, buildLogSource, closeoutKey, backlogId, mentionedBacklogIds = []) {
  return findFoundationBuildCloseoutEntry(foundationBuildLog, closeoutKey, {
    backlogId,
    buildLogSource,
    fallbackMentionedBacklogIds: mentionedBacklogIds,
  }) || (String(buildLogSource || '').includes(closeoutKey)
    ? {
        closeoutKey,
        backlogIds: backlogId ? [backlogId] : [],
        mentionedBacklogIds,
        operatorCloseout: true,
      }
    : null)
}

function evaluateRequirement(requirement, systems, backlogItems, foundationBuildLog, buildLogSource) {
  const matches = systems.filter(system => system.systemId === requirement.systemId)
  const system = matches[0] || null
  const text = systemText(system)
  const sourceIds = normalizeList(system?.sourceIds)
  const sourceOfTruthIds = normalizeList(system?.sourceOfTruthIds)
  const supportingSourceIds = normalizeList(system?.supportingSourceIds)
  const routeHrefs = normalizeList(system?.actions).map(action => action.href)
  const card = backlogItems.find(item => item.id === requirement.owningCardId) || null
  const closeout = findCloseout(
    foundationBuildLog,
    buildLogSource,
    requirement.closeoutKey,
    requirement.owningCardId,
  )

  return {
    ...requirement,
    system,
    card,
    closeout,
    appearsExactlyOnce: matches.length === 1,
    cardDone: card?.lane === 'done',
    closeoutVisible: Boolean(closeout),
    serviceAreaCorrect: system?.serviceArea === requirement.serviceArea,
    implementationStateCorrect: system?.implementationState === requirement.implementationState,
    sourceIdsCorrect: includesAll(sourceIds.join('\n'), requirement.sourceIds),
    sourceOfTruthIdsCorrect: includesAll(sourceOfTruthIds.join('\n'), requirement.sourceOfTruthIds),
    supportingSourceIdsCorrect: includesAll(supportingSourceIds.join('\n'), requirement.supportingSourceIds),
    routeHrefsCorrect: includesAll(routeHrefs.join('\n'), requirement.routeHrefs),
    requiredTextPresent: includesAll(text, requirement.requiredText),
  }
}

export async function buildSystemRegistrationSweepStatus({
  repoRoot = defaultRepoRoot,
  sourceOfTruth = null,
  foundationHub = null,
  foundationBuildLog = null,
} = {}) {
  const findings = []
  const systems = normalizeList(sourceOfTruth?.groupedSystems)
  const backlogItems = normalizeList(foundationHub?.backlogItems)
  const sourceContractsSource = await readOptionalText(repoRoot, 'lib/source-contracts.js')
  const foundationFrontendSource = await readFoundationFrontendBundle(repoRoot)
  const packageSource = await readOptionalText(repoRoot, 'package.json')
  const verifierSource = await readFoundationVerifyCoverageSource(repoRoot, readOptionalText)
  const buildLogSource = await readFoundationBuildLogRegistrySource(repoRoot)
  const approvedPlan = await readOptionalText(repoRoot, SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, SYSTEM_REGISTRATION_SWEEP_APPROVAL_PATH)
  const proof = await readOptionalText(repoRoot, SYSTEM_REGISTRATION_SWEEP_PROOF_PATH)
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')

  const requirementResults = SYSTEM_REGISTRATION_SHIPPED_SYSTEM_REQUIREMENTS.map(requirement =>
    evaluateRequirement(requirement, systems, backlogItems, foundationBuildLog, buildLogSource)
  )
  const gls = requirementResults.find(result => result.systemId === SYSTEM_REGISTRATION_GLS_SYSTEM_ID) || null
  const agentFeedback = requirementResults.find(result => result.systemId === SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID) || null
  const sweepCard = backlogItems.find(item => item.id === SYSTEM_REGISTRATION_SWEEP_CARD_ID) || null
  const sweepCloseout = findCloseout(
    foundationBuildLog,
    buildLogSource,
    SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
    SYSTEM_REGISTRATION_SWEEP_CARD_ID,
    ['SALES-GLS-SCOREBOARD-V1', 'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001'],
  )

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', SYSTEM_REGISTRATION_SWEEP_APPROVAL_PATH)
  addFinding(findings, Boolean(proof), 'proof artifact exists', SYSTEM_REGISTRATION_SWEEP_PROOF_PATH)
  addFinding(findings, packageSource.includes('"process:system-registration-sweep-check"'), 'package script exists', 'process:system-registration-sweep-check')
  addFinding(findings, verifierSource.includes(SYSTEM_REGISTRATION_SWEEP_CARD_ID), 'foundation verifier covers system registration sweep', SYSTEM_REGISTRATION_SWEEP_CARD_ID)
  addFinding(findings, buildLogSource.includes(SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY), 'build log closeout exists in source', SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY)
  addFinding(findings, includesAll(sourceContractsSource, [
    SYSTEM_REGISTRATION_GLS_SYSTEM_ID,
    'GLS System / Get Listings Sold',
    'supportingSourceIds',
    '/sales#gls-dashboard',
    '/sales#gls-system',
  ]), 'source contract registers GLS with routes and supporting evidence field', 'lib/source-contracts.js')
  addFinding(findings, includesAll(foundationFrontendSource, [
    'groupFoundationSystemsByServiceArea',
    'Supporting evidence sources',
    'renderFoundationSystemFullCard',
  ]), 'Foundation Systems UI renders grouped systems and supporting evidence sources', 'Foundation frontend bundle')
  addFinding(findings, currentPlan.includes(SYSTEM_REGISTRATION_SWEEP_CARD_ID) && currentPlan.includes(SYSTEM_REGISTRATION_GLS_SYSTEM_ID), 'current plan records system registration sweep', 'current-plan')
  addFinding(findings, currentState.includes(SYSTEM_REGISTRATION_SWEEP_CARD_ID) && currentState.includes(SYSTEM_REGISTRATION_GLS_SYSTEM_ID), 'current state records system registration sweep', 'current-state')
  addFinding(findings, sweepCard?.lane === 'done', 'sweep owner card is done', sweepCard?.lane || 'missing')
  addFinding(findings, /system-registration-sweep-v1/.test(sweepCard?.statusNote || ''), 'sweep owner card status note records closeout', sweepCard?.statusNote || 'missing')
  addFinding(findings, Boolean(sweepCloseout), 'build log exposes system registration sweep closeout', SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY)
  addFinding(findings, normalizeList(sweepCloseout?.backlogIds).length === 1 && normalizeList(sweepCloseout?.backlogIds).includes(SYSTEM_REGISTRATION_SWEEP_CARD_ID), 'closeout owns only system registration sweep card', normalizeList(sweepCloseout?.backlogIds).join(', ') || 'missing')

  for (const result of requirementResults) {
    addFinding(findings, result.appearsExactlyOnce, `${result.label} appears exactly once in groupedSystems`, result.systemId)
    addFinding(findings, result.cardDone, `${result.label} owning card is done`, result.card?.lane || 'missing')
    addFinding(findings, result.closeoutVisible, `${result.label} closeout is visible`, result.closeoutKey)
    addFinding(findings, result.serviceAreaCorrect, `${result.label} service area is correct`, result.system?.serviceArea || 'missing')
    addFinding(findings, result.implementationStateCorrect, `${result.label} implementation state is live`, result.system?.implementationState || 'missing')
    addFinding(findings, result.sourceIdsCorrect, `${result.label} source truth IDs are mapped`, normalizeList(result.system?.sourceIds).join(', ') || 'missing')
    addFinding(findings, result.sourceOfTruthIdsCorrect, `${result.label} explicit source-of-truth IDs are mapped`, normalizeList(result.system?.sourceOfTruthIds).join(', ') || 'missing')
    addFinding(findings, result.supportingSourceIdsCorrect, `${result.label} supporting source IDs are mapped`, normalizeList(result.system?.supportingSourceIds).join(', ') || 'none')
    addFinding(findings, result.routeHrefsCorrect, `${result.label} routes are mapped`, normalizeList(result.system?.actions).map(action => action.href).join(', ') || 'missing')
    addFinding(findings, result.requiredTextPresent, `${result.label} required operating context is present`, result.requiredText.filter(phrase => !systemText(result.system).includes(phrase)).join(', ') || 'ok')
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SYSTEM_REGISTRATION_SWEEP_CARD_ID,
    closeoutKey: SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
    summary: {
      groupedSystemCount: systems.length,
      shippedSystemRequirementCount: SYSTEM_REGISTRATION_SHIPPED_SYSTEM_REQUIREMENTS.length,
      missingShippedSystemCount: requirementResults.filter(result => !result.appearsExactlyOnce).length,
      glsSystemVisible: Boolean(gls?.appearsExactlyOnce),
      glsServiceArea: gls?.system?.serviceArea || null,
      glsImplementationState: gls?.system?.implementationState || null,
      glsSourceTruthCorrect: Boolean(gls?.sourceIdsCorrect && gls?.sourceOfTruthIdsCorrect),
      glsSupportingEvidenceCorrect: Boolean(gls?.supportingSourceIdsCorrect),
      glsRoutesVisible: Boolean(gls?.routeHrefsCorrect),
      agentOnboardingFeedbackVisible: Boolean(agentFeedback?.appearsExactlyOnce),
      agentOnboardingFeedbackLive: Boolean(agentFeedback?.implementationStateCorrect),
      closeoutOwnsOnlySweep: normalizeList(sweepCloseout?.backlogIds).length === 1 &&
        normalizeList(sweepCloseout?.backlogIds).includes(SYSTEM_REGISTRATION_SWEEP_CARD_ID),
    },
    shippedSystems: requirementResults.map(result => ({
      label: result.label,
      systemId: result.systemId,
      visible: result.appearsExactlyOnce,
      cardDone: result.cardDone,
      closeoutVisible: result.closeoutVisible,
      serviceArea: result.system?.serviceArea || null,
      implementationState: result.system?.implementationState || null,
      routesVisible: result.routeHrefsCorrect,
    })),
    findings,
  }
}
