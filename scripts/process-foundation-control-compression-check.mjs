#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  FOUNDATION_CONTROL_COMPRESSION_CARD_IDS,
  FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY,
  FOUNDATION_CONTROL_COMPRESSION_EXIT_CRITERIA,
  FOUNDATION_CONTROL_COMPRESSION_NEXT_ACTION,
  buildAcknowledgedStatesSnapshot,
  buildBacklogMonitorSnapshot,
  buildFeedbackTriageSnapshot,
  buildFoundationControlCompressionSnapshot,
  buildIncrementalVerifierCoveragePlan,
  buildSprintAdvisorSnapshot,
  buildSyntheticFoundationControlCompressionFixtures,
  buildSystemFlowMapSnapshot,
} from '../lib/foundation-control-compression.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  captureFoundationFeedbackItem,
  listFoundationFeedbackItems,
} from '../lib/foundation-people-sales-db.js'
import {
  getFoundationSnapshot,
  listFoundationAcknowledgedStates,
  recordFoundationIncrementalVerifierRun,
  upsertFoundationAcknowledgedState,
} from '../lib/foundation-strategy-docs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, card: null }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--card=')) args.card = arg.slice('--card='.length)
  }
  return args
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function activeCardIds(args) {
  if (!args.card) return FOUNDATION_CONTROL_COMPRESSION_CARD_IDS
  if (!FOUNDATION_CONTROL_COMPRESSION_CARD_IDS.includes(args.card)) {
    throw new Error(`Unknown Foundation control compression card: ${args.card}`)
  }
  return [args.card]
}

async function validateApprovals(findings, cardIds) {
  for (const cardId of cardIds) {
    const approvalRef = `docs/process/approvals/${cardId}.json`
    const validation = await validatePlanApprovalFile({ repoRoot, approvalRef, cardId })
    addFinding(
      findings,
      validation.ok && Number(validation.approval?.score) >= 9.8,
      `${cardId} approval file is valid at 9.8+`,
      validation.failures?.map(item => item.check).join(', ') || approvalRef
    )
  }
}

function getBacklogCount(snapshot) {
  return Array.isArray(snapshot.backlogItems) ? snapshot.backlogItems.length : 0
}

async function main() {
  const args = parseArgs()
  const requestedCards = activeCardIds(args)
  const findings = []

  await initFoundationDb()
  await validateApprovals(findings, requestedCards)

  const beforeSnapshot = await getFoundationSnapshot()
  const beforeBacklogCount = getBacklogCount(beforeSnapshot)
  const activeSprint = await getActiveFoundationCurrentSprint()
  const closeouts = getFoundationBuildCloseouts()
  const fixtures = buildSyntheticFoundationControlCompressionFixtures()

  const feedback = await captureFoundationFeedbackItem(fixtures.feedback)
  const feedbackItems = await listFoundationFeedbackItems({ limit: 50 })
  const feedbackTriage = buildFeedbackTriageSnapshot({ feedbackItems: [feedback] })

  const activeAck = await upsertFoundationAcknowledgedState(fixtures.activeAck)
  const expiredAck = await upsertFoundationAcknowledgedState(fixtures.expiredAck)
  const ackStates = await listFoundationAcknowledgedStates({ limit: 50 })
  const ackSnapshot = buildAcknowledgedStatesSnapshot({ ackStates: [activeAck, expiredAck] })

  const backlogMonitor = buildBacklogMonitorSnapshot({
    backlogItems: beforeSnapshot.backlogItems || [],
    closeouts,
  })
  const sprintAdvisor = buildSprintAdvisorSnapshot({
    backlogItems: beforeSnapshot.backlogItems || [],
    currentSprint: activeSprint,
    backlogMonitor,
  })
  const systemFlowMap = buildSystemFlowMapSnapshot({
    sources: getSourceContracts(),
    extractionControl: beforeSnapshot.extractionControl,
    intelligenceAtomSpine: beforeSnapshot.intelligenceAtomSpine,
    intelligenceSynthesis: beforeSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: beforeSnapshot.intelligenceActionRouter,
    backlogMonitor,
    feedbackTriage,
    currentSprint: activeSprint,
  })
  const incrementalFocused = buildIncrementalVerifierCoveragePlan({
    cardId: 'VERIFIER-INCREMENTAL-COVERAGE-001',
    changedFiles: ['docs/process/verifier-incremental-coverage-001-plan.md'],
  })
  const incrementalFull = await recordFoundationIncrementalVerifierRun({
    runId: 'incremental_synthetic_foundation_control_full',
    cardId: 'VERIFIER-INCREMENTAL-COVERAGE-001',
    changedFiles: ['server.js', 'scripts/foundation-verify.mjs'],
    metadata: { synthetic: true },
  })
  const controlSnapshot = buildFoundationControlCompressionSnapshot({
    backlogItems: beforeSnapshot.backlogItems || [],
    closeouts,
    currentSprint: activeSprint,
    feedbackItems,
    ackStates,
    sources: getSourceContracts(),
    extractionControl: beforeSnapshot.extractionControl,
    intelligenceAtomSpine: beforeSnapshot.intelligenceAtomSpine,
    intelligenceSynthesis: beforeSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: beforeSnapshot.intelligenceActionRouter,
  })
  const afterSnapshot = await getFoundationSnapshot()
  const afterBacklogCount = getBacklogCount(afterSnapshot)

  addFinding(findings, activeSprint.sprint?.sprintId === 'foundation-control-backlog-compression-2026-05-13', 'Current Sprint is Foundation Control + Backlog Compression', activeSprint.sprint?.sprintId || 'missing')
  addFinding(
    findings,
    FOUNDATION_CONTROL_COMPRESSION_EXIT_CRITERIA.every(criterion => (activeSprint.sprint?.metadata?.exitCriteria || []).includes(criterion)) &&
      String(activeSprint.sprint?.metadata?.nextAction || '').toLowerCase().includes('sprint review/rollover') &&
      activeSprint.sprint?.metadata?.nextAction === FOUNDATION_CONTROL_COMPRESSION_NEXT_ACTION,
    'Current Sprint metadata carries exit criteria and sprint-review rollover action',
    `exitCriteria=${activeSprint.sprint?.metadata?.exitCriteria?.length || 0} nextAction=${activeSprint.sprint?.metadata?.nextAction || 'missing'}`,
  )
  addFinding(findings, requestedCards.every(cardId => activeSprint.planCriticRuns?.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8)), 'Requested cards have Plan Critic pass rows', requestedCards.join(', '))
  addFinding(findings, feedback.feedbackId === fixtures.feedback.feedbackId && feedback.reviewStatus === 'captured', 'FEEDBACK-CAPTURE-001 writes durable captured feedback', feedback.feedbackId)
  addFinding(findings, feedbackTriage.proposalOnly && feedbackTriage.writesBacklog === false && feedbackTriage.proposals[0]?.category !== 'needs_review', 'FEEDBACK-TRIAGE-001 returns proposal-only classification', feedbackTriage.proposals[0]?.category || 'missing')
  addFinding(findings, backlogMonitor.proposalOnly && backlogMonitor.writesBacklog === false && backlogMonitor.counts.total >= 300 && backlogMonitor.counts.foundationResearch >= 100, 'BACKLOG-MONITOR-001 reports live backlog pressure without mutation', JSON.stringify(backlogMonitor.counts))
  addFinding(findings, sprintAdvisor.proposalOnly && sprintAdvisor.opensSprint === false && sprintAdvisor.options.length >= 3, 'SPRINT-MASTER-ADVISOR-001 proposes options without opening sprints', String(sprintAdvisor.options.length))
  addFinding(findings, systemFlowMap.liveData && systemFlowMap.nodes.length >= 8 && /sources -->\\|source targets feed jobs\\| crawl/.test(systemFlowMap.mermaid), 'SYSTEM-FLOW-MAP-001 generates live Mermaid flow', `${systemFlowMap.nodes.length} nodes`)
  addFinding(findings, controlSnapshot.doneVelocity.totalDone >= 100 && controlSnapshot.doneVelocity.writesBacklog === false, 'FOUNDATION-DONE-VELOCITY-001 computes done velocity without card mutation', String(controlSnapshot.doneVelocity.totalDone))
  addFinding(findings, ackSnapshot.suppressesCriticalVerifierFailures === false && ackSnapshot.expiredCount >= 1 && ackSnapshot.activeCount >= 1, 'PROCESS-ACK-STATES-001 tracks active and expired acknowledgements without suppression', `active=${ackSnapshot.activeCount} expired=${ackSnapshot.expiredCount}`)
  addFinding(findings, incrementalFocused.focusedProofAllowed === true && incrementalFull.fullVerifyRequired === true && incrementalFull.replacesFoundationVerify === false, 'VERIFIER-INCREMENTAL-COVERAGE-001 allows focused proof but falls back to full for protected paths', `${incrementalFocused.gateLevel}/${incrementalFull.gateLevel}`)
  addFinding(findings, beforeBacklogCount === afterBacklogCount, 'Foundation control proof does not mutate backlog row count', `${beforeBacklogCount} -> ${afterBacklogCount}`)
  addFinding(findings, controlSnapshot.proposalOnly && controlSnapshot.writesBacklog === false && controlSnapshot.writesSprint === false, 'Foundation control snapshot is proposal-only', controlSnapshot.closeoutKey)
  addFinding(findings, closeouts.some(closeout => closeout.key === FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY), 'Closeout record exists for Foundation control compression', FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY)

  const failures = findings.filter(finding => !finding.ok)
  const result = {
    status: failures.length ? 'unhealthy' : 'healthy',
    closeoutKey: FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY,
    requestedCards,
    summary: {
      feedbackId: feedback.feedbackId,
      feedbackItems: feedbackItems.length,
      ackStates: ackStates.length,
      backlogCount: afterBacklogCount,
      sprintOptions: sprintAdvisor.options.length,
      flowNodes: systemFlowMap.nodes.length,
      doneVelocityTotal: controlSnapshot.doneVelocity.totalDone,
      sprintExitCriteria: activeSprint.sprint?.metadata?.exitCriteria?.length || 0,
    },
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation control compression check: ${result.status}`)
    for (const finding of findings) {
      console.log(`${finding.ok ? 'PASS' : 'FAIL'} ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
