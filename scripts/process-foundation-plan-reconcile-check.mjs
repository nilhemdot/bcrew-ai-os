#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  CURRENT_SPRINT_DYNAMIC_TRUTH_CLOSEOUT_KEY,
  FOUNDATION_PLAN_RECONCILE_APPROVAL_PATH,
  FOUNDATION_PLAN_RECONCILE_CARD_ID,
  FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY,
  FOUNDATION_PLAN_RECONCILE_PLAN_PATH,
  FOUNDATION_PLAN_RECONCILE_SCRIPT_PATH,
  SPRINT_STAGE_GATE_CLOSEOUT_KEY,
} from '../lib/foundation-current-sprint.js'

// liveTruthPosture: historical_closeout_only - this proof reconciles the closed control-plane sprint against current docs/API truth.
const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'
const SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12'
const PROCESS_REPAIR_SPRINT_ID = 'process-repair-verifier-independence-2026-05-12'

const SPRINT_CARD_IDS = [
  'CURRENT-SPRINT-DYNAMIC-TRUTH-001',
  'SPRINT-STAGE-GATE-001',
  FOUNDATION_PLAN_RECONCILE_CARD_ID,
  'CONNECTOR-CREDENTIAL-001',
  'LLM-AUTH-AUDIT-001',
  'SOURCE-EXTRACTION-GAP-FOLLOWUP-001',
]

const REQUIRED_CLOSEOUT_KEYS = [
  'foundation-ui-complete-v1',
  'connector-routing-truth-v1',
  'connector-routing-process-repair-v1',
  CURRENT_SPRINT_DYNAMIC_TRUTH_CLOSEOUT_KEY,
  SPRINT_STAGE_GATE_CLOSEOUT_KEY,
]

const NEXT_SPRINT_QUEUE = [
  'ATOM-FLOW-AUTO-DEMOTION-001',
  'EXTRACT-RUN-HARDENING-EXECUTION-001',
  'RESEARCH-LANE-PURGE-001',
]

const STEVE_FRESH_RUN_ORDER_CARD_IDS = [
  'FOUNDATION-GATE-CHECK-SERIALIZATION-001',
  'BRAIN-FLEET-FOUNDATION-001',
  'HARLAN-AUTH-ESCALATION-LOOP-001',
  'BRAIN-FLEET-QUOTA-LEDGER-001',
  'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001',
  'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001',
  'GEMINI-VIDEO-BRAIN-ROUTE-001',
  'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001',
  'OPENCLAW-ADAPTER-BOUNDARY-001',
  'EXTRACTOR-BRAIN-FLEET-PROOF-001',
  'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001',
]

const STEVE_APPROVAL_GATED_CONTINUATION_CARD_IDS = [
  'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001',
  'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
  'EXTRACTOR-OVERNIGHT-RUN-GUARD-001',
  'BUILD-INTEL-EXTRACTION-IMPLEMENTATION',
  'FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001',
  'STRATEGY-003',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rawValue] = arg.slice(2).split('=')
    args[key] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

async function readText(relativePath) {
  return fs.readFile(relativePath, 'utf8')
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath))
}

async function fetchJson(baseUrl, pathname, timeoutMs = 120000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(pathname, baseUrl), { signal: controller.signal })
    const text = await response.text()
    if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}: ${text.slice(0, 240)}`)
    return text ? JSON.parse(text) : {}
  } finally {
    clearTimeout(timeout)
  }
}

function includesAll(text, values = []) {
  return values.every(value => text.includes(value))
}

function sectionBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker)
  if (start === -1) return ''
  const end = text.indexOf(endMarker, start + startMarker.length)
  return end === -1 ? text.slice(start) : text.slice(start, end)
}

function findStaleActiveSprintMarkers(currentPlanActiveSection, currentStateShortVersion) {
  const staleMarkers = [
    `## Current Sprint: Foundation Source Once-Over`,
    `The active sprint is \`${SOURCE_ONCE_OVER_SPRINT_ID}\`.`,
    'The active sprint is now the Foundation Source Once-Over sprint.',
    'Current sprint active blocker remains pinned to `FOUNDATION-UI-COMPLETE-001`',
    `The active overlay before rollover is \`${PROCESS_REPAIR_SPRINT_ID}\``,
  ]
  const currentText = `${currentPlanActiveSection}\n${currentStateShortVersion}`
  return staleMarkers.filter(marker => currentText.includes(marker))
}

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  return [
    /raw[_-]?content/i,
    /content_text/i,
    /transcriptText/i,
    /webViewLink/i,
    /https:\/\/docs\.google\.com/i,
    /password/i,
    /secret/i,
  ].filter(pattern => pattern.test(proofText)).map(pattern => String(pattern))
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const findings = []

  const [
    currentPlan,
    currentState,
    handoff,
    planSource,
    scriptSource,
    packageJson,
    api,
  ] = await Promise.all([
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-12-control-plane-sprint-handoff.md'),
    readText(FOUNDATION_PLAN_RECONCILE_PLAN_PATH),
    readText(FOUNDATION_PLAN_RECONCILE_SCRIPT_PATH),
    readJson('package.json'),
    fetchJson(baseUrl, '/api/foundation/current-sprint'),
  ])

  const approvalValidation = await validatePlanApprovalFile({
    repoRoot: process.cwd(),
    approvalRef: FOUNDATION_PLAN_RECONCILE_APPROVAL_PATH,
    cardId: FOUNDATION_PLAN_RECONCILE_CARD_ID,
  })

  const currentSprint = api.currentSprint || {}
  const stageItems = (currentSprint.stages || []).flatMap(stage => stage.items || [])
  const stageItemMap = new Map(stageItems.map(item => [item.cardId, item]))
  const activeBlockerCardId = currentSprint.activeBlocker?.cardId || null
  const currentPlanActiveSection = sectionBetween(currentPlan, '## Current Sprint:', '## Current Reality')
  const currentStateShortVersion = sectionBetween(currentState, '## Short Version', '\nBuilt:')
  const staleActiveMarkers = findStaleActiveSprintMarkers(currentPlanActiveSection, currentStateShortVersion)
  const docsText = `${currentPlan}\n${currentState}`
  const activeDocsText = `${currentPlanActiveSection}\n${currentStateShortVersion}`
  const historicalControlPlaneCardsDocumented = SPRINT_CARD_IDS.filter(cardId => currentPlan.includes(cardId) && currentState.includes(cardId))
  const activeBlockerDocumented = activeBlockerCardId ? activeDocsText.includes(activeBlockerCardId) : true

  addFinding(findings, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan Critic approval file is valid at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, packageJson.scripts?.['process:foundation-plan-reconcile-check'] === `node --env-file-if-exists=.env ${FOUNDATION_PLAN_RECONCILE_SCRIPT_PATH}`, 'package exposes focused foundation-plan reconcile proof')
  addFinding(findings, currentSprint.status === 'healthy', 'live Current Sprint API is healthy', currentSprint.status || 'missing')
  addFinding(
    findings,
    Boolean(currentSprint.sprintId) &&
      activeBlockerDocumented &&
      currentPlan.includes('Current Sprint API owns the active blocker') &&
      currentState.includes('Current Sprint API owns the active blocker'),
    'active Current Sprint docs match live API truth',
    `${currentSprint.sprintId || 'missing'}:${activeBlockerCardId || 'none'}:documented=${activeBlockerDocumented}`,
  )
  addFinding(findings, historicalControlPlaneCardsDocumented.length === SPRINT_CARD_IDS.length, 'historical control-plane sprint cards remain documented', SPRINT_CARD_IDS.filter(cardId => !historicalControlPlaneCardsDocumented.includes(cardId)).join(', '))
  addFinding(
    findings,
    activeBlockerCardId === null || !SPRINT_CARD_IDS.includes(activeBlockerCardId) || currentSprint.sprintId === SPRINT_ID,
    'historical control-plane sprint is not treated as current unless active',
    `${currentSprint.sprintId || 'missing'}:${activeBlockerCardId || 'none'}`,
  )
  addFinding(findings, currentPlan.includes(SPRINT_ID) && currentState.includes(SPRINT_ID), 'plan and state preserve historical control-plane sprint closeout', `plan=${currentPlan.includes(SPRINT_ID)} state=${currentState.includes(SPRINT_ID)}`)
  addFinding(findings, currentPlan.includes('Current Sprint API owns the active blocker') && currentState.includes('Current Sprint API owns the active blocker'), 'docs route active-blocker truth to the live API')
  addFinding(findings, STEVE_FRESH_RUN_ORDER_CARD_IDS.every(cardId => currentPlan.includes(cardId) && currentState.includes(cardId)), 'docs record Steve fresh Brain Fleet/extractor readiness run order', STEVE_FRESH_RUN_ORDER_CARD_IDS.filter(cardId => !(currentPlan.includes(cardId) && currentState.includes(cardId))).join(', '))
  addFinding(findings, STEVE_APPROVAL_GATED_CONTINUATION_CARD_IDS.every(cardId => currentPlan.includes(cardId) && currentState.includes(cardId)), 'docs record approval-gated continuation and parked Strategy boundary', STEVE_APPROVAL_GATED_CONTINUATION_CARD_IDS.filter(cardId => !(currentPlan.includes(cardId) && currentState.includes(cardId))).join(', '))
  addFinding(findings, staleActiveMarkers.length === 0, 'stale active sprint markers are rejected from active sections', staleActiveMarkers.join(' | '))
  addFinding(findings, REQUIRED_CLOSEOUT_KEYS.every(key => docsText.includes(key)), 'docs record shipped sprint closeouts before the control-plane sprint', REQUIRED_CLOSEOUT_KEYS.filter(key => !docsText.includes(key)).join(', '))
  addFinding(findings, SPRINT_CARD_IDS.every(cardId => currentPlan.includes(cardId) && currentState.includes(cardId)), 'docs list every approved control-plane sprint card')
  addFinding(findings, NEXT_SPRINT_QUEUE.every(cardId => currentPlan.includes(cardId) && currentState.includes(cardId)), 'docs queue but do not pull the next source-truth sprint cards')
  addFinding(
    findings,
    currentPlan.toLowerCase().includes('queued, not pulled') && currentState.toLowerCase().includes('queued, not pulled'),
    'next source-truth cards are explicitly not pulled into tonight',
  )
  addFinding(
    findings,
    includesAll(docsText, [
      'Do not run MEETING-VAULT-ACL-001 Phase B',
      'mutate Drive permissions',
      'send request-access emails',
      'Stop at sprint review',
    ]),
    'docs preserve not-next boundaries and sprint-review stop',
  )
  addFinding(findings, handoff.includes(SPRINT_ID) && handoff.includes('Stop at sprint review'), 'current handoff remains the overnight sprint handoff')
  addFinding(
    findings,
    includesAll(scriptSource, [
      "fetchJson(baseUrl, '/api/foundation/current-sprint')",
      'sectionBetween',
      'stale active sprint markers are rejected',
      'noRawProof',
    ]) && !scriptSource.includes(['currentPlan.includes', 'SOURCE_ONCE_OVER_SPRINT_ID'].join('(')),
    'proof compares live API and current doc sections instead of weak marker-only checks',
  )
  addFinding(findings, includesAll(planSource, [
    '/api/foundation/current-sprint',
    'rejects stale markers',
    'not source substring alone',
  ]), 'scoped plan requires API/doc comparison behavior')

  const summary = {
    status: findings.length ? 'blocked' : 'healthy',
    cardId: FOUNDATION_PLAN_RECONCILE_CARD_ID,
    closeoutKey: FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY,
    sprintId: currentSprint.sprintId || null,
    apiStatus: currentSprint.status || null,
    activeBlockerCardId,
    activeSprintCardsPresent: Array.from(stageItemMap.keys()),
    historicalControlPlaneCardsDocumented,
    queuedNextSprintCards: NEXT_SPRINT_QUEUE,
    staleActiveMarkers,
    rawProofFindings: [],
    findings,
  }
  summary.rawProofFindings = noRawProof(summary)
  if (summary.rawProofFindings.length) {
    summary.status = 'blocked'
    summary.findings.push({
      check: 'proof output is metadata-only',
      detail: summary.rawProofFindings.join(', '),
    })
  }

  if (jsonMode) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Foundation plan reconcile proof')
    console.log(`  Card: ${FOUNDATION_PLAN_RECONCILE_CARD_ID}`)
    console.log(`  Closeout: ${FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY}`)
    console.log(`  Sprint: ${summary.sprintId || 'missing'}`)
    console.log(`  Status: ${summary.status}`)
    console.log(`  Active blocker: ${activeBlockerCardId || 'none'}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (summary.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
