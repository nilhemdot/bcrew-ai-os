import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  findFoundationBuildCloseoutEntry,
  readFoundationBuildLogRegistrySource,
} from './foundation-build-log-source.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID = 'FOUNDATION-FOLLOWUP-CARD-CAPTURE-001'
export const FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY = 'foundation-followup-card-capture-v1'
export const FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH = 'docs/process/approved-plans/foundation-followup-card-capture-v1.md'
export const FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-FOLLOWUP-CARD-CAPTURE-001.json'
export const FOUNDATION_FOLLOWUP_CARD_CAPTURE_AUDIT_PATH = 'docs/audits/2026-04-30-foundation-followup-card-capture.md'

export const FOUNDATION_FOLLOWUP_BUILD_ORDER = [
  'FOUNDATION-SYSTEMS-SERVICE-GROUPING-001',
  'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
  'AGENT-FEEDBACK-SEND-001',
]

const FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID = FOUNDATION_FOLLOWUP_BUILD_ORDER[0]
const FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY = 'foundation-systems-service-grouping-v1'
const AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID = FOUNDATION_FOLLOWUP_BUILD_ORDER[1]
const AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY = 'agent-onboarding-feedback-system-v1'

export const FOUNDATION_SYSTEMS_SERVICE_GROUPS = [
  'Foundation / Control Plane',
  'Strategy / Leadership',
  'Sales',
  'Recruiting',
  'Marketing - Clients',
  'Marketing - Agents',
  'Agent Onboarding',
  'Client Onboarding',
  'Closing / Deals',
  'Finance',
  'Operations',
  'Source Intelligence / Extraction',
  'People / Retention',
  'Review Queues / Accountability',
]

export const FOUNDATION_FOLLOWUP_REQUIRED_CARD_CONTEXT = {
  'FOUNDATION-SYSTEMS-SERVICE-GROUPING-001': [
    ...FOUNDATION_SYSTEMS_SERVICE_GROUPS,
    'Sales and Recruiting must stay separate',
    'No combined Sales/Recruiting bucket',
    'primary + secondary service area',
  ],
  'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001': [
    'System name: Agent Onboarding Feedback',
    'Operating area: Agent Onboarding',
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
    'Contract Link is warning-only',
    'expired send window',
    'missing/invalid feedback fields',
    'Ops Hub Agent Roster queue',
    '/api/owners/review-queue',
    'ClickUp task',
    'agent_onboarding_feedback_responses',
    'Gmail send proof once send path exists',
    'private feedback links',
    'no private feedback content broadly exposed',
    'approved owner/review surfaces',
    'Georgia: Real Start Date 2026-03-29, Day-30 due 2026-04-28, due item exists',
    'Chris: does not fire until Real Start Date is set/readable',
  ],
  'AGENT-FEEDBACK-SEND-001': [
    'Dry-run first',
    'No real send without Steve',
    'Steve Zahnd Day-30 dry-run is eligible through Company Email',
    'Agent Feedback sends use ClickUp Company Email only',
    'BCC/internal oversight roles Steve, Carson, Ryan, and Georgia',
    'Capture Gmail message/thread ID',
    'Mark Requested in ClickUp only after Gmail send succeeds',
    'Duplicate send protection',
    'No send if Company Email is missing or invalid',
    'No send if milestone window expired',
    'Contract Link is warning/data-quality metadata only',
    'Submitted feedback still writes Completed, score, and feedback text back to the correct ClickUp Onboarding NPS 30/60/90 Status, Score, and Feedback fields',
    'Feedback response is stored in the agent_onboarding_feedback_responses table with task ID, agent name, milestone day, token hash, score, feedback, and submitted timestamp',
    'Feedback content is not broadly exposed outside approved owner/review surfaces',
  ],
}

export const FOUNDATION_FOLLOWUP_NON_SCOPE_PHRASES = [
  'No Gmail send',
  'No ClickUp Requested writeback',
  'No Systems grouping implementation',
  'No feature work',
  'No Strategy, Scoper, Agent Factory, corpus, source expansion, or research cleanup',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
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

function orderedBuildTextPresent(source) {
  const first = source.indexOf('1. FOUNDATION-SYSTEMS-SERVICE-GROUPING-001')
  const second = source.indexOf('2. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001')
  const third = source.indexOf('3. AGENT-FEEDBACK-SEND-001')
  return first >= 0 && second > first && third > second
}

function followupCardStateIsAllowed(card) {
  if (!card) return false
  if (card.id === FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID) {
    return card.lane === 'scoped' ||
      (card.lane === 'done' && cardText(card).includes(FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY))
  }
  if (card.id === AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID) {
    return card.lane === 'scoped' ||
      (card.lane === 'done' && cardText(card).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY))
  }
  if (card.id === 'AGENT-FEEDBACK-SEND-001') {
    return card.lane === 'scoped' ||
      (card.lane === 'done' && cardText(card).includes('agent-feedback-send-v1'))
  }
  return card.lane === 'scoped'
}

export async function buildFoundationFollowupCardCaptureStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
} = {}) {
  const findings = []
  const packageJson = await readOptionalText(repoRoot, 'package.json')
  const seedSource = [
    await readOptionalText(repoRoot, 'lib/foundation-db.js'),
    await readOptionalText(repoRoot, 'lib/foundation-backlog-seed.js'),
  ].join('\n')
  const buildLogSource = await readFoundationBuildLogRegistrySource(repoRoot)
  const foundationVerifySource = await readOptionalText(repoRoot, 'scripts/foundation-verify.mjs')
  const approvedPlan = await readOptionalText(repoRoot, FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVAL_PATH)
  const audit = await readOptionalText(repoRoot, FOUNDATION_FOLLOWUP_CARD_CAPTURE_AUDIT_PATH)
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVAL_PATH)
  addFinding(findings, Boolean(audit), 'capture audit artifact exists', FOUNDATION_FOLLOWUP_CARD_CAPTURE_AUDIT_PATH)
  addFinding(findings, packageJson.includes('"process:foundation-followup-card-capture-check"'), 'package script exists', 'process:foundation-followup-card-capture-check')
  addFinding(findings, buildLogSource.includes(FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY), 'build log closeout exists in source', FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY)
  addFinding(findings, foundationVerifySource.includes(FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID), 'foundation verifier covers capture card', FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID)
  addFinding(findings, includesAll(approvedPlan, FOUNDATION_FOLLOWUP_NON_SCOPE_PHRASES), 'approved plan carries hard no-scope constraints', 'non-scope phrases')
  addFinding(findings, includesAll(audit, FOUNDATION_FOLLOWUP_BUILD_ORDER), 'audit names all scoped follow-up cards', FOUNDATION_FOLLOWUP_BUILD_ORDER.join(', '))
  addFinding(findings, orderedBuildTextPresent(currentPlan), 'current plan records exact next build order', 'current-plan')
  addFinding(findings, orderedBuildTextPresent(currentState), 'current state records exact next build order', 'current-state')

  for (const cardId of [FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID, ...FOUNDATION_FOLLOWUP_BUILD_ORDER]) {
    addFinding(findings, seedSource.includes(`id: '${cardId}'`), `seed contains ${cardId}`, cardId)
  }

  for (const [cardId, phrases] of Object.entries(FOUNDATION_FOLLOWUP_REQUIRED_CARD_CONTEXT)) {
    const seedIndex = seedSource.indexOf(`id: '${cardId}'`)
    const seedSlice = seedIndex >= 0 ? seedSource.slice(seedIndex, seedIndex + 4200) : ''
    addFinding(findings, includesAll(seedSlice, phrases), `seed ${cardId} contains required deep context`, phrases.filter(phrase => !seedSlice.includes(phrase)).join(', '))
  }

  let captureCard = null
  let peopleCard = null
  const followupCards = []
  if (foundationHub) {
    const backlogItems = normalizeList(foundationHub.backlogItems)
    captureCard = backlogItems.find(card => card.id === FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID) || null
    peopleCard = backlogItems.find(card => card.id === 'PEOPLE-006') || null
    for (const cardId of FOUNDATION_FOLLOWUP_BUILD_ORDER) {
      const card = backlogItems.find(item => item.id === cardId) || null
      followupCards.push(card)
      addFinding(findings, Boolean(card), `live backlog contains ${cardId}`, cardId)
      addFinding(findings, followupCardStateIsAllowed(card), `${cardId} is scoped or approved-done`, card?.lane || 'missing')
      addFinding(findings, includesAll(cardText(card), FOUNDATION_FOLLOWUP_REQUIRED_CARD_CONTEXT[cardId]), `${cardId} contains required deep context`, cardId)
    }
    addFinding(findings, captureCard?.lane === 'done', 'capture owner card is done', captureCard?.lane || 'missing')
    addFinding(findings, /foundation-followup-card-capture-v1/.test(captureCard?.statusNote || ''), 'capture owner card status note records closeout', captureCard?.statusNote || 'missing')
    addFinding(findings, Boolean(peopleCard), 'PEOPLE-006 remains present as related context', peopleCard?.lane || 'missing')
  }

  const closeout = findFoundationBuildCloseoutEntry(
    foundationBuildLog,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY,
    { backlogId: FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID },
  )
  if (foundationBuildLog) {
    const owners = normalizeList(closeout?.backlogIds)
    const mentioned = normalizeList(closeout?.mentionedBacklogIds)
    addFinding(findings, Boolean(closeout), 'build log exposes capture closeout', FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY)
    addFinding(findings, owners.length === 1 && owners.includes(FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID), 'closeout owns only capture card', owners.join(', ') || 'missing')
    addFinding(findings, FOUNDATION_FOLLOWUP_BUILD_ORDER.every(cardId => mentioned.includes(cardId)), 'new scoped cards are mentioned/context only', mentioned.join(', '))
    addFinding(findings, mentioned.includes('PEOPLE-006'), 'PEOPLE-006 remains mentioned/context only', mentioned.join(', '))
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
    closeoutKey: FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY,
    summary: {
      scopedCardCount: followupCards.filter(Boolean).length,
      scopedCardsRemainScoped: followupCards.filter(Boolean).every(followupCardStateIsAllowed),
      requiredGroups: FOUNDATION_SYSTEMS_SERVICE_GROUPS.length,
      buildOrder: FOUNDATION_FOLLOWUP_BUILD_ORDER,
      peopleContextOnly: Boolean(peopleCard),
      closeoutOwnsOnlyCapture: closeout
        ? normalizeList(closeout.backlogIds).length === 1 && normalizeList(closeout.backlogIds).includes(FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID)
        : false,
    },
    findings,
  }
}
