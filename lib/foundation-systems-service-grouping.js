import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FOUNDATION_SYSTEM_SERVICE_AREAS,
} from './source-contracts.js'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'
import { readCombinedFoundationStylesheet } from './foundation-stylesheet-monolith-split.js'
import { readFoundationVerifyCoverageSource } from './foundation-verify-coverage-source.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID = 'FOUNDATION-SYSTEMS-SERVICE-GROUPING-001'
export const FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY = 'foundation-systems-service-grouping-v1'
export const FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH = 'docs/process/approved-plans/foundation-systems-service-grouping-v1.md'
export const FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-SYSTEMS-SERVICE-GROUPING-001.json'
export const FOUNDATION_SYSTEMS_SERVICE_GROUPING_BASELINE_PATH = 'docs/_archive/audits/2026-04-30-foundation-systems-service-grouping-baseline.md'
export const FOUNDATION_SYSTEMS_SERVICE_GROUPING_MANUAL_REVIEW_PATH = 'docs/_archive/audits/2026-04-30-foundation-systems-service-grouping-manual-review.md'

export const FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS = [
  'SYS-SOURCE-TRUTH-001',
  'SYS-RUNTIME-CONTROL-001',
  'SYS-OWNERS-OPS-001',
  'SYS-SALES-DATA-001',
  'SYS-CORPUS-INTEL-001',
  'SYS-MEETING-INTEL-001',
  'SYS-DRIVE-CORPUS-001',
  'SYS-VIDEO-GODMODE-001',
  'SYS-STRATEGY-DECISION-001',
  'SYS-ACTION-LOOP-001',
  'SYS-AGENTS-001',
  'SYS-MARKETING-SOURCES-001',
]

export const FOUNDATION_SYSTEMS_AGENT_ONBOARDING_FEEDBACK_SYSTEM_ID = 'SYS-AGENT-ONBOARDING-FEEDBACK-001'
export const FOUNDATION_SYSTEMS_SALES_GLS_SYSTEM_ID = 'SYS-SALES-GLS-001'
export const FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT = FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS.length + 1
export const FOUNDATION_SYSTEMS_APPROVED_ADDED_SYSTEM_IDS = [
  FOUNDATION_SYSTEMS_AGENT_ONBOARDING_FEEDBACK_SYSTEM_ID,
  FOUNDATION_SYSTEMS_SALES_GLS_SYSTEM_ID,
]
export const FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_IDS = [
  ...FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS,
  ...FOUNDATION_SYSTEMS_APPROVED_ADDED_SYSTEM_IDS,
]
export const FOUNDATION_SYSTEMS_EXISTING_SYSTEM_IDS = FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS
export const FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT = FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS.length
export const FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT = FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_IDS.length

export const FOUNDATION_SYSTEMS_IMPLEMENTATION_STATES = ['live', 'partial', 'planned']

export const FOUNDATION_SYSTEMS_SERVICE_GROUPING_NON_SCOPE_PHRASES = [
  'No Gmail send',
  'No ClickUp Requested writeback',
  'No Agent Onboarding Feedback system build',
  'No AGENT-FEEDBACK-SEND-001',
  'No Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or new feature lane',
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
  return phrases.every(phrase => source.includes(phrase))
}

function hasCombinedSalesRecruitingLabel(value) {
  return /Sales\s*(\/|\+|&|and)\s*Recruiting/i.test(String(value || '')) ||
    /Recruiting\s*(\/|\+|&|and)\s*Sales/i.test(String(value || ''))
}

function cardText(card) {
  return [
    card?.title,
    card?.summary,
    card?.whyItMatters,
    card?.nextAction,
    card?.statusNote,
  ].map(normalizeText).join('\n')
}

function validateSystemServiceAreas(systems) {
  const approved = new Set(FOUNDATION_SYSTEM_SERVICE_AREAS)
  const expectedIds = new Set(FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_IDS)
  const baselineIds = new Set(FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS)
  const findings = []
  const seenIds = new Set()
  const primaryCounts = Object.fromEntries(FOUNDATION_SYSTEM_SERVICE_AREAS.map(area => [area, 0]))

  for (const system of systems) {
    const systemId = normalizeText(system.systemId)
    seenIds.add(systemId)
    const serviceArea = normalizeText(system.serviceArea)
    const secondaries = normalizeList(system.secondaryServiceAreas)
    const implementationState = normalizeText(system.implementationState)

    if (!expectedIds.has(systemId)) findings.push({ systemId, issue: 'unexpected-system-id' })
    if (!approved.has(serviceArea)) findings.push({ systemId, issue: 'invalid-primary-service-area', detail: serviceArea || 'missing' })
    if (!serviceArea || /unclassified|needs service area/i.test(serviceArea)) findings.push({ systemId, issue: 'unclassified-system' })
    if (hasCombinedSalesRecruitingLabel(serviceArea)) findings.push({ systemId, issue: 'combined-sales-recruiting-primary', detail: serviceArea })
    if (!FOUNDATION_SYSTEMS_IMPLEMENTATION_STATES.includes(implementationState)) findings.push({ systemId, issue: 'invalid-implementation-state', detail: implementationState || 'missing' })

    if (approved.has(serviceArea)) primaryCounts[serviceArea] += 1

    for (const secondary of secondaries) {
      if (!approved.has(secondary)) findings.push({ systemId, issue: 'invalid-secondary-service-area', detail: secondary })
      if (secondary === serviceArea) findings.push({ systemId, issue: 'secondary-duplicates-primary', detail: secondary })
      if (hasCombinedSalesRecruitingLabel(secondary)) findings.push({ systemId, issue: 'combined-sales-recruiting-secondary', detail: secondary })
    }
  }

  for (const expectedId of expectedIds) {
    if (!seenIds.has(expectedId)) {
      findings.push({
        systemId: expectedId,
        issue: baselineIds.has(expectedId) ? 'missing-baseline-system' : 'missing-approved-system',
      })
    }
  }

  return {
    findings,
    primaryCounts,
    emptyServiceAreas: FOUNDATION_SYSTEM_SERVICE_AREAS.filter(area => !primaryCounts[area]),
    primaryAssignedCount: systems.filter(system => approved.has(system.serviceArea)).length,
    partialSystemCount: systems.filter(system => system.implementationState === 'partial').length,
    plannedSystemCount: systems.filter(system => system.implementationState === 'planned').length,
  }
}

export async function buildFoundationSystemsServiceGroupingStatus({
  repoRoot = defaultRepoRoot,
  sourceOfTruth = null,
  foundationHub = null,
  foundationBuildLog = null,
} = {}) {
  const findings = []
  const systems = normalizeList(sourceOfTruth?.groupedSystems)
  const serviceAreas = normalizeList(sourceOfTruth?.systemServiceAreas)
  const packageJson = await readOptionalText(repoRoot, 'package.json')
  const sourceContractsSource = await readOptionalText(repoRoot, 'lib/source-contracts.js')
  const foundationFrontendSource = await readFoundationFrontendBundle(repoRoot)
  const foundationStylesSource = await readCombinedFoundationStylesheet(repoRoot, readOptionalText)
  const foundationVerifySource = await readFoundationVerifyCoverageSource(repoRoot, readOptionalText)
  const buildLogSource = await readFoundationBuildLogRegistrySource(repoRoot)
  const approvedPlan = await readOptionalText(repoRoot, FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVAL_PATH)
  const baseline = await readOptionalText(repoRoot, FOUNDATION_SYSTEMS_SERVICE_GROUPING_BASELINE_PATH)
  const manualReview = await readOptionalText(repoRoot, FOUNDATION_SYSTEMS_SERVICE_GROUPING_MANUAL_REVIEW_PATH)
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')

  const areaValidation = validateSystemServiceAreas(systems)
  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVAL_PATH)
  addFinding(findings, Boolean(baseline), 'baseline artifact exists', FOUNDATION_SYSTEMS_SERVICE_GROUPING_BASELINE_PATH)
  addFinding(findings, Boolean(manualReview), 'manual review artifact exists', FOUNDATION_SYSTEMS_SERVICE_GROUPING_MANUAL_REVIEW_PATH)
  addFinding(findings, packageJson.includes('"process:foundation-systems-service-grouping-check"'), 'package script exists', 'process:foundation-systems-service-grouping-check')
  addFinding(findings, buildLogSource.includes(FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY), 'build log closeout exists in source', FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY)
  addFinding(findings, foundationVerifySource.includes(FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID), 'foundation verifier covers service grouping card', FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID)
  addFinding(findings, systems.length === FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_IDS.length, 'approved grouped systems are classified exactly once', `${systems.length}/${FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_IDS.length}`)
  addFinding(findings, FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS.every(systemId => systems.some(system => system.systemId === systemId)), 'baseline grouped systems are preserved', `${FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS.filter(systemId => systems.some(system => system.systemId === systemId)).length}/${FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS.length}`)
  addFinding(findings, serviceAreas.length === FOUNDATION_SYSTEM_SERVICE_AREAS.length && FOUNDATION_SYSTEM_SERVICE_AREAS.every(area => serviceAreas.includes(area)), 'api exposes all approved service groups', `${serviceAreas.length}/${FOUNDATION_SYSTEM_SERVICE_AREAS.length}`)
  addFinding(findings, areaValidation.findings.length === 0, 'all systems have valid service-area metadata', areaValidation.findings.map(finding => `${finding.systemId}:${finding.issue}`).join(', '))
  addFinding(findings, !FOUNDATION_SYSTEM_SERVICE_AREAS.some(hasCombinedSalesRecruitingLabel), 'no approved combined Sales/Recruiting bucket exists', 'approved service groups')
  addFinding(findings, includesAll(sourceContractsSource, FOUNDATION_SYSTEM_SERVICE_AREAS), 'source model names every approved service group', '14 service groups')
  addFinding(findings, includesAll(foundationFrontendSource, [
    'renderFoundationSystemsServiceAreaSummary',
    'renderFoundationSystemsServiceAreaGroup',
    'groupFoundationSystemsByServiceArea',
    'No mapped systems yet.',
    'Primary service area',
    'Secondary service areas',
  ]), 'systems UI renders service-area grouping and empty groups', 'Foundation frontend bundle')
  addFinding(findings, includesAll(foundationStylesSource, [
    '.foundation-service-area-summary-grid',
    '.foundation-service-area-stack',
    '.foundation-service-area-group',
  ]), 'systems service-area CSS exists', 'public/styles.css')
  addFinding(findings, includesAll(approvedPlan, [
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
    ...FOUNDATION_SYSTEM_SERVICE_AREAS,
    ...FOUNDATION_SYSTEMS_SERVICE_GROUPING_NON_SCOPE_PHRASES,
  ]), 'approved plan carries groups and hard constraints', 'approved plan')
  addFinding(findings, includesAll(baseline, [
    'Baseline source: 137d428',
    'Existing grouped systems: 12',
    'Approved service groups: 14',
  ]), 'baseline records starting system count and group set', 'baseline')
  addFinding(findings, includesAll(manualReview, [
    'Failures: 0',
    'desktop 1440x900',
    'mobile 390x844',
    '/foundation#systems',
    'no horizontal overflow',
    'no overlapping text',
    'service groups visible',
    'system cards readable',
    'technical metadata still reachable',
  ]), 'manual review records route and viewport pass/fail', 'manual review')
  addFinding(findings, currentPlan.includes('FOUNDATION-SYSTEMS-SERVICE-GROUPING-001` is done for v1'), 'current plan records card done', 'current-plan')
  addFinding(findings, currentState.includes('FOUNDATION-SYSTEMS-SERVICE-GROUPING-001` is done for v1'), 'current state records card done', 'current-state')

  if (foundationHub) {
    const backlogItems = normalizeList(foundationHub.backlogItems)
    const groupingCard = backlogItems.find(card => card.id === FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID) || null
    const onboardingCard = backlogItems.find(card => card.id === 'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001') || null
    const sendCard = backlogItems.find(card => card.id === 'AGENT-FEEDBACK-SEND-001') || null
    addFinding(findings, groupingCard?.lane === 'done', 'grouping owner card is done', groupingCard?.lane || 'missing')
    addFinding(findings, /foundation-systems-service-grouping-v1/.test(groupingCard?.statusNote || ''), 'grouping owner card status note records closeout', groupingCard?.statusNote || 'missing')
    addFinding(findings, onboardingCard?.lane === 'scoped' || (onboardingCard?.lane === 'done' && /agent-onboarding-feedback-system-v1/.test(onboardingCard?.statusNote || '')), 'Agent Onboarding Feedback system card is scoped or approved-done', onboardingCard?.lane || 'missing')
    addFinding(
      findings,
      sendCard?.lane === 'scoped' ||
        (sendCard?.lane === 'done' && /agent-feedback-send-v1/.test(sendCard?.statusNote || '')),
      'Agent feedback send card remains scoped or approved Stage 1 done',
      sendCard?.lane || 'missing',
    )
    addFinding(findings, /No Gmail send/.test(cardText(groupingCard)) || /No Gmail send/.test(approvedPlan), 'owner card records no Gmail send boundary', groupingCard?.id || 'missing')
  }

  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
    {
      backlogId: FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
      buildLogSource,
      fallbackMentionedBacklogIds: [
        'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
        'AGENT-FEEDBACK-SEND-001',
      ],
    },
  )
  if (foundationBuildLog) {
    const owners = normalizeList(closeout?.backlogIds)
    const mentioned = normalizeList(closeout?.mentionedBacklogIds)
    addFinding(findings, Boolean(closeout), 'build log exposes systems service grouping closeout', FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY)
    addFinding(findings, owners.length === 1 && owners.includes(FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID), 'closeout owns only systems grouping card', owners.join(', ') || 'missing')
    addFinding(findings, !owners.includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001') && !owners.includes('AGENT-FEEDBACK-SEND-001'), 'onboarding feedback cards stay context only', owners.join(', ') || 'none')
    addFinding(findings, mentioned.includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001'), 'next card is mentioned as context only', mentioned.join(', ') || 'missing')
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
    closeoutKey: FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
    summary: {
      groupedSystemCount: systems.length,
      approvedServiceGroupCount: FOUNDATION_SYSTEM_SERVICE_AREAS.length,
      primaryAssignedCount: areaValidation.primaryAssignedCount,
      emptyServiceAreas: areaValidation.emptyServiceAreas,
      partialSystemCount: areaValidation.partialSystemCount,
      plannedSystemCount: areaValidation.plannedSystemCount,
      invalidSystemCount: areaValidation.findings.length,
      salesRecruitingSeparated: !FOUNDATION_SYSTEM_SERVICE_AREAS.some(hasCombinedSalesRecruitingLabel) &&
        areaValidation.findings.every(finding => !/combined-sales-recruiting/.test(finding.issue)),
      closeoutOwnsOnlyGrouping: closeout
        ? normalizeList(closeout.backlogIds).length === 1 && normalizeList(closeout.backlogIds).includes(FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID)
        : false,
    },
    serviceAreas: FOUNDATION_SYSTEM_SERVICE_AREAS,
    findings,
  }
}
