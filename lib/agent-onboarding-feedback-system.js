import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'
import {
  FOUNDATION_SYSTEM_SERVICE_AREAS,
} from './source-contracts.js'
import {
  FOUNDATION_SYSTEMS_AGENT_ONBOARDING_FEEDBACK_SYSTEM_ID,
  FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT,
  FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT,
  FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS,
} from './foundation-systems-service-grouping.js'
import { getBacklogItemsByIds } from './foundation-backlog-sprint-db.js'
import { listAgentFeedbackSendAttemptsForMilestone } from './foundation-people-sales-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID = 'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001'
export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY = 'agent-onboarding-feedback-system-v1'
export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-onboarding-feedback-system-v1.md'
export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVAL_PATH = 'docs/process/approvals/AGENT-ONBOARDING-FEEDBACK-SYSTEM-001.json'
export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_BASELINE_PATH = 'docs/_archive/audits/2026-04-30-agent-onboarding-feedback-system-baseline.md'
export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_MANUAL_REVIEW_PATH = 'docs/_archive/audits/2026-04-30-agent-onboarding-feedback-system-manual-review.md'
export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_ROUTE = '/foundation#systems'
export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_API_PATH = '/api/source-of-truth'
export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID = 'FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001'
export const AGENT_FEEDBACK_SEND_CARD_ID = 'AGENT-FEEDBACK-SEND-001'
const GEORGIA_DAY_30_TASK_ID = '868jffh12'
const CHRIS_DAY_30_TASK_ID = '868j2ed33'

export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_REQUIRED_CONTEXT = [
  'System name: Agent Onboarding Feedback',
  'Source of truth: ClickUp Agent Roster',
  'Trigger: Real Start Date + day 30/60/90',
  'Current queue: Agent Roster review / Ops review queue',
  'Current form: /agent-feedback private token link',
  'Current writeback: Onboarding NPS 30/60/90 Status, Score, Feedback fields',
  'not due',
  'due',
  'requested',
  'completed',
  'skipped',
  'blocked',
  'expired window',
  'missing Real Start Date',
  'missing Company Email',
  'invalid Company Email',
  'Contract Link is a warning/data-quality signal only',
  'expired send window',
  'missing/invalid feedback fields',
  'Ops Hub Agent Roster queue',
  '/api/owners/review-queue',
  'ClickUp task',
  'agent_onboarding_feedback_responses',
  'Production auto-send is live',
  'Gmail send proof for controlled production sends',
  'private feedback links',
  'no private feedback content broadly exposed',
  'approved owner/review surfaces',
  'live reminders are enabled',
  'Georgia Huntley Day-30 and Chris Chopite Day-30 are Requested after the controlled production run',
]

const AGENT_ONBOARDING_FEEDBACK_SYSTEM_LIVE_REQUIRED_CONTEXT = AGENT_ONBOARDING_FEEDBACK_SYSTEM_REQUIRED_CONTEXT.map(phrase =>
  phrase === 'Gmail send proof once send path exists'
    ? 'Gmail send proof for controlled production sends'
    : phrase
)

export const AGENT_ONBOARDING_FEEDBACK_SYSTEM_HARD_BOUNDARIES = [
  'No Gmail send',
  'No ClickUp Requested writeback',
  'No Georgia survey',
  'No production email path',
  'No AGENT-FEEDBACK-SEND-001 build',
  'No broad Systems regrouping',
  'No private feedback tokens',
  'No personal email addresses',
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

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

function includesAll(source, phrases) {
  return phrases.every(phrase => source.includes(phrase))
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

function sourceSystemText(system) {
  return [
    system?.title,
    system?.status,
    system?.trustState,
    system?.purpose,
    system?.currentState,
    system?.nextLevelPlan,
    ...(system?.appliesTo || []),
    ...(system?.backlogIds || []),
  ].map(normalizeText).join('\n')
}

function hasCombinedSalesRecruitingLabel(value) {
  return /Sales\s*(\/|\+|&|and)\s*Recruiting/i.test(String(value || '')) ||
    /Recruiting\s*(\/|\+|&|and)\s*Sales/i.test(String(value || ''))
}

function hasPrivateLeak(source) {
  if (!source) return false
  if (/\/agent-feedback\?token=/i.test(source)) return true
  if (/\bfeedbackUrl\b/i.test(source)) return true
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(source)) return true
  return false
}

function buildKnownCaseProof(ownersReviewQueue) {
  const agentRoster = ownersReviewQueue?.reviewQueue?.sections?.agentRoster || {}
  const items = normalizeList(agentRoster.items)
  const georgiaItems = items.filter(item => /Georgia Huntley/i.test(item.title || ''))
  const chrisItems = items.filter(item => /\bChris\b/i.test(item.title || ''))
  const georgiaDueItem = georgiaItems.find(item =>
    item.id === 'agent-roster-nps-due:868jffh12:30' &&
      item.reviewStatus === 'Feedback Due' &&
      item.dueDate === '2026-04-28' &&
      item.subtitle === 'Day-30 onboarding feedback' &&
      Boolean(item.feedbackUrl)
  ) || null
  const georgiaRequestedItem = georgiaItems.find(item =>
    item.id === 'agent-roster-nps-reminder:868jffh12:30' &&
      item.reviewStatus === 'Reminder Due' &&
      item.dueDate === '2026-04-28' &&
      item.subtitle === 'Day-30 onboarding feedback' &&
      Boolean(item.feedbackUrl)
  ) || null
  const chrisDueItems = chrisItems.filter(item =>
    item.reviewStatus === 'Feedback Due' &&
      item.subtitle === 'Day-30 onboarding feedback'
  )
  const chrisNotDue = chrisItems.length === 0 ||
    chrisItems.every(item => item.reviewStatus !== 'Feedback Due')
  const chrisDueSourceBacked = chrisDueItems.some(item =>
    /^agent-roster-nps-due:[^:]+:30$/.test(String(item.id || '')) &&
      Boolean(item.dueDate)
  )

  return {
    openItems: Number(agentRoster.openItems || 0),
    needsFixing: Number(agentRoster.needsFixing || 0),
    queuedReview: Number(agentRoster.queuedReview || 0),
    totalTrackedRows: Number(agentRoster.totalTrackedRows || 0),
    georgiaDue: Boolean(georgiaDueItem),
    georgiaRequestedAfterProductionEnable: Boolean(georgiaRequestedItem),
    georgiaTaskId: georgiaDueItem ? '868jffh12' : null,
    georgiaMilestone: georgiaDueItem ? 30 : null,
    georgiaDueDate: georgiaDueItem?.dueDate || null,
    chrisNotDue,
    chrisDueSourceBacked,
    chrisMetadataCurrent: chrisNotDue || chrisDueSourceBacked,
  }
}

async function buildProductionRequestLedgerProof() {
  const empty = {
    georgiaRequested: false,
    chrisRequested: false,
    bothRequested: false,
    metadataOnly: true,
  }
  try {
    const [georgiaAttempts, chrisAttempts] = await Promise.all([
      listAgentFeedbackSendAttemptsForMilestone({ taskId: GEORGIA_DAY_30_TASK_ID, milestoneDay: 30 }),
      listAgentFeedbackSendAttemptsForMilestone({ taskId: CHRIS_DAY_30_TASK_ID, milestoneDay: 30 }),
    ])
    const georgiaRequested = georgiaAttempts.some(attempt =>
      attempt.status === 'clickup_requested' &&
        attempt.metadata?.gmailSendSucceeded === true &&
        attempt.metadata?.clickUpRequestedWritten === true
    )
    const chrisRequested = chrisAttempts.some(attempt =>
      attempt.status === 'clickup_requested' &&
        attempt.metadata?.gmailSendSucceeded === true &&
        attempt.metadata?.clickUpRequestedWritten === true
    )
    return {
      georgiaRequested,
      chrisRequested,
      bothRequested: georgiaRequested && chrisRequested,
      metadataOnly: true,
    }
  } catch {
    return empty
  }
}

async function hydrateBacklogCardsById(ids = []) {
  try {
    return await getBacklogItemsByIds(ids)
  } catch {
    return []
  }
}

export async function buildAgentOnboardingFeedbackSystemStatus({
  repoRoot = defaultRepoRoot,
  sourceOfTruth = null,
  foundationHub = null,
  foundationBuildLog = null,
  ownersReviewQueue = null,
  opsHub = null,
} = {}) {
  const findings = []
  const systems = normalizeList(sourceOfTruth?.groupedSystems)
  const serviceAreas = normalizeList(sourceOfTruth?.systemServiceAreas)
  const agentSystems = systems.filter(system => system.systemId === FOUNDATION_SYSTEMS_AGENT_ONBOARDING_FEEDBACK_SYSTEM_ID)
  const agentSystem = agentSystems[0] || null
  const agentText = sourceSystemText(agentSystem)
  const packageJson = await readOptionalText(repoRoot, 'package.json')
  const sourceContractsSource = await readOptionalText(repoRoot, 'lib/source-contracts.js')
  const foundationVerifySource = await readOptionalText(repoRoot, 'scripts/foundation-verify.mjs')
  const foundationAgentFeedbackVerifierSource = await readOptionalText(repoRoot, 'lib/foundation-agent-feedback-verifier.js')
  const verifierCoverageSource = `${foundationVerifySource}\n${foundationAgentFeedbackVerifierSource}`
  const buildLogSource = await readFoundationBuildLogRegistrySource(repoRoot)
  const approvedPlan = await readOptionalText(repoRoot, AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVAL_PATH)
  const baseline = await readOptionalText(repoRoot, AGENT_ONBOARDING_FEEDBACK_SYSTEM_BASELINE_PATH)
  const manualReview = await readOptionalText(repoRoot, AGENT_ONBOARDING_FEEDBACK_SYSTEM_MANUAL_REVIEW_PATH)
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')
  const processScript = await readOptionalText(repoRoot, 'scripts/process-agent-onboarding-feedback-system-check.mjs')

  const baselinePreservedCount = FOUNDATION_SYSTEMS_BASELINE_SYSTEM_IDS
    .filter(systemId => systems.some(system => system.systemId === systemId))
    .length
  const primaryCounts = Object.fromEntries(FOUNDATION_SYSTEM_SERVICE_AREAS.map(area => [
    area,
    systems.filter(system => system.serviceArea === area).length,
  ]))
  const secondaryValid = normalizeList(agentSystem?.secondaryServiceAreas).every(area =>
    FOUNDATION_SYSTEM_SERVICE_AREAS.includes(area) &&
      area !== agentSystem?.serviceArea &&
      !hasCombinedSalesRecruitingLabel(area)
  )
  const knownCases = buildKnownCaseProof(ownersReviewQueue)
  const productionRequestLedger = await buildProductionRequestLedgerProof()
  const opsJobs = normalizeList(opsHub?.foundationJobs?.jobs)
  const opsAgentRosterJob = opsJobs.find(job => job.key === 'agent-roster-review') || null
  const agentRosterQueueLive = knownCases.openItems > 0 &&
    (knownCases.totalTrackedRows > 0 || productionRequestLedger.bothRequested === true)

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVAL_PATH)
  addFinding(findings, Boolean(baseline), 'baseline artifact exists', AGENT_ONBOARDING_FEEDBACK_SYSTEM_BASELINE_PATH)
  addFinding(findings, Boolean(manualReview), 'manual review artifact exists', AGENT_ONBOARDING_FEEDBACK_SYSTEM_MANUAL_REVIEW_PATH)
  addFinding(findings, packageJson.includes('"process:agent-onboarding-feedback-system-check"'), 'package script exists', 'process:agent-onboarding-feedback-system-check')
  addFinding(findings, Boolean(processScript), 'process check script exists', 'scripts/process-agent-onboarding-feedback-system-check.mjs')
  addFinding(findings, buildLogSource.includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY), 'build log closeout exists in source', AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY)
  addFinding(findings, verifierCoverageSource.includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID), 'foundation verifier covers agent onboarding feedback system card', AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID)
  addFinding(findings, systems.length >= FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT, 'Agent Onboarding Feedback remains present after later system registrations', `${systems.length}/${FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT}`)
  addFinding(findings, baselinePreservedCount === FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT, 'existing 12 grouped systems are preserved', `${baselinePreservedCount}/${FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT}`)
  addFinding(findings, agentSystems.length === 1, 'Agent Onboarding Feedback system added exactly once', `${agentSystems.length}`)
  addFinding(findings, agentSystem?.serviceArea === 'Agent Onboarding', 'Agent Onboarding Feedback primary service area is Agent Onboarding', agentSystem?.serviceArea || 'missing')
  addFinding(findings, agentSystem?.implementationState === 'live', 'Agent Onboarding Feedback implementation state is live', agentSystem?.implementationState || 'missing')
  addFinding(findings, secondaryValid, 'Agent Onboarding Feedback secondary service areas are valid and distinct', normalizeList(agentSystem?.secondaryServiceAreas).join(', ') || 'none')
  addFinding(findings, primaryCounts['Agent Onboarding'] >= 1, 'Agent Onboarding service group is no longer empty', String(primaryCounts['Agent Onboarding'] || 0))
  addFinding(findings, serviceAreas.length === FOUNDATION_SYSTEM_SERVICE_AREAS.length && FOUNDATION_SYSTEM_SERVICE_AREAS.every(area => serviceAreas.includes(area)), 'api exposes all approved service groups', `${serviceAreas.length}/${FOUNDATION_SYSTEM_SERVICE_AREAS.length}`)
  addFinding(findings, !FOUNDATION_SYSTEM_SERVICE_AREAS.some(hasCombinedSalesRecruitingLabel), 'Sales and Recruiting remain separate service groups', 'approved service groups')
  addFinding(findings, includesAll(agentText, AGENT_ONBOARDING_FEEDBACK_SYSTEM_LIVE_REQUIRED_CONTEXT), 'system record contains required onboarding feedback context', AGENT_ONBOARDING_FEEDBACK_SYSTEM_LIVE_REQUIRED_CONTEXT.filter(phrase => !agentText.includes(phrase)).join(', '))
  addFinding(findings, normalizeList(agentSystem?.backlogIds).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID), 'system links owning card', normalizeList(agentSystem?.backlogIds).join(', '))
  addFinding(findings, normalizeList(agentSystem?.backlogIds).includes(AGENT_FEEDBACK_SEND_CARD_ID), 'system links send-path card as future work', normalizeList(agentSystem?.backlogIds).join(', '))
  addFinding(findings, normalizeList(agentSystem?.backlogIds).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID), 'system links empty-group audit as context', normalizeList(agentSystem?.backlogIds).join(', '))
  addFinding(findings, includesAll(approvedPlan, [
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
    'SYS-AGENT-ONBOARDING-FEEDBACK-001',
    'implementationState: partial',
    'Before: 12 grouped systems',
    'After: 13 grouped systems',
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID,
    ...AGENT_ONBOARDING_FEEDBACK_SYSTEM_HARD_BOUNDARIES,
  ]), 'approved plan carries count, state, privacy, and no-send gates', 'approved plan')
  addFinding(findings, includesAll(baseline, [
    'Baseline source: 1460190',
    'Grouped systems before: 12',
    'Agent Onboarding empty before build: yes',
    'FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001: missing',
    'Georgia metadata proof: due, day 30, due date 2026-04-28',
    'Chris metadata proof: no due item surfaced',
    'No private feedback tokens, feedback content, or personal email addresses recorded',
  ]), 'baseline records metadata-only starting truth', 'baseline')
  addFinding(findings, includesAll(manualReview, [
    'Failures: 0',
    'desktop 1440x900',
    'mobile 390x844',
    '/foundation#systems',
    '/ops',
    'Agent Onboarding group non-empty',
    'implementationState partial',
    'no horizontal overflow',
    'no overlapping text',
    'no private feedback tokens, feedback content, or personal email addresses',
  ]), 'manual review records route and viewport pass/fail', 'manual review')
  addFinding(findings, !hasPrivateLeak(`${approvedPlan}\n${baseline}\n${manualReview}`), 'tracked artifacts contain metadata-only privacy proof', 'plan/baseline/manual')
  addFinding(findings, includesAll(sourceContractsSource, [
    FOUNDATION_SYSTEMS_AGENT_ONBOARDING_FEEDBACK_SYSTEM_ID,
    'implementationState: \'live\'',
    'agent_onboarding_feedback_responses',
  ]), 'source contract contains live system and response table reference', 'lib/source-contracts.js')
  addFinding(findings, agentRosterQueueLive, 'Agent Roster review queue is live or production-request ledger proves current requests', `open=${knownCases.openItems} tracked=${knownCases.totalTrackedRows} ledger=${productionRequestLedger.bothRequested ? 'requested' : 'missing'}`)
  addFinding(
    findings,
    knownCases.georgiaDue || knownCases.georgiaRequestedAfterProductionEnable || productionRequestLedger.georgiaRequested,
    'Georgia metadata-only due/requested proof exists',
    knownCases.georgiaDue
      ? `${knownCases.georgiaTaskId}:day-${knownCases.georgiaMilestone}:${knownCases.georgiaDueDate}`
      : knownCases.georgiaRequestedAfterProductionEnable
        ? 'requested-after-production-enable'
        : productionRequestLedger.georgiaRequested
          ? 'requested-after-production-enable-ledger'
        : 'missing',
  )
  addFinding(
    findings,
    knownCases.chrisMetadataCurrent,
    'Chris metadata-only source-state proof exists',
    knownCases.chrisNotDue
      ? 'not due or not present in due queue'
      : knownCases.chrisDueSourceBacked
        ? 'source-backed due item surfaced'
        : 'missing source-backed state',
  )
  addFinding(findings, Boolean(opsAgentRosterJob), 'Ops Hub exposes Agent Roster job metadata', opsAgentRosterJob?.key || 'missing')
  addFinding(findings, opsAgentRosterJob?.status === 'live' && opsAgentRosterJob?.enabled === true, 'Agent Roster job remains live/enabled metadata', `${opsAgentRosterJob?.status || 'missing'} / ${opsAgentRosterJob?.enabled}`)
  addFinding(findings, currentPlan.includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` is done for v1'), 'current plan records card done', 'current-plan')
  addFinding(findings, currentState.includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` is done for v1'), 'current state records card done', 'current-state')

  let ownerCard = null
  let sendCard = null
  let emptyAuditCard = null
  if (foundationHub) {
    const backlogItems = normalizeList(foundationHub.backlogItems)
    const hydratedCards = await hydrateBacklogCardsById([
      AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
      AGENT_FEEDBACK_SEND_CARD_ID,
      AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID,
    ])
    const findHydratedCard = id => hydratedCards.find(card => card.id === id) || backlogItems.find(card => card.id === id) || null
    ownerCard = findHydratedCard(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID)
    sendCard = findHydratedCard(AGENT_FEEDBACK_SEND_CARD_ID)
    emptyAuditCard = findHydratedCard(AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID)
    addFinding(findings, ownerCard?.lane === 'done', 'owner card is done', ownerCard?.lane || 'missing')
    addFinding(findings, /agent-onboarding-feedback-system-v1/.test(ownerCard?.statusNote || ''), 'owner card status note records closeout', ownerCard?.statusNote || 'missing')
    addFinding(
      findings,
      sendCard?.lane === 'scoped' ||
        (sendCard?.lane === 'done' && /agent-feedback-send-v1/.test(sendCard?.statusNote || '')),
      'send-path card is scoped or approved Stage 1 done',
      sendCard?.lane || 'missing',
    )
    addFinding(findings, emptyAuditCard?.lane === 'scoped', 'empty-group audit card is scoped only', emptyAuditCard?.lane || 'missing')
    addFinding(findings, includesAll(cardText(emptyAuditCard), [
      'Every empty group gets a disposition',
      'valid empty',
      'existing system to map',
      'new scoped card needed',
      'No fake systems',
      'Sales and Recruiting stay separate',
    ]), 'empty-group audit card contains required scope', AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID)
    addFinding(findings, /No Gmail send/.test(cardText(ownerCard)) && /No ClickUp Requested writeback/.test(cardText(ownerCard)), 'owner card records no-send/no-requested boundaries', ownerCard?.id || 'missing')
  }

  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
    { backlogId: AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID },
  )
  if (foundationBuildLog) {
    const owners = normalizeList(closeout?.backlogIds)
    const mentioned = normalizeList(closeout?.mentionedBacklogIds)
    addFinding(findings, Boolean(closeout), 'build log exposes agent onboarding feedback system closeout', AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY)
    addFinding(findings, owners.length === 1 && owners.includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID), 'closeout owns only agent onboarding feedback system card', owners.join(', ') || 'missing')
    addFinding(findings, !owners.includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID) && !owners.includes(AGENT_FEEDBACK_SEND_CARD_ID), 'empty audit and send cards remain context only', owners.join(', ') || 'none')
    addFinding(findings, mentioned.includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID), 'empty audit card is mentioned/context only', mentioned.join(', ') || 'missing')
    addFinding(findings, mentioned.includes(AGENT_FEEDBACK_SEND_CARD_ID), 'send-path card is mentioned/context only', mentioned.join(', ') || 'missing')
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
    closeoutKey: AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
    summary: {
      groupedSystemCount: systems.length,
      groupedSystemCountBefore: FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT,
      groupedSystemCountAfter: FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT,
      baselinePreservedCount,
      agentOnboardingSystemCount: agentSystems.length,
      agentOnboardingGroupCount: primaryCounts['Agent Onboarding'] || 0,
      implementationState: agentSystem?.implementationState || null,
      sendCardLane: sendCard?.lane || null,
      emptyAuditLane: emptyAuditCard?.lane || null,
      georgiaDue: knownCases.georgiaDue,
      georgiaRequestedAfterProductionEnable: knownCases.georgiaRequestedAfterProductionEnable || productionRequestLedger.georgiaRequested,
      chrisNotDue: knownCases.chrisNotDue,
      chrisDueSourceBacked: knownCases.chrisDueSourceBacked,
      chrisMetadataCurrent: knownCases.chrisMetadataCurrent || productionRequestLedger.chrisRequested,
      productionRequestLedgerCurrent: productionRequestLedger.bothRequested,
      privacyMetadataOnly: !hasPrivateLeak(`${approvedPlan}\n${baseline}\n${manualReview}`),
      closeoutOwnsOnlyAgentOnboarding: closeout
        ? normalizeList(closeout.backlogIds).length === 1 && normalizeList(closeout.backlogIds).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID)
        : false,
    },
    findings,
  }
}
