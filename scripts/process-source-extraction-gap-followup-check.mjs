#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildSourceExtractionGapFollowupSnapshot,
  buildSyntheticMissingGapProof,
  findMissingTriageSourceIds,
  renderSourceExtractionGapTriageReport,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_APPROVAL_PATH,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_REPORT_PATH,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH,
  SOURCE_EXTRACTION_GAP_NEXT_SPRINT_CANDIDATES,
} from '../lib/source-extraction-gap-followup.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
  getFoundationSnapshot,
  initFoundationDb,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import {
  buildConnectorCredentialRegistrySnapshot,
} from '../lib/connector-credential-registry.js'
import {
  buildSourceConnectorMatrixSnapshot,
} from '../lib/source-connector-matrix.js'
import {
  buildSourceHubRoutingMatrixSnapshot,
} from '../lib/source-hub-routing-matrix.js'
import {
  getSourceConnectors,
  getSourceContracts,
} from '../lib/source-contracts.js'

const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'

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

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function buildLiveTriageSnapshot() {
  const foundationSnapshot = await getFoundationSnapshot()
  const sources = getSourceContracts()
  const connectors = getSourceConnectors()
  const connectorCredentialRegistry = buildConnectorCredentialRegistrySnapshot({
    sourceContracts: sources,
    sourceConnectors: connectors,
  })
  const connectorMatrix = buildSourceConnectorMatrixSnapshot({
    sources,
    connectors,
    extractionControl: foundationSnapshot.extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    connectorCredentialRegistry,
  })
  const routingMatrix = buildSourceHubRoutingMatrixSnapshot({ connectorMatrix })
  const triage = buildSourceExtractionGapFollowupSnapshot({
    connectorMatrix,
    routingMatrix,
  })
  return { foundationSnapshot, connectorMatrix, routingMatrix, triage }
}

function itemHasRequiredFields(item = {}) {
  return Boolean(
    item.sourceId &&
      item.connectorKey &&
      item.currentMatrixState &&
      item.proposedNextCard &&
      item.notNextBoundary &&
      typeof item.blockedReason === 'string'
  )
}

function containsAll(list, values) {
  const set = new Set(list)
  return values.every(value => set.has(value))
}

async function writeReport(snapshot) {
  await fs.writeFile(SOURCE_EXTRACTION_GAP_FOLLOWUP_REPORT_PATH, renderSourceExtractionGapTriageReport(snapshot))
}

async function closeSprintCard(snapshot) {
  const bucketCounts = snapshot.summary.bucketCounts || {}
  await updateBacklogItem(SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Control Plane + Connector Readiness sprint is ready for review; do not silently open the next sprint or start ingestion.',
    statusNote: [
      `Closed on 2026-05-13 under \`${SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY}\`.`,
      `V1 generated \`${SOURCE_EXTRACTION_GAP_FOLLOWUP_REPORT_PATH}\` from the live connector matrix, hub routing matrix, source maturity, and extraction coverage state.`,
      `The triage covers ${snapshot.summary.triageItemCount} source rows needing attention across buckets safe_next=${bucketCounts.safe_next || 0}, sprint_2_candidate=${bucketCounts.sprint_2_candidate || 0}, needs_steve_access=${bucketCounts.needs_steve_access || 0}, blocked=${bucketCounts.blocked || 0}.`,
      'Queued next-sprint candidates remain `ATOM-FLOW-AUTO-DEMOTION-001`, `EXTRACT-RUN-HARDENING-EXECUTION-001`, and `RESEARCH-LANE-PURGE-001`; they were not pulled into this sprint.',
      'Proof: `npm run process:source-extraction-gap-followup-check -- --json` verified live matrix coverage, required triage fields, queued next-sprint candidates, synthetic missing-gap rejection, and no extraction-job runner in this card.',
      'It does not build Reply/Watching Loop, expand Strategy Hub, implement Mycro/Skool/Loom/Zoom/Real/SocialPilot extraction, repair Google Ads OAuth, run MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, send request-access emails, or start broad ingestion.',
    ].join(' '),
  }, 'codex')

  const pool = createPool()
  try {
    await pool.query(
      `
        UPDATE foundation_sprint_items
        SET stage = 'done_this_sprint',
            updated_at = NOW()
        WHERE sprint_id = $1
          AND backlog_id = $2
      `,
      [SPRINT_ID, SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID],
    )
    await pool.query(
      `
        UPDATE foundation_sprints
        SET active_blocker_card_id = NULL,
            metadata = metadata || $2::jsonb,
            updated_at = NOW()
        WHERE sprint_id = $1
          AND status = 'active'
      `,
      [
        SPRINT_ID,
        JSON.stringify({
          currentStatus: 'control_plane_connector_readiness_complete_review_required',
          nextAction: 'Sprint is complete. Run sprint review/rollover before opening another sprint or product work.',
          completedAt: new Date().toISOString(),
        }),
      ],
    )
  } finally {
    await pool.end()
  }
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const skipClose = boolArg(args.skipClose) || boolArg(args['skip-close'])
  const findings = []

  await initFoundationDb()
  try {
    const [
      approvalValidation,
      live,
      backlogCandidates,
      scriptSource,
      libSource,
    ] = await Promise.all([
      validatePlanApprovalFile({
        repoRoot: process.cwd(),
        approvalRef: SOURCE_EXTRACTION_GAP_FOLLOWUP_APPROVAL_PATH,
        cardId: SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID,
      }),
      buildLiveTriageSnapshot(),
      getBacklogItemsByIds(SOURCE_EXTRACTION_GAP_NEXT_SPRINT_CANDIDATES.map(item => item.cardId)),
      fs.readFile(SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH, 'utf8'),
      fs.readFile('lib/source-extraction-gap-followup.js', 'utf8'),
    ])

    const { connectorMatrix, routingMatrix, triage } = live
    const missingTriageSourceIds = findMissingTriageSourceIds(triage, connectorMatrix)
    const syntheticMissingGap = buildSyntheticMissingGapProof(triage, connectorMatrix)
    const triageSourceIds = triage.triageItems.map(item => item.sourceId)
    const nextSprintCandidateIds = triage.queuedNextSprintCandidates.map(item => item.cardId)
    const backlogCandidateIds = backlogCandidates.map(item => item.id)

    await writeReport(triage)

    addFinding(
      findings,
      approvalValidation.ok &&
        approvalValidation.mode === 'v2' &&
        Number(approvalValidation.approval?.score) >= 9.8 &&
        approvalValidation.approval?.approvedPlanRef === SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH,
      'Plan Critic approval file is valid at 9.8+',
      approvalValidation.failures?.map(item => item.check).join(', ') || '',
    )
    addFinding(findings, triage.cardId === SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID && triage.closeoutKey === SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY, 'triage carries card and closeout identifiers')
    addFinding(findings, connectorMatrix.summary?.rowCount >= 25 && routingMatrix.summary?.rowCount >= 25, 'live connector and routing matrices are present', `connector=${connectorMatrix.summary?.rowCount || 0} routing=${routingMatrix.summary?.rowCount || 0}`)
    addFinding(findings, triage.summary?.triageItemCount === triage.summary?.rowsNeedingTriage && triage.summary?.triageItemCount >= 20, 'triage covers every source row needing attention', `${triage.summary?.triageItemCount || 0}/${triage.summary?.rowsNeedingTriage || 0}`)
    addFinding(findings, missingTriageSourceIds.length === 0, 'no high-priority matrix gap rows are missing from triage', missingTriageSourceIds.join(', '))
    addFinding(findings, triage.triageItems.every(itemHasRequiredFields), 'every triage item has required operator fields')
    addFinding(findings, ['safe_next', 'sprint_2_candidate', 'needs_steve_access'].every(bucket => Number(triage.summary.bucketCounts?.[bucket] || 0) > 0), 'triage has safe, queued, and needs-Steve buckets', JSON.stringify(triage.summary.bucketCounts || {}))
    addFinding(findings, containsAll(triageSourceIds, ['SRC-MISSIVE-001', 'SRC-SLACK-001', 'SRC-GDRIVE-001', 'SRC-FUB-001', 'SRC-CLICKUP-001', 'SRC-GADS-001', 'SRC-PUBLISH-001', 'SRC-SKOOL-001', 'SRC-LOOM-001', 'SRC-MYICRO-001', 'SRC-REAL-001']), 'known high-value source gaps are represented', triageSourceIds.join(', '))
    addFinding(findings, containsAll(nextSprintCandidateIds, ['ATOM-FLOW-AUTO-DEMOTION-001', 'EXTRACT-RUN-HARDENING-EXECUTION-001', 'RESEARCH-LANE-PURGE-001']), 'queued next-sprint candidates are preserved in triage output', nextSprintCandidateIds.join(', '))
    addFinding(findings, containsAll(backlogCandidateIds, ['ATOM-FLOW-AUTO-DEMOTION-001', 'EXTRACT-RUN-HARDENING-EXECUTION-001', 'RESEARCH-LANE-PURGE-001']), 'queued next-sprint candidates exist in live backlog', backlogCandidateIds.join(', '))
    addFinding(findings, syntheticMissingGap.ok, 'synthetic missing-gap variant is rejected', JSON.stringify(syntheticMissingGap))
    const importLines = scriptSource.split('\n').filter(line => line.trim().startsWith('import'))
    addFinding(findings, !importLines.some(line => line.includes('run-foundation-job') || line.includes('run-extraction-target')) && !libSource.includes('run-extraction-target'), 'triage card does not import extraction job runners')

    const summary = {
      status: findings.length ? 'blocked' : 'healthy',
      cardId: SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID,
      closeoutKey: SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY,
      planRef: SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH,
      scriptRef: SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH,
      reportPath: SOURCE_EXTRACTION_GAP_FOLLOWUP_REPORT_PATH,
      matrixSummary: connectorMatrix.summary,
      routingSummary: routingMatrix.summary,
      triageSummary: triage.summary,
      queuedNextSprintCandidates: triage.queuedNextSprintCandidates,
      findings,
    }

    if (summary.status === 'healthy' && !skipClose) await closeSprintCard(triage)

    if (jsonMode) console.log(JSON.stringify(summary, null, 2))
    else {
      console.log('Source extraction gap follow-up proof')
      console.log(`  Card: ${SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID}`)
      console.log(`  Closeout: ${SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Triage items: ${summary.triageSummary.triageItemCount}`)
      console.log(`  Report: ${SOURCE_EXTRACTION_GAP_FOLLOWUP_REPORT_PATH}`)
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
      ok: false,
      cardId: SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
