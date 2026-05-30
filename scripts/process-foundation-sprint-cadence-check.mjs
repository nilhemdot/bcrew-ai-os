#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { promisify } from 'node:util'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_CURRENT_SPRINT_ACTIVE_CARD_IDS,
  FOUNDATION_CURRENT_SPRINT_ID,
  FOUNDATION_CURRENT_SPRINT_STAGES,
  FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH,
  FOUNDATION_SPRINT_CADENCE_CARD_ID,
  FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_CADENCE_DOC_PATH,
  FOUNDATION_SPRINT_CADENCE_PLAN_PATH,
  FOUNDATION_SPRINT_CADENCE_SCRIPT_PATH,
  FOUNDATION_SPRINT_CADENCE_SUMMARY_MARKER,
  FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_EXIT_CRITERIA,
  FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
  FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  MEETING_VAULT_ACL_SCOPING_NEXT_ACTION,
  buildDefaultFoundationSprintSeed,
  buildFoundationCurrentSprintStatus,
  buildSyntheticFoundationCurrentSprintProof,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  updateBacklogItem,
} from '../lib/foundation-backlog-sprint-db.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

async function currentHead() {
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'])
    return stdout.trim()
  } catch {
    return null
  }
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

function addFinding(findings, ok, check, detail = '', blockerCards = []) {
  if (!ok) findings.push({ check, detail, blockerCards })
}

function includesAll(text, values) {
  return values.every(value => text.includes(value))
}

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  const forbidden = [
    /content_text/i,
    /raw[_-]?content/i,
    /transcriptText/i,
    /webViewLink/i,
    /https:\/\/docs\.google\.com/i,
    /emailAddress/i,
  ]
  return forbidden.filter(pattern => pattern.test(proofText)).map(pattern => String(pattern))
}

async function closeCardIfHealthy(summary) {
  if (summary.status !== 'healthy') return
  await updateBacklogItem(FOUNDATION_SPRINT_CADENCE_CARD_ID, {
    lane: 'done',
    nextAction: 'Use Current Sprint as the command view. The active sprint reset now pulls REBUILD-PLAN-RECONCILE-001 after VERIFY-GATE-TIERING-001; do not run Meeting Vault Phase B, mutate Drive permissions, or send request-access emails without separate approval.',
    statusNote: 'Closed on 2026-05-10 under `foundation-sprint-cadence-v1`. V1 adds a Current Sprint command view at the top of Recent Work with executive summary, sprint goal, current status, next card, current blocker, exit criteria, Scoping/Sprint Ready/Building Now/Returned/Done This Sprint stage rows, card definition of done, proof commands, returned reason, and next action. It updates the central sprint cadence payload, focused proof, package/verifier coverage, process doc, and rebuild state. This does not build Meeting Vault Phase B, mutate Drive permissions, send request-access emails, build broad sprint analytics, or perform broad UI polish.',
  }, 'foundation-sprint-cadence-check')
}

async function main() {
  const args = parseArgs()
  const jsonOnly = boolArg(args.json)
  const apply = boolArg(args.apply)
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const repoHead = await currentHead()

  await initFoundationDb()
  try {
    const buildingSprint = await getActiveFoundationCurrentSprint()
    const cardIds = [
      ...FOUNDATION_CURRENT_SPRINT_ACTIVE_CARD_IDS,
      FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      FOUNDATION_SPRINT_CADENCE_CARD_ID,
      'MEETING-VAULT-ACL-001',
      FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
      FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
    ]
    const buildingCards = await getBacklogItemsByIds(cardIds)
    const buildingStatus = buildFoundationCurrentSprintStatus({
      sprint: buildingSprint.sprint,
      items: buildingSprint.items,
      backlogItems: buildingCards,
      closeouts: getFoundationBuildCloseouts(),
    })

    const packageJson = await readJson('package.json')
    const [
      planSource,
      docSource,
      approvalSource,
      moduleSource,
      foundationUiSource,
      foundationSourceRegistrySource,
      foundationFubLeadSourceSource,
      foundationSystemInventorySource,
      foundationCurrentStateRenderersSource,
      foundationDecisionQuestionRenderersSource,
      sourceLifecycleRenderersSource,
      runtimeRenderersSource,
      operationsRenderersSource,
      stylesSource,
      scriptSource,
      buildLogSource,
      buildCloseoutRecordsSource,
      buildCloseoutCleanupRecordsSource,
      buildCloseoutOvernightRecordsSource,
      currentPlan,
      currentState,
      captureSource,
    ] = await Promise.all([
      readText(FOUNDATION_SPRINT_CADENCE_PLAN_PATH),
      readText(FOUNDATION_SPRINT_CADENCE_DOC_PATH),
      readText(FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH),
      readText('lib/foundation-current-sprint.js'),
      readText('public/foundation.js'),
      readText('public/foundation-source-registry-renderers.js'),
      readText('public/foundation-fub-lead-source-renderers.js'),
      readText('public/foundation-system-inventory-renderers.js'),
      readText('public/foundation-current-state-renderers.js'),
      readText('public/foundation-decision-question-renderers.js'),
      readText('public/foundation-source-lifecycle-renderers.js'),
      readText('public/foundation-runtime-renderers.js'),
      readText('public/foundation-operations-renderers.js'),
      readText('public/styles.css'),
      readText(FOUNDATION_SPRINT_CADENCE_SCRIPT_PATH),
      readText('lib/foundation-build-log.js'),
      readText('lib/foundation-build-closeout-records.js'),
      readText('lib/foundation-build-closeout-cleanup-records.js'),
      readText('lib/foundation-build-closeout-overnight-records.js'),
      readText('docs/rebuild/current-plan.md'),
      readText('docs/rebuild/current-state.md'),
      readText('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-10-foundation-sprint-capture.md'),
    ])
    const approval = JSON.parse(approvalSource)
    const approvalValidation = await validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH,
      cardId: FOUNDATION_SPRINT_CADENCE_CARD_ID,
    })
    const synthetic = buildSyntheticFoundationCurrentSprintProof()
    const liveCardMap = new Map(buildingCards.map(card => [card.id, card]))
    const cadenceCard = liveCardMap.get(FOUNDATION_SPRINT_CADENCE_CARD_ID)
    const systemCard = liveCardMap.get(FOUNDATION_SPRINT_SYSTEM_CARD_ID)
    const meetingCard = liveCardMap.get('MEETING-VAULT-ACL-001')
    const cadencePayload = buildingStatus.cadence || {}
    const frontendSource = `${foundationUiSource}\n${foundationSourceRegistrySource}\n${foundationFubLeadSourceSource}\n${foundationSystemInventorySource}\n${foundationCurrentStateRenderersSource}\n${foundationDecisionQuestionRenderersSource}\n${sourceLifecycleRenderersSource}\n${runtimeRenderersSource}\n${operationsRenderersSource}`
    const buildLogRegistrySource = [
      buildLogSource,
      buildCloseoutRecordsSource,
      buildCloseoutCleanupRecordsSource,
      buildCloseoutOvernightRecordsSource,
    ].join('\n')
    const stageKeys = FOUNDATION_CURRENT_SPRINT_STAGES.map(stage => stage.key)
    const activeSprintCompleteReview =
      Number(buildingStatus.summary?.itemCount || 0) > 0 &&
      Number(buildingStatus.summary?.doneThisSprintCount || 0) === Number(buildingStatus.summary?.itemCount || 0) &&
      !cadencePayload.currentBlocker?.cardId &&
      /sprint review|review\/rollover/i.test(cadencePayload.nextAction || '')
    const cadenceHasActiveNextMove = Boolean(cadencePayload.nextCard?.cardId && cadencePayload.currentBlocker?.cardId)
    const findings = []

    addFinding(findings, buildingStatus.status === 'healthy', 'building cadence overlay is healthy before closeout', buildingStatus.findings.map(item => `${item.check}:${item.detail}`).join(' | '), [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, synthetic.ok, 'synthetic sprint guard still catches missing ready check and returned reason', 'synthetic proof failed', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, cadencePayload.executiveSummary && cadencePayload.sprintGoal && cadencePayload.currentStatus && (cadenceHasActiveNextMove || activeSprintCompleteReview) && Array.isArray(cadencePayload.exitCriteria) && cadencePayload.exitCriteria.length > 0 && cadencePayload.nextAction, 'cadence payload has command-view summary, goal, status, next move or review state, exit criteria, and next action', JSON.stringify(cadencePayload), [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, stageKeys.join(',') === 'scoping,sprint_ready,building_now,returned,done_this_sprint', 'stage registry uses command-view order', stageKeys.join(','), [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, FOUNDATION_SPRINT_EXIT_CRITERIA.some(item => item.includes('executive summary')) && FOUNDATION_SPRINT_EXIT_CRITERIA.some(item => item.includes('No Drive permission mutation')), 'exit criteria include visibility and no-Drive guard', FOUNDATION_SPRINT_EXIT_CRITERIA.join(' | '), [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, systemCard?.lane === 'done', 'FOUNDATION-SPRINT-SYSTEM-001 remains done this sprint', systemCard?.lane || 'missing', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, ['scoped', 'executing', 'done'].includes(cadenceCard?.lane), 'FOUNDATION-SPRINT-CADENCE-001 has a valid live backlog lane before proof closeout', cadenceCard?.lane || 'missing', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, (cadencePayload.nextCard?.cardId === 'REBUILD-PLAN-RECONCILE-001' && cadencePayload.currentBlocker?.cardId === 'REBUILD-PLAN-RECONCILE-001') || activeSprintCompleteReview, 'cadence payload follows active sprint reset or completed-sprint review state', JSON.stringify({ nextCard: cadencePayload.nextCard?.cardId, blocker: cadencePayload.currentBlocker?.cardId, currentStatus: cadencePayload.currentStatus, nextAction: cadencePayload.nextAction, meetingVaultLane: meetingCard?.lane || null }), [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, includesAll(moduleSource, [
      'FOUNDATION_SPRINT_CADENCE_CARD_ID',
      'FOUNDATION_SPRINT_EXIT_CRITERIA',
      'executiveSummary',
      'nextCard',
      'currentBlocker',
      'stageCounts',
    ]), 'central sprint module owns cadence payload', 'missing module markers', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, includesAll(frontendSource, [
      'Sprint command view',
      'current-sprint-command-grid',
      'current-sprint-board',
      'Exit criteria',
      'Next action',
      'returned',
      'done_this_sprint',
    ]), 'Recent Work renders command-view fields', 'missing UI markers', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, includesAll(stylesSource, [
      '.current-sprint-command-grid',
      '.current-sprint-command-strip',
      '.current-sprint-exit',
      '.current-sprint-board',
      '.current-sprint-stage-row',
    ]) && !stylesSource.includes('.current-sprint-stage-grid'), 'Current Sprint layout is readable board/rows, not skinny five-column cards', 'layout markers missing or old skinny grid remains', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, packageJson.scripts?.['process:foundation-sprint-cadence-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-sprint-cadence-check.mjs', 'package exposes process:foundation-sprint-cadence-check', 'missing package script', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, approvalValidation.ok && approval.cardId === FOUNDATION_SPRINT_CADENCE_CARD_ID && Number(approval.score) >= 9.8 && approval.approvedPlanRef === FOUNDATION_SPRINT_CADENCE_PLAN_PATH, 'approval artifact records 9.8 approval', approvalValidation.failures?.map(item => item.detail).join(' | ') || approval.cardId, [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, includesAll(planSource, [
      'executive sprint summary',
      'current status',
      'next card',
      'current blocker',
      'exit criteria',
      'No Google Drive permission mutation is approved',
    ]), 'plan captures required sprint command fields and Drive boundary', 'missing plan markers', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, includesAll(docSource, [
      FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
      "The Current Sprint panel is Steve's sprint command view",
      'No Google Drive permission mutations',
      'No request-access emails',
    ]), 'process doc records cadence contract and no-Drive boundary', 'missing doc markers', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, includesAll(scriptSource, [
      FOUNDATION_SPRINT_CADENCE_SUMMARY_MARKER,
      'Current Sprint layout is readable board/rows',
      'REBUILD-PLAN-RECONCILE-001',
    ]), 'focused process script owns proof markers', 'missing script markers', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, includesAll(buildLogRegistrySource, [
      FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
      FOUNDATION_SPRINT_CADENCE_CARD_ID,
      'MEETING-VAULT-ACL-001',
      'No Drive permission mutation',
    ]), 'Recent Work closeout record owns cadence card and Meeting Vault context', 'missing build-log markers', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, currentPlan.includes(FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY) && currentPlan.includes(FOUNDATION_SPRINT_CADENCE_CARD_ID), 'current plan records cadence closeout', 'missing current-plan markers', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, currentState.includes(FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY) && currentState.includes('sprint command view') && currentState.includes('VERIFY-GATE-TIERING-001') && currentState.includes('REBUILD-PLAN-RECONCILE-001'), 'current state records command-view closeout and active sprint reset', 'missing current-state markers', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, captureSource.includes(FOUNDATION_SPRINT_CADENCE_CARD_ID) && captureSource.includes('No Drive permission mutation is approved'), 'handoff captures sprint cadence correction', 'missing capture markers', [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES.some(boundary => boundary.includes('MEETING-VAULT-ACL-001 Phase B')) && FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES.some(boundary => boundary.includes('Drive permissions')) && FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES.some(boundary => boundary.includes('request-access emails')), 'not-next boundaries block Meeting Vault Phase B, Drive mutation, and request emails', FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES.join(' | '), [FOUNDATION_SPRINT_CADENCE_CARD_ID])
    addFinding(findings, noRawProof({ buildingStatus, cadencePayload, stageKeys }).length === 0, 'proof output is metadata-only', noRawProof({ buildingStatus, cadencePayload, stageKeys }).join(', '), [FOUNDATION_SPRINT_CADENCE_CARD_ID])

    const preliminaryHealthy = findings.length === 0
    const summary = {
      status: preliminaryHealthy ? 'healthy' : 'blocked',
      cardId: FOUNDATION_SPRINT_CADENCE_CARD_ID,
      closeoutKey: FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
      repoHead,
      sprintId: FOUNDATION_CURRENT_SPRINT_ID,
      stageKeys,
      buildingOverlayStatus: buildingStatus.status,
      cadence: cadencePayload,
      syntheticOk: synthetic.ok,
      findings,
      apiStatus: null,
    }

    if (apply) {
      await closeCardIfHealthy(summary)
    } else {
      summary.writebackSkipped = 'read-only default; pass --apply to write historical closeout state'
    }

    try {
      const api = await fetchJson(baseUrl, '/api/foundation/current-sprint')
      summary.apiStatus = api.currentSprint?.status || null
      if (summary.status === 'healthy' && api.currentSprint?.status !== 'healthy') {
        summary.status = 'blocked'
        findings.push({
          check: 'served API returns healthy cadence payload',
          detail: JSON.stringify((api.currentSprint?.findings || []).slice(0, 3)),
          blockerCards: [FOUNDATION_SPRINT_CADENCE_CARD_ID],
        })
      }
      if (summary.status === 'healthy' && !api.currentSprint?.cadence?.executiveSummary) {
        summary.status = 'blocked'
        findings.push({
          check: 'served API includes cadence command summary',
          detail: 'missing cadence.executiveSummary',
          blockerCards: [FOUNDATION_SPRINT_CADENCE_CARD_ID],
        })
      }
    } catch (error) {
      summary.status = 'blocked'
      findings.push({
        check: 'served API exposes Current Sprint cadence',
        detail: error instanceof Error ? error.message : String(error),
        blockerCards: [FOUNDATION_SPRINT_CADENCE_CARD_ID],
      })
    }

    if (!jsonOnly) {
      console.log('Foundation Sprint Cadence proof')
      console.log(`  Card: ${FOUNDATION_SPRINT_CADENCE_CARD_ID}`)
      console.log(`  Closeout: ${FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY}`)
      console.log(`  Repo: ${repoHead ? repoHead.slice(0, 7) : 'unknown'}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Sprint: ${summary.sprintId}`)
      console.log(`  Stages: ${stageKeys.join(', ')}`)
      console.log(`  API status: ${summary.apiStatus || 'missing'}`)
      for (const finding of findings) {
        console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
      }
    }

    console.log(`${FOUNDATION_SPRINT_CADENCE_SUMMARY_MARKER} ${JSON.stringify(summary)}`)
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(async error => {
  console.error('Foundation Sprint Cadence proof failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
  await closeFoundationDb().catch(() => {})
})
