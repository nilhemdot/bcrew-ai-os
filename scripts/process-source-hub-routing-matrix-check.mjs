#!/usr/bin/env node

import { Pool } from 'pg'
import {
  buildSourceConnectorMatrixSnapshot,
} from '../lib/source-connector-matrix.js'
import {
  buildSourceHubRoutingMatrixSnapshot,
  HUB_ROUTING_COLUMNS,
  SOURCE_HUB_ROUTING_MATRIX_CARD_ID,
  SOURCE_HUB_ROUTING_MATRIX_CLOSEOUT_KEY,
} from '../lib/source-hub-routing-matrix.js'
import {
  closeFoundationDb,
  getFoundationSnapshot,
  initFoundationDb,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import {
  getSourceConnectors,
  getSourceContracts,
} from '../lib/source-contracts.js'

const args = new Set(process.argv.slice(2))
const jsonMode = args.has('--json') || args.has('--json=true')

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
  await updateBacklogItem(SOURCE_HUB_ROUTING_MATRIX_CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Decide the next sprint from the matrix: source gap follow-up if blockers dominate, Reply/Watching only after source truth stays honest.',
    statusNote: 'Closed on 2026-05-12 under `source-hub-routing-matrix-v1`. V1 adds `lib/source-hub-routing-matrix.js`, `/api/foundation/source-hub-routing-matrix`, Source Lifecycle UI rendering, and `scripts/process-source-hub-routing-matrix-check.mjs`. The matrix uses many-to-many states route, candidate, blocked, n/a, and unknown across Strategy, Ops, Sales, Recruiting, Retention, Agent Coaching, Marketing, Brand Guardian, Training, Steve personal brand, MarketMasters, Zahnd Team Ag, Unchained / education, Decision Queue, Backlog, and Ignore/No Value. Proof: `npm run process:source-hub-routing-matrix-check -- --json`.',
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
      [SOURCE_HUB_ROUTING_MATRIX_CARD_ID],
    )
    await pool.query(
      `
        UPDATE foundation_sprints
        SET status = 'closed',
            active_blocker_card_id = $1,
            metadata = metadata || $2::jsonb,
            updated_at = NOW()
        WHERE sprint_id = 'connector-routing-truth-2026-05-12'
      `,
      [SOURCE_HUB_ROUTING_MATRIX_CARD_ID, JSON.stringify({
        currentStatus: 'connector_routing_truth_sprint_closed',
        nextAction: 'Closed. Process repair is handled by process-repair-verifier-independence-2026-05-12 before product work resumes.',
      })],
    )
  } finally {
    await pool.end()
  }
}

async function main() {
  await initFoundationDb()
  const snapshot = await getFoundationSnapshot()
  const connectorMatrix = buildSourceConnectorMatrixSnapshot({
    sources: getSourceContracts(),
    connectors: getSourceConnectors(),
    extractionControl: snapshot.extractionControl,
    sharedCommunicationsCoverage: snapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: snapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: snapshot.intelligenceSynthesis,
    intelligenceActionRouter: snapshot.intelligenceActionRouter,
    sourceMaturityOperational: snapshot.sourceMaturityOperational,
  })
  const matrix = buildSourceHubRoutingMatrixSnapshot({ connectorMatrix })

  for (const column of HUB_ROUTING_COLUMNS) {
    assert(matrix.columns.includes(column), `Hub routing matrix missing column ${column}.`)
  }
  for (const state of ['route', 'candidate', 'blocked', 'n/a', 'unknown']) {
    assert(matrix.states.includes(state), `Hub routing matrix missing state ${state}.`)
  }
  assert(matrix.summary.rowCount === connectorMatrix.summary.rowCount, 'Hub routing rows should align with connector matrix rows.')
  assert(matrix.summary.candidateCellCount > 0, 'Hub routing matrix should expose candidate destinations.')
  assert(matrix.summary.blockedCellCount > 0, 'Hub routing matrix should expose blocked destinations.')
  assert(matrix.rows.some(row => row.sourceId === 'SRC-GMAIL-001' && (row.primaryRoutes.includes('Strategy') || row.candidates.includes('Strategy'))), 'Gmail should be a Strategy candidate or route.')
  assert(matrix.rows.some(row => row.sourceId === 'SRC-SKOOL-001' && row.blocked.includes('Training')), 'Skool should show blocked Training routing until access is resolved.')
  assert(matrix.rows.some(row => row.sourceId === 'SRC-GA4-001' && row.blocked.includes('Marketing')), 'GA4 should show blocked Marketing routing until connector/source contract exists.')

  await closeSprintCard()
  await closeFoundationDb()

  const report = {
    ok: true,
    card: SOURCE_HUB_ROUTING_MATRIX_CARD_ID,
    closeoutKey: SOURCE_HUB_ROUTING_MATRIX_CLOSEOUT_KEY,
    summary: matrix.summary,
    columns: matrix.columns,
    hubCoverage: matrix.hubCoverage,
    blockedRows: matrix.blockedRows.map(row => ({
      sourceId: row.sourceId,
      label: row.label,
      blocked: row.blocked,
    })),
  }
  if (jsonMode) console.log(JSON.stringify(report, null, 2))
  else {
    console.log('SOURCE-HUB-ROUTING-MATRIX-001 OK')
    console.log(`rows=${matrix.summary.rowCount} candidate=${matrix.summary.candidateCellCount} blocked=${matrix.summary.blockedCellCount}`)
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  if (jsonMode) console.log(JSON.stringify({ ok: false, card: SOURCE_HUB_ROUTING_MATRIX_CARD_ID, error: error.message }, null, 2))
  else console.error(error)
  process.exitCode = 1
})
