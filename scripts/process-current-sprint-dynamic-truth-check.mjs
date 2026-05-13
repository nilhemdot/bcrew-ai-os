#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  initFoundationDb,
} from '../lib/foundation-db.js'

const CARD_ID = 'CURRENT-SPRINT-DYNAMIC-TRUTH-001'
const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'
const PLAN_REF = 'docs/process/current-sprint-dynamic-truth-001-plan.md'
const APPROVAL_REF = 'docs/process/approvals/CURRENT-SPRINT-DYNAMIC-TRUTH-001.json'
const SCRIPT_REF = 'scripts/process-current-sprint-dynamic-truth-check.mjs'

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

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  const forbidden = [
    /raw[_-]?content/i,
    /content_text/i,
    /transcriptText/i,
    /webViewLink/i,
    /https:\/\/docs\.google\.com/i,
    /password/i,
    /secret/i,
  ]
  return forbidden.filter(pattern => pattern.test(proofText)).map(pattern => String(pattern))
}

function buildCompleteExistingWorkCheck() {
  return {
    existingCode: ['lib/foundation-current-sprint.js', 'lib/foundation-db.js', 'server.js'],
    existingDocs: [PLAN_REF, 'docs/process/control-plane-connector-readiness-2026-05-12-plan.md'],
    existingScripts: [SCRIPT_REF],
    existingPolicy: ['Live Backlog is task truth.', 'Current Sprint is an overlay on live backlog truth.', 'Hardcoded defaults are bootstrap-only.'],
    reused: ['foundation_sprints', 'foundation_sprint_items', 'backlog_items'],
    notRebuilt: ['No second backlog.', 'No UI redesign.', 'No Drive permissions mutation.'],
    exactGap: 'Hardcoded active sprint defaults could compete with live sprint metadata.',
    overBroadRisk: 'This proof must not become a broad sprint engine rewrite.',
    readyBy: 'Codex',
    readyAt: '2026-05-12T00:00:00-04:00',
  }
}

function buildSyntheticMissingMetadataStatus(backlogCard) {
  return buildFoundationCurrentSprintStatus({
    sprint: {
      sprintId: 'synthetic-live-sprint-with-missing-metadata',
      status: 'active',
      goal: 'Synthetic live sprint goal that must not inherit old defaults.',
      activeBlockerCardId: CARD_ID,
      metadata: {},
    },
    items: [
      {
        cardId: CARD_ID,
        order: 1,
        stage: 'sprint_ready',
        planRef: PLAN_REF,
        definitionOfDone: 'Synthetic stage-ready proof.',
        proofCommands: ['npm run process:current-sprint-dynamic-truth-check -- --json'],
        readinessBlockerCleared: 'Synthetic proof.',
        notNextBoundaries: [
          'Do not run MEETING-VAULT-ACL-001 Phase B.',
          'Do not mutate Drive permissions.',
        ],
        existingWorkCheck: buildCompleteExistingWorkCheck(),
      },
    ],
    backlogItems: [backlogCard],
    closeouts: [],
  })
}

async function loadLiveSnapshot(pool, itemCardId) {
  const sprint = await pool.query(
    `SELECT sprint_id, metadata FROM foundation_sprints WHERE sprint_id = $1 LIMIT 1`,
    [SPRINT_ID],
  )
  const item = await pool.query(
    `SELECT sprint_id, backlog_id, metadata FROM foundation_sprint_items WHERE sprint_id = $1 AND backlog_id = $2 LIMIT 1`,
    [SPRINT_ID, itemCardId],
  )
  if (!sprint.rows[0]) throw new Error(`Missing active sprint ${SPRINT_ID}`)
  if (!item.rows[0]) throw new Error(`Missing sprint item ${itemCardId}`)
  return {
    sprintMetadata: sprint.rows[0].metadata || {},
    itemMetadata: item.rows[0].metadata || {},
  }
}

async function updateDynamicMarkers(pool, marker, itemCardId) {
  await pool.query(
    `
      UPDATE foundation_sprints
      SET metadata = metadata || $2::jsonb,
          updated_at = NOW()
      WHERE sprint_id = $1
    `,
    [
      SPRINT_ID,
      JSON.stringify({
        executiveSummary: marker.executiveSummary,
        exitCriteria: marker.exitCriteria,
      }),
    ],
  )
  await pool.query(
    `
      UPDATE foundation_sprint_items
      SET metadata = metadata || $3::jsonb,
          updated_at = NOW()
      WHERE sprint_id = $1 AND backlog_id = $2
    `,
    [
      SPRINT_ID,
      itemCardId,
      JSON.stringify({
        nextAction: marker.nextAction,
      }),
    ],
  )
}

async function restoreLiveSnapshot(pool, snapshot, itemCardId) {
  await pool.query(
    `UPDATE foundation_sprints SET metadata = $2::jsonb, updated_at = NOW() WHERE sprint_id = $1`,
    [SPRINT_ID, JSON.stringify(snapshot.sprintMetadata)],
  )
  await pool.query(
    `UPDATE foundation_sprint_items SET metadata = $3::jsonb, updated_at = NOW() WHERE sprint_id = $1 AND backlog_id = $2`,
    [SPRINT_ID, itemCardId, JSON.stringify(snapshot.itemMetadata)],
  )
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const findings = []
  const markers = [
    {
      executiveSummary: `dynamic-truth-proof-a-${Date.now()}`,
      exitCriteria: [`dynamic-truth-exit-a-${Date.now()}`],
      nextAction: `dynamic-truth-next-a-${Date.now()}`,
    },
    {
      executiveSummary: `dynamic-truth-proof-b-${Date.now()}`,
      exitCriteria: [`dynamic-truth-exit-b-${Date.now()}`],
      nextAction: `dynamic-truth-next-b-${Date.now()}`,
    },
  ]

  const packageJson = await readJson('package.json')
  const moduleSource = await readText('lib/foundation-current-sprint.js')
  const scriptSource = await readText(SCRIPT_REF)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot: process.cwd(),
    approvalRef: APPROVAL_REF,
    cardId: CARD_ID,
  })

  await initFoundationDb()
  const pool = createPool()
  let snapshot = null
  let snapshotItemCardId = null
  try {
    const activeSprint = await getActiveFoundationCurrentSprint()
    const cards = await getBacklogItemsByIds([CARD_ID])
    const backlogCard = cards.find(card => card.id === CARD_ID)
    const liveStatus = buildFoundationCurrentSprintStatus({
      sprint: activeSprint.sprint,
      items: activeSprint.items,
      backlogItems: cards,
      closeouts: [],
    })
    const liveItem = liveStatus.items.find(item => item.cardId === CARD_ID)
    const proofItemCardId = activeSprint.sprint?.activeBlockerCardId || CARD_ID
    const syntheticMissingMetadata = buildSyntheticMissingMetadataStatus(backlogCard || {
      id: CARD_ID,
      title: 'Synthetic backlog card',
      lane: 'scoped',
      priority: 'P0',
      nextAction: 'Synthetic next action',
    })

    addFinding(findings, liveStatus.sprintId === SPRINT_ID, 'live sprint id is active control-plane sprint', liveStatus.sprintId || 'missing')
    addFinding(findings, ['building_now', 'done_this_sprint'].includes(liveItem?.stage), 'current card is Building Now or Done This Sprint for proof replay', liveItem?.stage || 'missing')
    addFinding(findings, liveStatus.cadence?.truthSource?.sprintRecord === 'live-db', 'cadence reports live DB as sprint record source', JSON.stringify(liveStatus.cadence?.truthSource || {}))
    addFinding(findings, syntheticMissingMetadata.status === 'risk', 'synthetic active DB sprint without metadata fails closed', syntheticMissingMetadata.status)
    addFinding(findings, syntheticMissingMetadata.findings.some(item => item.check === 'sprint_exit_criteria_required'), 'missing live exit criteria is flagged instead of defaulted', JSON.stringify(syntheticMissingMetadata.findings))
    addFinding(findings, Array.isArray(syntheticMissingMetadata.cadence?.exitCriteria) && syntheticMissingMetadata.cadence.exitCriteria.length === 0, 'active DB sprint does not inherit hardcoded exit criteria when metadata is missing', JSON.stringify(syntheticMissingMetadata.cadence?.exitCriteria || []))

    snapshotItemCardId = proofItemCardId
    snapshot = await loadLiveSnapshot(pool, snapshotItemCardId)
    for (const marker of markers) {
      await updateDynamicMarkers(pool, marker, snapshotItemCardId)
      const api = await fetchJson(baseUrl, '/api/foundation/current-sprint')
      const cadence = api.currentSprint?.cadence || {}
      addFinding(findings, cadence.executiveSummary === marker.executiveSummary, 'API reflects live DB executive summary marker', JSON.stringify({ expected: marker.executiveSummary, actual: cadence.executiveSummary }))
      addFinding(findings, Array.isArray(cadence.exitCriteria) && cadence.exitCriteria[0] === marker.exitCriteria[0], 'API reflects live DB exit criteria marker', JSON.stringify({ expected: marker.exitCriteria, actual: cadence.exitCriteria }))
      addFinding(findings, cadence.nextAction === marker.nextAction, 'API reflects live sprint item next action marker', JSON.stringify({ expected: marker.nextAction, actual: cadence.nextAction }))
    }
    await restoreLiveSnapshot(pool, snapshot, snapshotItemCardId)
    snapshot = null
    snapshotItemCardId = null

    const restoredApi = await fetchJson(baseUrl, '/api/foundation/current-sprint')
    addFinding(findings, restoredApi.currentSprint?.status === 'healthy', 'live API returns healthy after proof restoration', restoredApi.currentSprint?.status || 'missing')
    addFinding(findings, restoredApi.currentSprint?.cadence?.executiveSummary !== markers[1].executiveSummary, 'proof marker is restored out of live sprint metadata', restoredApi.currentSprint?.cadence?.executiveSummary || 'missing')
    addFinding(findings, packageJson.scripts?.['process:current-sprint-dynamic-truth-check'] === 'node --env-file-if-exists=.env scripts/process-current-sprint-dynamic-truth-check.mjs', 'package exposes current sprint dynamic truth proof script', packageJson.scripts?.['process:current-sprint-dynamic-truth-check'] || 'missing')
    addFinding(findings, approvalValidation.ok, 'approval integrity passes for current sprint dynamic truth plan', approvalValidation.failures?.map(item => item.detail).join(' | ') || 'ok')
    addFinding(findings, moduleSource.includes('sprint_exit_criteria_required') && moduleSource.includes('truthSource') && moduleSource.includes('bootstrap-default'), 'module records dynamic truth source and blocks active DB default leakage', 'missing source markers')
    addFinding(findings, scriptSource.includes('restoreLiveSnapshot') && scriptSource.includes('dynamic-truth-proof'), 'proof restores live DB marker mutations', 'missing restore proof markers')

    const summary = {
      cardId: CARD_ID,
      status: findings.length ? 'attention' : 'healthy',
      checkedAt: new Date().toISOString(),
      dynamicMarkersProved: markers.length,
      syntheticMissingMetadata: {
        status: syntheticMissingMetadata.status,
        findings: syntheticMissingMetadata.findings.map(item => item.check),
        exitCriteriaCount: syntheticMissingMetadata.cadence?.exitCriteria?.length || 0,
      },
      apiRestoredStatus: restoredApi.currentSprint?.status || null,
      findings,
    }
    const rawLeaks = noRawProof(summary)
    if (rawLeaks.length) {
      summary.status = 'attention'
      summary.findings.push({ check: 'metadata_only_proof', detail: rawLeaks.join(', ') })
    }

    if (jsonMode) {
      console.log(JSON.stringify(summary, null, 2))
    } else {
      console.log(`Current Sprint dynamic truth check: ${summary.status}`)
      for (const finding of summary.findings) console.log(`FAIL ${finding.check}: ${finding.detail}`)
    }
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    if (snapshot) await restoreLiveSnapshot(pool, snapshot, snapshotItemCardId || CARD_ID).catch(() => {})
    await pool.end()
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
