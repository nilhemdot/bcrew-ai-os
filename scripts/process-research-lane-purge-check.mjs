#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  RESEARCH_LANE_PURGE_APPROVAL_PATH,
  RESEARCH_LANE_PURGE_CARD_ID,
  RESEARCH_LANE_PURGE_CLOSEOUT_KEY,
  RESEARCH_LANE_PURGE_PLAN_PATH,
  RESEARCH_LANE_PURGE_REPORT_PATH,
  RESEARCH_LANE_PURGE_SCRIPT_PATH,
  buildResearchLanePurgeSnapshot,
  buildSyntheticResearchLanePurgeProof,
  renderResearchLanePurgeReport,
  researchLaneSignature,
} from '../lib/research-lane-purge.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationSnapshot } from '../lib/foundation-strategy-docs-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
  isProcessReportWriteRequested,
} from '../lib/process-write-guard.js'

const SPRINT_ID = 'source-truth-guardrails-2026-05-13'

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

function includesAll(source, values) {
  return values.every(value => String(source || '').includes(value))
}

async function writeReport(snapshot) {
  await fs.writeFile(RESEARCH_LANE_PURGE_REPORT_PATH, renderResearchLanePurgeReport(snapshot))
}

async function closeSprintCard(snapshot, { applyRequested = false } = {}) {
  const counts = snapshot.summary?.dispositionCounts || {}
  const current = await getActiveFoundationCurrentSprint()
  const sprint = current.sprint
  const updateCurrentSprintOverlay = sprint?.sprintId === SPRINT_ID

  if (updateCurrentSprintOverlay && !applyRequested) {
    throw new Error('Closing the active Source Truth Guardrails sprint overlay requires explicit --apply=true.')
  }

  await updateBacklogItem(RESEARCH_LANE_PURGE_CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Stop for Source Truth Guardrails sprint review/rollover; do not silently open another sprint or product work.',
    statusNote: [
      `Closed on 2026-05-13 under \`${RESEARCH_LANE_PURGE_CLOSEOUT_KEY}\`.`,
      `V1 generated \`${RESEARCH_LANE_PURGE_REPORT_PATH}\` from live backlog research rows.`,
      `The proposed-only report covers ${snapshot.summary?.researchCardCount || 0} research cards with disposition counts promote_review=${counts.promote_review || 0}, keep_review=${counts.keep_review || 0}, kill_review=${counts.kill_review || 0}, move_to_future_concepts_review=${counts.move_to_future_concepts_review || 0}.`,
      'Proof compares research-lane signatures before and after report generation, proves synthetic stale/recent/high-priority/deprecated behavior, and confirms no research card lane is changed by the report.',
      'This does not delete cards, auto-move research cards, edit or create a future-concepts parking doc, start Reply/Watching Loop, expand Strategy UI, implement connectors, mutate Drive permissions, or send request-access emails.',
    ].join(' '),
  }, 'codex')

  if (!updateCurrentSprintOverlay) {
    return {
      backlogUpdated: true,
      sprintOverlayUpdated: false,
      reason: `Skipped historical Source Truth Guardrails sprint overlay update because active sprint is ${sprint?.sprintId || 'missing'}.`,
    }
  }

  await upsertFoundationCurrentSprintOverlay({
    sprint: {
      sprintId: SPRINT_ID,
      status: 'active',
      goal: sprint.goal,
      activeBlockerCardId: null,
      metadata: {
        ...sprint.metadata,
        currentStatus: 'source_truth_guardrails_complete_review_required',
        nextAction: 'Source Truth Guardrails sprint is complete. Stop for sprint review/rollover before opening another sprint.',
        completedAt: new Date().toISOString(),
      },
    },
    items: current.items.map(item => ({
      cardId: item.backlogId,
      order: item.order,
      stage: item.backlogId === RESEARCH_LANE_PURGE_CARD_ID ? 'done_this_sprint' : item.stage,
      planRef: item.planRef,
      definitionOfDone: item.definitionOfDone,
      proofCommands: item.proofCommands,
      readinessBlockerCleared: item.readinessBlockerCleared,
      notNextBoundaries: item.notNextBoundaries,
      existingWorkCheck: item.existingWorkCheck,
      metadata: item.metadata,
    })),
    mutation: {
      apply: true,
      expectedPreviousActiveSprintId: sprint.sprintId,
      allowItemReplacement: true,
      reason: `Close ${RESEARCH_LANE_PURGE_CARD_ID} after proposed-only report proof.`,
    },
  }, 'codex')

  return {
    backlogUpdated: true,
    sprintOverlayUpdated: true,
    reason: 'Updated active Source Truth Guardrails sprint overlay.',
  }
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const skipClose = boolArg(args.skipClose) || boolArg(args['skip-close'])
  const argv = process.argv.slice(2)
  const writeReportRequested = isProcessReportWriteRequested(argv)
  const applyRequested = isProcessCheckWriteRequested({
    argv,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const closeCardRequested = isProcessCheckWriteRequested({
    argv,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  }) && !skipClose
  const findings = []

  await initFoundationDb()
  try {
    const [
      approvalValidation,
      beforeSnapshot,
      syntheticProof,
      packageSource,
      libSource,
      scriptSource,
      verifySource,
      planSource,
      cards,
    ] = await Promise.all([
      validatePlanApprovalFile({
        repoRoot: process.cwd(),
        approvalRef: RESEARCH_LANE_PURGE_APPROVAL_PATH,
        cardId: RESEARCH_LANE_PURGE_CARD_ID,
      }),
      getFoundationSnapshot(),
      buildSyntheticResearchLanePurgeProof(),
      fs.readFile('package.json', 'utf8'),
      fs.readFile('lib/research-lane-purge.js', 'utf8'),
      fs.readFile(RESEARCH_LANE_PURGE_SCRIPT_PATH, 'utf8'),
      fs.readFile('scripts/foundation-verify.mjs', 'utf8'),
      fs.readFile(RESEARCH_LANE_PURGE_PLAN_PATH, 'utf8'),
      getBacklogItemsByIds([RESEARCH_LANE_PURGE_CARD_ID]),
    ])

    const beforeBacklogItems = beforeSnapshot.backlogItems || []
    const beforeResearchSignature = researchLaneSignature(beforeBacklogItems)
    const purgeSnapshot = buildResearchLanePurgeSnapshot({
      backlogItems: beforeBacklogItems,
      generatedAt: new Date().toISOString(),
    })
    if (writeReportRequested) await writeReport(purgeSnapshot)
    const reportSource = writeReportRequested
      ? await fs.readFile(RESEARCH_LANE_PURGE_REPORT_PATH, 'utf8')
      : renderResearchLanePurgeReport(purgeSnapshot)
    const afterSnapshot = await getFoundationSnapshot()
    const afterResearchSignature = researchLaneSignature(afterSnapshot.backlogItems || [])
    const card = cards.find(item => item.id === RESEARCH_LANE_PURGE_CARD_ID)
    const dispositions = purgeSnapshot.summary?.dispositionCounts || {}

    addFinding(
      findings,
      approvalValidation.ok &&
        approvalValidation.mode === 'v2' &&
        Number(approvalValidation.approval?.score) >= 9.8 &&
        approvalValidation.approval?.approvedPlanRef === RESEARCH_LANE_PURGE_PLAN_PATH,
      'Plan Critic approval file is valid at 9.8+',
      approvalValidation.failures?.map(item => item.check).join(', ') || '',
    )
    addFinding(findings, syntheticProof.ok, 'synthetic scanner catches stale research and preserves active/recent research', JSON.stringify(syntheticProof.dispositions || {}))
    addFinding(findings, purgeSnapshot.cardId === RESEARCH_LANE_PURGE_CARD_ID && purgeSnapshot.closeoutKey === RESEARCH_LANE_PURGE_CLOSEOUT_KEY, 'snapshot carries card and closeout identifiers')
    addFinding(findings, purgeSnapshot.summary?.researchCardCount >= 100, 'live report covers current research lane', String(purgeSnapshot.summary?.researchCardCount || 0))
    addFinding(findings, purgeSnapshot.summary?.researchCardCount === purgeSnapshot.items.length, 'every research card has a report row', `${purgeSnapshot.items.length}/${purgeSnapshot.summary?.researchCardCount || 0}`)
    addFinding(findings, purgeSnapshot.items.every(item => item.proposedOnly === true && item.cardId && item.priority && item.updateSignal && item.proposedDisposition && item.reason), 'every row has required proposed-only fields')
    addFinding(findings, ['promote_review', 'keep_review', 'move_to_future_concepts_review'].every(key => Number(dispositions[key] || 0) > 0), 'report has promote, keep, and future-concepts review buckets', JSON.stringify(dispositions))
    addFinding(findings, beforeResearchSignature === afterResearchSignature, 'report generation leaves research-lane signature unchanged', `before=${beforeResearchSignature.length} after=${afterResearchSignature.length}`)
    addFinding(findings, includesAll(reportSource, ['PROPOSED ONLY', 'No backlog cards were deleted, closed, or moved by this report.', 'No future-concepts parking doc is edited or created']), 'report states proposed-only/no-mutation guardrails')
    addFinding(findings, includesAll(packageSource, ['"process:research-lane-purge-check"', RESEARCH_LANE_PURGE_SCRIPT_PATH]), 'package script exposes focused proof')
    addFinding(findings, includesAll(libSource, ['buildResearchLanePurgeSnapshot', 'renderResearchLanePurgeReport', 'researchLaneSignature', 'buildSyntheticResearchLanePurgeProof']), 'library owns classifier, renderer, signature, and synthetic proof')
    addFinding(findings, includesAll(scriptSource, ['beforeResearchSignature', 'afterResearchSignature', 'writeReport', 'skipClose']), 'process check proves before/after mutation guard')
    addFinding(findings, includesAll(verifySource, ['RESEARCH_LANE_PURGE_CARD_ID', 'RESEARCH_LANE_PURGE_CLOSEOUT_KEY', 'RESEARCH_LANE_PURGE_REPORT_PATH']), 'foundation verifier covers this card')
    addFinding(
      findings,
      includesAll(planSource, ['No substring-only proof', 'No backlog card is moved']) &&
        (
          planSource.includes('docs/handoffs/research-purge-2026-05-13.md') ||
          planSource.includes('docs/_archive/handoffs/research-purge-2026-05-13.md')
        ),
      'plan keeps proof behavior-backed and report-only',
    )
    addFinding(findings, card?.lane === 'scoped' || card?.lane === 'done', 'backlog card is scoped or done before close', card?.lane || 'missing')

    const summary = {
      status: findings.length ? 'blocked' : 'healthy',
      cardId: RESEARCH_LANE_PURGE_CARD_ID,
      closeoutKey: RESEARCH_LANE_PURGE_CLOSEOUT_KEY,
      planRef: RESEARCH_LANE_PURGE_PLAN_PATH,
      reportPath: writeReportRequested ? RESEARCH_LANE_PURGE_REPORT_PATH : null,
      reportWritten: writeReportRequested,
      researchSummary: purgeSnapshot.summary,
      synthetic: syntheticProof,
      mutationGuard: {
        beforeResearchSignatureLength: beforeResearchSignature.length,
        afterResearchSignatureLength: afterResearchSignature.length,
        unchanged: beforeResearchSignature === afterResearchSignature,
      },
      closeout: {
        requested: closeCardRequested,
        applied: false,
        sprintOverlayUpdated: false,
        reason: '',
      },
      findings,
    }

    if (summary.status === 'healthy' && closeCardRequested) {
      assertProcessCheckWriteAllowed({
        argv,
        scriptPath: RESEARCH_LANE_PURGE_SCRIPT_PATH,
        operation: 'close research lane purge card and update Current Sprint overlay',
        allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
      })
      const closeout = await closeSprintCard(purgeSnapshot, { applyRequested })
      summary.closeout = {
        requested: true,
        applied: true,
        sprintOverlayUpdated: closeout.sprintOverlayUpdated === true,
        reason: closeout.reason || '',
      }
    }

    if (jsonMode) console.log(JSON.stringify(summary, null, 2))
    else {
      console.log('Research lane purge proof')
      console.log(`  Card: ${RESEARCH_LANE_PURGE_CARD_ID}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Research rows: ${summary.researchSummary.researchCardCount}`)
      console.log(`  Report: ${RESEARCH_LANE_PURGE_REPORT_PATH}`)
      for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    }
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  const jsonMode = process.argv.includes('--json') || process.argv.includes('--json=true')
  if (jsonMode) {
    console.log(JSON.stringify({
      status: 'error',
      cardId: RESEARCH_LANE_PURGE_CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
