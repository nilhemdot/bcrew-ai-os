#!/usr/bin/env node

import process from 'node:process'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  getFoundationSnapshot,
  initFoundationDb,
} from '../lib/foundation-db.js'
import {
  PROMISE_TO_PROOF_INTEGRITY_GATE_CARD_ID,
  PROMISE_TO_PROOF_CONTINUATION_CARDS,
  PROMISE_TO_PROOF_ORIGIN_UPDATES,
  buildPromiseToProofAudit,
  buildPromiseToProofDogfoodProof,
} from '../lib/promise-to-proof-integrity-gate.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const SCRIPT_PATH = 'scripts/process-promise-to-proof-integrity-gate-check.mjs'
const ACTOR = 'codex-promise-to-proof-integrity-gate'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rest] = arg.slice(2).split('=')
    result[key] = rest.length ? rest.join('=') : true
  }
  return result
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function upsertContinuationCards() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update promise-to-proof continuation backlog cards',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const card of PROMISE_TO_PROOF_CONTINUATION_CARDS) {
      await client.query(
        `
          INSERT INTO backlog_items (
            id, title, team, lane, priority, rank, source, summary,
            why_it_matters, next_action, status_note, owner
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              team = EXCLUDED.team,
              lane = CASE WHEN backlog_items.lane = 'done' THEN backlog_items.lane ELSE EXCLUDED.lane END,
              priority = EXCLUDED.priority,
              rank = EXCLUDED.rank,
              source = EXCLUDED.source,
              summary = EXCLUDED.summary,
              why_it_matters = EXCLUDED.why_it_matters,
              next_action = EXCLUDED.next_action,
              status_note = EXCLUDED.status_note,
              owner = EXCLUDED.owner,
              updated_at = NOW()
        `,
        [
          card.id,
          card.title,
          card.team,
          card.lane,
          card.priority,
          card.rank,
          card.source,
          card.summary,
          card.whyItMatters,
          card.nextAction,
          card.statusNote,
          card.owner,
        ],
      )
      await client.query(
        `
          INSERT INTO change_events (
            event_type, entity_table, entity_id, actor, summary, metadata
          )
          VALUES ('backlog_updated', 'backlog_items', $1, $2, $3, $4::jsonb)
        `,
        [
          card.id,
          ACTOR,
          `Opened/updated promise-to-proof continuation card ${card.id}`,
          JSON.stringify({ originCardIds: card.originCardIds || [] }),
        ],
      )
    }

    for (const update of PROMISE_TO_PROOF_ORIGIN_UPDATES) {
      const continuation = PROMISE_TO_PROOF_CONTINUATION_CARDS.find(card => card.id === update.continuationId)
      if (!continuation) continue
      await client.query(
        `
          UPDATE backlog_items
          SET next_action = CASE
                WHEN COALESCE(next_action, '') LIKE '%' || $2 || '%' THEN next_action
                ELSE CONCAT(COALESCE(NULLIF(next_action, ''), 'Continuation required.'), ' Promise-to-proof continuation: ', $2, '.')
              END,
              status_note = CASE
                WHEN COALESCE(status_note, '') LIKE '%' || $2 || '%' THEN status_note
                ELSE CONCAT(COALESCE(NULLIF(status_note, ''), 'Historical V1 closeout.'), ' Promise-to-proof audit: this V1 is not the full capability; continue ', $2, '.')
              END,
              updated_at = NOW()
          WHERE id = $1
        `,
        [update.originId, update.continuationId],
      )
      await client.query(
        `
          INSERT INTO change_events (
            event_type, entity_table, entity_id, actor, summary, metadata
          )
          VALUES ('backlog_updated', 'backlog_items', $1, $2, $3, $4::jsonb)
        `,
        [
          update.originId,
          ACTOR,
          `Linked historical V1 card ${update.originId} to continuation ${update.continuationId}`,
          JSON.stringify({ continuationId: update.continuationId }),
        ],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function closeIntegrityGateCard() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: `close ${PROMISE_TO_PROOF_INTEGRITY_GATE_CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `
        UPDATE backlog_items
        SET lane = 'done',
            next_action = 'Closed. Next: build WEB-GODMODE-LIVE-OPERATOR-002 as the first product proof program.',
            status_note = 'Promise-to-proof integrity gate shipped. Partial V1 product/capability closeouts now require a separate open continuation card.',
            updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [PROMISE_TO_PROOF_INTEGRITY_GATE_CARD_ID],
    )
    if (result.rowCount !== 1) {
      throw new Error(`Cannot close missing card ${PROMISE_TO_PROOF_INTEGRITY_GATE_CARD_ID}`)
    }
    await client.query(
      `
        INSERT INTO change_events (
          event_type, entity_table, entity_id, actor, summary, metadata
        )
        VALUES ('backlog_updated', 'backlog_items', $1, $2, $3, $4::jsonb)
      `,
      [
        PROMISE_TO_PROOF_INTEGRITY_GATE_CARD_ID,
        ACTOR,
        `Closed ${PROMISE_TO_PROOF_INTEGRITY_GATE_CARD_ID}`,
        JSON.stringify({ closeoutKey: 'promise-to-proof-integrity-gate-v1' }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const json = boolArg(args.json)
  const apply = isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const closeCard = isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  if (apply) await upsertContinuationCards()
  if (closeCard) await closeIntegrityGateCard()

  await initFoundationDb()
  const foundation = await getFoundationSnapshot()
  const audit = buildPromiseToProofAudit({ backlogItems: foundation.backlogItems || [] })
  const dogfood = buildPromiseToProofDogfoodProof()
  const checks = []

  addCheck(checks, dogfood.ok, 'dogfood rejects partial V1 capability without continuation', JSON.stringify({
    rejectedOk: dogfood.rejected.ok,
    acceptedOk: dogfood.accepted.ok,
    cleanOk: dogfood.clean.ok,
    activeSelfOk: dogfood.activeSelfIsNotContinuation.ok,
  }))
  addCheck(checks, audit.missingCards.length === 0, 'all promise-to-proof continuation cards exist', audit.missingCards.map(card => card.id).join(', ') || 'ok')
  addCheck(checks, audit.closedContinuations.length === 0, 'continuation cards remain open until the real capability ships', audit.closedContinuations.map(card => card.id).join(', ') || 'ok')
  addCheck(checks, audit.missingOriginLinks.length === 0, 'historical V1 cards point to continuation cards', audit.missingOriginLinks.map(item => `${item.originId}->${item.continuationId}`).join(', ') || 'ok')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    applied: apply,
    closedCard: closeCard,
    summary: {
      checks: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      continuationCards: PROMISE_TO_PROOF_CONTINUATION_CARDS.length,
      originLinks: PROMISE_TO_PROOF_ORIGIN_UPDATES.length,
    },
    checks,
    audit,
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('Promise-to-proof integrity gate')
    console.log(`  Applied: ${apply ? 'yes' : 'no'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${result.summary.passed}/${result.summary.checks} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Promise-to-proof integrity gate failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
