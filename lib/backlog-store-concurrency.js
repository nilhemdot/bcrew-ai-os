import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  initFoundationDb,
  resetFoundationDb,
} from './foundation-db-session.js'
import {
  BACKLOG_STORE_CONCURRENCY_CARD_ID,
  updateBacklogItem,
} from './foundation-backlog-sprint-db.js'

function createPool(database = process.env.BCREW_DB_NAME || 'bcrew_ai_os') {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database,
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function quotePgIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`
}

async function waitForCondition(condition, { timeoutMs = 5000, intervalMs = 20 } = {}) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (condition()) return true
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return false
}

async function createDogfoodDatabase(databaseName) {
  const adminPool = createPool('postgres')
  try {
    await adminPool.query(`CREATE DATABASE ${quotePgIdentifier(databaseName)}`)
  } finally {
    await adminPool.end()
  }
}

async function dropDogfoodDatabase(databaseName) {
  const adminPool = createPool('postgres')
  try {
    await adminPool.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName],
    )
    await adminPool.query(`DROP DATABASE IF EXISTS ${quotePgIdentifier(databaseName)}`)
  } finally {
    await adminPool.end()
  }
}

async function switchFoundationDatabase(databaseName) {
  process.env.BCREW_DB_NAME = databaseName
  await resetFoundationDb()
}

async function legacyUnsafeBacklogMergeWrite(client, id, staleRow, input) {
  const nextRow = {
    title: input.title ?? staleRow.title,
    team: input.scope ?? input.team ?? staleRow.team,
    lane: input.lane ?? staleRow.lane,
    priority: input.priority ?? staleRow.priority,
    rank: input.rank ?? staleRow.rank,
    source: input.source ?? staleRow.source,
    summary: input.summary ?? staleRow.summary,
    why_it_matters: input.whyItMatters ?? staleRow.why_it_matters,
    next_action: input.nextAction ?? staleRow.next_action,
    status_note: input.statusNote ?? staleRow.status_note,
    owner: input.owner ?? staleRow.owner,
  }
  const result = await client.query(
    `
      UPDATE backlog_items
      SET title = $2,
          team = $3,
          lane = $4,
          priority = $5,
          rank = $6,
          source = $7,
          summary = $8,
          why_it_matters = $9,
          next_action = $10,
          status_note = $11,
          owner = $12,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      nextRow.title,
      nextRow.team,
      nextRow.lane,
      nextRow.priority,
      nextRow.rank,
      nextRow.source,
      nextRow.summary,
      nextRow.why_it_matters,
      nextRow.next_action,
      nextRow.status_note,
      nextRow.owner,
    ],
  )
  return result.rows[0]
}

async function readBacklogDogfoodRow(pool, id) {
  const result = await pool.query(`SELECT * FROM backlog_items WHERE id = $1`, [id])
  return result.rows[0] || null
}

export async function buildBacklogStoreConcurrencyDogfoodProof() {
  const originalDatabaseName = process.env.BCREW_DB_NAME || 'bcrew_ai_os'
  const databaseName = `bcrew_ai_os_dogfood_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`
  const cardId = `DOGFOOD-BACKLOG-CONCURRENCY-${randomUUID()}`
  const originalSummary = 'original-summary'
  const originalStatusNote = 'original-status-note'
  const legacySummary = 'legacy-writer-a-summary'
  const legacyStatusNote = 'legacy-writer-b-status'
  const safeSummary = 'safe-writer-a-summary'
  const safeStatusNote = 'safe-writer-b-status'
  const events = []

  let dogfoodPool = null
  let legacyLostUpdate = null
  let safeConcurrentWriters = null
  let changeEventProof = null

  await createDogfoodDatabase(databaseName)
  try {
    await switchFoundationDatabase(databaseName)
    await initFoundationDb()
    dogfoodPool = createPool(databaseName)

    await dogfoodPool.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,'foundation','scoped','P2',999,$3,$4,$5,$6,$7,'Foundation Process')
      `,
      [
        cardId,
        'Synthetic backlog concurrency dogfood card',
        BACKLOG_STORE_CONCURRENCY_CARD_ID,
        originalSummary,
        'Synthetic card in isolated dogfood database.',
        'Delete the isolated database after proof.',
        originalStatusNote,
      ],
    )

    const legacyClient = await dogfoodPool.connect()
    try {
      const staleA = await readBacklogDogfoodRow(dogfoodPool, cardId)
      const staleB = await readBacklogDogfoodRow(dogfoodPool, cardId)
      await legacyUnsafeBacklogMergeWrite(legacyClient, cardId, staleA, { summary: legacySummary })
      const legacyFinal = await legacyUnsafeBacklogMergeWrite(legacyClient, cardId, staleB, { statusNote: legacyStatusNote })
      legacyLostUpdate = {
        writerAField: 'summary',
        writerBField: 'statusNote',
        writerASummarySurvived: legacyFinal.summary === legacySummary,
        writerBStatusSurvived: legacyFinal.status_note === legacyStatusNote,
        lostWriterAUpdate: legacyFinal.summary !== legacySummary && legacyFinal.status_note === legacyStatusNote,
        finalSummary: legacyFinal.summary,
        finalStatusNote: legacyFinal.status_note,
      }
    } finally {
      legacyClient.release()
    }

    await dogfoodPool.query(
      `
        UPDATE backlog_items
        SET summary = $2,
            status_note = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [cardId, originalSummary, originalStatusNote],
    )

    let writerADone = false
    const writerA = updateBacklogItem(
      cardId,
      { summary: safeSummary },
      'backlog-concurrency-dogfood-a',
      {
        afterRead: async row => {
          events.push({ event: 'writer-a-read', summary: row.summary, statusNote: row.status_note })
          await new Promise(resolve => setTimeout(resolve, 250))
        },
      },
    ).then(result => {
      writerADone = true
      events.push({ event: 'writer-a-committed', summary: result.summary, statusNote: result.statusNote })
      return result
    })

    const writerARead = await waitForCondition(() => events.some(event => event.event === 'writer-a-read'))
    const writerB = updateBacklogItem(
      cardId,
      { statusNote: safeStatusNote },
      'backlog-concurrency-dogfood-b',
      {
        afterRead: async row => {
          events.push({
            event: 'writer-b-read',
            summary: row.summary,
            statusNote: row.status_note,
            writerADone,
          })
        },
      },
    )

    const [writerAResult, writerBResult] = await Promise.all([writerA, writerB])
    const finalRow = await readBacklogDogfoodRow(dogfoodPool, cardId)
    const writerBRead = events.find(event => event.event === 'writer-b-read') || null
    safeConcurrentWriters = {
      writerARead,
      writerBReadSawWriterACommit: writerBRead?.summary === safeSummary && writerBRead?.writerADone === true,
      writerAResultSummary: writerAResult.summary,
      writerBResultSummary: writerBResult.summary,
      finalSummary: finalRow?.summary || null,
      finalStatusNote: finalRow?.status_note || null,
      preservedWriterAUpdate: finalRow?.summary === safeSummary,
      preservedWriterBUpdate: finalRow?.status_note === safeStatusNote,
      events,
    }

    const changeEvents = await dogfoodPool.query(
      `
        SELECT event_type, metadata
        FROM change_events
        WHERE entity_table = 'backlog_items'
          AND entity_id = $1
          AND event_type IN ('backlog_updated', 'backlog_status_changed')
        ORDER BY created_at ASC
      `,
      [cardId],
    )
    changeEventProof = {
      eventCount: changeEvents.rows.length,
      hasFullBeforeAfter: changeEvents.rows.every(row =>
        row.metadata?.before?.summary !== undefined &&
        row.metadata?.after?.summary !== undefined &&
        Array.isArray(row.metadata?.changedFields),
      ),
      changedFields: changeEvents.rows.map(row => row.metadata?.changedFields || []),
    }
  } finally {
    if (dogfoodPool) await dogfoodPool.end().catch(() => {})
    await switchFoundationDatabase(originalDatabaseName).catch(() => {})
    await closeFoundationDb().catch(() => {})
    await dropDogfoodDatabase(databaseName).catch(() => {})
    process.env.BCREW_DB_NAME = originalDatabaseName
    await resetFoundationDb().catch(() => {})
  }

  return {
    ok: legacyLostUpdate?.lostWriterAUpdate === true &&
      safeConcurrentWriters?.preservedWriterAUpdate === true &&
      safeConcurrentWriters?.preservedWriterBUpdate === true &&
      safeConcurrentWriters?.writerBReadSawWriterACommit === true &&
      changeEventProof?.hasFullBeforeAfter === true,
    cardId: BACKLOG_STORE_CONCURRENCY_CARD_ID,
    isolatedDatabase: databaseName,
    legacyLostUpdate,
    safeConcurrentWriters,
    changeEventProof,
  }
}
