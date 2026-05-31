#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  ATOM_FLOW_AUTO_DEMOTION_APPROVAL_PATH,
  ATOM_FLOW_AUTO_DEMOTION_CARD_ID,
  ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY,
  ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH,
  ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH,
  buildSyntheticAtomFlowAutoDemotionProof,
} from '../lib/atom-flow-auto-demotion.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
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
import { buildSourceLifecycleStatus } from '../lib/source-lifecycle.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const SPRINT_ID = 'source-truth-guardrails-2026-05-13'
const NEXT_CARD_ID = 'EXTRACT-RUN-HARDENING-EXECUTION-001'

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

function sourceFixture(sourceId, title) {
  return {
    sourceId,
    title,
    unitName: title,
    status: 'Verified Readable',
    validation: 'Signed Off',
    accessMethod: 'fixture',
    owner: 'Foundation',
    updateMethod: 'Scheduled',
  }
}

function buildSyntheticGridProof() {
  const now = '2026-05-13T02:30:00.000Z'
  const sources = [
    sourceFixture('SRC-STALE-001', 'Stale promoted atom source'),
    sourceFixture('SRC-RESTORED-001', 'Restored promoted atom source'),
    sourceFixture('SRC-CANDIDATE-ONLY-001', 'Candidate only source'),
    sourceFixture('SRC-NOT-EXTRACTED-001', 'Not extracted source'),
  ]
  const extractionControl = {
    coverageByTarget: [
      { sourceId: 'SRC-STALE-001', targetKey: 'stale-target', status: 'active', runtimeMode: 'scheduled', lastStatus: 'succeeded', counts: { succeededItems: 3 } },
      { sourceId: 'SRC-RESTORED-001', targetKey: 'restored-target', status: 'active', runtimeMode: 'scheduled', lastStatus: 'succeeded', counts: { succeededItems: 3 } },
      { sourceId: 'SRC-CANDIDATE-ONLY-001', targetKey: 'candidate-target', status: 'active', runtimeMode: 'scheduled', lastStatus: 'succeeded', counts: { succeededItems: 3 } },
    ],
  }
  const sharedCommunicationsCoverage = {
    sources: [
      { sourceId: 'SRC-STALE-001', totalArtifacts: 3, candidateTypes: {} },
      { sourceId: 'SRC-RESTORED-001', totalArtifacts: 3, candidateTypes: {} },
      { sourceId: 'SRC-CANDIDATE-ONLY-001', totalArtifacts: 3, candidateTypes: { 'atom_candidate:pending': 4 } },
    ],
  }
  const sourceMaturityOperational = {
    atomsBySource: [
      { sourceId: 'SRC-STALE-001', activeAtoms: 2, latestAtomAt: '2026-05-10T02:30:00.000Z' },
      { sourceId: 'SRC-RESTORED-001', activeAtoms: 2, latestAtomAt: '2026-05-13T02:00:00.000Z' },
    ],
    factsBySource: [
      { sourceId: 'SRC-STALE-001', totalFacts: 1 },
      { sourceId: 'SRC-RESTORED-001', totalFacts: 1 },
      { sourceId: 'SRC-CANDIDATE-ONLY-001', totalFacts: 1 },
    ],
    synthesizedItemsBySource: [
      { sourceId: 'SRC-STALE-001', activeSynthesizedItems: 1 },
      { sourceId: 'SRC-RESTORED-001', activeSynthesizedItems: 1 },
      { sourceId: 'SRC-CANDIDATE-ONLY-001', activeSynthesizedItems: 1 },
    ],
    routesBySource: [
      { sourceId: 'SRC-STALE-001', activeRoutes: 1 },
      { sourceId: 'SRC-RESTORED-001', activeRoutes: 1 },
      { sourceId: 'SRC-CANDIDATE-ONLY-001', activeRoutes: 1 },
    ],
  }
  const grid = buildSourceMaturityGridSnapshot({
    sources,
    extractionControl,
    sharedCommunicationsCoverage,
    sourceMaturityOperational,
    now,
    atomFlowWindowHours: 24,
  })
  const rows = new Map(grid.rows.map(row => [row.sourceId, row]))
  const stale = rows.get('SRC-STALE-001')
  const restored = rows.get('SRC-RESTORED-001')
  const candidateOnly = rows.get('SRC-CANDIDATE-ONLY-001')
  const notExtracted = rows.get('SRC-NOT-EXTRACTED-001')
  return {
    ok: stale?.atomFlow?.status === 'stale' &&
      stale?.stages?.atomized?.ok === false &&
      stale?.nextGap === 'atomized' &&
      restored?.atomFlow?.status === 'healthy' &&
      restored?.stages?.atomized?.ok === true &&
      candidateOnly?.atomFlow?.status === 'stale' &&
      candidateOnly?.stages?.atomized?.ok === false &&
      notExtracted?.atomFlow?.status === 'not_applicable',
    summary: grid.summary,
    stale,
    restored,
    candidateOnly,
    notExtracted,
  }
}

async function buildLiveGrid() {
  const foundationSnapshot = await getFoundationSnapshot()
  const sources = getSourceContracts()
  const lifecycle = buildSourceLifecycleStatus({
    sources,
    connectors: [],
    groupedSystems: [],
    extractionControl: foundationSnapshot.extractionControl,
    foundationJobs: foundationSnapshot.foundationJobs?.jobs || [],
  })
  return buildSourceMaturityGridSnapshot({
    sources,
    extractionControl: foundationSnapshot.extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    lifecycle,
  })
}

async function closeSprintCard(liveGrid) {
  await updateBacklogItem(ATOM_FLOW_AUTO_DEMOTION_CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Build EXTRACT-RUN-HARDENING-EXECUTION-001 next in the Source Truth Guardrails sprint.',
    statusNote: [
      `Closed on 2026-05-13 under \`${ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY}\`.`,
      'V1 adds atom-flow status to source maturity truth so extracted/atomized claims are marked stale when promoted `intelligence_atoms` are missing or outside the freshness window.',
      `Live source maturity now reports staleAtomFlowSources=${liveGrid.summary?.staleAtomFlowSources || 0}, healthyAtomFlowSources=${liveGrid.summary?.healthyAtomFlowSources || 0}, and atomFlowWindowHours=${liveGrid.summary?.atomFlowWindowHours || 0}.`,
      'Proof: `npm run process:atom-flow-auto-demotion-check -- --json` validates stale, restored, no-promoted-atom, and not-applicable synthetic behavior through the actual maturity function path.',
      'It does not create source contracts, start extraction, repair credentials, mutate Drive permissions, send request-access emails, or build product UI.',
    ].join(' '),
  }, 'codex')

  const current = await getActiveFoundationCurrentSprint()
  const sprint = current.sprint
  await upsertFoundationCurrentSprintOverlay({
    sprint: {
      sprintId: SPRINT_ID,
      status: 'active',
      goal: sprint.goal,
      activeBlockerCardId: NEXT_CARD_ID,
      metadata: {
        ...sprint.metadata,
        currentStatus: 'atom_flow_done_building_extract_retry',
        nextAction: 'Build EXTRACT-RUN-HARDENING-EXECUTION-001 next. Do not start research purge until retry execution closes.',
      },
    },
    items: current.items.map(item => ({
      cardId: item.backlogId,
      order: item.order,
      stage: item.backlogId === ATOM_FLOW_AUTO_DEMOTION_CARD_ID
        ? 'done_this_sprint'
        : item.backlogId === NEXT_CARD_ID
          ? 'building_now'
          : item.stage,
      planRef: item.planRef,
      definitionOfDone: item.definitionOfDone,
      proofCommands: item.proofCommands,
      readinessBlockerCleared: item.readinessBlockerCleared,
      notNextBoundaries: item.notNextBoundaries,
      existingWorkCheck: item.existingWorkCheck,
      metadata: item.metadata,
    })),
  }, 'codex')
}

async function main() {
  const argv = process.argv.slice(2)
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const skipClose = boolArg(args.skipClose) || boolArg(args['skip-close'])
  const writeFlags = [
    PROCESS_CHECK_WRITE_FLAGS.apply,
    PROCESS_CHECK_WRITE_FLAGS.closeCard,
    PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
  ]
  const writeRequested = isProcessCheckWriteRequested({
    argv,
    allowedFlags: writeFlags,
  })
  const findings = []

  if (writeRequested) {
    assertProcessCheckWriteAllowed({
      argv,
      scriptPath: ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH,
      operation: 'close atom-flow auto-demotion card and advance source truth guardrails sprint',
      allowedFlags: writeFlags,
    })
  }

  await initFoundationDb()
  try {
    const [
      approvalValidation,
      syntheticClassifierProof,
      syntheticGridProof,
      liveGrid,
      backlogCards,
      libSource,
      gridSource,
      scriptSource,
    ] = await Promise.all([
      validatePlanApprovalFile({
        repoRoot: process.cwd(),
        approvalRef: ATOM_FLOW_AUTO_DEMOTION_APPROVAL_PATH,
        cardId: ATOM_FLOW_AUTO_DEMOTION_CARD_ID,
      }),
      buildSyntheticAtomFlowAutoDemotionProof(),
      buildSyntheticGridProof(),
      buildLiveGrid(),
      getBacklogItemsByIds([ATOM_FLOW_AUTO_DEMOTION_CARD_ID, NEXT_CARD_ID]),
      fs.readFile('lib/atom-flow-auto-demotion.js', 'utf8'),
      fs.readFile('lib/source-maturity-grid.js', 'utf8'),
      fs.readFile(ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH, 'utf8'),
    ])

    const sourceRowsMissingAtomFlow = (liveGrid.rows || []).filter(row => !row.atomFlow || !row.atomFlow.status)
    const liveStaleRows = (liveGrid.rows || []).filter(row => row.atomFlow?.status === 'stale')
    const card = backlogCards.find(item => item.id === ATOM_FLOW_AUTO_DEMOTION_CARD_ID)

    addFinding(findings, approvalValidation.ok && approvalValidation.mode === 'v2' && approvalValidation.approval?.approvedPlanRef === ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH, 'Plan Critic approval file is valid at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || '')
    addFinding(findings, syntheticClassifierProof.ok, 'synthetic classifier proof covers stale, restored, missing-promoted-atoms, and not-applicable states', JSON.stringify(syntheticClassifierProof))
    addFinding(findings, syntheticGridProof.ok, 'synthetic grid proof demotes stale atomized claims and restores fresh atom flow', JSON.stringify(syntheticGridProof.summary))
    addFinding(findings, Array.isArray(liveGrid.rows) && liveGrid.rows.length >= 35, 'live source maturity grid is present', String(liveGrid.rows?.length || 0))
    addFinding(findings, sourceRowsMissingAtomFlow.length === 0, 'every live maturity row carries atomFlow status', sourceRowsMissingAtomFlow.map(row => row.sourceId).join(', '))
    addFinding(findings, Number(liveGrid.summary?.atomFlowWindowHours || 0) > 0, 'live grid exposes atomFlowWindowHours', String(liveGrid.summary?.atomFlowWindowHours || 0))
    addFinding(findings, liveStaleRows.every(row => row.stages?.atomized?.ok === false), 'live stale atom-flow rows are demoted from atomized green state', liveStaleRows.map(row => row.sourceId).join(', ') || 'none')
    addFinding(findings, card?.lane === 'scoped' || card?.lane === 'done', 'backlog card is scoped or done before close', card?.lane || 'missing')
    addFinding(findings, libSource.includes('buildAtomFlowStatus') && libSource.includes('buildSyntheticAtomFlowAutoDemotionProof'), 'atom-flow helper owns behavior classification')
    addFinding(findings, gridSource.includes('atomFlowWindowHours') && gridSource.includes('staleAtomFlowSources') && gridSource.includes('demoteAtomized'), 'source maturity grid consumes atom-flow status')
    addFinding(findings, scriptSource.includes('buildSyntheticGridProof') && scriptSource.includes('sourceRowsMissingAtomFlow'), 'focused proof calls function path and live grid readback')

    const summary = {
      status: findings.length ? 'blocked' : 'healthy',
      cardId: ATOM_FLOW_AUTO_DEMOTION_CARD_ID,
      closeoutKey: ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY,
      planRef: ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH,
      scriptRef: ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH,
      liveSummary: {
        sourceCount: liveGrid.summary?.sourceCount || 0,
        atomFlowWindowHours: liveGrid.summary?.atomFlowWindowHours || 0,
        staleAtomFlowSources: liveGrid.summary?.staleAtomFlowSources || 0,
        healthyAtomFlowSources: liveGrid.summary?.healthyAtomFlowSources || 0,
        staleSourceIds: liveStaleRows.map(row => row.sourceId),
      },
      syntheticClassifierProof,
      syntheticGridSummary: syntheticGridProof.summary,
      writeRequested,
      applied: false,
      findings,
    }

    if (summary.status === 'healthy' && writeRequested && !skipClose) {
      await closeSprintCard(liveGrid)
      summary.applied = true
    }

    if (jsonMode) console.log(JSON.stringify(summary, null, 2))
    else {
      console.log('Atom-flow auto-demotion proof')
      console.log(`  Card: ${ATOM_FLOW_AUTO_DEMOTION_CARD_ID}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Stale source rows: ${summary.liveSummary.staleAtomFlowSources}`)
      for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    }
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  if (process.argv.includes('--json') || process.argv.includes('--json=true')) {
    console.log(JSON.stringify({
      status: 'error',
      cardId: ATOM_FLOW_AUTO_DEMOTION_CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error instanceof Error ? error.stack : error)
  }
  process.exitCode = 1
})
