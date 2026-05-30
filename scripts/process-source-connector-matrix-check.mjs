#!/usr/bin/env node

import { Pool } from 'pg'
import {
  buildSourceConnectorMatrixSnapshot,
  SOURCE_CONNECTOR_MATRIX_CARD_ID,
  SOURCE_CONNECTOR_MATRIX_CLOSEOUT_KEY,
} from '../lib/source-connector-matrix.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  updateBacklogItem,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  getSourceConnectors,
  getSourceContracts,
} from '../lib/source-contracts.js'

const args = new Set(process.argv.slice(2))
const jsonMode = args.has('--json') || args.has('--json=true')
const REQUIRED_SOURCE_IDS = [
  'SRC-GA4-001',
  'SRC-GSC-001',
  'SRC-GBP-001',
  'SRC-WHATSAPP-001',
  'SRC-TELEGRAM-IN-001',
  'SRC-PUBLISH-001',
  'SRC-REAL-001',
  'SRC-SKOOL-001',
  'SRC-LOOM-001',
  'SRC-MYICRO-001',
  'SRC-GSHEETS-001',
  'SRC-GDOCS-001',
  'SRC-GSLIDES-001',
  'SRC-ZOOM-001',
]
const REQUIRED_FLOW_COLUMNS = [
  'has_contract',
  'has_connector',
  'has_extraction_target',
  'has_artifacts',
  'has_candidates',
  'has_promoted_atoms',
  'has_synthesis',
  'has_routing',
  'blocked_reason',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function closeSprintCard() {
  await updateBacklogItem(SOURCE_CONNECTOR_MATRIX_CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Use the connector matrix to decide which source blockers become follow-up cards before Reply/Watching Loop.',
    statusNote: 'Closed on 2026-05-12 under `source-connector-matrix-v1`. V1 adds `lib/source-connector-matrix.js`, `/api/foundation/source-connector-matrix`, Source Lifecycle UI rendering, and `scripts/process-source-connector-matrix-check.mjs`. The matrix includes the 14 named missing connector/source rows and atom-flow columns: has_contract, has_connector, has_extraction_target, has_artifacts, has_candidates, has_promoted_atoms, has_synthesis, has_routing, blocked_reason. Proof: `npm run process:source-connector-matrix-check -- --json`.',
  }, 'codex')

  const pool = createPool()
  try {
    await pool.query(
      `
        UPDATE foundation_sprint_items
        SET stage = 'done_this_sprint',
            updated_at = NOW()
        WHERE sprint_id = 'connector-routing-truth-2026-05-12'
          AND backlog_id = $1
      `,
      [SOURCE_CONNECTOR_MATRIX_CARD_ID],
    )
    await pool.query(
      `
        UPDATE foundation_sprints
        SET active_blocker_card_id = 'SOURCE-HUB-ROUTING-MATRIX-001',
            metadata = metadata || $1::jsonb,
            updated_at = NOW()
        WHERE sprint_id = 'connector-routing-truth-2026-05-12'
          AND status = 'active'
      `,
      [JSON.stringify({
        currentStatus: 'connector_matrix_done_next_hub_routing_matrix',
        nextAction: 'Build SOURCE-HUB-ROUTING-MATRIX-001 next so the system answers routed-to-where.',
      })],
    )
  } finally {
    await pool.end()
  }
}

async function main() {
  await initFoundationDb()
  const snapshot = await getFoundationSnapshot()
  const matrix = buildSourceConnectorMatrixSnapshot({
    sources: getSourceContracts(),
    connectors: getSourceConnectors(),
    extractionControl: snapshot.extractionControl,
    sharedCommunicationsCoverage: snapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: snapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: snapshot.intelligenceSynthesis,
    intelligenceActionRouter: snapshot.intelligenceActionRouter,
    sourceMaturityOperational: snapshot.sourceMaturityOperational,
  })

  const sourceIds = new Set(matrix.rows.map(row => row.sourceId))
  for (const sourceId of REQUIRED_SOURCE_IDS) {
    assert(sourceIds.has(sourceId), `Connector matrix missing required row ${sourceId}.`)
  }
  for (const column of REQUIRED_FLOW_COLUMNS) {
    assert(matrix.columns.includes(column), `Connector matrix missing atom-flow column ${column}.`)
  }
  assert(matrix.summary.rowCount >= 24, 'Connector matrix should include old-system and new-system connector rows.')
  assert(matrix.summary.requiredMissingOrBlockedCount >= 8, 'Connector matrix should expose missing/blocked connector truth, not hide it.')
  assert(matrix.rows.some(row => row.sourceId === 'SRC-MEETINGS-001' && row.hasPromotedAtoms), 'Connector matrix should show restored atom flow for Meetings.')
  assert(matrix.rows.some(row => row.sourceId === 'SRC-MISSIVE-001' && row.hasPromotedAtoms), 'Connector matrix should show restored atom flow for Missive.')
  for (const sourceId of ['SRC-GA4-001', 'SRC-GSC-001', 'SRC-GBP-001']) {
    const row = matrix.rows.find(item => item.sourceId === sourceId)
    assert(row?.hasContract === true, `${sourceId} should have a first-class source contract.`)
    assert(row?.hasConnector === true, `${sourceId} should have an available-pending connector registry row.`)
    assert(row?.decision === 'blocked', `${sourceId} should remain blocked until source-owner auth/extraction approval.`)
  }
  assert(matrix.rows.some(row => row.sourceId === 'SRC-SKOOL-001' && row.decision === 'blocked'), 'Skool/earlyaidopters should be visible as blocked.')

  await closeSprintCard()
  await closeFoundationDb()

  const report = {
    ok: true,
    card: SOURCE_CONNECTOR_MATRIX_CARD_ID,
    closeoutKey: SOURCE_CONNECTOR_MATRIX_CLOSEOUT_KEY,
    summary: matrix.summary,
    requiredSourceIds: REQUIRED_SOURCE_IDS,
    columns: matrix.columns,
    missingRequiredRows: matrix.missingRequiredRows.map(row => ({
      sourceId: row.sourceId,
      connectorId: row.connectorId,
      decision: row.decision,
      blockedReason: row.blockedReason,
    })),
  }
  if (jsonMode) console.log(JSON.stringify(report, null, 2))
  else {
    console.log('SOURCE-CONNECTOR-MATRIX-001 OK')
    console.log(`rows=${matrix.summary.rowCount} missingOrBlocked=${matrix.summary.requiredMissingOrBlockedCount}`)
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  if (jsonMode) console.log(JSON.stringify({ ok: false, card: SOURCE_CONNECTOR_MATRIX_CARD_ID, error: error.message }, null, 2))
  else console.error(error)
  process.exitCode = 1
})
